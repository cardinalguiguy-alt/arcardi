import { canPlay, bestColorFor, canStackOn } from "./deck";

// ==========================================================================
// Décision d'un bot pour son tour. Renvoie soit { type:"play", cardId,
// chosenColor? } soit { type:"draw" }. Heuristique volontairement simple et
// lisible : joue une carte valide dès qu'il en a une (en gardant les jokers
// pour la fin si un autre choix existe), sinon pioche.
//
// `pending` (optionnel) = pendingDraw de l'état de partie ({kind, count,
// seatId}) quand le bot est le siège qui DOIT répondre à une pile de pioche
// en attente (voir canStackOn dans deck.js) : dans ce cas le bot ne
// considère QUE les cartes qui contrent légalement — jamais de jeu normal
// tant que la pile n'est pas résolue. Un bot contre systématiquement s'il
// le peut (jamais de "sacrifice volontaire" — ce n'est pas plus malin de
// piocher quand une contre-carte est disponible).
// ==========================================================================
export function decideBotMove(hand, topCard, activeColor, pending) {
  if (pending) {
    const counters = hand.filter(c => canStackOn(c, pending.kind));
    if (counters.length === 0) return { type: "draw" };
    const chosen = counters[0];
    if (chosen.kind === "wild4") {
      const remaining = hand.filter(c => c.id !== chosen.id);
      const chosenColor = bestColorFor(remaining.length > 0 ? remaining : hand);
      return { type: "play", cardId: chosen.id, chosenColor };
    }
    return { type: "play", cardId: chosen.id };
  }

  const playable = hand.filter(c => canPlay(c, topCard, activeColor));
  if (playable.length === 0) return { type: "draw" };

  // Préfère une carte non-joker si possible : garder les jokers en réserve.
  const nonWild = playable.filter(c => c.kind !== "wild" && c.kind !== "wild4");
  const chosen = (nonWild.length > 0 ? nonWild : playable)[0];

  const needsColor = chosen.kind === "wild" || chosen.kind === "wild4";
  if (!needsColor) return { type: "play", cardId: chosen.id };

  // Pour un joker, choisit la couleur la plus présente dans le reste de sa main.
  const remaining = hand.filter(c => c.id !== chosen.id);
  const chosenColor = bestColorFor(remaining.length > 0 ? remaining : hand);
  return { type: "play", cardId: chosen.id, chosenColor };
}

// ==========================================================================
// Suite après une PIOCHE VOLONTAIRE (jamais après une pile de pénalité
// +2/+4 en attente, qui ne rend jamais ses cartes immédiatement jouables —
// voir hostApplyMove dans ChromatikGame.js) : si la carte piochée est
// jouable, comportement par défaut demandé pour les bots — la jouer tout
// de suite plutôt que la garder en main sans raison.
// ==========================================================================
export function decideBotDrawFollowUp(drawnCard, topCard, activeColor, restOfHand) {
  if (!drawnCard || !canPlay(drawnCard, topCard, activeColor)) return { play: false };
  const needsColor = drawnCard.kind === "wild" || drawnCard.kind === "wild4";
  if (!needsColor) return { play: true };
  const chosenColor = bestColorFor(restOfHand.length > 0 ? restOfHand : [drawnCard]);
  return { play: true, chosenColor };
}
