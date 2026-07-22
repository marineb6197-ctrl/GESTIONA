-- GESTIONA ERP v5.0 — Fondations Supabase
-- À exécuter dans Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  full_name text,
  role text not null default 'employee' check (role in ('owner','admin','manager','kitchen','bar','accountant','employee')),
  created_at timestamptz not null default now()
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text, phone text, notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  name text not null, category text, unit text default 'pièce', sku text,
  stock numeric not null default 0, minimum_stock numeric not null default 0,
  package_price_excl_vat numeric not null default 0, units_per_package numeric not null default 1,
  purchase_vat numeric not null default 21, sale_price_incl_vat numeric not null default 0, sale_vat numeric not null default 21,
  favorite boolean not null default false, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity numeric not null, movement_type text not null check (movement_type in ('inventory','purchase','sale','waste','transfer','correction')),
  note text, created_by uuid references auth.users(id), created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  entity_type text not null, entity_id text, action text not null, details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.current_org_id() returns uuid language sql stable security definer set search_path=public as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.venues enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.audit_log enable row level security;

create policy "profiles own organization" on public.profiles for select using (organization_id = public.current_org_id() or id = auth.uid());
create policy "venues organization access" on public.venues for all using (organization_id = public.current_org_id()) with check (organization_id = public.current_org_id());
create policy "suppliers organization access" on public.suppliers for all using (organization_id = public.current_org_id()) with check (organization_id = public.current_org_id());
create policy "products organization access" on public.products for all using (organization_id = public.current_org_id()) with check (organization_id = public.current_org_id());
create policy "movements organization access" on public.stock_movements for all using (organization_id = public.current_org_id()) with check (organization_id = public.current_org_id());
create policy "audit organization read" on public.audit_log for select using (organization_id = public.current_org_id());
