/* =============================================================================
   boulodromeArt.js — LE BOULODROME, DESSINÉ (2026-10-29, lot 2) : LE SABLE, LES MADRIERS, LES BANCS, LES MÂTS, LA GUIRLANDE.
   -----------------------------------------------------------------------------
   Guillaume, en rendant la page du terrain : « je veux une qualité graphique bluffante ». Ce qui la fait, ici, et pourquoi :
   · LE RELIEF DE LA PHYSIQUE, ÉCLAIRÉ (DESSIN.md, le cratère : « ce qui creuse une image vue de dessus est l'éclairage
     d'une pente, pas un dégradé ») : chaque pixel de sable prend la pente de `petanque.js` au même point — la bosse des
     racines, le creux, l'ornière, les cailloux —, contre la lumière PEINTE du projet (nord-ouest, en haut), et la valeur
     tombe sur une rampe de douze tons d'ocre, TRAMÉE au bruit bleu (`neige.js`) : la trame entre deux tons voisins EST le
     grain du sable, et un dégradé devient une matière au lieu d'une courbe de niveau. Relief « discret » (son verdict).
   · CE QU'UN BOULODROME RACONTE, ET QUI NE SE TIRE PAS AU HASARD : le sable TASSÉ et piétiné autour des deux cercles
     (on lance des deux bouts), des traces de pied, deux vieux cercles tracés au pied ; les PLOMBÉES de la veille au
     milieu de la piste (là où tombent les boules qui visent un but à 6-10 m des deux bouts) ; le gravier MEUBLE poussé
     contre les madriers ; les RACINES de l'arbre du nord qui soulèvent la piste du platane (la bosse de la physique en
     est la cause visible) ; le fond limoneux et craquelé du creux où l'eau stagne après la pluie ; l'ornière tassée.
   · LES MADRIERS : des traverses de chêne gris (le bois des bancs : le boulodrome se lit comme UN ouvrage), en
     tronçons de longueurs premières entre elles (DESSIN.md : la période), fendues, avec leurs agrafes de fer ; leur
     face sud au soleil rasant (un pixel), leur ombre de contact sur le sable et sur l'herbe.
   ⚠️ AUCUN TIRAGE : tout vient d'un hachage de la coordonnée du MONDE (`h32`) et d'une suite R2 pour ce qui se sème
     dans le plan (DESSIN.md : deux suites d'or presque rationnelles alignent les points) — le même sable chez tous les
     joueurs, à chaque chargement, et aucun motif de case (la coordonnée est celle du monde, pas de la tuile).
   ⚠️ PUR AU SENS DES BANCS : les dessins se font dans des tampons RGBA (`…Pixels()`), sans `document` ; seuls les
     emballages en canevas (`…Canvas`) en demandent un. `tools/render-boulodrome.mjs` regarde les tampons.
   ⚠️ CUIT UNE FOIS : le relief ne bouge pas. La pluie, la neige, les feuilles et les ombres du soleil se posent
     par-dessus, chacune dans sa couche (le sable publie sa classe et ses creux : `boulodrome.js`, `bouloAt`).
   ========================================================================== */
import * as C from "./fermeConstants.mjs";
import * as PT from "./petanque.mjs";
import * as BD from "./boulodrome.mjs";
import { h32, blueNoise } from "./neige.mjs";

const T = C.TILE;
const P = PT.PETANQUE, PXM = P.PX_M;
const B = BD.BOULO;

/* ── LES PALETTES ──
   Le sable stabilisé : des ombres terre d'ombre (rouges) aux lumières crème (jaunes) — la couleur d'un sable qui reçoit
   la lumière, pas un brun éclairci. ⚠️ Calé sur la ville : à plat, il tombe entre les tons 6 et 7 (luminance ≈ 165), au
   niveau du gravier des allées (`townGravelSurface`, ≈ 169) — Guillaume plafonne les sols de la ville vers 160-170. */
export const SAND = [
  [92, 64, 40], [112, 80, 51], [131, 96, 62], [148, 111, 73], [163, 125, 84], [176, 138, 94],
  [188, 151, 104], [198, 162, 114], [207, 173, 125], [216, 184, 137], [225, 196, 151], [236, 211, 170],
];
const NS = SAND.length;
/* Le chêne gris des madriers et des bancs : du joint (presque noir) au fil éclairé (gris argent). */
export const WOOD = [[40, 30, 24], [66, 52, 42], [88, 72, 58], [108, 90, 74], [128, 110, 92], [150, 132, 112], [172, 156, 136], [194, 180, 160]];
const IRON = [[58, 44, 36], [96, 72, 54], [150, 128, 108]];   // le fer des agrafes, rouillé (un noir bleuté se lisait comme un trou)
const STONE = [[232, 226, 210], [204, 196, 180], [170, 162, 148], [130, 122, 110], [86, 80, 72]];
/* L'écorce des racines : le gris-brun lisse d'un vieil arbre, proche du bois des madriers (un brun sombre se lisait comme un
   bâton posé sur le sable). */
const BARK = [[86, 70, 58], [116, 98, 82], [142, 124, 104], [176, 160, 138]];

const u01 = (x, y, s) => h32(x, y, s) / 4294967296;
function vnoise(x, y, sc, s) {
  const fx = x / sc, fy = y / sc, ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = u01(ix, iy, s), b = u01(ix + 1, iy, s), c = u01(ix, iy + 1, s), d = u01(ix + 1, iy + 1, s);
  return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
}
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
/* La suite R2 (Roberts) : la répartition dans le plan sans alignement. */
const R2A = 0.7548776662466927, R2B = 0.5698402909980532;
const r2 = (n, s) => [((s * 0.137 + n * R2A) % 1 + 1) % 1, ((s * 0.291 + n * R2B) % 1 + 1) % 1];

/* La lumière du projet : du nord-ouest, haute (la même que la neige, `neige.js` §6). En (x écran, y écran, haut). */
const LX = -0.52, LY = -0.46, LZ = 0.72;
/* L'exagération du relief à l'éclairage : « discret » (son verdict ; l'aperçu de la page, force 3). ⚠️ La HAUTEUR reste
   vraie (la physique) ; seule la lumière exagère — une bosse de 4 cm sur 80 cm ne tourne pas d'un demi-ton sinon. */
const RELIEF_K = 3.0;
const REL_STEPS = 16;          // un écart d'éclairage de 1 vaut seize tons (≈ ±2,7 tons sur la bosse des racines)
const BASE = 6.55;             // l'indice du sable à plat, au soleil

/* ── 1. LE SOL : LE SABLE ET LES MADRIERS ─────────────────────────────────────
   Le tampon couvre des CASES ENTIÈRES (`BOULO_TILES`) : la cuisson du sol en découpe une case à la fois, et un rectangle
   source qui sortirait du canevas se rognerait autrement d'un navigateur à l'autre (noyau §4, `drawImage` à 9 arguments).
   Ce qui n'est pas au boulodrome reste TRANSPARENT : le gazon de la ville se voit au travers (la bande entre les pistes,
   les marges des cases du bord) — un seul gazon, celui de la ville, avec ses saisons. */
export const GROUND_X0 = BD.BOULO_TILES.x0 * T, GROUND_Y0 = BD.BOULO_TILES.y0 * T;
export const GROUND_W = (BD.BOULO_TILES.x1 - BD.BOULO_TILES.x0 + 1) * T, GROUND_H = (BD.BOULO_TILES.y1 - BD.BOULO_TILES.y0 + 1) * T;

/* Les tronçons des madriers (px) : des longueurs qui ne se répètent pas (premières entre elles deux à deux), décalées
   d'une rangée à l'autre — un ouvrage de traverses de réemploi, pas une règle graduée. */
const SEG = [37, 41, 34, 43, 39, 31, 44, 38];
function jointsAlong(len, seed) {
  const out = new Set();
  let x = (seed * 13) % 23 + 9;
  for (let k = 0; x < len - 6; k++) { out.add(x); x += SEG[(k + seed) % SEG.length]; }
  return out;
}


export function bouloGroundPixels() {
  const W = GROUND_W, H = GROUND_H, px = new Uint8ClampedArray(W * H * 4);
  const BN = blueNoise();
  const put = (x, y, c, a = 255) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const o = (y * W + x) * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = a;
  };
  /* Les VALEURS du sable d'abord (indices flottants de la rampe), les formes ensuite (elles retouchent les valeurs), la
     trame à la fin : une forme posée après la trame serait un aplat dans du grain. */
  const g = [0, 0];
  for (const pk of BD.BOULO_PISTES) {
    const Tp = PT.PISTES[pk.k], LP = B.LP, WP = B.WP;
    const V = new Float32Array(LP * WP), grainK = new Float32Array(LP * WP).fill(1);
    const at = (i, j) => j * LP + i;
    const seed = pk.k === "a" ? 7 : 3;
    // ── les valeurs de fond ──
    for (let j = 0; j < WP; j++) for (let i = 0; i < LP; i++) {
      const wx = pk.sx + i, wy = pk.sy + j, mx = (j + 0.5) / PXM, my = (i + 0.5) / PXM;
      PT.pente(Tp, mx, my, g);
      // ⚠️ la pente d'ensemble (`incl`) ne s'éclaire pas : 0,8 % sur toute la piste, c'est un ton d'écart entre les deux
      // pistes et rien qu'on lise comme un relief
      const gx = (g[1] - Tp.incl[1]) * RELIEF_K, gy = (g[0] - Tp.incl[0]) * RELIEF_K;
      const nl = (-gx * LX - gy * LY + LZ) / Math.sqrt(gx * gx + gy * gy + 1);
      let v = BASE + (nl / LZ - 1) * REL_STEPS;
      // les plaques : le sable plus ou moins tassé, à deux échelles (jamais la case : la coordonnée du monde)
      v += (vnoise(wx, wy, 13, 11) - 0.5) * 1.1 + (vnoise(wx, wy, 5, 12) - 0.5) * 0.55;
      // le TASSÉ autour des deux cercles (on lance des deux bouts) : plus sombre, plus lisse
      const dW = Math.hypot(mx - 2, my - 1.5), dE = Math.hypot(mx - 2, my - 13.5);
      const tas = Math.max(1 - smooth(0.5, 1.45, dW), 1 - smooth(0.5, 1.45, dE));
      v -= tas * 0.85; grainK[at(i, j)] = 1 - 0.45 * tas;
      // le MEUBLE contre les madriers : plus clair, plus grossier
      const dEdge = Math.min(i, LP - 1 - i, j, WP - 1 - j);
      if (dEdge < 4) v += (4 - dEdge) / 4 * 0.45;
      // l'ornière : son fond tassé
      const rel = BD.reliefLocal(pk.k, mx, my);
      if (pk.k === "a" && rel < -0.006) v -= 0.6 * smooth(0.006, 0.016, -rel);
      // l'ombre de contact des madriers (au pied du madrier du nord, sous sa face, et à l'est de celui de l'ouest)
      if (j === 1) v -= 1.7; else if (j === 2) v -= 0.6;
      if (i === 0) v -= 1.2; else if (i === 1) v -= 0.4;
      if (i === LP - 1) v -= 0.5;
      if (j === WP - 1) v -= 0.5;
      V[at(i, j)] = v;
    }
    const addV = (i, j, d) => { if (i >= 0 && j >= 1 && i < LP && j < WP) V[at(i, j)] += d; };
    // ── LE CREUX DE LA PISTE DU PLATANE : son fond limoneux, lissé par l'eau, craquelé en séchant ──
    for (const b of Tp.bosses) {
      if (b.h >= 0) continue;
      const ci = b.y * PXM, cj = b.x * PXM, R = b.r * PXM;
      for (let j = Math.floor(cj - R); j <= cj + R; j++) for (let i = Math.floor(ci - R); i <= ci + R; i++) {
        if (i < 0 || j < 1 || i >= LP || j >= WP) continue;
        const rel = BD.reliefLocal(pk.k, (j + 0.5) / PXM, (i + 0.5) / PXM);
        const k = smooth(0.012, 0.024, -rel);
        if (k <= 0) continue;
        grainK[at(i, j)] *= 1 - 0.6 * k;          // le limon est fin
        V[at(i, j)] -= 0.35 * k;
        // les craquelures : le bord des cellules d'un pavage de Voronoï (6 px), un pixel sombre là où deux cellules se touchent
        const wx = pk.sx + i, wy = pk.sy + j;
        const cell = (x, y) => {
          let d1 = 1e9, d2 = 1e9;
          for (let cy = Math.floor(y / 6) - 1; cy <= Math.floor(y / 6) + 1; cy++) for (let cx = Math.floor(x / 6) - 1; cx <= Math.floor(x / 6) + 1; cx++) {
            const px2 = cx * 6 + u01(cx, cy, 41) * 6, py2 = cy * 6 + u01(cx, cy, 42) * 6, d = (x + 0.5 - px2) ** 2 + (y + 0.5 - py2) ** 2;
            if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
          }
          return Math.sqrt(d2) - Math.sqrt(d1);
        };
        if (k > 0.5 && cell(wx, wy) < 0.7) V[at(i, j)] -= 1.6;
      }
    }
    // ── LES PLOMBÉES : des empreintes de boule au milieu de la piste (une cuvette : paroi nord-ouest dans l'ombre, bord sud-est
    // dans la lumière, la même lecture que le cratère de DESSIN.md, en trois pixels) ──
    for (let n = 0; n < 34; n++) {
      const [u, w] = r2(n, seed);
      const my = 4.8 + u * 5.6, mx = 0.7 + w * 2.6;
      const ci = Math.round(my * PXM), cj = Math.round(mx * PXM);
      const big = u01(n, seed, 51) < 0.35;
      addV(ci, cj, -0.9);
      addV(ci - 1, cj, -1.6); addV(ci, cj - 1, -1.8); addV(ci - 1, cj - 1, -1.2);
      addV(ci + 1, cj, 1.3); addV(ci, cj + 1, 1.2); addV(ci + 1, cj + 1, 1.6);
      if (big) { addV(ci + 1, cj - 1, -0.6); addV(ci - 1, cj + 1, 0.6); addV(ci + 2, cj + 1, 0.9); addV(ci + 1, cj + 2, 0.8); }
    }
    // ── LES TRACES DE PIED autour des cercles : de courtes glissades (le pied qui pivote au lancer), un bourrelet clair au bout ──
    for (const [cmx, cmy] of [[2, 1.5], [2, 13.5]]) {
      for (let n = 0; n < 11; n++) {
        const a = u01(n, Math.round(cmy), 61) * Math.PI * 2, rr = 0.35 + u01(n, Math.round(cmy), 62) * 0.75;
        const x0 = (cmy + Math.cos(a) * rr) * PXM, y0 = (cmx + Math.sin(a) * rr * 0.8) * PXM;
        const da = u01(n, Math.round(cmy), 63) * Math.PI * 2, len = 2 + Math.floor(u01(n, Math.round(cmy), 64) * 3);
        const dx = Math.cos(da), dy = Math.sin(da) * 0.6;
        for (let s = 0; s < len; s++) addV(Math.round(x0 + dx * s), Math.round(y0 + dy * s), -1.4);
        addV(Math.round(x0 + dx * len), Math.round(y0 + dy * len), 1.1);
      }
      /* deux vieux cercles tracés au pied, effacés à moitié : un anneau de 25 cm, un pixel sur deux en creux */
      for (let n = 0; n < 2; n++) {
        const ox = (cmy + (u01(n, Math.round(cmy), 71) - 0.5) * 0.9) * PXM, oy = (cmx + (u01(n, Math.round(cmy), 72) - 0.5) * 1.1) * PXM;
        const R = P.CERCLE_R * PXM, steps = 26;
        for (let s = 0; s < steps; s++) {
          if (u01(s, n + Math.round(cmy) * 3, 73) < 0.42) continue;
          const a = (s / steps) * Math.PI * 2;
          addV(Math.round(ox + Math.cos(a) * R), Math.round(oy + Math.sin(a) * R), -0.9);
        }
      }
    }
    // ── la trame : la valeur, le grain, et quelques grains de quartz et de fer ──
    for (let j = 0; j < WP; j++) for (let i = 0; i < LP; i++) {
      const wx = pk.sx + i, wy = pk.sy + j, o = at(i, j);
      const bn = BN[(wy & 63) * 64 + (wx & 63)] / 256;
      const gk = grainK[o];
      let idx = Math.floor(V[o] + 0.5 + (bn - 0.5) * gk);
      const sp = u01(wx, wy, 81);
      if (gk > 0.8) { if (sp < 0.011) idx += 2; else if (sp > 0.991) idx -= 2; }
      put(wx - GROUND_X0, wy - GROUND_Y0, SAND[Math.max(0, Math.min(NS - 1, idx))]);
    }
    // ── LES GRAVILLONS : posés comme des formes (un corps, un éclat au nord-ouest, une ombre au sud-est), plus serrés
    // contre les madriers (le gravier meuble que les boules y repoussent) ──
    const idxAt = (i, j) => {
      const o = ((pk.sy + j - GROUND_Y0) * W + (pk.sx + i - GROUND_X0)) * 4;
      let best = 0, bd = 1e9;
      for (let k = 0; k < NS; k++) { const d = Math.abs(px[o] - SAND[k][0]) + Math.abs(px[o + 1] - SAND[k][1]); if (d < bd) { bd = d; best = k; } }
      return best;
    };
    const putS = (i, j, k) => { if (i >= 0 && j >= 1 && i < LP && j < WP) put(pk.sx + i - GROUND_X0, pk.sy + j - GROUND_Y0, SAND[Math.max(0, Math.min(NS - 1, k))]); };
    const nPeb = 300;
    for (let n = 0; n < nPeb; n++) {
      const [u, w] = r2(n, seed + 20);
      let i = Math.floor(u * LP), j = 1 + Math.floor(w * (WP - 1));
      const dEdge = Math.min(i, LP - 1 - i, j - 1, WP - 1 - j);
      // loin des bords, on en garde un sur trois
      if (dEdge > 5 && u01(n, seed, 91) > 0.33) continue;
      const k0 = idxAt(i, j), big = u01(n, seed, 92) < 0.3;
      putS(i, j, k0 + 3); putS(i + 1, j + 1, k0 - 2);
      if (big) { putS(i + 1, j, k0 + 2); putS(i + 2, j + 1, k0 - 2); putS(i + 1, j + 1, k0 + 1); putS(i, j + 1, k0 + 1); putS(i + 1, j + 2, k0 - 2); }
    }
    // ── LES CAILLOUX de la physique (`PISTES.cailloux`) : de vraies pierres, cernées, avec leur ombre portée ──
    for (const c of Tp.cailloux) {
      const ci = Math.round(c.y * PXM - 1), cj = Math.round(c.x * PXM - 1), big = c.r > 0.075;
      const SX = pk.sx - GROUND_X0, SY = pk.sy - GROUND_Y0;
      const sh = (i, j) => putS(i, j, idxAt(i, j) - 3);
      sh(ci + 2, cj + 2); sh(ci + 3, cj + 1); sh(ci + 1, cj + 3); if (big) sh(ci + 3, cj + 2);
      put(SX + ci, SY + cj, STONE[1]); put(SX + ci + 1, SY + cj, STONE[0]); put(SX + ci + 2, SY + cj, STONE[2]);
      put(SX + ci, SY + cj + 1, STONE[2]); put(SX + ci + 1, SY + cj + 1, STONE[1]); put(SX + ci + 2, SY + cj + 1, STONE[3]);
      if (big) { put(SX + ci + 1, SY + cj + 2, STONE[3]); put(SX + ci, SY + cj + 2, STONE[3]); put(SX + ci + 2, SY + cj + 2, STONE[4]); }
      else put(SX + ci + 1, SY + cj + 2, STONE[4]);
    }
    // ── LES RACINES (la piste du platane) : elles viennent de l'arbre du nord, passent SOUS le madrier et soulèvent la piste là
    // où la physique a sa bosse. Un cylindre de deux pixels (le dessus au soleil, le dessous à l'ombre, son ombre portée au
    // sud-est), d'un pixel vers la pointe ; enterré par tronçons (un bruit LE LONG de la racine, pas au pixel : des trous de
    // quelques pixels, jamais un pointillé), plus affleurant là où la bosse le soulève. ──
    if (pk.k === "b") {
      const tree = BD.BOULO_TREES[2];
      const tmy = ((tree.x + 0.5) * T - pk.sx) / PXM;
      const bump = Tp.bosses[0], BUMP = { incl: [0, 0], bosses: [bump], ornieres: [], cailloux: [] };
      /* Trois racines en courbes de Bézier (mètres de la piste : [x en travers, y en long]), leur rayon en px du pied à la
         pointe. La première passe au sommet de la bosse : c'est elle qui la soulève. */
      /* Les racines en courbes de Bézier CUBIQUES (une racine serpente), en mètres de la piste [x en travers, y en long], leur
         rayon (px) du pied à la pointe. La première passe au sommet de la bosse : c'est elle qui la soulève. */
      /* ⚠️ 2026-10-29 — LES RACINES SE DÉDUISENT DE LA BOSSE, jamais d'une position écrite : on ne montre une racine que là où la
         physique soulève la piste (`bump`). Le premier jet les posait en coordonnées fixes — quand la bosse a été resserrée (le couloir
         de sa note « pas systématique », `petanque.js`), deux racines seraient restées dessinées sur du sable plat, là où rien ne dévie
         la boule. Elles partent de sous le madrier, du côté de l'arbre, et finissent dans la bosse ; `k` met les écarts à l'échelle
         de son rayon. */
      const bx = bump.x, by = bump.y, k = bump.r / 0.8;
      const roots = [
        { p: [[-0.15, tmy - 0.05], [0.35, tmy - 0.3], [bx - 0.05, by + 0.05 * k], [bx + 0.35 * k, by - 0.32 * k], [bx + 0.58 * k, by - 0.62 * k]], r0: 1.6, r1: 0.55, s: 1 },
        { p: [[-0.15, tmy + 0.25], [0.3, tmy + 0.3], [bx + 0.15 * k, by + 0.5 * k], [bx + 0.4 * k, by + 0.62 * k]], r0: 1.25, r1: 0.5, s: 2 },
        { p: [[bx + 0.05 * k, by + 0.02], [bx + 0.3 * k, by + 0.22 * k], [bx + 0.52 * k, by + 0.3 * k]], r0: 0.9, r1: 0.45, s: 3 },
      ];
      const SX = pk.sx - GROUND_X0, SY = pk.sy - GROUND_Y0;
      const LXY = [-0.75, -0.66];                                     // la lumière, à plat (nord-ouest)
      for (const rt of roots) {
        /* une spline de Catmull-Rom par les points : elle passe par chacun, sans angle */
        const P0 = rt.p, samp = [];
        const cr = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
        let sArc = 0, prev = null;
        for (let q = 0; q + 1 < P0.length; q++) {
          const a0 = P0[Math.max(0, q - 1)], b0 = P0[q], c0 = P0[q + 1], d0 = P0[Math.min(P0.length - 1, q + 2)];
          for (let k = 0; k < 24; k++) {
            const t = k / 24, mx = cr(a0[0], b0[0], c0[0], d0[0], t), my = cr(a0[1], b0[1], c0[1], d0[1], t);
            if (prev) sArc += Math.hypot(mx - prev[0], my - prev[1]) * PXM;
            prev = [mx, my]; samp.push({ mx, my, s: sArc });
          }
        }
        const len = sArc;
        for (const q of samp) {
          const f = q.s / len;
          q.r = rt.r0 + (rt.r1 - rt.r0) * f;
          q.x = q.my * PXM; q.y = q.mx * PXM;                            // px de la piste (i, j)
          const lift = PT.hauteur(BUMP, q.mx, q.my) / bump.h;
          // affleurante, plus encore là où la bosse la soulève ; enterrée par tronçons et vers sa pointe (les racines restent dans la bosse)
          q.e = 0.75 + lift * 0.5 - vnoise(q.s, rt.s * 17, 4, 99) * 0.6 - f * f * 0.9;
        }
        let i0 = 1e9, i1 = -1e9, j0 = 1e9, j1 = -1e9;
        for (const q of samp) { i0 = Math.min(i0, q.x - 3); i1 = Math.max(i1, q.x + 3); j0 = Math.min(j0, q.y - 3); j1 = Math.max(j1, q.y + 3); }
        const mark = [];
        for (let j = Math.max(1, Math.floor(j0)); j <= Math.min(WP - 2, Math.ceil(j1)); j++) for (let i = Math.max(0, Math.floor(i0)); i <= Math.min(LP - 1, Math.ceil(i1)); i++) {
          let best = null, bd = 1e9;
          for (const q of samp) { const d = (i + 0.5 - q.x) ** 2 + (j + 0.5 - q.y) ** 2; if (d < bd) { bd = d; best = q; } }
          const d = Math.sqrt(bd);
          if (best.e <= 0) continue;
          const side = ((i + 0.5 - best.x) * LXY[0] + (j + 0.5 - best.y) * LXY[1]) / Math.max(0.5, best.r);
          if (d < best.r + 0.15) mark.push([i, j, side > 0.35 ? 3 : side < -0.3 ? 0 : best.r < 0.8 ? 1 : 2]);
          else if (d < best.r + 1.6 && side < -0.1) mark.push([i, j, -1]);                 // l'ombre portée, au sud-est
          else if (d < best.r + 1.2 && side > 0.2 && best.e > 0.25) mark.push([i, j, -2]);  // la lèvre de sable soulevé, au soleil
        }
        for (const [i, j, k] of mark) if (k < 0) putS(i, j, idxAt(i, j) + (k === -1 ? -2 : 2));
        for (const [i, j, k] of mark) if (k >= 0) put(SX + i, SY + j, BARK[k]);
      }
    }
  }

  // ── LES MADRIERS ──
  const putW = (wx, wy, k) => put(wx - GROUND_X0, wy - GROUND_Y0, WOOD[Math.max(0, Math.min(WOOD.length - 1, k))]);
  for (const pk of BD.BOULO_PISTES) {
    const fx0 = pk.sx - B.M, fx1 = pk.sx + B.LP + B.M, fy0 = pk.sy - B.M, fy1 = pk.sy + B.WP + B.M;
    const seed = pk.k === "a" ? 5 : 2;
    /* Les deux longs madriers (nord, sud) : deux rangées de dessus (la première au fil éclairé), la face au sud ; les
       fentes le long du fil (des runs sombres), les joints de tronçon, une agrafe de fer sur un joint sur deux. */
    for (const [row, sd] of [[fy0, 0], [fy1 - B.M, 1]]) {
      const J = jointsAlong(fx1 - fx0, seed * 3 + sd);
      for (let x = fx0; x < fx1; x++) {
        const l = x - fx0, joint = J.has(l), endG = J.has(l + 1);
        const tone = (k) => (joint ? 0 : endG ? k + 1 : k);
        const crackA = vnoise(x, row, 7, 30 + sd) > 0.72, crackB = vnoise(x + 91, row, 9, 31 + sd) > 0.76;
        putW(x, row, tone(crackA ? 3 : (u01(x, row, 33) < 0.08 ? 7 : 6)));
        putW(x, row + 1, tone(crackB ? 2 : (u01(x, row + 1, 34) < 0.1 ? 3 : 5)));
        putW(x, row + 2, joint ? 0 : (u01(x, row + 2, 35) < 0.15 ? 1 : 2));        // la face sud, à l'ombre
      }
      let k = 0;
      for (const j0 of J) {
        if ((k++ + seed) % 2) continue;
        const x = fx0 + j0;
        put(x - 1 - GROUND_X0, row - GROUND_Y0, IRON[1]); put(x - GROUND_X0, row - GROUND_Y0, IRON[2]); put(x + 1 - GROUND_X0, row - GROUND_Y0, IRON[1]);
        put(x - 1 - GROUND_X0, row + 1 - GROUND_Y0, IRON[0]); put(x + 1 - GROUND_X0, row + 1 - GROUND_Y0, IRON[0]);
      }
    }
    // les deux madriers de bout (ouest, est) : deux colonnes, la première au fil éclairé (la lumière vient de l'ouest)
    for (const col of [fx0, fx1 - B.M]) for (let y = fy0 + B.M; y < fy1 - B.M; y++) {
      const crack = vnoise(col, y, 6, 40) > 0.74;
      putW(col, y, crack ? 3 : (u01(col, y, 43) < 0.08 ? 7 : 6));
      putW(col + 1, y, crack ? 2 : 4);
      if (y === Math.round((fy0 + fy1) / 2)) { putW(col, y, 0); putW(col + 1, y, 0); }   // le joint du milieu
    }
    // les coins : le bout du long madrier, en bois de bout (plus clair, cerné)
    for (const cx of [fx0, fx1 - 1]) { putW(cx, fy0, 7); putW(cx, fy1 - B.M, 6); }
    /* l'ombre de contact du madrier du sud et de celui de l'est, sur l'HERBE (semi-transparente : le gazon de la ville
       se voit au travers, avec ses saisons) */
    for (let x = fx0; x < fx1; x++) put(x - GROUND_X0, fy1 + 1 - GROUND_Y0, [18, 30, 16], 70);
    for (let y = fy0 + 1; y < fy1 + 2; y++) put(fx1 - GROUND_X0, y - GROUND_Y0, [18, 30, 16], 58);
  }
  return { x0: GROUND_X0, y0: GROUND_Y0, w: W, h: H, px };
}

let GROUND_CV = null;
export function bouloGroundCanvas(make) {
  if (GROUND_CV) return GROUND_CV;
  const G = bouloGroundPixels();
  const cv = make(G.w, G.h), g = cv.getContext("2d");
  g.putImageData(typeof ImageData !== "undefined" ? new ImageData(G.px, G.w, G.h) : { width: G.w, height: G.h, data: G.px }, 0, 0);
  GROUND_CV = cv;
  return cv;
}
const mkCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
/** La part du boulodrome d'une case du sol, cuite par-dessus son gazon (`paintTownGroundTile`). */
export function drawBouloTile(ctx, x, y, px, py) {
  if (!BD.inBouloTiles(x, y)) return false;
  const cv = bouloGroundCanvas(mkCanvas);
  ctx.drawImage(cv, x * T - GROUND_X0, y * T - GROUND_Y0, T, T, px, py, T, T);
  return true;
}

/* ── 2. LE BANC DE PLANCHES ───────────────────────────────────────────────────
   Le chêne gris des madriers : on lit le boulodrome comme un ouvrage, bancs et bordures du même bois. Deux planches
   d'assise vues de dessus (raccourcies, un jour entre elles), leur chant au soleil, un dossier d'une planche sur ses
   deux montants, trois pieds de bois carré. ⚠️ À LA HAUTEUR DU BANC DE LA VILLE (`benchWood`, 36 × 21, son assise à la
   même rangée) : on s'y assoit avec la même pose et le même décalage (`TOWN_SEAT_OFFSET`). Ancré comme lui : le
   milieu sur le milieu de sa case, le bas sur le bas de la case. */
export const BENCH_W = 40, BENCH_H = 21;
export function bouloBenchPixels() {
  const W = BENCH_W, H = BENCH_H, px = new Uint8ClampedArray(W * H * 4);
  const put = (x, y, k, a = 255) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const o = (y * W + x) * 4, c = k < 0 ? WOOD[0] : WOOD[Math.min(WOOD.length - 1, k)]; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = a; };
  const rect = (x0, y0, w, h, k) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(x, y, k); };
  const grain = (x, y, s) => vnoise(x * 0.6, y * 2.2, 3.1, s);
  // les montants du dossier (derrière l'assise)
  for (const x0 of [5, 33]) { rect(x0 - 1, 1, 4, 9, 0); rect(x0, 2, 2, 8, 3); put(x0, 2, 4); }
  // la planche du dossier : 4 rangées, le haut au soleil, des fentes au fil
  rect(1, 0, W - 2, 6, 0);
  for (let x = 2; x < W - 2; x++) {
    put(x, 1, grain(x, 1, 3) > 0.7 ? 4 : 6);
    put(x, 2, grain(x, 2, 3) > 0.68 ? 3 : 5);
    put(x, 3, grain(x, 3, 3) > 0.7 ? 3 : 4);
    put(x, 4, 2);
  }
  put(2, 1, 7); put(3, 1, 7);
  // l'assise : deux planches vues de dessus (raccourcies), le jour entre elles, le chant au soleil
  rect(0, 7, W, 8, 0);
  for (let x = 1; x < W - 1; x++) {
    const a = grain(x, 8, 7), b = grain(x, 11, 9);
    put(x, 8, a > 0.72 ? 4 : 7); put(x, 9, a > 0.66 ? 3 : 5);
    put(x, 10, 1);                                                    // le jour entre les deux planches
    put(x, 11, b > 0.72 ? 4 : 6); put(x, 12, b > 0.66 ? 3 : 5);
    put(x, 13, 3);                                                    // le chant, au soleil rasant
  }
  // les têtes de vis, deux par pied
  for (const x0 of [4, 19, 34]) { put(x0, 9, 1); put(x0 + 1, 12, 1); }
  // les pieds : bois carré, la face éclairée à l'ouest, une entretoise sous le milieu
  for (const x0 of [3, 18, 34]) { rect(x0 - 1, 14, 5, 7, 0); rect(x0, 14, 3, 6, 2); for (let y = 14; y < 20; y++) put(x0, y, 4); put(x0 + 2, 14, 1); }
  rect(7, 16, 27, 2, 0); for (let x = 8; x < 33; x++) put(x, 16, 2);
  return { w: W, h: H, px };
}

/* ── 3. LE MÂT DE LA GUIRLANDE ────────────────────────────────────────────────
   Un poteau de bois sombre, le pied goudronné, une console de fer en tête où le fil s'accroche (`BOULO_POLE_H` : la
   hauteur de l'attache, que le fil lit). */
export const POLE_W = 7;
export function bouloPolePixels() {
  const W = POLE_W, H = BD.BOULO_POLE_H + 4, px = new Uint8ClampedArray(W * H * 4);
  const put = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const o = (y * W + x) * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255; };
  const cx = 3;
  for (let y = 3; y < H; y++) {
    const foot = y >= H - 7;
    put(cx - 1, y, WOOD[0]); put(cx + 2, y, WOOD[0]);
    put(cx, y, foot ? [52, 46, 42] : (vnoise(cx, y, 4, 55) > 0.7 ? WOOD[4] : WOOD[5]));
    put(cx + 1, y, foot ? [34, 30, 28] : WOOD[3]);
  }
  // la tête : un chapeau de bois, la console de fer et sa poulie
  for (let x = cx - 1; x <= cx + 2; x++) { put(x, 2, WOOD[0]); put(x, 3, WOOD[0]); }
  put(cx, 2, WOOD[6]); put(cx + 1, 2, WOOD[4]);
  for (let x = cx - 3; x <= cx + 3; x++) put(x, 5, IRON[0]);
  put(cx - 3, 6, IRON[1]); put(cx + 3, 6, IRON[1]); put(cx - 3, 4, IRON[2]); put(cx + 3, 4, IRON[2]);
  return { w: W, h: H, px };
}

const SPR_CACHE = {};
function spriteCanvas(key, make, fn) {
  if (SPR_CACHE[key]) return SPR_CACHE[key];
  const s = fn(), cv = make(s.w, s.h);
  cv.getContext("2d").putImageData(typeof ImageData !== "undefined" ? new ImageData(s.px, s.w, s.h) : { width: s.w, height: s.h, data: s.px }, 0, 0);
  return (SPR_CACHE[key] = cv);
}
export const bouloBenchCanvas = (make = mkCanvas) => spriteCanvas("bench", make, bouloBenchPixels);
export const bouloPoleCanvas = (make = mkCanvas) => spriteCanvas("pole", make, bouloPolePixels);

/* ── 4. LA GUIRLANDE DE GUINGUETTE ────────────────────────────────────────────
   Un fil noir tendu du tronc d'un arbre à la tête d'un mât (`BOULO_SPANS`), qui pend (une parabole : la différence avec
   une chaînette est invisible ici — la note des fanions du marché), et des globes d'opaline tous les 7 px, sur une
   douille. De jour, du verre laiteux avec son reflet ; la nuit, une lumière chaude qui ondule à peine (une guinguette
   n'est pas un chenillard de Noël : c'est la patinoire qui a le sien). `out` reçoit les globes allumés, pour la passe de
   lumière (les « têtes » qui brillent). `g` : { x0, y0, x1, y1 (px écran-monde, attaches), sag, k }.
   ⚠️ AUCUNE HORLOGE POUR LA FORME : seule la lumière en a une. */
/* ⚠️ LE FIL EST CUIT (forme fixe : seuls les globes allumés vivent). Mesuré sur la patinoire le 2026-10-06 : une guirlande
   redessinée pixel à pixel à chaque image pèse ; ici, un `drawImage` par fil, plus une dizaine de globes la nuit. Clé : le fil,
   allumé ou non (de jour, les globes éteints sont cuits avec lui), et la neige par crans. */
const GW_CACHE = new Map();
function guinguetteStatic(g, unlit, snowQ, make) {
  const key = `${g.k}|${unlit ? 1 : 0}|${snowQ}|${g.x0},${g.y0},${g.x1},${g.y1},${g.sag}`;
  let st = GW_CACHE.get(key);
  if (st) return st;
  const dx = g.x1 - g.x0, dy = g.y1 - g.y0, L = Math.hypot(dx, dy) || 1, n = Math.ceil(L * 1.5);
  const at = (u) => [g.x0 + dx * u, g.y0 + dy * u + g.sag * 4 * u * (1 - u)];
  const ox = Math.floor(Math.min(g.x0, g.x1)) - 3, oy = Math.floor(Math.min(g.y0, g.y1)) - 3;
  const W = Math.ceil(Math.abs(dx)) + 7, H = Math.ceil(Math.abs(dy) + g.sag) + 10;
  const cv = make(W, H), c = cv.getContext("2d");
  /* ⚠️ DISCRÈTE DE JOUR (vu en jeu, premier jet : des globes de 3 px tous les 7 px, six fils en travers des deux pistes — une
     tente de perles blanches par-dessus le jeu). Le fil est fin et transparent, les globes éteints n'ont qu'un pixel de large,
     tous les 11 px ; c'est la NUIT que la guirlande se montre. */
  let lx = null, ly = null;
  c.fillStyle = "rgba(28,28,32,0.62)";
  for (let i = 0; i <= n; i++) {
    const [x, y] = at(i / n), rx = Math.round(x), ry = Math.round(y);
    if (rx === lx && ry === ly) continue;
    lx = rx; ly = ry;
    c.fillRect(rx - ox, ry - oy, 1, 1);
  }
  if (snowQ) {
    c.fillStyle = "#eef3f9";
    for (let i = 0; i <= n; i += 3) { const [x, y] = at(i / n); if (u01(Math.round(x), g.k, 5) < snowQ / 4 * 0.7) c.fillRect(Math.round(x) - ox, Math.round(y) - 1 - oy, 1, 1); }
  }
  const bulbs = [];
  let acc = 6, prev = at(0);
  for (let i = 1; i < n; i++) {
    const cur = at(i / n);
    acc += Math.hypot(cur[0] - prev[0], cur[1] - prev[1]); prev = cur;
    if (acc < 11) continue;
    acc = 0;
    const bx = Math.round(cur[0]), by = Math.round(cur[1]) + 1;
    bulbs.push([bx, by]);
    c.fillStyle = "#1c1c20"; c.fillRect(bx - ox, by - oy, 1, 1);                                   // la douille
    if (unlit) {
      c.fillStyle = "rgba(240,234,220,0.92)"; c.fillRect(bx - ox, by + 1 - oy, 1, 1);
      c.fillStyle = "rgba(196,188,172,0.92)"; c.fillRect(bx - ox, by + 2 - oy, 1, 1);
    }
  }
  st = { cv, ox, oy, bulbs };
  if (GW_CACHE.size > 64) GW_CACHE.clear();
  GW_CACHE.set(key, st);
  return st;
}
export function drawGuinguette(ctx, g, ms, lit, out, snowy, make = mkCanvas) {
  const snow = Math.max(0, Math.min(1, +snowy || 0)), snowQ = snow > 0.15 ? Math.min(4, Math.ceil(snow * 4)) : 0;
  const on = Math.max(0, Math.min(1, lit));
  const st = guinguetteStatic(g, on <= 0.05, snowQ, make);
  ctx.drawImage(st.cv, st.ox, st.oy);
  if (on <= 0.05) return;
  // la nuit : des globes chauds qui ondulent à peine (une guinguette n'est pas un chenillard : c'est la patinoire qui a le sien)
  st.bulbs.forEach(([bx, by], bi) => {
    const fl = 0.9 + 0.1 * Math.sin(ms / 1700 + bi * 2.3 + g.k), a = on * fl;
    ctx.fillStyle = `rgba(255,${Math.round(196 + 30 * fl)},${Math.round(126 + 40 * fl)},${a.toFixed(3)})`;
    ctx.fillRect(bx - 1, by + 1, 3, 2);
    ctx.fillStyle = `rgba(255,248,226,${(0.95 * a).toFixed(3)})`; ctx.fillRect(bx, by + 1, 1, 2);
    if (out) out.push({ x: bx, y: by + 1, k: 0.85 * fl });
  });
}
/* Les fils du boulodrome, en px du monde : du tronc (à `BOULO_TRUNK_HOOK` au-dessus du pied) à la tête du mât. `standing(t)` :
   l'arbre `t` de `BOULO_TREES` est-il debout ? (un arbre abattu emporte ses deux fils). Rend aussi, pour la lumière, les
   points du SOL au-dessus desquels le fil passe (`ground`), puisqu'un fil à 3 m ne s'éclaire pas là où il se dessine. */
export function bouloGarlands(standing) {
  const out = [];
  BD.BOULO_SPANS.forEach((sp, k) => {
    if (standing && !standing(sp.tree)) return;
    const t = BD.BOULO_TREES[sp.tree], p = BD.BOULO_POLES[sp.pole];
    const tx = (t.x + 0.5) * T, ty = (t.y + 1) * T - 2, px2 = (p.x + 0.5) * T, py2 = (p.y + 1) * T;
    out.push({ x0: tx + 2, y0: ty - BD.BOULO_TRUNK_HOOK, x1: px2, y1: py2 - BD.BOULO_POLE_H + 1, sag: 14, k: k * 5 + 2, gx0: tx, gy0: ty, gx1: px2, gy1: py2 });
  });
  return out;
}
