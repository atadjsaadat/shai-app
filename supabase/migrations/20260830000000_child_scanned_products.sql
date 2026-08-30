-- child_scanned_products
-- Records every product a child has scanned, with outcome and full nutrition data.
-- Used for pantry recall in AI logging and pantry match confirmation flow.

create table if not exists public.child_scanned_products (
  id                    uuid primary key default gen_random_uuid(),
  child_id              uuid not null references public.children(id) on delete cascade,
  barcode               text not null,
  product_name          text,
  brand                 text,
  nova_classification   integer,
  additives_n           integer,
  scan_outcome          text not null default 'unknown', -- 'purchased' | 'rejected' | 'unknown'
  serving_size_g        numeric,
  serving_size_ml       numeric,
  calories_kcal         numeric,
  protein_g             numeric,
  carbs_g               numeric,
  fat_g                 numeric,
  fibre_g               numeric,
  sugar_g               numeric,
  saturated_fat_g       numeric,
  sodium_mg             numeric,
  iron_mg               numeric,
  calcium_mg            numeric,
  vitamin_c_mg          numeric,
  vitamin_a_mcg         numeric,
  vitamin_d_mcg         numeric,
  zinc_mg               numeric,
  omega3_mg             numeric,
  b12_mcg               numeric,
  b6_mg                 numeric,
  folate_mcg            numeric,
  magnesium_mg          numeric,
  potassium_mg          numeric,
  omega6_mg             numeric,
  iodine_mcg            numeric,
  selenium_mcg          numeric,
  phosphorus_mg         numeric,
  choline_mg            numeric,
  dha_mg                numeric,
  vitamin_k_mcg         numeric,
  updated_at            timestamptz not null default now(),
  unique (child_id, barcode)
);

-- Add any columns that may be missing if table already existed
alter table public.child_scanned_products add column if not exists additives_n integer;
alter table public.child_scanned_products add column if not exists serving_size_g numeric;
alter table public.child_scanned_products add column if not exists serving_size_ml numeric;

-- Grants — service_role must be able to read and write (bypasses RLS for API routes)
grant all on public.child_scanned_products to service_role;
grant all on public.child_scanned_products to authenticated;

-- RLS — users can only see their own children's scans; writes go through admin client
alter table public.child_scanned_products enable row level security;

drop policy if exists "Users can read own child scans" on public.child_scanned_products;
create policy "Users can read own child scans"
  on public.child_scanned_products for select
  using (
    child_id in (
      select id from public.children where user_id = auth.uid()
    )
  );

-- updated_at trigger
drop trigger if exists child_scanned_products_updated_at on public.child_scanned_products;
create trigger child_scanned_products_updated_at
  before update on public.child_scanned_products
  for each row execute function public.handle_updated_at();

-- Index for fast child pantry lookups
create index if not exists idx_child_scanned_products_child_outcome
  on public.child_scanned_products (child_id, scan_outcome);
