# CLAUDE.md — CONTEXTE ARCARDI

**Lis ce fichier en entier avant toute action. Puis arrête de lire et demande.**
Il remplace l'exploration du dépôt pour tout ce qui est global. Le README du projet est un
journal chronologique inversé : c'est de l'**histoire**, pas de l'orientation.

État à jour du **zip 424**. Chantier actif : **`candyluge`**. **`crystal` est EN PAUSE**
(Guillaume n'était pas satisfait du rendu ; le travail du 421 y reste valide). La ferme n'a
pas bougé depuis le 419, à une ligne près (§4).

⚠️ **LE 424 EST LE PREMIER ZIP ÉCRIT AVEC UN NAVIGATEUR.** Les 422 et 423 avaient été
écrits à l'aveugle, et ça se voyait : trois de leurs livraisons ne fonctionnaient pas du
tout (§6). **Tout ce qui est visuel se vérifie désormais à l'écran, plus sur planche.**

---

## 0. L'objectif de Guillaume — ce à quoi tout se mesure

**Une soirée de jeu entre amis, à deux ou trois, qui donne envie d'y revenir.** Arcardi
n'est pas une plateforme : c'est un salon qu'on ouvre un vendredi soir avec un code
partagé. Tout arbitrage se fait contre ce chiffre — **2 joueurs, occasionnellement 3**.

1. **La qualité passe avant le nombre.** Vingt-deux jeux existent ; ce qui compte est qu'un
   jeu donné soit *fini*. Depuis le 421, l'exigence est explicitement **AAA**.
2. **Le monde partagé est le cœur.** La ferme est un lieu persistant qu'on habite ; les
   mini-jeux sont des portes qui s'y ouvrent, jamais des applications séparées.
3. **Rien ne doit casser pour les autres.** Le multijoueur est fragile et gratuit (§3).

---

## 1. Le projet

Next.js 14 (App Router, **JavaScript pur, pas de TypeScript**) + Supabase (auth, Postgres,
Realtime) + Vercel. Salons à code partagé, 22 jeux, scores synchronisés.

**La ferme** (`GAME_ID = "ferme"`) est un monde partagé persistant, ~99 % du trafic réseau.
**`candyluge`** est un jeu de descente 3D solo en three.js — chantier actif. **`crystal`**
(Grottes de Cristal) est un jeu narratif solo à rastériseur logiciel — en pause.

---

## 2. Travailler avec Guillaume

**Mode par défaut**
- **Avant toute production créative, poser des questions.** Ne pas deviner l'intention.
  C'est la consigne la plus souvent oubliée.
- **Pour tout changement important, LISTER les décisions structurantes et ATTENDRE
  validation** avant de coder.
- **Ne pas mêler deux changements visuels dans la même livraison** — décision du 424 :
  Guillaume ne peut plus juger lequel des deux a produit quoi.
- **Commentaires systématiques** partout où il y a un *pourquoi*, une hypothèse écartée, un
  piège. Avec le numéro de zip d'origine. C'est la mémoire longue du projet.

**Mode caveman** — « caveman on » inverse le contrat : exécuter, vite et bien, sans
questions ni préambule. « caveman off » rétablit. Accuser réception en une ligne.

**Rituel de fin de session / grosse étape**
1. Sur demande, **mettre à jour ce fichier directement**. Il est versionné avec Git : il
   n'y a plus de zip de contexte séparé.
2. Les commits et push restent décidés par Guillaume (GitHub Desktop), sauf demande
   explicite. Ne jamais push sans validation.
3. **Dire explicitement si une manipulation Supabase est nécessaire**, et laquelle. Si
   non : le dire aussi.

**Où va quoi — ne jamais créer de structure parallèle**

| Quoi | Où |
|---|---|
| Récit d'une étape/session | **en tête du README** |
| Le *pourquoi* d'une ligne, un piège local | **commentaire de code**, avec le n° de zip |
| Objectif, contraintes, pièges globaux, avancement | **ce fichier** |

Jamais de fichier de doc autonome à la racine (`AUDIT-X.md`, `NOTES.md`…).

**Règle dure : aucune migration SQL ni changement de schéma sans validation préalable.**

---

## 3. Contraintes réseau — avant de toucher au moindre `send()`

- **L'hôte est l'autorité, toujours.** L'invité émet un `req`, l'hôte arbitre et rediffuse
  un `apply`.
- **Plafond dur de 10 messages/s par client** (`eventsPerSecond`). Dépassement
  **silencieux** ; depuis le 419 un `console.warn` le signale.
- **Facturation** : 1 broadcast = 1 message + 1 par client abonné. **Seul le nombre de
  `send()` compte, jamais la taille des payloads.**
- **La ferme est le seul canal en `self:false`** ; écho local à la main (`broadcastChat`).
- **Ne jamais comparer une horloge hôte à une horloge invité.** Dater à la réception.
- **Quota : 2 M messages/mois, plan gratuit**, déjà dépassé une fois. Aucune alerte de
  seuil côté Supabase — d'où `lib/realtimeQuota.js`.

---

## 4. Pièges invisibles — les casser ne produit aucune erreur

**Ferme**
- **L'instance cachée.** Hôte hors ferme : `FermeGame` reste montée dans un `display:none`
  (`fermeAway`), simule et diffuse toujours. `document.hidden` = `false`.
- **La boucle de nuages tourne à vide volontairement** (`SKY_CLOUD_COUNT: 0`) : ses tirages
  appartiennent au flux aléatoire partagé. Règle du 381.
- **`anyRemoteNear` renvoie toujours `false` pour le monde maléfique** (filtre
  `zone === "farm"`, lit `p.x/p.y`, or les spectateurs vivent en `p.ex/p.ey`).
- **`netCanBroadcast()` vs `netHasAudience()`** : le premier teste `hiddenRef`, le second
  non. Ne pas les fusionner. **`broadcastSnapshot()` reste en envoi direct.**
- ⚠️ **UN OUVREUR DE MINI-JEU APPELÉ À MI-FONDU NE DOIT PAS TESTER `zoneTransRef.active`**
  (corrigé au 422 : le Gourmandin était injoignable depuis le lac).

**JavaScript / three.js — les trois du 424, et elles se ressemblent**
- ⚠️⚠️ **`chaîne.replace("X", …)` NE REMPLACE QUE LA PREMIÈRE OCCURRENCE.** C'était la vraie
  cause des « carrés blancs ou noirs » (§6).
- ⚠️⚠️ **UN `useProgram` QUI ÉCHOUE NE DÉLIE PAS LE PROGRAMME PRÉCÉDENT.** Un shader qui ne
  compile pas ne fait donc pas disparaître son objet : il fait dessiner l'objet SUIVANT
  avec les mauvais attributs. Symptôme : un quadrilatère géant plaqué à l'écran, de la
  couleur d'un matériau voisin. **Le seul indice est `INVALID_OPERATION: program not valid`
  dans la console.**
- ⚠️⚠️ **UN `const` DE HAUT NIVEAU N'EST PAS UNE PROPRIÉTÉ DE `window`.** `window.Models`
  valait toujours `undefined` : les dix accessoires Blender du 422 n'ont jamais été chargés
  (§6). Tester avec `typeof X !== "undefined"`.
- **`Pix.rng(graine)` rend un générateur INDÉPENDANT** (`pix.js:40`). La règle du 381 ne
  vaut qu'à l'intérieur d'un même générateur.
- **`crystal` n'affiche AUCUNE image.** Tampon 480×270 écrit pixel par pixel, **toujours
  opaque**. Un PNG ne peut pas y être composé tel quel.
- **La caméra de `walk` est 2,6 unités DERRIÈRE le personnage.**
- **Rendre un objet invisible ne le retire pas du monde** (421 : les éclats de givre
  étaient toujours ramassés).

---

## 5. Carte du territoire

| Fichier | Rôle |
|---|---|
| `components/ferme/FermeGame.js` | tout le jeu ferme — **~1,1 Mo / ~18 000 lignes** |
| `components/ferme/fermeEngine.js` / `fermeConstants.js` | règles pures / réglages réseau |
| `app/room/[code]/page.js` · `lib/gameSync.js` · `lib/realtimeQuota.js` | salon · synchro · quota |
| `public/candyluge/js/config.js` | **tous** les nombres de la descente. Rien ailleurs. |
| `public/candyluge/js/slope.js` | piste. ⚠️ `finishSAt()` est **la** définition de la ligne d'arrivée |
| `public/candyluge/js/sled.js` · `critters.js` | physique · gourmands + garantie de passage |
| `public/candyluge/js/world.js` | scène : matériaux, lumière, ombres, décor, particules, post-traitement (~4 100 l.) |
| `public/candyluge/js/models.js` · `models/*.glb` | chargement glTF · dix accessoires, 300 Ko, **sans matériaux** |
| `public/vendor/three-r128/` | three.js r128 + GLTFLoader + EffectComposer, en local |
| `public/crystal/js/…` | le jeu narratif (en pause) |

⚠️ **`scenes.js` contient 2 tableaux, `shots.js` en contient 7**, tous sur un `backdrop()`
COMMUN. « Toucher les 9 scènes » = **2 fichiers**.

**Lecture de `FermeGame.js` : étroit mais profond.** `grep` sur le symptôme, lire largement
autour, chercher les autres usages du symbole avant d'éditer.

---

## 6. `candyluge` — état après le 424

Physique, piste, gourmands et checkpoints **inchangés depuis le 417**. Les 18 « choses à ne
pas défaire » sont dans `public/candyluge/README.md` et font autorité.

**⚠️ CE QUE LE 424 A DÉCOUVERT, ET QUI CORRIGE CE FICHIER.** Trois livraisons annoncées
comme faites ne fonctionnaient pas, et aucune ne levait d'erreur :

1. **Les carrés blancs et noirs n'avaient RIEN à voir avec les mipmaps.** Le 423 l'affirmait
   et se trompait. La cause est un `replace` de chaîne sur le jeton `FOGD`, présent **deux
   fois** dans le vertex shader des particules : le shader ne compilait pas, `useProgram`
   échouait, et l'appel de dessin suivant héritait du mauvais programme (§4). Corrigé —
   `pointVert()` est le seul endroit qui connaisse le jeton.
2. **Les six systèmes de particules n'étaient pas dessinés depuis le 422** — étincelles,
   poudre, lignes de vitesse, gerbe, poussières de sucre **et la pluie de bonbons de
   l'arrivée**. `preview-luge` n'exécute pas de shader : il les rendait impeccablement.
   ⚠️ **Leur réglage n'a donc JAMAIS été vu sur un GPU. La gerbe est trop grosse et trop
   blanche — une passe de calibrage reste à faire, et c'est la priorité visuelle.**
3. **Les dix modèles Blender du 422 n'étaient jamais chargés** (`window.Models`, §4). Le jeu
   tournait entièrement sur ses primitives du 416. Corrigé : `hasModels()`.
   ⚠️ **Le sapin de gomme sortait 3,5× trop petit** — `h / 3.6` supposait un gabarit de 3,6
   unités, il en fait 1,2. Corrigé par `Models.fit(nom, hauteurVoulue)`, qui MESURE le
   gabarit. **Les huit autres échelles n'ont pas été vérifiées une par une** ; la maison de
   pain d'épices sort ~1,3× plus haute que sa primitive.

**Fait au 424 — l'arrivée, demande de Guillaume.**
- **Une vraie ligne** : deux mâts, un ruban rose-et-or en deux moitiés jointives qui **se
  rompt** au passage et s'envole. Son abscisse vient de `Slope.finishSAt()`, dérivée, jamais
  recopiée. ⚠️ Le ruban est **horizontal** : la piste est encore banquée à la ligne, poser
  chaque moitié à la hauteur de son propre bord la cassait en deux marches.
- **Bannière « ARRIVÉE ! »** au franchissement, pas à l'arrêt. Panneau chiffré ensuite.
- **Confettis** (7ᵉ système de points, forme anguleuse — tout le reste du jeu est rond) +
  **ballons d'hélium qui MONTENT** pendant que bonbons et confettis tombent. Deux sens
  opposés : c'est ça qui fait la fête, pas la densité.
- **Correction d'un vrai bogue de partie signalé par Guillaume** : en enchaînant les turbos
  après la ligne, `BOOST_ACCEL` (30) dépassait la décélération (10 au maximum) et **la
  partie ne se terminait jamais**. Le turbo est désormais coupé à la ligne, le freinage part
  déjà fort (`FINISH_BRAKE_BASE`), la luge se met en travers, et `FINISH_MAX_MS` termine la
  partie quoi qu'il arrive. Une fin de partie ne doit pas dépendre d'un seuil de vitesse.

**⚠️ NON FAIT — les dettes. Causes trouvées, code non écrit.**

1. ⚠️⚠️ **TRAJECTOIRES IRRÉALISTES AU REPOS — ET C'EST PIRE QUE « PAS RÉALISTE ».** Dans
   `sled.js`, `this.lat += trackPull * dt` s'ajoute **inconditionnellement** : sans aucune
   touche, la luge dérive de `trackPull / LAT_GRIP` sur le côté. **Mesuré au 424 : une luge
   laissée sans pilote percute la barrière en quelques secondes et n'atteint JAMAIS le bas
   de la piste.** C'est la dette la plus coûteuse, et elle empêche aussi de tester
   l'arrivée sans bidouiller les constantes. **Correctif** : ne laisser passer que la
   fraction non adhérente, `trackPull * (base + (1 − base) * skid)`, `base ≈ 0,25`.
2. **Direction plus facile.** Leviers : `EDGE_RATE`, `EDGE_CROSS_MUL`, `LAT_GRIP`,
   `CARVE_K`, `GRIP_MAX` en dernier recours.
3. **Boosts avec chevrons animés au sol.** Rien d'écrit. Chemin : placement déterministe
   dérivé de `s` (comme les checkpoints) ; consommation dans `sled.js` (`this.boost`,
   `BOOST_MS`/`BOOST_ACCEL`/`BOOST_SPEED_BONUS`) ; rendu par un décalque à UV défilantes
   dans `buildNode`, matériau partagé.
4. **`clearAll()` NE RETIRE PAS LES TRONÇONS DE LA SCÈNE.** L'écran-titre en construit 60,
   `Game.start()` en reconstruit 60 sans jeter les premiers : **chaque ruban de piste est
   dessiné en double** pendant toute la partie. Trouvé au 424, non corrigé.

**Autres restes connus.** Étincelles de dérapage trop grosses de près (`stars.gain = 2.2`)
· `archOver` et `checkpointGate` encore en primitives, et l'arche occupe beaucoup de cadre
· **les bras du pilote ne s'animent plus** (`sledParts.arms` existe et reste VIDE ; le nœud
DOIT rester, `updateSled` écrit dedans).

**Piste proposée par Guillaume, non implémentée : un bonbon empoisonné noir déclenchant une
vision en négatif.** Techniquement presque gratuit — `GradeShader` est déjà un shader plein
écran, il suffit d'un uniforme `uInvert`. **Le vrai travail est de conception** : un malus
qui gêne la LISIBILITÉ dans un jeu où l'on lit la piste à 125 km/h, et comment le joueur
comprend qu'il l'a ramassé plutôt que de croire à un bogue. Le Pays des Bonbons est par
ailleurs un monde **paisible** (décision du 235).

⚠️ **LE JEU RESTE DERRIÈRE LE MUR DE CHANTIER** (⌘⇧X deux fois en moins de 3,5 s). Pour
l'ouvrir : remplacer `UI.show(Gate.unlocked() ? "title" : "construction")` par
`UI.show("title")` aux deux endroits de `init()` dans `game.js`.

---

## 7. Qualité d'image — la méthode

**Réduire la référence à 480×270, mesurer, comparer, corriger, re-mesurer. On ne juge pas au
ressenti.** ⚠️ **ET LA STATISTIQUE QUI COMPTE N'EST PAS LA MOYENNE.**

| | référence | 421 | 422 | 423 |
|---|---|---|---|---|
| L global | 180,6 | 177,9 | 174,4 | 169,4 |
| **écart-type** | **47,7** | **28,4** | 36,5 | **42,0** |
| saturation | 27,8 % | 22,1 % | 26,3 % | 29,0 % |
| pixels < L60 | 2,1 % | **0,0 %** | 0,3 % | 0,7 % |

Au 421 la luminosité MOYENNE était juste et l'image était fausse : pas un pixel sous L60,
donc aucune ombre. ⚠️ **On ne corrige pas ça en baissant l'exposition** — il faut un
**écart**, pas un décalage. ⚠️ **Ces chiffres sortent de `preview-luge`, donc d'un rendu
SANS particules** (§6) : ils restent valides pour le décor, pas pour les effets.

⚠️⚠️ **LA LEÇON LA PLUS COÛTEUSE, ET ELLE EST GÉNÉRALE : un paramètre de l'outil qui DOUBLE
un paramètre du jeu est une divergence en attente. Il doit être DÉRIVÉ, jamais réglé.** Le
424 l'a appliquée trois fois : `Slope.finishSAt()`, `Models.fit()`, `pointSystems`.

⚠️ **Corollaire de palette :** deux couleurs réglées à l'œil côte à côte dans un pipeline
gamma **ne gardent pas leur écart apparent** une fois le rendu passé en linéaire.

⚠️ **Fausses pistes mesurées et écartées — ne pas les refaire :** monter le dégradé du ciel
de crystal · doubler `BLOOM_H`/`BLOOM_K` (**ne pas y toucher**) · densifier des traits
clairs sur ciel noir · compenser le linéaire en montant les intensités « au jugé » (soleil à
2,45 → image **entièrement blanche** ; repère : neige au soleil ≈ **1,15 linéaire**, à
l'ombre ≈ **0,40**) · peindre des veines cyan sur la piste rose (leur mélange passe par le
**gris** ; la sortie est dans la VALEUR).

**Côté `crystal`, NON PROPAGÉ :** `Flora.canopy` n'est appelée que par `walk.js`. `corniche`
et `pont` sont **bit à bit identiques** au 419.

---

## 8. Blender — deux pipelines, à ne pas confondre

BlenderMCP est installé (Blender 5.2 LTS) et **répond**.

**Pipeline A — vers `crystal` (pixel art).** On modélise, on rend, on **transcrit en table
de données**. **Jamais de PNG dans le jeu.** Trois réglages contre-intuitifs : **ombrage
plat pur** · **aucun anticrénelage** (`taa_render_samples = 1`, `filter_size = 0.01`) ·
**quantification LINÉAIRE**. Courbe `Standard`, lampes **Soleil**.

**Pipeline B — vers les jeux three.js (glTF).** Script `candyluge_props.py`, hors dépôt.
1. **Export sans matériaux.** Maillages nommés `part_<clé>` (clé de `mat` dans `world.js`).
   La palette reste dans `config.js`.
2. **Budget serré** : 200 à 900 triangles par accessoire (13 438 au total).
3. ⚠️ **BLENDER EST Z-UP, THREE.JS EST Y-UP, ET L'EXPORTEUR CONVERTIT FIDÈLEMENT UNE
   ORIENTATION FAUSSE** — d'où `yup_authoring()`.
4. ⚠️ **L'EXPORT gltf EXIGE UN CONTEXTE** : `temp_override(…, area=VIEW_3D, region)`, et
   **désélectionner avec `bpy.ops.object.select_all`** — sinon échec au **deuxième**
   accessoire seulement.
5. ⚠️ **L'ÉCHELLE D'UN ACCESSOIRE SE DÉRIVE DU GABARIT** (`Models.fit`), jamais devinée
   dans l'appelant. Voir §6.

⚠️ **ET BLENDER NE SERT PAS À TOUT.** Canopées, brumes et masses d'arbres sont **du code
procédural**. ⚠️ **Juger un prop nu sur fond plat n'a aucun sens.**

---

## 9. Vérification

⚠️⚠️ **`node` N'EST INSTALLÉ NULLE PART SUR CETTE MACHINE.** Ni `npm run dev`, ni
`verify-luge.mjs`, ni `preview-luge.js`, ni `npx next build` ne peuvent tourner en local.
Guillaume déploie par GitHub Desktop + Vercel. **Ne jamais prétendre avoir passé un banc
d'essai.**

**Le navigateur est donc l'outil de vérification principal depuis le 424.** `candyluge` est
statique : un serveur de fichiers sur `public/` suffit (⚠️ **avec `Cache-Control: no-store`,
sinon le navigateur garde les `.js` modifiés**), puis `/candyluge/index.html`, ⌘⇧X deux fois.
Ce qui s'y vérifie et nulle part ailleurs : la console (`program not valid` !), `__lugePerf()`,
`Models.ready`, et l'image réelle.

⚠️ **La descente ne peut PAS être parcourue sans pilote** (dette n°1, §6). Pour atteindre
l'arrivée en test : abaisser `CFG.DESCENT_LENGTH` sous `CFG.FINISH_FADE` avant
`Game.start()` — la partie démarre alors déjà franchie et tout l'enchaînement se joue en
quatre secondes.

⚠️ **Un onglet non focalisé est bridé à ~0,3 image/s.** Une mesure prise pendant que la
fenêtre est en arrière-plan ne veut rien dire.

**Mesures du 424** (page seule, sans la ferme derrière, Mac de Guillaume) :
**~105 img/s**, palier 2 (ombres + bloom), pixelRatio 2. ⚠️ **C'est la première mesure de
framerate jamais faite.** À refaire avec la ferme derrière, où le budget est partagé.

Autres bancs, exécutables uniquement là où `node` existe : `verify-luge.mjs` (**34
contrôles**, 34/34 au 423 — **non rejoué depuis**), `preview-luge.js` (11 planches, ⚠️ **ne
rend AUCUNE particule réelle**), `verify-vallee.mjs` (74) · `verify-boot.mjs` (38) ·
`preview.mjs` (crystal). `npx next build` : avertissement `'G_SOIL' is not exported`
**PRÉEXISTANT**.

⚠️ **Un stub qui « retombe sur une valeur raisonnable » ment mieux qu'un stub qui plante.**
Le 424 en donne le cas extrême : `preview-luge` rendait six systèmes de particules que le
jeu ne dessinait pas du tout. **Quand un outil et le jeu divergent, croire le jeu.**

⚠️ **`verify-perf.mjs` et `preview-fps.mjs` n'existent pas.** `labyrinth/js/world.js:339`
s'appuie dessus pour justifier son heuristique.

**Session manuelle à 2 joueurs — seule vraie validation du multijoueur.**

---

## 10. Modes 3D autonomes

`templerun` et `labyrinth` chargent encore **r128 depuis cdnjs sans `integrity`**.
`candyluge` est passé au **local** au 422. `candyland` est du canvas 2D pur. `crystal`
n'utilise pas THREE.

⚠️ **LE CONTEXTE DU 421 SE TROMPAIT** : une migration vers un three.js moderne n'était PAS
un préalable aux modèles glTF ni au post-traitement. **r128 expédie elle-même**
`GLTFLoader`, `EffectComposer`, `UnrealBloomPass` et `ShaderPass` ; ils sont seulement
**absents du miroir cdnjs**. Copiés depuis npm `three@0.128.0` : **zéro déplacement de
teinte**, là où r128 → r15x+ aurait déplacé TOUTES les couleurs.

La migration reste souhaitable un jour pour `templerun` (31 matériaux) et `labyrinth` (65).
⚠️ **Le vrai obstacle n'y est pas colorimétrique** : `labyrinth/js/world.js:370-382` recopie
l'atténuation r128 `(1 − d/portée)^decay` pour classer les lumières. Cette formule disparaît
vers r155 et le classement continuera de tourner **sans erreur** en choisissant mal.

---

## 11. Vocabulaire

- **« zip N »** : trace historique des livraisons (jusqu'au 424). Continue de servir de
  référence temporelle dans le README et les commentaires — **nommée d'après la
  fonctionnalité livrée, pas d'après la zone touchée**. Piège vérifié : le 418 « vallée de
  verre » désignait `public/crystal/`, pas la ferme.
- **hôte / invité** : rôles réseau, pas des personnes.
- **AOI** : rayon au-delà duquel on cesse de diffuser une entité.
- **PNJ nommés** : Greg, Soan, Harald, Rosalie, René (ferme). Aubin (crystal, ch. 1).
- **Les références de Guillaume sont des images GÉNÉRÉES** (concept art). Elles font
  autorité sur l'intention, **jamais sur l'interface**.

---

## 12. À compléter par Guillaume

- **La dette n°1 de `candyluge`** (§6) : la luge dérive seule. C'est la reprise immédiate.
- **Le calibrage des six systèmes de particules** (§6) : jamais vus sur un GPU jusqu'au 424.
- **Les huit échelles de modèles non vérifiées** (§6).
- **Le framerate avec la ferme derrière** (§9).
- **Le bonbon empoisonné** (§6) : décision de conception, pas de technique.
- **Gels de PNJ chez l'invité** (359-365) : encore observés, ou clos ? Vérification demandée
  depuis le 419 : session réelle à 2, ferme peuplée, console de l'hôte ouverte —
  l'avertissement « message JETÉ » apparaît-il ?
- **`crystal`** : le chapitre a **deux** segments jouables (`play run` et `play walk`).
  Retirer le second retire le seul endroit où l'on ramasse des éclats.
- **Numérotation** : quel rapport entre `FIX 24x` et `zip 26x/36x` ?

---

## 13. Comment maintenir ce fichier

1. **Remplacer, ne jamais empiler.** Ce fichier décrit le **présent**. Une information
   périmée se supprime, elle ne se date pas.
2. **200 lignes = passe d'élagage obligatoire. Ne pas relever le seuil.** L'élagage se fait
   AVANT d'ajouter.
3. **Avant de proposer une mise à jour**, vérifier : objectif général (§0), contraintes,
   méthodes, pièges, état d'avancement, et la préférence de Guillaume pour les questions.
4. **Critère d'inclusion** : « est-ce vrai à l'échelle du projet, et invérifiable en ouvrant
   un seul fichier ? » Sinon, ça va dans un commentaire de code.
5. **Écrire pour un modèle fort.** Densité maximale, phrases courtes, tableaux.
6. **Dire ce qui n'est PAS fait**, avant le reste.
7. **Corriger ce que ce fichier affirmait à tort** dès que c'est identifié. Le 424 en a
   corrigé trois d'un coup (§6) — c'est la raison d'être de cette règle.
