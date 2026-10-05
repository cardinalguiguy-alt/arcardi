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
/* ⚠️⚠️ 2026-10-04 — LE LAC DU SUD GÈLE PAR LA MÊME RÈGLE, ÉTIRÉE. Guillaume : « des
   patins pour monter sur le lac gelé et le body of water au sud, qui pourrait être
   gelé occasionnellement ». Le lac n'a pas sa règle à lui : c'est `iceThreshold`,
   lu à une distance ÉTIRÉE (`dsh × ICE_DREF / LAKE_DREF` : le lac fait dix cases
   de large, l'étang quatre) et comparé à une épaisseur ÉQUIVALENTE tirée du froid
   du lac (`lakeIceEq`, `neige.js` : `lakeCold`) — la rive prend à `LAKE_K0`, le
   large à `LAKE_K1`, exactement comme l'étang prend de `ICE_T0` à `ICE_T1`. Le
   front, les fêlures, les bulles, la neige posée sont donc ceux de l'étang, sans
   une ligne de dessin de plus.
   ⚠️ LE FLEUVE NE GÈLE PAS : le courant l'en empêche. Le seuil monte sur les
   `LAKE_RIVER_RAMP` dernières cases du bassin et devient infini au-delà de
   `TOWN_RIVER_X` — le front s'efface en pointe dans le goulet au lieu de s'arrêter
   sur une colonne. */
export const LAKE_RIVER_RAMP = 8;
export function lakeIceEq(K) {
  if (!(K > NEIGE.LAKE_K0 - 0.2)) return 0;
  return NEIGE.ICE_T0 + (K - NEIGE.LAKE_K0) * (NEIGE.ICE_T1 - NEIGE.ICE_T0) / (NEIGE.LAKE_K1 - NEIGE.LAKE_K0);
}
/* Ce que la région ajoute au seuil d'un pixel du lac, en colonne de cases `xC` :
   0 dans le bassin, une rampe vers le fleuve, l'infini dans le fleuve. */
function riverLift(xC) {
  const x1 = C.TOWN_RIVER_X, x0 = x1 - LAKE_RIVER_RAMP;
  return xC <= x0 ? 0 : xC >= x1 ? Infinity : (xC - x0) * 0.45;
}
/* Le seuil d'un pixel mouillé d'une région (étang ou lac), en cm d'étang. */
function pixelThreshold(R, i, wx, wy) {
  if (R.isLake) return iceThreshold(R.dsh[i] * (ICE_DREF / NEIGE.LAKE_DREF), iceNoise(wx / T, wy / T)) + riverLift(wx / T);
  return iceThreshold(R.dsh[i], iceNoise(wx / T, wy / T));
}
/* Le point (px monde) est-il pris par la glace ? `ice` : l'épaisseur de l'étang (cm) ;
   `lakeEq` : celle du lac, en cm d'étang (`lakeIceEq`). Hors de l'eau cuite d'un
   étang ou du lac : non. */
export function frozenAt(bake, wx, wy, ice, lakeEq) {
  const R = bakeRegionAt(bake, (wx / T) | 0, (wy / T) | 0);
  if (!R || !R.dsh) return false;
  const v = R.isPond ? ice : R.isLake ? lakeEq : 0;
  if (!(v > 0.05)) return false;
  const xx = Math.floor(wx - R.ox), yy = Math.floor(wy - R.oy);
  if (xx < 0 || yy < 0 || xx >= R.RW || yy >= R.RH) return false;
  const i = yy * R.RW + xx;
  if (R.lvl[i] === 255) return false;
  return v >= pixelThreshold(R, i, wx, wy);
}
/* L'étang seul — la lecture de la faune du parc depuis le 2026-09-30, inchangée. */
export function pondFrozenAt(bake, wx, wy, ice) {
  return frozenAt(bake, wx, wy, ice, 0);
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
   `ice` : l'épaisseur (cm, le manteau ; pour le lac, l'équivalent `lakeIceEq`) ;
   `snow` : la neige posée sur la glace (cm, `si` du manteau). Rend { px (RGBA, RW × RH,
   à poser en (ox, oy)), cell (cw × ch : 0 rien, 1 en partie, 2 toute l'eau de la case
   est prise), frozen (RW × RH, 1 = pris : ce que lit le banc — l'alpha ne le dit pas,
   une glace jeune est presque transparente) }.
   ⚠️⚠️ 2026-10-04 — CE QUI NE DÉPEND PAS DE L'ÉPAISSEUR EST CALCULÉ UNE FOIS PAR
   RÉGION (`iceStatics`) : le seuil de chaque pixel, sa teinte, sa fenêtre claire, son
   éclat, la prise de la neige. Le lac fait quarante fois l'étang (≈ 450 000 pixels
   gelables) et se recuit à chaque cran de son front : trois bruits par pixel et par
   cuisson auraient coûté une image sur dix. Les opérations sont celles d'avant,
   dans le même ordre et en double précision — l'étang sort au bit près
   (`render-glace` compare). Le lac s'arrête au fleuve (`xCut`) : rien au-delà ne gèle. */
function iceStatics(R) {
  if (R._iceStatics) return R._iceStatics;
  const { RW, RH, ox, oy, lvl, dsh } = R;
  const dScale = R.isLake ? ICE_DREF / NEIGE.LAKE_DREF : 1;
  const wCut = R.isLake ? Math.max(0, Math.min(RW, Math.ceil(C.TOWN_RIVER_X * T - ox))) : RW;
  const n = wCut * RH;
  const thr = new Float64Array(n), sv = new Float64Array(n), idx = new Uint8Array(n).fill(255);
  for (let yy = 0; yy < RH; yy++) for (let xx = 0; xx < wCut; xx++) {
    const i = yy * RW + xx, j = yy * wCut + xx;
    const l = lvl[i];
    if (l === 255) continue;
    const wx = ox + xx, wy = oy + yy, d = dsh[i], de = d * dScale;
    const grain = (h32(wx, wy, 7) / 4294967296 - 0.5) * 0.06;
    thr[j] = pixelThreshold(R, i, wx, wy) + grain;
    // La teinte : la profondeur, un bruit lent, un tramage ordonné (pas de bandes).
    const v = clamp01(0.55 * l / 15 + 0.45 * smooth01(de / ICE_DREF) + 0.12 * townNoise(wx / T, wy / T, 3.1, 223));
    let k = Math.max(0, Math.min(ICE_RAMP.length - 1, Math.floor(v * (ICE_RAMP.length - 1) + BAYER[(yy & 3) * 4 + (xx & 3)] / 16)));
    // Une fenêtre de glace claire ? (un bruit lent, et jamais contre la berge)
    const clear = smooth01((0.5 + 0.5 * townNoise(wx / T, wy / T, 2.6, 241) - 0.47) / 0.12) * smooth01((d - 0.35) / 0.7);
    if (clear > 0.5) k = 7 + Math.min(2, Math.floor((clear - 0.5) * 6 + BAYER[(yy & 3) * 4 + (xx & 3)] / 16));
    if (d < 0.13) k = 10;                                               // le givre au ras de la berge
    else if (d > 0.9 && h32(wx, wy, 19) % 131 === 0) k += 16;           // un éclat, sur la glace noire
    idx[j] = k;
    const xC = wx / T, yC = wy / T, A = 0.6, ca = Math.cos(A), sa = Math.sin(A);
    const u = (xC * ca + yC * sa) / 2.4, vv = (-xC * sa + yC * ca) / 0.7;
    const dn = 0.5 + 0.5 * townNoise(u, vv, 1, 229);
    const shore = (1 - smooth01(d / 1.2)) * 0.35;
    const g = (h32(wx, wy, 31) / 4294967296 - 0.5) * 0.08;
    sv[j] = dn + shore + g;
  }
  R._iceStatics = { wCut, thr, sv, idx, dScale };
  return R._iceStatics;
}
export function bakePondIce(R, ice, snow) {
  const { RW, RH, lvl, dsh, cw, ch } = R;
  const px = new Uint8ClampedArray(RW * RH * 4);
  const frozen = new Uint8Array(RW * RH);
  // La même garde que `frozenAt` : sous 0,05 cm, pas de glace (render-glace §2 l'a trouvée absente).
  if (!(ice > 0.05)) return { px, cell: new Uint8Array(cw * ch), frozen };
  const cellWet = new Uint16Array(cw * ch), cellIce = new Uint16Array(cw * ch);
  const M = marks(R), ST = iceStatics(R), { wCut, thr, idx, dScale } = ST;
  const put = (i, c, a) => { const o = i * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = Math.round(a * 255); };
  /* 4.1 — la glace. */
  for (let yy = 0; yy < RH; yy++) for (let xx = 0; xx < RW; xx++) {
    const i = yy * RW + xx;
    if (lvl[i] === 255) continue;
    const ci = ((yy / T) | 0) * cw + ((xx / T) | 0);
    cellWet[ci]++;
    if (xx >= wCut) continue;                                         // le fleuve : jamais pris
    const j = yy * wCut + xx;
    const age = ice - thr[j];
    if (age < 0) {
      // Le front qui avance : une frange de glace-aiguille, à peine visible, devant la plaque.
      if (age > -0.07 && ice > 0.05) put(i, ICE_YOUNG, 0.26);
      continue;
    }
    frozen[i] = 1; cellIce[ci]++;
    const k0 = idx[j], kk = k0 & 15;
    if (kk === 10) { put(i, RIME, 0.96); continue; }                  // le givre au ras de la berge
    if (age < 0.05) { put(i, FRONT, 0.82); continue; }               // le bord de la plaque qui avance
    let c, a;
    if (kk >= 7) { c = CLEAR[kk - 7]; a = 0.5; }
    else { c = ICE_RAMP[kk]; a = A_SHORE + (A_DEEP - A_SHORE) * smooth01(dsh[i] * dScale / ICE_DREF); }
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
    if (k0 & 16) { put(i, GLINT, 0.55); continue; }                   // un éclat, sur la glace noire
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
    const sm = new Uint8Array(RW * RH), sv = ST.sv;
    for (let yy = 0; yy < RH; yy++) for (let xx = 0; xx < wCut; xx++) {
      const i = yy * RW + xx;
      if (!frozen[i]) continue;
      if (sv[yy * wCut + xx] > 1.05 - k * 0.85) sm[i] = 1;
    }
    const S = SNOW_TONES, { ox, oy } = R;
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
