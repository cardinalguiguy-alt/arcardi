// Pipeline C (§9 CLAUDE.md) — LES CALQUES DE NUIT DES TROIS MONUMENTS
// (2026-09-25, phase 3 de la feuille de route graphique : la lumière).
//
// Écrit public/town/<monument>-glow-z<N>.png pour l'église, l'hôtel de ville
// et le tribunal, À PARTIR DES IMAGES DE JOUR DÉJÀ VERSIONNÉES
// (<monument>-day-z<N>.png), cran par cran.
//
// ⚠️⚠️ POURQUOI DEPUIS L'IMAGE DE JOUR, ET PAS DEPUIS LA RÉFÉRENCE GEMINI : un
// PNG importé peut avoir été retouché à la main après son script (§9 — le
// tribunal l'a été). Regénérer le jour pour fabriquer la nuit effacerait la
// retouche en silence. Ici on ne touche à aucune image de jour : on lit ce que
// le jeu affiche, et la nuit tombe exactement sur ces pixels-là, à tous les
// crans (chaque cran est lu et écrit à sa propre taille, aucun
// rééchantillonnage).
//
// ⚠️ POURQUOI UN SECOND SCRIPT ET PAS UNE RETOUCHE DES TROIS PREMIERS : les
// calques de l'église et de la mairie (build-eglise-sprite / build-townhall-
// sprite) ne gardaient que les pixels DÉJÀ chauds de la peinture — quelques
// fragments de vitrail. Vus de nuit (phase 3), ils laissaient la rosace à
// moitié éteinte et les grandes baies de la mairie noires. Le tribunal n'en
// avait aucun. Ce script PART de ces calques (s'il en existe un, ses pixels
// sont gardés tels quels) et y AJOUTE les baies, lues dans des régions posées
// à la main sur la peinture — un parti pris de dessin, comme les perchoirs
// des pigeons. ⚠️ Donc : relancer build-eglise-sprite ou build-townhall-sprite
// réécrit leur calque « fragments » ; relancer CE script ensuite. Il est
// idempotent (sa propre sortie relue comme base redonne la même sortie).
//
// Les régions sont en px du CRAN 3 (la taille où elles ont été relevées) et
// rapportées à chaque cran par proportion. Pour chaque pixel d'une région, un
// prédicat de VERRE (propre à chaque peinture) dit s'il s'allume : on garde le
// dessin (plombs, croisillons, cadres) et on n'allume que la vitre.
//
// Usage : node tools/build-monument-glow.mjs   (écrit aussi tools/out/monuments-nuit.png)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { fermeConstants: C } = await loadFerme(ROOT, ["fermeConstants"]);

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

/* ── Les recettes de lumière d'un pixel de vitre ────────────────────────────
   Chacune rend [r, g, b, a] (a de 0 à 1) ou null (le pixel reste le dessin). */
// Un vitrail : on garde sa teinte (c'est le dessin), on la pousse vers le
// clair, un quart vers l'ambre ; le plomb reste sombre (alpha faible).
// ⚠️ PREMIER JET, vu sur la planche le 2026-09-25 : un test de CHALEUR seul
// (rouge − bleu) allumait aussi la pierre beige de l'église, qui est chaude —
// les lancettes sortaient en rectangles. Ce qui sépare le verre de la pierre
// est la LUMINANCE : le verre peint est sombre, la pierre claire.
function stainedGlass(r, g, b) {
  const L = lum(r, g, b);
  if (L < 30) return [r, g, b, 0.1];
  const warm = r - b;
  const a = smooth(22, 50, warm) * (1 - smooth(132, 160, L));
  if (a < 0.02) return null;
  const m = Math.max(r, g, b), k = 228 / Math.max(1, m);
  return [r * k * 0.75 + 255 * 0.25, g * k * 0.75 + 190 * 0.25, b * k * 0.75 + 110 * 0.25, a];
}
// Une vitre sombre (verre gris-bleu, croisillons clairs) : la vitre s'allume
// d'une lumière de lampe, plus chaude en bas. ⚠️ LES CROISILLONS RESTENT
// SOMBRES : de jour ils sont plus CLAIRS que le verre, de nuit ils se lisent
// en silhouette sur la pièce allumée — c'est ce qui fait une fenêtre et pas
// un panneau jaune (deux premiers jets). Le partage se fait contre la
// luminance MÉDIANE de la vitre dans sa baie (`med`, calculée par cran) :
// un pixel plus clair que la médiane de plus de `PANE_MUNTIN_DL` est un
// croisillon. Un seuil absolu ne tenait pas : les baies du portique, dans
// l'ombre des colonnes, sont peintes plus sombres que celles des ailes.
const PANE_MUNTIN_DL = 14;
function darkPane(r, g, b, fy, maxL, med) {
  const L = lum(r, g, b);
  if (L > maxL + 4) return null;
  const cut = med == null ? maxL : Math.min(maxL, med + PANE_MUNTIN_DL);
  const a = 1 - smooth(cut - 6, cut + 4, L);
  if (a < 0.02) return null;
  const t = clamp(L / Math.max(1, cut), 0, 1);
  const k = 0.84 + 0.16 * t;
  return [248 * k, (205 - 22 * fy) * k, (140 - 38 * fy) * k, a];
}
// Une baie à rideaux (mairie) : le verre bleu devient lumière de lampe, les
// rideaux et le bois de l'intérieur s'éclairent par derrière en gardant leur
// teinte ; les meneaux de fer restent sombres. (Premier jet : les rideaux
// poussés à 240 sortaient roses et plats.)
function curtainWindow(r, g, b, fy) {
  const L = lum(r, g, b);
  const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(1, Math.max(r, g, b));
  if (L > 172 && sat < 0.32) return null;           // la pierre, l'enseigne
  if (L < 30) return [r, g, b, 0.12];               // le fer des meneaux
  if (b >= r - 8) return darkPane(r, g, b, fy, 150, null); // le verre (ses meneaux sont de fer, sombres)
  const k = Math.min(1.7, 215 / Math.max(1, Math.max(r, g, b)));
  return [r * k, g * k * 1.05, b * k * 0.9, 0.9];
}
// Le verre d'une lanterne peinte : ses pixels clairs et chauds deviennent
// une flamme.
function lanternGlass(r, g, b) {
  const L = lum(r, g, b);
  if (L < 95 || r - b < 18) return null;
  return [255, 232, 168, smooth(95, 140, L)];
}
// Un cadran d'horloge : la face blanche, éclairée de l'intérieur.
function clockFace(r, g, b) {
  const L = lum(r, g, b);
  if (L < 165) return null;
  return [255, 246, 220, 0.85 * smooth(165, 205, L)];
}
const pane = (maxL) => Object.assign((r, g, b, fy, med) => darkPane(r, g, b, fy, maxL, med), { maxL });

/* ── Les régions, en px du cran 3 ───────────────────────────────────────────
   { k: "rect", x0, y0, x1, y1 } · { k: "disc", cx, cy, r } · { k: "arch", x0,
   x1, y0 (le sommet de l'arc), y1 } — une baie cintrée : un rectangle coiffé
   d'un demi-cercle, pour ne pas allumer la brique ou la pierre des écoinçons.
   `off: true` : une fenêtre qui reste éteinte (le tribunal n'est pas une
   boîte de nuit : une pièce sur deux est vide). */
const MONUMENTS = [
  {
    key: "church", name: "eglise", W3: 634, H3: 604,
    regions: [
      { k: "disc", cx: 318, cy: 311, r: 47, f: stainedGlass },                 // la rosace
      { k: "rect", x0: 268, y0: 343, x1: 368, y1: 408, f: stainedGlass },      // l'arcature sous la rosace
      { k: "arch", x0: 191, x1: 229, y0: 324, y1: 428, f: stainedGlass },      // grande lancette ouest
      { k: "arch", x0: 407, x1: 445, y0: 324, y1: 428, f: stainedGlass },      // grande lancette est
      { k: "arch", x0: 196, x1: 228, y0: 476, y1: 558, f: stainedGlass },      // lancette basse ouest
      { k: "arch", x0: 409, x1: 441, y0: 476, y1: 558, f: stainedGlass },      // lancette basse est
    ],
  },
  {
    key: "townhall", name: "townhall", W3: 634, H3: 571,
    regions: [
      // Les baies relevées sur leur cadre de fer (colonnes sombres mesurées à
      // la rangée 420) : la peinture n'est pas symétrique au pixel.
      { k: "arch", x0: 108, x1: 160, y0: 336, y1: 461, f: curtainWindow },     // grande baie ouest
      { k: "arch", x0: 466, x1: 518, y0: 336, y1: 461, f: curtainWindow },     // grande baie est
      { k: "arch", x0: 28, x1: 50, y0: 346, y1: 461, f: curtainWindow },       // baie étroite ouest
      { k: "arch", x0: 577, x1: 601, y0: 346, y1: 461, f: curtainWindow },     // baie étroite est
      { k: "rect", x0: 280, y0: 98, x1: 356, y1: 142, f: pane(120) },          // le lanternon
      { k: "disc", cx: 241, cy: 424, r: 13, f: lanternGlass },                 // lanterne murale ouest
      { k: "disc", cx: 388, cy: 424, r: 13, f: lanternGlass },                 // lanterne murale est
      { k: "disc", cx: 316, cy: 240, r: 24, f: clockFace },                    // le cadran
    ],
  },
  {
    key: "courthouse", name: "courthouse", W3: 845, H3: 783,
    regions: [
      // Les ailes, deux étages, deux fenêtres par aile — une sur deux allumée,
      // en quinconce d'un étage à l'autre.
      ...[[79, 111], [167, 199], [652, 680], [740, 768]].flatMap(([x0, x1], i) => [
        { k: "rect", x0, y0: 342, x1, y1: 406, f: pane(118), off: i % 2 === 1 },
        { k: "rect", x0, y0: 467, x1, y1: 536, f: pane(118), off: i % 2 === 0 },
      ]),
      // Les cinq baies du portique — la salle des pas perdus, allumée.
      ...[[252, 283], [332, 363], [410, 436], [487, 515], [567, 592]].map(([x0, x1]) =>
        ({ k: "rect", x0, y0: 347, x1, y1: 405, f: pane(104) })),
      // Les deux fenêtres cintrées du soubassement (la loge du gardien, à l'ouest).
      { k: "arch", x0: 79, x1: 109, y0: 600, y1: 676, f: pane(112) },
      { k: "arch", x0: 739, x1: 769, y0: 600, y1: 676, f: pane(112), off: true },
      // L'imposte au-dessus de la porte : un demi-disque (les claveaux autour
      // sont de la pierre, pas du verre).
      { k: "arch", x0: 403, x1: 445, y0: 453, y1: 477, f: pane(96) },
      // Les deux lampadaires peints en haut de la volée.
      { k: "disc", cx: 202, cy: 488, r: 14, f: lanternGlass },
      { k: "disc", cx: 645, cy: 488, r: 14, f: lanternGlass },
    ],
  },
];

function inRegion(rg, x, y) {
  if (rg.k === "rect") return x >= rg.x0 && x < rg.x1 && y >= rg.y0 && y < rg.y1;
  if (rg.k === "arch") {
    if (x < rg.x0 || x >= rg.x1 || y >= rg.y1) return false;
    const R = (rg.x1 - rg.x0) / 2, cy = rg.y0 + R;
    return y >= cy || Math.hypot(x - (rg.x0 + R), y - cy) <= R;
  }
  return Math.hypot(x - rg.cx, y - rg.cy) <= rg.r;
}
function regionFy(rg, y) {
  if (rg.k === "disc") return clamp((y - (rg.cy - rg.r)) / (2 * rg.r), 0, 1);
  return clamp((y - rg.y0) / Math.max(1, rg.y1 - rg.y0), 0, 1);
}

const report = [];
const previews = [];
for (const M of MONUMENTS) {
  const SB = C.TOWN_BITMAPS[M.key];
  if (!SB.glow) throw new Error(`TOWN_BITMAPS.${M.key}.glow est vide : déclarer le chemin du calque de nuit avant de le fabriquer`);
  for (const z of SB.zooms) {
    const mip = C.townBitmapMip(SB, z);
    const day = PNG.sync.read(readFileSync(path.join(ROOT, "public", mip.day)));
    const W = day.width, H = day.height;
    if (W !== mip.w || H !== mip.h) throw new Error(`${mip.day} : ${W}x${H}, attendu ${mip.w}x${mip.h}`);
    const glowPath = path.join(ROOT, "public", mip.glow);
    const base = existsSync(glowPath) ? PNG.sync.read(readFileSync(glowPath)) : null;
    const out = new PNG({ width: W, height: H });
    const sx = M.W3 / W, sy = M.H3 / H;   // px du cran → px du cran 3
    let lit = 0, kept = 0;
    // La luminance médiane du verre de chaque baie à vitre sombre (voir `darkPane`).
    const med = new Map();
    for (const rg of M.regions) {
      if (!rg.f.maxL) continue;
      const Ls = [];
      const x0 = Math.floor((rg.k === "disc" ? rg.cx - rg.r : rg.x0) / sx), x1 = Math.ceil((rg.k === "disc" ? rg.cx + rg.r : rg.x1) / sx);
      const y0 = Math.floor((rg.k === "disc" ? rg.cy - rg.r : rg.y0) / sy), y1 = Math.ceil((rg.k === "disc" ? rg.cy + rg.r : rg.y1) / sy);
      for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) {
        const o = (y * W + x) * 4;
        if (day.data[o + 3] < 128 || !inRegion(rg, (x + 0.5) * sx, (y + 0.5) * sy)) continue;
        const L = lum(day.data[o], day.data[o + 1], day.data[o + 2]);
        if (L <= rg.f.maxL) Ls.push(L);
      }
      Ls.sort((a, b) => a - b);
      if (Ls.length) med.set(rg, Ls[Ls.length >> 1]);
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      if (day.data[o + 3] < 128) continue;
      /* ⚠️ LE CALQUE D'ORIGINE PORTE LA VRAIE COULEUR DE SES VITRES. Les deux
         premiers scripts ont ÉTEINT, dans l'image de jour, les pixels qu'ils
         mettaient dans leur calque de nuit (couleur « vitre éteinte », grise) :
         lue seule, l'image de jour a donc des trous gris au milieu des vitraux,
         et le premier jet de ce script les laissait en carrés sombres dans la
         lumière. La couleur d'un pixel est celle du jour, corrigée par le
         calque d'origine là où il existe. */
      const ba = base && base.width === W && base.height === H ? base.data[o + 3] / 255 : 0;
      const src = [0, 1, 2].map((c) => day.data[o + c] * (1 - ba) + (ba ? base.data[o + c] * ba : 0));
      const X = (x + 0.5) * sx, Y = (y + 0.5) * sy;
      const rg = M.regions.find((q) => inRegion(q, X, Y));
      if (!rg) {
        // Hors des baies : un pixel du calque d'origine (une lueur peinte
        // ailleurs, un verre de lanterne) reste tel quel.
        if (ba > 0) { for (let c = 0; c < 4; c++) out.data[o + c] = base.data[o + c]; kept++; }
        continue;
      }
      if (rg.off) continue;
      const g = rg.f(src[0], src[1], src[2], regionFy(rg, Y), med.get(rg));
      if (!g || g[3] <= 0.01) continue;
      out.data[o] = clamp(Math.round(g[0]), 0, 255); out.data[o + 1] = clamp(Math.round(g[1]), 0, 255);
      out.data[o + 2] = clamp(Math.round(g[2]), 0, 255); out.data[o + 3] = clamp(Math.round(g[3] * 255), 0, 255);
      lit++;
    }
    writeFileSync(glowPath, PNG.sync.write(out));
    report.push(`${M.key} cran ${z} : ${W}x${H}, ${lit} px de vitre allumés, ${kept} px du calque d'origine gardés`);
    if (z === 3) previews.push({ day, out, W, H });
  }
}
for (const l of report) console.log(l);

// La planche de contrôle : chaque monument de jour, puis de nuit (ciel de lune
// multiplié, calque de nuit par-dessus) — c'est ce qu'on regarde avant le jeu.
{
  const NIGHT = [0.30, 0.35, 0.56], PAD = 12;
  const PW = previews.reduce((s, p) => s + p.W + PAD, PAD), PH = previews.reduce((m, p) => Math.max(m, p.H), 0) * 2 + PAD * 3;
  const sheet = new PNG({ width: PW, height: PH });
  for (let i = 0; i < PW * PH; i++) { sheet.data[i * 4] = 24; sheet.data[i * 4 + 1] = 28; sheet.data[i * 4 + 2] = 36; sheet.data[i * 4 + 3] = 255; }
  let ox = PAD;
  for (const p of previews) {
    for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) {
      const o = (y * p.W + x) * 4, a = p.day.data[o + 3] / 255;
      if (a <= 0) continue;
      const put = (py, rgb) => { const d = ((py) * PW + ox + x) * 4; for (let c = 0; c < 3; c++) sheet.data[d + c] = clamp(Math.round(rgb[c] * a + sheet.data[d + c] * (1 - a)), 0, 255); };
      put(PAD + y, [p.day.data[o], p.day.data[o + 1], p.day.data[o + 2]]);
      const ga = p.out.data[o + 3] / 255;
      const n = [0, 1, 2].map((c) => p.day.data[o + c] * NIGHT[c] * (1 - ga) + p.out.data[o + c] * ga);
      put(PAD * 2 + p.H + y, n);
    }
    ox += p.W + PAD;
  }
  const f = path.join(ROOT, "tools", "out", "monuments-nuit.png");
  writeFileSync(f, PNG.sync.write(sheet));
  console.log("planche :", path.relative(ROOT, f));
}
