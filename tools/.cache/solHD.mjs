/* ╔══════════════════════════════════════════════════════════════════════════
   ║ AUDIT 2026-10 — PROTOTYPE : LE DALLAGE CIVIQUE EN PROCÉDURAL HAUTE RÉSOLUTION
   ╚══════════════════════════════════════════════════════════════════════════
   Demande de Guillaume (audit 2026-10, partie 0) : prototyper l'« option
   procédurale » de `refs/lot-gemini/A-sols-vt.md` sur le dallage civique, derrière
   un interrupteur qui garde l'ancien dessin comme repli. RIEN N'EST DÉCIDÉ : le
   choix Gemini / procédural / panaché reste à Guillaume (docs/A-JUGER.md).

   ⚠️ LE PLAN NE BOUGE PAS. On ne retire pas une pierre : la disposition vient de
   la tuile d'art elle-même (`townFlagCivicSurface`, fermeArt.js, qui publie ses
   pierres dans `canvas.stones`), et le ton de chaque pierre est la MOYENNE de son
   intérieur sur la tuile d'art (palette et clarté conservées : la règle « moyenne
   à 6 % près » du lot Gemini, tenue par construction). Les joints restent centrés
   sur la colonne de joint de l'art : la neige (qui remplit les joints lus sur
   l'art, `townSnowEnv`) et la pluie tombent toujours au bon endroit.

   ⚠️ CE QUI EST AJOUTÉ (la passe de détail du lot A) : un rendu maître à 16 px par
   pixel d'art (1 024 px pour la tuile de 64), des bords de pierre irréguliers aux
   coins arrondis et quelques éclats, un grain minéral à trois échelles, des
   piqûres claires et sombres, des veines fines sur une pierre sur trois, un biseau
   éclairé du nord-ouest (le côté de la lumière des maisons peintes), une ombre de
   contact au fond du joint, la mousse de l'art reprise en touffes fines. Puis une
   réduction Lanczos-3 PÉRIODIQUE à chaque cran (64·z px pour la tuile) : la tuile
   reste bouclée au pixel près, et elle se pose à 1 px d'image = 1 px d'écran,
   comme les maisons (`drawScreenExactBitmap`).

   ⚠️ CE QUI RESTE EN PIXELS D'ART (dettes du prototype, à juger) : la pierre de
   bordure de la place et la rosace de la fontaine (dessinées par-dessus), le
   mouillé et les flaques de la pluie, la neige, les feuilles — tout ce qui lit la
   tuile d'art. C'est la « plomberie » du lot A, identique pour une image Gemini.

   Coût mesuré en jeu (audit 2026-10) : voir docs/AUDIT-2026-10.md, FIX-004. Le
   maître se fabrique UNE fois, au premier dallage civique dessiné ; chaque cran à
   sa première demande. Six canevas de plus au plus (le maître est jeté). */

const K = 16;            // px maître par px d'art
const JW = 0.42;         // demi-largeur du joint, en px d'art (l'art : un joint de 1 px plein ; 1,4 px d'écran au cran 2)
const BEVEL = 17;        // largeur du biseau, en px maître : LE liseré d'1 px d'art de la tuile d'origine, gardé
const CORNER = 4;        // rayon des coins, en px maître

/* L'interrupteur. Local à chaque client (un réglage de vue, jamais diffusé, §3) ;
   le menu dev le bascule, `false` rend exactement l'ancien dessin. */
export const civicHD = { on: true };

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/* Bruit de valeur PÉRIODIQUE (période = N / pas) : la tuile reste bouclée. */
function makeNoise(N, step, seed) {
  const n = Math.max(1, Math.round(N / step)), r = rng(seed), lat = new Float32Array(n * n);
  for (let i = 0; i < lat.length; i++) lat[i] = r() * 2 - 1;
  const sc = n / N;
  return (x, y) => {
    const fx = x * sc, fy = y * sc, x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = ((x0 % n) + n) % n, b = ((y0 % n) + n) % n, a1 = (a + 1) % n, b1 = (b + 1) % n;
    const v00 = lat[b * n + a], v10 = lat[b * n + a1], v01 = lat[b1 * n + a], v11 = lat[b1 * n + a1];
    return (v00 + (v10 - v00) * sx) + ((v01 + (v11 - v01) * sx) - (v00 + (v10 - v00) * sx)) * sy;
  };
}

/* Le maître : Float32 RGB, N × N (N = 64·K). */
export function* buildMasterGen(art, stones, variant = 0) {
  const A = art.width, N = A * K;
  const ad = art.getContext("2d").getImageData(0, 0, A, A).data;
  const wrapA = (v) => ((v % A) + A) % A, wrapN = (v) => ((v % N) + N) % N;
  const apx = (x, y) => { const i = (wrapA(y) * A + wrapA(x)) * 4; return [ad[i], ad[i + 1], ad[i + 2]]; };
  const lum = (c) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
  const id = new Int16Array(N * N).fill(-1), dist = new Float32Array(N * N);
  const nEdge = makeNoise(N, 12, 0x51a3), nEdge2 = makeNoise(N, 3.5, 0x77e1);
  const r = rng(0x2c8f);

  /* ── 0. Ce que l'art dit de chaque pierre ──────────────────────────────────
     Le ton (moyenne de l'intérieur, sans le liseré), sa variation chaude/froide (±2,5 % de
     teinte, jamais de clarté : la palette reste celle de l'art), quelques éclats, une veine
     sur trois, une direction de « touche » (le grain de la pierre a un sens, comme une
     peinture). */
  const owner = new Int16Array(A * A).fill(-1), ring = new Uint8Array(A * A);
  stones.forEach((st, si) => {
    for (let y = 0; y < st.h; y++) for (let x = 0; x < st.w; x++) {
      const q = wrapA(st.y + y) * A + wrapA(st.x + x);
      owner[q] = si;
      if (st.w > 2 && st.h > 2 && (x === 0 || y === 0 || x === st.w - 1 || y === st.h - 1)) ring[q] = 1;
    }
  });
  const info = stones.map((st, si) => {
    let sr = 0, sg = 0, sb = 0, n = 0;
    for (let y = 0; y < st.h; y++) for (let x = 0; x < st.w; x++) {
      const q = wrapA(st.y + y) * A + wrapA(st.x + x);
      if (ring[q] && st.w > 2 && st.h > 2) continue;
      const p = apx(st.x + x, st.y + y); sr += p[0]; sg += p[1]; sb += p[2]; n++;
    }
    const chips = [], nc = (r() * 3.4) | 0;
    for (let c = 0; c < nc; c++) chips.push({ side: (r() * 4) | 0, t: 0.12 + r() * 0.76, rad: 2 + r() * 4.5 });
    const warm = (r() - 0.5) * 0.05, ang = r() * Math.PI;
    return { mean: [sr / n * (1 + warm), sg / n, sb / n * (1 - warm)], chips, vein: r() < 0.34, seed: (si + 1) * 7919 + variant * 104729, ca: Math.cos(ang), sa: Math.sin(ang) };
  });
  /* LES VARIANTES (anti-répétition) : mêmes pierres, mêmes joints, mais les TONS redistribués entre les
     pierres (une permutation : la palette et la clarté moyenne de la tuile ne bougent pas d'un bit) et
     d'autres graines de grain. Le plan reste celui du jeu ; ce qui revenait tous les 64 px ne revient plus. */
  if (variant > 0) {
    const rv = rng(0x7a11 + variant * 977), order = info.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = (rv() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
    const means = order.map((i) => info[i].mean);
    info.forEach((it, i) => { it.mean = means[i]; it.vein = rv() < 0.34; const ang = rv() * Math.PI; it.ca = Math.cos(ang); it.sa = Math.sin(ang); });
  }

  /* ── 1. Les pierres au maître : rectangle aux coins usés et aux bords bruités, éclats, sur le
     tore. `dist` = la profondeur dans la pierre (px maître), qui porte le biseau et la crasse. */
  stones.forEach((st, si) => {
    const X0 = st.x * K - K / 2 + JW * K, X1 = (st.x + st.w) * K + K / 2 - JW * K;
    const Y0 = st.y * K - K / 2 + JW * K, Y1 = (st.y + st.h) * K + K / 2 - JW * K;
    const cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2, hx = (X1 - X0) / 2, hy = (Y1 - Y0) / 2;
    Object.assign(info[si], { cx0: cx, cy0: cy, hx, hy });
    const ch = info[si].chips.map((c) => {
      const t = c.t;
      if (c.side === 0) return { x: X0 + (X1 - X0) * t, y: Y0, r: c.rad };
      if (c.side === 1) return { x: X1, y: Y0 + (Y1 - Y0) * t, r: c.rad };
      if (c.side === 2) return { x: X0 + (X1 - X0) * t, y: Y1, r: c.rad };
      return { x: X0, y: Y0 + (Y1 - Y0) * t, r: c.rad };
    });
    for (let y = Math.floor(Y0) - 3; y <= Math.ceil(Y1) + 3; y++) for (let x = Math.floor(X0) - 3; x <= Math.ceil(X1) + 3; x++) {
      const rc = CORNER + 1.5 * (0.5 + 0.5 * nEdge(x * 0.7 + 91, y * 0.7));
      const qx = Math.abs(x + 0.5 - cx) - (hx - rc), qy = Math.abs(y + 0.5 - cy) - (hy - rc);
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rc;
      let d = -outside + nEdge(x, y) * 1.3 + nEdge2(x, y) * 0.55;
      for (const c of ch) d = Math.min(d, Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y) - c.r * (0.8 + 0.4 * (0.5 + 0.5 * nEdge2(x * 2, y * 2))));
      if (d <= 0) continue;
      const k = wrapN(y) * N + wrapN(x);
      if (id[k] < 0 || d > dist[k]) { id[k] = si; dist[k] = d; }
    }
  });
  yield;

  /* ── 2. Les marbrures et les piqûres de l'art, gardées à leur place ────────────
     (le lot A : « chaque tache reste où elle est »). L'intérieur d'une pierre sur l'art = son
     ton + deux taches + des pixels isolés ; le liseré est rendu par le biseau. Un pixel qui
     diffère de ses quatre voisins est une PIQÛRE : elle devient une inclusion fine à sa place
     (claire) ou un creux (sombre) ; le reste est le champ de taches. */
  const isMossC = (p) => Math.abs(p[0] - 0x6b) < 3 && Math.abs(p[1] - 0x73) < 3 && Math.abs(p[2] - 0x55) < 3;
  const dev = new Float32Array(A * A * 3), speckMap = new Map();
  for (let q = 0; q < A * A; q++) {
    const si = owner[q]; if (si < 0 || ring[q]) continue;
    const ax = q % A, ay = (q / A) | 0, p = apx(ax, ay), m = info[si].mean;
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => { const qq = wrapA(ay + dy) * A + wrapA(ax + dx); return owner[qq] === si && !ring[qq] ? apx(ax + dx, ay + dy) : null; }).filter(Boolean);
    const lp = lum(p), iso = nb.length >= 3 && nb.every((c) => Math.abs(lum(c) - lp) > 6);
    let src = p;
    if (isMossC(p)) { dev[q * 3] = dev[q * 3 + 1] = dev[q * 3 + 2] = 0; continue; }   // la mousse n'est pas une marbrure
    if (iso) {
      const a = nb.reduce((t, c) => [t[0] + c[0], t[1] + c[1], t[2] + c[2]], [0, 0, 0]).map((v) => v / nb.length);
      speckMap.set(q, { x: (ax + 0.3 + r() * 0.4) * K, y: (ay + 0.3 + r() * 0.4) * K, light: lp > lum(a), amt: Math.abs(lp - lum(a)) / Math.max(1, lum(a)) });
      src = a;
    }
    dev[q * 3] = src[0] - m[0]; dev[q * 3 + 1] = src[1] - m[1]; dev[q * 3 + 2] = src[2] - m[2];
  }

  // ── 3. La matière ───────────────────────────────────────────────────────────
  const vs = variant * 0x9e37;
  const g1 = makeNoise(N, 5, 0x1111 ^ vs), g2 = makeNoise(N, 12, 0x2222 ^ vs), g3 = makeNoise(N, 42, 0x3333 ^ vs);
  const brush = makeNoise(N, 7, 0x9999 ^ vs), polishN = makeNoise(N, 30, 0xaaaa ^ vs), grimeN = makeNoise(N, 16, 0xbbbb ^ vs);
  const mortarN = makeNoise(N, 4, 0x4444), sandN = makeNoise(N, 1.8, 0xcccc), mossN = makeNoise(N, 5, 0x5555);
  const patchN = makeNoise(N, 7, 0x6666), wearN = makeNoise(N, 9, 0x7777), inclN = makeNoise(N, 2.5, 0x8888);
  const out = new Float32Array(N * N * 3);
  const MORTAR = [0x4c, 0x4a, 0x46], SAND = [0x7a, 0x76, 0x6c], MOSS = [0x5f, 0x6b, 0x47], MOSS_HI = [0x86, 0x91, 0x5e];
  const isMoss = (p) => Math.abs(p[0] - 0x6b) < 3 && Math.abs(p[1] - 0x73) < 3 && Math.abs(p[2] - 0x55) < 3;
  const isCrack = (p) => p[0] === 0xa3 && p[1] === 0xa1 && p[2] === 0x9a;
  const LX = -Math.SQRT1_2, LY = -Math.SQRT1_2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (x === 0 && (y & 7) === 0) yield;   // une tranche toutes les huit rangées (≈ 6 ms)
    const k = y * N + x, si = id[k], o = k * 3;
    const axi = Math.floor(x / K), ayi = Math.floor(y / K), ap = apx(axi, ayi);
    /* La MOUSSE de l'art (des tirets de 2 à 4 px, au pied des rangées — parfois en travers d'une
       pierre, comme sur l'art) : des touffes au contour organique, brins clairs et cœur sombre. */
    const mossHere = isMoss(ap) || (isMoss(apx(axi, ayi - 1)) && (y % K) < 5) || (isMoss(apx(axi, ayi + 1)) && (y % K) > K - 5);
    let lichen = 0;
    if (mossHere) {
      const mm = mossN(x, y) + 0.35 * mossN(x * 2.3 + 17, y * 2.3);
      // Au milieu d'une dalle, pas de touffe (la mousse pousse dans les joints) : un lichen, plus loin.
      if (si >= 0 && dist[k] > 5) lichen = -1;   // décidé plus bas, contour organique
      else if (mm > -0.15) {
        const t = mossN(x * 3.1 + 5, y * 3.1 + 9);
        const c = t > 0.3 ? MOSS_HI : MOSS, vv = (mm < 0 ? 0.85 : 1) * (0.92 + t * 0.12);
        out[o] = c[0] * vv; out[o + 1] = c[1] * vv; out[o + 2] = c[2] * vv;
        continue;
      }
    }
    if (si < 0) {
      /* Le joint : mortier sombre, du sable plus clair en grains, plus sombre au pied de la
         pierre du nord-ouest (elle lui fait de l'ombre) ; la mousse de l'art en touffes à pointes claires. */
      let v = 1 + mortarN(x, y) * 0.1;
      let c = MORTAR;
      const sg = sandN(x, y);
      if (sg > 0.35) { c = SAND; v = 0.9 + (sg - 0.35) * 0.4; }
      const xl = wrapN(x - 3), yu = wrapN(y - 3);
      if (id[y * N + xl] >= 0 || id[yu * N + x] >= 0) v *= 0.82;
      out[o] = c[0] * v; out[o + 1] = c[1] * v; out[o + 2] = c[2] * v;
      continue;
    }
    const s = info[si], d = dist[k];
    // La tache de l'art sous ce pixel : bords découpés par le bruit, adoucis d'un tiers (une touche, pas un tampon).
    const sample = (jx, jy) => { const q = wrapA(jy) * A + wrapA(jx); return owner[q] === si && !ring[q] ? q : -1; };
    const qA = sample(Math.floor((x + patchN(x, y) * 5) / K), Math.floor((y + patchN(y + 311, x) * 5) / K));
    const qB = sample(axi, ayi);
    let cr = s.mean[0], cg = s.mean[1], cb = s.mean[2];
    const q0 = qA >= 0 ? qA : qB;
    if (q0 >= 0) {
      let dr = dev[q0 * 3], dg = dev[q0 * 3 + 1], db = dev[q0 * 3 + 2];
      if (qB >= 0 && qB !== q0) { dr = dr * 0.7 + dev[qB * 3] * 0.3; dg = dg * 0.7 + dev[qB * 3 + 1] * 0.3; db = db * 0.7 + dev[qB * 3 + 2] * 0.3; }
      cr += dr; cg += dg; cb += db;
    }
    // Le grain, et la touche orientée de la pierre (un bruit étiré dans son sens).
    const u = x * s.ca + y * s.sa, w2 = -x * s.sa + y * s.ca;
    let v = 1 + g1(x, y) * 0.03 + g2(x, y) * 0.028 + g3(x, y) * 0.03 + brush(u * 0.35, w2 * 1.6) * 0.022;
    // Le poli du passage : le cœur des grandes pierres, un peu plus clair, par plaques.
    const depthN = d / Math.max(8, Math.min(s.hx, s.hy));
    if (s.hx > 40 && s.hy > 40) v += Math.min(1, depthN * 1.4) * Math.max(0, polishN(x, y)) * 0.06;
    // La crasse au bord : une bande plus terne le long du joint, plus marquée au sud-est.
    if (d > 3 && d < 14) v -= (0.025 + 0.02 * Math.max(0, grimeN(x, y))) * (1 - Math.abs(d - 7) / 7);
    // Le liseré de l'ancien dessin, gardé (voir l'en-tête) : une arête claire au nord-ouest, sombre au sud-est.
    if (d < BEVEL) {
      const xl = wrapN(x - 1), xr = wrapN(x + 1), yu = wrapN(y - 1), yd = wrapN(y + 1);
      const dl = id[y * N + xl] === si ? dist[y * N + xl] : 0, dr = id[y * N + xr] === si ? dist[y * N + xr] : 0;
      const du = id[yu * N + x] === si ? dist[yu * N + x] : 0, dd = id[yd * N + x] === si ? dist[yd * N + x] : 0;
      let nx = -(dr - dl), ny = -(dd - du);
      const ln = Math.hypot(nx, ny) || 1; nx /= ln; ny /= ln;
      const wv = (d < 13 ? 1 : Math.max(0, 1 - (d - 13) / (BEVEL - 13))) * (0.8 + 0.2 * (0.5 + 0.5 * wearN(x, y)));
      const lit = nx * LX + ny * LY;
      v += (lit > 0.35 ? 0.17 : lit < -0.35 ? -0.19 : lit * 0.4) * wv;
      if (lit > 0.35 && d > 2.5 && d < 5) v += 0.05;     // le fil de l'arête, qui accroche la lumière
      if (d < 2.5) v -= 0.1 * (1 - d / 2.5);           // le cerne : le bord plonge dans le joint
    }
    // Les piqûres de l'art à leur place : une inclusion claire, ou un CREUX (sombre au nord-ouest, éclairé au sud-est).
    const spk = speckMap.get(ayi * A + axi);
    if (spk) {
      const dx = x + 0.5 - spk.x, dy = y + 0.5 - spk.y, rr = Math.hypot(dx, dy) + inclN(x, y) * 1.8;
      if (spk.light) { if (rr < 6) v += Math.max(0.12, Math.min(0.2, spk.amt * 1.1)) * (rr < 4.6 ? 1 : (6 - rr) / 1.4); }
      else if (rr < 6.2) { const side = (dx * -LX + dy * -LY) / Math.max(1, Math.hypot(dx, dy)); v += rr < 4 ? -0.2 - side * 0.05 : side * 0.09 * (6.2 - rr) / 2.2; }
    }
    // Des creux neufs, plus petits, même éclairage.
    const pit = pitAt(x, y, s.seed);
    if (pit) v += pit.shell ? 0.11 : pit.inner ? -0.17 : pit.lit * 0.08;
    if (s.vein) { const q = makeVein(s.seed)(x, y); if (q < 1.7) v -= 0.05 * (1 - q / 1.7); }
    if (isCrack(ap) && d > 2) {
      // La fêlure de l'art (une colonne de 1 px) : un trait fin et brisé, bordé d'un fil clair au sud-est.
      const fx = (x % K) - K / 2 + mortarN(x, y * 0.5) * 3;
      if (Math.abs(fx) < 1.1) v -= 0.22; else if (fx > 1.1 && fx < 2.4) v += 0.05;
    }
    if (si >= 0 && dist[k] > 5 && (lichen === -1 || isMoss(apx(axi - 1, ayi)) || isMoss(apx(axi + 1, ayi)) || isMoss(apx(axi, ayi - 1)) || isMoss(apx(axi, ayi + 1)))) {
      // Un lichen : une tache ronde et grenue autour du tiret de l'art (sa distance au pixel de mousse le plus proche).
      let dm = 99;
      for (let jj = -1; jj <= 1; jj++) for (let ii = -1; ii <= 1; ii++) if (isMoss(apx(axi + ii, ayi + jj))) {
        const ex = Math.max((axi + ii) * K - x - 0.5, 0, x + 0.5 - (axi + ii + 1) * K), ey = Math.max((ayi + jj) * K - y - 0.5, 0, y + 0.5 - (ayi + jj + 1) * K);
        dm = Math.min(dm, Math.hypot(ex, ey));
      }
      const m2 = 0.55 + 0.45 * mossN(x * 1.4, y * 1.4) - dm / 7;
      lichen = m2 > 0 ? Math.min(1, m2 * 1.6) * (0.75 + 0.25 * sandN(x, y)) : 0;
    } else if (lichen === -1) lichen = 0;
    if (lichen > 0) { const L2 = 0.3 * lichen; cr = cr * (1 - L2) + 0x8a * L2; cg = cg * (1 - L2) + 0x92 * L2; cb = cb * (1 - L2) + 0x6c * L2; }
    out[o] = cr * v; out[o + 1] = cg * v; out[o + 2] = cb * v;
  }
  return { N, out };
}
/* Le maître d'un seul tenant (le banc, le harnais) : la même fabrication, sans pause. */
export function buildMaster(art, stones) {
  const g = buildMasterGen(art, stones);
  let r = g.next();
  while (!r.done) r = g.next();
  return r.value;
}
/* Des creux neufs, plus petits que ceux de l'art : un par cellule de 22 px maître au plus (une
   sur trois), rayon 1,8 à 3,3 px — un point d'un pixel d'écran au cran 3, rien au cran 1. Un creux
   éclairé du nord-ouest : fond sombre, paroi sud-est claire (`lit` > 0). */
function pitAt(x, y, seed) {
  const G = 30, gx = Math.floor(x / G), gy = Math.floor(y / G);
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = gx + i, cy = gy + j;
    const h = Math.imul((cx * 73856093) ^ (cy * 19349663) ^ seed, 0x5bd1e995) >>> 0;
    if (h % 5 > 1) continue;                     // deux cellules sur cinq
    const px = cx * G + ((h >>> 4) & 15) * G / 16, py = cy * G + ((h >>> 8) & 15) * G / 16, r = 2.6 + ((h >>> 12) & 7) * 0.45;
    const dx = x + 0.5 - px, dy = y + 0.5 - py, rr = Math.hypot(dx, dy) * (1 + 0.25 * Math.sin(Math.atan2(dy, dx) * 3 + (h & 7)));
    // Un sur quatre est un ÉCLAT DE COQUILLE (clair, sans relief) : le calcaire en est semé.
    if (((h >>> 16) & 3) === 0) return rr < r * 0.9 ? { shell: true } : null;
    if (rr < r) return { inner: true };
    if (rr < r + 1.6) return { inner: false, lit: (dx + dy) / Math.SQRT2 / Math.max(0.5, rr) };
  }
  return null;
}
/* Une veine : une sinusoïde bruitée qui traverse la pierre, rendue en distance. */
const veinCache = new Map();
function makeVein(seed) {
  let f = veinCache.get(seed);
  if (f) return f;
  const r = rng(seed), ang = r() * Math.PI, ox = r() * 1024, oy = r() * 1024, amp = 6 + r() * 10, fr = 0.02 + r() * 0.03;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  f = (x, y) => {
    const u = (x - ox) * ca + (y - oy) * sa, w = -(x - ox) * sa + (y - oy) * ca;
    return Math.abs(w - Math.sin(u * fr) * amp - Math.sin(u * fr * 2.7 + 1.3) * amp * 0.35);
  };
  veinCache.set(seed, f);
  return f;
}

/* Lanczos-3, périodique (le tore), séparable : N → n. */
export function lanczosPeriodic(src, N, n) {
  const a = 3, scale = N / n, support = a * scale;
  const L = (t) => { if (t === 0) return 1; if (Math.abs(t) >= a) return 0; const p = Math.PI * t; return a * Math.sin(p) * Math.sin(p / a) / (p * p); };
  const taps = [];
  for (let i = 0; i < n; i++) {
    const c = (i + 0.5) * scale - 0.5, j0 = Math.ceil(c - support), j1 = Math.floor(c + support);
    const idx = [], wts = []; let sum = 0;
    for (let j = j0; j <= j1; j++) { const w = L((j - c) / scale); if (!w) continue; idx.push(((j % N) + N) % N); wts.push(w); sum += w; }
    taps.push({ idx, wts: wts.map((w) => w / sum) });
  }
  const tmp = new Float32Array(n * N * 3);
  for (let y = 0; y < N; y++) for (let i = 0; i < n; i++) {
    const { idx, wts } = taps[i]; let r = 0, g = 0, b = 0;
    for (let q = 0; q < idx.length; q++) { const o = (y * N + idx[q]) * 3, w = wts[q]; r += src[o] * w; g += src[o + 1] * w; b += src[o + 2] * w; }
    const o2 = (y * n + i) * 3; tmp[o2] = r; tmp[o2 + 1] = g; tmp[o2 + 2] = b;
  }
  const dst = new Uint8ClampedArray(n * n * 4);
  for (let j = 0; j < n; j++) {
    const { idx, wts } = taps[j];
    for (let x = 0; x < n; x++) {
      let r = 0, g = 0, b = 0;
      for (let q = 0; q < idx.length; q++) { const o = (idx[q] * n + x) * 3, w = wts[q]; r += tmp[o] * w; g += tmp[o + 1] * w; b += tmp[o + 2] * w; }
      const o2 = (j * n + x) * 4; dst[o2] = r; dst[o2 + 1] = g; dst[o2 + 2] = b; dst[o2 + 3] = 255;
    }
  }
  /* Un renforcement léger APRÈS la réduction (masque flou d'un pixel, 35 %, sur le tore) : les
     images des maisons sont des peintures à arêtes franches, réduites ; le maître procédural est
     plus doux qu'une peinture, et ce dernier geste lui rend le « pixel qui accroche ». */
  const src2 = dst.slice(), K1 = 0.35;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const o = (y * n + x) * 4, yu = ((y - 1 + n) % n) * n, yd = ((y + 1) % n) * n, xl = (x - 1 + n) % n, xr = (x + 1) % n;
    for (let c = 0; c < 3; c++) {
      const blur = (src2[(yu + x) * 4 + c] + src2[(yd + x) * 4 + c] + src2[(y * n + xl) * 4 + c] + src2[(y * n + xr) * 4 + c] + src2[o + c] * 4) / 8;
      dst[o + c] = src2[o + c] + (src2[o + c] - blur) * K1 * 2;
    }
  }
  return dst;
}

/* ── LA PIERRE DE BORD (le liseré de 3 px d'art qui ceint la place et les parvis) ──────────────
   Sur l'ancien dessin, un aplat `#cfcabb` de 3 px (`drawTownFlagTile`) ; à côté des dalles haute
   résolution, il devenait la seule chose plate de la place. Même matière, même fabrication : une
   tuile d'art SYNTHÉTIQUE de 16 assises de bordures (3 px de haut, 7 à 15 de long, joint d'1 px),
   rendue au maître comme les dalles. Une bande de case prend une assise tirée par hachage (toutes ne
   montrent pas le même rythme de joints). La version verticale est la transposée (sa lumière reste au
   nord-ouest : le biseau se calcule au maître). */
const BORDER_TONES = ["#cfcabb", "#d4cfc0", "#c9c4b5", "#cdc8b9", "#d2cdbe", "#c6c1b2"];
export function makeBorderArt(vertical) {
  const A = 64, c = document.createElement("canvas"); c.width = A; c.height = A;
  const g = c.getContext("2d"), r = rng(vertical ? 0xb0d2 : 0xb0d1), stones = [];
  g.fillStyle = "#5c5a56"; g.fillRect(0, 0, A, A);
  for (let course = 0; course < 16; course++) {
    let x = (r() * A) | 0, left = A;
    while (left > 0) {
      let len = Math.min(left, 8 + ((r() * 8) | 0));
      if (left - len < 8) len = left;
      const st = vertical ? { x: course * 4, y: x, w: 3, h: len - 1 } : { x, y: course * 4, w: len - 1, h: 3 };
      g.fillStyle = BORDER_TONES[(r() * BORDER_TONES.length) | 0];
      for (let q = 0; q < (vertical ? st.h : st.w); q++) {
        const u = (x + q) % A;
        if (vertical) g.fillRect(st.x, u, 3, 1); else g.fillRect(u, st.y, 1, 3);
      }
      stones.push(st);
      x = (x + len) % A; left -= len;
    }
  }
  c.stones = stones;
  return c;
}

/* Le cache, par tuile d'art (un seul dallage civique dans le jeu). ⚠️ LA FABRICATION SE FAIT PAR
   TRANCHES (≈ 6 ms, `setTimeout`) : d'un bloc elle coûtait ~0,7 s (~2 s avec les bordures), un
   à-coup qu'on aurait senti en marchant. Elle part dès le chargement (`civicHDPrewarm`, appelé quand
   les sprites sont prêts) ; tant qu'un cran n'est pas fait, la case garde l'ancienne tuile — on
   n'arrive jamais sur la place avant qu'elle soit prête, sauf à s'y téléporter dans la seconde. */
const cache = new WeakMap();
export function civicHDPrewarm(art) {
  if (typeof document === "undefined" || typeof setTimeout === "undefined" || !art || !art.stones || !art.getContext) return;
  if (cache.has(art)) return;
  const e = { z: new Map(), ms: 0, done: false };
  cache.set(art, e);
  // Dans cet ordre : la tuile d'abord (le repli de tout le reste), les bordures, puis les deux variantes.
  const jobs = [{ key: "tile0-", art, v: 0 }, { key: "h", art: makeBorderArt(false), v: 0 }, { key: "v", art: makeBorderArt(true), v: 0 }, { key: "tile1-", art, v: 1 }, { key: "tile2-", art, v: 2 }];
  let ji = 0, gen = null, master = null, zi = 1;
  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const step = () => {
    const t0 = now();
    try {
      const job = jobs[ji];
      if (!gen) gen = buildMasterGen(job.art, job.art.stones, job.v);
      if (!master) {
        while (now() - t0 < 6) { const r = gen.next(); if (r.done) { master = r.value; break; } }
      } else {
        const n = job.art.width * zi, px = lanczosPeriodic(master.out, master.N, n);
        const c = document.createElement("canvas"); c.width = n; c.height = n;
        c.getContext("2d").putImageData(new ImageData(px, n, n), 0, 0);
        e.z.set(job.key + zi, c);
        if (++zi > 5) { ji++; gen = null; master = null; zi = 1; }   // le maître (12 Mo de flottants) se jette
      }
    } catch (err) { e.done = true; e.err = String(err); return; }
    e.ms += now() - t0;
    if (ji >= jobs.length) { e.done = true; return; }
    setTimeout(step, 0);
  };
  setTimeout(step, 0);
}
/* ⚠️ NE LANCE JAMAIS LA FABRICATION : seul le jeu la lance (`civicHDPrewarm`, au chargement des sprites).
   Un banc (faux canevas, `lib-canvas.mjs`) qui dessine une case civique doit retomber sur l'ancienne
   tuile SANS rien lire d'autre — le faux contexte lève une exception sur toute méthode qu'il ne connaît
   pas (`getTransform` : `render-rues`, `render-pluie` et `render-escaliers` ont planté là, audit 2026-10). */
export function civicHDAtlas(art, z, key = "tile0-") {
  const e = art && cache.get(art);
  return (e && e.z.get(key + z)) || null;
}
const hdReady = (art) => civicHD.on && !!art && cache.has(art);
export function civicHDCost(art) { const e = art && cache.get(art); return e ? { ms: Math.round(e.ms), atlases: [...e.z.keys()], done: e.done, err: e.err } : null; }

/* Une image de l'atlas posée sur un rectangle MONDE : au cran entier, 1 px d'image = 1 px d'écran
   (calé sur le pixel d'écran) ; pendant un fondu, mise à l'échelle (transitoire). */
function blitWorld(ctx, M, atlas, sx, sy, sw, sh, wx, wy, ww, wh, zi) {
  const exact = Math.abs(M.a - zi) < 1e-6 && Math.abs(M.d - zi) < 1e-6;
  ctx.save();
  if (exact) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(atlas, sx, sy, sw, sh, Math.round(M.a * wx + M.e), Math.round(M.d * wy + M.f), sw, sh);
  } else {
    ctx.imageSmoothingEnabled = !exact;   // transitoire seulement (fondu de zoom)
    ctx.drawImage(atlas, sx, sy, sw, sh, wx, wy, ww, wh);
  }
  ctx.restore();
}

/* La pose d'une case. Rend `false` si rien n'est posé (l'appelant dessine alors l'ancienne tuile). */
export function drawCivicHDTile(ctx, art, x, y, px, py, T) {
  if (!hdReady(art)) return false;
  const M = ctx.getTransform();
  const zi = Math.max(1, Math.min(5, Math.round(M.a)));
  const sup = art.width / T, cs = T * zi;
  // La variante du bloc de 4 × 4 cases (une période de la tuile) ; la variante 0 tant que les autres se fabriquent.
  const vb = ((((Math.floor(x / sup) * 73856093) ^ (Math.floor(y / sup) * 19349663)) >>> 0) % 3);
  const atlas = civicHDAtlas(art, zi, "tile" + vb + "-") || civicHDAtlas(art, zi, "tile0-");
  if (!atlas) return false;
  blitWorld(ctx, M, atlas, (x % sup) * cs, (y % sup) * cs, cs, cs, px, py, T, T, zi);
  return true;
}
/* La pierre de bord d'une case, sur les côtés demandés (`sides` : n, s, w, e = vrai si le voisin
   n'est pas du dallage), largeur `bw` px d'art. Rend `false` si les bandes ne sont pas prêtes. */
export function drawCivicHDBorder(ctx, art, x, y, px, py, T, sides, bw) {
  if (!hdReady(art)) return false;
  const M = ctx.getTransform();
  const zi = Math.max(1, Math.min(5, Math.round(M.a)));
  const H = civicHDAtlas(art, zi, "h"), V = civicHDAtlas(art, zi, "v");
  if (!H || !V) return false;
  const cs = T * zi, b = bw * zi, sup = 64 / T;
  const course = (a, c) => (((a * 2654435761) ^ (c * 40503)) >>> 0) % 16;
  if (sides.n) blitWorld(ctx, M, H, (x % sup) * cs, course(x >> 2, y * 2) * 4 * zi, cs, b, px, py, T, bw, zi);
  if (sides.s) blitWorld(ctx, M, H, (x % sup) * cs, course(x >> 2, y * 2 + 1) * 4 * zi, cs, b, px, py + T - bw, T, bw, zi);
  if (sides.w) blitWorld(ctx, M, V, course(y >> 2, x * 2) * 4 * zi, (y % sup) * cs, b, cs, px, py, bw, T, zi);
  if (sides.e) blitWorld(ctx, M, V, course(y >> 2, x * 2 + 1) * 4 * zi, (y % sup) * cs, b, cs, px + T - bw, py, bw, T, zi);
  return true;
}
