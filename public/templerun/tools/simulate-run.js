/* =============================================================================
   tools/simulate-run.js — Rejoue des parties entières SANS navigateur.
   -----------------------------------------------------------------------------
       node tools/simulate-run.js

   Charge la vraie logique de jeu (track.js, player.js, wolves.js) dans un
   contexte sans DOM ni WebGL, branche un faux clavier, et fait jouer un
   "joueur oracle" qui réagit correctement à chaque obstacle. On vérifie :

     1. qu'aucune exception n'est levée sur des parties longues,
     2. qu'un joueur compétent SURVIT (sinon le jeu est injuste ou cassé),
     3. qu'un joueur passif MEURT (sinon l'échec ne fonctionne pas),
     4. que la vitesse, le score et la meute évoluent comme prévu.

   C'est la contrepartie de verify-fairness.js : celui-ci valide la piste sur le
   papier, celui-là valide la boucle de jeu réelle, commandes comprises.
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");

/* ------------------------------------------------- faux temps + faux clavier */
let CLOCK = 0;
const pending = new Map();     // action -> instant de la pression

const fakeInput = {
  press(a) { pending.set(a, CLOCK); },
  consume(a) {
    const t = pending.get(a);
    if (t === undefined) return false;
    pending.delete(a);
    return CLOCK - t <= 160;
  },
  peek(a) {
    const t = pending.get(a);
    return t !== undefined && CLOCK - t <= 160;
  },
  clear() { pending.clear(); },
};

const ctx = vm.createContext({
  Math, console, JSON,
  performance: { now: () => CLOCK },
  Input: fakeInput,
  module: {},
});

for (const f of ["js/config.js", "js/track.js", "js/player.js", "js/wolves.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
}
const { CFG, Track, OBST, Player, WolfPack } = vm.runInContext(
  "({ CFG, Track, OBST, Player, WolfPack })", ctx);

/* --------------------------------------------------------------- L'ORACLE --
   Un joueur idéal, mais qui ne triche pas : il n'a droit qu'aux mêmes touches
   que l'humain, et il ne voit que ce qui est devant lui. */
function oracle(player, track) {
  const node = player.node();
  const v = Math.max(1, player.speed);

  /* --- Virage : on arme dès qu'on entre dans la fenêtre d'entrée --- */
  if (node.turn !== 0 && player.t >= node.length - CFG.TURN_INPUT_WINDOW + 2) {
    fakeInput.press(node.turn === -1 ? "left" : "right");
    return;
  }

  /* --- Obstacle le plus proche devant --- */
  let next = null;
  for (const o of node.obstacles) {
    if (o.t <= player.t) continue;
    if (!next || o.t < next.t) next = o;
  }
  if (!next) return;

  const dist = next.t - player.t;
  const eta = dist / v;                       // secondes avant impact

  if (next.type === OBST.GAP) {
    // Sauter pour être en l'air sur toute la longueur du trou.
    if (eta <= 0.20 && player.y < 0.05) fakeInput.press("jump");
    return;
  }

  // Suis-je dans une voie bloquée ?
  let blocked = next.lanes[player.lane];

  if (next.type === OBST.WALL) {
    if (blocked && next.free.length) {
      // Rejoindre la voie libre la plus proche, le plus tôt possible.
      let best = next.free[0];
      for (const f of next.free) if (Math.abs(f - player.lane) < Math.abs(best - player.lane)) best = f;
      if (best < player.lane) fakeInput.press("left");
      else if (best > player.lane) fakeInput.press("right");
    }
    return;
  }

  if (next.type === OBST.LOW) {
    if (!blocked) return;
    if (eta <= 0.22 && player.y < 0.05) fakeInput.press("jump");
    return;
  }

  if (next.type === OBST.HIGH) {
    if (!blocked) return;
    if (eta <= 0.14 && !player.isSliding(CLOCK)) fakeInput.press("slide");
  }
}

/* ----------------------------------------------------------- UNE PARTIE --- */
function playRun(seed, driver, maxSeconds) {
  CLOCK = 0;
  fakeInput.clear();
  const track = new Track.TrackGen(seed);
  const player = new Player(track);
  const pack = new WolfPack(track);
  player.onStumble = () => pack.onStumble();

  const dt = 1 / 60;
  let stumbles = 0, frames = 0;
  const realOnStumble = player.onStumble;
  player.onStumble = () => { stumbles++; realOnStumble(); };

  while (player.alive && CLOCK / 1000 < maxSeconds) {
    if (driver) driver(player, track);
    player.update(dt, CLOCK);
    pack.update(dt, player);
    track.ensureAhead(player.nodeIndex);
    CLOCK += dt * 1000;
    frames++;
  }
  return {
    alive: player.alive, cause: player.deathCause, dist: player.totalDist,
    coins: player.coins, stumbles, frames, speed: player.speed, gap: pack.gap,
    seconds: CLOCK / 1000,
  };
}

/* ------------------------------------------------------------- BATTERIE --- */
let failures = [];
const RUNS = 120, SECONDS = 180;

let survived = 0, totalDist = 0, totalCoins = 0, totalStumbles = 0, maxSpeed = 0;
const causes = {};

for (let s = 0; s < RUNS; s++) {
  let r;
  try {
    r = playRun(s * 7919 + 3, oracle, SECONDS);
  } catch (e) {
    failures.push(`graine ${s} : exception — ${e && e.message}`);
    continue;
  }
  totalDist += r.dist; totalCoins += r.coins; totalStumbles += r.stumbles;
  maxSpeed = Math.max(maxSpeed, r.speed);
  if (r.alive) survived++; else causes[r.cause] = (causes[r.cause] || 0) + 1;
}

console.log(`Joueur oracle : ${RUNS} parties de ${SECONDS}s.`);
console.log(`  survie ${survived}/${RUNS}  |  distance moyenne ${(totalDist / RUNS).toFixed(0)} m`);
console.log(`  pièces moyennes ${(totalCoins / RUNS).toFixed(1)}  |  trébuchements moyens ${(totalStumbles / RUNS).toFixed(2)}`);
console.log(`  vitesse max atteinte ${maxSpeed.toFixed(1)} u/s (plafond ${CFG.SPEED_MAX})`);
if (Object.keys(causes).length) console.log(`  morts : ${JSON.stringify(causes)}`);

/* 2. Un joueur compétent doit survivre l'écrasante majorité du temps. */
if (survived < RUNS * 0.9) {
  failures.push(`un joueur parfait ne survit que ${survived}/${RUNS} fois — le jeu est trop punitif ou cassé`);
}

/* 3. Un joueur passif doit mourir, et vite. */
const idle = playRun(4242, null, 120);
console.log(`\nJoueur passif : mort=${!idle.alive} cause=${idle.cause} après ${idle.seconds.toFixed(1)}s / ${idle.dist.toFixed(0)} m`);
if (idle.alive) failures.push("un joueur qui ne touche à rien survit 120 s — l'échec ne fonctionne pas");
if (!idle.alive && idle.seconds > 60) failures.push("un joueur passif met plus d'une minute à mourir — la pression est trop faible");

/* 4. La montée en vitesse doit être effective. */
if (maxSpeed < CFG.SPEED_MAX * 0.95) failures.push(`la vitesse plafonne à ${maxSpeed.toFixed(1)} au lieu de ${CFG.SPEED_MAX}`);

if (failures.length) {
  console.log("\nÉCHEC :");
  for (const f of failures) console.log("  " + f);
  process.exit(1);
}
console.log("\nOK — boucle de jeu stable, échec fonctionnel, difficulté effective.");
