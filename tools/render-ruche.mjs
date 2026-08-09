/* =============================================================================
   render-ruche.mjs — LA RUCHE ET L'ÉTABLI DE L'APICULTEUR. (zip suivant)
   -----------------------------------------------------------------------------
   ⚠️⚠️ CE BANC EXISTE PARCE QUE L'ÉTABLI A QUATRE ÉTATS ET QU'AUCUN NE SE VOIT
   EN LISANT LE CODE. L'enfumoir n'est là que si René n'est pas en combi, les
   pots que s'il y a du miel : les combinaisons possibles sont donc « table nue »,
   « table + enfumoir », « table + pots », « les deux ». Trois d'entre elles ne
   s'obtiennent en jeu qu'en attendant le bon moment de la journée de René —
   c'est-à-dire jamais, à la relecture.

   ⚠️ ET LA SCÈNE EST MONTRÉE DANS L'ORDRE DU JEU : l'établi À GAUCHE de la
   ruche, sur la MÊME ligne de sol, à la MÊME échelle de dessin
   (ARTISAN_DRAW_SCALE) — un décor ne se juge pas isolé, il se juge à sa place
   (leçon du 431 sur la rangée d'étals). Une fermière est posée à côté : c'est le
   seul repère d'échelle invariant du jeu (voir render-echelle.mjs).

   Usage :  node tools/render-ruche.mjs
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt"]);
const A = mods.fermeArt;
const C = mods.fermeConstants;
const S = A.buildSprites();

const CHAR = S.getChar("f", 1, false, false, false, false, false, false, null);
const SC = C.ARTISAN_DRAW_SCALE;
const FOOT = C.ARTISAN_FOOT.beehive;

/* Une scène = la ruche + l'établi dans un état donné. Le placement recopie
   EXACTEMENT celui de FermeGame (ligne de sol commune, table collée à gauche
   avec 3 px de recouvrement) : un banc qui place autrement ne prouve rien. */
function scene(g, ox, groundY, smoker, honey) {
  const hive = S.artisan.beehive, bt = S.beeTable;
  const hw = hive.width * SC, hh = hive.height * SC;
  const leftX = ox, topY = groundY - FOOT * SC;
  const tw = bt.table.width * SC, th = bt.table.height * SC;
  const tx = Math.round(leftX - tw + 3 * SC), ty = Math.round(groundY - th + 1);
  g.drawImage(bt.table, tx, ty, Math.round(tw), Math.round(th));
  if (smoker) g.drawImage(bt.smoker, tx, ty, Math.round(tw), Math.round(th));
  if (honey) g.drawImage(bt.honey, tx, ty, Math.round(tw), Math.round(th));
  g.drawImage(hive, Math.round(leftX), Math.round(topY), Math.round(hw), Math.round(hh));
  // La lavande, à DROITE : côté opposé à l'établi (voir beeLavenderSprite).
  const lv = S.beeLavender, lw = lv.width * SC, lh = lv.height * SC;
  g.drawImage(lv, Math.round(leftX + hw - 2 * SC), Math.round(groundY - lh + 1), Math.round(lw), Math.round(lh));
  return { left: tx, right: leftX + hw + lw };
}

const CASES = [
  ["nue (René en combi, pas de miel)", false, false],
  ["enfumoir (René au repos)", true, false],
  ["pots (du miel en stock)", false, true],
  ["les deux", true, true],
];

const CW = 100, CH = 60, GROUND = 48;
const sh = makeCanvas(CW * CASES.length, CH + 14);
const ctx = sh.ctx;
ctx.fillStyle = "#4c8f40"; ctx.fillRect(0, 0, sh.width, sh.height);
ctx.fillStyle = "#3f7a35"; ctx.fillRect(0, GROUND, sh.width, sh.height - GROUND);
CASES.forEach(([label, sm, ho], i) => {
  const ox = i * CW + 42;
  scene(ctx, ox, GROUND, sm, ho);
  // La fermière, même ligne de sol : le repère d'échelle.
  ctx.drawImage(CHAR, 0, 0, 16, 24, ox + 52, GROUND - 23, 16, 24);
  /* ⚠️ PAS DE `fillText` ICI, ET CE N'EST PAS UN OUBLI : le faux canvas ne le
     connaît pas (§10), un banc qui l'appelle ne rend plus rien du tout. Les cas
     sont donc repérés par un TÉMOIN de couleur sous chaque case, dans l'ordre du
     tableau CASES ci-dessus. */
  ctx.fillStyle = ["#000000", "#8fa6b4", "#f2c94b", "#ffffff"][i];
  ctx.fillRect(i * CW + CW / 2 - 8, CH + 4, 16, 4);
});
{ const up = scale(sh.px, sh.width, sh.height, 5); writePNG(path.join(OUT, "ruche-etabli.png"), up.px, up.W, up.H); }

/* Gros plan sur la ruche seule : c'est là qu'on juge les assises de paille,
   l'entrée décentrée et la planche d'envol — invisibles à l'échelle du jeu. */
const zoom = makeCanvas(28, 32);
zoom.ctx.drawImage(S.artisan.beehive, 0, 0);
{ const up = scale(zoom.px, zoom.width, zoom.height, 12); writePNG(path.join(OUT, "ruche-gros-plan.png"), up.px, up.W, up.H); }

const z2 = makeCanvas(22 * 4 + 8, 22);
z2.ctx.drawImage(S.beeTable.table, 0, 2);
z2.ctx.drawImage(S.beeTable.table, 24, 2); z2.ctx.drawImage(S.beeTable.smoker, 24, 2);
z2.ctx.drawImage(S.beeTable.table, 48, 2); z2.ctx.drawImage(S.beeTable.honey, 48, 2);
z2.ctx.drawImage(S.beeLavender, 74, 2);
{ const up = scale(z2.px, z2.width, z2.height, 12); writePNG(path.join(OUT, "etabli-gros-plan.png"), up.px, up.W, up.H); }


/* ╔══════════════════════════════════════════════════════════════════════════
   ║ LE VOL DES ABEILLES, PHASE PAR PHASE. (demande de Guillaume : « le vol des
   ║ abeilles doit parfois passer DERRIÈRE le sprite de la ruche »)
   ╚══════════════════════════════════════════════════════════════════════════
   ⚠️ CE N'EST PAS UNE ANIMATION QU'ON REGARDE, C'EST UN ORDRE DE DESSIN QU'ON
   VÉRIFIE. Six instants du cycle sont rendus côte à côte, avec la MÊME formule
   que FermeGame (profondeur = sin du même angle que l'abscisse) : on doit voir
   les abeilles disparaître derrière le dôme sur la moitié du cycle et
   réapparaître devant sur l'autre. Un cadre où elles sont TOUJOURS visibles est
   un échec, et il ne lèverait aucune erreur. */
{
  const hive = S.artisan.beehive;
  const hw = hive.width * SC, hh = hive.height * SC;
  const PH = 6, CWb = 56, GROUNDb = 42;
  const b2 = makeCanvas(CWb * PH, GROUNDb + 8);
  b2.ctx.fillStyle = "#4c8f40"; b2.ctx.fillRect(0, 0, b2.width, b2.height);
  let derriere = 0, devant = 0;
  for (let p2 = 0; p2 < PH; p2++) {
    const t = p2 * 0.52, ox = p2 * CWb + 14;
    const bcx = ox + hw / 2, bby = GROUNDb;
    const bees = [];
    for (let b = 0; b < 4; b++) {
      const a = t * 2 + b * 1.6;
      bees.push({ x: bcx + Math.cos(a) * 13 * SC,
                  y: bby - 20 * SC + Math.sin(a) * 4 * SC + Math.sin(t * 5 + b * 2.1) * 3 * SC,
                  behind: Math.sin(a) < 0 });
    }
    const paint = (be) => { b2.ctx.fillStyle = "#3a2a10"; b2.ctx.fillRect(Math.round(be.x), Math.round(be.y), 2, 2);
                            b2.ctx.fillStyle = "#e8c24a"; b2.ctx.fillRect(Math.round(be.x), Math.round(be.y), 1, 1); };
    for (const be of bees) if (be.behind) { paint(be); derriere++; }
    b2.ctx.drawImage(hive, Math.round(ox), Math.round(bby - FOOT * SC), Math.round(hw), Math.round(hh));
    for (const be of bees) if (!be.behind) { paint(be); devant++; }
  }
  const up = scale(b2.px, b2.width, b2.height, 6);
  writePNG(path.join(OUT, "ruche-abeilles.png"), up.px, up.W, up.H);
  console.log("   abeilles : " + derriere + " passages derrière, " + devant + " devant (sur " + (PH * 4) + ")");
  if (!derriere || !devant) { console.error("❌ le vol ne passe jamais d'un côté : la profondeur n'est pas dérivée."); process.exit(1); }
}

console.log("→ tools/out/ruche-etabli.png, ruche-gros-plan.png, etabli-gros-plan.png, ruche-abeilles.png");
