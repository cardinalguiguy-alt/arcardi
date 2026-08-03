/* =============================================================================
   preview-rotonde.mjs — LA COUPE DE LA ROTONDE, EN PNG.  (zip 405)
   -----------------------------------------------------------------------------
   ⚠️ POURQUOI CET OUTIL EXISTE, ET IL RÉPARE UN TROU DANS LA BOÎTE À OUTILS.
   Le défaut du 404 — « au centre on s'enfonce un peu dans le sol » — est un
   écart entre DEUX HAUTEURS : celle du sol dessiné et celle du sol sur lequel
   Rules.groundY fait marcher le fermier. Aucun des dix-huit outils du
   labyrinthe ne pouvait le montrer :

     * preview-fps.mjs ne dessine que les murs et le dallage ordinaire — il
       ignore la rotonde entière, comme on peut le vérifier sur sa sortie ;
     * smoke-render.mjs et verify-perf.mjs COMPTENT des maillages, ils ne
       regardent jamais où ils sont ;
     * verify-rotonde.mjs le PROUVE, mais il rend un nombre. « 792 points sur
       1520 hors tolérance » est vrai et juste ; ce n'est pas une image.

   Et Guillaume juge à l'œil, très vite et très bien. Il lui faut donc une
   image. Celle-ci est une COUPE : le rayon en abscisse, la hauteur en ordonnée.
   Deux tracés se superposent :

     * en PIERRE CLAIRE, le sol DESSINÉ, reconstitué depuis les géométries que
       world.js pose réellement (même faux Three.js que verify-rotonde) ;
     * en VIOLET, le sol sur lequel on MARCHE, c'est-à-dire Rules.groundY.

   S'ils se superposent, la salle est juste. S'ils s'écartent, l'écart est
   exactement de combien on s'enfonce — et on le voit, on ne le déduit pas.

   Usage :  node tools/preview-rotonde.mjs [graine]
   Sortie :  tools/out/rotonde-coupe.png
   ========================================================================== */

import path from "path";
import { load, ROOT } from "./lib-play.mjs";
import { surface, writePNG } from "./lib-raster.mjs";

/* --- Faux Three.js qui garde les arguments : identique à verify-rotonde.mjs.
   ⚠️ RECOPIÉ ET NON PARTAGÉ, DÉLIBÉRÉMENT. Le mettre dans lib-play.mjs
   obligerait les quinze autres outils à charger une dépendance dont ils n'ont
   que faire, et « deux descriptions divergent » (387) ne s'applique pas ici :
   ce n'est pas une description du JEU, c'est un bouchon de test. S'il devait
   servir une troisième fois, alors il faudrait le sortir. */
function V3() { return { x: 0, y: 0, z: 0, set(a, b, c) { this.x = a; this.y = b; this.z = c; return this; } }; }
const MESHES = [];
function node(kind) {
  return { kind, dispose() {}, position: V3(), rotation: V3(), scale: V3(),
    visible: true, children: [], userData: {}, material: null, geometry: null,
    add(c) { this.children.push(c); }, lookAt() {}, updateProjectionMatrix() {} };
}
function geo(kind) { return function (...args) { const n = node(kind); n.args = args; return n; }; }
const F = {
  Scene: function () { const n = node("Scene"); n.fog = null; n.background = null; return n; },
  Group: function () { return node("Group"); },
  Mesh: function (g, m) { const n = node("Mesh"); n.geometry = g; n.material = m; MESHES.push(n); return n; },
  PerspectiveCamera: function () { const n = node("Camera"); n.aspect = 1; return n; },
  WebGLRenderer: function () {
    return { setSize() {}, setPixelRatio() {}, render() {}, dispose() {}, clearDepth() {},
      shadowMap: {}, outputEncoding: 0, setClearColor() {}, getContext: () => ({}),
      info: { render: {}, memory: {} }, autoClear: true, domElement: {} };
  },
  Fog: function (c, n, f) { return { color: c, near: n, far: f }; },
  Color: function (c) { return { c }; },
  BoxGeometry: geo("Box"), SphereGeometry: geo("Sphere"), PlaneGeometry: geo("Plane"),
  CylinderGeometry: geo("Cylinder"), RingGeometry: geo("Ring"), CircleGeometry: geo("Circle"),
  OctahedronGeometry: geo("Octa"),
  HemisphereLight: function () { return node("L"); },
  MeshLambertMaterial: function (o) { return Object.assign(node("Lambert"), o || {}); },
  MeshBasicMaterial: function (o) { return Object.assign(node("Basic"), o || {}); },
  MeshPhongMaterial: function (o) { return Object.assign(node("Phong"), o || {}); },
  AmbientLight: function () { return node("L"); },
  PointLight: function () {
    const n = node("PointLight"); n.distance = 0; n.intensity = 0;
    n.color = { hex: 0, setHex(h) { this.hex = h; } }; return n;
  },
  CanvasTexture: function () {
    const t = { magFilter: 0, minFilter: 0, wrapS: 0, wrapT: 0, needsUpdate: false, dispose() {},
      offset: { x: 0, y: 0 }, repeat: { x: 1, y: 1, set(a, b) { this.x = a; this.y = b; } } };
    t.clone = function () { return F.CanvasTexture(); }; return t;
  },
  NearestFilter: 1, NearestMipmapNearestFilter: 2, RepeatWrapping: 3,
  AdditiveBlending: 4, DoubleSide: 5,
};
function fakeCtx() {
  const okSet = new Set(["fillRect", "clearRect"]);
  return new Proxy({ fillStyle: "", globalAlpha: 1 }, {
    get(t, k) { if (k in t) return t[k]; if (okSet.has(k)) return () => {}; throw new Error("interdit : " + String(k)); },
    set(t, k, v) { t[k] = v; return true; },
  });
}
global.window = { THREE: F, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1, addEventListener() {} };
global.document = { createElement: () => ({ width: 0, height: 0, getContext: fakeCtx }) };

const { CFG, Maze, Rules, World } = load(
  ["js/config.js", "js/maze.js", "js/rules.js", "js/paint.js", "js/rig.js", "js/world.js"]);

const seed = Number(process.argv[2] || 4242);
const m = Maze.generate(CFG, seed);
const st = Rules.create(CFG, m, seed);
World.init(CFG, m, st, {}, { shirt: 0x3f7fd4, pants: 0x454f66, hair: 0x5a3a1e, skin: 0xf0c8a0, gender: "m" });

const R = m.rotunda, C = CFG.CELL;
const ccx = (R.x + R.w / 2) * C, ccz = (R.y + R.h / 2) * C;
const rad = (R.w * C) / 2 - CFG.WALL / 2;

const surfs = [];
for (const mesh of MESHES) {
  const g = mesh.geometry; if (!g || !g.args) continue;
  const p = mesh.position;
  if (Math.hypot(p.x - ccx, p.z - ccz) > rad + 4 || Math.abs(p.y) > 12) continue;
  if (g.kind === "Ring") surfs.push({ t: "r", a: g.args[0], b: g.args[1], y: p.y });
  else if (g.kind === "Circle") surfs.push({ t: "r", a: 0, b: g.args[0], y: p.y });
  else if (g.kind === "Box") surfs.push({ t: "b", w: g.args[0], h: g.args[1], d: g.args[2], x: p.x, y: p.y, z: p.z });
  else if (g.kind === "Cylinder" && g.args[5] !== true)
    surfs.push({ t: "r", a: 0, b: Math.max(g.args[0], g.args[1]), y: p.y + g.args[2] / 2 });
}
const topAt = (x, z) => {
  const d = Math.hypot(x - ccx, z - ccz);
  let top = -1e9;
  for (const s of surfs) {
    if (s.t === "r") { if (d >= s.a && d <= s.b) top = Math.max(top, s.y); }
    else if (Math.abs(x - s.x) <= s.w / 2 && Math.abs(z - s.z) <= s.d / 2) top = Math.max(top, s.y + s.h / 2);
  }
  return top;
};

/* --- LA COUPE. Deux bandes : à gauche la coupe HORS escalier (les gradins),
   à droite la coupe DANS l'escalier. Les deux ensemble, parce que la salle
   n'est pas la même selon qu'on descend par les marches ou par les gradins,
   et qu'un seul des deux tracés laisserait croire l'autre juste. */
const W = 1000, H = 520, PAD = 54;
const { ctx, px } = surface(W, H);
ctx.fillStyle = "#120c1c"; ctx.fillRect(0, 0, W, H);

const yMin = -CFG.ROTUNDA_RINGS * CFG.ROTUNDA_DROP - 1.4, yMax = 1.4;
const half = (W - PAD * 3) / 2;
const bands = [
  { x0: PAD, label: "coupe HORS escalier (les gradins)", zoff: rad * 0.55, xoff: 0 },
  { x0: PAD * 2 + half, label: "coupe DANS l'escalier", zoff: 0, xoff: 0 },
];
const sx = (b, d) => b.x0 + (d / rad) * half;
const sy = (yv) => H - PAD - ((yv - yMin) / (yMax - yMin)) * (H - PAD * 2);
const dot = (x, y, c, s = 3) => { ctx.fillStyle = c; ctx.fillRect(x - s / 2, y - s / 2, s, s); };

for (const b of bands) {
  // cadre
  ctx.fillStyle = "#241a33";
  ctx.fillRect(b.x0, PAD - 2, half, 2);
  ctx.fillRect(b.x0, H - PAD, half, 2);
  ctx.fillRect(b.x0, PAD, 2, H - PAD * 2);
  // repère du niveau 0
  ctx.fillStyle = "#3a2c50";
  ctx.fillRect(b.x0, sy(0), half, 1);
  for (let i = 0; i <= half; i++) {
    const d = (i / half) * rad;
    // le point de mesure : nettement à côté de l'escalier, ou sur son axe
    const px2 = b.zoff ? ccx + d : ccx;          // hors escalier : on s'écarte en X
    const pz2 = b.zoff ? ccz : ccz + d;          // dans l'escalier : la bande nord-sud
    const drawn = topAt(px2, pz2);
    const walk = Rules.groundY(CFG, m, px2, pz2);
    if (drawn > -1e8) dot(b.x0 + i, sy(drawn), "#c9b79a", 3);
    dot(b.x0 + i, sy(walk), "#a86ef0", 2);
  }
}

writePNG(path.join(ROOT, "tools/out/rotonde-coupe.png"), px, W, H);

/* --- et le chiffre, pour ceux qui préfèrent les chiffres --- */
/* ⚠️ ON SAUTE LES FRONTIÈRES DE TERRASSE, comme verify-rotonde.mjs, et pour la
   même raison : sur les 3 cm de ROTUNDA_LAP — le chevauchement volontaire — le
   pourtour recouvre le premier gradin, et « la surface la plus haute » y vaut
   celle d'AU-DESSUS. Mesurer là, c'est mesurer le recouvrement qu'on a mis
   exprès. Premier lancement de cet outil : il annonçait 1,170 unité d'écart et
   c'était CE ruban-là, large de trois centimètres. L'outil avait tort, la salle
   avait raison — et c'est exactement la question qu'il faut se poser en premier
   quand un contrôle sonne. */
const pit2 = rad - CFG.ROTUNDA_RIM;
const edges = [];
for (let i = 0; i <= CFG.ROTUNDA_RINGS; i++) edges.push(pit2 * (1 - i / CFG.ROTUNDA_RINGS));
let worst = 0, worstD = 0;
for (let i = 0; i <= 400; i++) {
  const d = (i / 400) * (pit2 - 0.6);
  if (edges.some(e => Math.abs(d - e) < 0.6)) continue;
  for (const [x, z] of [[ccx + d, ccz], [ccx, ccz + d]]) {
    if (Math.abs(x - ccx) < CFG.ROTUNDA_STAIR_W / 2 + 0.6 && z === ccz) continue;
    const drawn = topAt(x, z), walk = Rules.groundY(CFG, m, x, z);
    if (drawn > -1e8 && Math.abs(walk - drawn) > Math.abs(worst)) { worst = walk - drawn; worstD = d; }
  }
}
console.log(`\ntools/out/rotonde-coupe.png écrit  (graine ${seed})`);
console.log(`écart maximal sol marché / sol dessiné : ${worst.toFixed(3)} unité (à ${worstD.toFixed(1)} u du centre)`);
console.log(`
EN PIERRE CLAIRE : le sol DESSINÉ (ce que world.js pose réellement).
EN VIOLET        : le sol sur lequel on MARCHE (Rules.groundY).

Les deux tracés doivent se confondre. Quand le violet passe SOUS la pierre, le
fermier marche dans le sol — c'est le défaut du 404, et il valait 2,34 unités
au centre de la salle. Quand il passe au-dessus, il lévite.

⚠️ Ce n'est PAS une image du jeu : ni pierre, ni torches, ni lumière. C'est une
coupe. Elle dit que la salle a la bonne forme, jamais qu'elle est belle — pour
ça il faut une capture d'écran, et il n'y a que Guillaume qui puisse la faire.
`);
