import { canPlay, bestColorFor } from "./deck";

// ==========================================================================
// Décision d'un bot pour son tour. Renvoie soit { type:"play", cardId,
// chosenColor? } soit { type:"draw" }. Heuristique volontairement simple et
// lisible : joue une carte valide dès qu'il en a une (en gardant les jokers
// pour la fin si un autre choix existe), sinon pioche.
// ==========================================================================
export function decideBotMove(hand, topCard, activeColor) {
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
