/* verify-fete.mjs — LA FÊTE DU NAVIRE (2026-11-08, G9-G11) : le rendez-vous, la cérémonie, les votes, la foule.
   Joue la chronologie pure (`fete.js`) et les résolveurs de la quête (`quete.js`) sur les quatre chemins — le bon nom, la
   foule écoutée, le naufrage puis « Recommencer », le quart qui passe — et pose la foule sur la vraie carte de la ville.
   Lancer : node tools/verify-fete.mjs */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "components", "ferme");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fete-"));
const copied = new Set();
const copy = (n) => {
  if (copied.has(n)) return;
  copied.add(n);
  const src = fs.readFileSync(path.join(SRC, n + ".js"), "utf8");
  fs.writeFileSync(path.join(tmp, n + ".js"), src.replace(/from "\.\/([A-Za-z0-9_]+)"/g, 'from "./$1.js"'));
  for (const m of src.matchAll(/from "\.\/([A-Za-z0-9_]+)"/g)) copy(m[1]);
};
copy("fermeEngine"); copy("quete"); copy("fete");
const C = await import(pathToFileURL(path.join(tmp, "fermeConstants.js")).href);
const E = await import(pathToFileURL(path.join(tmp, "fermeEngine.js")).href);
const Q = await import(pathToFileURL(path.join(tmp, "quete.js")).href);
const FT = await import(pathToFileURL(path.join(tmp, "fete.js")).href);

let fails = 0, total = 0;
const ok = (n, c, x) => { total++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };
const sec = (t) => console.log("\n── " + t);
const S = FT.SEQ;

/* ── 1. LE RENDEZ-VOUS ─────────────────────────────────────────────────────── */
sec("1. Le rendez-vous : le soir, jamais tout de suite");
{
  const day0 = 1_000_000_000;
  const MIN = C.DAY_REAL_MS / (C.DAY_END_MIN - C.DAY_START_MIN);
  const dusk = 19 * 60 + 30;
  // accord à 9 h : ce soir, à la tombée de la nuit + 30 min
  const a1 = day0 + (9 * 60 - C.DAY_START_MIN) * MIN;
  const f1 = FT.feteScheduleAt(a1, day0, dusk);
  const m1 = FT.gameMinAt(day0, f1);
  ok("accord le matin : la fête est ce soir, à la tombée de la nuit + une demi-heure", Math.abs(m1 - (dusk + 30)) < 1, `${Math.floor(m1 / 60)} h ${Math.round(m1 % 60)}`);
  // accord à 17 h : le délai de préparation (trois minutes réelles, près de quatre heures de jeu) l'emporte sur l'heure voulue
  const a2 = day0 + (17 * 60 - C.DAY_START_MIN) * MIN;
  const f2 = FT.feteScheduleAt(a2, day0, dusk);
  ok("accord le soir : au plus tôt trois minutes réelles plus tard (« pas que ça s'enchaîne trop vite »)", f2 - a2 >= FT.FETE.LEAD_MS && f2 - a2 < FT.FETE.LEAD_MS + 1000);
  // accord à 23 h : demain soir
  const a3 = day0 + (23 * 60 - C.DAY_START_MIN) * MIN;
  const f3 = FT.feteScheduleAt(a3, day0, dusk);
  const m3 = C.DAY_START_MIN + (f3 - day0 - C.DAY_REAL_MS) / MIN;
  ok("accord tard : la fête est pour DEMAIN soir, à la même heure", f3 > day0 + C.DAY_REAL_MS && Math.abs(m3 - (dusk + 30)) < 1, `${((f3 - a3) / 60000).toFixed(1)} min d'attente`);
  const lab = FT.feteClockLabel({ feteAt: f3 }, day0);
  ok("l'heure affichée dit « demain » et l'heure arrondie au quart", lab && lab.tomorrow && lab.h === 20 && lab.m === 0, JSON.stringify(lab));
}

/* ── 2. LES QUATRE CHEMINS ─────────────────────────────────────────────────── */
const T0 = 2_000_000_000;
function readyQuest() {
  const e = Q.migrateStar(Q.newStar());
  e.doneAt = T0 - 60000;
  e.finale.agreedAt = T0 - 30000; e.finale.feteAt = T0;
  return e;
}
const tl = (e) => FT.feteTimeline(e.finale);
const segKeys = (e) => tl(e).segs.map(g => g.k);
const voters = ["a", "b"];
function toNameVote(e) {
  Q.resolveFeteStart(e, "a", T0);
  const o = tl(e).open;
  return o;
}

sec("2. Le signal, puis le bon nom du premier coup");
{
  const e = readyQuest();
  ok("avant l'heure, le signal est refusé (`early`)", Q.resolveFeteStart(e, "a", T0 - 1).early === true);
  ok("le bandeau dit d'attendre l'heure, puis « tout le monde au quai »", Q.starGoalKey(e, {}) === "finaleWait" && Q.starGoalKey(e, { feteReady: true }) === "finaleGo");
  const o = toNameVote(e);
  ok("le signal ouvre la cérémonie ; le bandeau se tait", e.finale.startAt === T0 && Q.starGoalKey(e, { feteReady: true }) === null && Q.feteRunning(e));
  ok("le vote du nom s'ouvre après la cloche, la danse et le discours", o && o.kind === "name" && o.t0 === T0 + (S.BELL + S.DANCE + S.SPEECH) * 1000);
  const tv = o.t0 + 3000;
  ok("un vote hors manche est refusé", !Q.resolveFeteVote(e, "a", "c0", 0, tv).ok && !Q.resolveFeteVote(e, "a", "name", 5, tv).ok);
  ok("on ne vote pas avant l'ouverture", !Q.resolveFeteVote(e, "a", "name", 0, o.t0 - 10).ok);
  Q.resolveFeteVote(e, "a", "name", 0, tv);
  ok("un seul vote sur deux : l'hôte attend", Q.resolveFeteClose(e, voters, tv + 100, 0.1, 0.1).waiting === true);
  Q.resolveFeteVote(e, "b", "name", 0, tv + 200);
  const rc = Q.resolveFeteClose(e, voters, tv + 300, 0.1, 0.1);
  ok("tout le monde a voté : clos sur-le-champ, « La Belle Étoile »", rc.ok && rc.pick === 0 && !rc.draw && e.finale.name.at === tv + 300);
  const t1 = tl(e);
  ok("ordre : cloche, danse, discours, vote, annonce, bouteille, éclat, vivats, départ, nuit, retour",
     JSON.stringify(segKeys(e)) === JSON.stringify(["bell", "dance", "speech", "voteName", "announce", "bottle", "smash", "cheer", "depart", "night", "return"]), segKeys(e).join(","));
  const bot = t1.segs.find(g => g.k === "bottle");
  ok("la bouteille : un joueur pendant sa fenêtre…", !Q.resolveFeteBottle(e, bot.t0 - 1).ok && Q.resolveFeteBottle(e, bot.t0 + 2000).ok);
  ok("…une seule fois", !Q.resolveFeteBottle(e, bot.t0 + 2500).ok);
  const t2 = tl(e);
  const dur = (t2.end - T0) / 1000;
  ok("le bon chemin dure environ quatre minutes (F3 : « environ cinq » avec la contestation)", dur > 220 && dur < 300, dur.toFixed(0) + " s");
  ok("la fin n'est pas écrite avant l'heure", !Q.resolveFeteEnd(e, "a", t2.end - 1).ok);
  const re = Q.resolveFeteEnd(e, "a", t2.end + 5);
  ok("la fin écrit `inaugAt` (la fin de la chronologie) et le baptême avec son nom", re.ok && e.finale.inaugAt === t2.end && Q.starShipNameIdx(e) === 0 && Q.starShipName(e) === C.STAR_SHIP_NAME && Q.starFinaleInaugurated(e) && !Q.feteRunning(e));
  ok("le navire reste à l'ancre, pour toujours (F1)", (() => { const st = FT.feteStateAt(e.finale, t2.end + 86400000, { x: 79.5, y: 158 }); return st.done && st.ship.afloat && st.ship.sail === "furled" && Math.abs(st.ship.x - (79.5 + FT.ANCHOR.dx)) < 1e-6; })());
  const e2 = Q.migrateStar(JSON.parse(JSON.stringify(e)));
  ok("tout survit à `migrateStar` (sauvegarde, réseau)", e2.finale.inaugAt === e.finale.inaugAt && e2.baptism.k === 0 && e2.finale.name.k === 0 && e2.finale.startAt === T0 && e2.finale.feteAt === T0);
}

sec("3. Un nom farfelu, la foule écoutée");
{
  const e = readyQuest(); const o = toNameVote(e);
  Q.resolveFeteVote(e, "a", "name", 1, o.t0 + 1000); Q.resolveFeteVote(e, "b", "name", 1, o.t0 + 1100);
  Q.resolveFeteClose(e, voters, o.t0 + 1200, 0.5, 0.5);
  ok("« L'Épave hasardeuse » : la contestation, puis le vote « écouter / maintenir »", tl(e).open && tl(e).open.kind === "verdict" && segKeys(e).includes("contest"));
  const ov = tl(e).open;
  Q.resolveFeteVote(e, "a", ov.round, 0, ov.t0 + 500); Q.resolveFeteVote(e, "b", ov.round, 1, ov.t0 + 600);
  const rc = Q.resolveFeteClose(e, voters, ov.t0 + 700, 0.99, 0.1);
  ok("égalité entre écouter et maintenir : on écoute la foule (D3), quel que soit le tirage", rc.ok && rc.keep === false);
  const t = tl(e);
  ok("le nom est repeint : « La Belle Étoile » part", segKeys(e).includes("rename") && t.finalName === 0 && t.depart > 0);
  const rn = t.segs.find(g => g.k === "rename");
  const st = FT.feteStateAt(e.finale, rn.t1 + 10, { x: 79.5, y: 158 });
  ok("après le repeint, la coque porte le bon nom", st.nameShown === 0 && st.nameReveal === 1);
  const dur = (t.end - T0) / 1000;
  ok("avec la contestation, environ cinq minutes", dur > 265 && dur < 340, dur.toFixed(0) + " s");
}

sec("4. Le nom maintenu : l'orage, le naufrage, « Recommencer »");
{
  const e = readyQuest(); const o = toNameVote(e);
  Q.resolveFeteVote(e, "a", "name", 2, o.t0 + 1000);
  Q.resolveFeteClose(e, voters, o.deadline + 1, 0.5, 0.5);
  ok("au délai, un seul vote suffit (l'absent ne bloque pas)", e.finale.name && e.finale.name.k === 2);
  const ov = tl(e).open;
  Q.resolveFeteVote(e, "a", ov.round, 1, ov.t0 + 500); Q.resolveFeteVote(e, "b", ov.round, 1, ov.t0 + 600);
  const rc = Q.resolveFeteClose(e, voters, ov.t0 + 700, 0.3, 0.2);
  ok("« maintenir » ; la foudre tirée par l'hôte : 0,2 < 3/4 → le naufrage", rc.keep && rc.roll === "sink");
  const t = tl(e), k = e.finale.rounds[0].at;
  ok("la foule part, la mise à l'eau, l'orage, la foudre, le naufrage, l'épave", ["leave", "slide", "storm", "bolt", "sink", "wreck"].every(x => segKeys(e).includes(x)) && t.open.kind === "retry");
  const slip = { x: 79.5, y: 158 };
  ok("l'orage monte en dix secondes (D4)", FT.stormK(t, k + S.STORM0 * 1000 - 1) === 0 && FT.stormK(t, k + S.STORM1 * 1000 + 10) > 0.99);
  const sh0 = FT.feteShipAt(t, k + 1000, slip), sh1 = FT.feteShipAt(t, k + (S.SLIDE1 + 0.5) * 1000, slip);
  ok("le navire est mis à l'eau quand même, sans fête", sh0.onSlip && sh1.afloat && sh1.y > slip.y + 2);
  const shS = FT.feteShipAt(t, k + (S.BOLT + 0.4 + S.SINK + 1) * 1000, slip);
  ok("après la foudre il coule : seuls les mâts dépassent", shS.sink > 0.98);
  ok("« Recommencer » n'apparaît pas tout de suite", !Q.resolveFeteRetry(e, k + (S.RETRY_AFTER - 1) * 1000).ok);
  const rr = k + (S.RETRY_AFTER + 10) * 1000;
  ok("« Recommencer » (D6)", Q.resolveFeteRetry(e, rr).ok && !Q.resolveFeteRetry(e, rr + 10).ok);
  const t2 = tl(e);
  ok("le navire remonte, est halé sur la cale, la foule revient, la contestation reprend", ["refloat", "haul", "back"].every(x => segKeys(e).includes(x)) && t2.open && t2.open.round === "c1");
  const shH = FT.feteShipAt(t2, rr + (S.REFLOAT + S.HAUL) * 1000 + 50, slip);
  ok("…et il est de retour sur son ber", shH.onSlip && !shH.afloat && Math.abs(shH.y - slip.y) < 1e-6 && shH.sink === 0);
  const ov2 = t2.open;
  Q.resolveFeteVote(e, "a", ov2.round, 1, ov2.t0 + 200); Q.resolveFeteVote(e, "b", ov2.round, 1, ov2.t0 + 300);
  const rc2 = Q.resolveFeteClose(e, voters, ov2.t0 + 400, 0.3, 0.9);
  ok("seconde manche, toujours maintenu ; 0,9 ≥ 3/4 → le navire TIENT", rc2.keep && rc2.roll === "pass");
  const t3 = tl(e);
  ok("le quart qui passe : la foule revient, penaude, et le navire part sous son nom farfelu (D7)", t3.finalName === 2 && t3.afloat && t3.segs.some(g => g.k === "back" && g.sheepish) && t3.segs.some(g => g.k === "miss"));
  const dp = t3.segs.find(g => g.k === "depart");
  const shD = FT.feteShipAt(t3, dp.t0 + 1000, slip);
  ok("parti du large : il n'a pas à redescendre de la cale", shD.afloat && !shD.onSlip);
  const re = Q.resolveFeteEnd(e, "b", t3.end);
  ok("le nom farfelu reste, pour toujours (C3)", re.ok && Q.starShipNameIdx(e) === 2 && Q.starShipName(e, "en") === "The Plank That Barely Floats");
}

sec("5. Les votes : la majorité, le tirage, personne");
{
  ok("majorité", FT.feteTally({ a: 1, b: 1, c: 2 }, ["a", "b", "c"], 3, "draw", 0.9).pick === 1);
  const r = FT.feteTally({ a: 1, b: 2 }, ["a", "b"], 3, "draw", 0.9);
  ok("égalité de noms : tirée au sort parmi les ex æquo, et dite (`tie`)", r.tie && r.pick === 2 && FT.feteTally({ a: 1, b: 2 }, ["a", "b"], 3, "draw", 0.1).pick === 1);
  ok("personne n'a voté : le bon nom", FT.feteTally({}, ["a", "b"], 3, "draw", 0.9).pick === 0);
  ok("un vote d'un joueur parti ne compte pas", FT.feteTally({ z: 2, a: 1 }, ["a"], 3, "draw", 0.5).pick === 1);
  ok("tout le monde a voté", FT.feteAllVoted({ a: 0, b: 1 }, ["a", "b"]) && !FT.feteAllVoted({ a: 0 }, ["a", "b"]));
}

sec("6. Le navire, le plan de nuit, le ciel");
{
  const e = readyQuest(); const o = toNameVote(e);
  Q.resolveFeteClose(e, voters, o.deadline + 1, 0, 0);
  const t = tl(e), slip = { x: 79.5, y: 158 };
  const dp = t.segs.find(g => g.k === "depart"), ni = t.segs.find(g => g.k === "night"), rt = t.segs.find(g => g.k === "return");
  ok("avant le départ, le navire est sur son ber", FT.feteShipAt(t, dp.t0 - 1, slip).onSlip);
  ok("au départ, il vire vers le large (la proue à l'ouest)", FT.feteShipAt(t, dp.t0 + 16000, slip).face < -0.99 && FT.feteShipAt(t, dp.t0 + 8000, slip).face === 1);
  ok("pendant le plan de nuit, il n'est pas peint (le second navire de l'audit G10)", FT.feteShipAt(t, ni.t0 + 1000, slip).hidden);
  const shR = FT.feteShipAt(t, rt.t1 - 1, slip);
  ok("au retour, il jette l'ancre dans la baie, voiles ferlées", Math.abs(shR.x - (slip.x + FT.ANCHOR.dx)) < 0.01 && shR.sail === "furled" && shR.face === 1);
  const nt = FT.feteNightAt(t, ni.t0 + 30000);
  ok("le plan de nuit : le voile, les étoiles montées, la Brebis tracée, une ligne de texte", nt && nt.veil > 0.99 && nt.rise === 1 && nt.draw === 1 && nt.text.filter(v => v > 0.5).length === 1);
  const fw = FT.feteFireworks(t, { slip, pier: { x: 92.5, y: 165 } });
  ok("le feu d'artifice tient dans le départ, bouquet final compris", fw.length > 15 && fw.every(f => f.t0 >= dp.t0 + 30000 && f.t0 + f.rise < dp.t1 + 2000), fw.length + " fusées");
  const st = FT.feteStateAt(e.finale, dp.t0 + 1000, slip);
  ok("pendant la cérémonie : la cinématique (bandes, interface tue)", st.cine === 1 && st.crowd === "wave");
  ok("la cinématique sort à la fin", FT.feteStateAt(e.finale, t.end - 10, slip).cine < 0.02);
}

/* ── 7. LA FOULE SUR LA VRAIE CARTE ─────────────────────────────────────────── */
sec("7. La foule : qui vient, où elle se tient, par où elle arrive");
{
  const tw = E.generateTownWorld();
  const slip = { x: tw.shipX + 0.5, y: tw.shipY + 1 };
  const e0 = tw.elev[tw.shipY * tw.w + tw.shipX] || 0;
  const free = (x, y) => E.townWalkableTile(tw, x, y) && (tw.elev[y * tw.w + x] || 0) === e0;   // le niveau du quai (comme le jeu)
  const D = FT.feteDecor(slip, free);
  const mem = FT.feteCrowdMembers([1, 16, 25, 26, 27, 28], "fr");
  ok("les lèche-bottes et Tristan sont toujours là, les familles suivent leur habitant", [13, 20, 27].every(r => mem.some(m => m.kind === "res" && m.rid === r)) && mem.filter(m => m.kind === "guest").every(g => mem[g.follow].rid === g.rid));
  ok("des visiteurs du train de la fête, sans nom", mem.filter(m => m.kind === "visitor").length === FT.FETE_VISITORS && mem.filter(m => m.kind === "visitor").every(m => !m.name));
  const slots = FT.feteSlots(slip, D.stage, free);
  ok("assez de places pour tout le monde", slots.length >= mem.length, `${slots.length} places, ${mem.length} personnes`);
  ok("toutes les places sont au niveau du quai (jamais sur la promenade en surplomb)", slots.every(s2 => (tw.elev[s2.y * tw.w + s2.x] || 0) === e0));
  ok("aucune place dans l'emprise du navire ni sur l'estrade", slots.every(s => !(s.x >= tw.shipX - 4 && s.x <= tw.shipX + 3 && s.y >= tw.shipY - 6)) && slots.every(s => !(s.x >= D.stage.x0 && s.x <= D.stage.x1 && s.y >= D.stage.y0 && s.y <= D.stage.y1)));
  const pick = FT.feteAssign(mem, slots);
  ok("chacun sa place, deux personnes jamais sur la même case", pick.every(p => p >= 0) && new Set(pick).size === pick.length);
  const fam = mem.map((m, i) => i).filter(i => mem[i].kind === "guest");
  const far = fam.filter(i => Math.hypot(slots[pick[i]].x - slots[pick[mem[i].follow]].x, slots[pick[i]].y - slots[pick[mem[i].follow]].y) > 2.3);
  ok("une famille se tient côte à côte", far.length === 0, far.length + " éloignées");
  ok("tout le monde regarde le navire", pick.every(p => { const s = slots[p]; const dx = s.x + 0.5 - slip.x; return (s.face === 3 && dx < 0) || (s.face === 2 && dx > 0) || s.face === 0 || s.face === 1; }));
  // le chemin depuis le quai de la gare
  let missing = 0, longest = 0, late = 0, early = 0;
  const finX = { feteAt: T0 };
  for (let i = 0; i < mem.length; i++) {
    const s = slots[pick[i]], g = C.tileAnchor(s.x, s.y);
    const p = E.townFindPath(tw, C.TOWN_SPAWN.x, C.TOWN_SPAWN.y, g.x, g.y);
    if (!p) { missing++; continue; }
    const L = FT.pathLength([{ x: C.TOWN_SPAWN.x, y: C.TOWN_SPAWN.y }, ...p]); longest = Math.max(longest, L);
    const st = FT.feteArriveStart(i, L, finX), arr = st + (L / FT.FETE.WALK_V) * 1000;
    if (arr > T0 - 5000) late++;
    if (st < T0 - FT.FETE.GATHER_MS) early++;
  }
  ok("chacun trouve son chemin depuis le train", missing === 0, `le plus long : ${longest.toFixed(0)} cases`);
  ok("chacun est à sa place avant l'heure (la foule est déjà là, B2), personne ne part avant la fenêtre", late === 0 && early === 0, `${late} en retard, ${early} trop tôt`);
  // l'équipe
  const built = FT.feteBuilt(slip, -1, D);
  ok("l'équipe a tout posé avant l'heure : les mâts, l'estrade, les oriflammes", built.poles.size === D.poles.length && built.stage && built.flags, `${built.poles.size}/${D.poles.length} mâts`);
  ok("rien n'est posé avant que l'équipe arrive", FT.feteBuilt(slip, -FT.FETE.PREP_MS, D).poles.size === 0);
  const ends = FT.CREW_FETE.map(w => FT.feteWorkerAt(slip, w.id, 0, D));
  ok("à l'heure, chaque ouvrier est à son poste, sur une case praticable", ends.every(w => w && !w.moving && E.townWalkableTile(tw, w.x, w.y)), ends.map(w => w && `${w.x.toFixed(1)},${w.y.toFixed(1)}`).join(" "));
  ok("les mâts du décor tiennent sur des cases libres du quai, quatre, deux de chaque côté du navire", D.poles.length === 4 && D.poles.every(p => E.townWalkableTile(tw, p.x, p.y)) && D.poles.filter(p => p.x < slip.x).length === 2, D.poles.map(p => p.x).join(" "));
  let stageFree = true; for (let x = D.stage.x0; x <= D.stage.x1; x++) for (let y = D.stage.y0; y <= D.stage.y1; y++) if (!E.townWalkableTile(tw, x, y)) stageFree = false;
  ok("l'estrade ne se pose sur aucun banc ni aucune bitte du quai", stageFree, `x ${D.stage.x0}–${D.stage.x1}`);
  const B = FT.feteBubbles(FT.feteTimeline({ startAt: T0, name: { at: T0 + 70000, k: 1 }, rounds: [] }), mem, T0 + 70000 + (S.ANNOUNCE + S.BOTTLE_WIN + S.SMASH + 5) * 1000);
  ok("pendant la contestation, les lèche-bottes applaudissent et eux seuls", B.filter(b => b.key === "syco").every(b => mem[b.who].syco) && B.filter(b => b.key === "contest").every(b => !mem[b.who].syco));
  const anc = { x: slip.x + FT.ANCHOR.dx, y: FT.ANCHOR.y };
  let wet = 0; for (let dx = -4; dx <= 4; dx++) if (tw.ground[Math.floor(anc.y) * tw.w + Math.floor(anc.x + dx)] === C.G_WATER) wet++;
  ok("le mouillage est en pleine eau, sur toute la longueur du navire", wet === 9);
}

sec("8. Le menu dev et l'ancien format");
{
  const e = readyQuest(); Q.resolveFeteStart(e, "a", T0);
  const t0 = tl(e).open.t0;
  ok("« nom farfelu » forcé", Q.resolveFeteDev(e, "name1", t0 + 10).ok && e.finale.name.k === 1);
  const ov = tl(e).open;
  ok("« forcer le naufrage »", Q.resolveFeteDev(e, "keepSink", ov.t0 + 10).ok && e.finale.rounds[0].roll === "sink");
  const e2 = readyQuest(); Q.resolveFeteStart(e2, "a", T0); Q.resolveFeteClose(e2, [], tl(e2).open.deadline, 0, 0);
  const now = T0 + 70000; const d0 = tl(e2).depart;
  ok("« aller au départ » décale toute la chronologie d'un bloc", Q.resolveFeteDev(e2, "depart", now).ok && Math.abs(tl(e2).depart - now) < 2 && d0 > now);
  const old = Q.migrateStar({ ...Q.newStar(), doneAt: 5, baptism: { at: 9, by: "x" }, finale: { agreedAt: 7, inaugAt: 0 } });
  ok("un baptême de l'ancien format sans fête est annulé (le nom se vote maintenant)", old.baptism === null && old.finale.feteAt === 0);
  const fin = Q.migrateStar({ ...Q.newStar(), doneAt: 5, baptism: { at: 9, by: "x" }, finale: { agreedAt: 7, inaugAt: 11 } });
  ok("une partie déjà finie garde son nom", fin.baptism && fin.baptism.k === 0 && Q.starShipName(fin) === C.STAR_SHIP_NAME);
  const ep = readyQuest(); ep.finale.firstAt = T0;
  ok("le report : tant que le jour n'a pas tourné, rien ne bouge", !Q.resolveFetePostpone(ep, T0 - 1000, T0 + 600000).ok);
  ok("…la nuit passée sans signal, la fête va au soir qui vient, et le décor garde sa première heure", Q.resolveFetePostpone(ep, T0 + 300000, T0 + 900000).ok && ep.finale.feteAt === T0 + 900000 && ep.finale.firstAt === T0);
  ok("…jamais une fête déjà commencée", (() => { const e3 = readyQuest(); Q.resolveFeteStart(e3, "a", T0); return !Q.resolveFetePostpone(e3, T0 + 300000, T0 + 900000).ok; })());
  ok("une partie accordée avant la fête reçoit un rendez-vous", Q.resolveFeteSchedule(old, 1234).ok && old.finale.feteAt === 1234 && !Q.resolveFeteSchedule(old, 99).ok);
}

console.log(`\n${total - fails}/${total} contrôles${fails ? ` — ${fails} ÉCHEC(S)` : " — tout est vert"}`);
process.exit(fails ? 1 : 0);
