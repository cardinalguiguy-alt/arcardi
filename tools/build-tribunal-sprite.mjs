// Pipeline C (§9 CLAUDE.md) — TROISIÈME usage, sur le modèle de
// build-eglise-sprite.mjs. Transforme refs/tributribu.jpg (JPEG sans alpha,
// damier peint en pixels) en public/town/courthouse-day-z<N>.png (un par cran
// de zoom depuis le 2026-09-25 ; avant : un seul courthouse-day.png de 384 px).
//
// ⚠️⚠️ CETTE IMAGE NE SE DÉTOURE PAS COMME LES DEUX PRÉCÉDENTES. Le prompt
// demandait une pierre « froide, gris pâle à blanc cassé, presque du marbre »
// (exprès, pour distinguer le tribunal du crème de l'église et de la brique
// de l'hôtel de ville) — donc une teinte qui tombe DANS la même plage neutre
// que le damier lui-même. Un test « neutre + clair » (celui des deux scripts
// précédents) mange le fronton sculpté et l'entablement : mesuré, 36 % de
// l'image partait en transparence au lieu des ~34 % réels, et le trou
// mordait sur le bas-relief de la balance.
// ⚠️ CE QUI SÉPARE VRAIMENT LE DAMIER DE LA PIERRE ICI N'EST PAS LA TEINTE,
// C'EST LA PÉRIODE : un damier alterne clair/sombre tous les ~13 px, pile,
// partout ; une pierre — même claire — ne le fait jamais sur une grille aussi
// régulière. `isCheckerish` teste donc qu'un pixel neutre ET son voisin à
// ±13 px (dans au moins deux des quatre directions) forment une vraie
// alternance de grande amplitude — pas seulement « c'est clair et sans
// couleur ». Vérifié à l'œil sur la planche affichée à 192 px (la taille
// réelle en jeu) : plus une fuite dans le fronton.
//
// Usage : node tools/build-tribunal-sprite.mjs
import { readFileSync, writeFileSync } from "node:fs";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";

const SRC = "refs/tributribu.jpg";
// ⚠️⚠️ 2026-09-25 (phase 1 de la feuille de route graphique) — PLUS UNE IMAGE
// DE 384 px RÉDUITE À 0,73 PAR LE JEU AU PLUS PROCHE VOISIN (un pixel sur
// quatre sauté), MAIS UNE IMAGE PAR CRAN DE ZOOM, À SA TAILLE D'ÉCRAN EXACTE,
// rééchantillonnée depuis la référence par `tools/lib-mip.mjs` — même procédé
// que l'église (son en-tête ; `TOWN_BITMAPS` dans fermeConstants.js).
// ⚠️ LA GRILLE DE 384 × 356 RESTE LE REPÈRE DE TOUTES LES MESURES
// (`TOWN_COURT_SPRITE` : pied de la volée, ailes, colonnes, pigeons — ET LA
// COLLISION, que `courtSpriteX` en dérive). Elle correspond au même RECADRAGE
// (`CROP` plus bas) : chaque cran n'en est qu'un agrandissement.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadFerme } from "./lib-canvas.mjs";
import { writeMips } from "./lib-mip.mjs";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { fermeConstants: C } = await loadFerme(ROOT, ["fermeConstants"]);
const SB = C.TOWN_BITMAPS.courthouse;

// ---- 0. Le damier : deux tons neutres qui ALTERNENT tous les ~13 px, dans
// les deux axes — mesuré à la main sur une bande propre de l'image (loin du
// bâtiment). PER est le demi-pas, pas le pas entier.
const PER = 13, SWING = 55, NEUTRAL_SAT = 24;
function isNeutral(r, g, b) { return Math.max(r, g, b) - Math.min(r, g, b) <= NEUTRAL_SAT; }

// ---- 1. Décodage.
const raw = readFileSync(SRC);
const img = jpeg.decode(raw, { useTArray: true, formatAsRGBA: true });
const { width: W, height: H, data: src } = img;
const bright = (x, y) => { const o = (y * W + x) * 4; return (src[o] + src[o + 1] + src[o + 2]) / 3; };

function checkerSignature(x, y) {
  const o = (y * W + x) * 4;
  if (!isNeutral(src[o], src[o + 1], src[o + 2])) return false;
  const b0 = bright(x, y);
  let swings = 0, avail = 0;
  for (const [dx, dy] of [[-PER, 0], [PER, 0], [0, -PER], [0, PER]]) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    avail++;
    const no = (ny * W + nx) * 4;
    if (isNeutral(src[no], src[no + 1], src[no + 2]) && Math.abs(b0 - bright(nx, ny)) > SWING) swings++;
  }
  return avail >= 2 && swings >= 2;
}

const rawChecker = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (checkerSignature(x, y)) rawChecker[y * W + x] = 1;

// ⚠️ Même pont qu'à l'église : un pixel de bord de macrobloc JPEG rate le
// test au milieu d'un damier par ailleurs régulier. On repêche via les
// voisins, comme build-eglise-sprite.mjs.
function passable(x, y) {
  const i = y * W + x;
  if (rawChecker[i]) return true;
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    if (rawChecker[ny * W + nx]) n++;
  }
  return n >= 5;
}

const alpha0 = new Uint8Array(W * H).fill(255);
const visited = new Uint8Array(W * H);
const stack = [];
const push = (x, y) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = y * W + x;
  if (visited[i]) return;
  visited[i] = 1;
  if (passable(x, y)) { alpha0[i] = 0; stack.push([x, y]); }
};
for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
while (stack.length) { const [x, y] = stack.pop(); push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }

const removed = alpha0.reduce((n, v) => n + (v === 0 ? 1 : 0), 0);
console.log(`damier retiré : ${removed}/${W * H} px (${(100 * removed / (W * H)).toFixed(1)}%)`);

// ---- 2. Recadrage. ⚠️ PAS LA BOÎTE DU CONTENU DÉTOURÉ : le bruit JPEG des
// tout derniers pixels de bord (0-8 px) fait parfois passer le classement de
// quelques points épars — sans effet visible (ils sont dans le damier, à des
// dizaines de cases du bâtiment), mais suffisant pour que leur boîte engloutir
// toute l'image. La vraie silhouette est mesurée à l'œil sur la planche
// détourée (magenta = retiré) : le bâtiment tient dans (10,3)-(1076,990).
const CROP = { x0: 10, y0: 3, x1: 1076, y1: 990 };
const CW = CROP.x1 - CROP.x0, CH = CROP.y1 - CROP.y0;
console.log(`recadré : ${CW}x${CH} (depuis ${W}x${H})`);

// ---- 3. LA COLONNE DE DAMIER RÉSIDUELLE, À DROITE DU DÔME. Une bande
// verticale plus claire du damier (couture JPEG, ~x 964-979, y 81-273 de la
// référence) n'alterne pas assez pour passer `checkerSignature` : elle restait
// « contenu ». Elle avait été GOMMÉE À LA MAIN dans l'ancien PNG de 384 px —
// 388 px mis à alpha 0, retrouvés le 2026-09-25 en regénérant l'ancien script,
// qui ne reproduisait plus le fichier versionné. La gomme vit désormais ICI,
// sinon chaque regénération la ferait revenir. ⚠️ Vérifié le même jour : ce
// rectangle ne contient AUCUN pixel du bâtiment (sa plus grande composante).
const ERASE = { x0: 958, y0: 75, x1: 985, y1: 276 };
for (let y = ERASE.y0; y <= ERASE.y1; y++) for (let x = ERASE.x0; x <= ERASE.x1; x++) alpha0[y * W + x] = 0;

// ---- 4. LA POUSSIÈRE : 634 grains de 1 à 19 px (mesuré le 2026-09-25), une
// grille de points aux COINS des cases du damier — le JPEG y mélange les deux
// tons et le mélange rate le test. Ils étaient dans l'ancien PNG, à peine
// visibles une fois réduits à 0,73 ; à 1 px d'image = 1 px d'écran (cran 5),
// ce sont des points gris sur l'herbe.
// ⚠️ UN SEUIL DE TAILLE SEUL EFFACERAIT DU VRAI DÉCOR : le LANTERNON du dôme
// arrive en morceaux détachés (ses ouvertures laissent voir le damier), et des
// statuettes de la balustrade font 20 à 90 px. On n'efface donc qu'un grain
// qui réunit TROIS signes : petit (< 20 px), couleur du damier (gris neutre
// clair : saturation ≤ 12, luminance ≥ 130), et à plus de 3 px du bâtiment.
// Vérifié sur une planche de contrôle (le bâtiment intact, la grille de
// points seule marquée) avant d'adopter la règle.
{
  const comp = new Int32Array(W * H).fill(-1), sizes = [], boxes = [];
  for (let i0 = 0; i0 < W * H; i0++) {
    if (alpha0[i0] === 0 || comp[i0] >= 0) continue;
    const id = sizes.length; let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    const q = [i0]; comp[i0] = id;
    while (q.length) {
      const c = q.pop(); n++;
      const cy = (c / W) | 0, cx = c - cy * W;
      if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
      for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx;
        if (alpha0[ni] === 0 || comp[ni] >= 0) continue;
        comp[ni] = id; q.push(ni);
      }
    }
    sizes.push(n); boxes.push([x0, y0, x1, y1]);
  }
  let main = 0;
  for (let c = 1; c < sizes.length; c++) if (sizes[c] > sizes[main]) main = c;
  const near = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) if (comp[i] === main) {
    const y = (i / W) | 0, x = i - y * W;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H) near[ny * W + nx] = 1;
    }
  }
  const sat = new Float64Array(sizes.length), lum = new Float64Array(sizes.length), touch = new Uint8Array(sizes.length);
  for (let i = 0; i < W * H; i++) {
    const c = comp[i]; if (c < 0) continue;
    const o = i * 4;
    sat[c] += Math.max(src[o], src[o + 1], src[o + 2]) - Math.min(src[o], src[o + 1], src[o + 2]);
    lum[c] += (src[o] + src[o + 1] + src[o + 2]) / 3;
    if (near[i]) touch[c] = 1;
  }
  const kill = new Uint8Array(sizes.length);
  let nk = 0, pk = 0;
  for (let c = 0; c < sizes.length; c++) {
    if (c === main || sizes[c] >= 20 || touch[c]) continue;
    if (sat[c] / sizes[c] <= 12 && lum[c] / sizes[c] >= 130) { kill[c] = 1; nk++; pk += sizes[c]; }
  }
  for (let i = 0; i < W * H; i++) if (comp[i] >= 0 && kill[comp[i]]) alpha0[i] = 0;
  console.log(`poussière effacée : ${nk} grains, ${pk} px (bâtiment : ${sizes[main]} px, intact)`);
}

// ---- 5. Plans prémultipliés, recadrés, puis `writeMips`.
const N = CW * CH;
const dP = [new Float32Array(N), new Float32Array(N), new Float32Array(N), new Float32Array(N)];
for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
  const si = (CROP.y0 + y) * W + (CROP.x0 + x), so = si * 4, di = y * CW + x;
  const a = alpha0[si] / 255;
  dP[0][di] = src[so] * a; dP[1][di] = src[so + 1] * a; dP[2][di] = src[so + 2] * a; dP[3][di] = a;
}
console.log(`recadrage ${CW}x${CH}, grille de repères ${C.TOWN_COURT_SPRITE.iw}x${C.TOWN_COURT_SPRITE.ih}`);
for (const line of writeMips(ROOT, SB, C.townBitmapMip, dP, null, CW, CH)) console.log(line);
