# CLAUDE.md — CONTEXTE ARCARDI

**Lis ce fichier en entier avant toute action. Puis arrête de lire et demande.**
Il remplace l'exploration du dépôt pour tout ce qui est global. Le README est un journal
chronologique inversé : c'est de l'**histoire**, pas de l'orientation.

État à jour du **zip 427**. Chantier actif : **Valley Town habitée** (§6) — 20 résidents,
séjours en ville, vie sociale, familles, la Maison Garfield et le salon de coiffure, la gare.
**`candyluge` et `crystal` sont EN PAUSE.**

⚠️⚠️ **LE FICHIER EST TOUJOURS TROP LONG, ET IL FAUT LE DIRE : 457 → 507 lignes** pour un
plafond de 200. L'élagage du 427 a bien eu lieu, et il a été profond : la dette de `candyluge`
est partie dans `public/candyluge/README.md` (§7 fait quatre lignes), §9 ne garde que ses cinq
pièges, §4 a perdu tout ce qu'un banc de `tools/` attrape désormais, et §6 a perdu l'histoire
du 425/426. Mais le chapitre « ville habitée » est un gros morceau de plus, et il annule le
gain. **Ce qui doit partir au prochain zip est écrit en §14.2, et ce n'est plus optionnel :
§6 doit se scinder** — la ville a maintenant assez de contenu pour mériter son propre fichier
à côté du code (`components/ferme/README.md`), sur le modèle exact de `candyluge`.

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
- ⚠️⚠️ **UN PNJ EN LIGNE DROITE NE TROUVERA JAMAIS UN ESCALIER** (427). Sa rôdaille glisse le
  long des obstacles ; face à une falaise, elle se colle au pied et abandonne. Aucune erreur,
  et le symptôme est « personne ne monte jamais en Haute-Ville », qui a tout l'air d'un choix.
  La parade n'est pas un A\* mais un ITINÉRAIRE dérivé de `TOWN_STAIRS`.
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
| `components/ferme/fermeEngine.js` | règles pures · `generateTownWorld()` · `generateCourtWorld()` · **`townSpots()`** |
| `components/ferme/fermeConstants.js` | réglages · **tous les `TOWN_*`, `COURT_*`, `WARDROBE_*`** |
| `components/ferme/fermeArt.js` | **tous** les sprites, en canevas procédural. Aucun PNG |
| `app/room/[code]/page.js` · `lib/gameSync.js` · `lib/realtimeQuota.js` | salon · synchro · quota |
| `public/candyluge/README.md` | **la dette et les 18 règles de la luge — autorité (427)** |
| `public/candyluge/js/` | `config.js` (tous les nombres) · `slope.js` (la piste) · `sled.js` · `world.js` |
| `public/vendor/three-r128/` | three.js r128 + GLTFLoader + EffectComposer, en local |

⚠️ **`scenes.js` contient 2 tableaux, `shots.js` en contient 7**, sur un `backdrop()` COMMUN.
**Lecture de `FermeGame.js` : étroit mais profond.** `grep` sur le symptôme, lire largement
autour, chercher les autres usages du symbole avant d'éditer.

---

## 6. Valley Town — état au 427

**Carte 224×168**, regénérée à graine fixe, **jamais persistée** — c'est ce qui autorise à
tout refaire d'un bloc, sans migration.

**Ce qui existe.** Cinq avenues est-ouest (`TOWN_ST_ROWS`) et quatre nord-sud
(`TOWN_ST_COLS`) · une place de 30×26 (fontaine, obélisque, parterres, **tableau des
nouvelles**) · **27 parcelles** en jardin clos de haie · un parc avec étang et **kiosque à
musique** · un verger · un **champ de foire** (10 étals, puits, caisses) · un **cimetière** ·
un **lac au sud** avec promenade et ponton · le **quartier des artisans** à l'est · la
**Haute-Ville** (terrasse à 1 unité) et son **belvédère** (2) · une **gare** (427).
**Cinq bâtiments civiques ou commerciaux** en canevas procédural : `TOWN_CHURCH`,
`TOWN_HALL`, `TOWN_COURT` (néoclassique, en Haute-Ville — il donne leur raison d'être aux
escaliers), et depuis le 427 `TOWN_BOUTIQUE` + `TOWN_SALON`, en Haute-Ville eux aussi
(« les hauteurs sont les belles adresses » — une boutique chic au ras de la rue n'est
qu'une échoppe de plus ; un panneau au pied des marches l'annonce).

**Le relief.** ⚠️ **L'ALTITUDE EST UNE PROPRIÉTÉ DE LA CASE, PAS DU PERSONNAGE** (tableau
`elev`). Une seule règle — « pas plus de `TOWN_STEP_MAX` d'un pas » — fait tenir les falaises
ET marcher les escaliers, sans aucun cas particulier. Le décalage à l'écran vaut
`elev × TOWN_ELEV_PX`, donc collision et dessin ne peuvent pas diverger. **Espace saute d'un
rebord**, jamais vers le haut. Rien de tout ça ne circule sur le réseau.

### Le tribunal, dedans (426)

**Trois niveaux, 17 pièces, une seule grille.** ⚠️⚠️ **LES ÉTAGES SONT EMPILÉS DANS LA MÊME
CARTE et le niveau se DÉDUIT de `y`** (`E.courtFloorOf`) : aucun champ à diffuser, aucun état
à réconcilier. Même raisonnement que l'altitude de la ville.
RDC : hall, salle d'audience, témoins, greffe, vestiaire, accueil, panneau d'affichage ·
Étage : juge, jury, bibliothèque, cadastre, permis, notaire, état civil · Sous-sol : archives,
scellés, 3 cellules, objets trouvés, chaufferie.
**Le plan est DÉDUIT DES USAGES à venir**, pas l'inverse. **Rien n'est opérationnel, et le jeu
le DIT** (plaque par porte, « bientôt » sur E, panneau récapitulatif). Un bâtiment muet passe
pour cassé.
⚠️ **UNE CAGE D'ESCALIER EST UN LIEU, PAS UN TRAJET** : `COURT_STAIRWELLS` relie deux niveaux
au même endroit, le sens se déduit des `alt`. Deux descriptions d'une même cage ne peuvent pas
rester d'accord.

### Couper du bois en ville (426)

Coupe **partagée ET sauvegardée** (`shared.townChop` dans le JSON de `ferme_saves` — **aucune
migration SQL**), **tous** les arbres coupables, **ça repousse**, seule la **hache** est
réactivée. Une entrée vaut `{hp}` ou `{r}` : le dictionnaire ne garde que les EXCEPTIONS.

### La ville habitée (427) — le chantier de ce zip

**`MAX_RESIDENTS` passe de 10 à 20**, et la seule question qui comptait était « combien de
`send()` en plus ? ». **Zéro** : tout ce qui bouge chez un résident passe par UN message
groupé par image depuis le 364, et la taille n'est pas facturée (§3). Le vrai coût est du CPU
chez l'hôte, et c'est le bon échange.

⚠️⚠️ **UN RÉSIDENT A UNE ZONE, PAS DEUX POSITIONS.** `res.zone` vaut `"farm"` ou `"town"` et
`res.x/res.y` sont ses coordonnées DANS CETTE ZONE. C'est la seule forme qui résiste au piège
du §4 : avec deux couples de coordonnées, il existe forcément un chemin de code qui lit le
mauvais. La zone voyage dans les messages qui partent déjà (`residentPaths`/`residentStops`
gagnent `z`), l'activité aussi (`a` sur l'arrêt — un résident qui s'assoit s'arrête, par
définition).

**Ce que fait un résident en ville** : il descend du train (6 en même temps au plus, séjour de
3 à 10 min, **il ne travaille pas pendant ce temps** — c'est le prix du voyage), il choisit un
endroit, il y va, il y fait quelque chose, il en change. Les ENDROITS sont **dérivés de la
carte** (`E.townSpots` lit `tw.props` et les constantes) : une table écrite à côté aurait tenu
jusqu'au premier banc déplacé. Le goût vient du métier (`TOWN_SKILL_TASTE`), pas d'une ligne
de code par personnage.

**L'architecture sociale** tient en une phrase : deux résidents qui se croisent se parlent, et
le TON vient de `RESIDENT_AFFINITIES` — la table qui existait depuis longtemps et que
personne ne voyait jamais. Le **tableau des nouvelles** de la place la rend enfin lisible (qui
est en ville, avec qui, qui ne se salue plus). ⚠️ L'hôte apparie, et lui seul.

**La famille** (`RESIDENT_FAMILY`, nouveaux personnages) : un invité accompagne parfois un
résident. ⚠️ **IL N'EST PAS UNE ENTITÉ** — sa position est DÉRIVÉE de celle du résident, comme
Leo derrière Carla depuis le 376 (`trailFollow`, généralisé au 427). Zéro message, aucune
collision propre, impossible de traverser un mur. Vingt résidents peuvent sortir accompagnés
sans coûter un octet.

**La Maison Garfield** (demande explicite) : Carla devient **recrutable** (`noStay` et
`chatOnly` sautent, `skill: "stylist"` avec `SKILL_BUILDING` à `null` — son lieu de travail
est en ville, pas un atelier de ferme), et sa boutique n'ouvre que si elle habite la vallée
— sinon la porte le DIT. On y achète chapeaux, écharpes, tenues et couleurs, très cher, et
Leo tient la caisse en approuvant tout. ⚠️ **TOUTE LA TENUE TIENT DANS UNE CHAÎNE** de cinq
caractères (`wardrobeLook`), qui sert à la fois de champ dans le paquet de position déjà
émis et de clé de cache de feuille de sprite. **Salon de coiffure** juste à côté, volontairement
inachevé et qui l'annonce (banderole, vitrines blanchies, échafaudage).

**La gare** : la ville réutilise `railL`/`railR`/`platform`/`station` **de la ferme, tels
quels**. Elle peignait ses rails à la main depuis le 234 — deux dessins de la même voie
ferrée, c'est-à-dire le doublon du §8.

**Ce qui reste à faire, et c'est assumé** : aucun service du tribunal ne fonctionne · le salon
n'a ni coiffeur ni mécanique · aucun PNJ n'habite la ville à demeure (les résidents la
VISITENT) · pas d'intérieur de maison · le sud-est reste en pelouse.

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
- **`tools/verify-vallee.mjs` — 113 contrôles, 113/113 (427 ; 88 au 426).** Il importe le VRAI
  moteur et parcourt la ville depuis la descente du train avec la règle de dénivelé du jeu :
  rues, portes, repères, **murs invisibles ET décors traversables**, géométrie des bâtiments,
  rebords sautables ; le tribunal pièce par pièce ; la coupe de bois (dont le contrôle qui
  compte est « ça ne mute pas la carte en cache ») ; et depuis le 427 **les endroits où l'on
  vit** (tous atteignables, chaque assise adossée à un vrai banc, aucun meuble devant une
  entrée), **les itinéraires d'escalier** (sans eux, « personne ne monte jamais » est
  silencieux), les familles et l'encodage de la garde-robe.
  **Il a trouvé six défauts au 426 et les 80 murs invisibles des trois bâtiments du 427**,
  avant qu'aucun ne parte en jeu.
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
- **Valley Town** (§6) : quels PNJ HABITENT la ville à demeure (les résidents ne font qu'y
  passer) ? que met-on dans le sud-est ? achète-t-on une parcelle, et à quel guichet ?
- **La garde-robe** (427) : les prix sont volontairement très hauts. À jouer pour savoir si
  « très cher » veut dire « on économise pour » ou « on n'y va jamais ».
- **`candyluge`** : voir `public/candyluge/README.md`, qui fait autorité. La décision qui
  manque est de CONCEPTION (le bonbon empoisonné), pas de technique.
- **Gels de PNJ chez l'invité** (359-365) : encore observés ? Vérification demandée depuis le
  419 — session réelle à 2, ferme peuplée, console de l'hôte ouverte. ⚠️ **Le 427 double la
  population et ajoute une seconde carte peuplée : c'est le moment de refaire cette passe.**
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
   AVANT d'ajouter. Fait au 426 (insuffisant) et au 427 (profond : §7 est parti dans
   `public/candyluge/README.md`, §9 réduit à ses cinq pièges, §4 débarrassé de tout ce qu'un
   banc attrape). Ça n'a toujours pas suffi. **L'ordre du prochain zip est décidé : §6 SE
   SCINDE** — Valley Town, le tribunal et la vie sociale partent dans
   `components/ferme/README.md`, à côté du code qu'ils décrivent, sur le modèle exact de
   `candyluge` ; il ne reste ici qu'un paragraphe d'orientation et les pièges de §4.
3. **Critère d'inclusion** : « est-ce vrai à l'échelle du projet, et invérifiable en ouvrant
   un seul fichier ? » Sinon, ça va dans un commentaire de code. **L'histoire d'un défaut
   corrigé n'y a pas sa place — seule sa LEÇON, en §4.**
4. **Écrire pour un modèle fort.** Densité maximale, phrases courtes, tableaux.
5. **Dire ce qui n'est PAS fait**, avant le reste.
6. ⚠️ **NE JAMAIS AFFIRMER QU'UN OUTIL EXISTE SANS L'AVOIR LANCÉ.** Le 425 décrivait
   `verify-vallee.mjs` « 74 contrôles, 74/74 » : le fichier n'existait pas. Un banc imaginaire
   fait passer pour testé ce qui ne l'est pas — c'est le stub menteur du §10, appliqué à la
   documentation elle-même. **Tout chiffre de banc écrit ici a été obtenu en le lançant.**
