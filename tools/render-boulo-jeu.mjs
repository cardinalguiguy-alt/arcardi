/* =============================================================================
   render-boulo-jeu.mjs — LE BOULODROME, LOT 3 : CE QUI SE DESSINE PENDANT UNE PARTIE (2026-10-31)
   Sur le vrai sable de la piste du platane (`bouloGroundPixels`), au cran ×3 (celui de la partie), au pixel d'écran comme en jeu :
   le cercle de craie, une mène à trois (boules d'acier à bande rouge, bleue, or ; le cochonnet orange), l'anneau du point, une
   boule en vol et son ombre, le guide complet (l'arc, la donnée dorée, le roulé, la boule fantôme), la jauge, le « +2 ».
   ⚠️ Le faux canevas ignore les transformations : on passe un repère d'écran explicite (`R`), comme les crans du jeu.
   Sortie : tools/out/boulo-jeu.png (×1, c'est déjà la taille d'écran ×3) et boulo-jeu-loupe.png (×2). Se juge à l'œil.
   Usage : node tools/render-boulo-jeu.mjs
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["petanque", "boulodrome", "boulodromeArt", "bouloJeu", "bouloJeuArt"]);
const PT = mods.petanque, BD = mods.boulodrome, BA = mods.boulodromeArt, BJ = mods.bouloJeu, BJA = mods.bouloJeuArt;
const K = 3, k = "b", p = BD.pisteDe(k);
// le cadre : la piste du platane et ses madriers, un peu d'herbe autour
const X0 = p.sx - 8, Y0 = p.sy - 14, W = (BD.BOULO.LP + 16) * K, H = (BD.BOULO.WP + 22) * K;
const out = makeCanvas(W, H);
for (let i = 0; i < out.px.length; i += 4) { out.px[i] = 92; out.px[i + 1] = 128; out.px[i + 2] = 62; out.px[i + 3] = 255; }
const G = BA.bouloGroundPixels(), gx0 = BA.GROUND_X0, gy0 = BA.GROUND_Y0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const wx = X0 + Math.floor(x / K), wy = Y0 + Math.floor(y / K), gi = ((wy - gy0) * G.w + (wx - gx0)) * 4;
  if (wx < gx0 || wy < gy0 || wx >= gx0 + G.w || wy >= gy0 + G.h || G.px[gi + 3] < 10) continue;
  const o = (y * W + x) * 4, a = G.px[gi + 3] / 255;
  for (let c = 0; c < 3; c++) out.px[o + c] = G.px[gi + c] * a + out.px[o + c] * (1 - a);
}
const R = { k: K, sx: (wx) => (wx - X0) * K, sy: (wy) => (wy - Y0) * K };
const ctx = out.ctx;
// une mène à trois, posée à la main (mm, repère de la piste)
const sess = { k, ent: [{ id: "A", name: "Ana" }, { id: "B", name: "Ben" }, { id: "C", name: "Cy" }] };
const cercle = { x: 2000, y: 1500 }, but = { x: 2150, y: 9200 };
const boules = [["A", 2100, 8950], ["B", 1820, 9400], ["C", 2500, 9050], ["A", 2900, 10300], ["B", 1500, 8500]];
const w = (x, y) => BJ.mmVersMonde(k, x, y);
let c = w(cercle.x, cercle.y);
BJA.dessinerCercle(ctx, R, c[0], c[1], false);
c = w(2000, 1500); BJA.dessinerCercle(ctx, R, c[0] + 0, c[1] + 0, false);
const b0 = w(but.x, but.y); BJA.dessinerBoule(ctx, R, b0[0], b0[1], 0, null, true);
for (const [id, x, y] of boules) { const q = w(x, y); BJA.dessinerBoule(ctx, R, q[0], q[1], 0, BJ.couleurDe(sess, id), false); }
const pt = w(2100, 8950); BJA.dessinerPoint(ctx, R, pt[0], pt[1]);
// une boule en vol (une plombée, à 1,6 m de haut) et son ombre
const fv = w(1600, 6200); BJA.dessinerBoule(ctx, R, fv[0], fv[1], 1.6, BJ.couleurDe(sess, "C"), false);
// le guide complet d'une demi-portée, et la jauge au-dessus du lanceur
const m = { cercle, but, lourd: 0 };
const g = BJ.guide(m, "demi", BJ.donneeDefaut(m, "demi"), 0);
BJA.dessinerGuide(ctx, R, g, (x, y, o) => BJ.versMonde(k, x, y, o), BJ.couleurDe(sess, "A"), false);
const head = w(cercle.x, cercle.y);
BJA.dessinerJauge(ctx, R, head[0], head[1] - 22, 0.35);
BJA.dessinerPoints(ctx, R, pt[0], pt[1] - 2, "+2", BJ.couleurDe(sess, "A"), 1);
writePNG(path.join(ROOT, "tools", "out", "boulo-jeu.png"), out.px, W, H);
const up = scale(out.px, W, H, 2);
writePNG(path.join(ROOT, "tools", "out", "boulo-jeu-loupe.png"), up.px, up.W, up.H);
console.log("planche : tools/out/boulo-jeu.png", W + "×" + H, "; boulo-jeu-loupe.png ×2");
