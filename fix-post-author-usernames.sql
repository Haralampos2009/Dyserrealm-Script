-- Dyserrealm Script: repair usernames shown on existing community posts.
-- Run once in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- New posts will save the author's username automatically after the app.js fix.

update public.posts p
set author_name = left(
  coalesce(
    nullif(u.raw_user_meta_data ->> 'username', ''),
    nullif(u.raw_user_meta_data ->> 'display_name', ''),
    nullif(split_part(u.email, '@', 1), ''),
    'Realm member'
  ),
  32
)
from auth.users u
where p.author_id = u.id
  and (p.author_name is null or p.author_name = '' or p.author_name = 'Realm member');

