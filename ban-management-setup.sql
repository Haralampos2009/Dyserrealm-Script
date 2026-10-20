-- Dyserrealm Script: account bans (run once in Supabase SQL Editor)
create table if not exists public.site_bans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ban_until timestamptz null,
  reason text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.site_bans enable row level security;
revoke all on public.site_bans from anon, authenticated;

create or replace function public.check_my_site_ban()
returns table (is_banned boolean, ban_until timestamptz, reason text)
language sql security definer set search_path = ''
as $$
  select
    (b.user_id is not null and (b.ban_until is null or b.ban_until > now())) as is_banned,
    case when b.user_id is not null and (b.ban_until is null or b.ban_until > now()) then b.ban_until else null end,
    case when b.user_id is not null and (b.ban_until is null or b.ban_until > now()) then b.reason else null end
  from (select auth.uid() as uid) u
  left join public.site_bans b on b.user_id = u.uid;
$$;

create or replace function public.creator_list_site_bans()
returns table (user_id uuid, email text, ban_until timestamptz, reason text)
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.site_roles sr where sr.user_id = auth.uid() and sr.role in ('creator','admin')) then
    raise exception 'Creator or admin role required';
  end if;
  return query
    select b.user_id, au.email::text, b.ban_until, b.reason
    from public.site_bans b join auth.users au on au.id = b.user_id
    where b.ban_until is null or b.ban_until > now()
    order by b.created_at desc;
end;
$$;

create or replace function public.creator_set_site_ban(target_email text, duration_minutes integer, ban_reason text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  caller_role text;
  target_id uuid;
  target_role text;
  until_time timestamptz;
begin
  select sr.role into caller_role from public.site_roles sr where sr.user_id = auth.uid();
  if caller_role not in ('creator','admin') then raise exception 'Creator or admin role required'; end if;
  select au.id into target_id from auth.users au where lower(au.email) = lower(trim(target_email)) limit 1;
  if target_id is null then raise exception 'No registered account found with that email'; end if;
  if target_id = auth.uid() then raise exception 'You cannot ban your own account'; end if;
  select sr.role into target_role from public.site_roles sr where sr.user_id = target_id;
  if caller_role = 'admin' and target_role in ('creator','admin') then raise exception 'Admins cannot ban creators or admins'; end if;
  if duration_minutes = 0 then
    delete from public.site_bans where user_id = target_id;
    return;
  end if;
  if duration_minutes is not null and duration_minutes not in (60,1440,10080,43200) then raise exception 'Invalid ban duration'; end if;
  if duration_minutes is null then until_time := null; else until_time := now() + make_interval(mins => duration_minutes); end if;
  insert into public.site_bans(user_id,ban_until,reason,created_by)
  values(target_id,until_time,left(coalesce(ban_reason,''),300),auth.uid())
  on conflict(user_id) do update set ban_until=excluded.ban_until,reason=excluded.reason,created_by=excluded.created_by,created_at=now();
end;
$$;

revoke all on function public.check_my_site_ban() from public, anon;
revoke all on function public.creator_list_site_bans() from public, anon;
revoke all on function public.creator_set_site_ban(text,integer,text) from public, anon;
grant execute on function public.check_my_site_ban() to authenticated;
grant execute on function public.creator_list_site_bans() to authenticated;
grant execute on function public.creator_set_site_ban(text,integer,text) to authenticated;
