-- Dyserrealm Script: secure Creator-only role management for Account Settings
-- Run this file once in Supabase Dashboard -> SQL Editor -> New query.
-- The creator role must already be assigned to your own registered account by
-- executors-access-setup.sql. This migration does not let users promote themselves.

create or replace function public.creator_list_site_roles()
returns table (user_id uuid, email text, role text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.site_roles sr
    where sr.user_id = auth.uid() and sr.role = 'creator'
  ) then
    raise exception 'Creator role required';
  end if;

  return query
    select au.id, au.email::text, coalesce(sr.role, 'user')::text
    from auth.users au
    left join public.site_roles sr on sr.user_id = au.id
    order by lower(coalesce(au.email, ''));
end;
$$;

create or replace function public.creator_set_site_role(target_email text, target_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
begin
  if not exists (
    select 1 from public.site_roles sr
    where sr.user_id = auth.uid() and sr.role = 'creator'
  ) then
    raise exception 'Creator role required';
  end if;

  if target_role not in ('creator', 'admin', 'user') then
    raise exception 'Invalid role';
  end if;

  select au.id into target_id
  from auth.users au
  where lower(au.email) = lower(trim(target_email))
  limit 1;

  if target_id is null then
    raise exception 'No registered account found with that email';
  end if;

  if target_id = auth.uid() then
    raise exception 'You cannot change your own role';
  end if;

  if target_role = 'user' then
    delete from public.site_roles sr where sr.user_id = target_id;
  else
    insert into public.site_roles (user_id, role)
    values (target_id, target_role)
    on conflict (user_id) do update set role = excluded.role;
  end if;
end;
$$;

revoke all on function public.creator_list_site_roles() from public, anon;
revoke all on function public.creator_set_site_role(text, text) from public, anon;
grant execute on function public.creator_list_site_roles() to authenticated;
grant execute on function public.creator_set_site_role(text, text) to authenticated;
