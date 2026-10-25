-- Dyserrealm Script: allow only the Creator to delete any community post.
-- Paste this entire script into Supabase Dashboard -> SQL Editor -> New query, then click Run.

create or replace function public.creator_delete_post(target_post_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.site_roles sr
    where sr.user_id = auth.uid()
      and sr.role = 'creator'
  ) then
    raise exception 'Creator role required';
  end if;

  delete from public.posts
  where id = target_post_id;

  if not found then
    raise exception 'Post not found';
  end if;
end;
$$;

revoke all on function public.creator_delete_post(bigint) from public, anon;
grant execute on function public.creator_delete_post(bigint) to authenticated;
