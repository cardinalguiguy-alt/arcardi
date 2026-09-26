// Pipeline C (§9 CLAUDE.md) — LES MAISONS PEINTES DE VALLEY TOWN (phase 6a,
// 2026-09-26). Une image Gemini par maison et par version (simple, enrichie,
// riche — plus la ruine hantée), détourée de son fond MAGENTA, puis une image
// par cran de zoom à sa taille d'écran exacte (`tools/lib-mip.mjs`), jour ET
// calque de nuit, tirés du même rééchantillonnage (alignés au pixel).
//
// Tout ce que le script sait vient de `TOWN_HOUSE_MODELS` (fermeConstants.js) :
// la référence, le cadre, les vitres. Le JEU lit la même table pour poser
// l'image (porte, pied du mur) et allumer les fenêtres une à une — une vitre
// décrite à deux endroits serait deux vitres au premier réglage (§8).
//
// ⚠️ LE FOND MAGENTA SE DÉTOURE PAR SA COULEUR MESURÉE, PAS PAR #FF00FF : Gemini
// le peint entre (238,0,236) et (254,1,252) selon l'image, et le JPEG y ajoute
// ±4 de bruit. L'alpha suit la distance à CE fond (rampe douce : le bord d'une
// peinture est un mélange, pas une marche) ; la couleur d'un pixel de bord est
// DÉMÉLANGÉE du fond (c − (1 − a)·fond) / a — sans ça le liseré rose du JPEG
// (vu au premier montage, 8 000 px autour de S1) passe dans le jeu.
// ⚠️ Les fleurs violettes et roses de la version riche restent loin du fond
// (distance > 140, mesuré) : elles ne sont pas mangées. Les prompts les
// interdisent désormais de toute façon.
//
// Usage : node tools/build-maison-sprites.mjs   (planche : tools/out/maisons.png)
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import { loadFerme } from "./lib-canvas.mjs";
import { resample, writeMips } from "./lib-mip.mjs";
import { lum, clamp, smooth, darkPane, lanternGlass, hashi, LAMPS, SILS, shadePane } from "./lib-glow.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { fermeConstants: C } = await loadFerme(ROOT, ["fermeConstants"]);

// La rampe d'alpha, en distance RVB au fond mesuré : sous 38, c'est du fond
// (bruit JPEG compris) ; au-delà de 95, c'est la maison.
const KEY_LO = 38, KEY_HI = 95;

/* Une vitre de maison, quelle que soit la version : le verre sombre s'allume
   en gardant ses croisillons (`darkPane`, la recette des monuments), le
   voilage clair des riches s'éclaire par derrière, un rideau chaud aussi ; le
   plomb et le bois restent le dessin. */
function housePane(r, g, b, fy, med) {
  const L = lum(r, g, b);
  const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(1, Math.max(r, g, b));
  if (L < 30) return [r, g, b, 0.12];                               // plomb, croisillon noir
  if (b >= r - 8 && L < 150) return darkPane(r, g, b, fy, 150, med); // le verre
  if (L >= 150 && sat < 0.3) return [255, 228 - 10 * fy, 182 - 20 * fy, 0.82]; // voilage
  if (r > b + 10 && L > 100) {                                      // rideau
    const k = Math.min(1.7, 215 / Math.max(1, Math.max(r, g, b)));
    return [r * k, g * k * 1.05, b * k * 0.9, 0.85];
  }
  return null;                                                      // le cadre, le bois
}
// La lueur de la maison hantée : ce qui est sombre derrière la vitre brisée
// devient une lumière FROIDE, qui ne ressemble à aucune lampe de la ville.
function ghostPane(r, g, b) {
  const L = lum(r, g, b);
  const a = 0.9 * (1 - smooth(70, 120, L));
  return a < 0.02 ? null : [150 + L * 0.3, 215 + L * 0.15, 255, a];
}

const report = [], previews = [];
const modelKeys = Object.keys(C.TOWN_HOUSE_MODELS);
for (const [mk, M] of Object.entries(C.TOWN_HOUSE_MODELS)) {
  for (const [vk, V] of Object.entries(M.variants)) {
    const SB = C.TOWN_BITMAPS[C.townHouseBitmapKey(mk, vk)];
    const img = jpeg.decode(readFileSync(path.join(ROOT, V.src)), { useTArray: true, formatAsRGBA: true });
    const { width: SW, height: SH, data: src } = img;
    // 1. Le fond, mesuré dans le coin haut-gauche (jamais de maison là).
    const samp = [[], [], []];
    for (let y = 5; y < 40; y++) for (let x = 5; x < 150; x++) for (let c = 0; c < 3; c++) samp[c].push(src[(y * SW + x) * 4 + c]);
    const bg = samp.map(a => a.sort((p, q) => p - q)[a.length >> 1]);
    // 2. Le cadre, et ce qui en déborderait (un cadre trop serré couperait la maison).
    const [cx0, cy0, CW, CH] = V.crop;
    let outside = 0;
    const alphaAt = (x, y) => {
      const o = (y * SW + x) * 4;
      const d = Math.hypot(src[o] - bg[0], src[o + 1] - bg[1], src[o + 2] - bg[2]);
      return smooth(KEY_LO, KEY_HI, d);
    };
    for (let y = 2; y < SH - 2; y++) for (let x = 2; x < SW - 2; x++) {
      if (x >= cx0 && x < cx0 + CW && y >= cy0 && y < cy0 + CH) continue;
      if (alphaAt(x, y) > 0.5) outside++;
    }
    // 3. Les plans prémultipliés du jour, démélangés du fond sur les bords.
    const day = [0, 1, 2, 3].map(() => new Float32Array(CW * CH));
    const rgbAt = new Float32Array(CW * CH * 3);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      const sx = cx0 + x, sy = cy0 + y, i = y * CW + x;
      if (sx < 0 || sy < 0 || sx >= SW || sy >= SH) continue;
      const o = (sy * SW + sx) * 4, a = alphaAt(sx, sy);
      for (let c = 0; c < 3; c++) {
        const v = a >= 0.999 ? src[o + c] : clamp((src[o + c] - (1 - a) * bg[c]) / Math.max(a, 0.35), 0, 255);
        rgbAt[i * 3 + c] = v;
        day[c][i] = v * a;
      }
      day[3][i] = a;
    }
    /* 3 bis. ⚠️ LE LISERÉ MAGENTA QUE LE DÉMÉLANGE NE VOIT PAS. Le JPEG sous-
       échantillonne la couleur : le cerne sombre qui borde la maison est OPAQUE
       (alpha 1, rien à démélanger) et pourtant teinté de magenta sur 2 à 4 px —
       vu sur la première planche, un liseré violet autour de chaque toit et du
       lierre de la ruine. Près du fond (5 px), on retire la part « magenta »
       d'un pixel : ce que le rouge ET le bleu ont en commun au-dessus du vert.
       Un vrai violet posé au bord (une fleur) grisonne : c'est le prix, et les
       prompts n'en veulent plus. */
    {
      let near = new Uint8Array(CW * CH);
      for (let i = 0; i < CW * CH; i++) near[i] = day[3][i] < 0.5 ? 1 : 0;
      for (let pass = 0; pass < 5; pass++) {
        const nx = near.slice();
        for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
          const i = y * CW + x;
          if (near[i]) continue;
          if ((x > 0 && near[i - 1]) || (x < CW - 1 && near[i + 1]) || (y > 0 && near[i - CW]) || (y < CH - 1 && near[i + CW])) nx[i] = 1;
        }
        near = nx;
      }
      for (let i = 0; i < CW * CH; i++) {
        if (!near[i] || day[3][i] <= 0) continue;
        const r = rgbAt[i * 3], g = rgbAt[i * 3 + 1], b = rgbAt[i * 3 + 2];
        const ex = Math.min(r, b) - g;
        if (ex <= 0) continue;
        rgbAt[i * 3] = r - ex; rgbAt[i * 3 + 2] = b - ex;
        day[0][i] = rgbAt[i * 3] * day[3][i]; day[2][i] = rgbAt[i * 3 + 2] * day[3][i];
      }
    }
    // 4. Le calque de nuit : les vitres de CETTE version, une recette par sorte.
    const wins = C.townHouseWins(mk, vk);
    const glow = [0, 1, 2, 3].map(() => new Float32Array(CW * CH));
    let lit = 0;
    wins.forEach((w, wi) => {
      const st = { lamp: LAMPS[hashi(modelKeys.indexOf(mk) * 17 + 3, wi) % LAMPS.length],
                   k: 0.8 + 0.2 * (hashi(wi * 7 + 1, mk.length) % 100) / 99,
                   sil: hashi(wi + 11, modelKeys.indexOf(mk)) % 3 === 0 ? SILS[hashi(wi, 5) % SILS.length] : null };
      const x0 = w.x - cx0, y0 = w.y - cy0, wh = w.h;
      const Ls = [];
      for (let y = y0; y < y0 + wh; y++) for (let x = x0; x < x0 + w.w; x++) {
        if (x < 0 || y < 0 || x >= CW || y >= CH) continue;
        const i = y * CW + x, r = rgbAt[i * 3], g = rgbAt[i * 3 + 1], b = rgbAt[i * 3 + 2], L = lum(r, g, b);
        if (b >= r - 8 && L <= 150) Ls.push(L);
      }
      Ls.sort((p, q) => p - q);
      const med = Ls.length ? Ls[Ls.length >> 1] : null;
      for (let y = y0; y < y0 + wh; y++) for (let x = x0; x < x0 + w.w; x++) {
        if (x < 0 || y < 0 || x >= CW || y >= CH) continue;
        const i = y * CW + x;
        if (day[3][i] < 0.5) continue;
        const r = rgbAt[i * 3], g = rgbAt[i * 3 + 1], b = rgbAt[i * 3 + 2];
        const u = (x - x0) / w.w, v = (y - y0) / wh;
        let px = w.lamp ? lanternGlass(r, g, b) : w.ghost ? ghostPane(r, g, b) : housePane(r, g, b, v, med);
        if (!px || px[3] <= 0.01) continue;
        if (!w.lamp && !w.ghost && px[3] > 0.5 && px[2] < 200) px = shadePane(px, st, u, v, true);
        const a = clamp(px[3], 0, 1) * day[3][i];
        for (let c = 0; c < 3; c++) glow[c][i] = clamp(px[c], 0, 255) * a;
        glow[3][i] = a;
        lit++;
      }
    });
    const done = writeMips(ROOT, SB, C.townBitmapMip, day, glow, CW, CH);
    report.push(`${mk}/${vk} : cadre ${CW}x${CH}, fond (${bg.join(",")}), ${outside} px hors cadre, ${wins.length} vitre(s), ${lit} px allumés`);
    for (const d of done) report.push("   " + d);
    // La planche : le cran 3, jour puis nuit.
    const m3 = C.townBitmapMip(SB, 3);
    previews.push({ label: `${mk}/${vk}`, day: PNG.sync.read(readFileSync(path.join(ROOT, "public", m3.day))),
                    glow: PNG.sync.read(readFileSync(path.join(ROOT, "public", m3.glow))) });
  }
}
for (const l of report) console.log(l);

{
  const NIGHT = [0.30, 0.35, 0.56], PAD = 12;
  const PW = previews.reduce((s, p) => s + p.day.width + PAD, PAD), PH = previews.reduce((m, p) => Math.max(m, p.day.height), 0) * 2 + PAD * 3;
  const sheet = new PNG({ width: PW, height: PH });
  for (let i = 0; i < PW * PH; i++) { sheet.data[i * 4] = 92; sheet.data[i * 4 + 1] = 124; sheet.data[i * 4 + 2] = 70; sheet.data[i * 4 + 3] = 255; }
  let ox = PAD;
  for (const p of previews) {
    const W = p.day.width, H = p.day.height, top = PH / 2 - PAD / 2 - H;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4, a = p.day.data[o + 3] / 255;
      if (a <= 0) continue;
      const put = (py, rgb) => { const d = (py * PW + ox + x) * 4; for (let c = 0; c < 3; c++) sheet.data[d + c] = clamp(Math.round(rgb[c] * a + sheet.data[d + c] * (1 - a)), 0, 255); };
      put(top + y, [p.day.data[o], p.day.data[o + 1], p.day.data[o + 2]]);
      const ga = p.glow.data[o + 3] / 255 / Math.max(a, 1e-3);
      put(top + H + PAD + y, [0, 1, 2].map(c => p.day.data[o + c] * NIGHT[c] * (1 - ga) + p.glow.data[o + c] * ga));
    }
    ox += W + PAD;
  }
  const f = path.join(ROOT, "tools", "out", "maisons.png");
  writeFileSync(f, PNG.sync.write(sheet));
  console.log("planche :", path.relative(ROOT, f));
}
