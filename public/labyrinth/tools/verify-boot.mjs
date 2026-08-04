/* =============================================================================
   verify-boot.mjs — game.js EXÉCUTÉ, du chargement à la seconde partie.
                                                            (NEUF AU ZIP 399)
   -----------------------------------------------------------------------------
   ⚠️ POURQUOI IL EXISTE : game.js ÉTAIT LE SEUL FICHIER DU JEU QU'AUCUN OUTIL
   NE FAISAIT TOURNER. smoke-render.mjs exécute world.js, check-strings.mjs
   exécute ui.js, lib-play.mjs exécute rules.js et maze.js, verify-rig.mjs
   exécute rig.js. La machine à états, elle, n'avait jamais été jouée par une
   machine — et c'est là que dormait le défaut le plus cher du 399 :

     boot() construisait un labyrinthe pour l'écran-titre, avec un commentaire
     expliquant depuis le 393 que c'était pour que « la première image d'une
     partie n'ait plus à payer la construction de 900 murs » ; et start()
     rappelait newRun() SANS CONDITION. Tout était donc payé deux fois —
     génération, vingt-six textures, 3 465 maillages, et surtout la compilation
     de shaders à 123 lumières — dont une fois pile au moment du clic sur
     « Entrer ». L'optimisation était écrite, commentée, et défaite trois
     fonctions plus bas. Six zips l'ont recopiée sans la voir.

   ⚠️ IL COMPTE, IL NE RELIT PAS. Il ne cherche pas `if (!freshMaze)` dans le
   source — un contrôle qui partage la convention du code qu'il vérifie ne
   vérifie rien (leçon du 394). Il compte les SCÈNES et les RENDERERS créés en
   jouant la vraie séquence : chargement, écran-titre, clic sur « Entrer »,
   abandon, retour, seconde partie. Deux mondes doivent être bâtis en tout, et
   un seul renderer pour la vie de la page.

   ⚠️ SON FAUX CONTEXTE 2D EST PERMISSIF, CONTRAIREMENT À CELUI DE
   smoke-render.mjs, et c'est délibéré : là-bas, refuser tout sauf `fillRect`
   EST le contrôle (aucune texture ne doit utiliser de dégradé) ; ici on teste
   la machine à états, et la minicarte a parfaitement le droit de tracer des
   traits. Un outil doit être strict sur ce qu'il mesure et large sur le reste.

   ⚠️ CE QU'IL NE PROUVE PAS : rien du rendu, rien de l'aspect, et surtout
   aucune vitesse — il n'y a pas de GPU dans node.

   Usage :  node tools/verify-boot.mjs
   ========================================================================== */

import { load } from "./lib-play.mjs";

let scenes = 0, renderers = 0, disposes = 0, released = 0;

function V3() { return { x: 0, y: 0, z: 0, set(a, b, c) { this.x = a; this.y = b; this.z = c; return this; } }; }
function node(kind) {
  return { kind, position: V3(), rotation: V3(), scale: V3(), visible: true,
           children: [], userData: {}, material: null, geometry: null,
           dispose() { disposes++; }, add(c) { this.children.push(c); },
           remove() {}, lookAt() {}, updateProjectionMatrix() {} };
}
const T = {
  /* ⚠️ ON COMPTE LES SCÈNES, ET C'EST LA MESURE LA PLUS SÛRE DISPONIBLE ICI.
     World.init() crée exactement deux Scene : le monde et celle du modèle de
     vue. Un monde bâti = deux scènes, sans exception et sans autre chemin. */
  Scene: function () { scenes++; const n = node("Scene"); n.fog = null; n.background = null; return n; },
  Group: function () { return node("Group"); },
  Mesh: function (g, m) { const n = node("Mesh"); n.geometry = g; n.material = m; return n; },
  PerspectiveCamera: function () { const n = node("Cam"); n.aspect = 1; return n; },
  WebGLRenderer: function () {
    renderers++;
    return { setSize() {}, setPixelRatio() {}, render() {}, clearDepth() {},
             autoClear: true, domElement: {}, renderLists: { dispose() {} } };
  },
  Fog: function (c, n, f) { return { color: c, near: n, far: f }; },
  Color: function (c) { return { c }; },
  BoxGeometry: function () { return node("G"); }, SphereGeometry: function () { return node("G"); },
  PlaneGeometry: function () { return node("G"); }, CylinderGeometry: function () { return node("G"); },
  RingGeometry: function () { return node("G"); }, OctahedronGeometry: function () { return node("G"); },
  // Zip 405 : la terrasse du fond de la rotonde est un disque. Voir la note de
  // smoke-render.mjs — ici le faux Three.js avait un trou, pas le jeu.
  CircleGeometry: function () { return node("G"); },
  HemisphereLight: function () { return node("L"); }, AmbientLight: function () { return node("L"); },
  PointLight: function () { const n = node("PointLight"); n.distance = 0; n.intensity = 0;
                            n.color = { setHex() {} }; return n; },
  MeshLambertMaterial: function (o) { return Object.assign(node("M"), o || {}); },
  MeshBasicMaterial: function (o) { return Object.assign(node("M"), o || {}); },
  MeshPhongMaterial: function (o) { return Object.assign(node("M"), o || {}); },
  CanvasTexture: function () {
    const t = { magFilter: 0, minFilter: 0, wrapS: 0, wrapT: 0, needsUpdate: false, dispose() { disposes++; },
                offset: { x: 0, y: 0 }, repeat: { x: 1, y: 1, set(a, b) { this.x = a; this.y = b; } } };
    t.clone = function () { return T.CanvasTexture(); };
    return t;
  },
  NearestFilter: 1, NearestMipmapNearestFilter: 2, RepeatWrapping: 3,
  AdditiveBlending: 4, DoubleSide: 5,
};

const permissive2D = () => new Proxy({ fillStyle: "", strokeStyle: "", lineWidth: 1, font: "",
                                       globalAlpha: 1, textAlign: "", textBaseline: "" }, {
  get(t, k) { return k in t ? t[k] : () => {}; },
  set(t, k, v) { t[k] = v; return true; },
});

const handlers = new Map(), els = new Map(), winHandlers = new Map();
let rafQueue = [];
function el(id) {
  const o = {
    id, textContent: "", innerHTML: "", style: {}, className: "", width: 220, height: 220,
    /* ⚠️ LE STUB RETIENT MAINTENANT CE QUI EST MONTRÉ (417). Jusqu'ici
       `classList.toggle` ne faisait rien du tout : l'outil exécutait bien tout
       game.js, mais il ne pouvait rien dire de CE QUE LE JOUEUR VOIT. C'était
       suffisant tant qu'on ne vérifiait que la construction du monde ; ça ne
       l'est plus depuis que le mur de chantier décide quel panneau apparaît.
       Un mot-clé retenu, et le banc d'essai sait enfin répondre à « le
       labyrinthe est-il fermé au public ? ». */
    visible: false,
    armed: false,
    classList: {
      toggle(c, on) { if (c === "visible") o.visible = !!on; },
      add(c) { if (c === "armed") o.armed = true; if (c === "visible") o.visible = true; },
      remove(c) { if (c === "armed") o.armed = false; if (c === "visible") o.visible = false; },
    },
    appendChild() {}, getContext: permissive2D,
    addEventListener(type, fn) {
      const k = id + ":" + type;
      if (!handlers.has(k)) handlers.set(k, []);
      handlers.get(k).push(fn);
    },
    getAttribute() { return "med"; },
  };
  return o;
}
const click = (id) => { for (const fn of handlers.get(id + ":click") || []) fn({}); };
const fireWin = (t) => { for (const fn of winHandlers.get(t) || []) fn({}); };

global.window = {
  THREE: T, innerWidth: 1440, innerHeight: 900, devicePixelRatio: 2,
  addEventListener(t, fn) { if (!winHandlers.has(t)) winHandlers.set(t, []); winHandlers.get(t).push(fn); },
  /* ⚠️ AJOUTÉ AU 417, ET L'OUBLI ÉTAIT UN PLANTAGE SEC. `LabGate` se retire
     lui-même de `window` une fois le code accepté — un écouteur de clavier qui
     survivrait à son utilité est exactement le genre de résidu qu'on ne
     retrouve plus. Le stub n'avait que `addEventListener`, parce que rien du
     jeu n'avait jamais eu besoin de se désabonner. Un banc d'essai n'imite que
     ce dont on s'est servi jusque-là ; il se complète en même temps qu'on
     ajoute une capacité, jamais après. */
  removeEventListener(t, fn) {
    const a = winHandlers.get(t); if (!a) return;
    const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1);
  },
};
global.document = {
  getElementById(i) { if (!els.has(i)) els.set(i, el(i)); return els.get(i); },
  createElement() { return el("tmp"); },
  addEventListener() {},
  exitPointerLock() { released++; },
  pointerLockElement: null,
};

const G = load(
  ["js/strings.js", "js/config.js", "js/maze.js", "js/rules.js", "js/paint.js",
   "js/rig.js", "js/input.js", "js/world.js", "js/ui.js", "js/game.js"],
  {
    requestAnimationFrame(fn) { rafQueue.push(fn); return rafQueue.length; },
    setTimeout() { return 0; },       // l'écran de victoire : on ne l'attend pas
    localStorage: { getItem: () => null, setItem() {} },
    /* ⚠️ LA SESSION EST FOURNIE, ET VIDE. Sans elle, `LabGate.unlocked()`
       lèverait une ReferenceError attrapée par son propre `try` et rendrait
       « verrouillé » — le bon résultat, mais pour la mauvaise raison, et l'on
       ne pourrait alors pas tester le DÉVERROUILLAGE. Un stub qui donne
       accidentellement la bonne réponse est un stub qui ment. */
    sessionStorage: (() => {
      const m = new Map();
      return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
    })(),
    /* Le pont vers la ferme, réduit à ce que game.js lui demande. Son rappel
       part TOUT DE SUITE, comme la ferme le fait en envoyant la tenue : c'est
       ce chemin-là qui construisait le monde une fois de trop avant le 396. */
    Bridge: {
      embedded: false, lang: "fr", externalBest: null,
      skin: { shirt: 1, pants: 2, hair: 3, skin: 4, gender: "m" },
      init(cb) { cb(); }, exit() {}, won() {}, over() {},
    },
  });

let fails = 0;
const check = (n, c, x) => { console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  " + x : ""}`); if (!c) fails++; };
const worlds = () => scenes / 2;
function frames(n, t0) {
  for (let i = 0; i < n; i++) {
    const q = rafQueue; rafQueue = [];
    for (const fn of q) fn(t0 + i * 16.7);
  }
}

console.log("\n=== game.js, du chargement à la seconde partie ===\n");

fireWin("load");                       // boot()
const afterBoot = worlds();
frames(5, 1000);
check("le chargement bâtit UN labyrinthe pour l'écran-titre", afterBoot === 1, `${afterBoot}`);

/* ══════════════════════════════════════════════════════════════════════════════
   LE MUR DE CHANTIER (417) — le jeu est-il vraiment fermé, et s'ouvre-t-il ?
   ──────────────────────────────────────────────────────────────────────────────
   ⚠️ DEUX QUESTIONS, ET LA PREMIÈRE COMPTE PLUS QUE LA SECONDE. Un mur qui
   refuse de s'ouvrir se remarque en trois secondes (on tape le code, rien ne se
   passe, on va lire le fichier). Un mur qui NE SE FERME PAS ne se remarque
   jamais : la page s'ouvre normalement chez celui qui l'a déjà déverrouillé
   dans son onglet, et c'est le public — qui, lui, n'a rien demandé — qui se
   retrouve devant un jeu inachevé. On vérifie donc d'abord la fermeture.

   ⚠️ ET ON TAPE LE VRAI CODE, sur les vrais écouteurs de `window`, plutôt que
   d'appeler `LabGate` directement. C'est la seule façon de couvrir ce qui peut
   réellement casser : la phase de capture, le test de `e.code`, la double
   pression, et la fenêtre de temps. Appeler la fonction interne testerait la
   partie du code qui n'a jamais de raison de mal marcher.
   ══════════════════════════════════════════════════════════════════════════ */
{
  /* ⚠️ `document.getElementById` ET NON `els.get` : le panneau du titre n'est
     JAMAIS touché tant que le mur est debout — personne n'appelle
     `UI.show("title")` — il n'existe donc pas encore dans la table du stub.
     Le lire avec `els.get` rendait `undefined`, et le contrôle échouait en
     annonçant « titre caché », ce qui était vrai et n'était pas la question.
     Un élément que personne n'a montré n'est pas visible : c'est bien ce que
     `getElementById` fabrique ici, avec `visible: false`. */
  const panel = document.getElementById("construction");
  const title = document.getElementById("title");
  check("⚠️ le labyrinthe est FERMÉ au public : c'est le mur qu'on voit, pas le titre",
    panel.visible && !title.visible,
    `mur ${panel.visible ? "visible" : "caché"}, titre ${title.visible ? "VISIBLE" : "caché"}`);

  const key = (extra) => Object.assign({ code: "KeyX", shiftKey: true, metaKey: true,
    preventDefault() {}, stopPropagation() {} }, extra || {});
  const press = (e) => { for (const fn of winHandlers.get("keydown") || []) fn(e); };

  // Une touche qui n'est pas le code ne doit rien ouvrir.
  press(key({ code: "KeyZ" }));
  press(key({ shiftKey: false }));
  press(key({ metaKey: false, ctrlKey: false }));
  check("... et il ne s'ouvre pas sur n'importe quelle touche",
    panel.visible, panel.visible ? "" : "le mur est tombé sans le bon raccourci");

  // ⚠️ UNE SEULE pression ne doit rien ouvrir non plus — c'est toute la raison
  // d'être de la double pression : un raccourci unique part par accident.
  press(key());
  check("... ni sur UNE SEULE pression du bon raccourci",
    panel.visible, panel.visible ? `halo d'accusé de réception ${panel.armed ? "allumé" : "ÉTEINT"}` : "le mur est tombé trop tôt");
  check("... mais la première pression accuse réception (le halo discret)", panel.armed);

  // La seconde, dans la fenêtre : le mur tombe.
  press(key());
  check("⚠️⚠️ DEUX pressions de ⌘⇧X ouvrent le labyrinthe",
    !panel.visible && title.visible,
    `mur ${panel.visible ? "encore là" : "tombé"}, titre ${title.visible ? "affiché" : "TOUJOURS CACHÉ"}`);
}


click("btnStart");                     // « Entrer »
frames(30, 2000);
check("⚠️ « Entrer » NE reconstruit PAS le labyrinthe de l'écran-titre",
      worlds() === 1, `${worlds()} monde(s) bâti(s) en tout`);

click("btnQuit");                      // abandon → écran de fin
click("btnBack");                      // retour au titre
frames(5, 5000);
check("l'abandon ne bâtit rien non plus", worlds() === 1, `${worlds()}`);

click("btnStart");                     // seconde partie
frames(30, 6000);
check("la seconde partie, elle, a bien un labyrinthe NEUF",
      worlds() === 2, `${worlds()} mondes`);

check("⚠️ UN SEUL WebGLRenderer pour toute la vie de la page",
      renderers === 1, `${renderers} créé(s)`);
check("le monde remplacé a été rendu au GPU", disposes > 500, `${disposes} objets libérés`);
check("le pool de lumières est à la taille du niveau",
      G.World.perf.pool === G.CFG.QUAL[G.World.quality].lights,
      `${G.World.perf.pool} lampes, niveau ${G.World.quality}`);

/* Le filet de la souris : on n'attend pas qu'il se déclenche tout seul, on
   fabrique quatre images d'une seconde. Le pointeur doit être rendu. */
const before = released;
click("btnStart");
for (let i = 0; i < 14; i++) { const q = rafQueue; rafQueue = []; for (const fn of q) fn(20000 + i * 1000); }
check("⚠️ quatre images effondrées rendent la souris au joueur",
      released > before, `${released - before} relâchement(s)`);

console.log(fails ? `\n${fails} ÉCHEC(S)\n` : "\nTout est passé.\n");
console.log(`Ce script ne prouve RIEN du rendu ni de l'aspect, et surtout aucune
vitesse : il n'y a pas de GPU dans node. Il prouve que la machine à états ne
construit le monde que quand il le faut, qu'elle n'ouvre qu'un contexte de
rendu, et qu'elle sait rendre la souris quand le jeu se fige.\n`);
process.exit(fails ? 1 : 0);
