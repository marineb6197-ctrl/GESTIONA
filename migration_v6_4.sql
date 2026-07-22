-- GESTIONA ERP v6.4.0 — Commandes fournisseurs

alter table public.purchase_orders
  add column if not exists delivery_address text,
  add column if not exists internal_reference text;

create unique index if not exists purchase_orders_org_number_uidx
  on public.purchase_orders(organization_id, order_number)
  where order_number is not null;

create or replace function public.generate_purchase_order_number(p_organization_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  y text := to_char(now(), 'YYYY');
  n integer;
begin
  if p_organization_id <> public.current_org_id() then
    raise exception 'Accès refusé';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_organization_id::text || y));

  select coalesce(max((regexp_match(order_number, '([0-9]+)$'))[1]::integer), 0) + 1
    into n
  from public.purchase_orders
  where organization_id = p_organization_id
    and order_number like 'CMD-' || y || '-%';

  return 'CMD-' || y || '-' || lpad(n::text, 5, '0');
end;
$$;

grant execute on function public.generate_purchase_order_number(uuid) to authenticated;
