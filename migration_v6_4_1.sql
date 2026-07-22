-- GESTIONA ERP v6.4.1 — Correctif propre et réexécutable
-- Corrige l'erreur : public.current_organization_id() does not exist
-- Dépendances : supabase_schema.sql + migration_v6_4.sql déjà installés.

begin;

-- Vérification explicite de la fondation GESTIONA.
do $$
begin
  if to_regprocedure('public.current_org_id()') is null then
    raise exception using
      message = 'La fonction public.current_org_id() est absente.',
      hint = 'Exécutez d''abord supabase_schema.sql, puis migration_v6_4.sql.';
  end if;

  if to_regclass('public.organizations') is null then
    raise exception 'La table public.organizations est absente. Exécutez supabase_schema.sql.';
  end if;

  if to_regclass('public.purchase_orders') is null then
    raise exception 'La table public.purchase_orders est absente. Exécutez supabase_schema.sql puis migration_v6_4.sql.';
  end if;
end
$$;

-- Alias de compatibilité : évite qu'une ancienne migration échoue sur le nom long.
create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_org_id();
$$;

revoke all on function public.current_organization_id() from public;
grant execute on function public.current_organization_id() to authenticated;

-- Supabase Vault conserve la clé API hors du navigateur.
create extension if not exists supabase_vault with schema vault;

create table if not exists public.email_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  provider text not null default 'resend' check (provider in ('resend')),
  from_email text not null,
  from_name text not null,
  reply_to text,
  default_subject text not null default 'Commande {{numero}} — {{etablissement}}',
  default_body text not null default E'Bonjour,\n\nVeuillez trouver notre commande {{numero}}.\n\nMerci de confirmer sa bonne réception ainsi que la date de livraison prévue.\n\nBien cordialement,\n{{expediteur}}',
  api_key_secret_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  provider text not null,
  recipient text not null,
  subject text not null,
  body text,
  status text not null check (status in ('pending','sent','failed')),
  provider_message_id text,
  error_message text,
  sent_by uuid references auth.users(id) on delete set null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_logs_organization_id_idx
  on public.email_logs(organization_id);
create index if not exists email_logs_purchase_order_id_idx
  on public.email_logs(purchase_order_id);

alter table public.email_settings enable row level security;
alter table public.email_logs enable row level security;

drop policy if exists email_settings_org_select on public.email_settings;
create policy email_settings_org_select
on public.email_settings
for select
to authenticated
using (organization_id = public.current_org_id());

drop policy if exists email_logs_org_select on public.email_logs;
create policy email_logs_org_select
on public.email_logs
for select
to authenticated
using (organization_id = public.current_org_id());

create or replace function public.save_email_settings(
  p_provider text,
  p_from_email text,
  p_from_name text,
  p_reply_to text,
  p_default_subject text,
  p_default_body text,
  p_api_key text default null
)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_org uuid;
  v_secret uuid;
  v_existing public.email_settings%rowtype;
begin
  v_org := public.current_org_id();

  if v_org is null then
    raise exception 'Organisation introuvable';
  end if;

  if p_provider <> 'resend' then
    raise exception 'Fournisseur non pris en charge';
  end if;

  if nullif(trim(p_from_email), '') is null then
    raise exception 'Adresse e-mail d''expédition requise';
  end if;

  if nullif(trim(p_from_name), '') is null then
    raise exception 'Nom d''expéditeur requis';
  end if;

  select * into v_existing
  from public.email_settings
  where organization_id = v_org;

  v_secret := v_existing.api_key_secret_id;

  if coalesce(p_api_key, '') <> '' then
    if v_secret is null then
      select vault.create_secret(
        p_api_key,
        'gestiona_email_' || v_org::text,
        'Clé e-mail GESTIONA'
      ) into v_secret;
    else
      perform vault.update_secret(
        v_secret,
        p_api_key,
        'gestiona_email_' || v_org::text,
        'Clé e-mail GESTIONA'
      );
    end if;
  end if;

  if v_secret is null then
    raise exception 'Une clé API est requise lors de la première configuration';
  end if;

  insert into public.email_settings (
    organization_id, provider, from_email, from_name, reply_to,
    default_subject, default_body, api_key_secret_id, active, updated_at
  ) values (
    v_org, p_provider, trim(p_from_email), trim(p_from_name), nullif(trim(p_reply_to), ''),
    p_default_subject, p_default_body, v_secret, true, now()
  )
  on conflict (organization_id) do update set
    provider = excluded.provider,
    from_email = excluded.from_email,
    from_name = excluded.from_name,
    reply_to = excluded.reply_to,
    default_subject = excluded.default_subject,
    default_body = excluded.default_body,
    api_key_secret_id = excluded.api_key_secret_id,
    active = true,
    updated_at = now();
end
$$;

revoke all on function public.save_email_settings(text,text,text,text,text,text,text) from public;
grant execute on function public.save_email_settings(text,text,text,text,text,text,text) to authenticated;

commit;
