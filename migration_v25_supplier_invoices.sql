-- GESTIONA V25.0 — Factures fournisseurs
create table if not exists public.supplier_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  venue_id uuid references public.venues(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  delivery_document_id text,
  invoice_number text not null,
  invoice_date date,
  due_date date,
  subtotal_excl_vat numeric(14,2) not null default 0,
  vat_amount numeric(14,2) not null default 0,
  total_incl_vat numeric(14,2) not null default 0,
  status text not null default 'control' check (status in ('control','validated','due','paid','disputed','archived')),
  paid_at date,
  source_filename text,
  notes text,
  control_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, supplier_id, invoice_number)
);
create index if not exists supplier_invoices_due_idx on public.supplier_invoices (organization_id, due_date, status);
create index if not exists supplier_invoices_supplier_idx on public.supplier_invoices (supplier_id, invoice_date desc);
alter table public.supplier_invoices enable row level security;
-- Adaptez cette politique si votre schéma d'appartenance diffère.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='supplier_invoices' and policyname='supplier_invoices_by_organization') then
    create policy supplier_invoices_by_organization on public.supplier_invoices
      for all using (organization_id in (select organization_id from public.profiles where id=auth.uid()))
      with check (organization_id in (select organization_id from public.profiles where id=auth.uid()));
  end if;
end $$;
