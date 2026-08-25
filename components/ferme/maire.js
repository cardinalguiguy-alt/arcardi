/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 480 — L'AUDIENCE CHEZ LE MAIRE : LA TABLE ET LES RÉSOLVEURS PURS.
   ═══════════════════════════════════════════════════════════════════════════
   Ce fichier est à la NÉGOCIATION ce que `quete.js` est à la quête : une table
   de battements, des règles pures, et rien d'autre. Il ne dessine rien, il
   n'appelle pas React, il n'ouvre aucun panneau. `FermeGame.js` le lit, la vue
   3D du bureau n'en lit que la jauge résolue, `tools/verify-maire.mjs`
   l'importe et REJOUE des entretiens entiers, et tout ce que le joueur lit vit
   dans `fermeStrings.js` (`L.maire`) comme partout ailleurs.

   ───────────────────────────────────────────────────────────────────────────
   CE QUE C'EST, EN QUATRE LIGNES

   On demande une audience à l'accueil de la mairie. On monte, on s'assoit sur
   l'une des deux chaises, le maire est en face, derrière son bureau, à
   contre-jour de la fenêtre qui donne sur le quai où l'on veut construire.
   Une jauge d'ADHÉSION, qui FUIT. Douze battements, trois réponses chacun :
   une idéale, une tiède, une qui casse quelque chose. À 75 il peut signer.

   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️⚠️ CE FICHIER EST UN SYSTÈME DE NÉGOCIATION, PAS UNE SCÈNE — ET C'EST UNE
   CONSÉQUENCE DIRECTE DE LA RÉPONSE DE GUILLAUME SUR LA RÉCOMPENSE.

   « On gagne la confiance du maire dans les prochains projets : plus facile de
   le convaincre pour les futures missions que nous implémenterons. » Une
   récompense qui se dépense dans une audience FUTURE interdit d'écrire cette
   audience-ci comme un cas particulier : la confiance doit être un DÉPART, la
   table doit être une donnée, et une seconde négociation (une commission, le
   cadastre, l'officier d'état civil) doit s'ajouter en une table de plus et
   zéro ligne de mécanique. C'est la promesse du 439 (`HALL_TOPICS` : « une
   quête future = une ligne »), tenue une seconde fois.

   ⚠️⚠️ LES PLANS NE SONT PAS UNE SERRURE. Décision de Guillaume : sans les
   plans de Kerguélen le maire est « très difficile à convaincre » ; avec eux il
   reste « un peu radin et réticent », mais c'est jouable. On peut donc monter
   le voir tout de suite et gagner — c'est la seule vraie décision du chapitre.
   ⚠️ Et l'écart ne se paie PAS en écrivant deux arbres : c'est une poignée de
   règles (`MAYOR_BARE_*`) plus quelques répliques marquées `when`, parce que
   deux arbres complets divergeraient au premier réglage (§8 de CLAUDE.md).

   ⚠️⚠️⚠️ ET LA FUITE EST L'HORLOGE. Le premier jet comptait DEUX ressources
   (une jauge, et un quart d'heure en tours) ; Guillaume l'a refusé, et la leçon
   du 458 dit pourquoi : deux grandeurs qui s'opposent se mesurent ensemble ou
   pas du tout. Ici hésiter coûte des POINTS, il n'y a qu'une jauge à lire, et
   le banc n'a qu'une différence à calculer.
   ⚠️ Ce qu'il ne faut jamais laisser arriver, en revanche, c'est qu'elle
   punisse la LECTURE : la fuite ne démarre qu'après une grâce DÉRIVÉE du texte
   affiché (`mayorReadMs`), jamais un nombre réglé à la main, sinon le joueur
   anglophone paie les 15 à 20 % de gonflement du français.

   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ RÉSEAU : UNE SEULE `req`, ET C'EST L'HÔTE QUI REJOUE.

   Une conversation appartient à UN client : rien n'est diffusé pendant. À la
   fin, le client envoie sa TRANSCRIPTION — un tableau de `{k, dt}`, la clé de
   chaque réponse et le temps de réflexion qu'elle a coûté — et l'hôte la
   REJOUE par `mayorReplay`, avec les mêmes résolveurs purs, pour décider
   lui-même s'il y a signature. Le client n'annonce jamais « j'ai gagné ».
   ⚠️ `dt` est un DÉLAI, pas un horodatage, et c'est ce qui rend la rejouabilité
   possible entre deux clients de LANGUES DIFFÉRENTES : un horodatage aurait
   obligé l'hôte à recalculer la grâce de lecture, donc à connaître la longueur
   du texte, donc à trouver un autre résultat selon la langue de celui qui
   arbitre. Le piège des « deux horloges » du §3, sous une forme neuve.
   ⚠️ Ça ne prétend pas être inviolable : un client modifié peut envoyer une
   transcription parfaite. Mais une transcription parfaite est aussi ce qu'on
   obtient en jouant bien — la triche coûte plus cher que la victoire, et c'est
   la seule garantie qui vaille dans un salon entre amis (§0).

   ⚠️ AUCUNE MIGRATION SUPABASE : tout tient dans `shared.star.mayor`, porté par
   `migrateMayor`, dans un `apply` qui partait déjà.
   ═══════════════════════════════════════════════════════════════════════════ */
import * as C from "./fermeConstants";

/* ═══════════════════════════════════════════════════════════════════════════
   1. LES CINQ FAMILLES D'ARGUMENT
   ───────────────────────────────────────────────────────────────────────────
   ⚠️ CINQ, ET PAS TROIS, PARCE QU'IL FAUT POUVOIR SE RÉPÉTER SANS LE VOULOIR.
   Une négociation à trois leviers se joue en alternant mécaniquement ; à cinq,
   avec la pénalité de répétition, il faut LIRE ce qu'il vient de dire au lieu
   de compter. C'est la différence entre choisir et cycler.
   ═══════════════════════════════════════════════════════════════════════════ */
export const MAYOR_TYPES = ["money", "risk", "town", "self", "heart"];

/* ═══════════════════════════════════════════════════════════════════════════
   2. LE MAIRE ÉLU CHANGE LA PARTIE — ET ÇA NE COÛTE RIEN
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ `C.TOWN_CANDIDATES` porte cinq figures de la ville DEPUIS LE 439, chacune
   avec un portefeuille écrit en commentaire (« l'eau et les champs », « les
   travaux, les ponts, les chemins », « l'ordre et les comptes », « le lac, le
   parc, les promenades », « l'école et les archives ») — et jusqu'à ce zip ce
   portefeuille ne servait À RIEN : l'élection ne produisait qu'un portrait
   accroché au mur. Le voilà qui décide de la partie.
   ⚠️ C'est aussi la première conséquence de JEU qu'ait jamais eue une élection
   municipale dans ce dépôt, et elle est gratuite : `mayorOf(day)` est une pure
   fonction du jour, donc les deux joueurs voient le même maire sans qu'on
   diffuse quoi que ce soit.

   Les valeurs vont de −2 à +2. Elles ne multiplient PAS bêtement : une affinité
   négative rend les gains plus maigres ET les fautes plus chères (voir
   `mayorDelta` — le signe de la base entre dans le calcul). Flatter Bonnefoy,
   qui a l'orgueil en horreur, coûte donc deux fois : le gain ne vient pas, et
   la vexation, elle, arrive en entier.
   ═══════════════════════════════════════════════════════════════════════════ */
export const MAYOR_AFFINITY = {
  //             💰money  🛟risk  🏛️town  🎖️self  ❤️heart
  vasseur:   { money:  1, risk:  0, town:  0, self: -1, heart:  2 },
  lantier:   { money: -1, risk:  2, town:  1, self:  0, heart:  0 },
  bonnefoy:  { money:  2, risk:  1, town:  0, self: -2, heart: -1 },
  delaunay:  { money:  0, risk: -1, town:  2, self:  1, heart:  0 },
  toussaint: { money: -1, risk:  0, town:  1, self:  0, heart:  2 },
};
/* ⚠️⚠️ RELEVÉ DE 0,18 À 0,25 APRÈS MESURE. À 0,18, le maire élu ne déplaçait le
   total d'un sans-faute que de quatre points sur cent-douze : l'affinité était
   écrite, documentée, vendue comme « l'élection a enfin une conséquence de
   jeu » et INVISIBLE à l'échelle d'un entretien. C'est le défaut du 448 (une
   constante qu'on lit mais qui ne fait rien) sous sa forme la plus polie : elle
   faisait quelque chose, juste pas assez pour qu'on le remarque. À 0,25, un
   argument vaut du simple au double selon qui est assis en face. */
export const MAYOR_AFF_STEP = 0.25;        // ce que vaut un cran d'affinité

/* ═══════════════════════════════════════════════════════════════════════════
   3. LA TABLE DES BATTEMENTS
   ───────────────────────────────────────────────────────────────────────────
   Douze nœuds, cinq actes : l'accueil · l'argent · les plans · le risque · lui.
   Chaque nœud a exactement TROIS réponses jouables — c'est la demande de
   Guillaume, mot pour mot : « 2 sur trois permettent de continuer la discussion
   (une de ces deux est la réponse idéale), une troisième est outrageusement
   vexante ou fout tout en l'air ».

   ⚠️⚠️ ET LA TROISIÈME A TROIS SAVEURS, DONT UNE SEULE EST DRÔLE. Guillaume :
   « le 3e mauvais choix doit pas toujours être aussi identifiable et
   caricatural même si c'est drôle d'en avoir des abusés ». Les trois, nommées
   pour qu'on puisse les compter (`flavour`, et le banc vérifie qu'aucune ne
   manque) :
     · `rude`  — l'insulte franche. Drôle, évidente. Il n'y en a qu'UNE, et
       c'est la seule qui mette fin à l'entretien sur-le-champ (`fatal`) ;
     · `tact`  — la faute de tact invisible. Parfaitement polie, et elle touche
       exactement là où il ne faut pas (son prédécesseur, sa réélection, son
       pont qu'il n'a pas réparé) ;
     · `trap`  — le piège logique. Elle SONNE comme la meilleure réponse et lui
       apporte sur un plateau l'objection qu'il cherchait. C'est la bonne, celle
       qui fait qu'on réfléchit ; les deux autres existent pour le rythme.

   ⚠️ `when` : "plans" / "bare". Une réplique qui NOMME les plans ne peut pas
   être proposée à quelqu'un qui ne les a pas — elle mentirait. Ces répliques-là
   ont une jumelle `bare`, plus faible, parce qu'on ne peut rien prouver les
   mains vides. Tout le reste de l'arbre est COMMUN aux deux mondes.

   ⚠️⚠️ `plansAt` : ce que vaut le fait de POSER les plans sur le bureau à ce
   moment-là. La carte ne se joue qu'une fois dans tout l'entretien. Au nœud
   `m5` — quand il demande ce qu'on veut construire, au juste — c'est le plus
   gros gain de la partie ; ailleurs c'est `C.MAYOR_PLANS_LATE`, et il ne les
   déroule même pas. *Le bon geste au mauvais moment n'est pas un demi-geste.*

   ⚠️ `tint` : le maire élu ajoute UNE phrase à ce nœud-là, et une seule. Cinq
   maires × trois nœuds teintés = quinze phrases, contre soixante s'il avait
   fallu décliner tout l'arbre. La variété se paie où elle se voit.
   ═══════════════════════════════════════════════════════════════════════════ */
/* ⚠️⚠️ LES VALEURS DES IDÉALES ONT ÉTÉ DIVISÉES PAR CINQ QUARTS APRÈS LE PREMIER
   PASSAGE DU BANC, ET LA RAISON N'EST PAS UN ÉQUILIBRAGE : c'est la LONGUEUR de
   la discussion. Au barème d'origine, un sans-faute atteignait le plafond au
   SEPTIÈME nœud sur douze — les cinq derniers échanges étaient écrits, joués,
   lus, et ne pouvaient plus rien changer. Guillaume a demandé « une vraie
   discussion longue » ; une discussion dont la seconde moitié est décorative est
   courte, elle est juste lente. ⚠️ Aucun contrôle numérique ne pouvait le dire :
   le jeu parfait gagnait, le jeu tiède perdait, tout était vert. Ça se voit en
   LISANT la colonne de gauche d'une transcription (§7 du banc), et c'est le §25
   de `ferme/README.md` transposé à ce qu'on peut regarder dans un terminal. */
export const MAYOR_NODES = [
  /* ── ACTE I — L'ACCUEIL. Il ne se lève pas, il ne sourit pas, il finit sa
     ligne. Tout ce qui se joue ici, c'est de quoi on a l'air en entrant.
     ⚠️⚠️ LES FAUTES DE CET ACTE SONT MOINS CHÈRES QUE LES AUTRES, ET CE N'EST PAS
     UNE FAVEUR : à l'accueil il n'est pas encore investi, il n'a rien à perdre,
     et une bourde n'a pas de quoi le vexer durablement. Au barème d'origine
     elles coûtaient plus que la mise de départ — le premier clic malheureux
     fermait l'entretien, et un dialogue à trois choix dont la première erreur
     est mortelle est un couloir que plus personne n'ose lire. Trouvé par le
     banc, qui exige qu'UNE faute se rattrape et que TROIS ne se rattrapent
     pas. ── */
  { id: "m1", act: 1, plansAt: 3, answers: [
    { k: "m1a", type: "town",  base:   6, grade: "ideal" },
    { k: "m1b", type: "heart", base:   4, grade: "warm"  },
    /* ⚠️ La plainte du voyageur : elle SONNE légitime — on a vraiment fait la
       route — et elle présente une facture avant d'avoir dit bonjour, à un
       homme qui reçoit soixante personnes par semaine. Saveur `tact`. */
    { k: "m1c", type: "self",  base:  -8, grade: "fault", flavour: "tact" },
  ] },
  { id: "m2", act: 1, tint: true, plansAt: 3, answers: [
    { k: "m2a", type: "heart", base:   6, grade: "ideal" },
    { k: "m2b", type: "town",  base:   4, grade: "warm"  },
    /* ⚠️ À un mot près de l'idéale, et c'est tout le point : « personne d'autre
       ne l'a proposé » parle de l'inertie de la ville ; « vous n'avez personne
       d'autre sous la main » dit à un maire qu'il est démuni. */
    { k: "m2c", type: "self",  base:  -9, grade: "fault", flavour: "trap" },
  ] },

  /* ── ACTE II — L'ARGENT. Il désigne la pile de dossiers ficelés : l'entretien
     du pont sud, repoussé depuis deux ans faute de six mille. C'est sa honte,
     et il s'en sert comme d'une arme. ── */
  { id: "m3", act: 2, plansAt: 6, answers: [
    { k: "m3a",  type: "money", base:  8, grade: "ideal", when: "plans" },
    { k: "m3a0", type: "money", base:   5, grade: "ideal", when: "bare"  },
    { k: "m3b",  type: "town",  base:   3, grade: "warm"  },
    /* ⚠️⚠️ LE PIÈGE LOGIQUE DE RÉFÉRENCE, ET C'EST LA MEILLEURE LIGNE DE
       L'ARBRE. « Moi. Tout. La ville ne sortira pas un sou » est la réponse la
       plus généreuse qu'on puisse faire, elle a l'air imparable — et elle
       décrit un chantier PRIVÉ sur un quai PUBLIC, c'est-à-dire exactement
       l'objection qu'il cherchait depuis le début. On la lui apporte. */
    { k: "m3c",  type: "money", base: -11, grade: "fault", flavour: "trap" },
  ] },
  { id: "m4", act: 2, plansAt: 6, answers: [
    { k: "m4a", type: "town",  base:  8, grade: "ideal" },
    { k: "m4b", type: "risk",  base:   4, grade: "warm"  },
    /* ⚠️ « On verra ça le moment venu. » Polie, raisonnable, mortelle : c'est
       littéralement ce qu'il entend toute la journée, de tout le monde. */
    { k: "m4c", type: "money", base:  -9, grade: "fault", flavour: "tact" },
  ] },

  /* ── ACTE III — LES PLANS. Le seul endroit où la carte vaut son prix. ── */
  { id: "m5", act: 3, plansAt: 13, answers: [
    { k: "m5a",  type: "risk",  base:  7, grade: "ideal", when: "plans" },
    { k: "m5a0", type: "town",  base:   4, grade: "ideal", when: "bare"  },
    { k: "m5b",  type: "heart", base:   4, grade: "warm"  },
    { k: "m5c",  type: "self",  base: -10, grade: "fault", flavour: "trap" },
  ] },
  { id: "m6", act: 3, plansAt: 10, answers: [
    { k: "m6a",  type: "money", base:  8, grade: "ideal", when: "plans" },
    { k: "m6a0", type: "town",  base:   4, grade: "ideal", when: "bare"  },
    { k: "m6b",  type: "risk",  base:   5, grade: "warm"  },
    { k: "m6c",  type: "self",  base: -12, grade: "fault", flavour: "tact" },
  ] },

  /* ── ACTE IV — LE RISQUE. C'est sa signature en bas de la page, et il le sait
     depuis le début : les trois nœuds précédents servaient à savoir s'il avait
     envie de la donner. ── */
  { id: "m7", act: 4, tint: true, plansAt: 6, answers: [
    { k: "m7a", type: "risk",  base:  9, grade: "ideal" },
    { k: "m7b", type: "town",  base:   4, grade: "warm"  },
    /* ⚠️ Proposer de le couvrir, c'est lui dire qu'il a quelque chose à
       cacher. On croit rendre service. Saveur `tact`, la plus vicieuse. */
    { k: "m7c", type: "heart", base: -10, grade: "fault", flavour: "tact" },
  ] },
  { id: "m8", act: 4, plansAt: 5, answers: [
    { k: "m8a", type: "risk",  base:  8, grade: "ideal" },
    { k: "m8b", type: "money", base:   4, grade: "warm"  },
    /* ⚠️ « Personne ne va sur ce quai. Il n'y a rien. » C'est VRAI, et c'est son
       quai. Un fait exact peut être une insulte. */
    { k: "m8c", type: "town",  base: -11, grade: "fault", flavour: "trap" },
  ] },
  { id: "m9", act: 4, plansAt: 3, answers: [
    { k: "m9a", type: "town",  base:  7, grade: "ideal" },
    { k: "m9b", type: "risk",  base:   4, grade: "warm"  },
    { k: "m9c", type: "self",  base:  -9, grade: "fault", flavour: "tact" },
  ] },

  /* ── ACTE V — LUI. On a fini de parler de bateau. ── */
  { id: "m10", act: 5, plansAt: 3, answers: [
    { k: "m10a", type: "town",  base:  9, grade: "ideal" },
    { k: "m10b", type: "money", base:   5, grade: "warm"  },
    { k: "m10c", type: "self",  base: -10, grade: "fault", flavour: "trap" },
  ] },
  { id: "m11", act: 5, plansAt: 3, answers: [
    /* ⚠️⚠️ C'EST ICI, ET SEULEMENT ICI, QUE LA FLATTERIE EST JUSTE. `self` a été
       une faute dans quatre nœuds sur cinq ; au moment où il demande lui-même ce
       qu'on attend de lui, c'est la seule famille qui réponde à la question. Un
       levier qui marche partout n'est pas un levier, c'est un bouton. */
    { k: "m11a", type: "self",  base:  9, grade: "ideal" },
    { k: "m11b", type: "heart", base:   5, grade: "warm"  },
    /* ⚠️ L'UNIQUE `rude` DE L'ARBRE, ET L'UNIQUE `fatal` : proposer de l'acheter,
       à voix haute, dans son bureau. Drôle, énorme, et sans retour. */
    { k: "m11c", type: "money", base: -26, grade: "fault", flavour: "rude", fatal: true },
  ] },
  { id: "m12", act: 5, tint: true, plansAt: 3, answers: [
    { k: "m12a", type: "heart", base:  9, grade: "ideal" },
    { k: "m12b", type: "town",  base:   6, grade: "warm"  },
    /* ⚠️ Lui rappeler le pont sud à la seconde où il est en train de rêver
       devant sa fenêtre. Impeccablement poli. */
    { k: "m12c", type: "self",  base:  -8, grade: "fault", flavour: "tact" },
  ] },
];

export const MAYOR_NODE = Object.fromEntries(MAYOR_NODES.map(n => [n.id, n]));
export const MAYOR_NODE_IDS = MAYOR_NODES.map(n => n.id);
export const MAYOR_ACTS = [...new Set(MAYOR_NODES.map(n => n.act))];
/* ⚠️ TOUTES LES CLÉS DE RÉPLIQUE, DÉRIVÉES DE LA TABLE ET JAMAIS RECOPIÉES. Le
   banc s'en sert pour exiger un texte ET une justification par réplique : une
   clé orpheline de texte échoue, un texte orphelin de clé aussi (449 : une
   jointure, jamais deux listes). */
export const MAYOR_SAY_KEYS = MAYOR_NODES.flatMap(n => n.answers.map(a => a.k));
export const MAYOR_TINT_NODES = MAYOR_NODES.filter(n => n.tint).map(n => n.id);

/* ═══════════════════════════════════════════════════════════════════════════
   4. LE CALCUL D'UNE RÉPONSE
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ TOUT MODIFICATEUR REND AUSSI SA RAISON. C'est la demande de Guillaume,
   mot pour mot : « toujours avoir une justification de la réaction du maire ».
   `mayorDelta` ne rend donc pas un nombre, il rend un nombre ET la liste des
   raisons qui l'ont fabriqué (`why`) — et l'interface les affiche, une ligne,
   à chaque coup. Un chiffre qui bouge sans qu'on sache pourquoi n'est pas une
   jauge de persuasion, c'est une roulette.
   ⚠️ Et c'est aussi ce qui rend le réglage possible : quand une réponse paraît
   injuste, on lit la liste au lieu de deviner.

   ⚠️⚠️ LE SIGNE DE LA BASE ENTRE DANS TOUS LES MODIFICATEURS D'AFFINITÉ, et
   c'est le seul endroit délicat du fichier. Une affinité négative doit rendre
   les GAINS plus maigres et les FAUTES plus chères. Multiplier bêtement par
   `1 + aff × pas` ferait l'inverse sur les fautes : Bonnefoy, qui a l'orgueil
   en horreur (`self: -2`), s'en trouverait MOINS vexé qu'un autre par une
   flatterie. On multiplie donc par `1 + signe(base) × aff × pas`.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Les jours qui restent avant le scrutin décident du poids de deux familles.
   ⚠️ PURE FONCTION DU JOUR, comme tout le calendrier de ce dépôt : rien n'est
   stocké, les deux joueurs voient le même maire pressé par la même échéance. */
export function mayorRaceDays(day, nextElection) {
  const d = (nextElection | 0) - (day | 0);
  return d > 0 ? d : 0;
}
export const MAYOR_RACE_NEAR = 5;      // il joue sa place
export const MAYOR_RACE_FRESH = 25;    // il vient d'être élu, il n'a besoin de personne

export function mayorElectionK(type, race) {
  if (race <= MAYOR_RACE_NEAR) {
    if (type === "self" || type === "town") return 1.5;
    if (type === "money") return 0.5;         // il est terrifié de passer pour dépensier
    return 1;
  }
  if (race >= MAYOR_RACE_FRESH && type === "self") return 0.5;
  return 1;
}

export function mayorAnswerOf(nodeId, key) {
  const n = MAYOR_NODE[nodeId];
  return n ? n.answers.find(a => a.k === key) || null : null;
}

/* ⚠️ LES TROIS RÉPONSES RÉELLEMENT JOUABLES D'UN NŒUD. `when` filtre les
   répliques qui NOMMENT les plans. Le banc exige que cette fonction rende
   EXACTEMENT trois réponses, dont une idéale et une faute, dans les DEUX
   mondes — c'est un invariant balayé sur toute la table, pas trois exemples
   (449 : quand on peut énoncer une propriété, on la balaie). */
export function mayorPlayable(nodeId, plans) {
  const n = MAYOR_NODE[nodeId];
  if (!n) return [];
  const want = plans ? "plans" : "bare";
  return n.answers.filter(a => !a.when || a.when === want);
}

export function mayorDelta(s, a) {
  const why = [];
  let v = a.base;
  const sign = v >= 0 ? 1 : -1;
  const gain = v > 0;

  /* — le maire élu — */
  const aff = (MAYOR_AFFINITY[s.mayorKey] || {})[a.type] || 0;
  if (aff) {
    v *= 1 + sign * aff * MAYOR_AFF_STEP;
    why.push({ why: aff > 0 ? "affinity+" : "affinity-", type: a.type });
  }
  /* — l'échéance électorale — */
  const ek = mayorElectionK(a.type, s.race);
  if (ek !== 1) {
    v *= 1 + sign * (ek - 1);
    why.push({ why: ek > 1 ? "race+" : "race-", type: a.type });
  }
  /* — se répéter, et il le DIT — */
  if (gain && s.lastType === a.type) { v *= 0.5; why.push({ why: "again", type: a.type }); }
  /* — le cœur ne se joue qu'une fois : la deuxième confidence n'en est plus une — */
  if (gain && a.type === "heart" && (s.used.heart | 0) > 0) { v *= 0.4; why.push({ why: "heartAgain" }); }
  /* — il se souvient de la dernière fois qu'on est venu — */
  if (gain && s.burnt.includes(a.k)) { v *= C.MAYOR_BURNT_K; why.push({ why: "burnt" }); }
  /* — les mains vides, la sûreté n'est qu'une opinion —
     ⚠️ ET C'EST LE SEUL MALUS DE CE MONDE-LÀ. Il y en avait un second, général,
     qui rabotait toutes les idéales : voir la note de `MAYOR_BARE_RISK_K` dans
     `fermeConstants.js`. Il empilait une quatrième fois une difficulté déjà
     comptée trois et rendait l'entretien ingagnable sans plans. */
  if (!s.plans && a.type === "risk" && gain) { v *= C.MAYOR_BARE_RISK_K; why.push({ why: "bareRisk" }); }
  return { v: Math.round(v * 10) / 10, why };
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. LA FUITE
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ ELLE NE COMMENCE QU'APRÈS LA GRÂCE DE LECTURE, ET LA GRÂCE EST DÉRIVÉE
   DU TEXTE. `mayorReadMs` reçoit le nombre de signes que l'interface vient
   RÉELLEMENT d'afficher (la question du maire plus les trois réponses, dans la
   langue du joueur) : c'est le seul moyen que le joueur anglophone et le joueur
   français aient le même temps de lecture pour le même contenu.
   ⚠️ Elle est bornée en haut : une grâce qui grandirait indéfiniment avec un
   texte long donnerait à l'auteur du dialogue le pouvoir de désarmer la
   mécanique en écrivant plus. Un plafond est une contrainte d'écriture.
   ═══════════════════════════════════════════════════════════════════════════ */
export function mayorReadMs(chars) {
  const ms = (chars | 0) * C.MAYOR_READ_MS_CHAR;
  return Math.max(C.MAYOR_READ_MS_MIN, Math.min(C.MAYOR_READ_MS_MAX, ms));
}

/* Points par seconde. Négatif : ça descend. Zéro : il tient. Positif : il
   s'anime tout seul, et c'est l'élan qui l'a fait.
   ⚠️ `reading` est passé par l'appelant plutôt que déduit d'une horloge interne :
   pendant la rejouabilité côté hôte il n'y a PAS de lecture, seulement des
   délais de réflexion, et une fonction qui irait chercher `Date.now()` rendrait
   deux résultats différents des deux côtés du réseau. */
export function mayorRate(s, reading) {
  if (reading) return 0;
  /* ⚠️ RIEN NE FUIT AVANT LE PREMIER ÉCHANGE : il vous a reçu, il ne se lève pas
     parce que vous avez marqué un temps avant votre première phrase.
     ⚠️⚠️ LE SEUIL EST À UN, PAS À ZÉRO, et c'est une conséquence directe du
     défaut de réseau corrigé juste au-dessus : depuis que la transcription se
     consigne AVANT la fuite, `log` contient déjà le coup en cours quand cette
     fonction est appelée. Un `!s.log.length` faisait donc payer le premier
     échange, silencieusement. *Quand on déplace une écriture, on va relire tout
     ce qui comptait dessus.* */
  if (s.log.length <= 1) return 0;
  if (s.streak >= C.MAYOR_STREAK_GAIN) return C.MAYOR_STREAK_RISE_PER_S;
  let k = 1;
  /* ⚠️⚠️ L'ÉLAN RÉDUIT, IL N'ANNULE PAS (voir `MAYOR_STREAK_HOLD_K`) : à
     l'annulation, la seconde moitié de l'entretien ne pouvait plus rien
     changer. */
  if (s.streak >= C.MAYOR_STREAK_HOLD) k *= C.MAYOR_STREAK_HOLD_K;
  /* ⚠️⚠️⚠️ IL Y AVAIT ICI UN `MAYOR_DRAIN_BARE_K` : les mains vides, il décrochait
     une fois et demie plus vite. Supprimé, pas mis à 1 (leçon 448/453). C'était
     le TROISIÈME empilement d'une même difficulté, après la carte des plans qui
     n'existe pas et les trois répliques de repli, et il rendait l'entretien
     arithmétiquement ingagnable sans dossier — ce que le banc a fini par dire en
     le jouant quatre cents fois. *La difficulté d'un monde se règle sur UN
     levier qu'on peut lire, pas sur trois qu'on additionne sans jamais faire la
     somme.* Ce qui reste, et qui suffit : moins à dire, et aucun droit à
     l'erreur (mesuré par le banc, §3). */
  if (s.audience) k *= C.MAYOR_DRAIN_AUDIENCE_K;
  if (s.trust > 0) k *= Math.pow(C.MAYOR_TRUST_DRAIN_K, s.trust);
  if (s.slipMs > 0) k *= C.MAYOR_SLIP_K;
  return -(C.MAYOR_DRAIN_PER_S * k);
}

/* Avance la jauge de `ms` millisecondes de réflexion (jamais de lecture).
   ⚠️ LE GLISSEMENT SE CONSOMME AVANT LA FUITE ORDINAIRE, en deux tranches, sinon
   un joueur qui met huit secondes à répondre paierait le tarif « il vient de
   décrocher » sur toute la durée alors qu'il ne dure que quatre secondes. Un
   multiplicateur appliqué à un intervalle plus long que lui est faux, et c'est
   le genre de faux qu'aucun contrôle ponctuel ne voit. */
export function mayorAdvance(s, ms) {
  let left = Math.max(0, ms | 0);
  const floor0 = s.adh;
  while (left > 0) {
    const slice = s.slipMs > 0 ? Math.min(left, s.slipMs) : left;
    s.adh += mayorRate(s, false) * (slice / 1000);
    if (s.slipMs > 0) s.slipMs = Math.max(0, s.slipMs - slice);
    left -= slice;
    if (s.adh <= C.MAYOR_ADH_FLOOR) break;
  }
  /* ⚠️⚠️ LA BORNE, ET C'EST ELLE QUI DÉCIDE SI LE JEU RÉCOMPENSE DE RÉPONDRE
     BIEN OU DE RÉPONDRE VITE (voir `MAYOR_DRAIN_CAP`). Sans elle, neuf secondes
     de réflexion coûtaient plus que la meilleure réplique de l'arbre ne
     rapporte, et lire les réponses devenait une faute. */
  if (s.adh < floor0 - C.MAYOR_DRAIN_CAP) s.adh = floor0 - C.MAYOR_DRAIN_CAP;
  s.adh = Math.max(C.MAYOR_ADH_FLOOR, Math.min(C.MAYOR_ADH_MAX, Math.round(s.adh * 10) / 10));
  if (s.adh <= C.MAYOR_ADH_FLOOR && !s.over) s.over = "walked";
  return s;
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. UNE SÉANCE
   ═══════════════════════════════════════════════════════════════════════════ */
export function mayorOpen(ctx) {
  const trust = Math.max(0, Math.min(C.MAYOR_TRUST_MAX, ctx.trust | 0));
  const plans = !!ctx.plans;
  const s = {
    mayorKey: ctx.mayorKey || "vasseur",
    day: ctx.day | 0,
    race: mayorRaceDays(ctx.day, ctx.nextElection),
    audience: !!ctx.audience,
    plans, trust,
    burnt: Array.isArray(ctx.burnt) ? ctx.burnt.slice() : [],
    adh: (plans ? C.MAYOR_START_PLANS : C.MAYOR_START_BARE) + trust * C.MAYOR_TRUST_START_BONUS,
    node: MAYOR_NODE_IDS[0],
    streak: 0,
    lastType: null,
    used: {},
    plansLaid: false,
    slipMs: 0,
    log: [],
    over: null,      // null | "signed" | "walked" | "out" | "thrown"
    peak: 0,
  };
  s.peak = s.adh;
  return s;
}

/* Ce que l'interface doit afficher maintenant : la question, ses trois réponses,
   et les deux boutons conditionnels.
   ⚠️ `plans` et `settle` NE SONT PAS DES RÉPONSES DE LA TABLE : ce sont des
   GESTES, ils n'ont ni famille ni justification écrite d'avance, et les mêler
   aux trois autres aurait fait mentir l'invariant « exactement trois ». */
export function mayorChoices(s) {
  if (s.over || !s.node) return [];
  const out = mayorPlayable(s.node, s.plans).map(a => ({ ...a, kind: "say" }));
  if (s.plans && !s.plansLaid) out.push({ k: "__plans", kind: "plans" });
  if (s.adh >= C.MAYOR_ADH_WIN) out.push({ k: "__settle", kind: "settle" });
  return out;
}

function bump(s, delta) {
  s.adh = Math.max(C.MAYOR_ADH_FLOOR, Math.min(C.MAYOR_ADH_MAX, Math.round((s.adh + delta) * 10) / 10));
  if (s.adh > s.peak) s.peak = s.adh;
  if (s.adh <= C.MAYOR_ADH_FLOOR && !s.over) s.over = "walked";
}

function step(s) {
  const i = MAYOR_NODE_IDS.indexOf(s.node);
  s.node = i >= 0 && i + 1 < MAYOR_NODE_IDS.length ? MAYOR_NODE_IDS[i + 1] : null;
  /* Il n'a plus de question. À partir de là c'est la jauge qui décide, et elle
     seule : il signe s'il est convaincu, il raccompagne sinon. */
  if (!s.node && !s.over) s.over = s.adh >= C.MAYOR_ADH_WIN ? "signed" : "out";
}

/* ⚠️⚠️ UN SEUL POINT D'ENTRÉE POUR TOUT CE QUI SE JOUE : une réplique, les
   plans, la sortie anticipée. L'hôte rejoue EXACTEMENT cette fonction, dans le
   même ordre, avec les mêmes `dt` — s'il en existait une seconde, la rejouabilité
   dépendrait de laquelle le client a appelée, c'est-à-dire de rien. */
export function mayorPlay(s, key, dtMs) {
  if (s.over) return { s, delta: 0, why: [], grade: null };
  /* ⚠️⚠️⚠️ LA TRANSCRIPTION SE CONSIGNE AVANT LA FUITE, ET C'EST UN DÉFAUT DE
     RÉSEAU QUE LE BANC A SORTI. Quand la jauge tombait à zéro PENDANT le temps
     de réflexion, l'ancien code sortait sans rien consigner : le client voyait
     `walked`, l'hôte rejouait une transcription amputée du dernier silence et
     concluait `out`. Deux verdicts, et c'est le client qui aurait fait autorité,
     c'est-à-dire personne (§3). *Ce qui a coûté du temps doit être écrit, même
     quand ça n'a servi à rien.*
     ⚠️ Une clé inconnue est consignée elle aussi, et ne fait rien : l'hôte
     rejoue donc exactement le même silence, et le verdict reste identique. */
  s.log.push({ k: String(key || ""), dt: dtMs | 0 });
  /* ⚠️⚠️ LE BATTEMENT, ET IL EST LE MÊME DES DEUX CÔTÉS DU RÉSEAU. Un `dt` de
     zéro ne veut pas dire « le temps n'a pas passé » : le maire finit sa phrase,
     réfléchit, repose son stylo. Sans ce plancher, douze réponses tièdes
     martelées instantanément franchissaient les 75. */
  mayorAdvance(s, Math.max(dtMs | 0, C.MAYOR_BEAT_MS));
  if (s.over) return { s, delta: 0, why: [], grade: null };

  if (key === "__settle") {
    /* « Je crois qu'on s'est compris. » ⚠️ C'EST LE MEILLEUR BOUTON DU SYSTÈME,
       et il ne coûte qu'une condition : à partir de 75 on peut empocher — ou
       pousser pour la confiance, en risquant tout ce qu'on a. Une jauge qu'on
       franchit et c'est fini ne se joue qu'une fois. */
    if (s.adh < C.MAYOR_ADH_WIN) return { s, delta: 0, why: [], grade: null };
    s.over = "signed";
    return { s, delta: 0, why: [], grade: "settle" };
  }

  if (key === "__plans") {
    if (!s.plans || s.plansLaid) return { s, delta: 0, why: [], grade: null };
    const n = MAYOR_NODE[s.node];
    const v = n ? (n.plansAt | 0) || C.MAYOR_PLANS_LATE : C.MAYOR_PLANS_LATE;
    s.plansLaid = true;
    bump(s, v);
    /* ⚠️ POSER LES PLANS N'EST PAS UNE RÉPONSE : ça ne casse pas l'élan et ça ne
       le nourrit pas non plus. Le geste ne répond à aucune question — il donne à
       la question suivante de quoi être répondue. */
    return { s, delta: v, why: [{ why: v >= 10 ? "plansNow" : "plansLate" }], grade: "plans" };
  }

  const a = mayorAnswerOf(s.node, key);
  if (!a) return { s, delta: 0, why: [], grade: null };
  const { v, why } = mayorDelta(s, a);
  s.used[a.type] = (s.used[a.type] | 0) + 1;
  if (!s.burnt.includes(a.k)) s.burnt.push(a.k);
  s.lastType = a.type;

  if (a.grade === "ideal") s.streak += 1;
  else if (a.grade === "warm") s.streak = Math.min(s.streak, 1);
  else {
    s.streak = 0;
    /* ⚠️ LA CONFIANCE RACCOURCIT LE GLISSEMENT, ELLE NE GONFLE PAS LA JAUGE :
       voir `MAYOR_TRUST_FORGIVE`. C'est la différence entre « il vous écoute
       mieux » (ce qui rendrait le jeu tiède gagnant) et « il ne vous en veut pas
       longtemps » (ce qui achète un droit à l'erreur). */
    s.slipMs = Math.round(C.MAYOR_SLIP_MS * Math.max(0, 1 - C.MAYOR_TRUST_FORGIVE * s.trust));
  }

  bump(s, v);
  if (a.fatal && !s.over) { s.over = "thrown"; s.adh = C.MAYOR_ADH_FLOOR; }
  if (!s.over) step(s);
  return { s, delta: v, why, grade: a.grade };
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. SON CORPS EST LE SECOND AFFICHAGE
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ C'EST LA SEULE CHOSE QUI JUSTIFIE UNE SCÈNE 3D PLUTÔT QU'UN PANNEAU DE
   TEXTE. Une jauge est un nombre ; un corps est une lecture. Si le joueur doit
   regarder la barre pour savoir où il en est, la 3D n'a rien acheté et il
   fallait faire un panneau.
   ⚠️ La posture est dérivée de la jauge ET du dernier coup — jamais d'un état
   qu'on entretiendrait à côté, qui divergerait au premier réglage (§8).
   ═══════════════════════════════════════════════════════════════════════════ */
export const MAYOR_POSES = ["push", "closed", "clock", "flat", "lean", "stamp", "window"];
export function mayorPose(s, lastGrade) {
  if (!s) return "closed";
  if (s.over === "thrown" || s.over === "walked") return "push";
  if (lastGrade === "fault") return "push";
  if (s.streak >= C.MAYOR_STREAK_GAIN) return "window";
  if (s.adh >= C.MAYOR_ADH_WIN) return "stamp";
  if (s.adh >= 56) return "lean";
  if (s.adh >= 36) return "flat";
  if (s.adh >= 16) return "clock";
  return "closed";
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. LA REJOUABILITÉ CÔTÉ HÔTE, ET CE QU'ELLE ÉCRIT
   ═══════════════════════════════════════════════════════════════════════════ */
export function mayorReplay(log, ctx) {
  const s = mayorOpen(ctx);
  for (const e of Array.isArray(log) ? log : []) {
    if (s.over) break;
    mayorPlay(s, String(e && e.k || ""), Math.max(0, (e && e.dt) | 0));
  }
  /* Une transcription qui s'arrête avant la fin de l'arbre sans conclusion :
     le client a fermé la fenêtre. Ce n'est pas une victoire. */
  if (!s.over) s.over = "out";
  return s;
}

/* Le cran de confiance gagné. ⚠️ SIGNER SUFFIT POUR UN CRAN : c'est la réponse
   de Guillaume — la confiance est ce que rapporte un ENTRETIEN, et un entretien
   parfait en rapporte plus. Trois crans, trois qualités de signature. */
export function mayorTrustGain(s) {
  if (!s || s.over !== "signed") return 0;
  /* ⚠️ `peak` n'est tenu que par `bump` : un appelant qui poserait la jauge
     directement (le menu développeur, un banc) lui ferait rendre un cran de
     confiance trop bas sans que rien ne le dise. On prend le maximum des deux. */
  const top = Math.max(s.peak, s.adh);
  if (top >= C.MAYOR_ADH_MAX) return 3;
  if (top >= 90) return 2;
  return 1;
}
export function mayorGrade(s) {
  const t = mayorTrustGain(s);
  return t >= 3 ? "full" : t === 2 ? "good" : t === 1 ? "plain" : s.over;
}

export function migrateMayor(e) {
  if (!e || typeof e !== "object") return e;
  const m = e.mayor && typeof e.mayor === "object" ? e.mayor : {};
  e.mayor = {
    ok: m.ok | 0,
    by: typeof m.by === "string" ? m.by.slice(0, 24) : "",
    grade: typeof m.grade === "string" ? m.grade.slice(0, 8) : "",
    trust: Math.max(0, Math.min(C.MAYOR_TRUST_MAX, m.trust | 0)),
    tries: Math.max(0, Math.min(999, m.tries | 0)),
    best: Math.max(0, Math.min(C.MAYOR_ADH_MAX, m.best | 0)),
    /* ⚠️⚠️ `burnt` EST BORNÉ, ET LA BORNE EST DÉRIVÉE DE LA TABLE. Un tableau qui
       grossit à chaque tentative finirait par voyager dans chaque `apply` —
       c'est le champ qu'on oublie et qui coûte de la bande passante pour
       toujours. Il ne peut pas contenir plus de clés qu'il n'en existe.
       ⚠️ Et la troncature se fait sur le NOMBRE d'entrées, pas sur la longueur
       des clés : couper une clé, c'est le défaut du 469 (deux clés distinctes
       qui tombent sur la même), payé 447 contrôles verts. */
    burnt: Array.isArray(m.burnt)
      ? m.burnt.filter(k => MAYOR_SAY_KEYS.includes(k)).slice(0, MAYOR_SAY_KEYS.length)
      : [],
  };
  return e;
}

export function mayorSigned(e) { return !!(e && e.mayor && e.mayor.ok); }
export function mayorTrust(e) { return e && e.mayor ? Math.max(0, Math.min(C.MAYOR_TRUST_MAX, e.mayor.trust | 0)) : 0; }
export function mayorTries(e) { return e && e.mayor ? (e.mayor.tries | 0) : 0; }
export function mayorBurnt(e) { return e && e.mayor && Array.isArray(e.mayor.burnt) ? e.mayor.burnt : []; }

/* ⚠️⚠️ L'ARBITRAGE. Idempotent, hôte seulement, et il REJOUE au lieu de croire.
   Il rend une clé de chat ou `null` — comme tous les résolveurs de `quete.js`,
   il n'applique rien lui-même en dehors de `e`, et le chemin du menu
   développeur peut donc JETER ce qu'il rend (règle du 398). */
export function resolveMayor(e, who, name, log, ctx, at) {
  if (!e) return null;
  migrateMayor(e);
  if (e.mayor.ok) return null;                       // déjà signé : rien à rejouer
  const s = mayorReplay(log, { ...ctx, burnt: e.mayor.burnt, trust: e.mayor.trust });
  e.mayor.tries = Math.min(999, e.mayor.tries + 1);
  e.mayor.best = Math.max(e.mayor.best, Math.round(s.peak));
  for (const l of s.log) if (l.k[0] !== "_" && !e.mayor.burnt.includes(l.k)) e.mayor.burnt.push(l.k);
  if (s.over !== "signed") return s.over === "thrown" ? "mayorThrown" : "mayorFailed";
  e.mayor.ok = at | 0;
  e.mayor.by = typeof name === "string" ? name.slice(0, 24) : "";
  e.mayor.grade = mayorGrade(s);
  e.mayor.trust = Math.max(e.mayor.trust, mayorTrustGain(s));
  return "mayorSigned";
}
