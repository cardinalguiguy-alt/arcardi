/* =============================================================================
   tools/render-pets.mjs — les familiers en planche, quatre directions (zip 388).
   -----------------------------------------------------------------------------
       node public/templerun/tools/render-pets.mjs

   Appelle la VRAIE `petSprite(petId, dir, frame)` de fermeArt.js pour les ~45
   entrées de PET_CATALOG. Guillaume demande « des petites pattes qui bougent
   quand ils marchent, un corps qui s'oriente selon la direction, et que ce soit
   vivant ». Aucune constante ne dit ça. Trois planches, donc :

     pets-dirs.png    — un familier par ligne, ses 4 directions × 3 frames
                        côte à côte : c'est LA planche qui dit si l'orientation
                        se lit.
     pets-walk.png    — les trois frames du profil droit, en colonnes serrées,
                        pour tous les familiers : c'est là qu'on voit si les
                        pattes bougent VRAIMENT (une frame identique à une autre
                        saute aux yeux quand elles sont empilées).
     pets-roster.png  — tout le catalogue de face, à ×3 : deux races
                        indiscernables se voient d'un coup d'œil. C'est le
                        contrôle qui aurait attrapé le « dalmatien violet » du
                        zip 248 et les « 30 races identiques » d'avant lui.

   Plus cinq contrôles chiffrés.

   ⚠️ CE QU'IL NE PROUVE PAS (corollaire n°4 du zip 385) :
     - il ne prouve pas que l'animation est FLUIDE : il montre trois images
       fixes, pas une cadence. PET_STEP_MS reste à juger manette en main.
     - il ne prouve rien sur les JEUX entre familiers, qui vivent dans
       petPlayAt (fermeEngine.js) et drawPetsFor (FermeGame.js), pas dans le
       sprite. Le contrôle correspondant est `verify-petplay.mjs`.
     - il ne montre pas l'ombre au sol, dessinée par FermeGame et non par le
       sprite.
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

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vf-pets-"));
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

const ids = Object.keys(C.PET_CATALOG);
const T = 16, D = C.PET_DIRS, F = C.PET_FRAMES;
const sheet = {};                      // sheet[id][dir][frame]
for (const id of ids) sheet[id] = Array.from({ length: D }, (_, d) => Array.from({ length: F }, (_, f) => ART.petSprite(id, d, f)));

/* ------------- planche 1 : un familier par ligne, 4 dirs × 3 frames -------- */
{
  const SC = 3, cell = T * SC + 2, group = 6;     // 6 px entre deux directions
  const rowW = D * (F * cell + group), rowH = cell + 4;
  const COLS = 3, rows = Math.ceil(ids.length / COLS);
  const W = COLS * (rowW + 10) + 10, H = rows * rowH + 10;
  const rgb = new Uint8Array(W * H * 3); fill(rgb, W, H, [40, 42, 48]);
  ids.forEach((id, i) => {
    const bx = 10 + (i % COLS) * (rowW + 10), by = 6 + Math.floor(i / COLS) * rowH;
    for (let d = 0; d < D; d++) for (let f = 0; f < F; f++)
      blitTo(rgb, W, H, sheet[id][d][f], bx + d * (F * cell + group) + f * cell, by, SC, true);
  });
  writePng(path.join(outDir, "pets-dirs.png"), W, H, rgb);
  console.log(`pets-dirs.png     ${W}x${H}  — ${ids.length} familiers × 4 directions × 3 frames, ×${SC}`);
  console.log(`                  ordre des directions : FACE, DOS, GAUCHE, DROITE`);
}

/* ------------- planche 2 : les trois frames de marche, empilées ------------ */
{
  const SC = 4, cell = T * SC + 2;
  const COLS = 12, rows = Math.ceil(ids.length / COLS);
  const W = COLS * (F * cell + 8) + 8, H = rows * (cell + 6) + 8;
  const rgb = new Uint8Array(W * H * 3); fill(rgb, W, H, [40, 42, 48]);
  ids.forEach((id, i) => {
    const bx = 8 + (i % COLS) * (F * cell + 8), by = 6 + Math.floor(i / COLS) * (cell + 6);
    for (let f = 0; f < F; f++) blitTo(rgb, W, H, sheet[id][3][f], bx + f * cell, by, SC, true);
  });
  writePng(path.join(outDir, "pets-walk.png"), W, H, rgb);
  console.log(`pets-walk.png     ${W}x${H}  — profil droit, frames 0/1/2 côte à côte, ×${SC}`);
}

/* ------------- planche 3 : tout le catalogue de face ---------------------- */
{
  const SC = 3, cell = T * SC + 3, COLS = 12;
  const rows = Math.ceil(ids.length / COLS);
  const W = COLS * cell + 8, H = rows * cell + 8;
  const rgb = new Uint8Array(W * H * 3); fill(rgb, W, H, [40, 42, 48]);
  ids.forEach((id, i) => blitTo(rgb, W, H, sheet[id][0][0], 4 + (i % COLS) * cell, 4 + Math.floor(i / COLS) * cell, SC, true));
  writePng(path.join(outDir, "pets-roster.png"), W, H, rgb);
  console.log(`pets-roster.png   ${W}x${H}  — ${ids.length} familiers de FACE, ×${SC}`);
}

/* =================================================================== CONTRÔLES */
console.log("");
let bad = 0;

// 1. Les frames de marche doivent RÉELLEMENT différer. Une boucle qui produit
//    trois fois la même image donne une animation parfaitement immobile et
//    parfaitement silencieuse — c'est le mode de panne à craindre ici.
let still = 0;
for (const id of ids) for (let d = 0; d < D; d++) {
  const s = new Set(sheet[id][d].map(signature));
  if (s.size < F) { console.log(`  ✗ ${id} dir ${d} : seulement ${s.size} images distinctes sur ${F}`); still++; }
}
console.log(`  ${still ? "✗" : "✓"} 1. ${ids.length * D} séquences de marche, toutes à ${F} images distinctes`);
bad += still;

// 2. Les quatre directions doivent différer entre elles. Un `dir` ignoré par
//    erreur laisserait le familier de profil dans les quatre sens — exactement
//    le défaut que ce zip corrige.
let flat = 0;
for (const id of ids) {
  const s = new Set(Array.from({ length: D }, (_, d) => signature(sheet[id][d][0])));
  if (s.size < D) { console.log(`  ✗ ${id} : ${s.size} orientations distinctes sur ${D}`); flat++; }
}
console.log(`  ${flat ? "✗" : "✓"} 2. ${ids.length} familiers, chacun avec ${D} orientations distinctes`);
bad += flat;

// 3. Gauche = miroir exact de droite. Le vérifier ICI plutôt que de faire
//    confiance à flipH : c'est la seule symétrie du fichier, et une symétrie
//    fausse d'un pixel se voit en jeu comme un tremblement au demi-tour.
let mirror = 0;
for (const id of ids) for (let f = 0; f < F; f++) {
  const L = sheet[id][2][f].getContext("2d").getImageData(0, 0, T, T).data;
  const R = sheet[id][3][f].getContext("2d").getImageData(0, 0, T, T).data;
  let ok = true;
  for (let y = 0; y < T && ok; y++) for (let x = 0; x < T && ok; x++) {
    const a = (y * T + x) * 4, b = (y * T + (T - 1 - x)) * 4;
    for (let k = 0; k < 4; k++) if (Math.abs(L[a + k] - R[b + k]) > 1) ok = false;
  }
  if (!ok) { console.log(`  ✗ ${id} frame ${f} : le profil gauche n'est pas le miroir exact du droit`); mirror++; }
}
console.log(`  ${mirror ? "✗" : "✓"} 3. profil gauche = miroir pixel du profil droit sur ${ids.length * F} images`);
bad += mirror;

// 4. ENVELOPPE LATÉRALE. Première écriture de ce contrôle : « aucun pixel sur
//    le bord du canevas ». Il a sorti 39 familiers sur 39, c'est-à-dire tout le
//    catalogue, y compris les sprites de profil validés en jeu depuis le
//    zip 248 — la queue du chat est peinte en x=1 et son contour tombe donc en
//    x=0, DEPUIS TOUJOURS, et c'est très bien ainsi.
//
//    Corollaire n°3 du zip 379 : quand un contrôle échoue, se demander D'ABORD
//    s'il a raison. Il avait tort : sa valeur absolue ne veut rien dire. Ce qui
//    veut dire quelque chose, c'est la COMPARAISON — exactement comme pour la
//    profondeur d'imbrication. Les vues de FACE et de DOS, écrites à ce zip, ne
//    doivent pas mordre les colonnes latérales PLUS que le profil de référence,
//    qui, lui, est de l'art éprouvé.
//    (Le bord BAS est délibérément hors du contrôle : les pattes reposent
//    dessus, c'est l'ancrage du sprite.)
let clip = 0;
const sideEdge = (cvs) => {
  const im = cvs.getContext("2d").getImageData(0, 0, T, T).data;
  let n = 0;
  for (let y = 0; y < T; y++) { if (im[(y * T) * 4 + 3] > 0) n++; if (im[(y * T + T - 1) * 4 + 3] > 0) n++; }
  return n;
};
for (const id of ids) {
  const ref = Math.max(...[0, 1, 2].map(f => sideEdge(sheet[id][3][f])));
  for (const d of [0, 1]) {
    const got = Math.max(...[0, 1, 2].map(f => sideEdge(sheet[id][d][f])));
    if (got > ref) { console.log(`  ✗ ${id} dir ${d} : ${got} pixels de bord contre ${ref} pour le profil`); clip++; }
  }
}
console.log(`  ${clip ? "✗" : "✓"} 4. face et dos tiennent dans l'enveloppe latérale du profil, ${ids.length} familiers`);
bad += clip;

// 5. Le motif ne doit pas SCINTILLER : la graine aléatoire ne dépend ni de la
//    direction ni de la frame, donc les taches d'un dalmatien doivent tomber
//    aux mêmes endroits d'une frame à l'autre. On le mesure sur les races à
//    motif tiré au sort, les seules concernées.
const random = ids.filter(id => ["spots", "rosette"].includes((C.PET_CATALOG[id] || {}).pattern) || (C.PET_CATALOG[id] || {}).curly);
let flicker = 0;
for (const id of random) {
  // Deux constructions successives du MÊME sprite doivent être identiques.
  if (signature(ART.petSprite(id, 3, 1)) !== signature(sheet[id][3][1])) { console.log(`  ✗ ${id} : sprite non reproductible (graine instable)`); flicker++; }
}
console.log(`  ${flicker ? "✗" : "✓"} 5. ${random.length} races à motif tiré au sort, toutes reproductibles`);
bad += flicker;

console.log("");
console.log(`  · ${ids.length * D * F} canevas construits, ${Math.round(ids.length * D * F * T * T * 4 / 1024)} ko en mémoire.`);
console.log(bad ? `✗ ${bad} problème(s).` : "✓ tout est vert — mais RIEN NE REMPLACE DE REGARDER pets-dirs.png.");
process.exit(bad ? 1 : 0);
