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
/* ZIP 399 — on COMPTE les libérations. Avant ce zip il n'y avait aucun
   `dispose()` dans world.js : chaque nouvelle partie laissait un dédale complet
   sur le GPU. Un compteur qui reste à zéro à la deuxième construction est le
   signe que la fuite est revenue. */
let disposed = 0;
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
    dispose() { disposed++; },
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
    // `autoClear` et `clearDepth` : la seconde passe du modèle de vue (397).
    return { setSize() {}, setPixelRatio() {}, render() {}, clearDepth() {},
             autoClear: true, domElement: {} };
  },
  Fog: function (c, n, f) { return { color: c, near: n, far: f }; },
  Color: function (c) { return { c }; },
  BoxGeometry: function () { return node("BoxGeometry"); },
  SphereGeometry: function () { return node("SphereGeometry"); },
  HemisphereLight: function () { return node("HemisphereLight"); },
  PlaneGeometry: function () { return node("PlaneGeometry"); },
  CylinderGeometry: function () { return node("CylinderGeometry"); },
  /* Zip 396 : la rotonde. Un anneau pour son pourtour, des cylindres pour ses
     gradins. Le faux Three.js doit connaître EXACTEMENT ce que le vrai code
     appelle — une classe manquante ici ne signale pas une erreur du jeu, elle
     fabrique une fausse alerte, ce qui est pire. */
  RingGeometry: function () { return node("RingGeometry"); },
  /* ⚠️ ZIP 405 — CircleGeometry, ET LE FAUX A EU TORT CETTE FOIS. La règle
     posée aux 399 et 400 est que « quand world.js jette dans un outil, c'est en
     général l'outil qui a raison » : deux faux Three.js avaient alors mis le
     doigt sur de vrais défauts (color.setHex, clone()). Ici, non.
     CircleGeometry existe bel et bien dans la r128, la rotonde en a besoin pour
     sa terrasse du fond (un disque, là où les deux autres sont des anneaux), et
     le faux ne la connaissait pas parce que personne n'en avait eu besoin
     jusqu'ici. « En général » n'est pas « toujours », et la façon de trancher
     est la même dans les deux sens : aller lire ce que la r128 expose. */
  CircleGeometry: function () { return node("CircleGeometry"); },
  OctahedronGeometry: function () { return node("OctahedronGeometry"); },
  MeshLambertMaterial: function (o) { return Object.assign(node("Lambert"), o || {}); },
  MeshBasicMaterial: function (o) { return Object.assign(node("Basic"), o || {}); },
  /* ⚠️ ZIP 397 — Phong est OBLIGATOIRE ici, et pas par confort. Dans la r128,
     MeshLambertMaterial n'a pas de `bumpMap` : il l'ignore SILENCIEUSEMENT.
     La pierre du 397 y aurait donc perdu tout son relief sans qu'aucune erreur
     ne soit levée — c'est-à-dire le pire cas possible, celui où le rendu est
     faux et où rien ne le dit. world.js utilise Phong (brillance 0, spéculaire
     noir = un Lambert avec du relief) ; le faux Three.js doit le connaître,
     sinon cet outil fabrique une fausse alerte au lieu de mesurer le jeu. */
  MeshPhongMaterial: function (o) { return Object.assign(node("Phong"), o || {}); },
  AmbientLight: function () { return node("AmbientLight"); },
  /* ⚠️ ZIP 399 — `color.setHex` EST OBLIGATOIRE ICI. Le groupe de lumières
     réattribue chaque créneau du pool à un émetteur différent d'une image à
     l'autre : la couleur d'une PointLight n'est donc plus posée une fois pour
     toutes à la construction, elle change en cours de partie. Sans ce champ,
     world.js jette à la première image — ce qui est très exactement le
     contrôle voulu, et c'est comme ça que cet outil a été utile au 399. */
  PointLight: function () {
    const n = node("PointLight");
    n.distance = 0; n.intensity = 0;
    n.color = { hex: 0, setHex(h) { this.hex = h; } };
    return n;
  },
  CanvasTexture: function () {
    // `clone()` : la densité de texels constante du 397 clone la texture par
    // taille de mur pour lui donner sa propre répétition (l'image, elle, est
    // partagée). Un clone qui ne rendrait pas d'objet ferait échouer world.js
    // ici et nulle part ailleurs.
    const t = { magFilter: 0, minFilter: 0, wrapS: 0, wrapT: 0, needsUpdate: false,
                dispose() { disposed++; },
                offset: { x: 0, y: 0 }, repeat: { x: 1, y: 1, set(a, b) { this.x = a; this.y = b; } } };
    t.clone = function () { return FakeTHREE.CanvasTexture(); };
    return t;
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

const G = load(["js/config.js", "js/maze.js", "js/rules.js", "js/paint.js", "js/rig.js", "js/world.js"]);
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
    Rules.step(st, 1 / CFG.SIM_HZ, { fwd: 1, turn: i % 45 === 0 ? 1 : 0, strafe: 0, run: i > 150 });
    World.snapPrev(st);
    World.sync(st, i * 16.7, (i % 2) / 2);
    if (st.status === "falling") World.fallStep(st, 1 / CFG.SIM_HZ);
  }
  check(`graine ${String(seed).padEnd(9)} : scène construite et 300 images rendues`, true,
    `${built} maillages, ${created} objets`);
  /* ⚠️ PLAFOND RELEVÉ DE 2 000 À 6 000 AU 394, et c'est une DÉCISION, pas un
     ajustement de confort. Le décor demandé par Guillaume (torches murales,
     poutres, plafond partiel, trous déchiquetés en sous-dalles) triple le
     nombre de volumes. On compare donc désormais au zip PRÉCÉDENT plutôt qu'à
     un idéal — règle du zip 379 : « tout contrôle qui s'applique à de l'art
     préexistant doit comparer à l'état d'avant, jamais à un idéal ».
     Repère : 393 = ~1 480 maillages, 394 = ~4 500. Si ce nombre double encore
     sans qu'on ait ajouté de décor, c'est qu'une collection n'est pas remise à
     zéro entre deux parties — c'est exactement le défaut trouvé au 393. */
  check(`graine ${String(seed).padEnd(9)} : budget de maillages sous 6000`, built < 6000, `${built}`);
}

/* ⚠️ ZIP 399 — LE CONTRÔLE QUI MANQUAIT. Les quatre graines ci-dessus
   construisent quatre mondes d'affilée : à partir du deuxième, init() doit
   avoir rendu le précédent. On ne vérifie pas un nombre exact (il dépend du
   dédale), on vérifie qu'il n'est PAS NUL — c'est la différence entre « on
   libère » et « on ne libère pas », et c'est la seule qui compte. */
check("le monde précédent est libéré à chaque nouvelle partie", disposed > 1000, `${disposed} objets rendus au GPU`);
check("les quatre découpes de flamme sont créées", seen.has("Basic"));
check("aucune texture n'a utilisé de dégradé, d'arc ou de tracé", true);

console.log(fails ? `\n${fails} ÉCHEC(S)\n` : "\nTout est passé.\n");
console.log(`Ce script NE prouve RIEN de l'aspect : le faux contexte 2D accepte
n'importe quel fillRect. Il prouve que le rendu s'exécute et que le budget
d'objets tient. Pour l'aspect, il faut regarder — et jouer.\n`);
process.exit(fails ? 1 : 0);
