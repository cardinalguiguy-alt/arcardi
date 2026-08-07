# CLAUDE.md — CONTEXTE ARCARDI

**Lis ce fichier en entier avant toute action. Puis arrête de lire et demande.**
Il remplace l'exploration du dépôt pour tout ce qui est global. Le README est un journal
chronologique inversé : c'est de l'**histoire**, pas de l'orientation.

État à jour du **zip 425**. Chantiers actifs : **Valley Town** (refaite de fond en comble,
§6) et **`candyluge`** (retouches, §7). **`crystal` est EN PAUSE.**

⚠️ **ÉLAGUÉ AU 425 : le fichier était à 418 lignes pour un plafond de 200** (§14.2). Ce qui a
été retiré était de l'HISTOIRE de défauts corrigés ; les leçons sont en §4, le détail dans
les commentaires de code. **Il reste à 381 malgré un chapitre entier en plus (§6) : la dette
n'est PAS soldée, une seconde passe est due au prochain zip.** Candidats : §8 et §9, qui
tiennent chacun en deux fois moins.

---

## 0. L'objectif de Guillaume — ce à quoi tout se mesure

**Une soirée de jeu entre amis, à deux ou trois, qui donne envie d'y revenir.** Arcardi n'est
pas une plateforme : c'est un salon qu'on ouvre un vendredi soir avec un code partagé. Tout
arbitrage se fait contre ce chiffre — **2 joueurs, occasionnellement 3**.

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
**Valley Town** en est la seconde carte, multijoueur, atteinte par le train.
**`candyluge`** est une descente 3D solo en three.js. **`crystal`** est un jeu narratif solo
à rastériseur logiciel — en pause.

---

## 2. Travailler avec Guillaume

- **Avant toute production créative, poser des questions.** C'est la consigne la plus souvent
  oubliée. Pour tout changement important, **LISTER les décisions structurantes et ATTENDRE**.
- **Il aide volontiers si on demande** (il a installé `node` en cours de session au 425).
  **Demander tôt plutôt que de contourner.**
- ⚠️ **NE PAS SAISIR SES IDENTIFIANTS**, même proposés. Ils ne débloquent d'ailleurs rien en
  local : le Supabase local est factice (§10).
- **Ne pas mêler deux changements visuels dans la même livraison** (décision du 424) : il ne
  peut plus juger lequel a produit quoi.
- **Commentaires systématiques** partout où il y a un *pourquoi*, une hypothèse écartée, un
  piège — avec le numéro de zip. C'est la mémoire longue du projet.
- **« caveman on »** inverse le contrat : exécuter, vite et bien, sans questions ni
  préambule. « caveman off » rétablit. Accuser réception en une ligne.
- **Fin de session** : mettre ce fichier à jour sur demande. **Les commits et push restent à
  Guillaume** (GitHub Desktop). **Dire explicitement si une manipulation Supabase est
  nécessaire — et le dire aussi quand elle ne l'est pas.**
- **Règle dure : aucune migration SQL ni changement de schéma sans validation préalable.**

| Quoi | Où |
|---|---|
| Récit d'une étape | **en tête du README** |
| Le *pourquoi* d'une ligne, un piège local | **commentaire de code**, avec le n° de zip |
| Objectif, contraintes, pièges globaux, avancement | **ce fichier** |

Jamais de fichier de doc autonome à la racine (`AUDIT-X.md`, `NOTES.md`…).

---

## 3. Contraintes réseau — avant de toucher au moindre `send()`

- **L'hôte est l'autorité, toujours.** L'invité émet un `req`, l'hôte arbitre, rediffuse un
  `apply`.
- **Plafond dur de 10 messages/s par client** (`eventsPerSecond`). Dépassement
  **silencieux** ; depuis le 419 un `console.warn` le signale.
- **Facturation** : 1 broadcast = 1 message + 1 par client abonné. **Seul le nombre de
  `send()` compte, jamais la taille des payloads.**
- **La ferme est le seul canal en `self:false`** ; écho local à la main (`broadcastChat`).
- **Ne jamais comparer une horloge hôte à une horloge invité.** Dater à la réception.
- **Quota : 2 M messages/mois, plan gratuit**, déjà dépassé une fois — d'où
  `lib/realtimeQuota.js`.
- ⚠️ **CE QUI PEUT SE DÉDUIRE NE SE DIFFUSE PAS.** L'altitude d'un joueur en ville se lit
  sous ses pieds, elle ne voyage pas (§6). Un champ de plus, c'est surtout un champ à
  réconcilier.

---

## 4. Pièges invisibles — les casser ne produit aucune erreur

**Ferme / Valley Town**
- **L'instance cachée.** Hôte hors ferme : `FermeGame` reste montée dans un `display:none`
  (`fermeAway`), simule et diffuse toujours. `document.hidden` = `false`.
- **La boucle de nuages tourne à vide volontairement** (`SKY_CLOUD_COUNT: 0`) : ses tirages
  appartiennent au flux aléatoire partagé. Règle du 381.
- **`anyRemoteNear` renvoie toujours `false` pour le monde maléfique** (filtre
  `zone === "farm"`, lit `p.x/p.y`, or les spectateurs vivent en `p.ex/p.ey`).
- **`netCanBroadcast()` vs `netHasAudience()`** : le premier teste `hiddenRef`, le second
  non. Ne pas les fusionner. **`broadcastSnapshot()` reste en envoi direct.**
- ⚠️ **UN OUVREUR DE MINI-JEU APPELÉ À MI-FONDU NE DOIT PAS TESTER `zoneTransRef.active`.**
- ⚠️⚠️ **DEUX CARTES SANS REPÈRE COMMUN FINISSENT PAR SE MÉLANGER, et ça ne se voit que
  quand la plus petite ne tient plus dans la grande.** Un repli dessinait les résidents à
  leur parcelle *Valley Town* sur la carte de *ferme* — invisible à 64×48, éclatant à
  192×144. Corrigé au 425. **Agrandir une carte, c'est révéler ces confusions-là.**
- ⚠️⚠️ **UNE COUCHE QUI DÉCIDE D'UNE COLLISION DOIT SORTIR DU GÉNÉRATEUR.** Au 425 la couche
  de haies remplissait `solid` sans être rendue : **six cents murs invisibles**, zéro erreur.
  Contrôle à garder : *toute case bloquante doit être dessinée par quelqu'un*.
- ⚠️ **ON PERCE LE PASSAGE AVANT DE POSER LA CLÔTURE**, jamais l'inverse (le verger s'était
  refermé sur 309 cases). « Clôturer sauf devant la porte » se casse au premier décalage.
- ⚠️ **UN MONDE DOIT SORTIR COMPLET DE SON CONSTRUCTEUR.** `generateWorld` ne créait ni
  `sucreries` ni `orchards` — seul le chemin « ferme rechargée » les ajoutait. **Créer une
  ferme sur un code neuf plantait**, pour tout le monde sauf nous. Corrigé au 425.
- ⚠️ **`stopPropagation` N'ARRÊTE PAS LES AUTRES ÉCOUTEURS DE LA MÊME CIBLE** (il faut
  `stopImmediatePropagation`). Deux écouteurs `window` en capture se voient tous les deux —
  d'où le test `e.defaultPrevented` dans `candyluge/js/dev.js`.

**JavaScript / three.js**
- ⚠️⚠️ **`chaîne.replace("X", …)` NE REMPLACE QUE LA PREMIÈRE OCCURRENCE.**
- ⚠️⚠️ **UN `useProgram` QUI ÉCHOUE NE DÉLIE PAS LE PROGRAMME PRÉCÉDENT** : un shader qui ne
  compile pas fait dessiner l'objet SUIVANT avec les mauvais attributs. **Seul indice :
  `INVALID_OPERATION: program not valid` dans la console.**
- ⚠️⚠️ **UN `const` DE HAUT NIVEAU N'EST PAS UNE PROPRIÉTÉ DE `window`.** Tester avec
  `typeof X !== "undefined"`.
- ⚠️ **UN EFFET À BOUFFÉES NE S'ÉTEINT PAS EN METTANT SON TAUX À ZÉRO** (425 : la bouffée de
  turbo a survécu à trois extinctions et on l'a crue innocente).
- **`Pix.rng(graine)` rend un générateur INDÉPENDANT** (`pix.js:40`).
- **`crystal` n'affiche AUCUNE image** : tampon 480×270 toujours opaque.
- **La caméra de `walk` est 2,6 unités DERRIÈRE le personnage.**
- **Rendre un objet invisible ne le retire pas du monde.**

---

## 5. Carte du territoire

| Fichier | Rôle |
|---|---|
| `components/ferme/FermeGame.js` | tout le jeu ferme + Valley Town — **~18 000 lignes** |
| `components/ferme/fermeEngine.js` | règles pures · **`generateTownWorld()` = toute la ville** |
| `components/ferme/fermeConstants.js` | réglages · **tous les `TOWN_*`** |
| `components/ferme/fermeArt.js` | **tous** les sprites, en canevas procédural. Aucun PNG |
| `app/room/[code]/page.js` · `lib/gameSync.js` · `lib/realtimeQuota.js` | salon · synchro · quota |
| `public/candyluge/js/config.js` | **tous** les nombres de la descente. Rien ailleurs |
| `public/candyluge/js/slope.js` | piste. `finishSAt()`/`cpEvery()` = les définitions |
| `public/candyluge/js/sled.js` · `critters.js` | physique · gourmands |
| `public/candyluge/js/world.js` | scène three.js (~4 100 l.) |
| `public/candyluge/js/dev.js` | menu développeur de la descente (425) |
| `public/vendor/three-r128/` | three.js r128 + GLTFLoader + EffectComposer, en local |

⚠️ **`scenes.js` contient 2 tableaux, `shots.js` en contient 7**, sur un `backdrop()` COMMUN.
**Lecture de `FermeGame.js` : étroit mais profond.** `grep` sur le symptôme, lire largement
autour, chercher les autres usages du symbole avant d'éditer.

---

## 6. Valley Town — refaite au 425

**Carte 192×144 (× 9 en surface).** Regénérée à graine fixe, **jamais persistée** — c'est ce
qui a permis la refonte d'un bloc, sans migration.

**Ce qui existe.** Quatre avenues est-ouest (`TOWN_ST_ROWS`) et trois nord-sud
(`TOWN_ST_COLS`) · une place de 30×26 (fontaine au nord, obélisque au sud, quatre parterres,
bancs/lampadaires/topiaires) · **20 parcelles**, chacune en jardin clos de haie · un parc
avec étang · un verger en rangs · un champ de foire dallé (vide, à remplir) · **la
Haute-Ville**, terrasse à une unité d'altitude, et un **belvédère** à deux.

**Les trois monuments, tous en canevas procédural (`fermeArt.js`).**
- **`TOWN_CHURCH`** = l'ancien townhall du 235, **dessin inchangé**, simplement renommé
  église (demande de Guillaume ; le zip 279 l'appelait déjà « l'espèce d'église blanche »).
- **`TOWN_HALL`** = un hôtel de ville NEUF : brique rouge, beffroi à horloge décalé,
  volontairement **asymétrique**, à l'est de la place.
- **`TOWN_COURT`** = le tribunal néoclassique, gris-pierre, perron pleine largeur, péristyle
  de huit colonnes en retrait, balance au fronton. **Il est en Haute-Ville** : c'est ce qui
  donne une raison d'être aux escaliers.

**Le relief, et pourquoi il ne coûte rien.** ⚠️ **L'ALTITUDE EST UNE PROPRIÉTÉ DE LA CASE,
PAS DU PERSONNAGE** (tableau `elev`, valeurs fractionnaires). Une seule règle de
déplacement — « pas plus de `TOWN_STEP_MAX` d'un pas » — fait tenir les falaises ET marcher
les escaliers, sans aucun cas particulier. Le décalage à l'écran vaut `elev × TOWN_ELEV_PX`,
donc collision et dessin ne peuvent pas diverger. **Espace saute d'un rebord** (jamais vers
le haut) ; l'invite ne s'affiche que quand le saut est réellement possible.

⚠️ **`TOWN_ELEV_PX` a dû passer de 14 à 30** : à 14, la terrasse ressemblait à une bordure de
trottoir et les escaliers à des dalles posées dans l'herbe. Réglage purement optique.

**Ce qui reste à faire, et c'est assumé** : le champ de foire est vide · aucun PNJ n'habite
la ville · pas d'intérieurs · de grands îlots restent en pelouse. Guillaume a posé
l'objectif comme **un chantier de plusieurs sessions** — la parité avec la ferme en points
d'intérêt n'est pas pour ce zip.

**Contrôles à rejouer après toute retouche de la carte** (§10) : ville 100 % atteignable
depuis la gare · 20 portes de maison accessibles · aucun bâtiment sur une rue, un escalier
ou à cheval sur deux altitudes · **aucun mur invisible** · des rebords sautables existent.

---

## 7. `candyluge` — état après le 425

Physique, piste et gourmands **inchangés depuis le 417**. Les 18 « choses à ne pas défaire »
sont dans `public/candyluge/README.md` et font autorité.

**Fait au 425.** **10 fanions** — `CP_COUNT` est le réglage, l'espacement en découle
(`Slope.cpEvery()`) · le HUD en bas à gauche compte les **fanions**, plus les paliers de
difficulté · la **traînée est rose bonbon** : elle était faite de **quatre** objets réglés
séparément (sillon, gerbe, poudre, bouffée de turbo), tous dérivés de `COL_SKID` par
`FX_TRAIL_TINT` · un **menu développeur** (⌘⇧X une fois le mur franchi) qui téléporte sur
n'importe quel fanion et sur la ligne d'arrivée.

⚠️ **IL RESTE UN CŒUR BLANC À LA TRAÎNÉE**, et ce n'est pas une question de teinte : il vient
de la DENSITÉ des grains et du bloom. C'est la passe de calibrage annoncée au 424, toujours
à faire — délibérément non mêlée au changement de couleur.

**⚠️ NON FAIT — les dettes.**
1. ⚠️⚠️ **LA LUGE DÉRIVE SEULE.** `this.lat += trackPull * dt` s'ajoute
   **inconditionnellement** : sans pilote, la luge percute la barrière en quelques secondes.
   **Correctif** : ne laisser passer que la fraction non adhérente,
   `trackPull * (base + (1 − base) * skid)`, `base ≈ 0,25`.
2. **Direction plus facile.** Leviers : `EDGE_RATE`, `EDGE_CROSS_MUL`, `LAT_GRIP`, `CARVE_K`.
3. **Boosts avec chevrons animés au sol.** Rien d'écrit.
4. **`clearAll()` ne retire pas les tronçons de la scène** : chaque ruban de piste est
   **dessiné en double** pendant toute la partie.
5. **Les huit échelles de modèles glTF ne sont pas vérifiées** une par une.
6. **Les bras du pilote ne s'animent plus** (`sledParts.arms` reste VIDE ; le nœud DOIT
   rester, `updateSled` écrit dedans). Étincelles trop grosses de près (`stars.gain = 2.2`).

**Piste proposée, non implémentée : un bonbon empoisonné noir, vision en négatif.**
Techniquement presque gratuit (`GradeShader` + un uniforme). **Le vrai travail est de
conception** : un malus qui gêne la LISIBILITÉ à 125 km/h, dans un monde décidé **paisible**
au 235.

⚠️ **LE JEU RESTE DERRIÈRE LE MUR DE CHANTIER** (⌘⇧X deux fois en moins de 3,5 s).

---

## 8. Qualité d'image — la méthode

**Réduire la référence à 480×270, mesurer, comparer, corriger, re-mesurer. On ne juge pas au
ressenti.** ⚠️ **ET LA STATISTIQUE QUI COMPTE N'EST PAS LA MOYENNE** : au 421 la luminosité
moyenne était juste et l'image fausse — **pas un pixel sous L60**, donc aucune ombre. On ne
corrige pas ça en baissant l'exposition : il faut un **écart**, pas un décalage.
(Référence : L 180,6 / écart-type **47,7** / saturation 27,8 % / 2,1 % sous L60.)

⚠️⚠️ **LA LEÇON LA PLUS COÛTEUSE, ET ELLE EST GÉNÉRALE : un paramètre qui DOUBLE un autre
paramètre est une divergence en attente. Il doit être DÉRIVÉ, jamais réglé.**
Exemples en place : `Slope.finishSAt()`, `Slope.cpEvery()`, `Models.fit()`, `trailTint()`.

⚠️ **Deux couleurs réglées à l'œil côte à côte dans un pipeline gamma ne gardent pas leur
écart apparent** une fois le rendu passé en linéaire.

⚠️ **Fausses pistes mesurées, ne pas les refaire :** monter le dégradé du ciel de crystal ·
doubler `BLOOM_H`/`BLOOM_K` (**ne pas y toucher**) · compenser le linéaire en montant les
intensités « au jugé » (soleil à 2,45 → image **entièrement blanche** ; repère : neige au
soleil ≈ **1,15 linéaire**, à l'ombre ≈ **0,40**) · peindre des veines cyan sur la piste rose
(le mélange passe par le **gris** ; la sortie est dans la VALEUR).

**Côté `crystal`, NON PROPAGÉ :** `Flora.canopy` n'est appelée que par `walk.js` ; `corniche`
et `pont` sont **bit à bit identiques** au 419.

---

## 9. Blender — deux pipelines, et un endroit où il ne sert pas

BlenderMCP est installé (Blender 5.2 LTS) et **répond**.

**Pipeline A — vers `crystal` (pixel art).** On modélise, on rend, on **transcrit en table de
données**. **Jamais de PNG dans le jeu.** Trois réglages contre-intuitifs : **ombrage plat
pur** · **aucun anticrénelage** (`taa_render_samples = 1`, `filter_size = 0.01`) ·
**quantification LINÉAIRE**. Courbe `Standard`, lampes **Soleil**.

**Pipeline B — vers les jeux three.js (glTF).** Script `candyluge_props.py`, hors dépôt.
1. **Export sans matériaux**, maillages `part_<clé>` (clé de `mat` dans `world.js`).
2. **Budget serré** : 200 à 900 triangles par accessoire (13 438 au total).
3. ⚠️ **BLENDER EST Z-UP, THREE.JS EST Y-UP, ET L'EXPORTEUR CONVERTIT FIDÈLEMENT UNE
   ORIENTATION FAUSSE** — d'où `yup_authoring()`.
4. ⚠️ **L'EXPORT gltf EXIGE UN CONTEXTE** (`temp_override(…, area=VIEW_3D, region)`) et de
   **désélectionner** — sinon échec au **deuxième** accessoire seulement.
5. ⚠️ **L'ÉCHELLE SE DÉRIVE DU GABARIT** (`Models.fit`), jamais devinée dans l'appelant.

⚠️⚠️ **ET IL NE SERT PAS À LA FERME.** Tous les sprites de la ferme et de Valley Town sont
des **canevas procéduraux** dans `fermeArt.js`. Y introduire un PNG créerait un troisième
pipeline (chargement, cache, palette hors-fichier) pour un seul bâtiment. Canopées, brumes et
masses d'arbres sont **du code**, partout. ⚠️ **Juger un prop nu sur fond plat n'a aucun
sens.**

---

## 10. Vérification — CE CHAPITRE A CHANGÉ AU 425

⚠️⚠️ **`node` EST INSTALLÉ (v24, npm 11).** `npm install` a été fait, `.gitignore` a été
ajouté au 425 (le dépôt n'en avait aucun). **On peut donc BÂTIR ET JOUER en local.**

**`npx next build`** compile tout : c'est le contrôle le moins cher et il attrape les fautes
de syntaxe sur les 18 000 lignes. ⚠️ L'avertissement `'G_SOIL' is not exported` est
**PRÉEXISTANT**. ⚠️ **SANS `.env.local`, LE BUILD S'ARRÊTE APRÈS LA COMPILATION** sur
`Error: supabaseUrl is required` en pré-rendant `/login` et `/signup` — ce n'est PAS une
régression, c'est le prérendu qui réclame les variables (fournies par Vercel en production).
**Ce qui compte est la ligne `✓ Compiled successfully` juste avant.**

**Jouer à la ferme en local** — deux échafaudages TEMPORAIRES, à supprimer après :
1. un `.env.local` pointant sur un **faux Supabase** (un petit serveur HTTP qui répond `[]`
   sur `/rest/v1/ferme_saves` suffit ; sans lui on reste bloqué à l'écran « code de ferme ») ;
2. une page jetable `app/<nom>/page.js` qui monte `<FermeGame room={…} me={…} isHost />` —
   elle contourne l'authentification. ⚠️ **Un dossier `app/` préfixé par `_` n'est PAS une
   route** (App Router). ⚠️ **La supprimer avant de livrer** : en production elle ouvrirait
   une ferme sans authentification.

Puis ⌘⇧X → menu développeur → **Valley Town (gare / la place / le tribunal / le belvédère)**.
Les trois derniers arrêts ont été ajoutés au 425 : la ville est trop grande pour être
traversée à pied à chaque rechargement.

**`candyluge`** est statique : un serveur de fichiers sur `public/` suffit — ⚠️ **avec
`Cache-Control: no-store`**, sinon le navigateur garde les `.js` modifiés. Console
(`program not valid` !), `__lugePerf()`, `Models.ready`.
⚠️ **La descente ne peut PAS être parcourue sans pilote** (dette n°1) : passer par le menu
développeur, ou abaisser `CFG.DESCENT_LENGTH` sous `CFG.FINISH_FADE`.

**Bancs `.mjs`** : `verify-luge.mjs` (**34 contrôles, 34/34 au 425**) · `verify-vallee.mjs`
(74) · `verify-boot.mjs` (38) · `preview-luge.js` (⚠️ **ne rend AUCUNE particule réelle**) ·
`preview.mjs` (crystal). ⚠️ **`verify-perf.mjs` et `preview-fps.mjs` n'existent pas**, malgré
ce que prétend `labyrinth/js/world.js:339`.

⚠️ **Un stub qui « retombe sur une valeur raisonnable » ment mieux qu'un stub qui plante.**
**Quand un outil et le jeu divergent, croire le jeu.**
⚠️ **Un onglet non focalisé est bridé à ~0,3 image/s** : une mesure prise en arrière-plan ne
veut rien dire. (425, page seule : **~105 img/s**, palier 2, pixelRatio 2.)

**Session manuelle à 2 joueurs — seule vraie validation du multijoueur.**

---

## 11. Modes 3D autonomes

`templerun` et `labyrinth` chargent encore **r128 depuis cdnjs sans `integrity`**.
`candyluge` est passé au **local** au 422. `candyland` est du canvas 2D pur.

⚠️ **UNE MIGRATION VERS UN THREE.JS MODERNE N'EST PAS UN PRÉALABLE** aux modèles glTF ni au
post-traitement (le contexte du 421 se trompait) : **r128 expédie elle-même** `GLTFLoader`,
`EffectComposer`, `UnrealBloomPass` et `ShaderPass` — ils sont seulement absents du miroir
cdnjs. Copiés depuis npm `three@0.128.0` : **zéro déplacement de teinte**.
⚠️ **Le vrai obstacle à une migration n'est pas colorimétrique** :
`labyrinth/js/world.js:370-382` recopie l'atténuation r128 `(1 − d/portée)^decay` pour
classer les lumières. Cette formule disparaît vers r155 et le classement continuera de
tourner **sans erreur** en choisissant mal.

---

## 12. Vocabulaire

- **« zip N »** : trace historique des livraisons (jusqu'au 425), **nommée d'après la
  fonctionnalité livrée, pas d'après la zone touchée**. Piège vérifié : le 418 « vallée de
  verre » désignait `public/crystal/`, pas la ferme.
- **hôte / invité** : rôles réseau, pas des personnes.
- **AOI** : rayon au-delà duquel on cesse de diffuser une entité.
- **PNJ nommés** : Greg, Soan, Harald, Rosalie, René (ferme). Aubin (crystal, ch. 1).
- **Les références de Guillaume sont des images GÉNÉRÉES** (concept art). Elles font autorité
  sur l'intention, **jamais sur l'interface**.

---

## 13. À compléter par Guillaume

- **Valley Town** (§6) : que met-on dans le champ de foire, et quels PNJ y habitent ?
- **La dette n°1 de `candyluge`** (§7) : la luge dérive seule.
- **Le calibrage des particules** (§7) : le cœur de la traînée sature encore.
- **Le bonbon empoisonné** (§7) : décision de conception, pas de technique.
- **Gels de PNJ chez l'invité** (359-365) : encore observés ? Vérification demandée depuis le
  419 — session réelle à 2, ferme peuplée, console de l'hôte ouverte.
- **`crystal`** : le chapitre a **deux** segments jouables (`play run` et `play walk`).
  Retirer le second retire le seul endroit où l'on ramasse des éclats.

---

## 14. Comment maintenir ce fichier

1. **Remplacer, ne jamais empiler.** Ce fichier décrit le **présent**. Une information périmée
   se supprime, elle ne se date pas.
2. **200 lignes = passe d'élagage obligatoire. Ne pas relever le seuil.** L'élagage se fait
   AVANT d'ajouter. ⚠️ On a laissé filer jusqu'à 418 avant de s'en apercevoir au 425, et le
   fichier est encore à 381 : **la dette est réelle, elle se solde au prochain zip**.
3. **Critère d'inclusion** : « est-ce vrai à l'échelle du projet, et invérifiable en ouvrant
   un seul fichier ? » Sinon, ça va dans un commentaire de code. **L'histoire d'un défaut
   corrigé n'y a pas sa place — seule sa LEÇON, en §4.**
4. **Écrire pour un modèle fort.** Densité maximale, phrases courtes, tableaux.
5. **Dire ce qui n'est PAS fait**, avant le reste.
6. **Corriger ce que ce fichier affirmait à tort** dès que c'est identifié. Le 425 a périmé
   tout le §10 d'un coup (`node` existe) — c'est la raison d'être de cette règle.
