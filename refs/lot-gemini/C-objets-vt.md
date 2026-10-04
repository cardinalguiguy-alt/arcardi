# C — LES OBJETS DE VALLEY TOWN, PEINTS AU NIVEAU DES MAISONS (P2)

Le marché, la fontaine, le mobilier, les herbes hautes, les massifs, les roseaux, les arbustes, les pierres, le quai.
Même chemin que les lampadaires (`tools/build-lampadaires.mjs`) : une image par cran de zoom, posée à 1 px d'image = 1 px
d'écran. **Petites planches de 4 à 6 objets** (une planche de dix ferait des objets flous au zoom 5), plus haute résolution.

## Références à joindre, DANS CET ORDRE
1. `refs/maison-s1.jpg` — la finesse de peinture et l'angle de caméra.
2. la capture du lieu (`cap-vt-03-marche.png` pour le marché ; `cap-vt-02-place-civique.png` pour la fontaine ;
   `cap-vt-05-parc.png` pour les massifs et l'herbe ; `cap-vt-06-rive.png` pour roseaux et quai) — échelle et pose réelles.
3. (objets que vous aimez dans vos planches) `refs/Code_Generated_Image.png`, `refs/planche2.png`, `refs/ASSETS.jpg` — pour le
   caractère des objets, pas pour le pas de pixel : `Image 3 shows the character of objects the author loves: keep that
   charm, but paint at the finesse of image 1.`

**L'échelle** : 1 case ≈ 1,18 m ; un habitant mesure 1,70 m (23 px d'art). Chaque ligne donne la TAILLE RÉELLE ; je convertis.

## C0 — LES OBJETS DE JARDIN ET DE PLACE DÉJÀ EN JEU : LES MÊMES, BEAUCOUP PLUS DÉTAILLÉS (P1 — verdict du 2026-10-04)

Votre verdict : « les objets de jardin ne sont pas assez détaillés ». **Cause** : ils viennent des planches `refs/planche3-jardins.jpg` et `refs/planche3-place.jpg`, des pixel arts à GROS BLOCS
(8 à 12 px image par pixel de jeu : une boîte aux lettres = 11 × 20 pixels de jeu). Les poser au pixel d'écran, comme les lampadaires, **n'y ajouterait aucun détail : il faut les REPEINDRE**, au niveau des
maisons. Même méthode que les sols : on garde le dessin (forme, couleurs, proportions), on ajoute la matière. Les deux bancs écartés (« très bien comme ils sont ») et les lampadaires (déjà faits) n'y sont pas.

**Six feuilles de référence sont prêtes dans `objets-ref/`** (découpes propres de vos planches : objets séparés, fond magenta) :
| Feuille (fichier `objets-ref/jardin-…png`) | Objets |
|---|---|
| `J1-bois-linge` | abri à bûches sous auvent ; tas de bûches avec billot et hache ; corde à linge (drap, chemise, torchon) |
| `J2-boites-brouette-tonneau` | boîte aux lettres en tôle ; boîte rouge en bois peint ; boîte verte en fonte sur pilier ; brouette et pelle ; tonneau de chêne et arrosoir |
| `J3-table-bain-pots-balancoire-clapier` | table de jardin en fer forgé et ses deux chaises ; bain d'oiseaux ; pots d'herbes aromatiques ; clapier ; balançoire en bois |
| `J4-jardinieres-vases-place` | jardinière de pierre en été et en hiver ; vase de pierre en été et en hiver |
| `J5-ronces` | grand buisson de ronces ; petit buisson ; haie basse de ronces |
| `J6-grille-hautes-herbes` | grille en fer rouillée entre deux piliers de pierre fendus ; touffe de hautes herbes sauvages et de chardons |

**Références à joindre, DANS CET ORDRE** (une conversation neuve par feuille) : 1. `objets-ref/jardin-<feuille>.png` ; 2. `public/town/maison-s1-simple-day-z5.png` (le niveau de détail à atteindre, rien d'autre) ;
3. (facultatif) `captures/cap-vt-12-jardin.png` (ce que le jeu montre aujourd'hui).

### PROMPT — repeindre une feuille (à coller tel quel, puis la ligne « THE SHEET CONTAINS » de la feuille dans le même message)
```
Image 1 is a reference sheet of garden objects for a 2D village game, drawn at low detail in chunky pixel art. Image 2 is a finished painted house of the same game: use it ONLY as the target level of detail, sharpness, material richness and painting style.

TASK: repaint EVERY object of image 1 with far more detail and sharpness. Keep each object's design, shape, proportions and main colours, its exact viewpoint, and the arrangement on the sheet: same positions, same relative sizes, same spacing. This is a detail-and-sharpness upgrade, NOT a redesign: do not change what an object is, do not add objects, do not remove objects, do not change the viewpoint, do not change any object's silhouette proportions (width to height) by more than a few percent.

ADD real material detail at the finesse of image 2: wood grain, splits, knots, nail heads; metal wear, rust, rivets, hinges, latches, handles; rope and fabric fibres, stitching; stone texture, moss, lichen; leaves with veins; paint chips; soft self-shading; crisp clean edges. Painted pixel-art finesse (small deliberate brush texture). Not a photograph, not a smooth vector, no blur, no JPEG-like noise.

KEEP: flat, uniform, pure magenta #FF00FF background; no ground, no grass, no cast shadow on the ground (the game adds its own), no text, no letters, no labels, no frames; every object complete and uncropped, nothing touching, the same spacing between objects as in image 1; no magenta or saturated pink on the objects themselves; daylight from the upper left.
Output the largest resolution you can, with the same arrangement and the same aspect ratio as image 1.

THE SHEET CONTAINS:
```
- **J1** : `a roofed firewood shelter full of split logs; a loose pile of split logs with a chopping block and an axe stuck in it; a clothesline between two wooden posts with a white sheet, a blue shirt and a striped towel.`
- **J2** : `a dented grey tin mailbox with a red flag on a wooden stake; a painted red wooden mailbox with a small slanted roof on a post; a dark green cast-iron mailbox on an ornate iron pillar with brass details; a wooden wheelbarrow with a spade leaning against it; an oak rain barrel with iron hoops and a zinc watering can beside it.`
- **J3** : `a small round wrought-iron garden table with two matching chairs, painted white; a stone birdbath on a carved pedestal with a little water; a group of three terracotta pots with herbs (rosemary, basil, a small bay tree); a small wooden rabbit hutch on four legs with a wire mesh door; a wooden garden swing under an A-frame.`
- **J4** : `a large rectangular planter of carved light stone overflowing with summer flowers (geraniums, lavender, white daisies) and trailing ivy; the same planter in winter, dark soil with a small clipped evergreen tuft and dry brown stems; a tall classical stone urn on a square pedestal with red geraniums and trailing ivy; the same urn in winter with soil and a small evergreen tuft.`
- **J5** : `a tangled bramble thicket with arching thorny canes and a few dark berries; a smaller bramble clump; a long low overgrown bramble hedge-row.`
- **J6** : `an abandoned wrought-iron garden gate between two cracked stone pillars, flaking black paint, orange rust, one leaf hanging open on a broken hinge, a little ivy; a clump of tall dry wild grasses and thistles.`

**Corrections prêtes à coller** : un objet a changé de dessin → `Redo it. Keep every object exactly as designed in image 1: same shape, same parts, same colours, same viewpoint. Only the level of detail changes.` ;
la disposition a bougé → `Redo it with every object at the same position and the same relative size as in image 1.` ; trop photo → la correction n° 6 de `00-LISEZ-MOI.md`.
**Enregistrer sous** `refs/lot-gemini/objets/jardin-<feuille>-a.png` (et `-b`). Je découpe objet par objet (fond magenta), je mesure le rapport largeur/hauteur contre l'ancien sprite (l'emprise ne doit pas
changer), puis une image par cran de zoom, posée au pixel d'écran comme les lampadaires, derrière un repli sur l'ancien dessin.
**Suite (P2)** : les objets des planches 1 et 2 (bancs de bois et de pierre, bacs à fleurs, bonsaï, pot rose, haies, lavande, buisson doré, fleurs, nénuphars, roseaux, lanterne suspendue, lampe à huile…) — même méthode ;
je prépare leurs découpes quand J1 à J6 auront réussi.

## PROMPT MAÎTRE — planche d'objets (à coller tel quel, puis la liste de la planche dans le même message)

```
Detailed pixel-art painting of a small set of separate OBJECTS for a 2D top-down village game set in an old European harbour town.

REFERENCES: image 1 is a finished painted house of the same game: match it exactly for camera angle, painting finesse, edge sharpness, outline thickness, colour richness and lighting. Image 2 is an in-game screenshot showing the real scale and the way objects stand in the town (copy no building and no character from it). If an image 3 is attached, it shows the CHARACTER of objects the author loves: keep that charm, painted at the finesse of image 1.

CAMERA: every object is a front elevation with only a slight top-down tilt, exactly like the house in image 1: no side faces, no perspective, no corner view, vertical lines vertical.

SCALE: each object must be true to its stated real-world size (a village person is 1.70 m tall). Draw ALL objects at the SAME scale, the same pixels per metre, so they can be compared on one sheet.

LAYOUT: flat, uniform, pure magenta #FF00FF background; every object drawn ONCE, complete and uncropped, separated from the others by at least half an object-width of empty magenta, nothing touching, nothing overlapping. No ground, no grass, no cast shadow (the game adds its own), no text, no letters, no numbers, no labels, no frames. Signboards and chalkboards stay blank. No magenta and no saturated pink on the objects themselves.

LIGHT: daytime, neutral, from the upper left; soft self-shading.

Highest resolution. Draw these objects:
```

## C1 — MARCHÉ, LES ÉTALS (une planche de 6) — les étals sont VIDES de vendeur (ce sont les joueurs qui vendent)
Chaque étal : 2,4 m de large, 2,3 m de haut avec l'auvent, comptoir de bois sur tréteaux, auvent de toile à bord festonné.
```
1. A vegetable stall: striped green-and-white canvas awning; crates and baskets of carrots, leeks, cabbages, beetroots, a hanging brass scale.
2. A fruit stall: red-and-white awning; baskets of apples, pears and lemons.
3. A fishmonger's stall: blue-and-white awning; fish on crushed ice in shallow wooden trays, a few crabs.
4. A baker's stall: ochre awning; loaves, baguettes and pies on tiered racks.
5. A cheese and dairy stall: cream awning with a brown edge; wheels of cheese, butter blocks, two milk churns.
6. A florist's stall: pale-green awning; buckets of tulips, daisies and lavender.
Each stall is 2.4 m wide and 2.3 m tall including its awning. No seller, no customer.
```

## C2 — MARCHÉ, LE RESTE (une planche de 6)
```
1. A market arch: a wooden arch with iron brackets spanning 3.6 m and 3.4 m tall, with a blank hanging signboard in its middle and a short string of unlit round festoon lamps.
2. A hand flower cart: a two-wheeled wooden cart 1.6 m long, 1.2 m tall, overflowing with mixed flowers.
3. Three oak barrels with iron hoops of three sizes (0.7 m, 0.9 m, 1.1 m tall).
4. A stack of grain sacks in three poses: one standing, two leaning, one flat (about 1 m wide in all).
5. A pile of wooden crates, five crates stacked unevenly, 1.0 m tall.
6. A small newspaper kiosk: 1.8 m wide, 2.6 m tall, a little pitched roof, a hatch window, painted dark green; blank signboard.
```

## C3 — LE MOBILIER URBAIN (planche de 6)
```
1. A wooden finger-post signpost 2.6 m tall with three blank arrow-shaped plates pointing in different directions.
2. A cast-iron bollard, 0.8 m tall, dark green with a small brass cap.
3. A cast-iron street litter bin, 0.9 m tall, round, dark green with gilt rim.
4. A stone drinking fountain, 1.2 m tall, with an iron spout and a small basin, a little moss.
5. A bicycle stand with two old bicycles leaning in it, 1.8 m wide.
6. A wooden notice board on two posts, 1.6 m wide, 2.0 m tall, with several blank pinned sheets of paper.
```

## C4 — TERRASSE DE CAFÉ ET DE RESTAURANT (planche de 6) — mobilier inoffensif, indépendant de la conception du café
```
1. A round bistro table for two, 0.7 m across, zinc top on a cast-iron pedestal.
2. Two bentwood bistro chairs: one seen from the front, one turned slightly.
3. A large round terrace parasol, 3.0 m across, striped cream and sage green, on a pole, with a scalloped edge.
4. A set of two small square restaurant tables with white tablecloths, 0.8 m, each with a candle in a glass.
5. A blank A-frame chalkboard menu stand, 0.6 m wide, 1.1 m tall (the board stays blank).
6. A long wooden planter box, 1.2 m, with herbs and small white flowers.
```

## C5 — LA FONTAINE (une image seule, plus haute résolution) — emprise 2 × 2 cases (≈ 2,4 m)
```
ONE stone fountain for a town square, 2.4 m wide at the basin and 3.0 m tall: a shallow round basin of carved light stone, a central tiered pedestal rising to a small finial. The water in the basin is a calm flat pale blue surface, with no jets, no splashes, no ripples (the game animates them). A little moss near the waterline, tiny chips on the stone. No statue, no text.
```
(Je compose la rosace de pavés — voir `A-sols-vt.md` — autour d'elle.)

## C6 — HERBES HAUTES (3 planches : printemps, été, automne ; l'hiver est dérivé)
Joindre en plus les trois planches déjà faites : `refs/herbe haute simple.jpg`, `refs/herbe-haute-pliage.jpg`,
`refs/herbe-haute-tailles.jpg` : `Images 3 to 5 are the previous tall-grass sheets of the game: make NEW variants with more variety, no two tufts with the same silhouette.`
```
A sheet of twelve separate tufts of tall grass seen from the front, painted at the finesse of image 1, no ground: small round, small upright, medium round, medium spreading, medium upright, big round, big spreading, big upright, low and flat, resting (slightly collapsed), bent to the left by wind, bent to the right by wind. Heights from 0.4 m to 1.1 m. Individual blades with lighter tips and darker bases, a few seed heads.
```
puis la saison : **printemps** `Fresh bright green, with a few white daisies and yellow buttercups among the blades.` · **été** `Deep rich green, many feathery seed heads.` · **automne** `Straw, gold and russet, dry seed heads, a few green blades at the base.`

## C7 — MASSIFS FLEURIS (TUILES vues du dessus, plein cadre, 1024 × 1024, bouclant) — cinq espèces
Joindre l'image de référence du massif actuel (capture `cap-vt-05-parc.png`) et la maison. Prompt maître :
```
A seamless 1024x1024 flowerbed texture seen from above (a very slight tilt), painted pixel art at the finesse of image 1, filling the whole square edge to edge, repeating without a visible seam, flat neutral daylight, no cast shadows, no ground outside the bed, no people, no text. Dark rich garden soil is visible between the plants.
THE BED:
```
- **marguerites** : `a low carpet of white daisies with yellow hearts over dark green leaves.`
- **tulipes** : `tall red and pink tulips in tight clumps, with long green leaves.`
- **lavande** : `purple lavender spikes over grey-green foliage.`
- **forsythia et soucis** : `yellow forsythia sprays and golden marigolds.`
- **prairie** : `a loose wild meadow of four colours: white, yellow, soft pink and lilac flowers, nothing aligned.`
Saisons (même conversation, re-joindre le massif d'été) : **printemps** `Same bed in early spring: fewer flowers, many fresh green shoots, more bare soil.` · **automne** `Same bed in autumn: faded flowers, rusty seed heads, some stems browning.` · **hiver** `Same bed in winter: stems cut back to a few centimetres, bare soil with straw mulch.`

## C8 — ROSEAUX ET BERGE (une planche d'été, une d'automne)
```
1. A tall reed tuft, 1.6 m tall, upright.
2. A medium reed tuft, 1.2 m tall, leaning slightly.
3. A small reed tuft, 0.8 m tall.
4. A clump of cattails (bulrushes), 1.5 m tall, with brown velvet heads.
5. Three floating water-lily pads with one white flower (about 1 m across in all).
6. A clump of yellow flag iris in flower, 0.9 m tall.
```
Automne : `Same sheet in autumn: the reeds straw-coloured and brown, cattail heads fluffing, the lily pads yellowing, the irises seed pods, no flowers.`

## C9 — ARBUSTES (une planche de 6)
```
1. Three clipped boxwood balls of different sizes (0.5 m, 0.7 m, 0.9 m).
2. A hydrangea bush in flower, 1.1 m tall, blue and white blooms.
3. A rhododendron bush, 1.3 m, with dark glossy leaves and a few soft white blooms.
4. A lavender clump, 0.7 m, in flower.
5. A rose bush, 1.2 m, with red and cream roses and thorny stems.
6. A yellow forsythia bush in flower, 1.6 m, arching branches.
```

## C10 — PIERRES (une planche de 6)
```
1. A large mossy boulder, 1.4 m wide.
2. A medium weathered boulder, 0.9 m wide, a little lichen.
3. A small rounded boulder, 0.5 m.
4. Four flat stepping stones, each 0.6 m, seen slightly from above.
5. A small cairn of five stacked stones, 0.7 m.
6. A broken old stone pillar fragment, 0.8 m, with a little ivy.
```

## C11 — LE QUAI (une planche de 6)
```
1. A cast-iron mooring bollard, 0.6 m tall.
2. A coil of thick rope on the planks, 0.8 m across.
3. A fishing net drying on a wooden rack, 2.0 m wide, 1.6 m tall.
4. Three wicker lobster pots stacked, 1.0 m tall.
5. A crate of silver fish on ice, 0.8 m wide.
6. A pair of oars leaning against a post, 2.2 m tall.
```

## C12 — FANIONS (une planche) — « fanions figés » : trois poses pour les animer
```
Three strings of festival bunting, each 3.0 m long, hanging in a gentle curve between two ends, small triangular flags in cream, sage green, ochre and brick red, the same string drawn in three poses: swaying left, at rest, swaying right. Painted pixel art at the finesse of image 1.
```

## Ce que je ferai : mesurer l'échelle sur vos captures (un habitant à côté), fabriquer les crans, brancher une famille à la fois derrière un repli, juger en jeu.
