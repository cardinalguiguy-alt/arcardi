import { SYMBOLS } from "./constants";

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ==========================================================================
   Prologue "Le Réveil" — une seule énigme, générée par l'hôte puis diffusée
   telle quelle aux deux joueurs (comme Échos) : aucune re-génération locale,
   donc aucun risque de désynchronisation entre les deux clients.

   - estDoorCode  : le code à régler sur LES CADRANS de la salle Est.
   - ouestDoorCode: le code à régler sur LES CADRANS de la salle Ouest.

   Asymétrie volontaire : la plaque VISIBLE dans la salle Est affiche
   ouestDoorCode (pas le sien), et inversement. Aucun des deux joueurs ne
   peut donc ouvrir sa propre porte sans que l'autre lui décrive sa plaque.
   ========================================================================== */
export function genProloguePuzzle() {
  const estDoorCode = shuffle(SYMBOLS).slice(0, 3);
  const ouestDoorCode = shuffle(SYMBOLS).slice(0, 3);
  return { estDoorCode, ouestDoorCode };
}
