-- GESTIONA V23.0 — Moteur de stock professionnel
-- Rend les transferts explicites et améliore les recherches dans le journal.

alter table public.stock_movements drop constraint if exists stock_movements_movement_type_check;
alter table public.stock_movements add constraint stock_movements_movement_type_check
  check (movement_type in ('inventory','purchase','sale','waste','transfer','correction','removal'));

create index if not exists stock_movements_venue_created_idx
  on public.stock_movements (venue_id, created_at desc);
create index if not exists stock_movements_type_created_idx
  on public.stock_movements (movement_type, created_at desc);
create index if not exists stock_movements_product_venue_created_idx
  on public.stock_movements (product_id, venue_id, created_at desc);
