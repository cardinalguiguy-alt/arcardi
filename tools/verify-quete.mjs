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
copy("fermeStrings");   // §9 : chaque clé que le jeu lit doit exister

const C = await import(pathToFileURL(path.join(tmp, "fermeConstants.js")).href);
const E = await import(pathToFileURL(path.join(tmp, "fermeEngine.js")).href);
const Q = await import(pathToFileURL(path.join(tmp, "quete.js")).href);

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
    Q.resolveStarFound(e3, "crater", "banc", 1);
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
    const r4 = Q.resolveStarCalm(e4, "j1", 1, true, blue);
    ok("⚠️ on n'apprivoise pas une étoile qu'on n'a pas déterrée", !r4.ok && r4.unDug === true);
    Q.resolveStarDig(e4, blue, "j1", 2);
    const r4b = Q.resolveStarCalm(e4, "j1", 3, true, blue);
    ok("…et la fouille l'ouvre vraiment", r4b.ok === true);
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
  ok("la ferme porte exactement cinq impacts", Q.STAR_FARM_IMPACTS.length === 5, `${Q.STAR_FARM_IMPACTS.length}`);
  const counts = Object.fromEntries(["star", "material", "empty"].map(k => [k, Q.STAR_FARM_IMPACTS.filter(s => s.content === k).length]));
  ok("…deux étoiles, une matière, deux fonds vides",
     counts.star === 2 && counts.material === 1 && counts.empty === 2,
     `${counts.star}/${counts.material}/${counts.empty}`);
  ok("les deux petites étoiles ont des couleurs distinctes",
     new Set(Q.STAR_FARM_IMPACTS.filter(s => s.content === "star").map(s => s.color)).size === 2);
  ok("les cinq ancrages tiennent dans la carte",
     C.STAR_FARM_IMPACT_ANCHORS.length === 5 && C.STAR_FARM_IMPACT_ANCHORS.every(p => p.x >= 4 && p.x < C.MAP_W - 4 && p.y >= 4 && p.y < C.MAP_H - 4));
  ok("⚠️ deux impacts élargissent vraiment la chasse à l'est de la rivière",
     C.STAR_FARM_IMPACT_ANCHORS.slice(3).every(p => p.x > 120),
     C.STAR_FARM_IMPACT_ANCHORS.slice(3).map(p => `(${p.x},${p.y})`).join(" · "));
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
     && [3, 4].every(i => Q.starFarmFlight(Q.STAR_FARM_IMPACT_MS[i] - 1) === null));
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
    ok("le gros météore refuse de tomber avant les cinq sites", !Q.resolveStarTownFall(e, 2).ok);
    findFarmImpacts(e, "banc", 3);
    ok("…puis tombe une seule fois quand le chapitre ferme", Q.resolveStarTownFall(e, 20).ok && Q.starTownFallen(e));
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
  ok("…et vaut exactement une minute seul, dix secondes à plusieurs",
     Q.STAR_CALM_SOLO_MS === 60000 && Q.STAR_CALM_MS === 10000);
  /* 462 — le blocage signalé concernait précisément les DEUX étoiles de ferme,
     pas seulement la reine historique. On joue chacune jusqu'au dernier paquet
     au lieu d'extrapoler les tests du cratère. */
  for (const site of Q.STAR_FARM_IMPACTS.filter(s => s.content === "star")) {
    const e = Q.newStar(); e.fall = 1;
    /* ⚠️ ZIP 469 — ON FOUILLE D'ABORD. `resolveStarCalm` refuse une étoile qu'on
       n'a pas déterrée : sans cette ligne, ce contrôle échouerait pour une raison
       qui n'est pas la sienne — c'est le défaut « un contrôle qui échoue pour deux
       raisons ne dit rien quand il échoue », déjà écrit deux fois dans ce fichier. */
    Q.resolveStarDig(e, site.id, "j1", 900);
    let t = 1000;
    for (let k = 0; k < 130 && !Q.starHas(e, site.id); k++) {
      t += 500; Q.resolveStarCalm(e, "j1", t, true, site.id);
    }
    ok(`⚠️⚠️ la jauge solo retire vraiment l'étoile ${site.id}`, Q.starHas(e, site.id), `${((t - 1000) / 1000).toFixed(1)} s`);
  }
  {
    const site = Q.STAR_FARM_IMPACTS.find(s => s.content === "star"), e = Q.newStar(); e.fall = 1;
    Q.resolveStarDig(e, site.id, "j1", 900);       // 469 — voir juste au-dessus
    let t = 1000;
    for (let k = 0; k < 30 && !Q.starHas(e, site.id); k++) {
      t += 400;
      Q.resolveStarCalm(e, "j1", t, false, site.id);
      Q.resolveStarCalm(e, "j2", t, false, site.id);
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
    Q.resolveStarFound(e2, "crater", "banc", 9);
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
    Q.resolveStarFound(e3, "crater", "banc", 9);
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
    for (let k = 0; k < 130 && !Q.starHas(e, "crater"); k++) { t += 500; Q.resolveStarCalm(e, "j1", t, flag); }
    ok(`⚠️⚠️ le cratère s'ouvre TOUT SEUL, drapeau solo = ${flag}`, Q.starHas(e, "crater"),
       `${((t - (e.townFall + Q.STAR_CRATER_COOL_MS + 500)) / 1000).toFixed(1)} s de tenue`);
  }
  {
    /* Le raccourci à deux reste un raccourci : deux tenues simultanées ouvrent le
       trou en `STAR_CALM_MS`, c'est-à-dire bien avant le plancher solo. */
    const e = Q.devStar(Q.newStar(), "start", 1).star;
    openTownCrater(e, e.fall + 10);
    const t0 = e.townFall + Q.STAR_CRATER_COOL_MS + 500;
    let t = t0, opened = null;
    for (let k = 0; k < 30 && !Q.starHas(e, "crater"); k++) {
      t += 400;
      /* ⚠️ ON GARDE LA RÉPONSE QUI OUVRE, PAS LA DERNIÈRE : celui des deux qui
         franchit le seuil le premier reçoit `opened`, l'autre reçoit `already`.
         Lire la dernière, c'est mesurer le perdant de la course. */
      for (const who of ["j2", "j1"]) {
        const r0 = Q.resolveStarCalm(e, who, t, false);
        if (r0.opened) opened = opened || r0;
      }
    }
    ok("⚠️ à deux, le trou s'ouvre par le chemin COURT", Q.starHas(e, "crater") && !!(opened && opened.both),
       `${((t - t0) / 1000).toFixed(1)} s, soit moins que le plancher solo (${(Q.STAR_CALM_SOLO_MS / 1000).toFixed(1)} s)`);
    ok("…et c'est bien plus rapide que tout seul", t - t0 < Q.STAR_CALM_SOLO_MS);
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
  ok("…et assez court pour qu'on en fasse cinq sans s'ennuyer",
     Q.STAR_DIG_MS * Q.STAR_FARM_IMPACTS.length <= 20000,
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
    let t = 1000;
    for (let k = 0; k < 200 && !Q.starHas(e, site); k++) {
      t += 500;
      e = Q.migrateStar(e);                    // ⚠️ exactement ce que fait `hostHandleReq`
      Q.resolveStarCalm(e, who, t, true, site);
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
    ok("…puis le cratère après le gros météore", Q.starTargetSite(e, {}) === "crater");
    Q.resolveStarFound(e, "crater", "banc", 3000);
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
    ok("⚠️⚠️ …mais le chantier prend le relais, et il a une adresse",
       Q.starGoalKey(e, {}) === "timber" && Q.starTargetSite(e, {}) === "sawmill",
       `${Q.starGoalKey(e, {})} → ${Q.starTargetSite(e, {})}`);
    /* ⚠️ ET SANS LES PLANS, C'EST LA MAIRIE. Deux états, deux adresses : c'est la
       seule chose qui empêche le bandeau de dire « va scier » à quelqu'un qui n'a
       pas encore de plan à scier. */
    {
      const e2 = Q.newStar(); armFall(e2); findFarmImpacts(e2, "banc", 2000);
      Q.resolveStarTownFall(e2, 2500); Q.resolveStarFound(e2, "crater", "banc", 3000);
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

  const e = Q.newStar();
  ok("une quête pas tombée n'a pas d'objectif", Q.starGoalKey(e, {}) === null);
  e.fall = 1000;
  ok("…une fois tombée, l'objectif est la chasse aux impacts", Q.starGoalKey(e, {}) === "farmImpacts");
  findFarmImpacts(e, "j1", 1001);
  ok("…après les cinq sites, le bandeau laisse Valley Town venir naturellement",
     Q.starGoalKey(e, {}) === "townWait" && Q.starTargetSite(e, {}) === null);
  Q.resolveStarTownFall(e, 1010);
  ok("⚠️ le cratère BRÛLANT et le cratère FROID ne disent pas la même chose",
     Q.starGoalKey(e, { craterHot: true }) === "craterHot" && Q.starGoalKey(e, {}) === "crater");
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
     && Q.starGoalKey(e, { landed: true }) === "crater");
  Q.resolveStarFound(e, "crater", "j1", 1002);
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
  ok("…et les plans rendus renvoient chez le bûcheron", Q.starGoalKey(e, {}) === "timber");

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
      const NOWHERE = ["townWait", "engineerTravel", "engineerWork"];   // 469 — les deux écoutes d'ombres sont parties ; 470 — une clé d'attente devient deux
      const orphan = Q.STAR_GOAL_KEYS.filter(k => {
        if (k === "farmImpacts") return false;
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
    findFarmImpacts(e3, "j1", 2); Q.resolveStarTownFall(e3, 5); Q.resolveStarFound(e3, "crater", "j1", 10);
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
    Q.resolveStarFound(e, "crater", "j1", 12);
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
        Q.resolveStarTimberTick(e, 100 + guard + C.STAR_TIMBER[k].ms);
      }
      steps++;
      const miss = Q.starMissing(e);
      if (!miss.length) break;
      /* Un morceau trouvé mais dont la pièce n'est pas commandable ET dont la
         précédente est livrée serait le blocage : on le note. */
      const blocked = Q.STAR_SHIP_KEYS.filter((kk, i) => {
        const why = Q.starTimberBlock(e, kk);
        return why === "prev" && Q.starTimberDone(e, Q.STAR_SHIP_KEYS[i - 1] || kk);
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
    ok("…et il se pose quand les deux sont là", Q.starShipBuilt(e) === 1);
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
    const src = fs.readFileSync(path.join(ROOT, "components", "ferme", "FermeGame.js"), "utf8");
    const used = new Set();
    for (const m of src.matchAll(/L\.star\.([A-Za-z0-9_.]*)/g)) used.add(m[1]);
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
       dead.length === 0, dead.slice(0, 6).join(", ") || `${leaves.length} phrases, ${used.size} lectures dans FermeGame.js`);
    ok("…et ce contrôle lit vraiment le composant", used.size > 40 && leaves.length > 80,
       `${used.size} lectures, ${leaves.length} phrases`);
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

  /* ── LA DURÉE À TENIR : UNE SOURCE, PAS DEUX. */
  {
    ok("⚠️ la jauge et le résolveur lisent la MÊME durée",
       Q.starCalmNeed(true) === Q.STAR_CALM_SOLO_MS && Q.starCalmNeed(false) === Q.STAR_CALM_MS,
       `${Q.starCalmNeed(true)} ms seul, ${Q.starCalmNeed(false)} ms à deux`);
    ok("…et seul, c'est plus long (jamais bloqué, juste long)", Q.starCalmNeed(true) > Q.starCalmNeed(false));
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
  ok("…et l'avancement se lit sur les deux dates, sans troisième champ",
     Math.abs(Q.starTimberProgress(e, mid) - 0.5) < 0.001,
     `${(Q.starTimberProgress(e, mid) * 100).toFixed(0)} % à mi-parcours`);
  /* ⚠️ BORNÉ AUX DEUX BOUTS : une bulle qui afficherait un trait de scie négatif
     avant l'heure, ou plus profond que la bille après, dirait n'importe quoi
     pendant les quelques images où l'horloge de l'hôte et la nôtre se croisent. */
  ok("⚠️ et il est borné des deux côtés (les horloges des deux clients se croisent)",
     Q.starTimberProgress(e, 0) === 0 && Q.starTimberProgress(e, 1e12) === 1);
  Q.resolveStarTimberTick(e, 1000 + C.STAR_TIMBER.hull.ms);
  ok("⚠️⚠️ pièce livrée = plus personne à l'ouvrage (la bulle disparaît)",
     Q.starTimberBusy(e) === null);
  /* ⚠️ ET UNE SEULE À LA FOIS : l'ordre du plan l'interdit, mais c'est la BULLE qui
     paierait une seconde commande simultanée — deux bulles sur la même tête. */
  Q.resolveStarFound(e, "farmMaterial", "j1", 2000);
  Q.commitStarTimber(e, "rudder", "j1", 3000);
  const w2 = Q.starTimberBusy(e);
  ok("⚠️ et il n'y a jamais qu'UNE pièce en cours", !!w2 && w2.key === "rudder");
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${fails === 0 ? "✅" : "❌"} ${total - fails}/${total} contrôles passés.\n`);
process.exit(fails === 0 ? 0 : 1);
