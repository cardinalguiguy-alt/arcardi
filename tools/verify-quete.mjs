/* =============================================================================
   verify-quete.mjs — LA QUÊTE DE L'ÉTOILE TIENT-ELLE DEBOUT ? (zip 444)
   -----------------------------------------------------------------------------
   Il remplace `verify-enquete.mjs`, supprimé avec l'enquête du 442. Ce qu'il
   reprend d'elle est sa MÉTHODE, pas ses contrôles : appeler le vrai code, jouer
   la vraie chaîne, mesurer au lieu de relire.

   ⚠️⚠️ ET IL EXISTE POUR UNE RAISON QUI EST ÉCRITE EN TÊTE DE CLAUDE.md : « un
   banc qui passe ne veut pas dire que la chose est bonne — il veut dire qu'on
   mesure autre chose ». Les quatre formes connues de ce défaut sont toutes
   possibles ici, alors on les nomme :
     · mesurer la CARTE et pas l'INTERACTION → §4 rejoue les fenêtres solo image
       par image, à la vraie vitesse de course, avec la vraie collision ;
     · se donner un périmètre et excuser ce qui déborde → §7 compare les DEUX
       listes dans les DEUX sens, jamais « les arrêts que je connais » ;
     · repeindre au lieu d'appeler → tout vient de `quete.js` et de
       `fermeEngine.js`, ce fichier ne réimplémente aucune règle ;
     · mesurer l'inverse de ce qu'on veut → §4 échoue AUSSI quand une fenêtre est
       trop large, parce qu'une fenêtre qui ne demande rien n'est pas une
       réussite, c'est une mécanique morte.

   ⚠️ LE CONTRÔLE §8 PUBLIE COMBIEN DE LIGNES IL A LUES. Leçon du 441, payée
   comptant : le garde-fou de source de `verify-pont` annonçait « 0 appel
   fautif » alors que son motif ne pouvait matcher aucun appel réel. Un scanner
   qui ne scanne rien passe toujours au vert. On imprime donc le dénominateur.

   Usage : node tools/verify-quete.mjs
   ========================================================================== */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "components", "ferme");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "quete-"));
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
copy("fermeEngine");
copy("quete");
copy("maire");
copy("fermeStrings");   // §9 : chaque clé que le jeu lit doit exister

const C = await import(pathToFileURL(path.join(tmp, "fermeConstants.js")).href);
const E = await import(pathToFileURL(path.join(tmp, "fermeEngine.js")).href);
const Q = await import(pathToFileURL(path.join(tmp, "quete.js")).href);

/* ⚠️⚠️ ZIP 479 — LE BANC REJOUE LE VRAI GESTE, PAS SA MOITIÉ. C'est la leçon 469
   (« un banc qui invente ses données mesure un jeu que personne ne joue »)
   appliquée au lot des trois verbes : depuis ce zip, la bleue veut son OFFRANDE
   avant la posture, et la rose ne veut PAS de posture du tout. Un banc qui aurait
   continué d'appeler `resolveStarCalm` sur les trois aurait été vert sur deux
   étoiles inatteignables. */
const payBlue = (e, who, at) => {
  Q.resolveStarCandy(e, who, Q.STAR_CANDY_PRICE, at);
  return Q.resolveStarLight(e, who, Q.STAR_LIGHT_SITE, Q.STAR_CANDY_PRICE, at);
};

/* ⚠️⚠️⚠️ ZIP 480 — LA CHAÎNE A UNE ÉTAPE DE PLUS, ET LE BANC DOIT LA JOUER. La
   cale est sur le quai municipal : depuis cette passe, `starTimberBlock` rend
   `noMayor` tant que l'audience n'a pas abouti. Un banc qui aurait continué à
   poser `e.plan.done = 1` et rien d'autre aurait mesuré une chaîne que plus
   personne ne peut jouer — c'est la leçon 469 mot pour mot (« on rejoue avec les
   vraies données ET le vrai cycle de vie de l'état »), et le 472 a montré qu'une
   discipline ajoutée à UNE section ne protège que cette section. On passe donc
   par le VRAI résolveur d'audience, jamais par un champ posé à la main : le jour
   où signer demandera autre chose, ce banc le saura.
   ⚠️ La négociation elle-même est mesurée par `tools/verify-maire.mjs`, qui en
   joue quatre cents. Ici on ne fait que la GAGNER. */
const MA = await import(pathToFileURL(path.join(tmp, "maire.js")).href);
const signMayor = (e, at = 1) => {
  const ctx = { mayorKey: "vasseur", day: 12, nextElection: 30, plans: true, trust: 0, audience: false };
  const s = MA.mayorOpen(ctx);
  let guard = 0;
  while (!s.over && guard++ < 40) {
    const cs = MA.mayorChoices(s);
    if (!cs.length) break;
    if (s.node === "m5" && cs.some(c => c.kind === "plans")) { MA.mayorPlay(s, "__plans", 0); continue; }
    const best = cs.find(c => c.kind === "say" && c.grade === "ideal");
    if (!best) break;
    MA.mayorPlay(s, best.k, 0);
  }
  MA.resolveMayor(e, "j1", "j1", s.log, ctx, at);
  return e;
};

let fails = 0, total = 0;
const ok = (n, c, x) => { total++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };
const section = (t) => console.log(`\n=== ${t} ===\n`);

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 455 — LA CHUTE S'ANNONCE AVANT DE TOMBER, DONC LE BANC AUSSI.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️ Sept contrôles appelaient `resolveStarFall` directement et sont passés au
   ROUGE le jour où la règle a changé — c'est exactement ce qu'on attend d'eux, et
   c'est pourquoi le tampon a le droit d'exister. Le raccourci est écrit UNE fois :
   trois copies auraient fini par ne pas armer la même chose (leçon du 387).
   ⚠️ `DAY0 = 0` DONNE UNE NUIT À `STAR_WARN_FLOOR_MS` PRÈS CALCULABLE À LA MAIN,
   ce qui rend les échéances de ce fichier lisibles sans lancer le banc. */
const DAY0 = 0;
const NIGHT0 = Q.starNightStart(DAY0);
const gateCtx = (extra) => ({ skills: C.STAR_GATE_SKILLS, artisans: C.STAR_GATE_ARTISANS, dayStartAt: DAY0, ...extra });
/* Annonce + chute, comme l'hôte les enchaîne. Rend le résultat de la CHUTE. */
const armFall = (e, day, now) => {
  Q.resolveStarWarn(e, "banc", day === undefined ? Q.STAR_FALL_MIN_DAY : day, 1, gateCtx());
  return Q.resolveStarFall(e, day === undefined ? Q.STAR_FALL_MIN_DAY : day, now === undefined ? NIGHT0 + 1 : now, gateCtx());
};
const findFarmImpacts = (e, who = "banc", at = 1) => {
  for (const [i, site] of Q.STAR_FARM_IMPACTS.entries())
    Q.resolveStarFound(e, site.id, who, at + i);
};
const openTownCrater = (e, at = 10) => {
  findFarmImpacts(e, "banc", at - 6);
  Q.resolveStarTownFall(e, at);
  return e.townFall;
};
/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 2026-09-02 (lot A) — LA REINE SE NOURRIT ET SE RÉVEILLE AVANT DE SE TENIR.
   ╚══════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ CE PRÉAMBULE PASSE PAR LES VRAIS RÉSOLVEURS, jamais par une écriture
   directe dans `e.offer`/`e.woke` : un banc qui pose l'état à la main mesure
   l'état, pas le CHEMIN — et c'est le chemin qui vient d'être ajouté. Tous les
   scénarios de tenue de la reine s'en servent, donc ils échoueront tous si l'un
   des deux nouveaux étages cesse de fonctionner.
   ⚠️ IL EST SÉPARÉ DE `openTownCrater` À DESSEIN : plusieurs contrôles vérifient
   qu'un cratère BRÛLANT ne donne rien, et un helper qui nourrirait au passage
   masquerait ce refus-là. Ouvrir le trou et l'apprêter sont deux gestes.
   ⚠️ `resolveStarCandy` crédite le flux avec l'horloge de l'hôte et une échéance
   ABSOLUE (§3 de CLAUDE.md) : on lui passe `t`, jamais une durée. */
/* 2026-09-02 (lot A2) — LA DISCRÈTE FERME LE CHAPITRE 2 DERRIÈRE LA REINE, donc
   tout scénario qui traversait « cratère → ingénieur » doit désormais la repérer au
   passage. ⚠️ IL PASSE PAR LE VRAI RÉSOLVEUR (qui refuse avant la reine), jamais
   par une écriture directe dans `e.found` : c'est ce refus-là qu'on veut voir tenir
   à chaque scénario, pas seulement dans son contrôle dédié. */
/* ⚠️⚠️ 2026-09-03 (lot A3) — `findShy` DEVIENT `findSisters`, ET LE RENOMMAGE EST
   LE POINT : ce que ses huit appelants veulent n'a jamais été « démasquer la
   discrète », c'est « fermer le chapitre 2 pour regarder la suite ». Le jour où la
   verte s'est ajoutée au `need` du chapitre, un nom qui décrivait UNE trouvaille a
   fait échouer treize contrôles qui parlaient du chantier naval — chacun réclamant
   un objectif de chapitre 3 en obtenant `townGreenAway`. Le contrôle avait raison ;
   c'est son échafaudage qui mentait sur son intention. */
/* ⚠️⚠️ 2026-09-03 (lot C) — `findSisters` MARQUE AUSSI LA SEPTIÈME SŒUR COMME
   DÉJÀ VUE, ET C'EST LE MÊME RENOMMAGE QU'AU 2026-09-03 (LOT A3) CI-DESSUS.
   Son intention documentée est « fermer le chapitre 2 pour regarder la suite » —
   or la suite, depuis ce lot, contient DEUX chantiers parallèles (le bateau ET
   le lac maléfique), et ses dizaines d'appelants ne veulent voir QUE le premier.
   Sans cette ligne, `evilSeek` prenait la priorité sur `engineer`/`mayor`/
   `timberOrder` dans chacun d'eux — dix échecs, tous à côté de leur vraie
   question. `evilFound` est justement conçu pour ça : un fait du monde, pas une
   confidence par joueur (voir la note de `e.evilFound`, quete.js), donc une
   seule ligne suffit à le poser pour tout le scénario. */
const findSisters = (e, t = 1) => {
  const r = Q.resolveStarSpot(e, "banc", t, "banc").ok && Q.resolveStarTrack(e, "banc", t, "banc").ok;
  Q.resolveStarEvilFound(e, t);
  return r;
};
const queenReady = (e, who, t) => {
  Q.resolveStarCandy(e, who, Q.starOfferPrice("crater"), t, 0);
  const fed = Q.resolveStarLight(e, who, "crater", 999, t);
  const woke = Q.resolveStarWake(e, who, "crater", t);
  return fed.ok && woke.ok;
};

/* ═══════════════════════════════════════════════════════════════════════════
   1. LA CHAÎNE DES CHAPITRES. ⚠️ TROIS DEPUIS LE 469, ET LE DERNIER N'A PLUS DE
   `need` : ce qui le ferme est un CHANTIER (les cinq pièces de Tristan), pas une
   trouvaille. Le garde du 442 tient toujours — `starAdvance` s'arrête avant un
   chapitre `final`, donc une liste vide ne peut pas le refermer toute seule, et
   c'est très exactement ce que le premier contrôle de ce bloc mesure.
   ═══════════════════════════════════════════════════════════════════════════ */
section("La chaîne des chapitres");
{
  const e = Q.newStar();
  ok("une quête neuve n'est pas tombée", !Q.starFallen(e) && !Q.starStarted(e) && !Q.starDone(e));
  ok("…et son premier chapitre est le champ", Q.starChapterKey(e) === "field");

  const r = Q.devStar(Q.newStar(), "all", 1000);
  const e2 = r.star;
  ok("« tout sauf la fin » franchit tous les chapitres sauf le dernier",
     e2.ch === Q.STAR_CH_DONE - 1, `chapitre ${e2.ch}/${Q.STAR_CH_DONE - 1}`);
  ok("…et il ne saute aucun lieu",
     Q.STAR_SITES.every(s => Q.starHas(e2, s.id)),
     Q.STAR_SITES.filter(s => !Q.starHas(e2, s.id)).map(s => s.id).join(",") || "aucun manquant");
  /* ⚠️ ZIP 453 — LE COMPTE EST CELUI DU NAVIRE, ET C'EST LE SEUL. Ce contrôle
     lisait `starShards` (quatre « notes ») : il était vert pendant que le
     bateau, lui, montrait cinq emplacements. Un banc qui mesure la liste que le
     joueur ne regarde pas ne peut pas voir la contradiction.
     ⚠️ ZIP 469 — IL EN ATTEND MAINTENANT CINQ SUR CINQ : le raccourci donne aussi
     tout le bois, et les quatre morceaux qui attendaient un lieu supprimé ne
     dépendent plus que de lui. */
  ok("…les cinq morceaux du navire sont posés",
     Q.starShipBuilt(e2) === Q.STAR_SHIP_TOTAL, `${Q.starShipBuilt(e2)}/${Q.STAR_SHIP_TOTAL}`);
  /* ⚠️⚠️ ZIP 469 — LE CONTRÔLE QUI REMPLACE « IL S'ARRÊTE AVANT LE CHANT », ET IL
     MESURE LA MÊME CHOSE PAR L'AUTRE BOUT : le raccourci ne doit pas TERMINER la
     quête. Ce qui l'en empêche n'est plus un lieu qu'il saute (il n'y en a plus)
     mais le fait que `resolveStarGift` ne soit appelé nulle part — la fin se JOUE,
     elle ne s'accumule pas. Sans ce contrôle, le jour où le raccourci appellerait
     le don par mégarde, on perdrait la seule scène de la quête sans rien casser. */
  ok("⚠️ …et il ne TERMINE PAS la quête (la fin se joue, elle ne s'accumule pas)",
     !Q.starDone(e2) && !e2.doneAt);

  /* ⚠️ LA BASCULE EST UNE BOUCLE, PAS UN `if` : un joueur peut fermer DEUX
     chapitres avec une seule trouvaille (celle qui manquait au 4 alors que le 3
     était complet depuis dix minutes). Écrite en simple test, la fonction
     avancerait d'un cran par découverte et le pisteur réclamerait un objet déjà
     trouvé. On le mesure en donnant tout dans le DÉSORDRE. */
  {
    const e3 = Q.newStar(); e3.fall = 1;
    /* ⚠️ ZIP 469 — SIX LIEUX SONT DEVENUS UN. Le contrôle garde tout son sens :
       on donne d'abord le chapitre 2 (le cratère), PUIS le chapitre 1, et on
       vérifie que la dernière trouvaille en franchit deux d'un coup. */
    Q.resolveStarFound(e3, "crater", "banc", 1); findSisters(e3, 1);
    const before = e3.ch;
    let cr = null;
    for (const [i, site] of Q.STAR_FARM_IMPACTS.entries())
      cr = Q.resolveStarFound(e3, site.id, "banc", 2 + i);
    ok("⚠️ une seule trouvaille peut franchir plusieurs chapitres d'un coup",
       e3.ch - before >= 2 && (cr.crossed || []).length >= 2,
       `${before} → ${e3.ch}, ${(cr.crossed || []).length} franchi(s)`);
  }
  /* ⚠️⚠️ ZIP 469 — LE VERROU D'INFORMATION CHANGE DE PORTEUR. Il mesurait `req`
     sur `lakeShard` (« on ne plonge pas avant de savoir où plonger ») ; plus aucun
     lieu ne porte de `req` depuis le déchant, donc ce contrôle ne pouvait plus
     ÉCHOUER — c'est le banc qui n'a jamais pu échouer du §10 de `CLAUDE.md`.
     Ce qui joue le même rôle aujourd'hui est la FOUILLE : on n'apprivoise pas une
     étoile qu'on n'a pas déterrée, et c'est un vrai refus, mesurable. */
  {
    const e4 = Q.newStar(); e4.fall = 1;
    const blue = Q.STAR_FARM_STAR_IDS[0];
    const r4 = Q.resolveStarCalm(e4, "j1", 1, { alone: true }, blue);
    ok("⚠️ on n'apprivoise pas une étoile qu'on n'a pas déterrée", !r4.ok && r4.unDug === true);
    Q.resolveStarDig(e4, blue, "j1", 2);
    /* ⚠️⚠️ ZIP 479 — LA FOUILLE NE SUFFIT PLUS POUR LA BLEUE, ET C'EST LE VERBE :
       elle veut sa lumière. Le contrôle mesure les DEUX portes dans l'ordre, sinon
       il dirait « ouvert » sur un trou qui refuse encore. */
    const r4b = Q.resolveStarCalm(e4, "j1", 3, { alone: true }, blue);
    ok("⚠️⚠️ ZIP 479 — …mais la fouille seule ne suffit pas : la bleue veut son offrande",
       !r4b.ok && r4b.unlit === true);
    payBlue(e4, "j1", 4);
    const r4c = Q.resolveStarCalm(e4, "j1", 5, { alone: true }, blue);
    ok("…et l'offrande faite, la posture compte enfin", r4c.ok === true);
  }
  /* Idempotence : le geste peut se répéter, il ne compte qu'une fois. */
  {
    const e5 = Q.newStar(); e5.fall = 1;
    Q.resolveStarFound(e5, "farmMaterial", "a", 1);
    const again = Q.resolveStarFound(e5, "farmMaterial", "b", 2);
    /* ⚠️ ZIP 454 — LE BOIS EST DONNÉ À LA MAIN ICI : ce qu'on mesure est
       l'idempotence de la TROUVAILLE, pas la construction. Sans lui, `starShipBuilt`
       rendrait 0 et le contrôle échouerait pour une raison qui n'est pas la sienne. */
    e5.wood.hull = { at: 1, readyAt: 1, done: true, by: "a" };
    ok("retrouver le même éclat ne le compte pas deux fois",
       again.already === true && Q.starShipBuilt(e5) === 1 && e5.found.farmMaterial.by === "a");
  }
  /* La chute ne peut pas tomber le premier jour, et elle ne rejoue jamais. */
  {
    const e6 = Q.newStar();
    /* ⚠️ ZIP 454 — LA PORTE DES DEUX HABITANTS EST OUVERTE ICI, ET FERMÉE JUSTE
       APRÈS : ce bloc mesure la DATE, le suivant mesure la porte. Mélanger les deux
       aurait donné un contrôle qui échoue pour deux raisons — c'est-à-dire un
       contrôle qui ne dit rien quand il échoue. */
    ok("la chute refuse un jour trop tôt", Q.resolveStarFall(e6, Q.STAR_FALL_MIN_DAY - 1, 5, gateCtx()).tooEarly === true);
    /* ⚠️ ZIP 455 — ELLE REFUSE AUSSI SANS ANNONCE, ET C'EST LE NOUVEAU DÉFAUT
       PRINCIPAL : sans ce contrôle, retirer par mégarde le test d'annonce rendrait
       toute la demande de Guillaume silencieusement inopérante (la comète
       retomberait « comme ça »), et les 344 autres contrôles resteraient verts. */
    ok("⚠️ …ni une chute qui n'a pas été annoncée",
       Q.resolveStarFall(e6, Q.STAR_FALL_MIN_DAY, 5, gateCtx()).unannounced === true);
    ok("…et elle s'arme au bon jour, une fois annoncée", armFall(e6).ok === true);
    ok("…et elle ne rejoue jamais", Q.resolveStarFall(e6, 9, NIGHT0 + 2, gateCtx()).already === true);
  }
  /* ⚠️⚠️ ZIP 469 — CE QUI FERME LA QUÊTE EST LE NAVIRE, ET RIEN D'AUTRE. Ce bloc
     jouait les six phrases du duo puis demandait le don. La garde `starHas(e,
     "song")` a été retirée de `resolveStarGift` en même temps que le lieu ; ce
     qu'on mesure ici est donc devenu la SEULE porte restante — un navire inachevé
     ne peut pas déclencher la fin.
     ⚠️ Le premier contrôle est le plus important des trois : sans lui, le jour où
     l'on retirerait `starShipComplete` du résolveur, la scène finale se jouerait
     sur un chantier ouvert et AUCUN autre contrôle ne le verrait. */
  {
    const eUn = Q.devStar(Q.newStar(), "all", 10).star;
    delete eUn.wood.bell;                       // une pièce manque sur la cale
    ok("⚠️ un navire inachevé ne peut pas déclencher la fin",
       Q.resolveStarGift(eUn, ["j1"], 11).unbuilt === true);

    const e7 = Q.devStar(Q.newStar(), "all", 10).star;
    ok("…et un navire fini le peut", Q.starShipComplete(e7));
    const g = Q.resolveStarGift(e7, ["j1", "j2"], 99);
    ok("le don se fait une fois, aux joueurs PRÉSENTS", g.ok && g.granted.length === 2 && e7.doneAt === 99);
    ok("…et il ne se refait pas", Q.resolveStarGift(e7, ["j1"], 100).already === true);
    ok("…et la quête est terminée", Q.starDone(e7) && e7.ch === Q.STAR_CH_DONE);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. LA REPRISE. ⚠️ TOLÉRANTE, PAS CONFIANTE : une sauvegarde ABÎMÉE ne doit
   pas faire planter le chargement d'une ferme entière pour une histoire
   secondaire.
   ═══════════════════════════════════════════════════════════════════════════ */
section("La reprise (migrateStar)");
{
  for (const [label, saved] of [
    ["absente", undefined], ["nulle", null], ["vide", {}], ["une chaîne", "bonjour"],
    ["un nombre", 42], ["un tableau", [1, 2, 3]],
    ["abîmée", { ch: "trois", found: "oui", calm: 7, dug: 3, gift: null, seen: 3, fall: "x" }],
    /* ⚠️⚠️ ZIP 469 — CELLE-CI EST DEVENUE LA PLUS UTILE DES HUIT : elle porte les
       lieux SUPPRIMÉS par le déchant (`song`, `lakeShard`, `leanLake`) ainsi que
       les trois champs retirés de l'état (`lean`, `marks`, `duet`). C'est très
       exactement la sauvegarde d'un joueur qui avait commencé la quête avant ce
       zip, et elle doit se recharger sans lever ni inventer un lieu. */
    ["d'une version d'AVANT le déchant", { ch: 4, found: { furrow: { by: "a", at: 1 }, song: { by: "b", at: 2 },
        lakeShard: { by: "b", at: 3 }, leanLake: { by: "b", at: 4 }, inconnu: { by: "c", at: 5 } },
        marks: ["leanLake"], lean: { j1: { x: 2, y: 3, at: 9 } }, duet: 6 }],
  ]) {
    let e = null, threw = null;
    try { e = Q.migrateStar(saved); } catch (err) { threw = err; }
    ok(`sauvegarde ${label} : rien ne lève`, !threw, threw ? String(threw.message) : "");
    if (e) {
      ok(`sauvegarde ${label} : l'objet est complet`,
         ["ch", "found", "fall", "calm", "dug", "gift", "seen", "doneAt"].every(k => e[k] !== undefined));
      ok(`sauvegarde ${label} : le chapitre reste dans les bornes`, e.ch >= 0 && e.ch <= Q.STAR_CH_DONE, String(e.ch));
      ok(`sauvegarde ${label} : aucun lieu inconnu n'entre`, Object.keys(e.found).every(id => !!Q.STAR_SITE[id]));
      /* ⚠️ ZIP 469 — LES TROIS CHAMPS SUPPRIMÉS NE DOIVENT PAS SURVIVRE À LA
         MIGRATION. Une sauvegarde qui les porte les traînerait sinon dans chaque
         `apply` jusqu'à la fin des temps — c'est-à-dire des octets pour rien, le
         champ `sit` du 432 en plus discret. */
      ok(`sauvegarde ${label} : les champs du chant ne reviennent pas`,
         e.lean === undefined && e.marks === undefined && e.duet === undefined);
      ok(`sauvegarde ${label} : aucun cratère inconnu n'est marqué fouillé`,
         Object.keys(e.dug).every(id => !!Q.STAR_SITE[id]));
    }
  }
  /* ⚠️ UNE SAUVEGARDE DU 442 N'EST PAS MIGRÉE VERS CELLE-CI : deux histoires
     différentes, pas deux versions de la même. Le champ est simplement ignoré. */
  const e442 = Q.migrateStar({ enquete: { ch: 4, found: { borne: 1 } } });
  ok("⚠️ une sauvegarde de l'enquête (442) donne une quête NEUVE", !Q.starStarted(e442) && !Q.starFallen(e442));
  /* ╔═════════════════════════════════════════════════════════════════════════
     ║ ZIP 469 — UN CRATÈRE TROUVÉ AVANT LA FOUILLE EST FOUILLÉ.
     ╚═════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ SANS CETTE MIGRATION, UNE PARTIE EN COURS RENVERRAIT GRATTER CINQ TROUS
     DÉJÀ VIDÉS — et pire, `starNearby` proposerait « fouiller » sur un cratère
     dont le pisteur dit qu'il est fait. Le contrôle mesure la DÉRIVATION, pas le
     champ : c'est `found` qui décide, `dug` en découle. */
  {
    const idBlue = Q.STAR_FARM_STAR_IDS[0];
    const eOld = Q.migrateStar({ ch: 1, fall: 5, found: { [idBlue]: { by: "a", at: 6 } } });
    ok("⚠️ une sauvegarde d'avant la fouille marque ses cratères comme fouillés",
       Q.starDug(eOld, idBlue) === true);
    ok("…et le compte restant le dit", Q.starDigLeft(eOld) === 0,
       `${Q.starDigLeft(eOld)} restant(s)`);   // ch:1 coche les cinq impacts (compat 461)
  }
  /* ╔═════════════════════════════════════════════════════════════════════════
     ║ ZIP 472 (audit) — LA FERMETURE DU CHAPITRE 1 NE DOIT PAS FAIRE TOMBER LE
     ║ MÉTÉORE DE VILLE TOUTE SEULE.
     ╚═════════════════════════════════════════════════════════════════════════
     ⚠️⚠️⚠️ `(saved.ch | 0) > 0` DEVIENT VRAI DÈS QUE LES CINQ IMPACTS DE FERME
     SONT TROUVÉS — avant ce correctif, la ligne de compatibilité du 462 lisait
     ça comme « une vieille sauvegarde qui avait déjà son cratère » et posait
     `e.townFall = e.fall`, sautant les deux minutes de présence active que
     `starTownActivityTick` est censé compter. REJOUÉ AVEC LE VRAI CYCLE DE
     VIE : l'hôte re-migre `s2.star` À CHAQUE REQUÊTE, donc on migre après
     CHAQUE trouvaille et pas une seule fois à la fin — sans ça, ce contrôle
     ne pourrait pas voir le défaut qu'il vérifie (leçon du 469). `who` est un
     UUID de 36 signes, comme un vrai `profile_id` Supabase, jamais `"j1"`
     (même leçon, onzième forme). */
  {
    const uuid = "3fa0c1e2-9b7a-4c2d-8e3f-6a1b2c3d4e5f";
    let e = Q.migrateStar(undefined);           // une partie neuve, comme au tout premier chargement
    armFall(e);                                 // les cinq impacts n'existent qu'une fois la chute armée
    e = Q.migrateStar(e);
    const fallAt = e.fall;
    for (const [i, site] of Q.STAR_FARM_IMPACTS.entries()) {
      Q.resolveStarFound(e, site.id, uuid, fallAt + 1000 + i);
      e = Q.migrateStar(e);                      // l'hôte re-migre après CHAQUE requête
    }
    ok("⚠️⚠️⚠️ les cinq impacts de ferme trouvés ferment le chapitre 1", e.ch === 1, `ch=${e.ch}`);
    ok("⚠️⚠️⚠️ …et le météore de ville N'EST PAS tombé tout seul", e.townFall === 0, `townFall=${e.townFall}`);
    for (let i = 0; i < 5; i++) e = Q.migrateStar(e);   // le battement d'une seconde re-migre aussi
    ok("…même rejoué plusieurs secondes sans que personne n'aille en ville", e.townFall === 0, `townFall=${e.townFall}`);
    const r = Q.resolveStarTownFall(e, fallAt + 500000);
    ok("…et le vrai déclencheur (deux minutes de présence) fonctionne toujours",
       r.ok && e.townFall === fallAt + 500000, `ok=${r.ok} townFall=${e.townFall}`);
  }
  /* ⚠️ ET LA COMPATIBILITÉ D'AVANT LE 462 TIENT TOUJOURS : une sauvegarde qui
     n'a JAMAIS connu `townFall` (le champ est ABSENT, pas à 0) doit encore
     hériter du cratère existant. C'est la PRÉSENCE du champ que la migration
     mesure désormais, jamais `ch` seul — voir `legacyPreTownFall`. */
  {
    const legacy = { ch: 1, fall: 42, found: { crater: { by: "a", at: 50 } } };
    ok("⚠️ le témoin n'a PAS de champ townFall (comme avant le 462)", !("townFall" in legacy));
    const e = Q.migrateStar(legacy);
    ok("…et elle hérite bien du cratère existant", e.townFall === 42, `townFall=${e.townFall}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. LE PLACEMENT DÉRIVÉ. ⚠️ AUCUN LIEU NE PORTE DE COORDONNÉES EN DUR (§4 de
   quete.js) : on vérifie que ce que le générateur donne est libre, praticable,
   ATTEIGNABLE par le vrai A* piéton, et distinct de ce qui était déjà là.
   ═══════════════════════════════════════════════════════════════════════════ */
section("Le placement des lieux");
const tw = E.generateTownWorld();
const W = tw.w, H = tw.h, idx = (x, y) => y * W + x;
const nav = E.townNav(tw);
const walkable = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !!nav.walk[idx(x, y)];

/* Le cratère : on rejoue EXACTEMENT le balayage du jeu (`starSpiralFree` +
   `discFree`), donc on pose la même pierre. Réinventer la recherche ici serait
   « repeindre au lieu d'appeler » — le champ de bois de render-parc (440). */
const craterPos = (() => {
  const open = (x, y) => {
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return false;
    const i = idx(x, y), g = tw.ground[i];
    return (g === C.G_GRASS || g === C.G_TOWN_LAWN) && !tw.solid[i] && !tw.hedge[i];
  };
  const r = Math.ceil(C.STAR_CRATER_DRAW_R);
  const discFree = (x, y) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > C.STAR_CRATER_DRAW_R * C.STAR_CRATER_DRAW_R) continue;
      if (!open(x + dx, y + dy)) return false;
    }
    return true;
  };
  return Q.starSpiralFree(C.STAR_CRATER_X, C.STAR_CRATER_Y, discFree, 20);
})();
ok("le cratère trouve une place", !!craterPos, craterPos ? `(${craterPos.x},${craterPos.y})` : "AUCUNE");
if (craterPos) {
  ok("…et il est praticable", walkable(craterPos.x, craterPos.y));
  /* ⚠️ IL EST DANS LE PRÉ, PAS SUR LA PLACE, et ce contrôle existe parce que le
     premier jet du 444 l'a posé sous l'obélisque : ancré au champ de foire, le
     générateur en était parfaitement content. « La case d'un décor n'est pas la
     surface qu'il couvre » — on mesure donc le DISQUE entier. */
  let bad = 0, tot = 0;
  const rr = Math.ceil(C.STAR_CRATER_DRAW_R);
  for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
    if (dx * dx + dy * dy > C.STAR_CRATER_DRAW_R * C.STAR_CRATER_DRAW_R) continue;
    tot++;
    const i = idx(craterPos.x + dx, craterPos.y + dy);
    const g = tw.ground[i];
    if (g !== C.G_GRASS && g !== C.G_TOWN_LAWN) bad++;
    else if (tw.solid[i] || tw.hedge[i]) bad++;
  }
  ok("⚠️ tout son DISQUE est de l'herbe libre (pas seulement sa case)", bad === 0, `${tot - bad}/${tot} cases`);
  /* Et il ne tombe pas sur un décor existant : le générateur seme ses props
     APRÈS, donc c'est bien la question qu'il faut poser. */
  const onProp = (tw.props || []).filter(p => Math.hypot(p.x - craterPos.x, p.y - craterPos.y) <= C.STAR_CRATER_DRAW_R).length;
  ok("…et aucun décor de la ville n'est dessous", onProp === 0, `${onProp} décor(s)`);
}

/* Les trois autres lieux de ville : le ponton, la verrerie, le nid. Ils sont
   posés par le générateur ; on vérifie qu'un piéton parti de la descente du
   train les atteint VRAIMENT (le vrai A*, pas une distance à vol d'oiseau). */
{
  const from = [Math.round(C.TOWN_SPAWN.x), Math.round(C.TOWN_SPAWN.y)];
  const near = (x, y) => {
    for (const [dx, dy] of [[0, 0], [0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1], [0, 2], [2, 0], [0, -2], [-2, 0]])
      if (walkable(x + dx, y + dy)) return [x + dx, y + dy];
    return null;
  };
  const targets = [["le ponton", C.STAR_PIER_X, C.STAR_PIER_Y]];
  for (const kind of ["starRack", "starNestTree", "starKiln", "starShutter"]) {
    const p = (tw.props || []).find(p2 => p2.kind === kind);
    ok(`le décor « ${kind} » est posé`, !!p, p ? `(${p.x},${p.y})` : "ABSENT");
    if (p && (kind === "starRack" || kind === "starNestTree")) targets.push([kind, p.x, p.y]);
  }
  if (craterPos) targets.push(["le cratère", craterPos.x, craterPos.y]);
  for (const [label, tx, ty] of targets) {
    const a = near(from[0], from[1]), b = near(tx, ty);
    const pth = a && b ? E.townFindPath(tw, a[0], a[1], b[0], b[1], 200000) : null;
    ok(`${label} s'atteint à pied depuis le train`, !!pth && pth.length > 0, pth ? `${pth.length} pas` : "AUCUN CHEMIN");
  }
}

/* 461 — les cinq ancrages de ferme sont publics et espacés. Le placement réel
   peut glisser autour d'eux pour éviter un arbre, mais il ne doit pas partir
   d'une grappe que le joueur viderait en trente secondes. */
{
  // 480 bis — trois chutes de plus (demande de Guillaume), dont l'étoile
  // blanche : 5 → 8 impacts, 2 → 3 étoiles.
  ok("la ferme porte exactement huit impacts", Q.STAR_FARM_IMPACTS.length === 8, `${Q.STAR_FARM_IMPACTS.length}`);
  const counts = Object.fromEntries(["star", "material", "empty"].map(k => [k, Q.STAR_FARM_IMPACTS.filter(s => s.content === k).length]));
  ok("…trois étoiles, deux matières, trois fonds vides",
     counts.star === 3 && counts.material === 2 && counts.empty === 3,
     `${counts.star}/${counts.material}/${counts.empty}`);
  ok("les trois petites étoiles ont des couleurs distinctes",
     new Set(Q.STAR_FARM_IMPACTS.filter(s => s.content === "star").map(s => s.color)).size === 3);
  ok("les huit ancrages tiennent dans la carte",
     C.STAR_FARM_IMPACT_ANCHORS.length === 8 && C.STAR_FARM_IMPACT_ANCHORS.every(p => p.x >= 4 && p.x < C.MAP_W - 4 && p.y >= 4 && p.y < C.MAP_H - 4));
  ok("⚠️ deux impacts élargissent vraiment la chasse à l'est de la rivière",
     C.STAR_FARM_IMPACT_ANCHORS.slice(3, 5).every(p => p.x > 120),
     C.STAR_FARM_IMPACT_ANCHORS.slice(3, 5).map(p => `(${p.x},${p.y})`).join(" · "));
  let minD = Infinity;
  for (let i = 0; i < C.STAR_FARM_IMPACT_ANCHORS.length; i++) for (let j = i + 1; j < C.STAR_FARM_IMPACT_ANCHORS.length; j++)
    minD = Math.min(minD, Math.hypot(C.STAR_FARM_IMPACT_ANCHORS[i].x - C.STAR_FARM_IMPACT_ANCHORS[j].x,
                                    C.STAR_FARM_IMPACT_ANCHORS[i].y - C.STAR_FARM_IMPACT_ANCHORS[j].y));
  ok("⚠️ les impacts sont vraiment dispersés", minD >= 18, `écart minimal ${minD.toFixed(1)} cases`);
  ok("⚠️ le premier retour fermier dure exactement dix secondes avant le plan suivant",
     Q.STAR_FARM_CAMERA[2].to === 6500 && Q.STAR_FARM_CAMERA[3].from - Q.STAR_FARM_CAMERA[2].to === 10000);
  ok("⚠️ les impacts 2 et 3 s'enchaînent sans retour fermier entre eux",
     Q.STAR_FARM_CAMERA.some(s => s.a === 1 && s.b === 2)
     && !Q.STAR_FARM_CAMERA.some(s => s.from > Q.STAR_FARM_IMPACT_MS[1] && s.to < Q.STAR_FARM_IMPACT_MS[2] && s.b === "player"));
  ok("⚠️ seuls les trois premiers fragments ont un vol filmé",
     [0, 1, 2].every(i => Q.starFarmFlight(Q.STAR_FARM_IMPACT_MS[i] - 1)?.impact === i)
     && [3, 4, 5, 6, 7].every(i => Q.starFarmFlight(Q.STAR_FARM_IMPACT_MS[i] - 1) === null));
  /* 464 — Régulier ne veut pas dire identique : chaque chute garde un azimut
     légèrement différent, mais CET azimut ne bouge jamais pendant son vol. La
     rotation visible est mesurée séparément par `render-etoile` sur le sprite. */
  let pathMono = true, headingStable = true;
  for (let i = 0; i < Q.STAR_FARM_ANIMATED_N; i++) {
    const a0 = Q.starFarmFlightPath(i, 0).angle;
    let prev = -1;
    for (let n = 0; n <= 200; n++) {
      const p = Q.starFarmFlightPath(i, n / 200);
      if (p.travel < prev - 1e-12) pathMono = false;
      if (Math.abs(p.angle - a0) > 1e-12) headingStable = false;
      prev = p.travel;
    }
  }
  ok("⚠️⚠️ chaque fragment garde un cap fixe pendant tout son vol", headingStable);
  ok("…et il avance continûment vers l'impact, sans retour", pathMono
     && Q.starFarmFlightPath(0, 0).travel === 0 && Q.starFarmFlightPath(0, 1).travel === 1);
  ok("…sans rendre les trois chutes strictement superposables",
     new Set(Q.STAR_FARM_FLIGHT_ANGLES).size === Q.STAR_FARM_ANIMATED_N
     && Math.max(...Q.STAR_FARM_FLIGHT_ANGLES) - Math.min(...Q.STAR_FARM_FLIGHT_ANGLES) < 0.08);
  ok("…les deux derniers existent bien comme secousses espacées",
     Q.starFarmShake(Q.STAR_FARM_IMPACT_MS[3] + 200) > 0
     && Q.starFarmShake(Q.STAR_FARM_IMPACT_MS[4] + 200) > 0
     && Q.STAR_FARM_IMPACT_MS[4] - Q.STAR_FARM_IMPACT_MS[3] >= 3000);
  ok("la présence active requise à Valley Town vaut exactement deux minutes", Q.STAR_TOWN_ACTIVE_MS === 120000);
  {
    const e = Q.newStar(); e.fall = 1;
    ok("le gros météore refuse de tomber avant les huit sites", !Q.resolveStarTownFall(e, 2).ok);
    findFarmImpacts(e, "banc", 3);
    ok("le compteur urbain n'existe que pendant le chapitre du cratère", Q.starTownWaiting(e));
    const a = { fall: 0, at: 0, ms: 0 };
    let now = 1000;
    Q.starTownActivityStep(a, e, now, true);
    for (let i = 0; i < 60; i++) Q.starTownActivityStep(a, e, now += 1000, true);
    const beforePause = a.ms;
    for (let i = 0; i < 30; i++) Q.starTownActivityStep(a, e, now += 1000, false);
    ok("⚠️ l'inactivité met le compteur urbain en pause sans effacer son cumul",
       beforePause === 60000 && a.ms === beforePause);
    for (let i = 0; i < 60; i++) Q.starTownActivityStep(a, e, now += 1000, true);
    ok("…et deux plages actives séparées atteignent bien les deux minutes", a.ms === Q.STAR_TOWN_ACTIVE_MS);
    const seenA = Q.starFallSeenStorageKey("townFall", 123, "joueur-a");
    const seenB = Q.starFallSeenStorageKey("townFall", 123, "joueur-b");
    ok("⚠️ deux joueurs d'un même navigateur ont des marques de chute distinctes",
       seenA !== seenB && seenA === Q.starFallSeenStorageKey("townFall", 123, "joueur-a"));
    const craterChapter = e.ch;
    e.ch = 2;
    Q.starTownActivityStep(a, e, now += 1000, true);
    ok("⚠️ une avance dev vers le chantier ne garde pas l'ancien compteur", !Q.starTownWaiting(e) && a.ms === 0);
    e.ch = craterChapter;
    ok("…puis tombe une seule fois quand le chapitre ferme", Q.resolveStarTownFall(e, 20).ok && Q.starTownFallen(e));
    ok("…et le compteur disparaît dès la chute", !Q.starTownWaiting(e));
    ok("…et ne peut pas être redaté", Q.resolveStarTownFall(e, 30).already === true && e.townFall === 20);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. ⚠️⚠️ LES FENÊTRES SOLO, REJOUÉES. C'EST LE CONTRÔLE LE PLUS IMPORTANT DU
   BANC, ET IL EST ÉCRIT CONTRE LA LEÇON DE TÊTE DE CLAUDE.md : un banc qui
   mesure la carte au lieu de l'interaction passe au vert pendant que le geste
   est impossible. On rejoue donc le TRAJET, image par image, à la vraie vitesse
   de course, avec la vraie collision.
   ⚠️ ET IL ÉCHOUE DANS LES DEUX SENS. Une fenêtre trop courte rend le geste
   impossible ; une fenêtre trop large ne demande plus rien, et une mécanique qui
   ne demande rien est morte sans que personne ne s'en aperçoive. Les deux sont
   des défauts, donc les deux sont des échecs.
   ═══════════════════════════════════════════════════════════════════════════ */
section("Les fenêtres solo, rejouées image par image");
/* « Où l'on peut se tenir », UNE seule définition pour tout ce fichier — le
   beffroi la réutilise plus bas. Deux écritures de la même règle donnent un banc
   qui échoue sur du bon travail (payé au premier jet : « 64 cases atteintes sur
   56 » sur un beffroi parfaitement sain). */
const stands0 = (t) => t !== undefined && t !== C.CT_VOID && t !== C.CT_WALL && t !== C.CT_WINDOW && t !== C.CT_BARS;
{
  const DT = 1 / 60;
  /* ⚠️⚠️ DEUX VITESSES, ET C'EST CE QUI REND LA MESURE BILATÉRALE HONNÊTE.
     « Est-ce TENABLE ? » se demande à celui qui COURT : un joueur qui se dépêche
     doit réussir, toujours. « Est-ce que ça DEMANDE quelque chose ? » se demande
     à celui qui MARCHE : la course est un bonus, pas une exigence, et une
     fenêtre qu'on tient en flânant ne demande rien. Une seule vitesse pour les
     deux bornes aurait donné un banc qui dit oui aux deux ou non aux deux. */
  const RUN = C.PLAYER_SPEED * C.TOWN_SPEED_MULT * C.RUN_SPEED_MULT;
  const WALK = C.PLAYER_SPEED * C.TOWN_SPEED_MULT;
  /* Le meilleur temps possible d'un trajet, en suivant le VRAI chemin piéton
     case par case. On ne triche pas en diagonale : le chemin est celui que le
     jeu emprunterait. */
  const travelMs = (ax, ay, bx, by, speed) => {
    const pth = E.townFindPath(tw, ax, ay, bx, by, 200000);
    if (!pth || !pth.length) return Infinity;
    let d = 0, px = ax + 0.5, py = ay + 0.5;
    for (const p of pth) { d += Math.hypot(p.x - px, p.y - py); px = p.x; py = p.y; }
    let t = 0;
    for (let travelled = 0; travelled < d; travelled += speed * DT) t += DT * 1000;   // vraiment image par image
    return t;
  };
  /* ⚠️⚠️⚠️ ZIP 469 — LES DEUX FENÊTRES MESURÉES ICI N'EXISTENT PLUS, ET C'EST LA
     PLUS GROSSE COUPE DE CE BANC. Elles rejouaient, image par image et sur la vraie
     carte : (1) le trajet du croisement d'ombres, 45 cases en 26 s, (2) le trajet
     banc d'orgue → beffroi du duo, à travers les cages d'escalier de l'église.
     Les deux mécaniques sont supprimées par le déchant.
     ⚠️ CE QU'ON PERD, ET IL FAUT LE DIRE : ce bloc était le SEUL du dépôt qui
     mesurât une fenêtre de temps contre un TRAJET RÉEL, et c'est lui qui avait fait
     tomber « 70 s » à 26 s au 449 en montrant que la fenêtre ne demandait rien. La
     méthode reste écrite dans le chapeau du §4 ci-dessus — elle attend le premier
     geste chronométré de la refonte pour resservir. `travelMs`, `stands0`, `RUN` et
     `WALK` sont conservés pour ça, et le §« Le beffroi » les utilise encore.
     ⚠️ *On ne garde pas un contrôle qui ne peut plus échouer* (§10 de `CLAUDE.md`) :
     laissé en place avec `STAR_LEAN_SOLO_WINDOW_MS` devenue `undefined`, il aurait
     comparé des `NaN` — c'est-à-dire qu'il aurait échoué en disant n'importe quoi. */
  /* 461 — le barème est la règle de conception elle-même : une minute seul,
     dix secondes dès qu'un second joueur se trouve dans la zone. */
  ok("⚠️ la tenue solo du cratère est plus longue qu'à deux",
     Q.STAR_CALM_SOLO_MS > Q.STAR_CALM_MS, `${Q.STAR_CALM_SOLO_MS} ms contre ${Q.STAR_CALM_MS} ms`);
  /* ⚠️ ZIP 478 — 30 s / 10 s (décision de Guillaume). Le contrôle garde sa forme :
     il fige le barème pour qu'un réglage distrait se voie, et il vérifie que
     l'ÉCART reste assez grand pour que le raccourci à deux se remarque — trois fois
     plus court, c'est ce qui fait qu'on le sent sans qu'on l'explique. */
  ok("…et vaut exactement trente secondes seul, dix secondes à plusieurs",
     Q.STAR_CALM_SOLO_MS === 30000 && Q.STAR_CALM_MS === 10000);
  ok("…et le raccourci à deux reste franc (au moins trois fois plus court)",
     Q.STAR_CALM_SOLO_MS >= Q.STAR_CALM_MS * 3,
     `${Q.STAR_CALM_SOLO_MS / 1000} s contre ${Q.STAR_CALM_MS / 1000} s`);
  /* 462 — le blocage signalé concernait précisément les DEUX étoiles de ferme,
     pas seulement la reine historique. On joue chacune jusqu'au dernier paquet
     au lieu d'extrapoler les tests du cratère. */
  /* ⚠️⚠️ ZIP 479 — LA POSTURE N'APPARTIENT PLUS QU'À LA BLEUE. Ce bloc balayait
     « toutes les étoiles de ferme » ; il balaie maintenant celles dont le VERBE est
     la posture, et il y en a une. Le balayage reste (c'est ce qui fait qu'une
     quatrième étoile en `light` serait couverte gratuitement), la LISTE change de
     source : `verb`, plus `content`. */
  for (const site of Q.STAR_FARM_IMPACTS.filter(s => s.verb === "light")) {
    const e = Q.newStar(); e.fall = 1;
    /* ⚠️ ZIP 469 — ON FOUILLE D'ABORD. `resolveStarCalm` refuse une étoile qu'on
       n'a pas déterrée : sans cette ligne, ce contrôle échouerait pour une raison
       qui n'est pas la sienne — c'est le défaut « un contrôle qui échoue pour deux
       raisons ne dit rien quand il échoue », déjà écrit deux fois dans ce fichier. */
    Q.resolveStarDig(e, site.id, "j1", 900);
    payBlue(e, "j1", 950);                          // 479 — et on paie sa lumière
    let t = 1000;
    for (let k = 0; k < 130 && !Q.starHas(e, site.id); k++) {
      t += 500; Q.resolveStarCalm(e, "j1", t, { alone: true }, site.id);
    }
    ok(`⚠️⚠️ la jauge solo retire vraiment l'étoile ${site.id}`, Q.starHas(e, site.id), `${((t - 1000) / 1000).toFixed(1)} s`);
  }
  {
    const site = Q.STAR_SITE[Q.STAR_LIGHT_SITE], e = Q.newStar(); e.fall = 1;
    Q.resolveStarDig(e, site.id, "j1", 900);       // 469 — voir juste au-dessus
    payBlue(e, "j1", 950);                          // 479 — voir juste au-dessus
    let t = 1000;
    for (let k = 0; k < 30 && !Q.starHas(e, site.id); k++) {
      t += 400;
      Q.resolveStarCalm(e, "j1", t, { alone: false }, site.id);
      Q.resolveStarCalm(e, "j2", t, { alone: false }, site.id);
    }
    ok("⚠️⚠️ à deux, la jauge courte retire vraiment une étoile de ferme", Q.starHas(e, site.id), `${((t - 1000) / 1000).toFixed(1)} s`);
  }
  /* ── ZIP 446 — LE REFROIDISSEMENT, ET C'EST UNE PORTE, PAS UN EFFET.
     ⚠️⚠️ CE BLOC EXISTE PARCE QU'AUCUN BANC NE JOUAIT `resolveStarCalm` : la
     mécanique centrale du chapitre 2 n'était vérifiée nulle part, on ne mesurait
     que ses CONSTANTES. C'est le premier visage du défaut de CLAUDE.md — *il
     mesure la carte, pas l'interaction* — et il aura tenu deux zips. */
  {
    const e = Q.devStar(Q.newStar(), "start", 1).star;
    const t0 = openTownCrater(e, e.fall + 10);
    ok("⚠️ tant que ça fume, la tenue ne donne RIEN",
       !Q.resolveStarCalm(e, "j1", t0 + 1000, true).ok && !Q.starHas(e, "crater"));
    ok("…et le refus n'a rien consommé (on ne se tient pas tranquille pour rien)",
       Object.keys(e.calm).length === 0);
    ok("…une seconde avant la fin, toujours rien",
       !Q.resolveStarCalm(e, "j1", t0 + Q.STAR_CRATER_COOL_MS - 1000, true).ok);
    /* Refroidi : la tenue redevient possible, et elle demande VRAIMENT la durée. */
    const t1 = t0 + Q.STAR_CRATER_COOL_MS + 500;
    ok("⚠️ (lot A) refroidie, elle se nourrit et se réveille — dans cet ordre", queenReady(e, "j1", t1));
    ok("⚠️ une fois froid, la tenue recommence à compter", !!Q.resolveStarCalm(e, "j1", t1, true).ok);
    ok("…mais pas d'un coup", !Q.starHas(e, "crater"));
    Q.resolveStarCalm(e, "j1", t1 + Q.STAR_CALM_SOLO_MS * 0.5, true);
    ok("…ni à la moitié", !Q.starHas(e, "crater"));
    /* ⚠️ ET LA TENUE INTERROMPUE NE COMPTE PAS : marteler ne doit pas suffire. */
    Q.resolveStarCalm(e, "j1", t1 + Q.STAR_CALM_SOLO_MS * 0.5 + 4000, true);
    Q.resolveStarCalm(e, "j1", t1 + Q.STAR_CALM_SOLO_MS * 0.5 + 4200, true);
    ok("⚠️ une tenue lâchée puis reprise repart de zéro", !Q.starHas(e, "crater"));
    let t = t1 + Q.STAR_CALM_SOLO_MS * 0.5 + 4200;
    for (let k = 0; k < 130 && !Q.starHas(e, "crater"); k++) { t += 500; Q.resolveStarCalm(e, "j1", t, true); }
    ok("⚠️ et en se tenant vraiment tranquille, elle sort", Q.starHas(e, "crater"),
       `${((t - (t1 + Q.STAR_CALM_SOLO_MS * 0.5 + 4200)) / 1000).toFixed(1)} s de tenue`);
    /* ── LA CHALEUR, LA COURBE QU'ON VOIT. Trois bornes, et la troisième est
       celle du modèle : le cratère refroidi FUME ENCORE tant que l'étoile est
       dedans, et il s'éteint quand elle en sort. */
    const e2 = Q.devStar(Q.newStar(), "start", 1).star; openTownCrater(e2, e2.fall + 10);
    const h0 = Q.starCraterHeat(e2, 0), hM = Q.starCraterHeat(e2, Q.STAR_CRATER_COOL_MS / 2);
    const hE = Q.starCraterHeat(e2, Q.STAR_CRATER_COOL_MS * 3);
    ok("à l'instant de la chute, la chaleur est pleine", Math.abs(h0 - 1) < 0.001, h0.toFixed(2));
    ok("⚠️ elle retombe VITE au début (ça fume fort, puis ça traîne)", hM < 0.55, `${hM.toFixed(2)} à mi-course`);
    ok("⚠️ mais elle ne tombe jamais à zéro tant que l'étoile est au fond",
       hE > 0.05 && Math.abs(hE - Q.STAR_CRATER_EMBER) < 0.001, hE.toFixed(2));
    Q.resolveStarFound(e2, "crater", "banc", 9); findSisters(e2, 9);
    ok("⚠️⚠️ …et elle s'éteint le jour où on la sort", Q.starCraterHeat(e2, 10) === 0);
    ok("une quête pas encore tombée n'a pas de cratère chaud", Q.starCraterHeat(Q.newStar(), 10) === 0);
  }
  /* ── ZIP 449 — LA BRÛLURE, ET C'EST UN CONTRÔLE DE TEMPS AVANT D'ÊTRE UN
     CONTRÔLE DE PLACE.
     ⚠️⚠️ IL EXISTE PARCE QUE LE 448 A MONTRÉ QU'UN BANC DE RENDU NE PEUT PAS
     VOIR UN DÉFAUT DE TEMPS : sept contrôles regardaient déjà ce cratère (forme,
     profondeur, deux rayons, refroidissement, fumée, enfoncement) et aucun ne
     demandait QUAND. `render-etoile` mesure la moitié GÉOMÉTRIE de la brûlure
     (où elle mord) ; celui-ci mesure la moitié CHRONOLOGIE (quand), et la
     dernière ligne du bloc vérifie que les deux moitiés ne se sont pas données
     deux seuils au lieu d'un. */
  {
    const e = Q.devStar(Q.newStar(), "start", 1).star; openTownCrater(e, e.fall + 10);
    const FOND = 1, MILIEU = Q.STAR_BURN_DEPTH_K * 0.99, LEVRE = -0.2;
    ok("⚠️ au fond du trou en fusion, on brûle", Q.starCraterBurns(e, 1000, FOND));
    ok("…une seconde avant la fin du refroidissement, encore",
       Q.starCraterBurns(e, Q.STAR_CRATER_COOL_MS - 1000, FOND));
    ok("⚠️⚠️ …et plus du tout une seconde après (le seuil est celui de l'étoile)",
       !Q.starCraterBurns(e, Q.STAR_CRATER_COOL_MS + 1000, FOND));
    ok("⚠️ sur la PENTE, on ne brûle pas, même en pleine fusion (décision : le fond)",
       !Q.starCraterBurns(e, 0, MILIEU), `enfoncement ${(MILIEU * 100).toFixed(1)} % sur ${(Q.STAR_BURN_DEPTH_K * 100).toFixed(1)} % requis`);
    ok("…ni sur le bourrelet, où l'on MONTE au lieu de descendre",
       !Q.starCraterBurns(e, 0, LEVRE));
    ok("⚠️ un trou pas encore creusé ne brûle personne (quête neuve)",
       !Q.starCraterBurns(Q.newStar(), 0, FOND));
    const e3 = Q.devStar(Q.newStar(), "start", 1).star; openTownCrater(e3, e3.fall + 10);
    Q.resolveStarFound(e3, "crater", "banc", 9); findSisters(e3, 9);
    ok("⚠️⚠️ …et le trou s'éteint le jour où l'étoile en sort : on peut y descendre",
       !Q.starCraterBurns(e3, 0, FOND));
    /* ⚠️⚠️ LA JOINTURE, ET C'EST LE SEUL CONTRÔLE DE CE BLOC QUI PROTÈGE D'UN
       DÉFAUT QU'ON NE VERRAIT JAMAIS À L'ŒIL : « ça brûle » et « elle refuse de
       sortir » doivent être la MÊME fenêtre, pas deux. Le jour où quelqu'un
       donne à la brûlure un seuil à elle, le jeu dira « c'est froid, tiens-toi
       tranquille » en brûlant quand même — défaut du 426 (« le jeu propose et
       refuse »), payé ici en dix minutes de repos forcé. */
    let dis = 0, read = 0;
    for (let t = 0; t <= Q.STAR_CRATER_COOL_MS * 2; t += 2500) {
      read++;
      if (Q.starCraterBurns(e, t, FOND) === Q.starCraterCool(e, t)) dis++;
    }
    ok("⚠️⚠️ la fenêtre qui BRÛLE est exactement celle qui RETIENT l'étoile",
       dis === 0, `${read} instants lus, ${dis} en désaccord`);
  }
  /* Et « tourner le dos » doit vouloir dire quelque chose : le contrôle porte
     sur la FONCTION PURE que le jeu et le banc partagent. */
  {
    /* Debout au sud du cratère (dy > 0), regarder le sud (dir 0) = tourner le
       dos ; regarder le nord (dir 1) = la fixer. */
    ok("dos tourné : regarder au sud quand elle est au nord", Q.starFacingAway(10, 20, 0, 10, 10));
    ok("…et la fixer ne compte pas", !Q.starFacingAway(10, 20, 1, 10, 10));
    ok("⚠️ debout SUR elle, on la regarde forcément", !Q.starFacingAway(10, 10, 0, 10, 10));
  }
  /* ⚠️ ZIP 469 — LES TROIS CONTRÔLES DU CROISEMENT D'OMBRES SONT PARTIS : la
     mécanique n'existe plus. Ils mesuraient le refus des deux lectures trop
     proches, la marque à bonne distance, et la péremption d'une lecture. */
  /* ╔═════════════════════════════════════════════════════════════════════════
     ║ ZIP 458 — AUCUNE CONFIGURATION DE JOUEURS NE PEUT BLOQUER LA QUÊTE.
     ╚═════════════════════════════════════════════════════════════════════════
     ⚠️⚠️⚠️ CE BLOC EXISTE PARCE QUE LE PIRE BLOCAGE DU DÉPÔT ÉTAIT VERT PARTOUT :
     les deux gestes coopératifs étaient joués par le banc avec le drapeau solo
     CHOISI PAR LE BANC (`true` pour le cratère, `false` pour les ombres), c'est-
     à-dire dans les deux seuls mondes où ils marchaient. Le jeu, lui, passait
     `starSoloRoom()` — « y a-t-il un autre joueur connecté » — donc un ami qui
     labourait à la ferme rendait le cratère inouvrable ET les deux croisements
     impossibles, pour toujours. *Un banc qui choisit lui-même le paramètre le
     plus commode ne mesure pas une mécanique, il mesure son propre réglage.*
     On balaie donc les DEUX valeurs sur les DEUX gestes. */
  for (const flag of [true, false]) {
    const e = Q.devStar(Q.newStar(), "start", 1).star;
    openTownCrater(e, e.fall + 10);
    let t = e.townFall + Q.STAR_CRATER_COOL_MS + 500;
    queenReady(e, "j1", t);
    /* ⚠️ ZIP 479 — LE DRAPEAU DEVIENT UN CONTEXTE, et le balayage garde son sens :
       ce qu'on mesure est qu'AUCUNE des deux valeurs ne peut bloquer le cratère.
       La boucle est allongée parce que le barème solo de la reine est passé de
       30 s à 60 s — 200 × 500 ms = 100 s, soit la marge d'avant. */
    for (let k = 0; k < 200 && !Q.starHas(e, "crater"); k++) { t += 500; Q.resolveStarCalm(e, "j1", t, { alone: flag }); }
    ok(`⚠️⚠️ le cratère s'ouvre TOUT SEUL, drapeau solo = ${flag}`, Q.starHas(e, "crater"),
       `${((t - (e.townFall + Q.STAR_CRATER_COOL_MS + 500)) / 1000).toFixed(1)} s de tenue`);
  }
  {
    /* Le raccourci à deux reste un raccourci : deux tenues simultanées ouvrent le
       trou en `STAR_CALM_MS`, c'est-à-dire bien avant le plancher solo. */
    const e = Q.devStar(Q.newStar(), "start", 1).star;
    openTownCrater(e, e.fall + 10);
    const t0 = e.townFall + Q.STAR_CRATER_COOL_MS + 500;
    /* ⚠️ UN SEUL DES DEUX PAIE, ET C'EST VOLONTAIRE : l'offrande et le réveil sont
       des états du LIEU (`e.offer`/`e.woke`), pas du joueur. Exiger que chacun
       paie ses 80 lumières aurait fait du duo une double corvée là où le §4 de
       QUETE.md en fait un raccourci. Ce contrôle le tient : `j2` tient le bord
       sans avoir rien payé, et le trou s'ouvre quand même. */
    queenReady(e, "j1", t0);
    let t = t0, opened = null;
    /* ⚠️ ZIP 479 — 60 × 400 ms = 24 s, juste au-dessus des 20 s du raccourci de la
       reine. La borne suit le barème : trop courte, elle ferait échouer le contrôle
       pour une raison qui n'est pas la sienne ; trop longue, elle laisserait passer
       un raccourci qui aurait cessé d'en être un. */
    for (let k = 0; k < 60 && !Q.starHas(e, "crater"); k++) {
      t += 400;
      /* ⚠️ ON GARDE LA RÉPONSE QUI OUVRE, PAS LA DERNIÈRE : celui des deux qui
         franchit le seuil le premier reçoit `opened`, l'autre reçoit `already`.
         Lire la dernière, c'est mesurer le perdant de la course. */
      for (const who of ["j2", "j1"]) {
        /* ⚠️ ZIP 479 — LE RACCOURCI DE LA REINE N'EST PLUS « QUELQU'UN EST EN
           LIGNE », C'EST « QUELQU'UN TIENT L'AUTRE BORD » (`partner: "player"`).
           Le contexte le dit maintenant explicitement, et c'est bien lui que
           l'hôte remplit depuis `starQueenStep`. */
        const r0 = Q.resolveStarCalm(e, who, t, { alone: false, partner: "player", mate: who === "j1" ? "j2" : "j1" });
        if (r0.opened) opened = opened || r0;
      }
    }
    ok("⚠️ à deux, le trou s'ouvre par le chemin COURT", Q.starHas(e, "crater") && !!(opened && opened.both),
       `${((t - t0) / 1000).toFixed(1)} s, soit moins que le plancher solo (${(Q.STAR_QUEEN_SOLO_MS / 1000).toFixed(1)} s)`);
    ok("…et c'est bien plus rapide que tout seul", t - t0 < Q.STAR_QUEEN_SOLO_MS);
  }
  /* ⚠️⚠️ ZIP 469 — CE QUI RESTE DU BLOC 458, ET CE QU'IL FAUT NE PAS PERDRE. Il
     mesurait DEUX gestes coopératifs (la tenue du cratère et le croisement
     d'ombres) contre la même règle : *aucune configuration de joueurs ne peut
     bloquer la quête*. Le second est supprimé ; le premier reste, juste au-dessus,
     et c'est lui qui porte désormais toute la leçon du 458.
     ⚠️ LA RÈGLE, ELLE, SURVIT AU GESTE QUI L'A PAYÉE : tout geste coopératif que
     la refonte ajoutera devra être balayé sur les DEUX valeurs de son drapeau
     solo, parce qu'un paramètre écrit en dur par le banc est une hypothèse que
     personne ne vérifie (§ « il passe lui-même le drapeau qui l'arrange »). */
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. LE BEFFROI. ⚠️ SA RAISON D'ÊTRE EST LA VUE, ET C'EST EXACTEMENT CE QU'UNE
   MESURE DE CONNEXITÉ NE VOIT PAS (leçon du 441 sur la tribune : « une tribune
   fermée par un mur reste parfaitement praticable, parfaitement connexe, et
   parfaitement vide de sens »). On mesure donc les DEUX.
   ═══════════════════════════════════════════════════════════════════════════ */
section("Le beffroi");
{
  const cw = E.generateCourtWorld();
  const CW = cw.w;
  const fl = C.COURT_FLOORS.findIndex(f => f.key === "churchTower");
  ok("le beffroi est un niveau de `COURT_FLOORS`", fl >= 0, `index ${fl}`);
  const y0 = E.courtFloorY0(fl), y1 = y0 + C.COURT_FLOOR_H - 1;
  /* ⚠️ « LE PLANCHER » N'EST PAS « LA MATIÈRE DU PLANCHER », ET LE BANC S'EST
     TROMPÉ LÀ-DESSUS AU PREMIER JET : il comptait les cases de bois et de dalle,
     puis inondait tout ce qui n'est ni mur ni vide — donc les MARCHES et le
     palier de la vis en plus, et il annonçait « 64 cases atteintes sur 56 » sur
     un beffroi parfaitement sain. Un banc qui compte deux choses différentes des
     deux côtés d'une comparaison échoue sur du bon travail, ce qui est pire
     qu'un banc qui passe sur du mauvais : on va corriger ce qui n'a rien. Les
     deux mesures partagent maintenant UNE définition, celle de `stands0`. */
  const stands = stands0;
  let floorTiles = 0, windows = 0, walls = 0;
  for (let y = y0; y <= y1; y++) for (let x = 0; x < CW; x++) {
    const t = cw.tile[y * CW + x];
    if (stands(t)) floorTiles++;
    else if (t === C.CT_WINDOW) windows++;
    else if (t === C.CT_WALL) walls++;
  }
  ok("le beffroi a un plancher", floorTiles > 20, `${floorTiles} cases`);
  ok("⚠️ …et QUATRE abat-son (c'est sa raison d'être)", windows >= 8, `${windows} cases de baie (2 par face)`);
  ok("…entourés de murs", walls > 20, `${walls} cases de mur`);
  /* Connexité INTERNE : aucune poche murée. */
  {
    let start = null;
    for (let y = y0; y <= y1 && !start; y++) for (let x = 0; x < CW; x++) {
      const t = cw.tile[y * CW + x];
      if (t === C.CT_WOOD) { start = [x, y]; break; }
    }
    const seen = new Set();
    if (start) {
      const q = [start]; seen.add(start[1] * CW + start[0]);
      while (q.length) {
        const [x, y] = q.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (ny < y0 || ny > y1 || nx < 0 || nx >= CW) continue;
          const k = ny * CW + nx;
          if (seen.has(k)) continue;
          if (!stands(cw.tile[k])) continue;
          seen.add(k); q.push([nx, ny]);
        }
      }
    }
    ok("⚠️ aucune poche murée dans le beffroi", seen.size === floorTiles, `${seen.size}/${floorTiles} cases atteintes`);
  }
  /* Le mobilier : la cloche, sa poutre, le tableau du sonneur. Un beffroi vide
     serait une chambre de pierre. */
  const propsHere = (cw.props || []).filter(p => p.y >= y0 && p.y <= y1);
  for (const kind of ["greatBell", "greatBell2", "bellFrame", "ringerBoard"])
    ok(`le beffroi porte « ${kind} »`, propsHere.some(p => p.kind === kind));
  /* ⚠️ ET LA CLOCHE NE BOUCHE PAS L'ESCALIER — c'est le refus qu'a émis le
     garde-fou des portes au premier jet, et on l'a écouté plutôt que de le
     désarmer. Le contrôle le fige. */
  {
    const bell = propsHere.find(p => p.kind === "greatBell");
    let stairNear = 0;
    if (bell) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const t = cw.tile[(bell.y + dy) * CW + bell.x + dx];
      if (t === C.CT_STAIR_UP || t === C.CT_STAIR_DOWN) stairNear++;
    }
    ok("⚠️ la cloche ne bouche aucune volée d'escalier", stairNear === 0, `${stairNear} marche(s) collée(s)`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. ⚠️⚠️ LES NIVEAUX ET LES ARRÊTS DE TÉLÉPORT, DANS LES DEUX SENS.
   C'est le contrôle qui manquait au 442 : quatre arrêts d'intérieur ont manqué
   pendant deux zips alors que le code de destination savait déjà les traiter,
   et personne ne comparait les deux listes. Ici on refuse les deux moitiés du
   défaut — un arrêt qui ne mène nulle part, et un niveau qu'aucun arrêt
   n'atteint.
   ═══════════════════════════════════════════════════════════════════════════ */
section("Les niveaux d'intérieur ↔ les arrêts du menu développeur");
{
  const stops = C.DEV_TELEPORTS.filter(d => d.zone === "court");
  ok("il y a des arrêts d'intérieur", stops.length > 0, `${stops.length} arrêts`);
  /* Sens 1 : chaque arrêt mène à un niveau qui existe. */
  const orphanStops = stops.filter(d => C.DEV_FLOOR_OF[d.key] === undefined);
  ok("⚠️ chaque arrêt d'intérieur mène à un niveau qui existe", orphanStops.length === 0,
     orphanStops.map(d => d.key).join(",") || `${stops.length}/${stops.length}`);
  /* Sens 2 : chaque niveau est atteignable par un arrêt. C'est CELUI-LÀ qui a
     coûté deux zips. */
  const reached = new Set(Object.values(C.DEV_FLOOR_OF));
  const orphanFloors = C.COURT_FLOORS.map((f, i) => [f.key, i]).filter(([, i]) => !reached.has(i));
  ok("⚠️ chaque niveau d'intérieur a son arrêt", orphanFloors.length === 0,
     orphanFloors.map(([k]) => k).join(",") || `${C.COURT_FLOORS.length}/${C.COURT_FLOORS.length}`);
  /* Et la jointure ne renvoie jamais un index hors liste. */
  const bad = Object.entries(C.DEV_FLOOR_OF).filter(([, i]) => !(i >= 0 && i < C.COURT_FLOORS.length));
  ok("aucun arrêt ne pointe hors de la liste des niveaux", bad.length === 0, bad.map(([k]) => k).join(","));
  ok("le beffroi a bien son arrêt", C.DEV_FLOOR_OF.churchTower === C.COURT_FLOORS.findIndex(f => f.key === "churchTower"));
  /* ⚠️⚠️ ET CHAQUE ARRÊT POSE LE JOUEUR SUR UNE CASE PRATICABLE, DANS SON
     NIVEAU. Ce contrôle-ci existe parce que le défaut a été vu à L'ÉCRAN et par
     rien d'autre : le beffroi tient dans sa tourelle (x 6…15), la position
     d'arrivée était recopiée (`COURT_SPAWN`, x 22,5), on atterrissait dans le
     vide — écran noir, personnage invisible. Le niveau était connexe, meublé,
     mesuré vert par deux bancs. *Une porte qui s'ouvre sur le vide passe tous
     les contrôles de la porte.* */
  const cw2 = E.generateCourtWorld();
  const bad2 = [];
  for (const [key, fl] of Object.entries(C.DEV_FLOOR_OF)) {
    const sp = E.courtFloorSpawn(cw2, fl);
    const gx = Math.floor(sp.x), gy = Math.floor(sp.y);
    const inFloor = gy >= E.courtFloorY0(fl) && gy < E.courtFloorY0(fl) + C.COURT_FLOOR_H;
    const t = cw2.tile[gy * cw2.w + gx];
    /* ⚠️ ET PAS SUR UNE MARCHE : atterrir sur une volée fait quitter le niveau au
       premier pas. Vu en jouant, sur le beffroi, juste après la réparation
       précédente — la case était praticable, et le lieu restait inatteignable. */
    if (!inFloor || cw2.solid[gy * cw2.w + gx] || t === C.CT_STAIR_UP || t === C.CT_STAIR_DOWN)
      bad2.push(`${key}(${gx},${gy})`);
  }
  ok("⚠️ chaque arrêt d'intérieur pose le joueur sur une case PRATICABLE de son niveau, hors volée",
     bad2.length === 0, bad2.join(" ") || `${Object.keys(C.DEV_FLOOR_OF).length} arrivées valides`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. ⚠️⚠️ AUCUN RÉSOLVEUR NE CRÉDITE QUOI QUE CE SOIT — ET ON PUBLIE COMBIEN DE
   LIGNES ON A LUES.
   Leçon du 441, payée comptant : un scanner dont le motif ne peut matcher
   personne passe TOUJOURS au vert. Le dénominateur est la seule façon de s'en
   apercevoir. Cette quête ne touche à AUCUN prix — c'est la différence de fond
   avec l'enquête du 442, qui modifiait `marketRate`.
   ═══════════════════════════════════════════════════════════════════════════ */
section("La quête ne paie rien (scan de source)");
{
  const src = fs.readFileSync(path.join(SRC, "quete.js"), "utf8");
  const lines = src.split("\n");
  /* On ne lit que le CODE : un commentaire qui parle d'or n'est pas de l'or, et
     ce fichier en parle beaucoup (c'est même son sujet). */
  let read = 0, guilty = [];
  let inBlock = false;
  const MONEY = /\b(money|gold|coins?|reward|marketRate|price|prix)\b/;
  /* ⚠️⚠️ ZIP 454 — UNE LIGNE QUI ANNONCE UN PRIX N'EST PAS UNE LIGNE QUI ENCAISSE,
     ET LE MOTIF NE SAVAIT PAS FAIRE LA DIFFÉRENCE. `resolveStarPlanAsk` rend
     `{ cost: { gold: … } }` : c'est un TARIF affiché à l'appelant, exactement comme
     `resolveStarTimberOrder` rend une quantité de bois. Ce que la règle interdit
     est de CRÉDITER — de rendre plus riche depuis ce fichier — et un résolveur qui
     dit « ça coûte 24 000 » ne rend personne plus riche.
     ⚠️ L'EXCEPTION EST NOMMÉE, PAS ÉLARGIE : seule une lecture de `C.STAR_ENG_FEE_*`
     est excusée. Le jour où quelqu'un écrira `s.money += …` ici, le motif le verra
     comme avant — c'est la différence entre lever une exception et lever la règle.
     Et le contrôle publie combien de lignes il a excusées, sans quoi une exception
     trop large passerait inaperçue (leçon du 441 : un banc doit publier son
     dénominateur). */
  const FEE_OK = /C\.STAR_ENG_FEE_/;
  let excused = 0;
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i];
    if (inBlock) { const e = l.indexOf("*/"); if (e < 0) continue; l = l.slice(e + 2); inBlock = false; }
    const b = l.indexOf("/*");
    if (b >= 0) { const e = l.indexOf("*/", b + 2); if (e < 0) { inBlock = true; l = l.slice(0, b); } else l = l.slice(0, b) + l.slice(e + 2); }
    const c = l.indexOf("//"); if (c >= 0) l = l.slice(0, c);
    if (!l.trim()) continue;
    read++;
    if (!MONEY.test(l)) continue;
    if (FEE_OK.test(l)) { excused++; continue; }
    guilty.push(`${i + 1}: ${l.trim().slice(0, 70)}`);
  }
  ok("le scanner a bien lu quelque chose", read > 150, `${read} lignes de code lues (sur ${lines.length})`);
  ok("⚠️ aucune ligne de `quete.js` ne touche à de l'argent", guilty.length === 0,
     guilty.length ? guilty.join(" | ") : `0 sur ${read} lignes lues, ${excused} tarif(s) annoncé(s)`);
  /* ⚠️ ET L'EXCEPTION EST ÉTROITE : elle n'excuse que des lignes qui ANNONCENT.
     Si l'une d'elles affectait quoi que ce soit, on serait revenu au double crédit
     du 431 avec la bénédiction du banc. */
  ok("…et les tarifs annoncés n'affectent rien", excused > 0 && excused <= 2, `${excused} ligne(s)`);
  /* Et la table des chapitres ne porte aucune récompense : `reward` n'existe
     pas dans ce chantier, contrairement aux 5 700 or du 442. */
  ok("aucun chapitre ne porte de récompense", Q.STAR_CHAPTERS.every(c => c.reward === undefined));
  /* ⚠️ ET LE MENU DÉVELOPPEUR NE DONNE RIEN NON PLUS : on rejoue « tout » et on
     vérifie que le `gift` reste vide (il ne s'écrit qu'au don, arbitré). */
  const dev = Q.devStar(Q.newStar(), "all", 1).star;
  ok("⚠️ le raccourci développeur n'accorde aucun cadeau", Object.keys(dev.gift).length === 0);
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. LES GRANDEURS. ⚠️ ELLES SONT EXPORTÉES POUR ÊTRE LUES DES DEUX CÔTÉS ; ce
   contrôle-ci vérifie surtout qu'aucune n'est ABSENTE — une constante qui
   n'existe pas rend `undefined`, et `undefined` dans une comparaison est
   silencieusement faux. C'est le genre de faute qui ne lève rien et qui rend une
   mécanique morte.
   ═══════════════════════════════════════════════════════════════════════════ */
section("Les grandeurs partagées");
{
  /* ⚠️ ZIP 469 — VINGT-TROIS NOMS SONT SORTIS DE CETTE LISTE avec leurs quatre
     mini-jeux (`STAR_LEAN_*`, `STAR_POOL_*`, `STAR_DIVE_*`, `STAR_RACK_*`,
     `STAR_MAGPIE_*`, `STAR_LURE_*`, `STAR_DUET_*`, `STAR_TURN_MS`). Les laisser
     aurait fait échouer ce contrôle en disant vrai : ils n'existent effectivement
     plus. ⚠️ `STAR_DIG_MS` et `STAR_DIG_MOVE_TILES` les remplacent. */
  const nums = ["STAR_CRATER_R", "STAR_CALM_MS", "STAR_CALM_SOLO_MS", "STAR_CALM_FACE_DOT",
    "STAR_DIG_MS", "STAR_DIG_MOVE_TILES", "STAR_FALL_MIN_DAY",
    "STAR_FALL_MS", "STAR_FALL_IMPACT_MS", "STAR_FALL_APPEAR_MS", "STAR_END_MS", "STAR_CARD_MS", "STAR_HIDE_R", "STAR_HIDE_MS",
    "STAR_COOL_ROUNDS", "STAR_COOL_MS", "STAR_COOL_RISE", "STAR_COOL_POUR", "STAR_COOL_CRACK",
    "STAR_COOL_BURN", "STAR_COOL_DUO_WIDEN"];
  const missing = nums.filter(n => typeof Q[n] !== "number" || !isFinite(Q[n]));
  ok("toutes les grandeurs numériques existent et sont finies", missing.length === 0, missing.join(",") || `${nums.length} lues`);
  const arrays = ["STAR_COOL_BAND", "STAR_DIG_RESULTS"];
  const badArr = arrays.filter(n => !Array.isArray(Q[n]) || !Q[n].length);
  ok("toutes les tables de manches existent", badArr.length === 0, badArr.join(",") || `${arrays.length} lues`);
  /* ⚠️ LES TABLES DE MANCHES DOIVENT COUVRIR LEUR NOMBRE DE MANCHES. Une table
     d'un cran trop courte rend `undefined` au dernier tour — donc un `NaN` dans
     une jauge, donc un mini-jeu ingagnable, et rien ne lève. */
  ok("les bandes de refroidissement couvrent les trois manches", Q.STAR_COOL_BAND.length >= Q.STAR_COOL_ROUNDS);
  /* Les difficultés doivent MONTER : une table qui redescend est une faute de
     frappe qu'on ne voit qu'en jouant trois fois. */
  ok("les bandes de refroidissement se resserrent", Q.STAR_COOL_BAND.every((v, i, a) => !i || v < a[i - 1]), Q.STAR_COOL_BAND.join(" > "));
  /* ╔═══════════════════════════════════════════════════════════════════════════
     ║ ZIP 469 — LA FOUILLE : LES DEUX NOMBRES QUI LA RENDENT JOUABLE.
     ╚═══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ TROIS SECONDES EST LE CHIFFRE DE GUILLAUME, ET C'EST BIEN UNE RÈGLE À
     BORNES : trop court, le geste ne coûte rien et l'animation n'a pas le temps
     d'être vue ; trop long, on n'ouvre pas cinq cratères. Le contrôle échoue donc
     DANS LES DEUX SENS, comme les fenêtres solo qu'il remplace ici.
     ⚠️ ET LE SEUIL DE DÉPLACEMENT DOIT ÊTRE FRANCHISSABLE PAR ACCIDENT MAIS PAS
     PAR RESPIRATION : sous un dixième de case, la dérive d'un joystick annulerait
     la fouille ; au-delà d'une case, on pourrait creuser en marchant. */
  ok("⚠️ la fouille dure exactement les trois secondes demandées", Q.STAR_DIG_MS === 3000, `${Q.STAR_DIG_MS} ms`);
  ok("…assez longtemps pour que l'animation se VOIE (quatre coups de main au moins)",
     Q.STAR_DIG_MS >= 4 * 250, `${(Q.STAR_DIG_MS / 250).toFixed(1)} coups`);
  // 480 bis — huit impacts au lieu de cinq : le budget grandit avec eux
  // (25 s au lieu de 20), la règle elle-même (< 8 s/impact) ne bouge pas.
  ok("…et assez court pour qu'on en fasse huit sans s'ennuyer",
     Q.STAR_DIG_MS * Q.STAR_FARM_IMPACTS.length <= 25000,
     `${(Q.STAR_DIG_MS * Q.STAR_FARM_IMPACTS.length / 1000).toFixed(0)} s de grattage pour toute l'étape`);
  ok("⚠️ le seuil de déplacement annule un PAS, jamais un frémissement",
     Q.STAR_DIG_MOVE_TILES > 0.1 && Q.STAR_DIG_MOVE_TILES < 1, `${Q.STAR_DIG_MOVE_TILES} case`);
  /* ⚠️⚠️ ET LES TROIS RÉSULTATS EXISTENT VRAIMENT DANS LA TABLE. C'est
     l'invariant, pas trois exemples (leçon du 449) : on balaie les cinq impacts,
     chacun doit rendre une clé connue, et les trois clés doivent être servies —
     un `STAR_DIG_RESULTS` qui annoncerait un quatrième résultat sans qu'aucun
     cratère ne le porte serait une branche d'overlay morte. */
  {
    const got = Q.STAR_FARM_IMPACTS.map(st => Q.starDigResult(st.id));
    ok("chaque cratère de ferme rend un résultat connu",
       got.every(k => Q.STAR_DIG_RESULTS.includes(k)), got.join(","));
    ok("⚠️ …et les trois résultats sont tous servis par au moins un cratère",
       Q.STAR_DIG_RESULTS.every(k => got.includes(k)),
       Q.STAR_DIG_RESULTS.filter(k => !got.includes(k)).join(",") || "les trois");
    /* ⚠️⚠️⚠️ LA DÉCISION DE GUILLAUME, MESURÉE : « il faut effectivement que
       certains cratères ne donnent rien pour que la chasse soit intéressante ».
       Sans échec possible, fouiller n'est pas un choix — c'est une formalité. Et
       sans réussite majoritaire, c'est une corvée. On borne les deux. */
    const vides = got.filter(k => k === "empty").length;
    ok("⚠️⚠️ certains cratères ne donnent RIEN (sans échec, fouiller n'est pas un choix)",
       vides >= 1, `${vides} vide(s) sur ${got.length}`);
    ok("…mais pas la moitié", vides < got.length / 2, `${vides}/${got.length}`);
  }
  /* ⚠️ ET LA FOUILLE NE SE COMPTE PAS DEUX FOIS. Idempotence du résolveur : deux
     joueurs qui grattent le même trou dans la même seconde n'ouvrent qu'un
     cratère, et le second reçoit `already` — sans quoi le chat annoncerait deux
     fouilles et l'overlay s'ouvrirait deux fois. */
  {
    const e = Q.newStar(); e.fall = 1;
    const id = Q.STAR_FARM_IMPACTS[0].id;
    const r1 = Q.resolveStarDig(e, id, "j1", 10);
    const r2 = Q.resolveStarDig(e, id, "j2", 11);
    ok("⚠️ une fouille ne s'ouvre qu'une fois", r1.dug === true && r2.already === true);
    ok("…et le premier reste le trouveur", e.dug[id].by === "j1" && e.dug[id].at === 10);
    ok("⚠️ …et fouiller avant la chute est refusé", Q.resolveStarDig(Q.newStar(), id, "j1", 1).tooEarly === true);
    ok("⚠️ …et le cratère de VILLE ne se fouille pas (il se descend)",
       Q.resolveStarDig(e, "crater", "j1", 12).ok === false);
    /* ⚠️⚠️ UN VIDE FOUILLÉ EST FAIT, ET C'EST LA SEULE DES TROIS ISSUES QUI
       ACCORDE LA TROUVAILLE DANS LE MÊME GESTE. Sans ça, le pisteur réclamerait
       pour toujours un cratère qu'on a retourné et qui ne contenait rien. */
    const eV = Q.newStar(); eV.fall = 1;
    const vide = Q.STAR_FARM_IMPACTS.find(st => st.content === "empty");
    Q.resolveStarDig(eV, vide.id, "j1", 10);
    ok("⚠️⚠️ un cratère VIDE est trouvé dans le geste qui le fouille", Q.starHas(eV, vide.id));
    const mat = Q.STAR_FARM_IMPACTS.find(st => st.content === "material");
    Q.resolveStarDig(eV, mat.id, "j1", 11);
    ok("…mais la MATIÈRE, non : elle se gagne au mini-jeu", Q.starDug(eV, mat.id) && !Q.starHas(eV, mat.id));
    const et = Q.STAR_FARM_IMPACTS.find(st => st.content === "star");
    Q.resolveStarDig(eV, et.id, "j1", 12);
    ok("…et l'ÉTOILE non plus : elle s'apprivoise", Q.starDug(eV, et.id) && !Q.starHas(eV, et.id));
    ok("⚠️ le compte restant suit les trois", Q.starDigLeft(eV) === Q.STAR_FARM_IMPACTS.length - 3,
       `${Q.starDigLeft(eV)} restant(s)`);
    /* ⚠️ ET TROUVER IMPLIQUE AVOIR FOUILLÉ, dans l'autre sens : le menu dev et les
       migrations passent par `resolveStarFound`, et un cratère « trouvé mais pas
       fouillé » proposerait de gratter un trou déjà vidé. */
    const eF = Q.newStar(); eF.fall = 1;
    Q.resolveStarFound(eF, Q.STAR_FARM_IMPACTS[3].id, "j1", 20);
    ok("⚠️ trouver un cratère le marque fouillé", Q.starDug(eF, Q.STAR_FARM_IMPACTS[3].id));
  }
  /* ╔═══════════════════════════════════════════════════════════════════════════
     ║ ZIP 469 — L'APPRIVOISEMENT, JOUÉ COMME L'HÔTE LE JOUE : AVEC UN VRAI
     ║ IDENTIFIANT, ET EN RE-MIGRANT L'ÉTAT À CHAQUE REQUÊTE.
     ╚═══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️⚠️ DÉFAUT SIGNALÉ PAR GUILLAUME : « l'apprivoisement de l'étoile bleue
     bloque… au bout de la jauge, l'étoile ne bouge pas ». Il était vert partout,
     et il l'était pour la raison la plus classique de ce dépôt : **le banc ne
     mesurait pas ce que le jeu fait.** Deux écarts, et il fallait les DEUX pour
     que ça casse :
       · le banc jouait `resolveStarCalm` avec `"j1"` comme identifiant ; le jeu
         passe un `profile_id` Supabase, c'est-à-dire un UUID de **36 signes** ;
       · le banc gardait le même objet d'état d'un bout à l'autre ; l'hôte, lui,
         fait `s2.star = Q.migrateStar(s2.star)` **à chaque requête** — donc deux
         fois par seconde pendant toute la tenue.
     `migrateStar` tronquait les clés de `calm` à 40 signes. Or la tenue en écrit
     DEUX par joueur et par lieu : `farmStarBlue:<uuid>` (49 signes) et
     `farmStarBlue:<uuid>:t0` (52). Tronquées, **elles deviennent la même clé** :
     `t0` écrase la dernière marque à chaque migration, `mine = now − t0` retombe à
     zéro, et la jauge du client — qui, elle, compte en local — se remplit
     tranquillement devant une étoile qui ne sortira jamais.
     ⚠️ *Une troncature de sécurité qui FUSIONNE deux clés distinctes ne protège
     rien : elle corrompt.* C'est la leçon, et elle est neuve dans ce dépôt.
     ⚠️⚠️ ON BALAIE LES DEUX LONGUEURS D'IDENTIFIANT, comme on balaie les deux
     valeurs d'un drapeau solo depuis le 458 : un banc qui ne joue qu'un seul
     format d'identifiant est un banc qui écrit lui-même l'hypothèse qui l'arrange. */
  for (const who of ["j1", "3f2b9c14-7a5e-4d0b-8c61-9e2af4d17b05"]) {
    const site = Q.STAR_FARM_STAR_IDS[0];
    let e = Q.newStar(); e.fall = 1;
    Q.resolveStarDig(e, site, who, 900);
    payBlue(e, who, 950);                      // 479 — la bleue veut sa lumière avant la posture
    let t = 1000;
    for (let k = 0; k < 200 && !Q.starHas(e, site); k++) {
      t += 500;
      e = Q.migrateStar(e);                    // ⚠️ exactement ce que fait `hostHandleReq`
      /* ⚠️ ZIP 479 — L'OFFRANDE AUSSI TRAVERSE LA MIGRATION, ET C'EST UN CONTRÔLE
         DE PLUS SANS UNE LIGNE DE PLUS : elle est payée une fois, avant la boucle,
         et l'état est re-migré à chaque tour. Si `offer` ne survivait pas au
         voyage, la posture cesserait de compter dès le second tour. */
      Q.resolveStarCalm(e, who, t, { alone: true }, site);
    }
    ok(`⚠️⚠️ la jauge sort vraiment l'étoile avec un identifiant de ${who.length} signes`,
       Q.starHas(e, site), `${((t - 1000) / 1000).toFixed(1)} s de tenue`);
  }
  /* ⚠️⚠️ LE REFROIDISSEMENT LAISSE LE TEMPS D'APPUYER, ET CE CONTRÔLE EXISTE
     PARCE QUE LE PREMIER JET NE LE FAISAIT PAS. La chaleur remonte toute seule
     de `STAR_COOL_RISE` par seconde ; la marge au-dessus de la bande la plus
     étroite doit donc valoir plus d'une seconde de remontée, sinon la manche
     repart avant le premier appui — ce qui est arrivé, en boucle, et qui ne se
     voit qu'à l'écran. On mesure ce délai, en secondes. */
  {
    const narrow = Math.min(...Q.STAR_COOL_BAND);
    const grace = (narrow / 2 + Q.STAR_COOL_BURN) / Q.STAR_COOL_RISE;
    ok("⚠️ le refroidissement laisse plus d'une seconde avant de repartir au blanc",
       grace >= 1.0, `${grace.toFixed(2)} s de marge sur la manche la plus étroite`);
    /* Et une giclée doit valoir plus que ce qu'une seconde de remontée reprend,
       sinon on ne peut pas descendre, quel que soit le rythme. */
    ok("⚠️ …et une giclée reprend plus que la remontée d'une seconde",
       Q.STAR_COOL_POUR > Q.STAR_COOL_RISE * 0.5, `${Q.STAR_COOL_POUR} contre ${Q.STAR_COOL_RISE}/s`);
  }
  /* ⚠️ ZIP 469 — LES TROIS CONTRÔLES DE LA FLAQUE DE PLONGÉE SONT PARTIS avec le
     chapitre du lac. Ils mesuraient une bonne chose — *la flaque doit laisser du
     NOIR autour d'elle, sinon la coopération n'est qu'une vignette* — et cette
     idée mérite de resservir : toute future mécanique où l'un éclaire l'autre doit
     borner ce que le porteur de lumière révèle, en HAUT comme en BAS. */
  /* ╔═════════════════════════════════════════════════════════════════════════
     ║ ZIP 458 — L'ARRIVÉE DE L'ÉTOILE (elle grimpe, elle tournicote, elle se pose)
     ╚═════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ CE BLOC EXISTE PARCE QUE C'EST UNE ANIMATION, ET QU'UNE ANIMATION ÉCRITE
     DANS LA BOUCLE DE RENDU NE SE MESURE JAMAIS (piège n°1, §4 de `CLAUDE.md`,
     deuxième visage : « elle reste au niveau du jour où elle a été écrite »).
     `starJoinAnim` est une COURBE PURE justement pour qu'un banc puisse la
     balayer image par image — et le premier contrôle est celui qui compte : la
     CONTINUITÉ. Un saut de dix pixels entre deux images ne se voit sur aucune
     capture fixe, et se voit immédiatement à l'écran (leçon du 446 sur
     l'enfoncement du cratère, exactement la même grandeur). */
  {
    ok("⚠️ hors de sa fenêtre, il n'y a plus d'arrivée",
       Q.starJoinAnim(-1) === null && Q.starJoinAnim(Q.STAR_JOIN_MS) === null && Q.starJoinAnim(Q.STAR_JOIN_MS + 500) === null);
    const a0 = Q.starJoinAnim(0);
    ok("⚠️⚠️ elle part du CRATÈRE (c'est ce qui fait qu'elle se DÉTACHE)",
       a0 && a0.anchor === 0 && a0.dy >= Q.STAR_JOIN_CRATER_LIFT_PX * 0.9,
       a0 ? `ancre ${a0.anchor} · ${a0.dy.toFixed(1)} px` : "rien");
    const origin = { x: 128, y: 117.12 }, player = { x: 128.7, y: 119.1 };
    const p0 = Q.starJoinPoint(origin, player, a0);
    const p1 = Q.starJoinPoint(origin, player, Q.starJoinAnim(Q.STAR_JOIN_CLIMB_MS));
    ok("⚠️ le corps commence EXACTEMENT au centre vivant du cratère",
       p0 && p0.x === origin.x && p0.y === origin.y, p0 ? `${p0.x},${p0.y}` : "rien");
    ok("…puis rejoint réellement le joueur avant le tournicotage",
       p1 && p1.x === player.x && p1.y === player.y, p1 ? `${p1.x},${p1.y}` : "rien");
    ok("…et elle est plus petite en bas qu'en haut", a0 && a0.scale < 1, a0 ? `×${a0.scale.toFixed(2)}` : "");
    const aEnd = Q.starJoinAnim(Q.STAR_JOIN_MS - 1);
    ok("⚠️ et elle finit EXACTEMENT là où le suivi normal la met",
       aEnd && Math.abs(aEnd.dx) < 0.5 && Math.abs(aEnd.dy) < 0.5 && Math.abs(aEnd.scale - 1) < 0.02,
       aEnd ? `dx ${aEnd.dx.toFixed(2)} · dy ${aEnd.dy.toFixed(2)}` : "rien");
    let jump = 0, prev = null, phases = new Set(), signs = 0, prevSign = 0, fronts = new Set();
    for (let t = 0; t < Q.STAR_JOIN_MS; t += 8) {
      const a = Q.starJoinAnim(t); if (!a) break;
      phases.add(a.phase); fronts.add(!!a.front);
      const sg = Math.sign(a.dx);
      if (a.phase === "spin" && sg && prevSign && sg !== prevSign) signs++;
      if (sg) prevSign = sg;
      if (prev) jump = Math.max(jump, Math.hypot(a.dx - prev.dx, a.dy - prev.dy));
      prev = a;
    }
    ok("⚠️⚠️ le mouvement est CONTINU (aucun saut d'une image à l'autre)",
       jump < 2.2, `plus grand saut ${jump.toFixed(2)} px pour 8 ms`);
    ok("⚠️ les trois temps sont tous atteints", phases.size === 3, [...phases].join(" → "));
    ok("⚠️⚠️ elle fait vraiment le TOUR du fermier (au moins un tour et demi)",
       signs >= 2, `${signs} passages d'un côté à l'autre`);
    ok("…et elle passe DERRIÈRE puis DEVANT (sinon le cercle est plat)", fronts.size === 2);
    ok("⚠️ le tournicotage dure bien « une seconde »", Q.STAR_JOIN_SPIN_MS >= 800 && Q.STAR_JOIN_SPIN_MS <= 1300,
       `${Q.STAR_JOIN_SPIN_MS} ms`);
    /* ⚠️ ET ELLE NE DURE PAS PLUS LONGTEMPS QUE LA SUITE DE PHRASES QU'ELLE
       ACCOMPAGNE : la rencontre déroule sept toasts espacés de 2,6 s, et une
       animation qui déborderait la première phrase raconterait deux choses en
       même temps. */
    ok("…et l'arrivée entière tient dans les premières phrases de la rencontre",
       Q.STAR_JOIN_MS <= 3000, `${Q.STAR_JOIN_MS} ms`);

    /* ╔═══════════════════════════════════════════════════════════════════════
       ║ ZIP 468 — UNE ARRIVÉE PÉRIME. C'EST LA SEULE CHOSE QUI L'EMPÊCHE
       ║ DE RENDRE LA QUÊTE INFINISSABLE.
       ╚═══════════════════════════════════════════════════════════════════════
       ⚠️⚠️ CE QU'ON MESURE ICI N'EST PAS LA COURBE, C'EST SA BORNE — et c'est la
       grandeur qui manquait. Les onze contrôles ci-dessus balayaient
       `starJoinAnim` image par image et étaient tous verts pendant que
       l'horloge qui l'alimente pouvait rester figée pour toujours : ils
       mesuraient ce que l'arrivée EST, jamais COMBIEN DE TEMPS elle a le droit
       d'attendre (c'est la cinquième forme du §0 de `CLAUDE.md`, « un banc de
       rendu ne peut pas voir un défaut de temps »).
       ⚠️ IL PEUT ÉCHOUER : passer `STAR_JOIN_GRACE_MS` à `Infinity` casse les
       deux premiers contrôles, et retirer la borne casse le troisième. */
    ok("⚠️ une arrivée jamais armée ne périme pas", Q.starJoinStale(0, 1e12) === false);
    ok("⚠️ …ni pendant sa propre durée, grâce comprise",
       Q.starJoinStale(1000, 1000 + Q.STAR_JOIN_MS + Q.STAR_JOIN_GRACE_MS) === false);
    ok("⚠️⚠️ …mais elle périme UNE MILLISECONDE plus tard (sinon elle est éternelle)",
       Q.starJoinStale(1000, 1000 + Q.STAR_JOIN_MS + Q.STAR_JOIN_GRACE_MS + 1) === true);
    /* ⚠️ LA GRÂCE EST ENCADRÉE DES DEUX CÔTÉS, et les deux bornes ont une raison.
       Trop courte, elle couperait une arrivée qu'un fondu de zone ou une carte de
       chapitre suspend légitimement (le temps VISIBLE du 465 resterait la règle
       mais ne serait plus tenu). Trop longue, elle laisserait la quête bloquée
       assez longtemps pour qu'un joueur repose la manette. */
    ok("⚠️ la grâce laisse passer une carte de chapitre entière",
       Q.STAR_JOIN_GRACE_MS >= Q.STAR_CARD_MS, `${Q.STAR_JOIN_GRACE_MS} ms ≥ ${Q.STAR_CARD_MS} ms`);
    ok("…et elle ne dépasse pas une demi-minute", Q.STAR_JOIN_GRACE_MS <= 30000,
       `${Q.STAR_JOIN_GRACE_MS} ms`);
    /* ⚠️⚠️ ET LA BORNE DOIT ÊTRE PLUS COURTE QUE LA TENUE QU'ELLE PROTÈGE. Une
       arrivée qui périme plus lentement qu'on ne gagne l'étoile SUIVANTE ferait
       attendre la seconde derrière la première : la file de `starWatch` ne
       tiendrait plus, et on retomberait sur le défaut qu'elle corrige. */
    ok("⚠️⚠️ une arrivée périmée libère la place avant l'apprivoisement suivant",
       Q.STAR_JOIN_MS + Q.STAR_JOIN_GRACE_MS < Q.STAR_CALM_SOLO_MS,
       `${Q.STAR_JOIN_MS + Q.STAR_JOIN_GRACE_MS} ms < ${Q.STAR_CALM_SOLO_MS} ms`);
  }
  ok("⚠️ la carte de chapitre ne survit pas à sa scène", Q.STAR_CARD_MS < Q.STAR_FALL_MS && Q.STAR_CARD_MS < Q.STAR_END_MS);
  /* ⚠️ ZIP 453 — LE TOTAL SE DÉRIVE DE LA TABLE DES MORCEAUX, ET IL N'Y EN A
     PLUS QU'UN. `STAR_SHARD_TOTAL` (4) a été supprimé avec la colonne `shard`. */
  ok("le total de morceaux vient de la table", Q.STAR_SHIP_TOTAL === Q.STAR_SHIP_PARTS.length,
     `${Q.STAR_SHIP_TOTAL} morceaux`);
  ok("…et il n'existe plus de second compte", Q.STAR_SHARD_TOTAL === undefined && Q.starShards === undefined,
     "STAR_SHARD_TOTAL / starShards retirés au 453");
  ok("chaque chapitre ne demande que des lieux qui existent",
     Q.STAR_CHAPTERS.every(c => c.need.every(id => !!Q.STAR_SITE[id])));
  ok("chaque prérequis désigne un lieu qui existe",
     Q.STAR_SITES.every(s => !s.req || s.req.every(id => !!Q.STAR_SITE[id])));
  ok("chaque lieu appartient à un chapitre",
     Q.STAR_SITES.every(s => Q.STAR_CHAPTERS.some(c => c.need.includes(s.id))),
     Q.STAR_SITES.filter(s => !Q.STAR_CHAPTERS.some(c => c.need.includes(s.id))).map(s => s.id).join(",") || "tous");
  ok("chaque lieu déclare une zone connue",
     Q.STAR_SITES.every(s => ["farm", "town", "court"].includes(s.zone)));
}

/* ═══════════════════════════════════════════════════════════════════════════
   8 bis. ⚠️⚠️ ZIP 445 — LA CHUTE EST-ELLE VUE, ET LE CHEVRON POINTE-T-IL
   QUELQUE PART ?
   ───────────────────────────────────────────────────────────────────────────
   ⚠️ CE BLOC EXISTE PARCE QUE LE 444 A APPRIS QUE LES BANCS NE MESURAIENT PAS
   L'ARRIVÉE. Ici l'objet mesuré est exactement ça, deux fois :
     • une SCÈNE qui peut ne pas avoir lieu (elle se jouait dans un intérieur,
       derrière un menu, ou jamais pour qui rejoignait le lendemain) ;
     • un REPÈRE qui pourrait pointer vers rien (une cible sans position, ou
       une position sans branche de code — « une porte sans chemin de code
       ment », le défaut n°1 du 444).
   Aucun de ces deux-là n'est visible en lisant le code : les deux se voient à
   l'écran, ou se mesurent ici.
   ═══════════════════════════════════════════════════════════════════════════ */
section("La chute est vue, et le chevron désigne (445)");
{
  /* ── LES MONDES D'IMPACT. ⚠️ UNE LISTE DE CE QUI EST PERMIS, jamais de ce qui
     est interdit : le jour où une carte s'ajoute, elle n'a pas de chute tant
     que personne ne l'écrit (leçon de `plantTree`, 440). */
  ok("la liste des mondes d'impact existe et n'est pas vide",
     Array.isArray(Q.STAR_FALL_WORLDS) && Q.STAR_FALL_WORLDS.length > 0, Q.STAR_FALL_WORLDS.join(","));
  ok("…et ne nomme que des zones connues",
     Q.STAR_FALL_WORLDS.every(z => ["farm", "town", "court"].includes(z)));
  /* ⚠️ ET LES DEUX MONDES OÙ QUELQUE CHOSE TOMBE VRAIMENT Y SONT, LES DEUX. Le
     gros du morceau dans le pré de la ville, un éclat dans le champ de la ferme :
     si l'un manquait, la moitié des joueurs verrait une scène sans impact. */
  ok("⚠️ la ferme ET la ville ont leur impact",
     Q.starImpactZone("farm") && Q.starImpactZone("town"));
  /* ⚠️⚠️ ET L'INTÉRIEUR N'EN EST PAS UN. C'est tout le correctif : au 444 la
     scène se jouait au troisième étage du tribunal, où il n'y a ni ciel, ni
     cratère, ni rien à montrer — une cinématique jouée dans le vide. */
  ok("⚠️ un intérieur n'est PAS un monde d'impact", !Q.starImpactZone("court"));
  ok("…ni le passage sombre", !Q.starImpactZone("evil"));

  /* ── LA CAMÉRA. Trois inégalités, pas un réglage à l'œil. */
  ok("⚠️ la caméra est POSÉE quand le flash tombe",
     Q.STAR_CAM_GO_MS < Q.STAR_FALL_IMPACT_MS,
     `vol ${Q.STAR_CAM_GO_MS} ms, flash à ${Q.STAR_FALL_IMPACT_MS} ms`);
  ok("…et elle y reste APRÈS le flash (sinon on ne voit pas ce qu'on est venu voir)",
     Q.STAR_CAM_HOLD_MS > Q.STAR_FALL_IMPACT_MS,
     `tenue jusqu'à ${Q.STAR_CAM_HOLD_MS} ms`);
  ok("⚠️ …et elle est revenue au joueur AVANT la fin de la scène",
     Q.STAR_CAM_HOLD_MS + Q.STAR_CAM_BACK_MS <= Q.STAR_FALL_MS,
     `${Q.STAR_CAM_HOLD_MS + Q.STAR_CAM_BACK_MS} ms sur ${Q.STAR_FALL_MS} ms`);
  /* ⚠️ ET LE RETOUR DURE PLUS LONGTEMPS QUE L'ALLER. On part vite (« regarde
     là-bas ») et on revient posément ; l'inverse donne un plan qui fuit. */
  ok("le retour est plus lent que le vol", Q.STAR_CAM_BACK_MS > Q.STAR_CAM_GO_MS,
     `${Q.STAR_CAM_GO_MS} ms → ${Q.STAR_CAM_BACK_MS} ms`);

  /* ╔════════════════════════════════════════════════════════════════════════════
     ║ ZIP 448 — LA CHRONOLOGIE DE LA CHUTE. LA GRANDEUR QUE PERSONNE NE MESURAIT.
     ╚════════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ SEPT CONTRÔLES REGARDAIENT LE CRATÈRE (sa forme, sa profondeur, ses deux
     rayons, son refroidissement, sa fumée, son enfoncement) ET AUCUN NE
     DEMANDAIT QUAND IL APPARAÎT. Il apparaissait à t=0, trois secondes avant que
     la comète ne touche le sol, et le sillon de la ferme existait depuis le
     premier jour de la partie. Défaut vu à l'écran par Guillaume, invisible à
     tous les bancs — c'est le §25 du README de la ferme, une fois de plus.
     ⚠️ ET `STAR_CAM_FLASH_MS` A ÉTÉ SUPPRIMÉE EN MÊME TEMPS : elle valait 3000,
     ce banc la lisait, et la cinématique écrivait `t > 3.0` en dur dans sa
     closure. Le banc mesurait donc un nombre que le dessin ne lisait pas — il ne
     pouvait pas échouer (§10 : « un banc qui n'a jamais pu échouer ne vaut
     rien »). Il n'en reste qu'une, `STAR_FALL_IMPACT_MS`, et elle est lue par les
     deux côtés. */
  ok("⚠️⚠️ le décor d'impact n'existe PAS avant l'impact",
     Q.starImpactLanded("townFall", 0) === false
     && Q.starImpactLanded("townFall", Q.STAR_FALL_IMPACT_MS - 1) === false,
     `rien jusqu'à ${Q.STAR_FALL_IMPACT_MS} ms`);
  ok("…et il existe à partir de l'instant du contact",
     Q.starImpactLanded("townFall", Q.STAR_FALL_IMPACT_MS) === true
     && Q.starImpactLanded("townFall", Q.STAR_FALL_MS) === true);
  /* ⚠️ HORS CINÉMATIQUE, L'IMPACT EST DE L'HISTOIRE. Écrire l'inverse aurait fait
     disparaître le cratère les 999 fois sur 1000 où aucune scène ne joue —
     c'est-à-dire pendant toute la partie. */
  ok("⚠️ sans scène en cours, le décor est là (c'est le cas NORMAL)",
     Q.starImpactLanded(null, 0) === true && Q.starImpactLanded("turn", 0) === true
     && Q.starImpactLanded("end", 0) === true);
  ok("la comète entre en scène après le vol de caméra et avant l'impact",
     Q.STAR_CAM_GO_MS <= Q.STAR_FALL_APPEAR_MS && Q.STAR_FALL_APPEAR_MS < Q.STAR_FALL_IMPACT_MS,
     `caméra posée ${Q.STAR_CAM_GO_MS} ms, comète ${Q.STAR_FALL_APPEAR_MS} ms, contact ${Q.STAR_FALL_IMPACT_MS} ms`);
  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ ZIP 454 — LA LOURDEUR SE MESURE EN VITESSES, PAS EN DURÉE.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ LE CONTRÔLE D'AVANT DISAIT « moins de trois secondes de vol », et il est
     passé au ROUGE le jour où Guillaume a demandé une chute trois fois plus lente.
     Il n'avait pas tort : il mesurait la seule grandeur qu'on savait écrire à
     l'époque. Mais la demande n'est pas une durée — c'est « ⅓ de la vitesse
     partout, la vitesse d'avant à l'absolue fin », c'est-à-dire DEUX vitesses. Une
     borne sur le total ne peut, par construction, en voir aucune des deux : on
     aurait pu la satisfaire avec une comète qui accélère au début et rampe à la
     fin, très exactement l'inverse de ce qui est demandé.
     ⚠️ On dérive donc la vitesse instantanée de `starFallEase` par différences
     finies, aux deux endroits qui comptent, et on la compare à ce que la même
     trajectoire faisait avant ce zip (durée `STAR_FALL_BASE_FLIGHT_MS`, avancement
     linéaire). C'est le seul moyen de dire « trois fois plus lente » autrement
     qu'en le croyant. */
  {
    const vol = Q.STAR_FALL_IMPACT_MS - Q.STAR_FALL_APPEAR_MS;
    ok("⚠️ on la voit assez longtemps pour la regarder", vol >= 1200, `${vol} ms`);
    /* La vitesse d'avancement d'AVANT le 454, en fraction de trajectoire par ms. */
    const v0 = 1 / Q.STAR_FALL_BASE_FLIGHT_MS;
    const dk = 1e-4;
    const speedAt = (k) => (Q.starFallEase(Math.min(1, k + dk)) - Q.starFallEase(Math.max(0, k - dk)))
                           / ((Math.min(1, k + dk) - Math.max(0, k - dk)) * vol);
    const slow = speedAt(0.4), rush = speedAt(1 - 1e-4);
    ok("⚠️⚠️ la phase lourde va exactement trois fois moins vite qu'avant",
       Math.abs(slow / v0 - 1 / Q.STAR_FALL_SLOW) < 0.02,
       `${(v0 / slow).toFixed(2)}× plus lente (demandé ${Q.STAR_FALL_SLOW}×)`);
    ok("⚠️⚠️ …et à l'absolue fin elle a retrouvé sa vitesse d'avant",
       Math.abs(rush / v0 - 1) < 0.05, `${(rush / v0).toFixed(2)}× la vitesse d'origine`);
    /* ⚠️ ET LA REMONTÉE EST GRADUELLE (« la vitesse augmente graduellement ») : la
       vitesse ne doit jamais REDESCENDRE, sinon on a un à-coup et pas une reprise.
       Une seule marche en arrière suffit à ce que l'œil le voie. */
    let mono = true, prev = -1;
    for (let k = 0; k <= 1.0001; k += 0.02) { const s = speedAt(Math.min(1, k)); if (s < prev - 1e-9) mono = false; prev = s; }
    ok("…et elle ne redescend jamais en chemin", mono);
    /* ⚠️ LES BOUTS SONT LES BOUTS : une reparamétrisation qui ne rendrait pas
       exactement 0 et 1 ferait naître la comète dans le champ ou la ferait toucher
       à côté du point d'impact. C'est le genre d'erreur d'un demi-pixel qui ne se
       voit qu'à la douzième relecture. */
    /* ╔══════════════════════════════════════════════════════════════════════
       ║ ⚠️⚠️ ET LA GRANDEUR QUI MANQUAIT : COMBIEN DE TEMPS LA VOIT-ON ?
       ╚══════════════════════════════════════════════════════════════════════
       Le premier réglage du 454 était VERT sur les deux contrôles de vitesse et
       ne changeait RIEN à l'écran. La comète naît à 1,3 diagonale et avance en
       `u^1,9` : elle n'entre dans le cadre qu'aux derniers 22 % de sa course, et
       la reprise de vitesse (un cinquième du vol) couvrait justement ces 22 %. On
       ralentissait donc, très exactement, la partie qu'on ne voit pas.
       ⚠️ *Une grandeur juste, mesurée sur un intervalle que le joueur ne regarde
       pas.* On mesure maintenant la portion VISIBLE, et on la compare à ce
       qu'elle durait avant le zip — parce que « plus lourde » n'a de sens que
       par rapport à avant. */
    {
      const vis = Q.starFallVisibleMs();
      const avant = (1 - Q.starFallOnScreenFrom()) * Q.STAR_FALL_BASE_FLIGHT_MS;
      ok("⚠️⚠️ la partie VISIBLE de la chute dure vraiment plus longtemps qu'avant", vis > avant * 1.8,
         `${Math.round(vis)} ms contre ${Math.round(avant)} ms (×${(vis / avant).toFixed(2)})`);
      /* ⚠️ ET LA REPRISE DE VITESSE TOMBE DANS LE CADRE, pas au-dessus : c'est
         l'autre moitié de la demande (« sauf à l'absolue fin »). Si elle
         commençait avant l'entrée en scène, on ne verrait jamais qu'une comète
         rapide — le défaut qu'on vient de payer. */
      const kRush = 1 - Q.STAR_FALL_RUSH;
      ok("…et l'accélération finale a lieu À L'ÉCRAN, pas hors champ",
         Q.starFallEase(kRush) > Q.starFallOnScreenFrom(),
         `reprise à u=${Q.starFallEase(kRush).toFixed(3)}, entrée en scène à u=${Q.starFallOnScreenFrom().toFixed(3)}`);
    }
    ok("la trajectoire part de 0 et finit à 1",
       Math.abs(Q.starFallEase(0)) < 1e-9 && Math.abs(Q.starFallEase(1) - 1) < 1e-9,
       `${Q.starFallEase(0).toFixed(6)} → ${Q.starFallEase(1).toFixed(6)}`);
  }

  /* ── L'AZIMUT. ⚠️ REMARQUE DE GUILLAUME : « si l'animation montre un
     déplacement d'ouest en est, l'impact ne peut pas être à l'ouest ». Le sens
     est dicté par le SILLON, qui est plus profond à son bout ouest — c'est là que
     la course s'arrête. On vérifie donc le signe, jamais un nombre recopié. */
  for (const z of ["farm", "town"]) {
    const a = Q.starFallAngle(z);
    ok(`la comète descend vers l'OUEST (${z})`, Math.cos(a) < 0 && Math.sin(a) > 0,
       `dx ${Math.cos(a).toFixed(2)}, dy ${Math.sin(a).toFixed(2)}`);
  }
  /* ⚠️⚠️ ET LA PLONGÉE SUIT LE TROU QU'ELLE CREUSE. Un cratère ROND se creuse à
     la verticale, une balafre de six cases se laboure en rasant : c'est la même
     discipline que le garde-corps du 447 — la collision et le dessin disent la
     même chose, et c'est le seul cas où l'on a le droit de les confondre. */
  ok("⚠️ elle plonge plus raide sur le cratère que sur le sillon",
     Q.starFallDive("town") > Q.starFallDive("farm") * 1.5,
     `ville ${(Q.starFallDive("town") * 180 / Math.PI).toFixed(0)}°, ferme ${(Q.starFallDive("farm") * 180 / Math.PI).toFixed(0)}°`);
  ok("…et le sillon reste un impact RASANT (sinon ce serait un trou)",
     Q.starFallDive("farm") < 30 * Math.PI / 180,
     `${(Q.starFallDive("farm") * 180 / Math.PI).toFixed(0)}°`);
  /* ⚠️ UNE ZONE INCONNUE NE DOIT PAS RENDRE `NaN` : elle retombe sur la ferme.
     Un `NaN` d'angle ne lève rien, il fait juste disparaître la comète — le repli
     poli du 444, dans une trigonométrie. */
  ok("une zone inconnue ne rend pas NaN", Number.isFinite(Q.starFallAngle("inventée")));
  /* La carte de chapitre tombe à `STAR_FALL_MS - 3000` : elle ne doit pas
     recouvrir le plan sur l'impact qu'on vient de payer. */
  ok("⚠️ la carte de chapitre n'arrive pas avant que la caméra ait fini de tenir",
     Q.STAR_FALL_MS - 3000 >= Q.STAR_FALL_IMPACT_MS,
     `carte à ${Q.STAR_FALL_MS - 3000} ms`);

  /* ── LA CIBLE DU CHEVRON, SUR TOUTE LA QUÊTE. ⚠️ ON REJOUE LA QUÊTE ENTIÈRE
     et on regarde ce que le chevron désignerait à chaque étape : c'est le seul
     moyen de s'apercevoir qu'il pointerait vers un lieu qu'on a déjà trouvé, ou
     vers rien alors qu'il reste quelque chose à faire. */
  {
    const e = Q.newStar();
    armFall(e);
    /* ⚠️ ZIP 454 — les plans sont accordés d'emblée : ce bloc mesure le PARCOURS du
       chevron, et l'étape « va chercher un ingénieur » a sa propre section. Un
       contrôle qui mesure deux choses n'en mesure aucune. */
    e.plan = { at: 1000, by: "banc", done: 1000 };
    ok("⚠️ au premier chapitre, le chevron pointe le premier impact", Q.starTargetSite(e, {}) === Q.STAR_FARM_IMPACTS[0].id);
    findFarmImpacts(e, "banc", 2000);
    ok("…puis l'attente naturelle à Valley Town", Q.starGoalKey(e, {}) === "townWait" && Q.starTargetSite(e, {}) === null);
    Q.resolveStarTownFall(e, 2500);
    /* ⚠️⚠️ 2026-09-02 (lot A) — LE CHEVRON NE POINTE PLUS LE CRATÈRE TOUT DE
       SUITE, ET C'EST LE COMPORTEMENT VOULU. Le premier geste du chapitre 2 est
       d'aller chercher 80 lumières au défi de fuite, qui n'est pas un lieu de la
       carte : le chevron se TAIT, comme il se tait déjà pour `farmImpactLight`.
       Il ne désigne le trou qu'une fois les lumières en poche. Mesurer les deux
       états vaut mieux que l'ancien contrôle, qui n'en mesurait qu'un. */
    ok("…puis, sans lumières, le chevron se tait : c'est la course qu'il faut faire",
       Q.starGoalKey(e, {}) === "craterFeed" && Q.starTargetSite(e, {}) === null);
    ok("…et lumières en poche, il désigne enfin le cratère",
       Q.starGoalKey(e, { candy: Q.starOfferPrice("crater") }) === "craterFeedPay"
       && Q.starTargetSite(e, { candy: Q.starOfferPrice("crater") }) === "crater");
    Q.resolveStarFound(e, "crater", "banc", 3000); findSisters(e, 3000);
    /* ⚠️⚠️ ET LÀ, PLUS AUCUN LIEU — C'EST VOULU, ET LE CONTRÔLE VAUT ENCORE PLUS
       CHER DEPUIS LE DÉCHANT. Le cratère était le DERNIER lieu de la table ; ce
       qui reste à faire est un chantier (la mairie, puis Tristan), et aucun des
       deux n'est un lieu de `STAR_SITES`. Un chevron qui désignerait quoi que ce
       soit ici serait un mensonge poli — la famille du `|| clé` du 444, qui
       n'échoue pas : il affiche.
       ⚠️ CE QUI PREND LE RELAIS EST LE BANDEAU, et il le dit : `starGoalKey`
       rend `engineer` à cet instant précis (mesuré juste en dessous). Sans ce
       couple de contrôles, la fin de la quête serait un silence. */
    /* ⚠️⚠️ ET LÀ, LA TABLE EST ÉPUISÉE — C'EST VOULU, ET LE CONTRÔLE VAUT PLUS
       CHER DEPUIS LE DÉCHANT. Le cratère est le DERNIER lieu de `STAR_SITES` ;
       tout ce qui reste est un CHANTIER, dont les deux étapes ne sont pas des
       lieux de la table mais des cibles hors-table (`STAR_OFF_TABLE_TARGETS`).
       ⚠️ CE QUI PREND LE RELAIS EST DONC LE BANDEAU, et il ne se tait pas : les
       plans étant déjà rendus au début de ce bloc, il envoie chez Tristan. Sans ce
       couple de contrôles, la fin de la quête pourrait devenir un silence sans
       qu'un seul autre contrôle ne bouge. */
    ok("⚠️ après le cratère, plus aucun LIEU de la table n'est visé",
       !Q.STAR_SITE[Q.starTargetSite(e, {}) || ""], String(Q.starTargetSite(e, {})));
    /* ⚠️ ZIP 480 — le chantier commence par une signature : on gagne l'audience
       ici comme le joueur la gagne, par le vrai résolveur. */
    signMayor(e, 5);
    ok("⚠️⚠️ …mais le chantier prend le relais, et il a une adresse",
       Q.starGoalKey(e, {}) === "timberOrder" && Q.starTargetSite(e, {}) === "sawmill",
       `${Q.starGoalKey(e, {})} → ${Q.starTargetSite(e, {})}`);
    /* ⚠️ ET SANS LES PLANS, C'EST LA MAIRIE. Deux états, deux adresses : c'est la
       seule chose qui empêche le bandeau de dire « va scier » à quelqu'un qui n'a
       pas encore de plan à scier. */
    {
      const e2 = Q.newStar(); armFall(e2); findFarmImpacts(e2, "banc", 2000);
      Q.resolveStarTownFall(e2, 2500); Q.resolveStarFound(e2, "crater", "banc", 3000); findSisters(e2, 3000);
      ok("…et sans plans, il envoie à la mairie",
         Q.starGoalKey(e2, {}) === "engineer" && Q.starTargetSite(e2, {}) === "townHall",
         `${Q.starGoalKey(e2, {})} → ${Q.starTargetSite(e2, {})}`);
    }
    /* ⚠️ TOUTE CIBLE RENDUE A UN `spot` NOMMÉ. Un lieu sans `spot` ne se
       dessine nulle part ; le rendre serait pointer vers `undefined`. */
    ok("⚠️ toute cible désignable porte un `spot` réel",
       Q.STAR_SITES.filter(s => s.spot && s.spot[0] !== "*").every(s => typeof s.spot === "string" && s.spot.length > 2));
  }

  /* ── LA JOINTURE, EN SCAN DE SOURCE, AVEC LE COMPTE DE LIGNES LUES.
     ⚠️⚠️ C'EST LE DÉFAUT N°1 DU 444 PRIS À LA RACINE : « une porte sans chemin
     de code ment ». Chaque identifiant de lieu que `starTargetSite` peut rendre
     doit avoir une branche dans `starTargetPos` — sinon le chevron ne s'affiche
     tout simplement pas, sans une erreur, et le joueur croit qu'il n'y a rien à
     chercher. ⚠️ ET ON PUBLIE COMBIEN DE LIGNES ON A LUES (leçon du 441) : un
     scanner dont le motif ne matche rien passe toujours au vert. */
  {
    const src = fs.readFileSync(path.join(SRC, "FermeGame.js"), "utf8");
    const read = src.split("\n").length;
    ok("le scanner a bien lu `FermeGame.js`", read > 20000, `${read} lignes lues`);
    ok("⚠️⚠️ la fin de jauge transmet sa pose atomique jusqu'au verdict hôte",
       src.includes('dir: m.dir | 0, moving: !!m.moving')
       && src.includes('starCalmOk(f.id, calmSite.id, req)'));
    ok("⚠️ le rendu des petits fragments lit la trajectoire pure et non un angle tremblé",
       src.includes("Q.starFarmFlightPath(flight.impact, flight.k)")
       && !src.includes("Math.sin(ms / 73)"));
    const body = (src.split("function starTargetPos(")[1] || "").split("\n  function ")[0];
    ok("⚠️ `starTargetPos` existe", body.length > 100, `${body.split("\n").length} lignes de corps`);
    const targetable = Q.STAR_SITES.filter(s => s.spot && s.spot[0] !== "*").map(s => s.id);
    const orphans = targetable.filter(id => {
      const site = Q.STAR_SITE[id];
      return site.spot === "starFarmImpact" ? !body.includes('site.spot === "starFarmImpact"') : !body.includes(`"${id}"`);
    });
    ok("⚠️⚠️ chaque lieu désignable a sa branche de position",
       orphans.length === 0, orphans.join(",") || `${targetable.length} lieux joints`);
    /* ⚠️ ET LA CAMÉRA EST DÉCRITE UNE SEULE FOIS, LUE PAR LES DEUX MONDES. Deux
       calculs de « où regarde la caméra pendant la chute » divergeraient au
       premier réglage, et le symptôme serait le pire du genre : juste à la
       ferme, faux en ville (§4, troisième visage du piège n°1). */
    const camCalls = (src.match(/starCamNow\(/g) || []).length;
    ok("⚠️ les deux caméras appellent la MÊME fonction de scène",
       camCalls === 3, `${camCalls} occurrences (1 déclaration + 2 appels)`);
    ok("…la ferme la lit", /starCamNow\("farm"\)/.test(src));
    ok("…la ville aussi", /starCamNow\("town"\)/.test(src));
    /* ⚠️ LE CHEVRON REFUSE LES AUTRES ZONES. Sans ce garde, il pointerait « à
       vol d'oiseau » vers une case de la ville depuis un pré de la ferme, et il
       aurait parfaitement l'air de marcher (§4, le piège des deux cartes). */
    const chev = (src.split("function drawStarChevron(")[1] || "").split("\n    function ")[0];
    ok("⚠️ le chevron refuse une cible d'une autre zone", /g\.zone !== zone/.test(chev));
    ok("⚠️ …et un autre ÉTAGE dans le tribunal", /courtFloorOf/.test(chev));
    /* Les deux repères ne se recouvrent pas : orbites distinctes. */
    ok("⚠️ le chevron n'orbite pas sur le même cercle que la boussole",
       C.STAR_CHEVRON_ORBIT_PX !== C.GPS_ORBIT_PX,
       `chevron ${C.STAR_CHEVRON_ORBIT_PX} px, boussole ${C.GPS_ORBIT_PX} px`);
    /* ⚠️⚠️ ET LA CHUTE PASSE PAR LA FILE, PAS PAR LA RÉCEPTION. Si quelqu'un
       remettait un jour `starSceneRef.current = …` directement à l'arrivée du
       message, tout ce chantier redeviendrait sans effet — silencieusement. */
    ok("⚠️ la chute est mise en FILE à la réception", /starQueueScene\("fall"\)/.test(src));
    ok("…et la file bat dans la boucle, toutes zones", /starScenePump\(\);/.test(src));
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   8 bis. ZIP 449/463 — L'OBJECTIF COURANT ET L'ÉTOILE REINE QUI MÈNE.

   ⚠️⚠️ CE QUE CETTE SECTION MESURE N'AVAIT AUCUN ENDROIT OÙ SE VOIR, et c'est
   la question que CLAUDE.md dit de se poser en premier quand Guillaume voit un
   défaut qu'aucun banc n'attrape : *quelle grandeur ne mesure-t-on pas ?* Ici
   c'était **l'ACCORD entre ce que le bandeau DIT et ce que le chevron MONTRE**.
   Sept contrôles regardaient déjà la quête et aucun ne comparait les deux —
   parce qu'ils n'avaient jamais eu la même source, donc personne n'avait eu
   l'idée de le demander.
   ═══════════════════════════════════════════════════════════════════════════ */
section("L'objectif courant (bandeau) et le guide");
{
  /* 463 — UNE TROUVAILLE VIVANTE A UNE CONSÉQUENCE VISIBLE. Avant ce contrôle,
     `resolveStarFound` réussissait parfaitement alors que les deux petites
     étoiles disparaissaient du monde : le banc mesurait le registre, pas ce
     que le joueur emmenait. La formation relit maintenant la table autoritaire
     et doit grandir exactement dans l'ordre des apprivoisements. */
  {
    const f = Q.newStar(); f.fall = 1;
    ok("une quête neuve n'a encore aucune étoile compagne", Q.starFollowers(f).length === 0);
    Q.resolveStarFound(f, "farmStarBlue", "j1", 1);
    ok("la petite bleue apprivoisée entre dans la formation",
       Q.starFollowers(f).map(s => s.id).join(",") === "farmStarBlue");
    ok("⚠️ la transition désigne bien la petite bleue pour son animation d'arrivée",
       Q.starFollowerAdded([], f)?.id === "farmStarBlue");
    Q.resolveStarFound(f, "farmStarRose", "j1", 2);
    ok("la petite rose agrandit la constellation sans remplacer la bleue",
       Q.starFollowers(f).map(s => s.id).join(",") === "farmStarBlue,farmStarRose");
    ok("⚠️ la transition suivante désigne la rose, jamais la première étoile",
       Q.starFollowerAdded(["farmStarBlue"], f)?.id === "farmStarRose");
    Q.resolveStarFound(f, "crater", "j1", 3);
    const followers = Q.starFollowers(f), queen = followers.filter(s => s.queen);
    ok("la reine rejoint les deux petites et reste la seule guide désignée",
       followers.length === 3 && queen.length === 1 && queen[0].id === "crater",
       followers.map(s => `${s.id}${s.queen ? "★" : ""}`).join(" · "));
    ok("⚠️ la même transition d'arrivée couvre enfin les TROIS étoiles",
       Q.starFollowerAdded(["farmStarBlue", "farmStarRose"], f)?.id === "crater"
       && Q.starFollowerAdded(followers.map(s => s.id), f) === null);
  }

  /* ╔═══════════════════════════════════════════════════════════════════════
     ║ ZIP 475 (audit 472, défaut #8) — LES TROIS ÉTATS D'UN IMPACT DE FERME.
     ╚═══════════════════════════════════════════════════════════════════════
     ⚠️⚠️ `farmImpacts` COUVRAIT PAS-FOUILLÉ, FOUILLÉ-ÉTOILE ET
     FOUILLÉ-MATIÈRE SOUS LA MÊME PHRASE (« fouille-les », sur un trou déjà
     ouvert). On rejoue les trois CONTENUS séparément — via `resolveStarDig`,
     jamais `resolveStarFound` en direct, sinon on saute exactement l'état
     intermédiaire qu'on veut mesurer — et on vérifie que le bandeau change
     ET que le chevron continue de désigner le même trou. */
  {
    const starSite = Q.STAR_SITE[Q.STAR_LIGHT_SITE];   // 479 — celle dont le verbe est la posture
    const matSite = Q.STAR_FARM_IMPACTS.find(s => s.content === "material");
    const emptySite = Q.STAR_FARM_IMPACTS.find(s => s.content === "empty");

    const eTame = Q.newStar(); eTame.fall = 1;
    ok("⚠️ un trou intact reste générique", Q.starGoalKey(eTame, {}) === "farmImpacts");
    Q.resolveStarDig(eTame, starSite.id, "j1", 1);
    Q.resolveStarCandy(eTame, "j1", Q.STAR_CANDY_PRICE, 1);   // 479 — la bourse, pas encore l'offrande
    /* ⚠️⚠️ ZIP 479 — LE TROU FOUILLÉ NE DIT PLUS « TOURNE-LUI LE DOS » AVANT
       L'OFFRANDE : la bleue veut sa lumière d'abord, et le bandeau doit dire ÇA.
       Ce contrôle mesure donc les trois états dans l'ordre du joueur, au lieu d'un
       seul — c'est le même geste qu'au 475 sur `farmImpacts`, un cran plus bas. */
    ok("⚠️⚠️ ZIP 479 — une bleue fouillée réclame d'abord sa lumière",
       Q.starGoalKey(eTame, {}) === "farmImpactLight");
    ok("…et dès qu'on a de quoi payer, elle dit d'aller la lui offrir",
       Q.starGoalKey(eTame, { candy: Q.STAR_CANDY_PRICE }) === "farmImpactLightPay");
    payBlue(eTame, "j1", 1);
    ok("⚠️⚠️ …et l'offrande faite, ALORS elle dit « tourne-lui le dos »",
       Q.starGoalKey(eTame, {}) === "farmImpactTame");
    ok("…et le chevron pointe toujours ce même trou, pas un autre",
       Q.starTargetSite(eTame, {}) === starSite.id);
    /* ⚠️ LE COMPTEUR DE PASTILLES SUIT LA MÊME RÈGLE QUE LE BANDEAU : la
       fouille remplit la pastille, pas la trouvaille (voir la note du pip
       dans `FermeGame.js`). Ce banc n'importe pas `FermeGame.js` (il est
       React), mais `starDug` est la fonction que le pip appelle désormais —
       la vérifier ICI, à l'instant précis où `dug` est vrai et `has` encore
       faux, c'est vérifier ce que le pip va lire pendant toute l'attente. */
    ok("⚠️⚠️ un trou fouillé compte déjà pour la pastille, avant même la taming",
       Q.starDug(eTame, starSite.id) === true && Q.starHas(eTame, starSite.id) === false);
    Q.resolveStarFound(eTame, starSite.id, "j1", 2);
    ok("…et l'apprivoisement referme l'objectif « tame »",
       Q.starGoalKey(eTame, {}) !== "farmImpactTame");

    const eCool = Q.newStar(); eCool.fall = 1;
    /* ⚠️ L'ORDRE DE LA TABLE FAIT FOI (même règle que le chevron) : la plaque
       n'est le PREMIER manquant que si les sites qui la précèdent dans
       `STAR_FARM_IMPACTS` sont déjà trouvés. On les règle donc d'abord. */
    for (const s of Q.STAR_FARM_IMPACTS) { if (s.id === matSite.id) break; Q.resolveStarFound(eCool, s.id, "j1", 1); }
    Q.resolveStarDig(eCool, matSite.id, "j1", 1);
    ok("⚠️⚠️ une plaque fouillée mais pas retravaillée dit « reviens l'examiner »",
       Q.starGoalKey(eCool, {}) === "farmImpactCool");
    ok("…et le chevron pointe toujours ce même trou, pas un autre",
       Q.starTargetSite(eCool, {}) === matSite.id);
    ok("⚠️ …et la pastille compte déjà cette plaque, avant le mini-jeu de la cendre",
       Q.starDug(eCool, matSite.id) === true && Q.starHas(eCool, matSite.id) === false);
    Q.resolveStarFound(eCool, matSite.id, "j1", 2);
    ok("…et le mini-jeu de la cendre referme l'objectif « cool »",
       Q.starGoalKey(eCool, {}) !== "farmImpactCool");

    const eEmpty = Q.newStar(); eEmpty.fall = 1;
    const rDig = Q.resolveStarDig(eEmpty, emptySite.id, "j1", 1);
    ok("⚠️ un cratère vide est `dug` ET `has` dans le MÊME geste (resolveStarDig)",
       Q.starDug(eEmpty, emptySite.id) && Q.starHas(eEmpty, emptySite.id) && rDig.found === "empty");
    ok("…donc il ne peut jamais faire retomber l'objectif sur « tame »/« cool »",
       Q.starGoalKey(eEmpty, {}) !== "farmImpactTame" && Q.starGoalKey(eEmpty, {}) !== "farmImpactCool");
  }

  const e = Q.newStar();
  ok("une quête pas tombée n'a pas d'objectif", Q.starGoalKey(e, {}) === null);
  e.fall = 1000;
  ok("…une fois tombée, l'objectif est la chasse aux impacts", Q.starGoalKey(e, {}) === "farmImpacts");
  findFarmImpacts(e, "j1", 1001);
  ok("…après les cinq sites, le bandeau laisse Valley Town venir naturellement",
     Q.starGoalKey(e, {}) === "townWait" && Q.starTargetSite(e, {}) === null);
  Q.resolveStarTownFall(e, 1010);
  ok("⚠️ le cratère BRÛLANT et le cratère FROID ne disent pas la même chose",
     Q.starGoalKey(e, { craterHot: true }) === "craterHot" && Q.starGoalKey(e, {}) === "craterFeed");
  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ 2026-09-02 (lot A) — L'ÉCHELLE DU CHAPITRE 2, BARREAU PAR BARREAU.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ C'EST LE CONTRÔLE QUI MANQUAIT AVANT CE LOT, et il vaut pour toute la
     famille : un bandeau qui saute un barreau envoie le joueur faire l'étape
     d'après, donc il le fait échouer en silence. On monte les quatre dans
     l'ordre, en passant par les VRAIS résolveurs, et on vérifie qu'aucun ne se
     court-circuite — en particulier qu'on ne peut pas se retourner (dernier
     barreau) sans avoir réveillé (troisième). */
  {
    const q = Q.newStar();
    q.fall = 1000; findFarmImpacts(q, "j1", 1001); Q.resolveStarTownFall(q, 1010);
    const t = q.townFall + Q.STAR_CRATER_COOL_MS + 500;
    const NEED = Q.starOfferPrice("crater");
    ok("⚠️ barreau 1/4 — à jeun, le bandeau envoie chercher la lumière",
       Q.starGoalKey(q, { candy: 0 }) === "craterFeed");
    ok("⚠️ barreau 2/4 — lumières en poche, il envoie les offrir",
       Q.starGoalKey(q, { candy: NEED }) === "craterFeedPay");
    ok("…et une poche presque pleine ne suffit pas (le prix est un seuil, pas un vœu)",
       Q.starGoalKey(q, { candy: NEED - 1 }) === "craterFeed");
    /* ⚠️ LE RACCOURCI QU'IL FAUT INTERDIRE : se tenir tranquille avant d'avoir
       payé. Le refus est SILENCIEUX (§3) et ne consomme AUCUNE tenue — sinon on
       aurait « je me suis tenu une minute pour rien », le défaut du 446. */
    const early = Q.resolveStarCalm(q, "j1", t, { alone: true, partner: "effigy" }, "crater");
    ok("⚠️⚠️ on ne tient pas compagnie à une étoile qu'on n'a pas nourrie",
       early.ok === false && early.unlit === true && Object.keys(q.calm).length === 0);
    Q.resolveStarCandy(q, "j1", NEED, t, 0);
    ok("⚠️ l'offrande passe, et elle coûte exactement son prix",
       Q.resolveStarLight(q, "j1", "crater", 999, t).ok === true
       && Q.starCandyFresh(q, "j1", t) === 0);
    ok("⚠️ barreau 3/4 — nourrie, le bandeau demande le réveil",
       Q.starGoalKey(q, { candy: 0 }) === "craterWake");
    /* ⚠️⚠️ ET LE SECOND RACCOURCI : nourrie mais endormie, la tenue ne compte
       toujours pas. C'est la garde qui rend la séquence en trois temps réelle —
       sans elle, `pair` (écrit avant ce lot) resterait le seul geste utile. */
    const asleep = Q.resolveStarCalm(q, "j1", t, { alone: true, partner: "effigy" }, "crater");
    ok("⚠️⚠️⚠️ on ne tient pas compagnie à une étoile qui DORT",
       asleep.ok === false && asleep.asleep === true && Object.keys(q.calm).length === 0);
    ok("⚠️ le réveil passe, et il est idempotent (double clic, rejeu de paquet)",
       Q.resolveStarWake(q, "j1", "crater", t).ok === true
       && Q.resolveStarWake(q, "j1", "crater", t).ok === false
       && Q.starWoke(q, "crater") === true);
    ok("⚠️ barreau 4/4 — réveillée, le bandeau revient à la posture",
       Q.starGoalKey(q, { candy: 0 }) === "crater");
    ok("…et la tenue compte enfin", Q.resolveStarCalm(q, "j1", t, { alone: true, partner: "effigy" }, "crater").ok === true);
    /* ⚠️ LES DEUX ÉTAGES TRAVERSENT LA MIGRATION — sinon ils seraient perdus à la
       PREMIÈRE requête de l'hôte, et le joueur repaierait ses 80 lumières sans
       comprendre. Même contrôle que pour l'épouvantail (479). */
    const q2 = Q.migrateStar(JSON.parse(JSON.stringify(q)));
    ok("⚠️⚠️ l'offrande ET le réveil traversent la migration",
       Q.starLit(q2, "crater") === true && Q.starWoke(q2, "crater") === true);
    /* ⚠️ ON NE PAIE PAS DEUX FOIS : une seconde offrande est refusée sans rien
       prélever. `starOfferPrice` est le seul endroit qui dise le prix — un test
       du VERBE (`light`) aurait laissé passer la reine, dont le verbe est `pair`. */
    Q.resolveStarCandy(q, "j1", NEED, t + 1, 0);
    const twice = Q.resolveStarLight(q, "j1", "crater", 999, t + 1);
    ok("⚠️ on ne nourrit pas deux fois la même étoile",
       twice.ok === false && twice.lit === true && Q.starCandyFresh(q, "j1", t + 1) === NEED);
    /* ⚠️⚠️ ET LE TROU BRÛLANT REFUSE L'OFFRANDE COMME IL REFUSE LA TENUE (446) :
       sans cette garde, on pourrait payer 80 lumières dans un cratère en fusion,
       c'est-à-dire dépenser sans que rien ne se passe à l'écran. */
    const hot = Q.newStar();
    hot.fall = 1000; findFarmImpacts(hot, "j1", 1001); Q.resolveStarTownFall(hot, 1010);
    Q.resolveStarCandy(hot, "j1", NEED, hot.townFall + 1000, 0);
    const paidHot = Q.resolveStarLight(hot, "j1", "crater", 999, hot.townFall + 1000);
    ok("⚠️⚠️ on n'offre rien à un trou en fusion, et rien n'est prélevé",
       paidHot.ok === false && paidHot.tooHot === true
       && Q.starCandyFresh(hot, "j1", hot.townFall + 1000) === NEED);
    ok("…et on ne réveille pas non plus ce qui brûle encore",
       Q.resolveStarWake(hot, "j1", "crater", hot.townFall + 1000).tooHot === true);
  }
  /* ⚠️ LES NOMBRES DU RÉVEIL SONT DE CLAUDE, PAS DE GUILLAUME (« tu jugeras ») :
     ce que le banc peut tenir n'est donc pas leur JUSTESSE — ça se joue — mais
     leur COHÉRENCE. Une bande hors de [0,1], une période qui passerait sous son
     plancher ou une jauge qui dépasserait 1 rendraient le geste injouable sans
     qu'aucune erreur ne se lève. */
  {
    ok("⚠️ la bande cible est dans la période, et elle a une largeur",
       Q.STAR_WAKE_BAND_A > 0 && Q.STAR_WAKE_BAND_B <= 1 && Q.STAR_WAKE_BAND_B > Q.STAR_WAKE_BAND_A,
       `${((Q.STAR_WAKE_BAND_B - Q.STAR_WAKE_BAND_A) * 100).toFixed(0)} % de la période`);
    ok("…et le battement ne compte que dedans",
       !Q.starWakeOnBeat(0) && !Q.starWakeOnBeat(Q.STAR_WAKE_BAND_A - 0.01)
       && Q.starWakeOnBeat((Q.STAR_WAKE_BAND_A + Q.STAR_WAKE_BAND_B) / 2)
       && !Q.starWakeOnBeat(1.0000001));
    let mono = true, prev = Infinity;
    for (let h = 0; h <= Q.STAR_WAKE_HITS; h++) {
      const p = Q.starWakePeriod(h);
      if (p > prev || p < Q.STAR_WAKE_MIN_MS) mono = false;
      prev = p;
    }
    ok("⚠️⚠️ le cœur ACCÉLÈRE sans jamais passer sous son plancher", mono,
       `${Q.starWakePeriod(0)} ms → ${Q.starWakePeriod(Q.STAR_WAKE_HITS)} ms (plancher ${Q.STAR_WAKE_MIN_MS})`);
    /* ⚠️ LA FENÊTRE EN MILLISECONDES EST CE QUE LE DOIGT RESSENT, pas la fraction :
       au battement le plus rapide elle doit rester au-dessus de 120 ms, sous quoi
       ce n'est plus du rythme mais de la chance (repère du mini-jeu du loup). */
    const tightest = Q.starWakePeriod(Q.STAR_WAKE_HITS) * (Q.STAR_WAKE_BAND_B - Q.STAR_WAKE_BAND_A);
    ok("⚠️⚠️ la fenêtre la plus serrée reste jouable au doigt", tightest >= 120,
       `${tightest.toFixed(0)} ms au dernier battement`);
    ok("⚠️ la lueur va de 0 (grise) à 1 (jaune), et elle est bornée",
       Q.starWakeGlow(0) === 0 && Q.starWakeGlow(Q.STAR_WAKE_HITS) === 1
       && Q.starWakeGlow(-5) === 0 && Q.starWakeGlow(Q.STAR_WAKE_HITS * 3) === 1);
    ok("…et elle monte à chaque battement, sans palier mort",
       Array.from({ length: Q.STAR_WAKE_HITS }, (_, i) => Q.starWakeGlow(i + 1) - Q.starWakeGlow(i)).every(d => d > 0));
  }
  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ 2026-09-03 (lot B) — LE POULS DE LA VRAIE COMPAGNE, PAS UN ÉCRAN DÉDIÉ.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️ Guillaume a tranché contre une scène 3D plein cadre : l'animation du
     réveil est le SPRITE RÉEL (`starWispSprite`, trois états rastérisés) qui
     change d'état et d'échelle. Trois fonctions pures, donc trois choses à
     falsifier : que l'état choisi existe vraiment dans le sprite (0/1/2, rien
     d'autre), que le pouls de frappe reste un pouls (borné, pas une dérive), et
     que le pouls de succès s'éteint tout seul sans qu'on ait à le fermer. */
  {
    const states = Array.from({ length: Q.STAR_WAKE_HITS + 1 }, (_, h) => Q.starWakeCompanionState(h));
    ok("⚠️ l'état choisi est toujours l'un des trois dessins du sprite (0/1/2)",
       states.every((s) => s === 0 || s === 1 || s === 2), states.join(","));
    ok("…gris (2) au premier battement, jaune (0) au dernier",
       Q.starWakeCompanionState(0) === 2 && Q.starWakeCompanionState(Q.STAR_WAKE_HITS) === 0);
    ok("…et il ne RECULE jamais vers le gris à mesure qu'on réussit",
       states.every((s, i) => i === 0 || s <= states[i - 1]));
    let worstPulse = 0;
    for (let h = 0; h <= Q.STAR_WAKE_HITS; h++)
      for (let p = 0; p <= 1; p += 0.05)
        worstPulse = Math.max(worstPulse, Math.abs(Q.starWakeCompanionPulse(p, h) - 1));
    ok("⚠️ le pouls de frappe reste un POULS, jamais un bond (≤ 10 % de taille)",
       worstPulse <= 0.10, `écart max ${(worstPulse * 100).toFixed(1)} %`);
    ok("…et il est neutre en tout début de battement (phase 0)",
       Math.abs(Q.starWakeCompanionPulse(0, Q.STAR_WAKE_HITS) - 1) < 1e-9);
    ok("⚠️⚠️ le pouls de SUCCÈS s'éteint tout seul, sans qu'on doive le fermer",
       Q.starWakeCompanionPop(-1) === null
       && Q.starWakeCompanionPop(Q.STAR_WAKE_POP_MS) === null
       && Q.starWakeCompanionPop(Q.STAR_WAKE_POP_MS * 4) === null
       && Q.starWakeCompanionPop(0) !== null
       && Q.starWakeCompanionPop(Q.STAR_WAKE_POP_MS - 1) !== null);
    ok("…toujours au dessin le plus jaune (0) tant qu'il joue",
       [0, 100, 500, 900, Q.STAR_WAKE_POP_MS - 1].every((t) => Q.starWakeCompanionPop(t).state === 0));
    let worstPop = 0;
    for (let t = 0; t < Q.STAR_WAKE_POP_MS; t += 10) worstPop = Math.max(worstPop, Math.abs(Q.starWakeCompanionPop(t).scale - 1));
    /* ⚠️ FALSIFICATION (§10 de CLAUDE.md) : ON CASSE EXPRÈS. Un pouls sans
       amortissement (`Math.exp` retiré) donnerait un écart qui ne redescend
       JAMAIS — la ligne suivante le prouve avant de faire confiance à celle
       du dessus, qui doit au contraire trouver un écart petit à la fin. */
    const noDecay = 1 + 0.35 * Math.cos(((Q.STAR_WAKE_POP_MS - 1) / Q.STAR_WAKE_POP_MS) * Math.PI * 2.2);
    ok("⚠️ falsification : un pouls SANS amortissement resterait grand à la fin (le vrai doit être petit)",
       Math.abs(noDecay - 1) > 0.05 && Math.abs(Q.starWakeCompanionPop(Q.STAR_WAKE_POP_MS - 1).scale - 1) < 0.05,
       `cassé : ${Math.abs(noDecay - 1).toFixed(2)} — réel : ${Math.abs(Q.starWakeCompanionPop(Q.STAR_WAKE_POP_MS - 1).scale - 1).toFixed(3)}`);
    ok("⚠️ le pouls de succès reste un pouls, pas une explosion (≤ 50 % de taille)",
       worstPop <= 0.50, `écart max ${(worstPop * 100).toFixed(1)} %`);
  }
  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ 2026-09-02 (lot A2) — LA DISCRÈTE : SA CACHETTE ET SA RÈGLE.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️ CE QUI SE MESURE ICI EST CE QUI N'A PAS DE NAVIGATEUR : le CRÉNEAU (une
     pure fonction du temps partagé) et la RÈGLE (on ne la trouve pas avant la
     reine). Son domaine, lui, se dérive de la carte dans `FermeGame.js` et se
     regarde sur la planche de `render-etoile` — deux choses qu'un banc pur ne
     peut pas juger, et le dire vaut mieux que faire semblant. */
  {
    const e0 = Q.newStar(); e0.fall = 1000;
    findFarmImpacts(e0, "j1", 1001); Q.resolveStarTownFall(e0, 1010);
    const T0 = e0.townFall;
    /* ── 1. LA RÈGLE : PAS AVANT LA REINE. C'est elle qui apprend au joueur que la
       discrète existe ; sans cette garde, un joueur qui passerait par hasard sur sa
       case l'apprivoiserait avant d'en avoir entendu parler, et le chapitre perdrait
       sa raison d'être. */
    const tooSoon = Q.resolveStarSpot(e0, "j1", T0 + 1000, "Alice");
    ok("⚠️⚠️ on ne démasque pas la discrète avant d'avoir la reine",
       tooSoon.ok === false && tooSoon.noQueen === true && !Q.starHas(e0, "townShy"));
    Q.resolveStarFound(e0, "crater", "Alice", T0 + 2000);
    const got = Q.resolveStarSpot(e0, "j1", T0 + 3000, "Alice");
    ok("…et une fois la reine sortie, un simple E suffit", got.ok === true && Q.starHas(e0, "townShy"));
    ok("⚠️ elle porte le nom du joueur, pas son identifiant",
       e0.found.townShy && e0.found.townShy.by === "Alice", `${e0.found.townShy && e0.found.townShy.by}`);
    ok("⚠️ et le geste est idempotent (double clic, rejeu de paquet)",
       Q.resolveStarSpot(e0, "j1", T0 + 3100, "Alice").ok === false);
    /* ── 2. ELLE FERME LE CHAPITRE 2, DERRIÈRE LA REINE. C'est la décision de
       structure du lot : le seuil de la septième sœur est « reine ET six étoiles ».
       ⚠️ ET LE BANDEAU DOIT LA NOMMER ENTRE LES DEUX — sans quoi elle serait une
       condition que rien ne pousse le joueur à remplir (444, cinq lieux
       inatteignables). */
    {
      const q = Q.newStar(); q.fall = 1000;
      findFarmImpacts(q, "j1", 1001); Q.resolveStarTownFall(q, 1010);
      Q.resolveStarFound(q, "crater", "j1", q.townFall + 2000);
      ok("⚠️⚠️ la reine sortie, le bandeau annonce la discrète — pas encore l'ingénieur",
         Q.starGoalKey(q, { inTown: true }) === "townShy"
         && Q.starGoalKey(q, { inTown: false }) === "townShyAway",
         `${Q.starGoalKey(q, { inTown: true })} / ${Q.starGoalKey(q, { inTown: false })}`);
      ok("⚠️ et le chevron mène à la PLACE, jamais à elle (sinon il n'y a plus de chasse)",
         Q.STAR_GOAL_TARGET.townShy === "shyPlaza" && Q.STAR_GOAL_TARGET.townShyAway === "shyPlaza");
      ok("…le chapitre 2 n'est donc pas fini", Q.starMissing(q).includes("townShy"));
      Q.resolveStarSpot(q, "j1", q.townFall + 3000, "j1");
      Q.starAdvance(q);
      /* ⚠️⚠️ 2026-09-03 (lot A3) — LA VERTE S'INTERCALE ICI, ET CE CONTRÔLE A
         CHANGÉ DE PHRASE PLUTÔT QUE DE DISPARAÎTRE : ce qu'il tient n'est pas
         « l'ingénieur parle après la discrète », c'est *le bandeau ne saute
         personne*. Une fois la discrète démasquée, il annonce la sœur suivante ;
         l'ingénieur, lui, attend qu'elles y soient toutes. */
      ok("⚠️⚠️ …et une fois démasquée, le bandeau passe à la verte, pas à l'ingénieur",
         Q.starGoalKey(q, { inTown: true }) === "townGreen"
         && Q.starGoalKey(q, { inTown: false }) === "townGreenAway",
         `${Q.starGoalKey(q, { inTown: true })} / ${Q.starGoalKey(q, { inTown: false })}`);
      Q.resolveStarTrack(q, "j1", q.townFall + 4000, "j1");
      Q.starAdvance(q);
      /* ⚠️⚠️⚠️ 2026-09-03 (lot C) — CE CONTRÔLE A CHANGÉ DE PHRASE UNE SECONDE
         FOIS, MÊME RAISON QU'AU 2026-09-03 (LOT A3) JUSTE AU-DESSUS : *le
         bandeau ne saute personne.* Les six compagnes réunies, la reine parle
         D'ABORD de la septième — l'ingénieur attend qu'elle ait été vue, pas
         seulement que les six premières le soient. */
      ok("⚠️⚠️ …et une fois les deux trouvées, LA REINE PARLE DE LA SEPTIÈME AVANT L'INGÉNIEUR",
         Q.starGoalKey(q, { inTown: true }) === "evilSeek");
      Q.resolveStarEvilFound(q, q.townFall + 5000);
      ok("⚠️ …et une fois qu'on l'a vue, l'ingénieur reprend enfin la parole exactement où il l'avait",
         Q.starGoalKey(q, { inTown: true }) === "engineer");
    }
    /* ── 3. LE CRÉNEAU. Deux clients qui comptent depuis la MÊME date de l'hôte
       tombent sur la même planque ; c'est ce qui permet de ne rien diffuser. */
    ok("⚠️ le créneau part de la chute du météore, pas de l'horloge locale",
       Q.starShySlot(e0, T0) === 0 && Q.starShySlot(e0, T0 + Q.STAR_SHY_PERIOD_MS + 1) === 1
       && Q.starShySlot({}, T0) === 0);
    ok("…et il ne recule jamais",
       Q.starShySlot(e0, T0 - 99999) === 0 && Q.starShySlot(e0, T0 + 10 * Q.STAR_SHY_PERIOD_MS) === 10);
    /* ⚠️⚠️ ELLE NE TOURNE PAS EN ROND, ET C'EST LA RAISON DU HACHÉ. `slot % n` la
       ferait passer par les planques toujours dans le même ordre : un joueur qui a
       fait la quête une fois saurait où regarder. On balaie deux cents créneaux sur
       une liste réaliste et on exige qu'aucune planque ne soit ni oubliée, ni
       privilégiée au point de la rendre prévisible. */
    {
      const N = 24, seen = new Array(N).fill(0);
      let cycles = 0;
      for (let k = 0; k < 200; k++) {
        seen[Q.starShyPick(N, k)]++;
        if (Q.starShyPick(N, k) === Q.starShyPick(N, k + N)) cycles++;
      }
      const used = seen.filter(v => v > 0).length;
      const max = Math.max(...seen);
      ok("⚠️⚠️ elle passe par presque toutes les planques, sans en privilégier une",
         used >= N * 0.7 && max <= 200 / N * 4,
         `${used}/${N} planques visitées en 200 créneaux, la plus fréquente ${max} fois`);
      ok("⚠️ …et sa tournée ne se répète pas à la période de la liste",
         cycles < 200 * 0.25, `${cycles} coïncidences sur 200`);
    }
    /* ⚠️ UNE LISTE D'UNE SEULE PLANQUE NE DOIT PAS PLANTER NI SORTIR DE SES BORNES :
       une ville dégénérée (toutes les cases occupées sauf une) reste jouable. */
    {
      let bad = 0;
      for (const n of [1, 2, 3, 7, 40]) for (let k = 0; k < 60; k++) {
        const i = Q.starShyPick(n, k);
        if (!(i >= 0 && i < n && Number.isInteger(i))) bad++;
      }
      ok("⚠️ l'indice reste toujours dans la liste, quelle qu'en soit la taille", bad === 0);
    }
    /* ⚠️ ELLE S'ASSIED PARFOIS, PAS TOUJOURS — « parfois sur un banc, parfois
       circulant normalement » (Guillaume). Un tiers est le réglage ; ce qui compte
       est que les deux cas EXISTENT, sinon la moitié de la consigne est morte. */
    {
      let sits = 0;
      for (let k = 0; k < 300; k++) if (Q.starShySits(k)) sits++;
      ok("⚠️⚠️ elle s'assied parfois et marche parfois (les deux cas existent)",
         sits > 60 && sits < 240, `assise sur ${sits} créneaux sur 300`);
    }
  }

/* ═══════════════════════════════════════════════════════════════════════════
   2026-09-03 (lot A3) — LA CINQUIÈME SŒUR, « LA VERTE ». ON LA FAIT MARCHER.
   ═══════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ CE BLOC JOUE, IL NE RELIT PAS. La discrète TIRE sa planque à chaque
   créneau : un tirage se relit. La verte MARCHE — son état au créneau 300 est le
   produit de trois cents décisions —, et la seule chose qui puisse dire si elle
   reste locale, si elle couvre son quartier et si elle ne tourne pas en rond est
   de la faire marcher.
   ⚠️ ELLE MARCHE SUR UN GRAPHE FABRIQUÉ, PAS SUR VALLEY TOWN, et c'est le partage
   voulu : `quete.js` ne connaît pas la carte (`FermeGame.js` lui passe une table
   d'adjacence). Le banc n'a donc pas à générer une ville pour éprouver la règle —
   et il peut fabriquer les cas qu'une vraie carte ne produit jamais (un buisson
   isolé, une liste d'un seul élément).
   ═══════════════════════════════════════════════════════════════════════════ */
section("Lot A3 — la verte : sa marche, ses indices, sa trouvaille");
{
  /* Une grille de buissons 6×6, voisins jusqu'à deux cases : c'est l'ordre de
     grandeur d'un quartier de la ville (216 buissons dans `TOWN_CORE`, groupés). */
  const GRID = 6, N = GRID * GRID;
  const at = (i) => ({ x: i % GRID, y: Math.floor(i / GRID) });
  const neigh = Array.from({ length: N }, (_, i) => {
    const a = at(i), out = [];
    for (let j = 0; j < N; j++) {
      if (j === i) continue;
      const b = at(j);
      if (Math.hypot(a.x - b.x, a.y - b.y) <= 2) out.push(j);
    }
    return out;
  });

  /* ── 1. LE CRÉNEAU ET LE VOL. ⚠️ ELLE NE COURT PAS AU CRÉNEAU 0 : il n'y a pas
     de buisson d'où venir, et un vol depuis nulle part serait une apparition. */
  {
    const e = { townFall: 1000 };
    const s0 = Q.starGreenSlot(e, 1000);
    const s1 = Q.starGreenSlot(e, 1000 + Q.STAR_GREEN_PERIOD_MS + 10);
    const s1b = Q.starGreenSlot(e, 1000 + Q.STAR_GREEN_PERIOD_MS + Q.STAR_GREEN_MOVE_MS + 10);
    ok("⚠️ le créneau part de la chute du météore, comme celui de la discrète",
       s0.slot === 0 && s1.slot === 1 && Q.starGreenSlot({}, 5000).slot === 0);
    ok("⚠️⚠️ elle ne court pas au tout premier créneau (elle viendrait de nulle part)",
       s0.moving === false);
    ok("⚠️ elle court au DÉBUT du créneau, puis elle est posée pour le reste",
       s1.moving === true && s1.k < 1 && s1b.moving === false);
    ok("…et le créneau ne recule jamais",
       Q.starGreenSlot(e, -50000).slot === 0
       && Q.starGreenSlot(e, 1000 + 10 * Q.STAR_GREEN_PERIOD_MS).slot === 10);
    ok("⚠️ le vol est court devant le créneau (on la voit passer, on ne l'attend pas)",
       Q.STAR_GREEN_MOVE_MS * 12 < Q.STAR_GREEN_PERIOD_MS,
       `${Q.STAR_GREEN_MOVE_MS} ms de vol pour ${Q.STAR_GREEN_PERIOD_MS} ms de créneau`);
  }

  /* ── 2. ⚠️⚠️⚠️ ELLE NE SE TÉLÉPORTE JAMAIS. C'est LA demande de Guillaume, et
     c'est la seule propriété de ce lot qu'une relecture ne peut pas voir : elle
     porte sur la SUITE des positions, pas sur une position. */
  {
    let jumps = 0, moves = 0, bad = 0;
    let prev = Q.starGreenWalk(neigh, 0);
    for (let k = 1; k <= 400; k++) {
      const cur = Q.starGreenWalk(neigh, k);
      if (cur < 0 || cur >= N) { bad++; prev = cur; continue; }
      if (cur !== prev) { moves++; if (!neigh[prev].includes(cur)) jumps++; }
      prev = cur;
    }
    ok("⚠️⚠️⚠️ elle ne va JAMAIS que d'un buisson à un buisson voisin (aucune téléportation)",
       jumps === 0 && bad === 0, `${moves} déplacements sur 400 créneaux, ${jumps} sauts illégaux`);
    ok("…et elle bouge vraiment (une marche qui n'avance pas serait une planque fixe)",
       moves > 300, `${moves} déplacements sur 400 créneaux`);
  }

  /* ── 3. DEUX CLIENTS TOMBENT SUR LE MÊME BUISSON. C'est ce qui autorise à ne
     rien diffuser : la marche est une pure fonction du temps partagé. */
  {
    let same = 0;
    for (let k = 0; k < 200; k++) if (Q.starGreenWalk(neigh, k) === Q.starGreenWalk(neigh, k)) same++;
    ok("⚠️ deux lectures du même créneau rendent le même buisson (rien à diffuser)", same === 200);
  }

  /* ── 4. ELLE COUVRE SON QUARTIER SANS TOURNER EN ROND. ⚠️ MÊME EXIGENCE QUE LA
     DISCRÈTE, pour la même raison : un joueur qui a fait la quête une fois ne doit
     pas savoir où regarder. Ici le risque est plus grand — une marche peut se
     piéger dans deux buissons qui se renvoient la balle. */
  {
    const seen = new Array(N).fill(0);
    for (let k = 0; k < 600; k++) seen[Q.starGreenWalk(neigh, k)]++;
    const used = seen.filter(v => v > 0).length;
    const max = Math.max(...seen);
    ok("⚠️⚠️ elle passe par presque tous les buissons, sans camper sur un seul",
       used >= N * 0.8 && max <= (600 / N) * 4,
       `${used}/${N} buissons visités en 600 créneaux, le plus fréquent ${max} fois`);
    /* ⚠️⚠️ ET SA TOURNÉE NE SE RÉPÈTE PAS, même contrôle que pour la discrète et
       même raison : c'est ce qui interdit un `slot % n` déguisé. Une marche qui
       repasserait par les mêmes buissons dans le même ordre serait apprenable en
       une partie, et la seconde chasse ne serait plus une chasse. */
    let cycles = 0;
    for (let k = 0; k < 400; k++) if (Q.starGreenWalk(neigh, k) === Q.starGreenWalk(neigh, k + N)) cycles++;
    ok("⚠️ …et sa tournée ne se répète pas à la période de la liste",
       cycles < 400 * 0.25, `${cycles} coïncidences sur 400`);
  }

  /* ── 5. LES CAS DÉGÉNÉRÉS. ⚠️ UN BUISSON SANS VOISIN NE LA PERD PAS : elle y
     reste, ce qui est la seule réponse honnête (la faire sauter ailleurs serait la
     téléportation qu'on s'interdit). Et une carte absente rend −1, jamais une
     exception : le §4 dit qu'on ACCEPTE au lieu de refuser. */
  {
    const lonely = [[], []];                      // deux buissons, aucun voisin
    let bad = 0;
    for (let k = 0; k < 50; k++) { const i = Q.starGreenWalk(lonely, k); if (i !== Q.starGreenWalk(lonely, 0)) bad++; }
    ok("⚠️ un buisson sans voisin la garde (elle ne saute pas au hasard)", bad === 0);
    ok("⚠️ une carte sans buisson rend −1 au lieu de planter", Q.starGreenWalk([], 12) === -1
       && Q.starGreenWalk(null, 12) === -1);
    let out = 0;
    for (const n of [1, 2, 5, 30]) {
      const g = Array.from({ length: n }, (_, i) => [(i + 1) % n].filter(j => j !== i));
      for (let k = 0; k < 40; k++) { const i = Q.starGreenWalk(g, k); if (!(i >= 0 && i < n)) out++; }
    }
    ok("⚠️ l'indice reste dans la liste quelle qu'en soit la taille", out === 0);
  }

  /* ── 6. ⚠️⚠️ LA MARCHE EST BORNÉE, ET ON LE VÉRIFIE EN LA POUSSANT LOIN. Une
     sauvegarde reprise trois jours plus tard demande le créneau 3 500 ; sans borne,
     cette boucle tournerait des dizaines de milliers de fois PAR IMAGE. */
  {
    /* ⚠️⚠️ LE CRÉNEAU EST ÉNORME EXPRÈS (deux cents millions, soit un demi-siècle
       de jeu), ET C'EST CE QUI REND CE CONTRÔLE FALSIFIABLE : à 500 000, une marche
       SANS borne rend la même réponse en trente millisecondes, donc le contrôle
       serait vert des deux côtés — c'est-à-dire un contrôle qui ne peut pas échouer
       (§10 de `CLAUDE.md`). Vérifié en retirant la borne : il rougit. */
    const t0 = Date.now();
    const far = Q.starGreenWalk(neigh, 200000000);
    const ms = Date.now() - t0;
    ok("⚠️⚠️ un créneau très lointain reste instantané et dans les bornes",
       far >= 0 && far < N && ms < 100, `créneau 200 000 000 → buisson ${far} en ${ms} ms`);
    ok("…et il reste déterministe (les deux clients tombent au même endroit)",
       Q.starGreenWalk(neigh, 200000000) === far);
  }

  /* ── 7. LE REMUEMENT DU BUISSON — L'INDICE PREMIER. ⚠️⚠️ IL DOIT S'ARRÊTER : un
     feuillage qui remuerait sans jamais se taire redeviendrait un décor animé, donc
     un décor qu'on ne regarde plus. Et il doit rester DISCRET devant le frisson
     d'un passant, sinon il se lit comme quelqu'un qui marche dedans. */
  {
    let peak = 0, quiet = 0;
    const STEP = 17;
    for (let t = 0; t < 20000; t += STEP) {
      const v = Math.abs(Q.starGreenSway(t));
      if (v > peak) peak = v;
      if (v < 0.05) quiet++;
    }
    const n = Math.ceil(20000 / STEP);
    ok("⚠️⚠️ le buisson remue par bouffées et se tait entre elles",
       quiet > n * 0.25 && quiet < n * 0.9, `${Math.round(quiet * 100 / n)} % du temps au repos`);
    ok("⚠️ il reste plus discret que le frisson d'un passant (sinon on lit un piéton)",
       peak <= C.TOWN_BUSH_SWAY_PX * 0.75 && peak > 0.8,
       `${peak.toFixed(2)} px contre ${C.TOWN_BUSH_SWAY_PX} px pour un passant`);
    ok("⚠️ et c'est une pure fonction du temps (les deux clients voient la même chose)",
       Q.starGreenSway(1234) === Q.starGreenSway(1234) && Q.starGreenSway(0) === 0);
  }

  /* ── 8. CHAUD/FROID. ⚠️⚠️ LA SEULE PROPRIÉTÉ QUI COMPTE EST LA MONOTONIE : un
     indice qui refroidirait en s'approchant serait pire que pas d'indice, et c'est
     très exactement le genre de faute qu'une relecture ne voit pas. */
  {
    const rank = ["burning", "hot", "warm", "cold", "icy"];
    let bad = 0, prev = 0;
    for (let d = 0; d <= 120; d += 0.25) {
      const r = rank.indexOf(Q.starGreenTemp(d));
      if (r < 0 || r < prev) bad++;
      prev = r;
    }
    const covered = new Set();
    for (let d = 0; d <= 120; d += 0.25) covered.add(Q.starGreenTemp(d));
    ok("⚠️⚠️ la température ne se réchauffe jamais quand on s'éloigne", bad === 0);
    ok("⚠️ et les cinq paliers existent vraiment (aucun n'est inatteignable)",
       covered.size === 5, [...covered].join(", "));
    ok("⚠️ « brûlant » se lit à portée de l'invite, jamais plus loin qu'un écran",
       Q.starGreenTemp(Q.STAR_GREEN_NEAR) === "burning" && Q.starGreenTemp(60) === "icy");
  }

  /* ── 9. LE CAP. ⚠️ CONVENTION D'ÉCRAN DU PROJET : `y` croît vers le BAS, donc un
     `dy` positif est le SUD. C'est la même que `starNerveFace`, et l'inverser
     enverrait le joueur exactement à l'opposé — une faute qu'aucun test de « ça
     rend une chaîne » n'attraperait. */
  {
    ok("⚠️⚠️ le sud est en bas (la convention d'écran du projet, pas celle des maths)",
       Q.starGreenBearing(0, 5) === "s" && Q.starGreenBearing(0, -5) === "n"
       && Q.starGreenBearing(5, 0) === "e" && Q.starGreenBearing(-5, 0) === "w");
    ok("…et les diagonales tombent bien entre les deux",
       Q.starGreenBearing(4, 4) === "se" && Q.starGreenBearing(-4, -4) === "nw"
       && Q.starGreenBearing(4, -4) === "ne" && Q.starGreenBearing(-4, 4) === "sw");
    const caps = new Set();
    for (let a = 0; a < 360; a += 3) caps.add(Q.starGreenBearing(Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)));
    ok("⚠️ les huit caps sont atteignables (aucun secteur mort)", caps.size === 8, [...caps].join(" "));
  }

  /* ── 10. ⚠️⚠️⚠️ LES INDICES SONT UNE RESSOURCE PARTAGÉE, ET C'EST LA DEMANDE DE
     GUILLAUME (« deux fois, cumulé entre les joueurs »). À deux, deux indices ne
     doivent pas en faire quatre : la coopération AIDE, elle ne DISPENSE pas. */
  {
    const e = Q.newStar(); e.fall = 1000; e.townFall = 2000;
    ok("⚠️ sans la reine, la reine ne dit rien (elle n'a pas encore parlé d'elle)",
       Q.resolveStarHint(e, "townGreen", "j1", 3000).noQueen === true
       && Q.starHintsUsed(e, "townGreen") === 0);
    Q.resolveStarFound(e, "crater", "j1", 3000);
    const a = Q.resolveStarHint(e, "townGreen", "j1", 3100);
    const b = Q.resolveStarHint(e, "townGreen", "j2", 3200);      // l'AUTRE joueur
    const c = Q.resolveStarHint(e, "townGreen", "j1", 3300);
    ok("⚠️⚠️ deux indices « chaud/froid », puis elle mène — et le compte est COMMUN aux joueurs",
       a.ok && a.tier === "temp" && b.ok && b.tier === "temp" && c.ok && c.tier === "guide",
       `${a.tier} (j1), ${b.tier} (j2), ${c.tier} (j1)`);
    ok("…et il annonce ce qui reste, pour que le joueur sache ce qu'il dépense",
       a.left === Q.STAR_GREEN_HINTS - 1 && b.left === 0 && c.left === 0,
       `${a.left}, ${b.left}, ${c.left}`);
    ok("⚠️ une fois le guidage acquis, il le reste (redemander ne le reprend pas)",
       Q.resolveStarHint(e, "townGreen", "j2", 3400).tier === "guide"
       && Q.starHintsUsed(e, "townGreen") === 4);
    /* ⚠️ LE COMPTE SURVIT À LA MIGRATION : sans ça, l'hôte re-migrant l'état deux
       fois par seconde rendrait les deux indices à chaque tour, et personne ne
       verrait jamais la reine mener. C'est la troncature de clé du 469, prise à
       l'avance. */
    ok("⚠️⚠️ le compte traverse la sauvegarde (l'hôte re-migre deux fois par seconde)",
       Q.starHintsUsed(Q.migrateStar(JSON.parse(JSON.stringify(e))), "townGreen") === 4);
    ok("⚠️ une sauvegarde d'avant ce lot commence avec ses deux indices",
       Q.starHintsUsed(Q.migrateStar({ ch: 0 }), "townGreen") === 0);
  }

  /* ── 11. LA TROUVAILLE. ⚠️ MÊME CONTRAT QUE LA DISCRÈTE : l'hôte tient la règle
     (pas avant la reine), le client tient la géométrie. ⚠️⚠️ ET ELLE NE SE GARDE
     PAS SUR LA DISCRÈTE — Guillaume : « on peut tout à fait trouver la 6 sur le
     chemin, et faire la 5 après la 6 », donc l'inverse doit marcher aussi. */
  {
    const e = Q.newStar(); e.fall = 1000; e.townFall = 2000;
    findFarmImpacts(e, "j1", 1001);
    ok("⚠️ pas avant la reine (c'est elle qui apprend qu'elle existe)",
       Q.resolveStarTrack(e, "j1", 2500, "Alice").noQueen === true && !Q.starHas(e, "townGreen"));
    Q.resolveStarFound(e, "crater", "j1", 3000);
    const got = Q.resolveStarTrack(e, "j1", 3100, "Alice");
    ok("⚠️⚠️ …et on peut la trouver AVANT la discrète (l'ordre n'est pas imposé)",
       got.ok === true && Q.starHas(e, "townGreen") && !Q.starHas(e, "townShy"));
    ok("⚠️ elle porte le nom du joueur, pas son identifiant",
       e.found.townGreen && e.found.townGreen.by === "Alice", `${e.found.townGreen && e.found.townGreen.by}`);
    ok("⚠️ et le geste est idempotent (double appui, rejeu de paquet)",
       Q.resolveStarTrack(e, "j1", 3200, "Alice").ok === false);
    ok("⚠️ une étoile trouvée ne se cherche plus (plus d'indice à demander)",
       Q.resolveStarHint(e, "townGreen", "j1", 3300).already === true);
    ok("⚠️⚠️ elle devient une compagne verte, comme les cinq autres",
       Q.starFollowers(e).some(s => s.id === "townGreen" && s.color === "green"));
  }

  /* ── 12. LA JOINTURE. ⚠️ Un verbe neuf plutôt qu'un second `spot` : `STAR_VERB_SITE`
     rend le PREMIER lieu d'un verbe, donc deux `spot` auraient fait passer la verte
     pour la discrète dans toute jointure qui lit cette table. */
  {
    ok("⚠️ son verbe est `track` et il ne désigne qu'elle",
       Q.starVerbOf("townGreen") === "track" && Q.STAR_VERB_SITE.track === "townGreen"
       && Q.STAR_VERB_SITE.spot === "townShy");
    ok("⚠️⚠️ elle est dans le `need` du chapitre 2 (sinon rien ne pousse à la chercher)",
       Q.STAR_CHAPTERS[1].need.includes("townGreen"));
    ok("⚠️ le bandeau la nomme APRÈS la discrète, jamais avant",
       Q.STAR_CHAPTERS[1].need.indexOf("townGreen") > Q.STAR_CHAPTERS[1].need.indexOf("townShy"));
    ok("⚠️⚠️ et le chevron ne la désigne pas (sinon il n'y a plus de chasse)",
       Q.STAR_GOAL_TARGET.townGreen === undefined && Q.STAR_GOAL_TARGET.townGreenAway === undefined
       && Q.STAR_GOAL_TARGET.townGreenLed === "townGreen");
  }
}
  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ ON JOUE LE RÉVEIL. C'EST LE TROISIÈME BANC DU DÉPÔT QUI JOUE UNE MÉCANIQUE.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ `verify-maire` (480) et `verify-scierie` (lot E) ont chacun sorti des
     défauts de RÉGLAGE qu'aucune relecture n'aurait vus, parce qu'ils JOUENT au
     lieu de relire une table. Le réveil est une mécanique neuve, inventée de bout
     en bout, avec des nombres que personne n'a encore éprouvés à la main : c'est
     très exactement le cas où jouer paie.
     ⚠️ IL JOUE LES VRAIES FONCTIONS (`starWakeAdvance`/`starWakeStrike`, sorties de
     `FermeGame.js` pour cette raison), donc ce qu'il mesure est ce que le joueur
     touchera — pas un modèle qui divergerait au premier réglage.
     ⚠️ LE PAS EST IRRÉGULIER (11 à 21 ms), comme une vraie boucle de rendu : à pas
     fixe, un défaut de bornage se cacherait derrière un diviseur rond. */
  {
    const fresh = () => ({ phase: 0, hits: 0, beats: 0, flash: 0, miss: 0 });
    /* Un joueur qui frappe DANS la bande, dès qu'il la voit. */
    const play = (strategy, maxMs) => {
      let st = fresh(), t = 0, presses = 0, seed = 7;
      while (t < (maxMs || 60000)) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;      // pas de Math.random : rejouable au bit près
        const dt = 11 + (seed % 11);
        const before = st.phase;
        const nx = Q.starWakeAdvance(st, dt);
        t += dt;
        if (nx.gone) return { won: false, gone: true, t, presses, hits: st.hits };
        st = nx;
        if (strategy(st, before, t)) {
          presses++;
          const sk = Q.starWakeStrike(st);
          st = { ...st, ...sk };
          if (sk.won) return { won: true, t, presses, hits: st.hits };
        }
      }
      return { won: false, t, presses, hits: st.hits };
    };
    /* ── 1. LE JEU PARFAIT GAGNE, ET EN COMBIEN DE TEMPS. C'est le repère que
       Guillaume jugera en jouant : si ce nombre dérive, le geste a changé de
       nature sans que personne l'ait décidé. */
    const perfect = play((st) => Q.starWakeOnBeat(st.phase));
    ok("⚠️⚠️ EN FRAPPANT DANS LA BANDE, ELLE SE RÉVEILLE — et sans un appui de trop",
       perfect.won && perfect.presses === Q.STAR_WAKE_HITS,
       `${(perfect.t / 1000).toFixed(1)} s, ${perfect.presses} appuis pour ${Q.STAR_WAKE_HITS} battements`);
    ok("…et le geste dure entre quatre et douze secondes (ni un réflexe, ni une corvée)",
       perfect.t > 4000 && perfect.t < 12000,
       `${(perfect.t / 1000).toFixed(1)} s`);
    /* ── 2. ⚠️⚠️⚠️ LE MARTÈLEMENT NE GAGNE PAS, ET C'EST LA RAISON D'ÊTRE DE CE
       BLOC. C'est la première chose qu'un joueur essaie, c'est ce que la phrase
       d'aide annonce, et c'est ce qui distingue ce geste du mini-jeu du loup. Un
       jour où la pénalité disparaîtrait, tout le reste resterait vert. */
    for (const hz of [8, 12, 20]) {
      let last = -1;
      const mash = play((st, before, t) => { const k = Math.floor(t / (1000 / hz)); if (k === last) return false; last = k; return true; }, 30000);
      ok(`⚠️⚠️⚠️ marteler à ${hz} appuis/s ne la réveille PAS`, !mash.won,
         `${mash.presses} appuis, ${mash.hits} battements placés en ${(mash.t / 1000).toFixed(0)} s`);
    }
    /* ── 3. NE RIEN FAIRE REFERME L'ANNEAU, et vite : il ne doit pas rester à
       battre au-dessus d'un trou que le joueur a quitté des yeux. */
    const idle = play(() => false, 30000);
    ok("⚠️ sans un seul appui, l'anneau s'efface tout seul", idle.gone && idle.t < 5000,
       `${(idle.t / 1000).toFixed(1)} s`);
    /* ── 4. UN JOUEUR MOYEN — il vise, il rate une fois sur trois — s'en sort quand
       même. Une mécanique qu'on ne gagne qu'en étant parfait n'est pas du rythme,
       c'est une punition ; et personne ne s'en apercevrait en jouant deux minutes. */
    {
      /* ⚠️⚠️ ON COMPTE LES PASSAGES DANS LA BANDE, PAS LES IMAGES — et la première
         écriture faisait l'inverse. La bande dure ~180 ms, soit une douzaine
         d'images : « rater une fois sur trois » appliqué par IMAGE laissait deux
         chances sur trois à chaque image, donc le joueur « maladroit » frappait
         quand même au premier passage, à la milliseconde près du joueur parfait
         (5,7 s et 8 appuis pour les deux — c'est ce doublon suspect qui l'a
         trahi). Un contrôle qui rejoue le cas d'à côté ne mesure rien. */
      let pass = 0, armed = true;
      const sloppy = play((st) => {
        if (!Q.starWakeOnBeat(st.phase)) { armed = true; return false; }
        if (!armed) return false;
        armed = false;                                          // une seule décision par passage
        pass++;
        return pass % 3 !== 0;                                  // il en laisse vraiment passer un sur trois
      }, 60000);
      ok("⚠️⚠️ un joueur qui laisse passer un battement sur trois y arrive quand même", sloppy.won,
         `${(sloppy.t / 1000).toFixed(1)} s, ${sloppy.presses} appuis pour ${Q.STAR_WAKE_HITS} battements`);
    }
    /* ── 5. UN GROS `dt` NE SAUTE PAS LE GESTE. Un onglet qui revient au premier
       plan rend plusieurs secondes d'un coup ; sans le bornage de `starWakeAdvance`,
       il ferait franchir trois battements à vide et l'anneau s'effacerait tout seul,
       sur un joueur qui n'a rien lâché (§10 : l'onglet masqué est un vrai cas). */
    {
      const st = Q.starWakeAdvance(fresh(), 9000);
      ok("⚠️⚠️ neuf secondes d'un coup n'effacent pas l'anneau (onglet revenu au premier plan)",
         !st.gone && st.beats <= 1, `${st.beats} battement(s) écoulé(s)`);
    }
    /* ── 6. LES DEUX FONCTIONS NE MUTENT RIEN. C'est le défaut du 2026-08-31 (une
       table de référence étalée à plat puis lissée en place) : aucun symptôme sur
       le moment, et l'état de départ corrompu à la première image. */
    {
      const st0 = fresh(); st0.phase = 0.85;
      const copy = JSON.stringify(st0);
      Q.starWakeAdvance(st0, 40); Q.starWakeStrike(st0);
      ok("⚠️⚠️ avancer et frapper ne MODIFIENT pas l'état reçu", JSON.stringify(st0) === copy,
         "l'appelant garde la main sur son état");
    }
  }
  /* ⚠️⚠️ ZIP 471 — « TOMBÉ CHEZ L'HÔTE » ≠ « TOMBÉ CHEZ CE CLIENT ». Vu à l'écran
     par Guillaume : le bandeau annonçait « le trou brûle à l'est de Valley
     Town » à un joueur resté à la ferme, qui n'avait donc rien vu tomber — la
     chute de `e.townFall` ci-dessus se diffuse à tout le monde instantanément,
     mais `starScenePump` (FermeGame.js) ne met la scène en file que pour un
     client physiquement en ville. `ctx.landed` est CE que ce client a vu ; sans
     lui (ancien appelant), le repli reste le fait brut de l'hôte — c'est
     `craterHot` juste au-dessus, qui n'en fournit pas et doit donc continuer de
     suivre `e.townFall`. */
  ok("⚠️⚠️ un joueur qui n'a pas vu la chute lit toujours « poursuis l'enquête », jamais « ça brûle »",
     Q.starGoalKey(e, { craterHot: true, landed: false }) === "townWait"
     && Q.starTargetSite(e, { craterHot: true, landed: false }) === null);
  ok("…et dès que ce client a vu l'impact, il retrouve le cratère brûlant",
     Q.starGoalKey(e, { craterHot: true, landed: true }) === "craterHot"
     && Q.starGoalKey(e, { landed: true }) === "craterFeed");
  Q.resolveStarFound(e, "crater", "j1", 1002); findSisters(e, 1002);
  /* ⚠️⚠️ ZIP 454 — LA RENCONTRE ENVOIE À LA MAIRIE, ET LE BANDEAU LE DIT AVANT
     TOUT LE RESTE. C'est la consigne « le rôle des étoiles est de nous guider dans
     le projet » réduite à sa plus petite forme vérifiable : au sortir du cratère,
     et tant que personne n'a demandé l'ingénieur, l'objectif EST l'ingénieur. */
  ok("⚠️⚠️ à peine sortie du trou, l'étoile envoie chercher un ingénieur",
     Q.starGoalKey(e, {}) === "engineer");
  /* ⚠️⚠️ ZIP 469 — L'OBJECTIF SUIT LE CHANTIER, PLUS LES OMBRES. Ce contrôle
     mesurait « le bandeau change à l'intérieur d'un chapitre » sur les deux
     écoutes d'ombres, supprimées ; la même propriété se mesure maintenant sur les
     DEUX états de la construction, et c'est plus utile — c'est là que se joue
     désormais toute la seconde moitié de la quête. */
  /* ⚠️⚠️⚠️ ZIP 470 — `engineerWait` ÉTAIT UNE SEULE PHRASE POUR DEUX PHASES, ET
     C'ÉTAIT LE DÉFAUT SIGNALÉ PAR GUILLAUME : le bandeau disait « il dessine sur
     la grève » pendant les trois minutes où l'ingénieur est encore dans le
     train. `engineerHere` vient de `Q.starEngineerHere`, exactement comme le
     vrai appelant (`FermeGame.js`) le calcule — jamais une horloge inventée ici
     (§10 : un banc qui invente son cycle de vie mesure un jeu que personne ne
     joue). */
  e.plan = { at: 1002, by: "j1", done: 0 };
  ok("⚠️ pendant le train, le bandeau dit qu'il est en route, pas qu'il dessine",
     Q.starGoalKey(e, { engineerHere: Q.starEngineerHere(e, 1002) }) === "engineerTravel",
     String(Q.starGoalKey(e, { engineerHere: Q.starEngineerHere(e, 1002) })));
  const engArrived = 1002 + C.STAR_ENG_TRAVEL_MS + 1;
  ok("⚠️ une fois arrivé, le bandeau dit qu'il travaille près du pier",
     Q.starGoalKey(e, { engineerHere: Q.starEngineerHere(e, engArrived) }) === "engineerWork",
     String(Q.starGoalKey(e, { engineerHere: Q.starEngineerHere(e, engArrived) })));
  e.plan = { at: 1002, by: "j1", done: 1002 };
  /* ⚠️⚠️⚠️ ZIP 480 — ET LE BANDEAU PASSE PAR LA MAIRIE AVANT TRISTAN. Les plans
     rendus ne suffisent plus : la cale est sur le quai municipal, donc l'étape
     suivante est l'audience. On le VÉRIFIE au lieu de le contourner — c'était
     exactement le piège du 472 (une chaîne dont le banc saute un maillon ne peut
     plus voir ce que ce maillon casse). */
  ok("⚠️⚠️ ZIP 480 — les plans rendus renvoient d'abord à la MAIRIE, pas chez Tristan",
     Q.starGoalKey(e, {}) === "mayor" && Q.starTargetSite(e, {}) === "townHall",
     `${Q.starGoalKey(e, {})} → ${Q.starTargetSite(e, {})}`);
  ok("…et aucune pièce n'est commandable tant que personne n'a signé",
     Q.STAR_SHIP_KEYS.every(k => Q.starTimberBlock(e, k) === "noMayor"));
  signMayor(e, 1003);
  /* ⚠️⚠️ ZIP 478 — TROIS ÉTATS, TROIS CLÉS, ET ON LES REJOUE DANS L'ORDRE OÙ ELLES
     ARRIVENT plutôt que d'en tester une seule : c'est le contrôle qui aurait manqué
     au 475 si `farmImpacts` avait été scindé sans rejouer la suite. */
  ok("…et les plans rendus renvoient chez le bûcheron", Q.starGoalKey(e, {}) === "timberOrder");
  Q.commitStarTimber(e, "hull", "j1", 1100);
  ok("⚠️ …puis le bandeau dit qu'il scie, et il ne renvoie plus commander",
     Q.starGoalKey(e, {}) === "timberWait");
  Q.resolveStarTimberTick(e, 1100 + C.STAR_TIMBER.hull.ms);
  ok("⚠️⚠️ …et dès qu'une pièce est livrée, il envoie sur la CALE, pas chez Tristan",
     Q.starGoalKey(e, {}) === "timberRaise" && Q.STAR_GOAL_TARGET.timberRaise === "shipyard",
     `${Q.starGoalKey(e, {})} -> ${Q.STAR_GOAL_TARGET[Q.starGoalKey(e, {})]}`);
  Q.resolveStarTimberRaise(e, "hull", "j1", 1200 + C.STAR_TIMBER.hull.ms);
  ok("…et une fois posée, il renvoie commander la suite", Q.starGoalKey(e, {}) === "timberOrder");

  /* ⚠️⚠️ LA JOINTURE, ET C'EST LE CONTRÔLE QUI JUSTIFIE TOUTE LA SECTION : quand
     le chevron désigne un lieu, le bandeau doit parler DE CE LIEU. Deux sources
     pour « où vais-je » est la forme exacte de « une porte sans chemin de code
     ment » (444) — sauf qu'ici les deux avaient l'air justes. On rejoue la quête
     entière, trouvaille par trouvaille, et on compare à chaque pas. */
  /* ⚠️⚠️ ZIP 454 — LE CONTRÔLE A CHANGÉ DE FORME PARCE QUE LE CODE A CHANGÉ DE
     FORME, ET C'EST LE BANC QUI L'A EXIGÉ. Il comparait deux lectures INDÉPENDANTES
     (« le premier manquant » contre « le premier manquant qui a une position ») et
     il est passé au rouge dès que le 454 a ajouté deux objectifs qui ne sont pas des
     lieux de la table — la mairie et l'atelier du bûcheron. La bonne réponse n'était
     pas d'excuser ces deux cas (« se donner un périmètre et excuser ce qui déborde »,
     le deuxième visage du défaut de banc), c'était de DÉRIVER le chevron du bandeau.
     Ce qu'on mesure désormais est donc autre chose : que la traduction objectif →
     adresse soit TOTALE (aucun objectif ne tombe dans le vide sans qu'on l'ait dit)
     et que rien ne pointe vers un lieu dont la phrase ne parle pas. */
  {
    const e2 = Q.newStar(); e2.fall = 1;
    e2.plan = { at: 1, by: "j1", done: 1 };     // sinon l'objectif « ingénieur » couvre tout le chapitre 2
    let checked = 0, bad = [];
    for (let guard = 0; guard < 24; guard++) {
      const tgt = Q.starTargetSite(e2, {});
      const goal = Q.starGoalKey(e2, {});
      const want = goal ? (Q.STAR_GOAL_TARGET[goal] || goal) : null;
      const groupedImpact = goal === "farmImpacts" && Q.STAR_SITE[tgt] && Q.STAR_SITE[tgt].spot === "starFarmImpact";
      if (tgt && tgt !== want && !groupedImpact) bad.push(`${goal || "∅"}→${tgt}`);
      if (tgt) checked++;
      const miss = Q.starMissing(e2);
      if (!miss.length) break;
      Q.resolveStarFound(e2, miss[0], "j1", 10 + guard);
    }
    /* ⚠️ ZIP 469 — LE SEUIL PASSE DE 6 À 3 ÉTATS COMPARÉS, ET C'EST UN CHIFFRE
       QU'IL FAUT REGARDER : la table a perdu sept lieux, donc la quête traverse
       beaucoup moins d'états où le chevron désigne quelque chose. Le garder à 6
       aurait fait échouer un banc juste ; le retirer aurait laissé passer un
       scanner qui ne compare RIEN (§10 : un banc qui n'a jamais pu échouer). */
    ok("⚠️⚠️ le bandeau et le chevron désignent TOUJOURS le même lieu",
       bad.length === 0 && checked >= 3, bad.join(" ") || `${checked} états comparés`);
    /* ⚠️ ET LA TRADUCTION EST TOTALE : chaque objectif possible mène soit à un lieu
       de la table, soit à une adresse NOMMÉE, soit à rien — et « rien » n'est
       acceptable que pour les trois objectifs qui n'ont délibérément pas de place
       (les deux écoutes d'ombres, l'attente de l'ingénieur). Sans ce contrôle, un
       objectif ajouté plus tard pointerait silencieusement dans le vide. */
    {
      /* 2026-09-02 (lot A) — `craterFeed` REJOINT LA LISTE, ET IL FAUT SAVOIR
         POURQUOI : « il te manque des lumières » n'envoie pas au cratère, il
         envoie à la COURSE DE FUITE, qui n'est pas un lieu de la carte. C'est
         exactement le partage de `farmImpactLight` (chercher) contre
         `farmImpactLightPay` (rapporter) — et ce second-là, `craterFeedPay`, a
         bien une adresse : le trou. */
      /* ⚠️⚠️ 2026-09-03 (lot A3) — `townGreenAway` REJOINT LA LISTE, ET C'EST LA
         RAISON ÉCRITE QUE CE CONTRÔLE RÉCLAME : la verte n'a AUCUNE adresse tant
         qu'on ne l'a pas payée de deux indices. Lui en donner une (le parc, le
         cœur de ville) aurait inventé un domaine annoncé, c'est-à-dire refait la
         chasse de la discrète. `townGreen` et `townGreenLed`, eux, ne sont pas
         ici : ils DÉSIGNENT le lieu `townGreen` de la table, dont la position est
         nulle tant que la reine ne mène pas (voir `starTargetPos`) — et c'est un
         état du jeu, pas un trou dans la table. */
      const NOWHERE = ["townWait", "townWaitThere", "engineerTravel", "engineerWork", "craterFeed", "townGreenAway"];   // 469 — les deux écoutes d'ombres sont parties ; 470 — une clé d'attente devient deux ; hors-zip — townWait se scinde en deux phrases, ni l'une ni l'autre n'a de lieu
      const orphan = Q.STAR_GOAL_KEYS.filter(k => {
        /* ⚠️ ZIP 475 — `farmImpactTame`/`farmImpactCool` DÉSIGNENT LE MÊME
           TROU QUE `farmImpacts` (voir `starTargetSite`) : les trois clés
           passent par la même jointure groupée, aucune des trois n'est
           orpheline. */
        if (k.startsWith("farmImpact")) return false;
        const id = Q.STAR_GOAL_TARGET[k] || k;
        if (Q.STAR_OFF_TABLE_TARGETS.includes(id)) return false;
        const s = Q.STAR_SITE[id];
        return !(s && s.spot && s.spot[0] !== "*") && !NOWHERE.includes(k);
      });
      ok("⚠️ chaque objectif a une adresse, ou une raison écrite de n'en pas avoir",
         orphan.length === 0, orphan.join(" ") || `${Q.STAR_GOAL_KEYS.length} objectifs traduits`);
    }
    /* Et le seul endroit où le chevron se tait DOIT être couvert par une phrase :
       c'est le moment où le joueur n'a rien d'autre (§ `spot: "*lean"`). */
    /* ⚠️ ZIP 469 — LE SEUL ENDROIT OÙ LE CHEVRON SE TAIT A CHANGÉ DE PLACE : ce
       n'est plus l'écoute des ombres, c'est l'ATTENTE DE L'INGÉNIEUR (quinze
       minutes réelles pendant lesquelles il n'y a nulle part où aller). La règle
       est la même : quand le chevron se tait, le bandeau doit parler. */
    const e3 = Q.newStar(); e3.fall = 1;
    e3.plan = { at: 1, by: "j1", done: 0 };
    findFarmImpacts(e3, "j1", 2); Q.resolveStarTownFall(e3, 5); Q.resolveStarFound(e3, "crater", "j1", 10); findSisters(e3, 10);
    ok("⚠️ pas de chevron pendant que l'ingénieur voyage…", Q.starTargetSite(e3, {}) === null);
    ok("…mais le bandeau, lui, dit quoi faire",
       Q.starGoalKey(e3, { engineerHere: Q.starEngineerHere(e3, 10) }) === "engineerTravel");
  }

  /* ── LE POINT DU MENEUR. Pure, donc mesurable — c'est la raison pour laquelle
     elle est dans `quete.js` et pas dans la closure de `drawPetsFor`. */
  const line = []; for (let i = 0; i <= 20; i++) line.push({ x: i, y: 0 });
  ok("un chemin vide ne rend pas de point", Q.starGuidePoint([], 0, 0, 3) === null);
  {
    const p = Q.starGuidePoint(line, 0, 0, 3);
    ok("le meneur se place à l'avance demandée", p && Math.abs(p.x - 3) < 0.001 && !p.end,
       p ? `x=${p.x.toFixed(2)}` : "null");
  }
  {
    /* ⚠️ IL REPART DU NŒUD LE PLUS PROCHE, JAMAIS DU DÉBUT : sans ça, un joueur
       au milieu du chemin verrait son chien revenir au point de départ, c'est-à-
       dire lui tourner le dos — un guide qui recule est pire que pas de guide. */
    const p = Q.starGuidePoint(line, 12, 0, 3);
    ok("⚠️ il repart du nœud le plus proche du joueur", p && Math.abs(p.x - 15) < 0.001,
       p ? `x=${p.x.toFixed(2)}` : "null");
  }
  {
    const p = Q.starGuidePoint(line, 19, 0, 6);
    ok("un chemin plus court que l'avance fait attendre au bout", p && p.end === true && Math.abs(p.x - 20) < 0.001);
  }
  {
    /* ⚠️⚠️ L'INVARIANT, ET IL VAUT PLUS QUE LES TROIS CAS AU-DESSUS : le meneur
       est TOUJOURS plus près du but que le joueur. C'est la seule chose qu'on
       veuille vraiment de ce guide, et c'est la seule qui ne dépende ni de la
       carte, ni de l'avance réglée, ni de la forme du chemin. On balaie toutes
       les positions de départ et toutes les avances. */
    let bad = 0, tot = 0;
    const goal = line[line.length - 1];
    for (let s = 0; s <= 20; s += 0.5) {
      for (const ah of [0.5, 1.4, 2.8, 5]) {
        const p = Q.starGuidePoint(line, s, 0, ah); tot++;
        if (!p) { bad++; continue; }
        const dMe = Math.hypot(goal.x - s, goal.y - 0), dHim = Math.hypot(goal.x - p.x, goal.y - p.y);
        if (dHim > dMe + 1e-6) bad++;
      }
    }
    ok("⚠️⚠️ le meneur n'est JAMAIS plus loin du but que le joueur", bad === 0, `${tot - bad}/${tot} cas`);
  }
  /* ── LE DÉPART SPONTANÉ. ⚠️ C'EST UNE RÈGLE DE TEMPS, donc une fonction pure et
     un banc de LOGIQUE : un banc de rendu ne peut pas la voir (leçon du 448). */
  ok("il ne part pas spontanément avant l'heure", Q.starGuideAuto(Q.STAR_GUIDE_STUCK_MS - 1, false) === false);
  ok("…il part quand ça traîne", Q.starGuideAuto(Q.STAR_GUIDE_STUCK_MS, false) === true);
  ok("⚠️ …et il ne se rejoue pas sur le même objectif", Q.starGuideAuto(Q.STAR_GUIDE_STUCK_MS * 9, true) === false);
  ok("⚠️ il s'arrête AVANT le but (il ne joue pas à la place du joueur)",
     Q.STAR_GUIDE_ARRIVE > 0 && Q.STAR_GUIDE_ARRIVE < Q.STAR_GUIDE_LEASH,
     `arrêt à ${Q.STAR_GUIDE_ARRIVE}, laisse à ${Q.STAR_GUIDE_LEASH}`);
  ok("⚠️ l'avance tient dans la laisse", Q.STAR_GUIDE_AHEAD < Q.STAR_GUIDE_LEASH,
     `avance ${Q.STAR_GUIDE_AHEAD} < laisse ${Q.STAR_GUIDE_LEASH}`);
  {
    const src = fs.readFileSync(path.join(ROOT, "components", "ferme", "FermeGame.js"), "utf8");
    const a = src.indexOf("function starCompanionsAt(");
    const b = src.indexOf("function starVoiceCompanion(", a);
    const formation = a >= 0 && b > a ? src.slice(a, b) : "";
    const pets0 = src.indexOf("function drawPetsFor(");
    const pets1 = src.indexOf("function draw", pets0 + 20);
    const pets = pets0 >= 0 && pets1 > pets0 ? src.slice(pets0, pets1) : "";
    ok("⚠️⚠️ le chevron déplace la REINE, jamais un familier",
       /queen && lead/.test(formation) && /guide \? lead\.x/.test(formation)
       && pets.length > 500 && !/starGuideAim\(/.test(pets),
       `${formation.length} signes de formation · ${pets.length} signes de familiers lus`);
    ok("⚠️ la reine est visiblement plus grande que les petites",
       /scale: queen \? 1 : 0\.82/.test(formation)
       && /cp\.queen && sprites\.starWispQueen/.test(src));
    ok("⚠️⚠️ le `climb` vise l'étoile nouvellement apprivoisée, pas seulement la reine",
       /s\.id === joining\.id && join/.test(formation) && !/if \(queen && join\)/.test(formation));
  }
}

{
  ok("⚠️ la bulle guidante reste opaque pendant sa lecture",
     Q.starBubbleAlpha(1000, 2000, false) === 1);
  const mid = Q.starBubbleAlpha(2450, 2000, false);
  ok("⚠️ puis elle disparaît par FONDU, pas en une image", mid > 0 && mid < 1, `alpha ${mid.toFixed(2)}`);
  ok("⚠️ une bulle expirée reste cachée sans interaction",
     Q.starBubbleAlpha(4000, 2000, false) === 0);
  ok("⚠️⚠️ le survol d'une étoile rappelle la dernière bulle expirée",
     Q.starBubbleAlpha(4000, 2000, true) === 1);
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOT C (2026-09-03) — LE LAC MALÉFIQUE : DÉBLOCAGE, PRIORITÉ, HASARD DE LA
   CANNE.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ CE QUI A ÉTÉ TROUVÉ EN ÉCRIVANT CE BANC, PAS EN LE RELISANT : donner à
   `evilSeek` la priorité sur tout le bandeau une fois débloqué a fait ROUGIR
   dix contrôles existants (« pendant le train... », « ZIP 480 — les plans
   rendus... ») — ils construisaient tous un chantier naval en cours sans
   jamais dire que la septième sœur avait déjà été vue, ce que la vraie partie
   garantit toujours (le seuil est « six compagnes réunies », donc `e.ch`
   n'atteint le chapitre final que lorsque `findSisters` vient d'être appelé).
   `findSisters` marque désormais `evilFound` — voir sa note plus haut — et
   c'est ce correctif, pas un contournement de ces dix contrôles, qui les a
   fait revenir au vert. */
section("Lot C — le lac maléfique (découverte, chevron, hasard de la canne)");
{
  /* ── LE DÉBLOCAGE. Avant les six compagnes, rien ; après, tout de suite. */
  {
    const e = Q.newStar();
    ok("⚠️ pas débloqué sur une quête neuve", !Q.starEvilUnlocked(e));
    ok("…et la révélation refuse (`tooEarly`)",
       Q.resolveStarEvilFound(e, 1).tooEarly === true && !Q.starEvilFound(e));
    armFall(e); findFarmImpacts(e, "banc", 2); Q.resolveStarTownFall(e, 10);
    Q.resolveStarFound(e, "crater", "banc", 11);
    ok("⚠️ la reine seule ne suffit pas (il manque encore deux compagnes)",
       !Q.starEvilUnlocked(e));
    findSisters(e, 12);
    ok("⚠️⚠️ les six compagnes réunies débloquent le lac — ET LA MARQUENT DÉJÀ VUE",
       Q.starEvilUnlocked(e) && Q.starEvilFound(e),
       "findSisters() a délibérément appelé resolveStarEvilFound (voir sa note)");
  }
  /* ── LA RÉVÉLATION, JOUÉE À LA MAIN CETTE FOIS (sans passer par findSisters),
     pour vérifier resolveStarEvilFound isolément : idempotente, datée, refusée
     avant le seuil — le même contrat que resolveStarFound/resolveStarDig. */
  {
    const e = Q.newStar();
    armFall(e); findFarmImpacts(e, "banc", 2); Q.resolveStarTownFall(e, 10);
    Q.resolveStarFound(e, "crater", "banc", 11);
    Q.resolveStarSpot(e, "banc", 12, "banc"); Q.resolveStarTrack(e, "banc", 12, "banc");
    ok("⚠️ pile au seuil, la révélation est possible", Q.starEvilUnlocked(e) && !Q.starEvilFound(e));
    const r1 = Q.resolveStarEvilFound(e, 999);
    ok("⚠️⚠️ première révélation : acceptée, datée", r1.ok && !r1.already && e.evilFound === 999);
    const r2 = Q.resolveStarEvilFound(e, 1500);
    ok("…deuxième joueur qui l'approche : idempotente, la date ne bouge pas",
       r2.ok && r2.already === true && e.evilFound === 999);
  }
  /* ── LA PRIORITÉ DU BANDEAU. `evilSeek` passe devant tout le chantier naval
     tant qu'on ne l'a pas vue, et lui rend la main dès qu'on l'a vue — les dix
     contrôles plus haut dans ce fichier vérifient déjà le second demi (via
     `findSisters`) ; celui-ci vérifie le PREMIER, qu'aucun autre contrôle du
     dépôt ne couvrait avant ce lot. */
  {
    const e = Q.newStar();
    armFall(e); findFarmImpacts(e, "banc", 2); Q.resolveStarTownFall(e, 10);
    Q.resolveStarFound(e, "crater", "banc", 11);
    Q.resolveStarSpot(e, "banc", 12, "banc"); Q.resolveStarTrack(e, "banc", 12, "banc");
    ok("⚠️⚠️ débloquée mais pas encore vue : le bandeau ET le chevron pointent le lac, PAS l'ingénieur",
       Q.starGoalKey(e, {}) === "evilSeek" && Q.starTargetSite(e, {}) === "evilLake",
       `${Q.starGoalKey(e, {})} → ${Q.starTargetSite(e, {})}`);
    Q.resolveStarEvilFound(e, 13);
    ok("⚠️⚠️⚠️ une fois vue, la clé ne revient JAMAIS : le chantier naval reprend le bandeau",
       Q.starGoalKey(e, {}) === "engineer",
       Q.starGoalKey(e, {}));
    /* Falsification : sans le garde `!starEvilFound(e)` dans starGoalKey, cette
       dernière assertion redeviendrait "evilSeek" pour toujours — vérifié en
       commentant la condition le temps de l'écrire, remis en place ensuite. */
  }
  /* ── LE HASARD DE LA CANNE (E.evilRodBroken, fermeEngine.js) : DÉRIVÉ D'UN
     SEUL HORODATAGE HÔTE, JAMAIS UN SECOND CHAMP « broken ». */
  {
    ok("⚠️ une canne jamais armée n'est jamais cassée", !E.evilRodBroken({ evilRodArmedAt: 0 }, 999999));
    ok("⚠️ juste armée, elle tient encore", !E.evilRodBroken({ evilRodArmedAt: 1000 }, 1000 + C.EVIL_ROD_BREAK_MS - 1));
    ok("⚠️⚠️ PILE au délai, elle a cassé (>=, pas >)", E.evilRodBroken({ evilRodArmedAt: 1000 }, 1000 + C.EVIL_ROD_BREAK_MS));
    ok("…et elle reste cassée bien après", E.evilRodBroken({ evilRodArmedAt: 1000 }, 1000 + C.EVIL_ROD_BREAK_MS * 50));
    /* Falsification du garde du §3 de CLAUDE.md : `now` doit être l'horloge de
       QUI LIT — si le calcul comparait deux fermiers entre eux (une confusion
       facile vu que `evilRodArmedAt` est HÔTE), un fermier récemment rejoint
       avec une horloge locale en retard verrait sa canne "réparée" toute seule. */
    ok("⚠️⚠️⚠️ `now` PLUS PETIT QUE l'armement ne casse RIEN (repli sûr, pas une horloge qui recule)",
       !E.evilRodBroken({ evilRodArmedAt: 5000 }, 100));
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   LE HALAGE (2026-09-04) — RAMENER LA SEPTIÈME SŒUR À LA RIVE.
   ───────────────────────────────────────────────────────────────────────────
   `evilHaulStep` est une simulation pure (état d'avant, un pas de temps, si le
   joueur tient -> état d'après), donc un banc peut la REJOUER — pas seulement
   vérifier une formule au repos. Trois politiques de joueur, comme
   `verify-scierie` en tient pour la scie : un joueur qui lâche à temps, un
   joueur qui ne lâche jamais, et un dt aberrant (onglet revenu au premier
   plan). La première doit gagner en un temps raisonnable ; la deuxième doit
   soit ne jamais gagner, soit mettre nettement plus longtemps — sinon la
   tension ne sert à rien, et c'est exactement le genre de mécanique morte que
   ce fichier existe pour attraper (voir l'en-tête).
   ═══════════════════════════════════════════════════════════════════════════ */
section("Le halage — tirer l'étoile hors de l'eau");
{
  const DT = 1 / 60; // un pas d'image, comme la vraie boucle de jeu
  /* Joue evilHaulStep jusqu'à la victoire ou jusqu'à `maxSteps`, avec une
     politique de tenue donnée. Retourne {steps, won, slips} — jamais l'état
     interne seul, pour que l'appelant puisse mesurer un TEMPS, pas une
     formule. */
  function playHaul(holdPolicy, maxSteps) {
    let s = { progress: 0, tension: 0, lockMs: 0 };
    let slips = 0;
    for (let i = 0; i < maxSteps; i++) {
      const holding = holdPolicy(s, i);
      s = Q.evilHaulStep(s, DT, holding);
      if (s.slipped) slips++;
      if (s.won) return { steps: i + 1, won: true, slips };
    }
    return { steps: maxSteps, won: false, slips };
  }
  /* ── LA MÉCANIQUE, AU REPOS. */
  {
    const s0 = Q.evilHaulStep({ progress: 0, tension: 0, lockMs: 0 }, DT, false);
    ok("⚠️ relâché d'entrée : ni progression ni tension", s0.progress === 0 && s0.tension === 0 && !s0.slipped);
    const s1 = Q.evilHaulStep({ progress: 0, tension: 0, lockMs: 0 }, DT, true);
    ok("⚠️ tenir fait avancer LES DEUX (progression ET tension)", s1.progress > 0 && s1.tension > 0);
    const s2 = Q.evilHaulStep({ progress: 0.4, tension: 0.6, lockMs: 0 }, DT, false);
    ok("⚠️⚠️ relâcher fait retomber la tension SANS reculer la progression",
       s2.tension < 0.6 && s2.progress === 0.4);
    ok("…et la tension retombe plus vite qu'elle ne monte (un bref relâchement suffit)",
       (0.6 - s2.tension) > (s1.tension - 0));
  }
  /* ── LA GLISSADE, PILE AU SEUIL. */
  {
    // Tension déjà à 1 - epsilon : UNE image de tenue en plus doit la faire
    // franchir 1 et glisser, jamais rester juste en dessous indéfiniment.
    const near = 1 - C.EVIL_HAUL_TENSION_RISE * DT * 0.5;
    const s = Q.evilHaulStep({ progress: 0.5, tension: near, lockMs: 0 }, DT, true);
    ok("⚠️⚠️ franchir 1 de tension glisse : progression amputée, tension retombée, verrou posé",
       s.slipped && s.progress < 0.5 && s.tension === C.EVIL_HAUL_SLIP_TENSION && s.lockMs === C.EVIL_HAUL_SLIP_LOCK_MS,
       `progress ${s.progress.toFixed(3)}, tension ${s.tension}, lockMs ${s.lockMs}`);
    ok("⚠️⚠️⚠️ LA GLISSADE NE FAIT JAMAIS RECULER SOUS ZÉRO (bornée, pas juste soustraite)",
       Q.evilHaulStep({ progress: 0.02, tension: 1, lockMs: 0 }, DT, true).progress >= 0);
  }
  /* ── LE VERROU APRÈS GLISSADE : tenir ne fait RIEN tant qu'il n'est pas
     écoulé — sinon la glissade ne coûterait qu'un nombre, jamais un temps. */
  {
    const slipped = { progress: 0.3, tension: C.EVIL_HAUL_SLIP_TENSION, lockMs: C.EVIL_HAUL_SLIP_LOCK_MS };
    const still = Q.evilHaulStep(slipped, DT, true);
    ok("⚠️⚠️ verrouillé : tenir n'avance NI la progression NI la tension (relâché de force)",
       still.progress === slipped.progress && still.tension < slipped.tension,
       `progress ${still.progress}, tension ${still.tension.toFixed(3)} (était ${slipped.tension})`);
    const past = Q.evilHaulStep({ progress: 0.3, tension: 0.1, lockMs: 0 }, DT, true);
    ok("…verrou écoulé : tenir refonctionne normalement", past.progress > 0.3);
  }
  /* ── UN dt ABERRANT (onglet revenu au premier plan, §10 de CLAUDE.md) NE
     TÉLÉPORTE PAS LA PROGRESSION : borné à 0,25 s, comme un tick de jeu
     normal, jamais les cinq secondes réelles qu'un onglet masqué peut
     accumuler d'un coup. */
  {
    const huge = Q.evilHaulStep({ progress: 0, tension: 0, lockMs: 0 }, 5, true);
    const capped = Q.evilHaulStep({ progress: 0, tension: 0, lockMs: 0 }, 0.25, true);
    ok("⚠️⚠️⚠️ dt=5s produit EXACTEMENT le même résultat qu'un dt=0,25s borné",
       Math.abs(huge.progress - capped.progress) < 1e-9 && Math.abs(huge.tension - capped.tension) < 1e-9,
       `dt=5s -> progress ${huge.progress.toFixed(4)} ; dt=0.25s -> ${capped.progress.toFixed(4)}`);
  }
  /* ── JOUÉ JUSQU'AU BOUT : un joueur qui lâche avant que la tension ne
     morde gagne, dans un temps qui reste « un effort soutenu », pas une
     corvée ni un réflexe éclair. Politique volontairement simple (bascule
     à deux seuils) — ce n'est pas un modèle de joueur réaliste, c'est un
     témoin reproductible. */
  {
    let holding = true;
    const patient = (s) => {
      if (holding && s.tension > 0.82) holding = false;
      else if (!holding && s.tension < 0.12) holding = true;
      return holding;
    };
    const r = playHaul(patient, 3600); // 60 s de jeu au plus
    ok("⚠️⚠️ UN JOUEUR QUI LÂCHE À TEMPS GAGNE, EN MOINS DE 30 S DE JEU",
       r.won && r.steps / 60 < 30,
       `gagné en ${(r.steps / 60).toFixed(1)} s, ${r.slips} glissade(s)`);
  }
  /* ── FALSIFICATION : SANS RELÂCHER JAMAIS, ÇA NE VAUT RIEN — la leçon du
     §10 de CLAUDE.md (« on casse exprès la règle que le banc prétend tenir,
     et on exige de le voir ROUGIR avant de le croire »), appliquée à un
     joueur plutôt qu'à un banc : si "tenir sans arrêt" gagnait aussi vite
     qu'un joueur attentif, la jauge de tension ne serait qu'un décor. */
  {
    const reckless = () => true; // ne relâche jamais, quelle que soit la tension
    const r = playHaul(reckless, 3600);
    ok("⚠️⚠️⚠️ NE JAMAIS RELÂCHER NE GAGNE PAS EN 60 S (la tension n'est pas un décor)",
       !r.won, `steps=${r.steps}, slips=${r.slips}`);
    ok("…et ça glisse bien plusieurs fois — la mécanique se déclenche, elle ne dort pas",
       r.slips >= 3, `slips=${r.slips}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   LA SEPTIÈME SŒUR SUR LA RIVE (`resolveStarEvilRescue`) — MÊME CONTRAT QUE
   `resolveStarEvilFound` : refusée trop tôt, datée, idempotente.
   ═══════════════════════════════════════════════════════════════════════════ */
section("Le halage — elle a atteint la rive");
{
  const e = Q.newStar();
  ok("⚠️ pas encore vue : la ramener refuse (`tooEarly`)",
     Q.resolveStarEvilRescue(e, 1).tooEarly === true && !Q.starEvilRescued(e));
  armFall(e); findFarmImpacts(e, "banc", 2); Q.resolveStarTownFall(e, 10);
  Q.resolveStarFound(e, "crater", "banc", 11);
  findSisters(e, 12);
  Q.resolveStarEvilFound(e, 999);
  const r1 = Q.resolveStarEvilRescue(e, 5000);
  ok("⚠️⚠️ vue puis halée : acceptée, datée", r1.ok && !r1.already && e.evilRescued === 5000);
  const r2 = Q.resolveStarEvilRescue(e, 9000);
  ok("…un second appel (double req réseau) : idempotent, la date ne bouge pas",
     r2.ok && r2.already === true && e.evilRescued === 5000);
}

/* ═══════════════════════════════════════════════════════════════════════════
   8 bis. LA CONSTRUCTION (zip 454) : LA PORTE, L'INGÉNIEUR, LE BOIS.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ CE QUI EST MESURÉ ICI N'EST PAS « est-ce que ça marche » MAIS L'INVARIANT,
   et c'est la leçon du 449 (« un contrôle de cas ne vaut pas un invariant ») :
   trois exemples verts sur le placement du familier meneur, et l'invariant balayé
   avait sorti un vrai bogue vingt fois sur cent soixante-quatre. Ici l'invariant
   qui compte tient en une phrase : **la chaîne du bûcheron ne peut jamais se
   bloquer**. Elle exige la pièce précédente ET le morceau d'étoile correspondant ;
   si ces deux ordres divergeaient d'un cran, la quête deviendrait infinissable
   sans que rien ne le signale — le pire défaut possible, et celui que le 442 avait
   payé sur « suis-je seul ce soir ». On le balaie donc au lieu de le croire.
   ═══════════════════════════════════════════════════════════════════════════ */
section("La construction du navire (454)");
{
  const GATE_FULL = { skills: C.STAR_GATE_SKILLS, artisans: C.STAR_GATE_ARTISANS };
  /* ── LA PORTE. */
  ok("⚠️ une ferme sans personne ne reçoit pas d'étoile",
     Q.resolveStarWarn(Q.newStar(), "b", 9, 1, { skills: [], artisans: 9 }).gated === true);
  /* ⚠️ ZIP 455 — ET C'EST L'ANNONCE QU'ELLE FERME MAINTENANT, pas seulement la
     chute : une invite « démarrer l'enquête ? » qui s'ouvrirait sur une ferme non
     éligible serait « le jeu propose et refuse » (426), le défaut le plus
     désagréable du dépôt et le seul qu'il ait payé quatre fois. */
  ok("⚠️ …et l'invite ne s'ouvre même pas", !Q.starWarnOffer(Q.newStar(), 9, { skills: [], artisans: 9 }));
  ok("…il manque nommément qui manque",
     Q.starFallGate({ skills: ["voyager"], artisans: 9 }).missing.join() === "lumberjack");
  ok("⚠️ …et quatre artisans ne suffisent pas sans les deux nommés",
     !Q.starFallGate({ skills: [], artisans: 40 }).ok);
  ok("⚠️ …ni les deux nommés sans les quatre artisans",
     !Q.starFallGate({ skills: C.STAR_GATE_SKILLS, artisans: C.STAR_GATE_ARTISANS - 1 }).ok);
  ok("…et la porte s'ouvre quand tout est là", Q.starFallGate(GATE_FULL).ok === true);
  /* ⚠️ LES DEUX SKILLS EXIGÉS EXISTENT VRAIMENT DANS LE VIVIER. Sans ce contrôle,
     une faute de frappe (« lumberjak ») fermerait la quête POUR TOUJOURS sur toutes
     les fermes, et rien au monde ne le dirait — le symptôme serait « la comète ne
     tombe jamais », qu'on mettrait sur le dos de la nuit ou du jour minimum. */
  for (const sk of C.STAR_GATE_SKILLS)
    ok(`le métier « ${sk} » existe dans le vivier`, C.VISITOR_ROSTER.some(v => v.skill === sk));

  /* ── L'INGÉNIEUR. Trois états, deux échéances, une seule date écrite. */
  {
    const e = Q.newStar(); e.fall = 1;
    ok("on ne demande pas d'ingénieur avant d'avoir vu l'étoile",
       Q.resolveStarPlanAsk(e, "j1", 10).tooEarly === true);
    findFarmImpacts(e, "j1", 11);
    Q.resolveStarFound(e, "crater", "j1", 12); findSisters(e, 12);
    const r = Q.resolveStarPlanAsk(e, "j1", 20);
    ok("…et la demande annonce ses trois monnaies",
       r.ok && r.cost.gold === C.STAR_ENG_FEE_GOLD && r.cost.crops === C.STAR_ENG_FEE_CROPS
       && r.cost.fish === C.STAR_ENG_FEE_FISH);
    Q.commitStarPlan(e, "j1", 1000);
    ok("on ne la passe pas deux fois", Q.resolveStarPlanAsk(e, "j1", 1100).already === true);
    ok("⚠️ il voyage d'abord", Q.starPlanPhase(e, 1000 + C.STAR_ENG_TRAVEL_MS - 1) === "travel");
    ok("…puis il est sur place et il travaille",
       Q.starPlanPhase(e, 1000 + C.STAR_ENG_TRAVEL_MS + 1) === "work" && Q.starEngineerHere(e, 1000 + C.STAR_ENG_TRAVEL_MS + 1));
    ok("⚠️ les plans ne sont pas prêts une minute trop tôt",
       Q.resolveStarPlanTick(e, 1000 + C.STAR_ENG_TRAVEL_MS + C.STAR_ENG_WORK_MS - 60000).ok === false);
    ok("⚠️⚠️ …et ils le sont après les quinze minutes demandées",
       Q.resolveStarPlanTick(e, 1000 + C.STAR_ENG_TRAVEL_MS + C.STAR_ENG_WORK_MS).ok === true
       && Q.starPlanReady(e) === true,
       `${Math.round(C.STAR_ENG_WORK_MS / 60000)} min de travail`);
    ok("…et l'ingénieur repart quand il a rendu", Q.starEngineerHere(e, 9e9) === false);
    ok("le compte à rebours ne descend jamais sous zéro", Q.starPlanRemainMs(e, 9e9) === 0);
  }

  /* ── LE BOIS, ET L'INVARIANT QUI COMPTE. */
  {
    /* ⚠️ AUCUNE PIÈCE NE SE COMMANDE SANS PLANS, et c'est la porte que Guillaume
       demande explicitement (« seulement à partir de ce moment là »). */
    const e0 = Q.devStar(Q.newStar(), "all", 1).star;
    e0.plan = { at: 0, by: "", done: 0 };
    for (const k of Q.STAR_SHIP_KEYS) e0.wood = {};
    ok("⚠️ sans les plans, Tristan ne coupe rien",
       Q.STAR_SHIP_KEYS.every(k => Q.starTimberBlock(e0, k) === "noPlan"));

    /* ⚠️⚠️ LE BALAYAGE : on rejoue la quête entière, trouvaille par trouvaille, et
       à CHAQUE état on vérifie qu'il existe au moins une pièce commandable — ou que
       tout est livré. C'est l'invariant « ça ne peut pas se bloquer », mesuré sur
       tous les états que la quête traverse au lieu de trois exemples choisis. */
    const e = Q.newStar(); e.fall = 1;
    e.plan = { at: 1, by: "j1", done: 1 };
    signMayor(e, 2);          // 480 — la cale est autorisée, comme dans le vrai jeu
    let stuck = [], steps = 0, ordered = 0;
    for (let guard = 0; guard < 60; guard++) {
      /* On livre tout ce qui est commandable avant d'avancer d'un cran : c'est ce
         qu'un joueur fait, et c'est ce qui rend le blocage visible s'il existe. */
      for (let inner = 0; inner < 8; inner++) {
        const k = Q.STAR_SHIP_KEYS.find(kk => Q.starTimberCan(e, kk));
        if (!k) break;
        const ro = Q.resolveStarTimberOrder(e, k, "j1", 100 + guard);
        if (!ro.ok || ro.wood <= 0 || ro.ms <= 0) { stuck.push("commande " + k); break; }
        Q.commitStarTimber(e, k, "j1", 100 + guard);
        ordered++;
        /* ⚠️⚠️ ZIP 478 — DEUX GESTES, PAS UN. Tristan LIVRE (`resolveStarTimberTick`
           pose `ready`) et le joueur MONTE (`resolveStarTimberRaise` pose `done`).
           Le banc doit rejouer les DEUX, sinon il mesure une chaîne qui s'arrête au
           milieu — et c'est exactement ce qu'il a fait la première fois qu'on l'a
           relancé après la refonte, ce qui est le comportement voulu : un banc qui
           ne voit pas qu'un geste est apparu est un banc qui ment. */
        Q.resolveStarTimberTick(e, 100 + guard + C.STAR_TIMBER[k].ms);
        const raise = Q.starTimberToRaise(e);
        if (raise) Q.resolveStarTimberRaise(e, raise, "j1", 100 + guard + C.STAR_TIMBER[k].ms + 1);
      }
      steps++;
      const miss = Q.starMissing(e);
      if (!miss.length) break;
      /* Un morceau trouvé mais dont la pièce n'est pas commandable ET dont la
         précédente est livrée serait le blocage : on le note. */
      /* ⚠️⚠️ ZIP 478 — `prev` N'EXISTE PLUS (les commandes sont parallèles), donc ce
         contrôle ne pouvait plus rien attraper : il aurait été VERT pour toujours,
         c'est-à-dire un banc qui n'a jamais pu échouer (§10 de CLAUDE.md). Le
         blocage à guetter est désormais l'inverse d'une raison légitime : une pièce
         dont le morceau d'étoile est trouvé et qui n'est pourtant ni commandable,
         ni chez Tristan, ni sur la cale, ni posée. */
      const blocked = Q.STAR_SHIP_KEYS.filter((kk) => {
        if (Q.starTimberDone(e, kk) || Q.starTimberReady(e, kk) || Q.starTimberOrder(e, kk)) return false;
        const why = Q.starTimberBlock(e, kk);
        return why !== null && why !== "noShard" && why !== "noPlan" && why !== "noMayor";
      });
      if (blocked.length) stuck.push("bloqué " + blocked.join());
      Q.resolveStarFound(e, miss[0], "j1", 200 + guard);
    }
    ok("⚠️⚠️ la chaîne du bûcheron ne se bloque JAMAIS, à aucun état de la quête",
       stuck.length === 0 && ordered === Q.STAR_SHIP_TOTAL,
       stuck.join(" | ") || `${steps} états balayés, ${ordered} pièces commandées`);
    ok("…et le navire est entier à l'arrivée", Q.starShipComplete(e) === true);
  }

  /* ── LES DEUX MOITIÉS SONT VRAIMENT DEUX MOITIÉS. */
  {
    const e = Q.newStar(); e.fall = 1;
    Q.resolveStarFound(e, "farmMaterial", "j1", 2);
    ok("⚠️⚠️ un morceau trouvé sans bois ne se pose pas sur la cale", Q.starShipBuilt(e) === 0);
    e.plan = { at: 1, by: "j1", done: 1 };
    Q.commitStarTimber(e, "hull", "j1", 3);
    ok("…ni pendant que Tristan scie", Q.starShipBuilt(e) === 0);
    Q.resolveStarTimberTick(e, 3 + C.STAR_TIMBER.hull.ms);
    /* ⚠️ ZIP 478 — LIVRÉE N'EST PLUS POSÉE, et c'est la moitié de la passe : une
       pièce livrée attend un marteau sur la cale. Le navire ne grandit pas tout
       seul pendant que le joueur est ailleurs. */
    ok("⚠️⚠️ livrée par Tristan, la pièce n'est PAS encore sur le navire", Q.starShipBuilt(e) === 0);
    ok("…et elle attend bien le marteau", Q.starTimberToRaise(e) === "hull");
    Q.resolveStarTimberRaise(e, "hull", "j1", 4 + C.STAR_TIMBER.hull.ms);
    ok("…et il se pose quand les deux sont là", Q.starShipBuilt(e) === 1);
    ok("…et monter deux fois la même pièce ne fait rien", Q.resolveStarTimberRaise(e, "hull", "j1", 9e9).ok === false);
    /* ⚠️ ET L'INVERSE EST VRAI AUSSI : du bois sans souvenir ne construit rien. Sans
       ce contrôle, un `||` écrit à la place d'un `&&` passerait inaperçu — les deux
       expressions ont raison une fois sur deux. */
    const e2 = Q.newStar(); e2.fall = 1; e2.plan = { at: 1, by: "j1", done: 1 };
    e2.wood.hull = { at: 1, readyAt: 1, done: true, by: "j1" };
    ok("⚠️ du bois sans morceau d'étoile ne construit rien", Q.starShipBuilt(e2) === 0);
  }

  /* ── LA TABLE DE BOIS EST LA MÊME LISTE QUE LE NAVIRE (la leçon du 452). */
  ok("⚠️⚠️ chaque morceau du navire a sa pièce de bois, et réciproquement",
     Q.STAR_SHIP_KEYS.every(k => C.STAR_TIMBER[k])
     && Object.keys(C.STAR_TIMBER).every(k => Q.STAR_SHIP_KEYS.includes(k)),
     `${Object.keys(C.STAR_TIMBER).length} pièces / ${Q.STAR_SHIP_TOTAL} morceaux`);
  ok("…et aucune n'est gratuite ni instantanée",
     Q.STAR_SHIP_KEYS.every(k => C.STAR_TIMBER[k].wood > 0 && C.STAR_TIMBER[k].ms > 0));

  /* ── LA FIN ATTEND LE BATEAU. */
  {
    const e = Q.devStar(Q.newStar(), "all", 1).star;
    for (const k of Q.STAR_SHIP_KEYS) delete e.wood[k];
    const r = Q.resolveStarGift(e, ["j1"], 3);
    /* ⚠️ ZIP 469 — TOUT EST TROUVÉ, ET UN CHANTIER NE PART TOUJOURS PAS EN MER.
       Le contrôle disait « la cloche a chanté » ; le chant n'existe plus, la porte
       qu'il mesure est la seule qui reste, et elle est donc devenue la plus
       importante du fichier — voir la note de `resolveStarGift`. */
    ok("⚠️⚠️ tout est trouvé, mais un chantier ne part pas en mer",
       r.ok === false && r.unbuilt === true, `${r.built}/${r.total} morceaux posés`);
    for (const k of Q.STAR_SHIP_KEYS) e.wood[k] = { at: 1, readyAt: 1, done: true, by: "j1" };
    ok("…et la résolution part dès que la dernière pièce est livrée",
       Q.resolveStarGift(e, ["j1"], 4).scene === "end" && Q.starDone(e));
  }

  /* ── LE MENU DÉVELOPPEUR NE PROMET PAS CE QU'IL NE DONNE PAS. */
  {
    const d = Q.devStar(Q.newStar(), "plans", 5).star;
    ok("⚠️ le bouton « plans » rend vraiment des plans", Q.starPlanReady(d) === true);
    ok("…sans construire le bateau à notre place", Q.starTimberBuilt(d) === 0);
    const d2 = Q.devStar(Q.newStar(), "timber", 5).star;
    ok("⚠️ le bouton « bois » livre les cinq pièces", Q.starTimberBuilt(d2) === Q.STAR_SHIP_TOTAL);
    /* ⚠️ ZIP 469 — LA COQUE EST LE SEUL MORCEAU QUI DÉPENDE ENCORE D'UN LIEU. Le
       bouton « bois » livre les cinq pièces ; quatre d'entre elles n'attendent plus
       que ça, donc `starShipBuilt` en compte quatre — et la coque manque, parce
       que la plaque météorique n'a pas été ramassée. C'est très exactement ce que
       le bouton promet : *il ne donne que le bois*. */
    ok("…sans trouver le seul morceau qui se RAMASSE (la coque)",
       Q.starShipBuilt(d2) === Q.STAR_SHIP_TOTAL - 1 && !Q.starShipHas(d2, "hull"),
       `${Q.starShipBuilt(d2)}/${Q.STAR_SHIP_TOTAL}`);
    const d3 = Q.devStar(Q.newStar(), "all", 5).star;
    ok("⚠️⚠️ « tout sauf la fin » tient sa promesse : il ne manque QUE la scène",
       Q.starMissing(d3).length === 0 && Q.starTimberBuilt(d3) === Q.STAR_SHIP_TOTAL && !Q.starDone(d3),
       Q.starMissing(d3).join() || "rien à trouver");
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. LES TEXTES. Chaque clé lue par le jeu doit exister — une phrase manquante
   rend `undefined`, qui s'affiche tel quel dans une bulle.
   ═══════════════════════════════════════════════════════════════════════════ */
section("Les textes de la quête");
{
  const S = await import(pathToFileURL(path.join(tmp, "fermeStrings.js")).href);
  const st = S.FERME_STR.en.star;
  ok("la table `star` existe des deux côtés", !!S.FERME_STR.en.star && !!S.FERME_STR.fr.star);
  /* ╔═══════════════════════════════════════════════════════════════════════════
     ║ ZIP 450 — CE CONTRÔLE DISAIT L'INVERSE, ET IL AVAIT RAISON JUSQU'À
     ║ AUJOURD'HUI. Il exigeait `en.star === fr.star`, LE MÊME OBJET.
     ╚═══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ C'ÉTAIT LA BONNE RÈGLE AU 444 : tant que la quête n'était écrite qu'en
     anglais, deux tables jumelles auraient divergé à la première réplique corrigée,
     et une seule écriture rendait l'état « pas encore traduit » visible d'un coup
     d'œil. Elle est devenue FAUSSE le jour où la traduction est arrivée — et c'est
     très exactement le §14.2 de `CLAUDE.md` : *une question à laquelle on a répondu
     ne sort pas du fichier toute seule ; elle y reste, et elle ment.* Ici elle
     aurait menti dans le sens le plus coûteux : elle aurait REFUSÉ la traduction.
     ⚠️ Ce qu'il faut mesurer maintenant est le contraire ET le complément : deux
     tables DISTINCTES, et pas une clé de moins d'un côté. La parité fine est le
     travail de `verify-strings` (qui a gagné au 450 le contrôle de VALEUR qui lui
     manquait) ; ici on ne garde que la porte. */
  ok("⚠️ …et ce sont DEUX tables distinctes (la quête est traduite)",
     S.FERME_STR.en.star !== S.FERME_STR.fr.star);
  {
    const kEn = Object.keys(S.FERME_STR.en.star), kFr = Object.keys(S.FERME_STR.fr.star);
    const miss = kEn.filter(k => !kFr.includes(k)).concat(kFr.filter(k => !kEn.includes(k)));
    ok("⚠️ …et aucune section de quête ne manque d'un côté", miss.length === 0,
       miss.join(",") || `${kEn.length} sections lues des deux côtés`);
  }
  for (const ch of Q.STAR_CHAPTERS) ok(`le chapitre « ${ch.key} » a son titre`, typeof st.chapter[ch.key] === "string");
  /* ⚠️⚠️ ZIP 449 — LES OBJECTIFS SE VÉRIFIENT PAR CLÉ DÉRIVÉE, PLUS PAR CHAPITRE.
     Le bandeau lisait `goal[chapitre]` : une phrase pour trois objectifs, donc un
     bandeau qui ment la moitié du temps. Il lit maintenant `Q.starGoalKey`, et ce
     contrôle balaie `STAR_GOAL_KEYS`, qui est lui-même DÉRIVÉ de `STAR_SITES` :
     le jour où l'on ajoute un lieu, ce banc réclame sa phrase tout seul. */
  for (const k of Q.STAR_GOAL_KEYS)
    ok(`l'objectif « ${k} » a sa phrase de bandeau`, typeof st.hud.goal[k] === "string" && st.hud.goal[k].length > 0);
  ok("…et aucune phrase de bandeau n'est orpheline",
     Object.keys(st.hud.goal).every(k => Q.STAR_GOAL_KEYS.includes(k)),
     Object.keys(st.hud.goal).filter(k => !Q.STAR_GOAL_KEYS.includes(k)).join(",") || `${Q.STAR_GOAL_KEYS.length} objectifs`);
  /* ⚠️⚠️ ET ELLES SE COMPTENT EN SIGNES, POUR LA MÊME RAISON QUE LES TITRES DE
     MINI-JEU — SAUF QUE CELLE-CI A ÉTÉ PAYÉE EN SILENCE PENDANT CINQ ZIPS. Le
     bandeau était en `white-space:nowrap` + `text-overflow:ellipsis` : une phrase
     trop longue n'était pas signalée, elle était COUPÉE. Il tient deux lignes
     depuis le 449 ; le plafond reste dur, sinon un bandeau de mission redevient
     le journal de quête que ce chantier refuse. 560 px, deux lignes de 12 px,
     l'icône et les pastilles déduites : ~95 signes, on s'arrête à 80. */
  /* ⚠️⚠️ ZIP 450 — IL BALAIE LES DEUX LANGUES, ET IL N'EN LISAIT QU'UNE. Le
     contrôle ne regardait que `st`, c'est-à-dire l'ANGLAIS, parce qu'au 449 il n'y
     avait rien d'autre à lire. Or **le français est 15 à 20 % plus long à sens
     égal**, et c'est lui qui part chez le public visé : le banc mesurait donc la
     seule langue qui ne risquait pas d'être coupée. *Il mesure autre chose* — le
     premier visage du défaut de banc, dans sa version la plus discrète, celle où
     l'on mesure une VARIANTE de la bonne grandeur. */
  const GOAL_MAX = 80;
  let goalsRead = 0;
  for (const [lang, tbl] of [["en", S.FERME_STR.en.star], ["fr", S.FERME_STR.fr.star]])
    for (const k of Q.STAR_GOAL_KEYS) {
      const s = tbl.hud.goal[k] || "";
      goalsRead++;
      ok(`…et « ${k} » (${lang}) tient dans le bandeau`, s.length <= GOAL_MAX, `${s.length} signes`);
    }
  console.log(`         (${goalsRead} phrases de bandeau lues, deux langues)`);
  for (const op of Q.STAR_DEV_OPS) ok(`le bouton dev « ${op} » a son libellé`, typeof st.dev.op(op) === "string" && st.dev.op(op) !== op);
  for (const sc of Q.STAR_DEV_SCENES) ok(`la scène dev « ${sc} » a son libellé`, typeof st.dev.scene(sc) === "string" && st.dev.scene(sc) !== sc);
  /* ⚠️ ZIP 469 — SIX INVITES SONT PARTIES (lean, dive, sweep, lure, bell, organ),
     `impactDig` est arrivée. ⚠️ ELLE EST DANS CETTE LISTE PARCE QUE C'EST LA SEULE
     invite du jeu qui décrive un geste EN COURS ; sans texte, la barre du bas
     resterait sur « E : fouiller » pendant qu'on gratte, c'est-à-dire qu'elle
     proposerait ce qu'on est en train de faire. */
  for (const p of ["impact", "impactDig", "impactSeen", "material", "tame", "crater", "craterHot", "engineer"])
    ok(`l'invite « ${p} » a son texte`, typeof st.prompt(p) === "string" && st.prompt(p) !== "E");
  /* ⚠️⚠️ UN TITRE DE MINI-JEU EST UN NOM, PAS UNE PHRASE, ET LE BANC LE MESURE
     EN CARACTÈRES. Le premier jet passait `rackHint` (« One of these beads used
     to be a star… ») comme titre : à 15 px de chasse fixe sur un canevas de
     640 px, il se faisait couper en plein mot. On tient dans le cadre à condition
     de rester sous ~40 signes — c'est de la géométrie, pas du goût, et c'est
     donc mesurable. */
  const TITLE_MAX = 40;
  /* ⚠️ ZIP 469 — QUATRE TITRES SUR CINQ SONT PARTIS AVEC LEURS MINI-JEUX. La règle
     de géométrie reste écrite ci-dessus et vaudra pour les gestes de la refonte. */
  for (const [nm, t] of [["cool", st.s1.coolTitle]]) {
    ok(`le titre du mini-jeu « ${nm} » tient dans le cadre`, typeof t === "string" && t.length <= TITLE_MAX,
       `${(t || "").length} signes : « ${t} »`);
  }
  /* ⚠️⚠️ CHAQUE ARRÊT DE TÉLÉPORT A SON LIBELLÉ, ET CE CONTRÔLE EXISTE PARCE QUE
     LE BEFFROI N'EN AVAIT PAS. `devTeleportName` finit par `|| k` : un libellé
     manquant ne PLANTE pas, il affiche la clé brute (« churchTower ») dans le
     menu. C'est le repli qui ment — invisible à la relecture, parfaitement
     visible à l'écran, et trouvé en jouant. Un repli poli est un défaut qu'on ne
     mesure jamais tant que personne ne le lui demande. */
  for (const lang of ["fr", "en"]) {
    const missing = C.DEV_TELEPORTS.filter(d => S.FERME_STR[lang].devTeleportName(d.key) === d.key);
    ok(`⚠️ chaque arrêt de téléport a son libellé (${lang})`, missing.length === 0,
       missing.map(d => d.key).join(",") || `${C.DEV_TELEPORTS.length} arrêts nommés`);
    /* Même famille, même repli menteur : le bandeau de niveau affichait
       « churchTower » en toutes lettres au bas de l'écran. */
    const noFloor = C.COURT_FLOORS.filter(f => S.FERME_STR[lang].courtFloorName(f.key) === f.key);
    ok(`⚠️ chaque niveau d'intérieur a son nom lisible (${lang})`, noFloor.length === 0,
       noFloor.map(f => f.key).join(",") || `${C.COURT_FLOORS.length} niveaux nommés`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. ⚠️⚠️⚠️ ZIP 453 — DEUX GRANDEURS QUE PERSONNE NE MESURAIT, ET ELLES ONT
   CHACUNE COÛTÉ UN DÉFAUT VISIBLE À L'ÉCRAN.
   ───────────────────────────────────────────────────────────────────────────
   Les deux sont de la même famille — *le texte et le monde répondent à la même
   question sans jamais être comparés* (la leçon du 449) — et aucune n'était
   regardable par un banc de logique ni par un banc de rendu.

     A. UN NOMBRE DE MORCEAUX ÉCRIT EN TOUTES LETTRES DANS UNE PHRASE. Trois
        d'entre elles disaient « Trois morceaux », « Quatre morceaux », « Cinq
        notes » pendant que le navire en comptait cinq : elles étaient vraies au
        444 (on comptait quatre NOTES) et le 450 a posé un cinquième morceau
        sans les relire. *Un compteur ajouté ne recompte pas les phrases déjà
        écrites*, et chaque compte restait juste DANS SA PROPRE LISTE.
        ⚠️ Le contrôle balaie les DEUX langues et refuse tout mot-nombre ou
        chiffre au voisinage d'un mot de morceau. Une phrase qui doit compter
        est une FONCTION `(n, total)` — donc elle n'est pas une chaîne, donc
        elle n'est pas balayée : la forme porte la règle.

     B. UNE CHAÎNE DE QUÊTE QUE LE JEU N'AFFICHE JAMAIS. Au 453, **41 des 136**
        l'étaient — dont la rencontre avec l'étoile (la seule phrase qui dit ce
        qu'on fait et pourquoi), les quatre phrases de la cloche, le don, deux
        des cinq traces, et `fall.quiet`. Écrites, traduites, citées dans
        `QUETE.md`, invisibles. C'est le défaut du 448 retourné : *une constante
        que seul le banc lit* a son exact pendant, *une chaîne que personne ne
        lit* — elle a l'air juste et elle ne peut pas échouer.
   ═══════════════════════════════════════════════════════════════════════════ */
section("Les textes disent-ils la même chose que le monde ?");
{
  const ST = await import(pathToFileURL(path.join(tmp, "fermeStrings.js")).href);
  const stars = { fr: ST.FERME_STR.fr.star, en: ST.FERME_STR.en.star };

  /* ── A. AUCUN NOMBRE DE MORCEAUX EN DUR.
     ⚠️ LES EXCEPTIONS SONT NOMMÉES, ET C'EST LA SEULE FAÇON HONNÊTE DE LES
     AVOIR (même discipline que `star.dev` dans `verify-strings`) : les TITRES
     DE CHAPITRE portent leur numéro d'ordre (« Chapitre Cinq »), qui compte des
     chapitres et pas des morceaux. Ils sont donc exclus — mais l'exclusion est
     GARDÉE par le contrôle suivant, qui échoue si le nombre de chapitres
     change. Une exception qui ne peut pas expirer est une porte ouverte. */
  const SKIP = new Set(["chapter", "title"]);
  const NUMW = "(?:deux|trois|quatre|cinq|six|two|three|four|five|six)";
  const PIECE = "(?:morceau|morceaux|note|notes|piece|pieces)";
  const RE = new RegExp(`(?:\\b${NUMW}\\b|\\b\\d+\\b)[^.!?]{0,24}\\b${PIECE}\\b|\\b${PIECE}\\b[^.!?]{0,24}(?:\\b${NUMW}\\b|\\b\\d+\\b)`, "i");
  let read = 0;
  const guilty = [];
  for (const lang of ["fr", "en"]) {
    (function walk(o, at) {
      for (const k of Object.keys(o)) {
        const v = o[k], p = at ? at + "." + k : k;
        if (SKIP.has(p.split(".")[0])) continue;
        if (v && typeof v === "object" && !Array.isArray(v)) { walk(v, p); continue; }
        if (typeof v !== "string") continue;          // une fonction compte, donc elle dérive
        read++;
        if (RE.test(v)) guilty.push(`${lang}.${p} : « ${v.slice(0, 60)} »`);
      }
    })(stars[lang], "");
  }
  /* ⚠️ IL PUBLIE COMBIEN DE PHRASES IL A LUES (leçon du 441) : un motif qui ne
     matche plus rien passerait au vert éternellement sans qu'on le sache. */
  ok("⚠️⚠️ aucun texte de quête n'écrit un nombre de morceaux en dur",
     guilty.length === 0, guilty.slice(0, 4).join(" · ") || `${read} phrases lues dans les deux langues`);
  /* Le garde-fou du garde-fou : il DOIT pouvoir échouer. */
  ok("…et ce contrôle attrape bien ce qu'il cherche",
     RE.test("Trois morceaux. Trois notes.") && RE.test("Four pieces. The boat waits.")
     && !RE.test("Un morceau du bateau. Il chante une note quand on le touche."),
     "témoin positif et témoin négatif");
  /* ⚠️ L'EXCEPTION DES TITRES EXPIRE TOUTE SEULE. « Chapitre Cinq » est le nom
     du cinquième chapitre ; le jour où il y en a six, ce contrôle tombe et
     renvoie quelqu'un vers les titres. */
  /* ⚠️ ZIP 469 — CINQ CHAPITRES SONT DEVENUS TROIS, et l'exception continue
     d'expirer toute seule : le jour où l'on en ajoute un quatrième, ce contrôle
     tombe et renvoie quelqu'un relire les titres. */
  ok("…et l'exception des titres de chapitre est encore vraie",
     Q.STAR_CH_DONE === 3 && !!stars.fr.chapter.build,
     `${Q.STAR_CH_DONE} chapitres — les titres nomment leur rang, pas des morceaux`);

  /* ── B. CHAQUE PHRASE A UN LECTEUR.
     ⚠️ ON LIT LE SOURCE DU COMPOSANT, PAS UNE LISTE ÉCRITE À CÔTÉ : une liste
     de « ce qui est branché » serait la seconde liste que ce banc existe pour
     interdire. */
  {
    /* ╔═══════════════════════════════════════════════════════════════════════
       ║ ⚠️⚠️⚠️ IL FAUT LIRE TOUTES LES VUES, PAS SEULEMENT `FermeGame.js` — ET
       ║ C'EST UN ANGLE MORT DÉJÀ DATÉ QUI SE REFERME ICI.
       ╚═══════════════════════════════════════════════════════════════════════
       Ce contrôle ne regardait qu'un fichier, ce qui était vrai tant que toute
       la quête s'affichait dedans. Depuis, deux morceaux entiers vivent dans
       leur propre vue : l'audience du maire et le sciage chez Tristan. La
       première fois qu'une scène a sorti ses textes de `FermeGame.js`, ce
       contrôle a déclaré orphelines six phrases parfaitement affichées.
       ⚠️ ET CHAQUE VUE REÇOIT SES TEXTES SOUS UN AUTRE NOM : `ScierieScene`
       reçoit `L = { saw: L.star.saw }` et écrit donc `L.saw.pull`. Un banc qui
       ne chercherait que `L.star.` ne verrait rien. On déclare donc, pour chaque
       fichier, le PRÉFIXE qu'il utilise et la branche qu'il dessert.
       ⚠️ LA LISTE EST UNE LISTE DE FICHIERS, PAS UNE LISTE DE PHRASES : c'est ce
       qui la distingue de la « seconde liste » que ce banc existe pour
       interdire. Ajouter une scène demande une ligne ici ; oublier de l'ajouter
       fait ÉCHOUER le contrôle, jamais passer. */
    const VIEWS = [
      ["FermeGame.js", /L\.star\.([A-Za-z0-9_.]*)/g, ""],
      ["ScierieScene.js", /L\.saw\.([A-Za-z0-9_.]*)/g, "saw."],
    ];
    const used = new Set();
    let srcLen = 0;
    for (const [file, re, prefix] of VIEWS) {
      const body = fs.readFileSync(path.join(ROOT, "components", "ferme", file), "utf8");
      srcLen += body.length;
      for (const m of body.matchAll(re)) {
        /* ⚠️⚠️ ON N'AJOUTE **PAS** LE PRÉFIXE LUI-MÊME COMME « LU ». Le premier
           jet le faisait, et c'était rouvrir en grand l'angle mort que ce
           contrôle existe pour fermer : marquer `saw` comme lu excuse d'un coup
           toutes ses feuilles, puisque le filtre plus bas pardonne une feuille
           dont le PARENT est lu. Le banc redevenait vert, et une phrase écrite,
           traduite, jamais affichée y passait sans bruit — c'est le défaut noté
           dans `CLAUDE.md` à propos des huit feuilles `L.maire` sans lecteur.
           *Une commodité qui rend un contrôle vert est presque toujours le
           contrôle qu'on vient de supprimer.* */
        used.add(prefix + m[1]);
      }
    }
    const src = String(srcLen);
    const leaves = [];
    (function walk(o, at) {
      for (const k of Object.keys(o)) {
        const v = o[k], p = at ? at + "." + k : k;
        if (v && typeof v === "object" && !Array.isArray(v)) walk(v, p); else leaves.push(p);
      }
    })(stars.fr, "");
    const dead = leaves.filter(l => {
      if (used.has(l)) return false;
      const parent = l.split(".").slice(0, -1).join(".");   // `hud.goal[goal]`, `prompt(k)`
      return !used.has(parent);
    });
    ok("⚠️⚠️ chaque phrase de la quête est affichée quelque part",
       dead.length === 0, dead.slice(0, 6).join(", ") || `${leaves.length} phrases, ${used.size} lectures dans ${VIEWS.length} vues`);
    ok("…et ce contrôle lit vraiment les composants", used.size > 40 && leaves.length > 80 && src.length > 3,
       `${used.size} lectures, ${leaves.length} phrases, ${VIEWS.length} fichiers`);
  }

  /* ╔═══════════════════════════════════════════════════════════════════════════
     ║ ⚠️⚠️⚠️ AUDIT 2026-08-31 — LE MÊME CONTRÔLE, MAIS SUR `L.maire`. IL MANQUAIT,
     ║ ET SON ABSENCE ÉTAIT ÉCRITE NOIR SUR BLANC DANS `CLAUDE.md` DEPUIS DEUX
     ║ LIVRAISONS (« huit feuilles `L.maire` n'ont aucun lecteur »).
     ╚═══════════════════════════════════════════════════════════════════════════
     Le contrôle ci-dessus ne balaie que la branche `star`. L'audience est arrivée
     avec sa propre branche et sa propre vue, et personne n'a dupliqué le garde-fou
     — alors même que la note du bloc précédent explique en détail POURQUOI il
     existe. Les huit feuilles sont supprimées aujourd'hui (elles étaient toutes des
     doublons de phrases vivantes) ; ce contrôle est ce qui empêche les suivantes.
     ⚠️ *Un garde-fou écrit pour une branche ne protège que cette branche* — c'est
     la douzième forme du défaut de banc (§CLAUDE.md, « une discipline ajoutée à UNE
     section ne protège que cette section »), reconnue ici sur le banc qui la cite.
     ⚠️ LES DEUX VUES SONT DÉCLARÉES, comme au-dessus : `MaireScene.js` porte la
     scène, `FermeGame.js` porte l'accueil, la porte et le chat. Oublier d'ajouter
     une vue fait ÉCHOUER ce contrôle, jamais passer. */
  {
    const MAIRE = { fr: ST.FERME_STR.fr.maire, en: ST.FERME_STR.en.maire };
    const FILES = ["MaireScene.js", "FermeGame.js"];
    const used = new Set();
    let srcLen = 0;
    for (const file of FILES) {
      const body = fs.readFileSync(path.join(ROOT, "components", "ferme", file), "utf8");
      srcLen += body.length;
      /* ⚠️⚠️ HORS-ZIP 2026-09-02 — TROIS ÉCRITURES DE LA MÊME LECTURE, ET LE
         BANC DOIT LES CONNAÎTRE TOUTES LES TROIS. Depuis que le maire peut être
         une maire, la vue lit `LM.` (la table déclinée, mémoïsée dans
         `MaireScene`) et le jeu lit `maireL().` (la même, recalculée à chaque
         affichage parce que le maire change d'un mandat à l'autre). `L.maire.`
         reste pour ce qui n'a pas de genre. Ne reconnaître que la première
         forme, c'est déclarer mortes cent quatre-vingts phrases parfaitement
         affichées — ce qui est arrivé à la seconde où les appels ont changé de
         nom : le banc est tombé à l'instant juste, pour la mauvaise raison.
         *Un banc qui cherche un NOM D'APPEL mesure une écriture, pas un
         affichage ; il faut alors qu'il les énumère toutes.* */
      for (const m of body.matchAll(/(?:L\.maire|LM|maireL\(\))\.([A-Za-z0-9_.]*)/g)) used.add(m[1]);
    }
    const leaves = [];
    (function walk(o, at) {
      for (const k of Object.keys(o)) {
        const v = o[k], p = at ? at + "." + k : k;
        if (v && typeof v === "object" && !Array.isArray(v)) walk(v, p); else leaves.push(p);
      }
    })(MAIRE.fr, "");
    /* Même indulgence que le contrôle jumeau, et pour la même raison : `say[k]`,
       `why[w]`, `mood[m]` sont lus par une clé calculée.
       ⚠️⚠️ MAIS ON REMONTE TOUS LES ANCÊTRES, PAS SEULEMENT LE PARENT, et c'est
       `tint` qui l'exige : la vue écrit `L.maire.tint[node][ctx.mayorKey]`, donc
       DEUX niveaux calculés d'un coup. S'arrêter au parent aurait déclaré mortes
       quinze répliques parfaitement affichées — très exactement le faux positif que
       le contrôle jumeau s'est déjà pris une fois (voir sa note sur les six phrases
       de `ScierieScene`).
       ⚠️ CE QU'ON NE PARDONNE JAMAIS, ET C'EST TOUTE LA DIFFÉRENCE : le PRÉFIXE DE
       BRANCHE. `maire` n'entre pas dans `used` — la capture commence APRÈS lui
       (`/L\.maire\.(...)/`) — donc aucune feuille ne peut être excusée par la seule
       existence de sa branche. C'est le garde-fou que la note jumelle décrit :
       *une commodité qui rend un contrôle vert est presque toujours le contrôle
       qu'on vient de supprimer.* Les huit feuilles mortes d'aujourd'hui étaient à la
       RACINE, sans aucun ancêtre : elles tombent malgré cette indulgence. */
    const dead = leaves.filter(l => {
      if (used.has(l)) return false;
      const parts = l.split(".");
      for (let i = parts.length - 1; i > 0; i--) if (used.has(parts.slice(0, i).join("."))) return false;
      return true;
    });
    ok("⚠️⚠️ chaque phrase de l'audience est affichée quelque part",
       dead.length === 0, dead.slice(0, 8).join(", ") || `${leaves.length} phrases, ${used.size} lectures dans ${FILES.length} vues`);
    ok("…et ce contrôle lit vraiment les deux vues", used.size > 30 && leaves.length > 60 && srcLen > 1000,
       `${used.size} lectures, ${leaves.length} phrases, ${FILES.length} fichiers`);
    /* ⚠️ ET IL EST BILINGUE : une phrase supprimée d'un seul côté est le défaut que
       `verify-strings` attrape en général, mais il ne coûte rien de le tenir ici
       aussi, sur la branche qu'on vient de tailler. */
    const enLeaves = [];
    (function walk(o, at) {
      for (const k of Object.keys(o)) {
        const v = o[k], p = at ? at + "." + k : k;
        if (v && typeof v === "object" && !Array.isArray(v)) walk(v, p); else enLeaves.push(p);
      }
    })(MAIRE.en, "");
    ok("…et les deux langues portent exactement les mêmes clés",
       leaves.length === enLeaves.length && leaves.every(l => enLeaves.includes(l)),
       `${leaves.length} fr contre ${enLeaves.length} en`);
  }

  /* ── C. LE NAVIRE PART, ET IL PEUT REVENIR (453, décision de Guillaume).
     ⚠️ La règle est une fonction PURE de `quete.js`, donc le jeu et le banc la
     partagent ; écrite dans la boucle de rendu, aucun des deux ne l'aurait vue. */
  {
    const e = Q.devStar(Q.newStar(), "all", 1000).star;
    Q.resolveStarGift(e, ["banc"], 1000);
    ok("la quête finie, le navire est entier", Q.starShipComplete(e) && Q.starDone(e),
       `${Q.starShipBuilt(e)}/${Q.STAR_SHIP_TOTAL}`);
    ok("…il reste à quai tant qu'Eduardo est au village", !Q.starShipGone(e, false));
    ok("…il n'est plus là quand Eduardo est en voyage", Q.starShipGone(e, true));
    ok("⚠️ …et un voyage AVANT la fin ne fait pas disparaître un chantier",
       !Q.starShipGone(Q.newStar(), true));
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. LE TAMPON D'ANNONCE (zip 455) : LA DATE, LA VALLÉE NERVEUSE, LE CADRAGE.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ CE QUI EST MESURÉ ICI N'EST PAS « EST-CE QUE ÇA MARCHE » MAIS CE QUE
   PERSONNE NE PEUT VOIR À L'ÉCRAN. Trois grandeurs, et chacune répond à une
   forme connue du défaut de banc :
     · LA DATE — « la nuit qui suit » a deux lectures qui donnent le même code
       neuf fois sur dix et un jeu complètement différent la dixième (accepter à
       20 h). On balaie donc TOUTES les heures d'annonce d'une journée plutôt que
       d'en croire une (leçon 449 : *un contrôle de cas ne vaut pas un invariant*) ;
     · LA VALLÉE — la part de PNJ nerveux et leur désynchronisation sont
       invisibles sur une capture : à l'écran, « ils s'agitent » et « ils
       s'agitent tous en même temps » se ressemblent beaucoup ;
     · LE CADRAGE — c'est très exactement la SEPTIÈME forme du 454 (*une grandeur
       juste mesurée sur un intervalle que le joueur ne regarde pas*) : le point
       de vue est juste par construction, encore faut-il qu'il le reste sur les
       fenêtres RÉELLES, du téléphone au grand écran. On balaie les formats.
   ⚠️⚠️ ET LE DERNIER BLOC EST LE PLUS IMPORTANT DU ZIP : il tient la moitié du
   thème qui reste (§3 de `QUETE.md`). Rien n'empêche, dans six mois, d'ajouter
   une rumeur qui dit « va voir au nord du champ » — sauf ce contrôle.
   ═══════════════════════════════════════════════════════════════════════════ */
section("Le tampon d'annonce (455)");
{
  /* ── LA DATE. On balaie une journée entière d'heures d'annonce possibles. */
  {
    let bad = [], tooSoon = [], sameNight = 0;
    const STEP = C.DAY_REAL_MS / 96;                       // ~10 s de jeu par pas
    /* ⚠️ ON PART DE `STEP` ET PAS DE 0 : `warn.at = 0` VEUT DIRE « PAS ANNONCÉE »
       dans ce fichier, exactement comme `fall = 0` veut dire « pas tombée ». C'est
       la convention du 444 et elle est bonne ; c'est le BANC qui n'a pas le droit
       d'annoncer à l'instant zéro de l'univers. */
    for (let off = STEP; off < C.DAY_REAL_MS; off += STEP) {
      const e = Q.newStar();
      Q.resolveStarWarn(e, "banc", Q.STAR_FALL_MIN_DAY, off, gateCtx());
      /* On avance minute par minute jusqu'à trouver l'instant où elle tombe. Le
         jour de jeu SUIVANT a son propre `dayStartAt` — c'est ce que fait l'hôte
         (`s.dayStartAt` est réécrit à chaque nouveau jour), et l'ignorer aurait
         mesuré un monde où la nuit ne revient jamais. */
      let fellAt = -1;
      for (let t = off; t < off + 3 * C.DAY_REAL_MS && fellAt < 0; t += 1000) {
        const dayStart = Math.floor(t / C.DAY_REAL_MS) * C.DAY_REAL_MS;
        if (Q.starFallDue(e, dayStart, t)) fellAt = t;
      }
      if (fellAt < 0) { bad.push(off); continue; }
      if (fellAt - off < C.STAR_WARN_FLOOR_MS) tooSoon.push(off);
      if (fellAt < C.DAY_REAL_MS) sameNight++;
    }
    ok("⚠️ une annonce finit TOUJOURS par produire une chute", bad.length === 0,
       `${95 - bad.length}/95 heures d'annonce balayées`);
    ok("⚠️⚠️ …et jamais avant le plancher, à aucune heure de la journée",
       tooSoon.length === 0,
       tooSoon.length ? `${tooSoon.length} cas trop tôt` : `plancher ${C.STAR_WARN_FLOOR_MS / 60000} min tenu 95 fois`);
    ok("…et une annonce faite EN PLEIN JOUR tombe bien la nuit du même jour",
       sameNight > 0, `${sameNight} annonces sur 95 tombent le soir même`);
  }
  {
    /* ⚠️ LE CAS QUI A MOTIVÉ TOUTE LA FONCTION : accepter alors qu'il fait DÉJÀ
       nuit ne doit pas faire tomber la comète dans la minute — c'est « la comète
       ne doit pas arriver comme ça », mot pour mot. */
    const e = Q.newStar();
    const atNight = NIGHT0 + 60000;                       // une minute après le crépuscule
    Q.resolveStarWarn(e, "banc", Q.STAR_FALL_MIN_DAY, atNight, gateCtx());
    ok("⚠️⚠️ annoncer DE NUIT ne fait pas tomber la comète cette nuit-là",
       !Q.starFallDue(e, DAY0, atNight + C.STAR_WARN_FLOOR_MS + 60000));
    const d2 = C.DAY_REAL_MS;                              // le lendemain
    ok("…mais bien la nuit suivante", Q.starFallDue(e, d2, d2 + (Q.starNightStart(d2) - d2) + 1000));
  }
  {
    const e = Q.newStar();
    ok("une quête neuve n'est pas annoncée", !Q.starWarned(e) && !Q.starWarning(e));
    Q.resolveStarWarn(e, "j1", Q.STAR_FALL_MIN_DAY, 5000, gateCtx());
    ok("…annoncée, elle est en tampon", Q.starWarning(e) && Q.starWarnAt(e) === 5000);
    ok("⚠️ …et deux « oui » ne repoussent pas la nuit",
       Q.resolveStarWarn(e, "j2", 9, 900000, gateCtx()).already === true && Q.starWarnAt(e) === 5000);
    e.fall = 6000;
    ok("…tombée, le tampon est fini", Q.starWarned(e) && !Q.starWarning(e));
  }
  {
    /* ⚠️⚠️ LA REPRISE D'UNE PARTIE D'AVANT LE 455. Une sauvegarde peut porter une
       chute sans annonce : sans le rattrapage de `migrateStar`, `starWarning`
       serait faux pour toujours et RIEN ne casserait bruyamment — le pire des
       deux mondes, et le genre de défaut qu'on découvre chez un joueur. */
    const old = { ch: 2, fall: 4242, found: {}, calm: {}, lean: {}, marks: [] };
    const e = Q.migrateStar(old);
    ok("⚠️ une partie d'avant ce zip compte comme annoncée", Q.starWarned(e) && Q.starWarnAt(e) === 4242);
    ok("…et une sauvegarde abîmée ne fait pas tomber le chargement",
       Q.starWarnAt(Q.migrateStar({ warn: "n'importe quoi" })) === 0);
  }

  /* ── LA VALLÉE NERVEUSE. */
  {
    const RIDS = C.VISITOR_ROSTER.map((_, i) => i);
    const nerv = RIDS.filter(Q.starNerveHas);
    const share = nerv.length / RIDS.length;
    /* ⚠️ « TOUS NE DOIVENT PAS EN PARLER » (Guillaume) : les DEUX bornes comptent.
       Un banc qui ne vérifierait que « pas tous » passerait au vert sur une vallée
       entièrement calme, c'est-à-dire sur la fonctionnalité absente. */
    ok("⚠️⚠️ une partie seulement des PNJ est nerveuse",
       share > 0.15 && share < 0.85, `${nerv.length}/${RIDS.length} (${(share * 100) | 0} %)`);
    ok("…et c'est stable : le même PNJ l'est toujours",
       RIDS.every(r => Q.starNerveHas(r) === Q.starNerveHas(r)));
    /* ⚠️ L'INVARIANT DE DÉSYNCHRONISATION, ET IL EST LE POINT DE CE BLOC. À
       l'écran, « ils s'agitent » et « ils s'agitent tous dans la même image » se
       ressemblent beaucoup — et le second est une chorégraphie, c'est-à-dire le
       contraire d'une foule inquiète. On mesure donc la proportion maximale de
       nerveux qui tiquent EN MÊME TEMPS, balayée sur toute une période. */
    let worst = 0;
    for (let t = 0; t < C.STAR_NERVE_PERIOD_MS; t += 100) {
      const n = nerv.filter(r => Q.starNerveTic(r, t)).length;
      if (n > worst) worst = n;
    }
    ok("⚠️⚠️ ils ne s'agitent jamais tous en même temps",
       worst < nerv.length * 0.75, `au pire ${worst}/${nerv.length} en même temps`);
    /* Un tic finit, et il finit dans la même image chez tout le monde. */
    ok("un PNJ calme n'a jamais de tic", RIDS.filter(r => !Q.starNerveHas(r)).every(r => !Q.starNerveTic(r, 3000)));
    let onTime = 0;
    for (let t = 0; t < C.STAR_NERVE_PERIOD_MS * 3; t += 250) onTime += nerv.filter(r => Q.starNerveTic(r, t)).length;
    const duty = onTime / (nerv.length * (C.STAR_NERVE_PERIOD_MS * 3 / 250));
    ok("⚠️ un nerveux tique une petite partie du temps, pas en continu",
       duty > 0.10 && duty < 0.40, `${(duty * 100).toFixed(0)} % du temps`);
    /* ⚠️⚠️ UN TOUR SUR SOI-MÊME REVIENT À SON POINT DE DÉPART, ET C'EST CE QU'UN
       BANC DE RENDU NE POURRAIT JAMAIS VOIR : à l'image, une rotation ratée
       ressemble à une rotation. Elle se voit ICI, et nulle part ailleurs. */
    let spins = 0, closed = 0, dirsSeen = new Set();
    for (const r of nerv) {
      for (let n = 0; n < 6; n++) {
        const t0 = n * C.STAR_NERVE_PERIOD_MS;
        const tic = Q.starNerveTic(r, t0 - (Q.starNerveTic(r, t0) ? 0 : 0));
        if (!tic || !tic.spin) continue;
        spins++;
        const seq = [];
        for (let kk = 0; kk < 1; kk += 0.02) seq.push(Q.starNerveDir(r, { k: kk, spin: true, n }));
        seq.forEach(d => dirsSeen.add(d));
        if (seq[0] === Q.STAR_NERVE_DIRS[0]) closed++;
      }
    }
    ok("⚠️ un tour sur soi-même part face au joueur", spins > 0 && closed === spins,
       `${spins} tours mesurés`);
    ok("…et il passe bien par les quatre directions", dirsSeen.size === 4,
       `${dirsSeen.size} directions`);
    /* Le balancement, lui, ne doit JAMAIS regarder le nord ou le sud : c'est un
       gauche-droite, et s'il passait par le dos on ne le distinguerait plus d'un
       tour raté. */
    const sway = [];
    for (let kk = 0; kk < 1; kk += 0.01) sway.push(Q.starNerveDir(7, { k: kk, spin: false, n: 0 }));
    ok("⚠️ le balancement reste gauche-droite", sway.every(d => d === 2 || d === 3),
       `${new Set(sway).size} directions employées`);
    ok("…et il change de côté plusieurs fois", new Set(sway).size === 2);
  }

  /* ── CE QU'ILS DISENT : LE CONTRÔLE QUI TIENT LE THÈME. */
  {
    /* ⚠️ `S` est chargé dans la section 9 des textes, dont la portée s'arrête là :
       on le recharge ici plutôt que de le hisser au module. Le cache d'`import`
       rend la seconde lecture gratuite, et une variable de haut niveau de plus
       aurait donné deux endroits d'où lire les textes. */
    const S2 = await import(pathToFileURL(path.join(tmp, "fermeStrings.js")).href);
    const FR = S2.FERME_STR.fr.star.warn, EN = S2.FERME_STR.en.star.warn;
    ok("les deux langues ont le même nombre de rumeurs", FR.rumor.length === EN.rumor.length, `${FR.rumor.length}`);
    ok("…et le même nombre d'indices", FR.hint.length === EN.hint.length, `${FR.hint.length}`);
    /* ⚠️⚠️ AUCUNE PHRASE DE PNJ NE PEUT NOMMER L'ÉTOILE NI DIRE OÙ ALLER. C'est
       la moitié du thème qui survit au 455, et rien d'autre que ce contrôle ne la
       protège : dans six mois, une rumeur « va voir au nord du champ » aurait
       l'air d'une bonne idée et démolirait le chantier en une ligne.
       ⚠️ LA LISTE EST CELLE DES MOTS INTERDITS, ET ELLE PUBLIE COMBIEN DE PHRASES
       ELLE A LUES : un banc qui compte des occurrences doit dire son dénominateur
       (441), sinon « 0 faute » peut vouloir dire « 0 phrase lue ». */
/* ⚠️⚠️ CE QUI EST INTERDIT N'EST PAS LE MOT « ÉTOILE », ET LE BANC S'EST TROMPÉ
       LÀ-DESSUS À SA PREMIÈRE ÉCRITURE. Il bannissait le nom commun, donc il
       refusait « j'ai vu des étoiles bizarres dans le ciel » — c'est-à-dire très
       exactement la phrase que Guillaume a demandée, et une phrase qui ne trahit
       RIEN : des étoiles dans le ciel, tout le monde en voit.
       ⚠️ CE QUI EST SECRET EST **LA CRÉATURE** ET **LE CHEMIN**. On bannit donc
       deux familles : les noms de ce que personne ne doit connaître (la petite
       étoile, le cratère, le sillon, le navire), et les tournures qui ENVOIENT
       quelque part — parce qu'un habitant qui dit « va voir au nord du champ »
       remplace le familier-guide du 449 et démolit la meilleure page du chantier. */
    const BANNED = [
      "petite étoile", "little star", "cratère", "crater", "sillon", "furrow",
      "quête", "quest", "bateau des étoiles", "star boat", "navire",
    ];
    const DIRECTIVE = [
      " va voir", " va au", " va à ", " vas-y", " cherche", " trouve", " il faut aller",
      " go and", " go to", " look for", " find the", " you must go",
    ];
    const lines = [...FR.rumor, ...FR.hint, ...EN.rumor, ...EN.hint];
    const pad = (l) => " " + l.toLowerCase();
    const guilty = lines.filter(l => BANNED.some(w => l.toLowerCase().includes(w)));
    ok("⚠️⚠️ aucune phrase d'habitant ne nomme ce qui est secret",
       guilty.length === 0, guilty[0] || `${lines.length} phrases lues, ${BANNED.length} mots interdits`);
    const bossy = lines.filter(l => DIRECTIVE.some(w => pad(l).includes(w)));
    ok("⚠️⚠️ …et aucune n'envoie le joueur quelque part",
       bossy.length === 0, bossy[0] || `${lines.length} phrases lues, ${DIRECTIVE.length} tournures interdites`);
    ok("…et les deux contrôles attrapent bien ce qu'ils cherchent",
       BANNED.some(w => "regarde la petite étoile".includes(w))
       && DIRECTIVE.some(w => " il faut aller au nord du champ".includes(w)));
    ok("⚠️ chaque PNJ nerveux a bien quelque chose à dire",
       C.VISITOR_ROSTER.map((_, i) => i).filter(Q.starNerveHas)
        .every(r => Q.starNerveSay(r, FR.rumor.length, FR.hint.length)));
    ok("…et un PNJ calme n'a rien à dire",
       C.VISITOR_ROSTER.map((_, i) => i).filter(r => !Q.starNerveHas(r))
        .every(r => !Q.starNerveSay(r, FR.rumor.length, FR.hint.length)));
    const says = C.VISITOR_ROSTER.map((_, i) => i).filter(Q.starNerveHas)
      .map(r => Q.starNerveSay(r, FR.rumor.length, FR.hint.length));
    const hints = says.filter(x => x.pool === "hint").length;
    ok("⚠️ une minorité de nerveux donne un vrai indice",
       hints > 0 && hints < says.length, `${hints}/${says.length} indices`);
    ok("…et tous les index tombent dans leur table",
       says.every(x => x.idx >= 0 && x.idx < (x.pool === "hint" ? FR.hint.length : FR.rumor.length)));
  }

  /* ── LE CADRAGE DE LA FERME. */
  {
    const hit = { x: C.STAR_FURROW_X, y: C.STAR_FURROW_Y };
    /* ⚠️⚠️ ON BALAIE LES FENÊTRES RÉELLES, DU TÉLÉPHONE AU GRAND ÉCRAN, et on
       rejoue le CLAMP de la caméra (elle ne sort pas de la carte) : sans lui, le
       contrôle mesurerait un point de vue que le jeu n'atteint jamais près du bord
       nord — et le sillon est à dix-sept cases du bord nord. C'est le défaut du
       banc qui juge sa propre maquette (439), pris à l'avance. */
    let worstIn = null, cases = 0;
    for (const W of [720, 900, 1280, 1600, 1920, 2560])
      for (const H of [480, 540, 720, 900, 1080, 1440]) {
        const vw = W / 3, vh = H / 3;                       // ZOOM = 3 à la ferme
        const halfDiag = Math.hypot(vw, vh) / 2 / C.TILE;
        const v = Q.starCamTarget("farm", hit, halfDiag);
        /* le clamp de `getCam`, en cases */
        const cx = Math.max(vw / 2 / C.TILE, Math.min(C.MAP_W - vw / 2 / C.TILE, v.x));
        const cy = Math.max(vh / 2 / C.TILE, Math.min(C.MAP_H - vh / 2 / C.TILE, v.y));
        cases++;
        const inFrame = Math.abs(hit.x - cx) <= vw / 2 / C.TILE && Math.abs(hit.y - cy) <= vh / 2 / C.TILE;
        if (inFrame && !worstIn) worstIn = `${W}×${H}`;
      }
    ok("⚠️⚠️ à la ferme, le point d'impact est HORS CADRE sur toutes les fenêtres",
       !worstIn, worstIn ? `visible en ${worstIn}` : `${cases} formats balayés`);
    /* ⚠️ ET LE POINT DE VUE EST EN AMONT, PAS N'IMPORTE OÙ : il doit se trouver du
       côté d'où vient la comète, sinon elle entre par le bord opposé et on la voit
       s'ÉLOIGNER — la faute exacte du 445, corrigée au 448, qu'un déplacement de
       caméra pouvait rejouer sans que rien ne lève. */
    const a = Q.starFallAngle("farm");
    const v = Q.starCamTarget("farm", hit, 12);
    const dot = (hit.x - v.x) * Math.cos(a) + (hit.y - v.y) * Math.sin(a);
    ok("⚠️ …et il est en AMONT de la course, jamais en aval", dot > 0, `produit scalaire ${dot.toFixed(1)}`);
    ok("la ville, elle, garde sa scène (la caméra vise le cratère)",
       (() => { const c = Q.starCamTarget("town", { x: 50, y: 60 }, 12); return c.x === 50 && c.y === 60; })());
    ok("…et la ville ne fractionne pas la comète", !Q.starFragmentsOn("town") && Q.starFragmentsOn("farm"));
  }

  /* ── LA FRACTURE. */
  {
    ok("avant la fracture il n'y a qu'un caillou", Q.starFragments(Q.STAR_FRAG_AT - 0.01).length === 1);
    ok("…après, il y en a plusieurs", Q.starFragments(Q.STAR_FRAG_AT + 0.01).length === Q.STAR_FRAG_N);
    /* ⚠️ L'ÉCART DOIT CROÎTRE : des morceaux qui se séparent puis se rapprochent
       se lisent comme un défaut d'affichage. On balaie plutôt que de tester deux
       instants (leçon 449). */
    let mono = true, prev = 0;
    for (let k = Q.STAR_FRAG_AT + 0.001; k <= 1; k += 0.005) {
      const f = Q.starFragments(k);
      const spread = Math.max(...f.map(x => Math.abs(x.side)));
      if (spread < prev - 1e-9) mono = false;
      prev = spread;
    }
    ok("⚠️ les éclats ne font que s'écarter, jamais se rapprocher", mono,
       `écart final ${prev.toFixed(2)} rayons`);
    ok("…et le premier morceau reste la TÊTE (jamais décalée)",
       Q.starFragments(1)[0].along === 0 && Q.starFragments(1)[0].side === 0 && Q.starFragments(1)[0].scale === 1);
    ok("…et les éclats sont plus petits qu'elle",
       Q.starFragments(1).slice(1).every(f => f.scale > 0 && f.scale < 1));
    ok("…et ils sont EN RETARD, jamais devant",
       Q.starFragments(1).slice(1).every(f => f.along > 0));
    ok("⚠️ …et ils partent des deux côtés", new Set(Q.starFragments(1).slice(1).map(f => Math.sign(f.side))).size === 2);
    /* La fracture doit tomber DANS ce que le joueur voit : c'est la leçon 454
       (une grandeur juste mesurée là où personne ne regarde) appliquée à un
       nouveau réglage, le jour même où on le pose. */
    /* ⚠️⚠️ ET IL A ÉCHOUÉ À SA PREMIÈRE EXÉCUTION, sur un `0.34` réglé à la main :
       la comète n'entre dans le cadre qu'à 0,84 du temps de vol, donc le caillou se
       fendait hors de l'écran et l'on ne voyait arriver que trois morceaux déjà
       séparés. Septième forme du défaut de banc (454), repayée en un zip.
       ⚠️ LES DEUX BORNES COMPTENT : trop tôt, on ne voit pas la fracture ; trop
       tard, on ne voit pas les morceaux se séparer avant le contact. */
    ok("⚠️⚠️ la fracture a lieu pendant que la comète est À L'ÉCRAN",
       Q.STAR_FRAG_AT > Q.starFallOnScreenK() && Q.STAR_FRAG_AT < 0.96,
       `fracture à ${Q.STAR_FRAG_AT.toFixed(3)}, entrée en cadre à ${Q.starFallOnScreenK().toFixed(3)}`);
    ok("…et il lui reste assez de vol pour qu'on la voie se séparer",
       (1 - Q.STAR_FRAG_AT) * Q.STAR_FALL_FLIGHT_MS > 500,
       `${Math.round((1 - Q.STAR_FRAG_AT) * Q.STAR_FALL_FLIGHT_MS)} ms après la fracture`);
    /* ⚠️ `starFallVisibleMs` DOIT RESTER D'ACCORD AVEC `starFallOnScreenK` : elles
       partagent désormais une écriture, et ce contrôle est ce qui empêchera de les
       redédoubler « pour aller plus vite » (leçon 449, une jointure jamais deux). */
    ok("…et les deux lectures de « depuis quand la voit-on » s'accordent",
       Math.abs(Q.starFallVisibleMs() - (1 - Q.starFallOnScreenK()) * Q.STAR_FALL_FLIGHT_MS) < 1);
  }

  /* ── LE « ! » DE L'IMPACT. */
  {
    ok("⚠️ le « ! » tombe À L'INSTANT du contact, pas avant",
       Q.starBang("townFall", Q.STAR_FALL_IMPACT_MS - 1) === 0 && Q.starBang("townFall", Q.STAR_FALL_IMPACT_MS) > 0);
    ok("…et il dure exactement deux secondes",
       Q.starBang("townFall", Q.STAR_FALL_IMPACT_MS + C.STAR_BANG_MS - 1) > 0
       && Q.starBang("townFall", Q.STAR_FALL_IMPACT_MS + C.STAR_BANG_MS) === 0,
       `${C.STAR_BANG_MS} ms`);
    ok("⚠️ …et il ne se déclenche sur AUCUNE autre scène",
       ["turn", "end", "card", "warn", null].every(k => Q.starBang(k, Q.STAR_FALL_IMPACT_MS + 10) === 0));
    /* ⚠️ IL TOMBE AVEC LA SECOUSSE ET AVEC LE DÉCOR, parce que les trois lisent le
       MÊME `STAR_FALL_IMPACT_MS` — une jointure, jamais trois listes (449). */
    ok("…et il coïncide avec l'apparition du décor d'impact",
       Q.starImpactLanded("townFall", Q.STAR_FALL_IMPACT_MS) && !Q.starImpactLanded("townFall", Q.STAR_FALL_IMPACT_MS - 1));
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
   10. ZIP 456 — IL S'ARRÊTE POUR PARLER, ET LA POSTURE DU CRATÈRE SE VOIT.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ TROIS DES QUATRE DÉFAUTS DE CE ZIP ÉTAIENT INVISIBLES À TOUT BANC, ET LA
   RAISON EST TOUJOURS LA MÊME : personne ne mesurait la grandeur en cause.
     · le PNJ parlait EN MARCHANT — aucun banc ne mesure « est-ce lisible » ;
     · sa portée ne regardait pas la ZONE — deux cartes qui se mélangent (§4),
       et le symptôme est une bulle qui s'ouvre toute seule à l'autre bout ;
     · la tenue du cratère ne rendait RIEN — aucun banc ne mesure « le joueur
       sait-il qu'il fait bien ».
   ⚠️ CE QUI SE MESURE VRAIMENT ICI EST DONC L'ACCORD entre ce qu'on affiche et ce
   qui compte : la jauge, le texte d'aide et la condition d'envoi doivent sortir de
   la MÊME fonction. Deux réponses vertes qui se contredisent, c'est la leçon 449,
   et c'est le défaut le plus cher du dépôt.
   ═══════════════════════════════════════════════════════════════════════════ */
console.log("\n10. LE PNJ QUI S'ARRÊTE, ET LA POSTURE DU CRATÈRE (456)\n");
{
  /* ── LA PORTÉE DE PAROLE, ET SA ZONE. */
  {
    ok("⚠️⚠️ deux cartes ne se mélangent plus : même x/y, zones différentes → rien",
       !Q.starNerveNearTo("farm", 50, 50, "town", 50, 50)
       && !Q.starNerveNearTo("town", 12, 8, "farm", 12, 8));
    ok("…et dans la même zone, la portée est bien celle de la constante",
       Q.starNerveNearTo("town", 0, 0, "town", C.STAR_NERVE_TALK_R, 0)
       && !Q.starNerveNearTo("town", 0, 0, "town", C.STAR_NERVE_TALK_R + 0.2, 0),
       `${C.STAR_NERVE_TALK_R} cases, Manhattan`);
    /* ⚠️ LA MÉTRIQUE EST BALAYÉE, PAS ÉCHANTILLONNÉE (leçon 449) : une portée
       euclidienne écrite par mégarde passerait les deux contrôles ci-dessus et
       échouerait ici, sur les diagonales — qui sont justement là où les deux
       métriques diffèrent le plus. */
    {
      let bad = 0, seen = 0;
      for (let dx = -6; dx <= 6; dx += 0.5) for (let dy = -6; dy <= 6; dy += 0.5) {
        seen++;
        const want = Math.abs(dx) + Math.abs(dy) <= C.STAR_NERVE_TALK_R;
        if (Q.starNerveNearTo("farm", 30 + dx, 30 + dy, "farm", 30, 30) !== want) bad++;
      }
      ok("…balayé sur toute la couronne, jamais trois exemples", bad === 0, `${seen} positions, ${bad} désaccord(s)`);
    }
    ok("…et une position invalide ne fait parler personne",
       !Q.starNerveNearTo("farm", NaN, 30, "farm", 30, 30) && !Q.starNerveNearTo("farm", 30, 30, "farm", undefined, 30));
  }

  /* ── VERS OÙ IL SE TOURNE.
     ⚠️⚠️ L'INVARIANT EST « IL REGARDE LE DEMI-PLAN OÙ EST LE JOUEUR », et il se
     balaie : trois exemples auraient laissé passer l'inversion nord/sud, qui est
     l'erreur qu'on fait à tous les coups dans un monde où `y` croît vers le bas
     (le §4 la nomme, et `starNerveDir` la commente déjà pour le tour sur soi). */
  {
    const VEC = [[0, 1], [0, -1], [-1, 0], [1, 0]];   // 0 sud, 1 nord, 2 ouest, 3 est
    let bad = 0, seen = 0;
    for (let dx = -8; dx <= 8; dx += 0.5) for (let dy = -8; dy <= 8; dy += 0.5) {
      if (dx === 0 && dy === 0) continue;
      seen++;
      const v = VEC[Q.starNerveFace(dx, dy)];
      if (v[0] * dx + v[1] * dy <= 0) bad++;
    }
    ok("⚠️⚠️ il regarde TOUJOURS du côté du joueur", bad === 0, `${seen} directions, ${bad} dos tourné(s)`);
    ok("…et le sud est bien vers le bas de l'écran",
       Q.starNerveFace(0, 3) === 0 && Q.starNerveFace(0, -3) === 1
       && Q.starNerveFace(3, 0) === 3 && Q.starNerveFace(-3, 0) === 2);
  }

  /* ── LA POSTURE DU CRATÈRE : UNE SEULE RÉPONSE.
     ⚠️⚠️ CE QUI EST MESURÉ EST L'ACCORD, PAS LE CAS. `starCalmStep` rend
     « holding » exactement quand `starFacingAway` dit oui, qu'on ne bouge pas et
     qu'on est dans l'anneau — c'est-à-dire exactement la condition que le client
     envoie et que l'hôte revérifie. Si les deux divergeaient, la jauge monterait
     pendant que l'hôte ne compte rien, et c'est un défaut qu'aucune capture ne
     montre : on ne voit pas qu'une barre ment, on voit qu'elle est pleine. */
  {
    const CX = 40, CY = 40;
    let bad = 0, seen = 0, holds = 0;
    for (let dx = -8; dx <= 8; dx += 0.5) for (let dy = -8; dy <= 8; dy += 0.5) for (let d = 0; d < 4; d++) {
      const px = CX + dx, py = CY + dy;
      const st = Q.starCalmStep(px, py, d, false, CX, CY);
      const inRing = Math.hypot(dx, dy) <= Q.STAR_CRATER_R;
      const away = Q.starFacingAway(px, py, d, CX, CY);
      seen++;
      if (st === "holding") holds++;
      if ((st === "holding") !== (inRing && away)) bad++;
    }
    ok("⚠️⚠️ « ça compte » veut dire exactement « dans l'anneau, dos tourné »",
       bad === 0, `${seen} postures balayées, ${holds} qui comptent, ${bad} désaccord(s)`);
    ok("⚠️ …et marcher ne compte JAMAIS, où qu'on soit",
       [0, 1, 2, 3].every(d => Q.starCalmStep(CX + 1, CY, d, true, CX, CY) === "moving"));
    /* Les cinq états, et le fait qu'ils sont bien tous atteignables : un état
       qu'aucune position ne produit est une phrase que personne ne lira jamais —
       la leçon 453, prise à l'avance cette fois. */
    const got = new Set();
    for (let dx = -12; dx <= 12; dx += 0.5) for (const mv of [false, true]) for (let d = 0; d < 4; d++)
      got.add(Q.starCalmStep(CX + dx, CY, d, mv, CX, CY));
    ok("…et les cinq états de la posture sont tous atteignables",
       Q.STAR_CALM_STEPS.every(k => got.has(k)), [...got].join(", "));
  }

  /* ── LA DURÉE À TENIR : UNE SOURCE, PAS DEUX.
     ⚠️ ZIP 479 — `starCalmNeed(soloAllowed)` EST DEVENUE `starTameNeed(site, ctx)` :
     le besoin dépend maintenant du VERBE de l'étoile, pas seulement du nombre de
     joueurs. Le contrôle mesure la même chose qu'avant (une seule écriture de la
     durée) et il en mesure une de plus : la reine a son propre barème. */
  {
    const BLUE = Q.STAR_LIGHT_SITE;
    ok("⚠️ la jauge et le résolveur lisent la MÊME durée",
       Q.starTameNeed(BLUE, { alone: true }) === Q.STAR_CALM_SOLO_MS
       && Q.starTameNeed(BLUE, { alone: false }) === Q.STAR_CALM_MS,
       `${Q.starTameNeed(BLUE, { alone: true })} ms seul, ${Q.starTameNeed(BLUE, { alone: false })} ms à deux`);
    ok("…et seul, c'est plus long (jamais bloqué, juste long)",
       Q.starTameNeed(BLUE, { alone: true }) > Q.starTameNeed(BLUE, { alone: false }));
    ok("⚠️⚠️ ZIP 479 — la reine a son PROPRE barème, et l'épouvantail n'est pas un joueur",
       Q.starTameNeed("crater", { partner: "player" }) === Q.STAR_QUEEN_MS
       && Q.starTameNeed("crater", { partner: "effigy" }) === Q.STAR_QUEEN_SOLO_MS
       && Q.starTameNeed("crater", {}) === Q.STAR_QUEEN_SOLO_MS,
       `${Q.STAR_QUEEN_MS} ms à deux, ${Q.STAR_QUEEN_SOLO_MS} ms avec le figurant`);
    /* ⚠️⚠️ ET UN CONTEXTE VIDE NE DOIT JAMAIS RENDRE LE BARÈME COURT : c'est le
       défaut du 458 pris à l'envers. Un appelant qui oublie son contexte doit
       obtenir la durée LONGUE (donc jouable seul), jamais la courte (qui exigerait
       un second joueur inexistant et bloquerait pour toujours). */
    ok("…et un contexte absent retombe toujours sur le barème SOLO, jamais sur le duo",
       Q.STAR_VERBS.every(v => {
         const id = Q.STAR_VERB_SITE[v];
         return Q.starTameNeed(id) >= Q.starTameNeed(id, { alone: false, partner: "player" });
       }));
  }

  /* ── LES QUATRE PHRASES DE LA POSTURE, DANS LES DEUX LANGUES. */
  {
    const KEYS = ["calmIn", "calmStill", "calmTurn", "calmHold"];
    const S3 = await import(pathToFileURL(path.join(tmp, "fermeStrings.js")).href);
    const TBL = { fr: S3.FERME_STR.fr.star, en: S3.FERME_STR.en.star };
    for (const lang of ["fr", "en"]) {
      const s2 = TBL[lang].s2;
      ok(`les quatre phrases de la posture existent en ${lang}`,
         KEYS.every(k => typeof s2[k] === "string" && s2[k].length > 3 && s2[k].length < 60),
         KEYS.map(k => (s2[k] || "").length).join("/") + " signes");
    }
    ok("…et elles disent quatre choses différentes",
       new Set(KEYS.map(k => TBL.fr.s2[k])).size === KEYS.length);
  }

  /* ── ET LE DÉFAUT QUI A COÛTÉ LE PLUS CHER : UN LECTEUR QUI NE S'EXÉCUTE PAS.
     ⚠️⚠️⚠️ LE BANC DES LECTEURS (§8-B) COMPTE UN `starSay(…, L.star.s2.peek)`
     COMME UNE LECTURE. Il a raison sur la lettre et il avait tort sur le fond :
     `starSay` écrit dans la bulle de l'ÉTOILE, laquelle n'est dessinée que là où
     `starCompanionsAt` rend une liste vide — donc jamais avant la première apprivoisée.
     Cinq phrases du premier quart d'heure étaient dans ce cas. On ne peut pas
     mesurer ça en comptant des clés ; on peut le mesurer en LISANT LE SOURCE, et
     ce sont les deux seuls contrôles de ce banc qui le font. */
  {
    const src = fs.readFileSync(path.join(ROOT, "components", "ferme", "FermeGame.js"), "utf8");
    const nearby = src.indexOf("function starNearby()");
    const i0 = src.indexOf('if (zone === "town") {', nearby);
    /* ⚠️ ZIP 469 — LA BORNE DE FIN A CHANGÉ, ET C'EST EXACTEMENT LE GENRE DE
       DÉTAIL QUI TRANSFORME UN BANC EN MENSONGE. Elle était `if (zone ===
       "court")` — le bloc de l'église, supprimé par le déchant. Sans correction,
       `i1` valait −1, le bloc lu était vide, et le contrôle échouait en disant
       « 0 signes lus » : la seule raison pour laquelle on l'a vu est qu'il PUBLIE
       ce qu'il a lu (leçon du 441, quatrième fois qu'elle sert). On borne
       maintenant à la fin de `starNearby` elle-même. */
    const i1 = src.indexOf("\n  function ", i0 + 1);
    const block = i0 >= 0 && i1 > i0 ? src.slice(i0, i1) : "";
    ok("⚠️⚠️ rien ne parle par la bulle de l'étoile AVANT qu'elle sorte du trou",
       block.length > 400 && !/starSay\(/.test(block),
       `${block.length} signes lus dans le bloc du cratère`);
    ok("…et ce contrôle sait reconnaître un `starSay` (témoin positif)",
       /starSay\(/.test(src), `${(src.match(/starSay\(/g) || []).length} appels dans le fichier`);
    /* ⚠️ ET LA VOIX A UN REPLI : les trois boucles de rendu doivent poser la bulle
       au-dessus du JOUEUR quand il n'y a pas encore de compagnon. Sans ce repli,
       la moitié des phrases de la quête retombent dans le trou d'où on vient de
       les sortir — et c'est exactement ce qui s'est passé entre le 444 et le 456. */
    const reads = (src.match(/starBubbleNow\(cps\)/g) || []).length;
    const falls = (src.match(/cp \? cp\.x : m\.x/g) || []).length;
    ok("⚠️⚠️ les trois cartes savent parler SANS compagnon",
       reads >= 4 && falls === 3, `${reads} lectures de la bulle, ${falls} replis sur le joueur`);
  }
}

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ 11. ZIP 459 — CE QUE TRISTAN FABRIQUE, ET OÙ ÇA EN EST.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ LA BULLE D'OUVRAGE EST UN DESSIN (mesuré par `render-etoile` §13) ; ce qui
   se mesure ICI est la LECTURE qui la nourrit. Elle est purement dérivée des deux
   dates déjà écrites au moment de la commande — aucun champ de plus à faire
   vieillir — et c'est justement ce qui doit être vérifié : une lecture qui se
   tromperait de pièce ferait scier la quille pendant qu'on attend le mât. */
console.log("\n11. L'OUVRAGE DE TRISTAN (459)\n");
{
  const e = Q.newStar(); e.fall = 1; e.plan = { at: 1, by: "j1", done: 1 };
  ok("⚠️ sans commande, il ne fabrique rien", Q.starTimberBusy(e) === null && Q.starTimberProgress(e, 10) === 0);
  Q.commitStarTimber(e, "hull", "j1", 1000);
  const w = Q.starTimberBusy(e);
  ok("⚠️⚠️ dès la commande, il fabrique LA pièce commandée",
     !!w && w.key === "hull" && w.at === 1000 && w.readyAt === 1000 + C.STAR_TIMBER.hull.ms);
  const mid = 1000 + C.STAR_TIMBER.hull.ms / 2;
  const planMid = Q.starShipProgress(e, mid);
  ok("…et l'avancement se lit sur les deux dates, sans troisième champ",
     Math.abs(Q.starTimberProgress(e, mid) - 0.5) < 0.001
       && planMid.length === Q.STAR_SHIP_TOTAL
       && planMid[0].state === "building"
       && Math.abs(planMid[0].work - 0.5) < 0.001,
     `${(Q.starTimberProgress(e, mid) * 100).toFixed(0)} % à mi-parcours`);
  /* ⚠️ BORNÉ AUX DEUX BOUTS : une bulle qui afficherait un trait de scie négatif
     avant l'heure, ou plus profond que la bille après, dirait n'importe quoi
     pendant les quelques images où l'horloge de l'hôte et la nôtre se croisent. */
  ok("⚠️ et il est borné des deux côtés (les horloges des deux clients se croisent)",
     Q.starTimberProgress(e, 0) === 0 && Q.starTimberProgress(e, 1e12) === 1);
  Q.resolveStarTimberTick(e, 1000 + C.STAR_TIMBER.hull.ms);
  ok("⚠️⚠️ pièce livrée = plus personne à l'ouvrage (la bulle disparaît)",
     Q.starTimberBusy(e) === null
       && Q.starShipProgress(e, 1000 + C.STAR_TIMBER.hull.ms)[0].state === "ready");
  {
    const src = fs.readFileSync(path.join(ROOT, "components", "ferme", "FermeGame.js"), "utf8");
    const i0 = src.indexOf('<div className="ferme-ship-progress"');
    const i1 = src.indexOf('<div className="ferme-ship-progress-next">', i0);
    const panel = i0 >= 0 && i1 > i0 ? src.slice(i0, i1) : "";
    ok("⚠️ le panneau P dérive ses cinq segments et n'y remet aucun pictogramme",
       /progress\.map\(step/.test(panel)
         && /progressState\(step\.state\)/.test(panel)
         && !/[✅🪚◻🔒🔨]/u.test(panel),
       `${panel.length} signes lus dans la barre`);
  }
  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ ZIP 478 — CE CONTRÔLE DISAIT L'INVERSE DE CE QU'ON MESURE MAINTENANT.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ IL S'APPELAIT « et il n'y a jamais qu'UNE pièce en cours » et sa note
     disait « l'ordre du plan l'interdit ». Les deux étaient vrais, et les deux
     décrivaient les 24 minutes de file d'attente que la refonte vient de démonter.
     ⚠️⚠️ LA GRANDEUR À MESURER A CHANGÉ DE SIGNE, PAS DE NATURE : ce que la BULLE
     ne peut pas faire, c'est afficher DEUX ouvrages sur la même tête. Elle doit
     donc en désigner exactement un — celui qui finit LE PLUS TÔT, sinon le joueur
     lit une barre qui n'est pas celle qui va aboutir. C'est le seul invariant que
     le parallélisme laisse debout, et il est plus fort que l'ancien. */
  Q.resolveStarFound(e, "farmMaterial", "j1", 2000);
  Q.commitStarTimber(e, "rudder", "j1", 3000);
  Q.commitStarTimber(e, "mast", "j1", 3000);
  ok("⚠️⚠️ ZIP 478 — plusieurs pièces peuvent être en cours EN MÊME TEMPS",
     Q.starTimberBusyCount(e) === 2, `${Q.starTimberBusyCount(e)} sur l'établi`);
  const w2 = Q.starTimberBusy(e);
  ok("⚠️⚠️ …mais la bulle n'en montre qu'UNE : celle qui finit le plus tôt",
     !!w2 && w2.key === "rudder", w2 ? `${w2.key} (rudder ${C.STAR_TIMBER.rudder.ms} ms < mast ${C.STAR_TIMBER.mast.ms} ms)` : "aucune");
  /* ⚠️ ET L'ORDRE DE LA CALE TIENT MALGRÉ LE PARALLÉLISME : `starTimberToRaise`
     balaie STAR_SHIP_KEYS, donc on monte de la quille vers la cloche même si le
     mât a été livré le premier. C'est ce qui remplace la garde `prev` supprimée —
     et l'invariant est plus honnête, parce qu'il porte sur ce qu'on VOIT (la cale)
     et non sur ce qu'on peut commander. */
  Q.resolveStarTimberTick(e, 3000 + C.STAR_TIMBER.mast.ms);
  /* ⚠️ TROIS LIVRÉES ICI (le bordé plus haut, puis le safran et le mât), et c'est
     le BORDÉ qu'on monte : il est premier dans `STAR_SHIP_KEYS`. La démonstration
     est plus nette que prévu — le mât a été commandé après et livré en même temps,
     il attendra quand même son tour sur la cale. */
  ok("⚠️⚠️ …et la cale se remplit dans l'ordre du navire, pas dans l'ordre des livraisons",
     Q.starTimberReadyCount(e) === 3 && Q.starTimberToRaise(e) === Q.STAR_SHIP_KEYS[0],
     `${Q.starTimberReadyCount(e)} livrées, on monte ${Q.starTimberToRaise(e)}`);
  /* ⚠️⚠️ LE PARALLÉLISME SE MESURE EN MINUTES, PAS EN BOOLÉENS — c'est le chiffre
     que l'audit 477 a reproché au chantier, donc c'est celui qu'un banc doit tenir.
     En série on additionne les cinq durées ; en parallèle on prend la plus longue. */
  {
    const ms = Q.STAR_SHIP_KEYS.map(k => C.STAR_TIMBER[k].ms);
    const serie = ms.reduce((a, b) => a + b, 0), para = Math.max(...ms);
    ok("⚠️⚠️⚠️ ZIP 478 — le chantier tient dans la plus longue pièce, pas dans leur somme",
       para <= serie / 2.5,
       `parallèle ${(para / 60000).toFixed(0)} min contre ${(serie / 60000).toFixed(0)} min en série`);
  }
  /* ⚠️ ET DEUX LIVRAISONS PEUVENT ÉCHOIR DANS LE MÊME BATTEMENT : c'est le cas que
     l'ancien `return` au premier aurait laissé traîner un tic de plus (voir la note
     de `resolveStarTimberTick`). On le rejoue, plutôt que de le croire. */
  {
    const f = Q.newStar(); f.fall = 1; f.plan = { at: 1, by: "j1", done: 1 };
    for (const k of Q.STAR_SHIP_KEYS) { Q.resolveStarFound(f, "farmMaterial", "j1", 2); Q.commitStarTimber(f, k, "j1", 10); }
    const rt = Q.resolveStarTimberTick(f, 10 + Math.max(...Q.STAR_SHIP_KEYS.map(k => C.STAR_TIMBER[k].ms)));
    ok("⚠️⚠️ un seul battement livre TOUTES les pièces échues, pas la première",
       rt.ok && rt.keys.length === Q.STAR_SHIP_TOTAL, `${(rt.keys || []).length} livrées d'un coup`);
    ok("…et le rejouer ne relivre rien (idempotent)", Q.resolveStarTimberTick(f, 9e9).ok === false);
  }
}

/* ╔═══════════════════════════════════════════════════════════════════════════════
   ║ 12. ZIP 479 — LES TROIS VERBES. « DEUX ÉTOILES NE PARTAGENT JAMAIS LE MÊME
   ║ GESTE. »
   ╚═══════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️⚠️ CE §  EXISTE POUR TENIR UNE PROMESSE DE CONCEPTION DANS DU CODE, et c'est
   la seule façon connue de l'empêcher de se périmer. L'audit 477 reprochait aux
   trois étoiles de « dire la même chose » ; la cause n'était pas le texte, c'était
   qu'on leur demandait le MÊME geste. Une consigne écrite dans un document se
   contourne sans le savoir ; un contrôle qui échoue, non.
   ⚠️⚠️ ET IL MESURE AUSSI LA RÈGLE QUI COMPTE PLUS QUE LES TROIS : **aucune
   configuration de joueurs ne peut bloquer une étoile** (leçon 458). On la rejoue
   verbe par verbe, tout seul, jusqu'au bout.
   ═══════════════════════════════════════════════════════════════════════════════ */
section("12. LES QUATRE VERBES (479, 480 bis)");
{
  /* ── LA TABLE : UN VERBE PAR ÉTOILE, ET JAMAIS DEUX FOIS LE MÊME. */
  {
    const stars = Q.STAR_SITES.filter(s => s.content === "star");
    const verbs = stars.map(s => s.verb);
    ok("⚠️⚠️ chaque étoile a un verbe, et il est connu",
       stars.length > 0 && verbs.every(v => Q.STAR_VERBS.includes(v)),
       stars.map(s => `${s.id}=${s.verb}`).join(", "));
    ok("⚠️⚠️⚠️ deux étoiles ne partagent JAMAIS le même verbe",
       new Set(verbs).size === verbs.length, `${new Set(verbs).size} verbes pour ${verbs.length} étoiles`);
    ok("…et rien d'autre qu'une étoile n'en porte un",
       Q.STAR_SITES.filter(s => s.verb).every(s => s.content === "star"));
    /* ⚠️ ET LA JOINTURE MARCHE DANS LES DEUX SENS : `STAR_VERB_SITE` est ce que
       les résolveurs du plat lisent au lieu d'écrire « farmStarRose » en dur. */
    ok("⚠️ la jointure verbe → lieu est juste dans les deux sens",
       Q.STAR_VERBS.every(v => Q.starVerbOf(Q.STAR_VERB_SITE[v]) === v),
       Q.STAR_VERBS.map(v => `${v}→${Q.STAR_VERB_SITE[v]}`).join(", "));
  }

  /* ── LA BLEUE : LA LUMIÈRE SE PAIE, ET ELLE SE PAIE EN FRAIS. */
  {
    const BLUE = Q.STAR_LIGHT_SITE;
    const e = Q.newStar();
    /* ⚠️⚠️ AVANT LA CHUTE, RIEN NE S'ACCUMULE — « la lumière bleue s'éteint en
       dormant ». C'est la règle qui empêche un vieux stock d'acheter le chapitre
       d'avance, et c'est le seul contrôle qui puisse la voir. */
    ok("⚠️⚠️ avant la chute, une course ne rapporte AUCUNE lumière",
       Q.resolveStarCandy(e, "j1", 500, 10).ok === false && Q.starCandyFresh(e, "j1") === 0);
    e.fall = 100;
    Q.resolveStarCandy(e, "j1", 40, 200);
    ok("…après la chute, elle compte", Q.starCandyFresh(e, "j1") === 40, `${Q.starCandyFresh(e, "j1")} bonbons frais`);
    Q.resolveStarDig(e, BLUE, "j1", 210);
    const short = Q.resolveStarLight(e, "j1", BLUE, 9999, 220);
    ok("⚠️ quarante bonbons ne suffisent pas, et le refus DIT ce qui manque",
       !short.ok && short.short === true && short.need === Q.STAR_CANDY_PRICE,
       `${short.have}/${short.need}`);
    Q.resolveStarCandy(e, "j1", 40, 230);
    /* ⚠️⚠️ LE PRIX EST LE FLUX, ET LE SAC N'EST QUE CE QU'ON DÉBITE (voir la note
       de `resolveStarLight`). Un sac plus maigre que le flux ne peut pas exister en
       jeu — les deux grandissent ensemble et rien d'autre ne dépense de bonbons —
       mais le BOUTON DEV le produit, et il ne doit pas rendre le geste injugeable.
       On mesure donc les deux moitiés : l'offrande passe, et elle ne débite que ce
       qui est là. */
    {
      const eDev = Q.newStar(); eDev.fall = 100;
      Q.resolveStarDig(eDev, BLUE, "j1", 110);
      Q.resolveStarCandy(eDev, "j1", Q.STAR_CANDY_PRICE, 120);
      const rDev = Q.resolveStarLight(eDev, "j1", BLUE, 0, 130);
      ok("⚠️⚠️ le flux suffit à payer, et le sac ne borne QUE le prélèvement",
         rDev.ok === true && rDev.spend === 0 && Q.starLit(eDev, BLUE),
         `prélève ${rDev.spend} sur un sac vide`);
    }
    const paid = Q.resolveStarLight(e, "j1", BLUE, 9999, 250);
    ok("⚠️⚠️ l'offrande passe, et elle dit exactement ce qu'il faut prélever",
       paid.ok === true && paid.spend === Q.STAR_CANDY_PRICE && Q.starLit(e, BLUE),
       `${paid.spend} bonbons, il en reste ${paid.left} de frais`);
    ok("…elle ne se paie pas deux fois", Q.resolveStarLight(e, "j1", BLUE, 9999, 260).ok === false);
    ok("…et elle a bien débité le flux", Q.starCandyFresh(e, "j1") === 80 - Q.STAR_CANDY_PRICE);
    /* ⚠️⚠️ CE QUE CE CONTRÔLE MESURE VRAIMENT, ET IL NE FAUT PAS LUI EN PRÊTER
       PLUS : `RUN_MAX_CANDIES_PER_RUN` est un plafond de CONFIANCE (l'hôte se
       protège d'un message aberrant), pas un rendement. Un prix au-dessus de lui
       serait littéralement impayable — deux courses obligatoires, sans qu'aucun
       texte ne le dise. Le CALIBRAGE, lui, vient du commentaire qui accompagne ce
       plafond (« ≈ 140 bonbons sur 3 minutes en simulation ») : 60 = une course
       moyenne. Ce chiffre-là n'est pas une constante, donc aucun banc ne peut le
       tenir — on le dit plutôt que de faire semblant de le mesurer. */
    ok("⚠️⚠️ le prix reste payable en UNE course (sous le plafond de confiance de l'hôte)",
       Q.STAR_CANDY_PRICE < C.RUN_MAX_CANDIES_PER_RUN,
       `${Q.STAR_CANDY_PRICE} contre ${C.RUN_MAX_CANDIES_PER_RUN} au plafond`);
  }

  /* hors-zip — LA LUEUR S'ÉTEINT POUR DE VRAI, CINQ MINUTES APRÈS LA COURSE.
     Décision de Guillaume (deux options posées : elle s'éteint vraiment, ou
     ce n'est qu'un rappel cosmétique — la première a été choisie). Ce bloc
     mesure exactement ce que « `now` est l'horloge de qui lit, jamais celle
     qui a écrit » (§3 de CLAUDE.md) veut dire ici : `candyUntil` est posé une
     fois par l'hôte, et lu à plusieurs instants différents. */
  {
    const BLUE = Q.STAR_LIGHT_SITE;
    const e = Q.newStar(); e.fall = 1;
    Q.resolveStarCandy(e, "j1", 40, 1000);
    ok("⚠️ juste après la course, la lumière est fraîche",
       Q.starCandyFresh(e, "j1", 1000) === 40);
    ok("…et le reste À UNE SECONDE de l'échéance",
       Q.starCandyFresh(e, "j1", 1000 + Q.STAR_CANDY_FRESH_MS - 1000) === 40);
    ok("⚠️⚠️ PASSÉ LES CINQ MINUTES, ELLE S'ÉTEINT — POUR DE VRAI",
       Q.starCandyFresh(e, "j1", 1000 + Q.STAR_CANDY_FRESH_MS) === 0,
       `échéance à ${1000 + Q.STAR_CANDY_FRESH_MS}`);
    /* ⚠️⚠️⚠️ ET `e.candy["j1"]` LUI-MÊME NE BOUGE PAS : L'EXTINCTION EST LUE, PAS
       ÉCRITE. Un lecteur qui n'a pas d'horloge (repli `now === undefined`, pour
       un appelant qui ne date pas encore sa lecture) doit continuer de voir le
       chiffre brut, sinon l'expiration deviendrait invisible à qui l'oublie. */
    ok("⚠️ …et pourtant le nombre brut n'a pas été remis à zéro dans l'état",
       e.candy["j1"] === 40 && Q.starCandyFresh(e, "j1") === 40);
    /* Repartir de zéro, pas de la stagnation : courir À NOUVEAU après
       l'extinction ne doit PAS additionner sur un flux déjà mort. */
    Q.resolveStarCandy(e, "j1", 25, 1000 + Q.STAR_CANDY_FRESH_MS + 500);
    ok("⚠️⚠️ une course après extinction repart de ZÉRO, pas du vieux total",
       Q.starCandyFresh(e, "j1", 1000 + Q.STAR_CANDY_FRESH_MS + 500) === 25,
       `${Q.starCandyFresh(e, "j1", 1000 + Q.STAR_CANDY_FRESH_MS + 500)} bonbons`);
    /* Deux courses rapprochées PROLONGENT la fenêtre, elles ne la coupent pas
       à la première échéance. */
    const t2 = 1000 + Q.STAR_CANDY_FRESH_MS + 500;
    Q.resolveStarCandy(e, "j1", 25, t2 + 1000);
    ok("⚠️ courir deux fois de suite REPOUSSE l'échéance (elle ne se fige pas à la 1re course)",
       Q.starCandyFresh(e, "j1", t2 + 1000 + Q.STAR_CANDY_FRESH_MS - 1) === 50);
    /* Et l'offrande elle-même doit refuser une lumière périmée, même si le
       joueur croit encore l'avoir (le sac de bonbons, lui, ne s'éteint pas —
       seule la fraîcheur compte pour payer l'étoile). */
    const e2 = Q.newStar(); e2.fall = 1;
    Q.resolveStarDig(e2, BLUE, "j1", 5);
    Q.resolveStarCandy(e2, "j1", Q.STAR_CANDY_PRICE, 10);
    const tooLate = Q.resolveStarLight(e2, "j1", BLUE, 9999, 10 + Q.STAR_CANDY_FRESH_MS + 1);
    ok("⚠️⚠️⚠️ arriver au trou APRÈS l'extinction refuse l'offrande, même avec le compte juste",
       tooLate.ok === false && tooLate.short === true && tooLate.have === 0,
       `${tooLate.have}/${tooLate.need}`);

    /* ╔═══════════════════════════════════════════════════════════════════════
       ║ 2026-08-31 — LES DEUX HORLOGES, MESURÉES ENSEMBLE ET PLUS CHACUNE DE
       ║ SON CÔTÉ. C'est la forme 458 appliquée au TEMPS.
       ╚═══════════════════════════════════════════════════════════════════════
       ⚠️⚠️⚠️ TOUS LES CONTRÔLES CI-DESSUS ÉTAIENT VERTS PENDANT QUE LA QUÊTE ÉTAIT
       INFINISSABLE APRÈS UNE DÉFAITE. Chacun mesurait la fraîcheur toute seule,
       avec un joueur libre de ses gestes — un monde qui n'existe pas au retour
       d'une course perdue, où l'on rentre BLESSÉ pour `RUN_INJURED_MS`, soit
       DEUX FOIS la durée de la lueur, et où `doAction()` refuse tout. Il n'a
       jamais manqué un contrôle juste : il manquait le contrôle qui met les deux
       grandeurs dans la MÊME expression. */
    {
      const eHurt = Q.newStar(); eHurt.fall = 1;
      const t0 = 10_000_000;
      const ready = t0 + C.RUN_INJURED_MS;                 // il rentre blessé : voilà quand il pourra offrir
      Q.resolveStarCandy(eHurt, "j1", Q.STAR_CANDY_PRICE, t0, ready);
      ok("⚠️⚠️⚠️ UNE COURSE PERDUE LAISSE LA LUMIÈRE VIVANTE JUSQU'À LA FIN DU REPOS FORCÉ",
         Q.starCandyFresh(eHurt, "j1", ready) === Q.STAR_CANDY_PRICE,
         `blessure ${C.RUN_INJURED_MS} ms > fraîcheur ${Q.STAR_CANDY_FRESH_MS} ms`);
      ok("…et il lui reste bien ses cinq minutes ENTIÈRES une fois debout",
         Q.starCandyFresh(eHurt, "j1", ready + Q.STAR_CANDY_FRESH_MS - 1) === Q.STAR_CANDY_PRICE);
      ok("…et elle s'éteint quand même, cinq minutes après qu'il a PU agir",
         Q.starCandyFresh(eHurt, "j1", ready + Q.STAR_CANDY_FRESH_MS) === 0);
      /* Et l'offrande, elle, passe — c'est la grandeur qui compte vraiment :
         le banc mesurait la fraîcheur, le joueur mesure s'il peut payer. */
      const eHurt2 = Q.newStar(); eHurt2.fall = 1;
      Q.resolveStarDig(eHurt2, BLUE, "j1", 5);
      Q.resolveStarCandy(eHurt2, "j1", Q.STAR_CANDY_PRICE, t0, ready);
      const paid = Q.resolveStarLight(eHurt2, "j1", BLUE, 9999, ready + 1000);
      ok("⚠️⚠️ …ET L'OFFRANDE PASSE À LA SECONDE OÙ IL SE RELÈVE (le bogue rendait 100 % des défaites stériles)",
         paid.ok === true, paid.ok ? "payée" : `refusée : ${JSON.stringify(paid)}`);

      /* ⚠️ LE REPORT EST BORNÉ. `readyAt` vient d'un champ que l'hôte recopie
         d'une requête CLIENT : sans plafond, un client modifié s'offrirait une
         lueur éternelle en annonçant une blessure de trois ans. */
      const eCheat = Q.newStar(); eCheat.fall = 1;
      Q.resolveStarCandy(eCheat, "j1", 40, t0, t0 + 3 * 365 * 24 * 3600 * 1000);
      ok("⚠️⚠️ un `readyAt` aberrant ne donne PAS une lumière éternelle (plafond dérivé de la blessure)",
         Q.starCandyFresh(eCheat, "j1", t0 + C.RUN_INJURED_MS + Q.STAR_CANDY_FRESH_MS) === 0,
         `plafond ${Q.STAR_CANDY_HOLD_MAX_MS} ms`);
      ok("…et ce plafond est DÉRIVÉ de la blessure de course, jamais réglé à la main",
         Q.STAR_CANDY_HOLD_MAX_MS === C.RUN_INJURED_MS);

      /* Non-régression : rentrer VALIDE ne change rien à ce qui existait. */
      const eOk = Q.newStar(); eOk.fall = 1;
      Q.resolveStarCandy(eOk, "j1", 40, t0, 0);
      ok("⚠️ sans blessure, l'échéance repart de la course comme avant (aucune régression)",
         Q.starCandyFresh(eOk, "j1", t0 + Q.STAR_CANDY_FRESH_MS - 1) === 40 &&
         Q.starCandyFresh(eOk, "j1", t0 + Q.STAR_CANDY_FRESH_MS) === 0);
    }
    /* hors-zip, 2026-08-27 — LE BANC REJOUE LE VRAI CYCLE DE L'HÔTE AVEC UNE
       VRAIE DATE. Les contrôles ci-dessus employaient 1 000 ms : `| 0` et une
       conversion numérique ordinaire y donnent le même résultat, donc 619
       contrôles verts n'avaient aucun moyen de voir la troncature de 2026. */
    const who = "12345678-1234-1234-1234-123456789abc";
    const realNow = Date.now();
    const e3 = Q.newStar(); e3.fall = realNow - 1000;
    Q.resolveStarDig(e3, BLUE, who, realNow - 500);
    Q.resolveStarCandy(e3, who, Q.STAR_CANDY_PRICE, realNow);
    const hostCycle = Q.migrateStar(JSON.parse(JSON.stringify(e3)));
    ok("⚠️⚠️ une vraie échéance de 2026 survit à la migration exécutée par l'hôte à chaque requête",
       hostCycle.candyUntil[who] === realNow + Q.STAR_CANDY_FRESH_MS,
       `${hostCycle.candyUntil[who]} au lieu de ${realNow + Q.STAR_CANDY_FRESH_MS}`);
    const paidAfterHostCycle = Q.resolveStarLight(hostCycle, who, BLUE, 9999, realNow + 1000);
    ok("⚠️⚠️ après ce vrai cycle hôte, la lumière fraîche paie encore l'étoile bleue",
       paidAfterHostCycle.ok === true && Q.starLit(hostCycle, BLUE),
       `${paidAfterHostCycle.have || 0}/${paidAfterHostCycle.need || Q.STAR_CANDY_PRICE}`);
  }

  /* ── LA ROSE : LE GESTE EST LE CHEMIN. */
  {
    const ROSE = Q.STAR_WARM_SITE;
    ok("⚠️⚠️ la posture ne marche PAS sur la gourmande (sinon personne ne cuisinerait)",
       (() => { const e = Q.newStar(); e.fall = 1; Q.resolveStarDig(e, ROSE, "j1", 2);
                const r = Q.resolveStarCalm(e, "j1", 3, { alone: true }, ROSE);
                return !r.ok && r.wrongVerb === true; })());
    const e = Q.newStar(); e.fall = 1;
    ok("⚠️ on ne cuisine pas pour un trou qu'on n'a pas ouvert", Q.resolveStarCook(e, "j1", 10).ok === false);
    Q.resolveStarDig(e, ROSE, "j1", 20);
    const cook = Q.resolveStarCook(e, "j1", 100);
    ok("⚠️ le chaudron accepte, et il dit quand ce sera prêt",
       cook.ok === true && cook.readyAt === 100 + Q.STAR_DISH_COOK_MS);
    ok("…et il n'accepte pas deux plats à la fois", Q.resolveStarCook(e, "j1", 200).ok === false);
    ok("…pendant la cuisson, il n'y a rien à porter", Q.starDishPhase(e, 200) === "cook" && Q.resolveStarDishTake(e, "j1", 200).ok === false);
    ok("⚠️ cuit, il devient prenable", Q.starDishPhase(e, 100 + Q.STAR_DISH_COOK_MS) === "ready");
    const t0 = 100 + Q.STAR_DISH_COOK_MS + 10;
    ok("⚠️⚠️ n'importe qui peut le prendre (l'un cuisine, l'autre court)",
       Q.resolveStarDishTake(e, "j2", t0).ok === true && Q.starDishHolder(e) === "j2");
    /* ⚠️⚠️ LA JAUGE DESCEND VRAIMENT, ET C'EST TOUT LE VERBE. Trois bornes plutôt
       qu'un exemple : pleine au départ, à moitié à mi-parcours, nulle à la fin. */
    ok("⚠️⚠️ le plat refroidit pendant le trajet",
       Math.abs(Q.starDishHeat(e, t0) - 1) < 0.01
       && Math.abs(Q.starDishHeat(e, t0 + Q.STAR_DISH_HOT_MS / 2) - 0.5) < 0.01
       && Q.starDishHeat(e, t0 + Q.STAR_DISH_HOT_MS) === 0,
       `1 → ${Q.starDishHeat(e, t0 + Q.STAR_DISH_HOT_MS / 2).toFixed(2)} → 0`);
    /* ⚠️⚠️⚠️ LE RELAIS REMET LA JAUGE À PLEIN : c'est la décision de conception du
       verbe, donc c'est un contrôle et pas un commentaire. */
    const tp = t0 + Q.STAR_DISH_HOT_MS * 0.8;
    ok("⚠️ le porteur ne peut pas se passer le plat à lui-même", Q.resolveStarDishPass(e, "j2", tp).ok === false);
    /* ⚠️ ON LIT LA CHALEUR **AVANT** DE PASSER LE PLAT : la lire après le relais
       aurait affiché « 100 % avant, 100 % après », c'est-à-dire un contrôle vert
       qui ne montre rien. C'est le premier visage du défaut de `CLAUDE.md` à
       l'échelle d'une ligne de journal. */
    const before = Q.starDishHeat(e, tp);
    const pass = Q.resolveStarDishPass(e, "j1", tp);
    ok("⚠️⚠️⚠️ le passage de main remet la jauge à PLEIN (le duo est un raccourci, pas une serrure)",
       pass.ok === true && pass.from === "j2" && before < 0.25 && Math.abs(Q.starDishHeat(e, tp) - 1) < 0.01,
       `${(before * 100).toFixed(0)} % avant le relais, ${(Q.starDishHeat(e, tp) * 100).toFixed(0)} % après`);
    ok("⚠️ un plat servi par quelqu'un qui ne le porte pas est refusé",
       Q.resolveStarDishServe(e, "j2", tp + 10, "Bob").ok === false);
    const served = Q.resolveStarDishServe(e, "j1", tp + 20, "Alice", "Bob");
    ok("⚠️⚠️ servi chaud, il apprivoise la gourmande — et il NOMME le second",
       served.ok === true && Q.starHas(e, ROSE) && e.found[ROSE].with === "Bob"
       && Q.starDishPhase(e, tp + 30) === null,
       `${e.found[ROSE].by} avec ${e.found[ROSE].with}`);
    /* ── ET LE PLAT FROID SE PERD, UNE FOIS, CHEZ L'ARBITRE. */
    const e2 = Q.newStar(); e2.fall = 1; Q.resolveStarDig(e2, ROSE, "j1", 20);
    Q.resolveStarCook(e2, "j1", 100); Q.resolveStarDishTake(e2, "j1", 100 + Q.STAR_DISH_COOK_MS);
    const cold = 100 + Q.STAR_DISH_COOK_MS + Q.STAR_DISH_HOT_MS + 1;
    ok("⚠️ un plat froid ne sert plus", Q.resolveStarDishServe(e2, "j1", cold, "Alice").ok === false);
    ok("⚠️ …et l'arbitre l'efface une seule fois",
       Q.resolveStarDishTick(e2, cold).lost === true && Q.resolveStarDishTick(e2, cold + 1).ok === false && e2.dish === null);
    ok("…et on peut recommencer immédiatement (pas de corvée de nettoyage)",
       Q.resolveStarCook(e2, "j1", cold + 2).ok === true);
    /* ⚠️⚠️ LA MARGE EST MESURÉE CONTRE LA CARTE, PAS SENTIE. La pire traversée de
       la ferme en ligne droite est sa diagonale ; la jauge doit en valoir au moins
       trois. Sans ce contrôle, agrandir la carte tuerait le plat en silence. */
    const diag = Math.hypot(C.MAP_W, C.MAP_H) / C.PLAYER_SPEED * 1000;
    ok("⚠️⚠️ la jauge est GÉNÉREUSE : au moins trois fois la diagonale de la ferme",
       Q.STAR_DISH_HOT_MS >= diag * 3,
       `${(Q.STAR_DISH_HOT_MS / 1000).toFixed(0)} s contre ${(diag / 1000).toFixed(0)} s de traversée`);
    ok("…et la cuisson reste courte devant le trajet (ce n'est pas un second sablier)",
       Q.STAR_DISH_COOK_MS * 4 <= Q.STAR_DISH_HOT_MS,
       `${Q.STAR_DISH_COOK_MS / 1000} s de cuisson pour ${Q.STAR_DISH_HOT_MS / 1000} s de chaleur`);
  }

  /* ── LA BLANCHE (480 bis) : PAS DE FIOLE, PAS DE TENUE — ET PAS DE POSTURE
     NON PLUS, CONTRAIREMENT À LA BLEUE. `ctx.potion` est ce que l'hôte calcule
     depuis `f.inv.starLure` (voir FermeGame.js) ; ce banc, qui n'a pas de
     farmer, le passe directement dans le contexte comme un fait déjà établi —
     exactement ce que `resolveStarCalm` reçoit en jeu. */
  {
    const WHITE = Q.STAR_VERB_SITE.lure;
    ok("⚠️ un verbe `lure` existe et pointe une étoile", !!WHITE && Q.starVerbOf(WHITE) === "lure");
    const e = Q.newStar(); e.fall = 1;
    ok("⚠️ sans fouille, la tenue est refusée",
       Q.resolveStarCalm(e, "j1", 10, { alone: true, potion: true }, WHITE).ok === false);
    Q.resolveStarDig(e, WHITE, "j1", 20);
    const noPotion = Q.resolveStarCalm(e, "j1", 30, { alone: true, potion: false }, WHITE);
    ok("⚠️⚠️ sans la fiole, le refus est explicite (`notLured`), pas un plantage silencieux",
       noPotion.ok === false && noPotion.notLured === true);
    /* ⚠️⚠️ ELLE NE DEMANDE PAS LE DOS TOURNÉ : le contexte ne porte ni `dir` ni
       aucune notion de posture, et la tenue avance quand même — c'est la
       promesse de conception ("elle vient, pas de posture à tenir"), tenue par
       un contrôle plutôt que par un commentaire.
       ⚠️ LA CONTINUITÉ EST REJOUÉE, PAS SUPPOSÉE : `resolveStarCalm` ne garde
       le point de départ (`t0`) que si les appels se suivent à moins de
       1500 ms (voir sa note) — comme le fait vraiment le client, toutes les
       500 ms. Deux appels espacés de plusieurs secondes auraient réinitialisé
       la tenue à zéro et fait passer ce contrôle pour de mauvaises raisons. */
    const solo = Q.STAR_CALM_SOLO_MS;
    let now = 100, mid = null, last = null;
    Q.resolveStarCalm(e, "j1", now, { alone: true, potion: true }, WHITE);
    while (now < 100 + solo + 10) {
      now += 500;
      last = Q.resolveStarCalm(e, "j1", now, { alone: true, potion: true }, WHITE);
      if (mid === null && now >= 100 + solo / 2) mid = last;
    }
    ok("⚠️ la tenue avance sans posture, comme une présence simple",
       !!mid && mid.ok === true && mid.holding > 0 && mid.holding < solo, `${mid && mid.holding} ms`);
    ok("⚠️⚠️ la fiole en poche assez longtemps l'apprivoise",
       last.ok === true && Q.starHas(e, WHITE));
  }

  /* hors-zip — LE CHEVRON DE LA BLANCHE SUIT LA FIOLE, PAS UN ATELIER FIGÉ.
     Signalé par Guillaume en jouant : une fois l'Essence préparée, le chevron
     restait planté sur le chaudron déjà quitté au lieu de désigner le trou
     blanc. Ce bloc rejoue `starTameGoalKey` ET `starTargetSite` (jamais l'un
     sans l'autre, la leçon du 449 : deux réponses à « où vais-je » doivent
     être mesurées ensemble ou pas du tout) dans les deux états de `ctx.potion`. */
  {
    const WHITE = Q.STAR_VERB_SITE.lure;
    const e = Q.newStar(); e.fall = 1;
    Q.resolveStarDig(e, WHITE, "j1", 5);
    /* ⚠️ `focus: WHITE` FIXE LE TROU VISÉ, COMME LE FAIT LE JOUEUR EN CLIQUANT
       UNE PUCE (§4 de `QUETE.md`, hors-zip) : sans lui, `starGoalKey` retombe
       sur `missing[0]`, le premier trou manquant de la TABLE, qui n'est pas
       forcément la blanche — le contrôle aurait mesuré un autre trou par
       accident selon l'ordre de `STAR_FARM_IMPACTS`. */
    const ctxNoPotion = { potion: false, focus: WHITE };
    const ctxPotion = { potion: true, focus: WHITE };
    ok("⚠️ sans la fiole, la phrase et le chevron pointent le CHAUDRON",
       Q.starTameGoalKey(e, WHITE, ctxNoPotion) === "farmImpactLure"
       && Q.starTargetSite(e, ctxNoPotion) === "cauldron");
    ok("⚠️⚠️ AVEC la fiole, la phrase et le chevron pointent LE TROU BLANC, plus le chaudron",
       Q.starTameGoalKey(e, WHITE, ctxPotion) === "farmImpactLureGive"
       && Q.starTargetSite(e, ctxPotion) === WHITE);
    /* ⚠️⚠️⚠️ ET C'EST LA MOITIÉ CACHÉE DU MÊME CORRECTIF : la clé qui bascule le
       chevron est la MÊME que celle qui force le monde maléfique (voir
       `needsEvil`, FermeGame.js) — sans cette sortie, le monde restait forcé
       et le trou, à la ferme, devenait inatteignable même avec le bon
       chevron. Un banc de texte ne peut pas voir un forçage de monde ; on
       vérifie donc directement que la clé qui déverrouille EST bien celle
       que `starTameGoalKey` rend une fois la fiole prête. */
    ok("⚠️⚠️⚠️ la clé « fiole prête » n'est plus celle qui force le monde maléfique",
       Q.starTameGoalKey(e, WHITE, ctxPotion) !== "farmImpactLure");
  }

  /* ── LA REINE : DEUX BORDS OPPOSÉS. */
  {
    const R = Q.STAR_CRATER_R, CX = 40, CY = 40;
    const at = (ang, rad) => ({ x: CX + Math.cos(ang) * rad, y: CY + Math.sin(ang) * rad });
    const me = (ang, rad, dir) => ({ ...at(ang, rad), dir, moving: false });
    /* Dos tourné = regarder vers l'extérieur. Au nord du centre (ang = −π/2), le
       dos tourné est la direction 1 (nord). */
    const north = me(-Math.PI / 2, R * 0.9, 1), south = at(Math.PI / 2, R * 0.9);
    ok("⚠️⚠️ deux présences aux bords OPPOSÉS, dos tourné : ça compte",
       Q.starQueenStep(north, south, CX, CY, R) === "holding");
    ok("⚠️ tout seul, ça ne compte pas — et le jeu DIT que c'est ça qui manque",
       Q.starQueenStep(north, null, CX, CY, R) === "alone");
    ok("⚠️⚠️ au FOND du trou, ça ne compte pas (le fond met les deux côte à côte)",
       Q.starQueenStep(me(-Math.PI / 2, R * 0.2, 1), south, CX, CY, R) === "edge");
    ok("⚠️⚠️ …et le partenaire au fond non plus", Q.starQueenStep(north, at(Math.PI / 2, R * 0.2), CX, CY, R) === "side");
    ok("⚠️ le même bord ne compte pas", Q.starQueenStep(north, at(-Math.PI / 2 + 0.2, R * 0.9), CX, CY, R) === "side");
    ok("…marcher ne compte pas", Q.starQueenStep({ ...north, moving: true }, south, CX, CY, R) === "moving");
    ok("…la regarder non plus", Q.starQueenStep({ ...north, dir: 0 }, south, CX, CY, R) === "watching");
    ok("…et loin du cratère, il n'y a rien à dire", Q.starQueenStep({ x: CX + R + 8, y: CY, dir: 3, moving: false }, south, CX, CY, R) === "away");
    /* ⚠️⚠️⚠️ UN CONTRÔLE DE CAS NE VAUT PAS UN INVARIANT (leçon 449). On balaie
       tout le tour : deux présences ne peuvent JAMAIS compter si l'angle qui les
       sépare est inférieur à un quart de tour. */
    {
      let bad = 0, swept = 0, held = 0;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 24) {
        for (let b = 0; b < Math.PI * 2; b += Math.PI / 24) {
          swept++;
          /* Le dos tourné se dérive de l'angle : on prend la direction cardinale
             la plus proche du rayon sortant. `dir` : 0 sud, 1 nord, 2 ouest, 3 est. */
          const dx = Math.cos(a), dy = Math.sin(a);
          const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1);
          const st = Q.starQueenStep(me(a, R * 0.9, dir), at(b, R * 0.9), CX, CY, R);
          if (st === "holding") held++;
          let d = Math.abs(a - b) % (Math.PI * 2);
          if (d > Math.PI) d = Math.PI * 2 - d;
          if (st === "holding" && d < Math.PI / 2) bad++;
        }
      }
      ok("⚠️⚠️⚠️ INVARIANT : deux présences à moins d'un quart de tour ne comptent jamais",
         bad === 0 && held > 0, `${swept} couples balayés, ${held} qui comptent, ${bad} faux`);
    }
    /* ── LE FIGURANT. */
    {
      const e = Q.devStar(Q.newStar(), "start", 1).star;
      ok("⚠️ on ne plante pas l'épouvantail au fond du trou",
         Q.resolveStarEffigy(e, "j1", CX, CY, CX, CY, R, 10).offEdge === true);
      ok("…ni à trois cases du cratère",
         Q.resolveStarEffigy(e, "j1", CX + R + 6, CY, CX, CY, R, 10).offEdge === true);
      const put = Q.resolveStarEffigy(e, "j1", CX, CY + R * 0.9, CX, CY, R, 20);
      ok("⚠️⚠️ planté au bord, il coûte UN épouvantail", put.ok === true && put.spend === 1);
      const again = Q.resolveStarEffigy(e, "j1", CX + R * 0.9, CY, CX, CY, R, 30);
      ok("⚠️ le déplacer ne coûte rien (on ne punit pas un mauvais visé)",
         again.ok === true && again.spend === 0 && again.moved === true);
      /* ⚠️⚠️ ET LE SOLO VA JUSQU'AU BOUT : soixante secondes avec le figurant, et
         la reine sort. C'est la règle 458 rejouée sur le geste le plus exigeant du
         chantier — aucune configuration de joueurs ne peut bloquer. */
      let e2 = Q.devStar(Q.newStar(), "start", 1).star;
      e2.townFall = e2.fall + 10;
      Q.resolveStarEffigy(e2, "j1", CX, CY + R * 0.9, CX, CY, R, 20);
      let t = e2.townFall + Q.STAR_CRATER_COOL_MS + 500;
      ok("⚠️ (lot A) le préambule de la reine passe : nourrie, puis réveillée", queenReady(e2, "j1", t));
      const start = t;
      for (let k = 0; k < 200 && !Q.starHas(e2, "crater"); k++) {
        t += 500;
        e2 = Q.migrateStar(e2);                 // ⚠️ exactement ce que fait l'hôte
        Q.resolveStarCalm(e2, "j1", t, { alone: true, partner: "effigy" }, "crater");
      }
      ok("⚠️⚠️⚠️ SEUL, AVEC SON ÉPOUVANTAIL, LA REINE SORT QUAND MÊME",
         Q.starHas(e2, "crater"), `${((t - start) / 1000).toFixed(0)} s de tenue`);
      ok("…et elle ne sort qu'à MOITIÉ (c'est de la fiction, pas un barème caché)",
         Q.STAR_QUEEN_HALF > 0 && Q.STAR_QUEEN_HALF < 1, `${Q.STAR_QUEEN_HALF}`);
      ok("⚠️ …et l'épouvantail traverse la migration (sinon il disparaît à la première requête)",
         !!e2.effigy && Math.abs(e2.effigy.y - (CY + R * 0.9)) < 0.001);
    }
    /* ⚠️ À DEUX, ELLE SORT ENTIÈRE, ET LE SECOND EST NOMMÉ. */
    {
      const e = Q.devStar(Q.newStar(), "start", 1).star;
      e.townFall = e.fall + 10;
      let t = e.townFall + Q.STAR_CRATER_COOL_MS + 500, opened = null;
      queenReady(e, "j1", t);
      for (let k = 0; k < 80 && !opened; k++) {
        t += 400;
        const r = Q.resolveStarCalm(e, "j1", t, { alone: false, partner: "player", mate: "Bob" }, "crater");
        if (r.opened) opened = r;
      }
      ok("⚠️⚠️ à deux, elle sort ENTIÈRE, et la trouvaille porte le nom du second",
         !!opened && opened.half === false && e.found.crater.with === "Bob",
         `${((t - (e.townFall + Q.STAR_CRATER_COOL_MS + 500)) / 1000).toFixed(1)} s`);
      /* ⚠️⚠️⚠️ ET LES DEUX NOMS SONT DES NOMS, PAS DES IDENTIFIANTS. C'était un
         défaut hérité et invisible : `resolveStarCalm` reçoit un `profile_id`
         (il lui faut une clé de tenue stable) et le passait tel quel à la
         trouvaille, donc `found.by` portait un UUID de 36 signes. Personne ne
         l'affichait — jusqu'à la trace de fin, qui nomme les deux joueurs. Le
         contrôle rejoue donc avec un VRAI identifiant Supabase, comme le §fouille
         depuis le 469 : avec « j1 » des deux côtés, il ne pouvait pas tomber. */
      {
        const uuid = "3f2b9c14-7a5e-4d0b-8c61-9e2af4d17b05";
        const e3 = Q.devStar(Q.newStar(), "start", 1).star;
        e3.townFall = e3.fall + 10;
        let t3 = e3.townFall + Q.STAR_CRATER_COOL_MS + 500, op3 = null;
        queenReady(e3, uuid, t3);
        for (let k = 0; k < 80 && !op3; k++) {
          t3 += 400;
          const r = Q.resolveStarCalm(e3, uuid, t3, { alone: false, partner: "player", mate: "Bob", name: "Alice" }, "crater");
          if (r.opened) op3 = r;
        }
        ok("⚠️⚠️⚠️ la trace de fin porte DEUX NOMS, jamais un identifiant",
           !!op3 && e3.found.crater.by === "Alice" && e3.found.crater.with === "Bob",
           `${e3.found.crater.by} · ${e3.found.crater.with}`);
        /* ⚠️ ET LA CLÉ DE TENUE, ELLE, RESTE L'IDENTIFIANT : c'est ce qui distingue
           deux fermiers qui portent le même nom. Les deux grandeurs cohabitent, et
           ce contrôle est là pour qu'on ne « simplifie » pas l'une dans l'autre. */
        ok("…pendant que la tenue continue de compter sur l'IDENTIFIANT",
           Object.keys(e3.calm).some(k => k.includes(uuid)));
      }
    }
  }

  /* ╔════════════════════════════════════════════════════════════════════════════
     ║ ⚠️⚠️⚠️ UNE JOINTURE, JAMAIS DEUX LISTES (449) — ET ICI ON MESURE L'ACCORD.
     ╚════════════════════════════════════════════════════════════════════════════
     Le bandeau et le chevron dérivent tous les deux de `starGoalKey`, mais chacun
     lui passe un CONTEXTE — et c'est le contexte qui décide, depuis ce zip, si l'on
     envoie au chaudron ou au cratère. Deux constructions de ce contexte, ce sont
     deux réponses à « où vais-je », et elles seraient vertes toutes les deux : le
     défaut du 449, exactement.
     ⚠️ IL AVAIT DÉJÀ EU LIEU, ET UN COMMENTAIRE RASSURANT LE CACHAIT : le chevron
     recopiait `{ craterHot, landed }` à la main sous une note qui affirmait « une
     seule source, donc un seul contexte » — vrai tant que le contexte n'avait que
     deux champs, faux à la seconde où il en a eu cinq. On ne mesure donc plus la
     promesse, on mesure le SOURCE.
     ⚠️ ET IL PUBLIE COMBIEN D'APPELS IL A LUS (leçon du 441) : un scanner qui ne
     scanne rien passe toujours au vert. */
  {
    const src = fs.readFileSync(path.join(ROOT, "components", "ferme", "FermeGame.js"), "utf8");
    /* ⚠️ ON LIT UNE FENÊTRE FIXE APRÈS CHAQUE APPEL PLUTÔT QUE D'ÉQUILIBRER LES
       PARENTHÈSES : un `([^;]*?)\)` s'arrête à la PREMIÈRE parenthèse fermante, donc
       sur `Q.starGoalKey(e, starGoalCtx())` il ne lit que « e, starGoalCtx( ». Le
       premier jet de ce contrôle échouait sur les quatre appels justes — un banc qui
       échoue à tort est aussi inutile qu'un banc qui passe à tort. */
    const calls = [...src.matchAll(/Q\.(starGoalKey|starTargetSite)\(/g)]
      .map(m => ({ name: m[1], args: src.slice(m.index, m.index + 90) }));
    const bad = calls.filter(c => !c.args.includes("starGoalCtx()"));
    ok("⚠️⚠️⚠️ le bandeau et le chevron construisent UN SEUL contexte",
       calls.length >= 3 && bad.length === 0,
       `${calls.length} appels lus, ${bad.length} avec un contexte à la main`);
    ok("…et ce contrôle sait reconnaître un appel (témoin positif)",
       calls.length > 0 && calls.some(c => c.name === "starTargetSite"),
       calls.map(c => c.name).join(", "));
  }

  /* ── DÉFAUT 10 : ELLE SE CACHE, ELLE NE S'EFFACE PAS. */
  {
    ok("⚠️ le rayon de cachette n'a pas bougé (ce n'était pas lui, le défaut)", Q.STAR_HIDE_R === 4.5);
    /* ⚠️⚠️ DEUX TEMPS : elle BOUGE d'abord, elle PÂLIT ensuite. Un fondu seul se
       lit comme un défaut d'affichage — c'est très exactement le reproche. */
    const a0 = Q.starHideAnim(0), aH = Q.starHideAnim(0.5), a1 = Q.starHideAnim(1);
    ok("⚠️⚠️ premier temps : elle se RANGE (elle rentre vers le joueur avant de pâlir)",
       aH.tuck === 1 && aH.alpha > a1.alpha && aH.alpha > 0.4,
       `tuck ${a0.tuck} → ${aH.tuck}, alpha ${a0.alpha.toFixed(2)} → ${aH.alpha.toFixed(2)} → ${a1.alpha.toFixed(2)}`);
    ok("⚠️⚠️ second temps : elle s'éteint, mais elle ne DISPARAÎT jamais",
       a1.alpha > 0.05 && a1.alpha < 0.2 && a1.scale < 0.7,
       `alpha ${a1.alpha.toFixed(2)}, échelle ${a1.scale.toFixed(2)}`);
    ok("…et à découvert, elle est intacte", a0.alpha === 1 && a0.scale === 1 && a0.dip === 0);
    /* Monotone dans les deux sens, et bornée : une courbe qui dépasse 1 ferait
       remonter l'opacité au milieu du fondu. */
    {
      let k = 0, mono = true, prev = 0;
      for (let i = 0; i < 40; i++) { k = Q.starHideK(k, 33, true); if (k < prev) mono = false; prev = k; }
      const full = k;
      for (let i = 0; i < 40; i++) { k = Q.starHideK(k, 33, false); if (k > prev) mono = false; prev = k; }
      ok("⚠️ la courbe monte puis redescend, sans jamais sortir de [0, 1]",
         mono && full === 1 && k === 0);
    }
    ok("⚠️⚠️ elle se cache VITE et ressort DOUCEMENT (on se planque, on ne se montre pas)",
       Q.STAR_HIDE_OUT_MS > Q.STAR_HIDE_IN_MS,
       `${Q.STAR_HIDE_IN_MS} ms pour rentrer, ${Q.STAR_HIDE_OUT_MS} ms pour ressortir`);
  }
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${fails === 0 ? "✅" : "❌"} ${total - fails}/${total} contrôles passés.\n`);
process.exit(fails === 0 ? 0 : 1);
