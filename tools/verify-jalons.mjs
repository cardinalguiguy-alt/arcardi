/* =============================================================================
   verify-jalons.mjs — LE BANC D'ATTEIGNABILITÉ (P1 bis, 2026-09-07)
   -----------------------------------------------------------------------------
   ⚠️⚠️⚠️ POURQUOI CE BANC EXISTE, MOT POUR MOT DEPUIS `QUETE.md` §12.2 (« A moins
   un ») : Guillaume a signalé le 2026-09-05 que le menu développeur de la quête
   de l'étoile a DEUX PISTES D'ÉTAT PARALLÈLES — les ÉTOILES (`e.found`, `e.ch`)
   et le BATEAU/MAIRE (`e.plan`, `e.wood`, `MA.mayorSigned`) — et qu'aucun bouton
   ne les avançait ensemble : un raccourci pouvait poser un bateau fini devant un
   maire jamais rencontré, **un état que la partie réelle ne peut pas produire**
   (`Q.starTimberBlock` refuse « noMayor » avant la toute première commande de
   bois). La parade n'est pas de sauter la scène du maire (la ligne rouge du 444
   tient) — c'est de poser des jalons COHÉRENTS, et de le PROUVER en rejouant une
   vraie partie, du premier impact météorique jusqu'au navire achevé.

   ⚠️⚠️ CE BANC NE RELIT PAS UNE TABLE, IL JOUE LA TRAME ENTIÈRE — même méthode
   que `verify-maire.mjs` (l'audience) et `verify-quete.mjs` (les fenêtres
   solo) : appeler le vrai code, jouer la vraie chaîne, mesurer au lieu de
   relire. La négociation avec le maire est simulée avec les résolveurs RÉELS de
   `maire.js` (`mayorOpen`/`mayorChoices`/`mayorPlay`), en choisissant partout la
   réponse idéale — exactement la technique de `verify-maire.mjs`, reprise ici
   pour ne pas ré-inventer une seconde façon de gagner une audience.

   ⚠️ ET IL SE FALSIFIE : §3 rejoue `Q.devStar("timber"/"deliver"/"all")` AVANT
   la signature du maire et exige qu'AUCUNE pièce de bois ne devienne "ready" ou
   "done" — c'est exactement l'état que Guillaume a trouvé possible, et c'est
   exactement ce que ce banc doit voir devenir IMPOSSIBLE. Un banc qui n'a jamais
   pu échouer ne vaut rien (§10 de `CLAUDE.md`) : ce contrôle est celui qui
   aurait rougi sur le code d'avant cette passe.

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

/* ── JOUER UNE AUDIENCE GAGNANTE, AVEC LES VRAIS RÉSOLVEURS DE `maire.js` ────
   Reprise de `verify-maire.mjs` (`play`/`pickIdeal`) : le joueur idéal répond
   toujours la meilleure réplique, et pose les plans dès que la table le permet.
   On ne réinvente pas une seconde façon de gagner une audience — celle-ci EST
   celle que `verify-maire.mjs` vérifie déjà, à fond, séparément. */
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

/* ═══════════════════════════════════════════════════════════════════════════
   §1 — LA TRAME RÉELLE, DU PREMIER IMPACT AU NAVIRE ACHEVÉ.
   Chaque étape n'avance qu'AVEC les résolveurs que le jeu appelle vraiment :
   `resolveStarFound`, `resolveStarPlanAsk`/`commitStarPlan`/`resolveStarPlanTick`,
   `resolveMayorAsk`/`resolveMayor`, `resolveStarTimberOrder`/`commitStarTimber`/
   `resolveStarTimberTick`/`resolveStarTimberRaise`. Si l'un de ces noms change de
   forme, ce banc casse à la compilation — jamais en silence.
   ═══════════════════════════════════════════════════════════════════════════ */
/* ⚠️⚠️⚠️ AUTORITÉ 2026-09-12 — LA TRAME DE CE BANC EST RÉORDONNÉE, PAS SES
   RÉSOLVEURS. Avant, le maire ne pouvait être rencontré qu'APRÈS le cratère
   (l'étoile envoyait chercher un ingénieur pour l'épave). Le chantier naval se
   motive maintenant indépendamment des étoiles (`QUETE.md`, tête de fichier) :
   le maire est rencontré et l'ingénieur commandé AVANT le premier impact,
   jamais après. Les jalons du chantier passent donc en tête ; les impacts de la
   ferme et le cratère suivent, dans n'importe quel ordre relatif — le protège
   toujours §3 plus bas (rien ne doit avancer SANS le maire). */
section("§1 la trame réelle, jalon par jalon");
let now = 1_700_000_000_000; // une vraie date (§10 : ne jamais tester des dates avec `at: 1000`)
const e = Q.newStar();

ok("jalon 0 — quête vierge, chapitre « field », rien du chantier naval",
   Q.starChapterKey(e) === "field" && !MA.mayorSigned(e) && !Q.starPlanAsked(e));

// ── Jalon 1 : l'audience — un vrai rendez-vous, une vraie négociation gagnée,
//    AVANT tout impact (le chantier se motive indépendamment des étoiles).
{
  const askMayor = MA.resolveMayorAsk(e, "banc", "🤖 Testeur", now, () => 0.5, false);
  ok("jalon 1a — le rendez-vous est pris", askMayor === "mayorBooked", String(askMayor));
  const due = MA.mayorAppt(e).due;
  ok("…et il tient une échéance dans le futur (pas signé sur-le-champ)", due > now);
  now = due;
  ok("…arrivé pile à l'heure, le rendez-vous est bien le mien",
     MA.mayorApptReady(e, "banc", now));

  const ctx = {
    mayorKey: C.TOWN_CANDIDATES[0].key, day: 12, nextElection: 30,
    audience: false, plans: Q.starPlanReady(e), trust: MA.mayorTrust(e),
    mood: MA.mayorAppt(e).mood || "mid", burnt: MA.mayorBurnt(e),
  };
  const s = playMayor(ctx, pickIdeal);
  ok("jalon 1b — l'entretien idéal se conclut par une signature (mains vides, sans plans)",
     s.over === "signed", `over=${s.over}`);
  const verdict = MA.resolveMayor(e, "banc", "🤖 Testeur", s.log, ctx, now);
  ok("jalon 1c — l'hôte rejoue la transcription et signe pour de bon",
     verdict === "mayorSigned" && MA.mayorSigned(e), String(verdict));
}

// ── Jalon 2 : les plans sont demandés (résolveur réel, pas une écriture
//    directe) — possible maintenant que le maire a validé le projet.
{
  const ask = Q.resolveStarPlanAsk(e, "banc", now);
  ok("jalon 2a — l'ingénieur accepte la commande de plans (le maire a signé)", ask.ok === true);
  Q.commitStarPlan(e, "banc", now);
  ok("…« plans demandés » vrai, « prêts » toujours faux (le train n'est pas arrivé)",
     Q.starPlanAsked(e) && !Q.starPlanReady(e));
  for (const k of Q.STAR_SHIP_KEYS)
    ok(`…« ${k} » attend toujours les plans (maire signé, mais pas encore de plans)`,
       Q.starTimberBlock(e, k) === "noPlan", Q.starTimberBlock(e, k));
}

// ── Jalon 3 : le temps passe (voyage + dessin), les plans arrivent.
now += C.STAR_ENG_TRAVEL_MS + C.STAR_ENG_WORK_MS + 1000;
{
  const tick = Q.resolveStarPlanTick(e, now);
  ok("jalon 3 — les plans sont rendus", tick.ok === true && Q.starPlanReady(e));
}

/* ⚠️⚠️⚠️ LE CHANTIER S'OUVRE AVANT LA MOINDRE ÉTOILE — C'EST LE POINT ENTIER DU
   RECENTRAGE, ET C'EST MAINTENANT MESURABLE. Maire signé (jalon 1) et plans
   rendus (jalon 3) suffisent : les quatre pièces sans lieu (`rudder`/`mast`/
   `sail`/`bell`) ET la coque (site conditionnel, voir `shipSiteOk` dans
   `quete.js`) sont commandables AVANT tout impact — aucun `e.found` n'existe
   encore à cet instant. */
for (const k of Q.STAR_SHIP_KEYS)
  ok(`jalon 3 bis — « ${k} » est commandable AVANT tout impact (chantier indépendant des étoiles)`,
     Q.starTimberBlock(e, k) === null, Q.starTimberBlock(e, k) || "débloqué");

// ── Jalon 4 : les huit impacts de la ferme sont fouillés — le chantier tourne déjà.
for (const site of Q.STAR_FARM_IMPACTS) Q.resolveStarFound(e, site.id, "banc", now);
ok("jalon 4 — chapitre 1 clos, chapitre « crater » ouvert",
   Q.starChapterKey(e) === "crater", `e.ch=${e.ch}`);

// ── Jalon 5 : le cratère (reine, discrète, verte) est refermé.
Q.resolveStarFound(e, "crater", "banc", now);
Q.resolveStarFound(e, "townShy", "banc", now);
Q.resolveStarFound(e, "townGreen", "banc", now);
ok("jalon 5 — chapitre 2 clos, chapitre « build » ouvert (final)",
   Q.starChapterKey(e) === "build" && Q.STAR_CHAPTERS[e.ch].final, `e.ch=${e.ch}`);
/* ⚠️⚠️⚠️ AUTORITÉ 2026-09-12 (repasse) — DANS CETTE TRAME PRÉCISE, LA COQUE
   RÉGRESSE MAINTENANT POUR DE VRAI. La première version de cette passe disait
   l'inverse : « farmMaterial fait partie des huit impacts fouillés au jalon 4,
   donc le renfort est déjà en poche ». C'était vrai — et c'est justement ce
   qui rendait `farmMaterial` MORT comme garde-fou (vérifié par un test direct,
   hors banc : au moment où `crater` peut devenir vrai, `farmMaterial` l'est
   TOUJOURS déjà — `field` en est un préalable structurel). Le garde-fou est
   donc devenu `e.vandal` (posé par `resolveVandalReveal`, désormais appelé
   APRÈS le mini-jeu du marteau, plus jamais au premier contact) — garanti FAUX
   à cet instant précis, donc une vraie régression, visible dans CETTE trame et
   pas seulement dans le cas limite que `render-navire.mjs` isolait. */
ok("…« hull » régresse après le cratère : la réparation n'a pas encore été jouée",
   Q.starTimberBlock(e, "hull") === "noShard");
for (const k of Q.STAR_SHIP_KEYS.filter(k => k !== "hull"))
  ok(`…« ${k} » reste commandable après le cratère (aucun lieu ne le concerne)`,
     Q.starTimberBlock(e, k) === null, Q.starTimberBlock(e, k));
/* Le marteau, avec Kerguélen — la coque redevient commandable. */
Q.resolveVandalReveal(e, now);
ok("…et la réparation jouée, « hull » redevient commandable",
   Q.starTimberBlock(e, "hull") === null, Q.starTimberBlock(e, "hull"));

// ── Jalon 6 : le chantier — cinq commandes, cinq livraisons, cinq montages.
for (const k of Q.STAR_SHIP_KEYS) {
  const order = Q.resolveStarTimberOrder(e, k, "banc", now);
  ok(`…« ${k} » : la commande est acceptée`, order.ok === true, order.why || "");
  Q.commitStarTimber(e, k, "banc", now, order.ms);
}
now += 10 * 60 * 1000; // largement au-delà de la plus longue pièce (8 min, la coque)
{
  const tick = Q.resolveStarTimberTick(e, now);
  ok("…les cinq pièces sont livrées (prêtes à monter)", tick.keys.length === Q.STAR_SHIP_KEYS.length,
     `${tick.keys.length}/${Q.STAR_SHIP_KEYS.length}`);
}
for (const k of Q.STAR_SHIP_KEYS) {
  const raise = Q.resolveStarTimberRaise(e, k, "banc", now);
  ok(`…« ${k} » : montée au marteau`, raise.ok === true);
}
ok("jalon 7 — LE NAVIRE EST ACHEVÉ", Q.starShipComplete(e));

/* ═══════════════════════════════════════════════════════════════════════════
   §2 — LE MENU DÉVELOPPEUR REJOUE LA MÊME TRAME, EN RACCOURCI, ET S'ARRÊTE AUX
   MÊMES ENDROITS. C'est la moitié que `QUETE.md` réclame : pas seulement « la
   partie réelle peut y arriver », mais « le menu dev pose exactement ce que la
   partie réelle pourrait avoir posé — jamais plus ».
   ═══════════════════════════════════════════════════════════════════════════ */
section("§2 le menu dev, jalon par jalon — même trame, en raccourci");
{
  const e2 = Q.newStar();
  const t0 = 1_800_000_000_000;
  const r1 = Q.devStar(e2, "plans", t0, "hote");
  /* ⚠️ « plans » ne ferme QUE le champ + la reine (`resolveStarFound(e,"crater",…)`),
     jamais la discrète ni la verte : `resolveStarPlanAsk` ne réclame que la reine
     (`starHas(e,"crater")`), donc un vrai joueur PEUT demander les plans avant
     d'avoir fini le chapitre 2 — le chapitre reste donc « crater », pas « build ».
     C'est un état atteignable, pas un bug : le contrôle vérifie qu'il reste
     cohérent (plans prêts, bateau/maire encore vierges), pas qu'il ferme le
     chapitre à sa place. */
  ok("« plans » pose le champ + la reine, laisse le chapitre ouvert, jamais le bateau/maire",
     r1.ok && Q.starChapterKey(e2) === "crater" && Q.starPlanReady(e2)
     && !MA.mayorSigned(e2) && Object.keys(e2.wood).length === 0);

  const r2 = Q.devStar(e2, "all", t0, "hote");
  ok("« all » AVANT le maire : ok, mais `blocked:\"needMayor\"` — rien sur la cale",
     r2.ok === true && r2.blocked === "needMayor" && Object.keys(e2.wood).length === 0);
  ok("…et il a quand même posé le rendez-vous, comme le bouton « appt » l'aurait fait",
     !!MA.mayorAppt(e2));
  ok("…jamais de bateau achevé sans signature : c'est le jalon qui a manqué le 2026-09-05",
     !Q.starShipComplete(e2));

  const r3 = Q.devStar(e2, "timber", t0, "hote");
  ok("« timber » AVANT le maire refuse aussi, pour la même raison",
     r3.ok === true && r3.blocked === "needMayor" && Object.keys(e2.wood).length === 0);
  const r4 = Q.devStar(e2, "deliver", t0, "hote");
  ok("« deliver » AVANT le maire refuse aussi, pour la même raison",
     r4.ok === true && r4.blocked === "needMayor" && Object.keys(e2.wood).length === 0);

  // On signe pour de bon, avec la même audience idéale qu'au §1.
  MA.migrateMayor(e2);
  const ctx2 = {
    mayorKey: C.TOWN_CANDIDATES[0].key, day: 12, nextElection: 30,
    audience: false, plans: true, trust: 0, mood: "mid", burnt: [],
  };
  const s2 = playMayor(ctx2, pickIdeal);
  MA.resolveMayor(e2, "hote", "🤖 Testeur", s2.log, ctx2, t0 + 1000);
  ok("le maire est signé (même méthode qu'au §1)", MA.mayorSigned(e2));

  const r5 = Q.devStar(e2, "all", t0 + 2000, "hote");
  ok("« all » APRÈS la signature termine le navire, sans blocage",
     r5.ok === true && !r5.blocked && Q.starShipComplete(e2));
}

/* ═══════════════════════════════════════════════════════════════════════════
   §3 — LA FALSIFICATION. On isole le cas exact que Guillaume a trouvé et on
   exige qu'il soit devenu IMPOSSIBLE : « deliver » AVANT le maire ne doit
   JAMAIS écrire une seule ligne dans `e.wood`, quel que soit l'ordre des
   boutons cliqués juste avant. Un banc qui n'a jamais pu échouer ne vaut rien
   (§10 de `CLAUDE.md`) — celui-ci aurait rougi sur le code d'avant cette passe :
   `deliver` y écrivait `e.wood[k] = { ready: true, … }` pour les cinq clés,
   sans un seul regard vers `MA.mayorSigned`. */
section("§3 falsification — l'état que Guillaume a trouvé doit être IMPOSSIBLE");
{
  const e3 = Q.newStar();
  Q.devStar(e3, "plans", now, "hote");
  ok("point de départ : plans prêts, maire jamais rencontré", Q.starPlanReady(e3) && !MA.mayorSigned(e3));
  for (const op of ["deliver", "timber", "all"]) {
    const before = JSON.stringify(e3.wood);
    const r = Q.devStar(e3, op, now, "hote");
    const after = JSON.stringify(e3.wood);
    ok(`« ${op} » sans le maire : \`e.wood\` INCHANGÉ (${before === "{}" ? "vide" : before} → ${after})`,
       before === after && r.blocked === "needMayor");
  }
  ok("…aucune pièce n'est « ready », aucune n'est « done » — c'est le seul verdict qui compte",
     Q.STAR_SHIP_KEYS.every(k => !Q.starTimberReady(e3, k) && !Q.starTimberDone(e3, k)));
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${fails === 0 ? "✅" : "❌"} ${total - fails}/${total} contrôles passés.\n`);
process.exit(fails === 0 ? 0 : 1);
