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

function check(label, w) {
  const gate = reaches(w, C.RUN_GATE);
  const back = reaches(w, C.EVIL_RETURN_PASSAGE);
  const tile = w.ground[C.RUN_GATE.y * W + C.RUN_GATE.x] === C.G_RUN_GATE;
  const ok = gate.ok && back.ok && tile;
  console.log(`${ok ? "OK    " : "ÉCHEC "} ${label.padEnd(32)} porte=${gate.ok}  retour=${back.ok}  case=${tile ? "G_RUN_GATE" : "AUTRE"}  (${gate.visited} cases)`);
  return ok;
}

let bad = 0;
if (!check("carte maléfique (historique)", E.generateEvilWorld())) bad++;
for (let i = 0; i < C.PASSAGE_WORLDS.length; i++) {
  if (!check(`monde ${i} — ${C.PASSAGE_WORLDS[i].key}`, E.generatePassageWorld(i))) bad++;
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(bad === 0
  ? "\nOK — porte et passage retour atteignables à pied sur les 6 cartes."
  : `\nÉCHEC — ${bad} carte(s) en défaut.`);
process.exit(bad === 0 ? 0 : 1);
