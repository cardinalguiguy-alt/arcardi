/* =============================================================================
   render-tribunal.mjs — LE MOBILIER DU TRIBUNAL ET DE LA VILLE, EN PNG. (426)
   -----------------------------------------------------------------------------
   Même raison d'être que render-fruits.mjs au 398, et la même phrase suffit :
   ON NE PEUT PAS SOIGNER CE QU'ON NE REGARDE PAS. Ce zip ajoute vingt-cinq
   meubles d'intérieur et huit décors de rue, tous dessinés au pixel dans
   fermeArt.js ; les juger sans les voir reviendrait à refaire les quatre
   refontes en aveugle que le 397 a payées.

   ⚠️ CE QU'IL NE MONTRE PAS : la scène. Le rendu d'un niveau du tribunal vit
   dans la closure de FermeGame.js et ne peut pas être appelé hors navigateur ;
   la GÉOMÉTRIE (circulation, portes, escaliers) est donc contrôlée ailleurs, par
   tools/verify-vallee.mjs. Les deux bancs sont complémentaires et aucun ne
   remplace l'autre.

   ⚠️ ET LE FOND N'EST PAS DÉCORATIF. Un meuble se juge sur le sol où il sera
   POSÉ : le parquet des bureaux, le marbre du hall, la dalle du sous-sol. Un
   fauteuil sombre sur fond blanc paraît net et disparaît sur le parquet.

   Usage :  node tools/render-tribunal.mjs
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt"]);
const A = mods.fermeArt;
const S = A.buildSprites();

// Les trois sols du bâtiment, repris À L'IDENTIQUE des couleurs de
// drawCourtFrame — un fond « à peu près » ne prouverait rien.
const FLOORS = [
  ["parquet", [0x8a, 0x64, 0x40]],
  ["marbre", [0xcd, 0xc9, 0xbd]],
  ["dalle", [0x6e, 0x6f, 0x74]],
];
const GRASS = [0x5c, 0x9e, 0x4e];

function sheet(imgs, bg, cell, pad = 6) {
  const cols = Math.min(9, imgs.length), rows = Math.ceil(imgs.length / cols);
  const W = cols * (cell + pad) + pad, H = rows * (cell + pad) + pad;
  const s = makeCanvas(W, H);
  s.ctx.fillStyle = `rgba(${bg[0]},${bg[1]},${bg[2]},1)`;
  s.ctx.fillRect(0, 0, W, H);
  imgs.forEach((im, i) => {
    if (!im || !im.__px) return;
    const cx = pad + (i % cols) * (cell + pad), cy = pad + Math.floor(i / cols) * (cell + pad);
    // Ancrage par le BAS, comme dans le jeu : c'est la seule façon de voir si
    // un meuble « flotte » ou s'il pose bien sur sa case.
    s.ctx.drawImage(im, cx + Math.floor((cell - im.width) / 2), cy + cell - im.height);
    s.ctx.fillStyle = "rgba(0,0,0,0.35)";
    s.ctx.fillRect(cx, cy + cell, cell, 1);   // la ligne de sol
  });
  return s;
}

// Combien de couleurs, combien de pixels peints : deux nombres qui suffisent à
// repérer un sprite vide (un `kind` mal orthographié) ou un sprite plat.
function stats(im) {
  const cols = new Set();
  let opaque = 0;
  for (let i = 0; i < im.__px.length; i += 4) {
    if (im.__px[i + 3] > 8) { opaque++; cols.add(`${im.__px[i]},${im.__px[i + 1]},${im.__px[i + 2]}`); }
  }
  return { cols: cols.size, opaque };
}

console.log("\n=== mobilier du tribunal → tools/out/ ===\n");
console.log("meuble            couleurs  px opaques");
console.log("-".repeat(42));
const kinds = Object.keys(S.courtProps);
let thin = [];
for (const k of kinds) {
  const st = stats(S.courtProps[k]);
  console.log(`${k.padEnd(18)}${String(st.cols).padStart(6)}${String(st.opaque).padStart(11)}`);
  // ⚠️ LE SEUIL ATTRAPE LE SPRITE DE SECOURS. Un `kind` inconnu rend un carré
  // rose de 12×12 : 1 couleur, 144 pixels. Deux couleurs ou moins = suspect.
  if (st.cols <= 2) thin.push(k);
}
if (thin.length) console.log(`\n⚠️  sprites suspects (≤ 2 couleurs) : ${thin.join(", ")}`);

for (const [name, bg] of FLOORS) {
  const sh = sheet(kinds.map(k => S.courtProps[k]), bg, 48);
  const up = scale(sh.px, sh.width, sh.height, 3);
  writePNG(path.join(OUT, `tribunal-mobilier-${name}.png`), up.px, up.W, up.H);
}
// Les décors de rue, sur l'herbe — c'est là qu'ils vivent.
const townKinds = [
  ["etal-0", S.townStalls[0]], ["etal-1", S.townStalls[1]], ["etal-2", S.townStalls[2]], ["etal-3", S.townStalls[3]],
  ["kiosque", S.townKiosk], ["tombe", S.townGrave], ["jardiniere", S.townPlanter],
  ["panneau-rue", S.townStreetSign], ["statue", S.townStatue], ["puits", S.townWell], ["caisse", S.townCrate],
];
console.log("\n=== décors de rue → tools/out/ ===\n");
for (const [n, im] of townKinds) {
  const st = stats(im);
  console.log(`${n.padEnd(18)}${String(st.cols).padStart(6)}${String(st.opaque).padStart(11)}`);
}
{
  const sh = sheet(townKinds.map(t => t[1]), GRASS, 64);
  const up = scale(sh.px, sh.width, sh.height, 3);
  writePNG(path.join(OUT, "ville-decors.png"), up.px, up.W, up.H);
}
console.log("\nÉcrit : tribunal-mobilier-{parquet,marbre,dalle}.png, ville-decors.png\n");
