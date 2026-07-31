# Défi de fuite — monde sombre de Ferme Vallée

Endless runner 3D façon Temple Run, intégré à Ferme Vallée comme défi du monde
sombre.

## La progression du décor (zip 379)

La course commence sur une **chaussée de pierre à rambardes**, traduction 3D de
la jetée 2D du monde sombre : gros blocs taillés, mortier, pierre de
couronnement, torches allumées, blocs tombés à l'eau. Elle court **jusqu'au
premier virage** (188 à 700 m selon la graine, 420 en moyenne), puis se délite
sur 340 m jusqu'à la **plateforme AA** — la passerelle usée, sombre et
minimaliste, torches éteintes.

Tout tient dans un paramètre continu, `stage`, de 0 à 1. L'« hybride » n'est
pas un troisième décor : c'est `stage ≈ 0,5`. Rien ne bascule nulle part —
la rambarde s'affaisse, les dalles se délitent, le couronnement tombe, les
flammes meurent, les champignons prennent le relais. Le pavage lui-même se
mélange **dalle par dalle** par tirage, ce qui entremêle les deux matières sur
une trentaine de mètres au lieu de les séparer par une ligne.

La **brume** suit son propre cycle, de période 4000 m — celle des bifurcations
offroad. Elle est donc au plus épais pile sur les embranchements, qu'elle
annonce plusieurs centaines de mètres à l'avance.

---

## Comment on y joue, dans le jeu

Franchir le passage sombre, puis marcher vers l'**est** jusqu'à la chaussée de
pierre qui enjambe le lac violet et sort de la carte. Un couloir dégagé y mène
depuis l'arrivée, sur les cinq mondes du passage — y compris le labyrinthe.

La chaussée (`G_RUN_JETTY`, cinq cases de large : trois praticables entre deux
rangées de blocs bas) est une **réduction 2D de la plateforme du défi** —
mêmes dalles à trois paliers d'usure, mêmes joints moussus, mêmes stèles à
runes, mêmes torches, mêmes champignons luminescents, et la même pierre
(tools/verify-deck.mjs compare les deux palettes). Elle est posée SUR le lac :
ombre portée au sud, liseré violet au nord.

S'avancer dessus jusqu'à `C.RUN_GATE` déclenche l'embuscade puis le défi.
**Rien ne marque cette case** (décision Guillaume, zip 378) : c'est une dalle
comme les autres, la chaussée continue derrière elle jusqu'au bord du monde. En cas de défaite :
écran de fin, puis retour à la ferme **blessé 10 minutes** (`RUN_INJURED_MS`),
avec les **bonbons** ramassés. Abandonner une course en cours compte comme une
défaite ; ressortir depuis l'écran-titre est gratuit.

**Sortie offroad (zip 377).** Tous les **4000 mètres**, un embranchement s'ouvre
sur le côté de la piste : bordure interrompue, stèle à runes au glow renforcé,
deux torches rapprochées, et un chemin de champignons luminescents qui s'y
engage. Tourner vers lui **quitte la course sain et sauf** — le fermier se
retourne, la caméra **marque un temps** sur la meute qui traverse
l'embranchement et file tout droit, puis il **ralentit jusqu'au trot** et un
fondu enchaîné le ramène **au pied de la jetée, sans un loup**. 4,4 secondes en
tout.

C'est la seule issue du défi qui ne soit pas une défaite : **aucune blessure**,
bonbons conservés, et le score compte pour le record. Il s'arrête en revanche
**au virage** — il mesure la distance parcourue *en danger*. Ne rien faire
devant un embranchement n'a strictement aucune conséquence : la course continue,
et le suivant est 4000 mètres plus loin.

**Le fermier du défi porte la tenue du joueur** (zip 377) : genre et couleurs
(chemise, pantalon, cheveux) voyagent dans `vf-run-init`.

## Y jouer seul, pour itérer sur le gameplay

Double-cliquer sur **`index.html`**. Pas de build, pas de serveur. Le défi
détecte qu'il n'est pas embarqué : français, record en `localStorage`, aucune
conséquence.

> **Une dépendance externe** : `three.js` vient du CDN cdnjs, donc accès
> internet au premier chargement. Il est chargé DANS l'iframe, jamais dans le
> bundle Next : rien à ajouter à `package.json`, et un CDN muet ne casse que le
> défi, pas la ferme. Pour rendre le tout autonome, déposer `three.min.js` ici
> et changer une ligne d'`index.html`.

---

## Commandes

| Touche | Effet |
|---|---|
| **← →** ou **A D** | changer de voie — **et tourner** aux intersections |
| **↑**, **W** ou **Espace** | sauter |
| **↓** ou **S** | glisser |
| **Échap** | pause |

AZERTY (**Q/Z/S/D**) et tactile (glissements) fonctionnent aussi.

**Percuter un obstacle ne tue pas** : on trébuche, on perd de la vitesse, et la
meute reprend 8 unités. Ce sont les loups qui tuent. Seuls les trous et les
virages manqués sont fatals sur le coup.

---

## Architecture

Un fichier = un système. Scripts classiques (pas de modules ES) : c'est ce qui
permet le double-clic sans serveur.

| Fichier | Rôle |
|---|---|
| `js/config.js` | **tous** les réglages de gameplay + la palette du monde sombre |
| `js/strings.js` | textes FR/EN du défi (la ferme impose la langue) |
| `js/bridge.js` | dialogue postMessage avec la ferme |
| `js/input.js` | clavier et tactile → actions, avec tampon d'entrée |
| `js/track.js` | génération procédurale, obstacles, pièces, règles d'équité |
| `js/player.js` | déplacement, saut, glissade, virages, collisions |
| `js/wolves.js` | la poursuite |
| `js/camera.js` | caméra de poursuite |
| `js/world.js` | tout Three.js : scène, matériaux, construction des tronçons |
| `js/ui.js` | écrans, compteurs, langue, record |
| `js/game.js` | machine à états et boucle principale |

**Pour régler le jeu, on n'ouvre que `config.js`.** Rien d'autre ne contient de
nombre de gameplay.

### Protocole avec la ferme

```
ferme -> défi : { type:"vf-run-init", lang, best,
                  skin:{ gender, shirt, pants, hair, skin } }
défi -> ferme : { type:"vf-run-ready" }
                { type:"vf-run-over",   score, candies, distance, cause }
                { type:"vf-run-escape", score, candies, distance }
                { type:"vf-run-exit" }
```

`skin` tranche le point d'architecture laissé ouvert au §8 du contexte : c'est
la **tenue** qui voyage, pas une image de sprite. Le défi ne peut pas lire
`fermeArt.js`, mais quatre couleurs et un genre suffisent à rhabiller son
squelette 3D — et le jour où Carla vendra des chapeaux, on ajoute un champ ici.

`vf-run-escape` obéit à la règle **inverse** de `vf-run-over` : il part à la fin
du fondu, sans écran intermédiaire. Le joueur n'a pas de score à encaisser du
regard — il a fui, et le rythme doit rester celui d'une fuite.

`vf-run-over` part quand le joueur ferme l'écran de fin, pas à sa mort : il doit
pouvoir lire son score avant que la ferme enchaîne son fondu au noir. Les deux
côtés vérifient `event.origin` — la page est servie par la ferme, donc même
origine.

---

## Vérification

Onze scripts Node, depuis ce dossier. Aucune dépendance, moins de 40 secondes
en tout — **les relancer tous à chaque livraison**. Un outil qu'on saute n'est
pas un filet de sécurité, c'est un fichier mort (leçon du zip 375).

```
node tools/verify-fairness.js    # équité de la génération (≈ 21 700 km)
node tools/simulate-run.js       # 120 parties complètes, sans navigateur
node tools/smoke-render.js       # rendu exercé avec un faux Three.js
node tools/check-strings.js      # parité FR/EN + ui.js exécuté contre un faux DOM
node tools/verify-offroad.js     # la bifurcation, vérifiée en la JOUANT (zip 377)
node tools/verify-skin.js        # la tenue du joueur, de la ferme au défi (zip 377)
node tools/render-runner.js      # fermier, flammes ET chaussée 3D en PNG — À REGARDER (377/379)
node tools/render-textures.js    # toutes les textures peintes en PNG — À REGARDER (zip 379)
node tools/verify-deck.mjs       # la chaussée 2D : bord atteint, palettes accordées (zip 378)
node tools/render-jetty.mjs      # rend la chaussée 2D en PNG — À REGARDER (zip 378)
```

`verify-fairness.js` ne vérifie pas une règle arbitraire mais une **simulation
de disponibilité** : chaque parade occupe le joueur pendant une durée connue
(saut 0,71 s, glissade 0,62 s, voie 0,20 s), et à 34 u/s un saut consomme 24
unités de piste. L'espacement minimal entre obstacles est donc *calculé* à
partir de la physique du joueur, pas choisi à la main.

`verify-offroad.js` suit le même principe : il ne relit aucune condition, il
**joue**. Il fait prendre la sortie à un joueur, déroule la séquence image par
image, et vérifie ce qui est arrivé — cadence tenue sans dérive, aucun appui
latéral *nécessaire* dans la fenêtre d'armement (donc aucune sortie
accidentelle possible), meute jamais posée sur la branche et toujours en train
de s'éloigner, bout de la branche jamais atteint, score bien figé au virage.

`render-textures.js` fournit un contexte 2D assez complet (dégradés, tracés,
arcs, alpha) pour rejouer **toutes les fonctions de peinture** de world.js et
les écrire en PNG : le ciel, les neuf pavés, les dalles AA, la bordure, les
arbres. Jusqu'au zip 379, aucun de ces dessins n'était visible ailleurs que
dans une partie.

`render-runner.js` **rend en PNG** (rasteriseur maison, zéro dépendance) le
fermier 3D sous trois angles et trois poses pour les deux genres, et les
quatre découpes de flamme de torche avec leur cœur. Il ne prouve rien : il
donne à regarder. **Trois** corrections du zip 377 viennent de là, et aucune ne
levait la moindre erreur : la nuque du fermier posée du côté du visage depuis
le zip 374, les mèches longues qui mangeaient le profil, et la flamme peinte à
l'envers (ventre en haut, pointe sur la mèche — un panache de fumée suspendu
au-dessus du bâton).

`render-jetty.mjs` fait pour la carte 2D ce que `render-runner.js` fait pour
le fermier : il rejoue la vraie génération et le vrai dessin contre un
contexte 2D maison (fillRect seul, zéro dépendance) et écrit un PNG de la rive
est. Les quatre corrections de la chaussée du zip 378 — pierre trop claire,
fêlures en vermisseaux, bordures illisibles, halos en rectangles emboîtés —
viennent toutes de là.

Côté ferme, `verify-gate` (dans le zip de livraison) refait un parcours en
largeur depuis l'arrivée du monde sombre jusqu'à la porte, avec le vrai test de
collision du jeu, sur les six cartes.

---

## Ce qui reste à faire

- ~~**Les torches flottantes**~~ : *fait au zip 379* — chaque torche est portée
  par un pilier de pierre qui descend jusqu'à la chaussée, et `smoke-render.js`
  vérifie cette continuité pour CHACUNE, sur les deux extrêmes du fondu. C'est
  ce contrôle qui a trouvé le mât suspendu 34 cm au-dessus de son propre pilier.
- ~~**Le sprite du fermier**~~ : *fait au zip 377* — il porte la tenue et le
  genre du joueur. Reste une silhouette en boîtes articulées, mais c'est
  désormais un choix (l'animation du zip 374 en dépend), plus un placeholder.
- **Les loups** : trois boîtes noires à yeux rouges. Le sprite existe dans
  `fermeArt.js`.
- **Le décor** : arbres morts, colonnes, runes sont des boîtes. La palette, elle,
  est la bonne (relevée dans `drawEvilFrame`). Les **torches** font exception
  depuis le zip 377 : fût + tête carbonisée + corps de flamme peint + cœur
  additif, avec quatre découpes, quatre jeux d'oscillateurs par flamme et
  quatre cadences de respiration — deux torches ne vacillent jamais ensemble.
  Financé en ramenant `DECOR_PROPS` de 14 à 12 et `TREE_BRANCHES` de 3 à 2.
- **Le son** : rien.
- **Les bonbons** : ramassés et comptés, mais on n'en fait encore rien.
- **La progression de la meute** : `CHASE_RECOVER` et `CHASE_LOSS_ON_STUMBLE`
  sont fixes du début à la fin d'une course (voir l'audit).
