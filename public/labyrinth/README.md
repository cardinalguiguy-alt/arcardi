# Le Labyrinthe — mini-jeu du Pays du Labyrinthe (zips 393-394)

> **ZIP 394 — REFONTE SUR RETOUR DE GUILLAUME.** Trois reproches, tous fondés :
> le labyrinthe était trop étroit, les contrôles étaient **inversés**, et les
> graphismes n'étaient pas à la hauteur. Il a joint deux captures données comme
> cibles littérales (« prends exactement les mêmes thématiques, tu peux copier
> littéralement c'est mes images »). Voir la section « Zip 394 » en fin de
> fichier pour le détail de ce qui a changé et pourquoi.

Jeu 3D à la troisième personne, servi depuis `public/labyrinth/`, au bout du
**pont de haies**. Troisième mini-jeu du projet, après le défi de fuite
(`public/templerun/`) et le Gourmandin (`public/candyland/`).

On descend dans un dédale de pierre **posé sur le lac violet**, une torche à la
main. Elle se consume. On cherche une épée, on affronte des rôdeurs, on fuit
quelque chose qu'on ne peut pas tuer, on évite les dalles qui cèdent, et on
ressort au nord — sur la carte du monde sombre, au pied du pont.

---

## Les cinq décisions de Guillaume, prises avant la première ligne

| Question | Réponse |
|---|---|
| Combat | **Torche + épée trouvée dans le labyrinthe** |
| Torche | **Elle se consume si on ne la ravive pas** *(hors des options proposées)* |
| Dangers | **Trous dans le sol sur le lac violet** + **un traqueur unique qui te cherche** |
| Enjeu | **Comme le défi de fuite** : mort → blessé 10 min, butin gardé ; sortie → or |

**Conséquence signalée et assumée : on commence désarmé.** Le générateur borne
cette période par deux garanties dures, pas par une probabilité — l'épée est
posée à `SWORD_MAX_DEPTH` cellules au plus de l'entrée, et les rôdeurs n'entrent
jamais dans le **parvis** (les cellules à `SWORD_MAX_DEPTH + SANCTUARY_MARGIN`
de l'entrée). Le traqueur, lui, ignore le parvis : **on peut y souffler, jamais
s'y cacher.**

### Deux ajouts non demandés, pris seuls après mesure

**1. Le phare de la sortie.** Une colonne de lumière violette qui monte du lac
par la porte nord, plus haute que les murs, visible de partout. Sans elle, le
joueur oracle ne terminait **aucune** partie en huit minutes : il avait parcouru
dix fois la longueur du chemin optimal en tournant en rond. Le phare donne une
**direction**, jamais un chemin — savoir que la sortie est au nord-est ne dit
rien des trois murs qui séparent.

**2. Le noir n'est pas une cachette.** Torche éteinte, le traqueur sait
exactement où vous êtes et va plus vite que votre course. Sans cette règle, la
simulation avait trouvé la stratégie optimale : laisser mourir sa torche et
s'asseoir — la vue du traqueur étant proportionnelle à la flamme, on devenait
littéralement introuvable. La ressource la plus précieuse du jeu était devenue
quelque chose qu'on avait intérêt à gaspiller.

---

## Commandes

| Touche | Effet |
|---|---|
| **↑ ↓** ou **W S** | avancer, reculer |
| **← →** | **tourner** |
| **A / E** (ou Q / D) | pas de côté |
| **Maj** | courir — **bruyant**, et la flamme brûle deux fois plus vite |
| **Espace** | coup d'épée (il faut d'abord la trouver) |
| **F** | raviver la torche à un brasier |
| **Échap** | pause |

AZERTY et QWERTY fonctionnent : le test porte sur `e.code` (touche physique) et
non `e.key`, comme pour le menu développeur du zip 392.

**Abandonner en cours de partie compte comme un échec**, comme au défi de fuite
(`RUN_ABORT_COUNTS_AS_LOSS`) : sans ça, il suffirait d'appuyer sur Échap dès
qu'on est en danger. Ressortir depuis l'écran-titre est gratuit.

---

## L'architecture, et pourquoi elle n'est pas celle du défi de fuite

| Fichier | Rôle |
|---|---|
| `js/config.js` | **tous** les réglages + la palette (recopiée du défi) |
| `js/maze.js` | génération du dédale, trous, brasiers, épée — **pur**, sans DOM |
| `js/rules.js` | **toute la simulation** : collision, torche, combat, créatures — **pur** |
| `js/paint.js` | les textures, peintes sur canvas — ne connaît pas Three.js |
| `js/world.js` | tout Three.js. **Ne décide de rien**, il lit `rules.js` |
| `js/input.js` | clavier et tactile → **intentions** |
| `js/ui.js` | écrans, jauges, langue, record |
| `js/game.js` | machine à états et boucle, **au pas fixe 1/60** |
| `js/bridge.js` | dialogue postMessage avec la ferme |
| `js/strings.js` | textes FR/EN |

Dans `templerun`, `player.js`/`wolves.js`/`track.js` parlent chacun un peu à
`world.js`, et chaque outil de vérification a dû se reconstruire un bout de
jeu — d'où le **corollaire n°5 du zip 387** : « un contrôle qui s'écarte du
moteur mesure son propre écart, pas le jeu ». Ici le problème est pris à la
racine : **tout ce qui a une conséquence est dans `rules.js`**, et le rendu
n'est qu'un lecteur.

La conséquence est considérable : `tools/simulate-maze.mjs` ne simule rien,
il **JOUE**. Il appelle `Rules.step()` image par image, avec les mêmes nombres
que le navigateur. Et `World.buildWalls()` ne recalcule pas la géométrie : il
parcourt `Rules.buildBoxes()`, c'est-à-dire exactement la liste qui arrête le
joueur. **Un mur visible qu'on traverse est impossible par construction.**

### Le pas fixe n'est pas un détail

Toute la vérification joue à 1/60. Laisser le navigateur imposer un `dt`
variable ferait diverger le jeu de l'outil qui le mesure, c'est-à-dire rendrait
faux **tout** ce qui a été réglé.

---

## Vérification — huit scripts, à relancer TOUS à chaque livraison

Un outil qu'on saute n'est pas un filet de sécurité, c'est un fichier mort
(leçon du zip 375).

```
node tools/verify-maze.mjs 2000    # les six garanties du générateur
node tools/verify-controls.mjs     # les commandes vont-elles dans le bon sens ? (394)
node tools/verify-palette.mjs      # la palette n'a pas dérivé de celle du défi
node tools/smoke-render.mjs        # world.js EXÉCUTÉ contre un faux Three.js
node tools/check-strings.mjs       # parité FR/EN + ui.js exécuté contre un faux DOM
node tools/batch-maze.mjs 1 60 300 > parties.jsonl   # 60 parties JOUÉES
node tools/report-maze.mjs parties.jsonl             # ce qu'elles disent
node tools/simulate-maze.mjs 60    # le même rapport, d'un bloc
```

`batch-maze.mjs` existe parce qu'une campagne de plusieurs centaines de parties
dépasse le temps d'une commande, et **un outil qu'on ne peut pas lancer d'un
bloc doit pouvoir être lancé en morceaux** — sinon il n'est lancé qu'une fois.

### Sorties attendues

| Script | Attendu |
|---|---|
| `verify-maze` | 2 000 dédales, **6 garanties**, chemin 32..56, écart max sans brasier **7** (plafond 8), épée 5..6, 1,13 essai |
| `verify-controls` | **10 contrôles**, dont demi-tour en 1,17 s |
| `verify-palette` | **36 couleurs communes identiques au bit près**, 17 propres au labyrinthe |
| `smoke-render` | 4 graines × 300 images, **~2 250 maillages** (plafond 6 000) |
| `check-strings` | **41 = 41**, 16 identifiants |

### Les six garanties de `verify-maze.mjs`

Il ne relit aucune constante : il refait les parcours en largeur qui décident
si le jeu est jouable.

1. **la sortie est atteignable**, tous les trous ouverts posés ;
2. **elle l'est encore si TOUTES les dalles fêlées sont tombées** — sinon on
   peut s'enfermer sans avoir fait d'erreur ;
3. le chemin tient dans `[MAZE_MIN_PATH, MAZE_MAX_PATH]` ;
4. **jamais plus de `TORCH_MAX_GAP` cellules sans brasier** sur le chemin ;
5. l'épée existe, elle est dans le parvis, et **aucun rôdeur n'est posé avant** ;
6. rien n'est posé dans une cellule murée.

---

## ⚠️ Ce que la simulation a trouvé, et que personne n'aurait vu en relisant

**Douze défauts, tous dans du code dont chaque ligne prise séparément est juste.**

| # | Défaut | Comment il se manifestait |
|---|---|---|
| 1 | `CRACK_DELAY_MS` à 620 ms | Traverser une cellule prend 833 ms **en marchant** : toutes les dalles fêlées étaient mortelles, sans faute et sans recours. **67 %** des parties finissaient dans le lac. |
| 2 | Portées **euclidiennes** | L'épée traversait les murs, et une créature bloquée derrière une cloison comptait « au contact ». Dans un décor fait de cloisons. → `canTouch()` |
| 3 | Rôdeurs repathés **à chaque image** | Une créature qui se re-décide 60 fois par seconde suit au pixel et ne peut pas être semée. |
| 4 | Le parvis s'arrêtait **pile** à l'épée | Trois morts sur quatre survenaient **avant** le ramassage, en moins de 50 s. → `SANCTUARY_MARGIN` |
| 5 | Flamme éteinte = **invisible** | La stratégie optimale était de gaspiller sa torche et de s'asseoir. → le traqueur omniscient dans le noir |
| 6 | `TORCH_USE_RANGE` à 2,6 | Une couronne où l'on voit le brasier, où l'on est devant, et où la touche ne fait rien. |
| 7 | Garantie `TORCH_MAX_GAP` **fausse** | Quand la cellule visée était percée, le brasier était **sauté** : 16 cellules sans feu pour un plafond de 11. |
| 8 | `World.init()` **cumulait** | Les collections du module n'étaient pas remises à zéro : **la deuxième partie plantait**. Celle qu'on joue toujours. |
| 9 | `STALK_STAGGER_MS` à 2 600 | Essai **annulé** : le raisonnement était bon, la mesure l'a démenti (sortie 14,4 % → 7,7 %). Un recul plus long rend l'affrontement payant, donc on s'arrête, donc on brûle sa flamme. |
| **10** | **La sortie ne se déclenchait pas** *(394)* | Il fallait avoir dépassé le premier dixième de la cellule de sortie. On arrivait sous le phare, on s'arrêtait au milieu de la porte, rien. **Ce seul correctif a fait passer le taux de sortie de 10 % à 71 %.** |
| **11** | **Les contrôles inversés** *(394, trouvé par Guillaume)* | Flèche droite = rotation à gauche. **Aucun outil ne pouvait le voir** : l'oracle partage la convention du moteur, donc il tournait « juste » dans un monde inversé. → `verify-controls.mjs` |
| **12** | Le lissage de caméra en `0,016` **en dur** *(394)* | Suivait deux fois trop vite à 120 Hz, deux fois trop lentement à 30 Hz. Invisible sur un écran à 60 Hz. |

Le neuvième mérite d'être gardé en tête : **un réglage qui paraît évident peut
mesurablement empirer le jeu.** Il est commenté dans `config.js` pour que
personne ne le « corrige » à nouveau.

---

## L'équilibrage, au zip 394

Dernière mesure, **194 parties jouées image par image** :

| Issue | Part |
|---|---|
| **SORTIE** | **68,6 %** |
| temps écoulé (260 s) | 17,0 % |
| chute dans un trou | 9,8 % |
| LE TRAQUEUR | 3,1 % |
| blocage de l'oracle | 1,0 % |
| rôdeur | 0,5 % |

Durée d'une partie gagnée : **médiane 103 s**, p75 132 s, max 222 s.

C'est l'inverse exact du 393, où l'oracle sortait dans 11 % des cas et où 22 %
des parties étaient des **pannes de navigation**. La bascule ne vient pas d'un
rééquilibrage patient mais d'**un seul défaut**, trouvé en traçant une partie
bloquée (voir le tableau du 394, ligne 4) : la victoire exigeait d'avoir
dépassé le premier dixième de la cellule de sortie. L'oracle arrivait sous le
phare, s'arrêtait au milieu de la porte, et n'en repartait jamais.

**Ce que ça veut dire pour un humain** : l'oracle ne panique pas et n'oublie
jamais un brasier, donc un joueur mourra plus souvent — sans doute 25 à 35 %
au lieu de 13,4 %. C'est le niveau demandé (« ça doit pas être trop
difficile »). Trois leviers si c'est encore trop facile ou trop dur :
`HEARTS` (6), `ROAMER_COUNT` (4), `GAP_COUNT` (7).

**Ce qu'aucun outil ne peut dire, et qui reste l'objet du chantier : est-ce que
c'est angoissant, et est-ce que c'est beau ?** Ça se juge à l'écran.

## Y jouer seul, pour itérer

Double-cliquer sur **`index.html`**. Pas de build, pas de serveur. Le jeu
détecte qu'il n'est pas embarqué : français, record en `localStorage`, aucune
conséquence.

> **Une dépendance externe** : `three.js` (r128, la **même version** que le défi
> de fuite) vient du CDN cdnjs, donc accès internet au premier chargement.
> Chargé DANS l'iframe, jamais dans le bundle Next : rien à ajouter à
> `package.json`, et un CDN muet ne casse que le labyrinthe.

---

## Protocole avec la ferme

```
ferme -> labyrinthe : { type:"vf-lab-init", lang, best,
                        skin:{ gender, shirt, pants, hair, skin } }
labyrinthe -> ferme : { type:"vf-lab-ready" }
                      { type:"vf-lab-over", score, shards, cause }
                      { type:"vf-lab-won",  score, shards }
                      { type:"vf-lab-exit" }
```

`vf-lab-over` part quand le joueur **ferme** l'écran de fin : il doit pouvoir
lire son score avant que la ferme enchaîne son fondu au noir. `vf-lab-won` obéit
à la règle **inverse** — il part à la fin du fondu, sans écran intermédiaire.
Sortir d'un labyrinthe est un soulagement, pas un bilan. Même arbitrage que
`vf-run-escape` au zip 377.

Les deux côtés vérifient `event.origin`.

---

## Ce qui reste à faire

- **L'équilibrage** (voir ci-dessus) — le vrai chantier ouvert.
- **Le dernier défaut de navigation de l'oracle**, qui fausse 22,5 % des mesures.
- **Le son.** Rien. C'est la plus grosse perte du chantier : un traqueur qu'on
  ENTEND respirer vaut trois fois un traqueur qu'on voit. Le voile rouge du HUD
  n'est qu'un pis-aller assumé.
- **Le traqueur est une boîte à yeux rouges.** Sa silhouette se reconnaît, ce
  qui suffit, mais c'est un placeholder — même dette que les loups du défi.
- **`tools/render-maze.mjs`** : écrire les textures de `paint.js` en PNG, pour
  les REGARDER. `paint.js` a été écrit sans dépendance à Three.js **exactement**
  pour ça, mais le rasteriseur n'est toujours pas fait. **Aucune texture de ce
  jeu n'a encore été regardée hors du navigateur** — et le projet compte seize
  défauts trouvés en regardant contre zéro en relisant. C'est, de loin, la
  dette la plus coûteuse de ce chantier : les deux refontes graphiques (393
  puis 394) ont été faites en aveugle.
- **Le joystick tactile.** Le labyrinthe a ses propres commandes tactiles, mais
  elles ne touchent pas `FermeGame.js` : **la dette du zip 387 reste entière.**


---

## ZIP 394 — CE QUI A CHANGÉ, ET POURQUOI

### 1. L'échelle : tout a triplé

> « j'imaginais pas un labyrinthe aussi étroit »

| | 393 | 394 |
|---|---|---|
| couloir | 4,8 unités (2,8 fermiers) | **9,5 unités (5,3 fermiers)** |
| hauteur de mur | 5,2 | **11,0** |
| grille | 21 × 21 = 441 cellules | **15 × 15 = 225** |
| monde | 126 unités de côté | **173** |
| brouillard | se referme à 27 | **85** |

La grille RÉTRÉCIT pendant que le monde GRANDIT : c'est l'échange demandé —
plus impressionnant, moins de décisions, donc moins difficile.

### 2. Les contrôles étaient inversés. Il avait raison.

Flèche droite faisait tourner à gauche. La démonstration tient en une ligne :
le vecteur avant vaut `(-sin a, -cos a)`, donc sa dérivée en `a` vaut
`(-cos a, sin a)`, soit `(-1, 0)` face au nord — faire croître l'angle emmenait
le regard vers l'ouest.

**Aucun des sept outils ne pouvait le voir**, et c'est le point à retenir : le
joueur oracle calcule son intention de rotation **à partir de la même
convention** que le moteur. Dans un monde inversé, il tournait « juste » et
arrivait à destination. Il mesurait la cohérence du code avec lui-même.

> **La leçon, à ajouter à celles du projet : un contrôle qui partage la
> CONVENTION du code qu'il vérifie ne vérifie rien.** D'où
> `tools/verify-controls.mjs`, qui ne relit aucune formule et pose la question
> en français : « la flèche droite fait-elle tourner à droite ? »

### 3. « Pas très très fluide » — trois causes distinctes

- la rotation passait de 0 à 3,4 rad/s **en une image** → `TURN_ACCEL` ;
- le lissage de caméra multipliait par `0,016` **en dur**, donc suivait deux
  fois trop vite à 120 Hz et deux fois trop lentement à 30 Hz ;
- la vitesse de rotation était trop élevée pour la nouvelle échelle.

### 4. Le défaut qui expliquait tout le reste

La victoire exigeait d'avoir dépassé `exit.y·CELL + HALF·0,4`, c'est-à-dire
d'avoir avancé de trois pas de plus **après** être entré sous le phare. Un
joueur qui arrive à la porte et ne voit rien se passer conclut que ce n'est pas
la sortie. Corrigé : entrer dans la cellule suffit. **À lui seul, ce correctif a
fait passer le taux de sortie de 10 % à 71 %.**

### 5. Les graphismes, repris sur ses deux images

Six ajouts, tous relevés sur les captures :

1. **un ciel** — violet, avec pyramides et arbres morts en silhouette. Il n'y
   en avait aucun : au-dessus des murs, il n'y avait que du brouillard noir ;
2. **des torches murales sur potence**, partout (une face fermée sur trois).
   C'est l'élément le plus présent des deux images et il n'existait pas ;
3. **des poutres et un plafond partiel**, avec des ouvertures déchiquetées sur
   le ciel — l'image 2 ;
4. **des trous déchiquetés**, faits de sous-dalles retirées une à une selon un
   rayon bruité, au lieu d'une case carrée manquante ;
5. **un lac lumineux** qui tourne au fond des trous et les éclaire par en
   dessous ;
6. **des éclats en sphères à halo**, violets et cyans — les orbes des images.

**Et la pierre est devenue CHAUDE.** C'est le changement le plus important et
le moins visible dans le code : la première version reprenait `COL_STONE`
(0x565046), un gris-vert parfaitement juste pour une chaussée sous l'orage et
parfaitement faux pour un couloir éclairé aux torches. Sur les images, les
blocs sont khaki-sable. **Aucune lumière ponctuelle ne rattrape une texture
froide** — elle la multiplie, elle ne la réchauffe pas.

Enfin, le lieu est maintenant **éclairé** : l'ambiante passe de 0,06 à 0,30 et
gagne une hémisphérique. Les images de Guillaume ne montrent pas un jeu noir
mais une ruine chaude et lisible. La tension ne vient plus de l'aveuglement
mais de la distance de vue — ce qui est aussi la réponse à « ça doit pas être
trop difficile ».

### Ce qui n'a PAS été fait, et qui était proposé

**La vue à la première personne.** Guillaume l'ouvrait (« si c'est plus facile
pour toi »), mais ses deux images sont des vues À LA TROISIÈME PERSONNE, et il
les donne comme des images du jeu qu'il veut. Entre une facilité offerte et
deux références explicites, on suit les références. **Choix pris seul, à dire
s'il ne convient pas** : la bascule coûterait une demi-journée, l'essentiel du
travail étant déjà dans `updateCamera()`.
