// Pipeline C (§9 CLAUDE.md) — DEUXIÈME USAGE, sur le modèle exact de
// build-townhall-sprite.mjs (hôtel de ville, 2026-09-02). Transforme
// refs/eglise-nouvelle.jpg (JPEG sans alpha, damier peint en pixels) en DEUX
// PNG prêts pour le jeu :
//   - eglise-day.png   : le bâtiment, vitraux ÉTEINTS
//   - eglise-glow.png  : UNIQUEMENT les vitraux allumés, sur fond
//                        transparent, à superposer avec globalAlpha =
//                        nightAlpha() (voir drawChurchBitmap, FermeGame.js).
//
// ⚠️ LE DAMIER DE CETTE IMAGE N'EST PAS CELUI DE hdv.jpg — mesuré à la main
// (tools/_tmp-debug2.mjs, jeté après usage) : case claire (250,249,242),
// case sombre (151,143,135). Le seuil "brightness > 150" de l'hôtel de ville
// ratait la moitié des cases (trop sombres pour lui) et le damier ne se
// détachait quasiment pas — 74,5 % de l'image restait "contenu". On calibre
// donc sur DEUX couleurs de référence mesurées sur CETTE image, jamais sur
// un seuil générique repris de l'autre bâtiment : deux rendus Gemini n'ont
// aucune raison de peindre le même gris de damier.
//
// Usage : node tools/build-eglise-sprite.mjs
import { readFileSync, writeFileSync } from "node:fs";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";

const SRC = "refs/eglise-nouvelle.jpg";
// 12 cases de 16px — même largeur d'emprise que l'hôtel de ville ET le
// tribunal (TOWN_HALL.w = TOWN_COURT.w = 12) : les trois monuments civiques
// partagent maintenant la même échelle de façade, ce qui n'était pas vrai de
// l'ancienne église (8 cases, héritée du zip 235). TOWN_CHURCH est élargie
// en conséquence dans fermeConstants.js (croissance symétrique, comme le
// TOWN_HALL du 2026-09-02).
const TARGET_W = 192;
const OUT_DAY = "public/town/eglise-day.png";
const OUT_GLOW = "public/town/eglise-glow.png";

// Vitrail éteint : sans lumière derrière, un vitrail au plomb se lit presque
// noir, avec juste un soupçon du même froid que la pierre — jamais la
// couleur vive du jour. Aucune teinte "vitrail éteint" n'existe déjà dans le
// dépôt pour CE bâtiment (l'ancienne église procédurale n'a pas de variante
// de nuit) : choisie à la main, à ajuster si Guillaume la juge trop noire.
const UNLIT = [0x22, 0x20, 0x2c];

// ---- 0. Le damier de CETTE image (voir l'en-tête) : case claire autour de
// (250,249,242), case sombre autour de (151,143,135) — mesurés à la main,
// mais avec un bruit JPEG de ±60 par endroits (les bords entre deux cases).
// Une distance aux deux couleurs de référence, seule, rate donc trop de
// pixels de bord pour que le flood fill traverse le damier. ⚠️ CE QUI SÉPARE
// VRAIMENT LE DAMIER DE LA PIERRE (leçon du §8 de CLAUDE.md, la même que sur
// l'étoile verte) N'EST PAS SA LUMINOSITÉ, C'EST SA QUASI-ABSENCE DE
// SATURATION : la pierre la plus claire du mur reste nettement chaude
// (ex. (236,190,163), écart R-B = 73) alors que les deux cases du damier
// ont un écart R-B de 8 à 18 quel que soit le bruit JPEG. On teste donc
// « gris neutre » (peu importe l'exacte luminosité, dans deux bandes
// larges) plutôt qu'une distance aux deux couleurs exactes.
function isCheckerish(r, g, b) {
  const maxc = Math.max(r, g, b), minc = Math.min(r, g, b);
  if (maxc - minc > 22) return false;               // pas neutre : c'est de la pierre chaude
  const bright = (r + g + b) / 3;
  /* ⚠️ UNE SEULE BANDE, PAS DEUX. Une bande claire et une bande sombre avec
     un TROU entre elles (195-225) laissait passer exactement les pixels de
     transition anti-crénelés entre deux cases — un gris ni franchement clair
     ni franchement sombre, mesuré à des dizaines d'endroits sur les deux
     bords de l'image (ex. (215,210,200), bright≈208). Le damier n'a que deux
     tons, mais leur MÉLANGE au bord d'une case en a un troisième, tout aussi
     neutre. */
  return bright > 110;
}

// ---- 1. Décodage + damier -> alpha réelle (flood fill depuis les bords).
const raw = readFileSync(SRC);
const img = jpeg.decode(raw, { useTArray: true, formatAsRGBA: true });
const { width: SW, height: SH, data: src } = img;

// ⚠️ LE BRUIT JPEG LAISSE DE FAUX NÉGATIFS ISOLÉS DANS LE DAMIER LUI-MÊME
// (un pixel de bord de macrobloc qui rate le test au milieu d'un carreau
// par ailleurs uniforme) — mesuré : sans ce pont, le flood fill s'arrête au
// premier de ces pixels et la boîte de contenu reste l'image ENTIÈRE. On
// calcule donc le test brut une fois, puis on le « repêche » là où au moins
// quatre des huit voisins le passent déjà : ça pont les trous d'un pixel
// sans jamais laisser passer un vrai bord de bâtiment, dont la frontière
// fait des dizaines de pixels de large.
const rawChecker = new Uint8Array(SW * SH);
for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
  const o = (y * SW + x) * 4;
  if (isCheckerish(src[o], src[o + 1], src[o + 2])) rawChecker[y * SW + x] = 1;
}
function passable(x, y) {
  const i = y * SW + x;
  if (rawChecker[i]) return true;
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= SW || ny >= SH) continue;
    if (rawChecker[ny * SW + nx]) n++;
  }
  return n >= 4;
}

const alpha0 = new Uint8Array(SW * SH).fill(255);
const visited = new Uint8Array(SW * SH);
const stack = [];
const push = (x, y) => {
  if (x < 0 || y < 0 || x >= SW || y >= SH) return;
  const i = y * SW + x;
  if (visited[i]) return;
  visited[i] = 1;
  if (passable(x, y)) { alpha0[i] = 0; stack.push([x, y]); }
};
for (let x = 0; x < SW; x++) { push(x, 0); push(x, SH - 1); }
for (let y = 0; y < SH; y++) { push(0, y); push(SW - 1, y); }
while (stack.length) { const [x, y] = stack.pop(); push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }

let removed = 0;
for (let i = 0; i < SW * SH; i++) if (alpha0[i] === 0) removed++;
console.log(`damier retiré : ${removed}/${SW * SH} px (${(100 * removed / (SW * SH)).toFixed(1)}%)`);

// ⚠️⚠️ LE BRUIT JPEG LAISSE AUSSI DE FAUX POSITIFS ISOLÉS DANS LE DAMIER : un
// pixel qui rate LUI-MÊME le test de damier (donc reste "contenu", alpha=255)
// alors qu'il est entouré de damier de tous les côtés — jamais atteint par le
// flood fill puisque celui-ci ne part que du bâtiment. Une poignée de ces
// grains suffit à faire croire que le contenu touche les quatre bords de
// l'image (mesuré : la boîte ne se recadrait quasiment pas). La parade est la
// même que pour les vitraux plus bas — composantes connexes, PUIS on ne
// garde QUE la plus grande : c'est le bâtiment, un grain de bruit ne fait
// jamais des centaines de milliers de pixels connectés.
const compOf = new Int32Array(SW * SH).fill(-1);
const compSize = [];
{
  const seen = new Uint8Array(SW * SH);
  for (let y0 = 0; y0 < SH; y0++) for (let x0 = 0; x0 < SW; x0++) {
    const i0 = y0 * SW + x0;
    if (alpha0[i0] === 0 || seen[i0]) continue;
    const cid = compSize.length;
    let size = 0;
    const q = [i0]; seen[i0] = 1;
    while (q.length) {
      const ci = q.pop(); compOf[ci] = cid; size++;
      const cy = (ci / SW) | 0, cx = ci - cy * SW;
      for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
        if (nx < 0 || ny < 0 || nx >= SW || ny >= SH) continue;
        const ni = ny * SW + nx;
        if (seen[ni] || alpha0[ni] === 0) continue;
        seen[ni] = 1; q.push(ni);
      }
    }
    compSize.push(size);
  }
  let bestId = -1, bestSize = 0;
  for (let c = 0; c < compSize.length; c++) if (compSize[c] > bestSize) { bestSize = compSize[c]; bestId = c; }
  let cleaned = 0;
  for (let i = 0; i < SW * SH; i++) if (alpha0[i] !== 0 && compOf[i] !== bestId) { alpha0[i] = 0; cleaned++; }
  console.log(`composantes de contenu : ${compSize.length}, la plus grande = ${bestSize} px, ${cleaned} px de bruit isolé nettoyés`);
}

// ---- 2. Recadrage au contenu réel.
let minX = SW, minY = SH, maxX = 0, maxY = 0;
for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
  if (alpha0[y * SW + x] !== 0) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
}
const CW = maxX - minX + 1, CH = maxY - minY + 1;
console.log(`contenu recadré : ${CW}x${CH} (depuis ${SW}x${SH})`);

// ---- 3. Score "lueur" — même méthode et mêmes seuils que build-townhall-
// sprite.mjs (chaud ET lumineux, par RÉGION connexe, jamais pixel à pixel).
function glowScore(r, g, b) {
  const warmth = r - b;
  const bright = (r + g + b) / 3;
  const w = Math.min(1, Math.max(0, (warmth - 90) / 90));
  const l = Math.min(1, Math.max(0, (bright - 90) / 120));
  return w * l;
}
const CORE = 0.32, DILATE = 7;
const visitedC = new Uint8Array(SW * SH);
const boxes = [];
for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
  const i = y * SW + x;
  if (visitedC[i] || alpha0[i] === 0) continue;
  const o = i * 4;
  if (glowScore(src[o], src[o + 1], src[o + 2]) < CORE) continue;
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
  if (area < 12) continue;
  boxes.push({ x0: Math.max(0, bx0 - DILATE), x1: Math.min(SW - 1, bx1 + DILATE), y0: Math.max(0, by0 - DILATE), y1: Math.min(SH - 1, by1 + DILATE) });
}
console.log(`carreaux détectés (vitraux) : ${boxes.length}`);

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

// ---- 4. Correction pleine résolution, PUIS redimensionnement en une seule
// passe commune aux deux calques (jamais deux redimensionnements séparés).
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

writeFileSync(OUT_DAY, PNG.sync.write(dayPng));
writeFileSync(OUT_GLOW, PNG.sync.write(glowPng));
console.log(`Sortie : ${DW}x${DH}`);
console.log(`Écrit : ${OUT_DAY}`);
console.log(`Écrit : ${OUT_GLOW}`);
