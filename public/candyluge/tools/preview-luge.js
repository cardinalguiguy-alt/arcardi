/* =============================================================================
   tools/preview-luge.js — RENDRE LA DESCENTE ET LA REGARDER.
   -----------------------------------------------------------------------------
       node public/candyluge/tools/preview-luge.js      (écrit tools/out/*.png)

   ⚠️ CE SCRIPT EXISTE PARCE QU'ON A DEMANDÉ « PRIORITÉ À L'EXPÉRIENCE
   VISUELLE » ET « ne considère la tâche comme complète qu'une fois que tout
   tient bien niveau visuel ». On ne peut pas tenir cette promesse en relisant
   du code : rien dans world.js ne dit à quoi RESSEMBLE une piste de barbe à
   papa vue depuis onze mètres en arrière. Il faut la voir.

   C'est le même geste qu'au zip 377 pour le fermier du défi de fuite
   (tools/render-runner.js), poussé d'un cran : là-bas on jugeait une
   silhouette en projection orthographique, ici on juge un PAYSAGE — donc il
   faut la perspective, le brouillard, le ciel et la vraie caméra du jeu.

   COMMENT. Un faux three.js qui retient les transformations et le TYPE de
   chaque géométrie, un calcul de matrices monde à la main, une découpe de
   chaque primitive en triangles, une projection perspective avec la focale de
   config.js, un tampon de profondeur, et l'éclairage à trois sources de
   world.js recopié à l'identique. Le fond n'est pas une couleur : c'est LA
   TEXTURE DE CIEL DU JEU, échantillonnée par la direction du rayon.

   ⚠️ CE QU'IL NE MONTRE PAS, et il faut le savoir avant de conclure :
     * LES PARTICULES (étoiles de dérapage, poudre, neige) sont absentes. Elles
       sont dans un THREE.Points, qui n'a pas de triangles à rasteriser. Une
       image sans étoiles ne veut donc PAS dire que le dérapage ne brille pas.
     * pas d'ombres portées, pas d'anticrénelage, pas de transparence — les
       halos de bonbons sont rendus opaques.
     * les textures des RUBANS (piste, neige) sont désormais VRAIMENT plaquées,
       avec leurs UV (zip 412) — c'est la seule façon de juger un sol texturé.
       Celles des primitives (barrières en sucre d'orge) restent rendues par la
       moyenne de leur image : elles n'ont pas d'UV dans ce faux three.js.

   Il montre : la composition du cadre, la place de l'horizon, la silhouette de
   la piste dans ses virages, la densité du décor, la lisibilité des gourmands
   sur la neige, et la couleur d'ensemble. C'est exactement ce qui ne se devine
   pas en lisant.

   Le rasteriseur 2D et l'encodeur PNG sont ceux du défi de fuite
   (public/templerun/tools/lib-canvas2d.js), requis TELS QUELS : deux copies du
   même encodeur PNG, c'est deux fois le même bogue à corriger.
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { makeCanvas2D, avgColor, writePng } = require("../../templerun/tools/lib-canvas2d.js");

const root = path.join(__dirname, "..");
const outDir = path.join(__dirname, "out");
fs.mkdirSync(outDir, { recursive: true });

/* ===================================================== FAUX THREE.JS ====== */
class V3 {
  constructor(x, y, z) { this.set(x || 0, y || 0, z || 0); }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  setScalar(k) { return this.set(k, k, k); }
  copy(v) { return this.set(v.x, v.y, v.z); }
}
class V2 { constructor(x, y) { this.x = x || 0; this.y = y || 0; } set(x, y) { this.x = x; this.y = y; return this; } }
class Col {
  constructor(h) { this.h = typeof h === "number" ? h : 0; }
  setHex(h) { this.h = h; return this; }
  copy(c) { this.h = c.h; return this; } lerp() { return this; } setRGB() { return this; } set() { return this; }
}
class Obj3 {
  constructor() {
    this.position = new V3(); this.rotation = new V3(); this.scale = new V3(1, 1, 1);
    this.children = []; this.userData = {}; this.visible = true; this.parent = null;
    this.renderOrder = 0;
  }
  add(o) { o.parent = this; this.children.push(o); }
  remove(o) { const i = this.children.indexOf(o); if (i >= 0) { this.children.splice(i, 1); o.parent = null; } }
  traverse(fn) { fn(this); for (const c of this.children) c.traverse(fn); }
  lookAt(x, y, z) { this.__look = { x, y, z }; }
  rotateZ(a) { this.__roll = (this.__roll || 0) + a; return this; }
  updateProjectionMatrix() {}
}
class Mat {
  constructor(o) { Object.assign(this, o || {}); this.color = new Col(o && typeof o.color === "number" ? o.color : 0xffffff); }
}
function G(kind, p) { return Object.assign({ kind }, p, { dispose() {} }); }

const THREE = {
  WebGLRenderer: class { constructor(o) { this.o = o; } setPixelRatio() {} setSize() {} render() {} },
  Scene: class extends Obj3 { constructor() { super(); this.fog = null; } },
  Color: Col,
  FogExp2: class { constructor(c, d) { this.color = new Col(c); this.density = d; } },
  PerspectiveCamera: class extends Obj3 {
    constructor(fov, asp, near, far) { super(); this.fov = fov; this.aspect = asp; this.near = near; this.far = far; }
  },
  AmbientLight: class extends Obj3 { constructor(c, i) { super(); this.color = new Col(c); this.intensity = i; } },
  DirectionalLight: class extends Obj3 { constructor(c, i) { super(); this.color = new Col(c); this.intensity = i; } },
  BoxGeometry: class { constructor() { return G("box"); } },
  CylinderGeometry: class { constructor(rt, rb, h, seg) { return G("cyl", { rt, rb, h, seg: seg || 8 }); } },
  ConeGeometry: class { constructor(r, h, seg) { return G("cone", { r, h, seg: seg || 8 }); } },
  SphereGeometry: class { constructor(r, w, h) { return G("sphere", { r, w: w || 8, h: h || 6 }); } },
  TorusGeometry: class { constructor(r, t, rs, ts, arc) { return G("torus", { r, t, rs: rs || 6, ts: ts || 12, arc: arc || Math.PI * 2 }); } },
  PlaneGeometry: class { constructor() { return G("plane"); } },
  BufferGeometry: class {
    constructor() { this.kind = "buffer"; this.attributes = {}; this.index = null; }
    setAttribute(n, a) { this.attributes[n] = a; return this; }
    setIndex(i) { this.index = i; return this; }
    computeVertexNormals() {}
    dispose() {}
  },
  BufferAttribute: class { constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; } },
  MeshLambertMaterial: Mat,
  /* ⚠️ BASIC ET LAMBERT NE PEUVENT PLUS ÊTRE LA MÊME CLASSE (414). Tant que la
     planche les confondait, elle ÉCLAIRAIT des matériaux qui, dans le jeu, ne
     le sont pas — la chaîne de montagnes lointaine, les halos de bonbons, les
     fanions de checkpoint. Ils apparaissaient donc plus contrastés sur l'image
     que dans le navigateur, ce qui est exactement le genre de mensonge qui fait
     régler une palette dans le vide. */
  MeshBasicMaterial: class extends Mat { constructor(o) { super(o); this.__basic = true; } },
  PointsMaterial: Mat,
  HemisphereLight: class extends Obj3 {
    constructor(sky, ground, i) { super(); this.color = new Col(sky); this.groundColor = new Col(ground); this.intensity = i; }
  },
  CanvasTexture: class {
    constructor(cv) { this.image = cv; this.repeat = new V2(1, 1); this.offset = new V2(0, 0); }
    clone() { return new THREE.CanvasTexture(this.image); }
  },
  Mesh: class extends Obj3 { constructor(g, m) { super(); this.geometry = g; this.material = m; this.isMesh = true; } },
  Points: class extends Obj3 { constructor(g, m) { super(); this.geometry = g; this.material = m; this.isPoints = true; } },
  Group: class extends Obj3 {},
  Vector3: V3,
  BackSide: 1, FrontSide: 0, DoubleSide: 2,
  RepeatWrapping: 1000, ClampToEdgeWrapping: 1001,
  AdditiveBlending: 2, NormalBlending: 1,
};

/* Un canvas 2D RÉEL (celui du défi de fuite) : les textures sont vraiment
   peintes, ce qui permet d'en prendre la moyenne — et le ciel, lui, est
   échantillonné pixel par pixel pour le fond de l'image. */
function makeCanvasEl(w, h) {
  const el = { width: w || 1, height: h || 1 };
  let ctx = null;
  el.getContext = () => {
    if (!ctx || ctx.__w !== el.width || ctx.__h !== el.height) {
      ctx = makeCanvas2D(el.width, el.height);
      ctx.__w = el.width; ctx.__h = el.height;
      el.ctx = ctx;
    }
    return ctx;
  };
  return el;
}

const ctxVm = vm.createContext({
  Math, console, JSON, THREE, Float32Array, Uint8ClampedArray, Array,
  performance: { now: () => 0 },
  window: { innerWidth: 1280, innerHeight: 720, addEventListener: () => {}, devicePixelRatio: 1 },
  document: { getElementById: () => ({ classList: { toggle() {}, add() {} }, style: {}, addEventListener() {} }), createElement: (t) => (t === "canvas" ? makeCanvasEl() : {}) },
  localStorage: { getItem: () => null, setItem() {} },
});
for (const f of ["js/strings.js", "js/config.js", "js/slope.js", "js/sled.js",
                 "js/critters.js", "js/camera.js", "js/world.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctxVm, { filename: f });
}
const { CFG, World, Slope, Sled, Critters, ChaseCamera } = vm.runInContext(
  "({ CFG, World, Slope, Sled, Critters, ChaseCamera })", ctxVm);

/* Le faux Input : la luge doit pouvoir tourner pour qu'on voie un dérapage. */
var steerValue = 0;
var brakeValue = false;
ctxVm.Input = {
  axis: () => steerValue, jumpPressed: () => false,
  sliding: () => brakeValue, tucking: () => false, clear() {},
};
vm.runInContext("var Input = Input;", ctxVm);

/* ================================================= MATRICES ET TRIANGLES == */
function mul(a, b) {
  const r = new Array(16).fill(0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    let s = 0; for (let k = 0; k < 4; k++) s += a[i * 4 + k] * b[k * 4 + j];
    r[i * 4 + j] = s;
  }
  return r;
}
const ident = () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
function localMatrix(o) {
  const { x: rx, y: ry, z: rz } = o.rotation;
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  const Rx = [1,0,0,0, 0,cx,-sx,0, 0,sx,cx,0, 0,0,0,1];
  const Ry = [cy,0,sy,0, 0,1,0,0, -sy,0,cy,0, 0,0,0,1];
  const Rz = [cz,-sz,0,0, sz,cz,0,0, 0,0,1,0, 0,0,0,1];
  const R = mul(mul(Rx, Ry), Rz);
  const S = [o.scale.x,0,0,0, 0,o.scale.y,0,0, 0,0,o.scale.z,0, 0,0,0,1];
  const T = [1,0,0,o.position.x, 0,1,0,o.position.y, 0,0,1,o.position.z, 0,0,0,1];
  return mul(T, mul(R, S));
}
const apply = (m, p) => ({
  x: m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3],
  y: m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7],
  z: m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11],
});

/* Découpe des primitives en triangles, en coordonnées LOCALES (la matrice les
   emmène ensuite dans le monde). Une primitive absente d'ici serait invisible
   dans la planche sans qu'aucune erreur ne le signale — d'où la liste
   exhaustive et le `default` bruyant en bas. */
function tessellate(g) {
  const T = [];
  const quad = (a, b, c, d) => { T.push([a, b, c]); T.push([a, c, d]); };
  if (g.kind === "box") {
    const c = [];
    for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) c.push([x, y, z]);
    // bits : 4=x, 2=y, 1=z
    quad(c[4], c[5], c[7], c[6]); quad(c[0], c[2], c[3], c[1]);
    quad(c[2], c[6], c[7], c[3]); quad(c[0], c[1], c[5], c[4]);
    quad(c[1], c[3], c[7], c[5]); quad(c[0], c[4], c[6], c[2]);
  } else if (g.kind === "cyl" || g.kind === "cone") {
    const n = Math.min(14, g.seg || 10);
    const rt = g.kind === "cone" ? 0 : 0.5, rb = 0.5, h = 0.5;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const p0 = [Math.cos(a0) * rb, -h, Math.sin(a0) * rb], p1 = [Math.cos(a1) * rb, -h, Math.sin(a1) * rb];
      const q0 = [Math.cos(a0) * rt, h, Math.sin(a0) * rt], q1 = [Math.cos(a1) * rt, h, Math.sin(a1) * rt];
      if (rt > 0) quad(p0, p1, q1, q0); else T.push([p0, p1, [0, h, 0]]);
      T.push([[0, -h, 0], p1, p0]);
      if (rt > 0) T.push([[0, h, 0], q0, q1]);
    }
  } else if (g.kind === "sphere") {
    const W = Math.min(12, g.w), H = Math.min(9, g.h);
    for (let j = 0; j < H; j++) {
      const t0 = (j / H) * Math.PI, t1 = ((j + 1) / H) * Math.PI;
      for (let i = 0; i < W; i++) {
        const p0 = (i / W) * Math.PI * 2, p1 = ((i + 1) / W) * Math.PI * 2;
        const P = (t, p) => [Math.sin(t) * Math.cos(p) * 0.5, Math.cos(t) * 0.5, Math.sin(t) * Math.sin(p) * 0.5];
        quad(P(t0, p0), P(t1, p0), P(t1, p1), P(t0, p1));
      }
    }
  } else if (g.kind === "torus") {
    const R = g.r, r = g.t, TS = Math.min(20, g.ts), RS = Math.min(8, g.rs);
    for (let i = 0; i < TS; i++) {
      const a0 = (i / TS) * g.arc, a1 = ((i + 1) / TS) * g.arc;
      for (let j = 0; j < RS; j++) {
        const b0 = (j / RS) * Math.PI * 2, b1 = ((j + 1) / RS) * Math.PI * 2;
        const P = (a, b) => [(R + r * Math.cos(b)) * Math.cos(a), (R + r * Math.cos(b)) * Math.sin(a), r * Math.sin(b)];
        quad(P(a0, b0), P(a1, b0), P(a1, b1), P(a0, b1));
      }
    }
  } else if (g.kind === "plane") {
    quad([-0.5, -0.5, 0], [0.5, -0.5, 0], [0.5, 0.5, 0], [-0.5, 0.5, 0]);
  } else if (g.kind === "buffer") {
    const pos = g.attributes.position && g.attributes.position.array;
    if (!pos) return T;
    const idx = g.index;
    const P = (k) => [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]];
    const uvA = g.attributes.uv && g.attributes.uv.array;
    const U = (k) => (uvA ? [uvA[k * 2], uvA[k * 2 + 1]] : null);
    /* LES COULEURS PAR SOMMET (414) : c'est par elles que vit le sillon gravé,
       dont toute l'information — carre sombre contre bavure pâle, et
       l'effacement progressif — est portée par la couleur et par rien d'autre.
       Sans cette lecture, la trace apparaîtrait d'un blanc uniforme sur la
       planche, c'est-à-dire exactement le contraire de ce qu'on veut juger.
       ⚠️ Un triangle dont les trois sommets sont noirs est un segment JAMAIS
       ÉCRIT (tampon circulaire au repos) : on le jette, sans quoi trois cents
       quadrilatères repliés à l'origine barreraient le bas du cadre. */
    const colA = g.attributes.color && g.attributes.color.array;
    const push3 = (a, b, c) => {
      if (colA) {
        const sum = colA[a * 3] + colA[a * 3 + 1] + colA[a * 3 + 2]
                  + colA[b * 3] + colA[b * 3 + 1] + colA[b * 3 + 2]
                  + colA[c * 3] + colA[c * 3 + 1] + colA[c * 3 + 2];
        if (sum < 0.02) return;
      }
      const tri = [P(a), P(b), P(c)];
      if (uvA) tri.uv = [U(a), U(b), U(c)];
      if (colA) {
        const m3 = (k) => [colA[k * 3], colA[k * 3 + 1], colA[k * 3 + 2]];
        const q = [m3(a), m3(b), m3(c)];
        tri.vcol = [(q[0][0] + q[1][0] + q[2][0]) / 3,
                    (q[0][1] + q[1][1] + q[2][1]) / 3,
                    (q[0][2] + q[1][2] + q[2][2]) / 3];
      }
      T.push(tri);
    };
    if (idx) for (let i = 0; i < idx.length; i += 3) push3(idx[i], idx[i + 1], idx[i + 2]);
    else for (let i = 0; i < pos.length / 3; i += 3) push3(i, i + 1, i + 2);
  } else {
    console.log("  ⚠️ géométrie non tessellée : " + g.kind + " — elle sera INVISIBLE dans la planche");
  }
  return T;
}

/* La couleur d'un matériau : sa teinte, ou la MOYENNE de sa texture. */
const matColor = (m) => {
  if (!m) return 0xff00ff;
  if (m.map && m.map.image) return avgColor(m.map.image, m.color.h || 0xffffff);
  return m.color.h;
};

function collect(rootObj) {
  const faces = [];
  (function walk(o, parentM) {
    if (!o.visible) return;
    const m = mul(parentM, localMatrix(o));
    if (o.isMesh && o.geometry) {
      const col = matColor(o.material);
      /* ⚠️ LA TEXTURE EST ÉCHANTILLONNÉE POUR DE VRAI DEPUIS LE 412, et il a
         fallu ça pour pouvoir répondre à « y a pas de texture au sol ». Tant
         que la planche rendait chaque matériau par la MOYENNE de sa texture,
         un sol correctement texturé et un sol uni donnaient exactement la même
         image — l'outil ne pouvait pas voir le défaut qu'on lui demandait de
         juger. Un outil qui ne montre pas ce qu'on juge est pire qu'un outil
         absent : il rassure. */
      const map = (o.material && o.material.map && o.material.map.image
        && o.material.map.image.ctx) ? o.material.map.image : null;
      const isSky = !!(o.material && o.material.fog === false && o.material.side === 1);
      // Un matériau Basic n'est PAS éclairé — dans le jeu comme ici.
      const flat = !!(o.material && o.material.__basic);
      if (!isSky) {
        for (const tri of tessellate(o.geometry)) {
          const p = tri.map((v) => apply(m, v));
          const ux = p[1].x - p[0].x, uy = p[1].y - p[0].y, uz = p[1].z - p[0].z;
          const vx = p[2].x - p[0].x, vy = p[2].y - p[0].y, vz = p[2].z - p[0].z;
          let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          const L = Math.hypot(nx, ny, nz) || 1;
          faces.push({ p, n: { x: nx / L, y: ny / L, z: nz / L }, col, map, uv: tri.uv, flat, vcol: tri.vcol });
        }
      }
    }
    for (const c of o.children) walk(c, m);
  })(rootObj, ident());
  return faces;
}

/* ============================================================ RASTERISEUR = */
const skyCanvas = (function () {
  // On rejoue la peinture de ciel du jeu, dans le même contexte : c'est LA
  // texture du jeu, pas une approximation.
  return vm.runInContext("(function(){ return null; })()", ctxVm);
})();

/* ══════════════════════════════════════════════════════════════════════════
   L'ÉCLAIRAGE DE LA PLANCHE — ⚠️ REFAIT AU 414 EN MÊME TEMPS QUE CELUI DU JEU.
   ──────────────────────────────────────────────────────────────────────────
   ⚠️ CES DEUX ÉCRITURES DOIVENT RESTER D'ACCORD, ET C'EST LA SEULE DETTE QUE
   CET OUTIL FAIT PORTER AU PROJET. Le jeu éclaire avec three.js, la planche
   réimplémente le même modèle à la main : si world.js change de lumière et
   qu'on oublie ici, l'outil continue de rendre de belles images qui ne
   ressemblent plus à rien de ce que le joueur voit. Un outil de contrôle qui
   ment est pire qu'un outil absent, parce qu'il rassure.

   Le modèle, recopié terme à terme sur World.init() :
     * une AMBIANTE faible et uniforme (0,20) ;
     * une lumière d'HÉMISPHÈRE (0,46) : three.js la calcule en interpolant du
       sol vers le ciel selon `0,5·n.y + 0,5`, c'est-à-dire par l'ORIENTATION
       VERTICALE de la face. C'est elle qui donne le bleu sur les dessus et le
       rose sur les dessous, donc toute la couleur d'ombre du décor ;
     * le SOLEIL (1,05), chaud et rasant, qui domine et creuse le relief ;
     * un APPOINT froid (0,18), qui empêche les dessous d'être noirs.
   ══════════════════════════════════════════════════════════════════════════ */
const SUN_C = [((CFG.COL_LIGHT_SUN >> 16) & 255) / 255, ((CFG.COL_LIGHT_SUN >> 8) & 255) / 255, (CFG.COL_LIGHT_SUN & 255) / 255];
const SKY_C = [((CFG.COL_LIGHT_SKY >> 16) & 255) / 255, ((CFG.COL_LIGHT_SKY >> 8) & 255) / 255, (CFG.COL_LIGHT_SKY & 255) / 255];
const GND_C = [((CFG.COL_LIGHT_GROUND >> 16) & 255) / 255, ((CFG.COL_LIGHT_GROUND >> 8) & 255) / 255, (CFG.COL_LIGHT_GROUND & 255) / 255];
const FOG_C = [(CFG.COL_FOG >> 16) & 255, (CFG.COL_FOG >> 8) & 255, CFG.COL_FOG & 255];

/* Le facteur d'éclairage, PAR CANAL — et il le faut : tout l'intérêt du
   nouveau modèle est que le rouge et le bleu ne sont PAS éclairés pareil selon
   qu'une face regarde le ciel ou le sol. Un facteur scalaire unique, comme au
   413, ne pouvait par construction produire que du plus clair et du plus
   sombre, jamais du plus chaud et du plus froid — c'est-à-dire pas la moitié de
   ce qu'on cherche à juger. */
function lightK(n, sun, fillL) {
  const cs = Math.max(0, n.x * sun.x + n.y * sun.y + n.z * sun.z);
  const cf = Math.max(0, n.x * fillL.x + n.y * fillL.y + n.z * fillL.z);
  const hemiT = 0.5 * n.y + 0.5;          // 1 = face au ciel, 0 = face au sol
  const A = CFG.LIGHT_AMBIENT, Hh = CFG.LIGHT_SKY, S = CFG.LIGHT_SUN;
  const k = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    k[i] = A
      + Hh * (GND_C[i] + (SKY_C[i] - GND_C[i]) * hemiT)
      + S * SUN_C[i] * cs
      + 0.18 * [0.77, 0.85, 1.0][i] * cf;
  }
  return k;
}

function fogMix(r, g, b, dist) {
  const f = 1 - Math.exp(-Math.pow(dist * CFG.FOG_DENSITY, 2));
  return [
    Math.min(255, r * (1 - f) + FOG_C[0] * f) | 0,
    Math.min(255, g * (1 - f) + FOG_C[1] * f) | 0,
    Math.min(255, b * (1 - f) + FOG_C[2] * f) | 0,
  ];
}

function shade(col, n, dist, sun, fillL, flat, vcol) {
  let r = (col >> 16) & 255, g = (col >> 8) & 255, b = col & 255;
  if (vcol) { r *= vcol[0]; g *= vcol[1]; b *= vcol[2]; }
  // Un matériau Basic n'est pas éclairé : il garde sa teinte, il subit
  // seulement le brouillard. C'est ce que fait three.js.
  if (!flat) {
    const k = lightK(n, sun, fillL);
    r *= k[0]; g *= k[1]; b *= k[2];
  }
  return fogMix(r, g, b, dist);
}

function render(faces, cam, W, H, skyPx, skyW, skyH) {
  const px = new Uint8Array(W * H * 3);
  const zbuf = new Float64Array(W * H).fill(1e18);

  const norm = (v) => { const L = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / L, y: v.y / L, z: v.z / L }; };
  const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
  const dd = norm({ x: cam.look.x - cam.pos.x, y: cam.look.y - cam.pos.y, z: cam.look.z - cam.pos.z });
  let rr = norm(cross(dd, { x: 0, y: 1, z: 0 }));
  let uu = norm(cross(rr, dd));
  // Le roulis de la caméra du jeu, appliqué au repère (et non à l'image) :
  // c'est ce que fait camera.rotateZ après le lookAt.
  if (cam.roll) {
    const c = Math.cos(cam.roll), s = Math.sin(cam.roll);
    const r2 = { x: rr.x * c + uu.x * s, y: rr.y * c + uu.y * s, z: rr.z * c + uu.z * s };
    const u2 = { x: uu.x * c - rr.x * s, y: uu.y * c - rr.y * s, z: uu.z * c - rr.z * s };
    rr = r2; uu = u2;
  }
  const f = (H / 2) / Math.tan((cam.fov * Math.PI / 180) / 2);

  /* LE FOND : la texture de ciel du jeu, échantillonnée par la direction du
     rayon (mappage sphérique, celui d'une SphereGeometry). Un fond uni
     mentirait sur la moitié haute du cadre — c'est-à-dire sur la moitié qu'on
     a justement dégagée pour le paysage. */
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = (x + 0.5 - W / 2) / f, sy = -(y + 0.5 - H / 2) / f;
    const d = norm({ x: dd.x + rr.x * sx + uu.x * sy, y: dd.y + rr.y * sx + uu.y * sy, z: dd.z + rr.z * sx + uu.z * sy });
    const u = (Math.atan2(d.z, d.x) / (Math.PI * 2) + 0.5) % 1;
    const v = Math.min(0.999, Math.max(0, 0.5 - Math.asin(Math.max(-1, Math.min(1, d.y))) / Math.PI));
    const si = ((Math.min(skyH - 1, (v * skyH) | 0)) * skyW + Math.min(skyW - 1, (u * skyW) | 0)) * 4;
    const i = (y * W + x) * 3;
    px[i] = skyPx[si]; px[i + 1] = skyPx[si + 1]; px[i + 2] = skyPx[si + 2];
  }

  const sun = norm({ x: -0.55, y: 1, z: 0.35 });
  const fillL = norm({ x: 0.5, y: -0.4, z: -0.6 });

  for (const face of faces) {
    const P = face.p.map((p) => {
      const q = { x: p.x - cam.pos.x, y: p.y - cam.pos.y, z: p.z - cam.pos.z };
      const along = q.x * dd.x + q.y * dd.y + q.z * dd.z;
      const right = q.x * rr.x + q.y * rr.y + q.z * rr.z;
      const up = q.x * uu.x + q.y * uu.y + q.z * uu.z;
      return { sx: W / 2 + (right / Math.max(0.05, along)) * f, sy: H / 2 - (up / Math.max(0.05, along)) * f, z: along };
    });
    if (P.some((p) => p.z < 0.4)) continue;                 // derrière l'œil : on saute plutôt que de découper
    const zAvg = (P[0].z + P[1].z + P[2].z) / 3;
    if (zAvg > CFG.DRAW_DISTANCE) continue;
    const lit = shade(face.col, face.n, zAvg, sun, fillL, face.flat, face.vcol);
    /* L'échantillonnage de texture se fait par pixel, mais l'ÉCLAIRAGE est
       calculé une fois par face (facettes plates, comme le reste de la
       planche) : on garde donc le rapport entre la couleur éclairée et la
       couleur brute, et on l'applique au texel. */
    const kr = lit[0] / Math.max(1, (face.col >> 16) & 255);
    const kg = lit[1] / Math.max(1, (face.col >> 8) & 255);
    const kb = lit[2] / Math.max(1, face.col & 255);
    const fogF = 1 - Math.exp(-Math.pow(zAvg * CFG.FOG_DENSITY, 2));
    const [r, g, b] = lit;

    const minY = Math.max(0, Math.floor(Math.min(P[0].sy, P[1].sy, P[2].sy)));
    const maxY = Math.min(H - 1, Math.ceil(Math.max(P[0].sy, P[1].sy, P[2].sy)));
    const minX = Math.max(0, Math.floor(Math.min(P[0].sx, P[1].sx, P[2].sx)));
    const maxX = Math.min(W - 1, Math.ceil(Math.max(P[0].sx, P[1].sx, P[2].sx)));
    if (maxX < minX || maxY < minY) continue;
    const d1 = (P[1].sx - P[0].sx) * (P[2].sy - P[0].sy) - (P[2].sx - P[0].sx) * (P[1].sy - P[0].sy);
    if (Math.abs(d1) < 1e-9) continue;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const pxc = x + 0.5, pyc = y + 0.5;
      const w0 = ((P[1].sx - pxc) * (P[2].sy - pyc) - (P[2].sx - pxc) * (P[1].sy - pyc)) / d1;
      const w1 = ((P[2].sx - pxc) * (P[0].sy - pyc) - (P[0].sx - pxc) * (P[2].sy - pyc)) / d1;
      const w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const z = w0 * P[0].z + w1 * P[1].z + w2 * P[2].z;
      const idx = y * W + x;
      if (z >= zbuf[idx]) continue;
      zbuf[idx] = z;
      const i = idx * 3;
      if (face.map && face.uv) {
        // UV barycentriques, puis répétition (les UV du jeu sont en unités du
        // monde et sortent donc largement de [0,1] — c'est le principe).
        /* ⚠️⚠️ INTERPOLATION PERSPECTIVE-CORRECTE — CORRECTION DU 414, ET ELLE A
           FAILLI COÛTER TRÈS CHER.

           Cette ligne interpolait les UV directement par les poids
           barycentriques calculés À L'ÉCRAN. C'est du placage AFFINE, exactement
           celui de la PlayStation 1, et il a un défaut caractéristique : sur une
           grande surface vue sous un angle rasant, la texture se TORD en chevrons
           en zigzag de part et d'autre de la diagonale de chaque quadrilatère.

           ⚠️ ON A DONC PASSÉ TROIS ITÉRATIONS À CORRIGER, DANS LE JEU, UN DÉFAUT
           QUI N'EXISTAIT QUE DANS CET OUTIL. Les grands chevrons roses en travers
           de la piste — accusés d'être du moiré, puis mis sur le compte des
           sillons, puis des tourbillons — étaient produits ici, à cette ligne.
           (Les corrections de texture faites entre-temps restent bonnes et
           nécessaires par ailleurs : les motifs étaient réellement trop fins, et
           ça, ça se serait vu dans le navigateur. Mais ce n'était pas la cause
           des chevrons.)

           ⚠️ LA LEÇON, ET ELLE VAUT POUR TOUT OUTIL DE CONTRÔLE : quand une
           planche montre un défaut, la première question est « le jeu a-t-il ce
           défaut, ou seulement la planche ? ». Un rasteriseur logiciel écrit à la
           main ne fait PAS ce que fait une carte graphique, et chaque écart entre
           les deux est un faux positif en puissance.

           La correction est celle de tous les rasteriseurs depuis 1996 : ce qui
           s'interpole linéairement à l'écran n'est pas u, mais u/z — on
           interpole donc u/z et 1/z, puis on divise l'un par l'autre. */
        const u0 = face.uv[0], u1 = face.uv[1], u2 = face.uv[2];
        const iz0 = 1 / P[0].z, iz1 = 1 / P[1].z, iz2 = 1 / P[2].z;
        const iz = w0 * iz0 + w1 * iz1 + w2 * iz2;
        const tu = (w0 * u0[0] * iz0 + w1 * u1[0] * iz1 + w2 * u2[0] * iz2) / iz;
        const tv = (w0 * u0[1] * iz0 + w1 * u1[1] * iz1 + w2 * u2[1] * iz2) / iz;
        const im = face.map, ip = im.ctx.pixels;
        const sx2 = ((Math.floor(tu * im.width) % im.width) + im.width) % im.width;
        const sy2 = ((Math.floor(tv * im.height) % im.height) + im.height) % im.height;
        const si = (sy2 * im.width + sx2) * 4;
        px[i] = Math.min(255, ip[si] * kr * (1 - fogF) + FOG_C[0] * fogF) | 0;
        px[i + 1] = Math.min(255, ip[si + 1] * kg * (1 - fogF) + FOG_C[1] * fogF) | 0;
        px[i + 2] = Math.min(255, ip[si + 2] * kb * (1 - fogF) + FOG_C[2] * fogF) | 0;
      } else {
        px[i] = r; px[i + 1] = g; px[i + 2] = b;
      }
    }
  }
  return px;
}

/* ================================================================ SCÈNES == */
const W = 1200, H = 720;
/* ⚠️ LE SURÉCHANTILLONNAGE (414), ET IL EST DEVENU INDISPENSABLE.
   Ce rasteriseur prend UN texel par pixel, au plus proche. Il n'a ni mipmaps ni
   filtrage anisotrope — c'est-à-dire précisément les deux choses qui, dans le
   navigateur, empêchent une texture de sol de scintiller sous un angle rasant.
   Conséquence : la planche montrait un moiré BEAUCOUP PLUS VIOLENT que le jeu,
   et l'écart n'allait pas dans le sens qu'on croit. On risquait donc de courir
   après un défaut déjà corrigé, ou pire, de le juger insoluble.

   En rendant à 2×2 puis en moyennant, chaque pixel final agrège quatre
   échantillons : c'est un filtrage grossier, mais c'est le même GENRE de
   filtrage que celui du matériel, et la planche redevient représentative. On y
   gagne en prime un anticrénelage des silhouettes, qui manquait aussi.
   Quatre fois plus de pixels à rasteriser — quelques secondes de plus, pour
   des images sur lesquelles on peut enfin conclure. */
const SS = 2;

function shot(name, sAt, uAt, steer, driftFake, label, sim) {
  // On monte la scène une fois par planche : les tronçons construits dépendent
  // de la position, et on veut voir exactement ce que le joueur verrait là.
  World.init(makeCanvasEl(W * SS, H * SS));
  const slope = new Slope.SlopeGen();
  const sled = new Sled();
  const field = new Critters.Field();
  const cam = new ChaseCamera(World.camera);

  /* ══════════════════════════════════════════════════════════════════════
     ⚠️ ON SIMULE VRAIMENT LA DESCENTE (414), ON NE POSE PLUS LA LUGE.
     ══════════════════════════════════════════════════════════════════════
     Jusqu'au 413, la planche PLAÇAIT la luge à une abscisse et lui affectait
     un `drift` à la main. Ça suffisait tant qu'on ne jugeait qu'un décor. Ça ne
     suffit plus du tout, pour deux raisons qui sont tout l'objet de ce zip :

       1. LE SILLON GRAVÉ N'EXISTE QUE SI L'ON A ROULÉ. C'est une trace : sans
          plusieurs secondes de trajectoire derrière soi, il n'y a rien à
          montrer. Une luge téléportée ne laisse aucune trace, et on ne pourrait
          donc jamais regarder l'effet principal du 414.
       2. LES ÉTATS DE CONDUITE NE SE FABRIQUENT PAS À LA MAIN. `edge`, `skid`,
          `load`, `deep`, la suspension : ce sont des états à INERTIE, liés
          entre eux. Les poser arbitrairement produit des combinaisons que la
          physique ne peut pas atteindre — on jugerait alors une image du jeu
          qui n'arrive jamais.

     On fait donc rouler la vraie physique, avec les vraies touches, jusqu'à
     l'abscisse voulue. Ce qu'on voit sur la planche est ce que le joueur voit. */
  const nodeIndex0 = Math.floor(Math.max(0, sAt - 260) / CFG.NODE_LEN);
  slope.ensureAhead(nodeIndex0);
  for (const n of slope.nodes) World.buildNode(n);

  if (sim) {
    sled.s = Math.max(0, sAt - 240);
    sled.v = 30;
    let t = 0;
    // 25 secondes au plus : la luge atteint toujours la cible avant.
    for (let i = 0; i < 1500 && sled.s < sAt; i++) {
      t += 1 / 60;
      /* Une manière de conduire rend soit un axe, soit { steer, brake } : le
         frein à main est le VRAI outil du dérapage volontaire (il fait chuter
         l'adhérence, voir BRAKE_GRIP_MUL), et sans lui on ne peut pas montrer
         le second régime de conduite du jeu. */
      const cmd = sim(t, sled);
      if (typeof cmd === "number") { steerValue = cmd; brakeValue = false; }
      else { steerValue = cmd.steer; brakeValue = !!cmd.brake; }
      const wasReset = sled.reset;
      sled.update(1 / 60, t * 1000, slope.finishK(sled.s));
      const ni = Math.floor(sled.s / CFG.NODE_LEN);
      /* ⚠️ ON REJOUE LE RECUL DE FENÊTRE DU JEU (voir SlopeGen.rewind). Sans
         cette branche, la planche ne montrerait pas le bogue de piste vide
         après une chute — et c'est ELLE qui l'a trouvé. Un outil de contrôle
         qui simplifie le cas d'erreur ne contrôle plus rien. */
      if (!wasReset && sled.reset > 0) {
        for (const n of slope.rewind(ni)) World.dropNode(n);
        field.rewind(sled.s);
      } else {
        for (const n of slope.ensureAhead(ni)) World.dropNode(n);
      }
      for (const n of slope.nodes) if (!n.group) World.buildNode(n);
      field.update(1 / 60, t * 1000, sled);
      World.updateFx(sled, 1 / 60, t * 1000);      // c'est lui qui grave le sillon
      cam.update(1 / 60, sled, t * 1000);
    }
    /* On compte les segments de sillon RÉELLEMENT écrits. C'est le seul moyen
       de distinguer « la trace ne se voit pas sur l'image » de « la trace n'a
       jamais été gravée » — deux pannes très différentes qui produisent
       exactement la même planche. */
    let segs = 0;
    const tc = World.trailColors && World.trailColors();
    if (tc) for (let i = 0; i < tc.length; i += 3) if (tc[i] + tc[i + 1] + tc[i + 2] > 0.02) segs++;
    console.log(`      simulé : v=${sled.v.toFixed(1)} u/s, carre=${sled.edge.toFixed(2)},`
      + ` dérapage=${sled.skid.toFixed(2)}, charge=${sled.load.toFixed(2)}, profond=${sled.deep.toFixed(2)},`
      + ` chutes=${sled.wipes}, sillon=${segs} sommets`);
  } else {
    sled.s = sAt; sled.u = uAt; sled.v = 34;
    sled.heading = steer * 0.5;
    sled.drift = driftFake;
    sled.roll = -sled.heading * 0.55;
    sled.pitchVis = -Slope.pitchAt(sAt) * 0.5;
    const ni = Math.floor(sled.s / CFG.NODE_LEN);
    slope.ensureAhead(ni);
    for (const n of slope.nodes) if (!n.group) World.buildNode(n);
    field.update(0.016, 1000, sled);
  }

  World.updateSled(sled, 1000);
  World.updateCritters(field, 1000);
  // Trois appels : la caméra est amortie, une seule image la laisserait à
  // l'origine et la planche montrerait le fond de la vallée depuis nulle part.
  for (let i = 0; i < 40; i++) cam.update(0.016, sled, 1000 + i * 16);
  World.updateAmbient(1000, sled);

  const faces = collect(World.scene);
  const sky = World.scene.children.find((o) => o.isMesh && o.material && o.material.side === 1);
  const skyImg = sky.material.map.image;
  const sp = skyImg.ctx.pixels;
  const skyPx = new Uint8Array(skyImg.width * skyImg.height * 4);
  for (let i = 0; i < skyImg.width * skyImg.height; i++) {
    skyPx[i * 4] = sp[i * 4] | 0; skyPx[i * 4 + 1] = sp[i * 4 + 1] | 0;
    skyPx[i * 4 + 2] = sp[i * 4 + 2] | 0; skyPx[i * 4 + 3] = 255;
  }

  const big = render(faces, cam, W * SS, H * SS, skyPx, skyImg.width, skyImg.height);
  // Réduction : la moyenne des SS×SS échantillons (voir la note sur SS).
  const px = new Uint8Array(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let r = 0, g = 0, b = 0;
    for (let dy = 0; dy < SS; dy++) for (let dx = 0; dx < SS; dx++) {
      const j = (((y * SS + dy) * W * SS) + (x * SS + dx)) * 3;
      r += big[j]; g += big[j + 1]; b += big[j + 2];
    }
    const i = (y * W + x) * 3, k = SS * SS;
    px[i] = (r / k) | 0; px[i + 1] = (g / k) | 0; px[i + 2] = (b / k) | 0;
  }
  const file = path.join(outDir, name + ".png");
  writePng(file, W, H, px);
  console.log(`  ${name}.png  — ${label}  (${faces.length} triangles, s=${sAt})`);
}

/* Les manières de conduire qu'on veut REGARDER. Ce sont des fonctions du temps
   qui rendent l'axe de direction, exactement comme le ferait un joueur — et
   elles sont choisies pour montrer chacune un régime différent de la conduite
   du 414, puisque c'est ce régime qu'on juge. */
/* ⚠️ UN PILOTE QUI TIENT UNE LIGNE, ET NON UN BRAQUAGE CONSTANT. Le premier
   jeu de manières de conduire braquait à fond sans jamais corriger : la luge
   partait donc en spirale jusqu'à la barrière, se vautrait, et on mesurait la
   chute d'un pilote absurde au lieu de mesurer la conduite. Aucun joueur ne
   tient une carre pleine pendant huit secondes sans regarder où il va.
   Toutes les manières ci-dessous VISENT une position latérale et la tiennent ;
   ce qui les distingue est l'AGRESSIVITÉ avec laquelle elles la rejoignent,
   c'est-à-dire exactement ce qu'on veut comparer. */
/* ⚠️ MÊME CORRECTIF QUE LE PILOTE DE verify-luge.mjs (voir la longue note sur
   l'oscillation là-bas) : gain modéré et amortissement sur la vitesse de
   travers RÉELLE. Sans ça, ces manières de conduire plaquaient la luge contre
   la barrière — les planches montraient alors un enfoncement de 1,00 et une
   vitesse de 13 u/s, c'est-à-dire une luge à l'agonie au lieu du beau geste
   qu'on voulait précisément photographier. */
function hold(sled, target, gain) {
  const v = Math.max(8, sled.v);
  const wantLat = Math.max(-0.45 * v, Math.min(0.45 * v, (target - sled.u) * (gain || 1.0)));
  const wantHead = Math.asin(Math.max(-0.6, Math.min(0.6, wantLat / v)));
  return Math.max(-1, Math.min(1, (wantHead - sled.heading) * 3.0 - (sled.lat / v) * 0.8));
}
const DRIVE = {
  // Une carre franche tenue : on traverse la piste d'un bord à l'autre, une
  // fois, et on tient. C'est le geste qu'on veut réussir — deux sillons fins.
  /* ⚠️ UN BALAYAGE LENT ET CONTINU, ET NON UNE POSITION À REJOINDRE. Un pilote
     qui ATTEINT sa cible cesse de braquer : la planche montrait alors une luge
     parfaitement droite, carre à 0,02 — c'est-à-dire tout sauf le geste qu'on
     voulait photographier. Pour voir une carre, il faut être EN TRAIN d'en
     tenir une au moment du déclenchement. */
  /* ⚠️ LA CIBLE CHANGE SELON L'ABSCISSE, PAS SELON LE TEMPS. La simulation
     s'arrête à une POSITION donnée, jamais à un instant donné : une consigne
     pilotée par le temps tombe donc à une phase quelconque, et les deux
     premières tentatives ont photographié une luge parfaitement droite (carre
     0,02) sur la planche censée montrer une carre. En changeant de bord tous
     les 120 unités, on est certain qu'un appui a commencé au plus 120 unités
     avant le déclenchement — donc qu'on est EN TRAIN de carver. */
  /* ⚠️ UNE CARRE FRANCHE ET TENUE, ET NON UN ASSERVISSEMENT. `hold` est un
     correcteur : il ANNULE le braquage dès que la trajectoire est bonne, ce qui
     est exactement ce qu'on veut d'un pilote et exactement ce qu'on ne veut pas
     d'une photo. Pour montrer une carre, il faut en TENIR une — donc commander
     l'angle directement, et ne rendre la main que près de la barrière. */
  carve: (t, sled) => (Math.abs(sled.u) > 5
    ? hold(sled, 0, 1.5)
    : (Math.floor(sled.s / 105) % 2 ? 0.95 : -0.95)),
  // Un appui, puis l'autre : montre le coût du changement de carre.
  slalom: (t, sled) => hold(sled, (Math.floor(sled.s / 85) % 2 ? 7 : -7), 1.6),
  /* Le décrochage : on demande beaucoup PLUS que l'adhérence ne peut donner.
     ⚠️ C'est le seul cas où l'on braque volontairement à fond — c'est le
     propos : montrer ce que ça fait quand on en demande trop. */
  // Le frein à main en plein virage : l'adhérence chute, ça part en travers.
  skid: (t, sled) => (sled.s % 160 < 90 ? { steer: hold(sled, -7, 1.5), brake: false }
                                        : { steer: 1, brake: true }),
  straight: (t, sled) => hold(sled, 0, 1.0),
};

console.log("\n=== preview-luge — on regarde la descente ===\n");
shot("luge-depart", 60, 0, 0, 0, "le départ, vue d'ensemble");
shot("luge-carve", 520, 0, 0, 0, "⭐ LA CARRE TENUE — deux sillons fins", DRIVE.carve);
shot("luge-derapage", 760, 0, 0, 0, "⭐ LE DÉCROCHAGE — une bavure large", DRIVE.skid);
shot("luge-slalom", 1180, 0, 0, 0, "⭐ deux appuis enchaînés", DRIVE.slalom);
shot("luge-village", 1000, 2, 0.2, 0.1, "le hameau de pain d'épices", DRIVE.straight);
shot("luge-gourmands", 700, 0, 0, 0, "une vague de gourmands");
shot("luge-checkpoint", 380, 0, 0, 0, "⭐ une porte de checkpoint", DRIVE.straight);
shot("luge-hauteurs", 3400, 0, 0.4, 0.3, "les hauteurs, palier 4", DRIVE.slalom);
/* ⚠️ UNE PLANCHE EN BAS DE PISTE, AJOUTÉE AU 414. Toutes les précédentes étaient
   prises dans le premier tiers de la descente, où la caméra n'est descendue que
   d'une centaine d'unités. C'est ce trou dans la couverture qui a laissé passer
   la chaîne de montagnes flottant dans le ciel : le défaut ne commençait qu'à
   mi-parcours, et aucune planche ne regardait aussi loin. Un jeu de descente se
   contrôle aussi EN BAS. */
shot("luge-bas", 4700, 0, 0.2, 0.1, "⭐ le bas de la piste, 700 unités plus bas", DRIVE.slalom);
console.log("\nPlanches écrites dans public/candyluge/tools/out/.\n"
  + "⚠️ Ni particules, ni textures plaquées, ni transparence : voir l'en-tête.\n");
