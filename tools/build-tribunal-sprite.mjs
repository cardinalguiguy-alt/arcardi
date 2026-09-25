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
// précédents) mange le fronton sculpté et l'entablement.
// ⚠️⚠️ 2026-09-25 (phase 2 de la feuille de route graphique) — LE TEST DE
// PÉRIODE NE SUFFISAIT PAS NON PLUS, ET IL A ÉTÉ REMPLACÉ. Il demandait si un
// pixel neutre alterne avec son voisin à ±13 px : vrai pour le damier, mais
// vrai aussi pour une pierre claire posée à 13 px d'une case sombre du damier.
// Le LANTERNON du dôme (petit, clair, entouré de damier) partait presque en
// entier, et avec lui la corniche de l'aile gauche, les deux rampants du
// fronton et un bon quart du piédestal gauche de l'escalier — 23 837 px de
// bâtiment effacés (mesuré en rejouant l'ancien test).
// ⚠️ CE QUI SÉPARE LE DAMIER DE LA PIERRE EST SA COULEUR ATTENDUE À CET
// ENDROIT PRÉCIS : la grille est parfaitement régulière (pas de 13,6 px,
// mesuré sur les transitions d'une rangée de fond), donc chaque pixel a UNE
// couleur de damier prévue, blanc (244,243,241) ou gris (149,147,143). Une
// pierre claire posée dans une case grise ne lui ressemble pas, même neutre.
// ⚠️ MAIS LA PARITÉ N'EST PAS GLOBALE : Gemini a peint des coutures (deux
// cases de même ton côte à côte vers x≈966, et vers y≈816 à gauche), après
// lesquelles blanc et gris s'échangent. La parité se lit donc CASE PAR CASE,
// sur les cases dont l'intérieur est franchement blanc ou gris (1 713 sur
// 5 840), et se propage aux cases couvertes par le bâtiment depuis la plus
// proche. Sans cette lecture locale, toute la bande droite restait opaque.
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

// ---- 0. Le damier : une grille de 13,6 px (mesurée), deux tons, et une
// parité lue case par case (en-tête).
const P = 13.6, WHITE = [244, 243, 241], GRAY = [149, 147, 143];

// ---- 1. Décodage.
const raw = readFileSync(SRC);
const img = jpeg.decode(raw, { useTArray: true, formatAsRGBA: true });
const { width: W, height: H, data: src } = img;

// La parité de chaque case : 1 si elle est blanche là où l'alternance
// régulière la voudrait grise (après une couture), 0 sinon, -1 si inconnue.
// ⚠️ Seul l'INTÉRIEUR d'une case vote (2 px de marge : le JPEG mélange les
// deux tons sur les bords), et il doit être uniforme à ±12 près — une case à
// moitié couverte par le bâtiment ne vote pas.
const NX = Math.ceil(W / P), NY = Math.ceil(H / P);
const par = new Int8Array(NX * NY).fill(-1);
const near = (o, t, tol) => Math.abs(src[o] - t[0]) <= tol && Math.abs(src[o + 1] - t[1]) <= tol && Math.abs(src[o + 2] - t[2]) <= tol;
for (let cy = 0; cy < NY; cy++) for (let cx = 0; cx < NX; cx++) {
  const x0 = Math.ceil(cx * P + 2), x1 = Math.floor((cx + 1) * P - 2);
  const y0 = Math.ceil(cy * P + 2), y1 = Math.floor((cy + 1) * P - 2);
  if (x1 <= x0 || y1 <= y0 || x1 > W || y1 > H) continue;
  let allW = true, allG = true;
  for (let y = y0; y < y1 && (allW || allG); y++) for (let x = x0; x < x1; x++) {
    const o = (y * W + x) * 4;
    if (allW && !near(o, WHITE, 12)) allW = false;
    if (allG && !near(o, GRAY, 12)) allG = false;
  }
  if (allW || allG) par[cy * NX + cx] = (allW ? 1 : 0) ^ ((cx + cy) & 1);
}
{
  const q = [];
  for (let i = 0; i < NX * NY; i++) if (par[i] >= 0) q.push(i);
  for (let h = 0; h < q.length; h++) {
    const i = q[h], cy = (i / NX) | 0, cx = i - cy * NX;
    for (const [nx, ny] of [[cx, cy + 1], [cx, cy - 1], [cx + 1, cy], [cx - 1, cy]]) {
      if (nx < 0 || ny < 0 || nx >= NX || ny >= NY) continue;
      const j = ny * NX + nx;
      if (par[j] < 0) { par[j] = par[i]; q.push(j); }
    }
  }
}

// Un pixel est « du fond » s'il a la couleur de damier prévue à cet endroit
// (±18), ou s'il est neutre et clair sur la couture JPEG entre deux cases
// (1,6 px de part et d'autre d'une ligne de la grille), ou s'il appartient à
// un aplat neutre (5×5 uniforme à ±12) — les cases que Gemini a peintes d'un
// troisième ton, sous l'ombre douce d'un pot, par exemple.
const sat = new Uint8Array(W * H), lum = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) {
  const o = i * 4, r = src[o], g = src[o + 1], b = src[o + 2];
  sat[i] = Math.max(r, g, b) - Math.min(r, g, b); lum[i] = (r + g + b) / 3;
}
const passable = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x, o = i * 4;
  const kx = Math.floor(x / P), ky = Math.floor(y / P);
  const isW = (((kx + ky) & 1) ^ par[ky * NX + kx]) === 1;
  if (near(o, isW ? WHITE : GRAY, 18)) { passable[i] = 1; continue; }
  const fx = x / P - kx, fy = y / P - ky;
  const edge = Math.min(fx, 1 - fx) * P < 1.6 || Math.min(fy, 1 - fy) * P < 1.6;
  if (edge && sat[i] <= 12 && lum[i] >= 135 && lum[i] <= 252) { passable[i] = 1; continue; }
  if (sat[i] > 8 || lum[i] < 130) continue;
  let flat = true;
  for (let c = 0; c < 3 && flat; c++) {
    let lo = 255, hi = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const nx = Math.min(W - 1, Math.max(0, x + dx)), ny = Math.min(H - 1, Math.max(0, y + dy));
      const v = src[(ny * W + nx) * 4 + c];
      if (v < lo) lo = v; if (v > hi) hi = v;
    }
    if (hi - lo > 12) flat = false;
  }
  if (flat) passable[i] = 1;
}

// Le fond est ce qui est « du fond » ET relié au bord de l'image : un aplat
// neutre enfermé dans le bâtiment (une marche, une baie) n'est pas du fond.
const alpha0 = new Uint8Array(W * H).fill(255);
const visited = new Uint8Array(W * H);
const stack = [];
const push = (x, y) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = y * W + x;
  if (visited[i]) return;
  visited[i] = 1;
  if (passable[i]) { alpha0[i] = 0; stack.push([x, y]); }
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
// référence) n'alternait pas assez pour l'ancien test de période : elle restait
// « contenu ». (Depuis la phase 2, le nouveau détourage et l'effacement des
// îlots l'enlèvent d'eux-mêmes ; la gomme reste, par prudence et parce qu'elle
// ne coûte rien.) Elle avait été GOMMÉE À LA MAIN dans l'ancien PNG de 384 px —
// 388 px mis à alpha 0, retrouvés le 2026-09-25 en regénérant l'ancien script,
// qui ne reproduisait plus le fichier versionné. La gomme vit désormais ICI,
// sinon chaque regénération la ferait revenir. ⚠️ Vérifié le même jour : ce
// rectangle ne contient AUCUN pixel du bâtiment (sa plus grande composante).
const ERASE = { x0: 958, y0: 75, x1: 985, y1: 276 };
for (let y = ERASE.y0; y <= ERASE.y1; y++) for (let x = ERASE.x0; x <= ERASE.x1; x++) alpha0[y * W + x] = 0;

// ---- 4. LES ÎLOTS : tout ce qui reste opaque sans toucher le bâtiment.
// Des cases de damier que la parité propagée ne prévoit pas (la rangée
// irrégulière du bas, y≈957, peinte en demi-cases), des points aux coins des
// cases où le JPEG mélange les deux tons. Tous NEUTRES (saturation moyenne
// ≤ 11, mesuré sur les 611 îlots du 2026-09-25) — le bâtiment, lui, est d'un
// seul tenant (728 958 px), et depuis le nouveau détourage le lanternon et
// les statuettes de la balustrade y sont RATTACHÉS.
// ⚠️ D'où la règle : on efface tout îlot neutre, quelle que soit sa taille ou
// sa distance au bâtiment. L'ancienne règle (« < 20 px et à plus de 3 px »)
// protégeait des morceaux de lanternon détachés, qui n'existent plus ; elle
// laissait en revanche des cases entières collées au piédestal. Un îlot
// COLORÉ serait du décor détaché : on le garde, et on le signale — sauf sous
// 5 px, où ce n'est qu'un grain de JPEG (un seul, 2 px, près du dôme).
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
  const satSum = new Float64Array(sizes.length);
  for (let i = 0; i < W * H; i++) if (comp[i] >= 0) satSum[comp[i]] += sat[i];
  const kill = new Uint8Array(sizes.length);
  let nk = 0, pk = 0;
  for (let c = 0; c < sizes.length; c++) {
    if (c === main) continue;
    if (satSum[c] / sizes[c] <= 12 || sizes[c] < 5) { kill[c] = 1; nk++; pk += sizes[c]; }
    else console.warn(`⚠️ îlot coloré gardé (décor détaché ?) : ${sizes[c]} px, boîte ${boxes[c].join(",")}`);
  }
  for (let i = 0; i < W * H; i++) if (comp[i] >= 0 && kill[comp[i]]) alpha0[i] = 0;
  console.log(`îlots effacés : ${nk}, ${pk} px (bâtiment : ${sizes[main]} px, intact)`);
}

// ---- 4 bis. LES BAIES DU LANTERNON. Entre ses colonnes, la référence montre
// le damier (blanc en haut, gris en bas) : Gemini a peint un lanternon À
// JOUR. En jeu, ce qu'on verrait au travers serait l'herbe DERRIÈRE le
// bâtiment — un lanternon posé sur un dôme ne laisse pas voir le sol. On
// fonce donc les trois baies vers l'ombre de leurs propres arcs (échantillonnée
// en haut de la baie centrale), en proportion de la clarté du pixel : le fond
// pur devient l'ombre, les bords déjà mélangés au cerne gardent leur mélange.
// ⚠️ Trois rectangles MESURÉS sur la référence (carte des tons du 2026-09-25),
// pas une détection : une détection par la couleur du damier y attrapait aussi
// les reflets de la coupole et des colonnes.
{
  const BAYS = [{ x0: 525, y0: 81, x1: 528, y1: 97 }, { x0: 539, y0: 82, x1: 548, y1: 97 }, { x0: 560, y0: 81, x1: 562, y1: 97 }];
  const SHADE = [60, 57, 68];
  let n = 0;
  for (const B of BAYS) for (let y = B.y0; y <= B.y1; y++) for (let x = B.x0; x <= B.x1; x++) {
    const i = y * W + x, o = i * 4;
    if (sat[i] > 12 || lum[i] < 120) continue;
    const t = Math.min(1, Math.max(0, (lum[i] - 90) / 150));
    for (let c = 0; c < 3; c++) src[o + c] = Math.round(src[o + c] * (1 - t) + SHADE[c] * t);
    alpha0[i] = 255; n++;
  }
  console.log(`baies du lanternon foncées : ${n} px`);
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
