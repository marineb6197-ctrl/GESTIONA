# Installation v6.4.1 — Envoi direct par e-mail

1. Exécuter `migration_v6_4_1.sql` dans le SQL Editor Supabase.
2. Dans Supabase > Edge Functions, créer une fonction nommée `send-purchase-order-email` et coller le contenu de `supabase/functions/send-purchase-order-email/index.ts`, puis la déployer.
3. Remplacer sur GitHub : `index.html`, `sw.js`, `manifest.webmanifest`.
4. Dans GESTIONA > Paramètres > Configurer l’e-mail, saisir le compte Resend propre à l’entreprise.
5. Dans Resend, le domaine d’expédition doit être vérifié avant d’envoyer à des fournisseurs.

La clé API est enregistrée dans Supabase Vault et n’est jamais relue par le navigateur.
