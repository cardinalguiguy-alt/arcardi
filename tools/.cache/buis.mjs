/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 2026-09-28 (phase 7b, suite) — LES BUIS DE VALLEY TOWN, EN VOLUMES.
   ╚══════════════════════════════════════════════════════════════════════════
   Guillaume : les « bandes vertes “interactives” simplistes » et les « petits
   buis à baies » sont laids. Trois décors, un seul arbuste :
   · `shrub` — la BOULE de buis. Avant : un buisson étoilé de 20 × 22 semé de
     carrés de couleur que l'œil lisait comme des baies (`townShrubSprite`,
     supprimé).
   · `grassTuft` — le MASSIF de buis en nuage. Avant : la « touffe d'herbe » de
     la planche, qui n'en était pas une — un rectangle vert de 44 × 23, mal
     nommé à l'import (`import-planche.mjs`), une haie basse sans volume : LA
     « bande verte ». Il plie au passage (`TOWN_SOFT_PROPS`), d'où les
     guillemets de Guillaume. ⚠️ Le nom du décor reste `grassTuft` : il est lu
     par le générateur, l'emprise (`TOWN_PROP_ART`), le décor mou, les bancs —
     le renommer déplacerait la carte pour un mot.
   · `topiary` — le BUIS TAILLÉ : sur tige, en cône, en double boule. Avant :
     trois disques plats sur un bâton, dans un bac (`plazaTopiarySprite`,
     supprimé).

   ⚠️⚠️ UN SEUL ARBUSTE, DEUX TENUES : TAILLÉ OU LIBRE, ET C'EST LE QUARTIER QUI
   DÉCIDE (le principe de la cohérence sociale, `C.townRankAt`) :
   · taillé sur les pelouses municipales (`G_TOWN_LAWN` : squares, parc, place —
     la ville les entretient, dans tous les quartiers) et dans le pré des
     quartiers aisés et moyens (rangs 0 et 1 : la classe moyenne a déjà des
     haies de buis taillées, `townParcelFence`) ;
   · LIBRE dans le pré des quartiers modestes (rang 2 : personne n'y taille) et
     sur la rive sauvage du lac (`pr.wild`, posé par le générateur : « aucun
     objet CONSTRUIT » — et une boule taillée est un ouvrage).
   Un buis libre n'est pas une boule ratée : c'est un autre contour (des touffes
   qui dépassent, quelques pousses) sur la MÊME matière — DESSIN.md : « on
   oppose une ligne construite à une ligne qui ne l'est pas ».

   ⚠️⚠️ LA MATIÈRE : DES TOUFFES POSÉES SUR LA SURFACE, ÉCLAIRÉES UNE À UNE.
   Chaque forme est un CHAMP (des superellipsoïdes, un cône, en union lissée) ;
   des touffes (petites sphères de 2 à 3 px) sont semées SUR sa surface, à
   distance minimale (graine fixe, aucun tirage) ; un voxel est de la feuille
   s'il est dans le cœur ou dans une touffe. Sa lumière mêle la normale de la
   FORME (la boule se lit ronde, éclairée en haut à gauche) et celle de SA
   touffe (chaque touffe a son éclat et son ombre) ; le creux entre deux touffes
   s'assombrit, le cœur vu entre elles est le plus sombre. C'est la règle du
   438 (« on assemble des masses, on ne texture pas une silhouette ») et celle
   du buisson taillé de la ferme (« un ouvrage taillé dans une matière vivante
   garde sa matière ; ce qui change est le contour ») : taillé, les touffes ne
   dépassent presque pas (contour net) ; libre, elles débordent.
   ⚠️ Aucun pixel tiré au hasard, aucun tramage : le grain vient des touffes.

   ⚠️ LA BOULE EST APLATIE EN PROFONDEUR, ET C'EST CE QUI LA REND RONDE. La
   projection du jeu monte d'un pixel par pixel de hauteur ET par pixel de
   profondeur : une vraie sphère sortirait à l'écran en œuf dressé (×1,41). Les
   rayons (largeur, profondeur, hauteur) sont choisis pour que √(prof² + haut²)
   vaille la largeur — la boule se lit ronde.

   LES SAISONS (un persistant) : au printemps, les jeunes pousses vert tendre
   au sommet des touffes ; l'hiver, le buis TERNIT vers l'olive ; l'été et
   l'automne, sa couleur. ⚠️ Il ne passe donc plus par `NG.winterizePixels`
   (qui en faisait des brindilles de caduc, ou de la paille pour la « touffe
   d'herbe »).

   LA NEIGE : les voxels de `withSnow` (clotures.js) — un chapeau qui tient là
   où la pente de la forme est douce, plus épais au sommet, cerné de bleu froid
   (un chapeau blanc sur un sol blanc se perdrait sans lui) ; la neige posée au
   sol n'a pas de cerne ; sous une neige épaisse, le pied s'enfonce (une jupe de
   neige d'un ou deux voxels). Deux niveaux en fondu, comme les clôtures
   (`NG.depthSnowMix`).

   ⚠️ LE RENDU EST PARESSEUX ET PASSE PAR L'ATLAS DES CLÔTURES (`S.townEnclos`) :
   une cellule par (forme, variante, saison, neige), à son premier affichage.
   Aucun canevas de plus (§10 de CLAUDE.md : sur iPad, c'est le NOMBRE qui
   compte) — les trois dessins remplacés en retenaient huit.

   ⚠️ PUR, sauf `document.createElement("canvas")` (par `cacheCell`) : le banc
   `tools/render-buis.mjs` l'importe et regarde tout.
   ══════════════════════════════════════════════════════════════════════════ */
import * as C from "./fermeConstants.mjs";
import { VOXEL } from "./clotures.mjs";

const { paintVoxels, withSnow, cacheCell, blit, pick, PAL, M, CERNE, SNOW_SHADOW } = VOXEL;
/* Une pousse d'un voxel, qui dépasse d'un buis libre : sans cerne (un trait
   d'un pixel cerné des deux côtés ferait une rayure noire). */
const SPRIG = 30;

/* ── 1. OUTILS ─────────────────────────────────────────────────────────── */
function hh(a, b, c) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x165667b1, 0x85ebca77) ^ Math.imul((c | 0) ^ 0x3c6ef372, 0xc2b2ae3d);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return h >>> 0;
}
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const norm = (x, y, z) => { const n = Math.hypot(x, y, z) || 1; return [x / n, y / n, z / n]; };

/* ── 2. LA MATIÈRE ET SA PALETTE ────────────────────────────────────────────
   ⚠️ ÉCRITES DANS `clotures.js` (« la matière du buis »), PAS ICI : la haie des
   clôtures est le même arbuste, et deux palettes du buis divergeraient au
   premier réglage (§8 de CLAUDE.md). Sept paliers, les pousses du printemps,
   l'hiver terni ; la lumière d'un voxel (`boxLight`) et sa couleur (`boxColor`). */
const { boxLight, boxColor, boxSeason, BOX_LEAF: LEAF, BOX_SHINE: SHINE, BOX_SHOOT: SHOOT, BOX_WINTER: WINTER } = VOXEL;
const SNOW_RIM = [120, 140, 176];    // le cerne froid d'un chapeau de neige (celui de `NG.snowCapPixels`, opaque)
/* La neige AU SOL du pied enfoncé : sans cerne (un cerne au ras du sol dessinait
   un cadre blanc autour de chaque buis — vu au banc). */
const SNOWG = 31;
const OPT = { thick: new Set([M.LEAF, M.SNOW]), cerne: { [M.LEAF]: CERNE[M.LEAF], [M.SNOW]: SNOW_RIM } };

/* ── 3. LES CHAMPS ──────────────────────────────────────────────────────────
   Une superellipsoïde (exposant 2 : ellipsoïde ; au-delà, plus « taillée »),
   un cône arrondi. La valeur rendue approche une distance en voxels : la
   distance au centre × (1 − 1/n), juste près de la surface quelle que soit
   l'anisotropie — les touffes se posent donc à la même profondeur partout. */
const ell = (cu, cv, cz, ru, rv, rz, p = 2) => ({ t: 0, cu, cv, cz, ru, rv, rz, p });
const cone = (cu, cv, h, ru, rv, k = 0.95) => ({ t: 1, cu, cv, h, ru, rv, k });
/* Une boîte aux arêtes arrondies (la haie du quai) : [u0, u1] × [v0, v1] × [0, h],
   rayon r ; le bas descend sous le sol (il ne s'arrondit pas). */
const rbox = (u0, u1, v0, v1, h, r) => ({ t: 2, b: [u0, u1, v0, v1, -h, h], r, cu: (u0 + u1) / 2, ru: (u1 - u0) / 2, cv: (v0 + v1) / 2, rv: (v1 - v0) / 2 });
function fPrim(e, x, y, z) {
  if (e.t === 2) {
    const b = e.b, r = e.r;
    const qx = Math.abs(x - (b[0] + b[1]) / 2) - (b[1] - b[0]) / 2 + r, qy = Math.abs(y - (b[2] + b[3]) / 2) - (b[3] - b[2]) / 2 + r;
    const qz = Math.abs(z - (b[4] + b[5]) / 2) - (b[5] - b[4]) / 2 + r;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
  }
  if (e.t === 0) {
    const a = Math.abs(x - e.cu) / e.ru, b = Math.abs(y - e.cv) / e.rv, c = Math.abs(z - e.cz) / e.rz;
    const n = e.p === 2 ? Math.sqrt(a * a + b * b + c * c) : Math.pow(a ** e.p + b ** e.p + c ** e.p, 1 / e.p);
    if (n < 1e-6) return -Math.min(e.ru, e.rv, e.rz);
    return Math.hypot(x - e.cu, y - e.cv, z - e.cz) * (1 - 1 / n);
  }
  const a = (x - e.cu) / e.ru, b = (y - e.cv) / e.rv, rr = Math.hypot(a, b);
  const t = clamp01(z / e.h), R = Math.pow(1 - t, e.k);
  return Math.max((rr - R) * e.ru * 0.85, z - e.h, -z);
}
const smin = (a, b, k) => { if (!k) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
function fieldOf(def) {
  const P = def.prims, k = def.smooth || 0;
  return (x, y, z) => { let f = fPrim(P[0], x, y, z); for (let i = 1; i < P.length; i++) f = smin(f, fPrim(P[i], x, y, z), k); return f; };
}
function gradOf(f, x, y, z) {
  const e = 0.35;
  return [f(x + e, y, z) - f(x - e, y, z), f(x, y + e, z) - f(x, y - e, z), f(x, y, z + e) - f(x, y, z - e)];
}

/* ── 4. LES FORMES ──────────────────────────────────────────────────────────
   En voxels d'un pixel d'art : `u` vers l'est, `v` vers le sud (la
   profondeur), `z` la hauteur ; (0, 0, 0) est le pied, au centre de la case.
   `puff` : rayon des touffes, `sp` : leur écart ; `free` : buis libre (touffes
   plus grosses qui débordent, quelques pousses) ; `stem` / `soil` : la tige
   d'un buis sur tige et son cercle de terre désherbé.
   ⚠️ La profondeur ne dépasse jamais six voxels vers le sud : le dessin est
   posé par le bas sur le bord sud de la case (comme tout décor), le pied au
   milieu — le septième rang est au cerne et à l'ombre. */
const FORMS = {
  /* LA BOULE (shrub taillé) : six gabarits, pour qu'un massif en mêle deux ou
     trois tailles — trois boules pareilles côte à côte se lisent comme un
     motif, pas comme un jardin. La variante 0 est celle du collier de la place
     (`v: 0`, générateur) : quatre boules égales autour du buis sur tige. */
  ball: [
    { prims: [ell(0, 0, 5.9, 7.5, 4.9, 6.3, 2.15)], puff: 2.7, sp: 2.6 },
    { prims: [ell(0, 0, 4.4, 5.6, 3.8, 4.8, 2.15)], puff: 2.4, sp: 2.3 },
    { prims: [ell(0, 0, 6.9, 9.0, 5.5, 7.3, 2.1)], puff: 2.9, sp: 2.8 },
    { prims: [ell(0, 0, 4.1, 9.2, 5.5, 5.0, 2.5)], puff: 2.7, sp: 2.6 },     // le coussin
    { prims: [ell(0, 0, 5.5, 7.0, 4.7, 5.9, 2.15)], puff: 2.6, sp: 2.5 },
    { prims: [ell(0, 0, 3.4, 7.2, 4.5, 4.0, 2.5)], puff: 2.5, sp: 2.4 },     // le petit coussin
  ],
  /* LE BUIS LIBRE (shrub hors des quartiers qui taillent, rive sauvage, ferme). */
  wild: [
    { prims: [ell(0, 0, 6.2, 7.6, 4.8, 6.6), ell(-4.4, 0.6, 4.4, 4.8, 4.0, 4.6), ell(4.6, -0.4, 5.4, 5.0, 4.0, 5.4)], smooth: 3, puff: 3.0, sp: 2.8, free: true, sprigs: 5 },
    { prims: [ell(0, 0, 7.0, 6.8, 4.6, 7.4), ell(-5.0, 0.4, 4.0, 4.4, 3.8, 4.0), ell(3.4, 0.8, 8.8, 3.8, 3.2, 3.8)], smooth: 3, puff: 3.0, sp: 2.8, free: true, sprigs: 6 },
    { prims: [ell(0, 0, 4.6, 8.8, 5.2, 5.0), ell(-3.2, -0.8, 7.0, 4.8, 3.8, 4.0), ell(4.2, 0.2, 6.4, 4.4, 3.8, 4.0)], smooth: 3, puff: 3.1, sp: 2.9, free: true, sprigs: 5 },
  ],
  /* LE MASSIF EN NUAGE (grassTuft taillé) : trois coussins fondus, deux gros et
     un petit, ou une rangée de quatre boules — l'emprise de la planche (44 px,
     `TOWN_PROP_ART`) ne bouge pas. */
  cloud: [
    { prims: [ell(-12.4, 0.3, 4.7, 7.6, 4.8, 5.6, 2.3), ell(0, -0.2, 6.3, 9.4, 5.2, 7.0, 2.3), ell(12.8, 0.4, 4.1, 7.0, 4.6, 4.9, 2.3)], smooth: 2.2, puff: 2.7, sp: 2.6 },
    { prims: [ell(-9.4, 0, 6.5, 10.4, 5.3, 7.3, 2.3), ell(7.6, 0.3, 4.9, 8.2, 4.9, 5.8, 2.3), ell(16.0, 0.6, 3.0, 4.2, 3.6, 3.5, 2.2)], smooth: 1.8, puff: 2.7, sp: 2.6 },
    { prims: [ell(-15.0, 0.4, 4.3, 5.2, 4.0, 4.8, 2.15), ell(-5.0, 0, 5.5, 6.4, 4.6, 6.0, 2.15), ell(5.6, 0.2, 5.1, 6.0, 4.4, 5.6, 2.15), ell(15.3, 0.5, 3.9, 4.8, 3.8, 4.4, 2.15)], puff: 2.5, sp: 2.4 },
  ],
  /* LE MASSIF LIBRE (grassTuft hors des quartiers qui taillent, rive sauvage). */
  mound: [
    { prims: [ell(-11, 0.4, 4.3, 8.4, 4.9, 5.5), ell(0.5, -0.3, 5.5, 9.2, 5.2, 6.7), ell(11.5, 0.5, 3.7, 7.6, 4.7, 4.9)], smooth: 3.2, puff: 3.0, sp: 2.8, free: true, sprigs: 7 },
    { prims: [ell(-8, 0, 5.1, 10.8, 5.3, 6.7), ell(9.5, 0.3, 4.4, 9.4, 4.9, 5.7)], smooth: 3, puff: 3.1, sp: 2.9, free: true, sprigs: 6 },
  ],
  /* LE BUIS TAILLÉ (topiary) : sur tige (la variante 0, celle de la place et du
     parc — `v: 0`), en cône, en double boule. Planté en pleine terre, un cercle
     de terre désherbé au pied (l'ancien bac posé sur la pelouse n'avait pas de
     raison d'être dans un parterre). */
  topiary: [
    { prims: [ell(0, 0, 16.6, 9.0, 5.6, 7.0, 2.15)], stem: 12, soil: [3.8, 2.6], puff: 2.7, sp: 2.6 },
    { prims: [cone(0, 0, 25, 7.2, 4.6, 0.92)], soil: [8.4, 5.4], puff: 2.4, sp: 2.3 },
    { prims: [ell(0, 0, 11.0, 7.6, 4.9, 5.9, 2.15), ell(0, 0, 22.4, 5.2, 3.6, 4.3, 2.15)], stem: 20, soil: [3.4, 2.3], puff: 2.4, sp: 2.3 },
  ],
  /* LA HAIE DU QUAI (`hedgeRow`) : un tronçon de haie taillée de 60 px, bouts
     arrondis — la haie des clôtures (même coupe : 8 px de profondeur, faîte à
     12), posée seule au fond de la scène du quai. Au premier jet de la 7b, elle
     était repeinte dans l'ancienne matière des clôtures : un rectangle marbré. */
  hedge: [
    { prims: [rbox(-30, 30, -4, 4, 12, 2.6)], puff: 2.6, sp: 2.5 },
  ],
  /* LE BUIS SUR TIGE LAISSÉ À LUI-MÊME (topiary dans un pré qu'on ne tond pas). */
  overgrown: [
    { prims: [ell(0, 0, 7.8, 7.4, 4.9, 8.2), ell(-2, 0.5, 15.2, 6.0, 4.3, 6.3), ell(1.8, -0.4, 20.2, 4.6, 3.5, 4.8)], smooth: 3, puff: 3.1, sp: 2.9, free: true, sprigs: 7 },
    { prims: [ell(0, 0, 6.4, 8.4, 5.2, 6.8), ell(2.2, 0, 13.4, 6.2, 4.4, 6.0), ell(-2.6, 0.3, 17.0, 4.4, 3.4, 4.4)], smooth: 3, puff: 3.1, sp: 2.9, free: true, sprigs: 6 },
  ],
};

/* ── 5. LES TOUFFES ─────────────────────────────────────────────────────────
   Un réseau de candidats à pas fixe, décalés au hachage, ramenés sur la
   coquille (le champ à `−depth`) par quelques pas de Newton ; on garde ceux
   qui sont à distance `sp` de tous les autres. Déterministe : l'ordre de
   balayage et les décalages ne dépendent que de la forme. */
function placePuffs(f, B, def, seed) {
  const out = [], sp = def.sp, step = sp * 0.62;
  const depth = def.puff * (def.free ? 0.38 : 0.56);
  const G = new Map(), gk = (x, y, z) => ((Math.floor(x / sp) + 64) * 4096 + (Math.floor(y / sp) + 64)) * 4096 + Math.floor(z / sp) + 64;
  const near = (p) => {
    const gx = Math.floor(p[0] / sp), gy = Math.floor(p[1] / sp), gz = Math.floor(p[2] / sp);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      const lst = G.get(((gx + a + 64) * 4096 + (gy + b + 64)) * 4096 + gz + c + 64);
      if (!lst) continue;
      for (const q of lst) if (Math.hypot(q.c[0] - p[0], q.c[1] - p[1], q.c[2] - p[2]) < sp) return true;
    }
    return false;
  };
  let n = 0;
  for (let z = 0; z <= B.z1; z += step) for (let v = B.v0; v <= B.v1; v += step) for (let u = B.u0; u <= B.u1; u += step) {
    n++;
    const h = hh(n, seed, 0x51);
    let p = [u + ((h & 255) / 255 - 0.5) * step, v + (((h >>> 8) & 255) / 255 - 0.5) * step, z + (((h >>> 16) & 255) / 255 - 0.5) * step];
    if (Math.abs(f(p[0], p[1], p[2]) + depth) > step * 1.6) continue;
    /* Newton sur l'isosurface : p ← p − (f − cible)·∇f/|∇f|². `gradOf` rend
       des différences sur 0,7 voxel, donc ∇f = g/0,7 et le pas vaut
       (f − cible)·0,7·g/|g|². */
    for (let it = 0; it < 4; it++) {
      const fv = f(p[0], p[1], p[2]) + depth;
      if (Math.abs(fv) < 0.06) break;
      const g = gradOf(f, p[0], p[1], p[2]), g2 = g[0] * g[0] + g[1] * g[1] + g[2] * g[2];
      if (g2 < 1e-9) break;
      const s = fv * 0.7 / g2;
      p = [p[0] - s * g[0], p[1] - s * g[1], p[2] - s * g[2]];
    }
    if (Math.abs(f(p[0], p[1], p[2]) + depth) > 0.2 || p[2] < 0.8 || p[1] > 5.4) continue;
    if (near(p)) continue;
    const q = { c: p, r: def.puff * (0.86 + 0.28 * ((h >>> 24) & 255) / 255), h: hh(out.length, seed, 0x77) };
    out.push(q);
    const key = gk(p[0], p[1], p[2]);
    if (!G.has(key)) G.set(key, []);
    G.get(key).push(q);
  }
  return { list: out, grid: G, sp };
}
function puffsAt(P, x, y, z) {
  const sp = P.sp, gx = Math.floor(x / sp), gy = Math.floor(y / sp), gz = Math.floor(z / sp);
  let best = null, c1 = -1e9, c2 = -1e9;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
    const lst = P.grid.get(((gx + a + 64) * 4096 + (gy + b + 64)) * 4096 + gz + c + 64);
    if (!lst) continue;
    for (const q of lst) {
      const cov = q.r - Math.hypot(x - q.c[0], y - q.c[1], z - q.c[2]);
      if (cov > c1) { c2 = c1; c1 = cov; best = q; } else if (cov > c2) c2 = cov;
    }
  }
  return { best, c1, c2 };
}

/* ── 6. LA CONSTRUCTION D'UNE FORME (données pures, mémorisées) ──────────── */
const SHAPES = new Map();
function shapeOf(form, variant) {
  const key = form + variant;
  let S = SHAPES.get(key);
  if (S) return S;
  const def = FORMS[form][variant];
  const f = fieldOf(def), seed = hh(variant + 1, form.length * 131 + form.charCodeAt(0), 0x2b);
  let bu0 = 0, bu1 = 0, bv0 = 0, bz1 = 0;
  for (const e of def.prims) {
    const ru = e.ru, rv = e.rv, top = e.t === 0 ? e.cz + e.rz : e.t === 1 ? e.h : e.b[5];
    bu0 = Math.min(bu0, e.cu - ru); bu1 = Math.max(bu1, e.cu + ru); bv0 = Math.min(bv0, e.cv - rv); bz1 = Math.max(bz1, top);
  }
  const pad = def.free ? 4 : 3;
  const B = { u0: Math.floor(bu0) - pad, u1: Math.ceil(bu1) + pad, v0: Math.floor(bv0) - pad, v1: 6, z1: Math.ceil(bz1) + pad };
  const P = placePuffs(f, B, def, seed);
  const NU = B.u1 - B.u0 + 1, NV = B.v1 - B.v0 + 1, NZ = B.z1 + 1;
  const idx = (u, v, z) => ((z * NV) + (v - B.v0)) * NU + (u - B.u0);
  const inB = (u, v, z) => u >= B.u0 && u <= B.u1 && v >= B.v0 && v <= B.v1 && z >= 0 && z <= B.z1;
  const mat = new Uint8Array(NU * NV * NZ);
  const core = def.free ? 1.5 : 1.1, clip = def.free ? 1.8 : 0.45;
  for (let z = 0; z <= B.z1; z++) for (let v = B.v0; v <= B.v1; v++) for (let u = B.u0; u <= B.u1; u++) {
    const x = u + 0.5, y = v + 0.5, zz = z + 0.5, fq = f(x, y, zz);
    if (fq > clip + 3.2) continue;
    if (fq < -core) { mat[idx(u, v, z)] = M.LEAF; continue; }
    if (fq > clip) continue;
    const pa = puffsAt(P, x, y, zz);
    if (pa.best && pa.c1 >= 0) mat[idx(u, v, z)] = M.LEAF;
  }
  /* La tige : deux voxels de large, un de profondeur, cachée dans la boule. */
  if (def.stem) for (let z = 0; z <= def.stem; z++) for (const u of [-1, 0]) {
    const i = idx(u, 0, z);
    if (!mat[i]) mat[i] = M.WOOD;
  }
  /* Le cercle de terre au pied, désherbé : ce qui dit « planté et soigné ». */
  if (def.soil) {
    const [rx, ry] = def.soil;
    for (let v = B.v0; v <= B.v1; v++) for (let u = B.u0; u <= B.u1; u++) {
      if (Math.hypot((u + 0.5) / rx, (v + 0.5) / ry) > 1) continue;
      const i = idx(u, v, 0);
      if (!mat[i]) mat[i] = M.SOIL;
    }
  }
  /* Les pousses d'un buis libre : un fil de deux à quatre voxels qui part d'une
     touffe haute, vers le haut et vers le dehors — ce qui dit « personne n'a
     taillé ». Les touffes choisies le sont par leur hauteur (les plus hautes
     d'abord), jamais au hasard. */
  const sprigs = [];
  if (def.free && def.sprigs) {
    const tops = P.list.slice().sort((a, b) => (b.c[2] - a.c[2]) || (a.h - b.h));
    const used = [];
    for (const q of tops) {
      if (sprigs.length >= def.sprigs) break;
      if (used.some(o => Math.hypot(o.c[0] - q.c[0], o.c[2] - q.c[2]) < 4.5)) continue;
      used.push(q);
      const g = gradOf(f, q.c[0], q.c[1], q.c[2]);
      const d = norm(g[0], g[1] * 0.4, g[2] + 0.9);
      const len = 2 + (q.h % 3);
      const line = [];
      for (let s = 1; s <= len; s++) {
        const px = Math.round(q.c[0] + d[0] * (q.r + s) - 0.5), py = Math.round(q.c[1] + d[1] * (q.r + s) - 0.5), pz = Math.round(q.c[2] + d[2] * (q.r + s) - 0.5);
        if (!inB(px, py, pz)) break;
        line.push([px, py, pz]);
      }
      if (line.length >= 2) sprigs.push(line);
    }
  }
  /* LA LUMIÈRE DE CHAQUE VOXEL DE FEUILLE, calculée une fois. */
  const lvl = new Float32Array(NU * NV * NZ), cap = new Uint8Array(NU * NV * NZ), phs = new Uint8Array(NU * NV * NZ);
  const nz0 = new Float32Array(NU * NV * NZ);
  /* La forme pèse 0,42 (libre : 0,28) contre la touffe — voir `boxLight`. */
  const wM = def.free ? 0.28 : 0.42;
  for (let z = 0; z <= B.z1; z++) for (let v = B.v0; v <= B.v1; v++) for (let u = B.u0; u <= B.u1; u++) {
    const i = idx(u, v, z);
    if (mat[i] !== M.LEAF) continue;
    const x = u + 0.5, y = v + 0.5, zz = z + 0.5;
    const g = gradOf(f, x, y, zz), n0 = norm(g[0], g[1], g[2]);
    nz0[i] = n0[2];
    const pa = puffsAt(P, x, y, zz);
    const bl = boxLight(x, y, zz, n0, pa.best, pa.c1, pa.c2, wM);
    lvl[i] = bl.l; cap[i] = bl.cap; phs[i] = bl.ph;
  }
  for (const line of sprigs) for (const [u, v, z] of line) {
    const i = idx(u, v, z);
    if (!mat[i]) { mat[i] = SPRIG; lvl[i] = 0.62; }
  }
  /* Le pied : chaque colonne de feuille qui touche le sol (la jupe de neige s'y
     accroche), et l'empreinte au sol de tout le feuillage (l'ombre). */
  const foot = new Set(), print = new Set(), topNz = new Map();
  for (let v = B.v0; v <= B.v1; v++) for (let u = B.u0; u <= B.u1; u++) {
    let lo = -1;
    for (let z = 0; z <= B.z1; z++) { const m = mat[idx(u, v, z)]; if (m === M.LEAF || m === M.WOOD) { lo = z; break; } }
    for (let z = B.z1; z >= 0; z--) if (mat[idx(u, v, z)] === M.LEAF) { topNz.set(u + "," + v, nz0[idx(u, v, z)]); break; }
    if (lo < 0) continue;
    print.add(u + "," + v);
    if (lo <= 2) foot.add(u + "," + v);
  }
  const has = (set, u, v) => set.has(u + "," + v);
  /* L'épaisseur de neige que tient une colonne, selon la pente de la FORME à son
     sommet (celle d'une touffe ferait tenir la neige sur le dessus de chaque
     bosse du flanc — des taches blanches partout) : épaisse, deux voxels au
     sommet, un sur l'épaule, rien au-delà de 57° ; légère, un voxel jusqu'à 46°.
     Hors du feuillage (la terre du pied), elle tient.
     ⚠️ Premier réglage vu EN JEU (trois voxels, jusqu'à 65°) : sous 12 cm, la
     neige couvrait la moitié de chaque boule — des champignons, pas des buis. La
     vue de trois quarts montre le DESSUS en grand : un chapeau qui tient sur le
     tiers haut de la boule en couvre la moitié à l'écran. */
  /* ⚠️ Le seuil bouge un peu par bloc de 2 × 2 colonnes : tiré à la règle, le bord
     du chapeau sortait en ligne droite (un casque). Par bloc et pas par pixel —
     un bord effiloché pixel à pixel serait du poivre. */
  const snowK = (u, v, lvl) => {
    const n = topNz.get(u + "," + v);
    if (n === undefined) return lvl >= 2 ? 2 : 1;
    const j = ((hh(u >> 1, v >> 1, 0x5e) & 7) - 3.5) * 0.02;
    if (lvl < 2) return n > 0.7 + j ? 1 : 0;
    return n > 0.84 + j ? 2 : n > 0.55 + j ? 1 : 0;
  };
  /* L'OMBRE DE CONTACT : sous l'empreinte, puis deux paliers autour — en
     paliers (DESSIN.md), jamais un dégradé. Sous un buis sur tige, l'ombre de
     la boule se voit au sol, sous elle : c'est ce qui la fait tenir en l'air. */
  const shadow = (u, v) => {
    if (v > B.v1 + 1) return 0;   // le bas du dessin est le bord sud de la case : l'ombre s'y arrête, exprès
    if (has(print, u, v)) return 0.3;
    let d = 9;
    for (let dv = -2; dv <= 2; dv++) for (let du = -2; du <= 2; du++) if (has(print, u + du, v + dv)) d = Math.min(d, Math.max(Math.abs(du), Math.abs(dv)));
    return d === 1 ? 0.16 : d === 2 ? 0.07 : 0;
  };
  const model = (u, v, z) => (inB(u, v, z) ? mat[idx(u, v, z)] : 0);
  S = { form, variant, def, B, model, lvl, cap, phs, idx, inB, foot, has, snowK, shadow, puffs: P.list.length, sprigs: sprigs.length };
  /* LE CADRE DU DESSIN, mesuré sur le modèle ENNEIGÉ ÉPAIS : le coussin comble
     les creux jusqu'à trois voxels au-dessus de ses voisins, donc une colonne
     située derrière le sommet peut monter plus haut à l'écran que le sommet
     lui-même — une marge fixe l'aurait découpé en silence (§4 de CLAUDE.md).
     Largeur symétrique autour du pied ; un pixel de cerne partout ; le pied au
     huitième rang depuis le bas (le milieu de la case). */
  /* ⚠️ Et sur le modèle SANS neige aussi : la neige retire les pousses d'un buis
     libre, qui peuvent dépasser plus haut que son chapeau (vu au banc : une
     pousse sur le bord du canevas). */
  const snowy = snowModel(S, 2);
  let uMin = 0, uMax = 0, topRow = 0;
  for (let z = 0; z <= B.z1 + 8; z++) for (let v = B.v0 - 2; v <= B.v1 + 1; v++) for (let u = B.u0 - 2; u <= B.u1 + 2; u++) {
    if (!snowy(u, v, z) && !model(u, v, z)) continue;
    uMin = Math.min(uMin, u); uMax = Math.max(uMax, u); topRow = Math.min(topRow, v - z - 1);
  }
  S.W = 2 * Math.max(3 - uMin, uMax + 4);   // la matière, son cerne, et les deux anneaux de l'ombre de contact
  S.H = 10 - topRow;
  S.ox = S.W / 2;
  SHAPES.set(key, S);
  return S;
}

/* ── 7. LA COULEUR ─────────────────────────────────────────────────────────
   `se` : "sp" printemps (les pousses), "su" été et automne, "wi" hiver (la
   palette ternie). */
function buisColor(S, se) {
  return (m, face, u, v, z, nb) => {
    if (m === M.WOOD) {
      let l = face === "top" ? 0.72 : 0.44;
      if (nb.w) l += 0.2;
      if (nb.e) l -= 0.18;
      return pick(PAL[M.WOOD], l);
    }
    if (m === M.SOIL) {
      // La terre du cercle, à l'ombre du buis : sombre, et plus encore au bord (le bourrelet qui la retient).
      let l = 0.32;
      if (nb.w || nb.e || nb.n) l = 0.16;
      return pick(PAL[M.SOIL], se === "wi" ? l - 0.08 : l);
    }
    if (m === SNOWG) return pick(PAL[M.SNOW], face === "top" ? 0.84 : 0.66);
    const i = S.inB(u, v, z) ? S.idx(u, v, z) : -1;
    if (m === SPRIG) {
      if (se === "sp") return SHOOT[1];
      return se === "wi" ? pick(WINTER, 0.5) : pick(LEAF, 0.62);
    }
    return boxColor(i >= 0 ? S.lvl[i] : 0.4, i >= 0 && S.cap[i], i >= 0 ? S.phs[i] : 0, face, se);
  };
}

/* ── 8. LA NEIGE ────────────────────────────────────────────────────────────
   `withSnow` (clotures.js) pose le coussin ; sous une neige épaisse, une jupe
   d'un voxel (deux au contact) enfonce le pied — les pousses d'un buis libre
   disparaissent sous la neige. */
function snowModel(S, lvl) {
  const base = lvl ? (u, v, z) => { const m = S.model(u, v, z); return m === SPRIG ? 0 : m; } : S.model;
  if (!lvl) return base;
  const B = S.B;
  /* La neige tient où la pente est douce, plus épaisse au sommet (`snowK`) : la
     boule garde ses flancs verts sous un chapeau bombé, comme une vraie. */
  const snowy = withSnow(base, lvl, B.u0, B.u1, B.v0, B.v1, B.z1 + 1, (u, v) => S.snowK(u, v, lvl));
  /* La neige posée AU SOL (sur la terre du pied, et la jupe du pied enfoncé)
     est `SNOWG`, sans cerne : cernée, elle dessinait un anneau autour du pied. */
  return (u, v, z) => {
    const m = snowy(u, v, z);
    if (m === M.SNOW && z <= 1) return SNOWG;
    if (m || lvl < 2 || z > 1 || v > B.v1 + 1) return m;   // le dernier rang du dessin : au-delà, le canevas couperait
    /* Le pied enfoncé, sous une neige épaisse : un rang de neige au sol, deux
       voxels de haut, contre les colonnes qui touchent terre. */
    for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) if (S.has(S.foot, u + du, v + dv)) return SNOWG;
    return 0;
  };
}
/* La couleur de la neige d'un buis. ⚠️ PAS CELLE DES CLÔTURES (`snowColor`) : sur
   un coussin bombé, chaque marche de la surface montre une face avant, et la
   face avant de la neige y est bleue (l'ombre) — le chapeau sortait en RAYURES
   (vu au banc). Ici, seule la face avant qui repose sur le feuillage (le bord du
   chapeau) est à l'ombre ; une contremarche de neige sur de la neige reste claire. */
function buisSnowColor(base, model) {
  return (m, face, u, v, z, nb) => {
    if (m !== M.SNOW) return base(m, face, u, v, z, nb);
    let l = face === "top" ? 0.84 + ((hh(u * 7 + z, v * 13, 0x3d) % 5) - 2) * 0.025
      : model(u, v, z - 1) === M.SNOW ? 0.72 : 0.46;
    if (nb.w) l += 0.06;
    if (nb.e) l -= 0.1;
    return pick(PAL[M.SNOW], l);
  };
}
function paintBuis(d, W, H, S, se, snow) {
  const B = S.B, model = snowModel(S, snow);
  paintVoxels(d, W, H, S.ox, H - 8, model, B.z1 + 8, B.u0 - 2, B.u1 + 2, B.v0 - 2, B.v1 + 1, buisSnowColor(buisColor(S, se), model), S.shadow, snow ? SNOW_SHADOW : null, OPT);
}

/* ── 9. QUI EST TAILLÉ, ET QUELLE VARIANTE ──────────────────────────────────
   Voir l'en-tête. ⚠️ La variante vient du générateur quand il l'a posée (`v` :
   le collier de la place, les buis sur tige de la place et du parc), sinon du
   HACHAGE de la case — jamais d'un tirage (§3 : deux joueurs voient le même
   buis). Deux nombres premiers neufs (19/23) : ceux des autres décors (7/13,
   11/17) apparieraient la boule et le buisson d'or case pour case. */
export const BUIS_KINDS = new Set(["shrub", "grassTuft", "topiary", "hedgeRow"]);
export function townBuisTrimmed(tw, pr) {
  if (pr.kind === "hedgeRow") return true;   // le quai est entretenu
  if (pr.wild) return false;
  if (tw.ground[pr.y * tw.w + pr.x] === C.G_TOWN_LAWN) return true;
  return C.townRankAt(pr.x + 0.5, pr.y + 0.5) < 2;
}
const PICKS = new WeakMap();
export function townBuisPick(tw, pr) {
  let p = PICKS.get(pr);
  if (p) return p;
  const trim = townBuisTrimmed(tw, pr);
  const form = pr.kind === "shrub" ? (trim ? "ball" : "wild")
    : pr.kind === "grassTuft" ? (trim ? "cloud" : "mound")
    : pr.kind === "hedgeRow" ? "hedge"
    : (trim ? "topiary" : "overgrown");
  const n = FORMS[form].length;
  const variant = pr.v != null ? (pr.v | 0) % n : ((pr.x * 19 + pr.y * 23) >>> 0) % n;
  p = { form, variant, trim };
  PICKS.set(pr, p);
  return p;
}

/* ── 10. CE QUE LE JEU APPELLE ─────────────────────────────────────────── */
/* La cellule d'atlas d'une forme, pour une saison et une neige (0, 1, 2). */
export function buisCell(cache, form, variant, season, snow) {
  const S = shapeOf(form, variant), se = boxSeason(season), sn = snow | 0;
  return cacheCell(cache, `b${form}${variant}${se}${sn}`, S.W, S.H, (d, W, H) => paintBuis(d, W, H, S, se, sn));
}
/* Posée comme tout décor : par le bas, sur le bord sud de sa case (`by`),
   centrée en `cx`. Le frisson est un cisaillement autour du pied (voir
   `TOWN_BUSH_SWAY_PX`) : `lean` px au sommet du dessin. */
export function drawBuisCell(ctx, cell, cx, by, lean) {
  if (!lean) { blit(ctx, cell, cx - cell.w / 2, by - cell.h); return; }
  ctx.save();
  ctx.translate(cx, by);
  ctx.transform(1, 0, -lean / Math.max(1, cell.h), 1, 0, 0);
  blit(ctx, cell, -cell.w / 2, -cell.h);
  ctx.restore();
}
/* Un buis de la ville (un décor `shrub`, `grassTuft` ou `topiary`). */
export function drawTownBuis(ctx, S, tw, pr, season, snow, lean) {
  if (!S || !S.townEnclos || !BUIS_KINDS.has(pr.kind)) return false;
  const p = townBuisPick(tw, pr);
  drawBuisCell(ctx, buisCell(S.townEnclos, p.form, p.variant, season, snow), pr.x * 16 + 8, (pr.y + 1) * 16, lean || 0);
  return true;
}
/* Le buis libre des haies sauvages de la FERME (`drawFarmBush`, espèce
   « shrub ») : la ferme ne taille pas ce qu'elle n'a pas planté. */
export function drawFarmBuis(ctx, S, variant, ax, ay, season, lean) {
  if (!S || !S.townEnclos) return false;
  drawBuisCell(ctx, buisCell(S.townEnclos, "wild", (variant | 0) % FORMS.wild.length, season, 0), ax, ay, lean || 0);
  return true;
}

/* Pour les BANCS seulement : une forme recopiée dans un canevas à elle (les
   planches qui posent des images). ⚠️ Jamais dans le jeu : un canevas par buis,
   c'est exactement ce que l'atlas évite. */
function buisCanvas(cache, form, variant, season, snow) {
  const cell = buisCell(cache, form, variant, season, snow);
  const c = document.createElement("canvas");
  c.width = cell.w; c.height = cell.h;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  blit(g, cell, 0, 0);
  return c;
}
/* Pour les bancs : les formes, leurs données, le peintre. */
export const BUIS_TEST = { FORMS, shapeOf, paintBuis, boxSeason, buisCanvas, LEAF, SHOOT, WINTER, SHINE, SPRIG, SNOWG };
