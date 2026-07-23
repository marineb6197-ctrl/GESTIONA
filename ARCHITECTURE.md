# GESTIONA v8.1 — Architecture stabilisée

## Organisation

- `index.html` : structure de l’interface uniquement.
- `assets/css/app.css` : styles de l’application.
- `assets/js/app.js` : logique principale de GESTIONA.
- `orion-import.js` : moteur spécialisé d’import Excel ORION.
- `supabase-config.js` : configuration Supabase.
- `sw.js` : cache hors ligne et mise à jour de la PWA.
- `supabase_schema.sql` et `migration_*.sql` : base de données.

## Objectif de cette version

Cette version sépare la présentation, les styles et la logique JavaScript. Elle réduit le risque de casser l’application lors des prochaines évolutions et prépare une séparation progressive par modules métier.

## Règles pour les prochaines versions

1. Ne plus ajouter de CSS directement dans `index.html`.
2. Ne plus ajouter de JavaScript principal directement dans `index.html`.
3. Conserver les modules spécialisés dans des fichiers séparés.
4. Mettre à jour le nom du cache dans `sw.js` à chaque livraison.
5. Exécuter les contrôles de syntaxe avant de publier.

## Prochaine étape recommandée

Découper progressivement `assets/js/app.js` en modules fonctionnels (`core`, `stock`, `orders`, `finance`, `copilot`) après ajout d’un système de modules ES et de tests d’intégration. Cette étape devra être faite par petites migrations afin de préserver la stabilité.
