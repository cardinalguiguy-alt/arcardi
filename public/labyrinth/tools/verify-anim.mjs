/* =============================================================================
   verify-anim.mjs — CE QUI EST CONTRÔLABLE DANS UNE ANIMATION. Zip 395.
   -----------------------------------------------------------------------------
   ⚠️ CE SCRIPT NE DIT PAS SI L'ANIMATION EST BELLE. Il ne peut pas, et il faut
   le dire avant tout le reste : l'allure d'une démarche se juge à l'œil, et
   seulement à l'œil. Ce qu'il contrôle, c'est ce qui peut être FAUX sans qu'on
   le voie tout de suite, et qui rend alors tout le travail inutile :

   1. LE PATINAGE. Le cycle doit avancer proportionnellement à la DISTANCE
      parcourue, jamais au temps. C'est la seule différence entre « il marche »
      et « il glisse », et elle se mesure : deux vitesses différentes doivent
      donner le même nombre de foulées pour la même distance.

   2. LE PÉDALAGE CONTRE UN MUR. Un personnage qui pousse une cloison ne
      parcourt aucune distance : ses jambes doivent s'arrêter. C'est le défaut
      le plus visible du genre, et le plus facile à laisser passer, parce qu'il
      ne se produit que lorsqu'on bute — c'est-à-dire jamais pendant un test.

   3. LES ANGLES BORNÉS. Aucune articulation ne doit dépasser ce qu'une
      articulation peut faire. Un genou qui part à 4 radians ne lève aucune
      erreur : il retourne simplement la jambe, et on met longtemps à
      comprendre ce qu'on regarde.

   4. LA CONTINUITÉ. Entre deux images consécutives, aucun angle ne doit
      sauter. Un saut, c'est un à-coup — exactement ce que Guillaume a signalé.

   5. LE BOUCLAGE. Le cycle doit se refermer : la pose à gait=0 et celle à
      gait=1 doivent être identiques, sinon il y a une secousse une fois par
      foulée. C'est le défaut classique des cycles écrits à la main.

   6. LES CONTRAIRES. Bras gauche avec jambe droite. Sans ce
      contre-balancement, on obtient un pantin qui rame.
   ========================================================================== */

import { load } from "./lib-play.mjs";

/* Faux Three.js minimal : rig.js ne fait que construire des hiérarchies et
   écrire des angles, donc il suffit de savoir porter position/rotation. */
function V3() { return { x: 0, y: 0, z: 0, set(a, b, c) { this.x = a; this.y = b; this.z = c; return this; } }; }
function node() {
  return { position: V3(), rotation: V3(), scale: V3(), visible: true,
    children: [], userData: {}, add(c) { this.children.push(c); }, lookAt() {} };
}
const FakeTHREE = {
  Group: node, Mesh: node,
  BoxGeometry: node, PlaneGeometry: node, SphereGeometry: node,
  // ⚠️ `function` et non flèche : rig.js les appelle avec `new`, et une
  // fonction fléchée n'est pas constructible. Le faux Three.js doit se laisser
  // utiliser exactement comme le vrai.
  MeshLambertMaterial: function (o) { return Object.assign(node(), o || {}); },
  MeshBasicMaterial: function (o) { return Object.assign(node(), o || {}); },
  AdditiveBlending: 1, DoubleSide: 2,
};
global.window = { THREE: FakeTHREE, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1, addEventListener() {} };
global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, clearRect() {}, fillStyle: "" }) }) };

const { CFG, Maze, Rules, Rig } = load(["js/config.js", "js/maze.js", "js/rules.js", "js/rig.js"]);
Rig.init(FakeTHREE);

let fails = 0;
const ok = (n, c, x) => { console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  " + x : ""}`); if (!c) fails++; };
const DT = 1 / CFG.SIM_HZ;

function fresh(seed) {
  const m = Maze.generate(CFG, seed || 909);
  const st = Rules.create(CFG, m, seed || 909);
  return st;
}
function run(st, intent, steps) {
  for (let i = 0; i < steps; i++) Rules.step(st, DT, Object.assign({ fwd: 0, turn: 0, strafe: 0 }, intent));
}

/* --- 1. LE CYCLE AVANCE À LA DISTANCE ------------------------------------
   On compare marche et course sur la MÊME distance parcourue. Si le cycle
   dépendait du temps, la course (plus rapide) donnerait moins de foulées pour
   la même distance — c'est exactement le patinage. */
{
  /* ⚠️ ON MESURE LA DISTANCE RÉELLEMENT PARCOURUE, pas celle qu'on visait.
     La première version comparait le nombre de foulées à `30 / STRIDE` en
     supposant que le fermier avait bien fait 30 unités — il en faisait 26,
     parce qu'il finissait contre un mur. L'outil signalait donc un patinage
     qui n'existait pas : il mesurait sa propre hypothèse. C'est, une fois de
     plus, le corollaire n°5 du zip 387 — et il vaut aussi pour les outils
     qu'on écrit pour vérifier une correction du même défaut. */
  function stridesFor(runMode, steps) {
    const st = fresh(); st.ang = 0;
    let dist = 0, strides = 0, last = st.gait;
    for (let i = 0; i < steps; i++) {
      const x0 = st.px, z0 = st.pz;
      Rules.step(st, DT, { fwd: 1, turn: 0, strafe: 0, run: runMode });
      dist += Math.hypot(st.px - x0, st.pz - z0);
      let d = st.gait - last; if (d < 0) d += 1;
      strides += d; last = st.gait;
    }
    return { dist, strides, ratio: strides / (dist / CFG.STRIDE) };
  }
  const w = stridesFor(false, 60), r = stridesFor(true, 60);
  ok("le cycle avance à la DISTANCE, pas au temps (marche)", Math.abs(w.ratio - 1) < 0.02,
    `${w.strides.toFixed(2)} foulées pour ${w.dist.toFixed(1)} u (rapport ${w.ratio.toFixed(3)})`);
  ok("... et la course donne le même rapport", Math.abs(r.ratio - 1) < 0.02,
    `course ${r.ratio.toFixed(3)} contre marche ${w.ratio.toFixed(3)} sur ${r.dist.toFixed(1)} u`);
}

/* --- 2. PAS DE PÉDALAGE CONTRE UN MUR ------------------------------------ */
{
  const st = fresh();
  // On le colle au mur nord de sa cellule et on pousse.
  const [cx, cy] = Rules.cellOf(CFG, st.px, st.pz);
  st.pz = cy * CFG.CELL + CFG.WALL / 2 + CFG.BODY_R + 0.02;
  st.ang = 0;
  run(st, { fwd: 1 }, 10);                    // on arrive au contact
  const g0 = st.gait;
  run(st, { fwd: 1 }, 30);                    // une seconde à pousser
  let d = st.gait - g0; if (d < 0) d += 1;
  ok("pousser un mur n'anime PAS les jambes", d < 0.06, `${d.toFixed(3)} foulée en 1 s de poussée`);
}

/* --- 3, 4, 5, 6 : LA POSE ------------------------------------------------- */
const rig = Rig.buildFarmer(CFG, { wood: node() }, null);
const roam = Rig.buildRoamer(CFG);
const stalk = Rig.buildStalker(CFG);

const JOINTS = (r) => [
  ["hanche G", r.legL.hip], ["hanche D", r.legR.hip],
  ["genou G", r.legL.kn], ["genou D", r.legR.kn],
  ["cheville G", r.legL.an], ["cheville D", r.legR.an],
  ["épaule G", r.armL.sh], ["épaule D", r.armR.sh],
  ["coude G", r.armL.el], ["coude D", r.armR.el],
  ["buste", r.torso || r.spine], ["bassin", r.hips],
];

{
  // 3. bornes, 4. continuité
  let worstJump = 0, worstName = "", worstAbs = 0, worstAbsName = "";
  let prevAngles = null;
  for (let i = 0; i <= 240; i++) {
    const gait = (i / 60) % 1;
    Rig.poseFarmer(rig, {
      gait, gaitSpeed: CFG.WALK_SPEED, runAmt: 0.4, strafeAmt: 0.2, backAmt: 0,
      swingT: 0, hurt: 0, falling: false,
    }, CFG, i * DT);
    const now = JOINTS(rig).map(([n, j]) => [n, j.rotation.x, j.rotation.y, j.rotation.z]);
    for (const [n, x, y, z] of now) {
      for (const v of [x, y, z]) {
        if (!isFinite(v)) { ok("angle fini", false, n); }
        if (Math.abs(v) > worstAbs) { worstAbs = Math.abs(v); worstAbsName = n; }
      }
    }
    if (prevAngles) {
      for (let k = 0; k < now.length; k++) {
        for (let c = 1; c <= 3; c++) {
          const d = Math.abs(now[k][c] - prevAngles[k][c]);
          if (d > worstJump) { worstJump = d; worstName = now[k][0]; }
        }
      }
    }
    prevAngles = now;
  }
  ok("aucune articulation ne dépasse π", worstAbs < Math.PI, `max ${worstAbs.toFixed(2)} rad (${worstAbsName})`);
  ok("aucun saut d'angle entre deux images", worstJump < 0.22, `max ${worstJump.toFixed(3)} rad (${worstName})`);
}

{
  // 5. bouclage
  const snap = (gait) => {
    Rig.poseFarmer(rig, { gait, gaitSpeed: CFG.WALK_SPEED, runAmt: 0, strafeAmt: 0, backAmt: 0,
      swingT: 0, hurt: 0, falling: false }, CFG, 0);
    return JOINTS(rig).map(([, j]) => [j.rotation.x, j.rotation.y, j.rotation.z]);
  };
  const a = snap(0), b = snap(0.99999);
  let worst = 0;
  for (let i = 0; i < a.length; i++) for (let c = 0; c < 3; c++) worst = Math.max(worst, Math.abs(a[i][c] - b[i][c]));
  ok("le cycle boucle proprement (gait 0 = gait 1)", worst < 0.01, `écart max ${worst.toFixed(4)} rad`);
}

{
  /* 6. contraires : bras gauche avec jambe droite.
     ⚠️ ON ARME LE FERMIER AVANT DE MESURER : le bras droit porte un décalage
     de garde qui n'existe QUE l'épée en main.

     ⚠️ ET ON NE CONNAÎT PLUS CE DÉCALAGE (correction du 396). La version
     précédente ajoutait « +0,30 » en dur, c'est-à-dire la valeur de garde du
     zip 395 recopiée dans le contrôle. Le 396 a changé cette pose — signes
     d'articulation corrigés — et le contrôle a échoué alors que le
     contre-balancement, lui, était parfaitement juste : il mesurait l'écart
     entre le code et SA PROPRE COPIE d'une constante, pas le balancement des
     bras. C'est le piège du 394 en miniature.

     La parade est celle qu'on applique partout ailleurs : on ne suppose rien,
     on MESURE la position moyenne du bras sur le cycle et on regarde s'il
     oscille autour d'elle en opposition avec la jambe. Ça reste vrai quelle
     que soit la garde, aujourd'hui et dans dix zips. */
  rig.sword.visible = true;
  const poseAt = (gait) => Rig.poseFarmer(rig,
    { gait, gaitSpeed: CFG.WALK_SPEED, runAmt: 0, strafeAmt: 0, backAmt: 0,
      swingT: 0, hurt: 0, falling: false }, CFG, 0);
  let mean = 0;
  for (let i = 0; i < 60; i++) { poseAt(i / 60); mean += rig.armR.sh.rotation.x; }
  mean /= 60;
  let agree = 0, n = 0;
  for (let i = 0; i < 60; i++) {
    poseAt(i / 60);
    // La jambe gauche avance quand hip.x > 0 ; le bras DROIT doit alors avancer
    // aussi (il est libre), donc s'écarter de sa moyenne dans le même sens.
    const legL = rig.legL.hip.rotation.x, armR = rig.armR.sh.rotation.x - mean;
    if (Math.abs(legL) > 0.15) { n++; if (Math.sign(legL) === Math.sign(armR)) agree++; }
  }
  ok("bras droit et jambe gauche se répondent", n > 20 && agree / n > 0.9, `${agree}/${n} images en accord`);
}

{
  // L'ATTAQUE EN TROIS TEMPS : l'épaule doit d'abord RECULER (armé), puis
  // partir vers l'avant plus vite qu'elle n'est partie en arrière.
  const dur = CFG.SWING_MS / 1000;
  let minX = 9, minAt = 0, maxSpeed = 0, prevX = null;
  for (let i = 0; i <= 40; i++) {
    const k = i / 40;
    Rig.poseFarmer(rig, { gait: 0, gaitSpeed: 0, runAmt: 0, strafeAmt: 0, backAmt: 0,
      swingT: dur * (1 - k), hurt: 0, falling: false }, CFG, 0);
    const x = rig.armR.sh.rotation.x;
    if (x < minX) { minX = x; minAt = k; }
    if (prevX !== null) maxSpeed = Math.max(maxSpeed, (x - prevX) / (1 / 40));
    prevX = x;
  }
  ok("l'attaque a un ARMÉ (l'épaule recule d'abord)", minX < -1.6 && minAt > 0.15 && minAt < 0.45,
    `minimum ${minX.toFixed(2)} rad à ${(minAt * 100) | 0} % du geste`);
  ok("... puis un coup NETTEMENT plus rapide que l'armé", maxSpeed > 8, `${maxSpeed.toFixed(1)} rad par unité de geste`);
}

{
  // Les créatures : mêmes bornes, même continuité.
  for (const [name, r, fn, speed] of [["rôdeur", roam, Rig.poseRoamer, CFG.ROAMER_SPEED],
                                      ["traqueur", stalk, Rig.poseStalker, CFG.STALK_SPEED]]) {
    let worstJump = 0, prevA = null, bad = false;
    for (let i = 0; i <= 180; i++) {
      fn(r, { gait: (i / 60) % 1, gaitSpeed: speed, chasing: i > 90, stagger: 0,
              dead: false, deadT: 0, toPlayer: 0.4 }, CFG, i * DT);
      const now = JOINTS(r).map(([, j]) => [j.rotation.x, j.rotation.y, j.rotation.z]);
      for (const t of now) for (const v of t) if (!isFinite(v) || Math.abs(v) > Math.PI) bad = true;
      // Le passage chasse/non-chasse change de pose : on l'exclut du contrôle
      // de continuité, c'est une transition d'ÉTAT et non une image de cycle.
      if (prevA && i !== 91) {
        for (let k = 0; k < now.length; k++) for (let c = 0; c < 3; c++)
          worstJump = Math.max(worstJump, Math.abs(now[k][c] - prevA[k][c]));
      }
      prevA = now;
    }
    ok(`${name} : angles bornés et finis`, !bad);
    ok(`${name} : aucun saut d'angle`, worstJump < 0.25, `max ${worstJump.toFixed(3)} rad`);
  }
}

console.log(fails ? `\n${fails} ÉCHEC(S)\n` : "\nTout est passé.\n");
console.log(`⚠️ Ce script ne dit PAS si l'animation est belle — il ne peut pas.
Il dit qu'elle ne patine pas, qu'elle ne pédale pas contre un mur, qu'elle
boucle, qu'aucun angle ne saute, et que le coup d'épée a bien un armé. Le reste
se juge à l'œil.\n`);
process.exit(fails ? 1 : 0);
