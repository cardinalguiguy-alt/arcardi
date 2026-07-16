/* ==========================================================================
   puzzleEngine — moteur PUR de Puzzle Race (jeu n°21). Aucune dépendance
   React/Supabase : génération de la grille, géométrie des pattes (courbes
   de Bézier, bord convexe/concave complémentaire entre pièces voisines),
   génération des chemins SVG par pièce, détection de snap et de
   complétion. Le profil de patte est celui validé sur la maquette
   interactive (`puzzlerace-maquette-geometrie.html`, session de cadrage) :
   x strictement croissant le long du bord, donc aucune auto-intersection.
   Testé en Node avant intégration (voir commentaire de session).
   ========================================================================== */

// Niveaux de difficulté validés par Guillaume : nombre de pièces -> grille
// [colonnes, lignes]. Choisis pour rester proches d'un ratio 4:3 (format
// des illustrations sources).
export const DIFF_PRESETS = {
  12: [4, 3],
  24: [6, 4],
  54: [9, 6],
};
export const DIFF_LEVELS = [12, 24, 54];

export function gridDimsFor(pieceCount) {
  return DIFF_PRESETS[pieceCount] || DIFF_PRESETS[24];
}

// Proportion du bulbe par rapport à la plus petite dimension de la pièce,
// et tolérance de snap (distance, en fraction de la même dimension) sous
// laquelle une pièce relâchée se verrouille à sa place.
export const BULGE_FRAC = 0.26;
export const SNAP_TOLERANCE_FRAC = 0.28;

// Segments de contrôle du profil de patte (4 courbes cubiques), en unités
// normalisées : x de 0 à 1 le long du bord, y = déplacement le long de la
// normale sortante. signe s = +1 bulbe sortant, -1 bulbe rentrant. Épaule
// douce -> bulbe rond -> épaule douce : silhouette de "patte" classique,
// sans découpe en surplomb (reste une fonction y(x), donc jamais
// d'auto-intersection possible sur un même bord).
function tabSegments(s, bulge) {
  const shoulder = bulge * 0.32;
  return [
    [[0, 0], [0.14, 0], [0.22, s * shoulder], [0.35, s * shoulder]],
    [[0.35, s * shoulder], [0.40, s * bulge], [0.44, s * bulge], [0.5, s * bulge]],
    [[0.5, s * bulge], [0.56, s * bulge], [0.60, s * bulge], [0.65, s * shoulder]],
    [[0.65, s * shoulder], [0.78, s * shoulder], [0.86, 0], [1, 0]],
  ];
}

// Tirage des signes de bord, une fois par pièce interne partagée : v[r][c]
// = bord vertical entre (r,c-1) et (r,c) ; h[r][c] = bord horizontal entre
// (r-1,c) et (r,c). Un seul tirage par bord (pas par pièce) garantit que
// les deux pièces voisines ont des pattes complémentaires exactes.
export function genEdges(rows, cols, rng = Math.random) {
  const v = [];
  const h = [];
  for (let r = 0; r < rows; r++) {
    v.push([]);
    for (let c = 1; c < cols; c++) v[r].push(rng() < 0.5 ? 1 : -1);
  }
  for (let r = 1; r < rows; r++) {
    h.push([]);
    for (let c = 0; c < cols; c++) h[r - 1].push(rng() < 0.5 ? 1 : -1);
  }
  return { v, h };
}

// Chemin SVG fermé (attribut `d`) d'une pièce (r,c), en repère LOCAL à la
// pièce (origine = coin haut-gauche de son emplacement final, x à droite,
// y vers le bas) — à translater ensuite à sa position courante par le
// composant React. Convention de signe : la pièce "propriétaire" d'un bord
// (celle du haut pour un bord horizontal, celle de gauche pour un bord
// vertical) dessine un bulbe sortant si le signe est positif ; l'autre
// pièce dessine alors, sur ce même bord physique, l'encoche complémentaire
// (signe inversé).
export function piecePath(r, c, rows, cols, cellW, cellH, edges, bulgeFrac = BULGE_FRAC) {
  const bulge = Math.min(cellW, cellH) * bulgeFrac;
  const x0 = 0, y0 = 0, x1 = cellW, y1 = cellH;

  function edgeCmds(start, along, normal, length, sign) {
    if (sign === 0) {
      return `L ${(start[0] + along[0] * length).toFixed(2)},${(start[1] + along[1] * length).toFixed(2)} `;
    }
    let d = "";
    for (const seg of tabSegments(sign, bulge / length)) {
      const pts = seg.map(p => [
        start[0] + along[0] * p[0] * length + normal[0] * p[1] * length,
        start[1] + along[1] * p[0] * length + normal[1] * p[1] * length,
      ]);
      d += `C ${pts[1][0].toFixed(2)},${pts[1][1].toFixed(2)} ${pts[2][0].toFixed(2)},${pts[2][1].toFixed(2)} ${pts[3][0].toFixed(2)},${pts[3][1].toFixed(2)} `;
    }
    return d;
  }

  const topSign    = r === 0 ? 0 : -edges.h[r - 1][c];
  const rightSign  = c === cols - 1 ? 0 : edges.v[r][c];
  const bottomSign = r === rows - 1 ? 0 : edges.h[r][c];
  const leftSign   = c === 0 ? 0 : -edges.v[r][c - 1];

  let d = `M ${x0},${y0} `;
  d += edgeCmds([x0, y0], [1, 0], [0, -1], x1 - x0, topSign);
  d += edgeCmds([x1, y0], [0, 1], [1, 0], y1 - y0, rightSign);
  d += edgeCmds([x1, y1], [-1, 0], [0, 1], x1 - x0, bottomSign);
  d += edgeCmds([x0, y1], [0, -1], [-1, 0], y1 - y0, leftSign);
  d += "Z";
  return d;
}

// Liste ordonnée des coordonnées de grille [{r,c}], utile pour construire
// le paquet de pièces d'un puzzle sans dupliquer la double boucle partout.
export function pieceList(rows, cols) {
  const list = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) list.push({ r, c });
  return list;
}

// Snap : une pièce relâchée à une distance (dx,dy) de son emplacement
// correct s'y verrouille si elle est sous la tolérance (fraction de la
// plus petite dimension de cellule).
export function isSnap(dx, dy, cellW, cellH, tolFrac = SNAP_TOLERANCE_FRAC) {
  const tol = Math.min(cellW, cellH) * tolFrac;
  return Math.hypot(dx, dy) <= tol;
}

// Génère un puzzle complet pour une difficulté donnée : dimensions de
// grille + tirage des bords. `rng` injectable (tests déterministes).
export function generatePuzzle(pieceCount, rng = Math.random) {
  const [cols, rows] = gridDimsFor(pieceCount);
  const edges = genEdges(rows, cols, rng);
  return { pieceCount, cols, rows, edges, pieces: pieceList(rows, cols) };
}
