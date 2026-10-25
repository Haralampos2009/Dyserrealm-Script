-- Run once in Supabase SQL Editor to enable video uploads in the existing public script-images bucket.
-- This preserves image uploads and allows MP4/WEBM video files up to 50 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('script-images', 'script-images', true, 52428800,
  array['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm'];
