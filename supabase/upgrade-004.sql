-- ============================================================
-- ARCARDI — mise à jour 004
-- À exécuter dans Supabase : SQL Editor → New query → Run
-- (à faire APRÈS schema.sql, upgrade-001.sql, upgrade-002.sql et
-- upgrade-003.sql, déjà exécutés)
-- ============================================================
-- Objectif :
--  Synchroniser le bouton "Jouer" de la scène (porte en bois, rideau,
--  flash, vidéo) entre tous les joueurs d'un salon. Avant cette mise à
--  jour, chaque joueur ouvrait SA PROPRE porte indépendamment, en
--  cliquant chacun de son côté : aucune coordination, aucune animation
--  partagée. Désormais, seul l'hôte peut cliquer sur "Jouer", et
--  l'ouverture se déclenche au même instant chez tout le monde.
--
--  Même mécanique que rooms.launch_at (upgrade-003.sql), appliquée à
--  ce second palier : l'hôte écrit un horodatage cible dans un futur
--  proche, chaque client (hôte compris) attend localement d'atteindre
--  cet instant avant de faire pivoter sa porte. Un joueur qui rejoint
--  ou recharge après que l'instant soit déjà passé voit la scène
--  directement ouverte, sans rejouer l'animation pour lui tout seul.
--
-- Migration additive : rien n'est supprimé ni modifié.
-- ============================================================

alter table public.rooms add column if not exists stage_launch_at timestamptz;

-- ============================================================
-- Fin. "Success. No rows returned" = tout est bon.
-- ============================================================
