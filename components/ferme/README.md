# Valley Town, le tribunal, et la vie qui s'y passe — état au 428

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
- **le marché, les commissions et les rendez-vous datés sont décidés mais pas construits**
  (zip 428, décision de Guillaume). Le socle sur lequel ils reposeront — navigation, endroits
  de vie, assise — est en place et mesuré.

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

**`E.townSpots(tw)` — 127 endroits, tous DÉRIVÉS de la carte**, jamais d'une table écrite à
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
