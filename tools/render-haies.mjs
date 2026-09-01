/* =============================================================================
   render-haies.mjs — LA HAIE, SOUS SES SEIZE VISAGES. (2026-09-01)
   -----------------------------------------------------------------------------
   ⚠️⚠️⚠️ IL EXISTE PARCE QUE LA HAIE N'A JAMAIS ÉTÉ REGARDÉE PAR QUOI QUE CE
   SOIT. Elle était dessinée DANS la closure de la boucle de rendu depuis le
   425 : aucun des vingt-et-un bancs de rendu ne pouvait l'appeler. C'est le
   piège n°1 de `CLAUDE.md`, deuxième visage (« il fait vieillir »), sur le
   décor le PLUS répandu de Valley Town — il borne les vingt-sept parcelles, et
   un joueur en longe des centaines de cases par soirée. Le jour où l'on a pu
   la peindre hors du jeu, deux défauts sont tombés en une image :

     · toute haie VERTICALE était un chapelet de buissons détachés (le choix de
       tuile ne lisait que l'ouest et l'est, jamais le nord et le sud) ;
     · les trois tuiles portaient deux ou trois rangées du sprite VOISIN sur la
       planche de référence, répétées tous les 16 px sous toute la haie.

   Ce qu'il mesure, et pourquoi ces grandeurs-là :

     1. LA CONTINUITÉ D'UN AXE. Sur un tronçon de dix cases, horizontal PUIS
        vertical, on compte les colonnes (resp. les rangées) entièrement vides
        À L'INTÉRIEUR du tronçon. Une haie continue n'en a AUCUNE. C'est la
        mesure qui aurait crié dès le 439 : la version d'avant en avait 18 sur
        un tronçon vertical de 10, et 0 sur l'horizontal — soit exactement la
        phrase de Guillaume, en deux nombres.

     2. LA JOINTURE DES ANGLES. Aux quatre angles d'un jardin, on vérifie qu'il
        n'existe aucune rangée ni colonne vide sur la couture entre les deux
        branches. Un angle qui « tient » en apparence peut laisser un liseré
        d'herbe d'un pixel, et c'est tout ce qu'il faut pour que l'œil lise deux
        objets au lieu d'un.

     3. AUCUN ÎLOT DÉTACHÉ. C'est le contrôle qui a nommé les rangées volées à
        la planche : un morceau de dessin qui ne touche pas la masse principale
        est soit une erreur de découpe, soit un débris. On le mesure en
        connexité 8, sur chaque tuile isolée.

     4. LA HAIE EST POSÉE SUR SA CASE. Son ombre portée doit tomber sur la
        DERNIÈRE rangée de la case, comme tout décor de la ville
        (`townPropBox` : `y1 = y + 1`). Le sprite de 20 px du 439 était dessiné
        à `bas − 20` : la haie flottait 4 px au-dessus de son propre sol, et la
        collision, elle, occupait la case entière.

     5. LA MATIÈRE EST LA MÊME SUR LES DEUX AXES. La bande verticale est la
        transposée du tronçon horizontal : leurs palettes doivent être
        IDENTIQUES, ensemble contre ensemble. Un second dessin, même bien fait,
        aurait dérivé au premier retouchage (§8).

     6. ELLE BOUCLE. Deux tuiles verticales empilées doivent se raccorder sans
        couture : on compare la dernière rangée de l'une à la première de
        l'autre en comptant les colonnes où l'une est peinte et l'autre non.

   ⚠️ IL APPELLE `A.drawTownHedgeTile`, c'est-à-dire la fonction que le jeu
   appelle — jamais une recopie du choix de tuile (le stub menteur du §10).

   Usage :  node tools/render-haies.mjs
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme, paletteOf } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fermeEngine"]);
const A = mods.fermeArt, C = mods.fermeConstants, E = mods.fermeEngine;
const S = A.buildSprites();
const T = C.TILE;

let fail = 0;
const ok = (cond, label, detail) => {
  console.log((cond ? "  OK   " : "ÉCHEC  ") + label + (detail ? "  —  " + detail : ""));
  if (!cond) fail++;
};

console.log("\n=== render-haies — la haie de Valley Town ===\n");

/* ---------------------------------------------------------------------------
   UN MONDE DE POCHE. `drawTownHedgeTile` ne lit que `tw.w`, `tw.h` et
   `tw.hedge` : on lui donne exactement ça, ce qui permet de composer n'importe
   quelle figure de haie sans passer par le générateur de la ville. Le vrai
   monde est rejoué plus bas (§7), lui, pour que le banc ne juge pas seulement
   des figures qu'on a choisies.
   ------------------------------------------------------------------------- */
function mini(w, h, cells) {
  const hedge = new Uint8Array(w * h);
  for (const [x, y] of cells) if (x >= 0 && y >= 0 && x < w && y < h) hedge[y * w + x] = 1;
  return { w, h, hedge };
}
function paint(tw, pad = 1) {
  const W = (tw.w + pad * 2) * T, H = (tw.h + pad * 2) * T;
  const sh = makeCanvas(W, H);
  for (let y = 0; y < tw.h; y++) for (let x = 0; x < tw.w; x++) {
    if (!tw.hedge[y * tw.w + x]) continue;
    A.drawTownHedgeTile(sh.ctx, S, tw, x, y, (x + pad) * T, (y + pad) * T);
  }
  return { px: sh.px, W, H, pad };
}
const alphaAt = (im, x, y) => (x < 0 || y < 0 || x >= im.W || y >= im.H) ? 0 : im.px[(y * im.W + x) * 4 + 3];
const colEmpty = (im, x, y0, y1) => { for (let y = y0; y < y1; y++) if (alphaAt(im, x, y) > 8) return false; return true; };
const rowEmpty = (im, y, x0, x1) => { for (let x = x0; x < x1; x++) if (alphaAt(im, x, y) > 8) return false; return true; };

/* ═══════════════════════════════════════════════════════════ 1. LA CONTINUITÉ
   ⚠️ ON MESURE À L'INTÉRIEUR DU TRONÇON, jamais sur toute la planche : les deux
   bouts sont arrondis, donc naturellement plus étroits, et les compter ferait
   échouer un dessin juste. La fenêtre saute une case à chaque extrémité. */
const RUN = 10;
{
  const hz = mini(RUN + 2, 3, Array.from({ length: RUN }, (_, k) => [k + 1, 1]));
  const im = paint(hz);
  const y0 = 1 * T, y1 = 3 * T;
  let holes = 0, worst = -1;
  for (let x = (1 + 1 + 1) * T; x < (1 + RUN) * T; x++) if (colEmpty(im, x, y0, y1)) { holes++; if (worst < 0) worst = x; }
  ok(holes === 0, `tronçon horizontal de ${RUN} cases : aucune colonne vide`, `${holes} colonne(s)` + (worst >= 0 ? `, 1re à x=${worst}` : ""));

  const vt = mini(3, RUN + 2, Array.from({ length: RUN }, (_, k) => [1, k + 1]));
  const iv = paint(vt);
  const x0 = 1 * T, x1 = 3 * T;
  let vholes = 0, vworst = -1;
  for (let y = (1 + 1 + 1) * T; y < (1 + RUN) * T; y++) if (rowEmpty(iv, y, x0, x1)) { vholes++; if (vworst < 0) vworst = y; }
  ok(vholes === 0, `tronçon VERTICAL de ${RUN} cases : aucune rangée vide`, `${vholes} rangée(s)` + (vworst >= 0 ? `, 1re à y=${vworst}` : ""));

  /* ⚠️ ET LA LARGEUR DU TRONÇON VERTICAL DOIT ÊTRE CONSTANTE. Une bande dont la
     largeur respire d'une case à l'autre se lit comme une suite de buissons,
     même sans trou entre eux — c'est la moitié de la plainte de Guillaume que
     le contrôle de trou ne peut pas voir. */
  const widths = new Set();
  for (let y = (2 + 1) * T; y < (1 + RUN) * T; y++) {
    let a = -1, b = -1;
    for (let x = 0; x < iv.W; x++) if (alphaAt(iv, x, y) > 8) { if (a < 0) a = x; b = x; }
    if (a >= 0) widths.add(b - a + 1);
  }
  ok(widths.size <= 2, "la bande verticale garde sa largeur", `${[...widths].sort((p, q) => p - q).join("/")} px`);
}

function islands(im, x0, y0, w, h) {
  const seen = new Uint8Array(w * h);
  let n = 0, biggest = 0;
  for (let sy = 0; sy < h; sy++) for (let sx = 0; sx < w; sx++) {
    if (seen[sy * w + sx] || alphaAt(im, x0 + sx, y0 + sy) <= 8) continue;
    n++;
    let size = 0;
    const st = [[sx, sy]]; seen[sy * w + sx] = 1;
    while (st.length) {
      const [px2, py2] = st.pop(); size++;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = px2 + dx, ny = py2 + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[ny * w + nx]) continue;
        if (alphaAt(im, x0 + nx, y0 + ny) <= 8) continue;
        seen[ny * w + nx] = 1; st.push([nx, ny]);
      }
    }
    biggest = Math.max(biggest, size);
  }
  return { n, biggest };
}
/* ═══════════════════════════════════════════════════════════ 2. LES JOINTURES
   ⚠️⚠️ ON MESURE UN INVARIANT, PAS QUATRE EXEMPLES (leçon du 449). Le premier
   jet comptait les rangées vides dans la case d'angle : il échouait sur un
   dessin JUSTE, parce qu'un corps de 14 px dans une case de 16 laisse deux
   rangées libres en haut — il mesurait le retrait, pas la couture.
   La bonne grandeur est le RECOUVREMENT DE LA COUTURE : pour deux cases de haie
   voisines, on compte les pixels où la dernière ligne de l'une et la première
   de l'autre sont peintes TOUTES LES DEUX. Deux masses qui ne se touchent que
   par un coin sont deux masses ; l'œil le voit avant nous.
   ⚠️ Et on le balaie sur les 839 cases de la VRAIE ville, pas sur un jardin
   qu'on aurait choisi. */
{
  const tw = E.generateTownWorld();
  const at = (x, y) => (x < 0 || y < 0 || x >= tw.w || y >= tw.h) ? 0 : tw.hedge[y * tw.w + x];
  /* Une fenêtre de deux cases, peinte à la demande : peindre la ville entière
     ferait 224×168×256 pixels, soit dix millions — pour une grandeur qui est
     LOCALE par construction. */
  const seam = (x, y, dx, dy) => {
    const w2 = 3 + Math.abs(dx), h2 = 3 + Math.abs(dy);
    const sh = makeCanvas(w2 * T, h2 * T);
    for (let k = -1; k <= 2; k++) for (let j = -1; j <= 2; j++) {
      const cx = x + j, cy = y + k;
      if (at(cx, cy)) A.drawTownHedgeTile(sh.ctx, S, tw, cx, cy, (j + 1) * T, (k + 1) * T);
    }
    const im = { px: sh.px, W: w2 * T, H: h2 * T };
    let n = 0;
    if (dy === 1) {                    // couture horizontale, entre (x,y) et (x,y+1)
      const yA = 2 * T - 1, yB = 2 * T;
      for (let px2 = T; px2 < 2 * T; px2++) if (alphaAt(im, px2, yA) > 8 && alphaAt(im, px2, yB) > 8) n++;
    } else {                           // couture verticale, entre (x,y) et (x+1,y)
      const xA = 2 * T - 1, xB = 2 * T;
      for (let py2 = T; py2 < 2 * T; py2++) if (alphaAt(im, xA, py2) > 8 && alphaAt(im, xB, py2) > 8) n++;
    }
    return n;
  };
  let worstV = 99, worstH = 99, wvAt = "", whAt = "", pairs = 0;
  for (let y = 0; y < tw.h; y++) for (let x = 0; x < tw.w; x++) {
    if (!at(x, y)) continue;
    if (at(x, y + 1)) { pairs++; const n = seam(x, y, 0, 1); if (n < worstV) { worstV = n; wvAt = `(${x},${y})`; } }
    if (at(x + 1, y)) { pairs++; const n = seam(x, y, 1, 0); if (n < worstH) { worstH = n; whAt = `(${x},${y})`; } }
  }
  const MIN = 8;
  ok(worstV >= MIN, `les ${pairs} coutures nord-sud se recouvrent (≥ ${MIN} px)`, `pire ${worstV} px en ${wvAt}`);
  ok(worstH >= MIN, `les coutures est-ouest se recouvrent (≥ ${MIN} px)`, `pire ${worstH} px en ${whAt}`);
}

/* Et le jardin type, celui que le générateur pose vingt-sept fois, doit former
   UNE SEULE masse — c'est la formulation la plus courte de « ça se lit comme
   une clôture », et elle attrape d'un coup les trous, les angles et les bouts. */
{
  const GW = 7, GH = 6, cells = [];
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++)
    if (x === 0 || y === 0 || x === GW - 1 || y === GH - 1) cells.push([x + 1, y + 1]);
  const tw = mini(GW + 2, GH + 2, cells);
  const im = paint(tw);
  const r = islands(im, 0, 0, im.W, im.H);
  ok(r.n === 1, "le jardin clos ne forme qu'une seule masse", `${r.n} îlot(s)`);
  const up = scale(im.px, im.W, im.H, 6);
  writePNG(path.join(OUT, "haies-jardin.png"), up.px, up.W, up.H);
}

/* ═══════════════════════════════════════════════════════════ 3. LES ÎLOTS
   ⚠️ CONNEXITÉ 8, ET SUR UNE TUILE SEULE. C'est ce contrôle qui a nommé les
   trois rangées volées au sprite voisin de la planche : elles ne touchaient pas
   la masse de la haie, donc elles formaient un second îlot — et en jeu, un
   pointillé répété tous les 16 px. */
{
  const cases = [
    ["buisson isolé", mini(3, 3, [[1, 1]])],
    ["bout ouest", mini(4, 3, [[1, 1], [2, 1]])],
    ["bout nord", mini(3, 4, [[1, 1], [1, 2]])],
  ];
  for (const [name, tw] of cases) {
    const im = paint(tw);
    const r = islands(im, T, T, (tw.w - 2 + 1) * T, (tw.h - 2 + 1) * T);
    ok(r.n === 1, `${name} : un seul îlot de pixels`, `${r.n} îlot(s), le plus gros ${r.biggest} px`);
  }
}

/* ═══════════════════════════════════════════════════════════ 4. POSÉE SUR SA CASE
   ⚠️ LA GRANDEUR EST L'OMBRE PORTÉE, PAS LE FEUILLAGE. Une haie qui « touche »
   le bas de sa case par une feuille égarée ne serait pas posée pour autant : ce
   qui dit le sol, c'est la rangée d'ombre, et elle doit être PLEINE. */
{
  const tw = mini(5, 3, [[1, 1], [2, 1], [3, 1]]);
  const im = paint(tw);                         // pad = 1 : la case (2,1) est peinte en (3·T, 2·T)
  const bottom = 3 * T - 1;                     // dernière rangée de la case de haie
  let painted = 0;
  for (let x = 3 * T; x < 4 * T; x++) if (alphaAt(im, x, bottom) > 8) painted++;
  ok(painted >= T - 1, "l'ombre portée occupe la dernière rangée de la case", `${painted}/${T} px`);
  let below = 0;
  for (let y = bottom + 1; y < im.H; y++) for (let x = 0; x < im.W; x++) if (alphaAt(im, x, y) > 8) below++;
  ok(below === 0, "rien n'est peint SOUS la case de la haie", `${below} px`);
}

/* ═══════════════════════════════════════════════════════════ 5. LA MÊME MATIÈRE */
{
  const HG = S.townHedge;
  const grab = (img) => {
    const sh = makeCanvas(img.width, img.height);
    sh.ctx.drawImage(img, 0, 0);
    const set = new Set();
    for (let i = 0; i < img.width * img.height * 4; i += 4)
      if (sh.px[i + 3] > 8) set.add((sh.px[i] << 16) | (sh.px[i + 1] << 8) | sh.px[i + 2]);
    return set;
  };
  const ph = grab(HG.mid), pv = grab(HG.v);
  const same = ph.size === pv.size && [...pv].every((c) => ph.has(c));
  ok(same, "la bande verticale n'invente aucune couleur", `${ph.size} tons à l'horizontale, ${pv.size} à la verticale`);
  ok(HG.v.width === HG.body && HG.v.height === T,
     "la bande verticale fait une case de haut", `${HG.v.width}×${HG.v.height}, corps ${HG.body}`);
}

/* ═══════════════════════════════════════════════════════════ 6. ELLE BOUCLE
   ⚠️ ON COMPARE LES DEUX RANGÉES DE LA COUTURE, PAS LEUR APPARENCE. Deux tuiles
   empilées se raccordent si aucune colonne n'est peinte d'un côté et vide de
   l'autre : c'est la silhouette qui doit être continue, pas la couleur — deux
   feuilles voisines n'ont aucune raison d'avoir le même ton. */
{
  const tw = mini(3, 6, [[1, 1], [1, 2], [1, 3], [1, 4]]);
  const im = paint(tw);
  let breaks = 0;
  for (const seam of [3 * T, 4 * T]) {
    for (let x = T; x < 2 * T; x++) {
      const a = alphaAt(im, x, seam - 1) > 8, b = alphaAt(im, x, seam) > 8;
      if (a !== b) breaks++;
    }
  }
  ok(breaks === 0, "deux cases verticales se raccordent sans couture", `${breaks} colonne(s) en défaut`);
}

/* ═══════════════════════════════════════════════════════════ 7. LA VRAIE VILLE
   ⚠️ ET C'EST LE SEUL §QUI COMPTE VRAIMENT : les six premiers jugent des
   figures qu'on a CHOISIES. Ici on prend la carte que le joueur parcourt, on
   dénombre ce qu'elle contient réellement, et on peint une parcelle entière. */
{
  const tw = E.generateTownWorld();
  let total = 0, solo = 0, vert = 0, horz = 0, corner = 0;
  const at = (x, y) => (x < 0 || y < 0 || x >= tw.w || y >= tw.h) ? 0 : tw.hedge[y * tw.w + x];
  for (let y = 0; y < tw.h; y++) for (let x = 0; x < tw.w; x++) {
    if (!at(x, y)) continue;
    total++;
    const n = at(x, y - 1), s = at(x, y + 1), w = at(x - 1, y), e = at(x + 1, y);
    const v = !!(n || s), h = !!(w || e);
    if (!v && !h) solo++; else if (v && h) corner++; else if (v) vert++; else horz++;
  }
  console.log(`         ${total} cases de haie : ${horz} est-ouest, ${vert} nord-sud, ${corner} angles/tés, ${solo} isolées`);
  ok(vert > 0, "la ville a bien des haies verticales", `${vert} cases, soit ${(100 * vert / total).toFixed(0)} % du linéaire`);
  ok(solo * 20 < total, "les haies isolées restent l'exception", `${solo}/${total}`);

  // Une parcelle réelle, avec son allée percée, peinte comme le jeu la peint.
  const h0 = C.TOWN_HOUSES[0];
  const gx = h0.x - 3, gy = h0.y - 2, gw = C.TOWN_HOUSE_W + 6, gh = C.TOWN_HOUSE_H + 6;
  const W = gw * T, H = gh * T;
  const sh = makeCanvas(W, H);
  sh.ctx.fillStyle = "#6f9a52"; sh.ctx.fillRect(0, 0, W, H);
  for (let y = gy; y < gy + gh; y++) for (let x = gx; x < gx + gw; x++)
    if (at(x, y)) A.drawTownHedgeTile(sh.ctx, S, tw, x, y, (x - gx) * T, (y - gy) * T);
  const up = scale(sh.px, W, H, 5);
  writePNG(path.join(OUT, "haies-parcelle.png"), up.px, up.W, up.H);
  console.log("         planches : tools/out/haies-jardin.png, tools/out/haies-parcelle.png");
}

console.log(`\n${fail === 0 ? "TOUT PASSE" : fail + " ÉCHEC(S)"}\n`);
process.exit(fail ? 1 : 0);
