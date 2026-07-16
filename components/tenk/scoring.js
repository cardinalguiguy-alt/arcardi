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
   - Suite courte à 5 dés (1-2-3-4-5 OU 2-3-4-5-6, le 6e dé restant à part)
     = 1500 également — ajoutée à la demande du porteur de projet pour
     coller aux règles officielles du jeu (une suite n'a besoin que de 5
     valeurs consécutives, le 6e dé du lancer n'a pas à en faire partie).
   - Trois paires (les 6 dés à la fois) = 750.
   - Pour banquer, il faut avoir cumulé au moins 300 pts sur le tour en
     cours (appliqué à la fois côté bouton client ET côté hôte-arbitre).
   - Trois lancers consécutifs sans aucune combinaison valable ("blancs")
     coûtent 500 pts au score total du joueur (jamais sous 0) — le compteur
     est gardé dans l'état de partie (farkleStreak), remis à 0 dès qu'un
     lancer redevient valable. Logique d'orchestration dans TenkGame.js,
     ce fichier ne fait qu'exposer isFarkle() pour piloter ce compteur.
   - Hot dice : les 6 dés utilisés dans un même tour -> on relance les 6,
     le score du tour continue de s'accumuler (pas géré ici : orchestration
     réseau, voir TenkGame.js — ce fichier ne fait QUE évaluer un lancer ou
     une sélection donnés).

   Choix de conception qui élimine toute ambiguïté de calcul (documenté ici
   pour la prochaine relecture) : le score d'une sélection est TOUJOURS la
   somme, PAR VALEUR PRÉSENTE dans la sélection, d'un score déterminé par
   LE NOMBRE de dés de cette valeur sélectionnés (jamais une "meilleure
   décomposition" recherchée par l'algorithme) — sauf les deux cas spéciaux
   où la sélection est EXACTEMENT les 6 dés et forme une suite/trois paires,
   ou EXACTEMENT 5 dés et forme une suite courte, auquel cas c'est ce score
   fixe qui s'applique à la place. Une valeur 2/3/4/6 sélectionnée à 1 ou 2
   exemplaires ne rapporte JAMAIS rien (pas de "brelan partiel") : la
   sélection entière est alors invalide tant que ces dés-là en font partie
   — c'est ce qui permet au joueur de choisir LUI-MÊME quels dés garder
   (voir DICE_COUNT plus bas), sans qu'aucune sélection "à moitié scorée"
   ne soit jamais acceptée par erreur.
   ========================================================================== */

export const DICE_COUNT = 6;
export const MIN_TO_BANK = 300;
export const FARKLE_STREAK_LIMIT = 3;
export const FARKLE_STREAK_PENALTY = 500;

const SMALL_STRAIGHTS = [
  [1, 2, 3, 4, 5],
  [2, 3, 4, 5, 6],
];

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

// Suite courte : EXACTEMENT 5 dés, dont les valeurs sont précisément
// {1,2,3,4,5} ou {2,3,4,5,6} (aucun doublon, aucune valeur en trop dans
// CETTE sélection — un éventuel 6e dé du lancer reste hors sélection).
export function isSmallStraight(values) {
  if (values.length !== 5) return false;
  const sorted = values.slice().sort((a, b) => a - b).join(",");
  return SMALL_STRAIGHTS.some((s) => s.join(",") === sorted);
}

// Un lancer (quel que soit son nombre de dés actifs) contient-il, en tant
// que SOUS-ENSEMBLE de valeurs présentes, de quoi former une suite courte
// (1-2-3-4-5 ou 2-3-4-5-6) ? Utilisé par isFarkle et par le hint "meilleur
// score possible" — ne préjuge jamais de ce que le joueur choisit de garder.
export function hasSmallStraightSubset(values) {
  const set = new Set(values);
  return SMALL_STRAIGHTS.some((req) => req.every((v) => set.has(v)));
}

// Trouve, dans `values`, les INDICES d'un die par valeur requise dans
// `pattern` (ex. [1,2,3,4,5]) — un index par valeur du pattern, jamais le
// même index deux fois. Renvoie null si le pattern n'est pas entièrement
// disponible. Utilisé pour la suite courte (ci-dessous) et repris tel quel
// par botLogic.js (import direct, évite une deuxième copie de cette logique).
export function findPatternIndices(values, pattern) {
  const used = new Array(values.length).fill(false);
  const idxs = [];
  for (const v of pattern) {
    const idx = values.findIndex((val, i) => val === v && !used[i]);
    if (idx === -1) return null;
    used[idx] = true;
    idxs.push(idx);
  }
  return idxs;
}

// Liste, pour un lancer donné (tableau de VALEURS des dés actifs), toutes
// les combinaisons "prêtes à cliquer" que le joueur peut choisir sur CE
// lancer — pensé pour un panneau d'aide façon "combinaisons possibles" :
// chaque ligne est indépendante (mêmes dés physiques parfois réutilisés
// d'une ligne à l'autre, ex. un 1 compté à la fois dans une suite courte
// ET dans sa propre ligne "un seul 1") puisque le joueur n'en choisit
// jamais qu'UNE SEULE à la fois (ou compose lui-même en cliquant les dés).
// Triée par points décroissants — la ligne [0] est donc "la combinaison
// valide offrant le plus de points" pour ce lancer, utilisée comme
// suggestion pré-sélectionnée par défaut (voir TenkGame.js).
export function listScoringGroups(values) {
  if (!values || !values.length) return [];
  const rows = [];

  if (values.length === 6 && isStraight(values)) {
    rows.push({ key: "straight6", points: 1500, kind: "straight", diceValues: values.slice().sort((a, b) => a - b), indices: values.map((_, i) => i) });
  }
  if (values.length === 6 && isThreePairs(values)) {
    const c = counts(values);
    const pairValues = Object.keys(c).map(Number).sort((a, b) => a - b);
    rows.push({ key: "threePairs", points: 750, kind: "threePairs", diceValues: pairValues, indices: values.map((_, i) => i) });
  }
  for (const pattern of SMALL_STRAIGHTS) {
    const idxs = findPatternIndices(values, pattern);
    if (idxs) rows.push({ key: "small" + pattern.join(""), points: 1500, kind: "smallStraight", diceValues: pattern, indices: idxs });
  }

  // Correctif "panneau incomplet" 2026-07 : avant, une seule ligne par
  // valeur, avec TOUS les dés de cette valeur (ex. deux 1 -> seulement
  // "1-1 +200", jamais "1 +100") — le joueur ne pouvait pas cliquer toutes
  // les sélections pourtant valides. Désormais on liste TOUS les
  // sous-effectifs sélectionnables d'une valeur : chaque compte k (de 1 à n
  // pour les 1 et les 5, de 3 à n pour les 2/3/4/6) qui rapporte des points
  // a sa propre ligne (les k premiers dés de la valeur).
  const c = counts(values);
  const allScoringIdxs = [];
  let allScoringPts = 0;
  for (const [vStr, n] of Object.entries(c)) {
    const v = Number(vStr);
    const idxsOfV = values.map((val, i) => (val === v ? i : -1)).filter((i) => i !== -1);
    for (let k = 1; k <= n; k++) {
      const pts = groupScore(v, k);
      if (pts > 0) rows.push({ key: "group" + v + "x" + k, points: pts, kind: "group", diceValues: Array(k).fill(v), indices: idxsOfV.slice(0, k) });
    }
    // Contribution de la valeur à la ligne "tous les dés qui comptent" :
    // l'effectif COMPLET s'il rapporte (union toujours valide, chaque
    // groupe scorant indépendamment — voir evaluateSelection, shape atomic).
    const full = groupScore(v, n);
    if (full > 0) { allScoringIdxs.push(...idxsOfV); allScoringPts += full; }
  }

  // Ligne combinée "tous les dés qui comptent" (ex. brelan de 3 + un 5 =
  // 3-3-3-5 +350) : c'est la meilleure sélection ATOMIQUE possible — ajoutée
  // seulement si elle réunit plusieurs groupes (sinon elle doublonnerait la
  // ligne du groupe unique). Triée avec les autres : quand elle domine, elle
  // devient rows[0], donc la présélection par défaut ET l'auto-garde du
  // minuteur (TenkGame.js) — conformément à l'intention d'origine ("la ligne
  // [0] est la combinaison valide offrant le plus de points").
  const scoringValues = Object.entries(c).filter(([vStr, n]) => groupScore(Number(vStr), n) > 0);
  if (scoringValues.length > 1) {
    const diceVals = allScoringIdxs.map((i) => values[i]).sort((a, b) => a - b);
    rows.push({ key: "all", points: allScoringPts, kind: "all", diceValues: diceVals, indices: allScoringIdxs });
  }

  rows.sort((a, b) => b.points - a.points);
  return rows;
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
  if (isSmallStraight(values)) return { valid: true, points: 1500, shape: "smallStraight" };

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
// première mise de côté dans le tour) est évalué exactement pareil — les
// règles de suite (complète, courte) et de trois paires ne s'appliquent
// qu'à un groupe d'exactement 6 ou 5 dés selon le cas (voir ci-dessus).
export function isFarkle(values) {
  if (!values || values.length === 0) return false;
  if (values.length === 6 && (isStraight(values) || isThreePairs(values))) return false;
  if (hasSmallStraightSubset(values)) return false;
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
  if (hasSmallStraightSubset(values)) return 1500;
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
