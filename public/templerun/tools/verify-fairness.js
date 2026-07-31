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

/* Point d'ARRIVÉE d'un obstacle : l'endroit où le joueur doit avoir fini sa
   parade. Pour tout ce qui est ponctuel c'est son t ; pour un trou, c'est son
   bord d'attaque, parce qu'on ne rattrape rien une fois au-dessus du vide. */
function entryOf(o) {
  if (o.type === OBST.CREVASSE) return o.t - CFG.CREVASSE_LENGTH / 2;
  if (o.type === OBST.GAP) return o.t - CFG.GAP_LENGTH / 2;
  return o.t;
}

/* NODES_PER_SEED RELEVÉ DE 26 À 60 AU ZIP 377, et ce n'est pas un réglage de
   confort : 26 tronçons font environ 2 400 unités, c'est-à-dire MOINS que
   l'intervalle entre deux bifurcations (OFFROAD_EVERY = 4000). Le script
   n'aurait donc jamais vu un seul embranchement, et aurait continué d'afficher
   « OK » en n'ayant rien vérifié de la nouveauté du zip. 60 tronçons font
   ~5 400 unités, soit au moins une bifurcation par graine — et sur 4 000
   graines, la première ET la seconde sur bon nombre d'entre elles.

   C'est exactement le piège du zip 375 : un contrôle qui ne dit rien après un
   ajout de règle n'est pas rassurant, il est suspect. */
const SEEDS = 4000;
const NODES_PER_SEED = 60;
let totalNodes = 0, totalObstacles = 0, totalGaps = 0, totalCrev = 0;
let totalTurns = 0, totalCoins = 0, totalCracks = 0, totalLength = 0;
let totalExits = 0, seedsWithExit = 0;
let stoneMin = Infinity, stoneMax = 0, stoneSum = 0, stoneCapped = 0;

for (let s = 0; s < SEEDS; s++) {
  const gen = new Track.TrackGen(s);
  while (gen.nodes.length < NODES_PER_SEED) gen.pushNode(false);
  if (gen.nodes.some(n => n.exit !== 0)) seedsWithExit++;

  /* Zip 379 — LONGUEUR DE LA CHAUSSÉE DE PIERRE. Elle court jusqu'au premier
     virage (décision Guillaume), donc elle DÉPEND DU TIRAGE : c'est un
     événement de la piste, pas une constante. Il faut donc vérifier qu'elle
     reste dans des bornes jouables sur toutes les graines — une section de
     pierre de 40 mètres passerait inaperçue, une de 1500 ferait de la
     plateforme AA l'exception. */
  const st = gen.nodes[gen.nodes.length - 1].stoneEnd;
  stoneMin = Math.min(stoneMin, st); stoneMax = Math.max(stoneMax, st); stoneSum += st;
  if (st >= CFG.DECOR_STONE_MAX - 1e-9) stoneCapped++;
  if (!isFinite(st)) fail(s, gen.nodes[0], `aucun virage en ${NODES_PER_SEED} tronçons : la pierre ne finit jamais`);
  if (st < CFG.NODE_LEN_MIN) fail(s, gen.nodes[0], `chaussée de pierre de ${st.toFixed(0)} u seulement`);

  /* Chaîne d'espacement PORTÉE D'UN TRONÇON À L'AUTRE. Depuis le zip 374 le
     générateur la maintient lui-même ; le vérificateur doit donc la suivre de
     la même façon, sinon il valide chaque tronçon isolément et ne verra jamais
     l'obstacle collé de l'autre côté d'un virage. Tout est en distance
     ABSOLUE. */
  let busyUntilAbs = -Infinity;
  let prev = null;   // { abs, type, free }

  for (const node of gen.nodes) {
    totalNodes++;
    totalLength += node.length;
    totalCoins += node.coins.length;
    totalCracks += node.cracks.length;
    if (node.turn !== 0) totalTurns++;

    const obs = node.obstacles.slice().sort((a, b) => a.t - b.t);

    /* --- Règle : fenêtres franches en entrée et en sortie de tronçon.
       Depuis le 374 elles dépendent de la PRÉSENCE d'un virage de chaque
       côté, et leurs valeurs sont dérivées de la physique dans config.js. --- */
    const startLimit = node.entryTurn !== 0 ? CFG.TURN_CLEAR_AFTER : CFG.ENTRY_CLEAR_STRAIGHT;
    const endLimit = node.length - ((node.turn !== 0 || node.exit !== 0) ? CFG.TURN_CLEAR_BEFORE : CFG.END_CLEAR_STRAIGHT);

    /* --- Zip 377 : règles d'un tronçon qui porte une BIFURCATION OFFROAD ---
       Les trois sont vérifiées ici plutôt que dans un script à part parce
       qu'elles concernent la GÉNÉRATION, et que ce script est celui qu'on
       relit quand on se demande ce que la piste garantit. */
    if (node.exit !== 0) {
      totalExits++;
      if (node.turn !== 0) {
        fail(s, node, `un embranchement (${node.exit}) sur un tronçon qui TOURNE (${node.turn}) : la même touche voudrait dire deux choses`);
      }
      if (!node.escape) fail(s, node, `embranchement sans branche d'échappement`);
      else {
        if (node.escape.obstacles.length || node.escape.coins.length) {
          fail(s, node, `la branche d'échappement porte des obstacles ou des pièces`);
        }
        if (node.escape.length < 110) {
          fail(s, node, `branche d'échappement trop courte (${node.escape.length})`);
        }
        // La branche doit bien partir du BOUT du tronçon, sinon le joueur
        // « tournerait » dans le vide au moment de la bascule.
        const ff = [{ x: 0, z: -1 }, { x: 1, z: 0 }, { x: 0, z: 1 }, { x: -1, z: 0 }][node.dir & 3];
        const ex = node.ox + ff.x * node.length, ez = node.oz + ff.z * node.length;
        if (Math.abs(node.escape.ox - ex) > 1e-6 || Math.abs(node.escape.oz - ez) > 1e-6) {
          fail(s, node, `la branche ne part pas du bout du tronçon`);
        }
        if (node.escape.dir !== ((node.dir + node.exit + 4) & 3)) {
          fail(s, node, `la branche ne part pas du côté annoncé par node.exit`);
        }
      }
    }

    for (const o of obs) {
      totalObstacles++;
      if (o.type === OBST.GAP) totalGaps++;
      if (o.type === OBST.CREVASSE) totalCrev++;

      if (o.t < startLimit - 0.001) {
        fail(s, node, `obstacle à t=${o.t.toFixed(1)} dans la zone d'entrée (limite ${startLimit})`);
      }
      if (o.t > endLimit + 0.001) {
        fail(s, node, `obstacle à t=${o.t.toFixed(1)} trop près de la fin (limite ${endLimit.toFixed(1)})`);
      }
      if (node.startDist + o.t < CFG.OBST_START_SAFE_DIST - 0.001) {
        fail(s, node, `obstacle dans la zone de départ protégée`);
      }

      /* --- Règle : ni un mur ni une crevasse ne bouchent les 3 voies --- */
      if (o.type === OBST.WALL && o.lanes.every(Boolean)) fail(s, node, `mur bouchant les 3 voies à t=${o.t.toFixed(1)}`);
      if (o.type === OBST.WALL && o.free.length === 0) fail(s, node, `mur sans voie libre à t=${o.t.toFixed(1)}`);
      if (o.type === OBST.CREVASSE && o.free.length === 0) fail(s, node, `crevasse sans voie libre à t=${o.t.toFixed(1)}`);

      /* --- Règle : un trou doit être franchissable d'un saut, même à la
             vitesse la plus BASSE (c'est là que le saut porte le moins loin) */
      const jumpReach = JUMP_T * CFG.SPEED_START;
      if (o.type === OBST.GAP && CFG.GAP_LENGTH > jumpReach - 1.5) {
        fail(s, node, `trou de ${CFG.GAP_LENGTH} infranchissable (portée min ${jumpReach.toFixed(1)})`);
      }
      /* Une crevasse n'a PAS à être sautable — on la contourne. Mais si elle
         l'est, tant mieux ; ce qu'on vérifie, c'est qu'on ne l'a pas rendue
         plus longue que la portée d'un saut SANS laisser de voie libre, ce que
         la règle précédente couvre déjà. */
    }

    /* --- Simulation de disponibilité du joueur parfait --- */
    for (const o of obs) {
      const abs = node.startDist + o.t;
      const entry = node.startDist + entryOf(o);

      if (entry < busyUntilAbs - 0.001) {
        fail(s, node, `obstacle ${o.type} à t=${o.t.toFixed(1)} tombe pendant une parade en cours (libre à ${(busyUntilAbs - node.startDist).toFixed(1)})`);
      }
      /* Déplacement latéral imposé par rapport à l'obstacle précédent, DANS LE
         PIRE CAS (voir Track.worstLaneTravel : la version « meilleur cas » du
         zip 372 laissait passer des crevasses mortelles). */
      const fromLanes = prev ? Track.exitLanes(prev) : null;
      if (prev && fromLanes.length && o.free.length) {
        const travel = Track.worstLaneTravel(fromLanes, o.free);
        const need = travel * LANE_T * V;
        if (entry - prev.abs < need - 0.001) {
          fail(s, node, `${travel} changement(s) de voie exigés en ${(entry - prev.abs).toFixed(1)} unités (il en faut ${need.toFixed(1)})`);
        }
      }
      if (o.type === OBST.LOW || o.type === OBST.GAP) busyUntilAbs = abs + JUMP_T * V;
      else if (o.type === OBST.HIGH) busyUntilAbs = abs + SLIDE_T * V;
      else if (o.type === OBST.CREVASSE) busyUntilAbs = abs + CFG.CREVASSE_LENGTH / 2 + LANE_T * V;
      else busyUntilAbs = abs + LANE_T * V;
      prev = { abs, type: o.type, free: o.free };
    }

    /* --- Règle : aucune pièce à l'intérieur d'un obstacle. Les trous sont
       exclus du contrôle (on les saute), mais PAS les crevasses : une pièce
       posée sur une voie effondrée serait un appât mortel. --- */
    for (const c of node.coins) {
      for (const o of node.obstacles) {
        if (o.type === OBST.GAP) continue;
        const reach = o.type === OBST.CREVASSE ? CFG.CREVASSE_LENGTH / 2 : 1.2;
        if (Math.abs(o.t - c.t) < reach && o.lanes[c.lane]) {
          fail(s, node, `pièce dans un ${o.type} à t=${c.t.toFixed(1)}, voie ${c.lane}`);
        }
      }
    }

    /* --- Règle nouvelle au 374 : une fissure DÉCORATIVE ne doit jamais être
       confondue avec une crevasse mortelle. Si les deux se côtoient, le joueur
       apprend qu'une entaille est inoffensive juste avant de mourir dans la
       suivante. --- */
    for (const k of node.cracks) {
      for (const o of node.obstacles) {
        if (o.type !== OBST.CREVASSE && o.type !== OBST.GAP) continue;
        if (Math.abs(o.t - k.t) < CFG.CREVASSE_LENGTH * 2) {
          fail(s, node, `fissure décorative à t=${k.t.toFixed(1)} collée à un vrai trou (t=${o.t.toFixed(1)})`);
        }
      }
    }
  }
}

const km = (totalLength / 1000).toFixed(1);
console.log(`Pistes vérifiées : ${SEEDS} graines, ${totalNodes} tronçons, ${km} km de piste.`);
console.log(`  obstacles ${totalObstacles}  |  trous ${totalGaps}  |  crevasses ${totalCrev}  |  virages ${totalTurns}`);
console.log(`  pièces ${totalCoins}  |  fissures décoratives ${totalCracks}`);
console.log(`  parades (à ${V} u/s) : saut ${(JUMP_T * V).toFixed(1)} u, glissade ${(SLIDE_T * V).toFixed(1)} u, voie ${(LANE_T * V).toFixed(1)} u`);
console.log(`  zones franches de virage : ${CFG.TURN_CLEAR_AFTER} u après, ${CFG.TURN_CLEAR_BEFORE} u avant (calculées, pas réglées)`);
console.log(`  bifurcations offroad : ${totalExits} sur ${seedsWithExit}/${SEEDS} graines (une tous les ${CFG.OFFROAD_EVERY} u)`);
console.log(`  chaussée de pierre : ${stoneMin.toFixed(0)} à ${stoneMax.toFixed(0)} u (moyenne ${(stoneSum / SEEDS).toFixed(0)}), plafond atteint ${(stoneCapped / SEEDS * 100).toFixed(0)} % du temps`);
console.log(`  puis ${CFG.DECOR_BLEND_LEN} u de fondu : la plateforme AA est atteinte entre ${(stoneMin + CFG.DECOR_BLEND_LEN).toFixed(0)} et ${(stoneMax + CFG.DECOR_BLEND_LEN).toFixed(0)} m`);

/* Le compte des bifurcations est un contrôle à part entière, pas un chiffre
   d'ambiance : si le générateur cessait d'en poser, TOUTES les règles
   ci-dessus resteraient satisfaites et le script dirait « OK » en n'ayant rien
   vérifié. On exige donc qu'il en ait effectivement vu. */
if (seedsWithExit < SEEDS) {
  errors.push(`${SEEDS - seedsWithExit} graine(s) n'ont produit AUCUNE bifurcation sur ${NODES_PER_SEED} tronçons`);
}

if (errors.length) {
  console.log(`\nÉCHEC — ${errors.length} configuration(s) injuste(s) (25 premières) :`);
  for (const e of errors) console.log("  " + e);
  process.exit(1);
}
console.log("\nOK — aucune configuration injuste trouvée.");
