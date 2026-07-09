import { SYMBOLS } from "./constants";

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

/* ==========================================================================
   DIAPASON — Prologue "Le Réveil", 3 épreuves, générées ENSEMBLE par l'hôte
   puis diffusées telles quelles aux deux joueurs (comme Échos) : aucune
   re-génération locale, donc aucun risque de désynchronisation.

   Même principe d'asymétrie pour LES TROIS épreuves : ce que je vois dans
   MA salle ne me sert jamais à moi — ça sert à mon PARTENAIRE, et
   inversement. Concrètement, pour un joueur donné :
     - "myXxx"    = ce que JE dois régler/trouver dans MA propre salle.
     - "otherXxx" = ce qui est gravé/affiché chez MOI, mais qui décrit ce
       que MON PARTENAIRE doit régler/trouver chez LUI.
   Aucun des deux ne peut donc progresser seul : tout passe par la
   description à voix haute (ou au chat) de ce que chacun voit.

   1. estDoorCode / ouestDoorCode   — "Le Réveil" : code à régler sur les
      cadrans de la porte scellée (3 symboles).
   2. estKeySpot / ouestKeySpot     — "La Clé" : cachette (parmi 4, une par
      symbole) où trouver la clé dans le débarras.
   3. estLockCode / ouestLockCode   — "Le Cadenas" : code du cadenas final
      du sanctuaire (4 symboles).
   ========================================================================== */
export function genProloguePuzzle() {
  const estDoorCode = shuffle(SYMBOLS).slice(0, 3);
  const ouestDoorCode = shuffle(SYMBOLS).slice(0, 3);
  const estKeySpot = randomSymbol();
  const ouestKeySpot = randomSymbol();
  const estLockCode = Array.from({ length: 4 }, randomSymbol);
  const ouestLockCode = Array.from({ length: 4 }, randomSymbol);
  return { estDoorCode, ouestDoorCode, estKeySpot, ouestKeySpot, estLockCode, ouestLockCode };
}
