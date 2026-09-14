/* =============================================================================
   verify-jalons.mjs — LE BANC D'ATTEIGNABILITÉ (P1 bis, 2026-09-07 ; refait le
   2026-09-13 sur la chronologie tranchée par Guillaume)
   -----------------------------------------------------------------------------
   ⚠️⚠️⚠️ POURQUOI CE BANC EXISTE, MOT POUR MOT DEPUIS `QUETE.md` §12.2 (« A moins
   un ») : Guillaume a signalé le 2026-09-05 que le menu développeur de la quête
   de l'étoile a DEUX PISTES D'ÉTAT PARALLÈLES — les ÉTOILES (`e.found`, `e.ch`)
   et le BATEAU/MAIRE (`e.plan`, `e.wood`, `MA.mayorSigned`) — et qu'aucun bouton
   ne les avançait ensemble : un raccourci pouvait poser un bateau fini devant un
   maire jamais rencontré, **un état que la partie réelle ne peut pas produire**.
   La parade n'est pas de sauter la scène du maire (la ligne rouge du 444 tient) —
   c'est de poser des jalons COHÉRENTS, et de le PROUVER en rejouant une vraie
   partie.

   ⚠️⚠️⚠️ 2026-09-13 — L'AUDIT DE CHRONOLOGIE A MONTRÉ QUE CE BANC, VERT, TENAIT UNE
   TRAME QUI N'EXISTAIT PLUS. Il jouait « maire → plans → impacts → cratère → cinq
   pièces » et déclarait les cinq pièces commandables avant la moindre étoile :
   exactement l'état qui laissait finir la quête avant la reine. Il ne pouvait pas
   non plus voir que la quête ne DÉMARRAIT plus en jeu réel — il appelle les
   résolveurs, jamais les écrans. Il joue maintenant la trame tranchée avec
   Guillaume, sous-partie par sous-partie :
     prélude   — le chantier : maire → plans → coque et gouvernail posés ;
                 la panique : l'avis au tableau, puis l'attente de la pluie ;
     chap. 1   — les huit impacts de la ferme ;
     chap. 2   — le météore de Valley Town, la reine, la discrète, la verte ;
     chap. 3   — Kerguélen affolé, la réparation, la mâture / la voile / la cloche,
                 la septième sœur vue, halée, réanimée — PUIS la fin.
   Et à chaque sous-partie il lit AUSSI la phrase du bandeau (`starGoalKey`) : un
   jalon atteignable dont le bandeau ne dit rien est un jalon qu'on ne trouve pas.

   ⚠️⚠️ CE BANC NE RELIT PAS UNE TABLE, IL JOUE LA TRAME ENTIÈRE — même méthode que
   `verify-maire.mjs` : la négociation est simulée avec les résolveurs RÉELS de
   `maire.js`, en choisissant partout la réponse idéale.

   ⚠️ ET IL SE FALSIFIE : §3 clique CHAQUE bouton du menu dev avant la signature du
   maire et exige que RIEN d'autre que le rendez-vous ne bouge ; §2 bis clique
   chaque bouton après la signature et exige qu'aucun ne produise un état que la
   partie réelle ne peut pas atteindre (pluie sans chantier, reine sans météore,
   mâture avant la réparation, septième suivie sans avoir été vue). Sur le code
   d'avant le 2026-09-13, §3 rougissait sur 17 boutons et §2 bis sur 4.

   Usage : node tools/verify-jalons.mjs
   ========================================================================== */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "components", "ferme");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jalons-"));
/* Les dépendances se SUIVENT, elles ne se nomment pas (recette du 440) : le jour
   où `quete.js` importera un fichier de plus, ce banc n'aura pas à l'apprendre. */
const copied = new Set();
const copy = (n) => {
  if (copied.has(n)) return;
  copied.add(n);
  const src = fs.readFileSync(path.join(SRC, n + ".js"), "utf8");
  fs.writeFileSync(path.join(tmp, n + ".js"), src.replace(/from "\.\/([A-Za-z0-9_]+)"/g, 'from "./$1.js"'));
  for (const m of src.matchAll(/from "\.\/([A-Za-z0-9_]+)"/g)) copy(m[1]);
};
copy("quete");

const C = await import(pathToFileURL(path.join(tmp, "fermeConstants.js")).href);
const Q = await import(pathToFileURL(path.join(tmp, "quete.js")).href);
const MA = await import(pathToFileURL(path.join(tmp, "maire.js")).href);

let fails = 0, total = 0;
const ok = (n, c, x) => { total++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };
const section = (t) => console.log(`\n=== ${t} ===\n`);
const clone = (o) => JSON.parse(JSON.stringify(o));

/* ── JOUER UNE AUDIENCE GAGNANTE, AVEC LES VRAIS RÉSOLVEURS DE `maire.js` ────
   Reprise de `verify-maire.mjs` (`play`/`pickIdeal`). */
function playMayor(ctx, pick, dt = 2600) {
  const s = MA.mayorOpen(ctx);
  let guard = 0;
  while (!s.over && guard++ < 60) {
    const choices = MA.mayorChoices(s);
    if (!choices.length) break;
    const key = pick(choices, s);
    if (!key) break;
    MA.mayorPlay(s, key, dt);
  }
  return s;
}
const pickGrade = (g) => (choices) => {
  const a = choices.find(c => c.kind === "say" && c.grade === g);
  return a ? a.k : (choices.find(c => c.kind === "say") || {}).k;
};
const pickIdeal = (choices, s) => {
  if (s.node === "m5" && choices.some(c => c.kind === "plans")) return "__plans";
  return pickGrade("ideal")(choices);
};
/* Une signature gagnée pour de bon : rendez-vous, entretien idéal, arbitrage. */
function signForReal(e, at) {
  MA.migrateMayor(e);
  const ctx = {
    mayorKey: C.TOWN_CANDIDATES[0].key, day: 12, nextElection: 30,
    audience: false, plans: Q.starPlanReady(e), trust: MA.mayorTrust(e),
    mood: "mid", burnt: MA.mayorBurnt(e),
  };
  const s = playMayor(ctx, pickIdeal);
  return MA.resolveMayor(e, "banc", "🤖 Testeur", s.log, ctx, at);
}

/* 2026-09-13 (lot 2) — LE BUDGET, gagné pour de bon : même méthode, la seconde table,
   les plans chiffrés posés au nœud `b5`. */
function signBudgetForReal(e, at) {
  MA.migrateMayor(e);
  const ctx = {
    mayorKey: C.TOWN_CANDIDATES[0].key, day: 12, nextElection: 30, audience: false, plans: true,
    trust: MA.mayorTrust(e), mood: "mid", burnt: MA.mayorBurnt(e), topic: "budget",
  };
  const s = playMayor(ctx, (choices, st) =>
    (st.node === "b5" && choices.some(c => c.kind === "plans")) ? "__plans" : pickGrade("ideal")(choices));
  return MA.resolveMayor(e, "banc", "🤖 Testeur", s.log, ctx, at);
}

/* ═══════════════════════════════════════════════════════════════════════════
   §1 — LA TRAME RÉELLE, SOUS-PARTIE PAR SOUS-PARTIE.
   Chaque étape n'avance qu'AVEC les résolveurs que le jeu appelle vraiment. Si
   l'un de ces noms change de forme, ce banc casse — jamais en silence.
   ═══════════════════════════════════════════════════════════════════════════ */
section("§1 la trame réelle — prélude, trois chapitres, la fin");
let now = 1_700_000_000_000; // une vraie date (§10 : ne jamais tester des dates avec `at: 1000`)
const GATE = { skills: C.STAR_GATE_SKILLS, artisans: C.STAR_GATE_ARTISANS };
const DAY = Q.STAR_FALL_MIN_DAY + 1;
const LATER = 30 * 24 * 3600 * 1000;   // assez loin pour que la fuite du vandale soit finie
const READY = { yardOpen: true, gateOk: true };
const e = Q.newStar();

ok("jalon 0 — quête vierge : chapitre « field », rien du chantier",
   Q.starChapterKey(e) === "field" && !MA.mayorSigned(e) && !Q.starPlanAsked(e));
ok("⚠️⚠️⚠️ …l'avis de l'observatoire refuse tant que le maire n'a pas signé",
   Q.resolveStarWarn(clone(e), "banc", DAY, now, GATE).needMayor === true);
/* ⚠️⚠️ 2026-09-13 (lot 1) — LE BANDEAU SE TAIT TANT QUE PERSONNE N'A DIT OUI (D3 de
   Guillaume : « la décision de lancer ou non la quête dépend de notre envie »). Il
   parlait dès que la ferme était prête ; la mairie et Eduardo PROPOSENT désormais. */
ok("⚠️⚠️ lot 1 — une ferme prête mais sans « oui » : le bandeau se tait",
   Q.starGoalKey(e, READY) === null && Q.starGoalKey(e, { yardOpen: false }) === null, String(Q.starGoalKey(e, READY)));
ok("…la proposition n'est faite ni à une ferme trop jeune, ni sans ses habitants — et l'est à une ferme prête",
   !Q.starYardOffer(e, 1, GATE) && !Q.starYardOffer(e, DAY, {}) && Q.starYardOffer(e, DAY, GATE));
ok("…un « oui » sans proposition est refusé",
   Q.resolveStarYardAccept(clone(e), "banc", 1, now, GATE).locked === true);
{
  const y = clone(e);
  ok("lot 1 — « on s'en occupe » : le chantier est accepté",
     Q.resolveStarYardAccept(y, "banc", DAY, now, GATE).ok === true && Q.starYardAccepted(y));
  ok("…et le bandeau envoie au maire", Q.starGoalKey(y, { yardOpen: false }) === "mayor", String(Q.starGoalKey(y, {})));
  ok("⚠️⚠️⚠️ …le « oui » survit à une migration (poser, migrer, relire)", Q.starYardAccepted(Q.migrateStar(clone(y))));
  ok("…la proposition cesse une fois acceptée, et un second « oui » ne réécrit rien",
     !Q.starYardOffer(y, DAY, GATE) && Q.resolveStarYardAccept(y, "autre", DAY, now + 5, GATE).already === true && y.yard.by === "banc");
  ok("…le navire n'a pas de nom avant son baptême, et le baptême survit à une migration",
     Q.starShipName(y) === null
     && Q.starShipName(Q.migrateStar({ ...clone(y), baptism: { at: now, by: "banc" } })) === C.STAR_SHIP_NAME);
}
ok("⚠️⚠️⚠️ …et le sujet « architecte naval » de la mairie ne propose rien avant le maire",
   !C.HALL_TOPICS.find(t => t.key === "engineer").when({ shared: { star: e } }));

// ── Prélude, le chantier 1/3 : le maire.
{
  const askMayor = MA.resolveMayorAsk(e, "banc", "🤖 Testeur", now, () => 0.5, false);
  ok("prélude 1a — le rendez-vous est pris", askMayor === "mayorBooked", String(askMayor));
  ok("…et le bandeau ne redemande pas un rendez-vous déjà pris",
     Q.starGoalKey(e, { yardOpen: false, now }) === "mayorBooked", Q.starGoalKey(e, { yardOpen: false, now }));
  now = MA.mayorAppt(e).due;
  const verdict = signForReal(e, now);
  ok("prélude 1b — l'entretien idéal se conclut par une signature (mains vides, sans plans)",
     verdict === "mayorSigned" && MA.mayorSigned(e), String(verdict));
  ok("⚠️⚠️ …et le sujet « architecte naval » s'ouvre à la mairie",
     !!C.HALL_TOPICS.find(t => t.key === "engineer").when({ shared: { star: e } }));
  ok("…et le bandeau envoie chercher l'ingénieur", Q.starGoalKey(e, READY) === "engineer");
}

// ── Prélude, le chantier 2/3 : les plans.
{
  const ask = Q.resolveStarPlanAsk(e, "banc", now);
  ok("prélude 2a — l'ingénieur accepte la commande (le maire a signé)", ask.ok === true);
  Q.commitStarPlan(e, "banc", now);
  ok("…« en route », puis « au travail » : deux phrases", Q.starGoalKey(e, READY) === "engineerTravel"
     && Q.starGoalKey(e, { ...READY, engineerHere: true }) === "engineerWork");
  for (const k of Q.STAR_SHIP_KEYS)
    ok(`…« ${k} » attend les plans`, Q.starTimberBlock(e, k) === "noPlan", Q.starTimberBlock(e, k));
  now += C.STAR_ENG_TRAVEL_MS + C.STAR_ENG_WORK_MS + 1000;
  ok("prélude 2b — les plans sont rendus", Q.resolveStarPlanTick(e, now).ok === true && Q.starPlanReady(e));
}

// ── Prélude, le chantier 3/3 : ce qui touche l'eau.
{
  for (const k of Q.STAR_SHIP_KEYS)
    ok(Q.starYardPiece(k)
         ? `prélude 3a — « ${k} » est commandable avant la pluie (il touche l'eau)`
         : `⚠️⚠️⚠️ prélude 3a — « ${k} » attend la coque réparée (« hullFirst »)`,
       Q.starTimberBlock(e, k) === (Q.starYardPiece(k) ? null : "hullFirst"), Q.starTimberBlock(e, k) || "commandable");
  ok("…et le bandeau dit de commander", Q.starGoalKey(e, READY) === "timberOrder");
  ok("⚠️ …l'avis refuse tant que la coque et le gouvernail ne sont pas posés",
     Q.resolveStarWarn(clone(e), "banc", DAY, now, GATE).needYard === true);
  for (const k of Q.STAR_YARD_KEYS) {
    const order = Q.resolveStarTimberOrder(e, k, "banc", now);
    ok(`…« ${k} » : commande acceptée`, order.ok === true, order.why || "");
    Q.commitStarTimber(e, k, "banc", now, order.ms);
  }
  ok("…« Tristan scie »", Q.starGoalKey(e, READY) === "timberWait");
  now += 10 * 60 * 1000;
  Q.resolveStarTimberTick(e, now);
  ok("…« une pièce t'attend sur la cale »", Q.starGoalKey(e, READY) === "timberRaise");
  for (const k of Q.STAR_YARD_KEYS)
    ok(`…« ${k} » : montée au marteau`, Q.resolveStarTimberRaise(e, k, "banc", now).ok === true);
  ok("prélude 3b — coque et gouvernail posés, et rien d'autre",
     Q.starYardBuilt(e) && Q.starShipBuilt(e) === Q.STAR_YARD_KEYS.length, `${Q.starShipBuilt(e)}/${Q.STAR_SHIP_TOTAL}`);
  const legacy = clone(e);
  legacy.wood.mast = { at: now, readyAt: now, done: false, ready: true, by: "vieille sauvegarde" };
  ok("⚠️ …une mâture livrée par une sauvegarde d'avant ne se monte pas avant la réparation",
     Q.starRaiseBlock(legacy, "mast") === "hullFirst");
}

// ── Prélude, la panique : l'avis, puis l'attente.
{
  ok("panique 1 — la ferme trop jeune : « laisse passer quelques jours »",
     Q.starGoalKey(e, { yardOpen: false, gateOk: true, warnOffer: Q.starWarnOffer(e, 1, GATE) }) === "yardCalm");
  ok("…la ferme sans ses habitants : « recrute »",
     Q.starGoalKey(e, { yardOpen: false, gateOk: false, warnOffer: Q.starWarnOffer(e, DAY, {}) }) === "yardGrow");
  ok("…la ferme prête : « un avis au tableau des nouvelles »",
     Q.starWarnOffer(e, DAY, GATE) && Q.starGoalKey(e, { ...READY, warnOffer: true }) === "warnRead"
     && Q.starTargetSite(e, { ...READY, warnOffer: true }) === "newsBoard");
  ok("panique 2 — l'avis se lit", Q.resolveStarWarn(e, "banc", DAY, now, GATE).ok === true);
  ok("…« la vallée attend »", Q.starGoalKey(e, READY) === "warnWait");
}

// ── Chapitre 1 : la pluie, les huit impacts. (La nuit est simulée : l'hôte pose
//    la chute à la nuit tombée ; `resolveStarFall` et son tampon sont tenus par
//    `verify-quete.mjs`.)
e.fall = now;
for (const site of Q.STAR_FARM_IMPACTS) Q.resolveStarFound(e, site.id, "banc", now);
ok("chapitre 1 clos — chapitre « crater » ouvert", Q.starChapterKey(e) === "crater", `e.ch=${e.ch}`);
ok("⚠️⚠️⚠️ LE DÉFAUT DE L'AUDIT : rien ne peut conclure la quête avant la reine",
   !Q.starShipComplete(e) && Q.resolveStarGift(clone(e), ["banc"], now).ok === false
   && Q.STAR_SHIP_KEYS.every(k => Q.starYardPiece(k) || Q.starTimberBlock(e, k) === "hullFirst"));

// ── Chapitre 2 : le météore, la reine, les deux sœurs.
{
  ok("chapitre 2a — le météore de Valley Town tombe", Q.resolveStarTownFall(e, now).ok === true);
  Q.resolveStarFound(e, "crater", "banc", now);
  /* ⚠️⚠️ 2026-09-13 (lot 2) — la reine seule ne détruit rien : le saccage attend la nuit des six sœurs. */
  ok("chapitre 2b — la reine sortie, rien n'est encore détruit", Q.starYardBuilt(e) && !Q.starSabotageAt(e));
  ok("⚠️⚠️ …la réparation est REFUSÉE tant que deux sœurs manquent (l'hôte tient la même porte que l'invite)",
     Q.resolveVandalReveal(clone(e), now).ok === false);
  Q.resolveStarFound(e, "townShy", "banc", now);
  Q.resolveStarFound(e, "townGreen", "banc", now);
  ok("chapitre 2 clos — chapitre « build » ouvert (final)",
     Q.starChapterKey(e) === "build" && Q.STAR_CHAPTERS[e.ch].final, `e.ch=${e.ch}`);
  ok("…Kerguélen s'affole au quai", Q.starEngineerUrgent(e, now));
  ok("⚠️⚠️⚠️ lot 2 — la nuit des six sœurs, le saccage détruit TOUT ce qui était posé",
     Q.starShipBuilt(e) === 0 && Q.starShipWrecked(e) && Q.STAR_SHIP_KEYS.every(k => Q.starTimberBlock(e, k) === "repair"),
     Q.STAR_SHIP_KEYS.map(k => k + "=" + Q.starTimberBlock(e, k)).join(" "));
}

// ── Chapitre 3 : la réparation, la seconde moitié du navire, la septième.
{
  ok("chapitre 3a — la septième passe devant (une lumière s'éteint)",
     Q.starGoalKey(e, { ...READY, now }) === "evilSeek");
  ok("…l'épave sauvée avec Kerguélen (le marteau ne répare rien)", Q.resolveVandalReveal(e, now).ok === true && Q.starShipBuilt(e) === 0);
  ok("⚠️⚠️ lot 2 — tout attend le budget", Q.starBudgetNeeded(e) && Q.STAR_SHIP_KEYS.every(k => Q.starTimberBlock(e, k) === "noBudget"));
  {
    const x = clone(e); Q.resolveStarEvilFound(x, now);
    const at = { ...READY, now: now + LATER };
    ok("…le vandale enfui, le bandeau envoie négocier le budget à la mairie",
       Q.starGoalKey(x, at) === "budget" && Q.starTargetSite(x, at) === "townHall", String(Q.starGoalKey(x, at)));
  }
  ok("lot 2 — rendez-vous pris, et c'est le BUDGET",
     MA.resolveMayorAsk(e, "banc", "🤖 Testeur", now, () => 0.5, false, "budget") === "mayorBooked" && MA.mayorApptTopic(e) === "budget");
  now = MA.mayorAppt(e).due;
  ok("…l'entretien idéal du budget se conclut par une signature",
     signBudgetForReal(e, now) === "mayorSigned" && MA.mayorBudgetSigned(e) && MA.mayorSigned(e));
  ok("…la mairie prend une part : le prix payé est inférieur au prix plein",
     Q.starBudgetShare(e) > 0 && Q.starRebuildPrice(e, "hull") < C.STAR_REBUILD_GOLD.hull, `${Q.starRebuildPrice(e, "hull")} / ${C.STAR_REBUILD_GOLD.hull}`);
  ok("⚠️ …et le prix plein du navire reste 300 000 or",
     Object.values(C.STAR_REBUILD_GOLD).reduce((a, b) => a + b, 0) === 300000);
  now += 1000;
  for (const k of Q.STAR_SHIP_KEYS)
    ok(`chapitre 3b — « ${k} » se recommande une fois le budget voté`, Q.starTimberBlock(e, k) === null, Q.starTimberBlock(e, k) || "commandable");
  for (const k of Q.STAR_SHIP_KEYS.filter(k => k !== "bell")) {
    const order = Q.resolveStarTimberOrder(e, k, "banc", now);
    Q.commitStarTimber(e, k, "banc", now, order.ms, "paid");
  }
  Q.commitStarTimber(e, "bell", "banc", now, Q.starRebuildWaitMs("bell"), "wait");
  ok("⚠️ lot 2 — une pièce qui attend les fonds s'aide à la scie, trois fois au plus",
     Q.starHurryLeft(e, "bell") === C.STAR_REBUILD_HURRY_MAX && Q.starHurryLeft(e, "hull") === 0);
  {
    const before = e.wood.bell.readyAt;
    const h = Q.resolveStarTimberHurry(e, "bell", 3, now);
    ok("…une manche à trois étoiles retire son temps, et en consomme une",
       h.ok && e.wood.bell.readyAt === before - C.STAR_REBUILD_HURRY_CUT_MS[3] && Q.starHurryLeft(e, "bell") === C.STAR_REBUILD_HURRY_MAX - 1);
    ok("⚠️⚠️⚠️ …et le financement survit à une migration (poser, migrer, relire)",
       (() => { const m = Q.migrateStar(clone(e)); return m.wood.bell.fund === "wait" && m.wood.bell.hurry === 1 && m.wood.hull.fund === "paid"; })());
  }
  now += Q.starRebuildWaitMs("bell") + 60 * 1000;
  Q.resolveStarTimberTick(e, now);
  for (const k of Q.STAR_SHIP_KEYS)
    ok(`…« ${k} » : montée au marteau`, Q.resolveStarTimberRaise(e, k, "banc", now).ok === true);
  ok("chapitre 3c — LE NAVIRE EST ACHEVÉ, et l'épave a disparu", Q.starShipComplete(e) && !Q.starShipWrecked(e));
  ok("⚠️⚠️⚠️ …mais la quête n'est pas finie : la septième manque",
     Q.resolveStarGift(clone(e), ["banc"], now).sisterMissing === true && !Q.starQuestComplete(e));
  Q.resolveStarEvilFound(e, now);
  ok("chapitre 3d — vue : « hale-la jusqu'à la rive »", Q.starGoalKey(e, { ...READY, now: now + LATER }) === "evilHaul"
     && Q.starTargetSite(e, { ...READY, now: now + LATER }) === "evilLake");
  Q.resolveStarEvilRescue(e, now);
  ok("…halée : « porte-la et réanime-la »", Q.starGoalKey(e, { ...READY, now: now + LATER }) === "evilRevive");
  Q.resolveStarFound(e, Q.STAR_EVIL_ID, "banc", now);
  ok("chapitre 3e — réanimée : la quête est complète", Q.starQuestComplete(e));
  const g = Q.resolveStarGift(e, ["banc"], now);
  /* ⚠️ D11 — LE DON CONVOQUE, IL NE JOUE PLUS « end » LUI-MÊME. `doneAt` reste
     la conclusion de la quête ; ce qui suit (le maire, le baptême, l'inauguration)
     est l'épilogue, jamais sauté par ce banc (la ligne rouge du 444 : on ne
     saute pas la scène du maire, et D11 en ajoute deux de plus du même métal). */
  ok("LA FIN DU CHANTIER — le don se fait, le maire convoque",
     g.ok === true && g.scene === "summon" && Q.starDone(e) && Q.starGoalKey(e, {}) === "finaleSummon");
}

/* ═══════════════════════════════════════════════════════════════════════════
   D11 — L'ÉPILOGUE : LE MAIRE, LE BAPTÊME, L'INAUGURATION, PUIS LA FIN RÉELLE.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️⚠️ CE BANC REJOUE TOUTE LA TRAME, FINALE COMPRISE (consigne du chantier) :
   sans cette section, `starDone(e)` marquerait la fin pour ce banc alors que le
   joueur, lui, a encore trois portes à ouvrir avant l'écran final. */
{
  now += 1000;
  const ra = Q.resolveStarFinaleAgree(e, "banc", now);
  ok("D11a — le maire accorde la fête (sans jauge ni rendez-vous)",
     ra.ok === true && Q.starFinaleAgreed(e) && Q.starGoalKey(e, {}) === "finaleBaptize");
  now += 1000;
  const rb = Q.resolveStarBaptize(e, "banc", now);
  ok("D11b — le baptême : `starShipName` rend enfin le nom",
     rb.ok === true && Q.starShipName(e) === C.STAR_SHIP_NAME && Q.starGoalKey(e, {}) === "finaleInaugurate");
  now += 1000;
  const ri = Q.resolveStarFinaleInaugurate(e, "banc", now);
  ok("D11c — l'inauguration publique : la mise en mer est lancée",
     ri.ok === true && Q.starFinaleInaugurated(e) && Q.starGoalKey(e, {}) === null);
  ok("⚠️ …la fenêtre de cérémonie est active tout de suite après",
     Q.starFinaleInaugActive(e, now + 1));
  ok("⚠️⚠️ D11d — LA CINÉMATIQUE FINALE (étoiles + texte) EST DUE, PAS AVANT",
     !Q.starFinaleEndDue(e, now + Q.STAR_FINALE_END_AT_MS - 1)
     && Q.starFinaleEndDue(e, now + Q.STAR_FINALE_END_AT_MS + 1));
  ok("⚠️⚠️⚠️ LA FIN RÉELLE : LES TROIS PORTES DE L'ÉPILOGUE SONT TOUTES FRANCHIES",
     Q.starFinaleAgreed(e) && Q.starFinaleBaptized(e) && Q.starFinaleInaugurated(e) && Q.starDone(e));
}

/* ═══════════════════════════════════════════════════════════════════════════
   §2 — LE MENU DÉVELOPPEUR REJOUE LA MÊME TRAME, EN RACCOURCI, ET S'ARRÊTE AUX
   MÊMES ENDROITS. Pas seulement « la partie réelle peut y arriver », mais « le
   menu dev pose exactement ce que la partie réelle pourrait avoir posé ».
   ═══════════════════════════════════════════════════════════════════════════ */
section("§2 le menu dev, sous-partie par sous-partie");
{
  const e2 = Q.newStar();
  let t = 1_800_000_000_000;
  const r1 = Q.devStar(e2, "plans", t, "hote");
  ok("« plans » sans le maire : bloqué, rendez-vous posé, et rien d'autre",
     r1.blocked === "needMayor" && !!MA.mayorAppt(e2) && !Q.starPlanAsked(e2) && !Q.starWarned(e2) && !Q.starFallen(e2));
  ok("…signé pour de bon (même méthode qu'au §1)", signForReal(e2, t += 1000) === "mayorSigned");
  Q.devStar(e2, "plans", t += 1000, "hote");
  ok("« plans » après la signature : plans rendus, AUCUNE étoile ni pluie",
     Q.starPlanReady(e2) && !Q.starFallen(e2) && Object.keys(e2.found).length === 0);
  const r3 = Q.devStar(e2, "timber", t += 1000, "hote");
  ok("« bois » avant la pluie : la coque et le gouvernail, pas la mâture",
     !r3.blocked && Q.starYardBuilt(e2) && Q.starShipBuilt(e2) === Q.STAR_YARD_KEYS.length && !Q.starFallen(e2));
  const before = JSON.stringify(e2.wood);
  const r4 = Q.devStar(e2, "timber", t += 1000, "hote");
  ok("…re-cliqué : « hullFirst », rien ne bouge", r4.blocked === "hullFirst" && JSON.stringify(e2.wood) === before, String(r4.blocked));
  const r5 = Q.devStar(e2, "start", t += 1000, "hote");
  ok("« start » : l'avis puis la chute, avec sa scène", Q.starWarned(e2) && Q.starFallen(e2) && r5.scene === "fall");
  Q.devStar(e2, "shy", t += 1000, "hote");
  ok("⚠️⚠️ « la discrète » : le météore est tombé AVANT que la reine soit trouvée",
     Q.starTownFallen(e2) && Q.starHas(e2, "crater") && e2.townFall < e2.found.crater.at, `${e2.townFall} < ${e2.found.crater.at}`);
  const r6 = Q.devStar(e2, "all", t += 1000, "hote");
  ok("⚠️⚠️ lot 2 — « tout sauf la fin » s'arrête au rendez-vous du BUDGET, sans rien reconstruire",
     r6.blocked === "needBudget" && MA.mayorApptTopic(e2) === "budget" && Q.starShipBuilt(e2) === 0 && !MA.mayorBudgetSigned(e2),
     String(r6.blocked));
  /* ⚠️⚠️⚠️ 2026-09-13 (D11, audit en jeu) — « appt », LE BOUTON QUI SAUTE
     L'ATTENTE, PAS LA MÊME PORTE QUE « all ». `starDevBudgetGate` (utilisé par
     « all » juste au-dessus) posait déjà `topic: "budget"` correctement ; le
     bouton solo « appt » avait sa PROPRE écriture de `e.mayor.appt`, qui
     omettait `topic` — donc `MA.mayorApptTopic` retombait sur « yard » par
     défaut, et la porte du bureau (FermeGame.js, tryMayorDoor) répondait « déjà
     signé » pour toujours après le saccage. Rejoué ici : sans le sujet lu via
     `starBudgetNeeded` dans l'op « appt » lui-même, cette assertion rougirait
     alors que « all » juste au-dessus, lui, resterait vert — la preuve que les
     deux portes divergeaient. */
  const r6b = Q.devStar(e2, "appt", t += 1000, "hote");
  ok("⚠️⚠️⚠️ « appt » APRÈS LE SACCAGE pose un rendez-vous BUDGET, jamais chantier — même si le chantier, LUI, reste signé",
     r6b.ok && MA.mayorApptTopic(e2) === "budget" && MA.mayorSigned(e2) && !MA.mayorBudgetSigned(e2));
  ok("…le budget signé pour de bon", signBudgetForReal(e2, t += 1000) === "mayorSigned");
  Q.devStar(e2, "all", t += 1000, "hote");
  ok("« tout sauf la fin » : la quête est complète, la scène reste à jouer",
     Q.starQuestComplete(e2) && !Q.starDone(e2) && Q.starEvilFound(e2) && Q.starEvilRescued(e2));
}

/* ═══════════════════════════════════════════════════════════════════════════
   §2 bis — CHAQUE BOUTON, DEPUIS UN MAIRE SIGNÉ, NE PRODUIT QUE DES ÉTATS QUE LA
   PARTIE RÉELLE PEUT ATTEINDRE.
   ═══════════════════════════════════════════════════════════════════════════ */
section("§2 bis — chaque bouton, maire signé : aucun état impossible");
for (const op of Q.STAR_DEV_OPS) {
  const s = Q.newStar();
  const t = 1_900_000_000_000;
  signForReal(s, t - 5000);
  const r = Q.devStar(s, op, t, "hote");
  const x = r.star || s;
  const bad = [];
  // 2026-09-13 (lot 2) — après le saccage la coque a disparu : ce n'est plus un état impossible.
  if (Q.starWarned(x) && !Q.starYardBuilt(x) && !Q.starRebuildGate(x)) bad.push("pluie annoncée sans coque ni gouvernail");
  if (Q.starRebuildGate(x) && !MA.mayorBudgetSigned(x)
      && Q.STAR_SHIP_KEYS.some(k => Q.starTimberDone(x, k) || Q.starTimberReady(x, k) || Q.starTimberOrder(x, k)))
    bad.push("reconstruction sans budget");
  if (Q.starFallen(x) && !Q.starPlanReady(x)) bad.push("chute sans plans");
  if (Q.starHas(x, "crater") && !Q.starTownFallen(x)) bad.push("reine sans météore");
  if (Q.STAR_SHIP_KEYS.some(k => !Q.starYardPiece(k) && (Q.starTimberDone(x, k) || Q.starTimberReady(x, k))) && !Q.starHullRepaired(x))
    bad.push("mâture/voile/cloche avant la réparation");
  if (Q.starHas(x, Q.STAR_EVIL_ID) && !Q.starEvilRescued(x)) bad.push("septième suivie sans avoir été halée");
  if (x.vandal && !Q.STAR_CHAPTERS[Math.min(x.ch, Q.STAR_CH_DONE - 1)].final) bad.push("réparation avant les six sœurs");
  ok(`« ${op} » ne fabrique aucun état impossible`, bad.length === 0, bad.join(" · ") || (r.blocked ? "arrêté : " + r.blocked : "ok"));
}

/* ═══════════════════════════════════════════════════════════════════════════
   §3 — LA FALSIFICATION. Avant la signature du maire, AUCUN bouton (hors remise à
   zéro et boutons de l'audience) ne doit écrire autre chose que le rendez-vous.
   Sur le code d'avant le 2026-09-13, dix-sept rougissaient : ils faisaient tomber
   la pluie, trouvaient des étoiles ou rendaient des plans avant de s'arrêter.
   ═══════════════════════════════════════════════════════════════════════════ */
section("§3 falsification — sans le maire, un bouton ne pose que le rendez-vous");
{
  const AUDIENCE = ["reset", "appt", "unslam"];
  for (const op of Q.STAR_DEV_OPS.filter(o => !AUDIENCE.includes(o))) {
    const s = Q.newStar();
    const t = 2_000_000_000_000;
    const strip = (o) => { const c = clone(o); delete c.mayor; return JSON.stringify(c); };
    const before = strip(s);
    const r = Q.devStar(s, op, t, "hote");
    const after = strip(r.star || s);
    ok(`« ${op} » sans le maire : \`blocked:"needMayor"\`, rendez-vous posé, rien d'autre`,
       r.blocked === "needMayor" && before === after && !!MA.mayorAppt(r.star || s),
       before === after ? String(r.blocked) : "état modifié");
  }
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${fails === 0 ? "✅" : "❌"} ${total - fails}/${total} contrôles passés.\n`);
process.exit(fails === 0 ? 0 : 1);
