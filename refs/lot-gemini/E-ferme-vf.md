# E — LA FERME (VF) : arbres, cultures, vergers, icônes (P3 — SAUF LES ARBRES, qui sont P1 : voir B)

⚠️ **Décision d'orientation, à votre charge** (`00-LISEZ-MOI.md` §5, n° 1) : la ferme reste-t-elle en PIXEL ART (le grain de 16 px
d'aujourd'hui) ou passe-t-elle à l'image peinte « au pixel d'écran » comme VT ? Tout ce fichier suppose le **pixel art** : un
sol ou des arbres peints à côté de sprites pixel se verraient comme deux mondes. Si vous choisissez le peint, remplacez le
prompt MAÎTRE PIXEL ci-dessous par le MAÎTRE PEINT (fin du fichier) ; les lignes d'objets ne changent pas.
**Pas de prompt pour** : les animaux (cheptel refait au zip 369 sur vos maquettes validées), les personnages, la faune, l'eau.

## Références à joindre, DANS CET ORDRE
1. `refs/Code_Generated_Image.png` puis 2. `refs/planche2.png` — vos deux planches (le grain, la palette, le trait).
3. la capture de la ferme du sujet (`cap-vf-02-champs.png` pour les cultures, `cap-vf-03-arbres-ferme-*.png` pour les arbres,
   `cap-vf-05-verger.png` pour les vergers) — **le pas de pixel RÉEL du jeu** : `Image 3 is a screenshot of the actual game: every pixel block of the new art must have exactly the same size as in this screenshot.`

## PROMPT MAÎTRE PIXEL (à coller, puis la liste dans le même message)
```
Pixel art sprite sheet for a cozy top-down farming game, in exactly the same style as the attached reference sheets: same pixel size, same kind of palette (warm, slightly muted, with dark outlines), same three-quarter top-down view, light from the top-left, and the same soft grey contact shadow under each object where the references have one.

Layout rules, very important:
- flat pure magenta (#FF00FF) background everywhere, no ground, no grass, no texture, no gradient;
- every object drawn ONCE, separated from the others by at least one object-width of empty magenta, nothing touching, nothing overlapping;
- no text, no labels, no numbers, no frames, no grid lines; no magenta or saturated pink on the objects themselves;
- objects seen from the front and slightly from above, never from the side.

Draw these objects:
```
Si les objets se touchent, si le fond n'est pas uni, si le pixel n'est pas celui des références : les trois corrections de
`refs/prompts-planche3.md` (même texte).

## E1 — LES ARBRES DE LA FERME (P1) : chêne en cinq états, pin, mort, souche
Défauts à résoudre : les chênes de la ferme restent verts l'hiver (dette connue) et leur chute d'automne se ronge, comme à VT.
```
0. SCALE REFERENCE: the plain wooden bench from the first reference sheet, redrawn identically, same size, pixel for pixel.
1. ONE oak tree drawn FIVE times in one row, left to right, all the same size (about 3 tiles wide and 4 tiles tall at the game's pixel size), trunk bases on one common line. It is the SAME tree each time: the trunk and every limb are IDENTICAL, pixel for pixel, in all five. It must have a REAL branching structure (a trunk dividing into thick limbs that fork into twigs), not a ball on a stick.
   (a) summer: full dense green crown;
   (b) spring: bright fresh yellow-green with a few pale catkins;
   (c) autumn: full dense crown of russet orange and gold;
   (d) mid-fall: about half of the leaves gone, the crown broken into separate clumps of autumn leaves each attached to a visible twig, the branch skeleton visible between them, the outer outline unchanged;
   (e) winter: bare, all leaves gone, the full branching skeleton visible, a dense twiggy crown whose outline matches the leafy crown.
2. ONE pine tree, same size as the oak, evergreen, a clearly layered crown and a visible reddish trunk.
3. ONE dead leafless tree: grey weathered trunk, broken limbs, a snapped crown.
4. ONE tree stump with visible growth rings, a little moss, one small mushroom.
```
**Si le squelette dérive d'une version à l'autre** : `Redo the oak row. The trunk and limbs must be exactly the same pixels in all five versions; only the leaves change.`
Si Gemini n'y arrive pas pixel pour pixel, me rendre les deux meilleures planches : je peux aligner le tronc de la version nue sur les
autres (c'est du travail de pixels, pas de prompt).

## E2 — LES CULTURES (neuf rangées, UNE conversation par culture) : 9 cultures × 5 stades
`CROP_STAGES = 5` (stade 4 = mûr). Chaque sprite se pose sur la terre labourée dessinée à part : **pas de terre, pas de sol** sur la planche.
Maître PIXEL puis :
```
0. SCALE REFERENCE: the plain wooden bench from the first reference sheet, redrawn identically, same size, pixel for pixel.
1. ONE crop drawn in FIVE growth stages in one row, left to right, same scale, each centred in an equal cell of exactly one tile (16x16 game pixels; tall crops may rise into the cell above), no soil under them:
   stage 0, freshly sown: a tiny mound with one or two tiny sprouts;
   stage 1: a seedling;
   stage 2: half grown;
   stage 3: nearly ripe;
   stage 4: ripe, ready to harvest, clearly different and richer than stage 3.
   The crop: [ligne]
```
Lignes `[ligne]` (images 3 : `cap-vf-02-champs.png` pour l'empreinte et la hauteur actuelles de chaque stade) :
- **navet** : `a turnip: green leafy tops, a purple-and-white round root half out of the soil at the ripe stage.`
- **pomme de terre** : `a bushy dark-green leafy potato plant, pale violet flowers at stage 3, yellowing leaves and two or three pale tubers pushed out of the soil at stage 4.`
- **tomate** : `a tomato vine tied to a wooden stake, green tomatoes at stage 3, glossy red tomatoes at stage 4.`
- **citrouille** : `a sprawling pumpkin vine with big leaves, a small green pumpkin at stage 3, a large orange pumpkin at stage 4.`
- **blé** : `wheat: green blades growing into stalks, at stage 4 heavy golden ears bending.`
- **maïs** : `corn: a tall stalk with long arching leaves; stage 4 has two cobs with golden kernels and silky tassels (up to two tiles tall).`
- **navet doré** : `a golden turnip: like the turnip but the root is shiny gold; at stage 4 a few small sparkles around it.`
- **baie étoilée** : `a small bush bearing star-shaped berries; at stage 4 the berries are glowing blue-violet with a soft halo (the glow is part of the sprite).`
- **canne à sucre** : `sugar cane: tall slender jointed green canes with long arching leaves; at stage 4 tall amber-green canes about two tiles high.`

## E3 — LES VERGERS (quatre rangées, 4 stades chacune : 0 plant, 1 jeune, 2 adulte, 3 en fruits)
Maître PIXEL puis la même structure qu'E2 (cinq cellules → quatre), avec :
- **citronnier** : `a lemon tree: a sapling tied to a stake, a young tree, an adult tree with glossy dark-green leaves, the same adult tree loaded with bright yellow lemons. About two tiles wide, three tall at the adult stages.`
- **fraisier** : `a strawberry plant: a young plant, a leafy plant, a flowering plant with small white flowers, a fruiting plant with red strawberries. One tile.`
- **framboisier** : `a raspberry bush: a cane sapling, a young bush, an adult leafy bush, the bush with red raspberries. One to two tiles.`
- **myrtillier** : `a blueberry bush: a sapling, a young bush, an adult dense bush, the bush with blue berries. One to two tiles.`

## E4 — LES SOLS DE LA FERME (seulement si vous choisissez le « peint » — décision 1)
Même méthode que `A-sols-vt.md` (repeindre la tuile actuelle en gardant son plan) ; il faudra d'abord que je vous exporte les tuiles
de la ferme (herbe, terre labourée, arrosée, sable, chemin, chemin de pierre) comme j'ai exporté celles de VT. **Rien à préparer avant.**

## E5 — LES ICÔNES (P3) : cultures, fruits, produits d'élevage, poissons
Une planche, maître PIXEL, **chaque icône sur sa case d'un seul bloc, vue de face, 16 × 16 pixels de jeu, contour sombre** :
```
0. SCALE REFERENCE: the plain wooden bench ... (as above).
Icons, each in an equal square cell, all the same size, a dark outline, no shadow:
turnip, potato, tomato, pumpkin, wheat sheaf, corn cob, golden turnip, star berry, sugar cane stalk, lemon, strawberry, raspberry, blueberry, egg, goat milk bottle, wool ball, truffle, milk bottle, roach, trout, pike.
```
(Les icônes actuelles existent en code : ne les refaire que si vous les trouvez en dessous.)

## E6 — BÂTIMENTS ET DÉCOR DE LA FERME (seulement si vous les jugez en dessous ; non demandé)
Maison, grange, moulin, sucrerie, puits, bac de vente, épouvantail, chaudron, clôtures, lampadaire, gare. Ils restent en pixel art
tant que la décision 1 n'est pas prise. Si vous les voulez refaits : une planche pixel par famille (bâtiments : une seule image chacun
avec le MAÎTRE PIXEL ; décor : planche de 6) ; me dire lesquels.

## MAÎTRE PEINT (seulement si la ferme passe à l'image peinte) — à la place du MAÎTRE PIXEL
Le MAÎTRE OBJETS de `C-objets-vt.md` (maison peinte en image 1, capture de la ferme en image 2). Mêmes lignes d'objets, mêmes
règles de fond magenta ; cadrage des arbres de `B-arbres.md`.
