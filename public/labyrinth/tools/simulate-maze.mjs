/* =============================================================================
   simulate-maze.mjs — LE JEU, JOUÉ. Pas relu : JOUÉ.
   -----------------------------------------------------------------------------
   Reprend le principe de verify-offroad.js (zip 377) et de verify-levels.js
   (Gourmandin) : il ne relit aucune constante et ne contrôle aucune règle. Il
   fait tourner des centaines de parties complètes par Rules.step(), image par
   image, avec les MÊMES fonctions que le navigateur, et rapporte ce qui s'est
   passé.

   La question à laquelle il répond est celle de Guillaume, mot pour mot :
   « un labyrinthe passionnant, stressant, à surprises et dangers ». On ne sait
   pas mesurer « passionnant ». On sait mesurer :

     - combien de parties se terminent, et par quoi ;
     - combien de temps elles durent ;
     - si l'on meurt de faim de lumière, d'une créature ou d'un trou — parce
       qu'un jeu où l'on meurt toujours de la même chose n'a qu'un danger.

   C'est ce dernier chiffre qui compte le plus : trois causes de mort à peu
   près équilibrées, c'est trois dangers réels. Une cause à 90 %, c'est un
   danger et deux décors.

   Usage : node tools/simulate-maze.mjs [nombre de parties]
   ========================================================================== */

import { load, playOne, stats } from "./lib-play.mjs";

const RUNS = Number(process.argv[2] || 400);
const G = load();

const times = [], scores = [], shards = [], seenPct = [], kills = [];
const causes = {};
let wins = 0, gen = 0;
const t0 = Date.now();

for (let s = 1; s <= RUNS; s++) {
  const r = playOne(G, s * 7919 + 13);
  if (!r.ok) { gen++; continue; }
  const key = r.status === "won" ? "sortie"
    : r.cause === "fall" ? "chute"
    : r.cause === "creature" ? "creature"
    : r.status === "play" ? "abandon/temps" : (r.cause || r.status);
  causes[key] = (causes[key] || 0) + 1;
  if (r.status === "won") { wins++; times.push(r.time); scores.push(r.score); }
  shards.push(r.shards);
  kills.push(r.kills);
  seenPct.push((r.seen / r.cells) * 100);
}

const pct = (n) => ((n / RUNS) * 100).toFixed(1) + " %";
console.log(`\n=== ${RUNS} parties jouées en ${((Date.now() - t0) / 1000).toFixed(1)} s ===\n`);
console.log("Issues :");
for (const k of Object.keys(causes).sort((a, b) => causes[b] - causes[a])) {
  console.log(`  ${k.padEnd(14)} ${String(causes[k]).padStart(4)}   ${pct(causes[k])}`);
}
if (gen) console.log(`  (${gen} échecs de génération)`);
console.log("\nTemps des parties GAGNÉES (s) :", stats(times));
console.log("Score des parties gagnées      :", stats(scores));
console.log("Éclats ramassés (toutes)       :", stats(shards));
console.log("Créatures tuées (toutes)       :", stats(kills));
console.log("Part du dédale visitée (%)     :", stats(seenPct));
console.log(`\nTaux de réussite de l'oracle : ${pct(wins)}`);
console.log(`
Rappel de ce que ce script NE prouve PAS : rien de la lisibilité à l'écran,
rien du confort des commandes, rien de la peur. L'oracle n'oublie jamais un
brasier et ne panique pas — le taux de mort d'un humain sera plus haut que
celui-ci, jamais plus bas.
`);
