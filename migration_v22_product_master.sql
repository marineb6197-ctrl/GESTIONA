-- GESTIONA V22.0 — Référentiel Produits 360°
-- À exécuter une seule fois dans l’éditeur SQL Supabase.

alter table public.products add column if not exists brand text;
alter table public.products add column if not exists description text;
alter table public.products add column if not exists product_status text not null default 'active';
alter table public.products add column if not exists purchase_unit text not null default 'colis';
alter table public.products add column if not exists lead_time_days integer not null default 0;
alter table public.products add column if not exists ideal_stock numeric(14,3) not null default 0;
alter table public.products add column if not exists maximum_stock numeric(14,3) not null default 0;
alter table public.products add column if not exists track_lots boolean not null default false;
alter table public.products add column if not exists shelf_life_days integer not null default 0;
alter table public.products add column if not exists expiry_type text not null default 'none';
alter table public.products add column if not exists consumption_unit text;
alter table public.products add column if not exists conversion_factor numeric(14,6) not null default 1;
alter table public.products add column if not exists yield_percent numeric(7,3) not null default 100;
alter table public.products add column if not exists preparation_waste_percent numeric(7,3) not null default 0;
alter table public.products add column if not exists allergens text;

create table if not exists public.product_supplier_references (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  supplier_sku text,
  package_label text,
  package_price_excl_vat numeric(14,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists product_supplier_reference_unique
on public.product_supplier_references(product_id, supplier_id, supplier_sku)
where supplier_sku is not null;

alter table public.product_supplier_references enable row level security;

drop policy if exists product_supplier_references_select on public.product_supplier_references;
create policy product_supplier_references_select on public.product_supplier_references
for select using (organization_id = public.current_organization_id());

drop policy if exists product_supplier_references_insert on public.product_supplier_references;
create policy product_supplier_references_insert on public.product_supplier_references
for insert with check (organization_id = public.current_organization_id());

drop policy if exists product_supplier_references_update on public.product_supplier_references;
create policy product_supplier_references_update on public.product_supplier_references
for update using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

drop policy if exists product_supplier_references_delete on public.product_supplier_references;
create policy product_supplier_references_delete on public.product_supplier_references
for delete using (organization_id = public.current_organization_id());
