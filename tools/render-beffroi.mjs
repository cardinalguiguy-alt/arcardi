/* =============================================================================
   render-beffroi.mjs — LE BEFFROI, EN PLAN. (zip 444)
   -----------------------------------------------------------------------------
       node tools/render-beffroi.mjs

   ⚠️⚠️ SA RAISON D'ÊTRE EST LA VUE, ET C'EST EXACTEMENT CE QU'UN CONTRÔLE DE
   CONNEXITÉ NE VOIT PAS. Le 441 l'a écrit noir sur blanc en ouvrant la tribune :
   *« une tribune fermée par un mur reste parfaitement praticable, parfaitement
   connexe, et parfaitement vide de sens »*. Un beffroi sans abat-son serait une
   chambre de pierre au sommet d'un escalier — irréprochable pour `verify-vallee`
   et raté. D'où les quatre ouvertures, et d'où le contrôle 3 de ce banc.

   Ce qu'il mesure, en plus de donner à regarder :

     1. LA CAGE EST FERMÉE ET ENTIÈREMENT PRATICABLE. Aucune poche murée, aucune
        case de plancher qu'on ne puisse fouler, et un palier de vis qui débouche
        VRAIMENT dedans — c'est-à-dire que l'escalier de la tribune monte quelque
        part. ⚠️ Ce contrôle-ci existe parce que le premier jet du 444 avait posé
        la seconde volée sur le MÊME rectangle que la première : la volée
        montante était écrasée par la descendante, on montait à la tribune et on
        ne pouvait plus monter au beffroi. Rien ne levait, et la connexité de la
        tribune restait parfaite.

     2. LA CLOCHE EST DANS LA PASSE DES MURS, PAS DANS CELLE DES DÉCORS. Elle est
        aussi haute qu'un mur ; posée dans la file de tri des props, sa clé de
        tri serait plus grande que celle de tout ce qui est au nord d'elle, donc
        elle recouvrirait le joueur qui se tient devant. C'est le défaut exact du
        buffet d'orgue au 441 — connu d'avance, donc mesuré. *On ne règle pas un
        tri, on change de passe.*

     3. LES QUATRE ABAT-SON VOIENT LA VILLE. Deux cases par face, au milieu de
        chaque face, dérivées du centre — une ouverture décentrée sur une tour
        carrée se voit depuis la place.

     4. LE MOBILIER EST POSÉ, ET RIEN N'A ÉTÉ REFUSÉ EN SILENCE. `addProp` crie,
        `place` décale sans rien dire : le 439 a perdu la statue de la Justice
        pendant un zip entier parce qu'un avertissement qu'aucun contrôle ne
        transforme en échec est un avertissement qu'on apprend à ne plus lire.

   ⚠️ CE QU'IL NE MESURE PAS, ET IL LE DIT :
     · IL NE DESSINE PAS LA VUE PLONGEANTE. La ville vue d'en haut est peinte par
       `drawCourtFrame`, donc dans la closure de la boucle de rendu : la
       redessiner ici serait « un banc qui repeint », et il jugerait sa propre
       maquette sur précisément ce qu'on a construit pour être regardé. Le
       contrôle 3 mesure ce qui est mesurable — que les ouvertures existent, où
       elles sont, et qu'aucun mur ne les bouche. **Le reste se juge à l'écran.**
     · IL NE JOUE PAS LE DUO. Le mini-jeu vit dans le composant ; seul
       `verify-quete` (fenêtre solo, chaîne de chapitres) et une vraie session le
       voient.
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fermeEngine"]);
const A = mods.fermeArt, C = mods.fermeConstants, E = mods.fermeEngine;
const S = A.buildSprites();
const T = 16;
const cw = E.generateCourtWorld();
const K = C.CHURCH;

let fail = 0;
const ok = (cond, label, detail) => {
  console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : ""));
  if (!cond) fail++;
};

const FLOOR_OF = (key) => C.COURT_FLOORS.findIndex((f) => f.key === key);
const LOFT = FLOOR_OF("churchLoft"), TOWER = FLOOR_OF("churchTower");
const W = C.COURT_FLOOR_W, H = C.COURT_FLOOR_H;
const y0 = E.courtFloorY0(TOWER);
const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? C.CT_VOID : cw.tile[(y0 + y) * cw.w + x]);
/* « Où l'on peut se tenir », UNE définition, réutilisée par tous les contrôles.
   Deux écritures de la même règle donnent un banc qui échoue sur du bon travail
   — et corriger ce qui n'a rien est plus coûteux que de rater un défaut. */
const stands = (t) => t !== C.CT_VOID && t !== C.CT_WALL && t !== C.CT_WINDOW && t !== C.CT_BARS;

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║  LE BEFFROI DE VALLEY TOWN — zip 444                          ║");
console.log("╚══════════════════════════════════════════════════════════════╝");
console.log(`\nNiveau ${TOWER} (« churchTower », alt ${C.COURT_FLOORS[TOWER].alt}), tourelle x = ${K.x0}…${K.x0 + K.towerW - 1}.`);

/* ─────────────────────────────────────────────────────────────────────────────
   LA PLANCHE. ⚠️ ON APPELLE LES MÊMES FONCTIONS DE SOL QUE LE JEU (le parquet
   d'intérieur, la dalle d'église) : un banc qui repeint juge sa propre maquette
   (439). Ce qui est peint ici l'est par `fermeArt`, ligne pour ligne.
   ⚠️ ET LA CLOCHE EST PEINTE AVEC LES MURS, comme dans le jeu — c'est le sujet
   du contrôle 2, et le montrer autrement ici serait mentir sur ce qu'on mesure.
   ─────────────────────────────────────────────────────────────────────────── */
const FLAT = {
  [C.CT_EXIT]: "#f0e6c4", [C.CT_DOOR]: "#a89880", [C.CT_WALL]: "#5f6068",
  [C.CT_BARS]: "#43444c", [C.CT_VOID]: "#12131a",
};
/* ⚠️ ON CADRE SUR LA TOURELLE, PAS SUR LE NIVEAU. Un niveau d'intérieur fait la
   largeur du tribunal ; le beffroi occupe dix cases dans un coin, et une planche
   au format du niveau serait 90 % de vide autour du sujet — c'est-à-dire une
   planche qu'on n'ouvre plus. Le cadrage est DÉRIVÉ de ce qui est peint (la
   tourelle plus trois cases de marge), jamais écrit à la main : le jour où la
   tour se déplace, la vignette la suit. */
const CROP = (() => {
  let x0 = W, x1 = 0, yy0 = H, yy1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = at(x, y);
    if (t === C.CT_VOID) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); yy0 = Math.min(yy0, y); yy1 = Math.max(yy1, y);
  }
  const M = 2;
  return { x0: Math.max(0, x0 - M), x1: Math.min(W - 1, x1 + M), y0: Math.max(0, yy0 - M), y1: Math.min(H - 1, yy1 + M) };
})();
{
  const CW2 = CROP.x1 - CROP.x0 + 1, CH2 = CROP.y1 - CROP.y0 + 1;
  const sh = makeCanvas(CW2 * T, CH2 * T);
  const off = (x, y) => [(x - CROP.x0) * T, (y - CROP.y0) * T];
  for (let y = CROP.y0; y <= CROP.y1; y++) for (let x = CROP.x0; x <= CROP.x1; x++) {
    const t = at(x, y), [px, py] = off(x, y);
    // ⚠️ Coordonnées ABSOLUES (y0 + y), comme le jeu : le calepinage est calé
    // sur la carte, pas sur la vignette (le tapis en tartan du 439).
    if (t === C.CT_WOOD) A.drawCourtWoodTile(sh.ctx, x, y0 + y, px, py, T);
    else if (t === C.CT_STONE) A.drawChurchFlagTile(sh.ctx, x, y0 + y, px, py, T, 0);
    else if (t === C.CT_MARBLE) A.drawCourtMarbleTile(sh.ctx, x, y0 + y, px, py, T);
    else if (t === C.CT_STAIR_UP || t === C.CT_STAIR_DOWN) {
      sh.ctx.fillStyle = "#b8b4ab"; sh.ctx.fillRect(px, py, T, T);
      for (let s2 = 0; s2 < 4; s2++) {
        sh.ctx.fillStyle = "rgba(255,255,255,0.22)"; sh.ctx.fillRect(px, py + s2 * 4, T, 1);
        sh.ctx.fillStyle = "rgba(58,54,48,0.30)"; sh.ctx.fillRect(px, py + s2 * 4 + 3, T, 1);
      }
    } else { sh.ctx.fillStyle = FLAT[t] || "#ff00ff"; sh.ctx.fillRect(px, py, T, T); }
  }
  const WALL_H = 10;
  for (let y = CROP.y0; y <= CROP.y1; y++) for (let x = CROP.x0; x <= CROP.x1; x++) {
    const t = at(x, y); if (t !== C.CT_WALL && t !== C.CT_WINDOW) continue;
    const [px, py] = off(x, y);
    sh.ctx.fillStyle = "#8e8a80"; sh.ctx.fillRect(px, py - WALL_H, T, T + WALL_H);
    sh.ctx.fillStyle = "#a5a196"; sh.ctx.fillRect(px, py - WALL_H, T, 4);
    /* ⚠️ UN ABAT-SON N'EST PAS UN VITRAIL : il est OUVERT. On le peint donc en
       ciel, pas en verre coloré — c'est ce qui fait qu'on comprend d'un coup
       d'œil, sur la planche, que la tour est percée aux quatre vents. */
    if (t === C.CT_WINDOW) {
      sh.ctx.fillStyle = "#2c4668"; sh.ctx.fillRect(px + 1, py - WALL_H + 3, T - 2, WALL_H + T - 6);
      for (let s2 = 0; s2 < 4; s2++) { sh.ctx.fillStyle = "#6a6258"; sh.ctx.fillRect(px + 1, py - WALL_H + 4 + s2 * 5, T - 2, 2); }
    }
  }
  const q = [];
  for (const p of cw.props) {
    if (p.y < y0 || p.y >= y0 + H) continue;
    const img = S.courtProps[p.kind];
    if (!img) { console.warn(`  ⚠️  sprite manquant : « ${p.kind} »`); continue; }
    const [ppx, ppy] = off(p.x, p.y - y0 + 1);
    q.push({ by: ppy, fn: () => sh.ctx.drawImage(img, ppx + T / 2 - img.width / 2, ppy - img.height) });
  }
  q.sort((a, b) => a.by - b.by);
  for (const e of q) e.fn();
  const up = scale(sh.px, CW2 * T, CH2 * T, 4);
  writePNG(path.join(OUT, "beffroi-plan.png"), up.px, up.W, up.H);
  console.log(`\n→ tools/out/beffroi-plan.png  (cadre x ${CROP.x0}…${CROP.x1}, y ${CROP.y0}…${CROP.y1})\n`);
}

/* ─────────────────────────────────────────────────────────────────────────────
   1. LA CAGE EST FERMÉE, PRATICABLE, ET L'ESCALIER Y DÉBOUCHE.
   ─────────────────────────────────────────────────────────────────────────── */
console.log("=== 1. la cage est fermée, praticable, et l'escalier y débouche ===\n");
let floorTiles = 0, start = null;
{
  const walls = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = at(x, y);
    if (stands(t)) { floorTiles++; if (!start) start = [x, y]; }
    else if (t === C.CT_WALL) walls.push(1);
  }
  ok(floorTiles > 20, "le beffroi a un plancher", `${floorTiles} cases foulables`);
  ok(walls.length > 20, "…entouré de murs", `${walls.length} cases de mur`);
  /* Connexité INTERNE : aucune poche murée. */
  const seen = new Set();
  if (start) {
    const q = [start]; seen.add(start[1] * W + start[0]);
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(k)) continue;
        if (!stands(at(nx, ny))) continue;
        seen.add(k); q.push([nx, ny]);
      }
    }
  }
  ok(seen.size === floorTiles, "⚠️ aucune poche murée", `${seen.size}/${floorTiles} cases atteintes`);
  /* ⚠️⚠️ ET L'ESCALIER MONTE VRAIMENT ICI. C'est le contrôle qui aurait attrapé
     le défaut de la seconde volée écrasée : la cage `{a: 6, b: 7}` doit exister,
     ses cases doivent être des MARCHES sur ce niveau, et elles doivent toucher
     le plancher du beffroi. Une volée qui n'existe que dans la table est un
     escalier qu'on voit, qu'on foule, et qui ne va nulle part. */
  const sw = C.COURT_STAIRWELLS.find(s => (s.a === LOFT && s.b === TOWER) || (s.a === TOWER && s.b === LOFT));
  ok(!!sw, "une cage relie la tribune au beffroi", sw ? `x ${sw.x}…${sw.x + sw.w - 1}, y ${sw.y}…${sw.y + sw.h - 1}` : "AUCUNE");
  if (sw) {
    let steps = 0, touching = 0;
    for (let y = sw.y; y < sw.y + sw.h; y++) for (let x = sw.x; x < sw.x + sw.w; x++) {
      const t = at(x, y);
      if (t === C.CT_STAIR_UP || t === C.CT_STAIR_DOWN) {
        steps++;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const t2 = at(x + dx, y + dy);
          if (t2 === C.CT_WOOD || t2 === C.CT_STONE || t2 === C.CT_MARBLE) { touching++; break; }
        }
      }
    }
    ok(steps > 0, "⚠️ …et ses marches existent RÉELLEMENT sur ce niveau", `${steps} case(s) de volée`);
    ok(touching > 0, "⚠️ …et elles touchent le plancher du beffroi", `${touching} marche(s) au contact`);
    /* ⚠️ LES DEUX VOLÉES DE LA TOURELLE NE PARTAGENT PAS UN RECTANGLE. C'est le
       défaut exact du premier jet, figé ici pour de bon. */
    const other = C.COURT_STAIRWELLS.find(s => (s.a === 5 && s.b === LOFT) || (s.a === LOFT && s.b === 5));
    const overlap = other && !(sw.x + sw.w <= other.x || other.x + other.w <= sw.x
                            || sw.y + sw.h <= other.y || other.y + other.h <= sw.y);
    ok(!overlap, "⚠️ …et les deux volées de la tourelle ne se recouvrent PAS",
      overlap ? "la volée montante est écrasée par la descendante" : "rectangles disjoints");
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. LA CLOCHE EST DANS LA PASSE DES MURS.
   ⚠️ ON NE PEUT PAS MESURER UNE PASSE DE RENDU DEPUIS ICI (elle vit dans la
   closure de la boucle) ; ce qu'on mesure, ce sont les DEUX conséquences qui
   rendraient le défaut possible : la cloche est un prop SOLIDE (donc on ne passe
   pas dedans) et elle est ADOSSÉE au nord, contre le mur, pas au milieu du
   plancher. Un décor aussi haut qu'un mur planté au centre serait un décor qui
   avale ce qui passe devant, quelle que soit la passe qui le peint.
   ─────────────────────────────────────────────────────────────────────────── */
console.log("\n=== 2. la cloche pend d'une poutre, contre le mur, et elle bloque ===\n");
{
  const props = cw.props.filter(p => p.y >= y0 && p.y < y0 + H);
  const bell = props.find(p => p.kind === "greatBell");
  const bell2 = props.find(p => p.kind === "greatBell2");
  const frames = props.filter(p => p.kind === "bellFrame");
  ok(!!bell && !!bell2, "la cloche fait bien deux cases", bell && bell2 ? `(${bell.x},${bell.y - y0}) + (${bell2.x},${bell2.y - y0})` : "MANQUANTE");
  ok(frames.length === 2, "…et elle pend d'une poutre qui traverse la tour", `${frames.length} portique(s)`);
  if (bell && bell2 && frames.length === 2) {
    ok(bell.y === bell2.y && frames.every(f => f.y === bell.y),
      "⚠️ la cloche et sa poutre sont sur la MÊME rangée", `rangée ${bell.y - y0}`);
    const lx = Math.min(...frames.map(f => f.x)), rx = Math.max(...frames.map(f => f.x));
    ok(bell.x > lx && bell.x < rx && bell2.x > lx && bell2.x < rx,
      "…et la cloche est ENTRE les deux portiques", `${lx} < ${Math.min(bell.x, bell2.x)}…${Math.max(bell.x, bell2.x)} < ${rx}`);
    /* Adossée au nord : la rangée de la poutre doit être dans la moitié HAUTE de
       la cage, sans quoi un sprite haut coupe la pièce en deux à l'écran. */
    let top = H, bot = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (stands(at(x, y))) { top = Math.min(top, y); bot = Math.max(bot, y); }
    ok(bell.y - y0 <= top + Math.floor((bot - top) / 2), "⚠️ …et elle est ADOSSÉE AU NORD, pas plantée au milieu",
      `rangée ${bell.y - y0} sur ${top}…${bot}`);
  }
  if (bell) {
    ok(!!cw.solid[bell.y * cw.w + bell.x], "⚠️ la cloche BLOQUE (on tourne autour, on ne la traverse pas)");
    /* ⚠️ ET ELLE NE BOUCHE AUCUNE VOLÉE : c'est le refus qu'a émis le garde-fou
       des portes au premier jet, et on l'a écouté plutôt que de le désarmer. */
    let stairNear = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const t = at(bell.x + dx, bell.y - y0 + dy);
      if (t === C.CT_STAIR_UP || t === C.CT_STAIR_DOWN) stairNear++;
    }
    ok(stairNear === 0, "⚠️ …et elle ne bouche aucune volée", `${stairNear} marche(s) collée(s)`);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. ⚠️⚠️ LES QUATRE ABAT-SON. LA RAISON D'ÊTRE DU NIVEAU.
   ─────────────────────────────────────────────────────────────────────────── */
console.log("\n=== 3. les quatre abat-son ouvrent sur les quatre vents ===\n");
{
  let top = H, bot = 0, left = W, right = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    if (at(x, y) === C.CT_WALL || stands(at(x, y))) { top = Math.min(top, y); bot = Math.max(bot, y); left = Math.min(left, x); right = Math.max(right, x); }
  const faces = { nord: 0, sud: 0, ouest: 0, est: 0 };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (at(x, y) !== C.CT_WINDOW) continue;
    if (y === top) faces.nord++;
    else if (y === bot) faces.sud++;
    else if (x === left) faces.ouest++;
    else if (x === right) faces.est++;
  }
  for (const [nm, n] of Object.entries(faces))
    ok(n >= 2, `la face ${nm} est percée`, `${n} case(s) de baie`);
  /* ⚠️ ET ELLES SONT AU MILIEU DE LEUR FACE. Une ouverture décentrée sur une
     tour carrée se voit depuis la place — c'est le §8 (« une position réglée à
     la main penchera »), appliqué à ce qu'on regarde de plus loin dans le jeu. */
  const centred = (list, lo, hi) => {
    if (!list.length) return false;
    const mid = (lo + hi) / 2, c = (Math.min(...list) + Math.max(...list)) / 2;
    return Math.abs(c - mid) <= 1;
  };
  const colsN = [], colsS = [], rowsW = [], rowsE = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (at(x, y) !== C.CT_WINDOW) continue;
    if (y === top) colsN.push(x); else if (y === bot) colsS.push(x);
    else if (x === left) rowsW.push(y); else if (x === right) rowsE.push(y);
  }
  ok(centred(colsN, left, right) && centred(colsS, left, right), "⚠️ les baies nord et sud sont centrées",
    `nord ${colsN.join(",")} · sud ${colsS.join(",")} · face ${left}…${right}`);
  ok(centred(rowsW, top, bot) && centred(rowsE, top, bot), "⚠️ …et les baies est et ouest aussi",
    `ouest ${rowsW.join(",")} · est ${rowsE.join(",")} · face ${top}…${bot}`);
  /* Une baie BLOQUE le pas et ne bouche pas le regard : c'est la seule forme qui
     donne la vue sans donner le vide. Un trou praticable au sommet d'une tour
     est une chute ; un mur plein est une cave. */
  let solidAll = true;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    if (at(x, y) === C.CT_WINDOW && !cw.solid[(y0 + y) * cw.w + x]) solidAll = false;
  ok(solidAll, "⚠️ un abat-son bloque le pas (on ne tombe pas de la tour)");
  console.log("\n  ····   hors mesure : la VILLE VUE D'EN HAUT à travers ces baies. Elle est");
  console.log("         peinte par `drawCourtFrame`, dans la closure de la boucle de rendu ;");
  console.log("         la redessiner ici, ce serait juger notre propre maquette (439).");
  console.log("         **Ça se regarde à l'écran, et c'est déclaré parce que c'est gênant.**");
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. LE MOBILIER : POSÉ, DESSINABLE, ET RIEN N'A ÉTÉ REFUSÉ EN SILENCE.
   ─────────────────────────────────────────────────────────────────────────── */
console.log("\n=== 4. le beffroi est meublé, et tout ce qui est posé est dessinable ===\n");
{
  const props = cw.props.filter(p => p.y >= y0 && p.y < y0 + H);
  for (const kind of ["greatBell", "greatBell2", "bellFrame", "ringerBoard"])
    ok(props.some(p => p.kind === kind), `« ${kind} » est posé`,
      props.filter(p => p.kind === kind).map(p => `(${p.x},${p.y - y0})`).join(" ") || "ABSENT");
  const miss = [...new Set(props.filter(p => !S.courtProps[p.kind]).map(p => p.kind))];
  ok(miss.length === 0, "⚠️ chaque décor du beffroi a un sprite", miss.join(" ") || `${props.length} décors, 0 manquant`);
  const out2 = props.filter(p => p.x < K.x0 || p.x >= K.x0 + K.towerW);
  ok(out2.length === 0, "aucun décor hors de la tourelle", out2.map(p => `${p.kind}(${p.x})`).join(" ") || "0 hors murs");
  /* La densité, comme pour la nef (439) : habité sans être encombré. Une cage de
     clocher est petite, donc le rapport compte et pas le nombre. */
  const d = floorTiles ? (100 * props.length) / (floorTiles + props.length) : 0;
  ok(d >= 5 && d <= 40, "densité de mobilier", `${d.toFixed(1)} meubles / 100 cases (${props.length} décors, ${floorTiles} libres)`);
}

console.log(fail === 0 ? "\n✅ Tous les contrôles passent.\n" : `\n❌ ${fail} contrôle(s) en échec.\n`);
process.exit(fail === 0 ? 0 : 1);
