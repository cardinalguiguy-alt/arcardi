-- ============================================================
-- ARCARDI — mise à jour 002
-- À exécuter dans Supabase : SQL Editor → New query → Run
-- (à faire APRÈS schema.sql et upgrade-001.sql, déjà exécutés)
-- ============================================================
-- Objectif : survivre à un rechargement de page en pleine partie.
--
-- Avant cette mise à jour, TOUT l'état d'une manche en cours (plateau,
-- question active, chrono, rôles...) ne vivait que dans des messages
-- Realtime "Broadcast" éphémères : un simple F5 faisait perdre cet état
-- pour de bon, et le joueur restait bloqué sur l'écran "Ça commence…"
-- pendant que les autres continuaient de jouer.
--
-- Cette colonne stocke un instantané JSON de la partie en cours, écrit
-- UNIQUEMENT par l'hôte (la policy "rooms: modification par l'hôte
-- uniquement" existante s'applique automatiquement, aucun changement de
-- policy nécessaire). N'importe quel joueur peut la LIRE (policy de
-- lecture publique déjà en place), ce qui permet à un client qui
-- recharge la page de se resynchroniser immédiatement à l'ouverture,
-- sans attendre un message qu'il ne recevra jamais.
-- ============================================================

alter table public.rooms add column if not exists game_state jsonb;

-- ============================================================
-- Fin du script.
-- ============================================================
