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
