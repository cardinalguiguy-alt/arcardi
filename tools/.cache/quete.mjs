/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 444 — LA QUÊTE DE L'ÉTOILE : « LE BATEAU DES ÉTOILES » / « THE STAR BOAT ».
   ═══════════════════════════════════════════════════════════════════════════
   Ce fichier est la TABLE de la quête et ses règles pures. Il ne dessine rien,
   il n'appelle pas React, il n'ouvre aucun panneau : `FermeGame.js` le lit,
   `tools/verify-quete.mjs` l'importe, et les textes vivent dans
   `fermeStrings.js` comme tout ce que le joueur lit.

   ⚠️ IL REMPLACE `enquete.js` (442), retiré en entier sur décision de Guillaume
   au 444 : l'enquête cadastrale était bonne et mesurée, elle n'était pas pour
   ce public. **Sa FORME est reprise telle quelle** — table pure d'un côté,
   textes de l'autre, résolveurs qui n'appliquent rien eux-mêmes, `migrate*`
   tolérant, dev-ops qui jettent le gain. Son CADRE (21 lieux, 8 chapitres, 3
   codes, un Vigenère, deux issues qui touchaient `marketRate`) n'est pas repris.
   Le détail de conception est dans `components/ferme/QUETE.md`.

   ───────────────────────────────────────────────────────────────────────────
   L'HISTOIRE, EN SIX LIGNES (le détail est dans `QUETE.md`)

   ⚠️⚠️ RÉÉCRITE AU 452. Ce bloc racontait encore la LYRE — « une lyre à qui il
   manque une corde » — deux zips après que le 450 l'a remplacée par le BATEAU
   (voir le bloc ZIP 450 plus bas, qui, lui, était juste). C'est le même défaut
   qu'au §1 de `QUETE.md` : **quand la fiction change, tout ce qui la RACONTE
   fait partie de la livraison**, y compris les commentaires — un en-tête faux
   est lu par le prochain qui ouvre le fichier, et il le croit.

   Les étoiles naviguent. L'une d'elles fait naufrage au-dessus de la vallée :
   SON BATEAU SE CASSE EN TOMBANT, en cinq morceaux. Le gros de l'épave — et
   l'étoile avec — creuse un cratère dans un pré à l'est de Valley Town ; LA
   COQUE dépasse la ville et se plante dans le champ de la ferme.
   ⚠️ ZIP 453 — CE PARAGRAPHE DISAIT « le gros de la COQUE creuse un cratère »,
   ce qui contredisait `SHIP_SITE_OF` trois cents lignes plus bas (`hull` vient
   de `furrow`, le champ de la FERME). Une seule table dit où est quoi ; un
   commentaire qui dit autre chose est un second récit, et c'est celui-là qu'on
   lit en ouvrant le fichier.
   L'étoile est vivante, plus petite qu'une
   poule, terrifiée : sans son bateau, elle ne rentre pas. Chaque morceau CHANTE
   UNE NOTE quand on le touche. Les joueurs les retrouvent, et quand les quatre
   chantent enfin ensemble la phrase s'arrête net : **le bateau n'a pas de
   cloche, et un bateau qui ne peut pas sonner ne traverse pas**. Alors la cloche
   de l'église — fondue il y a cent ans dans une étoile tombée qui n'est jamais
   repartie, trop lourde pour rentrer, jamais allée en mer — demande à embarquer.

   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️⚠️ LA GRAMMAIRE MAGIQUE, ET C'EST LA SEULE CHOSE À RETENIR DE CE FICHIER

       « La lumière de l'étoile ne montre pas ce qu'une chose EST.
         Elle montre ce qu'une chose SE RAPPELLE. »

   Une phrase, et elle explique les six mini-jeux, la coopération, et pourquoi
   il faut être deux. ⚠️ **LA COOPÉRATION N'EST PAS UNE SERRURE, C'EST UNE
   CONSÉQUENCE : on ne peut pas tenir la lumière ET lire l'ombre.** Celui qui la
   tient est ébloui et a l'ombre dans le dos ; celui qui lit est dans le noir et
   n'a pas de lampe. Deux personnes, deux postes, toujours — et jamais parce
   qu'une porte a deux serrures. Le premier jet EMPRUNTAIT ses verrous (deux
   clés, un contrepoids, un guetteur) ; Guillaume l'a refusé en une phrase
   (« ne t'embête pas à recopier les mécaniques des autres jeux coopératifs »).
   Ce qui a suivi est meilleur ET plus court.

   ⚠️⚠️ ET ELLE NE COÛTE RIEN AU RÉSEAU, parce qu'elle est bâtie sur les
   POSITIONS, QUI CIRCULENT DÉJÀ. Qui est où (`x`,`y`,`zone`), qui bouge
   (`moving`), et — c'est la trouvaille de ce zip — **où l'on REGARDE (`dir`)** :
   tout est dans le paquet de `pubMe` depuis toujours. §3 de `CLAUDE.md` : ce qui
   peut se déduire ne se diffuse pas. On n'ajoute AUCUN champ — le 432 a trouvé
   un champ (`sit`) qui circulait sans être lu, c'est-à-dire des octets pour rien.

   ⚠️⚠️⚠️ LE THÈME EST LE SECRET, ET LE ZIP 455 A DÛ EN COUPER LE MOT EN DEUX.
   Ce paragraphe disait : « personne d'autre ne voit l'étoile. Aucun PNJ ne donne
   la quête, aucun panneau ne l'annonce, le tableau des nouvelles n'en dit pas un
   mot. Elle ARRIVE. » La moitié reste vraie et l'autre est morte au 455, sur
   demande de Guillaume (« le lancement de la mission doit être annoncé, pas
   automatique, la comète ne doit pas arriver comme ça »).
   **LA PIERRE EST PUBLIQUE, L'ÉTOILE RESTE SECRÈTE**, et cette phrase est
   désormais la conséquence de code :
     · des astronomes prédisent une pluie d'astéroïdes ; l'affiche de la mairie le
       dit, les habitants s'en inquiètent, l'hôte décide QUAND ça commence, et
       toute la vallée voit tomber le caillou (`e.warn`, puis `e.fall`) ;
     · **ce qu'il y avait dedans, personne ne le saura jamais.** Aucun PNJ ne
       parle de l'étoile, aucun ne dit où chercher, `STAR_HIDE_R` la fait rentrer
       dans le col du joueur dès qu'un habitant approche, et le guide reste un
       ANIMAL (449) parce qu'un habitant qui renseignerait le joueur démolirait la
       meilleure page du chantier.
   ⚠️ LE CONTRASTE RENFORCE LE SECRET AU LIEU DE LE DÉMOLIR : jusqu'ici le silence
   de la vallée était une absence, il devient une étrangeté — tout le monde a vu la
   pierre, tout le monde en parle, et pas une seule personne ne voit la lumière qui
   vous suit. `L.star.fall.quiet` est réécrite dans ce sens (elle disait
   « personne ne sort regarder », ce que le 455 rend faux : ils ont tous un « ! »
   au-dessus de la tête).
   ⚠️ ET C'EST LE BANC QUI TIENT LA MOITIÉ QUI RESTE : `verify-quete` refuse
   qu'une phrase de PNJ (rumeur ou indice) nomme l'étoile ou dise où aller.

   ⚠️⚠️ TOUT L'ÉTAT TIENT DANS `shared.star`, ET C'EST UN CHAMP DE PLUS DANS LE
   JSON DE `ferme_saves` — AUCUNE MIGRATION SQL, exactement comme `townChop`
   (426), `wardrobe` (427) et `enquete` (442). Absent d'une sauvegarde
   antérieure = quête pas commencée, ce qui est le bon comportement.
   ⚠️ Et c'est bien « le mécanisme déjà en place » : `saveGameState` est celui du
   JEU COURANT DU SALON (Puissance 4 et compagnie), il se perdrait au premier
   changement de jeu et couperait l'état du monde en deux magasins qu'on ne peut
   pas réconcilier.

   ⚠️ LA QUÊTE EST PARTAGÉE, PAS PERSONNELLE — même raison qu'au 442. Les quêtes
   de découverte (`C.QUESTS`) vivent dans `f.quests`, par fermier, parce qu'elles
   apprennent à jouer. Celle-ci est une histoire DU MONDE : deux joueurs la
   mènent ensemble et le pisteur dit qui a trouvé quoi. Un second joueur qui
   regarde l'autre cocher sa propre liste ne joue pas, il assiste.

   ⚠️⚠️ ET ELLE NE TOUCHE À AUCUN PRIX. C'est une différence de fond avec le 442,
   qui modifiait `marketRate` et a dû s'en justifier sur vingt lignes : ici, rien
   dans ce fichier ne peut faire diverger deux écrans sur le prix du blé. La
   récompense n'est pas de l'or (§8).
   ═══════════════════════════════════════════════════════════════════════════ */

import * as C from "./fermeConstants.mjs";

/* ───────────────────────────────────────────────────────────────────────────
   1. LES LIEUX. Un lieu = un endroit du monde où il se passe quelque chose et
   qui laisse une trace dans l'état partagé.

   ⚠️ `zone` N'EST PAS DE LA DÉCORATION, C'EST CE QUI EMPÊCHE LE PIÈGE DES DEUX
   CARTES (§4 de `CLAUDE.md`). L'hôte vérifie qu'une trouvaille arrive bien de la
   bonne ZONE **avant de regarder la moindre distance** — la discipline exacte
   d'`atMarket` (431) et de l'enquête (442). Le rectangle du marché de la ville
   tombe aussi au milieu des champs de la ferme : sans ce test, une trouvaille
   de ponton se validerait depuis un pré.

   ⚠️⚠️⚠️ ZIP 453 — LA COLONNE `shard` EST SUPPRIMÉE, ET C'EST LA CORRECTION LA
   PLUS CHÈRE DE CE ZIP. Elle marquait « une des QUATRE notes » et portait un
   second compte (`starShards` / `STAR_SHARD_TOTAL` = 4) à côté du compte du
   NAVIRE (`starShipBuilt` / `STAR_SHIP_TOTAL` = 5). Les deux étaient justes
   **dans leur propre liste**, donc aucun banc ne pouvait les voir se
   contredire — et à l'écran, après la plongée du lac, le joueur lisait TROIS
   réponses différentes à la même question : le navire montrait 2 sur 5, la
   bulle disait « Trois morceaux », le chat disait « n sur 4 ».
   ⚠️ La cause est datée : le 444 comptait des NOTES (quatre, plus celle de la
   cloche) ; le 450 a posé un CINQUIÈME morceau — la coque — sans recompter les
   phrases. *Un compteur ajouté ne recompte pas les phrases déjà écrites.*
   ⚠️ IL N'Y A DONC PLUS QU'UN SEUL OBJET COMPTÉ, ET D'UNE SEULE FAÇON : les
   cinq morceaux du bateau. Les mots « note » et « morceau » désignent désormais
   la même chose, et `tools/verify-quete.mjs` refuse tout nombre de morceaux
   écrit en dur dans un texte de quête — ce qui empêche un sixième morceau de
   refaire exactement la même chose en silence.
   ─────────────────────────────────────────────────────────────────────────── */
export const STAR_SITES = [
  // ── Chapitre 1 : cinq petits impacts, dispersés sur la ferme.
  { id: "farmStarBlue", zone: "farm", spot: "starFarmImpact", impact: 0, content: "star", color: "blue" },
  { id: "farmEmptyA",   zone: "farm", spot: "starFarmImpact", impact: 1, content: "empty" },
  { id: "farmMaterial", zone: "farm", spot: "starFarmImpact", impact: 2, content: "material" },
  { id: "farmStarRose", zone: "farm", spot: "starFarmImpact", impact: 3, content: "star", color: "rose" },
  { id: "farmEmptyB",   zone: "farm", spot: "starFarmImpact", impact: 4, content: "empty" },
  // ── Chapitre 2 : le cratère. On ne trouve pas un morceau, on trouve QUELQU'UN.
  { id: "crater",    zone: "town",  spot: "starCrater" },
  { id: "leanLake",  zone: "town",  spot: "*lean" },   // révélé par le croisement d'ombres
  { id: "leanGlass", zone: "town",  spot: "*lean" },
  // ── Chapitre 3 : le lac.
  { id: "lakeShard", zone: "town",  spot: "starPier",  req: ["leanLake"] },
  // ── Chapitre 4 : la voleuse. Un lieu, une histoire, deux morceaux.
  { id: "beadShard", zone: "town",  spot: "starGlassworks", req: ["leanGlass"] },
  { id: "nestShard", zone: "town",  spot: "starNest",       req: ["beadShard"] },
  // ── Chapitre 5 : l'église. Le beffroi, puis le chant.
  { id: "belfry",    zone: "court", spot: "starBell" },
  { id: "song",      zone: "court", spot: "starBell",  req: ["belfry"] },
];
export const STAR_SITE = Object.fromEntries(STAR_SITES.map(s => [s.id, s]));
export const STAR_FARM_IMPACTS = STAR_SITES.filter(s => s.spot === "starFarmImpact");
export const STAR_FARM_STAR_IDS = STAR_FARM_IMPACTS.filter(s => s.content === "star").map(s => s.id);

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 450 — LE NAVIRE. « CONSTRUIRE QUELQUE CHOSE AVEC LES ÉTOILES. »
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DEMANDE DE GUILLAUME, MOT POUR MOT : « construire un bateau magique avec
   les étoiles. Une fois qu'on les récolte toutes […] on arrive à bâtir un grand
   navire qui permettra de prendre le large et d'amarrer sur des îles, dans le
   futur. » Et, juste avant, le refus qui a produit celle-ci : *« l'idée de
   construire une lyre est un peu arbitraire ? »* — elle l'était. Une lyre est un
   objet d'ADULTE : un enfant de sept ans ne sait pas ce que c'est, donc « pourquoi
   on construit ça ? » est la première question qu'il pose, et c'est très
   exactement celle qu'on ne veut pas entendre (règle des 60 secondes).
   **Un bateau cassé qu'on répare ne demande aucune explication.**

   ⚠️⚠️⚠️ ET IL N'AJOUTE PAS UN SEUL CHAMP D'ÉTAT — C'EST TOUT LE POINT DE CE
   BLOC. Les cinq morceaux du navire sont une LECTURE des cinq trouvailles qui
   existaient déjà, pas une seconde comptabilité :

       la coque   ← `furrow`      (chapitre 1, le champ de la ferme)
       le safran  ← `lakeShard`   (chapitre 3, le fond du lac)
       le mât     ← `beadShard`   (chapitre 4, la perle de la verrerie)
       la voile   ← `nestShard`   (chapitre 4, le nid de la pie)
       la cloche  ← `song`        (chapitre 5, ce que la cloche donne)

   Un compteur `ship: 3` dans l'état partagé aurait été le réflexe, et il aurait
   été le doublon du §8 de `CLAUDE.md` — « un paramètre qui double un autre est une
   divergence en attente ». Le jour où l'on déplace une trouvaille, le navire suit
   tout seul ; il ne peut PAS afficher quatre morceaux pour trois éclats trouvés.
   Zéro migration SQL, zéro `send()`, zéro champ dans le paquet de position.

   ⚠️ LA CLOCHE EST LE CINQUIÈME MORCEAU, ET C'EST CE QUI SAUVE LE RETOURNEMENT.
   Elle a été fondue il y a cent ans dans une étoile tombée qui n'est jamais
   repartie : elle est trop lourde pour rentrer, elle n'a jamais eu de bateau.
   Elle donne sa voix, elle devient la cloche de bord — donc **elle voyagera**
   sans jamais rentrer. Le sacrifice reste, il se change en départ, et un enfant
   comprend « la cloche va enfin voir la mer » sans qu'on lui explique rien.
   ⚠️ Le morceau qu'on ne trouve pas DEHORS est donc le dernier, et il se VOIT :
   quatre logements allumés, un noir. C'est la règle des 10 secondes tenue par un
   objet du monde au lieu d'un bandeau — le sujet entier de cette passe.

   ⚠️⚠️ L'ORDRE DES CINQ CLÉS N'EST PAS ÉCRIT ICI : il vient de
   `C.STAR_SHIP_ORDER`, que `fermeArt.js` lit aussi pour savoir quelle pièce il
   peint. Une seconde liste ici aurait été le doublon le plus sournois possible —
   les deux auraient eu l'air justes, et le jour où l'on intervertit deux morceaux
   le bateau aurait affiché une voile là où le joueur a trouvé un safran, **sans
   qu'aucun banc ne puisse le voir** (chacun aurait mesuré sa propre liste). C'est
   le défaut du bandeau et du chevron au 449, pris à l'avance : *une jointure,
   jamais deux listes.*
   ───────────────────────────────────────────────────────────────────────────── */
const SHIP_SITE_OF = {
  hull: "farmMaterial", rudder: "lakeShard", mast: "beadShard", sail: "nestShard", bell: "song",
};
export const STAR_SHIP_PARTS = C.STAR_SHIP_ORDER.map(key => ({ key, site: SHIP_SITE_OF[key] }));
export const STAR_SHIP_TOTAL = STAR_SHIP_PARTS.length;   // 5 — jamais écrit en dur ailleurs
export const STAR_SHIP_KEYS = C.STAR_SHIP_ORDER;

/* Quels morceaux sont posés, DANS L'ORDRE DE LA TABLE. ⚠️ Rend un tableau de
   booléens et non un compte : le dessin a besoin de savoir LEQUEL manque (un
   logement vide n'est pas au même endroit selon la pièce), et un compte seul
   forcerait à supposer que les morceaux arrivent dans l'ordre. Ils n'y arrivent
   pas — le chapitre 4 en donne deux d'affilée, et rien n'interdit de finir le lac
   après la verrerie le jour où l'ordre des chapitres bouge. */
/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 454 — UN MORCEAU POSÉ DEMANDE DEUX CHOSES, ET C'EST TOUTE LA PASSE.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DEMANDE DE GUILLAUME : « tristan devra produire étape par étape les
   planches et pièces nécessaires pour assurer l'avancement de la construction.
   Le rôle des étoiles est de nous guider dans le projet. » Ça se lit en une
   ligne de code : un morceau est posé quand **l'étoile s'en souvient** (la
   trouvaille) ET quand **le bois existe** (la pièce livrée par le bûcheron).
   Avant ce zip, la seconde moitié n'existait pas : on trouvait un éclat et une
   voile apparaissait toute seule sur la cale. Un bateau qui se construit sans
   personne qui le construise est joli et il ne veut rien dire.
   ⚠️⚠️ ET CE N'EST TOUJOURS PAS UN SECOND COMPTEUR — c'est la leçon du 452, tenue
   une deuxième fois. `wood` n'est pas « combien de morceaux », c'est « quelles
   pièces Tristan a livrées », indexé par les MÊMES clés que le navire. Rien ne
   peut afficher quatre morceaux pour trois pièces : il n'y a qu'un `ET` entre
   deux lectures, jamais une addition tenue à part.
   ⚠️ LA GRAMMAIRE MAGIQUE EST INTACTE, ET ELLE S'EN TROUVE MIEUX : la lumière de
   l'étoile montre ce qu'une chose SE RAPPELLE — elle se rappelle la forme du
   safran, pas le chêne dont on le taille. Il fallait bien que quelqu'un aille
   couper le chêne. */
export function starTimberDone(e, key) {
  const w = e && e.wood && e.wood[key];
  return !!(w && w.done);
}
export function starTimberOrder(e, key) {
  const w = e && e.wood && e.wood[key];
  return w && !w.done ? w : null;
}
/* ╔════════════════════════════════════════════════════════════════════════════
   ║ ZIP 459 — CE QUE TRISTAN EST EN TRAIN DE FAIRE, ET OÙ ÇA EN EST.
   ╚════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DEMANDE DE GUILLAUME : *« rends plus explicite la commande auprès de
   Tristan. Il faut une bulle spéciale où l'on voit Tristan se mettre au travail. »*
   Jusqu'ici, commander une pièce fermait un panneau et il ne se passait RIEN :
   le bûcheron continuait d'abattre ses arbres comme si de rien n'était, et la
   seule trace de la commande était une ligne grisée dans un panneau qu'il faut
   rouvrir pour la lire. C'est le défaut du 453 (« un texte affirme, le monde ne
   montre pas ») sur le seul geste de la quête qui coûte du bois et du temps.
   ⚠️ DEUX FONCTIONS, PAS UNE : ce qu'il fait (`starTimberBusy`) et où ça en est
   (`starTimberProgress`). La bulle a besoin des deux, et une seule qui rendrait
   « la clé plus un pourcentage » forcerait tous les autres appelants à démêler.
   ⚠️ ET LE PROGRÈS SE DÉRIVE DES DEUX DATES DÉJÀ ÉCRITES (`at`, `readyAt`), il
   n'est jamais stocké : un troisième champ à faire vieillir pour une barre qui se
   recalcule en une soustraction, c'est le §3 pris à l'envers. */
export function starTimberBusy(e) {
  for (const k of STAR_SHIP_KEYS) {
    const w = starTimberOrder(e, k);
    if (w) return { key: k, at: w.at, readyAt: w.readyAt, by: w.by || "" };
  }
  return null;
}
export function starTimberProgress(e, now) {
  const w = starTimberBusy(e);
  if (!w) return 0;
  const span = w.readyAt - w.at;
  if (!(span > 0)) return 1;
  return Math.max(0, Math.min(1, ((+now || 0) - w.at) / span));
}
export function starShipHas(e, key) {
  const p = STAR_SHIP_PARTS.find(q => q.key === key);
  return !!(p && starHas(e, p.site) && starTimberDone(e, key));
}
export function starShipParts(e) { return STAR_SHIP_PARTS.map(p => starHas(e, p.site) && starTimberDone(e, p.key)); }
export function starShipBuilt(e) { return starShipParts(e).filter(Boolean).length; }
/* ⚠️ « FINI » N'EST PAS « QUÊTE FINIE » : les cinq morceaux sont posés dès que la
   cloche a chanté, et la scène finale se joue APRÈS. Les distinguer laisse le
   navire s'achever à l'écran pendant la résolution, au lieu d'apparaître d'un coup
   sur un fondu — et `starDone` reste le seul témoin de la fin. */
export function starShipComplete(e) { return starShipBuilt(e) === STAR_SHIP_TOTAL; }

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 453 — QUI PREND LE LARGE, ET POURQUOI CE N'EST PAS L'ÉTOILE.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DÉCISION DE GUILLAUME, MOT POUR MOT : « Quand c'est fini, le bateau est
   construit et réel. Eduardo Da Fonseca (quand il est recruté) le prend et part
   au large, explique qu'il va explorer le large. Ça laisse de la marge
   narrative, pour développer de nouveaux mondes et ensuite permettre au bateau
   de revenir. »
   ⚠️ CE QU'ELLE CORRIGE : `end1` et `end2` affirmaient que le navire larguait
   les amarres à la résolution, et le rendu ne le montrait JAMAIS — il lisait
   `starShipParts` et ne testait pas `doneAt`, donc un bateau complet restait à
   quai pour toujours sous une phrase qui venait de dire le contraire. *Un texte
   n'est pas un décor : il AFFIRME* (448). Les deux phrases sont réécrites, et
   le départ a désormais un porteur.
   ⚠️⚠️ ET IL NE COÛTE NI ÉTAT NI MESSAGE : « Eduardo est en voyage » existe
   depuis le 258 (`res.trip.phase === "away"`, dans l'état partagé, diffusé et
   persisté). La cale se vide quand il part, elle se remplit quand il rentre —
   c'est-à-dire que le monde raconte le voyage tout seul, avec un champ qui
   circulait déjà (§3 de `CLAUDE.md`).
   ⚠️ ELLE EST ICI, PURE, PARCE QUE LE JEU ET LE BANC LA LISENT TOUS LES DEUX :
   écrite dans la closure de la boucle de rendu, elle aurait été invisible aux
   deux (piège n°1, deuxième visage). */
export function starShipGone(e, voyagerAway) {
  return !!(starDone(e) && voyagerAway);
}

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 454 — LES PLANS. « ON NE CONSTRUIT PAS UN BATEAU EN LE REGARDANT. »
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DEMANDE DE GUILLAUME, EN TROIS TEMPS ET DANS CET ORDRE : (1) « le fantôme
   du bateau (visualisation virtuelle) […] ne doit être visible que lorsqu'on a
   trouvé le moyen de produire *le plan* de construction » ; (2) « un nouveau pnj
   ingénieur devra être contacté via une demande à la mairie ; sur conseil (guidé)
   de la première étoile récoltée dans le cratère » ; (3) « quand on ouvrira le
   plan on verra le plan virtuel du bateau. Et si on ouvre le plan à côté du lac,
   on verra effectivement le fantôme virtuel du bateau ; mais seulement à partir
   de ce moment là. »
   ⚠️⚠️ CE QUE ÇA CORRIGE EST UN DÉFAUT DE FOND DU 450, ET IL ÉTAIT SOUS NOS YEUX :
   le navire dessinait ses CINQ FANTÔMES dès la première nuit de la partie, avant
   la chute, avant la quête, à quiconque passait sur la rive. Une silhouette
   spectrale de bateau complet, gratuitement, à un joueur qui n'a rien commencé —
   c'est-à-dire que le jeu montrait la fin de l'histoire à qui n'en avait pas lu la
   première ligne. Le fantôme est une PROMESSE : il faut l'avoir méritée.
   ⚠️ LA CALE, ELLE, RESTE VISIBLE (décision du 450, toujours juste : « le joueur
   qui n'a pas la quête voit un chantier naval, un endroit de vie de plus sur une
   rive qui n'en avait aucun »), et sa collision ne bouge donc pas d'une case.

   ⚠️⚠️ TROIS ÉTATS, UNE SEULE DATE POSÉE PAR L'HÔTE. `plan.at` est l'instant de la
   commande ; l'arrivée et la remise s'en DÉDUISENT (`+ TRAVEL`, `+ TRAVEL + WORK`)
   — deux échéances écrites à côté auraient été deux nombres à tenir d'accord (§8).
   ⚠️ ET LA BASCULE « les plans sont prêts » EST DIFFUSÉE PAR L'HÔTE, exactement
   comme le retour d'Eduardo (`res.trip.returnAt`, zip 258) : un client qui la
   déduirait de SA propre horloge comparerait deux horloges (§3 de `CLAUDE.md`).
   Le compte à rebours affiché, lui, est cosmétique et se lit comme celui du
   voyageur — une seconde d'écart sur quinze minutes ne raconte rien de faux. */
export function starPlanAsked(e) { return !!(e && e.plan && e.plan.at); }
export function starPlanReady(e) { return !!(e && e.plan && e.plan.done); }
/* L'ingénieur est-il SUR PLACE ? ⚠️ IL Y RESTE TANT QU'IL TRAVAILLE, ET PAS UNE
   MINUTE DE PLUS : un PNJ qui ne bouge plus une fois son travail rendu devient un
   décor, et un décor qui a une réplique de quête est un mensonge poli. Il repart
   avec le train du soir, et le plan reste. */
export function starEngineerHere(e, now) {
  if (!starPlanAsked(e) || starPlanReady(e)) return false;
  return (+now || 0) >= (e.plan.at + C.STAR_ENG_TRAVEL_MS);
}
export function starPlanPhase(e, now) {
  if (!starPlanAsked(e)) return "none";
  if (starPlanReady(e)) return "ready";
  return starEngineerHere(e, now) ? "work" : "travel";
}
/* Ce qui reste, en millisecondes, pour l'étape en cours. ⚠️ REND 0 QUAND IL N'Y A
   RIEN À ATTENDRE, jamais un nombre négatif : un « −00:12 » sous un panneau est le
   genre de détail qui fait douter de tout le reste. */
export function starPlanRemainMs(e, now) {
  if (!starPlanAsked(e) || starPlanReady(e)) return 0;
  const end = e.plan.at + C.STAR_ENG_TRAVEL_MS + (starEngineerHere(e, now) ? C.STAR_ENG_WORK_MS : 0);
  return Math.max(0, end - (+now || 0));
}
export function starPlanProgress(e, now) {
  if (!starPlanAsked(e)) return 0;
  if (starPlanReady(e)) return 1;
  const tot = C.STAR_ENG_TRAVEL_MS + C.STAR_ENG_WORK_MS;
  return Math.max(0, Math.min(1, ((+now || 0) - e.plan.at) / tot));
}

/* ── LES CINQ COMMANDES DE BOIS. ⚠️ « ÉTAPE PAR ÉTAPE » EST UNE RÈGLE, PAS UNE
   MISE EN PAGE : une pièce n'est commandable que si (a) les plans sont rendus,
   (b) l'étoile a retrouvé le morceau correspondant, (c) la pièce PRÉCÉDENTE est
   livrée. Les trois sont des lectures, aucune n'est un état de plus.
   ⚠️ Elle rend une CLÉ de raison, jamais `false` tout court : c'est ce qui permet
   au panneau de dire *pourquoi* on ne peut pas, au lieu de griser un bouton sans
   rien expliquer — « le jeu propose et refuse » (426) commence toujours par un
   bouton muet. */
export function starTimberBlock(e, key) {
  const idx = STAR_SHIP_KEYS.indexOf(key);
  if (idx < 0) return "unknown";
  if (!starPlanReady(e)) return "noPlan";
  if (starTimberDone(e, key)) return "done";
  if (starTimberOrder(e, key)) return "busy";
  const part = STAR_SHIP_PARTS[idx];
  if (!starHas(e, part.site)) return "noShard";
  if (idx > 0 && !starTimberDone(e, STAR_SHIP_KEYS[idx - 1])) return "prev";
  return null;
}
export function starTimberCan(e, key) { return starTimberBlock(e, key) === null; }
/* La pièce qu'on attend MAINTENANT — celle du bandeau et du plan. ⚠️ UNE
   JOINTURE, PAS UNE SECONDE LISTE (449) : elle balaie `STAR_SHIP_KEYS` dans
   l'ordre et rend la première qui n'est pas livrée, ce qui est exactement l'ordre
   dans lequel on construit. */
export function starTimberNext(e) {
  for (const k of STAR_SHIP_KEYS) if (!starTimberDone(e, k)) return k;
  return null;
}
export function starTimberBuilt(e) { return STAR_SHIP_KEYS.filter(k => starTimberDone(e, k)).length; }

/* ───────────────────────────────────────────────────────────────────────────
   2. LES CHAPITRES.

   ⚠️ LE CHAPITRE N'EST PAS UNE PORTE, C'EST UN COMPTEUR — reprise mot pour mot
   de la décision du 442, qui était la bonne : il ne verrouille rien, il dit où
   l'on en est et ce qu'on cherche. Ce qui verrouille, quand il faut verrouiller,
   est `req` sur le LIEU, et seulement quand il n'y a physiquement rien à y
   faire (on ne plonge pas avant de savoir où plonger).

   ⚠️⚠️ ET AUCUN NE PAIE. `reward` n'existe pas dans cette table, et c'est
   délibéré : le 442 payait 5 700 or de chapitres, cette quête ne touche à aucune
   pièce. La récompense est la scène, la trace dans le monde, et le crochet
   cosmétique du §8.
   ⚠️ `STAR_CH_DONE` (= longueur) vaut « quête terminée ». On ne teste jamais un
   numéro de chapitre écrit en dur ailleurs qu'ici.
   ─────────────────────────────────────────────────────────────────────────── */
export const STAR_CHAPTERS = [
  { key: "field",  need: ["farmStarBlue", "farmEmptyA", "farmMaterial", "farmStarRose", "farmEmptyB"] },
  { key: "crater", need: ["crater", "leanLake", "leanGlass"] },
  { key: "water",  need: ["lakeShard"] },
  { key: "thief",  need: ["beadShard", "nestShard"] },
  /* ⚠️ LE DERNIER NE SE FERME PAS PAR ACCUMULATION. `song` est dedans pour que
     le pisteur sache quoi demander, mais `starAdvance` s'arrête AVANT lui : la
     quête ne se termine qu'au moment où l'hôte le décide, dans la scène finale,
     et pas parce qu'un indice de plus est tombé. Même garde que `depot` au 442. */
  { key: "note",   need: ["belfry", "song"], final: true },
];
export const STAR_CH_DONE = STAR_CHAPTERS.length;

/* ───────────────────────────────────────────────────────────────────────────
   3. LES GRANDEURS. ⚠️⚠️ ELLES SONT EXPORTÉES PARCE QUE LE JEU ET LE BANC LES
   LISENT TOUS LES DEUX. Une fenêtre réglée dans `FermeGame` et re-décrite dans
   `verify-quete` est la divergence en attente du §8 de `CLAUDE.md`, et son
   symptôme serait le pire possible : « le banc dit que c'est faisable » pendant
   que ça ne l'est pas.
   ⚠️ ET AUCUNE N'EST CHOISIE À L'ŒIL. Chaque fenêtre solo est mesurée par
   `verify-quete`, qui rejoue le vrai trajet image par image avec la vraie
   collision et la vraie course (Maj) : il échoue si la fenêtre rend le geste
   IMPOSSIBLE, et il échoue aussi si elle est si large qu'elle ne demande plus
   rien. Un seuil réglé à la main ici, c'est le seuil d'axe du taxi au 434 —
   parfaitement défendable, et faux dès que la géométrie bouge.
   ─────────────────────────────────────────────────────────────────────────── */

/* ── L'ÉTOILE TIMIDE (chapitre 2). Elle ne sort que si personne ne la regarde.
   ⚠️ « REGARDER » EST UNE GRANDEUR QUI CIRCULE DÉJÀ : `dir` est dans le paquet
   de position depuis toujours (0 = sud, 1 = nord, 2 = ouest, 3 = est, la même
   convention que `PET_DIRS`). C'est ce qui rend cette mécanique gratuite — et
   c'est aussi pour ça qu'elle a été choisie plutôt qu'un contrepoids ou une
   seconde clé, qui auraient demandé un état de plus à arbitrer. */
export const STAR_CRATER_R = 5.5;          // il faut être DANS l'anneau
export const STAR_CALM_MS = 10000;         // deux joueurs ou plus dans la zone
export const STAR_CALM_SOLO_MS = 60000;    // seul : une vraie minute d'apprivoisement
export const STAR_CALM_FACE_DOT = -0.15;   // « dos tourné » = produit scalaire négatif

/* ── LE REFROIDISSEMENT DU CRATÈRE (chapitre 2, zip 446). ⚠️⚠️ DEMANDE DE
   GUILLAUME : « il doit fumer pendant un moment, avant de se refroidir, et nous
   permettre de récupérer l'étoile. » C'est donc une MÉCANIQUE et pas un effet :
   tant que le trou est brûlant, on ne fait pas sortir l'étoile, et la seule
   chose à faire est de regarder la fumée tomber.
   ⚠️ TROIS MINUTES, ET LE NOMBRE EST CHOISI CONTRE LE TRAJET, PAS AU JUGÉ : la
   chute se voit d'où l'on est, le cratère est en ville, et il faut prendre le
   train. Un joueur qui part tout de suite arrive dans la fumée et attend un peu ;
   un joueur qui traîne trouve un cratère déjà tiède. Aucun des deux n'attend
   devant un écran vide, et personne ne rate la fumée par malchance.
   ⚠️⚠️ ET LA CHALEUR NE TOMBE PAS À ZÉRO : la seconde image du modèle est un
   cratère refroidi qui fume ENCORE, une volute, une dizaine de braises. Le
   plancher tient tant que l'étoile est au fond ; il tombe le jour où on la sort.
   C'est ce qui fait que le lieu reste vivant pendant tout le chapitre 2, au lieu
   de s'éteindre trois minutes après la chute. */
export const STAR_CRATER_COOL_MS = 180000;
export const STAR_CRATER_EMBER = 0.20;     // ce qui reste quand c'est « froid », l'étoile encore dedans

/* ⚠️⚠️ LA CHALEUR EST DÉRIVÉE, JAMAIS STOCKÉE — règle des cierges (441) et du
   jour de marché (431 : « une pure fonction du numéro de jour, jamais un état »).
   Elle ne circule donc pas sur le réseau : `e.fall` part déjà dans l'`apply`, et
   chacun en déduit la même courbe.
   ⚠️ `elapsed` EST UNE DURÉE, PAS UNE DATE, et c'est tout le soin : l'hôte lui
   passe `now - e.fall` (deux dates de SON horloge), le client lui passe le temps
   écoulé depuis SA propre réception de la chute. On ne compare jamais une
   horloge hôte à une horloge invité (§3 de CLAUDE.md) ; la fonction, elle, ne
   voit qu'un nombre de millisecondes et rend la même chose aux deux. */
export function starCraterHeat(e, elapsedMs) {
  if (!e || !starFallen(e)) return 0;
  if (starHas(e, "crater")) return 0;                      // elle est sortie : le trou s'éteint
  const k = Math.max(0, Math.min(1, (+elapsedMs || 0) / STAR_CRATER_COOL_MS));
  // Une décroissance en cloche : ça fume fort, puis ça retombe vite, puis ça traîne.
  return STAR_CRATER_EMBER + (1 - STAR_CRATER_EMBER) * Math.pow(1 - k, 1.7);
}
/* « Assez froid pour qu'elle ose sortir ». ⚠️ UNE SEULE ÉCRITURE POUR LES DEUX
   CÔTÉS : le client s'en sert pour ne pas demander, l'hôte pour ne pas accorder.
   Deux seuils auraient donné « le jeu propose et refuse » (défaut du 426). */
export function starCraterCool(e, elapsedMs) {
  if (!e || !starFallen(e)) return false;
  return (+elapsedMs || 0) >= STAR_CRATER_COOL_MS;
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ ZIP 449 — ON NE DESCEND PAS DANS UN TROU EN FUSION. DEMANDE DE GUILLAUME.
   ╚════════════════════════════════════════════════════════════════════════════
   « Si l'on entre dans le cratère incandescent sans attendre qu'il ne se
   refroidisse, on est immédiatement blessé. » Dix minutes de repos forcé, comme
   une défaite au défi (`C.BURN_INJURED_MS`), et retour à la maison — la ville se
   regagne en train, et c'est très exactement la sanction.

   ⚠️⚠️ TROIS RAISONS DE L'ÉCRIRE ICI ET PAS DANS LA BOUCLE, ET LA TROISIÈME EST
   LA LEÇON DU 448 :
     1. c'est une règle de QUÊTE (elle dépend de la chute et de l'étoile), donc
        elle vit avec les autres, à côté de `starCraterHeat` qu'elle interroge ;
     2. `FermeGame` la lit depuis le composant, et l'hôte pourrait la revérifier :
        une fonction déclarée dans la closure de la boucle n'existe pour aucun
        des deux (§4 de CLAUDE.md, payé au 430 et au 431) ;
     3. ⚠️ **UN BANC DE RENDU NE PEUT PAS VOIR UN DÉFAUT DE TEMPS** (448,
        cinquième visage du défaut de banc). Sept contrôles regardaient déjà ce
        cratère, aucun ne demandait QUAND. Une brûlure est une règle de TEMPS
        avant d'être une règle de place : il lui faut une fonction pure et un banc
        de logique, et `tools/verify-quete.mjs` l'appelle.

   ⚠️⚠️ ET LE SEUIL DE TEMPS EST CELUI DE L'ÉTOILE, PAS UN SECOND. `starCraterCool`
   est la MÊME écriture qui autorise la sortie de l'étoile : le jeu ne peut donc
   jamais dire « c'est froid, tiens-toi tranquille » et brûler quand même. Deux
   seuils, c'est le défaut du 426 (« le jeu propose et refuse ») — et ici il se
   paierait en dix minutes de repos forcé, c'est-à-dire en soirée gâchée.
   ⚠️ Le banc le mesure explicitement : il balaie la durée et compte les instants
   où « ça brûle » et « elle refuse de sortir » ne disent pas la même chose. */
/* ⚠️⚠️ « LE FOND », PAS « LE CRATÈRE » — DÉCISION DE GUILLAUME, ET ELLE SE DÉRIVE
   DU DESSIN AU LIEU DE SE RÉGLER. `sinkK` est la fraction d'enfoncement rendue
   par `starCraterSink` (fermeArt) : 1 au centre du trou, 0 sur sa lèvre, négative
   sur le bourrelet qu'on enjambe. La brûlure commence là où l'on est enfoncé de
   la moitié de la profondeur, soit ~0,71 du rayon du trou (la cuvette est en
   1 − u²) — on brûle donc AU FOND, et la pente comme le bourrelet se franchissent
   sans rien.
   ⚠️ C'est la règle du §8 de CLAUDE.md — « un paramètre qui double un autre est
   une divergence en attente, il doit être DÉRIVÉ » : un second rayon écrit en
   cases aurait dessiné une brûlure à côté du trou au premier réglage de
   `craterHoleK`, défaut invisible en relecture et criant à l'écran (446). */
export const STAR_BURN_DEPTH_K = 0.5;
export function starCraterBurns(e, elapsedMs, sinkK) {
  if (!(+sinkK >= STAR_BURN_DEPTH_K)) return false;   // sur la pente ou le bourrelet : rien
  /* ⚠️ `starCraterHeat` PORTE DÉJÀ LES DEUX AUTRES PORTES : pas de chute = pas de
     trou, étoile sortie = le trou s'éteint. Les retester ici en ferait des
     copies, et une copie ne suit pas. */
  if (starCraterHeat(e, elapsedMs) <= 0) return false;
  return !starCraterCool(e, elapsedMs);
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ ZIP 458 — ON GLISSE DEDANS, ET ON PEINE À EN SORTIR. DEMANDE DE GUILLAUME.
   ╚════════════════════════════════════════════════════════════════════════════
   « le perso doit un peu glisser maladroitement vers le bas (glissade un peu
   rapide) et avoir un peu de mal à remonter. »

   ⚠️⚠️ TROIS CHOSES SONT VOLONTAIREMENT SÉPARÉES, ET C'EST LA LEÇON DU 441 (« une
   grandeur de DESSIN, une grandeur de RANG, une grandeur de COLLISION : trois
   choses, trois paramètres »), appliquée une quatrième fois :
     · `starCraterSink` (fermeArt) reste un DÉCALAGE D'IMAGE — ce qu'on voit ;
     · ce bloc-ci rend une VITESSE — ce qui bouge ;
     · `canStandTown` n'est pas touché — ce qui bloque. Verser la pente dans
       l'altitude de case aurait fait du cratère une falaise infranchissable,
       exactement l'arc du pont que le 439 a évité de justesse.
   ⚠️⚠️ ET LA PENTE SE DÉRIVE DU CREUX DESSINÉ, elle ne se re-décrit pas. On
   échantillonne la MÊME fonction que le rendu : deux descriptions du même trou
   auraient donné « il glisse à côté de la cuvette », défaut invisible en
   relecture et criant à l'écran (c'est mot pour mot ce que la note de
   `starCraterSink` reproche à une seconde formule).

   ⚠️⚠️⚠️ ET LA GLISSADE NE S'APPLIQUE QU'EN MARCHANT — C'EST LA CONTRAINTE QUI
   A DÉCIDÉ DE TOUTE LA FORME. La mécanique du chapitre 2 est *« se tenir
   IMMOBILE, dos tourné, dans le cratère »* : une pente qui pousse en permanence
   ferait dévaler quelqu'un qui ne touche à rien, donc rendrait la seule
   mécanique du lieu impossible à exécuter — on aurait ajouté une jolie physique
   et retiré le chapitre. On glisse donc quand on a le pied qui part (on marche),
   et on garde un peu d'élan une demi-seconde après avoir lâché les touches. Au
   repos complet, on tient debout où qu'on soit.
   ═════════════════════════════════════════════════════════════════════════════ */
export const STAR_SLOPE_H = 0.35;        // le pas d'échantillonnage de la pente, en cases
export const STAR_SLOPE_STEEP = 6.0;     // px d'enfoncement par case = « raide » (mesuré : la paroi monte à ~10)
/* ⚠️⚠️⚠️ ZIP 459 — TROIS DE CES NOMBRES ONT ÉTÉ SUPPRIMÉS, ET LA LEÇON QUI LES
   ACCOMPAGNAIT VAUT PLUS QUE LES NOMBRES. Elle disait : « le premier réglage
   rendait le cratère infranchissable, parce que la glissade (3,2 cases/s)
   dépassait ce qu'un joueur peut remonter (2,34) — un MUR fait de vitesse,
   invisible pour `canStandTown` puisqu'aucun pas n'est refusé ». La parade était
   une inégalité balayée au banc : `PLAYER_SPEED × STAR_CLIMB_MIN − STAR_SLIDE_MAX
   ≥ 1 case/s`.
   ⚠️⚠️ CETTE INÉGALITÉ N'A PLUS DE SENS DEPUIS QUE LA GLISSADE EST UN ÉTAT et non
   une poussée permanente : on ne remonte plus « en marchant contre la pente », on
   remonte EN S'AGRIPPANT (voir `starSlipStep`). Mais la QUESTION qu'elle posait
   reste la seule qui compte, et le banc la pose maintenant en dur, par simulation :
   *depuis n'importe quel point de la cuvette, en tenant une direction, est-ce
   qu'on SORT ?* — 317 points de départ, 0 bloqué, pire cas 5,4 s. Une inégalité
   algébrique était un raccourci ; jouer le moteur sur le vrai creux est la mesure.
   ⚠️ `STAR_CLIMB_MIN` SURVIT SEUL parce qu'il sert encore, et à autre chose : c'est
   la peine de la marche en montée tant qu'on a ses appuis — les « quelques
   centimètres gagnés avant de reglisser » de la demande du 459. */
export const STAR_CLIMB_MIN = 0.58;      // ce qu'il reste de vitesse en remontant droit dans la pente la plus raide

/* La pente locale, en pixels d'enfoncement par case, sous forme d'un vecteur qui
   pointe vers le BAS — c'est-à-dire là où l'on tombe. ⚠️ `sink` EST PASSÉ EN
   PARAMÈTRE et jamais importé : ce fichier ne connaît pas `fermeArt` (il n'a ni
   canevas ni DOM), et c'est ce qui permet au banc d'appeler cette fonction avec
   le VRAI creux du jeu. */
export function starCraterSlope(sink, dx, dy) {
  const h = STAR_SLOPE_H;
  const gx = (sink(dx + h, dy) - sink(dx - h, dy)) / (2 * h);
  const gy = (sink(dx, dy + h) - sink(dx, dy - h)) / (2 * h);
  return { gx, gy, n: Math.hypot(gx, gy) };
}
/* Ce qu'il reste de la marche quand on monte. ⚠️ `dot` EST LE PRODUIT SCALAIRE
   NORMALISÉ entre le pas qu'on tente et la descente : −1 = pleine montée, +1 =
   pleine descente. On ne ralentit QUE la montée — accélérer la descente serait
   compter deux fois la glissade, qui s'ajoute déjà. */
export function starClimbMul(n, dot) {
  const up = Math.max(0, -(+dot || 0));
  const steep = Math.min(1, (+n || 0) / STAR_SLOPE_STEEP);
  return 1 - (1 - STAR_CLIMB_MIN) * up * steep;
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ ZIP 459 — ON PERD PIED, ON DÉVALE, ON SE RELÈVE, ON S'AGRIPPE.
   ╚════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DEMANDE DE GUILLAUME, MOT POUR MOT : *« une animation réelle poussée
   montrant le personnage qui climb up et glisse du cratère […] il doit lean back
   et slide quand il glisse rendant la trajectoire difficile à contrôler avant
   d'atteindre le fond. Ensuite il peut se déplacer sur ses pieds dans le cratère.
   Et si l'on veut remonter, il tentera de le faire debout, avant de glisser
   encore. Et au bout de 3 pleines secondes de maintien d'une direction, l'anim
   grimpeur avec les bras et jambes s'activera. »*

   ⚠️⚠️⚠️ LA QUESTION QUI A DÉCIDÉ DE TOUTE LA FORME : **UNE GRAVITÉ PERMANENTE
   AURAIT SUPPRIMÉ LE CHAPITRE 2.** La cuvette est un paraboloïde (`1 − u²`) : sa
   pente est proportionnelle au rayon, donc elle n'a PAS de fond plat — mesuré au
   banc, la pente vaut déjà 1,2 px/case à 0,5 case du centre. Une poussée
   permanente entonnoirait donc le fermier jusqu'au point unique du milieu… c'est-
   à-dire à distance nulle de l'étoile, là où `starFacingAway` rend `false` par
   construction (« debout SUR elle : on la regarde forcément »). La seule
   mécanique du lieu — se tenir immobile, dos tourné — serait devenue
   inexécutable, et le symptôme aurait été « la jauge ne monte plus jamais »,
   sans une seule erreur nulle part. C'est le piège du 458 (`starSoloRoom`) dans
   sa version physique : *une réponse juste (la gravité) à une question qui n'était
   pas posée (le repos).*
   ⚠️⚠️ LA PARADE VIENT DES JEUX QUI ONT DÉJÀ CE GESTE (l'escalade des pentes de
   Breath of the Wild, les dévers de Death Stranding) : **on ne perd pas pied
   parce qu'on est sur une pente, on perd pied parce qu'on la SOLLICITE.** Debout,
   sans rien demander, le personnage plante ses talons — c'est une posture, elle se
   dessine (`drawStarBrace`). Dès qu'il marche sur la paroi raide, ses appuis
   partent. Et comme on ne peut pas ENTRER dans le trou sans marcher, la glissade
   se joue à 100 % des entrées : l'effet demandé est là, et le chapitre survit.
   ⚠️ CE QUE ÇA NE FAIT PAS, ET C'EST ÉCRIT PLUTÔT QUE SUBI : un fermier lâché
   immobile en plein milieu de la paroi y RESTE (jambes écartées, dos au vide) au
   lieu de partir tout seul. C'est la seule liberté prise avec la physique, elle
   est visible, et elle est le prix exact du chapitre 2.

   ⚠️⚠️ CINQ ÉTATS, ET CHACUN EST UNE PHRASE DE LA DEMANDE :
     · `foot`    — on marche sur ses pieds (le fond, et toute pente douce) ;
     · `brace`   — « il tentera de le faire debout » : il GAGNE du terrain pendant
                   `STAR_SLIP_BRACE_MS`, à la peine de `starClimbMul` ;
     · `slide`   — « avant de glisser encore » : le pied part. Une VITESSE avec de
                   l'inertie, pas une poussée par image — c'est ce qui rend la
                   trajectoire difficile à contrôler ;
     · `recover` — il se rétablit au fond, un quart de seconde, et se remet debout ;
     · `climb`   — trois secondes de la même direction tenue : il s'agrippe, et
                   plus rien ne le reprend jusqu'au bourrelet.

   ⚠️⚠️ ET TOUT CECI EST PUR : aucune position, aucun canevas, aucun réseau. Le
   banc `render-etoile` SIMULE ce moteur sur le VRAI creux (`starCraterSink`) et
   vérifie la seule chose qui compte vraiment — *depuis n'importe quel point de la
   cuvette, en tenant la direction, on SORT* — c'est-à-dire l'ARRIVÉE, la grandeur
   que le §25 de `ferme/README.md` reproche à tous les bancs de ne jamais mesurer.
   ═════════════════════════════════════════════════════════════════════════════ */
/* ⚠️ LE SEUIL DE PERTE D'APPUI EST DÉRIVÉ D'UNE INTENTION MESURABLE, PAS CHOISI :
   « la moitié intérieure de la cuvette se marche, la moitié extérieure se glisse ».
   Balayé au banc sur le vrai creux : n < 4,2 tient jusqu'à 1,55 case du centre
   (axe court) et 2,80 (axe long), pour une cuvette qui va de 3,50 à 4,75 — soit
   un plancher de trois à cinq cases et demie de large. C'est ce nombre-là que
   `render-etoile` re-mesure ; s'il tombe sous 1,5 case, le trou n'a plus de fond
   où se tenir et la demande n°3 (« il peut se déplacer sur ses pieds ») est morte. */
export const STAR_SLIP_N = 4.2;            // px d'enfoncement par case : au-delà, l'appui part
export const STAR_SLIP_FLOOR_MIN = 1.5;    // cases : le plancher marchable ne descend jamais sous ça
export const STAR_SLIP_BRACE_MS = 420;     // « il tentera de le faire debout » — et il gagne vraiment du terrain
export const STAR_SLIP_ACC = 7.5;          // cases/s² dans la pente la plus raide
export const STAR_SLIP_DRAG = 1.8;         // /s — le frottement. Vitesse terminale = ACC/DRAG ≈ 4,2 cases/s
export const STAR_SLIP_VMAX = 4.6;         // ⚠️ SOUS `PLAYER_SPEED` (5,2) : on glisse, on n'est pas éjecté
/* ⚠️⚠️ « RENDANT LA TRAJECTOIRE DIFFICILE À CONTRÔLER » — ET C'EST UNE AUTORITÉ
   LATÉRALE, PAS UN FREIN. Les touches accélèrent EN TRAVERS de la pente ; leur
   composante de remontée est retirée. On vise donc un côté du fond, on ne s'arrête
   jamais. Un frein aurait rendu la glissade décorative ; aucune autorité l'aurait
   rendue indistinguable d'un jeu bloqué (leçon du 456). */
export const STAR_SLIP_STEER = 3.0;        // cases/s² en travers
export const STAR_SLIP_STOP = 0.9;         // cases/s : en dessous, sur pente douce, on se rétablit
export const STAR_SLIP_RECOVER_MS = 260;   // le temps de se remettre debout
export const STAR_CLIMB_HOLD_MS = 3000;    // « 3 pleines secondes » — le mot de la demande
/* ⚠️ UN SURSIS COURT, ET IL N'EST PAS UNE FAVEUR : passer de « ↑ » à « ↑ + → »
   relâche une touche pendant une image. Sans lui, une main normale remettrait le
   compteur à zéro sans jamais comprendre pourquoi. Il est trop court (0,18 s) pour
   qu'on puisse lâcher volontairement et garder son effort. */
export const STAR_CLIMB_GRACE_MS = 180;
export const STAR_CLIMB_SPEED = 1.6;       // cases/s, cramponné — lent, mais rien ne le reprend
export const STAR_CLIMB_DOT = -0.30;       // « vers le haut » : le pas doit s'opposer à la pente
export const STAR_SLIP_MODES = ["foot", "brace", "slide", "recover", "climb"];

export function starSlipNew() {
  return { mode: "foot", vx: 0, vy: 0, t: 0, hold: 0, idle: 0, hx: 0, hy: 0 };
}

/* Le moteur, une image. ⚠️ IL MUTE `s` ET REND `s` : c'est un état de RENDU local
   (comme la poussière), jamais un état partagé — chaque client calcule celui de
   chacun à partir des positions qui circulent déjà (§3 de `CLAUDE.md`).
     · `slope` : `{ gx, gy, n }` de `starCraterSlope`, ou `null` hors du trou ;
     · `sinkPx` : l'enfoncement DESSINÉ sous les pieds (> 0 = dans la cuvette) —
       c'est lui qui dit « dedans », jamais un rayon écrit à la main. ⚠️ SANS LUI,
       le bourrelet extérieur (4 px sur 0,8 case, donc n ≈ 6) déclencherait une
       glissade VERS L'EXTÉRIEUR à chaque approche : on ne pourrait plus entrer.
     · `ix, iy` : la direction demandée, normalisée (0,0 = aucune touche) ;
     · `enabled` : faux tant que le trou brûle — la justice du 458, on ne fait pas
       tomber dans le feu quelqu'un qui n'a rien demandé. */
export function starSlipStep(s, slope, sinkPx, ix, iy, dt, enabled) {
  const st = s || starSlipNew();
  const d = Math.max(0, Math.min(0.05, +dt || 0));     // ⚠️ borné : une image de 2 s ne téléporte personne
  const inside = enabled !== false && !!slope && (+sinkPx || 0) > 0;
  if (!inside) {                                       // dehors : on est debout, et on n'a rien en réserve
    st.mode = "foot"; st.vx = 0; st.vy = 0; st.t = 0; st.hold = 0; st.idle = 0;
    return st;
  }
  const n = slope.n, inv = n > 0.001 ? 1 / n : 0;
  const dxn = slope.gx * inv, dyn = slope.gy * inv;    // vers le BAS de la pente
  const im = Math.hypot(ix, iy);
  const has = im > 0.01;
  const ux = has ? ix / im : 0, uy = has ? iy / im : 0;
  const dot = has ? ux * dxn + uy * dyn : 0;           // +1 = on descend, −1 = on monte

  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ LE COMPTEUR D'EFFORT — ET IL COMPTE UNE MAIN, PAS UN TERRAIN.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ IL SURVIT À LA GLISSADE, ET C'EST TOUTE LA DEMANDE : « au bout de
     3 pleines secondes de maintien d'une direction ». On tient la touche, on
     dérape, on retente — l'effort s'accumule pendant tout ça. Ne le remettent à
     zéro que les deux gestes du JOUEUR : lâcher (au-delà du sursis) ou changer de
     cap.
     ⚠️⚠️⚠️ LE PREMIER JET LE GAGEAIT SUR « EST-CE QUE JE MONTE ? » (produit
     scalaire avec la pente), ET LA SIMULATION L'A TUÉ EN TROIS LIGNES DE TRACE :
     en dévalant, on DÉPASSE le point bas de quelques centimètres — la pente
     s'inverse sous les pieds, le pas tenu devient « une descente », et le
     compteur repartait de zéro à chaque passage au fond. Résultat mesuré :
     2,0 s atteintes, jamais 3,0, donc **la grimpe n'existait pas** et 219 points
     de départ sur 317 ne pouvaient plus sortir du trou. C'est la huitième forme
     du défaut de banc du 458 (deux grandeurs qu'on ne mesure pas ensemble) prise
     à l'envers : *une grandeur qui décrit le JOUEUR ne doit pas dépendre du
     TERRAIN.* La question « est-ce que ça monte ? » ne sert qu'au moment de
     s'agripper, plus bas. */
  if (has) {
    const same = st.hold > 0 && (ux * st.hx + uy * st.hy) >= 0.5;
    if (!same) st.hold = 0;
    st.hx = ux; st.hy = uy; st.idle = 0;
    st.hold += d * 1000;
  } else {
    st.idle += d * 1000;
    if (st.idle > STAR_CLIMB_GRACE_MS) st.hold = 0;
  }

  if (st.mode === "climb") {
    /* ⚠️ CRAMPONNÉ : LA PENTE N'ENTRE PAS. C'est la réponse de Guillaume — « lâcher
       la touche = rechute ». Tant qu'on tient, il monte ; on lâche, il décroche. */
    if (st.idle > STAR_CLIMB_GRACE_MS || (has && (ux * st.hx + uy * st.hy) < 0.5)) {
      st.mode = "slide"; st.hold = 0;
      st.vx = dxn * STAR_SLIP_STOP * 1.6; st.vy = dyn * STAR_SLIP_STOP * 1.6;
      return st;
    }
    st.vx = st.hx * STAR_CLIMB_SPEED; st.vy = st.hy * STAR_CLIMB_SPEED;
    return st;
  }
  /* ⚠️⚠️ ON S'AGRIPPE À UNE PAROI, PAS À UN PRÉ — ET CETTE GARDE A ÉTÉ TROUVÉE
     PAR LA SIMULATION, PAS PAR LA RELECTURE. Sans elle, trois secondes passées à
     marcher au FOND (où la pente est nulle) faisaient partir la grimpe sur du
     plat : le fermier se mettait à quatre pattes en terrain plan et avançait à
     1,6 case/s au lieu de 5,2 — c'est-à-dire qu'une récompense d'effort se serait
     lue comme un ralentissement inexplicable.
     ⚠️ ET LE COMPTEUR, LUI, TOURNE PARTOUT DANS LA CUVETTE (voir juste au-dessus) :
     il compte l'INTENTION (« je veux sortir »), pas l'endroit. Le premier jet le
     gageait sur la pente et le remettait à zéro à chaque retour au fond — donc les
     trois secondes n'étaient JAMAIS atteignables et la grimpe n'existait pas. La
     simulation de sortie l'a dit en une ligne : 219 points bloqués sur 317. */
  if (st.hold >= STAR_CLIMB_HOLD_MS && n >= STAR_SLIP_N * 0.75 && dot <= STAR_CLIMB_DOT) {
    st.mode = "climb"; st.t = 0;
    st.vx = st.hx * STAR_CLIMB_SPEED; st.vy = st.hy * STAR_CLIMB_SPEED;
    return st;
  }

  if (st.mode === "slide" || st.mode === "recover") {
    /* La glissade : une VITESSE. ⚠️ L'ACCÉLÉRATION EST BORNÉE PAR `STAR_SLOPE_STEEP`
       comme l'était l'ancienne poussée — la paroi monte à onze px/case, une gravité
       proportionnelle y aurait éjecté. */
    const g = STAR_SLIP_ACC * Math.min(1, n / STAR_SLOPE_STEEP);
    st.vx += dxn * g * d; st.vy += dyn * g * d;
    if (has && st.mode === "slide") {
      /* ⚠️ ON RETIRE LA COMPOSANTE DE REMONTÉE DE L'ORDRE DONNÉ, on ne l'inverse
         pas : il reste exactement ce qui va EN TRAVERS. C'est « on infléchit ». */
      let ax = ux, ay = uy;
      const up = ax * dxn + ay * dyn;
      if (up < 0) { ax -= dxn * up; ay -= dyn * up; }
      st.vx += ax * STAR_SLIP_STEER * d; st.vy += ay * STAR_SLIP_STEER * d;
    }
    /* ⚠️⚠️ LE FROTTEMENT MONTE QUAND LA PENTE TOMBE, ET CE N'EST PAS UN RÉGLAGE DE
       CONFORT : sans lui, la chute DÉPASSE le point bas, remonte de l'autre côté,
       redescend, et le fermier oscille au fond comme une bille dans un saladier
       pendant plus de deux secondes. Mesuré à la simulation : 141 images où
       personne — pas même un banc — ne peut dire s'il dévale encore ou s'il
       marche. C'est physiquement vrai en plus (on freine des talons dès qu'on sent
       le plat) et c'est ce qui rend la fin de la glissade LISIBLE : il arrive au
       fond, il se rétablit, on reprend la main. */
    const flat = 1 + 2 * (1 - Math.min(1, n / STAR_SLIP_N));
    const k = Math.max(0, 1 - STAR_SLIP_DRAG * flat * d);
    st.vx *= k; st.vy *= k;
    const sp = Math.hypot(st.vx, st.vy);
    if (sp > STAR_SLIP_VMAX) { const q = STAR_SLIP_VMAX / sp; st.vx *= q; st.vy *= q; }
    if (st.mode === "slide") {
      if (n < STAR_SLIP_N * 0.55 && sp < STAR_SLIP_STOP) { st.mode = "recover"; st.t = 0; }
    } else {
      st.t += d * 1000;
      st.vx *= 0.55; st.vy *= 0.55;                     // il pose les mains, il s'arrête net
      if (st.t >= STAR_SLIP_RECOVER_MS) { st.mode = "foot"; st.vx = 0; st.vy = 0; st.t = 0; }
    }
    return st;
  }

  /* ── DEBOUT. Deux façons de perdre pied, et une seule d'y rester. */
  st.vx = 0; st.vy = 0;
  if (!has || n < STAR_SLIP_N) { st.mode = "foot"; st.t = 0; return st; }
  if (dot > 0.25) {                                     // on marche VERS le vide : le pied part tout de suite
    st.mode = "slide"; st.t = 0;
    st.vx = dxn * STAR_SLIP_STOP; st.vy = dyn * STAR_SLIP_STOP;
    return st;
  }
  /* « Il tentera de le faire debout » : on gagne du terrain, à la peine de
     `starClimbMul`, pendant `STAR_SLIP_BRACE_MS` — puis les appuis lâchent. */
  st.mode = "brace"; st.t += d * 1000;
  if (st.t >= STAR_SLIP_BRACE_MS) {
    st.mode = "slide"; st.t = 0;
    st.vx = dxn * STAR_SLIP_STOP * 0.6; st.vy = dyn * STAR_SLIP_STOP * 0.6;
  }
  return st;
}
/* Ce que le DESSIN doit montrer, DÉRIVÉ de l'état et de la pente — jamais un
   second champ, jamais une seconde liste (leçon du 449).
   ⚠️ `brace` (il pousse en montant) ne rend PAS une pose à lui : il marche, à la
   peine de `starClimbMul`, et une pose d'effort figée sur quelqu'un qui avance se
   lirait comme une image bloquée. Ce qui montre l'effort à ce moment-là est la
   JAUGE, plus la poussière sous les semelles.
   ⚠️ La posture d'appui, elle, ne sert qu'À L'ARRÊT sur la paroi raide : c'est la
   seule liberté que ce moteur prend avec la physique (voir le chapeau), et elle
   se DESSINE plutôt que de se cacher. */
export function starSlipPose(s, moving, n) {
  const m = s ? s.mode : "foot";
  if (m === "climb") return "climb";
  if (m === "slide" || m === "recover") return "slide";
  if (!moving && (+n || 0) >= STAR_SLIP_N) return "brace";
  return null;
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ LA POSE DE L'AUTRE — DÉDUITE, JAMAIS REÇUE.
   ╚════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ AUCUN CHAMP DE PLUS SUR LE RÉSEAU, ET C'EST LE §3 DE `CLAUDE.md` PRIS AU
   MOT (« ce qui peut se déduire ne se diffuse pas »). Le paquet de position porte
   déjà la VITESSE RÉELLE depuis le 365 ; la carte du cratère est la même chez
   tout le monde ; donc « ce fermier-là dévale-t-il ou grimpe-t-il ? » se répond
   entièrement chez celui qui regarde. Diffuser un mode, c'eût été un champ à
   réconcilier, un état de plus à migrer, et une divergence possible entre ce
   qu'un client dessine et ce que l'autre vit.
   ⚠️⚠️ ET ELLE EST SANS MÉMOIRE, EXPRÈS : trois grandeurs observables suffisent
   (la pente sous ses pieds, l'enfoncement, sa vitesse), donc rien à faire vieillir
   quand un joueur se déconnecte, rien à remettre à zéro, aucune `Map` à purger.
   Une machine d'état recopiée pour les autres joueurs aurait dérivé de la vraie au
   premier paquet perdu — c'est-à-dire au bout de dix secondes.
   ⚠️ LES TROIS BORNES SE DÉDUISENT DU MOTEUR, elles ne sont pas choisies : on ne
   peut dévaler qu'en dessous de `STAR_SLIP_VMAX`, on ne peut se hisser qu'à
   `STAR_CLIMB_SPEED`, et la marche en montée la plus lente (`PLAYER_SPEED ×
   STAR_CLIMB_MIN` ≈ 3,0 cases/s) reste très au-dessus de la grimpe — les deux
   familles ne peuvent donc pas se confondre. */
export function starSlipSeen(slope, sinkPx, vx, vy) {
  if (!slope || (+sinkPx || 0) <= 0) return null;
  const n = slope.n;
  const sp = Math.hypot(+vx || 0, +vy || 0);
  /* L'ARC-BOUTEMENT demande une VRAIE paroi : c'est la posture de qui plante ses
     talons, elle n'a aucun sens au fond. */
  if (sp < 0.2) return n >= STAR_SLIP_N ? "brace" : null;
  /* ⚠️⚠️ CE QUI SUIT A ÉTÉ ÉCRIT TROIS FOIS, ET LES DEUX PREMIÈRES SONT LA LEÇON :
     la déduction ne peut pas se contenter de « on ne dévale que là où la pente
     dépasse le seuil de perte d'appui ». On perd pied EN HAUT et on s'arrête EN
     BAS : les deux tiers d'une glissade se passent sur une pente plus douce que
     celle qui l'a déclenchée, et le dernier tiers DÉPASSE le point bas. Confrontée
     au moteur image par image (le contrôle §6 de `render-etoile`), la première
     rédaction n'était d'accord que 40 % du temps — un joueur distant se serait
     redressé au milieu de sa chute, chez tout le monde sauf chez lui. */
  const inv = n > 0.001 ? 1 / n : 0;
  const dot = ((+vx || 0) * slope.gx + (+vy || 0) * slope.gy) * inv / sp;
  /* ⚠️ LE PLAFOND DE VITESSE EST CE QUI SÉPARE « IL DÉVALE » DE « IL MARCHE VERS
     LE BAS » : la glissade est bornée par `STAR_SLIP_VMAX` (4,6) et la marche vaut
     `PLAYER_SPEED` (5,2), course et bonbon en plus. Les deux familles ne peuvent
     donc pas se confondre — sans ce plafond, un joueur qui traverse le fond en
     courant serait dessiné en train de déraper. */
  /* ⚠️⚠️ LA GRIMPE SE TESTE LA PREMIÈRE, ET ELLE EXIGE LA MÊME PAROI QUE LE MOTEUR
     (`n ≥ STAR_SLIP_N × 0,75`, la condition exacte de `starSlipStep` pour
     s'agripper). Sans cette garde, une glissade qui DÉPASSE le point bas et
     remonte de l'autre côté — ce qu'elle fait à chaque fois, l'inertie ne s'arrête
     pas au fond — était lue comme une escalade : dix-sept images de fermier à
     quatre pattes en plein milieu de sa chute. */
  if (n >= STAR_SLIP_N * 0.75 && dot < -0.35 && sp <= STAR_CLIMB_SPEED * 1.5) return "climb";
  /* ⚠️⚠️ SUR LE PLANCHER, C'EST LA VITESSE SEULE QUI TRANCHE, ET C'EST UNE
     DÉDUCTION, PAS UNE TOLÉRANCE : au fond du trou on MARCHE (5,2 cases/s, course
     et bonbon au-dessus) ou on FINIT DE DÉVALER (au plus `STAR_SLIP_VMAX` = 4,6).
     Entre 1,2 et 4,8, aucun pas ne peut produire cette vitesse — donc c'est une
     glissade, quelle que soit sa direction. Ça règle le seul cas que la direction
     ne peut pas trancher : une chute DÉPASSE le point bas et remonte de l'autre
     côté, donc elle finit en montant. */
  const band = sp > 1.2 && sp <= STAR_SLIP_VMAX + 0.2;
  if (n < STAR_SLIP_N) return band ? "slide" : null;
  /* Sur la PAROI, en revanche, la direction compte : on y monte aussi à pied
     (5,2 × `STAR_CLIMB_MIN` ≈ 3,0 cases/s, en plein dans la fourchette), et ce
     fermier-là marche, il ne dérape pas. */
  if (dot > -0.2 && band) return "slide";
  return null;                                       // il marche, et ça se dessine comme une marche
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ ZIP 458 — L'ARRIVÉE DE L'ÉTOILE : ELLE GRIMPE, ELLE TOURNICOTE, ELLE SE POSE.
   ╚════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DEMANDE DE GUILLAUME : *« une petite animation de l'étoile climbing up on
   my back […] et puis elle doit ensuite tournicoter autour du fermier pendant une
   seconde avant de se stabiliser et se comporter comme prévu ensuite. »*

   Jusqu'ici, la rencontre du chapitre 2 était un CHANGEMENT D'ÉTAT : l'étoile
   n'existait pas, et à l'image suivante elle suivait le joueur comme si elle avait
   toujours été là. Quatre toasts racontaient une rencontre que le dessin ne
   montrait pas — c'est la famille du 453 (« un texte affirme »), appliquée au seul
   moment de la quête qui MÉRITE d'être vu.

   ⚠️⚠️ C'EST UNE COURBE PURE, ET C'EST TOUT CE QU'ELLE EST. Elle rend un décalage
   en PIXELS (à la tuile de référence 16) et une échelle ; elle ne connaît ni le
   joueur, ni la caméra, ni le réseau. Trois raisons, et la troisième est la vraie :
     1. un banc peut la balayer (le piège n°1, §4 de `CLAUDE.md`) ;
     2. les trois boucles de rendu (ferme, ville, tribunal) l'appellent, donc elle
        ne peut pas diverger de l'une à l'autre ;
     3. **elle ne touche pas à la position suivie.** La traîne (`trailFollow`)
        continue de tourner derrière ; ce qu'on décale, c'est le DESSIN. Le jour où
        l'animation change, la mécanique de suivi ne bouge pas d'un pouce — une
        grandeur de dessin, une grandeur de position, deux choses (leçon du 441).

   ⚠️ TROIS TEMPS, ET LE MILIEU EST CELUI QU'ON A DEMANDÉ :
     · `climb`  — elle part du SOL, derrière les talons, et remonte le dos jusqu'à
                  l'épaule. Elle grossit un peu en montant (elle vient de loin) ;
     · `spin`   — une seconde de tournicotage : un tour et demi autour du fermier,
                  en s'élevant, avec une profondeur simulée (elle passe derrière
                  puis devant, ce que rend `front`) ;
     · `settle` — le décalage retombe à zéro et l'on rejoint le comportement normal.
   ═════════════════════════════════════════════════════════════════════════════ */
export const STAR_JOIN_CLIMB_MS = 1100;
export const STAR_JOIN_SPIN_MS = 1000;    // « pendant une seconde » — le mot de la demande
export const STAR_JOIN_SETTLE_MS = 500;
export const STAR_JOIN_MS = STAR_JOIN_CLIMB_MS + STAR_JOIN_SPIN_MS + STAR_JOIN_SETTLE_MS;
export const STAR_JOIN_SPIN_TURNS = 1.5;
export const STAR_JOIN_RISE_PX = 26;      // du sol à l'épaule, à la tuile de référence
export const STAR_JOIN_ORBIT_PX = 13;     // le rayon du tournicotage

/* Rend `{ dx, dy, scale, front, phase }` ou `null` une fois l'arrivée finie.
   ⚠️ `dx`/`dy` SONT DES PIXELS À LA TUILE 16 : l'appelant les met à l'échelle par
   T/16, comme `starCraterSink`. Un décalage en CASES aurait fait grandir le
   tournicotage avec le zoom, ce qu'aucun banc n'irait chercher.
   ⚠️ `front` DIT SI ELLE PASSE DEVANT LE FERMIER (dernière moitié de chaque tour).
   Sans lui, un tournicotage vu de dessus est un cercle plat : c'est ce seul
   booléen qui fait qu'on la voit TOURNER AUTOUR au lieu de glisser autour. */
/* ⚠️⚠️ LES TROIS TEMPS SE RACCORDENT PAR CONSTRUCTION, PAS À L'ŒIL. Le premier
   jet posait trois formules indépendantes et sautait de CINQ PIXELS entre la
   montée et le tournicotage — invisible sur toute capture fixe, et parfaitement
   visible à l'écran (c'est la grandeur que `render-etoile` mesure déjà sur
   l'enfoncement du cratère depuis le 446 : *la continuité*). La parade n'est pas
   un réglage : le tournicotage est écrit UNE fois (`starJoinSpin`), et les deux
   autres temps LISENT ses bornes au lieu de les recopier. Deux nombres recopiés
   auraient divergé au premier réglage du rayon — le §8 de `CLAUDE.md`, dans une
   animation de deux secondes et demie. */
function starJoinSpin(k) {
  const a = Math.PI / 2 + k * Math.PI * 2 * STAR_JOIN_SPIN_TURNS;   // elle démarre DANS LE DOS
  const r = STAR_JOIN_ORBIT_PX * (1 - 0.35 * k);                     // la spirale se resserre
  return { dx: Math.cos(a) * r, dy: -Math.sin(a) * r * 0.38, scale: 1, front: Math.sin(a) < 0, phase: "spin" };
}
const STAR_JOIN_A = starJoinSpin(0), STAR_JOIN_B = starJoinSpin(1);

export function starJoinAnim(sinceMs) {
  const t = +sinceMs || 0;
  if (t < 0 || t >= STAR_JOIN_MS) return null;
  if (t < STAR_JOIN_CLIMB_MS) {
    const k = t / STAR_JOIN_CLIMB_MS;
    /* Une montée qui accélère puis se pose : elle s'agrippe, elle se hisse. Une
       rampe linéaire se lit comme un ascenseur. ⚠️ ELLE ARRIVE EXACTEMENT AU
       POINT DE DÉPART DU TOURNICOTAGE (`STAR_JOIN_A`), voir la note ci-dessus. */
    const e = k * k * (3 - 2 * k);
    return {
      dx: (-3 + Math.sin(k * Math.PI * 2.4) * 2.4) * (1 - e) + STAR_JOIN_A.dx * e,
      dy: STAR_JOIN_RISE_PX * (1 - e) + STAR_JOIN_A.dy * e,   // + = plus bas ; elle part du sol
      scale: 0.72 + 0.28 * e,
      front: false,                                            // dans le DOS, tout le temps
      phase: "climb",
    };
  }
  if (t < STAR_JOIN_CLIMB_MS + STAR_JOIN_SPIN_MS)
    return starJoinSpin((t - STAR_JOIN_CLIMB_MS) / STAR_JOIN_SPIN_MS);
  /* Elle se pose : on revient de la dernière position du tour vers zéro, sans
     jamais repasser devant (le tour est fini, elle n'a plus rien à montrer). */
  const k = (t - STAR_JOIN_CLIMB_MS - STAR_JOIN_SPIN_MS) / STAR_JOIN_SETTLE_MS;
  const e = 1 - (1 - k) * (1 - k);
  return { dx: STAR_JOIN_B.dx * (1 - e), dy: STAR_JOIN_B.dy * (1 - e), scale: 1, front: false, phase: "settle" };
}

/* ── LES OMBRES QUI PENCHENT (chapitre 2). Une direction n'est pas un lieu ; il
   en faut deux, et de deux endroits assez éloignés pour que le croisement veuille
   dire quelque chose. */
export const STAR_LEAN_WINDOW_MS = 20000;
/* ⚠️⚠️ 70 000 → 26 000, ET C'EST LE BANC QUI L'A DIT. La conception annonçait
   « fenêtre 70 s, écart 45 cases », un chiffre choisi à l'œil et parfaitement
   défendable sur le papier. `tools/verify-quete.mjs` rejoue le trajet réel,
   image par image, avec la vraie collision : quarante-cinq cases se traversent
   en **3,5 s en courant, 6,0 s en marchant**. La fenêtre consommait donc 5 % de
   sa durée — c'est-à-dire qu'elle ne demandait RIEN : on lisait, on faisait
   trois pas, on relisait, et le « il faut vraiment se séparer » de la mécanique
   n'existait pas.
   ⚠️ C'EST LE QUATRIÈME VISAGE DU DÉFAUT DE BANC DE CLAUDE.md, pris à l'endroit
   pour une fois : *un banc qui ne mesure que « est-ce faisable » applaudit une
   mécanique morte.* Il échoue maintenant DANS LES DEUX SENS.
   ⚠️ 26 s : tenable en courant avec sept fois la marge, et 23 % de la fenêtre
   consommée par une simple marche — il faut donc y ALLER, sans jamais être
   pressé. Ne pas remonter ce nombre sans relancer le banc. */
export const STAR_LEAN_SOLO_WINDOW_MS = 26000;
export const STAR_LEAN_MIN_TILES = 30;
export const STAR_LEAN_SOLO_MIN_TILES = 45;
/* Ce que le croisement révèle, dans l'ordre. ⚠️ DEUX MARQUES TOMBENT DÈS LE
   CHAPITRE 2, pas une par étape : on sait TOUJOURS ce qu'on cherche. C'est la
   seule consigne du 442 qu'il fallait garder telle quelle — pas de mystère
   entretenu, la difficulté est dans le geste, jamais dans le silence. */
export const STAR_LEAN_MARKS = ["leanLake", "leanGlass"];

/* ── LE REFROIDISSEMENT (chapitre 1). ⚠️ C'EST LE TUTORIEL, ET IL SE JOUE AVEC
   L'OUTIL QUE LE JOUEUR A DÉJÀ ET QU'IL AIME : l'arrosoir. On arrose par
   à-coups ; la chaleur doit rester dans une bande qui se resserre à chaque
   manche pendant que la consigne DESCEND (blanc → orange → rouge → bleu).
   ⚠️ À DEUX, LA BANDE EST 40 % PLUS LARGE — deux arrosoirs, donc du confort, et
   surtout PAS une obligation : c'est le premier geste de la quête, il ne doit
   jamais demander un second joueur (contrainte dure héritée du 442). */
export const STAR_COOL_ROUNDS = 3;
export const STAR_COOL_BAND = [0.26, 0.19, 0.13];
export const STAR_COOL_DUO_WIDEN = 1.4;
export const STAR_COOL_MS = 14000;       // la descente complète d'une manche
export const STAR_COOL_RISE = 0.105;     // ce que le verre reprend par seconde, tout seul
export const STAR_COOL_POUR = 0.085;     // ce qu'une giclée enlève — jamais un maintien : des À-COUPS
export const STAR_COOL_CRACK = 0.11;     // sous la bande de tant, le verre se fend
/* ⚠️⚠️ ET AU-DESSUS DE LA BANDE, LA MARGE EST PLUS LARGE QUE DESSOUS, EXPRÈS.
   Vu à l'écran, et c'est le genre de défaut qu'aucun banc n'attrape : le premier
   jet démarrait la chaleur à 1,0 avec un plafond ABSOLU à 1,04, et la consigne à
   0,86. Le verre remontait donc au blanc en un tiers de seconde — la manche
   repartait avant que le joueur ait pu appuyer une seule fois, en boucle. La
   manche commence maintenant SUR la consigne, et le plafond est RELATIF à elle
   comme l'est déjà le plancher : deux bornes de même nature, ce qui est la
   seule façon d'en régler une sans casser l'autre.
   ⚠️ Il est plus large que `STAR_COOL_CRACK` parce que les deux fautes n'ont pas
   le même sens : trop arroser est un GESTE (on l'a fait exprès, ça se punit),
   ne pas assez arroser est une HÉSITATION (ça se rattrape). */
export const STAR_COOL_BURN = 0.20;      // au-dessus de la bande de tant, il remonte au blanc

/* ── LA PLONGÉE (chapitre 3). La flaque de lumière au fond de l'eau : son rayon
   est ce qui rend la coopération PHYSIQUE — hors d'elle, l'écran du plongeur est
   noir. Le rayon solo est plus large (la lumière est posée, donc plus haute et
   plus étalée), mais elle ne bouge plus. */
export const STAR_POOL_R = 3.4;
export const STAR_POOL_SOLO_R = 4.6;
/* ⚠️⚠️ LA LARGEUR DE CE QU'ON VOIT EN PLONGÉE, EN CASES — ET C'EST ELLE QUI
   CONVERTIT LES DEUX RAYONS CI-DESSUS EN PIXELS D'ÉCRAN. Vu à l'écran : le
   premier jet divisait par 14 « au jugé », la flaque couvrait 42 % de la largeur
   et le noir autour ne racontait plus rien — or c'est LE noir qui fait la
   coopération (« B ne voit que l'intérieur de la flaque »). Une flaque qui
   remplit l'écran, c'est un mini-jeu de plongée ordinaire avec une jolie vignette.
   ⚠️ CE N'EST PAS UN RÉGLAGE DE DIFFICULTÉ, C'EST UNE ÉCHELLE : le rayon reste
   ce que dit la règle (en cases), et cette constante dit ce qu'une case vaut à
   l'écran. Les toucher séparément est le §8 de CLAUDE.md — une grandeur de JEU,
   une grandeur de DESSIN, deux paramètres. */
export const STAR_POOL_VIEW_TILES = 21;
export const STAR_DIVE_ROUNDS = 3;
export const STAR_DIVE_DEPTH = [22, 34, 48];        // mètres annoncés, pour le texte
export const STAR_DIVE_BREATH_MS = [16000, 15000, 14000];
export const STAR_DIVE_CURRENT = [0.35, 0.75, 1.25];
export const STAR_DIVE_PULSE_MS = 1100;             // l'éclat bat ; on l'attrape au battement
export const STAR_DIVE_SINK = 4.2;                  // mètres par seconde — on coule, on ne nage pas vers le bas
export const STAR_DIVE_HIT_COST_MS = 1600;          // un choc coûte du souffle, jamais la manche
/* ╔════════════════════════════════════════════════════════════════════════════
   ║ ZIP 458 — LA PLONGÉE REDEVIENT LA GRAMMAIRE, AU LIEU D'UN JEU D'ARCADE.
   ╚════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️⚠️ REPROCHE DE GUILLAUME, ET IL EST JUSTE : « le jeu de plongée est trop
   cheap pour le niveau de la quête ». Ce qu'il faisait : on coulait tout seul, on
   esquivait des barres marron, on appuyait au bon battement. **La flaque de
   lumière n'y servait qu'à découper une vignette** — on jouait aussi bien les
   yeux fermés sur le côté droit de l'écran, et la moitié coopérative du chapitre
   ne changeait rien à ce qu'on faisait.
   ⚠️⚠️ LA CORRECTION TIENT EN UNE PHRASE : **la flaque n'est plus une fenêtre,
   c'est le TERRAIN.** Dehors, on ne voit rien, on manque d'air plus vite, et on
   percute des pilotis qu'on ne pouvait pas voir. « A éclaire le chemin de B »
   cesse d'être une jolie image et devient la règle du jeu : sans la lumière de
   l'autre, on ne descend pas.
   ⚠️⚠️ ET LES OBSTACLES CESSENT D'ÊTRE DES OBSTACLES : ce sont les pilotis du
   VIEUX ponton, et dans la lumière ils montrent ce qu'ils se rappellent — ils
   PENCHENT vers le morceau, exactement comme les ombres de la ville penchent au
   chapitre 2 (§4 de `QUETE.md`, « une ombre qui MONTRE »). La même idée magique
   sert donc trois fois au lieu de deux, et le décor du lac raconte enfin pourquoi
   il est là. *Ce qui était un mur devient un indice, sans qu'on ajoute un objet.*
   ═════════════════════════════════════════════════════════════════════════════ */
export const STAR_DIVE_BLIND_MUL = 2.4;   // ce que le souffle coûte HORS de la flaque
export const STAR_DIVE_EDGE = 0.86;       // fraction du rayon où l'on est encore « dedans » (le bord est doux)
export const STAR_DIVE_POSTS = [5, 7, 9]; // les pilotis du vieux ponton, par manche
/* Les pilotis d'une descente. ⚠️ DÉTERMINISTES ET PURS, DONC REGARDABLES : ils
   étaient dans `FermeGame` (`smDiveObstacles`), c'est-à-dire hors de portée de
   tout banc — et ils portent maintenant l'INDICE, pas seulement la collision.
   Une règle qui dit où est le morceau n'a pas le droit de vivre là où personne ne
   peut l'appeler (piège n°1, §4 de `CLAUDE.md`).
   ⚠️ `lean` VAUT −1 OU +1 : le pilotis penche DU CÔTÉ du morceau. C'est tout ce
   qu'un indice doit dire — une direction, jamais une position (c'est la leçon du
   chapitre 2, et c'est pour ça que le dernier pilotis est le plus bas). */
export function starDivePosts(round) {
  const r = Math.max(0, round | 0);
  const D = STAR_DIVE_DEPTH[Math.min(r, STAR_DIVE_DEPTH.length - 1)];
  const n = STAR_DIVE_POSTS[Math.min(r, STAR_DIVE_POSTS.length - 1)];
  const sx = starDiveShardX(r);
  return Array.from({ length: n }, (_, i) => {
    const x = 0.5 + Math.sin(i * 2.399 + r * 1.7) * 0.30;
    return {
      d: 4 + (D - 7) * (i + 0.5) / n,
      x,
      w: 0.075 + ((i * 7 + r * 3) % 5) * 0.012,
      lean: sx >= x ? 1 : -1,
    };
  });
}
/* Où le morceau s'est posé. ⚠️ DÉRIVÉE DE LA MANCHE ET DE RIEN D'AUTRE :
   recommencer une plongée ne doit pas le déplacer, sinon rater n'apprend rien —
   la règle des étals (426) et des perles (444). */
export function starDiveShardX(round) {
  const r = Math.max(0, round | 0);
  return 0.20 + ((r * 0.41 + 0.17) % 0.60);
}

/* ── LE BALAYAGE (chapitre 4). ⚠️ LA VITESSE DE BALAYAGE A UNE BONNE ALLURE, ET
   C'EST TOUT LE MINI-JEU : trop vite, l'ombre vraie passe sans qu'on la voie ;
   trop lentement, le verre chauffe et l'ombre se brouille. Deux bornes, donc,
   jamais un seuil unique. */
export const STAR_RACK_ROUNDS = 3;
export const STAR_RACK_BEADS = [40, 70, 100];
export const STAR_RACK_TRUE_MS = [1400, 1000, 700]; // durée de l'ombre vraie
export const STAR_SWEEP_MIN = 0.25, STAR_SWEEP_MAX = 1.10;  // cases/s de la lumière
export const STAR_RACK_SOLO_NOTCH_MS = 900;         // seul : on tourne le râtelier d'un cran

/* ── LE LEURRE (chapitre 4). La pie SUIT la lumière ; elle a du retard et de la
   patience, et elle décroche si la lumière s'arrête ou saute. */
export const STAR_MAGPIE_LAG = 0.42;         // fraction de rattrapage par seconde
export const STAR_MAGPIE_PATIENCE_MS = 2600; // temps toléré sans mouvement de la lumière
export const STAR_MAGPIE_JUMP_TILES = 4.5;   // au-delà, elle perd la lumière des yeux
export const STAR_MAGPIE_NEST_R = 8;         // elle ne descend pas si quelqu'un est si près
export const STAR_MAGPIE_SOLO_MS = 26000;    // seul : la lumière posée, elle repart au bout de ça
export const STAR_MAGPIE_HOLD_MS = 7000;     // ce que dure la montée au nid pendant qu'elle est tenue à l'écart
/* ⚠️ MÊME RAISON QUE `STAR_POOL_VIEW_TILES` : les deux bornes de la pie sont en
   CASES (c'est la règle), le toit qu'on voit à l'écran fait tant de cases de
   large (c'est le dessin). Deux grandeurs, deux paramètres — et un « / 14 »
   écrit au milieu du code de rendu était très exactement le doublon du §8, avec
   la particularité qu'il rendait les deux constantes de `quete.js` impossibles à
   régler sans lire le composant. */
export const STAR_LURE_VIEW_TILES = 14;

/* ── LE DUO (chapitre 5). Six phrases, de trois à cinq notes. */
export const STAR_DUET_PHRASES = 6;
export const STAR_DUET_LEN = [3, 3, 4, 4, 5, 5];
/* ⚠️ ZIP 453 — CE COMMENTAIRE DISAIT « dérive de la Lyre ». La Lyre était la
   constellation-compteur de la fiction d'AVANT (une lyre à qui il manque une
   corde), et plus rien n'expliquait pourquoi c'était ELLE. Elle n'a d'ailleurs
   jamais été nommée au joueur — aucune chaîne de `fermeStrings` ne la cite —
   donc il n'y avait rien à retirer du jeu : c'est un point du ciel qui bouge,
   et le viseur doit le rattraper. Le compteur, lui, est parti (voir la note du
   ciel dans `drawStarOverlay`). */
export const STAR_DUET_AIM_DRIFT = [0.18, 0.26, 0.34, 0.44, 0.55, 0.68]; // dérive de la cible dans le ciel
export const STAR_DUET_SOLO_FADE_MS = 11000;  // seul : les cales tiennent, la note faiblit
export const STAR_DUET_NOTE_MS = 900;         // ce que dure une note tenue à l'orgue
export const STAR_DUET_AIM_MS = 5200;         // ce qu'il faut tenir la visée pour renvoyer une phrase
/* ⚠️⚠️ CE QUI TRAVERSE LE RÉSEAU PENDANT LE DUO EST LA PRÉSENCE, PAS LA
   PERFORMANCE, ET C'EST UN ARBITRAGE À CONNAÎTRE. La conception (§5 de
   QUETE.md) demande que chacun VOIE l'effet de l'autre : les rais de l'orgue
   s'éteignent si le viseur décroche. Une visée image par image, c'est un message
   par image — le plafond dur de 10/s crevé par un seul joueur (§3 de
   CLAUDE.md), et dépassé SILENCIEUSEMENT. Ce qui circule déjà, en revanche,
   c'est OÙ EST L'AUTRE : le partenaire est à son poste, ou il n'y est pas. La
   lumière faiblit donc quand il quitte le sien — coopération réelle, zéro
   message, et un geste qu'on comprend sans notice. Le reste (« il a raté sa
   note ») reste local, et personne ne peut le voir. */
export const STAR_DUET_ALONE_MUL = 0.55;      // ce que vaut une phrase quand l'autre a quitté son poste

/* ── LA CHUTE. Elle s'arme toute seule ; personne n'a rien à trouver pour
   commencer. ⚠️ ELLE NE PEUT PAS TOMBER LE PREMIER JOUR : une ferme neuve a
   assez à apprendre, et une cinématique sur l'écran d'un joueur qui découvre les
   commandes n'est pas une entrée en matière, c'est une interruption. */
export const STAR_FALL_MIN_DAY = 3;

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 455 — ELLE NE S'ARME PLUS TOUTE SEULE : ON L'ANNONCE, PUIS ON ATTEND.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DEMANDE DE GUILLAUME : « le lancement de la mission doit être annoncé, pas
   automatique, la comète ne doit pas arriver comme ça. […] Et rien ne doit se
   passer immédiatement […] la nuit qui suit, l'événement pourra survenir enfin. »
   ⚠️⚠️⚠️ ET C'EST L'INVERSE DE CE QUE L'EN-TÊTE DE CE FICHIER A DIT PENDANT ONZE
   ZIPS (« la chute est armée par l'hôte, pas déclenchée par une lecture »). Le
   paragraphe est réécrit plus haut plutôt que laissé en place : *quand la fiction
   change, le document qui la raconte fait partie de la livraison* (452), et un
   en-tête faux est lu par le prochain qui ouvre le fichier, qui le croit.
   ⚠️ CE QUI **N'A PAS** CHANGÉ, ET C'EST LE POINT : le secret. Ce qu'on annonce
   est une PIERRE, prédite par des astronomes ; ce que personne ne saura jamais est
   ce qu'il y avait dedans. Séparer les deux garde `STAR_HIDE_R` (elle se cache
   quand on approche), garde le familier-guide du 449, et donne au silence de la
   vallée un contraste qu'il n'avait pas — toute la vallée a vu tomber le caillou.

   TROIS ÉTATS, ET UN SEUL CHAMP POUR LES TENIR (`e.warn`) :
     · rien          — la porte des habitants n'est pas franchie, ou l'hôte n'a
                       pas encore dit oui. Aucune interface, aucun PNJ nerveux ;
     · `warn.at`     — le TAMPON. Les astronomes ont parlé, les PNJ s'agitent et
                       distillent, la comète n'est pas encore tombée ;
     · `fall`        — la suite, inchangée depuis le 444.
   ⚠️ UN CHAMP, PAS DEUX : « la quête est-elle annoncée » et « quand » sont la
   même question posée deux fois, et le §8 de `CLAUDE.md` est formel sur ce que
   coûte un paramètre qui en double un autre. */
export function starWarned(e) { return !!(e && e.warn && e.warn.at); }
export function starWarnAt(e) { return starWarned(e) ? +e.warn.at : 0; }
/* Le tampon est-il EN COURS ? ⚠️ « annoncée et pas encore tombée », et rien
   d'autre : c'est cette fonction que lisent les PNJ nerveux, l'affiche de la
   mairie et le banc. Une seconde écriture (« warn && !fall ») dans la boucle de
   rendu aurait été la troisième forme du piège n°1 — deux descriptions de la même
   grandeur, qui divergent au premier réglage. */
export function starWarning(e) { return starWarned(e) && !starFallen(e); }
/* Depuis combien de temps ? ⚠️ ELLE SERT DE PHASE, PAS D'ÉCHÉANCE, et c'est ce
   qui autorise chaque client à la calculer sur SA propre horloge (§3 : jamais
   deux horloges). Un tic de PNJ décalé de deux dixièmes entre deux écrans n'est
   visible par personne ; une ÉCHÉANCE décalée de deux dixièmes se verrait. */
export function starWarnSince(e, now) { return starWarned(e) ? Math.max(0, (+now || 0) - starWarnAt(e)) : 0; }

/* L'INSTANT OÙ LA NUIT COMMENCE, pour un jour de jeu donné. ⚠️ IL EST DÉRIVÉ DU
   MÊME COUPLE QUE `E.gameTimeMin` (`DAY_START_MIN` → `DAY_END_MIN` étalés sur
   `DAY_REAL_MS`) : recopier « la nuit tombe à 55 % du jour » aurait été un second
   calendrier, faux le jour où l'on rallonge la journée. */
export function starNightStart(dayStartAt) {
  const span = C.DAY_END_MIN - C.DAY_START_MIN;
  return (+dayStartAt || 0) + C.DAY_REAL_MS * (C.DUSK_START_MIN - C.DAY_START_MIN) / span;
}
/* ⚠️⚠️ « LA NUIT QUI SUIT » SE LIT « LA PREMIÈRE NUIT QUI **COMMENCE** APRÈS
   L'ANNONCE », ET LES DEUX LECTURES NE DONNENT PAS LE MÊME JEU. Prise au sens
   « la prochaine fois qu'il fait nuit », un « oui » cliqué à 20 h faisait tomber
   la comète dans la minute — c'est-à-dire très exactement ce que cette demande
   refuse. On compare donc l'annonce au DÉBUT de la nuit courante : s'il est
   antérieur, cette nuit-là ne compte pas, et c'est celle du lendemain.
   ⚠️ ET LE PLANCHER RATTRAPE LE CAS SYMÉTRIQUE : accepter trente secondes avant
   le crépuscule laissait un tampon qui existait dans le code et pas à l'écran. */
export function starFallDue(e, dayStartAt, now) {
  if (!starWarned(e)) return false;
  const t = +now || 0, warn = starWarnAt(e);
  if (t < warn + C.STAR_WARN_FLOOR_MS) return false;
  const night = starNightStart(dayStartAt);
  return night > warn && t >= night;
}

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 455 — LES PNJ NERVEUX. DÉRIVÉS, JAMAIS DIFFUSÉS.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DEMANDE DE GUILLAUME : « Les visiteurs et résidents doivent seulement à ce
   stade avoir un comportement un peu different, parfois osciller droite, gauche…
   ou tourner une ou deux fois sur eux mêmes avec un "!" au dessus de leur tête.
   […] Mais tous ne doivent pas en parler. »
   ⚠️⚠️ TOUT EST UNE FONCTION DE `rid` ET DU TEMPS ÉCOULÉ DEPUIS L'ANNONCE — donc
   les MÊMES PNJ s'agitent sur les deux écrans, avec les mêmes phrases, pour ZÉRO
   `send()`. C'est la discipline de `TJ_REACT_TALK_EVERY` (368, « déterministe,
   donc les mêmes PNJ sont bavards chez tous les joueurs, sans un octet de
   réseau ») et des oiseaux (433), appliquée à une humeur.
   ⚠️ ET ELLES SONT ICI, PAS DANS LA BOUCLE DE RENDU : un comportement écrit dans
   la closure ne peut pas être balayé par un banc, donc il reste au niveau du jour
   où il a été écrit (piège n°1, §2). Le banc peut vérifier ici ce qu'aucune
   capture ne montre — que la part de nerveux est proche de `STAR_NERVE_SHARE`,
   qu'un tour sur soi-même revient bien à sa direction de départ, et que deux PNJ
   voisins ne s'agitent pas en chœur. */
function starHash(n) {
  let h = ((n | 0) + 0x9e3779b9) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x21f0aaad) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 0x735a2d97) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}
/* ⚠️ « TOUS NE DOIVENT PAS EN PARLER » : c'est ce test-là, et il ne dépend que du
   `rid`. Le même PNJ est nerveux du début à la fin du tampon — un tirage par tic
   aurait donné une foule uniformément agitée par intermittence, ce qui se lit
   comme un bogue d'animation et pas comme une peur. */
export function starNerveHas(rid) { return (starHash(rid) % 1024) < C.STAR_NERVE_SHARE * 1024; }
/* Le tic courant, ou `null`. ⚠️ LE DÉCALAGE PAR PNJ EST LA MOITIÉ DE L'EFFET :
   sans lui, toute la place se retourne dans la même image, ce qui a l'air
   chorégraphié — le contraire d'une foule inquiète. */
export function starNerveTic(rid, sinceMs) {
  if (!starNerveHas(rid)) return null;
  const P = C.STAR_NERVE_PERIOD_MS;
  const t = (+sinceMs || 0) + starHash(rid ^ 0x5bf0) % P;
  if (t < 0) return null;
  const k = (t % P) / C.STAR_NERVE_TIC_MS;
  if (k >= 1) return null;
  const n = Math.floor(t / P);
  return { k, n, spin: (n + starHash(rid ^ 0x13c7) % C.STAR_NERVE_SPIN_EVERY) % C.STAR_NERVE_SPIN_EVERY === 0 };
}
/* ⚠️ L'ORDRE EST CELUI D'UN TOUR SUR SOI-MÊME, PAS CELUI DES INDICES DE POSE.
   `drawCharacter` numérote 0 sud, 1 nord, 2 ouest, 3 est ; les prendre dans cet
   ordre-là ferait faire au PNJ un aller-retour sud-nord, c'est-à-dire un
   clignotement et pas une rotation. */
export const STAR_NERVE_DIRS = [0, 2, 1, 3];   // sud → ouest → nord → est
export function starNerveDir(rid, tic) {
  if (!tic) return null;
  if (tic.spin) {
    /* « une ou deux fois » (Guillaume), et c'est le `rid` qui tranche : deux PNJ
       côte à côte ne tournent pas au même rythme. */
    const turns = 1 + starHash(rid ^ 0x2c1b) % 2;
    return STAR_NERVE_DIRS[Math.floor(tic.k * 4 * turns) % 4];
  }
  return (Math.floor(tic.k * 8) % 2) ? 3 : 2;   // le balancement : quatre allers-retours gauche-droite
}
/* CE QU'IL DIT QUAND ON S'APPROCHE. ⚠️⚠️ IL REND UN INDEX, PAS UNE PHRASE : ce
   fichier ne connaît aucun texte, c'est la règle depuis le 444. Les deux tailles
   de pool arrivent en paramètre, donc ajouter une rumeur ne demande de toucher à
   rien ici.
   ⚠️ LE CHOIX EST FIGÉ PAR `rid` — le forgeron dit TOUJOURS la même chose. C'est
   ce qui rend le tampon jouable plutôt que décoratif : on peut retourner voir
   celui qui parlait de l'ingénieur breton. Un tirage par approche aurait donné
   une machine à phrases, et personne n'aurait rien retenu. */
/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 456 — IL S'ARRÊTE, IL SE TOURNE VERS TOI, ET *ENSUITE* IL PARLE.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DEMANDE DE GUILLAUME : « les indices que donnent les résidents visiteurs
   sont difficiles à lire car ils sont en mouvement. Ils pourraient s'arrêter
   devant nous pour nous parler ? » Le 455 avait tout : la phrase, la portée, la
   bulle. Il lui manquait la seule chose qui la rende LISIBLE — que le PNJ et sa
   bulle cessent de glisser pendant qu'on les lit. Une bulle qui bouge est une
   bulle qu'on ne finit pas.
   ⚠️⚠️ ET C'ÉTAIT AUSSI UN MÉLANGE DE CARTES (§4 de `CLAUDE.md`, payé quatre
   fois) : `starNerveNear` du 455 comparait un x de joueur à un x de PNJ SANS
   REGARDER LA ZONE. Un fermier debout en (50, 50) à la ferme faisait donc parler
   un habitant debout en (50, 50) à Valley Town. La parade est celle du §4 : on
   teste la ZONE d'abord, les distances ensuite — d'où la zone en paramètre, ici
   et chez les trois appelants.
   ⚠️ LA DISTANCE EST DE MANHATTAN, comme toutes les portées de dialogue du
   projet : une seconde métrique donnerait une portée qui ne ressemble à aucune
   autre, et le joueur les compare sans le savoir. */
export function starNerveNearTo(pz, px, py, z, x, y) {
  if ((pz || "farm") !== (z || "farm")) return false;
  if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  return Math.abs(px - x) + Math.abs(py - y) <= C.STAR_NERVE_TALK_R;
}
/* VERS OÙ IL SE TOURNE. ⚠️ MÊME NUMÉROTATION QUE `drawCharacter` (0 sud, 1 nord,
   2 ouest, 3 est) et même convention d'écran que tout le reste du jeu : `y`
   croît vers le BAS, donc un joueur plus bas que le PNJ est au SUD.
   ⚠️ ELLE EST ICI ET PAS DANS LA BOUCLE parce qu'elle a un invariant qu'un banc
   peut balayer — *il regarde toujours le demi-plan où se trouve le joueur* — et
   qu'un `if` recopié dans trois boucles de rendu ne l'aurait dans aucune. */
export function starNerveFace(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 3 : 2;
  return dy > 0 ? 0 : 1;
}
export const STAR_NERVE_HINT_IN = 5, STAR_NERVE_HINT_OF = 2;   // deux PNJ nerveux sur cinq donnent un vrai indice
export function starNerveSay(rid, nRumor, nHint) {
  if (!starNerveHas(rid)) return null;
  const h = starHash(rid ^ 0x77af);
  const useHint = (nHint | 0) > 0 && h % STAR_NERVE_HINT_IN < STAR_NERVE_HINT_OF;
  const n = useHint ? (nHint | 0) : (nRumor | 0);
  if (n <= 0) return null;
  return { pool: useHint ? "hint" : "rumor", idx: (h >>> 7) % n };
}
/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 454 — ET ELLE NE TOMBE PLUS SUR N'IMPORTE QUELLE FERME.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DEMANDE DE GUILLAUME : « LA ferme doit avoir déjà débloqué au moins eduardo
   et tristan (actif) ainsi qu'au moins 4 artisans sur la ferme. ce patch est
   logique : eduardo prend le bateau à la fin de la quête et tristan y travaille. »
   ⚠️ ELLE EST PURE ET ELLE PREND UN CONSTAT, PAS L'ÉTAT DE LA STATION : `ctx` est
   `{ skills: [...], artisans: n }`, rempli par l'hôte avec `E.residentActiveSkill`
   et `E.countSkilledResidents`. Écrite ici avec `station` en paramètre, elle
   aurait obligé `quete.js` à connaître le format d'un résident — et le banc à
   fabriquer une station complète pour tester trois conditions.
   ⚠️⚠️ ELLE REND CE QUI MANQUE, PAS UN BOOLÉEN, et ce n'est pas du luxe : le menu
   développeur DOIT pouvoir dire pourquoi rien ne tombe, sinon le premier
   symptôme de cette porte sera « la quête est cassée » (elle ne l'est pas : elle
   attend deux habitants). */
export function starFallGate(ctx) {
  const have = (ctx && ctx.skills) || [];
  const missing = C.STAR_GATE_SKILLS.filter(s => !have.includes(s));
  const artisans = (ctx && ctx.artisans) | 0;
  return { ok: !missing.length && artisans >= C.STAR_GATE_ARTISANS, missing, artisans, need: C.STAR_GATE_ARTISANS };
}
/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 454 — LA CHUTE EST TROIS FOIS PLUS LENTE, SAUF À LA TOUTE FIN.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DEMANDE DE GUILLAUME, MOT POUR MOT : « la chute de la comète doit être
   ralentie par 3 pour créer une impression de lourdeur, sauf à l'absolue fin, où
   la vitesse augmente graduellement jusqu'à atteindre la vitesse actuelle. »
   ⚠️⚠️ CE N'EST PAS UNE DURÉE QU'ON TRIPLE, C'EST UNE VITESSE — et les deux ne se
   ressemblent pas. Tripler la durée seule donne une comète trois fois plus lente
   PARTOUT, y compris au contact : le poids serait là, l'impact serait mou. Ce que
   demande la phrase est un profil : ⅓ de vitesse tout du long, puis une remontée
   graduelle jusqu'à la vitesse d'avant AU MOMENT DU CONTACT.
   ⚠️ D'où une reparamétrisation du temps plutôt qu'un facteur : `starFallEase`
   rend l'avancement `u` à partir du temps `k`, avec une dérivée qui vaut 1 sur les
   80 % du vol et monte en `smoothstep` jusqu'à `STAR_FALL_SLOW` sur les 20 %
   derniers. La durée du vol s'en DÉDUIT (`× SLOW / N`, où `N` est l'intégrale de
   cette dérivée) : c'est ce qui garantit les deux bouts à la fois — exactement ⅓
   de la vitesse d'avant pendant la phase lourde, exactement la vitesse d'avant à
   l'instant du contact. Deux nombres réglés à la main auraient donné l'un OU
   l'autre, et le banc mesure les deux.
   ⚠️⚠️ ET TOUTE LA SCÈNE SUIT, PARCE QU'ELLE EST DÉRIVÉE. `STAR_FALL_MS`,
   `STAR_CAM_HOLD_MS`, les trois lignes de texte et la carte de chapitre étaient
   accrochées à `STAR_FALL_IMPACT_MS` depuis le 448 : allonger le vol de cinq
   secondes ne demande donc de relire AUCUN de ces nombres. C'est très exactement
   ce que le 448 avait acheté, et c'est la première fois que ça sert. */
export const STAR_FALL_SLOW = 3;         // « ralentie par 3 » — le facteur de la phase lourde
/* ⚠️⚠️ 0,06 ET PAS 0,20, ET C'EST L'ÉCRAN QUI L'A DIT — LE BANC ÉTAIT VERT AVEC
   LES DEUX. Premier réglage : un cinquième du vol en reprise de vitesse. Les deux
   contrôles passaient (⅓ pendant la phase lourde, vitesse d'origine au contact) et
   à l'écran **on ne voyait rien de plus lent qu'avant**. La raison tient à la
   perspective du 448 : la comète naît à 1,3 diagonale d'écran et avance en `s =
   u^1,9`, donc elle n'ENTRE dans le cadre qu'aux derniers 22 % de sa trajectoire.
   Avec une reprise longue, ces 22 % étaient parcourus PENDANT la reprise — on
   ralentissait très soigneusement une comète invisible, et on gardait à l'écran
   exactement la chute d'avant.
   ⚠️ *Le banc mesurait la bonne grandeur au mauvais endroit* : il regardait la
   vitesse le long du vol, pas la vitesse le long de ce qu'on VOIT. C'est une
   septième forme du défaut de banc, et elle vaut d'être notée : **une grandeur
   juste, mesurée sur un intervalle que le joueur ne regarde pas.**
   ⚠️ À 0,06, la portion visible dure ~1,05 s au lieu de 0,45 (2,3× plus longue) et
   la reprise tombe dans les trois derniers dixièmes — sur l'écran, pas au-dessus. */
export const STAR_FALL_RUSH = 0.06;      // « à l'absolue fin » — la fraction du vol où elle reprend sa vitesse
export const STAR_FALL_BASE_FLIGHT_MS = 2050;   // ce que le vol durait jusqu'au 453 (1150 → 3200)
/* L'intégrale de la dérivée ci-dessous : `1 + (SLOW − 1) × RUSH / 2`. Elle est
   nommée parce que la DURÉE en dépend, et qu'un `1.2` écrit dans une
   multiplication n'aurait eu aucun moyen de dire d'où il vient. */
export const STAR_FALL_EASE_NORM = 1 + (STAR_FALL_SLOW - 1) * STAR_FALL_RUSH / 2;
export const STAR_FALL_FLIGHT_MS = Math.round(STAR_FALL_BASE_FLIGHT_MS * STAR_FALL_SLOW / STAR_FALL_EASE_NORM);
export function starFallEase(k) {
  const u = Math.max(0, Math.min(1, +k || 0));
  const f = STAR_FALL_RUSH, R = STAR_FALL_SLOW;
  if (u <= 1 - f) return u / STAR_FALL_EASE_NORM;
  const x = (u - (1 - f)) / f;
  const s = x * x * x - x * x * x * x / 2;        // ∫ smoothstep, forme fermée
  return ((1 - f) + f * (x + (R - 1) * s)) / STAR_FALL_EASE_NORM;
}
/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 454 — LES DEUX NOMBRES DE LA PERSPECTIVE SORTENT DE LA CLOSURE.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ ILS ÉTAIENT ÉCRITS EN DUR DANS LA BOUCLE DE RENDU (`LEN = hypot(W,H) *
   1.30`, `Math.pow(k, 1.9)`) — donc invisibles à tout banc, donc impossibles à
   croiser avec la vitesse. C'est très exactement ce qui a laissé passer le premier
   réglage de `STAR_FALL_RUSH` : on savait mesurer la vitesse le long du VOL, et
   personne ne pouvait mesurer la durée de ce qui est À L'ÉCRAN, parce que « à
   partir de quand est-elle dans le cadre » vivait dans la closure.
   ⚠️ Ils sont ici, le rendu les lit, le banc les lit. Une jointure, jamais deux
   listes — la règle du 449, appliquée à deux nombres qu'on n'avait jamais pensé à
   sortir parce qu'ils avaient l'air d'être du dessin. */
export const STAR_FALL_ENTRY_LEN = 1.30;   // en DIAGONALES d'écran : d'où elle vient, toujours hors champ
export const STAR_FALL_PERSP = 1.9;        // l'exposant de la course (un objet qui vient sur nous)
/* Depuis quel avancement `u` la comète est-elle DANS le cadre ? ⚠️ « Dans le
   cadre » = à moins d'une demi-diagonale du point d'impact : c'est une
   approximation généreuse (l'impact n'est pas au centre), et elle est déclarée —
   ce qu'on mesure avec est une DURÉE MINIMALE, donc l'approximation joue du bon
   côté. */
export function starFallOnScreenFrom() {
  const s = 1 - 0.5 / STAR_FALL_ENTRY_LEN;
  return Math.pow(s, 1 / STAR_FALL_PERSP);
}
/* ⚠️⚠️ ZIP 455 — LE MÊME INSTANT, MAIS EN TEMPS. `starFallOnScreenFrom` rend un
   AVANCEMENT (`u`, après reparamétrisation) ; tout ce qui se règle dans la scène
   se règle en FRACTION DE DURÉE (`k`, avant reparamétrisation), et les deux ne
   sont pas le même nombre — 0,77 d'un côté vaut 0,84 de l'autre. Confondre les
   deux, c'est exactement le défaut du 454 dans son autre sens : *une grandeur
   juste, lue dans la mauvaise unité.* Elle est sortie ici parce que le réglage de
   la fracture en dépend, et parce que `starFallVisibleMs` la calculait déjà sans
   la nommer — une seule écriture, jamais deux. */
export function starFallOnScreenK(ease) {
  const uIn = starFallOnScreenFrom();
  const f = ease || starFallEase;
  for (let k = 0; k <= 1.0001; k += 0.0005) if (f(k) >= uIn) return k;
  return 1;
}
/* Combien de temps la voit-on VRAIMENT, en millisecondes. C'est la grandeur que le
   premier réglage du 454 avait laissée filer. */
export function starFallVisibleMs(flightMs, ease) {
  return (1 - starFallOnScreenK(ease)) * (flightMs === undefined ? STAR_FALL_FLIGHT_MS : flightMs);
}
/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 455 — LE CAILLOU SE FEND EN VOL, ET LA GÉOMÉTRIE EST ICI.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DEMANDE DE GUILLAUME : « on verra passer l'astéroïde qui se fractionne ».
   ⚠️ ELLE EST DANS CE FICHIER ET PAS DANS LA BOUCLE : le DESSIN d'une tête de
   comète vit dans `fermeArt` (448), sa TRAJECTOIRE chez l'appelant, et la
   RÉPARTITION des morceaux — c'est-à-dire la seule chose qu'on peut se tromper en
   réglant — doit vivre là où un banc l'atteint. Écrite dans la closure, elle
   aurait été le vingtième nombre invisible du chantier.
   ⚠️⚠️ ET ELLE RACONTE L'HISTOIRE QUI EXISTAIT DÉJÀ : le bateau se casse EN
   TOMBANT, et c'est ce qui envoie la coque au-delà de la ville jusqu'au champ de
   la ferme. La fracture n'est donc pas un effet, c'est la seule image du jeu qui
   montre pourquoi il y a deux impacts sur deux cartes.
   ⚠️ ELLE NE SE JOUE QU'À LA FERME, comme le point de vue : « Pour l'écrasement de
   la météorite et le gros cratère à valley town, garder l'animation actuelle ». Là
   -bas on regarde tomber un bloc, ici on regarde passer une chose qui se défait.
   ⚠️ LES ÉCARTS SONT EN RAYONS DE TÊTE, JAMAIS EN PIXELS : la tête grossit d'un
   facteur vingt le long du vol (perspective en `k^2,5`), donc des pixels auraient
   donné des éclats collés au départ et un feu d'artifice à l'arrivée. */
export const STAR_FRAG_N = 5;             // les cinq petits impacts de la ferme
/* ⚠️⚠️ ZIP 455 — ELLE EST DÉRIVÉE, ET LE BANC A EXIGÉ QU'ELLE LE SOIT. Premier
   jet : `0.34`, un nombre qui « avait l'air d'être au début du vol ». Il l'était —
   et la comète n'entre dans le cadre qu'à 0,84 du temps de vol (perspective du
   448), donc **le caillou se fendait très soigneusement hors de l'écran** et l'on
   ne voyait arriver que trois morceaux déjà séparés. C'est mot pour mot la
   septième forme du défaut de banc écrite au 454 — *une grandeur juste, mesurée
   sur un intervalle que le joueur ne regarde pas* — et c'est la deuxième fois en
   deux zips. La parade est la même que pour la vitesse : on ne règle pas, on
   DÉRIVE de ce qui est VISIBLE (§8 de `CLAUDE.md`).
   ⚠️ 0,28 DE LA PORTION VISIBLE : assez tard pour qu'on ait vu un seul caillou
   arriver, assez tôt pour que la séparation ait le temps de se lire avant le
   contact. C'est le seul chiffre réglé du bloc, et il est relatif. */
export const STAR_FRAG_AT = (() => { const kIn = starFallOnScreenK(); return kIn + (1 - kIn) * 0.28; })();
export const STAR_FRAG_SPREAD = 3.2;      // écart latéral au contact, en rayons de tête
export const STAR_FRAG_LAG = 2.4;         // ce que les éclats prennent de RETARD, idem
export function starFragmentsOn(zone) { return starCamVantageOn(zone); }
/* Les morceaux visibles à l'avancement `k`, le premier étant toujours la tête.
   ⚠️ `along` EST UN RETARD (vers l'arrière de la course) et `side` un écart
   latéral, tous deux en rayons de tête ; `scale` est la taille relative. Rendre
   des positions absolues aurait obligé ce fichier à connaître l'angle, la
   perspective et le zoom — c'est-à-dire à redevenir du dessin. */
export function starFragments(k) {
  const u = Math.max(0, Math.min(1, +k || 0));
  const out = [{ along: 0, side: 0, scale: 1, split: 0 }];
  if (u <= STAR_FRAG_AT) return out;            // pas encore fendu : un seul caillou
  const s = (u - STAR_FRAG_AT) / (1 - STAR_FRAG_AT);
  for (let i = 1; i < STAR_FRAG_N; i++) {
    const side = (i % 2 ? 1 : -1) * (0.62 + 0.38 * ((i - 1) % 2));
    out.push({
      along: STAR_FRAG_LAG * s * (0.55 + 0.45 * i),
      side: STAR_FRAG_SPREAD * s * side,
      scale: 0.46 - 0.09 * (i - 1),
      split: s,
    });
  }
  return out;
}

export const STAR_FALL_TAIL_MS = 5800;  // ce qui suit le contact : gerbe, onde, colonne, quatre lignes
export const STAR_TURN_MS = 7000;      // durée du retournement (fin du chapitre 4)
export const STAR_END_MS = 14000;      // durée de la résolution
/* ⚠️ LA CARTE DE CHAPITRE SE FERME TOUTE SEULE, et sa durée est ici plutôt que
   dans le composant pour la raison de tout ce paragraphe : le banc doit pouvoir
   vérifier qu'elle ne dépasse pas la scène qui la précède. Une carte qui reste
   à l'écran pendant qu'on rejoue est un panneau, pas une transition. */
export const STAR_CARD_MS = 3800;

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 445 — LA CHUTE DOIT ÊTRE VUE. (demande de Guillaume : « quand la comète
   ║ s'écrase, la scène doit être vue ».)
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ CE QU'ON CORRIGE N'EST PAS UN DÉFAUT DE DESSIN, C'EST UN DÉFAUT DE
   GARANTIE. Le 444 jouait la scène « là où le joueur est », ce qui voulait dire
   en pratique : parfois derrière un menu, parfois au troisième étage du
   tribunal où il n'y a pas de ciel, parfois jamais — un joueur qui rejoint le
   salon le lendemain ne l'a tout simplement pas vue. Une ouverture qui peut ne
   pas avoir lieu n'est pas une ouverture.

   Trois grandeurs, et elles sont ici parce que le banc les lit :
   1. LES MONDES D'IMPACT. La scène ne se joue QUE là où quelque chose tombe
      vraiment — le sillon à la ferme, le cratère en ville. ⚠️ C'est une liste
      de ce qui est PERMIS et non de ce qui est interdit (leçon de `plantTree`,
      440) : le jour où une carte s'ajoute, elle n'a pas de chute tant que
      personne ne l'écrit ici. Ailleurs, la scène ATTEND.
   2. LA FENÊTRE DE CAMÉRA. Elle part vers l'impact, s'y tient pendant le flash
      et la secousse, revient. ⚠️ SA DURÉE EST CONSTANTE, JAMAIS FONCTION DE LA
      DISTANCE : le flash doit tomber à 3,0 s chez tout le monde, sinon deux
      joueurs à deux bouts de la ville ne voient pas la même scène — et c'est
      exactement ce qu'on ne peut pas rattraper (§3 : jamais deux horloges).
   ⚠️ ET IL N'Y A PAS DE DÉLAI D'ABANDON. La tentation était d'écrire « au bout
   de N minutes, on la joue quand même » : ça n'a pas de sens ici, puisque la
   seule chose qu'on pourrait faire à l'expiration serait de la jouer dans un
   endroit où elle n'a rien à montrer. Elle attend, et elle attend bien — un
   paramètre qu'aucun code n'utilise vraiment est un paramètre qui mentira.
   ───────────────────────────────────────────────────────────────────────────── */
export const STAR_FALL_WORLDS = ["farm", "town"];
export function starImpactZone(zone) { return STAR_FALL_WORLDS.includes(zone || "farm"); }
/* La caméra, en millisecondes depuis le début de la scène. ⚠️ ELLE EST POSÉE
   AVANT LE TRAIT DE LUMIÈRE (1,2 s) et elle ne repart qu'APRÈS la colonne
   (4,5 s) : une caméra qui bouge pendant le flash rend le flash illisible. */
export const STAR_CAM_GO_MS = 1100;     // le vol vers l'impact
export const STAR_CAM_BACK_MS = 1900;   // le retour vers le joueur
/* ⚠️ ZIP 454 — `STAR_CAM_HOLD_MS` EST DÉRIVÉE ET VIT PLUS BAS, avec l'instant du
   contact dont elle dépend : elle valait 6200 = 3200 + 3000, c'est-à-dire un
   nombre qui doublait l'impact sans le dire. La caméra tient trois secondes APRÈS
   le contact, quelle que soit la durée du vol. */
export const STAR_CAM_AFTER_MS = 3000;  // ce qu'elle reste sur l'impact, une fois le contact passé

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 455 — À LA FERME, LA CAMÉRA NE REGARDE PLUS L'ENDROIT OÙ ÇA VA TOMBER.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DEMANDE DE GUILLAUME : « l'animation astéroïde sur la ferme ne doit pas
   figer la zone d'écrasement avant l'arrivée de l'éclat d'astéroïde, mais prendre
   une scène ailleurs, plus éloignée du futur point d'impact où l'on verra passer
   l'astéroïde qui se fractionne. Et quelques secondes plus tard, animation
   tremblante habituelle suggérant l'écrasement puis chevron. »
   ⚠️⚠️ C'EST UN DÉFAUT DE RÉCIT, PAS DE DESSIN, ET IL EST DE LA MÊME FAMILLE QUE
   CELUI DU 448 : la scène RÉPONDAIT à la question qu'elle venait de poser. On
   cadrait un bout de champ vide pendant six secondes — donc on savait où ça allait
   tomber avant que ça tombe, et le chevron qui suit n'apprenait plus rien. Ici on
   voit passer la chose, on la perd de vue, le sol tremble : il faut CHERCHER.
   ⚠️ LE POINT DE VUE EST DÉRIVÉ, JAMAIS RÉGLÉ : impact moins la direction de la
   course, sur `STAR_CAM_VANTAGE` demi-diagonales d'écran. Un nombre de cases écrit
   à la main aurait penché le jour où l'on change le zoom ou la taille du canevas
   (§8), et surtout il aurait été JUSTE sur l'écran de celui qui l'a réglé.
   ⚠️⚠️ ET IL EST > 1 EXPRÈS : à une demi-diagonale on regarde encore le bord du
   cratère. Au-delà de 1, l'impact est HORS CADRE quelle que soit la direction de
   la course — c'est une garantie géométrique, pas un réglage heureux, et c'est ce
   que le banc mesure (il balaie les formats de fenêtre plutôt que d'en croire un).
   ⚠️ LA VILLE GARDE SA SCÈNE (« Pour l'écrasement de la météorite et le gros
   cratère à valley town, garder l'animation actuelle »). Là-bas le cratère est le
   sujet, ici il est la question. */
export const STAR_CAM_VANTAGE = 1.15;      // en DEMI-DIAGONALES d'écran, en AMONT de la course
export const STAR_CAM_VANTAGE_ZONES = ["farm"];
export function starCamVantageOn(zone) { return STAR_CAM_VANTAGE_ZONES.includes(zone || "farm"); }
/* Le point que la caméra vise. ⚠️ ELLE REND L'IMPACT LUI-MÊME LÀ OÙ IL EST LE
   SUJET : une liste de ce qui est PERMIS et non de ce qui est interdit, comme
   `STAR_FALL_WORLDS` (leçon de `plantTree`, 440). Le jour où une carte s'ajoute,
   elle a la scène d'origine tant que personne ne l'écrit ici.
   `halfDiagTiles` est la demi-diagonale de la fenêtre EN CASES — l'appelant la
   connaît (`starViewRef`), ce fichier ne doit surtout pas la deviner. */
export function starCamTarget(zone, impact, halfDiagTiles) {
  if (!impact) return null;
  if (!starCamVantageOn(zone)) return { zone, x: impact.x, y: impact.y };
  const a = starFallAngle(zone), d = STAR_CAM_VANTAGE * Math.max(1, +halfDiagTiles || 0);
  return { zone, x: impact.x - Math.cos(a) * d, y: impact.y - Math.sin(a) * d };
}

/* ⚠️ LE « ! » DE TOUTES LES TÊTES, À L'IMPACT (demande de Guillaume : « Tous les
   pnj doivent avoir un "!" en bulle au dessus de leurs têtes pendant 2 secondes à
   partir du moment de l'impact »). Il se dérive de l'horloge de scène que chaque
   client a déjà — donc zéro message, et il tombe au même instant que la secousse
   parce qu'il lit le MÊME `STAR_FALL_IMPACT_MS` (une jointure, jamais deux
   listes). Hors cinématique il rend `false` : le monde ne sursaute pas tout seul. */
export function starBang(sceneKey, elapsedMs) {
  if (sceneKey !== "fall") return 0;
  const t = (+elapsedMs || 0) - STAR_FALL_IMPACT_MS;
  return (t >= 0 && t < C.STAR_BANG_MS) ? 1 - t / C.STAR_BANG_MS : 0;
}

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 448 — L'INSTANT DE L'IMPACT. UNE JOINTURE, PAS UN NOMBRE DE PLUS.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ CE BLOC EXISTE PARCE QUE « 3,0 s » ÉTAIT ÉCRIT DEUX FOIS SANS QUE LES DEUX
   ÉCRITURES SE CONNAISSENT. Le 445 avait posé `STAR_CAM_FLASH_MS = 3000` ici,
   que le BANC lisait ; la cinématique, elle, écrivait `t > 3.0` en dur dans sa
   closure. Le banc mesurait donc un nombre que le dessin ne lisait pas — le
   quatrième visage du défaut de banc (§ CLAUDE.md : *il mesure autre chose*), et
   la constante ne pouvait pas faire échouer quoi que ce soit. Elle est
   SUPPRIMÉE ; il n'en reste qu'une, et c'est celle-ci.
   ⚠️⚠️ ET ELLE NE SERT PAS QU'À DESSINER : LE DÉCOR D'IMPACT LA LIT AUSSI.
   C'est le défaut que Guillaume a vu à l'écran — « l'impact apparaît avant
   l'écrasement de la comète ». Le cratère de la ville se peignait dès que
   `starFallen` était vrai, c'est-à-dire à t=0 : pendant trois secondes le trou
   fumait, ses braises rougeoyaient et l'étoile brillait au fond PENDANT QUE LA
   COMÈTE ÉTAIT ENCORE DANS LE CIEL. Le sillon de la ferme était pire — aucun
   test de quête ne le gardait, il était labouré dans le champ depuis le premier
   jour. Aucun banc ne pouvait le voir : ils mesurent tous ce qu'un décor
   DESSINE, aucun ne mesurait QUAND il apparaît.
   ⚠️ La parade est `starImpactLanded`, appelée par la cinématique ET par les
   deux décors. Deux listes auraient redivergé au premier réglage (§ « une porte
   sans chemin de code ment », 444). */
export const STAR_FALL_APPEAR_MS = 1150;  // la comète entre en scène — APRÈS que la caméra se soit posée
/* ⚠️⚠️ ZIP 454 — LES DEUX SUIVANTES SONT DÉSORMAIS DÉRIVÉES, ET C'EST CE QUI A
   RENDU LE RALENTISSEMENT GRATUIT. `3200` et `9000` étaient écrits à la main ; la
   chute passant de 2,05 s à 5,1 s, il aurait fallu relire quatre nombres et en
   oublier un. Ils se déduisent maintenant du vol (`STAR_FALL_FLIGHT_MS`) et de la
   queue de scène (`STAR_FALL_TAIL_MS`) — §8 de `CLAUDE.md`, « un paramètre qui
   double un autre doit être DÉRIVÉ, jamais réglé ». */
export const STAR_FALL_IMPACT_MS = STAR_FALL_APPEAR_MS + STAR_FALL_FLIGHT_MS;  // elle touche le sol — L'INSTANT, lu par tout le monde
export const STAR_FALL_MS = STAR_FALL_IMPACT_MS + STAR_FALL_TAIL_MS;           // durée de la scène d'ouverture
export const STAR_CAM_HOLD_MS = STAR_FALL_IMPACT_MS + STAR_CAM_AFTER_MS;       // ce qu'elle y reste (depuis t=0)

/* Le décor d'impact est-il POSÉ ? ⚠️ ELLE PREND LA SCÈNE EN COURS, PAS L'ÉTAT
   PARTAGÉ : hors cinématique (un joueur qui arrive le lendemain, ou qui a déjà
   vu la chute) l'impact est de l'HISTOIRE, donc il est là. Pendant la chute, il
   n'existe qu'après `STAR_FALL_IMPACT_MS`.
   ⚠️ `sceneKey` peut être `null` (aucune scène) : c'est le cas NORMAL, et il
   rend `true`. Écrire l'inverse aurait fait disparaître le cratère les
   999 fois sur 1000 où il n'y a pas de cinématique. */
export function starImpactLanded(sceneKey, elapsedMs) {
  if (sceneKey !== "fall") return true;
  return (+elapsedMs || 0) >= STAR_FALL_IMPACT_MS;
}

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 448 — L'AZIMUT DE LA CHUTE, ET IL SE DÉRIVE DU DÉCOR QU'ELLE LAISSE.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ REMARQUE DE GUILLAUME, MOT POUR MOT : « si l'animation montre un
   déplacement de la comète d'ouest en est, l'impact ne peut pas être à l'ouest.
   Donc adapter l'animation à l'emplacement de l'impact. » Le 445 faisait
   exactement cette faute : la comète partait TOUJOURS de `x = -60`, c'est-à-dire
   du bord OUEST de l'écran, et visait un point d'impact qui pouvait se trouver
   n'importe où — y compris à sa gauche. On voyait alors une comète reculer.
   ⚠️ LA PARADE N'EST PAS UN CAS PARTICULIER, C'EST UN CHANGEMENT DE SENS DE
   LECTURE : le point d'entrée se DÉDUIT de l'impact (`impact − direction × L`),
   jamais l'inverse. L'entrée est donc toujours hors champ, toujours en amont, et
   il n'existe plus de position de joueur « qui pose problème ».
   ⚠️⚠️ ET LE SENS EST-OUEST N'EST PAS UN GOÛT : LE SILLON LE DICTE. Son sprite
   (`starFurrowSprite`) est plus PROFOND à l'ouest, c'est-à-dire que la course
   s'y arrête ; un objet qui laboure creuse de plus en plus jusqu'à se poser.
   Une comète venue de l'ouest aurait laissé un sillon qui se creuse en partant.
   Les deux modèles de Guillaume (`refs/Gemini_Generated_Image_fgcq7y*.jpg` et
   `…hayq7g*.jpg`) montrent la même chose : elle arrive du HAUT-DROITE.
   ⚠️⚠️ LA PLONGÉE, ELLE, DÉPEND DU TROU — et c'est la seule chose qui change
   d'une carte à l'autre. Un trou ROND se creuse à la verticale, une balafre de
   six cases se laboure en rasant. Deux décors, deux angles, une seule formule :
   le dessin au sol et la trajectoire disent la même chose, ce qui est la seule
   fois où l'on a le droit de les confondre (leçon du 447 sur le garde-corps). */
export const STAR_FALL_DIVE = { town: 46, farm: 19 };   // degrés sous l'horizontale, à l'ÉCRAN
export function starFallDive(zone) {
  const d = STAR_FALL_DIVE[zone || "farm"];
  return (d === undefined ? STAR_FALL_DIVE.farm : d) * Math.PI / 180;
}
/* La direction de la COURSE en espace écran (x vers l'est, y vers le bas), prête
   pour `atan2`. Elle descend et va vers l'OUEST : l'angle est donc toujours dans
   le second quadrant, ce que le banc vérifie plutôt que de recopier un nombre. */
export function starFallAngle(zone) {
  const d = starFallDive(zone);
  return Math.atan2(Math.sin(d), -Math.cos(d));
}

/* ⚠️⚠️ CE QUE LE CHEVRON DÉSIGNE — UNE JOINTURE, JAMAIS UNE SECONDE LISTE.
   C'est le défaut n°1 du 444 pris à la racine (« une porte sans chemin de code
   ment ») : le pisteur affichait une PHRASE tirée du chapitre, et rien au monde
   ne garantissait qu'elle parlait du même endroit que celui vers lequel on
   aurait pointé. Le 449 a fait converger les deux lectures ; le 454 les réduit à
   UNE SEULE — voir le bloc qui suit, qui explique pourquoi la convergence ne
   suffisait plus. */
/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 454 — LE CHEVRON SE DÉRIVE DU BANDEAU, ET PLUS L'INVERSE.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ LE 449 AVAIT FAIT CONVERGER DEUX LISTES ; CE ZIP LES RÉDUIT À UNE. Tant que
   les deux étapes de la quête étaient des LIEUX de la table, « le premier manquant
   qui a une position » et « le premier manquant » tombaient toujours d'accord — et
   `verify-quete` le vérifiait à chaque pas. Le zip 454 ajoute deux objectifs qui
   ne sont PAS des lieux de la table (la mairie, l'atelier du bûcheron) : la
   coïncidence heureuse s'arrête là, et le banc l'a dit à la première exécution.
   ⚠️ On ne rattrape donc pas le cas, on supprime la cause : le chevron LIT
   l'objectif, le traduit par une table de deux lignes, et rend `null` quand il n'a
   rien à montrer. Il ne peut plus désigner autre chose que ce que la phrase dit,
   quel que soit le nombre d'étapes qu'on ajoutera ensuite.
   ⚠️ `townHall` ET `sawmill` NE SONT PAS DES LIEUX DE `STAR_SITES`, et il ne faut
   surtout pas les y mettre : un lieu de la table est une chose qu'on TROUVE et qui
   coche une case. Ceux-ci sont des adresses. `FermeGame` sait où ils sont ; ce
   fichier sait seulement qu'on y va. */
export const STAR_GOAL_TARGET = { craterHot: "crater", engineer: "townHall", timber: "sawmill" };
export const STAR_OFF_TABLE_TARGETS = ["townHall", "sawmill"];
export function starTargetSite(e, ctx) {
  const goal = starGoalKey(e, ctx);
  if (!goal) return null;
  if (goal === "farmImpacts") {
    const id = starMissing(e).find(k => STAR_SITE[k] && STAR_SITE[k].spot === "starFarmImpact");
    return id || null;
  }
  const id = STAR_GOAL_TARGET[goal] || goal;
  if (STAR_OFF_TABLE_TARGETS.includes(id)) return id;
  const s = STAR_SITE[id];
  /* ⚠️ `spot: "*lean"` NE REND RIEN, ET C'EST JUSTE : l'écoute des ombres se fait
     n'importe où en ville. Un chevron qui pointerait quelque part pendant qu'on
     demande au joueur d'aller AILLEURS écouter serait un mensonge poli. */
  return (s && s.spot && s.spot[0] !== "*") ? id : null;
}

/* ⚠️⚠️ ELLE SE CACHE QUAND QUELQU'UN APPROCHE, ET C'EST LE THÈME RENDU VISIBLE
   (§3 de QUETE.md) : personne d'autre ne voit l'étoile. Le rayon est en cases,
   la durée dit combien de temps elle reste dans le col après le passage — sans
   ce délai, elle clignoterait à chaque pas d'un résident qui longe la place. */
export const STAR_HIDE_R = 4.5;
export const STAR_HIDE_MS = 2200;

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 449 — LE FAMILIER QUI MÈNE. « pas tous les pets, seul un prendra le
   ║ lead » (Guillaume), « à la demande, et automatique si ça traîne ».
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ POURQUOI UN ANIMAL ET PAS UN PNJ, ET CE N'EST PAS UN GOÛT : le thème de
   cette quête est le SECRET (§3 de QUETE.md, et `fall.quiet` l'écrit noir sur
   blanc — « personne ne sort regarder, personne n'en dit un mot »). Un habitant
   qui renseignerait le joueur sur l'impact démolirait la meilleure page du
   chantier pour rendre un service que n'importe quel chien rend mieux. **Un
   familier montre sans parler** : il guide, il ne raconte pas, et le silence de
   la vallée reste entier.
   ⚠️⚠️ ET IL NE COÛTE RIEN AU RÉSEAU, pour la même raison que la compagne : sa
   position est DÉRIVÉE chez chaque client (`drawPetsFor` la lisse déjà). Le seul
   état neuf est LOCAL — « est-ce que je demande de l'aide, là, maintenant » — et
   il n'a aucune raison de traverser : c'est le confort d'UN joueur, pas un fait
   du monde. §3 de CLAUDE.md, dans sa forme la moins chère.
   ⚠️ UN SEUL MÈNE. Le choix est l'INDICE 0, c'est-à-dire déterministe et stable :
   un « le plus proche » changerait de meneur à chaque pas, et un tirage donnerait
   deux meneurs différents sur deux écrans (le familier des autres joueurs est
   dessiné par tout le monde depuis le 247). Les autres continuent de suivre —
   c'est ce qui rend le meneur LISIBLE : il se détache du peloton. */
export const STAR_GUIDE_AHEAD = 2.8;        // cases d'avance sur le joueur, le long du chemin
export const STAR_GUIDE_LEASH = 5.0;        // au-delà, il s'arrête et attend : un guide qu'on perd de vue ne guide pas
export const STAR_GUIDE_ARRIVE = 3.0;       // assez près du but : il a fini, il revient au pied
/* ⚠️⚠️ IL S'ARRÊTE DE LUI-MÊME, ET C'EST LA MOITIÉ DE LA MÉCANIQUE. Un guide qui
   mène jusqu'au bout fait le jeu à la place du joueur ; celui-ci s'arrête à trois
   cases et laisse la dernière trouvaille à celui qui la cherche. C'est la
   différence entre « on m'a aidé » et « on a joué pour moi ». */
export const STAR_GUIDE_STUCK_MS = 150000;  // 2 min 30 sur le MÊME objectif : il part tout seul, une fois
/* ⚠️ « UNE FOIS », ET LE MOT COMPTE : le départ spontané ne se rejoue pas tant
   que l'objectif n'a pas changé. Une aide qui revient toutes les deux minutes
   n'est plus une aide, c'est une notification — le reproche exact fait au rappel
   de reprise (« une fois par session, jamais deux »). */
export function starGuideAuto(sameGoalMs, alreadyOffered) {
  return !alreadyOffered && (+sameGoalMs || 0) >= STAR_GUIDE_STUCK_MS;
}

/* ⚠️⚠️ LE POINT OÙ SE PLACE LE MENEUR — PURE, DONC MESURABLE, ET PARTAGÉE PAR LES
   DEUX CARTES. La ferme cherche avec `findPavedPath`, la ville avec
   `townFindPath` ; les deux rendent une liste de `{x, y}`, et c'est tout ce que
   cette fonction demande. Une seconde écriture « spéciale ville » aurait divergé
   au premier réglage, et le symptôme aurait été le §3 du piège n°1 : « il me
   guide à la ferme et pas en ville ».
   ⚠️ ELLE REPART DE LA PROJECTION DU JOUEUR SUR LE CHEMIN, JAMAIS DU DÉBUT.
   Sans ça, un joueur qui coupe par la traverse verrait son chien revenir au point
   de départ pour refaire le trajet — c'est-à-dire lui tourner le dos.
   ⚠️⚠️ ET « PROJECTION », PAS « NŒUD LE PLUS PROCHE » : LE BANC A TRANCHÉ. Le
   premier jet repartait du nœud le plus proche, ce qui est l'écriture qu'on pose
   naturellement et qui a l'air juste. Elle ne l'est pas : un joueur à mi-case
   entre deux nœuds a son plus proche DERRIÈRE lui, l'avance est alors dépensée à
   revenir dessus, et pour une petite avance **le meneur se retrouve dans le dos
   du joueur**. Vingt cas sur cent-soixante-quatre, tous invisibles à la
   relecture. ⚠️ Ce n'est pas le contrôle « est-ce que ça marche » qui l'a vu,
   c'est l'INVARIANT (« le meneur n'est jamais plus loin du but que le joueur »),
   balayé sur toutes les positions et toutes les avances — la différence entre un
   banc qui mesure un cas et un banc qui mesure une propriété.
   ⚠️ ELLE INTERPOLE plutôt que de sauter de case en case : un guide qui se
   téléporte de tuile en tuile a l'air d'un curseur, pas d'un animal.
   Rend `null` si le chemin est vide — cas NORMAL (cible dans une autre zone,
   recherche trop longue), et l'appelant retombe alors sur le suivi ordinaire. */
export function starGuidePoint(path, px, py, ahead) {
  if (!path || !path.length) return null;
  let left = ahead === undefined ? STAR_GUIDE_AHEAD : +ahead;
  if (path.length === 1) return { x: path[0].x, y: path[0].y, end: true };
  /* 1. La projection : le point du CHEMIN (segment compris, pas seulement les
     nœuds) le plus proche du joueur, et l'indice du segment qui le porte. */
  let bi = 0, bd = Infinity, bx = path[0].x, by = path[0].y;
  for (let i = 0; i < path.length - 1; i++) {
    const ax = path[i].x, ay = path[i].y, vx = path[i + 1].x - ax, vy = path[i + 1].y - ay;
    const len2 = vx * vx + vy * vy;
    const t = len2 > 1e-9 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len2)) : 0;
    const qx = ax + vx * t, qy = ay + vy * t;
    const d = Math.hypot(qx - px, qy - py);
    if (d < bd) { bd = d; bi = i; bx = qx; by = qy; }
  }
  /* 2. On avance le long du chemin À PARTIR de cette projection. Le trajet ne
     peut donc que progresser vers le but, quelle que soit la position du joueur. */
  let cx = bx, cy = by;
  for (let i = bi + 1; i < path.length; i++) {
    const nx = path[i].x, ny = path[i].y;
    const seg = Math.hypot(nx - cx, ny - cy);
    if (seg >= left && seg > 1e-6) {
      const k = left / seg;
      return { x: cx + (nx - cx) * k, y: cy + (ny - cy) * k, end: false };
    }
    left -= seg; cx = nx; cy = ny;
  }
  return { x: cx, y: cy, end: true };   // le chemin est plus court que l'avance : il attend au bout
}

/* ───────────────────────────────────────────────────────────────────────────
   4. LA GÉOMÉTRIE — DÉRIVÉE, JAMAIS ÉCRITE.

   ⚠️⚠️ AUCUN LIEU DE CETTE QUÊTE NE PORTE DE COORDONNÉES EN DUR, ET C'EST LA
   LEÇON LA PLUS CHÈREMENT PAYÉE DU DÉPÔT (§8 de `CLAUDE.md`, et le 442 l'a
   repayée) : une position réglée à la main est une position qui penchera. Le
   parc a reculé de huit cases au 437, le bois a été creusé au 440 ; le jour où
   le champ de foire bouge, le cratère doit bouger avec lui **sans que personne
   ne retouche quoi que ce soit**.
   ⚠️ Aucun TIRAGE non plus : `generateTownWorld` partage UN générateur, y puiser
   déplacerait tout le mobilier posé après (leçon du 435 sur l'étang). Les
   recherches ci-dessous sont des balayages déterministes.
   ─────────────────────────────────────────────────────────────────────────── */

/* ⚠️⚠️ LES ANCRES ELLES-MÊMES SONT DANS `fermeConstants.js` (`STAR_CRATER_X`,
   `STAR_FURROW_X`, `STAR_PIER_X`, `STAR_GLASS_ANCHOR_X`…), ET C'EST DÉLIBÉRÉ.
   Le 442 les gardait dans `enquete.js`, ce qui obligeait `fermeEngine.js` à
   importer l'enquête pour poser ses bornes. Ça marchait — pas de cycle — mais
   c'était une arête de plus entre le moteur et une histoire, et il a fallu la
   couper aujourd'hui. Dans `fermeConstants`, que TOUT LE MONDE importe déjà,
   il n'y a **aucune arête nouvelle et une seule description de chaque
   position** : le générateur pose, le jeu lit, les trois bancs mesurent, et
   personne ne recopie (§8 de `CLAUDE.md`).

   Ce qui reste ici est ce qui est propre à la QUÊTE et non à la carte : les
   règles, les rayons de jeu, et le balayage que le banc doit pouvoir rejouer. */

/* Le balayage en spirale, partagé par tous les placements. ⚠️ IL EST ICI ET PAS
   DANS `FermeGame` : le banc doit pouvoir poser les mêmes pierres que le jeu,
   sinon il mesure un autre monde (le défaut de `render-parc` et son champ de bois
   réinventé, §1 du 440). */
export function starSpiralFree(cx, cy, isFree, maxR) {
  const R = maxR | 0 || 24;
  if (isFree(cx, cy)) return { x: cx, y: cy };
  for (let r = 1; r <= R; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;   // le seul anneau r
        const x = cx + dx, y = cy + dy;
        if (isFree(x, y)) return { x, y };
      }
    }
  }
  return null;
}

/* ⚠️⚠️ « TOURNER LE DOS » EST UNE FONCTION PURE, ET ELLE EST ICI POUR QUE LE JEU
   ET LE BANC LA PARTAGENT. Deux écritures de la même règle donneraient
   l'ambiguïté la plus détestable qui soit : « chez moi elle sort, chez toi
   non ». `dir` : 0 = sud, 1 = nord, 2 = ouest, 3 = est. */
const DIR_VEC = [[0, 1], [0, -1], [-1, 0], [1, 0]];
export function starFacingAway(px, py, dir, tx, ty) {
  const v = DIR_VEC[dir | 0] || DIR_VEC[0];
  const dx = tx - px, dy = ty - py;
  const len = Math.hypot(dx, dy);
  if (len < 0.001) return false;              // debout SUR elle : on la regarde forcément
  return (v[0] * dx + v[1] * dy) / len <= STAR_CALM_FACE_DOT;
}

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 456 — « ÇA DIT STAND STILL ET ON NE COMPREND PAS SI ON FAIT BIEN. »
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️⚠️ DEMANDE DE GUILLAUME, ET C'EST LE DÉFAUT LE PLUS CHER DU CHANTIER :
   « quand on récupère l'étoile dans le cratère seul c'est compliqué de
   comprendre ce qu'il se passe quand on ne connaît pas l'histoire. » Le geste
   du cratère est le SEUL geste continu du jeu — pas de touche, une posture — et
   il ne rendait RIEN : ni ce qui manquait (tu bouges ? tu la regardes ?), ni ce
   qui avançait. Neuf secondes de dos tourné, sans un pixel qui bouge, ça ne se
   distingue pas d'un jeu cassé.
   ⚠️⚠️ ET LE PIRE ÉTAIT MESURABLE : les deux phrases qui expliquaient la scène
   (`s2.tooHot`, `s2.peek`) passaient par `starSay`, c'est-à-dire par la bulle de
   l'ÉTOILE — or `starCompanionAt` rend `null` tant que l'étoile n'est pas sortie
   du trou. Elles étaient écrites, traduites, comptées par le banc des lecteurs
   (`starSay` compte comme une lecture) et **affichées nulle part**, très
   exactement au seul endroit du jeu où elles servaient. C'est la leçon du 453
   dans sa forme la plus retorse : *un lecteur qui ne s'exécute jamais vaut zéro
   lecteur*, et un banc qui compte les lectures ne peut pas le voir.
   ⚠️⚠️ CE QUI SUIT EST UNE SEULE RÉPONSE À « OÙ EN SUIS-JE », et c'est la règle
   du 449 : le texte d'aide, la jauge et la posture qui compte doivent sortir de
   la MÊME fonction, sinon on obtient deux réponses vertes qui se contredisent
   (« ne bouge plus » affiché pendant que la tenue monte). Une jointure, jamais
   deux listes. */
export const STAR_CALM_STEPS = ["away", "far", "moving", "watching", "holding"];
export function starCalmStep(px, py, dir, moving, cx, cy, ringPad, radius) {
  const R = radius === undefined ? STAR_CRATER_R : radius;
  const d = Math.hypot(px - cx, py - cy);
  if (d > R + (ringPad === undefined ? 1 : ringPad)) return "away";
  if (d > R) return "far";        // au bord : il faut DESCENDRE dedans
  if (moving) return "moving";
  if (!starFacingAway(px, py, dir | 0, cx, cy)) return "watching";
  return "holding";
}
/* ⚠️ LE BESOIN EST DÉRIVÉ DU NOMBRE DE JOUEURS, PAS RECOPIÉ : la jauge et
   `resolveStarCalm` liraient sinon deux durées différentes, et la barre serait
   pleine avant (ou après) que l'étoile sorte. C'est le §14 de `CLAUDE.md` — un
   paramètre qui double un autre paramètre est une divergence en attente. */
export function starCalmNeed(soloAllowed) { return soloAllowed ? STAR_CALM_SOLO_MS : STAR_CALM_MS; }

/* ───────────────────────────────────────────────────────────────────────────
   5. L'ÉTAT PARTAGÉ ET SES RÈGLES PURES.
   ─────────────────────────────────────────────────────────────────────────── */
export function newStar() {
  return {
    ch: 0,          // chapitre courant
    found: {},      // id de lieu -> { by, at } — idempotent par construction
    /* ⚠️ ZIP 455 — L'ANNONCE ET LA CHUTE SONT DEUX INSTANTS, ET IL EN FAUT
       BIEN DEUX : entre les deux vit tout le tampon (les PNJ nerveux, les
       indices, l'affiche). Un booléen « annoncée » n'aurait pas suffi — c'est de
       la DATE que se déduisent la nuit qui suit et la phase des tics. */
    warn: { at: 0, by: "" },
    fall: 0,        // horodatage HÔTE de la chute (0 = elle n'est pas encore tombée)
    calm: {},       // id de joueur -> horodatage HÔTE du dernier « dos tourné »
    lean: {},       // id de joueur -> { x, y, at } — la dernière lecture d'ombres
    marks: [],      // les lieux révélés par les croisements
    duet: 0,        // phrases du duo réussies
    /* ⚠️ ZIP 454 — DEUX CHAMPS DE PLUS, ET PAS UN DE TROP. `plan` porte UNE date
       (la commande à la mairie) et le drapeau que l'hôte lève quand l'ingénieur
       rend son travail : arrivée et échéance s'en déduisent. `wood` porte les cinq
       commandes du bûcheron, indexées par les clés du NAVIRE — jamais par un
       numéro d'étape, qui aurait été une seconde liste. */
    plan: { at: 0, by: "", done: 0 },
    wood: {},       // clé de morceau -> { at, readyAt, done, by }
    gift: {},       // id de joueur -> { at, kind } — le crochet cosmétique (§8)
    seen: {},       // scènes déjà jouées : cartes de chapitre, « previously »
    doneAt: 0,
  };
}
/* ⚠️ LA REPRISE EST TOLÉRANTE, PAS CONFIANTE. Une sauvegarde d'avant ce zip n'a
   pas le champ (quête neuve, bon comportement) ; une sauvegarde ABÎMÉE ne doit
   pas faire planter le chargement d'une ferme entière pour une histoire
   secondaire. On reconstruit chaque sous-objet plutôt que de faire confiance à
   sa forme — la leçon de `migrateStation`, reprise de `migrateEnquete`.
   ⚠️ Une sauvegarde du 442 (`shared.enquete`) n'est pas migrée vers celle-ci :
   ce sont deux histoires différentes, pas deux versions de la même. Le champ
   `enquete` est simplement ignoré et disparaît à la première écriture. */
export function migrateStar(saved) {
  const e = newStar();
  if (!saved || typeof saved !== "object") return e;
  e.ch = Math.max(0, Math.min(STAR_CH_DONE, saved.ch | 0));
  if (saved.found && typeof saved.found === "object") {
    for (const id of Object.keys(saved.found)) {
      if (!STAR_SITE[id]) continue;                 // un lieu inconnu = une version d'après : on l'ignore
      const v = saved.found[id] || {};
      e.found[id] = { by: String(v.by || "?").slice(0, 24), at: +v.at || 0 };
    }
  }
  /* 461 — compatibilité avec l'ancien chapitre du sillon. La trouvaille qui
     servait de coque devient la plaque météorique. Une partie déjà passée au
     chapitre suivant a, par définition, terminé l'ancien chapitre 1 : on coche
     donc les cinq impacts pour ne pas la renvoyer fouiller un passé réécrit. */
  const oldFurrow = saved.found && saved.found.furrow;
  if (oldFurrow && !e.found.farmMaterial) {
    e.found.farmMaterial = { by: String(oldFurrow.by || "?").slice(0, 24), at: +oldFurrow.at || 0 };
  }
  if ((saved.ch | 0) > 0) {
    const legacy = oldFurrow || { by: "?", at: +saved.fall || 0 };
    for (const site of STAR_FARM_IMPACTS) if (!e.found[site.id]) {
      e.found[site.id] = { by: String(legacy.by || "?").slice(0, 24), at: +legacy.at || 0 };
    }
  }
  e.fall = +saved.fall || 0;
  /* ── ZIP 455 : l'annonce. ⚠️ UNE SAUVEGARDE D'AVANT CE ZIP N'A PAS LE CHAMP ET
     PEUT AVOIR `fall` — c'est une partie commencée sous l'ancienne règle, et elle
     doit continuer de tourner. On considère donc qu'une chute déjà tombée VAUT
     annonce : sans ça, `starWarning` serait faux, `starFallDue` refuserait, et
     rien ne casserait bruyamment — le pire des deux mondes. */
  if (saved.warn && typeof saved.warn === "object")
    e.warn = { at: +saved.warn.at || 0, by: String(saved.warn.by || "").slice(0, 24) };
  if (!e.warn.at && e.fall) e.warn = { at: e.fall, by: "" };
  if (saved.calm && typeof saved.calm === "object")
    for (const k of Object.keys(saved.calm)) e.calm[String(k).slice(0, 40)] = +saved.calm[k] || 0;
  if (saved.lean && typeof saved.lean === "object") {
    for (const k of Object.keys(saved.lean)) {
      const v = saved.lean[k] || {};
      e.lean[String(k).slice(0, 40)] = { x: +v.x || 0, y: +v.y || 0, at: +v.at || 0 };
    }
  }
  if (Array.isArray(saved.marks))
    e.marks = saved.marks.filter(m => STAR_LEAN_MARKS.includes(m));
  e.duet = Math.max(0, Math.min(STAR_DUET_PHRASES, saved.duet | 0));
  if (saved.gift && typeof saved.gift === "object") {
    for (const k of Object.keys(saved.gift)) {
      const v = saved.gift[k] || {};
      e.gift[String(k).slice(0, 40)] = { at: +v.at || 0, kind: String(v.kind || "starlight").slice(0, 24) };
    }
  }
  if (saved.seen && typeof saved.seen === "object")
    for (const k of Object.keys(saved.seen)) if (saved.seen[k]) e.seen[String(k).slice(0, 32)] = true;
  e.doneAt = +saved.doneAt || 0;
  /* ── ZIP 454 : les plans et le bois. */
  if (saved.plan && typeof saved.plan === "object") {
    e.plan = { at: +saved.plan.at || 0, by: String(saved.plan.by || "").slice(0, 24), done: +saved.plan.done || 0 };
  }
  if (saved.wood && typeof saved.wood === "object") {
    for (const k of Object.keys(saved.wood)) {
      if (!STAR_SHIP_KEYS.includes(k)) continue;      // une clé inconnue = une version d'après : on l'ignore
      const v = saved.wood[k] || {};
      e.wood[k] = { at: +v.at || 0, readyAt: +v.readyAt || 0, done: !!v.done, by: String(v.by || "?").slice(0, 24) };
    }
  }
  /* ⚠️⚠️ UNE PARTIE FINIE AVANT CE ZIP A UN BATEAU CONSTRUIT, ET IL DOIT LE
     RESTER. Sans cette ligne, `starShipParts` (qui exige désormais le bois) ferait
     DISPARAÎTRE de la grève un navire achevé il y a trois semaines : la nouvelle
     règle réécrirait le passé. On accorde donc les cinq pièces aux sauvegardes qui
     portent `doneAt` — c'est la seule migration de ce zip, et elle ne touche qu'à
     des parties qui n'ont plus rien à jouer.
     ⚠️ Une partie EN COURS, elle, n'est pas rattrapée : la chaîne du bûcheron
     commence là où elle en est, ce qui est le comportement voulu (on ne construit
     pas un bateau rétroactivement). */
  if (e.doneAt) {
    e.plan.at = e.plan.at || e.doneAt; e.plan.done = e.plan.done || e.doneAt;
    for (const k of STAR_SHIP_KEYS)
      if (!e.wood[k]) e.wood[k] = { at: e.doneAt, readyAt: e.doneAt, done: true, by: "?" };
  }
  return e;
}

export function starFallen(e) { return !!(e && e.fall); }
export function starStarted(e) { return !!(e && (e.ch > 0 || Object.keys(e.found || {}).length)); }
export function starDone(e) { return !!(e && e.doneAt); }
export function starHas(e, id) { return !!(e && e.found && e.found[id]); }
/* ⚠️ ZIP 453 — `starShards` A ÉTÉ SUPPRIMÉE. Le seul compte de la quête est
   `starShipBuilt` (voir la note de `STAR_SITES`) : un objet, une façon de le
   compter. Tout ce qui affichait « n sur 4 » lit maintenant « n sur
   STAR_SHIP_TOTAL », c'est-à-dire exactement ce que le navire montre. */
/* Ce qui manque au chapitre courant, dans l'ordre de la table — c'est ce que le
   pisteur affiche, et c'est ce qui fait qu'on sait toujours quoi chercher. */
export function starMissing(e) {
  const ch = STAR_CHAPTERS[Math.min(e ? e.ch | 0 : 0, STAR_CH_DONE - 1)];
  if (!ch) return [];
  return ch.need.filter(id => !starHas(e, id));
}
export function starChapterKey(e) {
  return (STAR_CHAPTERS[Math.min(e ? e.ch | 0 : 0, STAR_CH_DONE - 1)] || {}).key || "field";
}

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 449 — L'OBJECTIF COURANT. LE BANDEAU DISAIT LE CHAPITRE ; IL DOIT DIRE
   ║ CE QU'ON CHERCHE MAINTENANT. (demande de Guillaume : « le séquençage par
   ║ chapitres est excellent, genre GTA […] mais il faut que tout ça s'actualise
   ║ quand on avance. »)
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ LE DÉFAUT ÉTAIT MESURABLE ET PERSONNE NE LE MESURAIT : le pisteur lisait
   `hud.goal[starChapterKey(e)]`, **une phrase par CHAPITRE**. Or deux chapitres
   sur cinq contiennent plusieurs objectifs — le 2 en a trois (le cratère, puis
   deux croisements d'ombres), le 4 en a deux. On pouvait donc sortir l'étoile du
   trou, croiser les ombres une fois, et lire encore « Find where the rest of it
   fell. » ⚠️ **C'est un bandeau qui MENT pendant la moitié de la quête**, et
   c'est le pire endroit du jeu pour mentir : c'est le seul texte qu'un joueur
   perdu relit.
   ⚠️⚠️ ET IL POUVAIT CONTREDIRE LE CHEVRON, QUI EST L'AUTRE MOITIÉ DE LA MÊME
   RÉPONSE. Le chevron dérive de `starTargetSite` (le premier lieu manquant qui a
   une vraie position), le bandeau dérivait du chapitre : deux sources pour la
   question « où vais-je ». C'est la forme exacte de « une porte sans chemin de
   code ment » (444) — les deux avaient l'air justes, et rien ne garantissait
   qu'ils parlaient du même endroit. **Ils lisent maintenant la même liste.**

   ⚠️ TROIS CLÉS NE SONT PAS DES LIEUX, ET C'EST VOULU :
     • `craterHot` — le trou fume encore. C'est un état de TEMPS, pas de place, et
       c'est la seule chose que le joueur peut faire (attendre) ; un bandeau qui
       dirait « descends dans le cratère » pendant qu'on brûle en y descendant
       (`starCraterBurns`) serait « le jeu propose et refuse » du 426, payé ici en
       dix minutes de repos forcé ;
     • `lean` / `leanAgain` — l'écoute des ombres n'a **délibérément** aucune
       position (`spot: "*lean"`), donc pas de chevron. C'est précisément le
       moment où le joueur n'a plus RIEN, et c'est donc le moment où le bandeau
       doit porter toute la consigne. Les distinguer laisse dire « une de faite,
       une à faire » plutôt que de répéter la même phrase.
   ⚠️ ELLE REND `null` QUAND IL N'Y A RIEN À DIRE (pas tombée, ou finie), jamais
   une clé de repli : le repli poli du 444 n'échoue pas, il AFFICHE la clé. */
export function starGoalKey(e, ctx) {
  if (!e || !starFallen(e) || starDone(e)) return null;
  const missing = starMissing(e);
  const first = missing[0];
  /* ⚠️⚠️ ZIP 454 — LES DEUX NOUVELLES ÉTAPES PASSENT DEVANT, ET SEULEMENT QUAND
     ELLES SONT ACTIONNABLES. C'est le sens de « le rôle des étoiles est de nous
     guider dans le projet » : le bandeau est la voix de l'étoile.
     · `engineer` — l'étoile vient de sortir du trou et elle conseille la mairie.
       C'est la seule chose à faire à cet instant, elle passe donc avant le reste ;
     · `timber` — tout est trouvé, il ne manque que du bois. Sans cette clé, le
       bandeau n'aurait plus rien à dire pendant toute la fin de la construction.
     ⚠️⚠️ ET L'ATTENTE DE L'INGÉNIEUR N'EST **PAS** UN OBJECTIF, exprès : pendant
     ses quinze minutes il y a les deux croisements d'ombres à faire. Un bandeau qui
     dirait « attends » pendant qu'on peut jouer transformerait du rythme en temps
     mort — c'est le défaut du 426 par l'autre bout (le jeu propose de ne rien
     faire). Il ne le dit QUE s'il ne reste vraiment rien d'autre. */
  if (starHas(e, "crater") && !starPlanAsked(e)) return "engineer";
  if (!first) {
    if (!starPlanReady(e)) return "engineerWait";
    return starTimberNext(e) ? "timber" : null;
  }
  if (STAR_FARM_STAR_IDS.includes(first) || (STAR_SITE[first] && STAR_SITE[first].spot === "starFarmImpact"))
    return "farmImpacts";
  /* ⚠️ L'ORDRE DE LA TABLE FAIT FOI, comme pour `starTargetSite` : le premier qui
     manque est celui qu'on cherche. Aucune liste parallèle. */
  if (first === "crater" && ctx && ctx.craterHot) return "craterHot";
  if (first === "leanLake") return "lean";
  if (first === "leanGlass") return "leanAgain";
  return first;
}
/* Toutes les clés que `starGoalKey` peut rendre — DÉRIVÉES de la table, pour que
   le banc vérifie qu'aucune n'est orpheline de texte. ⚠️ C'est le contrôle qui
   manquait aux libellés de téléport (444) : une clé sans phrase ne plante pas,
   elle affiche `undefined` dans le bandeau. */
export const STAR_GOAL_KEYS = (() => {
  const out = [];
  for (const s of STAR_SITES) {
    if (s.spot === "starFarmImpact") { if (!out.includes("farmImpacts")) out.push("farmImpacts"); continue; }
    if (s.id === "leanLake") { out.push("lean"); continue; }
    if (s.id === "leanGlass") { out.push("leanAgain"); continue; }
    out.push(s.id);
    if (s.id === "crater") out.push("craterHot", "engineer");
  }
  /* ⚠️ ZIP 454 — les deux clés de la construction. Elles ne sont pas dérivées de
     `STAR_SITES` parce qu'elles ne sont pas des LIEUX : l'une désigne une attente,
     l'autre un atelier de ferme. Elles sont ici pour que le banc vérifie qu'elles
     ont un texte — c'est tout ce que cette liste sert à faire. */
  out.push("engineerWait", "timber");
  return out;
})();

/* ⚠️⚠️ LA BASCULE EST UNE BOUCLE, PAS UN `if` — reprise telle quelle du 442, où
   elle avait été écrite pour le désordre et où elle a servi. Un joueur peut
   fermer DEUX chapitres avec une seule trouvaille : celle qui manquait au 4
   alors que le 3 était complet depuis dix minutes. Écrite en simple test, la
   fonction avancerait d'un cran par découverte, et le pisteur réclamerait un
   objet déjà trouvé sans que rien ne le signale.
   ⚠️ Elle s'arrête AVANT le chapitre `final` : la fin ne se déclenche pas par
   accumulation, elle se joue. Rend la liste des chapitres FRANCHIS pour que
   l'hôte joue la carte de chacun, une fois. */
export function starAdvance(e) {
  const crossed = [];
  let guard = 0;
  while (e.ch < STAR_CH_DONE && guard++ < STAR_CH_DONE + 2) {
    const ch = STAR_CHAPTERS[e.ch];
    if (!ch.need.every(id => starHas(e, id))) break;
    if (ch.final) break;
    crossed.push(ch);
    e.ch++;
  }
  return crossed;
}

/* ───────────────────────────────────────────────────────────────────────────
   6. LES RÉSOLVEURS — le côté HÔTE, purs, sans réseau ni React.

   ⚠️⚠️ AUCUN N'APPLIQUE QUOI QUE CE SOIT LUI-MÊME : ils rendent
   `{ ok, crossed, ... }`, et c'est `FermeGame` qui diffuse. Le double crédit du
   431 (trois résolveurs qui payaient eux-mêmes, trois qui rendaient un delta) a
   coûté un contrôle de banc dédié — on ne recommence pas. Ici, la question ne se
   pose même plus : **rien dans ce fichier ne peut créditer une pièce**, et le
   banc le vérifie par un scan de source.
   ─────────────────────────────────────────────────────────────────────────── */

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 455 — L'ANNONCE. C'EST L'HÔTE QUI DIT OUI, ET UNE SEULE FOIS.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ IL PORTE LA MÊME PORTE QUE LA CHUTE (`starFallGate`) ET LE MÊME JOUR
   MINIMUM, et ce n'est pas de la ceinture-bretelles : l'invite ne doit s'afficher
   QUE quand la quête est réellement déblocable (« ne s'affichant que lorsque la
   quête est débloquée par les conditions de ferme déjà discutées »). Une invite
   qui s'ouvre puis un résolveur qui refuse, c'est « le jeu propose et refuse »
   (426) — le défaut le plus désagréable du dépôt, et le seul que ce projet ait
   payé quatre fois.
   ⚠️ IL EST IDEMPOTENT : deux clics sur « Oui » (ou deux hôtes qui se succèdent)
   ne redatent pas le tampon, donc ne repoussent pas la nuit.
   ⚠️ ET IL N'ENCAISSE RIEN, comme les dix autres : il écrit une date et rend
   `{ ok, scene }`. C'est `FermeGame` qui diffuse — la règle du 431 sur le double
   crédit, tenue depuis. */
export function resolveStarWarn(e, who, day, now, ctx) {
  if (e.warn && e.warn.at) return { ok: false, already: true };
  if (e.fall) return { ok: false, already: true };
  if ((day | 0) < STAR_FALL_MIN_DAY) return { ok: false, tooEarly: true };
  const gate = starFallGate(ctx);
  if (!gate.ok) return { ok: false, gated: true, ...gate };
  e.warn = { at: +now || 0, by: String(who || "?").slice(0, 24) };
  return { ok: true, scene: "warn" };
}
/* L'INVITE EST-ELLE À PROPOSER ? ⚠️ ELLE EST ICI PLUTÔT QUE DANS LE COMPOSANT
   POUR LA RAISON DE TOUT CE FICHIER : c'est elle qui décide si un joueur voit un
   panneau annoncer une histoire secrète, et c'est donc elle qu'un banc doit
   pouvoir balayer. Elle ne dit RIEN du « plus tard » — le refus est un confort
   d'interface pour UN joueur, il ne traverse pas et il n'a rien à faire ici. */
export function starWarnOffer(e, day, ctx) {
  if (!e || e.fall || starWarned(e)) return false;
  if ((day | 0) < STAR_FALL_MIN_DAY) return false;
  return starFallGate(ctx).ok;
}

/* La chute. ⚠️ ELLE EST DATÉE PAR L'HÔTE ET DIFFUSÉE UNE FOIS. Chaque client
   déroule ensuite SA chronologie à partir de SA réception : on ne compare jamais
   une horloge hôte à une horloge invité (§3), et une scène de neuf secondes est
   exactement le genre de chose où trois secondes de dérive se verraient. */
export function resolveStarFall(e, day, now, ctx) {
  if (e.fall) return { ok: false, already: true };
  if ((day | 0) < STAR_FALL_MIN_DAY) return { ok: false, tooEarly: true };
  /* ⚠️⚠️ ZIP 455 — ELLE NE TOMBE PLUS SANS AVOIR ÉTÉ ANNONCÉE, ET LE TAMPON EST
     VÉRIFIÉ ICI. Écrits dans l'appelant, ces deux tests auraient été des règles
     que le banc ne peut pas appeler — c'est-à-dire des règles qui vieillissent
     (piège n°1, §2), et c'est exactement le raisonnement qui a fait descendre la
     porte des habitants dans ce fichier au 454. */
  if (!starWarned(e)) return { ok: false, unannounced: true };
  if (!starFallDue(e, ctx && ctx.dayStartAt, now)) return { ok: false, waiting: true };
  /* ⚠️ ZIP 454 — LA PORTE DES DEUX HABITANTS. Elle est ICI et pas dans l'appelant
     pour la raison qui vaut pour tout ce fichier : le banc appelle ce résolveur, il
     n'appelle pas `FermeGame`. Un test écrit là-bas aurait été un test que personne
     ne mesure — c'est-à-dire, à terme, un test qu'on déplace en croyant le garder. */
  const gate = starFallGate(ctx);
  if (!gate.ok) return { ok: false, gated: true, ...gate };
  e.fall = now;
  return { ok: true, scene: "fall" };
}

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 454 — LES QUATRE RÉSOLVEURS DE LA CONSTRUCTION.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ AUCUN NE PAIE ET AUCUN N'ENCAISSE, comme les six autres : ils rendent un
   COÛT, et c'est `FermeGame` qui prend l'or, les récoltes, les poissons et le
   bois. C'est la règle du 431 (le double crédit) tenue depuis, et le banc la
   vérifie par un scan de source — rien dans ce fichier ne touche à une pièce. */

/* La demande à la mairie. ⚠️ ELLE EXIGE LA RENCONTRE (`crater`) ET RIEN D'AUTRE :
   c'est l'étoile qui envoie, donc il faut l'avoir vue. Le PAIEMENT est vérifié par
   l'hôte avec ce que rend `cost` — un client qui forgerait la requête ne
   court-circuite rien. */
export function resolveStarPlanAsk(e, who, now) {
  if (!starHas(e, "crater")) return { ok: false, tooEarly: true };
  if (starPlanAsked(e)) return { ok: false, already: true };
  return { ok: true, cost: { gold: C.STAR_ENG_FEE_GOLD, crops: C.STAR_ENG_FEE_CROPS, fish: C.STAR_ENG_FEE_FISH } };
}
/* Ce que l'hôte écrit UNE FOIS le paiement pris. ⚠️ SÉPARÉE DE LA PRÉCÉDENTE
   EXPRÈS : un résolveur qui daterait la commande avant que l'or ne soit compté
   laisserait un ingénieur en route pour une ferme qui n'a pas payé, et la seule
   façon d'annuler serait d'effacer une date — c'est-à-dire de mentir deux fois. */
export function commitStarPlan(e, who, now) {
  e.plan = { at: now, by: String(who || "?").slice(0, 24), done: 0 };
  return { ok: true };
}
/* Le battement de l'hôte : les plans sont rendus. ⚠️ IL COMPARE DEUX DATES DE SA
   PROPRE HORLOGE (`now` et `plan.at`), donc le §3 tient par construction — c'est
   la même discipline que le retour d'Eduardo et que le refroidissement du cratère. */
export function resolveStarPlanTick(e, now) {
  if (!starPlanAsked(e) || starPlanReady(e)) return { ok: false };
  if ((+now || 0) < e.plan.at + C.STAR_ENG_TRAVEL_MS + C.STAR_ENG_WORK_MS) return { ok: false };
  e.plan.done = now;
  return { ok: true };
}

/* Une commande de bois. ⚠️ ELLE REND LE COÛT ET LA DURÉE, elle ne prélève rien.
   `starTimberBlock` porte TOUTES les conditions (plans, morceau trouvé, pièce
   précédente livrée) : les réécrire ici aurait donné deux règles pour une seule
   question, et le panneau grise ses boutons avec la première. */
export function resolveStarTimberOrder(e, key, who, now) {
  const why = starTimberBlock(e, key);
  if (why) return { ok: false, why };
  const t = C.STAR_TIMBER[key];
  return { ok: true, wood: t.wood, ms: t.ms };
}
export function commitStarTimber(e, key, who, now) {
  const t = C.STAR_TIMBER[key];
  e.wood[key] = { at: now, readyAt: now + t.ms, done: false, by: String(who || "?").slice(0, 24) };
  return { ok: true };
}
/* Le battement : Tristan livre. ⚠️ IL NE REND QU'UNE CLÉ À LA FOIS, et c'est
   voulu — deux pièces ne peuvent pas être en cours en même temps (l'ordre l'
   interdit), donc une boucle qui en livrerait plusieurs serait du code pour un cas
   qui ne peut pas exister. */
export function resolveStarTimberTick(e, now) {
  for (const k of STAR_SHIP_KEYS) {
    const w = e.wood && e.wood[k];
    if (!w || w.done) continue;
    if ((+now || 0) < w.readyAt) continue;
    w.done = true;
    return { ok: true, key: k, complete: starShipComplete(e) };
  }
  return { ok: false };
}

/* Une trouvaille. ⚠️ IDEMPOTENT PAR CONSTRUCTION : `found` est un dictionnaire,
   le retrouver réécrit la même clé. C'est ce qui autorise un geste à se répéter
   sans jamais compter deux fois — la règle du 439 (« un panneau qui s'ouvre à
   volonté ne doit rien donner ») tenue par la forme de la donnée et non par un
   garde-fou qu'on peut oublier. */
export function resolveStarFound(e, id, who, now) {
  const site = STAR_SITE[id];
  if (!site) return { ok: false };
  if (site.req && !site.req.every(r => starHas(e, r))) return { ok: false, locked: true };
  if (starHas(e, id)) return { ok: true, already: true, crossed: [] };
  e.found[id] = { by: String(who || "?").slice(0, 24), at: now };
  /* ⚠️ ZIP 453 — `shard: !!site.shard` EST RETIRÉ DU RETOUR : il n'avait aucun
     lecteur (vérifié par grep avant de le supprimer), et il portait le second
     vocabulaire qu'on vient de faire disparaître. Ce qui compte maintenant se
     lit sur le navire, et le navire se lit sur `found`. */
  return { ok: true, crossed: starAdvance(e) };
}

/* ⚠️⚠️ L'ÉTOILE TIMIDE — LE PREMIER VERROU COOPÉRATIF, ET IL N'EN EST PAS UN.
   Le client demande quand SA condition locale tient (dans l'anneau, immobile,
   dos tourné) ; l'hôte enregistre la date, à SA propre horloge, et regarde si
   quelqu'un d'AUTRE est calme en même temps. Deux dates de la même horloge : la
   règle du §3 est tenue par construction, comme les deux serrures du 442.
   ⚠️ `soloAllowed` n'assouplit pas la règle, il en change la DURÉE : seul, il
   faut tenir `STAR_CALM_SOLO_MS` au lieu de `STAR_CALM_MS`. Un jeu qui exige un
   second joueur pour avancer est un jeu qu'on ne finit pas. */
export function resolveStarCalm(e, who, now, soloAllowed, siteId) {
  const target = siteId || "crater";
  const site = STAR_SITE[target];
  if (!site || (target !== "crater" && site.content !== "star")) return { ok: false };
  if (starHas(e, target)) return { ok: true, already: true, crossed: [] };
  /* ⚠️⚠️ ZIP 446 — ON NE SORT PAS UNE ÉTOILE D'UN TROU BRÛLANT. L'hôte compare
     deux dates de SA propre horloge (`now` et `e.fall`), donc la règle du §3
     tient par construction, exactement comme les deux serrures du 442.
     ⚠️ IL NE PUNIT PAS, IL ATTEND : la tenue n'est même pas comptée, et le
     client ne demande pas (`starCalmSelf`). Un refus qui consommerait la tenue
     ferait « je me suis tenu tranquille dix secondes pour rien ». */
  /* ⚠️ LE REFUS EST `ok: false`, DONC SILENCIEUX ET SANS DIFFUSION : `FermeGame`
     rend la main sans toucher à `out.star` (même chemin qu'un lieu verrouillé).
     À `ok: true`, l'hôte aurait rediffusé la quête entière deux fois par seconde
     pendant qu'un joueur patiente devant un trou qui fume — du trafic pur, et le
     §3 est formel sur ce qui compte : le NOMBRE de `send()`. */
  if (target === "crater" && !starCraterCool(e, now - (e.fall || 0)))
    return { ok: false, tooHot: true, cool: Math.max(0, STAR_CRATER_COOL_MS - (now - (e.fall || 0))) };
  const calmKey = target + ":" + who;
  const prev = +e.calm[calmKey] || 0;
  /* On garde deux marques par joueur : le début de la tenue (`:t0`) et la
     dernière image reçue. Sans le début, une tenue interrompue et reprise
     compterait comme continue — c'est-à-dire qu'il suffirait de marteler. */
  if (!prev || now - prev > 1500) e.calm[calmKey + ":t0"] = now;
  e.calm[calmKey] = now;
  const t0 = +e.calm[calmKey + ":t0"] || now;
  const mine = now - t0;
  /* ╔═══════════════════════════════════════════════════════════════════════════
     ║ ZIP 458 — LE CHEMIN SOLO N'EST PLUS UNE BRANCHE, C'EST UN PLANCHER.
     ╚═══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️⚠️ C'ÉTAIT LE BLOCAGE LE PLUS CHER DU DÉPÔT, ET IL NE POUVAIT SE VOIR
     QU'À DEUX CLIENTS. `soloAllowed` venait de `starSoloRoom()`, c'est-à-dire de
     « y a-t-il un autre joueur CONNECTÉ » — jamais de « y a-t-il quelqu'un qui
     peut m'aider ICI ». Un joueur B qui laboure tranquillement à la ferme rendait
     donc le cratère de la ville **définitivement impossible à ouvrir** pour A :
     la branche duo exige une seconde tenue, et la seconde tenue ne pouvait pas
     exister. Pire, la jauge de `starCalmUi` lisait `starCalmNeed(false)` = 4 s :
     elle se remplissait, elle atteignait 100 %, et il ne se passait rien. **Une
     barre qui promet et ment**, c'est-à-dire exactement le défaut que le 456
     venait de corriger, reproduit d'un cran plus haut.
     ⚠️ LA PARADE EST STRUCTURELLE ET PAS UN RÉGLAGE : le duo est un RACCOURCI,
     jamais une serrure (§4 de `QUETE.md` : « la coopération n'est pas une
     serrure, c'est une conséquence »). On tient neuf secondes tout seul, quatre
     à deux, et **aucune configuration de joueurs ne peut plus bloquer quoi que ce
     soit**. `soloAllowed` ne décide donc plus si l'on peut, seulement ce qu'on
     ANNONCE — la durée que l'interface affiche.
     ⚠️ ET LE PLANCHER SE TESTE APRÈS LE RACCOURCI, pas avant : deux joueurs qui
     tiennent ensemble depuis dix secondes ouvrent le trou par le chemin court, et
     c'est le chemin court qui doit être crédité (`both: true` chez les deux). */
  const need = soloAllowed === false ? STAR_CALM_MS : STAR_CALM_SOLO_MS;
  if (mine >= need)
    return { ...resolveStarFound(e, target, who, now), opened: true, both: soloAllowed === false, site: target };
  return { ok: true, holding: mine, both: soloAllowed === false, need, site: target, crossed: [] };
}

/* ⚠️⚠️ LES OMBRES QUI PENCHENT — UNE DIRECTION N'EST PAS UN LIEU. Deux lectures
   de deux endroits assez éloignés se croisent ; une seule ne dit rien, et c'est
   ce qui rend ce chapitre coopératif sans qu'aucune porte ne soit fermée.
   ⚠️ Le croisement n'est pas calculé géométriquement, et c'est délibéré : deux
   demi-droites qui « se croisent » demanderaient au joueur de viser, ce qui est
   une compétence de géomètre, pas de conteur. Ce qu'on mesure est l'ÉCART entre
   les deux points d'écoute — la seule chose qui garantisse que les deux joueurs
   se sont vraiment séparés. Le lieu révélé vient de la table, dans l'ordre. */
export function resolveStarLean(e, who, tx, ty, now, soloAllowed) {
  const next = STAR_LEAN_MARKS.find(m => !starHas(e, m));
  if (!next) return { ok: true, already: true, crossed: [] };
  /* ╔═══════════════════════════════════════════════════════════════════════════
     ║ ZIP 458 — LES DEUX LECTURES NE SONT PLUS EXCLUSIVES, ELLES COEXISTENT.
     ╚═══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️⚠️ MÊME CAUSE QUE `resolveStarCalm`, EFFET PIRE. `soloAllowed` venait de
     la POPULATION du salon : dès qu'un second joueur se connectait — même endormi
     à la ferme, à cent cases et dans une autre zone — la ligne `if (!soloAllowed
     && k === who) continue` cessait de compter ses PROPRES lectures. Il fallait
     donc deux joueurs en ville, et il n'y en avait qu'un : `leanLake` et
     `leanGlass` devenaient introuvables, et **les chapitres 3, 4 et 5 avec eux**.
     La quête entière s'arrêtait au chapitre 2 parce qu'un ami s'était connecté.
     ⚠️ LA PARADE : ce n'est pas la présence d'un joueur qui choisit le barème,
     c'est **l'origine de la lecture**. Une lecture d'un AUTRE se croise au barème
     court (20 s / 30 cases) — deux personnes se sont vraiment séparées. Une
     lecture de SOI se croise au barème long (26 s / 45 cases) — il faut avoir
     traversé la ville en personne. Les deux chemins sont ouverts en permanence et
     ne s'excluent plus : à deux on va plus vite, tout seul on y arrive quand même,
     et **aucune configuration ne bloque**. `soloAllowed` ne sert plus qu'au texte
     affiché (voir `s2.leanArmed` / `leanSoloArmed`).
     ⚠️ ON GARDE LE PLUS GRAND ÉCART, pas le premier trouvé : c'est ce qui fait
     qu'une lecture lointaine d'un partenaire l'emporte sur sa propre lecture
     tout juste valide, donc que le message dit la vérité sur ce qui a servi. */
  let best = null;
  for (const k of Object.keys(e.lean)) {
    const self = (k === who);
    const win = self ? STAR_LEAN_SOLO_WINDOW_MS : STAR_LEAN_WINDOW_MS;
    const minD = self ? STAR_LEAN_SOLO_MIN_TILES : STAR_LEAN_MIN_TILES;
    const p = e.lean[k];
    if (!p || now - p.at > win) continue;
    const d = Math.hypot(tx - p.x, ty - p.y);
    if (d >= minD && (!best || d > best.d)) best = { d, k, self };
  }
  e.lean[who] = { x: tx, y: ty, at: now };
  if (!best) return { ok: true, armed: true, crossed: [] };
  const r = resolveStarFound(e, next, who, now);
  if (r.ok && !r.already && !e.marks.includes(next)) e.marks.push(next);
  return { ...r, crossed: r.crossed || [], mark: next, spread: Math.round(best.d), duo: !best.self };
}

/* Le duo. ⚠️ LES DEUX MINI-JEUX SONT LOCAUX ; SEULE LA PHRASE RÉUSSIE REMONTE.
   Faire arbitrer une visée image par image aurait demandé un message par image,
   c'est-à-dire le plafond de 10/s crevé à deux joueurs — et pour rien, puisque
   ce qui compte n'est pas la trajectoire, c'est le résultat. */
export function resolveStarDuet(e, phrase, who, now) {
  if (starHas(e, "song")) return { ok: true, already: true, crossed: [] };
  const p = phrase | 0;
  if (p !== (e.duet | 0)) return { ok: false, stale: true };   // une phrase en retard : on ignore
  e.duet = Math.min(STAR_DUET_PHRASES, p + 1);
  if (e.duet < STAR_DUET_PHRASES) return { ok: true, phrase: e.duet, crossed: [] };
  return { ...resolveStarFound(e, "song", who, now), complete: true };
}

/* ⚠️⚠️ LE CROCHET COSMÉTIQUE — L'ARBITRAGE MAINTENANT, LE CONTENU PLUS TARD.
   C'est une consigne explicite du chantier, et c'est aussi la règle du 439 («  un
   panneau qui s'ouvre à volonté ne doit rien donner ») appliquée à un cadeau qui
   ne contient encore rien. Le jour où la garde-robe cosmétique existera, elle
   lira `star.gift` : le chemin d'attribution sera déjà là, déjà arbitré par
   l'hôte, déjà persisté, déjà mesuré par le banc. Elle n'aura pas à en inventer
   un — et c'est justement au moment où l'on invente un chemin d'attribution
   qu'on se trompe.
   ⚠️ IL N'EST APPELÉ QU'UNE FOIS, AU BASCULEMENT DE LA SCÈNE FINALE, et il est
   idempotent : `gift` est un dictionnaire, pas un compteur. */
export function resolveStarGift(e, playerIds, now) {
  if (e.doneAt) return { ok: false, already: true };
  if (!starHas(e, "song")) return { ok: false, missing: true };
  /* ⚠️⚠️ ZIP 454 — ET LE BATEAU DOIT ÊTRE FINI. La cloche a donné sa note, les
     cinq morceaux sont RETROUVÉS — mais si le bûcheron n'a pas encore livré la
     chaise de cloche, il reste un chantier sur la grève. Jouer la résolution
     par-dessus, c'est faire partir un bateau qu'on voit inachevé derrière : la
     famille du 453 (« un texte affirme »), et le seul endroit du jeu où elle
     coûterait la scène finale.
     ⚠️ LE REFUS EST SILENCIEUX ET REJOUABLE : `resolveStarTimberTick` rappelle ce
     résolveur quand la dernière pièce tombe, donc la fin arrive toute seule au
     moment où le navire s'achève. Personne n'a à re-jouer le duo. */
  if (!starShipComplete(e)) return { ok: false, unbuilt: true, built: starShipBuilt(e), total: STAR_SHIP_TOTAL };
  e.doneAt = now;
  e.ch = STAR_CH_DONE;
  const granted = [];
  for (const id of playerIds || []) {
    if (!id || e.gift[id]) continue;
    e.gift[id] = { at: now, kind: "starlight" };
    granted.push(id);
  }
  return { ok: true, granted, scene: "end" };
}

/* ───────────────────────────────────────────────────────────────────────────
   7. LE MENU DÉVELOPPEUR — LANCER, AVANCER, REVOIR.

   ⚠️⚠️ IL EST CONSTRUIT EN PREMIER, AVANT LA PREMIÈRE SCÈNE, et c'est une
   décision de méthode. Ce chantier a cinq chapitres et trois cinématiques ; voir
   la finale coûte cinquante minutes de jeu. *Un outil de test dont le coût
   dépasse ce qu'il fait gagner cesse d'être utilisé, et c'est comme ça qu'on
   finit par livrer sans regarder.* Sans ces boutons — et surtout sans « Play
   scene », qui n'existait pas au 442 — la boucle « faire → regarder → juger →
   refaire » demandée par le chantier n'est pas tenable.

   ⚠️⚠️ ET AUCUNE DE CES OPÉRATIONS NE DONNE RIEN. Le menu s'ouvre à tout joueur
   qui connaît le raccourci (398). Le chemin développeur appelle les MÊMES
   résolveurs — la chaîne reste cohérente, les prérequis d'information sont
   respectés — et **jette** ce qu'ils rendent, `resolveStarGift` compris : le
   `gift` est écrit puis effacé. On saute la lecture, on ne gagne rien.
   ⚠️ `reset` REMET UN OBJET NEUF, il ne « défait » pas : une remise à zéro qui
   effacerait clé par clé finirait par laisser un état à moitié propre le jour où
   l'on ajoute un champ. `newStar()` ne peut pas mentir.
   ─────────────────────────────────────────────────────────────────────────── */
export const STAR_DEV_OPS = ["reset", "warn", "start", "chapter", "skip", "hint", "all", "plans", "timber"];
export const STAR_DEV_SCENES = ["warn", "fall", "turn", "end"];
/* ⚠️⚠️ ZIP 454 — LE MENU DEV FRANCHIT LA PORTE DES DEUX HABITANTS, ET C'EST LE
   SEUL ENDROIT QUI EN A LE DROIT. Recruter Eduardo, Tristan et quatre artisans
   avant de pouvoir REGARDER une cinématique de douze secondes, c'est une demi-
   heure de jeu par essai — c'est-à-dire une scène qu'on ne regarde qu'une fois,
   donc qu'on ne juge qu'une fois (§10 de `CLAUDE.md`, la raison d'être du bouton
   « rejouer une scène »). Le contexte est FABRIQUÉ ici, il n'est pas lu : la porte
   reste entière pour tout le monde, y compris pour l'hôte qui arme la chute. */
const DEV_GATE = { skills: C.STAR_GATE_SKILLS, artisans: C.STAR_GATE_ARTISANS };

export function devStar(e, op, now) {
  const t = now || Date.now();
  if (op === "reset") return { star: newStar(), ok: true };
  /* ⚠️⚠️ ZIP 455 — « ▶ START » SAUTE LE TAMPON, ET C'EST SA RAISON D'ÊTRE. Il
     annonce et fait tomber dans le même geste : sans ça, regarder la chute
     coûterait cinq minutes d'attente réelle par essai, c'est-à-dire qu'on ne la
     regarderait plus (§10 de `CLAUDE.md`, la raison d'être du bouton « rejouer une
     scène »). Le tampon a son propre bouton juste dessous, pour qui veut le juger. */
  if (op === "start") {
    if (!e.warn || !e.warn.at) e.warn = { at: t - C.STAR_WARN_FLOOR_MS - 1000, by: "🛠️" };
    if (!e.fall) e.fall = t;
    return { star: e, ok: true, scene: "fall" };
  }
  /* ⚠️ LE TAMPON SEUL. C'est le seul moyen de juger les PNJ nerveux et leurs
     phrases sans attendre qu'une ferme atteigne quatre artisans — et sans que la
     comète tombe cinq minutes plus tard au milieu de l'observation. */
  if (op === "warn") {
    if (e.fall) return { ok: false };
    e.warn = { at: t, by: "🛠️" };
    return { star: e, ok: true, scene: "warn" };
  }
  /* ── ZIP 454 : les deux étapes qui se comptent en MINUTES RÉELLES. Sans ces
     boutons, juger le plan et le fantôme demanderait dix-huit minutes d'attente,
     et juger le navire fini, quarante — c'est-à-dire qu'on ne les jugerait pas. */
  if (op === "plans") {
    if (!e.warn || !e.warn.at) e.warn = { at: t, by: "🛠️" };
    if (!e.fall) e.fall = t;
    for (const site of STAR_FARM_IMPACTS) resolveStarFound(e, site.id, "🛠️", t);
    resolveStarFound(e, "crater", "🛠️", t);
    e.plan = { at: t - C.STAR_ENG_TRAVEL_MS - C.STAR_ENG_WORK_MS, by: "🛠️", done: t };
    return { star: e, ok: true };
  }
  if (op === "timber") {
    /* ⚠️ IL NE DONNE QUE LE BOIS, jamais les morceaux d'étoile : les deux moitiés
       restent distinctes, sinon ce bouton effacerait la quête au lieu de la
       raccourcir — et on ne saurait plus lequel des deux manque à l'écran. */
    if (!e.warn || !e.warn.at) e.warn = { at: t, by: "🛠️" };
    if (!e.fall) e.fall = t;
    if (!starPlanAsked(e)) e.plan = { at: t, by: "🛠️", done: t };
    for (const k of STAR_SHIP_KEYS) e.wood[k] = { at: t, readyAt: t, done: true, by: "🛠️" };
    return { star: e, ok: true };
  }
  if (op === "chapter") {
    /* On donne exactement ce qui manque au chapitre COURANT, pas un de plus.
       `starAdvance` fait le reste, et il peut en franchir deux d'un coup si le
       suivant était déjà complet : c'est sa raison d'être. */
    if (!e.warn || !e.warn.at) e.warn = { at: t, by: "🛠️" };
    if (!e.fall) e.fall = t;
    for (const id of starMissing(e)) {
      if (id === "song") { e.duet = STAR_DUET_PHRASES; }
      resolveStarFound(e, id, "🛠️", t);
    }
    return { star: e, ok: true };
  }
  if (op === "skip") {
    if (!e.warn || !e.warn.at) e.warn = { at: t, by: "🛠️" };
    if (!e.fall) e.fall = t;
    const before = e.ch;
    for (let guard = 0; guard < STAR_CH_DONE + 2 && e.ch === before; guard++) {
      for (const id of starMissing(e)) {
        if (id === "song") e.duet = STAR_DUET_PHRASES;
        resolveStarFound(e, id, "🛠️", t);
      }
      if (STAR_CHAPTERS[e.ch] && STAR_CHAPTERS[e.ch].final) break;
    }
    return { star: e, ok: true };
  }
  if (op === "hint") {
    /* Rejoue le marquage du lieu courant : c'est ce que le croisement d'ombres
       aurait donné, sans avoir à traverser la ville deux fois. */
    if (!e.warn || !e.warn.at) e.warn = { at: t, by: "🛠️" };
    if (!e.fall) e.fall = t;
    const next = STAR_LEAN_MARKS.find(m => !starHas(e, m));
    if (next) { resolveStarFound(e, next, "🛠️", t); if (!e.marks.includes(next)) e.marks.push(next); }
    return { star: e, ok: true };
  }
  if (op === "all") {
    /* ⚠️ DEUX PASSES, PARCE QUE LES PRÉREQUIS SONT RÉELS : on ne plonge pas
       avant que le lac soit marqué, et le nid exige la perle. Une seule boucle
       dans l'ordre de la table sauterait `nestShard`, le chapitre 4 resterait
       ouvert, et on conclurait que la scène finale est cassée alors que c'est le
       raccourci qui l'était. Le banc le vérifie — c'est le contrôle que le 442
       avait dû ajouter pour exactement la même raison.
       ⚠️ ET IL S'ARRÊTE AVANT LE CHANT : le duo est le seul moment du chantier
       qui vaille d'être joué à la main. */
    if (!e.warn || !e.warn.at) e.warn = { at: t, by: "🛠️" };
    if (!e.fall) e.fall = t;
    for (let pass = 0; pass < 2; pass++)
      for (const st of STAR_SITES) {
        if (st.id === "song") continue;
        resolveStarFound(e, st.id, "🛠️", t);
      }
    for (const m of STAR_LEAN_MARKS) if (starHas(e, m) && !e.marks.includes(m)) e.marks.push(m);
    /* ⚠️ ZIP 454 — « TOUT SAUF LE DUO » DOIT AUSSI DIRE LE BOIS, sans quoi le duo
       joué à la main ne déclencherait plus la résolution (`resolveStarGift` exige
       un navire fini) : le bouton promettrait « il ne reste que le duo » et le
       jeu, lui, attendrait quarante minutes de sciage. Un raccourci qui ment est
       pire que pas de raccourci. */
    if (!starPlanAsked(e)) e.plan = { at: t, by: "🛠️", done: t };
    for (const k of STAR_SHIP_KEYS) e.wood[k] = { at: t, readyAt: t, done: true, by: "🛠️" };
    return { star: e, ok: true };
  }
  return { ok: false };
}
