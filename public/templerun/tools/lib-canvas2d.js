/* =============================================================================
   tools/lib-canvas2d.js — Un canvas 2D et un encodeur PNG, sans dépendance.
   -----------------------------------------------------------------------------
   Zip 379b. Le seul fichier PARTAGÉ entre les outils, et il l'est pour une
   raison précise : deux d'entre eux ont besoin de RASTERISER les textures que
   world.js peint au démarrage — render-textures.js pour les montrer telles
   quelles, render-runner.js pour connaître leur valeur moyenne et rendre la
   chaussée avec la bonne teinte.

   Le duplicat était déjà là, et il a coûté : tant que render-runner.js avait
   son faux canvas au rabais (des `noop` à la place des tracés), toutes les
   pierres qu'il rendait étaient NOIRES, et la planche 3D ne disait rien de ce
   que Guillaume voyait à l'écran. Un outil qui ne montre pas ce qu'on juge est
   pire qu'un outil absent : il rassure.

   Le registre npm étant bloqué (§3 du contexte), pas de paquet `canvas` ni de
   `pngjs`. On implémente le sous-ensemble réellement employé par world.js :
   fillRect, clearRect, strokeRect, les deux dégradés, les tracés (moveTo,
   lineTo, arc, ellipse, fill, stroke), globalAlpha et le couple
   getImageData/putImageData. Rien de plus, et c'est vérifié : le rendu de la
   chaussée 2D refuse déjà tout ce qui sortirait de fillRect.
   ========================================================================== */

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
  const px = new Float64Array(W * H * 4);        // RGB + couverture alpha
  let path = [], cur = null;

  const grad = (kind, a) => ({
    __grad: true, kind, a, stops: [],
    addColorStop(p, c) { this.stops.push([p, parseColor(c)]); },
  });

  const sample = (g, x, y) => {
    let t;
    if (g.kind === "linear") {
      const [x0, y0, x1, y1] = g.a;
      const dx = x1 - x0, dy = y1 - y0;
      t = ((x - x0) * dx + (y - y0) * dy) / ((dx * dx + dy * dy) || 1);
    } else {
      const [, , r0, x1, y1, r1] = g.a;
      t = (Math.hypot(x - x1, y - y1) - r0) / ((r1 - r0) || 1);
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
    fillStyle: "#000", strokeStyle: "#000", lineWidth: 1, lineCap: "", globalAlpha: 1, canvas: null,

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
      const x0 = Math.round(x), y0 = Math.round(y), x1 = Math.round(x + w), y1 = Math.round(y + h);
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
      const save = this.fillStyle; this.fillStyle = this.strokeStyle;
      this.fillRect(x, y, w, this.lineWidth); this.fillRect(x, y + h - this.lineWidth, w, this.lineWidth);
      this.fillRect(x, y, this.lineWidth, h); this.fillRect(x + w - this.lineWidth, y, this.lineWidth, h);
      this.fillStyle = save;
    },

    createLinearGradient(x0, y0, x1, y1) { return grad("linear", [x0, y0, x1, y1]); },
    createRadialGradient(x0, y0, r0, x1, y1, r1) { return grad("radial", [x0, y0, r0, x1, y1, r1]); },

    beginPath() { path = []; cur = null; },
    closePath() { if (cur && cur.length) cur.closed = true; },
    moveTo(x, y) { cur = [[x, y]]; cur.closed = false; path.push(cur); },
    lineTo(x, y) { if (!cur) this.moveTo(x, y); else cur.push([x, y]); },
    arc(cx, cy, r, a0, a1) {
      const n = Math.max(8, Math.round(r * 2)), pts = [];
      for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
      pts.closed = true; path.push(pts); cur = pts;
    },
    ellipse(cx, cy, rx, ry, rot, a0, a1) {
      const n = Math.max(10, Math.round(rx + ry)), pts = [];
      for (let i = 0; i <= n; i++) {
        const a = a0 + (a1 - a0) * (i / n), x = Math.cos(a) * rx, y = Math.sin(a) * ry;
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
            this.fillRect(Math.round(a[0] + (b[0] - a[0]) * k / steps) - (w >> 1),
                          Math.round(a[1] + (b[1] - a[1]) * k / steps) - (w >> 1), w, w);
          }
        }
      }
      this.fillStyle = save;
    },

    getImageData(x, y, gw, gh) {
      const d = new Uint8ClampedArray(gw * gh * 4);
      for (let yy = 0; yy < gh; yy++) for (let xx = 0; xx < gw; xx++) {
        const s = ((y + yy) * W + (x + xx)) * 4, t = (yy * gw + xx) * 4;
        d[t] = px[s]; d[t + 1] = px[s + 1]; d[t + 2] = px[s + 2]; d[t + 3] = px[s + 3] * 255;
      }
      return { width: gw, height: gh, data: d };
    },
    putImageData(img, dx, dy) {
      for (let yy = 0; yy < img.height; yy++) for (let xx = 0; xx < img.width; xx++) {
        if (dx + xx >= W || dy + yy >= H) continue;
        const s = (yy * img.width + xx) * 4, t = ((dy + yy) * W + (dx + xx)) * 4;
        px[t] = img.data[s]; px[t + 1] = img.data[s + 1];
        px[t + 2] = img.data[s + 2]; px[t + 3] = img.data[s + 3] / 255;
      }
    },
  };
  ctx.pixels = px;
  return ctx;
}

/* Canvas paresseux : world.js crée l'élément PUIS lui donne ses dimensions,
   donc on ne peut pas allouer avant le premier getContext. */
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

/* Couleur MOYENNE d'une texture, pondérée par l'alpha. C'est elle qui donne sa
   valeur à une boîte dans le rendu 3D des outils : sans texture réelle, la
   pierre sortait noire et la planche ne montrait rien de ce qu'on juge. */
function avgColor(cv, fallback) {
  if (!cv || !cv.ctx || !cv.width) return fallback;
  const p = cv.ctx.pixels;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < cv.width * cv.height; i++) {
    const a = p[i * 4 + 3];
    if (a <= 0.01) continue;
    r += p[i * 4] * a; g += p[i * 4 + 1] * a; b += p[i * 4 + 2] * a; n += a;
  }
  if (!n) return fallback;
  return ((Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n)) >>> 0;
}

/* ------------------------------------------------------------------ PNG --- */
const zlib = require("zlib");
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
    raw[y * (W * 3 + 1)] = 0;
    for (let x = 0; x < W * 3; x++) raw[y * (W * 3 + 1) + 1 + x] = rgb[y * W * 3 + x];
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  require("fs").writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]));
}

module.exports = { makeCanvas2D, fakeCanvas, avgColor, writePng, parseColor };
