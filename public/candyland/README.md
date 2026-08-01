# Le Gourmandin — mini-jeu du Pays des Bonbons

Zip 385. Page autonome servie depuis `public/candyland/`, affichée par Ferme
Vallée dans une `<iframe>` plein écran quand le joueur s'approche du Gourmandin
sur la carte du Pays des Bonbons. Jeu de type *Cut the Rope* : trancher les
cordes pour faire tomber le bonbon dans la bouche du monstre, quinze niveaux.

## Pourquoi une iframe (et pas un composant React)

Les trois raisons du zip 372, inchangées :

1. **La ferme doit continuer de tourner derrière.** Si c'est l'hôte qui joue,
   arrêter `FermeGame` figerait le monde pour tout le monde.
2. **Le clavier et la souris.** Le mini-jeu capte les clics (couper, crever) et
   `R`/`Échap`. Dans le même document, un geste de coupe déclencherait aussi
   les outils de la ferme.
3. **Zéro ligne de plus dans `FermeGame.js`**, qui fait déjà 15 000 lignes.

Différence avec le défi de fuite : **aucune dépendance externe**. C'est du
canvas 2D, pas de three.js, donc pas de CDN — une panne de cdnjs ne peut pas
empêcher ce mini-jeu de démarrer.

## Protocole

```
ferme -> jeu : { type:"vf-candy-init", lang, level, goldClaimed, catDone }
jeu -> ferme : { type:"vf-candy-ready" }
               { type:"vf-candy-level", level, stars }
               { type:"vf-candy-exit" }
```

`level` à l'aller = plus haut niveau **déjà terminé**. Au retour = le niveau
qu'on **vient** de terminer, envoyé **dès la victoire** — et pas à la fermeture
de l'écran de fin, contrairement à `vf-run-over`. Un score se contemple, une
progression se garde : le joueur doit pouvoir fermer l'onglet entre deux
niveaux sans rien perdre.

`goldClaimed` / `catDone` ne choisissent que le **texte affiché**. La ferme
reste seule juge de l'attribution (`resolveCandyLevel`, `fermeEngine.js`), et
elle refuse notamment tout saut de niveau.

## Fichiers

| Fichier | Rôle |
|---|---|
| `js/strings.js` | `CANDY_STR`, FR/EN — **36 = 36 clés** |
| `js/config.js` | toute la physique et la palette, y compris la scène logique 800×600 |
| `js/bridge.js` | dialogue avec la ferme, borne les valeurs reçues |
| `js/levels.js` | les quinze niveaux, données pures |
| `js/physics.js` | Verlet à pas fixe — **aucun DOM, aucune horloge** |
| `js/render.js` | tout le dessin, ne modifie aucun état |
| `js/ui.js` | panneaux et libellés, liste `IDS` |
| `js/game.js` | boucle, commandes, progression |

## Outils

```
node tools/verify-levels.js        # les 15 niveaux sont-ils gagnables ?
node tools/verify-levels.js 11     # un seul, verbeux (imprime un plan gagnant)
node tools/check-strings.js        # parité FR/EN + couverture du HTML + ui.js exécuté
```

`verify-levels.js` charge la **vraie** physique et cherche par tirages
aléatoires une suite d'actions qui gagne. Il a servi immédiatement : **trois
niveaux sur quinze étaient impossibles** à la première écriture (9, 11 et 13),
tous pour la même cause — le rectangle du souffleur ne recouvrait pas la
colonne que le bonbon remonte réellement. C'est de là que viennent les réglages
`power` (par souffleur) et `lift` (par bulle) : une valeur globale rendait les
niveaux à bulle soit inertes, soit incontrôlables.

Il signale aussi les niveaux dont la fenêtre de solution est très étroite
(seuil : 0,2 % des essais). Le niveau 11 y est tombé à 0,17 % et a été élargi.

**Ce que l'outil ne prouve pas** : il coupe les cordes directement, sans
simuler le geste de souris. Il affirme qu'une trajectoire gagnante existe, pas
qu'elle est humainement facile. La difficulté reste un jugement à l'œil.

## Ce qu'il faut savoir avant d'ajouter un niveau

- La scène est en coordonnées **logiques fixes** (800×600). Ne jamais passer en
  coordonnées relatives à la fenêtre : on perdrait à la fois l'égalité entre
  écrans et toute possibilité de vérification hors navigateur.
- Un mécanisme neuf s'introduit **seul**, dans un niveau facile, avant d'être
  combiné (la bulle au 8, le souffleur au 9, le coussin au 11).
- Les niveaux **10** et **15** sont des paliers de récompense (or, chat
  berlingot). Les renuméroter sans toucher à `CANDY_GAME_GOLD_LEVEL` /
  `CANDY_GAME_PET_LEVEL` dans `fermeConstants.js` déplacerait les prix en
  silence.
- Relancer `verify-levels.js` après **toute** retouche de géométrie.
