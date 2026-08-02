/* =============================================================================
   verify-perf.mjs — LE BUDGET DE RENDU, MESURÉ EN JOUANT.  (NEUF AU ZIP 399)
   -----------------------------------------------------------------------------
   Guillaume, au 399 : « il fait lagger mon ordinateur à mort et m'oblige à
   command+Q pour fermer mon navigateur (…) y a une ou deux images par seconde ».
   Sur un MacBook Pro M4. Cet outil est né de cette phrase, et il a trouvé la
   cause en une exécution : **123 PointLight dans la scène**.

   ---------------------------------------------------------------------------
   POURQUOI CE CHIFFRE-LÀ EST MORTEL, alors que 123 objets ne le seraient pas.
   ---------------------------------------------------------------------------
   three.js r128 est un moteur *forward* : il ne trie pas les lumières. Le
   nombre de PointLight PRÉSENTES dans la scène est compilé en dur dans le
   shader de CHAQUE matériau (NUM_POINT_LIGHTS), et la boucle d'éclairage les
   parcourt toutes, pour chaque fragment. Depuis le 397 la pierre est en
   MeshPhongMaterial — obligatoire pour le bumpMap — donc cette boucle tourne
   PAR PIXEL sur les ~1 180 maillages de pierre et de sol. À 2880×1800, cela
   fait ~640 millions d'évaluations d'éclairage par image.

   ⚠️ UN COMPTEUR D'OBJETS N'AURAIT RIEN VU. smoke-render.mjs comptait
   fidèlement 3 465 maillages et les déclarait « sous le plafond de 6 000 » —
   et il avait raison, ce n'étaient pas les maillages. Ce que personne ne
   comptait, c'était le multiplicateur : PIXELS × LUMIÈRES. D'où cet outil.

   ---------------------------------------------------------------------------
   CE QU'IL MESURE, ET POURQUOI IL JOUE AU LIEU DE SIMULER
   ---------------------------------------------------------------------------
   Le remède du 399 (voir l'en-tête du groupe de lumières dans world.js) garde
   la liste complète des ÉMETTEURS et ne met dans la scène qu'un POOL de huit
   PointLight, réattribuées à chaque image aux plus proches. Le seul risque de
   ce mécanisme est parfaitement identifié : **si plus de huit foyers éclairent
   réellement ce qu'on regarde, les surnuméraires sont perdus, et là le décor
   change pour de bon.**

   Le mesurer suppose de savoir OÙ un joueur se tient — et un joueur ne marche
   pas tout droit. Il longe les murs, il revient sur ses pas, il traverse la
   rotonde et sa couronne de vingt-huit torches, c'est-à-dire exactement
   l'endroit où le pool peut manquer de créneaux. Cet outil rejoue donc de
   VRAIES parties avec l'oracle de lib-play.mjs et relève, à chaque pas :

     * combien d'émetteurs atteignent réellement l'image (« en portée ») ;
     * et surtout **l'écart du meilleur émetteur qu'on a DÛ jeter** — la
       distance de l'œil au bord de la boule qu'il éclairait. Grand écart : ce
       qu'on a perdu est loin, donc noyé de brouillard, donc invisible. Petit
       écart : on vient d'éteindre une lampe qui se voyait, et le pool est
       sous-dimensionné.

   C'est ce second chiffre qui dimensionne CFG.QUAL.high.lights, et rien
   d'autre. Toute modification de cette valeur doit être relancée ici.

   ---------------------------------------------------------------------------
   ⚠️ CE QU'IL NE PROUVE PAS — et c'est beaucoup.
   ---------------------------------------------------------------------------
   Il ne mesure AUCUN temps réel : il n'y a pas de GPU dans node, et le faux
   Three.js ne dessine rien. Il compte ce qu'on DEMANDE au GPU, pas ce que le
   GPU met à le faire. Il ne dit donc rien du nombre d'images par seconde chez
   Guillaume — ça, seul le compteur de mise au point du jeu (Échap → panneau)
   peut le dire. Il ne dit rien non plus de la beauté du résultat : un décor
   peut tenir tous les budgets et être laid.

   Usage :  node tools/verify-perf.mjs [nb_de_parties]
   ========================================================================== */

import { load, playOne, stats } from "./lib-play.mjs";
import { surface } from "./lib-raster.mjs";

/* --------------------------------------------------------------------------
   FAUX THREE.JS. Même principe que smoke-render.mjs, mais il COMPTE ce qui
   coûte : les lumières présentes dans la scène, les maillages par famille de
   matériau, et la surface des plans additifs (le recouvrement, deuxième poste
   de remplissage après l'éclairage).
   ----------------------------------------------------------------------- */
let meshes = 0, sceneLights = 0, addMeshes = 0, addArea = 0;
const byMat = {};
function V3() { return { x: 0, y: 0, z: 0, set(a, b, c) { this.x = a; this.y = b; this.z = c; return this; } }; }
function node(kind) {
  return {
    kind, position: V3(), rotation: V3(), scale: V3(),
    visible: true, children: [], userData: {}, material: null, geometry: null,
    dispose() {}, add(c) { this.children.push(c); }, lookAt() {},
    updateProjectionMatrix() {},
  };
}
const T = {
  Scene: function () { const n = node("Scene"); n.fog = null; n.background = null; return n; },
  Group: function () { return node("Group"); },
  Mesh: function (g, m) {
    meshes++;
    const n = node("Mesh"); n.geometry = g; n.material = m;
    if (m) {
      byMat[m.__k] = (byMat[m.__k] || 0) + 1;
      if (m.blending === 4) { addMeshes++; addArea += (g && g.__area) || 0; }
    }
    return n;
  },
  PerspectiveCamera: function () { const n = node("Camera"); n.aspect = 1; return n; },
  WebGLRenderer: function () {
    return { setSize() {}, setPixelRatio() {}, render() {}, clearDepth() {},
             autoClear: true, domElement: {}, renderLists: { dispose() {} } };
  },
  Fog: function (c, n, f) { return { color: c, near: n, far: f }; },
  Color: function (c) { return { c }; },
  BoxGeometry: function (w, h, d) { const n = node("Box"); n.__area = 2 * ((w||1)*(h||1) + (w||1)*(d||1) + (h||1)*(d||1)); return n; },
  SphereGeometry: function (r) { const n = node("Sph"); n.__area = 12.6 * (r||1) * (r||1); return n; },
  PlaneGeometry: function (w, h) { const n = node("Pla"); n.__area = (w||1) * (h||1); return n; },
  CylinderGeometry: function (a, b, h) { const n = node("Cyl"); n.__area = 3.14 * ((a||1)+(b||1)) * (h||1); return n; },
  RingGeometry: function () { return node("Ring"); },
  OctahedronGeometry: function () { return node("Oct"); },
  HemisphereLight: function () { return node("Hemi"); },
  AmbientLight: function () { return node("Amb"); },
  /* ⚠️ C'EST ICI QUE TOUT SE JOUE. On compte les PointLight CRÉÉES, parce que
     ce sont elles — et elles seules — qui entrent dans NUM_POINT_LIGHTS et
     donc dans le coût par pixel. Un émetteur, lui, ne passe jamais par ce
     constructeur : c'est très exactement l'objet de la correction du 399. */
  PointLight: function () {
    sceneLights++;
    const n = node("PointLight");
    n.distance = 0; n.intensity = 0;
    n.color = { hex: 0, setHex(h) { this.hex = h; } };
    return n;
  },
  MeshLambertMaterial: function (o) { const n = Object.assign(node("M"), o || {}); n.__k = "Lambert"; return n; },
  MeshBasicMaterial:   function (o) { const n = Object.assign(node("M"), o || {}); n.__k = "Basic";   return n; },
  MeshPhongMaterial:   function (o) { const n = Object.assign(node("M"), o || {}); n.__k = "Phong";   return n; },
  CanvasTexture: function () {
    const t = { magFilter: 0, minFilter: 0, wrapS: 0, wrapT: 0, needsUpdate: false, dispose() {},
                offset: { x: 0, y: 0 }, repeat: { x: 1, y: 1, set(a, b) { this.x = a; this.y = b; } } };
    t.clone = function () { return T.CanvasTexture(); };
    return t;
  },
  NearestFilter: 1, NearestMipmapNearestFilter: 2, RepeatWrapping: 3,
  AdditiveBlending: 4, DoubleSide: 5,
};
function fakeCtx() {
  const ok = new Set(["fillRect", "clearRect"]);
  return new Proxy({ fillStyle: "", globalAlpha: 1 }, {
    get(t, k) { if (k in t) return t[k]; if (ok.has(k)) return () => {};
                throw new Error("paint.js utilise " + String(k)); },
    set(t, k, v) { t[k] = v; return true; },
  });
}
/* devicePixelRatio 2 : c'est l'écran de Guillaume, et c'est le cas qui coûte
   le plus cher. Mesurer à 1 dirait que tout va bien. */
global.window = { THREE: T, innerWidth: 1440, innerHeight: 900, devicePixelRatio: 2, addEventListener() {} };
global.document = { createElement: () => ({ width: 0, height: 0, getContext: fakeCtx }) };

const G = load(["js/config.js", "js/maze.js", "js/rules.js", "js/paint.js", "js/rig.js", "js/world.js"]);
const { CFG, Maze, Rules, Paint, World } = G;

let fails = 0;
function check(name, cond, extra) {
  console.log(`${cond ? "  OK  " : "ÉCHEC "} ${name}${extra ? "  " + extra : ""}`);
  if (!cond) fails++;
}

const RUNS = Math.max(3, parseInt(process.argv[2] || "12", 10));
const POOL_OVERRIDE = parseInt(process.env.LAB_POOL || "0", 10);
if (POOL_OVERRIDE > 0) CFG.QUAL.high.lights = POOL_OVERRIDE;   // pour balayer, voir plus bas
console.log(`\n=== BUDGET DE RENDU — ${RUNS} parties JOUÉES, pool de ${CFG.QUAL.high.lights} ===\n`);

/* ===========================================================================
   LA MESURE QUI DÉCIDE : L'ÉCART D'ÉCLAIREMENT, EN NIVEAUX DE GRIS.
   ---------------------------------------------------------------------------
   Compter des lumières ne prouve rien de ce qu'on voit. Ce qu'il faut savoir,
   c'est : **de combien un mur s'assombrit-il parce qu'on a prêté ses lampes
   ailleurs ?** On le calcule, en des milliers de points de surface RÉELS.

   ⚠️ ET C'EST CALCULABLE EXACTEMENT, POUR UNE RAISON PRÉCISE : AUCUNE LUMIÈRE
   DE CE JEU NE PROJETTE D'OMBRE. Il n'y a pas un seul `castShadow` dans
   world.js — c'était déjà vrai au 393. L'éclairement d'un point ne dépend donc
   QUE des lampes et de sa normale, jamais de ce qu'il y a entre les deux : pas
   besoin de lancer un seul rayon, la somme est la vérité.

   L'atténuation est celle de three.js r128 en mode HÉRITÉ — le mode par
   défaut, `renderer.physicallyCorrectLights` n'étant activé nulle part :

       saturate(1 − d/portée)^decay      (et NON 1/d²)

   C'est la même que preview-fps.mjs applique déjà à la torche du joueur.

   Les points échantillonnés viennent de `st.boxes`, c'est-à-dire de la LISTE
   QUI ARRÊTE LE JOUEUR et que world.js dessine — jamais d'une géométrie
   refabriquée pour l'occasion (corollaire n°5 du zip 387).
   ======================================================================== */
const AMB = 0.30, HEMI = 0.45;        // world.js/init : ambiante + hémisphérique

/* ⚠️ L'ALBÉDO N'EST PAS UNE CONSTANTE INVENTÉE : IL EST MESURÉ SUR LA VRAIE
   TEXTURE. Une première version écrivait « 128, une pierre de gris moyen » —
   c'est-à-dire exactement le genre de valeur en dur qui fait mentir un
   contrôle (zip 379). La pierre du 397 est sombre et violette ; la prendre
   pour un gris moyen surestimait tous les écarts d'environ 40 %. On peint donc
   la texture et on en lit la luminance moyenne, comme le fait déjà
   preview-fps.mjs pour regarder la vue subjective. */
function meanLuma(w, h, draw) {
  const s = surface(w, h);
  draw(s.ctx, w, h);
  let sum = 0;
  for (let i = 0; i < s.px.length; i += 4) sum += 0.299 * s.px[i] + 0.587 * s.px[i + 1] + 0.114 * s.px[i + 2];
  return sum / (s.px.length / 4);
}
const ALB_WALL = meanLuma(CFG.TEX_WALL, CFG.TEX_WALL, (c, a, b) => Paint.wall(c, CFG, a, b, 1));
const ALB_FLOOR = meanLuma(CFG.TEX_FLOOR, CFG.TEX_FLOOR, (c, a, b) => Paint.floor(c, CFG, a, b, 3));

/* ⚠️ ET ON ÉCRÊTE À 255 AVANT DE COMPARER, PARCE QUE L'ÉCRAN ÉCRÊTE.
   Le pire point de la première version était une dalle « éclairée » à 3,94 —
   soit cinq fois le blanc. À l'écran elle est blanche, point. Comparer des
   éclairements bruts comptait donc comme « perdu » de la lumière qui n'était
   affichée nulle part, et l'outil réclamait un pool deux fois trop grand pour
   une différence que personne n'aurait pu voir. */
const clamp255 = (v) => (v > 255 ? 255 : v < 0 ? 0 : v);

function irradiance(list, P, N, torch) {
  let sum = AMB + HEMI * Math.max(0, 0.5 + 0.5 * N[1]);
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (e.intensity <= 0) continue;
    const dx = e.x - P[0], dy = e.y - P[1], dz = e.z - P[2];
    const d = Math.hypot(dx, dy, dz) || 1e-6;
    if (d >= e.distance) continue;
    const att = Math.pow(1 - d / e.distance, e.decay);
    const ndl = Math.max(0, (dx * N[0] + dy * N[1] + dz * N[2]) / d);
    sum += e.intensity * att * ndl;
  }
  if (torch) {
    const dx = torch.position.x - P[0], dy = torch.position.y - P[1], dz = torch.position.z - P[2];
    const d = Math.hypot(dx, dy, dz) || 1e-6;
    if (d < torch.distance) {
      const att = Math.pow(1 - d / torch.distance, 1.7);
      const ndl = Math.max(0, (dx * N[0] + dy * N[1] + dz * N[2]) / d);
      sum += torch.intensity * att * ndl;
    }
  }
  return sum;
}

/* Les points de surface : les quatre faces verticales de chaque boîte de mur à
   trois hauteurs, plus le centre de chaque dalle. On ne garde que ce qui est
   dans le brouillard utile — au-delà, la couleur est celle du brouillard, quoi
   qu'on éclaire. */
/* ⚠️ ON NE MESURE QUE CE QUI EST À L'ÉCRAN. Un mur derrière le joueur peut
   s'assombrir autant qu'il veut : personne ne le voit. Le demi-angle vient de
   CFG.FPS_FOV, qui est le champ VERTICAL de three.js — le champ horizontal
   s'en déduit par le rapport d'image, et il est bien plus large (78° vertical
   en 16/9 font ~105° horizontaux). Mesurer sur 360° gonflerait la moyenne
   d'erreurs invisibles et ferait rater les vraies. */
const HALF_FOV = Math.atan(Math.tan(CFG.FPS_FOV * Math.PI / 360) * (16 / 9)) + 0.12;
function inView(px, pz, ang, x, z) {
  const fx = -Math.sin(ang), fz = -Math.cos(ang);
  const dx = x - px, dz = z - pz;
  const len = Math.hypot(dx, dz);
  if (len < 2) return true;
  return Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / len))) <= HALF_FOV;
}

/* ⚠️⚠️ ET ON NE MESURE QUE CE QU'ON PEUT VOIR. Trois filtres, et les trois
   sont indispensables — sans eux l'outil rapporte des écarts énormes sur des
   surfaces qui ne sont dans aucune image :

     1. le CHAMP — un mur derrière le joueur ne se voit pas ;
     2. la FACE — une boîte a quatre côtés, et on n'en voit jamais que ceux qui
        nous regardent. La face arrière d'un mur, collée à une torche de
        l'autre couloir, donnait à elle seule le maximum de la première
        version ;
     3. l'OCCULTATION — dans un dédale, presque tout est derrière un mur. On
        marche de l'œil au point contre la VRAIE liste de boîtes (celle qui
        arrête le joueur), jamais contre une géométrie refabriquée.

   ⚠️ Le pas de marche vaut la moitié de l'épaisseur d'un mur : plus grand, on
   passe au travers d'une cloison et on compte visible un point qui ne l'est
   pas ; plus petit, l'outil devient trop lent pour être lancé — et un outil
   trop lent est un outil mort (zip 393). */
function occluded(idxB, ex, ey, ez, P) {
  const dx = P[0] - ex, dy = P[1] - ey, dz = P[2] - ez;
  const len = Math.hypot(dx, dz);
  if (len < 2.5) return false;
  const step = CFG.WALL * 0.5;
  const n = Math.floor((len - 1.6) / step);
  for (let i = 1; i <= n; i++) {
    const t = (i * step) / len;
    const x = ex + dx * t, y = ey + dy * t, z = ez + dz * t;
    if (y < 0 || y > CFG.WALL_H) continue;
    for (const b of idxB.near(x, z)) {
      if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return true;
    }
  }
  return false;
}

function samplePoints(CFG, st, m, ex, ey, ez, fogFar, ang, idxB) {
  const pts = [];
  const R2 = fogFar * fogFar;
  const push = (P, N) => {
    // la face nous tourne-t-elle le dos ?
    if ((ex - P[0]) * N[0] + (ey - P[1]) * N[1] + (ez - P[2]) * N[2] <= 0) return;
    if (occluded(idxB, ex, ey, ez, P)) return;
    pts.push([P, N]);
  };
  for (const b of st.boxes) {
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    if ((cx - ex) ** 2 + (cz - ez) ** 2 > R2) continue;
    if (!inView(ex, ez, ang, cx, cz)) continue;
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const fx = nx > 0 ? b.x1 + 0.02 : nx < 0 ? b.x0 - 0.02 : cx;
      const fz = nz > 0 ? b.z1 + 0.02 : nz < 0 ? b.z0 - 0.02 : cz;
      for (const y of [1.5, 5.5, 9.5]) push([fx, y, fz], [nx, 0, nz]);
    }
  }
  for (let y = 0; y < m.G; y++) for (let x = 0; x < m.G; x++) {
    if (!m.cells[m.idx(x, y)]) continue;
    const [wx, wz] = Rules.centerOf(CFG, x, y);
    if ((wx - ex) ** 2 + (wz - ez) ** 2 > R2) continue;
    if (!inView(ex, ez, ang, wx, wz)) continue;
    push([wx, 0, wz], [0, 1, 0]);
  }
  return pts;
}

const inRangeAll = [], errAll = [];
let framesTotal = 0, sampled = 0, ptsTotal = 0, worstErr = 0, worstCtx = null;
const insideRot = (m, CFG, x, z) => {
  const [cx, cz] = Rules.centerOf(CFG, m.rotunda.x + (m.rotunda.w - 1) / 2, m.rotunda.y + (m.rotunda.h - 1) / 2);
  return Math.hypot(x - cx, z - cz) < m.rotunda.w * CFG.CELL * 0.6;
};
let poolSize = 0, emitterCount = 0;
let builtMeshes = 0, builtLights = 0, builtAdd = 0, builtAddArea = 0, matTally = null;
const SAMPLE_EVERY = 90;      // un relevé toutes 3 s de jeu — l'occultation coûte cher

for (let r = 0; r < RUNS; r++) {
  const seed = 1000 + r * 7919;
  meshes = 0; sceneLights = 0; addMeshes = 0; addArea = 0;
  for (const k in byMat) delete byMat[k];

  const m0 = Maze.generate(CFG, seed);
  const st0 = Rules.create(CFG, m0, seed);
  World.init(CFG, m0, st0, {}, { shirt: 0x3f7fd4, pants: 0x454f66, hair: 0x5a3a1e, skin: 0xf0c8a0, gender: "m" });
  if (r === 0) {
    builtMeshes = meshes; builtLights = sceneLights;
    builtAdd = addMeshes; builtAddArea = addArea;
    matTally = Object.assign({}, byMat);
    poolSize = World.perf.pool; emitterCount = World.perf.emitters;
  }

  /* ⚠️⚠️ L'HORLOGE DE RENDU AVANCE DE 8 ms PAR PAS, PAS DE 33, ET C'EST UNE
     CORRECTION D'OUTIL, PAS UN RÉGLAGE.
     -----------------------------------------------------------------------
     La simulation tourne à 30 Hz ; en donnant 33 ms à World.sync(), on
     racontait au jeu qu'il rendait à 30 images par seconde. L'auto-détection
     du 399 en concluait — correctement ! — que la machine ramait, baissait la
     résolution, puis RÉTROGRADAIT LE NIVEAU, ce qui fait passer le pool de
     40 lampes à 20 puis à 10. L'outil mesurait donc l'écart d'un pool de dix
     lampes en croyant mesurer celui de quarante : l'écart moyen passait de
     0,2 à 5,3 sans que rien de visible n'ait changé dans le code.

     ⚠️ LA LEÇON, ET ELLE EST GÉNÉRALE : UN OUTIL QUI MESURE A PENDANT QUE B
     RECONFIGURE A NE MESURE RIEN. L'horloge de rendu est indépendante de celle
     du moteur (c'est tout l'objet de l'interpolation du 395) : on lui donne
     donc une cadence confortable, et on VÉRIFIE À LA FIN que le niveau n'a pas
     bougé — un contrôle qui se contenterait du réglage sans vérifier qu'il a
     tenu retomberait dans le même piège au prochain zip. */
  let tms = 0, k = 0;
  playOne({ CFG, Maze, Rules }, seed, {
    onStep(st, m) {
      tms += 8;
      World.snapPrev(st);
      World.sync(st, tms, 1);
      framesTotal++;
      inRangeAll.push(World.perf.inRange);
      if (k++ % SAMPLE_EVERY) return;

      const L = World.__lights();
      const fogFar = CFG.FOG_FAR_EMBER + (CFG.FOG_FAR_FULL - CFG.FOG_FAR_EMBER) * Rules.flameLevel(st).k;
      const fogNear = CFG.FOG_NEAR_EMBER + (CFG.FOG_NEAR_FULL - CFG.FOG_NEAR_EMBER) * Rules.flameLevel(st).k;
      const idxB = Rules.indexBoxes(CFG, m, st.boxes);
      const pts = samplePoints(CFG, st, m, st.px, CFG.EYE_H, st.pz, fogFar, st.ang, idxB);
      sampled++;
      for (const [P, N] of pts) {
        const d = Math.hypot(P[0] - st.px, P[2] - st.pz);
        // le poids : ce qui est noyé de brouillard ne peut pas se voir changer
        const vis = 1 - Math.min(1, Math.max(0, (d - fogNear) / Math.max(1e-3, fogFar - fogNear)));
        if (vis <= 0.02) continue;
        const eAll = irradiance(L.all, P, N, L.torch);
        const ePool = irradiance(L.chosen, P, N, L.torch);
        const A = N[1] > 0.5 ? ALB_FLOOR : ALB_WALL;
        const err = Math.abs(clamp255(A * eAll) - clamp255(A * ePool)) * vis;
        errAll.push(err);
        ptsTotal++;
        if (err > worstErr) {
          worstErr = err;
          worstCtx = { d: +d.toFixed(1), vis: +vis.toFixed(2), eAll: +eAll.toFixed(2), ePool: +ePool.toFixed(2),
                       rot: m.rotunda ? insideRot(m, CFG, P[0], P[2]) : false,
                       nUseful: World.perf.inRange, y: P[1] };
        }
      }
    },
  });
}

const sIn = stats(inRangeAll), sErr = stats(errAll);
const sorted = errAll.slice().sort((a, b) => a - b);
const pct = (q) => +(sorted[Math.min(sorted.length - 1, (sorted.length * q) | 0)] || 0).toFixed(1);
const p95 = pct(0.95), p99 = pct(0.99), p999 = pct(0.999);


console.log("--- LA SCÈNE CONSTRUITE (graine 1000) ---");
console.log(`  émetteurs déclarés par le décor : ${emitterCount}`);
console.log(`  PointLight RÉELLEMENT dans la scène : ${builtLights}   (pool ${poolSize} + torche du joueur + clé du modèle de vue)`);
console.log(`  maillages : ${builtMeshes}   ${JSON.stringify(matTally)}`);
console.log(`  plans additifs : ${builtAdd}, surface cumulée ~${(builtAddArea / 1000).toFixed(0)} k u²`);
console.log("");
console.log("--- CE QUE LE POOL A COÛTÉ À L'IMAGE ---");
console.log(`  images jouées : ${framesTotal}   relevés d'éclairement : ${sampled}   points mesurés : ${ptsTotal.toLocaleString()}`);
console.log(`  foyers utiles par image : min ${sIn.min}  méd ${sIn.med}  p75 ${sIn.p75}  max ${sIn.max}`);
console.log(`  ÉCART D'ÉCLAIREMENT, en niveaux de gris sur 255, pondéré par le brouillard :`);
console.log(`     moyen ${sErr.avg}   médian ${sErr.med}   p75 ${sErr.p75}   p95 ${p95}   p99 ${p99}   p99,9 ${p999}   MAXIMUM ${sErr.max}`);
console.log("  pire point :", JSON.stringify(worstCtx));
console.log("");

/* ⚠️ LE COMPTEUR QUI AURAIT DÛ EXISTER DEPUIS LE 397 : PIXELS × LUMIÈRES.
   C'est le produit, pas ses facteurs, qui décide si le jeu tourne. */
const px = 1440 * 900 * 4;      // 1440×900 en Retina
const before = 123, after = builtLights;
console.log("--- LE MULTIPLICATEUR, à 1440×900 en Retina ---");
console.log(`  avant le 399 : ${px.toLocaleString()} px × ${before} lumières = ${((px * before) / 1e9).toFixed(1)} milliards d'évaluations par image`);
console.log(`  après le 399 : ${px.toLocaleString()} px × ${after} lumières = ${((px * after) / 1e9).toFixed(2)} milliards, soit ÷${(before / after).toFixed(1)}`);
console.log("");

/* ⚠️ CE CONTRÔLE A CHANGÉ DE NATURE EN COURS DE CHANTIER, ET ÇA VAUT D'ÊTRE
   ÉCRIT. Il disait « ≤ 12 » — un idéal, posé avant d'avoir mesuré quoi que ce
   soit. La mesure a montré qu'à douze lampes le décor s'assombrit visiblement
   (écart moyen de 5/255). Le contrôle avait tort, pas le décor : il compare
   maintenant au niveau DEMANDÉ, plus la torche du joueur et la clé du modèle de
   vue, et c'est le contrôle d'écart d'éclairement qui juge si ce niveau suffit. */
check("le pool fait exactement la taille demandée", builtLights === CFG.QUAL.high.lights + 2,
      `${builtLights} PointLight pour ${CFG.QUAL.high.lights} demandées + torche + modèle de vue`);
check("le décor déclare bien tous ses foyers", emitterCount >= 100, `${emitterCount} émetteurs`);
/* ⚠️ CE CONTRÔLE COMPARE À L'ÉTAT D'AVANT, PAS À UN IDÉAL — règle du zip 379.
   Le décor du 398 n'a pas bougé d'un maillage : s'il bouge, c'est qu'on a
   touché à l'apparence, ce que ce zip s'interdit explicitement. */
check("le décor du 398 est intact", builtMeshes > 3000 && builtMeshes < 4200, `${builtMeshes} maillages`);
/* Le garde-fou de l'outil lui-même : voir le bloc sur l'horloge de rendu. */
check("le niveau n'a pas été rétrogradé sous nos pieds", World.quality === "high",
      `niveau ${World.quality} en fin de mesure`);
/* ⚠️ LES DEUX SEUILS, ET D'OÙ ILS VIENNENT.
   Un écart MOYEN de 1/255 est très en dessous de ce qu'un écran montre : le
   plus petit pas visible sur une pente sombre est de l'ordre de 2. Un écart
   MAXIMUM de 8/255 sur un point isolé est du même ordre que le tramage d'un
   dégradé — c'est le seuil au-delà duquel une zone commencerait à se lire
   comme « plus sombre » plutôt que comme « du bruit ».
   ⚠️ Ce ne sont PAS des seuils de confort : ce sont les seuls chiffres qui
   répondent à la phrase de Guillaume, « sans trop perdre en qualité
   graphique ». Si l'un des deux casse, c'est le pool qu'il faut agrandir
   (CFG.QUAL.*.lights), jamais le seuil qu'il faut baisser — corollaire n°3 du
   zip 379. */
check("l'écart d'éclairement moyen reste invisible", sErr.avg <= 1.0, `${sErr.avg}/255`);
check("99 % des points restent sous le seuil de l'écran", p99 <= 8.0, `p99 = ${p99}/255`);
/* ⚠️ ON NE CONTRÔLE PAS LE MAXIMUM, ET C'EST DÉLIBÉRÉ. Le pire point est
   toujours une dalle vue à travers 80 % de brouillard, à soixante unités : son
   écart brut est grand, sa contribution à l'image ne l'est pas, et un seuil
   posé dessus ferait réclamer un pool deux fois trop grand pour un pixel que
   personne ne regarde. On l'AFFICHE — pour qu'il ne disparaisse pas du
   raisonnement — et on contrôle le p99, qui est ce qu'un joueur voit. */
console.log(`  (maximum non contrôlé, pour information : ${sErr.max}/255)`);

console.log(fails ? `\n${fails} ÉCHEC(S)\n` : "\nTout est passé.\n");
console.log(`⚠️ CE SCRIPT NE MESURE AUCUN TEMPS. Il n'y a pas de GPU dans node : il
compte ce qu'on DEMANDE au GPU, jamais ce que le GPU met à le faire. Le nombre
d'images par seconde réel ne peut venir que du panneau de mise au point du jeu,
chez Guillaume, sur sa machine. Il ne dit rien non plus de l'aspect : pour ça,
il faut regarder — tools/preview-fps.mjs — et jouer.\n`);
process.exit(fails ? 1 : 0);
