-- Run this migration ONCE in Supabase Dashboard > SQL Editor for the existing live site.
-- It adds optional script image metadata and securely creates the public image bucket.
alter table public.scripts add column if not exists images jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('script-images', 'script-images', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif'];

drop policy if exists "Anyone can view script images" on storage.objects;
create policy "Anyone can view script images" on storage.objects for select using (bucket_id = 'script-images');
drop policy if exists "Signed-in users upload own script images" on storage.objects;
create policy "Signed-in users upload own script images" on storage.objects for insert to authenticated with check (bucket_id = 'script-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users update own script images" on storage.objects;
create policy "Users update own script images" on storage.objects for update to authenticated using (bucket_id = 'script-images' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'script-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users delete own script images" on storage.objects;
create policy "Users delete own script images" on storage.objects for delete to authenticated using (bucket_id = 'script-images' and (storage.foldername(name))[1] = auth.uid()::text);
