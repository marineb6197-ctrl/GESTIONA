# Correctif GESTIONA v6.4.1

L'erreur provenait d'un nom de fonction incohérent : la fondation crée `current_org_id()`, alors que l'ancienne migration appelait `current_organization_id()`.

## À faire maintenant

1. Dans Supabase, ouvrez **SQL Editor** puis **New query**.
2. Ouvrez `migration_v6_4_1_CORRIGEE.sql`.
3. Copiez tout son contenu, collez-le dans Supabase et cliquez sur **Run**.
4. Le résultat attendu est : `Success. No rows returned`.

Le script est réexécutable. Les éléments éventuellement créés avant l'erreur sont repris proprement grâce à `if not exists` et aux remplacements contrôlés.

Ne réexécutez pas l'ancien fichier erroné provenant du ZIP précédent.
