/* =============================================================================
   batch-maze.mjs — le même jeu joué, mais par LOTS, une ligne JSON par partie.
   -----------------------------------------------------------------------------
   simulate-maze.mjs rend un rapport lisible ; celui-ci rend des données. Il
   existe pour une raison bête et suffisante : jouer plusieurs centaines de
   parties dépasse le temps d'une commande, et un outil qu'on ne peut pas
   lancer d'un bloc doit pouvoir être lancé en morceaux — sinon il n'est
   lancé qu'une fois, au début, puis plus jamais.

     node tools/batch-maze.mjs <premier> <nombre> >> parties.jsonl
     node tools/report-maze.mjs parties.jsonl

   Il sert aussi au balayage de réglages : chaque ligne porte la graine, donc
   n'importe quelle partie surprenante se rejoue à l'identique.
   ========================================================================== */

import { load, playOne } from "./lib-play.mjs";

const FROM = Number(process.argv[2] || 1);
const COUNT = Number(process.argv[3] || 50);
const MAXS = Number(process.argv[4] || 360);
const G = load();

for (let i = FROM; i < FROM + COUNT; i++) {
  const seed = i * 7919 + 13;
  const r = playOne(G, seed, { maxSeconds: MAXS });
  if (!r.ok) { console.log(JSON.stringify({ seed, gen: false })); continue; }
  console.log(JSON.stringify({
    seed, status: r.status, cause: r.cause,
    t: +r.time.toFixed(1), score: r.score, shards: r.shards, kills: r.kills,
    hearts: r.hearts, flame: +r.flame.toFixed(2), torches: r.torchesUsed,
    seen: r.seen, cells: r.cells, pathLen: r.pathLen, sword: r.hadSword,
    fallen: r.fallen,
  }));
}
