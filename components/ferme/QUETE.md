# LA QUÊTE DE L'ÉTOILE — « LE BATEAU DES ÉTOILES » / « THE STAR BOAT »

## ⚠️⚠️⚠️ MASTER PROMPT 2026-09-02 — LA REINE NOURRIE-MARTELÉE, ET LA SEPTIÈME SŒUR AU LAC MALÉFIQUE

⚠️⚠️⚠️ **LES SEPT QUESTIONS DU §6 ONT ÉTÉ POSÉES ET TRANCHÉES AVEC GUILLAUME LE 2026-09-02, ET LE
LOT A EST LIVRÉ.** Les réponses sont inscrites dans le §6 lui-même, à la place des questions —
elles ne s'empilent pas, elles remplacent (§14.1 de `CLAUDE.md`). Le reste de ce document (lots B à
F) reste un ordre de mission : **rien n'en est implémenté**. **Lis-le en entier avant de toucher un
fichier**, comme le §2 de `CLAUDE.md` le demande pour tout changement important.

⚠️ **CE QUE LES RÉPONSES ONT CHANGÉ AU PLAN LUI-MÊME, ET C'EST STRUCTUREL** : le seuil de la
septième sœur est « reine apprivoisée **et six étoiles trouvées** », donc les sœurs **5 et 6
doivent exister AVANT** la partie B. Le découpage A → B → C du §5 ne le prévoyait pas ; il est
corrigé là-bas.

⚠️ **Ce chantier REMPLACE, sur le sort de la 7ᵉ sœur, ce que disent §17.6/§17.7/§17.7 bis
plus bas dans ce fichier** (la violette guidée par des feux dans le brouillard, pendant le voyage
d'Eduardo). Cette idée n'a jamais été codée — elle est remplacée sans perte par celle décrite ici,
plus concrète et plus incarnée. **Les sœurs 5 (verte, aux quais) et 6 (orange, chez Tristan) ne
sont PAS traitées par ce chantier** : leur conception (§17.5/§17.6) reste ce qu'il y a de plus
proche d'une cible, mais rien n'est tranché avec la même précision que ce qui suit. Voir §6.

### 1. Vue d'ensemble de ce qui change

Deux morceaux, indépendants l'un de l'autre mais backés par la même leçon (§4 de `CLAUDE.md` :
*chaque geste doit dire pourquoi il compte, même magiquement*) :

**A. La reine** (`STAR_SITES` → `crater`, verbe actuel `pair`) devient plus dure et plus juste
narrativement : on la NOURRIT (une ressource tirée de l'étoile bleue déjà apprivoisée), on la
MARTÈLE pour la réveiller (jusque-là verbe `pair` suffisait à lui seul — il devient la SECONDE
moitié du geste, pas plus le seul).

**B. Une septième étoile**, la dernière, se trouve **prisonnière du lac violet du monde
maléfique** — un lieu qui existe DÉJÀ dans le jeu (voir §4). Elle se sauve par une chaîne de gestes
neuve : indice de la reine → chevron vers le chaudron → protection de la canne → pêche difficile
(plusieurs poissons-squelettes avant l'étoile) → ramener à la rive → sortir du monde maléfique →
poser au sol côté ferme → réanimer par appuis répétés → elle rejoint la formation.

**Et la fin** : une fois toutes les étoiles réunies, se rendre à la jetée la nuit, une touche
envoie les sept lumières former la constellation dans le ciel. Fondu, overlay de victoire.

### 2. Partie A — la reine : nourrir, marteler, PUIS dos-à-dos

**Séquence, dans cet ordre** (Guillaume a tranché : nourrir → marteler → dos-à-dos, PAS l'inverse,
et PAS en remplacement l'un de l'autre) :

1. **Nourrir.** Il faut lui apporter **60 unités d'une ressource « lumière bleue »**, tirée de
   l'étoile bleue déjà apprivoisée (`farmStarBlue`, verbe `light`) — c'est elle qui rend la reine
   atteignable, le fil narratif que la conversation avec Guillaume visait explicitement (« les
   petites aident à atteindre la grande »). ⚠️ **NON TRANCHÉ** : comment cette ressource se
   produit — un geste actif du joueur auprès du compagnon bleu (à décider : quel geste, combien de
   temps), ou un flux passif qui s'accumule tant que la bleue est compagne ? Voir §6.
2. **Marteler.** Une fois nourrie, la reine peut être réveillée par un geste de martèlement/
   tapotement — appuis répétés en rythme, jouable au clavier ET au doigt sur tablette (Guillaume :
   « martèle étoile (ou tapoter sur iPad) »). ⚠️ **RÉUTILISER `BarnMinigame`**
   (`components/ferme/FermeGame.js:32865`), le patron d'« appuis répétés » déjà utilisé pour
   `starRaise` (le marteau qui hisse une pièce du navire sur la cale, zip 2026-09-01) — ne pas en
   écrire un second qui divergerait au premier réglage (§8 de `CLAUDE.md`).
3. **Dos-à-dos (ou épouvantail seul).** Le geste `pair` déjà écrit (`resolveStarCalm`, verbe
   `pair`) reste la conclusion : une fois réveillée, il faut encore la convaincre de se calmer. Ce
   n'est plus le seul geste de la reine, c'est le DERNIER étage d'une séquence à trois temps.

**La scène d'éveil — un VRAI morceau de 3D, dans l'esprit comique.** Guillaume : « une scène
d'éveil comique de l'étoile, qui passe de grisâtre et lente à jaune brillante et animée, avec des
yeux sur l'animation quand on a réussi à tapoter en rythme. » Elle se déclenche quand le martèlement
réussit (étape 2), avant le dos-à-dos.

- **Architecture** : un écran dédié plein cadre, sur le modèle de `MaireScene.js` /
  `ScierieScene.js` — jamais une animation posée dans le canevas 2D principal, les deux scènes 3D
  existantes du jeu suivent cette forme et rien d'autre. Camera fixe ou légèrement mobile (pas
  besoin de la liberté de `MaireScene`), le sujet est la créature, pas la pièce.
- **BlenderMCP est autorisé pour cette scène** (accord de Guillaume, 2026-09-02) — mais
  ⚠️⚠️⚠️ **LA LEÇON DU 481 EST NON NÉGOCIABLE** : le bureau du maire a été livré une fois en glTF
  exporté de Blender, jamais ouvert dans un canevas, et le maire flottait deux mètres derrière le
  mur pendant un zip entier — aucun banc du dépôt ne peut relire une DONNÉE importée. **Toute
  géométrie sortie de Blender doit être regardée** — soit rastérisée sans GPU sur le modèle de
  `tools/render-maire.mjs` (`tools/lib-3d.mjs`, three.js r128 vendorisé, AUCUNE dépendance npm),
  soit ouverte en vrai dans le navigateur — **avant** d'être déclarée livrée. Le maire et Tristan
  ont fini par être écrits en three.js procédural (`maireBureau.js`, `scierieAtelier.js`,
  `rig3d.js`) plutôt qu'importés : c'est la voie qui a marché deux fois, pas un hasard.
- **Le comique** vient du CONTRASTE : lenteur/couleur grise/immobilité qui bascule d'un coup en
  vivacité/jaune éclatant/regard qui s'ouvre — pas d'un gag ajouté par-dessus. Grisâtre → jaune
  n'est pas qu'une teinte, c'est un changement de matière (terne/mat → lumineux/qui pulse).
- ⚠️ **Un nouveau verbe implique une nouvelle entrée dans `STAR_VERBS`** (`quete.js:209`) et
  `verify-quete` refusera toute étoile dont le verbe n'y figure pas — c'est voulu, c'est le
  garde-fou qui a empêché un repli silencieux par le passé (voir le commentaire à côté de
  `starVerbOf`).

### 3. Partie B — la septième sœur, prisonnière du lac maléfique

**Le lac existe DÉJÀ.** `generateEvilWorld` (`fermeEngine.js:490-504`) pose un « grand lac violet
luisant » depuis 2026-07 (`lakeCx=47, lakeCy=30, lakeR=12`, `ground = C.G_WATER`), pour
l'ambiance. Personne n'y avait donné de fonction narrative — c'est exactement ce que cette quête
lui donne. ⚠️ **À FAIRE EN PREMIER, avant tout le reste** : sortir ces trois nombres en constantes
exportées (`EVIL_LAKE_X/Y/R` ou équivalent, dans `fermeConstants.js`) — aujourd'hui ils sont
recopiés en dur dans une seule fonction, mais la pêche, le placement de l'étoile et le chevron de
guidage vont tous les trois avoir besoin de savoir où est ce lac. Trois lectures d'un seul nombre
recopié à la main, c'est exactement le piège du §4 (« une même grandeur écrite à sept endroits »).

**La séquence complète, dans l'ordre où Guillaume l'a racontée :**

1. **Le déclencheur.** Une fois les autres étoiles réunies (nombre exact à confirmer, §6), la
   reine dit — en bulle, comme les autres compagnes (`trailFollow`, §3 pour la position dérivée) :
   *« La septième étoile a perdu presque toute son énergie. Elle est prisonnière d'un liquide qui
   la corrompt ; elle s'éteint. Trouve-la. »* Puis un overlay de mission prend le relais :
   « Objectif : trouver la septième étoile. » ⚠️ Réutiliser le patron d'overlay des fouilles
   (`STAR_DIG_RESULTS`, l'overlay à médaillon) pour la forme, pas le fond — c'est un overlay de
   MISSION, pas de résultat, donc un habillage différent, mais le même geste (s'affiche seul, se
   ferme seul).
2. **Le guidage.** Un chevron (`drawStarChevron`, `FermeGame.js:22305`, piloté par
   `STAR_GOAL_TARGET`/`starGoalCtx` dans `quete.js`) mène d'abord au passage vers le monde
   maléfique, puis, une fois dedans, au lac. ⚠️ `STAR_GOAL_TARGET` connaît déjà `"cauldron"` comme
   cible valide (`quete.js:1986`) — ajouter une cible `"evilLake"` (ou équivalent) est la même
   famille d'ajout, pas un nouveau mécanisme.
3. **La découverte.** On voit dépasser du lac une branche de l'étoile, terne, presque grise, qui
   se débat lentement. On s'approche : elle dit « Sauve-moi ». Quelques secondes après, la reine
   (toujours en bulle, à distance) explique qu'il faudra la canne à pêche.
4. **Le piège — la canne casse dans cette eau.** Utiliser la canne nue dans le lac maléfique la
   fait casser en **3 secondes** (un compteur qui s'arme au premier lancer, rend la canne inutilisable
   ensuite). C'est un **hazard NEUF** — l'eau maléfique n'endommage rien aujourd'hui dans le code
   (vérifié : aucune trace de dégât lié à `G_WATER` en zone `evil`). ⚠️ Traiter ce compteur comme
   tout minuteur de quête : dérivé d'un horodatage posé côté HÔTE au premier lancer, jamais compté
   en local (§3 de `CLAUDE.md`, « ne jamais comparer une horloge hôte à une horloge invité »).
5. **La protection.** La reine a l'idée : enduire la canne d'un liquide protecteur. Le chevron
   pointe vers le chaudron. La concoction y est **déjà prête** en arrivant (pas d'ingrédients à
   rassembler pour cette étape précise — Guillaume a été explicite). Un **E** à proximité du
   chaudron « enduit » la canne. ⚠️ Réutiliser le système de menu du chaudron déjà existant
   (`cauldronMenuOpenRef`, la même famille que la préparation du plat de l'étoile rose ou de
   l'Essence d'étoile de la blanche) plutôt qu'inventer un second geste « E près d'un objet ».
6. **La fenêtre protégée.** Pendant **10 minutes réelles**, la canne est protégée : un sprite avec
   une fine fumerolle glow **violet et noir** tout autour signale l'état (à dessiner —
   `fermeArt.js`, dans l'esprit des halos déjà utilisés ailleurs dans la quête, ex. la colonne de
   lumière du cratère). Icône d'état à prévoir dans la barre d'objet équipé, pas seulement sur le
   sprite en main.
7. **La pêche.** Retour au lac. ⚠️ **RÉUTILISER `FishMinigame`**
   (`FermeGame.js:32768`) et le déclencheur `startFishing()` (`FermeGame.js` ~9294) — la pêche est
   **déjà gated uniquement sur `ground === C.G_WATER`**, sans notion de zone : elle fonctionne DÉJÀ
   sur le lac maléfique sans rien changer au mécanisme de tirage/morsure/mini-jeu. Ce qui manque est
   une **table de prises dédiée à ce lac** (des « poissons-squelettes », 3 à 6 prises manquées/
   ratées avant de décrocher l'étoile — sprites neufs, sur le modèle de `C.FISH`/`C.SEA_CREATURES`
   déjà existants) et un dernier « poisson » spécial qui EST l'étoile.
8. **Ramener à la rive.** Une fois l'étoile ferrée, il faut une mécanique pour la ramener au bord
   — Guillaume l'a nommée sans la détailler. ⚠️ **NON TRANCHÉ**, voir §6 : le modèle le plus proche
   dans ce dépôt est la tension/l'inertie de `scierie.js` (une résistance qui répond à l'effort,
   jamais un simple minuteur) plutôt qu'un QTE plat.
9. **La sortir du monde maléfique.** Une fois à la rive, on la « attrape » (ramassage, comme un
   compagnon qu'on porte plutôt qu'un objet dans le sac — cohérent avec `trailFollow`, sauf
   qu'ici elle NE PEUT PAS suivre seule, voir point suivant) et on ressort par le passage
   (`EVIL_RETURN_PASSAGE`, déjà défini) jusqu'à la ferme.
10. **La réanimation.** Sur la ferme, on la pose au sol (elle n'a pas l'énergie de suivre toute
    seule). On la réanime par appuis répétés pendant environ **10 secondes** — ⚠️ **même patron que
    le martèlement de la reine (§2) et que `starRaise`** : un seul mini-jeu d'« appuis répétés »
    paramétré par durée/cadence, réutilisé trois fois plutôt que réécrit trois fois. Puis
    l'animation d'arrivée déjà existante pour toute étoile qui rejoint la formation
    (`starFollowerAdded`, l'animation « climb » citée dans le commentaire de `fermeConstants.js`).

### 4. Partie C — la finale : la jetée, la nuit, la constellation

Une fois toutes les étoiles réunies : overlay « Rends-toi à la jetée, à la tombée de la nuit ».
Une zone marquée au sol sur le ponton de Valley Town ; en l'atteignant de nuit, **Espace** envoie
les étoiles former la constellation — sept lumières qui tournoient et montent au ciel, fondu
enchaîné, puis overlay de victoire (texte à écrire, ton de fin de quête — pas un simple toast).

⚠️ **CE QUE CETTE PARTIE NE PEUT PAS FAIRE AUJOURD'HUI** : la constellation à sept points et le
ciel qui en dérive supposent SEPT étoiles réunies. Ce chantier n'en construit que CINQ au total
(les trois de la ferme + la reine, déjà là, + cette septième). **Les sœurs 5 et 6 (verte, orange)
restent à construire séparément** — voir §17.5/§17.6 plus bas pour leur direction de conception,
non retranchée par ce document. Deux issues possibles, à trancher avec Guillaume avant d'écrire la
partie C : (a) on retarde cette scène de fin tant que 5 et 6 n'existent pas, ou (b) on la construit
maintenant avec le compte réel de sœurs existantes et on ajuste le nombre de points de la
constellation le jour où 5 et 6 arrivent. **Ne pas inventer les sœurs 5 et 6 pour combler le
chiffre sept** — ce serait écrire une mécanique que personne n'a validée.

### 5. Découpage en lots — un changement visuel à la fois (règle du 424)

C'est un gros chantier ; il se livre en morceaux JUGEABLES séparément, jamais en un seul bloc :

⚠️⚠️ **LE DÉCOUPAGE A CHANGÉ APRÈS LES RÉPONSES DU §6, ET PAS POUR UNE RAISON DE CONFORT** : le
seuil de la septième sœur est « reine apprivoisée **et six étoiles trouvées** ». Les sœurs 5 et 6
ne sont donc plus « un chantier d'à côté qu'on fera peut-être » — elles sont sur le chemin critique,
entre A et C. Les livrer après aurait donné une partie B injouable, ce qu'aucun banc n'aurait dit.

| lot | contenu | ce qui se juge, isolément | état |
|---|---|---|---|
| A | La reine : nourrir (80 lumières) + réveiller au rythme | le geste en trois temps est-il clair, le réveil est-il agréable | ✅ **LIVRÉ 2026-09-02** |
| A2 | **Sœur n°6, la discrète** — chapeau + lunettes, entre place centrale et parc, E pour l'apprivoiser | la trouve-t-on sans indice explicite, le déguisement amuse-t-il | ❌ |
| A3 | **Sœur n°5** — simplifiée : la chercher, avec des indices | les indices suffisent-ils sans chevron | ❌ |
| B | La scène d'éveil 3D (procédurale ou Blender+vérifiée) | comique, lisibilité du changement gris→jaune, `render-*.mjs` avant tout jugement en jeu | ❌ |
| C | Le lac maléfique : constantes exportées, découverte, chevron, hazard de la canne | on trouve l'étoile, on comprend le danger, sans encore pouvoir la sauver | ❌ |
| D | La protection de la canne (chaudron) + la pêche (poissons-squelettes) | la pêche est difficile mais juste, le glow de protection se voit et se comprend | ❌ |
| E | Ramener à la rive — `FishMinigame` inchangé pour la prise, **puis un second jeu à touche répétée** — + sortie + réanimation | le sauvetage entier, de bout en bout, une fois | ❌ |
| F | La finale (jetée, constellation à sept points) | la fin de la quête | ❌ |

⚠️ **LA PARTIE C DU §4 EST DÉSORMAIS TRANCHÉE PAR LE SEUIL** : la constellation aura bien **sept**
points, puisque A2 et A3 amènent le compte à six avant la septième. L'alternative « on la construit
à cinq et on ajuste plus tard » tombe d'elle-même.

### 6. Les sept questions — TRANCHÉES AVEC GUILLAUME LE 2026-09-02

⚠️ **Ce ne sont plus des questions, ce sont des décisions.** Elles remplacent la liste d'origine
(§14.1 de `CLAUDE.md` : une information périmée se supprime, elle ne se date pas). Deux d'entre
elles ont changé le PLAN et pas seulement le contenu — c'est signalé.

1. **La « lumière bleue » = les bonbons de Temple Run, exactement comme pour la petite bleue.**
   *« Aller récolter les points sur le jeu temple run. Puis payer au point du cratère. persistance
   après fin de partie (mort ou offroad), 5 minutes. »* Aucune nouvelle production à écrire :
   `resolveStarCandy` alimente déjà un FLUX daté, et `STAR_CANDY_FRESH_MS` valait déjà 5 minutes.
   ✅ **LIVRÉ** (lot A).
2. **Le prix est 80**, pas 60. ⚠️ Le chiffre a été posé après avoir constaté que `STAR_CANDY_PRICE`
   valait **déjà 60** pour la petite bleue : deux « va chercher 60 choses » d'affilée auraient donné
   l'impression de refaire l'étape précédente. L'écart dit que c'est une autre étoile, plus chère.
   ✅ **LIVRÉ** — `STAR_QUEEN_PRICE`, lu par le seul `starOfferPrice`.
3. **Le martèlement : une mécanique NEUVE, sans gros overlay.** *« nouvelle mécanique à inventer, tu
   jugeras. faut pas cacher avec un overlay trop gros. »* ⚠️ **Les deux patrons d'appui du dépôt ont
   donc été ÉCARTÉS, et il faut savoir pourquoi avant d'être tenté de les reprendre** :
   `BarnMinigame` et `WolfBiteMinigame` sont tous les deux des **panneaux plein écran**
   (`ferme-fish-ov`) — ils cacheraient l'étoile à l'instant précis où elle passe du gris au jaune,
   c'est-à-dire la seule chose que ce geste a à montrer. (Au passage : `BarnMinigame` n'est de toute
   façon **pas** un martèlement, c'est un curseur qui balaie ; le vrai martèlement du dépôt est
   `WolfBiteMinigame`. Le §2 de ce document les confondait.) ✅ **LIVRÉ** — voir §2 bis ci-dessous.
4. **Seuil de la partie B : reine apprivoisée ET six étoiles trouvées.** ⚠️⚠️ **CETTE RÉPONSE CHANGE
   LE PLAN** : les sœurs 5 et 6 doivent exister avant la septième. Voir §5.
5. **Sœur n°6, « la discrète ».** *« elle se cache entre les pnj, tranquillement, parfois sur un
   banc, parfois circulant normalement : elle sera entre la place centrale, et le parc, elle pourra
   se mouvoir dans cet espace seulement. »* Mini chapeau, lunettes de soleil ; la reine oriente vers
   elle ; on l'apprivoise en pressant E. ❌ **NON CONSTRUITE.**
6. **Sœur n°5 : simplifiée elle aussi.** *« SIMPLIFIEE, IL FAUT JUSTE LA CHERCHER. mais avoir des
   indices sur où elle se trouve. on peut tout à fait trouver la 6 sur le chemin, bien sûr et faire
   la 5 après la 6. »* ⚠️ La chasse spatiale du §17.5 (triangle de bornes, reflet dans l'eau) n'est
   donc **pas** ce qu'on construit ; elle reste écrite si elle revient un jour. ❌ **NON CONSTRUITE.**
7. **« Ramener la 7ᵉ à la rive » : deux jeux, pas un.** *« le fish mini game doit être simple comme
   celui qu'on connait déjà. Mais quand on a enfin la prise sur l'étoile c'est un autre jeu qui se
   déclenche (on tire la canne par une action répétée sur la touche) invente une mécanique. »*
   ❌ **NON CONSTRUITE.**
8. **Coopération : naturelle, jamais une serrure.** *« la coop aidera naturellement puisque ça se
   passe sur evil world. L'autre joueur pourra retenir les ennemis pendant que le pêcheur sera
   protégé. »* Le second joueur n'a aucun geste dédié à inventer : c'est le MONDE qui rend sa
   présence utile. ⚠️ C'est la meilleure forme possible du §4 (« la coopération est une conséquence,
   pas une serrure ») — elle ne coûte ni message, ni état, ni barème. ❌ **NON CONSTRUITE.**

⚠️ **CE QUI RESTE OUVERT ET N'A PAS ÉTÉ POSÉ** : les poissons-squelettes donnent-ils quelque chose
(or, cosmétique, ou juste la déception comique), et combien de sprites distincts ? Question du lot D,
sans effet sur ce qui précède — à trancher le jour où le lot D s'ouvre.

### 2 bis. Le réveil au rythme — LIVRÉ (lot A, 2026-09-02)

**La mécanique, en une phrase : un anneau se contracte vers le trou, on frappe quand il traverse la
marque, et l'étoile passe du gris au jaune.** Il n'y a aucun panneau — l'interface EST le décor.

| grandeur | valeur | où |
|---|---:|---|
| battements à placer | 8 | `STAR_WAKE_HITS` |
| période du premier battement | 1 100 ms | `STAR_WAKE_PERIOD_MS` |
| ce qu'une réussite retire à la période | 45 ms | `STAR_WAKE_STEP_MS` |
| plancher | 700 ms | `STAR_WAKE_MIN_MS` |
| bande cible | 74 % → 96 % de la période | `STAR_WAKE_BAND_A/B` |
| battements sans appui avant effacement | 3 | `STAR_WAKE_IDLE_BEATS` |

⚠️⚠️ **CES SIX NOMBRES SONT DE CLAUDE, PAS DE GUILLAUME** (« tu jugeras ») : ils attendent une
séance de jeu, comme les trois nombres de la scierie (§13 de `CLAUDE.md`), et **aucun ne doit bouger
avant**. Mesuré par `verify-quete`, qui JOUE la mécanique : jeu parfait **5,7 s / 8 appuis** ; joueur
qui laisse passer un battement sur trois **8,4 s**, il gagne quand même ; **martèlement à 8, 12 et
20 appuis/s : 0 ou 1 battement placé en 30 secondes** — il ne gagne jamais.

⚠️⚠️⚠️ **TROIS CHOSES À NE PAS DÉFAIRE :**
1. **Un appui hors bande RETIRE un battement.** C'est la seule ligne qui empêche le martèlement de
   gagner, et sans elle tout le reste du banc reste vert (vérifié en la retirant : mash gagnant en
   6 s). C'est aussi ce que `s2.wakeHint` annonce avant qu'on essaie.
2. **La jauge, c'est la COULEUR de l'étoile** — il n'y a pas de barre. Une seconde grandeur dessinée
   serait une seconde réponse à « où en suis-je », donc une qui finirait par mentir (456).
3. **Le tempo accélère parce que c'est un cœur qui repart**, pas pour « monter la difficulté ». La
   difficulté est une conséquence de la fiction — la seule forme de réglage qui s'explique au joueur
   sans texte.

**Où ça vit** : les deux décisions pures (`starWakeAdvance`, `starWakeStrike`) sont dans `quete.js`
— sorties de `FermeGame.js` **pour que le banc puisse les jouer**, exactement comme `maire.js` et
`scierie.js`. `FermeGame.js` ne garde que ce qu'un banc ne peut pas jouer : le ref, la zone, la
distance au cratère, l'immobilité, l'envoi de la requête. Le dessin est `A.drawStarWakeRing`
(`fermeArt.js`), regardé par `render-etoile` (planche `tools/out/etoile-reveil.png`).

⚠️ **LA PLANCHE A CORRIGÉ TROIS DÉFAUTS QUE LA RELECTURE N'AVAIT PAS VUS** : à zéro battement il n'y
avait rien au milieu (le joueur pressait E et voyait un anneau vide autour d'un trou noir) ; la
marque et la couronne des battements tombaient à quatre pixels l'une de l'autre, donc on ne pouvait
pas distinguer sa CIBLE de son SCORE ; et les encoches posées sur le trait s'y noyaient. *Un motif
se juge assemblé.*

### 7. Definition of Done — l'exigence, précisée

Le ton demandé (« ingénieur ultra pointilleux, ne livre que wowed by the result ») se traduit en
choses VÉRIFIABLES, pas en une intention :

- **Jugé à l'écran, jamais au jugé** (§8 de `CLAUDE.md`) : toute nouvelle géométrie ou sprite
  regardé en jeu ET, quand c'est possible, rastérisé par un banc `render-*.mjs` avant d'être
  déclaré fini — jamais l'un sans l'autre pour un asset 3D neuf (leçon du 481).
- **Chaque bouton/touche testé, y compris son impossibilité de contournement** — sauf par le menu
  développeur (§10) : on ne peut pas pêcher l'étoile sans avoir protégé la canne, on ne peut pas
  réveiller la reine sans l'avoir nourrie, on ne peut pas déclencher la constellation sans être de
  nuit sur la zone marquée. Testé en essayant activement de tricher, pas en supposant que ça tient.
- **Tout minuteur de quête arbitré par l'hôte**, jamais comparé entre horloges (§3) — en particulier
  le compteur de casse de la canne (3 s) et la fenêtre de protection (10 min).
- **Multijoueur** : si une étape reste solo par décision (§6, point 4), vérifier qu'un second
  joueur n'est ni bloqué ni dupliqué en observant (bouton spectateur si la scène 3D le justifie,
  comme l'audience du maire).
- **Bancs étendus, jamais contournés** : `verify-quete` doit connaître le nouveau verbe et les
  nouvelles cibles de chevron (il refuse déjà tout verbe absent de `STAR_VERBS` — c'est voulu) ;
  si le lac maléfique gagne une zone de collision neuve, `verify-collision` doit la voir.
- **Commentaires denses et datés**, comme le reste du dépôt — le POURQUOI d'un choix, pas son
  histoire de conversation.
- **`QUETE.md`, `README.md` et `CLAUDE.md` mis à jour à la fin de CHAQUE LOT**, pas seulement à la
  toute fin du chantier — un lot qui grossit sans documentation est le défaut que ce fichier lui-
  même se reproche déjà ailleurs (§14 de `CLAUDE.md`).
- **Aucun commit/push** — ça reste à Guillaume (GitHub Desktop).

---

## ⚠️⚠️⚠️ AUTORITÉ DE CONCEPTION 2026-08-26 — UNE SOIRÉE, SEPT SŒURS, UN PORT

**Cette autorité décrit la CIBLE validée par Guillaume ; elle n'est pas encore le code livré.**
Le dossier complet est au §17. Elle tranche les quatre dettes qui structuraient la reprise :

1. **Cinq impacts ouvrent la quête.** Les trois autres tombent à des instants dérivés et
   pseudo-aléatoires **pendant les trois minutes qui suivent l'apprivoisement de la première
   étoile**. Ils contiennent les trois familiers shiny collectors et ne bloquent jamais le départ
   pour Valley Town.
2. **La constellation de la Brebis compte sept sœurs.** Les trois étoiles de la première vague et
   la reine en donnent quatre ; **les trois dernières se chassent plus tard**, pendant la remise en
   état du port et la construction du navire. La constellation dessinée aura donc sept points,
   jamais quatre ou cinq.
3. **La quête tient dans une soirée** : cible **55 à 65 minutes**, sans quatre horloges en série.
   Les délais qui restent tournent en parallèle d'occupations qui font avancer le monde et portent
   plusieurs jalons visibles.
4. **Le lac devient le port de Valley Town.** Le retournement révèle un ancien bassin portuaire et
   une route oubliée ; le navire d'Eduardo est le premier véhicule des futures explorations d'îles,
   pas un objet de fin qui disparaît sans fonction.

⚠️ **Conséquence sur le 480 bis actuel :** ses huit impacts fixes (trois vides, trois étoiles,
deux matières) sont un état transitoire. L'implémentation future devra garder cinq sites dans la
chute d'ouverture — trois étoiles, une matière, un vide — et convertir les trois sites restants en
chutes différées `pet`. Cette passe ne construit ni cette chronologie, ni les familiers, ni le port.

## ⚠️⚠️⚠️ AUTORITÉ 480 BIS — HUIT IMPACTS, MAIS PAS LES FAMILIERS SHINY

**État réellement livré : huit impacts fixes tombent dans la scène d'ouverture**, sur les
deux rives : trois étoiles (`light`, `warm`, `lure`), deux matières et trois cratères vides.
Cette ligne remplace les comptes « cinq impacts / deux vides » encore présents dans les
autorités historiques 465 et 469 ci-dessous.

⚠️ **Ce n'est qu'une réalisation partielle de la demande des trois chutes supplémentaires.**
La fenêtre cible de trois minutes après la première étoile, le contenu `pet` et les trois
familiers collectors shiny ne sont pas construits. Les trois sites ajoutés au 480 bis ont été
intégrés à la chute initiale et donnent un vide, une étoile blanche et une seconde matière.
Il ne faut donc jamais présenter le point 15.2 comme livré en entier.

## ⚠️⚠️⚠️ AUTORITÉ 469 — LE DÉCHANT EST FAIT. TROIS CHAPITRES, ET ON FOUILLE.

**Décision de Guillaume, et elle est structurante : la quête est SIMPLIFIÉE.** Ce qui
suit remplace l'autorité 465 sur tous les points où les deux se contredisent.

### Ce qui a été RETIRÉ du code (pas seulement déclaré obsolète)

| ce qui part | ce qu'il en reste |
|---|---|
| le duo orgue/beffroi (`STAR_DUET_*`, mini-jeu 6, la scène du retournement) | rien — le lieu (beffroi, orgue, grande cloche) reste dans le monde, il sort de la QUÊTE |
| la plongée du lac (`STAR_DIVE_*`, `STAR_POOL_*`, `lakeShard`) | rien — le ponton et le lac restent |
| la verrerie et la pie (`STAR_RACK_*`, `STAR_MAGPIE_*`, `beadShard`, `nestShard`) | rien — le four, le râtelier et l'arbre au nid restent posés |
| le beffroi et la cloche comme LIEUX (`belfry`, `song`) | rien |
| les croisements d'ombres (`STAR_LEAN_*`, `resolveStarLean`, `leanLake`, `leanGlass`) | rien |
| les chapitres `water`, `thief`, `note` | `field`, `crater`, `build` |
| les champs d'état `lean`, `marks`, `duet` | `dug` les remplace en nombre |

⚠️ **Le mini-jeu de REFROIDISSEMENT (`cool`) reste**, et c'est le seul : il n'a jamais eu
de rapport avec le chant. C'est celui de la **plaque météorique**, troisième cratère de la
ferme, et il est désormais la seule chose qu'une fouille puisse ouvrir.

### La trame, en trois lignes

**Huit impacts à la ferme → on les FOUILLE → le grand impact de Valley Town → l'étoile
reine → le chantier naval (mairie, puis Tristan) → le navire part.**

### ⚠️⚠️ LA FOUILLE — LA MÉCANIQUE NEUVE DU 469

**Demande de Guillaume, mot pour mot :** *« ajoutons à la mécanique de fouille une action
sur les cratères : fouiller (déclenchable avec un bouton, et activant une petite animation
du perso qui gratte le sol pendant 3 secondes). Au bout de l'animation, un overlay nous
indique si on a trouvé quelque chose ou non. Et s'il y a quelque chose alors on peut
commencer le travail d'apprivoisement de l'étoile si c'est une étoile ou le mini jeu si
c'est un matériau. »* Et, sur les cratères vides : *« il faut effectivement que certains
cratères ne donnent rien pour que la chasse soit intéressante. »*

⚠️⚠️⚠️ **CE QU'ELLE RÉPARE EST PLUS GRAND QUE L'ANIMATION : jusqu'au 469, le jeu DISAIT
LE CONTENU D'UN CRATÈRE AVANT QU'ON L'OUVRE.** Trois fuites, toutes fermées, et il fallait
fermer les trois — c'est le défaut du 448 (*le décor, l'enfoncement et l'interaction sont
trois portes sur le même trou*) dans sa quatrième occurrence :
1. **l'invite** : « ⌨ E : apprivoiser » sur une étoile, « ⌨ E : la matière noire » sur la
   plaque, « ⌨ E : fouiller » sur les vides — les deux vides se reconnaissaient de loin ;
2. **le dessin** : la petite étoile apeurée se peignait au fond du trou dès l'impact ;
3. **la posture** : la jauge d'apprivoisement et sa bulle s'armaient sur un cratère intact.
*Un échec qui s'annonce n'est pas un échec, c'est une étiquette.*

**Le geste :** trois secondes (`STAR_DIG_MS`), immobile (`STAR_DIG_MOVE_TILES` = 0,6 case),
une jauge en anneau au-dessus de la tête, une pose accroupie qui gratte à huit images par
seconde, de la terre qui sort du trou au rythme des mains, un tas qui grandit. Puis un
overlay : un médaillon dessiné, un titre, ce qu'on a trouvé, ce qu'il faut faire, et
combien de cratères restent. Il se ferme tout seul.

**Ce qu'il donne, par contenu :** `empty` → le lieu est TROUVÉ dans le même geste (sinon le
pisteur le réclamerait pour toujours) · `material` → fouillé seulement, le morceau se gagne
au mini-jeu · `star` → fouillé seulement, l'apprivoisement reste entier derrière.

⚠️ **Arbitré par l'hôte** (`resolveStarDig`), idempotent, **zéro message supplémentaire** :
`star` voyage déjà dans l'`apply`. Le chat annonce qu'un trou est retourné et combien il en
reste — **jamais ce qu'il y avait dedans.**

### ⚠️⚠️⚠️ LE BLOCAGE D'APPRIVOISEMENT — SIGNALÉ, REPRODUIT, CORRIGÉ, REJOUÉ

**Guillaume :** *« l'apprivoisement de l'étoile bleue bloque… au bout de la jauge, l'étoile
ne bouge pas. »* Il avait raison, c'était général (les trois étoiles), et **quatre cent
quarante-sept contrôles étaient verts par-dessus.**

> **Une troncature de sécurité qui fait tomber deux clés DISTINCTES sur la même ne protège
> rien : elle corrompt.**

`migrateStar` coupait les clés de `calm` à **40 signes**. La tenue en écrit DEUX par joueur
et par lieu — `farmStarBlue:<id>` (la dernière marque) et `farmStarBlue:<id>:t0` (le début
de la tenue) — et l'identifiant est un `profile_id` Supabase, donc un **UUID de 36 signes**.
13 + 36 = 49 et 52 : **les deux tombaient sur la même clé de 40**. L'hôte re-migre l'état à
**chaque requête**, deux fois par seconde pendant toute la tenue ; à chaque migration `t0`
écrasait la dernière marque, `mine = now − t0` retombait à zéro, **pour toujours**.

⚠️ **Et le symptôme était le pire possible** : la jauge du client compte en LOCAL
(`starCalmT0Ref`). Elle se remplissait normalement, jusqu'au bout, devant une étoile qui ne
sortirait jamais. *Une barre qui promet et ment.*

⚠️⚠️ **POURQUOI AUCUN BANC NE POUVAIT LE VOIR — ET C'EST UNE FORME NEUVE DU DÉFAUT DE
BANC.** Il en fallait DEUX pour reproduire, et le banc n'avait ni l'un ni l'autre :
- il jouait `resolveStarCalm` avec `"j1"` comme identifiant ; le jeu passe un UUID ;
- il gardait le même objet d'état d'un bout à l'autre ; l'hôte le re-migre à chaque requête.

> **Un banc qui invente ses identifiants mesure un jeu que personne ne joue.**

`verify-quete` balaie maintenant les DEUX longueurs d'identifiant et re-migre entre chaque
tick, comme on balaie les deux valeurs d'un drapeau solo depuis le 458.

### La charpente : ce qui a été touché, et ce qui ne l'a pas été

⚠️ **Quatre des cinq morceaux du navire n'ont plus de lieu** (`SHIP_SITE_OF` : `rudder`,
`mast`, `sail`, `bell` → `null`). Ils venaient des chapitres supprimés ; les laisser
pointer vers des lieux morts aurait rendu le navire **impossible à finir en silence** — la
cascade du 468, à l'identique. Ils ne dépendent plus que du bois de Tristan, qui existe et
qui marche depuis le 454. **La coque garde son lieu** : la plaque météorique est la seule
pièce qu'on RAMASSE, et `render-navire` a un contrôle qui l'exige.

⚠️⚠️ **CE N'EST PAS LA CHARPENTE DÉFINITIVE, c'est le pansement qui garde la quête
finissable.** Ce qui manque est la FICTION — d'où vient la voile, d'où vient la cloche.
Voir la liste de reprise §15.


---

## ⚠️ AUTORITÉ 465 — CINQ IMPACTS, PUIS UNE CONSTELLATION AUTOUR DES JOUEURS

La fiction de référence est désormais : **retrouver et apprivoiser sept petites
étoiles colorées**, puis rendre visible dans le ciel la constellation fictive de
**la Brebis**. Tout ce qui, plus bas dans ce document, repose sur un chant, des
notes ou une lyre est **obsolète** et devra être remplacé ou retiré lors des
missions suivantes. Le mini-jeu de plongée est lui aussi classé à couper ou à
refondre entièrement ; sa présence historique ne vaut plus validation.
Au 465, les textes effectivement montrés au joueur ont déjà cessé de parler de
chant, de notes et de phrases musicales : ils nomment des pièces manquantes, des
signaux lumineux et des séquences. Les clés internes historiques (`note`, `song`,
`duet`) restent seulement pour la compatibilité de l'état et du code archivé.

### Mission 1 livrée — les cinq impacts de la ferme

- L'ouverture filme **un premier impact**, revient au fermier, attend exactement
  **10 secondes**, puis filme **deux impacts enchaînés** sans retour intermédiaire.
  Deux secousses, quelques secondes plus tard et espacées entre elles, signalent
  les sites 4 et 5 sans reprendre la caméra.
- La mise en scène nomme les **cinq sites prédits par l'Agence nationale
  d'astronomie**. Les trois objets filmés sont de petits cailloux sombres,
  incandescents, instables et tournoyant vite — jamais la boule de feu du gros
  météore de Valley Town.
- Le chapitre 1 demande de fouiller **cinq mini-cratères fumants**, répartis sur
  toute la ferme, dont **deux à l'est de la rivière**, et tous indiqués sur la
  carte. Le bandeau, ses cinq pastilles et le guide suivent le prochain impact.
- Le placement refuse les constructions, les cultures et tous les sols labourés
  ou aménagés. Il peut retenir arbres, souches et rochers : ils sont détruits au
  contact, diffusés et persistés comme les autres modifications de tuiles.
- Répartition canonique : **deux étoiles** (bleue et rose), **une plaque de
  matière météorique**, **deux cratères vides**. Les deux vides ferment seulement
  une piste et ne donnent rien.
- La plaque a absorbé le choc sans le transmettre au sol. Associée au bois de
  Tristan, elle justifie la future coque ; à ce moment, le joueur ignore encore
  pourquoi il la conserve.
- L'apprivoisement conserve la posture existante : immobile, dos tourné. Il faut
  **60 secondes seul** ou **10 secondes dès qu'au moins deux joueurs sont dans la
  même zone**. Cette règle vaut aux deux petites étoiles et à l'étoile de ville.
  Le correctif 462 fait porter à chaque demande la pose exacte qui a alimenté la
  jauge ; l'hôte redérive cible, distance et orientation depuis cette pose, ce qui
  empêche le refus final causé auparavant par la position réseau interpolée.
- **Toute étoile apprivoisée suit désormais son joueur autour de lui**, comme
  les familiers, et reste présente après la fin de la quête. Les deux étoiles de
  ferme gardent leurs couleurs bleue et rose. La table `STAR_SITES` est la seule
  source de cette formation : toute future entrée `content:"star"` la rejoint
  automatiquement, sans seconde liste à maintenir.
- Quand la jauge atteint son terme, **l'étoile qui vient d'être apprivoisée joue
  d'abord l'arrivée prévue** : elle grimpe depuis le centre du cratère, tourne,
  puis se pose auprès du joueur avant de rejoindre la formation. Cette transition
  vaut aux deux petites étoiles comme à la reine ; elle est attachée à l'identité
  de la nouvelle compagne, pas au seul cratère de ville.
- Le temps de cette arrivée est du **temps visible** : il se met en pause derrière
  tout panneau, carte ou transition, et ces interfaces attendent à leur tour la
  fin de l'arrivée. Sa base interpole réellement du centre du cratère au joueur ;
  elle n'est plus un simple décalage dessiné autour de celui-ci. Testé dans le
  navigateur avec deux petites étoiles et avec la jauge solo de 60 s de la reine.
- Après les cinq sites, aucune mission ne force le train. Le guide dit seulement
  de continuer l'enquête et qu'une mission non précisée attend à Valley Town.
- Le gros météore tombe après **deux minutes continues d'activité à Valley Town**.
  Activité signifie : joueur dans la zone, aucun panneau bloquant ni menu
  développeur, mouvement ou action dans les 15 dernières secondes. Une période
  AFK remet le compteur à zéro. Cette seconde chute ouvre le cratère, l'étoile
  reine et la suite historique (ingénieur, constructions, etc.).
- L'étoile du grand cratère est désormais **l'étoile reine** : jaune, nettement
  plus grande et plus lumineuse que les autres. Après son apprivoisement, elle
  révèle le navire brisé et devient **la seule guide** : la touche G la détache
  de la constellation et la place en tête ; aucun familier ne porte plus ce rôle.
- Sa grande taille vient d'une famille de sprites **28×28 native**, avec davantage
  de matière et de détails de visage, et non du 18×18 des petites agrandi à ×1,58.
- Les bulles d'aide ne restent plus comme des panneaux au-dessus de la formation :
  elles restent lisibles, fondent en 900 ms, puis reviennent au survol d'une étoile.
  La même règle vaut au texte de posture près d'une étoile encore au cratère ; la
  jauge demeure visible pendant toute la tenue. Un même objectif ne relance pas
  sa bulle à chaque expiration.
- L'impact des fragments de ferme n'est plus le grand ovale lumineux hérité du
  météore de ville. Il a un point de compression bref, une couronne de terre
  rompue, des mottes en trajectoires paraboliques, une colonne de poussière et
  des braises. Son gros pixel est celui du monde et ses quatre âges sont visibles
  et mesurés sur la planche de comète.
- Les sauvegardes antérieures restent jouables : l'ancien `furrow` migre vers
  `farmMaterial`, et une partie déjà passée au chapitre 2 ne revient pas en
  arrière.

### ⚠️⚠️⚠️ 468 — L'ARRIVÉE NE PEUT PLUS SE FIGER, ET ELLE NE RETIENT PLUS LA QUÊTE

**Défaut signalé par Guillaume, reproduit dans le vrai jeu, corrigé, puis rejoué.** Ce qui suit
est la LEÇON ; le détail vit dans le bloc de `starJoinStale` (`quete.js`) et dans les trois
commentaires 468 de `FermeGame.js`.

> **Une horloge de mise en scène qui ne compte que du temps VISIBLE doit être bornée en temps
> RÉEL. Sinon elle se fige le jour où sa condition de visibilité devient inatteignable — et tout
> ce qui attendait « la fin de l'animation » attend alors pour toujours.**

L'arrivée (`climb → spin → settle`, 2,6 s) n'avançait que si le joueur se trouvait dans la zone de
son cratère. Or **l'origine ne change jamais de carte** : prendre le train pendant ces 2,6 s
figeait l'horloge définitivement — mesuré à **1294 ms sur 2600**, pendant plus de trois minutes.
La cascade n'était visible d'aucun banc :

    starJoinActive reste vrai → starSceneCanPlay refuse TOUTE scène
      → la chute de Valley Town n'est jamais JOUÉE → starImpactLandedNow reste faux
      → starTameTarget rend null → **l'étoile reine est inapprivoisable**

…pendant que le bandeau disait « Le cratère a refroidi. Descends : quelque chose se cache au
fond. » ⚠️ *Le pire symptôme possible : le jeu invite à faire un geste qu'il refuse ensuite en
silence.*

**Les trois réparations, toutes rejouées à l'écran :**
- **un changement de carte ACHÈVE l'arrivée** au lieu de la suspendre — la montée part d'un trou
  qui n'est plus à l'écran, la rejouer n'aurait aucun sens ;
- **`starJoinStale` la périme** au bout de `STAR_JOIN_MS + STAR_JOIN_GRACE_MS` (20 s) de temps
  réel. On préfère rater une animation que personne ne regardait à bloquer une quête que tout le
  monde attend — c'est le repli qui ACCEPTE du §4 de `CLAUDE.md`, appliqué au temps ;
- **`starWatch` ne consomme plus sa liste d'un bloc.** Deux étoiles ajoutées dans la même image
  (le menu dev le fait à chaque « boucler ce chapitre ») n'en jouaient qu'UNE ; la seconde
  surgissait dans la formation sans sa montée. Vérifié après correctif : `farmStarBlue` 0 → 2600,
  **puis** `farmStarRose` 0 → 2600.

⚠️⚠️ **ET LE PREMIER JET DU CORRECTIF S'EST MORDU LA QUEUE — SEUL L'ÉCRAN L'A MONTRÉ.**
`starJoinActive` servait de garde d'armement, or sa seconde branche (465) est vraie **dès l'ajout
de l'étoile**, avant tout armement : l'armement était donc reporté à l'infini et plus aucune
étoile ne montait de son cratère (`join.id = null`, `elapsed = 0`, `actif = true`, pour toujours).
*Une fonction qui répond à deux questions finit par répondre à la mauvaise.* D'où `starJoinBusy`
(« une arrivée joue-t-elle en ce moment ? », lit le ref seul) à côté de `starJoinActive`
(« faut-il retarder une carte ou une scène ? », qui ajoute la frame atomique).

⚠️ **LE BANC A APPRIS LA GRANDEUR QUI MANQUAIT.** Les onze contrôles de l'arrivée balayaient la
courbe ms par ms et étaient **tous verts** pendant que son horloge pouvait être éternelle : ils
mesuraient ce que l'animation EST, jamais **combien de temps elle a le droit d'attendre**.
`verify-quete` passe de 482 à **488/488**, et les six nouveaux échouent quand on rend la grâce
infinie ou trop courte (vérifié par mutation, dans les deux sens).

Le code de référence est `STAR_FARM_IMPACTS` et la chronologie
`STAR_FARM_IMPACT_MS` dans `quete.js`. Les positions partent de
`STAR_FARM_IMPACT_ANCHORS`. `verify-quete.mjs` contrôle distribution 2/1/2,
deux sites à l'est, rythme 1+2+2, déclenchement de ville et handshake de jauge.
`render-etoile.mjs` mesure le fragment sombre/incandescent, sa rotation conservée
sur une trajectoire régulière, et son impact physique séparément de la grosse
comète. Il mesure aussi la densité native de la reine. `verify-quete.mjs` contrôle
la formation, l'identité et les extrémités exactes de la nouvelle arrivée, le
fondu/survol des bulles, la reine unique et le transfert du guide depuis les familiers.

---

## ARCHIVE DE CONCEPTION 444–460

Les sections suivantes décrivent encore les chapitres historiques et servent à
comprendre le code restant. Elles ne priment jamais sur l'autorité 465 ci-dessus.

**Document de conception, ouvert au zip 444, RELU CONTRE LE CODE AU 452, PUIS AU 453, ÉTENDU AU
454.** Écrit sur disque exprès (consigne de reprise) : si la session est interrompue, tout est ici,
y compris l'**état d'avancement** (§10).

⚠️⚠️⚠️ **ZIP 454 — LA QUÊTE A UNE PORTE D'ENTRÉE, UN CHANTIER NAVAL, ET UN MÉTIER.** Demande de
Guillaume, en quatre points, tous livrés :
1. **La chute ne tombe plus sur n'importe quelle ferme** : il faut **Eduardo ET Tristan actifs**,
   plus **quatre artisans** (`starFallGate`). *« ce patch est logique : eduardo prend le bateau à
   la fin de la quête et tristan y travaille. »* — et il répare une incohérence du 450 : la fin
   faisait partir avec le navire un personnage dont rien ne garantissait la présence.
2. **Le fantôme du bateau ne s'affiche plus gratuitement.** Il fallait des PLANS : l'étoile, à
   peine sortie du cratère, envoie demander un **architecte naval** à la mairie ; **Célestin
   Kerguélen** arrive en trois minutes contre **24 000 or, 60 récoltes et 12 poissons**, travaille
   **quinze minutes réelles** sur la grève, et rend ses plans. **P** déplie le plan ; **au bord du
   lac, il fait apparaître le bateau entier en fantôme sur sa cale.**
3. **Le bois est un travail, pas une trouvaille.** Un morceau ne se pose sur la cale que si
   l'étoile s'en souvient **ET** que Tristan a livré la pièce : cinq commandes, dans l'ordre du
   plan, payées en bois, chacune quelques minutes de sciage. La résolution finale attend le
   dernier bordage.
4. **Le sillon a déménagé et il a une physique.** Il tombait à quatre cases du puits, au milieu
   des potagers, et c'était une bande de terre PLATE qu'on traversait comme de l'herbe. Il tombe
   maintenant **au nord, loin de tout**, et il est décrit comme le cratère : une hauteur, une
   pente, un éclairage, un bourrelet fibreux, des fissures, **et un enfoncement sous les pieds**.
5. **La comète tombe trois fois moins vite**, sauf à l'absolue fin où elle reprend sa vitesse.

⚠️⚠️ **ET LE 454 A PAYÉ UNE SEPTIÈME FORME DU DÉFAUT DE BANC, QUI MÉRITE SON NOM : UNE GRANDEUR
JUSTE, MESURÉE SUR UN INTERVALLE QUE LE JOUEUR NE REGARDE PAS.** Le premier réglage du
ralentissement était vert sur les deux contrôles (⅓ de vitesse pendant la phase lourde, vitesse
d'origine au contact) et **ne changeait rien à l'écran** : la comète naît à 1,3 diagonale et
n'entre dans le cadre qu'aux derniers 22 % de sa course, très exactement la portion que la reprise
de vitesse couvrait. On ralentissait une comète invisible. Le banc mesure désormais la **durée de
la partie VISIBLE** (×2,25), et les deux nombres de la perspective sont sortis de la closure de la
boucle de rendu pour qu'il puisse la calculer.

⚠️⚠️⚠️ **LE 453 A TROUVÉ, EN CHERCHANT AUTRE CHOSE, LE PLUS GROS DÉFAUT DE TOUT LE CHANTIER : 41
DES 136 PHRASES DE LA QUÊTE N'ÉTAIENT AFFICHÉES PAR AUCUN CHEMIN DE CODE.** Parmi elles : **la
rencontre avec l'étoile** — c'est-à-dire la seule phrase de toute la quête qui dit ce qu'on fait et
pourquoi (§5, étape 2) — **les quatre phrases de la cloche**, qui sont la réponse au retournement,
**le don**, **deux des cinq traces**, et **`fall.quiet`**, que ce document appelle lui-même la
meilleure page du chantier. Elles étaient écrites, traduites au 451, relues au 452, **citées mot
pour mot dans les pages qui suivent** — et un joueur ne pouvait en lire aucune.
⚠️ **La leçon est le pendant exact de celle du 448** (*une constante que seul le banc lit est
débranchée*) : **une chaîne que personne n'affiche a l'air juste et ne peut pas échouer.** Les 41
sont branchées, et `verify-quete` compte désormais les lecteurs de chaque phrase.
⚠️ **Et ça explique le reste du 453** : quand personne ne lit un texte, plus rien ne le corrige. Les
trois comptes de morceaux qui se contredisaient vivaient dans des phrases dont deux sur trois ne
s'affichaient jamais.

⚠️⚠️⚠️ **CE DOCUMENT A DÉCRIT L'HISTOIRE D'AVANT PENDANT UN ZIP ENTIER, ET C'EST LA LEÇON QUI
OUVRE LE FICHIER.** Le 450-451 a remplacé la fiction motrice — **une lyre à qui il manque une
corde** est devenue **un bateau qu'on rebâtit** — et ce document, qui est le document de REPRISE
de la quête, a continué de raconter la lyre au §1, au §2, au §5 et au §6. *Un document de reprise
qui décrit l'histoire d'avant est pire qu'un document manquant : on ne s'en méfie pas.* La règle
qui en sort, et elle vaut pour tous les documents du dépôt : **quand la FICTION change, le
document qui la porte fait partie de la livraison, au même titre que les chaînes.**

⚠️ **Le texte du jeu est BILINGUE depuis le 451** (il était en anglais des deux côtés — `fr`
contenait littéralement `star: STAR_EN`, voir §30.5 de `components/ferme/README.md`). Toutes les
chaînes joueur vivent dans `fermeStrings.js` sous la clé racine `star:`, **deux tables distinctes**
— ⚠️ `verify-quete` a dû apprendre à REFUSER ce qu'il exigeait (`en.star === fr.star`). Les
citations de ce document sont désormais les phrases **françaises réelles**, relues dans le fichier.

⚠️⚠️ **RÉVISION APRÈS LE PREMIER RETOUR DE GUILLAUME**, et c'est la remarque la plus utile du
chantier : *« ne t'embête pas à recopier les mécaniques des autres jeux coopératifs, il faut
quelque chose de très bien intégré… il faut un thème type quête magique secrète ».* Le premier
jet posait un **bonneteau** et un **« 1, 2, 3, soleil »** — deux jeux de kermesse repeints en
magie. Ils sont sortis. **Toute la quête tient désormais sur un thème intégré plutôt que sur des
mécaniques empruntées**, et elle est secrète (§3).

---

## 0. CE QUE CETTE QUÊTE REMPLACE — DÉCIDÉ

L'enquête « la parcelle qui n'existe pas » (442) est **retirée entièrement** (validé).

| | sort |
|---|---|
| cadre narratif, 21 lieux, 8 chapitres, 3 codes, Vigenère, deux issues | **supprimé** |
| `ENQ_MARKET_*` / `enqMarketMod` — l'issue qui touchait `marketRate` | **supprimé** (cette quête ne touche à AUCUN prix) |
| ⚠️ le plancher unifié dans `E.marketApply` | **conservé** — c'était une réparation, pas de l'enquête |
| ⚠️ « le cours est bit à bit celui du 430 » | **déplacé** dans `verify-vallee.mjs` — il protège le marché, pas l'enquête |
| `E.courtBoxFree`, `E.courtStairwellAt`, `E.courtRoomAt` | **conservées**, la quête s'en sert plus encore |
| les 4 arrêts de téléport d'intérieur du 442 | **conservés**, + le beffroi |
| la **forme** d'`enquete.js` (table pure, résolveurs purs, `migrate*` tolérant, dev-ops qui jettent le gain) | **réutilisée** — c'est le bébé, pas l'eau du bain |
| `townFindPath` / `townNav` / `townSpots` / `townSameArea` | **réutilisés**, aucun chemin refait |
| `tools/verify-enquete.mjs`, `tools/render-enquete.mjs` + 11 sprites | **supprimés** → `verify-quete.mjs`, `render-etoile.mjs`, `render-beffroi.mjs` |

---

## 1. L'HISTOIRE

⚠️⚠️ **RÉÉCRITE AU 450-451, SUR DEMANDE DE GUILLAUME**, et le refus qui l'a produite vaut d'être
gardé parce qu'il est devenu une règle : *« l'idée de construire une lyre est un peu arbitraire ? »*
— elle l'était. **Une lyre est un objet d'ADULTE** : un enfant de sept ans ne sait pas ce que c'est,
donc « pourquoi on construit ça ? » est la première question qu'il pose, et c'est exactement celle
qu'on ne veut pas entendre. **Un bateau cassé qu'on répare n'a besoin d'aucune explication.**

**Les étoiles naviguent.** Une nuit, l'une d'elles fait naufrage au-dessus de la vallée : le ciel
se déchire d'est en ouest, quelque chose s'écrase au loin, les vitres tremblent, tous les oiseaux
de la vallée s'envolent d'un coup. **Son bateau s'est cassé en tombant. Cinq morceaux.** Le gros de
l'épave — et l'étoile avec — creuse un cratère dans un pré à l'est de Valley Town ; **la coque**
dépasse la ville et vient se planter **dans le champ de la ferme**, encore brûlante.
⚠️ *Ce paragraphe disait « le gros de la COQUE creuse un cratère » jusqu'au 453, ce que la table du
code contredit depuis le 450 (`hull` vient de `furrow`, le champ de la ferme). Un document et une
table qui racontent deux fois la même chose finissent par ne plus la raconter pareil ; ici, c'est la
table qui a raison, et le document qui a menti pendant trois zips.*

L'étoile est vivante, plus petite qu'une poule, elle tremble. Sans son bateau, elle ne rentre pas.
**Chaque morceau chante une note quand on le touche** — c'est à ça qu'on les reconnaît, et c'est ce
qui a survécu de la version d'avant : le nom en cinq notes est devenu un bateau en cinq morceaux
**sans qu'aucune mécanique ne bouge**.

Les joueurs les retrouvent un par un. Quand tous ceux qu'on peut trouver dehors chantent enfin
ensemble, la phrase **s'arrête net** : le bateau attend le dernier, et il n'y en a pas. **Elle est tombée avant que
son bateau ait une cloche.** Un bateau qui ne peut pas sonner ne traverse pas.

Et de l'autre bout de la ville, **la cloche de l'église sonne une fois, toute seule.**

La cloche a été fondue il y a cent ans dans une étoile tombée qui n'est jamais repartie — trouvée
tiède dans un champ, coulée dans cette forme, trop lourde pour rentrer. **Mais elle n'est jamais
allée en mer.**

> *« Petite. Emmène-moi. J'ai sonné quatre mille fois de la même poutre. »*

Elle devient la cloche de bord.

---

## 2. POURQUOI CETTE HISTOIRE

- **L'enjeu tient en une phrase pour un enfant de 7 ans** : « une étoile est tombée, son bateau
  est cassé, il faut le rebâtir ». Aucun vocabulaire à apprendre, **et aucune question à poser**.
- ⚠️⚠️ **ET IL SE VOIT, CE QUI EST TOUT L'INTÉRÊT DU CHANGEMENT.** Un nom en cinq notes est une
  idée qu'il faut LIRE ; un bateau à qui il manque un mât est une idée qu'on lit **en regardant
  l'écran**. C'est ce qui a permis au navire de devenir le pisteur (§6), et c'est la vraie raison
  pour laquelle la lyre est sortie — pas parce qu'elle était moins belle, **parce qu'elle n'était
  pas regardable**.
- **Pas de méchant, et pourtant une perte.** Ce qui coûte, c'est ce que la cloche donne : sa voix,
  et sa place. ⚠️ **Le 451 a changé ce sacrifice en DÉPART sans l'affaiblir** — avant, la cloche
  donnait sa note et restait ; maintenant elle part et ne rentrera jamais chez elle. Un enfant
  comprend « la cloche va enfin voir la mer » sans qu'on lui explique rien.
- **Tout rime avec ce qui existe.** Les morceaux chantent → il faut un instrument assez fort pour
  les faire chanter ensemble → **l'orgue de l'église**, déjà en jeu, dans la tribune, sous le
  clocher — et la cloche est juste au-dessus. Rien n'est plaqué.
- ⚠️ **Ça donne enfin une raison au fichier `public/sounds/church-organ.mp3`** que le 441 attend.
  Le son n'est toujours pas là ; la scène qui le justifie, si.
- **La ferme y gagne quelque chose** (le premier morceau, et la trace finale). Le 442 se reprochait
  de ne rien lui donner.
- **Le pré nu y gagne une raison d'être** — `CLAUDE.md` §13 pose la question depuis trois zips.
- ⚠️ **Et la rive du lac aussi** : le bateau se rebâtit sur la cale du chantier naval, un endroit
  de vie de plus sur une rive qui n'en avait aucun (§30.3 du README).

---

## 3. ⭐ LE THÈME : UNE QUÊTE MAGIQUE **SECRÈTE**

⚠️⚠️⚠️ **ZIP 455 — CE CHAPITRE A ÉTÉ COUPÉ EN DEUX, PAS RENIÉ, ET C'EST LA PLUS IMPORTANTE LIGNE
DE LA PAGE.** Il disait : *« personne d'autre ne voit l'étoile ; aucun panneau ne l'annonce, aucun
PNJ ne la donne, le tableau des nouvelles n'en dit pas un mot ; la quête ne commence pas, elle
ARRIVE »*. Guillaume a demandé l'inverse de la seconde moitié (« le lancement de la mission doit
être annoncé, pas automatique, la comète ne doit pas arriver comme ça »), et la première moitié est
restée intacte parce qu'on a séparé deux choses qui n'en faisaient qu'une :

> **LA PIERRE EST PUBLIQUE. L'ÉTOILE RESTE SECRÈTE.**

- **Ce que la vallée sait** : des astronomes annoncent une pluie d'astéroïdes. L'hôte décide quand
  la nouvelle se répand, l'affiche de l'observatoire est punaisée au tableau des nouvelles, la
  moitié des habitants s'agitent, et **tout le monde voit tomber le caillou** — « ! » compris,
  au-dessus de chaque tête, à l'instant du contact.
- **Ce que personne ne saura jamais** : ce qu'il y avait dedans. Aucun habitant ne nomme l'étoile,
  aucun ne dit où aller, aucun ne dit quoi faire. `verify-quete` **le refuse** — deux listes de mots
  interdits, l'une pour ce qui est secret (la petite étoile, le cratère, le sillon, le navire),
  l'autre pour les tournures qui envoient quelque part (« va voir », « cherche », « trouve »).
- ⚠️⚠️ **ET LE CONTRASTE REND LE SECRET PLUS FORT QU'AVANT.** Jusqu'ici le silence de la vallée
  était une ABSENCE — personne ne parlait de rien, ce qui est aussi ce que fait un décor. C'est
  maintenant un ÉCART : ils en ont tous parlé pendant deux jours, ils l'ont tous vue tomber, et pas
  un ne verra la lumière qui vous suit. `L.star.fall.quiet` dit désormais exactement ça — elle
  disait « personne ne sort regarder », ce que ce zip a rendu faux.
- ⚠️ **LE FAMILIER-GUIDE DU 449 RESTE JUSTIFIÉ AU MOT PRÈS.** Sa note dit qu'« un habitant qui
  renseignerait le joueur démolirait la meilleure page du chantier » : c'est toujours vrai, et
  c'est très exactement ce que le second contrôle ci-dessus protège.

**Ce qui reste vrai sans changement :**

- **La quête ne se cherche pas.** Elle s'annonce et elle tombe ; il n'y a toujours aucun panneau à
  ouvrir pour la trouver, aucun PNJ à qui parler pour l'obtenir. *Une histoire qui n'existe que
  pour qui ouvre le bon panneau n'existe pas* — le reproche que le 442 s'est fait à lui-même.
- **Aucun nouveau PNJ.** Le premier jet en posait un (une verrière). Il est supprimé : moins de
  travail, plus de secret, et surtout **plus juste**. Les deux seuls personnages sont l'étoile et
  la cloche — deux êtres magiques, et c'est très bien ainsi.
- ⚠️ **L'ÉTOILE SE CACHE QUAND QUELQU'UN APPROCHE.** Un résident passe à portée : elle glisse
  dans le col du joueur et s'éteint. Ça ne coûte rien (les positions des résidents sont déjà là),
  ça se voit tout de suite, et ça **montre** le secret au lieu de l'expliquer.
- **La seule chose que la ville partagera** est la cloche à l'aube, à la fin — sans jamais savoir
  pourquoi. Deux joueurs le sauront.

---

## 5. LE DÉROULÉ — CINQ ÉTAPES, ~55 MINUTES CUMULÉES

| # | titre (carte de chapitre) | où | min |
|---|---|---|---|
| 1 | **Ce qui est tombé dans le champ** · *What Landed in the Field* | la ferme | 8 |
| 2 | **Le cratère** · *The Crater* | le pré à l'est de Valley Town | 10 |
| 3 | **Ce que l'eau gardait** · *What the Water Kept* | le lac du sud, le ponton | 10 |
| 4 | **Les deux trésors de la voleuse** · *The Thief's Two Prizes* | le quartier des artisans, la nuit | 13 |
| 5 | **La cinquième note** · *The Fifth Note* | l'église : tribune + **beffroi** | 14 |
| — | **`Le Bateau des Étoiles`** · *The Star Boat* — la carte de FIN | le beffroi, puis l'aube | — |

⚠️ **Rien ne s'ajoute sans en retirer.** C'est la première chose que le 442 n'a pas tenue.
⚠️ **Aucun minuteur d'échec nulle part.** Rater un mini-jeu recommence la manche, jamais l'étape.

---

### ⭐ OUVERTURE — LA CHUTE

⚠️ **C'est une SCÈNE, pas un message.** Elle se joue là où le joueur est — ferme, ville,
intérieur — et **au même instant pour tout le monde** : l'hôte décide, diffuse **un** `send()`,
chaque client date à SA réception et déroule sa chronologie (jamais de comparaison d'horloge, §3).
Le jeu tourne derrière ; on ne coupe pas la simulation.

⚠️⚠️ **CE TABLEAU EST ÉCRIT EN ÉCART À L'IMPACT, PLUS EN SECONDES ABSOLUES — RÉÉCRIT AU 455.** Il
donnait « 1,2 s · 3,0 s · 3,4 s » depuis le 444 ; le 454 a triplé la durée du vol (2,05 s → 5,1 s)
et **tous ces nombres sont devenus faux d'un coup**, sans que rien ne le dise. Le CODE, lui, était
déjà écrit en écart à `STAR_FALL_IMPACT_MS` depuis le 448 : c'est la doc qui avait une seconde
description du même rythme. ⚠️ Il disait aussi le trait de lumière « **ouest → est** », alors que le
448 a inversé la course (le sillon se creuse en s'arrêtant à l'ouest, donc elle vient de l'est).

| quand | ce qui se passe | ce que ça réutilise |
|---|---|---|
| t = 0 | le ciel s'assombrit d'un cran, les couleurs se désaturent | le voile de nuit existe, on le multiplie |
| après `STAR_CAM_GO_MS` | **la caméra part** — vers le cratère en ville, ⚠️ **vers un point EN AMONT de la course à la ferme** (455) | `starCamTarget`, une jointure avec l'azimut |
| après `STAR_FALL_APPEAR_MS` | **la comète traverse le ciel**, est → ouest, lourde (⅓ de vitesse jusqu'aux derniers dixièmes) | la couche de ciel est PARTAGÉE ferme/ville depuis le 429 |
| ⚠️ à `STAR_FRAG_AT` du vol (455) | **elle se fend**, à la ferme seulement — la gerbe d'impact resert d'éclat de fracture | `starFragments` (règle) + `drawStarComet` (dessin) |
| `IMPACT` | **flash blanc** (2 images), puis la gerbe · ⚠️ **hors cadre à la ferme** | `drawStarImpactFlash` |
| `IMPACT` + 0,2 s | **la caméra tremble** (amorti, 1,2 s) | `transform` du canevas, jamais la position du joueur |
| ⚠️ `IMPACT` → +2 s (455) | **tous les PNJ portent un « ! »** | `starBang` + `drawEmoteBubble`, dérivés de la même horloge |
| `IMPACT` + 0,4 s | **tous les oiseaux décollent** | le système de nuées (§16 du README) |
| `IMPACT` + 1,5 s | **une colonne de lumière** monte du point d'impact | la fonction de ciel commune |
| `STAR_FALL_MS` − 3 s | **carte de chapitre** | overlay neuf, réutilisé 6 fois depuis le 455 |

⚠️⚠️ **Puis plus personne n'en dit un mot — ET C'EST LE CONTRASTE, PLUS L'ABSENCE.** Ils en ont
tous parlé pendant deux jours, ils l'ont tous vue tomber, ils ont tous sursauté. Et pas un ne verra
jamais ce qui est sorti du trou. C'est le thème (§3), et il est plus fort depuis le 455 qu'avant.

🔊 Accroches son, **vides et nommées** : `starSfx("fall")`, `starSfx("impact")`,
`starSfx("chapterCard")`.

⚠️⚠️⚠️ **DÉCLENCHEMENT — RÉÉCRIT AU 455.** Ce paragraphe disait : « la quête s'arme toute seule à
la première nuit où jour ≥ 3 et un joueur est en ligne ». Elle ne s'arme plus toute seule.

1. **L'INVITE.** Quand la ferme est éligible (jour ≥ 3, Eduardo + Tristan **actifs**, 4 artisans —
   `starFallGate`, inchangé depuis le 454), **l'hôte** voit au crépuscule un panneau :
   « Démarrer l'enquête « La Belle Étoile » ? » · **Oui** / **Plus tard**. L'invité ne voit rien.
   ⚠️ Elle ne s'ouvre QUE si la quête est réellement déblocable : un panneau qui s'ouvre suivi d'un
   résolveur qui refuse, c'est « le jeu propose et refuse » (426). « Plus tard » ne traverse pas le
   réseau — l'invite revient au crépuscule suivant, une fois par jour de jeu.
2. **L'ANNONCE.** « Oui » date `star.warn` côté hôte et diffuse **un** `send()` : fondu enchaîné,
   carte plein écran « La Belle Étoile — Les astronomes ont prévenu », une ligne de chat.
3. ⚠️⚠️ **LE TAMPON, ET IL NE SE PASSE RIEN D'AUTRE.** C'est la moitié la plus importante de la
   demande (« rien ne doit se passer immédiatement »). Pendant ce temps :
   · l'**avis de l'observatoire** est lisible au tableau des nouvelles de Valley Town ;
   · **~4 PNJ sur 10** (`STAR_NERVE_SHARE`) se balancent ou tournent une ou deux fois sur eux-mêmes
     avec un **« ! »** au-dessus de la tête, toutes les onze secondes, **décalés** ;
   · **quand on s'approche d'eux à 3,4 cases**, ils disent ce qu'ils ont entendu — huit rumeurs de
     peur, et **six indices** qui annoncent chacun une étape à venir sans jamais le savoir
     (l'ingénieur breton, les étoiles bizarres des nuits d'avant, la cloche fondue dans une pierre
     du ciel, la pie du verrier, le fond du lac, le sable qui devient du verre vert).
   ⚠️ **Tout est DÉRIVÉ de `star.warn` et du `rid`** : les mêmes PNJ s'agitent et disent les mêmes
   phrases sur les deux écrans, **pour zéro message et zéro champ d'état**.
4. **LA CHUTE**, à la **première nuit qui COMMENCE après l'annonce**, avec un plancher de
   **5 minutes réelles** (`starFallDue`). ⚠️ « La nuit qui suit » a deux lectures : prise au sens
   « la prochaine fois qu'il fait nuit », un « oui » cliqué à 20 h faisait tomber la comète dans la
   minute — c'est-à-dire ce que la demande refuse. Un tampon dure donc **5 à 16 minutes réelles**.

⚠️ **ET LA CHUTE ELLE-MÊME A CHANGÉ À LA FERME** (voir §12.0 bis) : la caméra ne se pose plus sur le
sillon avant l'impact, le caillou **se fend en vol**, et l'impact a lieu **hors cadre**.

---

### ÉTAPE 1 — **CE QUI EST TOMBÉ DANS LE CHAMP** · la ferme · ~8 min

**Où.** Un sillon de terre brûlée dans les champs de l'ouest. ⚠️ **Position DÉRIVÉE, pas écrite** :
ancre au sud du puits, balayage déterministe en spirale jusqu'à la première case libre et
praticable (la leçon d'`ENQ_STONE_ANCHORS`). Elle **ne bloque pas** — une case qui change de sens
sur une carte labourée depuis des mois est un piège. Le banc vérifie qu'elle est libre,
praticable, et distincte de la boutique, du bac, du panneau de gare et du seuil de la maison.

**Ce qu'on voit.** Six cases de terre noire retournée, de l'herbe givrée de sel de verre, et au
bout un morceau **trop brillant pour être regardé**, qui fume.

> `star.s1.tooHot` — « C'est trop brûlant pour qu'on y touche. Une fois froid, ça fera une proue
> increvable — personne n'a jamais rien vu d'aussi dur. »
⚠️ **ZIP 457** — la raison (un matériau de construction, pas un mystère gratuit) est dite ICI,
avant le mini-jeu ; voir le commentaire en tête de `s1` dans `fermeStrings.js`.

**🎮 MINI-JEU 1 — « COOLING » · l'arrosoir · à l'écran : « Fais-le refroidir »**
Le joueur a déjà l'outil et il l'aime. On arrose **par à-coups** ; une jauge de chaleur doit rester
dans une bande étroite. Trop d'eau d'un coup et le verre **se fend** (la manche repart) ; pas assez
et il remonte au blanc.
- **En canevas**, pas en barres CSS : on voit le morceau, la vapeur, la couleur descendre
  blanc → orange → rouge sombre → bleu. ⚠️ **Chaque impulsion fait un panache de vapeur qui masque
  la jauge une seconde** — c'est ça, la difficulté, et elle est diégétique.
- **Trois manches**, bande de 0,26 → 0,19 → 0,13.
- À deux : deux arrosoirs, bande 40 % plus large. Confort, pas obligation — c'est le tutoriel.

**LA PREMIÈRE MAGIE.** Le morceau refroidit, sa lumière s'allume — et **l'ombre du joueur au sol
n'est plus sa forme** : il y a quelqu'un de petit assis sur son épaule. On se retourne : il n'y a
personne.

> `star.s1.shadow` — « Ton ombre a quelqu'un de tout petit assis sur son épaule. Tu te retournes.
> Il n'y a personne. »

**Ce que ça donne.** **Le premier morceau — LA COQUE.** ⚠️ **C'est ici que le navire apparaît sur
la cale** (§6) : une coque posée sur ses tins, et quatre fantômes bleus autour d'elle. Le morceau
penche vers l'est, toujours. → **prendre le train.**

> `star.s1.got` — « La première pièce de la coque : froide, dure comme la pierre, de quoi faire
> une proue increvable. Elle chante une note quand on la touche. »
> `star.s1.east` — « Il penche vers l'est, du côté de la ville, comme s'il montrait un chemin.
> Peut-être que c'est ainsi qu'on naviguera, une fois le navire fini. »

---

### ÉTAPE 2 — **LE CRATÈRE** · le pré à l'est · ~10 min

**Où.** Un cratère de neuf cases dans le pré entre le champ de foire et le bois (validé). ⚠️
**Dérivé** d'une ancre, recherche déterministe de la première zone dégagée. Le sentier de l'est
(440) passe à côté et cesse enfin de ne mener nulle part.

**Le décor est neuf et il doit être beau** — ⚠️ **REFAIT AU 446 SUR DEUX IMAGES DE GUILLAUME, et
c'est devenu une mécanique** : un TROU (paroi ouest dans l'ombre, éclairage calculé), une gerbe de
fibres de terre projetée, de longues fissures ramifiées dans l'herbe, des braises au fond, une
colonne de fumée, et l'étoile posée au milieu. **Il fume trois minutes puis refroidit**, et tant
qu'il fume l'étoile ne sort pas (`starCraterHeat` / `STAR_CRATER_COOL_MS`). **On s'y enfonce en
marchant** (`starCraterSink`, un décalage d'image, jamais une altitude de case). Le détail est au
**§26 de `components/ferme/README.md`** ; les règles de dessin qui en sortent sont dans
`DESSIN.md`. Le bassin de verre vert reste la trace d'après-quête.

**Ce qu'on voit d'abord.** Rien. Puis, **au bord de l'écran**, une lueur qui n'y est plus quand on
tourne la tête.

**🤝 COOPÉRATION — « THE SHY LIGHT »**
Elle ne sort **que si personne ne la regarde**. Les deux joueurs doivent lui tourner le dos, en
même temps. Elle apparaît alors **en périphérie**, dessinée en clair au bord de l'écran ; se
retourner l'efface.
- Sensation : deux personnes debout dans un cratère, dos à dos, à regarder ailleurs, pendant
  qu'un truc minuscule s'approche. **C'est drôle, c'est tendre, et ce n'est copié de rien.**
- Arbitrage : chaque client demande (`req starCalm`) quand SA condition tient ; **l'hôte
  revérifie les deux positions et les deux orientations à sa propre horloge**.
  ⚠️ **À CONFIRMER DANS LE CODE** : l'orientation est-elle dans `pubMe` ? Si non, la condition
  devient « immobile, dos au cratère » déduite du dernier déplacement — et si ça ne tient pas non
  plus, **on retombe sur l'immobilité seule** (`moving`, qui y est certainement). *On construit sur
  ce que le paquet porte déjà, jamais sur un champ ajouté* — un champ qui circule sans être lu est
  le défaut du 432.
- **Solo** : dos tourné et immobile **beaucoup plus longtemps** ; elle ressort si on rate.

**LA RENCONTRE.** Plus petite qu'une poule, elle tremble, elle parle **en bulles courtes** au-dessus
d'elle, comme les résidents. Elle voit le morceau qu'on porte, **le reprend**, et pour la première
fois **deux notes chantent ensemble**. Elle arrête de trembler.

> `star.s2.meet1` — « Elle est plus petite qu'une poule. Elle tremble. »
> `star.s2.meet2` — « Tu tends le morceau de ton champ. Elle le reprend. »
> `star.s2.meet3` — « Deux notes, ensemble. Elle arrête de trembler. »

⚠️ **ET C'EST ICI, ET NULLE PART AILLEURS, QUE L'HISTOIRE S'ÉNONCE** — une ligne, jamais un
panneau. C'est la seule phrase de toute la quête qui dit ce qu'on fait et pourquoi :

> `star.s2.name` — « Son bateau s'est cassé en tombant. Cinq morceaux. Elle n'en a que deux. »

**LE COMPAGNON.** ⚠️ **Sa position est DÉRIVÉE de celle de son porteur** (`trailFollow`, le
mécanisme des invités de famille depuis le 428) : **zéro message, aucune collision propre,
impossible de traverser un mur**. Elle brille près d'un morceau, **elle se cache quand un résident
approche** (§3), elle se pose sur le banc d'orgue à la fin. **C'est elle, l'interface qui
accompagne le joueur.**

**🎮 MINI-JEU 2 — « THE LEANING SHADOWS » · à l'écran : « Écoute les ombres »**
L'étoile chante, et **toutes les ombres de la ville se tournent** — arbres, lampadaires, statues,
étals : elles cessent de suivre le soleil et penchent vers un morceau perdu. Mais **une direction
n'est pas un lieu**.
- Geste : `E` n'importe où → une onde part au sol, et les ombres autour de soi pivotent
  lentement, en montrant leur direction. **C'est le plus beau plan de la quête et il ne coûte
  qu'une rotation d'ombre.**
- **Deux lectures depuis deux endroits éloignés se croisent** → le lieu se marque, chez les deux,
  sur la boussole et la carte.
- Arbitrage : `req starLean` avec la case. L'hôte garde `{tile, hostNow}`. **Deux joueurs
  DISTINCTS, > 30 cases d'écart, dans une fenêtre de 20 s datée par l'HÔTE.**
- **Solo** : fenêtre 70 s, écart 45 cases — on lit, on traverse, on relit. L'étoile le dit :
  "Stay still. I'll try to remember which way it leaned."
- **Deux croisements** : le lac, puis le quartier des artisans. ⚠️ **Les deux se marquent ici** :
  on sait toujours ce qu'on cherche, jamais de mystère entretenu.

---

### ÉTAPE 3 — **CE QUE L'EAU GARDAIT** · le lac du sud · ~10 min

**Où.** Sous le ponton (`TOWN_PIER`). L'eau du 435-436 est le plus beau morceau de la carte —
profondeur, reflets, haut-fond. On plonge dedans, enfin.

**🤝 COOPÉRATION — « THE LIGHT THAT LEADS »** — le cœur de l'étape, et l'usage le plus pur de la
grammaire.
L'eau est noire. **La lumière de l'étoile la traverse et fait une flaque claire au fond.** Celui
qui tient l'étoile marche sur le ponton ; **la flaque suit ses pas**. Celui qui plonge **ne voit
que l'intérieur de la flaque** — dehors, écran noir.
- Donc : **A éclaire le chemin de B, littéralement.** A voit la surface et devine ; B voit le fond
  et cherche. Aucun des deux ne peut faire les deux.
- Zéro message : la position de A circule déjà, le client de B dessine la flaque sous elle.
- **Solo** : on cale l'étoile sur la bitte d'amarrage. La flaque **ne bouge plus** ; le morceau est à
  son bord, il faut plonger en biais, ressortir, recommencer. Trois essais au lieu d'un.

**🎮 MINI-JEU 3 — « THE DIVE » · à l'écran : « Plongée n »** — canevas plein écran, trois descentes :
1. **Le souffle** : un anneau de lumière se referme depuis le bord de l'écran. Seule limite.
2. **Le courant** : des veines sombres poussent de côté ; on corrige aux flèches, plus fort en
   descendant.
3. **Les obstacles** : pilotis, herbiers, une vieille barque. Un choc coûte du souffle, pas la
   manche.
4. **La prise** : le morceau **pulse** toutes les 1,1 s ; il faut être dessus au bon battement.
   Rythme, pas réflexe.
- **Montée** : 22 m courant faible et aucune pulsation (on apprend) · 34 m courant moyen · 48 m
  courant fort, **et le morceau glisse de deux cases quand on approche**.
- Feedback : bulles, assombrissement, le halo de A qui s'éloigne en surface, un battement visuel
  quand le souffle est court.
- Échec = on remonte, on souffle, on replonge. **Aucune perte.**

**Le deuxième morceau — LE SAFRAN.** En remontant : **une ombre traverse l'eau. Des ailes.**

> `star.s3.got` — ⚠️⚠️ **CORRIGÉ AU 453 : C'EST DÉSORMAIS UNE FONCTION `(n, total)`**, appelée
> avec ce que le navire montre. Elle disait « Trois morceaux. Trois notes. » devant un bateau à
> **deux** morceaux sur cinq — le compte en NOTES du 444, laissé en place quand le navire est
> arrivé. ⚠️ **Et elle servait de message de FIN DE MANCHE**, donc elle s'affichait après CHAQUE
> plongée, y compris la première : trois morceaux annoncés quand on n'en avait ramené aucun. Le
> compte ne se dit plus qu'au moment où le navire grandit vraiment (`starWatch`), et les manches se
> ferment sur `diveDeeper`, qui décrit ce qui se passe.
> `star.s3.wings` — « Une ombre traverse l'eau. Des ailes. Quelque chose de petit et brillant part
> vers l'est. »

---

### ÉTAPE 4 — **LES DEUX TRÉSORS DE LA VOLEUSE** · les artisans, la nuit · ~13 min

⚠️ **Un seul lieu, une seule histoire, deux morceaux.** Le premier jet en faisait deux étapes ; les
fusionner **raccourcit ET resserre** : une pie niche sur le toit de la verrerie. Elle a pris deux
morceaux. Elle en a **laissé tomber un dans le sable** — fondu dans une perle. Elle a gardé l'autre.

**L'atelier est fermé et noir.** On entre la nuit. **Personne. Aucun PNJ** (§3).

**🤝 + 🎮 MINI-JEU 4 — « A SHADOW THAT LIES » · à l'écran : « Une ombre qui ment »**
Un râtelier de cent perles de verre. Toutes pareilles. A tient l'étoile et **balaie** le râtelier ;
les ombres défilent sur le mur du fond. **B regarde le mur.** À un seul angle, une perle projette
**l'ombre d'une étoile** au lieu de l'ombre d'une bille.
- ⚠️ **A ne peut pas voir le mur** (il est face au râtelier, ébloui) ; **B ne peut pas bouger la
  lumière**. C'est la grammaire, à l'état pur.
- Ça se JOUE : **la vitesse du balayage compte.** Trop vite, l'ombre passe et on la rate ; trop
  lentement, le verre chauffe et l'ombre **se brouille**. Il y a une bonne allure, et on la sent.
- **Trois râteliers** : 40 perles / 70 / 100, et l'ombre vraie tient de moins en moins longtemps.
- **Solo** : on coince l'étoile dans le châssis de la fenêtre. La lumière ne bouge plus, donc
  **c'est le râtelier qu'on tourne**, d'un cran à la fois, à la manivelle. Plus long, jouable.

**Le troisième morceau — LE MÂT.**

**🤝 + 🎮 MINI-JEU 5 — « THE LURE » · à l'écran : « Le leurre »**
Le nid est sur le toit. **La pie suit la lumière** comme un chat suit une lampe de poche.
- A **emmène** la lumière — il faut *mener*, pas *tirer* : la pie a du retard et de la patience,
  elle décroche si la lumière s'arrête ou saute. Un vrai petit geste d'adresse.
- **B monte au nid** pendant ce temps. Si A perd la pie, elle remonte et B se fait voir : la
  manche repart.
- **Solo** : on pose l'étoile, la pie descend et **repart sur un minuteur mesuré**.

**Le quatrième morceau — LA VOILE.** (Le mât venait de la perle, juste avant.)

> `star.s4.got` — fonction `(n, total)` depuis le 453 : « Quatre morceaux sur cinq. Il ne manque
> plus que la cloche. »

#### ⚡ LE RETOURNEMENT

Sur le toit, les **quatre morceaux chantent ensemble pour la première fois**. C'est beau, ça monte
— **et ça s'arrête net.** Blanc. Le décor se tait : les oiseaux, le vent (le voile de météo est
déjà là).

Le bateau attend le cinquième, **et il n'y en a pas.** Elle est tombée **avant que son bateau ait
une cloche** — c'est pour ça qu'elle est tombée. Un bateau qui ne peut pas sonner ne traverse pas.

Elle s'éteint presque. Puis, à l'autre bout de la ville, **la cloche sonne une fois, toute seule.**

> `star.s4.turn1` — fonction `(n, total)` depuis le 453 : « Quatre morceaux sur cinq chantent
> ensemble. Le bateau attend le dernier. » ⚠️ *« le cinquième » demandait un ORDINAL, donc une
> seconde table de mots à tenir juste ; « le dernier » est vrai quel que soit le nombre de morceaux.*
> `star.s4.turn2` — « Il n'y en a pas. Elle est tombée avant que son bateau ait une cloche. »
> `star.s4.turn3` — « Un bateau qui ne peut pas sonner. Une mer qu'il ne peut pas traverser. »
> `star.s4.turn4` — « Alors, à l'autre bout de la ville, la cloche de l'église sonne. Une fois.
> Personne ne l'a tirée. »

⚠️⚠️ **C'EST LE MORCEAU DE FICTION QUE LE NAVIRE A LE PLUS AMÉLIORÉ, ET IL FAUT SAVOIR POURQUOI.**
La version « nom en cinq notes » demandait au joueur de retenir une règle abstraite (*chez les
étoiles, un nom fait cinq notes*) pour que le retournement le touche. La version bateau ne demande
rien : **le cinquième emplacement est vide à l'écran depuis le premier chapitre**, et il a une
forme de cloche. Le retournement ne révèle pas une règle, **il nomme ce qu'on regardait déjà.**

**Carte de chapitre : `Chapitre Cinq — La cinquième note`.** ⚠️ **Le pisteur change de sujet en même
temps que l'histoire** : le navire est complet sauf sa cloche, et le chevron pointe le clocher.

---

### ÉTAPE 5 — **LA CINQUIÈME NOTE** · l'église · ~14 min

#### ⚠️ LE BEFFROI EST CONSTRUIT (444) — CE PARAGRAPHE DISAIT L'INVERSE JUSQU'AU 452

**Il l'a dit un zip de trop, et c'est la deuxième chose que cette relecture a trouvée.** Au moment
où ces lignes ont été écrites, le clocher n'était pas un lieu du jeu : l'église avait `church` +
`churchLoft`, la tribune avait sa cage de vis et sa corde (441), et on ne montait pas. **Le 444 l'a
bâti** — une ligne dans `COURT_FLOORS`, le palier haut de la vis existante, aucun `CT_*` de plus,
aucune zone, aucun champ réseau (l'étage se déduit de `y`). Il a son arrêt de téléport
(`churchTower`), son banc (`render-beffroi.mjs`, **28/28**), et il a été monté à l'écran.
*Une section « ce qui n'existe pas encore » est la première à mentir, parce qu'elle est vraie le
jour où on l'écrit et fausse le jour où on la lit.*

**Le beffroi.** Huit cases sur dix : la **charpente de bois**, **la cloche** au centre, **quatre
abat-son** ouverts aux quatre vents, le palier de la vis, de la fiente de pigeon partout. ⚠️ **Ses
quatre ouvertures donnent sur la ville** — on la voit d'en haut, en petit, comme la tribune voit
la nef (441). **C'est la raison d'être du niveau**, et `render-beffroi.mjs` le contrôle : sans ça
on aura construit une pièce fermée en haut d'un escalier.

#### LA MONTÉE

La vis est étroite et noire ; **l'étoile éclaire**. Deux inscriptions à hauteur de main, gravées
par des sonneurs morts depuis longtemps. Court, savoureux, jamais obligatoire.

> `star.s5.stair1` — « Gravé dans la pierre : "J.M. a sonné pour la crue. 1889." »
> `star.s5.stair2` — « Plus bas, en plus petit : "et pour rien du tout, certains jours." »

#### CE QUE DIT LA CLOCHE

Vieille, verte, immense. **Elle parle en vibrant** — le texte apparaît **dans le bronze**, pas dans
une bulle.

> `star.s5.bell1` — « Je suis tombée aussi. Il y a très longtemps. Avant que la ville ait un nom. »
> `star.s5.bell2` — « On m'a trouvée tiède dans un champ, et on m'a coulée dans cette forme. »
> `star.s5.bell3` — « Je suis trop lourde pour rentrer. Mais je ne suis jamais allée en mer. »
> `star.s5.bell4` — « Petite. Emmène-moi. J'ai sonné quatre mille fois de la même poutre. »

⚠️⚠️ **LES QUATRE PHRASES ONT ÉTÉ RÉÉCRITES AU 451, ET C'EST LE MEILLEUR GAIN DU NAVIRE.** Avant,
la cloche *gardait sa note* et la *donnait* : elle restait, et ce qu'elle perdait était sa voix.
Maintenant elle **demande à partir** — `bell4` n'est plus « prends-la », c'est **« emmène-moi »**.
Le sacrifice n'a pas disparu (elle ne rentrera jamais chez elle, elle est trop lourde) : il s'est
**changé en départ**. Un enfant n'a rien à comprendre, il voit une vieille cloche embarquer.

⚠️ **Aucun choix moral n'est proposé, et c'est délibéré.** La cloche décide. Un menu à deux
boutons transformerait un don en arbitrage — exactement ce qu'on retire au 442. Ce que les joueurs
font n'est pas *choisir*, c'est **sonner**, ensemble, pour que le don ait lieu. **On joue le geste
au lieu de cocher la case.**

#### 🎮 MINI-JEU 6 — « THE DUET » · le climax · à l'écran : « Le duo »

**Deux pièces, deux jeux différents, un seul échec.** Les joueurs ne se voient pas.

⚠️ **L'orgue ne fait pas de son dans cette passe — il fait de la LUMIÈRE**, et c'est la grammaire
qui le permet. Chaque tuyau qui parle envoie **un rai de lumière** à travers le plancher de la
tribune, jusque dans le beffroi.

**Joueur A — à l'orgue** (`churchLoft`, sur `organBench`, qui existe déjà).
L'étoile chante une phrase ; A la **tient** — pas un Simon-dit muet : on **enfonce et on soutient**
les touches, comme à l'orgue, et **les rais qui montent disent lesquelles sont justes** (or =
juste, gris = fausse). On peut se rattraper, rien n'est perdu.

**Joueur B — au beffroi**, un étage plus haut.
Il tient les quatre morceaux dans les rais qui percent le plancher, et **les renvoie par les
abat-son vers un point du ciel — qui dérive** (`STAR_DUET_AIM_DRIFT`). Une visée lente à corriger
sans arrêt, plus rapide à chaque phrase.

⚠️⚠️ **TRANCHÉ AU 453 : LA LYRE RESTE DANS LE CIEL, ELLE NE COMPTE PLUS RIEN.** C'était la
constellation-compteur de la fiction d'AVANT (« il manque une corde à la lyre »), et plus rien
n'expliquait pourquoi c'était ELLE ni pourquoi elle se remplissait. ⚠️ **Elle n'a jamais été NOMMÉE
au joueur** — aucune chaîne du jeu ne la cite, la vérification a été faite avant de décider — donc
il n'y avait rien à retirer de l'histoire : ce sont des étoiles, elles brillent, et le viseur du duo
les rattrape. **Ce qui est parti, c'est le TROU et le remplissage** (voir §6.7). *Deux compteurs de
la même chose, c'est un de trop* — et celui-ci ne comptait même pas comme l'autre.

⚠️ **Chacun VOIT l'effet de l'autre** : les rais de A **s'éteignent** si B décroche, le faisceau
de B **faiblit** si A se trompe. *Sans ça, ce sont deux mini-jeux côte à côte, pas une
coopération.*
- Arbitrage : les deux mini-jeux sont **locaux**. Chaque phrase réussie part en `req`, l'hôte
  compte et diffuse. Six phrases = 12 messages en tout.
- **Solo** : les **cales du sonneur** (des coins de bois — un vrai usage d'orgue) tiennent les
  touches. On cale, on court dans la vis, on vise, on redescend ; **la note faiblit pendant la
  montée**, fenêtre **mesurée** sur le trajet réel banc d'orgue → beffroi en courant. Le jeu le
  dit : « Tu cales les touches et tu cours dans l'escalier. La note faiblit déjà. »

#### 🌟 LA RÉSOLUTION

Cinq morceaux. La cloche embarque — **elle sonne, et sa voix devient plus mate d'un demi-ton pour
toujours.**

1. Les quatre morceaux **quittent les mains de B** et tournent autour de la cloche.
2. La caméra **dézoome** (le dézoom des monuments existe depuis le 428, on le pousse d'un cran).
3. Les abat-son s'ouvrent en grand : la lumière sort par les quatre côtés — **on voit la ville
   entière s'éclairer par en haut**, un mur après l'autre.
4. **Le navire est entier sur sa cale**, et il le RESTE — voir la note ci-dessous. Ce qui monte
   « comme un ballon qu'on lâche », c'est **l'étoile**, et c'est ce que le dessin a toujours peint.
5. Fondu au blanc → **l'aube**. La ville vide au petit matin. La cloche sonne une fois. Carte de
   fin : **`Le Bateau des Étoiles`** / `The Star Boat`.

> `star.end1` — « Elle monte comme un ballon qu'on lâche. Doucement. Comme si elle avait toute la
> nuit. »
> `star.end2` — « En bas, le bateau est entier. Il flotte enfin. Il attend quelqu'un qui sache
> partir. »
> `star.end3` — « La cloche ne dit rien d'autre. »

⚠️⚠️⚠️ **RÉSOLU AU 453, ET C'EST UNE DÉCISION DE GUILLAUME, PAS UN CORRECTIF.** Jusque-là `end1` et
`end2` racontaient l'appareillage et **le navire ne partait jamais à l'écran** : le rendu lisait les
cinq morceaux et ne testait pas `doneAt`, donc un bateau complet restait à quai pour toujours sous
une phrase qui venait de dire le contraire. ⚠️ **Pire : `end1` décrivait le BATEAU qui monte « comme
un ballon qu'on lâche », alors que le dessin de la scène peint L'ÉTOILE qui monte.** Deux
affirmations fausses dans deux phrases sur trois, sous une image que personne n'avait comparée au
texte.
⚠️⚠️ **La décision, mot pour mot :** *« Quand c'est fini, le bateau est construit et réel. Eduardo
Da Fonseca (quand il est recruté) le prend et part au large, explique qu'il va explorer le large. Ça
laisse de la marge narrative, pour développer de nouveaux mondes et ensuite permettre au bateau de
revenir. »* Les deux écritures écartées sont gardées ici parce qu'elles reviendront : une **scène de
départ** à la résolution (la plus belle, mais la finale se joue dans le BEFFROI et le navire est au
bord du lac — c'est une caméra qui change de lieu, donc un chantier), et une **cale vide dès la fin**
(gratuite, mais elle fait disparaître l'objet au moment où il vient d'être fini).
⚠️ **Ce que ça donne dans le code, et ça ne coûte NI état NI message** : `Q.starShipGone(e,
voyagerAway)` — pure, lue par le jeu et par le banc — vide la cale tant qu'Eduardo est en voyage
(`res.trip.phase`, dans l'état partagé depuis le 258) et la remplit quand il rentre. Le dessin a un
état de plus (`opt.gone` → la cale SANS sa carcasse : ber, tins, ombre), et les deux messages de
chat du voyage sont REMPLACÉS une fois la quête finie, donc zéro `send()` de plus.

#### LA TRACE

⚠️ **Une fin qui ne change rien n'a pas eu lieu.** Cinq traces permanentes, toutes lisibles sans
ouvrir un panneau :

| trace | où | coût |
|---|---|---|
| **une étoile de plus** la nuit, plus brillante que les autres — ⚠️ et le texte dit désormais d'où elle vient : *« Elle vient du lac. »* | ville **et** ferme | la couche de ciel existe |
| **la cloche sonne une fois à chaque aube**, toute seule | toute la ville | un crochet d'aube existe déjà |
| **le cratère refroidit en bassin de verre vert** qui luit la nuit | le pré | variante de décor |
| **le beffroi reste ouvert** — la plus belle vue du jeu | l'église | le niveau est construit |
| **le sillon de la ferme se referme en herbe rase**, un morceau de verre dedans | la ferme | variante de décor |

⚠️⚠️ **ET IL Y EN A UNE SIXIÈME, DÉCIDÉE AU 453 : LE NAVIRE RESTE, ENTIER, ET IL NAVIGUE.** Il se
dresse sur sa cale une fois la quête finie ; **la cale se vide quand Eduardo Da Fonseca prend le
large avec lui, et se remplit quand il rentre.** C'est la seule trace qui BOUGE, et c'est celle qui
promet un ailleurs — la phrase de Guillaume dit la suite (« amarrer sur des îles, dans le futur »).
⚠️ Elle ne coûte rien : « Eduardo est en voyage » circule dans l'état partagé depuis le 258.

#### 🎁 LA RÉCOMPENSE

⚠️ **Aucun or, aucune pièce, aucun gain économique.** Cette quête ne touche à aucun prix — donc
elle ne peut pas casser le marché, contrairement au 442 qui touchait `marketRate`.

Ce qu'on construit **maintenant** : `resolveStarGift(state, playerId, hostNow)`, **arbitré par
l'hôte**, appelé **une seule fois** au basculement de la scène finale, qui inscrit
`star.gift[playerId] = { at, kind: "starlight" }` dans l'état partagé persisté.

⚠️⚠️ **L'ARBITRAGE EST POSÉ MAINTENANT, LE CONTENU PLUS TARD** — la règle du 439 (« un panneau qui
s'ouvre à volonté ne doit rien donner ») appliquée à un crochet qui ne donne encore rien. Le jour
où la garde-robe cosmétique existera, elle lira `star.gift` : le chemin d'attribution sera déjà là,
déjà arbitré, déjà persisté, déjà mesuré. **Ce qu'on ne fait PAS** : le système de déblocage,
l'objet, son sprite, son panneau. Le jeu dit simplement, une fois :

> `star.gift` — « Quelque chose d'elle est resté avec toi. »

---

## 6. L'INTERFACE QUI ACCOMPAGNE

⚠️⚠️⚠️ **CETTE SECTION A CHANGÉ DE TÊTE AU 451 : LE PISTEUR N'EST PLUS UN BANDEAU, C'EST LE
NAVIRE.** La règle qu'on se donne est celle des dix secondes — *à n'importe quel instant, l'enfant
doit savoir ce qu'il fait EN REGARDANT L'ÉCRAN, sans ouvrir un menu et sans lire une phrase.* Un
bandeau ne le fait pas : il faut savoir lire, et il faut le relire. **Un bateau à qui il manque un
mât, si.**

1. ⚠️⚠️ **LE NAVIRE, SUR LA CALE DU CHANTIER NAVAL** (451) — cinq morceaux, et **ceux qui manquent
   sont peints en fantôme à leur place exacte**. C'est le langage de tous les jeux de construction,
   et il ne coûte pas une ligne de texte, donc pas une traduction. ⚠️ **Le fantôme est DÉRIVÉ de la
   pièce** (on cuit la pièce, on relit ses pixels opaques, on les repeint en bleu d'étoile sur un
   damier) : deux dessins séparés auraient divergé au premier réglage, et le symptôme aurait été
   une **promesse fausse**. ⚠️ **Il n'ajoute aucun état** : `Q.starShipParts` est une LECTURE des
   cinq trouvailles. Détail au §30 de `components/ferme/README.md`.
2. **LE BANDEAU** — il reste, et il dit l'**OBJECTIF**, plus le chapitre (449) : `Q.starGoalKey`,
   **la même source que le chevron**, parce que deux listes pour « où vais-je » ont déjà donné deux
   réponses vertes et contradictoires. Une phrase courte, jamais deux, et ⚠️ **jamais plus de
   ~80 signes** : au-delà, `white-space:nowrap` la coupe **en silence** (§12.1 bis).
3. **LE COMPAGNON** — position dérivée, **zéro message**. Elle brille près d'un morceau, **se cache
   des résidents**, se pose sur le banc d'orgue.
4. **LE CHEVRON** (445) et **LE FAMILIER MENEUR** (449) — un repère directionnel qui se pose sur la
   cible, et un animal qui **mène** à la demande (G) ou tout seul après 2 min 30, s'arrête à trois
   cases et s'assied. ⚠️ **Il ne parle pas, et c'est le sujet** : `fall.quiet` dit que personne
   n'en dit un mot ; un animal montre sans rompre le secret.
5. **LES BULLES** — l'étoile parle au-dessus d'elle, comme les résidents. Phrases courtes, mots
   simples, **jamais un panneau quand une bulle suffit**.
6. **LES CARTES DE CHAPITRE** — cinq, plein écran, sur fondu. C'est la mise en scène JRPG, et
   c'est ce qui découpe l'heure en cinq soirées possibles.
7. **LE CIEL** — dès la chute, une constellation est visible la nuit. ⚠️⚠️ **ELLE NE COMPTE PLUS
   RIEN DEPUIS LE 453, ET C'EST LA CORRECTION QUI COMPTE ICI.** C'était la **Lyre**, avec un TROU
   qui se remplissait — donc un **second compteur de la même progression que le navire, et qui ne
   comptait même pas pareil** : `1 + Q.starShards(e)` sur cinq points, décalé d'un cran par rapport
   à `Q.starShipParts`. Deux réponses vertes à « où j'en suis », jamais comparées : la leçon du 449,
   dans le ciel. Elle racontait « il manque une corde à la Lyre », phrase qui n'existe plus depuis
   le 450. **Le pisteur est le navire, et il est seul.**
8. **LES PANNEAUX D'ÉTOILE** ont leur habillage : fond de nuit, lumière, bordure claire — distinct
   du bois des panneaux de ferme. On sait de quel monde vient ce qu'on lit.
9. **LA REPRISE** — carte « Où tu en étais » : une ligne, le compte de morceaux, où l'on allait.
   Une fois par session. ⚠️ **Elle disait « n sur 4 »** (`STAR_SHARD_TOTAL`) devant un navire à cinq
   emplacements, et « Tu as 1 morceaux » au premier morceau. Elle lit `Q.starShipBuilt` /
   `Q.STAR_SHIP_TOTAL` depuis le 453, comme le chat, comme les pastilles, comme la cale.

---

## 7. LES DESSINS NEUFS, ET LE CHOIX DE NE PAS OUVRIR BLENDER

**Dix familles** (huit au 444, **plus deux depuis**), toutes en **canevas procédural** dans
`fermeArt.js` :

| | quoi | la règle de `DESSIN.md` qui le gouverne |
|---|---|---|
| 1 | **l'étoile compagnon** — 4 poses × 3 états (calme / apeurée / éteinte) | ⚠️ **un cerne sert aussi sur fond clair** (441) : une étoile blanche sur un mur clair disparaît |
| 2 | **le morceau**, 4 couleurs (une par note) | échelle jugée **contre le fermier**, pas contre d'autres décors (429) |
| 3 | **le sillon de la ferme**, chaud / refroidi | une usure a un bord flou (441) |
| 4 | **le cratère** (`drawStarCrater`) — ⚠️ **refait au 446 sur deux images de Guillaume** : un TROU à paroi ouest dans l'ombre, gerbe de fibres, fissures, braises, fumée ; puis **le fond en fusion du 449** | ⚠️ **ce qui creuse une image vue de dessus est l'ÉCLAIRAGE D'UNE PENTE, pas un dégradé** (446) — un dégradé centre→bord dessine une CIBLE, pas un trou |
| 5 | **la verrerie** : four éteint, râteliers de perles, châssis, manivelle | on ne meuble pas contre le mur (439) |
| 6 | **la pie et son nid** — de dos, tête tournée, envol | le canevas dimensionné **sur ce qui dépasse** (433, payé trois fois) |
| 7 | **le beffroi** : charpente, cloche, abat-son, palier | ⚠️ **la cloche est aussi haute qu'un mur, donc elle se dessine dans la passe des MURS** — le défaut exact de l'orgue au 441, connu d'avance |
| 8 | **la constellation** dans le ciel (ex-« la Lyre », **sans trou et sans compte depuis le 453**) | période et bouclage du motif (434) |
| **9** | ⚠️ **la comète** (`drawStarComet`, 448) — le trait, le flash, l'onde de choc | ⚠️ **un décor d'impact se date à l'IMPACT, pas à l'événement qui l'annonce** : `e.fall` horodate le début de la cinématique, et le cratère a fumé trois secondes avant que la comète touche le sol |
| **10** | ⚠️⚠️ **le navire** (`drawStarShip`, 451) — la cale, les tins, la carcasse sur ber, les cinq morceaux, les fantômes, jour et nuit | ⚠️ **le fantôme se DÉRIVE de la pièce cuite**, jamais dessiné une seconde fois · et le faux canevas des bancs **prémultiplie l'alpha** quand un navigateur ne le fait pas : on mesure la TEINTE, pas la couleur exacte |

⚠️⚠️ **CES TROIS GROS DESSINS VIVENT DANS `fermeArt.js` ET PAS DANS LA BOUCLE, EXPRÈS** — c'est la
seule façon qu'un banc les regarde (`render-etoile`, `render-navire`, `render-beffroi`). Le piège
n°1 du projet, deuxième visage : *un dessin qu'aucun banc ne peut appeler ne se dégrade pas, il
reste au niveau du jour où il a été écrit.*

⚠️ **Le PNJ neuf a disparu du chantier** avec le thème du secret (§3) : un dessin de moins, et
c'était le plus cher.

### BLENDER : NON POUR CETTE PASSE

Le §9 de `CLAUDE.md` a levé l'interdit au 443 : un bitmap est **autorisé**. Il reste **payant**, et
ici il perd :

1. **Le pipeline C n'existe nulle part** — ni chargeur, ni cache, ni convention, ni banc. Le §9 le
   dit : *« c'est un chantier, pas un import »*. Le poser coûterait plus que les huit dessins.
2. **Un bitmap sort du champ des bancs de rendu.** `render-*.mjs` appellent du code ; ils ne
   relisent pas un PNG. Un cratère importé **ne se dégraderait pas, il vieillirait** — le §« il
   fait vieillir » de l'en-tête, et ce chantier ajoute deux bancs de rendu pour ne pas y tomber.
3. **Le cratère et le beffroi doivent rester VIVANTS** : ils changent avec l'heure, la météo, la
   saison, et le cratère change d'état après la fin. Un bitmap fige, ou en demande quatre.
4. **À cette échelle, Blender achète l'ÉCLAIRAGE**, qui exige la passe de calibrage du §8. Mesuré
   au 426 sur la statue de la Justice : **écart-type 24,6 contre 47,7** en référence après deux
   passes — le sprite à la main gagnait.

⚠️ **Ce n'est pas un refus de principe.** Un essai calibré sur le seul cratère (rendu → PNG →
mesure L / écart-type / saturation contre la référence 480×270, comparé au procédural) est
faisable — **hors budget de cette quête**, à demander comme chantier à part.

---

## 8. LE CODE

### `components/ferme/quete.js` — la table et les résolveurs purs

Même forme qu'`enquete.js`, pour la même raison : **une quête = une ligne, pas un `if` de plus
dans un fichier de 24 000 lignes**, et surtout **un banc doit pouvoir l'appeler**. Aucun React,
aucun dessin.

- `STAR_SITES` — chaque lieu avec `zone` + `spot`. ⚠️ **La zone est testée AVANT toute distance** :
  seule parade au piège des deux cartes (§4 de `CLAUDE.md`).
  ⚠️⚠️ **LA COLONNE `shard` A ÉTÉ SUPPRIMÉE AU 453, AVEC `starShards` ET `STAR_SHARD_TOTAL`.** Elle
  marquait « une des QUATRE notes » et portait **un second compte** à côté de celui du navire. Les
  deux étaient justes *dans leur propre liste*, donc aucun banc ne pouvait les voir se contredire —
  et à l'écran, après la plongée du lac, le joueur lisait **trois réponses différentes** à la même
  question. Il n'y a plus qu'un objet compté, d'une seule façon : les morceaux du bateau.
- `STAR_CHAPTERS` — cinq entrées. ⚠️ **`starAdvance` est une BOUCLE, pas un `if`** (leçon du 442).
- **`starGoalKey`** (449) — l'objectif courant, **lu par le bandeau ET par le chevron**. Ils
  dérivaient de deux listes ; les deux étaient vertes et elles se contredisaient. *Une jointure,
  jamais deux listes.*
- **`starGuidePoint`** (449) — où se place le familier meneur.
- ⚠️⚠️ **`STAR_SHIP_PARTS` / `starShipParts` / `starShipBuilt` / `starShipComplete`** (451) — les
  cinq morceaux du navire, **une pure LECTURE des cinq trouvailles**, aucun état de plus. L'ordre
  vit dans `fermeConstants.STAR_SHIP_ORDER`, lu par `quete.js`, par `fermeArt.js` et par le banc :
  une seconde liste aurait peint une voile là où le joueur a trouvé un safran **sans qu'aucun banc
  ne puisse le voir**. ⚠️ `starShipComplete` ≠ `starDone` : les cinq morceaux sont posés dès que la
  cloche a chanté, **la scène finale se joue après** — c'est ce qui laisse le navire s'achever à
  l'écran au lieu d'apparaître d'un coup sur un fondu.
- ⚠️ **`starShipGone(e, voyagerAway)`** (453) — la cale est-elle vide ? Pure, lue par le jeu ET par
  le banc. Le navire reste après la fin ; **Eduardo l'emmène** quand il part en voyage, et le ramène
  (décision de Guillaume, §5). Aucun état, aucun `send()` : `res.trip.phase` circule depuis le 258.
- `newStar()` / `migrateStar(saved)` — reprise **tolérante, pas confiante**.
- `resolveStarShard` · `resolveStarCalm` · `resolveStarLean` · `resolveStarDuet` ·
  `resolveStarGift` — ⚠️ **aucun ne crédite quoi que ce soit lui-même** : ils annoncent, l'hôte
  applique (le double crédit du 431 a coûté un banc dédié).
- `STAR_DEV_OPS` + `devStar(state, op)` — §9.
- **Fenêtres et distances = constantes exportées**, **lues par le jeu ET par le banc**, jamais
  recopiées (§8 de `CLAUDE.md` : ce qui double un autre paramètre est une divergence en attente).

### Réseau — le budget, compté

| moment | `send()` |
|---|---|
| la chute (hôte → tous) | 1 |
| chaque morceau / chapitre franchi | 1 `req` + 1 `apply` |
| le calme du cratère | 1 + 1 |
| chaque lecture d'ombres | 1 + 1 (×4 environ) |
| chaque phrase du duo | 1 + 1 (×6) |
| la scène finale + le don | 1 + 1 |
| **présence** (dos tourné, flaque de lumière, balayage, leurre) | **0** — déduit des positions déjà émises |
| **le compagnon** | **0** — position dérivée du porteur |
| **la Lyre, le ciel, les traces** | **0** — pures fonctions du jour et de l'état partagé |

**≈ 40 messages pour une partie entière**, aucun par image. ⚠️ **Aucun champ ajouté au paquet de
position** — le 432 a trouvé un champ (`sit`) qui circulait sans être lu : des octets pour rien.

### Persistance — décidé

`shared.star`, **un champ de plus dans le JSON de `ferme_saves`** — ⚠️ **AUCUNE MIGRATION SQL,
aucune manipulation Supabase**, exactement comme `townChop` (426), `wardrobe` (427) et `enquete`
(442). C'est le mécanisme réel de la ferme ; `saveGameState` est celui du **jeu courant du salon**
et se perdrait au premier changement de jeu.

**Checkpoints** : chaque chapitre franchi **force une écriture immédiate** (`persistFnRef`, en plus
du minuteur de 3 s). À la reprise, la carte « Où tu en étais ». ⚠️ **Aucune étape acquise n'est
rejouée, aucune n'est sautée visuellement** : on reprend au début du chapitre courant.

### Les bancs — `tools/`

**`tools/verify-quete.mjs`** (remplace `verify-enquete.mjs`) :
1. la chaîne des cinq chapitres : `devStar("all")` atteint la fin **sans sauter un indice** ;
2. `migrateStar` sur une sauvegarde **absente**, **vide**, **abîmée** ;
3. le placement dérivé des six lieux : libre, praticable, **atteignable** (vrai `townFindPath`),
   distinct de tout décor existant ;
4. ⚠️ **les fenêtres solo rejouées image par image** avec la vraie collision et la vraie course :
   il imprime le meilleur temps et **échoue si la fenêtre rend le geste impossible OU si elle est
   si large qu'elle ne demande plus rien** ;
5. l'écart minimal de lecture d'ombres est **réellement franchissable** ;
6. le beffroi : connexe, meublé, **et ses quatre ouvertures voient la ville** ;
7. la liste des niveaux == la liste des arrêts du menu dev, **dans les deux sens** (le défaut du
   442 : quatre arrêts manquants pendant deux zips) ;
8. ⚠️ **aucun résolveur ne crédite d'or** — scan de source **avec le compte de lignes LUES**
   (leçon du 441 : un banc qui compte doit publier ce qu'il a lu, sinon on ne s'aperçoit jamais
   qu'il ne scanne rien) ;
9. ⚠️⚠️ **AUCUN TEXTE N'ÉCRIT UN NOMBRE DE MORCEAUX EN DUR** (453), balayé sur les deux langues,
   avec un témoin positif ET un témoin négatif pour que le motif ne puisse pas se vider en silence.
   Les titres de chapitre sont la seule exception, elle est NOMMÉE, et **elle expire toute seule**
   (un contrôle échoue si le nombre de chapitres change) ;
10. ⚠️⚠️⚠️ **CHAQUE PHRASE DE LA QUÊTE EST AFFICHÉE QUELQUE PART** (453) — il lit les `L.star.…` du
   composant, jamais une liste écrite à côté (qui serait la seconde liste que ce banc interdit).
   **41 des 136 phrases ne l'étaient pas** le jour où il a été écrit ;
11. **le navire part et revient** : entier à la fin, absent pendant le voyage d'Eduardo, et un
   voyage AVANT la fin ne fait pas disparaître un chantier en cours.

**`tools/render-etoile.mjs`** — les huit familles, avec les contrôles de `DESSIN.md` : aucun pixel
sur le bord HAUT, îlots flottant dans un aplat (connexité à 8), échelle contre le fermier, symétrie
déduite d'un centre.

**`tools/render-beffroi.mjs`** — le plan du niveau, sur le modèle de `render-eglise.mjs` : chaque
case atteignable, aucune poche murée, la cloche dans la passe des murs, et la vue plongeante
réellement peinte par les quatre ouvertures.

**`tools/render-navire.mjs`** (451) — la planche des **sept** états (zéro à cinq morceaux **puis la
cale vide**, nuit puis jour). ⚠️ Trois états se ressemblent assez pour qu'on les confonde — « rien
n'a commencé » (carcasse + fantômes), « il est fini » (les cinq morceaux), « il est en mer » (le ber
et les tins, rien d'autre) — et le banc les tient séparés : sans ça, une cale vide qui ressemble au
chantier de la première nuit ferait lire « le bateau a été défait ». ⚠️ **Il est né d'un défaut que trois contrôles verts ne voyaient pas** : le navire était
posé six cases et un muret **au-dessus** du lac, et les trois contrôles disaient « placé,
atteignable, au bord de l'eau — 36 cases d'eau lues ». *Compter une PRÉSENCE n'est pas mesurer une
DISTANCE.* Il mesure donc la distance à l'eau, la marge (sur les côtés et **au-dessus**, jamais en
dessous — la proue doit avoir de l'eau devant elle), le passage laissé sur le quai, et l'échelle
contre le fermier. ⚠️ **Et il mesure la TEINTE, pas la couleur** : le faux canevas prémultiplie
l'alpha là où un navigateur ne le fait pas, donc un contrôle écrit sur `rgba(...)` exact accuse un
dessin juste.

**Ce qu'aucun banc ne verra** : le plaisir. Les six mini-jeux sont joués à l'écran, un par un,
avant d'être considérés finis.

---

## 9. LE MENU DÉVELOPPEUR — CONSTRUIT EN PREMIER

Structure **reprise exactement** de la section « 🔍 Enquête » (⌘⇧X → `devEnq`), renommée
**« ⭐ Star »** :

| bouton | ce qu'il fait |
|---|---|
| **Reset** | `newStar()` — un objet neuf, jamais un défaire pièce à pièce |
| ⚠️ **Hand me the plans** (454) | donne le sillon, le cratère et **les plans rendus** — sans quoi juger le plan et le fantôme coûte dix-huit minutes d'attente |
| ⚠️ **Deliver all the timber** (454) | livre les cinq pièces de bois **et rien d'autre** : les deux moitiés (souvenir / bois) restent distinctes, sinon on ne saurait plus laquelle manque à l'écran |
| **Start** | joue la chute et ouvre le chapitre 1 |
| **Finish chapter** | donne exactement ce qui manque au chapitre COURANT |
| **Skip ahead** | avance d'un chapitre entier, scène comprise |
| **Give a hint** | rejoue le marquage du lieu courant |
| **All but the end** | tout jusqu'au pied du beffroi — s'arrête avant le duo |
| **Play scene…** | rejoue une cinématique isolée (chute · retournement · finale) — **c'est ce bouton qui rend la boucle de qualité tenable** |
| **+ arrêt de téléport** | `churchTower` (et le banc compare les deux listes) |

⚠️⚠️ **AUCUN NE DONNE RIEN.** Le menu s'ouvre à tout joueur qui connaît le raccourci (398). Le
chemin développeur appelle **les mêmes résolveurs** et **jette** ce qu'ils rendent, `resolveStarGift`
compris.

⚠️ **Il est construit AVANT la première scène** : sans lui, revoir la finale coûte cinquante
minutes, donc personne ne la reverrait.

---

## 10. ÉTAT D'AVANCEMENT

| étape | conçu | codé | **regardé à l'écran** | validé |
|---|---|---|---|---|
| **Retrait de l'enquête 442** | ✅ | ✅ | — | — |
| **`quete.js`** — table, résolveurs, dev-ops | ✅ | ✅ | ✅ (banc) | — |
| **Textes** — ⚠️ **une table pour deux langues jusqu'au 450**, deux tables depuis | ✅ | ✅ | ✅ | — |
| **Beffroi** (`churchTower`, 3ᵉ niveau d'église) | ✅ | ✅ | ✅ | — |
| **Placement** cratère / verrerie / nid / sillon | ✅ | ✅ | ✅ (cratère, beffroi) | — |
| **Hôte** — 5 requêtes, une sortie, checkpoint forcé | ✅ | ✅ | ✅ | — |
| **Menu dev ⭐ Star** + arrêt beffroi + « rejouer une scène » | ✅ | ✅ | ✅ | — |
| Sprites (**10** familles) | ✅ | ✅ | ✅ (compagne, beffroi, cratère, comète, navire) | — |
| **Mise en scène** (chute, cartes, retournement, finale) | ✅ | ✅ | ✅ chute + carte · ⚠️ **turn/end : non** | — |
| **Les cinq mini-jeux** | ✅ | ✅ | ✅ **dessinés** · ⚠️ **aucun joué jusqu'à la victoire** | — |
| **Interface** (navire, bandeau, compagnon, ciel, reprise) | ✅ | ✅ | ✅ (sauf la Lyre, jamais vue de nuit) | — |
| **Bancs** (`verify-quete`, `render-etoile`, `render-beffroi`, `render-navire`) | ✅ | ✅ | ✅ | ✅ |
| **Docs** (`README.md` §25, `CLAUDE.md`, `tools/README.md`) | ✅ | ✅ | — | — |
| **445 — la chute VUE** (file d'attente, rattrapage, caméra sur l'impact) | ✅ | ✅ | ✅ | ✅ |
| **445 — le CHEVRON** (repère directionnel de quête) | ✅ | ✅ | ✅ | ✅ |
| **446 — le cratère refait sur modèle** (relief éclairé, fissures, chaleur, enfoncement) | ✅ | ✅ | ✅ **planche + en jeu** | ✅ |
| ⚠️⚠️ **La quête à DEUX CLIENTS** — 458 : deux clients ont enfin tourné ensemble | ✅ | ✅ | ⚠️ **la CHUTE, la connexion, et le CRATÈRE ouvert à un seul** · ❌ le reste de la coopération | ⚠️ |
| **448 — la comète VISE** (impact daté à l'impact, onde de choc, `drawStarComet`) | ✅ | ✅ | ✅ | ✅ |
| **449 — le cratère BRÛLE** (fond en fusion, blessure 10 min, retour maison) | ✅ | ✅ | ✅ **en jeu, chaud ET froid** | ✅ |
| **449 — le bandeau dit l'OBJECTIF** (`starGoalKey`, une source pour le bandeau et le chevron) | ✅ | ✅ | ✅ | ✅ |
| **449 — le familier MÈNE** (G, ou seul après 2 min 30 ; invariant balayé sur 164 positions) | ✅ | ✅ | ✅ | ✅ |
| ⚠️⚠️ **451 — LE NAVIRE** (pisteur, 5 morceaux, fantômes, chantier naval, zéro état de plus) | ✅ | ✅ | ✅ **planche + en jeu** | ✅ |
| ⚠️⚠️ **451 — LA QUÊTE PARLE FRANÇAIS** (`fr` contenait `star: STAR_EN`) | ✅ | ✅ | ✅ | ✅ |
| ⚠️⚠️ **451 — la FICTION change** : la lyre → le bateau | ✅ | ✅ (chaînes + navire) | ✅ | ⚠️ **`QUETE.md` n'a suivi qu'au 452** |
| ⚠️⚠️ **453 — LE COMPTE DE MORCEAUX, UNE SEULE RÉPONSE** (`STAR_SHIP_TOTAL` partout, `shard` supprimé, banc qui refuse tout nombre en dur) | ✅ | ✅ | ⚠️ **banc seulement** | ✅ |
| ⚠️⚠️⚠️ **453 — LES 41 PHRASES MUETTES SONT BRANCHÉES** (la rencontre, la cloche, le don, 2 traces, `fall.quiet`…) | ✅ | ✅ | ⚠️ **banc seulement** | ✅ |
| ⚠️⚠️ **453 — LE NAVIRE PART AVEC EDUARDO** (`starShipGone`, cale vide, textes de fin réécrits) | ✅ | ✅ | ✅ **planche** · ⚠️ **pas en jeu** | ✅ |
| ⚠️ **453 — LA LYRE NE COMPTE PLUS** (constellation simple, plus de trou, plus de second compteur) | ✅ | ✅ | ❌ **jamais vue de nuit** | — |
| ⚠️ **453 — `STAR_SHIP_NEAR_R` supprimée** (constante que seul le banc lisait) | ✅ | ✅ | — | ✅ |
| ⚠️⚠️ **454 — LA PORTE** (Eduardo + Tristan actifs + 4 artisans, `starFallGate`) | ✅ | ✅ | ⚠️ **banc seulement** (le menu dev la franchit) | ✅ |
| ⚠️⚠️⚠️ **454 — L'INGÉNIEUR ET LES PLANS** (mairie, 3 monnaies, 3 min de voyage, 15 min de travail) | ✅ | ✅ | ✅ **le plan et son panneau** · ❌ **Kerguélen en personne** | ⚠️ |
| ⚠️⚠️⚠️ **454 — LE FANTÔME EST GAGNÉ** (plus de silhouette gratuite ; P au bord du lac) | ✅ | ✅ | ✅ **en jeu, les deux états** | ✅ |
| ⚠️⚠️⚠️ **454 — LE BOIS DE TRISTAN** (5 commandes dans l'ordre, `found ∧ wood`, la fin attend) | ✅ | ✅ | ⚠️ **banc seulement** | ⚠️ |
| ⚠️⚠️ **454 — LE SILLON DÉMÉNAGE ET A UNE PHYSIQUE** (pré nord, relief éclairé, bourrelet fibreux, enfoncement) | ✅ | ✅ | ✅ **planche + en jeu** (2 défauts trouvés et corrigés) | ✅ |
| ⚠️⚠️ **454 — LA CHUTE EST TROIS FOIS PLUS LENTE** (sauf à l'absolue fin) | ✅ | ✅ | ✅ **la scène joue** · ⚠️ **la lourdeur reste à juger à l'œil** | ⚠️ |
| ⚠️⚠️⚠️ **458 — AUCUNE CONFIGURATION DE JOUEURS NE BLOQUE PLUS** (`starAlone` par geste, chemin solo toujours ouvert) | ✅ | ✅ | ✅ **reproduit puis corrigé à DEUX clients** | ✅ |
| ⚠️⚠️ **458 — les cartes et les scènes attendent un écran libre** (plus de carte par-dessus un mini-jeu) | ✅ | ✅ | ⚠️ **banc + relecture** | ⚠️ |
| ⚠️⚠️ **458 — LE CRATÈRE EST 1,56× PLUS LARGE, ON Y GLISSE, ON PEINE À EN SORTIR** (+ poussière marron/grise) | ✅ | ✅ | ✅ **en jeu** (un MUR trouvé et corrigé) | ✅ |
| ⚠️⚠️⚠️ **458 — LA PLONGÉE EST REFAITE** (la flaque est le terrain, les pilotis penchent) | ✅ | ✅ | ✅ **monté isolément** | ⚠️ **jamais joué jusqu'à la victoire** |
| ⚠️⚠️ **458 — LE REFROIDISSEMENT EST POLI** (arrosoir qui verse, anneau à la couleur visée, fêlure vue) | ✅ | ✅ | ✅ **monté isolément** | ⚠️ **idem** |
| ⚠️⚠️ **458 — CHAQUE ÉTAPE DIT POURQUOI ELLE SERT LE BATEAU** (6 phrases + leurs lecteurs) | ✅ | ✅ | ✅ `fall.split` et `whyLean` vus en jeu · ⚠️ les autres au banc | ⚠️ |
| ⚠️⚠️ **458 — LA TRANSACTION DE L'INGÉNIEUR EST EXPLICITE** (3 provenances, Ajouter / Valider, refus chiffré) | ✅ | ✅ | ❌ **pas encore regardée** | ❌ |
| ⚠️ **458 — L'ÉTOILE GRIMPE, TOURNICOTE, SE POSE** (`starJoinAnim`, courbe pure et continue) | ✅ | ✅ | ⚠️ **banc seulement** | ⚠️ |

### Ce qui est vérifié à ce stade

| | |
|---|---|
| `npx next build` | ⚠️ **PAS RELANCÉ AU 453 : un `npm run dev` tournait dans le dossier** (§10 de `CLAUDE.md` — les deux écrivent dans le même `.next/`, et le faux négatif coûte une demi-session). `verify-syntax` a servi de contrôle de remplacement. Vert au 452 |
| `verify-syntax` | tout se parse, JSX compris |
| `verify-strings` | **1104 clés appariées** (relancé le 2026-08-31 ; il annonçait 1082 depuis le 452) — ⚠️ **et depuis le 451 il vérifie aussi les VALEURS** : aucune section identique mot pour mot dans les deux langues. C'est ce contrôle qui manquait, et son absence a laissé passer six zips de quête en anglais des deux côtés |
| **`verify-quete`** | **433/433** (lancé au 458 ; 413 au 456, 345 au 454, 294 au 453, 284 au 452, 220 au 446, 177 pendant la séance du 444) |
| `verify-vallee` | **205/205** (relancé au 458) |
| **`render-beffroi`** | **28/28**, planche `beffroi-plan.png` |
| `render-etoile` | tous contrôles verts, 3 planches |
| **`render-navire`** | tout vert, planche `navire.png` (**2176×572**, zéro à cinq morceaux **puis la cale vide**, nuit puis jour) |
| les **35** bancs du dépôt (16 de contrôle, 19 de rendu) | **tous verts, lancés un par un au 458** |
| `npx next build` | ⚠️ **`✓ Compiled successfully`** au 458 (l'arrêt sur `supabaseUrl is required` est préexistant, §10 de `CLAUDE.md`) |
| **séance de jeu réelle, un client** | chute · carte de chapitre · pisteur · rappel de reprise · compagne · beffroi · les cinq mini-jeux dessinés · le navire sur sa cale |

⚠️ **Les chiffres ci-dessus ont été obtenus en LANÇANT les bancs au 452**, jamais recopiés (§14.6
de `CLAUDE.md`). Les précédents étaient périmés de trois zips.

### ⚠️⚠️ CE QUE LA SÉANCE DE JEU A TROUVÉ, ET QUE SIX BANCS VERTS N'AVAIENT PAS VU

**Dix défauts, dont cinq rendaient un lieu inatteignable.** Le tableau complet est au §25 de
`components/ferme/README.md` ; en une phrase : les bancs mesuraient tous la bonne chose, et aucun
ne mesurait **l'arrivée**. Les dix sont corrigés et figés — `verify-quete` est passé de 163 à
177 contrôles pendant cette seule séance.

⚠️ **Et le piège du banc de navigateur a encore mordu**, alors qu'il est écrit au §10 de
`CLAUDE.md` et qu'il avait été relu : panneau masqué, `rAF` ne tourne que pendant une capture, le
personnage n'avance pas et les mini-jeux sautent des manches entières entre deux clichés. ⚠️ **Le
remède du §10 — remplacer `rAF` par un `MessageChannel` — a FIGÉ l'onglet** écrit naïvement : un
relais qui se repose un message à chaque image tourne en boucle serrée. *Il lui faut un frein.*
**La parade qui a marché est ailleurs : monter les cinq mini-jeux ISOLÉMENT** sur une page jetable
(`StarMinigame` est exporté pour ça), où il n'y a ni monde ni caméra à faire tourner.

---

## 11. DÉCISIONS PRISES

0. ⚠️⚠️ **LA FICTION MOTRICE EST UN BATEAU, PLUS UNE LYRE** (450-451, Guillaume). *« Construire un
   bateau magique avec les étoiles. Une fois qu'on les récolte toutes […] on arrive à bâtir un grand
   navire qui permettra de prendre le large et d'amarrer sur des îles, dans le futur. »* Et le refus
   qui l'a précédée : *« construire une lyre, c'est un peu arbitraire ? »* — **une lyre est un objet
   d'adulte.** Voir §1 et §2.
0 bis. ✅ **Le navire est le PISTEUR**, pas un décor de fin (451) : cinq morceaux, ceux qui manquent
   peints en fantôme à leur place exacte. **Aucun état ajouté** — c'est une lecture des cinq
   trouvailles. Et **le chantier naval est un lieu de la ville**, qui existe sans la quête.
1. ✅ **L'enquête 442 est retirée entièrement.**
2. ✅ **`shared.star` dans `ferme_saves`** — aucune manipulation Supabase.
3. ✅ **Le beffroi est un troisième niveau d'église** (`churchTower`, alt 2).
4. ✅ **Le cratère est dans le pré**, dérivé du parc, en (128,117) — mesuré, disque entier libre.
5. ✅ **Blender : non** pour cette passe (§7), essai calibré possible en chantier séparé.
6. ✅ **Aucune mécanique coopérative empruntée.** La coopération sort de la mécanique elle-même,
   pas d'un verrou copié sur un autre jeu.
7. ✅ **Thème : quête magique SECRÈTE** (§3). Aucun nouveau PNJ, aucun panneau d'annonce.
8. ✅ **Pendant le duo, ce qui traverse le réseau est la PRÉSENCE, pas la performance**
   (`STAR_DUET_ALONE_MUL`). Une visée image par image coûterait un message par image, c'est-à-dire
   le plafond de 10/s crevé par un seul joueur — et dépassé silencieusement. Ce qui circule déjà,
   c'est *où est l'autre* : le faisceau faiblit quand il quitte son poste. Coopération réelle,
   zéro message. ⚠️ **C'est un écart assumé à la conception du §5**, et il est écrit ici pour
   qu'on ne le redécouvre pas comme un oubli.

---

## 12. REPRISE — OÙ ÇA EN EST, ET PAR OÙ CONTINUER

⚠️ **Rien n'est committé.** Tout est en fichiers modifiés / non indexés, prêt à relire.

### 12.0 ⚠️⚠️⚠️ ZIP 459 — ON PERD PIED, ON DÉVALE, ON S'AGRIPPE

**Demande de Guillaume, mot pour mot :** *« ajouter une animation réelle poussée montrant
le personnage qui climb up et glisse du cratère. ça doit être très beau et logique.
nouveau mouvement pour le perso du fermier qui doit lean back et slide quand il glisse
rendant la trajectoire difficile à contrôler avant d'atteindre le fond. Ensuite il peut se
déplacer sur ses pieds dans le cratère. Et si l'on veut remonter, il tentera de le faire
debout, avant de glisser encore. Et au bout de 3 pleines secondes de maintien d'une
direction, l'anim grimpeur avec les bras et jambes s'activera et il pourra grimper jusqu'en
dehors du cratère = sensation d'effort renforcée pour le joueur. »* Puis, en cours de
route : *« la poussière doit être autour des pieds, pas de la tête aussi »* et *« rends
plus explicite la commande auprès de Tristan — il faut une bulle spéciale où l'on voit
Tristan se mettre au travail. »*

#### ⚠️⚠️⚠️ LA QUESTION QUI A DÉCIDÉ DE TOUT : UNE GRAVITÉ PERMANENTE AURAIT SUPPRIMÉ LE CHAPITRE 2

La cuvette est un **paraboloïde** (`1 − u²`) : sa pente est proportionnelle au rayon, donc
elle n'a **pas de fond plat** — mesuré au banc, 1,2 px/case de pente à une demi-case du
centre. Une poussée permanente aurait donc entonné le fermier jusqu'au point unique du
milieu, c'est-à-dire **à distance nulle de l'étoile**, là où `starFacingAway` rend `false`
par construction (« debout SUR elle : on la regarde forcément »). La seule mécanique du
lieu — se tenir immobile, dos tourné — serait devenue **inexécutable**, et le symptôme
aurait été « la jauge ne monte plus jamais », sans une seule erreur nulle part.

**La parade vient des jeux qui ont déjà ce geste** (l'escalade des pentes de *Breath of the
Wild*, les dévers de *Death Stranding*) : **on ne perd pas pied parce qu'on est sur une
pente, on perd pied parce qu'on la SOLLICITE.** Debout, sans rien demander, le personnage
plante ses talons — c'est une posture, et elle se DESSINE (`drawStarBrace`). Dès qu'il
marche sur la paroi raide, ses appuis partent. Comme on ne peut pas ENTRER dans le trou
sans marcher, **la glissade se joue à 100 % des entrées**.

⚠️ **Ce que ça ne fait pas, et c'est écrit plutôt que subi** : un fermier lâché immobile en
plein milieu de la paroi y RESTE, jambes écartées, au lieu de partir tout seul. C'est la
seule liberté prise avec la physique ; elle est visible, et elle est le prix exact du
chapitre 2.

#### Les cinq états (`starSlipStep`, `quete.js` — pur, sans React ni canevas)

| état | ce que le joueur voit | ce qui en sort |
|---|---|---|
| `foot` | il marche | pente < 4,2 px/case, ou aucune touche |
| `brace` | il pousse en montant, il **gagne** du terrain | 420 ms, puis les appuis lâchent |
| `slide` | **il dévale**, épaules en arrière, poussière aux pieds | pente douce **et** vitesse < 0,9 |
| `recover`| il se rétablit, un quart de seconde | 260 ms |
| `climb` | **bras et jambes**, cramponné, rien ne le reprend | il lâche, ou il sort de la cuvette |

**Les nombres, tous mesurés sur le vrai creux, jamais réglés à l'œil :**

| grandeur | valeur | ce qu'elle achète |
|---|---|---|
| plancher marchable | **1,55 à 2,80 case** de rayon (cuvette : 3,50 à 4,75) | « il peut se déplacer sur ses pieds » |
| crête de la glissade | **4,0 cases/s** (marche : 5,2) | « un peu rapide », jamais éjecté |
| déviation latérale | **0,68 case** sur une chute entière | on VISE, on ne PILOTE pas |
| freinage à contresens | **0,04 case** | on ne s'arrête pas |
| effort avant la prise | **3 000 ms** de la même direction | le mot de la demande |
| sortie, pire cas | **4,7 s** depuis n'importe quel point, **0 bloqué sur 317** | *on sort toujours* |

#### ⚠️⚠️ CE QUE LE BANC MESURE MAINTENANT : IL **JOUE**, IL NE CALCULE PLUS

Le 458 vérifiait une inégalité (« marche en montée − glissade ≥ 1 case/s »). C'était un
raccourci algébrique vers la vraie question, et la vraie question est celle que le §25 de
`ferme/README.md` reproche à tous les bancs du dépôt de ne jamais poser : **est-ce qu'on
ARRIVE ?** `render-etoile` §7 prend maintenant `starSlipStep`, lui donne le VRAI creux
(`starCraterSink`), tient une direction à 60 images/seconde depuis 317 points de départ, et
regarde si le fermier sort du trou.

⚠️ **Et ça a payé avant même d'être écrit en banc.** Le premier jet du moteur gageait le
compteur d'effort sur « est-ce que je monte ? ». Or en dévalant on **dépasse** le point bas
de quelques centimètres : la pente s'inverse sous les pieds, le pas tenu devient « une
descente », et le compteur repartait de zéro. Résultat mesuré : 2,0 s atteintes, jamais
3,0 — donc **la grimpe n'existait pas** et **219 points de départ sur 317 ne pouvaient plus
sortir du cratère**. *Une grandeur qui décrit le JOUEUR ne doit pas dépendre du TERRAIN.*

#### Les trois poses (`fermeArt.js`, donc regardables — `tools/out/etoile-poses.png`)

Elles sont **découpées dans la feuille du personnage**, jamais repeintes : c'est la
décision de `drawSeated` (428) reprise mot pour mot, et c'est ce qui leur fait hériter
gratuitement de la salopette, de la combinaison d'apiculteur et de la garde-robe. Aucun
`translate`, aucun `rotate` — l'inclinaison se fait par **cisaillement** (trois bandes
horizontales décalées), ce qui est de toute façon ce qu'on ferait à la main.

⚠️ **Trois pièges payés en les écrivant**, tous vus par la planche du banc et par aucune
relecture : les bras posés « deux pixels à gauche de l'ancre » se retrouvaient à **cinq
pixels du corps** (la silhouette occupe x 3..13 dans sa case de seize) ; le cycle de grimpe
était **homolatéral** (bras gauche ET jambe gauche en l'air — un lézard) ; et le banc
lui-même lisait les rangées 1 et 2 d'une feuille de personnage, **qui sont vides sous le
faux canevas** (`charSheet` les empile avec `translate`, que le faux canevas ignore) —
quatre contrôles rouges, zéro défaut.

#### La poussière, et Tristan

⚠️ **La poussière est aux pieds** (retour de Guillaume) : l'ancre d'un sprite de 24 px tombe
à la **ceinture**, et une bouffée qui montait de sept pixels culminait donc à hauteur de
crâne. Elle est décalée de 14 px vers le bas (les semelles), sa montée est rabotée, et elle
**s'étale** au lieu de gonfler (une ellipse couchée) — la rendre plus petite pour la garder
basse l'avait fait tomber sous le seuil du banc. Un contrôle neuf mesure ce qu'aucun des
cinq autres ne mesurait : **où** elle est, pas ce qu'elle est.

⚠️ **Tristan se met au travail, et on le voit.** Commander fermait un panneau et faisait
passer une ligne de chat ; le bûcheron continuait d'abattre ses arbres comme si de rien
n'était. Deux temps, **un seul état** (`wood[k].at`, déjà écrit) : il ACCEPTE (une phrase
qui nomme la pièce, six secondes), puis il TRAVAILLE — une bulle où **la scie va et vient**
(le temps) et où **le trait de scie s'enfonce** (l'avancement), jusqu'à la livraison. Zéro
champ de plus, zéro message de plus.

#### Ce qui n'a PAS été regardé à l'écran

⚠️ La séance de jeu de ce zip a validé le cratère **à un client**. N'ont pas été rejoués :
la glissade **vue par l'autre joueur** (`starSlipSeen` est confrontée au moteur au banc,
209 images sur 209 — mais jamais à deux écrans), et la bulle de Tristan **sur une ferme
peuplée** (elle a été regardée au banc et sur une ferme vide).

### 12.0 bis ⚠️⚠️⚠️ ZIP 458 — LA QUÊTE NE SE BLOQUE PLUS QUAND UN AMI SE CONNECTE

**Demande de Guillaume, en cinq points :** vérifier la quête À DEUX JOUEURS et régler
ce qu'on y trouve ; agrandir le cratère de Valley Town avec une vraie glissade ; polir le
refroidissement et refaire la plongée, « trop cheap pour le niveau de la quête » ; et
justifier chaque étape par rapport au bateau. Puis, en cours de route : rendre la
transaction de l'ingénieur explicite, et dire que ce qui tombe à la ferme n'est qu'un
éclat.

#### ⚠️⚠️⚠️ LE PLUS GROS DÉFAUT DU CHANTIER ÉTAIT UNE LIGNE, ET IL FALLAIT DEUX CLIENTS POUR LE VOIR

> `starSoloRoom()` répondait **« y a-t-il un autre joueur CONNECTÉ »** et servait à
> répondre à **« puis-je avancer tout seul »**.

Les deux questions n'ont jamais eu la même réponse. Conséquence, mesurée puis **reproduite
en jeu à deux clients** : un joueur B qui laboure tranquillement à la ferme rendait, pour A
resté en ville,

| ce qui cassait | ce que ça coûtait |
|---|---|
| **le cratère ne s'ouvrait plus JAMAIS** — `resolveStarCalm` exigeait une seconde tenue qui ne pouvait pas exister | la jauge se remplissait **jusqu'à 100 %** et il ne se passait rien. *Une barre qui promet et ment* — le défaut que le 456 venait de corriger, refait un cran plus haut |
| **les deux croisements d'ombres devenaient impossibles** — `resolveStarLean` cessait de compter ses propres lectures | **les chapitres 3, 4 et 5 inatteignables**. La quête s'arrêtait au chapitre 2 *parce qu'un ami s'était connecté* |
| **la flaque de la plongée** se figeait au centre et rétrécissait au rayon « à deux » | le morceau se dessinait **hors du découpage** : invisible dès que la lumière dérivait |
| **le refroidissement devenait plus FACILE** (bande × 1,4) par la présence d'un joueur à l'autre bout du monde | l'inverse de ce que la bande large veut dire |

**La parade est structurelle, pas un réglage.** Le duo est un **RACCOURCI**, jamais une
serrure : le chemin solo reste ouvert en permanence dans les deux résolveurs, et
`starAlone(kind)` ne décide plus *si l'on peut* mais **quel barème on annonce et quelle
variante on joue** — par GESTE, et en testant la zone avant les distances.
⚠️ **Le pire qu'une erreur puisse désormais coûter est une phrase mal choisie**, plus
jamais une quête arrêtée.

⚠️⚠️ **ET LE BANC ÉTAIT VERT PARTOUT, PARCE QU'IL CHOISISSAIT LUI-MÊME LE PARAMÈTRE
COMMODE** : il jouait le cratère avec `solo = true` et les ombres avec `solo = false`,
c'est-à-dire dans les deux seuls mondes où ils marchaient. *Un banc qui choisit son propre
réglage ne mesure pas une mécanique, il mesure son réglage.* Il balaie maintenant **les deux
valeurs sur les deux gestes** (`verify-quete`, 413 → **433**).

#### ⚠️⚠️ UNE CARTE DE CHAPITRE N'ARRIVE PLUS SUR L'ÉCRAN DE QUELQU'UN QUI JOUE

A refroidit son morceau à la ferme, le chapitre 1 se ferme — et B, quarante mètres sous le
lac, mini-jeu ouvert, recevait une **carte plein écran par-dessus**. Le mini-jeu continuait
de tourner derrière (il a son propre `rAF`) : B perdait la manche sans avoir rien fait.
**Aucun banc ne peut voir ça — il faudrait deux écrans.** Les cartes ET les scènes
(retournement, finale) passent maintenant par une file qui attend un écran libre ; quand
l'écran EST libre, rien ne change (la scène part dans la même image).

#### LE CRATÈRE : PLUS GRAND, ET ON GLISSE DEDANS

- **4,5 → 7,0 cases de rayon**, et le nombre n'est pas choisi à l'œil : le balayage en
  spirale a été rejoué sur la vraie carte, rayon par rayon. **7,0 est le dernier qui garde
  l'ancre exacte (128, 117)** ; à 8 il glisse d'une case, à 9 **il n'y a plus de place** et
  le cratère disparaît. Profondeur portée à 17 px (sinon un trou plus large est une
  assiette), fissures **dérivées** (× 1,69) au lieu d'être réglées.
- **La glissade** est une VITESSE, jamais une collision ni une altitude — la leçon du 439 et
  du 441 réunies, appliquée une quatrième fois. Elle ne s'applique **qu'en marchant** (plus
  une demi-seconde d'élan) : une pente qui pousse en permanence aurait rendu impossible la
  seule mécanique du lieu, *se tenir immobile, dos tourné*.
- ⚠️⚠️ **ET LE PREMIER RÉGLAGE A FAIT UN MUR — TROUVÉ EN JOUANT, PAS AU BANC.** Glissade 3,2
  contre 45 % de vitesse en montée : le fermier montait à 2,34 cases/s et la pente le
  reprenait à 3,2. **Il ne pouvait plus entrer dans le cratère du tout.** Un mur fait de
  vitesse : `canStandTown` n'est jamais consulté, le build compile, et les six contrôles
  étaient verts — *ils mesuraient la glissade et la peine SÉPARÉMENT, jamais leur SOMME.*
  C'est la septième forme du défaut de banc de `CLAUDE.md`. L'invariant est écrit et balayé
  sur 5 326 points : **en marchant droit vers le haut, on gagne du terrain, partout.**
- **La poussière** (marron = la terre arrachée, qui retombe ; gris = la cendre du fond, qui
  monte) vit dans `fermeArt.drawStarDust`, donc **regardable dès le jour de son écriture**.
- ⚠️ **Pas d'élan tant que le trou brûle** : la brûlure commence à 3,5 cases pour une cuvette
  de 4,9, et un élan d'une demi-seconde pouvait pousser dans le feu quelqu'un qui venait
  d'arrêter de marcher. *Le jeu ne punit plus un geste qu'on n'a pas fait.*

#### LA PLONGÉE : LA FLAQUE N'EST PLUS UNE FENÊTRE, C'EST LE TERRAIN

Reproche de Guillaume : *« trop cheap »*. Il avait raison, et la cause était précise — **la
flaque de lumière ne servait qu'à découper une vignette.** On jouait aussi bien les yeux
fermés sur le côté droit de l'écran, et la moitié coopérative ne changeait rien à ce qu'on
faisait. Désormais :

- **hors de la flaque : écran noir, souffle × 2,4, et on percute des pilotis qu'on ne pouvait
  pas voir.** « A éclaire le chemin de B » cesse d'être une image et devient la règle ;
- **les obstacles cessent d'être des obstacles** : ce sont les pilotis du VIEUX ponton, et
  dans la lumière ils **penchent vers le morceau**, sans ajouter un seul objet ;
- une **flèche** ramène vers la lumière quand on en sort (sans elle, sortir est un coup de
  dés), le morceau se dessine **sur la ligne du plongeur** (il tombait sur le bord du
  découpage, donc invisible à deux), et on **entre dans l'eau DANS la lumière**.

#### LE REFROIDISSEMENT : L'OUTIL EST À L'ÉCRAN, ET LA CONSIGNE EST UNE COULEUR

- **L'arrosoir apparaît et il verse** — `QUETE.md` disait « le joueur a déjà l'outil et il
  l'aime », et l'outil n'était nulle part ;
- **l'anneau autour de l'éclat est peint à la couleur VISÉE** : quand l'éclat a la couleur de
  son anneau, on est dedans. C'était la contradiction du jeu — sa difficulté voulue est que
  la vapeur masque la jauge, mais la jauge était la SEULE lecture ;
- la fêlure **se voit** au lieu de se lire, et le bandeau de message **descend sous le
  sujet** (il était au milieu, c'est-à-dire pile sur ce qu'on regarde, depuis le 444).

#### LA NARRATION : CHAQUE ÉTAPE DIT POURQUOI ELLE SERT LE BATEAU

Même remède qu'au 457, étendu à toute la quête. Six phrases neuves, chacune avec son chemin
d'affichage écrit le même jour :

| où | ce qui manquait | ce qui est dit |
|---|---|---|
| la chute, à la ferme | rien ne reliait la fracture VUE en vol à ce qu'on trouvait ensuite | `fall.split` — « ce n'est qu'un éclat, le gros est passé au-dessus, vers Valley Town » ⚠️ **jointure sur `starFragmentsOn`, la fonction même qui décide si la comète se fend à l'écran** |
| le sillon ramassé | on lisait « il penche vers l'est » sans savoir qu'il y avait autre chose ailleurs | `s1.fragment` — le vrai cratère est du côté de Valley Town |
| l'écoute des ombres | on obéissait à une règle magique sans savoir d'où elle venait | `s2.whyLean` — *elle tombait aussi, elle avait les yeux fermés ; tout ce qui a une ombre les a vus passer* |
| le lac | **rien ne disait pourquoi ce morceau est dans une eau noire** | `s3.why` (le safran : une coque sans safran ne va nulle part), `s3.whyDark` (le vieux ponton est encore debout là-dessous), `poolHint` réécrite sur la grammaire |
| la verrerie / le nid | deux morceaux, aucun usage dit — et le nid s'ouvrait **sans un mot** | `s4.whyMast`, `s4.whySail` |
| la cloche | « un bateau qui ne peut pas sonner » est joli et ne s'explique pas | `s5.whyBell` — *ce qui dit où l'on est quand on n'y voit plus rien* ⚠️ **elle rime avec le lac : le dernier morceau s'explique par le troisième** |

#### LA TRANSACTION DE L'INGÉNIEUR, ET L'ARRIVÉE DE L'ÉTOILE

- ⚠️⚠️ **« Il me dit que je suis short alors que je crois tout avoir »** — et il avait raison
  de le croire : l'or venait de la **caisse commune**, les récoltes et les poissons de **son
  sac**, et rien ne le disait. Le refus tenait en une ligne qui ne nommait ni quoi ni combien.
  Le guichet est maintenant une **transaction** : trois lignes `j'ai / il faut` avec leur
  provenance, un bouton **Ajouter** par ligne, un **Valider** qui reste gris tant qu'il
  manque quelque chose — et le refus de l'hôte énumère les manques. ⚠️ **Les poissons puisent
  aussi dans la réserve commune**, comme le bois de Tristan depuis le 454 : c'est là que le
  pêcheur dépose sa pêche. ⚠️ La mise est **locale** : poser une pièce ne prélève rien et ne
  traverse pas le réseau ; l'hôte recompte tout au moment du `Valider`.
- ⚠️ **L'ÉTOILE ARRIVE AU LIEU D'APPARAÎTRE** (demande de Guillaume) : elle **grimpe le long
  du dos** depuis le sol (1,1 s), **tournicote une seconde** autour du fermier — un tour et
  demi, en passant derrière puis devant — puis **se pose**. C'est une courbe PURE
  (`starJoinAnim`), donc un banc la balaie image par image ; le premier réglage sautait de
  **cinq pixels** entre la montée et le tour, ce qu'aucune capture fixe ne montre. Les trois
  temps se raccordent maintenant **par construction** : le tournicotage est écrit une fois,
  les deux autres LISENT ses bornes.

#### CE QUI A ÉTÉ VU À L'ÉCRAN, ET CE QUI NE L'A PAS ÉTÉ

| vu en jeu, à DEUX clients | vu en jeu, à un client | mesuré au banc seulement |
|---|---|---|
| ⚠️⚠️ **le cratère s'ouvre pour A pendant que B est à la ferme** (le blocage n°1, reproduit puis corrigé) | le cratère agrandi, la brûlure, le mur de la glissade puis sa correction | le croisement d'ombres à deux barèmes |
| deux clients connectés sur la même ferme | `fall.split`, `s2.whyLean`, la rencontre | l'arrivée de l'étoile (la courbe) |
| | le refroidissement poli (arrosoir, anneau, pastilles) | la file des cartes de chapitre |
| | la plongée réécrite (flaque, pilotis, fantômes penchés) | la transaction de la mairie |

⚠️ **La séance a aussi rappelé pourquoi la recette du §10 de `CLAUDE.md` existe** : le
`requestAnimationFrame` remplacé par un puits TUE la boucle définitivement (rien ne la
rappelle), et le rechargement de page **perd l'état de la quête** — le faux Supabase ne le
persiste pas. Prévoir de rejouer `▶ Start` après chaque rechargement.

---

### 12.0 ter ⚠️⚠️⚠️ ZIP 456 — ON PARLE À QUELQU'UN QUI S'ARRÊTE, ET LE CRATÈRE RÉPOND

**Trois retours de Guillaume, tous livrés, et le troisième a découvert un défaut de fond.**

| ce qu'il a dit | ce qui a été fait | où ça vit |
|---|---|---|
| « le point d'exclamation est un peu gros » | **11×13 → 9×11.** Sur une tête de 16 px, l'ancienne bulle en couvrait les deux tiers : elle lisait comme une étiquette posée sur le PNJ, pas comme sa réaction. Le sursaut n'a pas bougé — c'est lui qui la fait remarquer, pas sa taille | `drawEmoteBubble`, `fermeArt.js` |
| « les indices sont difficiles à lire car ils sont en mouvement. Ils pourraient s'arrêter devant nous pour nous parler ? » | **Il s'arrête, il se tourne vers toi, et il parle tant que tu es là.** La fenêtre périodique du 455 a disparu avec son problème : on s'approchait d'un « ! », il se taisait cinq secondes, puis lâchait sa phrase en continuant à marcher. ⚠️ **Et UN SEUL parle** — voir plus bas | `starNerveHalt` / `starTalkerPick` (`FermeGame.js`), `starNerveNearTo` / `starNerveFace` (`quete.js`) |
| « dans le cratère, ça dit *stand still* mais on ne comprend pas si on fait les choses bien ou ce qu'il faut faire de ce cratère » | **Une jauge au-dessus de la tête et une phrase par état.** Le seul geste CONTINU du jeu — neuf secondes de dos tourné, sans touche, sans animation — ne rendait rien : une tenue qui ne rend rien ne se distingue pas d'un jeu bloqué. Et l'invite disait « E : ne plus bouger », c'est-à-dire le préfixe des touches devant le seul geste qui n'en a pas | `drawCalmMeter` (`fermeArt.js`), `starCalmUi` (`FermeGame.js`), `starCalmStep` (`quete.js`) |

⚠️⚠️⚠️ **ET EN CHERCHANT LE TROISIÈME, ON A TROUVÉ LE DÉFAUT LE PLUS CHER DU CHANTIER DEPUIS LE
453 : CINQ PHRASES DU PREMIER QUART D'HEURE N'AVAIENT AUCUN CHEMIN D'AFFICHAGE.** `starSay` écrit
dans la bulle de l'**étoile** ; cette bulle n'est dessinée qu'à l'endroit rendu par
`starCompanionsAt`, laquelle rend une liste vide tant qu'aucune étoile n'est apprivoisée. Donc **tout ce que la
quête fait dire avant que le cratère s'ouvre était perdu** : `s2.tooHot` (« le trou fume encore »),
`s2.peek` (« quelque chose bouge au coin de l'œil » — la seule phrase qui dise POURQUOI on se tient
immobile devant un trou), `s1.shadow` (la première image magique de toute la quête) et **les trois
phrases de l'ancien familier-guide du 449**, c'est-à-dire la voix qui dit où aller.
⚠️ **C'est la leçon du 453 d'un cran plus bas, et elle est pire** : là-bas la chaîne n'avait pas de
lecteur ; ici le lecteur EXISTE, il est écrit, relu, et **compté par le banc** (`starSay` est une
lecture au sens du §8-B de `verify-quete`) — il ne s'exécute simplement jamais. *Un lecteur qui ne
s'exécute pas vaut zéro lecteur, et compter des clés ne le voit pas.* La parade tient en deux
lignes : **quand il n'y a pas de compagnon, la voix se pose au-dessus du JOUEUR**, dans les trois
boucles de rendu ; et deux contrôles neufs lisent le source pour le tenir.

⚠️⚠️ **UN QUATRIÈME DÉFAUT A ÉTÉ TROUVÉ EN JOUANT, ET IL N'ÉTAIT PAS DANS LA DEMANDE.** Les vingt
résidents apparaissent groupés près de la maison ; neuf sont nerveux ; **neuf bulles se sont ouvertes
en même temps, empilées**. Arrêter le PNJ ne sert à rien si huit voisins parlent par-dessus — la
demande de Guillaume était la LISIBILITÉ, pas l'arrêt. C'est aussi ce que la fenêtre périodique du
455 faisait sans le dire : elle décalait les prises de parole. En la retirant on a retiré son effet
utile ; il fallait le remettre, mais **choisi par la DISTANCE** (`starTalkerPick`, une fois par
image, avant le rendu) plutôt que par l'horloge — c'est-à-dire par ce que le joueur montre en
s'approchant. Les autres gardent leur « ! ». ⚠️ *Ce défaut ne pouvait se voir qu'à l'écran : chaque
bulle était juste, c'est leur SOMME qui était fausse.*

**CE QUI A ÉTÉ REGARDÉ À L'ÉCRAN (session du 456, un client, onglet masqué + pompe `Worker`)** —
et c'est la première fois depuis le 454 qu'un zip de ce chantier est joué avant d'être livré :
l'**arrêt** (le PNJ qui parle reste au pixel près d'une capture à l'autre pendant que les autres se
dispersent — c'est la mesure, pas une impression), la **bulle unique**, le **« ! » réduit**, et
**toute la scène du cratère de bout en bout** : trou chaud (`tooHot` + jauge en attente, bleu
froid), refroidi et face au trou (`calmTurn` + jauge en attente), dos tourné (`calmHold` + **jauge
d'or qui se remplit**), puis la sortie de l'étoile à la neuvième seconde.
⚠️ **CE QUI N'A PAS ÉTÉ REGARDÉ** : `calmIn` (au bord de l'anneau) et `calmStill` (en marchant
dedans). Les deux sortent du même `starCalmStep` que les trois autres, balayé sur 4 356 postures.
⚠️⚠️ **ET UN PIÈGE DE SÉANCE, POUR LA PROCHAINE FOIS** : le trou met **trois minutes réelles** à
refroidir et **il BRÛLE** (449) — attendre au milieu du cratère renvoie à la ferme, blessé, avec
neuf minutes de repos forcé. On attend au BORD (brûlure 2,2 cases, anneau de calme 5,5), ou on se
soigne au menu dev et on se téléporte quand le bandeau dit « le cratère a refroidi ».
⚠️⚠️ **ET `getImageData` MENT DANS UN ONGLET MASQUÉ, MÊME AVEC LE WORKER** : le hachage de l'écran
entier ne changeait pas d'une image à l'autre pendant que le monde bougeait. **Ce sont les CAPTURES
qu'il faut échantillonner**, pas les pixels du canevas (§10 de `CLAUDE.md`).

### 12.0 quater ⚠️⚠️⚠️ ZIP 455 — L'ANNONCE, LE TAMPON, ET LA CHUTE QU'ON NE VOIT PLUS TOMBER

**Quatre demandes de Guillaume, toutes livrées.** Le détail de fiction est au §3 (le thème coupé en
deux) et le déroulé au §5 (OUVERTURE). Ce qui suit est ce qu'il faut savoir pour reprendre.

| ce qui change | où ça vit | ce que ça coûte |
|---|---|---|
| l'invite de l'hôte (« Oui / Plus tard ») | `starWarnOffer` + `starOfferPump` + JSX `starOffer` | 0 message tant qu'on n'a pas dit oui |
| l'annonce | `resolveStarWarn` → `starScene: { key: "warn" }` | **1** `send()`, une carte plein écran |
| le tampon (5 à 16 min réelles) | `starFallDue` (jamais une lecture d'horloge distante) | 0 |
| les PNJ nerveux + leurs phrases | `starNerveHas` / `starNerveTic` / `starNerveDir` / `starNerveSay` | **0** — tout est dérivé du `rid` et de `star.warn` |
| l'avis de l'observatoire | `L.star.warn.board*`, tableau des nouvelles | 0 |
| le « ! » de toutes les têtes à l'impact | `starBang` + `drawEmoteBubble` | 0 — dérivé de l'horloge de scène |
| la caméra en amont, à la ferme | `starCamTarget` + `starHitRef` (une ref de plus, deux grandeurs) | 0 |
| la comète se fend | `starFragments` (règle) + `drawStarComet` (dessin) | 0 |
| la bulle dorée de l'étoile | `drawSpeechBubble(…, "star")` | 0 |
| les consignes qui disent la TOUCHE | `L.star.hud.goal` réécrit dans les deux langues | 0 |

⚠️⚠️ **UN SEUL CHAMP D'ÉTAT AJOUTÉ EN TOUT** (`star.warn = { at, by }`), dans le JSON de
`ferme_saves` — **aucune migration SQL**, et `migrateStar` compte une partie d'avant ce zip comme
déjà annoncée (sinon `starWarning` serait faux pour toujours sans que rien ne casse bruyamment).

⚠️⚠️⚠️ **CE QUE LES BANCS ONT TROUVÉ EN S'ÉCRIVANT, ET C'EST LA PARTIE QUI VAUT LE PLUS CHER.**
Quatre défauts, tous invisibles à la relecture, tous trouvés le jour même :

1. **La fracture de la comète avait lieu HORS DE L'ÉCRAN.** `STAR_FRAG_AT = 0.34` — un nombre qui
   « avait l'air d'être au début du vol ». Il l'était : la comète n'entre dans le cadre qu'à **0,84**
   du temps de vol (perspective du 448), donc le caillou se fendait très soigneusement dans le noir
   et l'on ne voyait arriver que trois morceaux déjà séparés. **C'est mot pour mot la septième forme
   du défaut de banc écrite au 454** (*une grandeur juste, mesurée sur un intervalle que le joueur ne
   regarde pas*), repayée en un zip. Elle est maintenant **dérivée** de `starFallOnScreenK()`.
2. ⚠️ **`T` N'EXISTE PAS AU NIVEAU DU COMPOSANT** — le calcul du point de vue le lisait pour
   convertir des pixels en cases. `ReferenceError` à l'exécution seulement, qui aurait emporté toute
   la frame (piège n°1, payé au 430 et au 431). **`verify-portee` l'a dit à la première exécution.**
3. **Le faux canevas des bancs LÈVE sur l'accès à `roundRect`** — donc `if (g2.roundRect)`, qui a
   l'air d'une garde, ÉTAIT déjà l'erreur. La bulle est repeinte en rectangles, ce qui est meilleur
   à 11 px de large de toute façon.
4. **Le banc de la bulle mesurait son propre fond** (l'herbe passait sous le seuil d'encre : 48
   rangées encrées sur une image de 48 px), puis **le cerne de la bulle en croyant mesurer le
   glyphe**. *Un banc de rendu se vérifie aussi* — le fond d'une mesure n'est pas un décor, c'est un
   réactif.
5. **Un « ? » que personne n'appelait** avait été dessiné « parce que la famille en aura besoin ».
   La planche a montré une tache. **Supprimé** — leçon 453 : *une chose que seul le banc regarde est
   débranchée, elle a l'air juste et elle ne peut pas échouer.*

⚠️⚠️⚠️ **CE QUI N'A PAS ÉTÉ REGARDÉ À L'ÉCRAN, ET C'EST TOUT CE QUI RESTE DE CE ZIP.** Les 35 bancs
sont verts, `verify-quete` est passé de 345 à **396**, `render-etoile` a **13 contrôles de plus** et
une planche neuve (`tools/out/etoile-alerte.png`, regardée). **Rien de tout cela n'a tourné dans un
navigateur** — et cinq choses ne peuvent se juger que là :

- **l'invite au crépuscule** (elle s'ouvre au bon moment ? « Plus tard » revient bien le lendemain ?) ;
- **la vallée nerveuse** : est-ce que ça fait inquiet, ou est-ce que ça fait bogue d'animation ?
  C'est la seule question de ce zip qu'aucun nombre ne peut trancher ;
- **les phrases à l'approche** : est-ce qu'on les lit, ou est-ce qu'elles passent trop vite ?
- ⚠️⚠️ **la chute à la ferme, qui est le plus gros risque** : le point de vue est en amont sur
  `STAR_CAM_VANTAGE = 1,15` demi-diagonales, ce qui est juste **par construction** — mais « l'impact
  est hors cadre » et « la scène est belle » sont deux choses différentes, et seule la première est
  mesurée. La comète peut très bien traverser un coin de l'écran en une seconde et ne rien raconter ;
- **le « ! » sur toutes les têtes** à l'instant du contact.

**La marche à suivre est celle du §10 de `CLAUDE.md`** (les deux échafaudages, le worker), et le
menu dev a **deux boutons neufs** pour ça : **📣 Announce it** (le tampon SEUL, sans que la comète
tombe cinq minutes plus tard au milieu de l'observation) et **🎬 The announcement** (rejouer la
carte). ⚠️ `▶ Start` saute le tampon d'un coup — c'est fait exprès, mais ce n'est donc PAS le bouton
qui juge ce zip.

---

### 12.0 quinquies ⚠️⚠️ ZIP 454 — LA CHAÎNE DE CONSTRUCTION, ET CE QUI A ÉTÉ VU À L'ÉCRAN

**Le déroulé complet, dans l'ordre où le joueur le vit :**

| étape | où | ce qui se passe | ce qui l'arbitre |
|---|---|---|---|
| la porte | — | Eduardo + Tristan **actifs** + 4 artisans, sinon la comète ne tombe pas | `starFallGate`, lu par `resolveStarFall` |
| le conseil | cratère | l'étoile regarde la cale vide et envoie chercher « quelqu'un qui dessine les bateaux » | `starWatch`, 3 toasts à la suite de la rencontre |
| la demande | mairie | sujet `engineer` chez Léonie · **24 000 or + 60 récoltes + 12 poissons**, payés d'avance | `req starPlanAsk` → `resolveStarPlanAsk` + `commitStarPlan` |
| le voyage | — | 3 minutes réelles | dérivé de `plan.at` |
| le travail | grève du lac | **Célestin Kerguélen** est là, il dessine, il marmonne ; E lui parle | `starEngineerHere` (aucun champ d'état de plus) |
| la remise | — | **15 minutes réelles**, puis l'hôte diffuse une fois | `resolveStarPlanTick` |
| le plan | partout | **P** ouvre la feuille : le bateau en fantôme, les cinq pièces et leur état | `drawStarPlan` (dans `fermeArt`, donc regardé par un banc) |
| le fantôme | à 12 cases de la cale | **P** au bord du lac fait apparaître le bateau entier sur sa cale | `starGhostsOn` → `drawStarShip({ ghosts })` |
| le bois | menu Employés | 5 commandes à Tristan, **dans l'ordre du plan**, en bois de la réserve commune puis du sac | `req starTimberOrder` → `resolveStarTimberOrder` |
| la pose | cale | un morceau apparaît quand **l'étoile s'en souvient ET que le bois est livré** | `starShipParts` = `found ∧ wood` |
| la fin | — | la résolution attend le dernier bordage, et part toute seule quand il tombe | `resolveStarGift` (refuse `unbuilt`) + `resolveStarTimberTick` |

⚠️⚠️ **CE QUE LA SÉANCE À L'ÉCRAN A TROUVÉ, ET QUE LES BANCS NE VOYAIENT PAS** (c'est la septième
fois que ce paragraphe existe, et il n'a jamais été vide) :
1. **Le ralentissement de la comète ne se voyait pas** — voir l'en-tête. Deux contrôles verts, zéro
   effet à l'écran. Corrigé (`STAR_FALL_RUSH` 0,20 → 0,06) **et mesuré autrement** : la durée de la
   partie visible, et le fait que l'accélération finale tombe **dans le cadre**.
2. **Le sillon avait un liseré vert vif tout autour.** Le bourrelet partait au brun presque noir sur
   son bord extérieur, et l'herbe claire juste à côté ressortait comme un trait de néon. Le banc
   mesurait l'écart-type de luminance — excellent — *et c'est justement le contraste qui faisait le
   défaut.* Brunissement ramené de 0,8 à 0,45, frange élargie.
3. **Le sillon se lisait comme un OVALE**, parce que la largeur du bourrelet était constante. C'est
   mot pour mot le premier cratère du 446 (« un tournesol »). Le bourrelet est maintenant fibreux
   (deux harmoniques), et la silhouette est déchirée.

**Vu et validé à l'écran :** la scène de chute, le bandeau qui nomme le pré nord, le sillon fumant
avec ses braises et sa vapeur, l'invite `E : regarder`, le chevron avec sa distance, la feuille de
plan, **la cale nue sans plan**, et **le fantôme entier qui apparaît quand on déplie le plan devant
elle**. Non vu : l'ingénieur en personne (il faut quinze minutes ou le bouton dev), une commande de
bois jusqu'à sa livraison, et la fin qui attend le dernier bordage.

### 12.1 Ce qui est FAIT

**La quête est jouable de bout en bout par un joueur seul.** La chute s'arme toute seule à la
première nuit du troisième jour, les cinq chapitres s'enchaînent, les cinq mini-jeux s'ouvrent et
se jouent, les trois scènes se jouent, **le navire se bâtit morceau par morceau sur sa cale**, la
compagne suit, le bandeau dit l'objectif, le familier mène, la reprise redit où l'on allait, et la
fin laisse ses traces. **Le jeu parle français** (451). Tout est arbitré par l'hôte, rien ne paie
un or, aucune migration SQL.

### 12.1 bis ⚠️⚠️ ZIP 449 — LES CONSIGNES GUIDENT ENFIN, ET UN FAMILIER MÈNE

**Demande de Guillaume :** « il faut que les instructions soient moins mystérieuses, plus
guidantes sinon le jeune public va abandonner. reste subtil mais ajoute des hints. »

**1. Le bandeau dit l'OBJECTIF, plus le chapitre — et ta remarque était juste : il ne
s'actualisait pas.** `hud.goal` était classé par CHAPITRE, or le 2 en contient trois et le 4 en
contient deux : on pouvait sortir l'étoile du cratère, croiser les ombres, et lire encore « Find
where the rest of it fell. » ⚠️ **Il pouvait même contredire le chevron**, qui dérivait, lui, de
`starTargetSite` — deux sources pour « où vais-je ». Les deux lisent maintenant la même liste
(`Q.starGoalKey`), et le rappel de reprise aussi. Le séquençage GTA que tu voulais garder est
intact : la carte de chapitre plein écran ne bouge pas, c'est le bandeau qui suit.

**2. Les phrases nomment l'endroit.** Règle qu'on se donne : *une phrase de bandeau dit OÙ et
QUOI, jamais pourquoi.* Le mystère reste dans les bulles et les scènes, où il fait plaisir ; il ne
coûte plus un aller-retour en train pour rien. Les consignes de mini-jeu disent désormais le BUT
avant le geste (l'ombre au mur, le battement de le morceau, les trois façons de perdre la pie) et,
**décision de Guillaume, aucune ne nomme une touche** : le reste du jeu n'écrit jamais ses
commandes.

**3. Un familier MÈNE, à la demande (G) et tout seul si ça traîne (2 min 30).** ⚠️ **Un seul
prend la tête** (indice 0, déterministe) ; les autres suivent, ce qui rend le meneur lisible. Il
va vers le lieu cherché, vers le TRAIN quand il est sur l'autre carte, vers la PORTE quand il est
dans un intérieur — et **il s'arrête à trois cases et s'assied** : il guide, il ne joue pas à ta
place. ⚠️ **On a écarté le PNJ témoin exprès** : `fall.quiet` dit « personne ne sort regarder,
personne n'en dit un mot », et c'est la meilleure page du chantier. Un animal montre sans parler,
donc le secret tient. Coût réseau : **zéro** (position dérivée, état purement local).

**Ce que la séance à l'écran a trouvé et qu'aucun banc ne voyait :** le guide s'éteignait à chaque
carte de chapitre — `starGuideTarget` rend `null` quand une interface est ouverte, et la garde
« pas de cible → j'arrête » confondait un INSTANT avec un ÉTAT. Corrigé. **Et l'invariant du banc
(« le meneur n'est jamais plus loin du but que le joueur ») a trouvé l'autre :** repartir du nœud
le plus proche mettait le chien dans le dos du joueur, 20 cas sur 164.

### 12.2 ⚠️⚠️ CE QUI RESTE, ET C'EST COURT — MAIS C'EST LE PLUS IMPORTANT

**0. ⚠️⚠️⚠️ LES CINQ POINTS DU 452 SONT TOUS TRAITÉS — ET LE CINQUIÈME N'ÉTAIT PAS DANS LA LISTE.**
Ils sont gardés ici en une ligne chacun, parce qu'ils disent où regarder la prochaine fois :

| ce qui n'allait pas | ce qui a été fait au 453 |
|---|---|
| **le compte de morceaux avait TROIS réponses** (navire 2/5, bulle « Trois morceaux », chat « n sur 4 ») | la colonne `shard`, `starShards` et `STAR_SHARD_TOTAL` **supprimées** ; tout lit `starShipBuilt` / `STAR_SHIP_TOTAL` ; **toute phrase qui compte est une fonction `(n, total)`**, et un banc refuse les nombres en dur |
| **le navire ne partait jamais** alors que `end1`/`end2` l'affirmaient | décision de Guillaume : il reste, **Eduardo l'emmène** et le ramène (`starShipGone`) ; `end1`/`end2` réécrites — `end1` décrivait même le bateau là où le dessin peint l'étoile |
| **la Lyre était un second compteur** de la même progression | elle reste comme constellation, **sans trou et sans compte** ; elle n'était jamais nommée au joueur, donc rien n'a été retiré de l'histoire |
| **`STAR_SHIP_NEAR_R` était débranchée** (seul le banc la lisait) | **supprimée**, avec le contrôle qui la lisait. Une « réserve » est une idée, pas un état du code — celle-ci est écrite au point B ci-dessous |
| ⚠️⚠️⚠️ **41 des 136 phrases n'étaient affichées nulle part** — trouvé en faisant l'audit, jamais par un banc | **toutes branchées** (la rencontre, les quatre phrases de la cloche, les inscriptions de la vis, le don, deux traces, `fall.quiet`), et **un banc les compte désormais** |

⚠️ **Ce qui a été supprimé plutôt que branché, et pourquoi** : **quatorze clés d'invite** (`s1.prompt`,
`s2.promptCalm`, `s3.promptDive`, `s3.promptHold`, `s4.promptWatch`, `s5.promptUp`… et `hud.shards`).
Sept étaient des **doublons mot pour mot** de `prompt(k)`, la table unique d'invites — c'est-à-dire
la divergence en attente du §8 de `CLAUDE.md`, dans la table de textes elle-même. Les autres
décrivaient des postes coopératifs **qui n'ont pas de code** : celui qui tient la lumière sur le
ponton, celui qui regarde le mur du fond. ⚠️ **Elles se réécriront AVEC le code qui les affiche**,
et elles auront un lecteur dès leur première ligne. *Une chaîne sans lecteur a l'air juste et ne
peut pas échouer.*

**0 bis. ⚠️ LA PLAQUE DU CHANTIER NAVAL — L'IDÉE QUI RESTE, ET ELLE EST BONNE.** C'est le seul endroit
où l'on pourrait **nommer les cinq morceaux dans les deux langues** (la coque, le safran, le mât, la
voile, la cloche) : aujourd'hui le joueur voit cinq formes et n'en connaît aucune. Un `E` sur le
navire, un panneau qui ne donne RIEN (§4 de `CLAUDE.md` : la porte n'est jamais la caisse), et la
portée qui va avec — **écrite le jour où on l'écrit, pas gardée en réserve** (c'est ce que le 452
avait fait avec `STAR_SHIP_NEAR_R`, et le 453 l'a supprimée pour ça).

**A. LA SÉANCE À DEUX CLIENTS — ⚠️ ELLE A COMMENCÉ AU 458, ET ELLE A PAYÉ TOUT DE SUITE.**
Deux clients ont tourné ensemble pour la première fois : ils ont trouvé **trois blocages
durs** (le cratère, les deux croisements d'ombres, la flaque) dont deux rendaient la quête
**infinissable dès qu'un second joueur se connectait**. Voir §12.0. ⚠️ **Ce qui reste de la
liste ci-dessous n'a toujours jamais été JOUÉ à deux** — la séance a validé la connexion, la
chute et l'ouverture du cratère par un seul, pas les postes face à face :
`node tools/fake-supabase.mjs` + deux onglets (recette du §10 de `CLAUDE.md`). Ce qui n'a jamais
été vu, pas une fois :
1. **l'étoile timide du cratère** — deux joueurs dos à dos, immobiles, quatre secondes. C'est la
   plus jolie mécanique du chantier et personne ne l'a jouée ;
2. **le croisement d'ombres** — deux lectures à plus de 30 cases d'écart dans une fenêtre de 20 s
   datée par l'hôte ;
3. **la flaque de lumière** — A marche sur le ponton, la flaque suit ses pas, B ne voit que
   dedans. ⚠️ **Le 458 l'a rendue DÉCISIVE** (hors de la flaque : noir, souffle × 2,4, pilotis
   invisibles) et a corrigé deux défauts qu'un seul client ne pouvait pas voir — la flaque
   figée au centre, et le morceau dessiné hors du découpage. **Elle reste à jouer à deux ;**
4. **le duo** — A à l'orgue, B au beffroi, et le faisceau qui faiblit quand l'autre quitte son
   poste (`starMiniPartner()`) ;
5. **la chute vue simultanément** par deux clients, chacun sur sa propre horloge.
⚠️ Et la ferme PEUPLÉE à deux clients n'a toujours jamais été jouée (§13 de `CLAUDE.md`, réclamé
depuis le 419) : **cette séance-là peut faire les deux d'un coup.**

**B. LES CINQ MINI-JEUX, JOUÉS JUSQU'À LA VICTOIRE, À CADENCE RÉELLE.** ⚠️ **Deux d'entre
eux ont changé au 458** (le refroidissement poli, la plongée refaite) et ont été REGARDÉS
isolément, jamais gagnés. Ils sont dessinés et
vérifiés à l'écran, mais le banc de navigateur ne peut pas les JOUER (voir §10). Ce qu'il faut
juger, et qu'aucun banc ne verra jamais : **est-ce que c'est agréable ?** Les manches sont
réglées, pas éprouvées. Les nombres à surveiller en premier : `STAR_COOL_BAND` (la bande
se resserre-t-elle trop vite ?), `STAR_DIVE_CURRENT` (le courant du troisième palier),
`STAR_SWEEP_MIN`/`MAX` (la « bonne allure » se sent-elle ?), `STAR_MAGPIE_LAG`.

**C. LES DEUX SCÈNES JAMAIS VUES** : le retournement (fin du chapitre 4) et la finale. Le bouton
« 🎬 Rejouer une scène » du menu dev les joue isolément — c'est exactement pour ça qu'il existe.

**D. LA CONSTELLATION DANS LE CIEL, TOUJOURS JAMAIS VUE — trois zips qu'elle attend.** Elle ne se
dessine que la NUIT (`E.isNightTime`), et les trois séances se sont faites de jour. ⚠️ **Ce qui se
juge maintenant a changé** : elle ne compte plus rien (453), donc la question n'est plus « faut-il
la retirer » mais **« est-ce qu'elle apporte encore quelque chose, réduite à un motif d'ambiance ? »**
Si la réponse est non, elle part en quatre lignes et le ciel ne perd rien.

**D bis. ⚠️⚠️ LES 41 PHRASES BRANCHÉES AU 453 N'ONT ÉTÉ VUES PAR AUCUN ŒIL.** Le banc dit que
chacune a un lecteur ; il ne dit RIEN de ce qu'elles donnent à l'écran — et elles arrivent
maintenant en **suites de toasts échelonnés** (`starTell`), ce qui est très exactement le genre de
chose qui se juge en jouant et nulle part ailleurs. Les trois moments à regarder en premier, dans
l'ordre : **la rencontre au cratère** (quatre toasts sur ~8 s, pendant que l'étoile sort du trou),
**la cloche** (six toasts sur ~14 s, dans le beffroi, juste après la montée), et **l'ouverture** (la
quatrième ligne, `fall.quiet`, doit tomber avant la fin des neuf secondes de la scène). ⚠️ *Un
rythme de texte ne se mesure pas ; il se regarde une fois et il se sait.*

**E. LE MORCEAU D'ORGUE** — `public/sounds/church-organ.mp3`, toujours absent (décision du 441).
Rien à coder.

**F. ⚠️ LE BANC DE NAVIGATEUR A UNE PARADE, ET ELLE CHANGE LA SUITE** (446). Dans un onglet
masqué, `requestAnimationFrame` ne se déclenche **jamais** (`visibilityState: "hidden"`) : le
monde ne tourne pas, le fermier ne bouge pas, et `getImageData` relit une image périmée. Une ligne
suffit, et son frein est dans sa forme —
`window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);` — mesuré à
**31-36 images par 500 ms**. C'est ce qui a permis de marcher jusqu'au cratère, d'y entrer et d'en
mesurer l'enfoncement. ⚠️ **Les points A et B ci-dessus deviennent donc faisables au banc** : le
`MessageChannel` du 444 n'était pas la seule voie.

### 12.3 ⚠️ LE POINT QUI N'A PAS CONVERGÉ, ET LES DEUX DIRECTIONS

**L'étoile compagnon a demandé CINQ écritures et n'est pas encore juste.** ⚠️ **Vue en jeu
maintenant, et le diagnostic tient** : à côté du fermier elle se lit comme une petite bête dorée
attachante, mais **elle ne lit pas « étoile » d'emblée**, et son état ÉTEINT (chapitre 5) est un
petit tas gris qu'on perd de vue sur un plancher sombre.

⚠️ **LA CAUSE EST IDENTIFIÉE ET ELLE EST GÉNÉRALE** — c'est la vraie trouvaille de cette passe :
**un cerne d'un pixel impose une profondeur d'échancrure d'au moins trois pixels.** En dessous, le
contour rebouche la forme qu'il souligne. C'est ce qui a produit, tour à tour, une icône, un
biscuit, une amibe et un blob. *Le contour d'un dessin est une contrainte de FORME, pas une
finition.*

**Direction 1 — l'agrandir.** De 15 à 20-22 px (×0,85 d'un fermier). Les échancrures tiennent, le
visage tient. **Prix :** elle cesse d'être « quelque chose qu'on protège » et devient un familier
de la taille d'un chien ; il faut alors changer `star.s2.meet1` (« smaller than a hen »).

**Direction 2 — la dessiner à la main.** Quatre masques de pixels explicites (14×14, ~45 pixels
chacun), ce que fait un pixel-artiste à cette échelle. **Prix :** quatre masques à maintenir, et
les états ne se dérivent plus — soit douze masques.

⚠️ **Mon avis, si tu veux un arbitrage :** la direction 2, mais **seulement sur l'état CALME**
(quatre masques), en gardant la géométrie pour les deux autres, vus deux fois chacun dans toute la
quête. On paie le dessin là où le joueur regarde. ⚠️ **Et une troisième chose, indépendante des
deux :** l'état ÉTEINT a besoin d'un **cerne clair** plutôt que sombre — il est vu dans le
beffroi, sur du bois foncé, et un gris cerné de gris disparaît.

### 12.4 Ce qu'il faut savoir avant de rouvrir le chantier

- ⚠️⚠️ **LE BANC DE NAVIGATEUR NE JOUE PAS.** Panneau masqué = `rAF` par à-coups (§10 de
  `CLAUDE.md`). Deux conséquences mesurées : le personnage n'avance quasiment pas entre deux
  captures, et un mini-jeu saute des manches entières. ⚠️ **Le remède `MessageChannel` du §10 fige
  l'onglet s'il n'a pas de frein** (relais qui se repose un message à chaque image = boucle
  serrée). **La parade qui marche : monter le composant isolément** sur une page jetable —
  `StarMinigame` est exporté pour ça, et une page de quarante lignes suffit.
- ⚠️ **Les deux échafaudages du §10 sont SUPPRIMÉS** (`.env.local`, `app/starbench/`,
  `app/starmini/`). Les recréer prend deux minutes ; les laisser ouvre une ferme sans
  authentification en production.
- ⚠️ **`tools/.cache/` est un cache de modules transpilés.** En cas de doute : `rm -rf tools/.cache`.
- ⚠️ **`makeCanvas` ne rend PAS un canevas DOM** : `{ ctx, px, width, height }`. Et `scale` rend
  `{ px, W, H }` — un `writePNG` mal appelé produit une **image blanche** sans lever d'erreur.
- ⚠️ **Deux seuils d'opacité dans `render-etoile`, non interchangeables** : `silhouette` (40) = la
  surface occupée, halo compris ; `matter` (150) = la matière.
- ⚠️⚠️ **UNE POSITION D'ARRIVÉE NE S'ÉCRIT PLUS, ELLE SE DÉRIVE** (`E.courtFloorSpawn`). C'est la
  leçon la plus chère de la séance : le beffroi était connexe, meublé, mesuré vert par deux bancs,
  et on atterrissait dix cases à côté, dans le noir. *Une porte qui s'ouvre sur le vide passe tous
  les contrôles de la porte.*
- ⚠️ **Un repli en `|| clé` n'échoue pas, il MENT** : `devTeleportName` et `courtFloorName`
  affichaient « churchTower » en toutes lettres. `verify-quete` refuse maintenant les deux.
- ⚠️ **Le menu dev est la bonne porte d'entrée** : ⌘⇧X → « ⭐ Star ». Il appelle les vrais
  résolveurs et jette ce qu'ils rendent.

---

## 13. ZIP 445 — LA CHUTE EST VUE, ET LE CHEVRON MÈNE

**Demande de Guillaume :** *« quand la comète s'écrase, la scène doit être vue. Il doit y avoir un
indicateur style gps (forme spéciale) pour nous diriger vers l'impact ou le cratère. »*

### 13.1 Les quatre décisions

| | tranché |
|---|---|
| ce qu'on construit | **les deux** : la garantie que la scène a lieu **et** la caméra qui va voir l'impact |
| intérieur / menu / mini-jeu au moment de la chute | **on diffère** — elle attend et se joue à la première image où elle a un sens |
| la forme du repère | **un chevron blanc luisant** (le triangle ambre reste la boussole du joueur, 429) |
| l'autre carte | **rien ne s'affiche hors du monde de la cible — la comète comprise** |

### 13.2 ⚠️ CE QUE LE 444 FAISAIT VRAIMENT, ET POURQUOI C'ÉTAIT DEUX DÉFAUTS ET NON UN

1. **La scène pouvait ne pas avoir lieu.** Elle se jouait « là où le joueur est », donc parfois au
   troisième étage du tribunal (pas de ciel), derrière un menu, ou **jamais** — un joueur qui
   rejoint le salon le lendemain ne reçoit que l'ÉTAT, pas le `starScene` qui l'annonçait.
   *Une ouverture qui peut ne pas avoir lieu n'est pas une ouverture.*
2. ⚠️⚠️ **Et quand elle avait lieu, elle ne disait rien.** Le trait de lumière traversait l'écran à
   des coordonnées ARBITRAIRES et la colonne montait à `W × 0,86` : **aucun rapport avec le lieu de
   la chute**. C'était joli et muet. *Une cinématique d'ouverture doit répondre à « où ça ? ».*

### 13.3 Ce qui est construit

- **Une file** (`starScenePendRef`) : la chute est mise en attente à la réception, jamais jouée.
  `starScenePump()` bat dans la boucle, **toutes zones, avant toute sortie anticipée** — c'est le
  défaut d'`actAnimRef` du 426, connu d'avance.
- ⚠️ **Elle ne concerne QUE la chute.** Le retournement et la finale suivent un geste du joueur :
  il est présent par construction, et la finale se joue justement dans un intérieur (le beffroi).
- **Un rattrapage**, par le même code : une marque locale (`localStorage`, datée par `e.fall`)
  comparée à l'état partagé. Un joueur qui rejoint après voit la chute ; **la carte de chapitre
  affiche son chapitre COURANT**, plus « Chapter One » en dur.
- **Une caméra de scène** (`starCamNow`), **une seule écriture lue par `getCam` ET `getCamTown`**.
  Elle vole vers l'impact, s'y tient pendant le flash, revient. ⚠️ **Durée constante, jamais
  fonction de la distance** : le flash doit tomber à 3,0 s chez tout le monde.
- **La comète vise.** Trait, flash, **onde de choc au sol** (neuve) et colonne de lumière sont
  ancrés sur le point d'impact réel, recalculé à chaque image depuis la caméra.
- **Deux impacts, un par carte** : le sillon à la ferme, le cratère en ville — c'est l'histoire
  elle-même, et ça ne coûte pas un message de plus.
- **Le chevron** (`drawStarChevron`), frère de `drawGpsMarker` et jamais sa copie : deux chevrons
  ouverts, blancs, cerne sombre, halo autour ; orbite autour du joueur hors champ, se pose sur la
  cible à l'écran ; **orbite plus large que la boussole** pour qu'ils ne se recouvrent pas.

### 13.4 ⚠️ CE QUE LA SÉANCE A TROUVÉ, ET QU'AUCUN BANC N'AURAIT VU

**Le menu développeur n'était pas dans la garde de visibilité.** C'est le SEUL panneau depuis
lequel on déclenche la chute : elle se jouait donc derrière le menu qu'on venait d'utiliser pour
appuyer dessus. *Le chantier a reproduit, dans son premier jet, très exactement le défaut qu'il
corrigeait* — et il a fallu deux minutes à l'écran pour le voir, contre jamais pour un banc.
⚠️ Seconde leçon, moins grave et plus utile : **j'ai cru deux fois voir un défaut qui n'existait
pas** (le voile absent, le chevron gris). Les deux fois, la mesure a tranché contre l'œil — voile
L 72 contre 146, chevron 232 pixels à L > 215, max 255. *§8 de `CLAUDE.md` : on ne juge pas au
ressenti, y compris quand on croit voir un bogue.*

### 13.5 Vérifié

`verify-quete` **207/207** (177 + 30 neufs, tous sur l'ARRIVÉE) · `verify-syntax` ·
`npx next build` **✓ Compiled successfully** · les 14 autres bancs de contrôle · et **une séance
réelle** : chute différée dans le tribunal (rien ne se joue), jouée à la sortie sur la ferme,
comète ancrée sur le sillon, caméra revenue, chevron à 33 m puis 38 m à la ferme et 131 m vers le
cratère en ville, **et rien à la ferme quand la cible est en ville**.

⚠️ **Ce qui n'a PAS été vu, et qui reste au §12.2 :** la chute à DEUX clients (chacun sur sa carte,
chacun sa caméra, chacun son impact) — c'est la même séance qui manque depuis le 444.

---

## 14. ~~LES SEPT DÉCISIONS QUI BLOQUENT LA REFONTE~~ — ARCHIVE, TRANCHÉES AU 469

⚠️⚠️ **CE CHAPITRE EST UNE ARCHIVE DEPUIS LE 469 : QUATRE DE SES SEPT DÉCISIONS SONT
TRANCHÉES, ET LA LISTE VIVANTE EST AU §15.** D2 (le sort des chapitres 3-4-5) : supprimés.
D3 (les cinq morceaux) : quatre n'ont plus de lieu, ils se fabriquent. D4 (le squelette du
duo) : retiré, pas replacé — c'est la dette n°11 du §15. D7 (Kerguélen) : il RESTE, c'est
lui qui rend le fantôme du bateau. D1 (les sept étoiles), D5 (l'attente habitée) et D6 (la
durée du refroidissement) sont ouvertes et vivent désormais au §15.
⚠️ *Un chapitre de décisions à prendre qui survit à leur arbitrage est un document qui ment
— on le marque, on ne le laisse pas se lire comme une consigne.*

### 14 bis (archive) — le texte d'origine

**Ouvert au 468.** La trame cible transmise par Guillaume est : *cinq impacts à la ferme → le
grand impact de Valley Town (avec une occupation pendant le refroidissement) → récupérer les
pièces chez Tristan → demander à Eduardo les matériaux de la voile → construire le bateau.*

⚠️ **Elle ne se pose pas par-dessus le code : elle en RETIRE la moitié.** Les chapitres 3
(la plongée), 4 (la verrerie et la pie) et 5 (le beffroi, la cloche, le duo) n'y figurent pas —
c'est-à-dire **quatre des cinq morceaux du navire** (`lakeShard`, `beadShard`, `nestShard`,
`song`) et **le retournement**, seul moment de bascule de toute la quête. Rien ne doit être
réécrit dans `STAR_SITES`, `STAR_CHAPTERS` ni `STAR_SHIP` avant que ceci soit tranché — c'est la
règle du §2 de `CLAUDE.md`, et c'est aussi ce qui a coûté le plus cher au 450 (une fiction changée
sans que le document qui la porte suive).

| # | ce qui doit être tranché | pourquoi c'est bloquant |
|---|---|---|
| **D1** | **Les sept étoiles de la Brebis.** L'autorité 465 en annonce sept et une constellation mappée ; la trame cible n'en produit que **trois** (bleue, rose, reine). | Il manque quatre étoiles, et il faut décider **où** elles se trouvent — ou abandonner les sept. |
| **D2** | **Le sort des chapitres 3, 4 et 5.** Suppression complète, ou conservation d'un morceau ? | Sans eux la quête n'a plus aucun retournement : elle devient une chaîne logistique. C'est livrable, mais il faut le vouloir. |
| **D3** | **Les cinq morceaux du navire.** D'où viennent le safran, le mât, la voile et la cloche ? | Le fantôme du bateau a cinq emplacements à l'écran. Un emplacement sans réponse est un trou visible dès le premier chapitre. |
| **D4** | **Où remettre le squelette du duo** (deux postes, coopération réelle, zéro message). Proposition : la **construction du bateau** — l'un tient la lumière, l'autre pose la pièce. | C'est la seule mécanique à deux qui ne soit pas du commerce, et la trame cible ne lui donne pas de place. |
| **D5** | **L'occupation pendant le refroidissement.** Proposition : **relever les éclats projetés** autour du cratère (3–4 marques qui racontent la chute). | « Attendre » n'est pas une occupation ; et une activité plaquée serait pire que rien. |
| **D6** | **La durée du refroidissement.** `STAR_CRATER_COOL_MS` vaut **180 s** ; proposition **240 s**. | « Légèrement plus long » demande un chiffre, et il ne se règle pas à l'œil. |
| **D7** | **Kerguélen et les quinze minutes de plans** — restent ou sortent ? | La trame cible n'a pas d'architecte naval, mais c'est lui qui fait que le fantôme du bateau est **gagné** et non offert (454). |

⚠️ **ET UNE REMARQUE DE MÉTHODE, DUE À GUILLAUME** : le masterprompt demande de rejouer et de
refaire les six mini-jeux sans complaisance. Si D2 les supprime, **quatre d'entre eux
disparaissent** — la passe de réglage doit donc venir APRÈS la refonte de la charpente, sinon on
polit ce qu'on va jeter.

---

## 15. ⚠️⚠️⚠️ CE QU'IL RESTE À FAIRE — LA LISTE DE LA QUÊTE SIMPLIFIÉE (469)

⚠️ **Cette section remplace le §14 (« les sept décisions »), dont quatre sont tranchées.**
Ce qui suit est la liste de travail de la quête telle qu'elle est MAINTENANT, dans l'ordre
où elle se joue — pas dans l'ordre où c'est commode à écrire.

### 15.0 ✅ **LA DISCUSSION AVEC LE MAIRE — LIVRÉE AU 480**

**Demande de Guillaume, à traiter dans une passe dédiée, avec lui :** *« discussion avec le
maire que je veux travailler avec toi dans une autre passe ».* **C'est fait — le détail est au
§16, et les quatre arbitrages qu'il a tranchés y sont recopiés mot pour mot.** Ce qui suit
décrit l'état d'AVANT, gardé parce qu'il énonce le problème mieux que la solution ne le fait.

C'est la charnière de toute la seconde moitié : aujourd'hui, on sort du cratère et le
bandeau dit « va demander un ingénieur naval à la mairie », où **Léonie Sarrazin** tient un
guichet qui prend 24 000 or, 60 récoltes et 12 poissons contre les plans de Kerguélen. Le
MAIRE, lui, ne dit rien — alors que c'est lui qui devrait **valider le projet de bateau**,
et que cette validation est ce qui débloque tout le reste (voir 15.1 : les habitants ne
peuvent parler du bateau qu'une fois le chantier lancé). ⚠️ **Rien de la mairie ne doit
être réécrit avant cette passe.**

Ce qu'il faudra trancher avec lui : qui parle (le maire, Léonie, les deux), quand (jour
d'audience — il en a déjà un, `hallMayorAudience`), ce qu'il DEMANDE avant d'accepter, et
ce que l'acceptation change dans le monde. Le patron existe déjà et il est mesuré : une
`req` arbitrée par l'hôte, un état dans `shared.star`, **aucune migration SQL**.

### 15.1 ✅ CE QUE GUILLAUME A TRANCHÉ AU 469, ET QUI EST DÉJÀ ÉCRIT ICI

| question | sa réponse |
|---|---|
| Les PNJ peuvent-ils parler du bateau ? | **Oui** — occasionnellement, en se promenant dans Valley Town, **une fois le projet validé par le maire et lancé**. |
| Savent-ils quelque chose des étoiles ? | **Non, rien.** Ils ne les voient pas et n'y font aucune référence. La constellation de la Brebis est une licence poétique : les futurs matelots s'orienteront grâce à elle, ils ne le savent pas encore. |
| Faut-il des cratères qui ne donnent rien ? | **Oui** — « pour que la chasse soit intéressante ». Trois vides sur huit, mesuré par le banc. |
| Le sort des chapitres 3, 4 et 5 | **Supprimés** (fait). |

⚠️ **LE SECRET SURVIT, ET IL EST MÊME PLUS PROPRE QU'AVANT** : les habitants parleront d'un
BATEAU — un chantier public, financé, validé par le maire — et jamais de l'ÉTOILE.
`verify-quete` refuse déjà qu'une réplique de PNJ nomme l'étoile ou dise où chercher ; la
règle ne change pas d'un mot, elle gagne un sujet de conversation.

### 15.2 ⚠️⚠️ LA DEMANDE PARTIELLEMENT CONSTRUITE : LES TROIS CHUTES D'ASTÉROÏDES

**Demande de Guillaume, mot pour mot :** *« On ajoutera 3 chutes d'astéroïdes sur la ferme,
mais faut les faire tomber de manière aléatoire sur une fenêtre de 7 minutes après
l'apprivoisement de la première étoile. Elles auront des pets collectors shiny que l'on
pourra garder, sortir etc. comme les pets actuels. »*

⚠️ **ARBITRAGE DU 2026-08-26 : sept minutes devient TROIS minutes.** La phrase ci-dessus reste la
demande historique ; elle ne fait plus autorité sur la durée. Les trois chutes se répartissent
dans trois bandes successives de la fenêtre (`15–60 s`, `60–120 s`, `120–180 s`) avec un instant
pseudo-aléatoire dans chaque bande. On garde ainsi la surprise sans permettre trois impacts dans
la même seconde. Les dates se dérivent du `found.at` de la première étoile et de l'identité du
site : aucune date de plus à persister, aucune horloge client à comparer.

⚠️ **480 bis a ajouté trois SITES, pas la mécanique demandée.** Ils tombent tous pendant
la scène initiale et donnent `empty`, `star/lure` et `material`. Restent à construire, dans
cet ordre, la fenêtre différée, le contenu `pet` et les familiers shiny :
1. **L'horloge.** Trois dates tirées dans les trois minutes suivant la première étoile, une par
   bande (`15–60 s`, `60–120 s`, `120–180 s`), à partir de
   `e.found[<première étoile>].at`. ⚠️ **Elles se DÉRIVENT, elles ne se stockent pas** — une
   fonction pure du tampon de la première trouvaille, comme le jour de marché (431) et
   toutes les échéances de ce chantier. Trois dates persistées seraient trois champs à
   réconcilier, et une fenêtre qui se fige au premier rechargement.
   ⚠️⚠️ **ET ELLE SE BORNE EN TEMPS RÉEL** (leçon du 468) : trois minutes de temps réel,
   jamais de temps visible, sinon un joueur parti en ville les rate définitivement.
2. **Le placement.** `starFarmImpactSites` sait déjà poser un cratère sur une ferme sans
   écraser une construction ni une culture : trois sites de plus, même règle, même
   persistance de tuiles.
3. **La fouille.** Elle marche déjà — ce sont des cratères comme les autres. ⚠️ Il faudra un
   **quatrième contenu** dans `STAR_DIG_RESULTS` (`pet`), donc une quatrième branche
   d'overlay, un quatrième médaillon, et un quatrième texte. Le banc du 469 vérifie déjà que
   *chaque résultat annoncé est servi par au moins un cratère* : il tombera au rouge tant que
   la branche n'existera pas, ce qui est exactement ce qu'on veut.
4. **Les familiers.** ⚠️ **C'est le seul vrai chantier des quatre** : il faut brancher les
   trois nouveaux sur la garde-robe de familiers existante (garder, sortir, ranger), avec
   trois sprites « shiny » à dessiner. ⚠️ `render-etoile` doit les regarder le jour où ils
   naissent, pas trois zips plus tard (leçon du 455).

### 15.3 La liste de travail, dans l'ordre où ça se joue

⚠️⚠️⚠️ **LE LOT 3b EST LIVRÉ AU 479 : LES TROIS VERBES SONT DISTINCTS.** Les défauts 3,
9 et 10 de l'audit 477 sont fermés, et ils le sont **par construction plutôt que par du
texte** — la colonne `verb` de `STAR_SITES` interdit à deux étoiles de partager un geste,
et `verify-quete` §12 le tient. Ce qui a changé :

| étoile | verbe | ce qu'on fait |
|---|---|---|
| bleue (`farmStarBlue`) | `light` | **60 bonbons de Temple Run rapportés DEPUIS LA CHUTE** (`e.candy`, un FLUX et non le stock de `f.inv.candies`), puis le dos tourné — le geste du 3a, qui n'appartient plus qu'à elle |
| rose (`farmStarRose`) | `warm` | **on cuisine au chaudron** (2e recette, la pommade n'a pas bougé) **et on PORTE le plat** jusqu'à son trou, jauge de 3 min qui descend. À deux c'est un RELAIS : le passage de main remet la jauge à plein |
| reine (`crater`) | `pair` | **deux présences aux bords OPPOSÉS, dos à dos, 20 s.** Seul : on plante son ÉPOUVANTAIL en face (`e.effigy`, un objet à 400 or qui ne servait à rien) et on tient 60 s |

⚠️ **AUCUNE MIGRATION SUPABASE** : quatre champs de plus dans `shared.star`
(`offer`, `candy`, `dish`, `effigy`), portés par `migrateStar`, dans un `apply` qui partait
déjà. ⚠️ **Et le second joueur reçoit enfin quelque chose** : `found[*].with` garde son NOM,
le chat le nomme (`chat.craterBoth`/`tamedBoth`), la trace de fin le nomme
(`end.together`), et `resolveStarGift` écrivait déjà pour tous les joueurs présents.
⚠️ **Défaut 10** : la compagne ne s'efface plus en une image — elle RENTRE vers le joueur
puis s'éteint, en deux temps (`starHideAnim`), et une phrase le dit une fois par session
(`s2.hideOnly`). `STAR_HIDE_R` = 4,5 n'a pas bougé : ce n'était pas lui, le défaut.

| # | ce qu'il reste | état |
|---|---|---|
| 1 | **Le déchant** — retirer duo, plongée, verrerie, pie, cloche | ✅ **fait au 469** |
| 2 | **La fouille** — geste, pose, terre, jauge, overlay, arbitrage | ✅ **fait au 469** |
| 3 | **La discussion avec le maire** — validation du projet | ✅ **LIVRÉE AU 480** — voir §16 |
| 4 | **Les PNJ parlent du bateau** dans les rues de Valley Town, après validation | ⏭️ **DÉBLOQUÉ AU 480 : la condition qu'il attendait existe enfin** (`MR.mayorSigned`). Court, et le patron des rumeurs existe (`starNerveSay`) |
| 5 | **Les trois chutes + familiers shiny** | 🟡 **conception tranchée au 2026-08-26** : trois chutes dérivées sur 3 min, hors progression obligatoire ; contenu `pet` et familiers shiny à construire (§15.2, §17) |
| 6 | **L'attente habitée du grand cratère** — 3 min à ne rien faire pendant qu'il refroidit | à faire. ⚠️ « Attendre » n'est pas une occupation, et une activité plaquée serait pire que rien. Proposition qui tient toujours : **relever les éclats projetés** autour du trou. |
| 7 | **La constellation de la Brebis** — sept places dans le ciel, allumées une à une | ✅ **fiction tranchée au 2026-08-26** : sept points ; les trois manquantes se chassent pendant le port, le sciage et le voyage d'Eduardo. Dessin et mécanique restent à faire (§17). |
| 8 | **La fiction des quatre morceaux sans lieu** (safran, mât, voile, cloche) | à faire — voir l'autorité 469. Techniquement finissable, narrativement muet. |
| 9 | **Le sciage à deux chez Tristan** | l'atelier existe, le geste non |
| 10 | **Le voyage d'Eduardo pour la voile** | le système de voyage existe, la commande non |
| 11 | **Le retournement** — la quête n'a plus AUCUN moment de bascule | ✅ **conçu au 2026-08-26** : le « lac » est l'ancien port ensablé ; la reine ne cherche pas un retour au ciel, elle ouvre aux joueurs la route des futures îles. À construire (§17). |
| 12 | **Rejouer le mini-jeu survivant jusqu'à la victoire** (le refroidissement) | ✅ **fait à l'audit 477** — gagné jusqu'à la manche 3, première fois depuis le 444. Il en est sorti le défaut #6 (les deux échecs par le haut rappelaient la CONSIGNE au lieu de dire la faute), corrigé au 478. |
| 3b | **Les trois verbes distincts** (défauts 3, 9, 10 de l'audit 477) | ✅ **fait au 479** — voir le tableau ci-dessus |
| 13 | **Une séance à DEUX clients sur toute la chaîne** | ⚠️ **toujours jamais faite face à face**, et le 479 vient d'AJOUTER deux postes à deux qui n'ont jamais été tenus : le RELAIS du plat (l'un cuisine, l'autre court) et les DEUX BORDS du cratère. Le code est là, mesuré par `verify-quete` §12 ; les postes, non. L'audit 477 a mené un apprivoisement de ferme à deux (~24 s au lieu de 60) et y a trouvé le défaut #8 (l'invité recevait « Où tu en étais » à la place de la chute, corrigé au 478) — mais la CHAÎNE ENTIÈRE à deux reste à jouer. |
| 14 | **La constellation de cinq points peinte en haut à droite dès la première nuit** | à remplacer par **sept points**, seulement dehors et de nuit. Elle n'est pas le pisteur du bateau : c'est la mémoire narrative des sœurs, révélée dans le ciel et les scènes (§17.9). |

### 15.4 ⚠️ CE QUE LE 469 A LAISSÉ EN DETTE, ET QU'IL FAUT LIRE AVANT DE ROUVRIR

- ⚠️⚠️ **`starSay` n'a plus rien à dire pendant les chapitres.** Le bloc « ce qu'elle dit
  quand elle est là » (`starFrame`) est VIDE et documenté : ses quatre phrases parlaient
  toutes des chapitres supprimés. C'est le seul endroit du jeu où l'étoile commente ce qu'on
  est en train de faire — **un poste sans texte, pas du code mort.**
- ⚠️ **Le mini-jeu de refroidissement est le dernier**, et `StarMinigame` garde sa forme en
  branches exprès : la refonte ajoutera des gestes (les cinq de la construction), et un
  composant réécrit « pour un seul jeu » devrait être rouvert.
- ⚠️ **Le décor des chapitres supprimés est toujours posé en ville** : le râtelier de la
  verrerie, l'arbre au nid, le ponton, le beffroi, la grande cloche, le banc d'orgue. Ils
  sortent de la quête, pas de la carte. Rien à nettoyer — mais rien ne les explique non plus.


---

## 16. ⚠️⚠️⚠️ ZIP 480 — L'AUDIENCE CHEZ LE MAIRE

**Ce que Guillaume a demandé, mot pour mot :** *« un mécanisme de discussion en face à face avec
le maire, dans son bureau […] Je veux une vraie discussion longue, avec un maire réticent au
départ qu'on devra convaincre en choisissant les bonnes réactions (2 sur trois permettent de
continuer la discussion (une de ces deux est la réponse idéale), une troisième est outrageusement
vexante ou fout tout en l'air) […] Concevoir une jauge de persuasion pour le maire. »* Et sur le
ton : *« si les arguments sont drôles c'est encore mieux, mais faut garder à l'esprit que le ton
est celui d'une réunion avec un élu. »*

### 16.1 Les quatre arbitrages de Guillaume, recopiés

| question | sa réponse |
|---|---|
| Le rendu de la scène | **three.js embarqué**, sur le blocage Blender exporté en glTF |
| L'accès | *« On doit demander à l'accueil l'audience avec le maire. Si l'on n'a pas encore les plans du bateau délivrés par l'ingénieur, le maire sera très difficile à convaincre. Si l'on a déjà les plans alors il sera toujours un peu radin et réticent mais ce sera moins difficile. »* |
| Les ressources | *« La patience du maire : temps de réponse et mauvaises réponses. Une réponse tiède peut faire stagner sa persuasion, ou la faire progresser un peu. […] Et si l'on ne fait rien, la jauge descend continûment. D'où l'intérêt de trouver les bonnes réponses et de les ENCHAÎNER. »* |
| Ce que rapporte un entretien parfait | *« On gagne la confiance du maire dans les prochains projets : plus facile de le convaincre pour les futures missions que nous implémenterons. »* |

⚠️⚠️ **LA TROISIÈME RÉPONSE A DÉCIDÉ DE TOUTE LA FORME.** Le premier jet comptait DEUX ressources
(une jauge d'adhésion et un quart d'heure décompté en tours) ; Guillaume l'a refusé, et il avait
raison pour une raison écrite en tête de `CLAUDE.md` : *deux grandeurs qui s'opposent se mesurent
ensemble ou pas du tout* (458). **La fuite EST l'horloge** — hésiter coûte des points, il n'y a
qu'une jauge à lire, et le banc n'a qu'une différence à calculer.

⚠️⚠️ **ET LA QUATRIÈME A DÉCIDÉ DE L'ARCHITECTURE.** Une récompense qui se dépense dans une
audience FUTURE interdit d'écrire celle-ci comme un cas particulier : `components/ferme/maire.js`
est un **système de négociation**, pas une scène. Une commission, le cadastre ou l'officier d'état
civil s'y ajouteront en une table de plus et zéro ligne de mécanique.

### 16.2 Ce qui a été construit

| fichier | ce qu'il porte |
|---|---|
| `components/ferme/maire.js` | **la table et les résolveurs purs** — douze battements, cinq actes, cinq familles d'argument, la jauge, la fuite, l'élan, la rejouabilité hôte, `migrateMayor`/`resolveMayor`. Aucun React, aucun dessin. |
| `components/ferme/MaireScene.js` | **la vue** — l'écran plein, la caméra à la première personne, les bulles, les réponses en jaune, le spectateur, et `mayorCtxOf`, la fonction de contexte que le CLIENT et l'HÔTE appellent tous les deux |
| `components/ferme/maireBureau.js` | **le DÉCOR, en code** (481) — la pièce, le bureau, le maire, son visage, les sept postures, les huit visages, la cinématique inverse des bras. Aucun React, aucun fichier à charger. |
| ~~`public/models/maire-bureau.glb`~~ | **SUPPRIMÉ AU 481, ET C'EST LA LEÇON DE CE ZIP.** Livré au 480, chargé, jamais REGARDÉ : ouvert dans un canevas, il montrait un maire dont la tête, le torse, les bras et le fauteuil flottaient deux mètres derrière le mur du fond (les nœuds `rig_*` portaient une translation monde que leurs enfants portaient une seconde fois). Ni le build, ni `verify-syntax`, ni `verify-maire`, ni le bundle ne pouvaient le dire : **un glTF est de la DONNÉE, et aucun banc de ce dépôt ne relit une donnée importée.** |
| `tools/verify-maire.mjs` | **113 contrôles, 113/113** — il JOUE des entretiens entiers, il ne relit pas la table. Depuis le 481 il importe aussi `maireBureau.js` pour tenir la jointure « sept postures de la mécanique = sept postures dessinables ». |
| `fermeStrings.js` | `MAIRE_FR` / `MAIRE_EN`, **bilingues le jour de leur naissance** (le banc de parité a refusé l'exemption) |

**Aucune migration Supabase** : tout tient dans `shared.star.mayor`, porté par `migrateMayor`,
dans un `apply` qui partait déjà. **Un seul `send()` pour toute la négociation.**

### 16.2 bis ⚠️⚠️ CE QUE LE 481 A CHANGÉ — L'AUDIENCE DEVIENT UN RENDEZ-VOUS

Quatre demandes de Guillaume, et elles se tiennent :

1. **Ce n'est plus un panneau, c'est une scène.** Plein écran, à la **première personne** (« ce sera
   un 1st person cet entretien »), caméra libre **dans** le bureau — on glisse pour regarder autour,
   on se penche sur le sous-main, on se lève. D'où le décor complet du §16.2.
2. **On prend rendez-vous à l'accueil.** La secrétaire annonce l'**humeur** du maire (cinq crans,
   de « très favorable » à « très mauvaise ») et une **attente de 3, 4 ou 5 minutes RÉELLES**. Le
   bouton du 480 ouvrait la négociation depuis le hall, deux étages plus bas et sans un pas de plus.
   ⚠️⚠️ **L'humeur est la seule difficulté du système qui se LISE**, et c'est tout son intérêt :
   annoncée avant qu'on monte, elle permet de décider de revenir demain. C'est la parade au mur du
   480 (trois malus empilés que personne ne pouvait additionner) — *la difficulté d'un monde se
   règle sur UN levier qu'on peut lire.*
3. **On monte, et on entre par la porte.** Une touche E devant SON bureau (`of: "mayorDesk"`, posé
   par le générateur — il y a sept autres `desk` dans les deux bâtiments), un fondu enchaîné en deux
   temps : le monde noircit, la scène lève son noir quand elle est prête.
4. **On peut claquer la porte.** Offerte à tous les nœuds, même quand tout va bien. Un « ! » lui
   pousse sur la tête, le battant rebondit, et ça coûte **un quart d'heure réel** plus l'humeur de la
   fois suivante — arbitré par l'hôte, jamais par le client. C'est la seule sortie du jeu qui ait un
   prix. ⚠️ Tout se remet à zéro avec la quête (menu dev → ⭐ Star → effacer), et c'était gratuit :
   `newStar()` reconstruit `mayor`.

**Et en multijoueur, les autres voient la scène.** Un bouton « 👀 Voir la scène de (nom) » apparaît
chez eux tant que quelqu'un négocie. ⚠️⚠️ **Un `send()` par BATTEMENT, jamais par image** : diffuser
la scène image par image, c'est soixante messages par seconde, le plafond de dix saute en silence, et
tout le reste du jeu tombe avec (§3 de `CLAUDE.md`). Le spectateur reçoit un ÉTAT — nœud, posture,
visage, jauge — et rejoue les mêmes interpolations, donc il voit la même scène. Il ne peut pas
répondre à la place de l'autre : il n'a pas d'état de négociation du tout.

### 16.3 La mécanique, en six lignes

**Jauge d'adhésion 0-100, départ à 24 (18 les mains vides), et elle FUIT.** À 75 il peut signer,
et un quatrième bouton apparaît (*« Je crois qu'on s'est compris »*) : empocher, ou pousser pour
la confiance en risquant tout. Cinq familles d'argument, et **quatre règles qui font que la bonne
réponse dépend du moment** : se répéter divise le gain par deux (et il le dit), le cœur ne se joue
qu'une fois, la flatterie n'est juste qu'à **un seul endroit** de l'arbre, et les plans de
Kerguélen sont une **carte** qu'on pose une fois — au nœud où il demande à voir, c'est le plus gros
coup de la partie ; ailleurs il ne les déroule même pas. **L'élan** : deux réponses idéales de
suite réduisent la fuite à 30 %, trois l'inversent. **Le maire élu change la partie** (cinq jeux
d'affinités, un argument vaut du simple au double), **et l'échéance électorale aussi** — c'est la
première conséquence de JEU qu'ait jamais eue une élection municipale dans ce dépôt.

### 16.4 ⚠️⚠️ CE QUE LE BANC A TROUVÉ, ET QUE LES CHIFFRES NE DISAIENT PAS

Cinq entretiens sont imprimés en clair à la fin de `verify-maire`. **C'est en les LISANT qu'on a vu
le seul vrai défaut de conception de la passe** : le sans-faute atteignait le plafond au septième
nœud sur treize, donc les six derniers échanges de la « vraie discussion longue » étaient écrits,
joués, lus, et ne pouvaient plus rien changer. Tout était vert — le jeu parfait gagnait, le jeu
tiède perdait. *Une discussion dont la seconde moitié est décorative n'est pas longue, elle est
lente.* Trois autres défauts sont sortis du même banc, chacun d'une famille connue :

| ce qu'il a trouvé | la famille |
|---|---|
| douze réponses TIÈDES martelées à zéro seconde franchissaient les 75 | une mécanique sans plancher se bat à mains nues contre le martèlement → `MAYOR_BEAT_MS` |
| neuf secondes de réflexion coûtaient plus que la meilleure réplique ne rapporte | le jeu récompensait de répondre VITE, pas BIEN → `MAYOR_DRAIN_CAP`, borné SOUS la plus faible idéale |
| le glissement après une faute coûtait quatorze points de plus que la faute affichée | *une pénalité invisible plus grosse que la pénalité visible n'est pas une pénalité, c'est un piège* |
| les mains vides, quatre malus s'empilaient et l'entretien était arithmétiquement ingagnable | *une difficulté empilée quatre fois n'est pas quatre fois plus difficile, c'est un mur* |

⚠️ **Réglage actuel, mesuré :** un premier essai ordinaire (une faute de tact au milieu, quatre à
six secondes de réflexion) culmine à **69,9** contre un seuil à 75 — il échoue de cinq points. Un
sans-faute **les mains vides** signe à **94,7** sans décrocher la confiance pleine. C'est la
tension qu'on voulait ; elle n'a jamais été jouée par un humain.

### 16.5 ⚠️ CE QUI RESTE, ET IL FAUT LE LIRE AVANT DE ROUVRIR

- ⚠️⚠️ **PERSONNE N'A JOUÉ CETTE AUDIENCE.** Le banc en joue quatre cents ; aucune n'a été menée
  par quelqu'un qui lisait les répliques. Ce qui s'y juge — *est-ce que c'est agréable, est-ce que
  les fautes de tact se voient venir, est-ce que la fuite stresse ou agace* — n'est mesuré nulle
  part et ne le sera jamais (§25 de `ferme/README.md`).
- ✅ **LA SCÈNE 3D A ÉTÉ JOUÉE DANS UN NAVIGATEUR LE 2026-08-30**, audience entière, deux clients.
  ⚠️ Les deux phrases qui étaient ici sont FAUSSES et ont été retirées : il n'y a plus de glTF (le
  bureau est procédural, `maireBureau.js`), et on entre bien DANS le bureau — rendez-vous à
  l'accueil, puis « E : entrer dans le bureau du maire » (`FermeGame.js:22832`).
  ⚠️⚠️ **ET LA PREMIÈRE SÉANCE A TROUVÉ CE QU'AUCUN BANC NE POUVAIT VOIR** : la posture DEBOUT du
  maire se désassemble (tête fendue en deux blocs décalés, écharpe détachée passant sous le plan du
  bureau, un bras en bloc isolé) alors qu'assis il est impeccable ; et tout le HUD de la ferme —
  or, jour/heure, boutons, bandeau de quête — est peint PAR-DESSUS une scène annoncée plein écran,
  deux textes se chevauchant au pixel. `verify-maire` était à 113/113 pendant ce constat : il
  vérifie que les sept postures EXISTENT et sont dessinables, jamais qu'elles s'ASSEMBLENT.
- ✅ **LA POSTURE EST CORRIGÉE ET MESURÉE LE 2026-08-31 — MAIS L'ŒIL A ÉTÉ CONSTRUIT AVANT LA MAIN.**
  Le premier geste n'a pas été de corriger : `tools/render-maire.mjs` (66/66) peint les sept poses
  côte à côte sous trois angles, sans WebGL. Il a chiffré ce que la séance décrivait — **14 cm**
  entre le buste levé et les cuisses restées assises (`rise` monte le TORSE, et les jambes ne sont
  pas ses filles), **13 cm** d'écharpe dans le bois du plateau, **5,1 cm** de main hors de portée
  bornée en silence par `solveArm` — et trois défauts que personne n'avait vus : les bras croisés
  DANS la poitrine, `applyPose` qui repartait du buste au lieu de `man`, et la table `POSE`
  corrompue à la première image par un `{ ...poseTarget }`. Le maire a maintenant un bassin, des
  hanches et des genoux ; `stand` le lève vraiment et le fauteuil recule.
  ⚠️ **Le HUD par-dessus la scène plein écran, lui, N'EST PAS corrigé** — c'est de l'interface, pas
  de la posture, et ça reste la dette la plus visible de ce chapitre.
  ⚠️ **La scène n'a pas été rejouée à l'écran depuis** : bancs, bundle et `next build` seulement.
- ⚠️ **Le point 4 du §15.3 est débloqué et pas fait** : les PNJ peuvent enfin parler du bateau,
  puisque la condition qu'ils attendaient (`MR.mayorSigned`) existe.

---

## 17. DOSSIER DE CONCEPTION 2026-08-26 — « LE PORT DES SEPT SŒURS »

### 17.1 La promesse

**En une soirée, deux amis voient tomber quelque chose d'impossible, mènent une chasse sur deux
cartes, découvrent que le lac de Valley Town est un ancien port, bâtissent ensemble le premier
navire d'exploration d'Arcardi et regardent Eduardo prendre la route des îles.** En solo, chaque
poste à deux a un partenaire diégétique plus lent ; à deux ou trois, les rôles sont simultanés et
plus rapides, jamais obligatoires au point de bloquer une sauvegarde.

La quête garde deux secrets superposés : les habitants voient un chantier municipal et parlent du
bateau ; seuls les joueurs voient les étoiles. Le retournement vient de leur accord involontaire :
la ville croit rouvrir un port, la reine utilise ce port pour donner aux joueurs une route vers
l'archipel. **Elle ne veut pas rentrer chez elle : elle veut qu'on puisse la suivre.**

### 17.2 Le rythme d'une soirée

| acte | minute cible | ce que les joueurs font | ce qui avance en arrière-plan | jalon visible |
|---|---:|---|---|---|
| I — La pluie courte | 0–15 | cinq fouilles, trois apprivoisements distincts ; les shiny restent une chasse facultative | trois impacts collectors tombent entre +0:15 et +3:00 après la première étoile | cinq traces sur la carte ; trois traînées neuves restent inconnues tant qu'elles ne sont pas fouillées |
| II — La reine | 15–27 | train, signes en ville, grand impact, relevé des éclats autour du cratère, apprivoisement à deux/épouvantail | les 2 min d'activité urbaine s'accumulent ; le cratère refroidit au maximum 3 min | oiseaux qui fuient, ombres, fumée en trois âges, six éclats plantés dans le terrain |
| III — Le port sous le lac | 27–40 | commande des plans, rendez-vous du maire, arpentage des anciennes bornes du bassin, chasse de la cinquième sœur | voyage et travail de Kerguélen ; délai du rendez-vous, **en parallèle** | planche de plans : arrivée, relevé, quille, gréement, signature |
| IV — Les trois chantiers | 40–55 | sciage à deux, remise en service des feux du port, voyage visible d'Eduardo ; chasse des sixième et septième sœurs | les cinq commandes de bois tournent déjà en parallèle | la cale gagne quille, membrures, mât, voile et cloche à leur vraie place |
| V — La route | 55–65 | dernière mise à l'eau, constellation complète, départ d'Eduardo | aucune nouvelle attente | bassin ouvert, poste d'amarrage et table des cartes restent dans le monde |

**Les nombres sont des plafonds de rythme, pas cinq minuteurs à afficher.** Le joueur peut perdre
du temps en se trompant chez le maire ou en arrivant sans ressources ; le chemin naturel, lui,
doit rester dans la fenêtre. Les shiny ne comptent jamais dans une condition de chapitre : rater
leur chute à l'écran ne rend ni le familier ni la quête perdus, car le cratère reste à fouiller.

### 17.3 Acte I — cinq impacts, puis trois surprises

La scène d'ouverture conserve cinq impacts et leur grammaire actuelle. Leur distribution cible
est **trois étoiles** (bleue, rose, blanche), **une matière** et **un vide**. C'est assez pour que
la fouille puisse décevoir sans annoncer trois fois « rien », et cela conserve les quatre sœurs
déjà jouées une fois la reine trouvée.

Dès que la première étoile est apprivoisée, trois instants sont dérivés dans les bandes du §15.2.
Chaque chute se manifeste de trois façons — trait dans le ciel, grondement orienté, nouvelle marque
sur la carte — mais ne révèle jamais son contenu. À la fouille, la quatrième famille de résultat
`pet` ouvre un médaillon collector puis le rangement existant des familiers. Les shiny sont des
variantes de trois espèces déjà aimées du monde, avec silhouette identique et matière vraiment
distincte (nacre, irisation, traînée) : **un collector doit se reconnaître en mouvement, pas à son
nom dans l'inventaire.**

Cette seconde vague donne aussi un choix de soirée : continuer la mission principale, ou se
séparer pendant trois minutes — l'un suit les impacts, l'autre finit les cinq fouilles. Elle crée
de la coopération sans ajouter une serrure multijoueur.

### 17.4 Acte II — habiter les deux attentes

Les deux minutes de Valley Town restent **cumulatives**. Elles reçoivent trois présages à 40, 80
et 120 secondes : les pigeons quittent la place, les ombres se tournent vers l'est, puis les vitres
et l'eau prennent une lueur jaune. Le joueur peut marcher, parler, vendre ou reconnaître le futur
port ; les présages donnent une montée sans transformer l'activité en checklist.

Après l'impact, six éclats sont projetés en trois couronnes autour du cratère. Les relever sert à
deux choses qui existaient sans lien : mesurer sa chaleur et révéler sur leurs faces des traits qui
forment un plan de chenal. Chaque éclat ramassé retire **15 secondes** au refroidissement, jusqu'à
90 secondes de réduction ; le cratère reste donc brûlant entre 1 min 30 et 3 min. À deux, les
joueurs couvrent des bords opposés ; seul, on fait le tour. La fumée, les braises et le son changent
à chaque tiers : le temps ne dépend plus d'une petite pastille d'interface.

La reine reste le quatrième apprivoisement : deux joueurs aux bords opposés, ou l'épouvantail en
face. Quand elle sort, elle ne montre pas seulement le navire brisé. Elle relie les six éclats et
projette **trois points encore noirs** vers le lac : les dernières sœurs ne sont pas des colis, ce
sont les guides des trois chantiers suivants.

### 17.5 Acte III — le retournement : ce n'était pas un lac

Kerguélen part et travaille toujours sur une vraie durée, mais ses 18 minutes deviennent une
**horloge de fond à cinq jalons**, pas un écran « revenez plus tard » :

| jalon | instant | transformation visible | ce qu'il ouvre |
|---|---:|---|---|
| En route | 0:00 | son portrait quitte le panneau de la gare | prendre le rendez-vous et arpenter le lac |
| Sur le quai | 3:00 | Kerguélen apparaît avec trépied et jalons | relever trois bornes de pierre |
| Bassin reconnu | 7:00 | craie et cotes apparaissent sur le quai | retournement + chasse de la verte des quais |
| Gréement | 12:00 | silhouette du mât et de la voile sur la planche | départ d'Eduardo et feux du port |
| Plans signés | 18:00 | rouleau complet, sceau et fantômes des cinq pièces | argument idéal chez le maire + toutes les commandes de Tristan |

À « Bassin reconnu », les mesures de l'ingénieur coïncident avec les traits des éclats : la berge
n'est pas naturelle. Sous la vase se trouvent un quai, une passe et les pierres d'une écluse. Une
ancienne carte d'Eduardo nomme trois îles au-delà du chenal. **Le bateau n'est plus une réparation
logistique : c'est le premier navire d'exploration d'un port qu'on croyait disparu.**

Le rendez-vous de 3, 4 ou 5 minutes se prend dès le début de ce travail et court en parallèle. On
peut tenter l'audience tôt, sans plans, pour gagner du temps au prix d'une vraie difficulté ; ou
arpenter le port, chasser la cinquième sœur et présenter les plans signés plus tard, dans la grâce
de trente minutes déjà prévue. La mécanique du maire devient un choix de rythme au lieu d'une
horloge supplémentaire.

La cinquième sœur, **verte**, bondit de borne en borne quand les trois repères sont alignés. Sa
chasse est spatiale : suivre sa réflexion dans l'eau et fermer un triangle autour d'elle ; seul,
les trois éclats relevés servent de balises fixes. Apprivoisée, elle allume les feux du futur quai.

### 17.6 Acte IV — trois chantiers, trois verbes

**La charpente et la sixième sœur — tirer.** Chez Tristan, deux poignées apparaissent sur la grande
scie. Deux joueurs alternent leurs traits : tirer quand l'autre pousse entretient l'élan, tirer
ensemble coince la lame. En solo, Tristan tient la seconde poignée et annonce son rythme ; la
séquence dure environ deux fois plus longtemps. Une lumière orange fuit dans les veines du bois,
puis saute entre les piles de planches : la chasse finale lit les copeaux et les vibrations, pas
un chevron. L'orange apprivoisée stabilise la quille sur la cale.

✅ **LA MOITIÉ SOLO EST CONSTRUITE LE 2026-08-31, ET ELLE A REMPLACÉ LE PANNEAU-LISTE.** Demande de
Guillaume : *« une scène 3D très fluide dans l'atelier de Tristan […] la scie doit pas être trop
rigide et on doit sentir l'effort […] un truc bien arcade, appuyer en rythme […] avec la
possibilité de casser la planche de bois […] Tristan en face un perso très cohérent
anatomiquement. »* Commander une pièce de bois n'est plus un clic dans une liste : on tient une
poignée, Tristan tient l'autre, et **la note obtenue change la DURÉE de la commande** (×0,60 à
×1,15). Le code vit dans `scierie.js` (mécanique pure, rejouée par l'hôte), `scierieAtelier.js`
(l'atelier et Tristan, procéduraux), `ScierieScene.js` (la vue) et `rig3d.js` (la cinématique
inverse, partagée avec le bureau du maire) ; les deux bancs sont `verify-scierie` (34/34, il JOUE)
et `render-scierie` (58/58, il RASTÉRISE sans GPU).

⚠️⚠️ **CE QUI N'EST PAS FAIT, ET C'EST LA MOITIÉ QUI PORTE LA PROMESSE DU §17.6 : LES DEUX
JOUEURS.** La mécanique est déjà symétrique — `sawPull(s, side)`, `side = −1` est la poignée d'en
face, et c'est l'automate `sawMate` qui la tient aujourd'hui. Ce qui manque est le TRANSPORT du
second journal et l'arbitrage d'une manche à deux transcriptions. Ce n'est pas un oubli, c'est une
dette datée : le lot E devait être jugeable isolément (règle du 424, ne pas mêler deux changements
visuels), et une manche coopérative demande d'abord de trancher si la commande de bois doit
*exiger* deux joueurs — ce que le §17 s'interdit ailleurs.
⚠️ **LA SIXIÈME SŒUR N'EST PAS POSÉE NON PLUS.** La lumière orange dans les veines du bois et ses
sauts entre les piles de planches appartiennent à la chasse, pas au geste : les piles existent dans
l'atelier, à leur place, et rien d'autre n'a été écrit. Poser la sœur maintenant aurait mêlé une
mécanique de chasse à une mécanique d'effort dans la même livraison.

**Le voyage d'Eduardo et la septième sœur — guider.** Eduardo ne disparaît plus derrière un délai.
Son petit bateau suit une route visible sur l'eau pendant que les joueurs rallument trois feux :
entrée du chenal, bout du quai, tour du parc. À deux, l'un entretient la séquence des feux et
l'autre rejoint le poste de signal ; seul, on suit leur ordre. Dans le brouillard, une lumière
violette se met devant Eduardo et le ramène avec la voile. Elle bondit ensuite de bitte en bitte
jusqu'au navire. Ce geste rend son voyage jouable et prouve déjà ce que le futur système d'îles
devra montrer : **où est le bateau, où il va, quand il revient.**

**La cale — assembler.** Les commandes de bois restent parallèles, mais leur livraison se monte
dans un ordre lisible. Chaque pièce a trois états sur le vrai navire : fantôme bleu, matériaux
posés, pièce assemblée. Le sciage, le voyage et le montage ne sont donc plus trois panneaux : ils
se répondent dans le monde. La cloche est le signal du port, pas un trésor arbitraire ; elle sonne
quand les sept sœurs prennent leur place.

### 17.7 Acte V — une fin qui ouvre quelque chose

Au lancement, les sept compagnes tracent la **Brebis** dans le ciel — sept points et six segments,
seulement dehors et de nuit ou pendant cette scène. Le navire descend la cale, franchit l'ancienne
passe et Eduardo part reconnaître la route. Il ne s'évapore pas : le quai conserve son amarre vide,
une table des cartes et un fanion **« En mer »**. Tant que les îles ne sont pas construites, ce sont
la promesse honnête et la trace du voyage. Quand elles le seront, ce même poste deviendra le choix
d'expédition et le navire reviendra s'y amarrer.

Les habitants célèbrent la réouverture du **port de Valley Town**, sans jamais nommer les étoiles.
Les joueurs comprennent seuls le second sens : la reine a fabriqué une route entre le monde partagé
et les prochains mondes d'Arcardi.

### 17.7 bis Autorité — la chasse des sœurs 5 à 7 ne se simplifie pas

⚠️⚠️ **AUTORITÉ 2026-09-01 — LES QUATRE DERNIÈRES SŒURS NE SE PRENNENT PAS COMME LES TROIS
PREMIÈRES.** Guillaume, en tranchant la portée du correctif de constellation (§13 de `CLAUDE.md`) :
*« il faudra chercher les étoiles manquantes d'une manière inédite mais le taming final sera bien
le moyen de les récupérer. Elles doivent résister au taming simple, il faut inventer mieux. »* Ce
que les §17.5 et §17.6 décrivent déjà va dans ce sens — la verte se chasse par triangulation d'une
réflexion dans l'eau, l'orange se repère aux copeaux et aux vibrations plutôt qu'à un chevron, la
violette se guide de feu en feu à travers le brouillard — et cette phrase les **verrouille** :
aucune des trois ne doit se réduire, à l'implémentation, à une approche puis un apprivoisement
simple comme les trois premières sœurs. Le geste d'apprivoisement final reste la porte de sortie de
chaque chasse, jamais son intégralité.

### 17.8 Transformation graphique du lac en port

⚠️⚠️⚠️ **AUTORITÉ 2026-08-31 — CE N'EST PAS UN BASSIN, C'EST UN ACCÈS À L'OCÉAN.** Décision de
Guillaume : *« Je veux que l'on considère le lake and pier plutôt comme un accès à l'océan, et donc
le port de Valley Town. »* Le §17.5 disait déjà « ce n'était pas un lac » ; ce qui durcit ici est
que **l'eau doit MENER QUELQUE PART**. Sans ça, le navire d'Eduardo part au large depuis un étang,
la promesse des îles n'a pas de support dans la carte, et le retournement reste une réplique au
lieu d'être un lieu. **LES ARBITRAGES SONT TRANCHÉS, ET LA CARTE EST FAITE.** Guillaume, le même jour :
*« il faut imaginer que le lac actuel sera une sorte de fleuve qui mène à une sortie ; par la
droite. ensable un peu »* · *« il y aura un mode de navigation jouable bientôt, mais pour l'instant
juste faire un fondu enchaîné, avec décor marin générique (à l'avenir nous ferons une navigation
3D) »* · *« eduardo peut utiliser le navire. mais nous aussi en montant dedans : soigner les
sprites. anatomiquement cohérentes dans un bateau, mouvements cohérents »*.

✅ **LE FLEUVE ET LA PASSE SONT CONSTRUITS** (2026-08-31) : le bassin de la ville se resserre vers
l'est, la passe fait 4 rangées d'eau contre 10 dans le bassin, le fleuve sort du monde au bord est,
et `verify-vallee` vérifie qu'**on peut aller de la cale au large par l'eau**. Le détail est au
§32 de `components/ferme/README.md`. ⚠️ **Rien d'autre n'est fait** : ni les ruines portuaires de
la passe (elles appartiennent au retournement, lot D — les poser maintenant mêlerait deux
changements visuels), ni le fondu, ni les poses du fermier à bord.

⚠️⚠️ **ET LE RETOURNEMENT CHANGE DE NATURE, IL FAUT LE SAVOIR AVANT D'ÉCRIRE LE TEXTE.** Si l'eau
mène visiblement au large, la ville n'a jamais pu croire à un lac : *« ce n'était pas un lac »*
tombe. Ce qui le remplace est plus solide et déjà dans la carte — **la passe est ensablée depuis
vingt ans, plus personne ne peut sortir** : un blocage concret qu'on lève, au lieu d'un secret.



La transformation doit se lire par grandes masses, dans cet ordre : **passe navigable**, deux quais
en pierre et bois, cale/rampe, feux d'entrée, petit entrepôt, table des cartes. Les accessoires
(cordages, casiers, bouées, mouettes) viennent ensuite. On conserve une rive sauvage pour que le
lieu ne devienne pas une marina uniforme ; le port occupe la berge déjà liée au chantier naval et
ouvre visuellement l'eau vers l'extérieur de la carte.

Les cinq jalons de Kerguélen modifient progressivement ce décor : bornes dégagées, lignes de craie,
pilotis, feux, puis passe ouverte. La ville ne se réveille donc pas dans un port terminé après un
fondu : **les joueurs la voient changer pendant qu'ils y travaillent.**

### 17.9 Décision UI de livraison — uniquement le plan du bateau

**Une seule proposition graphique de ce dossier entre dans le jeu : la progression de la
construction du bateau, dans le panneau existant ouvert avec `P`.** Les autres idées de la
maquette — nouveau bandeau de quête, alerte de monde, constellation redessinée, postes coopératifs
et nouvelle carte — restent hors périmètre et ne doivent pas être implémentées par cette livraison.

Le panneau conserve le dessin actuel du navire. Sous ce dessin, les cinq anciennes lignes avec
`✅`, `🪚` ou `◻` deviennent une barre horizontale en cinq segments : coque, gouvernail, mât, voile,
cloche. **Décision de Guillaume : cette barre ne porte aucune icône.** Chaque segment lit directement
les données déjà persistées de la pièce et distingue cinq états typographiques : `À VENIR`,
`À COMMANDER`, `EN FABRICATION`, `À MONTER`, `ASSEMBLÉ`. Le trait de fabrication est le seul
avancement continu ; il se dérive des dates de la commande de Tristan et n'est jamais sauvegardé.

Ce n'est pas un second compteur. Le dessin, la barre et la cale rejoignent les mêmes cinq clés de
`STAR_SHIP_ORDER`; aucune valeur `3/5` n'est ajoutée à l'état. Sur petit écran, les cinq segments
restent dans l'ordre du navire et défilent horizontalement plutôt que de réduire leur texte jusqu'à
devenir illisible. Au bord de l'eau, le comportement historique de `P` reste inchangé : le plan
projette le bateau directement dans le monde, sans panneau qui cacherait la cale.

Wireframe du panneau `P` :

```text
 PLANS DE CONSTRUCTION — LE NAVIRE DES SEPT SŒURS
 [dessin actuel du bateau]

 PROGRESSION DE LA CONSTRUCTION
 ┌ coque ┐ ┌ gouvernail ┐ ┌ mât           ┐ ┌ voile       ┐ ┌ cloche  ┐
 │assemblé│ │ à monter  │ │ en fabrication│ │ à commander │ │ à venir │
 └────────┘ └───────────┘ └────────────────┘ └─────────────┘ └─────────┘

 Prochaine transformation visible : gouvernail.
```

### 17.10 Lots d'implémentation — ne pas mêler les changements visuels

| lot | contenu | validation indispensable |
|---|---|---|
| A | chronologie 5 + 3 sur trois minutes, résultat `pet`, trois shiny | banc pur sur les bandes + partie rechargée après la fenêtre + rendu des trois familiers |
| B | six éclats et refroidissement actif | jouer le tour du cratère seul et à deux ; mesurer chaleur et réduction ensemble |
| C | planche à cinq jalons et ordonnancement parallèle maire/ingénieur | partie reprise à chacun des cinq instants, sans comparer horloge invité/hôte |
| D | port, retournement et cinquième sœur | vérification visuelle dédiée ; aucune constellation sous un plafond |
| E | sciage coop/solo et sixième sœur | deux vrais clients aux deux poignées, puis repli Tristan en solo — ⚠️ **la moitié SOLO est livrée le 2026-08-31 et a été jouée à l'écran une fois** (jamais jusqu'à la victoire ni jusqu'à la troisième planche fendue) ; la coop et la sixième sœur restent entières, voir le §17.6 |
| F | voyage visible d'Eduardo, feux et septième sœur | deux vrais clients sur les rôles, puis perte/reprise de connexion pendant le voyage |
| G | finale, ciel à sept points, statut « En mer » | partie complète en une soirée ; navire et trace persistants après rechargement |

⚠️ **CE PARAGRAPHE DATE DE LA LIVRAISON DU §17.9 ET IL EST DEVENU FAUX LE 2026-08-31** : la moitié
solo du **lot E** est construite (voir le §17.6). Il reste vrai pour tous les autres lots — A, B, C,
D, F, G ne sont toujours pas livrés, et la coop du E non plus.
Les lots restent séparés parce que chacun change un geste ou un dessin que Guillaume doit pouvoir
juger isolément. La chaîne multijoueur complète reste la validation terminale : relais du plat,
bords opposés, scie et feux du port, avec deux vrais clients et sans raccourci développeur entre
les postes.
