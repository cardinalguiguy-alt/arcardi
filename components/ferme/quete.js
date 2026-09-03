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
   ⚠️ LA COOPÉRATION N'EST PAS UNE SERRURE, C'EST UNE CONSÉQUENCE : on ne peut
   pas tenir la lumière ET lire l'ombre. Celui qui la tient est ébloui et a
   l'ombre dans le dos ; celui qui lit est dans le noir et n'a pas de lampe.
   Deux personnes, deux postes, toujours — et jamais parce qu'une porte a deux
   serrures. Le premier jet EMPRUNTAIT ses verrous (deux
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

import * as C from "./fermeConstants";
/* ⚠️ ZIP 480 — LA NÉGOCIATION VIT DANS SON PROPRE FICHIER, ET C'EST DÉLIBÉRÉ.
   `maire.js` est un système d'audience réutilisable (la confiance gagnée sert
   « les prochaines missions », demande de Guillaume) : le fondre ici en aurait
   fait un morceau de la quête de l'étoile, donc quelque chose à découper le jour
   où une commission ou le cadastre voudront la même mécanique. La quête n'en lit
   que deux choses : l'état migré et « a-t-il signé ». */
import * as MA from "./maire";

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
/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 469 — LE DÉCHANT. SEPT LIEUX SORTENT DE LA TABLE, ET AVEC EUX TOUT LE
   ║ VOCABULAIRE MUSICAL.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DÉCISION DE GUILLAUME : la quête est SIMPLIFIÉE. L'autorité 465 avait déjà
   déclaré obsolètes le chant, les notes et la lyre ; le 469 les RETIRE du code au
   lieu de les laisser « techniquement jouables ». Sortent donc : les deux
   croisements d'ombres (`leanLake`, `leanGlass`), la plongée du lac (`lakeShard`),
   la verrerie et la pie (`beadShard`, `nestShard`), le beffroi et le duo
   orgue/cloche (`belfry`, `song`).
   ⚠️ CE QUI RESTE DANS LE MONDE N'A PAS BOUGÉ D'UN PIXEL : le beffroi se monte
   toujours (c'est la plus belle vue du jeu), la verrerie et le ponton sont
   toujours là. Ils sortent de la QUÊTE, pas de la carte — un décor supprimé
   aurait coûté du monde pour ne rien gagner.
   ⚠️⚠️ ET LA TABLE RESTE LA SEULE SOURCE. `STAR_FOLLOWER_SITES`, `STAR_GOAL_KEYS`,
   `STAR_SHIP_PARTS` et le pisteur en dérivent tous : retirer une ligne ici suffit
   à la faire disparaître partout, ce qui est très exactement pourquoi cette table
   existe. Une sauvegarde qui porte encore `song` ou `lakeShard` est ignorée par
   `migrateStar` (« un lieu inconnu = une version d'après ») — donc une partie
   d'avant le 469 se recharge sans planter.
   ───────────────────────────────────────────────────────────────────────────── */
/* ╔════════════════════════════════════════════════════════════════════════════════
   ║ ZIP 479 — `verb` : CHAQUE ÉTOILE A SON VERBE, ET DEUX N'ONT JAMAIS LE MÊME.
   ╚════════════════════════════════════════════════════════════════════════════════
   ⚠⚠⚠ C'EST LA COLONNE QUI RÈGLE LE DÉFAUT 9 DE L'AUDIT 477, ET ELLE LE RÈGLE PAR
   CONSTRUCTION PLUTÔT QUE PAR DU TEXTE. Le reproche était : « les trois étoiles
   disent la même chose parce qu'on leur demande la même chose ». Écrire trois
   phrases différentes sur un geste unique aurait été le remède du 453 pris à
   l'envers (*un texte affirme*) : trois mensonges au lieu d'un. **Deux gestes
   différents donnent deux textes différents tout seuls.**
     · `light` — LA TIMIDE (bleue). On lui offre de la lumière bleue : les bonbons
       de Temple Run (`STAR_CANDY_PRICE`), rapportés DEPUIS LA CHUTE. Puis on lui
       tourne le dos — le geste du 3a, et il n'appartient plus qu'à elle.
     · `warm`  — LA GOURMANDE (rose). Elle ne vient pas au calme, elle vient à la
       CHALEUR : on cuisine au chaudron et on PORTE le plat jusqu'à son trou. Le
       geste, c'est le CHEMIN (`starDishHeat`).
     · `pair`  — LA REINE. Deux présences aux bords OPPOSÉS du grand cratère, dos
       à dos (`starQueenStep`). Seul, on plante son épouvantail en face.
   ⚠⚠ LE BANC TIENT L'UNICITÉ (§verbes de `verify-quete`) : le jour où une
   quatrième étoile recopierait le verbe d'une autre, il échoue. C'est la seule
   façon de garder une promesse de CONCEPTION dans une table de données — une
   consigne écrite dans un document se périme, un contrôle non. */
export const STAR_SITES = [
  // ── Chapitre 1 : huit petits impacts, dispersés sur la ferme. On les FOUILLE.
  { id: "farmStarBlue", zone: "farm", spot: "starFarmImpact", impact: 0, content: "star", color: "blue", verb: "light" },
  { id: "farmEmptyA",   zone: "farm", spot: "starFarmImpact", impact: 1, content: "empty" },
  { id: "farmMaterial", zone: "farm", spot: "starFarmImpact", impact: 2, content: "material" },
  { id: "farmStarRose", zone: "farm", spot: "starFarmImpact", impact: 3, content: "star", color: "rose", verb: "warm" },
  { id: "farmEmptyB",   zone: "farm", spot: "starFarmImpact", impact: 4, content: "empty" },
  /* 480 bis — TROIS CHUTES DE PLUS (demande de Guillaume), dont une nouvelle
     étoile : l'étoile BLANCHE, capricieuse, verbe `lure`. Elle ne se calme pas
     dos tourné (light/pair) ni en cuisine (warm) : elle faut lui apporter une
     concoction du chaudron (`Essence d'étoile`, ingrédients rares miné dans le
     monde maléfique) avant de pouvoir la tenir — voir `resolveStarCalm`. */
  { id: "farmEmptyC",    zone: "farm", spot: "starFarmImpact", impact: 5, content: "empty" },
  { id: "farmStarWhite", zone: "farm", spot: "starFarmImpact", impact: 6, content: "star", color: "white", verb: "lure" },
  { id: "farmMaterialB", zone: "farm", spot: "starFarmImpact", impact: 7, content: "material" },
  // ── Chapitre 2 : le cratère. On ne trouve pas un morceau, on trouve QUELQU'UN.
  { id: "crater",    zone: "town",  spot: "starCrater", content: "star", color: "yellow", queen: true, verb: "pair" },
  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ 2026-09-02 (lot A2) — LA SIXIÈME SŒUR, « LA DISCRÈTE ». VERBE `spot`.
     ╚══════════════════════════════════════════════════════════════════════════
     Guillaume : *« elle se cache entre les pnj, tranquillement, parfois sur un
     banc, parfois circulant normalement : elle sera entre la place centrale, et
     le parc, elle pourra se mouvoir dans cet espace seulement. »* Mini chapeau,
     lunettes de soleil ; la reine oriente vers elle ; on l'apprivoise en pressant
     E — *« on l'apprivoise facilement »*.
     ⚠️⚠️ ELLE EST DANS LE `need` DU CHAPITRE 2, DERRIÈRE LA REINE, ET C'EST UNE
     DÉCISION DE STRUCTURE : le seuil de la septième sœur est « reine apprivoisée
     ET six étoiles trouvées ». La laisser hors des chapitres l'aurait rendue
     facultative, donc jamais annoncée par le bandeau — et la septième aurait
     attendu une condition que rien ne pousse le joueur à remplir.
     ⚠️ SON GESTE EST LE PLUS SIMPLE DE TOUTE LA QUÊTE, ET C'EST VOULU : cinq
     étoiles demandent déjà une mécanique chacune (bonbons, plat, fiole, deux
     bords, rythme). La sixième demande seulement de REGARDER — c'est-à-dire la
     seule chose qu'aucune des cinq autres ne demande. */
  { id: "townShy",   zone: "town",  spot: "starShy",    content: "star", color: "orange", verb: "spot" },
  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ 2026-09-03 (lot A3) — LA CINQUIÈME SŒUR, « LA VERTE ». VERBE `track`.
     ╚══════════════════════════════════════════════════════════════════════════
     Guillaume : *« SIMPLIFIEE, IL FAUT JUSTE LA CHERCHER. mais avoir des indices
     sur où elle se trouve »*, puis, sur sa forme : *« le buisson bouge tout seul.
     on peut demander des indices à la reine deux fois (cumulé entre les joueurs)
     […] la troisième fois […] "laisser la reine vous guider" »* et *« elle ne peut
     aller que de buisson en buisson […] on doit voir l'animation de déplacement ».*
     ⚠️⚠️ CE QUI LA SÉPARE DE LA DISCRÈTE TIENT EN UN MOT, ET C'EST LE MOT DE
     GUILLAUME : « INDICES ». La sixième se REPÈRE à l'œil dans un domaine annoncé
     (le chevron mène à la place, le bandeau donne le signalement) ; la cinquième se
     PISTE — aucun domaine annoncé, aucun chevron, et trois sources de piste : le
     buisson qui remue tout seul, deux « chaud/froid » demandés à la reine, et le
     guidage. Un second `spot` aurait donné deux fois la même chasse, ce que
     l'audit 479 a déjà reproché aux deux petites étoiles (« le geste était
     paresseux, pas le texte »).
     ⚠️ SON VERBE EST DONC NEUF : `STAR_VERB_SITE` rend le PREMIER lieu d'un verbe,
     et deux `spot` auraient fait passer la verte pour la discrète dans toute
     jointure qui lit cette table. */
  { id: "townGreen", zone: "town",  spot: "starGreen",  content: "star", color: "green",  verb: "track" },
];
/* Les verbes connus, écrits UNE fois. ⚠⚠ Une étoile sans verbe est une
   erreur de table et non un cas à rattraper à l'exécution : `starVerbOf` rend
   `null`, `starTameTarget` ne la propose pas, et le banc le dit tout de suite.
   Un repli silencieux sur « dos tourné » aurait redonné le même geste à tout le
   monde, c'est-à-dire exactement le défaut qu'on vient de corriger. */
export const STAR_VERBS = ["light", "warm", "pair", "lure", "spot", "track"];
export function starVerbOf(id) {
  const s = STAR_SITE[id];
  return s && STAR_VERBS.includes(s.verb) ? s.verb : null;
}
/* ⚠️⚠️ QUEL TROU PORTE QUEL VERBE — DÉRIVÉ DE LA TABLE, JAMAIS ÉCRIT EN DUR. Les
   résolveurs du plat n'ont pas à savoir que l'étoile gourmande s'appelle
   `farmStarRose` : le jour où elle change de cratère (ou de couleur), la cuisine
   suit toute seule. C'est la parade du 449 — *une jointure, jamais deux listes* —
   sur la seule chose qui, sinon, serait recopiée dans cinq fonctions. */
export const STAR_VERB_SITE = Object.fromEntries(
  STAR_VERBS.map(v => [v, (STAR_SITES.find(s => s.verb === v) || {}).id || null]));
export const STAR_LIGHT_SITE = STAR_VERB_SITE.light;
export const STAR_WARM_SITE = STAR_VERB_SITE.warm;
export const STAR_SITE = Object.fromEntries(STAR_SITES.map(s => [s.id, s]));
export const STAR_FARM_IMPACTS = STAR_SITES.filter(s => s.spot === "starFarmImpact");
export const STAR_FARM_STAR_IDS = STAR_FARM_IMPACTS.filter(s => s.content === "star").map(s => s.id);
/* 463 — UNE ÉTOILE APPRIVOISÉE DEVIENT UN COMPAGNON, sans seconde liste.
   `content:"star"` est déjà la vérité qui distingue les êtres vivants des
   cratères vides et de la matière météorique ; le rendu relit donc cette même
   colonne. La reine n'est pas un cas ajouté ailleurs : son rang et sa taille
   viennent de `queen`, ici, à côté de son identité. Toute future étoile marquée
   `content:"star"` rejoindra automatiquement la formation. */
export const STAR_FOLLOWER_SITES = STAR_SITES.filter(s => s.content === "star");
export function starFollowers(e) {
  return STAR_FOLLOWER_SITES.filter(s => starHas(e, s.id));
}
/* 464 — Le veilleur du rendu doit savoir QUELLE étoile vient de franchir la
   jauge, pas seulement que la reine existe désormais. Cette jointure reste pure
   afin que le banc puisse balayer les trois créatures : réserver l'arrivée à
   `crater` avait laissé les deux petites au centre jusqu'à 100 %, puis les avait
   téléportées directement dans la formation sans jouer leur `climb`. */
export function starFollowerAdded(previousIds, e) {
  const before = new Set(Array.isArray(previousIds) ? previousIds : []);
  return starFollowers(e).find(s => !before.has(s.id)) || null;
}

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

       la coque   ← `farmMaterial` (chapitre 1, la plaque du troisième cratère)
       ⚠️ ZIP 469 — LES QUATRE AUTRES N'ONT PLUS DE LIEU (voir `SHIP_SITE_OF`) :
       le safran, le mât, la voile et la cloche venaient des chapitres 3, 4 et 5,
       supprimés par le déchant. Ils ne dépendent plus que du bois de Tristan. Le
       paragraphe qui suit reste vrai mot pour mot pour la coque, et il explique
       pourquoi la table est restée une table — c'est en la modifiant à un seul
       endroit qu'on a pu retirer quatre chapitres sans toucher au dessin du navire.

   Un compteur `ship: 3` dans l'état partagé aurait été le réflexe, et il aurait
   été le doublon du §8 de `CLAUDE.md` — « un paramètre qui double un autre est une
   divergence en attente ». Le jour où l'on déplace une trouvaille, le navire suit
   tout seul ; il ne peut PAS afficher quatre morceaux pour trois éclats trouvés.
   Zéro migration SQL, zéro `send()`, zéro champ dans le paquet de position.

   ⚠️⚠️ ZIP 469 — CE PARAGRAPHE DISAIT « LA CLOCHE EST LE CINQUIÈME MORCEAU, ET
   C'EST CE QUI SAUVE LE RETOURNEMENT » : la cloche de l'église, fondue dans une
   étoile tombée, embarquait au lieu de rentrer. **Le retournement n'existe plus**
   — le déchant a retiré le beffroi, le duo et le chant. La cloche du navire est
   maintenant une pièce comme les autres, taillée par Tristan, et **elle attend
   qu'on lui rende une raison d'être là** (D3 du §14 de `QUETE.md`).
   ⚠️ *Un commentaire qui raconte une fiction supprimée est lu par le prochain qui
   ouvre le fichier, et il le croit* — c'est la leçon du 452, appliquée le jour
   même de la suppression au lieu de deux zips plus tard.
   ⚠️ CE QUI RESTE VRAI DU BLOC 450 : le navire MONTRE l'avancement. Les logements
   vides se voient sur la cale, c'est la règle des 10 secondes tenue par un objet
   du monde au lieu d'un bandeau — et c'est cette moitié-là qu'il faut garder.

   ⚠️⚠️ L'ORDRE DES CINQ CLÉS N'EST PAS ÉCRIT ICI : il vient de
   `C.STAR_SHIP_ORDER`, que `fermeArt.js` lit aussi pour savoir quelle pièce il
   peint. Une seconde liste ici aurait été le doublon le plus sournois possible —
   les deux auraient eu l'air justes, et le jour où l'on intervertit deux morceaux
   le bateau aurait affiché une voile là où le joueur a trouvé un safran, **sans
   qu'aucun banc ne puisse le voir** (chacun aurait mesuré sa propre liste). C'est
   le défaut du bandeau et du chevron au 449, pris à l'avance : *une jointure,
   jamais deux listes.*
   ───────────────────────────────────────────────────────────────────────────── */
/* ⚠️⚠️⚠️ ZIP 469 — QUATRE DES CINQ MORCEAUX N'ONT PLUS DE LIEU, ET C'EST LA SEULE
   CHOSE QUE LE DÉCHANT ÉTAIT OBLIGÉ DE TOUCHER DANS LA CHARPENTE.
   Le safran, le mât, la voile et la cloche venaient des chapitres 3, 4 et 5, qui
   n'existent plus. Les laisser pointer sur des lieux supprimés aurait rendu le
   navire **impossible à finir** — `starShipParts` aurait lu `starHas(e, "song")`
   pour toujours faux, donc `resolveStarGift` aurait refusé pour toujours, sans
   qu'un seul message ne le dise. C'est la cascade silencieuse du 468, à
   l'identique.
   ⚠️ LA RÉPONSE MINIMALE, ET ELLE EST CELLE DE LA TRAME CIBLE : un morceau sans
   lieu est un morceau qu'on **fabrique** au lieu de le trouver. Il ne dépend plus
   que de la commande passée à Tristan (`starTimberDone`), qui existe depuis le 454
   et qui marche. La coque, elle, garde son lieu : la plaque météorique du
   troisième cratère de la ferme est la seule pièce qu'on RAMASSE.
   ⚠️⚠️ CE N'EST PAS LA CHARPENTE DÉFINITIVE — c'est le pansement qui garde la
   quête finissable pendant qu'elle attend son arbitrage (voir §14 de `QUETE.md`,
   D3). Ce qui manque est la FICTION : d'où vient la voile (Eduardo), d'où vient la
   cloche. Tant qu'elle n'est pas tranchée, le bois de Tristan répond tout seul,
   et le joueur ne voit ni trou ni logement noir sur la cale. */
const SHIP_SITE_OF = {
  hull: "farmMaterial", rudder: null, mast: null, sail: null, bell: null,
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
   deux lectures, jamais une addition tenue à part. */
export function starTimberDone(e, key) {
  const w = e && e.wood && e.wood[key];
  return !!(w && w.done);
}
/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 478 — UNE COMMANDE A MAINTENANT TROIS ÉTATS, PAS DEUX.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ AVANT : commandée / posée. Le minuteur de Tristan finissait et la pièce
   apparaissait toute seule sur la cale, où que soit le joueur. L'audit 477 l'a
   chiffré : cinq clics et 24 minutes de sablier, « rien pendant ces 24 minutes ne
   le ramène au bateau ». Le troisième état est le MONTAGE : Tristan livre le bois
   (`ready`), et c'est le joueur qui pose la pièce, au marteau, sur la cale
   (`done`). La livraison redevient un rendez-vous.
   ⚠️⚠️⚠️ `done` N'A PAS CHANGÉ DE SENS, ET C'EST CE QUI REND LA PASSE SÛRE : tout
   ce qui dessine le navire, compte les pièces et déclenche la fin (`starShipHas`,
   `starShipParts`, `starShipBuilt`, `starShipComplete`) lit `starTimberDone`, donc
   « posée ». Ajouter le nouvel état SOUS l'ancien plutôt qu'à côté évite d'aller
   relire quinze appelants — et une sauvegarde d'avant ce zip, où `ready` n'existe
   pas, se comporte exactement comme avant pour tout ce qui est déjà `done`. */
export function starTimberOrder(e, key) {
  const w = e && e.wood && e.wood[key];
  return w && !w.done && !w.ready ? w : null;   // 478 — chez Tristan, et pas encore livrée
}
/* Livrée par Tristan, pas encore posée : c'est ce qui attend un marteau. */
export function starTimberReady(e, key) {
  const w = e && e.wood && e.wood[key];
  return !!(w && w.ready && !w.done);
}
/* La première pièce à monter. ⚠️ UNE JOINTURE, PAS UNE SECONDE LISTE (449) : elle
   balaie `STAR_SHIP_KEYS` dans l'ordre du navire, donc la cale se remplit de la
   quille vers la cloche même quand les cinq commandes ont couru en parallèle. */
export function starTimberToRaise(e) {
  for (const k of STAR_SHIP_KEYS) if (starTimberReady(e, k)) return k;
  return null;
}
export function starTimberReadyCount(e) { return STAR_SHIP_KEYS.filter(k => starTimberReady(e, k)).length; }
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
/* ⚠️⚠️ ZIP 478 — LA BULLE MONTRE CELLE QUI FINIT LE PLUS TÔT, PAS LA PREMIÈRE DE
   LA LISTE. Depuis que les cinq commandes courent en PARALLÈLE, « la première clé
   non livrée » aurait affiché une barre à 5 % pendant qu'une autre pièce se posait
   à côté : le joueur aurait lu une progression qui n'est pas celle qui va se
   passer. La bulle répond à « qu'est-ce qui arrive ensuite », donc elle prend le
   `readyAt` le plus petit. */
export function starTimberBusy(e) {
  let best = null;
  for (const k of STAR_SHIP_KEYS) {
    const w = starTimberOrder(e, k);
    if (!w) continue;
    if (!best || w.readyAt < best.readyAt) best = { key: k, at: w.at, readyAt: w.readyAt, by: w.by || "" };
  }
  return best;
}
/* Combien de pièces Tristan a-t-il sur l'établi ? ⚠️ SE DÉRIVE, ne se stocke pas. */
export function starTimberBusyCount(e) { return STAR_SHIP_KEYS.filter(k => !!starTimberOrder(e, k)).length; }
export function starTimberProgress(e, now) {
  const w = starTimberBusy(e);
  if (!w) return 0;
  const span = w.readyAt - w.at;
  if (!(span > 0)) return 1;
  return Math.max(0, Math.min(1, ((+now || 0) - w.at) / span));
}
/* ⚠️ ZIP 469 — `p.site` PEUT ÊTRE `null`, ET LE TEST EST ÉCRIT UNE SEULE FOIS.
   Un morceau sans lieu n'attend que le bois ; un morceau avec lieu attend les
   deux. Deux écritures de cette condition (ici et dans `starShipHas`) ont déjà
   divergé une fois dans ce dépôt — on la dérive donc d'une fonction unique. */
function shipSiteOk(e, p) { return !p.site || starHas(e, p.site); }
export function starShipHas(e, key) {
  const p = STAR_SHIP_PARTS.find(q => q.key === key);
  return !!(p && shipSiteOk(e, p) && starTimberDone(e, key));
}
export function starShipParts(e) { return STAR_SHIP_PARTS.map(p => shipSiteOk(e, p) && starTimberDone(e, p.key)); }
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
  /* ⚠️⚠️⚠️ ZIP 480 — LA CALE EST SUR LE QUAI MUNICIPAL, ET C'EST TOUT LE SENS DE
     LA PASSE MAIRE (§15.0 de `QUETE.md` : « c'est lui qui devrait valider le
     projet de bateau, et cette validation est ce qui débloque tout le reste »).
     La justification n'est pas décorative : on ne monte pas une coque sur un quai
     public sans arrêté, et Tristan ne débite pas 395 unités de bois pour un
     chantier qui n'a pas de papier. C'est la même forme que `noPlan`, un cran
     plus loin — une lecture, jamais un état de plus.
     ⚠️ ELLE ARRIVE APRÈS `noPlan` ET PAS AVANT : on PEUT aller voir le maire les
     mains vides (décision de Guillaume), mais le bandeau doit désigner l'action la
     plus proche, et tant qu'il n'y a pas de plans c'est l'ingénieur qu'on attend. */
  if (!MA.mayorSigned(e)) return "noMayor";
  if (starTimberDone(e, key)) return "done";
  if (starTimberReady(e, key)) return "raise";  // 478 — le bois est là, il manque le marteau
  if (starTimberOrder(e, key)) return "busy";
  const part = STAR_SHIP_PARTS[idx];
  if (!shipSiteOk(e, part)) return "noShard";   // 469 — un morceau sans lieu n'a rien à attendre
  /* ⚠️⚠️⚠️ ZIP 478 — LA GARDE « LA PIÈCE PRÉCÉDENTE DOIT ÊTRE LIVRÉE » EST PARTIE,
     ET C'EST LE PLUS GROS GAIN DE TOUTE LA REFONTE POUR LE PLUS PETIT GESTE.
     Elle sérialisait 8 + 3 + 6 + 4 + 3 minutes : **24 minutes d'horloge réelle
     pour cinq clics**, mesurées par l'audit 477, sur une quête qui en dure 56.
     Les cinq commandes courant EN PARALLÈLE, le même chantier prend **8 minutes**
     — la plus longue pièce — sans qu'un seul des cinq nombres ait bougé.
     ⚠️ ET ELLE NE PROTÉGEAIT RIEN : l'ORDRE DE LA CALE est tenu ailleurs, par
     `starTimberToRaise`, qui balaie `STAR_SHIP_KEYS` dans l'ordre du navire. On
     construit toujours de la quille vers la cloche ; on n'ATTEND plus pour
     commander. *Une contrainte de présentation déguisée en règle de jeu se
     reconnaît à ceci : la retirer ne casse rien et rend une demi-heure.*
     ⚠️ CE QUE ÇA COÛTE, ET C'EST ASSUMÉ : il faut désormais avoir les 395 bois
     (et les quatre lignes de `extra`) pour tout commander d'un coup. La file
     d'attente devient une question de STOCK, c'est-à-dire une question qu'on pose
     à la ferme au lieu de la poser à l'horloge. */
  return null;
}
export function starTimberCan(e, key) { return starTimberBlock(e, key) === null; }
/* Une lecture prête pour le plan déplié. Elle ne crée ni compteur, ni nouvel
   état : chaque segment rejoint la pièce posée, la livraison et la commande
   déjà persistées. `work` n'existe que pendant la fabrication et se recalcule
   depuis les deux dates de Tristan, comme sa bulle d'ouvrage. */
export function starShipProgress(e, now) {
  const parts = starShipParts(e);
  return STAR_SHIP_KEYS.map((key, index) => {
    const order = starTimberOrder(e, key);
    const ready = starTimberReady(e, key);
    const reason = starTimberBlock(e, key);
    let state = "available";
    if (parts[index]) state = "done";
    else if (ready) state = "ready";
    else if (order) state = "building";
    else if (reason) state = "locked";
    let work = 0;
    if (order) {
      const span = order.readyAt - order.at;
      work = span > 0
        ? Math.max(0, Math.min(1, ((+now || 0) - order.at) / span))
        : 1;
    }
    return { key, state, reason, work, readyAt: order ? order.readyAt : 0 };
  });
}
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
/* ⚠️⚠️ ZIP 469 — CINQ CHAPITRES DEVIENNENT TROIS, ET LE DERNIER N'A PLUS DE LIEU.
   La trame cible est : *cinq impacts à la ferme → le grand impact de Valley Town →
   la construction du bateau.* Les chapitres `water` (la plongée) et `thief` (la
   verrerie et la pie) disparaissent avec leurs lieux ; `note` (le beffroi et le
   duo) devient `build`.
   ⚠️⚠️ ET `build` N'A **AUCUN** `need`, CE QUI EST NOUVEAU ET DÉLIBÉRÉ. Ce qui le
   ferme n'est pas une trouvaille, c'est un CHANTIER : les cinq pièces de bois de
   Tristan, puis la scène finale que l'hôte joue. `starAdvance` s'arrête de toute
   façon avant un chapitre `final` — il ne peut donc pas se refermer tout seul sur
   une liste vide, et le garde du 442 tient encore. */
export const STAR_CHAPTERS = [
  { key: "field",  need: ["farmStarBlue", "farmEmptyA", "farmMaterial", "farmStarRose", "farmEmptyB",
                          "farmEmptyC", "farmStarWhite", "farmMaterialB"] },
  /* 2026-09-02 (lot A2) — LA DISCRÈTE FERME LE CHAPITRE 2, DERRIÈRE LA REINE.
     ⚠️ L'ORDRE DE CETTE LISTE FAIT FOI (`starMissing` rend le premier manquant) :
     la reine d'abord, puisque c'est ELLE qui apprend au joueur que la discrète
     existe. Inversés, le bandeau enverrait chercher quelqu'un dont personne n'a
     encore parlé. */
  /* 2026-09-03 (lot A3) — LA VERTE FERME LE CHAPITRE, DERRIÈRE LA DISCRÈTE.
     ⚠️ L'ORDRE DIT CE QUE LE BANDEAU ANNONCE, PAS CE QUE LE JOUEUR DOIT FAIRE :
     Guillaume — *« on peut tout à fait trouver la 6 sur le chemin, bien sûr, et
     faire la 5 après la 6 »* — donc les deux résolveurs ne se gardent QUE sur la
     reine, jamais l'un sur l'autre. Tomber sur la verte en cherchant la discrète
     doit compter. */
  { key: "crater", need: ["crater", "townShy", "townGreen"] },
  { key: "build",  need: [], final: true },
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
/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 478 (audit 477, défaut #2) — 60 s → 30 s, ET LE NOMBRE N'ÉTAIT PAS LE
   ║ VRAI PROBLÈME.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️⚠️ CE QUE L'AUDIT A MESURÉ EN LE JOUANT DEUX FOIS JUSQU'AU BOUT : pendant
   cette minute, « le personnage ne bouge pas, la caméra ne bouge pas, l'étoile
   n'est pas dessinée (c'est le principe), et le seul retour est une barre de 30 px
   au-dessus de la tête ». Le jeu ne demandait pas de TENIR quelque chose — il
   demandait de ne rien faire.
   ⚠️⚠️ COUPER LA DURÉE NE SUFFIT DONC PAS, ET C'EST LE POINT : 15 s sans rien à
   regarder se lisent plus longues que 30 s où quelque chose monte. Le vrai
   correctif est à côté (`starCalmGlow`) — on VOIT sa lumière, jamais elle. Le dos
   tourné cesse d'être une privation d'image ; il devient le seul moyen de la voir.
   ⚠️ 30 s est le chiffre de Guillaume, mot pour mot (« Réduire l'attente à 30
   secondes approuvé »). Le raccourci à deux ne bouge pas : il reste un RACCOURCI et
   jamais une serrure (458), et l'écart 3× est ce qui le rend lisible. */
export const STAR_CALM_SOLO_MS = 30000;    // seul : une demi-minute, et il s'y passe quelque chose
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
  if (!e || !starTownFallen(e)) return 0;
  if (starHas(e, "crater")) return 0;                      // elle est sortie : le trou s'éteint
  const k = Math.max(0, Math.min(1, (+elapsedMs || 0) / STAR_CRATER_COOL_MS));
  // Une décroissance en cloche : ça fume fort, puis ça retombe vite, puis ça traîne.
  return STAR_CRATER_EMBER + (1 - STAR_CRATER_EMBER) * Math.pow(1 - k, 1.7);
}
/* « Assez froid pour qu'elle ose sortir ». ⚠️ UNE SEULE ÉCRITURE POUR LES DEUX
   CÔTÉS : le client s'en sert pour ne pas demander, l'hôte pour ne pas accorder.
   Deux seuils auraient donné « le jeu propose et refuse » (défaut du 426). */
export function starCraterCool(e, elapsedMs) {
  if (!e || !starTownFallen(e)) return false;
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
export const STAR_JOIN_CRATER_LIFT_PX = 2.5; // du centre visuel du cratère au premier pixel animé
export const STAR_JOIN_ORBIT_PX = 13;     // le rayon du tournicotage
/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 468 — UNE ARRIVÉE NE PEUT PLUS RETENIR LA QUÊTE EN OTAGE.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️⚠️ DÉFAUT REPRODUIT À L'ÉCRAN, ET IL RENDAIT LA QUÊTE INFINISSABLE.
   L'horloge de l'arrivée mesure du temps VISIBLE (465), ce qui est juste : elle
   n'avance que dans la zone de son cratère et hors de tout panneau. Mais elle
   n'avait AUCUNE borne, et l'origine, elle, ne change jamais de zone — un joueur
   qui prenait le train pendant les 2,6 s la figeait DÉFINITIVEMENT. La suite
   tombait en cascade, et pas un banc ne pouvait la voir :
     `starJoinActive` reste vrai  →  `starSceneCanPlay` refuse TOUTE scène
       →  la chute de Valley Town n'est jamais JOUÉE
       →  `starImpactLandedNow` reste faux
       →  `starTameTarget` rend `null`  →  **la reine est inapprivoisable.**
   Mesuré dans le navigateur : arrivée gelée à 1294 ms sur 2600, trou refroidi,
   cible `null`, plus une seule scène jouable — pendant que le bandeau disait
   « Le cratère a refroidi. Descends : quelque chose se cache au fond. »
   ⚠️⚠️ LA PARADE N'EST PAS DE SUPPRIMER LA PAUSE, C'EST DE LA BORNER. Le temps
   visible reste la règle ; passé cette grâce en temps RÉEL, l'arrivée est
   déclarée finie et l'étoile rejoint sa formation. On préfère rater une
   animation que personne ne regardait à bloquer une quête que tout le monde
   attend — c'est le repli qui ACCEPTE du §4 de `CLAUDE.md`, appliqué au temps.
   ⚠️ ET C'EST UNE HORLOGE LOCALE, JAMAIS PARTAGÉE : chaque client borne SA
   propre mise en scène. Rien ne traverse le réseau, rien n'est à réconcilier.
   ═════════════════════════════════════════════════════════════════════════════ */
export const STAR_JOIN_GRACE_MS = 20000;
export function starJoinStale(armedAtMs, nowMs) {
  const a = +armedAtMs || 0;
  if (!a) return false;                       // jamais armée : il n'y a rien à périmer
  return (+nowMs || 0) - a > STAR_JOIN_MS + STAR_JOIN_GRACE_MS;
}

export const STAR_BUBBLE_FADE_MS = 900;

/* 465 — les conseils ne deviennent pas des pancartes permanentes. Ils restent
   pleinement lisibles pendant leur durée, s'effacent en douceur, puis le survol
   de n'importe quelle étoile les rappelle sans relancer leur minuterie. */
export function starBubbleAlpha(nowMs, untilMs, hovered) {
  if (hovered) return 1;
  const d = (+untilMs || 0) - (+nowMs || 0);
  if (d >= 0) return 1;
  return Math.max(0, Math.min(1, 1 + d / STAR_BUBBLE_FADE_MS));
}

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
  return { dx: Math.cos(a) * r, dy: -Math.sin(a) * r * 0.38, scale: 1, front: Math.sin(a) < 0, phase: "spin", anchor: 1 };
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
      dy: STAR_JOIN_CRATER_LIFT_PX * (1 - e) + STAR_JOIN_A.dy * e,
      scale: 0.72 + 0.28 * e,
      front: false,                                            // dans le DOS, tout le temps
      phase: "climb",
      anchor: e,                                                // le corps quitte réellement le cratère
    };
  }
  if (t < STAR_JOIN_CLIMB_MS + STAR_JOIN_SPIN_MS)
    return starJoinSpin((t - STAR_JOIN_CLIMB_MS) / STAR_JOIN_SPIN_MS);
  /* Elle se pose : on revient de la dernière position du tour vers zéro, sans
     jamais repasser devant (le tour est fini, elle n'a plus rien à montrer). */
  const k = (t - STAR_JOIN_CLIMB_MS - STAR_JOIN_SPIN_MS) / STAR_JOIN_SETTLE_MS;
  const e = 1 - (1 - k) * (1 - k);
  return { dx: STAR_JOIN_B.dx * (1 - e), dy: STAR_JOIN_B.dy * (1 - e), scale: 1, front: false, phase: "settle", anchor: 1 };
}

/* 465 — Le décollage n'est plus une illusion attachée au joueur. Le point de
   base interpole depuis le centre vivant du cratère jusqu'au joueur ; la courbe
   ci-dessus ne fournit que la progression. Garder cette jointure pure permet au
   banc de prouver les deux extrémités pour la reine comme pour les petites. */
export function starJoinPoint(origin, player, anim) {
  if (!origin || !player) return player || origin || null;
  const k = Math.max(0, Math.min(1, anim && Number.isFinite(anim.anchor) ? anim.anchor : 1));
  return {
    x: origin.x + (player.x - origin.x) * k,
    y: origin.y + (player.y - origin.y) * k,
  };
}

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

/* ⚠️⚠️ ZIP 469 — QUATRE MINI-JEUX SORTENT D'ICI AVEC LEURS RÉGLAGES : la
   PLONGÉE du lac (`STAR_POOL_*`, `STAR_DIVE_*`, `starDivePosts`,
   `starDiveShardX`), le RÂTELIER de la verrerie (`STAR_RACK_*`), la PIE
   (`STAR_MAGPIE_*`, `STAR_LURE_*`) et le DUO orgue/beffroi (`STAR_DUET_*`).
   ⚠️ CE QUI RESTE JUSTE AU-DESSUS EST LE REFROIDISSEMENT (`STAR_COOL_*`), et il
   reste parce qu'il n'a jamais rien eu à voir avec le chant : c'est le mini-jeu de
   la PLAQUE MÉTÉORIQUE, troisième cratère de la ferme, et il est désormais la
   seule chose qu'une fouille puisse ouvrir.
   ⚠️⚠️ AUCUN N'A ÉTÉ « GARDÉ EN RÉSERVE ». La leçon du 453 est formelle : une
   constante que seul le banc lit est débranchée, et on l'a repayée dans le zip
   même qui l'écrivait. Ce qui ne sert plus part ; `git` se souvient pour nous. */

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

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ 462 — CINQ CHUTES, TROIS PLANS ET DEUX IMPACTS ENTENDUS.
   ╚═════════════════════════════════════════════════════════════════════════════
   La chronologie est une donnée pure : le rendu, la caméra, la disparition du
   décor naturel et les bancs lisent les MÊMES instants. Les trois premiers
   fragments sont vus sur leur site ; après le premier, la caméra rend le fermier
   pendant dix secondes, puis enchaîne les sites 2 et 3 sans retour intermédiaire.
   Les deux derniers ne prennent pas la caméra : deux secousses espacées rappellent
   qu'il reste bien cinq lieux à fouiller. */
export const STAR_FARM_IMPACT_MS = [3000, 19500, 23800, 30700, 34700, 39500, 44300, 49000];
/* 480 bis — trois secousses de plus, mêmes règles que les deux dernières
   d'avant (170-1350 ms après l'impact, voir `starFarmShake`, générique sur
   tout `STAR_FARM_IMPACT_MS`) : hors mise en scène caméra (`STAR_FARM_ANIMATED_N`
   reste à 3, aucun des 8 segments de `STAR_FARM_CAMERA` n'est touché). */
export const STAR_FARM_SCENE_MS = 52100;
export const STAR_FARM_ANIMATED_N = 3;
export const STAR_FARM_FLIGHT_MS = 1850;
export const STAR_FARM_CAMERA = [
  { from: 0, to: 1100, a: "player", b: 0 },
  { from: 1100, to: 5000, a: 0, b: 0 },
  { from: 5000, to: 6500, a: 0, b: "player" },
  { from: 16500, to: 17600, a: "player", b: 1 },
  { from: 17600, to: 20800, a: 1, b: 1 },
  { from: 20800, to: 21900, a: 1, b: 2 },
  { from: 21900, to: 25200, a: 2, b: 2 },
  { from: 25200, to: 26700, a: 2, b: "player" },
];
export function starFarmCameraPhase(elapsedMs) {
  const t = Math.max(0, +elapsedMs || 0);
  for (const s of STAR_FARM_CAMERA) if (t >= s.from && t < s.to) {
    const u = (t - s.from) / Math.max(1, s.to - s.from);
    return { ...s, k: u * u * (3 - 2 * u) };
  }
  return null;
}
export function starFarmFlight(elapsedMs) {
  const t = Math.max(0, +elapsedMs || 0);
  for (let i = 0; i < STAR_FARM_ANIMATED_N; i++) {
    const hit = STAR_FARM_IMPACT_MS[i], from = hit - STAR_FARM_FLIGHT_MS;
    if (t >= from && t < hit) return { impact: i, k: (t - from) / STAR_FARM_FLIGHT_MS };
  }
  return null;
}
/* 464 — Une direction FIXE par fragment et une avance monotone. Avant, l'angle
   oscillait toutes les 73 ms dans la boucle de rendu : à plusieurs centaines de
   pixels de l'impact, quatre degrés de variation faisaient zigzaguer le caillou
   sur des dizaines de pixels. La pierre garde son spin dans `fermeArt`; son
   centre, lui, suit désormais une vraie ligne. Les trois angles restent un peu
   différents pour que les chutes ne soient pas des copies superposables. */
export const STAR_FARM_FLIGHT_ANGLES = [0.75, 0.79, 0.77];
export function starFarmFlightPath(impact, k) {
  const i = Math.max(0, Math.min(STAR_FARM_FLIGHT_ANGLES.length - 1, impact | 0));
  const u = Math.max(0, Math.min(1, +k || 0));
  return { angle: STAR_FARM_FLIGHT_ANGLES[i], travel: Math.pow(u, 1.55) };
}
export function starFarmImpactLanded(index, sceneKey, elapsedMs) {
  if ((index | 0) < 0 || (index | 0) >= STAR_FARM_IMPACT_MS.length) return false;
  if (sceneKey !== "fall") return true;
  return (+elapsedMs || 0) >= STAR_FARM_IMPACT_MS[index | 0];
}
export function starFarmShake(elapsedMs) {
  const t = Math.max(0, +elapsedMs || 0);
  let out = 0;
  for (const hit of STAR_FARM_IMPACT_MS) {
    const d = t - hit;
    if (d >= 170 && d < 1350) out = Math.max(out, 1 - (d - 170) / 1180);
  }
  return out;
}

/* Le gros météore est un second événement, déclenché seulement après deux
   minutes de présence active à Valley Town. `fall` reste la pluie de fragments
   de la ferme ; `townFall` ouvre le cratère et les chapitres historiques. */
export const STAR_TOWN_ACTIVE_MS = 2 * 60 * 1000;

export const STAR_FALL_TAIL_MS = 5800;  // ce qui suit le contact : gerbe, onde, colonne, quatre lignes
/* ⚠️ ZIP 469 — `STAR_TURN_MS` est supprimée avec la scène du retournement. Une
   constante que plus personne ne lit est débranchée (leçon du 448, et le 453 l'a
   repayée en gardant une constante « en réserve »). */
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
  const elapsed = +elapsedMs || 0;
  const hits = sceneKey === "fall" ? STAR_FARM_IMPACT_MS
    : sceneKey === "townFall" ? [STAR_FALL_IMPACT_MS] : [];
  let out = 0;
  for (const hit of hits) {
    const t = elapsed - hit;
    if (t >= 0 && t < C.STAR_BANG_MS) out = Math.max(out, 1 - t / C.STAR_BANG_MS);
  }
  return out;
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
  if (sceneKey !== "townFall") return true;
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
/* ⚠️ ZIP 478 — LE CHANTIER A DEUX ADRESSES, PAS UNE. Commander et attendre se
   passent à la SCIERIE (ferme) ; monter se passe sur la CALE (ville). Une seule
   adresse aurait fait pointer le chevron vers la ferme pendant que la pièce
   attend un marteau à Valley Town — c'est-à-dire deux réponses à « où vais-je »,
   le défaut du 449, sur la seule étape que la refonte vient d'ouvrir. */
/* ⚠️ ZIP 479 — LE CHAUDRON EST UNE QUATRIÈME ADRESSE HORS TABLE, pour la même
   raison que la scierie : c'est un endroit où l'on VA, pas une chose qu'on trouve.
   Et comme elle, il peut ne pas exister (il se ramasse dans le monde maléfique) et
   il est DÉPLAÇABLE — sa position se lit donc vivante, côté jeu. */
/* ⚠️⚠️ 2026-09-02 (lot A) — LES TROIS NOUVEAUX ÉTATS DU CRATÈRE POINTENT TOUS LE
   CRATÈRE, ET UN SEUL FAIT EXCEPTION. `craterFeedPay` (« tu as ses lumières, va
   les lui offrir ») et `craterWake` (« réveille-la ») désignent le trou, comme
   `craterHot`/`craterAlone`. Mais `craterFeed` — « il t'en manque » — désigne la
   COURSE DE FUITE, qui n'est pas un lieu de la carte : c'est le même partage que
   `farmImpactLight`/`farmImpactLightPay`, où le premier envoie chercher la
   lumière et le second la rapporter. ⚠️ Sans adresse, `craterFeed` afficherait un
   chevron planté sur un trou où il n'y a rien à faire — la « seconde réponse à où
   vais-je » du 449. Il est donc DÉLIBÉRÉMENT absent de cette table — et cette
   absence est ÉCRITE, pas subie : `verify-quete` refuse tout objectif sans adresse
   qui ne figure pas dans sa liste `NOWHERE` (« chaque objectif a une adresse, ou
   une raison écrite de n'en pas avoir »). */
export const STAR_GOAL_TARGET = { craterHot: "crater", craterAlone: "crater",
  craterFeedPay: "crater", craterWake: "crater", engineer: "townHall",
  /* ⚠️ ZIP 480 — l'audience se tient à la MAIRIE, comme la commande des plans :
     le chevron y mène déjà, il n'y a pas d'adresse neuve à inventer. */
  mayor: "townHall",
  timberOrder: "sawmill", timberWait: "sawmill", timberRaise: "shipyard",
  /* ⚠️ HORS-ZIP — `farmImpactLure` REJOINT LE TRIO CI-DESSOUS. Il était classé
     avec les objectifs qui pointent vers le TROU de l'impact (voir plus bas
     dans `starTargetSite`), alors que le geste qu'il demande — préparer
     l'Essence d'étoile — se passe au CHAUDRON, exactement comme warm/simmer/
     take. Le bandeau le disait déjà ("Prépare une Essence d'étoile au
     chaudron") ; le chevron pointait pourtant ailleurs — deux réponses à « où
     vais-je », le défaut du 449, trouvé par Guillaume en jouant. */
  farmImpactWarm: "cauldron", farmImpactSimmer: "cauldron", farmImpactTake: "cauldron",
  farmImpactLure: "cauldron",
  // 2026-09-02 (lot A2) — voir la note de `STAR_OFF_TABLE_TARGETS` : la place, pas elle.
  townShy: "shyPlaza", townShyAway: "shyPlaza",
  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ 2026-09-03 (lot A3) — LA VERTE N'A AUCUNE ADRESSE, ET C'EST TOUT LE LOT.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ `townGreen` ET `townGreenAway` NE SONT PAS DANS CETTE TABLE, VOLONTAIREMENT.
     La discrète a un domaine annoncé (la place), donc une entrée de domaine à
     désigner ; la verte n'en a pas — Guillaume ne lui a donné que des INDICES.
     Une adresse quelconque (le parc, le cœur de ville) aurait été un domaine
     inventé, c'est-à-dire la chasse de la sixième une seconde fois.
     ⚠️ SEUL `townGreenLed` A UNE CIBLE, et c'est le mode que le joueur a payé
     deux indices pour obtenir : là, le chevron la désigne pour de bon. Sa
     position est résolue par `starTargetPos` (`FermeGame.js`), seul endroit qui
     connaisse les buissons. */
  townGreenLed: "townGreen",
  /* 2026-09-03 (lot C) — MÊME FAMILLE QUE "cauldron" : une adresse hors-table,
     pas un lieu de `STAR_SITES` (elle n'y est pas encore, voir `resolveStarEvilFound`
     un peu plus haut). `starTargetPos` (FermeGame.js) la résout vivante depuis
     `ew.lake`, ou replie sur le passage sombre tant qu'on n'est pas dans le monde
     maléfique — exactement le repli déjà écrit pour le chaudron. */
  evilSeek: "evilLake" };
/* ⚠️⚠️ 2026-09-02 (lot A2) — LE CHEVRON DE LA DISCRÈTE POINTE LA PLACE, PAS ELLE.
   C'est la seule décision de conception de ce lot, et elle se joue là : un chevron
   posé sur sa tête supprime la chasse — il resterait à marcher jusqu'à une flèche,
   ce qui est exactement ce que Guillaume ne demande pas (« elle se cache entre les
   pnj »). Il désigne donc l'ENTRÉE de son domaine ; le reste est à l'œil.
   ⚠️ `shyPlaza` EST UNE ADRESSE HORS TABLE, comme `sawmill` ou `cauldron` : ce
   n'est pas un lieu d'étoile, c'est un endroit de la ville. `FermeGame.js` la
   résout depuis `C.TOWN_PLAZA`, seule source de « où est la place ». */
export const STAR_OFF_TABLE_TARGETS = ["townHall", "sawmill", "shipyard", "cauldron", "shyPlaza", "evilLake"];
export function starTargetSite(e, ctx) {
  const goal = starGoalKey(e, ctx);
  if (!goal) return null;
  /* ⚠️ ZIP 475 — `farmImpactTame`/`farmImpactCool` DÉSIGNENT LE MÊME TROU QUE
     `farmImpacts`, JUSTE À UN AUTRE INSTANT (voir `starGoalKey`) : le chevron
     continue de pointer le premier impact manquant, qu'il soit encore intact
     ou déjà fouillé et en attente. */
  /* ⚠️ ZIP 479 (+1 clé hors-zip) — LES QUATRE CLÉS QUI ENVOIENT AU CHAUDRON
     SONT TRAITÉES AVANT : elles désignent un ATELIER, pas le trou. Sans cette
     sortie, le chevron aurait pointé le cratère rose (ou blanc) pendant qu'on
     demande d'aller cuisiner ailleurs — deux réponses à « où vais-je », le
     défaut du 449. */
  if (STAR_GOAL_TARGET[goal] === "cauldron") return "cauldron";
  /* hors-zip — `farmImpactLureGive` REJOINT LE GROUPE QUI POINTE LE TROU, PAS
     LE CHAUDRON. Signalé par Guillaume en jouant : une fois la fiole
     préparée, le chevron restait planté sur l'atelier déjà quitté au lieu de
     désigner le trou blanc où elle attend. `farmImpactLure` (sans la fiole)
     reste seul dans le groupe « chaudron » juste au-dessus — c'est la
     PHRASE, dérivée de `ctx.potion` par `starTameGoalKey`, qui fait basculer
     le chevron d'un groupe à l'autre, jamais un test répété ici. */
  if (goal === "farmImpacts" || goal === "farmImpactCool"
      || goal === "farmImpactTame" || goal === "farmImpactLight"
      || goal === "farmImpactLightPay" || goal === "farmImpactCarry"
      || goal === "farmImpactLureGive") {
    /* hors-zip — MÊME CONDITION DE FOCUS QUE `starGoalKey`, LIGNE POUR LIGNE.
       `goal` a déjà été dérivé du site personnel s'il y en a un ; cette branche
       doit désigner CE MÊME site, pas rejouer sa propre recherche du premier de
       la table — sinon le chevron pointerait un trou pendant que le bandeau
       parle d'un autre, exactement le défaut du 449/479 qu'un commentaire plus
       haut promet déjà d'éviter. */
    const missing = starMissing(e);
    const id = (ctx && ctx.focus && missing.includes(ctx.focus)) ? ctx.focus
      : missing.find(k => STAR_SITE[k] && STAR_SITE[k].spot === "starFarmImpact");
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
   l'ÉTOILE — or `starCompanionsAt` rend une liste vide tant qu'aucune étoile n'est sortie
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
/* ╔══════════════════════════════════════════════════════════════════════════════
   ║ ZIP 479 — LES TROIS VERBES, EN NOMBRES. (lot 3b, défauts 3, 9 et 10 de
   ║ l'audit 477)
   ╚══════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ TOUT CE BLOC EST PUR ET VIT ICI POUR LA MÊME RAISON QUE `starFacingAway` :
   le jeu ET le banc doivent lire la MÊME règle. Une seconde écriture du « bord
   opposé » ou du « plat encore chaud » donnerait l'ambiguïté la plus détestable
   du dépôt — « chez moi elle sort, chez toi non » (444). */

/* ── LA BLEUE. LE PRIX EST LU DANS LE CODE, PAS DEVINÉ.
   ⚠️⚠️ DÉCISION DE GUILLAUME : l'offrande se paie en BONBONS de Temple Run.
   Ils existent depuis le zip 372 (`f.inv.candies`), ils sont persistés, plafonnés
   par course, arbitrés par l'hôte — et ils n'ont **aucun usage** depuis. C'est
   leur premier.
   ⚠️ 60 EST CALIBRÉ SUR `RUN_MAX_CANDIES_PER_RUN` ET SUR CE QUE LE CODE DIT D'UNE
   TRÈS BONNE COURSE (≈ 140 bonbons en trois minutes, voir `fermeConstants.js`) :
   60 = une course moyenne, un détour de trois minutes, jamais un grind.
   ⚠️⚠️ ET ILS DOIVENT AVOIR ÉTÉ RAPPORTÉS **DEPUIS LA CHUTE** (« la lumière bleue
   s'éteint en dormant »). C'est ce qui empêche le stock dormant d'une vieille
   ferme d'acheter le chapitre d'avance — et c'est aussi ce qui fait du geste un
   VOYAGE et pas une ligne d'inventaire. Le compteur frais est `e.candy`, un FLUX ;
   `f.inv.candies` reste le STOCK. Deux grandeurs différentes, donc deux champs :
   ce n'est pas le doublon du §8 de `CLAUDE.md`, c'est son contraire (dériver le
   flux du stock est impossible — le stock ne se souvient pas d'où il vient). */
export const STAR_CANDY_PRICE = 60;
/* hors-zip — LA LUEUR S'ÉTEINT POUR DE VRAI, CINQ MINUTES APRÈS LA FIN DE LA
   COURSE. Décision de Guillaume (deux options posées, celle-ci choisie) :
   « la lumière bleue s'éteint en dormant » ci-dessus ne décrivait jusqu'ici
   que « avant la chute » (voir `resolveStarCandy`) — le flux, lui, était
   éternel une fois la chute passée. Il ne l'est plus : `STAR_CANDY_FRESH_MS`
   borne combien de temps `candy` reste utilisable APRÈS le dernier ramassage,
   pas depuis la chute. */
export const STAR_CANDY_FRESH_MS = 5 * 60 * 1000;
/* ⚠️⚠️⚠️ 2026-08-31 — LA FRAÎCHEUR NE COURT PAS PENDANT QU'ON NE PEUT PAS AGIR,
   ET C'EST UN CORRECTIF DE BLOCAGE, PAS UN CONFORT. Les deux horloges existaient
   depuis le 479 et personne ne les avait comparées : la lueur durait CINQ
   minutes, la blessure de fin de course en durait DIX (`C.RUN_INJURED_MS`), et
   `doAction()` refuse tout tant qu'on est blessé. Or `resolveStarCandy` crédite
   « réussie ou ratée » — donc **toute défaite** rendait la lumière morte avant
   que le joueur puisse marcher. Pas un cas limite : cent pour cent des défaites,
   pendant que l'écran de fin promettait « les bonbons ramassés sont conservés ».
   ⚠️ La parade est de dater l'échéance depuis l'instant où le joueur REDEVIENT
   capable d'offrir, pas depuis le ramassage : cinq minutes de jeu réel, ce que
   la décision de Guillaume voulait dire. La règle « on rapporte une lumière
   FRAÎCHE » est intacte — c'est le décompte d'un temps qu'on ne peut pas
   utiliser qui ne l'était pas.
   ⚠️⚠️ ET LE REPORT EST BORNÉ, PARCE QUE `readyAt` VIENT D'UN CHAMP QUE L'HÔTE
   RECOPIE D'UNE REQUÊTE CLIENT (`f.injuredUntil`). Le plafond est DÉRIVÉ de la
   blessure la plus longue que la course puisse infliger, jamais réglé à la main
   (§8 de `CLAUDE.md` : un paramètre qui en double un autre est une divergence en
   attente) : un client modifié ne peut donc pas s'offrir une lueur éternelle en
   annonçant une blessure de trois ans.
   ⚠️ C'est la forme 458 — deux grandeurs qui s'opposent — appliquée au TEMPS :
   `verify-quete` §bleue les mesure désormais ENSEMBLE, jamais chacune de son
   côté, parce que chacune était juste toute seule. */
export const STAR_CANDY_HOLD_MAX_MS = C.RUN_INJURED_MS;
/* Ce qu'un joueur a rapporté depuis la chute, ET qui n'est pas encore périmé.
   ⚠️ PAR JOUEUR ET PAS COMMUN, comme les bonbons eux-mêmes (`fermeEngine.js` :
   « le défi est individuel, personne ne court à deux »). Mettre l'offrande en
   commun aurait fait payer la course d'un seul par la poche de l'autre.
   ⚠️⚠️ `now` EST L'HORLOGE DE QUI LIT, JAMAIS CELLE QUI A ÉCRIT `candyUntil`
   (§3 de CLAUDE.md) : `resolveStarCandy` pose une échéance ABSOLUE avec SA
   propre horloge (celle de l'hôte) ; ce lecteur compare cette échéance à la
   sienne, hôte ou invité, sans jamais comparer deux horloges entre elles.
   ⚠️ SANS ÉCHÉANCE VALIDE (sauvegarde d'avant cette décision, ou candy jamais
   ramassé depuis), ON TRAITE COMME PÉRIMÉ, PAS COMME ÉTERNEL — c'est le
   changement de contrat : avant, l'absence de champ voulait dire « toujours
   frais » ; maintenant, une lueur ne peut plus être frais sans un ticket
   d'échéance qui le prouve. */
export function starCandyFresh(e, who, now) {
  const raw = Math.max(0, (e && e.candy && +e.candy[who]) || 0);
  if (!raw) return 0;
  if (now === undefined) return raw;   // repli seulement pour un appelant qui ne date pas encore sa lecture
  const until = (e && e.candyUntil && +e.candyUntil[who]) || 0;
  return (+now < until) ? raw : 0;
}
/* L'offrande a-t-elle été faite sur CE trou ? ⚠️ UN DICTIONNAIRE PAR LIEU, pas un
   booléen : le jour où une seconde étoile se paierait en lumière, rien à changer. */
export function starLit(e, id) { return !!(e && e.offer && e.offer[id]); }

/* ── LA ROSE. « ELLE NE VIENT PAS AU CALME, ELLE VIENT À LA CHALEUR. »
   ⚠️⚠️ LE GESTE EST LE CHEMIN, et c'est la seule mécanique de la quête où le
   monde entre en jeu : la distance entre le chaudron (que les joueurs ont posé
   où ils voulaient) et le trou rose est une donnée de LEUR ferme, pas du code.
   ⚠️⚠️ LA JAUGE EST GÉNÉREUSE, ET LE CHIFFRE EST MESURÉ CONTRE LA CARTE : la
   diagonale de la ferme fait √(180² + 140²) ≈ 228 cases, soit ≈ 44 s à
   `PLAYER_SPEED` (5,2 cases/s). Trois minutes laissent donc **quatre fois** le
   pire trajet en ligne droite : le plat passe avec de la marge même en
   contournant, et il ne refroidit que si l'on s'arrête vraiment. Le banc tient ce
   rapport (§plat) — sans lui, agrandir la carte ferait mourir le plat en silence.
   ⚠️ CUIRE EST COURT EXPRÈS : vingt secondes, le temps que l'autre joueur se
   place pour le relais. Un second sablier de plusieurs minutes aurait refait le
   chantier naval d'avant le 478, à l'échelle d'un plat. */
export const STAR_DISH_COOK_MS = 20000;
export const STAR_DISH_HOT_MS = 180000;
/* Où en est le plat. ⚠️ TROIS RÉPONSES ET UNE SEULE FONCTION (leçon 449) : la
   jauge, l'invite et l'arbitre lisent la même. Rend `null` s'il n'y a pas de plat.
     · `cook`  — il mijote au chaudron, personne ne le porte encore ;
     · `carry` — quelqu'un le porte, il refroidit ;
     · `cold`  — il est perdu. On ne l'efface PAS ici : effacer est un geste
       d'arbitre (`resolveStarDishTick`), et une fonction de lecture qui modifie
       l'état est la pire chose qu'on puisse donner à un banc. */
export function starDishPhase(e, now) {
  const d = e && e.dish;
  if (!d || !d.at) return null;
  const t = (+now || 0) - d.at;
  if (d.phase === "cook") return t >= STAR_DISH_COOK_MS ? "ready" : "cook";
  return t >= STAR_DISH_HOT_MS ? "cold" : "carry";
}
/* La chaleur qui reste, de 1 à 0. ⚠️ ELLE SE DÉRIVE DE LA DATE, elle n'est jamais
   stockée : un troisième champ à faire vieillir pour une barre qui se recalcule en
   une soustraction, c'est le §3 pris à l'envers (même raison que
   `starTimberProgress`). Pendant la cuisson elle vaut 1 — rien ne refroidit encore. */
export function starDishHeat(e, now) {
  const ph = starDishPhase(e, now);
  if (!ph || ph === "cold") return 0;
  if (ph !== "carry") return 1;
  return Math.max(0, Math.min(1, 1 - ((+now || 0) - e.dish.at) / STAR_DISH_HOT_MS));
}
export function starDishHolder(e) { return (e && e.dish && e.dish.phase === "carry" && e.dish.by) || null; }
/* Qui a tenu le plat AVANT celui qui le porte. ⚠️ Rend `""` quand il n'y a
   personne — un plat cuisiné et porté par la même personne n'a pas de second, et
   inventer un nom serait pire que de n'en dire aucun. */
export function starDishMate(e, who) {
  const f = e && e.dish && e.dish.from;
  return f && f !== who ? f : "";
}

/* ── LA REINE. DEUX PRÉSENCES, AUX BORDS OPPOSÉS, DOS À DOS.
   ⚠️⚠️ « AU BORD » N'EST PAS « DANS LE TROU » : le grand cratère se DESCEND (c'est
   tout le mini-jeu de la glissade, 458/459), donc deux joueurs qui tombent au fond
   se retrouvent côte à côte quoi qu'ils fassent. Le fond ne peut pas porter ce
   geste ; la lèvre, si. `STAR_QUEEN_EDGE_K` est la fraction de rayon au-delà de
   laquelle on est « au bord ».
   ⚠️⚠️ ET LE SOLO N'EST PAS UNE BRANCHE, C'EST UN FIGURANT. On plante son
   ÉPOUVANTAIL en face (`e.effigy`) et on tient soixante secondes au lieu de vingt.
   Le duo reste un RACCOURCI, jamais une serrure (458) : aucune configuration de
   joueurs ne peut bloquer la reine, et « moins satisfaisant en solo » devient de
   la FICTION — elle ne sort qu'à moitié (`STAR_QUEEN_HALF`) — au lieu d'un barème
   qu'on subit sans le comprendre.
   ⚠️ UN ÉPOUVANTAIL N'A PAS DE REGARD, DONC IL EST TOUJOURS « DOS TOURNÉ » : on le
   plante face au large, c'est ce qu'un épouvantail fait. Écrire l'inverse aurait
   demandé une direction à un objet qui n'en a pas, et le joueur n'aurait eu aucun
   moyen de la corriger. */
export const STAR_QUEEN_MS = 20000;        // à deux joueurs
export const STAR_QUEEN_SOLO_MS = 60000;   // seul, avec l'épouvantail en face
export const STAR_QUEEN_EDGE_K = 0.55;     // fraction du rayon : au-delà, on est « au bord »
export const STAR_QUEEN_OPP_DOT = -0.45;   // les deux écarts au centre doivent s'opposer (≈ 117°)
export const STAR_QUEEN_HALF = 0.5;        // seul : elle ne sort qu'à moitié du trou (fiction, pas barème)
/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 2026-09-02 (lot A) — LA REINE SE NOURRIT, PUIS SE RÉVEILLE, PUIS SE CALME.
   ╚══════════════════════════════════════════════════════════════════════════
   Demande de Guillaume : `pair` n'est plus le geste ENTIER de la reine, il en est
   le DERNIER étage. Avant lui viennent une offrande (`resolveStarLight`, la même
   lumière bleue que la petite, rapportée de la course de fuite) et un réveil au
   rythme (`resolveStarWake`).
   ⚠️⚠️ LE PRIX EST À 80 ALORS QUE LA BLEUE EST À 60, ET C'EST DÉLIBÉRÉ : Guillaume
   a tranché « 80, avec la corvée des bonbons sur le templerun ». Le chiffre a été
   posé APRÈS avoir constaté que la bleue coûtait déjà exactement 60 — deux « va
   chercher 60 choses » d'affilée auraient donné au joueur l'impression de refaire
   l'étape précédente. Un écart visible dit que c'est une AUTRE étoile, plus chère.
   ⚠️ ET LE PRIX NE SE LIT NULLE PART À LA MAIN : `starOfferPrice` est la seule
   réponse à « combien coûte cette étoile », pour l'arbitre, pour le bandeau, pour
   l'invite et pour le banc. C'est le §8 de `CLAUDE.md` appliqué avant la faute :
   deux constantes existent, mais un seul endroit choisit laquelle. */
export const STAR_QUEEN_PRICE = 80;
/* ⚠️ ELLE REND 0 POUR TOUT LIEU QUI NE SE PAIE PAS, et c'est ce zéro qui sert de
   test partout ailleurs (`starOfferPrice(id) > 0` remplace « le verbe est-il
   light ? »). Ajouter une étoile payante un jour, c'est ajouter une ligne ICI —
   pas retrouver les quatre endroits qui testaient un verbe. */
export function starOfferPrice(id) {
  const s = STAR_SITE[id];
  if (!s) return 0;
  if (s.queen) return STAR_QUEEN_PRICE;
  return starVerbOf(id) === "light" ? STAR_CANDY_PRICE : 0;
}

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 2026-09-02 (lot A) — LE RÉVEIL AU RYTHME. « SON CŒUR REPART. »
   ╚══════════════════════════════════════════════════════════════════════════
   Guillaume, sur la mécanique du martèlement : « nouvelle mécanique à inventer,
   tu jugeras. faut pas cacher avec un overlay trop gros. »
   ⚠️⚠️ LES DEUX PATRONS D'APPUI DU DÉPÔT ONT DONC ÉTÉ ÉCARTÉS, ET IL FAUT SAVOIR
   POURQUOI AVANT D'ÊTRE TENTÉ DE LES REPRENDRE : `BarnMinigame` et
   `WolfBiteMinigame` sont tous les deux des PANNEAUX PLEIN ÉCRAN (`ferme-fish-ov`),
   c'est-à-dire très exactement ce que la consigne interdit — ils cacheraient
   l'étoile au moment où elle passe du gris au jaune, donc ils cacheraient la seule
   chose que ce geste a à montrer.
   ⚠️ CE QUI SE DESSINE À LA PLACE EST UN ANNEAU QUI SE CONTRACTE AU-DESSUS DU
   CRATÈRE, dans le monde, à l'échelle du décor (voir `starWakeDraw`, FermeGame.js).
   On frappe quand il traverse la bande cible. La mécanique est donc du RYTHME et
   pas du martèlement aveugle : taper le plus vite possible ne donne rien, parce
   qu'un appui hors bande RETIRE un battement.
   ⚠️⚠️ ET LE TEMPO ACCÉLÈRE PARCE QUE C'EST UN CŒUR QUI REPART, pas parce qu'il
   faut « augmenter la difficulté » : chaque battement réussi raccourcit la période
   (`STAR_WAKE_STEP_MS`) jusqu'à un plancher. La difficulté est une CONSÉQUENCE de
   la fiction, ce qui est la seule façon qu'un réglage se laisse expliquer au
   joueur sans texte.
   ⚠️ TOUS CES NOMBRES SONT DE MOI, PAS DE GUILLAUME (« tu jugeras ») : ils sont
   donc à juger en jouant, comme les trois nombres de la scierie (§13 de
   `CLAUDE.md`). Repère de lecture : huit battements, de 1,10 s à 0,79 s, soit
   ~7,5 s de geste si l'on ne rate rien. */
export const STAR_WAKE_HITS = 8;            // battements à placer pour la réveiller
export const STAR_WAKE_PERIOD_MS = 1100;    // période du premier battement
export const STAR_WAKE_STEP_MS = 45;        // ce que chaque réussite retire à la période
export const STAR_WAKE_MIN_MS = 700;        // plancher : en dessous, ce n'est plus jouable au doigt
export const STAR_WAKE_BAND_A = 0.74;       // début de la bande cible, en fraction de période
export const STAR_WAKE_BAND_B = 0.96;       // fin de la bande — 22 %, soit 242 ms au départ, 172 ms au bout
export const STAR_WAKE_IDLE_BEATS = 3;      // battements sans aucun appui avant que l'anneau s'efface
/* ⚠️ PURE ET EXPORTÉE POUR QUE LE BANC LA JOUE : c'est la seule règle du réveil
   qui décide quelque chose, donc c'est la seule qu'il faut pouvoir rejouer sans
   navigateur (le reste est du dessin). */
export function starWakeOnBeat(phase) {
  const p = +phase || 0;
  return p >= STAR_WAKE_BAND_A && p <= STAR_WAKE_BAND_B;
}
/* La période du battement n° `hits` — DÉRIVÉE, jamais une table. */
export function starWakePeriod(hits) {
  return Math.max(STAR_WAKE_MIN_MS, STAR_WAKE_PERIOD_MS - (Math.max(0, hits | 0) * STAR_WAKE_STEP_MS));
}
/* ⚠️ « À QUEL POINT EST-ELLE RÉVEILLÉE » — 0 gris, 1 jaune. Le dessin en dépend,
   et le joueur ne lit QUE ça : la jauge n'est pas un chiffre affiché, c'est la
   couleur de l'étoile elle-même. Une seule écriture, sinon la barre et la teinte
   divergeraient (défaut du 456, « une barre qui promet et ment »). */
export function starWakeGlow(hits) {
  return Math.max(0, Math.min(1, (Math.max(0, hits | 0)) / STAR_WAKE_HITS));
}
/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 2026-09-03 (lot B) — LA VRAIE COMPAGNE PULSE AVEC L'ANNEAU.
   ╚══════════════════════════════════════════════════════════════════════════
   Guillaume a tranché contre un écran dédié : « l'étoile de l'animation doit
   ressembler exactement trait pour trait à l'étoile réelle […] réduite à un
   pulse, sans changer de scène ». Ce que le joueur voit reste donc le sprite
   `starWispSprite` qu'il connaît déjà (`FermeGame.js`, `drawStarWisp`), et rien
   de plus — pas de géométrie, pas de nouvel écran.
   ⚠️ TROIS BANDES, PAS UN DÉGRADÉ : le sprite n'a que trois états rastérisés
   (0/1/2), donc « trait pour trait » veut dire CHOISIR entre ces trois dessins,
   jamais une teinte inventée qui n'existe dans aucun d'eux. */
export function starWakeCompanionState(hits) {
  const g = starWakeGlow(hits);
  return g >= 0.75 ? 0 : g >= 0.34 ? 1 : 2;
}
/* Le pouls pendant qu'on tape : une respiration calée sur `phase`, LA MÊME
   horloge que l'anneau (`drawStarWakeRing`) — deux pouls qui ne battraient pas
   ensemble se remarqueraient plus qu'un pouls absent. Elle s'amplifie avec
   `hits` : « lente » puis « animée », jamais l'inverse. */
export function starWakeCompanionPulse(phase, hits) {
  const g = starWakeGlow(hits);
  const ph = Math.max(0, Math.min(1, +phase || 0));
  return 1 + 0.05 * (0.35 + 0.65 * g) * Math.sin(ph * Math.PI * 2);
}
/* ⚠️ NOMBRE PROVISOIRE, DATE DU JOUR : la durée du pouls de succès, à juger en
   jouant comme les six nombres du réveil au rythme (CLAUDE.md §2/§13). */
export const STAR_WAKE_POP_MS = 1300;
/* Le battement du SUCCÈS : un seul, plus grand que ceux de la frappe, qui
   s'éteint tout seul. `elapsedMs` est le temps écoulé depuis la frappe gagnante
   (mesuré côté client, jamais diffusé — voir la note de `starWakePress`,
   FermeGame.js) ; hors de la fenêtre, `null` : l'appelant retombe alors sur le
   dessin par défaut, sans qu'aucun état ne reste à réconcilier. */
export function starWakeCompanionPop(elapsedMs) {
  const t = +elapsedMs;
  if (!(t >= 0) || t >= STAR_WAKE_POP_MS) return null;
  const u = t / STAR_WAKE_POP_MS;
  return { state: 0, scale: 1 + 0.35 * Math.exp(-u * 4.5) * Math.cos(u * Math.PI * 2.2) };
}
/* Elle dort-elle encore ? ⚠️ `e.woke` est un DICTIONNAIRE de lieux, pas un
   booléen de reine : la septième sœur se réanimera par le même geste (master
   prompt §3.10), et une seconde carte à réconcilier est ce que le §3 de
   `CLAUDE.md` interdit. */
export function starWoke(e, id) { return !!(e && e.woke && e.woke[id]); }

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 2026-09-02 (lot A2) — OÙ SE CACHE LA DISCRÈTE. UNE HORLOGE, PAS UN ÉTAT.
   ╚══════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ ELLE NE VOYAGE PAS SUR LE RÉSEAU, ET C'EST LE PATRON DÉJÀ ÉCRIT CINQ FOIS
   DANS CE DÉPÔT (jour de marché, service de Carla, jour d'orage, cours du marché,
   élections) : **une pure fonction du temps, jamais un état**. Un champ « où est
   la discrète » aurait été un champ de plus à réconcilier (§3 de `CLAUDE.md`)
   pour une information que les deux clients savent déjà calculer.
   ⚠️⚠️ L'ORIGINE DU TEMPS EST `e.townFall`, C'EST-À-DIRE UNE DATE DE L'HÔTE DÉJÀ
   PARTAGÉE — jamais l'horloge locale seule. Les deux clients comptent donc les
   mêmes créneaux depuis le même instant ; il ne reste entre eux que leur dérive
   d'horloge, de l'ordre de la seconde, sur un créneau de cinquante.
   ⚠️⚠️⚠️ ET C'EST POUR ÇA QUE L'ARBITRE TOLÈRE LE CRÉNEAU VOISIN (voir
   `resolveStarSpot`). Sans cette tolérance, un joueur qui la repère à la dernière
   seconde d'un créneau se verrait refuser en SILENCE, parce que l'hôte serait déjà
   passé au suivant — un refus qu'il ne pourrait ni comprendre ni reproduire, et
   qui ressemblerait trait pour trait à « la touche est cassée ».
   ⚠️ LES PLANQUES ELLES-MÊMES NE SONT PAS ICI : elles se dérivent de la CARTE de
   la ville (bancs et cases libres entre la place et le parc), que ce fichier n'a
   pas. `FermeGame.js` les énumère, ce fichier ne dit que LAQUELLE. C'est le même
   partage que le cratère, dont la position vient d'un balayage de la carte. */
export const STAR_SHY_PERIOD_MS = 50000;   // elle change de planque toutes les 50 s
/* ⚠️ HORS-ZIP 2026-09-03 — CAPTURE AU CONTACT, PLUS AU BOUTON. Demande de
   Guillaume : sa zone (place ↔ parc, pleine de passants) est trop occupée pour
   viser une touche E au bon moment — « il faut que l'apprivoisement soit
   simple ». Rayon COURT, exprès plus petit que l'ancienne invite (1,6 case) :
   on doit lui MARCHER DESSUS, pas la capturer en passant à côté sans le
   vouloir. */
export const STAR_SHY_CATCH_R = 0.9;
/* ⚠️ HORS-ZIP 2026-09-03 — LE CHANGEMENT DE PLANQUE SE VOIT, IL NE SE
   TÉLÉPORTE PLUS. Signalé par Guillaume : « elle se téléporte, c'est pas
   normal ». Même famille que `STAR_GREEN_MOVE_MS` (le saut de buisson) : une
   fenêtre COURTE au DÉBUT de chaque créneau, pendant laquelle elle file de son
   ancienne planque à la nouvelle — pure fonction du temps partagé, donc les
   deux clients la voient courir au même instant sans qu'un message ne parte.
   Volontairement plus courte que le saut de la verte (celle-ci traverse tout
   le domaine place↔parc, pas juste le buisson voisin : une fenêtre longue la
   ferait glisser au ralenti sur une grande distance, ce qui se lit comme un
   bogue de vitesse, pas comme une fuite). */
export const STAR_SHY_MOVE_MS = 900;
export function starShySlot(e, now) {
  const t0 = (e && +e.townFall) || 0;
  if (!t0) return 0;
  return Math.max(0, Math.floor(((+now || 0) - t0) / STAR_SHY_PERIOD_MS));
}
/* ⚠️ LE CRÉNEAU NE SE LIT PAS DIRECTEMENT COMME UN INDICE : `slot % n` la ferait
   tourner en rond, toujours dans le même ordre, et un joueur qui a fait la quête
   une fois saurait où regarder. Un haché entier casse le cycle sans rien coûter —
   même famille que le hasard rejouable de `scierie.js` (aucune transcendante,
   aucun `Math.random`, donc les deux clients tombent sur le même nombre). */
export function starShyPick(n, slot) {
  const c = Math.max(1, n | 0);
  let h = (Math.max(0, slot | 0) + 0x9e37) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 0x5bd1) >>> 0;
  h = (h ^ (h >>> 11)) >>> 0;
  return h % c;
}
/* ⚠️ ELLE S'ASSIED UNE FOIS SUR TROIS, ET C'EST DÉRIVÉ DU MÊME HACHÉ — pas d'un
   second tirage, qui aurait pu dire « assise » chez l'un et « debout » chez
   l'autre. Guillaume : « parfois sur un banc, parfois circulant normalement ».
   Une planque qui n'est pas un banc la laisse debout quoi qu'il arrive :
   l'appelant le sait, ce fichier ne connaît pas les bancs. */
export function starShySits(slot) {
  return starShyPick(3, (Math.max(0, slot | 0) ^ 0x2f1b)) === 0;
}

/* ⚠️⚠️ L'ARBITRE DE LA DISCRÈTE. Il ne vérifie PAS la distance, et c'est le même
   contrat que la fouille (469) : le client teste la proximité, l'hôte tient la
   RÈGLE. Ce qui compte est que l'arbitrage soit unique, et l'idempotence le tient.
   ⚠️ CE QU'IL TIENT VRAIMENT : on ne peut pas la trouver avant la reine. C'est
   elle qui apprend au joueur que la discrète existe — sans cette garde, un joueur
   qui passerait par hasard sur sa case l'apprivoiserait avant d'avoir entendu
   parler d'elle, et le chapitre entier perdrait sa raison d'être. */
export function resolveStarSpot(e, who, now, name) {
  const id = "townShy";
  if (starVerbOf(id) !== "spot") return { ok: false };
  if (starHas(e, id)) return { ok: false, already: true };
  if (!starHas(e, "crater")) return { ok: false, noQueen: true };
  const byName = name || String(who || "");
  return { ...resolveStarFound(e, id, byName, now), site: id, opened: true };
}

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 2026-09-03 (lot A3) — LA VERTE : UNE MARCHE DE BUISSON EN BUISSON, PAS UN
   ║ TIRAGE.
   ╚══════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ C'EST LA DIFFÉRENCE DEMANDÉE PAR GUILLAUME, ET ELLE EST STRUCTURELLE :
   *« elle ne peut aller que de buisson en buisson et pas se téléporter d'une zone
   de la map à une autre. on doit voir l'animation de déplacement ».* La discrète
   TIRE sa planque à chaque créneau (`starShyPick`) — elle peut donc passer de la
   place au parc sans traverser l'espace, ce qui est invisible parce que personne
   ne la voit partir. Ici on la VOIT partir : un tirage indépendant se lirait comme
   un défaut d'affichage (« elle a clignoté d'un bout à l'autre de la rue »).
   ⚠️ DONC L'ÉTAT EST UN CHEMIN, ET UN CHEMIN NE SE DEVINE PAS D'UN CRÉNEAU : on
   REJOUE la marche depuis le début. C'est ce qui la garde PURE — aucun état
   diffusé, aucune position à réconcilier, exactement comme la discrète — au prix
   d'une boucle bornée ci-dessous.
   ⚠️⚠️ LE VOISINAGE N'EST PAS ICI. Ce fichier ne connaît pas la carte : il reçoit
   une table d'adjacence (`neigh[i]` = les buissons atteignables depuis le i-ième)
   que `FermeGame.js` dérive des décors mous. Même partage que la discrète — *lui
   énumère les planques, ce fichier dit laquelle* — et c'est ce qui permet au banc
   de la faire marcher sur un graphe fabriqué, sans générer une ville. */
export const STAR_GREEN_PERIOD_MS = 75000;   // elle change de buisson toutes les 75 s
export const STAR_GREEN_MOVE_MS = 1700;      // la course visible d'un buisson à l'autre
export const STAR_GREEN_HOP = 9;             // portée d'un saut, en cases (le voisinage)
export const STAR_GREEN_NEAR = 1.6;          // portée de l'invite — celle de la discrète
export const STAR_GREEN_HINTS = 2;           // « chaud/froid » gratuits avant le guidage
/* ⚠️ HORS-ZIP 2026-09-03 — LE COUP D'ŒIL : demande de Guillaume, « passer dans le
   buisson permet déjà d'animer l'étoile qui sort et replonge ». Purement
   cosmétique et purement LOCAL (comme le frisson du buisson) — aucun état
   partagé, donc ces deux nombres se règlent sans toucher au reste du lot.
   ⚠️ COOLDOWN, PAS UNE FOIS POUR TOUJOURS : passer une seconde fois doit
   pouvoir la faire réagir de nouveau, juste pas en boucle si le joueur piétine
   la case (décision de Guillaume, 2026-09-03). */
export const STAR_GREEN_PEEK_MS = 700;         // durée du coup d'œil (sortie + replongée)
export const STAR_GREEN_PEEK_COOLDOWN_MS = 6000; // avant qu'elle puisse rejouer sur LE MÊME buisson
/* ⚠️ LA MARCHE EST BORNÉE À 2 000 PAS (≈ 41 h de créneaux), et le report se fait
   sur une GRAINE, pas sur un saut : au-delà, on repart d'un buisson tiré depuis le
   numéro de tranche et on ne rejoue que le reste. Sans borne, une sauvegarde
   reprise trois jours plus tard ferait tourner cette boucle des dizaines de
   milliers de fois PAR IMAGE. La rupture tombe une fois toutes les quarante
   heures, sur un déplacement que personne ne regarde. */
const GREEN_WALK_CAP = 2000;
export function starGreenSlot(e, now) {
  const t0 = (e && +e.townFall) || 0;
  if (!t0) return { slot: 0, moving: false, k: 1 };
  const d = Math.max(0, (+now || 0) - t0);
  const slot = Math.floor(d / STAR_GREEN_PERIOD_MS);
  const into = d - slot * STAR_GREEN_PERIOD_MS;
  /* ⚠️ ELLE COURT AU DÉBUT DU CRÉNEAU, PAS À LA FIN : le créneau porte donc son
     buisson d'ARRIVÉE, et « où est-elle » a une seule réponse pendant 73 des
     75 secondes. L'inverse aurait demandé de connaître le buisson suivant pour
     dire où elle est maintenant, c'est-à-dire un pas de plus à chaque lecture. */
  if (slot > 0 && into < STAR_GREEN_MOVE_MS)
    return { slot, moving: true, k: into / STAR_GREEN_MOVE_MS };
  return { slot, moving: false, k: 1 };
}
/* ⚠️ MÊME HACHÉ QUE LA DISCRÈTE (`starShyPick`), pour la même raison : `slot % n`
   la ferait passer par les buissons toujours dans le même ordre, et un joueur qui
   a fait la quête une fois saurait où regarder. Le haché prend ici DEUX entrées
   (le buisson courant et le créneau) — sans le buisson, deux positions différentes
   choisiraient le même rang de voisin, ce qui est un cycle déguisé. */
function greenPick(n, cur, slot) {
  const c = Math.max(1, n | 0);
  let h = ((Math.max(0, cur | 0) + 0x2f6f) ^ (Math.max(0, slot | 0) * 0x9e37 + 0x85eb)) >>> 0;
  h = (h ^ (h >>> 15)) >>> 0;
  h = Math.imul(h, 0x2545) >>> 0;
  h = (h ^ (h >>> 12)) >>> 0;
  return h % c;
}
/* Le buisson qu'elle occupe au créneau `slot`. Rend un INDEX dans `neigh`, ou −1
   quand il n'y a pas de buisson du tout (carte absente chez ce client : le §4 dit
   qu'on ACCEPTE au lieu de refuser, donc l'appelant ne la dessine simplement pas).
   ⚠️ UN BUISSON SANS VOISIN NE LA PIÈGE PAS : elle y reste, et c'est la seule
   réponse honnête — la faire sauter ailleurs serait la téléportation qu'on
   s'interdit. Le banc vérifie qu'aucun buisson retenu n'est dans ce cas. */
export function starGreenWalk(neigh, slot) {
  const n = (neigh && neigh.length) | 0;
  if (!n) return -1;
  const s = Math.max(0, slot | 0);
  const era = Math.floor(s / GREEN_WALK_CAP);
  let cur = greenPick(n, 0x1d7b, era);                 // le buisson de départ de la tranche
  for (let i = s - era * GREEN_WALK_CAP; i > 0; i--) {
    const around = neigh[cur];
    if (!around || !around.length) continue;
    cur = around[greenPick(around.length, cur, s - i + 1)];
  }
  return cur;
}
/* ⚠️⚠️ LE BUISSON REMUE PARCE QU'ELLE EST DEDANS, ET C'EST L'INDICE PREMIER
   (Guillaume : *« l'indicateur premier est le mouvement du buisson quand il est
   occupé »*). Il ne peut donc pas ressembler au frisson de quelqu'un qui traverse
   (`townBushLean`, hors-zip 2026-09-02) : celui-là COUCHE le feuillage d'un coup
   tant qu'on est dedans, puis le laisse osciller en sortant. Celui-ci est un
   remuement lent et RÉPÉTÉ, de faible amplitude — la plante bouge alors que
   personne ne la touche, ce qui est très exactement l'information à donner.
   ⚠️ IL EST UNE PURE FONCTION DU TEMPS PARTAGÉ, comme sa planque : les deux
   clients voient le même buisson remuer au même instant, sans un octet de réseau.
   ⚠️ ET IL S'ARRÊTE ENTRE DEUX BOUFFÉES (le `max(0,…)` sur la sinusoïde lente) :
   un feuillage qui remuerait sans jamais se taire redeviendrait un décor animé de
   plus, donc un décor qu'on ne regarde pas. */
export const STAR_GREEN_SWAY_PX = 2.6;       // le sommet, en pixels — la moitié d'un pas d'humain
export const STAR_GREEN_SWAY_MS = 420;       // la période du remuement lui-même
export const STAR_GREEN_BREATH_MS = 3400;    // la période des bouffées : elle remue, elle se tait
export function starGreenSway(nowMs) {
  const t = Math.max(0, +nowMs || 0);
  const breath = Math.sin((2 * Math.PI * t) / STAR_GREEN_BREATH_MS);
  const gate = Math.max(0, breath);
  return STAR_GREEN_SWAY_PX * gate * gate * Math.sin((2 * Math.PI * t) / STAR_GREEN_SWAY_MS);
}

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 2026-09-03 (lot A3) — LES INDICES DE LA REINE. DEUX, PUIS ELLE MÈNE.
   ╚══════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ LE COMPTE EST PARTAGÉ, ET C'EST GUILLAUME QUI L'A DEMANDÉ : *« deux fois
   (cumulé entre les joueurs) »*. Il ne peut donc PAS se déduire (§3 de
   `CLAUDE.md` : ce qui se déduit ne se diffuse pas — celui-ci ne se déduit de
   rien) et il ne peut pas être local : deux joueurs qui auraient chacun leurs deux
   indices auraient quatre indices, c'est-à-dire une chasse deux fois plus courte à
   deux, alors que la coopération doit AIDER sans DISPENSER (§4 de `QUETE.md`).
   ⚠️ C'EST UN DICTIONNAIRE DE LIEUX, PAS UN COMPTEUR DE VERTE — même forme que
   `woke` et `dug`, pour la même raison : la septième sœur se cherchera aussi, et
   un second compteur à réconcilier est ce que le §3 interdit.
   ⚠️⚠️ ET LE TROISIÈME INDICE N'EST PAS UN INDICE, C'EST UN MODE : l'arbitre dit
   seulement `tier: "guide"`. Ce qu'on en fait — la reine prend la tête et le
   fermier la suit — est un confort LOCAL, jamais diffusé (voir `starGuideRef`
   dans `FermeGame.js`) : deux joueurs peuvent chercher chacun de leur côté. */
export function starHintsUsed(e, id) {
  return Math.max(0, (e && e.hints && e.hints[id]) | 0);
}
export function resolveStarHint(e, id, who, now) {
  if (!e || !STAR_SITE[id]) return { ok: false };
  if (starHas(e, id)) return { ok: false, already: true };
  if (!starHas(e, "crater")) return { ok: false, noQueen: true };
  if (!e.hints) e.hints = {};
  const n = starHintsUsed(e, id) + 1;
  e.hints[id] = n;
  return { ok: true, n, tier: n <= STAR_GREEN_HINTS ? "temp" : "guide",
           left: Math.max(0, STAR_GREEN_HINTS - n), by: String(who || ""), at: +now || 0 };
}
/* ⚠️⚠️ « CHAUD/FROID » EST UNE ÉCHELLE, PAS UN SEUIL, et les bornes sont en CASES
   parce que c'est en cases que se mesure une marche : `warm` (18) est à peu près
   un écran, `cold` (40) un quartier, au-delà c'est l'autre bout de la ville.
   ⚠️ ELLE EST ICI ET PAS DANS LA VUE pour que le banc puisse vérifier qu'elle est
   MONOTONE — un indice qui refroidirait en s'approchant serait pire que pas
   d'indice, et c'est le genre de faute qu'une relecture ne voit pas. */
export const STAR_GREEN_TEMPS = [[3.5, "burning"], [9, "hot"], [18, "warm"], [40, "cold"]];
export function starGreenTemp(d) {
  const v = Math.max(0, +d || 0);
  for (const [lim, key] of STAR_GREEN_TEMPS) if (v <= lim) return key;
  return "icy";
}
/* Le cap, en huit points. ⚠️ MÊME CONVENTION D'ÉCRAN QUE TOUT LE JEU : `y` croît
   vers le BAS, donc `dy > 0` est le SUD (c'est déjà celle de `starNerveFace`).
   ⚠️ HUIT ET PAS QUATRE : à quatre, « à l'est » désigne un demi-plan, ce qui ne
   retranche rien à une carte de 224 cases de large. */
export function starGreenBearing(dx, dy) {
  const a = Math.atan2(+dy || 0, +dx || 0);            // 0 = est, +π/2 = sud
  const k = ((Math.round((a * 4) / Math.PI) % 8) + 8) % 8;
  return ["e", "se", "s", "sw", "w", "nw", "n", "ne"][k];
}
/* ⚠️ L'ARBITRE DE LA VERTE — MÊME CONTRAT QUE LA DISCRÈTE : le client tient la
   géométrie (il est à côté d'elle), l'hôte tient la RÈGLE (pas avant la reine).
   ⚠️ ET IL NE SE GARDE PAS SUR LA DISCRÈTE : Guillaume autorise explicitement de
   les trouver dans n'importe quel ordre. */
export function resolveStarTrack(e, who, now, name) {
  const id = "townGreen";
  if (starVerbOf(id) !== "track") return { ok: false };
  if (starHas(e, id)) return { ok: false, already: true };
  if (!starHas(e, "crater")) return { ok: false, noQueen: true };
  const byName = name || String(who || "");
  return { ...resolveStarFound(e, id, byName, now), site: id, opened: true };
}

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ LES DEUX DÉCISIONS DU RÉVEIL, PURES — POUR QU'UN BANC PUISSE LES JOUER.
   ╚══════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ ELLES VIVENT ICI ET PAS DANS `FermeGame.js`, ET C'EST LA RÈGLE DU DÉPÔT,
   PAS UNE PRÉFÉRENCE : `verify-maire` et `verify-scierie` JOUENT leurs mécaniques
   parce que celles-ci sont pures (`maire.js`, `scierie.js`), et les deux ont sorti
   des défauts de RÉGLAGE qu'aucune relecture n'aurait vus. Laissées dans la closure
   React, ces douze lignes auraient été le seul morceau du lot que rien ne peut
   rejouer — c'est-à-dire précisément celui où « marteler gagne quand même » se
   serait caché.
   ⚠️ `FermeGame.js` GARDE CE QUI N'EST PAS UNE DÉCISION : le ref, la zone, la
   distance au cratère, l'immobilité, le dessin. Ici il n'y a que le temps et le
   compte — et donc rien qui demande un navigateur.
   ⚠️ ELLES NE MUTENT RIEN : on rend un nouvel état. Un `st` étalé puis lissé en
   place serait la table de référence corrompue du 2026-08-31 (§4). */
export function starWakeAdvance(st, dtMs) {
  const s = { phase: +st.phase || 0, hits: Math.max(0, st.hits | 0), beats: Math.max(0, st.beats | 0),
              flash: Math.max(0, +st.flash || 0), miss: Math.max(0, +st.miss || 0), gone: false };
  /* ⚠️ LE PAS EST BORNÉ : un onglet qui revient au premier plan rend un `dt` de
     plusieurs secondes, et sans cette borne il ferait passer trois battements
     d'un coup — donc il abandonnerait le geste tout seul, sans que le joueur ait
     rien lâché. Même famille que le `Math.min(0.05, dt)` des boucles du dépôt. */
  const dt = Math.min(120, Math.max(0, +dtMs || 0));
  s.phase += dt / starWakePeriod(s.hits);
  while (s.phase >= 1) {
    s.phase -= 1;
    s.beats += 1;
    /* ⚠️ TROIS TOURS SANS UN SEUL APPUI ET L'ANNEAU S'EFFACE : sans cette sortie,
       il resterait à battre au-dessus d'un trou que le joueur a cessé de regarder.
       Tout appui remet `beats` à zéro (voir `starWakeStrike`). */
    if (s.beats >= STAR_WAKE_IDLE_BEATS) { s.gone = true; return s; }
  }
  s.flash = Math.max(0, s.flash - dt / 250);
  s.miss = Math.max(0, s.miss - dt / 350);
  return s;
}
/* ⚠️⚠️ L'APPUI, ET C'EST TOUTE LA MÉCANIQUE EN HUIT LIGNES. Deux choses s'y
   décident, et la seconde est celle qui distingue ce geste d'un martèlement :
   1. UN BATTEMENT PLACÉ REPART DU HAUT (`phase = 0`) — sinon frapper au DÉBUT de
      la bande laisserait l'anneau finir sa course et compter deux fois le même
      geste ;
   2. UN APPUI HORS BANDE RETIRE UN BATTEMENT — sans quoi taper le plus vite
      possible gagnerait à tous les coups, la bande finissant forcément par passer
      sous un doigt. C'est ce que `s2.wakeHint` annonce en une phrase, et c'est ce
      que `verify-quete` vérifie en martelant vraiment. */
export function starWakeStrike(st) {
  const s = { phase: +st.phase || 0, hits: Math.max(0, st.hits | 0), beats: 0,
              flash: Math.max(0, +st.flash || 0), miss: Math.max(0, +st.miss || 0), won: false };
  if (starWakeOnBeat(s.phase)) {
    s.hits += 1;
    s.flash = 1;
    s.phase = 0;
    s.won = s.hits >= STAR_WAKE_HITS;
    return s;
  }
  s.hits = Math.max(0, s.hits - 1);
  s.miss = 1;
  return s;
}
/* ⚠️⚠️ UNE SEULE RÉPONSE POUR LA JAUGE, LE TEXTE ET L'ARBITRE — la discipline du
   456, tenue dès l'écriture cette fois. Sept états, dans l'ordre de L'ACTION LA
   PLUS PROCHE (478) : ce qui manque d'abord se dit d'abord.
   `other` peut être un joueur (`{x, y}`) ou l'épouvantail ; il n'a pas besoin de
   `dir`, voir la note ci-dessus. */
export const STAR_QUEEN_STEPS = ["away", "alone", "edge", "side", "moving", "watching", "holding"];
export function starQueenStep(me, other, cx, cy, radius, ringPad) {
  const R = radius === undefined ? STAR_CRATER_R : radius;
  const pad = ringPad === undefined ? 1 : ringPad;
  const dm = Math.hypot(me.x - cx, me.y - cy);
  if (dm > R + pad) return "away";
  if (!other) return "alone";
  if (dm < R * STAR_QUEEN_EDGE_K) return "edge";
  const dOther = Math.hypot(other.x - cx, other.y - cy);
  if (dOther < R * STAR_QUEEN_EDGE_K || dOther > R + pad) return "side";
  const ax = (me.x - cx) / (dm || 1), ay = (me.y - cy) / (dm || 1);
  const bx = (other.x - cx) / (dOther || 1), by = (other.y - cy) / (dOther || 1);
  if (ax * bx + ay * by > STAR_QUEEN_OPP_DOT) return "side";
  if (me.moving) return "moving";
  if (!starFacingAway(me.x, me.y, me.dir | 0, cx, cy)) return "watching";
  return "holding";
}

/* ⚠️⚠️ LE BESOIN EST ÉCRIT UNE SEULE FOIS, POUR LES TROIS VERBES. La jauge et
   l'arbitre liraient sinon deux durées différentes, et la barre serait pleine
   avant (ou après) que l'étoile sorte — le paramètre-qui-en-double-un-autre du §8
   de `CLAUDE.md`, sur la seule grandeur que le joueur REGARDE monter.
   ⚠️ ZIP 479 — ELLE REMPLACE `starCalmNeed(soloAllowed)`, dont le paramètre
   portait `starAlone(...)` sous un nom qui disait le contraire. Le nouveau est
   explicite : `{ alone, partner }`. `partner` vaut `"player"`, `"effigy"` ou rien. */
export function starTameNeed(siteId, ctx) {
  const verb = starVerbOf(siteId) || (siteId === "crater" ? "pair" : "light");
  if (verb === "pair") return (ctx && ctx.partner === "player") ? STAR_QUEEN_MS : STAR_QUEEN_SOLO_MS;
  return (ctx && ctx.alone === false) ? STAR_CALM_MS : STAR_CALM_SOLO_MS;
}

/* ╔══════════════════════════════════════════════════════════════════════════════
   ║ ZIP 479 — DÉFAUT 10 : ELLE NE S'EFFACE PLUS, ELLE SE CACHE.
   ╚══════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ LE REPROCHE DE L'AUDIT N'ÉTAIT PAS LE RAYON (`STAR_HIDE_R` = 4,5 ne bouge
   pas) : c'est que la compagne passait à 22 % d'opacité EN UNE IMAGE, ce qui se
   lit comme un défaut d'affichage et pas comme une intention. *Une chose qui
   s'éteint d'un coup a l'air cassée ; une chose qui se range a l'air vivante.*
   ⚠️⚠️ DEUX TEMPS, ET LE PREMIER EST UN DÉPLACEMENT : elle RENTRE d'abord vers le
   joueur (`tuck`, elle glisse dans son dos et plonge dans l'herbe), ELLE PÂLIT
   ENSUITE. Un fondu seul ne raconte rien ; un mouvement suivi d'un fondu raconte
   « elle se planque ». Et elle ressort plus lentement qu'elle n'est rentrée — on
   se cache vite, on se montre prudemment.
   ⚠️ ELLE EST PURE ET RETOURNE DES NOMBRES, DONC `render-etoile` LA MESURE : une
   courbe écrite dans la closure de la boucle de rendu serait le deuxième visage du
   piège n°1 (elle vieillirait sans que rien ne le dise). */
export const STAR_HIDE_IN_MS = 380;
export const STAR_HIDE_OUT_MS = 620;
export function starHideK(prev, dt, hidden) {
  const p = Math.max(0, Math.min(1, +prev || 0));
  const step = (Math.max(0, +dt || 0)) / (hidden ? STAR_HIDE_IN_MS : STAR_HIDE_OUT_MS);
  return Math.max(0, Math.min(1, hidden ? p + step : p - step));
}
export function starHideAnim(k) {
  const t = Math.max(0, Math.min(1, +k || 0));
  /* Premier temps (t < ½) : elle se range. Second temps : elle s'éteint.
     ⚠️ `tuck` est une FRACTION du chemin vers le joueur, jamais des pixels : les
     trois cartes n'ont pas la même taille de tuile, et un décalage en pixels aurait
     fait rentrer l'étoile plus loin en ville qu'à la ferme. */
  const a = Math.min(1, t / 0.5), b = Math.max(0, (t - 0.5) / 0.5);
  return {
    tuck: a,                                   // 0 = à sa place ; 1 = dans le col du joueur
    dip: a * 0.42,                             // elle plonge dans l'herbe, en cases
    alpha: 1 - a * 0.45 - b * 0.43,            // 1 → 0,55 → 0,12
    scale: 1 - a * 0.14 - b * 0.24,            // elle se tasse : 1 → 0,86 → 0,62
  };
}

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
    fall: 0,        // horodatage HÔTE des cinq fragments de ferme
    townFall: 0,    // horodatage HÔTE du gros météore de Valley Town
    calm: {},       // id de joueur -> horodatage HÔTE du dernier « dos tourné »
    /* ⚠️⚠️ ZIP 469 — LA FOUILLE EST UN ÉTAT DE PLUS, ET C'EST LE SEUL QUE CETTE
       PASSE AJOUTE. Il fallait bien le partager : sans lui, un joueur qui rejoint
       verrait cinq cratères intacts pendant que l'autre les a tous retournés, et
       les deux liraient des invites contradictoires sur le même trou. Il ne peut
       pas se déduire de `found` — pour une étoile, `found` veut dire APPRIVOISÉE,
       ce qui arrive une minute après la fouille.
       ⚠️ TROIS CHAMPS PARTENT AVEC LE DÉCHANT : `lean` (les lectures d'ombres),
       `marks` (ce qu'elles révélaient) et `duet` (les phrases du duo). */
    dug: {},        // id de lieu -> { by, at } — le cratère a été retourné
    /* ⚠️ ZIP 454 — DEUX CHAMPS DE PLUS, ET PAS UN DE TROP. `plan` porte UNE date
       (la commande à la mairie) et le drapeau que l'hôte lève quand l'ingénieur
       rend son travail : arrivée et échéance s'en déduisent. `wood` porte les cinq
       commandes du bûcheron, indexées par les clés du NAVIRE — jamais par un
       numéro d'étape, qui aurait été une seconde liste. */
    plan: { at: 0, by: "", done: 0 },
    /* ⚠️⚠️ ZIP 480 — L'AUDIENCE CHEZ LE MAIRE. Sa forme est tenue par
       `migrateMayor` (`components/ferme/maire.js`), jamais recopiée ici : un
       second endroit qui décrirait les mêmes champs serait la divergence en
       attente du §8. AUCUNE MIGRATION SUPABASE — il voyage dans `shared.star`,
       dans un `apply` qui partait déjà. */
    mayor: MA.migrateMayor({}).mayor,
    wood: {},       // clé de morceau -> { at, readyAt, done, by }
    /* ╔══════════════════════════════════════════════════════════════════════════
       ║ ZIP 479 — TROIS CHAMPS DE PLUS, UN PAR VERBE, ET PAS UN DE TROP.
       ╚══════════════════════════════════════════════════════════════════════════
       ⚠️⚠️ AUCUNE MIGRATION SUPABASE : tout `shared.star` est déjà UN champ du
       JSON de `ferme_saves` (voir l'en-tête). Trois clés courtes de plus dans un
       `apply` qui partait déjà, c'est-à-dire zéro `send()` et zéro octet facturé
       (§3 de `CLAUDE.md` : seul le NOMBRE de messages compte).
       ⚠️ ET AUCUN NE PEUT SE DÉDUIRE, C'EST POURQUOI ILS EXISTENT :
         · `offer`  — l'offrande de lumière bleue a été faite sur ce trou. On ne
           peut pas la lire dans `f.inv.candies` : un stock ne se souvient pas
           d'avoir été dépensé ;
         · `candy`  — ce que CHAQUE joueur a rapporté DEPUIS LA CHUTE. Un flux,
           pas un stock (voir `STAR_CANDY_PRICE`) ;
         · `dish`   — le plat de la rose. Il est PARTAGÉ parce que le relais l'est :
           « l'un cuisine, l'autre porte », et un plat local ne se passerait pas de
           main en main ;
         · `effigy` — l'épouvantail planté au bord du cratère. Il ne peut pas être
           un objet de la carte de ville (celle-ci n'est jamais persistée, §6 de
           `CLAUDE.md`), donc il vit ici, avec ce qui lui donne un sens. */
    offer: {},      // id de lieu -> { by, at } — la lumière bleue a été offerte
    /* 2026-09-02 (lot A) — le réveil au rythme, par lieu. ⚠️ UN DICTIONNAIRE ET
       PAS UN BOOLÉEN DE REINE : la septième sœur se réanimera du même geste, et
       une seconde carte à réconcilier est ce que le §3 de `CLAUDE.md` interdit. */
    woke: {},       // id de lieu -> { by, at } — elle a été réveillée au rythme
    /* 2026-09-03 (lot A3) — les indices demandés à la reine, PAR LIEU et non par
       joueur : Guillaume les veut « cumulés entre les joueurs » (voir
       `resolveStarHint`). Un compteur par joueur aurait donné quatre indices à
       deux, c'est-à-dire une chasse deux fois plus courte à deux. */
    hints: {},      // id de lieu -> nombre d'indices déjà demandés (tous joueurs)
    candy: {},      // id de joueur -> bonbons rapportés depuis la chute
    /* hors-zip — LA LUEUR S'ÉTEINT POUR DE VRAI. Décision de Guillaume : la
       lumière bleue reste disponible 5 minutes après la fin du défi de fuite,
       pas éternellement. `candyUntil` est l'ÉCHÉANCE ABSOLUE posée par l'hôte
       au moment de `resolveStarCandy` (§3 de CLAUDE.md : une horloge, jamais
       deux) ; `candy`, lui, n'est plus lu qu'à travers `starCandyFresh`, qui
       compare l'échéance à l'horloge de QUI LIT, jamais à celle qui l'a
       écrite. */
    candyUntil: {}, // id de joueur -> horodatage au-delà duquel `candy` est périmé
    dish: null,     // { by, at, phase } — le plat chaud de l'étoile rose
    effigy: null,   // { by, at, x, y } — le figurant de la reine, en solo
    gift: {},       // id de joueur -> { at, kind } — le crochet cosmétique (§8)
    seen: {},       // scènes déjà jouées : cartes de chapitre, « previously »
    doneAt: 0,
    /* 2026-09-03 (lot C) — LA SEPTIÈME SŒUR A ÉTÉ VUE. Un horodatage HÔTE, pas
       un booléen : même discipline que `fall`/`townFall`, et ça ne coûte rien de
       plus à écrire. PARTAGÉ (pas indexé par joueur) — contrairement au hasard de
       la canne (`f.evilRodArmedAt`, par fermier) : « elle est prisonnière, on l'a
       vue » est un fait du MONDE que la reine annonce à la cantonade, pas une
       confidence à chacun séparément. Elle n'est PAS ajoutée à `STAR_SITES` : elle
       n'est pas encore apprivoisable (aucun verbe, aucun résolveur de prise —
       lots D/E), et y inscrire un site à moitié câblé serait une porte sans
       chemin de code (§4 de `CLAUDE.md`). */
    evilFound: 0,
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
      /* ⚠️ ZIP 479 — `with` : LE SECOND JOUEUR EST NOMMÉ DANS LA TRACE, PAS
         SEULEMENT REMERCIÉ DANS L'INSTANT. C'est ce que l'audit 477 reprochait au
         duo : celui qui tient l'autre bord ne recevait rien, pas même son nom. Il
         est facultatif (un apprivoisement solo n'en a pas) et il traverse la
         migration comme `by`, tronqué de la même façon — il vient du réseau. */
      e.found[id] = { by: String(v.by || "?").slice(0, 24), at: +v.at || 0 };
      if (v.with) e.found[id].with = String(v.with).slice(0, 24);
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
  /* ╔═══════════════════════════════════════════════════════════════════════════
     ║ ZIP 472 (audit) — LA COMPATIBILITÉ DU 462 NE DOIT VALOIR QUE POUR UNE
     ║ SAUVEGARDE D'AVANT CE ZIP, JAMAIS POUR UNE PARTIE NEUVE QUI VIENT DE
     ║ FERMER LE CHAPITRE 1.
     ╚═══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️⚠️ `(saved.ch | 0) > 0` DEVIENT VRAI DÈS QUE `starAdvance` FERME LE
     CHAPITRE 1 (les cinq impacts de FERME trouvés) — ce qui n'a rien à voir
     avec le gros météore de VILLE (`townFall`), qui n'arrive que deux minutes
     de présence active plus tard (`starTownActivityTick`). L'hôte re-migre
     `s2.star` à CHAQUE requête ET une fois par seconde : la toute première
     migration qui suivait la fermeture du chapitre 1 posait donc
     `e.townFall = e.fall` avant que le compte à rebours ait eu la moindre
     chance de tourner — le chapitre 2 se fermait tout seul, sans attente,
     sans fumée, sans que personne n'ait vu tomber le météore.
     ⚠️ LA PARADE N'EST PAS UN NOUVEAU CHAMP DE VERSION : `newStar()` écrit
     `townFall: 0` dans TOUT objet qu'elle produit, et cette fonction fait de
     même à chaque passage (`e.townFall = +saved.townFall || 0`, juste
     en dessous). Donc dès la PREMIÈRE migration sous ce code, l'objet
     persisté porte le CHAMP `townFall` — même à 0 — et une partie neuve ne
     peut plus jamais présenter `saved.townFall === undefined`. Seule une
     sauvegarde écrite avant le 462, jamais encore repassée par cette
     fonction, peut avoir le champ ABSENT : c'est ce qu'on teste — la
     PRÉSENCE du champ, pas la valeur de `ch`. */
  const legacyPreTownFall = saved.townFall === undefined;
  e.townFall = +saved.townFall || 0;
  if (legacyPreTownFall && !e.townFall && ((saved.ch | 0) > 0 || (saved.found && saved.found.crater)))
    e.townFall = e.fall;
  /* ── ZIP 455 : l'annonce. ⚠️ UNE SAUVEGARDE D'AVANT CE ZIP N'A PAS LE CHAMP ET
     PEUT AVOIR `fall` — c'est une partie commencée sous l'ancienne règle, et elle
     doit continuer de tourner. On considère donc qu'une chute déjà tombée VAUT
     annonce : sans ça, `starWarning` serait faux, `starFallDue` refuserait, et
     rien ne casserait bruyamment — le pire des deux mondes. */
  if (saved.warn && typeof saved.warn === "object")
    e.warn = { at: +saved.warn.at || 0, by: String(saved.warn.by || "").slice(0, 24) };
  if (!e.warn.at && e.fall) e.warn = { at: e.fall, by: "" };
  /* ╔═══════════════════════════════════════════════════════════════════════════
     ║ ZIP 469 — LA TRONCATURE QUI FUSIONNAIT DEUX CLÉS. LE BLOCAGE SIGNALÉ PAR
     ║ GUILLAUME : « au bout de la jauge, l'étoile ne bouge pas ».
     ╚═══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️⚠️ ELLE COUPAIT À 40 SIGNES. La tenue en écrit DEUX par joueur et par
     lieu — `farmStarBlue:<id>` (la dernière marque) et `farmStarBlue:<id>:t0` (le
     début de la tenue) — et l'identifiant est un `profile_id` Supabase, donc un
     UUID de 36 signes. 13 + 36 = 49, 13 + 36 + 3 = 52 : **les deux tombaient sur
     la MÊME clé de 40**. L'hôte re-migre l'état à chaque requête (`s2.star =
     Q.migrateStar(s2.star)`, deux fois par seconde pendant la tenue), donc à
     chaque migration `t0` écrasait la dernière marque : `mine = now − t0`
     retombait à zéro, pour toujours.
     ⚠️ ET LE SYMPTÔME ÉTAIT LE PIRE POSSIBLE — la jauge du client, elle, compte
     en LOCAL (`starCalmT0Ref`) : elle se remplissait normalement, jusqu'au bout,
     devant une étoile qui ne sortirait jamais. *Une barre qui promet et ment*, le
     défaut que le 458 avait déjà payé un cran plus haut.
     ⚠️⚠️ LA LEÇON EST NEUVE ET ELLE EST GÉNÉRALE : **une troncature de sécurité
     qui fait tomber deux clés DISTINCTES sur la même ne protège rien, elle
     corrompt.** Une clé composite se borne à la somme de ses parties, jamais à un
     nombre rond. Ici : 40 pour le lieu + 1 + 64 pour l'identifiant + 3 pour le
     suffixe. Le plafond reste (une sauvegarde abîmée ne doit pas gonfler), il
     cesse simplement de mentir.
     ⚠️ AUCUNE MIGRATION N'EST NÉCESSAIRE POUR LES PARTIES EN COURS : les clés
     tronquées d'avant ce zip sont simplement des clés de tenue périmées, et une
     tenue périmée redémarre au premier `resolveStarCalm` (`now - prev > 1500`). */
  if (saved.calm && typeof saved.calm === "object")
    for (const k of Object.keys(saved.calm)) e.calm[String(k).slice(0, CALM_KEY_MAX)] = +saved.calm[k] || 0;
  /* ── ZIP 469 : la fouille. ⚠️⚠️ UNE SAUVEGARDE D'AVANT CE ZIP N'A PAS LE CHAMP
     ET PEUT AVOIR DES TROUVAILLES : un cratère déjà trouvé a forcément été
     fouillé, sinon on renverrait gratter un trou qu'on a vidé la semaine
     dernière. On dérive donc `dug` de `found` au chargement — c'est la migration
     tolérante du §5, et elle ne coûte rien puisqu'elle ne fait qu'ajouter.
     ⚠️ Elle ne touche QUE les impacts de ferme : le cratère de ville ne se fouille
     pas, il se descend. */
  if (saved.dug && typeof saved.dug === "object") {
    for (const id of Object.keys(saved.dug)) {
      if (!STAR_SITE[id]) continue;
      const v = saved.dug[id] || {};
      e.dug[id] = { by: String(v.by || "?").slice(0, 24), at: +v.at || 0 };
    }
  }
  for (const site of STAR_FARM_IMPACTS)
    if (e.found[site.id] && !e.dug[site.id]) e.dug[site.id] = { by: e.found[site.id].by, at: e.found[site.id].at };
  if (saved.gift && typeof saved.gift === "object") {
    for (const k of Object.keys(saved.gift)) {
      const v = saved.gift[k] || {};
      e.gift[String(k).slice(0, 40)] = { at: +v.at || 0, kind: String(v.kind || "starlight").slice(0, 24) };
    }
  }
  if (saved.seen && typeof saved.seen === "object")
    for (const k of Object.keys(saved.seen)) if (saved.seen[k]) e.seen[String(k).slice(0, 32)] = true;
  e.doneAt = +saved.doneAt || 0;
  e.evilFound = +saved.evilFound || 0; // 2026-09-03 (lot C)
  /* ── ZIP 479 : les trois verbes. ⚠️⚠️ MÊME DISCIPLINE QUE PARTOUT AILLEURS ICI —
     on RECONSTRUIT chaque sous-objet au lieu de faire confiance à sa forme, et un
     lieu inconnu est « une version d'après » qu'on ignore. Une sauvegarde d'avant
     ce zip n'a aucun des trois champs : offrande jamais faite, aucun bonbon frais,
     pas de plat, pas d'épouvantail. C'est le bon comportement, et c'est le même
     qu'au 469 pour `dug`.
     ⚠️⚠️ ET LE PLAFOND D'IDENTIFIANT EST CELUI DE LA TENUE (`CALM_ID_MAX` = 64,
     pour un `profile_id` de 36 signes), jamais un nombre rond : c'est très
     exactement la troncature qui a fusionné deux clés au 469 et bloqué la quête. */
  if (saved.offer && typeof saved.offer === "object") {
    for (const id of Object.keys(saved.offer)) {
      if (!STAR_SITE[id]) continue;
      const v = saved.offer[id] || {};
      e.offer[id] = { by: String(v.by || "?").slice(0, 24), at: +v.at || 0 };
    }
  }
  /* 2026-09-02 (lot A) — MÊME FORME, MÊMES GARDES QUE `offer` JUSTE AU-DESSUS :
     une sauvegarde d'avant ce lot n'a pas `woke`, la reine y est donc endormie et
     il faut la réveiller — ce qui est le bon comportement, et le même qu'au 469
     pour `dug`. ⚠️ Un lieu inconnu est JETÉ (`STAR_SITE[id]`), sinon une
     sauvegarde d'une version future peuplerait la table d'ici de clés mortes. */
  if (saved.woke && typeof saved.woke === "object") {
    for (const id of Object.keys(saved.woke)) {
      if (!STAR_SITE[id]) continue;
      const v = saved.woke[id] || {};
      e.woke[id] = { by: String(v.by || "?").slice(0, 24), at: +v.at || 0 };
    }
  }
  /* 2026-09-03 (lot A3) — les indices déjà consommés. ⚠️ UNE SAUVEGARDE D'AVANT
     CE LOT N'A PAS LE CHAMP : la chasse démarre alors avec ses deux indices, ce
     qui est le bon comportement (elle n'avait pas commencé). Le compte est BORNÉ
     à la lecture — un état abîmé qui porterait un milliard ne doit pas décider
     que la reine guide pour toujours. */
  if (saved.hints && typeof saved.hints === "object") {
    for (const id of Object.keys(saved.hints)) {
      if (!STAR_SITE[id]) continue;
      e.hints[id] = Math.max(0, Math.min(99, saved.hints[id] | 0));
    }
  }
  if (saved.candy && typeof saved.candy === "object")
    for (const k of Object.keys(saved.candy)) e.candy[String(k).slice(0, CALM_ID_MAX)] = Math.max(0, saved.candy[k] | 0);
  /* hors-zip — une sauvegarde d'avant cette décision n'a pas `candyUntil` :
     `starCandyFresh` la traite alors comme périmée (`until` absent), jamais
     comme éternelle — c'est le AND, pas le OR, qui protège une reprise après
     redémarrage du serveur (voir la note de `starCandyFresh`).
     ⚠️⚠️ hors-zip, 2026-08-27 — UNE DATE ABSOLUE N'EST JAMAIS UN ENTIER 32 BITS.
     `saved.candyUntil[k] | 0` tronquait l'échéance de 2026 à sa partie basse à
     CHAQUE requête hôte, donc la lumière tout juste rapportée paraissait déjà
     périmée. Le client lisait encore le flux brut et annonçait le succès pendant
     que l'hôte répondait « zéro » : les deux toasts contradictoires nommaient
     exactement cette troncature. */
  if (saved.candyUntil && typeof saved.candyUntil === "object") {
    for (const k of Object.keys(saved.candyUntil)) {
      const until = +saved.candyUntil[k];
      e.candyUntil[String(k).slice(0, CALM_ID_MAX)] = Number.isFinite(until) ? Math.max(0, until) : 0;
    }
  }
  /* ⚠️ UN PLAT SANS DATE N'EST PAS UN PLAT : `starDishPhase` rendrait `null` de
     toute façon, mais un objet à moitié écrit se traînerait dans l'état persisté
     et dans chaque `apply`. On le jette au chargement. */
  if (saved.dish && typeof saved.dish === "object" && +saved.dish.at) {
    e.dish = { by: String(saved.dish.by || "").slice(0, CALM_ID_MAX), at: +saved.dish.at || 0,
               phase: saved.dish.phase === "cook" ? "cook" : "carry",
               from: String(saved.dish.from || "").slice(0, CALM_ID_MAX) };
  }
  if (saved.effigy && typeof saved.effigy === "object" && Number.isFinite(+saved.effigy.x)) {
    e.effigy = { by: String(saved.effigy.by || "").slice(0, CALM_ID_MAX), at: +saved.effigy.at || 0,
                 x: +saved.effigy.x || 0, y: +saved.effigy.y || 0 };
  }
  /* ── ZIP 454 : les plans et le bois. */
  if (saved.plan && typeof saved.plan === "object") {
    e.plan = { at: +saved.plan.at || 0, by: String(saved.plan.by || "").slice(0, 24), done: +saved.plan.done || 0 };
  }
  if (saved.wood && typeof saved.wood === "object") {
    for (const k of Object.keys(saved.wood)) {
      if (!STAR_SHIP_KEYS.includes(k)) continue;      // une clé inconnue = une version d'après : on l'ignore
      const v = saved.wood[k] || {};
      /* ⚠️⚠️ ZIP 478 — `ready` TRAVERSE LA MIGRATION, ET IL EST FORCÉ À FAUX QUAND
         LA PIÈCE EST DÉJÀ POSÉE. L'hôte re-migre à CHAQUE requête (leçon 469) :
         un `ready` qui survivrait à `done` ferait rouvrir l'invite de montage sur
         une pièce déjà sur la cale, à chaque tour de boucle. Les deux ne peuvent
         jamais être vrais ensemble, et c'est ici qu'on le garantit — pas chez les
         appelants, qui sont sept.
         ⚠️ UNE SAUVEGARDE D'AVANT CE ZIP N'A PAS DE `ready` : elle arrive donc à
         faux, ce qui est juste. Une commande alors en cours reprend son minuteur
         là où il en était et se fera livrer normalement. */
      const done = !!v.done;
      e.wood[k] = {
        at: +v.at || 0, readyAt: +v.readyAt || 0, done,
        ready: !done && !!v.ready,
        by: String(v.by || "?").slice(0, 24),
        raisedBy: String(v.raisedBy || "").slice(0, 24), raisedAt: +v.raisedAt || 0,
      };
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
  /* ⚠️ ZIP 480 — l'audience se remigre par son propre fichier. Une sauvegarde
     d'avant ce zip n'a rien : `migrateMayor` rend l'état vierge, donc le maire
     n'a pas signé, donc la chaîne du bois attend une audience — ce qui est
     exactement le comportement voulu pour une partie en cours. */
  MA.migrateMayor(Object.assign(e, { mayor: saved.mayor }));
  if (e.doneAt) {
    e.plan.at = e.plan.at || e.doneAt; e.plan.done = e.plan.done || e.doneAt;
    /* ⚠️⚠️ UNE PARTIE DÉJÀ FINIE A FORCÉMENT EU SON AUTORISATION : sans cette
       ligne, la règle neuve REPRENDRAIT un navire achevé il y a trois semaines,
       exactement le défaut que le bloc ci-dessous corrige pour le bois. Une
       règle qui réécrit le passé n'est pas une règle, c'est un bogue daté. */
    if (!e.mayor.ok) { e.mayor.ok = e.doneAt; e.mayor.grade = e.mayor.grade || "plain"; }
    for (const k of STAR_SHIP_KEYS)
      if (!e.wood[k]) e.wood[k] = { at: e.doneAt, readyAt: e.doneAt, done: true, by: "?" };
  }
  return e;
}

export function starFallen(e) { return !!(e && e.fall); }
export function starTownFallen(e) { return !!(e && e.townFall); }
/* Le compteur urbain n'existe que pendant le chapitre du cratère. Cette garde
   unique évite qu'un état avancé par le menu dev garde une ancienne horloge à
   l'écran alors que le chantier a déjà commencé. */
export function starTownWaiting(e) {
  return !!(e && starFallen(e) && starChapterKey(e) === "crater" && !starTownFallen(e));
}
/* Le ref reste volontairement mutable : ce helper pur côté horloge rend
   vérifiable l'invariant important — une pause conserve `ms`; seul le passage
   hors du chapitre d'attente, ou une nouvelle chute initiale, le remet à zéro. */
export function starTownActivityStep(a, e, now, active) {
  if (!a || typeof a !== "object") return 0;
  if (!starTownWaiting(e)) { a.fall = 0; a.at = 0; a.ms = 0; return 0; }
  const fall = +e.fall || 0;
  if (a.fall !== fall) { a.fall = fall; a.at = now; a.ms = 0; }
  if (!a.at) a.at = now;
  const dt = Math.max(0, Math.min(1500, now - a.at));
  a.at = now;
  a.ms = Math.max(0, +a.ms || 0);
  if (active) a.ms += dt;
  return a.ms;
}

/* ⚠️⚠️ HORS-ZIP — UNE MARQUE « VUE » APPARTIENT AU JOUEUR, PAS AU NAVIGATEUR.
   Le faux Supabase rejoue volontairement deux profils dans deux onglets du même
   navigateur : sans `who`, le premier qui voyait la chute la masquait au second. */
export function starFallSeenStorageKey(kind, seed, who) {
  return "ferme_star_" + (kind === "townFall" ? "town_fall" : "farm_fall")
    + ":" + ((seed | 0) >>> 0) + ":" + String(who || "?").slice(0, 128);
}
export function starStarted(e) { return !!(e && (e.ch > 0 || Object.keys(e.found || {}).length)); }
export function starDone(e) { return !!(e && e.doneAt); }
export function starHas(e, id) { return !!(e && e.found && e.found[id]); }
/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 469 — LA FOUILLE. « ON NE SAIT PAS CE QU'IL Y A DANS UN TROU AVANT
   ║ D'AVOIR MIS LES MAINS DEDANS. »
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DEMANDE DE GUILLAUME, MOT POUR MOT : *« ajoutons à la mécanique de fouille
   une action sur les cratères : fouiller (déclenchable avec un bouton, et activant
   une petite animation du perso qui gratte le sol pendant 3 secondes). Au bout de
   l'animation, un overlay nous indique si on a trouvé quelque chose ou non. »*
   ⚠️⚠️⚠️ CE QU'ELLE RÉPARE EST PLUS GRAND QUE L'ANIMATION : jusqu'au 469, **le jeu
   disait le contenu d'un cratère AVANT qu'on l'ouvre.** L'invite valait « ⌨ E :
   apprivoiser » sur les deux étoiles, « ⌨ E : la plaque » sur la matière et
   « ⌨ E : fouiller » sur les vides — c'est-à-dire que les deux cratères vides se
   RECONNAISSAIENT à leur invite, donc qu'on ne les fouillait jamais, donc que la
   chasse n'était pas une chasse. *Un échec qui s'annonce n'est pas un échec, c'est
   une étiquette.* L'invite est désormais la MÊME sur les cinq tant qu'on n'a pas
   gratté, et c'est ce qui rend les deux vides utiles au lieu d'être une punition.
   ⚠️ ELLE EST PARTAGÉE ET ARBITRÉE PAR L'HÔTE, comme tout le reste : deux joueurs
   ne peuvent pas lire deux vérités sur le même trou, et un client ne décide pas
   qu'un cratère est ouvert (règle dure du 439). Elle ne coûte AUCUN message
   supplémentaire en régime : `star` voyage déjà dans l'`apply`.
   ⚠️ ET ELLE NE PEUT PAS ÊTRE DÉDUITE DE `found`. Pour une étoile, `found` veut
   dire APPRIVOISÉE — soixante secondes plus tard. Entre les deux il y a tout le
   chapitre : c'est justement l'intervalle qu'on veut rendre visible. */
export function starDug(e, id) { return !!(e && e.dug && e.dug[id]); }
/* Le temps de grattage, en millisecondes. ⚠️ C'EST LE CHIFFRE DE GUILLAUME (« 3
   secondes ») et il n'est pas réglé à l'œil ailleurs : la boucle de rendu, la
   jauge et le banc lisent CETTE constante. Un geste dont la durée est écrite à
   deux endroits est la divergence en attente du §8 de `CLAUDE.md`, et son symptôme
   serait le pire pour un geste tenu : une barre qui se remplit sans rien ouvrir. */
export const STAR_DIG_MS = 3000;
/* ⚠️ ON NE PEUT PAS FOUILLER EN MARCHANT. Le seuil est celui d'un pas de course
   arrondi : au-delà, la fouille s'annule. C'est ce qui fait que le geste COÛTE
   trois secondes d'immobilité au lieu d'être une touche à marteler en passant. */
export const STAR_DIG_MOVE_TILES = 0.6;
/* ── CE QU'UNE FOUILLE A TROUVÉ. ⚠️ UNE CLÉ, PAS UNE PHRASE : le texte vit dans
   `fermeStrings.js` comme tout ce que le joueur lit, et le banc vérifie qu'aucune
   de ces trois clés n'est orpheline (leçon des libellés de téléport, 444). */
export const STAR_DIG_RESULTS = ["star", "material", "empty"];
export function starDigResult(id) {
  const s = STAR_SITE[id];
  if (!s || s.spot !== "starFarmImpact") return null;
  return STAR_DIG_RESULTS.includes(s.content) ? s.content : "empty";
}
/* ⚠️⚠️ CE QUE LA FOUILLE ACCORDE, ET CE QU'ELLE N'ACCORDE PAS — C'EST TOUTE LA
   DIFFÉRENCE ENTRE LES TROIS CONTENUS.
     · `empty`    → le lieu est TROUVÉ dans le même geste : il n'y a rien d'autre à
                    en faire, et laisser un cratère vide « fouillé mais pas trouvé »
                    l'aurait laissé dans le pisteur pour toujours ;
     · `material` → fouillé seulement. Le morceau se gagne au mini-jeu de la plaque,
                    qui reste arbitré par `starFound` comme avant ;
     · `star`     → fouillé seulement. L'apprivoisement, qui est le chapitre, reste
                    entier derrière (`resolveStarCalm`).
   ⚠️ IL EST IDEMPOTENT : refouiller ne redate rien et ne rejoue aucune carte. Deux
   joueurs qui grattent le même trou dans la même seconde ne produisent qu'une
   ouverture — c'est l'hôte qui tranche, et il ne tranche qu'une fois. */
export function resolveStarDig(e, id, who, now) {
  const site = STAR_SITE[id];
  if (!site || site.spot !== "starFarmImpact") return { ok: false };
  if (!starFallen(e)) return { ok: false, tooEarly: true };
  if (starDug(e, id)) return { ok: true, already: true, found: starDigResult(id), crossed: [] };
  e.dug[id] = { by: String(who || "?").slice(0, 24), at: +now || 0 };
  const found = starDigResult(id);
  if (found === "empty") return { ...resolveStarFound(e, id, who, now), dug: true, found };
  return { ok: true, dug: true, found, crossed: [] };
}
/* Les cratères de ferme encore à retourner — ce que le bandeau compte, et la seule
   façon de le compter. ⚠️ UN VIDE FOUILLÉ EST FAIT : sans ça, « il reste deux
   impacts » resterait affiché sur deux trous qu'on a vidés. */
export function starDigLeft(e) { return STAR_FARM_IMPACTS.filter(s => !starDug(e, s.id)).length; }

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ 2026-09-03 (lot C) — LA SEPTIÈME SŒUR, PRISONNIÈRE DU LAC MALÉFIQUE.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️ DÉBLOQUÉ QUAND LE CHAPITRE « crater » EST CLOS, C'EST-À-DIRE QUAND LES SIX
   AUTRES COMPAGNES SONT RÉUNIES (§6 de QUETE.md, point 4 : « reine apprivoisée
   ET six étoiles trouvées » — la reine EST l'une des six, voir STAR_CHAPTERS).
   `e.ch >= STAR_CH_DONE - 1` teste « le chapitre final est atteint », jamais un
   numéro écrit en dur (règle de la table des chapitres, plus haut dans ce
   fichier). */
export function starEvilUnlocked(e) { return !!e && (e.ch | 0) >= STAR_CH_DONE - 1; }
export function starEvilFound(e) { return !!(e && e.evilFound); }
/* Idempotent, comme resolveStarFound : plusieurs joueurs qui l'approchent dans
   la même seconde ne produisent qu'une seule révélation. */
export function resolveStarEvilFound(e, now) {
  if (!starEvilUnlocked(e)) return { ok: false, tooEarly: true };
  if (starEvilFound(e)) return { ok: true, already: true };
  e.evilFound = +now || 1;
  return { ok: true };
}
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
  /* hors-zip — LE FOCUS PERSONNEL, ET C'EST LE SEUL ENDROIT OÙ IL JOUE. Demande
     de Guillaume : le chapitre 1 ne suit aucun ordre imposé, donc un joueur qui
     a choisi de creuser le SEPTIÈME trou de la table ne doit pas se voir répéter
     « il en reste un » pointé sur le PREMIER — c'est très exactement le défaut
     qu'il a signalé (le chevron restait rivé au trou de la table pendant qu'on
     visait le passage sombre pour l'étoile blanche). `ctx.focus` ne peut désigner
     qu'un lieu ENCORE manquant du chapitre EN COURS (`missing.includes`) : un
     choix périmé (le lieu vient d'être résolu, ou appartient à un autre chapitre)
     retombe silencieusement sur `missing[0]`, jamais sur une clé inventée — la
     même discipline de repli que le reste de cette table (§4 de CLAUDE.md). */
  const first = (ctx && ctx.focus && missing.includes(ctx.focus)) ? ctx.focus : missing[0];
  /* ⚠️⚠️ ZIP 454 — LES DEUX NOUVELLES ÉTAPES PASSENT DEVANT, ET SEULEMENT QUAND
     ELLES SONT ACTIONNABLES. C'est le sens de « le rôle des étoiles est de nous
     guider dans le projet » : le bandeau est la voix de l'étoile.
     · `engineer` — l'étoile vient de sortir du trou et elle conseille la mairie.
       C'est la seule chose à faire à cet instant, elle passe donc avant le reste ;
     · `timber` — tout est trouvé, il ne manque que du bois. Sans cette clé, le
       bandeau n'aurait plus rien à dire pendant toute la fin de la construction.
     ⚠️⚠️⚠️ ZIP 470 — L'ATTENTE DE L'INGÉNIEUR ÉTAIT UN OBJECTIF UNIQUE
     (`engineerWait`), ET C'ÉTAIT FAUX DEPUIS LE DÉCHANT (469). L'ancien
     commentaire disait qu'attendre n'était « pas un objectif » parce qu'il
     restait les deux croisements d'ombres à jouer pendant les quinze minutes de
     dessin — sauf que le déchant les a SUPPRIMÉS, et que la clé unique couvrait
     pourtant encore les DEUX phases (`travel` : trois minutes de train,
     `work` : quinze minutes de dessin) sous la seule phrase du dessin. Un joueur
     qui venait de payer Kerguélen lisait donc « Kerguélen dessine près du
     ponton » pendant qu'il était encore dans le train — *un texte n'est pas un
     décor : il AFFIRME* (448), et pendant trois minutes il affirmait faux.
     Signalé par Guillaume : il fallait un indicateur qui dise d'abord
     « contacté, arrive bientôt », puis « travaille près du pier, rendra le plan
     bientôt ». Deux phases, deux clés, comme `starPlanPhase` les distingue déjà
     pour le panneau de la mairie (`hallTravel` / `hallWork`) — le bandeau
     permanent leur emboîte le pas, via `ctx.engineerHere` (dérivé par l'appelant
     de `starEngineerHere`, jamais recalculé ici sur une seconde horloge). */
  /* ⚠️⚠️ 2026-09-02 (lot A2) — `!missing.length` A ÉTÉ AJOUTÉ, ET SANS LUI LA
     SIXIÈME SŒUR N'EXISTERAIT PAS POUR LE BANDEAU. Cette clé passe AVANT tout le
     reste (c'est la voix de l'étoile qui conseille la mairie) : dès que la reine
     sortait, elle prenait la parole pour toujours. La discrète, annoncée par la
     reine elle-même, n'aurait jamais eu une ligne — un objectif qu'on ne peut pas
     lire est un objectif qui n'existe pas (444, cinq lieux inatteignables).
     ⚠️ ELLE NE RETARDE RIEN D'AUTRE : la discrète est le dernier `need` du
     chapitre 2, donc `missing` se vide dès qu'on l'a repérée, et l'ingénieur
     reprend la parole exactement où il la prenait avant. */
  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ 2026-09-03 (lot C) — LA SEPTIÈME SŒUR PREND LE PAS SUR TOUT, MAIS UNE
     ║ SEULE FOIS.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️⚠️ CETTE CLÉ EST TESTÉE AVANT `engineer` JUSTE EN DESSOUS, ET C'EST UNE
     CORRECTION, PAS UN CHOIX ARBITRAIRE : posée dans le bloc `!first`
     (immédiatement sous `engineer`, l'endroit « logique »), elle ne se déclenchait
     JAMAIS — `engineer` a exactement la même condition de déblocage
     (`!missing.length`, la même chose que `starEvilUnlocked`) et la teste EN
     PREMIER, donc « pas encore demandé de plans » gagnait toujours contre
     « la reine vient de parler ». Trouvé en écrivant le banc (`tools/verify-quete.mjs`,
     section « Lot C »), jamais en le relisant.
     ⚠️ TANT QU'ELLE N'EST PAS ENCORE VUE, CETTE CLÉ PASSE DEVANT TOUT LE RESTE
     — même famille que `engineer` juste en dessous, en plus urgent : la reine
     interrompt le fil du bateau pour un fait plus pressant (« elle s'éteint »),
     pas pour une corvée de plus. `starWithMe` fera parler la reine sur cette
     même clé (`frame.evilSeek`), le bandeau montre `hud.goal.evilSeek`, et le
     chevron la suit (STAR_GOAL_TARGET.evilSeek = "evilLake").
     ⚠️ UNE FOIS VUE (`starEvilFound`), CETTE CLÉ NE REVIENT JAMAIS : rien n'est
     encore CONSTRUIT pour la sauver (protection de la canne = lot D, pêche
     dédiée = lot D/E) — la garder en tête du bandeau aurait enterré le
     chantier naval, qui reste la seule progression réellement actionnable
     tant que ces lots ne sont pas livrés. C'est la même discipline que
     `engineer` : une clé qui n'a plus rien à dire cède la place. */
  if (starEvilUnlocked(e) && !starEvilFound(e)) return "evilSeek";
  if (starHas(e, "crater") && !missing.length && !starPlanAsked(e)) return "engineer";
  if (!first) {
    if (!starPlanReady(e)) return (ctx && ctx.engineerHere) ? "engineerWork" : "engineerTravel";
    /* ⚠️ ZIP 480 — LA PASSE MAIRE PREND SA PLACE DANS LE BANDEAU, entre les plans
       rendus et la première commande de bois. Sans cette clé, le joueur lirait
       « commande la première pièce à Tristan » devant un bouton qui refuse. */
    if (!MA.mayorSigned(e)) return "mayor";
    /* ╔══════════════════════════════════════════════════════════════════════════
       ║ ZIP 478 — `timber` COUVRAIT TROIS ÉTATS. C'EST LE DÉFAUT DU 475, REJOUÉ
       ║ PAR LA PASSE QUI L'AVAIT CORRIGÉ.
       ╚══════════════════════════════════════════════════════════════════════════
       ⚠️⚠️⚠️ Le 475 avait scindé `farmImpacts` parce qu'une seule phrase couvrait
       « pas fouillé », « fouillé-étoile » et « fouillé-matière ». Le chantier naval
       vient de gagner exactement la même profondeur : commander, attendre, MONTER.
       Et l'ancienne phrase — « Commande la pièce suivante à Tristan » — devenait
       fausse DEUX FOIS : elle dit « la suivante » alors que les cinq se commandent
       ensemble, et elle envoie au menu Employés quelqu'un dont la pièce est déjà
       posée au pied de la cale, à attendre un marteau.
       ⚠️⚠️ L'ORDRE EST CELUI DE L'ACTION LA PLUS PROCHE, pas celui du déroulé : ce
       qui attend un geste passe devant ce qui attend une horloge, qui passe devant
       ce qui attend une décision. Un bandeau doit répondre à « qu'est-ce que je
       peux faire MAINTENANT », jamais à « où en est le chantier ». */
    if (starTimberToRaise(e)) return "timberRaise";
    if (starTimberBusyCount(e) > 0) return "timberWait";
    return starTimberNext(e) ? "timberOrder" : null;
  }
  /* ⚠️⚠️ ZIP 475 (audit 472, défaut #8) — « farmImpacts » COUVRAIT TROIS ÉTATS
     SOUS UNE SEULE PHRASE. Le premier impact manquant peut être : pas encore
     fouillé (rien à dire de plus que « cherche ») ; fouillé et c'est une
     ÉTOILE, qui attend qu'on lui tourne le dos (`resolveStarCalm`) ; fouillé
     et c'est une PLAQUE MÉTÉORIQUE, qui attend de refroidir puis le mini-jeu
     de la cendre (`starTouchFurrow` → `resolveStarFound`). `starDug` distingue
     les deux premiers cas du troisième — un impact VIDE, lui, n'atteint jamais
     cette branche : `resolveStarDig` l'accorde (`resolveStarFound`) dans le
     même geste que la fouille, donc il n'est plus « manquant » une fois
     fouillé (voir `starDug`, `resolveStarDig`). */
  if (STAR_FARM_STAR_IDS.includes(first) || (STAR_SITE[first] && STAR_SITE[first].spot === "starFarmImpact")) {
    if (starDug(e, first) && STAR_SITE[first].content === "material") return "farmImpactCool";
    /* ⚠️⚠️⚠️ ZIP 479 — `farmImpactTame` COUVRAIT DEUX ÉTOILES QUI NE FONT PLUS LE
       MÊME GESTE. C'est le défaut du 475 une troisième fois, et il se rejoue
       toujours de la même façon : une clé qui avait l'air homogène cesse de l'être
       le jour où le code sous elle se dédouble. La sortie est la même qu'au 475 et
       au 478 — on descend d'un cran, et c'est le VERBE qui décide. */
    if (starDug(e, first) && STAR_SITE[first].content === "star") return starTameGoalKey(e, first, ctx);
    return "farmImpacts";
  }
  /* ⚠️⚠️ ZIP 471 — « TOMBÉ » CÔTÉ HÔTE N'EST PAS « TOMBÉ » CÔTÉ CE CLIENT.
     `starTownFallen(e)` ne regarde que l'horodatage de l'hôte : il devient vrai
     dès la diffusion, AVANT que la scène de chute n'ait fini de jouer — ou même
     avant qu'elle ait commencé, pour un joueur resté à la ferme pendant qu'un
     autre déclenchait la chute en ville (`starScenePump` ne met la scène en
     file que pour un client physiquement EN VILLE). Vu par Guillaume : le
     bandeau annonçait « le trou brûle à l'est de Valley Town » à un joueur qui
     n'avait pourtant rien vu tomber. C'est le défaut du bandeau de l'ingénieur
     (470) rejoué sur le météore : une clé qui affirme un fait sur l'horloge de
     l'HÔTE au lieu de celle de CE client. `ctx.landed` est fourni par
     l'appelant (`starImpactLandedNow`, la même garde qui retient déjà le décor
     du cratère et son panache) — jamais recalculé ici, qui n'a pas de scène à
     interroger. Un `ctx` sans `landed` retombe sur le fait brut de l'hôte, pour
     ne pas casser un appelant qui ne le fournirait pas encore. */
  /* ⚠️ hors-zip — DEUX PHRASES, PAS UNE, MÊME PATRON QUE `engineerTravel`/
     `engineerWork` (470) : `townWait` dit d'aller prendre le train, ce qui est
     faux pour qui l'a déjà pris — signalé par Guillaume, le bandeau continuait
     de demander le trajet à un joueur arrivé et qui attendait sur place.
     `ctx.inTown` (starGoalCtx, FermeGame.js) fait le partage. */
  if (first === "crater" && !(ctx && ("landed" in ctx) ? ctx.landed : starTownFallen(e)))
    return (ctx && ctx.inTown) ? "townWaitThere" : "townWait";
  /* ⚠️ L'ORDRE DE LA TABLE FAIT FOI, comme pour `starTargetSite` : le premier qui
     manque est celui qu'on cherche. Aucune liste parallèle. */
  if (first === "crater" && ctx && ctx.craterHot) return "craterHot";
  /* ⚠️⚠️ ZIP 479 — LA REINE DEMANDE DEUX BORDS, DONC LE BANDEAU DOIT LE DIRE, et
     il doit dire AUTRE CHOSE au joueur qui est seul et n'a pas encore planté son
     figurant : celui-là n'a rien à tenir, il a un épouvantail à aller chercher.
     Une seule phrase pour les deux aurait demandé de « se placer au bord opposé »
     à quelqu'un qui n'a personne en face — la définition même de l'objectif qui
     ment. `ctx.effigy` et `ctx.alone` viennent de l'appelant : la position du
     cratère et la liste des joueurs ne sont pas des données de cette table. */
  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ 2026-09-02 (lot A) — LE CRATÈRE A TROIS ÉTATS DE PLUS, ET L'ORDRE EST CELUI
     ║ DE L'ACTION LA PLUS PROCHE (478), PAS CELUI DU RÉCIT.
     ╚══════════════════════════════════════════════════════════════════════════
     C'est le défaut du 475 / 478 / 479 pris de vitesse : une clé (`crater`) qui
     avait l'air homogène cesse de l'être le jour où le geste sous elle se
     dédouble. Ici il se DÉTRIPLE — nourrir, réveiller, tenir — donc trois clés.
     ⚠️ `craterFeed` / `craterFeedPay` SONT LE MIROIR EXACT de `farmImpactLight` /
     `farmImpactLightPay` : même donnée personnelle (`ctx.candy`, la fraîcheur
     datée et non le flux brut), même partage. Ce qui change est le PRIX, et il
     vient de `starOfferPrice` — pas d'une constante recopiée ici.
     ⚠️⚠️ ET `craterAlone` DESCEND EN DERNIER, ce qui est un correctif silencieux :
     tel qu'il était écrit, un joueur seul lisait « plante ton épouvantail » alors
     qu'il lui restait 80 lumières à rapporter et un réveil à jouer — un objectif
     qui saute deux étapes est un objectif qui ment (448). */
  if (first === "crater" && !starLit(e, "crater"))
    return (ctx && (ctx.candy | 0) >= starOfferPrice("crater")) ? "craterFeedPay" : "craterFeed";
  if (first === "crater" && !starWoke(e, "crater")) return "craterWake";
  if (first === "crater" && !e.effigy && ctx && ctx.alone) return "craterAlone";
  /* ⚠️ 2026-09-02 (lot A2) — DEUX PHRASES POUR LA DISCRÈTE, ET LE PARTAGE EST
     CELUI DE LA ZONE : à la ferme, le bandeau dit de prendre le train (elle est en
     ville) ; en ville, il dit où chercher. Même geste que `townWait`/
     `townWaitThere`, signalé par Guillaume sur l'attente du cratère — un bandeau
     qui redemande un trajet déjà fait. */
  if (first === "townShy") return (ctx && ctx.inTown) ? "townShy" : "townShyAway";
  /* 2026-09-03 (lot A3) — MÊME PARTAGE PAR ZONE POUR LA VERTE, et une TROISIÈME
     phrase quand la reine s'est mise à mener : ce n'est plus « cherche », c'est
     « suis-la ». Sans elle, le bandeau continuerait de demander de chercher
     pendant que le fermier marche tout seul derrière une étoile — deux réponses à
     « qu'est-ce que je fais », le défaut du 449. */
  if (first === "townGreen") {
    if (!(ctx && ctx.inTown)) return "townGreenAway";
    return (ctx && ctx.greenGuide) ? "townGreenLed" : "townGreen";
  }
  return first;
}
/* ⚠️ LA CLÉ D'UN TROU D'ÉTOILE DÉJÀ FOUILLÉ — UNE PAR ÉTAT, ET C'EST LE POINT.
   Sept états pour deux étoiles : la bleue en a trois (il me manque des bonbons /
   je peux payer / c'est payé, à moi de me retourner), la gourmande en a quatre
   (rien sur le feu / ça mijote / c'est prêt / je cours). Chacun demande un geste
   DIFFÉRENT, donc chacun a sa phrase — c'est très exactement ce que l'audit
   reprochait au chantier naval avant le 478.
   ⚠️ ELLE EST EXPORTÉE POUR QUE LE BANC L'APPELLE SUR CHAQUE ÉTAT, plutôt que de
   la deviner à travers `starGoalKey`. */
export function starTameGoalKey(e, id, ctx) {
  const verb = starVerbOf(id);
  if (verb === "light") {
    if (starLit(e, id)) return "farmImpactTame";
    return (ctx && (ctx.candy | 0) >= STAR_CANDY_PRICE) ? "farmImpactLightPay" : "farmImpactLight";
  }
  if (verb === "warm") {
    const ph = starDishPhase(e, ctx && ctx.now);
    if (ph === "carry") return "farmImpactCarry";
    if (ph === "ready") return "farmImpactTake";
    if (ph === "cook") return "farmImpactSimmer";
    return "farmImpactWarm";
  }
  /* hors-zip — DEUX PHRASES, PAS UNE : signalé par Guillaume en jouant, le
     chevron restait planté sur le chaudron après la fiole préparée — la même
     étoile pointant vers un atelier déjà quitté. Le 480 bis avait choisi une
     seule phrase EXPRÈS pour ne pas faire lire `f.inv.starLure` (un état
     React personnel) par ce fichier ; la sortie n'est pas d'y renoncer, c'est
     celle déjà en place pour la bleue (`ctx.candy` ci-dessus) : la donnée
     personnelle voyage dans le CONTEXTE que l'appelant construit, jamais lue
     ici directement. `ctx.potion` est le miroir exact de `ctx.candy`. */
  if (verb === "lure") return (ctx && ctx.potion) ? "farmImpactLureGive" : "farmImpactLure";
  return "farmImpactTame";
}
/* Toutes les clés que `starGoalKey` peut rendre — DÉRIVÉES de la table, pour que
   le banc vérifie qu'aucune n'est orpheline de texte. ⚠️ C'est le contrôle qui
   manquait aux libellés de téléport (444) : une clé sans phrase ne plante pas,
   elle affiche `undefined` dans le bandeau. */
export const STAR_GOAL_KEYS = (() => {
  const out = [];
  for (const s of STAR_SITES) {
    /* ⚠️ ZIP 475 — LES DEUX CLÉS DU TROU FOUILLÉ NAISSENT ICI, À CÔTÉ DE
       `farmImpacts`, POUR LA MÊME RAISON QUE `craterHot`/`engineer` naissent à
       côté de `crater` : elles ne sont pas des lieux de plus, elles sont des
       ÉTATS du même lieu (voir `starGoalKey`). */
    /* ⚠️ ZIP 479 — SEPT CLÉS POUR LES TROUS D'ÉTOILE (voir `starTameGoalKey`) : le
       banc vérifie ici qu'aucune n'est orpheline de texte, ce qui est le seul
       moyen d'ajouter un état sans afficher `undefined` dans le bandeau. */
    if (s.spot === "starFarmImpact") {
      if (!out.includes("farmImpacts"))
        out.push("farmImpacts", "farmImpactCool", "farmImpactTame",
                 "farmImpactLight", "farmImpactLightPay",
                 "farmImpactWarm", "farmImpactSimmer", "farmImpactTake", "farmImpactCarry",
                 "farmImpactLure", "farmImpactLureGive");
      continue;
    }
    out.push(s.id);
    /* 2026-09-02 (lot A) — trois états de plus pour le même lieu (voir
       `starGoalKey`) : le banc vérifie ici qu'aucun n'est orphelin de texte,
       ce qui est le seul moyen d'ajouter un état sans afficher `undefined`. */
    if (s.id === "crater") out.push("craterHot", "craterFeed", "craterFeedPay",
                                    "craterWake", "craterAlone", "engineer");
    // 2026-09-02 (lot A2) — deux états du même lieu : loin (prends le train) et sur place.
    if (s.id === "townShy") out.push("townShyAway");
    // 2026-09-03 (lot A3) — trois états : loin, sur place, et menée par la reine.
    if (s.id === "townGreen") out.push("townGreenAway", "townGreenLed");
  }
  /* ⚠️ ZIP 454 — les clés de la construction. Elles ne sont pas dérivées de
     `STAR_SITES` parce qu'elles ne sont pas des LIEUX : deux désignent une
     attente, l'autre un atelier de ferme. Elles sont ici pour que le banc
     vérifie qu'elles ont un texte — c'est tout ce que cette liste sert à faire.
     ⚠️ ZIP 470 — `engineerWait` DEVIENT DEUX CLÉS, `engineerTravel` et
     `engineerWork` : la même attente, mais plus la même phrase (voir la note
     de `starGoalKey`). */
  /* ⚠️ ZIP 478 — `timber` DEVIENT TROIS CLÉS, même geste qu'au 470 pour l'attente
     de l'ingénieur et qu'au 475 pour le trou fouillé : la même étape, mais plus la
     même phrase selon ce qu'on peut faire. */
  /* ⚠️ ZIP 480 — `mayor` s'ajoute ici pour la même raison que les trois du 478 :
     ce n'est pas un LIEU (l'audience se tient à la mairie, qui a déjà son
     adresse), c'est une ÉTAPE, et cette liste ne sert qu'à obliger le banc à
     réclamer sa phrase de bandeau dans les deux langues. */
  out.push("townWait", "townWaitThere", "engineerTravel", "engineerWork", "mayor",
           "timberOrder", "timberWait", "timberRaise");
  /* 2026-09-03 (lot C) — même raison que le bloc juste au-dessus : "evilSeek"
     n'est pas un LIEU de `STAR_SITES` (elle n'y a pas encore d'entrée, voir
     `resolveStarEvilFound`), c'est une ÉTAPE. Cette liste n'existe que pour
     obliger le banc à réclamer sa phrase dans les deux langues. */
  out.push("evilSeek");
  return out;
})();

export function resolveStarTownFall(e, now) {
  if (!e || !starFallen(e) || e.ch < 1) return { ok: false, locked: true };
  if (starTownFallen(e)) return { ok: false, already: true };
  e.townFall = +now || 0;
  return { ok: true, scene: "townFall" };
}

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
/* ⚠️⚠️ LOT E — `ms` EST FACULTATIF, ET C'EST CE QUI GARDE UN SEUL ENDROIT QUI
   SACHE ÉCRIRE `e.wood[key]`. La manche de sciage raccourcit ou allonge la
   commande (`sawResult().msScale`) ; l'appelant aurait pu réécrire `readyAt`
   après coup, et il y aurait alors eu DEUX formes du même état — celle d'ici et
   celle de la retouche —, qui divergent au premier champ ajouté (§8 de
   `CLAUDE.md`). Sans argument, le comportement est celui d'avant, au champ près :
   c'est ce qui rend la passe sûre pour le menu développeur et les migrations. */
export function commitStarTimber(e, key, who, now, ms) {
  const t = C.STAR_TIMBER[key];
  const d = ms > 0 ? Math.round(ms) : t.ms;
  e.wood[key] = { at: now, readyAt: now + d, done: false, by: String(who || "?").slice(0, 24) };
  return { ok: true };
}
/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 478 — LE BATTEMENT LIVRE, IL NE POSE PLUS. ET IL REND UNE LISTE.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️⚠️ SON COMMENTAIRE D'AVANT DISAIT : « il ne rend qu'une clé à la fois, et
   c'est voulu — deux pièces ne peuvent pas être en cours en même temps (l'ordre
   l'interdit), donc une boucle qui en livrerait plusieurs serait du code pour un
   cas qui ne peut pas exister ». **Ce raisonnement était juste et il est devenu
   faux dans la seconde où la garde `prev` est tombée** : en parallèle, deux
   commandes lancées ensemble peuvent échoir dans le même battement, et un `return`
   au premier aurait laissé la seconde attendre le tic suivant — sans que rien ne
   le dise, puisque son `readyAt` était déjà passé.
   *Un « ce cas ne peut pas exister » est toujours daté par la règle qui l'empêche ;
   quand on retire la règle, il faut aller relire ce qu'elle justifiait.* C'est la
   raison pour laquelle cette note reste ici en entier.
   ⚠️ IL POSE `ready`, PAS `done` : ce qui suit la livraison est un GESTE du joueur
   sur la cale (`resolveStarTimberRaise`), pas la fin d'un compte à rebours.
   ⚠️ IL EST IDEMPOTENT : `ready` déjà vrai est ignoré, donc un battement rejoué —
   ou deux hôtes qui se relaient — ne redit pas deux fois la même livraison. */
export function resolveStarTimberTick(e, now) {
  const keys = [];
  for (const k of STAR_SHIP_KEYS) {
    const w = e.wood && e.wood[k];
    if (!w || w.done || w.ready) continue;
    if ((+now || 0) < w.readyAt) continue;
    w.ready = true;
    keys.push(k);
  }
  return keys.length ? { ok: true, keys } : { ok: false, keys: [] };
}
/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 478 — LE MONTAGE. Demande de Guillaume, mot pour mot : « Il faut ajouter
   ║ aussi le même mini jeu marteau que pour l'amélioration de la grange. »
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ C'EST LE PREMIER GESTE DU CHAPITRE 3, ET IL N'Y EN AVAIT AUCUN : le joueur
   cliquait cinq fois dans un menu et regardait un sablier. La pièce apparaît
   maintenant sur la cale SOUS SON MARTEAU, ce qui fait de chaque livraison un
   jalon qu'on va voir — le geste que Stardew appelle « le Junimo emporte le lot ».
   ⚠️ IL N'ACCORDE RIEN PAR LUI-MÊME (§3, règle du 439) : le mini-jeu rend `onWin`,
   le client envoie une `req`, et c'est CETTE fonction, chez l'hôte, qui tranche.
   ⚠️ ET C'EST ELLE QUI PORTE LA FIN, MAINTENANT : `resolveStarGift` ne peut plus
   vivre dans le battement, puisque le battement ne finit plus le navire. Leçon 474
   — un résolveur appelé d'un seul endroit ne s'exécute que si cet endroit est
   atteint —, appliquée d'avance en déplaçant l'appel avec le fait qu'il observe. */
export function resolveStarTimberRaise(e, key, who, now) {
  if (!starTimberReady(e, key)) return { ok: false, why: starTimberBlock(e, key) || "notReady" };
  const w = e.wood[key];
  w.done = true;
  w.ready = false;
  w.raisedBy = String(who || "?").slice(0, 24);
  w.raisedAt = +now || 0;
  return { ok: true, key, complete: starShipComplete(e) };
}

/* Une trouvaille. ⚠️ IDEMPOTENT PAR CONSTRUCTION : `found` est un dictionnaire,
   le retrouver réécrit la même clé. C'est ce qui autorise un geste à se répéter
   sans jamais compter deux fois — la règle du 439 (« un panneau qui s'ouvre à
   volonté ne doit rien donner ») tenue par la forme de la donnée et non par un
   garde-fou qu'on peut oublier. */
/* ⚠️ ZIP 479 — `withWho` EST LE SECOND JOUEUR, ET IL EST FACULTATIF. Il ne change
   RIEN à ce que la trouvaille accorde : il l'ÉCRIT, pour que la scène et la trace
   de fin puissent le nommer (défaut de l'audit 477 : « le second joueur ne reçoit
   rien »). Un paramètre absent laisse `found[id]` exactement tel qu'il était avant
   ce zip — c'est ce qui rend la passe sûre pour les onze appelants existants. */
export function resolveStarFound(e, id, who, now, withWho) {
  const site = STAR_SITE[id];
  if (!site) return { ok: false };
  if (site.req && !site.req.every(r => starHas(e, r))) return { ok: false, locked: true };
  if (starHas(e, id)) return { ok: true, already: true, crossed: [] };
  e.found[id] = { by: String(who || "?").slice(0, 24), at: now };
  if (withWho) e.found[id].with = String(withWho).slice(0, 24);
  /* ⚠️⚠️ ZIP 469 — TROUVER IMPLIQUE AVOIR FOUILLÉ, ET C'EST ÉCRIT ICI UNE SEULE
     FOIS. Le menu dev, les migrations et le résolveur d'apprivoisement passent
     tous par cette porte : sans cette ligne, un raccourci de développeur laisserait
     un cratère « trouvé mais pas fouillé », donc une invite qui propose de gratter
     un trou déjà vidé. C'est la parade du 449 — *une jointure, jamais deux listes* —
     appliquée à deux dictionnaires qui décrivent le même geste à deux instants. */
  if (site.spot === "starFarmImpact" && !e.dug[id]) e.dug[id] = { by: e.found[id].by, at: now };
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
/* ⚠️⚠️ LA LONGUEUR MAXIMALE D'UNE CLÉ DE TENUE, DÉRIVÉE DE SES TROIS PARTIES ET
   ÉCRITE UNE SEULE FOIS. `migrateStar` et `resolveStarCalm` la lisent tous les
   deux : deux plafonds différents, et l'un des deux couperait ce que l'autre
   garde — la divergence en attente du §8 de `CLAUDE.md`, sur le champ même qui
   vient de coûter un blocage. */
export const CALM_ID_MAX = 64;                                   // un UUID en fait 36
export const CALM_KEY_MAX = 40 + 1 + CALM_ID_MAX + 3;            // lieu + « : » + joueur + « :t0 »
/* ⚠️⚠️⚠️ ZIP 479 — LE QUATRIÈME PARAMÈTRE CHANGE DE FORME, ET C'EST DÉLIBÉRÉ. Il
   s'appelait `soloAllowed` et portait `starAlone(...)`, c'est-à-dire l'INVERSE de
   ce que son nom disait ; il porte maintenant un contexte explicite
   `{ alone, partner }`. Un paramètre dont le nom ment est une divergence en
   attente qui se paie au premier lecteur — celui-ci a tenu quatre zips.
   ⚠️ `partner` vaut `"player"`, `"effigy"` ou rien : c'est ce que la reine lit
   pour choisir entre vingt et soixante secondes (`starTameNeed`). */
export function resolveStarCalm(e, who, now, ctx, siteId) {
  const target = siteId || "crater";
  const site = STAR_SITE[target];
  if (!site || (target !== "crater" && site.content !== "star")) return { ok: false };
  if (starHas(e, target)) return { ok: true, already: true, crossed: [] };
  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ ZIP 479 — CHAQUE ÉTOILE SON VERBE, ET L'ARBITRE LE TIENT.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ LA ROSE NE S'APPRIVOISE PAS EN LUI TOURNANT LE DOS, elle vient au plat
     chaud (`resolveStarDishServe`). Sans cette ligne, les deux gestes ouvriraient
     le même trou et le lot entier ne servirait à rien : le joueur découvrirait par
     hasard que la vieille posture marche encore, donc il ne cuisinerait jamais.
     ⚠️ ET LA BLEUE DEMANDE SON OFFRANDE D'ABORD. Le refus est SILENCIEUX (`ok:
     false`, donc sans diffusion, §3) : le client ne demande pas tant que l'invite
     n'est pas passée (`starTameTarget`), c'est la ceinture et non la bretelle —
     un second client d'une version d'avant ne doit pas pouvoir sauter le geste. */
  const verb = starVerbOf(target);
  /* ⚠️ LA ROSE SE REFUSE TOUT DE SUITE (son geste est ailleurs) ; LA BLEUE, ELLE,
     SE REFUSE **APRÈS** LA FOUILLE. L'ordre est celui du joueur : on gratte, on
     découvre une lumière bleue, et ALORS on apprend qu'elle veut une offrande. Un
     refus « il lui faut des bonbons » sur un trou intact annoncerait ce qu'il y a
     dedans avant de l'avoir ouvert — la cinquième porte du 448, encore. */
  if (verb === "warm") return { ok: false, wrongVerb: true, verb };
  /* ⚠️⚠️ ZIP 469 — ON N'APPRIVOISE PAS UNE ÉTOILE QU'ON N'A PAS DÉTERRÉE. L'ordre
     du geste est celui de la demande de Guillaume : on fouille, l'overlay dit ce
     qu'il y a, ET ALORS l'apprivoisement commence. Sans cette garde, un joueur qui
     se tiendrait tranquille au bord d'un cratère intact ferait sortir une étoile
     dont il ignore l'existence — ce qui rendrait la fouille décorative.
     ⚠️ LE REFUS EST SILENCIEUX (`ok: false`), donc sans diffusion : le client ne
     demande de toute façon pas tant que le trou n'est pas ouvert (`starTameTarget`).
     Cette ligne est la ceinture, pas la bretelle — un second client d'une version
     d'avant ne doit pas pouvoir sauter le chapitre. */
  if (site.spot === "starFarmImpact" && !starDug(e, target)) return { ok: false, unDug: true };
  /* ⚠️⚠️ 2026-09-02 (lot A) — CE TEST NE DEMANDE PLUS « EST-CE LA BLEUE ? », IL
     DEMANDE « CETTE ÉTOILE SE PAIE-T-ELLE ? ». La reine est devenue payante le
     jour où Guillaume a voulu qu'on la nourrisse ; un test sur le VERBE aurait
     laissé passer les 80 lumières sans les payer, en silence, parce que son verbe
     est `pair` et pas `light`. `starOfferPrice` est la seule réponse à cette
     question, ici comme dans l'invite et dans le bandeau. */
  if (starOfferPrice(target) > 0 && !starLit(e, target)) return { ok: false, unlit: true, verb };
  /* ⚠️⚠️⚠️ ET ON NE TIENT PAS COMPAGNIE À QUELQU'UN QUI DORT. Sans cette ligne, la
     séquence en trois temps se contournerait par le seul geste qui existait avant
     elle : nourrir puis se retourner, sans jamais réveiller. Le refus est
     SILENCIEUX et la tenue n'est même pas COMPTÉE — exactement comme `tooHot`
     (446) : un refus qui consommerait la tenue ferait « je me suis tenu tranquille
     une minute pour rien », qui est la pire chose qu'un jeu puisse répondre. */
  if (verb === "pair" && !starWoke(e, target)) return { ok: false, asleep: true, verb };
  /* 480 bis — LA BLANCHE NE SE LAISSE APPROCHER QU'AVEC LA CONCOCTION EN
     POCHE. `ctx.potion` est calculé par l'hôte, jamais fourni tel quel par le
     client (voir l'appel dans `FermeGame.js`, qui le lit dans `f.inv.starLure`
     au moment même de la requête) — même discipline que `partner`/`mate` pour
     la reine. Sans la fiole, le refus est silencieux, comme `unlit` : le
     bandeau dit déjà d'aller la préparer (`farmImpactLure`). */
  if (verb === "lure" && !(ctx && ctx.potion)) return { ok: false, notLured: true, verb };
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
  if (target === "crater" && !starCraterCool(e, now - (e.townFall || 0)))
    return { ok: false, tooHot: true, cool: Math.max(0, STAR_CRATER_COOL_MS - (now - (e.townFall || 0))) };
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
  /* ⚠️⚠️ ZIP 479 — LE BESOIN VIENT DE `starTameNeed`, ET DE NULLE PART AILLEURS.
     Il était écrit ICI **et** dans `starCalmNeed` : deux écritures de la même
     durée, à cinq cents lignes l'une de l'autre, dont l'une servait la jauge et
     l'autre le verdict. Elles disaient la même chose — jusqu'au jour où la reine
     a eu son propre barème, c'est-à-dire aujourd'hui. */
  const both = (verb === "pair") ? (ctx && ctx.partner === "player") : (ctx && ctx.alone === false);
  const need = starTameNeed(target, ctx);
  if (mine >= need) {
    /* ⚠️ LE SECOND JOUEUR EST NOMMÉ DANS LA TROUVAILLE, pas seulement dans le
       chat : c'est ce qui permet à la trace de fin de le nommer une heure plus
       tard (voir `resolveStarFound`). Un épouvantail n'est pas un nom — il n'a
       tenu personne compagnie, il a tenu un bord. */
    const mate = (ctx && ctx.partner === "player" && ctx.mate) ? ctx.mate : null;
    /* ⚠️⚠️ ZIP 479 — `who` EST UN IDENTIFIANT, PAS UN NOM, ET LA TROUVAILLE VEUT UN
       NOM. C'est un défaut hérité qui ne se voyait pas : `resolveStarCalm` reçoit
       `f.id` (il lui faut une clé de tenue STABLE, un nom ne l'est pas — deux
       fermiers peuvent porter le même), et il le passait tel quel à
       `resolveStarFound`, donc `found.by` contenait un UUID pour toute étoile
       apprivoisée. Personne ne l'affichait — jusqu'à ce que la trace de fin veuille
       nommer les deux joueurs. `ctx.name` porte donc le nom, et l'identifiant reste
       ce qui arbitre. */
    const byName = (ctx && ctx.name) ? ctx.name : who;
    return { ...resolveStarFound(e, target, byName, now, mate), opened: true, both: !!both,
             site: target, half: verb === "pair" && !both, mate };
  }
  return { ok: true, holding: mine, both: !!both, need, site: target, crossed: [] };
}

/* ╔══════════════════════════════════════════════════════════════════════════════
   ║ ZIP 479 — LES TROIS VERBES, ARBITRÉS. (lot 3b)
   ╚══════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ AUCUN DE CES RÉSOLVEURS N'APPLIQUE QUOI QUE CE SOIT AU FERMIER : ils
   rendent ce qu'il faut PRÉLEVER (`spend`) et l'hôte le prélève. C'est la forme du
   442 tenue partout dans ce fichier, et elle vaut ici plus qu'ailleurs — un
   résolveur qui toucherait `f.inv` serait impossible à rejouer dans un banc, donc
   le seul geste de la quête qui coûte quelque chose serait aussi le seul qu'aucun
   contrôle ne regarde. */

/* ── LA BLEUE, 1/2 : LE FLUX DE BONBONS.
   ⚠️⚠️ APPELÉ PAR L'HÔTE AU MOMENT MÊME OÙ IL CRÉDITE `f.inv.candies` (fin de
   course, réussie ou ratée), et jamais ailleurs : c'est ce qui rend le compteur
   HONNÊTE. Le lire après coup en comparant deux instantanés du stock aurait
   confondu « rapporté » et « pas encore dépensé ».
   ⚠️ AVANT LA CHUTE, IL N'ACCUMULE RIEN — « la lumière bleue s'éteint en dormant ».
   Une course faite la veille de l'annonce ne compte pas, et c'est la règle qui
   empêche une vieille ferme d'acheter le chapitre d'avance.
   ⚠️⚠️ hors-zip — ET IL REPOUSSE L'ÉCHÉANCE À CHAQUE COURSE. `starCandyFresh(e,
   k, now)` rend 0 si la lumière précédente est déjà périmée : ajouter par-dessus
   repart donc de zéro, jamais d'un flux qui aurait dû s'éteindre. `candyUntil`
   est réécrit à CHAQUE ramassage, pas seulement au premier — courir deux fois
   de suite prolonge la fenêtre plutôt que de la couper à la première échéance. */
export function resolveStarCandy(e, who, n, now, readyAt) {
  const add = Math.max(0, n | 0);
  if (!e || !starFallen(e) || !who || !add) return { ok: false };
  if (now !== undefined && +now < e.fall) return { ok: false, tooEarly: true };
  const k = String(who).slice(0, CALM_ID_MAX);
  e.candy[k] = starCandyFresh(e, k, now) + add;
  /* ⚠️⚠️ 2026-08-31 — L'ÉCHÉANCE PART DE L'INSTANT OÙ IL POURRA OFFRIR. Voir la
     note de `STAR_CANDY_HOLD_MAX_MS` : sans ça, une course perdue rendait sa
     propre récompense inutilisable, parce que la blessure dure DEUX FOIS la
     fraîcheur. `readyAt` est le `injuredUntil` du fermier — zéro quand il rentre
     valide, auquel cas rien ne change et l'échéance repart de `now` comme avant.
     ⚠️ Le `Math.min` est la ceinture : `readyAt` transite par une requête client,
     donc on ne reporte jamais de plus qu'une blessure de course entière. */
  const base = +now || 0;
  const ready = Math.max(base, Math.min(+readyAt || 0, base + STAR_CANDY_HOLD_MAX_MS));
  e.candyUntil[k] = ready + STAR_CANDY_FRESH_MS;
  return { ok: true, fresh: e.candy[k], need: STAR_CANDY_PRICE, until: e.candyUntil[k], held: ready > base };
}
/* ── LA BLEUE, 2/2 : L'OFFRANDE.
   ⚠️⚠️ LE PRIX EST LE FLUX, ET LE SAC N'EST QUE CE QU'ON DÉBITE. Le premier jet
   exigeait les deux (`fresh >= 60` ET `purse >= 60`) au nom de la ceinture et de la
   bretelle ; c'était du poids mort et c'était nuisible. **Du poids mort**, parce
   que le stock est toujours supérieur ou égal au flux par construction : les deux
   grandissent ensemble (`resolveStarCandy` est appelé à l'instant même où l'hôte
   crédite `f.inv.candies`) et rien d'autre au monde ne dépense de bonbons.
   **Nuisible**, parce que le bouton dev qui remplit le flux ne peut pas remplir le
   sac sans devenir une troisième exception à la règle « aucun bouton de quête ne
   donne rien » (§10 de `CLAUDE.md`) — donc le geste serait devenu injugeable.
   ⚠️ `spend` EST DONC BORNÉ PAR CE QUI EST VRAIMENT LÀ : l'hôte retire ce qu'il
   peut, jamais plus. Une soustraction qui passerait sous zéro serait invisible
   jusqu'au prochain ramassage, et c'est le seul risque réel qu'il fallait fermer. */
/* ⚠️⚠️⚠️ 2026-09-02 (lot A) — ELLE SERT MAINTENANT DEUX ÉTOILES, ET C'EST LA
   RAISON POUR LAQUELLE ELLE N'A PAS ÉTÉ RECOPIÉE. La reine se nourrit de la même
   lumière que la petite bleue, au même endroit du geste (une offrande payée au
   bord du trou) : un second résolveur aurait recopié ces huit lignes — le calcul
   de fraîcheur, le refus « il t'en manque », la soustraction, la marque — c'est-
   à-dire quatre occasions de diverger au premier réglage (§8 de `CLAUDE.md`).
   ⚠️ CE QUI CHANGE D'UNE ÉTOILE À L'AUTRE EST DONC UNIQUEMENT LE PRIX
   (`starOfferPrice`) ET LA PRÉCONDITION DE LIEU. Un impact de ferme veut d'abord
   être FOUILLÉ ; le cratère de la ville veut d'abord avoir REFROIDI — ce sont deux
   façons de dire « ce trou est-il ouvert », et elles ne se confondent pas : le
   cratère n'est pas un `starFarmImpact`, `starDug` y répondrait faux pour toujours.
   ⚠️ LE NOM RESTE `starLight`/`resolveStarLight` alors que la reine est jaune :
   ce n'est pas SA couleur qu'on lui apporte, c'est celle de sa petite sœur. Le
   renommer aurait touché l'hôte, le client, les textes et le banc pour ne rien
   dire de plus. */
export function resolveStarLight(e, who, siteId, purse, now) {
  const id = String(siteId || "");
  /* ⚠️ LA VARIABLE S'APPELLE `lights` ET PAS `price`, ET CE N'EST PAS DE LA
     COQUETTERIE : `verify-quete` interdit à ce fichier de toucher à de l'ARGENT et
     cherche le mot `price` dans le code. Ce qui se compte ici n'est pas de l'or,
     c'est un flux de lumière (`e.candy`), et le banc a raison de refuser un nom qui
     prétend le contraire — un mot juste vaut mieux qu'une exception dans un banc. */
  const lights = starOfferPrice(id);
  if (lights <= 0) return { ok: false };
  const site = STAR_SITE[id];
  if (site.spot === "starFarmImpact" && !starDug(e, id)) return { ok: false, unDug: true };
  /* ⚠️ MÊME GARDE QUE `resolveStarCalm`, ET POUR LA MÊME RAISON (446) : on
     n'offre rien à un trou en fusion. Deux dates de la SEULE horloge de l'hôte,
     donc le §3 tient par construction. Le refus PORTE le temps restant, pour que
     l'appelant puisse le dire au lieu de rester muet. */
  if (site.queen && !starCraterCool(e, now - (e.townFall || 0)))
    return { ok: false, tooHot: true, cool: Math.max(0, STAR_CRATER_COOL_MS - (now - (e.townFall || 0))) };
  if (starHas(e, id)) return { ok: false, already: true };
  if (starLit(e, id)) return { ok: false, already: true, lit: true };
  const k = String(who || "").slice(0, CALM_ID_MAX);
  const fresh = starCandyFresh(e, k, now);
  if (fresh < lights) return { ok: false, short: true, have: fresh, need: lights };
  e.candy[k] = fresh - lights;
  e.offer[id] = { by: k, at: +now || 0 };
  return { ok: true, spend: Math.min(lights, Math.max(0, purse | 0)), site: id, left: e.candy[k], need: lights };
}

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 2026-09-02 (lot A) — LE RÉVEIL. L'ARBITRE NE JUGE PAS LE RYTHME, IL JUGE
   ║ LE DROIT DE L'AVOIR JOUÉ.
   ╚══════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ IL NE PEUT PAS VÉRIFIER LES HUIT BATTEMENTS, ET C'EST ASSUMÉ — même
   contrat que `starTimberRaise` (le marteau de la cale) et que la scierie : le
   client joue, l'hôte arbitre ce qui ENTOURE le jeu. Ce que le §4 de `CLAUDE.md`
   exige (« un panneau qui s'ouvre à volonté ne doit rien donner ») est tenu
   ailleurs : on ne peut pas atteindre ce geste sans avoir payé 80 lumières, et
   ce paiement-là, l'hôte l'a bien arbitré (`resolveStarLight`). Le réveil ne
   DONNE rien — il ouvre la posture qui, elle, se mesure en secondes tenues.
   ⚠️ IDEMPOTENT, comme tous les résolveurs de ce fichier : une seconde requête
   (double clic, rejeu d'un paquet) rend `already` et ne rediffuse rien. */
export function resolveStarWake(e, who, siteId, now) {
  const id = String(siteId || "");
  const site = STAR_SITE[id];
  if (!site || site.content !== "star") return { ok: false };
  if (starHas(e, id)) return { ok: false, already: true };
  if (starWoke(e, id)) return { ok: false, already: true, woke: true };
  /* ⚠️ L'ORDRE DU GESTE EST UNE RÈGLE, PAS UNE HABITUDE : nourrir, PUIS réveiller.
     Le refus est SILENCIEUX (`ok: false`, donc aucune diffusion, §3) parce que le
     client ne propose de toute façon pas le geste tant que l'offrande n'est pas
     passée — c'est la ceinture, l'invite est la bretelle (même discipline que
     `unlit` dans `resolveStarCalm`). */
  /* ⚠️ L'ÉTAT DU LIEU PASSE DEVANT L'ÉTAT DE LA QUÊTE, ici comme dans
     `resolveStarLight` juste au-dessus, et ce n'est pas cosmétique : sur un trou
     en fusion les deux refus sont vrais à la fois (on n'a pas pu nourrir non
     plus), et celui que l'appelant doit pouvoir DIRE est celui qui décrit ce que
     le joueur voit — ça fume. Répondre « il faut d'abord la nourrir » devant un
     cratère incandescent enverrait courir après des lumières qu'on ne pourrait
     de toute façon pas offrir. */
  if (site.queen && !starCraterCool(e, now - (e.townFall || 0))) return { ok: false, tooHot: true };
  if (starOfferPrice(id) > 0 && !starLit(e, id)) return { ok: false, unlit: true };
  e.woke[id] = { by: String(who || "").slice(0, CALM_ID_MAX), at: +now || 0 };
  return { ok: true, site: id };
}

/* ── LA ROSE : CUIRE, PORTER, PASSER, SERVIR.
   ⚠️⚠️ QUATRE GESTES ET UN SEUL CHAMP (`e.dish`), parce qu'il n'y a jamais qu'UN
   plat. Un dictionnaire par joueur aurait permis de cuisiner chacun dans son coin,
   c'est-à-dire de supprimer le relais qui est toute la raison de cette mécanique.
   ⚠️ ET LE PLAT N'EST PAS UN OBJET D'INVENTAIRE : le mettre dans `f.inv` l'aurait
   rendu INVISIBLE à l'autre joueur, donc impossible à passer de main en main sans
   inventer un échange. Ici, « qui le porte » est une donnée du monde. */
export function resolveStarCook(e, who, now) {
  const id = STAR_WARM_SITE;
  if (!id) return { ok: false };
  if (!starDug(e, id)) return { ok: false, unDug: true };
  if (starHas(e, id)) return { ok: false, already: true };
  const ph = starDishPhase(e, now);
  /* ⚠️ UN PLAT FROID NE BLOQUE PAS LE CHAUDRON : il est perdu, on recommence. Le
     refuser aurait demandé au joueur d'aller « jeter » quelque chose qu'il ne voit
     plus, c'est-à-dire une corvée pour rien. */
  if (ph && ph !== "cold") return { ok: false, busy: true, phase: ph };
  e.dish = { by: String(who || "").slice(0, CALM_ID_MAX), at: +now || 0, phase: "cook", from: "" };
  return { ok: true, readyAt: (+now || 0) + STAR_DISH_COOK_MS };
}
/* Prendre le plat au chaudron. ⚠️ N'IMPORTE QUI PEUT LE PRENDRE, et c'est le
   relais dans sa forme la plus simple : celui qui cuisine n'est pas forcément
   celui qui court. */
export function resolveStarDishTake(e, who, now) {
  if (starDishPhase(e, now) !== "ready") return { ok: false };
  const k = String(who || "").slice(0, CALM_ID_MAX);
  /* ⚠️⚠️ `from` GARDE LA MAIN PRÉCÉDENTE, ET C'EST LUI QUI NOMMERA LE SECOND
     JOUEUR À L'ARRIVÉE. Sans ce champ, « l'un cuisine, l'autre porte » se
     terminerait par une trace au nom du seul porteur — très exactement le défaut
     « le second joueur ne reçoit rien » de l'audit 477, reproduit sur le verbe
     qu'on écrit pour le corriger. */
  e.dish = { by: k, at: +now || 0, phase: "carry", from: e.dish.by !== k ? e.dish.by : "" };
  return { ok: true };
}
/* ⚠️⚠️ LE PASSAGE DE MAIN REMET LA JAUGE À PLEIN, ET C'EST LA DÉCISION DE
   CONCEPTION DE TOUT LE VERBE : à deux, le trajet se fait en deux moitiés fraîches
   au lieu d'une longue. Le duo n'est donc pas une serrure (458), c'est une façon
   plus SÛRE de faire la même chose — exactement ce qu'on veut d'une coopération. */
export function resolveStarDishPass(e, who, now) {
  if (starDishPhase(e, now) !== "carry") return { ok: false };
  const k = String(who || "").slice(0, CALM_ID_MAX);
  if (!k || e.dish.by === k) return { ok: false, mine: true };
  const from = e.dish.by;
  e.dish = { by: k, at: +now || 0, phase: "carry", from };
  return { ok: true, from };
}
/* Servir. ⚠️ `name`/`mate` NE SERVENT QU'À LA TRACE : ce sont des noms de fermier,
   donc ils viennent du réseau et `resolveStarFound` les tronque. L'identité qui
   ARBITRE reste `who`, l'identifiant. */
export function resolveStarDishServe(e, who, now, name, mate) {
  const id = STAR_WARM_SITE;
  const k = String(who || "").slice(0, CALM_ID_MAX);
  if (starDishPhase(e, now) !== "carry" || e.dish.by !== k) return { ok: false };
  if (!starDug(e, id)) return { ok: false, unDug: true };
  if (starHas(e, id)) return { ok: false, already: true };
  e.dish = null;
  return { ...resolveStarFound(e, id, name || k, now, mate), opened: true, site: id, mate: mate || null };
}
/* Le plat a refroidi. ⚠️ C'EST UN GESTE D'ARBITRE, PAS UNE LECTURE : `starDishPhase`
   se contente de dire « cold », et c'est ici — une fois, chez l'hôte — que l'objet
   disparaît. Une fonction de lecture qui efface est la pire chose qu'on puisse
   donner à un banc : il mesurerait un monde que son propre appel vient de changer. */
export function resolveStarDishTick(e, now) {
  if (starDishPhase(e, now) !== "cold") return { ok: false };
  const by = e.dish.by;
  e.dish = null;
  return { ok: true, lost: true, by };
}

/* ── LA REINE : LE FIGURANT.
   ⚠️⚠️ IL COÛTE UN ÉPOUVANTAIL DU SAC (`SCARECROW_COST` = 400 or à la boutique),
   et c'est le second objet décoratif que ce lot remet en service après les
   bonbons. Ce n'est PAS une serrure : l'épouvantail s'achète, l'or se gagne, et le
   texte de l'objectif le dit — aucune configuration de joueurs, ni de sac, ne peut
   fermer la reine définitivement.
   ⚠️ LE REPLANTER NE COÛTE RIEN (`spend: 0`) : on le déterre et on le repique
   trois cases plus loin. Faire payer un ajustement de position aurait puni le
   joueur pour avoir mal visé un bord qu'aucune ligne ne dessine.
   ⚠️⚠️ ET LA GÉOMÉTRIE VIENT DE L'APPELANT (`cx`, `cy`, `R`) : le cratère est une
   position dérivée de la CARTE DE VILLE, laquelle n'est jamais persistée (§6 de
   `CLAUDE.md`). La recalculer ici obligerait `quete.js` à importer le générateur —
   une arête de plus entre le moteur et une histoire, celle-là même que le 444 a
   coupée. */
export function resolveStarEffigy(e, who, x, y, cx, cy, R, now) {
  if (starHas(e, "crater")) return { ok: false, already: true };
  const d = Math.hypot(x - cx, y - cy);
  if (d < R * STAR_QUEEN_EDGE_K || d > R + 1) return { ok: false, offEdge: true };
  const moved = !!e.effigy;
  e.effigy = { by: String(who || "").slice(0, CALM_ID_MAX), at: +now || 0, x: +x, y: +y };
  return { ok: true, spend: moved ? 0 : 1, moved };
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
  /* ⚠️⚠️ ZIP 469 — `starHas(e, "song")` A DISPARU D'ICI, ET C'ÉTAIT LA DERNIÈRE
     PORTE DU CHANT. Elle gardait la fin derrière une trouvaille d'église qui
     n'existe plus : laissée en place, elle aurait rendu la quête **infinissable**
     en silence, exactement comme la cascade du 468. Ce qui garde la fin est
     désormais la seule chose qui la mérite — le NAVIRE fini.
     ⚠️⚠️ ET LE BATEAU DOIT ÊTRE FINI. Si le bûcheron n'a pas encore livré la
     dernière pièce, il reste un chantier sur la grève. Jouer la résolution
     par-dessus, c'est faire partir un bateau qu'on voit inachevé derrière : la
     famille du 453 (« un texte affirme »), et le seul endroit du jeu où elle
     coûterait la scène finale.
     ⚠️ LE REFUS EST SILENCIEUX ET REJOUABLE : `resolveStarTimberTick` rappelle ce
     résolveur quand la dernière pièce tombe, donc la fin arrive toute seule au
     moment où le navire s'achève. */
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
/* ⚠️ ZIP 469 — `hint` EST SORTI DE LA LISTE : il rejouait le croisement d'ombres,
   qui n'existe plus. Un bouton de menu dev qui appelle un résolveur supprimé ne
   plante pas, il ne fait RIEN — et on cherche le bogue ailleurs. */
/* ⚠️ ZIP 478 — « deliver » S'INSÈRE AVANT « timber », dans l'ordre où ça se joue :
   les plans, puis le bois livré (à monter), puis le bois posé. Un menu rangé dans
   l'ordre du jeu se lit sans le connaître. */
/* ⚠️ ZIP 479 — DEUX OPS DE PLUS, UNE PAR VERBE COÛTEUX. Le troisième (l'épouvantail
   de la reine) n'en a PAS besoin et c'est délibéré : il ne coûte qu'un objet à 400
   or, que le bouton « Argent » du menu dev sait déjà donner. Un bouton par geste
   aurait été un bouton de plus à tenir pour rien. */
export const STAR_DEV_OPS = ["reset", "warn", "start", "candy", "dish", "lure", "queen", "shy", "green", "evil", "chapter", "skip", "all", "plans", "deliver", "timber", "appt", "unslam"];
/* ⚠️ ZIP 469 — `turn` (le retournement) sort de la liste : sa scène est supprimée
   dans `FermeGame`, et un bouton qui rejoue une scène qui n'existe plus ouvre un
   voile noir de sept secondes sur rien. */
export const STAR_DEV_SCENES = ["warn", "fall", "townFall", "end"];
/* ⚠️⚠️ ZIP 454 — LE MENU DEV FRANCHIT LA PORTE DES DEUX HABITANTS, ET C'EST LE
   SEUL ENDROIT QUI EN A LE DROIT. Recruter Eduardo, Tristan et quatre artisans
   avant de pouvoir REGARDER une cinématique de douze secondes, c'est une demi-
   heure de jeu par essai — c'est-à-dire une scène qu'on ne regarde qu'une fois,
   donc qu'on ne juge qu'une fois (§10 de `CLAUDE.md`, la raison d'être du bouton
   « rejouer une scène »). Le contexte est FABRIQUÉ ici, il n'est pas lu : la porte
   reste entière pour tout le monde, y compris pour l'hôte qui arme la chute. */
const DEV_GATE = { skills: C.STAR_GATE_SKILLS, artisans: C.STAR_GATE_ARTISANS };

/* ⚠️ ZIP 479 — UN QUATRIÈME PARAMÈTRE, `who`, ET UN SEUL BOUTON S'EN SERT. La
   bourse de lumière bleue est indexée PAR JOUEUR (`e.candy`, comme
   `f.inv.candies`) : un raccourci de développeur qui ne saurait pas qui clique
   remplirait la poche de personne. Les autres opérations l'ignorent. */
export function devStar(e, op, now, who) {
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
    for (const k of STAR_SHIP_KEYS) e.wood[k] = { at: t, readyAt: t, done: true, ready: false, by: "🛠️" };
    return { star: e, ok: true };
  }
  /* ╔═════════════════════════════════════════════════════════════════════════════
     ║ ZIP 478 — « LIVRER SANS MONTER », POUR POUVOIR JUGER LE MARTEAU.
     ╚═════════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ SANS CE BOUTON, LE MINI-JEU DE MONTAGE N'EST ATTEIGNABLE QU'APRÈS HUIT
     MINUTES DE SCIE — c'est-à-dire qu'on ne le jugerait qu'une fois, et le §15.3 de
     QUETE.md dit depuis le 444 ce que ça coûte (le mini-jeu de refroidissement n'a
     jamais été joué jusqu'à la victoire pendant vingt-cinq zips, faute d'un moyen
     de le rejouer).
     ⚠️ IL S'ARRÊTE EXACTEMENT OÙ LE JEU S'ARRÊTE : les cinq pièces livrées, aucune
     posée. Un raccourci qui poserait aussi les pièces, c'est « timber » ; celui-ci
     existe pour l'ÉTAT D'AVANT, le seul qu'aucun autre bouton ne sait produire. */
  /* ╔═════════════════════════════════════════════════════════════════════════════
     ║ ZIP 481 — DEUX BOUTONS POUR L'AUDIENCE, ET C'EST LA MÊME RAISON QUE TOUS LES
     ║ AUTRES : sans eux, chaque essai de la scène du maire coûte TROIS À CINQ
     ║ MINUTES RÉELLES d'attente, ou un quart d'heure si on vient de claquer la
     ║ porte pour voir ce que ça fait.
     ╚═════════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ ET ILS NE SAUTENT PAS LA SCÈNE — c'est la ligne rouge de ce menu depuis le
     444. `appt` pose un rendez-vous DÛ MAINTENANT : il reste à monter à l'étage, à
     trouver le bureau, à appuyer sur E et à mener l'entretien en entier. `unslam`
     lève la punition, il ne signe rien. On saute l'ATTENTE, jamais le geste.
     ⚠️ `appt` tire l'humeur comme l'hôte le ferait, par `mayorPickMood` : un
     raccourci qui poserait « moyenne » en dur ferait juger la scène dans un seul
     des cinq mondes — c'est-à-dire qu'on ne jugerait jamais la difficulté, qui est
     très exactement ce que cette passe ajoute. */
  if (op === "appt") {
    MA.migrateMayor(e);
    e.mayor.block = 0;
    e.mayor.appt = { by: String(who || ""), name: "\u{1F6E0}\uFE0F", at: t, due: t,
                     mood: MA.mayorPickMood(Math.random, false, !!e.mayor.sour) };
    e.mayor.sour = 0;
    return { star: e, ok: true };
  }
  if (op === "unslam") {
    MA.migrateMayor(e);
    e.mayor.block = 0; e.mayor.sour = 0;
    return { star: e, ok: true };
  }
  if (op === "deliver") {
    if (!e.warn || !e.warn.at) e.warn = { at: t, by: "\u{1F6E0}\uFE0F" };
    if (!e.fall) e.fall = t;
    if (!starPlanAsked(e)) e.plan = { at: t, by: "\u{1F6E0}\uFE0F", done: t };
    for (const k of STAR_SHIP_KEYS) e.wood[k] = { at: t, readyAt: t, done: false, ready: true, by: "\u{1F6E0}\uFE0F" };
    return { star: e, ok: true };
  }
  /* ╔═════════════════════════════════════════════════════════════════════════════
     ║ ZIP 479 — TROIS BOUTONS POUR TROIS VERBES, ET C'EST LA MÊME RAISON QU'AU 478.
     ╚═════════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ SANS EUX, CHACUN DES TROIS GESTES COÛTE UNE COURSE, UNE CUISSON OU UN
     ACHAT AVANT LA PREMIÈRE SECONDE DE JEU — c'est-à-dire qu'on ne les jugerait
     qu'une fois, ce qui est exactement ce qui est arrivé au mini-jeu de
     refroidissement pendant vingt-cinq zips (§15.3 de `QUETE.md`).
     ⚠️⚠️ ET AUCUN NE SAUTE LE GESTE QU'IL SERT À JUGER : `candy` remplit la bourse
     et laisse l'offrande à faire ; `dish` pose un plat chaud dans les mains et
     laisse tout le TRAJET, qui est le verbe ; `effigy` plante le figurant et laisse
     la minute de tenue. On saute la préparation, jamais la scène — c'est la ligne
     que le menu dev tient depuis le 444 (« on saute la lecture, on ne gagne rien »).
     ⚠️ LES TROUS SONT FOUILLÉS AU PASSAGE parce que les trois résolveurs le
     réclament : un bouton qui rendrait un état impossible (une bourse pleine devant
     un cratère intact) ferait juger un jeu que personne ne peut atteindre. */
  if (op === "candy") {
    if (!e.warn || !e.warn.at) e.warn = { at: t, by: "\u{1F6E0}️" };
    if (!e.fall) e.fall = t;
    if (STAR_LIGHT_SITE) resolveStarDig(e, STAR_LIGHT_SITE, "\u{1F6E0}️", t);
    /* ⚠️ ET IL NE DONNE PAS DE BONBONS AU FERMIER : il remplit le FLUX (« rapporté
       depuis la chute »), pas le stock. Le sac reste ce qu'il est, donc l'offrande
       échouera si le joueur n'a vraiment rien — ce qui est le bon comportement, et
       ce qui permet de juger le refus autant que la réussite. */
    resolveStarCandy(e, String(who || ""), STAR_CANDY_PRICE, t);
    return { star: e, ok: true };
  }
  if (op === "dish") {
    if (!e.warn || !e.warn.at) e.warn = { at: t, by: "\u{1F6E0}️" };
    if (!e.fall) e.fall = t;
    if (STAR_WARM_SITE) resolveStarDig(e, STAR_WARM_SITE, "\u{1F6E0}️", t);
    e.dish = { by: "", at: t - STAR_DISH_COOK_MS, phase: "cook", from: "" };
    return { star: e, ok: true };
  }
  /* 480 bis — MÊME FAMILLE QUE `candy`/`dish` : on fouille son trou et on
     saute la préparation (mine + chaudron), jamais la scène (le geste de la
     tenue). `grantLure` est lu par l'appelant côté FermeGame.js, seul endroit
     qui touche à l'inventaire personnel — `devStar` ne touche jamais à `f`. */
  if (op === "lure") {
    if (!e.warn || !e.warn.at) e.warn = { at: t, by: "\u{1F6E0}️" };
    if (!e.fall) e.fall = t;
    const site = STAR_VERB_SITE.lure;
    if (site) resolveStarDig(e, site, "\u{1F6E0}️", t);
    return { star: e, ok: true, grantLure: true };
  }
  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ 2026-09-02 (lot A) — LE BOUTON DE LA REINE. MÊME FAMILLE QUE `candy`/`dish`/
     ║ `lure` : ON SAUTE LA CORVÉE, JAMAIS LE GESTE.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ IL FAIT TROIS CHOSES ET PAS UNE DE PLUS : le météore tombe, le trou est
     déjà froid, et le FLUX de lumière contient les 80 unités. Restent à jouer
     l'offrande (E au bord), le réveil au rythme, et la posture — c'est-à-dire
     exactement les trois choses que ce lot ajoute, donc les trois seules qui
     méritent d'être regardées.
     ⚠️ SANS CE BOUTON, JUGER LE RÉVEIL DEMANDERAIT UNE COURSE DE TEMPLE RUN ET
     TROIS MINUTES DE REFROIDISSEMENT PAR ESSAI — c'est-à-dire qu'on ne le
     jugerait qu'une fois, ce qui est le défaut que « rejouer une scène » avait
     été écrit pour corriger (444).
     ⚠️ ET IL NE DONNE RIEN AU FERMIER, comme `candy` : il remplit le flux, pas le
     sac. La règle du §10 de `CLAUDE.md` tient — le chemin développeur appelle les
     mêmes résolveurs et ne rend personne plus riche. */
  if (op === "queen") {
    if (!e.warn || !e.warn.at) e.warn = { at: t, by: "\u{1F6E0}️" };
    if (!e.fall) e.fall = t;
    /* ⚠️ LE MÉTÉORE DOIT ÊTRE TOMBÉ AVANT QU'ON PUISSE ANTIDATER SON TROU :
       `resolveStarTownFall` refuse si le chapitre 1 n'est pas clos, donc on le
       clôt d'abord — c'est ce que fait déjà `plans`, deux ops plus haut. */
    for (const site of STAR_FARM_IMPACTS) resolveStarFound(e, site.id, "\u{1F6E0}️", t);
    resolveStarTownFall(e, t);
    /* Le trou froid : on recule SA date de chute, jamais on n'avance une horloge
       de client (§3 de `CLAUDE.md` — une horloge, jamais deux). */
    if (e.townFall) e.townFall = t - STAR_CRATER_COOL_MS - 1000;
    resolveStarCandy(e, String(who || ""), STAR_QUEEN_PRICE, t);
    return { star: e, ok: true };
  }
  /* ⚠️ 2026-09-02 (lot A2) — LE BOUTON DE LA DISCRÈTE. Même famille que `queen` :
     il pose le décor et LAISSE LE GESTE. Ici le geste est de la TROUVER, donc ce
     bouton ne la trouve surtout pas — il apprivoise la reine (la seule condition
     que l'arbitre tienne) et laisse la chasse entière. Sans lui, juger la chasse
     demanderait de refaire les trois temps de la reine à chaque essai.
     ⚠️ IL NE DÉPLACE PAS SA PLANQUE : elle est une pure fonction du temps
     (`starShySlot`), donc « la remettre ailleurs » n'a pas de sens — il suffit
     d'attendre cinquante secondes, ce qui est aussi ce que fait le joueur. */
  if (op === "shy") {
    if (!e.warn || !e.warn.at) e.warn = { at: t, by: "\u{1F6E0}️" };
    if (!e.fall) e.fall = t;
    for (const site of STAR_FARM_IMPACTS) resolveStarFound(e, site.id, "\u{1F6E0}️", t);
    resolveStarTownFall(e, t);
    if (e.townFall) e.townFall = t - STAR_CRATER_COOL_MS - 1000;
    resolveStarFound(e, "crater", "\u{1F6E0}️", t);
    return { star: e, ok: true };
  }
  /* ⚠️ 2026-09-03 (lot A3) — LE BOUTON DE LA VERTE, ET IL EN FAUT UN SÉPARÉ DE
     `shy` : sans lui, juger SA chasse obligerait d'abord à gagner celle de la
     discrète, c'est-à-dire à chercher dix minutes avant de commencer à regarder ce
     que ce lot ajoute. Il apprivoise donc la reine ET la discrète, et laisse la
     verte entière — indices compris (`hints` reste à zéro).
     ⚠️ COMME `shy`, IL NE DÉPLACE PAS SA PLANQUE : elle est une pure fonction du
     temps (`starGreenSlot`), donc « la remettre ailleurs » n'a pas de sens — on
     attend un créneau, exactement comme le joueur. */
  if (op === "green") {
    if (!e.warn || !e.warn.at) e.warn = { at: t, by: "\u{1F6E0}️" };
    if (!e.fall) e.fall = t;
    for (const site of STAR_FARM_IMPACTS) resolveStarFound(e, site.id, "\u{1F6E0}️", t);
    resolveStarTownFall(e, t);
    if (e.townFall) e.townFall = t - STAR_CRATER_COOL_MS - 1000;
    resolveStarFound(e, "crater", "\u{1F6E0}️", t);
    resolveStarFound(e, "townShy", "\u{1F6E0}️", t);
    return { star: e, ok: true };
  }
  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ 2026-09-03 (lot C) — LE BOUTON DU LAC MALÉFIQUE. MÊME FAMILLE QUE `green` :
     ║ IL FERME LE CHAPITRE 2 ENTIER (les six compagnes) ET LAISSE LE GESTE.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ SANS LUI, JUGER LA DÉCOUVERTE/LE CHEVRON/LE HASARD DE LA CANNE DEMANDE
     D'ABORD DE GAGNER LES CINQ AUTRES CHASSES — c'est-à-dire qu'on ne les
     jugerait qu'une fois par soirée de test, exactement le défaut que ce menu
     existe pour corriger partout ailleurs (444).
     ⚠️ IL REMET AUSSI LA CANNE INTACTE (`unbreakRod`, lu par l'appelant côté
     FermeGame.js — `devStar` ne touche jamais à `f`, comme `grantLure`) : le lot
     D (protection au chaudron) n'existe pas encore, donc RIEN d'autre ne peut la
     réparer. Sans ce nettoyage, un premier essai du hasard épuiserait le seul
     moyen de le retester. Il NE remet PAS `e.evilFound` à zéro : la révélation
     est un fait du monde qu'on ne « annule » pas à la légère — un « reset »
     complet reste la voie pour tout rejouer depuis le début. */
  if (op === "evil") {
    if (!e.warn || !e.warn.at) e.warn = { at: t, by: "\u{1F6E0}️" };
    if (!e.fall) e.fall = t;
    for (const site of STAR_FARM_IMPACTS) resolveStarFound(e, site.id, "\u{1F6E0}️", t);
    resolveStarTownFall(e, t);
    if (e.townFall) e.townFall = t - STAR_CRATER_COOL_MS - 1000;
    resolveStarFound(e, "crater", "\u{1F6E0}️", t);
    resolveStarFound(e, "townShy", "\u{1F6E0}️", t);
    resolveStarFound(e, "townGreen", "\u{1F6E0}️", t);
    return { star: e, ok: true, unbreakRod: true };
  }
  if (op === "chapter") {
    /* On donne exactement ce qui manque au chapitre COURANT, pas un de plus.
       `starAdvance` fait le reste, et il peut en franchir deux d'un coup si le
       suivant était déjà complet : c'est sa raison d'être. */
    if (!e.warn || !e.warn.at) e.warn = { at: t, by: "🛠️" };
    if (!e.fall) e.fall = t;
    for (const id of starMissing(e)) resolveStarFound(e, id, "🛠️", t);
    return { star: e, ok: true };
  }
  if (op === "skip") {
    if (!e.warn || !e.warn.at) e.warn = { at: t, by: "🛠️" };
    if (!e.fall) e.fall = t;
    const before = e.ch;
    for (let guard = 0; guard < STAR_CH_DONE + 2 && e.ch === before; guard++) {
      for (const id of starMissing(e)) resolveStarFound(e, id, "🛠️", t);
      if (STAR_CHAPTERS[e.ch] && STAR_CHAPTERS[e.ch].final) break;
    }
    return { star: e, ok: true };
  }
  if (op === "all") {
    /* ⚠️ DEUX PASSES, PARCE QUE LES PRÉREQUIS SONT RÉELS (`site.req`). Une seule
       boucle dans l'ordre de la table sauterait tout lieu dont le prérequis est
       accordé après lui, le chapitre resterait ouvert, et on conclurait que la
       scène finale est cassée alors que c'est le raccourci qui l'était. Le banc le
       vérifie — c'est le contrôle que le 442 avait dû ajouter pour la même raison.
       ⚠️ ZIP 469 — IL NE S'ARRÊTE PLUS « AVANT LE CHANT » : il n'y a plus de chant.
       La seule chose qu'il laisse à faire est la scène finale, que l'hôte joue. */
    if (!e.warn || !e.warn.at) e.warn = { at: t, by: "🛠️" };
    if (!e.fall) e.fall = t;
    for (let pass = 0; pass < 2; pass++)
      for (const st of STAR_SITES) resolveStarFound(e, st.id, "🛠️", t);
    /* ⚠️ ZIP 454 — LE RACCOURCI DOIT AUSSI DIRE LE BOIS, sans quoi la résolution
       n'arriverait jamais (`resolveStarGift` exige un navire fini) : le bouton
       promettrait « c'est tout » et le jeu, lui, attendrait quarante minutes de
       sciage. Un raccourci qui ment est pire que pas de raccourci. */
    if (!starPlanAsked(e)) e.plan = { at: t, by: "🛠️", done: t };
    for (const k of STAR_SHIP_KEYS) e.wood[k] = { at: t, readyAt: t, done: true, by: "🛠️" };
    return { star: e, ok: true };
  }
  return { ok: false };
}
