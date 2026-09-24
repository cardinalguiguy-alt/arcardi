/* ==========================================================================
   Règles pures des Échecs (jeu n°17) — audit 2026-09-24, lot 1.

   POURQUOI CE FICHIER : tout ce qui décide d'une issue (statut, nulle, temps
   écoulé, reprise de coup, matériel, pré-coups) vivait inline dans
   ChessGame.js, c'est-à-dire là où AUCUN banc ne peut l'appeler — et c'est là
   que dormaient quatre des défauts trouvés par l'audit (bot figé après une
   reprise, avantage qui ignorait les promotions, drapeau contre un roi seul,
   historique perdu au rechargement). Ici, `tools/verify-echecs.mjs` les joue.

   Aucune règle de déplacement n'est réécrite : chess.js reste le seul arbitre
   de la légalité. Ce fichier ne fait que LIRE ce que chess.js dit, et décider
   de ce que le jeu en fait.
   Aucun React, aucun DOM.
   ========================================================================== */
import { Chess } from "chess.js";

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export const FILES = "abcdefgh";
// "aborted" (2026-09-24) : partie annulée avant que chacun ait joué — ni
// vainqueur ni résultat enregistré, comme sur lichess.
export const TERMINAL = ["checkmate", "stalemate", "draw", "timeout", "resign", "aborted"];
export const isTerminal = (status) => TERMINAL.includes(status);
export const otherColor = (c) => (c === "w" ? "b" : "w");

const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// Statut après un coup, AVEC la raison d'une nulle (le joueur doit savoir
// pourquoi la partie s'arrête : « Partie nulle. » seul ne dit rien). L'ordre
// compte : chess.js range pat, matériel, répétition et 50 coups sous isDraw().
export function deriveStatus(game, moverColor) {
  if (game.isCheckmate()) return { status: "checkmate", winner: moverColor, reason: "checkmate" };
  if (game.isStalemate()) return { status: "stalemate", winner: null, reason: "stalemate" };
  if (game.isInsufficientMaterial()) return { status: "draw", winner: null, reason: "material" };
  if (game.isThreefoldRepetition()) return { status: "draw", winner: null, reason: "repetition" };
  if (game.isDrawByFiftyMoves()) return { status: "draw", winner: null, reason: "fifty" };
  if (game.isCheck()) return { status: "check", winner: null, reason: null };
  return { status: "playing", winner: null, reason: null };
}

// Le camp `color` n'a-t-il plus que son roi ?
export function hasOnlyKing(game, color) {
  for (const row of game.board()) for (const cell of row) {
    if (cell && cell.color === color && cell.type !== "k") return false;
  }
  return true;
}

// Drapeau tombé pour `flagged`. ⚠️ Audit 2026-09-24 : avant, c'était TOUJOURS
// une victoire de l'adversaire — même quand celui-ci n'avait plus que son roi,
// c'est-à-dire aucun moyen de mater. La règle (FIDE comme lichess) : si le
// vainqueur désigné ne peut mater par AUCUNE suite légale, c'est nulle. Le seul
// cas qui n'est pas déjà une nulle immédiate pour chess.js est le roi seul
// (roi + une pièce mineure contre roi SEUL est déjà `isInsufficientMaterial`,
// et roi + mineure contre roi + pions peut mater par une suite aidée).
export function timeoutOutcome(game, flagged) {
  const winner = otherColor(flagged);
  if (hasOnlyKing(game, winner)) return { status: "draw", winner: null, reason: "timeoutMaterial" };
  return { status: "timeout", winner, reason: "timeout" };
}

// Avantage matériel À LA LICHESS, lu sur le PLATEAU et plus sur la liste des
// prises. ⚠️ Audit 2026-09-24 : l'ancien calcul additionnait les pièces
// capturées, donc une promotion (un pion qui devient dame : +8) n'y comptait
// jamais. Ici, pour chaque type, on affiche la différence de nombre ; chaque
// camp montre les pièces ADVERSES qu'il a « en plus », et son score net.
export function materialDiff(fen) {
  const count = { w: { q: 0, r: 0, b: 0, n: 0, p: 0 }, b: { q: 0, r: 0, b: 0, n: 0, p: 0 } };
  const board = String(fen || START_FEN).split(" ")[0];
  for (const ch of board) {
    const t = ch.toLowerCase();
    if (!"qrbnp".includes(t) || ch === "/") continue;
    count[ch === t ? "b" : "w"][t]++;
  }
  const out = { w: { pieces: [], score: 0 }, b: { pieces: [], score: 0 } };
  let score = 0; // positif = Blancs devant
  for (const t of ["q", "r", "b", "n", "p"]) {
    const d = count.w[t] - count.b[t];
    score += d * VALUE[t];
    for (let i = 0; i < Math.abs(d); i++) (d > 0 ? out.w : out.b).pieces.push(t);
  }
  if (score > 0) out.w.score = score; else if (score < 0) out.b.score = -score;
  return out;
}

// Cases d'arrivée LÉGALES d'une pièce (dédoublonnées : une promotion produit
// quatre coups vers la même case).
export function legalDests(game, square) {
  let ms = [];
  try { ms = game.moves({ square, verbose: true }); } catch (e) { ms = []; }
  return [...new Set(ms.map((m) => m.to))];
}

// Pré-coup : destinations GÉOMÉTRIQUES, comme chessground (lichess). On ne
// connaît pas encore la réponse adverse, donc on ignore l'occupation des cases
// (une pièce qui barre aujourd'hui peut être prise tout à l'heure) — la
// légalité réelle est vérifiée au moment d'exécuter, et un pré-coup devenu
// illégal est simplement abandonné.
export function premoveDests(square, color, type) {
  const f = FILES.indexOf(square[0]), r = Number(square[1]) - 1;
  const out = [];
  const add = (df, dr) => {
    const nf = f + df, nr = r + dr;
    if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) out.push(FILES[nf] + (nr + 1));
  };
  const ray = (df, dr) => { for (let i = 1; i < 8; i++) add(df * i, dr * i); };
  if (type === "p") {
    const dir = color === "w" ? 1 : -1;
    add(0, dir);
    if (r === (color === "w" ? 1 : 6)) add(0, 2 * dir);
    add(-1, dir); add(1, dir);
  } else if (type === "n") {
    [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]].forEach(([a, b]) => add(a, b));
  } else if (type === "b" || type === "r" || type === "q") {
    if (type !== "r") { ray(1, 1); ray(1, -1); ray(-1, 1); ray(-1, -1); }
    if (type !== "b") { ray(1, 0); ray(-1, 0); ray(0, 1); ray(0, -1); }
  } else if (type === "k") {
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (a || b) add(a, b);
    const home = color === "w" ? "e1" : "e8";
    if (square === home) { add(2, 0); add(-2, 0); }
  }
  return out;
}

// Combien de demi-coups défaire pour rendre la main à `requester` en effaçant
// SON dernier coup. 0 = impossible (il n'a encore rien joué).
// ⚠️ Audit 2026-09-24, BUG REPRODUIT EN JEU : l'ancien calcul (« 2 si c'est
// déjà à lui de jouer, sinon 1 ») ne vérifiait pas qu'il y ait un coup à LUI
// à reprendre. Humain avec les Noirs, l'ordinateur ouvre, l'humain reprend :
// on défaisait l'unique coup — celui de l'ordinateur — et la main revenait à
// l'ordinateur, que personne ne relançait. Partie figée, pendule qui tourne.
export function takebackPlies(moveColors, turn, requester) {
  const n = moveColors.length;
  if (turn === requester) {
    // Dernier coup = adverse ; l'avant-dernier doit être le sien.
    return n >= 2 && moveColors[n - 2] === requester ? 2 : 0;
  }
  return n >= 1 && moveColors[n - 1] === requester ? 1 : 0;
}

// Rejoue une partie depuis la position de départ. Recharger un FEN efface
// l'historique de chess.js — et avec lui la détection de la TRIPLE
// RÉPÉTITION (défaut d'audit : après un rechargement de l'hôte, une position
// répétée trois fois n'était plus vue). Rejouer garde l'historique.
// Rend null si un coup ne passe pas (historique corrompu) : l'appelant retombe
// alors sur le FEN.
export function replayMoves(moves, startFen = START_FEN) {
  const g = new Chess(startFen);
  for (const m of moves || []) {
    let ok = false;
    try { g.move(m.san); ok = true; } catch (e) { /* SAN illisible, on tente from/to */ }
    if (!ok) {
      try { g.move({ from: m.from, to: m.to, promotion: m.promotion || undefined }); ok = true; } catch (e) { /* rien */ }
    }
    if (!ok) return null;
  }
  return g;
}

// Toutes les positions d'une partie (0 = départ), pour la navigation dans
// l'historique — pendant la partie comme après.
export function positionsOf(moves) {
  const g = new Chess();
  const fens = [START_FEN];
  for (const m of moves || []) {
    let ok = false;
    try { g.move(m.san); ok = true; } catch (e) { /* on tente from/to */ }
    if (!ok) { try { g.move({ from: m.from, to: m.to, promotion: m.promotion || undefined }); ok = true; } catch (e) { /* rien */ } }
    if (!ok) break;
    fens.push(g.fen());
  }
  return fens;
}

// Échiquier d'analyse : donner le trait à `color` pour jouer ses pièces même
// hors tour (comme lichess). On efface la prise en passant, qui n'a plus de
// sens hors de l'ordre des coups.
export function alignTurn(fen, color) {
  const parts = String(fen).split(" ");
  parts[1] = color;
  parts[3] = "-";
  return parts.join(" ");
}

// Case du roi du camp au trait s'il est en échec (sinon null).
export function checkSquare(game) {
  try {
    if (!game.isCheck()) return null;
    const sq = game.findPiece({ type: "k", color: game.turn() });
    return sq && sq[0] ? sq[0] : null;
  } catch (e) { return null; }
}

export function pgnResult(status, winner) {
  if (status === "stalemate" || status === "draw") return "1/2-1/2";
  if (status === "checkmate" || status === "timeout" || status === "resign") {
    return winner === "w" ? "1-0" : winner === "b" ? "0-1" : "*";
  }
  return "*";
}

export function buildPgn({ moves, whiteName, blackName, status, winner, date = new Date() }) {
  const dd = date.getFullYear() + "." + String(date.getMonth() + 1).padStart(2, "0") + "." + String(date.getDate()).padStart(2, "0");
  const res = pgnResult(status, winner);
  const head = [
    ["Event", "ARCARDI"], ["Site", "ARCARDI"], ["Date", dd],
    ["White", whiteName || "Blancs"], ["Black", blackName || "Noirs"],
    ["Result", res],
  ].map(([k, v]) => "[" + k + " \"" + String(v).replace(/"/g, "'") + "\"]").join("\n");
  let body = "";
  (moves || []).forEach((m, i) => {
    if (i % 2 === 0) body += (i / 2 + 1) + ". ";
    body += m.san + " ";
  });
  body += res;
  return head + "\n\n" + body.trim() + "\n";
}
