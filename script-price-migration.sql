-- Run this migration ONCE in Supabase Dashboard > SQL Editor for the existing live site.
-- Adds a price and currency to each script. Existing scripts default to FREE (0 Robux).
alter table public.scripts add column if not exists price numeric(12,2) not null default 0 check (price >= 0);
alter table public.scripts add column if not exists price_currency text not null default 'Robux';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'scripts_price_currency_check'
      and conrelid = 'public.scripts'::regclass
  ) then
    alter table public.scripts
      add constraint scripts_price_currency_check
      check (price_currency in ('Robux','USD','EUR'));
  end if;
end $$;
