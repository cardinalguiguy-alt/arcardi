/* =============================================================================
   tools/render-runner.js — RENDRE LE FUYARD ET LE REGARDER.
   -----------------------------------------------------------------------------
       node tools/render-runner.js        (écrit tools/out/runner-*.png)

   Zip 377. Le pendant, pour la 3D, de ce que le zip 376 a fait pour le
   pixel-art : on n'accepte pas de livrer une silhouette qu'on n'a pas vue.
   Les deux seules corrections de sprite de la session 376 (le manteau de
   Carla, les cartons de Leo) sont venues d'un rendu regardé, pas d'une
   relecture — et aucune des deux n'était devinable dans le code.

   Ici, le risque est le même en pire : le fermier du défi est un assemblage
   d'une trentaine de boîtes articulées, et rien dans le code ne dit à quoi il
   RESSEMBLE. Les pièces féminines ajoutées ce zip (cheveux longs, jupe évasée,
   jambes nues) sont posées à quelques centièmes d'unité près par-dessus un
   squelette qui n'était pas prévu pour elles : un débord, une jupe qui coupe
   les cuisses, des cheveux qui traversent les épaules ne produiraient AUCUNE
   erreur — juste un personnage un peu faux, ce qu'on ne remarque qu'en jouant.

   COMMENT. Un faux three.js qui retient les transformations, un calcul de
   matrices monde à la main, une projection orthographique et un remplissage
   de polygones par balayage, trié en profondeur (algorithme du peintre). Le
   PNG est écrit à la main (zlib + CRC), sans aucune dépendance — le registre
   npm est bloqué dans cet environnement, voir §3 du contexte.

   Ce n'est pas un rendu fidèle (pas de perspective, pas d'ombres portées, pas
   de brouillard) et ça n'a pas à l'être : on juge une SILHOUETTE et des
   COULEURS, ce qui est précisément ce que le zip modifie.
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const root = path.join(__dirname, "..");
const outDir = path.join(__dirname, "out");

/* ===================================================== FAUX THREE.JS ====== */
class V3 {
  constructor(x, y, z) { this.set(x || 0, y || 0, z || 0); }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  setScalar(k) { return this.set(k, k, k); }
  copy(v) { return this.set(v.x, v.y, v.z); }
  lerp(v, k) { this.x += (v.x - this.x) * k; this.y += (v.y - this.y) * k; this.z += (v.z - this.z) * k; return this; }
  lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
}
class Col {
  constructor(h) { this.h = typeof h === "number" ? h : 0; }
  lerp() { return this; } copy() { return this; } set() { return this; }
  setRGB() { return this; } setHex(h) { this.h = h; return this; }
}
class V2 { constructor(x, y) { this.x = x || 0; this.y = y || 0; } set(x, y) { this.x = x; this.y = y; return this; } }
class Obj3 {
  constructor() {
    this.position = new V3(); this.rotation = new V3(); this.scale = new V3(1, 1, 1);
    this.children = []; this.userData = {}; this.visible = true; this.parent = null;
  }
  add(o) { o.parent = this; this.children.push(o); }
  remove(o) { const i = this.children.indexOf(o); if (i >= 0) { this.children.splice(i, 1); o.parent = null; } }
  traverse(fn) { fn(this); for (const c of this.children) c.traverse(fn); }
  lookAt() {}
  // Zip 377 : les flammes appliquent un roulis APRÈS le billboard. Le faux
  // objet doit donc au moins connaître la méthode, sinon il fait échouer le
  // script sur une absence qui n'est pas un bug du jeu.
  rotateZ(a) { this.rotation.z += a; return this; } updateProjectionMatrix() {}
}
class Mat {
  constructor(o) { Object.assign(this, o); this.color = this.color instanceof Col ? this.color : new Col(this.color); }
  clone() { return new Mat(Object.assign({}, this)); }
}
const GEO = { box: "box", plane: "plane", cap: "cap", coin: "coin", sphere: "sphere" };
const THREE = {
  WebGLRenderer: class { setPixelRatio() {} setSize() {} render() {} },
  Scene: class extends Obj3 { constructor() { super(); this.fog = null; } },
  Color: Col, FogExp2: class { constructor(c) { this.color = new Col(c); } },
  PerspectiveCamera: class extends Obj3 { constructor() { super(); this.aspect = 1; } },
  AmbientLight: class extends Obj3 {}, DirectionalLight: class extends Obj3 {}, PointLight: class extends Obj3 {},
  // Le TYPE de géométrie est retenu : seules les boîtes sont rasterisées, le
  // reste (halos, flammes, pièces) n'appartient pas au personnage.
  BoxGeometry: class { constructor() { this.kind = GEO.box; } dispose() {} },
  OctahedronGeometry: class { constructor() { this.kind = GEO.coin; } dispose() {} },
  PlaneGeometry: class { constructor() { this.kind = GEO.plane; } dispose() {} },
  SphereGeometry: class { constructor() { this.kind = GEO.sphere; } dispose() {} },
  MeshLambertMaterial: Mat, MeshBasicMaterial: Mat,
  CanvasTexture: class { constructor(cv) { this.image = cv; this.repeat = new V2(1, 1); this.offset = new V2(0, 0); } },
  Mesh: class extends Obj3 { constructor(g, m) { super(); this.geometry = g; this.material = m; this.isMesh = true; this.renderOrder = 0; } },
  Group: class extends Obj3 {},
  Vector3: V3,
  DoubleSide: 2, BackSide: 1, FrontSide: 0,
  NearestFilter: 1003, RepeatWrapping: 1000, ClampToEdgeWrapping: 1001,
  AdditiveBlending: 2, NormalBlending: 1,
};

/* Faux canvas qui RETIENT ses pixels, contrairement à celui de
   smoke-render.js. C'est indispensable ici : les textures de flamme du zip 377
   sont peintes pixel par pixel via getImageData/putImageData, et un faux qui
   jette l'écriture rendrait la planche de flammes entièrement vide — sans rien
   signaler. On ne simule que ce dont on a besoin (le chemin ImageData) ; les
   tracés vectoriels restent des noop, ils ne servent qu'aux autres textures. */
function fakeCanvas(w, h) {
  const cv = { width: w || 0, height: h || 0 };
  let buf = null;
  const ensure = () => {
    const n = Math.max(0, cv.width * cv.height * 4);
    if (!buf || buf.length !== n) buf = new Uint8ClampedArray(n);
    return buf;
  };
  const noop = () => {};
  const ctx2d = {
    fillStyle: "", strokeStyle: "", lineWidth: 1, lineCap: "", globalAlpha: 1,
    fillRect: noop, strokeRect: noop, beginPath: noop, closePath: noop,
    moveTo: noop, lineTo: noop, arc: noop, ellipse: noop, fill: noop, stroke: noop,
    clearRect: () => { ensure().fill(0); },
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
    getImageData: (x, y, gw, gh) => ({ width: gw, height: gh, data: new Uint8ClampedArray(ensure()) }),
    putImageData: (img) => { ensure().set(img.data); },
  };
  cv.getContext = () => ctx2d;
  cv.pixels = () => ensure();
  return cv;
}

const ctx = vm.createContext({
  Math, console, JSON, THREE, Uint8ClampedArray,
  performance: { now: () => 0 },
  window: { innerWidth: 900, innerHeight: 900, addEventListener: () => {} },
  document: { getElementById: () => ({}), createElement: (t) => (t === "canvas" ? fakeCanvas() : {}) },
  Input: { consume: () => false, peek: () => false, clear() {} },
  module: {},
});
for (const f of ["js/config.js", "js/track.js", "js/player.js", "js/wolves.js", "js/camera.js", "js/world.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
}
const { CFG, World } = vm.runInContext("({ CFG, World })", ctx);
World.init({});

/* ================================================= MATRICES ET PROJECTION == */
function mul(a, b) {          // 4x4, ligne-major
  const r = new Array(16).fill(0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[i * 4 + k] * b[k * 4 + j];
    r[i * 4 + j] = s;
  }
  return r;
}
const ident = () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
/* Ordre d'Euler 'XYZ', celui de three.js par défaut : R = Rx · Ry · Rz.
   Se tromper d'ordre ne se verrait que sur les membres qui cumulent DEUX
   rotations — c'est-à-dire exactement le bras d'appui de la glissade et le
   buste du regard en arrière, les deux poses qu'on vient d'écrire. */
function localMatrix(o) {
  const { x: rx, y: ry, z: rz } = o.rotation;
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);
  const Rx = [1,0,0,0, 0,cx,-sx,0, 0,sx,cx,0, 0,0,0,1];
  const Ry = [cy,0,sy,0, 0,1,0,0, -sy,0,cy,0, 0,0,0,1];
  const Rz = [cz,-sz,0,0, sz,cz,0,0, 0,0,1,0, 0,0,0,1];
  const R = mul(mul(Rx, Ry), Rz);
  const S = [o.scale.x,0,0,0, 0,o.scale.y,0,0, 0,0,o.scale.z,0, 0,0,0,1];
  const T = [1,0,0,o.position.x, 0,1,0,o.position.y, 0,0,1,o.position.z, 0,0,0,1];
  return mul(T, mul(R, S));
}
function apply(m, p) {
  return {
    x: m[0] * p.x + m[1] * p.y + m[2] * p.z + m[3],
    y: m[4] * p.x + m[5] * p.y + m[6] * p.z + m[7],
    z: m[8] * p.x + m[9] * p.y + m[10] * p.z + m[11],
  };
}

/* Récolte des boîtes du personnage, en coordonnées MONDE. */
function collectBoxes(rootObj) {
  const out = [];
  (function walk(o, parentM) {
    if (!o.visible) return;
    const m = mul(parentM, localMatrix(o));
    if (o.isMesh && o.geometry && o.geometry.kind === GEO.box) {
      const c = [];
      for (const sx of [-0.5, 0.5]) for (const sy of [-0.5, 0.5]) for (const sz of [-0.5, 0.5]) {
        c.push(apply(m, { x: sx, y: sy, z: sz }));
      }
      // Indices des 8 coins : bit 2 = x, bit 1 = y, bit 0 = z.
      const F = [
        [4,5,7,6, [1,0,0]], [0,2,3,1, [-1,0,0]],
        [2,6,7,3, [0,1,0]], [0,1,5,4, [0,-1,0]],
        [1,3,7,5, [0,0,1]], [0,4,6,2, [0,0,-1]],
      ];
      // Normale MONDE d'une face : on transporte l'axe local par la matrice
      // (sans translation) — indispensable, les membres tournent.
      const dirOf = (n) => {
        const a = apply(m, { x: 0, y: 0, z: 0 });
        const b = apply(m, { x: n[0], y: n[1], z: n[2] });
        const v = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
        const L = Math.hypot(v.x, v.y, v.z) || 1;
        return { x: v.x / L, y: v.y / L, z: v.z / L };
      };
      /* Un matériau TEXTURÉ n'a pas de couleur propre (sa teinte vient de sa
         carte), et `color.h` y vaut donc 0 : rendus tels quels, le sol et les
         rambardes sortaient entièrement NOIRS et la planche ne montrait rien.
         On leur prête une pierre neutre — ce rasteriseur juge les VOLUMES, les
         textures se regardent avec tools/render-textures.js. */
      const col = o.material.color.h || 0x8a8272;
      for (const f of F) {
        out.push({ pts: [c[f[0]], c[f[1]], c[f[2]], c[f[3]]], n: dirOf(f[4]), col });
      }
    }
    for (const ch of o.children) walk(ch, m);
  })(rootObj, ident());
  return out;
}

/* ============================================================ RASTERISEUR = */
const BG = [0x12, 0x0a, 0x1f];
const LIGHT = (() => { const v = { x: -0.4, y: 1, z: 0.25 }; const L = Math.hypot(v.x, v.y, v.z); return { x: v.x / L, y: v.y / L, z: v.z / L }; })();

/* Rendu d'un jeu de faces. Deux modes :
     - ortho  : pour le fermier, qu'on juge en silhouette ;
     - persp  : pour la chaussée, qu'on doit voir COMME LE JOUEUR la voit —
                une rambarde jugée en projection orthographique ne dit rien de
                ce qu'on en perçoit depuis une caméra posée trois mètres
                derrière et quatre au-dessus. C'est précisément ce qu'il faut
                pour vérifier qu'une torche est bien FIXÉE et ne flotte pas.
   Les plans (flammes, halos, panneaux d'arbre) ne sont pas rendus : ce
   rasteriseur ne connaît que les boîtes, et c'est dit ici pour qu'on ne
   conclue pas de leur absence à un bug. */
function renderView(faces, view, W, H, scale, center) {
  const px = new Uint8Array(W * H * 3);
  for (let i = 0; i < W * H; i++) { px[i * 3] = BG[0]; px[i * 3 + 1] = BG[1]; px[i * 3 + 2] = BG[2]; }
  const zbuf = new Float64Array(W * H).fill(-1e9);

  const d = view.dir, up = view.up;
  // Repère caméra orthonormé. right = d × up (main droite), puis up corrigé.
  const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
  const norm = (v) => { const L = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / L, y: v.y / L, z: v.z / L }; };
  const dd = norm(d);
  const rr = norm(cross(dd, up));
  const uu = norm(cross(rr, dd));

  const persp = !!view.persp;
  const f = persp ? (H / 2) / Math.tan((view.fov || 1.2) / 2) : 0;
  const proj = (p) => {
    const q = { x: p.x - center.x, y: p.y - center.y, z: p.z - center.z };
    const along = q.x * dd.x + q.y * dd.y + q.z * dd.z;
    const right = q.x * rr.x + q.y * rr.y + q.z * rr.z;
    const up2 = q.x * uu.x + q.y * uu.y + q.z * uu.z;
    if (!persp) return { sx: W / 2 + right * scale, sy: H / 2 - up2 * scale, sz: -along };
    const z = Math.max(0.3, along);
    return { sx: W / 2 + (right / z) * f, sy: H / 2 - (up2 / z) * f, sz: -z, behind: along < 0.3 };
  };

  for (const f of faces) {
    const cosL = Math.max(0, f.n.x * LIGHT.x + f.n.y * LIGHT.y + f.n.z * LIGHT.z);
    // Ambiante violette + directionnelle froide, comme la scène réelle : sans
    // l'ambiante, les faces à l'ombre seraient noires et la silhouette
    // deviendrait illisible, ce qui n'est pas ce que le jeu montre.
    const k = 0.34 + 0.66 * cosL;
    const r = Math.min(255, Math.round((((f.col >> 16) & 255) * k) + 14));
    const g = Math.min(255, Math.round(((((f.col >> 8) & 255) * k)) + 8));
    const b = Math.min(255, Math.round((((f.col & 255) * k)) + 26));
    const P = f.pts.map(proj);
    // Une face qui passe derrière l'œil ne se découpe pas proprement : on la
    // saute plutôt que de la projeter à l'envers.
    if (P.some(p => p.behind)) continue;

    let minY = Math.max(0, Math.floor(Math.min(...P.map(p => p.sy))));
    let maxY = Math.min(H - 1, Math.ceil(Math.max(...P.map(p => p.sy))));
    for (let y = minY; y <= maxY; y++) {
      const yc = y + 0.5;
      const xs = [];
      for (let i = 0; i < 4; i++) {
        const a = P[i], bq = P[(i + 1) % 4];
        if ((a.sy <= yc && bq.sy > yc) || (bq.sy <= yc && a.sy > yc)) {
          const t = (yc - a.sy) / (bq.sy - a.sy);
          xs.push({ x: a.sx + t * (bq.sx - a.sx), z: a.sz + t * (bq.sz - a.sz) });
        }
      }
      if (xs.length < 2) continue;
      xs.sort((p, q) => p.x - q.x);
      for (let s = 0; s + 1 < xs.length; s += 2) {
        const x0 = Math.max(0, Math.ceil(xs[s].x - 0.5));
        const x1 = Math.min(W - 1, Math.floor(xs[s + 1].x + 0.5) - 1);
        for (let x = x0; x <= x1; x++) {
          const t = (xs[s + 1].x - xs[s].x) < 1e-9 ? 0 : (x + 0.5 - xs[s].x) / (xs[s + 1].x - xs[s].x);
          const z = xs[s].z + t * (xs[s + 1].z - xs[s].z);
          const idx = y * W + x;
          if (z <= zbuf[idx]) continue;      // tampon de profondeur, pas de tri
          zbuf[idx] = z;
          px[idx * 3] = r; px[idx * 3 + 1] = g; px[idx * 3 + 2] = b;
        }
      }
    }
  }
  return px;
}

/* ================================================================== PNG === */
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function writePng(file, W, H, rgb) {
  const raw = Buffer.alloc(H * (W * 3 + 1));
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;                       // filtre "None"
    Buffer.from(rgb.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]));
}

/* ============================================================= SCÉNARIO === */
const node0 = { dir: 0, length: 400, obstacles: [], coins: [], cracks: [] };
function stubPlayer(dist, escaping, lookT) {
  return {
    totalDist: dist, grounded: true, y: 0, laneOffset: 0, t: 10,
    escapeSide: 1, escapeStart: 0,
    get escaping() { return escaping; },
    node: () => node0,
    worldPos: () => ({ x: 0, y: 0, z: 0 }),
    slidePose: () => ({ k: 0, pop: 0, age: 0 }),
    escapePose: () => ({ k: lookT, look: lookT, fade: 0, breath: 0.8 }),
  };
}

const VIEWS = [
  // Vue de DOS : celle du joueur pendant 99 % de la partie. C'est ELLE qui
  // décide si le personnage se lit, pas une jolie vue de trois quarts.
  { name: "dos", dir: { x: 0, y: -0.30, z: -1 }, up: { x: 0, y: 1, z: 0 } },
  { name: "3/4", dir: { x: -0.75, y: -0.30, z: -1 }, up: { x: 0, y: 1, z: 0 } },
  { name: "profil", dir: { x: -1, y: -0.12, z: 0 }, up: { x: 0, y: 1, z: 0 } },
];

const VW = 260, VH = 360, SCALE = 118;
const CENTER = { x: 0, y: 1.05, z: 0 };

function sheet(file, skin, poses) {
  World.applySkin(skin);
  const W = VW * VIEWS.length, H = VH * poses.length;
  const out = new Uint8Array(W * H * 3);
  for (let i = 0; i < W * H; i++) { out[i * 3] = BG[0]; out[i * 3 + 1] = BG[1]; out[i * 3 + 2] = BG[2]; }

  poses.forEach((pose, row) => {
    World.updatePlayer(pose.player, pose.now);
    const faces = collectBoxes(World.playerMesh);
    VIEWS.forEach((v, col) => {
      const tile = renderView(faces, v, VW, VH, SCALE, CENTER);
      for (let y = 0; y < VH; y++) {
        for (let x = 0; x < VW; x++) {
          const s = (y * VW + x) * 3, dst = ((row * VH + y) * W + (col * VW + x)) * 3;
          out[dst] = tile[s]; out[dst + 1] = tile[s + 1]; out[dst + 2] = tile[s + 2];
        }
      }
    });
    // Séparateurs, pour que les cases ne se confondent pas à l'œil.
    for (let x = 0; x < W; x++) { const i = ((row * VH + VH - 1) * W + x) * 3; out[i] = 60; out[i + 1] = 45; out[i + 2] = 80; }
  });
  for (let y = 0; y < H; y++) for (const col of [1, 2]) {
    const i = (y * W + col * VW) * 3; out[i] = 60; out[i + 1] = 45; out[i + 2] = 80;
  }
  writePng(file, W, H, out);
  return { W, H };
}

fs.mkdirSync(outDir, { recursive: true });

/* Trois poses par planche : deux instants de foulée opposés (c'est là qu'une
   jupe qui coupe les cuisses se voit) et le regard en arrière de la sortie. */
const posesFor = () => [
  { player: stubPlayer(1.16, false, 0), now: 0 },            // appui pied gauche
  { player: stubPlayer(3.49, false, 0), now: 0 },            // appui pied droit
  { player: stubPlayer(5.0, true, 1), now: 850 },            // regard en arrière
];

const outputs = [];
for (const [label, skin] of [
  // Tenue 0 (bleue) en homme, tenue 1 (ROUGE) en femme : ce sont exactement
  // les deux cas cités par Guillaume — « personnage féminin = personnage
  // féminin, personnage aux habits rouges = personnage aux habits rouges ».
  ["homme-tenue0", { gender: "m", shirt: 0x3f7fd4, pants: 0x454f66, hair: 0x5a3a1e, skin: 0xf0c8a0 }],
  ["femme-tenue1", { gender: "f", shirt: 0xd44a3f, pants: 0x5a4632, hair: 0x2a2a2a, skin: 0xf0c8a0 }],
]) {
  const file = path.join(outDir, `runner-${label}.png`);
  const { W, H } = sheet(file, skin, posesFor());
  outputs.push(`${path.relative(root, file)} (${W}×${H})`);
}

/* =========================================================================
   PLANCHE DES FLAMMES (zip 377)
   -------------------------------------------------------------------------
   « Une vraie flamme plus travaillée » ne se relit pas dans du code : ça se
   regarde. On sort donc les quatre découpes de corps, les quatre cœurs, et
   surtout les COMPOSITES tels qu'ils apparaîtront à l'écran — corps en fondu
   normal, cœur en additif par-dessus, sur le fond du monde sombre, avec le
   haut du bâton pour juger de l'accroche.

   Les quatre colonnes doivent être visiblement DIFFÉRENTES entre elles : deux
   torches côte à côte partageant la même découpe se remarquent immédiatement
   en jeu, et c'est précisément ce que Guillaume a demandé d'éviter.
   ====================================================================== */
{
  const FW = 32, FH = 48, Z = 4;                 // zoom entier : on reste net
  const CW = FW * Z + 16, CH = FH * Z + 34;
  const bodies = World.materials.flameBody.map(m => m.map.image);
  const cores = World.materials.flameCore.map(m => m.map.image);
  const N = bodies.length;
  const W = CW * N, H = CH * 3;
  const px = new Uint8Array(W * H * 3);
  for (let i = 0; i < W * H; i++) { px[i * 3] = BG[0]; px[i * 3 + 1] = BG[1]; px[i * 3 + 2] = BG[2]; }

  const blit = (cv, col, row, additive) => {
    const src = cv.pixels();
    const ox = col * CW + 8, oy = row * CH + 10;
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      const s = (y * FW + x) * 4;
      const a = src[s + 3] / 255;
      if (a <= 0) continue;
      for (let dy = 0; dy < Z; dy++) for (let dx = 0; dx < Z; dx++) {
        const d = ((oy + y * Z + dy) * W + (ox + x * Z + dx)) * 3;
        for (let k = 0; k < 3; k++) {
          px[d + k] = additive
            ? Math.min(255, px[d + k] + src[s + k] * a)
            : px[d + k] * (1 - a) + src[s + k] * a;
        }
      }
    }
  };
  // Haut du bâton, pour juger de l'accroche de la flamme sur la mèche.
  const stick = (col, row) => {
    const ox = col * CW + 8 + (FW * Z) / 2, oy = row * CH + 10 + FH * Z;
    for (let y = 0; y < 22; y++) for (let x = -5; x <= 5; x++) {
      const d = ((oy + y) * W + (ox + x)) * 3;
      if (d < 0 || d + 2 >= px.length) continue;
      const c = y < 7 ? [20, 15, 10] : [36, 31, 26];
      px[d] = c[0]; px[d + 1] = c[1]; px[d + 2] = c[2];
    }
  };

  for (let i = 0; i < N; i++) {
    blit(bodies[i], i, 0, false);                       // corps seuls
    blit(cores[i], i, 1, true);                         // cœurs seuls
    blit(bodies[i], i, 2, false);                       // composite...
    blit(cores[(i + 2) % N], i, 2, true);               // ...avec le décalage réel d'addTorch
    stick(i, 2);
  }
  for (let y = 0; y < H; y++) for (let c = 1; c < N; c++) {
    const d = (y * W + c * CW) * 3; px[d] = 52; px[d + 1] = 40; px[d + 2] = 70;
  }
  const file = path.join(outDir, "torch-flames.png");
  writePng(file, W, H, px);
  outputs.push(`${path.relative(root, file)} (${W}×${H})`);
}

/* =========================================================================
   LA CHAUSSÉE EN 3D (zip 379)
   -------------------------------------------------------------------------
   Trois vues du même ouvrage, prises à la place exacte de la caméra de jeu :
   la chaussée de PIERRE du départ, l'HYBRIDE à mi-fondu, et la plateforme AA.

   C'est la seule façon de juger deux choses que Guillaume a demandées
   nommément : que la progression soit continue (les trois vues doivent se
   ressembler de proche en proche, pas se ranger en trois familles), et que
   les torches soient FIXÉES — une torche qui flotte se voit immédiatement de
   trois quarts arrière, et ne se voit nulle part ailleurs.

   Rappel : les plans ne sont pas rendus. Pas de flammes, pas de halos, pas de
   panneaux d'arbre sur ces vues — seulement la maçonnerie.
   ====================================================================== */
{
  const T = vm.runInContext("Track", ctx);
  const DW = 460, DH = 320;
  const shots = [];

  const shoot = (node, label) => {
    World.buildNode(node);
    const g = World.scene.children[World.scene.children.length - 1];
    const faces = collectBoxes(g);
    // Caméra de jeu : CAM_BACK derrière, CAM_HEIGHT au-dessus, visant
    // CAM_LOOK_AHEAD devant. On se place au tiers du tronçon pour avoir de la
    // pierre devant ET derrière.
    /* La caméra se pose DANS LE REPÈRE DU TRONÇON, jamais en supposant qu'il
       va vers -Z : dès le deuxième tronçon la piste a pu tourner, et l'oubli
       s'était soldé par deux vues sur trois entièrement noires. */
    const DIRS4 = [{ x: 0, z: -1 }, { x: 1, z: 0 }, { x: 0, z: 1 }, { x: -1, z: 0 }];
    const fw = DIRS4[node.dir & 3];
    const t0 = node.length * 0.34;
    const at = (t, y) => ({ x: node.ox + fw.x * t, y, z: node.oz + fw.z * t });
    const eye = at(t0 - CFG.CAM_BACK, CFG.CAM_HEIGHT);
    const tgt = at(t0 + CFG.CAM_LOOK_AHEAD, CFG.CAM_LOOK_HEIGHT);
    const d = { x: tgt.x - eye.x, y: tgt.y - eye.y, z: tgt.z - eye.z };
    const px = renderView(faces, { dir: d, up: { x: 0, y: 1, z: 0 }, persp: true, fov: CFG.CAM_FOV * Math.PI / 180 },
                          DW, DH, 1, eye);
    shots.push({ px, label });
    console.log(`   ${label.padEnd(9)} ${faces.length} faces, tronçon ${node.index} dir ${node.dir}`);
    World.dropNode(node);
  };

  /* Gros plan sur une torche : c'est LA vue qui dit si elle est fixée ou
     posée. De loin, un mât planté dans le vide et un mât scellé sur un pilier
     se ressemblent — c'est de trois mètres, de trois quarts, qu'on voit la
     différence, et c'est exactement le grief de Guillaume. */
  const closeUp = (node, label) => {
    World.buildNode(node);
    const g = World.scene.children[World.scene.children.length - 1];
    const faces = collectBoxes(g);
    const DIRS4 = [{ x: 0, z: -1 }, { x: 1, z: 0 }, { x: 0, z: 1 }, { x: -1, z: 0 }];
    const fw = DIRS4[node.dir & 3], rt = DIRS4[(node.dir + 1) & 3];
    const tt = 30;                       // une torche y est posée (t = 8 + 22)
    const P = (t, o, y) => ({ x: node.ox + fw.x * t + rt.x * o, y, z: node.oz + fw.z * t + rt.z * o });
    // Depuis l'AUTRE rive de la chaussée, en biais : le pilier, le muret et le
    // mât se détachent les uns des autres, ce qu'aucune vue de face ne donne.
    const eye = P(tt - 11, -10, 4.6);
    const tgt = P(tt, CFG.TRACK_WIDTH / 2 + 0.75, 0.9);
    const px = renderView(faces, { dir: { x: tgt.x - eye.x, y: tgt.y - eye.y, z: tgt.z - eye.z },
                                   up: { x: 0, y: 1, z: 0 }, persp: true, fov: 0.9 },
                          DW, DH, 1, eye);
    shots.push({ px, label });
    World.dropNode(node);
  };

  const gen = new T.TrackGen(4242);
  // Tronçon 1 : plein dans la pierre. On force ensuite le fondu en fabriquant
  // des tronçons dont le `stoneEnd` place la caméra où l'on veut.
  const stone = gen.nodes[1];
  shoot(stone, "pierre");
  const mid = gen.nodes[2];
  mid.stoneEnd = mid.startDist + mid.length * 0.34 - CFG.DECOR_BLEND_LEN * 0.5;
  shoot(mid, "hybride");
  const aa = gen.nodes[3];
  aa.stoneEnd = 0;
  shoot(aa, "AA");
  closeUp(gen.nodes[1], "torche pierre");
  const aa2 = gen.nodes[2];
  aa2.stoneEnd = 0;
  closeUp(aa2, "torche AA");

  const cols = Math.min(3, shots.length);
  const rowsN = Math.ceil(shots.length / cols);
  const W = DW * cols, H = DH * rowsN;
  const out = new Uint8Array(W * H * 3);
  shots.forEach((s, i) => {
    const cx = (i % cols) * DW, cy = Math.floor(i / cols) * DH;
    for (let y = 0; y < DH; y++) for (let x = 0; x < DW; x++) {
      const a = (y * DW + x) * 3, b = ((cy + y) * W + cx + x) * 3;
      out[b] = s.px[a]; out[b + 1] = s.px[a + 1]; out[b + 2] = s.px[a + 2];
    }
  });
  for (let y = 0; y < H; y++) for (let i = 1; i < cols; i++) {
    const k = (y * W + i * DW) * 3; out[k] = 60; out[k + 1] = 45; out[k + 2] = 80;
  }
  for (let x = 0; x < W; x++) for (let r = 1; r < rowsN; r++) {
    const k = (r * DH * W + x) * 3; out[k] = 60; out[k + 1] = 45; out[k + 2] = 80;
  }
  const file = path.join(outDir, "deck-progression.png");
  writePng(file, W, H, out);
  outputs.push(`${path.relative(root, file)} (${W}×${H}) — ${shots.map(s => s.label).join(" / ")}`);
}

console.log("Planches écrites — À REGARDER, pas seulement à générer :");
for (const o of outputs) console.log("  " + o);
console.log("\nDisposition : colonnes = dos / trois quarts / profil ; lignes = foulée gauche, foulée droite, regard en arrière.");
