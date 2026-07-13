-- ============================================================
-- ARCARDI — mise à jour 003
-- À exécuter dans Supabase : SQL Editor → New query → Run
-- (à faire APRÈS schema.sql, upgrade-001.sql et upgrade-002.sql,
-- déjà exécutés)
-- ============================================================
-- Objectif :
--  1) Remplacer complètement le système "Points Arcardi" (score /
--     add_points / game_results) par un compteur Victoires / Défaites
--     PROPRE À CHAQUE JOUEUR DANS CHAQUE SALON.
--  2) Fiabiliser le lancement synchronisé d'une partie par l'hôte
--     (rooms.launch_at : horodatage cible commun à tous les clients,
--     tolérant un léger délai réseau).
--  3) Permettre à l'hôte de transférer son rôle ("Nommer comme host"),
--     et garantir qu'un salon vivant a toujours un hôte (succession
--     automatique quand l'hôte part ou disparaît).
--
-- Rien n'est supprimé (colonnes/table de l'ancien système "score" /
-- "game_results" / "profiles.total_points" laissées telles quelles,
-- simplement plus JAMAIS écrites ni lues par le site) : migration
-- additive, sans risque de perte de données.
-- ============================================================

-- 1) Compteurs Victoires / Défaites, par joueur, par salon -----------
alter table public.room_players add column if not exists wins integer not null default 0;
alter table public.room_players add column if not exists losses integer not null default 0;

-- RPC atomique : chaque joueur enregistre SON PROPRE résultat de fin de
-- partie (jamais celui d'un autre) — même principe que l'ancien
-- add_points, remplacé ici par un simple +1 victoire OU +1 défaite.
create or replace function public.add_game_result(p_room uuid, p_win boolean)
returns void
language sql
security definer set search_path = public
as $$
  update public.room_players
  set wins   = wins   + (case when p_win then 1 else 0 end),
      losses = losses + (case when p_win then 0 else 1 end)
  where room_id = p_room and profile_id = auth.uid();
$$;

grant execute on function public.add_game_result(uuid, boolean) to authenticated;

-- 2) Horodatage de lancement synchronisé -----------------------------
-- Écrit par l'hôte en même temps que status='playing' : tous les
-- clients (hôte compris) affichent un bref décompte partagé et ne
-- révèlent le jeu qu'une fois `now() >= launch_at` atteint LOCALEMENT
-- — un léger retard de réception Realtime ne désynchronise donc pas
-- l'ouverture tant qu'il reste sous la marge (voir GAME_LAUNCH_BUFFER_MS
-- côté client, lib/gameSync.js).
alter table public.rooms add column if not exists launch_at timestamptz;

-- 3) Transfert de rôle hôte (action "Nommer comme host") -------------
-- Nécessite un contournement RLS explicite (security definer) : la
-- policy "rooms: modification par l'hôte uniquement" applique sa
-- clause USING aussi en WITH CHECK, ce qui interdirait à l'hôte actuel
-- d'écrire un host_id différent du sien.
create or replace function public.nominate_host(p_room uuid, p_new_host uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.rooms where id = p_room and host_id = auth.uid()) then
    raise exception 'seul l''hôte actuel peut transférer son rôle';
  end if;
  if not exists (select 1 from public.room_players where room_id = p_room and profile_id = p_new_host) then
    raise exception 'ce joueur ne fait pas partie du salon';
  end if;
  update public.rooms set host_id = p_new_host where id = p_room;
end;
$$;

grant execute on function public.nominate_host(uuid, uuid) to authenticated;

-- 4) Départ d'un joueur + succession automatique du host --------------
-- Remplace le simple DELETE fait auparavant côté client : si le joueur
-- qui part est l'hôte, le joueur présent depuis le plus longtemps
-- (joined_at le plus ancien) parmi ceux qui restent devient
-- automatiquement le nouvel hôte, dans la MÊME transaction — jamais de
-- salon vivant sans hôte.
create or replace function public.leave_room(p_room uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  was_host boolean;
  successor uuid;
begin
  select (host_id = auth.uid()) into was_host from public.rooms where id = p_room;

  delete from public.room_players where room_id = p_room and profile_id = auth.uid();

  if was_host then
    select profile_id into successor
      from public.room_players
      where room_id = p_room
      order by joined_at asc
      limit 1;
    if successor is not null then
      update public.rooms set host_id = successor where id = p_room;
    end if;
  end if;
end;
$$;

grant execute on function public.leave_room(uuid) to authenticated;

-- 5) Récupération d'un salon dont l'hôte a disparu sans cliquer
--    "Quitter" (déconnexion, onglet fermé, crash) -----------------------
-- Auto-revendication : un client ne l'appelle QUE pour lui-même, et
-- seulement s'il a détecté (via la présence Realtime, côté client) que
-- l'hôte est hors ligne depuis plusieurs secondes ET qu'il est
-- lui-même le joueur présent depuis le plus longtemps parmi les
-- joueurs actuellement en ligne. Le contrôle "suis-je bien membre du
-- salon" suffit côté serveur (même niveau de confiance que le reste du
-- site, ex. add_points) : le pire abus possible est un transfert de
-- rôle prématuré au sein du MÊME groupe d'amis, jamais un accès hors
-- salon.
create or replace function public.claim_abandoned_host(p_room uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.room_players where room_id = p_room and profile_id = auth.uid()) then
    raise exception 'vous ne faites pas partie de ce salon';
  end if;
  update public.rooms set host_id = auth.uid() where id = p_room;
end;
$$;

grant execute on function public.claim_abandoned_host(uuid) to authenticated;

-- ============================================================
-- Fin. "Success. No rows returned" = tout est bon.
-- ============================================================
