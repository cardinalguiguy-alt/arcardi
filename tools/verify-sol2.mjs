/* =============================================================================
   verify-sol2.mjs — LE SOL DU JEU, MESURÉ CONTRE LA RÉFÉRENCE DE GUILLAUME.
   (447)
   -----------------------------------------------------------------------------
   ⚠️⚠️ IL EXISTE PARCE QUE LA GRANDEUR QUI MANQUAIT EST L'ÉCART À LA RÉFÉRENCE.
   `render-rues.mjs` (434) mesure très bien ce qu'il mesure : le bouclage du
   pavé, sa période, son nombre de teintes. Aucun de ces trois nombres ne bouge
   si l'herbe du jeu est d'un vert franc et celle de la maquette d'un vert
   grisé — le banc reste au vert pendant que l'écart saute aux yeux. C'est la
   quatrième forme du §« un banc qui passe ne veut pas dire que la chose est
   bonne » : *il mesure autre chose que ce qu'on veut*.

   Ce qu'on mesure ici est donc UNE SEULE CHOSE, et elle est comparative : le
   sol du jeu et le sol de `refs/scene2.png`, passés par la même toise, doivent
   rendre les mêmes nombres. La toise est celle du §8 de CLAUDE.md —

     1. la LUMINANCE MOYENNE (le seul nombre qu'on savait déjà tenir) ;
     2. l'ÉCART-TYPE, et c'est LUI qui compte : au 421 la moyenne était juste et
        l'image fausse, faute d'écart. Une pelouse sans écart est un tapis ;
     3. la SATURATION, parce que c'est là qu'était tout l'écart mesuré au 447 —
        58 % pour l'herbe du jeu contre 44 % pour celle de Guillaume, à
        luminance quasi identique (118,9 contre 122,7). Un œil voit « plus
        naturel » ; la toise dit « moins saturé de 25 % » ;
     4. la part de pixels SOMBRES et CLAIRS au-delà de 1,2 écart-type, qui est
        la densité de brins — c'est ce qui distingue un gazon d'un aplat.

   ⚠️ IL APPELLE `A.buildSprites()`, donc les VRAIES surfaces du jeu, jamais une
   repeinte locale : un banc qui redessine juge sa propre maquette (leçon du
   439, quatrième forme).

   ⚠️⚠️ ET IL LIT LA RÉFÉRENCE À CHAQUE LANCEMENT, il ne recopie aucun chiffre.
   Le 437 a perdu du temps sur un compte périmé écrit à la main dans un fichier ;
   ici, si Guillaume change `refs/scene2.png`, la cible change avec.

   Usage :  node tools/verify-sol2.mjs
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, loadFerme } from "./lib-canvas.mjs";
import { nativeSheet } from "./lib-planche.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");
const STEP2 = 3.875;                       // une case = 62 px image (voir import-planche2.mjs)

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fermeEngine"]);
const A = mods.fermeArt;
const S = A.buildSprites();

let fail = 0;
const ok = (cond, label, detail) => {
  console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : ""));
  if (!cond) fail++;
};

/* La toise. Rend les cinq nombres, sur un tableau RGBA. */
function toise(px, W, H) {
  const lum = [], sat = [];
  let n = 0;
  for (let i = 0; i < W * H; i++) {
    if (px[i * 4 + 3] < 8) continue;
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
    lum.push(0.299 * r + 0.587 * g + 0.114 * b);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    sat.push(mx ? (mx - mn) / mx : 0);
    n++;
  }
  const moy = lum.reduce((a, b) => a + b, 0) / n;
  const ec = Math.sqrt(lum.reduce((a, b) => a + (b - moy) * (b - moy), 0) / n);
  const sa = sat.reduce((a, b) => a + b, 0) / n;
  /* ⚠️⚠️ LE SEUIL EST FIXE ET CALÉ SUR LA MÉDIANE, ET LE PREMIER JET ÉTAIT FAUX.
     Il comptait les pixels au-delà de 1,2 ÉCART-TYPE — c'est-à-dire un seuil qui
     se resserre quand l'image s'aplatit. Une pelouse qu'on rendrait uniforme
     verrait donc sa « densité de brins » monter, et le banc applaudirait un
     défaut. C'est exactement le grain du 438 pris pour de la qualité (§« il
     mesure l'inverse de ce qu'on veut »), et je l'ai reproduit en une heure.
     La MÉDIANE est le ton de base d'un sol semé ; ±12 de luminance est le seuil
     à partir duquel une marque se lit comme une marque, quelle que soit la
     dispersion du reste. Ce nombre-là ne bouge pas quand le dessin change. */
  const tri = [...lum].sort((a, b) => a - b);
  const med = tri[tri.length >> 1];
  let sombre = 0, clair = 0;
  for (const L of lum) { if (L < med - 12) sombre++; if (L > med + 12) clair++; }
  return { moy, ec, sat: sa, med, sombre: sombre / n, clair: clair / n, n };
}
const dis = (t) => `L ${t.moy.toFixed(1)} (méd ${t.med.toFixed(0)}) · écart ${t.ec.toFixed(1)} · sat ${(100 * t.sat).toFixed(1)} % · sombres ${(100 * t.sombre).toFixed(1)} % · clairs ${(100 * t.clair).toFixed(1)} %`;

/* ═══════════════ 1. LA RÉFÉRENCE ═════════════════════════════════════════
   Deux zones prélevées dans la maquette de Guillaume, au pixel NATIF (la
   maquette est à la même échelle que la planche : 62 px par case, mesuré sur
   le toit de la maison — 325 px sur la planche, 329 sur la maquette). */
const ref = nativeSheet(path.join(ROOT, "refs", "scene2.png"), { step: STEP2, ox: 0, oy: 0 });
function zoneRef(x0, y0, w, h) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const s = ((y0 + j) * ref.w + (x0 + i)) * 4, d = (j * w + i) * 4;
    px[d] = ref.px[s]; px[d + 1] = ref.px[s + 1]; px[d + 2] = ref.px[s + 2]; px[d + 3] = 255;
  }
  return { px, w, h };
}
/* ⚠️ LA ZONE EST CHOISIE À LA MAIN ET DOIT LE RESTER : il n'y a pas de moyen
   automatique de dire « ici c'est de l'herbe et pas une haie ». Elle est prise
   sous l'escalier, à gauche de la maison, loin du personnage et des massifs.
   ⚠️⚠️ ET ELLE A ÉTÉ RESSERRÉE DE 300 À 205 px APRÈS PREMIÈRE MESURE : le bord
   droit mordait sur la haie et le muret, qui ont versé 1,9 % de gris dans une
   palette d'herbe. Ça ne changeait presque rien à la luminance et ça faussait
   la SATURATION — c'est-à-dire précisément le nombre qu'on est venu chercher.
   *Une zone de référence est une mesure ; elle se vérifie comme une mesure.* */
const HERBE = zoneRef(Math.round(250 / STEP2), Math.round(565 / STEP2),
                      Math.round(205 / STEP2), Math.round(210 / STEP2));
const tRefHerbe = toise(HERBE.px, HERBE.w, HERBE.h);

/* ⚠️⚠️ LE CHEMIN SE PRÉLÈVE SUR LA PLANCHE, PAS SUR LA MAQUETTE, ET LA BRANCHE
   COMPTE. Guillaume emploie le MÊME appareil de pierre pour un mur (la bande
   horizontale sous la maison, vue de face) et pour un sol (la branche verticale
   qui descend, vue de dessus). Prendre le mur pour référence de sol donnerait
   une cible fausse : un parement est éclairé par la tranche, un dallage à plat.
   On prend donc uniquement la branche verticale. */
const planche = nativeSheet(path.join(ROOT, "refs", "planche2.png"), { step: STEP2, ox: 0, oy: 0 });
function zonePlanche(x0, y0, w, h) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const s = ((y0 + j) * planche.w + (x0 + i)) * 4, d = (j * w + i) * 4;
    px[d] = planche.px[s]; px[d + 1] = planche.px[s + 1]; px[d + 2] = planche.px[s + 2]; px[d + 3] = 255;
  }
  return { px, w, h };
}
const CHEMIN = zonePlanche(Math.round(748 / STEP2), Math.round(662 / STEP2),
                           Math.round(88 / STEP2), Math.round(116 / STEP2));
const tRefChemin = toise(CHEMIN.px, CHEMIN.w, CHEMIN.h);

console.log("\n═══ 1. LA RÉFÉRENCE (au pixel natif) ═══");
console.log(`  herbe   ${HERBE.w}×${HERBE.h} natifs   ${dis(tRefHerbe)}`);
console.log(`  chemin  ${CHEMIN.w}×${CHEMIN.h} natifs   ${dis(tRefChemin)}`);

/* ═══════════════ 2. LE JEU ═══════════════════════════════════════════════ */
function duSprite(img) {
  const sh = makeCanvas(img.width, img.height);
  sh.ctx.drawImage(img, 0, 0);
  return { px: sh.px, w: img.width, h: img.height };
}
const gz = duSprite(S.townRoad.grass);
const tJeuHerbe = toise(gz.px, gz.w, gz.h);
const cb = duSprite(S.townRoad.cobble);
const tJeuChemin = toise(cb.px, cb.w, cb.h);
console.log("\n═══ 2. LE JEU (les pavés de 64) ═══");
console.log(`  herbe   ${gz.w}×${gz.h}          ${dis(tJeuHerbe)}`);
console.log(`  chemin  ${cb.w}×${cb.h}          ${dis(tJeuChemin)}`);

/* ═══════════════ 3. L'ÉCART ══════════════════════════════════════════════
   ⚠️ LES SEUILS SONT LARGES ET C'EST VOULU. On ne cherche pas à recopier une
   photo : on cherche que le sol du jeu et celui de la maquette se lisent comme
   la MÊME matière. Un écart de 8 % de luminance ou de 6 points de saturation
   ne se voit pas ; un écart de 25 % de saturation, si — c'est celui qu'on
   corrige, et c'est Guillaume qui l'a vu avant qu'aucun banc ne le mesure. */
console.log("\n═══ 3. L'ÉCART ═══");
const dL = Math.abs(tJeuHerbe.moy - tRefHerbe.moy) / tRefHerbe.moy;
const dS = Math.abs(tJeuHerbe.sat - tRefHerbe.sat);
const dE = Math.abs(tJeuHerbe.ec - tRefHerbe.ec) / tRefHerbe.ec;
ok(dL <= 0.10, "luminance moyenne à moins de 10 %", `${(100 * dL).toFixed(1)} %`);
ok(dS <= 0.07, "saturation à moins de 7 points", `${(100 * dS).toFixed(1)} points`);
ok(dE <= 0.30, "écart-type à moins de 30 %", `${(100 * dE).toFixed(1)} %`);
ok(Math.abs(tJeuHerbe.sombre - tRefHerbe.sombre) <= 0.06,
   "densité de brins sombres à moins de 6 points",
   `jeu ${(100 * tJeuHerbe.sombre).toFixed(1)} % · réf ${(100 * tRefHerbe.sombre).toFixed(1)} %`);
const cL = Math.abs(tJeuChemin.moy - tRefChemin.moy) / tRefChemin.moy;
const cS = Math.abs(tJeuChemin.sat - tRefChemin.sat);
const cE = Math.abs(tJeuChemin.ec - tRefChemin.ec) / tRefChemin.ec;
ok(cL <= 0.10, "chemin · luminance moyenne à moins de 10 %", `${(100 * cL).toFixed(1)} %`);
ok(cS <= 0.07, "chemin · saturation à moins de 7 points", `${(100 * cS).toFixed(1)} points`);
ok(cE <= 0.30, "chemin · écart-type à moins de 30 %", `${(100 * cE).toFixed(1)} %`);
ok(Math.abs(tJeuChemin.sombre - tRefChemin.sombre) <= 0.08,
   "chemin · densité de joints sombres à moins de 8 points",
   `jeu ${(100 * tJeuChemin.sombre).toFixed(1)} % · réf ${(100 * tRefChemin.sombre).toFixed(1)} %`);

/* ═══════════════ 4. LA SORTIE À REGARDER ═════════════════════════════════
   Le pavé du jeu et l'herbe de la maquette, côte à côte, au même agrandissement.
   ⚠️ C'EST LA SORTIE QUI COMPTE. Les quatre nombres ci-dessus disent s'il y a un
   écart ; seule cette image dit s'il est le bon. */
{
  const Z = 6, GAP = 12;
  const W = (gz.w + HERBE.w + cb.w + CHEMIN.w) * Z + GAP * 5;
  const H = Math.max(gz.h, HERBE.h, cb.h, CHEMIN.h) * Z + GAP * 2;
  const sh2 = makeCanvas(W, H), g = sh2.ctx;
  g.fillStyle = "#202024"; g.fillRect(0, 0, W, H);
  const pose = (src, sw, shh, ox) => {
    for (let j = 0; j < shh; j++) for (let i = 0; i < sw; i++) {
      const o = (j * sw + i) * 4;
      if (src[o + 3] < 8) continue;
      g.fillStyle = `rgb(${src[o]},${src[o + 1]},${src[o + 2]})`;
      g.fillRect(ox + i * Z, GAP + j * Z, Z, Z);
    }
  };
  pose(gz.px, gz.w, gz.h, GAP);
  pose(HERBE.px, HERBE.w, HERBE.h, GAP * 2 + gz.w * Z);
  pose(cb.px, cb.w, cb.h, GAP * 3 + (gz.w + HERBE.w) * Z);
  pose(CHEMIN.px, CHEMIN.w, CHEMIN.h, GAP * 4 + (gz.w + HERBE.w + cb.w) * Z);
  writePNG(path.join(OUT, "sol2-jeu-vs-reference.png"), sh2.px, W, H);
  console.log(`\n  sortie : tools/out/sol2-jeu-vs-reference.png (jeu puis reference, herbe puis chemin)`);
}

console.log(fail ? `\n✗ ${fail} écart(s)` : "\n✓ le sol du jeu et celui de la maquette se lisent comme la même matière");
process.exit(fail ? 1 : 0);
