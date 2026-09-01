/* =============================================================================
   verify-collision.mjs — OÙ S'ARRÊTE-T-ON, VU DES QUATRE CÔTÉS. (2026-09-01)
   -----------------------------------------------------------------------------
   ⚠️⚠️⚠️ IL EXISTE PARCE QU'AUCUN DES QUARANTE ET UN AUTRES BANCS NE MESURAIT LA
   SEULE GRANDEUR QUI COMPTE ICI. Tous vérifient qu'une case solide REFUSE le
   pas — ce qui a toujours été vrai — et aucun ne demandait **à quelle distance
   du dessin** le pas est refusé. C'est une dix-septième forme du « banc qui
   passe » de `CLAUDE.md` : *il mesure qu'une chose est refusée, jamais OÙ elle
   l'est.* Guillaume l'a dit avant le banc : « la collision avec les haies est
   impossible, il faut la revoir sous les 4 angles ».

   Ce qui était mesuré le jour où ce fichier a été écrit, contre une haie :

        vers le NORD   −15,0 px   (une case entière d'herbe entre les pieds et la haie)
        vers le SUD     +9,4 px   (on entrait DANS la haie)
        vers l'OUEST    −7,2 px
        vers l'EST      +3,2 px

   Deux directions laissaient un vide, deux autres traversaient : c'est la
   signature d'une semelle qui n'est pas sous les pieds. Elle l'est depuis
   (`C.bodyPoints`), et ce banc est là pour qu'elle y reste.

   Ce qu'il mesure, et pourquoi ces grandeurs-là :

     1. LES QUATRE ÉCARTS, EN PIXELS, contre chaque famille d'obstacle de la
        carte : haie, mur de bâtiment, eau, falaise (le relief), et le tablier
        des ponts. On approche pour de vrai, pas à pas, à la vitesse du jeu,
        jusqu'au refus — puis on mesure entre l'OMBRE PORTÉE du personnage
        (c'est elle qui dit où il se tient) et le bord de la case d'obstacle.
        ⚠️ Le critère est la SYMÉTRIE avant la valeur : un écart de 3 px partout
        est un jeu qui se tient ; 0 d'un côté et 15 de l'autre est un jeu qui
        ment, même si les deux nombres sont « petits ».

     2. LA SEMELLE TIENT DANS SA CASE quand l'ancre est entière. C'est
        l'invariant qui rend la navigation possible : sans lui, se tenir dans la
        case voisine d'un mur est impossible d'un côté et gratuit de l'autre.

     3. LE VA-ET-VIENT CASE ↔ ANCRE EST EXACT. `bodyFootTile(tileAnchor(t))`
        doit rendre `t`, sur toute la carte. C'est ce qui relie le pathfinder à
        la collision — et c'est en le cassant, sans le savoir, qu'on a rendu
        114 des 146 endroits de la ville inatteignables pendant dix minutes.

     4. UN PASSAGE D'UNE CASE RESTE FRANCHISSABLE. La ville en a vingt-sept
        (l'allée percée dans la haie de chaque parcelle) : on balaie l'alignement
        et on exige une marge de manœuvre.

     5. LE JEU ET LE MOTEUR RÉPONDENT LA MÊME CHOSE. `C.bodyPoints` est lu des
        deux côtés depuis ce jour ; on le vérifie quand même sur 20 000 points,
        parce que « deux réponses justes séparément » est le piège n°8 de
        l'en-tête de `CLAUDE.md` et qu'il a coûté un mur invisible.

     6. ON NE RESTE PAS COINCÉ. Toute position de la carte, même refusée, doit
        laisser sortir — c'est la trappe de dégagement (`townStepOk`), et elle
        se vérifie en partant de cases interdites.

   Usage :  node tools/verify-collision.mjs
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeEngine"]);
const C = mods.fermeConstants, E = mods.fermeEngine;
const T = C.TILE;

let fail = 0;
const ok = (cond, label, detail) => {
  console.log((cond ? "  OK   " : "ÉCHEC  ") + label + (detail ? "  —  " + detail : ""));
  if (!cond) fail++;
};
console.log("\n=== verify-collision — où s'arrête-t-on, vu des quatre côtés ===\n");

const tw = E.generateTownWorld();
const W = tw.w, H = tw.h;
const idx = (x, y) => y * W + x;

/* ---------------------------------------------------------------------------
   LE REFUS, TEL QUE LE JEU LE POSE. ⚠️ On n'écrit PAS une copie de la boîte :
   les quatre points viennent de `C.bodyPoints`, la source que `canStandTown`,
   `townBoxFree` et `verify-vallee` lisent tous. Ce qu'on recopie ici, et c'est
   assumé, c'est la liste des cases qui bloquent — elle vit dans la closure du
   rendu (`blockedTown`) et aucun banc ne peut l'appeler. `E.townNav` en est le
   pendant moteur, plus pessimiste d'une souche : on s'en sert, et le §5 vérifie
   que les deux répondent la même chose.
   ------------------------------------------------------------------------- */
const nav = E.townNav(tw);
const tileFree = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !!nav.walk[idx(x, y)];
const elevAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : tw.elev[idx(x, y)];
function canStand(x, y, fromE) {
  for (const [px, py] of C.bodyPoints(x, y)) {
    const fx = Math.floor(px), fy = Math.floor(py);
    if (!tileFree(fx, fy)) return false;
    if (fromE !== undefined && Math.abs(elevAt(fx, fy) - fromE) > C.TOWN_STEP_MAX) return false;
  }
  return true;
}

/* ═══════════════════════════════════════════════ 1. LES QUATRE ÉCARTS
   ⚠️ ON APPROCHE, ON NE CALCULE PAS. Un écart déduit d'une formule mesurerait
   la formule ; ici on part de quatre cases plus loin, on avance à la vitesse du
   jeu, image par image, jusqu'au refus — exactement comme un joueur qui pousse
   la touche jusqu'au bout. C'est le seul protocole qui attrape aussi les pas
   qui s'arrêtent trop tôt POUR UNE AUTRE RAISON que la boîte. */
const DIRS = [
  { key: "nord",  name: "en marchant vers le NORD",  vx: 0, vy: -1 },
  { key: "sud",   name: "en marchant vers le SUD",   vx: 0, vy: 1 },
  { key: "ouest", name: "en marchant vers l'OUEST",  vx: -1, vy: 0 },
  { key: "est",   name: "en marchant vers l'EST",    vx: 1, vy: 0 },
];
const DT = 1 / 60, SPD = C.PLAYER_SPEED;

/* L'écart, en pixels d'écran, entre l'OMBRE PORTÉE du personnage (l'endroit où
   le joueur se voit poser le pied) et le bord de la case d'obstacle.
   Positif = il reste de l'herbe entre les deux. Négatif = on chevauche. */
function gapPx(dir, x, y, ox, oy) {
  const cx = C.footX(x) * T, cy = C.footY(y) * T;      // centre de l'ombre, en px
  const rx = 6, ry = C.CHAR_SHADOW_RY;                 // ses rayons (voir drawCharacter)
  if (dir.key === "nord")  return (cy - ry) - (oy + 1) * T;
  if (dir.key === "sud")   return oy * T - (cy + ry);
  if (dir.key === "ouest") return (cx - rx) - (ox + 1) * T;
  return ox * T - (cx + rx);
}

/* Approche : on se place à `back` cases de la case cible, du bon côté, et on
   pousse. Rend l'écart, ou `null` si le couloir d'approche n'est pas dégagé. */
function approach(ox, oy, dir, blockedByElev) {
  const back = 4;
  let x = ox - dir.vx * back, y = oy - dir.vy * back;
  const e0 = elevAt(Math.floor(C.footX(x)), Math.floor(C.footY(y)));
  if (!canStand(x, y)) return null;
  // le couloir doit être libre, sinon on mesure autre chose que l'obstacle visé
  for (let k = 1; k < back; k++) {
    if (!canStand(ox - dir.vx * k, oy - dir.vy * k)) return null;
    if (blockedByElev && Math.abs(elevAt(ox - dir.vx * k, oy - dir.vy * k) - e0) > 0.001) return null;
  }
  for (let n = 0; n < 4000; n++) {
    const nx = x + dir.vx * SPD * DT, ny = y + dir.vy * SPD * DT;
    const fe = elevAt(Math.floor(C.footX(x)), Math.floor(C.footY(y)));
    if (!canStand(nx, ny, fe)) break;
    x = nx; y = ny;
  }
  return gapPx(dir, x, y, ox, oy);
}

/* Les familles d'obstacle de la carte. ⚠️ LA FALAISE EST À PART : elle ne
   bloque pas par `solid` mais par le DÉNIVELÉ, et c'est justement le cas où le
   dessin (48 px de parement) et la collision (une case) ne se ressemblent pas —
   la question que Guillaume pose sur « les murs ». */
const isHedge = (x, y) => !!tw.hedge[idx(x, y)];
const isBuilding = (x, y) => !!tw.solid[idx(x, y)] && !tw.hedge[idx(x, y)] && tw.ground[idx(x, y)] !== C.G_WATER;
const isWater = (x, y) => tw.ground[idx(x, y)] === C.G_WATER;
const FAMILIES = [
  ["la haie", isHedge, false],
  ["un mur de bâtiment", isBuilding, false],
  ["la berge", isWater, false],
];

for (const [name, test, byElev] of FAMILIES) {
  const per = {};
  for (const d of DIRS) per[d.key] = [];
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    if (!test(x, y)) continue;
    for (const d of DIRS) {
      if (per[d.key].length >= 400) continue;
      const g = approach(x, y, d, byElev);
      if (g !== null) per[d.key].push(g);
    }
  }
  const med = (a) => { const s = [...a].sort((p, q) => p - q); return s.length ? s[s.length >> 1] : NaN; };
  const line = DIRS.map(d => `${d.key} ${med(per[d.key]).toFixed(1)}`).join(" · ");
  const vals = DIRS.map(d => med(per[d.key]));
  const counts = DIRS.map(d => per[d.key].length);
  const enough = counts.every(c => c >= 5);
  ok(enough, `${name} : les quatre côtés ont été approchés`, counts.join("/") + " mesures");
  if (!enough) continue;
  /* ⚠️ LA SYMÉTRIE D'ABORD. C'est elle qui dit « le jeu se tient » ; une valeur
     absolue un peu haute est un choix, un écart entre deux côtés est un défaut. */
  const spread = Math.max(...vals) - Math.min(...vals);
  ok(spread <= 6, `${name} : les quatre côtés s'accordent (écart ≤ 6 px)`, `${line}  →  amplitude ${spread.toFixed(1)} px`);
  /* Et personne ne traverse : on peut frôler (l'ombre déborde de 2,5 px sur la
     case, c'est le pied qui touche), jamais entrer. */
  ok(Math.min(...vals) >= -C.CHAR_SHADOW_RY - 0.5, `${name} : on ne rentre dans rien`, `pire ${Math.min(...vals).toFixed(1)} px`);
  ok(Math.max(...vals) <= 6, `${name} : on n'est arrêté par rien d'invisible`, `pire ${Math.max(...vals).toFixed(1)} px`);
}

/* La falaise : le mur de soutènement de la Haute-Ville. Elle bloque par le
   dénivelé, on l'approche donc à altitude constante et on regarde la case du
   PIED du mur, pas la case haute. */
{
  const per = { nord: [], sud: [], ouest: [], est: [] };
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
    if (!tileFree(x, y)) continue;
    const e = elevAt(x, y);
    for (const d of DIRS) {
      if (per[d.key].length >= 200) continue;
      // la case visée est celle qu'on ne peut PAS franchir depuis la voisine
      if (Math.abs(elevAt(x - d.vx, y - d.vy) - e) <= C.TOWN_STEP_MAX) continue;
      const g = approach(x, y, d, true);
      if (g !== null) per[d.key].push(g);
    }
  }
  const med = (a) => { const s = [...a].sort((p, q) => p - q); return s.length ? s[s.length >> 1] : NaN; };
  const vals = DIRS.map(d => med(per[d.key])).filter(v => !Number.isNaN(v));
  const line = DIRS.map(d => `${d.key} ${per[d.key].length ? med(per[d.key]).toFixed(1) : "—"}`).join(" · ");
  ok(vals.length >= 2, "la falaise : au moins deux côtés approchés", line);
  if (vals.length >= 2) {
    const spread = Math.max(...vals) - Math.min(...vals);
    ok(spread <= 6, "la falaise : les côtés approchés s'accordent (≤ 6 px)", `${line}  →  amplitude ${spread.toFixed(1)} px`);
  }
}

/* ═══════════════════════════════════════════════ 2. LA SEMELLE TIENT DANS SA CASE */
{
  let bad = 0, worst = "";
  for (const [px, py] of C.bodyPoints(0, 0)) {
    if (px < 0 || px >= 1 || py < 0 || py >= 1) { bad++; worst = `(${px.toFixed(3)},${py.toFixed(3)})`; }
  }
  ok(bad === 0, "à ancre entière, les quatre coins de la semelle sont dans la case", bad ? worst : "0 ≤ x,y < 1");
  const pts = C.bodyPoints(0, 0);
  const wdt = pts[1][0] - pts[0][0], dep = pts[2][1] - pts[0][1];
  ok(Math.abs(wdt - 2 * C.BODY_RX) < 1e-9 && dep > 0.1,
     "la semelle a la largeur et la profondeur annoncées", `${(wdt * T).toFixed(1)} × ${(dep * T).toFixed(1)} px`);
}

/* ═══════════════════════════════════════════════ 3. LE VA-ET-VIENT CASE ↔ ANCRE */
{
  let bad = 0, first = "";
  for (let ty = 0; ty < H; ty += 3) for (let tx = 0; tx < W; tx += 3) {
    const a = C.tileAnchor(tx, ty), t = C.bodyFootTile(a.x, a.y);
    if (t.x !== tx || t.y !== ty) { bad++; if (!first) first = `(${tx},${ty})→(${t.x},${t.y})`; }
  }
  ok(bad === 0, "bodyFootTile(tileAnchor(t)) rend t partout sur la carte", bad ? `${bad} écarts, 1er ${first}` : "exact");
  /* Et l'ancre d'une case doit y tenir DEBOUT dès que la case est libre — sans
     quoi le pathfinder rendrait des points de passage que la marche refuse. */
  let unusable = 0;
  for (let ty = 1; ty < H - 1; ty++) for (let tx = 1; tx < W - 1; tx++) {
    if (!tileFree(tx, ty)) continue;
    const a = C.tileAnchor(tx, ty);
    for (const [px, py] of C.bodyPoints(a.x, a.y)) {
      if (Math.floor(px) !== tx || Math.floor(py) !== ty) { unusable++; break; }
    }
  }
  ok(unusable === 0, "le point de passage d'une case libre tient dans cette case", `${unusable} case(s) en défaut`);
}

/* ═══════════════════════════════════════════════ 4. UN PASSAGE D'UNE CASE
   ⚠️ ON BALAIE L'ALIGNEMENT, ON NE TESTE PAS UN CENTRE. La question n'est pas
   « peut-on passer en visant parfaitement » mais « de combien peut-on se
   tromper » : c'est cette marge-là que le joueur ressent. */
{
  /* ⚠️ ON BALAIE L'AXE PERPENDICULAIRE AU PASSAGE, jamais celui du passage.
     Premier jet : un couloir nord-sud balayé en x — on mesurait la longueur du
     couloir, pas sa largeur, et le nombre sorti (9) ne voulait rien dire. Un
     banc qui balaie le mauvais axe rend un chiffre juste sur une autre question. */
  let tested = 0, worst = 999, worstAt = "";
  for (let y = 1; y < H - 1 && tested < 400; y++) for (let x = 1; x < W - 1 && tested < 400; x++) {
    if (!tileFree(x, y)) continue;
    const ns = isHedge(x - 1, y) && isHedge(x + 1, y);   // on passe du nord au sud : largeur en x
    const ew = isHedge(x, y - 1) && isHedge(x, y + 1);   // on passe d'est en ouest : largeur en y
    if (!ns && !ew) continue;
    tested++;
    let span = 0;
    for (let k = -50; k <= 50; k++) if (canStand(ns ? x + k / 100 : x, ns ? y : y + k / 100)) span++;
    if (span < worst) { worst = span; worstAt = `(${x},${y})${ns ? " nord-sud" : " est-ouest"}`; }
  }
  ok(tested === 0 || worst >= 20,
     "un passage d'une case laisse de la marge de visée",
     tested ? `${tested} passages, le plus serré ${worst} centièmes de case en ${worstAt}` : "aucun couloir d'une case");
}
{
  /* Les vingt-sept allées percées dans les haies : chacune doit se franchir du
     sud vers le nord, en poussant tout droit. C'est le contrôle d'ARRIVÉE que
     le §25 de `ferme/README.md` réclame — et le seul qui dise « on entre chez
     soi ». */
  let gates = 0, terraces = 0; const ko = [];
  for (const h of C.TOWN_HOUSES) {
    const doorX = h.x + 2, doorY = h.y + C.TOWN_HOUSE_H;
    // on part deux cases sous la haie du jardin et on remonte vers la porte
    let sy = doorY + 4;
    while (sy > doorY && !tileFree(doorX, sy)) sy--;
    if (!canStand(doorX, sy)) continue;
    /* ⚠️ LES DEUX PARCELLES DE LA TERRASSE N'ONT PAS DE RUE EN DESSOUS, ELLES
       ONT UN À-PIC (voir la note de l'allée dans generateTownWorld) : on y monte
       par l'escalier, pas par le sud. Les compter comme murées serait exiger
       qu'une falaise se grimpe — le banc dirait « défaut » sur une carte juste. */
    if (Math.abs(elevAt(doorX, sy) - elevAt(doorX, doorY)) > C.TOWN_STEP_MAX) { terraces++; continue; }
    gates++;
    let x = doorX, y = sy;
    for (let n = 0; n < 2000; n++) {
      const ny = y - SPD * DT;
      const fe = elevAt(Math.floor(C.footX(x)), Math.floor(C.footY(y)));
      if (!canStand(x, ny, fe)) break;
      y = ny;
      if (y <= doorY + 0.5) break;
    }
    if (y > doorY + 1.5) ko.push(`(${doorX},${doorY}) arrêté en y=${y.toFixed(1)}`);
  }
  ok(gates > 0 && ko.length === 0, `les ${gates} allées de parcelle se franchissent tout droit`,
     ko.length ? ko.slice(0, 3).join(" · ") : `aucune n'est murée (+${terraces} parcelles de terrasse, à-pic, hors mesure)`);
}

/* ═══════════════════════════════════════════════ 4 bis. LES PONTS SE TRAVERSENT
   ⚠️⚠️ C'EST UN CONTRÔLE D'ARRIVÉE, PAS DE GÉOMÉTRIE (§25 de ferme/README.md).
   `verify-pont` tient déjà le dessin, le tri et la séparation « flèche d'image /
   altitude de collision » ; ce qu'il ne fait pas, c'est POUSSER LA TOUCHE. Or
   c'est exactement là que le 439 a livré un mur en croyant dessiner une bosse.
   ⚠️ L'AXE DE TRAVERSÉE SE DÉDUIT DE L'EAU, il n'est pas écrit : les deux ponts
   du 439 franchissent une rivière qui coule du nord au sud, on les traverse donc
   d'est en ouest — et un banc qui suppose l'axe mesure sa supposition (premier
   jet : « départ nord bloqué » quatre fois, sur deux ponts parfaitement
   praticables). */
function crossAxis(bx, by) {
  const wet = (x, y) => x >= 0 && y >= 0 && x < W && y < H && tw.ground[idx(x, y)] === C.G_WATER;
  let ns = 0, ew = 0;
  for (let k = 2; k <= 4; k++) {
    if (wet(bx, by - k)) ns++; if (wet(bx, by + k)) ns++;
    if (wet(bx - k, by)) ew++; if (wet(bx + k, by)) ew++;
  }
  // l'eau est au nord et au sud ⇒ la rivière est verticale ⇒ on traverse d'est en ouest
  return ns >= ew ? [DIRS[2], DIRS[3]] : [DIRS[0], DIRS[1]];
}
{
  const bridges = (tw.props || []).filter(p => p.kind === "archBridge");
  const ko = [];
  for (const b of bridges) {
    const axis = crossAxis(b.x, b.y);
    for (const d of axis) {
      const reach = C.TOWN_BRIDGE_SPAN;
      const x0 = b.x - d.vx * reach, y0 = b.y - d.vy * reach;
      const x1 = b.x + d.vx * reach, y1 = b.y + d.vy * reach;
      if (!canStand(x0, y0)) { ko.push(`(${b.x},${b.y}) départ ${d.key} hors carte ou occupé`); continue; }
      let cx = x0, cy = y0, arrived = false;
      for (let n = 0; n < 4000; n++) {
        const nx = cx + d.vx * SPD * DT, ny = cy + d.vy * SPD * DT;
        const fe = elevAt(Math.floor(C.footX(cx)), Math.floor(C.footY(cy)));
        if (!canStand(nx, ny, fe)) break;
        cx = nx; cy = ny;
        if (d.vx ? (d.vx > 0 ? cx >= x1 : cx <= x1) : (d.vy > 0 ? cy >= y1 : cy <= y1)) { arrived = true; break; }
      }
      if (!arrived) ko.push(`(${b.x},${b.y}) vers ${d.key} arrêté en (${cx.toFixed(1)},${cy.toFixed(1)})`);
    }
  }
  ok(bridges.length > 0 && ko.length === 0, `les ${bridges.length} ponts se traversent dans les deux sens`,
     ko.length ? ko.slice(0, 4).join(" · ") : "aucun mur invisible sur le tablier");
}

/* ═══════════════════════════════════════════════ 4 ter. LES ESCALIERS SE MONTENT
   ⚠️ MÊME GRANDEUR, AUTRE OUVRAGE : une volée doit se monter ET se descendre en
   poussant tout droit. `TOWN_STEP_MAX` la rend franchissable par construction
   (voir generateTownWorld), mais « par construction » n'est pas « en poussant la
   touche » — la semelle est plus profonde que haute, elle mord donc sur deux
   marches à la fois, et c'est ça qu'on vérifie.
   ⚠️ L'EMPRISE D'UNE VOLÉE SE DÉDUIT DE `dir` : `len` compte les marches DANS LE
   SENS DE LA MONTÉE, `w` la largeur en travers. Les inverser fait sonder une
   colonne qui n'est pas dans l'escalier — et le banc accuse alors l'escalier de
   ce que fait son propre repère (quatorzième forme, en-tête de CLAUDE.md). */
{
  const ko = [];
  for (let i = 0; i < C.TOWN_STAIRS.length; i++) {
    const st = C.TOWN_STAIRS[i];
    const horiz = st.dir === "e" || st.dir === "w";
    const rx = horiz ? st.len : st.w, ry = horiz ? st.w : st.len;
    let done = false;
    for (let k = 0; k < (horiz ? ry : rx) && !done; k++) {
      // un point d'entrée juste avant la première marche, et un juste après la dernière
      const ax = horiz ? st.x - 1 : st.x + k, ay = horiz ? st.y + k : st.y - 1;
      const bx = horiz ? st.x + rx : ax,      by = horiz ? ay : st.y + ry;
      if (!canStand(ax, ay) || !canStand(bx, by)) continue;
      /* ⚠️ ON CHERCHE UNE VOLÉE PRATICABLE, PAS N'IMPORTE LAQUELLE. Les limons
         (les joues de pierre) sont solides et appartiennent à l'emprise de
         l'escalier : sonder la colonne du limon, c'est reprocher à l'escalier
         d'avoir une rampe. On n'essaie qu'une file entièrement libre. */
      let lane = true;
      for (let q = 0; q <= (horiz ? rx : ry) + 1 && lane; q++) {
        const tx2 = horiz ? st.x - 1 + q : ax, ty2 = horiz ? ay : st.y - 1 + q;
        if (!tileFree(tx2, ty2)) lane = false;
      }
      if (!lane) continue;
      done = true;
      for (const [px0, py0, px1, py1] of [[ax, ay, bx, by], [bx, by, ax, ay]]) {
        let cx = px0, cy = py0, arrived = false;
        const ux = Math.sign(px1 - px0), uy = Math.sign(py1 - py0);
        for (let n = 0; n < 6000; n++) {
          const nx = cx + ux * SPD * DT, ny = cy + uy * SPD * DT;
          const fe = elevAt(Math.floor(C.footX(cx)), Math.floor(C.footY(cy)));
          if (!canStand(nx, ny, fe)) break;
          cx = nx; cy = ny;
          /* ⚠️ « ARRIVÉ » SE LIT EN CASES, PAS EN COORDONNÉES. La dernière case
             libre d'une volée est bordée d'un mur : la semelle y tient, mais un
             pas de plus est refusé, donc l'ancre s'arrête un centième avant la
             valeur entière visée. Comparer les FLOTTANTS faisait échouer une
             volée parfaitement praticable — le banc mesurait sa propre grille. */
          const ft = C.bodyFootTile(cx, cy);
          if (ft.x === Math.floor(C.footX(px1)) && ft.y === Math.floor(C.footY(py1))) { arrived = true; break; }
        }
        if (!arrived) ko.push(`volée #${i} (${px0},${py0})→(${px1},${py1}) arrêté en (${cx.toFixed(1)},${cy.toFixed(1)})`);
      }
    }
    if (!done) ko.push(`volée #${i} : aucune approche dégagée`);
  }
  ok(ko.length === 0, `les ${C.TOWN_STAIRS.length} volées se montent ET se descendent tout droit`,
     ko.length ? ko.slice(0, 3).join(" · ") : "aucune marche infranchissable");
}

/* ═══════════════════════════════════════════════ 5. LE JEU ET LE MOTEUR S'ACCORDENT
   ⚠️ « DEUX RÉPONSES JUSTES SÉPARÉMENT » est le piège n°8 de l'en-tête de
   CLAUDE.md. `E.townBoxFree` (navigation) doit être PESSIMISTE : il peut
   refuser ce que la marche accepte (il ignore la coupe d'arbre), jamais
   l'inverse — accepter ce que la marche refuse produirait des chemins
   impossibles à suivre, le défaut exact que le 428 a corrigé. */
{
  let n = 0, tooPermissive = 0, first = "";
  for (let k = 0; k < 20000; k++) {
    const x = (k * 7919) % (W - 4) + 2 + ((k % 5) - 2) * 0.17;
    const y = ((k * 104729) % (H - 4)) + 2 + ((k % 7) - 3) * 0.11;
    n++;
    const eng = E.townBoxFree(tw, x, y);
    const here = canStand(x, y, elevAt(Math.floor(C.footX(x)), Math.floor(C.footY(y))));
    if (eng && !here) { tooPermissive++; if (!first) first = `(${x.toFixed(2)},${y.toFixed(2)})`; }
  }
  ok(tooPermissive === 0, `sur ${n} points, le moteur n'accepte jamais ce que la marche refuse`,
     tooPermissive ? `${tooPermissive} écarts, 1er ${first}` : "aucun écart");
}

/* ═══════════════════════════════════════════════ 6. ON NE RESTE PAS COINCÉ
   ⚠️ LA TRAPPE DE DÉGAGEMENT SE VÉRIFIE DEPUIS UNE POSITION INTERDITE, sinon
   elle ne se vérifie pas du tout : c'est le seul état où elle sert. */
{
  const stepOk = (x, y, nx, ny) => canStand(nx, ny) || !canStand(x, y);
  /* ⚠️ ON POUSSE DANS UNE DIRECTION, ON N'ALTERNE PAS. Premier jet : les quatre
     directions à tour de rôle, une image chacune — le joueur revenait sur ses
     pas à chaque image et ne sortait jamais. 0/89, et le défaut était dans le
     banc. Un joueur coincé tient une touche ; c'est ça qu'on rejoue. */
  let tried = 0, freed = 0; const stuckAt = [];
  for (let y = 4; y < H - 4 && tried < 300; y += 7) for (let x = 4; x < W - 4 && tried < 300; x += 5) {
    if (canStand(x, y)) continue;                       // on ne part que de l'interdit
    tried++;
    let out = false;
    for (const d of DIRS) {
      let px = x, py = y;
      for (let n = 0; n < 400 && !out; n++) {
        const nx = px + d.vx * SPD * DT, ny = py + d.vy * SPD * DT;
        if (!stepOk(px, py, nx, ny)) break;
        px = nx; py = ny;
        if (canStand(px, py)) out = true;
      }
      if (out) break;
    }
    if (out) freed++; else if (stuckAt.length < 3) stuckAt.push(`(${x},${y})`);
  }
  ok(tried === 0 || freed === tried, "depuis une position interdite, on se dégage toujours",
     `${freed}/${tried}` + (stuckAt.length ? " · murés : " + stuckAt.join(" ") : ""));
}

console.log(`\n${fail === 0 ? "TOUT PASSE" : fail + " ÉCHEC(S)"}\n`);
process.exit(fail ? 1 : 0);
