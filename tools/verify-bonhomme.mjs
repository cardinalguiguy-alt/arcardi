/* =============================================================================
   verify-bonhomme.mjs — LE BONHOMME DE NEIGE SE MONTE-T-IL COMME ON LE PROMET ? (2026-10-05)
   -----------------------------------------------------------------------------
   Guillaume : « possibilité de construire un bonhomme de neige quand le sol est
   couvert de neige » ; tranché : on ROULE les boules, on en empile trois, on
   choisit les accessoires. `bonhomme.js` est pur : ce banc le JOUE.
     §1  la boule : elle grossit en roulant (vite au début, plus lentement ensuite),
         jamais au-delà de R_MAX, et pas du tout sur une neige trop mince ;
     §2  l'empilement : trois boules au plus, la plus grosse en bas, la troisième
         ouvre le décor ; une boule trop grosse se pose À CÔTÉ ;
     §3  l'hôte : une boule qu'on n'a pas prise ne se pose pas, une taille annoncée
         plus grande que le temps écoulé ne le permet est ramenée, deux joueurs ne
         prennent pas la même boule, la carte a un plafond ;
     §4  le décor : ramené au catalogue (une valeur inconnue retombe au défaut) ;
     §5  le dégel : daté quand la neige part, l'affaissement monte de 0 à 1, l'hôte
         retire le bonhomme au bout de THAW_MS ; un joueur parti lâche sa boule ;
     §6  l'obstacle : on se cogne au pied d'un bonhomme, pas à un pas de lui.
   Usage : node tools/verify-bonhomme.mjs
   ========================================================================== */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bonhomme-"));
fs.writeFileSync(path.join(tmp, "bonhomme.js"), fs.readFileSync(path.join(ROOT, "components", "ferme", "bonhomme.js"), "utf8"));
const BN = await import(pathToFileURL(path.join(tmp, "bonhomme.js")).href);
const K = BN.SNOWMAN;

let fails = 0, total = 0;
const ok = (n, c, x) => { total++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };
const section = (t) => console.log(`\n=== ${t} ===\n`);
let seq = 0;
const KICK_GAP = BN.KICK.GAP_MS;
const newId = () => "s" + (++seq);

section("§1 — la boule");
{
  let r = K.R0, d = 0;
  const marks = [];
  while (r < K.R_MAX - 1e-6 && d < 100) { r = BN.rollGrow(r, 0.1, 1); d += 0.1; if (Math.abs(d - 3) < 0.05 || Math.abs(d - 6) < 0.05) marks.push(r); }
  ok("de R0 à R_MAX en une quinzaine de cases de neige épaisse", d > 12 && d < 18, `${d.toFixed(1)} cases`);
  ok("elle grossit vite au début, plus lentement ensuite", marks.length === 2 && (marks[0] - K.R0) > (marks[1] - marks[0]), marks.map((v) => v.toFixed(3)).join(" → "));
  ok("jamais au-delà de R_MAX", BN.rollGrow(K.R_MAX, 50, 1) === K.R_MAX);
  // Falsifié : `MIN_CM` à 0 → la neige d'un centimètre ferait grossir la boule.
  ok("rien sous une neige trop mince", BN.snowK(K.MIN_CM - 0.1) === 0 && BN.rollGrow(K.R0, 5, BN.snowK(1)) === K.R0);
  ok("une neige mince en donne moins qu'une épaisse", BN.snowK(3) < BN.snowK(8) && BN.snowK(8) === 1);
  ok("pousser une grosse boule ralentit, sans arrêter", BN.rollSpeedMul(K.R0) === 1 && Math.abs(BN.rollSpeedMul(K.R_MAX) - K.SLOW_AT_MAX) < 1e-9);
  /* ⚠️ 2026-10-05 — « PLUS LONG DE LES POUSSER QUAND ELLES GROSSISSENT » : on mesure le TEMPS, pas la
     distance. On rejoue la poussée à pas de 0,05 case (vitesse de marche 1 case/s × le facteur), avec les
     anciens nombres (GROW_K 0,03, ralentissement 0,55) et les nouveaux, et on exige que le nouveau soit
     nettement plus long ; et que chaque case suivante coûte plus de temps que la précédente. */
  const timeToMax = (growK, slowAtMax) => {
    let r = K.R0, t = 0, steps = 0; const perCase = [];
    while (r < K.R_MAX - 1e-6 && steps < 20000) {
      const u = Math.max(0, Math.min(1, (r - K.R0) / (K.R_MAX - K.R0))), mul = 1 - (1 - slowAtMax) * u;
      const dd = 0.05; t += dd / mul; steps++;
      r = Math.min(K.R_MAX, Math.sqrt(r * r + growK * dd));
      if (steps % 20 === 0) perCase.push(1 / mul);
    }
    return { t, perCase };
  };
  const oldT = timeToMax(0.03, 0.55), newT = timeToMax(K.GROW_K, K.SLOW_AT_MAX);
  ok("pousser une boule jusqu'au rayon maximal est nettement plus long qu'avant (≥ 1,7 fois)", newT.t >= 1.7 * oldT.t, `${newT.t.toFixed(1)} s contre ${oldT.t.toFixed(1)} s (à 1 case/s)`);
  ok("chaque case suivante prend plus de temps que la précédente", newT.perCase.every((v, i, a) => i === 0 || v >= a[i - 1] - 1e-9) && newT.perCase[newT.perCase.length - 1] > 2.5 * newT.perCase[0], `de ${newT.perCase[0].toFixed(2)} à ${newT.perCase[newT.perCase.length - 1].toFixed(2)} s la case`);
  ok("la marche tombe sous le tiers à la boule maximale", BN.rollSpeedMul(K.R_MAX) < 0.34);
  ok("PORTER une boule ralentit moins que la pousser, et ne l'arrête jamais", BN.carrySpeedMul(K.R0) === 1 && BN.carrySpeedMul(K.R_MAX) >= 0.7 - 1e-9 && [0.2, 0.3, 0.4, 0.5, 0.6].every((r) => BN.carrySpeedMul(r) > BN.rollSpeedMul(r)));
}

section("§2 — l'empilement");
{
  const st = { snowmen: [], snowRoll: {} };
  const t0 = 1.78e12;
  BN.resolveSnowTake(st, "a", "farm", null, t0);
  const a = BN.resolveSnowDrop(st, "a", "farm", 10, 10, 0.55, t0 + 10000, 5.2, newId);
  ok("une boule posée seule fait un tas", a.ok && !a.stacked && st.snowmen.length === 1 && st.snowmen[0].balls[0] === 0.55);
  BN.resolveSnowTake(st, "a", "farm", null, t0 + 11000);
  const big = BN.resolveSnowDrop(st, "a", "farm", 10.3, 10, 0.54, t0 + 21000, 5.2, newId);
  // Falsifié : `STACK_RATIO` à 1,5 → la boule de 0,54 s'empilerait sur celle de 0,55.
  ok("une boule trop grosse se pose À CÔTÉ", big.ok && !big.stacked && big.tooBig && st.snowmen.length === 2);
  st.snowmen.pop();
  BN.resolveSnowTake(st, "b", "farm", null, t0 + 22000);
  const b = BN.resolveSnowDrop(st, "b", "farm", 10.4, 10.1, 0.4, t0 + 30000, 5.2, newId);
  ok("une boule plus petite s'empile", b.ok && b.stacked && !b.done && st.snowmen[0].balls.length === 2);
  BN.resolveSnowTake(st, "a", "farm", null, t0 + 31000);
  const c = BN.resolveSnowDrop(st, "a", "farm", 10, 10, 0.3, t0 + 36000, 5.2, newId);
  ok("la troisième boule finit le bonhomme et ouvre le décor", c.ok && c.stacked && c.done && !!st.snowmen[0].deco);
  BN.resolveSnowTake(st, "b", "farm", null, t0 + 37000);
  const d = BN.resolveSnowDrop(st, "b", "farm", 10, 10, 0.2, t0 + 40000, 5.2, newId);
  ok("un bonhomme fini n'accepte pas de quatrième boule", d.ok && !d.stacked && st.snowmen[0].balls.length === 3 && st.snowmen.length === 2);
  ok("on ne démonte pas un bonhomme fini", BN.resolveSnowTake(st, "a", "farm", st.snowmen[0].id, t0 + 41000).reason === "done");
  const top = BN.resolveSnowTake(st, "a", "farm", st.snowmen[1].id, t0 + 42000);
  ok("on reprend une boule posée (elle garde sa taille)", top.ok && top.r === 0.2 && st.snowmen.length === 1);
}

section("§3 — l'hôte");
{
  const st = { snowmen: [], snowRoll: {} };
  const t0 = 1.78e12;
  ok("une boule qu'on n'a pas prise ne se pose pas", BN.resolveSnowDrop(st, "x", "town", 1, 1, 0.3, t0, 5.2, newId).reason === "none");
  BN.resolveSnowTake(st, "x", "town", null, t0);
  // Falsifié : le plafond par le temps retiré → la boule annoncée à R_MAX après 0,5 s passerait.
  const quick = BN.resolveSnowDrop(st, "x", "town", 1, 1, K.R_MAX, t0 + 500, 5.2, newId);
  const bound = BN.rollGrow(K.R0, 0.5 * 5.2, 1);   // ce que 0,5 s de marche dans la neige la plus épaisse peut donner
  ok("une taille impossible en si peu de temps est ramenée", quick.ok && quick.r <= bound + 1e-9 && quick.r < K.R_MAX - 0.2, `annoncée ${K.R_MAX}, posée ${quick.r.toFixed(3)} après 0,5 s (borne ${bound.toFixed(3)})`);
  ok("on ne prend pas deux boules à la fois", BN.resolveSnowTake(st, "y", "town", null, t0).ok && BN.resolveSnowTake(st, "y", "town", null, t0).reason === "busy");
  delete st.snowRoll.y;
  const id = st.snowmen[0].id;
  const t1 = BN.resolveSnowTake(st, "p", "town", id, t0 + 1000), t2 = BN.resolveSnowTake(st, "q", "town", id, t0 + 1000);
  ok("deux joueurs ne prennent pas la même boule", t1.ok && t2.reason === "gone");
  const full = { snowmen: [], snowRoll: {} };
  for (let k = 0; k < K.MAX_PER_ZONE; k++) { BN.resolveSnowTake(full, "z", "farm", null, t0); BN.resolveSnowDrop(full, "z", "farm", k * 3, 0, 0.2, t0 + 60000, 5.2, newId); }
  BN.resolveSnowTake(full, "z", "farm", null, t0);
  ok("la carte a un plafond", BN.resolveSnowDrop(full, "z", "farm", 99, 99, 0.2, t0 + 60000, 5.2, newId).reason === "full" && full.snowmen.length === K.MAX_PER_ZONE);
  BN.resolveSnowTake(full, "z", "town", null, t0);
  ok("le plafond est par carte", BN.resolveSnowDrop(full, "z", "town", 1, 1, 0.2, t0 + 60000, 5.2, newId).ok);
}

section("§4 — le décor");
{
  const n = BN.normalizeDeco({ hat: "tophat", scarf: "violet", arms: "broom", extra: 42 });
  ok("une valeur connue est gardée, une inconnue retombe au défaut", n.hat === "tophat" && n.scarf === BN.SNOWMAN_DECO_DEFAULT.scarf && n.arms === "broom" && n.extra === BN.SNOWMAN_DECO_DEFAULT.extra && n.nose === "carrot");
  ok("chaque défaut est au catalogue", Object.keys(BN.SNOWMAN_DECO).every((k) => BN.SNOWMAN_DECO[k].includes(BN.SNOWMAN_DECO_DEFAULT[k])));
  const st = { snowmen: [{ id: "a", zone: "farm", x: 0, y: 0, balls: [0.5, 0.4, 0.3], deco: { ...BN.SNOWMAN_DECO_DEFAULT }, thawAt: 0 }, { id: "b", zone: "farm", x: 5, y: 0, balls: [0.5], deco: null, thawAt: 0 }] };
  ok("on décore un bonhomme fini", BN.resolveSnowDeco(st, "a", { hat: "beanie" }).ok && st.snowmen[0].deco.hat === "beanie");
  ok("pas un tas inachevé", BN.resolveSnowDeco(st, "b", { hat: "beanie" }).reason === "notDone");
  const back = BN.normalizeSnowmen(JSON.parse(JSON.stringify(st.snowmen)));
  ok("une sauvegarde relue garde tout", back.length === 2 && back[0].deco.hat === "beanie" && back[1].deco === null && back[0].balls.length === 3);
}

section("§5 — le dégel");
{
  const st = { snowmen: [{ id: "a", zone: "town", x: 0, y: 0, balls: [0.5, 0.4, 0.3], deco: { ...BN.SNOWMAN_DECO_DEFAULT }, thawAt: 0 }], snowRoll: { gone: { r: 0.3, zone: "town", at: 0 } } };
  const t0 = 1.78e12;
  let ch = BN.snowmenTick(st, t0, () => 8, true, (pid) => pid !== "gone");
  ok("un joueur parti lâche sa boule", ch && !st.snowRoll.gone);
  ok("sous la neige, l'hiver, il tient", !st.snowmen[0].thawAt);
  BN.snowmenTick(st, t0 + 1000, () => 0.1, true, () => true);
  ok("la neige partie, le dégel est daté", st.snowmen[0].thawAt === t0 + 1000);
  const s0 = st.snowmen[0];
  ok("l'affaissement monte de 0 à 1", BN.slumpAt(s0, t0 + 1000) === 0 && Math.abs(BN.slumpAt(s0, t0 + 1000 + K.THAW_MS / 2) - 0.5) < 1e-9 && BN.slumpAt(s0, t0 + 1000 + K.THAW_MS * 2) === 1);
  ok("on ne décore pas un bonhomme qui fond", BN.resolveSnowDeco(st, "a", {}).reason === "thaw");
  BN.snowmenTick(st, t0 + 1000 + K.THAW_MS - 1, () => 8, true, () => true);
  ok("la neige revenue ne l'arrête pas", st.snowmen.length === 1 && st.snowmen[0].thawAt === t0 + 1000);
  BN.snowmenTick(st, t0 + 1000 + K.THAW_MS, () => 8, true, () => true);
  ok("fondu, l'hôte le retire", st.snowmen.length === 0);
  const sp = { snowmen: [{ id: "b", zone: "farm", x: 0, y: 0, balls: [0.4], deco: null, thawAt: 0 }] };
  BN.snowmenTick(sp, t0, () => 9, false, () => true);
  ok("l'hiver fini, il fond même sous la neige", sp.snowmen[0].thawAt === t0);
}

section("§6 — l'obstacle");
{
  const list = [{ id: "a", zone: "town", x: 10, y: 10, balls: [0.5, 0.4, 0.3], deco: null, thawAt: 0 }];
  ok("on se cogne à son pied", BN.snowmanBlocks(list, "town", 10.2, 10, 0));
  ok("pas à un pas de lui", !BN.snowmanBlocks(list, "town", 10.7, 10, 0));
  ok("pas sur l'autre carte (la zone avant la distance, §4)", !BN.snowmanBlocks(list, "farm", 10, 10, 0));
}

fs.rmSync(tmp, { recursive: true, force: true });
section("§7 — les coups de pied (2026-10-05)");
{
  const mk = (balls) => ({ snowmen: [{ id: "k1", zone: "farm", x: 10, y: 10, balls, deco: balls.length === 3 ? { hat: "tophat", scarf: "red", nose: "carrot", arms: "twigs", extra: "buttons" } : null, by: "a", at: 0, thawAt: 0 }], snowRoll: {} });
  const rngSeq = (vals) => { let i = 0; return () => vals[Math.min(i++, vals.length - 1)]; };
  const kick = (st, now, rnd) => BN.resolveSnowKick(st, "p1", "farm", "k1", now, rnd || (() => 0.99), newId, 1, 0);
  // UNE PETITE BOULE SEULE : un coup, elle explose. UNE GROSSE : trois.
  { const st = mk([K.R0 + 0.05]); const r = kick(st, 1000); ok("une petite boule seule explose au premier coup", r.ok && r.destroyed && st.snowmen.length === 0); }
  { const st = mk([K.R_MAX]); let t = 1000, n = 0, r;
    do { r = kick(st, t); t += 500; n++; } while (!r.destroyed && n < 10);
    ok("une grosse boule résiste : trois coups rapprochés, pas un de moins", n === 3 && BN.snowKicksToBreak(K.R_MAX) === 3, `${n} coups`); }
  ok("la résistance croît avec la taille", BN.snowKicksToBreak(K.R0) === 1 && BN.snowKicksToBreak(0.4) === 2 && BN.snowKicksToBreak(K.R_MAX) === 3);
  // UN SEUL COUP SUR UN BONHOMME : quasiment rien — jamais détruit, et la tête ne tombe qu'une fois sur huit.
  { let fell = 0, destroyed = 0; const N = 2000;
    for (let i = 0; i < N; i++) { const st = mk([0.55, 0.42, 0.3]); let u = i / N; const r = kick(st, 1000, () => u); if (r.fell) fell++; if (r.destroyed) destroyed++; }
    ok("un seul coup ne détruit jamais un bonhomme", destroyed === 0);
    ok("un seul coup fait tomber une boule environ une fois sur huit (12 %), jamais plus", fell / N > 0.09 && fell / N < 0.15, `${(100 * fell / N).toFixed(1)} %`); }
  { const st = mk([0.55, 0.42, 0.3]); const r = kick(st, 1000, () => 0.01);
    ok("la boule qui tombe devient une boule seule, posée à côté dans le sens du coup", r.fell && st.snowmen.length === 2 && st.snowmen[0].balls.length === 2 && st.snowmen[1].balls.length === 1 && st.snowmen[1].x > st.snowmen[0].x && Math.abs(st.snowmen[1].y - 10) < 1e-6, JSON.stringify(r.fell));
    ok("le bonhomme décoré qui perd sa tête perd son décor (il n'a plus trois boules)", st.snowmen[0].deco === null);
    ok("la boule tombée est celle du HAUT, la plus petite", Math.abs(st.snowmen[1].balls[0] - 0.3) < 1e-9); }
  // DES COUPS ESPACÉS NE DÉTRUISENT RIEN : un coup toutes les 6 s retombe avant le suivant.
  { const st = mk([0.55, 0.42, 0.3]); let destroyed = false;
    for (let i = 0; i < 30; i++) { const r = kick(st, 1000 + i * 6000, () => 0.99); if (r.destroyed) destroyed = true; }
    ok("des coups espacés de 6 s ne détruisent jamais le bonhomme", !destroyed && st.snowmen.length === 1); }
  // DES COUPS RÉPÉTÉS LE DÉTRUISENT : un coup toutes les 0,5 s, le bonhomme de trois boules ne dépasse pas six coups.
  { const N = 400; let worst = 0, always = true, mean = 0;
    for (let i = 0; i < N; i++) { const st = mk([0.55, 0.42, 0.3]); let t = 1000, n = 0, r; const rnd = (() => { let q = i + 1; return () => (q = (q * 16807) % 2147483647) / 2147483647; })();
      do { r = kick(st, t, rnd); t += 500; n++; } while (!r.destroyed && n < 40);
      if (!(r.destroyed && !st.snowmen.some((q) => q.id === "k1"))) always = false; worst = Math.max(worst, n); mean += n / N; }
    ok("un bonhomme de trois boules tombe sous des coups répétés (un toutes les 0,5 s)", always && worst <= 6, `pire ${worst} coups, en moyenne ${mean.toFixed(1)}`); }
  { const st = mk([0.5, 0.35]); let t = 1000, n = 0, r;
    do { r = kick(st, t, () => 0.99); t += 500; n++; } while (!r.destroyed && n < 20);
    ok("un bonhomme de deux boules tient quatre coups rapprochés", r.destroyed && n === 4, `${n} coups`); }
  // LA CADENCE EST BORNÉE : un joueur ne frappe pas plus d'une fois par GAP_MS.
  { const st = mk([0.55, 0.42, 0.3]); const a = kick(st, 1000), b = kick(st, 1100), c = kick(st, 1000 + KICK_GAP);
    ok("deux coups à moins de 0,42 s : le second est refusé (borne les messages)", a.ok && !b.ok && b.reason === "gap" && c.ok); }
  ok("un tas qui n'existe plus : refusé", BN.resolveSnowKick(mk([0.3]), "p1", "farm", "nope", 1000, () => 0.5, newId, 1, 0).reason === "gone");
  ok("une autre carte : refusé", BN.resolveSnowKick(mk([0.3]), "p1", "town", "k1", 1000, () => 0.5, newId, 1, 0).reason === "gone");
  // LES COUPS REÇUS SURVIVENT À LA RELECTURE (l'hôte relit sa propre diffusion) : sinon chaque coup compterait pour le premier.
  { const st = mk([0.55, 0.42, 0.3]); kick(st, 1000, () => 0.99); kick(st, 1500, () => 0.99);
    const back = BN.normalizeSnowmen(JSON.parse(JSON.stringify(st.snowmen)));
    ok("relue (diffusion, sauvegarde), la liste garde les coups reçus : la cadence de martèlement n'est pas remise à zéro", back[0].hits > 1.9 && back[0].hitAt === 1500, `hits ${back[0].hits}`);
    const st2 = { snowmen: back, snowRoll: {}, snowKickAt: st.snowKickAt }; let t = 2000, r, n = 0; do { r = BN.resolveSnowKick(st2, "p1", "farm", "k1", t, () => 0.99, newId, 1, 0); t += 500; n++; } while (!r.destroyed && n < 20);
    ok("…et le bonhomme relu tombe bien après le même nombre de coups au total (5)", r.destroyed && n === 3, `${n} coups de plus après 2`); }
  // ÉCRASER LA BOULE QU'ON TIENT.
  { const st = { snowmen: [], snowRoll: { p1: { r: 0.4, zone: "farm", at: 0 } } }; const r = BN.resolveSnowSmashHeld(st, "p1");
    ok("un coup de pied dans la boule qu'on tient la fait exploser", r.ok && !st.snowRoll.p1 && BN.resolveSnowSmashHeld(st, "p1").reason === "none"); }
  // LA PLEINE CARTE : une boule tombée sans place explose.
  { const st = mk([0.55, 0.42, 0.3]); for (let i = 0; i < K.MAX_PER_ZONE - 1; i++) st.snowmen.push({ id: "z" + i, zone: "farm", x: 50 + i, y: 50, balls: [0.2], deco: null, by: "a", at: 0, thawAt: 0 });
    const r = kick(st, 1000, () => 0.01); ok("sur une carte pleine, la boule qui tombe se brise au lieu de dépasser le plafond", r.fell && st.snowmen.filter((q) => q.zone === "farm").length === K.MAX_PER_ZONE); }
}

section("§8 — porter une boule sans la rouler (2026-10-05)");
{
  const mk = () => ({ snowmen: [{ id: "t1", zone: "farm", x: 5, y: 5, balls: [0.5, 0.3], deco: null, by: "a", at: 0, thawAt: 0 }], snowRoll: {} });
  // Prendre la boule du haut d'un tas EN LA PORTANT : elle garde sa taille, quoi qu'on annonce.
  { const st = mk(); const t = BN.resolveSnowTake(st, "p1", "farm", "t1", 1000, true);
    ok("reprendre la boule d'un tas en la soulevant : taille gardée, marquée « portée »", t.ok && t.carry && Math.abs(t.r - 0.3) < 1e-9 && st.snowRoll.p1.carry === true);
    const d = BN.resolveSnowDrop(st, "p1", "farm", 5, 5, 0.6, 1000 + 20000, 5.2, newId);
    ok("posée, une boule portée ne dépasse jamais sa taille, même si on en annonce une plus grosse (vingt secondes plus tard)", d.ok && Math.abs(d.r - 0.3) < 1e-9, `r ${d.r}`); }
  // La même boule ROULÉE a le droit de grossir (bornée par le temps).
  { const st = mk(); BN.resolveSnowTake(st, "p1", "farm", "t1", 1000, false);
    const d = BN.resolveSnowDrop(st, "p1", "farm", 9, 9, 0.45, 1000 + 20000, 5.2, newId);
    ok("la même boule roulée peut grossir (à ce qu'on annonce, dans la borne du temps)", d.ok && d.r > 0.3 && d.r <= 0.45 + 1e-9, `r ${d.r.toFixed(3)}`); }
  // Une boule façonnée au sol se roule toujours.
  { const st = mk(); const t = BN.resolveSnowTake(st, "p1", "farm", null, 1000, true);
    ok("une boule façonnée dans la neige se ROULE (elle n'existe pas encore pour être portée)", t.ok && st.snowRoll.p1.carry === false); }
  // Rouler → soulever : on fige la taille qu'on avait atteinte ; la pose qui suit part de CETTE taille.
  { const st = mk(); BN.resolveSnowTake(st, "p1", "farm", null, 1000, false);
    const m = BN.resolveSnowMode(st, "p1", "farm", true, 0.4, 1000 + 15000, 5.2);
    ok("soulever une boule qu'on roulait fige la taille annoncée (bornée par le temps)", m.ok && m.carry && m.r > K.R0 && m.r <= 0.4 + 1e-9, `r ${m.r.toFixed(3)}`);
    const d = BN.resolveSnowDrop(st, "p1", "farm", 9, 9, 0.6, 1000 + 15500, 5.2, newId);
    ok("posée juste après : elle garde la taille figée (la base est le basculement, pas la prise)", d.ok && Math.abs(d.r - m.r) < 1e-9, `r ${d.r.toFixed(3)} contre ${m.r.toFixed(3)}`); }
  // Soulever → rouler : elle regrossit à partir de là.
  { const st = mk(); BN.resolveSnowTake(st, "p1", "farm", "t1", 1000, true);
    const m = BN.resolveSnowMode(st, "p1", "farm", false, 0.3, 2000, 5.2);
    const d = BN.resolveSnowDrop(st, "p1", "farm", 9, 9, 0.42, 2000 + 20000, 5.2, newId);
    ok("la reposer en la roulant : elle regrossit de ce qu'on a roulé", m.ok && !m.carry && d.ok && d.r > 0.3 + 1e-6 && d.r <= 0.42 + 1e-9, `r ${d.r.toFixed(3)}`); }
  ok("basculer sans rien tenir : refusé", BN.resolveSnowMode({ snowmen: [], snowRoll: {} }, "p1", "farm", true, 0.3, 1000, 5.2).reason === "none");
  ok("PORTER place la boule contre la semelle, pas devant (de quoi la poser sur un tas qu'on touche)", (() => { const c = BN.carryBallPos(10, 10, 1, 0), p = BN.rollBallPos(10, 10, 1, 0, 0.5); return c.x - 10 < p.x - 10 && Math.hypot(c.x - 10, c.y - 10) < 0.5; })());
}

console.log(`\n${fails === 0 ? "✅" : "❌"} ${total - fails}/${total} contrôles passés.\n`);
process.exit(fails === 0 ? 0 : 1);
