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
  MeshLambertMaterial: Mat, MeshBasicMaterial: Mat, PointsMaterial: Mat,
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
let steerValue = 0;
ctxVm.Input = { axis: () => steerValue, jumpPressed: () => false, sliding: () => false, clear() {} };
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
    const push3 = (a, b, c) => {
      const tri = [P(a), P(b), P(c)];
      if (uvA) tri.uv = [U(a), U(b), U(c)];
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
      const unlit = !!(o.material && o.material.fog === false && o.material.side === 1); // le dôme de ciel
      if (!unlit) {
        for (const tri of tessellate(o.geometry)) {
          const p = tri.map((v) => apply(m, v));
          const ux = p[1].x - p[0].x, uy = p[1].y - p[0].y, uz = p[1].z - p[0].z;
          const vx = p[2].x - p[0].x, vy = p[2].y - p[0].y, vz = p[2].z - p[0].z;
          let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          const L = Math.hypot(nx, ny, nz) || 1;
          faces.push({ p, n: { x: nx / L, y: ny / L, z: nz / L }, col, map, uv: tri.uv });
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

function shade(col, n, dist, sun, fillL) {
  const cs = Math.max(0, n.x * sun.x + n.y * sun.y + n.z * sun.z);
  const cf = Math.max(0, n.x * fillL.x + n.y * fillL.y + n.z * fillL.z);
  // Les mêmes trois sources que world.js : ambiante 0,78 chaude, soleil 0,72,
  // appoint froid 0,26. Recopiées et non devinées — un rendu qui n'éclaire pas
  // comme le jeu ne sert à rien pour juger une teinte.
  const k = 0.78 + 0.72 * cs + 0.26 * cf;
  let r = ((col >> 16) & 255) * k, g = ((col >> 8) & 255) * k * 0.99, b = (col & 255) * k * 0.99;
  // Brouillard exponentiel de world.js (FogExp2, 0.0022, couleur 0xffeedd).
  const f = 1 - Math.exp(-Math.pow(dist * 0.0022, 2));
  r = r * (1 - f) + 0xff * f; g = g * (1 - f) + 0xee * f; b = b * (1 - f) + 0xdd * f;
  return [Math.min(255, r) | 0, Math.min(255, g) | 0, Math.min(255, b) | 0];
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
    const lit = shade(face.col, face.n, zAvg, sun, fillL);
    /* L'échantillonnage de texture se fait par pixel, mais l'ÉCLAIRAGE est
       calculé une fois par face (facettes plates, comme le reste de la
       planche) : on garde donc le rapport entre la couleur éclairée et la
       couleur brute, et on l'applique au texel. */
    const kr = lit[0] / Math.max(1, (face.col >> 16) & 255);
    const kg = lit[1] / Math.max(1, (face.col >> 8) & 255);
    const kb = lit[2] / Math.max(1, face.col & 255);
    const fogF = 1 - Math.exp(-Math.pow(zAvg * 0.0022, 2));
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
        const u0 = face.uv[0], u1 = face.uv[1], u2 = face.uv[2];
        const tu = w0 * u0[0] + w1 * u1[0] + w2 * u2[0];
        const tv = w0 * u0[1] + w1 * u1[1] + w2 * u2[1];
        const im = face.map, ip = im.ctx.pixels;
        const sx2 = ((Math.floor(tu * im.width) % im.width) + im.width) % im.width;
        const sy2 = ((Math.floor(tv * im.height) % im.height) + im.height) % im.height;
        const si = (sy2 * im.width + sx2) * 4;
        px[i] = Math.min(255, ip[si] * kr * (1 - fogF) + 0xff * fogF) | 0;
        px[i + 1] = Math.min(255, ip[si + 1] * kg * (1 - fogF) + 0xee * fogF) | 0;
        px[i + 2] = Math.min(255, ip[si + 2] * kb * (1 - fogF) + 0xdd * fogF) | 0;
      } else {
        px[i] = r; px[i + 1] = g; px[i + 2] = b;
      }
    }
  }
  return px;
}

/* ================================================================ SCÈNES == */
const W = 1200, H = 720;

function shot(name, sAt, uAt, steer, driftFake, label) {
  // On monte la scène une fois par planche : les tronçons construits dépendent
  // de la position, et on veut voir exactement ce que le joueur verrait là.
  World.init(makeCanvasEl(W, H));
  const slope = new Slope.SlopeGen();
  const sled = new Sled();
  const field = new Critters.Field();
  const cam = new ChaseCamera(World.camera);

  sled.s = sAt; sled.u = uAt; sled.v = 34;
  sled.heading = steer * 0.5;
  sled.drift = driftFake;
  sled.roll = -sled.heading * 0.55;
  sled.pitchVis = -Slope.pitchAt(sAt) * 0.5;

  const nodeIndex = Math.floor(sled.s / CFG.NODE_LEN);
  slope.ensureAhead(nodeIndex);
  for (const n of slope.nodes) World.buildNode(n);
  field.update(0.016, 1000, sled);
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

  const px = render(faces, cam, W, H, skyPx, skyImg.width, skyImg.height);
  const file = path.join(outDir, name + ".png");
  writePng(file, W, H, px);
  console.log(`  ${name}.png  — ${label}  (${faces.length} triangles, s=${sAt})`);
}

console.log("\n=== preview-luge — on regarde la descente ===\n");
shot("luge-depart", 60, 0, 0, 0, "le départ, vue d'ensemble");
shot("luge-virage", 420, -7, -1, 0.8, "un virage, luge en dérapage");
shot("luge-village", 1000, 2, 0.2, 0.1, "le hameau de pain d'épices");
shot("luge-gourmands", 700, 0, 0, 0, "une vague de gourmands");
shot("luge-hauteurs", 3400, 0, 0.4, 0.3, "les hauteurs, palier 4");
console.log("\nPlanches écrites dans public/candyluge/tools/out/.\n"
  + "⚠️ Ni particules, ni textures plaquées, ni transparence : voir l'en-tête.\n");
