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
   7. La maison de chacun (lot 2a) : poser, refuser, l'aimant, ranger, décorer.
   8. Chaque chose a son nom, dans les deux langues.
   9. (2026-10-17) Les maisons écrites sur le plan de 7 cases sont recalées sur
      celui de 9 sans rien perdre (`migrateHome`).
   ⚠️ 2026-10-17 — LE PLAN EST EN CASES DU PLAN, LA CARTE EN CASES DU MONDE
   (`HOME_K` = 2) : le calage (§2) et le pas des marcheurs (§5) passent par K.

   Usage :  node tools/verify-maison.mjs
   ========================================================================== */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PNG } from "pngjs";
import { installFakeDOM, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "maison", "maisonArt", "maisonSprites"]);
const { maison: H, maisonArt: MA, fermeConstants: C, maisonSprites: MS } = mods;
const MA_SPRITES = MS.MEUBLES;
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
const K = H.HOME_K, ox0 = H.HOME_OX + MA.HOME_FX0 * K, oy0 = H.HOME_OY + MA.HOME_FY0 * K;   // l'origine cuite, en cases du MONDE
check("l'origine cuite tombe sur une case entière du monde en x", isInt(ox0), String(ox0));
check("l'origine cuite tombe sur une case entière du monde en y", isInt(oy0), String(oy0));
check("un emplacement est un nombre entier de cases", isInt(H.HOME_SLOT_W) && isInt(H.HOME_LEVEL_H));
check("le niveau tient dans son emplacement (murs projetés compris)", oy0 >= 0 && H.HOME_OY + (P.d + 0.6) * K <= H.HOME_LEVEL_H, `${oy0} ≥ 0, ${H.HOME_OY + (P.d + 0.6) * K} ≤ ${H.HOME_LEVEL_H}`);
check("la maison tient dans sa largeur", ox0 >= 0 && H.HOME_OX + (P.w - MA.HOME_FX0) * K <= H.HOME_SLOT_W);
/* 2026-10-17 — LA FINESSE. Un pixel de maison vaut un DEMI-pixel du monde (le
   dessin tombe sur des pixels d'écran entiers aux crans 2 et 4), et les meubles
   sont rendus AU MÊME GRAIN que les murs : un `maisonSprites.js` resté à 32 px
   par case à côté de peintres à 64 dessinerait des meubles de poupée (§4 : un
   contrôle qui compare une mesure à la constante qu'elle doit tenir suit la
   constante — ici `MPX`, jamais « 64 » écrit en dur). */
check("un pixel de maison = un demi-pixel du monde", Math.abs(C.TILE * K / MA.MPX - 0.5) < 1e-9, `${C.TILE} × ${K} / ${MA.MPX}`);
{
  /* La MÉDIANE du rapport largeur de l'image / (emprise × MPX) : un meuble n'est pas
     son emprise (un portemanteau vu de côté est plus fin que son pied), mais l'ensemble
     des images rendues à un autre grain se lit d'un coup (0,5 à 32 px par case). */
  const M = mods.maisonSprites.MEUBLES, rap = [];
  for (const os of Object.values(M)) for (const m of Object.values(os)) rap.push(m.w / (m.fw / H.CASE_M * MA.MPX));
  rap.sort((a, b) => a - b);
  const med = rap[rap.length >> 1];
  check("les meubles sont rendus au grain des murs (médiane largeur / emprise × MPX ≈ 1)", med > 0.9 && med < 1.35, `médiane ${med.toFixed(2)} sur ${rap.length} images`);
  // Chaque image de la table existe, à la taille annoncée (l'ancre en dépend) — par l'URL du jeu (`homeSpriteUrl`).
  const manque = [];
  for (const [nom, os] of Object.entries(M)) for (const [o, m] of Object.entries(os)) {
    const f = path.join(ROOT, "public", H.homeSpriteUrl(nom + "_" + o));
    if (!fs.existsSync(f)) { manque.push(nom + "_" + o + " absent"); continue; }
    const png = PNG.sync.read(fs.readFileSync(f));
    if (png.width !== m.w || png.height !== m.h) manque.push(`${nom}_${o} ${png.width}×${png.height} pour ${m.w}×${m.h}`);
  }
  check("chaque image de meuble existe, à la taille que la table annonce", manque.length === 0, manque.slice(0, 3).join(" ; ") || `${rap.length} PNG`);
}

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
  const dd = s.yHaut + H.HOME_STAIR_DESC + 0.02, SUD = { dx: 0, dy: 1 }, NORD = { dx: 0, dy: -1 }, COTE = { dx: 1, dy: 0 };
  /* 2026-10-17 (soir) — « on passe dessous et ça active l'ascension » : frôler le bord nord de la trémie, ou y glisser
     de côté, ou y entrer en remontant, n'est PAS prendre la volée. */
  check("étage, le bord nord de la trémie frôlé (0,10 dedans) : on ne descend pas", !H.homeStairStep(P, 1, { volee: null }, s.yHaut + 0.06, 0.45, s.yHaut + 0.10, SUD).aller);
  check("étage, entré de côté ou en remontant : on ne descend pas", !H.homeStairStep(P, 1, { volee: null }, dd - 0.04, 0.45, dd, COTE).aller && !H.homeStairStep(P, 1, { volee: null }, dd - 0.04, 0.45, dd, NORD).aller);
  check("rez-de-chaussée, au haut de la volée : pas de montée en glissant de côté ni en redescendant", !H.homeStairStep(P, 0, { volee: null }, trig + 0.02, 0.45, trig - 0.03, COTE).aller && !H.homeStairStep(P, 0, { volee: null }, trig - 0.05, 0.45, trig - 0.03, SUD).aller);
  const r = H.homeStairStep(P, 1, { volee: null }, dd - 0.04, 0.45, dd, SUD);
  check("étage, entré par le nord (le palier) : on descend", r.aller && r.aller.level === 0, JSON.stringify(r.aller));
  check("arrivée au rez-de-chaussée praticable", free(0, 0.45, r.aller.ly));
  const r2 = H.homeStairStep(P, 0, r.st, r.aller.ly, 0.45, r.aller.ly);
  check("arrivée au rez-de-chaussée : pas de rebond", !r2.aller);
  check("étage : le bord nord de la volée est praticable (on peut y entrer)", free(1, 0.45, dd));
}
{
  const r = H.homeStairStep(P, 1, { volee: null }, s.yPied + 0.02, 0.45, s.yPied - 0.03);
  check("étage, entré par le sud (le pied de la volée du haut) : on monte", r.st.volee === "haut" && !r.aller);
  const r2 = H.homeStairStep(P, 1, r.st, trig + 0.02, 0.45, trig - 0.03);
  check("étage → combles", r2.aller && r2.aller.level === 2, JSON.stringify(r2.aller));
  check("arrivée aux combles praticable", free(2, 0.45, r2.aller.ly));
  const r3 = H.homeStairStep(P, 2, r2.st, r2.aller.ly, 0.45, r2.aller.ly);
  check("arrivée aux combles : pas de rebond", !r3.aller);
  const r4 = H.homeStairStep(P, 2, { volee: null }, s.yHaut + H.HOME_STAIR_DESC - 0.02, 0.45, s.yHaut + H.HOME_STAIR_DESC + 0.02, { dx: 0, dy: 1 });
  check("combles : la trémie fait redescendre sur la volée de l'étage", r4.aller && r4.aller.level === 1 && r4.st.volee === "haut");
  check("arrivée sur la volée de l'étage praticable", free(1, 0.45, r4.aller.ly));
  check("les combles : le bord nord de la trémie est praticable", free(2, 0.45, s.yHaut + H.HOME_STAIR_DESC + 0.02));
  check("les combles : on ne tombe pas dans la trémie par le sud (garde-corps)", !free(2, 0.45, s.yPied + 0.05));
}
check("la hauteur sur la volée : 0 en bas, un étage en haut",
  Math.abs(H.homeStairLift(P, 0, 0.45, s.yPied - 1e-6)) < 0.01 && Math.abs(H.homeStairLift(P, 0, 0.45, s.yHaut) - H.STOREY_M) < 1e-9);
{
  /* 2026-10-17 (soir) — « gravir les escaliers est trop rapide et peu réaliste » : la hauteur monte MARCHE PAR MARCHE
     (des plateaux, pas une rampe) et la volée se fait à `HOME_STAIR_SPEED` de la marche. */
  const lift = (t) => H.homeStairLift(P, 0, 0.45, s.yPied - 1e-6 - (s.yPied - s.yHaut - 1e-6) * t);
  let monte = true, prev = 0;
  for (let k = 0; k <= 900; k++) { const v = lift(k / 900); if (v < prev - 1e-9) monte = false; prev = v; }
  check("la hauteur ne redescend jamais en montant", monte);
  // une marche = un temps à plat (début et fin de la marche) et une montée franche au milieu : la pente aux joints est faible, au milieu forte.
  const e = 1e-4, pente = (t) => (lift(t + e) - lift(t - e)) / (2 * e), moy = H.STOREY_M;
  let joints = 0, milieux = 0;
  for (let i = 1; i < H.HOME_STAIR_TREADS; i++) { joints = Math.max(joints, pente(i / H.HOME_STAIR_TREADS) / moy); milieux = Math.max(milieux, 0); }
  for (let i = 0; i < H.HOME_STAIR_TREADS; i++) milieux = Math.max(milieux, pente((i + 0.5) / H.HOME_STAIR_TREADS) / moy);
  check("la hauteur monte MARCHE PAR MARCHE (pente aux joints ≪ pente au milieu d'une marche)", joints < 0.15 && milieux > 1.3, `joints ×${joints.toFixed(2)}, milieu ×${milieux.toFixed(2)} de la pente moyenne, ${H.HOME_STAIR_TREADS} marches`);
  const tVolee = (s.yPied - s.yHaut) / (5.2 / H.HOME_K * H.HOME_STAIR_SPEED);
  check("la volée prend entre 2 et 4 secondes", tVolee >= 2 && tVolee <= 4, `${tVolee.toFixed(2)} s à ${(5.2 * H.HOME_STAIR_SPEED).toFixed(2)} cases du monde par seconde`);
  // 2026-10-17 (après-midi) : la marche est ralentie, la volée garde sa vitesse ABSOLUE (celle jugée parfaite : 5,2 × 0,36 cases/s)
  const vVolee = C.PLAYER_SPEED * H.homeSpeedMul(true, true), vMarche = C.PLAYER_SPEED * H.homeSpeedMul(false, false);
  check("la volée garde sa vitesse (1,87 cases/s, course ou pas) ; la marche dedans est plus lente que dehors, la course aussi",
    Math.abs(vVolee - C.PLAYER_SPEED * 0.36) < 1e-9 && vMarche < C.PLAYER_SPEED && H.homeSpeedMul(false, true) < C.RUN_SPEED_MULT && vMarche > vVolee,
    `volée ${vVolee.toFixed(2)}, marche ${vMarche.toFixed(2)} (${(vMarche / C.PLAYER_SPEED).toFixed(2)} de la ville), course ${(C.PLAYER_SPEED * H.homeSpeedMul(false, true)).toFixed(2)} cases/s`);
  check("on est « sur la volée » au rez-de-chaussée, pas sur le palier ni dans la trémie des combles",
    H.homeOnFlight(P, 0, { volee: null }, 0.45, 3.5) && !H.homeOnFlight(P, 0, { volee: null }, 0.45, 6) && !H.homeOnFlight(P, 2, { volee: "haut" }, 0.45, 3.5) && !H.homeOnFlight(P, 1, { volee: null }, 0.45, 3.5) && H.homeOnFlight(P, 1, { volee: "haut" }, 0.45, 3.5));
}

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
    // les buts d'escalier, lus sur le plan (2026-10-17 : écrits en dur pour le plan de 7, ils visaient des murs dans celui de 9)
    if (rnd() < 0.25) return L === 0 ? { lx: 0.45, ly: s.yHaut, monte: true } : L === 1 ? (rnd() < 0.5 ? { lx: 0.45, ly: s.yPied + 0.4, puis: { lx: 0.45, ly: s.yHaut } } : { lx: 0.45, ly: s.yHaut - 0.3, puis: { lx: 0.45, ly: s.yHaut + 0.6 } }) : { lx: 0.45, ly: s.yHaut + 0.6 };
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
      const len = Math.hypot(dx, dy) || 1, sp = 0.09;   // 9 cm du plan : à K = 2, deux pas du jeu (5,2 cases du monde par seconde à 60 images)
      const prevLy = ly;
      if (H.homeBoxFree(sol, lx + dx / len * sp, ly)) lx += dx / len * sp;
      if (H.homeBoxFree(sol, lx, ly + dy / len * sp)) ly += dy / len * sp;
      if (!H.homeBoxFree(sol, lx, ly)) bad++;
      const r = H.homeStairStep(P, L, st, prevLy, lx, ly, { dx: dx / len, dy: dy / len });   // 2026-10-17 : le sens du pas, comme le jeu
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
  // 2026-10-17 (soir) : la trémie des combles compte — on s'y tient 0,25 case (`HOME_STAIR_DESC`) avant de redescendre.
  const total = P.niveaux.reduce((n, lv) => n + lv.pieces.length, 0);
  check(`${mk} : jamais la semelle dans un mur`, bad === 0, `${bad} sur ${steps} pas`);
  check(`${mk} : jamais coincé (un des huit pas reste toujours possible)`, trapped === 0, `${trapped} points coincés`);
  check(`${mk} : les trois niveaux, en montant et en descendant`, levels.size === 3 && ups > 0 && downs > 0, `${ups} montées, ${downs} descentes`);
  check(`${mk} : toutes les pièces visitées`, visited.size === total, `${visited.size} / ${total}`);
}

// ─── 6. la carte ──────────────────────────────────────────────────────────
console.log("\n=== 6. maison et niveau se lisent dans la position ===");
let rt = true;
for (let slot = 0; slot < C.TOWN_HOUSES.length; slot++) for (let L = 0; L < 3; L++) for (const [lx, ly] of [[0, 0], [P.w - 0.1, P.d - 0.1], [2.5, 3.5], [-0.3, -2.9]]) {
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
  // face à la cheminée (2026-10-17 : elle occupe le mur nord du séjour, x 3,0..4,15) : x = 2,6, y = 7,0 → en vingtièmes
  let r = H.resolveHomePlace(h, { u: canape.u, o: "N", n: 0, x: 52, y: 140 }, P, fac);
  check("poser le canapé face à la cheminée", r.ok, JSON.stringify(r));
  check("il a quitté le garde-meuble", !h.g.some((it) => it.u === canape.u) && h.m.some((it) => it.u === canape.u));
  r = H.resolveHomePlace(h, { u: canape.u, o: "S", n: 0, x: 0, y: 60 }, P, fac);
  check("refusé dans la cage d'escalier", !r.ok && r.raison === "escalier", JSON.stringify(r));
  r = H.resolveHomePlace(h, { u: canape.u, o: "S", n: 0, x: 95, y: 70 }, P, fac);
  check("refusé à cheval sur un mur", !r.ok, JSON.stringify(r));
  const biblio = h.g.find((it) => it.s === "bibliotheque");
  r = H.resolveHomePlace(h, { u: biblio.u, o: "S", n: 0, x: 25, y: 91 }, P, fac);
  check("refusé devant la porte de la cuisine (le seuil)", !r.ok && (r.raison === "porte" || r.raison === "meuble" || r.raison === "passage"), JSON.stringify(r));
  const fauteuil = h.g.find((it) => it.s === "fauteuil");
  r = H.resolveHomePlace(h, { u: fauteuil.u, o: "S", n: 0, x: 56, y: 140 }, P, fac);
  check("refusé sur le canapé (deux meubles debout ne se chevauchent pas)", !r.ok && r.raison === "meuble", JSON.stringify(r));
  const tapis = h.g.find((it) => it.s === "tapis");
  r = H.resolveHomePlace(h, { u: tapis.u, o: "S", n: 0, x: 50, y: 110 }, P, fac);
  check("un tapis se glisse sous les meubles", r.ok, JSON.stringify(r));
  // fermer le passage : de quoi boucher l'entrée (x 0..2.2, y 4.5..9) d'un mur de meubles
  const bloque = { m: [{ u: 900, s: "lit", o: "E", n: 0, x: 0, y: 110 }, { u: 901, s: "canape", o: "W", n: 0, x: 25, y: 95 }], g: [], d: {}, k: 902 };
  const vb = H.homeCanPlace(P, fac, { ...bloque, m: [bloque.m[0]] }, bloque.m[1], 901);
  check("refusé quand une pièce ou l'escalier devient inatteignable", !vb.ok, JSON.stringify(vb));
  {
    // contre le mur nord de la chambre (la cloison à 5,3, sa face à 5,35 ; la cheminée tient celui du séjour)
    const sp = H.homeSnap(P, fac, 1, "canape", "S", 3.6, 5.4 + 0.35);
    check("l'aimant : un canapé lâché près du mur de la chambre s'y plaque", Math.abs(sp.y / H.HOME_Q - 5.35) < 0.051, `y = ${sp.y / H.HOME_Q}`);
    const sp2 = H.homeSnap(P, fac, 0, "canape", "S", 3.6, 6.8);
    check("l'aimant : loin des murs, le pas est le quart de case", Math.abs(((sp2.y / H.HOME_Q) * 4) - Math.round((sp2.y / H.HOME_Q) * 4)) < 1e-9, `y = ${sp2.y / H.HOME_Q}`);
  }
  {
    // l'aimant ne fait jamais dépasser dans un mur : chaque meuble lâché contre chaque mur du séjour
    let bad = [];
    for (const s of ["plante_verte", "canape", "bibliotheque", "lit", "poele", "fauteuil"]) for (const o of H.homeOrients(s)) {
      for (const [px, py] of [[2.3, 6.7], [4.9, 6.7], [3.6, 4.6], [3.6, 8.9], [4.9, 8.9], [2.3, 4.6]]) {
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
  const RAISONS = ["sprite", "niveau", "grille", "dehors", "escalier", "mur", "meuble", "porte", "passage", "inconnu", "catalogue", "piece", "deja", "or", "equipement"];
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

// ─── 9. les maisons du plan de 7 cases (2026-10-17) ───────────────────────
console.log("\n=== 9. une maison écrite sur le plan de 7 cases ===");
{
  const fac = H.homeFacade(null, P);
  // Une maison de la veille (pas de `pv`) : le lit de départ, le canapé au milieu du séjour
  // d'alors (y 6,0), un fauteuil dans la cuisine, un fauteuil EN DOUBLE sur le premier
  // (impossible à reposer : il doit finir au garde-meuble, pas disparaître), et une table
  // basse contre le mur nord de la cuisine, là où sont maintenant les plans de travail.
  const vieille = { m: [
    { u: 1, s: "lit", o: "S", n: 1, x: 53, y: 87 },
    { u: 2, s: "canape", o: "S", n: 0, x: 48, y: 120 },
    { u: 3, s: "fauteuil", o: "S", n: 0, x: 60, y: 30 },
    { u: 4, s: "fauteuil", o: "S", n: 0, x: 60, y: 30 },
    { u: 6, s: "table_basse", o: "S", n: 0, x: 26, y: 1 },
  ], g: [{ u: 5, s: "tapis" }], d: { "0:sejour": { p: "damas" } }, k: 7 };
  const n = H.migrateHome(vieille);
  const at = (u) => n.m.find((it) => it.u === u);
  check("elle passe à la version du plan", n.pv === H.HOME_PLAN_V && vieille.pv === undefined, `pv ${n.pv} (l'ancienne n'est pas modifiée)`);
  check("le lit suit la chambre (+1 case)", at(1) && at(1).y === 107, JSON.stringify(at(1)));
  check("le canapé suit le séjour (+1 case)", at(2) && at(2).y === 140, JSON.stringify(at(2)));
  check("la table basse tombée sur la cuisine équipée part au garde-meuble", !at(6) && n.g.some((it) => it.u === 6));
  check("le fauteuil de la cuisine ne bouge pas", at(3) && at(3).y === 30, JSON.stringify(at(3)));
  check("le fauteuil en double part au garde-meuble", !at(4) && n.g.some((it) => it.u === 4));
  check("rien ne se perd (posés + garde-meuble)", n.m.length + n.g.length === vieille.m.length + vieille.g.length, `${n.m.length} posés, ${n.g.length} au garde-meuble`);
  check("le décor des pièces est gardé", n.d["0:sejour"] && n.d["0:sejour"].p === "damas");
  check("chaque meuble reposé est posable", n.m.every((it) => H.homeCanPlace(P, fac, n, it, it.u).ok));
  check("une maison déjà au plan de 9 n'est pas touchée", H.migrateHome(n) === n);
  check("la maison de départ est au plan de 9", H.homeDepart().pv === H.HOME_PLAN_V);
  // Une maison déjà au plan de 9 (pv 2, la veille des équipements) : RIEN ne bouge, seul ce qui tombe sur un équipement s'en va.
  const v2 = { m: [{ u: 1, s: "canape", o: "N", n: 0, x: 52, y: 140 }, { u: 2, s: "fauteuil", o: "S", n: 0, x: 62, y: 0 }], g: [], d: {}, k: 3, pv: 2 };
  const n2 = H.migrateHome(v2);
  check("plan de 9 sans équipements → avec : le canapé ne bouge pas", n2.m.some((it) => it.u === 1 && it.y === 140));
  check("plan de 9 sans équipements → avec : le fauteuil sur la cuisinière part au garde-meuble", !n2.m.some((it) => it.u === 2) && n2.g.some((it) => it.u === 2));
}

// ─── 10. les équipements de la maison (2026-10-17) ─────────────────────────
console.log("\n=== 10. les équipements (cuisine, bains, cheminée, radiateurs) ===");
{
  const M = mods.maisonSprites.MEUBLES;
  for (const mk of ["n1", "n2"]) for (const variant of ["simple", "riche"]) {
    const m = C.TOWN_HOUSE_MODELS[mk];
    if (!m || !m.variants[variant]) continue;
    const fac = H.homeFacade({ model: mk, variant }, P);
    for (let L = 0; L < P.niveaux.length; L++) {
      const fx = H.homeFixes(P, L, fac);
      const sansImage = fx.filter((f) => !(M[f.sprite] && M[f.sprite][f.o]));
      const murs = H.homeSolids(P, L, fac, [], false);
      const rects = fx.map(H.homeFurnitureRect);
      const inter = (a, b) => a[2] > b[0] + 1e-6 && a[0] < b[2] - 1e-6 && a[3] > b[1] + 1e-6 && a[1] < b[3] - 1e-6;
      const dansMur = fx.filter((f, i) => murs.some((w) => inter(rects[i], w)));
      const croises = rects.some((a, i) => rects.some((b, j) => j > i && inter(a, b)));
      const portes = H.homeDoorClearances(P, L).filter(() => true);
      const devantPorte = fx.filter((f, i) => portes.some((c) => inter(rects[i], c)));
      const horsPiece = fx.filter((f, i) => { const pc = H.homeRoomAt(P, L, (rects[i][0] + rects[i][2]) / 2, (rects[i][1] + rects[i][3]) / 2); return !pc || pc.id === "cage"; });
      const ok = !sansImage.length && !dansMur.length && !croises && !devantPorte.length && !horsPiece.length;
      check(`${mk} ${variant} niveau ${L} : ${fx.length} équipements, chacun rendu, dans sa pièce, hors des murs, des portes et des autres`, ok,
        [sansImage.length && "sans image : " + sansImage.map((f) => f.sprite), dansMur.length && "dans un mur : " + dansMur.map((f) => f.sprite),
         croises && "deux se chevauchent", devantPorte.length && "devant une porte : " + devantPorte.map((f) => f.sprite),
         horsPiece.length && "hors pièce : " + horsPiece.map((f) => f.sprite)].filter(Boolean).join(" ; "));
      if (L < 2) {
        const rad = fx.filter((f) => /^radiateur/.test(f.sprite)).length, fen = (fac.fenetres[L] || []).length;
        check(`${mk} ${variant} niveau ${L} : un radiateur sous chaque fenêtre de la façade`, rad === fen, `${rad} radiateurs, ${fen} fenêtres`);
      }
    }
  }
  const fac = H.homeFacade({ model: "n2", variant: "simple" }, P);
  check("la cuisine a son évier, sa cuisinière, ses plans de travail ; les bains leur baignoire, lavabo, toilettes ; le séjour sa cheminée",
    ["evier", "cuisiniere", "plan_travail_118", "plan_travail_165", "cheminee"].every((s) => H.homeFixes(P, 0, fac).some((f) => f.sprite === s)) &&
    ["baignoire", "lavabo", "wc"].every((s) => H.homeFixes(P, 1, fac).some((f) => f.sprite === s)));
  const h = H.homeClone(H.homeOf({}, "x")); H.resolveHomeGift(h);
  check("aucun équipement au garde-meuble du menu développeur", !h.g.some((it) => H.homeFixe(it.s)), `${h.g.length} meubles`);
  check("un équipement ne se pose pas (ce n'est pas un meuble)", H.homeCanPlace(P, fac, h, { u: 999, s: "baignoire", o: "S", n: 1, x: 60, y: 120 }).raison === "sprite");
  const v = H.homeCanPlace(P, fac, h, { u: 998, s: "fauteuil", o: "S", n: 0, x: 62, y: 0 });
  check("un meuble posé sur un équipement : refusé, raison « equipement »", !v.ok && v.raison === "equipement", JSON.stringify(v));
  check("on ne marche pas à travers la baignoire", !H.homeBoxFree(H.homeSolids(P, 1, fac), 4.2, 0.4));
}


// ─── 11. le lit, le cadrage par pièce, la salle de bain (2026-10-17, soir) ──
console.log("\n=== 11. le lit se tient DANS SA PIÈCE ; un cadre par pièce ; les bains agrandis ===");
{
  const facN = H.homeFacade({ model: "n2", variant: "simple" }, P);
  const lit = H.HOME_DEPART.find((f) => /^lit/.test(f.sprite)), [bx0, by0, bx1, by1] = H.homeFurnitureRect(lit);
  /* « Bug lit, accessible depuis une autre salle » : la portée se mesurait en ligne droite, cloison comprise. On balaie
     TOUT le niveau : tout point praticable d'où l'invite s'affiche doit être dans la pièce du lit. */
  let dedans = 0, travers = [], vus = 0;
  for (let lx = 0.1; lx < P.w; lx += 0.05) for (let ly = 0.1; ly < P.d; ly += 0.05) {
    if (!H.homeBoxFree(H.homeSolids(P, 1, facN), lx, ly)) continue;
    vus++;
    if (!H.homeNearFurnitureIn(P, 1, lit, lx, ly)) continue;
    const pc = H.homeRoomAt(P, 1, lx, ly), pcLit = H.homeRoomAt(P, 1, (bx0 + bx1) / 2, (by0 + by1) / 2);
    if (pc && pcLit && pc.id === pcLit.id) dedans++; else travers.push(lx.toFixed(2) + "," + ly.toFixed(2) + " " + (pc && pc.id));
  }
  check("l'invite du lit ne s'affiche que dans la pièce du lit", travers.length === 0 && dedans > 50, `${dedans} points dans la chambre, ${travers.length} à travers un mur (sur ${vus} praticables)`);
  const ancien = []; 
  for (let lx = 0.1; lx < P.w; lx += 0.05) for (let ly = 0.1; ly < P.d; ly += 0.05) {
    if (H.homeBoxFree(H.homeSolids(P, 1, facN), lx, ly) && H.homeNearFurniture(lit, lx, ly) && !H.homeNearFurnitureIn(P, 1, lit, lx, ly)) ancien.push([lx, ly]);
  }
  check("falsification : l'ancienne portée en ligne droite, elle, atteignait le lit à travers la cloison", ancien.length > 0, `${ancien.length} points de l'ancienne portée refusés (dressing, palier)`);
  check("du dressing, collé à la cloison, le lit n'est pas à portée ; de la chambre, il l'est",
    !H.homeNearFurnitureIn(P, 1, lit, (bx0 + bx1) / 2, 5.20) && H.homeNearFurnitureIn(P, 1, lit, (bx0 + bx1) / 2, by1 + 0.3), `lit [${bx0.toFixed(2)}, ${by0.toFixed(2)}] — dressing y 5.20, chambre y ${(by1 + 0.3).toFixed(2)}`);

  // chaque pièce de chaque niveau tombe dans un cadre, qui l'enveloppe, et que le niveau contient
  let sansCadre = 0, trop = [];
  for (let L = 0; L < P.niveaux.length; L++) for (const pc of P.niveaux[L].pieces) {
    const key = H.homeCadreOf(P, L, pc.id), box = H.homeCadreBox(P, L, key);
    for (const [x0, y0, x1, y1] of pc.rects) if (!(box[0] <= x0 && box[1] <= y0 && box[2] >= x1 && box[3] >= y1)) sansCadre++;
    const ctr = pc.rects[0], at = H.homeCadreAt(P, L, (ctr[0] + ctr[2]) / 2, (ctr[1] + ctr[3]) / 2);
    if (at !== key) trop.push(L + ":" + pc.id);
    // le cadre tient dans la bande que le plan réserve à son niveau (HOME_LEVEL_H) — ni au-dessus ni au-dessous
    if (box[1] * H.HOME_K < -HMAmargin(L) || box[3] > P.d + 0.7) trop.push("hors bande " + L + ":" + pc.id);
  }
  check("chaque pièce tombe dans un cadre qui l'enveloppe, murs du fond compris", sansCadre === 0 && trop.length === 0, trop.join(", ") || "toutes");
  check("la cage d'escalier se cadre avec la pièce où elle s'ouvre (jamais seule, 0,9 case de large)",
    H.homeCadreOf(P, 0, "cage") === H.homeCadreOf(P, 0, "entree") && H.homeCadreOf(P, 1, "cage") === H.homeCadreOf(P, 1, "palier") && H.homeCadreOf(P, 2, "cage") === H.homeCadreOf(P, 2, "combles"));
  const bb = H.homeCadreBox(P, 1, "bains"), bw = (bb[2] - bb[0]), bh = (bb[3] - bb[1]);
  check("les cadres des pièces sont serrés : celui de la chambre ne montre ni les bains ni la cuisine", H.homeCadreBox(P, 1, "chambre")[1] > 5.3 - 3.2 && bw < P.w + 1.6, `chambre commence à y ${H.homeCadreBox(P, 1, "chambre")[1].toFixed(2)} ; bains ${bw.toFixed(1)} × ${bh.toFixed(1)} cases (mur compris)`);

  const aire = (id) => P.niveaux[1].pieces.find((p) => p.id === id).rects.reduce((a, [x0, y0, x1, y1]) => a + (x1 - x0) * (y1 - y0), 0);
  check("la salle de bain est plus grande qu'avant (7,8 cases²) d'au moins 25 %", aire("bains") >= 7.84 * 1.25, `${aire("bains").toFixed(1)} cases² (${(aire("bains") * H.CASE_M * H.CASE_M).toFixed(0)} m²)`);
  check("le dressing garde de quoi servir (≥ 5 cases²) et le couloir du palier reste franchissable", aire("dressing") >= 5 && P.niveaux[1].cloisons.find((c) => c.x === 2.0 && c.portes) !== undefined, `${aire("dressing").toFixed(1)} cases²`);
  // fenêtre, miroir, prise des bains : à la hauteur du personnage (0,85 m à l'échelle des murs), pas à celle d'un adulte
  const bn = P.niveaux[1].pieces.find((p) => p.id === "bains"), mi = P.niveaux[1].peints.find((q) => q.quoi === "miroir"), pr = P.niveaux[1].peints.find((q) => q.quoi === "prise");
  check("les bains : appui de fenêtre, miroir et prise plus bas que ceux d'un adulte (0,90 m, 1,15 m, 1,25 m)", bn.fenetre.allege < 0.90 && mi.bas < 1.15 && pr.z < 1.25, `appui ${bn.fenetre.allege} m, miroir ${mi.bas}–${mi.haut} m, prise ${pr.z} m`);
  const lav = MA_SPRITES.lavabo.S;
  check("le lavabo est plus bas qu'un lavabo d'adulte (rendu rebasé : image plus basse que 68 px d'origine)", lav.h < 68, `${lav.h} px`);

  // ── 12. LES COTES D'USAGE SE LISENT CONTRE LE PERSONNAGE (2026-10-17, après-midi : « la tête du player est en dessous des
  //       plans de travail et objets »). Le personnage fait 1,70 / K = 0,85 m à côté des murs ; ce qui s'utilise debout
  //       ne doit pas le dépasser. ⚠️ La cote est lue sur l'IMAGE RENDUE (hauteur de l'image − sa profondeur), pas sur la table
  //       du script Blender : c'est ce que le joueur voit.
  console.log("\n=== 12. les cotes d'usage contre le personnage ===");
  check("le personnage fait 1,70 / K à côté des murs", Math.abs(H.HOME_PERSO_M - 1.70 / H.HOME_K) < 1e-9, `${H.HOME_PERSO_M} m (K = ${H.HOME_K})`);
  const py = fs.readFileSync(path.join(ROOT, "tools/blender/meubles.py"), "utf8");
  const U0 = H.ECHELLE_USAGE;
  const kPy = Number((py.match(/^HOME_K = ([0-9.]+)/m) || [])[1]);
  check("le script Blender (meubles.py) a le même K que le jeu — une grandeur écrite à deux endroits", kPy === H.HOME_K, `Blender ${kPy}, jeu ${H.HOME_K}`);
  const EQUIP = ["plan_travail_118", "plan_travail_165", "evier", "cuisiniere", "lavabo", "wc", "baignoire"];
  const haut = (s) => (s.h / MA.MPX) * H.CASE_M - s.fd;                  // hauteur max de l'équipement, en m
  const hauts = EQUIP.filter((n) => haut(MA_SPRITES[n].S) > 0.75 * H.HOME_PERSO_M);
  check("aucun équipement d'usage (plans, évier, cuisinière, lavabo, toilettes, baignoire) ne dépasse les trois quarts du personnage", hauts.length === 0,
    hauts.length ? "trop hauts : " + hauts.map((n) => `${n} ${haut(MA_SPRITES[n].S).toFixed(2)} m`).join(", ")
                : EQUIP.map((n) => `${n} ${haut(MA_SPRITES[n].S).toFixed(2)}`).join(" · ") + ` (limite ${(0.75 * H.HOME_PERSO_M).toFixed(2)} m)`);
  // falsification : la limite, posée sur les hauteurs de la veille (images de 83, 86, 83, 88, 57, 73, 78 px), les refuserait toutes (sept sur sept au 2026-10-17)
  const AVANT = { plan_travail_118: 83, plan_travail_165: 86, evier: 83, cuisiniere: 88, lavabo: 57, wc: 73, baignoire: 78 };
  const refus = EQUIP.filter((n) => ((AVANT[n] / MA.MPX) * H.CASE_M - MA_SPRITES[n].S.fd) > 0.75 * H.HOME_PERSO_M);
  check("falsification : cette limite refuse les hauteurs d'avant (plans et cuisinière à 0,9 m)", refus.length >= 5, `${refus.length} sur ${EQUIP.length} refusés : ${refus.join(", ")}`);
  // 2026-10-17 (après-midi) : le séjour, la chambre et les radiateurs suivent. La table du jeu (`maison.ECHELLE_Z_SPRITES`) et celle de Blender
  // (`meubles.ECHELLE_Z`) sont DEUX écritures de la même liste : on les lit toutes les deux.
  const tuple = (py.match(/ECHELLE_Z = \{nom: 1\.0 \/ HOME_K for nom in \(([^)]*)\)\}/) || [])[1] || "";
  const pyNoms = [...tuple.matchAll(/"(\w+)"/g)].map((m) => m[1]);
  const pyFacteurs = Object.fromEntries(pyNoms.map((n) => [n, 1 / kPy]));
  for (const m of py.matchAll(/ECHELLE_Z\["(\w+)"\] = ([0-9.]+)/g)) pyFacteurs[m[1]] = Number(m[2]);
  const jeuNoms = Object.keys(H.ECHELLE_Z_SPRITES).sort(), blNoms = Object.keys(pyFacteurs).sort();
  check("la liste des sprites mis à l'échelle d'usage est la même dans le jeu et dans Blender, avec les mêmes facteurs",
    JSON.stringify(jeuNoms) === JSON.stringify(blNoms) && jeuNoms.every((n) => Math.abs(H.ECHELLE_Z_SPRITES[n] - pyFacteurs[n]) < 1e-9),
    `${jeuNoms.length} sprites : ${jeuNoms.join(", ")}`);
  const exempts = ["tapis", "tableau", "escalier"];
  const tous = Object.keys(MA_SPRITES).map((n) => n.replace(/(_(canard|vert|moutarde|allume|bleu|\d+))+$/, ""));
  const oublies = [...new Set(tous)].filter((n) => !exempts.includes(n) && !(n in H.ECHELLE_Z_SPRITES));
  check("aucun sprite n'échappe à l'échelle d'usage, sauf le tapis (à plat), le tableau (suspendu) et l'escalier (l'étage des murs)", oublies.length === 0, oublies.join(", ") || "tous couverts");
  // les images rendues l'ont bien été à l'échelle : plus basses d'au moins 10 % que celles d'avant (hauteurs en px de la veille, `S` ou la première orientation)
  const AV2 = { canape: 90, fauteuil: 83, table_basse: 63, bibliotheque: 140, lampadaire: 106, poele: 143, gueridon: 65, portemanteau: 110, plante_morte: 67, plante_verte: 91, lit: 182, radiateur_14: 49, cheminee: 92 };
  const perimes = Object.entries(AV2).filter(([n, h0]) => MA_SPRITES[n].S.h > 0.9 * h0);
  check("les images du séjour, de la chambre et des radiateurs sont rendues à l'échelle (au moins 10 % plus basses qu'avant) — un PNG périmé le trahirait",
    perimes.length === 0, perimes.length ? "périmés : " + perimes.map(([n]) => n).join(", ") : Object.entries(AV2).map(([n, h0]) => `${n} ${h0}→${MA_SPRITES[n].S.h}`).join(" · "));
  const oreiller = H.homeBedPillow({ sprite: "lit", o: "S", lx: 2.65, ly: 5.36 });
  check("le dormeur descend avec le matelas (oreiller à 0,58 × facteur du lit) ; le trumeau suit la tablette de la cheminée (1,08 m × son facteur)",
    Math.abs(oreiller.z - 0.58 * H.homeZk("lit")) < 1e-9 && Math.abs(U0.conduit.tablette - 1.08 * H.homeZk("cheminee")) < 0.02,
    `oreiller ${oreiller.z.toFixed(2)} m, tablette peinte ${U0.conduit.tablette} m (sprite ${(1.08 * H.homeZk("cheminee")).toFixed(2)} m)`);
  const cu = P.niveaux[0].pieces.find((p) => p.id === "cuisine"), U = H.ECHELLE_USAGE;
  check("les fenêtres de la cuisine et des bains : l'appui passe sous la tête du personnage et au-dessus du robinet (0,63 m)",
    [cu, bn].every((p) => p.fenetre && p.fenetre.allege >= 0.65 && p.fenetre.allege < H.HOME_PERSO_M), `cuisine ${cu.fenetre && cu.fenetre.allege} m, bains ${bn.fenetre && bn.fenetre.allege} m`);
  check("le miroir commence sous la tête du personnage, les prises de la cuisine et des bains aussi",
    mi.bas < H.HOME_PERSO_M && P.niveaux[0].peints.filter((q) => q.quoi === "prise").every((q) => q.z < H.HOME_PERSO_M) && pr.z < H.HOME_PERSO_M,
    `miroir ${mi.bas} m, prises ${U.priseCuisine} et ${U.priseBains} m`);
}
function HMAmargin(L) { return 3.2 * H.HOME_K; }

// ── 13. 2026-10-18 — LE DORMEUR DANS UN LIT PIVOTÉ, LES APPLIQUES, LE POÊLE (« le lit pivoté n'a pas sa propre animation de
//       sommeil » ; « des lumières qui ne viendraient pas des plafonds » — Guillaume).
console.log("\n=== 13. le lit pivoté, les appliques, le poêle ===");
{
  // la tête est sur l'oreiller, du côté de la tête de lit (vu sur les sprites : S nord, E ouest, W est, N sud), et tournée vers elle
  const cas = { S: [0, (r, p) => p.ly - r[1] < 0.4], E: [-1, (r, p) => p.lx - r[0] < 0.45], W: [1, (r, p) => r[2] - p.lx < 0.45], N: [2, (r, p) => r[3] - p.ly < 0.7] };
  const faux = Object.entries(cas).filter(([o, [rot, pres]]) => {
    const f = { sprite: "lit", o, lx: 1.0, ly: 5.5 }, r = H.homeFurnitureRect(f), p = H.homeBedPillow(f);
    return p.rot !== rot || !pres(r, p) || p.lx <= r[0] || p.lx >= r[2] || p.ly <= r[1] || p.ly >= r[3];
  }).map(([o]) => o);
  check("le dormeur se couche du côté de la tête de lit, la tête tournée vers elle, dans les quatre orientations", faux.length === 0, faux.join(", ") || "S, E, W, N");
  // une applique (au moins) par pièce éclairable, à l'écart des portes, des fenêtres et de ce qui est peint au mur ; plus d'ampoule pendante
  const sans = [], serres = [];
  P.niveaux.forEach((lv, L) => {
    const faces = H.homeFaces(P, L);
    for (const pc of lv.pieces) {
      if (pc.id === "cage") continue;
      const aps = faces.filter((f) => f.room === pc.id).flatMap((f) => MA.homeAppliques(P, L, f).map((a) => ({ a, f })));
      if (!aps.length) sans.push(L + ":" + pc.id);
      for (const { a, f } of aps) {
        const bouche = [...(f.portes || []), ...(f.fenetres || []), ...(lv.peints || []).filter((q) => Math.abs(q.y - f.y) < 0.06 && q.x0 != null).map((q) => [q.x0, q.x1])];
        if (a.lx < f.x0 + 0.1 || a.lx > f.x1 - 0.1 || bouche.some(([x0, x1]) => a.lx > x0 - 0.06 && a.lx < x1 + 0.06)) serres.push(L + ":" + pc.id + "@" + a.lx.toFixed(2));
      }
    }
  });
  check("chaque pièce (hors cage) a son applique sur un mur du fond", sans.length === 0, sans.join(", ") || "toutes");
  check("aucune applique ne mord une porte, une fenêtre, la hotte, le miroir ou le trumeau", serres.length === 0, serres.join(", ") || "toutes à l'écart");
  check("l'applique est au-dessus de la tête du personnage, sous la corniche", MA.APPLIQUE_Z > H.HOME_PERSO_M + 0.2 && MA.APPLIQUE_Z < 2.3, `${MA.APPLIQUE_Z} m`);
  check("plus aucune ampoule ne pend d'un plafond (le dessin `drawBulb` a disparu)", typeof MA.drawBulb === "undefined");
  // le tuyau du poêle : une amorce dans le sprite, le reste dessiné jusqu'au mur — l'image ne monte plus au-dessus de son amorce
  const pS = MA_SPRITES.poele.S, haut = (pS.ay - pS.fd / H.CASE_M * MA.MPX) / MA.MPX * H.CASE_M;   // la hauteur montrée par l'image, en m
  check("le poêle n'apporte qu'une amorce de tuyau (le jeu le mène au mur) ; le tuyau rentre sous la corniche",
    haut < 0.75 && MA.TUYAU_Z < 2.3 && MA.TUYAU_Z > 1.10 * H.homeZk("poele"), `image ${haut.toFixed(2)} m de haut, entrée au mur à ${MA.TUYAU_Z} m`);
}

// ── 14. 2026-10-18 — LOT 2b : LE CATALOGUE ET LES CARTONS (docs/PROJETS.md §6, réponses 5, 6, 8).
console.log("\n=== 14. le catalogue et les cartons ===");
{
  const cat = H.HOME_CATALOGUE;
  const absents = cat.flatMap((e) => e.coloris.filter((sp) => !MA_SPRITES[sp]));
  check("chaque coloris du catalogue a son sprite rendu", absents.length === 0, absents.join(", ") || `${cat.length} articles, ${cat.reduce((n, e) => n + e.coloris.length, 0)} coloris`);
  const interdits = cat.flatMap((e) => e.coloris).filter((sp) => sp === "escalier" || /_allume$/.test(sp) || H.homeFixe(sp) || H.homeWallItem(sp) || sp === "plante_morte");
  check("ni l'escalier, ni un équipement, ni un objet de mur, ni une version allumée, ni la plante morte ne se commandent", interdits.length === 0, interdits.join(", ") || "aucun");
  const prix = cat.map((e) => e.prix), plante = cat.find((e) => e.id === "plante_verte").prix, canape = cat.find((e) => e.id === "canape").prix;
  check("prix à l'échelle de la garde-robe (1 200 à 14 000) ; une plante ≈ un chapeau, un canapé 5 à 10 fois plus (décision 8)",
    prix.every((x) => x >= 1200 && x <= 14000) && canape / plante >= 5 && canape / plante <= 10, `${Math.min(...prix)}–${Math.max(...prix)} or, canapé/plante ${(canape / plante).toFixed(1)}`);
  check("chaque page du catalogue a des articles, chaque article une page connue", H.HOME_CATALOGUE_PAGES.every((pg) => cat.some((e) => e.page === pg)) && cat.every((e) => H.HOME_CATALOGUE_PAGES.includes(e.page)));
  // le parcours : commander (jour 3) → livré le jour 4, pas avant ; déballer → garde-meuble ; rentrer les cartons
  const h = H.homeDepart();
  check("la maison de départ déclare ses cartons (champ neuf `c`, vide) ; une sauvegarde d'avant (sans `c`) n'en a aucun",
    Array.isArray(h.c) && h.c.length === 0 && H.homeCartons({ m: [], g: [], d: {} }).length === 0);
  const r1 = H.resolveHomeOrder(h, { s: "canape_canard" }, 3), c = h.c[0];
  const r2 = H.resolveHomeUnbox(h, { u: c.u }, 3);
  const rIn0 = H.resolveHomeCartonsIn(h, 3);
  const rIn1 = H.resolveHomeCartonsIn(h, 4);
  const r3 = H.resolveHomeUnbox(h, { u: c.u }, 4);
  check("commandé le jour 3 : livré le 4 (pas avant), il entre avec son propriétaire, déballé il va au garde-meuble",
    r1.ok && r1.prix === 12000 && c.d === 4 && !r2.ok && r2.raison === "enRoute" && !rIn0.ok && rIn1.ok && rIn1.n === 1 && r3.ok && h.g.some((x) => x.u === c.u && x.s === "canape_canard") && h.c.length === 0,
    `prix ${r1.prix}, livraison jour ${c.d}, refus avant : ${r2.raison}`);
  const h2 = H.homeDepart();
  for (let i = 0; i < H.HOME_CARTONS_MAX; i++) H.resolveHomeOrder(h2, { s: "plante_verte" }, 1);
  const rFull = H.resolveHomeOrder(h2, { s: "plante_verte" }, 1), rBad = H.resolveHomeOrder(h2, { s: "escalier" }, 1);
  check(`pas plus de ${H.HOME_CARTONS_MAX} cartons par maison ; hors catalogue refusé`, !rFull.ok && rFull.raison === "cartons" && !rBad.ok, `${rFull.raison}, ${rBad.raison}`);
  check("chaque commande prend un identifiant neuf (deux cartons ne se confondent pas)", new Set(h2.c.map((x) => x.u)).size === h2.c.length);
  // les places : le catalogue et les cartons dans l'entrée, hors de la zone de la porte, hors de la volée, et sans se chevaucher
  const ent = P.niveaux[0].pieces.find((pc) => pc.id === "entree").rects[0];
  const dans = (x, y, w, d) => x >= ent[0] && x + w <= ent[2] && y >= ent[1] && y + d <= ent[3];
  const mauvais = [], etroites = Object.keys(C.TOWN_HOUSE_MODELS).filter((k) => /^n/i.test(k));
  if (!etroites.length) mauvais.push("aucun modèle d'étroite lu (n1, n2…) : le contrôle ne mesurerait rien");
  for (const model of etroites) {
    const v = Object.keys(C.TOWN_HOUSE_MODELS[model].variants)[0], fac = H.homeFacade({ model, variant: v });
    const ca = H.homeCataloguePos(P, fac), sp = H.homeCartonSpots(P), K2 = H.HOME_CARTON_C;
    if (!dans(ca.lx, ca.ly, ca.w, ca.h)) mauvais.push(model + " catalogue hors de l'entrée");
    if (H.homeNearExit(fac, ca.lx + ca.w / 2, ca.ly - 0.3)) mauvais.push(model + " catalogue dans la zone de la porte");
    for (const p of sp) {
      if (!dans(p.lx, p.ly, K2, K2)) mauvais.push(model + " carton hors de l'entrée");
      if (p.ly < P.escalier.yPied + 0.3) mauvais.push(model + " carton au pied de la volée");
      if (p.lx < ca.lx + ca.w && p.lx + K2 > ca.lx && p.ly < ca.ly + ca.h && p.ly + K2 > ca.ly) mauvais.push(model + " carton sur le catalogue");
    }
  }
  check("le catalogue et les cartons tiennent dans l'entrée, hors de la porte et du pied de la volée, sans se chevaucher", mauvais.length === 0, mauvais.slice(0, 4).join(" ; ") || etroites.join(", "));
}

console.log(`\n${ok} OK, ${ko} ÉCHEC`);
process.exit(ko ? 1 : 0);
