// ==========================================================================
// Chromatik — logique pure du paquet de cartes (couleurs, génération,
// mélange, règle de jeu valide). Aucune dépendance React ici : testable et
// réutilisable telle quelle côté hôte (arbitre) comme côté simple lecture.
// ==========================================================================
export const COLORS = ["red", "green", "blue", "yellow"];
export const COLOR_VARS = { red: "--p1", green: "--p3", blue: "--ludoB", yellow: "--ludoY" };

// Paquet complet : par couleur, un 0, deux exemplaires de 1 à 9, deux
// "passe", deux "inverse", deux "+2". Plus 4 jokers (couleur au choix) et
// 4 jokers "+4" (couleur au choix). Un identifiant unique par carte.
export function freshDeck() {
  const cards = [];
  let uid = 0;
  for (const color of COLORS) {
    cards.push({ id: "c" + uid++, color, kind: "number", value: 0 });
    for (let v = 1; v <= 9; v++) {
      cards.push({ id: "c" + uid++, color, kind: "number", value: v });
      cards.push({ id: "c" + uid++, color, kind: "number", value: v });
    }
    for (const kind of ["skip", "reverse", "draw2"]) {
      cards.push({ id: "c" + uid++, color, kind });
      cards.push({ id: "c" + uid++, color, kind });
    }
  }
  for (let i = 0; i < 4; i++) cards.push({ id: "c" + uid++, color: null, kind: "wild" });
  for (let i = 0; i < 4; i++) cards.push({ id: "c" + uid++, color: null, kind: "wild4" });
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

// Pioche `n` cartes depuis `deck` ; si la pioche est trop courte, remélange
// toute la défausse (sauf la carte du dessus, qui reste en jeu) pour en
// faire une nouvelle pioche. Renvoie { cards, deck, discard } — jamais de
// mutation des tableaux d'origine.
export function drawCards(deck, discard, n) {
  let d = deck.slice();
  let disc = discard.slice();
  const drawn = [];
  for (let i = 0; i < n; i++) {
    if (d.length === 0) {
      if (disc.length <= 1) break; // plus rien à remélanger, la pioche reste courte
      const top = disc[disc.length - 1];
      d = shuffle(disc.slice(0, -1));
      disc = [top];
    }
    drawn.push(d.pop());
  }
  return { cards: drawn, deck: d, discard: disc };
}

export function nextSeatIdx(idx, direction, len) {
  return (idx + direction + len) % len;
}

// Une carte peut-elle être jouée, sachant la couleur actuellement en
// vigueur (celle du dessus de la défausse, ou choisie après un joker) et
// la nature de la carte au sommet de la défausse (pour l'accord de
// symbole : passe sur passe, +2 sur +2, même chiffre sur même chiffre) ?
export function canPlay(card, topCard, activeColor) {
  if (card.kind === "wild" || card.kind === "wild4") return true;
  if (card.color === activeColor) return true;
  if (card.kind === "number" && topCard.kind === "number" && card.value === topCard.value) return true;
  if (card.kind !== "number" && card.kind === topCard.kind) return true;
  return false;
}

// A-t-on au moins une carte jouable dans la main donnée ?
export function hasPlayable(hand, topCard, activeColor) {
  return hand.some(c => canPlay(c, topCard, activeColor));
}

// Choix de couleur le plus utile pour un joker : celle que l'on a le plus
// en main (heuristique simple, aussi bien pour les bots que comme
// suggestion par défaut).
export function bestColorFor(hand) {
  const counts = { red: 0, green: 0, blue: 0, yellow: 0 };
  hand.forEach(c => { if (c.color) counts[c.color]++; });
  let best = COLORS[0];
  for (const c of COLORS) if (counts[c] > counts[best]) best = c;
  return best;
}
