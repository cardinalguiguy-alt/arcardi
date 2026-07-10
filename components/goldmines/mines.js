// ==========================================================================
// Gold Mines — logique pure de la mine (grille, pépites, adjacences,
// révélation avec propagation des zéros). Aucune dépendance React :
// testable et réutilisable telle quelle côté hôte (arbitre) comme côté
// simple lecture — même philosophie que deck.js (Chromatik).
//
// Principe (demineur INVERSÉ, demande 2026-07) : les "mines" sont des
// PÉPITES D'OR qu'on VEUT trouver. Un coup de pioche révèle soit un chiffre
// (nombre de pépites dans les 8 cases voisines), soit une pépite — qui
// rapporte 1 or à son découvreur ET lui donne le droit de rejouer.
// 2 contre 2 : les tours alternent entre les deux équipes (sièges
// entrelacés), à la fin on compte l'or de chacun — équipe gagnante au
// total, meilleur et moins bon mineur au tableau final.
// ==========================================================================

export const GM_ROWS = 12;
export const GM_COLS = 12;
// IMPAIR à dessein : le total d'or des deux équipes ne peut jamais être
// égal — il y a TOUJOURS une équipe gagnante et une équipe perdante.
export const GM_NUGGETS = 31;

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

// Génère une mine : `nugget[i]` (bool) et `adj[i]` (0-8). Simple tirage
// uniforme — pas de "premier coup toujours sûr" ici : trouver une pépite
// au premier coup est une BONNE nouvelle dans ce jeu, pas une défaite.
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
// nature du coup. Sur un 0, propagation classique du démineur (toutes les
// zones vides connexes + leur lisière de chiffres) — les pépites ne sont
// JAMAIS révélées par propagation : elles se méritent au coup direct.
export function digResult(mine, revealed, idx) {
  if (mine.nugget[idx]) return { cells: [idx], nugget: true };
  if (mine.adj[idx] > 0) return { cells: [idx], nugget: false };
  const seen = new Set([idx]);
  const queue = [idx];
  while (queue.length) {
    const cur = queue.pop();
    if (mine.adj[cur] !== 0 || mine.nugget[cur]) continue; // lisière : on s'arrête
    for (const nb of neighborsOf(cur)) {
      if (seen.has(nb) || revealed[nb] || mine.nugget[nb]) continue;
      seen.add(nb);
      if (mine.adj[nb] === 0) queue.push(nb);
    }
  }
  return { cells: [...seen], nugget: false };
}

// Or restant à trouver, à partir de l'état `revealed` (map idx -> vrai/objet).
export function nuggetsLeft(mine, revealed) {
  let left = 0;
  for (let i = 0; i < mine.nugget.length; i++) {
    if (mine.nugget[i] && !revealed[i]) left++;
  }
  return left;
}

// Points ARCARDI de fin de partie : classement INDIVIDUEL à l'or récolté
// (l'appartenance à l'équipe gagnante départage les ex æquo en amont, voir
// GoldMinesGame.js) — même barème 4 joueurs que Président/Chromatik.
export function gmPointsForPlace(place) {
  return [5, 3, 1, 0][place] ?? 0;
}
