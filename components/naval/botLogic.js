// ===== Bataille navale — cerveau du bot (solo contre l'ordinateur) =====
// Décide la case sur laquelle le bot tire, à partir de CE QU'IL OBSERVE :
// sa propre grille de tirs sur l'adversaire (touché/manqué) et les navires
// DÉJÀ COULÉS (information publique). Il ne lit JAMAIS la position des
// navires encore à flot : aucune triche possible.
//
// Heuristique classique "chasse / ciblage" :
//   - CIBLAGE : s'il existe un touché non encore rattaché à un navire coulé,
//     le bot vise autour (et prolonge un alignement de touchés, façon humain
//     qui a repéré l'axe du bateau).
//   - CHASSE : sinon il tire à l'aveugle. Aux niveaux élevés, sur les cases
//     d'une même parité (damier) — la plus petite pièce fait 2 cases, donc un
//     tir sur deux suffit à finir par toucher chaque navire, deux fois moins
//     de coups perdus.
//
// TROIS NIVEAUX (mêmes idées, réglés par NAVAL_BOT_PARAMS) :
//   - target     : proba d'exploiter un touché en cours (sinon coup à l'aveugle).
//   - parity      : chasse en damier (true) ou totalement au hasard (false).
//   - lineSmart   : prolonge l'axe d'un navire à partir de 2 touchés alignés.
//   - randomShot  : proba d'un coup 100 % au hasard (bourde de chasse).

import { N, FLEET, shipCells, isSunk } from "./navalEngine";

export const NAVAL_DIFFICULTIES = ["easy", "medium", "expert"];
export const NAVAL_DEFAULT_DIFFICULTY = "medium";

export const NAVAL_BOT_PARAMS = {
  // FACILE — abandonne souvent un navire pourtant touché (target bas), chasse
  // totalement au hasard, ne prolonge pas les alignements : très battable.
  easy:   { target: 0.35, parity: false, lineSmart: false, randomShot: 0.55 },
  // MOYEN — exploite les touchés, chasse en damier, prolonge les axes ; se
  // trompe de temps en temps (quelques coups à l'aveugle).
  medium: { target: 0.85, parity: true, lineSmart: true, randomShot: 0.22 },
  // EXPERT — cible toujours un navire entamé, prolonge parfaitement l'axe,
  // chasse en damier, aucun coup gâché.
  expert: { target: 1.0, parity: true, lineSmart: true, randomShot: 0.0 },
};

function inB(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }

// Ensemble "r,c" des cases appartenant à un navire COULÉ (public).
function sunkCells(placements, shots) {
  const set = new Set();
  if (!placements) return set;
  for (const pl of placements) {
    if (isSunk(pl, shots)) for (const [r, c] of shipCells(pl.id, pl.r, pl.c, !!pl.horiz)) set.add(r + "," + c);
  }
  return set;
}

// Décide le tir du bot. Retourne [r, c] ou null s'il n'y a plus de case libre.
export function decideBotShot(placements, shots, { difficulty = NAVAL_DEFAULT_DIFFICULTY, rand = Math.random } = {}) {
  const P = NAVAL_BOT_PARAMS[difficulty] || NAVAL_BOT_PARAMS[NAVAL_DEFAULT_DIFFICULTY];
  const free = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!shots[r][c]) free.push([r, c]);
  if (!free.length) return null;

  const sunk = sunkCells(placements, shots);
  const activeHits = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (shots[r][c] === "hit" && !sunk.has(r + "," + c)) activeHits.push([r, c]);
  }

  // ----- CIBLAGE -----
  if (activeHits.length && rand() < P.target) {
    // 1) prolonger un alignement de deux touchés voisins (axe du navire).
    if (P.lineSmart) {
      const hitSet = new Set(activeHits.map(([r, c]) => r + "," + c));
      const ends = [];
      for (const [r, c] of activeHits) {
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          if (hitSet.has((r + dr) + "," + (c + dc))) {
            // axe (dr,dc) : les deux extrémités à sonder
            let a = [r - dr, c - dc];
            while (inB(a[0], a[1]) && shots[a[0]][a[1]] === "hit") a = [a[0] - dr, a[1] - dc];
            let b = [r + dr, c + dc];
            while (inB(b[0], b[1]) && shots[b[0]][b[1]] === "hit") b = [b[0] + dr, b[1] + dc];
            if (inB(a[0], a[1]) && !shots[a[0]][a[1]]) ends.push(a);
            if (inB(b[0], b[1]) && !shots[b[0]][b[1]]) ends.push(b);
          }
        }
      }
      if (ends.length) return ends[Math.floor(rand() * ends.length)];
    }
    // 2) sinon, une case libre voisine (orthogonale) d'un touché actif.
    const cand = [];
    for (const [r, c] of activeHits) {
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const rr = r + dr, cc = c + dc;
        if (inB(rr, cc) && !shots[rr][cc]) cand.push([rr, cc]);
      }
    }
    if (cand.length) return cand[Math.floor(rand() * cand.length)];
  }

  // ----- CHASSE -----
  if (P.parity && rand() >= P.randomShot) {
    const parityCells = free.filter(([r, c]) => (r + c) % 2 === 0);
    const pool = parityCells.length ? parityCells : free;
    return pool[Math.floor(rand() * pool.length)];
  }
  return free[Math.floor(rand() * free.length)];
}
