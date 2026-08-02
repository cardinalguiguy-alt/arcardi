/* =============================================================================
   tools/preview-sky.js — CE QU'ON VOIT VRAIMENT DU CIEL.        (NEUF AU 400)
   -----------------------------------------------------------------------------
   render-textures.js montre le dôme À PLAT, en entier : 1024×512. C'est utile
   pour juger un dessin, et c'est TROMPEUR pour juger un cadrage — parce que le
   joueur n'en voit jamais qu'une lanière.

   ⚠️ CE QUE CE SCRIPT A TROUVÉ, ET QUE QUATRE ZIPS N'AVAIENT PAS VU. Guillaume,
   au 400 : « au dessus des montagnes s'affichent des triangles retournés
   oranges (…) la teinte doit être ENTRE les montagnes, pas partir de leur
   cime ». Le zip 383 avait cherché du côté de la COULEUR et désaturé la bande
   chaude. Le défaut est resté, parce qu'il n'était pas dans la couleur :

     * la caméra est à CAM_HEIGHT et vise CAM_LOOK_HEIGHT à CAM_LOOK_AHEAD,
       soit un tangage de -17,3°, avec un champ vertical de CAM_FOV = 72° ;
     * **le joueur ne voit donc que les lignes 203 à 266 du dôme** — 63 lignes
       sur 512, soit 12 % du dessin ;
     * la chaîne LOINTAINE monte jusqu'à la ligne 132 : **ses sommets sont hors
       écran**. On n'en voit que les versants, qui se croisent deux à deux et
       dessinent des V pointe en bas ;
     * et la bande chaude, peinte AVANT le relief, se voyait dans ces V.

   Une planche à plat ne peut pas montrer ça : sur elle, les sommets sont bien
   visibles et les V se lisent comme des cols normaux. Il fallait DÉCOUPER la
   lanière et l'étirer aux proportions de l'écran. C'est tout ce que fait ce
   script, et ça a suffi.

   ⚠️ CE QU'IL NE PROUVE PAS. Ce n'est pas une capture du jeu : pas de jetée,
   pas de brouillard, pas de lac, pas de torches, et la projection sphérique
   est approchée par un simple étirement vertical (l'erreur est de quelques
   pour cent sur 63 lignes, et elle ne déplace aucune silhouette). Il montre
   OÙ SE TROUVENT LES CHOSES dans le cadre, et c'est exactement la question
   qu'on n'arrivait pas à poser.

   Usage :  node tools/preview-sky.js        (écrit tools/out/ciel-cadre.png)
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const root = path.join(__dirname, "..");
const outDir = path.join(__dirname, "out");

/* ==================================================== RASTERISEUR 2D ====== */
function parseColor(s) {
  if (s && typeof s === "object" && s.__grad) return s;
  if (typeof s !== "string") return [255, 0, 255, 1];
  if (s[0] === "#") {
    const h = s.slice(1);
    const v = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h.slice(0, 6), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255, h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1];
  }
  const m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.-]+)\s*)?\)$/);
  if (!m) return [255, 0, 255, 1];
  return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
}

function makeCanvas2D(W, H) {
  const px = new Float64Array(W * H * 4);        // RGBA prémultipliée par alpha
  let path = [];                                  // liste de sous-chemins (tableaux de points)
  let cur = null;

  const grad = (kind, a) => ({
    __grad: true, kind, a, stops: [],
    addColorStop(p, c) { this.stops.push([p, parseColor(c)]); },
  });

  const sample = (g, x, y) => {
    let t;
    if (g.kind === "linear") {
      const [x0, y0, x1, y1] = g.a;
      const dx = x1 - x0, dy = y1 - y0;
      const len2 = dx * dx + dy * dy || 1;
      t = ((x - x0) * dx + (y - y0) * dy) / len2;
    } else {
      const [x0, y0, r0, x1, y1, r1] = g.a;
      const d = Math.hypot(x - x1, y - y1);
      t = (d - r0) / ((r1 - r0) || 1);
      void x0; void y0;
    }
    t = Math.max(0, Math.min(1, t));
    const st = g.stops;
    if (!st.length) return [0, 0, 0, 0];
    if (t <= st[0][0]) return st[0][1];
    for (let i = 0; i < st.length - 1; i++) {
      if (t >= st[i][0] && t <= st[i + 1][0]) {
        const k = (t - st[i][0]) / ((st[i + 1][0] - st[i][0]) || 1);
        const a = st[i][1], b = st[i + 1][1];
        return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k,
                a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k];
      }
    }
    return st[st.length - 1][1];
  };

  const ctx = {
    fillStyle: "#000", strokeStyle: "#000", lineWidth: 1, lineCap: "", globalAlpha: 1,
    canvas: null,

    _put(x, y, c) {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const a = Math.max(0, Math.min(1, c[3] * this.globalAlpha));
      if (a <= 0) return;
      const k = (y * W + x) * 4;
      px[k] += (c[0] - px[k]) * a;
      px[k + 1] += (c[1] - px[k + 1]) * a;
      px[k + 2] += (c[2] - px[k + 2]) * a;
      px[k + 3] += (1 - px[k + 3]) * a;
    },
    _paint(x, y, style) {
      const c = parseColor(style);
      this._put(x, y, c.__grad ? sample(c, x + 0.5, y + 0.5) : c);
    },

    fillRect(x, y, w, h) {
      const x0 = Math.round(x), y0 = Math.round(y);
      const x1 = Math.round(x + w), y1 = Math.round(y + h);
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) this._paint(xx, yy, this.fillStyle);
    },
    clearRect(x, y, w, h) {
      const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
      const x1 = Math.min(W, Math.round(x + w)), y1 = Math.min(H, Math.round(y + h));
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const k = (yy * W + xx) * 4; px[k] = px[k + 1] = px[k + 2] = px[k + 3] = 0;
      }
    },
    strokeRect(x, y, w, h) {
      this.fillStyle = this.strokeStyle;
      this.fillRect(x, y, w, this.lineWidth); this.fillRect(x, y + h - this.lineWidth, w, this.lineWidth);
      this.fillRect(x, y, this.lineWidth, h); this.fillRect(x + w - this.lineWidth, y, this.lineWidth, h);
    },

    createLinearGradient(x0, y0, x1, y1) { return grad("linear", [x0, y0, x1, y1]); },
    createRadialGradient(x0, y0, r0, x1, y1, r1) { return grad("radial", [x0, y0, r0, x1, y1, r1]); },

    beginPath() { path = []; cur = null; },
    closePath() { if (cur && cur.length) cur.closed = true; },
    moveTo(x, y) { cur = [[x, y]]; cur.closed = false; path.push(cur); },
    lineTo(x, y) { if (!cur) this.moveTo(x, y); else cur.push([x, y]); },
    arc(cx, cy, r, a0, a1) {
      const n = Math.max(8, Math.round(r * 2));
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const a = a0 + (a1 - a0) * (i / n);
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      pts.closed = true; path.push(pts); cur = pts;
    },
    ellipse(cx, cy, rx, ry, rot, a0, a1) {
      const n = Math.max(10, Math.round((rx + ry)));
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const a = a0 + (a1 - a0) * (i / n);
        const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
        pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
      }
      pts.closed = true; path.push(pts); cur = pts;
    },
    fill() {
      for (const poly of path) {
        if (poly.length < 3) continue;
        let minY = Infinity, maxY = -Infinity;
        for (const p of poly) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
        for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(H - 1, Math.ceil(maxY)); y++) {
          const yc = y + 0.5, xs = [];
          for (let i = 0; i < poly.length; i++) {
            const a = poly[i], b = poly[(i + 1) % poly.length];
            if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) {
              xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
            }
          }
          xs.sort((p, q) => p - q);
          for (let i = 0; i + 1 < xs.length; i += 2) {
            for (let x = Math.max(0, Math.ceil(xs[i] - 0.5)); x <= Math.min(W - 1, Math.floor(xs[i + 1] - 0.5)); x++) {
              this._paint(x, y, this.fillStyle);
            }
          }
        }
      }
    },
    stroke() {
      const w = Math.max(1, Math.round(this.lineWidth));
      const save = this.fillStyle; this.fillStyle = this.strokeStyle;
      for (const poly of path) {
        const n = poly.closed ? poly.length : poly.length - 1;
        for (let i = 0; i < n; i++) {
          const a = poly[i], b = poly[(i + 1) % poly.length];
          const steps = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1])));
          for (let k = 0; k <= steps; k++) {
            const x = a[0] + (b[0] - a[0]) * k / steps, y = a[1] + (b[1] - a[1]) * k / steps;
            this.fillRect(Math.round(x) - (w >> 1), Math.round(y) - (w >> 1), w, w);
          }
        }
      }
      this.fillStyle = save;
    },

    getImageData(x, y, gw, gh) {
      const d = new Uint8ClampedArray(gw * gh * 4);
      for (let yy = 0; yy < gh; yy++) for (let xx = 0; xx < gw; xx++) {
        const s = ((y + yy) * W + (x + xx)) * 4, t = (yy * gw + xx) * 4;
        const a = px[s + 3];
        // Dé-prémultiplication : getImageData rend des couleurs droites.
        d[t] = a > 0 ? px[s] : 0; d[t + 1] = a > 0 ? px[s + 1] : 0;
        d[t + 2] = a > 0 ? px[s + 2] : 0; d[t + 3] = a * 255;
      }
      return { width: gw, height: gh, data: d };
    },
    putImageData(img, dx, dy) {
      for (let yy = 0; yy < img.height; yy++) for (let xx = 0; xx < img.width; xx++) {
        const s = (yy * img.width + xx) * 4, t = ((dy + yy) * W + (dx + xx)) * 4;
        if (dx + xx >= W || dy + yy >= H) continue;
        px[t] = img.data[s]; px[t + 1] = img.data[s + 1];
        px[t + 2] = img.data[s + 2]; px[t + 3] = img.data[s + 3] / 255;
      }
    },
  };
  ctx.pixels = px;
  return ctx;
}

function fakeCanvas(w, h) {
  const cv = { width: w || 0, height: h || 0 };
  let ctx = null;
  cv.getContext = () => {
    if (!ctx || ctx.__w !== cv.width || ctx.__h !== cv.height) {
      ctx = makeCanvas2D(cv.width, cv.height);
      ctx.__w = cv.width; ctx.__h = cv.height; ctx.canvas = cv;
      cv.ctx = ctx;
    }
    return ctx;
  };
  return cv;
}

/* ============================================================= FAUX THREE == */
class V3 { constructor(x, y, z) { this.set(x || 0, y || 0, z || 0); } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } setScalar(k) { return this.set(k, k, k); } copy(v) { return this.set(v.x, v.y, v.z); } lerp() { return this; } lengthSq() { return 1; } }
class Col { constructor(h) { this.h = h || 0; } lerp() { return this; } copy() { return this; } set() { return this; } setRGB() { return this; } setHex(h) { this.h = h; return this; } }
class V2 { constructor(x, y) { this.x = x || 0; this.y = y || 0; } set(x, y) { this.x = x; this.y = y; return this; } }
class Obj3 {
  constructor() { this.position = new V3(); this.rotation = new V3(); this.scale = new V3(1, 1, 1); this.children = []; this.userData = {}; this.visible = true; this.parent = null; }
  add(o) { o.parent = this; this.children.push(o); } remove() {} traverse(fn) { fn(this); for (const c of this.children) c.traverse(fn); }
  lookAt() {} rotateZ() { return this; } updateProjectionMatrix() {}
}
class Mat { constructor(o) { Object.assign(this, o); this.color = this.color instanceof Col ? this.color : new Col(this.color); } clone() { return new Mat(Object.assign({}, this)); } }
const THREE = {
  WebGLRenderer: class { setPixelRatio() {} setSize() {} render() {} },
  Scene: class extends Obj3 { constructor() { super(); this.fog = null; } },
  Color: Col, FogExp2: class { constructor(c) { this.color = new Col(c); } },
  PerspectiveCamera: class extends Obj3 { constructor() { super(); this.aspect = 1; } },
  AmbientLight: class extends Obj3 {}, DirectionalLight: class extends Obj3 {}, PointLight: class extends Obj3 {},
  BoxGeometry: class { dispose() {} }, OctahedronGeometry: class { dispose() {} },
  PlaneGeometry: class { dispose() {} }, SphereGeometry: class { dispose() {} },
  MeshLambertMaterial: Mat, MeshBasicMaterial: Mat,
  CanvasTexture: class { constructor(cv) { this.image = cv; this.repeat = new V2(1, 1); this.offset = new V2(0, 0); } },
  Mesh: class extends Obj3 { constructor(g, m) { super(); this.geometry = g; this.material = m; this.isMesh = true; this.renderOrder = 0; } },
  Group: class extends Obj3 {}, Vector3: V3,
  DoubleSide: 2, BackSide: 1, FrontSide: 0,
  NearestFilter: 1003, RepeatWrapping: 1000, ClampToEdgeWrapping: 1001,
  AdditiveBlending: 2, NormalBlending: 1,
};

const ctx = vm.createContext({
  Math, console, JSON, THREE, Uint8ClampedArray,
  performance: { now: () => 0 },
  window: { innerWidth: 1280, innerHeight: 720, addEventListener: () => {} },
  document: { getElementById: () => ({}), createElement: (t) => (t === "canvas" ? fakeCanvas() : {}) },
  Input: { consume: () => false, peek: () => false, clear() {} },
  module: {},
});
for (const f of ["js/config.js", "js/track.js", "js/player.js", "js/wolves.js", "js/camera.js", "js/world.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
}
const { CFG, World } = vm.runInContext("({ CFG, World })", ctx);
World.init({});

/* ================================================================== PNG === */
function crc32(buf) { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = c ^ (crc >>> 8); } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0); const td = Buffer.concat([Buffer.from(type, "ascii"), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0); return Buffer.concat([len, td, crc]); }
function writePng(file, W, H, rgb) {
  const raw = Buffer.alloc(H * (W * 3 + 1));
  for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; for (let x = 0; x < W * 3; x++) raw[y * (W * 3 + 1) + 1 + x] = rgb[y * W * 3 + x]; }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]));
}

/* ============================================================== PLANCHES === */
fs.mkdirSync(outDir, { recursive: true });
const BG = [16, 10, 26];
const outputs = [];

// Compose une image d'un canvas peint, sur fond sombre, avec un zoom entier.


/* ======================================================= LE CADRAGE ======= */
const M = World.materials;

/* Le tangage de la caméra, LU dans config.js et jamais réécrit ici : deux
   descriptions d'une même chose finissent toujours par diverger (zip 387). */
const pitchDeg = Math.atan2(CFG.CAM_LOOK_HEIGHT - CFG.CAM_HEIGHT, CFG.CAM_LOOK_AHEAD) * 180 / Math.PI;
const halfFov = CFG.CAM_FOV / 2;
const elevTop = pitchDeg + halfFov;
const elevBot = pitchDeg - halfFov;

/* Élévation -> ligne du canvas. Sur une SphereGeometry de three.js, uv.y vaut 1
   au pôle NORD et 0 au pôle SUD ; une CanvasTexture a flipY à vrai, donc la
   ligne 0 du canvas atterrit au zénith. La ligne cherchée vaut donc
   (theta/180)*H, avec theta l'angle depuis le zénith. */
const H_TEX = 512, W_TEX = 1024;
const rowOf = (elev) => ((90 - elev) / 180) * H_TEX;

const rowTop = Math.max(0, Math.floor(rowOf(elevTop)));
const rowBot = Math.min(H_TEX, Math.ceil(rowOf(0)) + 26);   // un peu sous l'horizon vrai
const bandH = rowBot - rowTop;

const VW = 720, VH = Math.round(VW * 9 / 16);

function frame(cv, label) {
  /* Le tampon du faux canvas vit dans `cv.ctx.pixels`, en RGBA prémultipliée
     par l'alpha — même accès que blitCanvas de render-textures.js. */
  const src = cv.ctx.pixels;
  const out = new Uint8Array(VW * VH * 3);
  for (let y = 0; y < VH; y++) {
    const sy = Math.min(H_TEX - 1, rowTop + Math.floor((y / VH) * bandH));
    for (let x = 0; x < VW; x++) {
      const sx = Math.min(W_TEX - 1, Math.floor((x / VW) * W_TEX));
      const k = (sy * W_TEX + sx) * 4, o = (y * VW + x) * 3;
      out[o] = src[k]; out[o + 1] = src[k + 1]; out[o + 2] = src[k + 2];
    }
  }
  /* Le trait de l'horizon PEINT (ligne 266) : c'est le repère qui manquait.
     Tout ce qui est chaud AU-DESSUS de lui et hors des cols est le défaut. */
  const hy = Math.round(((H_TEX * 0.52) - rowTop) / bandH * VH);
  for (let x = 0; x < VW; x += 8) {
    for (let d = 0; d < 4; d++) {
      const o = ((hy + 0) * VW + x + d) * 3;
      if (o >= 0 && o + 2 < out.length) { out[o] = 90; out[o + 1] = 255; out[o + 2] = 120; }
    }
  }
  void label;
  return out;
}

const parts = [
  { cv: M.skyTex.image, label: "nuit" },
  { cv: M.skyDayTex.image, label: "jour" },
];
const PAD = 8;
const OW = VW, OH = parts.length * VH + (parts.length + 1) * PAD;
const buf = new Uint8Array(OW * OH * 3).fill(18);
parts.forEach((p, i) => {
  const img = frame(p.cv, p.label);
  const oy = PAD + i * (VH + PAD);
  for (let y = 0; y < VH; y++) {
    for (let x = 0; x < VW; x++) {
      const s = (y * VW + x) * 3, d = ((oy + y) * OW + x) * 3;
      buf[d] = img[s]; buf[d + 1] = img[s + 1]; buf[d + 2] = img[s + 2];
    }
  }
});
const file = path.join(outDir, "ciel-cadre.png");
writePng(file, OW, OH, buf);

console.log(`
Tangage de la caméra : ${pitchDeg.toFixed(1)}°   champ vertical : ${CFG.CAM_FOV}°
Élévations visibles  : ${elevBot.toFixed(1)}° .. ${elevTop.toFixed(1)}°
LIGNES DU DÔME VUES  : ${rowTop} .. ${rowBot}  (sur 512, soit ${(100 * bandH / H_TEX).toFixed(0)} %)
Horizon peint        : ligne ${Math.round(H_TEX * 0.52)}  — trait vert sur la planche

  ${path.relative(root, file)} (${OW}×${OH}) — haut : nuit, bas : jour

⚠️ Ce n'est PAS une capture du jeu : ni jetée, ni brouillard, ni lac, ni
torches, et la sphère est approchée par un étirement vertical. Il montre OÙ
sont les choses dans le cadre. Tout ce qui est chaud au-dessus du trait vert,
ailleurs que dans un col, est le défaut du 400.
`);
