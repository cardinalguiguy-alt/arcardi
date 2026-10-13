/* =============================================================================
   montureArt.js — LES MONTURES DU SKATEPARK, DESSINÉES (2026-10-11).
   -----------------------------------------------------------------------------
   La planche, la trottinette, le BMX — et le corps de qui les monte. Les rollers n'ont pas de véhicule : c'est le corps du
   patineur (`drawSkate`, fermeArt.js) avec des roues sous les bottines (`view.foot = "wheels"`) — la même foulée, la même lignée.
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
import * as C from "./fermeConstants.mjs";
import * as SP from "./skatepark.mjs";
import { drawSkate, drawReachArm, POSE_SLICES as PS } from "./fermeArt.mjs";

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
  for (let sy = Math.floor(O[1] - eyt); sy <= Math.ceil(O[1] + eyt); sy++) for (let sx = Math.floor(O[0] - ext); sx <= Math.ceil(O[0] + ext); sx++) {
    const dx = sx + 0.5 - O[0], dy = sy + 0.5 - O[1];
    const a = (dx * by - dy * bx) / det, b = (ax * dy - ay * dx) / det;
    const col = shape(a, b, sx, sy);
    if (col) P1(ctx, sx, sy, 1, 1, col);
  }
}
function line3(ctx, pr, a0, b0, h0, a1, b1, h1, col) {
  const A = pr(a0, b0, h0), B = pr(a1, b1, h1);
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(B[0] - A[0]), Math.abs(B[1] - A[1]))));
  for (let k = 0; k <= n; k++) { const t = k / n; P1(ctx, Math.floor(A[0] + (B[0] - A[0]) * t), Math.floor(A[1] + (B[1] - A[1]) * t), 1, 1, col); }
}

/* ── LA PLANCHE (80 × 20 cm, le grip noir, les quatre roues qui dépassent aux coins, la tranche du plateau en couleur) ── */
export const BOARD_COLORS = [
  { deck: "#c4512f", deckLo: "#8a321c" }, { deck: "#3f7fc9", deckLo: "#244f86" }, { deck: "#e3b23a", deckLo: "#a17818" },
  { deck: "#3aa067", deckLo: "#22663f" }, { deck: "#2c2c32", deckLo: "#151518" }, { deck: "#d96aa0", deckLo: "#99406c" },
];
const BL = 0.7, BW = 0.2;
function drawBoard(ctx, r, F) {
  const col = BOARD_COLORS[(r.color | 0) % BOARD_COLORS.length];
  const flip = r.flip || 0;   // le kickflip : la planche tourne sur son grand axe
  const cf = Math.cos(flip), sf = Math.sin(flip);
  const G = { f: F.f, l: [F.l[0] * cf + F.n[0] * sf, F.l[1] * cf + F.n[1] * sf, F.l[2] * cf + F.n[2] * sf], n: [F.n[0] * cf - F.l[0] * sf, F.n[1] * cf - F.l[1] * sf, F.n[2] * cf - F.l[2] * sf] };
  const top = G.n[1] * 0.707 + G.n[2] * 0.707 > 0;   // voit-on le grip (le dessus) ou le dessous peint ?
  const pr = projector(r, G);
  // les roues d'abord (sous le plateau) : quatre pavés crème, ombrés côté sol
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
    const W = pr(sa * 0.27, sb * 0.115, 0.035);
    P1(ctx, Math.floor(W[0]), Math.floor(W[1]), 1, 1, "#efe6cf");
    P1(ctx, Math.floor(W[0]), Math.floor(W[1]) + 1, 1, 1, "#a99f86");
  }
  const half = [BL / 2 + 0.05, BW / 2 + 0.05];
  paintPlate(ctx, r, G, 0.075, half, (a, b) => {
    const a0 = Math.max(0, Math.abs(a) - (BL / 2 - BW / 2)), d = Math.hypot(a0, b);
    if (d > BW / 2) return null;
    if (!top) return d > BW / 2 - 0.05 ? col.deckLo : (Math.abs(a) < 0.1 ? "#f1ead8" : col.deck);   // le dessous : la peinture, un logo clair
    if (d > BW / 2 - 0.04) return b > 0 ? col.deckLo : "#4a4a53";   // la tranche : sombre côté ombre, une arête claire côté lumière
    return Math.abs(a) > BL / 2 - BW / 2 + 0.02 ? "#34343a" : "#26262b";   // le grip, les tails un peu plus clairs (usés)
  }, 1);
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
function drawScooterBar(ctx, r, F) {
  const pr = projector(r, F), col = BOARD_COLORS[(r.color | 0) % BOARD_COLORS.length].deck;
  line3(ctx, pr, 0.25, 0, 0.08, 0.3, 0, 0.78, "#c9ced6");
  line3(ctx, pr, 0.255, 0.01, 0.08, 0.305, 0.01, 0.78, "#6e747e");
  const pb = spun(pr, 0.3, r.bar || 0);   // le barspin : le guidon tourne sur le tube
  line3(ctx, pb, 0.3, -0.2, 0.78, 0.3, 0.2, 0.78, "#d6dbe2");
  for (const sb of [-1, 1]) line3(ctx, pb, 0.3, sb * 0.2, 0.78, 0.3, sb * 0.14, 0.78, col);   // les poignées
}

/* ── LE BMX : deux roues de 20 pouces (vues comme des ellipses : elles sont dans le plan vertical du cap), le cadre, le guidon ── */
function drawBmxWheel(ctx, pr, a, R) {
  const n = 40;
  for (let k = 0; k < n; k++) {
    const ph = (k / n) * Math.PI * 2;
    const P = pr(a + R * Math.cos(ph), 0, R + R * Math.sin(ph));
    P1(ctx, Math.floor(P[0]), Math.floor(P[1]), 1, 1, "#1d1e22");
  }
  const H = pr(a, 0, R);
  P1(ctx, Math.floor(H[0]), Math.floor(H[1]), 1, 1, "#d8dde4");
  for (const ph of [0.4, 1.97, 3.54, 5.11]) { const P = pr(a + R * 0.55 * Math.cos(ph), 0, R + R * 0.55 * Math.sin(ph)); P1(ctx, Math.floor(P[0]), Math.floor(P[1]), 1, 1, "#9aa0a8"); }
}
function drawBmx(ctx, r, F, part) {
  const pr0 = projector(r, F), col = BOARD_COLORS[(r.color | 0) % BOARD_COLORS.length];
  const R = 0.21, aR = -0.42, aF = 0.42;
  const pr = spun(pr0, 0.3, r.whip || 0);      // le tailwhip : le cadre et la roue arrière tournent autour de la douille
  const pb = spun(pr0, 0.27, r.bar || 0);      // le barspin : le guidon (et la fourche, solidaire) tourne sur la potence
  if (part !== "front") {
    drawBmxWheel(ctx, pr, aR, R);
    // le cadre : la base, le hauban, le tube de selle, le tube supérieur, le tube diagonal, la fourche
    const BB = [-0.04, 0.17], SEAT = [-0.18, 0.5], HEAD = [0.3, 0.52];
    line3(ctx, pr, aR, 0, R, BB[0], 0, BB[1], col.deckLo);
    line3(ctx, pr, aR, 0, R, SEAT[0], 0, SEAT[1] - 0.04, col.deckLo);
    line3(ctx, pr, BB[0], 0, BB[1], SEAT[0], 0, SEAT[1], col.deck);
    line3(ctx, pr, SEAT[0], 0, SEAT[1] - 0.04, HEAD[0], 0, HEAD[1], col.deck);
    line3(ctx, pr, BB[0], 0, BB[1], HEAD[0], 0, HEAD[1] - 0.06, col.deck);
    line3(ctx, pr, SEAT[0] - 0.08, 0, SEAT[1] + 0.03, SEAT[0] + 0.06, 0, SEAT[1] + 0.03, "#26262b");   // la selle
  }
  if (part !== "back") {
    drawBmxWheel(ctx, pr0, aF, R);
    line3(ctx, pr0, 0.3, 0, 0.52, aF, 0, R, "#c9ced6");                 // la fourche
    line3(ctx, pr0, 0.3, 0, 0.52, 0.27, 0, 0.72, "#c9ced6");            // la potence
    line3(ctx, pb, 0.27, -0.24, 0.72, 0.27, 0.24, 0.72, "#d6dbe2");     // le guidon
    for (const sb of [-1, 1]) line3(ctx, pb, 0.27, sb * 0.24, 0.72, 0.27, sb * 0.17, 0.72, "#26262b");
  }
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ LE CORPS DU RIDER — taillé dans la feuille du personnage (la tête, le buste, les manches, les deux moitiés de jambe), comme
   ║ les poses du patineur (`drawSkateBody`, fermeArt.js), avec les mêmes mesures (`POSE_SLICES`, lues, jamais recopiées).
   ╚════════════════════════════════════════════════════════════════════════════
   Ce qui fait un skateur et pas un piéton posé sur une planche :
     · les PIEDS sont là où la planche les porte (`feet` : deux points de l'écran, écartés le long de la planche) — une garde
       large de face, un pied derrière l'autre de profil ;
     · les GENOUX fléchis (`bend`) : le haut du corps descend, les jambes restent plantées (leur haut passe sous le buste) ;
     · le BUSTE penche dans le virage (`lean`, la tête plus que le buste) ;
     · les BRAS s'écartent pour l'équilibre (de face et de dos : le buste est taillé sans ses manches, qu'on repose plus loin) ;
     · la POUSSÉE : un pied quitte la planche et va chercher le sol derrière (`push` : sa position, déjà calculée par l'appelant). */
function drawRiderBody(ctx, sheet, row, px, top, o) {
  const sy = row * 24, side = row === 2;
  const LY = o.skirt ? 21 : PS.LEG_Y, LH = 24 - LY;
  const bend = o.bend || 0, lean = o.lean || 0;
  const halfLeg = (right, x, y, cut) => { const h = LH - (cut || 0); if (h > 0) ctx.drawImage(sheet, right ? 8 : 0, sy + LY, 8, h, Math.round(x), Math.round(y) + (cut || 0), 8, h); };
  // les jambes : chaque moitié posée pour que son pied tombe sur son point (le pied de la moitié gauche est en x 5..7, celui de la
  // droite en 8..10 de la case, donc 0..2 de sa moitié)
  /* ⚠️ LES PIEDS SUIVENT LA PLANCHE, PAS AU PIXEL PRÈS : une jambe ne s'allonge pas. De face (et de dos), l'écart le long de la
     planche s'ouvre en largeur (3 px au naturel, 8 au plus) et l'écart en hauteur est borné à un pixel — sans quoi une planche
     en diagonale faisait une jambe de 4 px plus longue que l'autre. De PROFIL, les deux moitiés de jambe gardent leur place
     naturelle (l'une devant l'autre), un pixel d'écart : la planche file sous elles vers le haut et le bas de l'écran — premier
     jet, chaque moitié posée sur son pied : deux jambes empilées sur six pixels, une échasse. */
  const mx = (o.feet[0][0] + o.feet[1][0]) / 2, my = (o.feet[0][1] + o.feet[1][1]) / 2;
  const sp = side ? 3 : Math.max(3, Math.min(8, Math.abs(o.feet[1][0] - o.feet[0][0])));
  const dyF = Math.max(-1, Math.min(1, Math.round((o.feet[1][1] - o.feet[0][1]) / 2)));
  const fL = [mx - sp / 2 - 1.5 + 1.5, my - dyF * 0.5], fR = [mx + sp / 2, my + dyF * 0.5];
  fL[0] = Math.round(mx - sp / 2); fR[0] = Math.round(mx + sp / 2);
  if (o.push) {
    // la jambe qui pousse d'abord (elle est derrière le corps), puis celle qui porte
    const pf = o.push;
    if (pf.side) halfLeg(true, pf.x - 1, pf.y - LH + 1); else halfLeg(false, pf.x - 6, pf.y - LH + 1);
    if (pf.side) halfLeg(false, fL[0] - 6, fL[1] - LH); else halfLeg(true, fR[0] - 1, fR[1] - LH);
  } else {
    halfLeg(false, fL[0] - 6, fL[1] - LH);
    halfLeg(true, fR[0] - 1, fR[1] - LH);
  }
  // le haut du corps : centré entre les pieds, descendu de `bend`, penché de `lean`
  const cx = Math.round((fL[0] + fR[0]) / 2 - 8 + 0.5);
  const footY = Math.max(fL[1], fR[1]);
  const t0 = Math.round(footY - 24 + bend);
  const hx = Math.round(lean), tx = Math.round(lean * 0.5);
  if (o.hands && o.hands.length) {
    /* LES MAINS SUR LE GUIDON (BMX, trottinette) : le bras de la feuille tendu de l'épaule à la poignée (`drawReachArm`, la manche
       étirée rangée par rangée — celui des figures à deux du patin). Le buste est taillé SANS ses manches (de face : le cœur x 5..10 ;
       de profil : sans les colonnes 7..8 du bras), sinon le personnage en aurait trois. */
    const TY = PS.TORSO_Y, AY = PS.ARM_Y, AH = PS.ARM_H;
    if (side) {
      ctx.drawImage(sheet, 0, sy + TY, 16, AY - TY, cx + tx, t0 + TY, 16, AY - TY);
      ctx.drawImage(sheet, 0, sy + AY, 7, AH, cx + tx, t0 + AY, 7, AH);
      ctx.drawImage(sheet, 9, sy + AY, 7, AH, cx + tx + 9, t0 + AY, 7, AH);
      if (LY > AY + AH) ctx.drawImage(sheet, 0, sy + AY + AH, 16, LY - AY - AH, cx + tx, t0 + AY + AH, 16, LY - AY - AH);
    } else ctx.drawImage(sheet, 5, sy + TY, 6, LY - TY, cx + 5 + tx, t0 + TY, 6, LY - TY);
    ctx.drawImage(sheet, 0, sy, 16, PS.HEAD_H, cx + hx, t0, 16, PS.HEAD_H);
    const R = { top: t0 + TY, dx: tx };
    if (side) drawReachArm(ctx, sheet, sy, cx, true, 1, R, { x: o.hands[0][0], y: o.hands[0][1] });
    else for (const hd of o.hands) drawReachArm(ctx, sheet, sy, cx, false, hd[0] >= cx + 8 ? 1 : 0, R, { x: hd[0], y: hd[1] });
    return;
  }
  if (side || !o.arms || o.arms === "down") {
    ctx.drawImage(sheet, 0, sy + PS.TORSO_Y, 16, LY - PS.TORSO_Y, cx + tx, t0 + PS.TORSO_Y, 16, LY - PS.TORSO_Y);
    ctx.drawImage(sheet, 0, sy, 16, PS.HEAD_H, cx + hx, t0, 16, PS.HEAD_H);
    return;
  }
  // de face, de dos : le buste sans ses manches, puis les manches reposées écartées (l'équilibre) ou levées
  ctx.drawImage(sheet, 5, sy + PS.TORSO_Y, 6, LY - PS.TORSO_Y, cx + 5 + tx, t0 + PS.TORSO_Y, 6, LY - PS.TORSO_Y);
  const armY = t0 + PS.ARM_Y + (o.arms === "up" ? -3 : -1);
  const spread = o.arms === "wide" ? 3 : 1;
  const armL = (x, y) => ctx.drawImage(sheet, PS.ARM_LX, sy + PS.ARM_Y, PS.ARM_W, PS.ARM_H, x, y, PS.ARM_W, PS.ARM_H);
  const armR = (x, y) => ctx.drawImage(sheet, PS.ARM_RX, sy + PS.ARM_Y, PS.ARM_W, PS.ARM_H, x, y, PS.ARM_W, PS.ARM_H);
  const tilt = o.armTilt || 0;   // un bras plus haut que l'autre : on se rattrape du côté où l'on penche
  armL(cx + tx + PS.ARM_LX - spread, armY - (tilt > 0 ? 1 : 0));
  armR(cx + tx + PS.ARM_RX + spread, armY - (tilt < 0 ? 1 : 0));
  ctx.drawImage(sheet, 0, sy, 16, PS.HEAD_H, cx + hx, t0, 16, PS.HEAD_H);
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ LE RIDER — `p.ride` : { kind, th, air (cases au-dessus du relief), mode ("ground" | "air" | "bail"), pose, ph (la phase de
   ║ poussée ou de foulée), color, flip, bend, lean }. `sheet` / `skirt` : la feuille du personnage. (px, py) : le coin du sprite.
   ╚════════════════════════════════════════════════════════════════════════════ */
export function drawRide(ctx, sheet, px, py, p, skirt) {
  const r = p.ride;
  const fx = C.footX(p.x), fy = C.footY(p.y);
  const surf = r.mode === "air" ? null : SP.parkSurf(fx, fy, {});
  const R = { fx, fy, th: r.th, air: r.air || 0, surf, color: r.color, flip: r.flip, bar: r.bar || 0, whip: r.whip || 0 };
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
  if (r.kind === "roller") {
    // les rollers : le corps du patineur, roues sous les bottines (la foulée, le saut, le frein)
    const by = py - airPx;
    const view = { foot: "wheels" };
    if (flipX) { ctx.save(); ctx.translate(px + 16, 0); ctx.scale(-1, 1); drawSkate(ctx, sheet, row, 0, by, pose, r.ph || 0, skirt, view); ctx.restore(); }
    else drawSkate(ctx, sheet, row, px, by, pose, r.ph || 0, skirt, view);
    return;
  }
  /* Les pieds sur le véhicule : deux points du plateau (le long de son axe), projetés. Le corps en miroir (profil gauche) les
     reçoit dans SON repère : x ↦ 2·px + 16 − x. */
  const pr = projector(R, F);
  const deckH = r.kind === "skate" ? 0.11 : r.kind === "scooter" ? 0.1 : 0.2;
  const along = r.kind === "skate" ? 0.2 : r.kind === "scooter" ? 0.08 : 0.07;
  const lat = r.kind === "bmx" ? 0.11 : 0;
  let fA = pr(-along, -lat, deckH), fB = pr(along, lat, deckH);
  if (r.kind === "bmx") { fA = pr(-0.04, -0.11, deckH); fB = pr(-0.04, 0.11, deckH); }
  const mir = (q) => (flipX ? [2 * px + 16 - q[0], q[1]] : q);
  let a = mir(fA), b = mir(fB);
  if (a[0] > b[0]) { const t = a; a = b; b = t; }
  const feet = [[a[0], a[1]], [b[0], b[1]]];   // ⚠️ la projection porte DÉJÀ la hauteur en l'air (`R.air`) : la retrancher encore levait le corps deux fois
  const o = { feet, skirt, bend: r.bend || 0, lean: (flipX ? -1 : 1) * (r.lean || 0), arms: r.kind === "skate" ? "out" : "down", armTilt: r.lean || 0 };
  if ((r.kind === "bmx" || r.kind === "scooter") && !r.grab) {
    // les poignées, projetées (le barspin les fait tourner : à mi-tour, on lâche le guidon — les mains restent en l'air)
    const bA = r.kind === "bmx" ? 0.27 : 0.3, bH = r.kind === "bmx" ? 0.72 : 0.78, bB = r.kind === "bmx" ? 0.21 : 0.18;
    const spinning = r.bar && Math.abs(Math.sin(r.bar / 2)) > 0.35;
    if (!spinning && row !== 1) {   // de dos, le guidon est caché par le corps : les bras restent le long (tendus, ils se levaient vers lui)
      const gs = [pr(bA, -bB, bH), pr(bA, bB, bH)].map(mir);
      const sideView = row === 2;
      o.hands = sideView ? [gs.reduce((p, q) => (q[1] > p[1] ? q : p))] : gs;
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
  if (pose === "hop") { o.bend = Math.max(o.bend, 3); o.arms = "wide"; feet[0][1] -= 2; feet[1][1] -= 2; }
  if (r.grab) { o.bend += Math.round(2 * r.grab); o.arms = "down"; }   // la main va chercher la planche
  if (pose === "grind") { o.arms = r.kind === "skate" ? "wide" : o.arms; }
  if (pose === "brake") { o.lean = (flipX ? 1 : -1) * 2; o.bend = Math.max(o.bend, 2); }
  const body = () => {
    if (flipX) { ctx.save(); ctx.translate(px + 16, 0); ctx.scale(-1, 1); drawRiderBody(ctx, sheet, row, 0, 0, shiftFeet(o, -px)); ctx.restore(); }
    else drawRiderBody(ctx, sheet, row, px, 0, o);
  };
  if (r.kind === "skate") {
    // le pop shove-it : le plateau tourne sur lui-même SOUS les pieds (le corps garde son cap)
    if (r.yaw) { const Ry = { ...R, th: r.th + r.yaw }; drawBoard(ctx, Ry, frameOf(Ry)); } else drawBoard(ctx, R, F);
    body(); return;
  }
  if (r.kind === "scooter") {
    drawScooterDeck(ctx, R, F);
    if (!frontIsNear) drawScooterBar(ctx, R, F);
    body();
    if (frontIsNear) drawScooterBar(ctx, R, F);
    return;
  }
  if (r.kind === "bmx") {
    drawBmx(ctx, R, F, frontIsNear ? "back" : "all");
    body();
    if (frontIsNear) drawBmx(ctx, R, F, "front");
  }
}
/* Sous le miroir (profil gauche), le corps est dessiné à x = 0 dans un repère retourné autour de px + 8 : ses pieds y sont à
   x − px (les points ont déjà été mirroités par `mir`). */
function shiftFeet(o, dx) {
  const q = { ...o, feet: o.feet.map((f) => [f[0] + dx, f[1]]) };
  if (o.hands) q.hands = o.hands.map((h) => [h[0] + dx, h[1]]);
  if (o.push) q.push = { ...o.push, x: o.push.x + dx };
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
export function drawRideKitPreview(g, kit) {
  const k = kit || { kind: "skate", color: 0 };
  const R = { fx: 1.5, fy: 1.05, th: 0, air: 0, surf: null, color: k.color | 0 };
  const F = frameOf(R);
  if (k.kind === "skate") drawBoard(g, R, F);
  else if (k.kind === "scooter") { drawScooterDeck(g, R, F); drawScooterBar(g, R, F); }
  else if (k.kind === "bmx") drawBmx(g, R, F, "all");
  else {
    const col = BOARD_COLORS[(k.color | 0) % BOARD_COLORS.length];
    for (const ox of [14, 26]) {
      P1(g, ox, 6, 6, 8, "#f4f1ea"); P1(g, ox, 6, 1, 8, "#ffffff"); P1(g, ox + 5, 6, 1, 8, "#cfc9bd"); P1(g, ox, 9, 6, 1, col.deck);
      P1(g, ox, 14, 9, 2, "#e8e4da"); P1(g, ox + 8, 14, 1, 2, "#cfc9bd"); P1(g, ox - 1, 16, 11, 1, "#5c6470");
      for (let w = 0; w < 4; w++) { P1(g, ox - 1 + w * 3, 17, 2, 2, "#2a2c33"); P1(g, ox + w * 3, 17, 1, 1, "#e8d36a"); }
    }
  }
}
