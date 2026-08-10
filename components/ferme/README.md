# Valley Town, le tribunal, et la vie qui s'y passe — état au 433

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

## 0 bis. ZIP 433 — LE TAXI ROULAIT DE TRAVERS, LA MAIRIE PENCHAIT, ET LA PLACE A DES PIGEONS

Trois demandes de Guillaume dans la même passe, et les deux premières sont la
**même famille de défaut** : quelque chose de régulier, posé de travers par
rapport à ce à quoi il se rapporte. C'est la leçon du 431 (la rangée d'étals, la
colonnade du tribunal), payée deux fois de plus.

### a. « Le taxi a une trajectoire stupide, il prend des virages plus que nécessaire »

⚠️⚠️ **LA CAUSE ÉTAIT DANS `townRoadCenter`, C'EST-À-DIRE DANS LE CORRECTIF DU
432.** Pour rouler au milieu de la chaussée, on sonde perpendiculairement au sens
de marche jusqu'aux deux bords du pavé et on repose le point au milieu. Mais une
sonde perpendiculaire **ne sait pas distinguer la chaussée de la bouche d'une rue
transversale** : à chaque amorce de rue latérale, elle comptait les deux cases de
l'avenue PLUS les trois du départ de la petite rue, concluait « cinq cases de
large ici » et posait le point un cran et demi plus haut. **Le taxi montait donc
dans la bouche de CHAQUE rue latérale avant de redescendre.**

⚠️ **LA PARADE EST DANS LA DÉFINITION, PAS DANS UN SEUIL : la chaussée est la
largeur qui PERSISTE le long de la marche.** On sonde sur un gabarit de ±3 cases
dans le sens du déplacement et on retient la largeur minimale — une amorce de
deux cases disparaît du minimum, une esplanade le traverse intacte. Aucun cas
particulier pour les carrefours, et c'est justement aux carrefours qu'on veut que
la voiture GARDE SA LIGNE.

⚠️ **DEUX AUTRES DÉFAUTS SONT TOMBÉS DANS LA MÊME PASSE, ET AUCUN NE SE VOYAIT :**
- **`townRoadSimplify` ne s'était JAMAIS déclenchée.** Elle éprouvait la corde à
  ± 0,5 case de son axe — or une rue est pavée DEUX cases (`paveRow`) et la
  voiture roule sur la mitoyenne : à un demi-pas de l'axe on tombe pile sur
  l'herbe. Elle exigeait en plus un dégagement ≥ 2, alors que **4 106 des 5 271
  cases roulables de la ville ont un dégagement de 1**. Sur 78 % du réseau, aucune
  corde ne pouvait passer : le chemin restait BRUT, case par case (80 points de
  passage pour 92 tuiles de la gare à la place, contre 10 aujourd'hui).
- **Le taxi déposait AU MILIEU DE LA PLACE.** Son dallage est roulable ; l'arrêt
  « place » tombait donc entre deux parterres, contre l'obélisque, et la voiture
  traversait le square en diagonale pour s'y garer. `townRoadNear` accepte
  désormais un drapeau `streetOnly` (vraie rue `G_PATH`, pas esplanade), et les
  arrêts le demandent en premier. **Un taxi se range au trottoir**, ce que la note
  du 432 disait déjà pour les poches isolées.

Mesuré par `verify-taxi.mjs` (chiffres obtenus en le lançant contre les deux
moteurs) : **598 dents de scie → 0**, **969° → 214°** de rotation cumulée par
course, détour **×1,11 → ×1,03**, durée moyenne **13,9 s → 12,0 s**.

⚠️ **ET LES DEUX TROIS-QUARTS DU VÉHICULE ÉTAIENT FAUX.** Ils annonçaient
`ground = 23` sur un dessin qui s'arrêtait cinq pixels plus haut — **à chaque
virage, le taxi décollait de son ombre** — et la vue « nord-est » montrait une
voiture roulant vers le **nord-ouest** (nez en haut à gauche). Redessinés, et
`render-taxi.mjs` mesure maintenant des PIXELS et non des nombres déclarés.

### b. « Le town hall n'est pas assez travaillé »

Quatre défauts, dont trois décalages :
1. ⚠️⚠️ **le perron ne menait nulle part** — trois marches centrées au milieu du
   corps de logis, alors que la porte est sous le BEFFROI. On montait un escalier
   posé devant un mur plein ;
2. **la rangée de fenêtres penchait de sept pixels** (10 px du chaînage gauche,
   24 du droit) ;
3. le faîte du toit était à côté de l'axe du mur ;
4. ⚠️ **la brique n'était pas de la brique, c'était du rondin** : une ligne sombre
   pleine largeur tous les 4 px et pas UN joint vertical. Ce qui fait la brique
   n'est pas la ligne d'assise, c'est **l'alternance des joints verticaux d'une
   assise à l'autre**.

⚠️ **La parade est celle du 431 : plus une seule position réglée à la main.** Deux
axes (`AX_TOWER`, `AX_BODY`) et tout s'en déduit. Le reste est de l'ajout franc,
réclamé par « pas assez travaillé » : chambre des cloches à abat-sons (un beffroi
sans baie n'est qu'une tour), corniche à denticules, appuis et clés de voûte,
chaînages d'angle en besace, soubassement à refends, ardoises en rangs, cheminée
qui DESCEND JUSQU'À LA PENTE, drapeau, lanternes, et l'ombre du beffroi portée
SUR le corps de logis.

### c. Les pigeons et les colombes — **voir le §16**

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

---

## 14. Le marché, la vente, et la foire (431)

**Ce qui a changé, en une phrase : on ne vend plus depuis la ferme.** Les neuf guichets qui
achetaient (le bac, les gemmes, la farine, le sucre, les prises de Soan, les productions de
Harald, les vergers, les artisans, la bijouterie) ne font plus que **montrer**. On consulte, on
transforme, on prend le train. Les **visiteurs** restent la seule exception : leur acheter à
l'unité pour répondre à leur demande n'est pas écouler une récolte.

⚠️⚠️ **RETIRER LES BOUTONS NE SUFFIT PAS, ET LE VERROU EST À L'ENTRÉE.** Un onglet resté ouvert
sur la version d'avant enverrait toujours ses vieilles requêtes, et l'or est partagé (règle du
385 : un garde-fou côté client ne protège pas un état qui compte). `E.isProduceSale(req)` est
testé en tête de `hostHandleReqUnsafe`, **avant les trois sous-traitants** — les ventes de
bijoux et de produits d'artisans vivent là-bas, un verrou posé après eux ne les verrait jamais.

⚠️⚠️ **ET LE PIÈGE DES DEUX CARTES A FRAPPÉ ICI, EN PIRE.** Le champ de foire occupe
x∈[34;68], y∈[70;104] en coordonnées de VILLE ; la ferme fait 180×140, donc ces coordonnées
existent aussi au milieu de ses champs. Tant que `atMarket` ne lisait que `px/py`, **un fermier
planté au bon endroit de son pré vendait « au marché » sans avoir jamais pris le train** — et
depuis ce zip ce contrôle est la seule chose qui interdit de vendre à la ferme. `sendReq`
transporte donc `pz` (la zone), et `atMarket` **teste la zone AVANT les distances**, comme
`anyRemoteNearZoned`. ⚠️ Il **échoue fermé** : pas de zone = pas de vente. Tolérer l'absence du
champ rouvrirait le trou pour quiconque l'omet.

**Le guichet unique.** `E.resolveTownSell` **délègue** à chaque résolveur d'origine (eux seuls
savent où vit le stock et ce que vaut la pièce) et n'ajoute que deux choses : la **portée** et
la **cote**. ⚠️⚠️ **ATTENTION AU DOUBLE CRÉDIT** : trois résolveurs (vergers, produits aux
fruits, bijouterie) créditent `shared.money` eux-mêmes, les autres renvoient un `moneyDelta`
que l'hôte applique. Le drapeau `paid` porte cette distinction ; s'y tromper paierait la vente
**deux fois, sans lever la moindre erreur**. Six contrôles du banc jouent des ventes réelles et
comptent les pièces, dont celui-là.

⚠️ **LA BIJOUTERIE N'A DÉLIBÉRÉMENT PAS DE COTE.** Son prix est fixé par le joueur qui a
dessiné la pièce : lui appliquer un multiplicateur reviendrait à multiplier un nombre choisi
par un humain.

⚠️⚠️ **LE PANIER PART EN UNE SEULE REQUÊTE, ET C'EST UNE CONTRAINTE RÉSEAU.** Le panneau peut
tenir quarante lignes ; les vendre une par une ferait quarante `send()` contre un plafond dur
de **dix par seconde**, dépassé **silencieusement** (§3 de `CLAUDE.md`). La moitié du panier
partirait dans le vide et rien ne le dirait. `resolveTownSell` accepte donc `m.lines`, vérifie
la portée **une fois** en tête, et ne remonte un refus que si RIEN n'a été vendu — un panier
servi à moitié est un succès partiel, pas une erreur.

⚠️ **LA BARQUETTE DE VERGER EST UNE LIGNE, PAS UNE QUANTITÉ.** Six fruits vendus par six ne
font pas une barquette : elle rapporte +25 %, c'est tout son objet depuis le 398. Son « stock »
affiché est le nombre de barquettes complètes qu'on peut composer.

### La foire, redessinée

**Six métiers, pas quatre couleurs.** Les dix étals du 426 étaient corrects et l'ensemble
restait un parking à barnums : ils vendaient la même chose. `C.TOWN_STALL_TRADES` (primeur,
poissonnier, boulanger, fleuriste, fromager, potier) vit dans `fermeConstants` et **nulle part
ailleurs** — le générateur distribue les indices, `fermeArt` peint, `FermeGame` choisit le
sprite ; le 426 avait un `% 4` recopié dans les trois, et passer à six en aurait laissé deux
sans dessin **sur des cases pourtant solides** (un mur invisible, créé par une constante
recopiée). Deux voisins ne font jamais le même métier, ni dans la rangée ni en face.

⚠️ **TROIS ÉTAGES DE LECTURE, À TROIS DISTANCES** : la bâche (de l'autre bout de la place), la
marchandise PENDUE sous la barre (à trois cases), l'étalage (quand on s'arrête). C'est le seul
découpage qui rende un détail utile.

⚠️⚠️ **UNE COULEUR NE SE JUGE PAS SEULE, ELLE SE JUGE CONTRE SON FOND.** Les meules du fromager
étaient jaune clair sur une bâche jaune : illisibles, quel que soit leur dessin. Une croûte
brune les sépare du fond ET leur donne leur silhouette. Même famille que le §10 du 429 (un
décor se juge contre le personnage) — et vu **au banc**, pas à la lecture.

**L'arche compte pour deux props, et c'est la seule forme qui marche.** Une arche dont
l'emprise entière bloque est un mur avec un trou dessiné dedans ; une arche qui ne bloque rien
est un décor traversable, que le banc refuse. Ce sont donc les **deux poteaux** qui sont
solides, chacun un prop expliqué, chacun dessinant **sa moitié du même sprite** (découpe par
`drawImage` à neuf arguments — deux demi-arches réglées à la main finiraient décalées).
⚠️ **Le nom s'écrit VIVANT au rendu**, jamais cuit dans le sprite (`fillText` fait planter les
bancs hors navigateur, et un texte cuit ne peut pas être bilingue).
⚠️ **Et il s'écrit pendant la SECONDE moitié** : les deux moitiés sont mises en file dans
l'ordre du générateur, un texte écrit pendant la première se fait recouvrir par l'image de la
seconde. Vu en jeu — l'enseigne affichait « MAR ».

**Les guirlandes ne sont pas des props.** Une guirlande n'est pas POSÉE quelque part, elle
RELIE deux choses : elle se déduit des étals, donc bouger un étal déplace sa corde.
⚠️ Sa hauteur a été fausse **deux fois**, et les deux n'ont été vues qu'au banc : à 38 px elle
passait devant la marchandise pendue, à 49 px elle hachait les bâches. **Aucune hauteur
intermédiaire ne marche** — un étal fait 52 px pour 64 px de pas, une corde tendue de centre à
centre passe forcément sur quelque chose. On la monte franchement au-dessus, avec ses mâts.

### Centrer, et pourquoi c'est un piège

⚠️⚠️ **UNE POSITION QUI DEVRAIT ÊTRE DÉDUITE D'UN CENTRE NE SE RÈGLE PAS À LA MAIN**, et
Guillaume l'a vu en jeu avant tous les bancs (« ça déborde un peu sur la gauche »). La rangée
d'étals commençait à une marge fixe (`mk.x + 3`) : cinq étals espacés de quatre cases occupent
seize cases de centres, l'axe tombait **1,5 case à l'ouest** de celui du dallage, et le premier
étal mordait sur la pierre.

⚠️ **ET IL FALLAIT UN NOMBRE IMPAIR DE COLONNES.** Un décor est dessiné centré sur SA CASE,
donc son axe tombe toujours à `x + 0,5`. Un dallage de 22 colonnes a son axe sur un **joint** :
rien ne peut s'y aligner, il reste fatalement huit pixels d'écart d'un côté. À 21 colonnes,
l'axe du dallage EST une colonne — tout ce qui s'y aligne tombe juste au pixel. Marges
mesurées : **14 px à gauche, 14 px à droite.**

⚠️⚠️ **MÊME DÉFAUT DANS LE TRIBUNAL, ET IL DURAIT DEPUIS LE 425.** La colonnade partait de
x = 18 au lieu de 12 : huit fûts parfaitement réguliers, **six pixels à droite du fronton qui
les couronne**, alors que tout le reste du bâtiment est bâti sur `W/2`. Un défaut de symétrie
**ne se voit pas en regardant l'élément fautif** — la rangée est impeccable, c'est son rapport
à l'axe qui est faux. D'où le contrôle de symétrie de `tools/render-tribunal.mjs`, qui replie
l'image sur son axe et compte les pixels. ⚠️ Il ne mesure QUE les façades censées être
symétriques : l'hôtel de ville est asymétrique exprès (beffroi décalé) et l'église porte son
clocher sur le flanc — les y inscrire reviendrait à demander un jour qu'on les « corrige ».

### L'herbe

Valley Town a sa propre palette d'herbe depuis le 431 : **même dessin, même graine de tirage,
donc exactement le même grain**, assombri de 10 % avec un demi-pas vers le bleu (`GRASS_TOWN`
dans `fermeArt.js`). Deux fonctions jumelles auraient été deux dessins à tenir d'accord ; un
grain différent aurait lu comme une autre texture, pas comme une autre lumière. La hauteur
d'herbe et les animations sont pour plus tard.

---

## 15. Pièges invisibles de la ferme, de la ville et du tribunal

⚠️ **CE CHAPITRE VIENT DE `CLAUDE.md` §4, déplacé au 431** sur l'ordre laissé par son §14.2 :
ces pièges décrivent CE code-ci, ils appartiennent donc à ce fichier. Seuls les pièges
réellement globaux (JavaScript, three.js, canevas) sont restés là-bas, avec un rappel du seul
qui touche l'architecture entière — les deux cartes.
⚠️ **Chaque ligne a été relue contre le dépôt avant d'être recopiée**, et une a été SUPPRIMÉE
plutôt que déplacée (la boucle de nuages `SKY_CLOUD_COUNT`, dont le symbole n'existe plus).
Ce qui suit est vrai au 432.

⚠️⚠️ **AJOUT DU 432 — LE MULTIJOUEUR DE LA VILLE ÉTAIT CASSÉ, ET AUCUN DE CES PIÈGES NE LE
DISAIT.** Trois défauts, tous invisibles en jouant seul, tous trouvés en une séance à deux
clients (`tools/fake-supabase.mjs`) :
1. **`advanceRemote` appelait `canStandTown`, qui vit dans la closure du rendu.** Chaque image
   où un joueur distant se DÉPLAÇAIT en ville levait un `ReferenceError` — au milieu de
   `drawTownFrame` (image amputée) ou, chez un joueur resté à la ferme, **avant toute
   peinture** (image perdue). Mesuré : 97 % d'images figées et 116 px de saut → 3 % et 6 px.
   Le piège lui-même est monté en `CLAUDE.md` §4 : il vaut pour tout le projet.
2. **Le tribunal n'avançait aucun joueur distant** : `advanceRemote` rendait `null` pour cette
   zone et sortait, donc `p.tx/p.ty` n'étaient jamais recalculés. Le bâtiment est multijoueur
   depuis le 426 ; personne n'y avait bougé à deux.
3. **Le champ `sit` voyageait depuis le 428 sans être lu.** `pubMe` l'émettait, le handler
   `pos` ne le recopiait nulle part : un joueur assis se dessinait DEBOUT sur son banc, et
   `freeSeatOn` ne voyait aucune place occupée — deux joueurs s'asseyaient l'un dans l'autre.
   **Un champ qui circule sans être lu ne lève aucune erreur : il coûte des octets et ne fait
   rien.** À vérifier pour tout champ ajouté à `pubMe`.

⚠️ Ce qui est déjà attrapé par un banc de `tools/` n'y figure pas : un piège qu'un outil voit
à chaque lancement n'a plus besoin d'être retenu par un humain, et le laisser ici ferait croire
que la liste est la protection alors que c'est le banc.

**Réseau et instances**
- **L'instance cachée.** Hôte hors ferme : `FermeGame` reste montée dans un `display:none`
  (`fermeAway`), simule et diffuse toujours. `document.hidden` = `false`.
- **`netCanBroadcast()` vs `netHasAudience()`** : le premier teste `hiddenRef`, le second
  non. Ne pas les fusionner. **`broadcastSnapshot()` reste en envoi direct.**
- ⚠️⚠️ **UNE GARDE D'AUDIENCE ÉCRITE POUR UNE ZONE S'APPLIQUE À TOUTES, ET C'EST FAUX.**
  `anyRemoteNear` renvoie toujours `false` pour le monde maléfique (filtre `zone === "farm"`,
  lit `p.x/p.y`, or les spectateurs vivent en `p.ex/p.ey`). Même défaut au 427 avec les
  résidents partis en ville : un joueur SEUL EN VILLE ne comptait plus comme audience, donc
  l'hôte n'émettait rien, donc toute la ville restait figée pour lui — sans une erreur.
  D'où `anyRemoteNearZoned`, qui compare les zones AVANT les distances.
- ⚠️⚠️ **CE QUI EST UNE PURE FONCTION DU TEMPS NE SE STOCKE PAS** (430). Le cours du marché, le
  jour de marché et le jour de service de Carla sont HACHÉS à partir du numéro de jour : deux
  joueurs lisent le même chiffre sans qu'un octet ne circule. Stockés dans `shared`, chacun
  aurait coûté un champ de sauvegarde, un compteur chez l'hôte, un message, une réconciliation
  à la connexion d'un invité, et une sauvegarde d'avant le zip à rattraper. ⚠️ **Corollaire
  vital : une telle valeur ne doit dépendre QUE du temps.** Le jour où elle dépendra du stock
  d'un joueur, les deux écrans afficheront des chiffres différents **et chacun aura l'air
  cohérent avec lui-même**.

**Zones, boucles et entrées**
- ⚠️ **UN OUVREUR DE MINI-JEU APPELÉ À MI-FONDU NE DOIT PAS TESTER `zoneTransRef.active`.**
  (Un changement de ZONE, lui, doit le tester : c'est le garde-fou de `enterCourt`.)
- ⚠️⚠️ **QUAND UNE ZONE GAGNE SA PROPRE BOUCLE DE RENDU, ELLE HÉRITE DE TOUT CE QUE LA BOUCLE
  COMMUNE FAISAIT POUR ELLE.** Deux occurrences au 426 (la carte, écran noir en ville depuis
  le 234 parce que `drawFullMap` n'était **jamais appelée** ; `actAnimRef` jamais décrémenté
  en ville, donc un seul coup de hache par visite). **À vérifier écran par écran et minuteur
  par minuteur, zone par zone.**
- ⚠️⚠️ **TROISIÈME OCCURRENCE AU 429, ET IL FAUT LE COMPTER** : le CIEL. Voile nocturne, halos
  de lampadaires, orage, teinte de saison et neige étaient écrits dans le corps du rendu de la
  FERME. Valley Town, qui a sa propre boucle depuis le 234, n'en héritait de rien — **midi de
  printemps perpétuel pendant quatre zips**, avec des dizaines de lampadaires qui ne
  s'allumaient jamais. ⚠️ **UN DÉCOR QUI EXISTE POUR UNE MÉCANIQUE ABSENTE EST PLUS TROMPEUR
  QU'UN DÉCOR MANQUANT.** La parade n'est pas de recopier le bloc dans l'autre boucle (deux
  nuits à tenir d'accord) : c'est de le SORTIR.
- ⚠️⚠️ **UN SECOND CANAL D'ENTRÉE EST UN QUATRIÈME OUBLI EN PRÉPARATION** (430). Le pavé
  tactile écrit dans `keysRef` — les mêmes booléens que les flèches — au lieu d'avoir son
  propre vecteur. Sinon il aurait fallu modifier les TROIS boucles de déplacement, puis penser
  à la quatrième le jour où une zone s'ajoute : très exactement le motif qui a produit la carte
  noire, le minuteur d'action et le ciel absent. **En partageant la variable, le doigt ne PEUT
  pas se comporter autrement que le clavier.**
- ⚠️⚠️ **UNE FONCTION DÉCLARÉE DANS LA BOUCLE DE RENDU N'EST PAS APPELABLE DU COMPOSANT**
  (431, et ça a tué le saut de rebord pendant tout un zip). `tryTownJump` vit dans la closure
  de l'effet de rendu ; le 430 lui a donné deux appelants nés au niveau du composant. Chaque
  appui sur Espace levait un `ReferenceError` — **donc même le repli `doAction()` ne
  s'exécutait pas**. Rien à l'écran, seule la console en parlait. La parade est un `ref`
  réassigné à chaque montage (comme `persistFnRef`), jamais une copie des conditions : deux
  jeux de règles finiraient par proposer un saut que l'autre refuse.
- ⚠️ **UN EFFET VISUEL PORTE SA ZONE.** Sans le filtre de `spawnFx` (426), un joueur resté à
  la ferme voyait des copeaux jaillir d'un point au hasard de son champ à chaque coup de
  hache donné en ville.

**Cartes, générateur, décors**
- ⚠️⚠️ **UNE CARTE EN CACHE DE MODULE NE SE MUTE JAMAIS.** `getTownWorldCached` (et son jumeau
  du tribunal) rend un SINGLETON partagé par tous les remontages de l'onglet : y écrire ferait
  fuiter l'état d'une ferme à l'autre. Tout ce qui change vit dans l'état PARTAGÉ
  (`shared.townChop`, `shared.wardrobe`). Le banc le vérifie explicitement.
  ⚠️ Corollaire du 427 : même une donnée DÉRIVÉE de la carte (la liste des endroits où l'on
  s'arrête) se met en cache **à côté**, jamais dessus — `townSpots` a son propre cache.
- ⚠️⚠️ **UNE COUCHE QUI DÉCIDE D'UNE COLLISION DOIT SORTIR DU GÉNÉRATEUR** (425 : six cents
  haies bloquantes que rien ne dessinait). *Toute case bloquante doit être dessinée par
  quelqu'un*, et sa réciproque. **Désormais automatisé** — et il a resservi au 427 (80 cases
  de la boutique, du salon et de la gare) et au 431 (les deux poteaux de l'arche).
- ⚠️ **ON PERCE LE PASSAGE AVANT DE POSER LA CLÔTURE**, jamais l'inverse (le verger s'était
  refermé sur 309 cases). « Clôturer sauf devant la porte » se casse au premier décalage.
- ⚠️ **UN MONDE DOIT SORTIR COMPLET DE SON CONSTRUCTEUR.** `generateWorld` ne créait ni
  `sucreries` ni `orchards` — **créer une ferme sur un code neuf plantait**, pour tout le
  monde sauf nous.
- ⚠️⚠️ **UN DÉCOR POSÉ SUR UNE TRAME RÉGULIÈRE RENCONTRERA UN JOUR UNE AUTRE TRAME
  RÉGULIÈRE.** 426 : les lampadaires « tous les 8 pas » sont tombés pile sur la nouvelle
  artère x = 196 et l'ont coupée. **On teste le sol (qui sait déjà tout), ou on laisse le
  générateur décider.**
- ⚠️⚠️ **RENOMMER UN BÂTIMENT NE LE REDESSINE PAS** (429). L'« église » de Valley Town était la
  MAIRIE du 235 — fronton à colonnes, horloge, drapeau — renommée au 425 sans qu'un pixel
  bouge. La ville a eu deux mairies pendant quatre zips, dont l'une s'appelait église. C'est le
  « bâtiment muet » du 426 en plus sournois : **ici le bâtiment parle, et il ment.**
- ⚠️⚠️ **UN DÉCOR NE SE JUGE PAS CONTRE D'AUTRES DÉCORS, IL SE JUGE CONTRE LE PERSONNAGE QUI
  S'EN SERT** (429). Un objet deux fois trop grand au milieu d'objets deux fois trop grands a
  l'air juste. Mesuré : l'étal faisait ×1,3 la taille d'un adulte au lieu de ×2,1, la fontaine
  ×2,35 au lieu de ×1,6, le dossier du banc arrivait au SOMMET DU CRÂNE.
  `tools/render-echelle.mjs`. ⚠️ Corollaire : **vérifier le repère avant de corriger le
  dessin.** Le banc semblait faux de 40 % ; c'est le repère qui l'était — vu de trois quarts,
  la profondeur d'une assise se dépense en pixels VERTICAUX.

**Vie sociale**
- ⚠️⚠️ **UN PNJ QUI ABANDONNE SON TRAJET N'A PAS L'AIR BLOQUÉ, IL A L'AIR D'AVOIR CHOISI**
  (427, mesuré et corrigé au 428). La rôdaille en ligne droite du 252 échouait sur **79 % des
  trajets** ; à l'abandon, le résident jouait quand même son activité SUR PLACE, sept à
  vingt-six secondes. Personne n'a rien vu pendant deux zips : le symptôme ressemblait à de la
  contemplation. **Un repli plausible est plus dangereux qu'un plantage**, et ça vaut pour le
  COMPORTEMENT autant que pour le code.
- ⚠️⚠️ **UN DÉFAUT DE LA SOMME NE SE VOIT DANS AUCUNE LIGNE DE CODE** (428). 33 des 48 blocs
  n'avaient AUCUN endroit de vie, et 16 des 61 endroits étaient des tombes — un quart de la vie
  sociale au cimetière, sans que ce soit l'intention de personne. **Ce genre de défaut se
  contrôle en comptant, et le contrôle doit exister AVANT l'ajout** — sinon on remplace un
  déséquilibre par un autre (premier jet du 428 : 39 % des endroits sur le trottoir).
- ⚠️⚠️ **UNE RÈGLE SOCIALE SANS DÉLAI DE GRÂCE S'ÉTRANGLE AU POINT D'ARRIVÉE** (427, trouvé en
  jeu). Cinq résidents descendent le même quai à la même seconde : tous à portée de
  conversation, donc tous appariés d'un coup, donc tous figés à se saluer en boucle. Personne
  ne quittait la gare. **Un débarquement n'est pas une rencontre.**

---

## 16. ZIP 433 — LES PIGEONS ET LES COLOMBES

Demande de Guillaume, en deux temps. D'abord : « des colombes et des pigeons par
terre sur la place centrale, qui s'envolent élégamment quand on se rapproche trop
d'elles ; ajoute-les aussi devant le courthouse ; travaille bien le vol ».
Puis, après essai : **« le comportement social des pigeons n'est pas très
réaliste […] là tes oiseaux se comportent comme les animaux de la ferme »**.

### Ce qui ne circule PAS sur le réseau, et pourquoi

⚠️⚠️ **AUCUNE POSITION D'OISEAU NE VOYAGE.** Vingt entités à soixante images par
seconde feraient exploser à elles seules le plafond de dix messages par seconde
(§3 de `CLAUDE.md`). Deux conséquences, et Guillaume a tranché la seconde
(« leur comportement doit pas être exactement partagé entre tous les joueurs ») :
- les **emplacements possibles** se déduisent de la carte, donc tout le monde a
  des pigeons au même endroit ;
- le **nombre**, les activités et les envols sont tirés LOCALEMENT. Deux joueurs
  sur la même place ne comptent pas les mêmes pigeons — c'est assumé, ça ne se
  remarque pas, et ça coûte zéro message.

⚠️ **L'envol, lui, écoute TOUS les joueurs** : leurs positions circulent déjà,
donc un vol s'envole aussi quand c'est le camarade qui approche, gratuitement.

### Le modèle : trois mécanismes, aucun cas particulier

⚠️⚠️ **CE QUI CLOCHAIT AU PREMIER JET N'ÉTAIT PAS UN RÉGLAGE, C'ÉTAIT LE MODÈLE.**
Chaque oiseau avait UNE CASE À LUI et y sautait à intervalle régulier : par
construction, espacement égal, mouvements réguliers, une seule activité. D'où le
« comme les animaux de la ferme ». Le modèle actuel (`E.flockStep`) en tient trois :

1. **une ACTIVITÉ**, tirée au sort, de durée variable — planté, picorer, marcher,
   faire la roue, se chamailler. ⚠️ `idle` est la plus importante : *« ils ne font
   pas toujours que picorer »*. Un oiseau qui a toujours quelque chose à faire
   est un automate ;
2. **des VOISINS** — on s'écarte de qui serre, on revient vers le groupe si l'on
   s'en éloigne, et il arrive qu'on en SUIVE un (`court`, la parade : on tourne
   AUTOUR de lui, jabot gonflé). ⚠️ **L'espacement n'est jamais réglé : il TOMBE
   de ces deux forces opposées** — c'est ce qui produit des grappes serrées et des
   isolés au lieu d'une grille ;
3. **une EXCITATION**, qui monte près de la nourriture et dans la foule. Elle
   pilote la vitesse, la cadence des coups de bec et la probabilité de se
   chamailler. ⚠️ **Un pigeon seul flâne, dix pigeons autour d'un quignon se
   battent : c'est le même code, à deux valeurs près.**

Et la vitesse passe par une ACCÉLÉRATION (`BIRD_ACC`), pas par une téléportation :
c'est elle qui donne « il suit l'autre, accélère, ralentit sa course ».

### Le pain jeté depuis un banc

⚠️ **ON NE MODÉLISE PAS LE QUIGNON, ON MODÉLISE CE QU'IL PROVOQUE** — c'est la
demande mot pour mot. Assis sur un banc de la ville, **Espace** éparpille des
miettes devant soi (`throwCrumbs`) : un point, une durée, cinq tas. Tout le reste
— la ruée, la bousculade, les absents qui reviennent, la cadence de becquetage
qui triple — tombe du modèle de volée.

⚠️⚠️ **CINQ TAS, PAS UN, ET C'EST UN DÉFAUT VU EN JEU.** Sur un point unique, douze
pigeons convergents s'empilaient en **file indienne**. Un quignon émietté fait
plusieurs tas ; chacun a SA miette, et l'attroupement s'étale en rosace.
`render-oiseaux.mjs` le mesure (allongement du nuage : ×1,13 ; une file donne 4).

⚠️ **LE PAIN EST GRATUIT, ET C'EST UN ARBITRAGE À REVOIR AVEC GUILLAUME.** Le gager
sur un `bread` du stock d'artisanat lierait la scène à l'économie (joli), mais
transformerait un geste d'ambiance en dépense — et un joueur assis qui appuie sur
Espace sans rien voir se passer croit que la touche est cassée.

### Le dessin

⚠️ **NEUF POSES PAR ESPÈCE**, refaites sur les références photo de Guillaume :
`stand` / `peck` / `walk` / `puff` / `alert` au sol, `down` / `mid` / `up` /
`glide` en vol. Ce que les références ont changé, et que le premier jet ratait :
- **un pigeon est LONG ET BAS, pas rond** ; le jabot déborde en avant et en bas
  des pattes ; la queue est longue et pointue ; **deux barres alaires épaisses** ;
  **les pattes sont rose vif** (la seule couleur saturée de l'animal) ; le col
  vire du vert au violet ; et **la tête sort du corps**, séparée par un creux de
  nuque — sans lui, c'est un galet gris ;
- **en vol, l'envergure écrase le corps** et **les rémiges sont SÉPARÉES** : on
  dessine l'aile pleine puis on ÉVIDE un pixel entre les dernières plumes. C'est
  le seul endroit du fichier où l'on RETIRE de la matière pour ajouter du détail.

⚠️ **Le pigeon est la règle, la colombe l'exception** (`BIRD_DOVE_SHARE = 0,14`) :
assez pour qu'elle surprenne, pas assez pour croire à un lâcher de mariage.

⚠️ **ET UN CANEVAS DÉCOUPE EN SILENCE.** Les poses sont dessinées serrées, puis
RECADRÉES de deux pixels, PUIS cernées (`padOutline`) : cerné dans son cadre
juste, le liseré d'un sprite qui touche le bord est lui-même découpé. Le banc
refuse désormais toute pose qui touche son bord — ce piège a été payé **trois
fois dans ce seul zip** (l'enseigne du taxi, le drapeau de la mairie, les ailes).
