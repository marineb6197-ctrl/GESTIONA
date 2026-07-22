-- GESTIONA ERP v6.2 — Stocks et mouvements
-- À exécuter une seule fois dans Supabase > SQL Editor.

begin;

create index if not exists stock_movements_product_created_idx
  on public.stock_movements (product_id, created_at desc);

create or replace function public.record_stock_movement(
  p_product_id uuid,
  p_quantity numeric,
  p_movement_type text,
  p_note text default null
)
returns numeric
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_new_stock numeric;
begin
  if p_quantity = 0 then
    raise exception 'La quantité du mouvement ne peut pas être nulle';
  end if;
  if p_movement_type not in ('inventory','purchase','sale','waste','transfer','correction') then
    raise exception 'Type de mouvement invalide';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id and active = true
  for update;

  if not found then
    raise exception 'Produit introuvable ou accès refusé';
  end if;

  v_new_stock := coalesce(v_product.stock,0) + p_quantity;
  if v_new_stock < 0 then
    raise exception 'Le stock ne peut pas devenir négatif';
  end if;

  insert into public.stock_movements(
    organization_id, venue_id, product_id, quantity, movement_type,
    unit_cost_excl_vat, note, created_by
  ) values (
    v_product.organization_id, v_product.venue_id, v_product.id, p_quantity, p_movement_type,
    case when coalesce(v_product.units_per_package,0)>0 then coalesce(v_product.package_price_excl_vat,0)/v_product.units_per_package else 0 end,
    p_note, auth.uid()
  );

  update public.products set stock = v_new_stock, updated_at = now() where id = v_product.id;
  return v_new_stock;
end;
$$;

grant execute on function public.record_stock_movement(uuid,numeric,text,text) to authenticated;

commit;
