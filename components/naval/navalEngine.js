// ===== Bataille navale — moteur PUR (aucun React/réseau, testable en Node) =====
// Grille 10x10. Flotte "classique enrichie" : porte-avions 5x2 (rectangle,
// demande explicite de Guillaume), puis quatre navires en ligne (4, 3, 3, 2).
// Un navire est décrit par sa longueur `len` (grand axe) et sa largeur `beam`
// (petit axe) ; occupe donc un RECTANGLE len x beam une fois orienté.

export const N = 10;

export const FLEET = [
  { id: "carrier",   nameKey: "navalCarrier",   len: 5, beam: 2 }, // porte-avions 5x2
  { id: "cruiser",   nameKey: "navalCruiser",   len: 4, beam: 1 },
  { id: "destroyer", nameKey: "navalDestroyer", len: 3, beam: 1 },
  { id: "submarine", nameKey: "navalSubmarine", len: 3, beam: 1 },
  { id: "torpedo",   nameKey: "navalTorpedo",   len: 2, beam: 1 },
];

export function shipDef(id) { return FLEET.find(s => s.id === id); }
export function shipSize(id) { const s = shipDef(id); return s ? s.len * s.beam : 0; }

// Cellules occupées par un navire posé en (r, c), orienté horizontalement
// (grand axe = colonnes) ou verticalement (grand axe = lignes).
// `r`/`c` = coin haut-gauche du rectangle.
export function shipCells(id, r, c, horiz) {
  const s = shipDef(id);
  if (!s) return [];
  const rows = horiz ? s.beam : s.len;
  const cols = horiz ? s.len : s.beam;
  const out = [];
  for (let dr = 0; dr < rows; dr++) {
    for (let dc = 0; dc < cols; dc++) out.push([r + dr, c + dc]);
  }
  return out;
}

export function inBounds(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }

// Un placement = { id, r, c, horiz }. Vérifie qu'une liste de placements est
// légale : chaque navire dans la grille, aucun chevauchement, chaque type de
// la flotte présent une seule fois.
export function validPlacements(placements) {
  if (!Array.isArray(placements)) return false;
  const ids = FLEET.map(s => s.id);
  if (placements.length !== ids.length) return false;
  const seen = new Set();
  const occupied = new Set();
  for (const p of placements) {
    if (!ids.includes(p.id) || seen.has(p.id)) return false;
    seen.add(p.id);
    const cells = shipCells(p.id, p.r, p.c, !!p.horiz);
    if (!cells.length) return false;
    for (const [rr, cc] of cells) {
      if (!inBounds(rr, cc)) return false;
      const key = rr + "," + cc;
      if (occupied.has(key)) return false;
      occupied.add(key);
    }
  }
  return true;
}

// Un placement partiel tient-il (cellules libres et dans la grille) sur une
// carte déjà partiellement remplie ? `occupied` = Set de "r,c".
export function cellsFit(occupied, cells) {
  for (const [rr, cc] of cells) {
    if (!inBounds(rr, cc)) return false;
    if (occupied.has(rr + "," + cc)) return false;
  }
  return true;
}

export function occupiedSet(placements) {
  const occ = new Set();
  for (const p of placements) {
    for (const [rr, cc] of shipCells(p.id, p.r, p.c, !!p.horiz)) occ.add(rr + "," + cc);
  }
  return occ;
}

// Carte cellule -> id de navire (pour la résolution des tirs et le rendu).
export function fleetCellMap(placements) {
  const map = {};
  for (const p of placements) {
    for (const [rr, cc] of shipCells(p.id, p.r, p.c, !!p.horiz)) map[rr + "," + cc] = p.id;
  }
  return map;
}

// Placement automatique aléatoire et TOUJOURS légal (retente jusqu'à réussir).
export function autoPlace(rand = Math.random) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const placements = [];
    const occupied = new Set();
    let ok = true;
    for (const s of FLEET) {
      let placed = false;
      for (let g = 0; g < 400 && !placed; g++) {
        const horiz = rand() < 0.5;
        const rows = horiz ? s.beam : s.len;
        const cols = horiz ? s.len : s.beam;
        const r = Math.floor(rand() * (N - rows + 1));
        const c = Math.floor(rand() * (N - cols + 1));
        const cells = shipCells(s.id, r, c, horiz);
        if (cellsFit(occupied, cells)) {
          cells.forEach(([rr, cc]) => occupied.add(rr + "," + cc));
          placements.push({ id: s.id, r, c, horiz });
          placed = true;
        }
      }
      if (!placed) { ok = false; break; }
    }
    if (ok && validPlacements(placements)) return placements;
  }
  return null; // ne devrait jamais arriver sur une 10x10
}

export function emptyShots() {
  return Array.from({ length: N }, () => Array(N).fill(null));
}

// Un navire est-il coulé ? Toutes ses cellules ont-elles été touchées ?
export function isSunk(placement, shots) {
  return shipCells(placement.id, placement.r, placement.c, !!placement.horiz)
    .every(([rr, cc]) => shots[rr] && shots[rr][cc] === "hit");
}

// Résout un tir en (r, c) contre une flotte `placements`, sur une grille de
// tirs `shots` (10x10 de null|"hit"|"miss"). Retourne un NOUVEL objet shots
// et le détail : { shots, result, shipId, sunk, allSunk, already }.
export function resolveFire(placements, shots, r, c) {
  if (!inBounds(r, c)) return { shots, result: null, already: true };
  if (shots[r][c]) return { shots, result: shots[r][c], already: true };
  const map = fleetCellMap(placements);
  const shipId = map[r + "," + c] || null;
  const next = shots.map(row => row.slice());
  next[r][c] = shipId ? "hit" : "miss";
  let sunk = false, allSunk = false;
  if (shipId) {
    const pl = placements.find(p => p.id === shipId);
    sunk = isSunk(pl, next);
    allSunk = placements.every(p => isSunk(p, next));
  }
  return { shots: next, result: next[r][c], shipId, sunk, allSunk, already: false };
}

// Nombre de navires encore à flot (pour l'inventaire adverse).
export function fleetStatus(placements, shots) {
  return FLEET.map(s => {
    const pl = placements && placements.find(p => p.id === s.id);
    const sunk = pl ? isSunk(pl, shots) : false;
    return { id: s.id, nameKey: s.nameKey, size: shipSize(s.id), sunk };
  });
}

// Coup aléatoire valide (filet de sécurité du minuteur) : une cellule non
// encore tirée, choisie au hasard.
export function randomShot(shots, rand = Math.random) {
  const free = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!shots[r][c]) free.push([r, c]);
  if (!free.length) return null;
  return free[Math.floor(rand() * free.length)];
}
