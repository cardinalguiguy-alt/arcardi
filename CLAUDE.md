# CLAUDE.md — CONTEXTE ARCARDI

**Lis ce fichier en entier avant toute action. Puis arrête de lire et demande.**
Il remplace l'exploration du dépôt pour tout ce qui est global. Le README est un journal
chronologique inversé : c'est de l'**histoire**, pas de l'orientation.

État à jour du **zip 442**. Chantier actif : **rendre Valley Town habitable au regard ET
crédible au jeu**, et depuis le 442 **lui donner une histoire**. La ville est refaite depuis le
434 ; le 438 a ouvert l'hôtel de ville, le 439 l'a audité, le 440 a corrigé la portée des ponts
et la COMPOSITION des décors, le 441 a réparé leur TRAVERSÉE puis ouvert l'**ÉGLISE**, et le
**442 y a posé une ENQUÊTE COMPLÈTE** — « la parcelle qui n'existe pas », vingt-et-un lieux sur
les trois cartes, huit chapitres, trois codes, deux issues, conçue pour deux joueurs. Tout ce qui
concerne la ville, ses habitants, ses bâtiments, **son enquête** ET **ses pièges** est dans
**`components/ferme/README.md`**, qui fait autorité ; les règles de DESSIN sont dans
**`components/ferme/DESSIN.md`** (sorties du §4 au 441) ; les bancs sont dans **`tools/README.md`**.
**`candyluge` et `crystal` sont EN PAUSE.**

⚠️ **CHANTIER OUVERT — LA MOITIÉ QUI RESTE DU SECOND TEMPS DÉCIDÉ AU 440, ET ELLE N'A TOUJOURS
PAS BOUGÉ.** L'église est livrée au 441. Les **intérieurs du tribunal et de la mairie** restent
difficiles à naviguer (« on ne sait pas où est la porte de chaque pièce ») — parade retenue :
**chambranle dessiné + plaque lisible depuis le couloir + seuil au sol**. C'est une dette datée de
deux zips, et l'enquête du 442 vient de faire passer le joueur dans SIX de ces pièces : elle la
rend plus visible, pas moins.

⚠️ **ET IL MANQUE UN FICHIER, PAS UNE LIGNE DE CODE :** le morceau d'orgue, à déposer dans
**`public/sounds/church-organ.mp3`** (décision de Guillaume au 441 : un vrai morceau, pas une
synthèse). Sans lui la scène se joue en entier et le jeu DIT que la soufflerie est muette.

⚠️⚠️ **CE QUI N'A PAS ÉTÉ JOUÉ DANS LE 442, ET IL FAUT LE LIRE AVANT DE CROIRE L'ENQUÊTE
FINIE :** la séance à deux clients a validé la chaîne réseau de bout en bout (un indice trouvé
par l'un tombe dans le carnet de l'autre, avec son nom), **mais aucune interaction d'INTÉRIEUR
n'a été vue à l'écran** — l'archiviste, les deux commandes de verrou, le coffre et le guichet du
notaire. Le banc du navigateur ne compose une image que pendant une capture, donc le personnage
ne peut pas traverser un bâtiment. `verify-enquete` mesure leur placement et leur accessibilité ;
personne ne les a encore VUES. Voir `components/ferme/README.md` §25, dernier chapitre.

⚠️⚠️⚠️ **LE PIÈGE N°1 DU PROJET, ET IL A TROIS VISAGES : CE QUI VIT DANS LA CLOSURE DE LA BOUCLE
DE RENDU.** Il a coûté quelque chose à chacun des cinq derniers zips.
1. **Il plante** (430, 431) : une fonction déclarée dans la closure et appelée depuis le
   composant lève un `ReferenceError` **à l'exécution seulement** — ni le build, ni le lint, ni
   aucun banc ne le voient — et l'exception **emporte tout ce que la frame devait encore
   dessiner**. Mesuré à deux clients : 97 % d'images figées. On EXPOSE par un ref, on ne recopie
   jamais.
2. **Il fait vieillir** (436, 439) : un dessin qu'aucun banc ne peut appeler ne se dégrade pas,
   **il reste au niveau du jour où il a été écrit** pendant que tout ce qui est mesuré monte. Les
   sols des intérieurs sont restés au 426 pendant douze zips. *L'écart n'est pas un écart de
   soin, c'est un écart de DATE, et il se lit sur une carte du dépôt sans regarder une image.*
   ⚠️ Corollaire : **« ce dessin est-il regardable par un banc ? » est une question de QUALITÉ**,
   et elle se pose avant le premier `fillRect`.
3. **Il divise** (439) : une même grandeur décrite des deux côtés de la closure DIVERGE. Le seuil
   de sortie de l'hôtel de ville était écrit dans le générateur *et* dans le composant ; seul le
   premier a été corrigé, et **on ne pouvait plus ressortir du bâtiment**. Voir §8.
4. ⚠️⚠️ **Il fait porter DEUX SENS au même nombre** (441, et c'est le visage que le 439 n'avait
   pas vu alors qu'il en avait nommé deux). `pushE` classe par `wy − altitude × TOWN_ELEV_PX` :
   une ALTITUDE monte le dessin **et** recule le rang, ce qui est juste pour une terrasse. Le 439
   y a versé la flèche du dos d'âne des ponts — or *un dos d'âne monte sans éloigner*. Sept pixels
   ont mangé la marge de 0,02 qui mettait le passant devant le garde-corps du fond, et **le
   fermier a disparu sur toute la rangée nord des deux ponts pendant un zip entier**, sans qu'un
   seul banc puisse le voir. **Une grandeur de DESSIN, une grandeur de RANG, une grandeur de
   COLLISION : trois choses, trois paramètres.** Voir `tools/verify-pont.mjs`.

⚠️⚠️⚠️ **UN BANC QUI PASSE NE VEUT PAS DIRE QUE LA CHOSE EST BONNE — IL VEUT DIRE QU'ON MESURE
AUTRE CHOSE.** C'est la leçon la plus rentable du fichier, et elle a quatre formes connues,
toutes payées :
- **il mesure la carte, pas l'interaction** (439 : « le seuil est bien une sortie, 9/9 » pendant
  que la touche E ne sortait pas) ;
- **il se donne un périmètre et excuse ce qui déborde** (439 : « le tribunal en garde 10,
  *antérieurs* » — cinq venaient d'être causés par le zip en cours) ;
- **il repeint au lieu d'appeler**, donc il juge sa propre maquette (439) ;
- **il mesure l'inverse de ce qu'on veut** (438 : le « grain » pris pour de la qualité — le grain
  montait, la propreté baissait, et le banc applaudissait).
⚠️ **Quand Guillaume voit un défaut qu'aucun banc ne voit, la première question n'est pas « où
est le bogue » mais « quelle grandeur ne mesure-t-on pas ».** Les cinq dernières fois, la réponse
tenait en deux ou trois nombres qu'il a suffi d'ajouter.

⚠️⚠️ **ET UN DÉFAUT MESURÉ, DOCUMENTÉ, PUIS LAISSÉ EN PLACE REVIENT TOUJOURS — PAR LA BOUCHE DE
GUILLAUME** (437, 439). La section « ce que ça ne fait pas » n'absout pas : c'est une **dette
datée**. **La première chose à faire en ouvrant un chantier est de relire celle du zip
précédent.**

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
- **Fin de session** : mettre ce fichier à jour sur demande. **Commits et push restent à
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
avait atteint cent lignes en mélangeant deux sujets sans rapport. Il ne reste ici que ce qui
est vrai à l'échelle du projet : **JavaScript, three.js, canevas**.

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
⚠️ **Ce qui est resté ici est resté exprès** : « la case d'un décor n'est pas la surface qu'il
couvre » est une règle du GÉNÉRATEUR, pas du dessin, et c'est pour ça qu'elle est en Architecture.


**Architecture**
- ⚠️⚠️⚠️ **LA CASE D'UN DÉCOR N'EST PAS LA SURFACE QU'IL COUVRE** (435 pour un cas, **440 pour la
  règle**). Le générateur raisonne en CASES ; le rendu dessine des sprites de 81, 67, 62 px — donc
  **une case occupée, quatre ou cinq couvertes**. Tout ce qu'une passe ultérieure sème tombe
  librement dans les cases couvertes : ça ne bloque rien, ça ne casse aucun trajet, **ça ne lève
  rien**, ça se voit — et c'est ainsi qu'un chêne s'est planté sur le tablier d'un pont. L'emprise
  se DÉRIVE du dessin (`townPropBox`, à partir de `planche.js`), jamais d'une largeur recopiée.
- ⚠️⚠️ **UNE LISTE NOIRE À LAQUELLE IL MANQUE UNE VALEUR NE LÈVE RIEN, ELLE LAISSE PASSER** (440).
  `plantTree` énumérait ce sur quoi on ne plante pas et avait oublié `G_BRIDGE`. **On énumère ce
  qui est PERMIS** : le jour où un `G_*` s'ajoute, il n'est pas plantable tant que personne ne
  l'écrit — c'est le seul sens qui résiste à l'ajout. Même famille que le `% 4` des étals (431).
- ⚠️⚠️ **UNE PASSE QUI PAVE DÉGAGE CE QU'ELLE PAVE** (437, 439, **440 trois fois**). C'est la
  famille de défauts la plus coûteuse du générateur : *une passe qui recouvre une passe antérieure
  sans le savoir*. Trois allées testaient `solid` avant de peindre — or un arbre n'est pas solide
  dans cette couche — et le gravier passait DESSOUS. Corollaire d'ordre : **ce qui est composé se
  pose avant ce qui est semé**, sinon le semis gagne l'arbitrage.
- ⚠️⚠️ **UN SECOND DE QUELQUE CHOSE SE PAIE EN NIVEAUX, PAS EN ZONES** (438). Une zone de plus
  aurait demandé de retrouver les **vingt-cinq** endroits qui testent `zone === "court"`, et en
  oublier un ne lève rien. Deux niveaux ne coûtent rien : tous les tests restent vrais, et deux
  joueurs dans deux bâtiments différents ne peuvent pas se confondre puisque leurs `y` diffèrent.
- ⚠️⚠️ **UNE VARIANTE DE DÉCOR EST UNE COUCHE, PAS UN NOUVEL IDENTIFIANT DE SOL** (434, 439). Un
  `G_*` de plus rouvre les quarante tests du moteur ; en oublier un ne lève rien, ça fait juste une
  rue qu'on ne traverse plus. Le sol garde son identifiant, un tableau parallèle dit avec quoi on
  le PEINT (`world.road`) ou de combien il MONTE (`tw._arch`, le dos d'âne des ponts).
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
- ⚠️⚠️ **UNE VARIANTE DE DÉCOR EST UNE COUCHE, PAS UN NOUVEL IDENTIFIANT DE SOL** (434). Peindre
  les rues de Valley Town en goudron/pavés/briques par trois `G_*` de plus aurait rouvert les
  **quarante** tests `ground === G_PATH` du moteur (marche, A* piéton, A* du taxi, arrêts,
  oiseaux, lampadaires, haies…) : en oublier un ne lève rien, ça fait juste une rue qu'on ne
  traverse plus. Le sol garde son identifiant, un tableau parallèle (`world.road`, comme
  `hedge` et `solid`) dit avec quoi on le PEINT. ⚠️ Et **la passe qui remplit cette couche est
  la DERNIÈRE du générateur** : elle ne peint que ce qui est encore du chemin, donc tout ce
  qu'une esplanade a recouvert entre-temps s'exclut tout seul — zéro cas particulier, alors
  qu'écrite plus tôt elle en aurait exigé un par esplanade.
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
| `components/ferme/enquete.js` | **l'ENQUÊTE (442) : la table des 21 lieux, les 8 chapitres, les 3 codes, le chiffre et les résolveurs purs.** Aucun React, aucun dessin — `verify-enquete.mjs` l'importe |
| `components/ferme/README.md` | **Valley Town, le tribunal, l'HÔTEL DE VILLE, l'ÉGLISE, l'ENQUÊTE, les habitants, la VENTE, les OISEAUX, les ÉLECTIONS et les PIÈGES de ces zones — autorité (428-442)** |
| `components/ferme/DESSIN.md` | **les règles de DESSIN, vraies partout — autorité (441, sorties du §4)** |
| `tools/README.md` | **les bancs, ce qu'ils attrapent et leurs chiffres — autorité (432-439)** |
| `components/ferme/fermeConstants.js` | réglages · **tous les `TOWN_*`, `COURT_*`, `WARDROBE_*`, `TOWN_STALL_TRADES`** · depuis le 440 il **importe `planche.js`** : une portée de pont et une emprise de décor sont des grandeurs de DESSIN, on les dérive du sprite au lieu de les recopier |
| `components/ferme/planche.js` | **GÉNÉRÉ** par `tools/import-planche.mjs` — les sprites de la planche de Guillaume, en données. Ne pas éditer à la main |
| `components/ferme/fermeArt.js` | **tous** les sprites, en canevas procédural. Aucun PNG · **`drawSeated()`** |
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

BlenderMCP est installé (Blender 5.2 LTS) et **répond**. Deux pipelines : **A** vers `crystal`
(on modélise, on rend, on **transcrit en table de données** — jamais de PNG dans le jeu ;
ombrage plat pur, **aucun** anticrénelage, quantification LINÉAIRE, courbe `Standard`, lampes
Soleil) ; **B** vers les jeux three.js en glTF (`candyluge_props.py`, hors dépôt, export sans
matériaux, maillages `part_<clé>`, 200-900 triangles).

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
⚠️ **Tous les sprites de la ferme, de Valley Town et du tribunal sont des canevas procéduraux**
dans `fermeArt.js`. Y introduire un PNG créerait un troisième pipeline (chargement, cache,
palette hors-fichier) pour un seul bâtiment.

---

## 10. Vérification

⚠️ **`node` EST INSTALLÉ (v24, npm 11), `npm install` est fait.** On peut **bâtir et jouer**.

⚠️⚠️ **NE JAMAIS LANCER `npx next build` PENDANT QUE `npm run dev` TOURNE.** Les deux écrivent
dans le MÊME `.next/` : le navigateur reçoit des **404 sur les chunks**, la page se charge, le
HUD s'affiche, et le canevas reste vide — exactement comme si le rendu était cassé. Une
demi-session perdue au 426 sur un bogue qui n'existait pas. **Remède** : arrêter le serveur,
`rm -rf .next`, redémarrer.

**`npx next build`** compile tout : le contrôle le moins cher sur 19 000 lignes.
⚠️ L'avertissement `'G_SOIL' is not exported` est **PRÉEXISTANT**. ⚠️ **SANS `.env.local`, LE
BUILD S'ARRÊTE APRÈS LA COMPILATION** sur `Error: supabaseUrl is required` (pré-rendu de
`/login` et `/signup`) — ce n'est PAS une régression. **Ce qui compte est
`✓ Compiled successfully` juste avant.**

⚠️⚠️ **LES BANCS ONT DÉMÉNAGÉ DANS `tools/README.md` AU 432**, sur l'ordre laissé par le
§14.2 du 431 : la liste occupait cinquante lignes et gagnait une entrée par zip. **Ce fichier ne
la recopie plus** — il en garde seulement ce qu'il faut savoir sans ouvrir l'autre : **14 bancs
de contrôle et 17 bancs de rendu** (comptés en listant `tools/`, pas de mémoire), et **trois
d'entre eux existent parce qu'un défaut vu par Guillaume
n'était mesuré nulle part** (`verify-compo` au 440, `verify-pont` au 441, `verify-enquete` au
442). ⚠️ Les deux qui touchent à de l'ARGENT sont `verify-vallee` (il joue des ventes complètes
et compte les pièces) et `verify-enquete` (il vérifie que le cours SANS enquête est bit à bit
celui du 430). **Tout chiffre écrit là-bas a été obtenu en lançant le banc**, c'est sa règle
d'entrée.

⚠️⚠️ **ET LE 441 A RAPPELÉ CE QUE VAUT UN BANC QUI N'A JAMAIS PU ÉCHOUER.** Le garde-fou de
source de `verify-pont` annonçait « 0 appel fautif » alors que son motif, ancré sur la fin de
ligne, ne pouvait matcher **aucun** appel terminé par `;` — c'est-à-dire presque tous. Il est
passé au vert sur une faute injectée exprès. **Tout banc qui compte des occurrences doit publier
combien il en a LUES** : c'est la seule façon de s'apercevoir qu'un scanner ne scanne rien.

⚠️ **CE QUI RESTE ICI EST LA LISTE DES BANCS QUI N'EXISTENT PAS, et c'est le point.** Une liste
de ce qui existe se vérifie en la lançant ; une liste de ce qui n'existe pas ne se vérifie
jamais — c'est elle, et elle seule, qui protège du banc imaginaire (§14.6) :
- ⚠️ **`verify-luge`, `verify-boot`, `preview-luge`, `preview.mjs`, `verify-perf` et
  `preview-fps` N'EXISTENT PAS** dans `tools/`.
- ⚠️ **AUCUN BANC NE REGARDE LA FERME EN IMAGE** : les dix-sept bancs de rendu ne dessinent que
  Valley Town, ses intérieurs, ses habitants et son enquête. Un décor de la ferme mal proportionné n'a, à ce
  jour, aucun endroit où se voir.
  ⚠️ **Et le SOL de la ferme non plus** : `render-rues` (434) peint les rues de la ville, pas les
  chemins de la ferme, qui restent sur la tuile unique de 16 px du zip 232.
  ⚠️⚠️ **AU 438 L'ÉCART EST DEVENU FRAPPANT, ET IL FAUT LE DIRE : la ferme garde les deux arbres
  du zip 232** (trois `arc()` et quatre triangles) **et son herbe en tuile de 16 px**, pendant que
  la ville a onze essences animées de 48×64 et un gazon au pavé de 64 px. C'est délibéré (décision du 424 : ne pas mêler deux changements
  visuels dans la même livraison) et c'est **la dette la plus visible du projet** — un joueur qui
  prend le train voit maintenant deux niveaux de finition.
- ⚠️ **AUCUN BANC NE REGARDE UNE FENÊTRE COMPLÈTE DE VALLEY TOWN.** `render-parc.mjs` (437) en
  approche dehors, `render-mairie.mjs` (438, refondu au 439) dedans : depuis le 439 il **appelle**
  les sols au lieu de les repeindre et il dessine les plaques de porte, donc c'est la première
  planche d'intérieur qui juge ce que le jeu dessine vraiment. **Ce qui manque encore est ce qui
  reste dans la closure : les BÂTIMENTS de la ville et les personnages.** Les autres bancs de
  rendu approximent toujours le décor autour de leur surface.
- ⚠️⚠️ **ET AUCUN BANC NE JOUE LA FERME PEUPLÉE À DEUX CLIENTS.** `fake-supabase.mjs` le permet
  depuis le 432 et l'a fait pour la VILLE (trois défauts trouvés le premier jour), puis pour
  l'ENQUÊTE au 442 (deux défauts, dont un que rien d'autre ne pouvait voir) ; **la ferme PEUPLÉE
  n'y est jamais passée**. C'est la passe la plus urgente du fichier (§13).
  ⚠️ **Et il faut savoir ceci avant d'essayer** (442, une demi-heure perdue) : le banc du
  navigateur ne compose une image QUE pendant une capture d'écran. `requestAnimationFrame` ne
  tourne donc que par à-coups, la boucle de rendu s'arrête entre deux appels, et le personnage ne
  se déplace pas. Le remède du §10 (remplacer `rAF` par un `MessageChannel`) MARCHE, mais il faut
  le poser PENDANT que des images tournent — c'est-à-dire juste avant une capture — sinon la
  chaîne d'appels est déjà morte et personne ne rappelle le remplaçant. ⚠️ Et un canevas mesuré
  pendant que le panneau est masqué sort à **0×0** : le jeu ne dessine plus rien et ça ressemble
  trait pour trait à un rendu cassé.
- ⚠️ **Le faux canvas de `lib-canvas.mjs` IGNORE `translate`/`rotate` et ne connaît pas
  `fillText`** : les trois poses d'une feuille de personnage s'y superposent, et un sprite qui
  dépend d'une transformation s'y juge faux. Ce n'est pas un bogue du jeu — mais il faut le
  savoir avant d'aller corriger un dessin qui n'a rien.
  ⚠️⚠️ **ET IL N'IMPLÉMENTAIT `drawImage` QU'À TROIS ARGUMENTS jusqu'au 428**, en ignorant
  silencieusement le reste : toute découpe dans une feuille de sprite y dessinait la feuille
  ENTIÈRE. Pas d'erreur, une image plausible, un verdict faux — le stub menteur, **dans l'outil
  censé nous en protéger**. Corrigé (3, 5 et 9 arguments, plus proche voisin). **Un banc de
  rendu se vérifie aussi.**

⚠️⚠️ **JOUER À DEUX EN LOCAL EST DEVENU POSSIBLE AU 432 : `node tools/fake-supabase.mjs`.**
REST bidon **+ relais Realtime**, donc deux onglets = deux joueurs, sans compte et sans
consommer un message du quota. `LAT=90 JIT=60` simule une vraie liaison ; il imprime le débit
réel PAR TYPE de message toutes les 5 s. **C'est lui qui a trouvé le défaut du 431**, et c'est
lui qu'il faut lancer pour la passe « gels de PNJ » réclamée en §13 depuis le 419.
⚠️ **Le piège si on le réécrit : le broadcast de supabase-js est BINAIRE**, pas JSON — un
relais qui ne lit que les trames texte voit tout se connecter et rien passer.
⚠️ **Et un onglet d'arrière-plan fausse TOUT** : `document.hidden` coupe `netCanBroadcast()`
(zéro position émise) et `requestAnimationFrame` est suspendu. Pour observer deux clients dont
un seul est au premier plan, il faut remplacer `rAF` par un **`MessageChannel`** (un
`setTimeout` est plafonné à 1 Hz en arrière-plan) ET redéfinir `document.hidden` **avant** que
le composant se monte — `hiddenRef` n'est relu que sur `visibilitychange`.

**Jouer en local** — deux échafaudages TEMPORAIRES, **à supprimer après** :
1. un `.env.local` pointant sur `http://127.0.0.1:54321` (voir `tools/fake-supabase.mjs`
   ci-dessus) ; sans lui on reste bloqué à l'écran « code de ferme » ;
2. une page jetable `app/<nom>/page.js` montant `<FermeGame room={{id}} me={{id,username}}
   players={[{profile_id, username, joined_at}]} isHost savedCode="XXXX" />`.
   ⚠️ **`players` EST OBLIGATOIRE** (`[...players]` plante sans lui). ⚠️ **Un dossier `app/`
   préfixé par `_` n'est PAS une route.** ⚠️ **La supprimer avant de livrer** : en production
   elle ouvre une ferme sans authentification.

Puis ⌘⇧X → menu développeur → **14 arrêts** (ferme, passage, Valley Town ×6 dont la
Haute-Ville, et les **sept niveaux d'intérieur** : tribunal ×3, mairie ×2, église ×2),
**« Peupler la ferme »** (427, qui installe 6/12/20 résidents d'un coup, artisans nommés
d'abord) et **« 🔍 Enquête »** (442 : repartir de zéro · lancer · boucler le chapitre · tout
jusqu'au dépôt). Sans eux, ni la vie sociale de la ville ni le huitième chapitre de l'enquête
ne sont observables avant une heure de jeu — donc jamais.
⚠️⚠️ **LES QUATRE ARRÊTS D'INTÉRIEUR MANQUAIENT DEPUIS LE 438 ET LE 441**, alors que le code de
destination savait déjà traiter « hall » : seule l'entrée de menu manquait. **Un chemin de code
sans porte n'existe pas**, et aucun banc ne comparait la liste des niveaux à celle des arrêts —
`verify-enquete` le fait depuis le 442, dans les deux sens.
⚠️ **ET AUCUN BOUTON D'ENQUÊTE NE CRÉDITE UN OR** : le menu s'ouvre à tout joueur qui connaît le
raccourci (398), donc « boucler le chapitre » qui paierait serait une planche à billets à un
clic. Le chemin développeur appelle les mêmes résolveurs et JETTE le gain.

⚠️ **Automatisation du navigateur, ce qui marche et ce qui ne marche pas :**
`window.dispatchEvent(new KeyboardEvent("keydown", {code:"KeyE"}))` marche pour TOUTES les
touches ; les frappes envoyées par l'outil navigateur, elles, n'atteignent pas le jeu. Le menu
ouvert bloque les déplacements. La capture d'écran de l'outil **fonctionne** (au 426 elle
échouait) ; `canvas.toDataURL()` POSTé à un puits sur disque reste le repli.
⚠️⚠️ **UN ONGLET CACHÉ SUSPEND `requestAnimationFrame`, DONC TOUTE LA SIMULATION DE L'HÔTE.**
Rien ne bouge entre deux captures, et on conclut à tort que les PNJ sont bloqués. Repli pour
observer : remplacer `requestAnimationFrame` par un `setTimeout` quand `document.hidden`,
**puis fronter la fenêtre une fois** pour amorcer la première image.

**Session manuelle à 2 joueurs — seule vraie validation du multijoueur.**
⚠️ **Un stub qui « retombe sur une valeur raisonnable » ment mieux qu'un stub qui plante.**
**Quand un outil et le jeu divergent, croire le jeu.**

---

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

- ⚠️⚠️ **LE 442 A RÉPONDU À « LEQUEL SE BRANCHE EN PREMIER », ET LA RÉPONSE EST « LES DEUX, PAR
  UNE HISTOIRE »** — ce qui n'était pas prévu et qui vaut d'être noté. L'enquête fait consulter le
  **cadastre** de la mairie (on y tape une cote, un tiroir s'ouvre) et déposer un acte chez le
  **notaire** du tribunal : les deux guichets fonctionnent, mais pour UNE parcelle, celle de
  l'histoire. Ce qui reste ouvert est donc plus étroit qu'avant : **acheter une parcelle
  QUELCONQUE**, avec un prix, un titre et une conséquence sur la carte. Le chemin est tracé, la
  mécanique de saisie et d'arbitrage existe.
  ⚠️ **Le MARIAGE, lui, n'a pas bougé** — la salle est dressée, les bans sont prêts, il manque
  l'officier depuis le 439. C'est le seul endroit du jeu où deux joueurs feraient quelque chose
  ENSEMBLE qui ne soit pas du commerce, et l'enquête du 442 ne l'a pas remplacé : elle se MÈNE à
  deux, elle ne se CÉLÈBRE pas.
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
  désormais. ⚠️ **LE 442 EN A LIVRÉ LA FORME SANS LA MÉCANIQUE** : l'enquête est une course à
  vingt-et-une étapes réparties sur les trois cartes, avec un carnet qui dit toujours ce qu'on
  cherche, un état partagé arbitré par l'hôte et une récompense par palier. Une commission, c'est
  la même chose en plus court — la table de `enquete.js` est le patron, et il est mesuré ;
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
  ⚠️ **ET LE 442 A AJOUTÉ UNE SECONDE RAISON D'Y ALLER, QUI N'EST PAS DE L'ARGENT** : l'enquête
  fait faire l'aller-retour au moins deux fois (la borne d'origine est à la ferme, tout le reste
  est en ville), et elle le fait en donnant à chaque trajet quelque chose à rapporter. Si le
  voyage cesse d'être une corvée, ce sera peut-être pour cette raison-là plutôt que par un
  réglage — à juger en jouant, comme prévu.
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
- ⚠️⚠️ **L'ENQUÊTE DU 442 — TROIS CHOSES À TRANCHER, ET AUCUNE N'EST TECHNIQUE.**
  **1. Le prix des deux issues.** Restituer la parcelle libère le marché (la cote peut descendre
  à −22 % et monter à +56 %) ; maintenir le fonds relève le plancher à +8 %. Les deux paient
  (3 000 et 5 000 or). C'est un arbitrage entre LIBERTÉ et GARANTIE, et personne ne l'a encore
  vécu sur une soirée : si « maintenir » est toujours le bon choix, le choix n'en est pas un.
  **2. Faut-il qu'elle donne autre chose que de l'or ?** Elle ne rend ni objet, ni graine, ni
  familier — délibérément, pour ne pas ouvrir un guichet de plus. Mais la parcelle restituée est
  une TERRE, et le jeu sait déjà vendre des parcelles au cadastre : la relier serait la suite
  évidente, et c'est une décision de conception.
  **3. Une deuxième enquête ?** La table de `enquete.js` en accepte une autre sans une ligne de
  moteur ; ce qui coûte, c'est l'écriture. À décider seulement après avoir joué celle-là.
- **La garde-robe** (427) : les prix sont volontairement très hauts. À jouer pour savoir si
  « très cher » veut dire « on économise pour » ou « on n'y va jamais ».
- **`candyluge`** : voir `public/candyluge/README.md`, qui fait autorité. La décision qui
  manque est de CONCEPTION (le bonbon empoisonné), pas de technique.
- **Gels de PNJ chez l'invité** (359-365) : encore observés ? Vérification demandée depuis le
  419 — session réelle à 2, **ferme PEUPLÉE**, console de l'hôte ouverte. ⚠️⚠️ **C'EST TOUJOURS
  LA PASSE LA PLUS URGENTE DE CE FICHIER**, et le 442 ne l'a pas faite : sa séance à deux clients
  a validé la chaîne réseau de l'enquête sur une ferme VIDE, ce qui ne dit rien des vingt
  résidents. Elle a en revanche montré que la recette du §10 marche (deux onglets, deux joueurs,
  un état partagé qui traverse) — l'excuse technique est tombée pour de bon. Le 427 a doublé la population et ajouté une seconde carte
  peuplée ; le 428 fait circuler ces vingt résidents pour de bon (79 % de leurs trajets
  n'aboutissaient pas) et fait diffuser un champ de plus dans le paquet de position (l'assise).
  **Rien de tout ça n'a été vu à deux joueurs** — les bancs mesurent la simulation de l'hôte,
  pas ce que voit l'invité. ⚠️ **L'EXCUSE EST TOMBÉE AU 432** : `tools/fake-supabase.mjs` fait
  tourner deux clients en local (§10). La première séance a immédiatement trouvé trois défauts
  du multijoueur de la VILLE ; la ferme peuplée n'a toujours pas été passée au même crible.
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
   ⚠️⚠️ **ET L'ORDRE LAISSÉ PAR LE 433, QUATRE FOIS REPORTÉ, A ÉTÉ EXÉCUTÉ : §13 EST RELU LIGNE
   À LIGNE.** Résultat, et il vaut la peine : **une ligne était devenue FAUSSE** (« achète-t-on
   une parcelle, et à quel guichet ? » — tranché au 439), **une était périmée** (« un joueur qui
   appuie sans rien voir se passer croit que la touche est cassée » : il se passe quelque chose
   depuis que les pigeons restent), **une recopiait un chiffre que le banc mesure** (les blocs de
   prairie nue) — c'est la troisième fois que ce chiffre-là traîne un compte périmé, il renvoie
   désormais au banc. *Une question à laquelle on a répondu ne sort pas du fichier toute seule :
   elle y reste, et elle ment.*
   Historique : 426 (insuffisant), 427 (profond : §7 → `public/candyluge/README.md`), 428 (§6 →
   `components/ferme/README.md`, 507 → 490), 431 (§4 scindé, 534 → 482),
   **432 (§10 → `tools/README.md`, 524 → 483)**, 433 à 438 (aucun), **439 (en-tête + §13,
   687 → 661)**, 440 (aucun — trois leçons ajoutées en §4, seize lignes),
   **441 (§4 scindé une seconde fois : le DESSIN part dans `components/ferme/DESSIN.md`)**.
   ⚠️⚠️ **L'ORDRE DU 440 A ÉTÉ EXÉCUTÉ AU 441, APRÈS DEUX REPORTS.** Le §4 avait passé les
   cent-cinquante lignes en mélangeant trois sujets ; sa partie DESSIN est partie dans
   `components/ferme/DESSIN.md`, à côté des dessins qu'elle gouverne, exactement comme §6 au 428
   et §10 au 432. Chaque ligne a été relue avant de bouger, et **ce qui est resté est resté
   exprès** : « la case d'un décor n'est pas la surface qu'il couvre » est une règle du
   GÉNÉRATEUR, pas du dessin.
   ⚠️⚠️ **L'ORDRE DU 441 A ÉTÉ EXÉCUTÉ AU 442 : §13 EST RELU LIGNE À LIGNE, ET DEUX ENTRÉES
   ÉTAIENT DEVENUES FAUSSES.** « Lequel des deux guichets se branche en premier » n'était plus
   une question ouverte — l'enquête a branché les DEUX, pour une parcelle ; et « aucune session à
   deux clients » ne l'était plus non plus, la séance du 442 ayant eu lieu (sur une ferme vide, ce
   qui est dit). Une question à laquelle on a répondu ne sort pas du fichier toute seule : elle y
   reste, et elle ment. Trois entrées ont été RESSERRÉES au lieu d'être ajoutées (l'église, les
   commissions, le voyage), et le 442 n'en ajoute qu'une : les trois arbitrages de l'enquête.
   ⚠️ **L'ORDRE DU PROCHAIN ZIP : §10.** Il a grossi de dix lignes au 442 (la recette du banc de
   navigateur, la liste des bancs) et il redit maintenant des choses que `tools/README.md` dit
   mieux. Le §14.2 est clair sur ce que devient une liste qui gagne une entrée par zip : elle
   part, en ne gardant ici que **ce qui n'existe pas**.

3. **Critère d'inclusion** : « est-ce vrai à l'échelle du projet, et invérifiable en ouvrant
   un seul fichier ? » Sinon, ça va dans un commentaire de code. **L'histoire d'un défaut
   corrigé n'y a pas sa place — seule sa LEÇON, en §4.**
4. **Écrire pour un modèle fort.** Densité maximale, phrases courtes, tableaux.
5. **Dire ce qui n'est PAS fait**, avant le reste.
6. ⚠️ **NE JAMAIS AFFIRMER QU'UN OUTIL EXISTE SANS L'AVOIR LANCÉ.** Le 425 décrivait
   `verify-vallee.mjs` « 74 contrôles, 74/74 » : le fichier n'existait pas. Un banc imaginaire
   fait passer pour testé ce qui ne l'est pas — c'est le stub menteur du §10, appliqué à la
   documentation elle-même. **Tout chiffre de banc écrit ici a été obtenu en le lançant.**
