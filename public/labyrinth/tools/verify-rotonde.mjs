/* =============================================================================
   verify-rotonde.mjs — LE SOL QU'ON VOIT EST LE SOL SUR LEQUEL ON MARCHE.
   (zip 405)
   -----------------------------------------------------------------------------
   Retour de Guillaume au 404 : « problème de remplissage des textures sur la
   rotonde : il y a des interstices où l'on voit le lac, et au centre on
   s'enfonce un peu dans le sol. »

   Deux reproches, deux causes, et AUCUNE des deux n'était un problème de
   texture. C'était de la géométrie — le genre de diagnostic qu'on ne pose
   qu'en regardant, et qu'aucune relecture ne donne, parce que chaque ligne
   prise séparément était juste.

     1. ON S'ENFONÇAIT PARCE QUE LES GRADINS ÉTAIENT DES CYLINDRES PLEINS.
        `new CylinderGeometry(r, r, 14, 40)` a des CHAPEAUX. Le premier gradin
        (rayon 20,75, dessus à −1,17) couvrait donc toute la fosse et masquait
        les deux autres : les « trois terrasses » n'en faisaient qu'une, plate.
        Pendant ce temps Rules.groundY — la fonction qui pose le fermier, les
        créatures et la caméra — descendait bien jusqu'à −3,51 au centre. On
        marchait donc jusqu'à 2,34 unités SOUS le sol visible.

     2. ON VOYAIT LE LAC PAR DEUX FENTES DIFFÉRENTES.
        (a) le pourtour était un 44-gone, les gradins des 40-gones, inscrits
            dans les mêmes cercles : deux polygones de pas différents ne se
            touchent qu'en de rares points, et laissent ailleurs jusqu'à 11 mm
            de vide — sous lequel il n'y a rien, le lac étant à −9 ;
        (b) le pourtour s'arrêtait à rad + 0,6 = 28,35 alors que le dallage
            ordinaire commence au bord de la cellule de rotonde, à 28,75 : il
            manquait 40 cm de sol AUX QUATRE PORTES, c'est-à-dire pile là où
            l'on entre.

   ⚠️ CE SCRIPT N'INTERROGE PAS LE TEXTE DE world.js, IL EXÉCUTE SON DESSIN.
   C'est la seule façon d'attraper ce défaut-là : le mot « CylinderGeometry »
   n'a jamais rien eu de suspect. On installe donc un faux Three.js qui GARDE
   les arguments de chaque géométrie, on construit la salle pour de bon, puis
   on reconstitue « quelle est la surface la plus haute dessinée en (x, z) » et
   on la compare à Rules.groundY, point par point. Un écart, c'est un fermier
   dans la pierre ou un fermier en lévitation.

   ⚠️ ÉCRIT AVANT LA CORRECTION, ET IL A ÉCHOUÉ : sur le code du 404, 561 des
   561 points de mesure de la fosse tombaient à 1,17 ou 2,34 unités sous le sol
   dessiné, et les deux contrôles de fente sonnaient. C'est la leçon du 404 —
   un contrôle qui passe du premier coup sur du code non corrigé est FAUX.
   ========================================================================== */

import { load } from "./lib-play.mjs";

/* -------------------------------------------------------------------------
   FAUX THREE.JS QUI SE SOUVIENT. Même squelette que smoke-render.mjs, à une
   différence près, et c'est toute la valeur de cet outil : chaque géométrie
   GARDE ses arguments, et chaque Mesh garde sa géométrie et sa position.
   ---------------------------------------------------------------------- */
function V3() { return { x: 0, y: 0, z: 0, set(a, b, c) { this.x = a; this.y = b; this.z = c; return this; } }; }
const MESHES = [];
function node(kind) {
  return {
    kind, dispose() {},
    position: V3(), rotation: V3(), scale: V3(),
    visible: true, children: [], userData: {}, material: null, geometry: null,
    add(c) { this.children.push(c); }, lookAt() {}, updateProjectionMatrix() {},
  };
}
/* ⚠️ UNE FONCTION `function`, PAS UNE FLÉCHÉE, et ça a coûté un premier
   lancement. world.js appelle `new THREE_.SphereGeometry(...)` ; une fonction
   fléchée n'est PAS un constructeur et `new` jette dessus. Le faux Three.js
   doit se laisser appeler exactement comme le vrai. */
function geo(kind) {
  return function (...args) { const n = node(kind); n.args = args; return n; };
}
const FakeTHREE = {
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
  HemisphereLight: function () { return node("HemisphereLight"); },
  MeshLambertMaterial: function (o) { return Object.assign(node("Lambert"), o || {}); },
  MeshBasicMaterial: function (o) { return Object.assign(node("Basic"), o || {}); },
  MeshPhongMaterial: function (o) { return Object.assign(node("Phong"), o || {}); },
  AmbientLight: function () { return node("AmbientLight"); },
  PointLight: function () {
    const n = node("PointLight");
    n.distance = 0; n.intensity = 0;
    n.color = { hex: 0, setHex(h) { this.hex = h; } };
    return n;
  },
  CanvasTexture: function () {
    const t = { magFilter: 0, minFilter: 0, wrapS: 0, wrapT: 0, needsUpdate: false, dispose() {},
                offset: { x: 0, y: 0 }, repeat: { x: 1, y: 1, set(a, b) { this.x = a; this.y = b; } } };
    t.clone = function () { return FakeTHREE.CanvasTexture(); };
    return t;
  },
  NearestFilter: 1, NearestMipmapNearestFilter: 2, RepeatWrapping: 3,
  AdditiveBlending: 4, DoubleSide: 5,
};
function fakeCtx() {
  const ok = new Set(["fillRect", "clearRect"]);
  return new Proxy({ fillStyle: "", globalAlpha: 1 }, {
    get(t, k) { if (k in t) return t[k]; if (ok.has(k)) return () => {}; throw new Error("interdit : " + String(k)); },
    set(t, k, v) { t[k] = v; return true; },
  });
}
global.window = { THREE: FakeTHREE, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1, addEventListener() {} };
global.document = { createElement: () => ({ width: 0, height: 0, getContext: fakeCtx }) };

const { CFG, Maze, Rules, World } = load(
  ["js/config.js", "js/maze.js", "js/rules.js", "js/paint.js", "js/rig.js", "js/world.js"]);

let pass = 0, fail = 0;
const ok = (cond, label, detail = "") => {
  if (cond) { pass++; console.log(`  OK   ${label}${detail ? "  " + detail : ""}`); }
  else { fail++; console.log(`  ÉCHEC ${label}${detail ? "  " + detail : ""}`); }
};

console.log("\n=== verify-rotonde.mjs — le sol qu'on voit est celui sur lequel on marche ===\n");

const SEEDS = [4242, 7, 123456, 999];
let worstSink = 0, worstSinkSeed = 0, totalPts = 0, badPts = 0;
let minGapRing = 1e9;

for (const seed of SEEDS) {
  MESHES.length = 0;
  const m = Maze.generate(CFG, seed);
  const st = Rules.create(CFG, m, seed);
  World.init(CFG, m, st, {}, { shirt: 0x3f7fd4, pants: 0x454f66, hair: 0x5a3a1e, skin: 0xf0c8a0, gender: "m" });

  const R = m.rotunda;
  const C = CFG.CELL;
  const ccx = (R.x + R.w / 2) * C, ccz = (R.y + R.h / 2) * C;
  const rad = (R.w * C) / 2 - CFG.WALL / 2;
  const pit = rad - CFG.ROTUNDA_RIM;

  /* Les surfaces HORIZONTALES de la salle, telles que le dessin les a posées.
     ⚠️ On ne garde que ce qui a un dessus : un Ring, un Circle, le haut d'une
     Box. Un cylindre OUVERT n'en a pas — c'est précisément ce qui répare le
     défaut, donc c'est précisément ce qu'il faut savoir distinguer. */
  const surf = [];
  let cappedCyl = 0, openCyl = 0;
  for (const mesh of MESHES) {
    const g = mesh.geometry;
    if (!g || !g.args) continue;
    const p = mesh.position;
    const near = Math.hypot(p.x - ccx, p.z - ccz) < rad + 4 && Math.abs(p.y) < 12;
    if (!near) continue;
    if (g.kind === "Ring") surf.push({ type: "ring", rIn: g.args[0], rOut: g.args[1], y: p.y, seg: g.args[2] });
    else if (g.kind === "Circle") surf.push({ type: "ring", rIn: 0, rOut: g.args[0], y: p.y, seg: g.args[1] });
    else if (g.kind === "Box") surf.push({ type: "box", w: g.args[0], h: g.args[1], d: g.args[2],
                                           x: p.x, y: p.y, z: p.z });
    else if (g.kind === "Cylinder") {
      const open = g.args[5] === true;
      if (open) { openCyl++; surf.push({ type: "cylSide", r: g.args[0], seg: g.args[3] }); }
      else {
        cappedCyl++;
        surf.push({ type: "ring", rIn: 0, rOut: Math.max(g.args[0], g.args[1]),
                    y: p.y + g.args[2] / 2, seg: g.args[3] });
      }
    }
  }

  if (seed === SEEDS[0]) {
    /* 1. AUCUN CYLINDRE PLEIN NE SERT DE GRADIN. C'est la cause n°1, énoncée
          telle quelle : un chapeau de cylindre est un couvercle posé sur la
          salle. On tolère les cylindres pleins ailleurs (un fût, une colonne),
          d'où le test sur ceux qui sont CENTRÉS et LARGES. */
    const lids = MESHES.filter(x => x.geometry && x.geometry.kind === "Cylinder" &&
      x.geometry.args[5] !== true &&
      Math.hypot(x.position.x - ccx, x.position.z - ccz) < 1 &&
      Math.max(x.geometry.args[0], x.geometry.args[1]) > pit * 0.4);
    ok(lids.length === 0,
      "aucun gradin n'est un cylindre PLEIN (un chapeau = un couvercle sur la fosse)",
      `${lids.length} trouvé(s)`);
    ok(openCyl >= CFG.ROTUNDA_RINGS,
      "les contremarches sont des cylindres OUVERTS", `${openCyl} ouvert(s), ${cappedCyl} plein(s)`);

    /* 2. UN SEUL PAS DE DÉCOUPE POUR TOUS LES CERCLES DE LA SALLE. */
    const segs = new Set(surf.filter(s => s.type === "ring" || s.type === "cylSide")
      .map(s => s.seg).filter(s => typeof s === "number"));
    ok(segs.size === 1, "tous les cercles de la salle ont le MÊME pas de découpe",
      `pas trouvé(s) : ${[...segs].join(", ")}`);
    ok(segs.has(CFG.ROTUNDA_SEG), "et ce pas est ROTUNDA_SEG", `${CFG.ROTUNDA_SEG}`);

    /* 3. LE POURTOUR COUVRE LE SEUIL DES QUATRE PORTES. */
    const rim = surf.filter(s => s.type === "ring" && s.rOut > rad).sort((a, b) => b.rOut - a.rOut)[0];
    const doorway = (R.w * C) / 2;      // demi-côté du carré de rotonde
    ok(rim && rim.rOut >= doorway,
      "le pourtour atteint le bord de la cellule de rotonde (le seuil des portes)",
      rim ? `${rim.rOut.toFixed(2)} pour ${doorway.toFixed(2)} attendus` : "aucun pourtour trouvé");

    /* 4. LES ANNEAUX SE CHEVAUCHENT, DEUX À DEUX, SANS TROU. */
    const rings = surf.filter(s => s.type === "ring").sort((a, b) => b.rOut - a.rOut);
    for (let i = 0; i + 1 < rings.length; i++) {
      const gapR = rings[i].rIn - rings[i + 1].rOut;    // < 0 = ils se recouvrent
      if (rings[i + 1].rOut > 0.5) minGapRing = Math.min(minGapRing, -gapR);
    }
    ok(minGapRing >= 0,
      "deux anneaux voisins se recouvrent toujours (aucun trait de lac entre eux)",
      `recouvrement minimal ${minGapRing === 1e9 ? "n/a" : minGapRing.toFixed(3)} u`);
  }

  /* 5. LE CONTRÔLE CENTRAL : le dessus dessiné en (x, z) DOIT valoir groundY.
        On échantillonne la fosse en couronnes, en évitant les 0,4 unité de
        part et d'autre d'une frontière de terrasse — là, l'un ou l'autre a
        raison à un chevauchement près, et sanctionner ça reviendrait à
        mesurer l'arrondi plutôt que le jeu. */
  const topAt = (x, z) => {
    const d = Math.hypot(x - ccx, z - ccz);
    let top = -1e9;
    for (const s of surf) {
      if (s.type === "ring") { if (d >= s.rIn && d <= s.rOut) top = Math.max(top, s.y); }
      else if (s.type === "box") {
        if (Math.abs(x - s.x) <= s.w / 2 && Math.abs(z - s.z) <= s.d / 2)
          top = Math.max(top, s.y + s.h / 2);
      }
    }
    return top;
  };
  const edges = [];
  for (let i = 0; i <= CFG.ROTUNDA_RINGS; i++) edges.push(pit * (1 - i / CFG.ROTUNDA_RINGS));
  for (let ri = 1; ri < 34; ri++) {
    const d = (ri / 34) * (pit - 0.6);
    if (edges.some(e => Math.abs(d - e) < 0.6)) continue;
    for (let ai = 0; ai < 24; ai++) {
      const a = (ai / 24) * Math.PI * 2;
      const x = ccx + Math.cos(a) * d, z = ccz + Math.sin(a) * d;
      /* ⚠️ LA BANDE DE L'ESCALIER EST MESURÉE AUSSI, ET C'EST ELLE QUI A
         RAPPORTÉ LE TROISIÈME DÉFAUT DU CHANTIER. Le premier jet de ce
         contrôle sautait la volée — « marches fines, frontières partout » —
         et c'était une facilité. Une fois mesurée, elle a rendu 40 points à
         0,27 et 0,54 unité d'écart : Rules.groundY comptait la descente en
         DISTANCE AU CENTRE alors que les marches sont posées selon |z − ccz|.
         Sur l'axe de la volée les deux formules donnent le même résultat —
         c'est-à-dire précisément sur la ligne qu'on regarde quand on vérifie
         un escalier. Corrigé dans groundY ; la tolérance reste un peu plus
         large ici parce que les marches font 27 cm et qu'un point tombant pile
         sur une arête a le droit d'appartenir à l'une ou à l'autre. */
      const inStairs = Math.abs(x - ccx) < CFG.ROTUNDA_STAIR_W / 2 + 0.6;
      const tol = inStairs ? 0.15 : 0.12;
      const drawn = topAt(x, z);
      const walk = Rules.groundY(CFG, m, x, z);
      totalPts++;
      const sink = walk - drawn;       // < 0 : on marche SOUS le sol visible
      if (Math.abs(sink) > tol) {
        badPts++;
        if (Math.abs(sink) > Math.abs(worstSink)) { worstSink = sink; worstSinkSeed = seed; }
      }
    }
  }
}

ok(badPts === 0,
  "le sol DESSINÉ est à la hauteur du sol sur lequel on MARCHE, partout dans la fosse",
  `${badPts}/${totalPts} points hors tolérance` +
  (badPts ? `, pire écart ${worstSink.toFixed(2)} u (graine ${worstSinkSeed})` : ""));

console.log(`\n${fail === 0 ? "Tout est passé." : `${fail} contrôle(s) en échec.`}` +
  `  (${pass}/${pass + fail})\n`);
console.log(`Ce script ne dit RIEN de l'allure de la salle : ni si les gradins se
lisent, ni si la descente donne envie, ni si la pierre est belle. Il dit qu'on
ne marche plus dans le sol et qu'aucune fente n'ouvre sur le lac. Le reste se
regarde — tools/preview-fps.mjs — et se joue.\n`);
process.exit(fail === 0 ? 0 : 1);
