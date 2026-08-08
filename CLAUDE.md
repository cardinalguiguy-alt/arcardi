# CLAUDE.md — CONTEXTE ARCARDI

**Lis ce fichier en entier avant toute action. Puis arrête de lire et demande.**
Il remplace l'exploration du dépôt pour tout ce qui est global. Le README est un journal
chronologique inversé : c'est de l'**histoire**, pas de l'orientation.

État à jour du **zip 430**. Chantier actif : **relier les deux cartes et jouer sans clavier** —
le marché du champ de foire donne enfin une raison ÉCONOMIQUE de prendre le train, et la ferme
devient jouable au doigt. Tout ce qui concerne la ville et ses habitants est dans
**`components/ferme/README.md`**, qui fait autorité. **`candyluge` et `crystal` sont EN PAUSE.**

⚠️⚠️ **LA FERME ÉTAIT INJOUABLE SANS CLAVIER JUSQU'AU 430**, et personne ne l'avait écrit :
aucun écouteur tactile dans tout son rendu. Un des trois joueurs les plus actifs devait
brancher un clavier Bluetooth pour entrer dans le seul monde partagé du projet. **Une
plateforme qui exige un périphérique n'a pas un défaut d'ergonomie, elle a un défaut d'accès.**

⚠️⚠️ **ET UN COMMENTAIRE PEUT MENTIR PENDANT TROIS ZIPS.** Celui qui décrivait le statut de
Carla Garfield annonçait encore deux verrous retirés au 427, à quarante lignes de sa fiche qui
disait l'inverse. §14.1 s'applique au CODE autant qu'à ce fichier : une information périmée se
supprime, elle ne se date pas. **Et la seule chose qui ne ment pas sur un statut, c'est un
contrôle qui le lit** — il y en a quatre désormais.

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

⚠️ **CE CHAPITRE A ÉTÉ ÉLAGUÉ AU 427 selon la règle du §14 : tout ce dont un banc de
`tools/` s'occupe désormais en est SORTI** (les murs invisibles des haies, les décors
traversables, les meubles devant une porte, les portes murées du tribunal, les colonnes du
couloir). Ce n'est pas un oubli : un piège qu'un outil attrape à chaque lancement n'a plus
besoin d'être retenu par un humain — et le laisser ici ferait croire que la liste est la
protection, alors que c'est le banc.

**Ferme / Valley Town / tribunal**
- **L'instance cachée.** Hôte hors ferme : `FermeGame` reste montée dans un `display:none`
  (`fermeAway`), simule et diffuse toujours. `document.hidden` = `false`.
- **La boucle de nuages tourne à vide volontairement** (`SKY_CLOUD_COUNT: 0`) : ses tirages
  appartiennent au flux aléatoire partagé. Règle du 381.
- **`netCanBroadcast()` vs `netHasAudience()`** : le premier teste `hiddenRef`, le second
  non. Ne pas les fusionner. **`broadcastSnapshot()` reste en envoi direct.**
- ⚠️⚠️ **UNE GARDE D'AUDIENCE ÉCRITE POUR UNE ZONE S'APPLIQUE À TOUTES, ET C'EST FAUX.**
  `anyRemoteNear` renvoie toujours `false` pour le monde maléfique (filtre `zone === "farm"`,
  lit `p.x/p.y`, or les spectateurs vivent en `p.ex/p.ey`). Même défaut au 427 avec les
  résidents partis en ville : un joueur SEUL EN VILLE ne comptait plus comme audience, donc
  l'hôte n'émettait rien, donc toute la ville restait figée pour lui — sans une erreur.
  D'où `anyRemoteNearZoned`, qui compare les zones AVANT les distances.
- ⚠️ **UN OUVREUR DE MINI-JEU APPELÉ À MI-FONDU NE DOIT PAS TESTER `zoneTransRef.active`.**
  (Un changement de ZONE, lui, doit le tester : c'est le garde-fou de `enterCourt`.)
- ⚠️⚠️ **QUAND UNE ZONE GAGNE SA PROPRE BOUCLE DE RENDU, ELLE HÉRITE DE TOUT CE QUE LA BOUCLE
  COMMUNE FAISAIT POUR ELLE.** Deux occurrences au 426 (la carte, écran noir en ville depuis
  le 234 parce que `drawFullMap` n'était **jamais appelée** ; `actAnimRef` jamais décrémenté
  en ville, donc un seul coup de hache par visite). **À vérifier écran par écran et minuteur
  par minuteur, zone par zone.**
- ⚠️⚠️ **TROISIÈME OCCURRENCE DE « LA ZONE QUI N'HÉRITE PAS » AU 429, ET IL FAUT LE COMPTER.**
  Après la carte restée noire et le minuteur d'action jamais décrémenté (426), c'est le CIEL :
  voile nocturne, halos de lampadaires, orage, teinte de saison et neige étaient écrits dans le
  corps du rendu de la FERME. Valley Town, qui a sa propre boucle depuis le 234, n'en héritait
  de rien — **midi de printemps perpétuel pendant quatre zips**, avec des dizaines de
  lampadaires posés dans ses rues qui ne s'allumaient jamais. ⚠️ **UN DÉCOR QUI EXISTE POUR UNE
  MÉCANIQUE ABSENTE EST PLUS TROMPEUR QU'UN DÉCOR MANQUANT.** La parade n'est pas de recopier
  le bloc dans l'autre boucle (ce serait deux nuits à tenir d'accord) : c'est de le SORTIR.
- ⚠️⚠️ **UN DÉCOR NE SE JUGE PAS CONTRE D'AUTRES DÉCORS, IL SE JUGE CONTRE LE PERSONNAGE QUI
  S'EN SERT** (429). Tous les bancs de rendu du projet dessinaient les meubles ENTRE EUX : c'est
  ce qu'il faut pour une palette et un ancrage, et ça ne dit RIEN d'une échelle — un objet deux
  fois trop grand au milieu d'objets deux fois trop grands a l'air juste. Mesuré au 429 :
  l'étal du marché faisait 1,3 fois la taille d'un adulte au lieu de 2,1, la fontaine 2,35 au
  lieu de 1,6, et le dossier du banc arrivait au SOMMET DU CRÂNE. `tools/render-echelle.mjs`.
  ⚠️ Corollaire : **vérifier le repère avant de corriger le dessin.** Le banc semblait faux de
  40 % ; c'est le repère qui l'était — vu de trois quarts, la profondeur d'une assise se dépense
  en pixels VERTICAUX, et un objet qui a du volume vers l'avant paraît toujours plus haut.
- ⚠️⚠️ **RENOMMER UN BÂTIMENT NE LE REDESSINE PAS** (429). L'« église » de Valley Town était la
  MAIRIE du 235 — fronton à colonnes, horloge, drapeau — renommée au 425 sans qu'un pixel
  bouge, la note de l'époque le dit elle-même. La ville a eu deux mairies pendant quatre zips,
  dont l'une s'appelait église. C'est le « bâtiment muet » du 426 en plus sournois : **ici le
  bâtiment parle, et il ment.**
- ⚠️⚠️ **CE QUI EST UNE PURE FONCTION DU TEMPS NE SE STOCKE PAS** (430). Le cours du marché, le
  jour de marché et le jour de service de Carla sont HACHÉS à partir du numéro de jour : deux
  joueurs lisent le même chiffre sans qu'un octet ne circule. Stockés dans `shared`, chacun
  aurait coûté un champ dans le JSON de sauvegarde, un compteur à faire tourner chez l'hôte, un
  message pour le diffuser, une réconciliation à la connexion d'un invité, et une sauvegarde
  d'avant le zip à rattraper. C'est l'astuce des répliques d'ambiance du 427, appliquée à
  l'économie et au calendrier. ⚠️ **Corollaire vital : une telle valeur ne doit dépendre QUE du
  temps.** Le jour où elle dépendra du stock d'un joueur ou de son or, les deux écrans
  afficheront des chiffres différents **et chacun aura l'air cohérent avec lui-même**.
- ⚠️⚠️ **UN SECOND CANAL D'ENTRÉE EST UN QUATRIÈME OUBLI EN PRÉPARATION** (430). Le pavé tactile
  écrit dans `keysRef` — les mêmes booléens que les flèches — au lieu d'avoir son propre
  vecteur. Sinon il aurait fallu modifier les TROIS boucles de déplacement, puis penser à la
  quatrième le jour où une zone s'ajoute : très exactement le motif qui a produit la carte
  noire, le minuteur d'action et le ciel absent. **En partageant la variable, le doigt ne PEUT
  pas se comporter autrement que le clavier.**
- ⚠️⚠️ **UNE CARTE EN CACHE DE MODULE NE SE MUTE JAMAIS.** `getTownWorldCached` (et son
  jumeau du tribunal) rend un SINGLETON partagé par tous les remontages de l'onglet : y
  écrire ferait fuiter l'état d'une ferme à l'autre. Tout ce qui change vit dans l'état
  PARTAGÉ (`shared.townChop`, `shared.wardrobe`). Le banc le vérifie explicitement.
  ⚠️ Corollaire du 427 : même une donnée DÉRIVÉE de la carte (la liste des endroits où l'on
  s'arrête) se met en cache **à côté**, jamais dessus — `townSpots` a son propre cache.
- ⚠️ **UN EFFET VISUEL PORTE SA ZONE.** Sans le filtre de `spawnFx` (426), un joueur resté à
  la ferme voyait des copeaux jaillir d'un point au hasard de son champ à chaque coup de
  hache donné en ville.
- ⚠️ **TEINTER UN SPRITE AVEC UN `fillRect` DESSINE UNE BOÎTE.** Un sprite est transparent
  partout sauf sur lui-même ; l'assombrir passe par `ctx.filter` (et il FAUT le remettre à
  `"none"`, c'est un état du contexte). ⚠️ Même famille au 427 : teinter un VÊTEMENT ne se
  fait pas en repeignant la feuille (on colorerait la peau et les cheveux), mais en
  repeignant les blocs du vêtement à leurs coordonnées exactes.
- ⚠️⚠️ **DEUX CARTES SANS REPÈRE COMMUN FINISSENT PAR SE MÉLANGER, et ça ne se voit que
  quand la plus petite ne tient plus dans la grande.** C'est LE piège de ce projet, payé au
  425 (un repli dessinait les résidents à leur parcelle *Valley Town* sur la carte de
  *ferme*) et re-rencontré partout au 427 dès que les résidents ont pu descendre en ville :
  rendu, AOI, soin d'un blessé, attroupement, disputes, plan de la ville. **La parade est
  UNE position taguée par sa zone, jamais deux jeux de coordonnées.**
- ⚠️⚠️ **UNE COUCHE QUI DÉCIDE D'UNE COLLISION DOIT SORTIR DU GÉNÉRATEUR** (425 : six cents
  haies bloquantes que rien ne dessinait). *Toute case bloquante doit être dessinée par
  quelqu'un*, et sa réciproque. **Désormais automatisé** — et il a resservi au 427, en
  sortant les 80 cases de la boutique, du salon et de la gare avant qu'on aille en jeu.
- ⚠️ **ON PERCE LE PASSAGE AVANT DE POSER LA CLÔTURE**, jamais l'inverse (le verger s'était
  refermé sur 309 cases). « Clôturer sauf devant la porte » se casse au premier décalage.
- ⚠️ **UN MONDE DOIT SORTIR COMPLET DE SON CONSTRUCTEUR.** `generateWorld` ne créait ni
  `sucreries` ni `orchards` — **créer une ferme sur un code neuf plantait**, pour tout le
  monde sauf nous.
- ⚠️⚠️ **UN DÉCOR POSÉ SUR UNE TRAME RÉGULIÈRE RENCONTRERA UN JOUR UNE AUTRE TRAME
  RÉGULIÈRE.** 426 : les lampadaires « tous les 8 pas » sont tombés pile sur la nouvelle
  artère x = 196 et l'ont coupée. **On teste le sol (qui sait déjà tout), ou on laisse le
  générateur décider.**
- ⚠️⚠️ **UN PNJ QUI ABANDONNE SON TRAJET N'A PAS L'AIR BLOQUÉ, IL A L'AIR D'AVOIR CHOISI**
  (427, mesuré et corrigé au 428). La rôdaille en ligne droite du 252 échouait sur **79 % des
  trajets de Valley Town** ; à l'abandon, le résident jouait quand même son activité SUR
  PLACE, sept à vingt-six secondes. Personne n'a rien vu pendant deux zips, parce que le
  symptôme ressemblait à de la contemplation. **Un repli plausible est plus dangereux qu'un
  plantage** (§10, le stub menteur), et ça vaut pour le COMPORTEMENT, pas seulement pour le
  code. La parade est un vrai chemin (`components/ferme/README.md` §2) — et surtout **une
  mesure agrégée**, parce qu'aucune ligne de code n'était fausse.
- ⚠️⚠️ **UN DÉFAUT DE LA SOMME NE SE VOIT DANS AUCUNE LIGNE DE CODE** (428). Deux exemples du
  même zip : 33 des 48 blocs de la ville n'avaient AUCUN endroit de vie, et 16 des 61 endroits
  étaient des tombes — donc un quart de la vie sociale se passait au cimetière, sans que ce
  soit l'intention de personne (le cimetière est simplement le seul décor posé en seize
  exemplaires). Relire le générateur ne l'aurait jamais montré. **Ce genre de défaut se
  contrôle en comptant, et le contrôle doit exister AVANT l'ajout** — sinon on remplace un
  déséquilibre par un autre (premier jet du 428 : 39 % des endroits sur le trottoir).
- ⚠️⚠️ **UNE RÈGLE SOCIALE SANS DÉLAI DE GRÂCE S'ÉTRANGLE AU POINT D'ARRIVÉE** (427, trouvé
  en jeu). Cinq résidents descendent le même quai à la même seconde : tous à portée de
  conversation, donc tous appariés d'un coup, donc tous figés à se saluer en boucle. Personne
  ne quittait la gare. **Un débarquement n'est pas une rencontre.**
- ⚠️ **`stopPropagation` N'ARRÊTE PAS LES AUTRES ÉCOUTEURS DE LA MÊME CIBLE** (il faut
  `stopImmediatePropagation`).

**JavaScript / three.js / canevas**
- ⚠️⚠️ **`chaîne.replace("X", …)` NE REMPLACE QUE LA PREMIÈRE OCCURRENCE.**
- ⚠️⚠️ **UN `useProgram` QUI ÉCHOUE NE DÉLIE PAS LE PROGRAMME PRÉCÉDENT** : un shader qui ne
  compile pas fait dessiner l'objet SUIVANT avec les mauvais attributs. **Seul indice :
  `INVALID_OPERATION: program not valid` dans la console.**
- ⚠️⚠️ **UN `const` DE HAUT NIVEAU N'EST PAS UNE PROPRIÉTÉ DE `window`.** Tester avec
  `typeof X !== "undefined"`.
- ⚠️⚠️ **UN CANEVAS DÉCOUPE EN SILENCE CE QUI DÉPASSE DE SON CADRE** (427) : une feuille de
  personnage fait 16×24 par pose, un chapeau posé au-dessus de y=0 sort décapité, et rien ne
  le dit. Le banc de rendu l'a montré, la relecture non.
- ⚠️⚠️ **`ctx.fillText` N'EST PAS RASTÉRISABLE HORS NAVIGATEUR** (427) : un nom cuit dans un
  sprite fait planter `tools/render-*.mjs`, c'est-à-dire qu'on perd le seul moyen de REGARDER
  ce dessin. Les textes des bâtiments s'écrivent VIVANTS, au rendu — ce qui les rend en plus
  bilingues, ce qu'un sprite baké ne peut pas être. Idem `translate`/`rotate` : le faux canvas
  les ignore, un sprite qui en dépend se juge faux.
- ⚠️ **UN EFFET À BOUFFÉES NE S'ÉTEINT PAS EN METTANT SON TAUX À ZÉRO.**
- ⚠️ **`*/` DANS UN COMMENTAIRE DE BLOC LE FERME** — `COURT_STAIR_*/COURT_LINKS` a cassé le
  build du 426. Les commentaires denses de ce projet en sont friands.
- **`Pix.rng(graine)` rend un générateur INDÉPENDANT** (`pix.js:40`).
- **`crystal` n'affiche AUCUNE image** : tampon 480×270 toujours opaque.
- **La caméra de `walk` est 2,6 unités DERRIÈRE le personnage.**
- **Rendre un objet invisible ne le retire pas du monde.**

---

## 5. Carte du territoire

| Fichier | Rôle |
|---|---|
| `components/ferme/FermeGame.js` | tout le jeu ferme + Valley Town + tribunal — **~20 500 l.** |
| `components/ferme/fermeEngine.js` | règles pures · `generateTownWorld()` · `generateCourtWorld()` · `townSpots()` · **`townNav()` / `townFindPath()`** |
| `components/ferme/README.md` | **Valley Town, le tribunal, les habitants — autorité (428-429)** |
| `components/ferme/fermeConstants.js` | réglages · **tous les `TOWN_*`, `COURT_*`, `WARDROBE_*`** |
| `components/ferme/fermeArt.js` | **tous** les sprites, en canevas procédural. Aucun PNG · **`drawSeated()`** |
| `app/room/[code]/page.js` · `lib/gameSync.js` · `lib/realtimeQuota.js` | salon · synchro · quota |
| `public/candyluge/README.md` | **la dette et les 18 règles de la luge — autorité (427)** |
| `public/candyluge/js/` | `config.js` (tous les nombres) · `slope.js` (la piste) · `sled.js` · `world.js` |
| `public/vendor/three-r128/` | three.js r128 + GLTFLoader + EffectComposer, en local |

⚠️ **`scenes.js` contient 2 tableaux, `shots.js` en contient 7**, sur un `backdrop()` COMMUN.
**Lecture de `FermeGame.js` : étroit mais profond.** `grep` sur le symptôme, lire largement
autour, chercher les autres usages du symbole avant d'éditer.

---

## 6. Valley Town, le tribunal, les habitants — **voir `components/ferme/README.md`**

⚠️ **CE CHAPITRE A ÉTÉ SORTI D'ICI AU 428**, sur l'ordre laissé par le §14.2 du 427 et sur le
modèle de `candyluge` : il fait autorité **à côté du code qu'il décrit**. Un chapitre qui
grossit à chaque zip n'a rien à faire dans le fichier qu'on relit avant de travailler sur
autre chose. On n'en garde ici que l'orientation ; les pièges qui valent pour TOUT le projet
restent en §4, et rien n'est recopié aux deux endroits.

**Ce qu'il faut savoir sans ouvrir le fichier :**

- **Carte 224×168**, graine fixe, **jamais persistée** — donc on peut tout refaire d'un bloc,
  sans migration.
- ⚠️ **L'ALTITUDE EST UNE PROPRIÉTÉ DE LA CASE** (`elev`), et **l'étage du tribunal se DÉDUIT
  de `y`**. Deux applications de la même idée : rien ne circule sur le réseau, rien à
  réconcilier.
- ⚠️ **UN RÉSIDENT A UNE ZONE, PAS DEUX POSITIONS** (`res.zone` + `res.x/y`). C'est la seule
  forme qui résiste au piège des deux cartes (§4).
- ⚠️⚠️ **LE 428 A INVERSÉ UNE DÉCISION DU 427** : les résidents ont un **vrai chemin**
  (`E.townFindPath`), pas un itinéraire d'escalier. Mesuré : **24 % → 100 %** d'arrivées, à
  coût réseau **strictement identique**. `townStairRoute` a été supprimée.
- **Ce qui n'est pas fait** : aucun service du tribunal, pas de coiffeur au salon, aucun PNJ
  n'habite la ville à demeure, pas d'intérieur de maison, vingt blocs de prairie nue, et le
  **marché / les commissions / les rendez-vous datés sont décidés mais pas construits**.

---

## 7. `candyluge` — en pause depuis le 425

**Toute sa dette est passée dans `public/candyluge/README.md` (zip 427), qui fait autorité :**
les 18 « choses à ne pas défaire », les 5 chantiers non faits (⚠️ le n°1, la luge qui dérive
seule, rend la descente impraticable sans le menu dev), le bonbon empoisonné à concevoir, et le
mur de chantier (⌘⇧X deux fois en moins de 3,5 s). Rien n'en est recopié ici : un jeu à
l'arrêt n'a pas à occuper le fichier qu'on relit pour travailler sur autre chose.

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

## 9. Blender — cinq pièges, et un endroit où il ne paie pas

BlenderMCP est installé (Blender 5.2 LTS) et **répond**. Deux pipelines : **A** vers `crystal`
(on modélise, on rend, on **transcrit en table de données** — jamais de PNG dans le jeu ;
ombrage plat pur, **aucun** anticrénelage, quantification LINÉAIRE, courbe `Standard`, lampes
Soleil) ; **B** vers les jeux three.js en glTF (`candyluge_props.py`, hors dépôt, export sans
matériaux, maillages `part_<clé>`, 200-900 triangles).

⚠️ **BLENDER EST Z-UP, THREE.JS Y-UP, ET L'EXPORTEUR CONVERTIT FIDÈLEMENT UNE ORIENTATION
FAUSSE** (`yup_authoring()`).
⚠️ **L'export glTF EXIGE un contexte** (`temp_override(…, area=VIEW_3D, region)`) **et de
désélectionner** — sinon échec au **deuxième** accessoire seulement.
⚠️ **L'échelle se DÉRIVE du gabarit** (`Models.fit`), jamais devinée dans l'appelant.
⚠️⚠️ **À 32 px, ce qu'on achète avec Blender est l'ÉCLAIRAGE, PAS LA GÉOMÉTRIE** — et cet
éclairage demande la même passe de calibrage que §8. Mesuré au 426 sur la statue de la Justice :
le pipeline fonctionne, mais après deux passes le rendu restait à **écart-type 24,6** contre
47,7 en référence. Le sprite dessiné à la main était meilleur. Compter plusieurs itérations, ou
dessiner à la main.
⚠️ **Tous les sprites de la ferme, de Valley Town et du tribunal sont des canevas procéduraux**
dans `fermeArt.js`. Y introduire un PNG créerait un troisième pipeline (chargement, cache,
palette hors-fichier) pour un seul bâtiment.

---

## 10. Vérification

⚠️ **`node` EST INSTALLÉ (v24, npm 11), `npm install` est fait.** On peut **bâtir et jouer**.

⚠️⚠️ **NE JAMAIS LANCER `npx next build` PENDANT QUE `npm run dev` TOURNE.** Les deux écrivent
dans le MÊME `.next/` : le navigateur reçoit des **404 sur les chunks**, la page se charge, le
HUD s'affiche, et le canevas reste vide — exactement comme si le rendu était cassé. Une
demi-session perdue au 426 sur un bogue qui n'existait pas. **Remède** : arrêter le serveur,
`rm -rf .next`, redémarrer.

**`npx next build`** compile tout : le contrôle le moins cher sur 19 000 lignes.
⚠️ L'avertissement `'G_SOIL' is not exported` est **PRÉEXISTANT**. ⚠️ **SANS `.env.local`, LE
BUILD S'ARRÊTE APRÈS LA COMPILATION** sur `Error: supabaseUrl is required` (pré-rendu de
`/login` et `/signup`) — ce n'est PAS une régression. **Ce qui compte est
`✓ Compiled successfully` juste avant.**

**Bancs `.mjs` — ce qui existe VRAIMENT** (§14.6) :
- **`tools/verify-vallee.mjs` — 137 contrôles, 137/137 (430 ; 113 au 427, 88 au 426).** Il
  importe le VRAI moteur : circulation, murs invisibles ET décors traversables, géométrie des
  bâtiments, rebords sautables, le tribunal pièce par pièce, la coupe de bois, les familles,
  la garde-robe.
  ⚠️⚠️ **DEPUIS LE 428 IL NE VÉRIFIE PLUS DES TABLES, IL REJOUE LE DÉPLACEMENT** — vrai
  suiveur, vraie boîte de collision, vraie règle de dénivelé, 60 images par seconde, sur
  **chaque endroit vers chaque autre** (~16 000 trajets). Le 427 contrôlait ici les
  « itinéraires d'escalier », qui étaient justes : il validait la seule chose qui marchait
  déjà, pendant que 79 % des trajets échouaient. **Aucune assertion sur une structure de
  données ne pouvait voir ça.** Il contrôle aussi la couverture des quartiers BÂTIS (la
  prairie non aménagée est comptée à part, pas ignorée) et la répartition des activités.
  ⚠️ Son seuil d'arrivées est à **100 %, délibérément** : à 24 % comme à 99 %, un seuil plus
  bas dirait OK. **Il a trouvé cinq défauts de navigation au 428**, dont deux — heuristique
  inconsistante, tas qui déborde — étaient parfaitement muets.
- **`tools/render-assise.mjs`** (428) — la pose assise **sur son banc**, debout/assis côte à
  côte, sur les huit tenues. Elle vivait dans la closure du rendu, donc personne ne l'avait
  jamais regardée : on a gardé trois zips un buste tronqué en croyant avoir une pose. ⚠️ Depuis
  le 429 il en dessine **trois** par banc : un occupant unique au milieu d'un meuble ne dit rien
  de ce à quoi ressemble un meuble PLEIN.
- **`tools/render-echelle.mjs`** (429) — **chaque décor à côté d'une fermière**, sur la même
  ligne de sol, avec le rapport de hauteur comparé au repère physique attendu. C'est le seul
  banc qui puisse attraper une erreur d'ÉCHELLE (voir §4). Il en a trouvé trois du premier coup.
- **`tools/render-tribunal.mjs`** — le mobilier, les décors de rue, les **bâtiments de la
  Haute-Ville** (sur du dallage, à côté de la gare : une cohérence se juge côte à côte) et **la
  garde-robe PORTÉE**. Il a montré la rangée d'étals monochrome (426), le haut-de-forme
  décapité et deux défauts de façade du salon (427).
- `verify-constants` · `verify-objects` · `verify-strings` · `verify-syntax` · `verify-gates` ·
  `verify-cycle` · `verify-orchards` · `verify-scope` · `verify-vergers` · `render-fruits`.
- ⚠️ **`verify-luge`, `verify-boot`, `preview-luge`, `preview.mjs`, `verify-perf` et
  `preview-fps` N'EXISTENT PAS** dans `tools/`.
- ⚠️ **Le faux canvas de `lib-canvas.mjs` IGNORE `translate`/`rotate` et ne connaît pas
  `fillText`** : les trois poses d'une feuille de personnage s'y superposent, et un sprite qui
  dépend d'une transformation s'y juge faux. Ce n'est pas un bogue du jeu — mais il faut le
  savoir avant d'aller corriger un dessin qui n'a rien.
  ⚠️⚠️ **ET IL N'IMPLÉMENTAIT `drawImage` QU'À TROIS ARGUMENTS jusqu'au 428**, en ignorant
  silencieusement le reste : toute découpe dans une feuille de sprite y dessinait la feuille
  ENTIÈRE. Pas d'erreur, une image plausible, un verdict faux — le stub menteur, **dans l'outil
  censé nous en protéger**. Corrigé (3, 5 et 9 arguments, plus proche voisin). **Un banc de
  rendu se vérifie aussi.**

**Jouer en local** — deux échafaudages TEMPORAIRES, **à supprimer après** :
1. un `.env.local` pointant sur un **faux Supabase** (un serveur HTTP qui répond `[]` sur
   `/rest/v1/*` suffit) ; sans lui on reste bloqué à l'écran « code de ferme » ;
2. une page jetable `app/<nom>/page.js` montant `<FermeGame room={{id}} me={{id,username}}
   players={[{profile_id, username, joined_at}]} isHost savedCode="XXXX" />`.
   ⚠️ **`players` EST OBLIGATOIRE** (`[...players]` plante sans lui). ⚠️ **Un dossier `app/`
   préfixé par `_` n'est PAS une route.** ⚠️ **La supprimer avant de livrer** : en production
   elle ouvre une ferme sans authentification.

Puis ⌘⇧X → menu développeur → **10 arrêts** (ferme, passage, Valley Town ×6 dont la
Haute-Ville, tribunal ×3) et **« Peupler la ferme »** (427), qui installe 6/12/20 résidents
d'un coup, **artisans nommés d'abord** — sans lui, la vie sociale de la ville n'est
observable qu'après une heure de jeu, donc jamais.

⚠️ **Automatisation du navigateur, ce qui marche et ce qui ne marche pas :**
`window.dispatchEvent(new KeyboardEvent("keydown", {code:"KeyE"}))` marche pour TOUTES les
touches ; les frappes envoyées par l'outil navigateur, elles, n'atteignent pas le jeu. Le menu
ouvert bloque les déplacements. La capture d'écran de l'outil **fonctionne** (au 426 elle
échouait) ; `canvas.toDataURL()` POSTé à un puits sur disque reste le repli.
⚠️⚠️ **UN ONGLET CACHÉ SUSPEND `requestAnimationFrame`, DONC TOUTE LA SIMULATION DE L'HÔTE.**
Rien ne bouge entre deux captures, et on conclut à tort que les PNJ sont bloqués. Repli pour
observer : remplacer `requestAnimationFrame` par un `setTimeout` quand `document.hidden`,
**puis fronter la fenêtre une fois** pour amorcer la première image.

**Session manuelle à 2 joueurs — seule vraie validation du multijoueur.**
⚠️ **Un stub qui « retombe sur une valeur raisonnable » ment mieux qu'un stub qui plante.**
**Quand un outil et le jeu divergent, croire le jeu.**

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
- **Le salon de coiffure** (427) : **qui coiffe, et comment ça marche ?** Le bâtiment,
  l'enseigne et la banderole « ouverture prochaine » sont posés ; il manque la décision.
- **Valley Town** : quels PNJ HABITENT la ville à demeure (les résidents ne font qu'y passer) ?
  achète-t-on une parcelle, et à quel guichet ?
  ⚠️ **Et la prairie : VINGT blocs de 28×28 de la carte sont de l'herbe nue** (mesuré au 428).
  Ce n'est plus une impression, c'est un chiffre. On n'y a délibérément posé AUCUN endroit de
  vie : des résidents qui vont contempler un champ vide, c'est du remplissage. La question
  n'est donc pas « comment les meubler » mais **« qu'est-ce qu'on construit là »**.
- ⚠️ **DEUX DES TROIS CHANTIERS DE JOUABILITÉ RESTENT À CONSTRUIRE.** Le marché est livré au
  430 (il fait exister l'économie, et son **jour de marché** hebdomadaire est déjà un
  rendez-vous daté). Restent :
  **1. les commissions** — le tableau des nouvelles distribue des demandes de la ville, qu'on
  remplit depuis la ferme, à deux, contre paiement. Elles s'appuient sur l'économie qui existe
  désormais ;
  **2. les rendez-vous datés** — concert au kiosque, foire : des événements au calendrier
  partagé qui rassemblent résidents ET joueurs au même endroit à la même heure. ⚠️ Le patron
  est déjà écrit deux fois (jour de marché, jour de service de Carla) : **une pure fonction du
  numéro de jour, jamais un état**.
- ⚠️⚠️ **LE TACTILE NE COUVRE QUE LA FERME, LA VILLE ET LE TRIBUNAL** (430). Les 21 autres jeux
  de la plateforme n'ont pas été audités au doigt. Certains ont déjà des `pointer*` (puzzle,
  naval, yahtzee), d'autres non — **personne ne sait lesquels**, et c'est exactement l'angle
  mort qui a laissé la ferme injouable pendant des années.
- **La garde-robe** (427) : les prix sont volontairement très hauts. À jouer pour savoir si
  « très cher » veut dire « on économise pour » ou « on n'y va jamais ».
- **`candyluge`** : voir `public/candyluge/README.md`, qui fait autorité. La décision qui
  manque est de CONCEPTION (le bonbon empoisonné), pas de technique.
- **Gels de PNJ chez l'invité** (359-365) : encore observés ? Vérification demandée depuis le
  419 — session réelle à 2, ferme peuplée, console de l'hôte ouverte. ⚠️⚠️ **C'EST LA PASSE LA
  PLUS URGENTE DE CE FICHIER.** Le 427 a doublé la population et ajouté une seconde carte
  peuplée ; le 428 fait circuler ces vingt résidents pour de bon (79 % de leurs trajets
  n'aboutissaient pas) et fait diffuser un champ de plus dans le paquet de position (l'assise).
  **Rien de tout ça n'a été vu à deux joueurs** — les bancs mesurent la simulation de l'hôte,
  pas ce que voit l'invité.
- **`crystal`** : le chapitre a **deux** segments jouables (`play run` et `play walk`).
  Retirer le second retire le seul endroit où l'on ramasse des éclats.
- ⚠️ **VERCEL NE DÉPLOIE PLUS AUTOMATIQUEMENT depuis le 425**, et **ce n'est pas le dépôt** :
  `origin/main` porte bien le commit, il n'y a ni `vercel.json` ni étape ignorée, et le projet
  compile. Le lien Git du projet est à vérifier côté tableau de bord. Un `vercel --prod` depuis
  le terminal **ne rétablit rien** : une livraison CLI n'est pas une livraison Git.

---

## 14. Comment maintenir ce fichier

1. **Remplacer, ne jamais empiler.** Ce fichier décrit le **présent**. Une information périmée
   se supprime, elle ne se date pas.
2. **200 lignes = passe d'élagage obligatoire. Ne pas relever le seuil.** L'élagage se fait
   AVANT d'ajouter. **Le 428 a exécuté l'ordre du 427 : §6 est parti dans
   `components/ferme/README.md`, et le fichier avait RÉTRÉCI pour la première fois (507 → 490) ; il est remonté à 534 depuis. **La scission de §4 n'est plus reportable.**
   ⚠️ **L'ORDRE DU PROCHAIN ZIP : §4 SE SCINDE À SON TOUR.** C'est devenu le plus gros chapitre
   (près de cent lignes), et il mélange deux choses qui n'ont rien à voir : les pièges de la
   FERME/VILLE, qui appartiennent à `components/ferme/README.md` comme le reste, et les pièges
   de JavaScript / three.js / canevas, qui sont les seuls réellement globaux. Ne garder ici que
   les seconds. **Ne PAS y toucher avant d'avoir vérifié que chaque piège déplacé est toujours
   vrai** — un piège périmé recopié ailleurs est pire qu'un piège supprimé.
   Historique : fait au 426 (insuffisant) et au 427 (profond : §7 est parti dans
   `public/candyluge/README.md`, §9 réduit à ses cinq pièges, §4 débarrassé de tout ce qu'un
   banc attrape).
3. **Critère d'inclusion** : « est-ce vrai à l'échelle du projet, et invérifiable en ouvrant
   un seul fichier ? » Sinon, ça va dans un commentaire de code. **L'histoire d'un défaut
   corrigé n'y a pas sa place — seule sa LEÇON, en §4.**
4. **Écrire pour un modèle fort.** Densité maximale, phrases courtes, tableaux.
5. **Dire ce qui n'est PAS fait**, avant le reste.
6. ⚠️ **NE JAMAIS AFFIRMER QU'UN OUTIL EXISTE SANS L'AVOIR LANCÉ.** Le 425 décrivait
   `verify-vallee.mjs` « 74 contrôles, 74/74 » : le fichier n'existait pas. Un banc imaginaire
   fait passer pour testé ce qui ne l'est pas — c'est le stub menteur du §10, appliqué à la
   documentation elle-même. **Tout chiffre de banc écrit ici a été obtenu en le lançant.**
