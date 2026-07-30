/* =============================================================================
   tools/smoke-render.js — Exerce world.js et camera.js sans navigateur.
   -----------------------------------------------------------------------------
       node tools/smoke-render.js

   world.js est le plus gros fichier du projet et le seul qu'aucun des deux
   autres scripts ne touche. On lui branche un faux Three.js (juste assez pour
   que les appels passent), on construit puis détruit des centaines de tronçons,
   et on fait tourner la boucle d'animation. Ça n'affiche rien — ça attrape les
   fautes de frappe, les propriétés manquantes et les fuites de meshes, qui sont
   l'essentiel de ce qui casse une scène Three.js.
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.join(__dirname, "..");

/* -------------------------------------------------------- faux Three.js --- */
let liveObjects = 0;
class V3 {
  constructor(x, y, z) { this.set(x || 0, y || 0, z || 0); }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  setScalar(k) { return this.set(k, k, k); }
  copy(v) { return this.set(v.x, v.y, v.z); }
  lerp(v, k) { this.x += (v.x - this.x) * k; this.y += (v.y - this.y) * k; this.z += (v.z - this.z) * k; return this; }
  lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
}
class Col {
  constructor(h) { this.h = h || 0; }
  lerp() { return this; } copy() { return this; } set() { return this; }
  setRGB() { return this; }
  // Zip 377 : setHex RETIENT la valeur, contrairement aux autres méthodes de
  // ce faux. C'est la seule dont on veut vérifier l'effet — le skin du joueur
  // ne se contrôle qu'en relisant la couleur qui a été posée.
  setHex(h) { this.h = h; return this; }
}
/* Vecteur 2D minimal, pour Texture.repeat et Texture.offset. */
class V2 {
  constructor(x, y) { this.x = x || 0; this.y = y || 0; }
  set(x, y) { this.x = x; this.y = y; return this; }
}
class Obj3 {
  constructor() {
    this.position = new V3(); this.rotation = new V3(); this.scale = new V3(1, 1, 1);
    this.children = []; this.userData = {}; this.visible = true; this.parent = null;
    liveObjects++;
  }
  add(o) { o.parent = this; this.children.push(o); }
  remove(o) { const i = this.children.indexOf(o); if (i >= 0) { this.children.splice(i, 1); o.parent = null; } }
  traverse(fn) { fn(this); for (const c of this.children) c.traverse(fn); }
  lookAt() {}
  updateProjectionMatrix() {}
}
function countTree(o) { let n = 1; for (const c of o.children) n += countTree(c); return n; }

class Mat {
  constructor(o) { Object.assign(this, o); this.color = this.color instanceof Col ? this.color : new Col(this.color); }
  clone() { return new Mat(Object.assign({}, this)); }
}

const THREE = {
  WebGLRenderer: class { constructor() {} setPixelRatio() {} setSize() {} render() { this.rendered = (this.rendered || 0) + 1; } },
  Scene: class extends Obj3 { constructor() { super(); this.background = new Col(); this.fog = null; } },
  Color: Col,
  FogExp2: class { constructor(c) { this.color = new Col(c); } },
  PerspectiveCamera: class extends Obj3 { constructor() { super(); this.aspect = 1; } },
  AmbientLight: class extends Obj3 { constructor() { super(); this.intensity = 1; } },
  DirectionalLight: class extends Obj3 { constructor() { super(); this.intensity = 1; } },
  PointLight: class extends Obj3 { constructor() { super(); this.intensity = 1; } },
  BoxGeometry: class { dispose() {} }, OctahedronGeometry: class { dispose() {} },
  PlaneGeometry: class { dispose() {} }, SphereGeometry: class { dispose() {} },
  MeshLambertMaterial: Mat,
  MeshBasicMaterial: Mat,
  // Texture de canvas : seules repeat et offset sont réellement lues par
  // world.js (défilement du lac), le reste n'est que des drapeaux.
  CanvasTexture: class { constructor(cv) { this.image = cv; this.repeat = new V2(1, 1); this.offset = new V2(0, 0); } },
  Mesh: class extends Obj3 { constructor(g, m) { super(); this.geometry = g; this.material = m; this.isMesh = true; this.renderOrder = 0; } },
  Group: class extends Obj3 {},
  Vector3: V3,
  DoubleSide: 2, BackSide: 1, FrontSide: 0,
  NearestFilter: 1003, RepeatWrapping: 1000, ClampToEdgeWrapping: 1001,
  AdditiveBlending: 2, NormalBlending: 1,
};

/* ---------------------------------------------------------- faux canvas ---
   AJOUTÉ AU ZIP 374 — et c'est un correctif, pas un ajout de confort : depuis
   que le sol en ruine du zip 373 peint ses dalles avec document.createElement,
   ce script échouait dès la première ligne de World.init(). Il n'a donc rien
   vérifié du tout entre le 373 et le 374.

   Leçon à garder : un outil de vérification qui n'est pas relancé à chaque
   livraison n'est pas un filet de sécurité, c'est un fichier mort. Les quatre
   scripts de tools/ se relancent en 20 secondes, il n'y a aucune raison d'en
   sauter un. */
function fakeCanvas(w, h) {
  const noop = () => {};
  const ctx2d = {
    canvas: null,
    fillStyle: "", strokeStyle: "", lineWidth: 1, lineCap: "", globalAlpha: 1,
    fillRect: noop, strokeRect: noop, clearRect: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    arc: noop, ellipse: noop, fill: noop, stroke: noop,
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
    // getImageData doit rendre un vrai tableau : paintLakeWaves écrit dedans.
    getImageData: (x, y, gw, gh) => ({ width: gw, height: gh, data: new Uint8ClampedArray(gw * gh * 4) }),
    putImageData: noop,
  };
  const cv = { width: w || 0, height: h || 0, getContext: () => ctx2d };
  ctx2d.canvas = cv;
  return cv;
}

const listeners = {};
const ctx = vm.createContext({
  Math, console, JSON, THREE, Uint8ClampedArray,
  performance: { now: () => Date.now() },
  window: {
    innerWidth: 1280, innerHeight: 720,
    addEventListener: (n, f) => { listeners[n] = f; },
  },
  document: {
    getElementById: () => ({}),
    createElement: (tag) => (tag === "canvas" ? fakeCanvas() : {}),
  },
  Input: { consume: () => false, peek: () => false, clear() {} },
  module: {},
});

for (const f of ["js/config.js", "js/track.js", "js/player.js", "js/wolves.js", "js/camera.js", "js/world.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
}
const { CFG, Track, Player, WolfPack, ChaseCamera, World } =
  vm.runInContext("({ CFG, Track, Player, WolfPack, ChaseCamera, World })", ctx);

/* --------------------------------------------------------------- SCÉNARIO */
const failures = [];
try {
  World.init({});
  /* LIGNE DE BASE. Tout ce que World.init installe une fois pour toutes — le
     ciel, le lac, la brume, le pool de poussière, le squelette du fermier, les
     loups, les lumières — n'a rien à voir avec le streaming des tronçons.

     Corrigé au 374 : l'ancien contrôle comparait le total de la scène à un
     seuil fixe (40 objets), ce qui ne mesurait pas une fuite mais la taille du
     décor permanent. Il suffisait d'articuler les bras du fermier pour le
     faire échouer. On mesure maintenant ce qu'on promet vraiment : le nombre
     d'objets IMPUTABLES AUX TRONÇONS. */
  const baseline = countTree(World.scene);

  const track = new Track.TrackGen(1234);
  const player = new Player(track);
  const pack = new WolfPack(track);
  const cam = new ChaseCamera(World.camera);

  for (const n of track.nodes) World.buildNode(n);
  const sceneAfterBuild = countTree(World.scene);

  // 4 minutes de jeu simulé : construction, destruction et animation.
  let built = 0, dropped = 0;
  const dt = 1 / 60;
  let now = 0;
  for (let i = 0; i < 60 * 240; i++) {
    player.totalDist += 26 * dt;
    player.t += 26 * dt;
    // avance de tronçon "à la main" (on ne teste pas les commandes ici)
    const node = player.node();
    if (player.t >= node.length) {
      const next = track.get(node.index + 1);
      if (next) { player.nodeIndex = next.index; player.t = 0; }
    }
    const drop = track.ensureAhead(player.nodeIndex);
    for (const n of drop) { World.dropNode(n); dropped++; }
    for (const n of track.nodes) if (!n.group) { World.buildNode(n); built++; }

    cam.update(dt, player);
    World.updatePlayer(player, now);
    World.updateWolves(pack, player, now);
    World.updateAmbient(now, (i % 600) / 600);
    World.render();
    now += dt * 1000;
  }

  const sceneAtEnd = countTree(World.scene);
  const nodesFirst = sceneAfterBuild - baseline;
  const nodesEnd = sceneAtEnd - baseline;
  /* Densité mesurée EN MÈTRES DE PISTE, pas par tronçon. Le zip 374 a rallongé
     les tronçons pour loger les zones franches des virages : compter par
     tronçon aurait fait exploser un budget qui n'avait pourtant pas bougé au
     mètre. On mesure la charge réelle du GPU, pas une unité de découpage. */
  const litUnits = track.nodes.reduce((s, n) => s + n.length, 0);
  const per100 = (nodesEnd / litUnits * 100);

  console.log(`Tronçons construits ${built}, détruits ${dropped}.`);
  console.log(`Décor permanent (ciel, lac, fermier, loups…) : ${baseline} objets.`);
  console.log(`Objets de tronçons : ${nodesFirst} après le 1er remplissage, ${nodesEnd} après 4 min de jeu.`);
  console.log(`  ${track.nodes.length} tronçons à l'écran, ${Math.round(litUnits)} u de piste, ${per100.toFixed(0)} objets / 100 u.`);

  /* FUITE. Le 1er remplissage ne pose que NODES_AHEAD tronçons ; en régime
     établi on en garde NODES_AHEAD + NODES_BEHIND. La croissance ATTENDUE est
     donc ce rapport, plus une marge pour la variation de longueur. */
  const expectedRatio = (CFG.NODES_AHEAD + CFG.NODES_BEHIND) / CFG.NODES_AHEAD;
  if (nodesEnd > nodesFirst * expectedRatio * 1.35) {
    failures.push(`les tronçons ont gonflé de ${nodesFirst} à ${nodesEnd} objets (attendu ≈ ×${expectedRatio.toFixed(2)}) — des meshes ne sont pas libérés`);
  }
  if (built === 0 || dropped === 0) failures.push("aucun tronçon construit ou détruit — la boucle de streaming ne tourne pas");

  /* BUDGET. Le zip 373 tournait à 161 objets pour 100 unités de piste. Le 374
     ajoute tout le décor de l'illustration ; le plafond est fixé à 200, soit
     +25 %, et la fenêtre de streaming a été resserrée (NODES_AHEAD 5 -> 4,
     NODES_BEHIND 2 -> 1) pour que le TOTAL à l'écran, lui, baisse.

     Un contrôle automatique vaut mieux qu'un commentaire : sinon la limite
     dérive livraison après livraison sans que personne le voie. */
  if (per100 > 200) failures.push(`budget dépassé : ${per100.toFixed(0)} objets / 100 u (plafond 200, repère 373 : 161)`);
  if (nodesEnd > 1000) failures.push(`${nodesEnd} objets de tronçon à l'écran (plafond 1000, repère 373 : 792)`);

  /* ======================================================================
     ZIP 377 (a) — COÛT D'UNE BIFURCATION OFFROAD.
     ----------------------------------------------------------------------
     Un tronçon qui porte un embranchement construit AUSSI toute la branche
     d'échappement dans son propre groupe. C'est le tronçon le plus lourd du
     jeu, et le seul dont le coût ne se voit pas dans la moyenne : il en passe
     un tous les 4000 unités, soit un sur quarante — assez rare pour qu'une
     moyenne le noie complètement, assez chargé pour faire chuter les images
     par seconde pile au moment de la décision. On le mesure donc SEUL.
     ====================================================================== */
  {
    const gen = new Track.TrackGen(7777);
    let junction = null, plain = null;
    while (!junction) {
      const n = gen.pushNode(false);
      if (n.exit !== 0) junction = n;
      else if (!plain && n.turn === 0 && n.index > 2) plain = n;
    }
    const before = countTree(World.scene);
    World.buildNode(plain);
    const plainCost = countTree(World.scene) - before;
    World.buildNode(junction);
    const junctionCost = countTree(World.scene) - before - plainCost;

    const plainPer100 = plainCost / plain.length * 100;
    // La branche est bâtie avec le tronçon : sa longueur compte dans la
    // densité, sinon on s'accuse d'un coût qu'on répartit sur trop peu de
    // mètres. Le joueur voit bien les deux à l'écran en même temps.
    const junctionPer100 = junctionCost / (junction.length + junction.escape.length) * 100;
    console.log(`\nBifurcation offroad : ${junctionCost} objets (tronçon ${junction.length} u + branche ${junction.escape.length} u)`);
    console.log(`  soit ${junctionPer100.toFixed(0)} objets / 100 u, contre ${plainPer100.toFixed(0)} pour un tronçon ordinaire.`);
    if (junctionPer100 > 200) {
      failures.push(`budget dépassé sur la bifurcation : ${junctionPer100.toFixed(0)} objets / 100 u (plafond 200)`);
    }
    World.dropNode(junction);
    World.dropNode(plain);
    if (countTree(World.scene) - before > 0) {
      failures.push(`dropNode ne libère pas entièrement un tronçon à bifurcation (branche orpheline ?)`);
    }
  }

  /* ======================================================================
     ZIP 377 (b) — LA SÉQUENCE DE SORTIE EST RENDUE SANS EXCEPTION.
     ----------------------------------------------------------------------
     Trois secondes pendant lesquelles la caméra pivote de 180°, le buste et
     la tête tournent sur un axe que rien n'utilisait, la brume s'épaissit et
     les loups sont posés sur une piste que le joueur a quittée. C'est
     l'endroit du code où une propriété manquante ne se verrait qu'en jeu, et
     seulement après 4000 mètres de course.
     ====================================================================== */
  {
    const gen2 = new Track.TrackGen(31337);
    let junction = null;
    while (!junction) { const n = gen2.pushNode(false); if (n.exit !== 0) junction = n; }
    const p2 = new Player(gen2);
    const pack2 = new WolfPack(gen2);
    const cam2 = new ChaseCamera(World.camera);
    World.buildNode(junction);
    p2.nodeIndex = junction.index;
    p2.totalDist = junction.startDist + junction.length;
    p2.takeExit(junction, 0, 0);
    if (!p2.escaping) failures.push("takeExit n'a pas basculé le joueur sur la branche");

    let t2 = 0, peakTwist = 0, peakYaw = 0;
    const mists = [];
    for (let i = 0; i < 200; i++) {
      p2.update(1 / 60, t2);
      const pose = p2.escapePose(t2);
      cam2.update(1 / 60, p2);
      World.updatePlayer(p2, t2);
      World.updateWolves(pack2, p2, t2);
      World.updateAmbient(t2, 0);
      World.setMist(pose.k);
      mists.push(World.scene.fog.density);
      peakTwist = Math.max(peakTwist, Math.abs(World.playerRig.chest.rotation.y));
      peakYaw = Math.max(peakYaw, Math.abs(pose.look));
      World.render();
      t2 += 1000 / 60;
    }
    console.log(`Séquence de sortie rendue sur 200 images : torsion max du buste ${peakTwist.toFixed(2)} rad (cible ${CFG.ESCAPE_LOOKBACK_TORSO}), regard max ${peakYaw.toFixed(2)}, brume ×${(mists[mists.length - 1] / CFG.FOG_NEAR_DENSITY).toFixed(2)}.`);
    // On vérifie que le regard en arrière a bien eu lieu À FOND : une courbe
    // qui culminerait à 0,3 passerait inaperçue en jeu (« il ne se retourne
    // pas vraiment ») mais ne casserait rien, donc rien ne la signalerait.
    if (peakYaw < 0.98) failures.push(`le regard en arrière ne va que jusqu'à ${peakYaw.toFixed(2)} au lieu de 1`);
    if (peakTwist < CFG.ESCAPE_LOOKBACK_TORSO * 0.98) failures.push(`la torsion du buste plafonne à ${peakTwist.toFixed(2)} rad`);
    if (!(mists[mists.length - 1] > mists[0])) failures.push("la brume ne s'épaissit pas pendant la sortie");
    if (mists[mists.length - 1] > CFG.FOG_NEAR_DENSITY * CFG.ESCAPE_MIST_MULT + 1e-9) {
      failures.push("la brume dépasse ESCAPE_MIST_MULT");
    }
    // La torsion doit être REVENUE à zéro à la fin, sinon elle survit à la
    // partie suivante — le fermier courrait la tête tournée.
    World.setMist(0);
    p2.escapeNode = null;
    World.updatePlayer(p2, t2);
    if (Math.abs(World.playerRig.chest.rotation.y) > 1e-9 || Math.abs(World.playerRig.head.rotation.y) > 1e-9) {
      failures.push("la torsion du buste/de la tête n'est pas remise à zéro hors sortie");
    }
    if (Math.abs(World.scene.fog.density - CFG.FOG_NEAR_DENSITY) > 1e-9) {
      failures.push("setMist(0) ne rend pas la densité de brouillard d'origine");
    }
    World.dropNode(junction);
  }

  /* ======================================================================
     ZIP 377 (c) — LE SKIN DU JOUEUR EST RÉELLEMENT APPLIQUÉ.
     ----------------------------------------------------------------------
     On ne relit pas applySkin : on lui donne une tenue et on regarde les
     matériaux et les visibilités APRÈS. C'est ce qui attrape la faute qu'on
     ne voit pas en lisant — un matériau partagé reteinté, une pièce féminine
     oubliée, des jambes restées en pantalon sous la jupe.
     ====================================================================== */
  {
    const kerbBefore = World.materials.kerb.color.h;
    const stoneBefore = World.materials.stone.color.h;

    World.applySkin({ gender: "f", shirt: 0xd44a3f, pants: 0x5a4632, hair: 0x2a2a2a, skin: 0xf0c8a0 });
    const m = World.materials, rig = World.playerRig;
    if (m.shirt.color.h !== 0xd44a3f) failures.push("la couleur de chemise n'est pas appliquée");
    if (m.hair.color.h !== 0x2a2a2a) failures.push("la couleur de cheveux n'est pas appliquée");
    if (!rig.femBody.every(o => o.visible)) failures.push("la jupe n'apparaît pas sur un personnage féminin");
    if (!rig.femHead.every(o => o.visible)) failures.push("les cheveux longs n'apparaissent pas sur un personnage féminin");
    if (rig.napeM.visible) failures.push("la nuque masculine reste visible sous les cheveux longs (z-fighting)");
    if (rig.legL.upper.material !== m.skin) failures.push("les jambes restent en pantalon sous la jupe");

    World.applySkin({ gender: "m", shirt: 0x3fa653, pants: 0x3d3d55, hair: 0xc8862a, skin: 0xf0c8a0 });
    if (m.shirt.color.h !== 0x3fa653) failures.push("la seconde tenue n'écrase pas la première");
    if (rig.femBody.some(o => o.visible) || rig.femHead.some(o => o.visible)) {
      failures.push("les pièces féminines survivent au passage à un personnage masculin");
    }
    if (!rig.napeM.visible) failures.push("la nuque masculine ne revient pas");
    if (rig.legL.upper.material !== m.pants) failures.push("les jambes ne repassent pas en pantalon");

    // Le décor n'a PAS bougé. C'est le contrôle qui manquerait le plus si on
    // ne l'écrivait pas : reteinter un matériau partagé repeindrait la moitié
    // du temple en couleur de chemise, et personne ne pense à le vérifier.
    if (World.materials.kerb.color.h !== kerbBefore || World.materials.stone.color.h !== stoneBefore) {
      failures.push("applySkin a modifié un matériau du DÉCOR");
    }
    console.log(`Skin : deux tenues appliquées (f puis m), pièces féminines basculées, décor intact.`);

    /* ORIENTATION DE LA TÊTE (zip 377). La caméra est posée à
       p - avant × CAM_BACK : elle voit donc le +Z LOCAL du fermier. Toutes
       les pièces qui appartiennent à l'ARRIÈRE du crâne — nuque masculine,
       masse de cheveux féminine — doivent y être, et la boucle d'oreille,
       elle, du côté du visage.

       Ce contrôle existe parce que la nuque était posée du mauvais côté
       depuis le zip 374 : le fermier courait avec ses cheveux sur le front et
       l'arrière du crâne en peau nue. Ça n'a jamais levé la moindre erreur, et
       ça ne s'est vu qu'en rendant le personnage (tools/render-runner.js). Une
       faute d'un signe qui ne casse rien ne se retrouve pas deux fois. */
    if (!(rig.napeM.position.z > 0)) failures.push("la nuque masculine est du côté du VISAGE (z <= 0)");
    if (!(rig.femHead[2].position.z > 0)) failures.push("la masse de cheveux féminine est du côté du visage (z <= 0)");
    if (!(rig.femHead[3].position.z < 0)) failures.push("la boucle d'oreille est derrière la tête (z >= 0)");
  }

  World.clearAll();
  const afterClear = countTree(World.scene) - baseline;
  if (afterClear > 0) failures.push(`clearAll() laisse ${afterClear} objet(s) de tronçon dans la scène`);

} catch (e) {
  failures.push(`exception : ${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e}`);
}

if (failures.length) {
  console.log("\nÉCHEC :");
  for (const f of failures) console.log("  " + f);
  process.exit(1);
}
console.log("\nOK — rendu exercé sans erreur, pas de fuite de géométrie.");
