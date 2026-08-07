# CLAUDE.md — CONTEXTE ARCARDI

**Lis ce fichier en entier avant toute action. Puis arrête de lire et demande.**
Il remplace l'exploration du dépôt pour tout ce qui est global. Le README est un journal
chronologique inversé : c'est de l'**histoire**, pas de l'orientation.

État à jour du **zip 426**. Chantier actif : **Valley Town** (§6) — carte agrandie une
seconde fois, **intérieur complet du tribunal**, et **la coupe de bois en ville**.
**`candyluge` et `crystal` sont EN PAUSE.**

⚠️⚠️ **LE FICHIER A GRANDI, ET IL FAUT LE DIRE : 387 → 457 lignes.** L'élagage a bien eu lieu
(l'histoire des mesures d'image, les 18 règles de `candyluge` — qui vivent dans
`public/candyluge/README.md` et font autorité là-bas —, le détail des défauts du 425), mais le
tribunal est un CHAPITRE ENTIER de plus. **Le plafond de 200 lignes est donc doublé et la
dette EMPIRE** ; §14.2 dit où couper au prochain zip, et ce ne sera plus optionnel.

---

## 0. L'objectif de Guillaume — ce à quoi tout se mesure

**Une soirée de jeu entre amis, à deux ou trois, qui donne envie d'y revenir.** Arcardi n'est
pas une plateforme : c'est un salon qu'on ouvre un vendredi soir avec un code partagé. Tout
arbitrage se fait contre ce chiffre — **2 joueurs, occasionnellement 3**.

1. **La qualité avant le nombre.** 22 jeux existent ; ce qui compte est qu'un jeu donné soit
   *fini*. Depuis le 421, l'exigence est explicitement **AAA**.
2. **Le monde partagé est le cœur.** La ferme est un lieu qu'on habite ; les mini-jeux sont des
   portes qui s'y ouvrent, jamais des applications séparées.
3. **Rien ne doit casser pour les autres.** Le multijoueur est fragile et gratuit (§3).

---

## 1. Le projet

Next.js 14 (App Router, **JavaScript pur, pas de TypeScript**) + Supabase (auth, Postgres,
Realtime) + Vercel. Salons à code partagé, 22 jeux, scores synchronisés.

**La ferme** (`GAME_ID = "ferme"`) est un monde partagé persistant, ~99 % du trafic réseau.
**Valley Town** en est la seconde carte, multijoueur, atteinte par le train ; **l'intérieur du
tribunal** en est la troisième. **`candyluge`** est une descente 3D solo en three.js.
**`crystal`** est un jeu narratif solo à rastériseur logiciel.

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
- **Fin de session** : mettre ce fichier à jour sur demande. **Commits et push restent à
  Guillaume** (GitHub Desktop). **Dire si une manipulation Supabase est nécessaire — et le dire
  aussi quand elle ne l'est pas.**
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
  sous ses pieds ; son ÉTAGE dans le tribunal se lit dans son `y` (§6). Un champ de plus,
  c'est surtout un champ à réconcilier.

---

## 4. Pièges invisibles — les casser ne produit aucune erreur

**Ferme / Valley Town / tribunal**
- **L'instance cachée.** Hôte hors ferme : `FermeGame` reste montée dans un `display:none`
  (`fermeAway`), simule et diffuse toujours. `document.hidden` = `false`.
- **La boucle de nuages tourne à vide volontairement** (`SKY_CLOUD_COUNT: 0`) : ses tirages
  appartiennent au flux aléatoire partagé. Règle du 381.
- **`anyRemoteNear` renvoie toujours `false` pour le monde maléfique** (filtre
  `zone === "farm"`, lit `p.x/p.y`, or les spectateurs vivent en `p.ex/p.ey`).
- **`netCanBroadcast()` vs `netHasAudience()`** : le premier teste `hiddenRef`, le second
  non. Ne pas les fusionner. **`broadcastSnapshot()` reste en envoi direct.**
- ⚠️ **UN OUVREUR DE MINI-JEU APPELÉ À MI-FONDU NE DOIT PAS TESTER `zoneTransRef.active`.**
  (Un changement de ZONE, lui, doit le tester : c'est le garde-fou de `enterCourt`.)
- ⚠️⚠️ **QUAND UNE ZONE GAGNE SA PROPRE BOUCLE DE RENDU, ELLE HÉRITE DE TOUT CE QUE LA BOUCLE
  COMMUNE FAISAIT POUR ELLE.** Deux occurrences trouvées au 426, et il en reste sûrement :
  (1) la carte était un écran noir en ville depuis le 234 — rien n'était cassé dans son
  dessin, `drawFullMap` n'était simplement **jamais appelée** ; (2) `actAnimRef`, le verrou
  anti-répétition de `doAction`, n'était décrémenté que dans la partie FERME de la boucle :
  en ville, le premier coup de hache le montait à 0,28 et il n'en redescendait **jamais** —
  un seul coup possible par visite, sans le moindre message. **À vérifier écran par écran et
  minuteur par minuteur, zone par zone.**
- ⚠️⚠️ **UNE CARTE EN CACHE DE MODULE NE SE MUTE JAMAIS.** `getTownWorldCached` (et son
  jumeau du tribunal) rend un SINGLETON partagé par tous les remontages de l'onglet. Écrire
  dedans — par exemple retirer un arbre coupé — ferait fuiter l'état d'une ferme à l'autre
  dans le même onglet : on chargerait un code neuf et la ville arriverait déboisée. Tout ce
  qui change vit donc dans l'état PARTAGÉ (`shared.townChop`), consulté au dessin ET à la
  collision. Le banc le vérifie explicitement (§10).
- ⚠️ **UN EFFET VISUEL PORTE SA ZONE.** Les x/y d'un effet de Valley Town n'ont aucun sens
  sur la carte de ferme : sans le filtre posé dans `spawnFx` (426), un joueur resté à la
  ferme voyait des copeaux jaillir d'un point au hasard de son champ à chaque coup de hache
  donné en ville. Même famille que les gardes `zone !== "farm"` du 234.
- ⚠️ **TEINTER UN SPRITE AVEC UN `fillRect` DESSINE UNE BOÎTE.** Un sprite est transparent
  partout sauf sur lui-même ; l'assombrir passe par `ctx.filter` (et il FAUT le remettre à
  `"none"`, c'est un état du contexte).
- ⚠️⚠️ **DEUX CARTES SANS REPÈRE COMMUN FINISSENT PAR SE MÉLANGER, et ça ne se voit que
  quand la plus petite ne tient plus dans la grande.** Un repli dessinait les résidents à
  leur parcelle *Valley Town* sur la carte de *ferme*. **Agrandir une carte, c'est révéler
  ces confusions-là.**
- ⚠️⚠️ **UNE COUCHE QUI DÉCIDE D'UNE COLLISION DOIT SORTIR DU GÉNÉRATEUR.** Au 425 la couche
  de haies remplissait `solid` sans être rendue : **six cents murs invisibles**, zéro erreur.
  Contrôle à garder, désormais automatisé (§10) : *toute case bloquante doit être dessinée
  par quelqu'un* — et sa réciproque, *tout décor massif doit bloquer*.
- ⚠️ **ON PERCE LE PASSAGE AVANT DE POSER LA CLÔTURE**, jamais l'inverse (le verger s'était
  refermé sur 309 cases). « Clôturer sauf devant la porte » se casse au premier décalage.
- ⚠️ **UN MONDE DOIT SORTIR COMPLET DE SON CONSTRUCTEUR.** `generateWorld` ne créait ni
  `sucreries` ni `orchards` — **créer une ferme sur un code neuf plantait**, pour tout le
  monde sauf nous.
- ⚠️⚠️ **UN DÉCOR POSÉ SUR UNE TRAME RÉGULIÈRE RENCONTRERA UN JOUR UNE AUTRE TRAME
  RÉGULIÈRE.** 426 : les lampadaires « tous les 8 pas » de la rue principale sont tombés pile
  sur la nouvelle artère x = 196 et l'ont coupée. Même famille : un hachage LINÉAIRE de la
  position (`x*7+y*13`) donnait une seule couleur de bâche par rangée d'étals, posés tous les
  4 pas. **On teste le sol (qui sait déjà tout), ou on laisse le générateur décider.**
- ⚠️ **`stopPropagation` N'ARRÊTE PAS LES AUTRES ÉCOUTEURS DE LA MÊME CIBLE** (il faut
  `stopImmediatePropagation`).

**JavaScript / three.js**
- ⚠️⚠️ **`chaîne.replace("X", …)` NE REMPLACE QUE LA PREMIÈRE OCCURRENCE.**
- ⚠️⚠️ **UN `useProgram` QUI ÉCHOUE NE DÉLIE PAS LE PROGRAMME PRÉCÉDENT** : un shader qui ne
  compile pas fait dessiner l'objet SUIVANT avec les mauvais attributs. **Seul indice :
  `INVALID_OPERATION: program not valid` dans la console.**
- ⚠️⚠️ **UN `const` DE HAUT NIVEAU N'EST PAS UNE PROPRIÉTÉ DE `window`.** Tester avec
  `typeof X !== "undefined"`.
- ⚠️ **UN EFFET À BOUFFÉES NE S'ÉTEINT PAS EN METTANT SON TAUX À ZÉRO.**
- ⚠️ **`*/` DANS UN COMMENTAIRE DE BLOC LE FERME** — `COURT_STAIR_*/COURT_LINKS` a cassé le
  build du 426. Les commentaires dense de ce projet en sont friands.
- **`Pix.rng(graine)` rend un générateur INDÉPENDANT** (`pix.js:40`).
- **`crystal` n'affiche AUCUNE image** : tampon 480×270 toujours opaque.
- **La caméra de `walk` est 2,6 unités DERRIÈRE le personnage.**
- **Rendre un objet invisible ne le retire pas du monde.**

---

## 5. Carte du territoire

| Fichier | Rôle |
|---|---|
| `components/ferme/FermeGame.js` | tout le jeu ferme + Valley Town + tribunal — **~18 500 l.** |
| `components/ferme/fermeEngine.js` | règles pures · **`generateTownWorld()`** · **`generateCourtWorld()`** |
| `components/ferme/fermeConstants.js` | réglages · **tous les `TOWN_*` et `COURT_*`** |
| `components/ferme/fermeArt.js` | **tous** les sprites, en canevas procédural. Aucun PNG |
| `app/room/[code]/page.js` · `lib/gameSync.js` · `lib/realtimeQuota.js` | salon · synchro · quota |
| `public/candyluge/js/config.js` | **tous** les nombres de la descente. Rien ailleurs |
| `public/candyluge/js/slope.js` | piste. `finishSAt()`/`cpEvery()` = les définitions |
| `public/candyluge/js/sled.js` · `critters.js` · `world.js` · `dev.js` | physique · gourmands · scène · menu dev |
| `public/vendor/three-r128/` | three.js r128 + GLTFLoader + EffectComposer, en local |

⚠️ **`scenes.js` contient 2 tableaux, `shots.js` en contient 7**, sur un `backdrop()` COMMUN.
**Lecture de `FermeGame.js` : étroit mais profond.** `grep` sur le symptôme, lire largement
autour, chercher les autres usages du symbole avant d'éditer.

---

## 6. Valley Town et le tribunal — état au 426

**Carte 224×168** (192×144 au 425, 64×48 avant). Regénérée à graine fixe, **jamais
persistée** — c'est ce qui autorise à tout refaire d'un bloc, sans migration.

**Ce qui existe.** Cinq avenues est-ouest (`TOWN_ST_ROWS`) et quatre nord-sud
(`TOWN_ST_COLS`) · une place de 30×26 (fontaine, obélisque, parterres, mobilier) · **27
parcelles** en jardin clos de haie · un parc avec étang et **kiosque à musique** · un verger
en rangs · un **champ de foire garni** (10 étals, puits, caisses) · un **cimetière** derrière
l'église · un **lac au sud** avec promenade et ponton · le **quartier des artisans** à l'est ·
la **Haute-Ville** (terrasse à 1 unité d'altitude) et son **belvédère** (2).

**Les trois monuments** sont en canevas procédural : `TOWN_CHURCH` (l'ancien townhall du 235,
dessin inchangé, renommé sur demande), `TOWN_HALL` (brique rouge, beffroi décalé,
volontairement asymétrique), `TOWN_COURT` (néoclassique, en Haute-Ville — c'est ce qui donne
une raison d'être aux escaliers).

**Le relief.** ⚠️ **L'ALTITUDE EST UNE PROPRIÉTÉ DE LA CASE, PAS DU PERSONNAGE** (tableau
`elev`). Une seule règle — « pas plus de `TOWN_STEP_MAX` d'un pas » — fait tenir les falaises
ET marcher les escaliers, sans aucun cas particulier. Le décalage à l'écran vaut
`elev × TOWN_ELEV_PX` (30 px ; à 14 la terrasse ressemblait à un trottoir), donc collision et
dessin ne peuvent pas diverger. **Espace saute d'un rebord**, jamais vers le haut.

### Le tribunal, dedans (426)

**Trois niveaux, 17 pièces, une seule grille.** ⚠️⚠️ **LES ÉTAGES SONT EMPILÉS DANS LA MÊME
CARTE et le niveau se DÉDUIT de `y`** (`E.courtFloorOf`) : aucun champ à diffuser, aucun état
à réconcilier, les joueurs distants sont au bon étage avec leurs seuls x/y. C'est le même
raisonnement que l'altitude de la ville.

- **RDC** : hall à colonnes, salle d'audience (estrade, barre, jurés, public), salle des
  témoins, greffe, vestiaire des robes, accueil, **panneau d'affichage**.
- **Étage** : cabinet du juge, salle du jury, bibliothèque, **cadastre**, **permis**,
  **notaire**, **état civil**.
- **Sous-sol** : archives, scellés, **cellules** (3, avec grilles), objets trouvés, chaufferie.

**Le plan est DÉDUIT DES USAGES à venir**, pas l'inverse : chaque bureau répond à une
mécanique qui existe déjà et qui n'a pas de guichet (parcelles « à vendre » depuis le 234,
constructions, échanges entre joueurs, objets perdus). **Rien n'est opérationnel, et le jeu le
DIT** : plaque sur chaque porte, description + « bientôt » sur E, panneau d'affichage
récapitulatif dans le hall (`COURT_BOARD_ORDER`). Un bâtiment muet passe pour cassé.

⚠️ **UNE CAGE D'ESCALIER EST UN LIEU, PAS UN TRAJET.** Premier jet : deux volées orientées et
une table de liaisons — la montée arrivait sur la volée descendante de l'étage, c'est-à-dire
dans un mur. `COURT_STAIRWELLS` relie deux niveaux au même endroit ; le sens se déduit des
`alt`. **Deux descriptions d'une même cage ne peuvent pas rester d'accord.**

⚠️ **AUCUN MEUBLE DEVANT UNE PORTE** — garde-fou explicite dans le générateur, qui **refuse et
le dit** (`console.warn`). Sans lui, les colonnes du couloir (tous les 5 pas) muraient six
pièces sur dix-sept, salle d'audience comprise, sans la moindre erreur.

### Couper du bois en ville (426)

Quatre décisions prises explicitement par Guillaume : la coupe est **partagée ET sauvegardée**
(l'hôte arbitre, `shared.townChop` part dans le JSON de `ferme_saves` — **aucune migration
SQL**), **tous** les arbres sont coupables, **ça repousse** (`TOWN_TREE_REGROW_MS` = 2 jours de
jeu), et seule la **hache** est réactivée en ville (le 250 avait tout coupé, à raison : il n'y
a rien à labourer sur du pavé). Même coût d'énergie, même rendement, même quête « chop » qu'à
la ferme — un second équilibrage aurait créé des allers-retours en train.
Une entrée vaut `{hp}` (arbre entamé) ou `{r}` (abattu, **souche traversable** qui repousse) :
le dictionnaire ne garde que les EXCEPTIONS, donc il reste minuscule et se persiste sans
gonfler la sauvegarde.

**Ce qui reste à faire, et c'est assumé** : aucun service du tribunal ne fonctionne · aucun PNJ
n'habite la ville ni le tribunal · pas d'intérieur de maison · le sud-est reste en pelouse.

---

## 7. `candyluge` — en pause depuis le 425

Physique, piste et gourmands **inchangés depuis le 417**. **Les 18 « choses à ne pas défaire »
sont dans `public/candyluge/README.md` et font autorité** — elles ne sont pas recopiées ici.
Acquis du 425 : 10 fanions (`CP_COUNT` est le réglage, l'espacement en découle), HUD des
fanions, traînée rose (quatre objets dérivés de `COL_SKID` par `FX_TRAIL_TINT`), menu dev.

**⚠️ CE QUI N'EST PAS FAIT**, par ordre de gravité :
1. ⚠️⚠️ **LA LUGE DÉRIVE SEULE** — `this.lat += trackPull * dt` s'ajoute **sans condition** :
   sans pilote elle percute la barrière en quelques secondes. Correctif :
   `trackPull * (base + (1 − base) * skid)`, `base ≈ 0,25`.
2. **Le cœur de la traînée sature encore** : question de DENSITÉ des grains et de bloom, pas
   de teinte. Passe de calibrage annoncée au 424.
3. **`clearAll()` ne retire pas les tronçons de la scène** : chaque ruban est dessiné en double.
4. **Les bras du pilote ne s'animent plus** (`sledParts.arms` VIDE ; le nœud DOIT rester).
5. Direction à assouplir (`EDGE_RATE`, `EDGE_CROSS_MUL`, `LAT_GRIP`, `CARVE_K`) · boosts à
   chevrons · huit échelles glTF non vérifiées · étincelles trop grosses (`stars.gain = 2.2`).

**Piste non implémentée : bonbon empoisonné noir, vision en négatif.** Presque gratuit
techniquement (`GradeShader` + un uniforme) ; **le travail est de CONCEPTION** — un malus qui
gêne la lisibilité à 125 km/h, dans un monde décidé paisible.
⚠️ **LE JEU RESTE DERRIÈRE LE MUR DE CHANTIER** (⌘⇧X deux fois en moins de 3,5 s).

---

## 8. Qualité d'image — la méthode

**Réduire la référence à 480×270, mesurer, comparer, corriger, re-mesurer. On ne juge pas au
ressenti.** ⚠️ **ET LA STATISTIQUE QUI COMPTE N'EST PAS LA MOYENNE** : au 421 la luminosité
moyenne était juste et l'image fausse — **pas un pixel sous L60**, donc aucune ombre. Il faut
un **écart**, pas un décalage. (Référence : L 180,6 / **écart-type 47,7** / saturation 27,8 % /
2,1 % sous L60.)

⚠️⚠️ **LA LEÇON LA PLUS COÛTEUSE, ET ELLE EST GÉNÉRALE : un paramètre qui DOUBLE un autre
paramètre est une divergence en attente. Il doit être DÉRIVÉ, jamais réglé.**
En place : `Slope.finishSAt()`, `Slope.cpEvery()`, `Models.fit()`, `trailTint()`,
`COURT_STAIRWELLS`, la couleur des étals.

⚠️ **Fausses pistes MESURÉES, ne pas les refaire :** monter le dégradé du ciel de crystal ·
doubler `BLOOM_H`/`BLOOM_K` (**ne pas y toucher**) · compenser le linéaire en montant les
intensités « au jugé » (soleil à 2,45 → image **entièrement blanche** ; repère : neige au
soleil ≈ **1,15 linéaire**, à l'ombre ≈ **0,40**) · peindre des veines cyan sur la piste rose
(le mélange passe par le **gris** ; la sortie est dans la VALEUR) · deux couleurs réglées à
l'œil côte à côte ne gardent pas leur écart une fois le rendu passé en linéaire.

**Côté `crystal`, NON PROPAGÉ :** `Flora.canopy` n'est appelée que par `walk.js` ; `corniche`
et `pont` sont **bit à bit identiques** au 419.

---

## 9. Blender — deux pipelines, et un endroit où il ne paie pas

BlenderMCP est installé (Blender 5.2 LTS) et **répond**.

**Pipeline A — vers `crystal` (pixel art).** On modélise, on rend, on **transcrit en table de
données**. **Jamais de PNG dans le jeu.** Trois réglages contre-intuitifs : **ombrage plat
pur** · **aucun anticrénelage** (`taa_render_samples = 1`, `filter_size = 0.01`) ·
**quantification LINÉAIRE**. Courbe `Standard`, lampes **Soleil**.

**Pipeline B — vers les jeux three.js (glTF).** Script `candyluge_props.py`, hors dépôt.
Export **sans matériaux**, maillages `part_<clé>` (clé de `mat` dans `world.js`), **200 à 900
triangles** par accessoire. Trois pièges : ⚠️ **BLENDER EST Z-UP, THREE.JS Y-UP, ET
L'EXPORTEUR CONVERTIT FIDÈLEMENT UNE ORIENTATION FAUSSE** (`yup_authoring()`) · ⚠️ **l'export
gltf EXIGE un contexte** (`temp_override(…, area=VIEW_3D, region)`) **et de désélectionner**,
sinon échec au **deuxième** accessoire seulement · ⚠️ **l'échelle se DÉRIVE du gabarit**
(`Models.fit`), jamais devinée dans l'appelant.

⚠️⚠️ **ESSAI MESURÉ AU 426, ET ABANDONNÉ : le pipeline A pour un sprite de ville.** La statue
de la Justice du hall a été modélisée, rendue à plat en 32×48 et mesurée. Le pipeline
FONCTIONNE (le rendu sort, transcriptible en table de données — donc **sans introduire de
PNG**). Mais après deux passes : premier jet **entièrement saturé** (0 % sous L60, aucune
ombre — le défaut du §8 en entier), second jet **écart-type 24,6** contre 47,7 en référence,
géométrie non jointive et cadrage à refaire. **Le sprite dessiné à la main restait meilleur à
cette taille.** ⚠️ La leçon n'est pas « Blender ne sert pas » mais : **à 32 px, ce qu'on achète
avec Blender est l'ÉCLAIRAGE, pas la géométrie — et l'éclairage demande la même passe de
calibrage que §8. Compter plusieurs itérations, ou dessiner à la main.**

⚠️ Tous les sprites de la ferme, de Valley Town et du tribunal sont des **canevas procéduraux**
dans `fermeArt.js`. Y introduire un PNG créerait un troisième pipeline (chargement, cache,
palette hors-fichier) pour un seul bâtiment. **Juger un prop nu sur fond plat n'a aucun sens**
— d'où les fonds de `render-tribunal.mjs` (§10).

---

## 10. Vérification — CE CHAPITRE A CHANGÉ AU 426

⚠️ **`node` EST INSTALLÉ (v24, npm 11), `npm install` est fait.** On peut **bâtir et jouer**.

⚠️⚠️ **NE JAMAIS LANCER `npx next build` PENDANT QUE `npm run dev` TOURNE.** Les deux écrivent
dans le MÊME `.next/` : le build remplace les morceaux que la page ouverte référence encore, et
le navigateur se met à recevoir des **404 sur les chunks**. Symptôme trompeur au possible — la
page se charge, le HUD s'affiche, et le canevas reste vide, exactement comme si le code de
rendu était cassé. J'ai perdu une demi-session du 426 à chercher un bogue qui n'existait pas.
**Remède** : arrêter le serveur, `rm -rf .next`, redémarrer.

**`npx next build`** compile tout : contrôle le moins cher, il attrape les fautes de syntaxe
sur les 18 500 lignes. ⚠️ L'avertissement `'G_SOIL' is not exported` est **PRÉEXISTANT**.
⚠️ **SANS `.env.local`, LE BUILD S'ARRÊTE APRÈS LA COMPILATION** sur `Error: supabaseUrl is
required` en pré-rendant `/login` et `/signup` — ce n'est PAS une régression. **Ce qui compte
est la ligne `✓ Compiled successfully` juste avant.**

**Bancs `.mjs` — ce qui existe VRAIMENT** (le 425 affirmait le contraire, voir §14.6) :
- **`tools/verify-vallee.mjs` (426, 88 contrôles, 88/88)** — **il n'existait pas avant.** Il
  importe le VRAI moteur (copie temporaire avec l'extension ajoutée à l'import) et parcourt la
  ville depuis la descente du train avec la règle de dénivelé du jeu : rues, 27 portes, 13
  repères, murs invisibles ET décors traversables, géométrie des bâtiments, rebords sautables ;
  puis le tribunal, niveau par niveau, pièce par pièce, cages d'escalier et cellules ; puis la
  coupe de bois, dont le contrôle qui compte n'est pas « ça coupe » mais **« ça ne mute pas la
  carte en cache »**.
  **Il a trouvé six défauts que la relecture ne pouvait pas voir** (rue coupée par un
  lampadaire, six pièces murées par des colonnes, montée arrivant dans un mur, porte de
  cellules ouvrant sur une cloison, deux cases prises au piège, banc traversable sur le ponton).
- **`tools/render-tribunal.mjs` (426)** — les 25 meubles et 11 décors en PNG, sur leurs vrais
  fonds. Il a montré que toute une rangée d'étals sortait de la même couleur.
- `verify-constants` · `verify-objects` · `verify-strings` · `verify-syntax` · `verify-gates` ·
  `verify-cycle` · `verify-orchards` · `verify-scope` · `verify-vergers` · `render-fruits`.
- ⚠️ **`verify-luge`, `verify-boot`, `preview-luge`, `preview.mjs`, `verify-perf` et
  `preview-fps` N'EXISTENT PAS** dans `tools/` (le 425 en citait plusieurs).

**Jouer en local** — deux échafaudages TEMPORAIRES, **à supprimer après** :
1. un `.env.local` pointant sur un **faux Supabase** (un serveur HTTP qui répond `[]` sur
   `/rest/v1/*` suffit) ; sans lui on reste bloqué à l'écran « code de ferme » ;
2. une page jetable `app/<nom>/page.js` montant `<FermeGame room={{id}} me={{id,username}}
   isHost savedCode="XXXX" />`. ⚠️ **Un dossier `app/` préfixé par `_` n'est PAS une route.**
   ⚠️ **La supprimer avant de livrer** : en production elle ouvre une ferme sans authentification.

Puis ⌘⇧X → menu développeur → **9 arrêts** (ferme, passage, Valley Town ×5 dont foire et lac,
tribunal ×3 : hall, étage, sous-sol).
⚠️ **Le raccourci ⌘⇧X passe mal par l'automatisation du navigateur** ; un
`window.dispatchEvent(new KeyboardEvent("keydown", {code:"KeyX", metaKey:true, shiftKey:true}))`
marche, et le menu ouvert **bloque les touches de déplacement** (le fermier ne bouge pas
derrière). ⚠️ **La capture d'écran de l'outil navigateur échoue ici** : passer par
`canvas.toDataURL()` POSTé au faux Supabase, qui l'écrit sur disque.

**`candyluge`** est statique : un serveur de fichiers sur `public/` suffit — ⚠️ **avec
`Cache-Control: no-store`**. Console (`program not valid` !), `__lugePerf()`, `Models.ready`.
⚠️ **La descente ne peut PAS être parcourue sans pilote** (dette n°1) : passer par le menu dev.

⚠️ **Un stub qui « retombe sur une valeur raisonnable » ment mieux qu'un stub qui plante.**
**Quand un outil et le jeu divergent, croire le jeu.**
⚠️ **Un onglet non focalisé est bridé à ~0,3 image/s** : une mesure en arrière-plan ne vaut rien.

**Session manuelle à 2 joueurs — seule vraie validation du multijoueur.**

---

## 11. Modes 3D autonomes

`templerun` et `labyrinth` chargent encore **r128 depuis cdnjs sans `integrity`**.
`candyluge` est passé au **local** au 422. `candyland` est du canvas 2D pur.

⚠️ **UNE MIGRATION VERS UN THREE.JS MODERNE N'EST PAS UN PRÉALABLE** aux glTF ni au
post-traitement : r128 expédie elle-même `GLTFLoader`, `EffectComposer`, `UnrealBloomPass` et
`ShaderPass`, seulement absents du miroir cdnjs (copiés depuis npm `three@0.128.0` : **zéro
déplacement de teinte**). ⚠️ **Le vrai obstacle n'est pas colorimétrique** :
`labyrinth/js/world.js:370-382` recopie l'atténuation r128 `(1 − d/portée)^decay` pour classer
les lumières ; cette formule disparaît vers r155 et le classement continuera de tourner **sans
erreur** en choisissant mal.

---

## 12. Vocabulaire

- **« zip N »** : trace historique des livraisons (jusqu'au 426), **nommée d'après la
  fonctionnalité livrée, pas d'après la zone touchée**. Piège vérifié : le 418 « vallée de
  verre » désignait `public/crystal/`, pas la ferme.
- **hôte / invité** : rôles réseau, pas des personnes.
- **AOI** : rayon au-delà duquel on cesse de diffuser une entité.
- **PNJ nommés** : Greg, Soan, Harald, Rosalie, René (ferme). Aubin (crystal, ch. 1).
- **Les références de Guillaume sont des images GÉNÉRÉES** (concept art). Elles font autorité
  sur l'intention, **jamais sur l'interface**.

---

## 13. À compléter par Guillaume

- **Le tribunal** (§6) : quel service ouvre EN PREMIER ? Le cadastre est le plus mûr (les
  panneaux « à vendre » existent depuis le 234) ; le notaire est le plus utile à deux joueurs.
- **Valley Town** (§6) : quels PNJ habitent la ville ? que met-on dans le sud-est ?
- **`candyluge`** (§7) : la luge dérive seule (n°1) · le calibrage des particules · le bonbon
  empoisonné, qui est une décision de CONCEPTION et pas de technique.
- **Gels de PNJ chez l'invité** (359-365) : encore observés ? Vérification demandée depuis le
  419 — session réelle à 2, ferme peuplée, console de l'hôte ouverte.
- **`crystal`** : le chapitre a **deux** segments jouables (`play run` et `play walk`).
  Retirer le second retire le seul endroit où l'on ramasse des éclats.
- ⚠️ **VERCEL NE DÉPLOIE PLUS AUTOMATIQUEMENT depuis le 425**, et **ce n'est pas le dépôt** :
  `origin/main` porte bien le commit (`git ls-remote` le confirme), il n'y a ni `vercel.json`
  ni étape de build ignorée, et le projet compile. Le lien Git du projet Vercel est donc à
  vérifier côté tableau de bord (§10). Un `vercel --prod` depuis le terminal — ce que Guillaume
  a dû faire — **ne rétablit rien** : une livraison CLI n'est pas une livraison Git.

---

## 14. Comment maintenir ce fichier

1. **Remplacer, ne jamais empiler.** Ce fichier décrit le **présent**. Une information périmée
   se supprime, elle ne se date pas.
2. **200 lignes = passe d'élagage obligatoire. Ne pas relever le seuil.** L'élagage se fait
   AVANT d'ajouter — au 426 il a eu lieu et n'a pas suffi (418 → 387 → **416**). **Le prochain
   zip coupe pour de bon**, et l'ordre est décidé : §7 part vers `public/candyluge/README.md`
   (le jeu est en pause, ses dettes y sont mieux placées) · §9 garde ses cinq pièges et perd le
   reste · §4 se relit en supprimant tout ce dont un banc de `tools/` s'occupe désormais.
3. **Critère d'inclusion** : « est-ce vrai à l'échelle du projet, et invérifiable en ouvrant
   un seul fichier ? » Sinon, ça va dans un commentaire de code. **L'histoire d'un défaut
   corrigé n'y a pas sa place — seule sa LEÇON, en §4.**
4. **Écrire pour un modèle fort.** Densité maximale, phrases courtes, tableaux.
5. **Dire ce qui n'est PAS fait**, avant le reste.
6. ⚠️ **NE JAMAIS AFFIRMER QU'UN OUTIL EXISTE SANS L'AVOIR LANCÉ.** Le 425 décrivait
   `verify-vallee.mjs` « 74 contrôles, 74/74 » : le fichier n'existait pas. Un banc imaginaire
   fait passer pour testé ce qui ne l'est pas — c'est le stub menteur du §10, appliqué à la
   documentation elle-même. Le 426 l'a écrit pour de bon.
