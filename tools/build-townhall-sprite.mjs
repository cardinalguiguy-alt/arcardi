// Pipeline C (§9 CLAUDE.md) — PREMIER USAGE, l'outillage n'existait pas avant
// ce test. Transforme refs/hdv.jpg (JPEG sans alpha, damier peint en pixels)
// en DEUX PNG prêts pour le jeu :
//   - townhall-day.png   : le bâtiment, fenêtres/lanternes ÉTEINTES
//   - townhall-glow.png  : UNIQUEMENT les fenêtres/lanternes allumées, sur
//                          fond transparent, à superposer avec
//                          globalAlpha = nightAlpha() (même fonction que le
//                          voile de nuit du jeu, FermeGame.js) pour que
//                          l'allumage suive exactement le même fondu que le
//                          reste du monde (demande de Guillaume, 2026-09-02 :
//                          éteint le jour, allumé nuit/aube/crépuscule).
//
// Les deux PNG restent PARFAITEMENT alignés pixel à pixel : ils viennent du
// même redimensionnement, appliqué en une seule passe aux deux tableaux de
// pixels en parallèle — jamais deux exports séparés qui pourraient dériver.
//
// Usage : node tools/build-townhall-sprite.mjs
import { readFileSync, writeFileSync } from "node:fs";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";

const SRC = "refs/hdv.jpg";
const TARGET_W = 192; // 12 cases de 16px — largeur d'emprise choisie (voir CLAUDE.md / conversation)
const OUT_DAY = "public/town/townhall-day.png";
const OUT_GLOW = "public/town/townhall-glow.png";

// Teinte "vitre éteinte" reprise de l'hôtel de ville procédural existant
// (townHall2Sprite, fermeArt.js) — #3d5c78 — pour que ce bâtiment reste
// cohérent avec le reste de la ville plutôt que d'inventer une nouvelle
// teinte pour ce seul sprite.
const UNLIT = [0x3d, 0x5c, 0x78];

// ---- 1. Décodage + damier -> alpha réelle (même méthode que
// import-townhall.mjs, qui a servi à la vérifier visuellement au préalable).
const raw = readFileSync(SRC);
const img = jpeg.decode(raw, { useTArray: true, formatAsRGBA: true });
const { width: SW, height: SH, data: src } = img;

function isCheckerish(r, g, b) {
  const maxc = Math.max(r, g, b), minc = Math.min(r, g, b);
  return (maxc - minc) < 18 && (r + g + b) / 3 > 150;
}
const alpha0 = new Uint8Array(SW * SH).fill(255);
const visited = new Uint8Array(SW * SH);
const stack = [];
const push = (x, y) => {
  if (x < 0 || y < 0 || x >= SW || y >= SH) return;
  const i = y * SW + x;
  if (visited[i]) return;
  visited[i] = 1;
  const o = i * 4;
  if (isCheckerish(src[o], src[o + 1], src[o + 2])) { alpha0[i] = 0; stack.push([x, y]); }
};
for (let x = 0; x < SW; x++) { push(x, 0); push(x, SH - 1); }
for (let y = 0; y < SH; y++) { push(0, y); push(SW - 1, y); }
while (stack.length) { const [x, y] = stack.pop(); push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }

// ---- 2. Recadrage au contenu réel (retire la marge basse transparente).
let minX = SW, minY = SH, maxX = 0, maxY = 0;
for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
  if (alpha0[y * SW + x] !== 0) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
}
const CW = maxX - minX + 1, CH = maxY - minY + 1;

// ---- 3. Score "lueur" par pixel : chaud (R très supérieur à B) ET
// lumineux. Calibré sur des échantillons pris à la main dans les fenêtres
// éclairées (ex. (253,166,49), (255,248,175)) contre la pierre claire du
// cadran de l'horloge (252,225,184, PAS une lueur — trop peu "chaud") et la
// brique (~210,162,128, idem). Le cadran et la brique ont un écart R-B
// autour de 40-95 ; les fenêtres allumées, 150-205 : le seuil à 90 sépare
// proprement les deux sans réglage supplémentaire.
function glowScore(r, g, b) {
  const warmth = r - b;
  const bright = (r + g + b) / 3;
  const w = Math.min(1, Math.max(0, (warmth - 90) / 90));
  const l = Math.min(1, Math.max(0, (bright - 90) / 120));
  return w * l;
}
/* ⚠️ UN SEUIL PAR PIXEL NE SUFFIT PAS : un carreau de vitrail n'est
   lumineux que sur une fraction de ses pixels (le reste est plomb, reflet,
   rideau sombre) — mesuré ici, 92% des pixels d'une baie n'ont AUCUN score.
   Remplacer pixel à pixel laisse donc une vitre "à moitié éteinte" une fois
   moyennée au redimensionnement (la couleur d'origine, majoritaire dans la
   case, écrase le peu d'UNLIT mélangé). On détecte donc plutôt le VITRAIL
   COMME RÉGION (composantes connexes des pixels au score fort, boîte
   englobante dilatée) et on traite tout le carreau d'un bloc — plein jour,
   plein feu, jamais un dégradé pixel à pixel qui se dilue tout seul. */
const CORE = 0.32;   // score minimal pour amorcer une composante
const DILATE = 7;    // marge autour de la boîte englobante (le plomb, le cadre proche)
const visitedC = new Uint8Array(SW * SH);
const paneOf = new Int32Array(SW * SH).fill(-1);
const boxes = [];
for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
  const i = y * SW + x;
  if (visitedC[i] || alpha0[i] === 0) continue;
  const o = i * 4;
  if (glowScore(src[o], src[o + 1], src[o + 2]) < CORE) continue;
  // BFS d'une composante connexe (4-voisins) de pixels au score fort.
  let bx0 = x, bx1 = x, by0 = y, by1 = y, area = 0;
  const q = [i]; visitedC[i] = 1;
  while (q.length) {
    const ci = q.pop(), cy = (ci / SW) | 0, cx = ci - cy * SW;
    area++;
    if (cx < bx0) bx0 = cx; if (cx > bx1) bx1 = cx;
    if (cy < by0) by0 = cy; if (cy > by1) by1 = cy;
    for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
      if (nx < 0 || ny < 0 || nx >= SW || ny >= SH) continue;
      const ni = ny * SW + nx;
      if (visitedC[ni] || alpha0[ni] === 0) continue;
      const no = ni * 4;
      if (glowScore(src[no], src[no + 1], src[no + 2]) < CORE) continue;
      visitedC[ni] = 1; q.push(ni);
    }
  }
  if (area < 12) continue; // bruit JPEG isolé, pas un carreau
  boxes.push({ x0: Math.max(0, bx0 - DILATE), x1: Math.min(SW - 1, bx1 + DILATE), y0: Math.max(0, by0 - DILATE), y1: Math.min(SH - 1, by1 + DILATE) });
}
console.log(`Carreaux détectés (fenêtres + lanternes) : ${boxes.length}`);

// Poids "jour->éteint" et alpha de lueur par pixel, dérivés de la distance
// (en pixels) au bord de la boîte la plus proche qui le contient — 1 (plein)
// au cœur, adouci sur les DILATE derniers pixels pour ne pas laisser un bord
// dur au carreau.
function paneWeight(x, y) {
  let best = 0;
  for (const b of boxes) {
    if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1) continue;
    const dx = Math.min(x - b.x0, b.x1 - x), dy = Math.min(y - b.y0, b.y1 - y);
    const d = Math.min(dx, dy);
    const w = Math.min(1, d / DILATE);
    if (w > best) best = w;
  }
  return best;
}

// ---- 4. Correction PLEINE RÉSOLUTION des deux couches, PUIS
// redimensionnement par moyenne de zone en une seule passe commune — jamais
// deux redimensionnements séparés, sinon les deux couches pourraient dériver
// l'une de l'autre au pixel près.
const dayR = new Float32Array(SW * SH), dayG = new Float32Array(SW * SH), dayB = new Float32Array(SW * SH);
const glowR = new Float32Array(SW * SH), glowG = new Float32Array(SW * SH), glowB = new Float32Array(SW * SH), glowA = new Float32Array(SW * SH);
for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
  const i = y * SW + x, o = i * 4, r = src[o], g = src[o + 1], b = src[o + 2];
  const pw = paneWeight(x, y);
  dayR[i] = r + (UNLIT[0] - r) * pw; dayG[i] = g + (UNLIT[1] - g) * pw; dayB[i] = b + (UNLIT[2] - b) * pw;
  glowR[i] = r; glowG[i] = g; glowB[i] = b;
  glowA[i] = pw * (alpha0[i] / 255);
}

const scale = TARGET_W / CW;
const DW = TARGET_W, DH = Math.round(CH * scale);
const dayPng = new PNG({ width: DW, height: DH });
const glowPng = new PNG({ width: DW, height: DH });

for (let dy = 0; dy < DH; dy++) {
  const sy0 = minY + Math.floor(dy / scale), sy1 = minY + Math.floor((dy + 1) / scale);
  for (let dx = 0; dx < DW; dx++) {
    const sx0 = minX + Math.floor(dx / scale), sx1 = minX + Math.floor((dx + 1) / scale);
    let dRs = 0, dGs = 0, dBs = 0, aSum = 0;
    let gRs = 0, gGs = 0, gBs = 0, gAs = 0;
    let n = 0;
    for (let sy = sy0; sy < Math.max(sy1, sy0 + 1) && sy <= maxY; sy++) {
      for (let sx = sx0; sx < Math.max(sx1, sx0 + 1) && sx <= maxX; sx++) {
        const si = sy * SW + sx;
        const a = alpha0[si];
        dRs += dayR[si]; dGs += dayG[si]; dBs += dayB[si]; aSum += a; n++;
        const ga = glowA[si];
        gRs += glowR[si] * ga; gGs += glowG[si] * ga; gBs += glowB[si] * ga; gAs += ga;
      }
    }
    n = Math.max(1, n);
    const di = (dy * DW + dx) * 4;
    dayPng.data[di] = Math.round(dRs / n); dayPng.data[di + 1] = Math.round(dGs / n); dayPng.data[di + 2] = Math.round(dBs / n);
    dayPng.data[di + 3] = Math.round(aSum / n);
    const galpha = Math.round((gAs / n) * 255);
    glowPng.data[di] = galpha > 0 ? Math.round(gRs / gAs) : 0;
    glowPng.data[di + 1] = galpha > 0 ? Math.round(gGs / gAs) : 0;
    glowPng.data[di + 2] = galpha > 0 ? Math.round(gBs / gAs) : 0;
    glowPng.data[di + 3] = galpha;
  }
}

/* ---- 5. L'HORLOGE : Guillaume veut les aiguilles liées à l'heure du jeu
   (FermeGame.js les dessine chaque frame, voir drawTownHallBitmap) — donc
   les aiguilles GRAVÉES par Gemini doivent disparaître d'ici, sinon deux
   horloges se superposeraient. Centre et rayon mesurés à la main sur
   townhall-day.png (192 px de large) : (95.5, 74), cadran plein à 6 px,
   lunette de pierre sombre jusqu'à 8 px. */
const CLOCK_CX = 95.5, CLOCK_CY = 74, CLOCK_R_FACE = 6, CLOCK_R_BEZEL = 8;
const BEZEL = [0x2e, 0x2a, 0x24], FACE = [0xfe, 0xf0, 0xce];
for (let y = Math.floor(CLOCK_CY - CLOCK_R_BEZEL); y <= Math.ceil(CLOCK_CY + CLOCK_R_BEZEL); y++) {
  for (let x = Math.floor(CLOCK_CX - CLOCK_R_BEZEL); x <= Math.ceil(CLOCK_CX + CLOCK_R_BEZEL); x++) {
    if (x < 0 || y < 0 || x >= DW || y >= DH) continue;
    const d = Math.hypot(x - CLOCK_CX, y - CLOCK_CY);
    if (d > CLOCK_R_BEZEL) continue;
    const col = d <= CLOCK_R_FACE ? FACE : BEZEL;
    const di = (y * DW + x) * 4;
    dayPng.data[di] = col[0]; dayPng.data[di + 1] = col[1]; dayPng.data[di + 2] = col[2];
  }
}

writeFileSync(OUT_DAY, PNG.sync.write(dayPng));
writeFileSync(OUT_GLOW, PNG.sync.write(glowPng));
console.log(`Source recadrée : ${CW}x${CH} (depuis ${SW}x${SH})`);
console.log(`Sortie : ${DW}x${DH}`);
console.log(`Écrit : ${OUT_DAY}`);
console.log(`Écrit : ${OUT_GLOW}`);
