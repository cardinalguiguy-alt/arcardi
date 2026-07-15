/* ==========================================================================
   Notation des coups — Échecs (jeu n°17).

   chess.js produit le SAN en notation ANGLAISE (K/Q/R/B/N). Le site est
   bilingue : on affiche donc l'anglais tel quel, et on dérive le français
   (R/D/T/F/C) par simple transposition des lettres de PIÈCE. On ne réécrit
   AUCUNE règle ici : on part du `san` déjà calculé par chess.js (qui gère
   déjà la désambiguïsation "Cbd7", la prise "x", l'échec "+", le mat "#" et
   la promotion "=D"). Les lettres majuscules d'un SAN ne sont que : la pièce
   en tête, la lettre de promotion après "=", ou le roque "O-O"/"O-O-O". Les
   lettres de colonne (a-h) sont minuscules, jamais touchées.
   ========================================================================== */

// Anglais -> Français : Roi, Dame, Tour, Fou, Cavalier.
const PIECE_FR = { K: "R", Q: "D", R: "T", B: "F", N: "C" };

export function sanToFr(san) {
  if (!san) return san || "";
  // Roque : identique en français (O-O / O-O-O), on garde d'éventuels +/#.
  if (san[0] === "O") return san;
  let out = san;
  // Lettre de pièce en tête (sinon c'est un coup de pion, rien à traduire).
  if (PIECE_FR[out[0]]) out = PIECE_FR[out[0]] + out.slice(1);
  // Promotion "=Q" -> "=D", etc.
  out = out.replace(/=([KQRBN])/g, (_, p) => "=" + (PIECE_FR[p] || p));
  return out;
}

// Rend le SAN dans la langue courante du site.
export function sanForLang(san, lang) {
  return lang === "fr" ? sanToFr(san) : san;
}

// Valeur matérielle standard d'une pièce (pour l'avantage affiché).
export const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
