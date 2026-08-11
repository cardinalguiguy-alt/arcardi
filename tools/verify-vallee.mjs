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
  // Zip 427 — les nouveautés. La porte d'un commerce inaccessible, c'est une
  // fonctionnalité entière (la garde-robe) qu'aucune erreur ne signalerait.
  ["la porte de la Maison Garfield", C.TOWN_BOUTIQUE.x + Math.floor(C.TOWN_BOUTIQUE.w / 2), C.TOWN_BOUTIQUE.y + C.TOWN_BOUTIQUE.h + 1],
  ["la porte du salon de coiffure", C.TOWN_SALON.x + Math.floor(C.TOWN_SALON.w / 2), C.TOWN_SALON.y + C.TOWN_SALON.h + 1],
  ["le devant de la gare", C.TOWN_STATION.x + 1, C.TOWN_STATION.y + C.TOWN_STATION.h + 1],
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
/* ⚠️ ZIP 427 — LES TROIS BÂTIMENTS NOUVEAUX ENTRENT ICI, ET LE BANC LES A
   RÉCLAMÉS TOUT SEUL : au premier lancement après leur ajout au générateur, il a
   sorti 80 cases bloquantes orphelines — les emprises de la boutique, du salon
   et de la gare, bloquantes et pas encore rendues. C'est exactement le défaut
   des six cents haies du 425, attrapé cette fois AVANT d'aller en jeu. */
for (const b of [C.TOWN_CHURCH, C.TOWN_HALL, C.TOWN_COURT, C.TOWN_BOUTIQUE, C.TOWN_SALON, C.TOWN_STATION]) markRect(b);
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
  /* ⚠️⚠️ ZIP 439 — DEUX EXCEPTIONS SONT ENTRÉES ICI, ET IL FAUT DIRE POURQUOI,
     parce que desserrer un contrôle est le geste qui tue un banc (§10).
       * `archBridge` — un PONT qui bloque n'est pas un pont. Son tablier est
         du G_BRIDGE, exactement comme le ponton du 437, et le décor n'est que
         son garde-corps. C'est le seul objet du jeu dont la traversabilité est
         la raison d'être.
       * `lily` et `reedsWater` — mêmes que `stepStones` : ils flottent.
       * `stepStones` — ils sont posés SUR l'eau, qui est déjà infranchissable.
         Les marquer solides ne changerait rien au jeu et rendrait leur case
         « bloquante sans raison visible », c'est-à-dire qu'ils échoueraient au
         contrôle PRÉCÉDENT à la place de celui-ci.
     Le reste de la règle est intact : tout autre décor doit bloquer. Ce qu'on
     a écarté, ce n'est pas la mesure, c'est deux objets dont on peut nommer la
     raison — le contraire de ce qui s'est passé au 434 avec le seuil du taxi. */
  const WALKABLE = new Set(["kiosk", "archBridge", "stepStones", "lily", "reedsWater"]);
  const ghosts = tw.props.filter(p => !WALKABLE.has(p.kind) && !tw.solid[idx(p.x, p.y)]);
  ok("aucun décor n'est traversable", ghosts.length === 0, ghosts.slice(0, 8).map(p => `${p.kind}(${p.x},${p.y})`).join(" "));
}

section("Valley Town — géométrie");
{
  // Aucun bâtiment ne doit mordre sur une rue, un escalier, ou deux altitudes.
  const bad = [];
  const allB = [
    ...[C.TOWN_CHURCH, C.TOWN_HALL, C.TOWN_COURT, C.TOWN_BOUTIQUE, C.TOWN_SALON, C.TOWN_STATION]
      .map((b, k) => [["église", "mairie", "tribunal", "boutique", "salon", "gare"][k], b]),
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
  /* ⚠️⚠️ ZIP 438 — « RELIÉ AU REZ-DE-CHAUSSÉE » VEUT DIRE « CELUI DE SON
     BÂTIMENT ». Écrit `new Set([0])`, ce contrôle affirmait que TOUS les niveaux
     de la carte se rejoignent — c'était vrai tant qu'il n'y avait qu'un
     bâtiment, et c'est devenu FAUX le jour où la mairie a pris deux niveaux de
     plus dans la même grille : ses étages ne communiquent pas avec le sous-sol
     du tribunal, et c'est heureux. Le contrôle aurait poussé à percer un
     couloir entre deux bâtiments pour se taire. On vérifie donc, bâtiment par
     bâtiment, que chacun de ses niveaux est joignable depuis SON seuil — ce qui
     est la vraie question : peut-on ressortir de là où l'on est monté ? */
  const orphans = [];
  for (const [bk, bd] of Object.entries(C.COURT_BUILDINGS)) {
    const linked = new Set([bd.ground]);
    for (let k = 0; k < C.COURT_FLOORS.length; k++) {
      for (const sw of C.COURT_STAIRWELLS) {
        if (linked.has(sw.a)) linked.add(sw.b);
        if (linked.has(sw.b)) linked.add(sw.a);
      }
    }
    for (const f of bd.floors) if (!linked.has(f)) orphans.push(`${bk}/${C.COURT_FLOORS[f].key}`);
    // ... et qu'aucun escalier ne franchit la frontière entre deux bâtiments :
    // deux immeubles reliés par une cage seraient un seul immeuble.
    for (const sw of C.COURT_STAIRWELLS) {
      if (C.COURT_FLOORS[sw.a].bld !== C.COURT_FLOORS[sw.b].bld) orphans.push(`cage ${sw.a}↔${sw.b} traverse deux bâtiments`);
    }
  }
  ok("chaque niveau est relié au seuil de SON bâtiment", orphans.length === 0, orphans.length ? orphans.join(" · ") : `${C.COURT_FLOORS.length} niveaux, ${Object.keys(C.COURT_BUILDINGS).length} bâtiments`);
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
/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 427 — VALLEY TOWN HABITÉE.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️ CE QU'ON VÉRIFIE ICI N'EST PAS « LES RÉSIDENTS SE BALADENT » (personne ne
   peut le vérifier hors du jeu), MAIS LES DEUX CHOSES QUI, SI ELLES SONT
   FAUSSES, NE LÈVENT AUCUNE ERREUR ET NE SE VOIENT PAS :
     1. un ENDROIT où l'on envoie un résident et où il ne peut pas se tenir —
        il s'y colle, il abandonne au bout de 2,4 s, et on croit juste que les
        PNJ sont mous ;
     2. un ITINÉRAIRE d'escalier qui n'arrive pas — c'est-à-dire AUCUN résident
        ne monte jamais en Haute-Ville, ce qui a exactement l'air d'un choix.
   C'est la même famille que « la montée arrivait dans un mur » du 426.
   ═══════════════════════════════════════════════════════════════════════════ */
section("Valley Town habitée — les endroits où l'on vit");
const spotList = E.townSpots(tw);
ok("la ville a des endroits où s'arrêter", spotList.length > 20, `${spotList.length} endroits`);
{
  const kinds = new Set(spotList.map(s2 => s2.act));
  // Chaque famille d'activité doit exister quelque part, sinon la moitié des
  // répliques écrites ne sortira jamais — et rien ne le dira.
  const want = ["sit", "fountain", "kiosk", "stall", "well", "grave", "pier", "view", "window", "board", "statue", "pray"];
  const missing = want.filter(k => !kinds.has(k));
  ok("chaque activité a au moins un endroit", missing.length === 0, missing.join(" "));
}
{
  const bad = spotList.filter(s2 => !walkable(s2.x, s2.y));
  ok("aucun endroit n'est sur une case bloquée", bad.length === 0, bad.slice(0, 8).map(s2 => `${s2.act}(${s2.x},${s2.y})`).join(" "));
}
{
  /* ⚠️⚠️ ZIP 428 — LA VILLE EST-ELLE HABITÉE PARTOUT, OU SEULEMENT LÀ OÙ LE
     GÉNÉRATEUR A POSÉ DU MOBILIER ? C'est le contrôle qui manquait au 427, et
     son absence se voyait : sur 48 blocs ouverts de 28×28, TRENTE-TROIS
     n'avaient aucun endroit de vie. Le verger, le lac, les artisans, la foire,
     le parc et toutes les avenues étaient du décor traversé, jamais habité.
     Rien ne le disait, parce que ce n'est un défaut d'AUCUNE ligne de code :
     c'est un défaut de la SOMME, et seule une mesure agrégée le voit. */
  const cell = 28;
  const grid = new Map();
  for (const s2 of spotList) grid.set(`${Math.floor(s2.x / cell)},${Math.floor(s2.y / cell)}`, true);
  /* ⚠️⚠️ ON NE COMPTE QUE LES BLOCS BÂTIS, ET CETTE DÉFINITION EST LE CŒUR DU
     CONTRÔLE. Premier jet : « tout bloc praticable doit avoir un endroit de
     vie ». Il en trouvait dix-huit vides — et en les regardant, ils sont tous
     de la PELOUSE NUE. Valley Town occupe une fraction de sa carte de 224×168 ;
     le reste est de la prairie que personne n'a encore aménagée (c'est écrit
     noir sur blanc dans CLAUDE.md §13 : « que met-on dans le sud-est ? »). Y
     poser des endroits pour verdir un compteur, c'est fabriquer des résidents
     qui vont contempler un champ vide — du remplissage, exactement ce que ce
     projet refuse.
     Un bloc est donc un QUARTIER s'il porte de l'aménagement : au moins 15 %
     de ses cases praticables ne sont pas de l'herbe (dallage, chemin, parvis).
     Ce que le contrôle dit alors est ce qu'on veut vraiment savoir : « tout
     endroit que quelqu'un a construit a-t-il une raison qu'on y aille ? » */
  let built = 0, meadow = 0; const dead = [];
  for (let by = 0; by * cell < H; by++) for (let bx = 0; bx * cell < W; bx++) {
    let free = 0, paved = 0;
    for (let y = by * cell; y < Math.min(H, (by + 1) * cell); y++)
      for (let x = bx * cell; x < Math.min(W, (bx + 1) * cell); x++) {
        if (!walkable(x, y)) continue;
        free++;
        if (tw.ground[idx(x, y)] !== C.G_GRASS) paved++;
      }
    if (free <= cell * cell / 4) continue;
    if (paved < free * 0.15) { meadow++; continue; }
    built++; if (!grid.has(`${bx},${by}`)) dead.push(`${bx},${by}`);
  }
  ok(`chaque quartier bâti a une raison qu'on y aille (${built - dead.length}/${built})`,
     dead.length === 0, (dead.length ? `blocs bâtis sans endroit : ${dead.join(" ")} · ` : "") + `${meadow} blocs de prairie non aménagée, hors compte`);
  /* ⚠️ ET LA RÉPARTITION COMPTE AUTANT QUE LA COUVERTURE. Le tirage d'une
     destination est uniforme sur cette liste : une famille d'endroits
     sur-représentée devient l'endroit où tout le monde va. Au 427, seize des
     soixante et un endroits étaient des TOMBES — un quart de la vie sociale de
     Valley Town se passait au cimetière, sans que ce soit l'intention de
     personne. */
  /* ⚠️ ON COMPTE LES DESTINATIONS, PAS LES POINTS — et la nuance est arrivée
     avec les bancs à trois places (429). Trois places sur le MÊME banc, c'est
     un seul endroit où aller : les compter trois fois faisait mécaniquement
     passer « sit » à 36 % et rougir le contrôle sur un changement qui, lui,
     était bon. Un déséquilibre de VARIÉTÉ se mesure en lieux distincts. */
  const byAct = new Map(), seen2 = new Set();
  for (const s2 of spotList) {
    const key = s2.act === "sit" ? `sit@${s2.bx},${s2.by}` : `${s2.act}@${s2.x},${s2.y}`;
    if (seen2.has(key)) continue;
    seen2.add(key);
    byAct.set(s2.act, (byAct.get(s2.act) || 0) + 1);
  }
  const dests = seen2.size;
  const worst = [...byAct.entries()].sort((a2, b2) => b2[1] - a2[1])[0];
  ok("aucune activité n'écrase toutes les autres", worst[1] <= dests * 0.2,
     `la plus fréquente : ${worst[0]} ${worst[1]}/${dests} destinations (${(100 * worst[1] / dests).toFixed(0)} %)`);
}
{
  const bad = spotList.filter(s2 => !seen[idx(s2.x, s2.y)]);
  ok("tous les endroits sont ATTEIGNABLES depuis la gare", bad.length === 0, bad.slice(0, 8).map(s2 => `${s2.act}(${s2.x},${s2.y})`).join(" "));
}
{
  /* Une assise doit désigner un VRAI banc, ADJACENT à la case où l'on se tient.
     ⚠️ « Juste au nord » était la règle du 427, et elle rendait inutilisables
     les trois bancs de la promenade du lac (dont le sud est l'eau) — voir
     E.townSpots. On vérifie donc l'adjacence, pas une direction. */
  /* ⚠️ ZIP 429 — LE CRITÈRE EST « À PORTÉE DU BANC », plus « collé au banc ».
     Une place est un DÉCALAGE le long d'un sprite de 40 px : on rejoint la
     place de gauche par la case de gauche, qui n'est plus adjacente à la case
     du banc. Ce qu'il faut vraiment garantir, c'est qu'on ne s'assoit pas sur
     un banc situé à l'autre bout de la rue. */
  const bad = (spotList.filter(s2 => s2.act === "sit")).filter(s2 => {
    if (s2.bx === undefined || s2.seat === undefined) return true;
    if (Math.abs(s2.bx - s2.x) > 2 || Math.abs(s2.by - s2.y) > 1) return true;
    return !tw.props.some(pr => pr.kind === "bench" && pr.x === s2.bx && pr.y === s2.by);
  });
  ok("chaque assise correspond à un vrai banc, à portée", bad.length === 0, bad.slice(0, 6).map(s2 => `(${s2.x},${s2.y})`).join(" "));
  {
    // ⚠️ ET DEUX PLACES DU MÊME BANC NE PARTAGENT PAS LEUR POINT D'ATTENTE :
    // sinon deux résidents visent la même case, s'y poussent, et l'un des deux
    // « s'assoit » sur la place de l'autre. Silencieux, et très visible.
    const seen3 = new Set(); const dup = [];
    for (const s2 of spotList) {
      if (s2.act !== "sit") continue;
      const k = `${s2.x},${s2.y}`;
      if (seen3.has(k)) dup.push(k); else seen3.add(k);
    }
    ok("deux places d'un banc ne se marchent pas dessus", dup.length === 0, dup.slice(0, 6).join(" "));
  }
  /* ⚠️ ET TOUS LES BANCS DE LA VILLE DOIVENT ÊTRE ASSIABLES. C'est le contrôle
     que le 427 n'avait pas : il vérifiait que chaque assise a un banc, jamais
     que chaque banc a une assise. Trois bancs morts au bord du lac ont vécu un
     zip entier dans cet angle. */
  const benches = tw.props.filter(pr => pr.kind === "bench");
  const seated = new Set(spotList.filter(s2 => s2.act === "sit").map(s2 => `${s2.bx},${s2.by}`));
  const orphan = benches.filter(pr => !seated.has(`${pr.x},${pr.y}`));
  ok(`les ${benches.length} bancs de la ville sont tous assiables`, orphan.length === 0,
     orphan.slice(0, 6).map(pr => `(${pr.x},${pr.y})`).join(" "));
}
{
  /* ⚠️ AUCUN MEUBLE DEVANT UNE PORTE DE COMMERCE — la version « ville » du
     garde-fou du tribunal (426), où les colonnes du couloir muraient six pièces
     sur dix-sept. Les portes sont au MILIEU de la façade sud (c'est ce que
     suppose nearCivicDoor) : on vérifie les trois cases devant chacune. */
  const bad = [];
  for (const [name, b] of [["boutique", C.TOWN_BOUTIQUE], ["salon", C.TOWN_SALON], ["tribunal", C.TOWN_COURT], ["gare", C.TOWN_STATION]]) {
    const dx = b.x + Math.floor(b.w / 2);
    for (let k = -1; k <= 1; k++) for (let dy = 1; dy <= 2; dy++) {
      if (!walkable(dx + k, b.y + b.h + dy - 1)) bad.push(`${name}(${dx + k},${b.y + b.h + dy - 1})`);
    }
  }
  ok("aucun meuble ne bouche l'entrée d'un commerce", bad.length === 0, bad.slice(0, 8).join(" "));
}

section("Valley Town habitée — LA NAVIGATION, MESURÉE EN MARCHANT");
/* ═══════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ ZIP 428 — CE CHAPITRE A REMPLACÉ « LES ITINÉRAIRES D'ESCALIER », ET LE
   REMPLACEMENT EST LA LEÇON. Le 427 vérifiait ici que `townStairRoute`
   produisait des paliers praticables — ce qui était VRAI, et qui n'a jamais
   empêché quatre trajets sur cinq d'échouer. Le banc contrôlait la seule chose
   qui marchait déjà.
   Ce qu'il faut contrôler, c'est CE QU'ON PROMET AU JOUEUR : « les résidents se
   déplacent en ville ». Donc on ne vérifie plus une table intermédiaire, on
   REJOUE LE DÉPLACEMENT — le vrai suiveur, la vraie boîte de collision, la
   vraie règle de dénivelé, à 60 images par seconde — et on compte les arrivées.
   ⚠️ Et c'est la seule forme de contrôle qui aurait attrapé le défaut du 427 :
   aucune assertion sur une structure de données ne pouvait le voir.
   ═══════════════════════════════════════════════════════════════════════════ */
const elevAt = (x, y) => tw.elev[idx(Math.round(x), Math.round(y))];
{
  const nav = E.townNav(tw);
  ok("la grille de navigation sort du moteur", !!nav && nav.walk.length === W * H);
  /* Les POCHES. La ville doit en avoir UNE qui contient tout ce qui compte :
     une seconde poche habitable serait une partie de la ville où l'on ne peut
     ni entrer ni sortir, et personne ne le verrait avant d'y aller. */
  const sizes = new Map();
  for (let i = 0; i < nav.comp.length; i++) if (nav.comp[i] >= 0) sizes.set(nav.comp[i], (sizes.get(nav.comp[i]) || 0) + 1);
  const ranked = [...sizes.entries()].sort((p, q) => q[1] - p[1]);
  const strays = ranked.slice(1).filter(([, n]) => n > 8);
  ok("la ville tient dans une seule poche praticable", strays.length === 0,
     `principale ${ranked[0][1]} cases` + (strays.length ? ` · îlots : ${strays.map(([, n]) => n).join(",")}` : ""));
  const spawnComp = nav.comp[idx(Math.round(C.TOWN_SPAWN.x), Math.round(C.TOWN_SPAWN.y))];
  ok("le quai est dans la poche principale", spawnComp === ranked[0][0]);
}
/* ---- LE VRAI SUIVEUR, RECOPIÉ DEPUIS townResidentRoam ----------------------
   ⚠️ C'EST UNE DUPLICATION, ELLE EST ASSUMÉE, ET ELLE EST SIGNALÉE. Le suiveur
   vit dans le composant React, donc il n'est pas importable. La recopier, c'est
   accepter qu'elle puisse diverger — mais un banc qui simulerait un déplacement
   IDÉALISÉ ne vaudrait rien : il validerait des chemins que le jeu ne parcourt
   pas, c'est-à-dire exactement le stub menteur du §10. Les trois lignes qui
   comptent (boîte de collision, dénivelé relu par axe, recalage sur le point de
   passage) sont donc ici mot pour mot. */
function elevBox(x, y) {
  const fx = Math.floor(x), fy = Math.floor(y);
  if (fx < 0 || fy < 0 || fx >= W || fy >= H) return 0;
  return tw.elev[idx(fx, fy)];
}
function canStandSim(x, y, fromE) {
  const r = 0.3;
  for (const [px, py] of [[x - r, y], [x + r, y], [x - r, y + 0.35], [x + r, y + 0.35]]) {
    const fx = Math.floor(px), fy = Math.floor(py);
    if (fx < 0 || fy < 0 || fx >= W || fy >= H) return false;
    if (!walkable(fx, fy)) return false;
    if (fromE !== undefined && Math.abs(tw.elev[idx(fx, fy)] - fromE) > C.TOWN_STEP_MAX) return false;
  }
  return true;
}
function walkTo(from, sp) {
  let legs = E.townFindPath(tw, from.x, from.y, sp.x, sp.y);
  if (!legs || !legs.length) return { ok: false, why: "aucun chemin" };
  let x = from.x, y = from.y, li = 0, stuck = 0, t = 0, tries = 0;
  const DT = 1 / 60, speed = C.VISITOR_SPEED * 0.7 * 0.9;
  while (t < 240) {
    const tgt = legs[li];
    const dx = tgt.x - x, dy = tgt.y - y, d = Math.hypot(dx, dy);
    if (d < C.TOWN_WP_ARRIVE) {           // recalage : voir townResidentRoam
      x = tgt.x; y = tgt.y; li++;
      if (li >= legs.length) return { ok: true, t, wp: legs.length };
      continue;
    }
    const s = speed * DT, ux = dx / d, uy = dy / d;
    // Les deux conditions de townResidentRoam (428) : la boîte est valide vue
    // de la position PRÉCÉDENTE, et valide vue D'ELLE-MÊME.
    const canGo = (px, py) => canStandSim(px, py, elevBox(x, y + 0.2)) && canStandSim(px, py, elevBox(px, py + 0.2));
    let moved = false;
    const nx = x + ux * s;
    if (canGo(nx, y)) { x = nx; moved = true; }
    const ny = y + uy * s;
    if (canGo(x, ny)) { y = ny; moved = true; }
    // Le rattrapage en diagonale : voir la note de townResidentRoam (428).
    if (!moved && canGo(nx, ny)) { x = nx; y = ny; moved = true; }
    if (!moved) {
      stuck += DT;
      // Le recalcul du garde anti-blocage, borné comme dans le jeu.
      if (stuck > 1.2 && tries < C.TOWN_REPATH_TRIES) {
        tries++; stuck = 0;
        const again = E.townFindPath(tw, x, y, sp.x, sp.y);
        if (again && again.length) { legs = again; li = 0; continue; }
      }
      if (stuck > 2.4) return { ok: false, why: `bloqué en (${x.toFixed(1)},${y.toFixed(1)}) vers ${sp.act}(${sp.x},${sp.y})` };
    } else stuck = 0;
    t += DT;
  }
  return { ok: false, why: "jamais arrivé" };
}
{
  /* ⚠️⚠️ LE CONTRÔLE QUI COMPTE, ET IL EST EXHAUSTIF : chaque endroit vers
     chaque autre. C'est ~3 700 trajets rejoués image par image, quelques
     secondes de calcul, et c'est le prix d'une réponse qui n'est pas un
     échantillon. Le 427 aurait affiché 24 % ici. */
  const spawn = { x: C.TOWN_SPAWN.x, y: C.TOWN_SPAWN.y };
  let done = 0, tot = 0; const why = [];
  for (const sp of spotList) { tot++; const r = walkTo(spawn, sp); if (r.ok) done++; else why.push(r.why); }
  ok(`depuis le quai, on atteint les ${tot} endroits`, done === tot, `${done}/${tot}` + (why.length ? " · " + why.slice(0, 3).join(" · ") : ""));
  let d2 = 0, t2 = 0; const why2 = []; const wps = [];
  for (const a2 of spotList) for (const b2 of spotList) {
    if (a2 === b2) continue;
    t2++; const r = walkTo(a2, b2);
    if (r.ok) { d2++; wps.push(r.wp); } else if (why2.length < 4) why2.push(r.why);
  }
  const rate = 100 * d2 / t2;
  /* ⚠️ LE SEUIL EST À 100 %, ET C'EST DÉLIBÉRÉ. Il a été tenu par cinq
     corrections successives au 428, chacune trouvée PAR CE CONTRÔLE et par
     aucun autre : l'heuristique inconsistante, le tas qui débordait en silence,
     l'altitude de référence décalée d'un échantillon, la réduction qui pouvait
     ne plus avancer, et la position dont on ne peut plus repartir. Aucune n'a
     jamais levé la moindre erreur. Descendre le seuil « pour laisser du bruit »
     reviendrait à s'interdire de les revoir : à 24 % (le taux du 427) comme à
     99 %, ce banc dirait OK. Le taux est soit parfait, soit à comprendre. */
  ok(`d'un endroit à un autre : ${rate.toFixed(1)} % d'arrivées`, d2 === t2, `${d2}/${t2}` + (why2.length ? " · " + why2.join(" · ") : ""));
  wps.sort((p, q) => p - q);
  /* ⚠️ LE NOMBRE DE POINTS DE PASSAGE EST UN CONTRÔLE RÉSEAU, PAS ESTHÉTIQUE.
     Un chemin rendu case par case tiendrait dans le même message (la taille
     n'est pas facturée, §3) mais donnerait un PNJ qui zigzague de centre de
     case en centre de case chez l'invité, qui rejoue la ligne brisée telle
     quelle. Si ce chiffre explose, c'est que la réduction ne réduit plus. */
  ok("les chemins sont réduits à quelques points de passage", wps[wps.length - 1] <= 30,
     `médiane ${wps[wps.length >> 1]}, max ${wps[wps.length - 1]}`);
}
{
  // Les endroits EN HAUTEUR gardent leur contrôle propre : c'est le seul dont
  // l'échec est parfaitement silencieux (« personne ne monte jamais » a l'air
  // d'un choix de conception, pas d'un bogue). Il ne teste plus une table
  // d'itinéraires, il fait monter quelqu'un.
  const spawn = { x: C.TOWN_SPAWN.x, y: C.TOWN_SPAWN.y };
  const highSpots = spotList.filter(s2 => elevAt(s2.x, s2.y) > 0.01);
  ok("il y a bien des endroits en hauteur", highSpots.length > 0, `${highSpots.length}`);
  const bad = highSpots.filter(sp => !walkTo(spawn, sp).ok);
  ok(`on monte réellement vers les ${highSpots.length} endroits en hauteur`, bad.length === 0,
     bad.slice(0, 5).map(s2 => `${s2.act}(${s2.x},${s2.y})`).join(" · "));
}
{
  // Les paliers d'escalier restent contrôlés pour eux-mêmes : ils sont le seul
  // endroit où la carte peut rendre la Haute-Ville inaccessible d'un coup.
  const bad = [];
  for (const st of C.TOWN_STAIRS) {
    const cx = st.dir === "e" ? st.x - 1 : st.x + ((st.w - 1) >> 1);
    const cy = st.dir === "e" ? st.y + ((st.w - 1) >> 1) : st.y + st.len;
    const hx = st.dir === "e" ? st.x + st.len : st.x + ((st.w - 1) >> 1);
    const hy = st.dir === "e" ? st.y + ((st.w - 1) >> 1) : st.y - 1;
    for (const [tag, x, y, want] of [["bas", cx, cy, st.from], ["haut", hx, hy, st.to]]) {
      if (!walkable(x, y)) bad.push(`${tag}(${x},${y}) bloqué`);
      else if (Math.abs(tw.elev[idx(x, y)] - want) > 0.01) bad.push(`${tag}(${x},${y}) alt ${tw.elev[idx(x, y)]}≠${want}`);
    }
  }
  ok("chaque volée a deux paliers libres, à la bonne altitude", bad.length === 0, bad.join(" · "));
}

section("Valley Town — le marché du champ de foire (430)");
{
  /* ⚠️⚠️ CE QU'ON VÉRIFIE ICI EST LA SEULE CHOSE QUI PUISSE CASSER EN SILENCE :
     que le cours soit une PURE FONCTION DU JOUR. Tout le reste du marché
     (l'or, les stocks) est arbitré par l'hôte et se voit tout de suite si
     c'est faux. Le cours, lui, est calculé SÉPARÉMENT chez chaque joueur — si
     deux clients ne trouvaient pas le même chiffre, chacun aurait un écran
     parfaitement cohérent avec lui-même et ils se disputeraient sur le prix du
     blé sans qu'aucune erreur ne soit levée. C'est le défaut le plus cher
     possible pour un jeu à deux, et le moins visible. */
  let stable = true, inRange = true, floored = true;
  for (let day = 1; day <= 400; day++) {
    for (const fam of E.MARKET_FAMILIES) {
      const a = E.marketRate(day, fam), b = E.marketRate(day, fam);
      if (a !== b) stable = false;                       // déterminisme strict
      if (a < 1 || a > 1 + C.MARKET_SPREAD + 0.001) inRange = false;
    }
  }
  ok("le cours est déterministe (même jour, même famille, même prix)", stable);
  ok(`le cours reste dans [0 ; +${Math.round(C.MARKET_SPREAD * 100)} %]`, inRange);
  /* ⚠️ LE PLANCHER EST UNE PROMESSE FAITE AU JOUEUR, pas une conséquence : le
     texte du marché dit « jamais moins que le bac ». Un arrondi malheureux sur
     un article à 3 or suffirait à en faire un mensonge. */
  for (let day = 1; day <= 200; day++) {
    for (const [item, base] of [["crop", 3], ["berry", 1], ["wood", 2], ["fish", 7], ["product", 125]]) {
      if (E.marketPrice(day, item, base) < base) floored = false;
    }
  }
  ok("le marché ne paie JAMAIS moins que le bac de la ferme", floored);
  {
    // Le jour de marché doit exister, revenir régulièrement, et payer mieux
    // qu'un jour ordinaire EN MOYENNE — sans quoi l'événement n'en est pas un.
    let mdays = 0, sumM = 0, sumN = 0, nN = 0;
    for (let day = 1; day <= 700; day++) {
      const r = E.MARKET_FAMILIES.reduce((a2, f2) => a2 + E.marketRate(day, f2), 0) / E.MARKET_FAMILIES.length;
      if (E.isMarketDay(day)) { mdays++; sumM += r; } else { sumN += r; nN++; }
    }
    ok("il y a bien un jour de marché par semaine", mdays === Math.floor(700 / C.MARKET_DAY_EVERY), `${mdays} sur 700 jours`);
    ok("un jour de marché paie mieux qu'un jour ordinaire", sumM / mdays > sumN / nN,
       `${((sumM / mdays - 1) * 100).toFixed(1)} % contre ${((sumN / nN - 1) * 100).toFixed(1)} %`);
  }
  {
    /* ⚠️ TOUT CE QUI SE VEND AU BAC DOIT SE VENDRE AU MARCHÉ. Une famille
       oubliée dans `marketFamilyOf` ne lève rien : elle se vend simplement au
       prix de la ferme, en ville, pour toujours — et le joueur conclut que le
       marché « ne marche pas pour le poisson ». */
    const sellable = ["crop", "fish", "sea", "product", "berry", "fruit", "wood", "stone"];
    const orphan = sellable.filter(i2 => !E.marketFamilyOf(i2));
    ok("chaque article vendable au bac a une famille au marché", orphan.length === 0, orphan.join(" "));
  }
  {
    // Le champ de foire doit être ATTEIGNABLE et sa zone de vente praticable :
    // un marché où l'on ne peut pas se tenir est un menu qui ne s'ouvre jamais.
    const mk = C.TOWN_MARKET;
    const cx2 = mk.x + (mk.w >> 1), cy2 = mk.y + (mk.h >> 1);
    ok("on atteint le centre du champ de foire depuis la gare", !!seen[idx(cx2, cy2)], `(${cx2},${cy2})`);
    const stalls = tw.props.filter(pr => pr.kind === "stall");
    ok("le champ de foire a bien ses étals", stalls.length >= 6, `${stalls.length} étals`);
    /* ⚠️⚠️ ZIP 431 — LA ZONE AVANT LES DISTANCES, ET CE CONTRÔLE VAUT PLUS QUE
       TOUS LES AUTRES DE CETTE SECTION. Le champ de foire occupe x∈[34;68],
       y∈[70;104] en coordonnées de VILLE. La ferme fait 180×140 : ces mêmes
       coordonnées existent chez elle, au milieu des champs. Tant que
       `atMarket` ne lisait que px/py, un fermier planté au bon endroit de son
       pré passait le contrôle « je suis au marché » — et depuis ce zip, ce
       contrôle est la SEULE chose qui interdit de vendre depuis la ferme.
       C'est le piège des deux cartes (§4 de CLAUDE.md) dans sa forme la plus
       chère, et il ne lève évidemment aucune erreur. */
    const inside = { px: cx2, py: cy2 };
    ok("on vend au centre du champ de foire", E.atMarket({ ...inside, pz: "town" }));
    ok("⚠️ la MÊME position, mais à la ferme, ne vend pas", !E.atMarket({ ...inside, pz: "farm" }));
    ok("une requête sans zone est refusée (échec fermé)", !E.atMarket(inside));
    ok("hors du champ de foire, on ne vend pas", !E.atMarket({ px: C.TOWN_SPAWN.x, py: C.TOWN_SPAWN.y, pz: "town" }));
    /* ⚠️ CHAQUE MÉTIER D'ÉTAL DOIT AVOIR SON SPRITE. Le générateur distribue
       des indices dans TOWN_STALL_TRADES ; un rendu qui modulerait sur une
       autre longueur poserait des cases SOLIDES SANS DESSIN — un mur invisible,
       le défaut du 425, recréé par une constante recopiée. */
    ok("aucun étal ne sort de la table des métiers",
       stalls.every(pr => (pr.v | 0) >= 0 && (pr.v | 0) < C.TOWN_STALL_TRADES.length),
       `${C.TOWN_STALL_TRADES.length} métiers`);
    ok("deux étals voisins ne font pas le même métier", (() => {
      const rows = {};
      for (const s2 of stalls) (rows[s2.y] = rows[s2.y] || []).push(s2);
      for (const list of Object.values(rows)) {
        list.sort((a, b) => a.x - b.x);
        for (let k = 0; k + 1 < list.length; k++) if (list[k].v === list[k + 1].v) return false;
      }
      return true;
    })());
    /* L'arche : DEUX poteaux solides, et on passe ENTRE eux. Un seul prop
       (donc une seule case) serait un portique infranchissable ; zéro case
       solide serait un décor traversable, que le contrôle du dessus refuse. */
    const arch = tw.props.filter(pr => pr.kind === "marketArch");
    ok("l'arche du marché a ses deux poteaux", arch.length === 2, `${arch.length}`);
    ok("on passe sous l'arche", arch.length === 2 && (() => {
      const [a, b] = arch.sort((p, q) => p.x - q.x);
      if (a.y !== b.y || b.x - a.x < 2) return false;
      for (let x = a.x + 1; x < b.x; x++) if (tw.solid[idx(x, a.y)]) return false;
      return true;
    })());
  }
  {
    /* ⚠️⚠️ ZIP 431 — TOUT CE QUI SE VEND DOIT ÊTRE VENDABLE AU MARCHÉ, parce
       que c'est devenu le SEUL guichet. Un article oublié dans `marketFamilyOf`
       ne lève rien : il se vend simplement au prix de la ferme, pour toujours,
       et le joueur conclut que « le marché ne marche pas pour la farine ». */
    const sellable = ["crop", "fish", "sea", "product", "berry", "fruit", "wood", "stone",
                      "gem", "flour", "sugar", "commonFish", "commonAnimal", "craft",
                      "orchardFruit", "fruitProduct"];
    const orphan = sellable.filter(i2 => !E.marketFamilyOf(i2));
    ok("les seize sortes de marchandise ont une famille au marché", orphan.length === 0, orphan.join(" "));
    ok("la bijouterie n'a délibérément PAS de cote", E.marketFamilyOf("jewelry") === null);
    /* ⚠️ LE PRIX D'UN PRODUIT D'ARTISAN N'A QU'UN SEUL BARÈME depuis le 431 : il
       était écrit dans la requête `sellCraft` (donc invisible du marché). */
    const sh = { crafts: {} };
    const noPrice = E.CRAFT_SELL_ITEMS.filter(k => !(E.craftSellPrice(sh, k) > 0));
    ok("chaque produit d'artisan a un prix", noPrice.length === 0, noPrice.join(" "));
    /* ⚠️ LE VERROU DE VENTE EST UNE LISTE, ET ELLE DOIT COUVRIR LES ANCIENNES
       REQUÊTES. Retirer les boutons de la ferme ne suffit pas : un onglet resté
       ouvert sur la version d'avant enverrait toujours `sell`. */
    for (const k of ["sell", "sellCraft", "sellFruit", "sellFruitProduct", "sellJewelry"]) {
      ok(`« ${k} » est bien traitée comme une vente de produit`, E.isProduceSale({ kind: k }));
    }
    /* ⚠️ ET CELLES QUI DOIVENT RESTER POSSIBLES À LA FERME : vendre à un
       visiteur qui frappe à la porte, c'est rendre service, pas écouler une
       récolte — c'est la seule vente que Guillaume a demandé de garder. */
    for (const k of ["visitorDeal", "visitorSwap", "sellAnimal", "sellDecor"]) {
      ok(`« ${k} » reste possible à la ferme`, !E.isProduceSale({ kind: k }));
    }
  }
  {
    /* ═══════════════════════════════════════════════════════════════════════
       ZIP 431 — ON VEND POUR DE VRAI, ET L'OR ARRIVE.
       ⚠️⚠️ C'EST LE SEUL CONTRÔLE DE CETTE SECTION QUI PORTE SUR DE L'ARGENT,
       et c'est la demande explicite de Guillaume : « attention de ne pas casser
       la mécanique de vente par ces changements (l'argent doit bien être
       récupéré et les opérations sauvegardées) ». Tout le reste de ce fichier
       vérifie des règles ; ici on JOUE la vente et on compte les pièces.
       ⚠️ Le piège que ça attrape est le double crédit : trois résolveurs
       (vergers, produits aux fruits, bijouterie) créditent `shared.money`
       eux-mêmes, les autres renvoient un `moneyDelta` que l'hôte applique. Se
       tromper de famille paierait la vente deux fois — sans erreur, sans trace,
       et l'or est partagé. */
    const mk = C.TOWN_MARKET;
    const HERE = { px: mk.x + (mk.w >> 1), py: mk.y + (mk.h >> 1), pz: "town" };
    const day = 3;
    const mkFarmer = () => {
      const f = E.newFarmer("t1", "Test", "f", 0);
      E.normalizeFarmer(f);
      f.inv.crops[0] = 10; f.inv.wood = 7;
      f.inv.fruits = { strawberry: 13 };
      return f;
    };
    const mkShared = () => ({
      money: 0, totalEarned: 0, gems: C.GEMS.map(() => 0), flour: 4, sugar: 0,
      craftStock: { ...E.newCraftStock(), honey: 3 }, crafts: E.newCrafts(),
      gregStock: { wood: 0, stone: 0, fertilizer: 0, gold: 0, fish: C.FISH.map(() => 0), animals: C.ANIMALS.map(() => 0) },
      station: E.newStationState(),
    });
    /* Une vente = ce que l'hôte applique. On refait ici EXACTEMENT ce que fait
       la branche `townSell` de FermeGame : `s.money += r.moneyDelta`. Si les
       deux divergent un jour, c'est ce contrôle qui ment — d'où la note. */
    const play = (f, s, m) => {
      const r = E.resolveTownSell(f, { ...HERE, ...m }, day, s);
      s.money += r.moneyDelta; s.totalEarned += r.earnedDelta;
      return r;
    };
    {
      const f = mkFarmer(), s = mkShared();
      const r = play(f, s, { item: "crop", crop: 0, n: 4 });
      const unit = E.marketPrice(day, "crop", C.CROPS[0].sell);
      ok("vendre 4 récoltes retire 4 récoltes", f.inv.crops[0] === 6, `${f.inv.crops[0]} restantes`);
      ok("... et crédite exactement le prix du jour", s.money === 4 * unit, `${s.money} or pour 4 × ${unit}`);
      ok("... et compte dans le total gagné", s.totalEarned === s.money);
      ok("... et le gain annoncé est celui payé", r.gain === s.money);
    }
    {
      // Le PANIER : une requête, plusieurs lignes, un seul total.
      const f = mkFarmer(), s = mkShared();
      const r = play(f, s, { lines: [
        { item: "crop", crop: 0, n: 2 },
        { item: "wood", n: 3 },
        { item: "flour", n: 2 },
        { item: "gem", gem: 0, n: 9 },              // stock nul : la ligne ne rapporte rien
      ] });
      const want = 2 * E.marketPrice(day, "crop", C.CROPS[0].sell)
                 + 3 * E.marketPrice(day, "wood", C.WOOD_SELL)
                 + 2 * E.marketPrice(day, "flour", C.FLOUR_SELL);
      ok("le panier vend toutes ses lignes en une requête", s.money === want, `${s.money} attendu ${want}`);
      ok("... et retire chaque stock", f.inv.crops[0] === 8 && f.inv.wood === 4 && s.flour === 2,
         `blé ${f.inv.crops[0]} · bois ${f.inv.wood} · farine ${s.flour}`);
      ok("... et une ligne à stock nul ne casse pas le panier", r.gain === want);
    }
    {
      /* ⚠️ LE DOUBLE CRÉDIT, contrôlé de front. `resolveSellFruit` crédite
         `shared.money` lui-même : si `resolveTownSell` renvoyait AUSSI le total,
         la barquette serait payée deux fois. */
      const f = mkFarmer(), s = mkShared();
      play(f, s, { item: "orchardFruit", fruit: "strawberry", punnet: true, n: 2 });
      const base = 2 * C.punnetPrice("strawberry");
      const want = Math.max(base, Math.ceil(base * E.marketRate(day, "crop")));
      ok("une barquette de verger n'est PAS payée deux fois", s.money === want, `${s.money} attendu ${want}`);
      ok("... et elle coûte bien six fruits pièce", (f.inv.fruits.strawberry | 0) === 13 - 2 * C.PUNNET_SIZE,
         `${f.inv.fruits.strawberry} restants`);
      ok("... et la barquette rapporte plus que six fruits vendus un par un",
         C.punnetPrice("strawberry") > 6 * C.fruitSpec("strawberry").sell);
    }
    {
      const f = mkFarmer(), s = mkShared();
      play(f, s, { item: "craft", craft: "honey", n: 2 });
      const want = 2 * E.marketPrice(day, "craft", E.craftSellPrice(s, "honey"));
      ok("un produit d'artisan se vend au marché", s.money === want, `${s.money} attendu ${want}`);
      ok("... et sort de la réserve commune", (s.craftStock.honey | 0) === 1);
    }
    {
      /* ⚠️ LE REFUS EST LA MOITIÉ DE LA MÉCANIQUE : la vente ne doit RIEN
         changer quand on n'est pas au marché — ni l'or, ni le stock. Un refus
         qui retirerait quand même la marchandise serait le pire bogue possible. */
      const f = mkFarmer(), s = mkShared();
      const r = play(f, s, { item: "crop", crop: 0, n: 4, pz: "farm" });
      ok("depuis la ferme, la vente est refusée", r.toast === "farMarket", r.toast || "aucun message");
      ok("... et RIEN n'a bougé", s.money === 0 && f.inv.crops[0] === 10, `${s.money} or · ${f.inv.crops[0]} blé`);
    }
    {
      // Le plancher, joué : au pire on touche le prix du bac, jamais moins.
      let under = 0;
      for (let d = 1; d <= 120; d++) {
        const f = mkFarmer(), s = mkShared();
        play(f, s, { item: "crop", crop: 0, n: 1 });
        if (s.money < C.CROPS[0].sell) under++;
      }
      ok("sur 120 jours, jamais moins que le bac de la ferme", under === 0, `${under} jours sous le prix`);
    }
  }
}

section("Valley Town habitée — la famille et la garde-robe");
{
  const bad = [];
  for (const [rid, fam] of Object.entries(C.RESIDENT_FAMILY)) {
    const ro = C.VISITOR_ROSTER.find(r => r.rid === Number(rid));
    if (!ro) { bad.push(`rid ${rid} inconnu du roster`); continue; }
    for (const g of fam) {
      if (!g.name || !g.rel) bad.push(`${ro.name}: membre incomplet`);
      if (g.gender !== "m" && g.gender !== "f") bad.push(`${ro.name}/${g.name}: genre`);
      if (!(g.outfit >= 0 && g.outfit < C.OUTFITS.length)) bad.push(`${ro.name}/${g.name}: outfit hors catalogue`);
    }
  }
  ok("chaque famille est rattachée à un résident réel et complète", bad.length === 0, bad.slice(0, 6).join(" · "));
  ok("Carla sort toujours accompagnée", C.ALWAYS_GUEST_RIDS.includes(C.CARLA_RID) && (C.RESIDENT_FAMILY[C.CARLA_RID] || []).length > 0);
  const carla = C.VISITOR_ROSTER.find(r => r.rid === C.CARLA_RID);
  ok("Carla est recrutable (elle a un skill et plus de noStay)", !!carla && !!carla.skill && !carla.noStay);
  /* ⚠️⚠️ ZIP 430 — SON STATUT EST VÉRIFIÉ, PAS SUPPOSÉ. Le commentaire qui la
     décrivait dans fermeConstants.js est resté FAUX pendant trois zips (il
     annonçait encore `noStay` et `chatOnly` alors que le 427 les avait
     retirés) : la seule chose qui ne ment pas sur un statut, c'est un contrôle
     qui le lit. */
  ok("Carla n'a plus AUCUN des deux verrous du 376", !!carla && !carla.noStay && !carla.chatOnly);
  ok("on ne peut pas la virer", !!carla && carla.noKick === true);
  ok("elle ne travaille qu'un jour par semaine", !!carla && carla.weeklyShift === C.CARLA_WORK_DAY);
  {
    // Le jour de service doit exister une fois par semaine, et TOMBER UN AUTRE
    // JOUR QUE LE MARCHÉ : les deux ensemble, la semaine n'a plus qu'un seul
    // jour où il se passe quelque chose.
    let n = 0, clash = 0;
    for (let day = 1; day <= 700; day++) {
      if (E.isShopDay(carla, day)) { n++; if (E.isMarketDay(day)) clash++; }
    }
    ok("sa boutique ouvre un jour sur sept", n === 100, `${n} jours sur 700`);
    ok("son jour de service ne tombe pas le jour de marché", clash === 0, `${clash} collisions`);
    // Et un résident ORDINAIRE travaille toujours tous les jours : le drapeau
    // ne doit pas fuir sur les autres.
    const greg = C.VISITOR_ROSTER.find(r2 => r2.skill === "lumberjack");
    ok("un résident ordinaire travaille tous les jours", !!greg && [1, 2, 3, 4, 5, 6, 7].every(d => E.isShopDay(greg, d)));
  }
  ok("son métier n'exige aucun atelier de ferme", C.SKILL_BUILDING[carla.skill] === null);
}
{
  /* ⚠️ L'ENCODAGE DE LA TENUE FAIT L'ALLER-RETOUR, ou un chapeau acheté ne se
     verra pas chez l'autre joueur — et c'est le genre de défaut qu'on ne trouve
     qu'en jouant à deux, donc rarement. */
  const bad = [];
  for (const slot of C.WARDROBE_SLOTS) {
    const cat = C.wardrobeCatalog(slot);
    if (!cat || !cat.length) { bad.push(`${slot}: catalogue vide`); continue; }
    if (cat.length > 9) bad.push(`${slot}: ${cat.length} articles, l'encodage n'en tient que 9`);
    for (const it of cat) {
      if (!it.name || !it.nameEn) bad.push(`${slot}/${it.id}: nom manquant`);
      if (!(it.price > 0)) bad.push(`${slot}/${it.id}: prix`);
    }
  }
  ok("les quatre rayons tiennent dans l'encodage à un chiffre", bad.length === 0, bad.join(" · "));
  ok("rien porté = aucune chaîne", C.wardrobeLook({ hat: 0, scarf: 0, outfit: 0, tint: 0 }) === null);
  ok("rien du tout = aucune chaîne", C.wardrobeLook(null) === null);
  const enc = C.wardrobeLook({ hat: 3, scarf: 1, outfit: 5, tint: 8 });
  ok("la tenue s'encode en cinq caractères", enc === "w3158", enc);
  ok("les articles de la Maison Garfield sont CHERS", C.WARDROBE_HATS.every(h => h.price >= 1000), "min " + Math.min(...C.WARDROBE_HATS.map(h => h.price)));
}
{
  ok("le plafond de résidents est bien passé à 20", C.MAX_RESIDENTS === 20, String(C.MAX_RESIDENTS));
  ok("moins de résidents en ville que de résidents tout court", C.TOWN_VISITORS_MAX < C.MAX_RESIDENTS, `${C.TOWN_VISITORS_MAX} / ${C.MAX_RESIDENTS}`);
  ok("un séjour dure moins longtemps que sa borne haute", C.TOWN_TRIP_MIN_MS < C.TOWN_TRIP_MAX_MS);
  // Les durées d'activité doivent être ordonnées, sinon `min + rnd*(max-min)`
  // rendrait une durée NÉGATIVE et l'activité se terminerait immédiatement —
  // un PNJ qui arrive quelque part et repart aussitôt, sans erreur.
  const bad = Object.entries(C.TOWN_ACTS).filter(([, v]) => !(v.ms[0] > 0 && v.ms[1] >= v.ms[0]));
  ok("chaque activité a une durée ordonnée et positive", bad.length === 0, bad.map(([k]) => k).join(" "));
}

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

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 439 — LES ÉLECTIONS MUNICIPALES.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ CE QU'ON MESURE ICI N'EST PAS « le maire change tous les trente jours »
   (ça, c'est une division), C'EST QU'UN JOUEUR NE PEUT PAS TRUQUER LE SCRUTIN.
   Le maire est tiré dans un vivier FIXE et les résidents ne peuvent qu'effriter
   l'écart, jamais le renverser : sans ce contrôle, il suffirait qu'un futur
   réglage rapproche les scores pour que « accueillir un résident » devienne un
   bouton pour changer de maire — et personne ne s'en apercevrait, parce que
   rien ne planterait.
   ═══════════════════════════════════════════════════════════════════════════ */
console.log("\n=== Valley Town — les élections municipales ===\n");
{
  const mk = (n, seed) => Array.from({ length: n }, (_, k) => ({ rid: seed * 37 + k, name: "R" + k }));
  ok("le mandat dure ce qu'il annonce",
     E.mayorTermOf(0) === 0 && E.mayorTermOf(C.MAYOR_TERM_DAYS) === 1 && E.mayorTermOf(C.MAYOR_TERM_DAYS * 3 + 5) === 3,
     `${C.MAYOR_TERM_DAYS} jours`);
  ok("le scrutin tombe le jour du changement de mandat",
     E.isElectionDay(C.MAYOR_TERM_DAYS) && !E.isElectionDay(C.MAYOR_TERM_DAYS + 1) && !E.isElectionDay(0));
  // Le maire ne bouge pas D'UN JOUR à l'autre à l'intérieur d'un mandat.
  let stable = true;
  for (let t = 0; t < 40; t++) {
    const a = E.mayorOf(t * C.MAYOR_TERM_DAYS).key;
    for (let d = 1; d < C.MAYOR_TERM_DAYS; d++) if (E.mayorOf(t * C.MAYOR_TERM_DAYS + d).key !== a) stable = false;
  }
  ok("⚠️ le maire ne change pas EN COURS de mandat", stable, "40 mandats balayés");
  // Il change quand même de temps en temps : un maire à vie serait une constante.
  const seen = new Set();
  for (let t = 0; t < 60; t++) seen.add(E.mayorOf(t * C.MAYOR_TERM_DAYS).key);
  ok("…mais il change d'un mandat à l'autre", seen.size >= 3, `${seen.size} maires différents sur 60 mandats`);
  /* ⚠️⚠️⚠️ L'EXPLOIT : FAIRE TOURNER SA POPULATION POUR CHANGER DE MAIRE.
     On rejoue 3 000 jours × cinq compositions de ferme et on exige que le
     vainqueur ne bouge JAMAIS. C'est le contrôle qui protège la conception, pas
     le code : il échouera le jour où quelqu'un croira bien faire en donnant du
     poids aux résidents. */
  let flips = 0, minGap = Infinity, counted = 0;
  for (let d = 1; d < 3000; d += 7) {
    const ref = E.mayorOf(d).key;
    for (const n of [0, 1, 5, 12, C.MAX_RESIDENTS]) {
      const b = E.mayorBallot(d, mk(n, d));
      if (b.winner.key !== ref || b.rows[0].key !== ref) flips++;
      minGap = Math.min(minGap, b.rows[0].votes - b.rows[1].votes);
      counted += b.rows.reduce((a2, r) => a2 + r.mine.length, 0);
    }
  }
  ok("⚠️ la composition de la ferme ne renverse JAMAIS le scrutin", flips === 0,
     `${flips} bulletin(s) retourné(s) sur 2145`);
  ok("…et l'écart reste positif même à population maximale", minGap > 0, `écart minimal : ${minGap} voix`);
  ok("…alors que les résidents votent VRAIMENT (leurs voix sont comptées)", counted > 0,
     `${counted} bulletins de résidents dépouillés`);
  // Un résident vote toujours pareil dans un mandat donné : son bulletin tient
  // à SON identité, pas à sa place dans la liste ni à l'instant où on demande.
  const rs = mk(6, 3);
  const b1 = E.mayorBallot(100, rs), b2 = E.mayorBallot(100, rs.slice().reverse());
  const key = (b) => b.rows.map(r => r.key + ":" + r.votes).sort().join("|");
  ok("⚠️ trier la liste des résidents ne change pas le dépouillement", key(b1) === key(b2));
  // Le rendez-vous chez le maire est dans le mandat, et jamais dans le passé.
  let past = 0, far = 0;
  for (let d = 1; d < 2000; d++) {
    const a = E.mayorAudienceDay(d);
    if (a < d) past++;
    if (a - d > C.MAYOR_AUDIENCE_EVERY) far++;
  }
  ok("le maire ne reçoit jamais dans le passé", past === 0, `${past} rendez-vous périmé(s)`);
  ok("…ni dans plus d'une semaine", far === 0, `${far} rendez-vous trop lointain(s)`);
}

/* ⚠️ ZIP 439 — LE PONT : L'ARC EST UNE GRANDEUR DE DESSIN. `render-parc.mjs` le
   mesure en détail ; ici on ne garde que l'invariant qui casserait le JEU — si
   la flèche entrait dans `tw.elev`, `canStandTown` refuserait le pas et les deux
   ponts deviendraient infranchissables. Le contrôle de circulation ci-dessus ne
   le verrait pas forcément (il y a d'autres chemins), donc on le dit ici. */
{
  const arch = E.townArchRise(tw);
  let raised = 0, dirty = 0;
  for (let i = 0; i < arch.length; i++) if (arch[i]) { raised++; if (tw.elev[i] !== 0) dirty++; }
  ok("le dos d'âne des ponts existe", raised > 0, `${raised} cases de tablier montées`);
  ok("⚠️ …et il ne touche PAS l'altitude de collision", dirty === 0, `${dirty} case(s) polluée(s)`);
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${fails === 0 ? "✅" : "❌"} ${total - fails}/${total} contrôles passés.\n`);
process.exit(fails === 0 ? 0 : 1);
