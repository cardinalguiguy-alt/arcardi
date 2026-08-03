# La Grande Descente — `public/candyluge/`

Quatrième mini-jeu de Ferme Vallée (zip 411), au bout du **pont arc-en-ciel** du
Pays des Bonbons — à la place du Gourmandin, qui a déménagé au milieu du lac.

Page autonome servie dans une `<iframe>` par-dessus la ferme, qui continue de
tourner derrière. Même architecture que `templerun/` et `labyrinth/`, et pour
les mêmes raisons (voir `public/templerun/js/bridge.js`, qui fait autorité).

## Les fichiers

| fichier | ce qu'il sait |
|---|---|
| `js/config.js` | **tous** les nombres. Rien ailleurs. |
| `js/slope.js` | la piste : une courbe continue, pas une grille de voies. |
| `js/sled.js` | la physique de la luge. Ne connaît que la pente et les touches. |
| `js/critters.js` | les gourmands mobiles et les bonbons — et la garantie de passage. |
| `js/camera.js` | le cadrage large. C'est lui qui décide si le paysage existe. |
| `js/world.js` | la scène : ciel, montagnes, piste, décor, luge, étoiles. |
| `js/input.js` | clavier **et** souris. Mêmes touches que le défi de fuite. |
| `js/ui.js`, `js/strings.js`, `js/bridge.js`, `js/game.js` | HUD, textes, ferme, boucle. |

## Les outils

```
node public/candyluge/tools/verify-luge.mjs    # 19 contrôles — la descente est jouable
node public/candyluge/tools/preview-luge.js    # 5 planches PNG — la descente est belle
```

**Les deux sont nécessaires et aucun ne remplace l'autre.** `verify-luge` prouve
qu'un pilote maladroit arrive en bas ; `preview-luge` montre à quoi ça
ressemble. Le premier a trouvé quatre fautes de jouabilité invisibles à la
lecture, le second en a trouvé deux de géométrie — elles sont documentées sur
place, à l'endroit exact du code qu'elles ont fait changer.

## Les trois choses à ne pas défaire

1. **La luge n'a pas de moteur.** Toute la vitesse vient de `g·sin(pente)`.
   C'est ce qui rend une descente racontable : on se souvient du mur.
2. **Le dérapage est une intensité, pas un état.** Il naît de l'écart entre là
   où la luge pointe et là où elle va. Tout s'y branche : étoiles, turbo,
   caméra, score.
3. **Il reste toujours un passage entre les gourmands.** C'est une propriété de
   construction (`critters.js`), pas un résultat de test — et elle est
   re-mesurée sur les 79 vagues par `verify-luge.mjs`.
