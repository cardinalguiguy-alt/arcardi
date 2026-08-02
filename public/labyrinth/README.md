# Le Labyrinthe — mini-jeu du Pays du Labyrinthe (zips 393-397)

> **ZIP 397 — LA VUE SUBJECTIVE, ET LA FIN DE QUATRE REFONTES EN AVEUGLE.**
> Retour de Guillaume : « beaucoup trop d'amateurisme dans les textures des
> murs et du sol (…) conçois le maze en un first person pov convaincant (…)
> mets tous tes efforts dans la qualité des textures (…) il faut pouvoir
> naviguer de manière absolument évidente (…) avoir un bonus qui permet de voir
> le plan du maze ».
>
> **Le zip commence par écrire le rasteriseur réclamé quatre fois et jamais
> fait** (`tools/lib-raster.mjs`, `tools/render-textures.mjs`,
> `tools/preview-fps.mjs`) — et par REGARDER. C'est la seule raison pour
> laquelle cette cinquième refonte graphique pouvait aboutir alors que les
> quatre précédentes avaient reçu le même reproche. Voir la section « Zip 397 »
> en fin de fichier.

> **ZIP 395 — LE MOUVEMENT ET LES PERSONNAGES.** Retour de Guillaume : « les
> mouvements ne sont pas assez soignés, les animations pas du tout
> satisfaisantes (…) tu peux réduire à 30 fps (…) le perso est pas assez
> détaillé, et l'épée non plus (…) et les ennemis non plus ». Trois chantiers :
> **la simulation passe à 30 Hz avec interpolation au rendu**, **`js/rig.js`
> apporte de vrais squelettes animés**, et les trois personnages sont
> entièrement remodelés. Voir la section « Zip 395 » en fin de fichier.

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
| **Z Q S D** / **W A S D** | se déplacer (Q/D et A/D sont des **pas de côté**) |
| **souris** | **regarder** — lacet et tangage, pointeur capturé |
| **← →** | tourner au clavier, pour qui n'a pas de souris |
| **clic gauche** ou **Espace** | coup d'épée (il faut d'abord la trouver) |
| **clic droit** ou **R** | tirer un carreau d'arbalète |
| **Maj** | courir — **bruyant**, et la flamme brûle deux fois plus vite |
| **E** ou **F** | raviver la torche à un brasier · ramasser |
| **M** ou **Tab** | déplier le plan (une fois la carte trouvée) |
| **Échap** | pause — **et rend la souris** |

> **La capture du pointeur ne se reprend pas toute seule.** Les navigateurs
> l'exigent depuis un geste : c'est le clic sur « Entrer » qui la donne, et un
> panneau « cliquez pour jouer » qui la redemande après un Échap. Sans lui, le
> joueur se retrouve incapable de tourner sans savoir pourquoi.

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
| `tools/lib-raster.mjs` | **le rasteriseur** : faux canvas `fillRect` → PNG (397) |
| `js/rig.js` | **squelettes articulés et cycles d'animation** (395) |
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

Toute la vérification joue à `1 / CFG.SIM_HZ`, soit **30 Hz depuis le 395**.
Laisser le navigateur imposer un `dt` variable ferait diverger le jeu de
l'outil qui le mesure, c'est-à-dire rendrait faux **tout** ce qui a été réglé.
Et la cadence n'est écrite qu'**à un seul endroit** : `game.js`, `lib-play.mjs`,
`smoke-render.mjs`, `verify-controls.mjs` et `verify-anim.mjs` lisent tous
`CFG.SIM_HZ`.

**Le rendu, lui, tourne à la cadence de l'écran et INTERPOLE** entre les deux
derniers états simulés (`World.snapPrev` / `World.sync(st, now, alpha)`). C'est
ce découplage — et non un réglage de vitesse — qui répond à « plus fluide ».

---

## Vérification — dix scripts, à relancer TOUS à chaque livraison

Un outil qu'on saute n'est pas un filet de sécurité, c'est un fichier mort
(leçon du zip 375).

```
node tools/verify-maze.mjs 2000    # les six garanties du générateur
node tools/verify-controls.mjs     # les commandes vont-elles dans le bon sens ? (394)
node tools/verify-anim.mjs         # patinage, bornes, bouclage, contre-balancement (395)
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
| `verify-controls` | **10 contrôles**, dont demi-tour en 1,20 s |
| `verify-anim` | **13 contrôles**, rapport foulées/distance = **1,000** |
| `verify-palette` | **36 couleurs communes identiques au bit près**, 17 propres au labyrinthe |
| `smoke-render` | 4 graines × 300 images, **~2 450 maillages** (plafond 6 000) |
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

**Quinze défauts, tous dans du code dont chaque ligne prise séparément est juste.**

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
| **13** | **Aucune animation** *(395, signalé par Guillaume)* | Deux bras en sinus **du temps**, jambes immobiles. Un cycle basé sur le temps fait patiner dès qu'on ralentit — c'est le défaut qu'on reconnaît sans savoir le nommer. → `rig.js`, cycle avancé à la **distance**. |
| **14** | Les créatures recalaient leur cap **d'un coup** *(395)* | À chaque nœud de leur chemin, elles pivotaient par saccades. Aussi laid sur un monstre que sur le joueur. |
| **15** | `verify-anim` mesurait **sa propre hypothèse** *(395)* | Il comparait les foulées à `30 / STRIDE` en supposant 30 unités parcourues — le fermier en faisait 26, finissant contre un mur. Il signalait un patinage inexistant. Corollaire n°5 du zip 387, y compris pour l'outil écrit pour vérifier ce défaut-là. |

Le neuvième mérite d'être gardé en tête : **un réglage qui paraît évident peut
mesurablement empirer le jeu.** Il est commenté dans `config.js` pour que
personne ne le « corrige » à nouveau.

---

## L'équilibrage, au zip 394

Dernière mesure, **220 parties jouées image par image**, à 30 Hz :

| Issue | Part |
|---|---|
| **SORTIE** | **69,5 %** |
| temps écoulé (260 s) | 15,9 % |
| chute dans un trou | 8,2 % |
| LE TRAQUEUR | 3,2 % |
| blocage de l'oracle | 2,3 % |
| rôdeur | 0,9 % |

Durée d'une partie gagnée : **médiane 104 s**, p75 132 s, max 254 s.

> **Le passage de 60 à 30 Hz n'a rien changé à l'équilibrage** (68,6 % avant,
> 69,5 % après, sur des lots différents). C'était le contrôle à faire : une
> simulation dont le résultat dépend de sa cadence n'est pas déterministe, et
> tout ce qui a été réglé depuis le 393 serait à refaire.

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


---

## ZIP 395 — LE MOUVEMENT ET LES PERSONNAGES

### 1. Pourquoi 30 Hz rend le jeu PLUS fluide, et non moins

Les deux moitiés de la phrase de Guillaume vont ensemble : l'autorisation de
descendre à 30 est ce qui permet de soigner le mouvement.

Jusqu'ici, simulation **et** rendu tournaient à 60 : chaque image affichée était
un état de jeu brut, et tout écart de cadence du navigateur se voyait
directement. Désormais :

- la **simulation** avance par pas fixes de 1/30 s — c'est elle qui décide de
  tout, et c'est elle que rejouent les neuf outils ;
- le **rendu** tourne à la cadence de l'écran (60, 120, 144…) et **interpole**
  entre les deux derniers états simulés.

Le mouvement affiché est donc **continu** alors que la simulation reste
discrète et déterministe. À 144 Hz d'écran on obtient près de cinq images
distinctes par pas, au lieu de cinq fois la même suivie d'un saut.

Deux pièges traités au passage : les **angles** s'interpolent par le plus court
chemin (sinon un cap qui passe de +179° à −179° fait faire un tour complet), et
la **foulée** aussi (elle boucle sur [0,1[, donc 0,98 → 0,03 est un pas de 5 %
et non un retour en arrière de 95 % — sans quoi les jambes font une marche
arrière fulgurante une fois par foulée).

### 2. `js/rig.js` — de vrais squelettes

| | avant | après |
|---|---|---|
| fermier | 9 boîtes, 0 joint | **~45 volumes, 14 joints animés** |
| épée | 2 boîtes | **~25 volumes** (pommeau, filet, quillons, gouttière, tranchants, runes) |
| rôdeur | 6 boîtes | **~30 volumes**, mâchoire articulée, jambes digitigrades |
| traqueur | 7 boîtes | **~30 volumes**, six lambeaux animés en retard |

**Les trois principes qui font que ça marche :**

1. **Le cycle avance à la DISTANCE, jamais au temps.** `st.gait` est incrémenté
   dans `rules.js` par la distance *réellement parcourue après collision*. Un
   pied touche donc le sol au même endroit du cycle quelle que soit la vitesse,
   et un personnage qui pousse un mur **cesse de pédaler**. C'est la seule
   différence entre « il marche » et « il glisse », et aucune quantité de détail
   ne rattrape ça. `verify-anim.mjs` le mesure : rapport foulées/distance
   **1,000** en marche comme en course.

2. **Tout passe par une hiérarchie de joints.** Un membre est un `Group` placé à
   l'articulation ; le faire tourner pivote le membre *autour de l'épaule*, et
   non autour de son centre. C'est la différence entre un bras et une planche
   qui bascule. Effet de bord gratuit : la flamme de la torche, accrochée à la
   *main*, hérite du cycle de marche et du tremblement du poignet sans une
   ligne de plus.

3. **Les contraires se répondent.** Bras gauche avec jambe droite ; le bassin
   tourne d'un côté, le buste de l'autre, la tête compense pour stabiliser le
   regard. Sans ce contre-balancement, on obtient un pantin qui rame.
   Contrôlé : **54/54 images en accord**.

**Le coup d'épée est en trois temps** — armé (l'épaule part à −2,35 rad),
frappe (très rapide, avec torsion du buste et hanches en retard), récupération.
Sans armé, un coup n'a pas de poids ; sans récupération, pas de contrecoup.

**Le rôdeur a des jambes digitigrades** — cuisse en avant, genou plié en
arrière, cheville qui rattrape. C'est ce décalage-là qui le rend non humain au
premier coup d'œil, bien plus que sa couleur. Sa mâchoire s'ouvre quand il
chasse et claque au rythme du pas.

**Le traqueur ne marche pas, il glisse** : flottaison lente indépendante du pas,
bras qui pendent sous les genoux, six lambeaux animés chacun en retard sur le
précédent (c'est le retard qui fait le tissu). Et **son crâne se tourne vers le
joueur, toujours** — un angle relatif, et c'est tout ce qu'il faut pour se
sentir regardé.

### 3. Les rotations

Trois corrections : on **accélère vite et on freine doucement** (`TURN_DECEL`
plus faible que `TURN_ACCEL`, pour une fin de course qui glisse au lieu de
buter) ; les **créatures lissent leur cap** au lieu de le recaler d'un coup à
chaque nœud ; et le lissage de caméra suit enfin l'**intervalle réel entre deux
images** au lieu d'un 1/60 en dur.

### Ce que `verify-anim.mjs` ne dit pas

**Il ne dit pas si l'animation est belle** — il ne peut pas. Il dit qu'elle ne
patine pas, qu'elle ne pédale pas contre un mur, qu'elle boucle proprement
(écart 0,0001 rad entre `gait=0` et `gait=1`), qu'aucun angle ne saute ni ne
dépasse π, et que le coup d'épée a bien un armé. **Le reste se juge à l'œil, et
c'est toujours la seule chose qui compte.**

---

# ZIP 396 — LA ROTONDE, LES ARTICULATIONS, LES COMBATS

Sept retours de Guillaume en trois messages. Tous fondés, aucun visible par un outil
existant. Ce zip est celui où le labyrinthe cesse d'être une démonstration technique
pour devenir un lieu.

## 1. « L'épée rentre dans le corps. Les bras semblent retournés. »

Les deux reproches n'en font qu'un, et la cause tient en trois lignes de `rig.js`.

Le fermier regarde vers **-Z**. Pour un joint dont l'enfant pend vers le bas, une
`rotation.x` **positive** envoie l'extrémité vers l'AVANT. Le genou plie donc en
négatif, et le coude en **positif** : les deux articulations ont des signes OPPOSÉS.
Le 395 leur donnait le même. Conséquences, mesurées en cinématique directe :

| Ce qui était faux | Ce qu'on mesurait |
|---|---|
| coudes en flexion inverse | les deux bras pliaient vers l'arrière |
| main gauche | la torche était portée à **z = +0,85**, c'est-à-dire dans le dos |
| inclinaison de course | le fermier se penchait en **arrière** en courant |
| épée sans rotation propre | la lame remontait l'avant-bras : **9 instants sur 21** du coup d'épée la mettaient dans le buste, les épaules ou le crâne |
| hauteur du bassin | les bottes descendaient à **y = -0,41**, sous la dalle, en permanence |

L'épée et la torche passent désormais par des joints dédiés (`grip`, `torchJ`). La
lame **prolonge** l'avant-bras ; le flambeau annule l'angle du bras et reste vertical,
donc il le restera même si on change la pose demain.

Le fermier a été **redessiné** dans la foulée (demande explicite) : 45 → 99 volumes,
sans un joint de plus. Visage, mains à pouce, gant d'épée, plis de chemise, revers de
manche, bottes à semelle et talon, cape courte. Toutes les nuances sont **dérivées**
de la tenue envoyée par la ferme (`Rig.shade`) : aucune couleur neuve.

### `tools/verify-rig.mjs` — l'outil qui manquait

Il construit le VRAI squelette contre un faux Three.js, compose lui-même les matrices,
et pose **treize questions en français sur des positions monde** : « la lame reste-t-elle
hors du corps ? », « le flambeau est-il devant ? », « le coude plie-t-il vers l'avant et
le genou vers l'arrière ? », « aucun pied ne s'enfonce sous le sol ? ».

Il ne lit **aucun angle**. C'est ce qui le distingue de `verify-anim.mjs`, qui relisait
des angles et ne pouvait donc rien voir : un angle n'a pas de sens tant qu'on ne l'a pas
composé avec ceux de ses parents.

> Au passage, `verify-anim.mjs` recopiait « +0,30 » en dur — la garde du 395 — pour
> tester le contre-balancement des bras. Le 396 a changé cette pose, et le contrôle a
> échoué alors que le balancement était juste : il mesurait l'écart du code avec **sa
> propre copie d'une constante**. Il mesure maintenant la moyenne du bras sur le cycle.

## 2. « La caméra bouge trop, difficile à naviguer pour un simple clavier. »

Deux causes, deux remèdes, aucun n'est un réglage de vitesse.

**La caméra était SOUDÉE au cap.** Elle se plaçait derrière le cap courant du fermier :
une flèche faisait pivoter le décor entier, à la même vitesse, à la même image. Elle a
maintenant **son propre cap** (`CAM_ANG_LAG`), avec une **zone morte** (`CAM_ANG_DEAD`)
en deçà de laquelle elle ne bouge pas du tout. On voit le fermier tourner DANS le cadre
avant que le cadre ne suive. Le champ passe de 74° à 66° (un champ large amplifie toute
rotation sur les bords : c'est le mécanisme du mal des transports en jeu), et la
secousse de blessure est divisée par deux.

**Le dédale est à angles droits, un doigt sur une flèche ne l'est pas.** On lâche la
touche à 8° de l'axe, on avance en biais, on frotte un mur, on corrige, on frotte
l'autre. Le cap glisse maintenant vers le multiple de 90° le plus proche — mais
seulement si aucune flèche n'est enfoncée, seulement si la rotation est presque
arrêtée, seulement si on AVANCE, et seulement dans une fenêtre de `SNAP_WINDOW`. Viser
en diagonale reste possible. Trois contrôles neufs de `verify-controls.mjs` le disent.

## 3. « Le rendu de l'eau du lac n'est pas convaincant. Copie le endless run. »

L'ancienne texture peignait quatorze **anneaux carrés concentriques**, répétés dix fois
par dix sur un plan de 414 unités. Un anneau carré répété en grille ne se lit pas comme
un tourbillon : il se lit comme un circuit imprimé. Le motif était en plus centré sur sa
tuile, donc la répétition sautait aux yeux.

`Paint.lakeWaves` est recopiée **ligne pour ligne** de `paintLakeWaves` dans
`public/templerun/js/world.js` : somme de trois sinus dont les périodes divisent la
tuile (donc sans couture), puissance 3,2 (crêtes fines, creux larges), mêmes deux
couleurs. Le **montage** aussi : deux nappes de phases et d'échelles différentes qui
dérivent à des vitesses différentes — c'est leur décalage qui miroite, aucune des deux
textures ne le contient — plus neuf voiles de brume qui orbitent autour du joueur.

L'échelle physique des vagues est celle du défi (26 et 37 unités par tuile), pas une
valeur ressemblante. Et le brouillard est revenu sur le lac : il restait net jusqu'à
400 unités, ce qui étalait le motif sur tout l'horizon.

> **La règle du `fillRect` seul est intacte.** Le défi de fuite écrit sa houle avec
> `getImageData`/`putImageData`, interdits ici — c'est ce refus qui fait tout le
> contrôle de `smoke-render.mjs`. On peint donc pixel par pixel, 16 384 `fillRect` de
> 1×1, une seule fois à la construction. Résultat identique, aucun outil affaibli.
> Affaiblir un contrôle pour faire passer une texture, c'est perdre le contrôle et
> garder la texture.

## 4. La passerelle de renoncement et la herse

> « au début du labyrinthe, quand on se retourne on doit voir une plateforme qui si on
> l'emprunte nous ramène directe dans le maze world. Comme un abandon sans coût. Mais on
> ne peut faire ça que dans les 15 premières secondes : une porte se referme après. »

Le décompte **part au premier pas** (réponse explicite de Guillaume) : on mesure une
DISTANCE parcourue, pas un appui de touche. On peut donc regarder autour de soi, lire le
HUD, comprendre où l'on est, sans que le couperet tombe pendant qu'on lit.

La sortie passe par `vf-lab-exit`, le même message que le bouton « Ressortir » de
l'écran-titre — celui que la ferme traite déjà comme « aucune conséquence ». Surtout
**pas** par `quit()`, qui compte l'abandon comme un échec et renvoie le fermier blessé.

> **Ça répare aussi un vrai trou.** Le générateur ouvre le mur sud de la cellule
> d'entrée pour faire une porte, et **rien ne fermait derrière**. Un joueur qui reculait
> sortait de la grille — où `handleFloor` ne traite rien, puisqu'il ne connaît que les
> cellules valides. On ne tombait pas, on ne gagnait pas, on ne mourait pas : on
> **flottait au-dessus du lac**, indéfiniment. Aucun des neuf outils ne pouvait le voir,
> parce que l'oracle ne recule jamais au premier pas.

La herse est une boîte de collision comme les autres : elle rejoint `Rules.buildBoxes`
quand elle touche le sol, donc le moteur l'arrête et `world.js` la dessine par le même
chemin que tous les murs. Un joueur pile dessous est **poussé vers l'intérieur**, jamais
écrasé ni coincé — décision prise seul : sans elle il existe une position où la partie
se fige.

## 5. « On sait pas quand on gagne, si on touche. Il faut voir la jauge. »

Quatre retours visuels, et un cinquième inventé par Guillaume dans sa réponse.

- **Une jauge de vie** au-dessus de chaque rôdeur, face caméra, visible sous 26 unités.
  Le remplissage est un plan décalé dans un groupe qu'on met à l'échelle : une barre qui
  rétrécit des deux côtés à la fois ne se lit pas comme une perte de vie.
- **Le coup porté** : la créature blanchit (boîte additive), une gerbe de huit éclats
  part du point de contact, et le recul existait déjà. Un coup dans le vide ne produit
  **rien** — c'est le contraste qui informe, pas l'effet.
- **La mise à mort** : « +60 » qui monte de l'endroit exact où elle tombe, peint par une
  fonte 3×5 au `fillRect` (`Paint.number`). Au moment où l'on gagne un échange, on
  regarde la créature, pas le coin de l'écran.
- **La désintégration**, demandée mot pour mot : le corps se défait en ses six membres,
  qui montent en tournant et s'effacent en fin de course. La montée est en k² —
  accélérée, donc « aspirée » et non « soulevée » — et une colonne violette qui
  s'étrangle en montant accompagne le tout.
- **L'assistance à la visée** : le cap pivote vers la créature la plus proche dans la
  fenêtre du coup. Plafonnée à `AIM_MAX_TURN`, et seulement vers une cible déjà
  atteignable (`canTouch`). Elle ne change ni la portée ni les dégâts.

Et le combat est **matériellement plus permissif**, choix explicite de Guillaume :
portée 2,9 → 3,8, arc 112° → 135°, repos 420 → 240 ms, coût en flamme 5 % → 3 %, et
surtout sonnerie du rôdeur 380 → **620 ms**. Ce dernier nombre se lit avec le repos : le
second coup demande 540 ms, donc à 380 la « fenêtre du second coup » **n'existait pas**,
malgré son nom. Elle vaut maintenant 80 ms — étroite, mais réelle. C'est elle qui rend
un rôdeur tuable en un échange.

## 6. « Revoir la page de lancement qui bug un peu avant de s'afficher. »

Cause racine trouvée : le labyrinthe était construit **deux fois**. La ferme envoie la
tenue du joueur (`vf-lab-init`) APRÈS le chargement de l'iframe, et `game.js` rejouait
alors `newRun()` en entier — génération du dédale, sept textures, 3 300 maillages —
pour changer quatre couleurs de vêtement. Le second passage tombait pile au moment où
l'écran-titre devait apparaître.

`World.reskin()` ne refait que le fermier. Et le titre n'est plus affiché par le HTML :
il attend que la **première image 3D** soit réellement passée par `renderer.render()`,
derrière un écran de chargement.

## 7. LA ROTONDE — la salle centrale circulaire à escaliers

> « je veux une salle centrale circulaire avec escaliers comme montrée ici. »

Toujours au centre, toujours identique, toujours 5 cellules de côté — à l'inverse de
tout le reste du générateur. C'est délibéré : un labyrinthe entièrement aléatoire n'a
aucun point de repère, donc aucun souvenir. La rotonde est le seul endroit dont on
puisse dire « j'y suis déjà passé », et c'est ce qui transforme une errance en
exploration. Elle est aussi le seul lieu à ciel ouvert, la seule vue dégagée, le seul
brasier dont on sache l'existence avant d'y arriver, et son fût de lumière dépasse les
murs — on ne peut pas la rater.

**Le mur rond est fait de blocs carrés**, posés là où la distance au centre dépasse le
rayon : un cercle de Bresenham en maçonnerie. Ce n'est pas un pis-aller. Une boîte de
collision de ce moteur est un rectangle aligné sur les axes ; dessiner un mur courbe
par-dessus une collision carrée (ou l'inverse) donne un mur qu'on traverse ou un mur
invisible qui bloque. En pixélisant, le moteur et le rendu lisent **la même liste**, et
on obtient du pixel-art en volume — la signature du projet.

Le sol : un pourtour plat, trois gradins (trois cylindres empilés, dont les flancs FONT
les contremarches, ce qui économise quatre cents maillages), et deux escaliers
nord-sud de treize marches. `Rules.groundY()` est une fonction **pure** qui rend la
hauteur du sol en un point ; le fermier, les créatures, la caméra, les objets posés et
les marches elles-mêmes la lisent tous. Le moteur, lui, ignore toujours la verticale :
on ne peut ni tomber d'un gradin ni se coincer dessous. C'est un arbitrage assumé —
ajouter un axe Y à la simulation, c'est ajouter la gravité, les sauts et refaire la
collision entière, pour une salle.

### ⚠️ Les deux défauts que la rotonde a créés, et que seule la MESURE a vus

**1. Le graphe annonçait un passage là où le monde avait un bloc plein.** Les coins du
carré tombent hors du cercle : ils sont de la pierre. Première version, on les retirait
APRÈS le creusement — or un dédale creusé en profondeur est un ARBRE, et dans un arbre
presque toute cellule est un point d'articulation. Retirer douze cellules d'un coup en
détachait douze sous-arbres : sur la graine 1, **140 cellules sur 277** devenaient
inaccessibles, et le taux de sortie tombait de **78 % à 25 %**. La maçonnerie est
maintenant décidée AVANT tout creusement ; le creusement, le tressage, les salles et la
rotonde l'évitent tous. La connexité n'a plus l'occasion de se casser.

**2. Un trou dans la rotonde aurait été mortel ET invisible**, puisque `buildFloor` n'y
dessine pas le sol de la grille. Les chutes passaient de 5 % à 17 % des fins de partie.
Aucun trou ni dalle fêlée ne s'y pose plus, et `verify-maze.mjs` le contrôle.

Quatre garanties neuves du générateur, donc **dix** au total : la rotonde est
atteignable, elle a au moins deux portes, elle ne contient aucun trou, et toute cellule
qu'elle annonce ouverte est réellement franchissable.

## 8. Plus long, pas plus difficile

> « il faut pas que ce soit trop difficile, seulement que ce soit relativement long et
> avec des surprises. »

Sept configurations **jouées**, 45 parties chacune, avant de trancher :

| Configuration | Sortie | Médiane | p75 |
|---|---|---|---|
| grille 15 (celle du 395) | 58 % | 114 s | 199 s |
| **grille 17** | **69 %** | **125 s** | **156 s** |
| grille 19 | majorité de parties non finies en 10 min | | |

**Plus grand est plus FACILE entre 15 et 17**, ce qu'aucun raisonnement ne donnait : la
rotonde occupe 25 cellules. Sur une grille de 15 elle en mange 11 %, étrangle le dédale
autour et fait exploser les détours ; sur 17 elle n'en mange que 8,6 % et redevient un
carrefour au lieu d'un bouchon. Au-delà, la surface l'emporte.

Les ressources montent avec la taille (brasiers 14 → 20, fioles 4 → 6, éclats 22 → 34,
salles 3 → 4) ; les dangers montent **moins vite** que la surface (trous 7 → 9 pour 28 %
de cellules en plus). La densité de danger BAISSE.

### L'équilibrage du 396, mesuré sur 140 parties JOUÉES

| | zip 395 | **zip 396** |
|---|---|---|
| **SORTIE** | 69,5 % | **70,7 %** |
| durée médiane d'une partie gagnée | 104 s | **133 s** |
| p75 / max | 132 s / 254 s | **169 s / 289 s** |
| éclats ramassés (médiane) | 5 | **10** |
| temps écoulé | 15,9 % | 16,4 % |
| chute dans un trou | 8,2 % | 11,4 % |
| tué par une créature | 4,1 % | **0 %** |
| blocage de l'oracle (panne) | 2,3 % | 1,4 % |

Même taux de réussite, parties **28 % plus longues**, deux fois plus de butin, et les
créatures ne tuent plus l'oracle du tout — ce qui est exactement l'effet demandé sur le
combat. Un humain, lui, mourra encore : l'oracle ne panique pas et n'oublie jamais un
brasier.

## Les DIX outils du 396

```
node tools/verify-maze.mjs 400      # les DIX garanties du générateur
node tools/verify-controls.mjs      # les commandes, le recalage, la passerelle, la herse
node tools/verify-rig.mjs           # le squelette en repère monde  (NEUF)
node tools/verify-anim.mjs          # patinage, bornes, bouclage, contre-balancement
node tools/verify-palette.mjs       # la palette n'a pas dérivé de celle du défi
node tools/smoke-render.mjs         # world.js EXÉCUTÉ contre un faux Three.js
node tools/check-strings.mjs        # parité FR/EN + ui.js contre un faux DOM
node tools/batch-maze.mjs 1 90 300 > parties.jsonl
node tools/report-maze.mjs parties.jsonl
node tools/simulate-maze.mjs 50     # le même rapport, d'un bloc
```

| Script | Attendu au 396 |
|---|---|
| `verify-maze` | 400 dédales, **10 garanties**, chemin 40..64, écart max 7 (plafond 8), rotonde 400/400 avec 4,0 portes |
| `verify-controls` | **18 contrôles** (10 au 395), demi-tour en 1,30 s |
| `verify-rig` | **13 contrôles**, 99 volumes, aucun contact lame/corps |
| `verify-anim` | **13 contrôles**, rapport foulées/distance 1,000 |
| `verify-palette` | 36 couleurs communes identiques au bit près, 17 propres |
| `smoke-render` | 4 graines × 300 images, **~3 400 maillages** (plafond 6 000) |
| `check-strings` | **47 = 47**, 18 identifiants |

## Ce qui n'a PAS été fait au 396

- **Le joystick tactile de la ferme.** Septième zip consécutif. Il touche `FermeGame.js`,
  ce zip n'y touche pas du tout — et ce chantier-ci était entièrement dans `public/`.
- **`tools/render-maze.mjs`.** Toujours aucun PNG ne sort de `paint.js`. Les quatre
  refontes graphiques (393, 394, 395, 396) ont été faites en aveugle.
- **Le son.** Toujours la plus grosse perte du labyrinthe.
- **La carte partielle ramassable**, proposée au 395, non demandée, non faite.

---

# ZIP 397 — LA VUE SUBJECTIVE, LES TEXTURES, LA NAVIGATION

Quatre demandes, et une cinquième qui n'en est pas une mais qui commande tout
le reste : **arrêter de travailler en aveugle.**

## 0. La dette qu'il fallait payer d'abord — REGARDER

Les README des zips 393, 394, 395 et 396 portaient tous la même ligne, dans la
section « ce qui n'a pas été fait » :

> `tools/render-maze.mjs` : écrire les textures de `paint.js` en PNG, pour les
> REGARDER. `paint.js` a été écrit sans dépendance à Three.js **exactement**
> pour ça, mais le rasteriseur n'est toujours pas fait. **Aucune texture de ce
> jeu n'a encore été regardée hors du navigateur.**

Quatre refontes graphiques, quatre fois le même reproche. Ce n'était pas un
hasard : **on ne corrige pas ce qu'on ne voit pas.** Le 397 commence donc par
écrire trois outils, et le reste du zip découle de ce qu'ils ont montré.

| Outil | Ce qu'il rend |
|---|---|
| `tools/lib-raster.mjs` | un faux canvas qui n'accepte QUE `fillRect`/`clearRect` — le même contrat que `smoke-render.mjs` — et un encodeur PNG écrit à la main |
| `tools/render-textures.mjs` | chaque texture en PNG, **plus sa planche carrelée 3×3** (c'est là qu'on voit la couture, et nulle part ailleurs) |
| `tools/preview-fps.mjs` | **la vue subjective en lancer de rayons**, contre la VRAIE liste de boîtes de `Rules.buildBoxes()` |
| `tools/verify-textures.mjs` | les trois défauts du 396 qui se chiffrent : platitude, couture, monochromie |

### Ce qu'on a vu en trente secondes, sur le mur du 396

1. **Douze niveaux de gris** pour tout un mur. Chaque bloc était un aplat, plus
   une bande claire en haut et une sombre en bas ;
2. une **couture de 10,6** entre les bords : la tuile de 128 px se répétait
   quatre fois par mur et les taches de mousse retombaient au pixel près au
   même endroit — on lisait la grille, pas le mur ;
3. le joint était **rectiligne, d'épaisseur constante, uniformément sombre** ;
4. **tous les blocs avaient la même taille** ;
5. **aucune usure** : pas un éclat, pas une fêlure, pas une coulure, pas de suie
   sous les torches — alors qu'il y en a une tous les trois mètres.

**Le mur du 396 n'était pas mal dessiné. Il était dessiné trop petit.** À 128 px
pour 5,75 unités, un bloc reçoit trente pixels : il n'y a physiquement pas la
place d'y mettre un chanfrein, un grain et une piqûre. C'est pour ça que quatre
refontes successives n'y avaient rien changé.

---

## 1. La pierre — onze couches, et un relief qui vit à l'exécution

`CFG.TEX_WALL` passe de 128 à **512**, et l'ordre des couches compte, chacune
lisant la précédente :

| # | Couche | Ce qu'elle répare |
|---|---|---|
| 1 | appareillage à tailles variables | « tous les blocs identiques » |
| 2 | teinte par bloc + dérive | l'aplat |
| 3 | veinage large (fbm) | la pierre uniforme |
| 4 | grain fin, **quantifié** | les 12 niveaux de gris → **146** |
| 5 | **chanfrein** analytique, éclairé haut-gauche | l'absence de volume |
| 6 | piqûres seuillées | le mouchetis |
| 7 | éclats d'arête | la ruine neuve |
| 8 | fêlures en marche aléatoire | idem |
| 9 | joint **d'épaisseur irrégulière** + occlusion cuite | le quadrillage |
| 10 | coulures ferrugineuses + **suie** | trente torches et pas une trace |
| 11 | mousse en **taches organiques** (plus en carrés) | le décalque |
| — | **tache de fond** basse fréquence, périodes entières | la lecture de la grille à cinq mètres |

**Et un champ de hauteur séparé, branché sur `bumpMap`.** C'est la seule couche
de tout ce travail qui vive à l'exécution : la torche du joueur BOUGE, donc les
creux du mortier et le fond des cratères changent d'ombre pendant qu'on avance.
Aucune texture cuite ne produit ça, et c'est de très loin ce qui se voit le plus
en jouant.

> ⚠️ **La pierre passe donc en `MeshPhongMaterial`.** Dans la r128,
> `MeshLambertMaterial` n'a pas de `bumpMap` : **il l'ignore silencieusement**.
> On aurait cru avoir du relief, on n'en aurait pas eu, et rien ne l'aurait dit.
> Brillance à 0 et spéculaire au noir = un Lambert avec du relief.

### Trois réglages faits en REGARDANT, et qu'aucun raisonnement n'aurait donnés

- **le chanfrein était trois fois trop large** (W/46). Les blocs paraissaient
  GONFLÉS, comme du plastique moulé. Une pierre taillée a une arête franche et
  un tout petit méplat → W/85 ;
- **le filet de lumière était uniforme**, donc chaque bloc portait un liseré
  doré identique : un décor de confiserie. Il est maintenant modulé par le grain ;
- **la mousse sortait en bandes horizontales** — une assise entière verte d'un
  bout à l'autre. Le champ était anisotrope. Vu sur la planche 3×3, invisible
  sur une tuile seule.

### La densité de texels est enfin constante

Le 396 avait **deux matériaux pour neuf cents murs** et aucune répétition : la
texture était **étirée** sur toute la face, quelle qu'en soit la taille. Un mur
de 11,5 unités et un mur de 2 unités affichaient le même nombre de blocs — donc
des pierres deux fois plus grosses selon le couloir où l'on se tient. Chaque
taille de boîte a maintenant son matériau, dont la texture est **clonée**
(l'image est partagée) et réglée sur la longueur réelle divisée par `WALL_TILE`.

**Une seule tuile sur la HAUTEUR**, en revanche : la texture porte une suie en
haut et une mousse en bas qui décrivent le haut et le bas d'un MUR, pas d'une
tuile. `verify-textures.mjs` l'a trouvé en mesurant une asymétrie de couture
(7,1 en y contre 2,4 en x) que personne ne cherchait.

### Le sol : deux dessins, quatre orientations, huit cellules

Une tuile de sol couvre exactement une cellule. Avec un seul dessin, les 289
cellules montraient rigoureusement le même dallage : **on lisait la grille du
labyrinthe à travers son propre sol.** La rotation d'un plan carré dans son
propre plan ne coûte rien — deux textures suffisent donc à faire huit dallages.

Deux autres réglages venus de la vue subjective : les joints tiraient des
**lignes vert néon** à travers tout le couloir (la mousse était la seule couleur
saturée du cadre), et le gravier faisait de la **neige**. Les deux sont invisibles
sur une planche de texture.

### Et le coût, mesuré et non supposé

La première écriture appelait `fbm()` huit fois **par pixel** : **4 000 ms par
texture**, soit seize secondes de chargement — un jeu injouable par sa page de
garde. La cause n'était pas la formule mais **l'ordre des boucles** : par point,
chaque octave refait un `Math.floor`, quatre hachages et deux lissages pour des
valeurs identiques sur toute une maille. En remplissant le champ octave par
octave : **4 000 ms → 230 ms**, au pixel près identique.

> **Quand une texture procédurale est lente, ce n'est presque jamais la formule
> qui coûte, c'est de la redemander à chaque pixel.**

---

## 2. La vue subjective — quatre pièces, et la caméra est la moins importante

| # | Pièce | Pourquoi elle compte plus que la caméra |
|---|---|---|
| 1 | **la souris** (pointer lock) | une vue subjective au clavier n'existe pas |
| 2 | **le modèle de vue** en seconde passe | sans lui, l'arme rentre dans le mur — et dans un labyrinthe, on se colle aux murs en permanence |
| 3 | **le balancement à la foulée** | sans lui, on glisse comme un chariot sur des rails |
| 4 | **le réticule dynamique** | c'est le « on sait pas si on touche » du 396, transposé |

**La souris n'est pas une vitesse, c'est un déplacement.** `turnDelta` est un
angle déjà intégré par le périphérique ; il ne passe ni par `TURN_ACCEL`, ni par
`TURN_DECEL`, ni par le recalage sur le couloir. **La main du joueur est
l'amortissement**, et elle est meilleure que le nôtre. Les trois réglages
d'amortissement du 396 ne servent plus que le mode clavier, où ils restent.

**Le modèle de vue est rendu dans une seconde passe**, avec sa propre scène, sa
propre caméra (champ à 55° : une arme filmée au grand-angle est difforme) et sa
propre lumière. `autoClear = false`, `clearDepth()`, puis on rend par-dessus.
Trois lignes, et chacune est indispensable.

**Le balancement avance à la DISTANCE, jamais au temps** — il réutilise
`st.gait`, le cycle de marche du 395. Une caméra qui oscille au temps continue
de tanguer quand on pousse un mur ; c'est le défaut qu'on reconnaît sans savoir
le nommer, et c'est exactement celui que le 395 avait corrigé pour les jambes.
Le déhanchement latéral est à la **moitié** de la cadence verticale : deux appuis
de pied par cycle, un déhanchement par cycle.

> ⚠️ **Le tangage n'existe pas pour le moteur.** Il vit dans `world.js`. Le sol
> est plat, on ne saute pas, une épée comme un carreau partent à l'horizontale :
> il ne décide donc de RIEN — ce qui est précisément la condition pour que les
> douze outils continuent de rejouer exactement le même jeu. **La caméra a
> changé, la simulation non.**

L'écran-titre reste à la troisième personne : on y voit son fermier, sa tenue,
sa torche. En subjectif, l'écran-titre serait une photo de mur. La caméra du 396
est conservée entière — un commutateur, pas une suppression.

---

## 3. Naviguer de manière absolument évidente — trois dispositifs qui ne se recouvrent pas

C'est ce qui permet de les avoir tous les trois sans que le jeu devienne une
visite guidée :

- **LA BOUSSOLE** donne une DIRECTION à vol d'oiseau (« la sortie est par là »),
  jamais un chemin. Elle porte les quatre points cardinaux, **la sortie** et
  **la rotonde**. Savoir que la sortie est au nord-est ne dit rien des trois
  murs qui séparent : elle supprime la question sans intérêt (« où aller ? ») et
  laisse entière la seule qui compte (« comment y aller ? ») ;
- **LA MINICARTE** donne la topologie de ce qu'on a VU, **orientée vers
  l'avant**. Elle répare le seul vrai défaut d'un labyrinthe joué en une
  session : la mémoire. Un joueur humain ne retient pas trente embranchements,
  et le lui demander ne produit pas de la difficulté mais des allers-retours ;
- **LES MARQUES DE CRAIE** donnent un conseil LOCAL au moment du choix. C'est la
  seule des trois qui parle du monde plutôt que de l'interface.

### La carte luisante — le bonus demandé

> « avoir un bonus qui permet de voir le plan du maze (quand on trouve une carte
> luisante accrochée au mur) »

Elle est **accrochée à une face fermée** que le générateur choisit (il sait
quelles faces sont fermées ; les redécouvrir au rendu collerait un parchemin
dans le vide), à profondeur **8 à 18**, et **de préférence hors du plus court
chemin** — un bonus posé sur la route qu'on prend de toute façon n'est pas une
trouvaille. Elle luit, elle porte sa propre lumière, et son halo la rend visible
du bout d'un couloir : une carte qu'on ne remarque pas est une carte qui
n'existe pas.

**Elle se ramasse au PASSAGE, pas à la touche** — l'inverse du brasier, et pour
la même raison prise par l'autre bout : un brasier se consomme, donc appuyer
protège d'un gaspillage ; une carte ne se consomme pas, et **quand rater est
irréparable, on ne demande pas de geste.** Le plan s'ouvre seul trois secondes,
ce qui apprend au passage qu'une touche le rouvre.

Sur la minicarte, une cellule **vue** reste plus claire qu'une cellule seulement
**connue par la carte** : le plan ne rend donc pas l'exploration inutile.

### Les indices de craie — trois espèces, trois messages

| Marque | Où | Ce qu'elle dit |
|---|---|---|
| **flèche** | aux **carrefours du chemin de la sortie** | la direction — et seulement là où il y a un choix à faire |
| **croix** | devant un trou | « quelqu'un est tombé ici » — la seule qui parle du passé |
| **main** | à une cellule d'un brasier | le feu est derrière ce mur, et un mur cache tout |

> ⚠️ **Une flèche sur un mur ne peut désigner que la gauche ou la droite**, et
> il a fallu écrire la projection pour s'en rendre compte : le décalque est
> plaqué sur une surface verticale, son plan ne contient pas la normale du mur.
> Un roulis continu aurait donné des flèches pointant en biais vers le
> plafond — juste selon la formule, absurde sur un mur.

---

## 4. L'arbalète, et pourquoi elle rend le jeu plus LISIBLE

Elle est posée **plus loin que l'épée** (`BOW_DEPTH_MIN`, et jamais avant
`swordDepth + 3`) : trouver la seconde arme avant la première annulerait tout le
propos du parvis.

**Le carreau est SIMULÉ, pas résolu d'un coup.** Un tir instantané aurait été
trois fois plus court à écrire et il aurait manqué le seul effet recherché : un
projectile qu'on VOIT partir, traverser un couloir et se planter répond sans un
mot au « on sait pas quand on gagne, si on touche » du 396.

> Le pas d'intégration est **sous-divisé en quatre**. À 62 u/s et 30 Hz, un
> carreau avance de 2,07 unités par image alors qu'un rôdeur fait 2,0 de large :
> sans sous-division, il le traverserait une fois sur deux sans rien toucher.
> Défaut classique du projectile rapide, et invisible en relisant.

La collision avec les murs passe par `pushOut()`, **la même liste de boîtes qui
arrête le joueur**. Et le traqueur encaisse un carreau exactement comme un coup
d'épée : il recule, et rien de plus.

---

## Les DOUZE outils du 397

```
node tools/render-textures.mjs      # écrit les textures en PNG        (NEUF)
node tools/preview-fps.mjs 4242     # la vue subjective en PNG          (NEUF)
node tools/verify-textures.mjs      # platitude, couture, relief        (NEUF)
node tools/verify-maze.mjs 400      # les DIX garanties du générateur
node tools/verify-controls.mjs      # les commandes, LA SOURIS, l'arbalète, la carte
node tools/verify-rig.mjs           # le squelette en repère monde
node tools/verify-anim.mjs          # patinage, bornes, bouclage, contre-balancement
node tools/verify-palette.mjs       # la palette n'a pas dérivé de celle du défi
node tools/smoke-render.mjs         # world.js EXÉCUTÉ contre un faux Three.js
node tools/check-strings.mjs        # parité FR/EN + ui.js contre un faux DOM
node tools/batch-maze.mjs 1 120 300 > parties.jsonl
node tools/report-maze.mjs parties.jsonl
```

| Script | Attendu au 397 |
|---|---|
| `verify-textures` | **16 contrôles**, mur 146 niveaux (12 au 396), couture 2,4 (10,6 au 396), texture en 230 ms |
| `verify-controls` | **31 contrôles** (18 au 396), dont 7 sur la souris et l'arbalète |
| `verify-maze` | 400 dédales, 10 garanties, chemin 40..64, rotonde 400/400 |
| `verify-rig` | 13 contrôles, 99 volumes |
| `verify-anim` | 13 contrôles, foulées/distance 1,000 |
| `verify-palette` | **36 couleurs communes identiques au bit près**, 25 propres |
| `smoke-render` | 4 graines × 300 images, **~3 500 maillages** (plafond 6 000) |
| `check-strings` | **58 = 58**, 26 identifiants |

## L'équilibrage, 120 parties JOUÉES

| | zip 396 | **zip 397** |
|---|---|---|
| **SORTIE** | 70,7 % | **73,3 %** |
| durée médiane d'une partie gagnée | 133 s | **133 s** |
| p75 / max | 169 s / 289 s | **169 s / 332 s** |
| éclats ramassés (médiane) | 10 | **10** |
| temps écoulé | 16,4 % | 14,2 % |
| chute dans un trou | 11,4 % | 12,5 % |
| tué par une créature | 0 % | **0 %** |

**C'était le contrôle à faire, et c'est le seul chiffre qui compte ici :
l'équilibrage n'a pas bougé.** La bascule en vue subjective, la souris,
l'arbalète et la carte n'ont rien changé à ce que le moteur décide — ce qui est
exactement ce qu'on voulait, puisque rien de ce qui décide n'a bougé.

> ⚠️ **L'oracle ne tire jamais et ne lit jamais la carte.** Les deux ne peuvent
> donc que rendre le jeu plus facile pour un humain, jamais plus dur : le
> chiffre ci-dessus est un PLANCHER pour les nouveautés du 397, pas une mesure
> de leur effet. Cet effet-là ne se mesure qu'en jouant.

---

## Ce qui n'a PAS été fait au 397

- **Le son.** Toujours la plus grosse perte du labyrinthe, et elle grandit : en
  vue subjective, un traqueur qu'on ENTEND respirer derrière soi vaudrait cinq
  fois un traqueur qu'on voit. Le voile rouge du HUD reste un pis-aller.
- **Le joystick tactile de la ferme.** Huitième zip consécutif. Le labyrinthe a
  maintenant SES commandes tactiles (moitié gauche = déplacement, moitié droite
  = regard au glissé, tape = coup), mais elles ne touchent pas `FermeGame.js` :
  la dette du 387 reste entière.
- **Le traqueur est toujours une boîte à yeux rouges.** En vue subjective il est
  plus impressionnant qu'avant — on le voit arriver à hauteur d'homme — mais
  c'est un placeholder, et le rig du 395 mériterait le même traitement que le
  fermier a reçu au 396.
- **Les ombres portées.** Aucune. En vue subjective, une torche qui ne projette
  pas l'ombre du joueur sur le mur d'en face se remarque. C'est cher (une passe
  de rendu de plus) et ce n'était pas demandé.
- **`tools/preview-fps.mjs` ne connaît ni les créatures, ni les torches murales,
  ni le modèle de vue.** Il montre l'échelle et le cadrage, ce qui suffisait à
  ce zip. Il ne remplacera jamais le fait de jouer.
