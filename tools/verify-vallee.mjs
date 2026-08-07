/* =============================================================================
   verify-vallee.mjs — ON CIRCULE VRAIMENT DANS VALLEY TOWN ? (zip 426)
   -----------------------------------------------------------------------------
   ⚠️ CE BANC N'EXISTAIT PAS. Le contexte du 425 affirmait qu'il tournait avec
   74 contrôles ; il n'y avait pas de fichier. C'est exactement le défaut que
   CLAUDE.md décrit lui-même (« un stub qui retombe sur une valeur raisonnable
   ment mieux qu'un stub qui plante ») appliqué à un OUTIL : un banc imaginaire
   rassure sans rien vérifier, et fait passer pour testé ce qui ne l'est pas.

   Ce qu'il contrôle, et pourquoi ces contrôles-là :

   1. LA CIRCULATION, par parcours réel depuis la descente du train. Il applique
      la MÊME règle que le jeu — obstacles + « pas plus de TOWN_STEP_MAX de
      dénivelé d'un pas » — et rien d'autre : le saut ne sert qu'à DESCENDRE, il
      ne peut donc pas rendre accessible ce que la marche n'atteint pas.
   2. LES MURS INVISIBLES : toute case bloquante doit être expliquée par quelque
      chose que le rendu dessine. C'est le contrôle que le 425 réclame
      explicitement, après ses six cents haies invisibles.
   3. LE TRIBUNAL, dedans : chaque pièce atteignable par sa porte, chaque
      escalier apparié, chaque cellule ouverte par sa grille.

   ⚠️ IL IMPORTE LE VRAI MOTEUR. Les autres bancs lisent le texte source ; ici
   ça n'aurait aucun sens — on veut le monde tel qu'il sort du générateur. Les
   deux fichiers sont recopiés dans un dossier temporaire avec l'extension
   ajoutée à l'import (Node ESM refuse « ./fermeConstants » sans « .js »), ce
   qui évite de toucher au code du jeu pour faire plaisir à un outil.

   Usage : node tools/verify-vallee.mjs
   ========================================================================== */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "components", "ferme");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vallee-"));
fs.writeFileSync(path.join(tmp, "fermeConstants.js"), fs.readFileSync(path.join(SRC, "fermeConstants.js")));
fs.writeFileSync(path.join(tmp, "fermeEngine.js"),
  fs.readFileSync(path.join(SRC, "fermeEngine.js"), "utf8").replace('from "./fermeConstants"', 'from "./fermeConstants.js"'));

const C = await import(pathToFileURL(path.join(tmp, "fermeConstants.js")).href);
const E = await import(pathToFileURL(path.join(tmp, "fermeEngine.js")).href);

let fails = 0, total = 0;
const ok = (n, c, x) => { total++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };
const section = (t) => console.log(`\n=== ${t} ===\n`);

/* ═══════════════════════════════════════════════════════════════════════════
   VALLEY TOWN
   ═══════════════════════════════════════════════════════════════════════════ */
section("Valley Town — la carte sort-elle complète ?");
const tw = E.generateTownWorld();
const W = tw.w, H = tw.h, idx = (x, y) => y * W + x;
ok("dimensions", W === C.TOWN_MAP_W && H === C.TOWN_MAP_H, `${W}×${H}`);
for (const k of ["ground", "objects", "elev", "solid", "props", "hedge"]) {
  ok(`le monde porte « ${k} »`, tw[k] !== undefined && (tw[k].length !== undefined || typeof tw[k] === "object"));
}
ok("les tableaux font tous W×H", [tw.ground.length, tw.objects.length, tw.elev.length, tw.solid.length, tw.hedge.length].every(l => l === W * H));

/* ---------------------------------------------------------------------------
   LE PARCOURS. Même règle que canStandTown : quatre points de la boîte du
   personnage, obstacles ET dénivelé. On raisonne en CASES (le joueur occupe
   ~0,6 case de large) : une case est praticable si elle-même est libre, et on
   ne passe d'une case à l'autre que si le dénivelé tient sous TOWN_STEP_MAX.
   --------------------------------------------------------------------------- */
const railBlocked = (x, y) => x <= C.TOWN_RAIL_X + 1 && !(y >= C.TOWN_PLATFORM.y && y < C.TOWN_PLATFORM.y + C.TOWN_PLATFORM.h);
function walkable(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return false;
  if (railBlocked(x, y)) return false;
  const i = idx(x, y);
  if (tw.solid[i]) return false;
  if (tw.ground[i] === C.G_WATER) return false;
  const o = tw.objects[i];
  return !(o === C.O_TREE || o === C.O_TREE2 || o === C.O_STUMP);
}
const seen = new Uint8Array(W * H);
{
  const sx = Math.round(C.TOWN_SPAWN.x), sy = Math.round(C.TOWN_SPAWN.y);
  ok("la case d'arrivée du train est libre", walkable(sx, sy), `(${sx},${sy})`);
  const q = [[sx, sy]]; seen[idx(sx, sy)] = 1;
  while (q.length) {
    const [x, y] = q.pop();
    const e0 = tw.elev[idx(x, y)];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[idx(nx, ny)]) continue;
      if (!walkable(nx, ny)) continue;
      if (Math.abs(tw.elev[idx(nx, ny)] - e0) > C.TOWN_STEP_MAX) continue;   // falaise : on ne grimpe pas
      seen[idx(nx, ny)] = 1; q.push([nx, ny]);
    }
  }
}
const reach = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !!seen[idx(x, y)];

section("Valley Town — circulation");
let freeTiles = 0, reached = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (walkable(x, y)) { freeTiles++; if (seen[idx(x, y)]) reached++; }
const pct = (100 * reached / freeTiles);
// ⚠️ PAS 100 % ATTENDUS, ET C'EST NORMAL : l'intérieur des jardins clos et des
// enclos n'a qu'une entrée, mais surtout les rebords de la terrasse laissent des
// poches qu'on n'atteint QUE par le saut (qui ne descend que). Un seuil trop
// strict rendrait le banc inutilisable ; trop lâche, il ne verrait plus une
// ville coupée en deux.
ok("au moins 92 % des cases libres sont atteignables à pied", pct >= 92, `${pct.toFixed(1)} % (${reached}/${freeTiles})`);

// Les rues : une avenue coupée est le pire défaut possible.
for (const ry of C.TOWN_ST_ROWS) {
  let bad = 0, tot = 0;
  for (let x = 12; x < W - 4; x++) { const i = idx(x, ry); if (tw.ground[i] === C.G_PATH) { tot++; if (!seen[i]) bad++; } }
  ok(`avenue y=${ry} entièrement atteignable`, tot > 0 && bad === 0, `${tot} cases pavées, ${bad} isolées`);
}
for (const cx of C.TOWN_ST_COLS) {
  let bad = 0, tot = 0;
  for (let y = 12; y < H - 4; y++) { const i = idx(cx, y); if (tw.ground[i] === C.G_PATH) { tot++; if (!seen[i]) bad++; } }
  ok(`artère x=${cx} entièrement atteignable`, tot > 0 && bad === 0, `${tot} cases pavées, ${bad} isolées`);
}

// Les portes de maison : chacune doit s'atteindre (c'est là qu'on dort).
{
  let bad = [];
  for (let hi = 0; hi < C.TOWN_HOUSES.length; hi++) {
    const h = C.TOWN_HOUSES[hi];
    const dx = h.x + 2, dy = h.y + C.TOWN_HOUSE_H;
    if (!reach(dx, dy) && !reach(dx + 1, dy)) bad.push(`#${hi}(${h.x},${h.y})`);
  }
  ok(`les ${C.TOWN_HOUSES.length} portes de maison sont accessibles`, bad.length === 0, bad.join(" "));
}
// Les repères que le joueur DOIT pouvoir atteindre.
const spots = [
  ["le parvis du tribunal", C.TOWN_COURT.x + Math.floor(C.TOWN_COURT.w / 2), C.TOWN_COURT.y + C.TOWN_COURT.h + 1],
  ["le parvis de la mairie", C.TOWN_HALL.x + Math.floor(C.TOWN_HALL.w / 2), C.TOWN_HALL.y + C.TOWN_HALL.h + 1],
  ["le parvis de l'église", C.TOWN_CHURCH.x + Math.floor(C.TOWN_CHURCH.w / 2), C.TOWN_CHURCH.y + C.TOWN_CHURCH.h + 1],
  ["la fontaine", C.TOWN_FOUNTAIN.x, C.TOWN_FOUNTAIN.y + 3],
  ["le belvédère", C.TOWN_BELVEDERE.x + Math.floor(C.TOWN_BELVEDERE.w / 2), C.TOWN_BELVEDERE.y + C.TOWN_BELVEDERE.h - 3],
  ["le champ de foire", C.TOWN_MARKET.x + Math.floor(C.TOWN_MARKET.w / 2), C.TOWN_MARKET.y + Math.floor(C.TOWN_MARKET.h / 2)],
  ["le verger", C.TOWN_ORCHARD.x + 2, C.TOWN_ORCHARD.y + Math.floor(C.TOWN_ORCHARD.h / 2)],
  ["le parc", C.TOWN_PARK.x + Math.floor(C.TOWN_PARK.w / 2), C.TOWN_PARK.y + Math.floor(C.TOWN_PARK.h / 2) + 3],
  ["le cimetière", C.TOWN_CEMETERY.x + Math.floor(C.TOWN_CEMETERY.w / 2), C.TOWN_CEMETERY.y + Math.floor(C.TOWN_CEMETERY.h / 2)],
  ["la promenade du lac", C.TOWN_PIER.x, C.TOWN_LAKE.y - 1],
  ["le bout du ponton", C.TOWN_PIER.x + 1, C.TOWN_PIER.y + C.TOWN_PIER.h - 1],
  ["le kiosque à musique (son pied)", C.TOWN_KIOSK.x + 1, C.TOWN_KIOSK.y + 3],
  ["le quartier des artisans", C.TOWN_ARTISANS.x + 8, C.TOWN_ARTISANS.y + 40],
];
for (const [name, x, y] of spots) ok(`${name} est accessible`, reach(x, y), `(${x},${y})`);

section("Valley Town — aucun mur invisible");
/* ⚠️ TOUTE CASE BLOQUANTE DOIT ÊTRE DESSINÉE PAR QUELQU'UN. C'est le contrôle
   que le 425 demande de garder, mot pour mot. On construit donc l'ensemble de
   ce que le rendu peint, et on lui soustrait les cases solides. */
const explained = new Uint8Array(W * H);
const mark = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) explained[idx(x, y)] = 1; };
const markRect = (r, w2, h2) => { for (let y = r.y; y < r.y + (h2 ?? r.h); y++) for (let x = r.x; x < r.x + (w2 ?? r.w); x++) mark(x, y); };
for (let i = 0; i < W * H; i++) {
  if (tw.hedge[i]) explained[i] = 1;
  if (tw.objects[i] === C.O_TREE || tw.objects[i] === C.O_TREE2 || tw.objects[i] === C.O_STUMP) explained[i] = 1;
  if (tw.ground[i] === C.G_WATER) explained[i] = 1;
}
for (const b of [C.TOWN_CHURCH, C.TOWN_HALL, C.TOWN_COURT]) markRect(b);
for (const h of C.TOWN_HOUSES) markRect({ x: h.x, y: h.y }, C.TOWN_HOUSE_W, C.TOWN_HOUSE_H);
for (const p of tw.props) mark(p.x, p.y);
markRect({ x: C.TOWN_KIOSK.x, y: C.TOWN_KIOSK.y }, 3, 3);
markRect({ x: C.TOWN_MONUMENT.x, y: C.TOWN_MONUMENT.y }, 2, 2);
{
  const orphans = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    if (tw.solid[i] && !explained[i]) orphans.push(`(${x},${y})`);
  }
  ok("aucune case bloquante n'est invisible", orphans.length === 0, orphans.slice(0, 12).join(" ") + (orphans.length > 12 ? ` … ${orphans.length} au total` : ""));
}
{
  // L'inverse : un décor dessiné qui ne bloque pas. On ne teste que les props
  // massifs (un lampadaire traversable est un défaut, pas une tolérance).
  const ghosts = tw.props.filter(p => p.kind !== "kiosk" && !tw.solid[idx(p.x, p.y)]);
  ok("aucun décor n'est traversable", ghosts.length === 0, ghosts.slice(0, 8).map(p => `${p.kind}(${p.x},${p.y})`).join(" "));
}

section("Valley Town — géométrie");
{
  // Aucun bâtiment ne doit mordre sur une rue, un escalier, ou deux altitudes.
  const bad = [];
  const allB = [
    ...[C.TOWN_CHURCH, C.TOWN_HALL, C.TOWN_COURT].map((b, k) => [["église", "mairie", "tribunal"][k], b]),
    ...C.TOWN_HOUSES.map((h, k) => [`maison#${k}`, { x: h.x, y: h.y, w: C.TOWN_HOUSE_W, h: C.TOWN_HOUSE_H }]),
  ];
  for (const [name, b] of allB) {
    let e0 = null, mixed = false, onStreet = false, onStair = false;
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
      const i = idx(x, y);
      if (e0 === null) e0 = tw.elev[i]; else if (Math.abs(tw.elev[i] - e0) > 0.001) mixed = true;
      if (tw.ground[i] === C.G_TOWN_STAIR) onStair = true;
      for (const ry of C.TOWN_ST_ROWS) if (y === ry || y === ry + 1) onStreet = true;
      for (const cx of C.TOWN_ST_COLS) if (x === cx || x === cx + 1) onStreet = true;
    }
    if (mixed || onStreet || onStair) bad.push(`${name}${mixed ? " (2 altitudes)" : ""}${onStreet ? " (sur une rue)" : ""}${onStair ? " (sur un escalier)" : ""}`);
  }
  ok("aucun bâtiment sur une rue, un escalier ou à cheval sur deux altitudes", bad.length === 0, bad.join(" · "));
}
{
  // Des rebords sautables doivent exister, sinon la mécanique est morte.
  let ledges = 0;
  for (let y = 1; y < H - 3; y++) for (let x = 1; x < W - 1; x++) {
    const e0 = tw.elev[idx(x, y)], e1 = tw.elev[idx(x, y + 1)];
    if (e0 - e1 >= C.TOWN_JUMP_MIN_DROP && walkable(x, y) && walkable(x, y + 2)) ledges++;
  }
  ok("des rebords sautables existent", ledges > 20, `${ledges} rebords`);
}
{
  // Les escaliers doivent réellement monter par pas < TOWN_STEP_MAX.
  const bad = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (tw.ground[idx(x, y)] !== C.G_TOWN_STAIR) continue;
    const e0 = tw.elev[idx(x, y)];
    let any = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (Math.abs(tw.elev[idx(x + dx, y + dy)] - e0) <= C.TOWN_STEP_MAX && walkable(x + dx, y + dy)) any = true;
    }
    if (!any) bad.push(`(${x},${y})`);
  }
  ok("aucune marche isolée", bad.length === 0, bad.slice(0, 8).join(" "));
}
{
  const stairsReached = [];
  for (const st of C.TOWN_STAIRS) stairsReached.push(reach(st.x, st.y) || reach(st.x + st.w - 1, st.y + st.len - 1) || reach(st.x, st.y + st.len - 1));
  ok(`les ${C.TOWN_STAIRS.length} volées sont atteignables`, stairsReached.every(Boolean), stairsReached.map((b, i) => `#${i}:${b ? "ok" : "isolée"}`).join(" "));
}
{
  // Le lac ne doit pas avoir noyé une rue.
  let drowned = 0;
  for (const ry of C.TOWN_ST_ROWS) for (let x = 10; x < W - 3; x++) { const i = idx(x, ry); if (tw.ground[i] === C.G_WATER) drowned++; }
  ok("aucune avenue n'est sous l'eau", drowned === 0, `${drowned} cases`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   LE TRIBUNAL, DEDANS
   ═══════════════════════════════════════════════════════════════════════════ */
section("Tribunal — le bâtiment sort-il complet ?");
const cw = E.generateCourtWorld();
ok("dimensions", cw.w === C.COURT_MAP_W && cw.h === C.COURT_MAP_H, `${cw.w}×${cw.h}`);
ok("une porte par pièce au minimum", cw.doors.length >= C.COURT_ROOMS.length, `${cw.doors.length} portes pour ${C.COURT_ROOMS.length} pièces`);
ok("chaque pièce a sa plaque", C.COURT_ROOMS.every(r => cw.doors.some(d => d.room === r.key)));
{
  const dup = C.COURT_ROOMS.map(r => r.key).filter((k, i, a) => a.indexOf(k) !== i);
  ok("aucune clé de pièce en double", dup.length === 0, dup.join(" "));
}
{
  // Les pièces ne doivent pas déborder du niveau ni empiéter sur le couloir.
  const bad = [];
  for (const r of C.COURT_ROOMS) {
    if (r.x < 0 || r.y < 0 || r.x + r.w > C.COURT_FLOOR_W || r.y + r.h > C.COURT_FLOOR_H) bad.push(`${r.key} déborde`);
    const overlapsCorridor = r.x + r.w - 1 > C.COURT_CORRIDOR.x && r.x < C.COURT_CORRIDOR.x + C.COURT_CORRIDOR.w - 1;
    if (overlapsCorridor) bad.push(`${r.key} mord le couloir`);
  }
  ok("les pièces tiennent dans leur niveau", bad.length === 0, bad.join(" · "));
}

section("Tribunal — circulation, niveau par niveau");
const cidx = (x, y) => y * cw.w + x;
const cWalk = (x, y) => x >= 0 && y >= 0 && x < cw.w && y < cw.h && !cw.solid[cidx(x, y)];
function floodCourt(sx, sy) {
  const vis = new Uint8Array(cw.w * cw.h);
  if (!cWalk(sx, sy)) return vis;
  const q = [[sx, sy]]; vis[cidx(sx, sy)] = 1;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!cWalk(nx, ny) || vis[cidx(nx, ny)]) continue;
      // ⚠️ ON NE FRANCHIT PAS LE VIDE ENTRE DEUX NIVEAUX : ils sont empilés dans
      // la même grille, séparés par COURT_FLOOR_GAP rangées de CT_VOID — qui
      // sont solides, donc le parcours s'arrête tout seul. Ce commentaire existe
      // parce que c'est le piège n°1 de la grille unique.
      vis[cidx(nx, ny)] = 1; q.push([nx, ny]);
    }
  }
  return vis;
}
for (let f = 0; f < C.COURT_FLOORS.length; f++) {
  const y0 = E.courtFloorY0(f);
  // On part du couloir, au milieu du niveau : c'est là qu'arrivent l'escalier
  // et le seuil.
  const vis = floodCourt(Math.floor(C.COURT_CORRIDOR.x + C.COURT_CORRIDOR.w / 2), y0 + Math.floor(C.COURT_FLOOR_H / 2));
  let free = 0, seenN = 0;
  for (let y = y0; y < y0 + C.COURT_FLOOR_H; y++) for (let x = 0; x < cw.w; x++) {
    if (cWalk(x, y)) { free++; if (vis[cidx(x, y)]) seenN++; }
  }
  const p = 100 * seenN / free;
  ok(`niveau « ${C.COURT_FLOORS[f].key} » : tout est atteignable depuis le couloir`, p >= 99.9, `${p.toFixed(1)} % (${seenN}/${free})`);
  for (const r of C.COURT_ROOMS) {
    if (r.floor !== f) continue;
    // L'intérieur de la pièce, au coin le plus éloigné de la porte : si LUI est
    // atteint, la pièce est traversable et sa porte est percée.
    let inside = 0, got = 0;
    for (let y = y0 + r.y + 1; y < y0 + r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
      if (!cWalk(x, y)) continue;
      inside++; if (vis[cidx(x, y)]) got++;
    }
    ok(`  ${r.key} : ${got}/${inside} cases libres atteintes`, inside > 0 && got === inside);
  }
}
{
  /* LES CAGES D'ESCALIER. ⚠️ C'EST LE CONTRÔLE QUI A FAIT REFAIRE LA STRUCTURE :
     avec deux volées orientées, la montée arrivait sur la volée descendante de
     l'étage — donc dans un mur. On vérifie donc les DEUX bouts de chaque cage :
     la volée existe, elle est praticable, et son sens correspond aux altitudes. */
  const bad = [];
  for (const sw of C.COURT_STAIRWELLS) {
    for (const [from, to] of [[sw.a, sw.b], [sw.b, sw.a]]) {
      const y = E.courtFloorY0(from) + sw.y;
      const t = cw.tile[cidx(sw.x, y)];
      const wantUp = C.COURT_FLOORS[to].alt > C.COURT_FLOORS[from].alt;
      if (t !== (wantUp ? C.CT_STAIR_UP : C.CT_STAIR_DOWN)) bad.push(`${C.COURT_FLOORS[from].key}→${C.COURT_FLOORS[to].key} : volée absente ou à l'envers`);
      if (cw.solid[cidx(sw.x, y)]) bad.push(`${C.COURT_FLOORS[from].key} : volée bloquée`);
    }
  }
  ok("les cages d'escalier relient bien leurs deux niveaux", bad.length === 0, bad.join(" · "));
  // Toutes les pièces doivent être joignables : une cage manquante isolerait un
  // étage entier, et le parcours par niveau ci-dessus ne le verrait PAS (il part
  // du couloir de chaque niveau, justement).
  const linked = new Set([0]);
  for (let k = 0; k < C.COURT_FLOORS.length; k++) {
    for (const sw of C.COURT_STAIRWELLS) {
      if (linked.has(sw.a)) linked.add(sw.b);
      if (linked.has(sw.b)) linked.add(sw.a);
    }
  }
  ok("les trois niveaux sont reliés au rez-de-chaussée", linked.size === C.COURT_FLOORS.length, `${linked.size}/${C.COURT_FLOORS.length}`);
  ok("le panneau d'affichage existe", cw.props.some(p => p.kind === "board"));
}
{
  // Le seuil : deux cases, traversables, au rez-de-chaussée.
  const t1 = cw.tile[cidx(C.COURT_ENTRY.x, C.COURT_ENTRY.y)], t2 = cw.tile[cidx(C.COURT_ENTRY.x + 1, C.COURT_ENTRY.y)];
  ok("le seuil est percé et traversable", t1 === C.CT_EXIT && t2 === C.CT_EXIT && cWalk(C.COURT_ENTRY.x, C.COURT_ENTRY.y));
  ok("on entre sur une case libre", cWalk(Math.floor(C.COURT_SPAWN.x), Math.floor(C.COURT_SPAWN.y)));
}
{
  // ⚠️ AUCUN MEUBLE DANS UNE PORTE. Un bureau posé sur une porte donne une
  // pièce murée, et c'est invisible tant qu'on ne va pas à cette porte-là.
  const doorSet = new Set(cw.doors.map(d => `${d.x},${d.y}`));
  const blockers = cw.props.filter(p => doorSet.has(`${p.x},${p.y}`));
  ok("aucun meuble ne bouche une porte", blockers.length === 0, blockers.map(p => `${p.kind}(${p.x},${p.y})`).join(" "));
  const stairProps = cw.props.filter(p => {
    const t = cw.tile[cidx(p.x, p.y)];
    return t === C.CT_STAIR_UP || t === C.CT_STAIR_DOWN || t === C.CT_EXIT;
  });
  ok("aucun meuble sur un escalier ni sur le seuil", stairProps.length === 0, stairProps.map(p => `${p.kind}(${p.x},${p.y})`).join(" "));
}
{
  // Les cellules : chacune doit s'ouvrir. Une cellule fermée est un décor —
  // sauf qu'ici on peut s'y enfermer, ce qui serait bien pire.
  const cells = C.COURT_ROOMS.find(r => r.key === "cells");
  const y0 = E.courtFloorY0(cells.floor);
  const vis = floodCourt(Math.floor(C.COURT_CORRIDOR.x + C.COURT_CORRIDOR.w / 2), y0 + Math.floor(C.COURT_FLOOR_H / 2));
  let bars = 0, cellDoors = 0;
  for (let y = y0 + cells.y; y < y0 + cells.y + cells.h; y++) for (let x = cells.x; x < cells.x + cells.w; x++) {
    if (cw.tile[cidx(x, y)] === C.CT_BARS) bars++;
    if (cw.tile[cidx(x, y)] === C.CT_DOOR && vis[cidx(x, y)]) cellDoors++;
  }
  ok("les cellules ont leurs grilles", bars >= 9, `${bars} cases de grille`);
  ok("chaque cellule s'ouvre (3 portes atteintes)", cellDoors >= 3, `${cellDoors} portes de cellule atteintes`);
}
{
  const orphans = [];
  for (let y = 0; y < cw.h; y++) for (let x = 0; x < cw.w; x++) {
    const i = cidx(x, y), t = cw.tile[i];
    if (!cw.solid[i]) continue;
    const drawn = t === C.CT_WALL || t === C.CT_WINDOW || t === C.CT_BARS || t === C.CT_VOID
      || cw.props.some(p => p.x === x && p.y === y);
    if (!drawn) orphans.push(`(${x},${y})=${t}`);
  }
  ok("aucune case bloquante invisible dans le bâtiment", orphans.length === 0, orphans.slice(0, 10).join(" "));
}

/* ═══════════════════════════════════════════════════════════════════════════
   LA COUPE DES ARBRES EN VILLE (426)
   ───────────────────────────────────────────────────────────────────────────
   ⚠️ LE CONTRÔLE QUI COMPTE N'EST PAS « ÇA COUPE » MAIS « ÇA NE TOUCHE PAS LA
   CARTE ». La ville est un singleton de module partagé par tous les remontages
   de l'onglet : si `resolveTownChop` écrivait dans `tw.objects`, les arbres
   coupés fuiteraient d'une ferme à l'autre — et personne ne relierait jamais
   « ma ville neuve est déboisée » à « j'ai coupé du bois sur l'autre code ».
   ═══════════════════════════════════════════════════════════════════════════ */
section("Valley Town — couper du bois");
{
  // Un fermier de banc, au format de newFarmer.
  const f = E.newFarmer("bench", "Banc", "m", 0);
  f.tools.axe = 1; f.energy = 100;
  // Une case d'arbre, prise sur la carte.
  let ti = -1;
  for (let i = 0; i < W * H && ti < 0; i++) if (tw.objects[i] === C.O_TREE || tw.objects[i] === C.O_TREE2) ti = i;
  ok("la ville a des arbres", ti >= 0);
  const objBefore = tw.objects[ti];
  const chop = {};
  const now = 1000000;
  let hits = 0, wood = 0;
  for (let k = 0; k < 12; k++) {
    const r = E.resolveTownChop(chop, tw, f, ti, now);
    if (!r.changed) break;
    hits++; wood += r.wood;
    if (r.felled) break;
  }
  ok("l'arbre tombe en plusieurs coups", hits === C.TREE_HP, `${hits} coups pour TREE_HP=${C.TREE_HP}`);
  ok("il rapporte du bois", wood > 0 && f.inv.wood === wood, `${wood} bois`);
  ok("l'énergie a été dépensée", f.energy < 100, `${f.energy}`);
  ok("⚠️ la carte de la ville n'a PAS été mutée", tw.objects[ti] === objBefore);
  ok("l'arbre est marqué en repousse", !!(chop[ti] && chop[ti].r));
  ok("il ne compte plus comme debout", E.townTreeStanding(tw, chop, ti) === false);
  ok("on ne peut pas recouper une souche", E.resolveTownChop(chop, tw, f, ti, now).changed === false);
  // La repousse.
  ok("il ne repousse pas avant l'heure", E.townTreeRegrow(chop, now + C.TOWN_TREE_REGROW_MS - 1).length === 0);
  const back = E.townTreeRegrow(chop, now + C.TOWN_TREE_REGROW_MS);
  ok("il repousse à l'heure dite", back.length === 1 && back[0] === ti);
  ok("le dictionnaire redescend à vide", Object.keys(chop).length === 0);
  ok("et l'arbre est de nouveau debout", E.townTreeStanding(tw, chop, ti) === true);
  // Épuisement : un fermier à plat ne coupe pas.
  const f2 = E.newFarmer("bench2", "Banc2", "m", 0); f2.energy = 0;
  const r2 = E.resolveTownChop({}, tw, f2, ti, now);
  ok("sans énergie, rien ne se passe", r2.changed === false && r2.toast === "tired");
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${fails === 0 ? "✅" : "❌"} ${total - fails}/${total} contrôles passés.\n`);
process.exit(fails === 0 ? 0 : 1);
