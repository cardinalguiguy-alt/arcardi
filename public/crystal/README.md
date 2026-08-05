# La Vallée de Verre — *Sous l'Aurore*

Quatrième mini-jeu. Destination du **pont de cristal** (`PASSAGE_GATE_DEST.crystal`),
qui ne menait nulle part depuis le zip 386.

Page autonome servie depuis `public/crystal/`, dans une `<iframe>`, comme les
trois autres. Aucune dépendance externe — **pas de three.js** : tout est en 2D
logicielle.

---

## LA DÉCISION D'ARCHITECTURE

Tout le dessin passe par un **tampon logiciel** de 480 × 270 (`js/pix.js`), et
l'affichage n'est qu'un `putImageData` agrandi au plus proche voisin.

Trois conséquences, dans l'ordre d'importance :

1. **Aucun anticrénelage n'est possible.** Un canvas 2D lisse les arcs, les
   obliques et les dégradés — c'est ce qui trahit un faux pixel art. Ici un
   pixel est écrit ou ne l'est pas.
2. **Le même code tourne dans node.** `tools/preview.mjs` rend une scène et
   écrit un PNG. On peut donc *regarder* ce qu'on livre — c'est la dette que le
   contexte 417 signale trois fois (le sillage du labyrinthe, la gerbe du 414,
   le mur du 417 : corrects sur le papier, jamais regardés).
3. Le mélange additif de l'aurore est écrit à la main, donc exact et identique
   partout.

---

## LES FICHIERS

```
js/pix.js       tampon logiciel, bruit semé, primitives
js/config.js    ⚠️ LA PALETTE (36 couleurs, fermée) + les réglages
js/sky.js       ciel, étoiles, ⚠️ L'AURORE, montagnes
js/land.js      neige, falaises de glace, rivière gelée
js/flora.js     les arbres, en quatre plans
js/props.js     braseros, pont, colonnes, cristaux, cabane, bêtes, personnage
js/scenes.js    les deux tableaux : « corniche » (réf. 2), « pont » (réf. 1)
js/walk.js      la marche sur le lac gelé (pseudo-3D, réf. 1 du 1er message)
js/story.js     ⚠️ LE RÉCIT — données pures, aucun code
js/cine.js      le moteur de cinématique
js/strings.js   textes d'interface fr/en
js/ui.js        les couches DOM
js/bridge.js    postMessage avec la ferme (protocole vf-cry-*)
js/game.js      CryGate (mur de chantier) + boucle
```

---

## LES OUTILS

```
node tools/preview.mjs                 rend toutes les scènes en PNG
node tools/preview.mjs corniche 6 55   scène, temps, caméra
node tools/preview.mjs walk 26         le segment jouable
node tools/verify-vallee.mjs           46 contrôles (palette, mur, récit, rendu)
node tools/verify-boot.mjs             40 contrôles (démarrage, mur, interrupteur, branches)
node tools/build-demo.mjs              la page unique d'essai, mur ouvert
```

**Les contrôles se posent en RAPPORT, jamais en seuil absolu** — règle du 417.
Exemple : l'aurore n'est pas mesurée en « nombre de pixels verts » (ce critère
rendait zéro : l'aurore est additive sur un ciel bleu, le vert ne dépassera
jamais le bleu du ciel dessous). Elle est mesurée en rendant **exactement le
même tableau avec `auroraGain: 0`** et en comparant.

---

## LE MUR DE CHANTIER

`CryGate`, copie assumée de `LabGate` (417) et de la descente (415).
**Même geste** — ⌘⇧X ou Ctrl⇧X, deux fois en moins de 3,5 s.
**Mémoire séparée** — clé `vf-cry-wip`, jamais `vf-lab-wip` ni `vf-luge-wip`.

### ⚠️ ET IL NE LAISSE RIEN VOIR — deux ceintures

Le mur existait dès la première version, et il était **transparent**. Le
panneau de chantier est du DOM posé sur le canvas ; comme tous les `.layer` du
projet il était semi-opaque, et le tableau de la corniche continuait de
s'animer derrière — aurore, braseros, neige. **Un mur qui laisse voir le jeu ne
le cache pas, il l'annonce.**

C'est exactement le défaut que le contexte du 417 signalait déjà pour le
labyrinthe : *« le mur n'a été vu sur aucune image »* — son comportement était
vérifié de bout en bout, son **aspect** ne l'était pas.

1. **`game.js` ne rend rien** tant que l'état vaut `"gate"` : le tampon est
   rempli d'une seule couleur. Ce n'est pas qu'une question d'opacité — peindre
   130 000 pixels et trois rubans d'aurore soixante fois par seconde pour ne
   rien montrer se voit sur la batterie d'un portable.
2. **`#construction` est opaque** en CSS, et c'est le seul panneau du jeu qui
   le soit. Les autres (pause, bilan) doivent laisser voir le jeu derrière.

`verify-boot.mjs` regarde maintenant **ce qui est réellement présenté à
l'écran** : une seule couleur derrière le mur, 26 000 une fois le fondu passé.
Le stub a dû apprendre que `present()` peint dans un canvas hors écran, pas
dans `#gl`.

### ⚠️ L'INTERRUPTEUR — `CFG.GATE_ON`

Un seul endroit décide, et c'est `js/config.js` :

```js
GATE_ON: true,    // le site : muré derrière ⌘⇧X ×2
GATE_ON: false,   // pour essayer : la vallée s'ouvre directement
```

`game.js` ne fait que le lire. **Ne jamais régler ça en modifiant de la
logique** — la note du 417 disait « remplacer les trois dernières lignes de
`boot()` », c'est-à-dire toucher au code pour faire un réglage, et c'est
exactement comme ça qu'un mur finit par ne plus se refermer.

- `tools/build-demo.mjs` bascule la clé **dans la copie** qu'il produit : la
  page d'essai s'ouvre sur le jeu, `public/crystal/` reste muré.
- `verify-vallee.mjs` **refuse que le dépôt parte à `false`**. C'est le seul
  garde-fou qui compte.
- `verify-boot.mjs` vérifie qu'à `false` la vallée s'ouvre **sans écrire la
  session** : remettre `true` remure vraiment, au lieu de laisser un navigateur
  déverrouillé pour toujours.

---

## CE QUI RESTE À FAIRE

1. **Le son.** Rien. C'est un jeu de silence et de vent — le premier chapitre
   s'en sort, pas le troisième.
2. **Le côté ferme n'est pas branché.** `PASSAGE_GATE_DEST.crystal`,
   `CRY_PRIZE_GOLD`, `CRY_SHARD_GOLD`, l'iframe et les textes de la ferme
   restent à écrire. Le jeu émet déjà `vf-cry-chapter` avec ses drapeaux.
3. **Le skin du fermier n'est pas lu.** `Bridge.skin` arrive, `Props.hero` ne
   s'en sert pas encore.
4. **Les chapitres 2 à 7** — voir la bible de scénario.
5. **⚠️ La démo n'a été regardée que dans node.** Les PNG sont justes ; le
   comportement à l'écran (fondu, frappe du texte, agrandissement entier sur un
   écran réel) n'a été vérifié que par stub. Trente secondes à regarder.
