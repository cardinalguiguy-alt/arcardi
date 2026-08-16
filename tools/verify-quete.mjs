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

/* ═══════════════════════════════════════════════════════════════════════════
   1. LA CHAÎNE DES CINQ CHAPITRES.
   ⚠️ C'EST LE CONTRÔLE QUE LE 442 A DÛ AJOUTER APRÈS COUP, ET POUR LA MÊME
   RAISON : les prérequis (`req`) sont RÉELS — on ne plonge pas avant que le lac
   soit marqué, le nid exige la perle. Un raccourci développeur écrit en une
   seule boucle dans l'ordre de la table saute `nestShard`, le chapitre 4 reste
   ouvert, et on conclut que la scène finale est cassée alors que c'est le
   raccourci qui l'était.
   ═══════════════════════════════════════════════════════════════════════════ */
section("La chaîne des chapitres");
{
  const e = Q.newStar();
  ok("une quête neuve n'est pas tombée", !Q.starFallen(e) && !Q.starStarted(e) && !Q.starDone(e));
  ok("…et son premier chapitre est le champ", Q.starChapterKey(e) === "field");

  const r = Q.devStar(Q.newStar(), "all", 1000);
  const e2 = r.star;
  ok("« tout sauf le duo » franchit les quatre premiers chapitres",
     e2.ch === Q.STAR_CH_DONE - 1, `chapitre ${e2.ch}/${Q.STAR_CH_DONE - 1}`);
  ok("…et il ne saute aucun indice",
     Q.STAR_SITES.filter(s => s.id !== "song").every(s => Q.starHas(e2, s.id)),
     Q.STAR_SITES.filter(s => s.id !== "song" && !Q.starHas(e2, s.id)).map(s => s.id).join(",") || "aucun manquant");
  ok("…les quatre éclats sont là", Q.starShards(e2) === Q.STAR_SHARD_TOTAL, `${Q.starShards(e2)}/${Q.STAR_SHARD_TOTAL}`);
  ok("⚠️ …et il S'ARRÊTE AVANT LE CHANT (le duo se joue à la main)", !Q.starHas(e2, "song"));
  ok("…la quête n'est donc PAS terminée", !Q.starDone(e2));

  /* ⚠️ LA BASCULE EST UNE BOUCLE, PAS UN `if` : un joueur peut fermer DEUX
     chapitres avec une seule trouvaille (celle qui manquait au 4 alors que le 3
     était complet depuis dix minutes). Écrite en simple test, la fonction
     avancerait d'un cran par découverte et le pisteur réclamerait un objet déjà
     trouvé. On le mesure en donnant tout dans le DÉSORDRE. */
  {
    const e3 = Q.newStar(); e3.fall = 1;
    for (const id of ["crater", "leanLake", "leanGlass", "lakeShard", "beadShard", "nestShard"])
      Q.resolveStarFound(e3, id, "banc", 1);
    const before = e3.ch;
    const cr = Q.resolveStarFound(e3, "furrow", "banc", 2);
    ok("⚠️ une seule trouvaille peut franchir plusieurs chapitres d'un coup",
       e3.ch - before >= 2 && (cr.crossed || []).length >= 2,
       `${before} → ${e3.ch}, ${(cr.crossed || []).length} franchi(s)`);
  }
  /* Le verrou d'information : on ne plonge pas avant de savoir où plonger. */
  {
    const e4 = Q.newStar(); e4.fall = 1;
    const r4 = Q.resolveStarFound(e4, "lakeShard", "banc", 1);
    ok("un lieu à prérequis se refuse tant qu'on ne sait pas quoi y chercher", !r4.ok && r4.locked);
  }
  /* Idempotence : le geste peut se répéter, il ne compte qu'une fois. */
  {
    const e5 = Q.newStar(); e5.fall = 1;
    Q.resolveStarFound(e5, "furrow", "a", 1);
    const again = Q.resolveStarFound(e5, "furrow", "b", 2);
    ok("retrouver le même éclat ne le compte pas deux fois",
       again.already === true && Q.starShards(e5) === 1 && e5.found.furrow.by === "a");
  }
  /* La chute ne peut pas tomber le premier jour, et elle ne rejoue jamais. */
  {
    const e6 = Q.newStar();
    ok("la chute refuse un jour trop tôt", Q.resolveStarFall(e6, Q.STAR_FALL_MIN_DAY - 1, 5).tooEarly === true);
    ok("…et elle s'arme au bon jour", Q.resolveStarFall(e6, Q.STAR_FALL_MIN_DAY, 5).ok === true);
    ok("…et elle ne rejoue jamais", Q.resolveStarFall(e6, 9, 6).already === true);
  }
  /* Le duo : une phrase en retard est IGNORÉE, pas comptée. */
  {
    const e7 = Q.devStar(Q.newStar(), "all", 10).star;
    ok("une phrase de duo en retard est ignorée", Q.resolveStarDuet(e7, 3, "x", 11).stale === true);
    let last = null;
    for (let p = 0; p < Q.STAR_DUET_PHRASES; p++) last = Q.resolveStarDuet(e7, p, "x", 12 + p);
    ok("les six phrases du duo ferment le chant", last && last.complete === true && Q.starHas(e7, "song"));
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
    ["abîmée", { ch: "trois", found: "oui", calm: 7, lean: [1], marks: "leanLake", duet: -9, gift: null, seen: 3, fall: "x" }],
    ["d'une version d'après", { ch: 99, found: { furrow: { by: "a", at: 1 }, inconnu: { by: "b", at: 2 } }, marks: ["leanLake", "inventé"] }],
  ]) {
    let e = null, threw = null;
    try { e = Q.migrateStar(saved); } catch (err) { threw = err; }
    ok(`sauvegarde ${label} : rien ne lève`, !threw, threw ? String(threw.message) : "");
    if (e) {
      ok(`sauvegarde ${label} : l'objet est complet`,
         ["ch", "found", "fall", "calm", "lean", "marks", "duet", "gift", "seen", "doneAt"].every(k => e[k] !== undefined));
      ok(`sauvegarde ${label} : le chapitre reste dans les bornes`, e.ch >= 0 && e.ch <= Q.STAR_CH_DONE, String(e.ch));
      ok(`sauvegarde ${label} : aucun lieu inconnu n'entre`, Object.keys(e.found).every(id => !!Q.STAR_SITE[id]));
      ok(`sauvegarde ${label} : aucune marque inventée`, e.marks.every(m => Q.STAR_LEAN_MARKS.includes(m)));
    }
  }
  /* ⚠️ UNE SAUVEGARDE DU 442 N'EST PAS MIGRÉE VERS CELLE-CI : deux histoires
     différentes, pas deux versions de la même. Le champ est simplement ignoré. */
  const e442 = Q.migrateStar({ enquete: { ch: 4, found: { borne: 1 } } });
  ok("⚠️ une sauvegarde de l'enquête (442) donne une quête NEUVE", !Q.starStarted(e442) && !Q.starFallen(e442));
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

/* Le sillon de la ferme : il ne bloque rien, mais il ne doit tomber ni sur le
   puits, ni sur le bac, ni sur le panneau de gare, ni sur le seuil de la maison. */
{
  const fx = C.STAR_FURROW_X, fy = C.STAR_FURROW_Y;
  const others = [["le puits", C.WELL.x, C.WELL.y], ["le panneau de gare", C.STATION_SIGN.x, C.STATION_SIGN.y],
                  ["la maison", C.SPAWN.x, C.SPAWN.y]];
  for (const [label, ox, oy] of others)
    ok(`le sillon est distinct de ${label}`, Math.hypot(fx - ox, fy - oy) >= 2.5, `d = ${Math.hypot(fx - ox, fy - oy).toFixed(1)}`);
  ok("le sillon tient dans la carte de la ferme",
     fx - C.STAR_FURROW_LEN >= 1 && fx < C.MAP_W - 1 && fy >= 1 && fy < C.MAP_H - 1, `(${fx},${fy})`);
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
  /* ── LA LECTURE D'OMBRES EN SOLO : on lit, on TRAVERSE la ville, on relit.
     La fenêtre doit couvrir l'aller ; l'écart minimal doit être franchissable. */
  {
    const a = [Math.round(C.TOWN_SPAWN.x), Math.round(C.TOWN_SPAWN.y)];
    /* On cherche la case praticable la plus proche de l'écart minimal exigé :
       c'est le trajet le PLUS COURT qui satisfasse la règle, donc le meilleur
       temps possible. */
    let best = null;
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      if (!walkable(x, y)) continue;
      const d = Math.hypot(x - a[0], y - a[1]);
      if (d < Q.STAR_LEAN_SOLO_MIN_TILES) continue;
      if (!best || d < best.d) best = { x, y, d };
    }
    ok("un point à l'écart solo exigé existe et il est praticable", !!best,
       best ? `(${best.x},${best.y}) à ${best.d.toFixed(1)} cases` : `aucun à ${Q.STAR_LEAN_SOLO_MIN_TILES} cases`);
    if (best) {
      const tRun = travelMs(a[0], a[1], best.x, best.y, RUN);
      const tWalk = travelMs(a[0], a[1], best.x, best.y, WALK);
      ok("⚠️ la fenêtre solo de lecture d'ombres est TENABLE (en courant)",
         tRun < Q.STAR_LEAN_SOLO_WINDOW_MS, `${(tRun / 1000).toFixed(1)} s pour ${(Q.STAR_LEAN_SOLO_WINDOW_MS / 1000).toFixed(0)} s`);
      ok("⚠️ …et elle DEMANDE quelque chose (en marchant, elle n'est pas gratuite)",
         tWalk > Q.STAR_LEAN_SOLO_WINDOW_MS * 0.20,
         `${(tWalk / 1000).toFixed(1)} s de marche, ${(100 * tWalk / Q.STAR_LEAN_SOLO_WINDOW_MS).toFixed(0)} % de la fenêtre`);
    }
    /* Et à deux : l'écart exigé doit rester franchissable, sinon la mécanique
       coopérative est morte sur cette carte-là. */
    let far = 0;
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++)
      if (walkable(x, y) && Math.hypot(x - a[0], y - a[1]) >= Q.STAR_LEAN_MIN_TILES) far++;
    ok("l'écart de lecture à deux est réellement franchissable", far > 200, `${far} cases assez loin`);
  }
  /* ── LE DUO EN SOLO : on cale les touches, on court dans la vis, on vise. La
     fenêtre est `STAR_DUET_SOLO_FADE_MS` ; le trajet est banc d'orgue → beffroi.
     ⚠️ ON LE MESURE SUR LA VRAIE CARTE D'INTÉRIEUR, pas sur une estimation :
     c'est exactement le genre de nombre qu'on réglerait à l'œil et qui serait
     faux dès que le plan bouge. */
  {
    const cw = E.generateCourtWorld();
    const CW = cw.w;
    const bench = (cw.props || []).find(p => p.kind === "organBench");
    const bell = (cw.props || []).find(p => p.kind === "greatBell");
    ok("le banc d'orgue et la cloche existent tous les deux", !!bench && !!bell,
       bench && bell ? `orgue (${bench.x},${bench.y}) · cloche (${bell.x},${bell.y})` : "MANQUANT");
    if (bench && bell) {
      /* ⚠️⚠️ LES NIVEAUX NE SE TOUCHENT PAS, ET LE BANC S'EST TROMPÉ LÀ-DESSUS.
         Premier jet : un parcours en largeur à quatre voisins sur la grille
         brute — qui a annoncé « AUCUN CHEMIN » entre le banc d'orgue et le
         beffroi, sur une église parfaitement praticable. La carte d'intérieur
         EMPILE ses niveaux avec un vide entre eux ; ce qui les relie n'est pas
         un voisinage, c'est une CAGE (`COURT_STAIRWELLS`), et le jeu passe de
         l'une à l'autre en changeant de rangée d'un bloc entier.
         ⚠️ C'est le défaut de banc n°1 de CLAUDE.md dans sa forme la plus pure :
         *il mesurait la carte, pas l'interaction*. On appelle donc la vraie
         fonction du moteur (`courtStairwellAt`), comme le jeu.
         ⚠️ ET LA VOLÉE COÛTE SON PRIX : monter un étage n'est pas gratuit. On
         compte `COURT_FLOOR_H / 2` cases par volée — la hauteur d'une tourelle
         parcourue en tournant —, faute de quoi la fenêtre solo serait mesurée
         comme si l'escalier n'existait pas. */
      const passable = (x, y) => {
        if (x < 1 || y < 1 || x >= cw.w - 1 || y >= cw.h - 1) return false;
        return stands0(cw.tile[y * CW + x]);
      };
      const STAIR_COST = Math.round(C.COURT_FLOOR_H / 2);
      const dist = new Map();
      const q = [[bench.x, bench.y + 1]];
      dist.set((bench.y + 1) * CW + bench.x, 0);
      let found = -1;
      while (q.length) {
        q.sort((a, b) => dist.get(a[1] * CW + a[0]) - dist.get(b[1] * CW + b[0]));
        const [x, y] = q.shift();
        const d0 = dist.get(y * CW + x);
        if (Math.abs(x - bell.x) <= 1 && Math.abs(y - bell.y) <= 1) { found = d0; break; }
        const push = (nx, ny, cost) => {
          const k = ny * CW + nx;
          if (!passable(nx, ny)) return;
          if (dist.has(k) && dist.get(k) <= d0 + cost) return;
          dist.set(k, d0 + cost); q.push([nx, ny]);
        };
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) push(x + dx, y + dy, 1);
        /* La volée : on saute au MÊME rectangle, sur l'autre niveau de la cage. */
        const sw = E.courtStairwellAt(x, y);
        if (sw) {
          const here = E.courtFloorOf(y);
          const other = sw.a === here ? sw.b : sw.a;
          const oy = E.courtFloorY0(other) + (y - E.courtFloorY0(here));
          push(x, oy, STAIR_COST);
        }
      }
      ok("⚠️ le beffroi est atteignable DEPUIS LE BANC D'ORGUE", found >= 0, found >= 0 ? `${found} cases` : "AUCUN CHEMIN");
      if (found >= 0) {
        /* ⚠️ LES VOLÉES D'ESCALIER COÛTENT UN SAUT DE RANGÉE : la carte
           d'intérieur empile ses niveaux, donc la distance en cases contient
           déjà les hauteurs. On la convertit en temps à la vraie vitesse. */
        let t = 0;
        for (let travelled = 0; travelled < found; travelled += C.PLAYER_SPEED * C.RUN_SPEED_MULT * DT) t += DT * 1000;
        ok("⚠️ la fenêtre solo du duo est TENABLE (banc d'orgue → beffroi, en courant)",
           t < Q.STAR_DUET_SOLO_FADE_MS, `${(t / 1000).toFixed(1)} s pour ${(Q.STAR_DUET_SOLO_FADE_MS / 1000).toFixed(0)} s`);
        ok("⚠️ …et elle DEMANDE quelque chose",
           t > Q.STAR_DUET_SOLO_FADE_MS * 0.20, `${(100 * t / Q.STAR_DUET_SOLO_FADE_MS).toFixed(0)} % de la fenêtre consommée`);
      }
    }
  }
  /* ── LE CALME DU CRATÈRE EN SOLO : la fenêtre est une DURÉE de tenue, pas un
     trajet. Ce qu'on mesure est qu'elle reste plus longue qu'à deux (sinon le
     solo serait le mode facile) sans devenir une punition. */
  ok("⚠️ la tenue solo du cratère est plus longue qu'à deux",
     Q.STAR_CALM_SOLO_MS > Q.STAR_CALM_MS, `${Q.STAR_CALM_SOLO_MS} ms contre ${Q.STAR_CALM_MS} ms`);
  ok("…sans dépasser le double et demi (au-delà, c'est une punition)",
     Q.STAR_CALM_SOLO_MS <= Q.STAR_CALM_MS * 2.5, `×${(Q.STAR_CALM_SOLO_MS / Q.STAR_CALM_MS).toFixed(2)}`);
  /* ── ZIP 446 — LE REFROIDISSEMENT, ET C'EST UNE PORTE, PAS UN EFFET.
     ⚠️⚠️ CE BLOC EXISTE PARCE QU'AUCUN BANC NE JOUAIT `resolveStarCalm` : la
     mécanique centrale du chapitre 2 n'était vérifiée nulle part, on ne mesurait
     que ses CONSTANTES. C'est le premier visage du défaut de CLAUDE.md — *il
     mesure la carte, pas l'interaction* — et il aura tenu deux zips. */
  {
    const e = Q.devStar(Q.newStar(), "start", 1).star;
    const t0 = e.fall;
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
    for (let k = 0; k < 30 && !Q.starHas(e, "crater"); k++) { t += 500; Q.resolveStarCalm(e, "j1", t, true); }
    ok("⚠️ et en se tenant vraiment tranquille, elle sort", Q.starHas(e, "crater"),
       `${((t - (t1 + Q.STAR_CALM_SOLO_MS * 0.5 + 4200)) / 1000).toFixed(1)} s de tenue`);
    /* ── LA CHALEUR, LA COURBE QU'ON VOIT. Trois bornes, et la troisième est
       celle du modèle : le cratère refroidi FUME ENCORE tant que l'étoile est
       dedans, et il s'éteint quand elle en sort. */
    const e2 = Q.devStar(Q.newStar(), "start", 1).star;
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
  /* Et « tourner le dos » doit vouloir dire quelque chose : le contrôle porte
     sur la FONCTION PURE que le jeu et le banc partagent. */
  {
    /* Debout au sud du cratère (dy > 0), regarder le sud (dir 0) = tourner le
       dos ; regarder le nord (dir 1) = la fixer. */
    ok("dos tourné : regarder au sud quand elle est au nord", Q.starFacingAway(10, 20, 0, 10, 10));
    ok("…et la fixer ne compte pas", !Q.starFacingAway(10, 20, 1, 10, 10));
    ok("⚠️ debout SUR elle, on la regarde forcément", !Q.starFacingAway(10, 10, 0, 10, 10));
  }
  /* La lecture d'ombres refuse deux points trop proches : « deux directions
     identiques ne sont pas un croisement ». */
  {
    const e = Q.devStar(Q.newStar(), "start", 1).star;
    Q.resolveStarFound(e, "furrow", "a", 1); Q.resolveStarFound(e, "crater", "a", 1);
    Q.resolveStarLean(e, "j1", 40, 40, 1000, false);
    const tooClose = Q.resolveStarLean(e, "j2", 42, 42, 2000, false);
    ok("⚠️ deux lectures trop proches ne croisent rien", !!tooClose.armed && !tooClose.mark);
    const far = Q.resolveStarLean(e, "j2", 40 + Q.STAR_LEAN_MIN_TILES + 2, 40, 3000, false);
    ok("…deux lectures assez éloignées marquent un lieu", far.mark === "leanLake", far.mark || "aucune marque");
    const stale = Q.resolveStarLean(e, "j1", 40, 40, 3000 + Q.STAR_LEAN_WINDOW_MS + 1000, false);
    ok("⚠️ une lecture périmée ne croise plus rien", !!stale.armed && !stale.mark);
  }
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
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i];
    if (inBlock) { const e = l.indexOf("*/"); if (e < 0) continue; l = l.slice(e + 2); inBlock = false; }
    const b = l.indexOf("/*");
    if (b >= 0) { const e = l.indexOf("*/", b + 2); if (e < 0) { inBlock = true; l = l.slice(0, b); } else l = l.slice(0, b) + l.slice(e + 2); }
    const c = l.indexOf("//"); if (c >= 0) l = l.slice(0, c);
    if (!l.trim()) continue;
    read++;
    if (MONEY.test(l)) guilty.push(`${i + 1}: ${l.trim().slice(0, 70)}`);
  }
  ok("le scanner a bien lu quelque chose", read > 150, `${read} lignes de code lues (sur ${lines.length})`);
  ok("⚠️ aucune ligne de `quete.js` ne touche à de l'argent", guilty.length === 0,
     guilty.length ? guilty.join(" | ") : `0 sur ${read} lignes lues`);
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
  const nums = ["STAR_CRATER_R", "STAR_CALM_MS", "STAR_CALM_SOLO_MS", "STAR_CALM_FACE_DOT",
    "STAR_LEAN_WINDOW_MS", "STAR_LEAN_SOLO_WINDOW_MS", "STAR_LEAN_MIN_TILES", "STAR_LEAN_SOLO_MIN_TILES",
    "STAR_POOL_R", "STAR_POOL_SOLO_R", "STAR_DIVE_ROUNDS", "STAR_DIVE_PULSE_MS", "STAR_DIVE_SINK",
    "STAR_RACK_ROUNDS", "STAR_SWEEP_MIN", "STAR_SWEEP_MAX", "STAR_RACK_SOLO_NOTCH_MS",
    "STAR_MAGPIE_LAG", "STAR_MAGPIE_PATIENCE_MS", "STAR_MAGPIE_JUMP_TILES", "STAR_MAGPIE_NEST_R",
    "STAR_MAGPIE_SOLO_MS", "STAR_MAGPIE_HOLD_MS", "STAR_DUET_PHRASES", "STAR_DUET_SOLO_FADE_MS",
    "STAR_DUET_NOTE_MS", "STAR_DUET_AIM_MS", "STAR_DUET_ALONE_MUL", "STAR_FALL_MIN_DAY",
    "STAR_FALL_MS", "STAR_TURN_MS", "STAR_END_MS", "STAR_CARD_MS", "STAR_HIDE_R", "STAR_HIDE_MS",
    "STAR_COOL_ROUNDS", "STAR_COOL_MS", "STAR_COOL_RISE", "STAR_COOL_POUR", "STAR_COOL_CRACK",
    "STAR_COOL_BURN", "STAR_COOL_DUO_WIDEN", "STAR_DIVE_HIT_COST_MS",
    "STAR_POOL_VIEW_TILES", "STAR_LURE_VIEW_TILES"];
  const missing = nums.filter(n => typeof Q[n] !== "number" || !isFinite(Q[n]));
  ok("toutes les grandeurs numériques existent et sont finies", missing.length === 0, missing.join(",") || `${nums.length} lues`);
  const arrays = ["STAR_DIVE_DEPTH", "STAR_DIVE_BREATH_MS", "STAR_DIVE_CURRENT", "STAR_RACK_BEADS",
    "STAR_RACK_TRUE_MS", "STAR_DUET_LEN", "STAR_DUET_AIM_DRIFT", "STAR_COOL_BAND", "STAR_LEAN_MARKS"];
  const badArr = arrays.filter(n => !Array.isArray(Q[n]) || !Q[n].length);
  ok("toutes les tables de manches existent", badArr.length === 0, badArr.join(",") || `${arrays.length} lues`);
  /* ⚠️ LES TABLES DE MANCHES DOIVENT COUVRIR LEUR NOMBRE DE MANCHES. Une table
     d'un cran trop courte rend `undefined` au dernier tour — donc un `NaN` dans
     une jauge, donc un mini-jeu ingagnable, et rien ne lève. */
  ok("les profondeurs couvrent les trois plongées", Q.STAR_DIVE_DEPTH.length >= Q.STAR_DIVE_ROUNDS);
  ok("les souffles aussi", Q.STAR_DIVE_BREATH_MS.length >= Q.STAR_DIVE_ROUNDS);
  ok("les courants aussi", Q.STAR_DIVE_CURRENT.length >= Q.STAR_DIVE_ROUNDS);
  ok("les râteliers couvrent les trois manches", Q.STAR_RACK_BEADS.length >= Q.STAR_RACK_ROUNDS);
  ok("…et les durées d'ombre vraie", Q.STAR_RACK_TRUE_MS.length >= Q.STAR_RACK_ROUNDS);
  ok("les bandes de refroidissement couvrent les trois manches", Q.STAR_COOL_BAND.length >= Q.STAR_COOL_ROUNDS);
  ok("les longueurs de phrase couvrent les six phrases", Q.STAR_DUET_LEN.length >= Q.STAR_DUET_PHRASES);
  ok("…et les dérives de la Lyre", Q.STAR_DUET_AIM_DRIFT.length >= Q.STAR_DUET_PHRASES);
  /* Les difficultés doivent MONTER : une table qui redescend est une faute de
     frappe qu'on ne voit qu'en jouant trois fois. */
  ok("les bandes de refroidissement se resserrent", Q.STAR_COOL_BAND.every((v, i, a) => !i || v < a[i - 1]), Q.STAR_COOL_BAND.join(" > "));
  ok("les plongées vont plus profond", Q.STAR_DIVE_DEPTH.every((v, i, a) => !i || v > a[i - 1]), Q.STAR_DIVE_DEPTH.join(" < "));
  ok("le souffle se raccourcit", Q.STAR_DIVE_BREATH_MS.every((v, i, a) => !i || v < a[i - 1]));
  ok("les râteliers grossissent", Q.STAR_RACK_BEADS.every((v, i, a) => !i || v > a[i - 1]), Q.STAR_RACK_BEADS.join(" < "));
  ok("l'ombre vraie tient de moins en moins", Q.STAR_RACK_TRUE_MS.every((v, i, a) => !i || v < a[i - 1]));
  ok("la Lyre dérive de plus en plus", Q.STAR_DUET_AIM_DRIFT.every((v, i, a) => !i || v > a[i - 1]));
  ok("la vitesse de balayage a DEUX bornes, dans le bon ordre", Q.STAR_SWEEP_MIN < Q.STAR_SWEEP_MAX,
     `${Q.STAR_SWEEP_MIN} … ${Q.STAR_SWEEP_MAX}`);
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
  ok("la flaque solo est plus large que la flaque à deux", Q.STAR_POOL_SOLO_R > Q.STAR_POOL_R);
  /* ⚠️⚠️ ET LA FLAQUE NE REMPLIT PAS L'ÉCRAN. C'est LE noir autour d'elle qui
     fait la coopération (« le plongeur ne voit que l'intérieur ») ; une flaque
     qui couvre la moitié de la vue est un mini-jeu de plongée ordinaire avec une
     jolie vignette. Vu à l'écran au premier jet : 42 % de la largeur. */
  {
    const solo = Q.STAR_POOL_SOLO_R / Q.STAR_POOL_VIEW_TILES, duo = Q.STAR_POOL_R / Q.STAR_POOL_VIEW_TILES;
    ok("⚠️ la flaque laisse du NOIR autour d'elle", solo <= 0.26 && duo <= 0.20,
       `solo ${(solo * 100).toFixed(0)} % · à deux ${(duo * 100).toFixed(0)} % du demi-écran`);
    ok("…sans devenir un trou de serrure", duo >= 0.10, `${(duo * 100).toFixed(0)} %`);
  }
  ok("⚠️ la carte de chapitre ne survit pas à sa scène", Q.STAR_CARD_MS < Q.STAR_FALL_MS && Q.STAR_CARD_MS < Q.STAR_TURN_MS);
  /* Les quatre éclats se DÉRIVENT de la table, jamais écrits en dur. */
  ok("les quatre notes viennent de la table", Q.STAR_SHARD_TOTAL === Q.STAR_SITES.filter(s => s.shard).length,
     `${Q.STAR_SHARD_TOTAL} éclats`);
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
     Q.STAR_CAM_GO_MS < Q.STAR_CAM_FLASH_MS,
     `vol ${Q.STAR_CAM_GO_MS} ms, flash à ${Q.STAR_CAM_FLASH_MS} ms`);
  ok("…et elle y reste APRÈS le flash (sinon on ne voit pas ce qu'on est venu voir)",
     Q.STAR_CAM_HOLD_MS > Q.STAR_CAM_FLASH_MS,
     `tenue jusqu'à ${Q.STAR_CAM_HOLD_MS} ms`);
  ok("⚠️ …et elle est revenue au joueur AVANT la fin de la scène",
     Q.STAR_CAM_HOLD_MS + Q.STAR_CAM_BACK_MS <= Q.STAR_FALL_MS,
     `${Q.STAR_CAM_HOLD_MS + Q.STAR_CAM_BACK_MS} ms sur ${Q.STAR_FALL_MS} ms`);
  /* ⚠️ ET LE RETOUR DURE PLUS LONGTEMPS QUE L'ALLER. On part vite (« regarde
     là-bas ») et on revient posément ; l'inverse donne un plan qui fuit. */
  ok("le retour est plus lent que le vol", Q.STAR_CAM_BACK_MS > Q.STAR_CAM_GO_MS,
     `${Q.STAR_CAM_GO_MS} ms → ${Q.STAR_CAM_BACK_MS} ms`);
  /* La carte de chapitre tombe à `STAR_FALL_MS - 3000` : elle ne doit pas
     recouvrir le plan sur l'impact qu'on vient de payer. */
  ok("⚠️ la carte de chapitre n'arrive pas avant que la caméra ait fini de tenir",
     Q.STAR_FALL_MS - 3000 >= Q.STAR_CAM_FLASH_MS,
     `carte à ${Q.STAR_FALL_MS - 3000} ms`);

  /* ── LA CIBLE DU CHEVRON, SUR TOUTE LA QUÊTE. ⚠️ ON REJOUE LA QUÊTE ENTIÈRE
     et on regarde ce que le chevron désignerait à chaque étape : c'est le seul
     moyen de s'apercevoir qu'il pointerait vers un lieu qu'on a déjà trouvé, ou
     vers rien alors qu'il reste quelque chose à faire. */
  {
    const e = Q.newStar();
    Q.resolveStarFall(e, Q.STAR_FALL_MIN_DAY, 1000);
    ok("⚠️ au premier chapitre, le chevron pointe le sillon", Q.starTargetSite(e) === "furrow");
    Q.resolveStarFound(e, "furrow", "banc", 2000);
    ok("…puis le cratère", Q.starTargetSite(e) === "crater");
    Q.resolveStarFound(e, "crater", "banc", 3000);
    /* ⚠️⚠️ ET LÀ, RIEN — C'EST VOULU ET C'EST LE CONTRÔLE LE PLUS UTILE DU BLOC.
       Pendant l'écoute des ombres, il n'y a nulle part où aller : la mécanique
       demande d'aller écouter AILLEURS, deux fois, à trente cases d'écart. Un
       chevron qui désignerait quoi que ce soit à cet instant serait un mensonge
       poli — la famille du `|| clé` du 444, qui n'échoue pas : il affiche. */
    ok("⚠️ pendant l'écoute des ombres, le chevron ne désigne RIEN",
       Q.starTargetSite(e) === null, "les deux lieux sont encore inconnus");
    Q.resolveStarFound(e, "leanLake", "banc", 4000);
    Q.resolveStarFound(e, "leanGlass", "banc", 4100);
    ok("…et il repart dès que les ombres ont parlé", Q.starTargetSite(e) === "lakeShard");
    Q.resolveStarFound(e, "lakeShard", "banc", 5000);
    ok("…puis la verrerie", Q.starTargetSite(e) === "beadShard");
    Q.resolveStarFound(e, "beadShard", "banc", 6000);
    ok("…puis le nid", Q.starTargetSite(e) === "nestShard");
    Q.resolveStarFound(e, "nestShard", "banc", 7000);
    ok("…puis le beffroi", Q.starTargetSite(e) === "belfry");
    Q.resolveStarFound(e, "belfry", "banc", 8000);
    ok("…et enfin le chant", Q.starTargetSite(e) === "song");
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
    const body = (src.split("function starTargetPos(")[1] || "").split("\n  function ")[0];
    ok("⚠️ `starTargetPos` existe", body.length > 100, `${body.split("\n").length} lignes de corps`);
    const targetable = Q.STAR_SITES.filter(s => s.spot && s.spot[0] !== "*").map(s => s.id);
    const orphans = targetable.filter(id => !body.includes(`"${id}"`));
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
   9. LES TEXTES. Chaque clé lue par le jeu doit exister — une phrase manquante
   rend `undefined`, qui s'affiche tel quel dans une bulle.
   ═══════════════════════════════════════════════════════════════════════════ */
section("Les textes de la quête");
{
  const S = await import(pathToFileURL(path.join(tmp, "fermeStrings.js")).href);
  const st = S.FERME_STR.en.star;
  ok("la table `star` existe des deux côtés", !!S.FERME_STR.en.star && !!S.FERME_STR.fr.star);
  ok("⚠️ …et c'est LA MÊME table (une seule écriture)", S.FERME_STR.en.star === S.FERME_STR.fr.star);
  for (const ch of Q.STAR_CHAPTERS) {
    ok(`le chapitre « ${ch.key} » a son titre`, typeof st.chapter[ch.key] === "string");
    ok(`…et son objectif de pisteur`, typeof st.hud.goal[ch.key] === "string");
  }
  for (const op of Q.STAR_DEV_OPS) ok(`le bouton dev « ${op} » a son libellé`, typeof st.dev.op(op) === "string" && st.dev.op(op) !== op);
  for (const sc of Q.STAR_DEV_SCENES) ok(`la scène dev « ${sc} » a son libellé`, typeof st.dev.scene(sc) === "string" && st.dev.scene(sc) !== sc);
  for (const p of ["furrow", "crater", "lean", "dive", "sweep", "lure", "bell", "organ"])
    ok(`l'invite « ${p} » a son texte`, typeof st.prompt(p) === "string" && st.prompt(p) !== "E");
  /* ⚠️⚠️ UN TITRE DE MINI-JEU EST UN NOM, PAS UNE PHRASE, ET LE BANC LE MESURE
     EN CARACTÈRES. Le premier jet passait `rackHint` (« One of these beads used
     to be a star… ») comme titre : à 15 px de chasse fixe sur un canevas de
     640 px, il se faisait couper en plein mot. On tient dans le cadre à condition
     de rester sous ~40 signes — c'est de la géométrie, pas du goût, et c'est
     donc mesurable. */
  const TITLE_MAX = 40;
  for (const [nm, t] of [["cool", st.s1.coolTitle], ["dive", st.s3.diveTitle(1)],
                         ["rack", st.s4.rackTitle], ["lure", st.s4.lureTitle], ["duet", st.s5.duetTitle]]) {
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

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${fails === 0 ? "✅" : "❌"} ${total - fails}/${total} contrôles passés.\n`);
process.exit(fails === 0 ? 0 : 1);
