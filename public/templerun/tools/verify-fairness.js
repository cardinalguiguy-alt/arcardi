/* =============================================================================
   tools/verify-fairness.js — Vérification du générateur, hors navigateur.
   -----------------------------------------------------------------------------
       node tools/verify-fairness.js

   Génère des centaines de kilomètres de piste sur des milliers de graines et
   vérifie, obstacle par obstacle, qu'un joueur parfait s'en sort TOUJOURS.
   C'est le seul moyen honnête de tenir la promesse "aucune configuration
   injuste" : on ne peut pas la vérifier à l'œil en jouant.

   Le contrôle central est une simulation de DISPONIBILITÉ : chaque parade
   occupe le joueur pendant une durée connue (saut 0,71 s, glissade 0,62 s,
   changement de voie 0,20 s par voie). On rejoue la piste en suivant un joueur
   idéal et on vérifie qu'il n'est jamais sollicité pendant qu'il est occupé.
   Les vitesses sont prises au MAXIMUM : si c'est jouable à 34 u/s, ça l'est à
   toute vitesse inférieure.
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const ctx = vm.createContext({ Math, console, performance: { now: () => Date.now() }, module: {} });
for (const f of ["js/config.js", "js/track.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
}
// `const` au niveau d'un script vm vit dans la portée lexicale du contexte,
// pas sur l'objet global : on va le chercher par une expression.
const { CFG, Track, OBST } = vm.runInContext("({ CFG, Track, OBST })", ctx);

const JUMP_T = Track.JUMP_AIRTIME, SLIDE_T = Track.SLIDE_TIME, LANE_T = Track.LANE_TIME;
const V = CFG.SPEED_MAX;

let errors = [];
function fail(seed, node, msg) {
  if (errors.length < 25) errors.push(`graine ${seed}, tronçon ${node.index} : ${msg}`);
}

const SEEDS = 4000;
const NODES_PER_SEED = 26;
let totalNodes = 0, totalObstacles = 0, totalGaps = 0, totalTurns = 0, totalCoins = 0, totalLength = 0;

for (let s = 0; s < SEEDS; s++) {
  const gen = new Track.TrackGen(s);
  while (gen.nodes.length < NODES_PER_SEED) gen.pushNode(false);

  for (const node of gen.nodes) {
    totalNodes++;
    totalLength += node.length;
    totalCoins += node.coins.length;
    if (node.turn !== 0) totalTurns++;

    const obs = node.obstacles.slice().sort((a, b) => a.t - b.t);

    /* --- Règle : fenêtres libres au début et à la fin du tronçon --- */
    for (const o of obs) {
      totalObstacles++;
      if (o.type === OBST.GAP) totalGaps++;
      if (o.t < CFG.TURN_CLEAR_AFTER - 0.001) fail(s, node, `obstacle à t=${o.t.toFixed(1)} dans la zone d'entrée`);
      const endLimit = node.length - (node.turn !== 0 ? CFG.TURN_CLEAR_BEFORE : 10);
      if (o.t > endLimit + 0.001) fail(s, node, `obstacle à t=${o.t.toFixed(1)} trop près de la fin (limite ${endLimit.toFixed(1)})`);
      if (node.startDist + o.t < CFG.OBST_START_SAFE_DIST - 0.001) fail(s, node, `obstacle dans la zone de départ protégée`);

      /* --- Règle : un mur ne bouche jamais les 3 voies --- */
      if (o.type === OBST.WALL && o.lanes.every(Boolean)) fail(s, node, `mur bouchant les 3 voies à t=${o.t.toFixed(1)}`);
      if (o.type === OBST.WALL && o.free.length === 0) fail(s, node, `mur sans voie libre à t=${o.t.toFixed(1)}`);

      /* --- Règle : un trou doit être franchissable d'un saut, même à la
             vitesse la plus BASSE (c'est là que le saut porte le moins loin) */
      const jumpReach = JUMP_T * CFG.SPEED_START;
      if (o.type === OBST.GAP && CFG.GAP_LENGTH > jumpReach - 1.5) {
        fail(s, node, `trou de ${CFG.GAP_LENGTH} infranchissable (portée min ${jumpReach.toFixed(1)})`);
      }
    }

    /* --- Simulation de disponibilité du joueur parfait --- */
    let busyUntil = -Infinity;   // distance jusqu'à laquelle le joueur est occupé
    let prev = null;
    for (const o of obs) {
      if (o.t < busyUntil - 0.001) {
        fail(s, node, `obstacle ${o.type} à t=${o.t.toFixed(1)} tombe pendant une parade en cours (libre à ${busyUntil.toFixed(1)})`);
      }
      // Déplacement latéral imposé par rapport à l'obstacle précédent
      if (prev && prev.free.length && o.free.length) {
        let travel = Infinity;
        for (const a of prev.free) for (const b of o.free) travel = Math.min(travel, Math.abs(a - b));
        const need = travel * LANE_T * V;
        if (o.t - prev.t < need - 0.001) {
          fail(s, node, `${travel} changement(s) de voie exigés en ${(o.t - prev.t).toFixed(1)} unités (il en faut ${need.toFixed(1)})`);
        }
      }
      if (o.type === OBST.LOW || o.type === OBST.GAP) busyUntil = o.t + JUMP_T * V;
      else if (o.type === OBST.HIGH) busyUntil = o.t + SLIDE_T * V;
      else busyUntil = o.t + LANE_T * V;
      prev = o;
    }

    /* --- Règle : aucune pièce à l'intérieur d'un obstacle --- */
    for (const c of node.coins) {
      for (const o of node.obstacles) {
        if (Math.abs(o.t - c.t) < 1.2 && o.lanes[c.lane] && o.type !== OBST.GAP) {
          fail(s, node, `pièce dans un obstacle à t=${c.t.toFixed(1)}, voie ${c.lane}`);
        }
      }
    }
  }
}

const km = (totalLength / 1000).toFixed(1);
console.log(`Pistes vérifiées : ${SEEDS} graines, ${totalNodes} tronçons, ${km} km de piste.`);
console.log(`  obstacles ${totalObstacles}  |  dont trous ${totalGaps}  |  virages ${totalTurns}  |  pièces ${totalCoins}`);
console.log(`  parades (à ${V} u/s) : saut ${(JUMP_T * V).toFixed(1)} u, glissade ${(SLIDE_T * V).toFixed(1)} u, voie ${(LANE_T * V).toFixed(1)} u`);

if (errors.length) {
  console.log(`\nÉCHEC — ${errors.length} configuration(s) injuste(s) (25 premières) :`);
  for (const e of errors) console.log("  " + e);
  process.exit(1);
}
console.log("\nOK — aucune configuration injuste trouvée.");
