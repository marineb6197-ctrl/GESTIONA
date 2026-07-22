-- GESTIONA ERP v6.1 — Catalogue Produits
-- À exécuter une seule fois dans Supabase > SQL Editor.
begin;
alter table public.products add column if not exists subcategory text;
alter table public.products add column if not exists image_url text;
create index if not exists products_org_name_idx on public.products (organization_id, name);
create index if not exists products_org_barcode_idx on public.products (organization_id, barcode) where barcode is not null;
create index if not exists product_prices_product_date_idx on public.product_prices (product_id, effective_at desc);
commit;
