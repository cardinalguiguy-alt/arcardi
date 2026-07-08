"use client";

/* ==========================================================================
   PRÉSIDENT — paquet de 52 cartes et règles PURES (aucun React, aucun
   réseau). Tout ce qui décide de la légalité d'un coup vit ici, pour être
   partagé entre l'arbitre (hôte), l'interface (griser les cartes) et les
   bots — et pour être testable en Node par simulation massive, comme
   deck.js l'est pour Chromatik.

   Règles retenues (variante la plus répandue en ligne, type CardGames.io /
   règle française classique) :
   - ordre des forces : 3 < 4 < … < 10 < V < D < R < As < 2 (le 2 est la
     carte la plus forte) ;
   - le meneur ouvre le pli avec 1, 2, 3 ou 4 cartes DE MÊME VALEUR ;
   - pour suivre, il faut poser LE MÊME NOMBRE de cartes, de valeur
     supérieure ou égale — sinon on passe ;
   - passer = passer pour TOUT le pli (on ne peut plus y revenir) ;
   - quand tous les autres ont passé, celui qui a posé en dernier ramasse
     le pli et rouvre ;
   - le(s) 2 brûle(nt) le pli immédiatement : pile nettoyée, la même
     personne rouvre ;
   - premier à vider sa main = Président, dernier = Trou. Pas d'échange de
     cartes entre manches ni de révolution dans cette v1 (volontairement).
   ========================================================================== */

export const RANKS = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"];
export const TWO_V = RANKS.length - 1; // valeur du 2 (la plus forte)

export const SUITS = [
  { id: "s", sym: "♠", red: false },
  { id: "h", sym: "♥", red: true },
  { id: "d", sym: "♦", red: true },
  { id: "c", sym: "♣", red: false },
];

export function freshDeck52() {
  const deck = [];
  RANKS.forEach((rank, v) => {
    SUITS.forEach(suit => {
      deck.push({ id: rank + suit.id, rank, v, suit: suit.id });
    });
  });
  return deck;
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Distribution intégrale du paquet, une carte à la fois (à 3 joueurs,
// certains reçoivent donc une carte de plus — c'est la règle standard).
export function dealAll(seats) {
  const deck = shuffle(freshDeck52());
  const hands = {};
  seats.forEach(s => { hands[s.id] = []; });
  deck.forEach((card, i) => { hands[seats[i % seats.length].id].push(card); });
  seats.forEach(s => { hands[s.id].sort((a, b) => a.v - b.v || a.suit.localeCompare(b.suit)); });
  return hands;
}

// À la toute première manche d'un match (aucun Président encore désigné),
// c'est traditionnellement le porteur du 3♠ (la carte la plus basse) qui
// ouvre — pas un siège arbitraire. Renvoie l'index du siège concerné.
export function findLowestCardSeatIdx(seats, hands) {
  for (let i = 0; i < seats.length; i++) {
    if ((hands[seats[i].id] || []).some(c => c.id === "3s")) return i;
  }
  return 0; // filet de sécurité (ne devrait jamais arriver, le 3♠ existe toujours)
}

// Regroupe une main par valeur : Map v -> cartes (triées).
export function groupByRank(hand) {
  const m = new Map();
  hand.forEach(c => {
    if (!m.has(c.v)) m.set(c.v, []);
    m.get(c.v).push(c);
  });
  return m;
}

// Tri canonique d'une main (valeur croissante, enseigne en tie-break) —
// utilisé après toute insertion de cartes (échange entre manches) pour que
// l'affichage reste rangé, comme après la distribution initiale.
export function sortHand(hand) {
  return hand.slice().sort((a, b) => a.v - b.v || a.suit.localeCompare(b.suit));
}

// Sépare une main en { taken, rest } : les `n` MEILLEURES cartes (valeur la
// plus haute) d'un côté, le reste de l'autre. Utilisé pour le don forcé du
// Trou/Vice-Trou au début de chaque manche (hors la toute première).
export function takeBest(hand, n) {
  const sorted = hand.slice().sort((a, b) => b.v - a.v || a.suit.localeCompare(b.suit));
  return { taken: sorted.slice(0, n), rest: sorted.slice(n) };
}

// Les `n` PIRES cartes (valeur la plus basse) — utilisé par les bots quand
// ils doivent rendre des cartes (le jeu autorise n'importe quel choix, mais
// rendre ses pires cartes est le choix par défaut le plus sensé).
export function takeWorst(hand, n) {
  const sorted = hand.slice().sort((a, b) => a.v - b.v || a.suit.localeCompare(b.suit));
  return { taken: sorted.slice(0, n), rest: sorted.slice(n) };
}

// Un jeu de cartes est-il posable ? `cards` = cartes proposées,
// `current` = combinaison à battre ({ count, v }) ou null si pli libre.
export function isLegalPlay(cards, current) {
  if (!cards || cards.length < 1 || cards.length > 4) return false;
  const v = cards[0].v;
  if (!cards.every(c => c.v === v)) return false; // même valeur obligatoire
  if (!current) return true;                       // pli libre : tout est permis
  if (cards.length !== current.count) return false; // même nombre de cartes
  return v >= current.v;                            // supérieure ou égale
}

// Le joueur a-t-il AU MOINS un coup légal face à `current` ?
export function hasLegalPlay(hand, current) {
  if (!current) return hand.length > 0;
  for (const [v, cards] of groupByRank(hand)) {
    if (v >= current.v && cards.length >= current.count) return true;
  }
  return false;
}

// Points de fin de manche selon le rang de sortie (index dans finishedOrder).
export function pointsForPlace(place, nSeats) {
  const TABLE = { 2: [5, 0], 3: [5, 3, 0], 4: [5, 3, 1, 0] };
  return (TABLE[nSeats] || TABLE[4])[place] ?? 0;
}

/* ==========================================================================
   ÉCHANGE DE CARTES ENTRE MANCHES (règle officielle, vérifiée : Wikipedia
   "President (card game)", pagat.com/climbing/president.html, et sources
   concordantes) :
   - le Trou (dernier) donne ses 2 MEILLEURES cartes au Président (premier),
     qui rend 2 cartes de son choix (n'importe lesquelles, pas forcément
     ses pires — mais c'est l'usage le plus courant) ;
   - à 4 joueurs, le Vice-Trou et le Vice-Président font de même avec 1
     seule carte chacun ;
   - à 3 joueurs, SEUL le duo Président/Trou échange — le joueur du milieu
     ("Neutre") n'est pas concerné ;
   - à 2 joueurs, il n'y a que Président/Trou, donc 2 cartes.
   - à la toute première manche d'un match (aucun classement précédent),
     il n'y a AUCUN échange : tout le monde part à égalité.
   ========================================================================== */
export function exchangeRoles(prevFinishedOrder, nSeats) {
  if (!prevFinishedOrder || prevFinishedOrder.length !== nSeats) return [];
  const president = prevFinishedOrder[0];
  const scum = prevFinishedOrder[nSeats - 1];
  const roles = [{ giver: scum, receiver: president, count: 2, key: "top" }];
  if (nSeats >= 4) {
    const vp = prevFinishedOrder[1];
    const vscum = prevFinishedOrder[nSeats - 2];
    roles.push({ giver: vscum, receiver: vp, count: 1, key: "vp" });
  }
  return roles;
}

