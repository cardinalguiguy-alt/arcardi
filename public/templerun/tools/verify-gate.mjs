/* =============================================================================
   tools/verify-gate.mjs — La porte du défi est-elle VRAIMENT atteignable ?
   -----------------------------------------------------------------------------
       node public/templerun/tools/verify-gate.mjs     (depuis la racine du repo)

   Le passage sombre ne mène pas à une carte mais à SIX (la carte maléfique
   historique + les cinq mondes de PASSAGE_WORLDS, dont un labyrinthe qui pose
   des haies sur toute la surface). Poser une porte à l'est ne suffit donc pas :
   il faut prouver qu'on peut y aller à pied, sur chacune.

   Ce script fait un PARCOURS EN LARGEUR depuis l'arrivée (EVIL_SPAWN) avec le
   test de collision exact du jeu (blockedEvil, FermeGame.js). Il ne vérifie pas
   que le couloir a été creusé — il vérifie qu'on ARRIVE. Si un jour la
   génération change et referme le passage ailleurs, c'est ici que ça se verra.

   Il contrôle aussi que le passage RETOUR reste atteignable : creuser un
   couloir ne doit pas enfermer le joueur.
   ========================================================================== */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const fermeDir = path.resolve(here, "../../../components/ferme");

/* Le moteur importe "./fermeConstants" SANS extension : Next le résout, Node
   non. Plutôt que de toucher au code du jeu pour faire plaisir à un script de
   test, on en fait une copie temporaire avec les extensions ajoutées. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vf-gate-"));
for (const f of ["fermeConstants.js", "fermeEngine.js"]) {
  const src = fs.readFileSync(path.join(fermeDir, f), "utf8")
    .replace(/from\s+"\.\/(ferme[A-Za-z]+)"/g, 'from "./$1.js"');
  fs.writeFileSync(path.join(tmp, f), src);
}
const C = await import(pathToFileURL(path.join(tmp, "fermeConstants.js")).href);
const E = await import(pathToFileURL(path.join(tmp, "fermeEngine.js")).href);

const W = C.EVIL_MAP_W, H = C.EVIL_MAP_H;

// Copie conforme de blockedEvil (FermeGame.js) : eau, arbres vivants et morts,
// souches, rochers. Si cette fonction diverge du jeu, le test ment — c'est le
// seul endroit à resynchroniser si la collision du monde sombre évolue.
function blockedEvil(w, x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return true;
  const i = y * W + x;
  if (w.ground[i] === C.G_WATER) return true;
  const o = w.objects[i];
  return o === C.O_TREE || o === C.O_TREE2 || o === C.O_TREE_DEAD || o === C.O_STUMP || o === C.O_ROCK;
}

function reaches(w, target) {
  const seen = new Uint8Array(W * H);
  const q = [[C.EVIL_SPAWN.x, C.EVIL_SPAWN.y]];
  seen[C.EVIL_SPAWN.y * W + C.EVIL_SPAWN.x] = 1;
  let visited = 0;
  while (q.length) {
    const [x, y] = q.shift();
    visited++;
    if (x === target.x && y === target.y) return { ok: true, visited };
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (seen[j] || blockedEvil(w, nx, ny)) continue;
      seen[j] = 1; q.push([nx, ny]);
    }
  }
  return { ok: false, visited };
}

/* ZIP 375 — ce que ce script doit prouver a CHANGÉ, et il faut le dire.

   La porte n'est plus posée sur l'herbe : c'est la dernière dalle d'une jetée
   qui avance AU-DESSUS du lac de la rive est. Trois choses peuvent donc mal
   tourner, et aucune ne se verrait à la lecture du générateur :

     1. le pied de la jetée pourrait se retrouver dans l'eau si le découpage
        irrégulier de la rive mordait dessus (le générateur lui rend sa bande
        de terre, encore faut-il le vérifier) ;
     2. une dalle manquante couperait la jetée en deux, et le parcours en
        largeur s'arrêterait au trou ;
     3. le couloir garanti vise désormais le PIED de la jetée, pas la porte —
        s'il visait encore la porte, il draguerait le lac sur trois cases.

   D'où trois contrôles au lieu d'un : on arrive au pied, on arrive au bout,
   et tout le tablier est bien du pont. */
function check(label, w) {
  const base = reaches(w, C.RUN_JETTY_BASE);
  const gate = reaches(w, C.RUN_GATE);
  const back = reaches(w, C.EVIL_RETURN_PASSAGE);
  const tile = w.ground[C.RUN_GATE.y * W + C.RUN_GATE.x] === C.G_RUN_GATE;

  // Le pied doit être de la TERRE (sinon on ne peut pas s'y tenir), et
  // chacune des dalles doit exister sur toute la largeur de la jetée.
  const baseTile = w.ground[C.RUN_JETTY_BASE.y * W + C.RUN_JETTY_BASE.x];
  const baseDry = baseTile !== C.G_WATER;
  let deck = true;
  for (let k = 1; k <= C.RUN_JETTY_LEN; k++) {
    for (let dy = -C.RUN_JETTY_HALF_W; dy <= C.RUN_JETTY_HALF_W; dy++) {
      const g = w.ground[(C.RUN_JETTY_BASE.y + dy) * W + (C.RUN_JETTY_BASE.x + k)];
      if (g !== C.G_RUN_JETTY && g !== C.G_RUN_GATE) deck = false;
    }
  }
  // Le lac doit exister : une rive est qui ne serait pas creusée passerait
  // tous les contrôles ci-dessus sans qu'on voie une goutte d'eau.
  let water = 0;
  for (let y = 0; y < H; y++) for (let x = C.EAST_LAKE_X; x < W; x++) {
    if (w.ground[y * W + x] === C.G_WATER) water++;
  }
  const lakeOk = water > 200;

  /* EMBUSCADE. Les trois darkwolves de la cinématique remontent la jetée
     depuis l'ouest, en éventail. Rien dans le code ne les empêche d'être
     posés au-dessus de l'eau : leur placement est purement géométrique
     (RUN_AMBUSH_START/END_DIST et l'écart de voie), pas contraint par la
     collision. On rejoue donc ici, à l'avance, toutes les positions par
     lesquelles ils passeront — celles de la cinématique ET celles de
     l'affrontement — et on vérifie qu'aucune ne tombe dans le lac.

     C'est le genre de défaut qui ne casse rien et se voit tout de suite :
     trois loups qui courent sur un lac. */
  const tileAt = (x, y) => {
    const fx = Math.floor(x + 0.5), fy = Math.floor(y + 0.5);
    if (fx < 0 || fy < 0 || fx >= W || fy >= H) return null;
    return w.ground[fy * W + fx];
  };
  let dry = true, wetSpot = null;
  for (let i = 0; i < C.RUN_AMBUSH_COUNT; i++) {
    const lane = (i - (C.RUN_AMBUSH_COUNT - 1) / 2) * 1.05;
    const back = i * 0.55;
    // Cinématique : 24 pas entre la distance de départ et celle d'arrivée.
    for (let s = 0; s <= 24; s++) {
      const k = s / 24;
      const d = C.RUN_AMBUSH_START_DIST
        + (C.RUN_AMBUSH_END_DIST - C.RUN_AMBUSH_START_DIST) * (k * k);
      const g = tileAt(C.RUN_GATE.x - d - back, C.RUN_JETTY_BASE.y + lane);
      if (g === C.G_WATER || g === null) { dry = false; wetSpot = wetSpot || `cinématique loup ${i} à k=${k.toFixed(2)}`; }
    }
    // Placement de l'affrontement, à la sortie du menu (closeRunChallenge).
    const g2 = tileAt(C.RUN_JETTY_BASE.x - 2.2 - i * 0.7, C.RUN_JETTY_BASE.y + lane);
    if (g2 === C.G_WATER || g2 === null) { dry = false; wetSpot = wetSpot || `placement d'affrontement loup ${i}`; }
  }

  const ok = base.ok && gate.ok && back.ok && tile && baseDry && deck && lakeOk && dry;
  console.log(`${ok ? "OK    " : "ÉCHEC "} ${label.padEnd(30)} pied=${base.ok} bout=${gate.ok} retour=${back.ok} tablier=${deck} embuscade=${dry} lac=${water}`);
  if (!ok && !baseDry) console.log("        -> le pied de la jetée est dans l'eau");
  if (!ok && !tile) console.log("        -> la dernière dalle n'est pas G_RUN_GATE");
  if (!ok && !lakeOk) console.log("        -> la rive est n'a pas été creusée");
  if (!ok && !dry) console.log(`        -> un loup court sur l'eau : ${wetSpot}`);
  return ok;
}

let bad = 0;
if (!check("carte maléfique (historique)", E.generateEvilWorld())) bad++;
for (let i = 0; i < C.PASSAGE_WORLDS.length; i++) {
  if (!check(`monde ${i} — ${C.PASSAGE_WORLDS[i].key}`, E.generatePassageWorld(i))) bad++;
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(bad === 0
  ? "\nOK — jetée (pied et bout) et passage retour atteignables à pied sur les 6 cartes."
  : `\nÉCHEC — ${bad} carte(s) en défaut.`);
process.exit(bad === 0 ? 0 : 1);
