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
  copy(v) { return this.set(v.x, v.y, v.z); }
  lerp(v, k) { this.x += (v.x - this.x) * k; this.y += (v.y - this.y) * k; this.z += (v.z - this.z) * k; return this; }
  lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
}
class Col {
  constructor(h) { this.h = h || 0; }
  lerp() { return this; } copy() { return this; } set() { return this; }
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

const THREE = {
  WebGLRenderer: class { constructor() {} setPixelRatio() {} setSize() {} render() { this.rendered = (this.rendered || 0) + 1; } },
  Scene: class extends Obj3 { constructor() { super(); this.background = new Col(); this.fog = null; } },
  Color: Col,
  FogExp2: class { constructor(c) { this.color = new Col(c); } },
  PerspectiveCamera: class extends Obj3 { constructor() { super(); this.aspect = 1; } },
  AmbientLight: class extends Obj3 {}, DirectionalLight: class extends Obj3 {},
  PointLight: class extends Obj3 { constructor() { super(); this.intensity = 1; } },
  BoxGeometry: class { dispose() {} }, OctahedronGeometry: class { dispose() {} }, PlaneGeometry: class { dispose() {} },
  MeshLambertMaterial: class { constructor(o) { Object.assign(this, o); } },
  MeshBasicMaterial: class { constructor(o) { Object.assign(this, o); } },
  Mesh: class extends Obj3 { constructor(g, m) { super(); this.geometry = g; this.material = m; this.isMesh = true; } },
  Group: class extends Obj3 {},
  Vector3: V3,
  DoubleSide: 2,
};

const listeners = {};
const ctx = vm.createContext({
  Math, console, JSON, THREE,
  performance: { now: () => Date.now() },
  window: {
    innerWidth: 1280, innerHeight: 720,
    addEventListener: (n, f) => { listeners[n] = f; },
  },
  document: { getElementById: () => ({}) },
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
  console.log(`Tronçons construits ${built}, détruits ${dropped}.`);
  console.log(`Objets dans la scène : ${sceneAfterBuild} après le 1er remplissage, ${sceneAtEnd} après 4 min de jeu.`);

  // FUITE : la scène doit rester stable. On tolère 60 % de marge (la longueur
  // des tronçons varie), mais pas une croissance sans fin.
  if (sceneAtEnd > sceneAfterBuild * 1.6) {
    failures.push(`la scène a gonflé de ${sceneAfterBuild} à ${sceneAtEnd} objets — des meshes ne sont pas libérés`);
  }
  if (built === 0 || dropped === 0) failures.push("aucun tronçon construit ou détruit — la boucle de streaming ne tourne pas");

  World.clearAll();
  if (countTree(World.scene) > 40) failures.push("clearAll() laisse des tronçons dans la scène");

} catch (e) {
  failures.push(`exception : ${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e}`);
}

if (failures.length) {
  console.log("\nÉCHEC :");
  for (const f of failures) console.log("  " + f);
  process.exit(1);
}
console.log("\nOK — rendu exercé sans erreur, pas de fuite de géométrie.");
