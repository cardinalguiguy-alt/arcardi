import { SYMBOLS, INTERVALS } from "./constants";

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

function randomInterval() {
  return INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
}

/* ==========================================================================
   DIAPASON — Prologue "Le Réveil", 3 épreuves, générées ENSEMBLE par l'hôte
   puis diffusées telles quelles aux deux joueurs (comme Échos) : aucune
   re-génération locale, donc aucun risque de désynchronisation.

   Même principe d'asymétrie pour LES TROIS épreuves : ce que je vois/entends
   dans MA salle ne me sert jamais à moi — ça sert à mon PARTENAIRE, et
   inversement.

   1. estDoorCode / ouestDoorCode    — "Le Réveil" : code à régler sur les
      cadrans de la porte scellée (3 symboles). Décrit par l'autre.
   2. estBoxInterval / ouestBoxInterval — "L'Accord" : l'intervalle qui
      ouvre MA boîte à musique. IMPORTANT : quand JE tourne ma manivelle, le
      son ne se joue que chez MON PARTENAIRE (asymétrie) ; c'est LUI qui
      l'identifie et me dit lequel c'est, puis je valide. Réciproquement, je
      suis l'oreille de la boîte de mon partenaire.
   3. estLockCode / ouestLockCode    — "Le Cadenas" : code du cadenas final
      du sanctuaire (4 symboles), révélé une fois le candélabre allumé.
   ========================================================================== */
export function genProloguePuzzle() {
  const estDoorCode = shuffle(SYMBOLS).slice(0, 3);
  const ouestDoorCode = shuffle(SYMBOLS).slice(0, 3);
  const estBoxInterval = randomInterval();
  const ouestBoxInterval = randomInterval();
  const estLockCode = Array.from({ length: 4 }, randomSymbol);
  const ouestLockCode = Array.from({ length: 4 }, randomSymbol);
  return { estDoorCode, ouestDoorCode, estBoxInterval, ouestBoxInterval, estLockCode, ouestLockCode };
}
