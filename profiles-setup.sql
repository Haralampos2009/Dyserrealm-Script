-- Dyserrealm Script: public member profiles.
-- Run this once in Supabase SQL Editor.
create table if not exists public.realm_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Realm member' check (char_length(display_name) between 1 and 40),
  roblox_username text not null default '' check (char_length(roblox_username) <= 40),
  favorite_game text not null default '' check (char_length(favorite_game) <= 80),
  games text not null default '' check (char_length(games) <= 500),
  bio text not null default '' check (char_length(bio) <= 500),
  avatar_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.realm_profiles add column if not exists avatar_url text not null default '';
alter table public.realm_profiles enable row level security;
drop policy if exists "Profiles are public" on public.realm_profiles;
create policy "Profiles are public" on public.realm_profiles for select using (true);
drop policy if exists "Users create own profile" on public.realm_profiles;
create policy "Users create own profile" on public.realm_profiles for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users update own profile" on public.realm_profiles;
create policy "Users update own profile" on public.realm_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select on public.realm_profiles to anon, authenticated;
grant insert, update on public.realm_profiles to authenticated;

create or replace function public.create_realm_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.realm_profiles(user_id, display_name, roblox_username)
  values (
    new.id,
    left(coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(coalesce(new.email,''),'@',1), 'Realm member'),40),
    left(coalesce(new.raw_user_meta_data->>'roblox_username',''),40)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_realm_profile on auth.users;
create trigger on_auth_user_created_realm_profile
after insert on auth.users
for each row execute function public.create_realm_profile_for_new_user();

insert into public.realm_profiles(user_id, display_name, roblox_username)
select u.id,
  left(coalesce(nullif(u.raw_user_meta_data->>'display_name',''), nullif(split_part(coalesce(u.email,''),'@',1),''), 'Realm member'),40),
  left(coalesce(u.raw_user_meta_data->>'roblox_username',''),40)
from auth.users u
on conflict (user_id) do nothing;


-- Public avatar storage. Profile images are stored here instead of as large base64 strings in the database.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', true, 2097152, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "Anyone can view profile avatars" on storage.objects;
create policy "Anyone can view profile avatars" on storage.objects for select using (bucket_id = 'profile-avatars');
drop policy if exists "Users upload own profile avatar" on storage.objects;
create policy "Users upload own profile avatar" on storage.objects for insert to authenticated with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users update own profile avatar" on storage.objects;
create policy "Users update own profile avatar" on storage.objects for update to authenticated using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users delete own profile avatar" on storage.objects;
create policy "Users delete own profile avatar" on storage.objects for delete to authenticated using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
