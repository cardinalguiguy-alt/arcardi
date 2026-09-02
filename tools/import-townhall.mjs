// Outillage d'import bitmap (pipeline C, §9 de CLAUDE.md) — PREMIER USAGE.
// hdv.jpg (refs/) est un JPEG sans canal alpha : son "fond transparent" est un
// damier peint en pixels, pas une vraie transparence (Gemini ne propose pas
// l'export PNG dans cette interface). Ce script :
//   1. décode le JPEG (jpeg-js, pur JS, pas de dépendance native) ;
//   2. remplace le damier par une vraie transparence, par remplissage par
//      diffusion depuis les bords de l'image — les bords sont toujours du
//      fond (le bâtiment ne touche jamais le cadre), donc la diffusion
//      s'arrête d'elle-même à la silhouette du bâtiment ;
//   3. écrit un PNG intermédiaire à pleine résolution pour vérification
//      visuelle AVANT tout découpage jour/nuit ou redimensionnement.
//
// Usage : node tools/import-townhall.mjs
import { readFileSync, writeFileSync } from "node:fs";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";

const SRC = "refs/hdv.jpg";
const OUT_ALPHA = "tools/out/townhall-alpha-check.png";
const OUT_MASK = "tools/out/townhall-mask-check.png"; // le masque seul, pour juger la découpe

const raw = readFileSync(SRC);
const img = jpeg.decode(raw, { useTArray: true, formatAsRGBA: true });
const { width: W, height: H, data } = img; // RGBA, data.length = W*H*4

// ---- 1. Détection du damier : deux teintes de gris quasi neutre (R≈G≈B),
// alternées en cases. On ne fige PAS les deux couleurs à la main (elles
// varient légèrement selon la compression JPEG) : un pixel est "damier" s'il
// est quasi neutre (faible écart entre canaux) ET clair (luminance > seuil),
// ce qui exclut la brique (rouge saturé), l'ardoise (bleu-gris foncé), le
// dôme (vert), le bois (brun) — tout ce qui compose le bâtiment est soit
// saturé, soit sombre.
function isCheckerish(r, g, b) {
  const maxc = Math.max(r, g, b), minc = Math.min(r, g, b);
  const sat = maxc - minc; // écart entre canaux : 0 = gris pur
  const lum = (r + g + b) / 3;
  return sat < 18 && lum > 150; // gris clair et quasi neutre
}

const alpha = new Uint8Array(W * H).fill(255); // 255 = opaque au départ
const visited = new Uint8Array(W * H);
const stack = [];
const push = (x, y) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = y * W + x;
  if (visited[i]) return;
  visited[i] = 1;
  const o = i * 4;
  if (isCheckerish(data[o], data[o + 1], data[o + 2])) { alpha[i] = 0; stack.push([x, y]); }
};
// Amorce depuis les quatre bords entiers.
for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
while (stack.length) {
  const [x, y] = stack.pop();
  push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
}

let minX = W, minY = H, maxX = 0, maxY = 0, kept = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x;
  if (alpha[i] !== 0) {
    kept++;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
}
console.log(`Image source : ${W}x${H}`);
console.log(`Bbox du bâtiment (alpha != 0) : x[${minX}..${maxX}] y[${minY}..${maxY}] -> ${maxX - minX + 1}x${maxY - minY + 1} px`);
console.log(`Pixels gardés : ${kept} / ${W * H} (${(100 * kept / (W * H)).toFixed(1)}%)`);

// ---- 2. Écrit le PNG alpha-corrigé (pleine résolution, pour vérification).
const png = new PNG({ width: W, height: H });
for (let i = 0; i < W * H; i++) {
  const o = i * 4;
  png.data[o] = data[o]; png.data[o + 1] = data[o + 1]; png.data[o + 2] = data[o + 2];
  png.data[o + 3] = alpha[i];
}
writeFileSync(OUT_ALPHA, PNG.sync.write(png));
console.log(`Écrit : ${OUT_ALPHA}`);

// ---- 3. Le masque seul (blanc = gardé, noir = retiré) : sert à repérer d'un
// coup d'œil les trous laissés par la diffusion (verre de fenêtre trop clair
// classé "damier" par erreur, par exemple).
const pngMask = new PNG({ width: W, height: H });
for (let i = 0; i < W * H; i++) {
  const o = i * 4, v = alpha[i];
  pngMask.data[o] = v; pngMask.data[o + 1] = v; pngMask.data[o + 2] = v; pngMask.data[o + 3] = 255;
}
writeFileSync(OUT_MASK, PNG.sync.write(pngMask));
console.log(`Écrit : ${OUT_MASK}`);
