/* ==========================================================================
   10000 (Dix Mille) — logique de score PURE (aucun React, aucun réseau,
   aucun aléa). Même discipline que components/yahtzee/scoring.js : mêmes
   dés en entrée -> même résultat en sortie, condition n°1 pour un jeu de
   dés partagé en réseau. Couvert par un script de simulation PRNG massive
   avant chaque livraison (voir le résumé de séance) — jamais exécuté dans
   le navigateur, uniquement un filet de sécurité avant de zipper.

   Barème retenu (verrouillé avec le porteur de projet) :
   - 1 seul = 100 pts, 5 seul = 50 pts.
   - Brelan (3 identiques) : 111 = 1000, sinon valeur × 100 (222=200 … 666=600).
   - 4 identiques = brelan × 2, 5 identiques = brelan × 4, 6 identiques = brelan × 8.
   - Suite complète 1-2-3-4-5-6 (les 6 dés à la fois) = 1500.
   - Trois paires (les 6 dés à la fois) = 750.
   - Hot dice : les 6 dés utilisés dans un même tour -> on relance les 6,
     le score du tour continue de s'accumuler (pas géré ici : orchestration
     réseau, voir TenkGame.js — ce fichier ne fait QUE évaluer un lancer ou
     une sélection donnés).

   Choix de conception qui élimine toute ambiguïté de calcul (documenté ici
   pour la prochaine relecture) : le score d'une sélection est TOUJOURS la
   somme, PAR VALEUR PRÉSENTE dans la sélection, d'un score déterminé par
   LE NOMBRE de dés de cette valeur sélectionnés (jamais une "meilleure
   décomposition" recherchée par l'algorithme) — sauf le cas spécial où la
   sélection est EXACTEMENT les 6 dés ET qu'ils forment une suite ou trois
   paires, auquel cas c'est ce score fixe qui s'applique à la place. Une
   valeur 2/3/4/6 sélectionnée à 1 ou 2 exemplaires ne rapporte JAMAIS rien
   (pas de "brelan partiel") : la sélection entière est alors invalide tant
   que ces dés-là en font partie — c'est ce qui permet au joueur de choisir
   LUI-MÊME quels dés garder (voir DICE_COUNT plus bas), sans qu'aucune
   sélection "à moitié scorée" ne soit jamais acceptée par erreur.
   ========================================================================== */

export const DICE_COUNT = 6;

// Score d'un groupe de `count` dés identiques de valeur `value` — la SEULE
// source de vérité pour tout score dé-par-dé de ce jeu. 0 = ce groupe ne
// rapporte rien (dés "morts", ne peuvent pas faire partie d'une sélection
// valide seuls).
export function groupScore(value, count) {
  if (!count || count < 1) return 0;
  if (value === 1) {
    return { 1: 100, 2: 200, 3: 1000, 4: 2000, 5: 4000, 6: 8000 }[count] || 0;
  }
  if (value === 5) {
    return { 1: 50, 2: 100, 3: 500, 4: 1000, 5: 2000, 6: 4000 }[count] || 0;
  }
  if (count < 3) return 0; // valeur 2/3/4/6 seule ou en paire : ne compte jamais
  const base = value * 100; // brelan de base (333=300, 444=400, etc.)
  return { 3: base, 4: base * 2, 5: base * 4, 6: base * 8 }[count] || 0;
}

function counts(values) {
  const c = {};
  for (const v of values) c[v] = (c[v] || 0) + 1;
  return c;
}

export function isStraight(values) {
  if (values.length !== 6) return false;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted.every((v, i) => v === i + 1);
}

export function isThreePairs(values) {
  if (values.length !== 6) return false;
  const c = counts(values);
  const groups = Object.values(c);
  return groups.length === 3 && groups.every((n) => n === 2);
}

// Évalue une sélection de dés (tableau de VALEURS, pas d'indices — c'est à
// l'appelant de traduire indices -> valeurs). Renvoie :
//   { valid: true,  points, shape }               si la sélection compte
//   { valid: false, points: 0, deadValues: [...] } sinon (deadValues = les
//     valeurs présentes dans la sélection qui ne rapportent rien en l'état
//     — utile pour l'interface : elle peut griser/secouer ces dés-là).
export function evaluateSelection(values) {
  if (!values || values.length === 0) return { valid: false, points: 0, deadValues: [] };

  if (values.length === 6) {
    if (isStraight(values)) return { valid: true, points: 1500, shape: "straight" };
    if (isThreePairs(values)) return { valid: true, points: 750, shape: "threePairs" };
  }

  const c = counts(values);
  let total = 0;
  const deadValues = [];
  for (const [vStr, n] of Object.entries(c)) {
    const v = Number(vStr);
    const s = groupScore(v, n);
    if (s === 0) deadValues.push(v);
    total += s;
  }
  if (deadValues.length > 0) return { valid: false, points: 0, deadValues };
  return { valid: true, points: total, shape: "atomic" };
}

// Farkle : AUCUNE sélection non vide n'est valable parmi `values` (les dés
// actuellement actifs). Un lancer partiel (moins de 6 dés, après une
// première mise de côté dans le tour) est évalué exactement pareil — la
// règle de suite/trois paires ne s'applique qu'à un groupe de 6 dés,
// jamais moins.
export function isFarkle(values) {
  if (!values || values.length === 0) return false;
  if (values.length === 6 && (isStraight(values) || isThreePairs(values))) return false;
  const c = counts(values);
  return Object.entries(c).every(([vStr, n]) => groupScore(Number(vStr), n) === 0);
}

// Utilitaire pour l'UI : le meilleur score atteignable sur CE lancer (toutes
// combinaisons valables confondues), UNIQUEMENT pour un indicateur informatif
// ("meilleur score possible : …") — ne sert JAMAIS à imposer un choix, le
// joueur reste libre de sélectionner moins que l'optimal.
export function bestPossibleScore(values) {
  if (!values || values.length === 0) return 0;
  if (values.length === 6) {
    if (isStraight(values)) return 1500;
    if (isThreePairs(values)) return 750;
  }
  const c = counts(values);
  let total = 0;
  for (const [vStr, n] of Object.entries(c)) {
    const v = Number(vStr);
    if (v === 1 || v === 5) { total += groupScore(v, n); continue; }
    if (n >= 3) total += groupScore(v, n);
    // sinon (1 ou 2 dés d'une valeur 2/3/4/6) : ne contribue jamais.
  }
  return total;
}
