/* =============================================================================
   verify-vergers.mjs — LE VERGER SE SÈME COMME UNE GRAINE.      (NEUF AU 404)
   -----------------------------------------------------------------------------
   Guillaume, au 404 : « pour les nouveaux arbustes fruitiers et buissons, il
   faut que greg puisse aussi les planter. Donc même mécanisme que les seeds et
   crops habituels, pour qu'ils apparaissent au même endroit dans le shop, et
   que greg puisse les planter. aussi, je ne sais pas pourquoi les fruits
   apparaissent dans le bag... »

   ⚠️ CE QUE CE CHANTIER NE PEUT PAS FAIRE, ET POURQUOI CE N'EST PAS GRAVE.
   Le 398 a sorti les vergers de `CROPS` exprès : tout le pipeline des cultures
   tient sur une hypothèse gravée partout — « une culture disparaît quand on la
   récolte ». Un pérenne dans `CROPS` demanderait un drapeau lu à sept endroits
   dont trois qui ne se connaissent pas. La demande de Guillaume porte sur le
   GESTE, pas sur la table de données : où on l'achète, avec quelle touche on
   le pose, qui d'autre sait le poser. Tout cela est rattrapable sans toucher
   au modèle, et c'est exactement ce que ce contrôle surveille.

   ⚠️ ET IL Y AVAIT UN DÉFAUT PLUS ANCIEN QUE LA DEMANDE : DEUX CHOSES
   S'APPELAIENT « FRUIT ». `f.inv.fruit` — la pomme cueillie sur un arbre de la
   forêt, 18 or, vendue AU BAC sous le libellé « Fruit » — et `f.inv.fruits` —
   les citrons/fraises/framboises/myrtilles des vergers, 70 à 110 or, vendus
   DANS LE SAC. Deux stocks, deux lieux, deux prix, un seul mot à l'écran. La
   question de Guillaume (« je ne sais pas pourquoi les fruits apparaissent
   dans le bag ») a peut-être cette collision pour vraie cause.

   CE QU'IL PEUT ET NE PEUT PAS FAIRE. Les contrôles de MOTEUR font tourner le
   vrai `fermeEngine` : ils plantent, abattent, vendent, et comptent. Les
   contrôles d'INTERFACE sont TEXTUELS — FermeGame.js est du JSX qu'aucun
   parseur d'ici ne sait exécuter (registre npm bloqué, §4 du contexte). Ils
   disent qu'un chemin existe, jamais qu'il est joli.

   Usage :  node tools/verify-vergers.mjs
   ========================================================================== */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeEngine", "fermeStrings"]);
const C = mods.fermeConstants, E = mods.fermeEngine;
const S = mods.fermeStrings.FERME_STR;

const game = fs.readFileSync(path.join(ROOT, "components", "ferme", "FermeGame.js"), "utf8");
const strSrc = fs.readFileSync(path.join(ROOT, "components", "ferme", "fermeStrings.js"), "utf8");
/* On enlève les commentaires avant tout contrôle textuel : un exemple cité
   dans une explication n'est pas du code, et un outil qui ne sait pas les
   distinguer oblige à écrire des commentaires évasifs — donc à moins bien
   documenter. Même règle qu'au verify-cycle du 403. */
const code = game.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

let fails = 0;
const ok = (n, c, x) => { console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  " + x : ""}`); if (!c) fails++; };

console.log("\n=== le verger se sème comme une graine (zip 404) ===\n");

const W = C.MAP_W, H = C.MAP_H;
const at = (x, y) => y * W + x;
const mkWorld = () => ({
  w: W, h: H,
  ground: new Uint8Array(W * H).fill(C.G_GRASS),
  objects: new Uint8Array(W * H).fill(C.O_NONE),
  objHp: new Map(), crops: new Map(), mills: new Map(), sucreries: new Map(),
  orchards: new Map(), buildings: [], bridgeSites: [], bridgeLeverPos: [],
  riverCenter: [], monsters: [],
});

/* ==========================================================================
   1. LE GESTE — LE PLANT EST UNE GRAINE, PAS UNE CONSTRUCTION.
   --------------------------------------------------------------------------
   Réponse de Guillaume : « Case 3 (Graines), comme une graine ». Donc les
   variantes `orchard:*` doivent QUITTER le cycle de la case Construction. Si
   elles restaient aux deux endroits, on aurait deux descriptions du même
   geste — le piège que le 387 a nommé une fois pour toutes, et qui se paye au
   premier ajout d'espèce : un cerisier ajouté d'un côté, introuvable de
   l'autre.
   ========================================================================== */
{
  const m = code.match(/function buildCycle\(\)[\s\S]*?\n  \}/);
  const body = m ? m[0] : "";
  ok("le cycle de la case Construction existe encore", !!body);
  ok("⚠️ plus aucun plant de verger dans le cycle Construction",
     !!body && !/orchard/i.test(body),
     body && /orchard/i.test(body) ? "il en reste un" : "clôture · mur · chemin · lampe · épouvantail · herbe · moulin · chaudron · ponts");
}
{
  /* La case Graines doit savoir poser un plant. On cherche la requête que le
     clic envoie — `plantOrchard` existe déjà côté hôte depuis le 398, donc ce
     chantier n'invente AUCUN message réseau : il rebranche un geste sur un
     chemin déjà écrit, déjà persisté, déjà diffusé. */
  /* ⚠️ CE CONTRÔLE AVAIT TORT À SA PREMIÈRE ÉCRITURE, ET IL PASSAIT.
     Il lisait 900 caractères après `sl === SLOT.seeds`, ce qui débordait
     allègrement sur la branche `SLOT.build` juste en dessous — laquelle
     contient `plantOrchard` depuis le 398. Il annonçait donc « la case Graines
     sait poser un plant » alors qu'elle ne savait rien du tout : il lisait la
     réponse de la case d'à côté. On borne maintenant la branche par le début
     de la suivante, ce qui est la seule délimitation qui ne mente pas. */
  const i0 = code.indexOf("sl === SLOT.seeds)");
  const i1 = code.indexOf("sl === SLOT.build", i0 + 1);
  const branch = i0 >= 0 ? code.slice(i0, i1 > i0 ? i1 : i0 + 400) : "";
  ok("la case Graines sait poser un plant", /plantOrchard/.test(branch),
     /plantOrchard/.test(branch) ? "elle route vers plantOrchard" : "elle n'envoie que « plant »");
  ok("... et sait toujours semer une graine", /action: "plant"/.test(branch));
}
{
  /* ⚠️ UNE SEULE VARIABLE PORTE LA SÉLECTION. La tentation est d'ajouter un
     second état (« et si c'était un plant ? ») à côté de `seedSel`. Deux états
     qui doivent rester d'accord finissent toujours par ne plus l'être : on
     sèmerait du blé en croyant planter un citronnier. Le 398 avait déjà pris
     cette décision pour la case Construction (« la variante porte l'espèce
     dans son nom ») ; on la reprend telle quelle. */
  const extra = code.match(/useState[^;]*\bsapSel\b|const \[sapSel|const \[saplingSel|setSapSel/g) || [];
  ok("⚠️ un seul état porte ce que tient la case Graines", extra.length === 0,
     extra.length ? "SECOND ÉTAT : " + extra.join(" · ") : "seedSel, et rien d'autre");
}
{
  /* La boutique : « qu'ils apparaissent au même endroit dans le shop ». On
     compare les POSITIONS réelles des trois en-têtes dans le fichier, plutôt
     que de chercher une chaîne : c'est la seule façon de vérifier un ORDRE. */
  const iSeeds = code.indexOf("L.shopSeedsHeader");
  const iOrch = code.indexOf("L.orchardShopTitle");
  const iAnim = code.indexOf("L.shopAnimalsHeader");
  ok("les trois en-têtes de la boutique sont là", iSeeds >= 0 && iOrch >= 0 && iAnim >= 0);
  ok("⚠️ les plants sont dans la section Graines & cultures",
     iSeeds >= 0 && iOrch > iSeeds && (iAnim < 0 || iOrch < iAnim),
     iOrch > iSeeds && (iAnim < 0 || iOrch < iAnim) ? "juste sous les graines" : "ils sont restés avec les constructions");
}
{
  /* Le texte d'aide du 398 disait « Pose-les avec l'outil Construction ». Il
     est devenu faux au moment même où la ligne a bougé. C'est la leçon du 403
     appliquée d'avance : un texte qui annonce le mauvais geste ne manque pas
     l'information, il la CONTREDIT. */
  for (const lang of ["fr", "en"]) {
    const s = S[lang].orchardShopHint || "";
    const bad = /outil Construction|Build tool/i.test(s);
    ok(`l'aide des plants n'envoie plus vers la Construction (${lang})`, !bad, bad ? s : "");
  }
}

/* ==========================================================================
   2. GREG PLANTE — ET IL NE LABOURE NI N'ARROSE.
   --------------------------------------------------------------------------
   Un verger n'a besoin d'aucune des trois tâches que Greg connaît : il se pose
   sur l'herbe nue, comme un moulin, et ne s'arrose jamais. C'est une quatrième
   tâche à écrire, pas un paramètre à changer — et c'est le genre de détail qui
   ne se voit pas en relisant l'ordre existant.
   ========================================================================== */
ok("le moteur sait chercher des cases à verger", typeof E.findFreeOrchardTiles === "function");
ok("le moteur sait faire planter Greg", typeof E.gregPlantOrchard === "function");
ok("le moteur sait faire abattre Greg", typeof E.gregChopOrchard === "function");

if (typeof E.findFreeOrchardTiles === "function" && typeof E.gregPlantOrchard === "function") {
  {
    const w = mkWorld();
    const tiles = E.findFreeOrchardTiles(w, { x: 30, y: 30 }, 6);
    ok("il trouve six cases libres autour de l'ancre", tiles.length === 6, tiles.length + " cases");
    /* « un plant par case libre, SERRÉ » (réponse de Guillaume). Serré veut
       dire : la case juste à côté est prise elle aussi. On mesure donc le
       rayon réel du paquet, pas son nombre. */
    const far = tiles.map(i => Math.max(Math.abs((i % W) - 30), Math.abs(Math.floor(i / W) - 30)));
    ok("⚠️ ... et elles sont SERRÉES, pas espacées d'une allée",
       Math.max(...far) <= 2, "rayon max " + Math.max(...far));
  }
  {
    /* Ce qu'il doit REFUSER. Un contrôle qui ne teste que le cas qui marche ne
       protège de rien : ce sont les refus qui décident si Greg plante un
       citronnier au milieu de la rivière. */
    const w = mkWorld();
    const i1 = at(30, 30), i2 = at(31, 30), i3 = at(32, 30), i4 = at(33, 30);
    w.objects[i1] = C.O_TREE;                     // occupée
    w.crops.set(i2, { t: 0, n: 1 });              // déjà cultivée
    w.ground[i3] = C.G_WATER;                     // de l'eau
    const tiles = E.findFreeOrchardTiles(w, { x: 30, y: 30 }, 60);
    ok("il saute la case occupée", !tiles.includes(i1));
    ok("il saute la case déjà cultivée", !tiles.includes(i2));
    ok("il saute l'eau", !tiles.includes(i3));
    ok("il prend bien la case libre d'à côté", tiles.includes(i4));
  }
  {
    const w = mkWorld();
    const i = at(30, 30);
    const done = E.gregPlantOrchard(w, i, 0);
    ok("Greg plante VRAIMENT (le moteur, pas la relecture)",
       done === true && w.objects[i] === C.O_ORCHARD && w.orchards.has(i));
    ok("... et le verger démarre à zéro, pas mûr",
       (w.orchards.get(i) || {}).ripe === 0 && (w.orchards.get(i) || {}).plantedAt > 0);
    /* ⚠️ IL NE PIOCHE PAS DANS LE SAC D'UN JOUEUR. Greg travaille pour la
       ferme : son ordre est payé d'avance sur l'or commun, comme les graines
       depuis le zip 291. S'il consommait `f.inv.saplings`, un ordre lancé par
       un joueur viderait la réserve d'un autre. */
    const f = { inv: { saplings: { lemon: 3 } } };
    E.gregPlantOrchard(w, at(31, 30), 0);
    ok("⚠️ il ne pioche PAS dans la réserve d'un joueur", (f.inv.saplings.lemon | 0) === 3);
  }
  {
    /* Le plafond. Sans lui, un ordre de 200 plants poserait 200 vergers là où
       le 398 en autorise 24 — et l'équilibre mesuré de ce zip (700 à 900
       or/jour/case, contre 427 pour la meilleure culture) sauterait d'un coup.
       On vérifie que le moteur REFUSE, pas qu'on pense à ne pas demander. */
    const w = mkWorld();
    let posed = 0;
    for (const i of E.findFreeOrchardTiles(w, { x: 40, y: 40 }, C.ORCHARD_MAX + 12)) {
      if (E.gregPlantOrchard(w, i, 0)) posed++;
    }
    ok("⚠️ il s'arrête net au plafond de la ferme", posed === C.ORCHARD_MAX,
       posed + " posés, plafond " + C.ORCHARD_MAX);
  }
}

if (typeof E.gregChopOrchard === "function") {
  const w = mkWorld();
  const i = at(30, 30);
  E.gregPlantOrchard(w, i, 0);
  let wood = 0, coups = 0;
  for (let k = 0; k < 10 && w.objects[i] === C.O_ORCHARD; k++) {
    const r = E.gregChopOrchard(w, i, 1); coups++; wood += r.wood | 0;
  }
  ok("Greg abat le verger", w.objects[i] === C.O_NONE, coups + " coups");
  ok("... et le bois tombe", wood === C.ORCHARD_WOOD, wood + " bois");
  /* Le même piège que le 398 avait relevé pour la hache du joueur : une entrée
     orpheline dans la Map ferait hériter la case suivante de l'âge et des
     fruits de l'ancien arbre. On ne le découvre qu'en replantant au même
     endroit, des semaines plus tard. */
  ok("⚠️ ... sans laisser d'entrée fantôme dans la Map", !w.orchards.has(i));
  {
    const w2 = mkWorld();
    const r = E.gregChopOrchard(w2, at(30, 30), 1);
    ok("abattre une case sans verger ne casse rien", r && r.done === false && !(r.wood | 0));
  }
}

/* ==========================================================================
   3. LE MARQUAGE — CE QU'ON DÉSIGNE AU CLIC EST BIEN UN VERGER.
   --------------------------------------------------------------------------
   Réponse de Guillaume, hors des options proposées : « Sélection de plusieurs
   cases au clic, et validation ». Abattre est irréversible : un verger perdu,
   ce sont des heures de pousse et jusqu'à 1 400 or. Le moteur doit donc
   pouvoir dire NON à une case qu'on désigne par erreur, avant la validation.
   ========================================================================== */
ok("le moteur sait dire si une case est un verger abattable",
   typeof E.isChoppableOrchard === "function");
if (typeof E.isChoppableOrchard === "function") {
  const w = mkWorld();
  const i = at(30, 30);
  E.gregPlantOrchard(w, i, 0);
  ok("un verger planté est marquable", E.isChoppableOrchard(w, i) === true);
  ok("de l'herbe nue ne l'est pas", E.isChoppableOrchard(w, at(31, 30)) === false);
  w.objects[at(32, 30)] = C.O_TREE;
  ok("⚠️ un arbre de la forêt non plus (on ne marque QUE ses vergers)",
     E.isChoppableOrchard(w, at(32, 30)) === false);
}

/* ==========================================================================
   3bis. LES CHEMINS DU CHANTIER SONT BRANCHÉS DE BOUT EN BOUT.
   --------------------------------------------------------------------------
   Trois fonctions de moteur justes ne font pas une fonctionnalité : il faut
   qu'un clic y mène et qu'un ordre en sorte. Ces contrôles sont TEXTUELS et ne
   disent rien de l'apparence — ils disent que la chaîne n'a pas de maillon
   manquant, ce qui est précisément ce qu'une relecture rate.
   ========================================================================== */
{
  ok("l'ordre de plantation existe côté hôte", /req\.kind === "gregOrchardOrder"/.test(code));
  ok("l'ordre d'abattage existe côté hôte", /req\.kind === "gregChopOrder"/.test(code));
  ok("Greg a la tâche « planter un verger » dans sa file", /t\.a === "plantOrchard"/.test(code));
  ok("Greg a la tâche « abattre un verger » dans sa file", /t\.a === "chopOrchard"/.test(code));
  /* ⚠️ L'HÔTE REVALIDE CE QUE LE CLIENT A MARQUÉ. Une marque est une
     intention : entre le clic et la validation, un autre joueur a pu abattre
     l'arbre. Et la revalidation doit appeler la MÊME fonction que le marquage,
     jamais une seconde écriture de la règle. On compte donc les appels : il en
     faut au moins deux (le clic, et l'hôte). */
  const uses = (code.match(/E\.isChoppableOrchard\(/g) || []).length;
  ok("⚠️ le client marque ET l'hôte revalide, avec la même règle", uses >= 2,
     uses + " appel(s) à isChoppableOrchard");
  /* Un ordre de plants ne doit pas coûter le prix d'une graine. */
  ok("un plant est facturé au prix du plant", /saplingCost \* (want|tiles\.length|n)/.test(code));
}
{
  /* ⚠️⚠️ LE CONTRÔLE QUI VAUT POUR TOUT LE FICHIER, ET QUI M'A PRIS EN DÉFAUT.
     Le dessin de la ferme vit DANS LA CLOSURE du gros `useEffect`
     ([phase, spritesReady]) — c'est le piège de portée du zip 375. J'ai écrit
     la marque d'abattage en lisant l'état React `gregChopMarks` : le tableau
     capturé est celui du PREMIER rendu, donc vide, pour toujours. Le compte du
     panneau flottant aurait bien augmenté à chaque clic (lui est en React,
     hors closure) et AUCUNE marque ne serait apparue sur la ferme.

     C'est la forme la plus coûteuse de ce piège : la moitié visible de la
     fonctionnalité marche, donc on cherche le défaut partout sauf là. Aucune
     relecture ne l'aurait trouvé — le code lisait exactement la variable qu'il
     fallait, au mauvais endroit. */
  const i0 = code.indexOf("gregChopArmedRef.current && gregChopMarksRef.current.length");
  const iState = code.indexOf("if (gregChopArmed && gregChopMarks.length)");
  ok("⚠️ le dessin des marques lit les REFS, pas l'état React (piège 375)",
     i0 >= 0 && iState < 0,
     iState >= 0 ? "il lit l'état React : les marques ne s'afficheront JAMAIS" : "");
  /* Et le clic aussi : il est appelé depuis un gestionnaire capturé par la
     même closure. */
  ok("... et le clic de marquage aussi", /if \(gregChopArmedRef\.current\) \{/.test(code));
}

/* ==========================================================================
   4. LES FRUITS DESCENDENT AU BAC.
   --------------------------------------------------------------------------
   « je ne sais pas pourquoi les fruits apparaissent dans le bag... » — il a
   raison, et c'est une incohérence, pas un choix : les cultures, les poissons
   et les baies se vendent au bac. Le sac garde ce qu'on FABRIQUE (confitures,
   yaourts, tarte au citron), parce qu'un atelier n'est pas un stock.
   ========================================================================== */
{
  const iBin = code.indexOf("{binOpen &&");
  const iBag = code.indexOf("{bagOpen &&");
  ok("les deux panneaux existent", iBin >= 0 && iBag >= 0);
  /* On délimite chaque panneau par le début de l'autre : les deux blocs se
     suivent dans le rendu, et c'est le seul découpage qui ne dépende pas d'un
     comptage d'accolades — que ce fichier, à seize mille lignes de JSX, rend
     impraticable. */
  /* ⚠️⚠️ ZIP 431 — LE DÉCOUPAGE À DEUX PANNEAUX ÉTAIT FAUX DÈS QU'UN TROISIÈME
     S'INTERCALE, et c'est arrivé : le panneau du MARCHÉ est écrit entre le sac
     et le bac. « Du sac jusqu'au bac » englobait donc tout le marché, et le
     contrôle « plus de barquette dans le sac » échouait en désignant… la
     barquette du marché, qui est exactement ce qu'on voulait y voir. Un banc
     qui accuse la bonne ligne d'être au mauvais endroit est pire qu'un banc
     absent — on va corriger le jeu pour faire taire l'outil.
     La borne d'un panneau est donc le PROCHAIN panneau, quel qu'il soit. */
  const panelEnd = (from) => {
    let end = code.length;
    for (const m of code.matchAll(/\{[a-zA-Z]+Open &&/g)) {
      if (m.index > from && m.index < end) end = m.index;
    }
    return end;
  };
  const bag = iBag >= 0 ? code.slice(iBag, panelEnd(iBag)) : "";
  const bin = iBin >= 0 ? code.slice(iBin, panelEnd(iBin)) : "";
  /* ⚠️ ET CELUI-CI AUSSI AVAIT TORT — DE LA MÊME FAÇON QUE LE JEU.
     Il cherchait `sellFruit` dans le bac, et il le trouvait : le bac contient
     depuis toujours un bouton `sellFruit`… qui vend la POMME DES BOIS. Le
     contrôle validait donc le déplacement des fruits de verger en regardant
     une ligne qui n'a rien à voir. C'est la collision de noms elle-même qui
     m'a induit en erreur, exactement comme elle induit Guillaume en erreur à
     l'écran — la meilleure preuve possible qu'il fallait la lever.
     On cherche donc `punnet:`, qui n'appartient QU'aux fruits de verger : la
     pomme des bois n'a pas de barquette. */
  const RAY = /punnet:/;
  /* ⚠️⚠️ ZIP 431 — CE CONTRÔLE A ÉTÉ RETOURNÉ, ET C'EST UNE DÉCISION DE JEU,
     PAS UNE CONCESSION À UNE RÉGRESSION. Le 404 réclamait que les fruits de
     verger DESCENDENT au bac, avec les cultures et les poissons ; le 431
     déplace la vente TOUT ENTIÈRE au marché de Valley Town (demande de
     Guillaume : « nos produits doivent être vendus exclusivement sur le marché
     […] mais plus vendre » depuis la ferme). La règle du 404 tenait à « les
     fruits doivent se vendre là où se vend le reste » — elle est donc TOUJOURS
     respectée, simplement l'endroit a changé pour tout le monde en même temps.
     Ce qui reste à vérifier, et qui compte autant qu'avant : que la barquette
     n'a pas été OUBLIÉE en route. C'est la ligne la plus facile à perdre —
     elle ne se distingue d'une vente ordinaire que par sa prime de +25 %, et
     personne ne remarque une prime absente. */
  const iMk = code.indexOf("{marketOpen &&");
  const mk = iMk >= 0 ? code.slice(iMk, panelEnd(iMk)) : "";
  ok("le panneau du marché existe", iMk >= 0);
  ok("⚠️ les fruits de verger se vendent AU MARCHÉ", /orchardFruit/.test(mk),
     /orchardFruit/.test(mk) ? "avec tout le reste de la production" : "introuvables au marché");
  ok("⚠️ ... et ne se vendent plus au bac", !RAY.test(bin),
     RAY.test(bin) ? "il en reste un bouton au bac" : "le bac ne fait plus que montrer");
  ok("⚠️ ... ni dans le sac", !RAY.test(bag),
     RAY.test(bag) ? "il en reste une ligne" : "");
  ok("la barquette a suivi les fruits au marché", /punnet: true/.test(mk));
  ok("la barquette garde sa prime (une ligne à elle, pas une quantité)",
     /punnetPrice/.test(mk), /punnetPrice/.test(mk) ? "" : "elle serait vendue au prix unitaire");
  /* La pomme des bois ne doit plus s'appeler comme eux DANS LE CODE non plus :
     tant que la fonction du bac s'appelle `sellFruit` et la requête des
     vergers `sellFruit`, tout grep sur ce mot ramène les deux. */
  ok("⚠️ la pomme des bois a son propre nom dans le code",
     !/const sellFruit = /.test(code), /const sellFruit = /.test(code) ? "sellFruit est toujours la pomme" : "sellWildApple");
  ok("les produits transformés RESTENT au sac (on les fabrique)",
     /makeFruitProduct/.test(bag),
     /makeFruitProduct/.test(bag) ? "" : "l'atelier a été déplacé par erreur");
}
{
  /* ⚠️ LES DEUX « FRUIT ». Tant que la pomme des bois et les fruits de verger
     portent le même mot dans la même langue, aucune ligne du bac n'est
     lisible : deux stocks distincts, deux prix (18 or contre 70 à 110), un
     seul libellé. */
  for (const lang of ["fr", "en"]) {
    const pomme = String(S[lang].fruitLabel || "").toLowerCase();
    const verger = String(S[lang].binFruitsTitle || S[lang].bagFruitsTitle || "").toLowerCase();
    ok(`les deux « fruit » ne portent plus le même nom (${lang})`,
       pomme && verger && pomme !== verger && !verger.startsWith(pomme),
       `« ${S[lang].fruitLabel} » vs « ${S[lang].binFruitsTitle || S[lang].bagFruitsTitle} »`);
  }
}
{
  /* La vente elle-même n'a pas bougé de fichier — on le vérifie quand même :
     déplacer un bouton dans le JSX est exactement le moment où l'on casse la
     fonction qu'il appelle. */
  const f = { id: "p1", name: "T", inv: { fruits: { lemon: 8 } } };
  const s = { money: 0, totalEarned: 0 };
  const r1 = E.resolveSellFruit(f, s, "lemon", false);
  ok("vendre un fruit à l'unité marche encore", r1.ok && s.money === C.fruitSpec("lemon").sell);
  const r2 = E.resolveSellFruit(f, s, "lemon", true);
  ok("vendre une barquette marche encore", r2.ok && (f.inv.fruits.lemon | 0) === 1,
     `reste ${f.inv.fruits.lemon}`);
  const r3 = E.resolveSellFruit(f, s, "lemon", true);
  ok("⚠️ une barquette incomplète le DIT (leçon du 402)", !r3.ok && !!r3.toast, r3.toast || "MUET");
}

/* ==========================================================================
   5. LE BILINGUISME DES NOUVELLES PHRASES.
   Toute phrase ajoutée d'un côté et pas de l'autre affiche « undefined » à
   l'écran — le moteur parle, l'interface bafouille.
   ========================================================================== */
{
  const KEYS = ["binFruitsTitle", "gregOrderSaplingTitle", "gregOrderChopBtn",
                "gregChopArmHint", "gregChopCount", "gregChopFab", "gregChopNone",
                "toastGregChopDone", "toastGregNoOrchardRoom", "seedMenuOrchardTitle",
                "orchardShopHint"];
  for (const lang of ["fr", "en"]) {
    const missing = KEYS.filter(k => !S[lang][k]);
    ok(`les phrases du chantier existent en ${lang}`, missing.length === 0, missing.join(", "));
  }
}
ok("les nouvelles phrases sont BRANCHÉES dans FermeGame.js",
   /L\.binFruitsTitle/.test(code) && /L\.gregChopFab/.test(code) && /L\.seedMenuOrchardTitle/.test(code));

/* ⚠️ LA TOUCHE ANNONCÉE. Même généralisation qu'au 403 : on compare à la
   position RÉELLE de la case Graines, calculée depuis SLOT_ORDER, jamais à un
   chiffre écrit ici. Un contrôle qui cherche une valeur périmée ne protège que
   du passé. */
{
  const m = game.match(/const SLOT_ORDER = \[([^\]]*)\]/);
  const order = m ? m[1].split(",").map(x => x.trim().replace(/["']/g, "")).filter(Boolean) : [];
  const seedKey = order.indexOf("seeds") + 1;
  ok("la position de la case Graines est connue", seedKey > 0, "touche " + seedKey);
  /* ⚠️ ET LE CONTRÔLE DU 403 AVAIT ATTEINT SA LIMITE, LÀ AUSSI.
     Il interdit tout « (touche N) » dans fermeStrings.js qui ne soit pas celui
     de la case Construction — ce qui rendait cette phrase-ci littéralement
     impossible à écrire juste, puisqu'elle parle d'une AUTRE case. La sortie
     n'est pas d'assouplir le contrôle (règle du 399 : un contrôle qui sort
     tout le catalogue a tort, mais un contrôle qui se relâche ne dit plus
     rien) : c'est de retirer le numéro du TEXTE. `orchardShopHint` est
     désormais une fonction qui reçoit sa touche de `SLOT_ORDER`. Elle ne peut
     plus périmer, et il n'y aura rien à recorriger au prochain
     réordonnancement de la barre — contrairement au 401 puis au 403, qui ont
     dû recorriger la même phrase deux fois. */
  for (const lang of ["fr", "en"]) {
    const f = S[lang].orchardShopHint;
    ok(`l'aide des plants reçoit sa touche, elle ne l'écrit pas (${lang})`,
       typeof f === "function", typeof f);
    if (typeof f === "function") {
      const rendered = String(f(seedKey));
      const wrong = (rendered.match(/touche (\d)|key (\d)/g) || [])
        .filter(t => !new RegExp(`(touche|key) ${seedKey}$`).test(t));
      ok(`... et elle annonce la BONNE touche une fois rendue (${lang})`,
         wrong.length === 0, wrong.join(", ") || `touche ${seedKey}`);
    }
  }
  /* Et le numéro ne doit pas être réapparu en dur ailleurs dans la phrase. */
  ok("aucun « touche 3 » écrit en dur dans les textes",
     !/\(touche 3\)|\(key 3\)/.test(strSrc));
}

console.log(fails ? `\n${fails} ÉCHEC(S)\n` : "\nTout est passé.\n");
console.log(`Ce script ne dit RIEN de ce qu'on ressent en jouant : ni si le paquet de
vergers que pose Greg tombe au bon endroit, ni si la marque rouge sur un arbre
condamné se voit assez. Il dit que le plant se pose depuis la case Graines et
depuis nulle part ailleurs, que Greg sait le poser et l'abattre sans piocher
dans le sac de personne, et que les fruits se vendent là où se vendent les
cultures.\n`);
process.exit(fails ? 1 : 0);
