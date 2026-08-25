# CLAUDE.md — CONTEXTE ARCARDI

**Lis ce fichier en entier avant toute action. Puis arrête de lire et demande.**
Il remplace l'exploration du dépôt pour tout ce qui est global. Le README est un journal
chronologique inversé : c'est de l'**histoire**, pas de l'orientation.

---
## ⏭️ REPRISE — SI GUILLAUME DIT SEULEMENT « REPRENDS LE TRAVAIL », C'EST ICI

⚠️⚠️⚠️ **CE BLOC EST LE SEUL ENDROIT DU FICHIER QUI DÉSIGNE UNE ACTION SUIVANTE.** Il se
REMPLACE à chaque fin de livraison, il ne s'empile jamais. *Un fichier qui contient tout ne dit
rien tant qu'il ne dit pas par quoi commencer.*

**HORS-ZIP — QUATRE DEMANDES DE GUILLAUME EN SESSION DIRECTE SUR L'AUDIENCE DU MAIRE ET LE
TRIBUNAL/MAIRIE (pas d'upload de zip, donc pas de numéro).** La passe de collisions précédente
(portes, ponts, escaliers, haies, seuils) est TERMINÉE et ses trouvailles vivent dans le tableau
des leçons ; ce bloc la remplace entièrement, comme le veut la règle du §14.

1. **☄️ Le compte à rebours du gros météore — LIVRÉ.** Il « semblait ne jamais tomber » : le
   mécanisme (`STAR_TOWN_ACTIVE_MS`, deux minutes de présence active en ville) était déjà juste,
   il n'avait aucun affichage. Une pastille `.ferme-wait-pill` (haut-droite, à côté du pisteur
   d'étoile qui reste seul autorisé à parler en haut-centre) montre désormais le compte à rebours
   en direct — **côté hôte seulement**, lui seul tenant l'horloge réelle de présence
   (`starTownActiveRef`) ; un invité verrait un nombre qu'il ne peut pas garantir, ce que le §3
   de CLAUDE.md interdit.
2. **🎩 Le rendez-vous chez le maire, affiché dès la demande — LIVRÉ.** Même pastille, réutilisée :
   dès que `e.mayor.appt.due` existe pour SOI (état déjà partagé, aucun message de plus), le
   compte à rebours s'affiche sur LES DEUX écrans — plus besoin de rouvrir le guichet de la mairie
   pour le voir. Les deux comptes à rebours ne se recouvrent jamais : le maire ne se demande qu'
   après la chute du météore, jamais avant.
3. **🧑‍💼 La pose du maire, plus réaliste — LIVRÉ, avec UN VRAI BUG TROUVÉ.** Signalé : bras
   parfois inversés, écharpe parfois coupée, revers trop grossiers. `solveArm` (`maireBureau.js`)
   mirroir le bras gauche du droit sur toute sa longueur SAUF dans son repli anti-`NaN` (le
   produit vectoriel presque nul), qui retombait sur +X MONDE sans jamais multiplier par `side` —
   c'est-à-dire le côté du bras DROIT, appliqué de temps en temps au bras GAUCHE. **C'est un vrai
   bug, corrigé** (voir le tableau des leçons). L'écharpe vivait presque au même plan que les
   revers (z ∈ [0,1325 ; 0,1675] contre [0,142 ; 0,162]) : remontée à 0,178 (au-dessus de tout,
   comme une écharpe se porte réellement) et sa rosette reparentée dessus au lieu d'une position
   `torso` figée. Le col et les revers sont passés d'une plaque unique inclinée à deux pans
   (pliure visible) ; les cylindres de bras sont passés de 10 à 16 segments. **Non touché** :
   le vocabulaire de poses (7 clés, 8 visages) et la vitesse d'`ease()`, que Guillaume dit
   apprécier telles quelles.
4. **⚖️🏛️ Les portes du tribunal et de la mairie, repensées — LIVRÉ, LE PLUS GROS DU LOT.**
   `COURT_DOOR_W` passe de 1 à 2 cases (nouvelle constante, `fermeConstants.js`) : le générateur
   perce désormais deux cases par porte au lieu d'une, sur le modèle EXACT des portails de haie de
   Valley Town (déjà à deux cases, déjà éprouvés) plutôt que d'inventer une seconde règle. Le
   rendu suit : `E.courtDoorGroups` (nouvelle fonction pure, `fermeEngine.js`) fusionne les cases
   contiguës d'une même porte pour dessiner UN chambranle pleine hauteur et UNE plaque — sans
   elle, deux cases auraient donné deux petites portes collées avec deux plaques superposées.
   Même fusion appliquée à `render-mairie.mjs` (banc de rendu), qui dessinait sa propre copie du
   chambranle. Élargir a débusqué deux meubles que le garde-fou des portes (`doorGuard`) s'est mis
   à refuser en silence (un fauteuil aux cellules, un cartonnier au cadastre — tous deux posés
   trop près de leur porte du temps où elle ne faisait qu'une case) : déplacés de quelques cases,
   sans toucher à la porte elle-même. `verify-vallee` 205/205, `render-mairie`/`render-tribunal`
   « tout est bon », zéro refus. ⚠️ **CE QUI N'A PAS ÉTÉ SENTI À LA MANETTE** : l'automatisation du
   déplacement a coincé en session (les touches fléchées scriptées cessaient de répondre après un
   moment sans qu'on sache pourquoi), donc la tolérance de centrage n'a été que CALCULÉE contre le
   modèle des haies, jamais MARCHÉE case par case dans le nouveau seuil. Vu à l'écran : un cadre
   fusionné, une plaque, un tapis de seuil sans couture au milieu — mais la sensation au clavier
   reste à confirmer par une vraie session de jeu.
5. **🎭 Les didascalies et les répliques du maire, styles distincts — LIVRÉ, SURGI EN COURS DE
   SESSION.** Guillaume, en regardant la scène : « styles différents entre ce que dit
   effectivement le maire et les didascalies / descriptions de son comportement ». Les deux
   vivaient dans LA MÊME chaîne à la main dans `fermeStrings.js` (`maire.ask`, `maire.tint`) —
   narration à la troisième personne puis réplique entre guillemets, affichées d'un bloc, même
   graisse, même couleur. **Aucun texte réécrit** : les deux registres sont déjà marqués par la
   ponctuation que le fichier porte depuis toujours (« » en français, `"…"` en anglais).
   `MayorLine` (nouveau composant pur, `MaireScene.js`) découpe chaque chaîne à cette ponctuation
   et applique deux styles CSS (`.maire-line-stage` italique et sourd, `.maire-line-say` normal et
   clair) — exactement le geste que `.maire-bubble-tint` faisait déjà pour la phrase du maire élu,
   étendu à l'intérieur de chaque bulle. Vu à l'écran sur le nœud `m1` : ça marche. **Pas rejoué
   sur les onze autres nœuds ni sur les cinq maires** — la regex est générique, mais seul `m1` a
   été vu au rendu.

⚠️⚠️⚠️ **LA PROCHAINE ACTION : JOUER L'AUDIENCE CHEZ LE MAIRE EN ENTIER JUSQU'À LA SIGNATURE, ET
CETTE FOIS EN SENTANT LES PORTES.** Rappel du chemin le plus court : menu dev (⌘⇧X) → ⭐ Star →
« 📐 Hand me the plans », puis « 🎩 An appointment with the Mayor, right now », puis
« Se téléporter → Mairie — l'étage », puis « 🎩 Stand at the Mayor's desk », puis **E**. En
marchant à pied (pas en téléportant) jusqu'au bureau, vérifier au passage : la nouvelle largeur de
porte se sent-elle vraiment plus généreuse ou seulement sur le papier ? le style
didascalie/réplique tient-il sur les douze nœuds et les cinq maires, ou seul `m1` avait cette
forme ? et une fois signé : les deux pastilles de compte à rebours ont-elles bien disparu au bon
moment (météore : à la chute ; maire : à la signature) ?

⚠️⚠️ **ET LA DETTE DU 479 N'A TOUJOURS PAS BOUGÉ : DEUX POSTES À DEUX QUI N'ONT JAMAIS ÉTÉ TENUS** —
le relais du plat (l'un cuisine, l'autre court) et les deux bords du cratère.

⚠️ **DÉCISION DE GUILLAUME, TOUJOURS EN VIGUEUR : LE BUG DU CHAUDRON-ARTÉFACT VISIBLE SUR 4 TERRES/5
N'EST PAS CORRIGÉ.** Le sprite scintillant (`FermeGame.js`) reste sans la garde `spec.key==="evil"`
que l'interaction a déjà. **Ne pas le corriger avant d'en avoir reçu l'ordre.**

⚠️⚠️ **UNE MESURE À PART, DEMANDÉE PAR GUILLAUME (« un ami qui joue sur tablette me dit qu'arcardi ne
fonctionne plus ») : LE CHIFFRE EST 1 829 CANEVAS 2D RETENUS AU CHARGEMENT** (2 722 créés,
2,6 millions de pixels), dont `townWater` **636** et `petFrames` **468** à eux deux. Le détail et ce
qu'il faut en faire sont au §10, « ce qui n'existe pas » — **ce n'est PAS corrigé dans cette
livraison** (règle du 424 : on ne mêle pas deux changements visuels), c'est mesuré et daté.

| Lot | Ce que c'est | État |
|---|---|---|
| 0 | La rivière | ✅ **CLASSÉ SANS SUITE — le défaut 1 de l'audit est FAUX.** On traverse à cheval depuis 2026-07 (`HORSE_WATER_SLOW`, `fermeConstants.js:619`), premier cheval 800 or. |
| 1 | Ce qui ment (textes, invité, HUD) | ✅ **LIVRÉ AU 478** — défauts 5, 6, 7, 8, 11, 13 |
| 2 | Le chantier naval devient un chantier | ✅ **LIVRÉ AU 478** — défaut 4 |
| 3a | La tenue devient une scène | ✅ **LIVRÉ AU 478** — défaut 2 ⚠️ *et sa lumière ne s'est jamais affichée : voir le préalable ci-dessus* |
| 3b | Les trois verbes distincts | ✅ **LIVRÉ AU 479** — défauts 3, 9, 10 |
| 4 | **La passe maire** | ✅ **LIVRÉE AU 480** — §16 de `QUETE.md`. ⚠️ **La FOURCHE DE FIN reste ouverte et RÉSERVÉE À GUILLAUME** : le navire part avec Eduardo (453), mais pour la **CALE** (il commerce) ou le **PONT** (il ramène des résidents) ? |
| 5 | Les sept sœurs | ⬜ en réserve, jamais obligatoire |

⚠️⚠️ **CE QUE LE LOT 4 A CHANGÉ, EN QUATRE LIGNES.** Le détail est au §16 de `QUETE.md`, qui a une
ligne par chose ; ici, seulement de quoi savoir quoi ne pas casser.
· **UNE ÉTAPE DE PLUS DANS LA CHAÎNE** : `starTimberBlock` rend `noMayor` tant que l'audience n'a
pas abouti, parce que **la cale est sur le quai municipal**. Le bandeau la désigne (`goal: mayor`
→ `townHall`). `verify-quete` la joue avec le VRAI résolveur, jamais avec un champ posé à la main.
· **LES PLANS NE SONT PAS UNE SERRURE** (décision de Guillaume) : on monte le voir les mains vides
et on peut gagner — mais sans aucun droit à l'erreur. C'est la seule vraie décision du chapitre.
· **LES ÉLECTIONS ONT ENFIN UNE CONSÉQUENCE DE JEU.** Les cinq candidats du 439 avaient un
portefeuille écrit en commentaire qui ne servait à RIEN ; il décide maintenant de la valeur de
chaque argument, et l'échéance du scrutin la déplace encore.
· **LA CONFIANCE EST UN CAPITAL QUI SERT LA FOIS SUIVANTE** (`e.mayor.trust`, 0 à 3) : c'est ce qui
oblige `maire.js` à être un **système de négociation** et pas une scène. Une commission ou le
cadastre s'y ajouteront en une table et zéro ligne de mécanique.

⚠️⚠️⚠️ **ET LA DETTE DU 479 N'A PAS BOUGÉ D'UN POUCE : DEUX POSTES À DEUX QUI N'ONT JAMAIS ÉTÉ
TENUS** — le relais du plat (l'un cuisine, l'autre court) et les deux bords du cratère. Écrits,
arbitrés par l'hôte, mesurés par `verify-quete` §12, **et jamais joués face à face**. Le 480 en
ajoute un troisième d'une autre nature : **une audience que personne n'a menée.**

État à jour du **zip 480**. La direction longue reste de **rendre Valley Town habitable au regard
ET crédible au jeu**, et **lui donner une histoire**. Tout ce qui concerne la ville, ses habitants,
ses bâtiments et **ses pièges** est dans **`components/ferme/README.md`**, qui fait autorité ; les
règles de DESSIN sont dans **`components/ferme/DESSIN.md`** ; les bancs dans **`tools/README.md`**.
**`candyluge` et `crystal` sont EN PAUSE.**

⚠️⚠️ **LA REFONTE DE LA QUÊTE DE L'ÉTOILE EST LE CHANTIER VIVANT, ET SON DOCUMENT DE REPRISE
EST `components/ferme/QUETE.md`. LIS SON BLOC D'AUTORITÉ 469 AVANT D'Y TOUCHER.** Ce qui reste :
cinq impacts qu'on FOUILLE, le grand cratère, l'étoile reine, le chantier naval. La liste de ce
qui manque est au **§15.3** ; le §16 décrit l'audience. ⚠️ **Le point 4 du §15.3 vient d'être
DÉBLOQUÉ** : les PNJ peuvent enfin parler du bateau, la condition qu'ils attendaient
(`MR.mayorSigned`) existe.

---

⚠️⚠️⚠️ **UN BANC QUI PASSE NE VEUT PAS DIRE QUE LA CHOSE EST BONNE — IL VEUT DIRE QU'ON MESURE
AUTRE CHOSE.** C'est la leçon la plus rentable du fichier, et elle a **sept** formes connues,
toutes payées :
- **il mesure la carte, pas l'interaction** (439 : « le seuil est bien une sortie, 9/9 » pendant
  que la touche E ne sortait pas) ;
- **il se donne un périmètre et excuse ce qui déborde** (439) ;
- **il repeint au lieu d'appeler**, donc il juge sa propre maquette (439) ;
- **il mesure l'inverse de ce qu'on veut** (438 : le « grain » pris pour de la qualité) ;
- **il mesure ce qu'une chose EST et jamais QUAND elle est** (448 : sept contrôles sur le cratère,
  aucun sur l'instant où il apparaît — *un banc de rendu ne peut pas voir un défaut de temps*) ;
- ⚠️⚠️ **il mesure une grandeur JUSTE sur un intervalle que le joueur ne regarde pas** (454 : la
  vitesse de la comète le long de tout son vol, alors qu'elle n'est à l'écran que sur les derniers
  22 % — deux contrôles verts, zéro effet visible) ;
- ⚠️ **il mesure DEUX réponses séparément et jamais leur ACCORD** (449). Le bandeau de la quête
  disait le chapitre, le chevron dérivait d'une autre liste : deux réponses à « où vais-je », les
  deux vertes, et personne n'avait eu l'idée de les comparer **parce qu'elles n'avaient jamais eu
  la même source**. La parade est celle du 444 : *une jointure, jamais deux listes.*
- ⚠️⚠️ **il mesure deux grandeurs qui S'OPPOSENT, chacune de son côté** (458, huitième forme, la
  sœur de la précédente en plus dangereuse). La glissade du cratère reprenait 3,2 cases/s quand la
  marche en montée n'en donnait plus que 2,34 : **le trou devenait infranchissable**, un MUR fait
  de vitesse. Aucun pas n'est refusé, donc `canStandTown` n'est jamais consulté et rien ne lève ;
  six contrôles étaient verts, tous justes, aucun ne calculait la DIFFÉRENCE. *Deux grandeurs qui
  se combattent se mesurent ensemble ou pas du tout.*
- ⚠️⚠️⚠️ **il invente ses IDENTIFIANTS et son cycle de vie d'état** (469, onzième forme, et
  c'est la plus chère jamais mesurée : **447 contrôles verts sur une quête bloquée**). Le banc
  jouait l'apprivoisement avec `"j1"` ; le jeu passe un `profile_id` de 36 signes. Le banc
  gardait un objet d'état ; l'hôte le re-migre à CHAQUE requête. Il fallait les DEUX écarts
  pour que la troncature de clé fusionne « la tenue » et « son départ » — donc aucun contrôle
  ne pouvait tomber. *Un banc qui invente ses données mesure un jeu que personne ne joue :
  on rejoue avec les vraies valeurs ET le vrai cycle de vie de l'état.*
- ⚠️⚠️ **il balaie une COURBE image par image et ne regarde jamais l'HORLOGE qui l'alimente**
  (468, neuvième forme, la sœur de la cinquième). Onze contrôles suivaient l'arrivée de l'étoile
  ms par ms — continuité, phases, tour complet, extrémités exactes — et ils étaient tous verts
  pendant que l'horloge qui la fait avancer pouvait rester figée **pour toujours**, bloquant la
  quête entière. Ils mesuraient ce que l'animation EST ; aucun ne mesurait **combien de temps elle
  a le droit d'attendre**. *Une fonction pure passe le banc ; c'est ce qui l'appelle qui casse.*
- ⚠️⚠️ **il passe lui-même le drapeau qui l'arrange** (458). `verify-quete` jouait le cratère avec
  `solo = true` et l'écoute des ombres avec `solo = false` — les deux seuls mondes où elles
  marchaient, pendant que le jeu passait la valeur inverse. *Un paramètre écrit en dur par le banc
  est une hypothèse que personne ne vérifie ; on balaie les deux valeurs.*
- ⚠️⚠️⚠️ **une discipline de banc ajoutée à UNE section ne protège que cette section** (472,
  douzième forme, et c'est la plus vicieuse parce qu'elle se déguise en leçon déjà apprise).
  Le 469 avait écrit noir sur blanc *« on rejoue avec les vraies données ET le vrai cycle de vie
  de l'état »* — et l'a appliqué au seul §fouille. Le §objectif, lui, appelle encore
  `starGoalKey` sur un état que personne ne re-migre : il n'a donc JAMAIS pu voir que l'hôte,
  qui re-migre à chaque requête, fait tomber le météore de Valley Town à la fermeture du
  chapitre 1. **Une règle de banc s'applique au banc ENTIER, ou elle ne s'applique pas.**
⚠️⚠️ **ET UN CONTRÔLE DE CAS NE VAUT PAS UN INVARIANT** (449). Trois contrôles « est-ce que ça
marche » étaient verts sur le placement du familier meneur ; l'invariant — *il n'est JAMAIS plus
loin du but que le joueur*, balayé sur toutes les positions — a échoué **20 fois sur 164** et a
sorti un vrai bogue. **Quand on peut énoncer une propriété, on la balaie ; on n'écrit pas trois
exemples.**
⚠️ **Quand Guillaume voit un défaut qu'aucun banc ne voit, la première question n'est pas « où est
le bogue » mais « quelle grandeur ne mesure-t-on pas ».** Les six dernières fois, la réponse tenait
en deux ou trois nombres qu'il a suffi d'ajouter.
⚠️⚠️ **ET REGARDER L'ÉCRAN RESTE LE SEUL MOYEN DE TROUVER CE QU'ON N'A PAS ENCORE COMPRIS** : six
bancs au vert n'ont pas vu dix défauts qu'une séance de vingt minutes a trouvés au 444, dont cinq
qui rendaient un lieu **inatteignable** — aucun ne mesurait l'**ARRIVÉE**. Ça s'est reproduit à
chaque zip depuis, 449 compris (le guide s'éteignait à chaque carte de chapitre : une garde qui
confondait un INSTANT avec un ÉTAT). Détail au **§25 de `components/ferme/README.md`**, la
meilleure page du dépôt sur ce que les bancs ne savent pas faire.

⚠️⚠️ **ET UN DÉFAUT MESURÉ, DOCUMENTÉ, PUIS LAISSÉ EN PLACE REVIENT TOUJOURS — PAR LA BOUCHE DE
GUILLAUME** (437, 439). La section « ce que ça ne fait pas » n'absout pas : c'est une **dette
datée**. **La première chose à faire en ouvrant un chantier est de relire celle du zip précédent.**

⚠️⚠️⚠️ **LE PIÈGE N°1 DU PROJET, ET IL A QUATRE VISAGES : CE QUI VIT DANS LA CLOSURE DE LA BOUCLE
DE RENDU.**
1. **Il plante** (430, 431) : une fonction déclarée dans la closure et appelée depuis le composant
   lève un `ReferenceError` **à l'exécution seulement** — ni le build, ni le lint, ni aucun banc ne
   le voient — et l'exception **emporte tout ce que la frame devait encore dessiner**. Mesuré à
   deux clients : 97 % d'images figées. On EXPOSE par un ref, on ne recopie jamais.
2. **Il fait vieillir** (436, 439) : un dessin qu'aucun banc ne peut appeler ne se dégrade pas,
   **il reste au niveau du jour où il a été écrit** pendant que tout ce qui est mesuré monte.
   *L'écart n'est pas un écart de soin, c'est un écart de DATE.* ⚠️ Corollaire : **« ce dessin
   est-il regardable par un banc ? » est une question de QUALITÉ**, et elle se pose avant le
   premier `fillRect`.
3. **Il divise** (439) : une même grandeur décrite des deux côtés de la closure DIVERGE. Le seuil
   de sortie de l'hôtel de ville était écrit dans le générateur *et* dans le composant ; seul le
   premier a été corrigé, et **on ne pouvait plus ressortir du bâtiment**. Voir §8.
4. ⚠️⚠️ **Il fait porter DEUX SENS au même nombre** (441). `pushE` classe par
   `wy − altitude × TOWN_ELEV_PX` : une ALTITUDE monte le dessin **et** recule le rang, ce qui est
   juste pour une terrasse — le 439 y a versé la flèche du dos d'âne des ponts, *or un dos d'âne
   monte sans éloigner*. **Le fermier a disparu sur toute la rangée nord des deux ponts pendant un
   zip entier**, sans qu'un seul banc puisse le voir. **Une grandeur de DESSIN, une grandeur de
   RANG, une grandeur de COLLISION : trois choses, trois paramètres.** Voir `tools/verify-pont.mjs`.

⚠️ **LES LEÇONS DES QUATRE DERNIERS ZIPS, EN UNE LIGNE CHACUNE. Le détail est à côté du code
qu'il décrit — les recopier ici les ferait vieillir en double.**

| # | La leçon, en une phrase | Où est le détail |
|---|---|---|
| hors-zip | ⚠️⚠️⚠️ **UN BANC QUI VÉRIFIE L'EMPRISE D'UN OUVRAGE NE VÉRIFIE PAS SON APPROCHE, ET C'EST UN ANGLE MORT DIFFÉRENT DE CELUI DU 467.** `verify-compo` garantit depuis longtemps qu'aucun arbre ni décor ne pousse SUR le tablier d'un pont ou du ponton — et c'était toujours vrai. Mais le semis de fleurs du quai (pas de 4) et le semis d'arbres de la ceinture ignorent tous deux l'existence du ponton (large de 4 lui aussi) et plantaient librement sur la rangée d'herbe juste au nord de son embouchure — jamais SUR l'ouvrage, toujours à son SEUIL. Deux objets bloquants, chacun sur une colonne de rive différente, resserraient l'entrée de 4 à 2 cases sans qu'aucun contrôle existant ne le voie. *Le nettoyage après coup du bloc du tribunal (467) protège une emprise ; il fallait le même geste pour un seuil.* | `nearPierMouth`, la garde `TOWN_PIER` dans le semis d'arbres, `fermeEngine.js` |
| 480 bis | ⚠️⚠️ **UN TABLEAU ANONYME INDEXÉ PAR UN COMPTEUR QUI GRANDIT NE PLANTE PAS QUAND ON OUBLIE DE L'AGRANDIR — IL REND `NaN`, EN SILENCE.** `[0.92, 1.05, 1, 0.96, 1.08][site.impact]` valait `undefined` dès le sixième impact, donc une échelle `NaN`, donc un cratère qui ne se dessine plus — sans la moindre exception à chercher, contrairement au piège n°1 habituel de ce fichier (une fonction absente, elle, lève une erreur). Trouvé en RELISANT avant d'ajouter, pas en jouant. *Un tableau littéral qui suit la longueur d'une table de données doit porter son NOM et sa GARDE (`|| 1`), jamais rester anonyme dans la boucle de rendu qui le lit.* | `STAR_FARM_CRATER_DRAW_SCALES`, `fermeConstants.js` |
| hors-zip | ⚠️⚠️ **UN MÉCANISME EXACT SANS AUCUN AFFICHAGE SE JOUE COMME UN MÉCANISME CASSÉ.** Les deux minutes de présence active qui déclenchent le gros météore (`STAR_TOWN_ACTIVE_MS`) étaient justes depuis toujours, et invisibles depuis toujours : aucun compte à rebours, aucune barre, rien qui dise au joueur qu'il progresse. Guillaume l'a signalé comme un bug (« semble ne jamais tomber ») alors que c'était un défaut de FEEDBACK, pas de logique. *Un mécanisme qu'on ne peut pas voir progresser est indiscernable, pour le joueur, d'un mécanisme qui ne marche pas.* | `starTownActiveRef`, `.ferme-wait-pill`, FermeGame.js |
| hors-zip | ⚠️⚠️⚠️ **UN REPLI ANTI-`NaN` DANS UNE FONCTION MIROIR (GAUCHE/DROITE PAR UN PARAMÈTRE `side`) QUI OUBLIE DE MULTIPLIER PAR `side` CASSE UN SEUL CÔTÉ, ET SEULEMENT QUAND LA CIBLE TOMBE DANS LE CAS DÉGÉNÉRÉ.** `solveArm` mirroir le bras gauche du droit sur tout son calcul SAUF sur son repli (produit vectoriel presque nul), qui retombait sur +X MONDE en dur — le côté du bras DROIT, appliqué de temps en temps au bras GAUCHE. D'où le « parfois » signalé par Guillaume plutôt qu'un défaut systématique qu'une seule pose aurait suffi à voir. *Un invariant tenu partout dans une fonction doit être vérifié aussi dans son cas limite, pas seulement dans son chemin normal.* | `solveArm`, `maireBureau.js` |


## 0. L'objectif de Guillaume — ce à quoi tout se mesure

**Une soirée de jeu entre amis, à deux ou trois, qui donne envie d'y revenir.** Arcardi n'est
pas une plateforme : c'est un salon qu'on ouvre un vendredi soir avec un code partagé. Tout
arbitrage se fait contre ce chiffre — **2 joueurs, occasionnellement 3**.

1. **La qualité avant le nombre.** 22 jeux existent ; ce qui compte est qu'un jeu donné soit
   *fini*. Depuis le 421, l'exigence est explicitement **AAA**.
2. **Le monde partagé est le cœur.** La ferme est un lieu qu'on habite ; les mini-jeux sont des
   portes qui s'y ouvrent, jamais des applications séparées.
3. **Rien ne doit casser pour les autres.** Le multijoueur est fragile et gratuit (§3).

---

## 1. Le projet

Next.js 14 (App Router, **JavaScript pur, pas de TypeScript**) + Supabase (auth, Postgres,
Realtime) + Vercel. Salons à code partagé, 22 jeux, scores synchronisés.

**La ferme** (`GAME_ID = "ferme"`) est un monde partagé persistant, ~99 % du trafic réseau.
**Valley Town** en est la seconde carte, multijoueur, atteinte par le train ; **l'intérieur du
tribunal** en est la troisième. **`candyluge`** est une descente 3D solo en three.js.
**`crystal`** est un jeu narratif solo à rastériseur logiciel.

---

## 2. Travailler avec Guillaume

- **Avant toute production créative, poser des questions.** C'est la consigne la plus souvent
  oubliée. Pour tout changement important, **LISTER les décisions structurantes et ATTENDRE**.
- **Il aide volontiers si on demande** (il a installé `node` en cours de session au 425).
  **Demander tôt plutôt que de contourner.**
- ⚠️ **NE PAS SAISIR SES IDENTIFIANTS**, même proposés. Ils ne débloquent d'ailleurs rien en
  local : le Supabase local est factice (§10).
- **Ne pas mêler deux changements visuels dans la même livraison** (décision du 424) : il ne
  peut plus juger lequel a produit quoi.
- **Commentaires systématiques** partout où il y a un *pourquoi*, une hypothèse écartée, un
  piège — avec le numéro de zip. C'est la mémoire longue du projet.
- **« caveman on »** inverse le contrat : exécuter, vite et bien, sans questions ni
  préambule. « caveman off » rétablit. Accuser réception en une ligne.
- ⚠️⚠️ **FIN DE LIVRAISON : METTRE CE FICHIER À JOUR FAIT PARTIE DE LA LIVRAISON, ÇA NE SE
  PROPOSE PAS** (ordre de Guillaume au 449 : « à toujours opérer quand tu finis un delivery »).
  La formulation d'avant disait « sur demande », et c'est ce qui a fait proposer au lieu de faire.
  ⚠️ **Dans cet ordre** : (1) réécrire le bloc **⏭️ REPRISE** en tête — il se REMPLACE, il ne
  s'empile pas, et il désigne UNE action suivante ; (2) faire la passe d'élagage du §14.2 **avant**
  d'ajouter quoi que ce soit ; (3) n'inscrire que la **LEÇON** d'un défaut, jamais son histoire —
  celle-ci va en commentaire de code avec le n° de zip, ou dans le README du module concerné.
  **Commits et push restent à
  Guillaume** (GitHub Desktop). **Dire si une manipulation Supabase est nécessaire — et le dire
  aussi quand elle ne l'est pas.**
- **Règle dure : aucune migration SQL ni changement de schéma sans validation préalable.**

| Quoi | Où |
|---|---|
| Récit d'une étape | **en tête du README** |
| Le *pourquoi* d'une ligne, un piège local | **commentaire de code**, avec le n° de zip |
| Objectif, contraintes, pièges globaux, avancement | **ce fichier** |

Jamais de fichier de doc autonome à la racine (`AUDIT-X.md`, `NOTES.md`…).

---

## 3. Contraintes réseau — avant de toucher au moindre `send()`

- **L'hôte est l'autorité, toujours.** L'invité émet un `req`, l'hôte arbitre, rediffuse un
  `apply`.
- **Plafond dur de 10 messages/s par client** (`eventsPerSecond`). Dépassement
  **silencieux** ; depuis le 419 un `console.warn` le signale.
- **Facturation** : 1 broadcast = 1 message + 1 par client abonné. **Seul le nombre de
  `send()` compte, jamais la taille des payloads.**
- **La ferme est le seul canal en `self:false`** ; écho local à la main (`broadcastChat`).
- **Ne jamais comparer une horloge hôte à une horloge invité.** Dater à la réception.
- **Quota : 2 M messages/mois, plan gratuit**, déjà dépassé une fois — d'où
  `lib/realtimeQuota.js`.
- ⚠️ **CE QUI PEUT SE DÉDUIRE NE SE DIFFUSE PAS.** L'altitude d'un joueur en ville se lit
  sous ses pieds ; son ÉTAGE dans le tribunal se lit dans son `y` (§6). Un champ de plus,
  c'est surtout un champ à réconcilier.

---

## 4. Pièges invisibles — les casser ne produit aucune erreur

⚠️⚠️ **CE CHAPITRE A ÉTÉ SCINDÉ AU 431, SUR L'ORDRE LAISSÉ PAR LE §14.2 DU 430.** Les pièges
de la FERME, de la VILLE et du TRIBUNAL sont partis dans **`components/ferme/README.md`**, qui
fait déjà autorité sur ce code — ils y sont **à côté de ce qu'ils décrivent**, et ce chapitre
avait atteint cent lignes en mélangeant deux sujets sans rapport. ⚠️ **Il a été scindé DEUX fois
depuis** — le DESSIN au 441 (`components/ferme/DESSIN.md`), le GÉNÉRATEUR au 449
(`components/ferme/README.md` §15 bis). Il ne reste ici que ce qui est vrai à l'échelle du
projet : la **CONCEPTION**, et le **LANGAGE** (JavaScript, three.js, canevas).

⚠️ **UN PIÈGE A ÉTÉ SUPPRIMÉ PLUTÔT QUE DÉPLACÉ, ET C'EST LE POINT DE LA VÉRIFICATION** : « la
boucle de nuages tourne à vide (`SKY_CLOUD_COUNT: 0`) » ne correspondait plus à rien — le
symbole n'existe nulle part dans le dépôt. Le §14.2 le disait : *un piège périmé recopié
ailleurs est pire qu'un piège supprimé.*

⚠️⚠️ **ET UN SEUL EST RESTÉ ICI BIEN QU'IL PARLE DES CARTES, parce qu'il a été payé QUATRE
fois** (425, 427, 430, 431) et qu'il touche l'architecture entière : **DEUX CARTES SANS REPÈRE
COMMUN FINISSENT PAR SE MÉLANGER, et ça ne se voit que quand la plus petite ne tient plus dans
la grande.** Dernière occurrence au 431, la plus chère : le rectangle du marché de la VILLE
tombe aussi au milieu des champs de la FERME, donc le contrôle « je suis au marché » passait
depuis un pré. **La parade est UNE position taguée par sa zone, jamais deux jeux de
coordonnées — et on teste la zone AVANT les distances.**

**Dessin — voir `components/ferme/DESSIN.md`**

⚠️⚠️ **CE BLOC EST PARTI AU 441, SUR L'ORDRE DU §14.2 DU 440 (reporté deux fois).** Les treize
règles de dessin — on assemble des masses et on ne texture pas une silhouette, une courbe `f(x)`
ne se replie pas, la période prime sur les détails, une position réglée à la main penchera, un
cerne sert aussi sur fond clair, un sprite haut contre le mur du fond avale ce qui passe
devant… — vivent désormais **à côté des dessins qu'elles gouvernent**. Rien n'a été recopié.
⚠️⚠️ **ET LA PHRASE QUI SUIVAIT ICI EST DEVENUE FAUSSE AU 449, PAR LE DÉPLACEMENT SUIVANT.** Elle
disait que « la case d'un décor n'est pas la surface qu'il couvre » restait ici parce que c'est une
règle du GÉNÉRATEUR et non du dessin — vrai au 441, périmé depuis que le générateur est parti à son
tour au §15 bis de `components/ferme/README.md`. *Un déplacement laisse toujours derrière lui une
phrase qui explique pourquoi quelque chose n'a pas bougé ; c'est elle qu'il faut relire en dernier.*


**Conception — vrai partout**

⚠️⚠️ **LES CINQ PIÈGES DU GÉNÉRATEUR SONT PARTIS AU 449, SUR L'ORDRE DU §14.2 DU 444** (reporté
quatre fois) : la case d'un décor, la liste noire, la passe qui pave, le second de quelque chose,
la variante de décor. Ils décrivent tous `generateTownWorld` et vivent désormais **à côté de lui**,
au **§15 bis de `components/ferme/README.md`** — même geste qu'au 431 (les zones) et au 441 (le
dessin). ⚠️ **Rien n'a été recopié, et un DOUBLON a été supprimé** : « une variante de décor est
une couche » était écrit deux fois dans ce chapitre, une fois court et une fois long.
⚠️ **Ce qui suit est resté exprès** : ce ne sont pas des règles de générateur, ce sont des règles
de conception qui valent pour n'importe quel morceau du dépôt.

- ⚠️⚠️ **UNE GRANDEUR DE DESSIN NE DOIT PAS ENTRER DANS LA COLLISION** (439). L'arc du pont ajouté
  à `playerElevTown` aurait été trois lignes plus court et aurait rendu les deux ponts
  **infranchissables** (`canStandTown` refuse tout pas au-delà de `TOWN_STEP_MAX`) : on aurait
  livré un mur en croyant dessiner une bosse, et le symptôme n'aurait ressemblé en rien à sa cause.
  Deux fonctions qui se ressemblent assez pour qu'on les confonde doivent porter la différence
  dans leur NOM, et un banc doit tenir les deux moitiés séparément.
- ⚠️⚠️ **UN PANNEAU QUI S'OUVRE À VOLONTÉ NE DOIT RIEN DONNER** (439). Un dialogue, un tableau, une
  plaque s'ouvrent avec E sans limite et sans arbitrage de l'hôte : tout ce qu'ils rendent doit
  être de l'INFORMATION ou une valeur DÉRIVÉE (une date, un cours). Ce qui récompense passe par une
  `req` arbitrée par l'hôte, comme la vente au marché. *La porte n'est jamais la caisse.*

**JavaScript / three.js / canevas**
- ⚠️⚠️⚠️ **UNE FONCTION DÉCLARÉE DANS LA CLOSURE DE LA BOUCLE DE RENDU N'EXISTE PAS POUR LE
  COMPOSANT** — payé au 430 (`tryTownJump`, saut de rebord mort) puis au 431
  (`canStandTown` appelée par `advanceRemote`, Valley Town injouable à deux). Le hissage des
  déclarations s'arrête à la fonction qui les contient ; l'appel depuis l'extérieur lève un
  `ReferenceError` **à l'exécution seulement**, donc ni le build, ni le lint, ni aucun banc ne
  le voient. Et l'exception ne s'arrête pas là où elle tombe : **elle emporte tout ce que la
  frame devait encore dessiner.** ⚠️ La parade est de PUBLIER la fonction dans un ref réassigné
  à chaque montage de la boucle (`townJumpApiRef`, `zoneCollideRef`) — jamais d'en écrire une
  seconde copie au niveau du composant, qui divergerait au premier réglage.
  ⚠️ **Corollaire de repli** : quand la carte d'une zone manque chez ce client, un test de
  collision doit ACCEPTER, pas refuser. Refuser épingle l'entité distante à sa dernière
  position connue — c'est-à-dire qu'on reproduit le bogue au lieu de le corriger.
- ⚠️⚠️ **UN MOTIF DE SOL SE JUGE ASSEMBLÉ, ET SA PÉRIODE COMPTE PLUS QUE SES DÉTAILS** (434).
  Une tuile de 16 px se répète tous les 16 px : l'œil voit la grille avant le dessin, **quelle
  que soit sa finesse**. On dessine un pavé de 4×4 tuiles d'un seul tenant et on y découpe la
  case (`x % 4`, `y % 4`). ⚠️ Il doit **boucler sur lui-même** (toute forme peinte aussi à −N
  et +N), sinon on a déplacé la couture de 16 à 64 px — et une couture tous les quatre
  carreaux dessine une SECONDE grille, pire que la première.
- ⚠️⚠️ **`chaîne.replace("X", …)` NE REMPLACE QUE LA PREMIÈRE OCCURRENCE.**
- ⚠️⚠️ **UN `useProgram` QUI ÉCHOUE NE DÉLIE PAS LE PROGRAMME PRÉCÉDENT** : un shader qui ne
  compile pas fait dessiner l'objet SUIVANT avec les mauvais attributs. **Seul indice :
  `INVALID_OPERATION: program not valid` dans la console.**
- ⚠️⚠️ **UN `const` DE HAUT NIVEAU N'EST PAS UNE PROPRIÉTÉ DE `window`.** Tester avec
  `typeof X !== "undefined"`.
- ⚠️⚠️ **UN CANEVAS DÉCOUPE EN SILENCE CE QUI DÉPASSE DE SON CADRE** (427) : une feuille de
  personnage fait 16×24 par pose, un chapeau posé au-dessus de y=0 sort décapité, et rien ne
  le dit. Le banc de rendu l'a montré, la relecture non.
  ⚠️⚠️ **PAYÉ TROIS FOIS DANS LE SEUL ZIP 433** — l'enseigne de toit du taxi en trois quarts,
  le drapeau de la mairie, le liseré des oiseaux. C'est le piège le plus répétitif du projet
  parce qu'il ne coûte RIEN sur le moment : le dessin est joli, il manque juste deux rangées
  que personne ne cherche. **Deux parades, et la seconde est la vraie :** dimensionner le
  canevas à partir de ce qui dépasse (le fuyant d'un trois-quarts se retrouve en HAUT, donc le
  canevas fait `24 + DROP`), et **dessiner serré, RECADRER, PUIS cerner** — cerné dans son
  cadre juste, le liseré d'un sprite qui touche le bord est lui-même découpé (`padOutline`).
  ⚠️ Un banc peut l'attraper en une ligne : aucun pixel peint sur le bord du canevas.
- ⚠️⚠️ **`ctx.fillText` N'EST PAS RASTÉRISABLE HORS NAVIGATEUR** (427) : un nom cuit dans un
  sprite fait planter `tools/render-*.mjs`, c'est-à-dire qu'on perd le seul moyen de REGARDER
  ce dessin. Les textes des bâtiments s'écrivent VIVANTS, au rendu — ce qui les rend en plus
  bilingues, ce qu'un sprite baké ne peut pas être. Idem `translate`/`rotate` : le faux canvas
  les ignore, un sprite qui en dépend se juge faux.
- ⚠️ **TEINTER UN SPRITE AVEC UN `fillRect` DESSINE UNE BOÎTE.** Un sprite est transparent
  partout sauf sur lui-même ; l'assombrir passe par `ctx.filter` (et il FAUT le remettre à
  `"none"`, c'est un état du contexte). ⚠️ Même famille au 427 : teinter un VÊTEMENT ne se
  fait pas en repeignant la feuille (on colorerait la peau et les cheveux), mais en
  repeignant les blocs du vêtement à leurs coordonnées exactes.
- ⚠️⚠️ **`Array.prototype.sort` EST STABLE, MAIS UN ORDRE DE DESSIN NE SE FONDE PAS DESSUS**
  (431). Les files de rendu du projet trient par ancrage au sol ; deux éléments à la même
  hauteur gardent donc leur ordre d'insertion — jusqu'au jour où l'on réorganise une boucle,
  sans rien casser de visible ailleurs. Ce qui doit passer devant le dit avec un epsilon.
- ⚠️ **`stopPropagation` N'ARRÊTE PAS LES AUTRES ÉCOUTEURS DE LA MÊME CIBLE** (il faut
  `stopImmediatePropagation`).
- ⚠️ **UN EFFET À BOUFFÉES NE S'ÉTEINT PAS EN METTANT SON TAUX À ZÉRO.**
- ⚠️ **`*/` DANS UN COMMENTAIRE DE BLOC LE FERME** — `COURT_STAIR_*/COURT_LINKS` a cassé le
  build du 426. Les commentaires denses de ce projet en sont friands.
- **`Pix.rng(graine)` rend un générateur INDÉPENDANT** (`pix.js:40`).
- **`crystal` n'affiche AUCUNE image** : tampon 480×270 toujours opaque.
- **La caméra de `walk` est 2,6 unités DERRIÈRE le personnage.**
- **Rendre un objet invisible ne le retire pas du monde.**

---

## 5. Carte du territoire

| Fichier | Rôle |
|---|---|
| `components/ferme/FermeGame.js` | tout le jeu ferme + Valley Town + tribunal — **~20 500 l.** |
| `components/ferme/fermeEngine.js` | règles pures · `generateTownWorld()` · `generateCourtWorld()` · `townSpots()` · **`townNav()` / `townFindPath()`** · **`townRoadNav()` / `taxiStep()`** · **`townFlocks()` / `flockStep()`** |
| `components/ferme/quete.js` | **LA QUÊTE DE L'ÉTOILE : table, chronologies et résolveurs purs.** ⚠️ **469 — la FOUILLE (`STAR_DIG_MS`, `starDug`, `resolveStarDig`, `starDigResult`) et TROIS chapitres au lieu de cinq.** `STAR_FARM_IMPACTS` porte les cinq cratères (2 étoiles / 1 matière / 2 vides), `resolveStarCalm` tient le barème 60/10 s et `resolveStarTownFall` sépare le gros météore. `STAR_FOLLOWER_SITES` dérive toutes les compagnes de `content:"star"`, `starFollowerAdded` identifie celle qui doit jouer son arrivée, `starFarmFlightPath` tient le cap stable des fragments et `queen` désigne l'unique reine. Le reste des chapitres 444–460 demeure techniquement présent mais sa fiction de chant et sa plongée sont obsolètes. Aucun React, aucun dessin — `verify-quete.mjs` l'importe. |
| `components/ferme/maire.js` | **L'AUDIENCE CHEZ LE MAIRE (480) : la table des battements et les résolveurs purs.** Douze nœuds, cinq actes, cinq familles d'argument, la jauge d'adhésion qui FUIT, l'élan, la rejouabilité côté hôte (`mayorReplay` : le client envoie sa TRANSCRIPTION, l'hôte la rejoue). Aucun React, aucun dessin — `verify-maire.mjs` l'importe. ⚠️ **C'est un système de NÉGOCIATION, pas une scène** : la confiance gagnée sert les audiences futures, donc une commission ou le cadastre s'y ajouteront en une table de plus. |
| `components/ferme/MaireScene.js` | **la VUE de l'audience — le seul morceau de 3D du monde partagé.** Écran PLEIN, à la PREMIÈRE PERSONNE, caméra libre dans la pièce, bulles projetées, réponses en jaune, **mode spectateur** (`MayorWatch`), repli plat si WebGL manque. ⚠️ Il porte `mayorCtxOf`, **la fonction de contexte que le CLIENT et l'HÔTE appellent tous les deux** : leur accord est une propriété du code, pas une coïncidence. |
| `components/ferme/maireBureau.js` | **LE BUREAU DU MAIRE, EN CODE (481).** La pièce entière (parquet, boiseries, pilastres, fenêtre sur la place, bibliothèque, buste, lustre, porte qui claque), le meuble et ses objets — *chacun est une réplique de l'arbre* —, et le maire : sept postures, huit visages, sourcils/paupières/bouche, cinématique inverse des bras. ⚠️ **PROCÉDURAL, comme `fermeArt.js` mais en 3D** : aucun fichier à charger, textures peintes au canevas 2D, `THREE` passé en paramètre (jamais importé — deux copies de three.js dans une page ne ressemblent à rien). ⚠️ Rien n'y vit dans la closure de la boucle de rendu : `buildOffice` rend un objet, `applyPose`/`applyFace`/`solveArm` sont des fonctions de module. |
| `components/ferme/QUETE.md` | **le chantier 444 : déroulé, grammaire magique, avancement, ET CE QUI RESTE À FAIRE (§12) — autorité tant que la quête n'est pas finie** |
| `components/ferme/README.md` | **Valley Town, le tribunal, l'HÔTEL DE VILLE, l'ÉGLISE, le BEFFROI, les habitants, la VENTE, les OISEAUX, les ÉLECTIONS et les PIÈGES de ces zones — autorité (428-444)** |
| `components/ferme/DESSIN.md` | **les règles de DESSIN, vraies partout — autorité (441, sorties du §4)** |
| `tools/README.md` | **les bancs, ce qu'ils attrapent et leurs chiffres — autorité (432-439)** |
| `components/ferme/fermeConstants.js` | réglages · **tous les `TOWN_*`, `COURT_*`, `WARDROBE_*`, `TOWN_STALL_TRADES`** · depuis le 440 il **importe `planche.js`** : une portée de pont et une emprise de décor sont des grandeurs de DESSIN, on les dérive du sprite au lieu de les recopier |
| `components/ferme/planche.js` | **GÉNÉRÉ** par `tools/import-planche.mjs` — les sprites de la planche de Guillaume, en données. Ne pas éditer à la main |
| `components/ferme/fermeArt.js` | **tous** les sprites, en canevas procédural. `starWispColors` décline le vivant en jaune, bleu et rose ; `drawStarFragmentMeteor` fait tourner le petit caillou incandescent sur un centre stable et `drawStarFragmentImpact` dessine son choc de terre/poussière/braises, sans réutiliser la boule de feu de Valley Town. Les gros dessins de quête (`drawStarCrater`, comète, navire, jauge, poses) vivent ici pour rester regardables par les bancs. |
| `app/room/[code]/page.js` · `lib/gameSync.js` · `lib/realtimeQuota.js` | salon · synchro · quota |
| `public/candyluge/README.md` | **la dette et les 18 règles de la luge — autorité (427)** |
| `public/candyluge/js/` | `config.js` (tous les nombres) · `slope.js` (la piste) · `sled.js` · `world.js` |
| `public/vendor/three-r128/` | three.js r128 + GLTFLoader + EffectComposer, en local |

⚠️ **`scenes.js` contient 2 tableaux, `shots.js` en contient 7**, sur un `backdrop()` COMMUN.
**Lecture de `FermeGame.js` : étroit mais profond.** `grep` sur le symptôme, lire largement
autour, chercher les autres usages du symbole avant d'éditer.

---

## 6. Valley Town, le tribunal, les habitants — **voir `components/ferme/README.md`**

⚠️ **CE CHAPITRE A ÉTÉ SORTI D'ICI AU 428**, sur l'ordre laissé par le §14.2 du 427 et sur le
modèle de `candyluge` : il fait autorité **à côté du code qu'il décrit**. Un chapitre qui
grossit à chaque zip n'a rien à faire dans le fichier qu'on relit avant de travailler sur
autre chose. On n'en garde ici que l'orientation ; les pièges qui valent pour TOUT le projet
restent en §4, et rien n'est recopié aux deux endroits.
⚠️ **DEPUIS LE 431 IL PORTE AUSSI LES PIÈGES DE LA FERME, DE LA VILLE ET DU TRIBUNAL** (§15
là-bas), sortis de §4 sur l'ordre du §14.2 — et il décrit la vente, qui n'existe plus qu'au
marché (§14 là-bas).

**Ce qu'il faut savoir sans ouvrir le fichier :**

- **Carte 224×168**, graine fixe, **jamais persistée** — donc on peut tout refaire d'un bloc,
  sans migration.
- ⚠️ **L'ALTITUDE EST UNE PROPRIÉTÉ DE LA CASE** (`elev`), et **l'étage du tribunal se DÉDUIT
  de `y`**. Deux applications de la même idée : rien ne circule sur le réseau, rien à
  réconcilier.
- ⚠️ **UN RÉSIDENT A UNE ZONE, PAS DEUX POSITIONS** (`res.zone` + `res.x/y`). C'est la seule
  forme qui résiste au piège des deux cartes (§4).
- ⚠️⚠️ **LE 428 A INVERSÉ UNE DÉCISION DU 427** : les résidents ont un **vrai chemin**
  (`E.townFindPath`), pas un itinéraire d'escalier. Mesuré : **24 % → 100 %** d'arrivées, à
  coût réseau **strictement identique**. `townStairRoute` a été supprimée.
- ⚠️ **LA MAIRIE ET LE TRIBUNAL SE PARTAGENT UNE GRILLE ET NE SE PARTAGENT PLUS LEURS SERVICES**
  (439) : la mairie est ce qu'on DEMANDE, le tribunal ce qui se TRANCHE. Avant, quatre services
  étaient promis deux fois, mêmes emojis compris.
- ⚠️ **LES ÉLECTIONS SONT UNE PURE FONCTION DU JOUR, ET LE VIVIER DE CANDIDATS EST FIXE** — pas
  le roster, sinon accueillir un résident rerollerait le maire, y compris rétroactivement.
- **Ce qui n'est pas fait** : deux guichets ouverts seulement (la salle des cours et l'accueil),
  pas de coiffeur au salon, aucun résident n'ENTRE dans les deux bâtiments, pas d'intérieur de
  maison, la prairie nue (chiffre compté par `verify-vallee`), et les **commissions / rendez-vous
  datés sont décidés mais pas construits**.

---

## 7. `candyluge` — en pause depuis le 425

**Toute sa dette est passée dans `public/candyluge/README.md` (zip 427), qui fait autorité :**
les 18 « choses à ne pas défaire », les 5 chantiers non faits (⚠️ le n°1, la luge qui dérive
seule, rend la descente impraticable sans le menu dev), le bonbon empoisonné à concevoir, et le
mur de chantier (⌘⇧X deux fois en moins de 3,5 s). Rien n'en est recopié ici : un jeu à
l'arrêt n'a pas à occuper le fichier qu'on relit pour travailler sur autre chose.

---

## 8. Qualité d'image — la méthode

**Réduire la référence à 480×270, mesurer, comparer, corriger, re-mesurer. On ne juge pas au
ressenti.** ⚠️ **ET LA STATISTIQUE QUI COMPTE N'EST PAS LA MOYENNE** : au 421 la luminosité
moyenne était juste et l'image fausse — **pas un pixel sous L60**, donc aucune ombre. Il faut
un **écart**, pas un décalage. (Référence : L 180,6 / **écart-type 47,7** / saturation 27,8 % /
2,1 % sous L60.)

⚠️⚠️ **LA LEÇON LA PLUS COÛTEUSE, ET ELLE EST GÉNÉRALE : un paramètre qui DOUBLE un autre
paramètre est une divergence en attente. Il doit être DÉRIVÉ, jamais réglé.**
En place : `Slope.finishSAt()`, `Slope.cpEvery()`, `Models.fit()`, `trailTint()`,
`COURT_STAIRWELLS`, la couleur des étals.

⚠️ **Fausses pistes MESURÉES, ne pas les refaire :** monter le dégradé du ciel de crystal ·
doubler `BLOOM_H`/`BLOOM_K` (**ne pas y toucher**) · compenser le linéaire en montant les
intensités « au jugé » (soleil à 2,45 → image **entièrement blanche** ; repère : neige au
soleil ≈ **1,15 linéaire**, à l'ombre ≈ **0,40**) · peindre des veines cyan sur la piste rose
(le mélange passe par le **gris** ; la sortie est dans la VALEUR) · deux couleurs réglées à
l'œil côte à côte ne gardent pas leur écart une fois le rendu passé en linéaire.

**Côté `crystal`, NON PROPAGÉ :** `Flora.canopy` n'est appelée que par `walk.js` ; `corniche`
et `pont` sont **bit à bit identiques** au 419.

---

## 9. Blender — cinq pièges, et un endroit où il ne paie pas

⚠️⚠️⚠️ **LE 443 A LEVÉ UN INTERDIT DE PRINCIPE : UN ASSET BITMAP EST DÉSORMAIS AUTORISÉ**
(décision de Guillaume). Jusqu'ici « aucune image dans le jeu » était une **règle** ; c'est
maintenant un **défaut**. Un décor complexe — typiquement un intérieur isométrique — peut être
modélisé sous Blender et intégré en **PNG / feuille de sprites** quand c'est le moyen le plus
pertinent d'obtenir le résultat visé.
⚠️ **Ce n'est ni une norme ni un passage obligé.** Le canevas procédural de `fermeArt.js` reste
la voie par défaut partout ailleurs et n'est pas en sursis : les deux approches **coexistent**,
l'arbitrage se fait **au cas par cas**, module par module, contre le §0 (est-ce que ça rend le
jeu plus fini ?) et non contre une doctrine.
⚠️⚠️⚠️ **LE PIPELINE C A EU SON PREMIER USAGE AU 480, ET IL A ÉCHOUÉ — C'EST LA LEÇON LA PLUS
CHÈRE DU 481.** Le bureau du maire a été bloqué sous Blender et exporté en glTF ; le fichier est
arrivé dans le dépôt avec ses nœuds `rig_*` doublement décalés, il a été chargé par le jeu, décrit
sur deux lignes de documentation, et **jamais ouvert dans un canevas pendant un zip entier**. Le
maire flottait deux mètres derrière le mur du fond. **Aucun outil du dépôt ne pouvait le dire** :
un glTF est de la DONNÉE, `verify-syntax` lit du JavaScript, le bundle lit des imports, et les
bancs de rendu appellent du CODE. Le bureau est aujourd'hui procédural (`maireBureau.js`).
⚠️ **CE QU'IL FAUT EN RETENIR AVANT LE PROCHAIN IMPORT** : le §9 disait qu'un asset importé
« vieillit » ; il peut aussi **naître faux**, et c'est pire, parce qu'on croit avoir livré. *Un
asset importé se REGARDE le jour de sa livraison, dans le jeu, ou il n'est pas livré.* Le
chargeur, le cache, la convention de nommage et le banc que le premier usage devait poser n'ont
jamais été posés — le chantier reste donc entier.

⚠️ **Ce que le basculement ne change PAS, et qu'il faut lire avant d'ouvrir Blender :** les
raisons TECHNIQUES du choix procédural restent vraies et se paient toujours — un bitmap apporte
un chargement, un cache, une palette hors-fichier, une échelle à tenir, et **il sort du champ
des bancs de rendu** (`tools/render-*.mjs` appellent du code, ils ne relisent pas un PNG : un
asset importé ne se dégrade pas, il **vieillit**, exactement comme le §« il fait vieillir » de
l'en-tête). ⚠️ Et il reste **irrecevable là où le dessin doit être bilingue ou vivant** (§4 :
un texte cuit dans une image ne peut pas être traduit au rendu). Le prix n'a pas disparu ; il
est simplement devenu **payable** quand le résultat le vaut.

BlenderMCP est installé (Blender 5.2 LTS) et **répond**. Trois pipelines : **A** vers `crystal`
(on modélise, on rend, on **transcrit en table de données** — pas d'image dans `crystal`, dont
le tampon 480×270 n'en affiche aucune ; ombrage plat pur, **aucun** anticrénelage, quantification
LINÉAIRE, courbe `Standard`, lampes Soleil) ; **B** vers les jeux three.js en glTF
(`candyluge_props.py`, hors dépôt, export sans matériaux, maillages `part_<clé>`, 200-900
triangles) ; **C, ouvert au 443** — rendu Blender → **PNG / feuille de sprites** chargé par le
jeu. ⚠️ **C n'existe encore nulle part dans le dépôt** : il est autorisé, il n'est pas construit
(ni chargeur, ni cache, ni convention de nommage, ni banc). Le premier usage devra les poser —
c'est un chantier, pas un import.

⚠️ **BLENDER EST Z-UP, THREE.JS Y-UP, ET L'EXPORTEUR CONVERTIT FIDÈLEMENT UNE ORIENTATION
FAUSSE** (`yup_authoring()`).
⚠️ **L'export glTF EXIGE un contexte** (`temp_override(…, area=VIEW_3D, region)`) **et de
désélectionner** — sinon échec au **deuxième** accessoire seulement.
⚠️ **L'échelle se DÉRIVE du gabarit** (`Models.fit`), jamais devinée dans l'appelant.
⚠️⚠️ **À 32 px, ce qu'on achète avec Blender est l'ÉCLAIRAGE, PAS LA GÉOMÉTRIE** — et cet
éclairage demande la même passe de calibrage que §8. Mesuré au 426 sur la statue de la Justice :
le pipeline fonctionne, mais après deux passes le rendu restait à **écart-type 24,6** contre
47,7 en référence. Le sprite dessiné à la main était meilleur. Compter plusieurs itérations, ou
dessiner à la main.
⚠️ **Tous les sprites de la ferme, de Valley Town et du tribunal sont, à ce jour, des canevas
procéduraux** dans `fermeArt.js` — c'est un **état**, plus une règle depuis le 443. Le coût d'y
introduire un bitmap est celui décrit en tête de chapitre ; il se juge contre le gain visuel du
décor visé, et **le mesurer d'abord reste la méthode** (§8) : un rendu Blender non calibré perd
encore contre un sprite dessiné à la main.

---

## 10. Vérification

⚠️ **`node` EST INSTALLÉ (v24, npm 11), `npm install` est fait.** On peut **bâtir et jouer**.

⚠️⚠️ **NE JAMAIS LANCER `npx next build` PENDANT QUE `npm run dev` TOURNE.** Les deux écrivent
dans le MÊME `.next/` : le navigateur reçoit des **404 sur les chunks**, la page se charge, le
HUD s'affiche, et le canevas reste vide — exactement comme si le rendu était cassé. Une
demi-session perdue au 426 sur un bogue qui n'existait pas. **Remède** : arrêter le serveur,
`rm -rf .next`, redémarrer.

**`npx next build`** compile tout : le contrôle le moins cher sur 25 000 lignes.
⚠️ L'avertissement `'G_SOIL' is not exported` est **PRÉEXISTANT**. ⚠️ **SANS `.env.local`, LE
BUILD S'ARRÊTE APRÈS LA COMPILATION** sur `Error: supabaseUrl is required` (pré-rendu de
`/login` et `/signup`) — ce n'est PAS une régression. **Ce qui compte est
`✓ Compiled successfully` juste avant.**

⚠️⚠️ **LES BANCS SONT DANS `tools/README.md` DEPUIS LE 432, ET CE CHAPITRE A ÉTÉ ÉLAGUÉ AU 444
SUR L'ORDRE LAISSÉ PAR LE §14.2 DU 442** (reporté deux fois). **17 bancs de contrôle et 19 bancs
de rendu**, comptés en listant `tools/` (⚠️ **le 480 en ajoute un, `verify-maire`, et les 36 ont
été relancés un par un**, tous verts : `verify-quete` **596/596**, `verify-maire` **113/113**,
`render-etoile` **161/161**
⚠️ *ces deux premiers chiffres mentaient depuis un moment : `verify-maire` était resté à 72/72 ici
alors que le 481 l'annonce correctement à 113/113 plus bas dans ce même fichier — même défaut que
celui déjà daté ailleurs dans ce chapitre (« un chiffre corrigé à un seul endroit n'est pas
corrigé »), retrouvé hors-zip en relançant les bancs pour cette livraison.*
⚠️ *il était à 488 au 468 : le déchant a retiré les contrôles des quatre chapitres
supprimés et en a ajouté une trentaine sur la fouille. **Un banc qui rétrécit parce que le code
rétrécit est un banc en bonne santé** — ce qu'il ne faut pas, c'est qu'il rétrécisse tout seul*). ⚠️ **Six d'entre eux existent parce qu'un défaut vu par
Guillaume — ou vu à l'écran — n'était mesuré nulle part** : `verify-compo` (440), `verify-pont`
(441), `verify-portee` (443), et au 444 `render-etoile`, `verify-quete`, `render-beffroi`.
⚠️⚠️ **ET LE 480 EN AJOUTE UN QUI EST D'UNE AUTRE NATURE : `verify-maire` JOUE une mécanique de
bout en bout** — quatre cents entretiens par propriété, cinq maires × deux mondes × dix vitesses
de réflexion — au lieu de relire une table. Il a sorti quatre défauts de RÉGLAGE qu'aucune
relecture n'aurait vus, dont une négociation arithmétiquement ingagnable et une seconde moitié de
discussion devenue décorative. **C'est le premier banc du dépôt qui joue.**
⚠️⚠️⚠️ **ET LE 481 LUI A APPRIS DEUX CHOSES QUE 72 CONTRÔLES VERTS NE POUVAIENT PAS VOIR, ET LES
DEUX ONT ÉTÉ TROUVÉES EN JOUANT** (il est à **113/113**) : (1) **un banc qui manipule des dates doit
manipuler de VRAIES dates** — avec `at: 1000`, rien ne dit que `now | 0` tronque un horodatage de
1,78 × 10¹² à 32 bits, et la secrétaire annonçait « il vous reçoit dans 29778439:55 » ; (2) **un
texte à trous ne se vérifie pas en comptant ses clés, il se vérifie en le REMPLISSANT** — la vue
DEVINAIT quel argument passer à chaque justification, et le joueur lisait « Scrutin dans Lui
jours. » Toutes les clés étaient appariées, tous les textes affichés, tout comptait pour lu.
⚠️ Il importe désormais `maireBureau.js` pour tenir la jointure « sept postures de la mécanique =
sept postures dessinables » : c'est le seul contrôle du dépôt qui relie une règle à son DESSIN.
⚠️⚠️⚠️ **ET IL A APPRIS UNE LIMITE DE `verify-syntax` QU'IL FAUT CONNAÎTRE : IL ANALYSE FICHIER PAR
FICHIER, DONC IL NE PEUT PAS VOIR UN IMPORT QUI NE RÉSOUT PAS.** Un **bundle** —
`npx --yes esbuild@0.21.5 --bundle --loader:.js=jsx --format=esm --outfile=/dev/null
--external:react --external:'@supabase/*' --alias:@/lib/supabaseClient=./lib/supabaseClient.js
--alias:@/lib/realtimeQuota=./lib/realtimeQuota.js components/ferme/FermeGame.js` — a sorti en
96 ms un `A.drawStarCalmGlow` qui n'existe pas, c'est-à-dire **un crash de boucle de rendu vieux
de deux zips** (le piège n°1 de ce fichier, dans le zip même qui livrait la fonctionnalité). Ça ne
remplace pas `next build`, mais ça se lance PENDANT qu'un `next dev` tourne, et c'est le seul
contrôle du dépôt qui voie une liaison entre deux fichiers.
⚠️ **Le seul qui touche à de l'ARGENT est `verify-vallee`** (205/205, relancé au 458) : il joue des ventes,
compte les pièces, et vérifie que **le cours est bit à bit celui du 430** — contrôle hérité de
`verify-enquete`, sauvé de sa suppression parce qu'il protégeait le marché, pas l'enquête.
**Tout chiffre écrit là-bas a été obtenu en lançant le banc**, c'est sa règle d'entrée.

⚠️⚠️ **ET UN BANC QUI N'A JAMAIS PU ÉCHOUER NE VAUT RIEN** (441). Le garde-fou de source de
`verify-pont` annonçait « 0 appel fautif » alors que son motif ne pouvait matcher **aucun** appel
réel. **Tout banc qui compte des occurrences doit publier combien il en a LUES.**

⚠️⚠️⚠️ **ET LE 444 A AJOUTÉ LA LIMITE DE FOND, CELLE QUI VAUT POUR TOUS : SIX BANCS AU VERT N'ONT
PAS VU DIX DÉFAUTS QU'UNE SÉANCE DE JEU DE VINGT MINUTES A TROUVÉS**, dont cinq qui rendaient un
lieu **inatteignable**. Ils mesuraient tous la bonne chose ; **aucun ne mesurait l'ARRIVÉE**.
Détail au §25 de `components/ferme/README.md`. *Un banc protège de ce qu'on a déjà compris ;
regarder l'écran est la seule chose qui trouve ce qu'on n'a pas encore compris.*

### ⚠️ CE QUI N'EXISTE PAS — ET C'EST LE POINT DE CE CHAPITRE

Une liste de ce qui existe se vérifie en la lançant ; une liste de ce qui n'existe pas ne se
vérifie jamais — c'est elle, et elle seule, qui protège du banc imaginaire (§14.6).

- ⚠️ **`verify-luge`, `verify-boot`, `preview-luge`, `preview.mjs`, `verify-perf` et
  `preview-fps` N'EXISTENT PAS** dans `tools/`.
- ⚠️⚠️⚠️ **ET AUCUN BANC NE COMPTE CE QUE LE CHARGEMENT COÛTE À LA MACHINE — MESURÉ AU 481 PARCE
  QU'UN AMI DE GUILLAUME NE PEUT PLUS JOUER SUR TABLETTE.** `buildSprites()` **crée 2 722 canevas
  2D et en RETIENT 1 829** (2,6 millions de pixels), dont `townWater` **636** (16 configurations ×
  2 variantes × 16 crans de profondeur, plus la berge et le tramage) et `petFrames` **468**
  (39 familiers × 4 directions × 3 images) — soit **60 % à eux deux**. En octets ce n'est rien
  (≈ 6 Mo) ; **ce qui compte n'est pas la taille, c'est le NOMBRE** : WebKit sur iPad alloue une
  surface minimale par canevas et plafonne le total, et le symptôme d'un dépassement n'est pas une
  erreur — c'est un onglet qui se ferme ou un canevas qui rend du blanc.
  ⚠️ **Ce n'est pas corrigé au 481** (règle du 424 : on ne mêle pas deux changements visuels dans
  une livraison) et la parade est connue : **paver** ces deux familles en quelques atlas et découper
  au `drawImage` — le rendu appelle déjà `drawImage` partout, seule la source change.
  ⚠️ **Le chiffre se remesure en trois lignes** : encadrer `cv(w, h)` dans `fermeArt.js` d'un
  compteur sur `window`, recharger, lire. *Une grandeur qu'aucun banc ne mesure se mesure à la main,
  et on écrit le chiffre avec sa date.*
- ⚠️ **AUCUN BANC NE REGARDE LA FERME EN IMAGE** : les dix-huit bancs de rendu ne dessinent que
  Valley Town, ses intérieurs, ses habitants et sa quête. Un décor de la ferme mal proportionné
  n'a, à ce jour, aucun endroit où se voir. ⚠️ **Et le SOL de la ferme non plus** : `render-rues`
  peint les rues de la ville, pas les chemins de la ferme, restés sur la tuile unique de 16 px du
  zip 232.
  ⚠️⚠️ **UNE EXCEPTION DEPUIS LE 454, ET ELLE A SERVI TOUT DE SUITE** : le SILLON de l'étoile est le
  premier décor de la FERME qu'un banc regarde (`render-etoile`, §5 bis). Il a fallu le sortir de la
  file de tri et en faire une fonction pour ça — et le jour où il est devenu regardable, on a
  découvert qu'il était PLAT depuis dix zips.
  ⚠️ **LE 455 A APPLIQUÉ LA LEÇON À L'ENDROIT** : la bulle « ! » des PNJ est née DANS `fermeArt` avec
  ses treize contrôles le jour de son écriture (§9 et §10 de `render-etoile`), et le banc a
  immédiatement supprimé un dessin mort (un « ? » que personne n'appelait).
  ⚠️⚠️ **L'ÉCART EST DEVENU FRAPPANT : la ferme garde les deux arbres du zip 232** (trois `arc()`
  et quatre triangles) **et son herbe en tuile de 16 px**, pendant que la ville a onze essences
  animées de 48×64 et un gazon au pavé de 64 px. C'est délibéré (décision du 424 : ne pas mêler
  deux changements visuels) et c'est **la dette la plus visible du projet** — un joueur qui prend
  le train voit deux niveaux de finition.
- ⚠️ **AUCUN BANC NE REGARDE UNE FENÊTRE COMPLÈTE DE VALLEY TOWN.** `render-mairie` (439) et
  `render-beffroi` (444) **appellent** les sols au lieu de les repeindre, donc ils jugent ce que
  le jeu dessine vraiment ; **ce qui manque est ce qui reste dans la closure : les BÂTIMENTS de la
  ville et les PERSONNAGES.** Les autres bancs approximent le décor autour de leur surface.
- ⚠️⚠️ **ET AUCUN BANC NE JOUE À DEUX CLIENTS.** `fake-supabase.mjs` le permet depuis le 432 et
  l'a fait pour la VILLE (trois défauts le premier jour), pour l'enquête au 442 (deux défauts) et
  **pour la quête de l'étoile au 458 — TROIS BLOCAGES DURS**, dont deux rendaient la quête
  infinissable dès qu'un second joueur se connectait (§12.0 de `QUETE.md`). ⚠️ *La séance à deux
  clients a désormais payé les trois fois sur trois où elle a eu lieu.* **Ce qui reste** : la
  moitié qui se joue FACE À FACE (l'étoile timide dos à dos, le croisement d'ombres à deux, la
  flaque promenée sur le ponton, le duo) et **la ferme PEUPLÉE**, jamais vue à deux.
- ⚠️⚠️ **UN BANC JOUE ENFIN UN MOUVEMENT, DEPUIS LE 459, ET C'EST LE SEUL** : `render-etoile` §7
  simule `starSlipStep` sur le vrai creux du cratère, 317 départs, et vérifie qu'on SORT du trou.
  Il a trouvé, avant d'être fini, que 219 départs sur 317 étaient bloqués. ⚠️ Ce qu'il ne fait
  toujours pas : jouer un mini-jeu (voir juste en dessous) ni tourner à deux clients.
- ⚠️ **AUCUN BANC NE JOUE UN MINI-JEU.** Ils vivent dans le DOM et demandent un vrai canevas et un
  vrai `rAF`. Ce qui se juge là — *est-ce que c'est agréable ?* — ne se mesure nulle part.

⚠️⚠️ **JOUER À DEUX EN LOCAL : `node tools/fake-supabase.mjs`.** REST bidon **+ relais Realtime**,
donc deux onglets = deux joueurs, sans compte et sans consommer un message du quota. `LAT=90
JIT=60` simule une vraie liaison ; il imprime le débit réel PAR TYPE toutes les 5 s.
⚠️ **Le broadcast de supabase-js est BINAIRE**, pas JSON — un relais qui ne lit que les trames
texte voit tout se connecter et rien passer.

**Jouer en local** — deux échafaudages TEMPORAIRES, **à supprimer après** (recette resservie telle
quelle au 454 puis au 456) :
1. un `.env.local` pointant sur `http://127.0.0.1:54321` ; sans lui on reste bloqué à l'écran
   « code de ferme » ;
2. une page jetable `app/<nom>/page.js` montant `<FermeGame room={{id}} me={{id,username}}
   players={[{profile_id, username, joined_at}]} isHost savedCode="XXXX" />`.
   ⚠️ **`players` EST OBLIGATOIRE** (`[...players]` plante sans lui). ⚠️ **Un dossier `app/`
   préfixé par `_` n'est PAS une route.** ⚠️ **La supprimer avant de livrer** : en production
   elle ouvre une ferme sans authentification.

Puis ⌘⇧X → menu développeur → **20 arrêts** (ferme, passage, Valley Town ×7 dont **le cratère**
depuis le 446, et les **huit niveaux d'intérieur** : tribunal ×3, mairie ×2, église ×3 dont le
beffroi), **« Peupler la ferme »** et **« ⭐ Star »** (444 : effacer · lancer la chute · boucler le chapitre · sauter d'un
cran · marquer le lieu suivant · tout sauf le duo · **et REJOUER UNE SCÈNE isolée**).
⚠️ « Rejouer une scène » est le bouton qui change tout : sans lui, revoir une cinématique oblige à
remettre la quête à zéro, donc on ne la revoit qu'une fois, donc on ne la juge qu'une fois.
⚠️ **AUCUN BOUTON DE QUÊTE NE DONNE QUOI QUE CE SOIT** : le menu s'ouvre à tout joueur qui connaît
le raccourci (398). Le chemin développeur appelle les mêmes résolveurs et JETTE ce qu'ils rendent.
⚠️ **DEPUIS 2026-08, DEUX BOUTONS DU MENU DONNENT VOLONTAIREMENT QUELQUE CHOSE** — exception
délibérée à la ligne du dessus, sur demande de Guillaume : « Argent » (+100 000/+1 000 000/
+10 000 000 or, arbitré par l'hôte comme `devResidents`) et « Constructions & cultures → Tout terminer », qui
avance à MAINTENANT tout horodatage de construction en attente dans `w.objHp` (lampadaire,
épouvantail, moulin, chaudron, repousse d'herbe — voir `BUILD_TIMES`/`buildReady` dans
`fermeEngine.js`), toute culture (`bankedMs` porté à `growMs`) et toute production animale
(`readyAt`). Sert à tester une fonctionnalité de la ferme (bâtiments compris) sans attendre les
délais réels ni faire tourner l'économie à la main. Testé en session à 1 client
(`fake-supabase.mjs`) : l'or s'incrémente bien côté hôte, le bouton renvoie « aucune construction
en cours » sans rien casser quand il n'y a rien à finir.

⚠️⚠️ **AUTOMATISATION DU NAVIGATEUR — LA RECETTE COMPLÈTE, ET ELLE MARCHE DEPUIS LE 446.**
`window.dispatchEvent(new KeyboardEvent("keydown", {code:"KeyE"}))` marche pour TOUTES les touches
(les frappes envoyées par l'outil, non). Le menu dev ouvert BLOQUE les déplacements (`if
(devMenuOpenRef.current …) return`) — il faut `Escape` avant de marcher. La capture d'écran
fonctionne.
⚠️⚠️⚠️ **DANS UN ONGLET MASQUÉ, `requestAnimationFrame` NE SE DÉCLENCHE JAMAIS**
(`document.visibilityState === "hidden"`) : le monde ne tourne pas, le fermier ne bouge pas d'un
pixel, et **`getImageData` relit la dernière image composée** — deux mesures de suite rendent le
même nombre et on accuse le code qu'on vient d'écrire. **UNE LIGNE SUFFIT, ET SON FREIN EST DANS
SA FORME :**
`window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);`
Mesuré au 446 : **31 à 36 images par 500 ms**, onglet masqué, monde qui tourne, marche, mesures.
⚠️ Le `MessageChannel` du 444 figeait l'onglet parce qu'un relais qui se repose un message à
chaque image n'a **pas** de frein ; `setTimeout(…, 16)` en est un par construction. **On pose le
patch AVANT de mesurer quoi que ce soit**, et on peut ensuite lire les pixels du canevas
(`getImageData`) pour mesurer ce qu'aucune capture ne montre — un décalage de sprite, par exemple.
⚠️ Un canevas mesuré pendant qu'un panneau est masqué sort à **0×0**, ce qui ressemble trait pour
trait à un rendu cassé.
⚠️⚠️ **ET DEPUIS LE 454, `setTimeout(…, 16)` NE SUFFIT PLUS : CHROME ÉTRANGLE LES TIMERS D'UN
ONGLET MASQUÉ À UN PAR SECONDE.** Le monde avance (l'horloge tourne) mais à ~1 image/s, ce qui donne
un jeu « qui marche » et des mesures fausses — une scène de chute défilait en douze images. **La
parade est un WORKER, qui n'est pas étranglé** :
`new Worker(URL.createObjectURL(new Blob(["setInterval(()=>postMessage(0),16);"])))`, dont chaque
message vide une file de callbacks `requestAnimationFrame`. C'est le frein du 446 (une file, pas un
relais qui se repose un message) avec une horloge qui ne dort pas. ⚠️ **Il a resservi tel quel au
456**, où il a fait tourner toute la séance.
⚠️⚠️ **MAIS `getImageData` RESTE MENTEUR DANS UN ONGLET MASQUÉ — MESURÉ AU 456.** Avec le worker en
place, l'horloge avançait, les résidents se déplaçaient, et **le hachage de l'écran entier ne
changeait pas d'une image à l'autre** : on aurait conclu « les PNJ sont arrêtés » sur un monde qui
bougeait. **La capture d'écran, elle, est juste** : c'est elle qu'il faut échantillonner, pas les
pixels du canevas. *Deux mesures de suite qui rendent le même nombre ne prouvent rien ; deux
CAPTURES qui rendent la même image, si.*

⚠️ **Le faux canvas de `lib-canvas.mjs` IGNORE `translate`/`rotate` et ne connaît pas `fillText`**
— un sprite qui en dépend s'y juge faux. Ce n'est pas un bogue du jeu. ⚠️⚠️ **Et il
n'implémentait `drawImage` qu'à TROIS arguments jusqu'au 428** : toute découpe y dessinait la
feuille ENTIÈRE. Pas d'erreur, une image plausible, un verdict faux — le stub menteur, **dans
l'outil censé nous en protéger**. **Un banc de rendu se vérifie aussi.**

**Session manuelle à 2 joueurs — seule vraie validation du multijoueur.**
⚠️ **Un stub qui « retombe sur une valeur raisonnable » ment mieux qu'un stub qui plante.**
**Quand un outil et le jeu divergent, croire le jeu.**

## 11. Modes 3D autonomes

`templerun` et `labyrinth` chargent encore **r128 depuis cdnjs sans `integrity`**.
`candyluge` est passé au **local** au 422. `candyland` est du canvas 2D pur.

⚠️ **UNE MIGRATION VERS UN THREE.JS MODERNE N'EST PAS UN PRÉALABLE** aux glTF ni au
post-traitement : r128 expédie elle-même `GLTFLoader`, `EffectComposer`, `UnrealBloomPass` et
`ShaderPass`, seulement absents du miroir cdnjs (copiés depuis npm `three@0.128.0` : **zéro
déplacement de teinte**). ⚠️ **Le vrai obstacle n'est pas colorimétrique** :
`labyrinth/js/world.js:370-382` recopie l'atténuation r128 `(1 − d/portée)^decay` pour classer
les lumières ; cette formule disparaît vers r155 et le classement continuera de tourner **sans
erreur** en choisissant mal.

---

## 12. Vocabulaire

- **« zip N »** : trace historique des livraisons (jusqu'au 426), **nommée d'après la
  fonctionnalité livrée, pas d'après la zone touchée**. Piège vérifié : le 418 « vallée de
  verre » désignait `public/crystal/`, pas la ferme.
- **hôte / invité** : rôles réseau, pas des personnes.
- **AOI** : rayon au-delà duquel on cesse de diffuser une entité.
- **PNJ nommés** : Greg, Soan, Harald, Rosalie, René (ferme). Aubin (crystal, ch. 1).
- **Les références de Guillaume sont des images GÉNÉRÉES** (concept art). Elles font autorité
  sur l'intention, **jamais sur l'interface**.

---

## 13. À compléter par Guillaume

- ⚠️ **LE CADASTRE ET LE NOTAIRE SONT DES GUICHETS FERMÉS** : les deux pièces existent, meublées,
  et ne rendent aucun service depuis que le 444 a retiré l'histoire qui les employait. La question
  est donc entière : **acheter une parcelle, avec un prix, un titre et une conséquence sur la
  carte.** ⚠️ La FORME est acquise et mesurée (une `req` arbitrée par l'hôte, un état partagé dans
  `ferme_saves`, aucune migration SQL) ; c'est le contenu qui manque.
  ⚠️ **Le MARIAGE n'a toujours pas bougé** — la salle est dressée, les bans sont prêts, il manque
  l'officier depuis le 439. C'est le seul endroit du jeu où deux joueurs feraient quelque chose
  ENSEMBLE qui ne soit pas du commerce, et aucune des deux quêtes ne l'a remplacé : elles se
  MÈNENT à deux, elles ne se CÉLÈBRENT pas.
- **Le salon de coiffure** (427) : **qui coiffe, et comment ça marche ?** Le bâtiment,
  l'enseigne et la banderole « ouverture prochaine » sont posés ; il manque la décision.
- ⚠️ **LE MORCEAU D'ORGUE (441) : UN FICHIER, PAS UNE DÉCISION.** Tu as choisi un vrai morceau
  plutôt qu'une synthèse ; il se dépose dans **`public/sounds/church-organ.mp3`** et rien d'autre
  n'est à faire — la scène, le banc, le toast et la coupure au lever sont branchés. En attendant,
  le jeu dit que la soufflerie est muette, une seule fois, plutôt que de laisser croire à une
  touche cassée.
- ⚠️ **L'ÉGLISE EST OUVERTE ET NE REND AUCUN SERVICE** (441, ta décision) : trois gestes, aucun
  or. Le 442 lui a donné **deux inscriptions à lire** dans la tribune (la cloche et la plaque du
  facteur d'orgues) : c'est la première fois qu'on y monte pour autre chose que la vue, et ça n'a
  rien coûté — les deux se lisent sur des décors qui étaient déjà là.
- **Valley Town : qui HABITE la ville à demeure ?** Les résidents ne font qu'y passer. Le 439 y
  pose **Léonie Sarrazin** à l'accueil de la mairie — mais c'est un décor qui parle, pas une
  habitante : elle ne bouge pas, et `res.zone` ne connaît toujours que « farm » et « town ».
  Faire ENTRER un résident dans un bâtiment est une décision, pas un réglage : il faudrait une
  troisième valeur de zone, donc une position à réconcilier.
  ⚠️ **Et la prairie : le nombre de blocs de 28×28 encore nus est compté par `verify-vallee.mjs`
  à chaque exécution** — on le lit là, on ne le recopie pas ici (le 437 a perdu du temps sur un
  chiffre périmé). On n'y a délibérément posé AUCUN endroit de vie : des résidents qui vont
  contempler un champ vide, c'est du remplissage. La question n'est donc pas « comment les
  meubler » mais **« qu'est-ce qu'on construit là »**.
  ⚠️⚠️ **LE 440 A RÉPONDU POUR LE COIN SUD-EST, ET LA RÉPONSE EST « RIEN, EXPRÈS »** : un bois y a
  été creusé et le sentier de la rive est va s'y perdre — sans un seul endroit de vie, sur demande
  de Guillaume (« pas une zone très fréquentée, un peu sauvage »). C'est le premier morceau de
  carte assumé comme un **vide habité par le décor** plutôt que par des gens, et c'est une réponse
  possible pour les blocs qui restent. `verify-vallee` a donc appris une troisième catégorie (bâti
  / prairie / bois) : sans elle, il réclamait « une raison qu'on y aille » pour une forêt.
- ⚠️ **DEUX DES TROIS CHANTIERS DE JOUABILITÉ RESTENT À CONSTRUIRE.** Le marché est livré au
  430 et **devenu le SEUL guichet au 431** : la ferme montre et transforme, la ville achète.
  L'économie existe donc vraiment, et le **jour de marché** hebdomadaire est déjà un
  rendez-vous daté. Restent :
  **1. les commissions** — le tableau des nouvelles distribue des demandes de la ville, qu'on
  remplit depuis la ferme, à deux, contre paiement. Elles s'appuient sur l'économie qui existe
  désormais. ⚠️ **LE PATRON EXISTE ET IL EST MESURÉ** : `components/ferme/quete.js` est une table
  de lieux, une table de chapitres, des résolveurs purs qu'un banc peut appeler, et un état
  partagé qui voyage dans un `apply` qui partait déjà — zéro message dédié. Une commission, c'est
  la même chose en beaucoup plus court ;
  **2. les rendez-vous datés** — concert au kiosque, foire : des événements au calendrier
  partagé qui rassemblent résidents ET joueurs au même endroit à la même heure. ⚠️ Le patron est
  désormais écrit **cinq fois** (jour de marché, service de Carla, jour d'orage, cours du marché,
  et au 439 les **élections municipales** + le jour d'audience du maire) : **une pure fonction du
  numéro de jour, jamais un état**. Les élections sont le premier de ces rendez-vous qui ait un
  RÉSULTAT visible dans le monde (le portrait officiel) — c'est le modèle à copier.
- ⚠️⚠️ **LE TACTILE NE COUVRE QUE LA FERME, LA VILLE ET LE TRIBUNAL** (430). Les 21 autres jeux
  de la plateforme n'ont pas été audités au doigt. Certains ont déjà des `pointer*` (puzzle,
  naval, yahtzee), d'autres non — **personne ne sait lesquels**, et c'est exactement l'angle
  mort qui a laissé la ferme injouable pendant des années.
- ⚠️⚠️ **LE VOYAGE EST-IL DEVENU UNE CORVÉE ?** (431, à jouer, c'est la question de ce zip.)
  Vendre exige maintenant de prendre le train : c'est ce qui donne son sens à la ville, mais
  personne ne l'a encore vécu sur une soirée entière. Deux réglages existent si c'est pénible —
  élargir la portée du marché, ou raccourcir le trajet — et **aucun ne doit être touché avant
  d'avoir joué**. On a délibérément conservé la prime de cours (jusqu'à +35 %) comme
  contrepartie : le voyage doit PAYER, pas seulement coûter.
  ⚠️ **ET IL Y A DÉSORMAIS UNE SECONDE RAISON D'Y ALLER, QUI N'EST PAS DE L'ARGENT** : la quête
  de l'étoile fait faire l'aller-retour (le sillon est à la ferme, tout le reste est en ville), et
  depuis le 451 **le NAVIRE donne une raison de revenir voir** — il grandit sur le quai du lac à
  chaque morceau rapporté. Si le voyage cesse d'être une corvée, ce sera peut-être pour cette
  raison-là plutôt que par un réglage — à juger en jouant, comme prévu.
- ⚠️ **LE PAIN DES PIGEONS EST GRATUIT (433) — ARBITRAGE TOUJOURS À TRANCHER**, mais la scène
  MARCHE depuis le 439 (assis, treize pigeons viennent manger ; se lever en fait partir dix sur
  quatorze). L'objection « un joueur qui appuie sans rien voir se passer croit que la touche est
  cassée » ne tient donc plus : il se passe quelque chose. Reste la vraie question — gager le
  geste sur un `bread` du stock lierait la scène à l'économie (joli) mais changerait une ambiance
  en dépense. **Question de conception, pas de technique.**
- ⚠️ **LES OISEAUX NE SONT PAS PARTAGÉS ENTRE LES DEUX JOUEURS** (433, décision de Guillaume :
  « leur comportement doit pas être exactement partagé »). Les emplacements se déduisent de la
  carte, mais le nombre et les activités sont tirés chez chaque client — deux joueurs sur la
  même place ne comptent pas les mêmes pigeons. **À JOUER À DEUX** pour dire si ça se remarque ;
  si oui, le pain seul mérite d'être diffusé (un `send` de trois nombres), pas les oiseaux.
- ⚠️⚠️⚠️ **LA QUÊTE DE L'ÉTOILE (444) — LA SÉANCE À DEUX CLIENTS A ENFIN COMMENCÉ AU 458, ET ELLE A
  PAYÉ IMMÉDIATEMENT.** Deux clients ont tourné ensemble pour la première fois et ont trouvé **trois
  blocages durs**, dont deux rendaient la quête **infinissable dès qu'un second joueur se
  connectait** (§12.0 de `QUETE.md`). ⚠️ **Ce qui n'a TOUJOURS pas été joué est la moitié qui se
  joue FACE À FACE** : l'étoile timide dos à dos, le croisement d'ombres à deux (barème court, 30
  cases / 20 s), la flaque que l'un promène sur le ponton pour l'autre, le duo orgue/beffroi. Le
  code est là et il est corrigé ; les postes n'ont jamais été tenus. ⚠️ **Et la même séance doit
  faire la ferme PEUPLÉE**, réclamée depuis le 419. Voir `components/ferme/QUETE.md` §12.2.
  **Ce qui attend une DÉCISION de ta part, et rien d'autre :**
  **1. Le dessin de la compagne.** Cinq écritures, vue en jeu, pas encore juste : deux directions
  chiffrées dans `QUETE.md` §12.3 (l'agrandir, ou quatre masques de pixels à la main).
  **2. La récompense cosmétique.** L'arbitrage est POSÉ et VIDE (`resolveStarGift` écrit
  `star.gift[joueur]`, une fois, côté hôte, persisté). Reste à décider CE QU'ON DÉBLOQUE — le jour
  où la garde-robe cosmétique lira ce champ, elle n'aura pas à inventer un chemin d'attribution,
  et c'est au moment où l'on en invente un qu'on se trompe.
  **3. Le réglage des cinq mini-jeux.** Ils sont dessinés et vérifiés, jamais joués jusqu'à la
  victoire à cadence réelle. Ce qui s'y juge — *est-ce que c'est agréable ?* — n'est mesuré nulle
  part et ne le sera jamais.
  **4. ✅ CE QUE LE NAVIRE FAIT UNE FOIS FINI — TRANCHÉ AU 453 PAR TOI.** *« Le bateau est construit
  et réel. Eduardo Da Fonseca le prend et part au large […] ça laisse de la marge narrative, pour
  développer de nouveaux mondes et ensuite permettre au bateau de revenir. »* C'est fait, et ça n'a
  coûté ni état ni message : la cale se vide pendant ses voyages. ⚠️ **Ce qui reste ouvert est la
  SUITE, et c'est un vrai chantier** : les îles. Le navire est le premier objet du jeu qui promette
  un ailleurs, et il le promet maintenant par la bouche de quelqu'un.
  **5. ⚠️⚠️ CE QUI ATTEND UN AVIS APRÈS LE 454, ET C'EST DU RÉGLAGE, PAS DE LA CONCEPTION.** Trois
  nombres ont été posés par déduction et une seule séance ne suffira pas à les juger : le **prix de
  Kerguélen** (24 000 or + 60 récoltes + 12 poissons — « forte rémunération », mais sur une ferme à
  quatre artisans, est-ce une soirée ou une semaine ?), les **quinze minutes** de plans (c'est ton
  chiffre ; les deux croisements d'ombres tiennent dedans, à vérifier en jouant) et les **cinq
  commandes de bois** (140 + 45 + 110 + 60 + 40 bois, 3 à 8 min chacune : est-ce que ça donne un
  chantier qu'on suit, ou une file d'attente ?). ⚠️ **Aucun ne doit bouger avant d'avoir joué** —
  c'est la règle du voyage en train (431), et elle a eu raison deux fois.
- **La garde-robe** (427) : les prix sont volontairement très hauts. À jouer pour savoir si
  « très cher » veut dire « on économise pour » ou « on n'y va jamais ».
- **`candyluge`** : voir `public/candyluge/README.md`, qui fait autorité. La décision qui
  manque est de CONCEPTION (le bonbon empoisonné), pas de technique.
- **Gels de PNJ chez l'invité** (359-365) : encore observés ? Vérification demandée depuis le
  419 — session réelle à 2, **ferme PEUPLÉE**, console de l'hôte ouverte. ⚠️⚠️ **C'EST TOUJOURS
  LA PASSE LA PLUS URGENTE DE CE FICHIER**, et aucune des six séances à deux clients (432, 442,
  458) ne l'a faite : elles ont validé des chaînes réseau sur une ferme VIDE, ce qui ne dit rien
  des vingt résidents. ⚠️ **Le 458 est passé à côté pour une raison bête et réparable** : le faux
  Supabase ne persiste pas l'état, donc chaque rechargement repartait d'une ferme neuve — peupler
  puis recharger efface le peuplement. *Peupler EN PREMIER, et ne plus recharger.* ⚠️ **L'EXCUSE TECHNIQUE EST TOMBÉE POUR DE BON AU 432** : `fake-supabase.mjs`
  fait tourner deux clients en local (§10), et la première séance a immédiatement trouvé trois
  défauts du multijoueur de la VILLE. Ce qui n'a jamais été vu à deux : les vingt résidents que le
  428 fait circuler, et le champ d'assise qu'il diffuse. **Les bancs mesurent la simulation de
  l'hôte, jamais ce que voit l'invité.**
- **`crystal`** : le chapitre a **deux** segments jouables (`play run` et `play walk`).
  Retirer le second retire le seul endroit où l'on ramasse des éclats.
- ⚠️ **VERCEL NE DÉPLOIE PLUS AUTOMATIQUEMENT depuis le 425**, et **ce n'est pas le dépôt** :
  `origin/main` porte bien le commit, il n'y a ni `vercel.json` ni étape ignorée, et le projet
  compile. Le lien Git du projet est à vérifier côté tableau de bord. Un `vercel --prod` depuis
  le terminal **ne rétablit rien** : une livraison CLI n'est pas une livraison Git.

---

## 14. Comment maintenir ce fichier

1. **Remplacer, ne jamais empiler.** Ce fichier décrit le **présent**. Une information périmée
   se supprime, elle ne se date pas.
2. **200 lignes = passe d'élagage obligatoire. Ne pas relever le seuil.** L'élagage se fait
   AVANT d'ajouter.
   ⚠️⚠️⚠️ **LE 439 A ÉLAGUÉ, ET C'EST LE PLUS GROS RÉTRÉCISSEMENT DE L'HISTOIRE DU FICHIER :
   687 → 661 lignes, dont un EN-TÊTE passé de 151 à 50.** Cet en-tête était devenu un mur de
   cinquante lignes d'avertissements avant le premier chapitre — c'est-à-dire la partie qu'on lit
   le moins bien, occupée par ce qu'on veut qu'on lise le mieux. Les leçons de DESSIN sont
   descendues en §4 (elles y sont à côté des pièges de dessin), les leçons de BANC sont restées
   en tête sous une seule forme (« un banc qui passe ne veut pas dire que la chose est bonne »)
   avec ses quatre variantes connues, et **trois blocs qui redisaient la même chose que §4 ont
   été supprimés, pas déplacés**.
   ⚠️⚠️⚠️ **LE 449 A EXÉCUTÉ L'ORDRE DU 444, QUATRE FOIS REPORTÉ (446, 447, 448) : §4 EST SCINDÉ
   UNE TROISIÈME FOIS.** Les cinq pièges du GÉNÉRATEUR sont partis au §15 bis de
   `components/ferme/README.md` ; les deux règles de CONCEPTION sont restées, parce qu'elles ne
   parlent pas du générateur. ⚠️ **Et l'élagage a trouvé ce qu'un élagage doit trouver : un
   DOUBLON.** « Une variante de décor est une couche » était écrit DEUX fois dans le même
   chapitre — une version courte en Architecture, une longue en JavaScript — et personne ne
   pouvait s'en apercevoir en lisant, puisque cent lignes les séparaient. La longue a survécu.
   ⚠️⚠️ **ET L'EN-TÊTE EST REPASSÉ DE 167 À 125 LIGNES, POUR LA SECONDE FOIS EN DIX ZIPS.** Il
   avait refait exactement ce que le 439 lui avait reproché : quatre récits de zip (444, 446,
   447, 448) empilés avant le premier chapitre, chacun redisant en quinze lignes ce que
   `components/ferme/README.md` dit mieux en un paragraphe. Les RÉCITS sont supprimés, les
   LEÇONS gardées — **une ligne chacune, dans un tableau qui renvoie au détail**. C'est la forme
   qui résiste à l'empilement, parce qu'un récit s'allonge et qu'une ligne de tableau, non.
   ⚠️ *La leçon de ces six ordres exécutés est toujours la même : un chapitre qui grossit à chaque
   zip décrit un code qui vit ailleurs, et il faut le renvoyer là-bas — jamais le résumer ici.*

   Historique : 426 (insuffisant), 427 (§7 → `public/candyluge/README.md`), 428 (§6 →
   `components/ferme/README.md`, 507 → 490), 431 (§4 scindé, 534 → 482),
   432 (§10 → `tools/README.md`, 524 → 483), 433 à 438 (aucun),
   **439 (en-tête 151 → 50 et §13 relu, 687 → 661)**, 440 (aucun),
   **441 (§4 scindé : le DESSIN → `DESSIN.md`)**, 442 (§13 relu ligne à ligne),
   **444 (§10 élagué)**, 446 à 448 (aucun — et l'ordre du 444 reporté trois fois),
   **449 (§4 scindé une 3e fois + en-tête 167 → 125, 903 → 804)**, 450 (aucun),
   **451 (§13 relu ligne à ligne, quatre entrées périmées supprimées)**,
   **452 (aucun ICI — la passe a porté sur `QUETE.md`, qui en avait plus besoin)**,
   **453 (tableau des leçons ramené aux QUATRE derniers zips, comme son propre titre l'annonce)**,
   **454 (le même tableau re-ramené à quatre : 448 et 449 partent, leur détail est déjà ailleurs)**,
   **455 (le même tableau re-ramené à quatre pour la TROISIÈME fois en trois zips : le 451 part, ses
   quatre lignes vivent au §30 de `ferme/README.md` et dans `render-navire.mjs`, que leur colonne de
   droite désignait déjà — la forme tient, c'est tout ce qu'on lui demande)*,
   **456 (QUATRIÈME fois en quatre zips, et pour la première fois l'élagage a mordu DANS un zip et
   pas seulement sur le plus vieux : le 452 part en entier — ses trois lignes vivent au §1 et au
   §12.2 de `QUETE.md`, que leur colonne de droite désignait déjà — et le 453 passe de quatre lignes
   à deux, les deux qui ne sont pas des cas particuliers de compteur. ⚠️ *Le tableau annonce « les
   quatre derniers zips » : le tenir demande de retirer autant qu'on ajoute, et un zip qui ajoute
   quatre lignes doit en retirer cinq.*)**,
   **457 (aucun ICI — le delivery est de l'écriture et une police, pas une leçon de banc ; la
   relecture de `ferme/README.md` reste reportée, une quatrième fois)**,
   **458 (CINQUIÈME fois en cinq zips que le tableau des leçons est ramené à quatre : le 453 et le
   454 partent en entier — sept lignes — pour laisser entrer le 457 et les quatre du 458. Leur
   détail vit là où leur colonne de droite le désignait déjà : `QUETE.md` §1 et §12.2, `render-etoile`
   §5 bis, `furrowBake`, `furrowFib`, §10. ⚠️ *Un zip qui ajoute cinq lignes doit en retirer sept ;
   c'est ce que « les quatre derniers zips » veut dire, et c'est la seule façon que ce tableau ne
   devienne pas ce que l'en-tête est devenu deux fois.*)**.

   **459 (SIXIÈME fois en six zips que le tableau des leçons est ramené à quatre : les QUATRE lignes
   du 455 partent, plus deux du 456 — le seuil de banc et la somme des bulles, qui vivent déjà dans
   `render-etoile` §11 et dans `starTalkerPick` — pour laisser entrer les quatre du 459. Six lignes
   retirées, quatre ajoutées : le tableau RÉTRÉCIT, ce qui est la seule preuve que la forme tient.)**.

   **460 (aucun ICI — le delivery est un réglage de pose visible en jeu, pas une leçon de
   banc ; la relecture de `ferme/README.md` reste reportée, une SEPTIÈME fois)**.

   **464 (SEPTIÈME passe d'élagage du tableau : les quatre lignes du 458 partent avant l'ajout
   des deux leçons du 464. Leur détail reste au §12.0 de `QUETE.md`, dans `render-etoile.mjs`,
   `verify-quete.mjs`, `starShowCard` et `starScenePump`, exactement là où leur dernière colonne
   le désignait. Le tableau couvre bien 459, 462, 463 et 464.)**.

   **465 (HUITIÈME passe : les quatre lignes du 459 partent avant les deux leçons du 465 ; leur
   détail reste dans `QUETE.md` et `render-etoile.mjs`. Le tableau couvre exactement 462 à 465,
   avec les zips sans leçon nouvelle naturellement absents.)**.

   **468 (DIXIÈME passe : les DEUX lignes du 464 partent avant les deux leçons du 468 — deux
   retirées, deux ajoutées, le tableau reste à sa taille et couvre exactement 465 à 468. Leur
   détail vit dans `starFollowerAdded`, `starJoinRef`, `starCompanionsAt`, `starFarmFlightPath` et
   `drawStarFragmentMeteor`, que leur colonne de droite désignait déjà. ⚠️ **Et cette passe a
   trouvé ce qu'un élagage doit trouver : un CHIFFRE PÉRIMÉ dans le §10** — `verify-quete` y était
   annoncé à 439/439, il est à **488/488** ; il avait donc menti pendant neuf zips dans le chapitre
   même qui interdit d'écrire un chiffre de banc sans l'avoir lancé.)**.

   **469 (ONZIÈME passe : les DEUX lignes du 465 et celle du 466 partent avant les TROIS
   leçons du 469 — trois retirées, trois ajoutées, le tableau reste à sa taille et couvre
   exactement 467 à 469. Leur détail vit dans `starJoinRef`, `plancheEscaliers.js` et
   `render-escaliers.mjs`, que leur colonne de droite désignait déjà. ⚠️ **Et cette passe a
   trouvé ce qu'un élagage doit trouver : un CHAPITRE QUI MENTAIT PAR SA FORME** — le §14 de
   `QUETE.md` s'intitulait « les sept décisions qui BLOQUENT la refonte », quatre étaient
   tranchées, et il se lisait encore comme une consigne d'attendre. Il est marqué ARCHIVE et
   la liste vivante est au §15.)**.

   **470 (DOUZIÈME passe : la ligne 467 part avant l'ajout de la leçon du 470 — une retirée, une
   ajoutée, le tableau reste à sa taille et couvre exactement 468 à 470. Le détail retiré reste
   dans `render-escaliers.mjs` et `TOWN_COURT_BLOCK_SOLIDS`, que sa colonne de droite désignait
   déjà. ⚠️ Et cette passe a trouvé le même chiffre périmé que le 468 avait déjà trouvé une fois :
   `verify-quete` était encore annoncé à 449/449 dans l'en-tête ET au §10, alors qu'il est à
   **453/453** — la correction du 468 n'avait porté que sur le §10, pas sur l'en-tête, qui se
   réécrit à chaque livraison et où le chiffre revient donc à chaque fois qu'on oublie de le
   relancer. **Un chiffre corrigé à un seul endroit n'est pas corrigé : il a juste appris un
   second endroit où mentir.**)**.

   **471 (aucun élagage ICI — le tableau ajoute la leçon du 471 et couvre encore exactement
   468 à 471, quatre zips, sans qu'aucune ligne n'ait besoin de partir.)**.

   **472 (TREIZIÈME passe : les DEUX lignes du 468 partent avant les deux leçons de l'audit 472 —
   deux retirées, deux ajoutées, le tableau reste à sa taille et couvre exactement 469 à 472. Leur
   détail vit dans `starJoinStale`, `starJoinBusy`/`starJoinActive` et `verify-quete` §arrivée, que
   leur colonne de droite désignait déjà. ⚠️ Et cette passe a trouvé ce qu'un élagage doit trouver :
   **le bloc ⏭️ REPRISE annonçait un défaut CORRIGÉ (471) que la séance de jeu venait de reproduire
   à l'identique**. Un bloc de reprise qui déclare une victoire est le seul endroit du fichier où
   personne ne pense à revérifier.)**.

   **473 (QUATORZIÈME passe : les TROIS lignes du 469 partent avant la leçon de ce zip — trois
   retirées, une ajoutée, le tableau RÉTRÉCIT et couvre exactement 470 à 473. Leur détail reste
   dans `CALM_KEY_MAX`, `migrateStar`, `verify-quete` §fouille, `starDigStart` et `starNearby`, que
   leur colonne de droite désignait déjà.)**.

   **474 (QUINZIÈME passe : les DEUX lignes du 470 et du 471 partent avant la leçon de ce zip —
   deux retirées, une ajoutée, le tableau RÉTRÉCIT ENCORE et couvre exactement 472 à 474. Leur
   détail reste dans `starGoalKey`, `starEngineerHere`, `starImpactLandedNow` et `verify-quete`
   §objectif, que leur colonne de droite désignait déjà.)**.

   **475 (SEIZIÈME passe : la ligne « migrateStar/townFall » du 472 part avant la leçon de ce
   zip — une retirée, une ajoutée, le tableau reste à sa taille et couvre exactement 472 à 475.
   Son détail reste dans `migrateStar` et `starTownActivityTick`, que sa colonne de droite
   désignait déjà.)**.

   **476 (DIX-SEPTIÈME passe : la ligne 472 part avant la leçon de ce zip — une retirée, une
   ajoutée, le tableau reste à sa taille et couvre exactement 473 à 476. Son détail reste dans
   `starAlone`, `starOtherThere` et `resolveStarCalm`, que sa colonne de droite désignait déjà.)**.

   **479 (DIX-NEUVIÈME passe : les DEUX lignes du 475 et du 478 (« une garde qui se fige à la
   première lecture ») partent avant les deux leçons de ce zip — deux retirées, deux ajoutées,
   le tableau reste à sa taille et couvre exactement 476 à 479. Leur détail reste dans
   `starGoalKey`, `starFallSeen` et `starSeenRef.resume`, que leur colonne de droite désignait
   déjà. ⚠️ Et cette passe a trouvé ce qu'un élagage doit trouver : **le §10 annonçait
   `verify-quete` à 478/478 sur trois lignes de justification** — il est à **578/578** — et le
   bloc ⏭️ REPRISE, réécrit à chaque livraison, portait le même chiffre une seconde fois. C'est
   la TROISIÈME fois que ce chiffre précis ment (468, 470, 479) : *un chiffre de banc recopié à
   deux endroits n'a pas deux chances d'être juste, il a deux endroits où mentir.*)**.

   **480 (VINGTIÈME passe : les lignes du 476 et l'une des deux du 479 partent avant les deux
   leçons de ce zip — deux retirées, deux ajoutées, le tableau reste à sa taille et couvre
   exactement 478 à 480. Leur détail reste dans `starUiOpenRef`/`starDigStep`/`L.star.dig.blocked`
   et dans `drawStarDish`/`render-etoile` §13, que leur colonne de droite désignait déjà.
   ⚠️ Et cette passe a trouvé ce qu'un élagage doit trouver : **le §10 annonçait « 16 bancs de
   contrôle » et « les 35 relancés au 479 »** alors qu'un dix-septième vient de naître ;
   `verify-quete` y était à 580 et il est à 585. C'est la QUATRIÈME fois que ce chiffre précis ment
   (468, 470, 479, 480) — et cette fois il a été corrigé aux DEUX endroits du même coup, ce que le
   470 avait manqué. *Un chiffre de banc recopié à deux endroits n'a pas deux chances d'être juste,
   il a deux endroits où mentir.*)**.

   **481 (VINGT-DEUXIÈME passe : les DEUX lignes du 480 partent avant les deux leçons de ce zip —
   deux retirées, deux ajoutées, le tableau reste à sa taille et couvre exactement 479 à 481. Leur
   détail vit dans `MAYOR_BARE_RISK_K`, `MAYOR_STREAK_HOLD_K` et les §3 et §7 de `verify-maire`,
   que leur colonne de droite désignait déjà. ⚠️ Et cette passe a trouvé ce qu'un élagage doit
   trouver : **le §5 et le §16 de `QUETE.md` décrivaient tous les deux un fichier de 365 Ko qui
   venait d'être supprimé parce qu'il était faux** — c'est le pendant exact de la leçon du 478
   (« un rapport d'audit recopié hérite de ses erreurs »), appliqué cette fois à un ASSET : *une
   ligne de tableau qui décrit un fichier ne dit pas qu'il marche, elle dit qu'il existe.*)**.

   **hors-zip (VINGT-TROISIÈME passe : la ligne 479 part avant la leçon de cette session — une
   retirée, une ajoutée, le tableau reste à sa taille et couvre exactement 480 bis à ce jour. Son
   détail reste dans `nearPierMouth` et la garde du semis d'arbres, `fermeEngine.js`, que sa
   colonne de droite désignait déjà. Cette passe n'est pas un zip numéroté — c'est une session de
   correction de collisions demandée directement, sans upload — d'où l'étiquette.)**.

   **hors-zip, séance suivante (VINGT-QUATRIÈME passe : les DEUX lignes « 481 » partent — le glTF
   du bureau et le `msOf` de l'horodatage — avant les deux leçons de cette séance (compte à rebours
   du météore sans affichage, repli `solveArm` qui oublie `side`) : deux retirées, deux ajoutées,
   le tableau reste à sa taille et couvre exactement 480 bis à aujourd'hui. Leur détail reste dans
   `maireBureau.js` (le bureau procédural qui a remplacé le glTF) et `msOf`/`verify-maire` §9, que
   leur colonne de droite désignait déjà — rien n'est perdu, ces deux défauts restent corrigés et
   documentés à leur code, seule la ligne de rappel s'efface. ⚠️ Et cette passe a trouvé ce qu'un
   élagage doit trouver : le §10 annonçait encore `verify-maire` **72/72**, chiffre du 480, alors
   que le 481 l'avait déjà corrigé à 113/113 quelques paragraphes plus loin dans CE MÊME fichier —
   cinquième occurrence de ce défaut précis (468, 470, 479, 480, et maintenant ici), toujours la
   même leçon : *un chiffre recopié à deux endroits n'a pas deux chances d'être juste, il a deux
   endroits où mentir.*)**.

   **480 bis (VINGT-ET-UNIÈME passe : la ligne 478 part avant la leçon de ce zip — une retirée,
   une ajoutée, le tableau reste à sa taille et couvre exactement 479 à 480 bis. Son détail reste
   dans `resolveStarTimberTick`/`starTimberBlock`, que sa colonne de droite désignait déjà.)**.

   **478 (DIX-HUITIÈME passe : la ligne 473 part avant la leçon de ce zip — une retirée, une
   ajoutée, le tableau reste à sa taille et couvre exactement 474 à 478. Son détail reste dans
   `starFarmImpactLandedReal`, `starImpactLandedReal` et `starCalmOk`, que sa colonne de droite
   désignait déjà. ⚠️ Et cette passe a trouvé ce qu'un élagage doit trouver : **le bloc ⏭️ REPRISE
   annonçait comme BLOQUANT un défaut qui n'existe pas** — « deux impacts derrière une rivière
   qu'on ne peut pas traverser » — alors qu'on traverse à cheval depuis 2026-07, et que le
   commentaire qui le dit est dans `fermeConstants.js` depuis. *Un rapport d'audit recopié dans ce
   fichier hérite de ses erreurs, et il les garde plus longtemps que lui.*)**.

      **467 (NEUVIÈME passe : la ligne 463 part avant l'ajout du 467. Le tableau couvre les quatre
   derniers zips 464 à 467 ; le détail retiré reste dans `QUETE.md` et `starCompanionsAt`.)**.

   ⚠️⚠️ **LE 451 A EXÉCUTÉ L'ORDRE DU 449 : §13 RELU LIGNE À LIGNE**, huit zips après le 442.
   Quatre entrées parlaient d'un code SUPPRIMÉ au 444 — elles décrivaient l'enquête cadastrale
   comme si elle tournait encore (« le 442 a ajouté une seconde raison d'aller en ville :
   l'enquête… ») — et une cinquième racontait sur onze lignes l'histoire de séances à deux clients
   au lieu de dire ce qui reste à faire. ⚠️ **Une question à laquelle on a répondu ne sort pas du
   fichier toute seule : elle y reste, et elle ment** — troisième preuve après 439 et 442.

   ⚠️⚠️ **LE 452 A EXÉCUTÉ L'ORDRE DU 451 : `QUETE.md` EST RELU CONTRE LE CODE** (943 → 1 141
   lignes ; il a grossi parce qu'il portait quatre dettes qui n'étaient écrites nulle part). Ce qui
   a été corrigé : la FICTION (§1, §2, le retournement, la fin), les **citations**, qui étaient en
   anglais alors que le jeu parle français depuis le 451, le **pisteur** (c'est le navire, plus un
   bandeau), les **dix** familles de dessin, le §10 qui ignorait quatre zips, et les **chiffres de
   bancs**, tous relancés (`verify-quete` **284/284** contre 220 écrit, `verify-vallee` **205/205**
   contre 200, `verify-strings` **1 082**). ⚠️ **Et une section « ce qui n'existe pas encore »
   annonçait le beffroi comme non construit, huit zips après sa construction.**

   ⚠️⚠️ **LE 453 A EXÉCUTÉ L'ORDRE DU 452 — LE BANC DU COMPTE DE MORCEAUX EST ÉCRIT — ET IL A
   TROUVÉ EN CHEMIN CE QUE PERSONNE NE CHERCHAIT.** Le tableau des leçons annonçait « les QUATRE
   derniers zips » et en portait SEPT : ramené à quatre, le détail restant à côté du code qu'il
   décrit. ⚠️ **Et l'élagage a trouvé ce qu'un élagage doit trouver** : la leçon 448 « une constante
   que seul le banc lit est débranchée » venait d'être **repayée par le zip qui l'avait écrite** —
   le 452 l'a diagnostiquée sur `STAR_SHIP_NEAR_R` puis a gardé la constante « en réserve ». La
   ligne le dit maintenant, et la constante est supprimée. *Une leçon qu'on écrit sans l'appliquer
   dans le même zip est une leçon qu'on repaiera.*

   ⚠️⚠️ **LE 454 A ÉLAGUÉ LE TABLEAU DES LEÇONS POUR LA SECONDE FOIS EN DEUX ZIPS, ET C'EST LE
   SIGNE QUE LA FORME EST LA BONNE** : il annonce « les quatre derniers zips », il en portait cinq
   (448 → 453), il en porte quatre (451 → 454). Les deux lignes du 448 ne sont pas résumées ailleurs
   — elles vivent au §28 de `ferme/README.md`, que leur colonne de droite désignait déjà. *Une ligne
   de tableau qu'on retire en ayant vérifié où elle vit n'est pas une perte, c'est un déménagement
   qui a réussi.*

   ⚠️⚠️ **LE 456 N'A PAS EXÉCUTÉ L'ORDRE DU 453 (RELIRE `ferme/README.md` CONTRE LE CODE) — IL EST
   DONC REPORTÉ POUR LA TROISIÈME FOIS, ET ÇA COMMENCE À RESSEMBLER AUX QUATRE REPORTS DU 444.** Ce
   qu'il a fait à la place mérite quand même d'être noté, parce que c'est la même grandeur : il a
   trouvé, en jouant, que **cinq phrases de la quête n'avaient aucun chemin d'affichage** alors que
   le banc les comptait comme lues. *La question du 453 — « chaque chose que le document dit visible
   a-t-elle un chemin de code qui l'affiche ? » — vient de se reposer sur le CODE au lieu du
   document, et elle a payé une seconde fois.*

   ⚠️⚠️ **LE 458 NE L'A PAS FAIT NON PLUS — CINQUIÈME REPORT, ET ON DÉPASSE MAINTENANT LES QUATRE
   REPORTS DU 444.** Ce qu'il a fait à la place est de la même famille et vaut d'être noté : il a
   trouvé, en jouant à DEUX clients, que **trois mécaniques décrites comme jouables ne l'étaient
   pas** dès qu'un second joueur se connectait. *La question du 453 — « chaque chose que le document
   dit possible a-t-elle un chemin de code qui la rende possible ? » — vient de se reposer sur la
   COOPÉRATION, et elle a payé une troisième fois.*

   ⚠️ **L'ORDRE DU PROCHAIN ZIP : RELIRE `components/ferme/README.md` CONTRE LE CODE**, comme le 452
   l'a fait pour `QUETE.md` et avec le même rendement. C'est le seul document d'autorité du dépôt
   qui n'ait jamais eu sa passe, il couvre 428-451, et deux de ses chapitres décrivent du code que
   le 453 vient de changer (§30 le navire, §26 le cratère). ⚠️ **La grandeur à mesurer en premier
   est celle qui a payé au 453** : *chaque chose que le document dit visible à l'écran a-t-elle un
   chemin de code qui l'affiche ?*

3. **Critère d'inclusion** : « est-ce vrai à l'échelle du projet, et invérifiable en ouvrant
   un seul fichier ? » Sinon, ça va dans un commentaire de code. **L'histoire d'un défaut
   corrigé n'y a pas sa place — seule sa LEÇON, en §4.**
4. **Écrire pour un modèle fort.** Densité maximale, phrases courtes, tableaux.
5. **Dire ce qui n'est PAS fait**, avant le reste.
6. ⚠️ **NE JAMAIS AFFIRMER QU'UN OUTIL EXISTE SANS L'AVOIR LANCÉ.** Le 425 décrivait
   `verify-vallee.mjs` « 74 contrôles, 74/74 » : le fichier n'existait pas. Un banc imaginaire
   fait passer pour testé ce qui ne l'est pas — c'est le stub menteur du §10, appliqué à la
   documentation elle-même. **Tout chiffre de banc écrit ici a été obtenu en le lançant.**
