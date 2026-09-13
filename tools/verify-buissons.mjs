/* =============================================================================
   verify-buissons.mjs — LES BUISSONS SAUVAGES DE LA FERME, ET LA FAUX. (2026-09-13)
   -----------------------------------------------------------------------------
   Demande de Guillaume : des buissons sur la ferme, jamais sur un champ labouré
   ou cultivable, un arbre, l'eau, les rails ou un bâtiment ; on doit pouvoir
   les tailler et les retirer à la faux.

   Ce qu'il mesure, et pourquoi :

     1. LA CARTE D'HIER SORT AU BIT PRÈS. Une ferme est REGÉNÉRÉE depuis sa
        graine puis rejouée case par case (`applyOverrides`). Un seul `rnd()` de
        plus dans `generateWorld` déplacerait les rochers des fermes existantes
        et ferait « repousser » ailleurs les arbres qu'on y a coupés — sans une
        erreur. On compare l'empreinte de la carte, buissons retirés, à celle
        relevée AVANT leur ajout (commit e0785ff).

     2. AUCUN BUISSON LÀ OÙ IL EST INTERDIT — règles ré-écrites ici depuis les
        constantes, pas en rappelant `farmBushAllowed` (un banc qui appelle la
        fonction qu'il juge ne peut pas la trouver fausse : le stub menteur du
        §10). Et le contrôle se FALSIFIE lui-même : on injecte des buissons
        interdits dans une copie et on exige de les voir tous signalés.

     3. LA FAUX : sauvage → taillé → retiré (+ branchages), rien sur le reste,
        rien hors de portée, rien sans énergie ; les autres outils ne touchent pas
        un buisson.

     4. LA MIGRATION, dans le même geste que la déclaration (§4) : un fermier
        sauvegardé sans `tools.scythe` le reçoit ; un override de buisson taillé
        survit à `applyOverrides`.

     5. ON LES TRAVERSE : `blockedTile` ne refuse aucun buisson ; seul le
        sauvage ralentit (`farmBushSoftAt`).

     6. LA REPOUSSE (`newDay`) respecte les mêmes interdits, jamais sur une case
        labourée ni sous un bâtiment.

   Usage :  node tools/verify-buissons.mjs
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeEngine"]);
const C = mods.fermeConstants, E = mods.fermeEngine;

let fails = 0, checks = 0;
const ok = (n, c, x) => { checks++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  " + x : ""}`); if (!c) fails++; };

const W = C.MAP_W, H = C.MAP_H;
const isBush = (o) => o === C.O_BUSH || o === C.O_BUSH_TRIM;
const isTree = (o) => o === C.O_TREE || o === C.O_TREE2;

/* ─── 1. L'empreinte ───────────────────────────────────────────────────────── */
console.log("\n=== 1. la carte d'avant les buissons sort au bit près ===\n");
// Relevées sur e0785ff, avant l'ajout (FNV-1a sur sol, objet, hp de chaque case).
const HEAD_FP = { 42: "f54332ea", 12345: "5b4717f2", 987654: "72054499", 2026: "977577be", 7: "46c9c8cb" };
function fingerprint(w) {
  let h = 0x811c9dc5;
  const mix = (v) => { h ^= v & 0xff; h = Math.imul(h, 0x01000193) >>> 0; };
  for (let i = 0; i < w.ground.length; i++) {
    const o = isBush(w.objects[i]) ? C.O_NONE : w.objects[i];
    mix(w.ground[i]); mix(o); mix(isBush(w.objects[i]) ? 0 : (w.objHp.get(i) || 0));
  }
  return h.toString(16);
}
const counts = {};
for (const seed of Object.keys(HEAD_FP).map(Number)) {
  const w = E.generateWorld(seed);
  const fp = fingerprint(w);
  counts[seed] = w.objects.filter(isBush).length;
  ok(`graine ${seed} : empreinte ${fp}`, fp === HEAD_FP[seed], fp === HEAD_FP[seed] ? "identique" : `attendue ${HEAD_FP[seed]}`);
}
const cs = Object.values(counts);
ok("entre 250 et 600 buissons par ferme", cs.every(n => n >= 250 && n <= 600), cs.join(" · "));
ok("  ... tous SAUVAGES à la génération", Object.keys(HEAD_FP).every(s => E.generateWorld(+s).objects.every(o => o !== C.O_BUSH_TRIM)));

/* ─── 2. Les interdits ─────────────────────────────────────────────────────── */
console.log("\n=== 2. aucun buisson là où il est interdit ===\n");
const inR = (x, y, R, m = 0) => x >= R.x - m && y >= R.y - m && x < R.x + R.w + m && y < R.y + R.h + m;
const cheb = (x, y, p) => Math.max(Math.abs(x - p.x), Math.abs(y - p.y));
function violations(w, only) {
  const out = [];
  const list = only || w.objects.map((o, i) => i).filter(i => isBush(w.objects[i]));
  const near = (idxs, x, y, r) => idxs.some(i => cheb(x, y, { x: E.xOf(i), y: E.yOf(i) }) <= r);
  const bridges = (w.bridgeSites || []).flat();
  for (const i of list) {
    const x = E.xOf(i), y = E.yOf(i), why = [];
    if (w.ground[i] !== C.G_GRASS) why.push("sol " + w.ground[i]);
    if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) why.push("bord");
    if (x <= C.STATION_RAIL_X + 2) why.push("rails");
    if (inR(x, y, C.STATION_CLEAR)) why.push("gare");
    if (inR(x, y, E.farmYardZone())) why.push("abords de la maison");
    if (inR(x, y, E.farmBarnZone())) why.push("grange");
    if (inR(x, y, C.PEN, 1)) why.push("enclos");
    if (cheb(x, y, C.WELL) <= 9 || cheb(x, y, C.GREG_ANCHOR) <= 9) why.push("champs de l'ouest");
    if (w.darkPassage && cheb(x, y, w.darkPassage) <= 3) why.push("passage sombre");
    if (near(bridges, x, y, 2) || near(w.bridgeLeverPos || [], x, y, 2)) why.push("pont");
    const o = (dx, dy) => (x + dx >= 0 && x + dx < W && y + dy >= 0 && y + dy < H) ? w.objects[(y + dy) * W + x + dx] : C.O_NONE;
    if (isTree(o(0, 1)) || isTree(o(0, 2)) || isTree(o(-1, 1)) || isTree(o(1, 1))) why.push("sous un arbre");
    if (why.length) out.push(`(${x},${y}) ${why.join("+")}`);
  }
  return out;
}
let read = 0;
for (const seed of Object.keys(HEAD_FP).map(Number)) {
  const w = E.generateWorld(seed);
  const v = violations(w);
  read += counts[seed];
  ok(`graine ${seed} : ${counts[seed]} buissons relus, aucun interdit`, v.length === 0, v.slice(0, 4).join(" · "));
}
ok(`  ... ${read} buissons relus en tout (un banc qui compte publie ce qu'il a LU)`, read > 1000);
{
  // FALSIFICATION : chaque règle doit attraper le buisson qu'on lui glisse.
  const w = E.generateWorld(42);
  const inject = [];
  const put = (x, y, label) => { const i = y * W + x; w.objects[i] = C.O_BUSH; inject.push([i, label]); };
  put(C.STATION_RAIL_X + 1, 70, "rails");
  put(C.WELL.x + 2, C.WELL.y + 1, "champs de l'ouest");
  put(C.HOUSE.x + 2, C.HOUSE.y + C.HOUSE.h + 3, "abords de la maison");
  for (let i = 0; i < w.objects.length; i++) {
    if (!isTree(w.objects[i])) continue;
    const x = E.xOf(i), y = E.yOf(i) - 1;
    if (y > 5 && w.objects[y * W + x] === C.O_NONE && w.ground[y * W + x] === C.G_GRASS && E.xOf(i) > 10) { put(x, y, "sous un arbre"); break; }
  }
  for (let i = 0; i < w.ground.length; i++) if (w.ground[i] === C.G_SAND && E.xOf(i) > 10) { w.objects[i] = C.O_BUSH; inject.push([i, "sol"]); break; }
  const got = violations(w, inject.map(([i]) => i));
  const missed = inject.filter(([i, label]) => !got.some(s => s.startsWith(`(${E.xOf(i)},${E.yOf(i)})`) && s.includes(label)));
  ok(`falsification : les ${inject.length} buissons interdits injectés sont tous signalés`, missed.length === 0 && inject.length === 5,
     missed.length ? "manqués : " + missed.map(m => m[1]).join(", ") : got.map(s => s.split(" ").slice(1).join(" ")).join(" · "));
}

/* ─── 3. La faux ───────────────────────────────────────────────────────────── */
console.log("\n=== 3. la faux taille, puis retire ===\n");
{
  const w = E.generateWorld(42);
  const bi = w.objects.findIndex(o => o === C.O_BUSH);
  const bx = E.xOf(bi), by = E.yOf(bi);
  const f = E.newFarmer("t", "Test"); E.normalizeFarmer(f);
  f.x = bx; f.y = by + 1; f.energy = C.MAX_ENERGY;
  const wood0 = f.inv.wood;
  // Les autres outils ne touchent pas un buisson.
  for (const action of ["till", "chop", "mine", "water", "harvest"]) {
    const r = E.resolveAct(w, f, { action, x: bx, y: by });
    ok(`« ${action} » sur un buisson ne fait rien`, w.objects[bi] === C.O_BUSH && r.tiles.length === 0);
  }
  let r = E.resolveAct(w, f, { action: "scythe", x: bx, y: by });
  ok("1er coup de faux : sauvage → taillé", w.objects[bi] === C.O_BUSH_TRIM && r.tiles.includes(bi) && r.fx.some(e => e.k === "trim"));
  ok("  ... coûte de l'énergie", f.energy === C.MAX_ENERGY - C.ENERGY_COST.scythe, `${f.energy}`);
  ok("  ... ne donne rien", f.inv.wood === wood0);
  r = E.resolveAct(w, f, { action: "scythe", x: bx, y: by });
  const wantWood = E.toolYield(C.BUSH_WOOD, f.tools.scythe);
  ok("2e coup : taillé → retiré, branchages rendus", w.objects[bi] === C.O_NONE && !w.objHp.has(bi) && f.inv.wood === wood0 + wantWood, `+${f.inv.wood - wood0} bois`);
  r = E.resolveAct(w, f, { action: "scythe", x: bx, y: by });
  ok("3e coup sur la case vide : rien", r.tiles.length === 0);
  ok("  ... et la case est de nouveau labourable", (E.resolveAct(w, f, { action: "till", x: bx, y: by }), w.ground[bi] === C.G_TILLED));
  // Un arbre, hors de portée, sans énergie.
  const ti = w.objects.findIndex(isTree);
  const f2 = E.newFarmer("u", "U"); E.normalizeFarmer(f2); f2.x = E.xOf(ti); f2.y = E.yOf(ti) + 1;
  ok("la faux ne touche pas un arbre", (E.resolveAct(w, f2, { action: "scythe", x: E.xOf(ti), y: E.yOf(ti) }), isTree(w.objects[ti])));
  const bj = w.objects.findIndex((o, i) => o === C.O_BUSH && i !== bi);
  const f3 = E.newFarmer("v", "V"); E.normalizeFarmer(f3); f3.x = E.xOf(bj) + 20; f3.y = E.yOf(bj);
  ok("hors de portée : rien", (E.resolveAct(w, f3, { action: "scythe", x: E.xOf(bj), y: E.yOf(bj) }), w.objects[bj] === C.O_BUSH));
  f3.x = E.xOf(bj); f3.energy = 0;
  const r3 = E.resolveAct(w, f3, { action: "scythe", x: E.xOf(bj), y: E.yOf(bj) });
  ok("sans énergie : « tired », rien ne change", r3.toast === "tired" && w.objects[bj] === C.O_BUSH);
}

/* ─── 4. La migration ──────────────────────────────────────────────────────── */
console.log("\n=== 4. poser le champ, migrer, relire ===\n");
{
  const old = E.newFarmer("o", "Old"); E.normalizeFarmer(old);
  delete old.tools.scythe; old.tools.axe = 3;
  E.normalizeFarmer(old);
  ok("un fermier sauvegardé sans faux la reçoit au niveau 1", old.tools.scythe === 1 && old.tools.axe === 3);
  ok("  ... et la faux est dans la liste des outils améliorables", C.TOOLS.includes("scythe") && !!C.TOOL_NAMES.scythe && !!C.TOOL_NAMES_EN.scythe);
  const w = E.generateWorld(987654);
  const bushes = w.objects.map((o, i) => o === C.O_BUSH ? i : -1).filter(i => i >= 0);
  const [a, b, c] = bushes;
  const saved = { groundOv: { [c]: C.G_TILLED }, objectOv: { [a]: [C.O_BUSH_TRIM, 1], [b]: [C.O_NONE, 0], [c]: [C.O_NONE, 0] } };
  const w2 = E.applyOverrides(E.generateWorld(987654), saved);
  ok("un buisson taillé sauvegardé revient taillé", w2.objects[a] === C.O_BUSH_TRIM);
  ok("un buisson retiré ne repousse pas au chargement", w2.objects[b] === C.O_NONE);
  ok("une case labourée d'une vieille sauvegarde écrase le buisson généré", w2.objects[c] === C.O_NONE && w2.ground[c] === C.G_TILLED);
}

/* ─── 5. On les traverse ───────────────────────────────────────────────────── */
console.log("\n=== 5. on traverse, seul le sauvage ralentit ===\n");
{
  const w = E.generateWorld(2026);
  const bushes = w.objects.map((o, i) => o === C.O_BUSH ? i : -1).filter(i => i >= 0);
  let blocked = 0;
  for (const i of bushes) if (E.blockedTile(w, E.xOf(i) + 0.5, E.yOf(i) + 0.5) || E.blockedTileMounted(w, E.xOf(i) + 0.5, E.yOf(i) + 0.5)) blocked++;
  ok(`aucun des ${bushes.length} buissons ne bloque, à pied ni à cheval`, blocked === 0, `${blocked} bloquants`);
  // Une position dont la SEMELLE est sur le buisson (bodyFootTile), pas l'ancre.
  const i0 = bushes[0], x0 = E.xOf(i0), y0 = E.yOf(i0);
  let pos = null;
  for (let dy = -1.5; dy <= 1.5 && !pos; dy += 0.05) for (let dx = -1.5; dx <= 1.5 && !pos; dx += 0.05) {
    const ft = C.bodyFootTile(x0 + dx, y0 + dy);
    if (ft.x === x0 && ft.y === y0) pos = [x0 + dx, y0 + dy];
  }
  ok("la semelle sur un buisson sauvage : ralenti", !!pos && E.farmBushSoftAt(w, pos[0], pos[1]));
  w.objects[i0] = C.O_BUSH_TRIM;
  ok("  ... sur le même, taillé : pas ralenti", !!pos && !E.farmBushSoftAt(w, pos[0], pos[1]));
  w.objects[i0] = C.O_NONE;
  ok("  ... sur l'herbe nue : pas ralenti", !!pos && !E.farmBushSoftAt(w, pos[0], pos[1]));
}

/* ─── 6. La repousse ───────────────────────────────────────────────────────── */
console.log("\n=== 6. la repousse respecte les mêmes interdits ===\n");
{
  const w = E.generateWorld(2026);
  // Un pré labouré et un bâtiment d'artisan fictif : la repousse doit les éviter.
  const tilled = new Set();
  for (let y = 60; y < 130; y++) for (let x = 120; x < 175; x++) {
    const i = y * W + x;
    if (w.ground[i] === C.G_GRASS && w.objects[i] === C.O_NONE && (x + y) % 2 === 0) { w.ground[i] = C.G_TILLED; tilled.add(i); }
  }
  w.artisanBlocks = [{ x: 130, y: 20, w: 30, h: 20 }];
  const born = [], atBirth = [];
  for (let day = 1; day <= 400; day++) {
    const r = E.newDay(w, {}, day, 2026);
    const fresh = r.tiles.filter(i => w.objects[i] === C.O_BUSH);
    born.push(...fresh);
    atBirth.push(...violations(w, fresh));
  }
  ok(`${born.length} buissons nés en 400 jours, aucun interdit à la naissance`, born.length > 0 && atBirth.length === 0, atBirth.slice(0, 3).join(" · "));
  /* ⚠️ ET 400 JOURS PLUS TARD : les ARBRES repoussent aussi. Le premier passage
     de ce banc a trouvé des buissons nés en règle puis recouverts par un arbre
     poussé juste au sud — `newDay` refuse désormais ces cases-là aux arbres. */
  const after = violations(w);
  ok("  ... et aucun buisson (généré ou né) recouvert après 400 jours de repousse", after.length === 0, after.slice(0, 3).join(" · "));
  ok("  ... jamais sur une case labourée", born.every(i => !tilled.has(i)));
  ok("  ... jamais sous un bâtiment", born.every(i => !(E.xOf(i) >= 130 && E.xOf(i) < 160 && E.yOf(i) >= 20 && E.yOf(i) < 40)));
  ok("  ... une repousse LENTE (moins d'un buisson par jour)", born.length < 400, `${(born.length / 400).toFixed(2)} par jour`);
}

console.log(fails ? `\n${fails} ÉCHEC(S) sur ${checks}\n` : `\n${checks}/${checks} — les buissons tiennent.\n`);
process.exit(fails ? 1 : 0);
