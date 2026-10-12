/* =============================================================================
   chantierArt.js — LE CHANTIER, DESSINÉ (2026-10-11) : LES ENGINS, LA BARRIÈRE, LES GESTES DES OUVRIERS.
   -----------------------------------------------------------------------------
   Guillaume : « tout ça doit être soigné ; ces ouvriers serviront ailleurs dans VT, alors soigne-les bien ». Tout est en procédural
   (comme le taxi, la surfaceuse) parce que tout BOUGE : la flèche de la grue se déplie vers sa charge, le câble descend, les fourches
   du chariot montent, une feuille passe de deux paires de mains à un module. Une image Gemini ne plie pas son bras.
   ⚠️ LES COORDONNÉES : le monde en px (une case = `TILE`), un point à la hauteur h (cases) se peint à `y − h·T` (la vue en 3/4 du
   projet). Chaque engin est ancré au milieu de son bas de caisse côté sud (la ligne de contact au sol) ; `dir` 2 regarde l'ouest,
   3 l'est (le côté sud est celui qu'on voit). Le miroir d'un engin qui regarde l'ouest est fait ICI, par des coordonnées
   (`mx`), pas par `scale(−1)` : le faux canevas des bancs n'en veut pas.
   ⚠️ DES MASSES CERNÉES, ÉCLAIRÉES DU NORD-OUEST (DESSIN.md), AUCUN PIXEL TIRÉ AU HASARD : les étincelles d'une soudure se tirent
   d'un hachage de la phase.
   ========================================================================== */
import * as C from "./fermeConstants";
import { POSE_SLICES as PS, drawReachArm, drawRinkIceTile } from "./fermeArt";

const T = C.TILE;
const P1 = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
const INK = "#15181c";
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/* Un repère de dessin pour un engin ancré en (x, y) — px du monde, le milieu de son bas de caisse côté sud — qui regarde l'ouest
   (`west`) ou l'est : `R(dx, dy, w, h, col)` peint un rectangle en coordonnées « engin regardant l'EST » (dx vers l'avant). */
function rig(ctx, x, y, west) {
  return (dx, dy, w, h, col) => P1(ctx, west ? x - dx - w : x + dx, y + dy, w, h, col);
}
function wheel(ctx, cx, cy, r, tire, hub) {
  for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
    const d = Math.hypot(xx, yy);
    if (d > r + 0.3) continue;
    P1(ctx, cx + xx, cy + yy, 1, 1, d > r - 1.6 ? tire : d > r * 0.42 ? (yy < 0 ? "#3a3d44" : "#2a2c31") : hub);
  }
  P1(ctx, cx - 1, cy - r + 1, 2, 1, "#5a5e66");
}

/* ── LA CAMIONNETTE D'ÉQUIPE (51 × 34) : blanche, une bande orange, une galerie et son échelle, l'emblème d'un casque. ── */
export function drawVan(ctx, x, y, dir, opts) {
  const west = dir === 2, R = rig(ctx, x, y, west);
  const W0 = "#f2f1ec", W1 = "#d9d8d1", W2 = "#b4b3ac", OR = "#ff8a1c", GL = ["#5f7d94", "#8fb1c8", "#c9e0ee"];
  ctx.fillStyle = "rgba(20,16,12,0.28)"; ctx.fillRect(Math.round(x - 26), Math.round(y - 1), 52, 3);
  // le toit (vu de dessus, une bande au-dessus du flanc), la galerie, l'échelle
  R(-25, -34, 46, 8, W1); R(-25, -34, 46, 1, "#ffffff"); R(-24, -33, 44, 1, W0);
  R(-22, -35, 38, 1, "#8a8f98"); for (let k = -22; k < 16; k += 5) R(k, -36, 1, 2, "#8a8f98");
  R(-21, -37, 34, 1, "#c6cbd2"); for (let k = -20; k < 13; k += 3) R(k, -37, 1, 1, "#8a8f98");
  // le flanc
  R(-25, -26, 46, 22, W0); R(-25, -26, 46, 1, "#ffffff"); R(-25, -6, 46, 2, W2);
  R(21, -24, 4, 20, W1); R(24, -18, 2, 13, W1);                        // le capot, plus bas, à l'avant
  R(-25, -14, 50, 3, OR); R(-25, -14, 50, 1, "#ffb066");                  // la bande orange
  R(10, -24, 11, 8, GL[0]); R(11, -23, 9, 6, GL[1]); R(11, -23, 3, 2, GL[2]);   // la vitre de la cabine
  R(-22, -24, 14, 7, GL[0]); R(-21, -23, 12, 5, GL[1]);                   // la vitre arrière (on devine les sièges)
  R(8, -26, 1, 22, W2); R(-4, -26, 1, 22, W2); R(4, -12, 3, 1, "#3a3d44");   // les portes, une poignée
  R(24, -8, 2, 2, "#fff6c4"); R(-25, -9, 1, 3, "#d43a2a");                 // le phare, le feu arrière
  // l'emblème : un casque jaune dans un rond blanc, sur la porte coulissante
  R(-10, -22, 9, 7, W1); R(-9, -21, 7, 5, "#ffffff"); R(-8, -20, 5, 2, "#f2c21b"); R(-9, -18, 7, 1, "#b88a0a");
  // les roues, le bas de caisse
  wheel(ctx, Math.round(west ? x - (-15) : x - 15), Math.round(y - 4), 5, "#1d1e22", "#9aa0a8");
  wheel(ctx, Math.round(west ? x - 15 : x + 15), Math.round(y - 4), 5, "#1d1e22", "#9aa0a8");
  R(-25, -27, 1, 23, INK); R(25, -18, 1, 14, INK);
  if (opts && opts.door) R(-4, -25, 12, 21, "#3a3d44");   // la porte coulissante ouverte : l'intérieur sombre
}

/* ── LE CHARIOT TÉLESCOPIQUE (48 × 40) : jaune, une cabine vitrée à gauche, quatre grosses roues, la flèche qui part de l'arrière
   et monte vers l'avant, les fourches et leur CHARGE (`load` : "sheets" une pile de contreplaqué, "frame" un cadre d'acier,
   null) ; `lift` 0..1 : la hauteur des fourches. Le conducteur est dans la cabine (sa tête, son casque : `driver`, une couleur). ── */
export function drawTelehandler(ctx, x, y, dir, lift, load, driver) {
  const west = dir === 2, R = rig(ctx, x, y, west);
  const Y = ["#a87808", "#e0a514", "#f6c43a", "#ffe08a"], GL = "#8fb1c8";
  ctx.fillStyle = "rgba(20,16,12,0.28)"; ctx.fillRect(Math.round(x - 24), Math.round(y - 1), 50, 3);
  // la flèche : du pivot arrière (bas) vers la tête (avant, en hauteur selon `lift`)
  const pivX = -14, pivY = -18, tipX = 22, tipY = -14 - Math.round(16 * (lift || 0));
  const n = 30;
  for (let k = 0; k <= n; k++) { const t = k / n, bx = pivX + (tipX - pivX) * t, by = pivY + (tipY - pivY) * t; R(bx, by - 2, 2, 4, k % 6 === 0 ? Y[1] : Y[2]); R(bx, by + 2, 2, 1, Y[0]); }
  // le châssis et le capot moteur (à l'arrière), la cabine (à gauche du flanc, vitrée)
  R(-22, -16, 40, 10, Y[1]); R(-22, -16, 40, 1, Y[3]); R(-22, -7, 40, 1, Y[0]);
  R(-23, -22, 12, 7, Y[2]); R(-23, -22, 12, 1, Y[3]);
  R(-8, -28, 12, 13, "#3a3d44"); R(-7, -27, 10, 10, GL); R(-7, -27, 3, 3, "#c9e0ee"); R(-8, -29, 12, 1, Y[1]);
  if (driver) { R(-3, -25, 4, 3, "#e8b48a"); R(-4, -27, 6, 2, driver); R(-5, -25, 8, 1, driver); }   // le conducteur, son casque
  // les fourches et la charge
  const fy = tipY + 2;
  R(tipX, fy - 6, 2, 8, "#3a3d44"); R(tipX + 2, fy + 1, 9, 1, "#5a5e66");
  if (load === "sheets") { for (let k = 0; k < 4; k++) { R(tipX + 1, fy - 1 - k * 2, 12, 2, k % 2 ? "#d9b27a" : "#c79e62"); } R(tipX + 1, fy - 8, 12, 1, "#f0d6a8"); }
  else if (load === "frame") { R(tipX + 1, fy - 7, 12, 1, "#8a919b"); R(tipX + 1, fy - 1, 12, 1, "#5a616b"); R(tipX + 1, fy - 7, 1, 7, "#8a919b"); R(tipX + 12, fy - 7, 1, 7, "#5a616b"); R(tipX + 6, fy - 7, 1, 7, "#7a818b"); }
  // les roues (grosses, à crampons)
  for (const wx of [-15, 12]) {
    const cx = Math.round(west ? x - wx : x + wx), cy = Math.round(y - 6);
    wheel(ctx, cx, cy, 6, "#1b1c20", "#e0a514");
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; P1(ctx, cx + Math.round(Math.cos(a) * 6), cy + Math.round(Math.sin(a) * 6), 1, 1, "#33353b"); }
  }
  R(-23, -23, 1, 17, INK);
}

/* ── LE CAMION-GRUE (120 × 48 + la flèche) : cabine orange à l'avant, une grue sur colonne derrière la cabine, un plateau à ridelles
   de cinq cases (un chalet de patins ou le conteneur de location y tiennent en long).
   ⚠️ 2026-10-12 — AGRANDI (premier jet : 84 px, un plateau de 58 — le conteneur de 64 px le débordait et l'écrasait : un camion-grue
   plus petit que sa charge). Garé l'avant à L'EST (il entre en marche arrière par l'allée pavée, repart en avant) : la colonne est
   alors à six cases de l'allée et la flèche monte vers le chalet EN BIAIS — garé dans l'autre sens, elle visait droit au nord et se
   peignait en mât vertical. `opts` : { legs (0..1 : les béquilles), flash (le gyrophare), driver (la couleur du casque), stowed (la
   flèche repliée sur le plateau, pour rouler) }. Ancre : le milieu du bas de caisse côté sud. ── */
export const TRUCK = { COL: 26, COL_H: 44, BED: [-58, 22], BED_H: 27 };   // la colonne (px devant l'ancre, sa hauteur), le plateau
export function drawCraneTruckBody(ctx, x, y, dir, opts) {
  const west = dir === 2, R = rig(ctx, x, y, west), o = opts || {};
  const OR = ["#9a3a10", "#d8571c", "#f07a3a", "#ffb07a"], GR = ["#2e3036", "#4a4e56", "#7a7f88", "#b4bac2"], GL = ["#4f6d84", "#8fb1c8", "#d4e8f4"];
  const Y = ["#a87808", "#e0a514", "#f6c43a", "#ffe08a"];
  ctx.fillStyle = "rgba(20,16,12,0.3)"; ctx.fillRect(Math.round(x - 60), Math.round(y - 1), 120, 3); ctx.fillRect(Math.round(x - 57), Math.round(y - 2), 114, 1);
  // le châssis : les longerons, le réservoir et le coffre à outils entre les essieux, la barre anti-encastrement rayée
  R(-58, -16, 112, 5, GR[0]); R(-58, -16, 112, 1, GR[1]);
  R(-16, -15, 20, 7, GR[2]); R(-16, -15, 20, 1, GR[3]); for (let k = -14; k < 4; k += 4) R(k, -13, 1, 4, GR[1]);   // le réservoir, ses cerclages
  R(6, -15, 12, 6, GR[1]); R(6, -15, 12, 1, GR[2]); R(11, -13, 2, 1, GR[3]);                                      // le coffre
  for (let k = -20; k < 20; k += 4) R(k, -8, 4, 2, (k / 4) & 1 ? "#f2f1ec" : "#c8322a");
  // le plateau : le plancher (vu un peu d'en haut), la ridelle (charnières), le feu arrière
  R(-58, -27, 80, 3, "#a87c4c"); for (let k = -56; k < 22; k += 7) R(k, -27, 1, 3, "#7a5838"); R(-58, -27, 80, 1, "#d2a670");
  R(-58, -24, 80, 8, GR[2]); R(-58, -24, 80, 1, GR[3]); R(-58, -17, 80, 1, GR[1]);
  for (let k = -50; k < 22; k += 12) { R(k, -23, 1, 6, GR[1]); R(k + 1, -21, 2, 2, GR[0]); }
  R(-58, -22, 2, 4, "#d43a2a"); R(-58, -22, 2, 1, "#ff7a6a"); R(-58, -18, 2, 1, "#ffb43a");
  // les garde-boue au-dessus des roues arrière
  for (const wx of [-46, -30]) { R(wx - 8, -16, 16, 2, GR[0]); R(wx - 9, -15, 1, 3, GR[0]); R(wx + 8, -15, 1, 3, GR[0]); }
  // la colonne de la grue (jaune, sur sa couronne d'orientation), entre le plateau et la cabine
  R(20, -20, 14, 4, GR[0]); R(20, -20, 14, 1, GR[2]);
  R(23, -44, 8, 24, Y[1]); R(23, -44, 2, 24, Y[3]); R(29, -44, 2, 24, Y[0]); R(23, -44, 8, 1, Y[3]);
  R(24, -34, 6, 1, Y[0]); R(24, -27, 6, 1, Y[0]);
  // la cabine : orange, vitrée, une porte, un marchepied, un rétroviseur, le gyrophare sur le toit, le pare-chocs et le phare
  R(32, -40, 26, 30, OR[1]); R(32, -40, 26, 1, OR[3]); R(32, -40, 2, 30, OR[2]); R(56, -40, 2, 30, OR[0]); R(32, -11, 26, 1, OR[0]);
  R(32, -42, 24, 2, OR[2]); R(33, -42, 22, 1, OR[3]);
  R(42, -37, 13, 11, GL[0]); R(43, -36, 11, 9, GL[1]); R(43, -36, 4, 3, GL[2]); R(43, -27, 11, 1, GL[0]);
  R(35, -37, 6, 7, GL[0]); R(36, -36, 4, 5, GL[1]);
  R(41, -37, 1, 26, OR[0]); R(52, -22, 3, 1, GR[0]);
  R(58, -35, 2, 6, GR[0]); R(59, -34, 1, 4, GR[2]);
  R(36, -12, 9, 2, GR[1]); R(36, -12, 9, 1, GR[2]);
  R(56, -14, 4, 5, GR[0]); R(57, -19, 3, 3, "#fff6c4"); R(57, -19, 1, 1, "#ffffff");
  const bk = o.flash ? "#ffcf3a" : "#8a6a10";
  R(46, -45, 4, 3, bk); R(46, -45, 4, 1, o.flash ? "#fff2a8" : "#a88830");
  if (o.flash) { R(44, -44, 1, 1, "rgba(255,210,80,0.6)"); R(51, -44, 1, 1, "rgba(255,210,80,0.6)"); }
  if (o.driver) { R(46, -33, 5, 4, "#e8b48a"); R(45, -35, 7, 2, o.driver); R(44, -33, 9, 1, o.driver); }
  // la flèche repliée pour rouler : couchée le long du plateau, posée sur son chevalet
  if (o.stowed) {
    for (let k = 0; k <= 64; k++) { const bx = 26 - k, by = -46 + Math.round(k * 0.14); R(bx, by, 1, 5, Y[2]); R(bx, by, 1, 1, Y[3]); R(bx, by + 4, 1, 1, Y[0]); }
    R(-40, -38, 2, 11, GR[1]); R(-41, -38, 4, 1, GR[2]);
  }
  // les béquilles (sorties quand on lève) : le vérin descend, le patin se pose
  if (o.legs > 0) {
    const L = Math.round(7 * o.legs);
    for (const lx of [18, -54]) { R(lx, -12, 3, 8 + L, GR[1]); R(lx, -12, 1, 8 + L, GR[3]); R(lx - 3, -4 + L, 9, 2, GR[0]); R(lx - 3, -4 + L, 9, 1, GR[2]); }
  }
  // les roues : le tandem arrière, l'essieu avant
  for (const wx of [-46, -30, 44]) wheel(ctx, Math.round(west ? x - wx : x + wx), Math.round(y - 7), 7, "#1d1e22", "#9aa0a8");
  R(-59, -28, 1, 20, INK); R(60, -38, 1, 28, INK);
}
/* Où pend le crochet (px du monde) quand la grue vise (tx, ty, tz) : la charge se peint AVANT la flèche (voir le jeu). */
export function craneHookAt(tx, ty, tz) { return [tx * T, (ty - (tz + 0.4)) * T]; }
/* La flèche de la grue : du sommet de la colonne vers le crochet (cases du MONDE : tx, ty, tz). Rend la position ÉCRAN du crochet
   (px du monde) pour y accrocher la charge.
   ⚠️ 2026-10-12 — UNE FLÈCHE TÉLESCOPIQUE, PAS UN BRAS À COUDE (premier jet : deux segments de 3,2 cases, un trait de trois pixels ;
   le chalet est à huit cases du camion, la flèche s'étirait en un fil jaune qu'on prenait pour un câble). Une tourelle sur la colonne,
   un vérin chromé qui la lève, TROIS éléments emboîtés de plus en plus minces, éclairés par le haut (la lumière du nord-ouest), une
   poulie en tête, le câble à deux brins, la moufle rayée et son crochet. `out` (0..1) : la flèche rentrée (au repos) → sortie. */
export function drawCraneBoom(ctx, x, y, dir, tx, ty, tz, out) {
  const west = dir === 2;
  const cx = west ? x - TRUCK.COL - 1 : x + TRUCK.COL + 1, cy = y - TRUCK.COL_H;   // le sommet de la colonne, px écran
  const hookZ = tz + 0.4, tipZ = hookZ + 0.6 + 0.5 * (out || 0);
  const scr = (wx, wy, wz) => [wx * T, (wy - wz) * T];
  const A = [cx, cy - 2], B = scr(tx, ty, tipZ), HOOK = scr(tx, ty, hookZ);
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  // la normale « du dessus » (vers le haut de l'écran ; pour une flèche verticale, vers la gauche : la lumière vient de l'ouest)
  let nx = -uy, ny = ux;
  if (ny > 0 || (Math.abs(ny) < 1e-6 && nx > 0)) { nx = -nx; ny = -ny; }
  const band = (t0, t1, w, hi, mid, lo) => {
    const n = Math.ceil(L * (t1 - t0) * 2) + 1;
    for (let k = 0; k <= n; k++) {
      const t = t0 + (t1 - t0) * k / n, px = A[0] + dx * t, py = A[1] + dy * t;
      for (let j = 0; j < w; j++) { const o = (w - 1) / 2 - j; P1(ctx, px + nx * o, py + ny * o, 1, 1, j === 0 ? hi : j === w - 1 ? lo : mid); }
    }
  };
  // le vérin (sous la flèche) : du flanc de la colonne au premier tiers de l'élément de pied — le corps sombre, la tige chromée
  {
    const r0 = [cx + (west ? 2 : -2), cy + 10], r1 = [A[0] + dx * 0.3 - nx * 3, A[1] + dy * 0.3 - ny * 3];
    const n = Math.ceil(Math.hypot(r1[0] - r0[0], r1[1] - r0[1]) * 2);
    for (let k = 0; k <= n; k++) {
      const t = k / n, px = r0[0] + (r1[0] - r0[0]) * t, py = r0[1] + (r1[1] - r0[1]) * t;
      P1(ctx, px, py, 2, 2, t < 0.55 ? "#4a4e56" : "#aeb4bc"); P1(ctx, px, py, 1, 1, t < 0.55 ? "#7a7f88" : "#eef1f4");
    }
  }
  // les trois éléments, du plus gros (le pied) au plus fin (la tête) ; un collier sombre au bout des deux premiers
  const Y = ["#ffe28a", "#f6c43a", "#a87808"];
  band(0, 0.44, 6, Y[0], Y[1], Y[2]);
  band(0.4, 0.74, 5, Y[0], "#efbb30", Y[2]);
  band(0.7, 1, 4, Y[0], "#e8b42a", Y[2]);
  band(0.425, 0.44, 6, "#7a5a08", "#5a4206", "#3a2a04");
  band(0.725, 0.74, 5, "#7a5a08", "#5a4206", "#3a2a04");
  // la tourelle sur la colonne, la poulie de tête
  P1(ctx, cx - 4, cy - 4, 8, 5, Y[1]); P1(ctx, cx - 4, cy - 4, 8, 1, Y[0]); P1(ctx, cx - 4, cy, 8, 1, Y[2]); P1(ctx, cx - 1, cy - 3, 2, 2, "#3a3d44");
  P1(ctx, B[0] - 1, B[1] - 1, 3, 3, "#3a3d44"); P1(ctx, B[0], B[1], 1, 1, "#9aa0a8");
  // le câble (deux brins), la moufle (rayée jaune et noir), le crochet
  const mb = Math.round(HOOK[1] - 6);
  for (let yy = Math.round(B[1]) + 2; yy < mb; yy++) { P1(ctx, B[0] - 1, yy, 1, 1, "#2a2c31"); P1(ctx, B[0] + 1, yy, 1, 1, "#3a3d44"); }
  P1(ctx, HOOK[0] - 2, mb, 5, 4, "#2a2c31"); P1(ctx, HOOK[0] - 2, mb, 5, 1, "#5a5e66");
  P1(ctx, HOOK[0] - 2, mb + 1, 1, 2, "#f2c21b"); P1(ctx, HOOK[0], mb + 1, 1, 2, "#f2c21b"); P1(ctx, HOOK[0] + 2, mb + 1, 1, 2, "#f2c21b");
  P1(ctx, HOOK[0], mb + 4, 1, 2, "#3a3d44"); P1(ctx, HOOK[0] - 1, mb + 6, 3, 1, "#3a3d44"); P1(ctx, HOOK[0] - 1, mb + 5, 1, 1, "#3a3d44");
  return HOOK;
}

/* ── LA BARRIÈRE DE CHANTIER (le panneau grillagé sur ses deux plots de béton) : `along` "x" (un panneau est-ouest, vu de face) ou
   "y" (nord-sud). (x, y) : le MILIEU du pied du panneau, px du monde.
   ⚠️ 2026-10-12 — UN PANNEAU NORD-SUD SE VOIT PAR LA TRANCHE (la vue de trois quarts n'écrase que la hauteur : un plan vertical
   nord-sud tombe sur une seule colonne d'écran), MAIS SUR TOUTE SA LONGUEUR : du haut de son bout nord au pied de son bout sud, une
   bande continue de deux pixels (premier jet : un trait de 26 px à chaque pied — la barrière de l'est se lisait en pointillés). ── */
export function drawFencePanel(ctx, x, y, along) {
  const h = 26;
  if (along === "x") {
    const w = 34, x0 = Math.round(x - w / 2), y0 = Math.round(y - h);
    P1(ctx, x0, y0, w, 1, "#c6cbd2"); P1(ctx, x0, y - 3, w, 1, "#8a8f98");
    P1(ctx, x0, y0, 1, h - 2, "#c6cbd2"); P1(ctx, x0 + w - 1, y0, 1, h - 2, "#8a8f98");
    for (let k = 3; k < w - 1; k += 3) P1(ctx, x0 + k, y0 + 1, 1, h - 4, "rgba(170,178,188,0.7)");
    for (let k = 4; k < h - 3; k += 4) P1(ctx, x0 + 1, y0 + k, w - 2, 1, "rgba(150,158,168,0.6)");
    P1(ctx, x0 + w / 2 - 6, y0 + 8, 12, 5, "#ff8a1c"); P1(ctx, x0 + w / 2 - 6, y0 + 8, 12, 1, "#ffb066");   // la bâche de signalisation
    for (const fx of [x0 - 2, x0 + w - 4]) { P1(ctx, fx, y - 3, 6, 3, "#9a968c"); P1(ctx, fx, y - 3, 6, 1, "#c4c0b4"); }
  } else {
    const L = Math.round(2.2 * T), x0 = Math.round(x), yN = Math.round(y - L / 2), yS = yN + L;
    P1(ctx, x0, yN - h, 1, L + h - 2, "#c6cbd2"); P1(ctx, x0 + 1, yN - h, 1, L + h - 2, "#7a7f88");   // la tranche : le tube éclairé, son ombre
    for (let k = 4; k < L + h - 4; k += 5) P1(ctx, x0 + 1, yN - h + k, 1, 1, "#5a5e66");               // les nœuds du grillage
    P1(ctx, x0, yN - h + 8 + Math.round(L * 0.3), 2, Math.round(L * 0.4), "#ff8a1c");                  // la bâche, par la tranche
    for (const fy of [yN, yS]) { P1(ctx, x0 - 2, fy - 3, 6, 3, "#9a968c"); P1(ctx, x0 - 2, fy - 3, 6, 1, "#c4c0b4"); }
  }
}
/* ── LA PALETTE DES PANNEAUX (2026-10-12) : un tas de `n` panneaux couchés sur une palette, et leurs plots de béton à côté. Le tas
   baisse à mesure qu'on pose la barrière, remonte quand on la retire (`CH.palletAt`). (x, y) : le milieu du pied de la palette. ── */
export function drawFencePallet(ctx, x, y, n) {
  const x0 = Math.round(x - 18), yb = Math.round(y);
  ctx.fillStyle = "rgba(20,16,12,0.26)"; ctx.fillRect(x0 - 1, yb - 1, 38, 3);
  P1(ctx, x0, yb - 4, 36, 4, "#8a6038"); P1(ctx, x0, yb - 4, 36, 1, "#b88a58");
  for (const k of [3, 16, 30]) P1(ctx, x0 + k, yb - 2, 3, 2, "#4a3420");                      // les dés de la palette
  // les panneaux couchés : la tranche (un pixel chacun, clair et sombre), le dessus grillagé du dernier
  // un panneau couché fait 4 cm : 0,6 px (trente-neuf panneaux, un mètre soixante de tas)
  const hS = Math.round(n * 0.6);
  for (let k = 0; k < hS; k++) P1(ctx, x0 + 1, yb - 5 - k, 34, 1, k % 2 ? "#aab0b8" : "#7a7f88");
  if (n > 0) {
    const ty = yb - 5 - hS - 11;
    P1(ctx, x0 + 1, ty, 34, 12, "rgba(150,158,168,0.35)");
    P1(ctx, x0 + 1, ty, 34, 1, "#d6dbe2"); P1(ctx, x0 + 1, ty + 11, 34, 1, "#8a8f98"); P1(ctx, x0 + 1, ty, 1, 12, "#c6cbd2"); P1(ctx, x0 + 34, ty, 1, 12, "#8a8f98");
    for (let k = 4; k < 34; k += 3) P1(ctx, x0 + 1 + k, ty + 1, 1, 10, "rgba(170,178,188,0.55)");
    P1(ctx, x0 + 12, ty + 4, 12, 3, "#ff8a1c");
  }
  // les plots (deux par panneau couché, en deux rangs), à l'ouest de la palette
  const m = Math.min(12, Math.ceil(n / 2));
  for (let k = 0; k < m; k++) { const bx = x0 - 22 + (k % 4) * 5, by = yb - 3 - Math.floor(k / 4) * 3; P1(ctx, bx, by, 5, 3, "#9a968c"); P1(ctx, bx, by, 5, 1, "#c4c0b4"); }
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ LES GESTES DES OUVRIERS — taillés dans la feuille, comme les poses des riders (`montureArt.js`) et du patineur.
   ╚════════════════════════════════════════════════════════════════════════════
   `act` : "carry" (les deux bras levés, la charge au-dessus de la tête : une feuille, un panneau — l'appelant dessine la charge),
   "fence" (penché, il pose le panneau), "squeegee" (la raclette à long manche, poussée devant soi, le pas en avant), "weld" (À GENOUX,
   le masque baissé, la torche : l'arc bleu-blanc et les étincelles), "screw" (accroupi, la visseuse), "point" (le chef montre, un bras
   tendu). `phase` (secondes) anime ; (px, py) : le coin du sprite comme `drawCharacter`. Rend la position de la main de travail. */
export function drawWorkerAct(ctx, sheet, row, px, py, act, phase, frame) {
  const sy = row * 24, side = row === 2, fx = ((frame | 0) % 4) * 16;   // `frame` : la colonne de marche de la feuille (porter en marchant)
  const LY = PS.LEG_Y, LH = 24 - LY;
  const bob = Math.round(Math.sin(phase * 6) * 0.6);
  const legs = (top, dl, dr, cut) => {
    const h = LH - (cut || 0);
    ctx.drawImage(sheet, fx, sy + LY + (cut || 0), 8, h, px + dl, top + LY + (cut || 0), 8, h);
    ctx.drawImage(sheet, fx + 8, sy + LY + (cut || 0), 8, h, px + 8 + dr, top + LY + (cut || 0), 8, h);
  };
  const torsoNoArms = (top, tx) => { if (side) ctx.drawImage(sheet, 0, sy + PS.TORSO_Y, 16, LY - PS.TORSO_Y, px + tx, top + PS.TORSO_Y, 16, LY - PS.TORSO_Y); else ctx.drawImage(sheet, 5, sy + PS.TORSO_Y, 6, LY - PS.TORSO_Y, px + 5 + tx, top + PS.TORSO_Y, 6, LY - PS.TORSO_Y); };
  const torso = (top, tx) => ctx.drawImage(sheet, 0, sy + PS.TORSO_Y, 16, LY - PS.TORSO_Y, px + tx, top + PS.TORSO_Y, 16, LY - PS.TORSO_Y);
  const head = (top, hx) => ctx.drawImage(sheet, 0, sy, 16, PS.HEAD_H, px + hx, top, 16, PS.HEAD_H);
  const arms = (top, tx, hands) => { const R = { top: top + PS.TORSO_Y, dx: tx }; for (const h of hands) drawReachArm(ctx, sheet, sy, px, side, h.x >= px + 8 ? 1 : 0, R, h); };
  const top0 = py - 9;
  if (act === "carry") {
    legs(top0, 0, 0); torsoNoArms(top0, 0); head(top0, 0);
    const hands = side ? [{ x: px + 11, y: top0 + 1 }] : [{ x: px + 3, y: top0 + 1 }, { x: px + 13, y: top0 + 1 }];
    arms(top0, 0, hands);
    return { x: px + 8, y: top0 - 1 };
  }
  if (act === "fence" || act === "squeegee") {
    const lean = act === "squeegee" ? 2 : 1, top = top0 + 2;
    legs(top0, act === "squeegee" ? (Math.sin(phase * 5) > 0 ? -1 : 1) : 0, act === "squeegee" ? (Math.sin(phase * 5) > 0 ? 1 : -1) : 0);
    torsoNoArms(top, lean - 1); head(top, lean);
    const hx = px + (side ? 14 : 8), hy = top + 13;
    arms(top, lean - 1, side ? [{ x: hx, y: hy }] : [{ x: px + 5, y: hy }, { x: px + 11, y: hy }]);
    if (act === "squeegee") {
      // la raclette : un long manche vers le sol, la lame en caoutchouc noir, l'eau qui gicle devant
      const lx = side ? px + 19 : px + 8, ly = py + 14;
      for (let k = 0; k < 8; k++) P1(ctx, hx + (lx - hx) * k / 8, hy + (ly - hy) * k / 8, 1, 1, "#8a6a42");
      P1(ctx, lx - (side ? 1 : 5), ly, side ? 2 : 10, 2, "#26272b");
      if (Math.sin(phase * 5) > 0.2) P1(ctx, lx + (side ? 2 : -6), ly + 1, side ? 3 : 12, 1, "rgba(200,225,245,0.8)");
    }
    return { x: hx, y: hy };
  }
  if (act === "weld" || act === "screw") {
    // À GENOUX : les jambes repliées sous soi (la tranche coupée de moitié), le buste descendu de quatre pixels
    const top = top0 + 4 + bob * 0;
    legs(top0 + 4, 0, 0, 4);
    torsoNoArms(top, 0); head(top, 0);
    const hx = side ? px + 15 : px + 10, hy = top + 15;
    arms(top, 0, side ? [{ x: hx, y: hy }] : [{ x: px + 6, y: hy }, { x: hx, y: hy }]);
    if (act === "weld") {
      // le masque BAISSÉ : il couvre le visage (de face, de profil ; de dos on ne le voit pas)
      if (row !== 1) { P1(ctx, px + (side ? 9 : 4), top + 3, side ? 4 : 8, 6, "#2a2c33"); P1(ctx, px + (side ? 10 : 6), top + 5, side ? 3 : 4, 1, "#7ab8ff"); }
      // la torche, l'arc (blanc-bleu, qui palpite), les étincelles (hachées sur la phase)
      P1(ctx, hx, hy, 3, 1, "#3a3d44");
      const on = Math.sin(phase * 23) > -0.6;
      if (on) {
        const ax = hx + 3, ay = hy + 1;
        P1(ctx, ax, ay, 1, 1, "#ffffff"); P1(ctx, ax - 1, ay, 3, 1, "rgba(160,210,255,0.85)"); P1(ctx, ax, ay - 1, 1, 3, "rgba(160,210,255,0.85)");
        const f = Math.floor(phase * 30);
        for (let k = 0; k < 5; k++) {
          const h1 = hash(f, k), h2 = hash(k, f + 7), age = h1;
          const sx = ax + Math.round((h2 - 0.5) * 10 * age), syy = ay + Math.round(-4 * age + 9 * age * age);
          P1(ctx, sx, syy, 1, 1, age < 0.4 ? "#fffbe0" : age < 0.75 ? "#ffd56a" : "#ff9a3c");
        }
      }
    } else {
      P1(ctx, hx, hy - 1, 3, 2, "#e0a514"); P1(ctx, hx + 3, hy, 2, 1, "#9aa0a8");   // la visseuse, son embout
      if (Math.sin(phase * 30) > 0.5) P1(ctx, hx + 5, hy, 1, 1, "#d9b27a");     // un copeau
    }
    return { x: hx, y: hy };
  }
  if (act === "point") {
    legs(top0, 0, 0); torsoNoArms(top0, 0); head(top0, 0);
    const R = { top: top0 + PS.TORSO_Y, dx: 0 };
    const sway = Math.round(Math.sin(phase * 1.2) * 1.5);
    drawReachArm(ctx, sheet, sy, px, side, 1, R, { x: px + (side ? 17 : 15), y: top0 + 7 + sway });
    if (!side) ctx.drawImage(sheet, PS.ARM_LX, sy + PS.ARM_Y, PS.ARM_W, PS.ARM_H, px + PS.ARM_LX, top0 + PS.ARM_Y, PS.ARM_W, PS.ARM_H);
    return { x: px + 15, y: top0 + 7 };
  }
  return null;
}
/* La CHARGE portée à deux (une feuille de contreplaqué, un panneau de barrière) : un plan tenu à hauteur de tête entre les deux paires
   de mains — ses deux bouts suivent les deux porteurs. `kind` : "sheet" | "fence". (ax, ay) → (bx, by) : les mains, px du monde. */
export function drawCarriedLoad(ctx, ax, ay, bx, by, kind) {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
  for (let k = -2; k <= n + 2; k++) {
    const t = k / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    if (kind === "fence") { P1(ctx, x, y - 6, 1, 6, k % 3 === 0 ? "#c6cbd2" : "rgba(170,178,188,0.7)"); P1(ctx, x, y - 6, 1, 1, "#c6cbd2"); }
    else { P1(ctx, x, y - 3, 1, 3, k % 5 === 0 ? "#c79e62" : "#e2c08a"); P1(ctx, x, y - 3, 1, 1, "#f6e2b8"); P1(ctx, x, y, 1, 1, "#9a7448"); }
  }
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 2026-10-12 — LA GLACE QUI FOND, AU PIXEL.
   ╚════════════════════════════════════════════════════════════════════════════
   Premier jet : chaque case de glace s'effaçait d'un bloc (une opacité par case, en paliers, selon sa distance au bord) — vu en jeu,
   un CARRÉ de glace intacte au milieu d'une patinoire grise, et des marches d'une case à l'autre. Une glace fond par plaques : chaque
   pixel a son SEUIL (près du bord plus bas — la bande protégeait mal —, et un bruit à deux échelles : des langues, des îles), et un
   pixel disparaît quand la fonte `p` (0..1) le dépasse. Juste avant : la glace AMINCIE (grise, à demi transparente : on y devine la
   pierre) ; au bord de ce qui reste, une croûte claire (le névé de fonte). Tout le reste se couvre d'un voile d'eau (plus sombre,
   bleuté). Dessous, l'eau et les flaques sont celles de la pluie (`pluie.js`, posées par le jeu) : la même eau que tout le reste.
   Cuit pour toute la patinoire (un canevas, 304 × 320), refait quand la fonte change d'un cent-vingtième — une fois toutes les
   dix-huit secondes de jeu. `R` : `C.TOWN_RINK` ; `makeCanvas(w, h)`. */
const MELT = { base: null, thr: null, cv: null, g: null, img: null, q: -1, W: 0, H: 0 };
function vnoise(x, y, s, seed) {
  const gx = Math.floor(x / s), gy = Math.floor(y / s), fx = x / s - gx, fy = y / s - gy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const h = (a, b) => hash(a * 7 + seed, b * 13 - seed * 3);
  const a = h(gx, gy), b = h(gx + 1, gy), c = h(gx, gy + 1), d = h(gx + 1, gy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
export function rinkMeltCanvas(makeCanvas, R, p) {
  const W = (R.x1 - R.x0 + 1) * T, H = (R.y1 - R.y0 + 1) * T;
  if (!MELT.base) {
    const b = makeCanvas(W, H), bg = b.getContext("2d");
    for (let y = R.y0; y <= R.y1; y++) for (let x = R.x0; x <= R.x1; x++) drawRinkIceTile(bg, x, y, (x - R.x0) * T, (y - R.y0) * T);
    MELT.base = bg.getImageData(0, 0, W, H).data;
    const thr = new Float32Array(W * H), half = Math.min(W, H) / 2;
    let lo = 1e9, hi = -1e9;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const e = Math.min(x, W - 1 - x, y, H - 1 - y) / half;
      const v = 0.56 * Math.pow(e, 0.7) + 0.3 * vnoise(x, y, 29, 3) + 0.14 * vnoise(x, y, 8, 11);
      thr[y * W + x] = v; if (v < lo) lo = v; if (v > hi) hi = v;
    }
    for (let i = 0; i < thr.length; i++) thr[i] = (thr[i] - lo) / (hi - lo);
    MELT.thr = thr; MELT.W = W; MELT.H = H;
    MELT.cv = makeCanvas(W, H); MELT.g = MELT.cv.getContext("2d"); MELT.img = MELT.g.createImageData(W, H);
  }
  const q = Math.max(0, Math.min(120, Math.round(p * 120)));
  if (q !== MELT.q) {
    MELT.q = q;
    const f = -0.02 + 1.06 * q / 120, film = 0.3 * Math.min(1, q / 30), B = MELT.base, d = MELT.img.data, thr = MELT.thr;
    for (let i = 0, o = 0; i < thr.length; i++, o += 4) {
      const a0 = B[o + 3], dd = thr[i] - f;
      if (!a0 || dd < 0) { d[o + 3] = 0; continue; }
      let r = B[o], g = B[o + 1], b = B[o + 2], a = a0;
      // le voile d'eau sur la glace qui fond : plus sombre, bleuté
      r += (150 - r) * film; g += (172 - g) * film; b += (196 - b) * film;
      if (dd < 0.022) { r += (226 - r) * 0.55; g += (232 - g) * 0.55; b += (238 - b) * 0.55; a = a0 * 0.95; }        // la croûte du bord
      else if (dd < 0.11) { const k = (dd - 0.022) / 0.088; r += (112 - r) * (1 - k) * 0.6; g += (128 - g) * (1 - k) * 0.6; b += (148 - b) * (1 - k) * 0.6; a = a0 * (0.5 + 0.5 * k); }   // amincie
      d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = a;
    }
    MELT.g.putImageData(MELT.img, 0, 0);
  }
  return MELT.cv;
}
