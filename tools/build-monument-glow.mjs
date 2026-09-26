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
// réécrit leur calque « fragments » ; relancer CE script ensuite.
// ⚠️ 2026-09-26 : il se disait idempotent en relisant sa propre sortie comme
// base — c'était faux (voir `readGitPng` plus bas). La base est désormais lue
// au commit 1539fe7 : deux passages donnent la même sortie.
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
import { execFileSync } from "node:child_process";
// Un PNG tel qu'il était à un commit (`rev:chemin`), ou null s'il n'existait pas.
function readGitPng(spec) {
  try { return PNG.sync.read(execFileSync("git", ["show", spec], { cwd: ROOT, maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] })); }
  catch { return null; }
}

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { fermeConstants: C, lumiere: LM } = await loadFerme(ROOT, ["fermeConstants", "lumiere"]);

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

/* ── Les baies : `MONUMENT_WINDOWS` (lumiere.js) ─────────────────────────────
   ⚠️ 2026-09-26 (phase 6c) : les régions ont quitté ce script pour lumiere.js,
   parce que le JEU doit maintenant les connaître aussi (il éteint à l'heure
   les pièces vides). Ici, elles sont CUITES toutes allumées — l'ancien
   `off: true` (une fenêtre sur deux du tribunal, pour toujours) est parti :
   c'est l'heure qui décide, pas le script.
   Ce que le script ajoute, et qui ne change pas d'une nuit à l'autre :
     · l'INÉGALITÉ : chaque baie tire sa lampe (ambre chaud, blanc cassé,
       orangé) et sa force (0,78 à 1) — une façade n'est pas une rampe ;
     · la PROFONDEUR : plus chaud et plus fort en bas (la lampe est posée sur
       une table, pas au plafond), assombri contre les montants (les rideaux
       tirés sur les côtés), le haut de la vitre plus froid ;
     · des SILHOUETTES : une baie sur trois montre, en contre-jour, le dos
       d'un fauteuil, une plante ou le bord d'une étagère — tirées par baie ;
     · les VITRAUX gardent leur couleur, plus saturée, avec une chaleur de
       cierges qui monte du bas. */
const KIND = { stained: () => stainedGlass, curtain: () => curtainWindow, lantern: () => lanternGlass, clock: () => clockFace, pane: (w) => pane(w.maxL) };
const hashi = (a, b) => { let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul((b | 0) + 0x632be5ab, 0x85ebca77)) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; h ^= h >>> 13; return h >>> 0; };
const LAMPS = [[255, 206, 128], [255, 226, 176], [255, 188, 104], [250, 214, 150]];
// Les silhouettes, en coordonnées de la baie (u de 0 à 1 de gauche à droite,
// v de 0 à 1 de haut en bas). Rend vrai si le pixel est DERRIÈRE l'objet.
const SILS = [
  (u, v) => v > 0.66 && u > 0.18 && u < 0.62 && (v > 0.8 || u < 0.26 || u > 0.54),        // dos de fauteuil
  (u, v) => (v > 0.84 && u > 0.56 && u < 0.84) || (Math.hypot((u - 0.7) / 0.2, (v - 0.72) / 0.16) < 1), // plante en pot
  (u, v) => u < 0.2 && v > 0.3,                                                              // le montant d'une étagère
];
function windowStyle(key, i) {
  const h = hashi(key.length * 1009 + i * 7, i * 131 + 3);
  return { lamp: LAMPS[h % LAMPS.length], k: 0.78 + 0.22 * ((h >>> 3) % 100) / 99, sil: (h >>> 10) % 3 === 0 ? SILS[(h >>> 12) % SILS.length] : null };
}
function regionBox(rg) {
  return rg.k === "disc" ? { x0: rg.cx - rg.r, y0: rg.cy - rg.r, x1: rg.cx + rg.r, y1: rg.cy + rg.r } : rg;
}
// Profondeur et teinte d'une vitre allumée (recettes `pane` et le verre de `curtain`).
function shadePane(g, st, u, v, isRoom) {
  const lampMix = 0.55;
  let c = [0, 1, 2].map((q) => g[q] * (1 - lampMix) + st.lamp[q] * lampMix);
  let k = st.k * (0.8 + 0.2 * v);                         // plus fort en bas
  if (isRoom) k *= 0.78 + 0.22 * Math.min(1, Math.min(u, 1 - u) / 0.22); // rideaux sur les côtés
  c = c.map((x, q) => x * k * (q === 2 ? 1 - 0.1 * v : 1));
  let a = g[3];
  if (isRoom && st.sil && st.sil(u, v)) { c = c.map((x) => x * 0.42); a *= 0.9; }
  return [c[0], c[1], c[2], a];
}
const MONUMENTS = [
  { key: "church", name: "eglise" },
  { key: "townhall", name: "townhall" },
  { key: "courthouse", name: "courthouse" },
].map((m) => {
  const D = LM.MONUMENT_WINDOWS[m.key];
  return { ...m, W3: D.W3, H3: D.H3, regions: D.wins.map((w, i) => ({ ...w, f: KIND[w.kind](w), st: windowStyle(m.key, i), box: regionBox(w) })) };
});

const inRegion = (rg, x, y) => LM.monumentWindowHas(rg, x, y);
/* ── Les VITRAUX EN COULEURS (phase 6c) ─────────────────────────────────────
   La peinture de l'église a des vitraux AMBRÉS d'un bout à l'autre : allumés,
   ils sortaient en plaques orange (vu sur la planche).
   ⚠️ PREMIER JET ÉCARTÉ, À NE PAS REFAIRE : découper le verre en composantes
   connexes entre les plombs et tirer une couleur par morceau. Les plombs peints
   NE FERMENT PAS les morceaux (la peinture est continue) ; les grandes plaques
   recoupées en carreaux ont donné un damier de couleurs criardes — un écran de
   télévision, pas un vitrail.
   Ce qui marche : une COMPOSITION, comme un maître verrier — dans les
   lancettes, un fond bleu, une bordure rubis, deux médaillons (or, émeraude)
   cerclés de rouge ; dans la rosace, un cœur d'or, douze pétales alternés
   bleu/rubis, une couronne bleue piquée d'or ; sous la rosace, des lancettes
   étroites alternées. La couleur est MÊLÉE à la lumière ambrée (pas posée
   dessus) et modulée par la luminance de la peinture, qui garde les plombs
   et les figures. */
const G_BLUE = [40, 86, 236], G_RUBY = [200, 44, 58], G_GOLD = [238, 186, 70], G_EMER = [52, 156, 96], G_VIOL = [136, 72, 180];
function glassColor(rg, X, Y) {
  if (rg.k === "disc") {
    const dx = X - rg.cx, dy = Y - rg.cy, r = Math.hypot(dx, dy) / rg.r;
    const sec = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * 12) % 12;
    if (r < 0.2) return G_GOLD;
    if (r < 0.26) return G_RUBY;
    if (r < 0.72) return sec % 2 ? G_BLUE : G_RUBY;
    return sec % 3 === 0 ? G_GOLD : (sec % 3 === 1 ? G_BLUE : G_VIOL);
  }
  const B = regionBox(rg), w = B.x1 - B.x0, u = (X - B.x0) / w, v = (Y - B.y0) / (B.y1 - B.y0);
  if (rg.k === "rect") {                                  // l'arcature : lancettes étroites
    const col = Math.floor(u * 7);
    if (v < 0.12) return G_GOLD;
    return col % 2 ? G_RUBY : G_BLUE;
  }
  const R = w / 2;
  const edge = Math.min(u, 1 - u) * w;                     // distance au montant, en px
  const top = Y < B.y0 + R ? R - Math.hypot(X - (B.x0 + R), Y - (B.y0 + R)) : Infinity;
  if (Math.min(edge, top) < w * 0.14) return G_RUBY;       // la bordure
  for (const [mv, c] of [[0.34, G_GOLD], [0.7, G_EMER]]) { // les deux médaillons
    const d = Math.hypot(u - 0.5, (v - mv) * (B.y1 - B.y0) / w) / 0.24;
    if (d < 0.72) return c;
    if (d < 1) return G_RUBY;
  }
  return G_BLUE;
}
function tintGlass(g, c, srcL) {
  // Mêlée à l'ambre (86 % de verre — à 60 %, bleu + ambre donnait du lilas grisé, vu sur la planche), modulée par la luminance de la peinture :
  // les plombs sombres restent sombres, les clairs de la peinture éclairent.
  const k = 0.5 + 0.72 * clamp(srcL / 150, 0, 1);
  return [0, 1, 2].map((q) => clamp((c[q] * 0.86 + g[q] * 0.14) * k, 0, 255)).concat([g[3]]);
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
    /* ⚠️ 2026-09-26 (phase 6c) — LA BASE EST LU DANS GIT, PAS DANS LE FICHIER
       COURANT. L'en-tête promettait l'idempotence en relisant sa propre
       sortie ; c'était faux pour les vitres sombres : relue comme « base »,
       une vitre déjà allumée (alpha ~1) faisait de la couleur source une
       lumière CLAIRE, que `darkPane` refuse — un second passage éteignait
       toutes les fenêtres. Les calques « fragments » d'origine (vitraux et
       lueurs peintes, avant la phase 3) sont figés au commit 1539fe7 ; on les
       relit de là, donc le script donne la même sortie à chaque passage. */
    const base = readGitPng(`1539fe7:public${mip.glow}`);
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
      let g = rg.f(src[0], src[1], src[2], regionFy(rg, Y), med.get(rg));
      if (!g || g[3] <= 0.01) continue;
      {
        const B = rg.box, u = clamp((X - B.x0) / Math.max(1, B.x1 - B.x0), 0, 1), v = clamp((Y - B.y0) / Math.max(1, B.y1 - B.y0), 0, 1);
        if (rg.kind === "pane") g = shadePane(g, rg.st, u, v, rg.room !== "always");
        else if (rg.kind === "curtain" && g[3] >= 0.5 && g[0] > 200 && g[2] < 190) g = shadePane(g, rg.st, u, v, false);
        else if (rg.kind === "stained") {
          if (lum(src[0], src[1], src[2]) >= 30) g = tintGlass(g, glassColor(rg, X, Y), lum(src[0], src[1], src[2]));
          // Des cierges en bas de la nef : la chaleur monte du bas, le haut
          // garde le bleu et le rouge du verre, plus saturés.
          const m = (g[0] + g[1] + g[2]) / 3, sat = 1.08;
          g = [m + (g[0] - m) * sat, m + (g[1] - m) * sat, m + (g[2] - m) * sat, g[3]];
          const w = 0.22 * v;
          g = [g[0] * (1 - w) + 255 * w, g[1] * (1 - w) + 196 * w, g[2] * (1 - w) + 120 * w, g[3] * (0.88 + 0.12 * v)];
          if (rg.k === "disc") { const d = Math.hypot(X - rg.cx, Y - rg.cy) / rg.r; g = [g[0], g[1], g[2], g[3] * (1 - 0.25 * d * d)]; }
        }
      }
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
