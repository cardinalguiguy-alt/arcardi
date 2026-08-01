# Le Labyrinthe — mini-jeu du Pays du Labyrinthe (zip 393)

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

## Vérification — sept scripts, à relancer TOUS à chaque livraison

Un outil qu'on saute n'est pas un filet de sécurité, c'est un fichier mort
(leçon du zip 375).

```
node tools/verify-maze.mjs 2000    # les six garanties du générateur
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
| `verify-maze` | 2 000 dédales, **6 garanties**, chemin 42..80, écart max sans brasier **10** (plafond 11), épée 6..9, 1,11 essai |
| `verify-palette` | **36 couleurs communes identiques au bit près**, 6 propres au labyrinthe |
| `smoke-render` | 4 graines × 300 images, **~1 480 maillages** (plafond 2 000) |
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

**Neuf défauts, tous dans du code dont chaque ligne prise séparément est juste.**

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

Le neuvième mérite d'être gardé en tête : **un réglage qui paraît évident peut
mesurablement empirer le jeu.** Il est commenté dans `config.js` pour que
personne ne le « corrige » à nouveau.

---

## ⚠️ CE QUI N'EST PAS RÉGLÉ — à faire avec Guillaume, manette en main

**L'équilibrage n'est pas terminé, et il ne peut pas l'être sans jouer.**
Dernière mesure, 160 parties :

| Issue | Part |
|---|---|
| **LE TRAQUEUR** | 33,8 % |
| blocage de l'oracle *(panne de l'outil)* | 22,5 % |
| chute dans un trou | 15,0 % |
| temps écoulé | 13,8 % |
| **SORTIE** | **11,3 %** |
| rôdeur | 3,8 % |

Trois choses à en dire, honnêtement :

1. **Le taux de sortie est trop bas.** La cible est 35-50 % pour un oracle qui
   ne panique jamais. À 11 %, le jeu est probablement trop dur — mais le
   chiffre est **sous-estimé** par les 22,5 % de blocages, qui sont des pannes
   de l'oracle et non des défaites.

2. **L'oracle a encore un défaut de navigation** (22,5 % de blocages). Trois
   causes distinctes ont déjà été trouvées et corrigées ; il en reste au moins
   une. **Continuer à régler le JEU contre un outil défaillant, c'est régler la
   mauvaise chose** — c'est le piège que le projet documente sous « un contrôle
   qui sort tout le catalogue a tort, pas le catalogue ». Le réglage a donc été
   **arrêté** ici volontairement.

3. **Les rôdeurs ne tuent presque personne** (3,8 % contre 33,8 % au traqueur).
   Sur les deux dangers « créature » demandés, un seul travaille vraiment. C'est
   défendable — le traqueur EST le danger, les rôdeurs sont ce qui donne un
   usage à l'épée — mais ça mérite ton avis.

**Ce qu'aucun outil ne peut dire, et qui est l'objet du chantier : est-ce que
c'est angoissant ?** Le ressenti de la torche qui baisse, la lisibilité d'un
couloir noir, le moment où on entend une dalle tomber derrière soi, la peur.
Trois leviers sont prêts si c'est trop dur : `HEARTS` (5), `ROAMER_COUNT` (5),
`STALK_SPEED` (10,6, contre 11,4 en course).

---

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
  pour ça, mais le rasteriseur n'est pas fait. **Aucune texture de ce jeu n'a
  encore été regardée** — et le projet compte seize défauts trouvés en
  regardant contre zéro en relisant.
- **Le joystick tactile.** Le labyrinthe a ses propres commandes tactiles, mais
  elles ne touchent pas `FermeGame.js` : **la dette du zip 387 reste entière.**
