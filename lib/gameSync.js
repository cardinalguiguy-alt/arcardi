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

// Retour au salon — utilisé par TOUS les jeux ("Retour au salon" / "Rejouer
// puis quitter"). Écrit en une seule requête {status, current_game,
// game_state}. Si la colonne rooms.game_state n'existe pas encore
// (upgrade-002.sql pas exécuté), Postgres refuse la requête ENTIÈRE —
// résultat : le statut ne repasse jamais à "lobby" et le bouton semble
// "ne rien faire" (aucune erreur visible, juste un update qui échoue en
// silence côté client). On retente alors sans ce champ pour ne jamais
// bloquer le retour au salon, migration ou pas.
export async function resetRoomToLobby(roomId) {
  const { error } = await supabase
    .from("rooms")
    .update({ status: "lobby", current_game: null, game_state: null, launch_at: null, stage_launch_at: null })
    .eq("id", roomId);
  if (error) {
    warnMissingColumn(error);
    const { error: error2 } = await supabase
      .from("rooms")
      .update({ status: "lobby", current_game: null })
      .eq("id", roomId);
    if (error2) console.error("[ARCARDI] Impossible de revenir au salon :", error2);
    return !error2;
  }
  return true;
}

/* ==========================================================================
   Victoires / Défaites — remplace complètement l'ancien système "Points
   Arcardi" (RPC add_points + table game_results). Chaque joueur enregistre
   SON PROPRE résultat de fin de partie (jamais celui d'un autre, RLS/RPC
   oblige) : +1 victoire pour le(s) gagnant(s), +1 défaite pour tous les
   autres. Voir supabase/upgrade-003.sql pour la RPC `add_game_result`.
   ========================================================================== */
export async function recordMatchResult(roomId, isWin) {
  // Jamais silencieux (correctif 2026-07) : un échec ici ne doit pas bloquer
  // la fin de partie (d'où l'absence de throw), mais il laissait AUCUNE trace
  // — des victoires/défaites pouvaient se perdre sans qu'on puisse le savoir.
  try {
    const { error } = await supabase.rpc("add_game_result", { p_room: roomId, p_win: !!isWin });
    if (error) console.error("[ARCARDI] Victoire/défaite NON enregistrée (RPC add_game_result, voir supabase/upgrade-003.sql) :", error);
  } catch (e) {
    console.error("[ARCARDI] Victoire/défaite NON enregistrée (RPC add_game_result) :", e);
  }
}

/* ==========================================================================
   Lancement synchronisé d'une partie (demande 2026-07) — un seul bouton
   "Jouer" côté hôte, qui doit ouvrir le jeu pour TOUT le monde au même
   moment, même si un joueur a un léger délai réseau sur la réception du
   changement Realtime.

   Principe : l'hôte écrit, EN MÊME TEMPS que status/current_game,
   `launch_at` = un horodatage commun dans un futur proche (maintenant +
   GAME_LAUNCH_BUFFER_MS). Chaque client (hôte compris) attend d'atteindre
   CET horodatage avant de révéler réellement le jeu (voir le décompte dans
   app/room/[code]/page.js) — la marge absorbe le temps de propagation
   Realtime : tant qu'un client reçoit le changement avant `launch_at`, il
   ouvre le jeu exactement au même instant que tous les autres.
   ========================================================================== */
export const GAME_LAUNCH_BUFFER_MS = 1800;

// LIMITE DE CONFIANCE des horodatages (correctif 2026-07) : launch_at et
// stage_launch_at sont écrits avec l'horloge DE L'HÔTE puis comparés à
// l'horloge LOCALE de chaque client. À la moindre dérive d'horloge entre
// machines (courante : parfois plusieurs minutes), le `delay` calculé chez
// un invité devenait énorme (porte fermée "pour toujours" = le blocage
// signalé) ou très négatif (animation sautée à tort). Tout consommateur de
// ces horodatages doit donc BORNER son attente : jamais plus de
// SYNC_MAX_WAIT_MS, jamais moins de 0 quand le déclenchement vient
// d'arriver en direct. La synchronisation parfaite reste assurée entre
// clients aux horloges justes ; un client à l'horloge fausse ouvre au pire
// avec ~1s d'écart, mais il OUVRE.
export const SYNC_MAX_WAIT_MS = 2500;

// Correctif URGENT 2026-07 (invités bloqués sur "En attente que l'hôte lance
// la partie…", hôte se retrouvant seul en jeu) : cette fonction retournait
// AVANT un simple `launchAt`, toujours le même que la colonne ait pu être
// écrite ou non — l'appelant n'avait donc AUCUN moyen de savoir que
// l'écriture avait échoué (ex. colonnes launch_at/stage_launch_at absentes
// faute d'avoir exécuté upgrade-003.sql/upgrade-004.sql). Elle renvoie
// maintenant `{ launchAt, ok }` : `ok:false` signale à l'appelant qu'il ne
// doit PAS faire avancer l'hôte comme si de rien n'était (voir `launch()`
// dans app/room/[code]/page.js, qui affiche alors un avertissement au lieu
// de laisser l'hôte seul en partie pendant que les invités ne reçoivent
// jamais rien).
export async function launchGame(roomId, gameId) {
  const launchAt = new Date(Date.now() + GAME_LAUNCH_BUFFER_MS).toISOString();
  // stage_launch_at repart TOUJOURS à null ici : c'est le palier SUIVANT
  // (porte/rideau/flash/vidéo, voir launchStage ci-dessous) — sans ce
  // reset, un horodatage laissé par la partie PRÉCÉDENTE pourrait rouvrir
  // la scène toute seule, sans qu'aucun hôte n'ait cliqué sur "Jouer".
  const { error } = await supabase
    .from("rooms")
    .update({ status: "playing", current_game: gameId, launch_at: launchAt, stage_launch_at: null })
    .eq("id", roomId);
  if (error) {
    // Colonne launch_at ou stage_launch_at pas encore migrée (upgrade-003.sql
    // / upgrade-004.sql) : on retente sans elles pour ne jamais bloquer le
    // lancement, migration ou pas — même filet de sécurité que
    // resetRoomToLobby ci-dessus.
    warnMissingColumn(error);
    const { error: error2 } = await supabase.from("rooms").update({ status: "playing", current_game: gameId }).eq("id", roomId);
    if (error2) {
      // Ici, même le repli minimal (status/current_game seuls) a échoué :
      // la partie n'a RÉELLEMENT démarré pour personne. Seul ce cas doit
      // bloquer l'hôte (voir `ok` ci-dessous) — le distinguer du cas
      // "colonnes manquantes mais repli réussi" juste en dessous, où la
      // partie démarre bel et bien pour tout le monde (juste sans palier
      // synchronisé fiable), et où bloquer l'hôte serait un faux positif.
      console.error("[ARCARDI] Impossible de lancer la partie (rooms.status/current_game) :", error2);
      return { launchAt: null, ok: false };
    }
    return { launchAt: null, ok: true };
  }
  return { launchAt, ok: true };
}

/* ==========================================================================
   Ouverture synchronisée de la SCÈNE (demande 2026-07) — second palier,
   après le lancement de la partie ci-dessus. Avant cette mise à jour,
   chaque joueur ouvrait sa propre porte/rideau en cliquant "Jouer" de son
   côté, sans aucune coordination. Désormais, seul l'hôte peut cliquer
   (voir DoorStage.js/CurtainStage.js/FlashStage.js/VideoStage.js), et cet
   appel écrit l'horodatage cible que tous les clients, hôte compris,
   attendent avant de faire pivoter leur porte — exactement le même
   principe que launchGame ci-dessus, appliqué un cran plus loin.
   ========================================================================== */
// Tampon PROPRE à la scène (correctif fluidité 2026-07) : contrairement au
// lancement de partie (palier "Ça commence…" visible qui occupe l'attente),
// le clic "Jouer" de la scène n'affichait RIEN pendant 1800 ms — l'hôte
// avait l'impression d'un bouton mort. 900 ms suffisent largement à
// absorber la latence Realtime typique (100-400 ms) ; un client servi plus
// tard ouvre immédiatement grâce au bornage SYNC_MAX_WAIT_MS ci-dessus.
export const STAGE_LAUNCH_BUFFER_MS = 900;

// Même correctif que launchGame ci-dessus, appliqué à ce second palier :
// renvoie `{ openAt, ok }` au lieu d'un simple `openAt` toujours "réussi" en
// apparence, pour que l'appelant (`openStage` dans app/room/[code]/page.js)
// puisse détecter un échec d'écriture réel et NE PAS ouvrir la porte du seul
// hôte comme si tout le monde la voyait aussi.
export async function launchStage(roomId) {
  const openAt = new Date(Date.now() + STAGE_LAUNCH_BUFFER_MS).toISOString();
  const { error } = await supabase.from("rooms").update({ stage_launch_at: openAt }).eq("id", roomId);
  if (error) { warnMissingColumn(error); return { openAt: null, ok: false }; }
  return { openAt, ok: true };
}

/* ==========================================================================
   Rôle d'hôte — transfert explicite, départ avec succession automatique,
   et récupération d'un salon dont l'hôte a disparu sans prévenir (demande
   2026-07, points 4 et 5). Trois RPC dédiées (voir supabase/upgrade-003.sql)
   car la policy RLS "rooms: modification par l'hôte uniquement" empêche un
   client d'écrire un host_id différent du sien via un simple .update().
   ========================================================================== */

// Transfert volontaire, déclenché par l'hôte actuel ("Nommer comme host").
export async function nominateHost(roomId, newHostProfileId) {
  const { error } = await supabase.rpc("nominate_host", { p_room: roomId, p_new_host: newHostProfileId });
  return !error;
}

// Départ d'un joueur (bouton "Quitter le salon") : remplace le simple
// DELETE — si le partant était l'hôte, le serveur promeut automatiquement
// le joueur présent depuis le plus longtemps parmi ceux qui restent.
export async function leaveRoomAndHandoff(roomId) {
  const { error } = await supabase.rpc("leave_room", { p_room: roomId });
  return !error;
}

// Auto-revendication du rôle d'hôte par un invité qui a détecté (présence
// Realtime, côté client) que l'hôte est hors ligne depuis longtemps et
// qu'il est lui-même le prochain dans l'ordre d'ancienneté.
export async function claimAbandonedHost(roomId) {
  const { error } = await supabase.rpc("claim_abandoned_host", { p_room: roomId });
  return !error;
}
