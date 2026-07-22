-- ============================================================================
-- GESTIONA ERP v5.1 — Fondation Supabase réexécutable
-- Créé par Marine Bruynbroeck — © 2026 Tous droits réservés
--
-- Ce script peut être exécuté plusieurs fois.
-- Il complète une installation partielle de la v5.0 sans supprimer les données.
-- À exécuter en une seule fois dans Supabase > SQL Editor.
-- ============================================================================

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. TABLES PRINCIPALES
-- ---------------------------------------------------------------------------

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.organizations add column if not exists updated_at timestamptz not null default now();

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  full_name text,
  role text not null default 'employee',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Remplace proprement une éventuelle ancienne contrainte de rôle.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('owner','admin','manager','kitchen','bar','accountant','employee'));

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.venues add column if not exists updated_at timestamptz not null default now();

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  contact_name text,
  delivery_days text,
  payment_terms text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.suppliers add column if not exists address text;
alter table public.suppliers add column if not exists contact_name text;
alter table public.suppliers add column if not exists delivery_days text;
alter table public.suppliers add column if not exists payment_terms text;
alter table public.suppliers add column if not exists updated_at timestamptz not null default now();

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  parent_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  category text,
  unit text not null default 'pièce',
  sku text,
  barcode text,
  location text,
  stock numeric(14,3) not null default 0,
  minimum_stock numeric(14,3) not null default 0,
  package_price_excl_vat numeric(14,4) not null default 0,
  units_per_package numeric(14,3) not null default 1,
  purchase_vat numeric(6,3) not null default 21,
  sale_price_incl_vat numeric(14,4) not null default 0,
  sale_vat numeric(6,3) not null default 21,
  target_margin_percent numeric(7,3),
  favorite boolean not null default false,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (units_per_package > 0),
  check (purchase_vat >= 0),
  check (sale_vat >= 0)
);
alter table public.products add column if not exists category_id uuid references public.categories(id) on delete set null;
alter table public.products add column if not exists barcode text;
alter table public.products add column if not exists location text;
alter table public.products add column if not exists target_margin_percent numeric(7,3);
alter table public.products add column if not exists active boolean not null default true;

create table if not exists public.product_prices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  package_price_excl_vat numeric(14,4) not null,
  units_per_package numeric(14,3) not null default 1,
  unit_price_excl_vat numeric(14,4) generated always as
    (package_price_excl_vat / nullif(units_per_package, 0)) stored,
  purchase_vat numeric(6,3) not null default 21,
  source text not null default 'manual',
  invoice_reference text,
  effective_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (units_per_package > 0)
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete set null,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity numeric(14,3) not null,
  movement_type text not null,
  unit_cost_excl_vat numeric(14,4),
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.stock_movements add column if not exists venue_id uuid references public.venues(id) on delete set null;
alter table public.stock_movements add column if not exists unit_cost_excl_vat numeric(14,4);
alter table public.stock_movements drop constraint if exists stock_movements_movement_type_check;
alter table public.stock_movements add constraint stock_movements_movement_type_check
  check (movement_type in ('inventory','purchase','sale','waste','transfer','correction'));

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  order_number text,
  status text not null default 'draft'
    check (status in ('draft','sent','confirmed','partially_received','received','cancelled')),
  ordered_at timestamptz,
  expected_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  description text not null,
  quantity_ordered numeric(14,3) not null default 0,
  quantity_received numeric(14,3) not null default 0,
  unit_price_excl_vat numeric(14,4) not null default 0,
  vat_rate numeric(6,3) not null default 21,
  created_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete set null,
  name text not null,
  recipe_type text not null default 'dish'
    check (recipe_type in ('dish','drink','cocktail','preparation')),
  portions numeric(14,3) not null default 1,
  sale_price_incl_vat numeric(14,4) not null default 0,
  sale_vat numeric(6,3) not null default 12,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (portions > 0)
);

create table if not exists public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(14,4) not null,
  unit text,
  waste_percent numeric(7,3) not null default 0,
  created_at timestamptz not null default now(),
  unique (recipe_id, product_id),
  check (quantity > 0),
  check (waste_percent >= 0)
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id text,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. INDEXES
-- ---------------------------------------------------------------------------

create index if not exists profiles_organization_id_idx on public.profiles(organization_id);
create index if not exists venues_organization_id_idx on public.venues(organization_id);
create index if not exists suppliers_organization_id_idx on public.suppliers(organization_id);
create index if not exists categories_organization_id_idx on public.categories(organization_id);
create index if not exists products_organization_id_idx on public.products(organization_id);
create index if not exists products_venue_id_idx on public.products(venue_id);
create index if not exists products_supplier_id_idx on public.products(supplier_id);
create index if not exists product_prices_organization_id_idx on public.product_prices(organization_id);
create index if not exists product_prices_product_id_idx on public.product_prices(product_id);
create index if not exists stock_movements_organization_id_idx on public.stock_movements(organization_id);
create index if not exists stock_movements_product_id_idx on public.stock_movements(product_id);
create index if not exists purchase_orders_organization_id_idx on public.purchase_orders(organization_id);
create index if not exists purchase_order_items_organization_id_idx on public.purchase_order_items(organization_id);
create index if not exists recipes_organization_id_idx on public.recipes(organization_id);
create index if not exists recipe_items_organization_id_idx on public.recipe_items(organization_id);
create index if not exists audit_log_organization_id_idx on public.audit_log(organization_id);

-- ---------------------------------------------------------------------------
-- 3. FONCTIONS UTILITAIRES ET INITIALISATION
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.organization_id
  from public.profiles p
  where p.id = (select auth.uid());
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid());
$$;

create or replace function public.bootstrap_organization(
  organization_name text,
  user_full_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_id uuid := (select auth.uid());
  existing_org uuid;
  new_org uuid;
begin
  if user_id is null then
    raise exception 'Vous devez être connecté.';
  end if;

  select p.organization_id into existing_org
  from public.profiles p
  where p.id = user_id;

  if existing_org is not null then
    return existing_org;
  end if;

  insert into public.organizations(name)
  values (coalesce(nullif(trim(organization_name), ''), 'Mon organisation'))
  returning id into new_org;

  insert into public.profiles(id, organization_id, full_name, role)
  values (user_id, new_org, user_full_name, 'owner')
  on conflict (id) do update
    set organization_id = excluded.organization_id,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        role = 'owner',
        updated_at = now();

  return new_org;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Déclencheurs réexécutables.
drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists venues_set_updated_at on public.venues;
create trigger venues_set_updated_at before update on public.venues
for each row execute function public.set_updated_at();

drop trigger if exists suppliers_set_updated_at on public.suppliers;
create trigger suppliers_set_updated_at before update on public.suppliers
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists purchase_orders_set_updated_at on public.purchase_orders;
create trigger purchase_orders_set_updated_at before update on public.purchase_orders
for each row execute function public.set_updated_at();

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at before update on public.recipes
for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.venues enable row level security;
alter table public.suppliers enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_prices enable row level security;
alter table public.stock_movements enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_items enable row level security;
alter table public.audit_log enable row level security;

-- Suppression des politiques v5.0 et v5.1 éventuelles avant recréation.
drop policy if exists "profiles own organization" on public.profiles;
drop policy if exists "profiles own organization access" on public.profiles;
drop policy if exists "venues organization access" on public.venues;
drop policy if exists "suppliers organization access" on public.suppliers;
drop policy if exists "products organization access" on public.products;
drop policy if exists "movements organization access" on public.stock_movements;
drop policy if exists "audit organization read" on public.audit_log;

drop policy if exists "organizations members read" on public.organizations;
drop policy if exists "organizations owners update" on public.organizations;
drop policy if exists "profiles members read" on public.profiles;
drop policy if exists "profiles own update" on public.profiles;
drop policy if exists "venues members access" on public.venues;
drop policy if exists "suppliers members access" on public.suppliers;
drop policy if exists "categories members access" on public.categories;
drop policy if exists "products members access" on public.products;
drop policy if exists "product prices members access" on public.product_prices;
drop policy if exists "stock movements members access" on public.stock_movements;
drop policy if exists "purchase orders members access" on public.purchase_orders;
drop policy if exists "purchase order items members access" on public.purchase_order_items;
drop policy if exists "recipes members access" on public.recipes;
drop policy if exists "recipe items members access" on public.recipe_items;
drop policy if exists "audit members read" on public.audit_log;
drop policy if exists "audit members insert" on public.audit_log;

create policy "organizations members read"
on public.organizations for select to authenticated
using (id = (select public.current_org_id()));

create policy "organizations owners update"
on public.organizations for update to authenticated
using (
  id = (select public.current_org_id())
  and (select public.current_user_role()) in ('owner','admin')
)
with check (id = (select public.current_org_id()));

create policy "profiles members read"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or organization_id = (select public.current_org_id())
);

create policy "profiles own update"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
  and organization_id is not distinct from (select public.current_org_id())
);

create policy "venues members access"
on public.venues for all to authenticated
using (organization_id = (select public.current_org_id()))
with check (organization_id = (select public.current_org_id()));

create policy "suppliers members access"
on public.suppliers for all to authenticated
using (organization_id = (select public.current_org_id()))
with check (organization_id = (select public.current_org_id()));

create policy "categories members access"
on public.categories for all to authenticated
using (organization_id = (select public.current_org_id()))
with check (organization_id = (select public.current_org_id()));

create policy "products members access"
on public.products for all to authenticated
using (organization_id = (select public.current_org_id()))
with check (organization_id = (select public.current_org_id()));

create policy "product prices members access"
on public.product_prices for all to authenticated
using (organization_id = (select public.current_org_id()))
with check (organization_id = (select public.current_org_id()));

create policy "stock movements members access"
on public.stock_movements for all to authenticated
using (organization_id = (select public.current_org_id()))
with check (organization_id = (select public.current_org_id()));

create policy "purchase orders members access"
on public.purchase_orders for all to authenticated
using (organization_id = (select public.current_org_id()))
with check (organization_id = (select public.current_org_id()));

create policy "purchase order items members access"
on public.purchase_order_items for all to authenticated
using (organization_id = (select public.current_org_id()))
with check (organization_id = (select public.current_org_id()));

create policy "recipes members access"
on public.recipes for all to authenticated
using (organization_id = (select public.current_org_id()))
with check (organization_id = (select public.current_org_id()));

create policy "recipe items members access"
on public.recipe_items for all to authenticated
using (organization_id = (select public.current_org_id()))
with check (organization_id = (select public.current_org_id()));

create policy "audit members read"
on public.audit_log for select to authenticated
using (organization_id = (select public.current_org_id()));

create policy "audit members insert"
on public.audit_log for insert to authenticated
with check (
  organization_id = (select public.current_org_id())
  and user_id = (select auth.uid())
);

-- ---------------------------------------------------------------------------
-- 5. DROITS API
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.current_org_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.bootstrap_organization(text, text) to authenticated;

commit;

-- Vérification facultative après réussite :
-- select table_name from information_schema.tables
-- where table_schema = 'public' order by table_name;
