import { supabase } from "./supabaseClient";

/* ==========================================================================
   gameSync — persistance minimale de l'état de partie EN COURS, pour
   survivre à un rechargement de page.
   ==========================================================================
   Principe : chaque jeu écrit un instantané JSON dans rooms.game_state à
   chaque événement broadcast qui fait autorité (reçu par TOUS les clients,
   y compris l'hôte lui-même grâce à broadcast.self=true). Seul l'hôte
   écrit (la policy RLS "modification par l'hôte uniquement" l'impose de
   toute façon) — mais comme l'hôte reçoit aussi les actions des AUTRES
   joueurs via le même canal broadcast, ça fonctionne même quand l'action
   d'origine vient d'un joueur non-hôte (ex : Piano Escape, où n'importe
   quel joueur peut résoudre une salle).

   Au montage, chaque jeu lit room.game_state (déjà présent dans le `room`
   reçu en prop, puisque la page /room/[code] fait un SELECT * frais à
   l'ouverture) et restaure directement l'état local si la partie était en
   cours — au lieu d'attendre un message qui ne reviendra jamais.

   Limite assumée : la policy RLS n'autorise QUE l'hôte à écrire sur
   `rooms`. Les jeux où chaque joueur a une progression PRIVÉE non
   partagée (ex : ses propres essais dans Mot Mystère) ne peuvent
   restaurer que l'état PARTAGÉ (le mot à deviner, le chrono) — la
   progression strictement personnelle d'un joueur qui recharge repart de
   zéro pour cette manche. C'est un compromis délibéré plutôt qu'une
   réécriture du schéma des droits d'accès.
   ========================================================================== */

export async function saveGameState(roomId, gameId, state) {
  try {
    await supabase
      .from("rooms")
      .update({ game_state: { gameId, state, savedAt: Date.now() } })
      .eq("id", roomId);
  } catch (e) {}
}

export async function clearGameState(roomId) {
  try {
    await supabase.from("rooms").update({ game_state: null }).eq("id", roomId);
  } catch (e) {}
}

export function readGameState(room, gameId) {
  const gs = room?.game_state;
  if (!gs || gs.gameId !== gameId) return null;
  return gs.state || null;
}
