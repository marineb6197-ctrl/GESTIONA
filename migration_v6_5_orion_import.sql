-- GESTIONA ERP v6.5 — ORION Import
-- Cette version utilise les tables products/suppliers existantes.
-- Aucun changement de schéma obligatoire.
-- Migration facultative pour tracer les imports détaillés :
create table if not exists public.catalog_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  filename text not null,
  summary jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.catalog_imports enable row level security;
drop policy if exists "catalog_imports_org" on public.catalog_imports;
create policy "catalog_imports_org" on public.catalog_imports for all
using (organization_id = public.current_org_id())
with check (organization_id = public.current_org_id());
