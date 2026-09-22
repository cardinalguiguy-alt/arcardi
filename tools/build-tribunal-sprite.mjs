// Pipeline C (§9 CLAUDE.md) — TROISIÈME usage, sur le modèle de
// build-eglise-sprite.mjs. Transforme refs/tributribu.jpg (JPEG sans alpha,
// damier peint en pixels) en public/town/courthouse-day.png.
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
const OUT_DAY = "public/town/courthouse-day.png";
// Stocké en plus grand que l'affichage (192 px, comme l'église) pour donner
// de vraies données à la mise à l'échelle plutôt que d'agrandir un pixel art
// déjà petit — voir dispScale dans drawCourthouseBitmap (FermeGame.js).
const TARGET_W = 384;

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

const scale = TARGET_W / CW;
const DW = TARGET_W, DH = Math.round(CH * scale);
const dayPng = new PNG({ width: DW, height: DH });

for (let dy = 0; dy < DH; dy++) {
  const sy0 = CROP.y0 + Math.floor(dy / scale), sy1 = CROP.y0 + Math.floor((dy + 1) / scale);
  for (let dx = 0; dx < DW; dx++) {
    const sx0 = CROP.x0 + Math.floor(dx / scale), sx1 = CROP.x0 + Math.floor((dx + 1) / scale);
    let rs = 0, gs = 0, bs = 0, aSum = 0, n = 0;
    for (let sy = sy0; sy < Math.max(sy1, sy0 + 1) && sy < CROP.y1; sy++) {
      for (let sx = sx0; sx < Math.max(sx1, sx0 + 1) && sx < CROP.x1; sx++) {
        const si = sy * W + sx, so = si * 4;
        rs += src[so]; gs += src[so + 1]; bs += src[so + 2]; aSum += alpha0[si]; n++;
      }
    }
    n = Math.max(1, n);
    const di = (dy * DW + dx) * 4;
    dayPng.data[di] = Math.round(rs / n); dayPng.data[di + 1] = Math.round(gs / n); dayPng.data[di + 2] = Math.round(bs / n);
    dayPng.data[di + 3] = Math.round(aSum / n);
  }
}

writeFileSync(OUT_DAY, PNG.sync.write(dayPng));
console.log(`Sortie : ${DW}x${DH}`);
console.log(`Écrit : ${OUT_DAY}`);
