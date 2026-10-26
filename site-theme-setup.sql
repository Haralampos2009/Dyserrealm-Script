-- Repair and configure shared seasonal themes for Dyserrealm Script.
-- Run this whole file in Supabase Dashboard > SQL Editor > Run.

create table if not exists public.site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Repair older/incomplete versions of this table without deleting existing settings.
alter table public.site_settings add column if not exists key text;
alter table public.site_settings add column if not exists value text;
alter table public.site_settings add column if not exists updated_at timestamptz not null default now();
alter table public.site_settings add column if not exists updated_by uuid references auth.users(id);

create unique index if not exists site_settings_key_unique on public.site_settings (key);

alter table public.site_settings enable row level security;

drop policy if exists "Anyone can read shared site settings" on public.site_settings;
create policy "Anyone can read shared site settings"
  on public.site_settings for select using (true);

drop policy if exists "Only creator can update shared theme" on public.site_settings;
create policy "Only creator can update shared theme"
  on public.site_settings for all
  using (exists (
    select 1 from public.site_roles r
    where r.user_id = auth.uid() and r.role = 'creator'
  ))
  with check (exists (
    select 1 from public.site_roles r
    where r.user_id = auth.uid() and r.role = 'creator'
  ));

grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;

insert into public.site_settings (key, value)
values ('season_theme', 'default')
on conflict (key) do nothing;

notify pgrst, 'reload schema';
