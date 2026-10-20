-- Dyserrealm consent-based, privacy-minimal analytics
-- Run this once in Supabase Dashboard -> SQL Editor for project krractyhrblivsejrpdm.
-- The public browser key can INSERT page views only; anonymous visitors cannot SELECT the rows.
create table if not exists public.site_analytics_events (
  id uuid primary key default gen_random_uuid(),
  site text not null check (site in ('thedyserrealm', 'dyserrealm-script')),
  event_type text not null check (event_type = 'page_view'),
  page_path text not null check (char_length(page_path) between 1 and 500),
  referrer_origin text null check (referrer_origin is null or char_length(referrer_origin) <= 200),
  device_type text not null check (device_type in ('mobile', 'tablet', 'desktop')),
  browser_family text not null check (browser_family in ('Chrome', 'Edge', 'Firefox', 'Opera', 'Safari', 'Other')),
  language text not null check (char_length(language) between 1 and 20),
  viewport_width_bucket integer not null check (viewport_width_bucket between 0 and 10000),
  created_at timestamptz not null default now()
);

alter table public.site_analytics_events enable row level security;

drop policy if exists "Allow public page view inserts" on public.site_analytics_events;
create policy "Allow public page view inserts"
  on public.site_analytics_events
  for insert
  to anon, authenticated
  with check (
    event_type = 'page_view'
    and site in ('thedyserrealm', 'dyserrealm-script')
    and char_length(page_path) between 1 and 500
  );

grant insert on table public.site_analytics_events to anon, authenticated;
-- Do not add a public SELECT policy. Review events inside Supabase Dashboard as the project owner.
