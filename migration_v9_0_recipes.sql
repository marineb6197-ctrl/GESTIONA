-- GESTIONA v9.0 — Recettes intelligentes
-- Cette migration prépare la synchronisation cloud future des recettes.
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete set null,
  name text not null,
  category text,
  portions numeric not null default 1 check (portions > 0),
  sale_price_incl_vat numeric not null default 0,
  sale_vat numeric not null default 12,
  prep_time_minutes integer not null default 0,
  image_url text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric not null check (quantity > 0),
  created_at timestamptz not null default now()
);

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;

drop policy if exists recipes_org_access on public.recipes;
create policy recipes_org_access on public.recipes
for all using (
  organization_id = (select organization_id from public.profiles where id = auth.uid())
) with check (
  organization_id = (select organization_id from public.profiles where id = auth.uid())
);

drop policy if exists recipe_ingredients_org_access on public.recipe_ingredients;
create policy recipe_ingredients_org_access on public.recipe_ingredients
for all using (
  exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and r.organization_id = (select organization_id from public.profiles where id = auth.uid())
  )
) with check (
  exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and r.organization_id = (select organization_id from public.profiles where id = auth.uid())
  )
);
