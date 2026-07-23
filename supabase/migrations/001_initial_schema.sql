-- GESTIONA — schéma initial multi-établissements
create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.establishments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  legal_name text,
  vat_number text,
  address text,
  theme text not null default 'burgundy',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  full_name text,
  role text not null default 'employee' check (role in ('owner','manager','chef','accountant','employee')),
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  lead_time_days integer not null default 2,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category text,
  internal_reference text,
  barcode text,
  unit text not null default 'piece',
  purchase_price numeric(12,2) not null default 0,
  supplier_id uuid references public.suppliers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_levels (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity numeric(14,3) not null default 0,
  minimum_quantity numeric(14,3) not null default 0,
  ideal_quantity numeric(14,3),
  updated_at timestamptz not null default now(),
  unique(establishment_id, product_id)
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type text not null check (movement_type in ('entry','exit','loss','inventory','transfer_in','transfer_out')),
  quantity numeric(14,3) not null,
  unit_cost numeric(12,2),
  reference_type text,
  reference_id uuid,
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.establishments enable row level security;
alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.stock_levels enable row level security;
alter table public.stock_movements enable row level security;

create or replace function public.current_organization_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create policy "members read own organization" on public.organizations for select using (id = public.current_organization_id());
create policy "members access establishments" on public.establishments for all using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id());
create policy "members access suppliers" on public.suppliers for all using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id());
create policy "members access products" on public.products for all using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id());
create policy "profile owner reads profile" on public.profiles for select using (id = auth.uid() or organization_id = public.current_organization_id());
create policy "members access stock levels" on public.stock_levels for all using (exists(select 1 from public.establishments e where e.id = establishment_id and e.organization_id = public.current_organization_id())) with check (exists(select 1 from public.establishments e where e.id = establishment_id and e.organization_id = public.current_organization_id()));
create policy "members access movements" on public.stock_movements for all using (exists(select 1 from public.establishments e where e.id = establishment_id and e.organization_id = public.current_organization_id())) with check (exists(select 1 from public.establishments e where e.id = establishment_id and e.organization_id = public.current_organization_id()));
