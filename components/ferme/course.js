/* =============================================================================
   course.js — LA COURSE DE VITESSE SUR LA PATINOIRE (2026-10-05, nuit), PUR.
   -----------------------------------------------------------------------------
   Guillaume : « privatiser la patinoire pour organiser des courses de vitesse,
   comme dans Mario Party 5 » (*Later Skater* : quatre patineurs, des tours dans
   le sens inverse des aiguilles d'une montre autour d'un îlot, la bande qui
   ralentit, un record à battre) ; « bien travailler la physique, le graphisme et
   l'UI de la course multijoueur » ; « contre-la-montre aussi ». Tranché avec lui :
   la piste (des PLOTS autour d'un îlot) n'apparaît que pendant une course
   privatisée ; TOUJOURS QUATRE au départ, des résidents complètent ; physique
   « simple comme MP5 » (la glissade de `patin.js`) + ASPIRATION + CHUTE contre la
   bande.

   Ce fichier ne sait rien du jeu ni du réseau ni du dessin. Il porte :
   · LA PISTE : l'îlot de plots (un rectangle arrondi au centre de la glace), la
     ligne de départ sur la droite sud, la grille à quatre couloirs, la boucle d'un
     couloir donné (pour les résidents et pour le banc) ;
   · LE COMPTE DES TOURS (`tracker`) : on franchit la ligne d'ouest en est, et on
     n'est compté que si l'on a fait le tour de l'îlot depuis (l'angle cumulé) —
     ni l'aller-retour sur la ligne, ni la marche arrière ne paient ;
   · LES RÉSIDENTS (`botRun`) : une trajectoire DÉTERMINISTE, fonction de la graine
     et du temps depuis le départ — chaque client la calcule seul, zéro message,
     et l'hôte en tire leurs temps d'arrivée : tout le monde voit le même
     classement ;
   · L'ASPIRATION (`draftK`) : dans le sillage d'un autre, on pousse plus fort ;
   · LE CLASSEMENT (`ranking`) et LE FANTÔME (`ghostEncode`/`ghostDecode`).
   ⚠️ RÉSEAU (§3 de CLAUDE.md) : chacun chronomètre SA course depuis SON départ
   (une durée reçue, `startIn`, datée à la réception) et n'envoie qu'une DURÉE à
   l'arrivée. Le classement se fait aux chronos : juste même avec 300 ms de
   latence entre l'Europe et l'Australie.
   `tools/verify-course.mjs` joue tout ça, et fait courir un patineur avec la
   vraie physique de `patin.js` pour régler la vitesse des résidents.
   ========================================================================== */
import * as C from "./fermeConstants";

const RK = C.TOWN_RINK;
export const COURSE = {
  LAPS: 5,                                         // Later Skater : cinq tours
  CX: (RK.x0 + RK.x1 + 1) / 2, CY: (RK.y0 + RK.y1 + 1) / 2,   // le centre de la glace (cases)
  ISLAND: { hx: 4, hy: 4.5, r: 2.5 },              // l'îlot de plots : demi-largeur, demi-hauteur, rayon des coins
  /* La ligne SUR LA DROITE sud de l'îlot (elle ne fait que 3 cases : à −2, premier jet, la ligne tombait dans l'arrondi),
     la grille juste derrière, au début de la droite. */
  START_DX: 0.5,                                   // la ligne : une demi-case à l'est de l'axe
  GRID_DX: -1.2,                                   // la grille, derrière elle
  LANE0: 1.0, LANE_STEP: 1.15,                     // les couloirs de la grille, depuis le bord de l'îlot
  CONE_STEP: 1.15,                                 // l'écart entre deux plots, en cases le long du bord
  COUNTDOWN_MS: 3600, GO_MS: 3000,                 // 3, 2, 1 — PARTEZ (à 3 s)
  LOBBY_MS: 30000, MAX_MS: 150000, DONE_MS: 16000, // l'attente, la course au plus long, les résultats affichés
  DRAFT: { near: 0.55, far: 2.9, side: 0.75, vK: 0.1, aK: 0.25 },   // l'aspiration : portée, couloir, +10 % de croisière, +25 % de poussée
  CRASH_V: 6.4,                                    // cases/s : plus vite contre la bande (ou l'îlot), on tombe
  GHOST_HZ: 10,                                    // le fantôme : dix positions par seconde
  PRICE: 40,                                       // la privatisation (or de la caisse commune)
  /* Les trois résidents-coureurs : croisière, poussée, la ligne qu'ils prennent (écart au bord de l'îlot), une
     chute possible. Réglés au banc sur le patineur simulé (`verify-course` § 4). */
  BOTS: [
    { vmax: 7.4, acc: 4.8, line: 1.9, stumble: true },
    { vmax: 8.0, acc: 5.4, line: 1.6, stumble: false },
    { vmax: 8.6, acc: 6.0, line: 1.35, stumble: false },
  ],
};
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
/* Un hachage (0..1) de deux entiers — un mélangeur complet : le premier jet, à deux multiplications, tirait le même
   côté pour toutes les petites graines (le résident le plus lent tombait dans 60 courses sur 60, vu au banc). */
function h32(a, b) {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(((b | 0) + 0x632be5ab) | 0, 0xc2b2ae35);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/* ── 1. LA PISTE ────────────────────────────────────────────────────────── */
export const startX = () => COURSE.CX + COURSE.START_DX;
export const laneY = (k) => COURSE.CY + COURSE.ISLAND.hy + COURSE.LANE0 + k * COURSE.LANE_STEP;
export const gridSlot = (k) => ({ x: COURSE.CX + COURSE.GRID_DX, y: laneY(k) });
/* La distance signée (cases) au bord de l'îlot, négative dedans — la figure des plots ET de la collision de course. */
export function islandSD(x, y) {
  const I = COURSE.ISLAND, hx = I.hx - I.r, hy = I.hy - I.r;
  const qx = Math.abs(x - COURSE.CX) - hx, qy = Math.abs(y - COURSE.CY) - hy;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - I.r;
}
/* La boucle à `d` cases du bord de l'îlot, parcourue dans le sens inverse des aiguilles d'une montre À L'ÉCRAN (vers l'est
   sur la droite sud), en abscisse curviligne `s` depuis la ligne de départ. Rend { x, y, tx, ty (la tangente), arc }. */
export function loopLength(d) {
  const I = COURSE.ISLAND, A = I.hx + d, B = I.hy + d, R = I.r + d;
  return 2 * (2 * A - 2 * R) + 2 * (2 * B - 2 * R) + 2 * Math.PI * R;
}
export function loopAt(d, s) {
  const I = COURSE.ISLAND, A = I.hx + d, B = I.hy + d, R = I.r + d, cx = COURSE.CX, cy = COURSE.CY;
  const Lh = 2 * A - 2 * R, Lv = 2 * B - 2 * R, Lq = Math.PI * R / 2, L = 2 * Lh + 2 * Lv + 4 * Lq;
  const s0 = startX() - (cx - A + R);                       // la ligne, depuis le début de la droite sud
  let u = ((s + s0) % L + L) % L;
  const arc = (ox, oy, a0, a1, t) => { const a = a0 + (a1 - a0) * t; return { x: ox + R * Math.cos(a), y: oy + R * Math.sin(a), tx: -Math.sin(a) * Math.sign(a1 - a0), ty: Math.cos(a) * Math.sign(a1 - a0), arc: true }; };
  if (u < Lh) return { x: cx - A + R + u, y: cy + B, tx: 1, ty: 0, arc: false }; u -= Lh;
  if (u < Lq) return arc(cx + A - R, cy + B - R, Math.PI / 2, 0, u / Lq); u -= Lq;
  if (u < Lv) return { x: cx + A, y: cy + B - R - u, tx: 0, ty: -1, arc: false }; u -= Lv;
  if (u < Lq) return arc(cx + A - R, cy - B + R, 0, -Math.PI / 2, u / Lq); u -= Lq;
  if (u < Lh) return { x: cx + A - R - u, y: cy - B, tx: -1, ty: 0, arc: false }; u -= Lh;
  if (u < Lq) return arc(cx - A + R, cy - B + R, -Math.PI / 2, -Math.PI, u / Lq); u -= Lq;
  if (u < Lv) return { x: cx - A, y: cy - B + R + u, tx: 0, ty: 1, arc: false }; u -= Lv;
  return arc(cx - A + R, cy + B - R, Math.PI, Math.PI / 2, Math.min(1, u / Lq));
}
/* Les plots, posés le long du bord de l'îlot (px du monde au pied de chaque plot). */
export function conePositions() {
  const L = loopLength(0), n = Math.round(L / COURSE.CONE_STEP), out = [];
  for (let k = 0; k < n; k++) { const p = loopAt(0, (k + 0.5) * L / n); out.push({ x: p.x, y: p.y }); }
  return out;
}

/* ── 2. LE COMPTE DES TOURS ─────────────────────────────────────────────── */
/* Un compteur pour un patineur : `update(x, y)` (cases) rend { laps, prog }. `prog` : l'ANGLE CUMULÉ autour du centre
   (en tours), compté depuis la ligne — continu, il classe en course (négatif derrière la ligne, au départ). `laps` : les
   tours bouclés — un tour ne se boucle qu'en FRANCHISSANT LA LIGNE d'ouest en est sur la droite sud avec `prog` au-delà
   du tour suivant moins un quart. Ni la marche arrière (l'angle recule), ni l'aller-retour sur la ligne (il ne fait pas
   le tour), ni le raccourci (l'îlot est solide pendant la course) ne paient. */
export function tracker(x0, y0) {
  const ang = (x, y) => Math.atan2(-(y - COURSE.CY), x - COURSE.CX);   // l'angle « mathématique » : il croît dans notre sens
  const lineA = ang(startX(), laneY(1)), sx = startX(), southY = COURSE.CY + COURSE.ISLAND.hy - 0.3;
  const wrap = (v) => ((v + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  let prevA = ang(x0, y0), rel = wrap(prevA - lineA), laps = 0, px = x0, py = y0;
  if (rel > 0.5) rel -= 2 * Math.PI;                                   // derrière la ligne : un peu moins que zéro
  return {
    update(x, y) {
      const a = ang(x, y);
      rel += wrap(a - prevA); prevA = a;
      const prog = rel / (2 * Math.PI);
      if (y > southY && py > southY && px < sx && x >= sx && prog > laps + 0.75) laps++;
      px = x; py = y;
      return { laps, prog };
    },
    get laps() { return laps; },
  };
}

/* ── 3. LES RÉSIDENTS-COUREURS ──────────────────────────────────────────── */
/* La course d'un résident, ENTIÈREMENT tirée de sa graine : rend { samples: [{ x, y, vx, vy, tumble }] à 20 Hz depuis le
   départ, finishMs (le temps d'arrivée, ou null) }. Ils prennent leur ligne en sortant de la grille, accélèrent, ralentissent
   un peu dans les virages, varient d'un tour à l'autre ; le plus lent peut tomber une fois. Calculé une fois par course. */
export function botRun(bot, lane, seed) {
  const HZ = 20, dt = 1 / HZ, L0 = loopLength(1.5);
  const d0 = laneY(lane) - (COURSE.CY + COURSE.ISLAND.hy);
  const lineD = bot.line + (h32(seed, 11) - 0.5) * 0.3;
  let t = 0, v = 0, f = -(startX() - (COURSE.CX + COURSE.GRID_DX)) / loopLength(d0);
  // ⚠️ `null` et pas −1 : derrière la ligne, au départ, le tour VAUT −1 (`floor` d'une fraction négative) — un « −1 »
  // voulant dire « pas de chute » faisait tomber le résident sur la grille, à chaque course (vu au banc).
  const stumbleLap = bot.stumble && h32(seed, 23) < 0.6 ? 1 + Math.floor(h32(seed, 29) * (COURSE.LAPS - 1)) : null;
  const stumbleF = 0.2 + 0.6 * h32(seed, 31);
  let tumbleLeft = 0, stumbled = false, finishMs = null;
  const samples = [];
  let prev = null;
  while (t < COURSE.MAX_MS / 1000) {
    const d = lineD + (d0 - lineD) * Math.exp(-t / 1.8);
    const L = loopLength(d), lap = Math.floor(f);
    const p = loopAt(d, f * L);
    const lapK = 1 + (h32(seed + lap * 7, 37) - 0.5) * 0.05;
    const target = bot.vmax * lapK * (p.arc ? 0.91 : 1);
    if (tumbleLeft > 0) { tumbleLeft -= dt; v *= Math.exp(-6 * dt); }
    else {
      if (!stumbled && lap === stumbleLap && f - lap >= stumbleF) { stumbled = true; tumbleLeft = 0.9; }
      v += Math.sign(target - v) * Math.min(Math.abs(target - v), (v < target ? bot.acc : 4) * dt);
    }
    f += v * dt / L;
    t += dt;
    const q = loopAt(d, f * loopLength(d));
    samples.push({ x: q.x, y: q.y, vx: prev ? (q.x - prev.x) / dt : 0, vy: prev ? (q.y - prev.y) / dt : 0, tumble: tumbleLeft > 0 });
    prev = q;
    if (finishMs == null && f >= COURSE.LAPS) { finishMs = Math.round(t * 1000); break; }
  }
  void L0;
  return { samples, finishMs, hz: HZ };
}
/* La position d'un résident à `ms` depuis le départ (interpolée), ou sa dernière (arrivé). */
export function botAt(run, ms) {
  const S = run.samples;
  if (!S.length) return null;
  const f = Math.max(0, ms) / 1000 * run.hz, i = Math.floor(f);
  if (i >= S.length - 1) return { ...S[S.length - 1], done: true };
  const a = S[i], b = S[i + 1], u = f - i;
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, vx: b.vx, vy: b.vy, tumble: a.tumble, done: false };
}

/* ── 4. L'ASPIRATION ────────────────────────────────────────────────────── */
/* Dans le sillage d'un autre (devant soi, dans l'axe de sa course, entre `near` et `far` cases, à moins de `side` de côté) :
   0..1, plus fort de près. `others` : [{ x, y }]. */
export function draftK(me, others) {
  const sp = Math.hypot(me.vx || 0, me.vy || 0);
  if (sp < 2) return 0;
  const ux = me.vx / sp, uy = me.vy / sp, D = COURSE.DRAFT;
  let best = 0;
  for (const o of others) {
    const dx = o.x - me.x, dy = o.y - me.y, ahead = dx * ux + dy * uy, side = Math.abs(dx * uy - dy * ux);
    if (ahead < D.near || ahead > D.far || side > D.side) continue;
    best = Math.max(best, (1 - (ahead - D.near) / (D.far - D.near)) * (1 - side / D.side * 0.5));
  }
  return clamp01(best);
}

/* ── 5. LE CLASSEMENT, LE FANTÔME ───────────────────────────────────────── */
/* `entries` : [{ id, name, ms (ou null : pas arrivé), bot }] → triés : les arrivés par temps (à égalité, l'humain
   d'abord, puis l'id), puis les autres. Rend une copie avec `rank` (1…). */
export function ranking(entries) {
  const out = entries.map((e) => ({ ...e }));
  out.sort((a, b) => {
    const am = a.ms == null ? Infinity : a.ms, bm = b.ms == null ? Infinity : b.ms;
    if (am !== bm) return am - bm;
    if (!!a.bot !== !!b.bot) return a.bot ? 1 : -1;
    return String(a.id) < String(b.id) ? -1 : 1;
  });
  out.forEach((e, i) => { e.rank = i + 1; });
  return out;
}
/* Le fantôme : des positions (cases) à `GHOST_HZ`, rangées au huitième de case dans le rectangle de la glace, un
   octet par coordonnée, en base64 — 5 tours ≈ 60 s ≈ 1 600 caractères dans la sauvegarde, une fois. */
const GX0 = RK.x0 - 1, GY0 = RK.y0 - 1;
const b64e = (bytes) => (typeof btoa === "function" ? btoa(String.fromCharCode(...bytes)) : Buffer.from(bytes).toString("base64"));
const b64d = (str) => (typeof atob === "function" ? Uint8Array.from(atob(str), (c) => c.charCodeAt(0)) : Uint8Array.from(Buffer.from(str, "base64")));
export function ghostEncode(points) {
  const bytes = new Uint8Array(points.length * 2);
  points.forEach((p, i) => { bytes[2 * i] = Math.max(0, Math.min(255, Math.round((p.x - GX0) * 8))); bytes[2 * i + 1] = Math.max(0, Math.min(255, Math.round((p.y - GY0) * 8))); });
  let s = "";
  for (let i = 0; i < bytes.length; i += 3000) s += b64e(bytes.subarray(i, i + 3000));
  return bytes.length > 3000 ? null : s;
}
export function ghostDecode(str) {
  if (!str) return [];
  const b = b64d(str), out = [];
  for (let i = 0; i + 1 < b.length; i += 2) out.push({ x: GX0 + b[i] / 8, y: GY0 + b[i + 1] / 8 });
  return out;
}
export function ghostAt(points, ms) {
  if (!points || !points.length) return null;
  const f = Math.max(0, ms) / 1000 * COURSE.GHOST_HZ, i = Math.floor(f);
  if (i >= points.length - 1) return { ...points[points.length - 1], done: true };
  const a = points[i], b = points[i + 1], u = f - i;
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, vx: (b.x - a.x) * COURSE.GHOST_HZ, vy: (b.y - a.y) * COURSE.GHOST_HZ, done: false };
}
/* Un chrono lisible : 1:23.45 */
export function fmtMs(ms) {
  if (ms == null || !isFinite(ms)) return "—";
  const t = Math.max(0, Math.round(ms / 10)), cs = t % 100, s = Math.floor(t / 100) % 60, m = Math.floor(t / 6000);
  return `${m}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}
