/* =============================================================================
   render-patin.mjs — LES POSES DU PATIN, LES DEUX PAIRES, LES FIGURES (2026-10-05, fin quater).
   -----------------------------------------------------------------------------
   Le VRAI `A.drawSkate` (celui du jeu) sur la vraie feuille du personnage : chaque pose (arrêt, glisse, saut, axel, vrille,
   cygne) vue de face, de dos et de profil, en patin ordinaire blanc puis en longues lames rouges. Ce qu'on voit ici est ce
   que le joueur verra, au pixel près (sauf la combinaison : elle repeint la feuille par `getImageData`, que le faux canevas
   n'a pas — elle se juge en jeu).
   Contrôles : la lame de course est plus LONGUE de profil que la lame ordinaire (mesurée en pixels), la couleur de la bottine
   est celle de la palette, le saut ne sort pas du cadre.
   Planche : tools/out/patin-poses.png.   Usage :  node tools/render-patin.mjs
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "patin"]);
const A = mods.fermeArt, PT = mods.patin;
const S = A.buildSprites();
const sheet = S.getChar("m", 0, false, false, false, false, false, false, null);
let fail = 0, nOk = 0;
const ok = (c, l, d) => { console.log((c ? "  OK   " : "  FAIL ") + l + (d ? "  —  " + d : "")); if (!c) fail++; else nOk++; };
console.log("\n=== render-patin ===\n");

const POSES = [["stand", 0], ["glide", 0.2], ["glide", 1.3], ["brake", 0], ["hop", 0], ["axel", 0.4], ["spin", 0.15], ["swan", 0]];
const KITS = [{ type: "classic", suit: 0, color: 0 }, { type: "race", suit: 0, color: 1 }, { type: "race", suit: 0, color: 2 }];
const VIEWS = [["face", 0], ["dos", 1], ["profil", 2]];
const CW = 40, CH = 44, cols = POSES.length * VIEWS.length, rows = KITS.length;
const board = makeCanvas(cols * CW, rows * CH);
board.ctx.fillStyle = "rgb(205,222,242)"; board.ctx.fillRect(0, 0, cols * CW, rows * CH);
const lens = [];
KITS.forEach((kit, ri) => {
  let ci = 0;
  for (const [pose, ph] of POSES) for (const [, row] of VIEWS) {
    const ox = ci * CW + 12, oy = ri * CH + 18;
    const air = pose === "hop" ? 12 : pose === "axel" ? 14 : 0;
    board.ctx.fillStyle = "rgba(20,40,80,0.25)"; board.ctx.fillRect(ox + 3, oy + 15, 10, 2);       // l'ombre reste au sol
    A.drawSkate(board.ctx, sheet, row, ox, oy - air, pose, ph, false, { kit });
    ci++;
  }
});
/* Longueur de la lame de profil : les pixels de la teinte lame sur la rangée du sol, sous la pose « stand » de profil. */
function bladeLen(kit) {
  const v = makeCanvas(32, 40);
  A.drawSkate(v.ctx, sheet, 2, 8, 12, "stand", 0, false, { kit });
  let best = 0;
  for (let y = 0; y < 40; y++) { let n = 0; for (let x = 0; x < 32; x++) { const i = (y * 32 + x) * 4; const r = v.px[i], g = v.px[i + 1], b = v.px[i + 2], a = v.px[i + 3]; if (a > 8 && Math.abs(r - g) < 14 && Math.abs(g - b) < 22 && r > 90) n++; } best = Math.max(best, n); }
  return best;
}
const bc = bladeLen(KITS[0]), br = bladeLen(KITS[1]);
ok(br >= bc + 3, "la lame de course est plus LONGUE de profil que l'ordinaire", `${bc} px → ${br} px`);
const bootPix = (kit) => { const v = makeCanvas(32, 40); A.drawSkate(v.ctx, sheet, 0, 8, 12, "stand", 0, false, { kit }); const want = PT.SKATE_COLORS[kit.color].main; const wr = parseInt(want.slice(1, 3), 16), wg = parseInt(want.slice(3, 5), 16), wb = parseInt(want.slice(5, 7), 16); let n = 0; for (let i = 0; i < v.px.length; i += 4) if (v.px[i + 3] > 8 && v.px[i] === wr && v.px[i + 1] === wg && v.px[i + 2] === wb) n++; return n; };
ok(bootPix(KITS[1]) > 0 && bootPix(KITS[2]) > 0, "la bottine prend le ton de la couleur choisie (rouge, bleu)");
{
  // Le saut ne sort pas du cadre : le sommet de la silhouette reste dans la cellule (le canevas découpe en silence).
  const v = makeCanvas(32, 48), g0 = makeCanvas(32, 48); A.drawSkate(v.ctx, sheet, 0, 8, 30 - PT.TRICK.HOP.H, "hop", 0, false, { kit: KITS[0] }); A.drawSkate(g0.ctx, sheet, 0, 8, 30, "stand", 0, false, { kit: KITS[0] });
  const topOf = (c) => { for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) if (c.px[(y * 32 + x) * 4 + 3] > 8) return y; return 99; };
  ok(topOf(v) >= 0 && topOf(g0) - topOf(v) >= PT.TRICK.HOP.H - 2, "le saut monte de la hauteur de l'arc (et reste dans son cadre)", `${topOf(g0)} → ${topOf(v)}`);
}
{
  const a = makeCanvas(32, 40), b = makeCanvas(32, 40);
  A.drawSkate(a.ctx, sheet, 2, 8, 12, "swan", 0, false, { kit: KITS[0] }); A.drawSkate(b.ctx, sheet, 2, 8, 12, "glide", 0, false, { kit: KITS[0] });
  let diff = 0; for (let i = 3; i < a.px.length; i += 4) if ((a.px[i] > 8) !== (b.px[i] > 8)) diff++;
  ok(diff > 20, "le cygne ne se confond pas avec la glisse (la silhouette change)", `${diff} pixels de différence`);
}
fs_write();
function fs_write() { const k = 4; const big = scale(board.px, cols * CW, rows * CH, k); writePNG(path.join(OUT, "patin-poses.png"), big.px, big.W, big.H); }
console.log(`\n${fail === 0 ? "✅" : "❌"} ${nOk}/${nOk + fail} contrôles — planche : tools/out/patin-poses.png\n`);
process.exit(fail === 0 ? 0 : 1);
