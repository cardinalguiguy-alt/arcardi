import { evaluateSelection } from "./scoring";

/* ==========================================================================
   10000 — heuristique des bots (sièges vides comblés, comme Président et
   Chromatik). Pas un solveur optimal : une heuristique "sensée", assez
   prudente pour ne pas farkle bêtement à répétition, sans chercher la
   décision mathématiquement parfaite à chaque tour.
   ========================================================================== */

// Quels dés le bot met de côté sur CE lancer (tableau d'INDICES dans
// `values`). Contrairement à un joueur humain (qui garde toute liberté de
// choix, voir scoring.js), le bot prend TOUJOURS tout ce qui score sur ce
// lancer — il n'a pas besoin de marge stratégique fine, "jouer correctement"
// par défaut suffit à un bot crédible.
export function decideBotSelection(values) {
  if (values.length === 6) {
    const full = evaluateSelection(values);
    if (full.valid && (full.shape === "straight" || full.shape === "threePairs")) {
      return values.map((_, i) => i);
    }
  }
  const counts = {};
  values.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
  const keepIdx = [];
  values.forEach((v, i) => {
    const n = counts[v];
    if (v === 1 || v === 5 || n >= 3) keepIdx.push(i);
  });
  return keepIdx;
}

// Relance ou banque, après une sélection valable. `activeDiceCount` = dés
// encore actifs APRÈS la mise de côté qui vient d'avoir lieu — 6 au moment
// d'un hot dice (pool neuf), 0 si plus aucun dé actif ET pas de hot dice
// (ne devrait pas arriver : l'appelant traite ce cas à part).
const BANK_THRESHOLD = 350;  // score de tour au-delà duquel le bot commence à sécuriser
const SAFE_THRESHOLD = 1050; // score déjà confortable : le bot banque presque toujours
const MIN_DICE_TO_PUSH = 3;  // en dessous, trop risqué de continuer sans un bon motif

export function decideBotContinue(turnScore, activeDiceCount) {
  if (turnScore >= SAFE_THRESHOLD) return false;
  if (activeDiceCount < MIN_DICE_TO_PUSH && turnScore >= BANK_THRESHOLD) return false;
  return true;
}
