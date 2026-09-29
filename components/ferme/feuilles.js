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
      d'hiver, dessiné dans la même enveloppe de couronne) et sa couronne d'automne
      par-dessus, dont les pixels tombent dans un ordre FIXE (`leafOrder` : par
      plaques, pas en poivre et sel) — §4 : une transition qui se voit se fait par
      un ordre au pixel. À 1, il ne reste que l'arbre nu : c'est l'image du premier
      jour d'hiver, donc la saison bascule sans que rien ne saute.
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
/* L'ordre de chute d'un pixel de couronne (0..1) : un bruit lent (des trouées par
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
export function thinPixels(src, w, h, f) {
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
    if (leafOrder(x, y) < f) out[o + 3] = 0;
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
   sud), chacune avec son ordre d'arrivée (`o`) et sa couleur (`c`, un indice de
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
    L.push({ x, y, o: clamp01(0.7 * u01(k, seed, 19) + 0.3 * r), c: h32(k, seed, 23) % nPal, s: s < 0.2 ? 2 : s < 0.55 ? 1 : 0, d: u01(k, seed, 29) });
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
