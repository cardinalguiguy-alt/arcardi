# CLAUDE.md — CONTEXTE ARCARDI

**Lis ce fichier en entier avant toute action. Puis arrête de lire et demande.**
Il remplace l'exploration du dépôt pour tout ce qui est global. Le README du projet est un
journal chronologique inversé : c'est de l'**histoire**, pas de l'orientation.

État à jour du **zip 423, livré PARTIEL**. Chantier actif : **`candyluge`**.
**`crystal` est EN PAUSE** (Guillaume n'était pas satisfait du rendu ; le travail du 421 y
reste valide). La ferme n'a pas bougé depuis le 419, à une ligne près (§4).

⚠️ **LE 423 EST INACHEVÉ.** Trois demandes sur six sont faites. Les trois autres sont au
§6 **avec leur cause déjà diagnostiquée** — ne pas les rechercher, elles sont trouvées.

---

## 0. L'objectif de Guillaume — ce à quoi tout se mesure

**Une soirée de jeu entre amis, à deux ou trois, qui donne envie d'y revenir.** Arcardi
n'est pas une plateforme : c'est un salon qu'on ouvre un vendredi soir avec un code
partagé. Tout arbitrage se fait contre ce chiffre — **2 joueurs, occasionnellement 3** —
jamais contre un hypothétique passage à l'échelle.

Trois conséquences qui reviennent dans chaque décision :

1. **La qualité passe avant le nombre.** Vingt-deux jeux existent ; ce qui compte est
   qu'un jeu donné soit *fini*. Depuis le 421, l'exigence est explicitement **AAA** —
   traduite en méthode, pas en intention (§7).
2. **Le monde partagé est le cœur.** La ferme est un lieu persistant qu'on habite ; les
   mini-jeux sont des portes qui s'y ouvrent, jamais des applications séparées.
3. **Rien ne doit casser pour les autres.** Le multijoueur est fragile et gratuit (§3) :
   une seconde d'inattention réseau se paie sur la partie de quelqu'un d'autre.

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
  Guillaume le demande explicitement, et c'est la consigne la plus souvent oubliée.
- **Pour tout changement important, LISTER les décisions structurantes et ATTENDRE
  validation** avant de coder.
- **Commentaires systématiques** partout où il y a un *pourquoi*, une hypothèse écartée,
  un piège. Avec le numéro de zip d'origine. C'est la mémoire longue du projet.

**Mode caveman** — « caveman on » inverse le contrat : exécuter, vite et bien, sans
questions ni préambule. On n'interrompt qu'en **nécessité extrême**. « caveman off »
rétablit. Le mode persiste jusqu'au switch inverse. Accuser réception en une ligne.

**Rituel de fin de session / grosse étape (remplace le rituel "zip" de Cowork)**
1. Sur demande de Guillaume ("mets à jour CLAUDE.md"), **mettre à jour ce fichier
   directement** — état d'avancement, ce qui reste à faire, corrections des affirmations
   périmées. Ce fichier est versionné avec Git : il n'y a plus de zip de contexte séparé.
2. Les commits et push restent décidés par Guillaume (GitHub Desktop), sauf s'il demande
   explicitement de committer. Ne jamais push sans validation.
3. **Dire explicitement si une manipulation Supabase est nécessaire**, et laquelle. Si
   non : le dire aussi. Ne jamais laisser la question en suspens.

**Où va quoi — ne jamais créer de structure parallèle**

| Quoi | Où |
|---|---|
| Récit d'une étape/session | **en tête du README** |
| Le *pourquoi* d'une ligne, un piège local | **commentaire de code**, avec le n° de zip d'origine |
| Objectif, contraintes, pièges globaux, avancement | **ce fichier (CLAUDE.md)** |

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

- **L'instance cachée.** Hôte hors ferme : `FermeGame` reste montée dans un `display:none`
  (`fermeAway`), simule et diffuse toujours. `document.hidden` = `false`.
- **La boucle de nuages tourne à vide volontairement** (`SKY_CLOUD_COUNT: 0`) : ses tirages
  appartiennent au flux aléatoire partagé. Règle du 381.
- **`anyRemoteNear` renvoie toujours `false` pour le monde maléfique** (filtre
  `zone === "farm"`, lit `p.x/p.y`, or les spectateurs vivent en `p.ex/p.ey`).
- **`netCanBroadcast()` vs `netHasAudience()`** : le premier teste `hiddenRef`, le second
  non. Ne pas les fusionner. **`broadcastSnapshot()` reste en envoi direct.**
- ⚠️ **UN OUVREUR DE MINI-JEU APPELÉ À MI-FONDU NE DOIT PAS TESTER
  `zoneTransRef.active`.** Corrigé au 422 : le Gourmandin était injoignable depuis le lac
  parce que `openCandyGame()` refusait d'ouvrir pendant une transition — et son seul
  appelant EST la transition. **Seule destination du fondu qui ne change pas de zone.**
- **`crystal` n'affiche AUCUNE image.** Tampon 480×270 écrit pixel par pixel, **toujours
  opaque**. Un PNG ne peut pas y être composé tel quel.
- **`Pix.rng(graine)` rend un générateur INDÉPENDANT** (`pix.js:40`). La règle du 381 ne
  vaut qu'à l'intérieur d'un même générateur — mais elle y vaut.
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
| `public/candyluge/js/slope.js` · `sled.js` · `critters.js` | piste · physique · gourmands + **garantie de passage** |
| `public/candyluge/js/world.js` | scène : matériaux, lumière, ombres, décor, particules, post-traitement (~3 100 l.) |
| `public/candyluge/js/models.js` · `models/*.glb` | chargement glTF · dix accessoires, 300 Ko, **sans matériaux** |
| `public/vendor/three-r128/` | three.js r128 + GLTFLoader + EffectComposer, en local |
| `public/crystal/js/…` | le jeu narratif (en pause) |

⚠️ **`scenes.js` contient 2 tableaux, `shots.js` en contient 7**, tous sur un `backdrop()`
COMMUN. « Toucher les 9 scènes » = **2 fichiers**.

**Lecture de `FermeGame.js` : étroit mais profond.** `grep` sur le symptôme, lire largement
autour, chercher les autres usages du symbole avant d'éditer.

---

## 6. `candyluge` — état après le 423, et les trois dettes

Physique, piste, gourmands et checkpoints **inchangés depuis le 417**. Les 18 « choses à ne
pas défaire » sont dans `public/candyluge/README.md` et font autorité.

**Fait au 422 (rendu).** Rendu **linéaire + ACES + sRGB** ; matériaux PBR ; environnement
PMREM tiré de la texture de ciel ; **vraies shadow maps** dont le volume suit la luge ;
`EffectComposer` (bloom à seuil haut, étalonnage, contraste, vignette, grain) ; dix
accessoires modelés sous Blender ; particules à **taille par grain** ; soleil et halo dans
la scène ; poussières de premier plan ; luge et pilote remodelés.

**Fait au 423 — trois correctifs, causes trouvées :**

1. **Carrés blancs et noirs en fond de décor** = ⚠️ **LES MIPMAPS SUR LES TEXTURES
   D'EFFET.** Ces textures sont des dégradés qui vont à alpha 0 sur leurs bords ; un mipmap
   est une MOYENNE, donc son niveau élevé n'est pas un petit disque mais **un carré
   uniforme translucide**. Noirs = ombres portées lointaines (`paintShadow` est très
   sombre) ; blancs = voiles additifs. Helper `texFx()` : pas de mipmaps, `ClampToEdge`.
   **Les textures RÉPÉTÉES (neige, piste, sucre d'orge) gardent les leurs.**
2. **Reflets trop intenses, « on ne voit plus la piste ».** ⚠️ Cause principale **dans
   l'outil, pas dans le jeu** : r128 alimente avec `scene.environment` le reflet ET une
   ambiante diffuse, ×`envMapIntensity` ; la planche modélisait ce diffus comme une
   constante indépendante → ~0,3 de lumière en trop par surface dans le jeu. Cause
   secondaire : `roughnessMap` **multiplie** la rugosité par le canal VERT — 0,59 sur du
   rose, la piste tournait à 0,31 au lieu de 0,52. `ENV_INTENSITY` 0,55 → 0,22, rugosités
   sol → 0,80/0,86, `roughnessMap` retirée de la piste.
3. **Traînée quasi invisible en virage.** Teintes sillon/piste réglées à l'œil **en gamma**,
   qui se rapprochent en linéaire ; et rugosité 0,34 qui faisait attraper à la trace un
   reflet l'ÉCLAIRCISSANT là où elle doit être un creux. `COL_CARVE` → 0xa83e6f,
   `COL_SKID` → 0xfff0f8, rugosité → 0,70.

**⚠️ NON FAIT — les trois dettes. Causes trouvées, code non écrit.**

1. **Trajectoires irréalistes au repos.** Dans `sled.js`, `this.lat += trackPull * dt`
   s'ajoute **inconditionnellement** après l'amortissement vers `wantLat` : sans aucune
   touche, la luge dérive en permanence de `trackPull / LAT_GRIP` sur le côté.
   **Correctif** : ne laisser passer que la fraction non adhérente,
   `trackPull * (base + (1 − base) * skid)`, `base ≈ 0,25`. Physiquement juste — piste
   relevée + carre, ça suit la ligne.
2. **Direction plus facile.** Leviers : `EDGE_RATE`, `EDGE_CROSS_MUL`, `LAT_GRIP`,
   `CARVE_K`, `GRIP_MAX` en dernier recours. ⚠️ **`verify-luge` tient les deux régimes de
   conduite** : toute modification doit repasser 34/34.
3. **Boosts avec chevrons animés au sol.** Rien d'écrit. Chemin : placement déterministe
   dérivé de `s` (comme les checkpoints) ; consommation dans `sled.js`, qui possède déjà
   `this.boost` et `BOOST_MS`/`BOOST_ACCEL`/`BOOST_SPEED_BONUS` ; rendu par un décalque à
   UV défilantes dans `buildNode` (matériau partagé, tous les chevrons défilent ensemble —
   suffisant et gratuit).

**Autres restes connus.** Étincelles de dérapage trop grosses et lumineuses de près
(`stars.gain = 2.2`, taille ×3) · `archOver` et `checkpointGate` encore en primitives,
et l'arche occupe beaucoup de cadre · **les bras du pilote ne s'animent plus**
(`sledParts.arms` existe et reste VIDE ; le nœud DOIT rester, `updateSled` écrit dedans) ·
**le framerate n'a jamais été mesuré** (§9).

**Piste proposée par Guillaume, non implémentée : un bonbon empoisonné noir déclenchant une
vision en négatif.** ⚠️ Techniquement presque gratuit, et il faut le savoir avant d'en
discuter : la passe d'étalonnage (`GradeShader`) est déjà un shader plein écran, il suffit
d'un uniforme `uInvert` et d'un `mix(col, 1.0 - col, uInvert)` avant l'encodage sRGB. **Le
vrai travail est de conception** : un malus qui gêne la LISIBILITÉ dans un jeu où l'on doit
lire la piste à 125 km/h, et comment le joueur comprend qu'il l'a ramassé plutôt que de
croire à un bogue. Le Pays des Bonbons est par ailleurs un monde **paisible** (décision du
235) : un bonbon « empoisonné » y est une exception à assumer.

⚠️ **LE JEU RESTE DERRIÈRE LE MUR DE CHANTIER** (⌘⇧X deux fois en moins de 3,5 s). Pour
l'ouvrir : remplacer `UI.show(Gate.unlocked() ? "title" : "construction")` par
`UI.show("title")` aux deux endroits de `init()` dans `game.js`.

---

## 7. Qualité d'image — la méthode

**Réduire la référence à 480×270, mesurer, comparer au rendu de l'outil de preview,
corriger, re-mesurer. On ne juge pas au ressenti.**

⚠️ **ET LA STATISTIQUE QUI COMPTE N'EST PAS LA MOYENNE.**

| | référence | 421 | 422 | 423 |
|---|---|---|---|---|
| L global | 180,6 | 177,9 | 174,4 | 169,4 |
| **écart-type** | **47,7** | **28,4** | 36,5 | **42,0** |
| saturation | 27,8 % | 22,1 % | 26,3 % | 29,0 % |
| pixels < L60 | 2,1 % | **0,0 %** | 0,3 % | 0,7 % |

Au 421 la luminosité MOYENNE était juste et l'image était fausse : pas un pixel sous L60,
donc aucune ombre. ⚠️ **On ne corrige pas ça en baissant l'exposition** — même image en
plus sombre, écart-type inchangé. Il faut un **écart**, pas un décalage.

⚠️⚠️ **LA LEÇON LA PLUS COÛTEUSE, ET ELLE EST GÉNÉRALE : un paramètre de l'outil qui DOUBLE
un paramètre du jeu est une divergence en attente. Il doit être DÉRIVÉ, jamais réglé.**
C'est ainsi qu'un rendu « trop réfléchissant » a été livré avec des planches qui semblaient
justes.

⚠️ **Corollaire de palette :** deux couleurs réglées à l'œil côte à côte dans un pipeline
gamma **ne gardent pas leur écart apparent** une fois le rendu passé en linéaire. Ce n'est
pas une dérive, c'est un changement d'unité — visible seulement sur les paires dont l'écart
EST l'information : le sillon, la bavure, le liseré de piste.

⚠️ **Fausses pistes mesurées et écartées — ne pas les refaire :** monter le dégradé du ciel
de crystal (+5,7 sur un écart de 56) · doubler le halo d'aurore `BLOOM_H`/`BLOOM_K` (+0,1,
**ne pas y toucher**) · densifier des traits clairs sur ciel noir (on lit de la pluie
verticale) · compenser le linéaire en montant les intensités « au jugé » (soleil à 2,45 →
image **entièrement blanche** ; repère : neige au soleil ≈ **1,15 linéaire**, à l'ombre
≈ **0,40**) · peindre des veines cyan sur la piste rose (rose et cyan presque
complémentaires, leur mélange passe par le **gris** ; la sortie est dans la VALEUR, un bleu
presque blanc, pas dans l'opacité).

**Côté `crystal`, NON PROPAGÉ :** `Flora.canopy` n'est appelée que par `walk.js`.
`corniche` et `pont` sont **bit à bit identiques** au 419. À la propagation : exclure
probablement `seuil` (« presque noir », délibéré) et `memoire`.

---

## 8. Blender — deux pipelines, à ne pas confondre

BlenderMCP est installé (Blender 5.2 LTS) et **répond**.

**Pipeline A — vers `crystal` (pixel art).** On modélise, on rend, on **transcrit en table
de données**. **Jamais de PNG dans le jeu.** Trois réglages contre-intuitifs : **ombrage
plat pur** (Roughness 1, Specular 0, pas d'ombre, GTAO coupé) · **aucun anticrénelage**
(`taa_render_samples = 1`, `filter_size = 0.01`) · **quantification LINÉAIRE**. Courbe
`Standard`, lampes **Soleil**, lames larges et aplaties, biseau 1-2 segments.

**Pipeline B — vers les jeux three.js (glTF), ouvert au 422.** Script
`candyluge_props.py`, conservé hors dépôt. Quatre règles :
1. **Export sans matériaux.** Maillages nommés `part_<clé>` (clé de `mat` dans
   `world.js`) ; `models.js` rebranche. La palette reste dans `config.js`.
2. **Budget serré** : 200 à 900 triangles par accessoire. Le gain vient des **biseaux** et
   du **lissage**, pas de la densité.
3. ⚠️ **BLENDER EST Z-UP, THREE.JS EST Y-UP, ET L'EXPORTEUR CONVERTIT FIDÈLEMENT UNE
   ORIENTATION FAUSSE.** La luge, écrite dans les coordonnées du jeu, sortait **debout sur
   le nez** sans aucun avertissement — d'où `yup_authoring()`. Corollaire : en Y-up, l'axe
   d'un `create_cone` tombe sur la **profondeur**, pas la verticale ; un π/2 « pour
   allonger un membre » le met **debout**.
4. ⚠️ **L'EXPORT gltf EXIGE UN CONTEXTE** : `bpy.context.temp_override(window, screen,
   area=VIEW_3D, region)`, et **désélectionner avec `bpy.ops.object.select_all`** — après
   une suppression, l'itérateur de la view layer rend des `None`, ce qui échoue au
   **deuxième** accessoire seulement.

⚠️ **ET BLENDER NE SERT PAS À TOUT.** Canopées, brumes et masses d'arbres sont **du code
procédural**. Il paie sur les **volumes à facettes** et les **accessoires nommables**. La
beauté vient d'abord de la composition, de la lumière et de la brume — du code.
⚠️ **Juger un prop nu sur fond plat n'a aucun sens.** Tester dans l'outil de preview.

---

## 9. Vérification

**Pas de tests unitaires, mais des bancs d'essai, et ils trouvent.** Ne jamais annoncer une
fiabilité qu'on n'a pas.

- `node public/candyluge/tools/verify-luge.mjs` — **34 contrôles**. **34/34 au 423.**
- `node public/candyluge/tools/preview-luge.js` — **11 planches PNG**. Tampon flottant,
  carte d'ombre logicielle, ACES, bloom, étalonnage, lecteur `.glb` synchrone.
- `__lugePerf()` — **dans la console de l'IFRAME**, la ferme tournant derrière.
- `verify-vallee.mjs` (**74**) · `verify-boot.mjs` (**38**) · `preview.mjs` (crystal).
- `npx next build` — avertissement `'G_SOIL' is not exported` : **PRÉEXISTANT**. ⚠️ Il ne
  tourne pas sur un zip nu : ne pas prétendre l'avoir passé.
- Session manuelle à 2 joueurs — seule vraie validation du multijoueur.

⚠️⚠️ **LE FRAMERATE N'A JAMAIS ÉTÉ MESURÉ.** Les 422 et 423 ont été écrits sans navigateur,
et un rastériseur logiciel ne dit RIEN d'un GPU. Un palier de qualité automatique existe
précisément parce que la mesure manque. **Première chose à faire à la reprise.**

⚠️ **Un stub qui « retombe sur une valeur raisonnable » ment mieux qu'un stub qui plante.**
Le faux three.js de `preview-luge` n'acceptait qu'un **nombre** comme couleur ; depuis le
linéaire c'est un **objet**, et chaque matériau retombait sur du blanc. L'image restait
plausible, bien éclairée, bien exposée — et entièrement blanche. **Quand un type inattendu
arrive dans un stub, il faut lever une exception.**

⚠️ **`verify-perf.mjs` et `preview-fps.mjs` n'existent pas.** `labyrinth/js/world.js:339`
s'appuie dessus pour justifier son heuristique. L'outil a disparu, la formule est restée.

---

## 10. Modes 3D autonomes

`templerun` et `labyrinth` chargent encore **r128 depuis cdnjs sans `integrity`**.
`candyluge` est passé au **local** au 422. `candyland` est du canvas 2D pur. `crystal`
n'utilise pas THREE.

⚠️ **LE CONTEXTE DU 421 SE TROMPAIT** : il annonçait qu'une migration vers un three.js
moderne était un **préalable** aux modèles glTF et au post-traitement. C'est faux. **r128
expédie elle-même** `GLTFLoader`, `EffectComposer`, `UnrealBloomPass` et `ShaderPass` dans
`examples/js` ; ils sont seulement **absents du miroir cdnjs**. Copiés depuis npm
`three@0.128.0` : mêmes fonctionnalités, **zéro déplacement de teinte** — là où une
migration r128 → r15x+ aurait déplacé TOUTES les couleurs (gestion colorimétrique
automatique à partir de r152).

La migration reste souhaitable un jour pour `templerun` (31 matériaux) et `labyrinth` (65).
⚠️ **Le vrai obstacle n'y est pas colorimétrique** : `labyrinth/js/world.js:370-382` recopie
l'atténuation r128 `(1 − d/portée)^decay` pour classer les lumières. Cette formule disparaît
vers r155 et le classement continuera de tourner **sans erreur** en sélectionnant les
mauvaises lumières.

---

## 11. Vocabulaire

- **« zip N »** : trace historique des livraisons Cowork (jusqu'au 423). Continue de servir
  de référence temporelle dans le README et les commentaires de code, même après le passage
  à Claude Code — **nommée d'après la fonctionnalité livrée, pas d'après la zone touchée**.
  Piège vérifié : le 418 « vallée de verre » désignait `public/crystal/`, pas la ferme.
- **hôte / invité** : rôles réseau, pas des personnes.
- **AOI** : rayon au-delà duquel on cesse de diffuser une entité.
- **PNJ nommés** : Greg, Soan, Harald, Rosalie, René (ferme). Aubin (crystal, ch. 1).
- **Les références de Guillaume sont des images GÉNÉRÉES** (concept art). Elles font
  autorité sur l'intention, **jamais sur l'interface**.

---

## 12. À compléter par Guillaume

- **Les trois dettes du 423** (§6) — la reprise immédiate.
- **Le framerate de `candyluge`** (§9) — la plus urgente après les dettes.
- **Le bonbon empoisonné** (§6) : décision de conception, pas de technique.
- **Gels de PNJ chez l'invité** (359-365) : encore observés, ou clos ? L'hypothèse
  « throttle 10 msg/s » n'est pas validée. Vérification demandée depuis le 419 : session
  réelle à 2, ferme peuplée, console de l'hôte ouverte — l'avertissement « message JETÉ »
  apparaît-il ?
- **`crystal`** : le chapitre a **deux** segments jouables (`play run` et `play walk`).
  Retirer le second retire aussi le seul endroit où l'on ramasse des éclats — donc
  `finalShards` et la jauge de Chant.
- **Numérotation** : quel rapport entre `FIX 24x` et `zip 26x/36x` ?

---

## 13. Comment maintenir ce fichier (Claude Code)

1. **Remplacer, ne jamais empiler.** Ce fichier décrit le **présent**. Une information
   périmée se supprime, elle ne se date pas.
2. **200 lignes = passe d'élagage obligatoire.** **Ne pas relever le seuil.** L'élagage se
   fait AVANT d'ajouter, pas quand Guillaume le demande.
3. **Avant de proposer une mise à jour**, vérifier : objectif général (§0), contraintes,
   méthodes, pièges, état d'avancement, et la préférence de Guillaume pour les questions
   préalables.
4. **Critère d'inclusion** : « est-ce vrai à l'échelle du projet, et invérifiable en
   ouvrant un seul fichier ? » Sinon, ça va dans un commentaire de code.
5. **Écrire pour un modèle fort.** Densité maximale, phrases courtes, tableaux.
6. **Dire ce qui n'est PAS fait**, avant le reste. Un contexte qui laisse croire qu'une
   étape est complète fait perdre plus de temps qu'il n'en fait gagner.
7. **Corriger ce que ce fichier affirmait à tort** dès que c'est identifié — ne pas laisser
   une erreur constatée survivre à la session qui l'a trouvée.
8. **Ce fichier se met à jour en place**, dans le repo, comme n'importe quel autre fichier
   — commit et push avec le reste des changements de la session.
