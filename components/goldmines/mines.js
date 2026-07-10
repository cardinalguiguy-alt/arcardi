// ==========================================================================
// Gold Mines — logique pure de la mine (grille, pépites, adjacences,
// révélation avec propagation des zéros, carré de dynamite). Aucune
// dépendance React : testable et réutilisable telle quelle côté hôte
// (arbitre) comme côté simple lecture — même philosophie que deck.js.
//
// Principe (démineur INVERSÉ en DUEL, refonte 2026-07) : les "mines" sont
// des PÉPITES D'OR qu'on VEUT trouver. Un coup de pioche révèle soit un
// chiffre (nombre de pépites dans les 8 cases voisines), soit une pépite,
// qui rapporte 1 or à son découvreur ET lui donne le droit de rejouer.
// LE PREMIER À 13 PÉPITES REMPORTE LA PARTIE.
//
// Dimensionnement (choisi par l'audit 2026-07) :
//   - 11×11 = 121 cases, 25 pépites (~21 % de densité, proche du démineur
//     expert : assez d'indices pour jouer "aux contraintes", assez de
//     hasard pour rester nerveux) ;
//   - 25 pépites et victoire à 13 : 13 est la majorité absolue de 25
//     (12 + 13 = 25), donc un vainqueur est GARANTI avant épuisement de la
//     mine — jamais de partie sans issue, jamais d'égalité.
//   - 1 DYNAMITE par joueur et par partie : remplace le coup de pioche,
//     révèle le carré 3×3 autour de la case visée (jamais de propagation
//     des zéros — sinon elle dégagerait la moitié du plateau), les pépites
//     du carré vont au dynamiteur, et s'il en trouve au moins une il
//     rejoue, comme pour une pioche.
// ==========================================================================

export const GM_ROWS = 11;
export const GM_COLS = 11;
export const GM_NUGGETS = 25;
export const GM_WIN_AT = 13;

export function idxOf(r, c) { return r * GM_COLS + c; }

export function neighborsOf(idx) {
  const r = Math.floor(idx / GM_COLS), c = idx % GM_COLS;
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= GM_ROWS || nc < 0 || nc >= GM_COLS) continue;
      out.push(idxOf(nr, nc));
    }
  }
  return out;
}

// Carré 3×3 de la dynamite, rogné aux bords du plateau (une dynamite dans
// un coin ne révèle que 4 cases — au joueur de bien viser).
export function bombSquare(centerIdx) {
  return [centerIdx, ...neighborsOf(centerIdx)];
}

// Génère une mine : `nugget[i]` (bool) et `adj[i]` (0-8). Simple tirage
// uniforme — trouver une pépite au premier coup est une BONNE nouvelle
// dans ce jeu, pas besoin de "premier coup toujours sûr".
export function genMine(rng = Math.random) {
  const n = GM_ROWS * GM_COLS;
  const nugget = new Array(n).fill(false);
  let placed = 0;
  while (placed < GM_NUGGETS) {
    const i = Math.floor(rng() * n);
    if (!nugget[i]) { nugget[i] = true; placed++; }
  }
  const adj = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    if (nugget[i]) continue;
    adj[i] = neighborsOf(i).reduce((s, j) => s + (nugget[j] ? 1 : 0), 0);
  }
  return { nugget, adj };
}

// Résultat d'un coup de pioche sur `idx` (case NON révélée, légalité
// vérifiée par l'appelant) : liste des cases nouvellement révélées et
// nature du coup. Sur un 0, propagation classique du démineur (toute la
// zone vide connexe + sa lisière de chiffres) — les pépites ne sont
// JAMAIS révélées par propagation : elles se méritent au coup direct.
export function digResult(mine, revealed, idx) {
  if (mine.nugget[idx]) return { cells: [idx], nugget: true };
  if (mine.adj[idx] > 0) return { cells: [idx], nugget: false };
  const seen = new Set([idx]);
  const queue = [idx];
  while (queue.length) {
    const cur = queue.pop();
    if (mine.adj[cur] !== 0 || mine.nugget[cur]) continue; // lisière : stop
    for (const nb of neighborsOf(cur)) {
      if (seen.has(nb) || revealed[nb] || mine.nugget[nb]) continue;
      seen.add(nb);
      if (mine.adj[nb] === 0) queue.push(nb);
    }
  }
  return { cells: [...seen], nugget: false };
}

// Résultat d'un coup de DYNAMITE centré sur `centerIdx` : les cases du
// carré 3×3 pas encore révélées, et la liste des pépites qui s'y trouvent.
// Pas de propagation des zéros (voir en-tête).
export function bombResult(mine, revealed, centerIdx) {
  const cells = bombSquare(centerIdx).filter(i => !revealed[i]);
  const nuggets = cells.filter(i => mine.nugget[i]);
  return { cells, nuggets };
}

// Or restant à trouver, à partir de l'état `revealed` (map idx -> truthy).
export function nuggetsLeft(mine, revealed) {
  let left = 0;
  for (let i = 0; i < mine.nugget.length; i++) {
    if (mine.nugget[i] && !revealed[i]) left++;
  }
  return left;
}

// Points ARCARDI de fin de partie (duel) : même barème 2 joueurs que
// Président/Chromatik — 5 au vainqueur, 0 au perdant.
export function gmPointsForPlace(place) {
  return [5, 0][place] ?? 0;
}
