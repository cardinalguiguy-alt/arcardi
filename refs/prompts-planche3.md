# Prompts Gemini — planche 3 (phase 7b) : jardins vécus, place, lampadaires, maison hantée

Deux planches de pixel art, dans la facture de tes deux planches (`refs/Code_Generated_Image.png`,
`refs/planche2.png`) : c'est d'elles que viennent déjà le banc, le lampadaire, les jardinières et
presque tout le mobilier de Valley Town. Décidé avec Guillaume le 2026-09-29 : après le verdict sur les
buis dessinés en code (« laids et simplistes »), **tout objet neuf de 7b passe par une planche Gemini**,
importée par le même chemin que les deux premières (`lib-planche.mjs` : copie des pixels, quantification,
catalogue écrit à la main).

## MÉTHODE — une conversation Gemini neuve par planche

1. Joindre, dans cet ordre, `refs/Code_Generated_Image.png` puis `refs/planche2.png`.
2. Coller la BASE, puis la liste de la planche (A ou B) **dans le même message**.
3. Enregistrer le résultat dans `refs/` : `planche3-jardins.png` (A), `planche3-place.png` (B).

Si des objets se touchent : `Same sheet, but move the objects apart: at least one object-width of empty
magenta between any two objects, nothing touching.`
Si le fond n'est pas uni : `Same sheet, but with a flat pure magenta #FF00FF background, no gradient, no
texture, no ground.`
Si le pixel n'est pas le même que celui des références (objets trop lisses, trop fins, ou pixels
énormes) : `Same sheet, redrawn at exactly the pixel size of the first reference: the wooden bench must be
exactly as big as the wooden bench of the reference, pixel for pixel.`

⚠️ **POURQUOI UN ÉTALON EN PREMIER OBJET** : l'échelle d'une planche ne se lit pas dans l'image (la
planche 2 n'avait pas de pas de pixel franc, voir `tools/import-planche2.mjs`) ; elle se DÉRIVE d'un
gabarit connu du jeu. Le banc de bois (36 pixels de jeu de large) et le lampadaire (48 de haut)
redessinés à l'identique donnent ce gabarit sur la planche même.

## BASE (les deux planches)

```
Pixel art sprite sheet for a cozy top-down village game, in exactly the same style as the two attached
reference sheets: same pixel size, same kind of palette (warm, slightly muted, with dark outlines), same
three-quarter top-down view, same light coming from the top-left, and the same soft grey contact shadow on
the ground under each object.

Layout rules, very important:
- flat pure magenta (#FF00FF) background everywhere, no ground, no grass, no texture, no gradient;
- every object drawn ONCE, separated from the others by at least one object-width of empty magenta,
  nothing touching, nothing overlapping;
- no text, no labels, no numbers, no frames, no grid lines;
- objects are seen from the front and slightly from above, never from the side.

Draw these objects:
```

## PLANCHE A — les jardins vécus (`planche3-jardins.png`)

```
0. SCALE REFERENCE: the plain wooden bench with three slats from the first reference sheet, redrawn
   identically, same size, pixel for pixel.
1. A neat woodpile of split firewood logs, about one and a half benches long, under a small lean-to roof
   of wooden shingles.
2. A small loose woodpile without roof, with a chopping block and an axe stuck in it.
3. A clothesline: two wooden T-shaped posts about as tall as a person, a rope between them, and hanging
   laundry: a white sheet, a blue shirt and a striped towel; about two benches wide.
4. A modest mailbox: a small dented tin box on a simple wooden stake.
5. A painted red wooden mailbox on a post, with a tiny slanted roof.
6. An elegant dark green cast-iron mailbox on an ornate iron pillar, with small brass details.
7. A wooden wheelbarrow with one wheel, a spade leaning against it.
8. An oak rain barrel with iron hoops, with a zinc watering can beside it.
9. A small round wrought-iron garden table with two matching chairs, painted white.
10. A rustic bench: one thick rough plank resting on two sawn log stumps.
11. A wrought-iron garden bench painted dark green, with curly armrests, same length as the scale bench.
12. A stone birdbath on a carved pedestal, with a little water in the basin.
13. A group of three terracotta pots with herbs (rosemary, basil, a small bay tree).
14. A wooden garden swing hanging from an A-frame.
15. A small wooden rabbit hutch on four legs, with a wire mesh door.
```

## PLANCHE B — la place, les lampadaires, la maison hantée (`planche3-place.png`)

```
0. SCALE REFERENCE: the black cast-iron street lamp from the second reference sheet, redrawn identically,
   same size, pixel for pixel, lit.
1. A large rectangular planter of carved light stone for a town square, about two benches long, overflowing
   with a lush mix of summer flowers (geraniums, lavender, white daisies) and trailing ivy.
2. The same planter in winter: dark soil, one small clipped evergreen tuft in the middle, dry brown stems,
   no flowers.
3. A tall classical stone urn (Medici vase) on a square pedestal, with red geraniums and trailing ivy
   spilling over the rim; about as tall as a person.
4. The same urn in winter: soil, a small evergreen tuft, no flowers.
5. A tall ornate cast-iron street lamp for a rich square: a fluted post, a decorated base, and TWO
   lanterns on curved arms, lit with warm yellow glass; about twice the height of a person.
6. A simple street lamp for a poor street: a weathered wooden post with a bracket arm, and a small iron
   lantern hanging from the arm, lit with warm yellow glass; about as tall as the scale lamp.
7. A tangled bramble thicket with arching thorny canes and a few dark berries, about one bench wide.
8. A smaller bramble clump, about half a bench wide.
9. A long low bramble hedge-row, overgrown and uneven, about two benches long.
10. A clump of tall dry wild grasses and thistles, about as tall as a child.
11. An abandoned wrought-iron garden gate between two cracked stone pillars: flaking black paint, orange
    rust, one leaf hanging open on a broken hinge, a little ivy climbing it; about one bench wide.
```

## CE QUE L'IMPORT FERA (pour mémoire, rien n'est codé)

Un `tools/import-planche3.mjs` sur le modèle des deux premiers : fond pris par la COULEUR (magenta), échelle
dérivée de l'étalon (banc : 36 pixels de jeu de large ; lampadaire : 48 de haut), catalogue écrit à la main
sur la planche de contact, un nom par objet. Chaque sprite se regarde en jeu le jour de son import (§9 de
`CLAUDE.md`). Placement : les objets de jardin par rang de quartier (`townHouseDistrict`), sans tirage ; les
jardinières remplacent celles de la place ; les lampadaires suivent le rang de la rue ; les ronces vont sur
l'allée de la maison hantée.
