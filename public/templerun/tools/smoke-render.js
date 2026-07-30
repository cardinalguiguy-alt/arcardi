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
