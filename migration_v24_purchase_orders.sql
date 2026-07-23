-- GESTIONA V24.0 — optimisation du suivi des commandes fournisseurs
-- Cette migration est sans risque pour les données existantes.
create index if not exists purchase_orders_org_status_idx
  on public.purchase_orders (organization_id, status);
create index if not exists purchase_orders_org_expected_idx
  on public.purchase_orders (organization_id, expected_at);
create index if not exists purchase_order_items_order_idx
  on public.purchase_order_items (purchase_order_id);
