# GESTIONA ERP v5.0 — Mise en place Supabase

Cette version prépare la fondation cloud, mais **la synchronisation n’est pas encore activée**.

## Étapes
1. Créer un projet Supabase.
2. Ouvrir **SQL Editor** et exécuter `supabase_schema.sql`.
3. Dans **Project Settings > API**, copier l’URL du projet et la clé publique `anon`.
4. Ouvrir `supabase-config.js` et remplacer les deux valeurs de démonstration.
5. Publier les fichiers avec GitHub Desktop.

## Sécurité
- Ne jamais mettre la clé `service_role` dans GitHub Pages.
- La clé `anon` est prévue pour le navigateur, à condition que les règles RLS restent actives.
- Pour protéger davantage le code, le dépôt pourra ensuite être rendu privé et les fonctions sensibles déplacées côté serveur.

## Ce qui est déjà préparé
- organisations et établissements ;
- comptes et rôles utilisateurs ;
- fournisseurs et produits ;
- mouvements de stock ;
- journal d’audit ;
- règles de sécurité par organisation.
