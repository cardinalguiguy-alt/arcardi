"use client";
import { groupByRank, isLegalPlay, TWO_V, takeWorst } from "./deck52";

/* ==========================================================================
   BOTS DU PRÉSIDENT — décisions heuristiques SENSÉES, jamais tirées au
   hasard, calculées uniquement côté hôte (même modèle que Chromatik).

   Principes (ceux d'un joueur humain correct) :
   1. Se débarrasser d'abord des cartes faibles, garder les fortes (As, 2)
      pour la fin de manche.
   2. Ne jamais casser une paire/brelan/carré pour répondre à une
      combinaison plus petite… sauf si la manche est presque finie ou si
      un adversaire est sur le point de sortir.
   3. À l'ouverture d'un pli : ouvrir bas, avec la multiplicité complète
      (poser la paire entière plutôt qu'une carte seule).
   4. Le 2 est une ressource : on ne le dépense que pour reprendre la main
      quand ça compte (main courte, ou adversaire à 1-2 cartes).

   Contrat : le coup renvoyé est TOUJOURS légal (revalidé par isLegalPlay
   avant d'être renvoyé, et l'arbitre revalide encore derrière).
   ========================================================================== */

// ctx : { othersMin } = plus petite main adverse encore en jeu (pression).
export function decideBotMove(hand, current, ctx = {}) {
  const othersMin = ctx.othersMin ?? 99;
  const pressure = othersMin <= 2 || hand.length <= 3; // fin de manche proche
  const groups = [...groupByRank(hand).entries()].sort((a, b) => a[0] - b[0]); // valeurs croissantes

  if (!current) {
    // ----- Ouverture de pli : la valeur la plus basse, multiplicité complète.
    // On évite d'ouvrir avec des 2 (gâchis) tant qu'on a autre chose.
    const nonTwos = groups.filter(([v]) => v !== TWO_V);
    const pick = (nonTwos.length ? nonTwos : groups)[0];
    const cards = pick[1].slice(); // tout le groupe : on dumpe la paire/le brelan entier
    return { type: "play", cardIds: cards.map(c => c.id) };
  }

  // ----- Suivre : candidats de valeur suffisante avec assez de cartes.
  const candidates = groups.filter(([v, cards]) => v >= current.v && cards.length >= current.count);
  if (!candidates.length) return { type: "pass" };

  // a) idéal : un groupe de taille EXACTE (ne casse rien), le plus bas
  //    possible, en épargnant les 2.
  const exact = candidates.filter(([v, cards]) => cards.length === current.count);
  const exactCheap = exact.filter(([v]) => v !== TWO_V);
  let chosen = (exactCheap.length ? exactCheap : null);

  // b) sinon : casser un groupe plus gros, seulement sous pression
  //    (autrement on passe et on garde nos munitions groupées).
  if (!chosen) {
    const breakable = candidates.filter(([v]) => v !== TWO_V);
    if (breakable.length && (pressure || hand.length <= current.count + 2)) chosen = breakable;
  }

  // c) le 2 en dernier recours : uniquement pour reprendre la main quand
  //    ça compte vraiment.
  if (!chosen) {
    const twos = candidates.filter(([v]) => v === TWO_V);
    if (twos.length && pressure) chosen = twos;
  }

  if (!chosen) return { type: "pass" };
  const [, cards] = chosen[0];
  const play = cards.slice(0, current.count);
  if (!isLegalPlay(play, current)) return { type: "pass" }; // ceinture + bretelles
  return { type: "play", cardIds: play.map(c => c.id) };
}

// ----- Échange entre manches -----
// Le Président/Vice-Président (bot) doit rendre `count` cartes de son
// choix au Trou/Vice-Trou. La règle autorise n'importe lesquelles ; un bot
// sensé rend ses PIRES cartes (il garde ses bonnes pour la manche à venir).
export function decideBotGiveback(hand, count) {
  const { taken } = takeWorst(hand, count);
  return taken.map(c => c.id);
}
