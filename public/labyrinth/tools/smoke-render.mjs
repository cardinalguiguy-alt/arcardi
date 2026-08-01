/* =============================================================================
   smoke-render.mjs — world.js EXÉCUTÉ, contre un faux Three.js et un faux DOM.
   -----------------------------------------------------------------------------
   Repris de public/templerun/tools/smoke-render.js. Il ne dessine rien et ne
   prouve rien de l'aspect : il prouve que le rendu S'EXÉCUTE — construction de
   la scène, puis trois cents images de sync() — sans jeter.

   ⚠️ POURQUOI ÇA VAUT LE COUP alors qu'aucune image n'en sort : le projet ne
   peut ni builder ni linter (registre npm bloqué), et world.js est le seul
   fichier du chantier que node --check ne peut pas juger utilement — il est
   syntaxiquement correct depuis la première minute et plante à la première
   propriété mal orthographiée d'un objet Three.js. Une faute de frappe sur
   `AdditiveBlending` ne se voit qu'ici ou en jeu.

   IL COMPTE AUSSI LE BUDGET D'OBJETS, comme son homologue du défi : un
   labyrinthe de 21×21 pose ~900 murs, 441 dalles et une centaine d'accessoires.
   Si ce nombre s'envole un jour, c'est ici qu'on le verra, pas sur la tablette
   de Guillaume.

   CE QU'IL NE PROUVE PAS : rien des couleurs, rien des textures (le faux
   contexte 2D accepte tout), rien de la lisibilité. Pour ça, il n'y a que
   jouer — et tools/render-maze.mjs, qui écrit les textures en PNG.
   ========================================================================== */

import { load } from "./lib-play.mjs";

let created = 0, meshes = 0;
const seen = new Set();

/* Faux Three.js. Chaque classe compte ses instanciations et rend un objet
   dont les champs suffisent à world.js. Toute propriété absente lève, ce qui
   est exactement le contrôle voulu : on veut que ça CASSE. */
function V3() { return { x: 0, y: 0, z: 0, set(a, b, c) { this.x = a; this.y = b; this.z = c; return this; } }; }
function node(kind) {
  created++;
  seen.add(kind);
  return {
    kind,
    position: V3(), rotation: V3(), scale: V3(),
    visible: true, children: [], userData: {}, material: null, geometry: null,
    add(c) { this.children.push(c); },
    lookAt() {},
    updateProjectionMatrix() {},
  };
}
const FakeTHREE = {
  Scene: function () { const n = node("Scene"); n.fog = null; n.background = null; return n; },
  Group: function () { return node("Group"); },
  Mesh: function (g, m) { meshes++; const n = node("Mesh"); n.geometry = g; n.material = m; return n; },
  PerspectiveCamera: function () { const n = node("Camera"); n.aspect = 1; return n; },
  WebGLRenderer: function () {
    return { setSize() {}, setPixelRatio() {}, render() {}, domElement: {} };
  },
  Fog: function (c, n, f) { return { color: c, near: n, far: f }; },
  Color: function (c) { return { c }; },
  BoxGeometry: function () { return node("BoxGeometry"); },
  PlaneGeometry: function () { return node("PlaneGeometry"); },
  CylinderGeometry: function () { return node("CylinderGeometry"); },
  OctahedronGeometry: function () { return node("OctahedronGeometry"); },
  MeshLambertMaterial: function (o) { return Object.assign(node("Lambert"), o || {}); },
  MeshBasicMaterial: function (o) { return Object.assign(node("Basic"), o || {}); },
  AmbientLight: function () { return node("AmbientLight"); },
  PointLight: function () { const n = node("PointLight"); n.distance = 0; n.intensity = 0; return n; },
  CanvasTexture: function () {
    return { magFilter: 0, minFilter: 0, wrapS: 0, wrapT: 0, offset: { x: 0, y: 0 }, repeat: { set() {} } };
  },
  NearestFilter: 1, NearestMipmapNearestFilter: 2, RepeatWrapping: 3,
  AdditiveBlending: 4, DoubleSide: 5,
};

/* Faux contexte 2D : il ACCEPTE tout ce dont paint.js se sert et REFUSE le
   reste. Le refus est le contrôle, pas une limitation — si quelqu'un glisse
   un dégradé ou un arc dans une texture, l'outil casse au lieu de dessiner
   silencieusement autre chose que le jeu. Même principe que
   lib-sprite-canvas.mjs côté ferme. */
function fakeCtx() {
  const ok = new Set(["fillRect", "clearRect"]);
  return new Proxy({ fillStyle: "", globalAlpha: 1 }, {
    get(t, k) {
      if (k in t) return t[k];
      if (ok.has(k)) return () => {};
      throw new Error("paint.js utilise " + String(k) + " : interdit dans une texture du labyrinthe");
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

global.window = { THREE: FakeTHREE, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1, addEventListener() {} };
global.document = { createElement: () => ({ width: 0, height: 0, getContext: fakeCtx }) };

const G = load(["js/config.js", "js/maze.js", "js/rules.js", "js/paint.js", "js/world.js"]);
const { CFG, Maze, Rules, World } = G;

let fails = 0;
function check(name, cond, extra) {
  console.log(`${cond ? "  OK  " : "ÉCHEC "} ${name}${extra ? "  " + extra : ""}`);
  if (!cond) fails++;
}

const SEEDS = [1, 12345, 777777, 42424242];
for (const seed of SEEDS) {
  created = 0; meshes = 0;
  const m = Maze.generate(CFG, seed);
  const st = Rules.create(CFG, m, seed);
  World.init(CFG, m, st, { }, { shirt: 0x3f7fd4, pants: 0x454f66, hair: 0x5a3a1e, skin: 0xf0c8a0, gender: "m" });
  const built = meshes;
  // 300 images, avec un joueur qui avance : les branches « en mouvement »,
  // « flamme basse » et « traqueur éveillé » doivent toutes être traversées.
  for (let i = 0; i < 300; i++) {
    Rules.step(st, 1 / 60, { fwd: 1, turn: i % 90 === 0 ? 1 : 0, strafe: 0, run: i > 150 });
    World.sync(st, i * 16.7);
    if (st.status === "falling") World.fallStep(st, 1 / 60);
  }
  check(`graine ${String(seed).padEnd(9)} : scène construite et 300 images rendues`, true,
    `${built} maillages, ${created} objets`);
  check(`graine ${String(seed).padEnd(9)} : budget de maillages sous 2000`, built < 2000, `${built}`);
}

check("les quatre découpes de flamme sont créées", seen.has("Basic"));
check("aucune texture n'a utilisé de dégradé, d'arc ou de tracé", true);

console.log(fails ? `\n${fails} ÉCHEC(S)\n` : "\nTout est passé.\n");
console.log(`Ce script NE prouve RIEN de l'aspect : le faux contexte 2D accepte
n'importe quel fillRect. Il prouve que le rendu s'exécute et que le budget
d'objets tient. Pour l'aspect, il faut regarder — et jouer.\n`);
process.exit(fails ? 1 : 0);
