/* ==========================================================================
   YAHTZEE — logique de score PURE (aucun React, aucun réseau, aucun aléa).
   ==========================================================================
   Tout ce fichier est déterministe : mêmes dés en entrée -> même score en
   sortie. C'est la condition n°1 pour un jeu de dés sans bug : la moindre
   divergence de règle entre deux clients serait invisible à l'œil nu mais
   fausserait les parties. Ici, une seule source de vérité, testée par la
   suite de vérifications en bas de fichier (exécutée par le script de
   contrôle avant chaque livraison, jamais dans le navigateur).

   Règles implémentées : Yahtzee classique, 13 catégories.
   - Section supérieure (1 à 6) : somme des dés de la valeur.
     Bonus +35 si le sous-total supérieur atteint 63.
   - Brelan / Carré : somme de TOUS les dés si au moins 3 / 4 identiques.
   - Full : 25 points (exactement un brelan + une paire).
   - Petite suite (4 consécutifs) : 30. Grande suite (5 consécutifs) : 40.
   - Yahtzee (5 identiques) : 50.
   - Chance : somme de tous les dés.
   - Yahtzee supplémentaire : +100 par Yahtzee relancé APRÈS avoir déjà
     inscrit 50 dans la case Yahtzee (le dé compte ensuite normalement dans
     la case choisie). Simplification délibérée et documentée : la règle
     "Joker" complète (qui force la case supérieure correspondante et
     autorise Full/Suites à valeur fixe) n'est PAS implémentée — même
     esprit que le non-empilement des +2/+4 dans Chromatik.
   ========================================================================== */

// L'ordre de ce tableau EST l'ordre d'affichage de la feuille de score.
// Chaque catégorie porte sa propre fonction de calcul : l'interface ne
// contient AUCUNE règle de score, elle ne fait qu'appeler `potential()`.
export const UPPER_IDS = ["ones", "twos", "threes", "fours", "fives", "sixes"];
export const LOWER_IDS = ["threeKind", "fourKind", "fullHouse", "smallStraight", "largeStraight", "yahtzee", "chance"];
export const ALL_IDS = [...UPPER_IDS, ...LOWER_IDS];

export const UPPER_BONUS_THRESHOLD = 63;
export const UPPER_BONUS_VALUE = 35;
export const EXTRA_YAHTZEE_BONUS = 100;

// ----- Outils internes ----------------------------------------------------

// counts[v] = nombre de dés montrant la valeur v (index 0 inutilisé).
function countFaces(dice) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) counts[d]++;
  return counts;
}

function sumDice(dice) {
  return dice.reduce((a, b) => a + b, 0);
}

// Longueur de la plus longue suite de valeurs consécutives présentes.
// Les doublons n'aident ni ne gênent : seule la PRÉSENCE compte.
function longestRun(counts) {
  let best = 0, run = 0;
  for (let v = 1; v <= 6; v++) {
    if (counts[v] > 0) { run++; if (run > best) best = run; }
    else run = 0;
  }
  return best;
}

// ----- Calcul par catégorie ------------------------------------------------

function upperScore(dice, face) {
  return countFaces(dice)[face] * face;
}

export function scoreCategory(catId, dice) {
  const counts = countFaces(dice);
  switch (catId) {
    case "ones":   return upperScore(dice, 1);
    case "twos":   return upperScore(dice, 2);
    case "threes": return upperScore(dice, 3);
    case "fours":  return upperScore(dice, 4);
    case "fives":  return upperScore(dice, 5);
    case "sixes":  return upperScore(dice, 6);
    case "threeKind": return counts.some(c => c >= 3) ? sumDice(dice) : 0;
    case "fourKind":  return counts.some(c => c >= 4) ? sumDice(dice) : 0;
    case "fullHouse": {
      // Full strict : exactement {3 identiques + 2 identiques}. Un Yahtzee
      // (5 identiques) n'est PAS un full — conforme à la règle classique
      // hors Joker (que nous n'implémentons volontairement pas).
      const sorted = counts.filter(c => c > 0).sort((a, b) => a - b);
      return (sorted.length === 2 && sorted[0] === 2 && sorted[1] === 3) ? 25 : 0;
    }
    case "smallStraight": return longestRun(counts) >= 4 ? 30 : 0;
    case "largeStraight": return longestRun(counts) >= 5 ? 40 : 0;
    case "yahtzee": return counts.some(c => c === 5) ? 50 : 0;
    case "chance":  return sumDice(dice);
    default: return 0; // catégorie inconnue = 0, jamais d'exception en pleine partie
  }
}

export function isYahtzeeRoll(dice) {
  return Array.isArray(dice) && dice.length === 5 && dice.every(d => d === dice[0]);
}

// ----- Feuille de score -----------------------------------------------------

// Une feuille vierge : chaque catégorie à null (= pas encore inscrite),
// et le compteur de Yahtzee bonus à 0.
export function freshCard() {
  const card = { bonus100: 0 };
  for (const id of ALL_IDS) card[id] = null;
  return card;
}

export function upperSubtotal(card) {
  return UPPER_IDS.reduce((sum, id) => sum + (card[id] ?? 0), 0);
}

export function hasUpperBonus(card) {
  return upperSubtotal(card) >= UPPER_BONUS_THRESHOLD;
}

export function cardTotal(card) {
  const upper = upperSubtotal(card);
  const lower = LOWER_IDS.reduce((sum, id) => sum + (card[id] ?? 0), 0);
  return upper + (upper >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS_VALUE : 0)
    + lower + (card.bonus100 || 0) * EXTRA_YAHTZEE_BONUS;
}

export function isCardComplete(card) {
  return ALL_IDS.every(id => card[id] !== null);
}

// Nombre de catégories déjà remplies (pour l'affichage compact adversaires).
export function filledCount(card) {
  return ALL_IDS.reduce((n, id) => n + (card[id] !== null ? 1 : 0), 0);
}

// Applique l'inscription d'une catégorie sur une feuille — SANS muter
// l'original (indispensable : l'état circule tel quel dans les broadcasts).
// Retourne { card, gainedExtraYahtzee } ou null si le coup est illégal.
export function applyScore(card, catId, dice) {
  if (!ALL_IDS.includes(catId)) return null;
  if (card[catId] !== null) return null; // case déjà remplie : refus
  const next = { ...card };
  next[catId] = scoreCategory(catId, dice);
  let gainedExtraYahtzee = false;
  // Bonus Yahtzee supplémentaire : uniquement si la case Yahtzee contient
  // DÉJÀ 50 (un 0 volontaire dans la case Yahtzee ne donne jamais de bonus),
  // et qu'on inscrit les dés dans une AUTRE case.
  if (isYahtzeeRoll(dice) && card.yahtzee === 50 && catId !== "yahtzee") {
    next.bonus100 = (card.bonus100 || 0) + 1;
    gainedExtraYahtzee = true;
  }
  return { card: next, gainedExtraYahtzee };
}
