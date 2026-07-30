# Défi de fuite — monde sombre de Ferme Vallée

Endless runner 3D façon Temple Run, intégré à Ferme Vallée comme défi du monde
sombre. **Prototype de gameplay** : les graphismes sont volontairement jetables,
tout l'effort est passé sur les sensations, la génération procédurale et
l'architecture.

---

## Comment on y joue, dans le jeu

Franchir le passage sombre, puis marcher jusqu'à la **porte du bord est**
(`C.RUN_GATE`, deux braseros orange). Un couloir dégagé y mène depuis l'arrivée,
sur les cinq mondes du passage — y compris le labyrinthe.

Marcher sur la porte ouvre le défi par-dessus la ferme. En cas de défaite :
écran de fin, puis retour à la ferme **blessé 10 minutes** (`RUN_INJURED_MS`),
avec les **bonbons** ramassés. Abandonner une course en cours compte comme une
défaite ; ressortir depuis l'écran-titre est gratuit.

## Y jouer seul, pour itérer sur le gameplay

Double-cliquer sur **`index.html`**. Pas de build, pas de serveur. Le défi
détecte qu'il n'est pas embarqué : français, record en `localStorage`, aucune
conséquence.

> **Une dépendance externe** : `three.js` vient du CDN cdnjs, donc accès
> internet au premier chargement. Il est chargé DANS l'iframe, jamais dans le
> bundle Next : rien à ajouter à `package.json`, et un CDN muet ne casse que le
> défi, pas la ferme. Pour rendre le tout autonome, déposer `three.min.js` ici
> et changer une ligne d'`index.html`.

---

## Commandes

| Touche | Effet |
|---|---|
| **← →** ou **A D** | changer de voie — **et tourner** aux intersections |
| **↑**, **W** ou **Espace** | sauter |
| **↓** ou **S** | glisser |
| **Échap** | pause |

AZERTY (**Q/Z/S/D**) et tactile (glissements) fonctionnent aussi.

**Percuter un obstacle ne tue pas** : on trébuche, on perd de la vitesse, et la
meute reprend 8 unités. Ce sont les loups qui tuent. Seuls les trous et les
virages manqués sont fatals sur le coup.

---

## Architecture

Un fichier = un système. Scripts classiques (pas de modules ES) : c'est ce qui
permet le double-clic sans serveur.

| Fichier | Rôle |
|---|---|
| `js/config.js` | **tous** les réglages de gameplay + la palette du monde sombre |
| `js/strings.js` | textes FR/EN du défi (la ferme impose la langue) |
| `js/bridge.js` | dialogue postMessage avec la ferme |
| `js/input.js` | clavier et tactile → actions, avec tampon d'entrée |
| `js/track.js` | génération procédurale, obstacles, pièces, règles d'équité |
| `js/player.js` | déplacement, saut, glissade, virages, collisions |
| `js/wolves.js` | la poursuite |
| `js/camera.js` | caméra de poursuite |
| `js/world.js` | tout Three.js : scène, matériaux, construction des tronçons |
| `js/ui.js` | écrans, compteurs, langue, record |
| `js/game.js` | machine à états et boucle principale |

**Pour régler le jeu, on n'ouvre que `config.js`.** Rien d'autre ne contient de
nombre de gameplay.

### Protocole avec la ferme

```
ferme -> défi : { type:"vf-run-init", lang, best }
défi -> ferme : { type:"vf-run-ready" }
                { type:"vf-run-over", score, candies, distance, cause }
                { type:"vf-run-exit" }
```

`vf-run-over` part quand le joueur ferme l'écran de fin, pas à sa mort : il doit
pouvoir lire son score avant que la ferme enchaîne son fondu au noir. Les deux
côtés vérifient `event.origin` — la page est servie par la ferme, donc même
origine.

---

## Vérification

Quatre scripts Node, depuis ce dossier. Aucune dépendance.

```
node tools/verify-fairness.js    # équité de la génération (≈ 7 500 km)
node tools/simulate-run.js       # 120 parties complètes, sans navigateur
node tools/smoke-render.js       # rendu exercé avec un faux Three.js
node tools/check-strings.js      # parité FR/EN + couverture des libellés HTML
```

`verify-fairness.js` ne vérifie pas une règle arbitraire mais une **simulation
de disponibilité** : chaque parade occupe le joueur pendant une durée connue
(saut 0,71 s, glissade 0,62 s, voie 0,20 s), et à 34 u/s un saut consomme 24
unités de piste. L'espacement minimal entre obstacles est donc *calculé* à
partir de la physique du joueur, pas choisi à la main.

Côté ferme, `verify-gate` (dans le zip de livraison) refait un parcours en
largeur depuis l'arrivée du monde sombre jusqu'à la porte, avec le vrai test de
collision du jeu, sur les six cartes.

---

## Ce qui reste à faire

- **Le sprite du fermier** : aujourd'hui une silhouette en boîtes reprenant les
  proportions et les couleurs `OUTFITS[0]`. À remplacer par le vrai sprite.
- **Les loups** : trois boîtes noires à yeux rouges. Le sprite existe dans
  `fermeArt.js`.
- **Le décor** : arbres morts, colonnes, runes sont des boîtes. La palette, elle,
  est la bonne (relevée dans `drawEvilFrame`).
- **Le son** : rien.
- **Les bonbons** : ramassés et comptés, mais on n'en fait encore rien.
