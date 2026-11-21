/* =============================================================================
   oiseaux.js — LES GRUES CENDRÉES QUI PASSENT (2026-11-21), PUR.
   -----------------------------------------------------------------------------
   Un ajout de la journée libre du 2026-11-21 (« sois libre comme l'air […] vole comme un oiseau »), dans la suite des ombres des
   nuages : le CIEL, qu'on ne voit jamais d'en haut, se lit par ce qui le traverse. En novembre et en mars, au-dessus de la France,
   passent les grues cendrées en V, haut, sans s'arrêter (on ne les entend pas encore ici : pas de son). Ici :
   · UN VOL PAR CRÉNEAU, PEUT-ÊTRE (`SLOT_S` secondes réelles) : un hachage du créneau décide s'il y a un vol, à quelle seconde il
     passe, combien de grues, par où — deux joueurs voient le même vol au même instant, et rien ne circule (§3) ;
   · SEULEMENT EN MIGRATION (`phase` de l'année, `E.seasonPhaseAt` : 0 printemps … 4) : l'automne avancé vers le SUD-OUEST, la fin
     de l'hiver et le début du printemps vers le NORD-EST ; de jour ; jamais sous la pluie, la neige qui tombe ni l'orage ;
   · LE V : une tête, deux branches inégales (`armOf`), chaque grue ondule un peu à sa place ; elles battent lentement, puis planent
     ensemble quelques secondes (`flapOf`) — le vol des grandes migratrices ;
   · leur TRAJET traverse toute la carte en passant près de son centre (là où l'on est le plus souvent), à `SPEED` cases/s.
   ⚠️ AUCUNE HORLOGE LUE : l'appelant passe `nowMs` (l'horloge réelle), l'heure de jeu et le temps. Le dessin est `oiseauxArt.js`.
   Désactivable : menu dev, « Ajouts de la nuit du 21 novembre » (`AJOUTS.cranes`, FermeGame.js). Banc : `tools/verify-oiseaux.mjs`.
   ========================================================================== */

export const GRUES = {
  SLOT_S: 360,          // un créneau de six minutes réelles
  ODDS: 0.42,           // la chance d'un vol dans un créneau, au plus fort de la migration
  SPEED: 4.2,           // cases par seconde (une vraie grue va trois fois plus vite : on la laisse regarder)
  ALT: 9,               // cases : la hauteur de vol (le décalage de l'oiseau au-dessus de son trajet au sol)
  N: [7, 15],           // grues par vol
  GAP: 1.15,            // cases entre deux grues le long d'une branche
  HOURS: [7.5, 18.5],   // de jour seulement (heures de jeu)
};
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function hash32(a, b) {
  let h = (Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
const u01 = (h) => (h >>> 8) / 16777216;

/* La migration à la phase `phase` de l'année (0..4 : printemps 0, été 1, automne 2, hiver 3) : { k (0..1), dir (+1 vers le
   sud-ouest, −1 vers le nord-est) } — l'automne de mi-saison à la fin, la fin de l'hiver et le premier tiers du printemps. */
export function migrationAt(phase) {
  const p = ((phase % 4) + 4) % 4;
  const autumn = smooth(2.15, 2.45, p) * (1 - smooth(2.85, 3.05, p));
  const spring = p >= 3 ? smooth(3.6, 3.85, p) : 1 - smooth(0.25, 0.45, p);
  return autumn >= spring ? { k: autumn, dir: 1 } : { k: spring, dir: -1 };
}
/* Le temps empêche-t-il un vol ? (`W` de meteo.js) — les grues ne passent pas dans la pluie, la neige qui tombe ni l'orage. */
export const weatherOk = (W) => !W || ((W.rain || 0) < 0.15 && (W.snow || 0) < 0.15 && (W.bolts || 0) < 0.1 && (W.dark || 0) < 0.6);

/* LE VOL DU CRÉNEAU qui contient `nowMs` (ou du précédent, s'il n'a pas fini de traverser) : null, ou
   { id, t0 (ms : l'instant où la tête passe au point central), x, y (le point central, cases), hx, hy (le cap, unitaire), n,
   arms: [gauche, droite] } — un vol PUR, à évaluer à tout instant par `flockAt`. `mapW`, `mapH` : la carte (cases). */
export function flightOf(slot, seed, mapW, mapH, migK, dir) {
  const h = hash32(slot * 2654435 + 17, seed | 0);
  if (u01(h) >= GRUES.ODDS * clamp01(migK)) return null;
  const S = GRUES.SLOT_S * 1000;
  const t0 = slot * S + (0.15 + 0.7 * u01(hash32(h, 1))) * S;
  // le cap : sud-ouest à l'automne (vers le bas et la gauche de l'écran), nord-est au retour, ±25°
  const base = dir > 0 ? Math.PI * 0.75 : -Math.PI * 0.25, a = base + (u01(hash32(h, 2)) - 0.5) * 0.87;
  const x = mapW * (0.3 + 0.4 * u01(hash32(h, 3))), y = mapH * (0.3 + 0.4 * u01(hash32(h, 4)));
  const n = GRUES.N[0] + (hash32(h, 5) % (GRUES.N[1] - GRUES.N[0] + 1));
  const left = Math.floor((n - 1) * (0.35 + 0.3 * u01(hash32(h, 6))));
  return { id: slot, t0, x, y, hx: Math.cos(a), hy: Math.sin(a), n, arms: [left, n - 1 - left], seed: h };
}
/* Les vols à considérer à l'instant `nowMs` : celui du créneau, et celui du précédent (un vol dure plus qu'un créneau sur une
   grande carte : une demi-traversée de 168 cases à 4,2 cases/s fait vingt secondes ; on garde large). */
export function flightsNear(nowMs, seed, mapW, mapH, migK, dir) {
  const S = GRUES.SLOT_S * 1000, slot = Math.floor(nowMs / S), out = [];
  for (const s of [slot - 1, slot]) { const f = flightOf(s, seed, mapW, mapH, migK, dir); if (f) out.push(f); }
  return out;
}
/* La place d'une grue dans le V : `i` 0 la tête ; ensuite alternativement la branche gauche et la droite, chacune jusqu'à sa longueur. */
export function slotOf(fl, i) {
  if (i === 0) return { back: 0, side: 0 };
  let L = 0, R = 0;
  for (let k = 1; k <= i; k++) {
    const goLeft = (k % 2 === 1 && L < fl.arms[0]) || R >= fl.arms[1];
    if (k === i) return goLeft ? { back: L + 1, side: -(L + 1) } : { back: R + 1, side: R + 1 };
    if (goLeft) L++; else R++;
  }
  return { back: 0, side: 0 };
}
/* Le battement d'aile d'une grue à `tSec` : { flap (phase, rad), gliding } — elles battent lentement (~1 s), et tout le vol plane
   ensemble quelques secondes de temps en temps ; chacune garde un petit décalage de phase. */
export function flapOf(fl, i, tSec) {
  const cyc = 9, u = ((tSec + (fl.seed % 97) / 13) % cyc + cyc) % cyc;
  const gliding = u > 6.2 && u < 8.6;
  return { flap: tSec * 2 * Math.PI * 0.95 + i * 0.55, gliding };
}
/* Le vol à l'instant `nowMs` : les grues, en cases du sol (`gx`, `gy` : le point du sol SOUS chaque grue) et leur ondulation. Rend
   [] si le vol n'est pas encore sur la carte, ou l'a quittée (marge de 12 cases). */
export function flockAt(fl, nowMs, mapW, mapH) {
  const tS = (nowMs - fl.t0) / 1000, d = tS * GRUES.SPEED;
  const nx = -fl.hy, ny = fl.hx, out = [];
  for (let i = 0; i < fl.n; i++) {
    const s = slotOf(fl, i);
    const wob = Math.sin(tS * 0.7 + i * 1.9) * 0.12, wob2 = Math.cos(tS * 0.53 + i * 2.3) * 0.1;
    const along = d - s.back * GRUES.GAP * 0.85 + wob, side = s.side * GRUES.GAP * 0.6 + wob2;
    const gx = fl.x + fl.hx * along + nx * side, gy = fl.y + fl.hy * along + ny * side;
    if (gx < -12 || gy < -12 || gx > mapW + 12 || gy > mapH + 12) continue;
    out.push({ i, gx, gy, ...flapOf(fl, i, tS) });
  }
  return out;
}
/* Tout ce qu'il faut à l'image : les grues des vols en cours (`hx`, `hy` : le cap) ; [] hors migration, de nuit ou par mauvais temps. */
export function cranesNow({ nowMs, seed, mapW, mapH, phase, hour, W }) {
  if (!(hour >= GRUES.HOURS[0] && hour <= GRUES.HOURS[1]) || !weatherOk(W)) return [];
  const m = migrationAt(phase);
  if (m.k <= 0.01) return [];
  const out = [];
  for (const fl of flightsNear(nowMs, seed, mapW, mapH, m.k, m.dir)) for (const b of flockAt(fl, nowMs, mapW, mapH)) out.push({ ...b, hx: fl.hx, hy: fl.hy, fid: fl.id });
  return out;
}
