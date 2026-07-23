-- Préparation optionnelle de la synchronisation cloud v9.1
create table if not exists public.menus (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 venue_id uuid references public.venues(id) on delete set null,
 name text not null,
 sale_price_incl_vat numeric not null default 0,
 sale_vat numeric not null default 12,
 notes text,
 created_at timestamptz not null default now()
);
create table if not exists public.sales (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 venue_id uuid references public.venues(id) on delete set null,
 service text,
 payment text,
 covers integer not null default 0,
 total numeric not null default 0,
 details jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now()
);
