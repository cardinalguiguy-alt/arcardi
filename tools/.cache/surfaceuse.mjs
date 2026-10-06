/* =============================================================================
   surfaceuse.js — L'USURE DE LA GLACE ET LA SURFACEUSE DE LA PATINOIRE (2026-10-06), PUR.
   -----------------------------------------------------------------------------
   Guillaume : « avoir plusieurs états de lissage de la piste en fonction de l'usage, et pouvoir demander un lissage de la
   piste au chalet quand il y a trop d'usure » ; tranché avec lui : l'usure est PARTAGÉE et purement VISUELLE (elle ne change
   pas la glisse), une SURFACEUSE peinte passe sur la glace pour la lisser, la demande est LIBRE en pratique normale — et
   pour le début d'une course, la glace est toujours lissée.

   Ce fichier ne sait rien du jeu, du réseau ni du dessin. Il porte :
   · L'USURE (`iceUseAdd`, `iceLevelOf`) : un compteur d'usage (en « cases patinées », les figures et le freinage brut usent
     plus), quatre NIVEAUX — lisse, marquée, rayée, usée. L'hôte seul compte, et ne diffuse que le NIVEAU quand il change ;
   · LE TRAJET DE LA MACHINE (`surfacerAt`) : elle sort de sa place à l'est du chalet, entre par le portillon est, balaie la
     glace en allers-retours (huit couloirs d'est en ouest et retour), et rentre. UNE fonction du temps depuis le début de la
     passe : chacun la calcule seul, zéro message de position (§3 : ce qui peut se déduire ne se diffuse pas) ;
   · LA ZONE DÉJÀ LISSÉE (`sweptRects`, `sweepWhen`) : les rectangles que la lame a passés à cet instant — le dessin y remet la
     glace neuve et y pose le brillant de l'eau fraîche, et le jeu y efface les traces de lames.
   ⚠️ RÉSEAU : seules des DURÉES voyagent (`smooth`, la durée de la passe ; chacun la date à sa réception). L'hôte ne parle
   que quand le niveau change, quand la passe démarre, et quand elle finit : une poignée de messages par soirée.
   ⚠️ LA MACHINE EST DÉCORATIVE ET NON SOLIDE QUAND ELLE ROULE (on ne bloque personne sur la glace) ; garée, elle occupe sa
   place (`SURF.PARK`, lue par `blockedTown`).
   `tools/verify-surfaceuse.mjs` joue tout ça : les seuils, le trajet, la couverture de TOUTE la glace.
   ========================================================================== */
import * as C from "./fermeConstants.mjs";

const RK = C.TOWN_RINK;

export const ICE = {
  /* Les seuils d'usage (cases patinées, tous les patineurs confondus) où l'on passe aux niveaux 1 (marquée), 2 (rayée),
     3 (usée). Un patineur à la croisière fait ~7 cases/s : seul, la glace est marquée en ~1 min, rayée en ~3 min, usée en
     ~7 min ; à trois, trois fois plus vite — une soirée de jeu l'use, un tour de piste non. */
  USE: [450, 1400, 3000],
  TRICK_K: 1.8,          // un patineur en figure (saut, vrille, axel) use plus que celui qui glisse
  STOP_K: 2.6,           // un freinage brut use plus encore (les lames rabotent la glace)
  MAX_V: 9.5,            // la vitesse comptée au plus (cases/s) : un à-coup de latence n'use pas la glace d'un coup
  FADE_MS: 1600,         // le fondu d'un changement de niveau (et d'un lissage forcé, au départ d'une course)
  WET_MS: 9000,          // le brillant de l'eau fraîche, derrière la lame
};
export const ICE_LEVELS = 4;
/* Le niveau (0..3) d'un compteur d'usage. */
export function iceLevelOf(use) {
  let lv = 0;
  for (let i = 0; i < ICE.USE.length; i++) if (use >= ICE.USE[i]) lv = i + 1;
  return lv;
}
/* L'usage d'un patineur pendant `dt` secondes : sa vitesse (cases/s) × le coefficient de ce qu'il fait (`k` : 1 en glisse). */
export function iceUseAdd(use, v, dt, k) {
  const vv = Math.max(0, Math.min(ICE.MAX_V, +v || 0)), d = Math.max(0, Math.min(0.25, +dt || 0));
  return Math.max(0, +use || 0) + vv * d * (k > 0 ? k : 1);
}
/* Le coefficient d'usure d'un patineur d'après le code de figure de son paquet de position (`patin.js` : TRICK_CODE). */
export function iceTrickK(code) {
  const c = code | 0;
  if (c === 6) return ICE.STOP_K;                                  // stop
  if (c === 1 || c === 2 || c === 3 || c === 7 || c === 8 || c === 9) return ICE.TRICK_K;   // saut, vrilles, axel
  return 1;
}
/* La part (0..1) du chemin vers le niveau suivant — pour l'indicateur du chalet. */
export function iceFrac(use) {
  const lv = iceLevelOf(use);
  if (lv >= ICE_LEVELS - 1) return 1;
  const a = lv ? ICE.USE[lv - 1] : 0, b = ICE.USE[lv];
  return Math.max(0, Math.min(1, (use - a) / (b - a)));
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ LE TRAJET DE LA SURFACEUSE (cases). Une suite de JAMBES : { x0, y0, x1, y1, ms, sweep, t0 }.
   ╚════════════════════════════════════════════════════════════════════════════ */
export const SURF = {
  SPEED: 6.4,            // cases/s : un peu moins que la croisière d'un patineur (7,6)
  PAUSE_MS: 200,         // l'arrêt au bout d'un couloir (elle tourne)
  HALF_LEN: 0.9,         // la demi-longueur de la lame (le long du cap)
  HALF_W: 1.3,           // sa demi-largeur (en travers) : 2,6 cases de glace refaite par couloir
  LANES: 8,
};
const GATE = C.TOWN_RINK_GATES.find((g) => g.side === "e");
const YG = (GATE.a + GATE.b + 1) / 2;                              // l'axe du portillon est
const XE = RK.x1 + 1 - SURF.HALF_LEN, XW = RK.x0 + SURF.HALF_LEN;  // le centre de la machine, bout à bout : la lame touche la bande
const TOP = RK.y0 + 1.2, BOT = RK.y1 + 1 - 1.2;
/* Sa place, à l'est du chalet : garée de face (cap sud) — la lame du bas touche la glace de l'allée, le fanal éteint. */
export const PARK = { x: RK.x1 + 1 + 4.2, y: YG + 3.4 };
function buildLegs() {
  const pts = [], add = (x, y, sweep, pause) => pts.push({ x, y, sweep: !!sweep, pause: pause || 0 });
  add(PARK.x, PARK.y, false, 350);
  add(PARK.x, YG, false, 0);                                       // elle remonte vers l'axe du portillon
  add(XE, YG, false, 250);                                         // elle entre
  add(XE, TOP, true, SURF.PAUSE_MS);                               // le long de la bande est, vers le nord
  const dy = (BOT - TOP) / (SURF.LANES - 1);
  for (let k = 0; k < SURF.LANES; k++) {
    const y = TOP + k * dy, west = k % 2 === 0;
    if (k > 0) add(west ? XE : XW, y, true, SURF.PAUSE_MS);        // le changement de couloir (la machine descend d'un cran)
    add(west ? XW : XE, y, true, SURF.PAUSE_MS);                   // le couloir
  }
  add(XE, YG, false, 250);                                         // elle remonte le long de la bande est
  add(PARK.x, YG, false, 0);                                       // elle ressort
  add(PARK.x, PARK.y, false, 0);                                   // et se gare
  const legs = [];
  let t = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
    if (a.pause) { legs.push({ x0: a.x, y0: a.y, x1: a.x, y1: a.y, ms: a.pause, sweep: false, t0: t }); t += a.pause; }
    const ms = len / SURF.SPEED * 1000;
    legs.push({ x0: a.x, y0: a.y, x1: b.x, y1: b.y, ms, sweep: b.sweep, t0: t });
    t += ms;
  }
  return { legs, total: t };
}
const PATH = buildLegs();
/* Le temps total d'une passe (ms) : de la sortie de sa place au retour. */
export const PASS_MS = Math.round(PATH.total);
export const SURF_LEGS = PATH.legs;
/* Le cap : 0 sud, 1 nord, 2 ouest, 3 est (la convention des personnages). */
function dirOf(dx, dy, fallback) {
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return fallback;
  return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
}
/* La machine `ms` après le début de la passe : { x, y, dir, moving, parked } (cases). `ms` < 0 ou ≥ PASS_MS : garée. */
export function surfacerAt(ms) {
  if (!(ms > 0) || ms >= PASS_MS) return { x: PARK.x, y: PARK.y, dir: 0, moving: false, parked: true };
  const legs = PATH.legs;
  let lo = 0, hi = legs.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (legs[mid].t0 <= ms) lo = mid; else hi = mid - 1; }
  const L = legs[lo], p = L.ms > 0 ? Math.max(0, Math.min(1, (ms - L.t0) / L.ms)) : 1;
  let dir;
  if (L.x0 === L.x1 && L.y0 === L.y1) {
    // un arrêt : elle garde le cap de la jambe d'avant, puis prend celui de la suivante (elle tourne à mi-arrêt)
    const prev = legs[lo - 1] || null, next = legs[lo + 1] || null;
    const dp = prev ? dirOf(prev.x1 - prev.x0, prev.y1 - prev.y0, 0) : 0, dn = next ? dirOf(next.x1 - next.x0, next.y1 - next.y0, dp) : dp;
    dir = p < 0.5 ? dp : dn;
  } else dir = dirOf(L.x1 - L.x0, L.y1 - L.y0, 0);
  // une accélération douce au départ de chaque jambe, une décélération à l'arrivée (la machine est lourde)
  const e = p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p), q = L.sweep ? p : (0.3 * e + 0.7 * p);
  return { x: L.x0 + (L.x1 - L.x0) * q, y: L.y0 + (L.y1 - L.y0) * q, dir, moving: !(L.x0 === L.x1 && L.y0 === L.y1), parked: false };
}
/* Les rectangles de glace DÉJÀ LISSÉE à `ms` : [{ x0, y0, x1, y1, t1 }] (cases ; `t1` : l'instant où la lame a fini ce morceau,
   ou `ms` si elle y est encore — le brillant de l'eau fraîche s'en sert). Hors passe (`ms` ≤ 0) : aucun. */
export function sweptRects(ms) {
  const out = [];
  if (!(ms > 0)) return out;
  for (const L of PATH.legs) {
    if (!L.sweep || ms <= L.t0) continue;
    const p = Math.max(0, Math.min(1, (ms - L.t0) / L.ms));
    const bx = L.x0 + (L.x1 - L.x0) * p, by = L.y0 + (L.y1 - L.y0) * p;
    const horiz = Math.abs(L.x1 - L.x0) >= Math.abs(L.y1 - L.y0);
    const hl = SURF.HALF_LEN, hw = SURF.HALF_W;
    out.push(horiz
      ? { x0: Math.min(L.x0, bx) - hl, x1: Math.max(L.x0, bx) + hl, y0: L.y0 - hw, y1: L.y0 + hw, t1: p >= 1 ? L.t0 + L.ms : ms }
      : { x0: L.x0 - hw, x1: L.x0 + hw, y0: Math.min(L.y0, by) - hl, y1: Math.max(L.y0, by) + hl, t1: p >= 1 ? L.t0 + L.ms : ms });
  }
  return out;
}
/* L'instant (ms depuis le début de la passe) où le point (cases) est lissé pour la première fois ; `Infinity` s'il ne l'est jamais. */
export function sweepWhen(px, py) {
  for (const L of PATH.legs) {
    if (!L.sweep) continue;
    const horiz = Math.abs(L.x1 - L.x0) >= Math.abs(L.y1 - L.y0), hl = SURF.HALF_LEN, hw = SURF.HALF_W;
    if (horiz) {
      if (Math.abs(py - L.y0) > hw) continue;
      const lo = Math.min(L.x0, L.x1) - hl, hi = Math.max(L.x0, L.x1) + hl;
      if (px < lo || px > hi) continue;
      const need = L.x1 > L.x0 ? px - hl : px + hl, p = (need - L.x0) / (L.x1 - L.x0);   // la position de la machine qui couvre le point
      return L.t0 + L.ms * Math.max(0, Math.min(1, p));
    }
    if (Math.abs(px - L.x0) > hw) continue;
    const lo = Math.min(L.y0, L.y1) - hl, hi = Math.max(L.y0, L.y1) + hl;
    if (py < lo || py > hi) continue;
    const need = L.y1 > L.y0 ? py - hl : py + hl, p = (need - L.y0) / (L.y1 - L.y0);
    return L.t0 + L.ms * Math.max(0, Math.min(1, p));
  }
  return Infinity;
}
/* Le point est-il DANS la glace lissée à `ms` (au sens des rectangles) ? Sert à effacer les traces de lames. */
export function isSwept(ms, px, py) {
  for (const r of sweptRects(ms)) if (px >= r.x0 && px <= r.x1 && py >= r.y0 && py <= r.y1) return true;
  return false;
}
