/* =============================================================================
   build-lampadaires.mjs — LES DEUX LAMPADAIRES PAR RANG, AU PIXEL D'ÉCRAN
   (2026-10-02, « comme les maisons », décision de Guillaume).
   -----------------------------------------------------------------------------
   POURQUOI : `import-planche3.mjs` ramène chaque objet à la grille des gros
   pixels (médiane 3 × 3, pas 7,5). Gemini a peint le candélabre sur ~420 px de
   haut ; le jeu en garde 59, le fût tombe à 1 px et les lanternes s'empâtent.
   Ici on refait ce que `lib-mip.mjs` fait pour les maisons : UNE IMAGE PAR CRAN
   DE ZOOM, rééchantillonnée en Lanczos-3 (alpha prémultiplié) depuis la planche
   d'origine à sa taille d'écran exacte (`townBitmapMip`), posée par le jeu à
   1 px d'image = 1 px d'écran, sans lissage (`drawScreenLamp`, FermeGame.js).

   CE QUI EST GARDÉ DE L'IMPORT, EXPRÈS — pour que l'image recouvre exactement
   son sprite natif et que rien de la géométrie monde ne bouge :
   · le DÉTOURAGE et le CADRE : `classify` / `cutObject` (lib-planche3.mjs), la
     même boîte (`LAMPS`), la même règle de fond / ombre / liseré rose. Le
     rectangle de la planche qui a donné le sprite natif (origine rendue par
     `cutObject`, × le pas) est celui qu'on rééchantillonne : `disp × dispH` de
     `TOWN_LAMP_BITMAPS` EST la taille du canevas natif, donc le point lumineux
     lu sur le natif (`S.lampGlass`) tombe sur le verre de l'image ;
   · l'OMBRE de Gemini, rejouée en ombre du jeu (`PLANCHE3_SHADOW`, translucide,
     seulement la partie CONNEXE à l'objet) ;
   · ce qui reste du JEU : la lumière (`townLampArtAt`, halos), la neige (chapeau
     lu dans les pixels de l'image), les reflets (le natif).
   Le détourage se fait au PLEIN RÉSOLUTION puis se rééchantillonne : les bords
   gagnent leur anticrénelage à la taille d'écran, ils n'héritent pas de celui
   du JPEG. Le liseré rose (teinte entre FRINGE et MT, au contact du fond) est
   retiré avant, comme à l'import.

   DEUX ÉTATS PAR CRAN : `day` (lanterne ÉTEINTE, de jour) et `glow` (ALLUMÉE) —
   deux images entières, parce qu'une lampe s'allume d'un coup en changeant son
   verre (voir `TOWN_LAMP_BITMAPS`). Le verre éteint reprend les gris-bleu des
   lanternes des planches 1 et 2 (`p3GlassOff`, fermeArt.js), en RAMPE continue
   sur la luminosité (le natif en a trois paliers) ; le verre se reconnaît à sa
   chaleur ET à sa clarté (le bois du poteau modeste est brun mais sombre).

   Usage :  node tools/build-lampadaires.mjs
   ⚠️ `sips` (macOS) lit le JPG ; ailleurs, convertir la planche en PNG par un
   autre moyen et pointer `SHEET` dessus.
   ========================================================================== */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readPNG } from "./lib-png.mjs";
import { nativeSheet } from "./lib-planche.mjs";
import { classify, cutObject, LAMPS, MT } from "./lib-planche3.mjs";
import { loadFerme } from "./lib-canvas.mjs";
import { writeMips } from "./lib-mip.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHEET = path.join(ROOT, "refs", "planche3-place.jpg");
const { fermeConstants: C } = await loadFerme(ROOT, ["fermeConstants"]);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lampadaires-"));
const png = path.join(tmp, "place.png");
execFileSync("sips", ["-s", "format", "png", SHEET, "--out", png], { stdio: "ignore" });
const img = readPNG(png);
const full = { w: img.W, h: img.H, px: img.px };
const fullKind = classify(full);      // 0 objet · 1 fond · 2 ombre — au plein résolution

/* Le verre : chaud ET clair. Une mesure continue (0 à 1), pas un seuil — le bord
   d'un verre est un dégradé, et un seuil y laisserait un liseré orange. */
const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
/* ⚠️ La clarté pèse plus que la chaleur : le BOUT du poteau modeste (bois clair, lum 120-173,
   médiane 133) et l'ornement du pied du candélabre sont chauds eux aussi, et passaient au gris-bleu
   avec un seuil de clarté à 105-135 (mesuré : 107 pixels du poteau changeaient en allumant). Le verre,
   lui, a une médiane de 200 ; ses bords ambre plus sombres gardent leur teinte — ce sont ses barreaux. */
const glassAmount = (r, g, b) => smooth(35, 65, r - b) * smooth(150, 182, 0.3 * r + 0.59 * g + 0.11 * b);
/* Les trois paliers de `p3GlassOff` (#56646c, #6c7a82, #a3b4bb), en rampe sur la luminosité. */
const OFF = [[170, [0x56, 0x64, 0x6c]], [210, [0x6c, 0x7a, 0x82]], [245, [0xa3, 0xb4, 0xbb]]];
function glassOff(L) {
  if (L <= OFF[0][0]) return OFF[0][1];
  for (let i = 1; i < OFF.length; i++) {
    if (L <= OFF[i][0]) {
      const t = (L - OFF[i - 1][0]) / (OFF[i][0] - OFF[i - 1][0]);
      return OFF[i - 1][1].map((v, c) => v + (OFF[i][1][c] - v) * t);
    }
  }
  return OFF[OFF.length - 1][1];
}

const report = [];
for (const [rank, SB] of Object.entries(C.TOWN_LAMP_BITMAPS)) {
  const { box, step } = LAMPS[SB.art];
  /* Le cadre du sprite natif : la même segmentation que l'import. */
  const sh = nativeSheet(png, { step, ox: 0, oy: 0 });
  const nat = cutObject(sh, classify(sh), box[0], box[1], box[2], box[3], step);
  if (!nat || nat.w !== SB.disp || nat.h !== SB.dispH)
    throw new Error(`${SB.art} : le cadre natif (${nat && nat.w}×${nat && nat.h}) n'est plus celui de TOWN_LAMP_BITMAPS (${SB.disp}×${SB.dispH}) — relancer import-planche3`);
  const sx0 = Math.max(0, Math.round(nat.x0 * step)), sy0 = Math.max(0, Math.round(nat.y0 * step));
  const sx1 = Math.min(full.w, Math.round((nat.x0 + nat.w) * step)), sy1 = Math.min(full.h, Math.round((nat.y0 + nat.h) * step));
  const CW = sx1 - sx0, CH = sy1 - sy0;
  const at = (x, y) => (sy0 + y) * full.w + sx0 + x;

  /* Le cadre, copié : `classify` ôte le liseré rose d'UN pixel, assez pour la
     grille native (un pixel = 7 px de planche), pas pour une image qui garde le
     détail — le flou du JPEG déborde de 2 à 3 px. On en retire deux couches de
     plus (un pixel d'objet un peu rosé qui touche le fond : MT/3), ce qui coûte
     ≤ 0,3 px d'écran au cran 5 et épargne les contours sombres (peu magenta). */
  const kind = new Uint8Array(CW * CH);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) kind[y * CW + x] = fullKind[at(x, y)];
  const magAt = (x, y) => { const q = at(x, y) * 4; return Math.min(img.px[q], img.px[q + 2]) - img.px[q + 1]; };
  const lumAt = (x, y) => { const q = at(x, y) * 4; return 0.3 * img.px[q] + 0.59 * img.px[q + 1] + 0.11 * img.px[q + 2]; };
  let eroded = 0;
  for (let pass = 0; pass < 2; pass++) {
    const drop = [];
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      if (kind[y * CW + x] !== 0 || magAt(x, y) < MT / 3 || lumAt(x, y) < 50) continue;   // un contour SOMBRE ne se retire pas (il serait pointillé) : on le désature plus bas
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= CW || yy >= CH || kind[yy * CW + xx] !== 0) { drop.push(y * CW + x); break; }
      }
    }
    for (const k of drop) kind[k] = 1;
    eroded += drop.length;
  }
  /* L'OMBRE : seulement celle du SOL. La lueur violette des lanternes, juste plus
     sombre que le fond par endroits, serait classée « ombre » tout le long du
     poteau et dessinerait des griffonnages (vu sur la planche, cran 5) ; le pied
     du sprite natif (`foot`) dit où commence le sol, à trois pas natifs près. */
  const footY = Math.round((nat.y0 + nat.foot + 1) * step) - sy0, shadowTop = footY - Math.round(3 * step);
  /* L'ombre CONNEXE à l'objet (remplissage depuis l'objet à travers l'ombre, dans le cadre). */
  const shadow = new Uint8Array(CW * CH), stack = [];
  for (let y = shadowTop; y < CH; y++) for (let x = 0; x < CW; x++) {
    if (kind[y * CW + x] !== 2) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < CW && yy < CH && kind[yy * CW + xx] === 0) { shadow[y * CW + x] = 1; stack.push(y * CW + x); break; }
    }
  }
  while (stack.length) {
    const k = stack.pop(), x = k % CW, y = (k / CW) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < shadowTop || xx >= CW || yy >= CH) continue;
      if (kind[yy * CW + xx] === 2 && !shadow[yy * CW + xx]) { shadow[yy * CW + xx] = 1; stack.push(yy * CW + xx); }
    }
  }

  /* Le contour de l'ombre est du bruit JPEG (des pixels isolés, un liseré en dents de scie) : on ôte
     ceux qui n'ont pas au moins 4 voisins (sur 8) dans l'ombre ou l'objet. Une passe suffit. */
  {
    const keep = new Uint8Array(CW * CH);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      if (!shadow[y * CW + x]) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < CW && yy < CH && (shadow[yy * CW + xx] || kind[yy * CW + xx] === 0)) n++;
      }
      if (n >= 4) keep[y * CW + x] = 1;
    }
    shadow.set(keep);
  }
  /* Les deux jeux de plans prémultipliés (r·a, g·a, b·a, a), couleurs 0..255. */
  const mk = () => [0, 1, 2, 3].map(() => new Float32Array(CW * CH));
  const off = mk(), on = mk();
  let nObj = 0, nGlass = 0, nShadow = 0, opaqueEdge = 0;
  const [sr, sg, sb] = C.PLANCHE3_SHADOW.rgb, sa = C.PLANCHE3_SHADOW.a;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const i = y * CW + x, q = at(x, y) * 4;
    if (kind[i] === 0) {
      nObj++;
      let r = img.px[q], g = img.px[q + 1], b = img.px[q + 2];
      /* Le magenta du fond teinte les contours sombres (violet prune) et les
         pierres du pied : on retire l'excès de rouge ET de bleu sur le vert. */
      const m = Math.max(0, Math.min(r, b) - g) * 0.85;
      r -= m; b -= m;
      on[0][i] = r; on[1][i] = g; on[2][i] = b; on[3][i] = 1;
      const w = glassAmount(r, g, b);
      if (w > 0.01) {
        nGlass++;
        const [or, og, ob] = glassOff(0.3 * r + 0.59 * g + 0.11 * b);
        off[0][i] = r + (or - r) * w; off[1][i] = g + (og - g) * w; off[2][i] = b + (ob - b) * w;
      } else { off[0][i] = r; off[1][i] = g; off[2][i] = b; }
      off[3][i] = 1;
      if (x === 0 || y === 0 || x === CW - 1 || y === CH - 1) opaqueEdge++;
    } else if (shadow[i]) {
      nShadow++;
      for (const P of [on, off]) { P[0][i] = sr * sa; P[1][i] = sg * sa; P[2][i] = sb * sa; P[3][i] = sa; }
    }
  }
  const lines = writeMips(ROOT, SB, C.townBitmapMip, off, on, CW, CH);
  report.push(`${rank} (${SB.art}) : cadre natif ${nat.w}×${nat.h}, planche ${CW}×${CH} px (${sx0},${sy0}) · objet ${nObj} px dont verre ${nGlass} · bord rosé ôté ${eroded} px · ombre ${nShadow} px · ${opaqueEdge} px d'objet sur le bord du cadre\n  ` + lines.join("\n  "));
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(report.join("\n"));
