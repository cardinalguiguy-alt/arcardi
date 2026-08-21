/* =============================================================================
   import-escaliers-assets.mjs — LES PIXELS DE `refs/ASSETS.jpg`, SANS REDESSIN.
   (466)
   -----------------------------------------------------------------------------
   Demande explicite de Guillaume : copie exacte, aucune approximation créative.
   Le JPEG est converti mécaniquement en PNG (`refs/escaliers-assets.png`), puis
   ramené de son agrandissement ×4 au pixel natif. Chaque couleur restante est
   encodée telle quelle : PAS de quantification, PAS de palette réinterprétée.

   Le fond est le gris neutre 121..151 de la planche. Il est retiré par couleur
   sur toute la découpe, y compris dans les jours fermés des balustrades ; la
   pierre beige reste parce que son écart rouge/bleu dépasse le seuil neutre.
   C'est le cas inverse de la première planche (`lib-planche.mjs`) : une simple
   propagation depuis le bord laisserait du gris enfermé entre les balustres.

   Usage : node tools/import-escaliers-assets.mjs
   ========================================================================== */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { nativeSheet, backgroundMask, cut, slice } from "./lib-planche.mjs";
import { makeCanvas, writePNG } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "refs", "escaliers-assets.png");
const TARGET = path.join(ROOT, "components", "ferme", "plancheEscaliers.js");
const OUT = path.join(ROOT, "tools", "out");
const STEP = 4, SC = (v) => Math.round(v / STEP);

/* [nom, x, y, w, h, mode]. Coordonnées exactes dans ASSETS.jpg (1072×992).
   `slice` garde le cadre : obligatoire pour les ouvrages destinés à se joindre.
   `cut` recadre les colonnes sur leur matière afin que leur ancre soit juste. */
const CATALOGUE = [
  ["wallLight",       20,  52, 216, 216, "slice"],
  ["wallDark",       256,  52, 216, 216, "slice"],
  ["balustradeStone",488,  48, 384, 116, "slice"],
  ["balustradeIron", 488, 180, 384, 132, "slice"],
  ["columnTallL",    892,  46,  68, 408, "cut"],
  ["columnTallR",    984,  46,  68, 380, "cut"],
  ["columnShortL",   892, 494,  68, 260, "cut"],
  ["columnShortR",   984, 494,  68, 260, "cut"],
  /* Cadre de 32×16 natifs conservé : les deux moitiés deviennent deux cases
     jointives sans étirer ni inventer un pixel. */
  ["treadTop",       480, 352, 128,  64, "slice"],
  ["treadFace",      480, 476, 128,  64, "slice"],
  ["wallPanel",      632, 354, 240, 152, "slice"],
  ["stairsLeft",      16, 332, 220, 224, "cut"],
  ["stairsRight",    256, 332, 196, 224, "cut"],
  ["flowerPot",      174, 806, 116, 178, "cut"],
  ["signFlowers",    282, 806, 220, 178, "cut"],
];

const sh = nativeSheet(SOURCE, { step: STEP, ox: 0, oy: 0 });
const bg = backgroundMask(sh, 15, { ref: 136, enclosed: true });
/* Les accessoires sont posés sur une zone de fond plus bruitée par le JPEG que
   les ouvrages. Son gris gagne parfois 10 à 15 points d'écart entre canaux :
   le masque générique (écart ≤ 6) le garderait en rectangles. On retire donc
   ici uniquement les neutres moyens ; la terre cuite est colorée, les panneaux
   sont clairs et leurs ombres/poteaux sont sous 90. */
const bgProps = new Uint8Array(sh.w * sh.h);
for (let i = 0; i < sh.w * sh.h; i++) {
  const r = sh.px[i * 4], g = sh.px[i * 4 + 1], b = sh.px[i * 4 + 2];
  const lo = Math.min(r, g, b), hi = Math.max(r, g, b);
  if (lo >= 90 && hi <= 190 && hi - lo <= 20) bgProps[i] = 1;
}

const hex = (r, g, b) => "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
function rowsOf(s) {
  const rows = [];
  for (let y = 0; y < s.h; y++) {
    const runs = [];
    let x = 0;
    while (x < s.w) {
      const o = (y * s.w + x) * 4;
      const col = s.px[o + 3] ? hex(s.px[o], s.px[o + 1], s.px[o + 2]) : null;
      let n = 1;
      while (x + n < s.w) {
        const q = (y * s.w + x + n) * 4;
        const qc = s.px[q + 3] ? hex(s.px[q], s.px[q + 1], s.px[q + 2]) : null;
        if (qc !== col) break;
        n++;
      }
      runs.push([n, col]); x += n;
    }
    rows.push(runs);
  }
  return rows;
}

const sprites = {};
for (const [name, x, y, w, h, mode] of CATALOGUE) {
  const bx = SC(x), by = SC(y), bw = SC(w), bh = SC(h);
  const mask = name === "flowerPot" || name === "signFlowers" ? bgProps : bg;
  const s = mode === "slice" ? slice(sh, mask, bx, by, bw, bh) : cut(sh, mask, bx, by, bw, bh, 0);
  if (!s) throw new Error(`découpe vide : ${name}`);
  sprites[name] = { w: s.w, h: s.h, rows: rowsOf(s), px: s.px };
  console.log(`${name.padEnd(18)} ${s.w}×${s.h}`);
}

const body = Object.entries(sprites).map(([name, s]) =>
  `  ${name}: { w: ${s.w}, h: ${s.h}, rows: ${JSON.stringify(s.rows)} },`).join("\n");
fs.writeFileSync(TARGET, `/* ═══════════════════════════════════════════════════════════════════════════
   plancheEscaliers.js — EXTRACTION EXACTE DE refs/ASSETS.jpg (466).
   ⚠️ GÉNÉRÉ PAR tools/import-escaliers-assets.mjs. NE PAS ÉDITER À LA MAIN.
   Pixels sources natifs ×4, fond détouré, aucune quantification de palette.
   ══════════════════════════════════════════════════════════════════════════ */
export const ESCALIER_ASSETS = {\n${body}\n};\n`);

/* Planche de contrôle : les découpes, jamais une reconstitution. */
const W = 280, H = 210, cv = makeCanvas(W, H);
cv.ctx.fillStyle = "#58764b"; cv.ctx.fillRect(0, 0, W, H);
const placements = [
  ["wallLight", 2, 2], ["wallDark", 60, 2], ["balustradeStone", 116, 2],
  ["balustradeIron", 116, 38], ["columnTallL", 220, 2], ["columnTallR", 242, 2],
  ["columnShortL", 220, 112], ["columnShortR", 244, 112],
  ["treadTop", 2, 66], ["treadFace", 38, 66], ["wallPanel", 74, 78],
  ["stairsLeft", 2, 112], ["stairsRight", 68, 112],
  ["flowerPot", 132, 112], ["signFlowers", 164, 126],
];
for (const [name, x, y] of placements) {
  const s = sprites[name]; cv.ctx.drawImage({ width: s.w, height: s.h, __px: s.px }, x, y);
}
writePNG(path.join(OUT, "escaliers-assets-importes.png"), cv.px, W, H);
console.log("\nÉcrit : components/ferme/plancheEscaliers.js, tools/out/escaliers-assets-importes.png");
