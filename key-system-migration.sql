-- Dyserrealm Script server-side key system.
-- Run once in Supabase SQL Editor BEFORE deploying the Edge Functions.
-- The keys and rate-limit tables intentionally have RLS enabled and NO client policies.

create extension if not exists pgcrypto;

create table if not exists public.keys (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^DS-[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  revoked boolean not null default false,
  bound_roblox_id bigint null,
  use_count integer not null default 0 check (use_count >= 0),
  last_used_at timestamptz null,
  created_by_ip_hash text not null,
  created_by_user_id uuid null references auth.users(id) on delete set null
);

create index if not exists keys_expires_at_idx on public.keys(expires_at);
create index if not exists keys_created_by_ip_hash_idx on public.keys(created_by_ip_hash);
create index if not exists keys_created_by_user_id_idx on public.keys(created_by_user_id);
create index if not exists keys_bound_roblox_id_idx on public.keys(bound_roblox_id);

alter table public.keys enable row level security;
revoke all on table public.keys from anon, authenticated;
-- Deliberately no policies on public.keys. Edge Functions use service_role only.

create table if not exists public.key_rate_limits (
  bucket text not null,
  subject_hash text not null,
  window_started_at timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, subject_hash)
);
alter table public.key_rate_limits enable row level security;
revoke all on table public.key_rate_limits from anon, authenticated;
-- Deliberately no client policies on public.key_rate_limits.

create or replace function public.consume_key_rate_limit(
  p_bucket text, p_subject_hash text, p_limit integer, p_window_seconds integer
) returns table(allowed boolean, remaining integer, retry_after integer)
language plpgsql security definer set search_path = ''
as $$
declare
  v_started timestamptz;
  v_hits integer;
  v_now timestamptz := now();
begin
  insert into public.key_rate_limits(bucket, subject_hash, window_started_at, hits)
  values (p_bucket, p_subject_hash, v_now, 1)
  on conflict (bucket, subject_hash) do update
    set window_started_at = case
          when public.key_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now then v_now
          else public.key_rate_limits.window_started_at end,
        hits = case
          when public.key_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now then 1
          else public.key_rate_limits.hits + 1 end
  returning key_rate_limits.window_started_at, key_rate_limits.hits into v_started, v_hits;

  return query select (v_hits <= p_limit), greatest(0, p_limit - v_hits),
    greatest(0, ceil(extract(epoch from (v_started + make_interval(secs => p_window_seconds) - v_now)))::integer);
end;
$$;

create or replace function public.issue_realm_key(
  p_key text, p_expires_at timestamptz, p_ip_hash text, p_user_id uuid
) returns table(issued boolean, reason text, key_id uuid, expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_lock text := coalesce(p_user_id::text, '') || ':' || coalesce(p_ip_hash, '');
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_lock, 0));
  if exists (
    select 1 from public.keys k
    where k.revoked = false and k.expires_at > now()
      and (k.created_by_user_id = p_user_id or k.created_by_ip_hash = p_ip_hash)
  ) then
    return query select false, 'active_key_exists'::text, null::uuid, null::timestamptz;
    return;
  end if;

  insert into public.keys(key, expires_at, created_by_ip_hash, created_by_user_id)
  values (p_key, p_expires_at, p_ip_hash, p_user_id)
  on conflict (key) do nothing returning id into v_id;

  if v_id is null then
    return query select false, 'collision'::text, null::uuid, null::timestamptz;
  else
    return query select true, 'ok'::text, v_id, p_expires_at;
  end if;
end;
$$;

create or replace function public.validate_realm_key(p_key text, p_roblox_id bigint)
returns table(valid boolean, reason text, seconds_left integer, key_id uuid)
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.keys%rowtype;
  v_now timestamptz := now();
begin
  select * into v_row from public.keys where key = p_key for update;
  if not found then return query select false, 'not_found'::text, 0, null::uuid; return; end if;
  if v_row.revoked then return query select false, 'revoked'::text, 0, v_row.id; return; end if;
  if v_row.expires_at <= v_now then return query select false, 'expired'::text, 0, v_row.id; return; end if;
  if v_row.bound_roblox_id is not null and v_row.bound_roblox_id <> p_roblox_id then
    return query select false, 'bound_to_other'::text, 0, v_row.id; return;
  end if;

  update public.keys set bound_roblox_id = coalesce(bound_roblox_id, p_roblox_id),
    use_count = use_count + 1, last_used_at = v_now where id = v_row.id;
  return query select true, 'ok'::text,
    greatest(0, ceil(extract(epoch from (v_row.expires_at - v_now)))::integer), v_row.id;
end;
$$;

revoke all on function public.consume_key_rate_limit(text,text,integer,integer) from public, anon, authenticated;
revoke all on function public.issue_realm_key(text,timestamptz,text,uuid) from public, anon, authenticated;
revoke all on function public.validate_realm_key(text,bigint) from public, anon, authenticated;
grant execute on function public.consume_key_rate_limit(text,text,integer,integer) to service_role;
grant execute on function public.issue_realm_key(text,timestamptz,text,uuid) to service_role;
grant execute on function public.validate_realm_key(text,bigint) to service_role;

create or replace function public.cleanup_key_rate_limits()
returns void language sql security definer set search_path = ''
as $$ delete from public.key_rate_limits where window_started_at < now() - interval '2 days'; $$;
revoke all on function public.cleanup_key_rate_limits() from public, anon, authenticated;
grant execute on function public.cleanup_key_rate_limits() to service_role;
