/* =============================================================================
   tools/render-flowers.mjs — les seize fleurs en pots, en PNG (zip 388).
   -----------------------------------------------------------------------------
       node public/templerun/tools/render-flowers.mjs

   Appelle la VRAIE `flowerPotSprite` de fermeArt.js, avec les VRAIES entrées de
   `UNIQUE_DECORATIONS`, et les pose toutes sur UNE planche. Le point n'est pas
   de vérifier qu'il y a seize fonctions : c'est de voir laquelle ne se
   distingue pas de sa voisine. La promesse faite à Guillaume est « autant de
   variété que possible, tous les types, très beau » — aucune constante ne dit
   ça, seule une planche peut le dire.

   Deux planches :
     flowers-sheet.png  — les seize côte à côte, à ×4, sur damier
     flowers-scale.png  — les mêmes à ×1 et ×2, à l'échelle où on les verra
                          vraiment dans la ferme, posées sur de l'herbe

   Plus quatre contrôles chiffrés (voir la sortie).

   ⚠️ CE QU'IL NE PROUVE PAS : rien sur le gnome, la fontaine et la roue
   solaire (arc/stroke, sautés) ; rien sur la façon dont FermeGame POSE la
   décoration dans le monde.
   ========================================================================== */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";
import { installFakeDocument, blitTo, coverage, signature } from "./lib-sprite-canvas.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fermeDir = path.resolve(here, "../../../components/ferme");
const outDir = path.join(here, "out");
fs.mkdirSync(outDir, { recursive: true });

installFakeDocument();

/* Même contournement que render-candy.mjs : les modules du jeu importent
   "./fermeConstants" sans extension, ce que Next résout et Node non. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vf-flowers-"));
for (const f of ["fermeConstants.js", "fermeEngine.js", "fermeArt.js"]) {
  fs.writeFileSync(path.join(tmp, f), fs.readFileSync(path.join(fermeDir, f), "utf8")
    .replace(/from\s+"\.\/(ferme[A-Za-z]+)"/g, 'from "./$1.js"'));
}
const C = await import(pathToFileURL(path.join(tmp, "fermeConstants.js")).href);
const ART = await import(pathToFileURL(path.join(tmp, "fermeArt.js")).href);

/* ========================================================================= PNG */
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function writePng(file, W, H, rgb) {
  const raw = Buffer.alloc(H * (W * 3 + 1));
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    for (let x = 0; x < W * 3; x++) raw[y * (W * 3 + 1) + 1 + x] = rgb[y * W * 3 + x];
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]));
}
const fill = (rgb, W, H, col) => { for (let i = 0; i < W * H; i++) { rgb[i * 3] = col[0]; rgb[i * 3 + 1] = col[1]; rgb[i * 3 + 2] = col[2]; } };

/* ==================================================================== PLANCHES */
const flowers = C.UNIQUE_DECORATIONS.filter(d => d.shape);
const legacy = C.UNIQUE_DECORATIONS.filter(d => !d.shape);
const SW = 20, SH = 28;

// --- planche 1 : les seize à ×4, sur damier ---------------------------------
{
  const SC = 4, COLS = 8, PAD = 6;
  const cw = SW * SC + PAD, ch = SH * SC + PAD;
  const rows = Math.ceil(flowers.length / COLS);
  const W = COLS * cw + PAD, H = rows * ch + PAD;
  const rgb = new Uint8Array(W * H * 3); fill(rgb, W, H, [40, 42, 48]);
  flowers.forEach((d, i) => {
    const cvs = ART.flowerPotSprite(d);
    blitTo(rgb, W, H, cvs, PAD + (i % COLS) * cw, PAD + Math.floor(i / COLS) * ch, SC, true);
  });
  writePng(path.join(outDir, "flowers-sheet.png"), W, H, rgb);
  console.log(`flowers-sheet.png   ${W}x${H}  — ${flowers.length} fleurs à ×${SC}, ordre du catalogue`);
}

// --- planche 2 : à l'échelle du jeu, posées sur de l'herbe -------------------
{
  const PAD = 4;
  const W = flowers.length * (SW + PAD) + PAD, H = (SH + PAD) * 3 + PAD;
  const rgb = new Uint8Array(W * H * 3);
  // Herbe : la vraie teinte de base du sol de la ferme, tramée comme en jeu.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = (y * W + x) * 3, v = (x + y) % 3 === 0 ? 8 : 0;
    rgb[k] = 86 + v; rgb[k + 1] = 132 + v; rgb[k + 2] = 62 + v;
  }
  flowers.forEach((d, i) => {
    const cvs = ART.flowerPotSprite(d);
    blitTo(rgb, W, H, cvs, PAD + i * (SW + PAD), PAD, 1, false);           // ×1
    blitTo(rgb, W, H, cvs, PAD + i * (SW + PAD), PAD + SH + PAD, 2, false); // ×2 (déborde, voulu)
  });
  writePng(path.join(outDir, "flowers-scale.png"), W, H, rgb);
  console.log(`flowers-scale.png   ${W}x${H}  — ×1 puis ×2, sur herbe`);
}

/* =================================================================== CONTRÔLES */
console.log("");
let bad = 0;

// 1. Toutes distinctes. Une fleur recopiée par erreur passerait tous les
//    contrôles de catalogue et ne se verrait qu'à l'œil, tard.
const sigs = new Map();
for (const d of flowers) {
  const s = signature(ART.flowerPotSprite(d));
  if (sigs.has(s)) { console.log(`  ✗ ${d.id} est le SOSIE PIXEL de ${sigs.get(s)}`); bad++; }
  sigs.set(s, d.id);
}
console.log(`  ${bad ? "✗" : "✓"} 1. ${sigs.size} silhouettes distinctes pour ${flowers.length} fleurs`);

// 2. Chacune tient dans le canevas ET repose sur le bas (pas de pot flottant).
//    C'est le défaut « mât de torche flottant 34 cm au-dessus de son pilier »
//    du zip 379, transposé : il ne se voit qu'une fois la déco posée en jeu.
let floated = 0, clipped = 0;
for (const d of flowers) {
  const cvs = ART.flowerPotSprite(d);
  const im = cvs.getContext("2d").getImageData(0, 0, SW, SH);
  const rowFull = (y) => { for (let x = 0; x < SW; x++) if (im.data[(y * SW + x) * 4 + 3] > 0) return true; return false; };
  if (!rowFull(SH - 1)) { console.log(`  ✗ ${d.id} ne touche pas le bas du canevas (déco flottante)`); floated++; }
  if (rowFull(0)) { console.log(`  ✗ ${d.id} touche le bord HAUT : la fleur sera tranchée`); clipped++; }
}
console.log(`  ${floated || clipped ? "✗" : "✓"} 2. aucune déco flottante (${floated}), aucune tranchée en haut (${clipped})`);
bad += floated + clipped;

// 3. Le pot doit rester lisible : assez de pixels, mais pas au point d'étouffer
//    la fleur. Bornes posées d'après la planche, pas d'après une intuition.
const covs = flowers.map(d => [d.id, coverage(ART.flowerPotSprite(d))]);
const lo = Math.min(...covs.map(c => c[1])), hi = Math.max(...covs.map(c => c[1]));
const outOfRange = covs.filter(([, n]) => n < 120 || n > 400);
for (const [id, n] of outOfRange) console.log(`  ✗ ${id} : ${n} pixels peints, hors de [120, 400]`);
console.log(`  ${outOfRange.length ? "✗" : "✓"} 3. occupation de ${lo} à ${hi} pixels sur ${SW * SH} (bornes 120-400)`);
bad += outOfRange.length;

// 4. L'aiguillage de decorSprite : une entrée à `shape` doit donner la fleur,
//    une entrée sans `shape` doit donner EXACTEMENT le dessin d'origine.
//    On ne peut pas rendre les trois anciennes (arc/stroke) — on vérifie donc
//    seulement que l'aiguillage part du bon côté, et on le DIT.
let routed = 0;
for (const d of flowers) {
  if (signature(ART.decorSprite(d.id)) === signature(ART.flowerPotSprite(d))) routed++;
  else console.log(`  ✗ decorSprite("${d.id}") ne renvoie pas la fleur attendue`);
}
console.log(`  ${routed === flowers.length ? "✓" : "✗"} 4. decorSprite aiguille ${routed}/${flowers.length} fleurs vers flowerPotSprite`);
bad += flowers.length - routed;
console.log(`  · les ${legacy.length} décos d'origine (${legacy.map(d => d.id).join(", ")}) emploient arc/stroke :`);
console.log(`    NON RENDUES ici, et donc NON VÉRIFIÉES. Elles n'ont pas été touchées par ce zip.`);

console.log("");
console.log(bad ? `✗ ${bad} problème(s). Regarder les planches dans tools/out/.` : "✓ tout est vert — mais RIEN NE REMPLACE DE REGARDER flowers-sheet.png.");
process.exit(bad ? 1 : 0);
