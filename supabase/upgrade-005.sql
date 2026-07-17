-- ============================================================
-- ARCARDI — mise à jour 005
-- À exécuter dans Supabase : SQL Editor → New query → Run
-- (à faire APRÈS schema.sql et upgrade-001.sql à upgrade-004.sql,
-- déjà exécutés)
-- ============================================================
-- Objectif :
--  Sauvegarde DURABLE de "Ferme Vallée" (jeu n°22). Contrairement à
--  rooms.game_state (état de partie EPHEMERE, remis à null dès qu'on
--  revient au salon), la ferme doit persister des semaines dans la même
--  "partie" : on la stocke donc dans une table dédiée, indexée par un
--  CODE DE FERME choisi par l'hôte. Le même code recharge exactement la
--  même ferme depuis n'importe quel salon, indéfiniment. Plusieurs
--  fermes peuvent coexister (une par code).
--
--  L'état complet du monde (seed, tuiles modifiées, cultures, or commun,
--  jour, et les personnages mémorisés de chaque joueur) tient dans une
--  seule colonne JSONB. Seul l'hôte écrit (il arbitre la partie), mais la
--  policy reste volontairement permissive (jeu convivial, pas de données
--  sensibles) : tout utilisateur connecté peut lire et upserter une
--  sauvegarde de ferme.
--
-- Migration additive : rien n'est supprimé ni modifié.
-- ============================================================

create table if not exists public.ferme_saves (
  code text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.ferme_saves enable row level security;

-- Lecture : tout utilisateur connecté (pour charger une ferme par code).
drop policy if exists "ferme_saves: lecture publique" on public.ferme_saves;
create policy "ferme_saves: lecture publique"
  on public.ferme_saves for select
  to authenticated
  using (true);

-- Création d'une nouvelle ferme (premier enregistrement d'un code).
drop policy if exists "ferme_saves: creation par un connecte" on public.ferme_saves;
create policy "ferme_saves: creation par un connecte"
  on public.ferme_saves for insert
  to authenticated
  with check (true);

-- Mise à jour d'une ferme existante (sauvegarde continue par l'hôte).
drop policy if exists "ferme_saves: mise a jour par un connecte" on public.ferme_saves;
create policy "ferme_saves: mise a jour par un connecte"
  on public.ferme_saves for update
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- Fin. "Success. No rows returned" = tout est bon.
-- ============================================================
