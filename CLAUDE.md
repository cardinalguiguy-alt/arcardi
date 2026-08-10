# CLAUDE.md — CONTEXTE ARCARDI

**Lis ce fichier en entier avant toute action. Puis arrête de lire et demande.**
Il remplace l'exploration du dépôt pour tout ce qui est global. Le README est un journal
chronologique inversé : c'est de l'**histoire**, pas de l'orientation.

État à jour du **zip 436**. Chantier actif : **rendre Valley Town habitable au regard** — le
taxi y roule droit et est enfin dessiné comme une voiture, l'hôtel de ville tient debout, la
place a des pigeons, les rues ont un revêtement (434), l'eau a une rive et un fond (435), et
**toute la pierre de la Haute-Ville est refaite** (436 : marches, falaise, limon, dallage).
Tout ce qui concerne la ville, ses habitants ET **ses pièges** est dans
**`components/ferme/README.md`**, qui fait autorité ; les bancs sont dans **`tools/README.md`**.
**`candyluge` et `crystal` sont EN PAUSE.**

⚠️⚠️⚠️ **LA CLOSURE DE LA BOUCLE DE RENDU A COÛTÉ DEUX FONCTIONNALITÉS EN DEUX ZIPS. C'EST
DÉSORMAIS LE PIÈGE N°1 DU PROJET (§4).** Au 430, `tryTownJump` : le saut de rebord mort partout
en ville, sans qu'un seul banc puisse le voir. Au 431, `canStandTown` appelée par
`advanceRemote` : **Valley Town injouable à deux** — chaque image où un joueur distant se
DÉPLAÇAIT levait un `ReferenceError` au milieu du dessin, donc l'image était amputée (en ville)
ou perdue en entier (à la ferme, où `advanceRemote` tourne AVANT toute peinture). Mesuré à deux
clients réels : **97 % d'images figées, sauts de 116 px** → **3 % et 6 px** après correction.
**Une fonction déclarée dans la closure du rendu et appelée depuis le composant ne lève rien à
la compilation, rien au banc, et casse une image sur deux en jeu. On EXPOSE par un ref
(`townJumpApiRef`, `zoneCollideRef`), on ne recopie jamais.**

⚠️⚠️⚠️ **ET LA MÊME CLOSURE A UNE SECONDE FAÇON DE COÛTER CHER, DÉCOUVERTE AU 436 : ELLE NE
PLANTE PAS, ELLE FAIT VIEILLIR.** L'audit graphique de Valley Town a trouvé que **tout ce qui
était mal dessiné dans la ville était mal dessiné au MÊME ENDROIT** — dans la closure du rendu.
Les revêtements de rue (434) et l'eau (435) en étaient sortis pour qu'un banc puisse les
regarder, et ce sont exactement les deux surfaces que personne ne trouve pauvres ; les marches,
le parement de falaise, le limon et le dallage d'esplanade y sont restés depuis le 425, et ce
sont exactement celles que Guillaume a nommées (« un écart flagrant de qualité de textures »).
**Un dessin qu'aucun banc ne peut appeler ne se dégrade pas : il reste au niveau du jour où il a
été écrit, pendant que tout ce qui est mesuré monte.** L'écart n'est donc pas un écart de soin,
c'est un écart de DATE, et il se lit sur une carte du dépôt sans regarder une image. ⚠️ Corollaire
opérationnel : **la question « ce dessin est-il regardable par un banc ? » est une question de
QUALITÉ, pas d'outillage**, et elle se pose avant d'écrire le premier `fillRect`.

⚠️⚠️ **ET ENRICHIR UNE TEXTURE REND VISIBLES LES ERREURS DE GÉOMÉTRIE QU'ELLE CACHAIT** (436).
En passant les marches du gris uni à la pierre, on a découvert que **22 des 52 cases d'escalier
de la ville étaient dessinées perpendiculairement à leur volée** — depuis le 425. Le défaut
n'était pas nouveau, il était devenu visible. **Il faut donc s'attendre à en trouver après
chaque montée en qualité, et avoir un banc pour les voir** : ici c'est `render-escaliers.mjs`,
écrit le même jour, qui l'a montré.

⚠️⚠️ **ET LE MULTIJOUEUR DE LA VILLE N'AVAIT JAMAIS ÉTÉ JOUÉ À DEUX** — c'est ça, la vraie
leçon. Deux autres défauts sont tombés dans la même passe, tous deux invisibles seul : les
joueurs du **tribunal** n'étaient jamais avancés (`advanceRemote` sortait sur `null` pour cette
zone), et le champ `sit` **voyageait depuis le 428 sans jamais être lu** — personne n'a jamais
vu personne s'asseoir. **Un banc à deux clients est monté depuis** (§10).

⚠️⚠️ **ET DEUX DÉCALAGES ONT ÉTÉ TROUVÉS PAR GUILLAUME, EN JEU, DEVANT TROIS BANCS DE RENDU
QUI LES REGARDAIENT SANS LES VOIR** : la rangée d'étals penchait d'une case et demie, et la
colonnade du tribunal de six pixels — **depuis le 425**. Un défaut de symétrie ne se voit pas
en regardant l'élément fautif : la rangée est impeccable, c'est son RAPPORT À L'AXE qui est
faux. Toute position se DÉDUIT désormais d'un centre, et un contrôle de symétrie est entré au
banc de rendu. **Corollaire général : une position réglée à la main est une position qui
penchera.** ⚠️ **Payé DEUX FOIS DE PLUS au 433** : le perron de l'hôtel de ville était centré
sur le corps de logis alors que la porte est sous le beffroi (on montait trois marches devant
un mur plein), et le taxi montait dans la bouche de chaque rue latérale parce que sa mesure de
« milieu de chaussée » comptait l'amorce des rues transversales comme de la chaussée.

⚠️⚠️ **ET UN BANC PEUT AUSSI ÉCHOUER SUR UNE CHOSE DEVENUE BONNE — MÊME CAUSE, SENS INVERSE.**
Au 434, l'élargissement de l'artère a fait échouer le contrôle d'axe du taxi, qui exigeait un
écart de moins de **0,22 case** : un seuil ABSOLU, calibré sur une ville faite de rues de deux
cases. Mesuré par largeur, la conduite était pourtant meilleure qu'avant (0,156 de
demi-chaussée sur l'artère de quatre, contre 0,180 sur les rues de deux). **Un seuil exprimé
dans une unité qui dépend du décor devient faux le jour où le décor change** — et il est alors
tentant de le desserrer, ce qui tue le banc. On change d'UNITÉ, pas de seuil, et on garde
l'ancienne mesure imprimée à côté.

⚠️⚠️ **ET UN BANC QUI PASSE NE VEUT PAS DIRE QUE LA CHOSE EST BONNE — IL VEUT DIRE QU'ON
MESURE AUTRE CHOSE.** Au 433, les douze contrôles du taxi disaient tous OK pendant que
Guillaume voyait « une trajectoire stupide » : ils mesuraient l'arrivée, la chaussée et la
vitesse, **jamais la forme du trajet**. Idem pour les pigeons — ils arrivaient, se posaient, ne
restaient pas en l'air, et se comportaient quand même « comme les animaux de la ferme ». **Quand
Guillaume voit un défaut qu'aucun banc ne voit, la première question n'est pas « où est le
bogue » mais « quelle grandeur ne mesure-t-on pas ».** Les deux fois, la réponse tenait en
trois nombres qu'il a suffi d'ajouter (§10, `tools/README.md`).


---

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
| `components/ferme/README.md` | **Valley Town, le tribunal, les habitants, la VENTE, les OISEAUX et les PIÈGES de ces trois zones — autorité (428-433)** |
| `tools/README.md` | **les bancs, ce qu'ils attrapent et leurs chiffres — autorité (432-433)** |
| `components/ferme/fermeConstants.js` | réglages · **tous les `TOWN_*`, `COURT_*`, `WARDROBE_*`, `TOWN_STALL_TRADES`** |
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
- **Ce qui n'est pas fait** : aucun service du tribunal, pas de coiffeur au salon, aucun PNJ
  n'habite la ville à demeure, pas d'intérieur de maison, vingt blocs de prairie nue, et le
  **marché / les commissions / les rendez-vous datés sont décidés mais pas construits**.

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
§14.2 du 431 : la liste occupait cinquante lignes et gagnait une entrée par zip. Ce qu'il faut
savoir sans l'ouvrir : `verify-vallee.mjs` (**172/172**) rejoue le VRAI moteur — circulation,
murs invisibles, tribunal, coupe de bois, et **des ventes complètes avec l'or compté** ;
`verify-taxi.mjs` (**18/18**) rejoue les 132 courses image par image, **y compris la FORME du
trajet** depuis le 433 ; sept bancs de RENDU dessinent ce qui n'est autrement regardable qu'en
jouant (assise, échelle, foire, tribunal + **symétrie des façades**, ruche, taxi, **oiseaux —
ce dernier rejoue aussi quatre minutes de vie de groupe**) ; **`fake-supabase.mjs` fait tourner
deux clients en local**.

⚠️ **CE QUI RESTE ICI EST LA LISTE DES BANCS QUI N'EXISTENT PAS, et c'est le point.** Une liste
de ce qui existe se vérifie en la lançant ; une liste de ce qui n'existe pas ne se vérifie
jamais — c'est elle, et elle seule, qui protège du banc imaginaire (§14.6) :
- ⚠️ **`verify-luge`, `verify-boot`, `preview-luge`, `preview.mjs`, `verify-perf` et
  `preview-fps` N'EXISTENT PAS** dans `tools/`.
- ⚠️ **AUCUN BANC NE REGARDE LA FERME EN IMAGE** : `render-echelle`, `render-foire`,
  `render-tribunal`, `render-oiseaux`, `render-taxi`, `render-rues`, `render-eau` et
  `render-escaliers` ne dessinent que Valley Town et ses habitants. Un décor de la ferme mal
  proportionné n'a, à ce jour, aucun endroit où se voir. ⚠️ **Et le SOL de la ferme non plus** :
  `render-rues` (434) peint les rues de la ville, pas les chemins de la ferme, qui restent sur
  la tuile unique de 16 px du zip 232 — **c'est désormais le sol le plus pauvre du projet**,
  puisque la ville a fini de refaire les siens au 436.
- ⚠️ **AUCUN BANC NE REGARDE UNE FENÊTRE COMPLÈTE DE VALLEY TOWN.** Les six bancs de rendu de
  la ville peignent chacun SA surface (les rues, l'eau, la pierre) et approximent le reste à sa
  teinte moyenne, parce que les bâtiments, les props et les personnages se dessinent dans la
  closure. Il n'existe donc aucun endroit où l'on voie la ville comme le joueur la voit —
  seulement des morceaux, chacun mesuré chez lui. C'est le prochain angle mort, et il est
  connu.
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

Puis ⌘⇧X → menu développeur → **10 arrêts** (ferme, passage, Valley Town ×6 dont la
Haute-Ville, tribunal ×3) et **« Peupler la ferme »** (427), qui installe 6/12/20 résidents
d'un coup, **artisans nommés d'abord** — sans lui, la vie sociale de la ville n'est
observable qu'après une heure de jeu, donc jamais.

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

- **Le tribunal** (§6) : quel service ouvre EN PREMIER ? Le cadastre est le plus mûr (les
  panneaux « à vendre » existent depuis le 234) ; le notaire est le plus utile à deux joueurs.
- **Le salon de coiffure** (427) : **qui coiffe, et comment ça marche ?** Le bâtiment,
  l'enseigne et la banderole « ouverture prochaine » sont posés ; il manque la décision.
- **Valley Town** : quels PNJ HABITENT la ville à demeure (les résidents ne font qu'y passer) ?
  achète-t-on une parcelle, et à quel guichet ?
  ⚠️ **Et la prairie : VINGT blocs de 28×28 de la carte sont de l'herbe nue** (mesuré au 428).
  Ce n'est plus une impression, c'est un chiffre. On n'y a délibérément posé AUCUN endroit de
  vie : des résidents qui vont contempler un champ vide, c'est du remplissage. La question
  n'est donc pas « comment les meubler » mais **« qu'est-ce qu'on construit là »**.
- ⚠️ **DEUX DES TROIS CHANTIERS DE JOUABILITÉ RESTENT À CONSTRUIRE.** Le marché est livré au
  430 et **devenu le SEUL guichet au 431** : la ferme montre et transforme, la ville achète.
  L'économie existe donc vraiment, et le **jour de marché** hebdomadaire est déjà un
  rendez-vous daté. Restent :
  **1. les commissions** — le tableau des nouvelles distribue des demandes de la ville, qu'on
  remplit depuis la ferme, à deux, contre paiement. Elles s'appuient sur l'économie qui existe
  désormais ;
  **2. les rendez-vous datés** — concert au kiosque, foire : des événements au calendrier
  partagé qui rassemblent résidents ET joueurs au même endroit à la même heure. ⚠️ Le patron
  est déjà écrit deux fois (jour de marché, jour de service de Carla) : **une pure fonction du
  numéro de jour, jamais un état**.
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
- ⚠️ **LE PAIN DES PIGEONS EST GRATUIT (433) — ARBITRAGE À TRANCHER.** Assis sur un banc de la
  ville, Espace éparpille des miettes et le vol se rassemble. Le gager sur un `bread` du stock
  d'artisanat lierait la scène à l'économie qui vient d'être bouclée (joli), mais changerait un
  geste d'ambiance en dépense — et un joueur assis qui appuie sans rien voir se passer croit
  que la touche est cassée. **Question de conception, pas de technique.**
- ⚠️ **LES OISEAUX NE SONT PAS PARTAGÉS ENTRE LES DEUX JOUEURS** (433, décision de Guillaume :
  « leur comportement doit pas être exactement partagé »). Les emplacements se déduisent de la
  carte, mais le nombre et les activités sont tirés chez chaque client — deux joueurs sur la
  même place ne comptent pas les mêmes pigeons. **À JOUER À DEUX** pour dire si ça se remarque ;
  si oui, le pain seul mérite d'être diffusé (un `send` de trois nombres), pas les oiseaux.
- **La garde-robe** (427) : les prix sont volontairement très hauts. À jouer pour savoir si
  « très cher » veut dire « on économise pour » ou « on n'y va jamais ».
- **`candyluge`** : voir `public/candyluge/README.md`, qui fait autorité. La décision qui
  manque est de CONCEPTION (le bonbon empoisonné), pas de technique.
- **Gels de PNJ chez l'invité** (359-365) : encore observés ? Vérification demandée depuis le
  419 — session réelle à 2, ferme peuplée, console de l'hôte ouverte. ⚠️⚠️ **C'EST LA PASSE LA
  PLUS URGENTE DE CE FICHIER.** Le 427 a doublé la population et ajouté une seconde carte
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
   ⚠️ **LE 431 A EXÉCUTÉ L'ORDRE DU 430 : §4 EST SCINDÉ.** Les pièges de la ferme, de la ville
   et du tribunal sont partis dans `components/ferme/README.md` §15 ; il ne reste ici que
   JavaScript / three.js / canevas, plus le seul piège d'architecture (les deux cartes). Le
   fichier est passé de **534 à 482 lignes** — deuxième rétrécissement de son histoire.
   ⚠️⚠️ **ET LA VÉRIFICATION EXIGÉE PAR L'ORDRE A SERVI DÈS LA PREMIÈRE LIGNE** : « la boucle
   de nuages tourne à vide (`SKY_CLOUD_COUNT: 0`) » ne correspondait à AUCUN symbole du dépôt.
   Recopié ailleurs, il aurait survécu un zip de plus. **Relire chaque ligne contre le code
   avant de la déplacer n'est pas une formalité : c'est là qu'on trouve les périmées.**
   Historique : 426 (insuffisant), 427 (profond : §7 → `public/candyluge/README.md`, §9 réduit
   à cinq pièges), 428 (§6 → `components/ferme/README.md`, 507 → 490), 431 (§4 scindé),
   **432 (§10 → `tools/README.md`, 524 → 483)**.
   ⚠️⚠️ **LE 436 N'A PAS ÉLAGUÉ NON PLUS, ET LA DETTE EST MAINTENANT NOMMÉE.** Il ajoute deux
   blocs en §4 (la closure qui fait vieillir ; enrichir une texture révèle la géométrie) et deux
   entrées à la liste des bancs absents ; tout le reste part dans les deux fichiers qui font
   autorité (`components/ferme/README.md` gagne son §19, `tools/README.md` un banc et deux
   mises à jour). **L'ordre laissé au 433 — relire §13 ligne à ligne contre le dépôt — n'est
   toujours pas exécuté, et il est maintenant DEUX FOIS reporté.** Deux de ses lignes sont déjà
   fausses ou périmées telles qu'écrites : « un lac qui n'a ni reflet, ni vaguelettes de rive »
   (livré au 435), et l'entrée sur les maisons, qui mélange une question de contenu (dix façades
   pour vingt-sept parcelles) avec une question d'eau désormais réglée. **C'est exactement ce
   que le 431 a trouvé en relisant §4 : la première ligne relue était périmée.**
   ⚠️ **LE 433 N'A PAS ÉLAGUÉ, ET IL LE DIT** : le fichier passe de 492 à ~525 lignes, tout
   l'apport partant dans les trois fichiers qui font autorité (`components/ferme/README.md` a
   gagné deux chapitres, `tools/README.md` trois bancs). Ce qui est remonté ici tient en deux
   points, et les deux valent pour le projet entier : le canevas qui découpe, payé trois fois
   dans le seul 433 ; et « un banc qui passe pendant que Guillaume voit un défaut ne dit pas
   que la chose est bonne, il dit qu'on mesure autre chose ». **Le seuil de 200 lignes est
   dépassé depuis longtemps ; la passe d'élagage réclamée par le point 2 reste DUE.**
   ⚠️⚠️ **LE 432 A EXÉCUTÉ L'ORDRE DU 431, ET LE SEUIL A ÉTÉ FRANCHI EXACTEMENT COMME ANNONCÉ** :
   deux entrées ajoutées (`render-ruche`, `fake-supabase`) ont porté la liste des bancs au-delà
   de la moitié de §10. Elle est partie dans `tools/README.md` ; **il ne reste ici que la liste
   des bancs ABSENTS**, qui est la vraie protection contre le banc imaginaire (§14.6) — une
   liste de ce qui existe se vérifie en la lançant, une liste de ce qui n'existe pas ne se
   vérifie jamais.
   ⚠️ **L'ORDRE DU PROCHAIN ZIP : §13, ET IL A ENCORE GROSSI AU 433 (deux entrées de plus).** Il fait quarante lignes de
   questions ouvertes et n'en perd jamais : chaque zip en ajoute et aucun n'en retire, parce
   qu'une question à laquelle on a répondu se transforme en fonctionnalité et sort du fichier
   par une autre porte. **Le jour où il dépasse §4, il faut le RELIRE ligne à ligne contre le
   dépôt** — comme le 431 l'a fait pour §4, où la première ligne relue était périmée.
3. **Critère d'inclusion** : « est-ce vrai à l'échelle du projet, et invérifiable en ouvrant
   un seul fichier ? » Sinon, ça va dans un commentaire de code. **L'histoire d'un défaut
   corrigé n'y a pas sa place — seule sa LEÇON, en §4.**
4. **Écrire pour un modèle fort.** Densité maximale, phrases courtes, tableaux.
5. **Dire ce qui n'est PAS fait**, avant le reste.
6. ⚠️ **NE JAMAIS AFFIRMER QU'UN OUTIL EXISTE SANS L'AVOIR LANCÉ.** Le 425 décrivait
   `verify-vallee.mjs` « 74 contrôles, 74/74 » : le fichier n'existait pas. Un banc imaginaire
   fait passer pour testé ce qui ne l'est pas — c'est le stub menteur du §10, appliqué à la
   documentation elle-même. **Tout chiffre de banc écrit ici a été obtenu en le lançant.**
