"use client";

/* ==========================================================================
   RAMI — logique pure (aucun React, aucun réseau). Toute la légalité vit ici
   pour être partagée entre l'arbitre (hôte), l'interface (griser/valider) et
   des tests Node par simulation. Même esprit que deck52.js (Président) et
   deck.js (Chromatik).

   Variante retenue (règle "jeux-gratuits" validée par Guillaume) :
   - combinaisons : brelan/carré (même valeur, enseignes différentes, 3-4
     cartes) OU suite (même enseigne, valeurs qui se suivent, 3+ cartes) ;
   - première pose : au moins 31 points de combinaisons posées d'un coup ;
   - une fois ouvert, on peut compléter les combinaisons déjà sur le tapis ;
   - joker : remplace n'importe quelle carte et en prend la VALEUR ; au plus
     UN joker par combinaison (décision Guillaume) ; un joker posé peut être
     repris en le remplaçant par la vraie carte, puis rejoué (décision
     Guillaume) ; en main en fin de manche il vaut 25 points de pénalité
     (décision Guillaume) ;
   - barème : As = 11 dans un brelan/carré d'As, 1 devant un 2 (A-2-3), 11
     après un Roi (D-R-A) ; figures (V,D,R) = 10 ; 2 à 10 = leur valeur ;
   - fin de manche : un joueur pose/défausse sa dernière carte. Les autres
     comptent les points restés en main (pénalité). Fin de PARTIE quand un
     joueur atteint le seuil réglé par l'hôte (51/101) ou manche unique ; le
     plus bas score l'emporte. Pas de "boucle" Roi-As-2 (standard).
   ========================================================================== */

export const SUITS = [
  { id: "s", sym: "♠", red: false },
  { id: "h", sym: "♥", red: true },
  { id: "d", sym: "♦", red: true },
  { id: "c", sym: "♣", red: false },
];
// Rang -> numéro de base (As = 1 par défaut, peut monter à 14 en fin de suite).
export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export function rankNum(rank) { return RANKS.indexOf(rank) + 1; } // A=1 ... K=13

export function isJoker(card) { return !!card && card.joker === true; }

// Valeur "barème" d'une carte NORMALE dans un contexte donné.
// asHigh : l'As compte-t-il pour 11 (brelan d'As, ou fin de suite D-R-A) ?
export function cardValue(card, asHigh) {
  if (isJoker(card)) return 0; // la valeur d'un joker dépend de la position (calculée ailleurs)
  if (card.rank === "A") return asHigh ? 11 : 1;
  if (card.rank === "J" || card.rank === "Q" || card.rank === "K") return 10;
  return rankNum(card.rank); // 2..10
}

// Valeur d'une position de suite (numéro 1..14) pour le décompte de points.
function posValue(pos) {
  if (pos === 1) return 1;    // As bas
  if (pos === 14) return 11;  // As haut
  if (pos >= 11 && pos <= 13) return 10; // V, D, R
  return pos; // 2..10
}

// ---------------------------------------------------------------------------
// Paquet : 2-4 joueurs = 54 cartes (52 + 2 jokers) ; 5-6 = 108 (2x52 + 4 jok).
// ---------------------------------------------------------------------------
export function freshRamiDeck(nSeats) {
  const nDecks = nSeats >= 5 ? 2 : 1;
  const cards = [];
  let uid = 0;
  for (let d = 0; d < nDecks; d++) {
    for (const rank of RANKS) {
      for (const suit of SUITS) {
        cards.push({ id: "r" + uid++, rank, suit: suit.id });
      }
    }
  }
  const nJokers = nDecks * 2;
  for (let j = 0; j < nJokers; j++) cards.push({ id: "j" + uid++, joker: true });
  return cards;
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const HAND_SIZE = 13;

// Distribue 13 cartes à chaque siège ; le reste forme le talon, la 1re carte
// retournée ouvre la défausse. Renvoie { hands, stock, discard }.
export function deal(seats) {
  const deck = shuffle(freshRamiDeck(seats.length));
  const hands = {};
  seats.forEach(s => { hands[s.id] = []; });
  let idx = 0;
  for (let n = 0; n < HAND_SIZE; n++) {
    for (const s of seats) { hands[s.id].push(deck[idx++]); }
  }
  const discard = [deck[idx++]];
  const stock = deck.slice(idx);
  seats.forEach(s => { hands[s.id] = sortHand(hands[s.id]); });
  return { hands, stock, discard };
}

// Tri d'affichage "par couleur" : par enseigne puis valeur, jokers à droite.
// Purement visuel (l'ordre réel dans l'état ne change pas ; les ids restent
// la référence pour jouer une carte).
export function sortHand(hand) {
  const order = { s: 0, h: 1, d: 2, c: 3 };
  return (hand || []).slice().sort((a, b) => {
    if (isJoker(a) && isJoker(b)) return 0;
    if (isJoker(a)) return 1;
    if (isJoker(b)) return -1;
    if (a.suit !== b.suit) return order[a.suit] - order[b.suit];
    return rankNum(a.rank) - rankNum(b.rank);
  });
}

// Tri d'affichage "ordre croissant" : par valeur d'abord (toutes enseignes
// mêlées), enseigne en tie-break, jokers à droite.
export function sortHandByRank(hand) {
  const order = { s: 0, h: 1, d: 2, c: 3 };
  return (hand || []).slice().sort((a, b) => {
    if (isJoker(a) && isJoker(b)) return 0;
    if (isJoker(a)) return 1;
    if (isJoker(b)) return -1;
    if (rankNum(a.rank) !== rankNum(b.rank)) return rankNum(a.rank) - rankNum(b.rank);
    return order[a.suit] - order[b.suit];
  });
}

// ---------------------------------------------------------------------------
// Validation d'une combinaison (brelan/carré OU suite). Renvoie
// { valid, type: "set"|"run"|null, points }. Au plus 1 joker.
// ---------------------------------------------------------------------------
export function validateCombination(cards) {
  if (!Array.isArray(cards) || cards.length < 3) return { valid: false, type: null, points: 0 };
  const jokers = cards.filter(isJoker);
  const normals = cards.filter(c => !isJoker(c));
  if (jokers.length > 1) return { valid: false, type: null, points: 0 };
  if (normals.length < 2) return { valid: false, type: null, points: 0 };

  const asSet = trySet(normals, jokers.length);
  if (asSet.valid) return asSet;
  const asRun = tryRun(normals, jokers.length);
  if (asRun.valid) return asRun;
  return { valid: false, type: null, points: 0 };
}

// Brelan / carré : même valeur, enseignes toutes différentes, 3 ou 4 cartes.
function trySet(normals, nJokers) {
  const total = normals.length + nJokers;
  if (total < 3 || total > 4) return { valid: false };
  const rank = normals[0].rank;
  if (!normals.every(c => c.rank === rank)) return { valid: false };
  const suits = normals.map(c => c.suit);
  if (new Set(suits).size !== suits.length) return { valid: false }; // pas deux fois la même enseigne
  const unit = rank === "A" ? 11 : (rank === "J" || rank === "Q" || rank === "K") ? 10 : rankNum(rank);
  return { valid: true, type: "set", points: unit * total };
}

// Suite : même enseigne, valeurs consécutives, sans doublon, 3+ cartes.
// Gère l'As bas (A-2-3) et l'As haut (D-R-A), pas de bouclage R-A-2.
function tryRun(normals, nJokers) {
  const suit = normals[0].suit;
  if (!normals.every(c => c.suit === suit)) return { valid: false };
  // Deux interprétations possibles si un As est présent : bas (1) ou haut (14).
  const hasAce = normals.some(c => c.rank === "A");
  const interpretations = [];
  const baseNums = normals.map(c => rankNum(c.rank)); // As = 1 ici
  interpretations.push(baseNums.slice());
  if (hasAce) {
    interpretations.push(baseNums.map(n => (n === 1 ? 14 : n)));
  }
  for (const nums of interpretations) {
    const res = runFromNums(nums, nJokers);
    if (res.valid) return res;
  }
  return { valid: false };
}

function runFromNums(nums, nJokers) {
  const sorted = nums.slice().sort((a, b) => a - b);
  // pas de doublon de valeur dans une suite
  for (let i = 1; i < sorted.length; i++) if (sorted[i] === sorted[i - 1]) return { valid: false };
  const min = sorted[0], max = sorted[sorted.length - 1];
  const span = max - min + 1;
  const gaps = span - sorted.length; // trous internes à combler
  if (gaps < 0) return { valid: false };
  if (gaps > nJokers) return { valid: false };
  const jokersLeft = nJokers - gaps;
  // Les jokers restants prolongent une extrémité (longueur = normals + jokers).
  const total = sorted.length + nJokers;
  if (total < 3) return { valid: false };
  // Fenêtre finale [lo..hi] : un joker d'extension prolonge d'abord vers le
  // HAUT (lecture intuitive : 5-6-7-joker se lit 5-6-7-8), puis vers le bas si
  // le haut est déjà à son maximum (As haut = 14).
  let lo = min, hi = max;
  let extend = jokersLeft;
  const up = Math.min(extend, 14 - hi); // ne pas dépasser 14 (As haut)
  hi += up; extend -= up;
  lo -= extend; // le reste descend
  if (lo < 1) return { valid: false }; // 1 = As bas minimum
  // Points : somme des valeurs de chaque position de lo..hi.
  let points = 0;
  for (let p = lo; p <= hi; p++) points += posValue(p);
  return { valid: true, type: "run", points };
}

// Points totaux d'un ensemble de combinaisons (pour le seuil d'ouverture).
export function combosPoints(combos) {
  return combos.reduce((sum, cards) => {
    const r = validateCombination(cards);
    return sum + (r.valid ? r.points : 0);
  }, 0);
}

// Toutes les combinaisons proposées sont-elles valides ?
export function allCombosValid(combos) {
  return combos.length > 0 && combos.every(cards => validateCombination(cards).valid);
}

export const OPEN_THRESHOLD = 31;

// Peut-on OUVRIR avec ces combinaisons (toutes valides et >= 31 pts) ?
export function canOpen(combos) {
  return allCombosValid(combos) && combosPoints(combos) >= OPEN_THRESHOLD;
}

// ---------------------------------------------------------------------------
// Complétion d'une combinaison déjà sur le tapis : la combinaison + la ou les
// cartes ajoutées forme-t-elle encore une combinaison valide DU MÊME TYPE ?
// ---------------------------------------------------------------------------
export function canAppend(meldCards, addedCards) {
  const before = validateCombination(meldCards);
  if (!before.valid) return { valid: false };
  const after = validateCombination(meldCards.concat(addedCards));
  if (!after.valid) return { valid: false };
  if (after.type !== before.type) return { valid: false };
  return { valid: true, type: after.type, points: after.points };
}

// ---------------------------------------------------------------------------
// Décompte de fin de manche : points restés en main (pénalité). Joker = 25.
// As = 11, figures = 10, 2..10 = valeur.
// ---------------------------------------------------------------------------
export function handPenalty(hand) {
  return (hand || []).reduce((sum, c) => {
    if (isJoker(c)) return sum + 25;
    if (c.rank === "A") return sum + 11;
    if (c.rank === "J" || c.rank === "Q" || c.rank === "K") return sum + 10;
    return sum + rankNum(c.rank);
  }, 0);
}

// Pioche depuis le talon ; si vide, remélange la défausse (sauf sa carte du
// dessus) pour reformer un talon. Renvoie { card, stock, discard } (card=null
// si vraiment plus rien).
export function drawFromStock(stock, discard) {
  let s = stock.slice(), d = discard.slice();
  if (s.length === 0) {
    if (d.length <= 1) return { card: null, stock: s, discard: d };
    const top = d[d.length - 1];
    s = shuffle(d.slice(0, -1));
    d = [top];
  }
  const card = s.pop();
  return { card, stock: s, discard: d };
}

// ---------------------------------------------------------------------------
// ASSISTANCE (2026-07, demande Guillaume) : détecte dans une MAIN les
// combinaisons complètes (brelan/carré/suite valides, jokers inclus) pour les
// surligner à l'écran. Purement INFORMATIF et LOCAL : ne joue rien, ne
// modifie rien — validateCombination reste l'unique oracle de validité (tout
// candidat généré ici lui est soumis avant d'être retenu).
// Renvoie une liste de groupes DISJOINTS (une carte n'appartient qu'à un
// seul groupe, pour un surlignage par couleur sans ambiguïté), choisis
// gloutonnement par points décroissants : [{ ids, type, points }].
// ---------------------------------------------------------------------------
export function detectHandCombos(hand) {
  const normals = (hand || []).filter(c => !isJoker(c));
  const jokers = (hand || []).filter(isJoker);
  const probe = jokers[0] || null; // joker "sonde" pour valider les candidats
  const candidates = []; // { cards (sans joker), needJoker }

  // --- Brelans / carrés : une carte par enseigne distincte d'une même valeur.
  const byRank = {};
  for (const c of normals) (byRank[c.rank] = byRank[c.rank] || []).push(c);
  for (const rank of Object.keys(byRank)) {
    const seen = new Set(), uniq = [];
    for (const c of byRank[rank]) if (!seen.has(c.suit)) { seen.add(c.suit); uniq.push(c); }
    if (uniq.length >= 3) candidates.push({ cards: uniq.slice(0, 4), needJoker: false });
    // Sous-ensembles de 3 d'un carré naturel : libèrent une carte qui peut
    // valoir plus dans une suite (la recherche exacte choisira).
    if (uniq.length === 4) {
      for (let skip = 0; skip < 4; skip++) candidates.push({ cards: uniq.filter((_, i) => i !== skip), needJoker: false });
    }
    if (uniq.length === 3 && probe) candidates.push({ cards: uniq.slice(), needJoker: true }); // carré via joker
    if (uniq.length === 2 && probe) candidates.push({ cards: uniq.slice(), needJoker: true }); // brelan via joker
  }

  // --- Suites : par enseigne, positions 1..14 (As bas ET haut).
  const bySuit = {};
  for (const c of normals) (bySuit[c.suit] = bySuit[c.suit] || []).push(c);
  for (const suit of Object.keys(bySuit)) {
    const byPos = {}; // position -> carte (une seule par position)
    for (const c of bySuit[suit]) {
      const n = rankNum(c.rank);
      if (!byPos[n]) byPos[n] = c;
      if (n === 1 && !byPos[14]) byPos[14] = c; // le même As peut servir haut OU bas (jamais les deux)
    }
    // Tronçons maximaux de positions consécutives présentes.
    const stretches = [];
    let cur = null;
    for (let p = 1; p <= 14; p++) {
      if (byPos[p]) { if (!cur) cur = { from: p, cards: [] }; cur.cards.push(byPos[p]); }
      else if (cur) { stretches.push(cur); cur = null; }
    }
    if (cur) stretches.push(cur);
    const pure = s => { // dédoublonne l'As présent à la fois en 1 et 14
      const ids = new Set(); return s.cards.filter(c => !ids.has(c.id) && ids.add(c.id));
    };
    for (let i = 0; i < stretches.length; i++) {
      const cards = pure(stretches[i]);
      // Toutes les sous-fenêtres contiguës de 3+ cartes (une suite plus
      // courte peut libérer des cartes plus utiles ailleurs — la recherche
      // exacte tranche), plus le tronçon complet avec joker en extension.
      for (let from = 0; from < cards.length; from++) {
        for (let to = from + 3; to <= cards.length; to++) {
          candidates.push({ cards: cards.slice(from, to), needJoker: false });
        }
      }
      if (cards.length >= 2 && probe) candidates.push({ cards, needJoker: true }); // extension/allongement par joker
      // Pontage par joker : tronçon suivant séparé d'exactement UNE position.
      if (probe && i + 1 < stretches.length) {
        const a = stretches[i], b = stretches[i + 1];
        if (b.from === a.from + a.cards.length + 1) {
          const merged = pure({ cards: a.cards.concat(b.cards) });
          if (merged.length + 1 >= 3) candidates.push({ cards: merged, needJoker: true });
        }
      }
    }
  }

  // --- Validation par l'oracle, puis choix EXACT du meilleur ensemble de
  // groupes DISJOINTS (branch and bound : les candidats sont peu nombreux
  // pour une main de 13-14 cartes ; le glouton, lui, ratait des cas — ex.
  // fusionner 9 + J-Q-K via joker au lieu de brelan de 9 + suite au joker).
  const scored = [];
  for (const cand of candidates) {
    const full = cand.needJoker ? cand.cards.concat([probe]) : cand.cards;
    const r = validateCombination(full);
    if (r.valid) scored.push({ ...cand, type: r.type, points: r.points });
  }
  scored.sort((a, b) => b.points - a.points || b.cards.length - a.cards.length);
  if (scored.length > 48) scored.length = 48; // garde-fou perf (jamais atteint en pratique)
  const suffixMax = new Array(scored.length + 1).fill(0); // borne haute restante
  for (let i = scored.length - 1; i >= 0; i--) suffixMax[i] = suffixMax[i + 1] + scored[i].points;
  let best = { total: -1, picks: [] };
  const usedIds = new Set();
  (function search(i, total, jokersLeft, picks) {
    if (total + suffixMax[i] <= best.total) return; // élagage
    if (i === scored.length) { if (total > best.total) best = { total, picks: picks.slice() }; return; }
    const s = scored[i];
    const usable = !s.cards.some(c => usedIds.has(c.id)) && (!s.needJoker || jokersLeft > 0);
    if (usable) {
      s.cards.forEach(c => usedIds.add(c.id));
      picks.push(i);
      search(i + 1, total + s.points, jokersLeft - (s.needJoker ? 1 : 0), picks);
      picks.pop();
      s.cards.forEach(c => usedIds.delete(c.id));
    }
    search(i + 1, total, jokersLeft, picks);
  })(0, 0, jokers.length, []);

  const freeJokers = jokers.slice();
  return best.picks.map(i => {
    const s = scored[i];
    const cards = s.needJoker ? s.cards.concat([freeJokers.pop()]) : s.cards;
    return { ids: cards.map(c => c.id), type: s.type, points: s.points };
  });
}

// Points ARCARDI de fin de MATCH selon le classement (score cumulé le plus
// bas). Même table que Président/Chromatik pour rester cohérent.
export function pointsForPlace(place, nSeats) {
  const TABLE = { 2: [5, 0], 3: [5, 3, 0], 4: [5, 3, 1, 0], 5: [5, 3, 1, 0, 0], 6: [5, 3, 1, 0, 0, 0] };
  return (TABLE[nSeats] || TABLE[4])[place] ?? 0;
}
