# GESTIONA — SaaS MVP Sprint 1

Première fondation React + TypeScript réellement exécutable de GESTIONA.

## Fonctionnalités livrées

- Connexion de démonstration.
- Cockpit multi-établissements.
- Sélecteur Danish / L'Élysée / tous les établissements.
- Référentiel produits avec création et persistance locale.
- Tableau de stocks et seuils critiques.
- Journal de mouvements de stock.
- Fiches fournisseurs.
- Assistant ORION local pour les questions de stock et factures.
- Navigation responsive ordinateur, tablette et téléphone.
- Client Supabase optionnel.
- Migration PostgreSQL initiale avec sécurité RLS multi-organisation.

## Lancer l'application

```bash
npm install
npm run dev
```

Puis ouvrir `http://localhost:5173`.

Identifiants de démonstration : n'importe quelle adresse e-mail valide et n'importe quel mot de passe.

## Activer Supabase

1. Créer un projet Supabase.
2. Copier `.env.example` vers `.env.local`.
3. Renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
4. Exécuter `supabase/migrations/001_initial_schema.sql` dans SQL Editor.

L'application fonctionne sans Supabase en mode local. Les produits créés sont enregistrés dans le navigateur via `localStorage`.

## Vérifications

```bash
npm run check
npm run build
```

## Prochaine étape métier

Brancher l'authentification Supabase et remplacer les données locales des produits, stocks et fournisseurs par les tables sécurisées du schéma.
