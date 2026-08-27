# tools/ — LES BANCS, ET CE QU'ILS ATTRAPENT

Ce fichier est **l'autorité** sur les bancs du projet. Il a été extrait de `CLAUDE.md` §10 au
zip 432, sur l'ordre laissé par son §14.2 : « le jour où la liste dépasse la moitié du
chapitre, elle part dans un `tools/README.md` — en ne gardant là-bas QUE ce qui n'existe pas ».
Le 432 a ajouté deux entrées (`render-ruche.mjs`, `fake-supabase.mjs`) et l'a fait basculer.
Le 433 en ajoute trois (`verify-taxi`, `render-taxi`, `render-oiseaux`), le 434 une
(`render-rues`), le 435 une (`render-eau`), le 436 une (`render-escaliers`), le 440 une
(`verify-compo`), le 441 une (`verify-pont`), le 443 une (`verify-portee`), et le **444 trois**
(`render-etoile`, `verify-quete`, `render-beffroi`) contre deux supprimés (`verify-enquete`,
`render-enquete`, partis avec l'enquête qu'ils mesuraient), et le **451 une**
(`render-navire`, le navire des étoiles), le **480 une** (`verify-maire`, l'audience chez le
maire), et la livraison du **2026-08-27 une** (`verify-ludo`, le solo contre un à trois bots).
**Total à ce jour : 18 bancs de contrôle et 19 bancs de rendu.** Le nouveau banc passe
**30/30** ; les 36 bancs antérieurs avaient été relancés un par un au 480, tous verts.

⚠️⚠️ **ET LE 444 A APPRIS QUELQUE CHOSE QUI VAUT POUR TOUS LES BANCS DE CE DOSSIER : SIX BANCS AU
VERT N'ONT PAS VU DIX DÉFAUTS QU'UNE SEULE SÉANCE DE JEU A TROUVÉS EN VINGT MINUTES**, dont cinq
qui rendaient un lieu **inatteignable** (un arrêt de téléport qui posait le joueur dans le vide, un
autre qui le posait sur une marche, un mini-jeu qui recommençait avant le premier appui). Les
bancs mesuraient tous la bonne chose ; aucun ne mesurait **l'arrivée**. Le détail, défaut par
défaut, est au §25 de `components/ferme/README.md` — c'est la meilleure page de ce dépôt sur ce
que les bancs ne savent pas faire. *Un banc protège de ce qu'on a déjà compris ; regarder l'écran
est la seule chose qui trouve ce qu'on n'a pas encore compris.*

⚠️ **`CLAUDE.md` ne garde que la liste des bancs ABSENTS**, et c'est délibéré : c'est elle qui
protège du banc imaginaire (§14.6 — le 425 décrivait `verify-vallee.mjs` « 74 contrôles, 74/74 »
alors que le fichier n'existait pas). Une liste de ce qui existe se vérifie en lançant ; une
liste de ce qui n'existe pas ne se vérifie jamais tant qu'on ne l'écrit pas quelque part.

⚠️ **RÈGLE D'ENTRÉE : tout chiffre écrit ici a été obtenu en LANÇANT le banc.** Jamais estimé,
jamais recopié d'un zip précédent sans relance.

---

## ⚠️⚠️ ZIP 439 — CE QUE CETTE PASSE A APPRIS SUR LES BANCS EUX-MÊMES

Trois des défauts livrés ce zip-ci étaient **regardés par un banc qui passait au vert**. Ce n'est
pas une coïncidence, ce sont trois formes distinctes de la même faute, et elles valent d'être
nommées ensemble parce qu'on les refera :

1. **UN BANC QUI SE DONNE UN PÉRIMÈTRE EXCLUT LES DÉGÂTS QU'IL CAUSE À CÔTÉ.**
   `render-mairie` filtrait les refus de meubles sur les deux niveaux de la mairie, puis
   imprimait « 0 refus (le tribunal en garde 10, **antérieurs**) ». Ils ne l'étaient pas : cinq
   venaient d'être créés par l'escalier que le même zip ajoutait, dont la **statue de la Justice**
   du tribunal, effacée en silence pendant un zip entier. *Un chiffre qu'on excuse dans son propre
   rapport est un chiffre qu'on ne regarde plus.* Il échoue désormais sur tout le bâtiment.

2. **UN BANC QUI MESURE LA CARTE NE MESURE PAS L'INTERACTION.**
   « Le seuil de « hall » est bien une sortie — cases 9/9 » : vrai, et le joueur était enfermé,
   parce que le prédicat de la touche E testait le niveau 0 avec le seuil du tribunal en dur. Le
   banc **rejoue maintenant `nearCourtExit`** pour chaque bâtiment, position par position.

3. **UN BANC QUI REPEINT NE JUGE PAS LE JEU, IL JUGE SA PROPRE MAQUETTE.**
   `render-mairie` peignait les sols en aplats parce qu'ils vivaient dans la closure du rendu. Il
   les **appelle** depuis que `drawCourtWoodTile` & co. sont dans `fermeArt.js` — et sa première
   exécution a montré un tapis en tartan, parce qu'il passait un `y` local là où le jeu passe un
   `y` absolu. *Un banc qui appelle peut encore se tromper d'unité ; un banc qui repeint ne peut
   même pas s'en apercevoir.*

Et un quatrième, côté seuils : **`render-mairie` déclarait « meublé » un bureau de 221 cases qui
contenait huit meubles**, parce que le contrôle était `n < 6`. Il mesure une DENSITÉ depuis le 439
(meubles pour cent cases, minimum 8) et il a immédiatement attrapé la salle des mariages à 6 %.
*Un seuil absolu sur une grandeur qui dépend du décor est faux dès que le décor change* — c'est le
seuil du taxi au 434, transposé au mobilier.

⚠️ **`render-oiseaux` avait la même forme de trou** : sa section « le pain jeté depuis un banc »
tournait avec `threats: []`, c'est-à-dire **sans personne sur le banc**. Elle mesurait un
attroupement dans un monde où le joueur n'existe pas, et elle passait au vert pendant que
Guillaume voyait les pigeons s'envoler. Une section « assis sur un banc » a été ajoutée : le
lanceur y est, les miettes tombent où `throwCrumbs` les met, et **le premier contrôle est
arithmétique** — aucune miette ne doit tomber dans le rayon d'envol de celui qui les jette. Il
aurait attrapé le défaut du 433 sans dessiner une image.

## ⚠️⚠️ ZIP 440 — TROIS BANCS SE SONT TROMPÉS DE GRANDEUR DANS LA MÊME PASSE

Et la série est maintenant longue (rues 434, eau 435, escaliers 436, mairie 439) : **c'est la
règle, pas l'accident.** Les trois valent d'être nommés parce que les trois formes reviendront.

1. **UN BANC QUI REFAIT UNE FONCTION AU LIEU DE L'APPELER MESURE UN AUTRE MONDE.**
   `render-parc` s'est recopié le champ du bois — avec un hachage réinventé, donc un autre champ.
   Il annonçait « taillis 12 % » pour une futaie réglée à 50 % **en passant au vert**, et on
   serait allé corriger un dessin qui n'avait rien. C'est le §3 du 439 (« un banc qui repeint juge
   sa propre maquette ») commis sur une FONCTION. `townWoodDepth` est sortie de la closure du
   générateur pour ça, et le banc l'appelle.
2. **UNE BANDE DE COLONNES N'EST PAS UNE TRANCHE DE FORÊT.** Le même banc mesurait la densité du
   bois par trois bandes verticales moyennées sur toute la hauteur de son rectangle : elles
   diluaient le cœur avec les rangées où le champ est négatif, c'est-à-dire où il n'y a par
   construction aucun arbre. **On mesure par tranche de PROFONDEUR**, et les bornes sont celles du
   modèle (`TOWN_WOOD_DEPTH`), pas des nombres ronds — un seuil écrit à la main ici est le
   paramètre qui double un paramètre du §8, dans l'outil censé le surveiller.
3. **UN ÉCART-TYPE BRUT SUR UNE FRONTIÈRE EN PENTE NE MESURE QUE LA PENTE.** La lisière de ce bois
   est diagonale par construction : son écart-type vaut 24 cases **quelle que soit sa forme**, et
   une diagonale tirée à la règle serait passée haut la main. On retire la droite des moindres
   carrés et on mesure le RÉSIDU.

⚠️ Et un quatrième, côté catégories : **`verify-vallee` ne connaissait que « bâti » et
« prairie »**, donc un chemin qui traverse un bois faisait réclamer « une raison qu'on y aille »
pour une forêt. Le seuil n'était pas faux, sa catégorie l'était. ⚠️ **Le mécanisme sous-jacent
vaut d'être retenu** : le seuil mesure `pavé / praticable`, or les arbres retirent du praticable —
**planter une forêt augmente le taux d'aménagement d'un bloc sans y construire quoi que ce soit.**
C'est le « seuil absolu sur une grandeur qui dépend du décor » du 439, avec le DÉNOMINATEUR qui
bouge.

⚠️ **`render-eau` a eu droit à la correction inverse, et c'est la même règle vue de l'autre côté.**
Son contrôle de grille intérieure est tombé sous son seuil d'échantillon (192 arêtes pour 200)
parce que l'étang s'est resserré au droit du pont. Baisser le seuil aurait rendu le vert sans rien
mesurer de plus ; il mesure désormais **les deux arêtes de case, pas seulement l'est-ouest** — une
grille est une grille dans les deux sens, donc c'est une mesure plus complète ET deux fois plus
d'échantillon. **On agrandit l'échantillon, on ne desserre pas la mesure.**

## Ce qui existe

- **`tools/verify-ludo.mjs` — 30 contrôles, 30/30 (2026-08-27).** Le mode Ludo solo propose un,
  deux ou trois bots. Guillaume garde Rouge ; le duel place le bot Jaune en diagonale, puis Vert et
  Bleu complètent les parties à trois et quatre camps. Le banc ne réécrit pas les règles ; il
  donne au bot le plan légal construit par `PetitsChevaux.js`, puis vérifie sur **1 000 plans** que
  le choix reste dans ce plan. Il tient
  aussi les priorités (finir, rentrer, capturer, sortir, progresser), les décisions qui pourraient
  bloquer une partie (roue, grâce, renvoi, échange), les cinq chemins vers les arbitres de l'hôte,
  les noms FR/EN et le démarrage depuis un salon d'une personne.
  ⚠️ **Le test navigateur a trouvé un défaut de l'ÉCHAFAUDAGE, pas du jeu** : le relais local
  imposait `self:false` aux trames binaires alors que le canal Ludo demande `self:true`. Il
  mémorise désormais cette option à la jonction. Une partie à client unique a été vue à l'écran :
  les trois choix sont exclusifs, ils produisent 2, 3 et 4 camps, et Bot Soleil joue dans le duel.
  Ce banc ne juge toujours ni le plaisir d'une partie entière, ni le
  niveau stratégique des bots.

- **`tools/verify-maire.mjs` — 113 contrôles, 113/113 (480, étendu au 481).** L'AUDIENCE CHEZ LE MAIRE, JOUÉE.
  ⚠️⚠️⚠️ **C'est le premier banc du dépôt qui JOUE une mécanique de bout en bout au lieu de la
  relire** — quatre cents entretiens par propriété, balayés sur cinq maires × deux mondes (plans en
  main / mains vides) × quatre crans de confiance × dix vitesses de réflexion, de zéro à neuf
  secondes. Un banc qui aurait vérifié « chaque nœud a trois réponses » et « l'idéale rapporte plus
  que la tiède » aurait été **vert sur une négociation ingagnable**, et il l'a été : trois
  réétalonnages ont été nécessaires, tous imposés par des entretiens joués.
  Il mesure : la table (trois réponses jouables par nœud dans les DEUX mondes, une idéale / une
  tiède / une faute, une seule faute caricaturale, une seule fin immédiate, aucune famille
  d'argument gagnante plus d'un tiers du temps) · les textes par JOINTURE dans les deux langues,
  **justification comprise** (une réplique sans son « pourquoi » échoue) · **la négociation elle-même**
  (le jeu parfait gagne toujours, le jeu tiède ne gagne JAMAIS même en martelant à zéro seconde,
  une faute se rattrape et trois non, enchaîner paie plus que le même nombre de bonnes réponses
  dispersées) · **la rejouabilité hôte = client au dixième de point près** sur soixante
  transcriptions · l'état persisté · la posture, balayée sur toute la jauge et monotone.
  ⚠️⚠️ **ET IL IMPRIME CINQ ENTRETIENS EN CLAIR À LA FIN.** C'est ce qui a trouvé le seul défaut que
  soixante-dix contrôles verts ne voyaient pas : le sans-faute atteignait le plafond au SEPTIÈME
  nœud sur treize, donc la seconde moitié de la « vraie discussion longue » ne pouvait plus rien
  changer. *Un banc de dialogue qui ne montre jamais un dialogue mesure des nombres sur un texte
  que personne n'a relu* (§25 de `components/ferme/README.md`, transposé au terminal).
  ⚠️ Il tient aussi un lien entre deux nombres réglés à la main de deux côtés différents : le
  plafond de fuite (`MAYOR_DRAIN_CAP`) doit rester SOUS la plus faible des répliques idéales, sinon
  la promesse « aucune hésitation ne coûte plus qu'une bonne réponse ne rapporte » devient fausse
  chez le maire le plus hostile — et ça se croise en changeant un seul des deux (§8 de `CLAUDE.md`).

  ### ⚠️⚠️ ZIP 481 — QUARANTE ET UN CONTRÔLES DE PLUS, ET DEUX D'ENTRE EUX SONT NÉS D'UN DÉFAUT VU EN JOUANT

  **§8 l'humeur.** Cinq crans annoncés par la secrétaire avant qu'on monte. Deux contrôles qui
  s'OPPOSENT, et c'est le point : l'humeur doit se sentir (l'écart entre la meilleure et la pire
  n'est pas cosmétique) **et** « très mauvaise » doit rester gagnable en jouant sans faute, sur les
  dix combinaisons maire × monde. Sans le second, on aurait refait le mur du 480 — une difficulté
  empilée n'est pas plus difficile, c'est un mur, et un mur ne se règle pas, il se retire.
  Symétriquement, « très favorable » ne doit pas signer toute seule sur des réponses tièdes.

  **§9 le rendez-vous.** ⚠️⚠️⚠️ **IL JOUE AVEC DE VRAIES DATES (`Date.now()`), ET C'EST TOUT LE
  SUJET.** Le défaut qu'il attrape a été trouvé EN JEU, pas ici : `mayorApptWaitMs` écrivait
  `now | 0` sur un horodatage de 1,78 × 10¹², l'opérateur tronque à 32 bits signés, et la secrétaire
  annonçait « il vous reçoit dans 29778439:55 ». Un banc qui passe `at: 1000` ne peut PAS voir ça —
  et c'est un idiome juste partout ailleurs dans ce dépôt, parce que partout ailleurs il s'applique
  à de petits entiers. *Un idiome qu'on écrit sans y penser cesse d'être un idiome le jour où on
  change ce qu'il mesure.* Le banc mesure aussi que le tirage d'humeur atteint les cinq crans et
  reste en cloche, que l'attente vaut 3, 4 ou 5 minutes et jamais autre chose, qu'un rendez-vous ne
  se re-tire pas (sans quoi on redemanderait jusqu'à « très favorable »), qu'il se périme mais se
  remplace, qu'il n'est jamais celui d'un autre, et **que l'humeur annoncée est celle de
  l'entretien** — la secrétaire ne ment pas.

  **§10 la porte claquée.** Trois choses distinctes, donc trois champs : la fin de l'entretien, le
  quart d'heure réel, la rancune. Le banc vérifie qu'elle est offerte à TOUS les nœuds sans jamais
  entrer dans les « exactement trois réponses », que l'hôte la rejoue et arbitre lui-même la
  sanction, que l'accueil refuse pendant quinze minutes puis rouvre **sur une humeur exécrable, une
  seule fois**, et que le menu développeur (« effacer ») emporte le blocage ET la rancune.

  **§11 la vue, remplie pour de vrai.** ⚠️⚠️⚠️ **CE CHAPITRE EXISTE PARCE QU'UN DÉFAUT A ÉTÉ TROUVÉ
  EN JOUANT ET QU'AUCUN DES 72 CONTRÔLES DU 480 NE POUVAIT LE VOIR** : l'interface affichait
  « Scrutin dans **Lui** jours. » Elle DEVINAIT quel argument passer à chaque justification (« s'il
  y a un type, c'est une affinité ; sinon c'est un scrutin ») et les deux raisons de scrutin en
  portent un. Tout était apparié, tout était affiché, tout comptait pour lu. *Un texte à trous ne se
  vérifie pas en comptant ses clés : il se vérifie en le REMPLISSANT.* Le banc rend donc toutes les
  justifications que le résolveur sait produire, dans les deux langues, et refuse « undefined »
  comme il refuse un mot là où il faut un nombre. **Vérifié : il ÉCHOUE quand on retire la
  correction** (§10 de `CLAUDE.md` — un banc qui n'a jamais pu échouer ne vaut rien).
  ⚠️ Il importe aussi `components/ferme/maireBureau.js` — le décor 3D — pour tenir la jointure que
  le §7 de `maire.js` promet depuis le 480 : les **sept** postures de la mécanique sont les sept
  postures dessinables, les **huit** visages aussi, aucune pose n'oublie un canal (une pose
  incomplète fige un membre), et le visage ne se ferme jamais pendant que la jauge monte.

- **`tools/verify-compo.mjs` — 13 contrôles, 13/13 (440).** LA COMPOSITION DES DÉCORS, sur toute la carte.
  ⚠️ Il existe parce que Guillaume a vu « un arbre sur un pont » et qu'aucun des quinze autres
  bancs ne pouvait le voir. La grandeur qui manquait tient en une phrase : **le générateur raisonne
  en CASES, le rendu dessine des sprites de CINQ cases de large, et rien ne comparait les deux.**
  Un pont occupe une case et en couvre cinq ; une clôture en occupe une et en couvre quatre. Tout
  ce qui est posé après tombe librement dans les cases COUVERTES sans être OCCUPÉES — ça ne bloque
  rien, ne casse aucun trajet, ne lève rien. Ça se voit, et c'est tout.
  Il mesure : rien de planté ni de posé sur un ouvrage (tablier, ponton, allée, dallage, eau) ·
  **l'ouvrage dessiné couvre exactement son tablier** (le contrôle qui justifie `TOWN_BRIDGE_SPAN`)
  · aucun arbre dans le corps d'un décor · aucun décor dans le corps d'un autre · **aucun ouvrage
  linéaire en tronçon isolé** (une clôture de quatre cases seule au milieu d'un pré est légale,
  propre, et ne veut rien dire : ce qui fait un garde-corps, c'est qu'il COURE).
  ⚠️ **Il a trouvé six défauts à sa première exécution**, dont deux saules au milieu du tour de
  l'étang (trois passes de pavage testaient `solid`, or un arbre n'est pas solide dans cette
  couche) et deux nénuphars sur la même case.
  ⚠️⚠️ **ET IL IMPRIME CE QU'IL NE SAIT PAS MESURER, À CHAQUE LANCEMENT** : les 137 décors
  procéduraux (étal, kiosque, statue, puits, tombe) n'ont pas de taille lisible hors de
  `fermeArt.js` et comptent pour une case. C'est la seule chose qui empêche de lire « verify-compo
  passe » comme « la composition est bonne ». Recopier leur largeur dans les constantes serait le
  doublon du §8 dans l'outil censé nous en protéger : **un trou déclaré vaut mieux qu'un doublon
  silencieux.**

- **`tools/render-mairie.mjs` — l'intérieur de l'hôtel de ville, 11 contrôles (438, refondu au 439).** Un intérieur
  ne se vérifie pas en le lisant : le tribunal du 426 a livré **six pièces inaccessibles sur
  dix-sept** — une colonne posée devant une porte, écrites à cent lignes l'une de l'autre — et
  personne ne l'avait vu à la relecture. Celui-ci DESSINE le plan de chaque niveau et contrôle ce
  que la connexité ne dit pas : chaque pièce est meublée (une pièce nue dans un bâtiment public se
  lit comme une pièce oubliée), **aucun meuble n'a été refusé** par le garde-fou des portes (un
  refus n'est pas un incident, c'est une pièce appauvrie **en silence** — il a trouvé deux portes
  de l'étage posées sur une rangée de colonnes), et surtout **la mairie ne ressemble pas au
  tribunal** : on compte les meubles qu'elle ne partage pas avec lui (11 sur 23). À zéro, on aurait
  dessiné deux fois le même couloir.
  ⚠️ Il rejoue le générateur en interceptant `console.warn` : c'est la seule façon de compter les
  refus sans recopier la règle qui refuse.


- **`tools/render-arbres.mjs` — 11 essences × 3 saisons, 9 contrôles (437).** Il existe parce
  que `oakTree` (trois `arc()`) et `pineTree` (quatre triangles) n'avaient **jamais** été
  regardés : écrits dans les premiers zips, jamais retouchés, pendant que la rue prenait un
  motif de 64 px (434) et la falaise ses assises (436). C'est le constat de tête de
  `CLAUDE.md` appliqué aux arbres.
  ⚠️⚠️ **SON CONTRÔLE CENTRAL A ÉTÉ ÉCRIT QUATRE FOIS, ET C'EST LA LEÇON DU 438.** Le 437
  mesurait le « grain » — le nombre de frontières de ton par pixel — **en le prenant pour de la
  qualité**. Verdict de Guillaume sur le résultat : « c'est dégueulasse […] vraiment sale ». *Le
  grain montait, la propreté baissait, et le banc applaudissait.* Trois rédactions ont suivi :
  « le pixel isolé » (elle accusait la pointe d'un rameau de saule et le cœur d'une fleur —
  **elle interdisait le pixel art**), « les îlots de moins de quatre pixels » (elle accusait les
  éclats d'un dégradé, 20 % sur des dessins propres), et enfin la bonne : **les îlots qui flottent
  dans un APLAT**, tout leur pourtour d'une seule couleur, en connexité à **huit** voisins — à
  quatre, un cerne d'un pixel en diagonale n'est plus connexe et le banc accuse le contour
  lui-même. Mesuré : ancien chêne **1,3 %**, nouvelles essences **0 à 0,4 %**.
  Il contrôle aussi qu'aucun pixel ne touche le bord du canevas (le piège n°1 des sprites, §4) et
  que les trois silhouettes saisonnières sont identiques au pixel près (**un arbre qui change de
  forme en changeant de couleur se lit comme un autre arbre**).
  ⚠️ Il appelle `A.townTreeKind` sur les **859 arbres de la carte** : aucun saule loin de
  l'eau, aucun pommier hors du verger, aucune essence au-delà de 39 % du total.
  ⚠️ **Il a trouvé trois défauts à la première passe** : la flèche du cyprès sortait du canevas
  par le haut (rabotée en silence), le liseré clair faisait le TOUR du houppier au lieu de son
  seul bord nord-ouest (l'arbre était détouré en vert vif), et le bouleau sortait **en beignet**
  — huit bouquets sur un anneau étroit ne couvrent pas le centre.

- **`tools/render-parc.mjs` — le parc, les deux rives du lac du sud, LE PONT et LE SENTIER DE
  L'EST, 31 contrôles, 31/31 (437, + le pont au 439, + le bois au 440).**
  ⚠️ **440 — son chapitre 6 mesure une FIN, et une fin est difficile à mesurer** : « le chemin
  s'arrête » est vrai de la mauvaise version comme de la bonne. Ce qui les sépare tient en trois
  grandeurs, et aucune n'est la longueur — il est CONTINU tant qu'il est à découvert (une coupure
  avant le bois, c'est le défaut de départ déplacé de cinquante cases), il devient LACUNAIRE avant
  de cesser (sinon c'est une coupe nette, donc le défaut lui-même), et il ne rétrécit JAMAIS à une
  case (le piège payé quatre fois au 437, qui frapperait ici au moment précis où l'on veut que le
  chemin se fasse oublier). Plus le bois : gradient de densité mesuré par tranche de profondeur
  (**lisière 10 % · taillis 40 % · futaie 62 %**) et lisière qui ondule AUTOUR de sa pente.
  Deux planches neuves : `sentier-est.png`, `sentier-bois.png`.
  ⚠️ **439 — il dessine quelqu'un DEBOUT SUR LE PONT**, et c'est tout l'intérêt de sa nouvelle
  planche (`pont-praticable.png`) : à l'échelle du parc, un pont traversé et un pont franchi font
  la même tache brune. Il faut voir le passant dépasser du garde-corps du fond et être coupé aux
  mollets par celui du devant — c'est ça, et rien d'autre, la preuve qu'on marche dessus. Il
  vérifie aussi que la flèche de l'arc atteint son sommet, retombe à zéro à ses deux têtes (sinon
  le raccord avec le chemin est une marche), ne monte aucune case hors tablier, et **ne touche pas
  `tw.elev`** — passée dans l'altitude de collision, elle aurait rendu les deux ponts
  infranchissables.
  ⚠️⚠️ **C'EST LA PREMIÈRE PLANCHE DU PROJET OÙ L'ON VOIT UN MORCEAU DE VILLE À PEU PRÈS
  COMME LE JOUEUR LE VOIT**, et c'est une réponse partielle à l'angle mort nommé en §10 de
  `CLAUDE.md`. Les six bancs du 434-436 peignent chacun SA surface et approximent le reste ;
  celui-ci assemble tout ce qui vit hors de la closure — herbe, revêtement (gravier compris),
  massifs fleuris, berge, eau, arbres — et ne refait que la mise en FILE des props.
  Ce qu'il mesure : la plus longue suite de colonnes dont la rive est à la même rangée (**24
  au premier jet, 4 aujourd'hui**, quai maçonné exclu — un ouvrage EST droit) ; le nombre de
  criques profondes et de replis, **ce dont une `shore(x)` est incapable par construction** ;
  l'écart-type de la largeur du haut-fond (**0,91 case** : à zéro, le lac est peint au
  pochoir) ; l'écart parc↔place ; la surface fleurie et le nombre d'espèces ; et surtout
  **qu'aucun des cinquante décors semés n'a les pieds dans l'eau ni ne bouche une allée**.
  ⚠️ **Il a trouvé trois défauts** : la promenade de l'étang en escalier d'une case, le
  sentier de rive qui épousait chaque encoche de crique, et un buisson enterré sous le parvis
  du kiosque — posé sur de l'herbe, dallé par une passe ultérieure, resté SOLIDE.

- **`tools/verify-vallee.mjs` — 208 contrôles, 208/208 (hors-zip 2026-08-26 ; 205 au 465, 200 au 444, 194 au 440, 182 au 438, 172 au 431, 113 au 427).** Il
  importe le VRAI moteur : circulation, murs invisibles ET décors traversables, géométrie des
  bâtiments, rebords sautables, le tribunal pièce par pièce, la coupe de bois, les familles,
  la garde-robe.
  ⚠️⚠️ **DEPUIS LE 431 IL JOUE DES VENTES ET COMPTE LES PIÈCES**, et c'est le seul endroit du
  projet où un banc touche à de l'ARGENT — demande explicite de Guillaume (« l'argent doit bien
  être récupéré »). Six contrôles rejouent une vente complète : l'or crédité, le stock retiré,
  le panier multi-lignes, la barquette de verger **qui ne doit pas être payée deux fois** (trois
  résolveurs créditent `shared.money` eux-mêmes, les autres non), et le refus depuis la ferme
  qui ne doit RIEN changer — ni l'or, ni le stock. Un refus qui retire quand même la
  marchandise serait le pire bogue possible, et il ne lèverait aucune erreur.
  ⚠️⚠️ **DEPUIS LE 428 IL NE VÉRIFIE PLUS DES TABLES, IL REJOUE LE DÉPLACEMENT** — vrai
  suiveur, vraie boîte de collision, vraie règle de dénivelé, 60 images par seconde, sur
  **chaque endroit vers chaque autre** (~16 000 trajets). Le 427 contrôlait ici les
  « itinéraires d'escalier », qui étaient justes : il validait la seule chose qui marchait
  déjà, pendant que 79 % des trajets échouaient. **Aucune assertion sur une structure de
  données ne pouvait voir ça.** Il contrôle aussi la couverture des quartiers BÂTIS (la
  prairie non aménagée est comptée à part, pas ignorée) et la répartition des activités.
  ⚠️ Son seuil d'arrivées est à **100 %, délibérément** : à 24 % comme à 99 %, un seuil plus
  bas dirait OK. **Il a trouvé cinq défauts de navigation au 428**, dont deux — heuristique
  inconsistante, tas qui déborde — étaient parfaitement muets.
- **`tools/render-assise.mjs`** (428) — la pose assise **sur son banc**, debout/assis côte à
  côte, sur les huit tenues. Elle vivait dans la closure du rendu, donc personne ne l'avait
  jamais regardée : on a gardé trois zips un buste tronqué en croyant avoir une pose. ⚠️ Depuis
  le 429 il en dessine **trois** par banc : un occupant unique au milieu d'un meuble ne dit rien
  de ce à quoi ressemble un meuble PLEIN.
- **`tools/render-ruche.mjs`** (432) — **la ruche en trois quarts, l'établi de l'apiculteur
  DANS SES QUATRE ÉTATS et le pot de lavande** (nu / enfumoir / pots de miel / les deux), à leur place réelle et à
  l'échelle de dessin réelle, avec une fermière comme repère. ⚠️ Il existe parce que trois de
  ces quatre états ne s'obtiennent en jeu qu'en attendant le bon moment de la journée de
  René — c'est-à-dire jamais, à la relecture. ⚠️ **Il ÉCHOUE si le vol des abeilles ne passe
  jamais derrière la ruche** : la profondeur est dérivée du même angle que l'abscisse, et une
  régression qui les remettrait toutes devant ne lèverait aucune erreur. ⚠️ Il n'écrit AUCUN
  texte : le faux canvas ne connaît pas `fillText`, les cas sont repérés par un témoin de
  couleur.
- **`tools/render-echelle.mjs`** (429) — **chaque décor à côté d'une fermière**, sur la même
  ligne de sol, avec le rapport de hauteur comparé au repère physique attendu. C'est le seul
  banc qui puisse attraper une erreur d'ÉCHELLE. Il en a trouvé trois du premier coup ; il
  mesure les six métiers d'étal séparément depuis le 431 (ils partagent leur ossature, pas leur
  marchandise).
- **`tools/render-foire.mjs`** (431) — **la RANGÉE d'étals**, pas les étals un par un : avec ses
  guirlandes, ses clients devant, l'arche découpée en deux moitiés comme le fait le jeu, et les
  six métiers en gros plan. ⚠️ C'est le banc qui a montré que la balance du fromager se lisait
  comme une fenêtre, que ses meules jaunes disparaissaient dans la bâche jaune, et que la
  guirlande était mal placée **deux fois de suite**. Aucun des trois ne se voyait à la lecture.
- **`tools/render-tribunal.mjs`** — le mobilier, les décors de rue, les **bâtiments de la
  Haute-Ville** (sur du dallage, à côté de la gare : une cohérence se juge côte à côte) et **la
  garde-robe PORTÉE**. Il a montré la rangée d'étals monochrome (426), le haut-de-forme
  décapité et deux défauts de façade du salon (427).
  ⚠️⚠️ **ET IL MESURE LA SYMÉTRIE DES FAÇADES DEPUIS LE 431** : on replie l'image sur son axe
  et on compte l'écart colonne par colonne. C'est ce qui manquait pour attraper la colonnade du
  tribunal, décalée de six pixels **depuis le 425**. ⚠️ Il ne teste QUE les façades censées
  être symétriques : l'hôtel de ville est asymétrique exprès (beffroi décalé) et l'église porte
  son clocher sur le flanc — les y inscrire reviendrait à demander un jour qu'on les corrige.
- **`tools/verify-taxi.mjs` — 15 contrôles, 15/15 (relancé au 434).**
  ⚠️ **Il était écrit ici « 18 contrôles, 18/18 » : c'était FAUX.** Le fichier du 433 en compte
  quinze — vérifié en le relançant tel quel depuis git. Le chiffre avait été estimé, pas
  obtenu ; c'est exactement ce que la règle d'entrée en tête de ce fichier interdit, et ça
  s'est glissé dans le zip qui a écrit la règle.
  ⚠️⚠️ **ET SON CONTRÔLE D'AXE A CHANGÉ D'UNITÉ AU 434** — même famille de défaut de banc qu'au
  433. Il exigeait un écart absolu de moins de **0,22 case**, seuil qui n'a de sens que dans
  une ville faite de rues de deux cases (où 0,5 = « collé au trottoir »). L'artère élargie à
  quatre cases l'a fait échouer sur une conduite **meilleure** : mesuré par largeur de rue,
  **0,180 de demi-chaussée sur les rues de deux, 0,156 sur l'artère de quatre**. On mesure donc
  la fraction de demi-chaussée (0 = sur l'axe, 1 = roue sur la bordure) : **0,177** aujourd'hui,
  et l'écart en cases reste imprimé à côté. Ce n'est pas un seuil desserré, c'est une unité qui
  a un sens à toutes les largeurs.
  Il rejoue les
  **132 trajets** de la ville image par image avec la VRAIE conduite du moteur
  (`E.taxiStep`) : arrivée, chaussée, ralentissement en courbe, distance de
  freinage.
  ⚠️⚠️ **LE 433 LUI A AJOUTÉ LE CHAPITRE « LA FORME DU TRAJET », ET C'EST LUI QUI
  MANQUAIT.** Les douze contrôles du 432 disaient tous OK pendant que Guillaume
  voyait, en jouant, « une trajectoire stupide, il prend des virages plus que
  nécessaire » : ils mesuraient l'ARRIVÉE, la CHAUSSÉE et la VITESSE, jamais la
  FORME. On mesure donc trois quantités géométriques, obtenues en lançant ce banc
  contre les deux moteurs :

  | | 432 | 433 |
  |---|---|---|
  | aller-retour (dents de scie) | **598** | **0** |
  | rotation cumulée, moyenne | **969°** | **214°** |
  | rotation cumulée, pire | 2095° | 462° |
  | pire détour | ×1,11 | ×1,03 |

  ⚠️ Son Dijkstra de référence est écrit DANS le banc et pas dans le moteur : on
  ne mesure pas un trajet avec l'outil qui l'a produit.
- **`tools/render-taxi.mjs`** (432) — les cinq vues du véhicule sur une ligne de
  sol commune, plus leurs mesures.
  ⚠️⚠️ **DEPUIS LE 433 IL COMPARE DES PIXELS, PLUS SEULEMENT DES NOMBRES DÉCLARÉS**,
  et c'est ce qui manquait : les deux trois-quarts annonçaient `ground = 23` sur
  un dessin qui s'arrêtait cinq pixels plus haut — **à chaque virage, le taxi
  décollait de son ombre** — et la vue « nord-est » montrait une voiture roulant
  vers le **nord-ouest**. Deux invariants les attrapent : la dernière rangée
  peinte DOIT être `ground`, et le cap se lit dans le dessin (le bout le plus bas
  est le plus proche de la caméra, donc le plus au sud).
- **`tools/render-oiseaux.mjs`** (433) — **les pigeons et les colombes, dessinés
  ET rejoués**. Deux bancs en un, parce que les deux moitiés du défaut sont de
  natures différentes : neuf poses par espèce (dont quatre qui durent un
  vingtième de seconde en jeu, donc que personne ne regardera jamais ailleurs
  qu'ici), et **quatre minutes de vie de groupe à 60 images/s**.
  ⚠️⚠️ **SON SECOND CHAPITRE EXISTE PARCE QUE LE PREMIER MODÈLE PASSAIT TOUS LES
  AUTRES CONTRÔLES.** Les oiseaux arrivaient, se posaient, ne restaient pas en
  l'air — et Guillaume a quand même écrit « ils se comportent comme les animaux
  de la ferme ». Ce qui manquait n'était mesuré nulle part, et l'est maintenant :
  la VARIÉTÉ des activités (aucune au-dessus de 55 % du temps, au moins quatre
  différentes), l'IRRÉGULARITÉ de l'espacement (écart-type de la distance au plus
  proche voisin), le fait qu'ils ACCÉLÈRENT (nombre de paliers de vitesse
  distincts), et l'effet du **pain jeté depuis un banc** — il rassemble, il fait
  revenir les absents, il fait se chamailler, et **la mêlée est une ROSACE, pas
  une file indienne** (rapport des axes du nuage : ×1,13 ; une file donne 4).
  ⚠️ Ce dernier contrôle a été écrit APRÈS avoir vu le défaut en jouant : sur un
  point de pain unique, douze pigeons s'empilaient en chenille.
  ⚠️⚠️ **SA GRAINE EST FIXÉE DEPUIS LE 436, ET C'ÉTAIT UNE CORRECTION URGENTE.** Trouvé pendant
  l'audit graphique : il échouait **une fois sur huit** sur « la population se renouvelle —
  0 arrivées en 4 min », sans qu'un pixel du jeu ait changé. `flockStep` tire dans le
  `Math.random` global, et le contrôle demande un événement rare sur quatre minutes simulées.
  **Un banc qui échoue au hasard est pire qu'un banc absent** : il apprend à relancer jusqu'au
  vert, et le jour où il attrape un vrai défaut, on relance. Le banc remplace donc `Math.random`
  par un générateur semé le temps des deux chapitres de simulation — et **le remet en place
  après**, un stub global laissé en vie contaminant tout ce qui suit. Résultat : 3 arrivées, le
  même nombre à chaque lancement.
- **`tools/render-rues.mjs` — 28 contrôles, 28/28 (434).** Le revêtement des rues de Valley
  Town : les trois pavés de 4×4 tuiles assemblés sur six tuiles de côté, puis **quatre fenêtres
  de la VRAIE carte** (l'artère, un carrefour, le cimetière, le bord de l'esplanade) peintes
  par `A.drawTownRoadTile`, c'est-à-dire par la fonction que la boucle de rendu appelle.
  ⚠️⚠️ **IL A REFUSÉ QUATRE DÉFAUTS AVANT QUE GUILLAUME LES VOIE**, et aucun ne se lisait dans
  le code : le goudron était un aplat (écart-type **8,7** → **11,4** après granulat), les pavés
  du papier bulle, les briques un mur neuf, et le nez de bordure était haché tous les 8 px par
  le joint des pierres de taille.
  ⚠️ **La grandeur qui manquait partout est le BOUCLAGE** : un motif de 4×4 qui ne se raccorde
  pas à lui-même dessine une SECONDE grille, tous les 64 px — pire que la tuile unique qu'il
  remplace, et invisible tant qu'on regarde une tuile. Deux mesures, et la seconde décide :
  la couture ne doit pas être plus contrastée que la pire transition interne, **et les formes
  doivent traverser le bord** (40/64 rangées concordantes sur les pavés, 31/64 sur les
  briques ; sans `roadWrap`, ça tombe à zéro).
  ⚠️ **ET LE BANC S'EST TROMPÉ AVANT LE DESSIN** : sa première mesure de couture comparait à la
  MOYENNE des transitions et accusait à tort tout pavage correct (l'intérieur d'une pierre ne
  change pas d'une colonne à l'autre, un joint change beaucoup — la moyenne est tirée vers le
  bas). *Un banc de rendu se vérifie aussi.*
- **`tools/render-eau.mjs` — 16 contrôles, 16/16 (435 ; 14 à l'origine, 2 ajoutés au 436, chapitre 4 bis élargi aux deux axes au 440).** L'eau de Valley Town et sa berge :
  l'étang du parc dans son décor, **la même scène quatre minutes plus tard**, le lac du sud, et
  les **seize configurations de coins** à toutes les profondeurs, hors décor. Il appelle
  `A.drawTownWaterTile` / `A.drawTownShoreTile`, c'est-à-dire les fonctions du jeu.
  ⚠️⚠️ **LA GRANDEUR QUI MANQUAIT EST LA RECTITUDE DU RIVAGE**, et c'est Guillaume qui l'a
  nommée (« les rives sont trop géométriques »). On la mesure comme une côte : la plus longue
  suite de pixels du trait d'eau alignés sur une même ligne. **Ancien rendu : 16 px minimum par
  construction** (une case d'eau était un `fillRect` pleine case, donc le rivage ne POUVAIT pas
  descendre sous une case). Aujourd'hui : **8 px en X comme en Y**, et le seuil est à 16.
  ⚠️ Les trois autres grandeurs, toutes nouvelles : **la continuité** (zéro pixel sec cerné
  d'eau — une erreur d'ordre des bits dans la configuration des coins ouvrirait une fissure
  d'un pixel tout autour du plan d'eau, muette à la relecture et hurlante en jeu) ; **la
  profondeur** (L **160** au bord contre **54** au large, seuil à 25 d'écart — pas la moyenne,
  qui ne dit rien, §8) ; **le contraste** (écart-type **27,4** contre **8,3** pour l'ancienne
  eau, mesuré au 434).
  ⚠️⚠️ **ET LE BANC S'EST TROMPÉ DE GRANDEUR AVANT LE DESSIN, comme celui des rues.** Il
  accusait une rive droite de 21 px : il mesurait la RANGÉE DE SAPINS qui borde le parc, peinte
  en vert-bleu, que son détecteur d'eau (bleu dominant) comptait comme un rivage. Les mesures se
  font donc sur une scène nue — herbe, berge, eau — et la planche garde son décor, parce qu'une
  rive se JUGE dans son décor. *Un banc qui échoue peut se tromper de grandeur exactement comme
  un banc qui passe.*
  ⚠️⚠️ **AJOUT DU 436 — LE CHAPITRE « 4 bis », ET IL EST L'ILLUSTRATION LA PLUS PURE DU §14.6
  DE `CLAUDE.md`.** Les quatre chapitres du 435 disaient tous OK pendant que l'étang rendait une
  **mosaïque de carrés bleus de 16 px** : ils mesuraient la rectitude du RIVAGE, la continuité
  du TRAIT, l'écart bord/large et l'écart-type de la nappe — quatre grandeurs justes, aucune ne
  parlant de la grille INTÉRIEURE. C'est le même défaut que le banc corrigeait au rivage,
  déplacé de deux mètres vers le large. La grandeur qui manquait : **le saut de luminance à
  travers une arête de case, rapporté au saut moyen à l'intérieur d'une case** — si les cases se
  voient, le premier est plus grand. Mesuré en relançant le banc contre les deux moteurs :
  **×3,05 au 435, ×1,27 aujourd'hui.**
  ⚠️ Son cinquième chapitre n'est pas du dessin mais de la RÈGLE, et il a été écrit après avoir
  perdu un décor : en poussant les harmoniques du contour d'un cran, l'étang a mangé la case du
  massif taillé (122, 83). Le générateur refuse poliment de poser un décor dans l'eau — donc
  rien n'a levé, il y avait juste **trois massifs au lieu de quatre**. Il les compte.
- **`tools/render-escaliers.mjs` — 35 contrôles, 35/35 (467 ; 38 au 466, 24 au 465).** Les marches, le parement de
  falaise, le limon et le **dallage d'esplanade** de la Haute-Ville : les quatre matières
  assemblées sur six tuiles de côté **à côté des pavés de rue du 434**, puis les trois vraies
  volées de `generateTownWorld()` dans leur décor.
  ⚠️⚠️ **IL EXISTE PARCE QUE GUILLAUME A VU L'ÉCART QU'AUCUN BANC NE POUVAIT VOIR** : « il y a
  un écart flagrant de qualité de textures » entre le sol pavé et les escaliers du courthouse.
  Et la cause de l'écart n'était pas artistique, elle était structurelle : les revêtements du
  434 vivent dans `fermeArt`, donc `render-rues` les regarde à chaque lancement et ils ont reçu
  quatre refus avant livraison ; les marches, la falaise, le limon et le dallage vivaient dans
  la **closure de `drawTownFrame`**, donc aucun outil ne pouvait les rastériser. Ils sont restés
  au dessin du 425 pendant que tout le reste du sol de la ville passait au motif de 64 px.
  **Un dessin qu'aucun banc ne peut appeler est un dessin qui vieillit tout seul.**
  ⚠️ **LA GRANDEUR NEUVE DU 436 ÉTAIT LA PARITÉ DE MATIÈRE**, c'est-à-dire la phrase de
  Guillaume traduite en nombre : mesurer l'écart-type et le nombre de teintes des matières et
  des pavés dans la même passe, puis exiger un rapport plutôt qu'un seuil absolu. Depuis le 467,
  les deux volées principales ont une autorité plus forte : le banc exige que le bloc 268×248
  soit celui de `ESCALIERDETOURE`, qu'il soit dessiné une seule fois, et que ses 12 196 pixels
  transparents laissent le vrai sol dessous. Les matériaux des volées de service gardent le
  contrôle de parité.
  ⚠️ **LE DALLAGE EN EST EXEMPTÉ, AVEC SA RAISON ÉCRITE** (comme `render-rues` exempte le
  goudron du contrôle de continuité) : une esplanade est faite de peu de grandes pierres, sa
  matière tient dans l'écart d'une dalle à l'autre. On le mesure donc **contre ce qu'il
  remplace** — écart-type **10,1 (425) → 32,4 (436)**, et **plus aucune période de 16 ni de
  32 px** (r = −0,04 et −0,29 à l'autocorrélation).
  ⚠️⚠️ **ET IL A TROUVÉ DEUX DÉFAUTS QUE PERSONNE NE CHERCHAIT :**
  - **22 marches sur 52 étaient dessinées PERPENDICULAIREMENT à leur volée** — sur les trois
    volées de la ville. Le sens de la montée se déduisait du gradient d'altitude lu sur les
    quatre voisines, terrain compris : ça marche au milieu d'une volée et ça bascule sur son
    bord, où la case du dessus est de la terrasse. Corrigé en ne regardant que les voisines qui
    sont elles-mêmes des MARCHES (en travers, une volée est de niveau par construction). Avec
    les quatre traits gris du 425 ça ne se voyait pas ; en pierre, c'est la première chose
    qu'on voit ;
  - **la période de la volée**, que le banc a d'abord mal mesurée deux fois (voir plus bas).
  ⚠️⚠️ **CE BANC S'EST TROMPÉ DE GRANDEUR TROIS FOIS AVANT QUE LE DESSIN SOIT EN CAUSE**, et
  c'est la troisième fois d'affilée (rues 434, eau 435). Ça vaut d'être su :
  1. compter les « nez de marche » sur UNE colonne → 29 nez pour 16 marches (le granulat fait
     sauter n'importe quelle colonne) ;
  2. les compter sur la moyenne par rangée → 32, soit exactement deux fois trop : une marche a
     DEUX montées de luminance (contremarche → dallage, puis ombre portée → nez). Il aurait
     fallu un seuil réglé pour n'en garder qu'un sur deux, c'est-à-dire un seuil réglé sur le
     résultat. On mesure donc la PÉRIODE par **autocorrélation** — aucun seuil de couleur, et
     on prend le **fondamental** et non le pic (un signal de période 4 corrèle aussi bien à 8) ;
  3. comparer le nombre de teintes du dallage neuf à celui du damier du 425 : **le damier en
     comptait 49 contre 24**, et il aurait donc « gagné ». Ses deux gris étaient recouverts de
     quatre voiles alpha, et chaque combinaison fabriquait une teinte de plus. **Compter les
     couleurs d'une image composée en alpha, c'est compter des accidents de mélange.**
- **`tools/import-escaliers-assets.mjs` (467).** Conserve les cinq matériaux de
  service issus de `refs/ASSETS.jpg`, puis importe `refs/ESCALIERDETOURE.png`
  comme **un seul bloc 268×248**. Le masque retire treize composantes grises
  d'au moins 12 pixels et protège les gris légitimes, dont la plus grande
  composante ne fait que 9 pixels. Aucune quantification : les pixels natifs
  sont encodés tels quels en courses RLE. `tools/out/escaliers-assets-importes.png`
  montre le bloc sur fond vert après chaque modification du masque.
- `verify-constants` · `verify-objects` · `verify-strings` · `verify-syntax` · `verify-gates` ·
  `verify-cycle` · `verify-orchards` · `verify-scope` · `verify-vergers` · `render-fruits`.

---

## `verify-pont.mjs` — le passant reste-t-il entre les deux garde-corps ? (441)

`node tools/verify-pont.mjs` — **12/12.**

⚠️⚠️ **IL EXISTE PARCE QUE DEUX CONTRÔLES JUSTES ÉTAIENT AU VERT PENDANT QUE LE PONT ÉTAIT
INTRAVERSABLE AU REGARD.** `verify-vallee` mesurait « le dos d'âne existe » (20 cases) et « il ne
touche pas la collision » (0 case polluée). Personne ne comparait **la clé de tri du passant à
celles des deux moitiés du pont** — et c'est là qu'était le défaut : sur la rangée nord des DEUX
ponts, le fermier disparaissait entièrement derrière le garde-corps du fond. La question utile
n'était pas « où est le bogue » mais, comme les six fois d'avant, *quelle grandeur ne mesure-t-on
pas*.

- **il APPELLE les trois clés, il ne les recopie pas.** Elles vivaient dans la closure de la
  boucle de rendu ; elles sont dans `fermeConstants.js` (`townDepthKey`, `townBridgeDepthKeys`,
  `townWalkerDepthKey`), le jeu les appelle, le banc les appelle. *Une formule réécrite ne diverge
  jamais d'elle-même* (§3 du 439) ;
- **il rejoue la faute pour en mesurer le coût** : 10 cases de tablier sur 20. Un banc qui passe
  au vert sans jamais avoir pu passer au rouge ne prouve rien ;
- **un garde-fou de SOURCE** interdit qu'une hauteur d'image (`archPxTown`, `TOWN_JUMP_ARC_PX`)
  reparte dans l'argument d'ALTITUDE de `pushE` — ce que les chapitres de données ne peuvent pas
  voir, puisqu'ils ne lisent pas la closure.
  ⚠️⚠️ **ET SA PREMIÈRE ÉCRITURE NE SCANNAIT RIEN.** `/pushE\(([^;]*)$/` est ancré sur la fin de
  ligne : il ne peut pas matcher une ligne qui se termine par `;`, c'est-à-dire la quasi-totalité
  des appels. Il annonçait « 0 appel fautif » après n'avoir lu que les appels coupés en deux
  lignes, et il est **passé au vert sur une faute injectée exprès**. D'où le compte d'appels VUS
  (26) : la seule façon de s'apercevoir qu'un scanner ne scanne pas.

---

## `render-eglise.mjs` — la nef et la tribune, en plan (441)

`node tools/render-eglise.mjs` → `eglise-nef.png` · `eglise-tribune.png`. **13/13.**

Écrit **avant le premier `fillRect`**, pas après : c'est le corollaire du §4.2 de `CLAUDE.md`.
Il APPELLE `drawChurchFlagTile` et `drawChurchGlass` (nées dans `fermeArt.js` pour cette raison),
donc il juge le jeu et pas sa maquette.

Il a trouvé, à l'exécution, ce qu'aucune lecture n'aurait trouvé : le chœur en parquet, une
couture d'usure à bord franc, la période des bancs, une poche murée et vide à l'étage, et — dès
la première exécution des variantes de bout — que **le miroir d'un `pewL` est un `pewR`**.

⚠️ **SON CONTRÔLE DE SYMÉTRIE A DÛ ÊTRE RÉÉCRIT.** Comparer toute la largeur échouait *à raison
de son point de vue et à tort sur le fond* : une église a UN clocher, UNE chaire, UN
confessionnal. Il compare donc le VAISSEAU entre les colonnades, **annonce** le périmètre exclu,
et vérifie séparément que les deux bas-côtés sont meublés — sinon « asymétrique » finirait par
vouloir dire « vide d'un côté ». *Restreindre un périmètre sans le dire, c'est le défaut du 439.*

⚠️ **CE QU'IL NE MESURE PAS, ET IL LE DIT :** il ne joue pas (l'orgue, les cierges et l'assise
passent par la touche E), et **il ne dessine pas la vue plongeante** — elle est peinte dans la
closure du rendu, la redessiner serait juger sa propre maquette. Le contrôle 4 mesure donc ce qui
est mesurable (le vide existe, aucun mur ne le bouche), et la planche montre un plancher nu.
**C'est en jouant, et là seulement, qu'on voit si la tribune donne sur quelque chose** — elle n'y
donnait pas, d'une rangée.

---

## `render-etoile.mjs` — 161 contrôles, 161/161 (relancé au 480) — les dessins de la quête de l'étoile (444 à 479)

⚠️⚠️ **ZIP 479 — LE §13 REGARDE LE PLAT DE L'ÉTOILE ROSE, ET IL EST NÉ AVEC LUI** (5 contrôles,
troisième dessin de ce chantier à naître avec son banc après la bulle « ! » du 455 et la lueur
du 478). Ce qu'il mesure n'est pas « est-il joli » — aucun banc ne sait le dire — mais la seule
chose dont la MÉCANIQUE dépend : *lit-on la chaleur sans regarder la jauge ?* Donc la couleur de
la soupe (écart rouge/bleu : 105 à chaud, 12 à froid), la hauteur du filet de vapeur, et le fait
que le bol EXISTE encore une fois froid.
⚠️⚠️⚠️ **ET IL A CHANGÉ DE GRANDEUR EN COURS DE ROUTE, APRÈS AVOIR REGARDÉ LA PLANCHE.** Il
comptait les PIXELS de vapeur : 15 à chaud contre 14 à mi-chaleur — vert, et rigoureusement
aveugle, puisque le nombre de points est constant par construction (deux colonnes de cinq) et
que c'est la HAUTEUR qui double. *Un rapport de 1,07 entre deux extrêmes n'est pas un contrôle,
c'est un tirage au sort.* Treizième forme du « banc qui passe » de `CLAUDE.md`.
⚠️ **Le dessin lui-même a été refait pour la même raison** : le premier jet passait les cinq
contrôles et se lisait comme une GÉLULE surmontée de trois ballons. Une écuelle a une lèvre, un
creux et un cerne ; la vapeur est un filet, pas des bulles.


⚠️⚠️ **ZIP 469 — LE §14 REGARDE LA FOUILLE, ET IL EST NÉ AVEC ELLE** (22 contrôles) : la
pose accroupie (pieds au sol, quatre images distinctes, les deux mains en OPPOSITION DE
PHASE, le geste qui suit le côté du cratère), la terre (elle s'ACCUMULE au fil des trois
secondes, le tas sort du bon côté, la gerbe et le coup de main viennent du même nombre), la
jauge (elle avance vraiment de 0 à 100 %), le médaillon (l'étoile éclaire plus que le vide,
le fond est plus sombre que la lèvre, la poussière retombe encore) et la plaque météorique
(écart-type de luminance > 14 : elle est ÉCLAIRÉE, pas coloriée).
⚠️ **Il a jeté DEUX jets de la pose et un du médaillon avant que l'écran ne les valide**, et
il a corrigé DEUX de ses propres mesures : la luminance MOYENNE punissait l'étoile (son halo
ajoute des pixels faibles) — on somme la lumière ÉMISE, hors de la cuvette ; et le HAUT de
l'encre trouvait le crâne au lieu de la main — on mesure le BAS, sous la tête.
*Un banc de rendu se vérifie aussi.*


Le §8 ter appelle le véritable impact de ferme à trois âges. Il exige que la
chaleur de contact soit brève, que la terre prenne le relais, que la gerbe
s'ouvre et monte, puis qu'elle retombe avant sa coupure. La planche comète montre
les quatre temps sur une même ligne ; elle a surtout servi à repérer puis casser
le cerceau doré que les gros pixels reformaient dans le navigateur.

Au 464, le fragment garde une rotation rapide mesurée entre deux images, mais
son centre ne zigzague plus : `starFarmFlightPath` fixe une direction légèrement
différente par impact et impose une avance monotone. La petite irrégularité de la
traîne est elle aussi stable dans le temps ; le mouvement visible vient de la
silhouette tournante, pas d'un cap réécrit à chaque image.

Au 465, la planche place la reine native 28×28 à côté des petites 18×18 et exige
au moins deux fois leur nombre de pixels de matière : une taille obtenue par
agrandissement ne pourrait pas passer ce contrôle. `render-escaliers` produit en
plus les planches de l'escalier. Au 467, l'ancien contrôle de recomposition est
supprimé avec la recomposition elle-même : `escaliers-bloc.png` montre le bitmap
268×248 unique sur fond vert. Le banc verrouille ses dimensions, son masque, son
ancrage, l'absence d'anciens accessoires et d'arbres au premier plan, puis joue
la chaîne physique dans les deux sens et compare sa hauteur aux marches peintes.

### ⚠️⚠️⚠️ ZIP 459 — LE PREMIER BANC DU DÉPÔT QUI **JOUE** AU LIEU DE MESURER

Section **7**, réécrite de fond en comble. Le 458 y vérifiait une INÉGALITÉ (« marche en montée
− glissade ≥ 1 case/s ») ; c'était un raccourci algébrique vers la vraie question, et la vraie
question est celle que le §25 de `components/ferme/README.md` reproche à tous les bancs du dépôt
de ne jamais poser : **est-ce qu'on ARRIVE ?** Le banc prend maintenant `Q.starSlipStep` — la
machine d'état pure de la glissade —, lui donne le VRAI creux (`starCraterSink`), tient une
direction à 60 images par seconde depuis **317 points de départ** répartis dans toute la cuvette,
et regarde si le fermier **sort du trou**. Verdict imprimé : *0 bloqué sur 317, pire cas 4,7 s.*

⚠️⚠️ **ET LA SIMULATION A PAYÉ AVANT MÊME D'ÊTRE UN BANC.** Le premier jet du moteur gageait le
compteur d'effort (« 3 s de la même direction ») sur « est-ce que je monte ? ». Or en dévalant on
DÉPASSE le point bas de quelques centimètres : la pente s'inverse sous les pieds, le pas tenu
devient « une descente », le compteur repartait de zéro. Mesuré : **219 points bloqués sur 317**,
c'est-à-dire une grimpe qui n'existait pas — et rien de tout ça n'était visible en relecture, ni
au build, ni à l'œil sur trois essais en jeu. *Quand on peut JOUER une propriété, on la joue.*

Les six autres contrôles de la section tiennent l'intervalle plutôt qu'un seuil, parce que chacun
échoue **dans les deux sens** : le plancher marchable (1,55 à 2,80 case — sous 1,5 la demande
« il peut se déplacer sur ses pieds » est morte, au-dessus la paroi n'existe plus), la crête de
la glissade (elle doit se sentir, elle ne doit jamais dépasser la marche), la déviation latérale
(assez pour viser, pas assez pour piloter), le freinage (il ne doit PAS marcher), et la grimpe
cramponnée (même vitesse partout : si la pente y entrait encore, ce ne serait pas une prise).

⚠️ **Un septième confronte la DÉDUCTION au moteur** : `starSlipSeen` rend la pose d'un joueur
distant à partir de sa seule vitesse (aucun champ réseau de plus, §3 de `CLAUDE.md`). Le banc joue
une descente-remontée complète et compare image par image — **209 sur 209** sur les images où ça
va vite ou où l'on grimpe. Il ne l'exige PAS sur la queue de la glissade (le fermier finit de
s'immobiliser au fond, à trente centimètres près) : là, « il dérape encore » et « il est debout »
sont indiscernables de l'extérieur, et exiger l'accord demanderait de la MÉMOIRE chez celui qui
regarde, donc un état par joueur distant, donc quelque chose qui dérive au premier paquet perdu.
*On préfère un désaccord nommé à un état à réconcilier.*

### ⚠️⚠️ ZIP 459 — LES TROIS POSES, ET LE STUB MENTEUR QUI LES A DÉCLARÉES VIDES

Section **12**, huit contrôles, planche `etoile-poses.png` (quatre tenues × six colonnes). Elle
mesure ce que `render-assise` mesure depuis le 428, pour les mêmes raisons payées : **les pieds
restent au sol** (une pose ancrée ailleurs FLOTTE), **rien ne touche le bord du cadre** (le canevas
découpe en silence), et **les quatre images de la grimpe sont vraiment quatre** (au 449, deux poses
de la compagne sortaient identiques au pixel près). Deux contrôles de plus disent ce que la demande
disait : la glissade **penche en arrière** (centre de gravité des épaules comparé entre deux
dévalements opposés) et **s'accroupit**, et le cycle de grimpe est **contralatéral**.

⚠️⚠️⚠️ **ET IL A FALLU VÉRIFIER LE BANC AVANT DE CROIRE SES QUATRE ROUGES.** Une feuille de
personnage empile ses trois orientations avec `g.translate`, **que le faux canevas IGNORE** (§10 de
`CLAUDE.md`) : sur un banc, les rangées « de dos » et « de profil » sont VIDES. Une pose demandée
en rangée 1 n'y dessine rien du tout, et le banc conclut « la pose est vide » sur un dessin
parfaitement correct dans le jeu. `render-assise` prend la rangée 0 depuis le 428 sans avoir
jamais écrit pourquoi ; c'est écrit maintenant, aux deux endroits.

⚠️ Un neuvième contrôle, dans la section de la POUSSIÈRE, mesure une grandeur qu'aucun des cinq
autres ne mesurait : **où** elle est. Les cinq disaient sa vie (elle s'ouvre, elle s'éteint, elle a
deux tons) ; aucun ne disait qu'elle enveloppait la TÊTE du fermier au lieu de sortir de sous ses
semelles — cinquième forme du défaut de banc (« il mesure ce qu'une chose EST et jamais OÙ »).
⚠️ Et son contrôle de teinte a dû être corrigé dans le même zip : il lisait la couleur **composée
sur du noir transparent** (34 % d'opacité → 52 de rouge au lieu de 152) et ne passait que parce
que huit bouffées empilées finissaient par saturer. Il mesurait un empilement, pas une palette.

### Section 13 — la bulle d'ouvrage de Tristan (459)

Cinq contrôles. Elle a **deux mouvements**, et ils répondent à deux questions différentes : la scie
qui va et vient dit « c'est en train de se faire MAINTENANT », le trait de scie qui s'enfonce dit
« on approche ». Un dessin qui n'aurait que le premier serait un moulin ; que le second, une barre
de progression. ⚠️ Le trait est compté **en pixels sombres**, pas déduit d'un « les deux images
diffèrent » : deux images peuvent différer par la seule sciure qui tombe, et le contrôle serait
passé au vert sur un trait immobile.

### ⚠️⚠️ ZIP 456 — LA JAUGE DE POSTURE, ET UN SEUIL DE BANC QUI A DÛ BAISSER

Section **11**, six contrôles, plus la planche `etoile-jauge.png`. La jauge répond à la seule
question que le chantier ne posait à personne (« est-ce que je fais bien ? ») ; elle est née **avec
ses mesures**, comme la bulle du 455. Ce qui est mesuré est ce qu'une capture ne montre pas : la
**monotonie** (balayée sur 31 valeurs — une barre qui recule d'un pixel dit au joueur qu'il a perdu
du temps), le fait qu'elle soit **vide à zéro** (une barre qui commence à 2 px promet une avance qui
n'existe pas), et que l'état « ça ne compte pas » se distingue **au CADRE et pas à la longueur** —
sans quoi une barre courte et une barre en attente se confondent, ce qui est exactement la
confusion à éviter.

⚠️⚠️ **ET LA PLANCHE A ATTRAPÉ CE QUE LES SIX CONTRÔLES LAISSAIENT PASSER, DU PREMIER COUP** : tous
verts, et la jauge **VIDE avait disparu dans le sol** — cadre brun sombre sur la terre brune du
cratère. Or l'état vide est celui qui doit se voir le plus, puisque c'est celui où le joueur cherche
quoi faire. Le cerne est passé au clair. *Un contrôle vert ne dit pas si c'est joli* (§25 de
`ferme/README.md`), et c'est la deuxième fois en deux zips qu'une planche paie.

⚠️⚠️ **UN SEUIL A BAISSÉ AVEC LE DESSIN, DANS LE MÊME ZIP, ET C'EST LA SEULE FAÇON HONNÊTE DE LE
FAIRE.** Guillaume a trouvé le « ! » trop gros (11×13 sur une tête de 16 px) ; le contrôle « elle
reste lisible ensuite » mesurait la taille d'AVANT (≥ 8 px) et refusait donc la correction. Il est
passé à ≥ 6 px **en le disant**. *Un seuil de banc n'est pas une vérité, c'est la décision du jour
où on l'a écrit : quand la décision change, il change avec elle et il dit lequel des deux a bougé.*


### ⚠️⚠️ ZIP 455 — LA BULLE « ! » EST REGARDÉE DÈS SA PREMIÈRE LIGNE, ET LE BANC S'EST TROMPÉ DEUX FOIS

Sections **9** et **10**, treize contrôles. Le dessin est neuf (`drawEmoteBubble`, `starFragments`)
et il a ses mesures **le jour où il est écrit** — c'est la leçon du sillon prise à l'endroit : un
dessin qu'aucun banc n'appelle reste au niveau du jour où il a été écrit, et le sillon a mis dix
zips à s'en apercevoir.

⚠️⚠️ **CE QU'ON MESURE EST CE QU'UNE CAPTURE NE MONTRE PAS :** que le point du « ! » est **séparé**
du fût par une rangée pleine (collés, à six pixels de haut, un « ! » devient un « l ») · que la
bulle **sursaute** à l'apparition au lieu de grandir régulièrement (une bulle qui s'ouvre
proprement se lit comme une interface, un sursaut se lit comme une réaction) · qu'elle **disparaît
pour de bon** et ne laisse pas de fantôme à 1 % · et que les morceaux de la comète **s'écartent**
en travers de la course entre deux instants.

⚠️⚠️ **ET IL A FALLU CORRIGER LE BANC DEUX FOIS AVANT DE CROIRE LE DESSIN** — *un banc de rendu se
vérifie aussi* (§10 de `CLAUDE.md`), et les deux fautes sont instructives :
1. **il mesurait son propre fond.** La sonde peignait « de l'herbe, comme dans le jeu » (#2a5c2a) :
   ses trois composantes sont sous le seuil d'encre, donc il annonçait « 48 rangées encrées » sur
   une image de 48 px de haut. **Le fond d'une mesure n'est pas un décor, c'est un réactif** — il
   doit être ce que le dessin n'est jamais (ici, du bleu pur) ;
2. **il mesurait le cerne en croyant mesurer le glyphe.** Le contour de la bulle est de la même
   encre que le « ! » et traverse chaque rangée : le trou qu'on cherche était bouché, et le banc
   aurait été **vert sur un point collé au fût**. On trie par LARGEUR (le cerne traverse la bande,
   le fût fait trois pixels).

⚠️ **UN DESSIN A ÉTÉ SUPPRIMÉ PAR CE BANC** : un « ? » écrit « parce que la famille en aura
besoin ». Personne ne l'appelait, donc seul le banc le regardait, donc il était faux — la planche a
montré une tache. Leçon 453, exactement.

⚠️⚠️ **ZIP 454 — LE SILLON EST LE PREMIER DÉCOR DE LA FERME QU'UN BANC REGARDE VRAIMENT**, et il a
fallu qu'il le devienne pour qu'on s'aperçoive qu'il était PLAT depuis dix zips. Deux contrôles le
regardaient depuis le 444 (le bord du haut, « les deux états sont le même sillon ») et **aucun ne
mesurait le relief** — à côté d'un cratère qui en prenait sept. Section **5 bis**, six contrôles :
l'écart-type de luminance (une terre ÉCLAIRÉE, pas coloriée), l'élargissement d'est en ouest (une
COURSE, pas une tranchée), l'accord entre l'enfoncement et le dessin, la profondeur annoncée, le
signe du bourrelet, et le fait que rien ne touche le bord de la toile.
⚠️ **Un contrôle a dû CHANGER DE GRANDEUR** : « les deux états ne sont pas identiques » mesurait un
écart de silhouette qui a cessé d'exister le jour où les deux états sont sortis du même champ de
hauteur. Il ne mesurait plus rien ; il mesure maintenant la COULEUR (terre contre herbe), qui est ce
qui change vraiment.

`node tools/render-etoile.mjs` → `etoile-planche.png` · `etoile-cratere.png` (446 : **trois
états du cratère côte à côte** — fumant, refroidi, bassin de verre — parce que ce qui a changé
est la PAIRE, pas l'image) · `etoile-comete.png` (448) · `etoile-alerte.png` (455) ·
`etoile-jauge.png` (456 : cinq remplissages et deux états d'attente sur la terre du cratère) ·
`etoile-poses.png` (459 : les trois poses du cratère sur quatre tenues) · `etoile-tristan.png`
(459 : la bulle d'ouvrage à cinq avancements) · `etoile-plat.png` (479 : la chaleur qui tombe de
gauche à droite, cinq bols).

⚠️⚠️ **IL REMPLACE `verify-enquete.mjs` ET `render-enquete.mjs`, SUPPRIMÉS AU 444 AVEC L'ENQUÊTE
QU'ILS MESURAIENT.** Un banc qui mesure du contenu disparu est pire qu'un banc absent : il passe
au vert sur rien. ⚠️ **Mais un de leurs contrôles a été SAUVÉ et déplacé dans `verify-vallee` :**
« sans quête, le cours est bit à bit celui du 430 ». Il protégeait LE MARCHÉ, pas l'enquête, et le
444 retirait justement le paramètre qu'il surveillait — le laisser mourir avec son banc aurait
retiré la mesure au moment précis où elle servait.

⚠️ **IL A ÉTÉ ÉCRIT AVANT LE PREMIER `fillRect`** (corollaire du §4.2 de `CLAUDE.md`). Ce qu'il
mesure : aucun pixel sur le bord HAUT du canevas (29 dessins LUS) · les îlots qui flottent dans un
aplat, en connexité à 8 · **l'échelle contre le FERMIER** et pas contre d'autres décors (429) · le
cerne, mesuré sur la MATIÈRE et non sur le halo · deux états d'un même objet gardent la même
silhouette · quatre poses ne sont jamais le même dessin · et le cratère **tient dans l'emprise que
le générateur lui garantit**.

⚠️⚠️ **CE QU'IL A TROUVÉ, ET QU'AUCUNE RELECTURE N'AURAIT TROUVÉ :**
- **trois dessins rabotés par le haut** (la mitre du four, le houppier de l'arbre au nid, la
  volute de vapeur du sillon) — le piège n°1 des sprites, payé trois fois au 433 et trois fois de
  plus ici ;
- **le cratère peignait 94 px de rayon là où le générateur n'en garantit que 72** : ses traînées
  d'herbe couchée seraient tombées sur un arbre ou sur le sentier. C'est « la case d'un décor
  n'est pas la surface qu'il couvre » (440), appliqué à un décor de neuf cases ;
- **deux poses de la compagne sortaient identiques au pixel près** — et c'est ce qui a mené au
  diagnostic le plus utile de la passe : ⚠️⚠️ **un cerne d'un pixel impose une profondeur
  d'échancrure d'au moins trois pixels**, sinon le contour rebouche la forme qu'il souligne. Vrai
  de toute dentelure à cette échelle.

### ⚠️ ZIP 449 — OÙ ÇA BRÛLE, EN CASES

La brûlure du cratère n'a pas de rayon à elle : elle mord là où `starCraterSink` enfonce le
fermier de la moitié de la profondeur. **Ce que ça vaut en CASES ne se lit donc nulle part, il
faut le sonder** — et ça bouge tout seul le jour où `craterHoleK` ou `STAR_CRATER_SINK_PX` change,
sans que personne n'ait touché à la brûlure. Quatre contrôles, et ils échouent **dans les deux
sens** (leçon du 444 : une mécanique qui ne demande rien n'est pas une réussite) : ce qui brûle
est **strictement dans le trou** (brûlure 2,23 cases, trou 3,16 — la pente se franchit) · loin du
bourrelet (**50 % de l'emprise dessinée**) · **assez large pour qu'on tombe dedans** (3,7 cases de
traversée au plus étroit) · et l'anneau où l'on se tient tranquille (5,5) **reste praticable**.
⚠️ Ce banc **appelle** `quete.js` au lieu de recopier son seuil : sinon il jugerait sa propre
maquette (troisième forme du défaut de banc).

### ⚠️⚠️ ZIP 446 — IL MESURE ENFIN LA PROFONDEUR, ET IL S'EST TROMPÉ TROIS FOIS DE PLUS EN L'APPRENANT

Le cratère du 444 était **plat**, et le banc était **vert** : il mesurait l'emprise, l'ondulation
du contour et la propreté — trois bonnes choses, et pas celle-là. Ce qu'il mesure depuis le 446 :
la **masse de terre** tient dans `STAR_CRATER_DRAW_R` **et la remplit** · les **fissures** sortent
largement de la terre (sinon le modèle n'est pas tenu) **et** s'arrêtent à
`STAR_CRATER_CRACK_R` · le **fond est plus sombre que la lèvre** · ⚠️ **une paroi est dans
l'ombre** (c'est ÇA, le creux) · chaud et froid sont le **même** cratère avec **beaucoup moins de
braises** mais **pas zéro** · la fumée **monte** au-dessus du trou et ne descend pas dedans ·
chaleur nulle = **aucune** fumée · et l'**enfoncement** : au fond, hors emprise, sur le bourrelet,
⚠️ et surtout **continu** (aucun saut au bord — un fermier qui tressaute en entrant ne se voit sur
aucune capture fixe).

⚠️⚠️ **ET LES TROIS ERREURS DE MESURE VALENT LA PEINE D'ÊTRE LUES, PARCE QUE C'EST TROIS FOIS LA
MÊME :** *il mesurait une propriété visible là où il fallait mesurer une différence.*
1. la **profondeur mesurée sur le cratère chaud** — les braises éclairent le fond (L 72 contre 70
   pour la lèvre), donc « pas de profondeur » sur un dessin qui en a ;
2. la **terre séparée des fissures par la luminance** — vrai tant que l'éclairage est mou, faux
   dès que la paroi ouest passe dans l'ombre : « 72 % d'irrégularité » sur un contour régulier,
   parce que le banc ne VOYAIT pas le côté sombre. Passé à l'**alpha** (la terre est opaque, une
   fissure ne l'est jamais), la mesure ne dépend plus de l'éclairage ;
3. le **feu compté par la couleur** — la lèvre de terre éclairée est rouge elle aussi, d'où
   soixante-quinze braises comptées là où il y en avait neuf. Passé à la **différence entre
   l'image chaude et l'image éteinte**, exact par construction.

⚠️ **ET LE BANC S'EST TROMPÉ DE GRANDEUR DEUX FOIS, SUR LA MÊME CHOSE** : le SEUIL D'OPACITÉ. À 40
il attrapait le halo (qui est identique d'une pose à l'autre) et voyait « 0 pixel d'écart » sur
quatre dessins différents ; puis il mesurait le cerne sur le bord du halo, où aucun pixel n'est
assez opaque, et refusait un dessin correct. Il porte donc deux fonctions nommées — `silhouette`
(40, la surface occupée) et `matter` (150, la matière) — et chacune a sa question. *C'est la
huitième fois d'affilée dans ce dépôt qu'un banc neuf se trompe d'abord de grandeur.*

⚠️ **CE QU'IL NE MESURE PAS, ET IL LE DIT** : il ne joue pas, et il ne juge pas le cratère dans sa
vraie herbe (il le peint sur un fond approximé). Trou déclaré.

### ⚠️⚠️ ZIP 448 — LA COMÈTE, ONZE CONTRÔLES, ET UN BANC QUI A CORRIGÉ TROIS DÉFAUTS AVANT L'ŒIL

`etoile-comete.png` : trois tailles (loin, mi-course, contact) sur **deux fonds** — un ciel de
nuit et une bande claire — plus la traînée qui reste à cinq âges et la gerbe d'impact à quatre
instants.

⚠️⚠️ **LE DESSIN QU'IL REGARDE N'EXISTAIT PAS AVANT LUI.** La comète du 444/445 tenait en huit
lignes dans la closure de `drawStarOverlay` — un `createLinearGradient` et un `arc()` blanc.
Guillaume l'a résumée en « trop ridicule ». Elle ne l'a jamais été par négligence : **elle a
vieilli**, faute d'un endroit où se voir, pendant que le cratère prenait trois passes et sept
contrôles. *Troisième fois que le deuxième visage du piège n°1 se paie dans ce dépôt.*

Ce qu'il mesure : le **cœur est blanc pur** · la **gaine d'or est à l'ARRIÈRE** et n'est qu'un
liseré à l'avant (mesuré sur deux arcs opposés) · le **halo déborde de 2,9 rayons** (c'est le
« glow » demandé, et c'est le seul nombre qui dise s'il y en a un) · la **queue traîne 7 rayons
derrière** et rien de comparable devant · ⚠️ la queue a du **GRAIN en travers** (inversions de
pente : 0 = un dégradé, ≥ 3 = des mèches) · le **cerne** fait le tour · `fade` **atténue pour de
bon** sans tout effacer · et la gerbe d'impact **s'étale** au lieu de s'allumer.

⚠️⚠️ **TROIS DÉFAUTS TROUVÉS PAR LE BANC AVANT D'ÊTRE VUS SUR LA PLANCHE :**
1. **la queue partait DEVANT la tête** — 9,2 rayons devant contre 3,5 derrière. Un signe inversé
   dans une ligne ; à l'écran, une comète qui recule ;
2. **la queue était un tampon d'ouate** — « 1 inversion de pente en travers », c'est-à-dire
   aucune mèche distincte de sa voisine : le dégradé qu'on remplaçait, en plus gros ;
3. **`fade` ne pouvait pas être mesuré tant qu'il passait par `globalAlpha`** — et c'est le
   contrôle qui a imposé de moduler l'alpha **dans la couleur**, ce qui a du même coup rendu le
   dessin honnête au banc (dont le `restore()` ne rend que la transformation).

⚠️ **ET UN QUATRIÈME QUE LE BANC N'A PAS VU, PARCE QU'IL NE LE MESURAIT PAS :** la gerbe
d'impact sortait **en stries horizontales** (un disque construit en `dy` puis posé à
`round(dy × écrasement)` laisse une rangée sur deux vide). Vu sur la planche, en la regardant.
*Le banc protège de ce qu'on a déjà compris ; regarder l'image reste la seule chose qui trouve ce
qu'on n'a pas encore compris.*

⚠️⚠️ **CE QU'IL NE MESURE PAS, ET C'EST LE TROU QUI COMPTE : LA CHRONOLOGIE.** Ces onze contrôles
regardent des dessins ISOLÉS. Que le cratère apparaisse trois secondes avant que la comète ne
touche le sol — le défaut même de ce zip — leur est **totalement invisible**, et c'est
`verify-quete` qui le tient désormais (cinq contrôles purs sur `starImpactLanded` et l'azimut).
*Un banc de rendu ne peut pas voir un défaut de temps.*

## `verify-quete.mjs` — 619 contrôles, 619/619 (444 à 480 bis : cinq impacts, FOUILLE, LES QUATRE VERBES, chantier et maire inclus)

Le contrôle de l'ouvrage de Tristan vérifie aussi la lecture utilisée par le panneau `P` : cinq
segments dans l'ordre de `STAR_SHIP_ORDER`, une fabrication à 50 % lue à 50 %, puis l'état
`ready` après livraison. Un contrôle de source tient en plus le branchement de la barre et
l'absence de pictogrammes ; les deux assertions historiques sur les dates et la livraison sont
renforcées sans être dupliquées.

⚠️⚠️⚠️ **ZIP 479 — LE §12 TIENT UNE PROMESSE DE CONCEPTION DANS DU CODE, ET C'EST SA RAISON
D'ÊTRE.** L'audit 477 reprochait aux trois étoiles de « dire la même chose » ; la cause n'était
pas le texte, c'était qu'on leur demandait le même GESTE. Le §12 refuse donc que deux étoiles
partagent un `verb`, rejoue les trois chaînes de bout en bout (l'offrande de bonbons, le plat
qu'on cuit / porte / passe / sert, les deux bords du cratère), et balaie 2 401 couples de
positions pour tenir l'INVARIANT de la reine — *deux présences à moins d'un quart de tour ne
comptent jamais*. **Une consigne écrite dans un document se périme sans bruit ; un contrôle qui
échoue, non.**
⚠️⚠️ **ET IL A DÛ RÉAPPRENDRE LE VRAI GESTE, comme au 469 :** huit contrôles verts sont tombés
d'un coup en ajoutant les verbes, parce qu'ils jouaient encore `resolveStarCalm` sur les trois
étoiles. *Un banc qui rejoue le geste d'avant est vert sur deux étoiles devenues
inatteignables.*
⚠️⚠️⚠️ **UN CONTRÔLE DE SOURCE EST NÉ AVEC CE ZIP, ET IL A TROUVÉ UN DÉFAUT DE VINGT-CINQ
ZIPS** : le bandeau et le chevron dérivent tous deux de `starGoalKey`, et chacun lui passe un
CONTEXTE. Le chevron recopiait le sien à la main — `{ craterHot, landed }` — **sous un
commentaire qui affirmait « une seule source, donc un seul contexte »**. C'était vrai tant que
le contexte avait deux champs ; le 479 lui en donne cinq, et le chevron aurait pointé le cratère
rose pendant que le bandeau envoie au chaudron. *Une phrase qui dit « une seule source » n'en
fait pas une — c'est le SOURCE qu'il faut mesurer, pas la promesse.* (Et il publie combien
d'appels il a lus : leçon du 441, un scanner qui ne scanne rien passe toujours au vert.)
⚠️ **Son premier jet échouait sur les quatre appels JUSTES** — un `\)` non équilibré s'arrêtait
à la première parenthèse fermante. *Un banc qui échoue à tort est aussi inutile qu'un banc qui
passe à tort*, et on ne s'en aperçoit qu'en lisant ce qu'il imprime.


⚠️⚠️⚠️ **ZIP 469 — IL EST PASSÉ DE 488 À 449, ET C'EST UNE BONNE NOUVELLE.** Le déchant a
supprimé quatre chapitres ; leurs contrôles partent avec eux (les deux fenêtres solo rejouées
image par image, les trois du croisement d'ombres, les trois de la flaque de plongée, les
tables de manches des quatre mini-jeux). **Un banc qui rétrécit parce que le code rétrécit est
un banc en bonne santé** — ce qu'il ne faut pas, c'est qu'il rétrécisse tout seul.
⚠️⚠️ **ET IL A GAGNÉ LE CONTRÔLE QUI MANQUAIT DEPUIS LE 444, celui qui aurait dû tomber le
premier jour :** *l'apprivoisement, joué avec un VRAI identifiant et en re-migrant l'état à
chaque requête, comme l'hôte le fait.* Il jouait `"j1"` quand le jeu passe un UUID de 36
signes, et gardait un objet d'état quand l'hôte le re-migre deux fois par seconde. Il fallait
les DEUX écarts pour que la troncature de clé de `calm` fusionne « la tenue » et « son
départ » — donc **447 contrôles restaient verts sur une quête totalement bloquée**.
*Un banc qui invente ses identifiants mesure un jeu que personne ne joue.* Il balaie
maintenant les deux longueurs, comme il balaie les deux valeurs d'un drapeau solo depuis 458.
⚠️ La FOUILLE ajoute une trentaine de contrôles : la durée bornée dans les deux sens, le seuil
de déplacement, l'invariant des trois résultats (chacun servi par au moins un cratère, au
moins un vide, jamais la moitié), l'idempotence, la garde « on n'apprivoise pas ce qu'on n'a
pas déterré », et la migration d'une sauvegarde d'avant le zip.


Le 464 ajoute huit contrôles : cap constant et avance monotone pour chacun des
trois fragments filmés, extrémités exactes de la course, directions distinctes,
et détection de la nouvelle compagne bleue, rose ou reine sans rejouer une
arrivée déjà connue. Deux gardes de source empêchent le retour de l'ancien cap
oscillant et du branchement réservé à la reine.

Le 465 ajoute les extrémités monde de l'arrivée (centre exact du cratère puis
joueur) et les quatre états de bulle : opaque, en fondu, expirée, rappelée au
survol. Le test navigateur reste indispensable : c'est lui qui a trouvé les deux
panneaux plein écran que la courbe pure, pourtant correcte, ne pouvait pas voir.

### ⚠️⚠️⚠️ ZIP 456 — LES DEUX SEULS CONTRÔLES DU DÉPÔT QUI LISENT LE SOURCE POUR VOIR SI UN LECTEUR S'EXÉCUTE

Section **10**, dix-sept contrôles. Trois défauts vus par Guillaume, et **aucun banc n'aurait pu en
voir un seul** — parce qu'aucun ne mesurait la grandeur en cause :

- **LA PORTÉE DE PAROLE NE REGARDAIT PAS LA ZONE.** Un fermier debout en (50, 50) à la ferme
  déclenchait la phrase d'un habitant debout en (50, 50) à Valley Town : le piège des deux cartes
  (§4 de `CLAUDE.md`, payé quatre fois) dans sa forme la moins visible, une bulle qui s'ouvre toute
  seule devant personne. On balaie **625 positions** de la couronne, et le balayage n'est pas du
  luxe : une portée euclidienne écrite par mégarde passe les contrôles de cas et échoue **sur les
  diagonales**, qui sont justement là où les deux métriques diffèrent.
- **VERS OÙ IL SE TOURNE**, balayé sur **1 088 directions** : *il regarde toujours le demi-plan où
  est le joueur*. Trois exemples auraient laissé passer l'inversion nord/sud, qui est l'erreur qu'on
  fait à tous les coups dans un monde où `y` croît vers le bas.
- ⚠️⚠️ **LA POSTURE DU CRATÈRE, ET C'EST L'ACCORD QU'ON MESURE, PAS LE CAS.** `starCalmStep` (le
  texte d'aide + la jauge) doit rendre « ça compte » **exactement** quand `starFacingAway` dit oui,
  qu'on ne bouge pas et qu'on est dans l'anneau — c'est-à-dire exactement la condition que le client
  envoie et que l'hôte revérifie. **4 356 postures balayées.** Si les deux divergeaient, la jauge
  monterait pendant que l'hôte ne compte rien, et **aucune capture ne montre qu'une barre ment** :
  on voit qu'elle est pleine, pas qu'elle a tort. Leçon 449 dans sa forme la plus concrète.

⚠️⚠️⚠️ **ET DEUX CONTRÔLES LISENT `FermeGame.js` COMME UN TEXTE, CE QUE CE BANC NE FAISAIT QU'AU §8-B.**
La raison est un défaut que le banc des lecteurs **ne pouvait pas voir** : il compte
`starSay(…, L.star.s2.peek)` comme une lecture, et il a raison sur la lettre. Sauf que `starSay`
écrit dans la bulle de l'**étoile**, laquelle n'est dessinée que là où `starCompanionsAt` rend une
liste non vide — donc **jamais avant la première étoile apprivoisée**. Cinq phrases du premier quart d'heure de jeu
étaient dans ce cas, dont la seule qui dise pourquoi on se tient immobile devant un trou.
*Un lecteur qui ne s'exécute jamais vaut zéro lecteur*, et compter des clés ne le voit pas. Les deux
contrôles : **aucun `starSay` dans le bloc du cratère** (1 891 signes lus, avec témoin positif) et
**les trois boucles de rendu ont un repli sur le joueur** quand il n'y a pas de compagnon.


### ⚠️⚠️⚠️ ZIP 455 — LE TAMPON D'ANNONCE : IL BALAIE, IL NE DONNE PAS D'EXEMPLES

Section **9**, cinquante contrôles, et trois d'entre eux ont trouvé un vrai défaut à la première
exécution. Ce qui est mesuré est ce que personne ne peut voir à l'écran :

- **LA DATE.** « La nuit qui suit » a deux lectures qui donnent le même code neuf fois sur dix et un
  jeu complètement différent la dixième (accepter à 20 h). On balaie donc **95 heures d'annonce**
  d'une journée entière et on vérifie que chacune finit par produire une chute, jamais avant le
  plancher de 5 minutes. *Un contrôle de cas ne vaut pas un invariant* (449).
- **LA VALLÉE.** À l'écran, « ils s'agitent » et « ils s'agitent tous dans la même image » se
  ressemblent beaucoup — et le second est une chorégraphie, c'est-à-dire le contraire d'une foule
  inquiète. On mesure la part de nerveux (**13/31**), le pire simultané (**5/13**), le taux
  d'occupation (**24 %**), et qu'un tour sur soi-même **part face au joueur et passe par les quatre
  directions** — ce qu'un banc de rendu ne pourrait jamais voir, puisqu'à l'image une rotation ratée
  ressemble à une rotation.
- ⚠️⚠️ **LE THÈME.** Deux listes de mots interdits balayées sur les 28 phrases d'habitants : ce qui
  est secret (la petite étoile, le cratère, le sillon, le navire) et ce qui ENVOIE quelque part
  (« va voir », « cherche », « trouve », « go to », « look for »). **Rien d'autre que ce contrôle ne
  protège la moitié du thème qui survit au 455** — dans six mois, une rumeur « va voir au nord du
  champ » aurait l'air d'une bonne idée. ⚠️ Il s'est trompé lui-même à sa première écriture en
  bannissant le mot « étoile » : il refusait « j'ai vu des étoiles bizarres dans le ciel », qui est
  la phrase que Guillaume a demandée et qui ne trahit rien. *Ce qui est secret est la CRÉATURE et le
  CHEMIN, pas le nom commun.*
- **LE CADRAGE.** 36 formats de fenêtre balayés, **clamp de caméra rejoué**, et l'impact doit être
  hors cadre sur tous — sinon le banc jugerait un point de vue que le jeu n'atteint jamais près du
  bord nord (le sillon est à 17 cases du bord). Plus le produit scalaire : le point de vue est **en
  amont** de la course, jamais en aval (sinon on voit la comète s'éloigner — faute du 445).
- **LA FRACTURE**, et c'est elle qui a échoué : `STAR_FRAG_AT = 0,34` réglé à la main, contre une
  entrée en cadre à **0,84**. Le caillou se fendait hors de l'écran. Septième forme du défaut de
  banc (454), repayée en un zip — la constante est maintenant **dérivée** de `starFallOnScreenK()`.

⚠️ **ET SEPT CONTRÔLES SONT PASSÉS AU ROUGE LE JOUR OÙ LA RÈGLE A CHANGÉ** (`resolveStarFall` exige
désormais une annonce), ce qui est exactement ce qu'on attend d'eux.

`node tools/verify-quete.mjs`. Il remplace `verify-enquete.mjs`, supprimé avec l'enquête du 442 :
il en reprend la MÉTHODE (appeler le vrai code, jouer la vraie chaîne) et aucun de ses contrôles.

### ⚠️⚠️ ZIP 448 — IL MESURE LE TEMPS, ET C'EST LA GRANDEUR QUE PERSONNE N'AVAIT

Cinq contrôles neufs, et ils existent parce que **sept contrôles regardaient le cratère sans
jamais demander QUAND il apparaît** : le décor d'impact **n'existe pas** avant
`STAR_FALL_IMPACT_MS` et existe à partir de cet instant · ⚠️ **hors cinématique il est là**
(c'est le cas normal — écrire l'inverse aurait fait disparaître le cratère pendant toute la
partie) · la comète entre en scène **après** que la caméra se soit posée et **avant** l'impact ·
elle reste **rapide** (entre 1,2 et 3,0 s de vol, deux bornes plutôt qu'un ressenti) · elle
descend **vers l'OUEST** sur les deux cartes (on vérifie le SIGNE, jamais un nombre recopié) ·
elle **plonge plus raide sur le cratère que sur le sillon** · et une zone inconnue ne rend pas
`NaN` (un `NaN` d'angle ne lève rien, il fait juste disparaître la comète — le repli poli du 444,
dans une trigonométrie).

### ⚠️ ZIP 449 — LA BRÛLURE DU CRATÈRE : HUIT CONTRÔLES, ET LE DERNIER EST LE SEUL QUI COMPTE

`starCraterBurns` est une règle de TEMPS avant d'être une règle de place, donc elle se mesure ici
(la moitié GÉOMÉTRIE est dans `render-etoile`). Sept contrôles disent l'attendu — on brûle au fond
d'un trou en fusion, encore une seconde avant la fin du refroidissement, plus du tout une seconde
après ; **pas sur la pente**, **pas sur le bourrelet** (décision de Guillaume : seul le FOND) ;
pas dans un trou qui n'est pas encore creusé ; plus du tout une fois l'étoile sortie.

⚠️⚠️ **LE HUITIÈME EST LA JOINTURE, ET C'EST LE SEUL QUI PROTÈGE D'UN DÉFAUT QU'ON NE VERRAIT
JAMAIS À L'ŒIL :** il balaie la durée et compte les instants où « ça brûle » et « elle refuse de
sortir » ne disent pas la même chose (**145 instants lus, 0 en désaccord** — le dénominateur est
imprimé, règle du 441). Le jour où quelqu'un donne à la brûlure un seuil à elle, le jeu dira
« c'est froid, tiens-toi tranquille » en brûlant quand même — défaut du 426, payé ici en dix
minutes de repos forcé.

⚠️ **LES DEUX MOITIÉS ONT ÉTÉ FALSIFIÉES AVANT D'ÊTRE CRUES** (« un banc qui n'a jamais pu
échouer ne vaut rien ») : `STAR_BURN_DEPTH_K` mis à 0 fait tomber le contrôle de la pente
(238/239), et remplacer le seuil de temps par une demi-durée en fait tomber deux dont la jointure
(237/239, 36 instants en désaccord).

⚠️⚠️ **ET LES HUIT ÉTAIENT VERTS QUAND LA SÉANCE À L'ÉCRAN A TROUVÉ LE VRAI DÉFAUT** : l'arrêt dev
« le cratère » posait le joueur à 1,1 case du disque qui punit. **Aucun banc ne mesure une
ARRIVÉE** — c'est la leçon du 444, et elle se reproduit dès qu'un arrêt de téléport côtoie une
règle neuve. Voir §29.3 de `components/ferme/README.md`.

⚠️⚠️ **ET UNE CONSTANTE A ÉTÉ SUPPRIMÉE, PAS AJOUTÉE.** `STAR_CAM_FLASH_MS = 3000` existait
depuis le 445 et **seul ce banc la lisait** : la cinématique écrivait `t > 3.0` en dur dans sa
closure. Il mesurait donc un nombre que le dessin ne lisait pas, et **il ne pouvait pas
échouer** — « un banc qui n'a jamais pu échouer ne vaut rien » (§10 de `CLAUDE.md`), cette
fois-ci sous sa forme la plus discrète : la constante avait l'air juste, elle était simplement
débranchée.

### ⚠️⚠️ ZIP 449 — L'OBJECTIF COURANT : IL MESURE ENFIN L'**ACCORD** ENTRE DEUX RÉPONSES

Trente-quatre contrôles neufs, et le seul qui compte vraiment est celui-ci : **quand le chevron
désigne un lieu, le bandeau parle-t-il DE CE LIEU ?** Personne ne l'avait jamais demandé parce que
les deux n'avaient jamais eu la même source — le chevron dérivait de `starTargetSite`, le bandeau
d'une phrase par CHAPITRE. Or deux chapitres sur cinq contiennent plusieurs objectifs : le bandeau
**mentait pendant la moitié de la quête** et aucun banc ne pouvait s'en apercevoir. Il rejoue
désormais la quête entière trouvaille par trouvaille et compare à chaque pas (**9 états
comparés, 0 désaccord**, dénominateur imprimé). S'y ajoutent : chaque clé de `STAR_GOAL_KEYS` a sa
phrase et **aucune phrase n'est orpheline** (les deux sens, comme les arrêts de téléport) · le
cratère BRÛLANT et le cratère FROID ne disent pas la même chose · l'écoute des ombres n'a pas de
chevron **mais a une phrase** (c'est le seul moment où le joueur n'a rien d'autre) · et les dix
phrases tiennent dans le bandeau, **compté en signes** — il était en `white-space:nowrap`, donc
toute consigne un peu longue s'y faisait **couper en silence** au milieu d'un mot.

⚠️⚠️ **ET L'INVARIANT DU GUIDE A TROUVÉ UN VRAI DÉFAUT, LÀ OÙ LES TROIS CAS D'ESPÈCE PASSAIENT.**
`starGuidePoint` place le familier meneur en avance sur le joueur le long du chemin. Trois
contrôles « est-ce que ça marche » étaient au vert. Le quatrième — *le meneur n'est JAMAIS plus
loin du but que le joueur*, balayé sur toutes les positions de départ et quatre avances — a
échoué **20 fois sur 164** : la première écriture repartait du NŒUD le plus proche, qui est
derrière un joueur à mi-case, si bien que le chien se retrouvait dans son dos. Corrigé en
repartant de la PROJECTION sur le chemin. *La différence entre un banc qui mesure un cas et un
banc qui mesure une propriété tient exactement là.*

⚠️ **CE QU'IL NE VOIT TOUJOURS PAS, ET LA SÉANCE À L'ÉCRAN L'A TROUVÉ :** le guide s'éteignait
tout seul à chaque carte de chapitre (`starGuideTarget` rend `null` quand une interface est
ouverte — une garde qui a l'air évidente et qui confond un INSTANT avec un ÉTAT). Le chemin était
calculé et valide ; le chien renonçait sans un mot. Cinquième fois que « regarder l'écran » trouve
ce qu'aucune grandeur mesurée ne contenait.

Ce qu'il mesure : la chaîne des cinq chapitres jouée par les vrais résolveurs, dans le DÉSORDRE ·
`migrateStar` sur huit sauvegardes tordues (absente, nulle, une chaîne, un nombre, un tableau,
abîmée, d'une version d'après, et une du 442) · le placement dérivé des six lieux, avec le VRAI
A\* piéton depuis la descente du train · **les fenêtres solo rejouées image par image** · le
beffroi · les deux listes de niveaux et d'arrêts **dans les deux sens** · et un scan de source qui
publie combien de lignes il a LUES.

⚠️ **LE 445 LUI A AJOUTÉ TRENTE CONTRÔLES, ET TOUS PORTENT SUR L'ARRIVÉE** — c'est-à-dire sur la
grandeur que le §25 du README de la ferme reproche à tous les bancs du 444 de n'avoir jamais
mesurée. Deux objets neufs : la **chute est-elle jouable là où elle se joue** (la liste des mondes
d'impact est une liste de ce qui est PERMIS, l'intérieur n'en est pas, la caméra est posée avant le
flash et revenue avant la fin — quatre inégalités, aucun réglage à l'œil), et le **chevron
désigne-t-il quelque chose** (la quête entière est rejouée et l'on regarde à chaque étape ce qu'il
pointerait ; il doit pointer le bon lieu à sept moments, et **RIEN pendant l'écoute des ombres**,
où il n'y a délibérément nulle part où aller). ⚠️ Plus un scan de source qui joint les
identifiants de lieux à leurs branches de position dans `FermeGame.js` : « une porte sans chemin de
code ment » (444) appliqué à un repère — un chevron sans branche ne planterait pas, il ne
s'afficherait simplement jamais.

⚠️⚠️ **IL ÉCHOUE DANS LES DEUX SENS, ET C'EST TOUT SON INTÉRÊT.** Une fenêtre trop courte rend le
geste impossible ; une fenêtre si large qu'elle ne demande plus rien est une **mécanique morte**,
et rien ne la signale jamais. Les deux sont des échecs. ⚠️ Les deux bornes se mesurent à deux
VITESSES différentes, et c'est ce qui les rend honnêtes : « est-ce tenable ? » se demande à celui
qui COURT (un joueur pressé doit réussir, toujours), « est-ce que ça demande quelque chose ? » se
demande à celui qui MARCHE (la course est un bonus, pas une exigence).

⚠️ **CE QU'IL A TROUVÉ À SA PREMIÈRE EXÉCUTION** : la fenêtre solo de lecture d'ombres valait
**70 s pour un trajet de 3,5 s en courant et 6,0 s en marchant** — 5 % de la fenêtre consommée,
c'est-à-dire qu'elle ne demandait rien. Ramenée à **26 s**, mesurée, pas devinée. Le chiffre de
70 s venait du document de conception et était parfaitement défendable sur le papier.

⚠️⚠️ **ET LE BANC S'EST TROMPÉ DE GRANDEUR DEUX FOIS, comme les huit précédents** :
- il comptait « le plancher » en MATIÈRES (bois, dalle) puis inondait tout ce qui n'est ni mur ni
  vide — marches comprises. Verdict : « 64 cases atteintes sur 56 » sur un beffroi parfaitement
  sain. **Un banc qui compte deux choses différentes des deux côtés d'une comparaison échoue sur du
  bon travail**, ce qui est pire qu'un banc qui passe sur du mauvais : on va corriger ce qui n'a
  rien ;
- il cherchait un chemin du banc d'orgue au beffroi par un parcours à quatre voisins, et annonçait
  **« AUCUN CHEMIN »** sur une église praticable. La carte d'intérieur EMPILE ses niveaux avec un
  vide entre eux : ce qui les relie n'est pas un voisinage, c'est une CAGE. *Il mesurait la carte,
  pas l'interaction* — le défaut n°1 de `CLAUDE.md`, dans le banc écrit pour s'en protéger.

⚠️ **IL A GAGNÉ QUATORZE CONTRÔLES EN UNE SEULE SÉANCE DE JEU** (163 → 177), et aucun n'est « en
plus » : ce sont ceux qui manquaient quand dix défauts visibles à l'œil sont passés à travers six
bancs verts (le détail est au §25 de `components/ferme/README.md`). Les plus rentables : *chaque
arrêt de téléport pose le joueur sur une case praticable de son niveau, hors volée* · *chaque
arrêt et chaque niveau ont un libellé lisible* (un repli en `|| clé` n'échoue pas, il affiche la
clé) · *un titre de mini-jeu tient dans le cadre* · *le refroidissement laisse plus d'une seconde
avant de repartir au blanc*.

⚠️⚠️ **ET AU 446 IL A GAGNÉ TREIZE CONTRÔLES PARCE QU'IL NE JOUAIT PAS `resolveStarCalm` DU TOUT** :
la mécanique centrale du chapitre 2 — se tenir tranquille, dos tourné — n'était vérifiée nulle
part, on n'en mesurait que les CONSTANTES. *C'est le premier visage du défaut de `CLAUDE.md` — il
mesure la carte, pas l'interaction* — et il aura tenu deux zips dans le banc écrit pour s'en
protéger. Il joue maintenant la porte de refroidissement (rien tant que ça fume, rien de consommé
par le refus), la tenue (pas d'un coup, pas à la moitié, **une tenue lâchée puis reprise repart de
zéro**), et la courbe de chaleur (pleine à la chute, retombée vite, **jamais nulle tant que
l'étoile est au fond**, nulle dès qu'on la sort).

⚠️ **CE QU'IL NE MESURE PAS, ET IL LE DIT** : il ne joue aucun mini-jeu (ils vivent dans le DOM et
demandent un vrai canevas), et il ne voit rien de la coopération à deux clients.

## `render-beffroi.mjs` — 28 contrôles, tous verts (444)

`node tools/render-beffroi.mjs` → `beffroi-plan.png`. Sur le modèle de `render-eglise.mjs`, et
**cadré sur la tourelle, pas sur le niveau** : un niveau d'intérieur fait la largeur du tribunal,
le beffroi tient dans dix cases, et une planche à 90 % de vide est une planche qu'on n'ouvre plus.
Le cadrage est dérivé de ce qui est peint.

Ce qu'il mesure : la cage fermée et entièrement praticable · **la volée qui monte de la tribune
existe RÉELLEMENT sur ce niveau et touche le plancher** (le défaut du premier jet : deux volées
posées sur le même rectangle, la montante écrasée par la descendante, un escalier qu'on voit,
qu'on foule, et qui ne va nulle part) · la cloche adossée au nord, entre ses deux portiques,
solide, et ne bouchant aucune marche · **les quatre abat-son, deux cases par face, centrés sur leur
face, et bloquants** · le mobilier, ses sprites, et la densité.

⚠️ **CE QU'IL NE MESURE PAS, ET C'EST GÊNANT, DONC C'EST ÉCRIT** : *la ville vue d'en haut à
travers ces baies*, qui est la raison d'être du niveau. Elle est peinte par `drawCourtFrame`,
c'est-à-dire dans la closure de la boucle de rendu ; la redessiner ici serait juger notre propre
maquette (439) sur précisément ce qu'on a construit pour être regardé. **Ça se regarde à l'écran.**

## `verify-portee.mjs` — une référence qui ne se résout nulle part (443)

`node tools/verify-portee.mjs` — **6 contrôles**, dont **3 sur le banc lui-même**.
Lu à cette exécution : **91 fichiers, 106 524 références d'identifiant** sous
`components/` · `lib/` · `app/`.

⚠️⚠️ **IL EXISTE PARCE QUE LE TABLEAU DES COURS DE LA MAIRIE N'A JAMAIS PU S'OUVRIR,
DU 438 AU 443.** Ses quatre colonnes lisaient un `day` **nu** : aucune déclaration de ce
nom au niveau du composant, et les quatre autres `const day` du fichier vivent dans des
fonctions voisines. Le premier rendu levait `ReferenceError: day is not defined`, le
`GameErrorBoundary` avalait le jeu entier, et le joueur voyait l'écran 🧯.

⚠️ **Et absolument rien ne pouvait le dire.** `npx next build` compile la référence sans
broncher — elle est légale, elle se résout **à l'exécution**. Il n'y a pas d'ESLint dans le
dépôt, et `no-undef` n'aurait pas suffi de toute façon : `day` **est** déclaré dans le
fichier, ailleurs — donc un `grep` le trouve et conclut à tort. Les trente-et-un autres
bancs mesurent des données et des dessins ; **aucun ne rend un panneau React**. Et le seul
chemin qui l'exerce — E devant le tableau, à la mairie — n'était joué par personne, jusqu'à
ce que la quête du 444 y envoie le joueur chercher son **deuxième éclat**. Un chantier
narratif fait passer le joueur dans des pièces où personne n'était allé : c'est ce qui a
sorti le défaut, pas un banc.

**La grandeur qui manquait, et elle tient en une phrase : le nombre de références qui ne se
résolvent nulle part.** Le banc parse chaque module avec le parseur de Babel et son greffon
JSX — **tous deux livrés par Next** (`next/dist/compiled/babel`), donc **zéro dépendance à
installer**, ce qui est la condition pour qu'il tourne encore dans six mois — puis demande à
`@babel/traverse` la table des portées et relève les références libres du programme.

⚠️⚠️ **IL SE PROUVE AVANT DE JUGER QUOI QUE CE SOIT, et c'est la leçon du 441 câblée dans le
banc.** Le chapitre 0 lui donne à lire du code **fautif** (le cas exact du 443, réduit à
cinq lignes) et exige qu'il le refuse, puis le même code réparé et exige qu'il l'accepte. Si
la première échoue, **il s'arrête et ne rend aucun verdict sur le dépôt** — un banc qui n'a
jamais pu échouer applaudit d'autant plus fort. Vérifié en plus **sur le dépôt réel tel
qu'il était avant le correctif** : il sort `day — components/ferme/FermeGame.js:23590`.

⚠️ **La liste des globaux autorisés est BLANCHE, pas noire** (leçon du `plantTree` du 440) :
le jour où quelqu'un tape `windwo`, il est refusé sans que personne ne l'ait prévu.

**Ce qu'il ne fait pas, et il faut le lire avant de lui faire confiance :**
- il ne couvre **pas `public/`** — templerun, labyrinth, candyluge, crystal sont des
  `<script>` qui se parlent par le global (`THREE`, `Slope`, `Pix`, `dirForward`…) : chez
  eux un nom libre est la **norme**. Les y passer demanderait de construire la liste de ce
  que chaque fichier publie — un autre banc, pour des jeux en pause ;
- il ne dit **rien de ce qu'un panneau affiche**. Un panneau qui s'ouvre sur un tableau vide
  ou faux lui paraît parfait. Il dit seulement qu'aucun rendu ne peut plus **mourir** sur un
  nom qui n'existe pas ;
- il ne voit pas les **propriétés** : `obj.jour` mal orthographié reste invisible. Une
  portée n'est pas un typage.

⚠️⚠️ **CE QUI RESTE DONC À DÉCOUVERT, ET C'EST LA VRAIE DETTE DU 443 : aucun banc n'OUVRE un
panneau.** Ce banc ferme la porte par laquelle le défaut est entré, pas la pièce. Les
**55 panneaux conditionnels** de `FermeGame.js` (comptés en listant les `{… && (` de son
`return`, pas de mémoire) ne sont exercés que par une main sur un clavier.

---

## Jouer à deux en local

**`tools/fake-supabase.mjs`** (432) — REST bidon **+ relais Realtime**, donc deux onglets =
deux joueurs, sans compte et sans consommer un message du quota. `LAT=90 JIT=60` simule une
vraie liaison ; il imprime le débit réel PAR TYPE de message toutes les 5 s.
⚠️ **C'est lui qui a trouvé les trois défauts multijoueur du 432**, dont un qui rendait Valley
Town injouable à deux depuis un zip entier. La recette complète (`.env.local`, page jetable,
onglet d'arrière-plan) est en §10 de `CLAUDE.md`, avec ses trois pièges.
⚠️ **Depuis le 2026-08-27, il mémorise `broadcast.self` par sujet au `phx_join`.** Les trames
binaires suivantes ne répètent pas cette option : l'ancienne boucle imposait donc `self:false` et
empêchait le Ludo solo, à client unique, de recevoir son propre `match_start`. `verify-ludo` tient
ce chemin de source ; le navigateur a tenu l'enchaînement réel.

---

## `render-navire.mjs` — LE NAVIRE DES ÉTOILES (451, étendu au 454)

⚠️⚠️ **ZIP 454 — CE BANC A REGARDÉ CE NAVIRE SOUS TRENTE-DEUX MASQUES PENDANT TROIS ZIPS SANS
JAMAIS REMARQUER QUE LES FANTÔMES ÉTAIENT LÀ DÈS LE PREMIER JOUR.** Il mesurait leur forme, leur
damier, leur débordement, leur pulsation — jamais leur **droit d'exister**. C'est le cinquième
visage du défaut de banc (448 : *il mesure ce qu'une chose EST et jamais QUAND elle est*), et c'est
Guillaume qui l'a vu. Trois contrôles neufs le tiennent (« sans les plans, aucun fantôme », « le
plan déplié les fait tous apparaître », « ce qui se voit aussi à la quantité de dessin »), plus
quatre sur la feuille de plan elle-même — écrits **le jour de sa naissance**, pas trois zips plus
tard.

`node tools/render-navire.mjs` — **35 contrôles**, planches `tools/out/navire.png` (zéro à cinq
morceaux, de nuit puis de jour, avec un fermier comme repère d'échelle) et, depuis le 454,
`tools/out/navire-plan.png` (la feuille de plan de Kerguélen à zéro, trois et cinq pièces).

Le navire est le **pisteur** de la quête : ce qu'il montre, c'est ce qui manque. Un dessin qui
ment là-dessus fait rater la quête entière, d'où deux contrôles qu'aucun autre banc n'a :

- ⚠️⚠️ **LE FANTÔME NE DÉBORDE JAMAIS DE SA PIÈCE** (0 px sur les cinq morceaux). Le morceau absent
  est peint en creux à sa place exacte ; s'il ne ressemble pas à ce qu'on obtient, le jeu ment.
  L'isolation est « **tout** contre **tout sauf lui** » : les deux images ont les mêmes occultants
  dans le même ordre, donc leur différence EST la pièce.
- ⚠️⚠️ **UN INVARIANT SUR LES 32 MASQUES** — *poser un morceau n'en efface jamais un autre*,
  80 paires balayées. Le bordé recouvre le pied du mât et la coque recouvre les membrures : c'est
  exactement le cas où une pièce en mange une autre, et l'œil ne le voit pas sur une planche.

⚠️⚠️ **TROIS RÉDACTIONS POUR UN SEUL CONTRÔLE, ET LES DEUX PREMIÈRES ONT MESURÉ AUTRE CHOSE :**
1. elle comparait `rien` à `une pièce` — les quatre autres fantômes s'annulaient, et ce qui restait
   était comparé à lui-même : **« 0,0 % » cinq fois**, c'est-à-dire un banc qui ne pouvait pas
   échouer (§10 de `CLAUDE.md`, payé au 441) ;
2. elle comptait « fantôme dedans » comme « les deux images sont opaques ici », ce qui est vrai de
   tout le reste du bateau ;
3. et le dénominateur attrapait **la lueur**, qui est proportionnelle au nombre de morceaux : `A`
   et `B` n'ont donc pas le même éclairage, et le dénominateur passait de 290 à 6 027 sans qu'une
   ligne du dessin ait bougé. **La parade est l'ALPHA**, insensible à une lumière de faible opacité.

⚠️⚠️ **ET IL A TROUVÉ UN PIÈGE D'OUTIL QUI VAUT POUR TOUT BANC DE RENDU : LE FAUX CANEVAS DE
`lib-canvas.mjs` PRÉMULTIPLIE L'ALPHA, UN VRAI NAVIGATEUR NON.** `rgba(150,232,255,0.745)` sur du
transparent y ressort à `112,173,190` (chaque canal multiplié par l'alpha) et à `150,232,255` dans
Chrome. Un contrôle écrit sur la couleur EXACTE passe donc au rouge sans qu'il y ait le moindre
défaut — le stub menteur du §10 dans sa forme la plus coûteuse : *il accuse un dessin juste.* On
mesure ce qui survit aux deux conventions, c'est-à-dire la **teinte** (B−R > 45), avec de la marge :
le fantôme donne 105 pur et 78 prémultiplié, le pixel le plus bleu du reste du dessin plafonne à 32.

⚠️ **CE QU'IL NE MESURE PAS, ET IL LE DIT** : il ne voit pas le navire dans son herbe ni au bord de
l'eau (le fond est peint par le banc, donc approximé) ; il ne juge pas la nuit du jeu ; et il ne
sait pas si c'est beau. **Le placement, lui, est mesuré par `verify-vallee`** (cale trouvée,
atteignable par le nord, proue à ≤ 3 cases de l'eau, promenade franchissable derrière) — et c'est
là que la séance à l'écran a corrigé le banc, pas l'inverse : voir §30.4 de
`components/ferme/README.md`.
