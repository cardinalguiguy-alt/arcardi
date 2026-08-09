/* =============================================================================
   render-taxi.mjs — LE TAXI DE VALLEY TOWN, SOUS SES TROIS ANGLES. (432)
   -----------------------------------------------------------------------------
   ⚠️ UN VÉHICULE NE SE JUGE PAS SUR UNE VUE. Trois dessins doivent décrire le
   MÊME objet : même longueur de caisse, même hauteur de toit, même diamètre de
   roue, même ligne de sol. Une seule vue regardée isolément a toujours l'air
   juste — c'est en les mettant côte à côte qu'on voit qu'un toit a grandi.
   Le banc imprime donc aussi ces mesures, plutôt que de les laisser à l'œil.

   ⚠️ ET IL LE MONTRE SUR DU DALLAGE, À CÔTÉ D'UNE FERMIÈRE : le taxi ne roule
   que sur la pierre, et un véhicule se juge contre la taille de qui monte
   dedans (leçon de render-echelle.mjs).

   Usage :  node tools/render-taxi.mjs
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme, paletteOf } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt"]);
const A = mods.fermeArt;
const S = A.buildSprites();
const CHAR = S.getChar("f", 1, false, false, false, false, false, false, null);

/* ⚠️ LES CINQ DESSINS, DANS L'ORDRE D'UN VIRAGE : dos → 3/4 dos → profil →
   3/4 face → face. C'est cette suite-là qu'on regarde, pas cinq images isolées :
   un virage se juge à la CONTINUITÉ de la silhouette, et une vue qui saute se
   voit immédiatement quand elles sont côte à côte dans le bon ordre. */
const views = [["de dos (nord)", S.taxi.n], ["3/4 dos (nord-est)", S.taxi.ne],
               ["profil (est)", S.taxi.e], ["3/4 face (sud-est)", S.taxi.se],
               ["de face (sud)", S.taxi.s]];

/* ---- la planche : dallage, ligne de sol commune, fermière comme repère ---- */
const PAD = 6, H = 34, GROUND = 26;
const total = views.reduce((a, [, im]) => a + im.width + PAD, PAD) + 24;
const sh = makeCanvas(total, H);
// Dallage sommaire : c'est le sol sur lequel le taxi roulera vraiment.
for (let y = 0; y < H; y++) for (let x = 0; x < total; x++) {
  const v = ((x * 41 + y * 23) % 5);
  sh.ctx.fillStyle = ((((x / 8) | 0) + ((y / 8) | 0)) % 2 === 0)
    ? ["#b3b2b8", "#b6b5bb", "#afaeb4", "#b1b0b6", "#b4b3b9"][v]
    : ["#a5a4ab", "#a8a7ae", "#a2a1a8", "#a6a5ac", "#a3a2a9"][v];
  sh.ctx.fillRect(x, y, 1, 1);
}
let cx = PAD;
for (const [, im] of views) {
  // Ombre portée : sans elle un véhicule flotte, et c'est le premier défaut
  // qu'on remarque en jeu (voir drawBuildingShadow).
  sh.ctx.fillStyle = "rgba(0,0,0,0.22)";
  sh.ctx.beginPath();
  sh.ctx.ellipse(cx + im.width / 2, GROUND + 1, im.width * 0.42, 2.2, 0, 0, 7);
  sh.ctx.fill();
  sh.ctx.drawImage(im, cx, GROUND - im.ground);
  cx += im.width + PAD;
}
sh.ctx.drawImage(CHAR, 0, 0, 16, 24, cx, GROUND - 23, 16, 24);
{ const up = scale(sh.px, sh.width, sh.height, 6); writePNG(path.join(OUT, "taxi-vues.png"), up.px, up.W, up.H); }

/* ---- les mesures : trois vues doivent décrire le MÊME véhicule ----------- */
console.log("\\n  vue            largeur  hauteur  sol   couleurs");
for (const [name, im] of views) {
  const p = paletteOf(im.px ? im.px : imgPx(im), im.width, im.height);
  console.log("  " + name.padEnd(15) + String(im.width).padStart(5) + String(im.height).padStart(9)
              + String(im.ground).padStart(6) + String(p.colors).padStart(10));
}
function imgPx(im) { const c2 = makeCanvas(im.width, im.height); c2.ctx.drawImage(im, 0, 0); return c2.px; }

const hS = S.taxi.s.height, hN = S.taxi.n.height;
if (hS !== hN) { console.error("❌ la face et le dos n'ont pas la même hauteur : " + hS + " vs " + hN); process.exit(1); }
if (S.taxi.s.ground !== S.taxi.e.ground || S.taxi.n.ground !== S.taxi.e.ground) {
  console.error("❌ les trois vues n'ont pas la même ligne de sol."); process.exit(1);
}
console.log("\\n→ tools/out/taxi-vues.png");
