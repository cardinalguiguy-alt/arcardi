// Pipeline C (§9 CLAUDE.md) — LES FAÇADES MOUILLÉES DES BÂTIMENTS PEINTS (2026-11-21).
//
// Guillaume (2026-11-21) : « rendre les maisons moins gemini like, et plus intégrées au reste du paysage ». Sous la pluie, le sol de la
// ville fonce, ses joints et ses creux se remplissent (`pluie.js`) — et les maisons peintes restaient SÈCHES, trottoir peint compris :
// une image posée sur un décor qui vit. Pour chaque maison, chaque commerce et chaque monument peints, et pour chaque cran de zoom, UN
// calque posé par-dessus l'image de jour, que le jeu dose selon le mouillé du sol (`wetP.wet`) :
//   · `-wet-z<N>.png` — une teinte sombre et froide (`WET_RGB`), dont l'OPACITÉ dit où l'eau prend :
//       – le TOIT fonce un peu plus que le mur (l'ardoise et la tuile mouillées) ;
//       – le MUR fonce, MAIS PAS SOUS L'ÉGOUT : une bande sèche sous le débord du toit (`SHELTER`), qui s'humidifie en descendant —
//         c'est ce qui fait lire une vraie averse ;
//       – le PIED DU MUR fonce davantage (les éclaboussures, l'eau qui remonte : `SPLASH`) ;
//       – le TROTTOIR PEINT sous le mur fonce comme un pavé mouillé (`GROUND`) : il était le seul sol sec de la rue ;
//       – des COULURES sous les appuis de fenêtre et sous le bord du toit (fines, à la grille du cran, tirées d'un hachage : la même
//         maison coule toujours au même endroit) ;
//       – les VITRES ne foncent presque pas (le verre mouillé reste du verre) et gardent leur lumière la nuit (le calque passe AVANT
//         celui de nuit).
// RIEN N'EST RECOPIÉ : le toit se lit dans le calque de neige épaisse (`-snowh-`, `build-snow-roofs.mjs` y a déjà séparé la matière
// du toit), les vitres dans le calque de nuit (`-glow-`), le pied du mur dans la table du modèle (`foot`, `crop`). Écrit À PARTIR DES
// IMAGES VERSIONNÉES (une retouche du jour à la main serait perdue si l'on repartait de la référence — même règle que la neige).
// Désactivable : menu dev, « Ajouts de la nuit du 21 novembre » (`AJOUTS.wetFacades`, FermeGame.js).
//
// Usage : node tools/build-wet-facades.mjs   (planche : tools/out/facades-mouillees.png)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { fermeConstants: C } = await loadFerme(ROOT, ["fermeConstants"]);

export const WET = { RGB: [16, 20, 28], ROOF: 0.2, WALL: 0.15, GLASS: 0.03, GROUND: 0.24, SHELTER: 0.05, SPLASH: 0.12, SPLASH_K: 0.45,
  STREAK: 0.09, STREAK_L: [0.02, 0.07], DRIP: 0.06, DRIP_EVERY: 0.07 };
const hash = (x, y, s) => { let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul((y | 0) + 0x165667b1, 0x85ebca77) ^ Math.imul(s | 0, 0xc2b2ae3d); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) / 4294967296; };
const read = (u) => { const f = path.join(ROOT, "public", u); return existsSync(f) ? PNG.sync.read(readFileSync(f)) : null; };

/* Le pied du mur, en fraction de l'image (null : un monument, sans trottoir peint sous lui). */
function footFrac(b) {
  const id = b.house || b.shop;
  if (!id) return null;
  const M = b.house ? C.TOWN_HOUSE_MODELS[id.model] : C.TOWN_SHOP_MODELS[id.model];
  const V = M && M.variants[id.variant];
  if (!M || !V || M.foot == null) return null;
  return (M.foot - V.crop[1]) / V.crop[3];
}

function wetLayer(day, glow, snowH, foot, z) {
  const W = day.width, H = day.height, out = new PNG({ width: W, height: H });
  const A = (img, x, y) => (img && x >= 0 && y >= 0 && x < img.width && y < img.height ? img.data[(y * img.width + x) * 4 + 3] : 0);
  const roofAt = (x, y) => A(snowH, x, y) > 0;
  const glassAt = (x, y) => A(glow, x, y) > 30;
  const footY = foot == null ? H + 1 : Math.round(foot * H);
  // l'égout, colonne par colonne : le pixel de toit le plus bas dans les deux tiers hauts de l'image
  const eave = new Int32Array(W).fill(-1);
  for (let x = 0; x < W; x++) for (let y = Math.floor(H * 0.7); y >= 0; y--) if (roofAt(x, y)) { eave[x] = y; break; }
  const S = Math.max(2, Math.round(WET.SHELTER * H)), SP = Math.max(2, Math.round(WET.SPLASH * H));
  const alpha = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const a0 = day.data[(y * W + x) * 4 + 3];
    if (a0 < 8) continue;
    let a;
    if (roofAt(x, y)) a = WET.ROOF;
    else if (glassAt(x, y)) a = WET.GLASS;
    else if (y >= footY) a = WET.GROUND;
    else {
      a = WET.WALL;
      if (eave[x] >= 0 && y > eave[x] && y - eave[x] < S) a *= 0.25 + 0.75 * (y - eave[x]) / S;      // la bande sèche sous l'égout
      if (footY - y < SP) a *= 1 + WET.SPLASH_K * (1 - (footY - y) / SP);                             // le pied éclaboussé
    }
    alpha[y * W + x] = a * (a0 / 255);
  }
  // LES COULURES : sous le bas de chaque vitre (le verre au-dessus, le mur dessous), par filets de la largeur d'un pixel d'art
  const sw = Math.max(1, Math.round(z * 0.6));
  const streak = (x0, y0, L, k) => {
    for (let dx = 0; dx < sw; dx++) for (let d = 0; d < L; d++) {
      const x = x0 + dx, y = y0 + d;
      if (x < 0 || x >= W || y >= Math.min(H, footY)) break;
      if (day.data[(y * W + x) * 4 + 3] < 128 || glassAt(x, y) || roofAt(x, y)) break;
      alpha[y * W + x] += k * (1 - d / L) * (dx === 0 || sw === 1 ? 1 : 0.6);
    }
  };
  for (let x = 0; x < W; x += sw) for (let y = 1; y < Math.min(H, footY); y++) {
    if (!(glassAt(x, y - 1) && !glassAt(x, y))) continue;
    if (hash(Math.floor(x / sw), y, 7) > 0.15) continue;   // trois ou quatre filets par appui, pas un rideau
    const L = Math.round(H * (WET.STREAK_L[0] + (WET.STREAK_L[1] - WET.STREAK_L[0]) * hash(x, y, 11)));
    // sous l'appui (deux ou trois pixels de cadre sous le verre) : on commence au premier pixel de mur
    let y0 = y; while (y0 < Math.min(H, footY) - 1 && y0 - y < 4 * sw && !(day.data[(y0 * W + x) * 4 + 3] > 128)) y0++;
    streak(x, y0, L, WET.STREAK);
  }
  // les gouttes du bord du toit : une coulure courte tous les ~7 % de la largeur, là où un égout existe
  const step = Math.max(sw * 2, Math.round(WET.DRIP_EVERY * W));
  for (let x = Math.round(step / 2); x < W; x += step) {
    const xx = x + Math.round((hash(x, 3, 19) - 0.5) * step * 0.6);
    if (xx < 0 || xx >= W || eave[xx] < 0) continue;
    streak(xx, eave[xx] + 1, Math.round(H * (0.02 + 0.03 * hash(xx, 5, 23))), WET.DRIP);
  }
  for (let i = 0; i < W * H; i++) {
    const a = Math.min(0.5, alpha[i]);
    if (a <= 0) continue;
    out.data[i * 4] = WET.RGB[0]; out.data[i * 4 + 1] = WET.RGB[1]; out.data[i * 4 + 2] = WET.RGB[2]; out.data[i * 4 + 3] = Math.round(a * 255);
  }
  return out;
}

const sheetRows = [];
let n = 0;
for (const [key, b] of Object.entries(C.TOWN_BITMAPS)) {
  if (!b.wet || !b.snowH) continue;
  const foot = footFrac(b);
  for (const z of b.zooms) {
    const mip = C.townBitmapMip(b, z);
    const day = read(mip.day);
    if (!day) { console.log("absent :", mip.day); continue; }
    const L = wetLayer(day, mip.glow && read(mip.glow), read(mip.snowH), foot, z);
    writeFileSync(path.join(ROOT, "public", mip.wet), PNG.sync.write(L));
    n++;
    if (z === 3) sheetRows.push({ key, day, L });
  }
}
console.log(n, "calques écrits");
/* LA PLANCHE (cran 3) : sec, mouillé, sur un pavé gris. */
{
  const pad = 8, cw = Math.max(...sheetRows.map((o) => o.day.width)), chh = Math.max(...sheetRows.map((o) => o.day.height));
  const cols = 4, rows = Math.ceil(sheetRows.length / 2);
  const PW = cols * (cw + pad) + pad, PH = rows * (chh + pad) + pad;
  const sheet = new PNG({ width: PW, height: PH });
  for (let i = 0; i < PW * PH; i++) { sheet.data[i * 4] = 120; sheet.data[i * 4 + 1] = 124; sheet.data[i * 4 + 2] = 120; sheet.data[i * 4 + 3] = 255; }
  const blit = (src, ox, oy) => {
    for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
      const s = (y * src.width + x) * 4, a = src.data[s + 3] / 255;
      if (!a) continue;
      const o = ((oy + y) * PW + ox + x) * 4;
      for (let k = 0; k < 3; k++) sheet.data[o + k] = Math.round(src.data[s + k] * a + sheet.data[o + k] * (1 - a));
    }
  };
  sheetRows.forEach((o, i) => {
    const r = Math.floor(i / 2), c0 = (i % 2) * 2, oy = pad + r * (chh + pad);
    blit(o.day, pad + c0 * (cw + pad), oy);
    blit(o.day, pad + (c0 + 1) * (cw + pad), oy); blit(o.L, pad + (c0 + 1) * (cw + pad), oy);
  });
  mkdirSync(path.join(ROOT, "tools", "out"), { recursive: true });
  writeFileSync(path.join(ROOT, "tools", "out", "facades-mouillees.png"), PNG.sync.write(sheet));
  console.log("planche : tools/out/facades-mouillees.png");
}
