// Moteur d'échecs 100% JS, autonome (aucune dépendance nouvelle, aucun WASM,
// aucun en-tête COOP/COEP). Il s'appuie sur chess.js — DÉJÀ présent — comme
// générateur de coups légaux : on ne réécrit aucune règle. Recherche
// negamax + élagage alpha-beta + quiescence (captures) + tri des coups
// (MVV-LVA) + approfondissement itératif borné en temps. Tourne côté hôte
// (autorité), dans le thread principal, appelé après un court délai pour que
// l'indicateur "réfléchit" s'affiche d'abord.
//
// ⚠️ Audit 2026-09-24 : il tourne désormais dans un WORKER
// (engine.worker.js) — sur le fil principal, chaque coup de l'ordinateur
// gelait la page de l'hôte 0,5 à 1 s (plateau, pendules, glisser-déposer).
// Le fil principal ne le rappelle plus qu'en secours, si le worker échoue.
// Toute date passe par `now` (Date.now par défaut) pour qu'un banc puisse
// couper la recherche à un instant choisi (tools/verify-echecs.mjs).
import { Chess } from "chess.js";

const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const MATE = 100000;

// Tables position-pièce (Michniewski, "simplified evaluation"), orientées
// rangée 8 (haut) -> rangée 1 (bas), du point de vue des BLANCS. Une pièce
// noire lit la table en miroir vertical (voir pstValue).
const PST = {
  p: [
      0,  0,  0,  0,  0,  0,  0,  0,
     50, 50, 50, 50, 50, 50, 50, 50,
     10, 10, 20, 30, 30, 20, 10, 10,
      5,  5, 10, 25, 25, 10,  5,  5,
      0,  0,  0, 20, 20,  0,  0,  0,
      5, -5,-10,  0,  0,-10, -5,  5,
      5, 10, 10,-20,-20, 10, 10,  5,
      0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
      0,  0,  0,  0,  0,  0,  0,  0,
      5, 10, 10, 10, 10, 10, 10,  5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
      0,  0,  0,  5,  5,  0,  0,  0,
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  // Roi en milieu de partie : reste à l'abri, pénalise le centre.
  k: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
  ],
};

function pstValue(type, color, r, c) {
  // r: 0 = rangée 8 (haut), 7 = rangée 1 (bas), tel que renvoyé par board().
  const idx = color === "w" ? r * 8 + c : (7 - r) * 8 + c;
  return PST[type][idx];
}

// Évaluation statique, DU POINT DE VUE DES BLANCS (positif = Blancs mieux).
// Matériel + placement (PST). Suffisant et rapide pour un bot "fort mais
// battable" en contexte party game.
function evaluate(game) {
  const board = game.board();
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      const base = VAL[cell.type] + pstValue(cell.type, cell.color, r, c);
      score += cell.color === "w" ? base : -base;
    }
  }
  return score;
}

// Tri des coups : captures d'abord (MVV-LVA), puis promotions, pour un
// élagage alpha-beta efficace.
function scoreMove(m) {
  let s = 0;
  if (m.captured) s += 10 * VAL[m.captured] - VAL[m.piece];
  if (m.promotion) s += VAL[m.promotion];
  return s;
}
function orderedMoves(game, capturesOnly) {
  let ms = game.moves({ verbose: true });
  if (capturesOnly) ms = ms.filter(m => m.captured || m.promotion);
  ms.sort((a, b) => scoreMove(b) - scoreMove(a));
  return ms;
}

// Recherche de quiescence : ne s'arrête que sur une position "calme" (plus de
// capture avantageuse), pour éviter l'effet d'horizon (croire gagner une
// pièce juste avant de la reperdre).
function quiesce(game, alpha, beta, deadline, now) {
  const standPat = signed(game) ;
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;
  if (now() > deadline) return alpha;
  const caps = orderedMoves(game, true);
  for (const m of caps) {
    game.move(m);
    const sc = -quiesce(game, -beta, -alpha, deadline, now);
    game.undo();
    if (sc >= beta) return beta;
    if (sc > alpha) alpha = sc;
  }
  return alpha;
}

// Évaluation signée du point de vue du camp au trait (pour le negamax).
function signed(game) {
  const e = evaluate(game);
  return game.turn() === "w" ? e : -e;
}

export function negamax(game, depth, alpha, beta, deadline, now = Date.now) {
  if (game.isCheckmate()) return -MATE + (50 - depth); // mat proche = mieux
  if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition?.()) return 0;
  if (depth === 0) return quiesce(game, alpha, beta, deadline, now);
  if (now() > deadline) return signed(game);
  const moves = orderedMoves(game, false);
  let best = -Infinity;
  for (const m of moves) {
    game.move(m);
    const sc = -negamax(game, depth - 1, -beta, -alpha, deadline, now);
    game.undo();
    if (sc > best) best = sc;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // coupure
  }
  return best;
}

// Une itération à la racine, à profondeur fixe.
// ⚠️ Audit 2026-09-24 — LE DÉFAUT QUE CETTE FONCTION CORRIGE, MESURÉ : quand
// l'échéance tombait PENDANT la recherche d'un coup, negamax rendait des
// évaluations statiques à la volée (« if (now() > deadline) return
// signed(game) »), et ce score tronqué était comparé aux scores COMPLETS des
// coups précédents — il pouvait gagner, donc l'ordinateur jouait un coup
// choisi sur une recherche coupée. Sonde de l'audit : dans 2 positions de
// milieu de partie sur 40, le coup retenu REMPLAÇAIT le meilleur coup déjà
// établi par un coup à la recherche coupée. Désormais un coup dont la
// recherche a dépassé l'échéance n'est JAMAIS comparé : l'itération s'arrête
// et ne rend que le meilleur des coups entièrement cherchés.
export function searchRoot(game, rootMoves, depth, deadline, now = Date.now) {
  let alpha = -Infinity;
  const beta = Infinity;
  let best = null, score = -Infinity, complete = true, searched = 0;
  for (const m of rootMoves) {
    game.move(m);
    const sc = -negamax(game, depth - 1, -beta, -alpha, deadline, now);
    game.undo();
    if (now() > deadline) { complete = false; break; } // score non fiable : jamais retenu
    searched++;
    if (sc > score) { score = sc; best = m; }
    if (sc > alpha) alpha = sc;
  }
  // `searched` = nombre de coups racine ENTIÈREMENT cherchés (le banc s'en
  // sert pour prouver que le coup rendu est l'un d'eux).
  return { best, score, complete, searched };
}

// Choisit le meilleur coup pour le camp au trait dans le FEN donné.
// Approfondissement itératif borné par timeMs. Renvoie { from, to, promotion }
// ou null si aucun coup légal (mat/pat).
export function chooseBotMove(fen, opts = {}) {
  const timeMs = opts.timeMs ?? 1000;
  const maxDepth = opts.maxDepth ?? 4;
  const now = opts.now || Date.now;
  const game = new Chess(fen);
  const rootMoves = orderedMoves(game, false);
  if (rootMoves.length === 0) return null;
  const deadline = now() + timeMs;
  let best = rootMoves[0];

  for (let depth = 1; depth <= maxDepth; depth++) {
    const r = searchRoot(game, rootMoves, depth, deadline, now);
    // Une itération interrompue ne rend que des coups ENTIÈREMENT cherchés ;
    // comme le meilleur coup précédent est cherché en premier, son résultat
    // vaut au moins celui de l'itération d'avant.
    if (r.best) {
      best = r.best;
      rootMoves.sort((a, b) => (a === r.best ? -1 : b === r.best ? 1 : 0));
    }
    if (!r.complete) break;
    if (r.score >= MATE - 100) break; // mat trouvé, inutile de creuser
  }
  return { from: best.from, to: best.to, promotion: best.promotion || undefined };
}
