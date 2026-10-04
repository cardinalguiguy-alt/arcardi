# A — LES SOLS DE VALLEY TOWN : « même plan, plus net » (P1)

Objectif (vous, 2026-10-03) : le réseau de rues et de chemins est bon ; seul manque le **niveau de détail et de netteté** du
pavement et de l'herbe, au niveau des maisons peintes. Donc : on REPEINT les tuiles actuelles à haute résolution en gardant
leur plan, au lieu de les remplacer. La pluie, la neige, les flaques et les feuilles se dérivent ensuite de ces peintures
(jamais d'image « mouillée » à peindre).

## Option PROCÉDURALE (réponse du 2026-10-04 — à décider, rien d'engagé)
Possible, et plus sûre sur le plan : on garde le générateur actuel pour le PLAN (`townAsphaltSurface`, `townPavingFamily`… : où va chaque pierre), on le rend à ~256 px par case, on ajoute une
passe de détail (bords de joints irréguliers, pierres bombées avec carte de hauteur, grain minéral, éclats, usure, relief nord-ouest), puis réduction Lanczos à chaque cran. **Pour** : même plan et bouclage
garantis, la carte de hauteur sert aux flaques et à la neige, aucune génération. **Contre** : un style « rendu 3D » à côté de maisons peintes (à pousser vers le pixel art peint : tons limités, joints cernés),
et la plomberie — atlas de sol par cran posé à 1:1, météo, neige, glace, feuilles qui lisent la nouvelle résolution — qui est la MÊME avec des images Gemini. **Proposition** : prototype sur le dallage civique,
comparé côte à côte avec la version Gemini ci-dessous ; choix surface par surface (pavages à plan strict : procédural plausible ; herbe, terre, gravier : à départager). **Continuez les générations Gemini en attendant.**

Une tuile = 64 × 64 px d'art = **4 × 4 cases**. Les images de référence sont dans `sols-ref/` (la tuile du jeu agrandie 16×
sans lissage : `<nom>-1x1-x16.png` ; la même répétée 2 × 2 : `<nom>-2x2-x8.png`).

## Ordre conseillé
1. `dallage_civique` (le plus lisible, il valide la méthode) → 2. `goudron` → 3. `herbe` → 4. `paves` → 5. `paves_eventail` →
6. `dallage_terrasse` → 7. `briques` → 8. `gravier` → 9. `terre` → puis les variantes, les extras, l'anti-répétition.
**Jugez le premier en l'ouvrant à côté de la tuile d'origine avant de faire les autres.**

## Références à joindre, DANS CET ORDRE (une conversation neuve par revêtement)
1. `sols-ref/<nom>-1x1-x16.png` — l'image à repeindre.
2. `public/town/maison-s1-simple-day-z5.png` — une maison peinte, **uniquement** pour le niveau de netteté.
3. (facultatif mais utile) `captures/cap-vt-01-rue-maison.png` (ou la capture du lieu du revêtement : 02 place civique, 03 marché,
   04 terrasse, 05 parc) — pour l'échelle et la couleur réelles, jamais pour copier un bâtiment.

## PROMPT MAÎTRE — tuiles de sol (à coller tel quel, puis ajouter la ligne du revêtement dans le même message)

```
Image 1 is a ground texture tile from a 2D top-down town game, shown as 64x64 pixel art enlarged 16x without smoothing. It tiles seamlessly and covers exactly 4x4 paving cells of the game. Image 2 is a finished painted house from the same game: use it ONLY as the target level of sharpness, material richness and painting style. If an image 3 is attached, it is an in-game screenshot showing how this ground sits next to buildings: use it only to understand scale and colour, and copy no building, character or object from it.

TASK: repaint image 1 as a crisp, richly detailed painted pixel-art texture of the SAME ground. Square, at the highest resolution you can output (at least 1024x1024). This is a detail-and-sharpness upgrade, NOT a redesign.

KEEP (do not move, add, remove, resize or recolour):
- the layout: every stone, paver, joint, crack, patch and tuft stays at the same position and the same proportions as in image 1, to within about 1% of the image width. The same number of stones.
- the colour palette and the overall lightness of every area (average colour within about 6%). Not more saturated, not more contrasted, not warmer, not colder.
- the density: no new large features, no new cracks, no new objects, no puddles.

ADD (this is the whole point): material micro-detail at the sharpness and richness of image 2: fine grain, pores, mineral speckle, tiny chips and worn arrises on stone edges, slightly irregular joint edges with recessed mortar or sand, crisp clean edges everywhere. Painted pixel-art finesse (small deliberate brush texture). Not a photograph, not a photo-scan, not a smooth vector, no blur, no JPEG-like noise.

HARD RULES:
- strictly top-down and flat: no perspective, no tilt, no depth of field.
- flat neutral daylight with NO cast shadows, NO sun glare, NO vignette, NO brightness gradient across the image. Only a very subtle micro-relief shading on the north-west side of joints and chips (light from the upper left). The game adds sun, night and weather itself.
- dry and clean: no water, no wetness, no snow, no leaves, no litter, no people, no text, no logos.
- SEAMLESS: the left edge continues the right edge and the top edge continues the bottom edge with no visible seam when the image is repeated in a grid. Nothing is cut differently at the borders than in image 1.
- the picture fills the whole square edge to edge: no frame, no border, no margin.
- output only the image.

THE SURFACE:
```

### Corrections prêtes à coller (même conversation)
- **Le plan a dérivé** : `Redo it. The layout drifted: every stone and joint must sit exactly where it is in image 1, as if image 1 were overlaid on your result. Keep your finer detail.`
- **Couture visible** : `The left and right edges do not continue each other (or top and bottom). Redo it so the pattern wraps perfectly: a stone cut by the right edge continues on the left edge at the same height, and the same top to bottom.`
- **Trop photo** : la correction n° 6 de `00-LISEZ-MOI.md`.
- **Trop mou** : `Sharper: every edge crisp, no soft shading, no blur, no smoothing.`
- **Trop contrasté / trop saturé** : `Lower the contrast and saturation to match image 1: the lightness range of the surface must stay the same as in image 1.`

## LIGNES PAR REVÊTEMENT (à ajouter après « THE SURFACE: »)

- **dallage_civique** (place, parvis des monuments) : `Pale limestone and sandstone civic paving laid as an opus of six slab formats. Keep every slab and every dark joint exactly where it is. Add stone grain, fine veining, hairline wear, tiny chips, subtle tonal variation slab to slab. Keep the small olive moss tufts in the joints exactly where they are but finer.`
- **goudron** : `Worn dry asphalt, a calm mid-dark neutral grey. Keep the dark sealed crack near the top exactly where it is (a ribbon of shiny bitumen). Add bitumen binder texture, embedded fine aggregate (grey stones and a few warm brown ones), faint sun-bleached patches. Keep the average lightness of image 1.`
- **paves** : `Granite cobblestones. Keep every cobble where it is. Give each one its own slightly domed top, chipped edges, fine grain and a slightly different tone, with dark irregular sand-and-mortar joints.`
- **paves_eventail** (marché) : `Granite setts laid in a fan (scale) pattern: arcs each spanning half of the tile width (32 px of the original 64 px), rings of setts inside each arc. Keep every arc and ring exactly where it is. Each sett has a rounded top, grain and chipped edges, with fine dark joints.`
- **dallage_terrasse** (Haute-Ville, belvédère, gare, quais) : `Sandstone terrace flags laid in courses. Keep the courses and joints where they are. Add sandstone grain, soft bedding lines, small chips, a hint of warm tone variation.`
- **briques** : `Fired clay brick paving. Keep the bond pattern and every brick. Give each brick fine pores, small colour variation and softly worn arrises; mortar joints slightly recessed.`
- **gravier** : `Compacted pale gravel path. Keep the overall tone and spread. Render individual small pebbles in varied warm greys and beiges, with fine sand between them. No large stones.`
- **terre** : `Beaten earth path. Keep the tone and the patches. Add soil grain, tiny pebbles, dry crumbs, a few dried grass stems. No green lawn.`
- **herbe** : `Short, even lawn seen from above. Keep the average green, the density and the direction of the blades, and the five tiny pale flowers exactly where they are. Paint individual blades 18 to 40 px long at this scale, each with a lighter tip and a darker base; fine tonal variation in the green. Do NOT add clumps, tall tufts, extra flowers or bare soil.`

## VARIANTES (même conversation que la tuile de base réussie)

- **Goudron, 3 variantes** (le jeu en tire une par bloc de 4 × 4 cases pour que rien ne revienne à intervalle fixe), à demander
  trois fois : `Same asphalt, same grain, same average colour and the same style, but invent a different arrangement: place the sealed crack and any repair patch at completely different positions (none near where they are in image 1), different aggregate scatter. Still seamless, still dry.`
- **Herbe sèche** : `Same lawn, same blade layout and same flowers, recoloured for a dry, sun-worn meadow: average colour #6b9853 (warmer, slightly yellower), lighter blade tips around #80a863 with some straw-coloured tips and a few pale dry blades, darker bases around #5b8249. Not brown, still a living green meadow.`
- **Herbe luxuriante** : `Same lawn, same blade layout and same flowers, recoloured for a lush, rich garden lawn: average colour #528a4c (deeper, slightly bluer), blade tips around #62985a, darker bases around #437345, slightly denser-looking blades.`

## EXTRAS (P3 : seulement si les tuiles ci-dessus ont réussi)

**Joindre pour chacun** : la maison (image 2) et la capture du lieu. Fond : plein cadre (tuiles) ou magenta (rosace).

- **Bordure de pierre** (trottoir) — sortie 1024 × 256 (4:1), se répète à l'horizontale :
  `[MAÎTRE adapté: top-down, painted pixel art at the finesse of image 2, no shadows, seamless horizontally] A straight kerb of cut light-grey granite seen from above: one continuous band filling the whole image, made of blocks about 256 px long separated by thin joints. The upper long edge is the street-side lip, slightly darker and worn and rounded; the lower long edge is the pavement side, flat. Fine grain, chips, small colour variation block to block.`
- **Bordure de brique debout** (allée du cimetière) — même format : `Same, but a "soldier course": fired clay bricks standing on end, their short faces side by side, with thin mortar joints, slight colour variation, softly worn tops.`
- **Rosace de la fontaine** — carré 2048 × 2048 (2:2 si possible plus grand), fond magenta autour du disque :
  `A circular paving rosette for a town-square fountain, seen strictly from above, painted pixel art at the finesse of image 2. The disc fills 94% of the image width, centred, on a flat pure magenta #FF00FF background. Light granite and sandstone cobbles laid in three concentric rings around a plain circular centre (the fountain basin will be placed there: fill the centre with plain mid-grey stone, diameter 28% of the disc); the outer ring laid radially, a thin darker ring of paving at the very edge. No shadows, no water, no text.`
- **Plancher de bois** (pont, ponton, quai, terrasses) — plein cadre, 1024 × 1024, bouclant :
  `Weathered oak planks of a deck, seen from above, running horizontally, each plank about 128 px wide with fine dark gaps, visible wood grain, small knots, nail heads at the ends, gentle tonal variation plank to plank, silvery weathering. Match the plank width and direction of the deck in image 3.`
- **Anti-répétition (herbe, goudron, gravier, terre)** — joindre `<nom>-2x2-x8.png` en image 1 : `Image 1 is the same 64x64 tile repeated 2x2. Repaint it as ONE seamless 2048x2048 texture in which the four quarters are NOT identical: each quarter keeps the layout of its source quarter, but with its own different grain, stains, tufts and cracks. Same average colour, same lightness, same sharpness as the rest of this conversation.` (inutile pour les dallages : leur plan doit rester celui du jeu).

## Ce que je vérifierai à chaque retour (vous n'avez rien à mesurer)
Taille ; bouclage mesuré comme `render-rues` ; écart de teinte et de valeur avec la tuile actuelle (doit rester petit — c'est le
« sans tout changer ») ; décalage des joints par rapport à l'actuelle ; périodicité visible une fois assemblé en 6 × 6 cases.
