# Prompts Gemini — les maisons de Valley Town (6a) et la gare, les boutiques (6b)

Une maison par image (une planche de dix ferait ~300 px par maison, flou au zoom 5).

## CE QUI RESTE À PRODUIRE (réécrit le 2026-09-26, nuit — dans cet ordre)

| # | Modèle | 4e image jointe | À enregistrer dans `refs/` |
|---|---|---|---|
| 1 | N3 — **mise de côté** (Guillaume, 2026-09-27 : la série se fait « sans N3 ») | `maison-n1.jpg` | `maison-n3.jpg`, `maison-n3-riche.jpg` — **pas d'enrichie** |
| 2 | S2 — ✅ **EN JEU (2026-09-27), porte CENTRÉE gardée** (sa propre largeur, `center`, voir sa ligne) ; **version de base SEULE** (Guillaume : pas de chaumière enrichie) | — | fait : `maison-s2.jpeg` |
| 3 | S3 — ✅ **EN JEU (2026-09-27), devenue la première LARGE** (9 cases à l'échelle de sa porte) | — | fait : `maison-s3.jpeg`, `-bordeaux` (son enrichie), `-riche` |
| 4 | S4 — ✅ **EN JEU (2026-09-27)** | — | fait : `Maison-s4.jpeg`, `-enrichie`, `-riche` |
| 5 | W1 | **`maison-s3.jpeg`** (S3 fixe l'emprise large) | `maison-w1.jpg`, `-enrichie`, `-riche` |
| 6 | W2 | **`maison-s3.jpeg`** | idem en `w2` |
| 7 | W3 | **`maison-s3.jpeg`** | idem en `w3` |
| 8 | SALON — ✅ **EN JEU (2026-09-27)**, comme la Maison Garfield | — | fait : `Salon.jpg` |
| 8 bis | MAISON GARFIELD, SES ÉTAPES — ✅ **EN JEU (2026-09-27)** : neutre, travaux, fermée (rideaux cadenassés) | — | fait : `MG-neutre.jpeg`, `MG-entravaux.jpeg`, `MG-fermee.jpeg` |
| 9 | GARE — ⚠️ **en attente**, voir sa ligne plus bas (emplacement de 4 cases) | `maison-s1.jpg` | `gare.jpg` — une image |

⚠️ **Les étroites n'ont pas d'enrichie** : compté le 2026-09-26, les 8 parcelles étroites tombent en
4 simples + 4 riches, aucune dans le quartier enrichi (le lac, les artisans). Les standard : 8 simples,
4 riches, 7 enrichies — les trois versions servent.
⚠️ **Le QUAI n'a plus de prompt** : `TOWN_PLATFORM` est une bande NORD-SUD de 2×8 cases, vue d'en haut
le long des rails. Une façade peinte « vue de face, cinq fois plus large que haute » n'a aucun endroit où
se poser (§4 de `CLAUDE.md` : un sprite a un sens dessiné). Il se fait en procédural, comme le quai du
port (phase 4). ⚠️ **La BOUTIQUE DE PLAGE attend un emplacement sur la carte** : son prompt est gardé
plus bas, à ne lancer que le jour où on lui a trouvé une place.

## MÉTHODE — par maison, UNE conversation Gemini neuve

1. **Simple** — joindre, dans cet ordre, `refs/hdv.jpg`, `refs/eglise-nouvelle.jpg`,
   `refs/tributribu.jpg` (les trois monuments, TOUS DE FACE), puis la 4e image du tableau ; coller la
   BASE, puis **la ligne de la maison juste après, dans le même message** (la BASE finit par
   « THE BUILDING: »).
2. **Enrichie** — même conversation, la passe ENRICHIE. (Pas pour N3.)
3. **Riche** — même conversation, en RE-JOIGNANT l'image simple (sinon Gemini part de l'enrichie), la
   passe RICHE.

Si une image sort de trois quarts, relancer dans la même conversation :
`Same building, but strictly from the front like the references: only the front façade, no side wall, no corner, no perspective.`
Si elle sort sur fond blanc : `Same image, but with a flat pure magenta #FF00FF background.` (N2 riche est
sortie sur fond BLANC : `build-maison-sprites` sait la détourer par remplissage depuis le bord, mais un
fond blanc mange les pâquerettes qui le touchent.)

## POURQUOI CHAQUE LIGNE IMPOSE LA PLACE DE LA PORTE (pour l'intégration)

⚠️ **Depuis le 2026-09-27, chaque maison est à l'échelle de SA porte** (`townDoorScale`) : son VANTAIL
(du seuil au sommet, `doorH`) fait 27,6 px d'art, une porte de 2,04 m à côté d'un personnage de 1,70 m.
La taille de l'image de Gemini ne compte donc plus ; seules comptent les PROPORTIONS — largeur du mur du
rez-de-chaussée et place de la porte, en hauteurs de vantail (H). La collision d'une parcelle vient de sa
LARGEUR : l'emprise d'une largeur est la réunion de celles de ses modèles, et chaque modèle doit en
couvrir ≥ 30 % de chaque case (`verify-vallee`). Pour ne pas changer l'emprise en place :
- **Standard** (cases 1..7 ; S1 : 1,33 H | 2,67 H) : de la porte au bord gauche du mur 0,75 à 1,45 H, au
  bord droit 2,5 à 3,2 H — la porte au **tiers gauche**. Une porte centrée sort de l'emprise.
- **Étroite** (cases 1..6 ; N1 : 0,86 | 2,25 H ; N2 : 1,0 | 2,43 H) : à gauche 0,75 à 1,45 H, à droite
  1,9 à 2,6 H — « door on the LEFT ».
- **Large** : la PREMIÈRE, W1, fixe l'emprise (porte au tiers gauche, imposée dans sa ligne) ; W2 et W3
  la copient en prenant W1 en 4e image.
**Intégrer une nouvelle maison** : une entrée dans `TOWN_HOUSE_MODELS` (fermeConstants.js — porte, pied du
mur, mur, cadre et vitres relevés sur l'image simple ; vitre = verre mesuré + 4 px, lanterne = son verre
seul), puis `node tools/build-maison-sprites.mjs`, puis la planche `tools/out/maisons.png`, puis le jeu
(menu dev, « les maisons de la vieille ville »).

⚠️ **DÉCIDÉ AVEC GUILLAUME LE 2026-09-26 : trois versions par maison** — simple, enrichie (plus de
caractère, JAMAIS plus pauvre), riche — réparties **PAR PRESTIGE DE L'ADRESSE** depuis le 2026-09-27 (Guillaume : « les plus belles dans
les zones les plus prisées, les plus simples loin des points d'intérêt ») : distance au lieu prisé le
plus proche (place, parc, église, tribunal, terrasse ; marché et lac +10), riche sous 17 cases, enrichie
sous 30, simple au-delà (`townHouseStanding` ; pure fonction de la position).
Les trois versions d'une maison ont la MÊME silhouette : un seul relevé de repères, une seule collision.
⚠️ Plus de `duplex.png` : premier essai, Gemini a recopié son angle isométrique. La 4e image sert
l'échelle, le détail et le rendu — PAS ses couleurs ni sa forme, sinon toutes les maisons se ressemblent.

## BASE (maisons ET bâtiments de la 6b ; la ligne du bâtiment se colle juste après)
```
Detailed pixel-art painting of ONE modest building of a village, for a 2D top-down town game.

REFERENCES: the first three attached images are buildings from the same game. Match them exactly for camera angle, rendering style, pixel finesse, outline thickness, colour richness and lighting. Use them ONLY for style and angle: this building is modest, much smaller and simpler than these monuments. The fourth attached image is another building of the same town: match its scale, door size, level of detail, weathering and lighting exactly too, but NOT its colours and NOT its shape: this building has its own shape, materials and colours, described at the end.

CAMERA: strictly the same as the references, a FRONT ELEVATION. The front façade is flat and parallel to the picture plane. The side walls are completely hidden: no building corner, no second façade, no perspective, no vanishing lines; every vertical line perfectly vertical, every horizontal line perfectly horizontal. The only depth cue is a slight top-down tilt that shows the front slope of the roof. NOT isometric, NOT three-quarter view, NOT seen from a corner.

DETAILS: an old European harbour town. This is the ORDINARY version of the building: lived-in and decently kept, neither neglected nor luxurious (no moss, no broken parts, no ornaments). A gutter and drainpipe, window sills, a flower box with white and yellow flowers, a small wall lamp beside the door, a doormat.

FRAMING: the whole building is visible and centred, nothing cropped (chimneys included), standing on a thin strip of stone plinth. No ground, no garden, no trees, no hedges, no fence, no people. No text and no letters anywhere: any signboard stays blank.

LIGHT: daytime. Windows: dark blue-grey glass, unlit. Light comes from the upper left.

BACKGROUND: flat, uniform, pure magenta #FF00FF everywhere around the building. No checkerboard (even though the references have one), no gradient, no floor, no cast shadow on the background. No pink or magenta anywhere on the building itself. High resolution.

THE BUILDING (this description wins over everything above):
```

## ENRICHIE (2e image de chaque maison, sauf les étroites)
⚠️ Guillaume, 2026-09-26 : PAS une maison plus vieille ni plus pauvre. La même maison avec plus de
CARACTÈRE et de détail — une patine qui a du charme, jamais une ruine. ⚠️ L'ancienne version parlait
d'« ardoises » et d'« encorbellement » : sur une chaumière ou une maison sans encorbellement, Gemini
risquait d'en AJOUTER un. Elle dit maintenant « la couverture » et « chaque débord ».
```
Keep exactly this house: same angle, same silhouette, same size and same position of every opening (door, windows, dormers, chimney). Only the finish changes. Make it richer in detail and full of character, a well-loved home with a charming patina, closer to the rendering depth of the reference buildings: a roof covering with subtle colour variation, soft shading under the eaves and every overhang, timber with visible grain and gentle wear, walls with slight tonal variation (stone stays stone, timber stays timber), a little moss at the foot of the walls and on the plinth, a little ivy climbing from the ground at one corner, one more small flower box. Add no architectural element: no new jetty, gable, dormer, window or chimney. Not older, not poorer, nothing broken, nothing missing, no rust, no dirt stains. Keep the same colours. Keep the flat pure magenta #FF00FF background.
```

## RICHE (3e image de chaque maison, en re-joignant l'image simple)
⚠️ « Keep the small wall lamp » : N2 riche l'avait remplacée par une plaque de laiton — rien ne s'allumait
plus à sa porte la nuit.
```
Start again from this attached image (the plain version of the house). Keep exactly this house: same angle, same silhouette, same size and same position of every opening (door, windows, dormers, chimney). Only the finish changes. Make it the home of a well-off family, clean and well kept: fresh paint on the timber and woodwork, discreet decorative painted motifs, wooden shutters and curtains behind the upper windows, a finer panelled front door with brass fittings and a carved stone surround, a copper gutter if the roof has a gutter, generous flower boxes, two potted plants or small stone statues on the plinth beside the door, a flowering climber at one corner. Keep the small wall lamp beside the door. Add no architectural element: no new dormer, gable, window or chimney. No dirt, no moss. Flowers in white, yellow, red and blue only: no pink, no purple, no magenta anywhere on the house. Keep the flat pure magenta #FF00FF background, not white.
```

## Étroites (4 cases) — 4e image : `maison-n1.jpg`
- **N1** (en jeu) a tall narrow house, about 55% as wide as it is tall. Its gable end faces the street, under a steep dark slate roof. Stone ground floor with an arched wooden front door. Two jettied half-timbered upper floors (dark oak beams, warm ochre infill), each overhanging the one below. One small chimney.
- **N2** (en jeu) a tall narrow house squeezed between two neighbours, in pale dressed stone, clearly taller than wide and exactly as wide as the house in the fourth image. Two windows wide on the upper floors. On the ground floor the front door is on the LEFT, under the left column of windows, with one window on the right: the door is NOT centred. Hipped roof in brown flat tiles with a single dormer. Sage-green wooden shutters on every window. Half-timbering only in the small attic gable of the dormer. A plain wooden door with a stone lintel. Do not copy the shape of the fourth house: no jetty, no gable facing the street.
- **N3**
```
a tall narrow stone house squeezed between two neighbours, clearly taller than wide and exactly as wide as the house in the fourth image, two windows wide on the upper floors. A small round stair turret on its front RIGHT corner, topped by a pointed conical slate cap with a little iron finial, with narrow slit windows climbing it. On the ground floor the front door is on the LEFT, at the same place and the same size as the door of the fourth house: NOT centred. The top floor is half-timbered with grey-green beams and cream infill. Dark slate roof, one chimney. No jetty, no gable facing the street.
```

## Standard (6 cases) — 4e image : `maison-s1.jpg`
- **S1** (en jeu) about as wide as it is tall. Its eaves run parallel to the street, so the roof ridge is a horizontal line seen from the front. Rubble-stone ground floor. Half-timbered upper floor with Saint Andrew's crosses (oxblood-red beams, ochre infill). Blue-grey slate roof with two dormers, and a stone chimney rising at the right end of the roof. Wooden front door slightly left of centre.
- **S2**
```
a stone cottage, about as wide as it is tall and exactly as wide as the house in the fourth image, under a thick rounded thatched roof with a grassy ridge and neatly trimmed eaves. One eyebrow dormer set into the thatch. The front door is a sturdy wooden door under a heavy stone lintel, left of centre at about one third of the façade from the left, at the same place and the same size as the door of the fourth house. One small deep-set window to the left of the door and two to its right, with wooden frames. A stone chimney rising through the thatch. No gutter and no drainpipe: the thatch overhangs instead.
```
  ✅ Premier essai (`refs/maison-s2.jpeg`, 2026-09-27) : porte CENTRÉE malgré la ligne (1,85 H | 1,86 H) —
  **GARDÉE** (Guillaume : « je préfère ça visuellement ») : S2 a sa propre largeur (`center`, emprise
  x+0..x+5, centrée sur l'allée) et ses parcelles, loin des lieux prisés (`TOWN_HOUSE_CENTER_AT`). Plus de
  relance ; l'ENRICHIE et la RICHE se font dans la même conversation. Relance d'autrefois, gardée pour mémoire :
```
Same cottage, same size, same style and same materials, but the front door must NOT be centred: move the door, its heavy stone lintel, the doormat and the wall lamp to the LEFT, so that the door stands at about one third of the façade from the left. Then there is room for only ONE small window to the left of the door, and TWO small windows with flower boxes to the right of the door. Keep the eyebrow dormer and the chimney where they are. Keep the flat pure magenta #FF00FF background.
```
- **S3**
```
a small "maison de maître" in light dressed stone, about as wide as it is tall and exactly as wide as the house in the fourth image, orderly and well proportioned. Two storeys of tall stone-mullioned windows in four regular columns. Three stone steps lead up to a panelled front door with a small fanlight: the door takes the place of the ground-floor window in the SECOND column from the left, so it stands left of centre, at the same place and the same size as the door of the fourth house. Red-brown flat-tiled roof with gently flared eaves, two chimneys, and a small half-timbered dormer gable on the right of the roof.
```
- **S4**
```
an asymmetrical house, about as wide as it is tall and exactly as wide as the house in the fourth image. Stone ground floor; half-timbered upper floor with dark brown beams and pale ochre infill. The front door is left of centre, at about one third of the façade from the left, at the same place and the same size as the door of the fourth house, under a small slate canopy on two wooden brackets. On the right half, an off-centre gable facing the street, with a projecting wooden bay window on the upper floor resting on carved wooden corbels. Dark slate roof.
```

## Larges (9 cases) — 4e image : `maison-s3.jpeg`
⚠️⚠️ **S3 A FIXÉ L'EMPRISE LARGE (2026-09-27)** : demandée comme une standard, Gemini l'a peinte à
quatre travées — 5,3 H de mur à l'échelle de son vantail, porte à 2,0 H du bord gauche et 3,3 H du bord
droit, emprise x+0..x+8. Elle est en jeu sur les cinq parcelles larges (`TOWN_HOUSE_WIDE_AT`). W1 à W3
se règlent donc sur ELLE, avec la formule qui a tenu pour N2 : « exactly as wide as the house in the
fourth image », « front door at the same place and the same size ». Tolérances (calculées, 1 H = 1,725
case) : de la porte au bord gauche du mur 1,4 à 2,0 H, au bord droit 3,1 à 3,7 H — sinon l'emprise
large change (et la collision des cinq parcelles), ou le modèle laisse de l'air à côté de son mur. La ligne de W1 a été réécrite en ce sens ; W2 et W3 le disaient déjà.
- **W1**
```
a long, low stone farmhouse (a Breton-style "longère"), one storey plus attic, exactly as wide as the house in the fourth image but much lower, so about twice as wide as it is tall. Its front door is exactly the same size as the door of the fourth house. The main house takes the LEFT two thirds of the façade, with its front door in the middle of that part, so the door stands at about one third of the whole façade from the left, NOT centred; one window on each side of the door and three dormers in the dark slate roof above. The RIGHT third is a lower attached barn wing with a big double wooden barn door (not the entrance). Stone chimneys at both gable ends of the main house.
```
- **W2**
```
an L-shaped house, exactly as wide as the house in the fourth image, with its front door at the same place and the same size, at about one third of the façade from the left, NOT centred. The LEFT two thirds: a two-storey stone main body with its long side to the street, the front door in the middle of it at ground level, and a covered wooden gallery with a balustrade running along its upper floor. The RIGHT third: a half-timbered wing with grey-green beams and cream infill, whose steep gable faces the street. Blue-grey slate roofs.
```
- **W3**
```
a large half-timbered house, exactly as wide as the house in the fourth image, with its front door at the same place and the same size, at about one third of the façade from the left, NOT centred. Two twin steep gables facing the street, side by side. Stone ground floor, jettied half-timbered upper floor with dark oak beams and warm ochre infill, dark slate roof. A covered wooden porch over the single front door, which stands under the LEFT gable, towards its right side.
```

---

# Phase 6b — la gare et les commerces (même BASE, même méthode, une seule image chacun)

⚠️⚠️ **LA LEÇON DE LA MAISON GARFIELD (2026-09-27)** : Gemini l'a peinte haute et étroite, porte à droite
— un mur de 3,2 hauteurs de porte. À l'échelle de sa porte elle ne remplissait que 5,7 de ses 8 cases ;
Guillaume la voulait « bien plus grande », elle remplit donc son rectangle avec une porte de 2,95 m
(`fit: "site"`). ⚠️ **La nuit, une vitrine s'allume par SES SPOTS PEINTS** (`showWindow`, relevés au pixel) :
demander des spots ou une réglette VISIBLES dans chaque vitrine. **Pour les suivants, demander une façade
LARGE, porte simple AU MILIEU** : le rectangle
place la porte au milieu (`nearCivicDoor`), et une façade d'environ 4 hauteurs de porte (salon, 7 cases)
ou 2,5 (gare, 4 cases) remplit son rectangle avec une porte à hauteur d'homme.

⚠️ **Enseignes VIERGES** : le jeu écrit les noms lui-même, dans les deux langues — un texte cuit dans
l'image ne se traduit pas (§4 de `CLAUDE.md`). 4e image : `maison-s1.jpg` (échelle et porte communes).
Emprises sur la carte : gare 4×3 (`TOWN_STATION`), Maison Garfield 8×5 (`TOWN_BOUTIQUE`), salon 7×4
(`TOWN_SALON`) — l'image se calera sur leur porte, comme les maisons.

- **GARE** — ⚠️ **EN ATTENTE (2026-09-27)** : `TOWN_STATION` ne fait que 4 cases de large, soit 2,3 H à
  l'échelle de la porte — plus étroit que N1 (3,1 H). La gare ci-dessous, peinte par Gemini (~4 H et
  plus), y serait réduite avec une porte plus petite que le personnage. À trancher avant de la lancer :
  une toute petite halte (prompt à réécrire : ~60 % de la largeur de S1), ou un emplacement plus large
  sur la carte. ⚠️ Ajouter alors des lampes VISIBLES sous l'auvent : la nuit s'allume par ses lampes peintes.
  **Proposition (audit du 2026-09-27, carte relue)** : la DALLE de la gare fait déjà 6 cases (x = 5..10,
  y = 62..65), le bâtiment 4 au milieu. Élargir `TOWN_STATION` à la dalle (x 5, w 6, passe FINALE du
  générateur) donne 3,5 H à l'échelle de la porte, ~90 % de S1 : « about nine tenths as wide as the house
  in the fourth image ». Le quai (x 4..5, dès y = 66) n'est pas touché.
```
a small country railway station, about 1.6 times as wide as it is tall, its single ordinary front door exactly in the middle of the façade: a single-storey stone building with a slate roof and a wide timber canopy on cast-iron columns along its front, a round station clock under the gable, a ticket window, a bench and a luggage trolley under the canopy, a blank signboard with no letters on the gable. No tracks, no train, no platform.
```
- **MAISON GARFIELD, LOCAL VIDE** — ✅ remplacé par les images de Guillaume (`MG-neutre.jpeg`,
  `MG-entravaux.jpeg`, `MG-fermee.jpeg`) ; le prompt ci-dessous a donné `MG-fermee` (Gemini a baissé des
  rideaux de fer au lieu de tirer des rideaux, et gardé l'enseigne), gardé pour mémoire. Décision
  d'origine (2026-09-27) : tant que Carla n'est pas résidente, le bâtiment est NEUTRE. **Conversation neuve, UNE
  seule image jointe : `refs/boutique-garfield.jpg`** — pas de BASE, pas de monuments : c'est une retouche
  de la même image, comme la passe RICHE. Même silhouette au pixel près = mêmes repères, même collision ;
  le jeu choisit l'image selon que Carla est résidente. Rideaux crème tirés (pas de vitrine vide et nue,
  qui ferait abandonné) ; enseigne vierge (le nom peint disparaît avec les articles).
```
Start again from this attached image. Keep exactly this building: same angle, same silhouette, same size, same pixel-art style, same position and size of every opening (upper display window, bay window, glass door and its transom), same roof, same colours, same wall lamps, same drainpipe, same flower box, same doormat. Only one thing changes: this shop is empty and has no tenant yet. Remove every item for sale: no hats, no hat stands, no mannequin heads, no ties, no belts, no scarves, no bags, no jewellery, no clothes of any kind, nothing hanging on the rails. Behind the upper display window, behind the bay window and behind the glass door, plain cream linen curtains are drawn and closed, hiding the inside. The signboard above the bay window is blank: plain dark green painted wood, no letters, no monogram, no gold ornament. The building must look neat and ordinary, not abandoned: no dust, no broken glass, no posters, no "for rent" sign, no text anywhere. Keep the flat pure magenta #FF00FF background.
```
- **MAISON GARFIELD, chapelier et tailleur** — ✅ faite (`refs/boutique-garfield.jpg`), gardée pour mémoire
```
an elegant little clothing and hat shop, about 1.6 times as wide as it is tall, in stone and dark green painted wood: a large shop window with small panes showing hats on stands and a tailor's dummy, a glazed shop door with a bell, a striped fabric awning in green and cream, a blank hanging signboard with no letters, flower boxes, an upper floor with one half-timbered gable.
```
- **SALON DE COIFFURE** — largeur calée sur S1 (2026-09-27) : son mur de 4,0 H couvre les 7 cases de
  `TOWN_SALON` à l'échelle de la porte ; « 1,75 fois plus large que haut » seul laissait Gemini choisir.
```
a small barber and hairdresser shop, exactly as wide as the house in the fourth image but lower, wide and low, its single ordinary glazed door exactly in the middle of the ground floor and exactly the same size as the door of the fourth house, with a shop window on each side: stone ground floor, a red-white-blue striped barber's pole beside the door, shop windows with a mirror and a leather chair visible inside, lit by a few small spotlights on a ceiling track clearly visible inside the windows, a short blue awning, a blank signboard with no letters, a half-timbered upper floor with one window.
```
- **BOUTIQUE D'OBJETS DE PLAGE** — ⚠️ à ne lancer qu'une fois son emplacement choisi (moyen terme, Guillaume)
```
a seaside shop, about 1.4 times as wide as it is tall, in whitewashed stone and sea-blue wood: nets, buckets, spades, fishing nets on poles and a rack of straw hats displayed outside, a striped blue-white awning, a blank signboard with no letters, a small balcony above.
```
