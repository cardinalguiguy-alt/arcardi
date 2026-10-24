/* =============================================================================
   montureArt.js — LES MONTURES DU SKATEPARK, DESSINÉES (2026-10-11).
   -----------------------------------------------------------------------------
   La planche, la trottinette, le BMX — et le corps de qui les monte. Les rollers n'ont pas de véhicule : des platines à roues sous
   les chaussures, et le même squelette que les autres riders (`drawRollers`, 2026-10-13 soir ; avant, le corps du patineur de la
   patinoire, `drawSkate`, qui ne sert plus ici qu'à la chute).
   ⚠️⚠️ LES VÉHICULES SONT EN 3D, PAS DES SPRITES TOURNÉS. Une planche couchée sur une courbe raide n'a pas la forme d'une planche
   à plat : son grand axe monte avec la pente. Chaque véhicule est décrit dans SON repère (le cap couché sur la surface, sa
   normale), projeté en 3/4 comme le relief (`x`, `y − z`), et peint au pixel : on remonte de chaque pixel de l'écran au point du
   véhicule qu'il montre (la projection d'un plan est une application affine, elle s'inverse). Aucun `rotate` : le faux canevas
   des bancs n'en veut pas, et un sprite tourné se lisse en bouillie à l'échelle du pixel.
   ⚠️ LE CORPS RESTE LA FEUILLE DU PERSONNAGE (quatre directions) : le skateur se tient de TRAVERS sur sa planche (la poitrine
   vers la droite du cap — un regular), le reste regarde où il va. Le corps se dessine à la hauteur de ce qu'il foule (le plateau
   de la planche, les pédales du BMX).
   ⚠️ LES COORDONNÉES : le monde en px, AVANT la translation d'altitude que fait `pushE` (elle monte tout de la hauteur du relief
   sous les pieds, `hc`) — un point à la hauteur z se peint donc à `y·T − (z − hc)·T`.
   ========================================================================== */
import * as C from "./fermeConstants";
import * as SP from "./skatepark";
import * as MO from "./monture";   // 2026-10-13 (nuit) : la demi-longueur de collision d'une monture (`rideReach`)
import { drawSkate, drawReachArm, POSE_SLICES as PS } from "./fermeArt";

const T = C.TILE;
const P1 = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

/* Le repère d'un véhicule : son axe (le cap, couché sur la surface s'il roule), son travers, sa normale. En l'air, à plat. */
function frameOf(r) {
  const c = Math.cos(r.th), s = Math.sin(r.th);
  if (r.air > 0.02 || !r.surf) return { f: [c, s, 0], l: [-s, c, 0], n: [0, 0, 1] };
  const gu = r.surf.gu, gv = r.surf.gv;
  const p = gu * c + gv * s, q = -gu * s + gv * c;
  const f = [c, s, p], fl = Math.hypot(...f);
  const l = [-s, c, q], ll = Math.hypot(...l);
  const fn = f.map((v) => v / fl), ln = l.map((v) => v / ll);
  const n = [fn[1] * ln[2] - fn[2] * ln[1], fn[2] * ln[0] - fn[0] * ln[2], fn[0] * ln[1] - fn[1] * ln[0]];
  if (n[2] < 0) { n[0] = -n[0]; n[1] = -n[1]; n[2] = -n[2]; }
  return { f: fn, l: ln, n };
}
/* 2026-10-13 (nuit) — JUSQU'OÙ VA, VERS LE SUD, CE QUI PORTE LE RIDER (cases de sol, ≥ 0) : la roue arrière d'un BMX qui monte le
   quarter, le tail de la planche. Le jeu trie le rider à cette profondeur au-delà de ses pieds (FermeGame.js, `parkCutOf`), et c'est
   là qu'il coupe la tranche du park (`parkDrawPieces`, skateparkArt.js) : le bois sous la monture passe DESSOUS. ⚠️ Trié à ses
   seuls pieds, le corps sortait bien de la paroi, mais la roue arrière — plus au sud, plus bas à l'écran — passait sous les lattes
   qui la portent. La borne est celle de la COLLISION (`MO.RIDE_HALF` le long du cap, `SP.RIDE_DECK_R` en travers), jamais plus
   large : la collision tient le véhicule à distance de tout tube, donc une lisse DEVANT lui (la barrière qu'on longe) reste devant.
   Sur une paroi qui monte vers le nord, la normale du véhicule couché pointe vers le sud : ses roues (`h`, leur sommet) avancent
   d'autant — le bois plus au sud y est plus bas et ne cache rien de ce qui est posé dessus. */
const REACH_H = { skate: 0.1, scooter: 0.1, bmx: 0.42, roller: 0.1 };
export function rideReach(r, fx, fy) {
  const half = MO.RIDE_HALF[r.kind];
  if (half == null) return 0;
  if (r.mode === "bail") {
    // la chute : le corps au sol (il ne s'étend pas vers le sud) ; la planche a filé de 0,6 case le long du cap (`drawRide`)
    if (r.kind !== "skate") return 0;
    const t = r.th + 0.6;
    return Math.max(0, 0.6 * Math.sin(r.th) + half * Math.abs(Math.sin(t)) + SP.RIDE_DECK_R * Math.abs(Math.cos(t)));
  }
  const F = frameOf({ th: r.th, air: r.air || 0, surf: r.mode === "air" ? null : SP.parkSurf(fx, fy, {}) });
  return half * Math.abs(F.f[1]) + SP.RIDE_DECK_R * Math.abs(F.l[1]) + REACH_H[r.kind] * Math.max(0, F.n[1]);
}
/* Un point du véhicule (repère local : `a` le long, `b` en travers, `h` au-dessus) → l'écran (px du monde, voir l'en-tête). */
function projector(r, F) {
  const cx = r.fx * T, cy = r.fy * T, z0 = r.air;
  return (a, b, h) => {
    const x = a * F.f[0] + b * F.l[0] + h * F.n[0], y = a * F.f[1] + b * F.l[1] + h * F.n[1], z = a * F.f[2] + b * F.l[2] + h * F.n[2] + z0;
    return [cx + x * T, cy + (y - z) * T];
  };
}
/* Peindre une PLAQUE (le plateau d'une planche, d'une trottinette) : la forme se décide en coordonnées locales (`shape(a, b)` rend
   une couleur ou null) ; chaque pixel de l'écran remonte à (a, b) par l'inverse de la projection du plan de la plaque. */
function paintPlate(ctx, r, F, hPlate, half, shape, flipK) {
  const pr = projector(r, F);
  const O = pr(0, 0, hPlate), A = pr(1, 0, hPlate), B = pr(0, flipK, hPlate);
  const ax = A[0] - O[0], ay = A[1] - O[1], bx = B[0] - O[0], by = B[1] - O[1];
  const det = ax * by - ay * bx;
  if (Math.abs(det) < 0.5) return;   // la plaque vue par la tranche
  const ext = Math.abs(ax) * half[0] + Math.abs(bx) * half[1] + 1, eyt = Math.abs(ay) * half[0] + Math.abs(by) * half[1] + 1;
  // `at(sx, sy)` : le point de la plaque que montre un AUTRE pixel — la forme y regarde ses voisins (le bord d'une planche se décide
  // au pixel : celui du dessous est-il encore dedans ? — 2026-10-14)
  const at = (sx, sy) => { const dx = sx + 0.5 - O[0], dy = sy + 0.5 - O[1]; return [(dx * by - dy * bx) / det, (ax * dy - ay * dx) / det]; };
  for (let sy = Math.floor(O[1] - eyt); sy <= Math.ceil(O[1] + eyt); sy++) for (let sx = Math.floor(O[0] - ext); sx <= Math.ceil(O[0] + ext); sx++) {
    const dx = sx + 0.5 - O[0], dy = sy + 0.5 - O[1];
    const a = (dx * by - dy * bx) / det, b = (ax * dy - ay * dx) / det;
    const col = shape(a, b, sx, sy, at);
    if (col) P1(ctx, sx, sy, 1, 1, col);
  }
}
function line3(ctx, pr, a0, b0, h0, a1, b1, h1, col) {
  const A = pr(a0, b0, h0), B = pr(a1, b1, h1);
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(B[0] - A[0]), Math.abs(B[1] - A[1]))));
  for (let k = 0; k <= n; k++) { const t = k / n; P1(ctx, Math.floor(A[0] + (B[0] - A[0]) * t), Math.floor(A[1] + (B[1] - A[1]) * t), 1, 1, col); }
}

/* ── LA PLANCHE (80 × 20 cm) ──
   ⚠️ 2026-10-14 — Guillaume : « le skateboard lui-même doit être plus beau ». Premier jet (2026-10-11) : une plaque de grip gris foncé et
   quatre points crème posés aux coins — vue en jeu, une ardoise à quatre clous, la couleur louée réduite à un liseré sombre. Ce qui fait
   lire une planche à 11 × 3 pixels :
     · DEUX PLANS, comme en vrai : le grip (le dessus, à 7,5 cm) et, au ras du sol, les TRUCKS d'acier et les ROUES crème aux deux
       essieux. Les essieux sont peints d'abord, le grip par-dessus : ce qui en reste visible est ce que la hauteur décale — sur le plat,
       les roues qui dépassent sous les bouts, rien sur une paroi qui nous fait face. ENTRE les essieux, rien : on y voit le sol (premier
       jet, le dessous peint en entier : une bande rouge sous toute la planche, une semelle, pas une planche) ;
     · le BORD du grip éclairé du côté de la lumière (nord-ouest), coloré du côté de l'ombre (la tranche vue de biais) — décidé AU
       PIXEL : un pixel dont le voisin du dessous (ou de droite) sort de la planche est la tranche, celui dont le voisin du dessus (ou de
       gauche) en sort, l'arête claire. Premier jet, une bande de 3,5 cm le long du contour : à 3 pixels de large, selon l'alignement,
       la rangée colorée tombait hors de la planche — vue en jeu, une latte noire sans couleur ;
     · le NOSE et le TAIL RELEVÉS : leurs bouts repeints un rien plus haut (un pixel sur le plat), le grip usé plus clair ;
     · en l'air, à l'envers (kickflip), on voit le dessous : la peinture, un logo clair, les trucks et les roues — peints APRÈS le grip,
       puisqu'ils sont alors de notre côté.
   Les roues débordent d'un rien du plateau (12,5 cm du milieu, le plateau 10) : une planche qui file vers le haut de l'écran garde ses
   quatre roues lisibles ; en vrai elles affleurent, mais une planche sans roues à l'écran est une latte. */
export const BOARD_COLORS = [
  { deck: "#c4512f", deckLo: "#8a321c", deckHi: "#e07a52" }, { deck: "#3f7fc9", deckLo: "#244f86", deckHi: "#7fa8f0" },
  { deck: "#e3b23a", deckLo: "#a17818", deckHi: "#f6d27a" }, { deck: "#3aa067", deckLo: "#22663f", deckHi: "#6cc98f" },
  { deck: "#2c2c32", deckLo: "#151518", deckHi: "#55555e" }, { deck: "#d96aa0", deckLo: "#99406c", deckHi: "#f09cc4" },
];
const BL = 0.7, BW = 0.2;
const BOARD = { H: 0.075, KICK: 0.085, KICK_H: 0.06, AXLE: [0.235, 0.305], WHEEL_B: 0.125, TRUCK_B: 0.055 };
const GRIP = "#25252a", GRIP_TAIL = "#34343b", GRIP_HI = "#56565f", WHEEL = "#efe6cf", WHEEL_LO = "#bfb394", TRUCK = "#b8bec7", TRUCK_LO = "#7d838d";
/* Le contour (un « stade ») : la distance au bord, négative dedans. */
function boardDist(a, b) {
  const a0 = Math.max(0, Math.abs(a) - (BL / 2 - BW / 2));
  return Math.hypot(a0, b) - BW / 2;
}
function drawBoard(ctx, r, F) {
  const col = BOARD_COLORS[(r.color | 0) % BOARD_COLORS.length];
  const flip = r.flip || 0;   // le kickflip : la planche tourne sur son grand axe
  const cf = Math.cos(flip), sf = Math.sin(flip);
  const G = { f: F.f, l: [F.l[0] * cf + F.n[0] * sf, F.l[1] * cf + F.n[1] * sf, F.l[2] * cf + F.n[2] * sf], n: [F.n[0] * cf - F.l[0] * sf, F.n[1] * cf - F.l[1] * sf, F.n[2] * cf - F.l[2] * sf] };
  const top = G.n[1] * 0.707 + G.n[2] * 0.707 > 0;   // voit-on le grip (le dessus) ou le dessous peint ?
  const half = [BL / 2 + 0.06, BOARD.WHEEL_B + 0.04];
  const underside = () => paintPlate(ctx, r, G, 0, half, (a, b) => {
    const aa = Math.abs(a), ab = Math.abs(b);
    if (aa > BOARD.AXLE[0] && aa < BOARD.AXLE[1] && ab <= BOARD.WHEEL_B) {
      if (ab > BOARD.TRUCK_B + 0.02) return aa > (BOARD.AXLE[0] + BOARD.AXLE[1]) / 2 ? WHEEL_LO : WHEEL;   // la roue, sa moitié extérieure à l'ombre
      return ab > BOARD.TRUCK_B ? TRUCK_LO : TRUCK;                                                        // le truck, son axe
    }
    const d = boardDist(a, b);
    if (d > 0 || top) return null;                                                           // à l'endroit, entre les essieux : le vide
    if (d > -0.03) return col.deckLo;                                                        // à l'envers : le bord du dessous
    return aa < 0.07 ? "#f1ead8" : aa < 0.1 ? col.deckHi : col.deck;                         // la peinture, un logo clair au milieu
  }, 1);
  const grip = (h, kick) => paintPlate(ctx, r, G, h, half, (a, b, sx, sy, at) => {
    const inB = (q) => boardDist(q[0], q[1]) <= 0 && !(kick && Math.abs(q[0]) < BL / 2 - BOARD.KICK * 0.5);
    if (!inB([a, b])) return null;
    if (!inB(at(sx, sy + 1)) || !inB(at(sx + 1, sy))) return col.deck;   // la tranche, côté ombre
    if (!inB(at(sx, sy - 1)) || !inB(at(sx - 1, sy))) return GRIP_HI;    // l'arête, côté lumière
    return Math.abs(a) > BL / 2 - BOARD.KICK ? GRIP_TAIL : GRIP;
  }, 1);
  if (top) { underside(); grip(BOARD.H, false); grip(BOARD.H + BOARD.KICK_H, true); }
  else { grip(BOARD.H + BOARD.KICK_H, true); grip(BOARD.H, false); underside(); }
}

/* Une rotation autour d'un axe VERTICAL passant par le point local (a0, 0) — le tube de direction : le tailwhip fait tourner le
   cadre (ou le plateau) autour de lui, le barspin le guidon. Composée AVANT la projection : la roue arrière d'un BMX en tailwhip
   reste une roue (une ellipse dans son plan tourné), pas un sprite déformé. */
function spun(pr, a0, w) {
  if (!w) return pr;
  const c = Math.cos(w), s = Math.sin(w);
  return (a, b, h) => pr(a0 + (a - a0) * c - b * s, (a - a0) * s + b * c, h);
}

/* ── LA TROTTINETTE : un plateau d'alu, deux petites roues, le tube et le guidon (devant ou derrière le corps selon le cap) ── */
function drawScooterDeck(ctx, r, F) {
  if (r.whip) {
    // le tailwhip : le plateau tourne autour du tube (a = 0,27) — on tourne le repère et on recale son centre pour que le tube reste
    const w = r.whip, c = Math.cos(w), s = Math.sin(w), A0 = 0.27;
    const f2 = [F.f[0] * c + F.l[0] * s, F.f[1] * c + F.l[1] * s, F.f[2] * c + F.l[2] * s], l2 = [-F.f[0] * s + F.l[0] * c, -F.f[1] * s + F.l[1] * c, -F.f[2] * s + F.l[2] * c];
    const dx = A0 * (F.f[0] - f2[0]), dy = A0 * (F.f[1] - f2[1]);
    r = { ...r, fx: r.fx + dx, fy: r.fy + dy }; F = { f: f2, l: l2, n: F.n };
  }
  const pr = projector(r, F);
  for (const sa of [-1, 1]) {
    const W = pr(sa * 0.27, 0, 0.05);
    P1(ctx, Math.floor(W[0]) - 1, Math.floor(W[1]), 2, 2, "#1f2024"); P1(ctx, Math.floor(W[0]) - 1, Math.floor(W[1]), 1, 1, "#7a7f88");
  }
  paintPlate(ctx, r, F, 0.07, [0.3, 0.1], (a, b) => {
    if (Math.abs(a) > 0.24 || Math.abs(b) > 0.065) return null;
    if (Math.abs(b) > 0.045) return "#8c939d";
    return Math.abs(a) > 0.2 ? "#b9c0c9" : "#3a3c42";
  }, 1);
}
/* ⚠️ 2026-10-13 — LE GUIDON À LA TAILLE DU PERSONNAGE, PAS À CELLE D'UN ADULTE : les personnages sont trapus (une tête de 10 px sur
   24, les épaules à 13 px du sol) ; à 0,78 case (son vrai 90 cm), le guidon arrivait aux épaules — le bras restait caché devant le
   buste, la main ne se lisait pas sur la poignée. À la taille (`SCOOT_BAR_H`), le bras se tend vers l'avant et vers le bas. */
export const SCOOT_BAR_H = 0.62, BMX_BAR_H = 0.6;
function drawScooterBar(ctx, r, F) {
  const pr = projector(r, F), col = BOARD_COLORS[(r.color | 0) % BOARD_COLORS.length].deck, H = SCOOT_BAR_H;
  line3(ctx, pr, 0.25, 0, 0.08, 0.3, 0, H, "#c9ced6");
  line3(ctx, pr, 0.255, 0.01, 0.08, 0.305, 0.01, H, "#6e747e");
  const pb = spun(pr, 0.3, r.bar || 0);   // le barspin : le guidon tourne sur le tube
  line3(ctx, pb, 0.3, -0.2, H, 0.3, 0.2, H, "#d6dbe2");
  for (const sb of [-1, 1]) line3(ctx, pb, 0.3, sb * 0.2, H, 0.3, sb * 0.14, H, col);   // les poignées
}

/* ── LE BMX : deux roues de 20 pouces (vues comme des ellipses : elles sont dans le plan vertical du cap), le cadre, le guidon ──
   ⚠️ 2026-10-14 — Guillaume : « le BMX plus réaliste ». Premier jet (2026-10-11) : un fil d'un pixel — des roues en cercle mince (un
   vélo de ville), un cadre qu'on ne voyait pas, et vu de face un BÂTON (une roue de profil n'a pas d'épaisseur). Ce qui fait un BMX :
     · des PNEUS ÉPAIS À CRAMPONS (2,3 pouces) : le pneu est un tore — deux anneaux de part et d'autre du plan de la roue, crampons
       un pixel sur deux ; vu de face, il garde deux pixels de large ;
     · la JANTE d'acier, le moyeu, le jour des rayons entre eux ; les PEGS (les tubes de grind) qui dépassent des deux moyeux ;
     · le CADRE en tubes épais (deux pixels, le dessus dans la couleur louée, le dessous à l'ombre), le triangle arrière court, la selle
       basse, la fourche à deux fourreaux ;
     · le PÉDALIER : le plateau du côté de la transmission (à droite du cap), la chaîne jusqu'au pignon arrière, les manivelles qui
       tournent avec le pédalage (`R.crank`, la même phase que les pieds — `drawRide`) ;
     · le GUIDON haut à deux montants et sa barre transversale, les poignées noires.
   Ce qui est du côté LOIN (à gauche du cap si la droite regarde le sud, et l'inverse) se peint avant la roue et le cadre, le côté PROCHE
   après : c'est le sens du travers à l'écran (`F.l`) qui le dit. */
const BMX = { R: 0.21, aR: -0.42, aF: 0.42, BB: [-0.04, 0.17], SEAT: [-0.18, 0.5], HEAD: [0.3, 0.52], CRANK: 0.09, RING: 0.065, PEG: [0.05, 0.12], TIRE_B: 0.028 };
const TIRE = ["#1b1c20", "#3a3c43"], RIM = ["#737a85", "#cdd2d9"], STEEL_HI = "#e3e7ec", STEEL = "#b3b9c2", STEEL_LO = "#6e747e";
function drawBmxWheel(ctx, pr, a, R, nearB) {
  const n = 56;
  // le pneu : deux anneaux (le côté loin d'abord), crampons un pixel sur deux le long de la bande de roulement
  for (const sb of [-nearB, nearB]) for (let k = 0; k < n; k++) {
    const ph = (k / n) * Math.PI * 2;
    const P = pr(a + R * Math.cos(ph), sb * BMX.TIRE_B, R + R * Math.sin(ph));
    P1(ctx, Math.floor(P[0]), Math.floor(P[1]), 1, 1, TIRE[(Math.floor((ph / (2 * Math.PI)) * 22) & 1) && sb === nearB ? 1 : 0]);
  }
  // la jante, fine (un éclat en haut à gauche de l'écran), et le moyeu : entre les deux, le jour des rayons — premier jet, des rayons
  // peints en plus : à 3 pixels de rayon, la roue devenait un disque gris plein (une roue de brouette)
  for (let k = 0; k < 28; k++) {
    const ph = (k / 28) * Math.PI * 2, P = pr(a + R * 0.74 * Math.cos(ph), 0, R + R * 0.74 * Math.sin(ph));
    P1(ctx, Math.floor(P[0]), Math.floor(P[1]), 1, 1, Math.sin(ph) > 0.5 && Math.cos(ph) < 0.2 ? RIM[1] : RIM[0]);
  }
  const H = pr(a, 0, R);
  P1(ctx, Math.floor(H[0]), Math.floor(H[1]), 1, 1, STEEL_HI);
}
/* Un tube épais : deux traits, le haut dans sa couleur, le dessous (un rien plus bas) à l'ombre. */
function tube(ctx, pr, a0, h0, a1, h1, c, cLo, b) {
  line3(ctx, pr, a0, b || 0, h0 - 0.04, a1, b || 0, h1 - 0.04, cLo);
  line3(ctx, pr, a0, b || 0, h0, a1, b || 0, h1, c);
}
function drawBmx(ctx, r, F, part) {
  const pr0 = projector(r, F), col = BOARD_COLORS[(r.color | 0) % BOARD_COLORS.length];
  const R = BMX.R, aR = BMX.aR, aF = BMX.aF, BB = BMX.BB, SEAT = BMX.SEAT, HEAD = BMX.HEAD;
  const pr = spun(pr0, 0.3, r.whip || 0);      // le tailwhip : le cadre et la roue arrière tournent autour de la douille
  const pb = spun(pr0, 0.27, r.bar || 0);      // le barspin : le guidon (et la fourche, solidaire) tourne sur la potence
  // le côté PROCHE du cadre : celui dont le travers descend à l'écran (vers le sud = vers nous)
  const nearB = F.l[1] >= 0 ? 1 : -1, cr = r.crank || 0;
  const peg = (p, a) => line3(ctx, p, a, nearB * BMX.PEG[0], R, a, nearB * BMX.PEG[1], R, STEEL);
  const pegFar = (p, a) => line3(ctx, p, a, -nearB * BMX.PEG[0], R, a, -nearB * BMX.PEG[1], R, STEEL_LO);
  // une manivelle et sa pédale, du côté `sb` (+1 : la droite du cap, celle du plateau) ; les deux en opposition
  const crank = (sb) => {
    const k = sb > 0 ? -1 : 1, pa = BB[0] + k * BMX.CRANK * Math.cos(cr), ph = BB[1] + k * BMX.CRANK * Math.sin(cr);   // comme les pieds (`drawRide`)
    line3(ctx, pr, BB[0], sb * 0.06, BB[1], pa, sb * 0.08, ph, sb === nearB ? STEEL_LO : "#4a4d55");
    line3(ctx, pr, pa - 0.03, sb * 0.11, ph, pa + 0.03, sb * 0.11, ph, "#1d1e22");
  };
  if (part !== "front") {
    pegFar(pr, aR); crank(-nearB);
    drawBmxWheel(ctx, pr, aR, R, nearB);
    // le triangle arrière (bases et haubans, à l'ombre), le tube de selle, le tube supérieur, le diagonal — épais, la couleur louée
    line3(ctx, pr, aR, 0, R, BB[0], 0, BB[1], col.deckLo);
    line3(ctx, pr, aR, 0, R, SEAT[0], 0, SEAT[1] - 0.04, col.deckLo);
    tube(ctx, pr, BB[0], BB[1], SEAT[0], SEAT[1], col.deck, col.deckLo);
    tube(ctx, pr, SEAT[0], SEAT[1] - 0.02, HEAD[0], HEAD[1], col.deckHi, col.deck);
    tube(ctx, pr, BB[0], BB[1] + 0.03, HEAD[0], HEAD[1] - 0.06, col.deck, col.deckLo);
    line3(ctx, pr, HEAD[0], 0, HEAD[1] - 0.08, HEAD[0] + 0.01, 0, HEAD[1] + 0.03, STEEL_LO);       // la douille
    // la selle basse, son nez relevé
    line3(ctx, pr, SEAT[0], 0, SEAT[1], SEAT[0] - 0.02, 0, SEAT[1] + 0.04, STEEL_LO);
    line3(ctx, pr, SEAT[0] - 0.11, 0, SEAT[1] + 0.04, SEAT[0] + 0.07, 0, SEAT[1] + 0.07, "#26262b");
    // la transmission, côté droit du cap : le plateau au boîtier, la chaîne jusqu'au pignon
    const sbD = 1;
    for (let k = 0; k < 16; k++) { const ph = (k / 16) * Math.PI * 2, P = pr(BB[0] + BMX.RING * Math.cos(ph), sbD * 0.05, BB[1] + BMX.RING * Math.sin(ph)); P1(ctx, Math.floor(P[0]), Math.floor(P[1]), 1, 1, sbD === nearB ? STEEL : STEEL_LO); }
    line3(ctx, pr, BB[0], sbD * 0.05, BB[1] + BMX.RING, aR, sbD * 0.05, R + 0.03, "#4a4d55");
    line3(ctx, pr, BB[0], sbD * 0.05, BB[1] - BMX.RING, aR, sbD * 0.05, R - 0.03, "#3a3c42");
    crank(nearB); peg(pr, aR);
  }
  if (part !== "back") {
    pegFar(pr0, aF);
    drawBmxWheel(ctx, pr0, aF, R, nearB);
    // la fourche : deux fourreaux de part et d'autre de la roue, de la douille au moyeu
    // (écartés de 6,5 cm, un rien plus qu'en vrai : vu de face, ils doivent ENCADRER le pneu, pas le couvrir)
    for (const sb of [-nearB, nearB]) line3(ctx, pb, HEAD[0], sb * 0.065, HEAD[1] - 0.06, aF, sb * 0.065, R, sb === nearB ? STEEL : STEEL_LO);
    peg(pr0, aF);
    // la potence, le guidon haut : deux montants qui s'écartent, la barre transversale, les poignées
    line3(ctx, pb, HEAD[0] + 0.01, 0, HEAD[1] + 0.03, 0.27, 0, HEAD[1] + 0.05, STEEL_LO);
    for (const sb of [-1, 1]) line3(ctx, pb, 0.28, sb * 0.05, HEAD[1] + 0.03, 0.27, sb * 0.17, BMX_BAR_H, STEEL);
    line3(ctx, pb, 0.275, -0.1, BMX_BAR_H - 0.035, 0.275, 0.1, BMX_BAR_H - 0.035, STEEL_LO);
    line3(ctx, pb, 0.27, -0.17, BMX_BAR_H, 0.27, 0.17, BMX_BAR_H, STEEL_HI);
    for (const sb of [-1, 1]) line3(ctx, pb, 0.27, sb * 0.24, BMX_BAR_H, 0.27, sb * 0.17, BMX_BAR_H, "#26262b");
  }
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ LE CORPS DU RIDER — UN SQUELETTE TAILLÉ DANS LA FEUILLE DU PERSONNAGE (2026-10-13).
   ╚════════════════════════════════════════════════════════════════════════════
   Guillaume (2026-10-13) : « l'animation doit être ULTRA précise anatomiquement, pas avec des membres désarticulés — et les autres
   véhicules aussi ». ⚠️ Premier jet (2026-10-11) : les membres étaient des MORCEAUX de la feuille déplacés EN BLOC — chaque moitié
   de jambe posée sur son pied (deux colonnes séparées jusqu'à la ceinture : plus de bassin), la jambe qui pousse un rectangle posé
   en « L » à côté du corps, les manches « écartées » flottant à un pixel du buste, un trou au milieu du buste de profil (on y
   retirait le bras). Ici, un SQUELETTE : les ATTACHES restent sur le corps — les hanches sous le buste, les épaules en haut des
   manches — et chaque membre est la tranche de la feuille ÉTIRÉE RANGÉE PAR RANGÉE le long de son os (hanche → genou → pied,
   épaule → coude → main) : il garde ses couleurs, son ombre, sa chaussure, et ne se détache jamais.
   La feuille (16 × 24 par image ; rangée 0 de face, 1 de dos, 2 de profil, tournée vers la droite) : la tête rangées 0..9, le buste
   10..15, les bras x 3-4 et 11-12 (la manche à partir de la rangée 11 — 13 en robe, les cheveux couvrent les épaules —, la main à
   la 15), le profil a sa main au milieu du buste (x 7-8) ; les jambes x 5..7 (la claire) et 8..10 (la sombre), rangées 16..23
   dont la chaussure 21..23 (en robe : 21..23, la bottine 23).
   Ce qui fait un rider et pas un piéton posé sur une planche :
     · les PIEDS sont là où le véhicule les porte (`feet`) — une garde large de face, un pied devant l'autre en profondeur de profil ;
     · les GENOUX fléchis (`bend`) : les hanches descendent, la jambe se raccourcit (de face : le genou vient vers nous), et de profil
       le genou avance ;
     · le BUSTE penche dans le virage (`lean`, la tête plus que le buste) ;
     · les BRAS s'écartent pour l'équilibre (`arms`), ou tiennent le guidon (`hands`) ;
     · la POUSSÉE : une jambe quitte la planche et va chercher le sol (`push` : le pied, déjà projeté par l'appelant). */
const RB = { SHOE: 3, ARM_TOP: 11, ARM_TOP_SKIRT: 13, HAND_Y: 15 };
function drawRiderBody(ctx, sheet, row, px, top, o) {
  const sy = row * 24, side = row === 2;
  const LY = o.skirt ? 21 : PS.LEG_Y, SHOE = o.skirt ? 1 : RB.SHOE, ARM_TOP = o.skirt ? RB.ARM_TOP_SKIRT : RB.ARM_TOP, HY = RB.HAND_Y;
  const legNat = 24 - LY, bend = Math.max(0, o.bend || 0), lean = o.lean || 0;
  // ── les pieds (`x` : la colonne du milieu de la chaussure ; `y` : la rangée SOUS la semelle)
  const mx = (o.feet[0][0] + o.feet[1][0]) / 2, my = (o.feet[0][1] + o.feet[1][1]) / 2;
  let fL, fR;
  if (side) {
    /* De profil, la planche file vers le haut et le bas de l'écran : les pieds gardent leur place naturelle en x (la jambe claire,
       x 5..7, la plus proche — c'est celle du pied le plus BAS à l'écran), chacun à SA hauteur d'écran (la profondeur). */
    /* ⚠️ L'écart en profondeur borné à deux pixels : la garde (46 cm) en ferait six, et la jambe du fond, réduite à sa chaussure
       sous la hanche, avait l'air coupée au genou. La planche, elle, file en entier sous les deux pieds. */
    // (et les deux pieds SUR la planche, l'un derrière l'autre : ±½ px — à ±1,5, les jambes l'enjambaient de part et d'autre)
    const d = Math.max(0, Math.min(2, Math.abs(o.feet[0][1] - o.feet[1][1])));
    fL = [mx - 0.5, my + d / 2]; fR = [mx + 0.5, my - d / 2];
    if (o.pedals) {
      // au BMX, les pieds sont où sont les pédales (devant, derrière, en haut, en bas) : c'est ce qui fait voir le pédalage. La pédale
      // proche est connue de l'appelant (son côté du cadre), jamais déduite de l'écran — sinon les jambes s'échangeraient à mi-tour.
      const dMax = o.depth || 2.5;   // l'écart de profondeur admis (les rollers : 1,5 — leur pied levé, plus loin, flottait)
      const nr = o.pedals[0], fr = o.pedals[1], m = (nr[1] + fr[1]) / 2, dy = Math.max(-dMax, Math.min(dMax, nr[1] - fr[1]));
      fL = [nr[0], m + dy / 2]; fR = [fr[0], m - dy / 2];
    }
  } else {
    // de face, de dos : l'écart le long de la planche s'ouvre en largeur (3 px au naturel, 8 au plus) ; en hauteur, un pixel au plus
    const sp = Math.max(3, Math.min(8, Math.abs(o.feet[1][0] - o.feet[0][0])));
    const dyF = Math.max(-1, Math.min(1, Math.round((o.feet[1][1] - o.feet[0][1]) / 2)));
    fL = [mx - sp / 2, my - dyF * 0.5]; fR = [mx + sp / 2, my + dyF * 0.5];
  }
  // ── les hanches : au-dessus du milieu des pieds, descendues de `bend` ; le buste posé dessus
  const hipY = Math.round((fL[1] + fR[1]) / 2) - legNat + bend;
  /* Accroupi de profil, le BASSIN RECULE d'un pixel quand le genou avance : la ligne en « < » d'un vrai accroupi (premier jet, le
     bassin à l'aplomb des pieds : un genou en marche d'escalier). On fait face à droite : reculer, c'est −x. */
  const hipBack = side ? Math.min(1, Math.round(bend / 2)) : 0;
  const t0 = hipY - LY, cx = Math.round(mx - 8 + 0.5) - hipBack;
  const tx = Math.round(lean * 0.5), hx = Math.round(lean);
  /* ── UN BRAS : de l'épaule (le haut de la manche, 2 px de large) à la main. Chaque pas reprend la rangée de manche qui lui
     correspond, la main nue au bout ; un bras plutôt horizontal fléchit un rien au coude (vers le bas). */
  /* ⚠️ 2026-10-24 — EN 32 × 48 (la feuille fine porte `__armRig`, persoHdArt.js `persoHdArmRig`). Guillaume : « les bras doivent
     être correctement articulés / orientés sur le BMX, la trottinette… ». Le pas d'ici est un pixel du 16 × 24 : en 32 × 48, il
     découpait le bras fin en carreaux de 2 × 2 qui ne tournaient pas avec l'os — un bras à l'horizontale (la main au guidon de
     profil) gardait ses ombres VERTICALES et son revers en travers, un bras rayé. Ici, la bande du bras fin (4 px de large) se
     pose rangée fine par rangée fine le long de l'os, sa largeur EN TRAVERS de l'os (de côté sur un bras qui descend, de haut en
     bas sur un bras qui s'allonge : la lumière reste en haut à gauche) ; la manche et l'avant-bras s'étirent, la main garde ses
     rangées au bout. Un pixel fin = ½ pixel monde : la toile des poses est à ×2 (`drawPoseHD`). */
  const rig = sheet.__armRig || null, bare = sheet.__bare || null;
  const armHD = (srcX, shX, shY, dx, dy, horiz, sag) => {
    const x0 = side ? rig.side : srcX < 8 ? rig.front[0] : rig.front[1], top = 2 * ARM_TOP, [h0, h1] = rig.hand, hn = h1 - h0 + 1;
    const N = Math.max(hn + 2, Math.ceil(2 * Math.max(Math.abs(dx), Math.abs(dy))) + 1), body = N - hn;
    for (let k = 0; k < N; k++) {
      const t = k / (N - 1), X = Math.round(2 * (shX + dx * t)), Y = Math.round(2 * (shY + dy * t + sag * Math.sin(Math.PI * t)));
      const r = k < body ? top + Math.min(h0 - top - 1, Math.floor((k * (h0 - top)) / body)) : h0 + k - body;
      for (let i = 0; i < rig.w; i++) ctx.drawImage(sheet, (x0 + i) / 2, sy + r / 2, 0.5, 0.5, (X + (horiz ? 0 : i)) / 2, (Y + (horiz ? i : 0)) / 2, 0.5, 0.5);
    }
  };
  const arm = (srcX, shX, shY, hdX, hdY) => {
    let dx = hdX - shX, dy = hdY - shY;
    const L0 = Math.hypot(dx, dy), LMAX = o.armMax || 8;   // 2026-10-15 : `armMax`, les bras tendus du handplant (au-delà de la tête)
    if (L0 > LMAX) { dx *= LMAX / L0; dy *= LMAX / L0; }
    const n = Math.max(2, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)))), horiz = Math.abs(dx) > Math.abs(dy);
    const sag = horiz ? Math.min(1, Math.hypot(dx, dy) * 0.12) : 0;
    if (rig) return armHD(srcX, shX, shY, dx, dy, horiz, sag);
    for (let i = 0; i <= n; i++) {
      const t = i / n, X = Math.round(shX + dx * t), Y = Math.round(shY + dy * t + sag * Math.sin(Math.PI * t));
      const r = i === n ? HY : ARM_TOP + Math.min(HY - 1 - ARM_TOP, Math.floor(t * (HY - ARM_TOP)));
      if (horiz) { ctx.drawImage(sheet, srcX, sy + r, 1, 1, X, Y, 1, 1); ctx.drawImage(sheet, srcX + 1, sy + r, 1, 1, X, Y + 1, 1, 1); }
      else ctx.drawImage(sheet, srcX, sy + r, 2, 1, X, Y, 2, 1);
    }
  };
  const armBack = () => { const h = o.hands[0]; arm(7, cx + 7 + tx, t0 + ARM_TOP, h[0] - 0.5, h[1]); };
  // LES MAINS SUR LE GUIDON (BMX, trottinette) : de profil, le bras de devant ; de face, chacun sa poignée
  function drawHands() {
    if (side) { const h = o.hands[o.hands.length - 1]; arm(7, cx + 7 + tx, t0 + ARM_TOP, h[0] - 0.5, h[1]); return; }
    const hs = [...o.hands].sort((a, b) => a[0] - b[0]);
    arm(3, cx + 3 + tx, t0 + ARM_TOP, hs[0][0] - 1, hs[0][1]);
    arm(11, cx + 11 + tx, t0 + ARM_TOP, hs[hs.length - 1][0], hs[hs.length - 1][1]);
  }
  // `o.part === "arms"` : on ne redessine QUE les bras au guidon (l'appelant a posé le guidon par-dessus le corps entre-temps)
  if (o.part === "arms") { if (o.hands && o.hands.length) drawHands(); return; }
  /* ── UNE JAMBE : la tranche x `srcX`..+2 de la feuille, de la hanche (fixe, sous le buste) au pied (`fx`, `fy`). Les rangées de
     jambe s'étirent ou se tassent entre la hanche et la chaussure, qui garde ses rangées (elle reste plate sur le plateau) ; le
     décalage suit l'os : la cuisse jusqu'au genou (à mi-hauteur, poussé de `knee` px), le tibia jusqu'au pied. */
  const leg = (srcX, fx, fy, knee) => {
    const n = Math.round(fy) - hipY;
    if (n <= 0) return;
    const baseX = cx + srcX, dxF = fx - (baseX + 1);
    // la chaussure garde ses rangées tant que la jambe en garde trois ; accroupi plus bas, c'est la cheville qui se tasse (premier
    // jet : deux rangées de pantalon sur trois de chaussure, des pieds de clown)
    const shoe = Math.max(1, Math.min(SHOE, n - 3)), legRows = n - shoe, srcLeg = legNat - SHOE;
    const kx = dxF * 0.5 + (knee || 0);
    for (let j = 0; j < n; j++) {
      let r, off;
      if (j >= legRows) { r = 24 - (n - j); off = dxF; }
      else {
        r = LY + Math.min(srcLeg - 1, Math.floor((j * srcLeg) / legRows));
        const t = (j + 0.5) / legRows;
        off = t < 0.5 ? kx * (t / 0.5) : kx + (dxF - kx) * ((t - 0.5) / 0.5);
      }
      ctx.drawImage(sheet, srcX, sy + r, 3, 1, Math.round(baseX + off), hipY + j, 3, 1);
    }
    // 2026-10-14 — ce qui CHAUSSE le pied (la bottine des rollers), peint juste après SA jambe : la proche recouvre la lointaine
    if (o.boot) o.boot(fx, fy, n, side);
  };
  // le genou de profil avance (on fait face à droite : +x) ; de face, il vient vers nous — la jambe se raccourcit et les genoux
  // s'ouvrent (l'accroupi vu de face : « ( ) », pas deux jambes tronquées)
  const kneeFwd = side ? Math.min(2, Math.round(bend * 0.6)) : 0, kneeOut = side ? 0 : Math.min(1, Math.round(bend * 0.4));
  const LEG_L = 5, LEG_R = 8;   // les tranches : la jambe claire, la sombre
  // 2026-10-13 (soir) — ce qui se pose SOUS les pieds (les platines des rollers), aux pieds que le squelette a retenus, le fond d'abord
  if (o.under) o.under(side ? [fR, fL] : [fL, fR], side);
  if (o.push) {
    // la jambe qui pousse, tendue vers le sol ; l'autre porte, genou fléchi
    const pushL = o.push.x < mx;
    // le pied qui pousse touche le sol à côté du plateau : un peu plus bas que le pied qui porte, jamais une jambe d'échassier
    const supY = pushL ? fR[1] : fL[1];
    const pf = [o.push.x, Math.max(supY - 1, Math.min(supY + 3, o.push.y))];
    if (side) { leg(LEG_R, pushL ? fR[0] : pf[0], pushL ? fR[1] : pf[1], pushL ? kneeFwd : 0); leg(LEG_L, pushL ? pf[0] : fL[0], pushL ? pf[1] : fL[1], pushL ? 0 : kneeFwd); }
    else { leg(LEG_L, pushL ? pf[0] : fL[0], pushL ? pf[1] : fL[1], pushL ? 0 : -kneeOut); leg(LEG_R, pushL ? fR[0] : pf[0], pushL ? fR[1] : pf[1], pushL ? kneeOut : 0); }
  } else if (side) {
    // `knee` [proche, lointain] : le genou de chaque jambe (la jambe qui pousse en arrière, aux rollers, est TENDUE : un genou en avant
    // y faisait un zigzag — 2026-10-13 soir) ; sinon, les deux avancent de l'accroupi
    leg(LEG_R, fR[0], fR[1], o.knee ? o.knee[1] : kneeFwd); leg(LEG_L, fL[0], fL[1], o.knee ? o.knee[0] : kneeFwd);
  }
  else { leg(LEG_L, fL[0], fL[1], o.kneeLR ? o.kneeLR[0] : -kneeOut); leg(LEG_R, fR[0], fR[1], o.kneeLR ? o.kneeLR[1] : kneeOut); }   // `kneeLR` : [gauche, droite] à l'écran
  // ── le buste et la tête. Les bras qui quittent le corps (de face, de dos) en sont ôtés : les colonnes x 3 et 12, et les mains.
  const TY = PS.TORSO_Y, armsOff = !side && ((o.hands && o.hands.length) || (o.arms && o.arms !== "down"));
  if (armsOff) {
    ctx.drawImage(sheet, 0, sy + TY, 16, ARM_TOP - TY, cx + tx, t0 + TY, 16, ARM_TOP - TY);
    // en 32 × 48, le buste SANS BRAS (`bare`) : le bras fin, rentré d'un pixel, chevauche les colonnes x 4 et 11 que le 16 × 24
    // gardait au buste — une bande de bras (revers, avant-bras) y restait collée pendant que le vrai bras partait au guidon
    if (bare) ctx.drawImage(bare, 0, ARM_TOP + sy, 16, HY + 1 - ARM_TOP, cx + tx, t0 + ARM_TOP, 16, HY + 1 - ARM_TOP);
    else {
      ctx.drawImage(sheet, 4, sy + ARM_TOP, 8, HY - ARM_TOP, cx + 4 + tx, t0 + ARM_TOP, 8, HY - ARM_TOP);
      ctx.drawImage(sheet, 5, sy + HY, 6, 1, cx + 5 + tx, t0 + HY, 6, 1);
    }
    if (LY > HY + 1) ctx.drawImage(sheet, 0, sy + HY + 1, 16, LY - HY - 1, cx + tx, t0 + HY + 1, 16, LY - HY - 1);
  } else {
    // de profil, le bras lointain tient la poignée du fond : il passe DERRIÈRE le buste, seule sa main dépasse
    if (side && o.hands && o.hands.length > 1) armBack();
    // de profil, le bras proche qui quitte le flanc (au guidon, en balancier) : en 32 × 48, le flanc nu (`bare`) — le bras fin s'y
    // voyait en entier (manche, revers blanc, avant-bras) à côté de celui qui tient le guidon
    const flank = side && bare && ((o.hands && o.hands.length) || o.swing);
    ctx.drawImage(flank ? bare : sheet, 0, sy + TY, 16, LY - TY, cx + tx, t0 + TY, 16, LY - TY);
    // de profil, la main posée au guidon quitte le flanc : sa place reprend le tissu de la rangée (pas de trou dans le buste)
    if (side && o.hands && o.hands.length && !flank) for (const xx of [7, 8]) ctx.drawImage(sheet, 6, sy + HY, 1, 1, cx + xx + tx, t0 + HY, 1, 1);
  }
  ctx.drawImage(sheet, 0, sy, 16, PS.HEAD_H, cx + hx, t0, 16, PS.HEAD_H);
  const shY = t0 + ARM_TOP;
  if (o.hands && o.hands.length) { if (o.part !== "body") drawHands(); return; }
  /* 2026-10-13 (soir) — de profil, LE BRAS PROCHE QUI BALANCE (`swing` : de combien de pixels la main avance, + vers l'avant) : la
     foulée des rollers. Il part de l'épaule ; la main quitte le flanc, sa place reprend le tissu (comme la main posée au guidon). */
  if (side && o.swing) {
    if (!bare) for (const xx of [7, 8]) ctx.drawImage(sheet, 6, sy + HY, 1, 1, cx + xx + tx, t0 + HY, 1, 1);
    arm(7, cx + 7 + tx, shY, cx + 7 + tx + o.swing, t0 + HY);
  }
  if (armsOff) {
    // L'ÉQUILIBRE : les bras écartés du corps — un peu (« out » : les mains à hauteur de hanche, deux pixels dehors) ou franchement
    // (« wide » : à hauteur de poitrine, le saut, la glisse) ; on se rattrape du côté où l'on penche (`armTilt` : cette main monte)
    const tilt = o.armTilt || 0, wide = o.arms === "wide", up = o.arms === "up";
    const hy = t0 + (up ? 7 : wide ? 13 : 16), ox = up ? 2 : wide ? 4 : 2;
    arm(3, cx + 3 + tx, shY, cx + 3 + tx - ox, hy - (tilt > 0 ? 2 : 0));
    arm(11, cx + 11 + tx, shY, cx + 11 + tx + ox, hy - (tilt < 0 ? 2 : 0));
  }
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ LE RIDER — `p.ride` : { kind, th, air (cases au-dessus du relief), mode ("ground" | "air" | "bail"), pose, ph (la phase de
   ║ poussée ou de foulée), color, flip, bend, lean }. `sheet` / `skirt` : la feuille du personnage. (px, py) : le coin du sprite.
   ╚════════════════════════════════════════════════════════════════════════════ */
export function drawRide(ctx, sheet, px, py, p, skirt) {
  const r = p.ride;
  const fx = C.footX(p.x), fy = C.footY(p.y);
  const surf = r.mode === "air" ? null : SP.parkSurf(fx, fy, {});
  const R = { fx, fy, th: r.th, air: r.air || 0, surf, color: r.color, flip: r.flip, bar: r.bar || 0, whip: r.whip || 0,
    crank: r.kind === "bmx" && r.pose === "glide" ? 2 * Math.PI * (r.ph || 0) : 0 };   // 2026-10-14 : les manivelles dessinées tournent avec les pieds
  const F = frameOf(R);
  const airPx = Math.round((r.air || 0) * T);
  // le sens du corps : le skateur de travers (la poitrine à droite du cap — un regular), les autres face au cap
  const look = r.kind === "skate" ? r.th + Math.PI / 2 : r.th + (r.back ? Math.PI : 0);
  const lc = Math.cos(look), ls = Math.sin(look);
  const dir = Math.abs(lc) > Math.abs(ls) ? (lc < 0 ? 2 : 3) : (ls < 0 ? 1 : 0);
  const row = dir === 0 ? 0 : dir === 1 ? 1 : 2, flipX = dir === 2;
  const pose = r.mode === "bail" ? "fall" : r.pose || "stand";
  const frontIsNear = Math.sin(r.th) > 0.2;   // le véhicule pointe vers le bas de l'écran : son avant passe devant le corps
  if (r.mode === "bail") {
    // la chute : le véhicule a filé (il glisse à côté), le corps au sol, sonné
    if (r.kind === "skate") drawBoard(ctx, { ...R, fx: fx + Math.cos(r.th) * 0.6, fy: fy + Math.sin(r.th) * 0.6, air: 0, surf: null }, frameOf({ th: r.th + 0.6, air: 1 }));
    const by = py;
    if (flipX) { ctx.save(); ctx.translate(px + 16, 0); ctx.scale(-1, 1); drawSkate(ctx, sheet, row, 0, by, "fall", r.ph || 0, skirt, { foot: "shoe" }); ctx.restore(); }
    else drawSkate(ctx, sheet, row, px, by, "fall", r.ph || 0, skirt, { foot: "shoe" });
    return;
  }
  if (r.kind === "roller") { drawRollers(ctx, sheet, row, px, R, F, r, pose, flipX, skirt); return; }
  /* Les pieds sur le véhicule : deux points du plateau (le long de son axe), projetés. Le corps en miroir (profil gauche) les
     reçoit dans SON repère : x ↦ 2·px + 16 − x. */
  const pr = projector(R, F);
  const deckH = r.kind === "skate" ? 0.11 : r.kind === "scooter" ? 0.1 : 0.2;
  const along = r.kind === "skate" ? 0.2 : r.kind === "scooter" ? 0.08 : 0.07;
  const lat = r.kind === "bmx" ? 0.11 : 0;
  let fA = pr(-along, -lat, deckH), fB = pr(along, lat, deckH);
  if (r.kind === "bmx") {
    /* 2026-10-13 — LES PÉDALES TOURNENT : les deux pieds sur les manivelles (9 cm, de part et d'autre du boîtier, en opposition), à la
       phase du pédalage — premier jet, deux points fixes : le BMX « pédalait » les pieds immobiles. À l'arrêt, manivelles à plat. */
    const cr = 0.09, phc = r.pose === "glide" ? 2 * Math.PI * (r.ph || 0) : 0, BBa = -0.04, BBh = 0.17;
    fA = pr(BBa + cr * Math.cos(phc), -0.11, BBh + cr * Math.sin(phc)); fB = pr(BBa - cr * Math.cos(phc), 0.11, BBh - cr * Math.sin(phc));
  }
  const mir = (q) => (flipX ? [2 * px + 16 - q[0], q[1]] : q);
  /* La pédale PROCHE (de profil) : celle du côté du cadre tourné vers nous — le travers du cap (`F.l`) pointe vers le bas de l'écran
     quand cos(cap) > 0, et c'est alors la pédale de droite (`fB`). */
  const pedals = r.kind === "bmx" ? (Math.cos(r.th) > 0 ? [mir(fB), mir(fA)] : [mir(fA), mir(fB)]) : null;
  let a = mir(fA), b = mir(fB);
  if (a[0] > b[0]) { const t = a; a = b; b = t; }
  const feet = [[a[0], a[1]], [b[0], b[1]]];   // ⚠️ la projection porte DÉJÀ la hauteur en l'air (`R.air`) : la retrancher encore levait le corps deux fois
  /* Les genoux au repos : debout sur ses pédales, le rider de BMX les garde fléchis (deux pixels) ; sur la trottinette, souples (un). */
  const bend0 = r.kind === "bmx" ? 2 : r.kind === "scooter" ? 1 : 0;
  const o = { feet, skirt, bend: Math.max(bend0, r.bend || 0), lean: (flipX ? -1 : 1) * (r.lean || 0), arms: r.kind === "skate" ? "out" : "down", armTilt: r.lean || 0, pedals };
  if ((r.kind === "bmx" || r.kind === "scooter") && !r.grab) {
    // les poignées, projetées (le barspin les fait tourner : à mi-tour, on lâche le guidon — les mains restent en l'air)
    const bA = r.kind === "bmx" ? 0.27 : 0.3, bH = r.kind === "bmx" ? BMX_BAR_H : SCOOT_BAR_H, bB = r.kind === "bmx" ? 0.21 : 0.18;
    /* 2026-10-15 — le X-UP : le guidon tourne jusqu'à ~160° et revient, LES MAINS RESTENT AUX POIGNÉES (elles passent de l'autre côté :
       les bras se croisent) — ce n'est pas un barspin ; le NO-HANDER : les mains quittent le guidon au milieu de la figure. */
    const spinning = !r.xup && r.bar && Math.abs(Math.sin(r.bar / 2)) > 0.35;
    if (!spinning && !(r.nohand > 0.3) && row !== 1) {   // de dos, le guidon est caché par le corps : les bras restent le long (tendus, ils se levaient vers lui)
      const gs = [pr(bA, -bB, bH), pr(bA, bB, bH)].map(mir);
      const sideView = row === 2;
      // de profil, les deux poignées, la lointaine (plus haut à l'écran) d'abord : son bras passe DERRIÈRE le buste
      o.hands = sideView ? [...gs].sort((p, q) => p[1] - q[1]) : gs;
    }
  }
  if ((r.kind === "skate" || r.kind === "scooter") && (pose === "push" || pose === "glide")) {
    // la poussée : le pied arrière (à l'opposé du cap) descend au sol à côté du plateau et balaie vers l'arrière (la trottinette :
    // le pied d'appui reste sur le plateau, l'autre pousse du même côté)
    const ph = ((r.ph || 0) % 1 + 1) % 1, sweep = Math.sin(ph * Math.PI);
    const back = pr((r.kind === "scooter" ? -0.05 : -0.18) - 0.22 * ph, r.kind === "scooter" ? -0.13 : -0.17, 0);
    const q = mir([back[0], back[1]]);
    o.push = { x: q[0], y: q[1] + (sweep > 0.3 ? 0 : -1), side: q[0] > (feet[0][0] + feet[1][0]) / 2 };
    o.bend = Math.max(o.bend, 1);
  }
  // le saut : genoux ramassés, bras ouverts — les pieds RESTENT sur le plateau (premier jet : levés de 2 px, ils flottaient au-dessus) ;
  // au BMX et à la trottinette, on garde le guidon (premier jet : les bras s'ouvraient, de dos, le guidon lâché en plein saut)
  if (pose === "hop") { o.bend = Math.max(o.bend, 3); if (r.kind === "skate") o.arms = "wide"; }
  // le BMX se monte penché sur son guidon : de profil, la tête et le buste avancent (+x : le repère du corps regarde à droite)
  if (r.kind === "bmx" && row === 2) o.lean += 1;
  if (r.grab) { o.bend += Math.round(2 * r.grab); o.arms = "down"; }   // la main va chercher la planche
  /* 2026-10-15 — le NO-HANDER : les mains lâchées s'ouvrent (de face, de dos : « wide », à hauteur de poitrine) ; de profil, le bras proche
     part en arrière (on ne voit pas un bras qui s'écarte vers nous), le buste se redresse d'un pixel */
  if (r.nohand > 0.3) { o.arms = "wide"; if (row === 2) { o.swing = -Math.round(2 * r.nohand); o.lean -= 1; } }
  if (pose === "grind") { o.arms = r.kind === "skate" ? "wide" : o.arms; }
  if (pose === "brake") { o.lean = (flipX ? 1 : -1) * 2; o.bend = Math.max(o.bend, 2); }
  const body = (part) => {
    const oo = part ? { ...o, part } : o;
    if (flipX) { ctx.save(); ctx.translate(px + 16, 0); ctx.scale(-1, 1); drawRiderBody(ctx, sheet, row, 0, 0, shiftFeet(oo, -px)); ctx.restore(); }
    else drawRiderBody(ctx, sheet, row, px, 0, oo);
  };
  if (r.kind === "skate") {
    // le pop shove-it : le plateau tourne sur lui-même SOUS les pieds (le corps garde son cap)
    if (r.yaw) { const Ry = { ...R, th: r.th + r.yaw }; drawBoard(ctx, Ry, frameOf(Ry)); } else drawBoard(ctx, R, F);
    body(); return;
  }
  // le guidon devant le corps (le véhicule pointe vers nous) se pose ENTRE le corps et les mains : les mains le tiennent, par-dessus
  if (r.kind === "scooter") {
    drawScooterDeck(ctx, R, F);
    if (!frontIsNear) drawScooterBar(ctx, R, F);
    if (frontIsNear) { body("body"); drawScooterBar(ctx, R, F); body("arms"); } else body();
    return;
  }
  if (r.kind === "bmx") {
    drawBmx(ctx, R, F, frontIsNear ? "back" : "all");
    if (frontIsNear) { body("body"); drawBmx(ctx, R, F, "front"); body("arms"); } else body();
  }
}
/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 2026-10-13 (soir) — LES ROLLERS SUR LE SQUELETTE (`drawRiderBody`), comme les trois autres montures.
   ╚════════════════════════════════════════════════════════════════════════════
   ⚠️ Premier jet (2026-10-11) : le corps du patineur de la patinoire (`drawSkate`, fermeArt.js) avec des roues sous les bottines —
   ses jambes y sont des MOITIÉS DE FEUILLE DÉPLACÉES EN BLOC (la foulée de face : deux colonnes détachées du bassin), ses bras de
   frein des manches posées à un pixel du buste. On ne retouche PAS `drawSkate` (la patinoire est jugée bonne, et deux changements
   visuels ne se livrent pas ensemble, §2) : les rollers le quittent. Les PIEDS sont posés en 3D (repère du cap couché sur la surface,
   comme les pédales du BMX) et projetés ; le squelette y attache les jambes. Sous chaque chaussure, la platine et ses roues, à la
   convention de la feuille (`o.under`, voir plus bas : projetées, elles se lisaient comme des échasses).
   Les poses : debout (pieds à 18 cm, genoux souples) ; la FOULÉE en V (le pied qui pousse part en arrière et dehors, se soulève au
   bout ; celui qui porte reste sous le corps ; le bras opposé balance) ; le CHASSE-NEIGE au frein (pieds larges, genoux pliés, bras
   ouverts) ; en l'air, pieds joints, genoux ramassés, bras ouverts ; en glisse (soul), un pied devant l'autre. */
/* ⚠️ 2026-10-14 — DES ROLLERS AGRESSIFS, PAS DES CHAUSSURES À ROULETTES (Guillaume : « les rollers aussi plus réalistes » ; le type,
   décidé avec lui : les inline de skatepark, ceux que nomment le soul grind et le misty). Premier jet : la chaussure ordinaire de la
   feuille, et sous elle une rangée de pastilles jaunes et noires — un damier, des patins de jouet. Ce qui fait lire un roller agressif :
     · la BOTTINE rigide qui monte à mi-mollet, dans la couleur louée (coque claire en haut, ombrée devant), sa MANCHETTE noire et la
       BOUCLE claire en haut, la sangle du cou-de-pied — peinte PAR-DESSUS la jambe, juste après elle (`o.boot`) ;
     · la PLATINE de grind (la « soul plate », noire) et le H-BLOCK d'acier entre les roues du milieu ;
     · QUATRE ROUES EN LIGNE, les deux du bout claires, les deux du milieu PETITES ET SOMBRES (l'« anti-rocker » qui laisse glisser le
       H-block sur un rail) : c'est la silhouette qu'on reconnaît.
   Au pixel, à la convention de la feuille (de profil, la bottine dépasse d'un pixel au talon et à la pointe ; de face, trois de large). */
const ROLLER = { plate: "#202126", block: "#8f96a0", wheel: "#ece7da", wheelLo: "#bdb6a6", anti: "#3a3c42", cuff: "#24242a", buckle: "#a8aeb6", SOLE: 0.13 };
function drawRollers(ctx, sheet, row, px, R, F, r, pose, flipX, skirt) {
  const pr = projector(R, F), side = row === 2;
  const ph = r.ph || 0, legP = Math.floor(ph) & 1, u = ph - Math.floor(ph);
  const sP = pose === "glide" ? Math.sin(u * Math.PI) : 0;
  const fw = r.back ? -1 : 1;   // en arrière (le fakie des rollers), la foulée pousse vers l'avant du cap
  // [a (le long du cap), b (en travers), h (levé)] — A du côté b > 0
  let A = [0, 0.09, 0], B = [0, -0.09, 0];
  if (pose === "glide") {
    const s = legP ? 1 : -1;
    const push = [fw * (-0.04 - 0.16 * sP), s * (0.09 + 0.08 * sP), sP > 0.75 ? 0.05 : 0], sup = [fw * 0.04, -s * 0.05, 0];
    if (s > 0) { A = push; B = sup; } else { A = sup; B = push; }
  } else if (pose === "brake") { A = [0.03, 0.15, 0]; B = [-0.03, -0.15, 0]; }
  else if (pose === "hop") { A = [0.02, 0.06, 0]; B = [-0.02, -0.06, 0]; }
  else if (pose === "grind") { A = [0.1, 0.07, 0]; B = [-0.1, -0.07, 0]; }
  if (pose === "hand") { drawRollerHandplant(ctx, sheet, row, px, R, F, r, flipX, skirt); return; }
  // 2026-10-15 — la PIROUETTE : les pieds serrés sous soi (on tourne sur ses roues), voir plus bas pour les bras
  if (r.piro) { A = [0.02, 0.04, 0]; B = [-0.02, -0.04, 0]; }
  const ft = [A, B].map(([a, b, h]) => ({ a, b, h, push: !r.piro && pose === "glide" && sP > 0.2 && (b > 0) === !!legP, p: pr(a, b, ROLLER.SOLE + h) }));
  // le corps : les pieds en haut de la platine ; de profil, la paire proche/lointain (comme les pédales du BMX), dans le repère du miroir
  const mir = (q) => (flipX ? [2 * px + 16 - q[0], q[1]] : q);
  let a = mir(ft[0].p), b = mir(ft[1].p);
  if (a[0] > b[0]) { const t = a; a = b; b = t; }
  const near = ft[0].p[1] >= ft[1].p[1] ? mir(ft[0].p) : mir(ft[1].p), far = ft[0].p[1] >= ft[1].p[1] ? mir(ft[1].p) : mir(ft[0].p);
  const nearF = ft[0].p[1] >= ft[1].p[1] ? ft[0] : ft[1];
  const bend0 = pose === "hop" ? 3 : pose === "brake" || pose === "grind" ? 2 : pose === "glide" ? 1 + Math.round(sP) : 1;
  const o = { feet: [[a[0], a[1]], [b[0], b[1]]], skirt, bend: Math.max(bend0, r.bend || 0) + (r.grab ? Math.round(2 * r.grab) : 0), lean: (flipX ? -1 : 1) * (r.lean || 0),
    arms: r.grab ? "down" : pose === "hop" || pose === "grind" ? "wide" : pose === "brake" ? "out" : pose === "glide" && sP > 0.35 ? "out" : "down",
    armTilt: pose === "glide" ? (legP ? 1 : -1) : r.lean || 0 };
  // la pirouette : les bras LEVÉS, ramenés au-dessus de la tête (la vrille du patin : on se grandit pour tourner vite), genoux souples
  if (r.piro) { o.arms = "up"; o.bend = Math.max(1, r.bend || 0); o.armTilt = 0; }
  const pushF = ft.find((f) => f.push);
  if (!side && pushF) {
    // de face, la jambe qui pousse part tendue sur le côté (genou dans l'axe) ; l'autre s'ouvre comme à l'accroupi
    const other = ft[0] === pushF ? ft[1] : ft[0], pushLeft = mir(pushF.p)[0] < mir(other.p)[0], kO = Math.min(1, Math.round(o.bend * 0.4));
    o.kneeLR = pushLeft ? [0, kO] : [-kO, 0];
  }
  if (side) {
    o.pedals = [near, far]; o.depth = 1.5;
    // de profil, le bras proche balance à contresens de la jambe qui pousse (vers l'avant quand elle part en arrière) ; la jambe qui
    // pousse est tendue (genou à l'aplomb), celle qui porte plie le genou en avant
    if (pose === "glide") {
      o.swing = Math.round(2.5 * sP) * (nearF.push ? 1 : -1);
      const kS = Math.min(2, Math.round(o.bend * 0.6));
      o.knee = [nearF.push ? 0 : kS, nearF.push ? kS : 0];
    }
  }
  /* LA PLATINE ET SES ROUES, sous chaque pied retenu par le squelette (dans SON repère : le miroir compris). Convention de la feuille
     (pas une projection : de face, une platine de 30 cm dans l'axe du regard se lisait comme une échasse) : de profil, six pixels dans
     le sens de la marche (un derrière le talon, deux devant la pointe) — la platine et son H-block, les roues dessous ; de face et de
     dos, trois pixels, la roue de devant entre les deux flancs du châssis. Le pied levé (la fin de la poussée) lève sa platine avec lui.
     `x0` : la première colonne de la chaussure, comme la pose la jambe (`Math.round(pied − 1)`). */
  const col = BOARD_COLORS[(r.color | 0) % BOARD_COLORS.length];
  o.under = (feet, sv) => {
    for (const f of feet) {
      const x0 = Math.round(f[0] - 1), y = Math.round(f[1]);
      if (sv) {
        // on regarde vers +x (le miroir a retourné les profils gauches) : les platines pointent où regarde le corps
        P1(ctx, x0 - 1, y, 6, 1, ROLLER.plate); P1(ctx, x0 + 1, y, 2, 1, ROLLER.block);
        P1(ctx, x0 - 1, y + 1, 1, 1, ROLLER.wheelLo); P1(ctx, x0, y + 1, 1, 1, ROLLER.wheel);
        P1(ctx, x0 + 1, y + 1, 2, 1, ROLLER.anti);
        P1(ctx, x0 + 3, y + 1, 1, 1, ROLLER.wheel); P1(ctx, x0 + 4, y + 1, 1, 1, ROLLER.wheelLo);
      } else {
        P1(ctx, x0, y, 3, 1, ROLLER.plate); P1(ctx, x0 + 1, y, 1, 1, ROLLER.block);
        P1(ctx, x0, y + 1, 1, 1, ROLLER.anti); P1(ctx, x0 + 1, y + 1, 1, 1, ROLLER.wheel); P1(ctx, x0 + 2, y + 1, 1, 1, ROLLER.anti);
      }
    }
  };
  /* LA BOTTINE, par-dessus la chaussure de la feuille et le bas de la jambe (jamais plus haut que la jambe n'a de rangées : en robe, ou
     accroupi, elle se tasse) : deux rangées de pied, la cheville, deux de manchette. */
  o.boot = (fx, fy, n, sv) => {
    const x0 = Math.round(fx - 1), yb = Math.round(fy), H = Math.min(5, n);
    const row = (k, x, w, c) => { if (k <= H) P1(ctx, x, yb - k, w, 1, c); };
    if (sv) {
      row(1, x0 - 1, 5, col.deck); P1(ctx, x0 + 3, yb - 1, 1, 1, col.deckLo);              // le pied, sa pointe à l'ombre
      row(2, x0 - 1, 5, col.deck); row(2, x0 - 1, 2, col.deckHi);                            // le cou-de-pied, la coque éclairée au talon
      row(2, x0 + 2, 1, col.deckLo);                                                          // la sangle (sombre : claire, elle faisait un point de plus)
      row(3, x0 - 1, 4, col.deck); row(3, x0 - 1, 1, col.deckHi);                            // la cheville
      row(4, x0, 3, ROLLER.cuff); row(5, x0, 3, ROLLER.cuff); row(5, x0 + 2, 1, ROLLER.buckle);   // la manchette, sa boucle
    } else {
      row(1, x0, 3, col.deck); row(2, x0, 3, col.deck); row(2, x0 + 1, 1, col.deckLo);
      row(3, x0, 3, col.deck); row(3, x0, 1, col.deckHi);
      row(4, x0, 3, ROLLER.cuff); row(5, x0, 3, ROLLER.cuff); row(5, x0 + 1, 1, ROLLER.buckle);
    }
  };
  if (flipX) { ctx.save(); ctx.translate(px + 16, 0); ctx.scale(-1, 1); drawRiderBody(ctx, sheet, row, 0, 0, shiftFeet(o, -px)); ctx.restore(); }
  else drawRiderBody(ctx, sheet, row, px, 0, o);
}
/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 2026-10-15 — LE HANDPLANT DES ROLLERS : les mains sur le coping, le corps renversé, les jambes en l'air, les roues vers le ciel.
   ╚════════════════════════════════════════════════════════════════════════════
   ⚠️ LE MÊME SQUELETTE, RETOURNÉ — pas une feuille de plus. Le corps est posé DEBOUT, jambes tendues, pieds serrés, les deux bras tendus
   au-delà de la tête (`armMax`) jusqu'au point des mains ; puis toute l'image est retournée de haut en bas autour de ce point (le
   coping, `pr(0, 0, 0)`) : la tête vient juste au-dessus du tube, les bras le long d'elle, les bottines et leurs platines tout en haut.
   Les attaches restent au corps (§4 : un membre déplacé en bloc se détache) ; seule la longueur des bras change — chez des personnages à
   grosse tête, des bras tendus au-delà d'elle sont la seule façon de les faire arriver au tube.
   L'équilibre : le corps oscille d'un pixel (`lean`), au rythme de la tenue (`r.hand.T`) — on ne tient pas un handplant immobile.
   ⚠️ Un `scale(1, -1)` : le faux canevas des bancs l'ignore (§4) — la pose se juge au navigateur (`app/audit-riders?k=roller&pose=hand`). */
function drawRollerHandplant(ctx, sheet, row, px, R, F, r, flipX, skirt) {
  const pr = projector(R, F), side = row === 2, H = pr(0, 0, 0);
  const hx = Math.round(H[0]), hy = Math.round(H[1]);
  const mir = (q) => (flipX ? [2 * px + 16 - q[0], q[1]] : q);
  const Fy = hy + 25;   // debout, la tête en haut à 24 px des pieds, les mains un pixel au-dessus : elles tombent au point du coping
  const T2 = r.hand ? r.hand.T || 0 : 0, wob = Math.round(Math.sin(T2 * 5.5) * 1.2);
  const feet = side ? [[hx - 0.5, Fy], [hx + 0.5, Fy - 1]] : [[hx - 1.5, Fy], [hx + 1.5, Fy]];
  const hands = side ? [[hx + 1, hy], [hx, hy]] : [[hx - 3, hy], [hx + 3, hy]];
  const col = BOARD_COLORS[(r.color | 0) % BOARD_COLORS.length];
  const o = { feet: feet.map(mir), skirt, bend: 0, lean: (flipX ? -1 : 1) * wob, hands: hands.map(mir), armMax: 14, depth: 1.5 };
  if (side) o.pedals = o.feet;
  o.under = (fs2, sv) => {
    for (const f of fs2) {
      const x0 = Math.round(f[0] - 1), y = Math.round(f[1]);
      if (sv) {
        P1(ctx, x0 - 1, y, 6, 1, ROLLER.plate); P1(ctx, x0 + 1, y, 2, 1, ROLLER.block);
        P1(ctx, x0 - 1, y + 1, 1, 1, ROLLER.wheelLo); P1(ctx, x0, y + 1, 1, 1, ROLLER.wheel); P1(ctx, x0 + 1, y + 1, 2, 1, ROLLER.anti);
        P1(ctx, x0 + 3, y + 1, 1, 1, ROLLER.wheel); P1(ctx, x0 + 4, y + 1, 1, 1, ROLLER.wheelLo);
      } else {
        P1(ctx, x0, y, 3, 1, ROLLER.plate); P1(ctx, x0 + 1, y, 1, 1, ROLLER.block);
        P1(ctx, x0, y + 1, 1, 1, ROLLER.anti); P1(ctx, x0 + 1, y + 1, 1, 1, ROLLER.wheel); P1(ctx, x0 + 2, y + 1, 1, 1, ROLLER.anti);
      }
    }
  };
  o.boot = (fx, fy, n, sv) => {
    const x0 = Math.round(fx - 1), yb = Math.round(fy), Hh = Math.min(5, n);
    const rw = (k, x, w, c) => { if (k <= Hh) P1(ctx, x, yb - k, w, 1, c); };
    if (sv) { rw(1, x0 - 1, 5, col.deck); rw(2, x0 - 1, 5, col.deck); rw(2, x0 - 1, 2, col.deckHi); rw(3, x0 - 1, 4, col.deck); rw(4, x0, 3, ROLLER.cuff); rw(5, x0, 3, ROLLER.cuff); rw(5, x0 + 2, 1, ROLLER.buckle); }
    else { rw(1, x0, 3, col.deck); rw(2, x0, 3, col.deck); rw(3, x0, 3, col.deck); rw(3, x0, 1, col.deckHi); rw(4, x0, 3, ROLLER.cuff); rw(5, x0, 3, ROLLER.cuff); rw(5, x0 + 1, 1, ROLLER.buckle); }
  };
  ctx.save();
  ctx.translate(0, 2 * hy + 1); ctx.scale(1, -1);   // le retournement : la rangée du coping (hy) reste en hy
  if (flipX) { ctx.translate(px + 16, 0); ctx.scale(-1, 1); drawRiderBody(ctx, sheet, row, 0, 0, shiftFeet(o, -px)); }
  else drawRiderBody(ctx, sheet, row, px, 0, o);
  ctx.restore();
}
/* Sous le miroir (profil gauche), le corps est dessiné à x = 0 dans un repère retourné autour de px + 8 : ses pieds y sont à
   x − px (les points ont déjà été mirroités par `mir`). */
function shiftFeet(o, dx) {
  const q = { ...o, feet: o.feet.map((f) => [f[0] + dx, f[1]]) };
  if (o.hands) q.hands = o.hands.map((h) => [h[0] + dx, h[1]]);
  if (o.push) q.push = { ...o.push, x: o.push.x + dx };
  if (o.pedals) q.pedals = o.pedals.map((f) => [f[0] + dx, f[1]]);
  return q;
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 2026-10-11 — LA CABANE DE LOCATION DU PARK : un conteneur maritime reconverti (64 × 68, ancré au milieu de sa rangée du bas,
   ║ `SHED` : 4 × 2 cases d'emprise).
   ╚════════════════════════════════════════════════════════════════════════════
   ⚠️ PROVISOIRE ET DIT COMME TEL, comme le chalet des patins : une infrastructure neuve appelle un prompt Gemini
   (`docs/IMAGES-ET-BLENDER.md`) ; ce dessin rend la location jouable le jour même. Mais il est aussi la PIÈCE que l'équipe du chantier
   déposera à la grue : un conteneur, ça se dessine en boîtes — et c'est ce qui le rend déplaçable.
   Ce qui le fait lire « boutique de skate » sans une lettre (§4 : un texte peint ne se traduit pas) : la tôle ONDULÉE sarcelle et ses
   pièces d'angle (c'est un conteneur), le panneau découpé RELEVÉ en auvent sur deux tirants, l'intérieur éclairé où pendent des
   planches de toutes les couleurs, un BMX accroché, des casques, des rollers ; un emblème (une planche dans un rond crème) ; un
   râtelier de trois planches debout à côté. Des masses cernées, éclairées du nord-ouest ; la rouille coule en filets à des places
   DÉDUITES du pas des ondes, jamais tirées. */
const SHED_CACHE = { cv: null, closed: null };
/* `closed` : le conteneur qu'on livre (le panneau rabattu, rien en vitrine) — celui qui pend au crochet de la grue. */
export function parkShedSprite(mk, closed) {
  if (closed) {
    if (SHED_CACHE.closed) return SHED_CACHE.closed;
    const open = parkShedSprite(mk), c2 = mk(open.width, open.height), g2 = c2.getContext("2d");
    g2.drawImage(open, 0, 0);
    const TL = ["#173b3d", "#21504f", "#2d6765", "#3d827d", "#55a198"];
    g2.fillStyle = TL[2]; g2.fillRect(5, 32 + 1, 54, 26);
    for (let x = 6; x < 58; x += 3) { g2.fillStyle = TL[3]; g2.fillRect(x, 33, 1, 26); g2.fillStyle = TL[1]; g2.fillRect(x + 1, 33, 1, 26); }
    g2.fillStyle = "#0f1a1c"; g2.fillRect(7, 35, 50, 1); g2.fillRect(7, 57, 50, 1); g2.fillRect(7, 35, 1, 23); g2.fillRect(56, 35, 1, 23);   // le panneau rabattu, son joint
    g2.fillStyle = "#8a909a"; g2.fillRect(30, 45, 4, 2);   // la serrure
    SHED_CACHE.closed = c2;
    return c2;
  }
  if (SHED_CACHE.cv) return SHED_CACHE.cv;
  const W = 64, H = 68, c = mk(W, H), g = c.getContext("2d");
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const TL = ["#173b3d", "#21504f", "#2d6765", "#3d827d", "#55a198", "#7cc2b7"];   // la tôle, de l'ombre au reflet
  const INK = "#0f1a1c", RUST = ["#6e3a1c", "#9a5426"], CREAM = "#f1e6cc", WOOD = ["#5e3e22", "#8a5e36", "#b5824e", "#d9aa70"];
  const TOP = 6, ROOF_D = 26;              // le toit vu de 3/4 : 26 px de profondeur
  const FY = TOP + ROOF_D, FH = 32;        // la face avant : y 32..63
  // ── LE TOIT : tôle plus claire, ses ondes en travers (de face, elles courent nord-sud), son rebord avant éclairé
  P(1, TOP, 62, ROOF_D, TL[3]);
  for (let x = 2; x < 62; x += 4) { P(x, TOP + 1, 1, ROOF_D - 2, TL[4]); P(x + 2, TOP + 1, 1, ROOF_D - 2, TL[2]); }
  P(1, TOP, 62, 1, TL[5]); P(1, FY - 2, 62, 2, TL[4]);
  // l'emblème posé sur le toit : un panneau incliné, une planche dans un rond crème
  P(22, TOP - 5, 20, 12, INK); P(23, TOP - 4, 18, 10, CREAM); P(23, TOP + 5, 18, 1, "#cbbd9c");
  P(26, TOP, 12, 3, "#c4512f"); P(25, TOP + 1, 1, 1, "#c4512f"); P(38, TOP + 1, 1, 1, "#c4512f");   // la planche (le plateau)
  P(26, TOP, 12, 1, "#e07a52"); P(27, TOP + 3, 2, 1, INK); P(35, TOP + 3, 2, 1, INK);                 // ses roues
  P(30, TOP - 6, 1, 2, "#8a909a"); P(33, TOP - 6, 1, 2, "#8a909a");
  // ── LA FACE AVANT : les ondes verticales (pas de 3), l'ombre en bas, les pièces d'angle
  P(1, FY, 62, FH, TL[2]);
  for (let x = 2; x < 62; x += 3) { P(x, FY, 1, FH, TL[3]); P(x + 1, FY, 1, FH, TL[1]); }
  P(1, FY + FH - 3, 62, 3, TL[1]); P(1, FY + FH - 1, 62, 1, TL[0]);
  for (const [x, y] of [[1, FY], [58, FY], [1, FY + FH - 5], [58, FY + FH - 5]]) { P(x, y, 5, 5, TL[0]); P(x + 1, y + 1, 3, 1, TL[2]); P(x + 2, y + 2, 1, 2, INK); }
  // la rouille : un filet sous certaines ondes, à des places déduites du pas
  for (let x = 6; x < 58; x += 9) { const len = 3 + ((x * 7) % 5); P(x, FY + 2, 1, len, RUST[1]); P(x, FY + 2 + len, 1, 1, RUST[0]); }
  // ── L'OUVERTURE DU COMPTOIR (x 8..56, y 39..56) : l'intérieur éclairé en paliers, le mur du fond
  const OX0 = 8, OX1 = 56, OY0 = FY + 7, OY1 = FY + 25;
  P(OX0 - 1, OY0 - 1, OX1 - OX0 + 2, OY1 - OY0 + 2, INK);
  P(OX0, OY0, OX1 - OX0, OY1 - OY0, "#b9773a"); P(OX0, OY0 + 6, OX1 - OX0, OY1 - OY0 - 6, "#d99a44"); P(OX0, OY0 + 11, OX1 - OX0, OY1 - OY0 - 11, "#efbd66");
  P(OX0, OY0, OX1 - OX0, 2, "#6a3e1c");    // l'ombre sous l'auvent
  // les planches pendues au mur du fond : des plateaux verticaux de toutes les couleurs, leurs roues
  const decks = [["#c4512f", "#8a321c"], ["#3f7fc9", "#244f86"], ["#e3b23a", "#a17818"], ["#3aa067", "#22663f"], ["#d96aa0", "#99406c"]];
  decks.forEach(([d0, d1], i) => {
    const x = OX0 + 3 + i * 5, y = OY0 + 3;
    P(x, y + 1, 3, 9, d0); P(x + 1, y, 1, 11, d0); P(x + 2, y + 1, 1, 9, d1); P(x, y + 1, 1, 9, "#ffffff22");
    P(x, y + 2, 1, 1, "#efe6cf"); P(x + 2, y + 2, 1, 1, "#efe6cf"); P(x, y + 8, 1, 1, "#efe6cf"); P(x + 2, y + 8, 1, 1, "#efe6cf");
  });
  // le BMX accroché par sa roue avant (deux roues, le cadre)
  const bx = OX1 - 17, by = OY0 + 3;
  for (const [cx, cy] of [[bx + 3, by + 3], [bx + 11, by + 6]]) { P(cx - 3, cy - 1, 1, 3, INK); P(cx + 3, cy - 1, 1, 3, INK); P(cx - 1, cy - 3, 3, 1, INK); P(cx - 1, cy + 3, 3, 1, INK); P(cx - 2, cy - 2, 1, 1, INK); P(cx + 2, cy - 2, 1, 1, INK); P(cx - 2, cy + 2, 1, 1, INK); P(cx + 2, cy + 2, 1, 1, INK); P(cx, cy, 1, 1, "#d8dde4"); }
  for (let k = 0; k <= 8; k++) P(bx + 3 + k, by + 3 + Math.round(k * 3 / 8), 1, 1, "#c4512f");
  P(bx + 6, by + 1, 1, 4, "#c4512f"); P(bx + 5, by, 3, 1, "#26262b");
  // l'étagère des casques (trois dômes), une paire de rollers pendue
  P(OX0 + 2, OY1 - 6, 26, 1, WOOD[0]);
  [["#2c2c32", "#55555e"], ["#e3b23a", "#f6d27a"], ["#3f7fc9", "#7fa8f0"]].forEach(([h0, h1], i) => { const x = OX0 + 4 + i * 8; P(x, OY1 - 9, 5, 3, h0); P(x + 1, OY1 - 10, 3, 1, h0); P(x + 1, OY1 - 9, 2, 1, h1); });
  P(OX1 - 6, OY1 - 9, 2, 4, "#f4f1ea"); P(OX1 - 4, OY1 - 8, 2, 4, "#e2ded4"); P(OX1 - 6, OY1 - 5, 4, 1, "#2a2c33");
  // le comptoir : une planche épaisse qui déborde, éclairée dessus, son chant à l'ombre ; une caisse et un autocollant
  P(OX0 - 3, OY1 - 1, OX1 - OX0 + 6, 3, WOOD[2]); P(OX0 - 3, OY1 - 1, OX1 - OX0 + 6, 1, WOOD[3]); P(OX0 - 3, OY1 + 2, OX1 - OX0 + 6, 1, WOOD[0]);
  P(OX0 + 31, OY1 - 4, 6, 3, "#3a3c42"); P(OX0 + 31, OY1 - 4, 6, 1, "#6e747e"); P(OX0 + 33, OY1 - 5, 2, 1, "#e3c26a");
  // ── L'AUVENT : le panneau découpé, relevé vers le sud sur deux tirants — vu de devant, une bande de tôle au-dessus de l'ouverture,
  // son dessous à l'ombre, ses tirants en diagonale
  P(OX0 - 3, OY0 - 7, OX1 - OX0 + 6, 6, TL[2]);
  for (let x = OX0 - 3; x < OX1 + 3; x += 3) P(x, OY0 - 7, 1, 6, TL[4]);
  P(OX0 - 3, OY0 - 7, OX1 - OX0 + 6, 1, TL[5]); P(OX0 - 3, OY0 - 2, OX1 - OX0 + 6, 1, TL[0]);
  for (const sx of [OX0 + 1, OX1 - 2]) for (let k = 0; k < 6; k++) P(sx + (sx < 32 ? k : -k) * 0, OY0 - 1 + k, 1, 1, "#8a909a");
  // ── LE SOCLE : deux madriers sous le conteneur (il est posé, pas fondé : on le remportera)
  P(4, FY + FH, 10, 2, WOOD[1]); P(50, FY + FH, 10, 2, WOOD[1]); P(4, FY + FH + 1, 10, 1, WOOD[0]); P(50, FY + FH + 1, 10, 1, WOOD[0]);
  // ── LE CERNE de la masse (DESSIN.md : contre l'herbe comme contre le pavé)
  P(0, TOP, 1, FY + FH - TOP, INK); P(63, TOP, 1, FY + FH - TOP, INK); P(1, TOP - 1, 62, 1, INK); P(1, FY + FH, 3, 1, INK); P(14, FY + FH, 36, 1, INK); P(60, FY + FH, 3, 1, INK);
  SHED_CACHE.cv = c;
  return c;
}

/* L'APERÇU DU PANNEAU DE LOCATION : la monture choisie, de profil, dessinée par LES MÊMES fonctions que le jeu (sur un canevas de
   48 × 24, le cap à l'est). Les rollers : une bottine de profil sur sa platine, ses quatre roues. */
/* `o` (facultatif) : { fx, fy, th, flip, bar, whip, crank } — le même aperçu sous un autre cap, à une autre place (la planche des
   véhicules de `app/audit-riders`, 2026-10-14). */
export function drawRideKitPreview(g, kit, o) {
  const k = kit || { kind: "skate", color: 0 };
  const R = { fx: 1.5, fy: 1.05, th: 0, air: 0, surf: null, color: k.color | 0, ...(o || {}) };
  const F = frameOf(R);
  if (k.kind === "skate") drawBoard(g, R, F);
  else if (k.kind === "scooter") { drawScooterDeck(g, R, F); drawScooterBar(g, R, F); }
  else if (k.kind === "bmx") drawBmx(g, R, F, "all");
  else {
    /* 2026-10-14 — le roller agressif de profil, en grand (le même que sur le corps, `drawRollers`) : la coque dans la couleur louée,
       la manchette noire et sa boucle, la sangle, la platine et son H-block, les deux grandes roues claires et les deux petites
       sombres du milieu. Deux, l'un derrière l'autre. */
    const col = BOARD_COLORS[(k.color | 0) % BOARD_COLORS.length], Rr = ROLLER;
    for (const ox of [12, 25]) {
      P1(g, ox + 1, 3, 6, 5, Rr.cuff); P1(g, ox + 1, 3, 6, 1, "#3a3a42"); P1(g, ox + 5, 4, 2, 2, Rr.buckle);          // la manchette, sa boucle
      P1(g, ox, 8, 8, 4, col.deck); P1(g, ox, 8, 2, 4, col.deckHi);                                                  // la cheville, éclairée au talon
      P1(g, ox, 12, 12, 3, col.deck); P1(g, ox, 12, 2, 3, col.deckHi); P1(g, ox + 10, 13, 2, 2, col.deckLo);         // le pied, sa pointe
      P1(g, ox + 7, 9, 3, 1, Rr.buckle); P1(g, ox + 8, 11, 3, 1, Rr.buckle);                                         // les sangles
      P1(g, ox - 1, 15, 14, 2, Rr.plate); P1(g, ox + 4, 15, 4, 2, Rr.block);                                         // la platine, le H-block
      for (const wx of [ox - 1, ox + 9]) { P1(g, wx, 17, 4, 4, Rr.wheel); P1(g, wx + 3, 17, 1, 4, Rr.wheelLo); P1(g, wx + 1, 18, 2, 2, Rr.wheelLo); }
      P1(g, ox + 3, 17, 3, 3, Rr.anti); P1(g, ox + 6, 17, 3, 3, Rr.anti); P1(g, ox + 4, 18, 1, 1, "#6e747e"); P1(g, ox + 7, 18, 1, 1, "#6e747e");
    }
  }
}
