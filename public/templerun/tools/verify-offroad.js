/* =============================================================================
   tools/verify-offroad.js — La bifurcation offroad, vérifiée par le RÉSULTAT.
   -----------------------------------------------------------------------------
       node tools/verify-offroad.js

   Zip 377. Ce script ne relit AUCUNE condition du code : il joue. Il fait
   prendre la sortie à un joueur, déroule la séquence image par image avec la
   vraie boucle, et regarde ce qui est arrivé — c'est le principe posé au §4 du
   contexte (« ne pas vérifier la règle qu'on a écrite, vérifier le résultat
   qu'on promet »), appliqué aux cinq promesses de la mécanique :

     1. CADENCE — une sortie tous les 4000 m, sans dérive cumulée. La sortie
        réelle tombe au bord du tronçon qui franchit le seuil, donc toujours
        un peu après ; ce qu'on vérifie, c'est que le retard ne S'ADDITIONNE
        pas d'une sortie à l'autre (le piège classique : repartir du bord
        atteint au lieu du seuil théorique fait dériver la 10e sortie de près
        de 900 mètres).

     2. AUCUNE SORTIE ACCIDENTELLE — la promesse la plus importante, parce
        qu'une sortie non désirée met fin à la course. On ne relit pas la zone
        franche : on fait jouer l'oracle de simulate-run.js sur des centaines
        de bifurcations et on compte les fois où il a eu BESOIN d'appuyer à
        gauche ou à droite dans la fenêtre d'armement. Le compte doit être nul.

     3. RIEN NE PEUT TUER PENDANT LA SÉQUENCE — trois secondes sans commandes.
        On déroule la séquence complète et on vérifie que le joueur est vivant
        à la fin, qu'il n'a jamais atteint le bout de la branche, et que la
        meute n'est jamais revenue à son contact.

     4. LA MEUTE NE PREND JAMAIS LA SORTIE — c'est le schéma de Guillaume. On
        vérifie que les loups restent posés sur la piste PRINCIPALE et que la
        distance entre eux et le fermier ne cesse d'augmenter.

     5. LE SCORE EST FIGÉ AU VIRAGE — pas au fondu. Un score qui continuerait
        de courir pendant la séquence offrirait les mêmes ~90 points à tout le
        monde, ce qui n'est plus un score.
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.join(__dirname, "..");

/* ------------------------------------------------- faux temps + faux clavier
   Copie conforme du harnais de simulate-run.js : même horloge, même tampon
   d'entrée, mêmes 160 ms de validité. Deux harnais qui divergeraient
   vérifieraient deux jeux différents. */
let CLOCK = 0;
const pending = new Map();
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

const DIRS = [{ x: 0, z: -1 }, { x: 1, z: 0 }, { x: 0, z: 1 }, { x: -1, z: 0 }];
const failures = [];
function fail(msg) { if (failures.length < 25) failures.push(msg); }

/* =========================================================================
   1. CADENCE
   ====================================================================== */
{
  const SEEDS = 300, EXITS_WANTED = 8;
  let worstEarly = Infinity, worstLate = -Infinity, worstGapDrift = 0;
  let counted = 0;

  for (let s = 0; s < SEEDS; s++) {
    const gen = new Track.TrackGen(s * 104729 + 11);
    const exits = [];
    while (exits.length < EXITS_WANTED) {
      const n = gen.pushNode(false);
      if (n.exit !== 0) exits.push(n.startDist + n.length);
      if (gen.nodes.length > 4000) break;   // garde-fou : jamais atteint
    }
    if (exits.length < EXITS_WANTED) { fail(`graine ${s} : seulement ${exits.length} bifurcations générées`); continue; }

    for (let k = 0; k < exits.length; k++) {
      const theory = CFG.OFFROAD_EVERY * (k + 1);
      const delta = exits[k] - theory;
      counted++;
      worstEarly = Math.min(worstEarly, delta);
      worstLate = Math.max(worstLate, delta);
      // Une sortie ne peut JAMAIS tomber avant son seuil, et jamais plus tard
      // que la longueur d'un tronçon après.
      if (delta < 0) fail(`graine ${s} : bifurcation ${k + 1} à ${exits[k].toFixed(0)}, AVANT son seuil ${theory}`);
      if (delta > CFG.NODE_LEN_MAX) fail(`graine ${s} : bifurcation ${k + 1} à ${exits[k].toFixed(0)}, soit ${delta.toFixed(0)} u après le seuil ${theory} (max ${CFG.NODE_LEN_MAX})`);
    }
    // Absence de DÉRIVE : l'écart de la dernière ne doit pas être plus grand
    // que celui de la première par plus d'une longueur de tronçon.
    worstGapDrift = Math.max(worstGapDrift, (exits[exits.length - 1] - CFG.OFFROAD_EVERY * exits.length) - (exits[0] - CFG.OFFROAD_EVERY));
  }
  console.log(`1. Cadence : ${counted} bifurcations sur ${SEEDS} graines.`);
  console.log(`   écart au seuil théorique : de +${worstEarly.toFixed(0)} à +${worstLate.toFixed(0)} u (longueur de tronçon : ${CFG.NODE_LEN_MIN}-${CFG.NODE_LEN_MAX})`);
  console.log(`   dérive cumulée sur 8 sorties : ${worstGapDrift.toFixed(0)} u au pire`);
  if (worstGapDrift > CFG.NODE_LEN_MAX) fail(`la cadence DÉRIVE : ${worstGapDrift.toFixed(0)} u accumulés en 8 sorties`);
}

/* =========================================================================
   2 & 3 & 4 & 5. On joue.
   ====================================================================== */

/* L'oracle de simulate-run.js, recopié à l'identique SAUF sa toute dernière
   ligne de conduite : il ne prend jamais la sortie, il ne la connaît même pas.
   C'est précisément ce qui rend le contrôle nº2 valable — s'il appuie dans la
   fenêtre d'armement, c'est qu'un obstacle l'y a forcé. */
function oracle(player, track) {
  const node = player.node();
  const v = Math.max(1, player.speed);

  if (node.turn !== 0 && player.t >= node.length - CFG.TURN_INPUT_WINDOW + 2) {
    fakeInput.press(node.turn === -1 ? "left" : "right");
    return;
  }
  const halfOf = (o) => o.type === OBST.CREVASSE ? CFG.CREVASSE_LENGTH / 2
                      : o.type === OBST.GAP ? CFG.GAP_LENGTH / 2 : 0;
  let next = null, dist = Infinity, lead = Infinity;
  const consider = (o, offset) => {
    const h = halfOf(o);
    const exit = o.t + h + offset - player.t;
    if (exit <= 0 || exit >= dist) return;
    dist = exit;
    lead = Math.max(0, o.t - h + offset - player.t);
    next = o;
  };
  for (const o of node.obstacles) consider(o, 0);
  if (!next && node.turn === 0) {
    const ahead = track.get(node.index + 1);
    if (ahead) for (const o of ahead.obstacles) consider(o, node.length);
  }
  if (!next) return;
  const eta = lead / v;

  if (next.type === OBST.GAP) {
    if (eta <= 0.20 && lead < 12 && player.y < 0.05) fakeInput.press("jump");
    return;
  }
  const blocked = next.lanes[player.lane];
  if (next.type === OBST.WALL || next.type === OBST.CREVASSE) {
    if (blocked && next.free.length) {
      let best = next.free[0];
      for (const f of next.free) {
        const d = Math.abs(f - player.lane), db = Math.abs(best - player.lane);
        if (d < db || (d === db && Math.sign(f - player.lane) === Math.sign(player.laneOffset))) best = f;
      }
      if (best < player.lane) fakeInput.press("left");
      else if (best > player.lane) fakeInput.press("right");
    }
    return;
  }
  if (next.type === OBST.LOW) {
    if (!blocked) return;
    if (eta <= 0.22 && lead < 12 && player.y < 0.05) fakeInput.press("jump");
    return;
  }
  if (next.type === OBST.HIGH) {
    if (!blocked) return;
    if (eta <= 0.14 && lead < 10 && !player.isSliding(CLOCK)) fakeInput.press("slide");
  }
}

/* Distance entre deux points de piste, en MONDE. Sert à prouver que la meute
   s'éloigne réellement — comparer des distances le long de la piste ne dirait
   rien, puisque le fermier n'est plus sur la même piste qu'elle. */
function worldPosOf(track, node, t, off) {
  const f = DIRS[node.dir & 3], r = DIRS[(node.dir + 1) & 3];
  return { x: node.ox + f.x * t + r.x * off, z: node.oz + f.z * t + r.z * off };
}

/* Une partie complète : on court avec l'oracle jusqu'à la n-ième bifurcation,
   on la PREND, puis on déroule la séquence de sortie. */
function playAndExit(seed, whichExit) {
  CLOCK = 0;
  fakeInput.clear();
  const track = new Track.TrackGen(seed);
  const player = new Player(track);
  const pack = new WolfPack(track);
  player.onStumble = () => pack.onStumble();

  const dt = 1 / 60;
  const out = {
    armedPresses: 0,     // appuis de l'oracle dans une fenêtre d'armement (doit rester 0)
    exitsSeen: 0,
    escaped: false, alive: true, cause: null,
    escapeDist: 0, scoreAtTurn: 0, junctionDist: 0, totalDistEnd: 0,
    maxBranchT: 0, branchLen: 0,
    minPackDist: Infinity, packOnBranch: false,
    packDistStart: 0, packDistEnd: 0,
    escapeFrames: 0, escapeMs: 0, minSpeed: Infinity, exitSpeed: 0,
    minOffAxis: Infinity, framedMs: 0, framedRun: 0, framedBest: 0,
    hudSeen: false,
  };
  let taken = false;
  const seenExitNodes = new Set();

  while (player.alive && CLOCK < 600000) {
    const node = player.node();

    if (!player.escaping) {
      // Le HUD annonce-t-il la sortie ? On lit la même source que l'interface.
      const at = track.nextExitAt(player.totalDist);
      if (at !== null && at - player.totalDist <= CFG.OFFROAD_HUD_DIST) out.hudSeen = true;

      const inWindow = node.exit !== 0 && player.t >= node.length - CFG.TURN_INPUT_WINDOW;
      const before = pending.size;
      const hadL = pending.has("left"), hadR = pending.has("right");
      oracle(player, track);
      if (inWindow && ((pending.has("left") && !hadL) || (pending.has("right") && !hadR))) {
        out.armedPresses++;
      }
      void before;

      // On compte les bifurcations par IDENTITÉ DE TRONÇON, pas par image :
      // la fenêtre d'armement dure une trentaine d'images, un compteur
      // incrémenté à chaque tour aurait cru voir trente sorties dans la
      // première — et le contrôle « ignorer deux sorties » n'aurait rien
      // ignoré du tout.
      if (inWindow && !seenExitNodes.has(node.index)) {
        seenExitNodes.add(node.index);
        out.exitsSeen = seenExitNodes.size;
      }
      // On ne prend QUE la bifurcation demandée : les précédentes sont
      // laissées passer, ce qui vérifie au passage qu'ignorer une sortie n'a
      // aucune conséquence.
      if (inWindow && !taken && out.exitsSeen >= whichExit) {
        fakeInput.press(node.exit === -1 ? "left" : "right");
        out.junctionDist = node.startDist + node.length;
        taken = true;
      }
    }

    const wasEscaping = player.escaping;
    player.update(dt, CLOCK);
    if (!player.escaping) pack.update(dt, player);

    if (player.escaping) {
      if (!wasEscaping) {
        out.escaped = true;
        out.escapeDist = player.escapeDist;
        out.scoreAtTurn = player.escapeDist * CFG.SCORE_PER_UNIT + player.coins * CFG.SCORE_PER_COIN;
        out.branchLen = player.escapeNode.length;
        out.exitSpeed = player.escapeSpeed;
        // Même détachement que Game.beginEscape : la meute file à SON allure.
        pack.detach(player.totalDist, player.escapeSpeed);
      }
      pack.runOn(dt);
      out.escapeFrames++;
      out.maxBranchT = Math.max(out.maxBranchT, player.t);
      out.minSpeed = Math.min(out.minSpeed, player.speed);

      // Où sont les loups ? On les localise EXACTEMENT comme world.js.
      const d = pack.baseDist(player) - pack.gap - pack.offsets[0].back;
      const loc = track.locate(Math.max(0, d));
      if (loc.node === player.escapeNode || loc.node.isEscape) out.packOnBranch = true;
      const pw = worldPosOf(track, loc.node, loc.t, pack.offsets[0].lane);
      const me = worldPosOf(track, player.escapeNode, player.t, player.laneOffset);
      const gapWorld = Math.hypot(pw.x - me.x, pw.z - me.z);
      out.minPackDist = Math.min(out.minPackDist, gapWorld);
      if (out.escapeFrames === 1) out.packDistStart = gapWorld;
      out.packDistEnd = gapWorld;

      /* ------------------------------------------------------------------
         LA MEUTE EST-ELLE RÉELLEMENT DANS LE CADRE ?
         C'est LA promesse de la séquence — « on voit les loups continuer tout
         droit » — et c'est la seule qu'aucune des règles précédentes ne
         touche. Elle ne dépend d'aucune constante qu'on pourrait relire :
         elle dépend d'une géométrie à trois inconnues (le fermier qui
         décélère, la meute qui file, la caméra qui pivote), et il suffit de
         retoucher l'une des trois pour cadrer un mur de pierre sans que
         quoi que ce soit d'autre ne bronche.

         On refait donc ici le calcul de camera.js — caméra posée derrière le
         fermier sur la branche, direction de visée pivotée de side × π × look
         — et on mesure l'angle sous lequel le premier loup apparaît. Demi-champ
         HORIZONTAL à 16/9 : atan(tan(36°) × 16/9) ≈ 52°. On exige mieux que
         45°, et pas seulement un instant : au moins 300 ms d'affilée. */
      const bf = DIRS[player.escapeNode.dir & 3];
      const cam = { x: me.x - bf.x * CFG.CAM_BACK, z: me.z - bf.z * CFG.CAM_BACK };
      const pose0 = player.escapePose(CLOCK);
      const a = player.escapeSide * Math.PI * pose0.look;
      const ca = Math.cos(a), sa = Math.sin(a);
      const lx = bf.x * ca + bf.z * sa, lz = bf.z * ca - bf.x * sa;
      const vx = pw.x - cam.x, vz = pw.z - cam.z;
      const vl = Math.hypot(vx, vz) || 1;
      const off = Math.acos(Math.max(-1, Math.min(1, (lx * vx + lz * vz) / vl))) * 180 / Math.PI;
      out.minOffAxis = Math.min(out.minOffAxis, off);
      if (off < 45) { out.framedMs += dt * 1000; out.framedRun += dt * 1000; }
      else out.framedRun = 0;
      out.framedBest = Math.max(out.framedBest, out.framedRun);

      const pose = player.escapePose(CLOCK);
      if (pose.k >= 1) { out.escapeMs = CLOCK - player.escapeStart; break; }
    } else {
      track.ensureAhead(player.nodeIndex);
    }
    CLOCK += dt * 1000;
  }
  out.alive = player.alive;
  out.cause = player.deathCause;
  out.totalDistEnd = player.totalDist;
  return out;
}

{
  const RUNS = 60;
  let totalArmed = 0, escapes = 0, worstMargin = Infinity, worstMs = 0, bestMs = 1e9;
  let minPack = Infinity, everCloser = 0, frozenGain = 0;
  let slowest = Infinity, fastestExit = 0;
  let bestOffAxis = Infinity, worstOffAxis = 0, shortestFramed = Infinity;

  for (let i = 0; i < RUNS; i++) {
    const r = playAndExit(i * 7919 + 3, 1);
    totalArmed += r.armedPresses;
    if (!r.escaped) { fail(`course ${i} : la bifurcation n'a pas été prise (mort=${!r.alive}, cause=${r.cause})`); continue; }
    escapes++;
    if (!r.alive) fail(`course ${i} : le joueur est MORT pendant la séquence de sortie (${r.cause})`);
    if (r.packOnBranch) fail(`course ${i} : la meute a été localisée sur la BRANCHE offroad`);
    if (r.packDistEnd <= r.packDistStart) fail(`course ${i} : la meute ne s'éloigne pas (${r.packDistStart.toFixed(1)} -> ${r.packDistEnd.toFixed(1)})`);
    if (!r.hudSeen) fail(`course ${i} : le HUD n'a jamais annoncé la sortie`);

    const margin = r.branchLen - r.maxBranchT;
    worstMargin = Math.min(worstMargin, margin);
    worstMs = Math.max(worstMs, r.escapeMs);
    bestMs = Math.min(bestMs, r.escapeMs);
    minPack = Math.min(minPack, r.minPackDist);
    if (r.minPackDist < 6) everCloser++;
    slowest = Math.min(slowest, r.minSpeed);
    fastestExit = Math.max(fastestExit, r.exitSpeed);
    bestOffAxis = Math.min(bestOffAxis, r.minOffAxis);
    worstOffAxis = Math.max(worstOffAxis, r.minOffAxis);
    shortestFramed = Math.min(shortestFramed, r.framedBest);
    if (r.framedBest < 300) {
      fail(`course ${i} : la meute n'est dans le cadre que ${r.framedBest.toFixed(0)} ms d'affilée (angle minimal ${r.minOffAxis.toFixed(0)}°)`);
    }
    // La décélération doit être RÉELLE et se voir : le fermier finit sa fuite
    // au trot, pas à la vitesse de course. C'est le principal levier de calme
    // de la séquence — s'il cessait d'agir, rien d'autre ne le signalerait.
    if (r.minSpeed > CFG.ESCAPE_JOG_SPEED * 1.35) {
      fail(`course ${i} : le fermier ne ralentit pas (vitesse minimale ${r.minSpeed.toFixed(1)} u/s pour un trot à ${CFG.ESCAPE_JOG_SPEED})`);
    }

    /* SCORE FIGÉ AU VIRAGE. Deux contrôles, et il faut les deux :
       - la distance retenue est EXACTEMENT celle du bord du tronçon, à la
         fraction d'image près (le joueur bascule un poil après le coin) ;
       - elle est STRICTEMENT INFÉRIEURE à la distance réellement parcourue à
         la fin de la séquence. Sans ce second contrôle, un `escapeDist` qui
         continuerait de suivre totalDist passerait le premier sans broncher. */
    if (Math.abs(r.escapeDist - r.junctionDist) > 1.0) {
      fail(`course ${i} : distance retenue ${r.escapeDist.toFixed(1)} au lieu de ${r.junctionDist.toFixed(1)} (bord du tronçon)`);
    }
    if (!(r.escapeDist < r.totalDistEnd - 50)) {
      fail(`course ${i} : la distance n'a pas été figée (${r.escapeDist.toFixed(1)} vs ${r.totalDistEnd.toFixed(1)} parcourus)`);
    }
    frozenGain = Math.max(frozenGain, r.totalDistEnd - r.escapeDist);
  }

  console.log(`\n2. Sorties accidentelles : ${totalArmed} appui(s) de l'oracle dans une fenêtre d'armement, sur ${RUNS} courses.`);
  console.log(`3. Séquence : ${escapes}/${RUNS} sorties menées à terme, durée ${bestMs.toFixed(0)}-${worstMs.toFixed(0)} ms (cible ${CFG.ESCAPE_TOTAL_MS}).`);
  console.log(`   marge minimale avant le bout de la branche : ${worstMargin.toFixed(1)} u sur ${CFG.OFFROAD_BRANCH_LEN}`);
  console.log(`   allure : ${fastestExit.toFixed(1)} u/s au virage -> ${slowest.toFixed(1)} u/s à la fin (trot visé ${CFG.ESCAPE_JOG_SPEED}).`);
  console.log(`4. Meute : distance minimale au fermier pendant la sortie ${minPack.toFixed(1)} u ; ${everCloser} course(s) sous 6 u.`);
  console.log(`   DANS LE CADRE : au plus près ${bestOffAxis.toFixed(0)}°-${worstOffAxis.toFixed(0)}° de l'axe (demi-champ ~52°), visible ${shortestFramed.toFixed(0)} ms d'affilée au minimum.`);
  console.log(`   score figé : jusqu'à ${frozenGain.toFixed(0)} u parcourus après le virage ne sont PAS comptés (${(frozenGain * CFG.SCORE_PER_UNIT).toFixed(0)} points).`);

  if (totalArmed > 0) {
    fail(`${totalArmed} appui(s) latéral(aux) NÉCESSAIRE(S) dans une fenêtre d'armement : une sortie accidentelle est possible`);
  }
  if (escapes < RUNS) fail(`seules ${escapes}/${RUNS} sorties ont abouti`);
  if (worstMargin < 8) fail(`marge trop faible avant le bout de la branche : ${worstMargin.toFixed(1)} u — allonger OFFROAD_BRANCH_LEN`);
  if (worstMs > CFG.ESCAPE_TOTAL_MS + 40) fail(`la séquence dure ${worstMs.toFixed(0)} ms au lieu de ${CFG.ESCAPE_TOTAL_MS}`);
  if (minPack < 4) fail(`la meute est passée à ${minPack.toFixed(1)} u du fermier pendant une sortie — elle doit s'éloigner, pas frôler`);
}

/* =========================================================================
   IGNORER UNE SORTIE N'A AUCUNE CONSÉQUENCE
   ====================================================================== */
{
  const r = playAndExit(987654, 3);   // on laisse passer les deux premières
  console.log(`\n5. Sorties ignorées : 2 laissées passer, la 3e prise à ${r.escapeDist.toFixed(0)} m — vivant=${r.alive}.`);
  if (!r.escaped) fail("impossible d'ignorer deux bifurcations puis de prendre la troisième");
  if (!r.alive) fail("mort après avoir ignoré deux bifurcations");
  if (r.escapeDist < CFG.OFFROAD_EVERY * 3) fail(`la 3e bifurcation est tombée à ${r.escapeDist.toFixed(0)} m, avant ${CFG.OFFROAD_EVERY * 3}`);
}

/* =========================================================================
   LA BRANCHE S'ÉCARTE VRAIMENT DE LA PISTE
   ====================================================================== */
{
  const gen = new Track.TrackGen(24601);
  let node = null;
  while (!node) { const n = gen.pushNode(false); if (n.exit !== 0) node = n; }
  const esc = node.escape;
  // À 20 unités sur la branche, on doit être à 20 unités de l'axe de la piste
  // principale : c'est ce qui fait une FOURCHE et non un couloir parallèle.
  const f = DIRS[node.dir & 3];
  const p = worldPosOf(gen, esc, 20, 0);
  // Distance du point à la droite (origine du tronçon, direction f).
  const vx = p.x - node.ox, vz = p.z - node.oz;
  const along = vx * f.x + vz * f.z;
  const lateral = Math.hypot(vx - along * f.x, vz - along * f.z);
  console.log(`\n6. Géométrie : 20 u sur la branche = ${lateral.toFixed(1)} u d'écart latéral avec l'axe de la piste.`);
  if (lateral < CFG.TRACK_WIDTH) fail(`la branche reste à ${lateral.toFixed(1)} u de la piste : ce n'est pas une bifurcation`);
}

if (failures.length) {
  console.log("\nÉCHEC :");
  for (const f of failures) console.log("  " + f);
  process.exit(1);
}
console.log("\nOK — cadence tenue, aucune sortie accidentelle possible, séquence sûre, meute semée.");
