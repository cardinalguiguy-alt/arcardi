/* =============================================================================
   lib-raster.mjs — LE RASTERISEUR. La dette la plus coûteuse du chantier,
   ouverte depuis le zip 393, fermée au 397.
   -----------------------------------------------------------------------------
   Ce que disait le README des zips 393 à 396, quatre fois de suite :

       « tools/render-maze.mjs : écrire les textures de paint.js en PNG, pour
         les REGARDER. paint.js a été écrit sans dépendance à Three.js
         EXACTEMENT pour ça, mais le rasteriseur n'est toujours pas fait.
         AUCUNE TEXTURE DE CE JEU N'A ENCORE ÉTÉ REGARDÉE HORS DU NAVIGATEUR —
         et le projet compte seize défauts trouvés en regardant contre zéro en
         relisant. »

   Guillaume, au 397 : « beaucoup trop d'amateurisme dans les textures des murs
   et du sol ». Quatre refontes graphiques faites EN AVEUGLE, quatre fois le
   même reproche. Ce fichier est la réponse structurelle : on ne repeint pas
   une cinquième fois sans regarder.

   ⚠️ IL N'IMPLÉMENTE QUE `fillRect` ET `clearRect`, et c'est volontaire. C'est
   le MÊME contrat que le faux contexte de smoke-render.mjs : si quelqu'un
   glisse un dégradé, un arc ou un fillText dans une texture, ce rasteriseur
   jette au lieu de dessiner silencieusement autre chose que le jeu. Deux outils
   qui acceptent des choses différentes finiraient par diverger — ici ils
   refusent exactement la même chose.

   Aucune dépendance : le PNG est encodé à la main (zlib est dans Node).
   ========================================================================== */

import zlib from "zlib";
import fs from "fs";
import path from "path";

/* -----------------------------------------------------------------------
   Le tampon RGBA + le faux contexte 2D.
   -----------------------------------------------------------------------
   `fillStyle` accepte les trois formes que paint.js produit : "#rrggbb",
   "#rgb" et "rgba(r,g,b,a)". Rien d'autre — une couleur nommée passerait
   silencieusement au noir, ce qui est exactement le genre de mensonge que cet
   outil existe pour empêcher.
   -------------------------------------------------------------------- */
export function surface(W, H) {
  const px = new Uint8ClampedArray(W * H * 4);

  function parse(s) {
    if (typeof s !== "string") throw new Error("fillStyle non textuel : " + s);
    if (s[0] === "#") {
      if (s.length === 7) {
        return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 255];
      }
      if (s.length === 4) {
        const r = parseInt(s[1], 16), g = parseInt(s[2], 16), b = parseInt(s[3], 16);
        return [r * 17, g * 17, b * 17, 255];
      }
    }
    const m = /^rgba?\(([^)]+)\)$/.exec(s);
    if (m) {
      const p = m[1].split(",").map(v => parseFloat(v.trim()));
      return [p[0] | 0, p[1] | 0, p[2] | 0, Math.round((p.length > 3 ? p[3] : 1) * 255)];
    }
    throw new Error("fillStyle non reconnu : " + s);
  }

  const state = { fillStyle: "#000000", globalAlpha: 1 };

  const ctx = {
    get fillStyle() { return state.fillStyle; },
    set fillStyle(v) { state.fillStyle = v; },
    get globalAlpha() { return state.globalAlpha; },
    set globalAlpha(v) { state.globalAlpha = v; },

    fillRect(x, y, w, h) {
      const [r, g, b, a0] = parse(state.fillStyle);
      const a = (a0 / 255) * state.globalAlpha;
      if (a <= 0) return;
      // Les coordonnées de paint.js sont fractionnaires : on arrondit comme le
      // fait un canvas réel sans anticrénelage sur des bords entiers, c'est-à-
      // dire qu'on couvre les pixels dont le CENTRE tombe dans le rectangle.
      let x0 = Math.round(x), y0 = Math.round(y);
      let x1 = Math.round(x + w), y1 = Math.round(y + h);
      if (x1 < x0) { const t = x0; x0 = x1; x1 = t; }
      if (y1 < y0) { const t = y0; y0 = y1; y1 = t; }
      x0 = Math.max(0, x0); y0 = Math.max(0, y0);
      x1 = Math.min(W, x1); y1 = Math.min(H, y1);
      for (let yy = y0; yy < y1; yy++) {
        let i = (yy * W + x0) * 4;
        for (let xx = x0; xx < x1; xx++, i += 4) {
          if (a >= 1) { px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255; continue; }
          const ia = 1 - a;
          px[i] = r * a + px[i] * ia;
          px[i + 1] = g * a + px[i + 1] * ia;
          px[i + 2] = b * a + px[i + 2] * ia;
          px[i + 3] = 255 * a + px[i + 3] * ia;
        }
      }
    },

    clearRect(x, y, w, h) {
      const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
      const x1 = Math.min(W, Math.round(x + w)), y1 = Math.min(H, Math.round(y + h));
      for (let yy = y0; yy < y1; yy++) {
        let i = (yy * W + x0) * 4;
        for (let xx = x0; xx < x1; xx++, i += 4) { px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 0; }
      }
    },
  };

  /* Tout le reste jette. Même contrat que smoke-render.mjs. */
  const guard = new Proxy(ctx, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k === "symbol") return undefined;
      throw new Error("paint.js utilise " + String(k) + " : interdit dans une texture du labyrinthe");
    },
    set(t, k, v) { t[k] = v; return true; },
  });

  return { ctx: guard, px, W, H };
}

/* -----------------------------------------------------------------------
   L'encodeur PNG. Format 8 bits RGBA, filtre 0, une seule IDAT.
   -------------------------------------------------------------------- */
function crc32(buf) {
  let c, table = crc32.t;
  if (!table) {
    table = crc32.t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 255];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

export function encodePNG(px, W, H) {
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0;                       // filtre « None »
    for (let x = 0; x < W * 4; x++) raw[y * (W * 4 + 1) + 1 + x] = px[y * W * 4 + x];
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function writePNG(file, px, W, H) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, encodePNG(px, W, H));
  return file;
}

/* -----------------------------------------------------------------------
   Utilitaires de PLANCHE : agrandir au plus proche (pour regarder un détail
   sans que le lisseur du visionneur mente sur la netteté du pixel), carreler
   (pour VOIR la couture d'une texture répétée — le défaut n°1 des textures
   de ce projet), et coller côte à côte.
   -------------------------------------------------------------------- */
export function scale(px, W, H, k) {
  const W2 = W * k, H2 = H * k;
  const out = new Uint8ClampedArray(W2 * H2 * 4);
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
    const s = (((y / k) | 0) * W + ((x / k) | 0)) * 4, d = (y * W2 + x) * 4;
    out[d] = px[s]; out[d + 1] = px[s + 1]; out[d + 2] = px[s + 2]; out[d + 3] = px[s + 3];
  }
  return { px: out, W: W2, H: H2 };
}

export function tile(px, W, H, nx, ny) {
  const W2 = W * nx, H2 = H * ny;
  const out = new Uint8ClampedArray(W2 * H2 * 4);
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
    const s = ((y % H) * W + (x % W)) * 4, d = (y * W2 + x) * 4;
    out[d] = px[s]; out[d + 1] = px[s + 1]; out[d + 2] = px[s + 2]; out[d + 3] = px[s + 3];
  }
  return { px: out, W: W2, H: H2 };
}

/* Statistiques d'une texture. Sert aux CONTRÔLES CHIFFRÉS de
   verify-textures.mjs : une texture peut être jolie et illisible, mais une
   texture dont l'écart-type est nul est PLATE, et ça, ça se mesure. */
export function stats(px, W, H) {
  let n = 0, sum = 0, sum2 = 0, min = 255, max = 0;
  const hist = new Int32Array(256);
  for (let i = 0; i < W * H * 4; i += 4) {
    if (px[i + 3] < 8) continue;
    const l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    n++; sum += l; sum2 += l * l;
    if (l < min) min = l;
    if (l > max) max = l;
    hist[Math.min(255, l | 0)]++;
  }
  const mean = n ? sum / n : 0;
  const sd = n ? Math.sqrt(Math.max(0, sum2 / n - mean * mean)) : 0;
  let distinct = 0;
  for (let i = 0; i < 256; i++) if (hist[i] > n * 0.0004) distinct++;
  return { n, mean, sd, min, max, distinct };
}

/* Écart moyen entre la colonne de gauche et celle de droite (et haut/bas).
   C'est LA mesure de la couture d'une texture répétée : au-dessus de quelques
   unités, on voit la grille à l'écran, et c'est le défaut que Guillaume a
   signalé sur l'eau du 394 (« ça se lit comme un circuit imprimé »). */
export function seam(px, W, H) {
  let dx = 0, dy = 0;
  for (let y = 0; y < H; y++) {
    const a = (y * W) * 4, b = (y * W + W - 1) * 4;
    dx += Math.abs(px[a] - px[b]) + Math.abs(px[a + 1] - px[b + 1]) + Math.abs(px[a + 2] - px[b + 2]);
  }
  for (let x = 0; x < W; x++) {
    const a = x * 4, b = ((H - 1) * W + x) * 4;
    dy += Math.abs(px[a] - px[b]) + Math.abs(px[a + 1] - px[b + 1]) + Math.abs(px[a + 2] - px[b + 2]);
  }
  return { x: dx / (H * 3), y: dy / (W * 3) };
}
