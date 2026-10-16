/* =============================================================================
   verify-maison.mjs — L'INTÉRIEUR DES MAISONS : PLAN, FAÇADE, COLLISION,
   ESCALIER (2026-10-16 ; docs/PROJETS.md §6, lot 1)
   -----------------------------------------------------------------------------
   Il APPELLE `maison.js` (le plan, la collision, l'escalier, ce que la zone
   « home » du jeu appelle) — il n'en refait rien (§4, leçon du 442).

   1. La façade vue de dedans : pour chaque modèle étroit et chaque version, la
      porte tombe dans l'entrée, les fenêtres dans le plan et hors de la porte.
   2. Le calage : l'origine des images cuites tombe sur une case entière (donc
      sur des pixels d'écran entiers aux crans 2 et 4, les seuls de la zone).
   3. Chaque pièce de chaque niveau est ATTEIGNABLE depuis le point d'arrivée
      du niveau (remplissage au pas de 5 cm, avec la vraie semelle).
   4. L'escalier : chaque arrivée est praticable et ne relance pas aussitôt ;
      la zone de départ de chaque volée est atteignable ; l'étage (la case à
      deux sols) monte quand on y entre par le sud, descend par le nord.
   5. Le hasard : des marcheurs au hasard, pas à pas comme le jeu (axe par axe,
      l'escalier compris), sur tous les niveaux de N1 et N2 — jamais la semelle
      dans un mur, jamais coincés, et ils visitent toutes les pièces.
   6. La carte : maison et niveau se retrouvent depuis la position (aller-retour).

   Usage :  node tools/verify-maison.mjs
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "maison", "maisonArt", "maisonSprites"]);
const { maison: H, maisonArt: MA, fermeConstants: C } = mods;
const P = H.PLAN_ETROITE;
let ok = 0, ko = 0;
function check(nom, cond, detail = "") {
  if (cond) { ok++; console.log("  OK  ", nom, detail); } else { ko++; console.log("  ÉCHEC", nom, detail); }
}

// ─── 1. la façade ─────────────────────────────────────────────────────────
console.log("\n=== 1. la façade vue de dedans ===");
const entree = P.niveaux[0].pieces.find((p) => p.id === "entree").rects[0];
for (const [mk, m] of Object.entries(C.TOWN_HOUSE_MODELS)) {
  if (m.size !== "narrow") continue;
  for (const variant of Object.keys(m.variants)) {
    if (variant === "ruine") continue;
    const f = H.homeFacade({ model: mk, variant }, P);
    const pc = (f.porte[0] + f.porte[1]) / 2;
    check(`${mk} ${variant} : la porte est dans l'entrée`, f.porte[0] >= entree[0] + 0.05 && f.porte[1] <= entree[2] - 0.05, `[${f.porte.map((v) => v.toFixed(2))}]`);
    let fenOk = true;
    f.fenetres.forEach((l, L) => l.forEach(([a, b]) => {
      if (a < 0 || b > P.w || b - a < 0.2) fenOk = false;
      if (L === 0 && a < f.porte[1] && b > f.porte[0]) fenOk = false;
    }));
    check(`${mk} ${variant} : fenêtres dans le plan, hors de la porte`, fenOk, f.fenetres.map((l) => l.length).join("/") + " par niveau");
    check(`${mk} ${variant} : au moins une fenêtre au rez-de-chaussée et à l'étage`, f.fenetres[0].length >= 1 && f.fenetres[1].length >= 1);
    check(`${mk} ${variant} : l'arrivée est derrière la porte`, Math.abs(H.homeSpawnLocal(f).lx - pc) < 1e-9);
  }
}

// ─── 2. le calage ─────────────────────────────────────────────────────────
console.log("\n=== 2. le calage au pixel ===");
const isInt = (v) => Math.abs(v - Math.round(v)) < 1e-9;
check("l'origine cuite tombe sur une case entière en x", isInt(H.HOME_OX + MA.HOME_FX0), String(H.HOME_OX + MA.HOME_FX0));
check("l'origine cuite tombe sur une case entière en y", isInt(H.HOME_OY + MA.HOME_FY0), String(H.HOME_OY + MA.HOME_FY0));
check("un emplacement est un nombre entier de cases", isInt(H.HOME_SLOT_W) && isInt(H.HOME_LEVEL_H));
check("le niveau tient dans son emplacement (murs projetés compris)", H.HOME_OY + MA.HOME_FY0 >= 0 && H.HOME_OY + P.d + 0.6 <= H.HOME_LEVEL_H, `${H.HOME_OY + MA.HOME_FY0} ≥ 0, ${H.HOME_OY + P.d + 0.6} ≤ ${H.HOME_LEVEL_H}`);
check("la maison tient dans sa largeur", H.HOME_OX + MA.HOME_FX0 >= 0 && H.HOME_OX + P.w - MA.HOME_FX0 <= H.HOME_SLOT_W);

// ─── 3. chaque pièce est atteignable ─────────────────────────────────────
console.log("\n=== 3. chaque pièce est atteignable ===");
const S = 0.05;
function reach(L, fac, seed) {
  const sol = H.homeSolids(P, L, fac);
  const key = (i, j) => i + "," + j;
  const seen = new Set(), q = [];
  const i0 = Math.round(seed.lx / S), j0 = Math.round(seed.ly / S);
  if (!H.homeBoxFree(sol, i0 * S, j0 * S)) return { seen, sol, start: false };
  seen.add(key(i0, j0)); q.push([i0, j0]);
  while (q.length) {
    const [i, j] = q.pop();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj, k = key(ni, nj);
      if (seen.has(k)) continue;
      const lx = ni * S, ly = nj * S;
      if (lx < -0.5 || ly < -0.5 || lx > P.w + 0.5 || ly > P.d + 0.5) continue;
      if (!H.homeBoxFree(sol, lx, ly)) continue;
      seen.add(k); q.push([ni, nj]);
    }
  }
  return { seen, sol, start: true };
}
const s = P.escalier;
for (const mk of ["n1", "n2"]) {
  const fac = H.homeFacade({ model: mk, variant: "simple" }, P);
  const seeds = [H.homeSpawnLocal(fac), { lx: 0.45, ly: s.yHaut - 0.3 }, { lx: 0.45, ly: s.yHaut - 0.05 }];
  for (let L = 0; L < P.niveaux.length; L++) {
    const r = reach(L, fac, seeds[L]);
    check(`${mk} niveau ${L} : le point d'arrivée est praticable`, r.start, `(${seeds[L].lx.toFixed(2)}, ${seeds[L].ly.toFixed(2)})`);
    const rooms = new Set();
    for (const k of r.seen) { const [i, j] = k.split(",").map(Number); const rm = H.homeRoomAt(P, L, i * S, j * S); if (rm) rooms.add(rm.id); }
    const all = P.niveaux[L].pieces.map((p) => p.id);
    const missing = all.filter((id) => !rooms.has(id));
    check(`${mk} niveau ${L} (${P.niveaux[L].cle}) : toutes les pièces atteintes`, missing.length === 0, missing.length ? "manquent : " + missing.join(", ") : `${all.join(", ")} — ${r.seen.size} points`);
    if (L === 0) {
      const sp = H.homeSpawnLocal(fac);
      check(`${mk} : l'invite « sortir » s'affiche à l'arrivée`, H.homeNearExit(fac, sp.lx, sp.ly));
    }
  }
}

// ─── 4. l'escalier ────────────────────────────────────────────────────────
console.log("\n=== 4. l'escalier ===");
const fac0 = H.homeFacade({ model: "n2", variant: "simple" }, P);
const free = (L, lx, ly) => H.homeBoxFree(H.homeSolids(P, L, fac0), lx, ly);
const trig = s.yHaut + H.HOME_STAIR_TRIG;
check("rez-de-chaussée : le haut de la volée est atteignable (pieds sous le seuil)", free(0, 0.45, trig - 0.03), `pieds à ${(trig - 0.03).toFixed(2)}`);
{
  const r = H.homeStairStep(P, 0, { volee: null }, trig + 0.02, 0.45, trig - 0.03);
  check("rez-de-chaussée → étage", r.aller && r.aller.level === 1, JSON.stringify(r.aller));
  check("arrivée à l'étage praticable", free(1, 0.45, r.aller.ly));
  const r2 = H.homeStairStep(P, 1, r.st, r.aller.ly, 0.45, r.aller.ly);
  check("arrivée à l'étage : pas de rebond", !r2.aller);
}
{
  const r = H.homeStairStep(P, 1, { volee: null }, s.yHaut - 0.03, 0.45, s.yHaut + 0.02);
  check("étage, entré par le nord (le palier) : on descend", r.aller && r.aller.level === 0, JSON.stringify(r.aller));
  check("arrivée au rez-de-chaussée praticable", free(0, 0.45, r.aller.ly));
  const r2 = H.homeStairStep(P, 0, r.st, r.aller.ly, 0.45, r.aller.ly);
  check("arrivée au rez-de-chaussée : pas de rebond", !r2.aller);
  check("étage : le bord nord de la volée est praticable (on peut y entrer)", free(1, 0.45, s.yHaut + 0.02));
}
{
  const r = H.homeStairStep(P, 1, { volee: null }, s.yPied + 0.02, 0.45, s.yPied - 0.03);
  check("étage, entré par le sud (le pied de la volée du haut) : on monte", r.st.volee === "haut" && !r.aller);
  const r2 = H.homeStairStep(P, 1, r.st, trig + 0.02, 0.45, trig - 0.03);
  check("étage → combles", r2.aller && r2.aller.level === 2, JSON.stringify(r2.aller));
  check("arrivée aux combles praticable", free(2, 0.45, r2.aller.ly));
  const r3 = H.homeStairStep(P, 2, r2.st, r2.aller.ly, 0.45, r2.aller.ly);
  check("arrivée aux combles : pas de rebond", !r3.aller);
  const r4 = H.homeStairStep(P, 2, { volee: null }, s.yHaut - 0.03, 0.45, s.yHaut + 0.02);
  check("combles : la trémie fait redescendre sur la volée de l'étage", r4.aller && r4.aller.level === 1 && r4.st.volee === "haut");
  check("arrivée sur la volée de l'étage praticable", free(1, 0.45, r4.aller.ly));
  check("les combles : le bord nord de la trémie est praticable", free(2, 0.45, s.yHaut + 0.02));
  check("les combles : on ne tombe pas dans la trémie par le sud (garde-corps)", !free(2, 0.45, s.yPied + 0.05));
}
check("la hauteur sur la volée : 0 en bas, un étage en haut",
  Math.abs(H.homeStairLift(P, 0, 0.45, s.yPied - 1e-6)) < 0.01 && Math.abs(H.homeStairLift(P, 0, 0.45, s.yHaut) - H.STOREY_M) < 1e-9);

// ─── 5. le hasard ─────────────────────────────────────────────────────────
/* Des marcheurs à BUT : chacun tire une pièce du niveau où il est (parfois le
   haut de l'escalier, pour changer d'étage) et marche vers elle, pas à pas comme
   le jeu (axe par axe, à 9 cm), avec un tiers de pas au hasard. ⚠️ Un premier
   jet de marcheurs AVEUGLES (un cap tiré tous les 25 à 70 pas) passait 90 % de
   son temps dans la cuisine ou l'entrée selon la graine : la couverture mesurait
   le tirage, pas le plan. La connexité est prouvée par la section 3 ; ici on
   prouve ce que le hasard trouve et que le remplissage ne voit pas : jamais la
   semelle dans un mur, jamais de point d'où l'on ne puisse plus bouger, et les
   changements d'étage (l'état de la volée) tenus sur de longues marches. */
console.log("\n=== 5. des marcheurs au hasard ===");
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
for (const mk of ["n1", "n2"]) {
  const rnd = mulberry32(mk === "n1" ? 7 : 11);
  const fac = H.homeFacade({ model: mk, variant: "simple" }, P);
  let bad = 0, trapped = 0, steps = 0, ups = 0, downs = 0;
  const visited = new Set(), levels = new Set();
  const cible = (L) => {
    if (rnd() < 0.25) return L === 0 ? { lx: 0.45, ly: 1.0, monte: true } : L === 1 ? (rnd() < 0.5 ? { lx: 0.45, ly: 3.9, puis: { lx: 0.45, ly: 1.0 } } : { lx: 0.45, ly: 0.7, puis: { lx: 0.45, ly: 1.6 } }) : { lx: 0.45, ly: 1.6 };
    const pcs = P.niveaux[L].pieces.filter((p) => p.id !== "cage");
    const pc = pcs[Math.floor(rnd() * pcs.length)], r = pc.rects[Math.floor(rnd() * pc.rects.length)];
    return { lx: r[0] + (r[2] - r[0]) * (0.2 + 0.6 * rnd()), ly: r[1] + (r[3] - r[1]) * (0.2 + 0.6 * rnd()) };
  };
  for (let w = 0; w < 30; w++) {
    let L = 0, { lx, ly } = H.homeSpawnLocal(fac), st = { volee: null }, tg = cible(0), age = 0;
    for (let k = 0; k < 6000; k++) {
      if (age++ > 400 || Math.hypot(tg.lx - lx, tg.ly - ly) < 0.2) { tg = tg.puis && age < 400 ? { ...tg.puis } : cible(L); age = 0; }
      let dx = Math.sign(Math.round((tg.lx - lx) * 10)), dy = Math.sign(Math.round((tg.ly - ly) * 10));
      if (rnd() < 0.33) { const d = DIRS8[Math.floor(rnd() * 8)]; dx = d[0]; dy = d[1]; }
      const sol = H.homeSolids(P, L, fac);
      const len = Math.hypot(dx, dy) || 1, sp = 0.09;
      const prevLy = ly;
      if (H.homeBoxFree(sol, lx + dx / len * sp, ly)) lx += dx / len * sp;
      if (H.homeBoxFree(sol, lx, ly + dy / len * sp)) ly += dy / len * sp;
      if (!H.homeBoxFree(sol, lx, ly)) bad++;
      const r = H.homeStairStep(P, L, st, prevLy, lx, ly);
      st = r.st;
      if (r.aller) {
        if (r.aller.level > L) ups++; else downs++;
        L = r.aller.level; ly = r.aller.ly; tg = cible(L); age = 0;
        if (!H.homeBoxFree(H.homeSolids(P, L, fac), lx, ly)) bad++;
      }
      if (k % 50 === 0) {
        const sol2 = H.homeSolids(P, L, fac);
        if (!DIRS8.some(([ex, ey]) => H.homeBoxFree(sol2, lx + ex * 0.09, ly + ey * 0.09))) trapped++;
      }
      const rm = H.homeRoomAt(P, L, lx, ly);
      if (rm) visited.add(L + ":" + rm.id);
      levels.add(L);
      steps++;
    }
  }
  // La trémie des combles ne compte pas : y entrer fait redescendre au même pas, on ne s'y tient jamais.
  const total = P.niveaux.reduce((n, lv) => n + lv.pieces.length, 0) - 1;
  check(`${mk} : jamais la semelle dans un mur`, bad === 0, `${bad} sur ${steps} pas`);
  check(`${mk} : jamais coincé (un des huit pas reste toujours possible)`, trapped === 0, `${trapped} points coincés`);
  check(`${mk} : les trois niveaux, en montant et en descendant`, levels.size === 3 && ups > 0 && downs > 0, `${ups} montées, ${downs} descentes`);
  check(`${mk} : toutes les pièces visitées`, visited.size === total, `${visited.size} / ${total}`);
}

// ─── 6. la carte ──────────────────────────────────────────────────────────
console.log("\n=== 6. maison et niveau se lisent dans la position ===");
let rt = true;
for (let slot = 0; slot < C.TOWN_HOUSES.length; slot++) for (let L = 0; L < 3; L++) for (const [lx, ly] of [[0, 0], [4.9, 6.9], [2.5, 3.5], [-0.3, -2.9]]) {
  const w = H.homeToWorld(slot, L, lx, ly), b = H.homeToLocal(w.x, w.y);
  if (b.slot !== slot || b.level !== L || Math.abs(b.lx - lx) > 1e-9 || Math.abs(b.ly - ly) > 1e-9) rt = false;
}
check("aller-retour position → (maison, niveau, plan)", rt, `${C.TOWN_HOUSES.length} parcelles × 3 niveaux`);
const narrow = C.TOWN_HOUSES.map((h, i) => (H.homeHasInterior(h) ? i : null)).filter((v) => v !== null);
check("les trois premières parcelles (les trois premiers joueurs) ont un intérieur", [0, 1, 2].every((i) => narrow.includes(i)), "étroites : " + narrow.join(", "));

// ─── 7. la maison de chacun (lot 2a) ───────────────────────────────────────
console.log("\n=== 7. poser, ranger, décorer (lot 2a) ===");
{
  const fac = H.homeFacade({ model: "n2", variant: "simple" }, P);
  const h0 = H.homeOf({}, "x");
  check("une maison absente est la maison de départ (le lit, la plante morte)", h0.m.length === 2 && h0.m.some((it) => it.s === "lit") && h0.m.some((it) => it.s === "plante_morte") && !h0.g.length);
  check("les meubles de départ sont posables là où ils sont", h0.m.every((it) => H.homeCanPlace(P, fac, h0, it, it.u).ok), h0.m.map((it) => it.s + ":" + JSON.stringify(H.homeCanPlace(P, fac, h0, it, it.u))).join(" "));
  const h = H.homeClone(h0);
  const g = H.resolveHomeGift(h);
  check("le menu développeur garnit le garde-meuble", g.ok && h.g.length === g.n && !h.g.some((it) => it.s === "escalier"), `${h.g.length} meubles`);
  const canape = h.g.find((it) => it.s === "canape");
  // contre le mur nord du séjour (x 2.2..5, y 3.5) : x = 2.6, y = 3.6 → en quarts
  let r = H.resolveHomePlace(h, { u: canape.u, o: "S", n: 0, x: 48, y: 71 }, P, fac);
  check("poser le canapé contre le mur du séjour", r.ok, JSON.stringify(r));
  check("il a quitté le garde-meuble", !h.g.some((it) => it.u === canape.u) && h.m.some((it) => it.u === canape.u));
  r = H.resolveHomePlace(h, { u: canape.u, o: "S", n: 0, x: 0, y: 20 }, P, fac);
  check("refusé dans la cage d'escalier", !r.ok && r.raison === "escalier", JSON.stringify(r));
  r = H.resolveHomePlace(h, { u: canape.u, o: "S", n: 0, x: 95, y: 70 }, P, fac);
  check("refusé à cheval sur un mur", !r.ok, JSON.stringify(r));
  const biblio = h.g.find((it) => it.s === "bibliotheque");
  r = H.resolveHomePlace(h, { u: biblio.u, o: "S", n: 0, x: 25, y: 71 }, P, fac);
  check("refusé devant la porte de la cuisine (le seuil)", !r.ok && (r.raison === "porte" || r.raison === "meuble" || r.raison === "passage"), JSON.stringify(r));
  const fauteuil = h.g.find((it) => it.s === "fauteuil");
  r = H.resolveHomePlace(h, { u: fauteuil.u, o: "S", n: 0, x: 48, y: 71 }, P, fac);
  check("refusé sur le canapé (deux meubles debout ne se chevauchent pas)", !r.ok && r.raison === "meuble", JSON.stringify(r));
  const tapis = h.g.find((it) => it.s === "tapis");
  r = H.resolveHomePlace(h, { u: tapis.u, o: "S", n: 0, x: 50, y: 90 }, P, fac);
  check("un tapis se glisse sous les meubles", r.ok, JSON.stringify(r));
  // fermer le passage : de quoi boucher l'entrée (x 0..2.2, y 3.5..7) d'un mur de meubles
  const bloque = { m: [{ u: 900, s: "lit", o: "E", n: 0, x: 0, y: 90 }, { u: 901, s: "canape", o: "W", n: 0, x: 25, y: 75 }], g: [], d: {}, k: 902 };
  const vb = H.homeCanPlace(P, fac, { ...bloque, m: [bloque.m[0]] }, bloque.m[1], 901);
  check("refusé quand une pièce ou l'escalier devient inatteignable", !vb.ok, JSON.stringify(vb));
  {
    const sp = H.homeSnap(P, fac, 0, "canape", "S", 3.6, 3.6 + 0.38);
    check("l'aimant : un canapé lâché près du mur du séjour s'y plaque", sp.y / H.HOME_Q === 3.55 || Math.abs(sp.y / H.HOME_Q - 3.55) < 0.051, `y = ${sp.y / H.HOME_Q}`);
    const sp2 = H.homeSnap(P, fac, 0, "canape", "S", 3.6, 5.5);
    check("l'aimant : loin des murs, le pas est le quart de case", Math.abs(((sp2.y / H.HOME_Q) * 4) - Math.round((sp2.y / H.HOME_Q) * 4)) < 1e-9, `y = ${sp2.y / H.HOME_Q}`);
  }
  {
    // l'aimant ne fait jamais dépasser dans un mur : chaque meuble lâché contre chaque mur du séjour
    let bad = [];
    for (const s of ["plante_verte", "canape", "bibliotheque", "lit", "poele", "fauteuil"]) for (const o of H.homeOrients(s)) {
      for (const [px, py] of [[2.3, 5.2], [4.9, 5.2], [3.6, 3.6], [3.6, 6.9], [4.9, 6.9], [2.3, 3.6]]) {
        const sp = H.homeSnap(P, fac, 0, s, o, px, py);
        const rr = H.homeItemRect({ s, o, x: sp.x, y: sp.y });
        const murs = H.homeSolids(P, 0, fac, []);
        if (murs.some((w) => rr[2] > w[0] + 1e-6 && rr[0] < w[2] - 1e-6 && rr[3] > w[1] + 1e-6 && rr[1] < w[3] - 1e-6)) bad.push(`${s} ${o} (${px}, ${py})`);
      }
    }
    check("l'aimant ne fait jamais entrer un meuble dans un mur", bad.length === 0, bad.slice(0, 4).join(" ; "));
  }
  r = H.resolveHomeStore(h, { u: canape.u });
  check("ranger le canapé au garde-meuble", r.ok && h.g.some((it) => it.u === canape.u) && !h.m.some((it) => it.u === canape.u));
  r = H.resolveHomeDecor(h, { n: 0, piece: "sejour", quoi: "papier", val: "damas" }, P);
  check("changer le papier du séjour (payant)", r.ok && r.prix === H.HOME_DECOR_PRIX.papier, JSON.stringify(r));
  check("le plan habillé porte le nouveau papier", H.homePlanDecore(h, P).niveaux[0].pieces.find((p) => p.id === "sejour").murs.papier === "damas");
  check("le plan de référence n'a pas bougé", P.niveaux[0].pieces.find((p) => p.id === "sejour").murs.papier !== "damas");
  r = H.resolveHomeDecor(h, { n: 0, piece: "sejour", quoi: "papier", val: "damas" }, P);
  check("le même papier deux fois ne se paie pas", !r.ok && r.raison === "deja");
  r = H.resolveHomeDecor(h, { n: 0, piece: "sejour", quoi: "sol", val: "moquette:rose" }, P);
  check("hors catalogue : refusé", !r.ok && r.raison === "catalogue");
  r = H.resolveHomeDecor(h, { n: 1, piece: "chambre", quoi: "lambris", val: "" }, P);
  check("ôter le lambris de la chambre", r.ok && H.homeRoomDecor(h, P, 1, "chambre").murs.lambris === null, JSON.stringify(r));
  check("chaque papier, lambris et sol du catalogue existe au dessin", H.HOME_DECOR.papier.every((v) => MA.PAPIERS[v]) && H.HOME_DECOR.lambris.every((v) => !v || v === "faience" || MA.LAMBRIS[v]));
  const allRot = Object.keys(mods.maisonSprites.MEUBLES).filter((s) => H.homeOrients(s).length === 0);
  check("chaque meuble a au moins une orientation rendue", allRot.length === 0, allRot.join(","));
}

// ─── 8. chaque chose a son nom (le piège du repli `||`, §4) ───────────────
console.log("\n=== 8. les noms, dans les deux langues ===");
{
  const { fermeStrings: FS } = await loadFerme(ROOT, ["fermeStrings"]);
  const RAISONS = ["sprite", "niveau", "grille", "dehors", "escalier", "mur", "meuble", "porte", "passage", "inconnu", "catalogue", "piece", "deja", "or"];
  for (const lang of ["fr", "en"]) {
    const Ls = FS.fstr(lang);
    const meubles = Object.keys(mods.maisonSprites.MEUBLES).filter((k) => !/_allume$/.test(k));
    const sansNom = meubles.filter((k) => !Ls.homeMeubleName(k));
    check(`${lang} : chaque meuble a un nom`, sansNom.length === 0, sansNom.join(","));
    const decor = Object.entries(H.HOME_DECOR).flatMap(([q, vs]) => vs.map((v) => [q, v])).filter(([q, v]) => !Ls.homeDecorName(q, v));
    check(`${lang} : chaque papier, lambris et sol a un nom`, decor.length === 0, decor.map((x) => x.join(":")).join(","));
    const r = RAISONS.filter((k) => !Ls.homeRefus(k));
    check(`${lang} : chaque raison de refus a un texte`, r.length === 0, r.join(","));
    check(`${lang} : chaque niveau et chaque pièce a un nom`, P.niveaux.every((lv) => Ls.homeLevelName(lv.cle) && lv.pieces.every((p) => Ls.homeRoomName(p.id))));
  }
}

console.log(`\n${ok} OK, ${ko} ÉCHEC`);
process.exit(ko ? 1 : 0);
