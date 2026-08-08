# Valley Town, le tribunal, et la vie qui s'y passe — état au 430

Ce fichier est **l'autorité** sur la seconde carte du jeu et sur ses habitants. Il a été
extrait de `CLAUDE.md` §6 au zip 428, sur l'ordre laissé par le §14.2 du 427 et sur le modèle
exact de `public/candyluge/README.md` : un chapitre qui grossit à chaque zip n'a rien à faire
dans le fichier qu'on relit **avant de travailler sur autre chose**. `CLAUDE.md` n'en garde
qu'un paragraphe d'orientation, et les pièges qui valent pour tout le projet restent en §4.

**Ce qui n'est PAS fait, avant le reste :**
- aucun service du tribunal ne fonctionne (le bâtiment le DIT, voir plus bas) ;
- le salon de coiffure n'a ni coiffeur ni mécanique — la décision manque, pas le code ;
- **aucun PNJ n'habite la ville à demeure.** Les résidents la VISITENT depuis la ferme ;
- pas d'intérieur de maison ;
- **vingt blocs de 28×28 sont de la prairie non aménagée** (mesuré au 428). Le sud-est
  surtout. Ce n'est pas un oubli, c'est une question ouverte : voir `CLAUDE.md` §13 ;
- **les commissions et les rendez-vous datés ne sont toujours pas construits** (décidés au
  428). Le marché, lui, est livré au 430 — et il porte déjà la graine du troisième : le
  **jour de marché** hebdomadaire est un rendez-vous daté, dérivé du calendrier ;
- **les MAISONS et le LAC n'ont pas été retouchés au 429** alors que Guillaume les a nommés
  dans sa revue. Leurs échelles sont justes (×3,48 et sans objet), et les défauts qu'on leur
  trouve sont de CONTENU, pas de dessin : dix façades pour vingt-sept parcelles (donc des
  jumelles côte à côte), et un lac qui n'a ni reflet, ni vaguelettes de rive, ni rien à y
  faire. Les corriger demande des décisions, pas des pixels.

---

## 1. La carte

**224×168**, regénérée à graine fixe par `E.generateTownWorld()`, **jamais persistée** —
c'est ce qui autorise à tout refaire d'un bloc, sans migration.

Cinq avenues est-ouest (`TOWN_ST_ROWS`) et quatre nord-sud (`TOWN_ST_COLS`) · une place de
30×26 (fontaine, obélisque, parterres, **tableau des nouvelles**) · **27 parcelles** en jardin
clos de haie · un parc avec étang et **kiosque à musique** · un verger · un **champ de foire**
(10 étals, puits, caisses) · un **cimetière** · un **lac au sud** avec promenade et ponton ·
le **quartier des artisans** à l'est · la **Haute-Ville** (terrasse à 1 unité) et son
**belvédère** (2) · une **gare**.

**Cinq bâtiments civiques ou commerciaux** en canevas procédural : `TOWN_CHURCH`, `TOWN_HALL`,
`TOWN_COURT` (néoclassique, en Haute-Ville — il donne leur raison d'être aux escaliers), plus
`TOWN_BOUTIQUE` et `TOWN_SALON`, en Haute-Ville eux aussi (« les hauteurs sont les belles
adresses » — une boutique chic au ras de la rue n'est qu'une échoppe de plus ; un panneau au
pied des marches l'annonce).

**La gare** réutilise `railL`/`railR`/`platform`/`station` **de la ferme, tels quels**. La
ville peignait ses rails à la main depuis le 234 — deux dessins de la même voie ferrée.

### Le relief

⚠️ **L'ALTITUDE EST UNE PROPRIÉTÉ DE LA CASE, PAS DU PERSONNAGE** (tableau `elev`). Une seule
règle — « pas plus de `TOWN_STEP_MAX` d'un pas » — fait tenir les falaises ET marcher les
escaliers, sans aucun cas particulier. Le décalage à l'écran vaut `elev × TOWN_ELEV_PX`, donc
collision et dessin ne peuvent pas diverger. **Espace saute d'un rebord**, jamais vers le haut.
Rien de tout ça ne circule sur le réseau.

---

## 2. La navigation (428) — on a inversé une décision

⚠️⚠️ **LE 427 ÉCRIVAIT « LA PARADE N'EST PAS UN A*, C'EST UN ITINÉRAIRE ». C'ÉTAIT FAUX, ET
ÇA A ÉTÉ MESURÉ.** En rejouant le vrai suiveur sur la vraie carte :

| | 427 (ligne droite + `townStairRoute`) | 428 (vrai chemin) |
|---|---|---|
| depuis le quai | **15/64 (23 %)** | **127/127 (100 %)** |
| d'un endroit à un autre | **94/394 (24 %)** | **16 002/16 002 (100 %)** |
| vie complète simulée | **21 %** | — |

La ville était pourtant **connexe à 100 %** (33 198 des 33 199 cases praticables atteignables
depuis le quai, détour médian 1,28×). Ce n'étaient pas les escaliers qui tuaient les trajets,
c'étaient les 27 haies, les bâtiments et l'étang. Et le symptôme MENTAIT : à l'abandon, le
résident jouait son activité **sur place**, sept à vingt-six secondes. Un résident bloqué
contre une haie n'avait pas l'air bloqué, il avait l'air de contempler une haie.

Tout est dans l'en-tête de `fermeEngine.js`, chapitre « la navigation de Valley Town ».
Ce qu'il faut retenir ici :

- **`E.townNav(tw)`** — grille de praticabilité + **composantes connexes**, en cache, calculée
  une fois. ⚠️ Elle ignore la coupe de bois volontairement : couper ne peut qu'OUVRIR une case
  (un arbre bloque toujours, une souche jamais), donc la grille est **pessimiste, jamais
  optimiste**. C'est ce qui l'autorise à être statique.
- **`E.townFindPath(...)`** — A* octile, puis **réduction en points de passage** (médiane 7,
  maximum 22). ⚠️ **Le coût réseau n'a pas bougé d'un message** : `residentPaths` accepte une
  liste de points depuis le 364, et seul le nombre de `send()` est facturé.
- **`E.townSameArea(...)`** — le garde-fou : on ne lance jamais un A* vers une autre poche,
  c'est le seul cas où une recherche coûte cher.
- **`townStairRoute` et `townStairEnds` ont été SUPPRIMÉES.** Le dénivelé est une contrainte
  d'arête ; l'escalier est emprunté parce que c'est le seul endroit où l'on peut monter.

⚠️ **Cinq défauts ont été trouvés par le banc et par lui seul**, aucun n'ayant jamais levé
d'erreur : heuristique de Manhattan **inconsistante** (nœuds rouverts sans fin, plafond
d'expansions atteint, `null` rendu comme s'il n'y avait pas de chemin) · tas typé qui
**débordait en silence** (un A* sans décrémentation de clé repousse les nœuds améliorés) ·
altitude de référence **décalée d'un échantillon** dans le test de segment (un chemin qui
franchissait un escalier en biais) · réduction qui pouvait **cesser d'avancer** (dépassement
de mémoire) · position **dont on ne peut plus repartir** au bas d'un escalier.

⚠️ **Il y a DEUX tests de collision en ville, et c'est délibéré.** `townCanStand` (FermeGame)
est celui d'**exécution** : il lit `shared.townChop`. `E.townBoxFree` est celui de
**navigation** : il ignore la coupe. La BOÎTE (0,6 × 0,35) est la même des deux côtés, et
c'est le seul nombre qu'il faudrait changer aux deux endroits.

---

## 3. Les endroits où l'on vit

**`E.townSpots(tw)` — 167 points pour 127 destinations distinctes, tous DÉRIVÉS de la carte**, jamais d'une table écrite à
côté (une table aurait tenu jusqu'au premier banc déplacé). Le mobilier vient de `tw.props`,
les lieux de leurs constantes.

⚠️⚠️ **AU 427 ILS ÉTAIENT 61, ET LA RÉPARTITION ÉTAIT FAUSSE** : **33 des 48 blocs ouverts de
la ville n'avaient aucun endroit de vie**, et **16 des 61 endroits étaient des tombes** — un
quart de la vie sociale se passait au cimetière. Ce n'était l'intention de personne : c'est la
conséquence du fait que le cimetière est le seul décor dont le générateur pose seize
exemplaires. **Un défaut de la SOMME ne se voit dans aucune ligne de code.**

Ajoutés au 428, tous dérivés : la **promenade du lac** (on cherche la première case sèche
au-dessus de l'eau, colonne par colonne — la rive est irrégulière), le **verger**, l'**étang
du parc**, le **quartier des artisans**, le **champ de foire** hors des étals, les **parterres**
de la place, et les **carrefours** d'avenues.

⚠️ **LES CARREFOURS, PAS UN POINT TOUS LES N PAS.** Premier jet : un endroit tous les 26 pas
le long de chaque avenue → **58 endroits de rue sur 148, soit 39 %**. On venait de remplacer le
cimetière par le trottoir. Le contrôle « aucune activité n'écrase les autres » avait été écrit
avant, exprès.

⚠️⚠️ **ZIP 429 — UN BANC REND JUSQU'À TROIS ENDROITS, UN PAR PLACE** (demande de Guillaume :
« on doit pouvoir s'asseoir à deux, ou trois sur le même banc »). Une place est un **décalage**
(`TOWN_SEAT_SPACING`, 11 px sur les 52 du sprite), pas une case : découper trois cases par banc
aurait obligé le générateur à réserver trois fois plus de place, donc à refuser des bancs là où
il en pose. Chaque place a SON point d'attente — deux places qui partageraient leur case
feraient se pousser deux résidents indéfiniment.
⚠️ **Le tirage d'une destination écarte désormais ce qu'un autre résident a déjà choisi.**
Sans ça, deux résidents visaient la même case, s'y poussaient (chacun glisse sur l'autre,
aucun n'avance) et le garde anti-blocage les figeait. C'était déjà possible au 427 ; les trois
places par banc le rendaient probable.

⚠️ **LES TROIS BANCS DU LAC ÉTAIENT MORTS.** Le point d'assise était pris **au sud** du banc,
sans alternative ; au bord de l'eau, le sud est le lac. `add` refusait en silence, et personne
ne s'est jamais assis au bord du lac de Valley Town. On essaie désormais les quatre côtés (le
sud d'abord, c'est l'orientation du sprite). **20 bancs, 20 assises.**

**Les vingt blocs restants sont de la prairie nue**, et on ne leur invente pas d'endroits :
ce serait des résidents qui vont contempler un champ vide.

---

## 4. S'asseoir (428)

⚠️⚠️ **CE QUE FAISAIT LE 427 N'ÉTAIT PAS UNE POSE, C'ÉTAIT UNE COUPE** : les 17 pixels du haut
de la feuille, quatre pixels plus bas. Un buste tronqué à mi-cuisse. Ça se défendait (« vu de
dessus, les jambes sont cachées par l'assise ») et c'est faux : à cette inclinaison on voit le
devant du personnage, donc ses genoux.

`A.drawSeated` (dans **`fermeArt.js`**, pas dans la boucle de rendu) découpe **trois tranches
dans la feuille du personnage lui-même** : buste, cuisses écrasées en raccourci, mollets
rétrécis. ⚠️ **Rien n'est repeint** — la pose hérite donc gratuitement de la tenue, de la
teinte de la garde-robe (qui est CUITE dans la feuille), de la salopette et de la combinaison
d'apiculteur. Repeindre avec une couleur de `OUTFITS` aurait marché jusqu'au premier pantalon
acheté chez Carla.

⚠️ **ELLE A DÉMÉNAGÉ DANS `fermeArt.js` EXPRÈS.** Dans la closure de `drawCharacter`, elle
n'était regardable que dans le jeu — d'où trois zips avec un buste tronqué. **`tools/render-assise.mjs`**
appelle désormais la MÊME fonction : ce qu'il montre est ce que le joueur verra.

⚠️ Les décalages sont **dérivés de la géométrie du banc** (dossier / assise / sol du sprite),
pas choisis. Premier jet à `py − 4` : la tête arrivait au niveau de l'assise et les pieds dix
pixels sous le banc — le personnage était assis **par terre devant**.

**Le joueur s'assoit** : `E` sur un banc, **n'importe quelle touche de direction** pour se
lever (ou `E` à nouveau, qui est la touche avec laquelle on vient de s'asseoir).
⚠️ **`posKeyOf` porte l'assise**, sans quoi aucun paquet ne serait parti — s'asseoir ne change
ni la vitesse ni l'immobilité, et il n'y a pas de keep-alive à l'arrêt : **à deux, personne
n'aurait jamais vu personne s'asseoir.** C'est le bogue des diagonales du 365, mot pour mot.

---

## 5. Le dézoom des grands bâtiments (428)

Demande de Guillaume : « les grands bâtiments ne sont pas visibles en entier, s'approcher doit
entraîner un zoom out, sans perturber le gameplay ».

Le sprite du tribunal fait 192×176, soit **onze cases de haut** ; le joueur est au centre de
l'écran et se tient au pied du bâtiment, donc il n'en voit que `hauteur_fenêtre / 2 / 48`
cases — **9,4 sur une fenêtre de 900 px, 7,5 sur 720**. Fronton et beffroi hors champ,
systématiquement.

`TOWN_ZOOM_NEAR = 2` (contre `ZOOM = 3`), fondu de 520 ms, déclenché à `TOWN_ZOOM_MARGIN = 7`
cases des monuments **et des points de vue** (belvédère, ponton, place, kiosque).

⚠️ **« Sans perturber le gameplay » a une traduction précise : AUCUN rayon d'interaction n'est
en pixels.** `nearCivicDoor`, `nearTownProp`, `nearTownRect`, la portée de la hache, le saut de
rebord — tout est en cases. Le seul calcul en pixels qui dépend du zoom est **l'AOI réseau**,
et il DOIT suivre : dézoomer sans l'élargir aurait rendu visible un anneau où les autres
joueurs disparaissent.

⚠️ **L'échelle au repos est un ENTIER, toujours** — un zoom fractionnaire fait grouiller la
trame du pixel art. On accroche donc la valeur dès qu'elle est assez proche : un lissage
exponentiel n'atteint jamais tout à fait sa cible et resterait à 2,004 pour toujours.

⚠️ **`targetTileTown` RECOPIE le calcul de caméra** (`getCamTown` vit dans la closure de la
boucle). Tant que l'échelle était constante, les deux copies ne pouvaient pas diverger.
Maintenant elles le peuvent, et le symptôme serait le pire : **la hache tomberait sur une autre
case que celle que le liseré blanc désigne**. Les deux lisent la même source d'échelle.

---

## 6. La vie des résidents

`MAX_RESIDENTS = 20`, et la seule question qui comptait était « combien de `send()` en plus ? ».
**Zéro** : tout ce qui bouge chez un résident passe par UN message groupé par image depuis le
364, et la taille n'est pas facturée.

⚠️⚠️ **UN RÉSIDENT A UNE ZONE, PAS DEUX POSITIONS.** `res.zone` vaut `"farm"` ou `"town"` et
`res.x/res.y` sont ses coordonnées DANS CETTE ZONE. C'est la seule forme qui résiste au piège
des deux cartes (`CLAUDE.md` §4) : avec deux couples de coordonnées, il existe forcément un
chemin de code qui lit le mauvais. La zone voyage dans les messages qui partent déjà.

**Ce que fait un résident en ville** : il descend du train (6 au plus en même temps, séjour de
3 à 10 min, **il ne travaille pas pendant ce temps** — c'est le prix du voyage), il choisit un
endroit, il y va, il y fait quelque chose, il en change. Le goût vient du **métier**
(`TOWN_SKILL_TASTE`), pas d'une ligne de code par personnage.

**L'architecture sociale** tient en une phrase : deux résidents qui se croisent se parlent, et
le TON vient de `RESIDENT_AFFINITIES` — la table qui existait depuis longtemps et que personne
ne voyait jamais. Le **tableau des nouvelles** de la place la rend lisible. ⚠️ L'hôte apparie,
et lui seul.

⚠️ **UNE RÈGLE SOCIALE SANS DÉLAI DE GRÂCE S'ÉTRANGLE AU POINT D'ARRIVÉE.** Cinq résidents
descendent le même quai à la même seconde : tous à portée, tous appariés d'un coup, tous figés
à se saluer en boucle. Personne ne quittait la gare. **Un débarquement n'est pas une
rencontre** (`TOWN_MEET_ARRIVE_GRACE_MS`).

**La famille** (`RESIDENT_FAMILY`) : un invité accompagne parfois un résident. ⚠️ **IL N'EST
PAS UNE ENTITÉ** — sa position est DÉRIVÉE de celle du résident (`trailFollow`). Zéro message,
aucune collision propre, impossible de traverser un mur.

**La Maison Garfield** : Carla est **recrutable** (`skill: "stylist"`, `SKILL_BUILDING` à
`null` — son lieu de travail est en ville), et sa boutique n'ouvre que si elle habite la vallée
— sinon la porte le DIT. ⚠️ **TOUTE LA TENUE TIENT DANS UNE CHAÎNE** de cinq caractères
(`wardrobeLook`), qui sert à la fois de champ dans le paquet de position déjà émis et de clé de
cache de feuille de sprite.

**Couper du bois en ville** : coupe **partagée ET sauvegardée** (`shared.townChop` dans le JSON
de `ferme_saves` — **aucune migration SQL**), **ça repousse**, seule la **hache** est
réactivée. Une entrée vaut `{hp}` ou `{r}` : le dictionnaire ne garde que les EXCEPTIONS.

---

## 7. Le tribunal, dedans

**Trois niveaux, 17 pièces, une seule grille.** ⚠️⚠️ **LES ÉTAGES SONT EMPILÉS DANS LA MÊME
CARTE et le niveau se DÉDUIT de `y`** (`E.courtFloorOf`) : aucun champ à diffuser, aucun état à
réconcilier. Même raisonnement que l'altitude de la ville.

RDC : hall, salle d'audience, témoins, greffe, vestiaire, accueil, panneau d'affichage ·
Étage : juge, jury, bibliothèque, cadastre, permis, notaire, état civil · Sous-sol : archives,
scellés, 3 cellules, objets trouvés, chaufferie.

**Le plan est DÉDUIT DES USAGES à venir**, pas l'inverse. **Rien n'est opérationnel, et le jeu
le DIT** (plaque par porte, « bientôt » sur E, panneau récapitulatif). Un bâtiment muet passe
pour cassé.

⚠️ **UNE CAGE D'ESCALIER EST UN LIEU, PAS UN TRAJET** : `COURT_STAIRWELLS` relie deux niveaux
au même endroit, le sens se déduit des `alt`. Deux descriptions d'une même cage ne peuvent pas
rester d'accord.

---

## 8. Les bancs qui protègent tout ça

- **`tools/verify-vallee.mjs` — 122 contrôles.** Il importe le VRAI moteur. Depuis le 428 il
  **REJOUE LE DÉPLACEMENT** image par image (vrai suiveur, vraie boîte, vraie règle de
  dénivelé) sur **chaque endroit vers chaque autre** — ~16 000 trajets — au lieu de vérifier
  une table intermédiaire. ⚠️ **Le seuil est à 100 %, délibérément** : à 24 % comme à 99 %, un
  seuil plus bas dirait OK.
  Il contrôle aussi la couverture des **quartiers bâtis** (la prairie non aménagée est comptée
  à part, pas ignorée), la **répartition des activités**, et que **tout banc est assiable**.
- **`tools/render-assise.mjs`** (428) — la pose assise **sur son banc**, debout/assis côte à
  côte, sur les huit tenues qui existent.
- **`tools/render-tribunal.mjs`** — le mobilier, les décors de rue, les bâtiments de la
  Haute-Ville et la garde-robe portée.

⚠️⚠️ **`tools/lib-canvas.mjs` N'IMPLÉMENTAIT `drawImage` QU'À TROIS ARGUMENTS** et ignorait
silencieusement les autres. Tout dessin qui découpe une tranche dans une feuille de sprite —
c'est-à-dire **toute pose de personnage** — y était rendu en dessinant la feuille ENTIÈRE. Pas
d'erreur, une image plausible, un verdict faux. Corrigé au 428 (3, 5 et 9 arguments, plus
proche voisin). C'était le stub menteur du `CLAUDE.md` §10 **dans l'outil censé nous protéger**.


---

## 9. Le ciel, la course et la boussole (429)

### La météo et le jour/nuit y arrivent enfin

⚠️⚠️ **IL FAISAIT UN MIDI DE PRINTEMPS PERPÉTUEL À VALLEY TOWN DEPUIS LE ZIP 234**, et ce
n'était le choix de personne. Le voile nocturne, les halos de lampadaires, le voile d'orage,
la teinte de saison et la neige étaient écrits **dans le corps du rendu de la ferme** ; la
ville a sa propre boucle. C'est le §4 mot pour mot — troisième occurrence après la carte et le
minuteur d'action du 426. **C'est LE piège récurrent de ce projet.**

Le symptôme le plus parlant était déjà dessiné : le générateur pose des dizaines de
lampadaires le long des avenues, de la promenade du lac et du quartier des artisans depuis le
425. **Ils n'ont jamais éclairé quoi que ce soit.** Un décor qui existe POUR une mécanique
absente est plus trompeur qu'un décor manquant.

`drawNightVeil` et `drawWeatherVeil` sont désormais deux fonctions partagées — le même code,
déplacé, pas réécrit : il n'y a toujours qu'UNE nuit et UNE météo dans le jeu.
⚠️ **L'intérieur du tribunal n'en appelle aucune** : il n'a pas de ciel.
⚠️ Le halo prend le **zoom en argument**, pas la constante : depuis le dézoom (428), la ville
ne dessine plus toujours à 3, et des halos figés auraient glissé sur leur réverbère.
⚠️ Les lampadaires de la ville sont des **`props`**, ceux de la ferme des **`objects`** (un
joueur peut poser les seconds) — d'où deux collectes, une seule question.
⚠️ Le ciel est peint **après** le curseur de visée : les deux fonctions remettent la
transformation à l'identité, et appelées avant elles laissaient le liseré de la hache se
dessiner à des coordonnées de monde dans un repère d'écran.

### La course — un mode, pas un véhicule

**Maj** pour courir, ×1,75, dans les trois zones, **0,55 point d'énergie par seconde**
(≈ 10 points pour traverser Valley Town). Pas à cheval : le cheval est déjà le mode rapide.

⚠️ **LE CHOIX EST MOTIVÉ.** Un véhicule (vélo, omnibus) aurait demandé un sprite par
orientation, un état PARTAGÉ « qui l'utilise » à arbitrer par l'hôte, des stationnements à
dériver de la carte et une réconciliation à la déconnexion. La course ne coûte **aucun** de ces
états : elle multiplie une vitesse qui voyage DÉJÀ dans le paquet de position depuis le 365
(`vx`/`vy`). Les autres joueurs voient quelqu'un courir **sans une ligne de réseau en plus**.
⚠️ **Elle coûte de l'énergie, et c'est ce qui en fait un choix** — gratuite, elle serait la
vitesse par défaut, c'est-à-dire un `PLAYER_SPEED` relevé avec une touche à tenir en plus.
⚠️ **L'hôte débite, le client affiche tout de suite.** L'énergie est partagée et sauvegardée
(§3) ; la décrémenter côté client la ferait remonter en clignotant. Le montant est **borné du
côté qui fait autorité**, pas du côté qui demande.
⚠️ **La dépense se fait en points ENTIERS**, la fraction restante vit dans un ref local : un
demi-point par image aurait fini en flottant dans la sauvegarde.

### La boussole GPS — tout local

**On ouvre le plan, on clique où l'on veut aller.** Un triangle ambré orbite autour du joueur
en pointant la destination, avec la distance dessous ; quand elle est à l'écran, il se pose
dessus et respire. Reclic au même endroit pour annuler, effacement automatique à l'arrivée.

⚠️⚠️ **RIEN NE PART SUR LE RÉSEAU, ET C'EST UNE PROPRIÉTÉ À PRÉSERVER.** Une destination est
une INTENTION : elle n'a de sens que pour celui qui l'a posée. La diffuser coûterait des
messages pour un état que personne d'autre ne lit — et surtout, elle deviendrait un état à
RÉCONCILIER.
⚠️ **Elle porte sa zone.** Une destination posée sur le plan de la ville n'a aucun sens sur la
carte de la ferme (§4) ; sans ce filtre, la boussole pointerait un point au hasard du champ de
blé **en ayant l'air de marcher**.
⚠️ **Le marqueur est en pixels d'écran**, donc indépendant du dézoom : un repère d'interface
qui grossit avec la caméra se confond avec le décor. Et il est dessiné **après** le voile
nocturne — une boussole illisible la nuit ne sert qu'au moment où l'on se repère déjà seul.
⚠️ **L'échelle du plan est relue sur le canevas** (`getBoundingClientRect`), jamais recopiée :
les trois plans n'ont ni la même taille ni le même agrandissement, et le CSS étire le canevas.
⚠️ Dans le tribunal, la cible n'apparaît que sur **l'étage où elle a été posée** — le niveau se
déduit de `y`, il n'y a rien à stocker.

---

## 10. La revue graphique (429)

**`tools/render-echelle.mjs`** met chaque décor **à côté d'une fermière**, sur la même ligne de
sol, et compare le rapport de hauteur au repère physique attendu.

⚠️⚠️ **C'EST L'ANGLE MORT DE TOUS LES BANCS DE RENDU PRÉCÉDENTS** : ils dessinaient les meubles
ENTRE EUX. C'est ce qu'il faut pour juger une palette et un ancrage, et ça ne dit **rien** d'une
échelle — un banc deux fois trop grand au milieu de meubles deux fois trop grands a l'air juste.
**Un décor se juge contre le personnage qui s'en sert**, seul repère invariant du jeu (23 px).

Trois écarts mesurés, trois corrections :

| décor | avant | attendu | après |
|---|---|---|---|
| **banc** | ×0,78 mais **22 px de dossier** pour un personnage de 23 | dossier à la hanche | redessiné, 18 px, **52 px de large** |
| **étal** | ×1,30 | ×2,10 (on passe dessous) | 44×54, ×1,91 |
| **fontaine** | ×2,35 | ×1,60 | fût raccourci, ×1,83 |

⚠️ **Le repère du banc était faux, pas le dessin.** Un dossier fait physiquement 0,5 fois un
adulte ; mais vu de trois quarts, la profondeur de l'assise se dépense en pixels VERTICAUX. Un
objet plat tient son ratio, un objet qui a du volume vers l'avant paraît plus haut. Corriger
le banc pour satisfaire le chiffre l'aurait écrasé — **le repère a été corrigé à 0,75**.

⚠️⚠️ **ET LA FONTAINE A RÉVÉLÉ UN DOUBLON DU §8.** Le canevas dessinait la margelle à `H − 16`
et le bouton du jet à `H − 51` ; `drawTownFrame` peignait l'eau à `fBy − 16` et le jet à
`fBy − 60` — les mêmes cotes, recopiées à quatre cents lignes de distance. En rabaissant le
sprite, l'eau serait restée à mi-hauteur de l'air et le jet aurait jailli vingt pixels au-dessus
de sa colonne, **sans la moindre erreur**. Les cotes vivent maintenant dans `FOUNTAIN_GEO`.

### L'église était une mairie

⚠️⚠️ **LITTÉRALEMENT.** Le zip 235 avait dessiné `townhallSprite` — fronton à colonnes,
**horloge** au centre, **drapeau** sur le toit — et le 425 l'a renommé « église » sans toucher
un pixel, parce qu'il venait d'en dessiner une vraie et qu'il fallait recaser l'ancienne. Sa
note le dit noir sur blanc : « le dessin n'a pas bougé d'un pixel ». Valley Town a donc eu
**deux mairies pendant quatre zips**, dont l'une s'appelait église. C'est le « bâtiment muet »
du 426 en plus sournois : ici le bâtiment parle, et il ment.

Redessinée au 429 avec les quatre choses qui font une église, dont **aucune** n'était présente :
un **clocher** décalé (une silhouette asymétrique dominée par une tour ; une façade symétrique
à fronton, c'est un temple civique), une **flèche et une croix** (le seul élément littéral, et
c'est lui qu'on lit de loin), une **rosace** (aucune autre fenêtre ronde dans cette ville) et
des **arcs brisés** — l'arc plein cintre est celui de la mairie et de la gare, l'ogive
n'appartient qu'ici. Fronton, horloge et drapeau **supprimés**, pas déplacés.

### Les haies savent où elles s'arrêtent

Le défaut était **pratique, pas esthétique** : trente cases de rectangles identiques se lisaient
comme un mur vert lisse, et **on ne voyait pas les passages**. Les 27 parcelles ont chacune une
entrée percée dans la haie ; sur un mur uniforme, ce trou d'une case ne se distinguait de rien.
On lisait la haie, on faisait demi-tour, et on longeait. Une haie regarde désormais ses
voisines : une extrémité reçoit un bord ébréché et une ombre latérale, une case de milieu non.
Un passage est encadré par deux bouts visibles.


---

## 11. Le marché du champ de foire (430)

**C'est le chantier qui relie les deux cartes**, et c'est sa seule raison d'être. Jusqu'ici
Valley Town était un beau décor qu'on visite : on y montait par curiosité, on redescendait, et
la ferme continuait sans elle. **Le train n'avait aucune raison ÉCONOMIQUE d'être pris.** Les
dix étals du champ de foire existaient depuis le 426 et ne servaient à rien.

`E` au champ de foire ouvre le marché : on y vend tout ce qui se vend au bac de la ferme, à un
cours qui **change chaque jour**, et **jamais moins cher qu'au bac**.

⚠️⚠️ **LE PRIX N'EST PAS UN ÉTAT PARTAGÉ, ET C'EST LA DÉCISION DE CE CHANTIER.** Un tableau de
cours dans `shared` aurait voulu dire : un champ de plus dans le JSON de `ferme_saves`, une
valeur à faire tourner chaque jour chez l'hôte, un message pour la diffuser, une
réconciliation quand un invité arrive à mi-journée, et une sauvegarde d'avant ce zip à
rattraper. Pour quelque chose qui est une **pure fonction du jour**. Le cours est donc HACHÉ à
partir du numéro de jour et de la famille de produit (`E.marketRate`) — l'astuce des répliques
d'ambiance du 427 appliquée à l'économie. **Zéro `send()`, zéro migration SQL, zéro champ à
réconcilier.**
⚠️ Corollaire à ne jamais oublier : le cours ne doit dépendre QUE du jour et de la famille. Le
jour où il dépendra du stock d'un joueur, de son or ou de sa saison locale, **les deux écrans
afficheront des prix différents et chacun aura l'air cohérent avec lui-même.**

⚠️ **ON COTE CINQ FAMILLES, PAS TRENTE ARTICLES.** Un cours par culture donnerait neuf courbes
sur un tableau de dix lignes : le joueur ne lirait plus rien et « le marché » deviendrait une
loterie. Cinq familles, c'est ce qu'on tient en tête en montant dans le train — donc ce qu'on
peut ANTICIPER, et anticiper est tout l'intérêt d'un cours qui varie. Les cinq cotes sont
affichées **en tête du panneau, même quand on ne porte rien** : un cours qu'on ne découvre
qu'en ayant déjà la marchandise en poche ne peut pas être anticipé.

⚠️ **LE PANNEAU MONTRE L'ÉCART, PAS LE PRIX.** « Blé : 26 or » n'apprend rien — personne ne
connaît par cœur le prix du bac. C'est le « +N » qui transforme une liste en DÉCISION.

⚠️⚠️ **`resolveTownSell` N'EST PAS `resolveSell` AVEC UN MULTIPLICATEUR**, et la raison est le
piège des deux cartes. `resolveSell` commence par `nearT(f, C.BIN)`, qui lit `f.x/f.y` — les
coordonnées **de ferme**. Pendant qu'on est en ville, elles ne veulent rien dire : la vente
serait acceptée ou refusée selon l'endroit où l'on a laissé son personnage au champ. La portée
est donc vérifiée sur `px/py`, que `sendReq` remplit avec la position courante.
⚠️ **Le prix est recalculé chez l'hôte.** Le client affiche une cote, il ne l'envoie pas : l'or
est partagé (§3), donc c'est l'hôte qui cote comme c'est lui qui débite.

**Huit contrôles** dans `verify-vallee`, dont celui qui compte : le cours est **déterministe**.
Si deux clients ne trouvaient pas le même chiffre, chacun aurait un écran parfaitement cohérent
avec lui-même et les deux joueurs se disputeraient sur le prix du blé sans qu'aucune erreur ne
soit levée — le défaut le plus cher possible pour un jeu à deux, et le moins visible.

---

## 12. Carla Garfield, plus libre que les autres (430)

**Son statut était à jour dans le code — et FAUX dans le commentaire qui le décrit.** Le bloc
d'en-tête de `fermeConstants.js` expliquait encore, en trois paragraphes, qu'elle portait
`noStay` (« elle ne demandera JAMAIS à emménager ») et `chatOnly`, alors que le 427 avait
retiré les deux et que sa fiche, quarante lignes plus bas, disait l'inverse. **Trois zips.**
Réécrit, et **vérifié par le banc** désormais : la seule chose qui ne ment pas sur un statut,
c'est un contrôle qui le lit.

Deux libertés ajoutées, toutes deux portées par un **drapeau de roster** et non par un
`rid === CARLA_RID` dispersé :

- **`noKick`** — on ne la vire pas. Le vote d'exclusion (259) envoie un résident dans la file
  des exilés, d'où il revient *supplier* : ça n'a aucun sens pour quelqu'un qui a sa propre
  boutique en ville et n'a jamais eu besoin de la ferme. **Partir serait SA décision.**
  ⚠️ Le bouton DISPARAÎT de sa fiche et dit pourquoi — l'hôte refuse déjà, mais un bouton qui
  se laisse cliquer pour répondre « non » est le « le jeu propose puis refuse » du 426.
- **`weeklyShift`** — elle tient boutique **un jour par semaine** (`CARLA_WORK_DAY`), pas tous
  les jours. Les autres jours : aucun tour de travail, et la Maison Garfield est **fermée**.
  ⚠️ Le jour est **dérivé du numéro de jour** (`E.isShopDay`), comme le cours du marché : aucun
  état, et les deux joueurs d'un salon lisent forcément le même jour.
  ⚠️ Il est **décalé du jour de marché** : les deux ensemble, la semaine n'aurait qu'un seul
  jour où il se passe quelque chose.
  ⚠️ **Son jour de service, elle descend en ville d'office** — devant les autres et devant le
  plafond de visiteurs — et elle vise sa vitrine. Sans ça, la boutique serait « ouverte » avec
  personne dedans. Un devoir n'est pas une préférence : le goût du métier
  (`TOWN_SKILL_TASTE`) ne fait que pondérer, une styliste de service pouvait passer sa journée
  au cimetière.
  ⚠️ **La porte fermée annonce le nombre de jours** avant l'ouverture. Une boutique fermée sans
  explication est le « bâtiment muet » du 426 ; une boutique fermée qui annonce son jour est un
  **rendez-vous** — c'est-à-dire la seule façon qu'une ouverture hebdomadaire devienne du jeu
  plutôt qu'une gêne.

---

## 13. Jouer sans clavier (430)

⚠️⚠️ **AVANT CE ZIP, LA FERME ÉTAIT LITTÉRALEMENT INJOUABLE AU DOIGT.** Vérifié : **aucun**
écouteur `touch*`/`pointer*` dans tout le rendu de la ferme ; le canevas n'écoutait que
`mousemove` et `mousedown`. Un tap suffisait à UTILISER un outil (iOS synthétise le clic), mais
rien ne permettait de **se déplacer**, ni d'appuyer sur `E`. Et le 429 avait aggravé le cas en
ajoutant `Maj`. Un des trois joueurs les plus actifs devait brancher un clavier Bluetooth pour
entrer dans le seul monde partagé du projet.

⚠️⚠️ **LE PAVÉ ÉCRIT LES QUATRE MÊMES BOOLÉENS QUE LES FLÈCHES**, et c'est LA décision. Le jeu
a **trois** boucles de déplacement qui lisent `keysRef.current["ArrowUp"]` & co. Un second canal
(`touchMoveRef = {dx, dy}`) aurait voulu dire modifier les trois — puis penser à la quatrième le
jour où une zone s'ajoute. C'est exactement le motif qui a produit la carte noire (426), le
minuteur d'action (426) et le ciel absent (429). En écrivant dans `keysRef`, **aucune ligne à
changer dans les boucles**, et le doigt ne *peut pas* se comporter autrement que le clavier :
c'est la même variable. Idem pour la course, qui écrit dans `ShiftLeft`.

⚠️ **L'AFFICHAGE SUIT LA DERNIÈRE ENTRÉE UTILISÉE, il ne se règle pas.** Une touche du doigt
allume les commandes, une touche du clavier les éteint. Ce joueur-là branche son clavier une
fois sur deux : un réglage l'obligerait à le changer deux fois par soirée, et un
`maxTouchPoints > 0` collerait des boutons sur tous les écrans tactiles même clavier branché.
**Testé dans les deux sens.**

⚠️ **LE PAVÉ EST FLOTTANT** : son centre se pose là où le pouce se pose. Sur un iPad tenu à
deux mains on ne regarde pas ses pouces ; avec un centre fixe on rate le rond une fois sur
trois, on croit que le jeu ne répond pas, et **on rebranche le clavier**.
⚠️ Il **capture le pointeur** — sans quoi un pouce qui glisse hors de la zone rend les
`pointermove` à l'élément du dessous, et le personnage part en ligne droite sans s'arrêter.
⚠️ **`touch-action: none` est la ligne indispensable** : sans elle Safari lit le glissement
comme un défilement de page, avale les `pointermove`, et le personnage se fige en pleine
marche sans qu'aucune erreur ne soit levée.

⚠️ **LE BOUTON D'ACTION PORTE LE LIBELLÉ DE L'INVITE**, et il n'a rien à calculer pour ça :
`promptKey` est déjà mis à jour à chaque image dans les trois zones depuis le 426. C'est ce qui
rend ce chantier petit — et sans libellé, un rond « A » dans un coin obligerait à deviner, ce
qui est injouable sur une carte de 224×168 avec dix-sept portes.
⚠️ **Il appelle exactement les mêmes fonctions que les touches**, il n'en réimplémente aucune :
un troisième chemin d'entrée qui déciderait tout seul finirait par proposer une chose et en
faire une autre — cette fois sur l'appareil de quelqu'un qui n'a pas de clavier pour s'en
sortir.
⚠️ **La course est une BASCULE au doigt et un maintien au clavier** : tenir un bouton virtuel
du pouce en dirigeant de l'autre est le geste le plus pénible d'un jeu tactile.
