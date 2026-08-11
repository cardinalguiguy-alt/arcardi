# Valley Town, le tribunal, l'hôtel de ville, et la vie qui s'y passe — état au 439

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
- **les MAISONS n'ont pas été retouchées** alors que Guillaume les a nommées dans sa revue du
  429. Leur échelle est juste (×3,48) et le défaut est de CONTENU, pas de dessin : **dix façades
  pour vingt-sept parcelles**, donc des jumelles côte à côte. Le corriger demande des décisions,
  pas des pixels. *(Le lac, lui, a reçu son dessin au 435 et sa profondeur au 436 ; il lui
  manque encore sa GÉOMÉTRIE — voir §18.)*
- **rien à FAIRE au bord de l'eau.** L'étang et le lac sont beaux et vides : ni pêche, ni
  barque, ni canard. C'est la même question ouverte que les vingt blocs de prairie.

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

---

## 17. ZIP 434 — LE REVÊTEMENT DES RUES

Demande de Guillaume, sur planche de référence (huit variantes, quatre retenues) : « des
tuiles ou groupes de tuiles **assemblables** qui ont des motifs bien plus complexes qu'à
l'heure actuelle », la grande artère **goudronnée et élargie** avec sa ligne blanche
discontinue et ses **rebords gris**, l'allée du cimetière **en briques** et **recentrée**, et
toutes les autres rues en **pavés gris**.

Ce qu'il y avait : `pathTile()` — UNE tuile de 16×16, dix taches beiges, recopiée à
l'identique sur les 2 327 cases de rue de la ville. À l'écran, une moquette.

### Ce qui change, en une ligne chacun

| | avant | après |
|---|---|---|
| grande artère (rue de la gare, `TOWN_MAIN_ST_Y`) | 2 cases de terre battue | **4 cases de goudron**, ligne blanche sur l'axe, bordures de pierre |
| toutes les autres rues + les allées de maison et de parvis | terre battue | **pavés gris**, bordures de pierre |
| allée du cimetière | terre battue, **décalée d'une case à l'est** | **briques**, **centrée** |
| esplanade, parvis, champ de foire, quai | inchangés | inchangés — *voir le piège de la passe finale* |

### ⚠️⚠️ UNE COUCHE, PAS DES IDENTIFIANTS DE SOL — le vrai sujet de ce zip

La façon « évidente » était d'ajouter trois `G_*` (`G_TOWN_ASPHALT`, `G_TOWN_COBBLE`,
`G_TOWN_BRICK`). Elle coûte **quarante tests à rouvrir** : `ground === C.G_PATH` apparaît
quarante fois dans `fermeEngine.js` (marche, A* piéton, A* du taxi, arrêts de taxi, oiseaux,
lampadaires, panneaux, haies, promenade du lac…) et deux fois dans les bancs. **En oublier un
seul ne lève rien** : ça fait une rue qu'on ne peut plus traverser, un taxi qui refuse une
course, ou un pigeon qui ne se pose plus — la famille de défauts muets du §15.

La parade est celle des haies (425) : **un tableau parallèle**, `world.road[i]`, lu à l'index
qu'on a déjà. Le sol reste `G_PATH`, donc **la circulation, la navigation et le taxi ne voient
strictement aucun changement** ; la couche dit seulement avec quoi on PEINT. Les constantes
sont `TR_NONE / TR_ASPHALT / TR_COBBLE / TR_BRICK` dans `fermeConstants.js`.

### ⚠️ LA PASSE DE REVÊTEMENT EST LA DERNIÈRE DU GÉNÉRATEUR, ET C'EST TOUT LE TRUC

Elle ne peint que ce qui est **encore** `G_PATH`. Tout ce qu'une esplanade a recouvert entre
temps (`G_PATH_STONE`) n'est plus une rue et ne reçoit rien : c'est **littéralement** la
réponse à « la rue nord-sud ne doit pas couper l'esplanade ». On ne teste pas l'emprise de la
place, on ne soustrait aucun rectangle, on n'écrit aucune borne — la place a déjà mangé ces
cases. Écrite avant la place, la même passe aurait exigé un cas particulier par esplanade
(place, cinq parvis, marché, quai, quai de gare), et il en aurait manqué un.

### L'élargissement ne déplace pas l'axe, et c'est une contrainte dure

La chaussée passe de 2 à 4 cases **en gardant son milieu** : rangées 69..72 au lieu de 70..71,
axe à y = 71,0 dans les deux cas (`TOWN_MAIN_ST_Y0` est **dérivé**, jamais réglé).
C'est ce qui rend l'élargissement gratuit pour le taxi — `townRoadCenter` repose ses points au
milieu de la bande roulable, donc il roule exactement où il roulait.
⚠️ **`TOWN_MAIN_ST_W` doit rester PAIR.** Impair, le milieu tomberait au centre d'une case, la
ligne blanche se dessinerait au milieu d'une tuile et la voiture se décalerait d'une demi-case.

⚠️ **DEUX POSITIONS RÉGLÉES SUR L'AXE ONT DÛ SUIVRE, et aucune n'aurait levé d'erreur :**
- les **lampadaires** de l'artère étaient sur `TOWN_MAIN_ST_Y - 1`. Cette rangée est devenue de
  la chaussée : le test de sol de la boucle les aurait tous sautés **en silence**, et la plus
  grande rue de la ville se serait retrouvée non éclairée. Ils se déduisent maintenant du BORD
  de la chaussée, pas de son axe ;
- les **alignements d'arbres** valaient `ry - 2` / `ry + 3`, c'est-à-dire « deux cases en
  retrait » écrit en dur pour une rue de deux cases. La rangée sud serait tombée DANS la
  chaussée. Les deux bords sont dérivés.

### L'allée du cimetière penchait depuis le 425

`cm.x + (cm.w >> 1)` donne la case qui SUIT le milieu, pas le bord gauche d'une allée large de
deux : pour une bande de 2 dans un enclos de 14, le bord gauche est à `(14−2)/2 = 6`, pas à 7.
L'axe réel de l'enclos est x = 53,0. Les quatre rangs de tombes (48/50 et 55/57) et les deux
arbres (47 et 58) étaient **déjà** symétriques par rapport à lui — c'est l'allée qui était
fausse, pendant neuf zips. §4 : *une position réglée à la main est une position qui penchera.*

### Le dessin : la période, pas le nombre de détails

⚠️⚠️ **CE QUI SÉPARE UN SOL TRAVAILLÉ D'UNE MOQUETTE EST LA PÉRIODE.** Une tuile seule se
répète tous les 16 px et l'œil voit la grille avant de voir le dessin, **quelle que soit sa
finesse**. Les trois revêtements sont donc des **pavés de 4×4 tuiles** (64×64) dessinés d'un
seul tenant, dans lesquels le rendu découpe la case dont il a besoin (`x % 4`, `y % 4`) : les
pierres, les briques et les fissures traversent les bords de case, et la grille disparaît.

⚠️ **Le motif doit boucler sur lui-même**, sinon on a juste déplacé la couture de 16 à 64 px —
et une couture tous les quatre carreaux est PIRE qu'un motif régulier, parce qu'elle dessine
une deuxième grille. Toute forme passe par `roadWrap()`, qui la peint aussi à −64 et +64.

⚠️ **Tout est en `fillRect`** : ni `translate`, ni `rotate`, ni `fillText`. C'est ce qui rend
`tools/render-rues.mjs` possible — voir `tools/README.md`.

Trois défauts de dessin ont été refusés par le banc **avant** que Guillaume les voie, et les
trois valent d'être connus :
- **le goudron était un aplat** (écart-type 8,7 sur 13 couleurs). Ce qui manquait n'est pas du
  bruit, c'est le **granulat** : un enrobé est du gravier clair noyé dans du noir, et à 16 px
  par case c'est le seul détail qui porte la matière. ⚠️ Mais il en faut MOINS qu'on ne croit —
  260 cailloux trop clairs donnaient du poivre et sel qui scintille au défilement ; 170,
  plafonnés deux tons plus bas, font de la matière ;
- **les pavés étaient du papier bulle** : même hauteur, même biseau complet, mêmes quatre coins
  mangés → une grille de pastilles identiques, le défaut qu'on prétendait corriger à une
  échelle plus grosse. Trois irrégularités le cassent (une pierre sur trois plus basse d'un
  pixel, biseau clair PARTIEL, coins mangés au hasard) ;
- **les briques étaient un mur neuf** : treize rouges vifs posés à plat, alors que c'est une
  allée de cimetière, à l'ombre, foulée depuis cent ans. Teintes rabattues vers le brun-gris,
  trois d'entre elles franchement délavées, mousse dans les joints.

### Le rebord se pose contre ce qui n'est PAS dallé

⚠️ Testé sur le REVÊTEMENT, un carrefour où le goudron croise les pavés se serait retrouvé
**ceint de bordures** — une rue barrée par un trottoir à chaque intersection, avec le taxi
passant au travers. On teste donc le SOL : dallé (rue, allée, esplanade) → rien ; herbe, eau,
marche → bordure. La place n'est pas coupée, les allées débouchent, les carrefours restent
ouverts. ⚠️ Et le **nez de bordure est continu** : le joint des pierres de taille part de
`v = 1`, sinon il hache l'arête claire tous les huit pixels et le banc ne peut plus distinguer
un trottoir d'un simple biseau de pavé.

### Ce que ça ne fait pas

- **le champ de foire garde sa terre battue** : c'est un pré qu'on dalle un jour par semaine,
  pas une voie ;
- **la ferme n'est pas touchée** — `drawTownRoadTile` n'est appelée que par la boucle de la
  ville, et la couche `road` n'existe que sur la carte de Valley Town ;
- **pas de voies séparées.** Il y a une ligne blanche, mais le taxi roule sur l'axe comme
  avant : il la chevauche. Rouler à droite demanderait un réseau orienté, ce qui est un autre
  chantier ;
- **le goudron s'arrête aux quatre bords de l'esplanade** et reprend de l'autre côté. C'est le
  motif urbain voulu (une place n'est pas une chaussée), pas un oubli.

---

## 18. ZIP 435 — L'EAU : LE TRAIT D'EAU QUITTE LA GRILLE

Retour de Guillaume, mot pour mot : « qu'on cesse de faire des rives de lacs verticales ou
horizontales », avec une référence en image — une mare aux contours courbes, à la rive rocheuse
et au fond dégradé. Puis : « fais des contours plus courbes et réalistes. Et ensuite crée le
dessin de profondeur avec l'eau avec des reflets ».

**Chantier limité à l'étang du parc pour la FORME. Le dessin, lui, vaut pour toute l'eau de la
ville** — c'est la même fonction, et en écrire une seconde pour l'étang aurait été la
divergence en attente du §8.

### Ce qui n'allait pas, en trois nombres

| | avant | après |
|---|---|---|
| plus longue rive alignée | **16 px minimum PAR CONSTRUCTION** | **8 px** |
| écart-type de la nappe | **8,3** (de la gouache) | **27,4** |
| L bord / L large | *aucun écart* — un seul bleu | **160 / 54** |

⚠️ **57 % des arêtes eau/terre de la ville étaient un contact herbe→eau sans un pixel de
transition** (mesuré au 434, sur les 276 arêtes de la carte).

### 1. La forme : un rayon modulé, pas une équation

L'étang était `u² + v² ≤ 1`. **Une ellipse est convexe par définition** : elle ne peut former ni
crique, ni pointe, ni presqu'île, quels que soient ses rayons — et sa rastérisation lui donnait
quatre **ergots d'une seule case** (N/S/E/O) qui la faisaient lire comme un losange. Même
famille que le lac du sud, dont le rivage est `sin(x)`, donc une FONCTION DE x, donc incapable
de revenir sur elle-même : **75 colonnes plates sur 95**.

`TOWN_POND` décrit maintenant un **rayon** modulé par quatre harmoniques (`TOWN_POND_LOBES`) :
k=1 décentre, k=2 fait le haricot, k=3 creuse les criques, k=5 donne le grain. Non convexe dès
que la somme des amplitudes dépasse ~0,25.
⚠️ **Aucun tirage aléatoire** : `generateTownWorld` partage UN générateur (graine 0x7041) entre
tout ce qu'il pose ; y puiser quatre nombres de plus décalerait TOUS les arbres et TOUT le
mobilier de la ville. Les harmoniques sont écrites en clair, et se règlent à l'œil sur le banc.
⚠️⚠️ **Puis deux passes d'automate cellulaire, et elles ne sont pas cosmétiques.** Un contour
organique rastérisé sème des ergots et des encoches d'une case PARTOUT — pires que l'ovale
qu'on remplace, parce qu'à 16 px une case seule ne se lit pas comme « rive découpée » mais
comme un défaut, et qu'elle est infranchissable. Une case d'eau à moins de deux voisines
redevient de la terre, une case de terre à trois voisines se noie. **Deux passes** : une seule
laissait des marches, trois rongeaient les pointes qu'on voulait garder.

### 2. Le dessin : les carrés marcheurs sur les COINS

⚠️⚠️ **C'était la vraie cause, et elle n'est pas dans le générateur.** Une case était de l'eau
ou ne l'était pas, et l'eau était un `fillRect` pleine case : **le trait d'eau suivait la
grille, donc le rivage était un escalier de 16 px — et il l'aurait été quelle que soit la
finesse du contour calculé.**

Chaque **coin** de case vaut « eau » ou « terre » ; le trait d'eau est l'isocontour bilinéaire
entre les quatre coins. Trois propriétés tombent gratuitement :
- il est **continu** d'une case à l'autre (deux cases voisines partagent leurs deux coins, donc
  aucune couture possible — ce que quatre tuiles de rive dessinées à la main n'auraient jamais
  garanti) ;
- il est **courbe** (l'isocontour d'une bilinéaire est une hyperbole, donc un angle de rive se
  lit arrondi, jamais en biseau à 45°) ;
- il **traverse** les cases.

⚠️⚠️ **ET LE COIN AMBIGU EST TIRÉ AU SORT — c'est lui qui fait le naturel.** Un coin dont deux
cellules sur quatre sont de l'eau (c'est le cas de TOUS les coins d'une rive droite) n'a pas de
bonne réponse : on la tire d'un hachage de ses **coordonnées monde**. Même réponse pour les
quatre cases qui se le partagent — pas de fissure — et même réponse chez les deux joueurs, sans
rien diffuser. **Sans ce tirage, la méthode entière rendrait une rive droite… droite.**

16 configurations × 2 variantes × 8 profondeurs = **192 tuiles bakées**, un `drawImage` au
rendu. Même raisonnement que les revêtements du 434.
⚠️ La variante déforme le seuil par une bosse **nulle sur les quatre bords** (`16·u(1−u)·v(1−v)`) :
elle gondole l'intérieur du trait sans déplacer ses points de sortie. Une déformation constante
aurait ouvert une fissure d'un pixel tout autour du plan d'eau.

### 3. La profondeur et les reflets

`world.depth` (0 au ras de la rive, 255 au large) et `world.shore` (1 mouillée · 2 sèche ·
3 immergée) sont **deux couches parallèles, pas deux `G_*`** — l'arbitrage du 434 appliqué à
l'eau. Un `G_LAKE_SHORE` en ville aurait rouvert tous les tests de sol du moteur (marche, A*
piéton, A* du taxi, oiseaux, `townSpots`, `blockedTown`) ; en oublier un ne lève rien, ça fait
juste une berge infranchissable ou un lac qu'on traverse. Les deux couches sont calculées **en
toute dernière passe**, après le revêtement, donc sur le sol final.

- **Distance de chanfrein (5-7), pas une vague à quatre voisins** : la distance de Manhattan
  donne des lignes de niveau en LOSANGE, c'est-à-dire un escalier de plus, au milieu de l'eau.
- **Échelle absolue** (`TOWN_WATER_SHELF = 2,6 cases`), jamais une normalisation par la plus
  grande flaque : normalisé sur le maximum de la carte, l'étang — 4 cases de rayon contre 12
  pour le lac du sud — serait resté un haut-fond uniforme, et il aurait changé de couleur le
  jour où l'on creuse le lac d'une case.
- **La rampe plonge vite.** Premier jet : huit crans étalés régulièrement → un anneau BLANC de
  deux cases autour d'une tache bleue. La moitié claire d'une rampe régulière occupe la moitié
  de la surface ; sur une mare, c'est tout le bord.
- **Deux liserés opposés** : la lumière du projet vient du nord-ouest (c'est le biseau des pavés
  du 434), donc la berge nord-ouest porte son ombre SUR l'eau et la rive sud-est reçoit l'écume.
  ⚠️ L'écume est **discontinue** (un pixel sur trois saute) : continue, elle détourait l'étang
  comme un autocollant.
- **Les reflets** : les arbres du nord se couchent sur l'eau vers le sud en ondulant, et une
  lame de lumière glisse, **déphasée par un hachage de la case**. L'ancien voile du 425
  (`sin(now/900 + (x+y))` sur la case entière) peignait une **damier diagonale de deux bleus**
  sur toute la nappe — deux cases en diagonale partagent la même valeur de `x+y`. Supprimé.
  ⚠️ Les reflets ne se posent **que sur une case de pleine eau** : ailleurs, un `fillRect`
  déborderait du contour, c'est-à-dire redessinerait la grille qu'on vient de casser.

### Trois fois la même leçon, dans le même zip

**On casse la grille à un endroit, on la redessine à l'autre.** Payé trois fois :
1. le fondu de profondeur en quatre bandes alpha, une par voisin → un **tissu écossais** de
   rayures. *Un fondu posé sur les quatre côtés n'est pas un dégradé, c'est un cadre, et deux
   voiles alpha qui se croisent fabriquent une troisième teinte que personne n'a choisie.* On
   ne fond que sur l'**axe dominant**, en opacité pleine, au niveau moyen entre les deux cases ;
2. la berge en demi-plan plein sur huit orientations bakées → **huit triangles nets**, un par
   case. La couverture est devenue une **densité** : la distance au bord donne une probabilité,
   on tire pixel par pixel, et le bord de la berge n'existe plus comme trait ;
3. le liseré **vert vif** sous toute la promenade du lac : le rendu peint l'herbe sous les cases
   d'eau (il le faut — le trait traverse la case, il reste du sec à montrer), et là où le
   contour se retirait, la pelouse ressortait entre les grains de limon. La rive immergée
   (bande 3) a sa propre matière et couvre **plein** au contact de la terre.

### Ce que ça ne fait pas

- **le lac du sud garde sa forme** : son rivage nord reste `sin(x)` et ses trois autres bords
  restent les coupes droites du rectangle `TOWN_LAKE` (bord sud : la droite y = 165 sur 96
  colonnes). Il gagne le dessin — berge, profondeur, écume, reflets — pas la géométrie. C'est
  le prochain chantier, et il est plus lourd : la promenade, le ponton, les bancs et les
  lampadaires sont tous accrochés à `shore(x)` ;
- **la fontaine de la place est hors jeu** : ses deux cases sont de l'eau pour la COLLISION
  seulement, sa vasque a son propre dessin. Une berge de galets autour d'une fontaine de pierre
  serait exactement le rectangle bleu que le 425 a corrigé ;
- **la ferme n'est pas touchée** : sa rivière garde la tuile animée du 232, et les couches
  `depth`/`shore` n'existent que sur la carte de Valley Town ;
- **aucun roseau, aucun nénuphar, aucun rocher émergé.** La référence en a ; on n'a livré que la
  rive et le fond.

---

## 19. ZIP 436 — L'AUDIT GRAPHIQUE : L'EAU, LA PIERRE, LE TAXI

Demande de Guillaume, en deux temps. D'abord : « fais un audit graphique et visuel du jeu […]
améliore la cohérence de Valley Town […] sois autonome et surprends-moi », avec trois pistes
nommées — **le lac du parc trop grand et pas assez réaliste** (référence en image : une mare à
rive rocheuse, fond dégradé, nénuphar), **le taxi peut être plus travaillé**, et **l'écart
flagrant de qualité de textures entre le sol pavé et les escaliers du courthouse**. Puis :
« les défauts peuvent être le placement d'un lampadaire comme la couleur de l'herbe, l'échelle
d'un objet ou tout autre élément ».

### ⚠️⚠️ CE QUE L'AUDIT A TROUVÉ EN PREMIER N'EST PAS UN DESSIN, C'EST UNE RÈGLE

**Tout ce qui était mal dessiné dans Valley Town était mal dessiné AU MÊME ENDROIT : dans la
closure de la boucle de rendu.** Les marches, le parement de falaise, le limon et le dallage
d'esplanade y vivaient depuis le 425 ; les revêtements de rue (434) et l'eau (435) en étaient
sortis pour être regardables par un banc, et ce sont exactement les deux surfaces que personne
ne trouve pauvres. Ce n'est pas une coïncidence, c'est une **mécanique** :

> **Un dessin qu'aucun banc ne peut appeler est un dessin qui vieillit tout seul.** Il ne se
> dégrade pas — il reste au niveau du jour où il a été écrit, pendant que tout ce qui est
> mesuré monte. L'écart que Guillaume a vu n'est pas un écart de soin, c'est un écart de DATE,
> et il se lit sur une carte du dépôt : ce qui est dans `fermeArt` a été refait, ce qui est
> dans la closure ne l'a pas été.

C'est le piège n°1 de `CLAUDE.md` §4 sous sa forme lente. Les deux occurrences connues étaient
des plantages (`tryTownJump`, `canStandTown`) ; celle-ci ne lève rien du tout et coûte plus
cher, parce qu'elle se paie en qualité pendant douze zips.

### 1. L'étang du parc

| | 435 | 436 |
|---|---|---|
| rayons | 5,9 × 4,0 (≈ 14 cases de large) | **4,3 × 3,1** (≈ 9) |
| plateau de profondeur | 2,6 cases | **1,5** |
| crans de la rampe | 8 | **16**, dérivés de 5 repères |
| arête de case / grain interne | **×3,05** | **×1,27** |
| nénuphars · rochers · roseaux | aucun | oui, tirés d'un hachage de case |

⚠️⚠️ **LA PROFONDEUR RENDAIT UNE MOSAÏQUE DE CARRÉS, ET LES QUATORZE CONTRÔLES DU 435 DISAIENT
OK.** Ils mesuraient la rectitude du rivage, la continuité du trait, l'écart bord/large et
l'écart-type de la nappe. Aucun ne parlait de la grille INTÉRIEURE — c'est-à-dire du défaut que
le zip entier prétendait corriger, déplacé de deux mètres vers le large. Le 435 fondait déjà par
deux bandes de 5 px sur l'axe dominant ; **une bande est un rectangle** (trois marches au lieu
d'une, toujours alignées sur la case), et un seul axe laisse franche l'arête d'une case en coin.

⚠️ **LA PARADE EST UN TRAMAGE STOCHASTIQUE, PAS UN VOILE ALPHA.** Chaque pixel prend la couleur
d'un cran — le sien ou celui d'un voisin — avec une probabilité qui décroît linéairement en
s'éloignant de ce voisin. En espérance c'est l'interpolation bilinéaire de la profondeur ; en
pixels c'est du grain, la matière que l'eau a déjà. Et comme chaque pixel est OPAQUE, **les
quatre côtés peuvent être servis d'un coup** : deux tramages superposés ne fabriquent pas de
troisième teinte, contrairement à deux voiles alpha (le tissu écossais du 435). Coût : 4 × 16
tuiles de 16 px, cuites une fois.
⚠️ **Seize crans, et c'est un calcul, pas un goût** : à plateau de 1,5 case et huit crans, deux
cases voisines sautent CINQ crans, et une interpolation entre deux valeurs distantes de cinq
n'a que trois teintes à offrir sur seize pixels. Le tramage rendait encore des plaques.
⚠️ **Rétrécir l'étang a rendu le plateau faux, et le banc l'a refusé sur-le-champ** (« 26 cases
de haut-fond, 0 au large »). On aurait pu desserrer le contrôle ; c'est le seuil du taxi au 434
en pire, parce qu'ici le banc avait raison. Le lac du sud y gagne aussi : son anneau pâle de
deux cases et demie était un lac peint au pochoir.
⚠️ **La rampe est DÉRIVÉE de cinq repères** au lieu d'être écrite cran par cran (§8), et les
repères ont été **rabattus** : ceux du 435 partaient d'un turquoise presque blanc, et le
haut-fond se lisait comme de la glace. *Une eau claire vue de dessus prend la couleur du FOND ;
le bleu arrive avec la profondeur, quand le fond disparaît.*

⚠️⚠️ **LE REFLET D'ARBRE ÉTAIT DEUX RECTANGLES**, à trois lignes de la note qui explique
pourquoi il ne faut pas en poser : `fillRect(px + 3, py, 10, T)`, un bloc vert à arêtes franches
aligné sur la case, c'est-à-dire **la grille redessinée en vert** au milieu de la nappe. Il est
maintenant une densité — une largeur par rangée, un pixel sur quatre qui saute, et il s'effiloche
vers le sud.

⚠️ **CE QUI FLOTTE N'EST PAS UN PROP, ET C'EST DÉLIBÉRÉ.** L'eau bloque déjà : un nénuphar ou un
rocher posé dessus n'a aucune collision à porter, donc rien à faire dans `tw.props` (qui
coûterait une passe de générateur, une entrée au contrôle « toute case solide est dessinée » et
un tri de profondeur). Ils sont tirés d'un **hachage de la case**, comme les emplacements
d'oiseaux du 433 : mêmes nénuphars chez les deux joueurs, zéro octet de réseau. Le rocher
n'émerge qu'en haut-fond, le nénuphar ne s'installe qu'au calme, **et leurs seuils se
chevauchent exprès** — sinon l'étang se lirait en anneaux concentriques, le défaut qu'on vient
de corriger sur les bleus, revenu sur les objets. Les roseaux sont sur la berge MOUILLÉE et
nulle part ailleurs : sur la berge sèche ils pousseraient dans la pelouse, sur la rive immergée
au fond de l'eau.
⚠️ **Le seuil de haut-fond est une FRACTION de la rampe, pas un cran.** Écrit « d ≤ 2 », il
voulait dire « le tiers clair » à huit crans et « le huitième » à seize : une ligne, et les
rochers disparaissaient de l'étang sans que rien ne le signale.

### 2. La pierre de la Haute-Ville — marches, falaise, limon, dallage

Tout est sorti de la closure vers `fermeArt` (`drawTownStairTile`, `drawTownCliffFace`,
`drawTownStairCheek`, `drawTownFlagTile`) et **`tools/render-escaliers.mjs` les regarde** — voir
`tools/README.md` pour les vingt-deux contrôles et les trois fois où ce banc s'est trompé de
grandeur.

Ce qu'il y avait, et ce que c'était vraiment :

| | avant (425) | après (436) |
|---|---|---|
| marches | `fillRect` gris uni + 4 traits blancs et 4 noirs, **identiques sur toutes les cases de toutes les volées** | pavé de 4×4 tuiles bouclant, blocs de largeur inégale, nez ébréché, ombre portée, mousse, usure au milieu de la volée |
| parement de falaise | aplat `#8f8a80`, ligne pleine largeur tous les 5 px, **UN joint vertical par case toujours au même x** | six assises appareillées, joints décalés à chaque assise, bossage, pierres de remploi, suintement |
| limon | trois `fillRect` | pierres empilées à joints sombres |
| dallage d'esplanade | `(x + y) % 2` entre deux gris — **un damier de période 16 px** | grandes dalles de 21 px de rang, seize teintes, fêlures brisées, mousse dans les joints |

⚠️⚠️ **LE DALLAGE EST LE PLUS IMPORTANT DES QUATRE, ET IL N'ÉTAIT PAS DANS LA DEMANDE.** Quand
Guillaume écrit « un écart flagrant entre le sol pavé et les escaliers du courthouse », **les
deux tiers de ce qu'il regarde sont le dallage** : le parvis du tribunal, la terrasse de la
Haute-Ville, la place, les cinq parvis, le champ de foire et le quai en sont faits, et la volée
neuve arrivait dessus. Un escalier ne se juge pas seul (leçon du 429).
⚠️ **Sa matière est délibérément AUTRE que celle des rues** : de grandes dalles, pas des pavés
ronds. Une place n'est pas une chaussée — c'est déjà l'argument du 434 pour que le goudron
s'arrête à ses quatre bords — et deux sols qui se touchent doivent se distinguer, sinon on a
travaillé pour rien.
⚠️ **La plage de teintes est LARGE (seize gris, `#9a988f` → `#c8c6bd`), et c'est le banc qui l'a
imposée.** À douze gris tous à ±5 de luminance, chaque dalle était jolie et l'ensemble était un
aplat : une place est faite de PEU de grandes pierres, donc sa matière tient dans l'écart d'une
pierre À L'AUTRE, pas dans le grain de chacune. **C'est l'inverse exact du goudron du 434** (un
seul matériau, la richesse dans le grain) — et c'est pour ça qu'on ne peut pas recopier le
réglage d'une surface sur une autre.

⚠️⚠️ **ET LE BANC A TROUVÉ UN DÉFAUT QUE PERSONNE NE CHERCHAIT : 22 MARCHES SUR 52 ÉTAIENT
DESSINÉES EN TRAVERS DE LEUR VOLÉE**, sur les trois volées de la ville. Le sens de la montée se
déduit du gradient d'altitude (§7 : jamais de seconde description d'un même escalier), et il
était lu sur les quatre voisines immédiates, **terrain compris** : ça marche au milieu d'une
volée et ça bascule sur son BORD, où la case du dessus est de la terrasse et celle du dessous du
trottoir, donc le gradient transversal cesse d'être nul.
⚠️ **La bonne question n'est pas « de quel côté ça monte » mais « dans quel sens les marches se
suivent ».** Deux cases d'escalier VOISINES ne diffèrent d'altitude que le long de la montée : en
travers, une volée est de niveau par construction. On ne regarde donc que les voisines qui sont
elles-mêmes des marches, et la réponse est exacte au lieu d'être statistique. On n'interroge
toujours pas `TOWN_STAIRS`.
⚠️ **Avec les quatre traits gris du 425, ce défaut était invisible ; en pierre, c'est la
première chose qu'on voit.** *Enrichir une texture rend visibles les erreurs de géométrie qu'elle
cachait — il faut donc s'attendre à en trouver, et un banc pour les voir.*

### 3. Le taxi

« Le taxi peut être plus travaillé. » Le dessin du 433 était juste de proportions et **plat de
matière** : un aplat sur toute la caisse, un aplat sur tout le pavillon, deux vitres unies, deux
disques noirs. À côté d'un sol qui a reçu son granulat (434) et d'une eau qui a reçu sa
profondeur (435), le véhicule était devenu l'élément le plus pauvre de la ville.

Six ajouts, chacun répondant à une chose que l'œil cherche sur une voiture avant d'en chercher
une autre : le flanc est une **rampe** verticale et non un aplat · les **passages de roue** sont
creusés (c'est le trou d'ombre au-dessus du pneu qui dit « la roue est dans la carrosserie » ;
sans lui la voiture est posée SUR ses roues) · un **reflet de vitre** en diagonale (une vitre
unie est un trou, une vitre avec sa diagonale est du verre) · l'**ombre de dessous** entre les
roues, qui ancre au sol · l'**enseigne allumée**, ambre, **avec son halo peint sur le pavillon**
(une lampe qui n'éclaire rien est une boîte jaune) · les **clignotants ambre** et la trappe à
essence. Plus, sur la roue, un moyeu décentré vers la lumière et une arête de gomme éclairée.

⚠️ **FACE ET DOS PARTAGENT MAINTENANT LEUR OSSATURE.** Le 433 les écrivait deux fois avec les
mêmes cotes recopiées — le doublon du §8 — et **ils avaient déjà commencé à diverger** (la face
avait ses bas de caisse `Y2` aux deux angles, le dos non). Une carrosserie, et on n'y pose que
ce qui change.
⚠️ **LE DAMIER EST PASSÉ DE TROIS RANGÉES À DEUX, ET C'EST MESURÉ, PAS DÉCIDÉ.** La caisse ne
fait que sept rangées entre la ceinture et le bas de caisse ; à trois, il en mangeait 43 % et il
ne restait plus que deux rangées de jaune en dessous — la voiture portait une jupe sombre.
⚠️ **Le passage de roue reste SOUS le damier**, par contrainte de place : le pneu monte déjà
jusqu'à la rangée 15. Plus grand, il traversait la bande — vu au banc, ça faisait deux bosses
jaunes au milieu des carreaux.
⚠️ **Rien n'a bougé des trois lignes** (toit 4 / ceinture 11 / bas de caisse 18) ni de la ligne
de sol à 23 : `render-taxi.mjs` échoue si l'une d'elles diverge, et il a raison — cinq vues
doivent décrire le même véhicule.

### 4. Les deux trouvailles de l'audit

- ⚠️⚠️ **LES LAMPADAIRES DE LA GRANDE ARTÈRE N'ÉCLAIRAIENT QU'UN TROTTOIR.** Depuis
  l'élargissement du 434, la plus grande rue de la ville fait QUATRE cases et sa rangée de
  poteaux était toute entière sur le bord nord. Sur une rue de deux, une rangée unique passe
  pour de l'éclairage central ; sur une rue de quatre, elle se lit pour ce qu'elle est — une
  moitié d'avenue dans le noir et une file de poteaux qui souligne le trottoir nord comme une
  clôture. C'est le corollaire exact de la note du 434 : les DEUX bords sont dérivés, pas
  seulement l'un. **Ils alternent maintenant d'un trottoir à l'autre — on alterne, on ne double
  pas** : deux rangées en vis-à-vis coûteraient quarante props et donneraient une allée de
  cimetière monumentale.
- ⚠️ **LA PELOUSE DES PARTERRES ÉTAIT UN TISSU À RAYURES.** La tonte se dessinait `x % 2`,
  c'est-à-dire une bande PAR CASE : période 32 px, bandes toutes de la même largeur, toutes
  alignées sur la grille. Ce qui fait une pelouse tondue, c'est **la largeur de la tondeuse** et
  le fait qu'elle passe en aller-retour : bandes de trois cases (≈ 1,2 m à l'échelle du jeu),
  alternées, avec un liseré à la jointure des deux passages. La bande se calcule sur la
  coordonnée MONDE, jamais sur la case du parterre — sinon chaque massif a sa propre rayure et
  on lit un patchwork.

### Ce que ça ne fait pas

- **le lac du sud garde sa forme.** Il a le dessin (berge, profondeur, écume, reflets, et
  maintenant le tramage et les nénuphars), pas la géométrie : son rivage nord reste `sin(x)` et
  ses trois autres bords les coupes droites du rectangle. C'était déjà le prochain chantier au
  435, et il l'est toujours — la promenade, le ponton, les bancs et les lampadaires sont tous
  accrochés à `shore(x)` ;
- **la ferme n'est touchée par rien de tout ça.** Ses chemins restent sur la tuile unique de
  16 px du zip 232, et **aucun banc ne regarde le sol de la ferme** ;
- **le taxi n'a toujours pas de conducteur visible, ni de passager.** Les vitres sont du verre,
  pas une cabine ;
- **aucun sprite n'est passé par Blender.** Proposé par Guillaume ; refusé pour la raison du §9
  de `CLAUDE.md` — à 16 px ce qu'on achèterait est l'éclairage, ces surfaces sont des motifs
  bouclants qu'un rendu ne sait pas fabriquer, et un PNG dans `fermeArt` ouvrirait un troisième
  pipeline. **La contrainte « tout en `fillRect` » n'est pas de l'ascèse : c'est ce qui rend les
  bancs possibles**, et ce zip vient de montrer ce que coûte un dessin qu'aucun banc ne voit.


---

## 20. ZIP 437 — LA RIVE, LE PARC, LES ARBRES

Demande de Guillaume, en trois morceaux et une phrase de méthode : « l'effet de profondeur des
lacs et étangs n'a pas vraiment de cohérence ou de réalisme si le rebord est toujours totalement
droit, tracé comme à la règle, **vérifie ton biais** » ; le parc « à redessiner pour le rendre
plus fleuri et intéressant, et à décaler un bloc plus loin car trop collé au centre » ; et « plus
de feuilles, et des formes différentes sans perdre l'identité générale » pour les arbres, sur le
modèle des essences d'une image de référence (sapin, saule, magnolia, mimosa, pommier). Plus une
contrainte de rendu : « net et bien détaillé, **pas d'effet blur ou sale** ».

### ⚠️⚠️ LE BIAIS ÉTAIT ÉCRIT DANS LE DÉPÔT, EN TOUTES LETTRES, DEPUIS DEUX ZIPS

Le 435 avait corrigé l'étang du parc et **nommé** le défaut du lac du sud dans le même
commentaire : *« son rivage est `sin(x)`, donc une FONCTION DE x, donc incapable de revenir sur
elle-même — 75 colonnes plates sur 95 »*. Le 436 a refait la pierre et a écrit noir sur blanc,
dans « ce que ça ne fait pas », que **le lac gardait sa forme**. Deux zips ont donc mesuré le
défaut, l'ont documenté, et sont passés à côté.

> **Un défaut mesuré et laissé en place revient toujours, et il revient par la bouche de
> Guillaume.** La ligne « ce que ça ne fait pas » n'est pas un aveu qui absout : c'est une dette
> datée. Le biais n'était pas de ne pas voir — c'était de croire qu'écrire suffisait.

### La rive : un CHAMP, plus une ligne

`shore(x)` rendait un `y` par colonne. Une telle courbe ne peut pas se replier : ni crique qui se
referme, ni langue de terre, ni îlot, et une pente bornée par l'amplitude de ses deux sinus. Elle
est remplacée par **l'isoligne d'un champ signé `s(x, y)`** (voir `TOWN_LAKE_*`) : dès que la
pente du bruit en `y` dépasse 1, l'isoligne se replie. Deux passes de lissage cellulaire — les
mêmes qu'au 435 pour l'étang, pour la même raison (un contour organique rastérisé sème des ergots
d'une case, qui se lisent comme des pixels oubliés).

⚠️ **ET LE QUAI RESTE DROIT, DÉLIBÉRÉMENT.** Un ouvrage maçonné EST droit — c'est ce qui le fait
lire comme un quai. Ce qui n'allait pas, c'est que la ville en avait posé **quatre-vingt-seize
cases**, donc pas une seule berge naturelle sur tout le lac. La pierre ne court plus qu'**autour
du ponton** (emprise dérivée de `TOWN_PIER`, raccord cubique sur sept cases), et les deux ailes
sont rendues à la nature : **sentier de gravier, blocs erratiques, roselières, saules, prairie
fleurie**. Mesuré par `render-parc.mjs`, hors quai : plus longue rive plate **24 → 4 colonnes**,
**10 criques profondes**, la rive parcourt **7 rangées**.

⚠️⚠️ **ET LA PROFONDEUR AUSSI ÉTAIT UN POCHOIR.** Un plateau de largeur constante dessine un
liseré pâle qui suit le rivage à distance fixe : corriger la forme de la rive sans corriger ça,
c'est remplacer un trait droit par un trait courbe et **garder le pochoir**. La largeur du
plateau est désormais modulée par un bruit lisse (`TOWN_SHELF_VAR`) — une anse s'ensable, un cap
plonge. Écart-type mesuré : **0,91 case** pour une moyenne de 4,4.

### Le parc : huit cases plus loin, et quatre couleurs

`TOWN_PARK` passe de x=108 à x=116. La place finit en x=107 : il n'y avait **pas une seule case**
entre le dallage de la place et la pelouse du parc, donc deux espaces publics qui se lisaient
comme un seul, immense et mou. ⚠️ **Et c'est la seule ligne qu'il a fallu toucher** :
`TOWN_POND` et `TOWN_KIOSK` sont désormais **dérivés** de `TOWN_PARK`. Avant, ils portaient leurs
coordonnées absolues — le paramètre qui en double un autre, et un déménagement du parc les aurait
laissés sur place, dans l'herbe, sans qu'aucune erreur ne le dise.

Ce qu'on y ajoute est de la **destination**, pas de la décoration : un tour d'étang qu'on peut
suivre (dérivé de l'eau déjà creusée, pas d'une ellipse écrite à la main), un **belvédère** dallé
avec deux bancs face à l'eau, **quatre parterres** d'espèces différentes — un par quadrant, pour
que le parc ait quatre coins distincts — et une frange de prairie fleurie sous les arbres du
pourtour. Le sol des allées passe de la terre battue du zip 232 au **gravier** (`TR_GRAVEL`).

⚠️ **LES MASSIFS SONT UNE COUCHE, PAS UN SOL NI UN DÉCOR** (`bloom`, comme `road` et `hedge`).
Un `G_*` de plus aurait rouvert les quarante tests `ground === G_PATH` du moteur ; deux cents
props auraient été deux cents objets à trier par ancrage à chaque image. Et la couche se peint en
avant-dernière passe : elle ne marque que ce qui est **encore** de la pelouse, donc une allée, un
kiosque ou une berge tracés entre-temps l'effacent tout seuls.

### Les arbres : un moule, onze essences

`oakTree` était trois `arc()` et douze pixels épars ; `pineTree`, quatre triangles. Onze essences
les remplacent **à Valley Town seulement** (la ferme n'est pas touchée — décision du 424 : ne pas
mêler deux changements visuels dans la même livraison), toutes cuites sur **un seul moule** qui
fixe la lumière et la matière ; la table ne décrit que ce qui distingue une essence : silhouette,
palette, floraison, port retombant.

⚠️ **L'ESSENCE SE DÉDUIT, ELLE NE SE DIFFUSE PAS ET NE SE STOCKE PAS.** Elle se lit dans ce que la
case a déjà — son objet (`O_TREE`/`O_TREE2`, donc collision et coupe **inchangées**), sa berge,
son quartier — plus un hachage pur. Un saule au bord de l'eau, un pommier au verger, un cyprès au
cimetière et sur la terrasse : les trois endroits où l'essence **dit** quelque chose.

⚠️ **CE QUI FAIT LE FEUILLAGE EST LE CROISSANT D'OMBRE.** Premier jet : des paquets de deux ou
trois pixels tirés au hasard — un coussin vert avec du grain dessus, c'est-à-dire exactement
l'effet « sale » que Guillaume avait exclu. Un houppier est un **empilement de masses** : des
disques de 2 à 4 px, chacun avec un arc plus sombre en dessous. Sans cet arc, trente disques
clairs se recollent en une seule tache.

### Ce que ça ne fait pas

- **la ferme n'est touchée par rien.** Ses chemins restent sur la tuile de 16 px du zip 232, ses
  arbres restent les deux ronds verts du 232, et **aucun banc ne regarde le sol de la ferme** ;
- **les trois autres bords du lac** (est, ouest, sud) restent les coupes droites du rectangle :
  seul le rivage NORD, celui qu'on longe, a été refait. Le sud touche le bas de la carte ;
- **rien ne flotte sur le lac.** Pas de barque, pas de canard, pas de pêcheur — le lac est un but
  de promenade, pas encore un lieu ;
- **le kiosque à musique n'a toujours aucun usage** : il a sa place, ses allées et son parvis, et
  c'est un rendez-vous daté qui manque (`CLAUDE.md` §13), pas un décor ;
- **aucun sprite n'est passé par Blender**, proposé par Guillaume, refusé pour la raison du §9 :
  à 32 px ce qu'on achèterait est l'éclairage, et un PNG dans `fermeArt` ouvrirait un troisième
  pipeline — c'est la contrainte « tout en `fillRect` » qui rend les bancs possibles.


---

## 21. ZIP 438 — LES ARBRES REFAITS (SECONDE FOIS), L'HERBE, ET L'HÔTEL DE VILLE

### ⚠️⚠️⚠️ « C'EST DÉGUEULASSE » — ET LE BANC DU 437 APPLAUDISSAIT

Verdict de Guillaume sur les arbres du 437 : « c'est dégueulasse […] on dirait une friche […] ton
rendu est vraiment sale ». Il avait raison, et la cause est nommable :

> Le 437 dessinait une SILHOUETTE (un masque elliptique lobé) puis la texturait par TIRAGES —
> trente disques, vingt-six pixels épars, un cerne. À 32 px, un semis de pixels de tons voisins ne
> fait pas de la matière : il fait du BRUIT. Et son banc mesurait le « grain » — le nombre de
> frontières de ton par pixel — **en le prenant pour de la qualité**. Le grain montait, la propreté
> baissait, et le banc applaudissait.

C'est le §10 de `CLAUDE.md` retourné : *un banc qui PASSE pendant que Guillaume voit un défaut ne
dit pas que la chose est bonne — il dit qu'on mesure autre chose.* Le contrôle a donc été
remplacé, et il a fallu **trois** rédactions pour trouver la bonne grandeur :

| version | ce qu'elle mesurait | pourquoi elle était fausse |
|---|---|---|
| 437 | le grain (frontières de ton / pixel) | récompensait le bruit |
| 438-a | le pixel isolé | accusait la pointe d'un rameau, le cœur d'une fleur — **elle interdisait le pixel art** |
| 438-b | les îlots de moins de 4 px | accusait les éclats d'un dégradé (20 % sur des dessins propres) |
| 438-c | **les îlots flottant dans un APLAT** (tout leur pourtour d'une seule couleur), en **huit** voisins | c'est exactement ce que l'œil appelle « sale » |

⚠️ La connexité à huit voisins n'est pas un détail : à quatre, un cerne d'un pixel qui descend en
diagonale est une suite de pixels qui ne se touchent que par les coins — le banc accusait le
contour lui-même, 45 « points perdus » sur un sapin impeccable.

Mesuré, ancien chêne **1,3 %** de points perdus, nouvelles essences **0 à 0,4 %**.

### Le procédé a changé : la silhouette n'est plus dessinée, elle est le RÉSULTAT

Un houppier est **l'union d'une dizaine de bouquets**, et chaque bouquet est une forme pleine,
cernée, ombrée en trois tons francs. Aucun pixel n'est tiré au hasard : tout ce qu'on voit est le
bord d'une forme. Trois conséquences :

1. le contour extérieur est festonné tout seul — plus d'harmoniques à régler ;
2. **chaque bouquet porte son propre arc d'ombre**, et c'est LUI qui détache une masse de la
   suivante. Sans cet arc, dix bouquets clairs se recollent en un coussin ;
3. les fleurs deviennent des fleurs — une croix de cinq pixels et un cœur — au lieu de confettis.

⚠️ **LE GABARIT PASSE DE 32×48 À 48×64**, et c'est la vraie raison de l'échec du 437 : à 32 px de
large, dix bouquets de six pixels ne tiennent pas, on ne pouvait dessiner que des ronds.

⚠️ **ET ILS BOUGENT.** Trois images par essence et par saison ; les bouquets HAUTS se décalent d'un
pixel, les bas ne bougent pas — un arbre plie par la cime. La phase vient du hachage de la case :
sans elle, les 856 arbres de la ville changent d'image à la même milliseconde et la ville bat comme
un cœur. Rien ne circule sur le réseau.

### Trois défauts trouvés par le banc, à la première passe

* la flèche du cyprès **sortait du canevas** par le haut et se faisait raboter (§4, le piège n°1) ;
* le liseré clair faisait **le tour** du houppier au lieu de son seul bord nord-ouest : l'arbre
  était détouré en vert vif. La cause : « si la case de gauche OU celle du dessus est vide, c'est
  le nord-ouest » — vrai d'à peu près tout le contour d'une forme ronde. On somme désormais les
  directions VIDES sur un disque de rayon 2 ;
* le bouleau sortait **en beignet** : huit bouquets sur un anneau étroit ne couvrent pas le centre.

### L'herbe : un pavé de 64 px, plus une tuile

« On dirait une friche » visait aussi le sol. L'herbe de la ville était trois tuiles de 16 px
tirées par `(x*37+y*17)%3` : sur un parc de 34 cases, un damier de trois motifs répété cinquante
fois. Elle passe au **pavé de 4×4 tuiles**, comme les revêtements (434), avec de larges **plaques**
de verts voisins qu'une tuile de 16 px ne peut pas porter.

⚠️ **ET LES TOUFFES SONT SUR UNE SUITE R2, PAS SUR DEUX SUITES D'OR.** Premier jet :
`x = frac(k·φ)`, `y = frac(k·φ²·7)`. Deux suites unidimensionnelles dont le rapport est presque
rationnel **alignent les points sur des droites** : la pelouse est sortie rayée verticalement d'un
bout à l'autre du parc, pire que la tuile qu'on remplaçait.

### Les massifs ont enfin de la terre et une bordure

Le 437 posait des fleurs SUR DU GAZON : c'est pourquoi le parc avait l'air d'une friche fleurie et
non d'un jardin. Ce qui dit « quelqu'un s'en occupe », ce n'est pas la fleur — c'est la **terre
retournée** dessous et la **pierre** qui la retient. Les deux se déduisent du voisinage (une case
dont les quatre voisines fleurissent est au cœur du massif), donc zéro octet de données en plus.
La prairie sauvage, elle, n'a ni l'une ni l'autre : une prairie n'a pas de bord.

### L'HÔTEL DE VILLE, second intérieur de Valley Town

⚠️⚠️ **IL EST DANS LA MÊME GRILLE QUE LE TRIBUNAL, ET C'EST LA DÉCISION STRUCTURANTE.** Deux voies
existaient : une ZONE de plus (`m.zone === "hall"`), ou deux NIVEAUX de plus dans la carte du
tribunal. La première demandait de retrouver les **vingt-cinq** endroits de `FermeGame.js` qui
testent `zone === "court"` — et en oublier un ne lève rien. La seconde ne coûte rien : la zone
reste « court », les vingt-cinq tests restent vrais, `courtFloorOf(y)` continue de dire où l'on
est, et **deux joueurs dans deux bâtiments différents ne peuvent pas se confondre puisque leurs
`y` diffèrent**. C'est le raisonnement du 426 (« les trois niveaux tiennent dans une seule grille,
le niveau se lit dans y ») étendu d'un bâtiment, sans un octet de réseau en plus.

**Le plan n'est pas celui du tribunal, et c'est le point.** Un palais de justice est un couloir
bordé de portes closes ; une mairie est un grand hall public. Les quatre pièces du rez-de-chaussée
ont donc **deux portes chacune** sur le hall, et l'étage n'en a qu'une par pièce — c'est ce
contraste qui fait lire « bâtiment public » plutôt que « niveau de jeu ». Huit pièces :

| niveau | pièces |
|---|---|
| rez-de-chaussée | 🗺️ cadastre · 💍 salle des mariages · 📈 **salle des cours** · 💁 accueil |
| étage | 🏛️ salle du conseil · 🎩 bureau du maire · 🗄️ archives municipales · 📐 bureau du géomètre |

Onze meubles neufs qu'on ne voit pas au tribunal : la **maquette de la ville** sous vitrine (le
point de fuite du hall — il fallait qu'on sache dans quel bâtiment on est avant de lire une
plaque), le plan mural du cadastre, les cartonniers à plans, le tableau des cours, la table ovale
du conseil, le globe, le pupitre, les urnes fleuries, le portrait officiel.

### 📈 LE TABLEAU DES COURS — le premier service public de Valley Town qui MARCHE

⚠️ Il ne coûte **ni schéma, ni réseau, ni état** : les cours sont une pure fonction du numéro de
jour (`E.marketRate`), donc identiques chez les deux joueurs par construction. C'est le patron déjà
écrit trois fois (jour de marché, jour de service de Carla, jour d'orage).

⚠️ **ET IL ANNONCE LES QUATRE PROCHAINS JOURS**, ce qui est tout l'intérêt. Le panneau du marché
dit déjà les cours du jour — mais on le lit une fois arrivé au marché, c'est-à-dire trop tard pour
décider ce qu'on charge. Un tableau qui dit « le poisson sera à +24 dans deux jours » transforme le
voyage en **décision**, et c'est la question ouverte du §13 de `CLAUDE.md` (« le voyage est-il
devenu une corvée ? ») prise par l'autre bout : on ne raccourcit pas le trajet, on donne une raison
de le planifier. Quatre jours et pas dix — au-delà on ne lit plus un tableau, on lit un tableur.

### Ce que ça ne fait pas

- **l'église n'a toujours pas d'intérieur**, et elle continue de le dire plutôt que de laisser
  croire à une porte cassée ;
- **le cadastre, l'état civil et le conseil sont des PIÈCES, pas des services.** Ils sont dessinés,
  meublés, nommés et décrits — le seul guichet qui rende quelque chose est la salle des cours ;
- **la ferme n'est toujours touchée par rien** : ses chemins ET ses arbres restent ceux du zip 232.
  L'écart de finition entre les deux cartes est maintenant frappant, et c'est assumé (décision du
  424) — mais c'est la dette la plus visible du projet ;
- **aucun résident n'entre dans les deux bâtiments.** Les intérieurs sont vides de monde.


---

## 22. ZIP 439 — L'AUDIT : LA SOURICIÈRE, LES DOUBLONS, L'ACCUEIL, LE PONT

### ⚠️⚠️⚠️ ON NE POUVAIT PAS RESSORTIR DE L'HÔTEL DE VILLE

`nearCourtExit()` testait `courtFloorOf(y) === 0` et le `COURT_ENTRY` du tribunal **en dur**.
Le rez-de-chaussée de la mairie est le niveau **3**, son seuil est à `y = 120` : le prédicat
était faux **partout dans le bâtiment**. Ni l'invite ni la touche E ne proposaient jamais de
sortir. On entrait, on restait.

⚠️ **Le seuil était décrit DEUX FOIS.** Le générateur avait été corrigé au 438 et son
commentaire prévient mot pour mot : « écrit `f === 0`, le test aurait donné un bâtiment dont on
ne peut plus ressortir, sans qu'aucune erreur ne le dise ». La seconde description, au niveau du
composant, ne l'a pas été. Le seuil se DÉDUIT désormais (`E.courtExitPos`), une fois.

⚠️ **Pourquoi personne ne l'a vu** : le menu développeur téléporte DANS le bâtiment. Qui teste
par le menu entre et sort par téléport — il ne pose jamais le pied sur le seuil. *Un raccourci
de test qui contourne la seule chose à tester ne teste rien.*

### ⚠️⚠️ LE 438 AVAIT EFFACÉ LA STATUE DE LA JUSTICE

L'escalier d'honneur de la mairie était ajouté au `doorGuard` **pour les cinq niveaux** au lieu
des deux qu'il relie. Il interdisait donc (22,4)-(23,4) au rez-de-chaussée du **tribunal**, où
la statue est posée depuis le 426. Mesuré en regénérant le monde avec et sans cette ligne :
**10 refus contre 5**, `justice` et `justice2` dans le lot.

⚠️ **Le refus parlait, personne n'écoutait.** `addProp` imprime chaque meuble refusé ;
`render-mairie.mjs` les comptait et les qualifiait d'« antérieurs » pour ne mesurer que la
mairie. *Un banc qui se donne un périmètre finit par exclure de sa mesure les dégâts qu'il cause
à côté.* Il échoue maintenant sur tout le bâtiment — **zéro refus**.

### LE PARTAGE DES DEUX BÂTIMENTS — la correction narrative

Quatre services étaient promis **deux fois**, mêmes emojis, mêmes descriptions : cadastre, état
civil, permis, archives. Et le seul annuaire de la ville était au tribunal, donc il envoyait
acheter sa parcelle au palais de justice — en face de la pièce « 🗺️ Cadastre » de la mairie.

**La mairie est ce qu'on DEMANDE, le tribunal ce qui se TRANCHE.**

| | mairie | tribunal |
|---|---|---|
| parcelles | 🗺️ cadastre — on choisit, on réserve | ✒️ notaire — on signe l'acte |
| unions | 💍 salle des mariages | — |
| construire | 📐 géomètre — instruit les permis | — |
| litiges | — | ⚖️ audience · 🤝 médiation · ⚖️ procureur · 📯 huissier |
| archives | 🗄️ de la ville | 🗄️ des audiences |

Les deux bâtiments ne se doublent plus, ils **s'enchaînent** — et cet enchaînement est la forme
même des « commissions » réclamées au §13 de `CLAUDE.md` : une course à deux étapes qui donne
une raison d'aller de l'un à l'autre. `landreg` / `permits` / `registry` sont devenus
`prosecutor` / `mediation` / `bailiff`. **La mairie a son propre annuaire** (`HALL_BOARD_ORDER`)
et `courtBoardOpen` porte désormais la clé du bâtiment, déduite du panneau qu'on lit.

### 💁 LÉONIE SARRAZIN, ACCUEIL — et la table de sujets

⚠️⚠️ **CE QUI EST LIVRÉ N'EST PAS UN DIALOGUE, C'EST `HALL_TOPICS`.** Une quête future = **une
ligne** : clé, emoji, panneau, et une garde `when` qui reçoit `{ day, mayor, residents, shared,
electionToday }`. Le panneau ne connaît aucun sujet : il parcourt la table. Un sujet à garde est
déjà là pour prouver que le mécanisme marche — « je viens voter » n'apparaît que le jour du
scrutin.

⚠️⚠️⚠️ **AUCUN SUJET NE DONNE QUOI QUE CE SOIT, ET C'EST LA RÈGLE DURE.** Un panneau s'ouvre à
volonté avec E, sans limite et sans arbitrage de l'hôte : le jour où un sujet rendrait de l'or,
une denrée ou un objet, il suffirait de marteler la touche. Tout ce qui est là est de
l'INFORMATION ou une DATE dérivée du numéro de jour. Une quête qui devra récompenser passera par
une `req` arbitrée par l'hôte, comme la vente au marché. **Le dialogue est la porte, jamais la
caisse.**

⚠️ Deux sujets sont des RENVOIS et non des réponses : « les cours » ouvre le tableau, « où se
trouve… » ouvre l'annuaire. Recopier leur contenu aurait fait deux affichages à tenir d'accord.

⚠️ Elle est un **prop**, pas un personnage : elle ne se déplace jamais. Lui donner une feuille de
poses, un état et une position à diffuser aurait été payer trois mécanismes pour quelqu'un qui
reste debout derrière un comptoir — et `res.zone` ne connaît de toute façon que « farm » et
« town ». Elle est posée **derrière** le guichet (`iy + 1`, le comptoir est en `iy + 2`) : un
guichet où l'agent est du côté du public ne se lit plus comme un guichet.

### 🗳️ LES ÉLECTIONS — pure fonction du jour, vivier FIXE

Mandat de **30 jours**. `mayorOf(day)`, `mayorBallot(day, residents)`, `mayorAudienceDay(day)` :
aucun état, aucun schéma, aucun octet sur le réseau — cinquième usage du patron (jour de marché,
service de Carla, jour d'orage, cours du marché).

⚠️⚠️⚠️ **LE VIVIER DE CANDIDATS EST FIXE, ET C'EST LA DÉCISION ANTI-EXPLOIT.** Tirer le maire dans
les résidents de la ferme aurait paru plus riche et aurait été une faille : accueillir ou
renvoyer quelqu'un aurait retiré le maire **en cours de mandat**, et un joueur mécontent n'aurait
eu qu'à faire tourner sa population. Pire, une élection passée aurait changé rétroactivement.

⚠️⚠️ **Les résidents votent quand même, et leurs voix comptent** — mais l'écart entre le premier
et le second est **construit pour dépasser `MAX_RESIDENTS`**. On voit pour qui ses gens ont voté,
c'est vrai à l'écran, et ça ne peut pas renverser le scrutin. Mesuré par `verify-vallee` sur
2 145 bulletins × cinq compositions : **0 renversement**, écart minimal **14 voix**, 16 302
bulletins de résidents dépouillés. Le jour où une quête de campagne devra donner du poids au
joueur, il suffira de lui faire franchir cet écart : **le mécanisme est déjà là.**

⚠️ Le bulletin d'un résident tient à son `rid`, pas à sa place dans la liste : trier la liste ne
change pas le dépouillement (contrôlé). Et `mayorBallot` **appelle** `mayorOf` au lieu de
recalculer le vainqueur — sinon un départage d'égalité différent aurait affiché un maire dans le
panneau et un autre sous le portrait.

⚠️ **Le maire élu est écrit vivant sous son portrait officiel**, dans son bureau (`fillText` au
rendu, jamais cuit dans le sprite — §15). Un scrutin dont le résultat n'existe que dans un
panneau de menu n'est pas un événement du monde, c'est une page de menu.

### 🌉 LE PONT SE FRANCHIT PAR-DESSUS

L'ouvrage est un sprite de 81×54 posé comme un décor à une case, **ancré deux rangées sous le
tablier** : sur la rangée nord, la clé de tri du passant était plus petite que la sienne — il se
dessinait derrière et disparaissait dedans ; sur la rangée sud les deux clés étaient égales et
l'ordre dépendait de l'ordre d'insertion (§15).

Trois corrections, et la première est la seule qui compte :

1. **le tablier MONTE** — `E.townArchRise(tw)`, une COUCHE dérivée des props (règle du 434 : pas
   un `G_BRIDGE_ARCH` de plus, qui aurait rouvert tous les tests `ground === G_BRIDGE`). Profil
   `0 · ¼ · ¾ · 1 · ¾ · ¼ · 0`, flèche 7 px, retombant à zéro aux deux têtes ;
2. **le sprite se coupe en deux** (`TOWN_BRIDGE_SPLIT_Y = 38`) : garde-corps du fond derrière le
   passant, main courante du devant par-dessus. Le personnage passe **entre les deux** ;
3. **il descend d'une case** (`TOWN_BRIDGE_DROP_PX = 16`) — mesure lue sur la planche, pas
   devinée : la bande de tablier du dessin tombait une case au-dessus des rangées praticables.
   *Il n'existait aucune hauteur qui soit à la fois praticable et dessinée* — d'où « on le
   traverse ».

⚠️⚠️ **ET L'ARC NE TOUCHE PAS LA COLLISION.** Passé dans `playerElevTown`, il aurait été trois
lignes plus court et aurait rendu les deux ponts **infranchissables** : cette fonction sert aussi
à `canStandTown`, qui refuse tout pas au-delà de `TOWN_STEP_MAX`. On aurait livré un mur en
croyant dessiner une bosse, et le symptôme n'aurait ressemblé en rien à sa cause. `drawElevTown`
porte « draw » dans son nom, et le banc tient les deux moitiés séparément.

### 🕊️ LES PIGEONS — une contradiction géométrique, pas un réglage nerveux

Les miettes tombaient à **1,9 case** devant le banc ; le rayon d'envol valait **2,3**. *Le pain
atterrissait dans le rayon d'envol* : on appelait les oiseaux à un endroit d'où l'on garantissait
qu'ils repartiraient, quel que soit le réglage. Les deux nombres sont justes séparément, c'est
leur ORDRE qui était faux — et rien ne les comparait. (Même famille que la rangée d'étals du
433 : l'élément est impeccable, c'est son rapport à un autre qui ne l'est pas.)

Chaque menace porte maintenant **ses** rayons. Assis : **0,7 / 1,2**. Debout : 2,3 / 4,2. Les
miettes partent à **2,2** et aucune ne tombe à moins de **1,5** (on borne la queue du tirage, on
ne recentre pas). Les trois nombres se lisent ensemble : `0,7 < 1,2 < 1,5 < 2,2` — l'alerte assise
doit être plus courte que la miette la plus proche, sinon ils arrivent au pain et se **figent**
au lieu de picorer.

⚠️ **Se lever ne coûte pas une ligne** : les rayons reprennent leur taille et tout ce qui s'était
approché se retrouve dedans. La bouffée tombe du modèle. Mesuré : **13 pigeons au pain assis, 10
départs sur 14 en deux secondes** en se levant.

⚠️ L'assise d'un joueur DISTANT se lit dans `p.sit` — le champ qui voyage depuis le 428 et que
personne ne lisait avant le 436. Sans lui, un camarade assis à côté ferait fuir vos pigeons.

⚠️ Le banc du 433 jetait du pain avec `threats: []`, **sans personne sur le banc**. Il mesurait la
moitié de la scène qui marche, et il passait au vert pendant que Guillaume voyait le défaut.

### LES SOLS DES INTÉRIEURS SORTENT DE LA CLOSURE

Parquet, marbre, tapis et dalle brute vivaient dans `drawCourtFrame` : aucun banc ne pouvait les
appeler, donc ils sont restés au niveau du **426** pendant que les rues (434), l'eau (435), la
pierre (436) et l'herbe (438) montaient toutes. *L'écart n'était pas un écart de soin, c'était un
écart de date, et il se lisait sur une carte du dépôt.* Ils sont dans `fermeArt.js`
(`drawCourtWoodTile` & co.) et `render-mairie` les **appelle**.

- **le parquet** : lames de 44 px (premier avec 16) qui **traversent les cases**, abouts décalés
  d'une rangée à l'autre. Avant : quatre lames dans chaque case, donc des abouts alignés tous les
  16 px sur toute la pièce — l'œil voyait la grille avant le bois ;
- **l'écart de ton entre deux lames est étroit**, délibérément : le premier jet, à six tons bien
  séparés, donnait un velours côtelé. *Ce qui fait la matière n'est pas le contraste, c'est la
  forme* (leçon des arbres du 438) ;
- **le marbre** en dalles de deux cases, veines calculées dans le repère de la dalle et découpées
  à la case — elles traversent les joints ;
- **la dalle du sous-sol** a un calepinage irrégulier (une pierre sur trois est longue) : c'est
  l'irrégularité qui dit « cave », un damier régulier dit « carrelage ».

⚠️ Première exécution du banc : **un tapis en tartan**, parce qu'il passait un `y` LOCAL là où le
jeu passe un `y` absolu — `isCarpet` répondait « non » partout et la bordure cernait chaque case.
Le jeu était juste. *Un banc qui repeint ne juge pas le jeu, il juge sa propre maquette ; un banc
qui appelle peut encore se tromper d'unité.*

### LES DEUX COULOIRS ÉTAIENT LE MÊME COULOIR

Le bloc de colonnade tournait pour les cinq niveaux **sans une seule condition** : la mairie et le
tribunal avaient rigoureusement le même rythme de cinq et les mêmes bancs adossés — la seule chose
que le joueur voit pendant vingt-huit cases de marche. ⚠️ *Ce qui sépare un hall d'un couloir n'est
pas son mobilier, c'est son vide.* Le tribunal serre ses colonnes ; la mairie dégage son milieu et
y pose un **tapis d'honneur** (4 cases au rez-de-chaussée, 2 à l'étage), colonnes espacées de
sept, urnes au lieu de bancs. Trois lectures, un seul bloc de code.

Et la **maquette de la ville** était posée **deux fois**, de part et d'autre d'un trou de deux
cases — l'axe de la porte, sur lequel le commentaire jurait qu'elle était centrée, tombait dans le
trou. Elle est unique et à l'ENTRÉE : son travail est de dire dans quel bâtiment on vient d'entrer
avant qu'on ait lu une plaque, et à vingt cases de la porte elle ne pouvait pas le faire.

### TROIS CULS-DE-SAC D'UNE CASE, TROUVÉS PAR LE BANC ET PAR LUI SEUL

Deux dans le hall de la mairie, un dans la salle des mariages. Toujours la même cause : **meubler
le long d'un mur fabrique des poches** (mur d'un côté, banc au nord, colonne au sud, maquette à
l'est). Aucune ne se voit sur une planche, aucune ne se voit en jouant sans y tomber. Les bancs
d'attente sont désormais à **une case du mur**, et les colonnes d'urnes s'arrêtent deux rangées
avant l'angle.

⚠️ Et `place()` remplace `addProp()` pour tout ce qui est décoratif : on **décale** d'une case au
lieu de renoncer. Une colonne manquante dans une colonnade se voit (le rythme casse) ; une colonne
décalée d'une case ne se voit pas. Le refus reste une ERREUR pour tout ce qui est structurel.

### LE CONTRÔLE DE DENSITÉ REMPLACE LE COMPTAGE

Le bureau du géomètre — dix-sept cases sur treize, la plus grande pièce des deux bâtiments —
sortait avec **huit props** et passait « meublé » parce que le seuil était `n < 6`. À côté des
quatre-vingts des archives : un rapport de dix à un, et un contrôle au vert. *Un seuil absolu sur
une grandeur qui dépend de la taille de la pièce est faux dès que les pièces n'ont pas la même
taille* — c'est le seuil du taxi au 434, transposé au mobilier. On mesure des **meubles pour cent
cases**, minimum 8. Il a immédiatement attrapé la salle des mariages à 6 %.

Le géomètre a son propre `kind` (planche à dessin inclinée, cartonniers, plan mural) ; le bureau
du maire a enfin le **fauteuil** que sa description promettait depuis le 438 ; la table du conseil
est un vrai ovale (isoligne d'ellipse, chaises posées sur le contour — leçon des rives du 437).

### Ce que ça ne fait pas

- **aucun résident n'entre encore dans les deux bâtiments** : `res.zone` ne connaît que « farm »
  et « town ». Léonie est un décor qui parle, pas une habitante ;
- **le cadastre, l'état civil, le conseil, le géomètre et les quatre métiers du tribunal restent
  des PIÈCES, pas des services.** Les guichets ouverts sont la salle des cours et l'accueil ;
- **on ne peut pas encore se marier ni acheter de parcelle** — les deux sujets répondent, et ils
  disent où ça se passera ;
- **la ferme n'est toujours touchée par rien** : ses chemins et ses arbres restent ceux du 232 ;
- **rien de tout ça n'a été joué à deux.** `tools/fake-supabase.mjs` existe depuis le 432 et la
  ferme peuplée n'a toujours pas été passée au même crible.
