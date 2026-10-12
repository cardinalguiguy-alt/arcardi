/* =============================================================================
   chantier.js — LES CHANTIERS DE LA PLACE (2026-10-11), PUR : L'HORLOGE ET LE SCRIPT.
   -----------------------------------------------------------------------------
   Guillaume : « installation pendant 3 h réelles de transition (démontage patinoire, montage skatepark avec ouvriers en yellow
   vests, manutention soignée avec soudeurs, machines). Tout ça doit être soigné. Ces ouvriers serviront ailleurs dans VT ».
   Tranché avec lui (2026-10-11) : le LUNDI du changement de saison, de 14 h à 17 h HEURE DE PARIS ; un camion-grue, un chariot
   télescopique, une camionnette d'équipe ; la glace FOND sur place (le froid coupé, on racle l'eau) ; la place est FERMÉE (on
   regarde depuis l'allée) ; la même équipe servira aux autres chantiers de la place, à la voirie, aux façades.

   CE FICHIER NE DESSINE RIEN ET NE SAIT RIEN DU RÉSEAU : il dit, pour un instant, ce que la place porte (`placeStateAt`), et où
   chaque ouvrier, chaque engin se trouve et ce qu'il fait (`crewAt`, `machinesAt`) — une PURE FONCTION DE L'HEURE. Chaque client la
   calcule seul : tout le monde voit le même ouvrier porter la même feuille au même endroit, et pas un message ne part (§3).
   ⚠️ L'HEURE DE PARIS SANS `Intl` : la règle européenne (dernier dimanche de mars → dernier dimanche d'octobre, à 1 h UTC) se
   calcule ; un fuseau lu dans le navigateur dépendrait de la machine.
   ⚠️ LE SCRIPT SE DÉDUIT DU PLAN DU PARK (`skatepark.js`) : un module déplacé déplace ses ouvriers. Aucune coordonnée de chantier
   n'est écrite à la main, sauf celles des engins (où ils se garent, d'où ils viennent).
   `tools/verify-chantier.mjs` joue la journée : la fenêtre (heure d'été et d'hiver), l'ordre des phases, chaque feuille posée avant
   la fin, aucun ouvrier dans un module ni hors de la place fermée, des marches à une vitesse humaine.
   ========================================================================== */
import * as C from "./fermeConstants";
import * as SP from "./skatepark";

export const CHANTIER = { START_MIN: 14 * 60, DUR_MIN: 180 };
const DAY = 24 * 3600 * 1000;

/* Le décalage de Paris sur UTC (minutes) à l'instant `ms` : +120 l'été (du dernier dimanche de mars à 1 h UTC au dernier dimanche
   d'octobre à 1 h UTC), +60 sinon. */
export function parisOffsetMin(ms) {
  const y = new Date(ms).getUTCFullYear();
  const lastSun = (m) => { const d = new Date(Date.UTC(y, m + 1, 0, 1)); return d.getTime() - d.getUTCDay() * DAY; };
  return ms >= lastSun(2) && ms < lastSun(9) ? 120 : 60;
}
/* La fenêtre du chantier d'une saison qui commence à `seasonStart` (un lundi, 0 h UTC) : ce lundi, 14 h–17 h à Paris. */
export function chantierWindow(seasonStart) {
  const off = parisOffsetMin(seasonStart + 12 * 3600 * 1000);
  const t0 = seasonStart + (CHANTIER.START_MIN - off) * 60000;
  return { t0, t1: t0 + CHANTIER.DUR_MIN * 60000 };
}
/* CE QUE LA PLACE PORTE à l'instant `ms`. `open` : le park est ouvert au public (`SPK.PARK_OPEN`) — fermé, rien ne change (la
   patinoire l'hiver, la place vide le reste) ; `forced` : une saison forcée au menu dev (rien n'est daté : la saison seule décide).
   Rend { kind: "winter" | "park" | "market" | "chantier", type?: "montage" | "demontage", t?: minutes depuis le début }. */
export function placeStateAt(ms, open, forced) {
  const SEASONS = ["spring", "summer", "autumn", "winter"];
  if (forced) return { kind: forced === "winter" ? "winter" : forced === "spring" && open ? "park" : "market" };
  const k = Math.floor(Math.max(0, ms - C.SEASON_EPOCH) / C.SEASON_REAL_MS), season = SEASONS[k % 4];
  if (season === "winter") return { kind: "winter" };
  if (!open || season === "autumn") return { kind: "market" };
  const w = chantierWindow(C.SEASON_EPOCH + k * C.SEASON_REAL_MS);
  if (season === "spring") {
    if (ms < w.t0) return { kind: "winter" };     // la patinoire tient jusqu'au chantier (la glace d'une matinée de printemps)
    if (ms < w.t1) return { kind: "chantier", type: "montage", t: (ms - w.t0) / 60000 };
    return { kind: "park" };
  }
  if (ms < w.t0) return { kind: "park" };          // l'été : le park tient jusqu'au chantier
  if (ms < w.t1) return { kind: "chantier", type: "demontage", t: (ms - w.t0) / 60000 };
  return { kind: "market" };
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ LE DÉROULÉ DU MONTAGE (minutes depuis 14 h) — ce que le dessin lit pour savoir ce qui est là.
   ╚════════════════════════════════════════════════════════════════════════════
   0-6 la camionnette arrive, l'équipe pose les barrières de chantier ; 4-50 le froid coupé, la glace FOND (des flaques qu'on racle
   vers les grilles) ; 8-40 la bande de la patinoire démontée planche par planche ; 22-40 les mâts, les braseros ; 30-44 le chalet
   levé à la grue sur le plateau du camion ; 46-80 les CADRES d'acier des modules, soudés ; 72-150 les feuilles de contreplaqué,
   module par module, feuille par feuille (le chariot les apporte, deux porteurs les posent, on visse) ; 140-160 les copings, les
   rails, les garde-corps ; 156-168 la cabane de location déposée à la grue ; 168-178 les barrières retirées, la camionnette repart.
   Le DÉMONTAGE (début de l'été) est le même film à l'envers, sans patinoire : le park part (feuilles, puis cadres), la place reste vide. */
export const PHASE = {
  FENCE: [0.5, 6], MELT: [4, 40], PUDDLE: [40, 50], BAND: [8, 40], POLES: [22, 40], CHALET: [30, 44],
  FRAMES: [46, 80], SHEETS: [72, 150], STEEL: [140, 160], SHED: [156, 168], UNFENCE: [163, 177], VAN_OUT: [177, 180],
};
/* L'ordre des modules au montage (le reste suit `SP.PARK_PRIMS`) : la mini-rampe et sa galerie d'abord (le nord-ouest), le quarter,
   la funbox, le plan incliné, la caisse. */
const MOD_ORDER = ["mini", "gallery", "stairN", "stairW", "quarter", "funbox", "bank", "box"];
/* Les fenêtres de chaque PRIMITIVE : son cadre (`f0`→`f1`), ses feuilles (`s0`→`s1`). Réparties sur les phases au prorata de la
   surface de chaque primitive (une grande courbe prend plus de temps qu'une marche). */
let PRIM_TL = null;
export function primTimeline() {
  if (PRIM_TL) return PRIM_TL;
  const prims = SP.PARK_PRIMS.map((p, i) => ({ i, mod: p.mod, area: Math.max(0.5, (p.bb[2] - p.bb[0]) * (p.bb[3] - p.bb[1])) }));
  prims.sort((a, b) => MOD_ORDER.indexOf(a.mod) - MOD_ORDER.indexOf(b.mod) || a.i - b.i);
  const tot = prims.reduce((s, p) => s + p.area, 0);
  const out = new Array(SP.PARK_PRIMS.length);
  let accF = 0, accS = 0;
  const [F0, F1] = PHASE.FRAMES, [S0, S1] = PHASE.SHEETS;
  for (const p of prims) {
    const f0 = F0 + (F1 - F0) * accF / tot; accF += p.area; const f1 = F0 + (F1 - F0) * accF / tot;
    const s0 = S0 + (S1 - S0) * accS / tot; accS += p.area; const s1 = S0 + (S1 - S0) * accS / tot;
    out[p.i] = { f0, f1, s0, s1, mod: p.mod };
  }
  PRIM_TL = out;
  return out;
}
/* L'instant (minutes) où un pixel du park apparaît au montage : `kind` "frame" (l'acier du cadre) ou "sheet" (une feuille, rangée
   `row` et colonne `col` de sa primitive : l'ordre de pose va du pied de la pente vers le haut, de gauche à droite). Les tubes, copings
   et arêtes d'acier : la phase STEEL. Au démontage, le film s'inverse (`demontageMin`). */
export function buildMinute(prim, kind, row, col) {
  const tl = primTimeline()[prim];
  if (!tl) return PHASE.STEEL[0];
  if (kind === "frame") return tl.f0 + (tl.f1 - tl.f0) * 0.5 * ((col | 0) % 3) / 2;
  if (kind === "steel") return PHASE.STEEL[0] + (PHASE.STEEL[1] - PHASE.STEEL[0]) * ((prim % 7) / 7);
  const n = 12, k = ((row | 0) * 3 + (col | 0) + 64) % n;   // une feuille après l'autre, en balayant la primitive
  return tl.s0 + (tl.s1 - tl.s0) * (k + 0.5) / n;
}
export function demontageMinute(m) { return CHANTIER.DUR_MIN - m; }
/* 2026-10-12 — Les primitives qui portent déjà assez de bois pour faire de l'OMBRE à la minute `mt` du montage (la moitié de leurs
   feuilles posées) : 1/0 par primitive. Une charpente ne fait pas d'ombre pleine — c'est l'ombre qui dit que le module a pris corps. */
export function primsBuiltAt(mt) {
  const tl = primTimeline(), out = new Uint8Array(tl.length);
  tl.forEach((q, i) => { out[i] = q && mt >= q.s0 + 0.5 * (q.s1 - q.s0) ? 1 : 0; });
  return out;
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ L'ÉQUIPE ET SES TÂCHES — chaque ouvrier a un SCRIPT : une suite d'étapes { t0, t1, act, a: [x, y], b: [x, y], dir, with }.
   ╚════════════════════════════════════════════════════════════════════════════
   act : "walk" (de a à b), "carry" (de a à b, à deux, une charge `load` entre eux — le partenaire `with` marche en miroir),
   "fence" (poser un panneau de barrière), "squeegee" (racler l'eau vers une grille), "weld" (à genoux, masque baissé), "screw"
   (accroupi, la visseuse), "point" (le chef montre), "stand", "ride" (dans un engin : il n'est pas dessiné à pied).
   Les positions sont des PIEDS, en cases de la ville. ⚠️ Un script se construit une fois et se lit par recherche dichotomique. */
export const CREW = [
  { id: "chef", look: "chef:0", gender: "m", outfit: 2 },
  { id: "p1", look: "ouvrier:0", gender: "m", outfit: 5 },
  { id: "p2", look: "ouvrier:3", gender: "f", outfit: 7 },
  { id: "p3", look: "ouvrier:2", gender: "m", outfit: 9 },
  { id: "p4", look: "ouvrier:4", gender: "m", outfit: 3 },
  { id: "s1", look: "soudeur:0", gender: "m", outfit: 11 },
  { id: "s2", look: "soudeur:1", gender: "f", outfit: 6 },
  { id: "c1", look: "conducteur:5", gender: "m", outfit: 4 },
];
const WALK_V = 2.0, CARRY_V = 1.3;   // cases/s : on marche à 2,3 m/s sur un chantier, on porte une feuille plus lentement
const P = SP.PARK;
/* Les engins : où ils se garent (cases de la ville), d'où ils arrivent. La rue du nord (le boulevard) et l'allée pavée de l'est. */
export const MACHINE_SPOTS = {
  vanRoad: { from: [20, 70.6], to: [P.x0 + 10, 70.6], dir: 0 },                // la camionnette, sur le boulevard, au nord de la place (entre deux arbres)
  // le camion-grue, sur l'allée pavée de l'est : il y entre en marche arrière (l'avant à l'est), le bout du plateau à la porte de l'est
  craneTruck: { from: [P.x0 + P.w + 20, 93.6], to: [P.x0 + P.w + 4.6, 93.6], dir: 3 },
  teleDepot: [P.x0 + P.w - 2.5, P.y0 + P.h - 3],                               // le chariot, dans le coin sud-est de la place
  /* 2026-10-12 — le chariot attend sur l'allée pavée de l'est, derrière le camion (premier jet : garé SUR la glace, dans le coin de
     la bande, dès la troisième minute — il n'avait pu y entrer par nulle part). Il entre par la porte de l'est quand la bande est
     démontée et la glace partie, ressort à la fin et s'en va par l'allée. */
  telePark: [P.x0 + P.w + 11.2, 94.9],   // devant le nez du camion garé (pas contre sa cabine)
};
export const TELE = { IN: [44.5, 47], OUT: [168, 170.5], GONE: 174 };
/* 2026-10-12 — LA BARRIÈRE SUIT LE BORD DU DALLAGE (premier jet : sur l'allée de terre, à une case et demie — elle coupait l'allée de
   l'est en deux, à travers le chalet, et le camion-grue se garait par-dessus). L'allée reste aux passants, qui regardent par-dessus.
   Deux PORTES : celle du NORD (l'équipe, depuis la camionnette ; à l'est de l'escalier de la galerie, qui se monte dans l'allée) et
   celle de l'EST (le chariot ; c'est l'entrée du futur park, `SP.EAST_GATE`). Les panneaux viennent d'une PALETTE posée sur
   l'accotement du boulevard : un aller-retour par panneau, et le tas baisse (`palletAt`). */
export const FENCE = {
  xW: P.x0 - 0.15, xE: P.x0 + P.w + 0.2, yN: 73.95, yS: P.y0 + P.h + 0.15, PW: 2.2,
  gateN: [P.x0 + 13.1, P.x0 + 15.3], gateE: [P.y0 + SP.EAST_GATE.v0 + 0.2, P.y0 + SP.EAST_GATE.v1],
};
export const PALLET = [P.x0 + 5.6, 72.85];   // à l'ouest du sapin de l'accotement (premier jet : sous l'arbre de l'est)
/* Le point de livraison des feuilles (le chariot y dépose ses piles) et celui des barrières. */
const DEPOT = [P.x0 + P.w - 5.5, P.y0 + P.h - 4.8];   // au nord de la caisse, à l'ouest de la colonne du quarter de l'est

function modCenters() {
  const out = {};
  SP.PARK_PRIMS.forEach((p) => {
    const cx = P.x0 + (p.bb[0] + p.bb[2]) / 2, cy = P.y0 + (p.bb[1] + p.bb[3]) / 2;
    const o = out[p.mod] || (out[p.mod] = { sx: 0, sy: 0, n: 0, front: -1e9, x0: 1e9, x1: -1e9 });
    o.sx += cx; o.sy += cy; o.n++;
    o.front = Math.max(o.front, P.y0 + p.bb[3]); o.x0 = Math.min(o.x0, P.x0 + p.bb[0]); o.x1 = Math.max(o.x1, P.x0 + p.bb[2]);
  });
  for (const k of Object.keys(out)) { const o = out[k]; o.x = o.sx / o.n; o.y = o.sy / o.n; }
  return out;
}
/* Un point de SOL libre près de (x, y) : sur le dallage, hors de tout module (`heightAt` nul autour des pieds), le plus proche
   (anneaux croissants). On travaille depuis le sol, jamais perché dans une courbe. */
function floorSpot(x, y) {
  const ok = (a, b) => a > P.x0 + 0.5 && a < P.x0 + P.w - 0.5 && b > P.y0 + 0.5 && b < P.y0 + P.h - 0.5
    && SP.heightAt(a, b) < 0.01 && SP.heightAt(a - 0.35, b) < 0.01 && SP.heightAt(a + 0.35, b) < 0.01 && SP.heightAt(a, b - 0.4) < 0.01;
  if (ok(x, y)) return [x, y];
  for (let r = 0.25; r < 6; r += 0.25) for (let k = 0; k < 16; k++) {
    const a = x + Math.cos(k * Math.PI / 8) * r, b = y + Math.sin(k * Math.PI / 8) * r;
    if (ok(a, b)) return [a, b];
  }
  return [x, y];
}
/* Le point de travail devant une PRIMITIVE (une courbe, une table, un tremplin) : au pied de son côté sud, décalé de `off` cases. */
function primSpot(pi, off) {
  const b = SP.PARK_PRIMS[pi].bb;
  return floorSpot(P.x0 + Math.max(b[0] + 0.4, Math.min(b[2] - 0.4, (b[0] + b[2]) / 2 + off)), P.y0 + b[3] + 0.6);
}
function workSpot(mc, off) { return floorSpot(Math.max(mc.x0 + 0.4, Math.min(mc.x1 - 0.4, mc.x + off)), Math.min(P.y0 + P.h - 0.6, mc.front + 0.55)); }
/* LE CHEMIN : en ligne droite si elle ne frôle aucun module ; sinon le plus court sur une grille d'une demi-case (huit voisins), lissé
   en lignes droites (on coupe tant que la vue est libre). ⚠️ Premier jet « par l'allée du nord » : sa première jambe partait tout
   droit vers le nord et traversait le quarter de l'est (`verify-chantier` l'a vu : 49 positions dans un module monté). */
/* ⚠️ 2026-10-12 : LA BARRIÈRE ARRÊTE AUSSI L'ÉQUIPE (hors des portes) — on entre et on sort par une porte, jamais en enjambant. Elle
   compte pour tous les chemins, même avant d'être posée : on y marche déjà comme si elle était là (le dehors est l'allée). */
function fenceAt(x, y) {
  const F = FENCE, m = 0.22, g = 0.3;   // on passe une porte à 30 cm de ses montants
  if (x > F.xW - m && x < F.xE + m) {
    if (Math.abs(y - F.yN) < m) return !(x > F.gateN[0] + g && x < F.gateN[1] - g);
    if (Math.abs(y - F.yS) < m) return true;
  }
  if (y > F.yN - m && y < F.yS + m) {
    if (Math.abs(x - F.xW) < m) return true;
    if (Math.abs(x - F.xE) < m) return !(y > F.gateE[0] + g && y < F.gateE[1] - g);
  }
  return false;
}
/* 2026-10-12 — à l'est de l'allée, les jardins des maisons : on n'y passe pas (seule l'allée pavée y mène) ; et le chalet des patins
   occupe le haut de l'allée jusqu'à ce que la grue l'enlève (on le longe, contre la barrière). */
function offLimits(x, y) {
  if (x > P.x0 + P.w + 3.2 && !(y > 92.3 && y < 95.6)) return true;
  const R = C.TOWN_RINK_CHALET;
  return x > R.x - 0.25 && x < R.x + C.TOWN_SKATE_CHALET_W + 0.25 && y > R.y - 0.3 && y < R.y + C.TOWN_SKATE_CHALET_H + 0.25;
}
function blocked(x, y) { return fenceAt(x, y) || offLimits(x, y) || SP.heightAt(x, y) > 0.01 || SP.heightAt(x - 0.3, y) > 0.01 || SP.heightAt(x + 0.3, y) > 0.01 || SP.heightAt(x, y - 0.35) > 0.01; }
function clearLine(a, b) {
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 4);
  for (let k = 1; k < n; k++) { const t = k / n; if (blocked(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false; }
  return true;
}
const GR = { x0: P.x0 - 3, y0: 69.5, step: 0.5 };
GR.w = Math.ceil((P.w + 13) / GR.step);   // jusqu'à l'allée pavée de l'est (le chariot y attend)
GR.h = Math.ceil((P.y0 + P.h + 3 - GR.y0) / GR.step);
let GRID = null;
function grid() {
  if (GRID) return GRID;
  GRID = new Uint8Array(GR.w * GR.h);   // 1 : un module ; 2 : la barrière
  for (let j = 0; j < GR.h; j++) for (let i = 0; i < GR.w; i++) { const x = GR.x0 + (i + 0.5) * GR.step, y = GR.y0 + (j + 0.5) * GR.step; GRID[j * GR.w + i] = fenceAt(x, y) ? 2 : blocked(x, y) ? 1 : 0; }
  return GRID;
}
function route(a, b, canEsc) {
  if (clearLine(a, b)) return [a, b];
  const G = grid(), W = GR.w, Hh = GR.h;
  const cell = (p) => [Math.max(0, Math.min(W - 1, Math.floor((p[0] - GR.x0) / GR.step))), Math.max(0, Math.min(Hh - 1, Math.floor((p[1] - GR.y0) / GR.step)))];
  const [ai, aj] = cell(a), [bi, bj] = cell(b);
  const prev = new Int32Array(W * Hh).fill(-1), seen = new Uint8Array(W * Hh);
  const q = [aj * W + ai]; seen[aj * W + ai] = 1;
  for (let h = 0; h < q.length; h++) {
    const c = q[h], ci = c % W, cj = (c / W) | 0;
    if (ci === bi && cj === bj) break;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= Hh) continue;
      const n = nj * W + ni;
      /* ⚠️ 2026-10-12 : qui PART de l'emprise d'un module (le chef montre depuis le futur quarter, avant ses cadres) en sort par
         l'emprise même — sans quoi aucun chemin n'existait et l'on filait en ligne droite, à travers la barrière. On ne traverse
         jamais la barrière ainsi, et d'une case libre on ne rentre jamais dans un module. */
      const esc = canEsc && G[n] === 1 && G[c] === 1 && Math.max(Math.abs(ni - ai), Math.abs(nj - aj)) <= 3;   // à 1,5 case du départ au plus
      if (seen[n] || (G[n] && !(ni === bi && nj === bj) && !esc)) continue;
      if (di && dj && (G[cj * W + ni] === 2 || G[nj * W + ci] === 2 || (!esc && (G[cj * W + ni] || G[nj * W + ci])))) continue;   // pas de diagonale à travers un coin
      seen[n] = 1; prev[n] = c; q.push(n);
    }
  }
  const end = bj * W + bi;
  if (!seen[end]) return canEsc ? [a, b] : route(a, b, true);   // l'échappée seulement quand il n'y a pas d'autre chemin
  const cells = [];
  for (let c = end; c !== -1; c = prev[c]) cells.push([GR.x0 + ((c % W) + 0.5) * GR.step, GR.y0 + (((c / W) | 0) + 0.5) * GR.step]);
  cells.reverse(); cells[0] = a; cells[cells.length - 1] = b;
  const out = [a];   // le lissage : de chaque point, on file jusqu'au plus lointain qu'on voit
  let k = 0;
  while (k < cells.length - 1) {
    let j = cells.length - 1;
    while (j > k + 1 && !clearLine(cells[k], cells[j])) j--;
    out.push(cells[j]); k = j;
  }
  return out;
}
let SCRIPTS = null;
/* Les panneaux de la barrière de chantier : où, quand on les pose (`on`), quand on les retire (`off`) — écrits PAR le script des
   porteurs (le panneau apparaît quand l'ouvrier qui le porte arrive), lus par le dessin et la collision. */
const FENCE_PANELS = [], PAL_EV = [];
export function fencePanels() { crewScripts(); return FENCE_PANELS; }
/* Combien de panneaux sur la palette à la minute `t` (le tas baisse à la pose, remonte au retrait). */
export function palletAt(t) {
  crewScripts();
  let n = FENCE_PANELS.length;
  for (const [te, d] of PAL_EV) if (te <= t) n += d;
  return n;
}
export function crewScripts() {
  if (SCRIPTS) return SCRIPTS;
  const S = {}; CREW.forEach((w) => { S[w.id] = []; });
  const MC = modCenters();
  const van = MACHINE_SPOTS.vanRoad.to;
  const gateN = [(FENCE.gateN[0] + FENCE.gateN[1]) / 2, FENCE.yN + 0.6];   // l'accès du chantier : la porte du nord, juste dedans
  const step = (id, t0, t1, act, a, b, extra) => S[id].push({ t0, t1, act, a, b: b || a, ...(extra || {}) });
  // Une marche à vitesse d'homme, par un chemin qui contourne les modules : rend l'instant d'arrivée.
  const walk = (id, t0, a, b, act, v) => {
    const pts = act === "squeegee" ? [a, b] : route(a, b);
    let t = t0;
    for (let k = 0; k + 1 < pts.length; k++) {
      const d = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]);
      if (d < 1e-3) continue;
      const t1 = t + d / (v || WALK_V) / 60; step(id, t, t1, act || "walk", pts[k], pts[k + 1]); t = t1;
    }
    return t;
  };
  /* Les panneaux, dans l'ordre d'un tour qui part de la palette : le nord (d'est en ouest), l'ouest (du nord au sud), le sud (d'ouest
     en est), l'est (du sud au nord). Chacun : son milieu (x, y), son sens (`along`), où se tient celui qui le pose (DEHORS, à une
     demi-case), vers où il regarde. Le tour se coupe en quatre morceaux d'un seul tenant : un porteur, un côté (à peu près). */
  const F = FENCE, loop = [];
  const run = (a0, a1, mk, gate) => { const n = Math.round((a1 - a0) / F.PW), st = (a1 - a0) / n; const out = []; for (let k = 0; k < n; k++) { const c = a0 + st * (k + 0.5); if (gate && c > gate[0] - 0.3 && c < gate[1] + 0.3) continue; out.push(mk(c)); } return out; };
  loop.push(...run(F.xW, F.xE, (c) => ({ x: c, y: F.yN, along: "x", st: [c, F.yN - 0.5], dir: 0 }), F.gateN).reverse());
  loop.push(...run(F.yN, F.yS, (c) => ({ x: F.xW, y: c, along: "y", st: [F.xW - 0.5, c], dir: 3 })));
  loop.push(...run(F.xW, F.xE, (c) => ({ x: c, y: F.yS, along: "x", st: [c, F.yS + 0.55], dir: 1 })));
  loop.push(...run(F.yN, F.yS, (c) => ({ x: F.xE, y: c, along: "y", st: [F.xE + 0.5, c], dir: 2 }), F.gateE).reverse());
  const chunks = [[], [], [], []];
  loop.forEach((pt, j) => chunks[Math.min(3, Math.floor(j * 4 / loop.length))].push(pt));
  const palSt = (k) => [PALLET[0] - 0.6 + k * 0.4, PALLET[1] + 0.55];
  // ── 0-11 : tout le monde descend de la camionnette ; les porteurs posent les barrières, un aller-retour à la palette par panneau
  const porteurs = ["p1", "p2", "p3", "p4"];
  CREW.forEach((w, i) => { const at = [van[0] + (i % 4) * 0.5, van[1] + 0.9 + ((i / 4) | 0) * 0.5]; step(w.id, 0, 0.6, "stand", at); });
  porteurs.forEach((id, k) => {
    let t = 0.6, at = [van[0] + k * 0.5, van[1] + 0.9];
    for (const pt of chunks[k]) {
      t = walk(id, t, at, palSt(k)); step(id, t, t + 0.1, "stand", palSt(k), null, { dir: 1 }); PAL_EV.push([t + 0.05, -1]); t += 0.1;
      t = walk(id, t, palSt(k), pt.st, "carry");
      step(id, t, t + 0.25, "fence", pt.st, null, { dir: pt.dir });
      FENCE_PANELS.push({ x: pt.x, y: pt.y, along: pt.along, on: t + 0.25, off: null, st: pt.st, dir: pt.dir });
      t += 0.25; at = pt.st;
    }
    S[id].lastAt = at; S[id].lastT = t; S[id].chunk = chunks[k];
  });
  // ── 4-50 : les porteurs raclent l'eau de la glace qui fond, en allers-retours vers les grilles (deux de part et d'autre)
  const RK = C.TOWN_RINK;
  porteurs.forEach((id, k) => {
    let t = Math.max(8, S[id].lastT), at = S[id].lastAt;
    const lane = RK.y0 + 2 + k * ((RK.y1 - RK.y0 - 3) / 3);
    t = walk(id, t, at, [RK.x0 + 1, lane]);
    let dirE = true;
    while (t < PHASE.FRAMES[0] - 2.5) {   // on racle jusqu'aux cadres (la mini-rampe se monte sur la glace raclée), les dernières flaques sèchent seules
      const a = [dirE ? RK.x0 + 1 : RK.x1 - 1, lane], b = [dirE ? RK.x1 - 1 : RK.x0 + 1, lane];
      t = walk(id, t, a, b, "squeegee", 0.7); dirE = !dirE;
    }
    // 2026-10-12 — la raclette rangée, on attend au bord sud (premier jet : il restait planté au bout de sa raclée — dans la
    // mini-rampe qu'on soudait autour de lui)
    const wait = floorSpot(P.x0 + 4 + k * 1.3, P.y0 + P.h - 0.7);
    t = walk(id, t, [dirE ? RK.x0 + 1 : RK.x1 - 1, lane], wait); step(id, t, t + 0.01, "stand", wait, null, { dir: 1 });
    S[id].lastAt = wait; S[id].lastT = t;
  });
  // ── 30-44 : le chef guide la grue (le chalet) depuis l'allée de l'est ; avant, il fait le tour
  {
    let t = 0.6, at = [van[0] + 0.5, van[1] + 0.9];
    t = walk("chef", t, at, gateN); at = gateN;
    t = walk("chef", t, at, [P.x0 + P.w / 2, P.y0 + 2]); at = [P.x0 + P.w / 2, P.y0 + 2];
    step("chef", t, PHASE.CHALET[0] - 2, "point", at); t = PHASE.CHALET[0] - 2;
    const eastSpot = [P.x0 + P.w + 1.4, P.y0 + 5.6];   // dans l'allée, au nord du chalet (premier jet : DANS le chalet)
    t = walk("chef", t, at, eastSpot); at = eastSpot;
    step("chef", t, PHASE.CHALET[1], "point", at, null, { dir: 2 }); t = PHASE.CHALET[1];
    S.chef.lastAt = at; S.chef.lastT = t;
  }
  // ── 46-80 : les soudeurs soudent les cadres, module par module (chacun la moitié des modules)
  const order = MOD_ORDER.filter((m) => MC[m]);
  ["s1", "s2"].forEach((id, k) => {
    let t = 0.6, at = [van[0] + 1 + k * 0.5, van[1] + 1.4];
    t = walk(id, t, at, gateN); at = gateN;
    step(id, t, PHASE.FRAMES[0] - 0.3, "stand", at); t = PHASE.FRAMES[0] - 0.3;
    order.forEach((m, j) => {
      if (j % 2 !== k) return;
      const tl = primTimeline().filter((q) => q && q.mod === m);
      const f0 = Math.min(...tl.map((q) => q.f0)), f1 = Math.max(...tl.map((q) => q.f1));
      // une primitive après l'autre (la mini-rampe a trois parties, le quarter trois) : on soude au pied de chacune
      const pis = SP.PARK_PRIMS.map((q, i) => (q.mod === m ? i : -1)).filter((i) => i >= 0);
      const per = (f1 - f0) / pis.length;
      pis.forEach((pi, q) => {
        const spot = primSpot(pi, k ? 0.6 : -0.6), te = f0 + per * (q + 1);
        t = walk(id, Math.max(t, f0 + per * q - 0.8), at, spot); at = spot;
        if (t < te) { step(id, t, te, "weld", at, null, { dir: 1 }); t = te; }
      });
    });
    // 140-160 : les copings, les rails, les garde-corps
    const steelSpots = [workSpot(MC.quarter || MC.mini, 0), workSpot(MC.funbox || MC.mini, 0), [P.x0 + 6.5, P.y0 + 20.9]];
    steelSpots.forEach((spot, j) => {
      if (j % 2 !== k && j !== 2) return;
      const ta = PHASE.STEEL[0] + j * 6;
      t = walk(id, Math.max(t, ta - 1), at, spot); at = spot;
      step(id, t, t + 5, "weld", at, null, { dir: 1 }); t += 5;
    });
    S[id].lastAt = at; S[id].lastT = t;
  });
  // ── 72-150 : les feuilles — deux paires de porteurs, du dépôt au module, puis on visse ; un aller-retour par feuille
  [["p1", "p2"], ["p3", "p4"]].forEach(([a, b], k) => {
    let t = Math.max(PHASE.SHEETS[0] - 3, S[a].lastT, S[b].lastT), atA = S[a].lastAt, atB = S[b].lastAt;
    t = Math.max(walk(a, t, atA, DEPOT), walk(b, t, atB, [DEPOT[0] + 1.1, DEPOT[1]]));
    atA = DEPOT; atB = [DEPOT[0] + 1.1, DEPOT[1]];
    order.forEach((m, j) => {
      if (j % 2 !== k) return;
      const tl = primTimeline().filter((q) => q && q.mod === m);
      const s0 = Math.min(...tl.map((q) => q.s0)), s1 = Math.max(...tl.map((q) => q.s1));
      let lap = 0;
      while (t < s1 - 0.5) {
        const pis = SP.PARK_PRIMS.map((q, i) => (q.mod === m ? i : -1)).filter((i) => i >= 0);
        const sp = primSpot(pis[lap % pis.length], ((lap % 3) - 1) * 0.9), spB = floorSpot(sp[0] + 1.1, sp[1]);
        if (t < s0 - 4) { step(a, t, s0 - 4, "stand", atA); step(b, t, s0 - 4, "stand", atB); t = s0 - 4; }
        const ta = walk(a, t, atA, sp, "carry", CARRY_V), tb = walk(b, t, atB, spB, "carry", CARRY_V);
        S[a][S[a].length - 1].with = b; S[b][S[b].length - 1].with = a;
        t = Math.max(ta, tb);
        step(a, t, t + 1.4, "screw", sp, null, { dir: 1 }); step(b, t, t + 1.4, "screw", spB, null, { dir: 1 }); t += 1.4;
        atA = sp; atB = spB;
        if (t < s1 - 0.8) { t = Math.max(walk(a, t, atA, DEPOT), walk(b, t, atB, [DEPOT[0] + 1.1, DEPOT[1]])); atA = DEPOT; atB = [DEPOT[0] + 1.1, DEPOT[1]]; }
        lap++;
      }
    });
    S[a].lastAt = atA; S[a].lastT = t; S[b].lastAt = atB; S[b].lastT = t;
  });
  // ── 163-177 : on retire les barrières (chacun son morceau, à l'envers), panneau par panneau jusqu'à la palette ; puis la camionnette
  porteurs.forEach((id, k) => {
    let t = Math.max(PHASE.UNFENCE[0], S[id].lastT), at = S[id].lastAt;
    for (const pt of S[id].chunk.slice().reverse()) {
      t = walk(id, t, at, pt.st); step(id, t, t + 0.2, "fence", pt.st, null, { dir: pt.dir });
      const fp = FENCE_PANELS.find((q) => q.x === pt.x && q.y === pt.y); if (fp) fp.off = t + 0.1;
      t += 0.2;
      t = walk(id, t, pt.st, palSt(k), "carry"); step(id, t, t + 0.1, "stand", palSt(k), null, { dir: 1 }); PAL_EV.push([t + 0.05, 1]); t += 0.1;
      at = palSt(k);
    }
    t = walk(id, t, at, [van[0] + k * 0.5, van[1] + 0.9]);
    step(id, t, Math.max(t, PHASE.VAN_OUT[0]), "stand", [van[0] + k * 0.5, van[1] + 0.9]);
  });
  ["chef", "s1", "s2"].forEach((id, k) => {
    const t0 = Math.max(PHASE.UNFENCE[0] - 4, S[id].lastT);
    const t = walk(id, t0, S[id].lastAt, [van[0] + 2 + k * 0.5, van[1] + 1.4]);
    if (t < PHASE.VAN_OUT[0]) step(id, t, PHASE.VAN_OUT[0], "stand", [van[0] + 2 + k * 0.5, van[1] + 1.4]);
  });
  // le conducteur : à pied jusqu'à son chariot (sur l'allée de l'est), il l'attend ; dedans de l'entrée (44,5) au départ (174)
  {
    const TP = MACHINE_SPOTS.telePark, by = [TP[0] - 1.9, TP[1] + 0.45];
    const t = walk("c1", 0.6, [van[0] + 1.5, van[1] + 1.4], by);
    step("c1", t, TELE.IN[0], "stand", by, null, { dir: 3 });
    step("c1", TELE.IN[0], TELE.GONE, "ride", TP);
  }
  for (const id of Object.keys(S)) S[id].sort((x, y) => x.t0 - y.t0);
  SCRIPTS = S;
  return S;
}
/* Où est un ouvrier, et que fait-il, à la minute `t` du montage : { x, y, dir, act, moving, phase, with }. Hors de son script (avant
   la première étape, après la dernière) : null — il est dans la camionnette. */
export function workerAt(id, t) {
  const S = crewScripts()[id];
  if (!S || !S.length || t < S[0].t0 || t > PHASE.VAN_OUT[0]) return null;
  let lo = 0, hi = S.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (S[mid].t0 <= t) lo = mid; else hi = mid - 1; }
  const s = S[lo];
  const k = s.t1 > s.t0 ? Math.max(0, Math.min(1, (t - s.t0) / (s.t1 - s.t0))) : 1;
  const x = s.a[0] + (s.b[0] - s.a[0]) * k, y = s.a[1] + (s.b[1] - s.a[1]) * k;
  const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1];
  const moving = (s.act === "walk" || s.act === "carry" || s.act === "squeegee") && k < 1 && Math.hypot(dx, dy) > 0.01;
  let dir = s.dir != null ? s.dir : 0;
  if (moving) dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
  return { x, y, dir, act: k >= 1 && moving === false && (s.act === "walk" || s.act === "carry") ? "stand" : s.act, moving, phase: (t - s.t0) * 60, with: s.with || null };
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ LES ENGINS — `machinesAt(t)` : où ils sont et ce qu'ils font à la minute `t` du MONTAGE (null : absent de la scène).
   ╚════════════════════════════════════════════════════════════════════════════
   · la CAMIONNETTE arrive par le boulevard à 14 h (30 s), porte coulissante ouverte pendant qu'on décharge, repart à 16 h 57 ;
   · le CAMION-GRUE arrive par l'allée pavée de l'est (24-28), sort ses béquilles, lève le CHALET des patins sur son plateau (30-41),
     repart avec (44-48) ; revient avec le MATÉRIEL (50-54), que le chariot décharge ; repart (138-142) ; revient avec le CONTENEUR
     (148-152), le dépose à la grue sur ses madriers (156-167), repart (169-174) ;
   · le CHARIOT TÉLESCOPIQUE fait la navette du plateau au dépôt pendant les cadres et les feuilles (un cycle de 3 min).
   La grue : `crane` = la cible du crochet (cases du monde, hauteur) et l'ouverture de la flèche ; `hang` : ce qui pend au crochet
   ("chalet" | "container" | null) et sa hauteur ; `bed` : ce qui est sur le plateau. */
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const span = (t, a, b) => ease((t - a) / (b - a));
/* La hauteur du plateau (le pied d'une charge posée dessus, en cases : `CA.TRUCK.BED_H` 27 px − 2, au pied du camion moins 0,6 case),
   et celle du crochet au-dessus du pied de chaque charge (son dessin, 60 et 68 px, + 12 px d'élingues). */
const BED_Z = 0.96, LOAD_HOOK = { chalet: 4.5, container: 5.0 };
export const SHED_LIFT = { pick: 159.5, set: 167 };   // le conteneur quitte le plateau, se pose sur ses madriers
export const CHALET_LIFT = { pick: 33.5, set: 41 };
export function machinesAt(t) {
  const out = {};
  const V = MACHINE_SPOTS.vanRoad;
  if (t >= 0 && t < PHASE.VAN_OUT[1]) {
    const k = t < 0.5 ? span(t, 0, 0.5) : 1, kOut = t > PHASE.VAN_OUT[0] ? span(t, PHASE.VAN_OUT[0], PHASE.VAN_OUT[0] + 1.5) : 0;
    const x = kOut > 0 ? lerp(V.to[0], V.to[0] + 40, kOut) : lerp(V.from[0], V.to[0], k);
    out.van = { x, y: V.to[1], dir: 3, door: (t > 0.4 && t < 1.4) || (t > 176 && t < 177.2) };
  }
  // le camion-grue : ses trois visites
  const TK = MACHINE_SPOTS.craneTruck, visits = [[24, 28, 44, 48, "chalet"], [50, 54, 138, 142, "stack"], [148, 152, 169, 174, "container"]];
  for (const [a0, a1, b0, b1, cargo] of visits) {
    if (t < a0 || t >= b1) continue;
    const kIn = span(t, a0, a1), kOut = span(t, b0, b1);
    const x = t < b0 ? lerp(TK.from[0], TK.to[0], kIn) : lerp(TK.to[0], TK.from[0] + 10, kOut);
    const parked = t >= a1 && t < b0;
    const legs = parked ? Math.min(span(t, a1, a1 + 1), 1 - span(t, b0 - 1, b0)) : 0;
    const truck = { x, y: TK.to[1], dir: TK.dir, legs, flash: !parked || legs < 1, bed: null, crane: null, hang: null, stowed: !parked, visit: cargo };
    // la grue : au repos, le crochet au-dessus du plateau (son milieu : 18 px derrière l'ancre, à 27 px de haut — `CA.TRUCK`)
    const bedPt = [x + (TK.dir === 2 ? 1 : -1) * 1.125, TK.to[1] - 0.6, BED_Z];
    /* ⚠️ 2026-10-12 — LA GRUE VISE LE CROCHET, LA CHARGE PEND SOUS LUI : `hang` = { kind, x, y (le pied de la charge, comme un
       décor posé : son milieu, son bord sud), z (sa hauteur au-dessus du sol) } ; le crochet est à `LOAD_HOOK` au-dessus de ce pied
       (la hauteur du dessin + les élingues). Premier jet : deux hauteurs écrites à part — la charge sautait de 6 à 47 px quand le
       crochet la prenait, et le chalet se décalait d'une demi-case en quittant son socle. */
    const hookOver = (pt, kind, z) => [pt[0], pt[1], z + LOAD_HOOK[kind] - 0.4];
    let target = [bedPt[0], bedPt[1], BED_Z + 1.2], out1 = 0.15;
    const CH0 = [C.TOWN_RINK_CHALET.x + C.TOWN_SKATE_CHALET_W / 2, C.TOWN_RINK_CHALET.y + C.TOWN_SKATE_CHALET_H];
    const SH = [SP.SHED.x + SP.SHED.w / 2, SP.SHED.y + SP.SHED.h];
    const mv = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
    const rest = [bedPt[0], bedPt[1], BED_Z + 1.2];
    if (cargo === "chalet") {
      const L = "chalet", SW = 2.0;   // hauteur de passage : au-dessus de la barrière et des mâts
      if (t >= 30 && t < 44) {
        if (t < 32) { target = mv(rest, hookOver(CH0, L, 1.2), span(t, 30, 32)); out1 = span(t, 30, 32); }
        else if (t < CHALET_LIFT.pick) { target = mv(hookOver(CH0, L, 1.2), hookOver(CH0, L, 0), span(t, 32, CHALET_LIFT.pick)); out1 = 1; }
        else if (t < 36) { const z = lerp(0, SW, span(t, CHALET_LIFT.pick, 36)); target = hookOver(CH0, L, z); truck.hang = { kind: L, x: CH0[0], y: CH0[1], z }; out1 = 1; }
        else if (t < 39) { const k = span(t, 36, 39), p = [lerp(CH0[0], bedPt[0], k), lerp(CH0[1], bedPt[1], k)]; target = hookOver(p, L, SW); truck.hang = { kind: L, x: p[0], y: p[1], z: SW }; out1 = lerp(1, 0.6, k); }
        else if (t < CHALET_LIFT.set) { const z = lerp(SW, BED_Z, span(t, 39, CHALET_LIFT.set)); target = hookOver(bedPt, L, z); truck.hang = { kind: L, x: bedPt[0], y: bedPt[1], z }; out1 = 0.6; }
        else { target = mv(hookOver(bedPt, L, BED_Z), rest, span(t, CHALET_LIFT.set, 43)); out1 = lerp(0.6, 0.15, span(t, CHALET_LIFT.set, 43)); }
      }
      if (t >= CHALET_LIFT.set) truck.bed = "chalet";
    } else if (cargo === "stack") {
      truck.bed = t < 134 ? "stack" : null;
    } else if (cargo === "container") {
      const L = "container", SW = 2.2;
      truck.bed = t < SHED_LIFT.pick ? "container" : null;
      if (t >= 156 && t < 169) {
        if (t < 158) { target = mv(rest, hookOver(bedPt, L, BED_Z + 1), span(t, 156, 158)); out1 = span(t, 156, 158) * 0.5; }
        else if (t < SHED_LIFT.pick) { target = mv(hookOver(bedPt, L, BED_Z + 1), hookOver(bedPt, L, BED_Z), span(t, 158, SHED_LIFT.pick)); out1 = 0.5; }
        else if (t < 162) { const z = lerp(BED_Z, SW, span(t, SHED_LIFT.pick, 162)); target = hookOver(bedPt, L, z); truck.hang = { kind: L, x: bedPt[0], y: bedPt[1], z }; out1 = 0.5; }
        else if (t < 165) { const k = span(t, 162, 165), p = [lerp(bedPt[0], SH[0], k), lerp(bedPt[1], SH[1], k)]; target = hookOver(p, L, SW); truck.hang = { kind: L, x: p[0], y: p[1], z: SW }; out1 = lerp(0.5, 1, k); }
        else if (t < SHED_LIFT.set) { const z = lerp(SW, 0, span(t, 165, SHED_LIFT.set)); target = hookOver(SH, L, z); truck.hang = { kind: L, x: SH[0], y: SH[1], z }; out1 = 1; }
        else { target = mv(hookOver(SH, L, 0), rest, span(t, SHED_LIFT.set, 169)); out1 = lerp(1, 0.15, span(t, SHED_LIFT.set, 169)); }
      }
    }
    if (parked) truck.crane = { tx: target[0], ty: target[1], tz: target[2], out: out1 };
    out.truck = truck;
  }
  // le chariot télescopique : sur l'allée (garé, vide), il entre, fait la navette du plateau (l'entrée est) au dépôt, ressort, s'en va
  const TD = MACHINE_SPOTS.teleDepot, TP = MACHINE_SPOTS.telePark;
  let tele = { x: TD[0], y: TD[1], dir: 2, lift: 0, load: null, driven: t >= TELE.IN[0] };
  if (t < TELE.IN[0]) tele = { x: TP[0], y: TP[1], dir: 2, lift: 0, load: null, driven: false };
  else if (t < TELE.IN[1]) { const k = span(t, TELE.IN[0], TELE.IN[1]); tele = { x: lerp(TP[0], TD[0], k), y: lerp(TP[1], TD[1], k), dir: 2, lift: 0, load: null, driven: true }; }
  else if (t >= TELE.OUT[0] && t < TELE.OUT[1]) { const k = span(t, TELE.OUT[0], TELE.OUT[1]); tele = { x: lerp(TD[0], TP[0], k), y: lerp(TD[1], TP[1], k), dir: 3, lift: 0, load: null, driven: true }; }
  else if (t >= TELE.OUT[1]) { const k = span(t, TELE.OUT[1], TELE.GONE); tele = { x: lerp(TP[0], TP[0] + 22, k), y: TP[1], dir: 3, lift: 0, load: null, driven: true }; }
  if (t >= 54 && t < 134) {
    const cyc = (t - 54) % 3, load = t < PHASE.FRAMES[1] ? "frame" : "sheets";
    const pick = [P.x0 + P.w + 0.6, MACHINE_SPOTS.craneTruck.to[1] - 0.2], drop = [DEPOT[0] + 0.6, DEPOT[1] + 1.6];
    if (cyc < 0.4) { const k = span(cyc, 0, 0.4); tele = { x: lerp(TD[0], pick[0], k), y: lerp(TD[1], pick[1], k), dir: 3, lift: 0, load: null }; }
    else if (cyc < 0.8) tele = { x: pick[0], y: pick[1], dir: 3, lift: span(cyc, 0.4, 0.6) * 0.6, load: cyc > 0.6 ? load : null };
    else if (cyc < 1.3) { const k = span(cyc, 0.8, 1.3); tele = { x: lerp(pick[0], drop[0], k), y: lerp(pick[1], drop[1], k), dir: 2, lift: 0.3, load }; }
    else if (cyc < 1.6) tele = { x: drop[0], y: drop[1], dir: 2, lift: lerp(0.3, 0, span(cyc, 1.3, 1.6)), load: cyc < 1.45 ? load : null };
    else { const k = span(cyc, 1.6, 2.1); tele = { x: lerp(drop[0], TD[0], k), y: lerp(drop[1], TD[1], k), dir: 3, lift: 0, load: null }; }
    tele.driven = true;
  }
  if (t < TELE.GONE) out.tele = tele;
  return out;
}
/* Les piles de matériel au dépôt (combien de feuilles empilées à la minute `t`) : elles montent avec les livraisons du chariot et
   fondent à mesure qu'on pose. */
export function depotStack(t) {
  if (t < 55 || t > PHASE.SHEETS[1]) return { x: DEPOT[0] + 0.55, y: DEPOT[1] + 0.35, sheets: 0, frames: 0 };
  const delivered = Math.max(0, Math.floor((t - 55.3) / 3) + 1);
  const used = t > PHASE.SHEETS[0] ? (t - PHASE.SHEETS[0]) / (PHASE.SHEETS[1] - PHASE.SHEETS[0]) * 26 : 0;
  const frames = t < PHASE.FRAMES[1] ? Math.max(0, Math.min(delivered, 8) - Math.floor((t - PHASE.FRAMES[0]) / 4)) : 0;
  return { x: DEPOT[0] + 0.55, y: DEPOT[1] + 0.35, sheets: Math.max(0, Math.min(8, (t > PHASE.FRAMES[1] - 6 ? delivered - 6 : 0) * 2 - Math.floor(used % 8))), frames };
}
