/* =============================================================================
   feuilles.js — LES FEUILLES MORTES (2026-09-30), PURES.
   -----------------------------------------------------------------------------
   Guillaume : « vers la fin de l'automne, des feuilles mortes doivent tomber des
   arbres pour se retrouver au sol aux pieds des arbres, et des feuilles doivent
   voler quand il y a du vent et des intempéries. Pour que les saisons soient plus
   réalistes. »

   Trois choses, toutes des FONCTIONS DU TEMPS PARTAGÉ (la saison et son avancée)
   ou LOCALES (ce qui vole) — zéro message, comme la neige et la faune :
   1. LA CHUTE (`leafFall`) : la part des feuilles tombées, 0 jusqu'à la moitié de
      l'automne, 1 à 92 % de la saison. L'arbre se dessine NU dessous (l'atlas
      d'hiver) et sa couronne d'automne par-dessus, qui se DÉNUDE PAR BOUQUETS
      (reprise du 2026-09-30 — le premier jet perçait l'image au pixel, « on dirait
      que la forme générale de l'arbre est rongée ») : les essences en code se
      redessinent (`fallClumps`, fermeArt.js), le pommier de la planche par
      bouquets découpés dans son image (`clumpThin`, ici), le saule par mèches
      (`thinPixels` + `strandOrder`). À 1, il ne reste que l'arbre nu : c'est
      l'image du premier jour d'hiver, donc la saison bascule sans que rien ne saute.
   2. LE TAPIS (`litterLevel`, `litterLeaves`) : ce qui est tombé s'accumule au pied,
      dans l'ellipse de la couronne ; l'hiver, les feuilles brunissent, se tassent,
      disparaissent peu à peu (et la neige les couvre) ; au printemps, plus rien.
   3. CE QUI VOLE (`makeLeafFlurry`) : des feuilles qui se détachent des couronnes
      et tombent en virevoltant ; quand le vent se lève (`W.wind`, les épisodes de
      `meteo.js`), elles filent, et les rafales soulèvent le tapis. LOCAL : chaque
      joueur voit ses feuilles (comme ses flocons).
   ========================================================================== */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth01 = (v) => { const t = clamp01(v); return t * t * (3 - 2 * t); };
function h32(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
const u01 = (x, y, s) => h32(x, y, s) / 4294967296;
/* Un bruit de valeur lisse (0..1) sur une grille de `per` pixels. */
function vnoise(x, y, per, s) {
  const gx = Math.floor(x / per), gy = Math.floor(y / per), fx = x / per - gx, fy = y / per - gy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = u01(gx, gy, s), b = u01(gx + 1, gy, s), c = u01(gx, gy + 1, s), d = u01(gx + 1, gy + 1, s);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}

/* ── 1. LA CHUTE ─────────────────────────────────────────────────────────────
   `p` : l'avancée de la saison (0..1). Les feuilles tombent sur la seconde moitié
   de l'automne (« vers la fin ») ; un arbre en avance ou en retard de ±8 % sur ses
   voisins (`jit`, un hachage de sa case) — une rue ne se dénude pas d'un bloc. */
export const FALL_FROM = 0.5, FALL_TO = 0.92;
export function leafFall(seasonKey, p, jit) {
  if (seasonKey === "winter") return 1;
  if (seasonKey !== "autumn") return 0;
  return smooth01((p - FALL_FROM + (jit || 0)) / (FALL_TO - FALL_FROM));
}
/* L'activité de la chute (0..1) : ce qui se détache EN CE MOMENT. Quelques feuilles
   tout l'automne, le gros au milieu de la chute, plus rien sur un arbre nu. */
export function fallActivity(seasonKey, p) {
  if (seasonKey !== "autumn") return 0;
  const f = leafFall(seasonKey, p, 0);
  return f >= 1 ? 0 : 0.12 + 0.88 * 4 * f * (1 - f);
}
/* ⚠️ `leafOrder`/`thinPixels` NE SERVENT PLUS QU'AU SAULE (avec `strandOrder`) et au
   banc, qui rejoue le premier jet pour prouver que ses mesures le voient rougir.
   L'ordre de chute d'un pixel de couronne (0..1) : un bruit lent (des trouées par
   plaques de 5 à 6 px) mêlé d'un grain. Un pixel est tombé quand `ordre < f`.
   ⚠️ ÉGALISÉ par sa propre répartition (`ORDER_CDF`, mesurée une fois sur 96 × 96
   points) : la somme de deux bruits se tasse autour de 0,5 — premier jet, 10 % des
   pixels tombés à 30 % de chute et 70 % à 60 % (verify-feuilles §2) : le début de
   la chute ne se voyait pas, puis tout partait d'un coup. Égalisée, la part tombée
   EST `f`. */
const rawOrder = (x, y) => 0.62 * vnoise(x, y, 5.5, 71) + 0.38 * u01(x, y, 73);
const ORDER_CDF = (() => { const a = []; for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) a.push(rawOrder(x * 7 + 3, y * 5 + 11)); return Float64Array.from(a).sort(); })();
export function leafOrder(x, y) {
  const v = rawOrder(x, y);
  let lo = 0, hi = ORDER_CDF.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (ORDER_CDF[m] < v) lo = m + 1; else hi = m; }
  return lo / ORDER_CDF.length;
}
/* Les pixels d'une couronne d'automne à la chute `f` : ceux dont l'ordre est passé
   deviennent transparents. `src` RGBA (w × h), rend un NOUVEAU tableau. */
/* ⚠️ LE FÛT NE PERD PAS DE PIXELS (vu sur la planche : le pommier de la planche de
   Gemini a un tronc clair, son arbre nu d'hiver un tronc brun — le tronc se
   tachetait pendant la chute). Les rangées du fût se repèrent à leur étroitesse
   SOUS la couronne (moins de 45 % de sa plus large rangée) : leurs pixels opaques
   restent jusqu'à la fin ; l'ombre (translucide) tombe avec le reste. La couronne
   d'un saule, qui descend bas, reste large : elle tombe. */
/* `order` : l'ordre de chute (`leafOrder` par défaut, `strandOrder` pour le saule) ;
   `base` : la ligne de sol — l'ombre peinte dessous (gris neutre et sombre, à moins
   de 5 px au-dessus du sol) pâlit d'un bloc au lieu de s'effriter (vu sur le saule :
   une ombre rayée comme ses mèches). */
export function thinPixels(src, w, h, f, order, base) {
  const ord = order || leafOrder;
  const out = new Uint8ClampedArray(src);
  if (f <= 0) return out;
  let wMax = 0;
  const rowW = new Int32Array(h);
  for (let y = 0; y < h; y++) { let n = 0; for (let x = 0; x < w; x++) if (src[(y * w + x) * 4 + 3] >= 250) n++; rowW[y] = n; if (n > wMax) wMax = n; }
  // Le fût : de la première rangée étroite sous la plus large (la couronne) jusqu'à
  // la prochaine large (l'ombre peinte, opaque sur les arbres de la planche).
  let yMax = 0;
  for (let y = 0; y < h; y++) if (rowW[y] === wMax) { yMax = y; break; }
  let trunkFrom = h, trunkTo = h;
  for (let y = yMax; y < h; y++) if (rowW[y] > 0 && rowW[y] <= wMax * 0.45) { trunkFrom = y; break; }
  for (let y = trunkFrom; y < h; y++) if (rowW[y] > wMax * 0.45) { trunkTo = y; break; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    if (!out[o + 3]) continue;
    if (f < 1 && y >= trunkFrom && y < trunkTo && out[o + 3] >= 250) continue;
    if (base && y >= base - 5) {
      const mx = Math.max(out[o], out[o + 1], out[o + 2]), mn = Math.min(out[o], out[o + 1], out[o + 2]);
      if (mx - mn < 26 && mx < 120) { out[o + 3] = Math.round(out[o + 3] * (1 - f)); continue; }
    }
    if (ord(x, y) < f) out[o + 3] = 0;
  }
  return out;
}
/* 2026-09-30 (reprise) — LE SAULE PERD SES FEUILLES PAR MÈCHES. Son hiver garde sa
   silhouette (le rideau de rameaux dorés, `willowWinter`) : ce qui tombe se voit
   ENTRE les mèches, donc l'ordre de chute suit leur sens — un bruit étiré en
   hauteur (1,4 px de large, 9 de haut), des fentes qui découvrent l'or dessous,
   pas des plaques rondes. Même égalisation que `leafOrder`. */
function vnoise2(x, y, px, py, s) {
  const gx = Math.floor(x / px), gy = Math.floor(y / py), fx = x / px - gx, fy = y / py - gy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = u01(gx, gy, s), b = u01(gx + 1, gy, s), c = u01(gx, gy + 1, s), d = u01(gx + 1, gy + 1, s);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}
const rawStrand = (x, y) => 0.78 * vnoise2(x, y, 1.4, 9, 79) + 0.22 * u01(x, y, 83);
const STRAND_CDF = (() => { const a = []; for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) a.push(rawStrand(x * 7 + 3, y * 5 + 11)); return Float64Array.from(a).sort(); })();
export function strandOrder(x, y) {
  const v = rawStrand(x, y);
  let lo = 0, hi = STRAND_CDF.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (STRAND_CDF[m] < v) lo = m + 1; else hi = m; }
  return lo / STRAND_CDF.length;
}

/* 2026-09-30 (reprise) — LE FÛT D'UN ARBRE PEINT, ET CE QUI S'Y ACCROCHE. Sous la
   rangée la plus large (la couronne), le fût commence à la première rangée ÉTROITE
   (moins de 45 % de la plus large) ou COUPÉE (deux morceaux ou plus) — ⚠️ la seule
   étroitesse le faisait commencer huit rangées trop bas sur le pommier, dont le
   nichoir élargit les rangées sous la boule : le haut du tronc blanc et le nichoir
   tombaient avec les feuilles. Il finit à la rangée qui s'élargit de nouveau
   (l'ombre peinte). `isTrunk` : ce qui, dans cette bande, TOUCHE le fût (le nichoir
   oui, une feuille qui pend sous la boule non). Rend { trunkFrom, trunkTo, isTrunk }. */
export function trunkRegion(src, w, h) {
  const A = (x, y) => src[(y * w + x) * 4 + 3];
  const rowW = new Int32Array(h), runs = new Int32Array(h);
  let wMax = 0;
  for (let y = 0; y < h; y++) {
    let n = 0, r = 0, prev = false;
    for (let x = 0; x < w; x++) { const on = A(x, y) >= 250; if (on) n++; if (on && !prev) r++; prev = on; }
    rowW[y] = n; runs[y] = r; if (n > wMax) wMax = n;
  }
  let yMax = 0;
  for (let y = 0; y < h; y++) if (rowW[y] === wMax) { yMax = y; break; }
  let narrow = h, trunkFrom = h, trunkTo = h;
  for (let y = yMax; y < h; y++) if (rowW[y] > 0 && rowW[y] <= wMax * 0.45) { narrow = y; break; }
  for (let y = yMax; y < narrow; y++) if (runs[y] >= 2) { trunkFrom = y; break; }
  trunkFrom = Math.min(trunkFrom, narrow);
  for (let y = narrow; y < h; y++) if (rowW[y] > wMax * 0.45) { trunkTo = y; break; }
  const isTrunk = new Uint8Array(w * h);
  const st = [];
  if (trunkTo > trunkFrom) for (let x = 0; x < w; x++) if (A(x, trunkTo - 1) >= 250) { isTrunk[(trunkTo - 1) * w + x] = 1; st.push((trunkTo - 1) * w + x); }
  while (st.length) {
    const j = st.pop(), x = j % w, y = (j / w) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || xx >= w || yy < trunkFrom || yy >= trunkTo) continue;
      const k = yy * w + xx;
      if (!isTrunk[k] && A(xx, yy) >= 250) { isTrunk[k] = 1; st.push(k); }
    }
  }
  return { trunkFrom, trunkTo, isTrunk };
}

/* 2026-09-30 (reprise) — UNE COURONNE PEINTE (le pommier de la planche) QUI SE
   DÉNUDE PAR BOUQUETS. Guillaume, sur le premier jet (`thinPixels`) : « on dirait
   que la forme générale de l'arbre est rongée, pas que les branches se dénudent ».
   Les essences en code se redessinent avec leurs vrais bouquets (`fallClumps`,
   fermeArt.js) ; une image de Gemini n'en a pas, alors on lui en découpe :
   · des disques qui pavent la couronne (semis à 5 px, rayon 4,2) — à 0 %, leur
     union EST la couronne, pixel pour pixel ;
   · chacun rétrécit à SA date (nombre d'or autour de la couronne, le cœur un peu
     plus tôt) en glissant vers la pointe de rameau la plus proche de l'arbre nu
     (`tips`) ; ce qu'il montre est l'image d'origine TRANSPORTÉE avec lui — la
     matière peinte reste la sienne ; un bord d'ombre (sud-est) le détache ;
   · des grappes semées sur les rameaux (`twigs`) attendent dessous ;
   · le tout est recerné (la couleur du cerne d'origine ; une grappe, du côté de
     l'ombre seulement) ; le fût reste ; l'ombre portée pâlit.
   `src` RGBA (w × h) ; rend un NOUVEAU tableau. */
export function clumpThin(src, w, h, f, opt) {
  const o = opt || {}, tips = o.tips || [], twigs = o.twigs || [], seed = o.seed | 0;
  const out = new Uint8ClampedArray(src.length);
  if (f >= 1) return out;
  const hs = (i, k) => u01(i, seed, k);
  const { trunkFrom, trunkTo, isTrunk } = trunkRegion(src, w, h);
  const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[(y * w + x) * 4 + 3]);
  const crown = new Uint8Array(w * h);
  let nC = 0, sx = 0, sy = 0;
  for (let y = 0; y < trunkTo; y++) for (let x = 0; x < w; x++) if (A(x, y) >= 250 && !isTrunk[y * w + x]) { crown[y * w + x] = 1; nC++; sx += x; sy += y; }
  // Le fût (et ce qui s'y accroche) reste ; l'ombre portée pâlit avec le feuillage.
  for (let y = trunkFrom; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, a = src[i + 3];
    if (!a || crown[y * w + x]) continue;
    out[i] = src[i]; out[i + 1] = src[i + 1]; out[i + 2] = src[i + 2];
    out[i + 3] = y < trunkTo && a >= 250 ? a : Math.round(a * (1 - f));
  }
  if (!nC) return out;
  const ccx = sx / nC, ccy = sy / nC;
  const isC = (x, y) => x >= 0 && y >= 0 && x < w && y < h && crown[y * w + x] === 1;
  // La couleur du cerne : la plus fréquente, parmi les pixels sombres du bord.
  const hist = new Map();
  for (let y = 0; y < trunkTo; y++) for (let x = 0; x < w; x++) {
    if (!isC(x, y) || (isC(x + 1, y) && isC(x - 1, y) && isC(x, y + 1) && isC(x, y - 1))) continue;
    const i = (y * w + x) * 4, L = src[i] * 0.3 + src[i + 1] * 0.59 + src[i + 2] * 0.11;
    if (L > 110) continue;
    const k = (src[i] << 16) | (src[i + 1] << 8) | src[i + 2];
    hist.set(k, (hist.get(k) || 0) + 1);
  }
  let outCol = [58, 40, 26], bestN = 0;
  for (const [k, n] of hist) if (n > bestN) { bestN = n; outCol = [k >> 16, (k >> 8) & 255, k & 255]; }
  // Les disques qui pavent la couronne.
  const R0 = 4.2, inD = (c, x, y, r) => { const dx = x + 0.5 - c.x, dy = (y + 0.5 - c.y) * 1.06; return dx * dx + dy * dy <= r * r; };
  const cand = [];
  for (let y = 0; y < trunkTo; y++) for (let x = 0; x < w; x++) if (isC(x, y)) cand.push({ x: x + 0.5, y: y + 0.5, k: h32(x, y, seed + 5) });
  cand.sort((a, b) => a.k - b.k);
  const discs = [];
  for (const c of cand) if (discs.every((d) => (d.x - c.x) ** 2 + (d.y - c.y) ** 2 >= 25)) discs.push({ x: c.x, y: c.y });
  for (const c of cand) if (!discs.some((d) => inD(d, c.x - 0.5, c.y - 0.5, R0))) discs.push({ x: c.x, y: c.y });
  let rMax = 1, tMax = 1;
  for (const d of discs) { d.a = Math.atan2(d.y - ccy, d.x - ccx); d.rr = Math.hypot(d.x - ccx, d.y - ccy); rMax = Math.max(rMax, d.rr); }
  for (const p of twigs) if (isC(Math.floor(p.x), Math.floor(p.y))) tMax = Math.max(tMax, Math.hypot(p.x - ccx, p.y - ccy));
  discs.sort((a, b) => a.a - b.a);
  const u0 = hs(0, 9), used = new Set(), live = [];
  discs.forEach((d, i) => {
    const inner = d.rr < rMax * 0.45, u = (u0 + 0.618034 * i) % 1;
    const s0 = inner ? 0.02 + 0.4 * u : 0.06 + 0.52 * u, e = s0 + 0.22 + 0.16 * hs(i, 2);
    const q = Math.max(0, (f - s0) / (e - s0));
    if (q >= 1) return;
    // ⚠️ Une pointe à plus de 6 px ne l'attire pas : l'arbre nu du pommier n'est
    // pas le sien (le pommier en code), et un disque qui file vers une pointe
    // lointaine sort de la boule — vu à 20 %, des morceaux au-dessus de la couronne.
    let best = -1, bd = 36;
    for (let j = 0; j < tips.length; j++) {
      const dd = (tips[j].x - d.x) ** 2 + (tips[j].y - d.y) ** 2 + (used.has(j) ? 400 : 0);
      if (dd < bd) { bd = dd; best = j; }
    }
    const a = best >= 0 ? tips[best] : d;
    if (best >= 0) used.add(best);
    const t = Math.min(1, Math.max(0, (q - 0.3) / 0.6));   // sur place d'abord, vers sa pointe ensuite
    live.push({ x: d.x + (a.x - d.x) * t, y: d.y + (a.y - d.y) * t, ox: (a.x - d.x) * t, oy: (a.y - d.y) * t, r: Math.max(1.7, R0 * Math.sqrt(1 - q)), q, tier: 1 });
  });
  twigs.forEach((p, j) => {
    // Cachée TOUT ENTIÈRE sous la couronne : dehors, une grappe se verrait dès le premier jour.
    const r = 1.6 + 0.9 * hs(200 + j, 7), m = Math.ceil(r + 0.5), px = Math.floor(p.x), py = Math.floor(p.y);
    if (hs(200 + j, 3) > 0.85 || !isC(px, py) || !isC(px - m, py) || !isC(px + m, py) || !isC(px, py - m) || !isC(px, py + m)) return;
    const outer = Math.hypot(p.x - ccx, p.y - ccy) / tMax;
    const e = 0.42 + 0.56 * Math.sqrt(0.5 * hs(200 + j, 5) + 0.5 * outer);
    if (f >= e) return;
    live.push({ x: p.x, y: p.y, ox: 0, oy: 0, r, q: 1, tier: 0 });
  });
  live.sort((a, b) => (a.tier - b.tier) || (a.y - b.y));
  const mask = new Uint8Array(w * h), own = new Float32Array(w * h);
  const pal = autumnPalette(src, w, Math.min(h, trunkFrom + 1));
  for (const c of live) {
    const x0 = Math.max(0, Math.floor(c.x - c.r)), x1 = Math.min(w - 1, Math.ceil(c.x + c.r));
    const y0 = Math.max(0, Math.floor(c.y - c.r)), y1 = Math.min(h - 1, Math.ceil(c.y + c.r));
    // Le bord d'ombre n'apparaît qu'à mesure que le bouquet se détache (0 : l'image d'origine).
    const shadeK = Math.min(1, c.q * 4);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!inD(c, x, y, c.r)) continue;
      const qx = Math.round(x - c.ox), qy = Math.round(y - c.oy);
      let col;
      // Une grappe prend les teintes du feuillage (`autumnPalette`) : lue dans l'image,
      // elle ramassait le rouge d'une pomme peinte.
      if (c.tier === 0) col = pal[(h32(Math.floor(c.x), Math.floor(c.y), seed) >>> 3) % Math.min(2, pal.length)];
      else if (isC(qx, qy)) { const i = (qy * w + qx) * 4; col = [src[i], src[i + 1], src[i + 2]]; }
      else continue;
      const dx = (x + 0.5 - c.x) / c.r, dy = (y + 0.5 - c.y) / c.r;
      const lit = -dx * 0.62 - dy * 0.78;
      const k = lit < -0.45 ? 1 - 0.3 * shadeK : lit > 0.5 && c.tier === 0 ? 1.12 : 1;
      const i = (y * w + x) * 4;
      out[i] = Math.min(255, col[0] * k); out[i + 1] = Math.min(255, col[1] * k); out[i + 2] = Math.min(255, col[2] * k); out[i + 3] = 255;
      mask[y * w + x] = 1; own[y * w + x] = c.r;
    }
  }
  /* Un disque déplacé qui ne trouve plus qu'un ou deux pixels d'image à transporter
     laisse un ÉCLAT (vu au banc : le pommier à 40 %) : tout morceau de deux pixels
     ou moins s'en va, avant le cerne. */
  const seen = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || seen[i]) continue;
    const comp = [i], st = [i];
    seen[i] = 1;
    while (st.length) {
      const j = st.pop(), x = j % w, y = (j / w) | 0;
      for (const k of [x + 1 < w ? j + 1 : -1, x > 0 ? j - 1 : -1, y + 1 < h ? j + w : -1, y > 0 ? j - w : -1]) {
        if (k >= 0 && mask[k] && !seen[k]) { seen[k] = 1; st.push(k); comp.push(k); }
      }
    }
    if (comp.length <= 2) for (const j of comp) { mask[j] = 0; out[j * 4 + 3] = 0; }
  }
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!on(x, y) || (on(x + 1, y) && on(x - 1, y) && on(x, y + 1) && on(x, y - 1))) continue;
    if (own[y * w + x] < 3.2 && on(x + 1, y) && on(x, y + 1)) continue;
    const i = (y * w + x) * 4;
    out[i] = outCol[0]; out[i + 1] = outCol[1]; out[i + 2] = outCol[2];
  }
  return out;
}

/* Le cran d'un arbre (0..FALL_STEPS) : la couronne se recuit par crans (§10 : le
   nombre de canevas), l'arbre en avance d'un cran sur son voisin. */
export const FALL_STEPS = 20;
export const fallStep = (f) => Math.max(0, Math.min(FALL_STEPS, Math.round(f * FALL_STEPS)));

/* ── 2. LE TAPIS ─────────────────────────────────────────────────────────────
   `litterLevel` : la part des feuilles du tapis qui sont là (0..1). Elle suit la
   chute (un peu en avance : ce qui tombe se voit au sol), tient au début de
   l'hiver, puis se tasse et disparaît sur la seconde moitié de l'hiver. */
export function litterLevel(seasonKey, p, jit) {
  if (seasonKey === "autumn") return clamp01(leafFall(seasonKey, p, jit) * 1.15);
  if (seasonKey === "winter") return 1 - smooth01((p - 0.35) / 0.55);
  return 0;
}
/* Le brunissement (0..1) : les feuilles au sol perdent leur couleur l'hiver. */
export function litterBrown(seasonKey, p) {
  if (seasonKey === "winter") return 0.55 + 0.45 * smooth01(p / 0.5);
  if (seasonKey === "autumn") return 0.25 * leafFall(seasonKey, p, 0);
  return 0;
}
/* Les feuilles du tapis d'un arbre, en px autour du pied (x vers l'est, y vers le
   sud), chacune avec son ordre d'arrivée (`o`), sa pose (`sz` : 2 de face, 1 de
   biais, 0 en long — ⚠️ pas `s` : `verify-cycle` lit `s === 2` comme un indice de
   case de la barre écrit en dur) et sa couleur (`c`, un indice de
   la palette de l'essence). Denses près du tronc, éparses au bord de la couronne ;
   une feuille sur cinq est « de face » (2 px), les autres de biais (1 px) ou
   posées en long (2 px en x). Mémo par (rx, ry, graine). */
const LITTER_MEMO = new Map();
export function litterLeaves(rx, ry, seed, nPal) {
  const key = `${rx}|${ry}|${seed}|${nPal}`;
  let L = LITTER_MEMO.get(key);
  if (L) return L;
  L = [];
  const n = Math.round(rx * ry * 1.1);   // ~1 feuille pour 3 px de l'ellipse au plus épais (premier jet à 0,55 : clairsemé à l'écran)
  for (let k = 0; k < n; k++) {
    const a = u01(k, seed, 11) * Math.PI * 2;
    // Densité : plus près du tronc (rayon tiré en racine d'une loi qui penche vers 0).
    const r = Math.pow(u01(k, seed, 13), 0.8);
    const x = Math.round(Math.cos(a) * r * rx), y = Math.round(Math.sin(a) * r * ry);
    const s = u01(k, seed, 17);
    L.push({ x, y, o: clamp01(0.7 * u01(k, seed, 19) + 0.3 * r), c: h32(k, seed, 23) % nPal, sz: s < 0.2 ? 2 : s < 0.55 ? 1 : 0, d: u01(k, seed, 29) });
  }
  if (LITTER_MEMO.size > 400) LITTER_MEMO.clear();
  LITTER_MEMO.set(key, L);
  return L;
}
/* Les teintes d'automne d'une essence, lues dans les pixels de sa couronne : les
   couleurs chaudes et saturées (pas le tronc, pas l'ombre), les quatre plus
   fréquentes. Un repli doré si l'image n'en a pas. */
export function autumnPalette(px, w, h) {
  const hist = new Map();
  for (let y = 0; y < Math.floor(h * 0.7); y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    if (px[o + 3] < 200) continue;
    const r = px[o], g = px[o + 1], b = px[o + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 70 || (mx - mn) / mx < 0.3 || r < b) continue;
    const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    hist.set(k, (hist.get(k) || 0) + 1);
  }
  const top = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => [((k >> 10) & 31) * 8 + 4, ((k >> 5) & 31) * 8 + 4, (k & 31) * 8 + 4]);
  return top.length >= 2 ? top : [[214, 148, 52], [192, 104, 40], [226, 176, 70], [160, 82, 38]];
}
/* Une couleur de feuille, brunie de `k` (0..1) vers une feuille morte. */
const DEAD = [[118, 80, 46], [98, 68, 42], [132, 96, 58]];
export function leafColor(c, k, j) {
  const d = DEAD[j % DEAD.length];
  return [Math.round(c[0] + (d[0] - c[0]) * k), Math.round(c[1] + (d[1] - c[1]) * k), Math.round(c[2] + (d[2] - c[2]) * k)];
}

/* ── 3. CE QUI VOLE ──────────────────────────────────────────────────────────
   Un système de particules LOCAL, en px monde. `step(dt, env)` : `env.sources`
   (les couronnes visibles : { x, y (centre), rx, ry, ground (y du pied), pal,
   rate }), `env.wind` (0..1, meteo.js), `env.gust` (0..1 : les rafales soulèvent
   le tapis — `env.lift`, des points de tapis visibles), `env.view` (le cadre, px
   monde), `env.dt`. `draw(put)` : `put(x, y, w, h, rgb, a)` peint un pixel d'art.
   ⚠️ Les feuilles qui tombent : 9 à 15 px/s, un balancement (la feuille qui
   plane d'un côté puis de l'autre), un basculement qui la fait passer de face (2
   px) à la tranche (1 px) — c'est ce qui la fait lire comme une feuille et pas
   comme un flocon. Elles se posent au sol, restent un peu, s'effacent.
   ⚠️ Les feuilles qui volent (vent ≥ 0,25) : elles filent à 30–90 px/s, tournent
   en spirale, montent et redescendent ; elles entrent par le bord au vent et
   sortent par l'autre. */
const MAX_LEAVES = 260;
export function makeLeafFlurry() {
  const P = [];
  let acc = 0, accW = 0;
  const rnd = Math.random;
  function spawnFall(s) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
    const x = s.x + Math.cos(a) * r * s.rx, y = s.y + Math.sin(a) * r * s.ry;
    const gy = s.ground + (rnd() * 2 - 1) * s.ry * 0.5;
    P.push({ k: 0, x, y, gy: Math.max(gy, y + 6), vy: 9 + rnd() * 6, sw: 4 + rnd() * 5, w: 1.8 + rnd() * 1.8, ph: rnd() * 6.283, tb: 5 + rnd() * 5, c: s.pal[(rnd() * s.pal.length) | 0], t: 0, land: -1 });
  }
  function spawnFly(v, wind, pal, from) {
    const x = from ? from.x : v.x0 - 8, y = from ? from.y : v.y0 + rnd() * (v.y1 - v.y0);
    P.push({ k: 1, x, y, gy: 0, vx: (30 + rnd() * 60) * (0.4 + wind), vy: 0, ph: rnd() * 6.283, sr: 4 + rnd() * 8, sw: 1.5 + rnd() * 2.5, alt: from ? 0 : 6 + rnd() * 18, tb: 7 + rnd() * 6, c: pal[(rnd() * pal.length) | 0], t: 0, land: -1 });
  }
  return {
    count: () => P.length,
    clear() { P.length = 0; },
    step(env) {
      const dt = Math.min(0.1, env.dt || 0), wind = env.wind || 0, v = env.view;
      // Les feuilles qui se détachent des couronnes visibles.
      for (const s of env.sources || []) {
        let n = s.rate * dt * (1 + 2.5 * wind);
        while (n > 0 && P.length < MAX_LEAVES) { if (n >= 1 || rnd() < n) spawnFall(s); n -= 1; }
      }
      // Le vent qui les emporte : par le bord au vent, et du tapis soulevé par les rafales.
      if (wind > 0.25 && env.flyPal) {
        accW += dt * (wind - 0.25) * (env.flyRate || 0) * ((v.x1 - v.x0) * (v.y1 - v.y0)) / 40000;
        while (accW >= 1 && P.length < MAX_LEAVES) { accW -= 1; spawnFly(v, wind, env.flyPal, null); }
        for (const q of env.lift || []) if (rnd() < dt * (env.gust || 0) * 0.35 && P.length < MAX_LEAVES) spawnFly(v, wind, q.pal, q);
      }
      for (let i = P.length - 1; i >= 0; i--) {
        const f = P[i];
        f.t += dt;
        if (f.k === 0) {
          if (f.land < 0) {
            f.y += f.vy * dt;
            f.x += (Math.cos(f.t * f.w + f.ph) * f.sw * f.w * 0.5 + wind * 26) * dt;
            if (f.y >= f.gy) { f.y = f.gy; f.land = f.t; }
          } else if (f.t - f.land > 2.5) { P.splice(i, 1); continue; }
        } else {
          f.x += f.vx * dt + Math.cos(f.t * 3.1 + f.ph) * f.sr * dt * 3;
          f.alt = Math.max(0, f.alt + (Math.sin(f.t * 2.3 + f.ph) * 22 - (f.alt > 30 ? 12 : 0)) * dt);
          f.y += Math.sin(f.t * 1.7 + f.ph) * f.sw * dt;
          if (f.x > v.x1 + 20 || f.t > 12) { P.splice(i, 1); continue; }
        }
      }
    },
    /* `put(x, y, w, h, rgb, alpha)` en px monde. La feuille bascule : de face (2×1),
       de biais (1×1), sur la tranche (1×1 plus sombre). */
    draw(put) {
      for (const f of P) {
        const ph = Math.floor(f.t * f.tb + f.ph * 3) % 4;
        const a = f.land >= 0 ? Math.max(0, 1 - (f.t - f.land) / 2.5) : 1;
        const y = f.k === 1 ? f.y - f.alt : f.y;
        const c = ph === 3 ? [f.c[0] * 0.72, f.c[1] * 0.72, f.c[2] * 0.72] : f.c;
        if (f.k === 1 && f.alt > 1) put(Math.round(f.x), Math.round(f.y), 1, 1, [20, 20, 20], 0.18);   // l'ombre au sol de la feuille qui vole
        if (ph === 0 || f.land >= 0) put(Math.round(f.x), Math.round(y), 2, 1, c, a);
        else put(Math.round(f.x), Math.round(y), 1, 1, c, a);
      }
    },
  };
}
