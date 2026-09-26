# Prompts Gemini — les maisons de Valley Town (phase 6a, 2026-09-26)

Une maison par image (une planche de dix ferait ~300 px par maison, flou au zoom 5).

⚠️ **DÉCIDÉ AVEC GUILLAUME LE 2026-09-26 : TROIS VERSIONS POUR CHACUNE DES DIX MAISONS** — simple, enrichie (plus de caractère, JAMAIS plus pauvre), riche —
(trente images), répartis **PAR QUARTIER** — riches autour de la place et de la mairie, enrichies vers le
port et les bords, simples entre les deux. Une pure fonction de la position de la parcelle : rien de
sauvegardé, rien de diffusé. Les trois variantes d'une maison ont la MÊME silhouette (porte, fenêtres,
lucarnes, cheminée, emprise au même endroit) : un seul relevé de repères et une seule collision par
maison ; chaque variante n'apporte que son image et son calque de nuit.

**Nommage** : `refs/maison-<code>.jpg` (simple), `refs/maison-<code>-enrichie.jpg`, `refs/maison-<code>-riche.jpg`.
Le modèle de tout le reste est S1 : `maison-s1.jpg`, `maison-s1-enrichie.jpg`, `maison-s1-riche.jpg`.
⚠️ **UNE SEULE ÉCHELLE POUR TOUTES LES MAISONS** (`TOWN_HOUSE_SCALE`, déduite de la porte des anciennes
maisons : 26 px d'art pour le cadre de porte de S1), jamais une échelle par maison ajustée à sa parcelle.
Gemini dessine toutes les maisons à ~970 px de haut, donc chaque image se mesure à cette échelle commune.
N1 (rapport 0,91 au lieu des 0,55 demandés) y a un rez-de-chaussée de 4 cases — elle tient une parcelle
étroite, ses étages débordent au-dessus du jardin.
**Intégrer une nouvelle maison** : une entrée dans `TOWN_HOUSE_MODELS` (fermeConstants.js — porte, pied du
mur, mur, cadre et vitres relevés sur l'image simple), puis `node tools/build-maison-sprites.mjs`, puis la
planche `tools/out/maisons.png`, puis le jeu (menu dev, « les maisons de la vieille ville »).

**Méthode, par maison, UNE conversation Gemini neuve :**
1. **Simple** — joindre, dans cet ordre, `refs/hdv.jpg`, `refs/eglise-nouvelle.jpg`,
   `refs/tributribu.jpg` (les trois monuments du jeu, TOUS DE FACE) et `refs/maison-s1.jpg` en 4e ;
   prompt = BASE avec la ligne de la maison à la place de `<HOUSE>`.
2. **Enrichie** — dans la même conversation, la passe ENRICHIE ci-dessous.
3. **Riche** — dans la même conversation, en RE-JOIGNANT l'image simple (sinon Gemini part de
   l'enrichie), la passe RICHE ci-dessous.

⚠️ Plus de `duplex.png` : premier essai (2026-09-26), Gemini a recopié son angle isométrique et rendu
une maison de trois quarts ; les matériaux sont décrits dans le texte. S1 en 4e image sert l'échelle,
le détail et le rendu — PAS ses couleurs, sinon les dix maisons prennent la même teinte.
Si une image sort encore de trois quarts, relance dans la même conversation :
`Same house, but strictly from the front like the references: only the front façade, no side wall, no corner, no perspective.`

## ENRICHIE (2e image de chaque maison)
⚠️ Guillaume, 2026-09-26 : PAS une maison plus vieille ni plus pauvre. La version du milieu est la même
maison avec plus de CARACTÈRE et de détail — une patine qui a du charme (c'est ce qu'a donné
`maison-s1-enrichie.jpg`), jamais une ruine : ni carreau cassé, ni ardoise manquante, ni rouille.
```
Keep exactly this house: same angle, same silhouette, same size and same position of every opening (door, windows, dormers, chimney). Only the finish changes. Make it richer in detail and full of character, a well-loved home with a charming patina, closer to the rendering depth of the reference buildings: slates with subtle colour variation, soft shading under the eaves and the jetty, timber with visible grain and gentle wear, walls with a soft painted finish and slight tonal variation, a little moss at the foot of the walls and on the plinth, a little ivy climbing from the ground at one corner, one more small flower box. Not older, not poorer, nothing broken, nothing missing, no rust, no dirt stains. Keep the same colours. Keep the pure magenta #FF00FF background.
```

## RICHE (3e image de chaque maison, en re-joignant l'image simple)
```
Start again from this attached image (the plain version of the house). Keep exactly this house: same angle, same silhouette, same size and same position of every opening (door, windows, dormers, chimney). Only the finish changes. Make it the home of a well-off family, clean and well kept: fresh paint on the timber and woodwork, discreet decorative painted motifs, wooden shutters and curtains behind the upper windows, a finer panelled front door with brass fittings and a carved stone surround, a copper gutter, generous flower boxes, two potted plants or small stone statues on the plinth beside the door, a flowering climber at one corner. No dirt, no moss. Flowers in white, yellow, red and blue only: no pink, no purple, no magenta anywhere on the house. Keep the pure magenta #FF00FF background.
```

## BASE
```
Detailed pixel-art painting of ONE modest village house, for a 2D top-down town game.

REFERENCES: the three attached images are buildings from the same game. Match them exactly for camera angle, rendering style, pixel finesse, outline thickness, colour richness and lighting. Use them ONLY for style and angle: the house must be a humble two-storey dwelling, much smaller and simpler than these monuments. If a fourth image is attached (another house of the same town), match its scale, level of detail, weathering and lighting exactly too, but NOT its colours: this house has its own materials and colours, described below.

CAMERA: strictly the same as the references, a FRONT ELEVATION. The front façade is flat and parallel to the picture plane. The side walls are completely hidden: no building corner, no second façade, no perspective, no vanishing lines; every vertical line perfectly vertical, every horizontal line perfectly horizontal. The only depth cue is a slight top-down tilt that shows the front slope of the roof. NOT isometric, NOT three-quarter view, NOT seen from a corner.

THE HOUSE: <HOUSE>

DETAILS: an old European harbour town. This is the ORDINARY version of the house: lived-in and decently kept, neither neglected nor luxurious (no moss, no broken parts, no ornaments). A gutter and drainpipe, window sills, a flower box with white and yellow flowers, a small wall lamp beside the door, a doormat.

FRAMING: the whole building is visible and centred, nothing cropped (chimneys included), standing on a thin strip of stone plinth. No ground, no garden, no trees, no hedges, no fence, no people, no text, no signs.

LIGHT: daytime. Windows: dark blue-grey glass, unlit. Light comes from the upper left.

BACKGROUND: flat, uniform, pure magenta #FF00FF everywhere around the house. No checkerboard (even though the references have one), no gradient, no floor, no cast shadow on the background. No pink or magenta anywhere on the house itself. High resolution.
```

## Étroites (4 cases)
- **N1** a tall narrow house, about 55% as wide as it is tall. Its gable end faces the street, under a steep dark slate roof. Stone ground floor with an arched wooden front door. Two jettied half-timbered upper floors (dark oak beams, warm ochre infill), each overhanging the one below. One small chimney.
- **N2** a tall narrow house squeezed between two neighbours, only two windows wide, clearly taller than wide (about 55% as wide as it is tall), in pale dressed stone. Hipped roof in brown flat tiles with a single dormer. Sage-green wooden shutters on every window. Half-timbering only in the small attic gable of the dormer. A plain wooden door with a stone lintel.
- **N3** a tall narrow stone house squeezed between two neighbours, only two windows wide, clearly taller than wide (about 55% as wide as it is tall), with a small round stair turret on one front corner topped by a pointed conical slate cap with a little iron finial. Narrow slit windows climbing the turret. The top floor is half-timbered with grey-green beams and cream infill. Dark slate roof, one chimney.

## Standard (6 cases)
- **S1** about as wide as it is tall. Its eaves run parallel to the street, so the roof ridge is a horizontal line seen from the front. Rubble-stone ground floor. Half-timbered upper floor with Saint Andrew's crosses (oxblood-red beams, ochre infill). Blue-grey slate roof with two dormers, and a stone chimney rising at the right end of the roof. Wooden front door slightly left of centre.
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
