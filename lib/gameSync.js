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
    const { error } = await supabase
      .from("rooms")
      .update({ game_state: { gameId, state, savedAt: Date.now() } })
      .eq("id", roomId);
    if (error) warnMissingColumn(error);
  } catch (e) {
    warnMissingColumn(e);
  }
}

export async function clearGameState(roomId) {
  try {
    const { error } = await supabase.from("rooms").update({ game_state: null }).eq("id", roomId);
    if (error) warnMissingColumn(error);
  } catch (e) {
    warnMissingColumn(e);
  }
}

// Avertissement explicite et impossible à rater dans la console si la
// colonne rooms.game_state n'existe pas encore (migration supabase/upgrade-002.sql
// pas encore exécutée) : sans ce message, l'échec de sauvegarde est silencieux
// et ressemble exactement à "le rechargement de page réinitialise le jeu".
let warned = false;
function warnMissingColumn(err) {
  if (warned) return;
  warned = true;
  console.error(
    "[ARCARDI] Impossible d'enregistrer l'état de partie (rooms.game_state). " +
    "As-tu bien exécuté supabase/upgrade-002.sql dans le SQL Editor de Supabase ? " +
    "Sans ça, un rechargement de page réinitialise toujours la partie. Détail :",
    err
  );
}

export function readGameState(room, gameId) {
  const gs = room?.game_state;
  if (!gs || gs.gameId !== gameId) return null;
  return gs.state || null;
}
