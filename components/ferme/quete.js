/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 444 — LA QUÊTE DE L'ÉTOILE : « THE FALLEN STRING ».
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

   Le ciel a une Lyre. Une lyre à qui il manque une corde ne joue pas. La corde
   tombe, se brise ; le gros s'enfonce dans un pré à l'est de Valley Town, un
   éclat dépasse la ville et se plante dans le champ de la ferme. L'étoile est
   vivante, petite, terrifiée : elle ne rentre que si elle CHANTE SON NOM, et
   chez les étoiles un nom est une phrase de cinq notes. Elle en a perdu quatre.
   Les joueurs les retrouvent. Et quand les quatre chantent enfin ensemble, la
   phrase s'arrête net : **elle est tombée avant qu'on lui donne sa cinquième**.
   Elle ne sait pas son nom. Alors la cloche de l'église — fondue il y a cent ans
   dans une étoile tombée qui n'est jamais repartie — lui donne la sienne.

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

   ⚠️ LE THÈME EST LE SECRET, ET IL A UNE CONSÉQUENCE DE CODE : personne d'autre
   ne voit l'étoile. Aucun PNJ ne donne la quête, aucun panneau ne l'annonce,
   le tableau des nouvelles n'en dit pas un mot. Elle ARRIVE — la chute est
   armée par l'hôte, pas déclenchée par une lecture. *Une histoire qui n'existe
   que pour qui ouvre le bon panneau n'existe pas*, et c'est le reproche que le
   442 s'était fait à lui-même : il l'a réglé en ajoutant un second point
   d'entrée, on le règle en n'en demandant aucun.

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

/* ───────────────────────────────────────────────────────────────────────────
   1. LES LIEUX. Un lieu = un endroit du monde où il se passe quelque chose et
   qui laisse une trace dans l'état partagé.

   ⚠️ `zone` N'EST PAS DE LA DÉCORATION, C'EST CE QUI EMPÊCHE LE PIÈGE DES DEUX
   CARTES (§4 de `CLAUDE.md`). L'hôte vérifie qu'une trouvaille arrive bien de la
   bonne ZONE **avant de regarder la moindre distance** — la discipline exacte
   d'`atMarket` (431) et de l'enquête (442). Le rectangle du marché de la ville
   tombe aussi au milieu des champs de la ferme : sans ce test, une trouvaille
   de ponton se validerait depuis un pré.

   ⚠️⚠️ `shard: true` DIT « CECI EST UNE DES QUATRE NOTES », et rien d'autre ne le
   dit. Le compte d'éclats du pisteur se DÉRIVE de cette colonne (`starShards`),
   il n'est écrit nulle part — un compteur écrit à côté finirait par ne plus
   correspondre à la table le jour où l'on déplace une note.
   ─────────────────────────────────────────────────────────────────────────── */
export const STAR_SITES = [
  // ── Chapitre 1 : la ferme. Ce qui a dépassé la ville.
  { id: "furrow",    zone: "farm",  spot: "starFurrow", shard: true },
  // ── Chapitre 2 : le cratère. On ne trouve pas une note, on trouve QUELQU'UN.
  { id: "crater",    zone: "town",  spot: "starCrater" },
  { id: "leanLake",  zone: "town",  spot: "*lean" },   // révélé par le croisement d'ombres
  { id: "leanGlass", zone: "town",  spot: "*lean" },
  // ── Chapitre 3 : le lac.
  { id: "lakeShard", zone: "town",  spot: "starPier",  shard: true, req: ["leanLake"] },
  // ── Chapitre 4 : la voleuse. Un lieu, une histoire, deux notes.
  { id: "beadShard", zone: "town",  spot: "starGlassworks", shard: true, req: ["leanGlass"] },
  { id: "nestShard", zone: "town",  spot: "starNest",       shard: true, req: ["beadShard"] },
  // ── Chapitre 5 : l'église. Le beffroi, puis le chant.
  { id: "belfry",    zone: "court", spot: "starBell" },
  { id: "song",      zone: "court", spot: "starBell",  req: ["belfry"] },
];
export const STAR_SITE = Object.fromEntries(STAR_SITES.map(s => [s.id, s]));
/* Les quatre notes, DÉRIVÉES de la table. */
export const STAR_SHARD_IDS = STAR_SITES.filter(s => s.shard).map(s => s.id);
export const STAR_SHARD_TOTAL = STAR_SHARD_IDS.length;   // 4 — jamais écrit en dur ailleurs

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
  hull: "furrow", rudder: "lakeShard", mast: "beadShard", sail: "nestShard", bell: "song",
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
export function starShipHas(e, key) {
  const p = STAR_SHIP_PARTS.find(q => q.key === key);
  return !!(p && starHas(e, p.site));
}
export function starShipParts(e) { return STAR_SHIP_PARTS.map(p => starHas(e, p.site)); }
export function starShipBuilt(e) { return starShipParts(e).filter(Boolean).length; }
/* ⚠️ « FINI » N'EST PAS « QUÊTE FINIE » : les cinq morceaux sont posés dès que la
   cloche a chanté, et la scène finale se joue APRÈS. Les distinguer laisse le
   navire s'achever à l'écran pendant la résolution, au lieu d'apparaître d'un coup
   sur un fondu — et `starDone` reste le seul témoin de la fin. */
export function starShipComplete(e) { return starShipBuilt(e) === STAR_SHIP_TOTAL; }

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
  { key: "field",  need: ["furrow"] },
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
export const STAR_CALM_MS = 4000;          // à deux : quatre secondes de dos tourné
export const STAR_CALM_SOLO_MS = 9000;     // seul : beaucoup plus long, jamais bloqué
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
export const STAR_DUET_AIM_DRIFT = [0.18, 0.26, 0.34, 0.44, 0.55, 0.68]; // dérive de la Lyre
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
export const STAR_FALL_MS = 9000;      // durée de la scène d'ouverture
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
export const STAR_CAM_HOLD_MS = 6200;   // ce qu'elle y reste (depuis t=0)
export const STAR_CAM_BACK_MS = 1900;   // le retour vers le joueur

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
export const STAR_FALL_IMPACT_MS = 3200;  // elle touche le sol — L'INSTANT, lu par tout le monde

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
   aurait pointé. Ici la cible se DÉRIVE de `starMissing`, donc de la table, donc
   du même endroit que la phrase — le jour où l'on déplace une note, les deux
   suivent ensemble ou aucune ne suit.
   ⚠️ `spot: "*lean"` NE REND RIEN, ET C'EST JUSTE : l'écoute des ombres se fait
   n'importe où en ville. Un chevron qui pointerait quelque part pendant qu'on
   demande au joueur d'aller AILLEURS écouter serait un mensonge poli — la même
   famille que le `|| clé` du 444. Pas de cible : pas de chevron. */
export function starTargetSite(e) {
  for (const id of starMissing(e)) {
    const s = STAR_SITE[id];
    if (s && s.spot && s.spot[0] !== "*") return id;
  }
  return null;
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

/* ───────────────────────────────────────────────────────────────────────────
   5. L'ÉTAT PARTAGÉ ET SES RÈGLES PURES.
   ─────────────────────────────────────────────────────────────────────────── */
export function newStar() {
  return {
    ch: 0,          // chapitre courant
    found: {},      // id de lieu -> { by, at } — idempotent par construction
    fall: 0,        // horodatage HÔTE de la chute (0 = elle n'est pas encore tombée)
    calm: {},       // id de joueur -> horodatage HÔTE du dernier « dos tourné »
    lean: {},       // id de joueur -> { x, y, at } — la dernière lecture d'ombres
    marks: [],      // les lieux révélés par les croisements
    duet: 0,        // phrases du duo réussies
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
  e.fall = +saved.fall || 0;
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
  return e;
}

export function starFallen(e) { return !!(e && e.fall); }
export function starStarted(e) { return !!(e && (e.ch > 0 || Object.keys(e.found || {}).length)); }
export function starDone(e) { return !!(e && e.doneAt); }
export function starHas(e, id) { return !!(e && e.found && e.found[id]); }
/* Le compte d'éclats, DÉRIVÉ de la table (voir la note de `shard`). */
export function starShards(e) { return STAR_SHARD_IDS.filter(id => starHas(e, id)).length; }
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
  if (!first) return null;
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
    if (s.id === "leanLake") { out.push("lean"); continue; }
    if (s.id === "leanGlass") { out.push("leanAgain"); continue; }
    out.push(s.id);
    if (s.id === "crater") out.push("craterHot");
  }
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

/* La chute. ⚠️ ELLE EST DATÉE PAR L'HÔTE ET DIFFUSÉE UNE FOIS. Chaque client
   déroule ensuite SA chronologie à partir de SA réception : on ne compare jamais
   une horloge hôte à une horloge invité (§3), et une scène de neuf secondes est
   exactement le genre de chose où trois secondes de dérive se verraient. */
export function resolveStarFall(e, day, now) {
  if (e.fall) return { ok: false, already: true };
  if ((day | 0) < STAR_FALL_MIN_DAY) return { ok: false, tooEarly: true };
  e.fall = now;
  return { ok: true, scene: "fall" };
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
  return { ok: true, crossed: starAdvance(e), shard: !!site.shard };
}

/* ⚠️⚠️ L'ÉTOILE TIMIDE — LE PREMIER VERROU COOPÉRATIF, ET IL N'EN EST PAS UN.
   Le client demande quand SA condition locale tient (dans l'anneau, immobile,
   dos tourné) ; l'hôte enregistre la date, à SA propre horloge, et regarde si
   quelqu'un d'AUTRE est calme en même temps. Deux dates de la même horloge : la
   règle du §3 est tenue par construction, comme les deux serrures du 442.
   ⚠️ `soloAllowed` n'assouplit pas la règle, il en change la DURÉE : seul, il
   faut tenir `STAR_CALM_SOLO_MS` au lieu de `STAR_CALM_MS`. Un jeu qui exige un
   second joueur pour avancer est un jeu qu'on ne finit pas. */
export function resolveStarCalm(e, who, now, soloAllowed) {
  if (starHas(e, "crater")) return { ok: true, already: true, crossed: [] };
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
  if (!starCraterCool(e, now - (e.fall || 0)))
    return { ok: false, tooHot: true, cool: Math.max(0, STAR_CRATER_COOL_MS - (now - (e.fall || 0))) };
  const prev = +e.calm[who] || 0;
  const held = prev && now - prev < 1500 ? now - (e.calm[who + ":t0"] || prev) : 0;
  /* On garde deux marques par joueur : le début de la tenue (`:t0`) et la
     dernière image reçue. Sans le début, une tenue interrompue et reprise
     compterait comme continue — c'est-à-dire qu'il suffirait de marteler. */
  if (!prev || now - prev > 1500) e.calm[who + ":t0"] = now;
  e.calm[who] = now;
  const t0 = +e.calm[who + ":t0"] || now;
  const mine = now - t0;
  if (soloAllowed) {
    if (mine >= STAR_CALM_SOLO_MS) return { ...resolveStarFound(e, "crater", who, now), opened: true };
    return { ok: true, holding: mine, need: STAR_CALM_SOLO_MS, crossed: [] };
  }
  /* À deux : il faut que quelqu'un d'autre soit calme MAINTENANT, et que les
     deux tenues aient duré assez. */
  let bestOther = 0;
  for (const k of Object.keys(e.calm)) {
    if (k.endsWith(":t0") || k === who) continue;
    if (now - (+e.calm[k] || 0) > 1500) continue;         // il a lâché
    bestOther = Math.max(bestOther, now - (+e.calm[k + ":t0"] || now));
  }
  const together = Math.min(mine, bestOther);
  if (bestOther && together >= STAR_CALM_MS)
    return { ...resolveStarFound(e, "crater", who, now), opened: true };
  return { ok: true, holding: mine, both: bestOther > 0, need: STAR_CALM_MS, crossed: [] };
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
  const win = soloAllowed ? STAR_LEAN_SOLO_WINDOW_MS : STAR_LEAN_WINDOW_MS;
  const minD = soloAllowed ? STAR_LEAN_SOLO_MIN_TILES : STAR_LEAN_MIN_TILES;
  const next = STAR_LEAN_MARKS.find(m => !starHas(e, m));
  if (!next) return { ok: true, already: true, crossed: [] };
  /* On compare à toutes les lectures encore fraîches, la sienne comprise quand
     on est seul — c'est exactement ce qui rend le solo jouable : on lit, on
     traverse la ville, on relit. */
  let best = null;
  for (const k of Object.keys(e.lean)) {
    if (!soloAllowed && k === who) continue;
    const p = e.lean[k];
    if (!p || now - p.at > win) continue;
    const d = Math.hypot(tx - p.x, ty - p.y);
    if (d >= minD && (!best || d > best.d)) best = { d, k };
  }
  e.lean[who] = { x: tx, y: ty, at: now };
  if (!best) return { ok: true, armed: true, crossed: [] };
  const r = resolveStarFound(e, next, who, now);
  if (r.ok && !r.already && !e.marks.includes(next)) e.marks.push(next);
  return { ...r, crossed: r.crossed || [], mark: next, spread: Math.round(best.d) };
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
export const STAR_DEV_OPS = ["reset", "start", "chapter", "skip", "hint", "all"];
export const STAR_DEV_SCENES = ["fall", "turn", "end"];

export function devStar(e, op, now) {
  const t = now || Date.now();
  if (op === "reset") return { star: newStar(), ok: true };
  if (op === "start") {
    const s = e.fall ? e : (resolveStarFall(e, STAR_FALL_MIN_DAY, t), e);
    return { star: s, ok: true, scene: "fall" };
  }
  if (op === "chapter") {
    /* On donne exactement ce qui manque au chapitre COURANT, pas un de plus.
       `starAdvance` fait le reste, et il peut en franchir deux d'un coup si le
       suivant était déjà complet : c'est sa raison d'être. */
    if (!e.fall) e.fall = t;
    for (const id of starMissing(e)) {
      if (id === "song") { e.duet = STAR_DUET_PHRASES; }
      resolveStarFound(e, id, "🛠️", t);
    }
    return { star: e, ok: true };
  }
  if (op === "skip") {
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
    if (!e.fall) e.fall = t;
    for (let pass = 0; pass < 2; pass++)
      for (const st of STAR_SITES) {
        if (st.id === "song") continue;
        resolveStarFound(e, st.id, "🛠️", t);
      }
    for (const m of STAR_LEAN_MARKS) if (starHas(e, m) && !e.marks.includes(m)) e.marks.push(m);
    return { star: e, ok: true };
  }
  return { ok: false };
}
