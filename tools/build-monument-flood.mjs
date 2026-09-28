// Pipeline C (§9 CLAUDE.md) — LA MISE EN LUMIÈRE DES FAÇADES DES TROIS
// MONUMENTS (2026-09-28).
//
// Guillaume : « les vitraux de l'église de nuit sont trop irréalistes, flashy ;
// prévoir plutôt un éclairage de la façade, comme cela se fait à Bordeaux ou
// Paris » — puis : les trois monuments, dosés (l'église en pleine lumière, la
// mairie et le tribunal plus discrets) ; or chaud (Bordeaux) ; toute la nuit ;
// les vitraux en lueur chaude, couleurs éteintes (build-monument-glow.mjs).
//
// Écrit public/town/<monument>-flood-z<N>.png, À PARTIR DES IMAGES DE JOUR
// VERSIONNÉES (même raison que build-monument-glow : une retouche à la main du
// jour serait effacée si l'on repartait de la référence). Le jeu l'AJOUTE
// après la nuit (`lighter`), comme le calque des vitres, mais à part : il ne
// vacille pas avec les cierges et ne s'éteint pas avec les pièces vides — un
// projecteur n'a pas d'heure de bureau.
//
// LA LUMIÈRE. Des projecteurs posés sur la peinture, en FRACTIONS de l'image
// (donc justes à tous les crans) : au pied des contreforts, du portail, des
// colonnes — et quelques-uns plus haut, sur une corniche, pour les flèches et
// les frontons. Chacun éclaire VERS LE HAUT : un point chaud juste au-dessus de
// lui, un cône qui s'élargit en montant et s'éteint avec la hauteur. La somme
// est adoucie (1 − e^−Σ) : deux cônes qui se croisent ne brûlent pas la pierre.
// Un léger fond (le reflet du parvis) empêche le noir franc entre deux cônes.
// ⚠️ LA PIERRE GARDE SON DESSIN : la lumière MULTIPLIE la couleur du jour, et
// les recoins sombres de la peinture (joints, ombres des voussures) le restent
// — c'est ce qui fait une façade éclairée par en dessous plutôt qu'un aplat
// orange. Les VITRES n'en reçoivent pas (elles ont leur lueur, et un projecteur
// ne traverse pas un vitrail).
//
// Usage : node tools/build-monument-flood.mjs   (planche : tools/out/monuments-facade.png)
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { loadFerme } from "./lib-canvas.mjs";
import { lum, clamp, smooth } from "./lib-glow.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { fermeConstants: C, lumiere: LM } = await loadFerme(ROOT, ["fermeConstants", "lumiere"]);

/* L'or chaud des façades de Bordeaux : on garde le rouge, on retient le vert,
   on coupe le bleu de moitié. `GAIN` compense la levée du jeu (`1 − lum(ciel)`,
   ≈ 0,65 la nuit) : à pleine intensité, la pierre retrouve à peu près sa
   valeur de jour, dorée. */
const WARM = [1.0, 0.8, 0.5], GAIN = 1.55, AMBIENT = 0.1;
/* Les projecteurs : x, y (fractions de l'image : le point de la lampe), reach
   (la hauteur, en fraction, où la lumière est tombée à ~30 %), w (la
   demi-largeur du faisceau à sa base), spread (son ouverture en montant), k. */
const P = (x, y, reach, w, spread, k) => ({ x, y, reach, w, spread, k });
const LIGHTS = {
  church: [
    // Le portail et le pignon au-dessus de lui.
    P(0.50, 0.975, 0.62, 0.05, 0.12, 1.0),
    // Le pied des deux tours (contreforts de part et d'autre de chaque tour).
    P(0.255, 0.975, 0.72, 0.035, 0.08, 1.0), P(0.385, 0.975, 0.72, 0.035, 0.08, 0.95),
    P(0.615, 0.975, 0.72, 0.035, 0.08, 0.95), P(0.745, 0.975, 0.72, 0.035, 0.08, 1.0),
    // Les bas-côtés et les arcs-boutants, plus doux.
    P(0.06, 0.975, 0.5, 0.03, 0.07, 0.7), P(0.15, 0.975, 0.5, 0.03, 0.07, 0.75),
    P(0.85, 0.975, 0.5, 0.03, 0.07, 0.75), P(0.94, 0.975, 0.5, 0.03, 0.07, 0.7),
    // Sur la galerie des tours : les beffrois et les flèches.
    P(0.325, 0.47, 0.5, 0.05, 0.06, 0.75), P(0.675, 0.47, 0.5, 0.05, 0.06, 0.75),
    // Au pied du pignon central : sa flèche.
    P(0.50, 0.40, 0.42, 0.04, 0.05, 0.6),
  ],
  /* La mairie et le tribunal sont DOSÉS (Guillaume) : moins de faisceaux, plus
     étroits, et `floodK` < 1 — mais visibles. Premier jet trop timide : sur la
     brique rouge et le marbre gris-bleu de la lune, un faisceau à 0,8 ne se
     voyait plus (planche du 2026-09-28). */
  townhall: [
    P(0.08, 0.86, 0.7, 0.04, 0.08, 1.1), P(0.30, 0.86, 0.7, 0.05, 0.1, 1.0),
    P(0.50, 0.86, 0.75, 0.06, 0.12, 1.2), P(0.70, 0.86, 0.7, 0.05, 0.1, 1.0),
    P(0.92, 0.86, 0.7, 0.04, 0.08, 1.1),
    P(0.50, 0.26, 0.25, 0.05, 0.08, 0.7),               // le lanternon
  ],
  courthouse: [
    // Au pied des colonnes du portique.
    ...[0.30, 0.39, 0.465, 0.535, 0.61, 0.70].map((x) => P(x, 0.60, 0.5, 0.03, 0.07, 1.1)),
    // Les ailes, depuis le haut de la volée.
    P(0.10, 0.78, 0.6, 0.06, 0.1, 1.0), P(0.90, 0.78, 0.6, 0.06, 0.1, 1.0),
    // Le fronton (depuis la corniche du portique) et le dôme.
    P(0.50, 0.34, 0.28, 0.1, 0.2, 0.9),
  ],
};
const NAMES = { church: "eglise", townhall: "townhall", courthouse: "courthouse" };

function intensity(list, u, v) {
  let s = 0;
  for (const p of list) {
    const t = (p.y - v) / p.reach;                        // la hauteur au-dessus de la lampe
    if (t < -0.02) continue;
    const vert = t < 0.05 ? Math.max(0, (t + 0.02) / 0.07) : Math.exp(-(t - 0.05) * 1.25);
    const sp = p.w + Math.max(0, t) * p.spread * p.reach;
    const lat = Math.exp(-(((u - p.x) / sp) ** 2));
    s += p.k * vert * lat;
  }
  /* 1,15 et pas davantage : plus haut, les faisceaux se fondaient en un aplat
     (premier jet à 1,6, vu sur la planche) — une façade éclairée garde des
     creux entre ses projecteurs. */
  return AMBIENT + (1 - AMBIENT) * (1 - Math.exp(-1.15 * s));
}

const previews = [];
for (const key of Object.keys(LIGHTS)) {
  const SB = C.TOWN_BITMAPS[key];
  if (!SB.flood) throw new Error(`TOWN_BITMAPS.${key}.flood est vide : déclarer le chemin avant de fabriquer`);
  const D = LM.MONUMENT_WINDOWS[key];
  for (const z of SB.zooms) {
    const mip = C.townBitmapMip(SB, z);
    const day = PNG.sync.read(readFileSync(path.join(ROOT, "public", mip.day)));
    const W = day.width, H = day.height, out = new PNG({ width: W, height: H });
    const sx = D.W3 / W, sy = D.H3 / H;
    let lit = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4, a = day.data[o + 3];
      if (a < 8) continue;
      const X = (x + 0.5) * sx, Y = (y + 0.5) * sy;
      if (D.wins.some((w) => LM.monumentWindowHas(w, X, Y))) continue;
      const r = day.data[o], g = day.data[o + 1], b = day.data[o + 2], L = lum(r, g, b);
      const I = intensity(LIGHTS[key], (x + 0.5) / W, (y + 0.5) / H) * smooth(24, 95, L);
      if (I < 0.01) continue;
      out.data[o] = clamp(Math.round(r * WARM[0] * I * GAIN), 0, 255);
      out.data[o + 1] = clamp(Math.round(g * WARM[1] * I * GAIN), 0, 255);
      out.data[o + 2] = clamp(Math.round(b * WARM[2] * I * GAIN), 0, 255);
      out.data[o + 3] = a;
      lit++;
    }
    writeFileSync(path.join(ROOT, "public", mip.flood), PNG.sync.write(out));
    console.log(`${key} cran ${z} : ${W}x${H}, ${lit} px éclairés`);
    if (z === 3) previews.push({ key, day, out, W, H });
  }
}

/* La planche : chaque monument de nuit SANS puis AVEC la façade éclairée — la
   nuit du jeu (ciel de lune qui multiplie, levée `1 − lum(ciel)`), le calque
   des vitres par-dessus. C'est ce qu'on regarde avant le jeu. */
{
  const NIGHT = [0.30, 0.35, 0.56], LIFT = 1 - (0.2126 * NIGHT[0] + 0.7152 * NIGHT[1] + 0.0722 * NIGHT[2]), PAD = 12;
  const DOSE = Object.fromEntries(Object.keys(LIGHTS).map((k) => [k, C.TOWN_BITMAPS[k].floodK || 1]));
  const PW = previews.reduce((s, p) => s + p.W + PAD, PAD), PH = previews.reduce((m, p) => Math.max(m, p.H), 0) * 2 + PAD * 3;
  const sheet = new PNG({ width: PW, height: PH });
  for (let i = 0; i < PW * PH; i++) { sheet.data[i * 4] = 16; sheet.data[i * 4 + 1] = 19; sheet.data[i * 4 + 2] = 30; sheet.data[i * 4 + 3] = 255; }
  let ox = PAD;
  for (const p of previews) {
    const glow = PNG.sync.read(readFileSync(path.join(ROOT, "public", C.townBitmapMip(C.TOWN_BITMAPS[p.key], 3).glow)));
    for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) {
      const o = (y * p.W + x) * 4, a = p.day.data[o + 3] / 255;
      if (a <= 0) continue;
      const put = (py, rgb) => { const d = (py * PW + ox + x) * 4; for (let c = 0; c < 3; c++) sheet.data[d + c] = clamp(Math.round(rgb[c] * a + sheet.data[d + c] * (1 - a)), 0, 255); };
      const ga = glow.data[o + 3] / 255 * LIFT, fa = p.out.data[o + 3] / 255 * LIFT * DOSE[p.key];
      const base = [0, 1, 2].map((c) => p.day.data[o + c] * NIGHT[c] + glow.data[o + c] * ga);
      put(PAD + y, base);
      put(PAD * 2 + p.H + y, base.map((v, c) => v + p.out.data[o + c] * fa));
    }
    ox += p.W + PAD;
  }
  const f = path.join(ROOT, "tools", "out", "monuments-facade.png");
  writeFileSync(f, PNG.sync.write(sheet));
  console.log("planche :", path.relative(ROOT, f));
}
