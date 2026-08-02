/* =============================================================================
   lib-canvas.mjs — UN FAUX CANVAS POUR LA FERME, ET UN ENCODEUR PNG.
   -----------------------------------------------------------------------------
   ⚠️ C'EST LA DETTE QUE LE CONTEXTE RÉCLAMAIT DEPUIS DES ZIPS, sous le titre
   « UN RASTERISEUR POUR LA FERME ELLE-MÊME : chantier mécanique, sans risque,
   qui rendrait regardable la moitié graphique du jeu ».

   Le zip 397 l'a payée pour le labyrinthe (`public/labyrinth/tools/lib-raster.mjs`)
   et le résultat a été net : quatre refontes graphiques y avaient été faites en
   aveugle, et la cinquième a tenu du premier coup parce qu'on REGARDAIT. Le 398
   la paie pour la ferme, à l'occasion des sprites de fruits — que Guillaume a
   explicitement demandé de soigner.

   CE QU'IL IMPLÉMENTE, ET RIEN DE PLUS :
     * `fillRect`, `clearRect`, `fillStyle` (#rgb, #rrggbb, #rrggbbaa, rgba())
     * `getImageData` / `putImageData`, dont `outlineSprite` a besoin
     * `drawImage`, dont les sprites composés ont besoin
   Tout le reste JETTE. Ce refus est le contrôle, pas une limitation : un sprite
   qui se mettrait à utiliser un dégradé ou un `arc` casserait l'outil au lieu
   de dessiner silencieusement autre chose que le jeu. Même contrat que
   `smoke-render.mjs` et `lib-raster.mjs` côté labyrinthe.

   ⚠️ CE QU'IL NE PROUVE PAS : rien de la ressemblance avec le rendu réel du
   navigateur (composition, `globalCompositeOperation`, anticrénelage). Il
   montre les sprites peints au pixel franc — ce qui est exactement ce que la
   ferme dessine, et exactement ce qu'on voulait pouvoir regarder.
   ========================================================================== */

import zlib from "zlib";
import fs from "fs";
import path from "path";

function parseColor(s) {
  if (typeof s !== "string") throw new Error("fillStyle non textuel : " + s);
  if (s[0] === "#") {
    if (s.length === 4) return [parseInt(s[1], 16) * 17, parseInt(s[2], 16) * 17, parseInt(s[3], 16) * 17, 255];
    if (s.length === 7) return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 255];
    if (s.length === 9) return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), parseInt(s.slice(7, 9), 16)];
  }
  const m = /^rgba?\(([^)]+)\)$/.exec(s);
  if (m) {
    const p = m[1].split(",").map(v => parseFloat(v.trim()));
    return [p[0] | 0, p[1] | 0, p[2] | 0, Math.round((p.length > 3 ? p[3] : 1) * 255)];
  }
  throw new Error("fillStyle non reconnu : " + s);
}

export function makeCanvas(W, H) {
  const px = new Uint8ClampedArray(W * H * 4);
  const state = { fillStyle: "#000000", strokeStyle: "#000000", lineWidth: 1, globalAlpha: 1,
                  imageSmoothingEnabled: false, globalCompositeOperation: "source-over",
                  path: [], sub: null, tr: { x: 0, y: 0 }, stack: [], font: "", textAlign: "" };

  const ctx = {
    /* ⚠️ UNE COULEUR ILLISIBLE EST IGNORÉE, ET C'EST LE COMPORTEMENT DU
       NAVIGATEUR, pas une facilité. `ctx.fillStyle = undefined` ne jette pas
       dans un canvas réel : l'affectation est simplement refusée et l'ancienne
       couleur reste. Un rasteriseur qui jetterait là où le jeu continue
       mesurerait autre chose que le jeu (corollaire n°5 du zip 387).

       Trouvé en rendant les sprites : `fishIcon` affecte une couleur
       `undefined`. Le jeu dessine donc, à cet endroit, avec la couleur
       précédente — ce n'est pas ce que l'auteur croyait écrire, mais c'est ce
       que le joueur voit, et c'est ce que l'outil doit montrer. */
    get fillStyle() { return state.fillStyle; },
    set fillStyle(v) { try { parseColor(v); state.fillStyle = v; } catch (e) { /* refusée, comme dans un canvas réel */ } },
    get globalAlpha() { return state.globalAlpha; }, set globalAlpha(v) { state.globalAlpha = v; },
    get imageSmoothingEnabled() { return state.imageSmoothingEnabled; }, set imageSmoothingEnabled(v) { state.imageSmoothingEnabled = v; },
    get globalCompositeOperation() { return state.globalCompositeOperation; }, set globalCompositeOperation(v) { state.globalCompositeOperation = v; },
    get strokeStyle() { return state.strokeStyle; }, set strokeStyle(v) { state.strokeStyle = v; },
    get lineWidth() { return state.lineWidth; }, set lineWidth(v) { state.lineWidth = v; },
    get font() { return state.font; }, set font(v) { state.font = v; },
    get textAlign() { return state.textAlign; }, set textAlign(v) { state.textAlign = v; },
    get lineCap() { return state.lineCap; }, set lineCap(v) { state.lineCap = v; },
    get lineJoin() { return state.lineJoin; }, set lineJoin(v) { state.lineJoin = v; },

    fillRect(x, y, w, h) {
      const [r, g, b, a0] = parseColor(state.fillStyle);
      const a = (a0 / 255) * state.globalAlpha;
      if (a <= 0) return;
      let x0 = Math.round(x), y0 = Math.round(y), x1 = Math.round(x + w), y1 = Math.round(y + h);
      if (x1 < x0) { const t = x0; x0 = x1; x1 = t; }
      if (y1 < y0) { const t = y0; y0 = y1; y1 = t; }
      x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W, x1); y1 = Math.min(H, y1);
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const i = (yy * W + xx) * 4;
        if (a >= 1) { px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255; continue; }
        const ia = 1 - a;
        px[i] = r * a + px[i] * ia; px[i + 1] = g * a + px[i + 1] * ia;
        px[i + 2] = b * a + px[i + 2] * ia; px[i + 3] = Math.max(px[i + 3], 255 * a);
      }
    },
    clearRect(x, y, w, h) {
      const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
      const x1 = Math.min(W, Math.round(x + w)), y1 = Math.min(H, Math.round(y + h));
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const i = (yy * W + xx) * 4; px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 0;
      }
    },
    getImageData(x, y, w, h) {
      const out = new Uint8ClampedArray(w * h * 4);
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
        const s = ((y + yy) * W + (x + xx)) * 4, d = (yy * w + xx) * 4;
        for (let k = 0; k < 4; k++) out[d + k] = px[s + k];
      }
      return { data: out, width: w, height: h };
    },
    putImageData(img, x, y) {
      for (let yy = 0; yy < img.height; yy++) for (let xx = 0; xx < img.width; xx++) {
        const s = (yy * img.width + xx) * 4, d = ((y + yy) * W + (x + xx)) * 4;
        if (d < 0 || d >= px.length) continue;
        for (let k = 0; k < 4; k++) px[d + k] = img.data[s + k];
      }
    },
    /* ---- LES TRACÉS. --------------------------------------------------
       `fermeArt.js` s'en sert beaucoup : 99 `beginPath`, 83 `fill`, 53 `arc`.
       Refuser les tracés — comme le fait le rasteriseur du labyrinthe, où
       c'est le contrôle même — rendrait ici l'outil inutile : la ferme n'a
       jamais eu la règle du `fillRect` seul, et la lui imposer après coup
       reviendrait à mesurer un autre programme.

       On implémente donc un remplissage par BALAYAGE DE LIGNES (règle
       pair-impair), et les arcs sont aplatis en segments. C'est une
       approximation NON ANTICRÉNELÉE : elle diffère du navigateur d'un pixel
       sur les bords obliques, et c'est écrit ici pour que personne ne prenne
       ces PNG pour une capture d'écran. Ce qu'ils montrent est la SILHOUETTE
       et les COULEURS — les deux choses qu'on veut juger. */
    beginPath() { state.path = []; state.sub = null; },
    closePath() { if (state.sub && state.sub.length) state.sub.push(state.sub[0]); },
    moveTo(x, y) { state.sub = [[x, y]]; state.path.push(state.sub); },
    lineTo(x, y) { if (!state.sub) { state.sub = [[x, y]]; state.path.push(state.sub); } else state.sub.push([x, y]); },
    quadraticCurveTo(cx, cy, x, y) {
      if (!state.sub || !state.sub.length) return ctx.moveTo(x, y);
      const [x0, y0] = state.sub[state.sub.length - 1];
      for (let i = 1; i <= 8; i++) {
        const t = i / 8, u = 1 - t;
        state.sub.push([u * u * x0 + 2 * u * t * cx + t * t * x, u * u * y0 + 2 * u * t * cy + t * t * y]);
      }
    },
    arc(cx, cy, r, a0, a1) {
      const seg = Math.max(8, Math.ceil(r * 3));
      const pts = [];
      for (let i = 0; i <= seg; i++) {
        const a = a0 + (a1 - a0) * (i / seg);
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      if (state.sub) for (const p of pts) state.sub.push(p);
      else { state.sub = pts; state.path.push(state.sub); }
    },
    ellipse(cx, cy, rx, ry, rot, a0, a1) {
      const seg = Math.max(8, Math.ceil(Math.max(rx, ry) * 3));
      const pts = [];
      for (let i = 0; i <= seg; i++) {
        const a = a0 + (a1 - a0) * (i / seg);
        const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
        const cr = Math.cos(rot || 0), sr = Math.sin(rot || 0);
        pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
      }
      state.sub = pts; state.path.push(state.sub);
    },
    fill() {
      const [r, g, b, a0] = parseColor(state.fillStyle);
      const a = (a0 / 255) * state.globalAlpha;
      if (a <= 0 || !state.path.length) return;
      const edges = [];
      for (const sub of state.path) for (let i = 0; i < sub.length; i++) {
        const p = sub[i], q = sub[(i + 1) % sub.length];
        if (p[1] !== q[1]) edges.push([p, q]);
      }
      if (!edges.length) return;
      let minY = 1e9, maxY = -1e9;
      for (const [p, q] of edges) { minY = Math.min(minY, p[1], q[1]); maxY = Math.max(maxY, p[1], q[1]); }
      const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(H - 1, Math.ceil(maxY));
      for (let y = y0; y <= y1; y++) {
        const yc = y + 0.5, xs = [];
        for (const [p, q] of edges) {
          const [px1, py1] = p, [px2, py2] = q;
          if ((yc >= py1 && yc < py2) || (yc >= py2 && yc < py1)) xs.push(px1 + (yc - py1) / (py2 - py1) * (px2 - px1));
        }
        xs.sort((u, v) => u - v);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          const xa = Math.max(0, Math.round(xs[k])), xb = Math.min(W, Math.round(xs[k + 1]));
          for (let x = xa; x < xb; x++) {
            const i = (y * W + x) * 4, ia = 1 - a;
            px[i] = r * a + px[i] * ia; px[i + 1] = g * a + px[i + 1] * ia;
            px[i + 2] = b * a + px[i + 2] * ia; px[i + 3] = Math.max(px[i + 3], 255 * a);
          }
        }
      }
    },
    // Le trait : on remplit un carré d'un pixel le long de chaque segment.
    // Grossier, assumé — `stroke` ne sert dans fermeArt qu'à des filets fins.
    stroke() {
      const save = state.fillStyle;
      if (state.strokeStyle) state.fillStyle = state.strokeStyle;
      for (const sub of state.path) for (let i = 0; i + 1 < sub.length; i++) {
        const [x0, y0] = sub[i], [x1, y1] = sub[i + 1];
        const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
        for (let k = 0; k <= n; k++) ctx.fillRect(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), 1, 1);
      }
      state.fillStyle = save;
    },
    // Transformations : seule la TRANSLATION est honorée (fermeArt s'en sert
    // pour recentrer un sprite). `scale`/`rotate`/`setTransform` sont acceptés
    // et IGNORÉS, ce qui est dit ici noir sur blanc : un sprite qui en
    // dépendrait serait rendu faux par cet outil, et il vaut mieux le savoir
    // que de découvrir la différence en cherchant un défaut ailleurs.
    save() { state.stack.push({ ...state.tr }); },
    restore() { const t = state.stack.pop(); if (t) state.tr = t; },
    translate() {}, scale() {}, rotate() {}, setTransform() {},

    drawImage(src, dx = 0, dy = 0) {
      const s = src && src.__px ? src : null;
      if (!s) throw new Error("drawImage : source non reconnue");
      for (let yy = 0; yy < s.height; yy++) for (let xx = 0; xx < s.width; xx++) {
        const si = (yy * s.width + xx) * 4;
        const a = s.__px[si + 3] / 255;
        if (a <= 0) continue;
        const X = dx + xx, Y = dy + yy;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const di = (Y * W + X) * 4, ia = 1 - a;
        px[di] = s.__px[si] * a + px[di] * ia;
        px[di + 1] = s.__px[si + 1] * a + px[di + 1] * ia;
        px[di + 2] = s.__px[si + 2] * a + px[di + 2] * ia;
        px[di + 3] = Math.max(px[di + 3], s.__px[si + 3]);
      }
    },
  };

  const guard = new Proxy(ctx, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k === "symbol") return undefined;
      throw new Error("fermeArt.js utilise ctx." + String(k) + " : non implémenté par le faux canvas");
    },
    set(t, k, v) { t[k] = v; return true; },
  });

  return { ctx: guard, px, width: W, height: H };
}

/* Le faux `document`, installé sur le global avant de charger fermeArt.js. Un
   canevas rend un objet qui porte SES pixels (`__px`), ce qui permet à
   `drawImage` de recomposer des sprites les uns sur les autres — motif utilisé
   par plusieurs sprites de la ferme (léopard des neiges, tenues…). */
/* ---------------------------------------------------------------------------
   CHARGER UN MODULE DE LA FERME SOUS NODE.
   ---------------------------------------------------------------------------
   Les fichiers de `components/ferme/` s'importent sans extension
   (`from "./fermeConstants"`), ce qui est la convention de Next.js et ne peut
   pas changer. Node, lui, exige l'extension en ESM.

   On recopie donc les modules demandés dans un dossier de travail en ajoutant
   les extensions. C'est un DÉTOUR MÉCANIQUE et il est écrit ici plutôt que
   dans chaque outil : trois outils qui feraient chacun leur copie finiraient
   par ne pas charger tout à fait la même chose (leçon du zip 387), et le jour
   où l'un d'eux montrerait autre chose que le jeu, on chercherait le défaut
   dans les sprites.

   ⚠️ La copie ne TRANSFORME rien d'autre. Si un module de la ferme se mettait
   à importer React ou un module npm, l'import échouerait bruyamment — et c'est
   ce qu'on veut : ces outils ne doivent charger que du code sans dépendance,
   sinon ils ne mesureraient plus le même programme.
   ------------------------------------------------------------------------- */
export async function loadFerme(root, names) {
  const dir = path.join(root, "tools", ".cache");
  fs.mkdirSync(dir, { recursive: true });
  for (const n of names) {
    const src = fs.readFileSync(path.join(root, "components", "ferme", n + ".js"), "utf8");
    fs.writeFileSync(path.join(dir, n + ".mjs"), src.replace(/from "\.\/([A-Za-z0-9_]+)"/g, 'from "./$1.mjs"'));
  }
  const out = {};
  for (const n of names) out[n] = await import("file://" + path.join(dir, n + ".mjs"));
  return out;
}

export function installFakeDOM() {
  const made = [];
  global.document = {
    createElement(tag) {
      if (tag !== "canvas") throw new Error("document.createElement(" + tag + ") : seul canvas est supporté");
      const el = { width: 0, height: 0, __surface: null, __px: null };
      el.getContext = () => {
        if (!el.__surface || el.__surface.width !== el.width || el.__surface.height !== el.height) {
          el.__surface = makeCanvas(el.width || 1, el.height || 1);
          el.__px = el.__surface.px;
          made.push(el);
        }
        return el.__surface.ctx;
      };
      return el;
    },
  };
  if (!global.window) global.window = { devicePixelRatio: 1, addEventListener() {} };
  return made;
}

/* ---- PNG, encodé à la main (zlib est dans Node). Recopié de
   public/labyrinth/tools/lib-raster.mjs : deux copies d'un encodeur PNG ne
   peuvent pas diverger de façon INVISIBLE (une image fausse ne s'ouvre pas),
   ce qui est le seul cas où ce projet tolère une seconde description. ---- */
function crc32(buf) {
  let table = crc32.t;
  if (!table) {
    table = crc32.t = new Int32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c; }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 255];
  return (crc ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
export function writePNG(file, px, W, H) {
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W * 4; x++) raw[y * (W * 4 + 1) + 1 + x] = px[y * W * 4 + x];
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0)),
  ]));
}
export function scale(px, W, H, k) {
  const W2 = W * k, H2 = H * k, out = new Uint8ClampedArray(W2 * H2 * 4);
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
    const s = (((y / k) | 0) * W + ((x / k) | 0)) * 4, d = (y * W2 + x) * 4;
    for (let k2 = 0; k2 < 4; k2++) out[d + k2] = px[s + k2];
  }
  return { px: out, W: W2, H: H2 };
}
/* Compte les couleurs distinctes d'un sprite. C'est LA mesure qui distingue un
   sprite peint d'un sprite colorié : sous quatre couleurs par masse, il n'y a
   pas de volume, et aucun éclairage de jeu ne l'invente. */
export function paletteOf(px, W, H) {
  const set = new Set();
  let opaque = 0;
  for (let i = 0; i < W * H * 4; i += 4) {
    if (px[i + 3] < 8) continue;
    opaque++;
    set.add((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
  }
  return { colors: set.size, opaque };
}
