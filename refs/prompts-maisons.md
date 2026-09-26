# Prompts Gemini — les maisons de Valley Town (phase 6a, 2026-09-26)

Une maison par image (une planche de dix ferait ~300 px par maison, flou au zoom 5).
Références : `refs/hdv.jpg` (rendu, angle) + `refs/duplex.png` (matériaux) à chaque prompt ;
dès que la première maison plaît (commencer par S1), la joindre en 3e image aux suivantes.
Résultats à déposer dans `refs/maison-<code>.png`.

Prompt = BASE, puis la ligne de la maison à la place de `<HOUSE>`.

## BASE
```
Detailed pixel-art painting of ONE village house. Match exactly the rendering style, finesse, colour richness and camera angle of the first attached image (the town hall): a front elevation seen straight on, with a slight top-down angle so the roof slope is visible. NOT isometric. Use the second image only for materials (rough stone, half-timbering, slate), not for its angle. If a third image is attached, match its scale, palette and lighting exactly.
The house: <HOUSE>
Setting: an old European harbour town, weathered and lived-in. Rich small details: moss, worn stones, a gutter and drainpipe, window sills, a flower box with white and yellow flowers, a small lamp beside the door, a doormat.
The whole building is visible and centred, nothing cropped, with a thin strip of stone plinth at its foot. No garden, no trees, no hedges, no fence, no people, no text, no signs.
Windows: glass dark blue-grey, unlit (daytime). Light comes from the upper left.
Background: flat, uniform, pure magenta #FF00FF all around the house. No checkerboard, no gradient, no cast shadow on the background. No pink or magenta anywhere on the house itself. High resolution.
```

## Étroites (4 cases)
- **N1** a tall narrow house, about 55% as wide as it is tall. Its gable end faces the street, under a steep dark slate roof. Stone ground floor with an arched wooden front door. Two jettied half-timbered upper floors (dark oak beams, warm ochre infill), each overhanging the one below. One small chimney.
- **N2** a tall narrow house, about 55% as wide as it is tall, in pale dressed stone. Hipped roof in brown flat tiles with a single dormer. Sage-green wooden shutters on every window. Half-timbering only in the small attic gable of the dormer. A plain wooden door with a stone lintel.
- **N3** a narrow stone house, about 55% as wide as it is tall, with a small round stair turret on one front corner topped by a pointed conical slate cap with a little iron finial. Narrow slit windows climbing the turret. The top floor is half-timbered with grey-green beams and cream infill. Dark slate roof, one chimney.

## Standard (6 cases)
- **S1** about as wide as it is tall, with its long side facing the street. Rubble-stone ground floor. Half-timbered upper floor with Saint Andrew's crosses (oxblood-red beams, ochre infill). Blue-grey slate roof with two dormers, and a stone chimney on the side gable. Wooden front door slightly left of centre.
- **S2** a stone cottage, about as wide as it is tall, under a thick rounded thatched roof with a grassy ridge and neatly trimmed eaves. One eyebrow dormer set into the thatch. Low wooden door under a heavy stone lintel, small deep-set windows with wooden frames, a stone chimney rising through the thatch.
- **S3** a small manor-like house, about as wide as it is tall, in light stone. Red-brown tiled roof with gently flared eaves. Stone mullioned windows, symmetrical façade, three stone steps up to a panelled front door with a small fanlight. Half-timbering limited to a small side gable. Two chimneys.
- **S4** an asymmetrical house, about as wide as it is tall. Stone ground floor. Half-timbered upper floor (dark brown beams, pale ochre infill) with a projecting wooden bay window resting on carved wooden corbels. Off-centre gable facing the street, dark slate roof, a small slate canopy over the front door on two wooden brackets.

## Larges (8 cases)
- **W1** a long, low stone farmhouse (a Breton-style "longère"), about 1.3 times as wide as it is tall. One storey plus attic, dark slate roof with three dormers, stone chimneys at both gable ends. On one side, a lower attached barn wing with a big double wooden door. The front door of the house is in the main body, not in the barn.
- **W2** an L-shaped house, about 1.3 times as wide as it is tall. A stone main body with its long side to the street. A half-timbered wing (grey-green beams, cream infill) whose gable faces the street. A covered wooden gallery with a balustrade on the upper floor, running along the stone body. Blue-grey slate roofs, one front door at ground level in the stone body.
- **W3** a large half-timbered house, about 1.3 times as wide as it is tall, with two twin steep gables facing the street. Stone ground floor, jettied half-timbered upper floor (dark oak beams, warm ochre infill), dark slate roof. A covered wooden porch over the single front door, centred between the two gables.

---

# Phase 6b — la gare, le quai et les commerces (mêmes références, même méthode)

Même BASE que les maisons, en remplaçant « ONE village house » par « ONE building » et la ligne
`The house:` par celle du bâtiment. ⚠️ **Enseignes VIERGES** (« a blank signboard, no letters ») :
le jeu écrit les noms lui-même, dans les deux langues — un texte cuit dans l'image ne se traduit pas.
Joindre aussi, en 3e image, une maison 6a validée si elle existe (échelle et palette communes).

- **GARE** (≈ 1,6 fois plus large que haute) — `a small country railway station: a single-storey stone building with a slate roof and a wide timber canopy on cast-iron columns over the platform side, a round station clock under the gable, a ticket window, a bench and a luggage trolley under the canopy, a blank signboard (no letters) on the gable, the edge of a stone platform at its foot. No tracks, no train.`
- **QUAI** (bande très large, ≈ 5 fois plus large que haute) — `a long stone railway platform seen from the front: dressed stone edge with a white painted safety line, two cast-iron lamp posts, a wooden bench, a few crates and milk churns. Nothing else, no tracks, no building.`
- **MAISON GARFIELD, chapelier et tailleur** (≈ 1,6 fois plus large que haute) — `an elegant little clothing and hat shop in stone and dark green painted wood: a large shop window with small panes showing hats on stands and a tailor's dummy, a glazed shop door with a bell, a striped fabric awning (green and cream), a blank hanging signboard (no letters), flower boxes, an upper floor with one half-timbered gable.`
- **SALON DE COIFFURE** (≈ 1,75 fois plus large que haute) — `a small barber and hairdresser shop: stone ground floor, a red-white-blue striped barber's pole beside the door, a shop window with a mirror and a leather chair visible inside, a short blue awning, a blank signboard (no letters), a half-timbered upper floor with one window.`
- **BOUTIQUE D'OBJETS DE PLAGE** (moyen terme, Guillaume ; ≈ 1,4 fois plus large que haute) — `a seaside shop in whitewashed stone and sea-blue wood: nets, buckets, spades, fishing nets on poles and a rack of straw hats displayed outside, a striped blue-white awning, a blank signboard (no letters), a small balcony above.`
