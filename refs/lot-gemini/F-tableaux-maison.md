# F — LES TOILES DES TABLEAUX DE LA MAISON (lot 2c des intérieurs) — préparé le 2026-10-21

Rien ici ne touche au jeu. Les trois tableaux du catalogue « Aux murs » ont une toile **PROVISOIRE peinte au canevas**
(`components/ferme/maisonArt.js`, `toilePaysage`, `toileNature`, `toilePortrait`) ; les définitives viennent de Gemini
(ta réponse du 2026-10-21). **C'est toi qui colles les prompts** ; je n'appelle rien. Le cadre doré reste peint par le
jeu : Gemini ne fait QUE la toile.

## ⚠️ À trancher avant de générer : la taille

Une toile se voit À L'ÉCHELLE DE LA MAISON (64 px par case de 1,18 m) : le paysage fait **28 × 18 px** de toile, la nature
morte **19 × 24**, le portrait **18 × 25**. À cette taille, une image Gemini ne garde que sa composition, ses masses et sa
palette — le détail fin disparaît. Deux voies :
1. **Garder ces tailles** (recommandé : un tableau plus grand mange le mur, et le séjour n'a déjà que deux places) : je
   réduis l'image de Gemini à la taille exacte, par moyenne de blocs puis palette réduite, et je juge en jeu à côté de la
   toile provisoire (`tableaux-ref/provisoire-*.png`). Les prompts ci-dessous demandent donc **de grandes masses lisibles**.
2. **Agrandir les cadres** (par ex. 0,90 × 0,64 m pour le paysage) : plus de détail visible, moins de places au mur.

## Références (dans `tableaux-ref/`, à joindre dans cet ordre)

1. `sejour-temoin.png` : le séjour du jeu, de jour, avec les deux tableaux provisoires accrochés (le style de la maison).
2. `provisoire-<sujet>.png` : la toile provisoire du sujet (composition et cadrage voulus ; elle est agrandie ×3).

## Prompt MAÎTRE (une conversation neuve par tableau ; coller ce bloc, puis la ligne du sujet dans le même message)

```
You are painting a small framed painting that hangs on the wall of a cosy French village house in a pixel-art life-sim
game (reference 1 shows the room; reference 2 shows the current placeholder painting and the composition I want).
Paint ONLY the canvas, edge to edge: no frame, no wall, no border, no signature, no text.
Style: a 19th-century French oil painting, rendered as detailed hand-painted pixel art (like the furniture in reference 1),
NOT a photo, NOT smooth vector art. The image will be shown very small in the game, so build it from a few LARGE, clearly
separated shapes with strong light/dark contrast and a limited warm palette; avoid fine texture and tiny details.
Highest resolution available. Subject:
```

## Les lignes de sujet

| Fichier à rendre | Proportion | Ligne à ajouter après le maître |
|---|---|---|
| `toiles/tableau_paysage-a.png` (puis `-b`) | **14 : 9** (paysage) | `A summer countryside landscape: a pale blue sky with two soft clouds, distant blue-green hills, a white farmhouse with a red tile roof on the left, a tall dark poplar on the right, a sunny meadow with a winding ochre path in the foreground.` |
| `toiles/tableau_nature-a.png` | **4 : 5** (portrait) | `A still life on a dark wooden table against a deep brown background lit from the right: a pewter jug on the left, a white and blue faience bowl full of red apples, an orange and a green pear, a bunch of purple grapes hanging over the edge.` |
| `toiles/tableau_portrait-a.png` | **5 : 7** (portrait) | `A dignified head-and-shoulders portrait of an elderly ancestor, a man with short dark-brown hair and a gentle face, dark navy coat with a white collar, against a dark olive-green background with a soft vignette, lit from the upper left.` |

Règles du lot (`00-LISEZ-MOI.md` §1) : 3 à 4 tirages par toile, garder les deux meilleurs (`-a`, `-b`), ne rien retoucher.
Rendre les fichiers dans `refs/lot-gemini/toiles/`.

## Ce que je ferai à la livraison (rien n'est fait)

Pour chaque toile : la réduire à sa taille exacte (`maisonArt.muralPx` moins le cadre), la poser par le dernier argument de
`maisonArt.bakeMural` (le jeu la charge dans `homeMuralImg`, FermeGame.js ; le catalogue et le garde-meuble dans
`homeItemSrc`), relancer `render-maison` (`maison-muraux.png`, `maison-2c.png`) et juger EN JEU, à côté de la provisoire,
avant la suivante.
