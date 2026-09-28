/* ╔══════════════════════════════════════════════════════════════════════════
   ║ PHASE 7b (2026-09-28) — LES CLÔTURES DE VALLEY TOWN, EN VOLUMES.
   ╚══════════════════════════════════════════════════════════════════════════
   Haie de buis taillée, muret de pierre et grille en fer forgé, palissade
   blanche à claire-voie, palissade de planches, piquets et fil — leurs
   portails, et les carrés de potager des jardins ouverts. Qui a quoi : voir
   `C.townParcelFence` / `C.townFenceLayout` (fermeConstants.js) et la passe
   « LES CLÔTURES » de `generateTownWorld`.

   ⚠️⚠️ POURQUOI DES VOLUMES (DES VOXELS D'UN PIXEL D'ART) ET PAS DES TUILES
   PEINTES. Une clôture court dans les quatre sens, tourne, se croise, s'arrête
   sur un portail et s'y raccorde à une clôture d'une autre matière. Peinte en
   tuiles, chaque cas est un dessin de plus — l'ancienne haie en avait trois et
   une transposition, et les angles ne se lisaient pas. Décrite en VOLUME, elle
   est UNE fonction `(u, v, z) → matière` par style ; la projection 3/4 du jeu
   (une case au sol = 16 px, une hauteur de h px monte de h px à l'écran) fait
   le reste : les angles, les tés, les bouts, les faces qu'on voit ou pas.
   · Et un portail qui s'ouvre est le MÊME modèle TOURNÉ autour de ses gonds :
     les six poses sont exactes, sans un pixel dessiné à la main.
   · Et la neige (phase 12) n'aura qu'à blanchir les faces du dessus.

   LA PROJECTION. Un voxel (u, v, z) — colonne, rangée au sol, hauteur — montre
   sa face du DESSUS à la ligne d'écran `v − z − 1` si rien n'est posé sur lui,
   et sa face AVANT (le sud, vers nous) à la ligne `v − z` si rien n'est devant
   lui. On peint du fond vers l'avant (v croissant) puis de bas en haut : c'est
   l'algorithme du peintre, exact dans cette projection. Les faces est et ouest
   ne se voient jamais (aucun fuyant en x) : l'arête éclairée à l'ouest et
   l'arête d'ombre à l'est les SUGGÈRENT, comme partout dans le projet.

   ⚠️ LA LUMIÈRE VIENT DU HAUT À GAUCHE, comme dans tout le projet (DESSIN.md),
   et la valeur se QUANTIFIE en paliers de palette — aucun dégradé continu,
   aucun pixel tiré au hasard : la matière vient de FORMES (des touffes de buis
   éclairées une à une, des moellons, des planches), pas d'un bruit.
   ⚠️ L'OMBRE PORTÉE EST UNE OMBRE DE CONTACT, peinte DANS le dessin, en trait
   continu (« un ouvrage continu ne porte pas une ombre par case ») ; pas
   d'ombre orientée, comme les maisons.
   ⚠️ LA PÉRIODE : tout motif (touffes, moellons, planches, piquets, barreaux,
   poteaux) boucle sur QUATRE cases (64 px) — la texture d'une case ne dépend
   que de `x & 3, y & 3`, et c'est aussi ce qui borne le nombre de cellules
   mises en cache.

   ⚠️ LE RENDU EST PARESSEUX : une cellule (style, voisinage, position dans la
   période) se calcule à son premier affichage, une fois, dans une page
   d'ATLAS (§10 de CLAUDE.md : sur iPad c'est le NOMBRE de canevas qui compte).
   La ville en utilise quelques centaines, pour une ou deux pages.

   ⚠️ PUR, sauf `document.createElement("canvas")` (le faux canevas des bancs
   le fournit, ainsi que `getImageData`/`putImageData`) : `tools/render-haies.mjs`
   l'importe et regarde tout.
   ══════════════════════════════════════════════════════════════════════════ */
import * as C from "./fermeConstants";

const T = 16;
/* Rangées d'écran au-dessus de la case : le plus haut ouvrage (le pilier de
   la grille et sa boule, 27 px, posé 4 px dans la case) plus la marge. */
export const FENCE_OV = 30;
const CH = T + FENCE_OV;
/* Le portail déborde de deux pixels de chaque côté de son ouverture : ouvert,
   un vantail tient debout sur la ligne de son gond. */
const GATE_PAD = 2;

/* ── 1. OUTILS ─────────────────────────────────────────────────────────── */
function hash2(x, y) {
  let h = Math.imul(x | 0, 0x2c1b3c6d) ^ Math.imul((y | 0) ^ 0x68e31da4, 0x297a2d39);
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca77); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
const hash3 = (x, y, z) => hash2(x + Math.imul(z | 0, 0x3c6ef372), y ^ Math.imul(z | 0, 0x1b873593));
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const pal = (a) => a.map(hex);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/* ── 2. LES MATIÈRES ET LEURS PALETTES ─────────────────────────────────────
   Du plus sombre au plus clair ; l'indice vient de l'éclairage. */
const M = { LEAF: 1, STONE: 2, COPING: 3, IRON: 4, PAINT: 5, WOOD: 6, PLANK: 7, WIRE: 8, GRASS: 9, BALL: 10,
            SOIL: 11, CABBAGE: 12, LEEK: 13, LETTUCE: 14, TOMATO: 15, PUMPKIN: 16, STRAW: 17, STAKE: 18, SNOW: 19 };
const PAL = {
  [M.LEAF]: pal(["#142b18", "#1c3a21", "#264c2b", "#305f35", "#3c7340", "#4b884b", "#5e9d57", "#79b468"]),
  [M.STONE]: pal(["#5f584c", "#766e60", "#8b8272", "#a09684", "#b3a995", "#c5bba6"]),
  [M.COPING]: pal(["#6f685b", "#8a8272", "#a39a88", "#bab09c", "#cec4af", "#ded5c1"]),
  [M.BALL]: pal(["#6f685b", "#8a8272", "#a39a88", "#bab09c", "#cec4af", "#ded5c1"]),
  [M.IRON]: pal(["#121418", "#1b1e23", "#262a31", "#353a43", "#4b525d"]),
  [M.PAINT]: pal(["#7f7b6f", "#9d998c", "#b9b5a7", "#d2cebf", "#e5e1d2", "#f3f0e4"]),
  [M.WOOD]: pal(["#3d2c1d", "#4f3a27", "#634a33", "#775b40", "#8b6d4f", "#9f8060"]),
  [M.STAKE]: pal(["#3a2d21", "#4b3b2c", "#5e4b39", "#725d48", "#857058"]),
  [M.WIRE]: pal(["#4f5459", "#6d7379", "#90969c", "#b7bcc1"]),
  [M.GRASS]: pal(["#2f5127", "#3d6531", "#4d7a3b", "#608f47"]),
  [M.SOIL]: pal(["#2e2118", "#3b2b1f", "#4a3727", "#5a4531", "#6a543d"]),
  [M.CABBAGE]: pal(["#2c4a3a", "#3b614b", "#4f7a5c", "#66946f", "#84ae86"]),
  [M.LEEK]: pal(["#2f4d2a", "#446a35", "#5d8a43", "#7ba95a", "#a3c982"]),
  [M.LETTUCE]: pal(["#3f6a2c", "#55863a", "#6fa24a", "#8dbd5f", "#b0d67d"]),
  [M.TOMATO]: pal(["#6e1c14", "#94281b", "#b93824", "#d65233", "#e97a53"]),
  [M.PUMPKIN]: pal(["#7a3a10", "#9e5116", "#c26b1f", "#dd8a2f", "#eeab4e"]),
  [M.STRAW]: pal(["#7d6a3d", "#9a8550", "#b5a065", "#cdb97c", "#e0cf95"]),
  // 2026-09-28 (phase 12a) — la neige : la palette de `neige.js` (SNOW_TONES), bleue dans l'ombre.
  [M.SNOW]: pal(["#8598c3", "#9badd3", "#b2c3e1", "#c8d6ed", "#dce6f5", "#edf2fa", "#f8fafd", "#fffdf6"]),
};
/* Les planches d'une palissade sont de bois inégalement grisé : cinq teintes
   de bois vieilli, une par planche (au hachage de la planche, pas du pixel). */
const PLANKS = [
  pal(["#3b322a", "#4b4035", "#5b4f42", "#6b5e4f", "#7b6d5c", "#8a7c69"]),
  pal(["#3f3226", "#514131", "#63503d", "#755f49", "#877055", "#978062"]),
  pal(["#38332d", "#48423a", "#585147", "#686054", "#786f61", "#877e6e"]),
  pal(["#43352a", "#564436", "#695342", "#7b624e", "#8c725a", "#9b8266"]),
  pal(["#3a3027", "#4a3e33", "#5a4c3f", "#6a5a4b", "#7a6957", "#8a7863"]),
];
const CERNE = { [M.LEAF]: hex("#102214"), [M.STONE]: hex("#3f3a31"), [M.COPING]: hex("#3f3a31"), [M.BALL]: hex("#3f3a31") };
const THICK = new Set([M.LEAF, M.STONE, M.COPING, M.BALL]);

/* La lumière : du haut à gauche, un peu de face (vers le sud) pour que la face
   avant d'un ouvrage ne soit jamais noire. x est, y sud, z haut. */
const LX = -0.55, LY = 0.3, LZ = 0.78, LN = Math.hypot(LX, LY, LZ);
const L = [LX / LN, LY / LN, LZ / LN];

/* ── 3. LE PEINTRE ─────────────────────────────────────────────────────────
   `model(u, v, z)` → matière (0 = vide), appelé aussi HORS de la case (u ou v
   à −1 ou 16) : c'est ce qui dit qu'un tronçon CONTINUE chez le voisin, donc
   qu'il ne faut ni face avant ni cerne sur la couture. `d` : les pixels RGBA
   de la cellule (`W` de large), l'origine au sol (u=0, v=0) est à (ox, oy).
   `u0..u1` : les colonnes à peindre (une case : 0..15). */
function paintVoxels(d, W, H, ox, oy, model, zMax, u0, u1, v0, v1, colorOf, shadow, shadowRGB) {
  const SR = shadowRGB || [18, 28, 14];
  const layer = new Uint8ClampedArray(W * H * 4);
  const kind = new Uint8Array(W * H);             // la matière peinte à chaque pixel (le cerne s'en sert)
  const put = (x, y, c, m) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const o = (y * W + x) * 4;
    layer[o] = c[0]; layer[o + 1] = c[1]; layer[o + 2] = c[2]; layer[o + 3] = 255;
    kind[y * W + x] = m;
  };
  for (let v = v0; v <= v1; v++) for (let z = 0; z <= zMax; z++) for (let u = u0; u <= u1; u++) {
    const m = model(u, v, z);
    if (!m) continue;
    const top = !model(u, v, z + 1), front = !model(u, v + 1, z);
    if (!top && !front) continue;
    const nb = { w: !model(u - 1, v, z), e: !model(u + 1, v, z), n: !model(u, v - 1, z) };
    if (top) put(ox + u, oy + v - z - 1, colorOf(m, "top", u, v, z, nb), m);
    if (front) put(ox + u, oy + v - z, colorOf(m, "front", u, v, z, nb), m);
  }
  /* Le cerne : un pixel sombre sur le vide qui borde une matière ÉPAISSE (haie,
     pierre). Les ouvrages minces (piquets, barreaux, fil) n'en ont pas : un
     cerne d'un pixel autour d'un piquet d'un pixel remplirait la claire-voie. */
  const out = new Uint8ClampedArray(layer);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (kind[y * W + x]) continue;
    let m = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const k = kind[yy * W + xx];
      if (THICK.has(k)) { m = k; break; }
    }
    if (!m) continue;
    const o = (y * W + x) * 4, c = CERNE[m];
    out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
  }
  /* L'ombre de contact au sol, SOUS le dessin (elle ne recouvre jamais rien). */
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4;
    if (out[o + 3]) { for (let k = 0; k < 4; k++) d[o + k] = out[o + k]; continue; }
    if (!shadow) continue;
    const u = x - ox, v = y - oy;
    if (u < u0 || u > u1 || v < v0 || v > v1) continue;
    const a = shadow(u, v);
    if (a > 0) { d[o] = SR[0]; d[o + 1] = SR[1]; d[o + 2] = SR[2]; d[o + 3] = Math.round(a * 255); }
  }
}
/* L'ombre de contact d'un modèle : sous et au pied de ce qui touche le sol. */
function contactShadow(model) {
  return (u, v) => {
    if (model(u, v, 0)) return 0;
    if (model(u, v - 1, 0)) return 0.34;
    if (model(u, v - 2, 0)) return 0.16;
    if (model(u - 1, v, 0) || model(u + 1, v, 0)) return 0.14;
    return 0;
  };
}

/* ── 4. LA COULEUR D'UN PIXEL ──────────────────────────────────────────── */
const pick = (p, lvl) => p[Math.max(0, Math.min(p.length - 1, Math.round(clamp01(lvl) * (p.length - 1))))];
/* L'éclairage commun des matières dures : dessus clair, face avant moyenne,
   arête ouest éclairée, arête est dans l'ombre, pied assombri (occlusion). */
function hardLevel(face, u, v, z, nb) {
  let l = face === "top" ? 0.78 : 0.5;
  if (nb.w) l += 0.14;
  if (nb.e) l -= 0.2;
  if (face === "front" && z <= 1) l -= 0.14;
  if (face === "top" && nb.n) l += 0.08;
  return l;
}
/* Les TOUFFES du buis : un semis de centres sur une grille de 4 px (monde),
   décalés au hachage ; chaque pixel prend la normale de la touffe la plus
   proche, mêlée à celle de sa face — les touffes s'éclairent une à une, le
   contour reste net (« un ouvrage taillé dans une matière vivante garde sa
   matière ; ce qui change est le contour », DESSIN.md). Le creux entre deux
   touffes (deux centres presque à égale distance) s'assombrit. */
function leafLevel(face, wx, wy, z) {
  let d1 = 1e9, d2 = 1e9, c1 = null;
  const gx = Math.floor(wx / 4), gy = Math.floor(wy / 4), gz = Math.floor(z / 4);
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
    const i = gx + a, j = gy + b, k = gz + c, h = hash3(i & 15, j & 15, k);
    const cx = i * 4 + 0.5 + (h % 3), cy = j * 4 + 0.5 + ((h >>> 3) % 3), cz = k * 4 + 1 + ((h >>> 6) % 3);
    const dd = (wx + 0.5 - cx) ** 2 + (wy + 0.5 - cy) ** 2 + (z + 0.5 - cz) ** 2;
    if (dd < d1) { d2 = d1; d1 = dd; c1 = [cx, cy, cz]; } else if (dd < d2) d2 = dd;
  }
  let nx = wx + 0.5 - c1[0], ny = wy + 0.5 - c1[1], nz = z + 0.5 - c1[2];
  const nn = Math.hypot(nx, ny, nz) || 1;
  const fx = 0, fy = face === "top" ? 0 : 1, fz = face === "top" ? 1 : 0;
  nx = 0.6 * fx + 0.8 * nx / nn; ny = 0.6 * fy + 0.8 * ny / nn; nz = 0.6 * fz + 0.8 * nz / nn;
  const m = Math.hypot(nx, ny, nz) || 1;
  const lam = (nx * L[0] + ny * L[1] + nz * L[2]) / m;
  let l = 0.18 + 0.72 * Math.max(0, lam) + (face === "top" ? 0.1 : 0);
  if (Math.sqrt(d2) - Math.sqrt(d1) < 0.7) l -= 0.2;
  if (face === "front" && z <= 1) l -= 0.12;
  return l;
}

/* ── 4 bis. LA NEIGE (phase 12a, 2026-09-28) ───────────────────────────────
   « La neige n'aura qu'à blanchir les faces du dessus » (en-tête) : elle fait
   mieux, elle AJOUTE DES VOXELS — une colonne de `k` voxels de neige sur toute
   face du dessus (un, sous une neige légère ; trois, sous une neige épaisse,
   deux au bord d'un ouvrage : le bourrelet s'arrondit). Chaque matière en
   hérite sans une ligne : le chaperon du muret, la boule du pilier, chaque
   barreau de la grille, chaque piquet de la palissade, les trois brins du fil
   (un voxel seulement — un fil ne porte pas un bourrelet), les touffes du buis,
   les choux du potager. ⚠️ Pas de cerne autour de la neige : sur un ouvrage
   mince, il remplirait la claire-voie (note de `paintVoxels`). */
/* ⚠️ LA SURFACE DE LA NEIGE EST LISSÉE (premier jet : `k` voxels posés sur
   chaque colonne, vu en jeu et au banc) : le dessus d'une haie est bombé en
   marches d'un voxel (le bord s'arrondit), et la neige les recopiait — chaque
   marche faisait une contremarche bleue, le chapeau se lisait en RAYURES. La
   neige comble : sa surface est le plus haut dessus des colonnes voisines (3 ×
   3) plus son épaisseur, un voxel de moins au bord de l'ouvrage (le coussin
   s'arrondit), jamais moins d'un voxel sur une colonne. Le fil n'en porte
   qu'un. `u0..v1` : la fenêtre du dessin (la carte des dessus s'y calcule). */
function withSnow(model, lvl, u0, u1, v0, v1) {
  if (!lvl) return model;
  const k = lvl >= 2 ? 3 : 1, P = 2;
  const W = u1 - u0 + 1 + 2 * P, H = v1 - v0 + 1 + 2 * P;
  const top = new Int16Array(W * H).fill(-1), mat = new Uint8Array(W * H);
  for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) {
    for (let z = 31; z >= 0; z--) { const m = model(u + u0 - P, v + v0 - P, z); if (m && m !== M.GRASS) { top[v * W + u] = z; mat[v * W + u] = m; break; } }
  }
  const sTop = new Int16Array(W * H).fill(-1);
  const uu0 = (u) => u + u0 - P, vv0 = (v) => v + v0 - P;
  for (let v = 1; v < H - 1; v++) for (let u = 1; u < W - 1; u++) {
    const i = v * W + u, t = top[i];
    if (t < 0) continue;
    if (mat[i] === M.WIRE) { sTop[i] = t + 1; continue; }
    let mx = t, edge = 0;
    for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) {
      const tt = top[i + dv * W + du];
      if (tt < 0) { if (!du || !dv) edge = 1; continue; }
      /* Seuls les dessus VOISINS (à `k` près) se rejoignent : la neige comble les
         marches d'une haie, pas l'écart entre un barreau et le chaperon du muret
         (premier jet : la grille entière noyée dans un panneau de neige). */
      if (mat[i + dv * W + du] !== M.WIRE && tt > mx && tt <= t + k) mx = tt;
    }
    // Une neige légère ne couvre pas tout : trois colonnes sur dix restent nues (les feuilles, la pierre percent).
    if (k === 1 && (hash2(uu0(u) >> 1, vv0(v) >> 1) % 10) < 3) continue;
    sTop[i] = Math.max(t + 1, mx + k - edge);
  }
  return (u, v, z) => {
    const m = model(u, v, z);
    if (m) return m;
    const uu = u - u0 + P, vv = v - v0 + P;
    if (uu < 0 || vv < 0 || uu >= W || vv >= H) return 0;
    const i = vv * W + uu;
    return top[i] >= 0 && z > top[i] && z <= sTop[i] ? M.SNOW : 0;
  };
}
const SNOW_SHADOW = [44, 60, 102];
function snowColor(base) {
  return (m, face, u, v, z, nb) => {
    if (m !== M.SNOW) return base(m, face, u, v, z, nb);
    // Le dessus : l'éclat, grené d'un demi-ton ; la face : le bleu de l'ombre, plus clair à l'ouest.
    let l = face === "top" ? 0.82 + ((hash2(u * 7 + z, v * 13) % 5) - 2) * 0.03 : 0.42;
    if (nb.w) l += 0.1;
    if (nb.e) l -= 0.14;
    if (face === "top" && nb.n) l += 0.06;
    return pick(PAL[M.SNOW], l);
  };
}

/* ── 5. LES MODÈLES DES CLÔTURES ───────────────────────────────────────────
   `cf` : { n, s, w, e } — un voisin clôturé dans cette direction ; `gw`/`ge` —
   le portail est à l'ouest / à l'est de la case (la clôture court jusqu'au
   bord et s'y termine par un poteau de portail) ; `post` — un poteau, un
   pilier ou un bout au centre ; `px`, `py` — la position dans la période de
   quatre cases (la texture en dépend). */
/* Une bande de demi-largeur `hw` le long des axes connectés (centre 8,0). */
function band(u, v, cf, hw, joint) {
  const du = Math.abs(u + 0.5 - 8), dv = Math.abs(v + 0.5 - 8);
  if (joint && du <= hw && dv <= hw) return true;
  if (dv <= hw && (((cf.w || cf.gw) && u + 0.5 <= 8) || ((cf.e || cf.ge) && u + 0.5 >= 8))) return true;
  if (du <= hw && ((cf.n && v + 0.5 <= 8) || (cf.s && v + 0.5 >= 8))) return true;
  return false;
}
/* Sur l'axe (une ligne d'un pixel, ou deux en nord-sud) : les ouvrages minces. */
function onAxisEW(u, v, cf) { return v === 8 && (((cf.w || cf.gw) && u <= 8) || ((cf.e || cf.ge) && u >= 8) || (cf.post && u === 8) || (!cf.n && !cf.s && !cf.w && !cf.e && u === 8)); }
function onAxisNS(u, v, cf, w3) { return (u === 8 || (w3 && (u === 7 || u === 9))) && ((cf.n && v <= 8) || (cf.s && v >= 8)); }
/* Le poteau de portail, du côté de l'ouverture : colonnes [a, b[. */
function gatePostCols(cf, w) { return cf.ge ? [T - w, T] : cf.gw ? [0, w] : null; }

function hedgeModel(cf) {
  /* La haie s'arrête 3 px avant l'ouverture : un poteau de bois porte le portillon. */
  const inHedge = (u, v) => band(u, v, cf, 4, true) && !(cf.ge && u >= 12) && !(cf.gw && u <= 3);
  const edge = (u, v) => {
    for (let k = 1; k <= 2; k++) if (!inHedge(u - k, v) || !inHedge(u + k, v) || !inHedge(u, v - k) || !inHedge(u, v + k)) return k - 1;
    return 2;
  };
  const post = gatePostCols(cf, 3);
  return (u, v, z) => {
    if (post && u >= post[0] && u < post[1] && v >= 7 && v <= 9) return z < 14 ? M.WOOD : 0;
    if (!inHedge(u, v)) return 0;
    const e = edge(u, v);
    return z < 10 + e ? M.LEAF : 0;
  };
}
function ironModel(cf, px, py) {
  /* Le pilier : au centre (bout, angle, té, et un tous les quatre sur un
     tronçon droit), ou au bord de l'ouverture d'un portail — colonnes 7..14
     (portail à l'est) ou 1..8 (à l'ouest) : son chapeau déborde d'un pixel et
     doit rester dans la case, le vantail est pendu au pixel suivant. */
  const pc = cf.ge ? 11 : cf.gw ? 5 : cf.post ? 8 : null;
  return (u, v, z) => {
    if (pc !== null) {
      const du = Math.abs(u + 0.5 - pc), dv = Math.abs(v + 0.5 - 8);
      if (z < 22 && du <= 4 && dv <= 4) return M.STONE;
      if (z === 22 && du <= 5 && dv <= 5) return M.COPING;
      if (z === 23 && du <= 4 && dv <= 4) return M.COPING;
      if (z >= 24 && z <= 27 && Math.hypot(u + 0.5 - pc, v + 0.5 - 8, z + 0.5 - 25.5) <= 2.3) return M.BALL;
    }
    if (z < 7 && band(u, v, cf, 3, true)) return M.STONE;
    if (z === 7 && band(u, v, cf, 4, true)) return M.COPING;
    if (z < 8) return 0;
    /* La grille, sur l'axe du muret. Barreaux tous les 4 px (monde), lisses
       basse et haute continues, fer de lance au sommet de chaque barreau. */
    const wx = px * T + u, wy = py * T + v;
    const ew = onAxisEW(u, v, cf) && (cf.w || cf.e || cf.gw || cf.ge), ns = onAxisNS(u, v, cf, false);
    if (!ew && !ns) return 0;
    const s = ew ? wx : wy;
    if (z === 9 || z === 17) return M.IRON;
    if (s % 4 === 1) { if (z <= 19) return M.IRON; }
    if (z === 19 && (s % 4 === 0 || s % 4 === 2) && ew) return M.IRON;   // le fer de lance, vu de face
    if (z === 20 && s % 4 === 1) return M.IRON;                            // et sa pointe
    return 0;
  };
}
function picketModel(cf, px, py) {
  const gp = gatePostCols(cf, 2);
  const postAt = (u, v) => (cf.post && u >= 7 && u <= 9 && v >= 7 && v <= 9) || (gp && u >= gp[0] && u < gp[1] && v >= 7 && v <= 9);
  return (u, v, z) => {
    if (postAt(u, v)) return z < 13 || (z === 13 && (u === 8 || (gp && u === gp[0])) && v === 8) ? M.PAINT : 0;
    const wx = px * T + u, wy = py * T + v;
    if (onAxisEW(u, v, cf) && (cf.w || cf.e || cf.gw || cf.ge)) {
      const k = wx % 4;
      if (k === 3) return 0;
      return z < 11 || (z === 11 && k === 1) ? M.PAINT : 0;
    }
    if (v === 7 && (z === 3 || z === 8) && ((((cf.w || cf.gw) && u <= 8) || ((cf.e || cf.ge) && u >= 8)))) return M.PAINT;   // les lisses, derrière
    if (onAxisNS(u, v, cf, true)) {
      const k = wy % 4;
      if (k === 3) return 0;
      return z < 11 || (z === 11 && k === 1) ? M.PAINT : 0;
    }
    if (u === 10 && (z === 3 || z === 8) && ((cf.n && v <= 8) || (cf.s && v >= 8))) return M.PAINT;
    return 0;
  };
}
/* Les planches : largeurs 3, 5, 4, 4 (la somme fait une case) — une longueur
   qui ne divise pas la case ferait une couture tous les 64 px. */
const PLANK_W = [3, 5, 4, 4];
function plankOf(s) {
  const cell = Math.floor(s / T), r = s - cell * T;
  let k = 0, acc = 0;
  while (k < 3 && r >= acc + PLANK_W[k]) { acc += PLANK_W[k]; k++; }
  return { idx: cell * 4 + k, first: r === acc };
}
function boardModel(cf, px, py) {
  const gp = gatePostCols(cf, 3);
  const plankTop = (idx) => { const h = hash2(idx, 77) % 10; return 14 + (h < 2 ? -1 : h > 7 ? 1 : 0); };
  return (u, v, z) => {
    if (gp && u >= gp[0] && u < gp[1] && v >= 7 && v <= 9) return z < 16 ? M.WOOD : 0;
    if (cf.post && u >= 7 && u <= 9 && v >= 5 && v <= 7) return z < 16 ? M.WOOD : 0;   // le poteau, derrière les planches
    const wx = px * T + u, wy = py * T + v;
    if (onAxisEW(u, v, cf) && (cf.w || cf.e || cf.gw || cf.ge)) {
      const p = plankOf(wx);
      if (hash2(p.idx, 13) % 13 === 0 && !p.first) return 0;               // une planche disjointe, de loin en loin
      return z < plankTop(p.idx) ? M.PLANK : 0;
    }
    /* Les traverses, derrière : on les voit par une planche disjointe. */
    if (v === 7 && (z === 3 || z === 11) && ((((cf.w || cf.gw) && u <= 8) || ((cf.e || cf.ge) && u >= 8)))) return M.WOOD;
    if (onAxisNS(u, v, cf, true)) {
      const p = plankOf(wy);
      return z < plankTop(p.idx + 101) ? M.PLANK : 0;
    }
    return 0;
  };
}
function wireModel(cf, px, py) {
  const gp = gatePostCols(cf, 2);
  const postAt = (u, v) => (cf.post && u >= 7 && u <= 8 && v >= 7 && v <= 8) || (gp && u >= gp[0] && u < gp[1] && v >= 7 && v <= 8);
  return (u, v, z) => {
    if (postAt(u, v)) return z < 12 || (z === 12 && (u === 7 || (gp && u === gp[0])) && v === 8) ? M.STAKE : 0;
    /* Les touffes au pied du piquet : le fil de fer est la clôture de ceux qui
       ne tondent pas jusqu'au pied. */
    if (z <= 2 && (cf.post || gp)) {
      const cx = gp ? (gp[0] + gp[1] - 1) / 2 : 7.5;
      const dd = Math.abs(u - cx) + Math.abs(v - 7.5);
      if (dd >= 1.5 && dd <= 3.5 && z < 1 + hash2(u * 7 + px, v * 5 + py) % 3 && hash2(u + 3 * px, v + 11 * py) % 3 !== 0) return M.GRASS;
    }
    const wx = px * T + u, wy = py * T + v;
    const ew = onAxisEW(u, v, cf) && (cf.w || cf.e || cf.gw || cf.ge), ns = onAxisNS(u, v, cf, false);
    if (!ew && !ns) return 0;
    const s = (ew ? wx : wy) % 32;                                          // d'un piquet à l'autre : deux cases
    const sag = Math.round(Math.sin(Math.PI * ((s - 8 + 32) % 32) / 32));
    return z === 4 - sag || z === 7 - sag || z === 10 - sag ? M.WIRE : 0;
  };
}
const MODELS = { [C.TOWN_FENCE.HEDGE]: hedgeModel, [C.TOWN_FENCE.IRON]: ironModel, [C.TOWN_FENCE.PICKET]: picketModel,
                 [C.TOWN_FENCE.BOARD]: boardModel, [C.TOWN_FENCE.WIRE]: wireModel };
/* Un poteau tous les combien de cases, sur un tronçon droit (un diviseur de
   la période de quatre). La haie n'en a pas ; la grille a un pilier tous les
   quatre (4,7 m), les palissades et le fil un poteau toutes les deux. */
const POST_EVERY = { [C.TOWN_FENCE.HEDGE]: 0, [C.TOWN_FENCE.IRON]: 4, [C.TOWN_FENCE.PICKET]: 2, [C.TOWN_FENCE.BOARD]: 2, [C.TOWN_FENCE.WIRE]: 2 };

/* La couleur d'un pixel, par matière. `wx, wy` : la position dans la période. */
function fenceColor(px, py) {
  return (m, face, u, v, z, nb) => {
    const wx = px * T + u, wy = py * T + v;
    if (m === M.LEAF) return pick(PAL[M.LEAF], leafLevel(face, wx, wy, z));
    let l = hardLevel(face, u, v, z, nb);
    if (m === M.STONE && face === "front") {
      /* Les moellons : assises de 3 px, blocs de 5 à 8 px décalés d'une assise
         à l'autre ; le joint est un palier plus sombre, le bloc a sa nuance. */
      const course = Math.floor(z / 3), zr = z % 3;
      const s = (nb.w || nb.e) ? wy : wx;
      const off = (course * 5) % 8, blk = Math.floor((s + off) / 7);
      if (zr === 2 || (s + off) % 7 === 0) l -= 0.22;
      else l += ((hash2(blk, course) % 3) - 1) * 0.08;
    }
    if (m === M.PLANK) {
      const p = plankOf(wx);
      const P = PLANKS[hash2(p.idx, 5) % PLANKS.length];
      if (p.first) l -= 0.18;                                               // le joint entre deux planches
      if (face === "front" && (z === 3 || z === 11) && ((wx - (p.first ? 0 : 1)) % 4 === 1)) l -= 0.35;   // un clou
      return pick(P, l);
    }
    if (m === M.WIRE) l = face === "top" ? 0.9 : 0.45;
    if (m === M.GRASS) l = 0.35 + (hash2(wx, wy + z) % 3) * 0.2;
    if (m === M.IRON) l = face === "top" ? 0.95 : nb.w ? 0.6 : 0.3;
    return pick(PAL[m], l);
  };
}

/* ── 6. LE CACHE D'ATLAS ─────────────────────────────────────────────────── */
export function makeFenceCache() {
  return { pages: [], map: new Map() };
}
const PAGE_W = 512, PAGE_H = 512;
function cacheCell(cache, key, w, h, paint) {
  const hit = cache.map.get(key);
  if (hit) return hit;
  let pg = cache.pages[cache.pages.length - 1];
  const fits = (p) => (p.x + w <= PAGE_W && p.y + Math.max(p.rowH, h) <= PAGE_H) || (p.y + p.rowH + h <= PAGE_H && w <= PAGE_W);
  if (!pg || !fits(pg)) {
    const c = document.createElement("canvas");
    c.width = PAGE_W; c.height = PAGE_H;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    pg = { c, g, x: 0, y: 0, rowH: 0 };
    cache.pages.push(pg);
  }
  if (pg.x + w > PAGE_W) { pg.x = 0; pg.y += pg.rowH; pg.rowH = 0; }
  const sx = pg.x, sy = pg.y;
  pg.x += w; pg.rowH = Math.max(pg.rowH, h);
  const im = pg.g.getImageData(sx, sy, w, h);
  paint(im.data, w, h);
  pg.g.putImageData(im, sx, sy);
  const cell = { img: pg.c, sx, sy, w, h };
  cache.map.set(key, cell);
  return cell;
}
const blit = (ctx, c, dx, dy) => ctx.drawImage(c.img, c.sx, c.sy, c.w, c.h, dx, dy, c.w, c.h);

/* ── 7. LE VOISINAGE D'UNE CASE DE CLÔTURE ─────────────────────────────────
   ⚠️ UNE SEULE LECTURE DÉCIDE DE TOUT (la jointure du 449) : les bras, les
   bouts, les poteaux, les portails. Mise en cache par carte. */
const GATE_MEMO = new WeakMap();
function gateSides(tw) {
  let g = GATE_MEMO.get(tw);
  if (!g) {
    g = new Map();
    for (const gt of tw.gates || []) {
      g.set((gt.y * tw.w + gt.x - 1), "e");            // la case à l'ouest de l'ouverture : portail à l'est
      g.set((gt.y * tw.w + gt.x + gt.w), "w");         // la case à l'est : portail à l'ouest
    }
    GATE_MEMO.set(tw, g);
  }
  return g;
}
export function townFenceConf(tw, x, y) {
  const at = (xx, yy) => (xx < 0 || yy < 0 || xx >= tw.w || yy >= tw.h ? 0 : tw.hedge[yy * tw.w + xx]);
  const style = at(x, y);
  const side = gateSides(tw).get(y * tw.w + x);
  const cf = { n: at(x, y - 1) > 0, s: at(x, y + 1) > 0, w: at(x - 1, y) > 0, e: at(x + 1, y) > 0, gw: side === "w", ge: side === "e" };
  const vert = cf.n || cf.s, horz = cf.w || cf.e || cf.gw || cf.ge;
  const nArms = (cf.n ? 1 : 0) + (cf.s ? 1 : 0) + (cf.w ? 1 : 0) + (cf.e ? 1 : 0);
  const every = POST_EVERY[style] || 0;
  const straightEW = cf.w && cf.e && !vert, straightNS = cf.n && cf.s && !horz;
  /* ⚠️ DEUX JONCTIONS VOISINES NE PORTENT QU'UN POTEAU. Là où deux jardins
     partagent un flanc, l'angle de l'un et le té de l'autre tombent souvent
     sur deux rangées consécutives : deux piliers empilés (vu en jeu aux
     Tilleuls, 2026-09-28). Le second, au sud ou à l'est, s'efface — l'ouvrage
     se raccorde sans lui (les bras se rejoignent au centre). */
  const junction = (xx, yy) => {
    if (!(at(xx, yy) > 0)) return false;
    const v2 = at(xx, yy - 1) > 0 || at(xx, yy + 1) > 0, h2 = at(xx - 1, yy) > 0 || at(xx + 1, yy) > 0;
    return v2 && h2;
  };
  const stacked = (vert && horz) && (junction(x, y - 1) || junction(x - 1, y));
  /* Et le poteau RÉGULIER s'efface à côté d'un poteau obligé (un bout, un
     angle, un pilier de portail) : deux piliers côte à côte, c'est un de trop. */
  const forced = (xx, yy) => {
    if (!(at(xx, yy) > 0)) return false;
    if (side !== undefined && xx === x && yy === y) return true;
    if (gateSides(tw).has(yy * tw.w + xx)) return true;
    const nn = (at(xx, yy - 1) > 0) + (at(xx, yy + 1) > 0), hh = (at(xx - 1, yy) > 0) + (at(xx + 1, yy) > 0);
    return (nn && hh) || nn + hh <= 1;
  };
  const regular = (straightEW && x % every === 0 && !forced(x - 1, y) && !forced(x + 1, y))
    || (straightNS && y % every === 0 && !forced(x, y - 1) && !forced(x, y + 1));
  cf.post = every > 0 && !cf.gw && !cf.ge && ((vert && horz && !stacked) || nArms <= 1 || regular);
  return { style, cf };
}

/* ── 8. CE QUE LE JEU APPELLE ──────────────────────────────────────────── */
function paintFenceCell(d, W, H, style, cf, px, py, snow) {
  const base = MODELS[style](cf, px, py);
  const model = withSnow(base, snow | 0, 0, T - 1, 0, T - 1);
  // Sur la neige, l'ombre de contact est bleue (DESSIN.md, neige.js).
  paintVoxels(d, W, H, 0, FENCE_OV, model, 30, 0, T - 1, 0, T - 1, snowColor(fenceColor(px, py)), contactShadow(base), snow ? SNOW_SHADOW : null);
}
/* Une case de clôture, dessinée à (px, py) = son coin haut-gauche au sol.
   Rend faux si la case n'en porte pas (l'appelant a son repli). `snow` : 0, 1
   (légère) ou 2 (épaisse) — trois cellules en cache au plus par voisinage. */
export function drawTownFenceTile(ctx, S, tw, x, y, px, py, snow) {
  const cache = S && S.townEnclos;
  if (!cache || !tw.hedge) return false;
  const { style, cf } = townFenceConf(tw, x, y);
  if (!MODELS[style]) return false;
  const bx = x & 3, by = y & 3, sn = snow | 0;
  const key = `f${style}${+cf.n}${+cf.s}${+cf.w}${+cf.e}${+cf.gw}${+cf.ge}${+cf.post}${bx}${by}${sn ? "s" + sn : ""}`;
  const cell = cacheCell(cache, key, T, CH, (d, W, H) => paintFenceCell(d, W, H, style, cf, bx, by, sn));
  blit(ctx, cell, px, py - FENCE_OV);
  return true;
}
/* 2026-09-28 (phase 12a) — LA HAUTEUR DE LA CLÔTURE AU PIXEL (en voxels, 0 là
   où il n'y a rien), lue dans le MÊME modèle que son dessin : l'ombre qu'elle
   porte sur la neige (`neige.js`) est donc ajourée comme elle — les jours entre
   les piquets, les barreaux de la grille, les trois brins du fil. Un tableau de
   256 octets par voisinage (mémo, comme les cellules du dessin). */
const HEIGHT_MEMO = new Map();
export function townFenceHeights(tw, x, y) {
  if (!tw.hedge) return null;
  const { style, cf } = townFenceConf(tw, x, y);
  if (!MODELS[style]) return null;
  const bx = x & 3, by = y & 3;
  const key = `${style}${+cf.n}${+cf.s}${+cf.w}${+cf.e}${+cf.gw}${+cf.ge}${+cf.post}${bx}${by}`;
  let h = HEIGHT_MEMO.get(key);
  if (h) return h;
  const model = MODELS[style](cf, bx, by);
  h = new Uint8Array(T * T);
  for (let v = 0; v < T; v++) for (let u = 0; u < T; u++) {
    for (let z = 30; z >= 0; z--) if (model(u, v, z) && model(u, v, z) !== M.GRASS) { h[v * T + u] = z + 1; break; }
  }
  HEIGHT_MEMO.set(key, h);
  return h;
}

/* ── 9. LES PORTAILS ───────────────────────────────────────────────────────
   Deux vantaux de 16 px, gonds sur les poteaux, qui s'ouvrent VERS LE JARDIN
   (le nord). Un vantail est un modèle plat `(s, z)` — `s` le long du vantail
   depuis le gond — tourné d'un angle θ et revoxelisé : la pose à 45° est la
   même grille que la pose fermée, vue de biais, pas un dessin de plus. */
export const GATE_FRAMES = 6;                            // 0°, 18°, … 90°
const LEAF_W = 16;
function leafModel(style) {
  const F = C.TOWN_FENCE;
  if (style === F.IRON) {
    const top = (s) => 15 + Math.round(3 * (s / (LEAF_W - 1)) ** 2);   // le cintre monte vers le milieu du portail
    return (s, z) => {
      const t = top(s);
      if (s === 0 || s === LEAF_W - 1) return z >= 1 && z <= t ? M.IRON : 0;
      if (z === 3 || z === 8 || z === t) return z >= 1 ? M.IRON : 0;
      if (s % 3 === 1) return (z >= 1 && z <= t + 2) || (z === t + 3 && s % 6 === 1) ? M.IRON : 0;
      return 0;
    };
  }
  if (style === F.PICKET) {
    return (s, z) => {
      const k = s % 4;
      if ((z === 3 || z === 8) && s < LEAF_W - 1) return M.PAINT;
      const diag = Math.abs(z - (3 + (s / (LEAF_W - 1)) * 5)) < 0.6;
      if (diag) return M.PAINT;
      if (k === 3) return 0;
      return z < 11 || (z === 11 && k === 1) ? M.PAINT : 0;
    };
  }
  if (style === F.BOARD) {
    return (s, z) => {
      if (z >= 14) return 0;
      if (z === 3 || z === 11 || Math.abs(z - (3 + (s / (LEAF_W - 1)) * 8)) < 0.6) return M.WOOD;   // traverses et écharpe
      return M.PLANK;
    };
  }
  if (style === F.WIRE) {
    return (s, z) => {
      if (s === 0 || s === LEAF_W - 1) return z < 12 ? M.STAKE : 0;
      if (z === 2 || z === 6 || z === 10) return M.STAKE;
      return Math.abs(z - (2 + (s / (LEAF_W - 1)) * 8)) < 0.6 ? M.STAKE : 0;
    };
  }
  /* Le portillon de la haie : chêne à claire-voie, deux traverses, une écharpe. */
  return (s, z) => {
    if (z > 13) return 0;
    if (s <= 1 || s >= LEAF_W - 2) return M.WOOD;
    if (z === 2 || z === 11) return M.WOOD;
    if (Math.abs(z - (2 + (s / (LEAF_W - 1)) * 9)) < 0.6) return M.WOOD;
    return s % 3 !== 2 && z >= 1 && z <= 12 ? M.WOOD : 0;
  };
}
function paintGate(d, W, H, style, frame, snow) {
  const th = (frame / (GATE_FRAMES - 1)) * (Math.PI / 2);
  const leaf = leafModel(style);
  const hy = 8.5;                                        // l'axe de la clôture (la rangée de pixels 8)
  const leaves = [{ hx: 0, dir: 1 }, { hx: 2 * T, dir: -1 }];
  const model = (u, v, z) => {
    for (const lf of leaves) {
      const dx = lf.dir * Math.cos(th), dy = -Math.sin(th);
      const rx = u + 0.5 - lf.hx, ry = v + 0.5 - hy;
      const s = rx * dx + ry * dy, t = -rx * dy + ry * dx;
      if (s < 0 || s >= LEAF_W || Math.abs(t) > 0.6) continue;
      const m = leaf(Math.min(LEAF_W - 1, Math.floor(s)), z);
      if (m) return m;
    }
    return 0;
  };
  const color = snowColor(fenceColor(0, 0));
  paintVoxels(d, W, H, GATE_PAD, FENCE_OV, withSnow(model, snow | 0, -GATE_PAD, 2 * T + GATE_PAD - 1, -9, T - 1), 27, -GATE_PAD, 2 * T + GATE_PAD - 1, -9, T - 1, color, null);   // ouvert, un vantail remonte de 16 px au nord de son axe (8,5)
}
/* Le portail `g` (une entrée de `tw.gates`), ouvert à `open` ∈ [0, 1]. ⚠️ Un
   portail qu'on ouvre DANS la neige garde la sienne : elle tourne avec lui (la
   même revoxelisation) — le coup de balai du vantail sur le sol, lui, n'est
   pas dessiné. */
export function drawTownGate(ctx, S, g, open, snow) {
  const cache = S && S.townEnclos;
  if (!cache) return false;
  const frame = Math.max(0, Math.min(GATE_FRAMES - 1, Math.round(open * (GATE_FRAMES - 1))));
  const W = 2 * T + 2 * GATE_PAD, sn = snow | 0;
  const cell = cacheCell(cache, `g${g.style}${frame}${sn ? "s" + sn : ""}`, W, CH, (d, w, h) => paintGate(d, w, h, g.style, frame, sn));
  blit(ctx, cell, g.x * T - GATE_PAD, g.y * T - FENCE_OV);
  return true;
}

/* ── 10. LE POTAGER DES JARDINS OUVERTS ────────────────────────────────────
   Un carré surélevé : un cadre de planches, une terre en billons, des rangs
   de légumes SELON LA SAISON — choux, poireaux, laitues et tomates tuteurées
   l'été ; semis et jeunes laitues au printemps ; potirons et choux l'automne ;
   paillage et choux d'hiver. Les légumes sont des volumes comme le reste :
   une boule éclairée d'en haut à gauche. */
const PLOT_OV = 14;
function plotModel(w, h, season, seed) {
  const W = w * T, H = h * T;
  const rows = [];
  for (let r = 0, y = 4; y < H - 3; y += 6, r++) rows.push({ y, kind: r });
  const plants = [];
  const cycle = season === "summer" ? ["cabbage", "leek", "lettuce", "tomato"]
    : season === "spring" ? ["sprout", "lettuce", "sprout", "leek"]
    : season === "autumn" ? ["pumpkin", "cabbage", "stalk", "pumpkin"]
    : ["straw", "cabbage", "straw", "straw"];
  for (const rw of rows) {
    const kind = cycle[(rw.kind + seed) % cycle.length];
    const step = kind === "leek" ? 3 : kind === "sprout" ? 3 : kind === "pumpkin" ? 9 : kind === "tomato" ? 8 : 6;
    for (let x = 4 + ((seed + rw.kind) % 2); x < W - 3; x += step) plants.push({ x, y: rw.y, kind, h: hash2(x + seed, rw.y) });
  }
  return (u, v, z) => {
    if (u < 0 || v < 0 || u >= W || v >= H) return 0;
    const border = u === 0 || v === 0 || u === W - 1 || v === H - 1;
    if (border) return z < 3 ? M.WOOD : 0;
    if (z < 2) return M.SOIL;
    for (const p of plants) {
      const dx = u + 0.5 - (p.x + 0.5), dy = v + 0.5 - (p.y + 0.5), zz = z - 2;
      switch (p.kind) {
        case "cabbage": if (Math.hypot(dx, dy * 1.1, (zz - 1.6) * 1.2) <= 2.4) return M.CABBAGE; break;
        case "lettuce": if (Math.hypot(dx, dy, (zz - 0.8) * 1.6) <= 2) return M.LETTUCE; break;
        case "leek": if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && zz < 5 + (p.h % 2)) return M.LEEK; break;
        case "sprout": if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && zz < 1 + (p.h % 2)) return M.LETTUCE; break;
        case "tomato":
          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && zz < 10) return M.STAKE;
          if (Math.hypot(dx * 0.9, dy, (zz - 5) * 0.55) <= 2.6) return (p.h >>> (Math.abs(zz * 3 + Math.round(dx)) % 16)) % 5 === 0 ? M.TOMATO : M.LEEK;
          break;
        case "pumpkin": if (Math.hypot(dx * 0.8, dy, (zz - 1.5) * 1.25) <= 2.4) return M.PUMPKIN; if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && zz === 3) return M.LEEK; break;
        case "stalk": if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && zz < 4) return M.STRAW; break;
        case "straw": if (zz === 0 && (hash2(u * 3 + p.x, v * 5) % 4 !== 0) && Math.abs(dy) <= 2) return M.STRAW; break;
        default: break;
      }
    }
    return 0;
  };
}
function plotColor() {
  return (m, face, u, v, z, nb) => {
    let l = hardLevel(face, u, v, z, nb);
    if (m === M.SOIL) l = face === "top" ? ((v % 6) < 3 ? 0.55 : 0.3) : 0.2;   // les billons
    if (m === M.CABBAGE || m === M.LETTUCE || m === M.PUMPKIN) l += face === "top" ? 0.1 : -0.05;
    if (m === M.WOOD) return pick(PLANKS[1], l);
    return pick(PAL[m], l);
  };
}
/* Le potager `p` (une entrée de `tw.plots`) pour la saison `season`. */
export function drawTownPlot(ctx, S, p, season, snow) {
  const cache = S && S.townEnclos;
  if (!cache) return false;
  const sk = season === "spring" || season === "autumn" || season === "winter" ? season : "summer";
  const seed = (p.x * 7 + p.y * 3) & 3, sn = snow | 0;
  const W = p.w * T, H = p.h * T + PLOT_OV;
  const cell = cacheCell(cache, `p${p.w}x${p.h}${sk}${seed}${sn ? "s" + sn : ""}`, W, H, (d, w, h) => {
    const base = plotModel(p.w, p.h, sk, seed);
    paintVoxels(d, w, h, 0, PLOT_OV, withSnow(base, sn, 0, p.w * T - 1, 0, p.h * T - 1), 17, 0, p.w * T - 1, 0, p.h * T - 1, snowColor(plotColor()), contactShadow(base), sn ? SNOW_SHADOW : null);
  });
  blit(ctx, cell, p.x * T, p.y * T - PLOT_OV);
  return true;
}

/* ── 11. LA HAIE-DÉCOR DU QUAI ─────────────────────────────────────────────
   `hedgeRow` est un DÉCOR de la planche (62 × 30), posé par le générateur au
   fond de la scène du quai, avec son emprise (`townPropBox`) : on garde sa
   taille au pixel près — l'emprise n'en bouge pas — et on le repeint dans la
   matière des haies de la ville, pour que la même haie ne soit pas de deux
   dessins. Un tronçon droit, bouts arrondis, posé au bas du cadre. */
export function hedgeRowSprite(W, H) {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  const v0 = H - 12, v1 = H - 4;                     // l'emprise au sol : 8 px, 4 px au-dessus du bas (l'ombre)
  const inH = (u, v) => u >= 1 && u <= W - 2 && v >= v0 && v < v1;
  const edge = (u, v) => { for (let k = 1; k <= 2; k++) if (!inH(u - k, v) || !inH(u + k, v) || !inH(u, v - k) || !inH(u, v + k)) return k - 1; return 2; };
  const model = (u, v, z) => (inH(u, v) && z < 10 + edge(u, v) ? M.LEAF : 0);
  const im = g.getImageData(0, 0, W, H);
  paintVoxels(im.data, W, H, 0, 0, model, 14, 0, W - 1, 0, H - 1, fenceColor(0, 0), contactShadow(model));
  g.putImageData(im, 0, 0);
  return c;
}

/* Pour les bancs : ce qui se dessine hors du jeu. */
export const FENCE_TEST = { CH, GATE_PAD, PLOT_OV, paintFenceCell, paintGate, MODELS, PAL, M, withSnow };
