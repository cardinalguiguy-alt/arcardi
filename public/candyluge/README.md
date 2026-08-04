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
node public/candyluge/tools/verify-luge.mjs    # 34 contrôles — la descente est jouable
node public/candyluge/tools/preview-luge.js    # 9 planches PNG — la descente est belle
```

**Les deux sont nécessaires et aucun ne remplace l'autre.** `verify-luge` prouve
qu'un pilote maladroit arrive en bas ; `preview-luge` montre à quoi ça
ressemble. Ils sont documentés sur place, à l'endroit exact du code que chaque
trouvaille a fait changer.

⚠️ **Au 414, ils ont trouvé quatre défauts dont AUCUN n'était visible en
relisant le code**, et ils valent d'être connus parce qu'ils sont typiques :

| trouvé par | défaut | pourquoi invisible autrement |
|---|---|---|
| `verify-luge` | on réapparaissait **sur** un gourmand : 199 chutes au même mètre, **jeu inachevable** | chaque système était juste ; le défaut naissait de leur rencontre |
| `preview-luge` | après une chute, on repartait **dans le vide** — plus aucune piste construite | la physique était correcte, la piste était simplement invisible |
| `preview-luge` | les montagnes **flottaient dans le ciel** en bas de piste | le défaut ne commençait qu'à mi-parcours, et aucune planche ne regardait si loin |
| `verify-luge` | le pilote automatique **oscillait** au lieu de piloter, et accusait le jeu | il produisait de vrais chiffres, très convaincants — 22 chutes par descente |

⚠️ **Et une leçon sur les outils eux-mêmes** : les grands chevrons roses qui
barraient la piste ont été poursuivis pendant trois itérations avant qu'on
comprenne qu'ils venaient du rasteriseur de `preview-luge` (placage affine, non
perspective-correct) et non du jeu. Devant un défaut sur une planche, la
première question est toujours : *le jeu l'a-t-il, ou seulement la planche ?*

## ⚠️ LE JEU EST DERRIÈRE UN MUR DE CHANTIER (415)

Au chargement, la page affiche **« Jeu en construction, revenez plus tard »** et
rien d'autre n'est accessible. On l'ouvre avec **⌘⇧X pressé DEUX FOIS** (ou
Ctrl+Maj+X hors Mac), les deux pressions à moins de 3,5 s d'intervalle. Le
déverrouillage tient pour **la session de l'onglet** ; fermer l'onglet remet le
mur.

- Deux pressions et non une : un raccourci unique se déclenche par accident.
- `Gate` est en tête de `js/game.js`, en **phase de capture**, pour ne pas
  dépendre de l'ordre de chargement des fichiers.
- **⚠️ CE N'EST PAS UNE PROTECTION.** Les fichiers sont publics ; le but est de
  ne pas proposer un jeu inachevé, pas de garder un secret. Ne rien mettre
  derrière ce mur qui doive vraiment le rester.
- **Pour rouvrir le jeu à tous**, il suffira de remplacer l'appel
  `UI.show(Gate.unlocked() ? "title" : "construction")` par `UI.show("title")`
  aux deux endroits de `init()` — le reste peut rester en place.

## Les trois choses à ne pas défaire

1. **La luge n'a pas de moteur.** Toute la vitesse vient de `g·sin(pente)`.
   C'est ce qui rend une descente racontable : on se souvient du mur.
2. **Le dérapage est une intensité, pas un état.** Il naît de l'écart entre là
   où la luge pointe et là où elle va. Tout s'y branche : étoiles, turbo,
   caméra, score.
3. **Il reste toujours un passage entre les gourmands.** C'est une propriété de
   construction (`critters.js`), pas un résultat de test — et elle est
   re-mesurée sur toutes les vagues par `verify-luge.mjs`.
4. **(414) Une chute renvoie au dernier fanion, et le chrono ne s'arrête
   jamais.** C'est le modèle de Lonely Mountains : la punition est réelle, la
   reprise est immédiate. Les deux moitiés doivent rester vraies ensemble.
5. **(414) La zone dégagée à la reprise n'est pas du confort.** Un système à
   checkpoints transforme n'importe quel passage infranchissable en **boucle
   infinie** ; `CP_CLEAR` et la garantie de progression (`Field.rewind`) sont ce
   qui rend cette boucle impossible par construction.
6. **(414) Tout ce qui coûte de la vitesse coûte aussi de la difficulté.** La
   limite d'adhérence est proportionnelle à la vitesse : une résistance trop
   forte ne durcit pas le jeu, elle **supprime le dérapage**. Toute nouvelle
   résistance se mesure sur `skid`, jamais sur `v` seul.
7. **(414) Un motif de sol ne descend jamais sous ~1,5 unité de période**, et se
   peint EN UNITÉS DU MONDE (`PX` dans `paintPiste`/`paintSnow`), jamais en
   pixels. En dessous, il ne se voit plus de près et il scintille de loin.
