/* ╔══════════════════════════════════════════════════════════════════════════
   ║ render-perso-simple — LES PLANCHES D'UN RETOUR AU TRAIT SIMPLE (2026-10-30)
   ╚══════════════════════════════════════════════════════════════════════════
   `components/ferme/persoSimpleArt.js` (prototype branché nulle part) à côté de l'ancien 16 × 24 et de l'actuel 32 × 48
   (`persoHdArt.js`). Sorties dans tools/out :
   - perso-simple-spectre.png : fermière et fermier, face, dos, profil ; huit colonnes de l'ancien à l'actuel —
       ancien ×2 · net · visage · habit (la famille « simple », dérivée de l'ancien) ‖ l'actuel ramené facteur par facteur :
       un seul ton par matière · aplats et visage d'encre · aplats · sans contour · l'actuel. Les cinq dernières disent CE QUI
       fait « jouet » (sa phrase du 2026-10-29) : le contour, le modelé, ou les formes elles-mêmes (la colonne « un seul ton » :
       les formes actuelles sans rien d'autre) ;
   - perso-simple-visages.png : les onze expressions, en simple (deux rangées) puis en actuel (deux rangées) ;
   - perso-simple-pnj.png : les 17 PNJ de `render-pnj-hd` — ancien, simple (niveau visage), actuel — face et profil ;
   - perso-simple-ecran-rue.png, -herbe.png : au cran 3 (le cran par défaut), À LA TAILLE D'ÉCRAN, sur une vraie capture de la ville
       (`maison-cartons-rue.png`, 2026-10-18, cran 3) : l'ancien ×3 au plus proche, le fin cuit comme `drawCharHD` (×3 au plus
       proche puis ½ en moyenne) — quatre groupes : ancien, visage, habit, actuel ;
   - perso-simple-marche-<style>.png : les bandes de marche à la taille d'écran du cran 3 (pour la page de jugement) ; « habit » =
       la feuille du jeu, ses neuf images (0 debout, 1 à 8 au demi-pas) ;
   - perso-simple-habits.png (2026-10-31) : les SIGNES DU VÊTEMENT (`paintHabitFine`) — tenues de départ, costumes des PNJ, Maison
       Garfield ; face, dos, profil, chacun sans puis avec.
   ⚠️ Depuis le 2026-10-31, « habit » n'est plus une retouche de l'image : c'est `drawCharFrame` peinte à ×2 avec les signes du
   vêtement (`S.charFrameFine`), puis la retouche — exactement la feuille du jeu. « L'actuel » est le style « detaille ».
   Usage : node tools/render-perso-simple.mjs */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";
import { readPNG } from "./lib-png.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "persoHdArt", "persoSimpleArt"]);
const A = mods.fermeArt, C = mods.fermeConstants, HD = mods.persoHdArt, PS = mods.persoSimpleArt;
const S = A.buildSprites();
S.persoStyle = "detaille";   // « l'actuel » de ces planches : le 32 × 48 détaillé (le jeu part maintenant du trait simple)

/* ─── Les trois sources d'une image ───────────────────────────────────── */
const OUTFIT = { f: 1, m: 0 };
const oldPx = (g, o, dir, frame, look, fl) => S.charFrame(g, o, dir, frame, look || null, fl || {}).__px;
// `ph` : { step, stepI } (un pas de `PS.PERSO_SIMPLE_WALK`, ou un pas entier) ; `habit` faux : sans les signes du vêtement
const finePx = (g, o, dir, ph, opt = {}) => {
  const fine = { step: ph.step, bob: Math.abs(ph.step), stepI: ph.stepI != null ? ph.stepI : ph.step, habit: opt.habit !== false };
  return PS.persoSimplePx(PS.persoSimpleGridFine(S.charFrameFine(g, o, dir, fine, opt.look || null, opt.fl || {}).__px,
    { dir, bobF: Math.round(fine.bob * 2), niveau: fine.habit ? 3 : 2, expr: opt.expr, pnj: opt.pnj }));
};
const simplePx = (g, o, dir, frame, niveau, opt = {}) => niveau >= 3
  ? finePx(g, o, dir, { step: frame === 1 ? 1 : frame === 3 ? -1 : 0 }, opt)
  : PS.persoSimplePx(PS.persoSimpleGrid(oldPx(g, o, dir, frame, opt.look, opt.fl), { dir, frame, niveau, expr: opt.expr, pnj: opt.pnj }));
const simpleSheet = (g, o, look, npc) => { S.persoStyle = "simple"; try { return S.getCharHD(g, o, look, false, "neutre", npc); } finally { S.persoStyle = "detaille"; } };
// L'actuel, ramené facteur par facteur : `h` 0 l'actuel, 1 sans contour, 2 + aplats (deux tons par matière, le −30 de l'ancien),
// 3 + visage d'encre (ni reflet, ni iris clair, ni joue peinte, la bouche saumon de l'ancien), 4 + un seul ton par matière (il ne
// reste que les FORMES de l'actuel : mèches, manches, dentelle, nœud).
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const adj = (h, d) => "#" + hexRgb(h).map((v) => Math.max(0, Math.min(255, v + d)).toString(16).padStart(2, "0")).join("");
function flatPal(pal, face, one) {
  const p = { ...pal };
  for (const [l, b, s, d] of ["TSsZ", "JHhG", "DCcF", "QPpO", "NBbV"]) { p[l] = pal[b]; p[s] = one ? pal[b] : adj(pal[b], -30); p[d] = one ? pal[b] : adj(pal[b], -30); }
  p.L = pal.K; p.k = one ? pal.K : adj(pal.K, -30);
  if (face) Object.assign(p, { E: "#3a2a1e", W: "#3a2a1e", I: "#3a2a1e", M: "#c88a6a", m: "#a06242", R: pal.T });
  return p;
}
const PAL = {
  f: HD.persoHdPalette({ hair: A.CHAR_HAIR_COLORS[1], top: C.OUTFITS[1].shirt }),
  m: HD.persoHdPalette({ hair: A.CHAR_HAIR_COLORS[0], top: C.OUTFITS[0].shirt, pants: C.OUTFITS[0].pants }),
};
function hdPx(g, dir, frame, h = 0, expr = "neutre") {
  const cv = makeCanvas(32, 48);
  HD.drawPersoHD(cv.ctx, 0, 0, { gender: g, dir, frame, expr, pal: h >= 2 ? flatPal(PAL[g], h >= 3, h >= 4) : PAL[g], outline: h === 0 });
  return cv.px;
}
// Une image d'une feuille fine du jeu (`getCharHD`, 9 images par rangée)
function sheetPx(sheet, frame, row) {
  const src = sheet.__px, SW = sheet.width, px = new Uint8ClampedArray(32 * 48 * 4);
  for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) {
    const s = ((row * 48 + y) * SW + frame * 32 + x) * 4, d = (y * 32 + x) * 4;
    for (let k = 0; k < 4; k++) px[d + k] = src[s + k];
  }
  return px;
}

/* ─── Composer ────────────────────────────────────────────────────────── */
function surface(W, H, bg) { const s = makeCanvas(W, H); if (bg) { s.ctx.fillStyle = bg; s.ctx.fillRect(0, 0, W, H); } return s; }
// colle un RGBA w × h en (x0, y0), alpha compris
function put(s, px, w, h, x0, y0) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, a = px[i + 3] / 255;
    if (!a) continue;
    const X = x0 + x, Y = y0 + y;
    if (X < 0 || Y < 0 || X >= s.width || Y >= s.height) continue;
    const d = (Y * s.width + X) * 4;
    for (let k = 0; k < 3; k++) s.px[d + k] = px[i + k] * a + s.px[d + k] * (1 - a);
    s.px[d + 3] = 255;
  }
}
const near = (px, w, h, k) => scale(px, w, h, k).px;
// La cuisson du cran 3 (`drawCharHD`, `hdScaledSheet`) : ×3 au plus proche, puis ½ en moyenne (prémultipliée).
function bake3(px32) {
  const up = near(px32, 32, 48, 3), W = 96, out = new Uint8ClampedArray(48 * 72 * 4);
  for (let y = 0; y < 72; y++) for (let x = 0; x < 48; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const i = ((2 * y + dy) * W + 2 * x + dx) * 4, al = up[i + 3] / 255;
      r += up[i] * al; g += up[i + 1] * al; b += up[i + 2] * al; a += al;
    }
    const d = (y * 48 + x) * 4;
    if (a > 0) { out[d] = r / a; out[d + 1] = g / a; out[d + 2] = b / a; out[d + 3] = (a / 4) * 255; }
  }
  return out;
}
const screen3 = (px, fine) => (fine ? bake3(px) : near(px, 16, 24, 3));
function save(s, file, k) {
  const up = k > 1 ? scale(s.px, s.width, s.height, k) : { px: s.px, W: s.width, H: s.height };
  writePNG(path.join(OUT, file), up.px, up.W, up.H);
  console.log("planche :", path.join("tools", "out", file), s.width + "×" + s.height, "×" + k);
}

/* ─── 1. Le spectre ───────────────────────────────────────────────────── */
{
  const COLS = [{ n: 0 }, { n: 1 }, { n: 2 }, { n: 3 }, { h: 4 }, { h: 3 }, { h: 2 }, { h: 1 }, { h: 0 }];
  const CW = 36, CH = 52, rows = [];
  for (const g of ["f", "m"]) for (const dir of [0, 1, 2]) rows.push([g, dir]);
  const s = surface(COLS.length * CW + 6, rows.length * CH, "#d9d2c3");
  rows.forEach(([g, dir], r) => COLS.forEach((cl, c) => {
    const x0 = c * CW + (c >= 4 ? 6 : 0), y0 = r * CH;
    s.ctx.fillStyle = c >= 4 ? ((r + c) % 2 ? "#e2dccd" : "#dcd5c5") : ((r + c) % 2 ? "#efe9dc" : "#e8e2d4"); s.ctx.fillRect(x0, y0, CW, CH);
    const px = cl.n !== undefined ? (cl.n === 0 ? near(oldPx(g, OUTFIT[g], dir, 0), 16, 24, 2) : simplePx(g, OUTFIT[g], dir, 0, cl.n, { habit: true })) : hdPx(g, dir, 0, cl.h);
    put(s, px, 32, 48, x0 + 2, y0 + 2);
  }));
  save(s, "perso-simple-spectre.png", 4);
}

/* ─── 2. Les visages ──────────────────────────────────────────────────── */
{
  const EX = PS.PERSO_SIMPLE_EXPRESSIONS, CW = 34, CH = 50;
  const s = surface(EX.length * CW, 4 * CH, "#e8e2d4");
  ["f", "m"].forEach((g, r) => EX.forEach((e, c) => {
    put(s, simplePx(g, OUTFIT[g], 0, 0, 2, { expr: e }), 32, 48, c * CW + 1, r * CH + 1);
    s.ctx.fillStyle = "#dcd5c5"; s.ctx.fillRect(c * CW, (r + 2) * CH, CW, CH);
    put(s, hdPx(g, 0, 0, 0, e), 32, 48, c * CW + 1, (r + 2) * CH + 1);
  }));
  save(s, "perso-simple-visages.png", 4);
}

/* ─── 3. Les PNJ ──────────────────────────────────────────────────────── */
const NPC = [
  ["habitante", "f", 5, null, {}], ["habitant", "m", 7, null, {}],
  ["Soan", "m", 0, null, { cap: true }], ["Greg", "m", 0, null, { overalls: true }], ["Harald", "m", 6, null, { overalls: true, cap: true }],
  ["Tristan", "m", 2, null, { plaid: true }], ["René", "m", 3, null, { beeSuit: true }], ["Ingrid", "f", 4, null, { cheeseHat: true }],
  ["Jérôme", "m", 5, null, { sugarWorker: true }], ["Carla", "f", 1, "carla", {}], ["Léo", "m", 0, "leo", {}], ["Froufrou", "m", 0, "froufrou", {}],
  ["vandale", "m", 0, "vandal", {}], ["ouvrier", "m", 0, "ouvrier:0", {}], ["chef", "m", 0, "chef:1", {}], ["soudeur", "m", 0, "soudeur:2", {}],
  ["conductrice", "f", 0, "conducteur:3", {}],
];
const npcHD = (row) => { const [, g, o, look, fl] = row; return S.getCharHD(g, o, look, false, "neutre", Object.keys(fl).length ? fl : true); };
{
  const CW = 34, CH = 50, PER = 2, GAP = 6;   // face et profil, pour chacun des trois styles
  const half = Math.ceil(NPC.length / 2), cols3 = 3 * PER;
  const s = surface(2 * (cols3 * CW + GAP) + GAP, half * CH, "#d9d2c3");
  NPC.forEach((row, i) => {
    const [, g, o, look, fl] = row, bx = i < half ? 0 : cols3 * CW + 2 * GAP, r = i % half, sh = npcHD(row);
    [0, 2].forEach((dir, j) => {
      const cells = [
        near(oldPx(g, o, dir, 0, look, fl), 16, 24, 2),
        simplePx(g, o, dir, 0, 3, { look, fl, pnj: true }),
        sh ? sheetPx(sh, 0, dir) : null,
      ];
      cells.forEach((px, k) => {
        const x0 = bx + (k * PER + j) * CW + k * 2, y0 = r * CH;
        s.ctx.fillStyle = k === 2 ? "#dcd5c5" : k === 1 ? "#efe9dc" : "#e4ddcf"; s.ctx.fillRect(x0, y0, CW, CH);
        if (px) put(s, px, 32, 48, x0 + 1, y0 + 1);
      });
    });
  });
  save(s, "perso-simple-pnj.png", 3);
}

/* ─── 4. À l'écran, au cran 3, sur une vraie capture ──────────────────── */
{
  const cap = readPNG(path.join(OUT, "maison-cartons-rue.png"));
  const crop = (x0, y0, w, h) => {
    const s = surface(w, h, null);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const si = ((y0 + y) * cap.W + x0 + x) * 4, di = (y * w + x) * 4;
      for (let k = 0; k < 4; k++) s.px[di + k] = cap.px[si + k];
    }
    return s;
  };
  // [genre, tenue, look, drapeaux, dir, image] : la fermière de face, le fermier de profil en marche, Soan de face
  const CAST = [["f", 1, null, {}, 0, 0], ["m", 0, null, {}, 2, 1], ["m", 0, null, { cap: true }, 0, 0], ["f", 5, null, {}, 1, 0]];
  const STYLES = [
    (c) => screen3(oldPx(c[0], c[1], c[4], c[5], c[2], c[3]), false),
    (c) => screen3(simplePx(c[0], c[1], c[4], c[5], 2, { look: c[2], fl: c[3], pnj: Object.keys(c[3]).length > 0 }), true),
    (c) => screen3(simplePx(c[0], c[1], c[4], c[5], 3, { look: c[2], fl: c[3], pnj: Object.keys(c[3]).length > 0 }), true),
    (c) => {
      if (!Object.keys(c[3]).length) {
        // l'actuel du jeu : la feuille de marche (image 0 debout ; le pas de l'ancien n° 1 = l'image fine 2)
        const sh = S.getCharHD(c[0], c[1], c[2], false, "neutre", null);
        return screen3(sheetPx(sh, c[5] === 1 ? 2 : 0, c[4]), true);
      }
      const sh = S.getCharHD(c[0], c[1], c[2], false, "neutre", c[3]);
      return screen3(sheetPx(sh, 0, c[4]), true);
    },
  ];
  for (const [file, x0, y0, foot] of [["perso-simple-ecran-rue.png", 300, 480, 112], ["perso-simple-ecran-herbe.png", 330, 640, 120]]) {
    const W = 4 * 4 * 44 + 3 * 40 + 40, s = crop(x0, y0, Math.min(W, cap.W - x0), 200);
    STYLES.forEach((fn, si) => CAST.forEach((c, ci) => put(s, fn(c), 48, 72, 20 + si * (4 * 44 + 40) + ci * 44, foot - 72)));
    save(s, file, 1);
    save(s, file.replace(".png", "-loupe.png"), 2);
  }
}

/* ─── 5. Les bandes de marche, à la taille d'écran du cran 3 ──────────── */
{
  const strip = (file, frames) => {
    const s = surface(frames.length * 48, 2 * 72, null);
    frames.forEach((pair, i) => pair.forEach((px, r) => put(s, px, 48, 72, i * 48, r * 72)));
    save(s, file, 1);
  };
  // deux rangées : la fermière de face, le fermier de profil ; l'ancien et le simple ont 4 images, l'actuel 9 (0 debout, 1 à 8)
  strip("perso-simple-marche-ancien.png", [0, 1, 2, 3].map((f) => [screen3(oldPx("f", 1, 0, f), false), screen3(oldPx("m", 0, 2, f), false)]));
  strip("perso-simple-marche-visage.png", [0, 1, 2, 3].map((f) => [screen3(simplePx("f", 1, 0, f, 2), true), screen3(simplePx("m", 0, 2, f, 2), true)]));
  const smF = simpleSheet("f", 1, null, null), smM = simpleSheet("m", 0, null, null);
  strip("perso-simple-marche-habit.png", [0, 1, 2, 3, 4, 5, 6, 7, 8].map((f) => [screen3(sheetPx(smF, f, 0), true), screen3(sheetPx(smM, f, 2), true)]));
  const shF = S.getCharHD("f", 1, null, false, "neutre", null), shM = S.getCharHD("m", 0, null, false, "neutre", null);
  strip("perso-simple-marche-actuel.png", [0, 1, 2, 3, 4, 5, 6, 7, 8].map((f) => [screen3(sheetPx(shF, f, 0), true), screen3(sheetPx(shM, f, 2), true)]));
}

/* ─── 6. Les signes du vêtement : chaque tenue sans puis avec, face, dos, profil ─── */
{
  const BASE = [["f", 0], ["m", 0], ["f", 1], ["m", 1], ["f", 3], ["m", 5], ["f", 6], ["m", 7]].map(([g, o]) => [g, o, null, null]);
  const PNJ = [["m", 0, null, { overalls: true }], ["m", 0, null, { cap: true }], ["m", 2, null, { plaid: true }], ["f", 4, null, { cheeseHat: true }],
    ["m", 5, null, { cap: true, sugarWorker: true }], ["f", 1, "carla", {}], ["m", 0, "ouvrier:0", {}], ["f", 0, "chef:2", {}], ["m", 3, null, { beeSuit: true }], ["m", 0, "leo", {}]];
  const GAR = [["f", 1, "w0010", null], ["m", 0, "w0020", null], ["m", 0, "w0030", null], ["f", 2, "w0040", null], ["f", 1, "w0050", null],
    ["m", 0, "w1100", null], ["f", 1, "w2001", null], ["m", 3, "w4405", null]];
  const ALL = [...BASE, ...PNJ, ...GAR], half = Math.ceil(ALL.length / 2), CW = 34, CH = 50, GAP = 8;
  const s = surface(2 * (6 * CW + 2 * 4) + GAP, half * CH, "#d9d2c3");
  ALL.forEach(([g, o, look, fl], i) => {
    const bx = i < half ? 0 : 6 * CW + 8 + GAP, r = i % half;
    [0, 1, 2].forEach((dir, j) => [false, true].forEach((habit, k) => {
      const x0 = bx + (2 * j + k) * CW + j * 4, y0 = r * CH;
      s.ctx.fillStyle = k ? "#efe9dc" : "#e4ddcf"; s.ctx.fillRect(x0, y0, CW, CH);
      put(s, finePx(g, o, dir, { step: 0 }, { look, fl: fl || {}, pnj: !!fl, habit }), 32, 48, x0 + 1, y0 + 1);
    }));
  });
  save(s, "perso-simple-habits.png", 3);
}
