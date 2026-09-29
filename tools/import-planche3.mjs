/* =============================================================================
   import-planche3.mjs — LES DEUX PLANCHES DE LA PHASE 7b (2026-09-29), DEVENUES
   DES SPRITES : jardins vécus (A), place / lampadaires / maison hantée (B).
   -----------------------------------------------------------------------------
   ⚠️ MÊME CHAÎNE QUE `import-planche2.mjs` (on COPIE les pixels, on ne les
   transcrit pas ; `lib-planche.mjs` fait l'échantillonnage et la quantification),
   MAIS TROIS CHOSES SONT PROPRES À CES PLANCHES, ET LES TROIS SONT MESURÉES :

   1. LA SOURCE EST UN JPG, PAS UN PNG (Gemini n'en propose pas d'autre à
      Guillaume, 2026-09-29). `lib-png.mjs` ne lit que du PNG et le dépôt n'a
      aucune dépendance : la conversion passe par `sips`, présent sur tout Mac.
      Elle ne restaure rien — le bruit du JPEG est déjà dans le fichier — mais
      elle est déterministe. ⚠️ On ne compte donc JAMAIS sur une couleur exacte :
      le fond mesure (255,16,255) ± 2, pas #FF00FF, et il se détoure par sa
      TEINTE (`min(r,b) − g`), avec une tolérance.

   2. LE FOND EST MAGENTA, ET LES OMBRES SONT VIOLET FONCÉ — pas grises. Trois
      classes, séparées par la teinte puis la luminance :
        · fond      : magenta (min(r,b) − g ≥ MT) et aussi clair que lui (≥ 104) ;
        · ombre     : même teinte, PLUS SOMBRE (luminance < 104) — c'est l'ombre
                      que Gemini a peinte sous chaque objet ;
        · objet     : le reste.
      ⚠️ La lueur violette des lanternes allumées est PLUS CLAIRE que le fond
      (166 contre 114) : elle tombe donc dans « fond » et disparaît, ce qui est
      voulu — la lumière du jeu (`lumiere.js`) fait ses propres halos.
      ⚠️ L'ombre n'est PAS jetée : les planches 1 et 2 gardent la leur, opaque
      et grise (elle « pose » l'objet, cf. `lib-planche.mjs`). Ici elle est
      gardée À PART, sous le caractère '~', et c'est le rejoueur du jeu qui
      choisit de la peindre ou non (semi-transparente). Un magenta sombre opaque
      sous un banc posé sur de l'herbe serait un carré violet.
      ⚠️ Les pixels de bord contaminés de rose (teinte entre FRINGE et MT) qui
      touchent le fond sont retirés : sur le drap blanc, la pierre claire et le
      bain d'oiseaux, c'est ce qui fait le liseré rose du JPEG.
      ⚠️ Un test de teinte est sûr ICI et ne l'était pas sur la planche 1 : aucun
      objet du dessin n'est magenta (le plus proche, la lavande, est à ~30).
      Comme sur la planche 2, les trous FERMÉS comptent : le portail est une
      grille, les jours entre ses barreaux ne seraient jamais atteints par un
      remplissage depuis le bord.

   3. L'ÉCHELLE SE DÉRIVE DES DEUX ÉTALONS, jamais de l'image (règle du §9,
      comme la planche 2). Chaque planche redessine un objet dont la taille est
      fixée par le jeu : le banc de bois (`benchWood`, 36 natifs de large) sur
      la planche A, le lampadaire (canevas de 48 de haut) sur la B. Mesurés à
      la segmentation, à teinte, sur le JPG :
        banc         191 px image  →  36  →  5,31 px image par pixel natif
        lampadaire   264 px image  →  48  →  5,50
      Deux planches sorties du même modèle au même format (1343 × 784) : on
      garde UNE valeur, la moyenne, **5,4**. Une fois échantillonné, le banc
      retombe sur ses 36 natifs EXACTEMENT (0,0 %) et le lampadaire sur 50 pour
      48 (+4,2 %). ⚠️ Le lampadaire lit toujours un peu grand : la planche 2 le
      donnait déjà à 4,06 quand elle retenait 3,875 (+4,8 %). Le banc est donc
      l'étalon FIABLE, le lampadaire un témoin qui dérive dans le même sens sur
      les deux planches — on ne corrige pas l'un par l'autre. Le script REMESURE
      les étalons à chaque exécution et imprime l'écart, pour qu'une planche
      refaite à une autre échelle se voie.
      ⚠️ ET UN AVERTISSEMENT QUE LA PLANCHE 2 N'AVAIT PAS À DONNER : cette
      échelle est celle du BANC DU JEU, qui est chunky (36 pixels de large, soit
      2,7 m à 13,5 px/m). Tout ce que Gemini dessine « en proportion du banc »
      arrive donc grand à côté d'un personnage de 23 px : une boîte aux lettres
      sort à 34 px de haut, soit 2,5 m. Le script imprime chaque objet en
      MÈTRES ÉQUIVALENTS. Régler la taille d'un objet trop grand se fait ici,
      par le champ `step` de son entrée (un pas plus grand = un objet plus
      petit, au MÊME grain de pixel à l'écran, avec moins de détail) — jamais
      en agrandissant ou réduisant le sprite dans le jeu.

   ⚠️ LE CATALOGUE EST ÉCRIT À LA MAIN (comme aux 439 et 447) : les boîtes
   viennent de la segmentation par teinte, fermée par dilatation de 6 px ; les
   NOMS ne peuvent venir que d'un œil sur la planche. Deux corrections à la
   segmentation : le portail de la planche B sort en DEUX blocs (le jour entre
   ses vantaux fait plus de 12 px), on prend une boîte qui les réunit ; et un
   objet non demandé (un petit panneau de planches sur tréteau, en bas au milieu
   de la B) a été écarté, il n'a aucune fonction.

   Usage :  node tools/import-planche3.mjs
   ========================================================================== */

import path from "path";
import fs from "fs";
import os from "os";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { nativeSheet, quantize, toRGBA } from "./lib-planche.mjs";
import { writePNG } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");
const SHEETS = {
  A: path.join(ROOT, "refs", "planche3-jardins.jpg"),
  B: path.join(ROOT, "refs", "planche3-place.jpg"),
};

export const STEP3 = 5.4;                       // px image par pixel natif (voir l'en-tête)

const MT = 60;          // « magenta » : min(r,b) − g ≥ MT
const FRINGE = 35;      // contaminé de rose : entre FRINGE et MT, au contact du fond
const SH_LUM = 104;     // plus sombre que ça, en magenta : c'est de l'OMBRE
const SHADOW = "~";     // le caractère de l'ombre dans `rows` (hors de la plage de la palette)
const PX_PER_M = 13.5;  // l'échelle du jeu : personnage de 23 px = 1,70 m

/* Le catalogue. [nom, x, y, w, h, K, options]
   Coordonnées en PIXELS IMAGE de la planche (1343 × 784), relevées par la
   segmentation par teinte. options : { step } = pas propre à l'objet (défaut
   STEP3) ; { ref: true } = étalon, gardé pour le contrôle d'échelle. */
const CATALOGUE = {
  A: [
    // ── L'ÉTALON : le banc de bois de la planche 1, redessiné ────────────────
    ["benchRef",        63, 124, 191, 110, 12, { ref: true }],
    // ── LE BOIS ET LE LINGE ─────────────────────────────────────────────────
    ["woodpileRoofed", 334,  16, 252, 242, 16],
    ["woodpileAxe",    624,  96, 242, 140, 14],
    ["clothesline",    910,  36, 366, 196, 16],
    // ── LES BOÎTES AUX LETTRES, une par rang (tôle, bois peint, fonte) ──────
    ["mailboxTin",      48, 308,  86, 158, 12],
    ["mailboxRed",     178, 284,  98, 184, 12],
    ["mailboxIron",    312, 278,  90, 199, 14],
    // ── LE MOBILIER DE JARDIN ───────────────────────────────────────────────
    ["wheelbarrow",    448, 310, 186, 162, 14],
    ["rainBarrel",     666, 306, 138, 170, 14],
    ["gardenTable",    822, 310, 239, 162, 14],
    ["benchLog",      1085, 342, 235, 144, 14],
    ["benchIron",       46, 524, 266, 230, 14],
    ["birdbath",       362, 582, 108, 158, 12],
    ["herbPots",       544, 540, 244, 210, 18],
    ["swing",          820, 488, 273, 282, 16],
    ["hutch",         1126, 560, 187, 202, 14],
  ],
  B: [
    // ── L'ÉTALON : le lampadaire noir de la planche 2, allumé ───────────────
    ["lampRef",         44,  32,  54, 264, 12, { ref: true }],
    // ── LA PLACE : jardinières et vases, été puis hiver ─────────────────────
    ["planterSummer",  136,  74, 302, 216, 20],
    ["planterWinter",  474,  84, 260, 206, 16],
    ["urnSummer",      778,  14, 144, 305, 18],
    ["urnWinter",      963,  28, 111, 290, 16],
    // ── LES LAMPADAIRES PAR RANG ────────────────────────────────────────────
    ["lampRich",      1120,  24, 186, 422, 16],
    ["lampPoor",       814, 338,  79, 186, 12],
    // ── LA MAISON HANTÉE ET LE SOUS-BOIS ────────────────────────────────────
    ["bramble",         26, 344, 366, 208, 16],
    ["brambleSmall",   441, 407, 161, 145, 14],
    ["brambleRow",      16, 590, 658, 174, 16],
    ["wildGrass",      716, 552, 182, 200, 14],
    ["gate",           946, 516, 376, 252, 16],
  ],
};

/* JPG → PNG dans un dossier temporaire. ⚠️ `sips` est propre à macOS ; ailleurs,
   convertir les deux JPG en PNG par un autre moyen et pointer SHEETS dessus. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "planche3-"));
function toPNG(jpg, key) {
  const dst = path.join(tmp, key + ".png");
  execFileSync("sips", ["-s", "format", "png", jpg, "--out", dst], { stdio: "ignore" });
  return dst;
}

const mag = (r, g, b) => Math.min(r, b) - g;
const lum = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b;

/* 0 = objet, 1 = fond, 2 = ombre. */
function classify(sh) {
  const { w, h, px } = sh;
  const kind = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
    if (mag(r, g, b) >= MT) kind[i] = lum(r, g, b) < SH_LUM ? 2 : 1;
  }
  // Le liseré rose : un pixel d'objet un peu rosé qui touche le fond ou l'ombre.
  const drop = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (kind[i]) continue;
    if (mag(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]) < FRINGE) continue;
    let touchBg = false, touchSh = false;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
      if (j < 0) continue;
      if (kind[j] === 1) touchBg = true; else if (kind[j] === 2) touchSh = true;
    }
    if (touchBg || touchSh) drop.push(i, touchSh && !touchBg ? 2 : 1);
  }
  for (let k = 0; k < drop.length; k += 2) kind[drop[k]] = drop[k + 1];
  return kind;
}

/* Découpe un objet : ses pixels + l'ombre qui lui est CONNEXE (remplissage
   depuis les pixels d'objet à travers l'ombre, borné à la boîte agrandie). Rend
   un sprite recadré sur l'union objet + ombre. */
function cutObject(sh, kind, x, y, w, h, step) {
  const bx0 = Math.floor(x / step), by0 = Math.floor(y / step);
  const bx1 = Math.ceil((x + w) / step), by1 = Math.ceil((y + h) / step);
  const M = 9;                                            // ~50 px image de marge d'ombre
  const ex0 = Math.max(0, bx0 - M), ex1 = Math.min(sh.w, bx1 + M);
  const ey0 = Math.max(0, by0 - 1), ey1 = Math.min(sh.h, by1 + M);
  const own = new Uint8Array(sh.w * sh.h);                // 1 = objet, 2 = ombre
  const st = [];
  for (let j = by0; j < by1; j++) for (let i = bx0; i < bx1; i++) {
    if (i < 0 || j < 0 || i >= sh.w || j >= sh.h) continue;
    if (kind[j * sh.w + i] === 0) own[j * sh.w + i] = 1;
  }
  // l'ombre : germes = ombre voisine d'un pixel d'objet
  for (let j = ey0; j < ey1; j++) for (let i = ex0; i < ex1; i++) {
    const k = j * sh.w + i;
    if (kind[k] !== 2 || own[k]) continue;
    for (const n of [i > 0 ? k - 1 : -1, i < sh.w - 1 ? k + 1 : -1, j > 0 ? k - sh.w : -1, j < sh.h - 1 ? k + sh.w : -1]) {
      if (n >= 0 && own[n] === 1) { own[k] = 2; st.push(k); break; }
    }
  }
  while (st.length) {
    const k = st.pop(), i = k % sh.w, j = (k / sh.w) | 0;
    for (const n of [i > ex0 ? k - 1 : -1, i < ex1 - 1 ? k + 1 : -1, j > ey0 ? k - sh.w : -1, j < ey1 - 1 ? k + sh.w : -1]) {
      if (n >= 0 && kind[n] === 2 && !own[n]) { own[n] = 2; st.push(n); }
    }
  }
  let mnx = 1e9, mny = 1e9, mxx = -1, mxy = -1, foot = -1;
  for (let j = ey0; j < ey1; j++) for (let i = ex0; i < ex1; i++) {
    if (!own[j * sh.w + i]) continue;
    if (i < mnx) mnx = i; if (i > mxx) mxx = i; if (j < mny) mny = j; if (j > mxy) mxy = j;
    if (own[j * sh.w + i] === 1 && j > foot) foot = j;
  }
  if (mxx < 0) return null;
  const cw = mxx - mnx + 1, ch = mxy - mny + 1;
  const px = new Uint8ClampedArray(cw * ch * 4), shadow = new Uint8Array(cw * ch);
  for (let j = mny; j <= mxy; j++) for (let i = mnx; i <= mxx; i++) {
    const o = own[j * sh.w + i];
    if (!o) continue;
    const d = (j - mny) * cw + (i - mnx);
    if (o === 2) { shadow[d] = 1; continue; }
    const q = (j * sh.w + i) * 4;
    px[d * 4] = sh.px[q]; px[d * 4 + 1] = sh.px[q + 1]; px[d * 4 + 2] = sh.px[q + 2]; px[d * 4 + 3] = 255;
  }
  return { w: cw, h: ch, px, shadow, foot: foot - mny };
}

const ENC = (i) => String.fromCharCode(48 + i);
const out = [], report = [], sprites = [];

for (const key of Object.keys(SHEETS)) {
  const png = toPNG(SHEETS[key], key);
  const sh = nativeSheet(png, { step: STEP3, ox: 0, oy: 0 });
  const kind = classify(sh);
  let nb = 0, ns = 0; for (const v of kind) { if (v === 1) nb++; else if (v === 2) ns++; }
  console.log(`planche ${key} : ${sh.w}×${sh.h} natifs (pas ${STEP3}) — fond ${(100 * nb / kind.length).toFixed(1)} %, ombre ${(100 * ns / kind.length).toFixed(1)} %`);
  for (const [name, x, y, w, h, K, opt = {}] of CATALOGUE[key]) {
    const step = opt.step ?? STEP3;
    const s = cutObject(sh, kind, x, y, w, h, step);
    if (!s) { console.log("  ⚠️  " + name + " : rien dans la boîte"); continue; }
    const q = quantize(s, K);
    const rows = [];
    for (let j = 0; j < q.h; j++) {
      let r = "";
      for (let i = 0; i < q.w; i++) {
        const v = q.idx[j * q.w + i];
        r += v !== 255 ? ENC(v) : s.shadow[j * q.w + i] ? SHADOW : ".";
      }
      rows.push(r);
    }
    let sn = 0; for (const v of s.shadow) sn += v;
    out.push(`  ${name}: { w: ${q.w}, h: ${q.h}, foot: ${s.foot},\n    pal: [${q.pal.map(c => `"${c}"`).join(", ")}],\n    rows: [\n${rows.map(r => `      "${r}",`).join("\n")}\n    ] },`);
    report.push({ name, sheet: key, w: q.w, h: q.h, foot: s.foot, K: q.pal.length, from: q.colors, shadow: sn, ref: !!opt.ref });
    sprites.push({ name, q, shadow: s.shadow, foot: s.foot });
  }
}
fs.rmSync(tmp, { recursive: true, force: true });

const header = `/* ═══════════════════════════════════════════════════════════════════════════
   planche3.js — LES SPRITES DES DEUX PLANCHES DE LA PHASE 7b, EN DONNÉES.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ FICHIER GÉNÉRÉ PAR \`tools/import-planche3.mjs\`. NE PAS ÉDITER À LA MAIN.
   Pour changer un dessin, on change la PLANCHE (\`refs/planche3-*.jpg\`) ou le
   catalogue de l'outil.

   ⚠️ CE SONT LES PIXELS DE GEMINI, COPIÉS — même règle qu'aux 439 et 447. Sources
   en JPG (pas d'autre format disponible) : le fond magenta a été pris par sa
   teinte, le liseré rose des bords retiré. L'échelle (5,4 px image par pixel
   natif) est DÉRIVÉE des deux étalons, le banc de bois et le lampadaire ; le
   détail est en tête de l'outil.

   ⚠️ FORMAT — celui des planches 1 et 2, PLUS UN CARACTÈRE ET UN CHAMP :
   \`pal\` = la palette, \`rows\` = une chaîne par rangée, un caractère par pixel
   ('0'.. = index dans \`pal\`, '.' = transparent). NOUVEAU : '~' = l'OMBRE que
   Gemini a peinte sous l'objet ; le rejoueur la peint semi-transparente, ou
   pas du tout. \`foot\` = la dernière rangée de l'OBJET (l'ombre est en dessous) :
   c'est elle qui se pose sur le sol, pas le bas du canevas.
   ═══════════════════════════════════════════════════════════════════════════ */

export const PLANCHE3 = {
`;
fs.writeFileSync(path.join(ROOT, "components", "ferme", "planche3.js"), header + out.join("\n") + "\n};\n");

/* ── CONTRÔLE D'ÉCHELLE : les deux étalons, dans le jeu ──────────────────────
   Ce que la planche redessine doit retomber sur ce que le jeu fait déjà. */
const byName = (n) => report.find(r => r.name === n);
{
  const bn = byName("benchRef"), ln = byName("lampRef");
  console.log(`\nétalons (natifs) : banc ${bn.w} de large pour 36 (${(100 * (bn.w / 36 - 1)).toFixed(1)} %) · lampadaire ${ln.foot + 1} de haut pour 48 (${(100 * ((ln.foot + 1) / 48 - 1)).toFixed(1)} %)`);
}
console.log("\nobjet            natif       pied  ≈ m haut  K   couleurs lues  ombre");
for (const r of report) {
  const hm = ((r.foot + 1) / PX_PER_M).toFixed(1);
  console.log(`  ${r.name.padEnd(15)} ${String(r.w).padStart(3)}×${String(r.h).padStart(3)}   ${String(r.foot).padStart(4)}   ${hm.padStart(5)} m  ${String(r.K).padStart(3)}   ${String(r.from).padStart(6)}       ${r.shadow}${r.ref ? "   (étalon)" : ""}`);
}

/* ── LA PLANCHE DE CONTRÔLE ──────────────────────────────────────────────────
   Les sprites extraits, ×4, sur HERBE (pour juger le liseré rose et l'ombre) ;
   l'ombre est mélangée à 30 %. En tête, deux règles : un personnage de 23 px de
   haut (1,70 m) et une case de 16 px — c'est contre elles qu'on juge la taille.
   Un numéro (police 3×5) au-dessus de chaque objet, dans l'ordre imprimé. */
{
  const Z = 4, PAD = 10, LABEL = 14, WMAX = 1700;
  const rowsL = []; let cur = { items: [], w: PAD, h: 0 };
  const rulerW = 23 + 16 + 6;
  const items = [{ ruler: true, w: rulerW, h: 23 }, ...sprites.map((s, i) => ({ s, i, w: s.q.w, h: s.q.h }))];
  for (const it of items) {
    if (cur.items.length && cur.w + it.w * Z + PAD > WMAX) { rowsL.push(cur); cur = { items: [], w: PAD, h: 0 }; }
    cur.items.push(it); cur.w += it.w * Z + PAD; cur.h = Math.max(cur.h, it.h * Z);
  }
  rowsL.push(cur);
  const W = Math.max(...rowsL.map(r => r.w));
  const H = rowsL.reduce((a, r) => a + r.h + LABEL + PAD, PAD);
  const px = new Uint8ClampedArray(W * H * 4);
  const put = (x, y, c, a = 1) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const o = (y * W + x) * 4;
    px[o] = px[o] * (1 - a) + c[0] * a; px[o + 1] = px[o + 1] * (1 - a) + c[1] * a; px[o + 2] = px[o + 2] * (1 - a) + c[2] * a; px[o + 3] = 255;
  };
  const rect = (x, y, w, h, c, a = 1) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c, a); };
  // herbe : deux verts en damier de 8 px, comme une pelouse de jeu
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, ((x >> 3) + (y >> 3)) & 1 ? [92, 138, 60] : [84, 130, 54]);
  const DIG = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001", "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111"];
  const digits = (x, y, n) => { let cx = x; for (const ch of String(n)) { const g = DIG[+ch]; for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === "1") rect(cx + i * 2, y + j * 2, 2, 2, [255, 255, 255]); cx += 8; } };
  let y0 = PAD;
  for (const r of rowsL) {
    let x0 = PAD;
    for (const it of r.items) {
      const by = y0 + LABEL + (r.h - it.h * Z);
      if (it.ruler) {
        rect(x0, by, 23 * Z, 23 * Z, [255, 255, 255], 0.55);           // 1,70 m
        rect(x0 + 23 * Z + 6 * Z, by + (23 - 16) * Z, 16 * Z, 16 * Z, [255, 255, 255], 0.35);   // une case
      } else {
        const { q, shadow } = it.s;
        for (let j = 0; j < q.h; j++) for (let i = 0; i < q.w; i++) {
          if (shadow[j * q.w + i]) rect(x0 + i * Z, by + j * Z, Z, Z, [20, 10, 30], 0.30);
        }
        const rgba = toRGBA(q);
        for (let j = 0; j < q.h; j++) for (let i = 0; i < q.w; i++) {
          const o = (j * q.w + i) * 4;
          if (!rgba.px[o + 3]) continue;
          rect(x0 + i * Z, by + j * Z, Z, Z, [rgba.px[o], rgba.px[o + 1], rgba.px[o + 2]]);
        }
        rect(x0 - 1, y0 - 1, 6 + 8 * String(it.i).length, 14, [0, 0, 0], 0.8);
        digits(x0 + 1, y0 + 1, it.i);
      }
      x0 += it.w * Z + PAD;
    }
    y0 += r.h + LABEL + PAD;
  }
  fs.mkdirSync(OUT, { recursive: true });
  writePNG(path.join(OUT, "planche3-importee.png"), px, W, H);
  console.log(`\nplanche de contrôle : tools/out/planche3-importee.png (${W}×${H}, ×${Z}) — la règle en tête : personnage 23 px (1,70 m) puis une case de 16`);
  console.log("numéros : " + sprites.map((s, i) => `${i}=${s.name}`).join("  "));
}
