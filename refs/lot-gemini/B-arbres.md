# B — LES ARBRES (VT ET FERME) : même arbre, quatre saisons, UN SQUELETTE (P1)

## Le défaut, et la parade
Les arbres actuels sont des « sucettes » (une boule verte sur un fût, voir `arbres-ref/arbre-chene-ete-actuel.png`) et
leur chute d'automne dessine une couronne qui se ronge : l'arbre n'a pas de charpente cachée sous ses feuilles à dévoiler.
**La parade : trois images du MÊME arbre, avec le MÊME tronc, les MÊMES branches, au pixel près** — feuillu d'automne,
à moitié dégarni, NU. Le jeu fait tomber les feuilles par bouquets et dévoile le squelette, qui existait déjà dessous : la
forme ne change jamais, seules les feuilles partent. Même méthode pour le printemps (fleurs) et l'été (ancre).
⚠️ Tout dépend de la **fidélité du squelette d'un état à l'autre** : toujours dans la MÊME conversation, en re-joignant l'ancre.

## Cadrage imposé (l'arbre se pose par mesure, pas à l'œil)
Les arbres du jeu sont 48 × 64 px d'art (3 cases de large, 4 de haut) ; l'image peinte doit s'y superposer.
- Toile **portrait 3:4** (idéal 1536 × 2048). Arbre **centré** horizontalement.
- Couronne ≈ **80 %** de la largeur, jamais au contact des bords ; sommet à ≈ **10 %** du haut.
- **Pied du tronc** (évasement des racines) à **90 %** de la hauteur, centré. En dessous : magenta, rien d'autre.
- Un personnage du jeu ferait ≈ 40 % de la hauteur de l'arbre (ne pas en dessiner).
- Conifères : même toile, couronne conique centrée ; cyprès : colonne étroite (≈ 40 % de la largeur).

## Références à joindre, DANS CET ORDRE (une conversation neuve par ESPÈCE)
1. `arbres-ref/arbre-<espèce>-<saison>-actuel.png` — l'arbre ACTUEL à repeindre. Noms : `chene`, `erable`, `bouleau`, `cerisier`,
   `mimosa`, `pin`, `cypres`, `pommier`, `saule`, `magnolia`, `sapin` (les cinq derniers sont ceux de VOS planches — celles que
   vous aimez) ; `pommier-code`, `saule-code`, `magnolia-code`, `sapin-code` sont les anciens dessins en code, à ignorer.
   Ignorer l'ellipse grise au pied (c'est l'ombre du jeu).
2. `refs/maison-s1.jpg` — la finesse de peinture à atteindre.
3. `captures/cap-vt-07-arbres-ete.png` — la caméra et l'échelle réelles du jeu (rien d'autre n'y est à copier).
4. **Pour le saule, le pommier, le magnolia, le sapin** : ajouter `refs/Code_Generated_Image.png` et `refs/planche2.png`
   (vos planches) et dire : `The author loves the [willow] in image 4: keep its exact silhouette and personality.`

## ÉTAPE 1 — PROMPT MAÎTRE, L'ANCRE D'ÉTÉ (à coller tel quel, puis la ligne de l'espèce juste après)

```
Detailed pixel-art painting of ONE tree, for a 2D top-down village game.

REFERENCES: image 1 is the CURRENT low-detail pixel-art version of this exact tree (ignore the grey ground ellipse at its foot). Repaint THIS tree: keep its species, its overall silhouette, its proportions, its position in the frame and its general colours, but at a far higher level of detail and with a real woody structure. Image 2 is a finished painted house of the same game: match it exactly for painting finesse, edge sharpness, outline thickness, colour richness and lighting. Image 3 is an in-game screenshot: use it ONLY for the real camera and scale, copy nothing else from it.

CAMERA: the same as image 2: a front elevation of the tree with only a slight top-down tilt (you see a little of the crown's upper surface). Vertical trunk, no perspective distortion, not isometric, not seen from a corner.

FRAMING (very important, the tree will be placed by measurement): portrait 3:4 canvas. The tree is exactly centred horizontally. The crown is about 80% of the image width and never touches an edge; its top is about 10% below the top edge. The trunk base, with its root flare, sits at 90% of the image height, centred. Below it: flat magenta, nothing else. A person would reach about 40% of the tree's height (do not draw a person).

LIGHT: daytime, neutral light from the upper left. Soft self-shading inside the crown: leaf clumps lit on their upper-left side and darker underneath. NO cast shadow on the ground, no ground, no grass, no roots spreading on a floor.

BACKGROUND: flat, uniform, pure magenta #FF00FF everywhere around the tree, also in any gap between branches or leaves. No gradient, no floor, no shadow. No magenta or saturated pink anywhere on the tree itself: blossoms stay white or pale pink. No text. Highest resolution.

THE TREE (this description wins over everything above):
```

### Lignes de l'ESPÈCE (ancre d'été)
- **chêne** : `a mature oak in full summer foliage. A short, massive trunk with deeply furrowed dark bark that divides at about one third of the tree's height into four or five thick twisting limbs, partly visible through the lower crown. A broad, rounded, slightly irregular crown made of many overlapping lobed leaf clumps in several greens: deep shadowed greens underneath, bright yellow-greens on top. A few knots and a little moss at the foot of the trunk.`
- **érable** : `a mature maple in full summer foliage. A straight dark-grey furrowed trunk, main limbs branching at regular intervals, a dense symmetrical oval crown with a slightly pointed top. Palmate five-pointed leaves visible at the edges of the clumps, rich medium green, a few lighter.`
- **bouleau** : `a mature silver birch. A slender, slightly leaning trunk with white bark marked with black horizontal lenticels and a few peeling curls; slender ascending limbs; a light, slightly irregular oval crown of small triangular leaves in fresh light yellow-green, with drooping twig tips and a lighter, airier edge.`
- **saule** (pleureur) : `a weeping willow. A thick gnarled trunk splitting into several limbs under a domed crown, from which hundreds of long thin hanging branches fall like a curtain, their lower edge ending at about 85% of the image height; narrow lance-shaped leaves in two greens; the curtain slightly irregular with a few gaps.`
- **cerisier** : `an ornamental cherry in full summer foliage. A short trunk with smooth reddish-brown bark and horizontal lenticels, a wide spreading vase-shaped crown, wider than tall, oval serrated leaves in deep green with a bronze tint on the top clumps.`
- **pommier** : `an old apple tree. A low, stout, twisted trunk with gnarled limbs, a wide round crown of oval medium-green leaves, about twelve small red apples visible in the crown.`
- **magnolia** : `a saucer magnolia in summer. A short multi-stemmed trunk with smooth silver-grey bark, a broad rounded spreading crown of large glossy oval dark-green leaves.`
- **mimosa** (persistant) : `a silver wattle (mimosa). A slender trunk with thin grey-green bark, a flat-topped crown in layered horizontal tiers of feathery blue-green foliage.`
- **sapin** : `a mature spruce. A straight reddish trunk visible only at the foot; a conical crown of drooping layered branches in deep blue-green, each tier clearly separated, branch tips lighter.`
- **pin** : `a Scots pine. A tall trunk with scaly reddish-orange bark, bare in its lower two thirds, topped by flat layered tufts of blue-green needles forming an irregular umbrella.`
- **cyprès** : `a tall slender Italian cypress: a narrow flame-shaped column of dense dark-green foliage, almost no trunk visible, about 40% of the image width.`

Conifères et mimosa : **un seul état** (ancre) + le printemps du mimosa. Passer directement à l'ÉTAPE 5.

## ÉTAPE 2 — PRINTEMPS (même conversation ; re-joindre l'ancre peinte ; 2e image = l'arbre actuel au printemps, pour la palette seulement)
Début commun : `Start again from the attached painted tree (image 1). Keep exactly this tree: same trunk, same limbs, same silhouette, same size, same position in the frame, same camera, same light, same magenta background. Only the foliage and flowers change. Image 2 shows the current low-detail version in spring: use it only for the colour scheme.` puis :
- **chêne** : `Young, freshly opened bright yellow-green leaves, a few pale hanging catkins, the crown slightly less dense so that the limbs show a little more.`
- **érable** : `Fresh lime-green leaves, small reddish-yellow flower clusters among them.`
- **bouleau** : `Fresh pale green small leaves and long yellow-brown catkins.`
- **saule** : `A fresh pale yellow-green curtain, slightly thinner.`
- **cerisier** : `The crown covered in a cloud of pale pink-white blossom (about 85% blossom, 15% fresh bronze-green leaves). Pale pink and white only, never saturated pink or magenta.`
- **pommier** : `White and pale pink blossom clusters among fresh leaves; no apples.`
- **magnolia** : `Flowers before leaves: about seventy large cup-shaped white flowers with pale pink bases on the grey branches, only a few young leaves. Never magenta.`
- **mimosa** : `Covered in dense bright yellow fluffy pompoms among the blue-green foliage.`

## ÉTAPE 3 — AUTOMNE PLEIN (même conversation ; re-joindre l'ancre ; 2e image = l'arbre actuel en automne, palette seulement)
Début : le même que le printemps, puis :
- **chêne** : `All leaves turned: russet orange, golden brown, bronze, a few olive leaves remaining, rich variation clump to clump. The crown stays fully dense.`
- **érable** : `Brilliant scarlet and orange with some yellow. Fully dense.`
- **bouleau** : `Bright golden yellow with a few amber leaves. Fully dense.`
- **saule** : `A pale yellow-gold curtain, still full.`
- **cerisier** : `Deep orange-red and bronze. Fully dense.`
- **pommier** : `Yellow-green to gold leaves with a few red apples still hanging. Fully dense.`
- **magnolia** : `Dull gold-brown and olive large leaves. Fully dense.`

## ÉTAPE 4 — LES DEUX ÉTATS QUI COMPTENT : MI-CHUTE, puis NU (même conversation ; re-joindre l'ancre D'ÉTÉ)

### 4a — NU (à faire AVANT la mi-chute : c'est le squelette de référence)
```
Start again from the attached painted tree (image 1). Same tree, same trunk, same camera, same size, same position in the frame, same light, same magenta background. ALL the leaves are gone, and all flowers and fruit. Show the complete branching skeleton: the limbs you saw forking under the leaves continue upward and outward into a dense, natural, richly ramified crown whose OUTER ENVELOPE has the same size and the same shape as the leafy crown (the tips of the twigs reach the same outline). It must read as the SAME tree undressed: NOT a thin stick-tree, NOT a crown that looks eaten away. Every fork of the trunk and of the main limbs stays exactly where it was; the finest twigs are numerous, hundreds of them, and fill the same rounded volume. Fine bark texture, a little moss on the north side of the trunk. No leaf on any branch, no leaf on the ground, no snow, no ground.
```
puis la ligne du caractère de l'espèce :
- **chêne** : `Thick gnarled zigzag limbs, a very dense twiggy crown, heavy and rugged.`
- **érable** : `Straight upright limbs dividing in opposite pairs, a tight oval of fine twigs.`
- **bouleau** : `White trunk with black marks, slender ascending limbs, fine drooping twigs in an airy but voluminous oval.`
- **saule** : `A curtain of long thin pale yellow-brown whip-like twigs still falling to about 85% of the image height, from the same gnarled trunk.`
- **cerisier** : `Wide spreading limbs with horizontal lenticels, zigzag twigs.`
- **pommier** : `Low gnarled twisted limbs, many short spurs, a round crown.`
- **magnolia** : `Thick smooth grey limbs spreading widely, with fat furry flower buds at the tips of the twigs.`

### 4b — MI-CHUTE (re-joindre l'ancre ET l'arbre NU que vous avez gardé)
```
Start again from the attached painted tree (image 1, summer) and the attached bare version (image 2). Same tree, same trunk, same limbs, same silhouette, same size, same position, same camera, same light, same magenta background. It is late autumn and about HALF of the leaves have fallen. The crown is broken into separate irregular clumps of autumn-coloured leaves still clinging to the branches, with the branch structure of image 2 clearly visible between and through the clumps (forked limbs and thin twigs exactly where they are in image 2). Every remaining clump is ATTACHED to a visible twig. The outer envelope is unchanged: the bare twig tips reach the same outline as the leafy crown. No leaf floating in the air, no leaf on the ground, no snow, no ground.
```
puis la couleur de l'espèce (les mêmes qu'à l'étape 3 : chêne roux-bronze, érable écarlate, bouleau or, saule jaune-or, cerisier orangé, pommier or, magnolia brun-olive).

### Si le squelette dérive d'un état à l'autre (le défaut qui coûte tout)
`Redo it. The trunk and every limb must be in exactly the same position, thickness and shape as in image 1 (overlay them in your head: they must coincide). Only the leaves change.`
**Contrôle à l'œil avant de me les rendre** : mettre l'état nu et l'état feuillu en alternance ; les fourches du tronc doivent
rester au même endroit. Si elles bougent de plus d'un pouce d'écran, relancer.

## ÉTAPE 5 — CONIFÈRES, MORT, JEUNES, FEUILLES

- **Arbre mort** (verger abandonné, ruine, ferme) — même cadre, même BASE (sans image « actuelle ») : `a dead leafless tree: a weathered grey trunk, bare, broken limbs, a snapped crown, a few dead twigs, bark peeling, a little pale lichen; a hollow in the trunk. Strictly no leaves.`
- **Jeunes sujets** (P3) — 3 archétypes (feuillu rond, bouleau élancé, conifère), chacun en feuillu d'été ET en nu, même conversation : `Same species and style, but a young sapling about 60% as wide and 66% as tall as the mature tree: a thin trunk tied to a wooden stake with a rope, a small sparse crown. Same framing rules but scaled: the trunk base stays at 90% of the image height, centred.` (nu : la même ligne que 4a.)
- **Feuilles tombantes** (P2) — une planche, fond magenta, plus haute résolution : `A sprite sheet of single fallen leaves for a village game, painted pixel art at the finesse of the attached house. For each of six species (oak, maple, birch, willow, cherry, apple) draw four single leaves in different poses (flat, tilted, curled, seen edge-on), in the autumn colours of that species, each leaf about 6% of the image width; then three small piles of mixed autumn leaves, each about 20% of the image width. Flat pure magenta #FF00FF background, at least one leaf-width of empty magenta between any two items, nothing touching, no shadows, no text, no ground.` Puis, dans la même conversation : `Same sheet for spring: twelve pale pink-white cherry/apple petals in different poses, each about 4% of the image width, and eight small fresh green leaves.`

## Ce que je ferai avec ces images (pour que vous sachiez à quoi ça sert)
Fabriquer une image par cran de zoom (Lanczos, comme les maisons) pour chaque arbre et chaque état ; mesurer que le squelette
nu est INCLUS dans l'enveloppe feuillue (sinon des branches dépasseraient du feuillage) ; faire tomber les bouquets par un ordre
au pixel (déjà en place pour la neige) en fondant feuillu → mi-chute → nu ; garder le vent (cisaillement) tel qu'il est ;
dériver la neige, la pluie et la glace des mêmes images ; garder l'ancien dessin comme repli tant qu'une essence n'est pas
branchée. Ordre d'intégration : chêne, érable, bouleau (les plus fréquents), puis le reste.
