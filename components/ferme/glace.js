/* =============================================================================
   glace.js — LA GLACE DE L'ÉTANG DU PARC (2026-09-30), PURE.
   -----------------------------------------------------------------------------
   Guillaume : « l'étang doit aussi être gelé en hiver, avec les canards qui
   marchent et glissent un peu dessus, les carpes figées ». Tranché avec lui :
   gel par FROID CUMULÉ (l'épaisseur `ice` du manteau, `neige.js` : nuits claires,
   soleil, pluie, saison), la glace est un DÉCOR (collision inchangée ; marcher
   sur l'eau gelée est un projet de moyen terme, pas celui-ci).

   Ce fichier ne sait rien du jeu : il reçoit une région d'eau cuite (`eau.js`,
   étang seulement — elle porte `dsh`, la distance à la berge en cases, au pixel)
   et rend des pixels. Le jeu en fait un canevas et le pose case par case APRÈS la
   surface de l'eau ; les carpes, peintes avant, se voient dessous.

   ⚠️ UNE SEULE RÈGLE DIT OÙ IL Y A DE LA GLACE : `iceThreshold` (le seuil d'un
   point, en cm) comparé à l'épaisseur. Le dessin la lit au pixel, la faune au
   point (`pondFrozenAt`, pour savoir si un canard marche ou nage) — deux lectures
   de la MÊME fonction, jamais deux règles (§4 : « une condition recopiée à côté
   du prédicat qui la nomme a déjà divergé »).
   ⚠️ LA TRANSITION SE FAIT PAR UN ORDRE AU PIXEL (§4 : « une transition qui se voit
   se fait par un ordre au pixel ou par une durée, jamais par un seuil commun ») :
   chaque pixel a son seuil, la glace part des berges (seuil bas) et gagne le
   centre (seuil haut), le bruit lisse découpe un front irrégulier.
   ========================================================================== */

import * as C from "./fermeConstants";
import { townNoise } from "./fermeEngine";
import { NEIGE, h32, SNOW_TONES } from "./neige";
import { bakeRegionAt } from "./eau";

const T = C.TILE;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth01 = (v) => { const t = clamp01(v); return t * t * (3 - 2 * t); };
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

/* ── 1. OÙ IL Y A DE LA GLACE ────────────────────────────────────────────────
   `ICE_DREF` : la distance à la berge (cases) au-delà de laquelle un point est
   « au plus creux ». L'étang du parc fait 3 à 5 cases de large : son milieu est à
   ~2 cases de toute berge. */
export const ICE_DREF = 2.2;
/* Un bruit lisse (0..1), période ~1,7 case : le front de glace n'avance pas en
   anneaux parallèles aux berges, il fait des langues et des criques. */
export function iceNoise(xC, yC) { return 0.5 + 0.5 * townNoise(xC, yC, 1.7, 211); }
/* Le seuil d'un point (cm) : de `ICE_T0` au bord à `ICE_T1` au plus creux, ± 0,15 cm
   de bruit. Jamais sous 0,06 : une glace nulle ne couvre rien. */
export function iceThreshold(dCases, n) {
  const k = smooth01(dCases / ICE_DREF);
  return Math.max(0.06, NEIGE.ICE_T0 + (NEIGE.ICE_T1 - NEIGE.ICE_T0) * k + (n - 0.5) * 0.3);
}
/* Le point (px monde) est-il pris par la glace ? Hors de l'eau cuite d'un étang : non. */
export function pondFrozenAt(bake, wx, wy, ice) {
  if (!(ice > 0.05)) return false;
  const R = bakeRegionAt(bake, (wx / T) | 0, (wy / T) | 0);
  if (!R || !R.isPond || !R.dsh) return false;
  const xx = Math.floor(wx - R.ox), yy = Math.floor(wy - R.oy);
  if (xx < 0 || yy < 0 || xx >= R.RW || yy >= R.RH) return false;
  const i = yy * R.RW + xx;
  if (R.lvl[i] === 255) return false;
  return ice >= iceThreshold(R.dsh[i], iceNoise(wx / T, wy / T));
}

/* ── 2. LES COULEURS ─────────────────────────────────────────────────────────
   La glace de la berge est BLANCHE (givrée, épaisse, pleine de bulles) ; celle
   du creux est une glace NOIRE, transparente : on y voit l'eau sombre et les
   carpes. D'où une rampe du blanc au bleu-gris ET une opacité qui baisse vers le
   centre (le fond de l'étang teinte la glace). La glace jeune (qui vient de
   prendre) est plus grise et plus transparente. */
const ICE_RAMP = ["#eef5f7", "#dde9ef", "#c8dbe5", "#b0c9d8", "#93b2c6", "#7a9db5", "#6789a3"].map(hex);
/* Les FENÊTRES de glace claire : une glace qui a pris par temps calme, sans neige
   ni bulles, est transparente et presque noire — par plaques, jamais partout (la
   glace blanche est de la neige et de l'air pris dedans). C'est par elles qu'on
   voit les carpes figées. L'eau de l'étang est claire (un vert d'eau) : sans les
   assombrir, la glace entière sortait d'un pâle uniforme (vu au premier essai). */
const CLEAR = ["#6f93aa", "#5f8299", "#52738b"].map(hex);
const ICE_YOUNG = hex("#c4d1d6");
const RIME = hex("#f4f8fa");
const FRONT = hex("#eaf2f5");
const CRACK = hex("#f5fafc"), CRACK_SH = hex("#7d9cad");
const BUBBLE = hex("#f6fafc");
const GLINT = hex("#ffffff");
const A_SHORE = 0.93, A_DEEP = 0.46;   // au creux, la glace noire laisse voir l'eau sombre et les carpes
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/* ── 3. LES FÊLURES ET LES BULLES (par région, une fois) ─────────────────────
   Tirées par hachage de la région (les deux joueurs voient les mêmes). Une fêlure
   est une marche au hasard partie d'un point assez loin de la berge, avec parfois
   une branche ; chaque fêlure a son épaisseur de glace NÉCESSAIRE (une glace mince
   ne se fend pas — elle apparaît quand la glace a pris du corps). Les bulles
   (le gaz du fond, pris dans la glace en formation) sont des grappes de 3 à 6
   points dans la glace mi-profonde. */
function marks(R) {
  if (R._iceMarks) return R._iceMarks;
  const { RW, RH, lvl, dsh } = R;
  const seed = (R.bx0 * 73 + R.by0 * 151) | 0;
  const crack = new Map(), bubble = new Map();
  const wet = (x, y) => x >= 0 && y >= 0 && x < RW && y < RH && lvl[y * RW + x] !== 255;
  let nWet = 0;
  for (let i = 0; i < RW * RH; i++) if (lvl[i] !== 255) nWet++;
  const rnd = (() => { let s = (seed ^ 0x9e3779b9) >>> 0; return () => { s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0; return s / 4294967296; }; })();
  const pickDeep = (minD) => {
    for (let k = 0; k < 400; k++) {
      const x = (rnd() * RW) | 0, y = (rnd() * RH) | 0;
      if (wet(x, y) && dsh[y * RW + x] >= minD) return [x, y];
    }
    return null;
  };
  const walk = (x0, y0, a0, len, need) => {
    let x = x0 + 0.5, y = y0 + 0.5, a = a0;
    for (let s = 0; s < len; s++) {
      const xi = x | 0, yi = y | 0;
      if (!wet(xi, yi)) break;
      const i = yi * RW + xi;
      if (!crack.has(i) || crack.get(i) > need) crack.set(i, need);
      if (s % 3 === 2) a += (rnd() - 0.5) * 0.7;
      x += Math.cos(a); y += Math.sin(a) * 0.8;      // à plat, vu en 3/4 : les fêlures s'écrasent un peu en y
      if (s > 6 && rnd() < 0.06) walk(xi, yi, a + (rnd() < 0.5 ? 1 : -1) * (0.7 + rnd() * 0.6), 5 + ((rnd() * 9) | 0), need + 0.4);
    }
  };
  const nCrack = 2 + Math.round(nWet / 9000);
  for (let c = 0; c < nCrack; c++) {
    const p = pickDeep(0.5); if (!p) break;
    walk(p[0], p[1], rnd() * Math.PI * 2, 18 + ((rnd() * 34) | 0), 1.4 + rnd() * 2.2);
  }
  const nBub = 3 + Math.round(nWet / 2600);
  for (let b = 0; b < nBub; b++) {
    const p = pickDeep(0.6); if (!p) break;
    const n = 3 + ((rnd() * 4) | 0);
    for (let k = 0; k < n; k++) {
      const x = p[0] + Math.round((rnd() - 0.5) * 6), y = p[1] + Math.round((rnd() - 0.5) * 4);
      if (wet(x, y)) bubble.set(y * RW + x, 0.7 + rnd() * 0.6);
    }
  }
  R._iceMarks = { crack, bubble };
  return R._iceMarks;
}

/* ── 4. LA CUISSON ───────────────────────────────────────────────────────────
   `ice` : l'épaisseur (cm, le manteau) ; `snow` : la neige posée sur la glace (cm,
   `si` du manteau). Rend { px (RGBA, RW × RH, à poser en (ox, oy)), cell (cw × ch :
   0 rien, 1 en partie, 2 toute l'eau de la case est prise), frozen (RW × RH, 1 = pris :
   ce que lit le banc — l'alpha ne le dit pas, une glace jeune est presque transparente) }. */
export function bakePondIce(R, ice, snow) {
  const { RW, RH, ox, oy, lvl, dsh, cw, ch } = R;
  const px = new Uint8ClampedArray(RW * RH * 4);
  const frozen = new Uint8Array(RW * RH);
  // La même garde que `pondFrozenAt` : sous 0,05 cm, pas de glace (render-glace §2 l'a trouvée absente).
  if (!(ice > 0.05)) return { px, cell: new Uint8Array(cw * ch), frozen };
  const cellWet = new Uint16Array(cw * ch), cellIce = new Uint16Array(cw * ch);
  const M = marks(R);
  const put = (i, c, a) => { const o = i * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = Math.round(a * 255); };
  /* 4.1 — la glace. */
  for (let yy = 0; yy < RH; yy++) for (let xx = 0; xx < RW; xx++) {
    const i = yy * RW + xx;
    const l = lvl[i];
    if (l === 255) continue;
    const ci = ((yy / T) | 0) * cw + ((xx / T) | 0);
    cellWet[ci]++;
    const wx = ox + xx, wy = oy + yy, d = dsh[i];
    const grain = (h32(wx, wy, 7) / 4294967296 - 0.5) * 0.06;
    const thr = iceThreshold(d, iceNoise(wx / T, wy / T)) + grain;
    const age = ice - thr;
    if (age < 0) {
      // Le front qui avance : une frange de glace-aiguille, à peine visible, devant la plaque.
      if (age > -0.07 && ice > 0.05) put(i, ICE_YOUNG, 0.26);
      continue;
    }
    frozen[i] = 1; cellIce[ci]++;
    if (d < 0.13) { put(i, RIME, 0.96); continue; }                 // le givre au ras de la berge
    if (age < 0.05) { put(i, FRONT, 0.82); continue; }               // le bord de la plaque qui avance
    // La teinte : la profondeur, un bruit lent, un tramage ordonné (pas de bandes).
    const v = clamp01(0.55 * l / 15 + 0.45 * smooth01(d / ICE_DREF) + 0.12 * townNoise(wx / T, wy / T, 3.1, 223));
    const k = Math.max(0, Math.min(ICE_RAMP.length - 1, Math.floor(v * (ICE_RAMP.length - 1) + BAYER[(yy & 3) * 4 + (xx & 3)] / 16)));
    let c = ICE_RAMP[k];
    let a = A_SHORE + (A_DEEP - A_SHORE) * smooth01(d / ICE_DREF);
    // Une fenêtre de glace claire ? (un bruit lent, et jamais contre la berge)
    const clear = smooth01((0.5 + 0.5 * townNoise(wx / T, wy / T, 2.6, 241) - 0.47) / 0.12) * smooth01((d - 0.35) / 0.7);
    if (clear > 0.5) {
      c = CLEAR[Math.min(2, Math.floor((clear - 0.5) * 6 + BAYER[(yy & 3) * 4 + (xx & 3)] / 16))];
      a = 0.5;
    }
    if (age < 0.35) {                                                 // la glace jeune : grise et claire-voie
      const u = age / 0.35;
      c = [c[0] + (ICE_YOUNG[0] - c[0]) * (1 - u), c[1] + (ICE_YOUNG[1] - c[1]) * (1 - u), c[2] + (ICE_YOUNG[2] - c[2]) * (1 - u)];
      a *= 0.55 + 0.45 * u;
    }
    if (ice > 3) a = Math.min(0.97, a + 0.05);
    const need = M.crack.get(i);
    if (need != null && ice >= need) { put(i, CRACK, 0.9); continue; }
    const bub = M.bubble.get(i);
    if (bub != null && ice >= bub) { put(i, BUBBLE, 0.85); continue; }
    if (d > 0.9 && h32(wx, wy, 19) % 131 === 0) { put(i, GLINT, 0.55); continue; }   // un éclat, sur la glace noire
    put(i, c, a);
  }
  // L'ombre d'une fêlure : le pixel juste dessous, plus sombre (la lèvre de la fente).
  for (const [i, need] of M.crack) {
    if (ice < need) continue;
    const j = i + RW;
    if (j < RW * RH && frozen[j] && !(M.crack.has(j) && ice >= M.crack.get(j))) { const o = j * 4; px[o] = CRACK_SH[0]; px[o + 1] = CRACK_SH[1]; px[o + 2] = CRACK_SH[2]; px[o + 3] = 130; }
  }
  /* 4.2 — la neige sur la glace : des congères couchées dans le sens du vent, plus
     épaisses contre les berges, la glace balayée entre elles. Une arête claire au
     nord-ouest (la lumière), une lèvre d'ombre au sud-est. */
  if (snow > 0.1) {
    /* La part couverte : ~45 % à 4 cm, jamais plus de 90 % — le vent balaie la glace
       par plaques (premier jet : tout blanc dès 4 cm, l'étang disparaissait). */
    const k = smooth01((snow - 0.1) / 8) * 0.9;
    const A = 0.6, ca = Math.cos(A), sa = Math.sin(A);
    const sm = new Uint8Array(RW * RH);
    for (let yy = 0; yy < RH; yy++) for (let xx = 0; xx < RW; xx++) {
      const i = yy * RW + xx;
      if (!frozen[i]) continue;
      const wx = ox + xx, wy = oy + yy, xC = wx / T, yC = wy / T;
      const u = (xC * ca + yC * sa) / 2.4, v = (-xC * sa + yC * ca) / 0.7;
      const dn = 0.5 + 0.5 * townNoise(u, v, 1, 229);
      const shore = (1 - smooth01(dsh[i] / 1.2)) * 0.35;
      const g = (h32(wx, wy, 31) / 4294967296 - 0.5) * 0.08;
      if (dn + shore + g > 1.05 - k * 0.85) sm[i] = 1;
    }
    const S = SNOW_TONES;
    for (let yy = 0; yy < RH; yy++) for (let xx = 0; xx < RW; xx++) {
      const i = yy * RW + xx;
      if (!sm[i]) continue;
      const up = yy > 0 && sm[i - RW], dn = yy < RH - 1 && sm[i + RW], rt = xx < RW - 1 && sm[i + 1];
      let c;
      if (!dn || !rt) c = S[2];                                       // la lèvre d'ombre (sud-est)
      else if (!up) c = S[5];                                          // l'arête éclairée (nord-ouest)
      else c = (h32(ox + xx, oy + yy, 37) & 3) === 0 ? S[4] : S[5];
      put(i, c, 1);
    }
  }
  const cell = new Uint8Array(cw * ch);
  for (let ci = 0; ci < cw * ch; ci++) cell[ci] = !cellWet[ci] ? 0 : cellIce[ci] >= cellWet[ci] ? 2 : cellIce[ci] > 0 ? 1 : 0;
  return { px, cell, frozen };
}

/* La clé de cuisson : l'épaisseur au 1/25 de cm tant que le front bouge (le front
   avance d'environ un pixel par cran), au dixième ensuite (seules les fêlures et
   les bulles apparaissent encore) ; la neige au dixième de cm. Une cuisson toutes
   les dix secondes réelles au plus fort du gel, aucune à l'état stable. */
export function iceBakeKey(ice, snow) {
  const qi = ice < NEIGE.ICE_T1 + 0.4 ? Math.round(ice * 25) : 1000 + Math.round(ice * 5);
  return qi + "|" + Math.round(Math.max(0, snow) * 10);
}
