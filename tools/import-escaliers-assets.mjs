/* =============================================================================
   import-escaliers-assets.mjs — LES PIXELS DES ESCALIERS, SANS REDESSIN.
   (467)
   -----------------------------------------------------------------------------
   Demande explicite de Guillaume : copie exacte, aucune approximation créative.
   Les deux JPEG sont convertis mécaniquement en PNG, puis ramenés de leur
   agrandissement ×4 au pixel natif. Chaque couleur restante est encodée telle
   quelle : PAS de quantification, PAS de palette réinterprétée.

   `ESCALIERDETOURE` est importé comme UN SEUL bloc 268×248. Son gris de détourage
   est retiré par couleur, y compris dans les jours fermés des balustrades. Le
   JPEG contient aussi des pixels gris légitimes dans la maçonnerie : on ne
   retire donc que les composantes connexes d'au moins 12 pixels. Mesuré sur la
   source 467, les vrais jours font 14 pixels au minimum et les faux positifs
   dans la pierre 9 au maximum. Cette marge nettoie le masque sans trouer les
   murs ; le banc verrouille les deux bornes.

   Usage : node tools/import-escaliers-assets.mjs
   ========================================================================== */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { nativeSheet, backgroundMask, slice } from "./lib-planche.mjs";
import { makeCanvas, writePNG } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "refs", "escaliers-assets.png");
const BLOCK_SOURCE = path.join(ROOT, "refs", "ESCALIERDETOURE.png");
const TARGET = path.join(ROOT, "components", "ferme", "plancheEscaliers.js");
const OUT = path.join(ROOT, "tools", "out");
const STEP = 4, SC = (v) => Math.round(v / STEP);

/* [nom, x, y, w, h]. Coordonnées exactes dans ASSETS.jpg (1072×992).
   `slice` garde le cadre : obligatoire pour les ouvrages destinés à se joindre. */
const CATALOGUE = [
  ["wallLight",       20,  52, 216, 216],
  ["wallDark",       256,  52, 216, 216],
  /* Cadre de 32×16 natifs conservé : les deux moitiés deviennent deux cases
     jointives sans étirer ni inventer un pixel. */
  ["treadTop",       480, 352, 128,  64],
  ["treadFace",      480, 476, 128,  64],
  ["wallPanel",      632, 354, 240, 152],
];

const sh = nativeSheet(SOURCE, { step: STEP, ox: 0, oy: 0 });
const bg = backgroundMask(sh, 15, { ref: 136, enclosed: true });
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
for (const [name, x, y, w, h] of CATALOGUE) {
  const bx = SC(x), by = SC(y), bw = SC(w), bh = SC(h);
  const s = slice(sh, bg, bx, by, bw, bh);
  if (!s) throw new Error(`découpe vide : ${name}`);
  sprites[name] = { w: s.w, h: s.h, rows: rowsOf(s), px: s.px };
  console.log(`${name.padEnd(18)} ${s.w}×${s.h}`);
}

/* Le bloc détouré : un masque par grandes composantes, pas une somme de crops.
   Les ouvertures de la balustrade sont fermées dans l'image, donc le test de
   couleur est global ; le seuil de taille protège les gris isolés du bâtiment. */
const blockSheet = nativeSheet(BLOCK_SOURCE, { step: STEP, ox: 0, oy: 0 });
const blockGray = backgroundMask(blockSheet, 18, { ref: 132, enclosed: true });
const blockBg = new Uint8Array(blockGray.length), seen = new Uint8Array(blockGray.length);
const bgComponents = [];
for (let i = 0; i < blockGray.length; i++) {
  if (!blockGray[i] || seen[i]) continue;
  const stack = [i], cells = [];
  seen[i] = 1;
  while (stack.length) {
    const q = stack.pop(), x = q % blockSheet.w;
    cells.push(q);
    for (const d of [-1, 1, -blockSheet.w, blockSheet.w]) {
      const n = q + d;
      if (n < 0 || n >= blockGray.length || seen[n] || !blockGray[n]) continue;
      if (Math.abs((n % blockSheet.w) - x) > 1) continue;
      seen[n] = 1;
      stack.push(n);
    }
  }
  bgComponents.push(cells.length);
  if (cells.length >= 12) for (const q of cells) blockBg[q] = 1;
}
const courtBlock = slice(blockSheet, blockBg, 0, 0, blockSheet.w, blockSheet.h);
sprites.courtBlock = { w: courtBlock.w, h: courtBlock.h, rows: rowsOf(courtBlock), px: courtBlock.px };
const kept = bgComponents.filter(n => n >= 12), discarded = bgComponents.filter(n => n < 12);
console.log(`${"courtBlock".padEnd(18)} ${courtBlock.w}×${courtBlock.h}`);
console.log(`fond : ${kept.length} composantes gardées (min ${Math.min(...kept)}), pierre : max ${Math.max(...discarded)}`);

const body = Object.entries(sprites).map(([name, s]) =>
  `  ${name}: { w: ${s.w}, h: ${s.h}, rows: ${JSON.stringify(s.rows)} },`).join("\n");
fs.writeFileSync(TARGET, `/* ═══════════════════════════════════════════════════════════════════════════
   plancheEscaliers.js — EXTRACTION EXACTE DES SOURCES D'ESCALIER (467).
   ⚠️ GÉNÉRÉ PAR tools/import-escaliers-assets.mjs. NE PAS ÉDITER À LA MAIN.
   Pixels sources natifs ×4, fond détouré, aucune quantification de palette.
   L'escalier du tribunal est UN bloc 268×248, jamais une recomposition.
   ══════════════════════════════════════════════════════════════════════════ */
export const ESCALIER_ASSETS = {\n${body}\n};\n`);

/* Planche de contrôle : le bloc lui-même sur le vert qu'il doit laisser voir. */
const W = 280, H = 260, cv = makeCanvas(W, H);
cv.ctx.fillStyle = "#58764b"; cv.ctx.fillRect(0, 0, W, H);
const placements = [
  ["courtBlock", 6, 6],
];
for (const [name, x, y] of placements) {
  const s = sprites[name]; cv.ctx.drawImage({ width: s.w, height: s.h, __px: s.px }, x, y);
}
writePNG(path.join(OUT, "escaliers-assets-importes.png"), cv.px, W, H);
console.log("\nÉcrit : components/ferme/plancheEscaliers.js, tools/out/escaliers-assets-importes.png");
