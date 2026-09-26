/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 2026-09-26 — PHASE 5 DE LA FEUILLE DE ROUTE GRAPHIQUE : LA FAUNE DE
   ║ VALLEY TOWN (le comportement ; les dessins sont dans `fauneArt.js`).
   ╚══════════════════════════════════════════════════════════════════════════
   Colverts et canetons, carpes de l'étang, poissons qui sautent au port,
   goélands et mouettes rieuses, trois chats, papillons, lucioles.

   LES DÉCISIONS DE GUILLAUME (2026-09-26), qui gouvernent tout ce fichier :
   1. ⚠️⚠️ PARTAGÉES, MAIS SANS UN MESSAGE. Chaque bête suit une ROUTINE qui
      est une pure fonction de l'heure partagée (`Date.now()`, `dayStartAt`)
      et de la carte : la même cane traverse l'étang chez les deux joueurs, le
      même chat dort sur le même muret — « regarde le chat ! » doit marcher à
      deux. Par-dessus, chaque client calcule une RÉACTION aux joueurs (leurs
      positions circulent déjà) qui se résorbe doucement vers la routine
      (`faunaReact*`). Zéro message (§3 de CLAUDE.md). Les pigeons restent
      tirés localement (433, décision inchangée).
   2. Qui vit où : l'étang du parc (colverts, carpes visibles sous l'eau
      claire), le port (goélands, mouettes rieuses, poissons qui sautent), les
      fleurs (papillons, le jour), le marché, l'église et le port (trois chats),
      la nuit (lucioles). Les papillons PETITS ET DÉTAILLÉS, leur vol calculé
      (vitesse et allure : voir § 6).
   3. Des gestes GRATUITS, sans récompense et sans nouveau bouton : les miettes
      d'un banc attirent aussi canards et carpes, un chat vient se frotter à un
      joueur immobile, les goélands rappliquent quand quelqu'un pêche au port et
      tournent au-dessus de l'étal de poisson les jours de marché. (Le gameplay
      — bocal de lucioles, chat adopté — est gardé en réserve pour plus tard.)
   4. Les saisons MODULENT la présence (une saison = une semaine réelle) :
      papillons du printemps à l'automne, lucioles printemps-été, canetons au
      printemps, jeunes l'été ; les jours d'orage les chats s'abritent et les
      papillons disparaissent.
   6. Les lucioles ÉCLAIRENT (vraie lumière, au plus faible), et leur halo
      CLIGNOTE — un éclair bref, pas une lampe continue (voir § 7).

   ⚠️⚠️ LA RÈGLE DE FOND : AUCUNE BÊTE NE SE TÉLÉPORTE (Guillaume, 2026-09-03,
   sur l'étoile timide : « un changement de position doit être animé »). Les
   routines sont bâties en CRÉNEAUX dont chaque cible est tirée
   INDÉPENDAMMENT (`hash(créneau)`), et la bête VOYAGE de la cible du créneau
   précédent à celle du créneau courant — jamais de chaîne à rejouer depuis
   l'origine des temps, jamais de saut. `tools/verify-faune.mjs` rejoue une
   journée entière image par image et borne le déplacement de chaque bête.
   ⚠️ LES HEURES : la journée de jeu se lit sur `dayStartAt` (partagé), et un
   créneau commencé AVANT le début de la journée courante tombe « avant 6h »,
   c'est-à-dire la nuit — ce qui est juste : on vient de dormir.

   ⚠️ CE FICHIER EST PUR (aucun React, aucun dessin, aucun `Math.random` dans
   les routines). Les réactions reçoivent leur hasard en argument. Il ne vit
   PAS dans la closure de la boucle de rendu (§4 de CLAUDE.md : une fonction
   qui y vit n'existe pour aucun banc).
   ══════════════════════════════════════════════════════════════════════════ */
import * as C from "./fermeConstants.mjs";
import * as E from "./fermeEngine.mjs";

/* ── 0. HASARD DÉTERMINISTE ─────────────────────────────────────────────── */
export function fh(a, b, c) {
  let h = ((a | 0) * 374761393 + (b | 0) * 668265263 + (c | 0) * 2246822519 + 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
export const fr = (a, b, c) => fh(a, b, c) / 4294967296;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeIO = (u) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(u, 0, 1));

/* ── 1. L'ENVIRONNEMENT : l'heure, la saison, la météo ─────────────────────
   `seasonKey` vient d'`E.seasonOf()` (ou du forçage du menu dev, réservé à la
   faune). `stormy` : `E.isStormyDay(day)`. */
export function faunaEnv({ nowMs, dayStartAt, day, seasonKey, stormy }) {
  const ds = dayStartAt || (nowMs - C.DAY_REAL_MS / 2);
  return { nowMs, t: nowMs / 1000, dayStartAt: ds, day: day | 0, season: seasonKey || "spring", stormy: !!stormy, market: E.isMarketDay(day | 0) };
}
/* L'heure de jeu (minutes) à un instant réel quelconque. ⚠️ Non bornée vers
   le bas : un instant d'avant le début de la journée donne une heure < 6h00,
   donc la nuit (voir l'en-tête). */
export function tminAt(env, ms) {
  const tm = C.DAY_START_MIN + ((ms - env.dayStartAt) / C.DAY_REAL_MS) * (C.DAY_END_MIN - C.DAY_START_MIN);
  return Math.min(C.DAY_END_MIN, tm);
}
const inBand = (tm, a, b, ramp) => smooth(a - ramp, a, tm) * (1 - smooth(b, b + ramp, tm));
const SEASON_BFLY = { spring: 0.8, summer: 1, autumn: 0.35, winter: 0 };
const SEASON_FFLY = { spring: 0.45, summer: 1, autumn: 0, winter: 0 };
/* La densité des papillons (0..1) : ils volent au soleil, de 8h à 19h, et
   jamais un jour d'orage. */
export function butterflyDensity(env, tm) {
  if (env.stormy) return 0;
  return (SEASON_BFLY[env.season] || 0) * inBand(tm, 8 * 60, 19 * 60, 60);
}
/* Les lucioles : la nuit tombée (21h15) jusqu'à 1h30, printemps et été. */
export function fireflyDensity(env, tm) {
  if (env.stormy) return 0;
  return (SEASON_FFLY[env.season] || 0) * inBand(tm, 21 * 60 + 15, 25 * 60 + 30, 40);
}
export const duckAsleep = (tm) => tm >= 22 * 60 + 30 || tm < 6 * 60 + 30;
export const gullAsleep = (tm) => tm >= 23 * 60 || tm < 6 * 60;
export const catNight = (tm) => tm >= 21 * 60 || tm < 6 * 60 + 30;

/* ── 2. LA GÉOMÉTRIE DE L'EAU ET DES LIEUX (dérivée de la carte, en cache) ──
   ⚠️ RIEN N'EST ÉCRIT EN COORDONNÉES : l'étang se lit dans le parc, le port
   au pied du quai, les roselières sur leurs roseaux et leurs nénuphars, les
   territoires des chats sur les étals, les tombes et les bancs (la leçon de
   `townFlocks` : le jour où un lieu bouge, ses bêtes le suivent).
   `sd` : la distance SIGNÉE (en cases) du centre de chaque case à la rive —
   positive dans l'eau, négative à terre ; `wdist(x, y)` l'interpole. */
const FW_CACHE = { w: null, v: null };
export function faunaWorld(tw) {
  if (!tw) return null;
  if (FW_CACHE.w === tw && FW_CACHE.v) return FW_CACHE.v;
  const W = tw.w, H = tw.h, N = W * H;
  const wet = new Uint8Array(N);
  for (let i = 0; i < N; i++) wet[i] = tw.ground[i] === C.G_WATER ? 1 : 0;
  // Hors carte = de l'eau (le lac file vers le large, par le bas et la passe).
  const wetAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 1 : wet[y * W + x]);
  const sd = new Float32Array(N).fill(-3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, me = wet[i];
    const R = me ? 7 : 2;
    let best = R + 1;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;   // le bord de carte n'est pas une rive
      if (wet[yy * W + xx] === me) continue;
      const d = Math.hypot(dx, dy);
      if (d < best) best = d;
    }
    if (best > R) sd[i] = me ? R : -3;
    else sd[i] = me ? best - 0.5 : -(best - 0.5);
  }
  const sdAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 3 : sd[y * W + x]);
  const wdist = (x, y) => {
    const fx = x - 0.5, fy = y - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0;
    return (sdAt(x0, y0) * (1 - ax) + sdAt(x0 + 1, y0) * ax) * (1 - ay) + (sdAt(x0, y0 + 1) * (1 - ax) + sdAt(x0 + 1, y0 + 1) * ax) * ay;
  };
  // Les plans d'eau : composantes (4-voisinage).
  const comp = new Int32Array(N).fill(-1);
  const comps = [];
  for (let i = 0; i < N; i++) {
    if (!wet[i] || comp[i] >= 0) continue;
    const id = comps.length, cells = [];
    const st = [i]; comp[i] = id;
    while (st.length) {
      const j = st.pop(); cells.push(j);
      const x = j % W, y = (j / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const k = yy * W + xx;
        if (wet[k] && comp[k] < 0) { comp[k] = id; st.push(k); }
      }
    }
    comps.push(cells);
  }
  const inRect = (x, y, r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
  const centroid = (cells) => { let sx = 0, sy = 0; for (const j of cells) { sx += j % W + 0.5; sy += ((j / W) | 0) + 0.5; } return { x: sx / cells.length, y: sy / cells.length }; };
  // L'étang du parc : les composantes posées dans le parc, du nord au sud (le pont les sépare).
  const pond = comps.filter((cs) => cs.length >= 4 && inRect(cs[0] % W, (cs[0] / W) | 0, C.TOWN_PARK))
    .map((cs) => ({ cells: cs, c: centroid(cs) })).sort((a, b) => a.c.y - b.c.y);
  // Le lac : la composante qui touche le rectangle du lac.
  const lakeCells = comps.find((cs) => cs.some((j) => inRect(j % W, (j / W) | 0, C.TOWN_LAKE))) || [];
  /* Une ZONE d'eau : les cases d'une composante, sous une contrainte (un
     rectangle), assez loin de la rive (`margin`), et on garde le plus grand
     morceau d'un seul tenant (8-voisinage) — deux flaques qu'on ne pourrait
     relier qu'en passant à terre n'en font pas une. */
  const zone = (cells, rect, margin) => {
    const ok = new Set(cells.filter((j) => sd[j] >= margin && (!rect || inRect(j % W, (j / W) | 0, rect))));
    let bestSet = [];
    const seen = new Set();
    for (const j of ok) {
      if (seen.has(j)) continue;
      const part = [], st = [j]; seen.add(j);
      while (st.length) {
        const q = st.pop(); part.push(q);
        const x = q % W, y = (q / W) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const k = (y + dy) * W + (x + dx);
          if ((dx || dy) && ok.has(k) && !seen.has(k)) { seen.add(k); st.push(k); }
        }
      }
      if (part.length > bestSet.length) bestSet = part;
    }
    bestSet.sort((a, b) => a - b);   // ⚠️ ordre DÉTERMINISTE (§4 : on ne se fonde pas sur l'ordre d'un Set)
    return bestSet;
  };
  // Les roselières du lac : amas de roseaux et de nénuphars, là où vivent les colverts du lac.
  const lakeTop = C.TOWN_LAKE.y;
  const reedy = (tw.props || []).filter((p) => (p.kind === "reedsWater" || p.kind === "reedTuft" || p.kind === "lily") && p.y >= lakeTop - 2);
  const clusters = [];
  for (const p of reedy.slice().sort((a, b) => a.x - b.x || a.y - b.y)) {
    const cl = clusters.find((q) => Math.abs(q.x - p.x) < 9);
    if (cl) { cl.n++; cl.sx += p.x; cl.sy += p.y; cl.x = cl.sx / cl.n; cl.y = cl.sy / cl.n; }
    else clusters.push({ x: p.x, y: p.y, sx: p.x, sy: p.y, n: 1 });
  }
  clusters.sort((a, b) => b.n - a.n || a.x - b.x);
  const reedZones = clusters.slice(0, 2).map((q) => ({ x: Math.round(q.x) - 8, y: lakeTop - 3, w: 17, h: 12 }));

  const duckSites = [];
  if (pond[1]) duckSites.push({ key: "pondS", cells: zone(pond[1].cells, null, 0.7), family: true });
  if (pond[0]) duckSites.push({ key: "pondN", cells: zone(pond[0].cells, null, 0.7), family: false });
  reedZones.forEach((r, i) => duckSites.push({ key: "reeds" + i, cells: zone(lakeCells, r, 1.0), family: false, lake: true }));
  for (const s of duckSites) s.roost = roostCells(s.cells, sd, W, tw);

  /* LA BERGE DES COLVERTS (2026-09-26, Guillaume : « ils doivent pouvoir
     sortir et entrer dans l'étang librement »). Les cases de terre où un
     canard a le droit de marcher : praticables, à plat (altitude 0 : un quai
     ou un mur de soutènement ne se gravit pas en se dandinant), ni dallées ni
     pontées, sans décor posé, et à moins de 2,6 cases de l'eau. `duckOk` =
     l'eau ∪ cette berge ; `odist` est la distance au bord de cet ensemble
     (même construction que `sd`), c'est elle qui retient un canard à terre
     comme `wdist` le retient dans l'eau. */
  const navB = E.townNav(tw);
  const propB = new Set((tw.props || []).map((p) => p.y * W + p.x));
  const duckLand = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (wet[i] || sd[i] < -2.6) continue;
    const g = tw.ground[i];
    if (g === C.G_PATH_STONE || g === C.G_BRIDGE || tw.solid[i] || propB.has(i)) continue;
    if (tw.elev && tw.elev[i]) continue;
    if (!navB || !navB.walk[i]) continue;
    duckLand[i] = 1;
  }
  const okAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : wet[y * W + x] || duckLand[y * W + x]);
  const od = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!okAt(x, y)) { od[i] = -0.5; continue; }
    let best = 3;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (!okAt(x + dx, y + dy)) best = Math.min(best, Math.hypot(dx, dy));
    od[i] = best - 0.5;
  }
  const odAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -0.5 : od[y * W + x]);
  const odist = (x, y) => {
    const fx = x - 0.5, fy = y - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0;
    return (odAt(x0, y0) * (1 - ax) + odAt(x0 + 1, y0) * ax) * (1 - ay) + (odAt(x0, y0 + 1) * (1 - ax) + odAt(x0 + 1, y0 + 1) * ax) * ay;
  };
  /* Les places de berge d'un groupe : une case de berge assez loin de tout
     obstacle (`odist`), sa porte d'eau (la case de la zone la plus proche) et
     un trajet porte → place qui ne quitte jamais l'ensemble `duckOk`. */
  for (const s of duckSites) {
    s.bank = [];
    if (!s.cells.length) continue;
    const near = new Set();
    for (const j of s.cells) {
      const x = j % W, y = (j / W) | 0;
      for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H && duckLand[yy * W + xx]) near.add(yy * W + xx);
      }
    }
    for (const j of [...near].sort((a, b) => a - b)) {
      const L = { x: j % W + 0.5, y: ((j / W) | 0) + 0.5 };
      if (odist(L.x, L.y) < 0.9) continue;
      let e = -1, ed = 1e9;
      for (const c of s.cells) { const d = Math.hypot(c % W + 0.5 - L.x, ((c / W) | 0) + 0.5 - L.y); if (d < ed) { ed = d; e = c; } }
      if (ed > 4.5) continue;
      const Ep = { x: e % W + 0.5, y: ((e / W) | 0) + 0.5 };
      const n = Math.ceil(ed / 0.2);
      let clear = true;
      for (let k = 0; k <= n && clear; k++) { const u = k / n; if (odist(Ep.x + (L.x - Ep.x) * u, Ep.y + (L.y - Ep.y) * u) < 0.35) clear = false; }
      if (clear) s.bank.push({ x: L.x, y: L.y, land: true, ex: Ep.x, ey: Ep.y });
    }
  }
  const fishSites = pond.map((p, i) => ({ key: i ? "pondS" : "pondN", cells: zone(p.cells, null, 0.5) })).filter((s) => s.cells.length);

  /* LE PORT : le quai de pierre au bord du lac (les cases dallées dont la
     voisine du sud est de l'eau), le ponton, l'eau libre devant eux. */
  const quay = [], pier = [];
  const propAt = new Set((tw.props || []).map((p) => p.y * W + p.x));
  for (let y = lakeTop - 4; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (y + 1 < H && tw.ground[i] === C.G_PATH_STONE && wet[i + W] && !propAt.has(i) && !tw.solid[i]) quay.push({ x: x + 0.5, y: y + 0.82 });
    if (tw.ground[i] === C.G_BRIDGE && inRect(x, y, C.TOWN_PIER) && (x === C.TOWN_PIER.x || x === C.TOWN_PIER.x + C.TOWN_PIER.w - 1)) pier.push({ x: x + (x === C.TOWN_PIER.x ? 0.3 : 0.7), y: y + 0.6 });
  }
  let qx0 = Infinity, qx1 = -Infinity;
  for (const q of quay) { qx0 = Math.min(qx0, q.x); qx1 = Math.max(qx1, q.x); }
  const portRect = { x: Math.floor(qx0) - 4, y: lakeTop, w: Math.ceil(qx1 - qx0) + 12, h: 10 };
  const floats = quay.length ? zone(lakeCells, portRect, 1.3) : [];
  // Les centres de vol : au-dessus de l'eau du port, répartis sur sa longueur.
  const soar = [];
  for (let k = 0; k < 5 && floats.length; k++) {
    const j = floats[Math.floor(((k + 0.5) / 5) * floats.length)];
    soar.push({ x: j % W + 0.5, y: ((j / W) | 0) + 0.5 });
  }
  // L'étal de poisson du marché (les goélands y tournent les jours de marché).
  const fishStalls = (tw.props || []).filter((p) => p.kind === "stall" && C.TOWN_STALL_TRADES[p.v] && C.TOWN_STALL_TRADES[p.v].key === "fish");

  const nav = E.townNav(tw);
  const cats = CAT_DEFS.map((d, ci) => ({ ...d, idx: ci, spots: catSpots(tw, nav, d.home, fishStalls) })).filter((c) => c.spots.length >= 3);

  // Les papillons : une maison par massif fleuri, une sur trois.
  const FLOWER_PROPS = new Set(["lavender", "clump", "goldBush", "flowerTrough", "flowerCart", "roseBox", "planter", "potPink"]);
  const flowers = [];
  /* `g` : la fleur est dans un PARC ou un JARDIN (les deux rectangles du parc,
     ou un parterre `bloom`) — voir la densité des maisons ci-dessous. */
  const inPark = (x, y) => inRect(x, y, C.TOWN_PARK) || (C.TOWN_PARK_NORTH && inRect(x, y, C.TOWN_PARK_NORTH));
  for (const p of tw.props || []) if (FLOWER_PROPS.has(p.kind)) flowers.push({ x: p.x + 0.5, y: p.y + 0.55, h: p.kind === "flowerCart" || p.kind === "flowerTrough" ? 0.55 : 0.3, g: inPark(p.x, p.y) });
  if (tw.bloom) for (let i = 0; i < N; i++) if (tw.bloom[i] && fh(i, 71, 3) % 5 === 0) flowers.push({ x: i % W + 0.5, y: ((i / W) | 0) + 0.6, h: 0.2, g: true });
  flowers.sort((a, b) => a.y - b.y || a.x - b.x);
  /* ⚠️ 2026-09-26 (nuit), Guillaume après vingt minutes de jeu : « diviser par
     trois la population de papillons hors parcs et jardins, et par deux dans
     les parcs et jardins ». Une maison sur trois fleurs comme avant, puis on
     n'en garde qu'une sur deux au jardin, une sur trois ailleurs — par un
     tirage à part (graine 19), pour que les maisons gardées restent celles
     d'hier et ne se déplacent pas. */
  const bflyHomes = [];
  flowers.forEach((f, i) => {
    if (fh(Math.round(f.x * 2), Math.round(f.y * 2), 17) % 3 !== 0) return;
    if (fh(Math.round(f.x * 2), Math.round(f.y * 2), 19) % 6 >= (f.g ? 3 : 2)) return;
    bflyHomes.push({ id: i, x: f.x, y: f.y, g: f.g });
  });
  const flowerGrid = new Map();
  for (const f of flowers) { const k = ((f.y / 4) | 0) * 1000 + ((f.x / 4) | 0); (flowerGrid.get(k) || flowerGrid.set(k, []).get(k)).push(f); }

  // Les lucioles : l'étang, les roselières, la lisière du bois, le cimetière.
  const ffZones = [];
  /* ⚠️ 2026-09-26, Guillaume : « plus grand nombre dans la zone sauvage sud-est,
     un peu moins dans le parc ». Le parc passe de 34 à 22 ; le bois reçoit
     des ESSAIMS dans ses clairières, lus sur la carte (voir plus bas). */
  if (pond.length) ffZones.push({ key: "pond", x: C.TOWN_POND.cx + 0.5, y: C.TOWN_POND.cy + 0.5, rx: 6.5, ry: 5.5, n: 22, sync: true });
  reedZones.forEach((r, i) => ffZones.push({ key: "reeds" + i, x: r.x + r.w / 2, y: lakeTop - 1.5, rx: 7, ry: 3, n: 18 }));
  /* LE BOIS DU SUD-EST : l'emprise des deux bois (`TOWN_WOOD` et sa moitié
     nord). Une luciole vit au ras du sol, dans les CLAIRIÈRES et les lisières
     plus qu'au cœur des fourrés : on note chaque point d'une grille de 3 cases
     par l'ouverture de son voisinage (cases sans arbre, sans eau, sans mur),
     puis on garde les meilleures, espacées d'au moins 7 cases. La première
     est l'essaim « qui se synchronise » certaines nuits, comme l'étang. */
  {
    const WA = C.TOWN_WOOD_NORTH_AREA, WB = C.TOWN_WOOD;
    const x0 = Math.min(WA.x, WB.x), y0 = Math.min(WA.y, WB.y), x1 = Math.max(WA.x + WA.w, WB.x + WB.w), y1 = Math.max(WA.y + WA.h, WB.y + WB.h);
    // Les arbres de la ville sont des OBJETS de case (`tw.objects`), pas des props.
    const tree = tw.objects || new Uint8Array(N);
    const cand = [];
    for (let y = y0 + 1; y < y1 - 1; y += 3) for (let x = x0 + 1; x < x1 - 1; x += 3) {
      let open = 0, trees = 0, bad = 0;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) { bad++; continue; }
        const i = yy * W + xx;
        // Un tronc occupe plus d'une case solide : toute case solide du bois compte comme du bois.
        if (wet[i]) bad++;
        else if (tree[i] || tw.solid[i]) trees++;
        else open++;
      }
      // Il faut du bois autour (sinon ce n'est pas une clairière, c'est un pré) et de l'air au milieu.
      if (trees < 6 || bad > 12) continue;
      cand.push({ x: x + 0.5, y: y + 0.5, sc: open - bad * 2 + (fh(x, y, 83) % 5) });
    }
    cand.sort((a, b) => b.sc - a.sc || a.y - b.y || a.x - b.x);
    const picked = [];
    for (const c of cand) {
      if (picked.length >= 12) break;
      if (picked.some((q) => Math.hypot(q.x - c.x, q.y - c.y) < 7)) continue;
      picked.push(c);
    }
    picked.forEach((c, k) => ffZones.push({ key: "wood" + k, x: c.x, y: c.y, rx: 4.5, ry: 3.2, n: k < 4 ? 20 : 15, sync: k === 0 }));
  }
  const graves = (tw.props || []).filter((p) => p.kind === "grave");
  if (graves.length) {
    let gx = 0, gy = 0; for (const g of graves) { gx += g.x; gy += g.y; }
    ffZones.push({ key: "graves", x: gx / graves.length + 0.5, y: gy / graves.length + 0.5, rx: 5, ry: 4, n: 10 });
  }

  // Les sauts de poisson : au port et dans la passe, en eau profonde.
  const deep = zone(lakeCells, null, 2.2);

  const v = { W, H, wet, sd, wdist, odist, duckLand, comp, pond, duckSites, fishSites, quay, pier, floats, soar, portRect, fishStalls,
              cats, flowers, flowerGrid, bflyHomes, ffZones, deep, pathCache: new Map() };
  FW_CACHE.w = tw; FW_CACHE.v = v;
  return v;
}
/* Le dortoir d'un groupe de canards : les cases de sa zone les plus proches
   d'un roseau ou d'un nénuphar (ou, à défaut, de la rive) — un colvert dort
   à l'abri de la végétation, pas au milieu du plan d'eau. */
function roostCells(cells, sd, W, tw) {
  if (!cells.length) return cells;
  const reeds = (tw.props || []).filter((p) => p.kind === "reedsWater" || p.kind === "reedTuft" || p.kind === "lily");
  const score = (j) => {
    const x = j % W + 0.5, y = ((j / W) | 0) + 0.5;
    let d = sd[j] * 1.5;
    for (const r of reeds) d = Math.min(d, Math.hypot(r.x + 0.5 - x, r.y + 0.5 - y));
    return d;
  };
  return cells.slice().sort((a, b) => score(a) - score(b) || a - b).slice(0, Math.max(1, Math.ceil(cells.length / 4)));
}

/* ── 3. LE CRÉNEAU : l'outil commun de toutes les routines ─────────────────
   Au créneau k, la bête voyage de la cible k−1 à la cible k (chemin fourni),
   à sa vitesse, avec départ et arrivée amortis, puis se repose jusqu'à la fin
   du créneau. Les cibles sont tirées indépendamment : aucune chaîne. */
function pathLen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y); return L; }
function along(p, s) {
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i], l = Math.hypot(b.x - a.x, b.y - a.y);
    if (s <= l || i === p.length - 1) {
      const u = l > 1e-6 ? clamp(s / l, 0, 1) : 1;
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, hx: l > 1e-6 ? (b.x - a.x) / l : 0, hy: l > 1e-6 ? (b.y - a.y) / l : 0 };
    }
    s -= l;
  }
  const q = p[p.length - 1];
  return { x: q.x, y: q.y, hx: 0, hy: 0 };
}
function endHeading(p) {
  for (let i = p.length - 1; i > 0; i--) {
    const dx = p[i].x - p[i - 1].x, dy = p[i].y - p[i - 1].y, l = Math.hypot(dx, dy);
    if (l > 1e-6) return { hx: dx / l, hy: dy / l };
  }
  return { hx: 1, hy: 0 };
}
/* `ramp` (s, facultatif) : 2026-09-26 (nuit), Guillaume trouvait le chat et
   les colverts « saccadés ». Avec l'ancien profil (`easeIO` sur TOUT le
   trajet), une bête accélérait pendant la moitié du chemin puis freinait
   pendant l'autre : jamais d'allure, et une pointe à π/2 fois la croisière —
   le chat passait au TROT au milieu de chaque marche (pointe 1,96 > seuil de
   course 1,9) puis revenait au pas. Avec `ramp`, le profil est un TRAPÈZE :
   on démarre et on s'arrête en `ramp` secondes, entre les deux on garde
   l'allure. Sans `ramp` (les carpes), rien ne change. Le vrai `B.v`, s'il
   existe, remplace la vitesse de croisière pour ce créneau. */
export function slotMove(t, slotLen, targetOf, pathOf, speed, maxFrac, ramp) {
  const k = Math.floor(t / slotLen), u = t - k * slotLen;
  const A = targetOf(k - 1), B = targetOf(k);
  const path = pathOf(A, B);
  const L = pathLen(path);
  let v = B.v || speed;
  const r = ramp || 0;
  // Au trapèze, le trajet dure L/v + r ; on accélère si le créneau est trop court.
  if (L / v + r > slotLen * maxFrac) v = L / Math.max(0.5, slotLen * maxFrac - r);
  const trap = r > 0 && L > v * r;
  const Tt = L > 1e-3 ? (trap ? L / v + r : L / v) : 0;
  if (u < Tt) {
    let sDist, spd;
    if (trap) {
      if (u < r) { sDist = v * u * u / (2 * r); spd = v * u / r; }
      else if (u < Tt - r) { sDist = v * r / 2 + v * (u - r); spd = v; }
      else { const w = Tt - u; sDist = L - v * w * w / (2 * r); spd = v * w / r; }
    } else {
      sDist = L * easeIO(u / Tt);
      spd = (L / Tt) * (Math.PI / 2) * Math.sin(Math.PI * (u / Tt));
    }
    const q = along(path, sDist);
    // `dist` : le chemin fait depuis le départ — la foulée s'y lit (voir faunaCats).
    return { x: q.x, y: q.y, hx: q.hx, hy: q.hy, moving: true, spd, dist: sDist, k, restT: -1, restLen: slotLen - Tt, B, A };
  }
  const h = L > 1e-3 ? endHeading(path) : { hx: A.hx || 1, hy: 0 };
  return { x: B.x, y: B.y, hx: h.hx, hy: h.hy, moving: false, spd: 0, k, restT: u - Tt, restLen: slotLen - Tt, B, A };
}

/* ── 4. LES CHEMINS SUR L'EAU ──────────────────────────────────────────────
   Tout droit si le segment reste assez loin de la rive ; sinon un détour par
   les cases de la zone (A* sur 8 voisins), réduit à ses points de passage. */
function waterPath(fw, cells, A, B, margin) {
  const clear = (P, Q) => {
    const L = Math.hypot(Q.x - P.x, Q.y - P.y), n = Math.max(1, Math.ceil(L / 0.2));
    for (let i = 0; i <= n; i++) { const u = i / n; if (fw.wdist(P.x + (Q.x - P.x) * u, P.y + (Q.y - P.y) * u) < margin - 0.05) return false; }
    return true;
  };
  if (clear(A, B)) return [A, B];
  const W = fw.W, ca = Math.floor(A.y) * W + Math.floor(A.x), cb = Math.floor(B.y) * W + Math.floor(B.x);
  const key = "w" + ca + ":" + cb + ":" + margin;
  let mid = fw.pathCache.get(key);
  if (!mid) {
    const inZone = new Set(cells);
    const prev = new Map([[ca, -1]]);
    const q = [ca];
    for (let h = 0; h < q.length && !prev.has(cb); h++) {
      const c = q[h], x = c % W, y = (c / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const n = (y + dy) * W + (x + dx);
        if ((dx || dy) && inZone.has(n) && !prev.has(n)) { prev.set(n, c); q.push(n); }
      }
    }
    const raw = [];
    if (prev.has(cb)) for (let c = cb; c !== -1; c = prev.get(c)) raw.push({ x: c % W + 0.5, y: ((c / W) | 0) + 0.5 });
    raw.reverse();
    mid = raw.slice(1, -1);
    fw.pathCache.set(key, mid);
  }
  // Réduction : on ne garde un point que s'il faut vraiment tourner.
  const pts = [A, ...mid, B], out = [A];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !clear(pts[i], pts[j])) j--;
    out.push(pts[j]); i = j;
  }
  return out;
}
function cellPoint(cells, W, h, jitter) {
  const j = cells[h % cells.length];
  const r1 = ((h >>> 8) & 1023) / 1023 - 0.5, r2 = ((h >>> 18) & 1023) / 1023 - 0.5;
  return { x: j % W + 0.5 + r1 * jitter, y: ((j / W) | 0) + 0.5 + r2 * jitter };
}

/* ── 5. LES COLVERTS ───────────────────────────────────────────────────────
   Un groupe = une MENEUSE (la cane, ou le premier du groupe) qui suit les
   créneaux, et des SUIVEURS qui la suivent EN RETARD sur sa propre route
   (`lag` secondes) : la file indienne des canetons tombe de là sans être
   écrite. Au repos, les suiveurs s'égaillent autour d'elle — et se
   rassemblent AVANT qu'elle ne reparte (`gather`), sinon le rang se
   reformerait d'un bond.
   Vitesse de croisière : 0,55 case/s (≈ 0,6 m/s, le colvert qui nage sans
   se presser). Créneau : 17 s. La nuit, la cible est le dortoir et la pose
   est le sommeil. */
const DUCK_SLOT = 17, DUCK_SPEED = 0.55;
function duckMembers(site, season) {
  // La composition du groupe, par saison (voir l'en-tête : décision 4).
  if (site.family) {
    if (season === "spring") return [["hen"], ["drake", 1.2, 0.75], ["tiny", 0.55, 0.32], ["tiny", 0.95, 0.36], ["tiny", 1.35, 0.3], ["tiny", 1.75, 0.38], ["tiny", 2.15, 0.34]];
    if (season === "summer") return [["hen"], ["drakeEclipse", 1.4, 0.8], ["young", 0.8, 0.5], ["young", 1.5, 0.55], ["young", 2.2, 0.5]];
    return [["hen"], ["drake", 1.1, 0.7]];
  }
  const drake = season === "summer" ? "drakeEclipse" : "drake";
  if (site.lake) return [["hen"], [drake, 1.3, 0.8], [drake, 2.6, 0.9]];
  return [[drake], ["hen", 1.0, 0.7]];
}
/* ⚠️ « MOINS RÉGULIER » (2026-09-26, nuit, Guillaume en jeu) : les quatre
   groupes changeaient de cap ENSEMBLE, toutes les 17 s pile, à la même
   vitesse. Chaque groupe a désormais son créneau (15 à 19 s) et son décalage,
   chaque trajet sa vitesse (0,32 à 0,72 case/s), et la nage ondule un peu
   (voir `duckSway`). */
const duckSlotOf = (si) => DUCK_SLOT - 2 + ((si * 7) % 5);
const duckOffOf = (si) => si * 6.1;
function duckSway(fw, st, tt, seed, v) {
  if (!st.moving) return st;
  const e = clamp(st.spd / v, 0, 1);
  let ox = Math.sin(tt * 0.71 + seed) * 0.2 * e, oy = Math.sin(tt * 0.53 + seed * 1.7) * 0.13 * e;
  // Jamais contre la rive : l'ondulation s'éteint CONTINÛMENT à son approche (à terre, elle vaut zéro).
  const q = clamp((fw.wdist(st.x + ox, st.y + oy) - 0.55) / 0.3, 0, 1) * clamp((fw.wdist(st.x, st.y) - 0.55) / 0.3, 0, 1);
  return { ...st, x: st.x + ox * q, y: st.y + oy * q };
}
function duckLeader(fw, env, site, si, t0) {
  const W = fw.W, margin = 0.7;
  const seed = 101 + si * 17;
  const SL = duckSlotOf(si), t = t0 + duckOffOf(si);
  const targetOf = (k) => {
    const P = duckTarget(k);
    return { ...P, v: DUCK_SPEED * (0.58 + ((fh(seed, k, 71) >>> 5) % 100) / 100 * 0.72) };
  };
  const duckTarget = (k) => {
    const tm = tminAt(env, (k * SL - duckOffOf(si)) * 1000);
    const asleep = duckAsleep(tm) && site.roost.length;
    /* À TERRE, un créneau sur cinq environ, de jour et hors orage : la place
       est tirée sur la berge du groupe (voir faunaWorld). Tirage INDÉPENDANT
       par créneau, comme tout le reste — un canard peut enchaîner deux
       créneaux à terre, ou replonger aussitôt. */
    if (!asleep && !env.stormy && site.bank && site.bank.length && tm >= DUCK_LAND_FROM && tm < DUCK_LAND_TO && fh(seed, k, 61) % 100 < DUCK_LAND_PCT) {
      const b = site.bank[fh(seed, k, 63) % site.bank.length];
      const j = ((fh(seed, k, 67) >>> 4) % 100) / 100 - 0.5, j2 = ((fh(seed, k, 67) >>> 12) % 100) / 100 - 0.5;
      const P = { x: b.x + j * 0.5, y: b.y + j2 * 0.5, land: true, ex: b.ex, ey: b.ey };
      return fw.odist(P.x, P.y) >= 0.6 ? P : b;
    }
    const cells = asleep ? site.roost : site.cells;
    // La nuit, la place ne change qu'une fois toutes les onze minutes : on dort.
    const kk = asleep ? 100000 + Math.floor(k / 40) : k;
    const P = cellPoint(cells, W, fh(seed, kk, 5), 0.5);
    if (fw.wdist(P.x, P.y) < margin) { const j = cells[fh(seed, kk, 5) % cells.length]; return { x: j % W + 0.5, y: ((j / W) | 0) + 0.5 }; }
    return P;
  };
  /* Le trajet : par l'eau jusqu'à la « porte » de la place de berge, puis à
     pied, tout droit (le tracé porte → place a été vérifié à la construction).
     Deux places de berge voisines se rejoignent à pied sans repasser par l'eau. */
  const wp = (A, B) => waterPath(fw, site.cells, A, B, margin);
  const pathOf = (A, B) => {
    if (!A.land && !B.land) return wp(A, B);
    if (A.land && B.land && segOk(fw, A, B)) return [A, B];
    const pre = A.land ? [A] : [], post = B.land ? [B] : [];
    const a2 = A.land ? { x: A.ex, y: A.ey } : A, b2 = B.land ? { x: B.ex, y: B.ey } : B;
    return [...pre, ...wp(a2, b2), ...post];
  };
  const st = slotMove(t, SL, targetOf, pathOf, DUCK_SPEED, 0.6, 1.4);
  return duckSway(fw, st, t, seed, st.B.v || DUCK_SPEED);
}
function segOk(fw, A, B) {
  const L = Math.hypot(B.x - A.x, B.y - A.y), n = Math.max(1, Math.ceil(L / 0.2));
  for (let i = 0; i <= n; i++) { const u = i / n; if (fw.odist(A.x + (B.x - A.x) * u, A.y + (B.y - A.y) * u) < 0.35) return false; }
  return true;
}
/* Sortir de l'eau : un créneau sur cinq, de 7h à 20h. */
const DUCK_LAND_PCT = 20, DUCK_LAND_FROM = 7 * 60, DUCK_LAND_TO = 20 * 60;
/* Est-on à terre ? La flottaison se lit sur la distance à la rive : un canard
   dont le corps touche le fond de la berge (moins de 0,15 case d'eau) marche. */
export const duckOnLand = (fw, x, y) => fw.wdist(x, y) < 0.15;
/* Les poses à terre : brouter (le plus souvent), se tenir, se coucher dans
   l'herbe, et le coup d'œil. Par fenêtres de 4 s, comme sur l'eau. */
function duckLandRestPose(seed, t) {
  const w = Math.floor(t / 4), u = t - w * 4, h = fh(seed, w, 53) % 100;
  if (h < 45) return (Math.floor(u / 0.35) + (fh(seed, w, 57) & 1)) % 3 === 0 ? "graze2" : "graze";
  if (h < 70) return "stand";
  return "rest";
}
/* La démarche : les pattes alternent, avec un temps d'appui entre deux pas. */
function duckWalkPose(t, mi) { const ph = Math.floor(t * 6 + mi) & 3; return ph === 0 ? "walk" : ph === 2 ? "walk2" : "stand"; }
/* La pose d'un canard qui a CHANGÉ de milieu après sa réaction (poussé sur la
   berge ou rentré dans l'eau par un écart) : on ne garde jamais une pose de
   l'autre milieu. */
export function duckFixPose(d, t) {
  if (d.kind === "duck") {
    const landPose = d.pose === "stand" || d.pose === "walk" || d.pose === "walk2" || d.pose === "graze" || d.pose === "graze2" || d.pose === "rest";
    // Un canard qui se déplace à terre (routine ou écart de réaction) marche toujours.
    if (d.land && (d.moving || !landPose)) d.pose = d.moving ? duckWalkPose(t || 0, d.id.length) : "stand";
    else if (!d.land && landPose) d.pose = "swim";
  } else {
    const base = d.kind, walkP = d.pose.includes("W");
    if (d.land && !walkP) d.pose = base + (Math.floor((t || 0) * 5) & 1 ? "W2" : "W");
    else if (!d.land && walkP) d.pose = base;
  }
}
/* L'activité d'un canard au repos, par tranches de 3 s : nager sur place
   (la plupart du temps), barboter, se lisser les plumes, regarder. */
function duckRestPose(seed, t, asleep) {
  /* Les ENCHAÎNEMENTS (second jet, retour de Guillaume : « pas de mouvements
     assez détaillés et réalistes ») : une activité par fenêtre de 4 s, et DANS
     la fenêtre une suite de poses — jamais une image figée plusieurs secondes.
     Rend { pose, ring } : `ring` (0..1) fait naître un rond dans l'eau quand un
     geste la touche (la tête qui plonge, le barbotage, le battement d'ailes). */
  if (asleep) return { pose: (Math.floor(t / 1.7 + (seed % 7)) & 1) ? "sleep" : "sleep2", ring: -1 };
  const W = 4, w = Math.floor(t / W), u = t - w * W;
  const h = fh(seed, w, 29) % 100;
  if (h < 40) {
    // Sur place : un coup de patte de temps en temps, et la tête qui regarde ailleurs.
    const sub = Math.floor(t / 0.9), hs = fh(seed, sub, 31) % 100;
    return { pose: hs < 18 ? "look" : hs < 55 ? ((sub & 1) ? "swim2" : "swim") : "swim", ring: -1 };
  }
  if (h < 60) {
    // Barboter : basculer (0,3 s), rester cul en l'air en pédalant, se redresser.
    if (u < 0.3 || u > 3.4) return { pose: "tip", ring: u < 0.3 ? u / 1.6 : -1 };
    return { pose: (Math.floor(u * 3.2) & 1) ? "dabble2" : "dabble", ring: (u - 0.3) / 1.6 };
  }
  if (h < 74) {
    // Plonger la tête, par petits coups.
    const k = u % 1.3;
    return { pose: k < 0.55 ? "dip" : "swim", ring: k < 1.1 ? k / 1.1 : -1 };
  }
  if (h < 90) {
    // La toilette : deux gestes qui alternent, à un rythme irrégulier.
    const sub = Math.floor(u / 0.45);
    return { pose: fh(seed, w * 16 + sub, 37) & 1 ? "preen" : "preen2", ring: -1 };
  }
  if (h < 95) {
    // Se dresser et battre des ailes (1,3 s), puis se secouer la queue.
    if (u < 1.3) return { pose: (Math.floor(u * 8) & 1) ? "flap2" : "flap", ring: u / 1.3 };
    return { pose: "swim", ring: -1 };
  }
  return { pose: "alert", ring: -1 };
}
export function faunaDucks(fw, env) {
  const out = [];
  if (!fw) return out;
  const t = env.t;
  fw.duckSites.forEach((site, si) => {
    if (!site.cells.length) return;
    const members = duckMembers(site, env.season);
    const lead = (tt) => duckLeader(fw, env, site, si, tt);
    const L0 = lead(t);
    const asleep = duckAsleep(tminAt(env, env.nowMs));
    members.forEach(([robe, lag, ring], mi) => {
      const id = "d" + si + "." + mi;
      let st = L0, x, y;
      if (!lag) { x = L0.x; y = L0.y; }
      else {
        st = lead(t - lag);
        // Au repos, le suiveur s'écarte autour d'elle ; il se rassemble avant son départ.
        const g = st.moving ? 0 : smooth(0, 1.8, st.restT) * smooth(0, 1.8, st.restLen - st.restT);
        const a = fr(si, mi, 13) * 6.283 + Math.sin(t * 0.21 + mi) * 0.6;
        const ox = Math.cos(a) * ring * g, oy = Math.sin(a) * ring * 0.8 * g;
        /* ⚠️ Trop près de la rive, l'écart RÉTRÉCIT — continûment (un seuil
           ferait sauter le caneton d'un demi-pas : trouvé par verify-faune §1). */
        /* À terre, c'est le bord de la berge (`odist`) qui resserre l'écart, pas la rive. */
        const q = st.B && st.B.land && duckOnLand(fw, st.x, st.y)
          ? clamp((fw.odist(st.x + ox, st.y + oy) - 0.4) / 0.3, 0, 1)
          : clamp((fw.wdist(st.x + ox, st.y + oy) - 0.45) / 0.3, 0, 1);
        x = st.x + ox * q; y = st.y + oy * q;
      }
      const seed = fh(si, mi, 7);
      const kind = robe === "tiny" || robe === "young" ? robe : "duck";
      const land = duckOnLand(fw, x, y);
      let pose;
      let splash = -1;
      if (land) {
        // À terre : la démarche en marchant, et au repos brouter, se tenir, se coucher.
        if (kind === "duck") pose = st.moving ? duckWalkPose(t, mi) : duckLandRestPose(seed, t);
        else pose = kind + ((st.moving ? Math.floor(t * 5 + mi) : Math.floor(t * 0.8 + mi)) & 1 ? "W2" : "W");
      } else {
        // En nageant : le coup de patte au rythme de la vitesse (≈ 2 Hz en croisière).
        /* ⚠️ 2026-09-26 (nuit) — LA CADENCE NE MULTIPLIE PLUS LE TEMPS ABSOLU.
           `floor(t × f(vitesse))`, avec `t` de l'ordre de 10⁵ s : le moindre
           changement de vitesse déplaçait l'index de milliers d'images, donc la
           pose tirait AU HASARD à chaque image pendant toute l'accélération —
           c'était le « saccadé » vu en jeu. Le coup de patte suit maintenant le
           chemin parcouru (plus une part lente et constante du temps). */
        if (st.moving) pose = kind === "duck" ? ((Math.floor((st.dist || 0) * 3.2 + t * 1.3 + mi) & 1) ? "swim2" : "swim") : (Math.floor(t * 3.2 + mi) & 1 ? kind + "2" : kind);
        if (!st.moving) {
          if (kind === "duck") { const rp = duckRestPose(seed, t, asleep); pose = rp.pose; splash = rp.ring; }
          else pose = asleep ? kind : (Math.floor(t * 1.1 + mi) & 1 ? kind + "2" : kind);
        }
      }
      out.push({ id, site: si, robe, kind, x, y, face: st.hx < -0.05 ? -1 : st.hx > 0.05 ? 1 : (fh(seed, st.k, 3) & 1 ? 1 : -1),
                 moving: st.moving, spd: st.spd, pose, ring: splash, lake: !!site.lake, land });
    });
  });
  return out;
}

/* ── 6. LES PAPILLONS ──────────────────────────────────────────────────────
   ⚠️ « PETITS ET DÉTAILLÉS, BIEN CALCULER LA VITESSE ET L'ALLURE DE LEUR VOL »
   (Guillaume). Ce qui fait un vol de papillon, et pas un vol d'oiseau :
   - la VITESSE : 1,2 à 2 cases/s en croisière (≈ 1,5 à 2 m/s, une piéride
     qui traverse un jardin), plus lent quand il butine d'une fleur à l'autre ;
   - le BATTEMENT : 8 à 11 Hz (la piéride bat vite, le paon et le vulcain plus
     lentement, et PLANENT par moments ailes ouvertes) ;
   - le SAUTILLEMENT : chaque coup d'aile soulève le corps (≈ 1 px au rythme
     du battement), plus une ondulation lente et irrégulière de 2 à 3 px —
     c'est ce qui rend un vol de papillon « erratique » ;
   - la TRAJECTOIRE : jamais droite — des écarts latéraux de deux fréquences
     qui s'annulent aux deux bouts (il part d'une fleur et s'y pose), et de
     temps en temps une grande boucle.
   - au POSÉ : ailes fermées, et quelques ouvertures lentes (le paon et le
     vulcain se chauffent ailes grandes ouvertes, la piéride non).
   Une maison = un massif ; le papillon butine les fleurs à 3,5 cases autour. */
export const BFLY_SPECIES = ["pieride", "citron", "azure", "vulcain", "paon", "machaon"];
const BFLY_BEAT = { pieride: 10.5, citron: 9, azure: 11, vulcain: 7.5, paon: 7, machaon: 6.5 };
const BFLY_GLIDE = { pieride: 0.05, citron: 0.08, azure: 0.05, vulcain: 0.3, paon: 0.3, machaon: 0.35 };
const BFLY_BASK = { pieride: 0.08, citron: 0.1, azure: 0.35, vulcain: 0.6, paon: 0.65, machaon: 0.5 };
const BFLY_SEASON = {
  spring: [["pieride", 35], ["citron", 25], ["azure", 20], ["paon", 20]],
  summer: [["pieride", 30], ["citron", 12], ["azure", 22], ["vulcain", 16], ["paon", 16], ["machaon", 4]],
  autumn: [["vulcain", 40], ["pieride", 35], ["paon", 25]],
  winter: [["pieride", 100]],
};
function pickWeighted(list, h) {
  let tot = 0; for (const [, w] of list) tot += w;
  let r = h % tot;
  for (const [k, w] of list) { if (r < w) return k; r -= w; }
  return list[0][0];
}
function nearFlowers(fw, x, y, R) {
  const out = [];
  for (let gy = Math.floor((y - R) / 4); gy <= Math.floor((y + R) / 4); gy++)
    for (let gx = Math.floor((x - R) / 4); gx <= Math.floor((x + R) / 4); gx++) {
      const l = fw.flowerGrid.get(gy * 1000 + gx);
      if (l) for (const f of l) if (Math.hypot(f.x - x, f.y - y) <= R) out.push(f);
    }
  return out;
}
export function faunaButterflies(fw, env, view) {
  const out = [];
  if (!fw) return out;
  const t = env.t, dens = butterflyDensity(env, tminAt(env, env.nowMs));
  if (dens <= 0) return out;
  for (const home of fw.bflyHomes) {
    if (home.x < view.x0 - 4 || home.x > view.x1 + 4 || home.y < view.y0 - 4 || home.y > view.y1 + 6) continue;
    const hs = fh(home.id, 3, 91);
    const thr = (hs % 1000) / 1000;
    const pres = clamp((dens - thr * 0.95) / 0.08, 0, 1);
    if (pres <= 0) continue;
    const sp = pickWeighted(BFLY_SEASON[env.season] || BFLY_SEASON.summer, hs >>> 10);
    let fl = home._fl;
    if (!fl) { fl = nearFlowers(fw, home.x, home.y, 3.5); if (!fl.length) fl = [home]; home._fl = fl; }
    const Lc = 6.5 + (hs % 7);                       // la durée d'une visite : 6,5 à 12,5 s
    const t2 = t + (hs % 997) * 0.37;
    const k = Math.floor(t2 / Lc), u = t2 - k * Lc;
    const fA = fl[fh(home.id, k - 1, 5) % fl.length], fB = fl[fh(home.id, k, 5) % fl.length];
    const hk = fh(home.id, k, 11);
    const dist = Math.hypot(fB.x - fA.x, fB.y - fA.y);
    const wander = (hk % 100) < 22;                  // une visite sur cinq : la grande boucle
    const cruise = 1.2 + ((hk >>> 8) % 100) / 100 * 0.8;
    const Tf = Math.min(Lc * 0.75, Math.max(1.3, (dist + (wander ? 5 : 1.2)) / cruise));
    let x, y, alt, beat, flying;
    const seedF = hs & 0xffff;
    if (u < Tf) {
      const s = u / Tf, e = easeIO(s), env1 = Math.sin(Math.PI * s);
      const dx = fB.x - fA.x, dy = fB.y - fA.y, dl = Math.hypot(dx, dy) || 1;
      const px = -dy / dl, py = dx / dl;
      const lat = (Math.sin(6.283 * (1.3 * s) + seedF) * 0.55 + Math.sin(6.283 * (3.1 * s) + seedF * 0.7) * 0.25) * env1;
      x = fA.x + dx * e + px * lat; y = fA.y + dy * e + py * lat;
      if (wander) { const a = 6.283 * s + (hk & 7); x += (Math.cos(a) - 1) * 1.6 * env1 * (hk & 1 ? 1 : -1); y += Math.sin(a) * 1.1 * env1; }
      alt = fA.h * (1 - s) + fB.h * s + (0.45 + ((hk >>> 16) % 60) / 100) * env1;
      flying = true;
      beat = BFLY_BEAT[sp];
    } else {
      x = fB.x; y = fB.y; alt = fB.h; flying = false; beat = 0;
    }
    // Le départ d'un papillon quand la densité baisse : il s'élève et s'en va (jamais il ne s'éteint).
    if (pres < 1) { const q = 1 - pres; x += q * 5 * (hs & 1 ? 1 : -1); y -= q * 2; alt += q * 3.5; }
    // Le battement et le vol plané (pure fonction du temps).
    let open;
    if (flying) {
      const glide = (Math.sin(t * 0.9 + seedF) + 1) / 2 < BFLY_GLIDE[sp] * 1.6 && BFLY_GLIDE[sp] > 0.1;
      const ph = (t * beat + seedF * 0.13) % 1;
      open = glide ? 3 : Math.round(Math.abs(Math.cos(Math.PI * ph)) * 3);
    } else {
      const bask = ((fh(home.id, Math.floor(t2 / 2.5), 23) % 100) / 100) < BFLY_BASK[sp];
      open = bask ? (Math.floor(t2 * 1.3) % 3 === 0 ? 2 : 3) : 0;
    }
    // Le sautillement : ≈ 1 px au battement, plus une ondulation lente (en px).
    const bob = flying ? Math.sin(t * beat * 6.283) * 0.8 + Math.sin(t * 2.3 + seedF) * 1.6 + Math.sin(t * 3.7 + seedF * 1.7) * 0.8 : 0;
    out.push({ id: "b" + home.id, sp, x, y, alt, bob, open, flying, a: pres });
  }
  return out;
}

/* ── 7. LES LUCIOLES ───────────────────────────────────────────────────────
   Elles dérivent lentement (≈ 0,1 case/s) à hauteur d'herbe, et ne brillent
   PAS en continu : chacune émet un ÉCLAIR (≈ 0,95 s, montée et descente
   douces), toutes les 6 à 10 s, en montant un peu pendant l'éclair (le « J »
   du lampyre qui signale). Certaines font un double éclair. Entre deux, rien.
   Une nuit sur quatre, celles de l'étang SE SYNCHRONISENT : elles battent au
   même rythme, par vagues (ça existe, et ça ne se voit pas tous les soirs). */
export function faunaFireflies(fw, env, view) {
  const out = [];
  if (!fw) return out;
  const t = env.t, dens = fireflyDensity(env, tminAt(env, env.nowMs));
  if (dens <= 0) return out;
  const syncNight = fh(env.day, 5, 77) % 4 === 0;
  fw.ffZones.forEach((z, zi) => {
    if (z.x + z.rx < view.x0 - 2 || z.x - z.rx > view.x1 + 2 || z.y + z.ry < view.y0 - 2 || z.y - z.ry > view.y1 + 4) return;
    for (let i = 0; i < z.n; i++) {
      const h = fh(zi, i, 41);
      if ((h % 1000) / 1000 > dens) continue;
      const r = Math.sqrt(((h >>> 10) % 1000) / 1000), a = ((h >>> 20) % 1000) / 1000 * 6.283;
      /* ⚠️ LENTES (Guillaume, en jeu : « ralentis le comportement des lucioles, ce
         sera plus dreamy ») : une dérive d'un demi-pas par seconde au plus, un
         éclair qui monte et retombe en près d'une seconde, toutes les 6 à 10 s. */
      const w1 = 0.05 + ((h >>> 3) % 100) / 1400, w2 = 0.08 + ((h >>> 7) % 100) / 1100;
      let x = z.x + Math.cos(a) * r * z.rx + Math.sin(t * w1 + i) * 0.9 + Math.sin(t * w2 * 1.7 + i * 2.1) * 0.4;
      let y = z.y + Math.sin(a) * r * z.ry + Math.cos(t * w2 + i * 1.3) * 0.6;
      let alt = 0.25 + ((h >>> 5) % 100) / 100 * 0.9 + Math.sin(t * 0.2 + i) * 0.2;
      // L'éclair.
      const sync = syncNight && z.sync;
      const P = sync ? 7.5 : 6 + ((h >>> 13) % 100) / 100 * 4;
      const ph0 = sync ? (((h >>> 9) % 100) / 100) * 0.35 : ((h >>> 17) % 1000) / 1000 * P;
      const ph = (((t + ph0) % P) + P) % P;
      const pulse = (p, len) => (p >= 0 && p < len ? Math.pow(Math.sin(Math.PI * p / len), 2) : 0);
      const dbl = (h % 7) === 0;
      const k = Math.max(pulse(ph, 0.95), dbl ? pulse(ph - 1.15, 0.6) * 0.8 : 0);
      alt += k * 0.14;
      out.push({ id: "f" + zi + "." + i, x, y, alt, k });
    }
  });
  return out;
}

/* ── 7 bis. LES INSECTES DES LAMPADAIRES (2026-09-26) ─────────────────────
   Guillaume : « des petits insectes autour des lampadaires allumés — toutes
   petites fusées de lumière, parfois, pas toujours, et pas toujours avec la
   même densité » ; « convaincant mais pas trop détaillé ».
   Ce qui fait un nuage de papillons de nuit sous une lampe, à cette échelle :
   - des points qui TOURNENT autour du verre, vite (2 à 5 rad/s), chacun sur
     son orbite aplatie, dans les deux sens ;
   - de temps en temps un ÉCART brusque (l'insecte file puis revient) : c'est
     la « fusée », un point qui laisse une traînée d'un pixel ;
   - ils ne brillent que dans la lumière : plus loin du verre, plus ternes ;
     et le battement d'ailes les fait scintiller.
   La densité est une pure fonction du temps et de la lampe (fenêtres de 40 s
   fondues l'une dans l'autre) : certaines lampes n'ont rien, d'autres trois
   insectes, d'autres un vrai nuage — et ça change au fil de la nuit. Pas de
   bête l'hiver, peu à l'automne, aucune sous la pluie d'orage. Rien de
   partagé à régler : les deux joueurs voient le même nuage (même heure).
   `heads` : les verres allumés { x, y (px d'art), r } ; rend des points
   { x, y, x2, y2 (la traînée), k } en px d'art, pour la passe de lumière. */
const MOTH_SEASON = { spring: 0.6, summer: 1, autumn: 0.35, winter: 0 };
const MOTH_WIN = 40, MOTH_MAX = 8;
export function lampMotes(env, heads) {
  const out = [];
  if (!env || env.stormy) return out;
  const sf = MOTH_SEASON[env.season] || 0;
  if (sf <= 0) return out;
  const t = env.t;
  for (const hd of heads || []) {
    const lx = Math.round(hd.x), ly = Math.round(hd.y);
    const seed = (lx * 73856093) ^ (ly * 19349663);
    // L'activité de cette lampe : deux tirages voisins fondus (jamais un saut).
    const w = Math.floor(t / MOTH_WIN), u = smooth(0.7, 1, t / MOTH_WIN - w);
    const act = (k) => { const h = fh(seed, k, 131) % 100; return h < 38 ? 0 : h < 70 ? 0.3 : h < 90 ? 0.6 : 1; };
    const a = (act(w) * (1 - u) + act(w + 1) * u) * sf;
    const n = a * MOTH_MAX;
    if (n < 0.05) continue;
    const R0 = Math.max(4, (hd.r || 2) * 2.2);
    for (let i = 0; i < Math.ceil(n); i++) {
      const vis = clamp(n - i, 0, 1);
      const h = fh(seed, i, 137);
      const dir = h & 1 ? 1 : -1;
      const om = (2 + ((h >>> 2) % 100) / 100 * 3) * dir;
      const rr = R0 * (0.6 + ((h >>> 9) % 100) / 100 * 1.2);
      const ph = ((h >>> 16) % 628) / 100;
      const pos = (tt) => {
        // La fusée : toutes les 3 à 7 s, l'orbite s'étire d'un coup puis revient.
        const P = 3 + (h % 5), q = ((tt + ph) % P) / P;
        const dart = q < 0.12 ? Math.sin(Math.PI * q / 0.12) : 0;
        const r = rr * (1 + 0.3 * Math.sin(tt * 1.7 + i) + 1.4 * dart);
        const ang = tt * om + ph + Math.sin(tt * 2.3 + i * 1.9) * 0.6;
        return { x: lx + Math.cos(ang) * r, y: ly + Math.sin(ang) * r * 0.7 + Math.sin(tt * 3.1 + i) * 1.2, r };
      };
      const p = pos(t), q = pos(t - 0.045);
      const near = clamp(1 - p.r / (R0 * 3.2), 0.15, 1);
      const flick = Math.sin(t * 38 + i * 2.7) > -0.3 ? 1 : 0.45;
      /* La robe : du jaune-blanc (la phalène pâle qui accroche la lumière) au
         brun-noir (la noctuelle, une silhouette sur le halo) — 2026-09-26 (nuit),
         Guillaume : « des couleurs de pixel différentes, du jaune blanc au marron
         noir ». Un index dans `MOTE_COLORS` (lumiere.js), tiré par insecte. */
      out.push({ id: seed + ":" + i, x: p.x, y: p.y, x2: q.x, y2: q.y, k: vis * near * flick, mote: true, c: (h >>> 24) % 7 });
    }
  }
  return out;
}

/* ── 8. LES CARPES DE L'ÉTANG (sous l'eau claire) ──────────────────────────
   ⚠️ LENTES (Guillaume, en jeu : « les vraies carpes sont relativement
   calmes ») : 0,12 case/s en croisière (≈ 13 cm/s), de longues stations
   immobiles, une queue qui bat lentement. Elles changent de cap en douceur, montent parfois
   gober en surface (`z` → 0 : plus nettes, et un rond se forme). Le cap se
   lit sur la vitesse (différence finie), ce qui arrondit leurs virages. */
const FISH_SLOT = 18;
const FISH_COLORS = ["bronze", "bronze", "koi", "ghost", "bronze", "koi"];
export function faunaFish(fw, env) {
  const out = [];
  if (!fw) return out;
  const t = env.t;
  fw.fishSites.forEach((site, si) => {
    const n = site.key === "pondS" ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const seed = 300 + si * 31 + i * 7;
      const tgt = (k) => {
        const P = cellPoint(site.cells, fw.W, fh(seed, k, 9), 0.7);
        if (fw.wdist(P.x, P.y) >= 0.5) return P;
        const j = site.cells[fh(seed, k, 9) % site.cells.length];
        return { x: j % fw.W + 0.5, y: ((j / fw.W) | 0) + 0.5 };
      };
      const pos = (tt) => slotMove(tt + i * 3.7, FISH_SLOT, tgt,
        (A, B) => waterPath(fw, site.cells, A, B, 0.45), 0.12, 0.62);
      const p = pos(t), q = pos(t - 0.9);
      let hx = p.x - q.x, hy = p.y - q.y;
      const l = Math.hypot(hx, hy);
      const idle = l < 0.012;
      if (idle) { const h0 = endHeadingOf(p); const a = Math.atan2(h0.hy, h0.hx) + Math.sin(t * 0.13 + i) * 0.25; hx = Math.cos(a); hy = Math.sin(a); }
      else { hx /= l; hy /= l; }
      const z = clamp(0.55 + 0.45 * Math.sin(t * 0.11 + seed), 0, 1);
      out.push({ id: "c" + si + "." + i, x: p.x, y: p.y, hx, hy, z, moving: !idle, color: FISH_COLORS[(si * 3 + i) % FISH_COLORS.length], swim: t * (idle ? 0.35 : 1.1) + seed });
    }
  });
  return out;
}
// Au repos, la carpe garde le cap de son arrivée (puis dérive à peine) : un
// cap tiré au hasard la ferait pivoter d'un coup en s'arrêtant.
function endHeadingOf(p) { return { hx: p.hx || 1, hy: p.hy || 0 }; }
/* Les sauts au port : chaque source tire, par tranche de 9 s, peut-être un
   saut (0,8 s en l'air) à un point d'eau profonde, et ses ronds (1,8 s). */
export function faunaJumps(fw, env, view) {
  const out = [];
  if (!fw || !fw.deep.length) return out;
  const t = env.t;
  for (let s = 0; s < 4; s++) {
    for (const k of [Math.floor(t / 9) - 1, Math.floor(t / 9)]) {
      const h = fh(s, k, 61);
      if (h % 100 > 55) continue;
      const t0 = k * 9 + ((h >>> 8) % 600) / 100;
      const age = t - t0;
      if (age < 0 || age > 2.6) continue;
      const p = cellPoint(fw.deep, fw.W, h >>> 3, 0.8);
      if (p.x < view.x0 - 2 || p.x > view.x1 + 2 || p.y < view.y0 - 2 || p.y > view.y1 + 2) continue;
      out.push({ id: "j" + s + "." + k, x: p.x, y: p.y, age, face: h & 1 ? 1 : -1 });
    }
  }
  return out;
}

/* ── 9. LES GOÉLANDS ET LES MOUETTES RIEUSES ───────────────────────────────
   Trois vies, tirées par créneau de 38 s (décalé pour chaque oiseau, pour
   qu'ils ne changent pas tous d'avis ensemble) : POSÉ sur le quai ou le
   ponton, sur l'EAU, ou en VOL circulaire au-dessus du port. Entre deux, un
   VOL de transfert en arc (décollage et posé amortis). Les jours de marché,
   de 8h à 13h, deux d'entre eux tournent au-dessus de l'étal de poisson.
   La nuit : posés ou sur l'eau, la tête sous l'aile. */
const GULL_SLOT = 38, GULL_FLY = 3.0;
/* 2026-09-26 (nuit) — 10 → 6, Guillaume en jeu : « moins de mouettes /
   goélands ». Quatre goélands, deux rieuses (même proportion qu'avant) ; les
   deux de l'étal (i < 2) et les trois du pêcheur (i < 3) restent. */
export const GULL_COUNT = 6;
function gullSpecies(i) { return i >= 4 ? "laughing" : "herring"; }
function gullSlotTarget(fw, env, i, k) {
  const tm = tminAt(env, ((k * GULL_SLOT) - i * 4.3) * 1000);
  const night = gullAsleep(tm);
  // La nuit, on ne change de place qu'une fois toutes les sept minutes.
  const h = fh(i, night ? 100000 + Math.floor(k / 11) : k, 83);
  if (env.market && i < 2 && tm >= 8 * 60 && tm < 13 * 60 && fw.fishStalls.length) {
    const st = fw.fishStalls[i % fw.fishStalls.length];
    return { mode: "soar", cx: st.x + 0.5, cy: st.y + 1.5, R: 1.6 + (h % 10) / 10, alt: 3.2 + (h % 7) / 10, dir: h & 1 ? 1 : -1, ph: (h % 628) / 100, h };
  }
  let r = h % 100;
  if (night) r = r < 60 ? 0 : 50;
  else if (env.stormy) r = r < 70 ? 0 : 50;
  if (r < 42 && (fw.quay.length || fw.pier.length)) {
    const all = fw.quay.length && fw.pier.length ? ((h >>> 7) % 4 === 0 ? fw.pier : fw.quay) : (fw.quay.length ? fw.quay : fw.pier);
    const q = all[(h >>> 9) % all.length];
    const px2 = q.x + (((h >>> 20) % 100) / 100 - 0.5) * 0.5;
    // Le pas de côté (± 0,4 case) seulement là où il reste de la pierre des deux côtés.
    const dry = (xx) => fw.wet[Math.floor(q.y) * fw.W + Math.floor(xx)] === 0;
    return { mode: "perch", x: px2, y: q.y, h, night, canWalk: dry(px2 - 0.5) && dry(px2 + 0.5) };
  }
  if ((r < 76 || night) && fw.floats.length) {
    const p = cellPoint(fw.floats, fw.W, h >>> 5, 0.8);
    return { mode: "float", x: p.x, y: p.y, h, night };
  }
  const c = fw.soar.length ? fw.soar[(h >>> 11) % fw.soar.length] : { x: 90, y: 160 };
  return { mode: "soar", cx: c.x, cy: c.y, R: 2 + (h % 30) / 10, alt: 2.4 + ((h >>> 4) % 15) / 10, dir: h & 1 ? 1 : -1, ph: (h % 628) / 100, h };
}
/* Où est l'oiseau selon sa cible, à l'instant `tt` (hors transfert). */
function gullAt(tg, tt, i) {
  if (tg.mode === "soar") {
    const w = (GULL_FLY * 0.8 / tg.R) * tg.dir;
    const a = tg.ph + tt * w;
    return { x: tg.cx + Math.cos(a) * tg.R, y: tg.cy + Math.sin(a) * tg.R * 0.75, alt: tg.alt + Math.sin(tt * 0.35 + i) * 0.4,
             hx: -Math.sin(a) * tg.dir, hy: Math.cos(a) * 0.75 * tg.dir };
  }
  if (tg.mode === "float") {
    return { x: tg.x + Math.sin(tt * 0.07 + i) * 0.35, y: tg.y + Math.sin(tt * 0.05 + i * 2) * 0.2, alt: 0, hx: 0, hy: 0 };
  }
  return { x: tg.x, y: tg.y, alt: 0, hx: 0, hy: 0 };
}
export function faunaGulls(fw, env) {
  const out = [];
  if (!fw || (!fw.quay.length && !fw.floats.length)) return out;
  const t = env.t;
  const winter = env.season === "winter" || env.season === "autumn";
  for (let i = 0; i < GULL_COUNT; i++) {
    const tt = t + i * 4.3, k = Math.floor(tt / GULL_SLOT), u = tt - k * GULL_SLOT;
    const A = gullSlotTarget(fw, env, i, k - 1), B = gullSlotTarget(fw, env, i, k);
    const t0 = t - u;                                  // le début du créneau, en temps réel
    const pA = gullAt(A, t0, i);
    // Le transfert : de pA au point de B à l'arrivée (une cible qui tourne se rejoint où elle SERA).
    const dGuess = Math.hypot((B.x !== undefined ? B.x : B.cx) - pA.x, (B.y !== undefined ? B.y : B.cy) - pA.y);
    const Tf = Math.min(GULL_SLOT * 0.5, 1.4 + dGuess / GULL_FLY);
    const same = A.mode !== "soar" && B.mode === A.mode && Math.hypot(B.x - A.x, B.y - A.y) < 0.3;
    let s;
    if (!same && u < Tf) {
      const pB = gullAt(B, t0 + Tf, i);
      const e = easeIO(u / Tf), arc = Math.sin(Math.PI * (u / Tf));
      const dx = pB.x - pA.x, dy = pB.y - pA.y;
      const x = pA.x + dx * e - dy * 0.12 * arc, y = pA.y + dy * e + dx * 0.12 * arc;
      const alt = pA.alt * (1 - e) + pB.alt * e + arc * (0.8 + Math.min(2, Math.hypot(dx, dy) * 0.15));
      const l = Math.hypot(dx, dy) || 1;
      s = { x, y, alt, hx: dx / l, hy: dy / l, mode: "fly", flap: u < 1.2 || u > Tf - 1.0 ? 1 : 0.35 };
    } else {
      const p = gullAt(B, t, i);
      s = { ...p, mode: B.mode, flap: B.mode === "soar" ? ((Math.sin(t * 0.5 + i * 1.9) > 0.75) ? 0.8 : 0) : 0 };
      if (B.mode !== "soar") {
        // Posé ou sur l'eau : une activité par tranche de 4 s.
        const hh = fh(i, Math.floor(t / 4), 97) % 100;
        s.pose = B.night ? (B.mode === "float" ? "floatSleep" : "sleep")
          : B.mode === "float" ? (hh < 85 ? "float" : "floatSleep")
          : hh < 58 ? "stand" : hh < 72 ? "preen" : hh < 84 ? "call" : B.canWalk ? "walk" : "stand";
        // ⚠️ Le regard change avec l'activité (même tranche de 4 s) : un demi-tour au milieu d'un pas de côté le ferait glisser.
        s.face = fh(i, Math.floor(t / 4), 3) & 1 ? 1 : -1;
        /* Le pas de côté s'éteint aux deux bouts du repos : sinon l'oiseau
           repartirait d'une place décalée (un glissement, trouvé par verify-faune §1). */
        const uu = tt - Math.floor(tt / GULL_SLOT) * GULL_SLOT;
        if (s.pose === "walk") s.x += Math.sin((t % 4) / 4 * Math.PI) * 0.4 * s.face * smooth(0, 2, uu - Tf) * smooth(0, 2, GULL_SLOT - uu);
      }
    }
    const sp = gullSpecies(i);
    out.push({ id: "g" + i, i, sp: sp === "laughing" && winter ? "laughingW" : sp, ...s });
  }
  return out;
}

/* ── 10. LES CHATS ─────────────────────────────────────────────────────────
   Trois chats, trois territoires : le ROUX tient le marché (et l'étal de
   poisson les jours de marché), le NOIR l'église et le cimetière, la
   TRICOLORE le port. Créneau de 80 s : une place tirée dans son territoire
   (la nuit, plutôt les seuils et les lampadaires ; l'orage, seulement les
   abris), le trajet à pied par le vrai chemin de la ville
   (`E.townFindPath`), puis le repos : assis, en miche, à sa toilette, à
   regarder la rue, ou endormi — l'après-midi surtout. */
const CAT_DEFS = [
  { coat: "roux", home: "market" },
  { coat: "noir", home: "church" },
  { coat: "tricolore", home: "port" },
];
const CAT_SLOT = 80, CAT_WALK = 1.25;
function catSpots(tw, nav, home, fishStalls) {
  if (!nav) return [];
  const W = tw.w;
  const props = tw.props || [];
  const walkable = (x, y) => x >= 0 && y >= 0 && x < tw.w && y < tw.h && nav.walk[y * W + x];
  const near = (x, y) => {
    for (const [dx, dy] of [[0, 1], [1, 1], [-1, 1], [1, 0], [-1, 0], [0, 2], [0, -1]]) if (walkable(x + dx, y + dy)) return { x: x + dx, y: y + dy };
    return null;
  };
  const spots = [];
  const add = (x, y, kind, extra) => {
    const c = near(x, y); if (!c) return;
    if (spots.some((s) => s.cx === c.x && s.cy === c.y)) return;
    spots.push({ cx: c.x, cy: c.y, x: c.x + 0.5, y: c.y + 0.72, kind, ...extra });
  };
  const inR = (p, r) => p.x >= r.x && p.y >= r.y && p.x < r.x + r.w && p.y < r.y + r.h;
  if (home === "market") {
    const R = C.TOWN_MARKET;
    for (const p of props) {
      if (!inR(p, R)) continue;
      if (p.kind === "stall") add(p.x, p.y, "stall", { fish: fishStalls.includes(p) });
      else if (p.kind === "marketArch") add(p.x, p.y, "arch", { shelter: true });
      else if (p.kind === "crate" || p.kind === "barrel" || p.kind === "sacks" || p.kind === "townWell") add(p.x, p.y, p.kind, { nightOk: true });
    }
  } else if (home === "church") {
    const ch = C.TOWN_CHURCH;
    const R = { x: ch.x - 22, y: ch.y - 8, w: ch.w + 30, h: ch.h + 16 };
    for (const p of props) {
      if (!inR(p, R)) continue;
      if (p.kind === "grave") add(p.x, p.y, "grave", { nightOk: true });
      else if (p.kind === "bench" || p.kind === "stoneBench") add(p.x, p.y, "bench");
    }
    add(ch.x + (ch.w >> 1), ch.y + ch.h - 1, "porch", { shelter: true, nightOk: true });
  } else if (home === "port") {
    const R = { x: C.TOWN_LAKE.x, y: C.TOWN_LAKE.y - 6, w: C.TOWN_LAKE.w, h: 8 };
    for (const p of props) {
      if (!inR(p, R)) continue;
      if (p.kind === "bench" || p.kind === "stoneBench") add(p.x, p.y, "bench", { shelter: true });
      else if (p.kind === "bucket" || p.kind === "rod") add(p.x, p.y, p.kind, { fish: true });
      else if (p.kind === "lamp" || p.kind === "hangLamp" || p.kind === "oilLamp") add(p.x, p.y, "lamp", { nightOk: true });
    }
  }
  // ⚠️ Le territoire doit tenir d'un seul tenant : on écarte les places d'une autre poche.
  if (spots.length) {
    const c0 = nav.comp[spots[0].cy * W + spots[0].cx];
    return spots.filter((s) => nav.comp[s.cy * W + s.cx] === c0).sort((a, b) => a.cy - b.cy || a.cx - b.cx);
  }
  return spots;
}
function catPath(fw, tw, A, B) {
  const key = "c" + A.cx + "," + A.cy + ">" + B.cx + "," + B.cy;
  let p = fw.pathCache.get(key);
  if (!p) {
    const a0 = C.tileAnchor(A.cx, A.cy), b0 = C.tileAnchor(B.cx, B.cy);
    const r = E.townFindPath(tw, a0.x, a0.y, b0.x, b0.y);
    // Les points du chemin sont des ANCRES de personnage : on les ramène aux pieds.
    p = r ? r.map((q) => ({ x: C.footX(q.x), y: C.footY(q.y) })) : [];
    fw.pathCache.set(key, p);
  }
  return [{ x: A.x, y: A.y }, ...p.slice(0, -1), { x: B.x, y: B.y }];
}
function catTarget(fw, env, cat, k) {
  const tm = tminAt(env, (k * CAT_SLOT) * 1000);
  let pool = cat.spots;
  if (env.stormy) { const sh = pool.filter((s) => s.shelter); if (sh.length) pool = sh; }
  else if (catNight(tm)) { const n = pool.filter((s) => s.nightOk || s.shelter); if (n.length) pool = n; }
  else if (env.market && tm >= 8 * 60 && tm < 13 * 60) {
    const f = pool.filter((s) => s.fish);
    if (f.length && fh(cat.idx, k, 3) % 100 < 60) pool = f;
  }
  return pool[fh(cat.idx, k, 57) % pool.length];
}
function catRestPose(cat, t, tm, spot) {
  const h = fh(cat.idx, Math.floor(t / 6), 71) % 100;
  const nap = tm >= 13 * 60 && tm < 17 * 60 ? 30 : catNight(tm) ? 8 : 16;
  if (h < nap) return "sleep";
  if (h < nap + 22) return "loaf";
  if (h < nap + 38) return "groom";
  if (h < nap + 50) return "front";
  return "sit";
}
export function faunaCats(fw, env, tw) {
  const out = [];
  if (!fw) return out;
  const t = env.t;
  for (const cat of fw.cats) {
    const tt = t + cat.idx * 23;
    const st = slotMove(tt, CAT_SLOT, (k) => catTarget(fw, env, cat, k), (A, B) => catPath(fw, tw, A, B), CAT_WALK, 0.55, 0.45);
    const tm = tminAt(env, env.nowMs);
    let pose, face = st.hx < -0.05 ? -1 : st.hx > 0.05 ? 1 : ((fh(cat.idx, st.k, 3) & 1) ? 1 : -1);
    if (st.moving) {
      /* ⚠️ La foulée se lit sur le CHEMIN PARCOURU (`st.dist`), jamais sur
         `tt × cadence(vitesse)` — voir la note des colverts : ce produit faisait
         tirer une image au hasard à chaque rafraîchissement dès que la vitesse
         variait, donc pendant tout le trajet avec l'ancien profil. Pattes
         calées sur le sol : 4,2 images par case au pas (5,2 Hz à 1,25 case/s). */
      const vertical = Math.abs(st.hy) > Math.abs(st.hx) * 1.3;
      const run = st.spd > 1.9;
      const d = st.dist || 0;
      if (vertical) pose = (st.hy > 0 ? "down" : "up") + (Math.floor(d * 3.2) & 1);
      else if (run) pose = "run" + (Math.floor(d * 3.6) & 1);
      else pose = "walk" + [0, 1, 2, 1][Math.floor(d * 4.16) & 3];
    } else {
      const p = catRestPose(cat, tt, tm, st.B);
      pose = p === "groom" ? "groom" + (Math.floor(tt * 2.6) & 1) : p === "sleep" ? "sleep" + (Math.floor(tt * 0.8) & 1) : p;
      if (p === "sleep" || p === "loaf") face = (fh(cat.idx, st.k, 9) & 1) ? 1 : -1;
    }
    out.push({ id: "k" + cat.idx, idx: cat.idx, coat: cat.coat, x: st.x, y: st.y, face, pose, moving: st.moving, spd: st.spd,
               friendly: fh(cat.idx, st.k, 43) % 100 < (cat.coat === "noir" ? 45 : 70), resting: !st.moving, restT: st.restT });
  }
  return out;
}

/* ── 11. LES RÉACTIONS (locales, chez chaque client) ───────────────────────
   Une réaction est un DÉCALAGE qui s'ajoute à la routine et revient à zéro
   tout seul — jamais une seconde position qu'il faudrait réconcilier. Elle
   ne voyage pas sur le réseau : les positions des joueurs, elles, voyagent
   déjà, donc les deux clients réagissent presque pareil.
   `threats` : [{ x, y (pieds, en cases), moving, still (secondes immobile) }].
   `S` : l'état local (un objet que le jeu garde d'une image à l'autre). */
function springTo(o, tx, ty, dt, k, vmax) {
  const dx = tx - o.ox, dy = ty - o.oy, l = Math.hypot(dx, dy);
  if (l < 1e-4) return;
  const step = Math.min(l, Math.max(l * (1 - Math.exp(-k * dt)), 0), vmax * dt);
  o.ox += (dx / l) * step; o.oy += (dy / l) * step;
}
/* Les canards s'écartent en nageant d'un joueur qui s'approche de la rive ;
   ils viennent aux miettes tombées près de l'eau. Toujours dans l'eau. */
export function faunaReactDucks(S, fw, ducks, threats, food, dt, t) {
  const M = S.ducks || (S.ducks = new Map());
  /* ⚠️ L'ESPACE VITAL : au repos contre une rive, l'écart des suiveurs se
     resserre (voir faunaDucks) et la famille s'EMPILAIT — cinq canards dans le
     même pixel (vu en jeu, premier essai). Chacun s'écarte donc de ses voisins
     trop proches : une poussée locale, continue, qui passe par le même garde
     « jamais hors de l'eau » que le reste. */
  const cur = ducks.map((d) => { const o = M.get(d.id); return { x: d.x + (o ? o.ox : 0), y: d.y + (o ? o.oy : 0), site: d.site, r: d.kind === "duck" ? 1.0 : d.kind === "young" ? 0.65 : 0.4 }; });   // r ≈ la longueur du corps (un canard fait 17 px)
  ducks.forEach((d, di) => {
    const o = M.get(d.id) || { ox: 0, oy: 0, alarm: 0 };
    M.set(d.id, o);
    let tx = 0, ty = 0, alarm = 0;
    let px = 0, py = 0;
    cur.forEach((q, qi) => {
      if (qi === di || q.site !== d.site) return;
      const dx = cur[di].x - q.x, dy = cur[di].y - q.y, l = Math.hypot(dx, dy), R = (cur[di].r + q.r) / 2;
      if (l < R) { const f = (R - l) * 2.2; px += (l > 1e-3 ? dx / l : Math.cos(di * 2.4)) * f; py += (l > 1e-3 ? dy / l : Math.sin(di * 2.4)) * f; }
    });
    for (const q of threats) {
      const dx = d.x + o.ox - q.x, dy = d.y + o.oy - q.y, l = Math.hypot(dx, dy);
      if (l < 2.6 && l > 1e-3) { const f = (2.6 - l) * 1.1; tx += dx / l * f; ty += dy / l * f; alarm = Math.max(alarm, 1 - l / 2.6); }
    }
    if (food && !alarm) {
      let best = null, bd = 5;
      for (const p of food.pts || [food]) { const l = Math.hypot(p.x + 0.5 - d.x, p.y + 0.9 - d.y); if (l < bd) { bd = l; best = p; } }
      if (best) { tx = (best.x + 0.5 - d.x) * 0.9; ty = (best.y + 0.9 - d.y) * 0.9; }
    }
    const lim = Math.hypot(tx, ty); if (lim > 3.2) { tx *= 3.2 / lim; ty *= 3.2 / lim; }
    const ox0 = o.ox, oy0 = o.oy;
    springTo(o, tx, ty, dt, alarm ? 3 : 0.9, alarm ? 1.3 : 0.6);
    // La poussée des voisins s'ajoute directement (une nage lente, 0,35 case/s au plus).
    const pl = Math.hypot(px, py);
    if (pl > 1e-4) { const st = Math.min(pl, 0.35) * dt; o.ox += px / pl * st; o.oy += py / pl * st; }
    // Sans voisin trop près ni menace, l'écart revient doucement à zéro (la routine reprend la main).
    // ⚠️ Jamais hors de l'eau : on recule le pas qui mordrait la rive.
    /* ⚠️ Jamais hors de l'eau NI hors de la berge (2026-09-26 : les canards
       sortent à terre) : un pas est permis s'il reste dans l'eau libre, ou
       dans l'ensemble eau ∪ berge assez loin de son bord (`odist`). */
    const m = d.kind === "tiny" ? 0.4 : 0.55;
    const okP = (x, y) => fw.wdist(x, y) >= m || fw.odist(x, y) >= 0.4;
    if (!okP(d.x + o.ox, d.y + o.oy)) {
      o.ox = ox0; o.oy = oy0;
      if (!okP(d.x + o.ox, d.y + o.oy)) { o.ox *= 0.9; o.oy *= 0.9; }
    }
    o.alarm += (alarm - o.alarm) * Math.min(1, dt * 4);
    d.x += o.ox; d.y += o.oy;
    const vx = o.ox - ox0;
    if (Math.abs(vx) > 0.004) d.face = vx > 0 ? 1 : -1;
    if (Math.hypot(o.ox - ox0, o.oy - oy0) > 0.006) d.moving = true;
    d.land = duckOnLand(fw, d.x, d.y);
    if (o.alarm > 0.35 && d.kind === "duck" && d.pose !== "sleep" && !d.land) d.pose = "alert";
    duckFixPose(d, t);
  });
}
/* Les carpes montent aux miettes près de l'eau (et gobent). */
export function faunaReactFish(S, fw, fish, food, dt) {
  const M = S.fish || (S.fish = new Map());
  for (const f of fish) {
    const o = M.get(f.id) || { ox: 0, oy: 0, z: 0 };
    M.set(f.id, o);
    let tx = 0, ty = 0, tz = 0;
    if (food) {
      let best = null, bd = 4.5;
      for (const p of food.pts || [food]) { const l = Math.hypot(p.x + 0.5 - f.x, p.y + 0.9 - f.y); if (l < bd) { bd = l; best = p; } }
      if (best) { tx = (best.x + 0.5 - f.x) * 0.8; ty = (best.y + 0.9 - f.y) * 0.8; tz = -1; }
    }
    const lim = Math.hypot(tx, ty); if (lim > 2.5) { tx *= 2.5 / lim; ty *= 2.5 / lim; }
    const ox0 = o.ox, oy0 = o.oy;
    springTo(o, tx, ty, dt, 1.2, 0.7);
    if (fw.wdist(f.x + o.ox, f.y + o.oy) < 0.42) { o.ox = ox0; o.oy = oy0; }
    o.z += (tz - o.z) * Math.min(1, dt * 1.5);
    f.x += o.ox; f.y += o.oy; f.z = clamp(f.z + o.z, 0, 1);
    const vx = o.ox - ox0, vy = o.oy - oy0, l = Math.hypot(vx, vy);
    if (l > 0.003) { f.hx = vx / l; f.hy = vy / l; f.moving = true; }
  }
}
/* Les papillons posés s'envolent devant un passant et reviennent. */
export function faunaReactButterflies(S, bflies, threats, dt, t) {
  const M = S.bfly || (S.bfly = new Map());
  for (const b of bflies) {
    const o = M.get(b.id) || { ox: 0, oy: 0, oa: 0 };
    M.set(b.id, o);
    let tx = 0, ty = 0, ta = 0;
    for (const q of threats) {
      const dx = b.x - q.x, dy = b.y - q.y, l = Math.hypot(dx, dy);
      if (l < 1.3 && q.moving) { const f = (1.3 - l) * 1.6 + 0.5; tx += (dx / (l || 1)) * f; ty += (dy / (l || 1)) * f; ta = 1.2; }
    }
    springTo(o, tx, ty, dt, ta ? 5 : 0.7, ta ? 2.4 : 0.9);
    o.oa += (ta - o.oa) * Math.min(1, dt * (ta ? 4 : 0.8));
    b.x += o.ox; b.y += o.oy; b.alt += o.oa;
    if (o.oa > 0.15 || Math.hypot(o.ox, o.oy) > 0.08) {
      if (!b.flying) { b.flying = true; b.open = Math.round(Math.abs(Math.cos(Math.PI * ((t * 10) % 1))) * 3); b.bob = Math.sin(t * 60) * 0.8; }
    }
  }
}
/* Les goélands posés s'envolent devant un joueur trop proche, font un tour
   et reviennent à leur place ; ceux qui voient un pêcheur se posent à côté de
   lui. Le vol local se PILOTE (vitesse, virage) : pas de trajectoire écrite,
   on vise la routine, qui peut bouger pendant qu'on y retourne. */
export function faunaReactGulls(S, fw, gulls, threats, fisher, dt, rnd) {
  const M = S.gulls || (S.gulls = new Map());
  for (const g of gulls) {
    let o = M.get(g.id);
    const grounded = g.mode === "perch" || g.mode === "float";
    if (!o) {
      if (!grounded) continue;
      let trig = false;
      for (const q of threats) if (g.mode === "perch" && Math.hypot(g.x - q.x, g.y - q.y) < 1.35 && q.moving) trig = true;
      const watch = fisher && g.i < 3 && Math.hypot(g.x - fisher.x, g.y - fisher.y) < 30;
      if (!trig && !watch) continue;
      const a = rnd() * 6.283;
      o = { x: g.x, y: g.y, alt: 0, vx: 0, vy: 0, hx: 1, hy: 0, phase: "out", t: 0,
            gx: g.x + Math.cos(a) * (3 + rnd() * 2), gy: g.y + 1 + Math.abs(Math.sin(a)) * 2.5, watch };
      if (watch) { o.gx = fisher.x + (g.i - 1) * 1.6 + (rnd() - 0.5); o.gy = fisher.y + 2.2 + rnd() * 1.4; }
      M.set(g.id, o);
    }
    o.t += dt;
    const flyTo = (tx, ty, tAlt, speed) => {
      const dx = tx - o.x, dy = ty - o.y, l = Math.hypot(dx, dy);
      const v = Math.min(speed, l * 1.6 + 0.3);
      if (l > 1e-3) {
        const hx = dx / l, hy = dy / l;
        o.hx += (hx - o.hx) * Math.min(1, dt * 3); o.hy += (hy - o.hy) * Math.min(1, dt * 3);
        const hl = Math.hypot(o.hx, o.hy) || 1; o.hx /= hl; o.hy /= hl;
        o.x += o.hx * v * dt; o.y += o.hy * v * dt;
      }
      o.alt += (tAlt - o.alt) * Math.min(1, dt * 1.8);
      return l;
    };
    if (o.phase === "out") {
      const l = flyTo(o.gx, o.gy, o.watch ? 0 : 1.8, GULL_FLY);
      if (l < 0.25 && (o.watch ? o.alt < 0.1 : true)) { o.phase = o.watch ? "stay" : "circle"; o.t = 0; }
    } else if (o.phase === "circle") {
      const a = o.t * 1.3;
      flyTo(o.gx + Math.cos(a) * 1.5, o.gy + Math.sin(a) * 1.1, 1.8, GULL_FLY);
      if (o.t > 5 + (g.i % 3) * 2) { o.phase = "back"; o.t = 0; }
    } else if (o.phase === "stay") {
      if (!fisher || !o.watch) { o.phase = "back"; o.t = 0; }
    } else if (o.phase === "back") {
      const gAlt = g.alt || 0;
      const l = flyTo(g.x, g.y, l2alt(g, o), GULL_FLY);
      if (l < 0.15 && Math.abs(o.alt - gAlt) < 0.08) { M.delete(g.id); continue; }
    }
    // L'oiseau est là où la réaction le met.
    const onWater = o.phase === "stay";
    g.x = o.x; g.y = o.y; g.alt = o.alt; g.hx = o.hx; g.hy = o.hy;
    if (onWater && o.alt < 0.05) { g.mode = "float"; g.pose = (Math.floor(o.t / 3) % 4 === 1) ? "float" : "float"; g.face = fisher && fisher.x < g.x ? -1 : 1; }
    else { g.mode = "fly"; g.flap = o.phase === "circle" ? 0.4 : 1; }
  }
}
function l2alt(g, o) {
  // En revenant : on descend à mesure qu'on approche de sa place.
  const l = Math.hypot(g.x - o.x, g.y - o.y);
  return Math.min(1.8, l * 0.5) + (g.alt || 0);
}
/* Les chats : la fuite devant un joueur qui arrive sur eux, et le bonjour à
   un joueur immobile (un chat « ami » de ce créneau vient se frotter à ses
   jambes, puis s'assoit à côté). `walkable(x, y)` : la case (pieds) est-elle
   praticable. */
export function faunaReactCats(S, cats, threats, dt, walkable, rnd) {
  const M = S.cats || (S.cats = new Map());
  for (const c of cats) {
    let o = M.get(c.id);
    if (!o) {
      let near = null, nd = Infinity;
      for (const q of threats) { const l = Math.hypot(c.x - q.x, c.y - q.y); if (l < nd) { nd = l; near = q; } }
      if (!near) continue;
      // Un chat « ami » se laisse approcher de plus près avant de filer.
      if (nd < (c.friendly ? 0.8 : 1.3) && near.moving) {
        o = { mode: "startle", t: 0, x: c.x, y: c.y, face: c.face, tx: 0, ty: 0 };
        const dx = c.x - near.x, dy = c.y - near.y, l = Math.hypot(dx, dy) || 1;
        for (let k = 0; k < 8; k++) {
          const a = Math.atan2(dy, dx) + (k ? (rnd() - 0.5) * 2.2 : 0), r = 3 + rnd() * 1.5;
          const tx = c.x + Math.cos(a) * r, ty = c.y + Math.sin(a) * r;
          if (walkable(tx, ty) && lineWalkable(c.x, c.y, tx, ty, walkable)) { o.tx = tx; o.ty = ty; break; }
        }
        if (!o.tx) continue;
      } else if (c.friendly && c.resting && c.restT > 4 && nd < 3.6 && near.still > 2.2 && c.pose !== "sleep0" && c.pose !== "sleep1") {
        o = { mode: "approach", t: 0, x: c.x, y: c.y, face: c.face, who: near, side: rnd() < 0.5 ? -1 : 1, heart: false };
      } else continue;
      M.set(c.id, o);
    }
    o.t += dt;
    const step = (tx, ty, v) => {
      const dx = tx - o.x, dy = ty - o.y, l = Math.hypot(dx, dy);
      if (l < 1e-3) return 0;
      const s = Math.min(l, v * dt), nx = o.x + dx / l * s, ny = o.y + dy / l * s;
      if (walkable(nx, ny)) { o.x = nx; o.y = ny; }
      else if (walkable(nx, o.y)) o.x = nx;
      else if (walkable(o.x, ny)) o.y = ny;
      if (Math.abs(dx) > 0.02) o.face = dx > 0 ? 1 : -1;
      o.vx = dx / l; o.vy = dy / l;
      return l;
    };
    const walkPose = (v) => {
      if (Math.abs(o.vy) > Math.abs(o.vx) * 1.3) return (o.vy > 0 ? "down" : "up") + (Math.floor(o.t * (v > 2 ? 8 : 4)) & 1);
      return v > 2 ? "run" + (Math.floor(o.t * 7) & 1) : "walk" + [0, 1, 2, 1][Math.floor(o.t * 5.2) & 3];
    };
    const who = o.who ? threats.find((q) => q.id === o.who.id) || o.who : null;
    if (o.mode === "startle") { c.pose = "arch"; if (o.t > 0.4) { o.mode = "flee"; o.t = 0; } }
    else if (o.mode === "flee") { const l = step(o.tx, o.ty, 3.4); c.pose = walkPose(3.4); if (l < 0.1 || o.t > 3) { o.mode = "watch"; o.t = 0; } }
    else if (o.mode === "watch") { c.pose = o.t < 3 ? "front" : o.t < 6 ? "groom" + (Math.floor(o.t * 2.6) & 1) : "sit"; if (o.t > 8) { o.mode = "back"; o.t = 0; } }
    else if (o.mode === "approach") {
      if (!who || !(who.still > 0.6)) { o.mode = "back"; o.t = 0; }
      else {
        const l = step(who.x + o.side * 0.5, who.y + 0.12, 1.1);
        c.pose = walkPose(1.1);
        if (l < 0.12) { o.mode = "rub"; o.t = 0; }
        if (o.t > 9) { o.mode = "back"; o.t = 0; }
      }
    } else if (o.mode === "rub") {
      if (!who || !(who.still > 0.3)) { o.mode = "back"; o.t = 0; }
      else {
        // Le huit autour des jambes : il passe devant, se retourne, repasse.
        const a = o.t * 1.6;
        step(who.x + Math.sin(a) * 0.55, who.y + 0.12 + Math.sin(2 * a) * 0.12, 1.0);
        c.pose = Math.floor(o.t * 2) % 3 === 2 ? "walk1" : "rub";
        if (!o.heart) { o.heart = true; c.heart = true; }
        if (o.t > 4.5) { o.mode = "stay"; o.t = 0; o.face = who.x > o.x ? 1 : -1; }
      }
    } else if (o.mode === "stay") {
      c.pose = o.t < 5 ? "front" : o.t < 9 ? "sit" : "loaf";
      if (!who || !(who.still > 0.3) || o.t > 22) { o.mode = "back"; o.t = 0; }
    } else if (o.mode === "back") {
      // On rejoint la routine, qui peut marcher pendant ce temps : on la vise.
      const l = step(c.x, c.y, 1.3);
      c.pose = walkPose(1.3);
      if (l < 0.12 || o.t > 25) { M.delete(c.id); continue; }
    }
    c.x = o.x; c.y = o.y; c.face = o.face; c.react = o.mode;
  }
}
function lineWalkable(x0, y0, x1, y1, walkable) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.3);
  for (let i = 1; i <= n; i++) if (!walkable(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n)) return false;
  return true;
}
