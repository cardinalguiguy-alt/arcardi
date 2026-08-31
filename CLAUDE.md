# CLAUDE.md — CONTEXTE ARCARDI

**Lis ce fichier en entier avant toute action. Puis arrête de lire et demande.**
Il remplace l'exploration du dépôt pour tout ce qui est global. Le README est un journal
chronologique inversé : c'est de l'**histoire**, pas de l'orientation.

---
## ⏭️ REPRISE — SI GUILLAUME DIT SEULEMENT « REPRENDS LE TRAVAIL », C'EST ICI

⚠️⚠️⚠️ **CE BLOC EST LE SEUL ENDROIT DU FICHIER QUI DÉSIGNE UNE ACTION SUIVANTE.** Il se
REMPLACE à chaque fin de livraison, il ne s'empile jamais. *Un fichier qui contient tout ne dit
rien tant qu'il ne dit pas par quoi commencer.*

**ACTION SUIVANTE UNIQUE — JOUER LA QUÊTE DE L'ÉTOILE EN ENTIER, D'UNE TRAITE, ET DIRE SI ELLE
A DU RYTHME.** Le chantier « la quête est chiante » a deux moitiés : la COUPE (livrée la veille,
jamais rejouée) et le RYTHME (livré ce jour, vu à l'écran). Ce qui reste à juger n'est pas du code.
(1) **Les trois nombres de la coupe** — `STAR_ENG_WORK_MS` 15 → **5 min**, `STAR_ENG_TRAVEL_MS`
3 → **1 min**, second rendez-vous chez le maire **1 min** au lieu de 3 à 5 : le vide sans geste
passe de 33,8 à ~18,8 min sur 42. Est-ce que la seconde moitié respire, ou faut-il la MEUBLER
(le §17 garde de quoi : les trois présages de l'attente, les six éclats autour du cratère) ?
⚠️ Réversible en trois valeurs, et **rien de tout ça n'a encore été joué à cadence réelle**.
(2) **Le ruban de jalon** : est-ce qu'il arrive au bon moment, assez longtemps, sans gêner ?
(3) **L'étoile qui parle** : vingt répliques indexées sur la clé d'objectif, désormais écrites
signe à signe. Trop lent, trop vite ?
⚠️⚠️ **CE QUI N'A PAS PU ÊTRE JOUÉ, ET IL FAUT LE SAVOIR AVANT DE CONCLURE** : le montage d'UNE
pièce au marteau sur la cale. Le déplacement automatisé n'a pas permis d'atteindre la cale
(à quatorze cases du ponton, derrière les accessoires du quai), donc le ruban n'a été vu qu'en
version « cinq pièces d'un coup » par le menu dev. Sa version à UNE pièce est tenue par
`render-navire` §5 bis, qui la rastérise et publie sa planche — pas par l'écran.
⚠️⚠️ **DEUX GARDE-FOUS DE GUILLAUME, TOUJOURS EN VIGUEUR** : *« attention de ne pas basculer dans
le WTF »* et *« l'idée est de rajouter du fun, mais pas de complexifier à outrance »*, doublés le
2026-09-01 par *« n'ajoute pas d'éléments wtf […] jeu que des enfants de 10 ans joueront ; on garde
ce qu'on a et on ajoute ou modifie pour densifier et faire participer »*. **Aucune mécanique n'a
été ajoutée par ce chantier, et c'est délibéré** : tout est de l'habillage et du tempo sur des
gestes qui existaient déjà.
⚠️⚠️⚠️ **CE QUI RESTE DE L'AUDIT, NON FAIT, PAR ORDRE** : la **constellation** (cinq points écrits
en dur, la fiction en promet sept, et elle se peint dès la chute **y compris à l'intérieur des
bâtiments** — seule garde : `isNightTime`) ; les **quatre morceaux sans provenance** (safran, mât,
voile, cloche — `SHIP_SITE_OF` rend `null`, techniquement finissable et narrativement muet) ; le
**HUD peint par-dessus la scène plein écran du maire** ; les **1 829 canevas 2D au chargement**
(tablette). Aucun n'est bloquant ; tous sont datés.
⚠️ **ET LE CHANTIER SUIVANT EST DÉJÀ NOMMÉ PAR GUILLAUME : LA DENSIFICATION DES RELATIONS SOCIALES
ENTRE RÉSIDENTS.** Son premier dossier vaut d'être repris : *les quatre morceaux muets deviennent
quatre personnes à convaincre*, avec la contrainte que le §15.1 impose déjà — **on plaide pour un
bateau sans jamais pouvoir dire pourquoi on le construit**. Le moteur de `maire.js` est réutilisable
presque tel quel (`MAYOR_NODE[id]` n'est lu qu'à TROIS endroits, `mayorReplay` est agnostique,
`MayorWatch` donne le mode spectateur gratuitement) ; le coût réel est le DÉCOR, et il ne faut pas
le payer quatre fois — `maireBureau.js` fait 1 471 lignes, Tristan a déjà sa scène, et le genre
aventure ALTERNE les registres. ⚠️ **Sortir la table des nœuds de `maire.js` n'a PAS été fait,
exprès** : abstraire à l'aveugle avant de connaître les besoins des résidents produirait la
mauvaise abstraction.

⚠️⚠️⚠️ **LE RYTHME DE LA QUÊTE EST LIVRÉ LE 2026-09-01 : TROIS VOLUMES SONORES AU LIEU DE DEUX.**
Demande de Guillaume : *« ce sont les textes, les overlays qui doivent être plus fluides et animés,
et + retenir l'attention quand une milestone est passée »*. Le diagnostic tient en une phrase — la
quête n'avait que le TOAST (cadre en bois, 3,2 s, la même forme que « +3 blé ») et la CARTE PLEIN
ÉCRAN (5 à 7 fois par soirée), donc les vingt petits jalons d'une partie tombaient tous dans le
chuchotement de l'intendance. Le détail vit à côté du code ; ici, seulement ce qu'il ne faut pas
casser :
· **LE BANDEAU EST DEVENU VIVANT** — il était le seul élément permanent de la quête et c'était un
panneau mort. La pastille qui se remplit s'allume, le bandeau tressaille, la phrase d'objectif
CROISE l'ancienne au lieu de la remplacer, et une barre pousse sous le tout. ⚠️ **Aucun de ces
quatre affichages ne compte quoi que ce soit** : tous lisent la même liste de pastilles (`starDug`
ou `starShipParts`) — *une jointure, jamais deux listes* (449).
· **LE RUBAN DE JALON (`STAR_RIBBON_MS`) EST LE VOLUME DU MILIEU**, et il SORT du bandeau pour y
RETOURNER : le mouvement dit « ce que tu viens de gagner est rangé là-haut ». Il **remplace** le
toast du navire au lieu de s'y ajouter (les deux se recouvraient au pixel) et en REPREND le texte,
donc aucune phrase n'est perdue. ⚠️ Il est armé par `starWatch`, **jamais par un mini-jeu gagné** :
un ruban lancé sur `onWin` annoncerait une pièce que l'hôte n'a pas encore posée.
· ⚠️⚠️ **SA VIGNETTE MONTRE L'ÉCART, PAS L'ÉTAT** : deux canevas superposés (le navire AVANT
au-dessus, APRÈS au-dessous) et celui du dessus s'efface en clignotant. Les deux sont peints au
MÊME instant `t`, sinon les fantômes ne seraient pas en phase et tout le bateau scintillerait.
· ⚠️⚠️⚠️ **ET LE HALO EXISTE PARCE QU'UN BANC L'A EXIGÉ.** `render-navire` §5 bis a mesuré, en
luminance et sur le dessin AVEC fantômes — celui du ruban —, ce que le clignotement montre
vraiment : coque 2 792 px, voile 2 622… **safran 201**, cloche 459. Deux des cinq rendez-vous du
chantier ne changeaient donc l'image que d'un millième. Le ruban cercle désormais ce qui a changé,
**et la boîte se déduit des deux images** — aucune coordonnée de pièce n'est écrite nulle part. Le
halo ne sort QUE pour les petites pièces (boîte ≤ 12 % de la vignette) : cercler la coque
reviendrait à entourer le bateau pour désigner le bateau.
· **L'ÉTOILE ÉCRIT SES PHRASES SIGNE À SIGNE** (`STAR_BUBBLE_CPS`, 48/s, borné par l'horloge et
non par un compteur d'images). ⚠️ **La bulle est dessinée à sa taille FINALE dès la première
image** : une boîte qui grandit avec son texte tressaute à chaque signe. Les vingt autres appelants
de `drawSpeechBubble` ne passent pas de `reveal` et ne bougent pas d'un pixel.

⚠️⚠️ **ET LA SÉANCE DE JEU A TROUVÉ TROIS DÉFAUTS QU'AUCUN DES QUARANTE BANCS NE POUVAIT VOIR** :
le bandeau **sorti de l'écran** (un `position:relative` redéclaré plus bas écrasait le
`position:fixed` d'origine — 953 px du haut) ; la toute première consigne de la quête **tronquée en
silence** (« …Ouvre la carte et… », parce qu'un `-webkit-box` calcule sa largeur en équilibrant ses
lignes) ; et les toasts qui **recouvraient** le bandeau puis la pastille d'attente. Les trois sont
corrigés et commentés dans `app/globals.css`.

Vérifications : **40 bancs relancés un par un, zéro `ÉCHEC`** — `verify-quete` **631/631**,
`verify-maire` **113/113**, `verify-vallee` **223/223**, `verify-vergers` **61/61**,
`verify-cycle` **38/38**, `verify-scierie` **34/34**, `verify-ludo` **30/30**, `verify-taxi`
**15/15**, `verify-gates` **14/14**, `verify-compo` **13/13**, `verify-pont` **12/12**,
`verify-sol2` **8/8**, `verify-portee` **6/6**, `verify-strings` **1106 clés appariées**,
`verify-syntax`, `verify-scope`, `verify-objects`, `verify-orchards` **42/42**, `verify-constants` ;
côté rendu `render-etoile` **161/161**, `render-maire` **66/66**, `render-scierie` **58/58**,
`render-navire` **48/48** (trois contrôles neufs, témoin d'échec vérifié), `render-escaliers`
**35/35**, `render-parc` **31/31**, `render-beffroi` et `render-rues` **28/28**, `render-oiseaux`
**27/27**, `render-eau` **16/16**, `render-mairie` **14/14**, `render-eglise` **13/13**,
`render-arbres` **12/12**, et les sept sans contrôle chiffré. Bundle esbuild propre sur
`FermeGame.js` (seul `G_SOIL` préexistant subsiste) ; `git diff --check` propre ; `next build`
**✓ Compiled successfully** puis l'arrêt documenté sur `supabaseUrl`. Échafaudage de jeu local
(`.env.local`, `app/rythme/`) **supprimé**. **Aucune migration SQL, aucun changement de schéma,
aucune manipulation Supabase.**

⚠️⚠️⚠️ **LE LOT E EST LIVRÉ LE 2026-08-31 : LA GRANDE SCIE DE TRISTAN, EN 3D, JOUÉE AU RYTHME.**
Demande de Guillaume, mot pour mot : *« implémenter cette scène 3D très fluide dans l'atelier de
Tristan (aussi fluide et quali que le jeu de ski slope). Le rendu doit être absolument parfait, la
scie doit pas être trop rigide et on doit sentir l'effort. Je veux un truc bien arcade, appuyer en
rythme pour découper les planches etc avec la possibilité de casser la planche de bois etc. Et
Tristan en face un perso très cohérent anatomiquement, on doit ressentir l'effort. Le décor
intérieur du bâtiment de Tristan doit être parfaitement traité. »* Le détail vit à côté du code ;
ici, seulement ce qu'il ne faut pas casser :
· **Quatre fichiers, et le découpage est celui du maire** : `scierie.js` (la mécanique pure, que
l'hôte REJOUE), `scierieAtelier.js` (l'atelier et Tristan, procéduraux, sans un fichier à charger),
`ScierieScene.js` (la vue), `rig3d.js` (la cinématique inverse, **partagée avec le maire** — deux
personnages articulés, une seule loi des cosinus).
· ⚠️⚠️ **LA COMMANDE DE BOIS NE SE CLIQUE PLUS, ELLE SE SCIE.** Le panneau de Tristan ouvre la
scène ; à la fin le client envoie sa TRANSCRIPTION (des numéros de pas, pas des horodatages) et
l'hôte rejoue la manche avec `sawRun`. **Un seul `send()` pour tout le sciage** (§3), et le client
n'annonce jamais son résultat.
· **Rien n'est prélevé tant que la manche n'est pas gagnée** : c'est ce qui autorise la rupture de
planche à être un vrai risque. Perdre coûte le temps qu'on vient d'y passer, jamais du bois.
· **La note ne change que la DURÉE de la commande** (×0,60 à ×1,15), jamais son prix — seules les
planches fendues coûtent du bois, parce que c'est du bois qu'on a réellement fendu. Un mini-jeu qui
change une dépense ferait de l'adresse une monnaie, et la ferme a déjà une économie.
· **Le mou de la lame est la grandeur qui fait le rythme, et il se VOIT** : une scie qu'on laisse
s'arrêter se détend, la lame s'assied dans son trait, et la fenêtre parfaite se referme. C'est la
même valeur qui juge et qui fléchit le dessin.
· **Tristan a les pieds PLANTÉS** : ses jambes sont résolues en cinématique inverse vers deux
appuis fixes, et ses mains vers la poignée réelle (fille de la lame). Aucune position n'est
recopiée, donc rien ne peut se décrocher — et il ne patine jamais.
· **Un arrêt de menu dev naît le même jour** (« 🪚 Open Tristan's saw ») : leçon du 425 payée
d'avance, sinon on ne juge la manche qu'une fois.
⚠️⚠️ **ET LES DEUX BANCS NEUFS ONT TROUVÉ NEUF DÉFAUTS QU'AUCUNE RELECTURE N'AURAIT VUS**, dont
trois qui valent d'être retenus : **le madrier était à hauteur de poitrine** (Tristan sciait les
coudes en l'air, avant-bras en travers du buste — la posture était exacte et absurde) ; **tous les
genoux pliaient à l'envers** ; et **le plafond de temps de la manche était posé par chaque appelant
au lieu d'être dans la simulation**, donc le client et l'hôte pouvaient s'arrêter à des pas
différents — une commande gagnée à l'écran et refusée par le réseau.
⚠️ **CE QUE LES BANCS NE POUVAIENT PAS VOIR, ET QUE L'ÉCRAN A MONTRÉ EN TRENTE SECONDES** : la
scène était **entièrement surexposée** (le rastériseur du banc n'a pas `sRGBEncoding`, il rendait
un atelier plausible là où le vrai moteur rendait du blanc), **cadrée beaucoup trop serré**, et
**la scène se refermait toute seule** — React 18 nettoie puis remonte les effets en développement,
et le nettoyage rapportait la manche.

⚠️⚠️ **LE BATEAU EST LIVRÉ LE 2026-08-31, ET IL N'A COÛTÉ NI CANAL RÉSEAU NI POSE NEUVE.** Demande
de Guillaume : *« eduardo peut utiliser le navire. mais nous aussi en montant dedans : soigner les
sprites. anatomiquement cohérentes dans un bateau, mouvements cohérents »*, puis *« travaille
surtout la mécanique et la cohérence organique, nous ornementerons plus tard »*. Le détail est au
**§33 de `components/ferme/README.md`** ; ici, seulement ce qu'il ne faut pas casser :
· **C'est le patron de la MONTURE, recopié exprès et pas généralisé** : `board`/`unboard` arbitrés
par l'hôte, deux places, et surtout **la position de la coque se DÉDUIT de son pilote** — zéro
octet de réseau (§3). Le CAP aussi : le pilote écrit `m.dir`, qui circule déjà.
· **La disponibilité ne crée aucune porte** : `starShipComplete` et `starShipGone`, deux prédicats
qui existaient. **Le bateau n'existe donc qu'une fois la quête finie** (menu dev pour l'essayer).
· **`E.boatStep` est PUR**, donc rejouable — et c'est ce qui a tout trouvé (ci-dessous).
· **La coque de collision n'est pas la coque dessinée** (1,7 case contre 2,6) : une coque qui bloque
ce qu'elle montre est immobile dans une passe de quatre rangées.
· **Aucune pose assise n'a été dessinée** : `drawSeated` (428) est réutilisée, et le plat-bord peint
APRÈS l'occupant fait le reste. *La pose assise juste est celle qu'on ne redessine pas.*
⚠️⚠️ **ET LE BANC A TROUVÉ TROIS VERROUS QU'AUCUNE RELECTURE N'AURAIT VUS**, dont celui-ci, qui vaut
d'être retenu : **la coque s'échouait en tournant sur place, 4 934 images à terre sur 5 400** — le
PAS était testé, la ROTATION ne l'était pas. *Un véhicule a deux degrés de liberté ; les tester à
moitié, c'est ne pas les tester.*

⚠️⚠️ **LE FLEUVE EST LIVRÉ LE 2026-08-31, ET LA CARTE A ENFIN UNE SORTIE.** Décision de Guillaume :
*« Je veux que l'on considère le lake and pier plutôt comme un accès à l'océan, et donc le port de
Valley Town »*, puis *« une sorte de fleuve qui mène à une sortie ; par la droite. ensable un peu »*.
Valley Town était close de tous les côtés : le navire censé « prendre le large » depuis le 453
partait d'un étang. Mesuré : **10 rangées d'eau dans le bassin, 4 au plus étroit de la passe
(x 166), 6 au bord du monde**, et `verify-vallee` vérifie qu'**on va de la cale au large par
l'eau**, à quatre voisins. Le détail est au **§32 de `components/ferme/README.md`** ; ici, seulement
ce qu'il ne faut pas casser :
· **C'est le MÊME champ de rive prolongé, pas une seconde nappe** — deux nappes raccordées bout à
bout se décaleraient au premier réglage, et la couture tomberait là où le navire passe.
· **La passe n'a qu'une rive**, parce que le fleuve longe le bord sud du monde : lui en donner une
seconde laisserait une bande de terre inatteignable, le défaut exact du 439.
· **L'ensablement ne se peint pas, il se creuse** : la profondeur de l'eau est une transformée de
distance à la terre, donc un chenal étroit devient tout seul un haut-fond pâle.
· **Trois constantes du BOIS ont dû être reprises ENSEMBLE** (0,19 / 1,00 / y 157, issues d'un
balayage) : son cœur tombait dans le coin que le fleuve occupe désormais.
· **Un arrêt de téléport `townPasse` naît le même jour que la passe** — leçon du 425 appliquée
avant d'être repayée : à quarante-trois cases du ponton, on ne serait pas allé la regarder.
⚠️ **ET LE RETOURNEMENT DE LA QUÊTE CHANGE DE NATURE** : si l'eau mène visiblement au large,
personne n'a jamais cru à un lac. Ce qui le remplace est plus solide et déjà dans la carte — *la
passe est ensablée depuis vingt ans, plus personne ne peut sortir.* `QUETE.md` §17.8 le dit.
⚠️ **AUCUNE RUINE PORTUAIRE À LA PASSE** (môle écroulé, duc-d'Albe, bornes) : elles appartiennent
au retournement, lot D, et les poser ici mêlerait deux changements visuels.

**LE MAIRE EST CORRIGÉ ET MESURÉ LE 2026-08-31 — ET IL A FALLU CONSTRUIRE L'ŒIL AVANT LA MAIN.**
La première chose faite n'a pas été de corriger, c'est de rendre la posture REGARDABLE :
**`tools/render-maire.mjs`, 66/66, le premier banc de rendu du dépôt qui regarde de la 3D** — pas
de WebGL, pas de npm, `tools/lib-3d.mjs` charge le r128 vendorisé du dépôt et rastérise à la main.
Il peint les sept poses × trois angles (`tools/out/maire-postures.png`) et les trois vues du jeu
(`tools/out/maire-bureau.png`). **Six défauts qu'aucun banc ne pouvait voir, tous trouvés par lui :**
· **la posture DEBOUT n'existait pas** — `rise: 0.13` lève le BUSTE, et les jambes ne sont pas
ses filles : un tronc **quatorze centimètres** au-dessus de ses propres cuisses. Le maire a
maintenant des hanches, des genoux et un BASSIN (qui manquait, d'où une fente de 1,5 cm à la taille
sur toutes les poses) ; `stand` déplie l'homme, `STAND_LIFT` est **dérivé** de la jambe, et le
fauteuil recule. Au repos la géométrie est celle d'avant **au millimètre** — les six autres poses
ne bougent pas d'un pixel.
· **l'écharpe passait dans le bois du plateau** (jusqu'à 13 cm) : raccourcie de 60 à 40 cm et
remontée. C'est aussi le bon dessin — une écharpe de maire se noue à la hanche.
· **deux cibles de main étaient hors de portée** (`window` 5,1 cm, `stamp` 2,5) et `solveArm` les
bornait EN SILENCE ; et `ARM_FORE` mentait d'un centimètre sur les quatorze. Les 14 mains arrivent
maintenant **à 0,0 cm**.
· **les bras croisés étaient DANS la poitrine** — seuls les doigts ressortaient, au menton.
· **`applyPose` repartait du buste et pas de `man`**, donc une image de retard qui n'a coûté zéro
tant que rien ne levait la racine, et 39 cm le jour où `stand` l'a levée.
· **la table `POSE` se corrompait à la première image** : la vue partait de `{ ...poseTarget }`,
qui recopie la référence des tableaux de mains. `poseState` la copie ; le banc rejoue 200 images.
⚠️ **`ROOM.deskD` passe de 1,12 à 1,00** : le maire était assis DANS son bureau de 2,5 cm en
permanence et de 7 penché sur le tampon. Invisible de notre chaise, visible dès que la caméra
libre passe sur le côté — c'est-à-dire dans le geste même que la scène promet.

⚠️ **CE QUI RESTE SUR LE MAIRE, ET CE N'EST PLUS DE LA POSTURE** : **tout le HUD de la ferme est
peint par-dessus la scène annoncée PLEIN ÉCRAN** — or, jour/heure, boutons, bandeau de quête, avec
deux textes qui se chevauchent au pixel (`Glissez pour regarder…` x 861→1264 contre `🏠 Maison`
x 1079→1270). ⚠️ *Les deux autres points de cette liste sont tombés depuis : les huit feuilles
`L.maire` orphelines sont supprimées et gardées par un contrôle, et la fin de la quête n'est plus
trois points colorés — le navire entre dans sa scène de résolution.*
⚠️⚠️ **ET CE QUE `render-maire` NE SAIT PAS FAIRE, ÉCRIT AVANT QU'ON S'Y FIE** : il ne juge NI
l'éclairage (pas d'ombre portée, textures réduites à leur couleur moyenne — le §8 reste hors de sa
portée), NI les TRANSITIONS (`ease` glisse d'une pose à l'autre, et c'est en chemin qu'un bras peut
traverser un torse ; il regarde les sept ARRIVÉES). **Le bureau du maire n'a jamais été rejoué à
l'écran depuis cette correction** — seuls les bancs, le bundle et `next build` l'ont vue.

Vérifications : **38 bancs relancés un par un, tous verts, zéro `ÉCHEC`** — `render-maire` **66/66**
(neuf), `verify-vallee` **223/223** (six contrôles pour le fleuve, neuf pour la barque), `verify-maire` **113/113**,
`verify-quete` **628/628**, `verify-strings` **1106 clés**, `verify-ludo` **30/30**, `verify-taxi`
**15/15**, `render-parc` et `verify-portee` verts ; bundle esbuild propre sur `FermeGame.js` ET sur
`MaireScene.js` (seul `G_SOIL` préexistant subsiste) ; `git diff --check` propre ; `next build`
**✓ Compiled successfully** puis l'arrêt documenté sur `supabaseUrl`. **Aucune migration SQL, aucun
changement de schéma, aucune manipulation Supabase n'est nécessaire.**
⚠️⚠️ **ET RIEN DE CETTE SESSION N'A ÉTÉ VU EN JEU** — ni le maire corrigé, ni le fleuve. C'est la
limite que le §10 rappelle en gras : *regarder l'écran est la seule chose qui trouve ce qu'on n'a
pas encore compris.* Deux arrêts du menu dev existent pour que ça coûte dix secondes chacun :
« Valley Town — le fleuve et le ponton » et le neuf **« ⛵ la passe »**.

⚠️ **UN OUTIL À CONNAÎTRE AVANT DE REPRENDRE : `tools/.cache/*.mjs` ET `tools/out/*.png` SONT SUIVIS
PAR GIT** (la règle `/out` du `.gitignore` ne vaut qu'à la racine). Lancer un banc SALIT donc l'arbre
de travail, et `git status` cesse d'être un contrôle de propreté utilisable. Corollaire mesuré le
2026-08-31 : **sept des dix-huit bancs de contrôle ne peuvent pas tourner en lecture seule** — ils
écrivent `tools/.cache/fermeConstants.mjs` via `lib-canvas.mjs:307`. À savoir avant de confier un
audit à un agent en bac à sable : il rendra « 0/13 exécutés » sans que rien ne soit cassé.
⚠️ `render-maire` et `verify-maire`, eux, copient dans `os.tmpdir()` : c'est le motif à reprendre.

⚠️ **DÉCISION DE GUILLAUME, TOUJOURS EN VIGUEUR : LE BUG DU CHAUDRON-ARTÉFACT VISIBLE SUR 4 TERRES/5
N'EST PAS CORRIGÉ.** Le sprite scintillant (`FermeGame.js`) reste sans la garde `spec.key==="evil"`
que l'interaction a déjà. **Ne pas le corriger avant d'en avoir reçu l'ordre.**

⚠️⚠️ **UNE MESURE À PART, DEMANDÉE PAR GUILLAUME (« un ami qui joue sur tablette me dit qu'arcardi ne
fonctionne plus ») : LE CHIFFRE EST 1 829 CANEVAS 2D RETENUS AU CHARGEMENT** (2 722 créés,
2,6 millions de pixels), dont `townWater` **636** et `petFrames` **468** à eux deux. Le détail et ce
qu'il faut en faire sont au §10, « ce qui n'existe pas » — **toujours pas corrigé**, mesuré et daté.

| Lot | Ce que c'est | État |
|---|---|---|
| 0 | La rivière | ✅ **CLASSÉ SANS SUITE — le défaut 1 de l'audit est FAUX.** On traverse à cheval depuis 2026-07 (`HORSE_WATER_SLOW`, `fermeConstants.js:619`), premier cheval 800 or. |
| 1 | Ce qui ment (textes, invité, HUD) | ✅ **LIVRÉ AU 478** — défauts 5, 6, 7, 8, 11, 13 |
| 2 | Le chantier naval devient un chantier | ✅ **LIVRÉ AU 478** — défaut 4 |
| 3a | La tenue devient une scène | ✅ **LIVRÉ AU 478** — défaut 2 ⚠️ *et sa lumière ne s'est jamais affichée : voir le préalable ci-dessus* |
| 3b | Les trois verbes distincts | ✅ **LIVRÉ AU 479** — défauts 3, 9, 10 |
| 4 | **La passe maire** | ✅ **LIVRÉE AU 480** — §16 de `QUETE.md`. La suite est tranchée : le navire d'Eduardo ouvre la future route d'exploration des îles ; l'ancien lac devient le port qui l'accueille (§17). |
| 5 | Les sept sœurs | 📝 **CONÇU AU §17, NON IMPLÉMENTÉ** — quatre premières, puis verte/orange/violette dans la seconde moitié |

⚠️⚠️ **CE QUE LE LOT 4 A CHANGÉ, EN QUATRE LIGNES.** Le détail est au §16 de `QUETE.md`, qui a une
ligne par chose ; ici, seulement de quoi savoir quoi ne pas casser.
· **UNE ÉTAPE DE PLUS DANS LA CHAÎNE** : `starTimberBlock` rend `noMayor` tant que l'audience n'a
pas abouti, parce que **la cale est sur le quai municipal**. Le bandeau la désigne (`goal: mayor`
→ `townHall`). `verify-quete` la joue avec le VRAI résolveur, jamais avec un champ posé à la main.
· **LES PLANS NE SONT PAS UNE SERRURE** (décision de Guillaume) : on monte le voir les mains vides
et on peut gagner — mais sans aucun droit à l'erreur. C'est la seule vraie décision du chapitre.
· **LES ÉLECTIONS ONT ENFIN UNE CONSÉQUENCE DE JEU.** Les cinq candidats du 439 avaient un
portefeuille écrit en commentaire qui ne servait à RIEN ; il décide maintenant de la valeur de
chaque argument, et l'échéance du scrutin la déplace encore.
· **LA CONFIANCE EST UN CAPITAL QUI SERT LA FOIS SUIVANTE** (`e.mayor.trust`, 0 à 3) : c'est ce qui
oblige `maire.js` à être un **système de négociation** et pas une scène. Une commission ou le
cadastre s'y ajouteront en une table et zéro ligne de mécanique.

⚠️⚠️⚠️ **ET LA DETTE DU 479 N'A PAS BOUGÉ D'UN POUCE : DEUX POSTES À DEUX QUI N'ONT JAMAIS ÉTÉ
TENUS** — le relais du plat (l'un cuisine, l'autre court) et les deux bords du cratère. Écrits,
arbitrés par l'hôte, mesurés par `verify-quete` §12, **et jamais joués face à face**. Le 480 en
ajoute un troisième d'une autre nature : **une audience que personne n'a menée.**

État à jour au **2026-08-27**. La direction longue reste de **rendre Valley Town habitable au regard
ET crédible au jeu**, et **lui donner une histoire**. Tout ce qui concerne la ville, ses habitants,
ses bâtiments et **ses pièges** est dans **`components/ferme/README.md`**, qui fait autorité ; les
règles de DESSIN sont dans **`components/ferme/DESSIN.md`** ; les bancs dans **`tools/README.md`**.
**`candyluge` et `crystal` sont EN PAUSE.**

⚠️⚠️ **LA REFONTE DE LA QUÊTE DE L'ÉTOILE EST LE CHANTIER VIVANT, ET SON DOCUMENT DE REPRISE
EST `components/ferme/QUETE.md`. LIS SON BLOC D'AUTORITÉ 2026-08-26 ET SON §17 AVANT D'Y
TOUCHER.** Le code livré au 480 bis précède encore ce dossier : chronologie 5 + 3, sept sœurs,
attentes actives et ancien port restent à construire par les lots A à G du §17.11. L'audience
existe déjà (§16) et sa signature (`MR.mayorSigned`) débloque les répliques du bateau.

---

⚠️⚠️⚠️ **UN BANC QUI PASSE NE VEUT PAS DIRE QUE LA CHOSE EST BONNE — IL VEUT DIRE QU'ON MESURE
AUTRE CHOSE.** C'est la leçon la plus rentable du fichier, et elle a **sept** formes connues,
toutes payées :
- **il mesure la carte, pas l'interaction** (439 : « le seuil est bien une sortie, 9/9 » pendant
  que la touche E ne sortait pas) ;
- **il se donne un périmètre et excuse ce qui déborde** (439) ;
- **il repeint au lieu d'appeler**, donc il juge sa propre maquette (439) ;
- **il mesure l'inverse de ce qu'on veut** (438 : le « grain » pris pour de la qualité) ;
- **il mesure ce qu'une chose EST et jamais QUAND elle est** (448 : sept contrôles sur le cratère,
  aucun sur l'instant où il apparaît — *un banc de rendu ne peut pas voir un défaut de temps*) ;
- ⚠️⚠️ **il mesure une grandeur JUSTE sur un intervalle que le joueur ne regarde pas** (454 : la
  vitesse de la comète le long de tout son vol, alors qu'elle n'est à l'écran que sur les derniers
  22 % — deux contrôles verts, zéro effet visible) ;
- ⚠️ **il mesure DEUX réponses séparément et jamais leur ACCORD** (449). Le bandeau de la quête
  disait le chapitre, le chevron dérivait d'une autre liste : deux réponses à « où vais-je », les
  deux vertes, et personne n'avait eu l'idée de les comparer **parce qu'elles n'avaient jamais eu
  la même source**. La parade est celle du 444 : *une jointure, jamais deux listes.*
- ⚠️⚠️ **il mesure deux grandeurs qui S'OPPOSENT, chacune de son côté** (458, huitième forme, la
  sœur de la précédente en plus dangereuse). La glissade du cratère reprenait 3,2 cases/s quand la
  marche en montée n'en donnait plus que 2,34 : **le trou devenait infranchissable**, un MUR fait
  de vitesse. Aucun pas n'est refusé, donc `canStandTown` n'est jamais consulté et rien ne lève ;
  six contrôles étaient verts, tous justes, aucun ne calculait la DIFFÉRENCE. *Deux grandeurs qui
  se combattent se mesurent ensemble ou pas du tout.*
- ⚠️⚠️⚠️ **il invente ses IDENTIFIANTS et son cycle de vie d'état** (469, onzième forme, et
  c'est la plus chère jamais mesurée : **447 contrôles verts sur une quête bloquée**). Le banc
  jouait l'apprivoisement avec `"j1"` ; le jeu passe un `profile_id` de 36 signes. Le banc
  gardait un objet d'état ; l'hôte le re-migre à CHAQUE requête. Il fallait les DEUX écarts
  pour que la troncature de clé fusionne « la tenue » et « son départ » — donc aucun contrôle
  ne pouvait tomber. *Un banc qui invente ses données mesure un jeu que personne ne joue :
  on rejoue avec les vraies valeurs ET le vrai cycle de vie de l'état.*
- ⚠️⚠️ **il balaie une COURBE image par image et ne regarde jamais l'HORLOGE qui l'alimente**
  (468, neuvième forme, la sœur de la cinquième). Onze contrôles suivaient l'arrivée de l'étoile
  ms par ms — continuité, phases, tour complet, extrémités exactes — et ils étaient tous verts
  pendant que l'horloge qui la fait avancer pouvait rester figée **pour toujours**, bloquant la
  quête entière. Ils mesuraient ce que l'animation EST ; aucun ne mesurait **combien de temps elle
  a le droit d'attendre**. *Une fonction pure passe le banc ; c'est ce qui l'appelle qui casse.*
- ⚠️⚠️ **il passe lui-même le drapeau qui l'arrange** (458). `verify-quete` jouait le cratère avec
  `solo = true` et l'écoute des ombres avec `solo = false` — les deux seuls mondes où elles
  marchaient, pendant que le jeu passait la valeur inverse. *Un paramètre écrit en dur par le banc
  est une hypothèse que personne ne vérifie ; on balaie les deux valeurs.*
- ⚠️⚠️⚠️ **une discipline de banc ajoutée à UNE section ne protège que cette section** (472,
  douzième forme, et c'est la plus vicieuse parce qu'elle se déguise en leçon déjà apprise).
  Le 469 avait écrit noir sur blanc *« on rejoue avec les vraies données ET le vrai cycle de vie
  de l'état »* — et l'a appliqué au seul §fouille. Le §objectif, lui, appelle encore
  `starGoalKey` sur un état que personne ne re-migre : il n'a donc JAMAIS pu voir que l'hôte,
  qui re-migre à chaque requête, fait tomber le météore de Valley Town à la fermeture du
  chapitre 1. **Une règle de banc s'applique au banc ENTIER, ou elle ne s'applique pas.**
- ⚠️⚠️⚠️ **il vérifie qu'une chose EXISTE, jamais qu'elle TIENT ENSEMBLE** (2026-08-31, treizième
  forme). `verify-maire` rendait **113/113** pendant que la posture DEBOUT du maire se
  désassemblait à l'écran : il tenait la jointure « sept postures de mécanique = sept postures
  dessinables », qui est juste, et qui ne peut rien dire d'un CORPS — **une pose est un jeu de
  nombres, et un jeu de nombres n'a pas de silhouette**. La pose écrivait `rise: 0.13` pour lever
  un homme dont les jambes ne sont pas filles du buste : elle fabriquait un tronc quatorze
  centimètres au-dessus de ses propres cuisses. *Une mise en scène qui demande un geste que le
  squelette ne sait pas faire ne se règle pas, elle se construit* — et la parade est un banc qui
  RASTÉRISE (`render-maire`, le premier du dépôt à regarder de la 3D, et sans WebGL).
  ⚠️ Corollaire, et c'est l'angle mort du contrôle de silhouette lui-même : **ce qui déborde se
  compte en pixels, ce qui s'enfonce se compte en mètres**. Une main enfoncée dans une poitrine ne
  fait pas d'îlot — elle disparaît, et la masse reste d'un seul tenant.
- ⚠️⚠️ **il accuse le personnage de ce que fait son CADRAGE** (2026-08-31, quatorzième forme, et
  c'est la plus embarrassante parce qu'elle vient du banc lui-même). Le contrôle de silhouette de
  `render-scierie` annonçait « 2 îlots » sur deux poses de Tristan : un membre détaché, donc. Il
  n'y avait aucun membre détaché — c'était le CADRE de la vignette qui coupait l'épaule, six pixels
  dans un coin, et le morceau resté de l'autre côté comptait pour un second îlot. *Un contrôle de
  connexité mesuré dans un cadre trop serré mesure le cadre.* La parade est un contrôle de BORD
  posé AVANT celui d'îlots (il nomme le vrai coupable), et des caméras qui DÉRIVENT leur recul de
  la boîte englobante au lieu d'être réglées à la main — un personnage qui travaille change de
  taille et de place d'une pose à l'autre.
- ⚠️⚠️⚠️ **il mesure chaque ÉTAT, jamais l'ÉCART entre deux états successifs** (2026-08-31, quinzième
  forme, et c'est la seule qui parle de ce que le JOUEUR perçoit). `render-navire` tenait la
  silhouette, la connexité, l'échelle et l'invariant « poser un morceau n'en efface jamais un
  autre » — quatre contrôles justes, tous sur un état isolé. Aucun ne pouvait voir que le SAFRAN
  ne change que **1,3 % de la vignette**, douze fois moins que la voile, alors qu'il coûte 45 bois,
  8 poissons, une manche de sciage et un montage au marteau. *Un chantier ne se perçoit pas par
  ses états, il se perçoit par ses écarts* — et une pièce qui coûte cher sans rien changer à
  l'image est un rendez-vous qui ne récompense pas le déplacement qu'il impose. ⚠️ La parade
  mesure les pixels qui CHANGENT, jamais l'encre gagnée : une pièce peut en remplacer une autre
  (un mât qui masque une membrure) sans rien ajouter au compte et rester parfaitement visible.
- ⚠️⚠️⚠️ **il mesure une PRÉSENCE là où le joueur perçoit une VALEUR** (2026-09-01, seizième forme,
  et c'est la quinzième qui se fait prendre à son propre piège). Le contrôle d'écart de
  `render-navire` comparait deux images peintes SANS les fantômes des pièces manquantes ; le ruban
  de jalon, lui, les peint AVEC, parce qu'un chantier sans son plan en creux n'a pas de silhouette.
  Or un fantôme est déjà de la matière (190 d'alpha) : un morceau qui passe du fantôme au bois plein
  ne change presque AUCUN pixel au sens du masque, et change tout au sens de l'œil. Mesuré sur le
  vrai dessin, en luminance : **le safran ne fait bouger que 201 pixels sur 16 128**, la cloche 459.
  *Un banc qui ne peint pas ce que le joueur regarde mesure un autre dessin — et il a d'autant plus
  l'air juste qu'il est, lui, parfaitement exact.* ⚠️ La parade a dicté le dessin et pas l'inverse :
  le ruban a gagné un halo, et l'invariant tenu est devenu un OU — *chaque morceau est soit assez
  large pour se voir seul, soit assez ramassé pour être cerclé.*
⚠️⚠️ **ET UN CONTRÔLE DE CAS NE VAUT PAS UN INVARIANT** (449). Trois contrôles « est-ce que ça
marche » étaient verts sur le placement du familier meneur ; l'invariant — *il n'est JAMAIS plus
loin du but que le joueur*, balayé sur toutes les positions — a échoué **20 fois sur 164** et a
sorti un vrai bogue. **Quand on peut énoncer une propriété, on la balaie ; on n'écrit pas trois
exemples.**
⚠️ **Quand Guillaume voit un défaut qu'aucun banc ne voit, la première question n'est pas « où est
le bogue » mais « quelle grandeur ne mesure-t-on pas ».** Les six dernières fois, la réponse tenait
en deux ou trois nombres qu'il a suffi d'ajouter.
⚠️⚠️ **ET REGARDER L'ÉCRAN RESTE LE SEUL MOYEN DE TROUVER CE QU'ON N'A PAS ENCORE COMPRIS** : six
bancs au vert n'ont pas vu dix défauts qu'une séance de vingt minutes a trouvés au 444, dont cinq
qui rendaient un lieu **inatteignable** — aucun ne mesurait l'**ARRIVÉE**. Ça s'est reproduit à
chaque zip depuis, 449 compris (le guide s'éteignait à chaque carte de chapitre : une garde qui
confondait un INSTANT avec un ÉTAT). Détail au **§25 de `components/ferme/README.md`**, la
meilleure page du dépôt sur ce que les bancs ne savent pas faire.

⚠️⚠️ **ET UN DÉFAUT MESURÉ, DOCUMENTÉ, PUIS LAISSÉ EN PLACE REVIENT TOUJOURS — PAR LA BOUCHE DE
GUILLAUME** (437, 439). La section « ce que ça ne fait pas » n'absout pas : c'est une **dette
datée**. **La première chose à faire en ouvrant un chantier est de relire celle du zip précédent.**

⚠️⚠️⚠️ **LE PIÈGE N°1 DU PROJET, ET IL A QUATRE VISAGES : CE QUI VIT DANS LA CLOSURE DE LA BOUCLE
DE RENDU.**
1. **Il plante** (430, 431) : une fonction déclarée dans la closure et appelée depuis le composant
   lève un `ReferenceError` **à l'exécution seulement** — ni le build, ni le lint, ni aucun banc ne
   le voient — et l'exception **emporte tout ce que la frame devait encore dessiner**. Mesuré à
   deux clients : 97 % d'images figées. On EXPOSE par un ref, on ne recopie jamais.
2. **Il fait vieillir** (436, 439) : un dessin qu'aucun banc ne peut appeler ne se dégrade pas,
   **il reste au niveau du jour où il a été écrit** pendant que tout ce qui est mesuré monte.
   *L'écart n'est pas un écart de soin, c'est un écart de DATE.* ⚠️ Corollaire : **« ce dessin
   est-il regardable par un banc ? » est une question de QUALITÉ**, et elle se pose avant le
   premier `fillRect`.
3. **Il divise** (439) : une même grandeur décrite des deux côtés de la closure DIVERGE. Le seuil
   de sortie de l'hôtel de ville était écrit dans le générateur *et* dans le composant ; seul le
   premier a été corrigé, et **on ne pouvait plus ressortir du bâtiment**. Voir §8.
4. ⚠️⚠️ **Il fait porter DEUX SENS au même nombre** (441). `pushE` classe par
   `wy − altitude × TOWN_ELEV_PX` : une ALTITUDE monte le dessin **et** recule le rang, ce qui est
   juste pour une terrasse — le 439 y a versé la flèche du dos d'âne des ponts, *or un dos d'âne
   monte sans éloigner*. **Le fermier a disparu sur toute la rangée nord des deux ponts pendant un
   zip entier**, sans qu'un seul banc puisse le voir. **Une grandeur de DESSIN, une grandeur de
   RANG, une grandeur de COLLISION : trois choses, trois paramètres.** Voir `tools/verify-pont.mjs`.

⚠️ **LES LEÇONS DES QUATRE DERNIERS ZIPS, EN UNE LIGNE CHACUNE. Le détail est à côté du code
qu'il décrit — les recopier ici les ferait vieillir en double.**

| # | La leçon, en une phrase | Où est le détail |
|---|---|---|
| 2026-08-31 (audit) | ⚠️⚠️⚠️ **UNE MIGRATION QUI RECONSTRUIT UN OBJET CHAMP PAR CHAMP SUPPRIME TOUT CHAMP QU'ON A OUBLIÉ D'Y ÉCRIRE.** `migrateMayor` rebâtissait `appt` sans relire `sour` ; or `migrateStar` l'appelle et l'hôte re-migre à CHAQUE requête. La trace était donc effacée dans la milliseconde suivant son écriture — sans erreur, sans symptôme — et le correctif écrit quelques heures plus tôt le même jour n'a jamais rien fait. *Un champ ajouté à un objet migré s'ajoute à sa migration dans le même geste, ou il n'existe pas.* | `migrateMayor`, `appt.sour`, `quete.js:migrateStar` |
| 2026-08-31 (audit) | ⚠️⚠️ **DEUX BANCS PEUVENT AVOIR DES ANGLES MORTS QUI SE RECOUVRENT EXACTEMENT, ET CE QUI TOMBE DEDANS NE SE VOIT NULLE PART.** Huit feuilles `L.maire` étaient écrites, traduites et jamais affichées : `verify-strings` ne les voyait pas (il ne capture que les clés indentées de QUATRE espaces, et la branche `maire` est à deux), `verify-quete` non plus (son contrôle d'orphelins ne balaie que `L.star`). Chacun était juste dans son périmètre. *Quand une chose échappe à deux contrôles, la question n'est pas lequel a un bug : c'est ce que leur intersection ne couvre pas.* | `verify-quete` §audience, `verify-strings:keysOf` |
| 2026-09-01 (rythme) | ⚠️⚠️⚠️ **UN SÉLECTEUR CSS REDÉCLARÉ PLUS BAS NE COMPLÈTE PAS LE PREMIER, IL LE CORRIGE — ET AUCUN DES QUARANTE BANCS NE PEUT LE VOIR.** Un `position:relative` écrit pour ancrer un enfant a écrasé le `position:fixed` de la règle d'origine : le bandeau de quête est tombé dans le flux, à 953 px du haut, c'est-à-dire hors de l'écran, sur la seule information permanente de la quête. La ligne était inutile en plus d'être fausse (`fixed` établit déjà un bloc conteneur). *Les bancs de rendu rastérisent du canevas ; personne ne met en page du CSS, donc toute la mise en page se juge à l'écran ou ne se juge pas.* | `.ferme-star-hud`, `app/globals.css` §rythme |
| 2026-09-01 (rythme) | ⚠️⚠️ **UNE ANIMATION CSS NE REDÉMARRE PAS SUR UN NŒUD DÉJÀ MONTÉ.** Ajouter une classe à un élément qui existe déjà ne rejoue rien — le navigateur considère l'animation comme jouée. C'est le piège de tout accusé de réception qui peut arriver deux fois de suite (une pastille qui se remplit, un ruban qui en remplace un autre), et il ne se voit qu'à la SECONDE occurrence, donc jamais en relisant. *La parade est un `key` React qui porte une séquence : on remonte le nœud, et l'animation repart de zéro.* | `starPulse.seq`, `key={"rb" + starRibbon.seq}` |

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
- ⚠️⚠️ **FIN DE LIVRAISON : METTRE CE FICHIER À JOUR FAIT PARTIE DE LA LIVRAISON, ÇA NE SE
  PROPOSE PAS** (ordre de Guillaume au 449 : « à toujours opérer quand tu finis un delivery »).
  La formulation d'avant disait « sur demande », et c'est ce qui a fait proposer au lieu de faire.
  ⚠️ **Dans cet ordre** : (1) réécrire le bloc **⏭️ REPRISE** en tête — il se REMPLACE, il ne
  s'empile pas, et il désigne UNE action suivante ; (2) faire la passe d'élagage du §14.2 **avant**
  d'ajouter quoi que ce soit ; (3) n'inscrire que la **LEÇON** d'un défaut, jamais son histoire —
  celle-ci va en commentaire de code avec le n° de zip, ou dans le README du module concerné.
  **Commits et push restent à
  Guillaume** (GitHub Desktop). **Dire si une manipulation Supabase est nécessaire — et le dire
  aussi quand elle ne l'est pas.**
- **Règle dure : aucune migration SQL ni changement de schéma sans validation préalable.**

| Quoi | Où |
|---|---|
| Récit d'une étape | **en tête du README** |
| Le *pourquoi* d'une ligne, un piège local | **commentaire de code**, avec le n° de zip |
| Objectif, contraintes, pièges globaux, avancement | **ce fichier** |

Jamais de fichier de doc autonome à la racine (`AUDIT-X.md`, `NOTES.md`…).

⚠️⚠️ **EXCEPTION DATÉE À LA RÈGLE CI-DESSUS : `AGENTS.md`, À LA RACINE, N'EST PAS UN DOC DE PLUS —
C'EST LE POINT D'ENTRÉE DE CODEX, L'AGENT QUI PREND LE RELAIS SUR CE DÉPÔT QUAND CE N'EST PAS
CLAUDE CODE.** Guillaume l'a déjà posé, volontairement vide de contenu projet : il dit seulement
« lis `CLAUDE.md` en entier avant toute action, applique ses instructions » et « n'ajoute aucun
contexte projet ici ». **Ne JAMAIS l'étoffer** — le jour où `AGENTS.md` porterait sa propre
version des pièges/leçons/état d'avancement, ce fichier-ci cesserait d'être la source unique, et
les deux divergeraient exactement comme le §4 le décrit pour deux cartes sans repère commun. Trois
règles, symétriques dans les deux sens :
1. **Codex lit CE fichier en entier avant d'agir**, exactement comme le demande la première ligne
   de ce document — `AGENTS.md` ne fait que le rediriger ici, il ne le remplace pas.
2. **Codex met CE fichier à jour en fin de livraison, EN SUIVANT SON PROPRE §14** — français,
   dense, le bloc ⏭️ REPRISE qui se REMPLACE et ne s'empile jamais, la passe d'élagage avant
   d'ajouter, la LEÇON seule (jamais son histoire). Rien de spécifique à Codex (nom d'un outil,
   d'un mode d'exécution, d'un détail de sandbox) n'a sa place ici : ce fichier reste lisible et
   actionnable par n'importe quel agent, Claude compris à la reprise suivante.
3. **Une session Claude qui reprend après Codex ignore `AGENTS.md`** — il n'est jamais lu
   automatiquement par Claude Code, et il ne contient de toute façon aucun fait projet à perdre.
   Seul CE fichier fait foi, pour Claude comme pour Codex, dans les deux sens de la passation.

⚠️ **UN AUTRE RISQUE, PUREMENT MÉCANIQUE : DEUX AGENTS SUR LE MÊME ARBRE DE TRAVAIL NON COMMITÉ.**
Ni Claude ni Codex ne commit ni ne push de sa propre initiative (règle ci-dessus, inchangée) — donc
un arbre de travail peut rester durablement modifié entre deux sessions. **Avant de faire démarrer
l'un après l'autre, vérifier `git status`/`git diff`** : l'agent qui commence une session doit
comprendre ce qui est déjà là (souvent le travail non revu de l'agent précédent, décrit dans le
bloc ⏭️ REPRISE) avant d'y toucher, jamais le nettoyer ou l'écraser sans le comprendre.

⚠️ **CODEX COMME AGENT SECONDAIRE, DANS LA MÊME CONVERSATION — SEULEMENT SUR UN GROS CHANTIER.**
Guillaume utilise ponctuellement Codex (GPT-5.1, dans le rôle Sol ou Terra) en appoint de Claude
Code, pour délester des tests longs, de l'orchestration ou un audit indépendant et économiser des
tokens côté Claude. **Sur un gros chantier** (audit large, batterie de tests, tâche parallélisable
qui coûterait cher en tokens) : Claude DEMANDE si Codex est disponible avant de s'engager. **Sur
tout le reste : Claude travaille seul, sans le demander** — ce n'est pas une question systématique
en début de conversation. Si Guillaume confirme la disponibilité de Codex, Claude rédige lui-même
le prompt de passation, avec précision : portée exacte, fichiers concernés, format de retour
attendu — et il couvre le risque du paragraphe ci-dessus (arbre non commité partagé) pour que le
travail circule sans accroc de Claude à Codex et de Codex à Claude.
⚠️ **L'ASPECT GRAPHIQUE RESTE ENTRE LES MAINS DE CLAUDE CODE, MÊME SUR UN GROS CHANTIER.** Dessin
procédural (`fermeArt.js`, `maireBureau.js`…), règles de `DESSIN.md`, tout jugement visuel : ne
JAMAIS déléguer à Codex, quelle que soit la taille du chantier. Codex reste cantonné aux tests,
à l'orchestration et à l'audit non visuel.
⚠️ **SPRITE COMPLEXE NOUVEAU (végétation, infrastructures de ville…) : PROPOSER UN PROMPT GEMINI,
JAMAIS L'APPELER SOI-MÊME.** Quand le décor à créer n'existe pas encore et sort du procédural
simple (une haie, un pont, un bâtiment détaillé — pas une teinte ou un décalage de pose), Claude
rédige un prompt prêt à coller dans Gemini, accompagné d'une ou plusieurs images de référence
(Gemini rend mieux avec référence que texte seul) — et **s'arrête là** : c'est Guillaume qui colle
le prompt et récupère le résultat, pas un appel API automatisé. L'intégration du PNG obtenu suit
ensuite la même rigueur que tout asset bitmap (§9) : regardé à l'écran le jour de sa livraison,
chargeur/cache/nommage posés au premier usage.

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

⚠️⚠️ **CE CHAPITRE A ÉTÉ SCINDÉ AU 431, SUR L'ORDRE LAISSÉ PAR LE §14.2 DU 430.** Les pièges
de la FERME, de la VILLE et du TRIBUNAL sont partis dans **`components/ferme/README.md`**, qui
fait déjà autorité sur ce code — ils y sont **à côté de ce qu'ils décrivent**, et ce chapitre
avait atteint cent lignes en mélangeant deux sujets sans rapport. ⚠️ **Il a été scindé DEUX fois
depuis** — le DESSIN au 441 (`components/ferme/DESSIN.md`), le GÉNÉRATEUR au 449
(`components/ferme/README.md` §15 bis). Il ne reste ici que ce qui est vrai à l'échelle du
projet : la **CONCEPTION**, et le **LANGAGE** (JavaScript, three.js, canevas).

⚠️ **UN PIÈGE A ÉTÉ SUPPRIMÉ PLUTÔT QUE DÉPLACÉ, ET C'EST LE POINT DE LA VÉRIFICATION** : « la
boucle de nuages tourne à vide (`SKY_CLOUD_COUNT: 0`) » ne correspondait plus à rien — le
symbole n'existe nulle part dans le dépôt. Le §14.2 le disait : *un piège périmé recopié
ailleurs est pire qu'un piège supprimé.*

⚠️⚠️ **ET UN SEUL EST RESTÉ ICI BIEN QU'IL PARLE DES CARTES, parce qu'il a été payé QUATRE
fois** (425, 427, 430, 431) et qu'il touche l'architecture entière : **DEUX CARTES SANS REPÈRE
COMMUN FINISSENT PAR SE MÉLANGER, et ça ne se voit que quand la plus petite ne tient plus dans
la grande.** Dernière occurrence au 431, la plus chère : le rectangle du marché de la VILLE
tombe aussi au milieu des champs de la FERME, donc le contrôle « je suis au marché » passait
depuis un pré. **La parade est UNE position taguée par sa zone, jamais deux jeux de
coordonnées — et on teste la zone AVANT les distances.**

**Dessin — voir `components/ferme/DESSIN.md`**

⚠️⚠️ **CE BLOC EST PARTI AU 441, SUR L'ORDRE DU §14.2 DU 440 (reporté deux fois).** Les treize
règles de dessin — on assemble des masses et on ne texture pas une silhouette, une courbe `f(x)`
ne se replie pas, la période prime sur les détails, une position réglée à la main penchera, un
cerne sert aussi sur fond clair, un sprite haut contre le mur du fond avale ce qui passe
devant… — vivent désormais **à côté des dessins qu'elles gouvernent**. Rien n'a été recopié.
⚠️⚠️ **ET LA PHRASE QUI SUIVAIT ICI EST DEVENUE FAUSSE AU 449, PAR LE DÉPLACEMENT SUIVANT.** Elle
disait que « la case d'un décor n'est pas la surface qu'il couvre » restait ici parce que c'est une
règle du GÉNÉRATEUR et non du dessin — vrai au 441, périmé depuis que le générateur est parti à son
tour au §15 bis de `components/ferme/README.md`. *Un déplacement laisse toujours derrière lui une
phrase qui explique pourquoi quelque chose n'a pas bougé ; c'est elle qu'il faut relire en dernier.*


**Conception — vrai partout**

⚠️⚠️ **LES CINQ PIÈGES DU GÉNÉRATEUR SONT PARTIS AU 449, SUR L'ORDRE DU §14.2 DU 444** (reporté
quatre fois) : la case d'un décor, la liste noire, la passe qui pave, le second de quelque chose,
la variante de décor. Ils décrivent tous `generateTownWorld` et vivent désormais **à côté de lui**,
au **§15 bis de `components/ferme/README.md`** — même geste qu'au 431 (les zones) et au 441 (le
dessin). ⚠️ **Rien n'a été recopié, et un DOUBLON a été supprimé** : « une variante de décor est
une couche » était écrit deux fois dans ce chapitre, une fois court et une fois long.
⚠️ **Ce qui suit est resté exprès** : ce ne sont pas des règles de générateur, ce sont des règles
de conception qui valent pour n'importe quel morceau du dépôt.

- ⚠️⚠️ **UNE GRANDEUR DE DESSIN NE DOIT PAS ENTRER DANS LA COLLISION** (439). L'arc du pont ajouté
  à `playerElevTown` aurait été trois lignes plus court et aurait rendu les deux ponts
  **infranchissables** (`canStandTown` refuse tout pas au-delà de `TOWN_STEP_MAX`) : on aurait
  livré un mur en croyant dessiner une bosse, et le symptôme n'aurait ressemblé en rien à sa cause.
  Deux fonctions qui se ressemblent assez pour qu'on les confonde doivent porter la différence
  dans leur NOM, et un banc doit tenir les deux moitiés séparément.
- ⚠️⚠️ **UN PANNEAU QUI S'OUVRE À VOLONTÉ NE DOIT RIEN DONNER** (439). Un dialogue, un tableau, une
  plaque s'ouvrent avec E sans limite et sans arbitrage de l'hôte : tout ce qu'ils rendent doit
  être de l'INFORMATION ou une valeur DÉRIVÉE (une date, un cours). Ce qui récompense passe par une
  `req` arbitrée par l'hôte, comme la vente au marché. *La porte n'est jamais la caisse.*

**JavaScript / three.js / canevas**
- ⚠️⚠️⚠️ **UNE FONCTION DÉCLARÉE DANS LA CLOSURE DE LA BOUCLE DE RENDU N'EXISTE PAS POUR LE
  COMPOSANT** — payé au 430 (`tryTownJump`, saut de rebord mort) puis au 431
  (`canStandTown` appelée par `advanceRemote`, Valley Town injouable à deux). Le hissage des
  déclarations s'arrête à la fonction qui les contient ; l'appel depuis l'extérieur lève un
  `ReferenceError` **à l'exécution seulement**, donc ni le build, ni le lint, ni aucun banc ne
  le voient. Et l'exception ne s'arrête pas là où elle tombe : **elle emporte tout ce que la
  frame devait encore dessiner.** ⚠️ La parade est de PUBLIER la fonction dans un ref réassigné
  à chaque montage de la boucle (`townJumpApiRef`, `zoneCollideRef`) — jamais d'en écrire une
  seconde copie au niveau du composant, qui divergerait au premier réglage.
  ⚠️ **Corollaire de repli** : quand la carte d'une zone manque chez ce client, un test de
  collision doit ACCEPTER, pas refuser. Refuser épingle l'entité distante à sa dernière
  position connue — c'est-à-dire qu'on reproduit le bogue au lieu de le corriger.
- ⚠️⚠️ **UN MOTIF DE SOL SE JUGE ASSEMBLÉ, ET SA PÉRIODE COMPTE PLUS QUE SES DÉTAILS** (434).
  Une tuile de 16 px se répète tous les 16 px : l'œil voit la grille avant le dessin, **quelle
  que soit sa finesse**. On dessine un pavé de 4×4 tuiles d'un seul tenant et on y découpe la
  case (`x % 4`, `y % 4`). ⚠️ Il doit **boucler sur lui-même** (toute forme peinte aussi à −N
  et +N), sinon on a déplacé la couture de 16 à 64 px — et une couture tous les quatre
  carreaux dessine une SECONDE grille, pire que la première.
- ⚠️⚠️ **UN ÉTALEMENT `{ ...table }` RECOPIE LES RÉFÉRENCES DE SES TABLEAUX : UNE TABLE DE
  RÉFÉRENCE QU'ON ÉTALE À PLAT EST UNE TABLE QU'ON MODIFIE** (2026-08-31). La vue de l'audience
  partait de `{ ...poseTarget("closed") }` et lissait dedans image par image : elle écrivait donc
  dans `POSE.closed` lui-même, la table se corrompait à la PREMIÈRE image, et la seconde audience
  de la session partait d'une posture que personne n'avait écrite. **Aucun symptôme sur le
  moment** — les nombres restaient plausibles. Parade : une copie explicite (`poseState`), et un
  contrôle qui rejoue deux cents images puis compare la table à elle-même.
- ⚠️⚠️⚠️ **UN EFFET REACT DONT LE NETTOYAGE A UN EFFET DE BORD SE DÉCLENCHERA AU DÉMONTAGE QU'ON
  N'AVAIT PAS PRÉVU** (2026-08-31). La scène de sciage rapportait sa manche depuis le `return` de
  son effet, « au cas où le joueur ferme en cours de route ». En développement, React 18 monte
  l'effet, le NETTOIE, puis le remonte : la scène se refermait donc toute seule dans la
  milliseconde, **sans une ligne d'erreur, sans rien dans la console**, et le bouton qui l'ouvrait
  avait l'air de ne rien faire. Une demi-heure perdue à chercher un bogue de rendu qui n'existait
  pas. ⚠️ Le nettoyage LIBÈRE (écouteurs, contexte WebGL, textures) ; il ne DÉCIDE de rien.
- ⚠️⚠️⚠️ **UNE ANIMATION CSS NE REDÉMARRE PAS PARCE QU'ON AJOUTE UNE CLASSE À UN NŒUD DÉJÀ
  MONTÉ** (2026-09-01). Le navigateur considère l'animation comme jouée et ne la rejoue pas. Ça ne
  se voit qu'à la SECONDE occurrence — donc jamais en relisant, et jamais dans un test qui ne
  déclenche l'effet qu'une fois. C'est le piège de tout accusé de réception qui peut arriver deux
  fois de suite. ⚠️ **La parade est un `key` React qui porte une séquence** : le nœud est remonté,
  l'animation repart de zéro, et le coût est nul quand le nœud est vide. Une classe qu'on retire
  puis qu'on remet marche aussi, mais elle demande de choisir un délai — c'est-à-dire un second
  nombre qui doit s'accorder avec la durée de l'animation (§8).
- ⚠️⚠️ **UN SÉLECTEUR CSS REDÉCLARÉ PLUS BAS DANS LA FEUILLE NE COMPLÈTE PAS LE PREMIER, IL LE
  CORRIGE** (2026-09-01, payé sur le bandeau de quête, sorti de l'écran par un `position:relative`
  qui écrasait un `position:fixed`). ⚠️ **Et rien dans ce dépôt ne peut l'attraper** : les
  vingt-et-un bancs de rendu rastérisent du canevas, aucun ne met en page du CSS. *Toute la mise en
  page se juge à l'écran ou ne se juge pas* — corollaire direct du §10.
- ⚠️⚠️ **`chaîne.replace("X", …)` NE REMPLACE QUE LA PREMIÈRE OCCURRENCE.**
- ⚠️⚠️ **UN `useProgram` QUI ÉCHOUE NE DÉLIE PAS LE PROGRAMME PRÉCÉDENT** : un shader qui ne
  compile pas fait dessiner l'objet SUIVANT avec les mauvais attributs. **Seul indice :
  `INVALID_OPERATION: program not valid` dans la console.**
- ⚠️⚠️ **UN `const` DE HAUT NIVEAU N'EST PAS UNE PROPRIÉTÉ DE `window`.** Tester avec
  `typeof X !== "undefined"`.
- ⚠️⚠️ **UN CANEVAS DÉCOUPE EN SILENCE CE QUI DÉPASSE DE SON CADRE** (427) : une feuille de
  personnage fait 16×24 par pose, un chapeau posé au-dessus de y=0 sort décapité, et rien ne
  le dit. Le banc de rendu l'a montré, la relecture non.
  ⚠️⚠️ **PAYÉ TROIS FOIS DANS LE SEUL ZIP 433** — l'enseigne de toit du taxi en trois quarts,
  le drapeau de la mairie, le liseré des oiseaux. C'est le piège le plus répétitif du projet
  parce qu'il ne coûte RIEN sur le moment : le dessin est joli, il manque juste deux rangées
  que personne ne cherche. **Deux parades, et la seconde est la vraie :** dimensionner le
  canevas à partir de ce qui dépasse (le fuyant d'un trois-quarts se retrouve en HAUT, donc le
  canevas fait `24 + DROP`), et **dessiner serré, RECADRER, PUIS cerner** — cerné dans son
  cadre juste, le liseré d'un sprite qui touche le bord est lui-même découpé (`padOutline`).
  ⚠️ Un banc peut l'attraper en une ligne : aucun pixel peint sur le bord du canevas.
- ⚠️⚠️ **`ctx.fillText` N'EST PAS RASTÉRISABLE HORS NAVIGATEUR** (427) : un nom cuit dans un
  sprite fait planter `tools/render-*.mjs`, c'est-à-dire qu'on perd le seul moyen de REGARDER
  ce dessin. Les textes des bâtiments s'écrivent VIVANTS, au rendu — ce qui les rend en plus
  bilingues, ce qu'un sprite baké ne peut pas être. Idem `translate`/`rotate` : le faux canvas
  les ignore, un sprite qui en dépend se juge faux.
- ⚠️ **TEINTER UN SPRITE AVEC UN `fillRect` DESSINE UNE BOÎTE.** Un sprite est transparent
  partout sauf sur lui-même ; l'assombrir passe par `ctx.filter` (et il FAUT le remettre à
  `"none"`, c'est un état du contexte). ⚠️ Même famille au 427 : teinter un VÊTEMENT ne se
  fait pas en repeignant la feuille (on colorerait la peau et les cheveux), mais en
  repeignant les blocs du vêtement à leurs coordonnées exactes.
- ⚠️⚠️ **`Array.prototype.sort` EST STABLE, MAIS UN ORDRE DE DESSIN NE SE FONDE PAS DESSUS**
  (431). Les files de rendu du projet trient par ancrage au sol ; deux éléments à la même
  hauteur gardent donc leur ordre d'insertion — jusqu'au jour où l'on réorganise une boucle,
  sans rien casser de visible ailleurs. Ce qui doit passer devant le dit avec un epsilon.
- ⚠️ **`stopPropagation` N'ARRÊTE PAS LES AUTRES ÉCOUTEURS DE LA MÊME CIBLE** (il faut
  `stopImmediatePropagation`).
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
| `components/ferme/fermeEngine.js` | règles pures · `generateTownWorld()` · `generateCourtWorld()` · `townSpots()` · **`townNav()` / `townFindPath()`** · **`townRoadNav()` / `taxiStep()`** · **`townFlocks()` / `flockStep()`** |
| `components/ferme/quete.js` | **LA QUÊTE DE L'ÉTOILE : table, chronologies et résolveurs purs.** ⚠️ **469 — la FOUILLE (`STAR_DIG_MS`, `starDug`, `resolveStarDig`, `starDigResult`) et TROIS chapitres au lieu de cinq.** `STAR_FARM_IMPACTS` porte les **huit** cratères (3 étoiles / 2 matières / 3 vides — compté en important le module le 2026-08-30 ; il annonçait « cinq (2/1/2) » depuis le 480 bis), `resolveStarCalm` tient le barème 60/10 s et `resolveStarTownFall` sépare le gros météore. `STAR_FOLLOWER_SITES` dérive toutes les compagnes de `content:"star"`, `starFollowerAdded` identifie celle qui doit jouer son arrivée, `starFarmFlightPath` tient le cap stable des fragments et `queen` désigne l'unique reine. `starShipProgress` joint les cinq états du plan aux commandes et à la cale sans persistance supplémentaire. Aucun React, aucun dessin — `verify-quete.mjs` l'importe. |
| `components/ferme/maire.js` | **L'AUDIENCE CHEZ LE MAIRE (480) : la table des battements et les résolveurs purs.** Douze nœuds, cinq actes, cinq familles d'argument, la jauge d'adhésion qui FUIT, l'élan, la rejouabilité côté hôte (`mayorReplay` : le client envoie sa TRANSCRIPTION, l'hôte la rejoue). Aucun React, aucun dessin — `verify-maire.mjs` l'importe. ⚠️ **C'est un système de NÉGOCIATION, pas une scène** : la confiance gagnée sert les audiences futures, donc une commission ou le cadastre s'y ajouteront en une table de plus. |
| `components/ferme/MaireScene.js` | **la VUE de l'audience — le seul morceau de 3D du monde partagé.** Écran PLEIN, à la PREMIÈRE PERSONNE, caméra libre dans la pièce, bulles projetées, réponses en jaune, **mode spectateur** (`MayorWatch`), repli plat si WebGL manque. ⚠️ Il porte `mayorCtxOf`, **la fonction de contexte que le CLIENT et l'HÔTE appellent tous les deux** : leur accord est une propriété du code, pas une coïncidence. |
| `components/ferme/scierie.js` | **LA SCIE DE TRISTAN (lot E) : la simulation pure, à PAS FIXE.** Une lame qui a de l'inertie, un partenaire qui RÉPOND au lieu de mener, un mou qui referme la fenêtre parfaite, une contrainte qui fend la planche. ⚠️ **Aucune fonction transcendante dans le chemin de simulation** (`sin`/`pow`/`random` sont laissés à l'implémentation par la norme) : le hasard passe par un hachage entier, ce qui rend la manche rejouable **au bit près** par l'hôte à partir d'une liste de numéros de pas. Aucun React, aucun dessin — `verify-scierie.mjs` en joue des centaines. ⚠️ `sawPull(s, side)` est déjà symétrique : la seconde poignée du §17.6 s'ajoutera sans rouvrir la mécanique. |
| `components/ferme/scierieAtelier.js` | **L'ATELIER DE TRISTAN, EN CODE.** Le hangar et sa charpente apparente, les grumes, les piles de planches, l'établi, le poêle, les rais de poussière — et Tristan : pieds PLANTÉS, jambes et bras résolus en cinématique inverse, buste dont l'inclinaison est CALCULÉE pour que la main tombe à portée. La lame est **segmentée**, donc elle plie (ventre du coincement, fouet de la vitesse, affaissement du mou). ⚠️ Procédural comme `maireBureau.js`, `THREE` passé en paramètre, rien dans la closure de la boucle. |
| `components/ferme/ScierieScene.js` | **la VUE du sciage** : plein écran, simulation à pas fixe pilotée par une horloge réelle, journal de traits, repli jouable si WebGL manque. ⚠️ Elle n'envoie qu'**une seule `req` à la fin** — la transcription, jamais un résultat. |
| `components/ferme/rig3d.js` | **LA CINÉMATIQUE INVERSE, ÉCRITE UNE FOIS POUR LES DEUX PERSONNAGES** (le maire, Tristan). ⚠️ Elle a été SORTIE de `maireBureau.js` le jour où le second est arrivé : une loi des cosinus recopiée est une divergence en attente (§8). Les LONGUEURS d'os, elles, restent à côté des boîtes qu'elles mesurent. |
| `components/ferme/maireBureau.js` | **LE BUREAU DU MAIRE, EN CODE (481).** La pièce entière (parquet, boiseries, pilastres, fenêtre sur la place, bibliothèque, buste, lustre, porte qui claque), le meuble et ses objets — *chacun est une réplique de l'arbre* —, et le maire : sept postures, huit visages, sourcils/paupières/bouche, cinématique inverse des bras. ⚠️ **PROCÉDURAL, comme `fermeArt.js` mais en 3D** : aucun fichier à charger, textures peintes au canevas 2D, `THREE` passé en paramètre (jamais importé — deux copies de three.js dans une page ne ressemblent à rien). ⚠️ Rien n'y vit dans la closure de la boucle de rendu : `buildOffice` rend un objet, `applyPose`/`applyFace`/`solveArm` sont des fonctions de module. |
| `components/ferme/QUETE.md` | **la quête de l'étoile — autorité. Le §17 est le dossier cible « Port des Sept Sœurs » : une soirée, chronologie 5 + 3, sept étoiles, attentes actives, ancien port et lots A–G ; il distingue explicitement conception et code livré** |
| `components/ferme/README.md` | **Valley Town, le tribunal, l'HÔTEL DE VILLE, l'ÉGLISE, le BEFFROI, les habitants, la VENTE, les OISEAUX, les ÉLECTIONS et les PIÈGES de ces zones — autorité (428-444)** |
| `components/ferme/DESSIN.md` | **les règles de DESSIN, vraies partout — autorité (441, sorties du §4)** |
| `tools/README.md` | **les bancs, ce qu'ils attrapent et leurs chiffres — autorité (432-439)** |
| `tools/render-navire.mjs` | **LE NAVIRE, ET DEPUIS LE 2026-09-01 LA VIGNETTE DU RUBAN DE JALON** (§5 bis). Il rastérise les deux images que le ruban superpose — le navire AVANT et APRÈS, fantômes compris — et mesure en LUMINANCE ce que leur clignotement montre vraiment, pièce par pièce. C'est lui qui tient l'invariant « chaque morceau est soit assez large pour se voir seul, soit assez ramassé pour être cerclé par le halo », et c'est lui qui a exigé le halo. Sa planche `tools/out/navire-ruban.png` met les cinq paires côte à côte. |
| `tools/verify-scierie.mjs` · `tools/render-scierie.mjs` | **LES DEUX BANCS DE LA SCIE.** Le premier JOUE (déterminisme, accord direct/rejeu sur des images irrégulières, courbe de difficulté en fonction de la latence, martèlement, bornes, journaux malformés) ; le second RASTÉRISE l'atelier sans GPU et balaie la posture de Tristan sur **course de lame × profondeur de trait** — un carré, pas une liste, parce que sa posture est une fonction continue de deux variables. |
| `tools/lib-3d.mjs` · `tools/render-maire.mjs` | **REGARDER DE LA 3D SANS GPU (2026-08-31).** `lib-3d` charge le three.js **r128 vendorisé du dépôt** dans Node — la même bibliothèque que la page, à l'octet près — et rastérise à la main (projection, découpe au plan proche, tampon de profondeur, ombrage plat), plus le théorème des axes séparateurs pour mesurer une interpénétration en mètres. `render-maire` s'en sert pour peindre les sept postures côte à côte. ⚠️ **Aucune dépendance npm, et surtout pas `three`** : une autre révision n'a pas la même atténuation de lumière (§11), donc mesurerait un autre programme. |
| `components/ferme/fermeConstants.js` | réglages · **tous les `TOWN_*`, `COURT_*`, `WARDROBE_*`, `TOWN_STALL_TRADES`** · depuis le 440 il **importe `planche.js`** : une portée de pont et une emprise de décor sont des grandeurs de DESSIN, on les dérive du sprite au lieu de les recopier |
| `components/ferme/planche.js` | **GÉNÉRÉ** par `tools/import-planche.mjs` — les sprites de la planche de Guillaume, en données. Ne pas éditer à la main |
| `components/ferme/fermeArt.js` | **tous** les sprites, en canevas procédural. `starWispColors` décline le vivant en jaune, bleu et rose ; `drawStarFragmentMeteor` fait tourner le petit caillou incandescent sur un centre stable et `drawStarFragmentImpact` dessine son choc de terre/poussière/braises, sans réutiliser la boule de feu de Valley Town. Les gros dessins de quête (`drawStarCrater`, comète, navire, jauge, poses) vivent ici pour rester regardables par les bancs. |
| `app/room/[code]/page.js` · `lib/gameSync.js` · `lib/realtimeQuota.js` | salon · synchro · quota |
| `components/PetitsChevaux.js` · `components/ludoBot.js` | **Ludo 2–4 humains ou 1 humain + 1 à 3 bots choisis avant le départ.** `ludoBot.js` ne connaît aucune règle de déplacement : il classe seulement le plan légal et les simulations que l'arbitre hôte lui remet |
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
⚠️ **DEPUIS LE 431 IL PORTE AUSSI LES PIÈGES DE LA FERME, DE LA VILLE ET DU TRIBUNAL** (§15
là-bas), sortis de §4 sur l'ordre du §14.2 — et il décrit la vente, qui n'existe plus qu'au
marché (§14 là-bas).

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
- ⚠️ **LA MAIRIE ET LE TRIBUNAL SE PARTAGENT UNE GRILLE ET NE SE PARTAGENT PLUS LEURS SERVICES**
  (439) : la mairie est ce qu'on DEMANDE, le tribunal ce qui se TRANCHE. Avant, quatre services
  étaient promis deux fois, mêmes emojis compris.
- ⚠️ **LES ÉLECTIONS SONT UNE PURE FONCTION DU JOUR, ET LE VIVIER DE CANDIDATS EST FIXE** — pas
  le roster, sinon accueillir un résident rerollerait le maire, y compris rétroactivement.
- **Ce qui n'est pas fait** : deux guichets ouverts seulement (la salle des cours et l'accueil),
  pas de coiffeur au salon, aucun résident n'ENTRE dans les deux bâtiments, pas d'intérieur de
  maison, la prairie nue (chiffre compté par `verify-vallee`), et les **commissions / rendez-vous
  datés sont décidés mais pas construits**.

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

⚠️⚠️⚠️ **LE 443 A LEVÉ UN INTERDIT DE PRINCIPE : UN ASSET BITMAP EST DÉSORMAIS AUTORISÉ**
(décision de Guillaume). Jusqu'ici « aucune image dans le jeu » était une **règle** ; c'est
maintenant un **défaut**. Un décor complexe — typiquement un intérieur isométrique — peut être
modélisé sous Blender et intégré en **PNG / feuille de sprites** quand c'est le moyen le plus
pertinent d'obtenir le résultat visé.
⚠️ **Ce n'est ni une norme ni un passage obligé.** Le canevas procédural de `fermeArt.js` reste
la voie par défaut partout ailleurs et n'est pas en sursis : les deux approches **coexistent**,
l'arbitrage se fait **au cas par cas**, module par module, contre le §0 (est-ce que ça rend le
jeu plus fini ?) et non contre une doctrine.
⚠️⚠️⚠️ **LE PIPELINE C A EU SON PREMIER USAGE AU 480, ET IL A ÉCHOUÉ — C'EST LA LEÇON LA PLUS
CHÈRE DU 481.** Le bureau du maire a été bloqué sous Blender et exporté en glTF ; le fichier est
arrivé dans le dépôt avec ses nœuds `rig_*` doublement décalés, il a été chargé par le jeu, décrit
sur deux lignes de documentation, et **jamais ouvert dans un canevas pendant un zip entier**. Le
maire flottait deux mètres derrière le mur du fond. **Aucun outil du dépôt ne pouvait le dire** :
un glTF est de la DONNÉE, `verify-syntax` lit du JavaScript, le bundle lit des imports, et les
bancs de rendu appellent du CODE. Le bureau est aujourd'hui procédural (`maireBureau.js`).
⚠️ **CE QU'IL FAUT EN RETENIR AVANT LE PROCHAIN IMPORT** : le §9 disait qu'un asset importé
« vieillit » ; il peut aussi **naître faux**, et c'est pire, parce qu'on croit avoir livré. *Un
asset importé se REGARDE le jour de sa livraison, dans le jeu, ou il n'est pas livré.* Le
chargeur, le cache, la convention de nommage et le banc que le premier usage devait poser n'ont
jamais été posés — le chantier reste donc entier.

⚠️ **Ce que le basculement ne change PAS, et qu'il faut lire avant d'ouvrir Blender :** les
raisons TECHNIQUES du choix procédural restent vraies et se paient toujours — un bitmap apporte
un chargement, un cache, une palette hors-fichier, une échelle à tenir, et **il sort du champ
des bancs de rendu** (`tools/render-*.mjs` appellent du code, ils ne relisent pas un PNG : un
asset importé ne se dégrade pas, il **vieillit**, exactement comme le §« il fait vieillir » de
l'en-tête). ⚠️ Et il reste **irrecevable là où le dessin doit être bilingue ou vivant** (§4 :
un texte cuit dans une image ne peut pas être traduit au rendu). Le prix n'a pas disparu ; il
est simplement devenu **payable** quand le résultat le vaut.

BlenderMCP est installé (Blender 5.2 LTS) et **répond**. Trois pipelines : **A** vers `crystal`
(on modélise, on rend, on **transcrit en table de données** — pas d'image dans `crystal`, dont
le tampon 480×270 n'en affiche aucune ; ombrage plat pur, **aucun** anticrénelage, quantification
LINÉAIRE, courbe `Standard`, lampes Soleil) ; **B** vers les jeux three.js en glTF
(`candyluge_props.py`, hors dépôt, export sans matériaux, maillages `part_<clé>`, 200-900
triangles) ; **C, ouvert au 443** — rendu Blender → **PNG / feuille de sprites** chargé par le
jeu. ⚠️ **C n'existe encore nulle part dans le dépôt** : il est autorisé, il n'est pas construit
(ni chargeur, ni cache, ni convention de nommage, ni banc). Le premier usage devra les poser —
c'est un chantier, pas un import.

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
⚠️ **Tous les sprites de la ferme, de Valley Town et du tribunal sont, à ce jour, des canevas
procéduraux** dans `fermeArt.js` — c'est un **état**, plus une règle depuis le 443. Le coût d'y
introduire un bitmap est celui décrit en tête de chapitre ; il se juge contre le gain visuel du
décor visé, et **le mesurer d'abord reste la méthode** (§8) : un rendu Blender non calibré perd
encore contre un sprite dessiné à la main.

---

## 10. Vérification

⚠️ **`node` EST INSTALLÉ (v24, npm 11), `npm install` est fait.** On peut **bâtir et jouer**.

⚠️⚠️ **NE JAMAIS LANCER `npx next build` PENDANT QUE `npm run dev` TOURNE.** Les deux écrivent
dans le MÊME `.next/` : le navigateur reçoit des **404 sur les chunks**, la page se charge, le
HUD s'affiche, et le canevas reste vide — exactement comme si le rendu était cassé. Une
demi-session perdue au 426 sur un bogue qui n'existait pas. **Remède** : arrêter le serveur,
`rm -rf .next`, redémarrer.

**`npx next build`** compile tout : le contrôle le moins cher sur 25 000 lignes.
⚠️ L'avertissement `'G_SOIL' is not exported` est **PRÉEXISTANT**. ⚠️ **SANS `.env.local`, LE
BUILD S'ARRÊTE APRÈS LA COMPILATION** sur `Error: supabaseUrl is required` (pré-rendu de
`/login` et `/signup`) — ce n'est PAS une régression. **Ce qui compte est
`✓ Compiled successfully` juste avant.**

⚠️⚠️ **LES BANCS SONT DANS `tools/README.md` DEPUIS LE 432, ET CE CHAPITRE A ÉTÉ ÉLAGUÉ AU 444
SUR L'ORDRE LAISSÉ PAR LE §14.2 DU 442** (reporté deux fois). **19 bancs de contrôle et 21 bancs
de rendu** (le vingtième est `render-maire`, 2026-08-31, **66/66**), comptés en listant `tools/` (⚠️ **le 480 ajoutait `verify-maire` et avait relancé les
36 bancs d'alors un par un** ; le 2026-08-27 ajoute `verify-ludo`, relancé **30/30** :
`verify-quete` **621/621**, `verify-maire` **113/113**,
`render-etoile` **161/161**
⚠️ *ces deux premiers chiffres mentaient depuis un moment : `verify-maire` était resté à 72/72 ici
alors que le 481 l'annonce correctement à 113/113 plus bas dans ce même fichier — même défaut que
celui déjà daté ailleurs dans ce chapitre (« un chiffre corrigé à un seul endroit n'est pas
corrigé »), retrouvé hors-zip en relançant les bancs pour cette livraison.*
⚠️ *il était à 488 au 468 : le déchant a retiré les contrôles des quatre chapitres
supprimés et en a ajouté une trentaine sur la fouille. **Un banc qui rétrécit parce que le code
rétrécit est un banc en bonne santé** — ce qu'il ne faut pas, c'est qu'il rétrécisse tout seul*). ⚠️ **Six d'entre eux existent parce qu'un défaut vu par
Guillaume — ou vu à l'écran — n'était mesuré nulle part** : `verify-compo` (440), `verify-pont`
(441), `verify-portee` (443), et au 444 `render-etoile`, `verify-quete`, `render-beffroi`.
⚠️⚠️ **ET LE 480 EN AJOUTE UN QUI EST D'UNE AUTRE NATURE : `verify-maire` JOUE une mécanique de
bout en bout** — quatre cents entretiens par propriété, cinq maires × deux mondes × dix vitesses
de réflexion — au lieu de relire une table. Il a sorti quatre défauts de RÉGLAGE qu'aucune
relecture n'aurait vus, dont une négociation arithmétiquement ingagnable et une seconde moitié de
discussion devenue décorative. **C'est le premier banc du dépôt qui joue.**
⚠️⚠️⚠️ **ET LE 481 LUI A APPRIS DEUX CHOSES QUE 72 CONTRÔLES VERTS NE POUVAIENT PAS VOIR, ET LES
DEUX ONT ÉTÉ TROUVÉES EN JOUANT** (il est à **113/113**) : (1) **un banc qui manipule des dates doit
manipuler de VRAIES dates** — avec `at: 1000`, rien ne dit que `now | 0` tronque un horodatage de
1,78 × 10¹² à 32 bits, et la secrétaire annonçait « il vous reçoit dans 29778439:55 » ; (2) **un
texte à trous ne se vérifie pas en comptant ses clés, il se vérifie en le REMPLISSANT** — la vue
DEVINAIT quel argument passer à chaque justification, et le joueur lisait « Scrutin dans Lui
jours. » Toutes les clés étaient appariées, tous les textes affichés, tout comptait pour lu.
⚠️ Il importe désormais `maireBureau.js` pour tenir la jointure « sept postures de la mécanique =
sept postures dessinables » : c'est le seul contrôle du dépôt qui relie une règle à son DESSIN.
⚠️⚠️⚠️ **ET IL A APPRIS UNE LIMITE DE `verify-syntax` QU'IL FAUT CONNAÎTRE : IL ANALYSE FICHIER PAR
FICHIER, DONC IL NE PEUT PAS VOIR UN IMPORT QUI NE RÉSOUT PAS.** Un **bundle** —
`npx --yes esbuild@0.21.5 --bundle --loader:.js=jsx --format=esm --outfile=/dev/null
--external:react --external:'@supabase/*' --alias:@/lib/supabaseClient=./lib/supabaseClient.js
--alias:@/lib/realtimeQuota=./lib/realtimeQuota.js components/ferme/FermeGame.js` — a sorti en
96 ms un `A.drawStarCalmGlow` qui n'existe pas, c'est-à-dire **un crash de boucle de rendu vieux
de deux zips** (le piège n°1 de ce fichier, dans le zip même qui livrait la fonctionnalité). Ça ne
remplace pas `next build`, mais ça se lance PENDANT qu'un `next dev` tourne, et c'est le seul
contrôle du dépôt qui voie une liaison entre deux fichiers.
⚠️ **`verify-ludo` est le deuxième banc qui joue une mécanique de mini-jeu** : il balaie 1 000
plans légaux et tient les cinq chemins bot vers les arbitres de l'hôte. Son détail et ses limites
sont dans `tools/README.md`.
⚠️ **Le seul qui touche à de l'ARGENT est `verify-vallee`** (**223/223** au 2026-08-31 ; 208 avant le fleuve et la barque) : il joue des ventes,
compte les pièces, et vérifie que **le cours est bit à bit celui du 430** — contrôle hérité de
`verify-enquete`, sauvé de sa suppression parce qu'il protégeait le marché, pas l'enquête.
**Tout chiffre écrit là-bas a été obtenu en lançant le banc**, c'est sa règle d'entrée.

⚠️⚠️ **ET UN BANC QUI N'A JAMAIS PU ÉCHOUER NE VAUT RIEN** (441). Le garde-fou de source de
`verify-pont` annonçait « 0 appel fautif » alors que son motif ne pouvait matcher **aucun** appel
réel. **Tout banc qui compte des occurrences doit publier combien il en a LUES.**

⚠️⚠️⚠️ **ET LE 444 A AJOUTÉ LA LIMITE DE FOND, CELLE QUI VAUT POUR TOUS : SIX BANCS AU VERT N'ONT
PAS VU DIX DÉFAUTS QU'UNE SÉANCE DE JEU DE VINGT MINUTES A TROUVÉS**, dont cinq qui rendaient un
lieu **inatteignable**. Ils mesuraient tous la bonne chose ; **aucun ne mesurait l'ARRIVÉE**.
Détail au §25 de `components/ferme/README.md`. *Un banc protège de ce qu'on a déjà compris ;
regarder l'écran est la seule chose qui trouve ce qu'on n'a pas encore compris.*

### ⚠️ CE QUI N'EXISTE PAS — ET C'EST LE POINT DE CE CHAPITRE

Une liste de ce qui existe se vérifie en la lançant ; une liste de ce qui n'existe pas ne se
vérifie jamais — c'est elle, et elle seule, qui protège du banc imaginaire (§14.6).

- ⚠️ **`verify-luge`, `verify-boot`, `preview-luge`, `preview.mjs`, `verify-perf` et
  `preview-fps` N'EXISTENT PAS** dans `tools/`.
- ⚠️⚠️⚠️ **ET AUCUN BANC NE COMPTE CE QUE LE CHARGEMENT COÛTE À LA MACHINE — MESURÉ AU 481 PARCE
  QU'UN AMI DE GUILLAUME NE PEUT PLUS JOUER SUR TABLETTE.** `buildSprites()` **crée 2 722 canevas
  2D et en RETIENT 1 829** (2,6 millions de pixels), dont `townWater` **636** (16 configurations ×
  2 variantes × 16 crans de profondeur, plus la berge et le tramage) et `petFrames` **468**
  (39 familiers × 4 directions × 3 images) — soit **60 % à eux deux**. En octets ce n'est rien
  (≈ 6 Mo) ; **ce qui compte n'est pas la taille, c'est le NOMBRE** : WebKit sur iPad alloue une
  surface minimale par canevas et plafonne le total, et le symptôme d'un dépassement n'est pas une
  erreur — c'est un onglet qui se ferme ou un canevas qui rend du blanc.
  ⚠️ **Ce n'est pas corrigé au 481** (règle du 424 : on ne mêle pas deux changements visuels dans
  une livraison) et la parade est connue : **paver** ces deux familles en quelques atlas et découper
  au `drawImage` — le rendu appelle déjà `drawImage` partout, seule la source change.
  ⚠️ **Le chiffre se remesure en trois lignes** : encadrer `cv(w, h)` dans `fermeArt.js` d'un
  compteur sur `window`, recharger, lire. *Une grandeur qu'aucun banc ne mesure se mesure à la main,
  et on écrit le chiffre avec sa date.*
- ⚠️ **AUCUN BANC NE REGARDE LA FERME EN IMAGE** : les vingt-et-un bancs de rendu ne dessinent que
  Valley Town, ses intérieurs, ses habitants et sa quête. Un décor de la ferme mal proportionné
  n'a, à ce jour, aucun endroit où se voir. ⚠️ **Et le SOL de la ferme non plus** : `render-rues`
  peint les rues de la ville, pas les chemins de la ferme, restés sur la tuile unique de 16 px du
  zip 232.
  ⚠️⚠️ **UNE EXCEPTION DEPUIS LE 454, ET ELLE A SERVI TOUT DE SUITE** : le SILLON de l'étoile est le
  premier décor de la FERME qu'un banc regarde (`render-etoile`, §5 bis). Il a fallu le sortir de la
  file de tri et en faire une fonction pour ça — et le jour où il est devenu regardable, on a
  découvert qu'il était PLAT depuis dix zips.
  ⚠️ **LE 455 A APPLIQUÉ LA LEÇON À L'ENDROIT** : la bulle « ! » des PNJ est née DANS `fermeArt` avec
  ses treize contrôles le jour de son écriture (§9 et §10 de `render-etoile`), et le banc a
  immédiatement supprimé un dessin mort (un « ? » que personne n'appelait).
  ⚠️⚠️ **L'ÉCART EST DEVENU FRAPPANT : la ferme garde les deux arbres du zip 232** (trois `arc()`
  et quatre triangles) **et son herbe en tuile de 16 px**, pendant que la ville a onze essences
  animées de 48×64 et un gazon au pavé de 64 px. C'est délibéré (décision du 424 : ne pas mêler
  deux changements visuels) et c'est **la dette la plus visible du projet** — un joueur qui prend
  le train voit deux niveaux de finition.
- ⚠️ **AUCUN BANC NE REGARDE UNE FENÊTRE COMPLÈTE DE VALLEY TOWN.** `render-mairie` (439) et
  `render-beffroi` (444) **appellent** les sols au lieu de les repeindre, donc ils jugent ce que
  le jeu dessine vraiment ; **ce qui manque est ce qui reste dans la closure : les BÂTIMENTS de la
  ville et les PERSONNAGES.** Les autres bancs approximent le décor autour de leur surface.
- ⚠️⚠️ **ET AUCUN BANC NE JOUE À DEUX CLIENTS.** `fake-supabase.mjs` le permet depuis le 432 et
  l'a fait pour la VILLE (trois défauts le premier jour), pour l'enquête au 442 (deux défauts) et
  **pour la quête de l'étoile au 458 — TROIS BLOCAGES DURS**, dont deux rendaient la quête
  infinissable dès qu'un second joueur se connectait (§12.0 de `QUETE.md`). ⚠️ *La séance à deux
  clients a désormais payé les trois fois sur trois où elle a eu lieu.* **Ce qui reste** : la
  moitié qui se joue FACE À FACE (l'étoile timide dos à dos, le croisement d'ombres à deux, la
  flaque promenée sur le ponton, le duo) et **la ferme PEUPLÉE**, jamais vue à deux.
- ⚠️⚠️ **`render-etoile` JOUE UN MOUVEMENT DU MONDE DEPUIS LE 459** : son §7 simule
  `starSlipStep` sur le vrai creux du cratère, 317 départs, et vérifie qu'on SORT du trou. Il a
  trouvé, avant d'être fini, que 219 départs sur 317 étaient bloqués. `verify-ludo` joue désormais
  aussi l'automate pur d'un bot et balaie 1 000 plans légaux ; aucun des deux ne tourne à deux
  clients.
- ⚠️ **AUCUN BANC NE JOUE UN MINI-JEU DANS SON DOM ET SON CANEVAS.** `verify-ludo` protège les
  décisions pures et le branchement aux arbitres ; le navigateur a seul validé le choix 1/2/3 et
  l'enchaînement humain → bot → humain du duel. Ce qui se juge là — *est-ce que c'est agréable ?*
  — ne se mesure toujours nulle part.

⚠️⚠️ **JOUER À DEUX EN LOCAL : `node tools/fake-supabase.mjs`.** REST bidon **+ relais Realtime**,
donc deux onglets = deux joueurs, sans compte et sans consommer un message du quota. `LAT=90
JIT=60` simule une vraie liaison ; il imprime le débit réel PAR TYPE toutes les 5 s.
⚠️ **Le broadcast de supabase-js est BINAIRE**, pas JSON — un relais qui ne lit que les trames
texte voit tout se connecter et rien passer. Depuis le 2026-08-27, le relais mémorise aussi
`broadcast.self` à la jonction : une partie solo à client unique doit recevoir son propre état.

**Jouer en local** — deux échafaudages TEMPORAIRES, **à supprimer après** (recette resservie telle
quelle au 454 puis au 456) :
1. un `.env.local` pointant sur `http://127.0.0.1:54321` ; sans lui on reste bloqué à l'écran
   « code de ferme » ;
2. une page jetable `app/<nom>/page.js` montant `<FermeGame room={{id}} me={{id,username}}
   players={[{profile_id, username, joined_at}]} isHost savedCode="XXXX" />`.
   ⚠️ **`players` EST OBLIGATOIRE** (`[...players]` plante sans lui). ⚠️ **Un dossier `app/`
   préfixé par `_` n'est PAS une route.** ⚠️ **La supprimer avant de livrer** : en production
   elle ouvre une ferme sans authentification.

Puis ⌘⇧X → menu développeur → **20 arrêts** (ferme, passage, Valley Town ×7 dont **le cratère**
depuis le 446, et les **huit niveaux d'intérieur** : tribunal ×3, mairie ×2, église ×3 dont le
beffroi), **« Peupler la ferme »** et **« ⭐ Star »** (444 : effacer · lancer la chute · boucler le chapitre · sauter d'un
cran · marquer le lieu suivant · tout sauf le duo · **et REJOUER UNE SCÈNE isolée**).
⚠️ « Rejouer une scène » est le bouton qui change tout : sans lui, revoir une cinématique oblige à
remettre la quête à zéro, donc on ne la revoit qu'une fois, donc on ne la juge qu'une fois.
⚠️ **AUCUN BOUTON DE QUÊTE NE DONNE QUOI QUE CE SOIT** : le menu s'ouvre à tout joueur qui connaît
le raccourci (398). Le chemin développeur appelle les mêmes résolveurs et JETTE ce qu'ils rendent.
⚠️ **DEPUIS 2026-08, DEUX BOUTONS DU MENU DONNENT VOLONTAIREMENT QUELQUE CHOSE** — exception
délibérée à la ligne du dessus, sur demande de Guillaume : « Argent » (+100 000/+1 000 000/
+10 000 000 or, arbitré par l'hôte comme `devResidents`) et « Constructions & cultures → Tout terminer », qui
avance à MAINTENANT tout horodatage de construction en attente dans `w.objHp` (lampadaire,
épouvantail, moulin, chaudron, repousse d'herbe — voir `BUILD_TIMES`/`buildReady` dans
`fermeEngine.js`), toute culture (`bankedMs` porté à `growMs`) et toute production animale
(`readyAt`). Sert à tester une fonctionnalité de la ferme (bâtiments compris) sans attendre les
délais réels ni faire tourner l'économie à la main. Testé en session à 1 client
(`fake-supabase.mjs`) : l'or s'incrémente bien côté hôte, le bouton renvoie « aucune construction
en cours » sans rien casser quand il n'y a rien à finir.

⚠️⚠️ **AUTOMATISATION DU NAVIGATEUR — LA RECETTE COMPLÈTE, ET ELLE MARCHE DEPUIS LE 446.**
`window.dispatchEvent(new KeyboardEvent("keydown", {code:"KeyE"}))` marche pour TOUTES les touches
(les frappes envoyées par l'outil, non). Le menu dev ouvert BLOQUE les déplacements (`if
(devMenuOpenRef.current …) return`) — il faut `Escape` avant de marcher. La capture d'écran
fonctionne.
⚠️⚠️⚠️ **DANS UN ONGLET MASQUÉ, `requestAnimationFrame` NE SE DÉCLENCHE JAMAIS**
(`document.visibilityState === "hidden"`) : le monde ne tourne pas, le fermier ne bouge pas d'un
pixel, et **`getImageData` relit la dernière image composée** — deux mesures de suite rendent le
même nombre et on accuse le code qu'on vient d'écrire. **UNE LIGNE SUFFIT, ET SON FREIN EST DANS
SA FORME :**
`window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);`
Mesuré au 446 : **31 à 36 images par 500 ms**, onglet masqué, monde qui tourne, marche, mesures.
⚠️ Le `MessageChannel` du 444 figeait l'onglet parce qu'un relais qui se repose un message à
chaque image n'a **pas** de frein ; `setTimeout(…, 16)` en est un par construction. **On pose le
patch AVANT de mesurer quoi que ce soit**, et on peut ensuite lire les pixels du canevas
(`getImageData`) pour mesurer ce qu'aucune capture ne montre — un décalage de sprite, par exemple.
⚠️ Un canevas mesuré pendant qu'un panneau est masqué sort à **0×0**, ce qui ressemble trait pour
trait à un rendu cassé.
⚠️⚠️ **ET DEPUIS LE 454, `setTimeout(…, 16)` NE SUFFIT PLUS : CHROME ÉTRANGLE LES TIMERS D'UN
ONGLET MASQUÉ À UN PAR SECONDE.** Le monde avance (l'horloge tourne) mais à ~1 image/s, ce qui donne
un jeu « qui marche » et des mesures fausses — une scène de chute défilait en douze images. **La
parade est un WORKER, qui n'est pas étranglé** :
`new Worker(URL.createObjectURL(new Blob(["setInterval(()=>postMessage(0),16);"])))`, dont chaque
message vide une file de callbacks `requestAnimationFrame`. C'est le frein du 446 (une file, pas un
relais qui se repose un message) avec une horloge qui ne dort pas. ⚠️ **Il a resservi tel quel au
456**, où il a fait tourner toute la séance.
⚠️⚠️ **MAIS `getImageData` RESTE MENTEUR DANS UN ONGLET MASQUÉ — MESURÉ AU 456.** Avec le worker en
place, l'horloge avançait, les résidents se déplaçaient, et **le hachage de l'écran entier ne
changeait pas d'une image à l'autre** : on aurait conclu « les PNJ sont arrêtés » sur un monde qui
bougeait. **La capture d'écran, elle, est juste** : c'est elle qu'il faut échantillonner, pas les
pixels du canevas. *Deux mesures de suite qui rendent le même nombre ne prouvent rien ; deux
CAPTURES qui rendent la même image, si.*

⚠️ **Le faux canvas de `lib-canvas.mjs` IGNORE `translate`/`rotate` et ne connaît pas `fillText`**
— un sprite qui en dépend s'y juge faux. Ce n'est pas un bogue du jeu. ⚠️⚠️ **Et il
n'implémentait `drawImage` qu'à TROIS arguments jusqu'au 428** : toute découpe y dessinait la
feuille ENTIÈRE. Pas d'erreur, une image plausible, un verdict faux — le stub menteur, **dans
l'outil censé nous en protéger**. **Un banc de rendu se vérifie aussi.**

**Session manuelle à 2 joueurs — seule vraie validation du multijoueur.**
⚠️ **Un stub qui « retombe sur une valeur raisonnable » ment mieux qu'un stub qui plante.**
**Quand un outil et le jeu divergent, croire le jeu.**

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

- ✅ **LE LAC-OCÉAN — TRANCHÉ ET À MOITIÉ CONSTRUIT LE 2026-08-31.** *« Je veux que l'on considère
  le lake and pier plutôt comme un accès à l'océan, et donc le port de Valley Town »* · *« une
  sorte de fleuve qui mène à une sortie ; par la droite. ensable un peu »* · *« il y aura un mode
  de navigation jouable bientôt, mais pour l'instant juste faire un fondu enchaîné, avec décor
  marin générique »* · *« eduardo peut utiliser le navire. mais nous aussi en montant dedans :
  soigner les sprites. anatomiquement cohérentes dans un bateau, mouvements cohérents »*.
  **Le fleuve et sa passe sont faits** (§32 de `components/ferme/README.md`). **Restent les poses à
  bord et le fondu**, une livraison chacun — c'est le bloc ⏭️ REPRISE.
  ⚠️ Ce qui reste une VRAIE question ouverte, et elle n'a rien de technique : **ce qu'on voit après
  le fondu**. Un décor marin générique tient une fois ; à la seconde, le joueur veut savoir où il
  va. Les trois îles de la carte d'Eduardo (§17.5) sont écrites mais rien ne dit encore ce qu'on y
  fait — et c'est cette réponse-là qui décide si le navire est une fin ou une porte.


- ⚠️ **LE CADASTRE ET LE NOTAIRE SONT DES GUICHETS FERMÉS** : les deux pièces existent, meublées,
  et ne rendent aucun service depuis que le 444 a retiré l'histoire qui les employait. La question
  est donc entière : **acheter une parcelle, avec un prix, un titre et une conséquence sur la
  carte.** ⚠️ La FORME est acquise et mesurée (une `req` arbitrée par l'hôte, un état partagé dans
  `ferme_saves`, aucune migration SQL) ; c'est le contenu qui manque.
  ⚠️ **Le MARIAGE n'a toujours pas bougé** — la salle est dressée, les bans sont prêts, il manque
  l'officier depuis le 439. C'est le seul endroit du jeu où deux joueurs feraient quelque chose
  ENSEMBLE qui ne soit pas du commerce, et aucune des deux quêtes ne l'a remplacé : elles se
  MÈNENT à deux, elles ne se CÉLÈBRENT pas.
- **Le salon de coiffure** (427) : **qui coiffe, et comment ça marche ?** Le bâtiment,
  l'enseigne et la banderole « ouverture prochaine » sont posés ; il manque la décision.
- ⚠️ **LE MORCEAU D'ORGUE (441) : UN FICHIER, PAS UNE DÉCISION.** Tu as choisi un vrai morceau
  plutôt qu'une synthèse ; il se dépose dans **`public/sounds/church-organ.mp3`** et rien d'autre
  n'est à faire — la scène, le banc, le toast et la coupure au lever sont branchés. En attendant,
  le jeu dit que la soufflerie est muette, une seule fois, plutôt que de laisser croire à une
  touche cassée.
- ⚠️ **L'ÉGLISE EST OUVERTE ET NE REND AUCUN SERVICE** (441, ta décision) : trois gestes, aucun
  or. Le 442 lui a donné **deux inscriptions à lire** dans la tribune (la cloche et la plaque du
  facteur d'orgues) : c'est la première fois qu'on y monte pour autre chose que la vue, et ça n'a
  rien coûté — les deux se lisent sur des décors qui étaient déjà là.
- **Valley Town : qui HABITE la ville à demeure ?** Les résidents ne font qu'y passer. Le 439 y
  pose **Léonie Sarrazin** à l'accueil de la mairie — mais c'est un décor qui parle, pas une
  habitante : elle ne bouge pas, et `res.zone` ne connaît toujours que « farm » et « town ».
  Faire ENTRER un résident dans un bâtiment est une décision, pas un réglage : il faudrait une
  troisième valeur de zone, donc une position à réconcilier.
  ⚠️ **Et la prairie : le nombre de blocs de 28×28 encore nus est compté par `verify-vallee.mjs`
  à chaque exécution** — on le lit là, on ne le recopie pas ici (le 437 a perdu du temps sur un
  chiffre périmé). On n'y a délibérément posé AUCUN endroit de vie : des résidents qui vont
  contempler un champ vide, c'est du remplissage. La question n'est donc pas « comment les
  meubler » mais **« qu'est-ce qu'on construit là »**.
  ⚠️⚠️ **LE 440 A RÉPONDU POUR LE COIN SUD-EST, ET LA RÉPONSE EST « RIEN, EXPRÈS »** : un bois y a
  été creusé et le sentier de la rive est va s'y perdre — sans un seul endroit de vie, sur demande
  de Guillaume (« pas une zone très fréquentée, un peu sauvage »). C'est le premier morceau de
  carte assumé comme un **vide habité par le décor** plutôt que par des gens, et c'est une réponse
  possible pour les blocs qui restent. `verify-vallee` a donc appris une troisième catégorie (bâti
  / prairie / bois) : sans elle, il réclamait « une raison qu'on y aille » pour une forêt.
- ⚠️⚠️ **LA SCIE DE TRISTAN EST LIVRÉE (lot E, 2026-08-31) ET ELLE ATTEND TON JUGEMENT SUR TROIS
  NOMBRES, PAS SUR SON CODE** — le tempo qui accélère, la durée d'une manche, le prix d'une planche
  fendue. Ils sont détaillés dans le bloc ⏭️ REPRISE, et **aucun ne doit bouger avant que tu aies
  joué** (règle du voyage en train, 431).
  ⚠️ **Ce qui reste une VRAIE décision, en revanche : la seconde poignée.** Le §17.6 de `QUETE.md`
  promet deux joueurs sur la même scie — l'un tire quand l'autre pousse — et la mécanique est déjà
  écrite pour ça (`sawPull(s, side)`). Ce qui manque est le transport du second journal, et surtout
  la réponse à une question qui n'est pas technique : **est-ce qu'on veut que la commande de bois
  DEMANDE deux joueurs**, ou qu'elle soit seulement meilleure à deux ? Le §0 dit « 2 joueurs,
  occasionnellement 3 » ; une serrure à deux sur une étape obligatoire de la quête serait la
  première du jeu, et le §17 s'interdit explicitement d'en poser.
- ⚠️ **DEUX DES TROIS CHANTIERS DE JOUABILITÉ RESTENT À CONSTRUIRE.** Le marché est livré au
  430 et **devenu le SEUL guichet au 431** : la ferme montre et transforme, la ville achète.
  L'économie existe donc vraiment, et le **jour de marché** hebdomadaire est déjà un
  rendez-vous daté. Restent :
  **1. les commissions** — le tableau des nouvelles distribue des demandes de la ville, qu'on
  remplit depuis la ferme, à deux, contre paiement. Elles s'appuient sur l'économie qui existe
  désormais. ⚠️ **LE PATRON EXISTE ET IL EST MESURÉ** : `components/ferme/quete.js` est une table
  de lieux, une table de chapitres, des résolveurs purs qu'un banc peut appeler, et un état
  partagé qui voyage dans un `apply` qui partait déjà — zéro message dédié. Une commission, c'est
  la même chose en beaucoup plus court ;
  **2. les rendez-vous datés** — concert au kiosque, foire : des événements au calendrier
  partagé qui rassemblent résidents ET joueurs au même endroit à la même heure. ⚠️ Le patron est
  désormais écrit **cinq fois** (jour de marché, service de Carla, jour d'orage, cours du marché,
  et au 439 les **élections municipales** + le jour d'audience du maire) : **une pure fonction du
  numéro de jour, jamais un état**. Les élections sont le premier de ces rendez-vous qui ait un
  RÉSULTAT visible dans le monde (le portrait officiel) — c'est le modèle à copier.
- ⚠️⚠️ **LE TACTILE NE COUVRE QUE LA FERME, LA VILLE ET LE TRIBUNAL** (430). Les 21 autres jeux
  de la plateforme n'ont pas été audités au doigt. Certains ont déjà des `pointer*` (puzzle,
  naval, yahtzee), d'autres non — **personne ne sait lesquels**, et c'est exactement l'angle
  mort qui a laissé la ferme injouable pendant des années.
- ⚠️⚠️ **LE VOYAGE EST-IL DEVENU UNE CORVÉE ?** (431, à jouer, c'est la question de ce zip.)
  Vendre exige maintenant de prendre le train : c'est ce qui donne son sens à la ville, mais
  personne ne l'a encore vécu sur une soirée entière. Deux réglages existent si c'est pénible —
  élargir la portée du marché, ou raccourcir le trajet — et **aucun ne doit être touché avant
  d'avoir joué**. On a délibérément conservé la prime de cours (jusqu'à +35 %) comme
  contrepartie : le voyage doit PAYER, pas seulement coûter.
  ⚠️ **ET IL Y A DÉSORMAIS UNE SECONDE RAISON D'Y ALLER, QUI N'EST PAS DE L'ARGENT** : la quête
  de l'étoile fait faire l'aller-retour (le sillon est à la ferme, tout le reste est en ville), et
  depuis le 451 **le NAVIRE donne une raison de revenir voir** — il grandit sur le quai du lac à
  chaque morceau rapporté. Si le voyage cesse d'être une corvée, ce sera peut-être pour cette
  raison-là plutôt que par un réglage — à juger en jouant, comme prévu.
- ⚠️ **LE PAIN DES PIGEONS EST GRATUIT (433) — ARBITRAGE TOUJOURS À TRANCHER**, mais la scène
  MARCHE depuis le 439 (assis, treize pigeons viennent manger ; se lever en fait partir dix sur
  quatorze). L'objection « un joueur qui appuie sans rien voir se passer croit que la touche est
  cassée » ne tient donc plus : il se passe quelque chose. Reste la vraie question — gager le
  geste sur un `bread` du stock lierait la scène à l'économie (joli) mais changerait une ambiance
  en dépense. **Question de conception, pas de technique.**
- ⚠️ **LES OISEAUX NE SONT PAS PARTAGÉS ENTRE LES DEUX JOUEURS** (433, décision de Guillaume :
  « leur comportement doit pas être exactement partagé »). Les emplacements se déduisent de la
  carte, mais le nombre et les activités sont tirés chez chaque client — deux joueurs sur la
  même place ne comptent pas les mêmes pigeons. **À JOUER À DEUX** pour dire si ça se remarque ;
  si oui, le pain seul mérite d'être diffusé (un `send` de trois nombres), pas les oiseaux.
- ⚠️⚠️⚠️ **LA QUÊTE DE L'ÉTOILE (444) — LA SÉANCE À DEUX CLIENTS A ENFIN COMMENCÉ AU 458, ET ELLE A
  PAYÉ IMMÉDIATEMENT.** Deux clients ont tourné ensemble pour la première fois et ont trouvé **trois
  blocages durs**, dont deux rendaient la quête **infinissable dès qu'un second joueur se
  connectait** (§12.0 de `QUETE.md`). ⚠️ **Ce qui n'a TOUJOURS pas été joué est la moitié qui se
  joue FACE À FACE** : l'étoile timide dos à dos, le croisement d'ombres à deux (barème court, 30
  cases / 20 s), la flaque que l'un promène sur le ponton pour l'autre, le duo orgue/beffroi. Le
  code est là et il est corrigé ; les postes n'ont jamais été tenus. ⚠️ **Et la même séance doit
  faire la ferme PEUPLÉE**, réclamée depuis le 419. Voir `components/ferme/QUETE.md` §12.2.
  **Ce qui attend une DÉCISION de ta part, et rien d'autre :**
  **1. Le dessin de la compagne.** Cinq écritures, vue en jeu, pas encore juste : deux directions
  chiffrées dans `QUETE.md` §12.3 (l'agrandir, ou quatre masques de pixels à la main).
  **2. La récompense cosmétique.** L'arbitrage est POSÉ et VIDE (`resolveStarGift` écrit
  `star.gift[joueur]`, une fois, côté hôte, persisté). Reste à décider CE QU'ON DÉBLOQUE — le jour
  où la garde-robe cosmétique lira ce champ, elle n'aura pas à inventer un chemin d'attribution,
  et c'est au moment où l'on en invente un qu'on se trompe.
  **3. Le réglage des cinq mini-jeux.** Ils sont dessinés et vérifiés, jamais joués jusqu'à la
  victoire à cadence réelle. Ce qui s'y juge — *est-ce que c'est agréable ?* — n'est mesuré nulle
  part et ne le sera jamais.
  **4. ✅ CE QUE LE NAVIRE FAIT UNE FOIS FINI — TRANCHÉ AU 453 PAR TOI.** *« Le bateau est construit
  et réel. Eduardo Da Fonseca le prend et part au large […] ça laisse de la marge narrative, pour
  développer de nouveaux mondes et ensuite permettre au bateau de revenir. »* C'est fait, et ça n'a
  coûté ni état ni message : la cale se vide pendant ses voyages. ⚠️ **Ce qui reste ouvert est la
  SUITE, et c'est un vrai chantier** : les îles. Le navire est le premier objet du jeu qui promette
  un ailleurs, et il le promet maintenant par la bouche de quelqu'un.
  **5. ⚠️⚠️ CE QUI ATTEND UN AVIS APRÈS LE 454, ET C'EST DU RÉGLAGE, PAS DE LA CONCEPTION.** Trois
  nombres ont été posés par déduction et une seule séance ne suffira pas à les juger : le **prix de
  Kerguélen** (24 000 or + 60 récoltes + 12 poissons — « forte rémunération », mais sur une ferme à
  quatre artisans, est-ce une soirée ou une semaine ?), les **quinze minutes** de plans (c'est ton
  chiffre ; les deux croisements d'ombres tiennent dedans, à vérifier en jouant) et les **cinq
  commandes de bois** (140 + 45 + 110 + 60 + 40 bois, 3 à 8 min chacune : est-ce que ça donne un
  chantier qu'on suit, ou une file d'attente ?). ⚠️ **Aucun ne doit bouger avant d'avoir joué** —
  c'est la règle du voyage en train (431), et elle a eu raison deux fois.
- **La garde-robe** (427) : les prix sont volontairement très hauts. À jouer pour savoir si
  « très cher » veut dire « on économise pour » ou « on n'y va jamais ».
- **`candyluge`** : voir `public/candyluge/README.md`, qui fait autorité. La décision qui
  manque est de CONCEPTION (le bonbon empoisonné), pas de technique.
- **Gels de PNJ chez l'invité** (359-365) : encore observés ? Vérification demandée depuis le
  419 — session réelle à 2, **ferme PEUPLÉE**, console de l'hôte ouverte. ⚠️⚠️ **C'EST TOUJOURS
  LA PASSE LA PLUS URGENTE DE CE FICHIER**, et aucune des six séances à deux clients (432, 442,
  458) ne l'a faite : elles ont validé des chaînes réseau sur une ferme VIDE, ce qui ne dit rien
  des vingt résidents. ⚠️ **Le 458 est passé à côté pour une raison bête et réparable** : le faux
  Supabase ne persiste pas l'état, donc chaque rechargement repartait d'une ferme neuve — peupler
  puis recharger efface le peuplement. *Peupler EN PREMIER, et ne plus recharger.* ⚠️ **L'EXCUSE TECHNIQUE EST TOMBÉE POUR DE BON AU 432** : `fake-supabase.mjs`
  fait tourner deux clients en local (§10), et la première séance a immédiatement trouvé trois
  défauts du multijoueur de la VILLE. Ce qui n'a jamais été vu à deux : les vingt résidents que le
  428 fait circuler, et le champ d'assise qu'il diffuse. **Les bancs mesurent la simulation de
  l'hôte, jamais ce que voit l'invité.**
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
   AVANT d'ajouter.
   ⚠️⚠️⚠️ **LE 439 A ÉLAGUÉ, ET C'EST LE PLUS GROS RÉTRÉCISSEMENT DE L'HISTOIRE DU FICHIER :
   687 → 661 lignes, dont un EN-TÊTE passé de 151 à 50.** Cet en-tête était devenu un mur de
   cinquante lignes d'avertissements avant le premier chapitre — c'est-à-dire la partie qu'on lit
   le moins bien, occupée par ce qu'on veut qu'on lise le mieux. Les leçons de DESSIN sont
   descendues en §4 (elles y sont à côté des pièges de dessin), les leçons de BANC sont restées
   en tête sous une seule forme (« un banc qui passe ne veut pas dire que la chose est bonne »)
   avec ses quatre variantes connues, et **trois blocs qui redisaient la même chose que §4 ont
   été supprimés, pas déplacés**.
   ⚠️⚠️⚠️ **LE 449 A EXÉCUTÉ L'ORDRE DU 444, QUATRE FOIS REPORTÉ (446, 447, 448) : §4 EST SCINDÉ
   UNE TROISIÈME FOIS.** Les cinq pièges du GÉNÉRATEUR sont partis au §15 bis de
   `components/ferme/README.md` ; les deux règles de CONCEPTION sont restées, parce qu'elles ne
   parlent pas du générateur. ⚠️ **Et l'élagage a trouvé ce qu'un élagage doit trouver : un
   DOUBLON.** « Une variante de décor est une couche » était écrit DEUX fois dans le même
   chapitre — une version courte en Architecture, une longue en JavaScript — et personne ne
   pouvait s'en apercevoir en lisant, puisque cent lignes les séparaient. La longue a survécu.
   ⚠️⚠️ **ET L'EN-TÊTE EST REPASSÉ DE 167 À 125 LIGNES, POUR LA SECONDE FOIS EN DIX ZIPS.** Il
   avait refait exactement ce que le 439 lui avait reproché : quatre récits de zip (444, 446,
   447, 448) empilés avant le premier chapitre, chacun redisant en quinze lignes ce que
   `components/ferme/README.md` dit mieux en un paragraphe. Les RÉCITS sont supprimés, les
   LEÇONS gardées — **une ligne chacune, dans un tableau qui renvoie au détail**. C'est la forme
   qui résiste à l'empilement, parce qu'un récit s'allonge et qu'une ligne de tableau, non.
   ⚠️ *La leçon de ces six ordres exécutés est toujours la même : un chapitre qui grossit à chaque
   zip décrit un code qui vit ailleurs, et il faut le renvoyer là-bas — jamais le résumer ici.*

   Historique : 426 (insuffisant), 427 (§7 → `public/candyluge/README.md`), 428 (§6 →
   `components/ferme/README.md`, 507 → 490), 431 (§4 scindé, 534 → 482),
   432 (§10 → `tools/README.md`, 524 → 483), 433 à 438 (aucun),
   **439 (en-tête 151 → 50 et §13 relu, 687 → 661)**, 440 (aucun),
   **441 (§4 scindé : le DESSIN → `DESSIN.md`)**, 442 (§13 relu ligne à ligne),
   **444 (§10 élagué)**, 446 à 448 (aucun — et l'ordre du 444 reporté trois fois),
   **449 (§4 scindé une 3e fois + en-tête 167 → 125, 903 → 804)**, 450 (aucun),
   **451 (§13 relu ligne à ligne, quatre entrées périmées supprimées)**,
   **452 (aucun ICI — la passe a porté sur `QUETE.md`, qui en avait plus besoin)**,
   **453 (tableau des leçons ramené aux QUATRE derniers zips, comme son propre titre l'annonce)**,
   **454 (le même tableau re-ramené à quatre : 448 et 449 partent, leur détail est déjà ailleurs)**,
   **455 (le même tableau re-ramené à quatre pour la TROISIÈME fois en trois zips : le 451 part, ses
   quatre lignes vivent au §30 de `ferme/README.md` et dans `render-navire.mjs`, que leur colonne de
   droite désignait déjà — la forme tient, c'est tout ce qu'on lui demande)*,
   **456 (QUATRIÈME fois en quatre zips, et pour la première fois l'élagage a mordu DANS un zip et
   pas seulement sur le plus vieux : le 452 part en entier — ses trois lignes vivent au §1 et au
   §12.2 de `QUETE.md`, que leur colonne de droite désignait déjà — et le 453 passe de quatre lignes
   à deux, les deux qui ne sont pas des cas particuliers de compteur. ⚠️ *Le tableau annonce « les
   quatre derniers zips » : le tenir demande de retirer autant qu'on ajoute, et un zip qui ajoute
   quatre lignes doit en retirer cinq.*)**,
   **457 (aucun ICI — le delivery est de l'écriture et une police, pas une leçon de banc ; la
   relecture de `ferme/README.md` reste reportée, une quatrième fois)**,
   **458 (CINQUIÈME fois en cinq zips que le tableau des leçons est ramené à quatre : le 453 et le
   454 partent en entier — sept lignes — pour laisser entrer le 457 et les quatre du 458. Leur
   détail vit là où leur colonne de droite le désignait déjà : `QUETE.md` §1 et §12.2, `render-etoile`
   §5 bis, `furrowBake`, `furrowFib`, §10. ⚠️ *Un zip qui ajoute cinq lignes doit en retirer sept ;
   c'est ce que « les quatre derniers zips » veut dire, et c'est la seule façon que ce tableau ne
   devienne pas ce que l'en-tête est devenu deux fois.*)**.

   **459 (SIXIÈME fois en six zips que le tableau des leçons est ramené à quatre : les QUATRE lignes
   du 455 partent, plus deux du 456 — le seuil de banc et la somme des bulles, qui vivent déjà dans
   `render-etoile` §11 et dans `starTalkerPick` — pour laisser entrer les quatre du 459. Six lignes
   retirées, quatre ajoutées : le tableau RÉTRÉCIT, ce qui est la seule preuve que la forme tient.)**.

   **460 (aucun ICI — le delivery est un réglage de pose visible en jeu, pas une leçon de
   banc ; la relecture de `ferme/README.md` reste reportée, une SEPTIÈME fois)**.

   **464 (SEPTIÈME passe d'élagage du tableau : les quatre lignes du 458 partent avant l'ajout
   des deux leçons du 464. Leur détail reste au §12.0 de `QUETE.md`, dans `render-etoile.mjs`,
   `verify-quete.mjs`, `starShowCard` et `starScenePump`, exactement là où leur dernière colonne
   le désignait. Le tableau couvre bien 459, 462, 463 et 464.)**.

   **465 (HUITIÈME passe : les quatre lignes du 459 partent avant les deux leçons du 465 ; leur
   détail reste dans `QUETE.md` et `render-etoile.mjs`. Le tableau couvre exactement 462 à 465,
   avec les zips sans leçon nouvelle naturellement absents.)**.

   **468 (DIXIÈME passe : les DEUX lignes du 464 partent avant les deux leçons du 468 — deux
   retirées, deux ajoutées, le tableau reste à sa taille et couvre exactement 465 à 468. Leur
   détail vit dans `starFollowerAdded`, `starJoinRef`, `starCompanionsAt`, `starFarmFlightPath` et
   `drawStarFragmentMeteor`, que leur colonne de droite désignait déjà. ⚠️ **Et cette passe a
   trouvé ce qu'un élagage doit trouver : un CHIFFRE PÉRIMÉ dans le §10** — `verify-quete` y était
   annoncé à 439/439, il est à **488/488** ; il avait donc menti pendant neuf zips dans le chapitre
   même qui interdit d'écrire un chiffre de banc sans l'avoir lancé.)**.

   **469 (ONZIÈME passe : les DEUX lignes du 465 et celle du 466 partent avant les TROIS
   leçons du 469 — trois retirées, trois ajoutées, le tableau reste à sa taille et couvre
   exactement 467 à 469. Leur détail vit dans `starJoinRef`, `plancheEscaliers.js` et
   `render-escaliers.mjs`, que leur colonne de droite désignait déjà. ⚠️ **Et cette passe a
   trouvé ce qu'un élagage doit trouver : un CHAPITRE QUI MENTAIT PAR SA FORME** — le §14 de
   `QUETE.md` s'intitulait « les sept décisions qui BLOQUENT la refonte », quatre étaient
   tranchées, et il se lisait encore comme une consigne d'attendre. Il est marqué ARCHIVE et
   la liste vivante est au §15.)**.

   **470 (DOUZIÈME passe : la ligne 467 part avant l'ajout de la leçon du 470 — une retirée, une
   ajoutée, le tableau reste à sa taille et couvre exactement 468 à 470. Le détail retiré reste
   dans `render-escaliers.mjs` et `TOWN_COURT_BLOCK_SOLIDS`, que sa colonne de droite désignait
   déjà. ⚠️ Et cette passe a trouvé le même chiffre périmé que le 468 avait déjà trouvé une fois :
   `verify-quete` était encore annoncé à 449/449 dans l'en-tête ET au §10, alors qu'il est à
   **453/453** — la correction du 468 n'avait porté que sur le §10, pas sur l'en-tête, qui se
   réécrit à chaque livraison et où le chiffre revient donc à chaque fois qu'on oublie de le
   relancer. **Un chiffre corrigé à un seul endroit n'est pas corrigé : il a juste appris un
   second endroit où mentir.**)**.

   **471 (aucun élagage ICI — le tableau ajoute la leçon du 471 et couvre encore exactement
   468 à 471, quatre zips, sans qu'aucune ligne n'ait besoin de partir.)**.

   **472 (TREIZIÈME passe : les DEUX lignes du 468 partent avant les deux leçons de l'audit 472 —
   deux retirées, deux ajoutées, le tableau reste à sa taille et couvre exactement 469 à 472. Leur
   détail vit dans `starJoinStale`, `starJoinBusy`/`starJoinActive` et `verify-quete` §arrivée, que
   leur colonne de droite désignait déjà. ⚠️ Et cette passe a trouvé ce qu'un élagage doit trouver :
   **le bloc ⏭️ REPRISE annonçait un défaut CORRIGÉ (471) que la séance de jeu venait de reproduire
   à l'identique**. Un bloc de reprise qui déclare une victoire est le seul endroit du fichier où
   personne ne pense à revérifier.)**.

   **473 (QUATORZIÈME passe : les TROIS lignes du 469 partent avant la leçon de ce zip — trois
   retirées, une ajoutée, le tableau RÉTRÉCIT et couvre exactement 470 à 473. Leur détail reste
   dans `CALM_KEY_MAX`, `migrateStar`, `verify-quete` §fouille, `starDigStart` et `starNearby`, que
   leur colonne de droite désignait déjà.)**.

   **474 (QUINZIÈME passe : les DEUX lignes du 470 et du 471 partent avant la leçon de ce zip —
   deux retirées, une ajoutée, le tableau RÉTRÉCIT ENCORE et couvre exactement 472 à 474. Leur
   détail reste dans `starGoalKey`, `starEngineerHere`, `starImpactLandedNow` et `verify-quete`
   §objectif, que leur colonne de droite désignait déjà.)**.

   **475 (SEIZIÈME passe : la ligne « migrateStar/townFall » du 472 part avant la leçon de ce
   zip — une retirée, une ajoutée, le tableau reste à sa taille et couvre exactement 472 à 475.
   Son détail reste dans `migrateStar` et `starTownActivityTick`, que sa colonne de droite
   désignait déjà.)**.

   **476 (DIX-SEPTIÈME passe : la ligne 472 part avant la leçon de ce zip — une retirée, une
   ajoutée, le tableau reste à sa taille et couvre exactement 473 à 476. Son détail reste dans
   `starAlone`, `starOtherThere` et `resolveStarCalm`, que sa colonne de droite désignait déjà.)**.

   **479 (DIX-NEUVIÈME passe : les DEUX lignes du 475 et du 478 (« une garde qui se fige à la
   première lecture ») partent avant les deux leçons de ce zip — deux retirées, deux ajoutées,
   le tableau reste à sa taille et couvre exactement 476 à 479. Leur détail reste dans
   `starGoalKey`, `starFallSeen` et `starSeenRef.resume`, que leur colonne de droite désignait
   déjà. ⚠️ Et cette passe a trouvé ce qu'un élagage doit trouver : **le §10 annonçait
   `verify-quete` à 478/478 sur trois lignes de justification** — il est à **578/578** — et le
   bloc ⏭️ REPRISE, réécrit à chaque livraison, portait le même chiffre une seconde fois. C'est
   la TROISIÈME fois que ce chiffre précis ment (468, 470, 479) : *un chiffre de banc recopié à
   deux endroits n'a pas deux chances d'être juste, il a deux endroits où mentir.*)**.

   **480 (VINGTIÈME passe : les lignes du 476 et l'une des deux du 479 partent avant les deux
   leçons de ce zip — deux retirées, deux ajoutées, le tableau reste à sa taille et couvre
   exactement 478 à 480. Leur détail reste dans `starUiOpenRef`/`starDigStep`/`L.star.dig.blocked`
   et dans `drawStarDish`/`render-etoile` §13, que leur colonne de droite désignait déjà.
   ⚠️ Et cette passe a trouvé ce qu'un élagage doit trouver : **le §10 annonçait « 16 bancs de
   contrôle » et « les 35 relancés au 479 »** alors qu'un dix-septième vient de naître ;
   `verify-quete` y était à 580 et il est à 585. C'est la QUATRIÈME fois que ce chiffre précis ment
   (468, 470, 479, 480) — et cette fois il a été corrigé aux DEUX endroits du même coup, ce que le
   470 avait manqué. *Un chiffre de banc recopié à deux endroits n'a pas deux chances d'être juste,
   il a deux endroits où mentir.*)**.

   **481 (VINGT-DEUXIÈME passe : les DEUX lignes du 480 partent avant les deux leçons de ce zip —
   deux retirées, deux ajoutées, le tableau reste à sa taille et couvre exactement 479 à 481. Leur
   détail vit dans `MAYOR_BARE_RISK_K`, `MAYOR_STREAK_HOLD_K` et les §3 et §7 de `verify-maire`,
   que leur colonne de droite désignait déjà. ⚠️ Et cette passe a trouvé ce qu'un élagage doit
   trouver : **le §5 et le §16 de `QUETE.md` décrivaient tous les deux un fichier de 365 Ko qui
   venait d'être supprimé parce qu'il était faux** — c'est le pendant exact de la leçon du 478
   (« un rapport d'audit recopié hérite de ses erreurs »), appliqué cette fois à un ASSET : *une
   ligne de tableau qui décrit un fichier ne dit pas qu'il marche, elle dit qu'il existe.*)**.

   **hors-zip (VINGT-TROISIÈME passe : la ligne 479 part avant la leçon de cette session — une
   retirée, une ajoutée, le tableau reste à sa taille et couvre exactement 480 bis à ce jour. Son
   détail reste dans `nearPierMouth` et la garde du semis d'arbres, `fermeEngine.js`, que sa
   colonne de droite désignait déjà. Cette passe n'est pas un zip numéroté — c'est une session de
   correction de collisions demandée directement, sans upload — d'où l'étiquette.)**.

   **hors-zip, séance suivante (VINGT-QUATRIÈME passe : les DEUX lignes « 481 » partent — le glTF
   du bureau et le `msOf` de l'horodatage — avant les deux leçons de cette séance (compte à rebours
   du météore sans affichage, repli `solveArm` qui oublie `side`) : deux retirées, deux ajoutées,
   le tableau reste à sa taille et couvre exactement 480 bis à aujourd'hui. Leur détail reste dans
   `maireBureau.js` (le bureau procédural qui a remplacé le glTF) et `msOf`/`verify-maire` §9, que
   leur colonne de droite désignait déjà — rien n'est perdu, ces deux défauts restent corrigés et
   documentés à leur code, seule la ligne de rappel s'efface. ⚠️ Et cette passe a trouvé ce qu'un
   élagage doit trouver : le §10 annonçait encore `verify-maire` **72/72**, chiffre du 480, alors
   que le 481 l'avait déjà corrigé à 113/113 quelques paragraphes plus loin dans CE MÊME fichier —
   cinquième occurrence de ce défaut précis (468, 470, 479, 480, et maintenant ici), toujours la
   même leçon : *un chiffre recopié à deux endroits n'a pas deux chances d'être juste, il a deux
   endroits où mentir.*)**.

   **hors-zip, collisions & maire (VINGT-CINQUIÈME passe : les DEUX lignes du hors-zip
   `nearPierMouth`/`TOWN_PIER` et du 480 bis `STAR_FARM_CRATER_DRAW_SCALES` partent avant les deux
   leçons de cette session (le décalage d'une case entre bitmap et collision de l'escalier, et le
   filtre de teinte qui fait glisser un banc de structure) : deux retirées, deux ajoutées, le
   tableau reste à sa taille. Leur détail retiré reste dans `nearPierMouth`/`fermeEngine.js` et
   `STAR_FARM_CRATER_DRAW_SCALES`/`fermeConstants.js`, que leur colonne de droite désignait déjà —
   rien n'est perdu, ces deux défauts restent corrigés à leur code. Session directe, sans upload —
   d'où l'étiquette.)**.

   **hors-zip, pont/torche/quête (VINGT-SIXIÈME passe : la ligne « mécanisme sans affichage » du
   hors-zip précédent part avant la leçon de cette session (un correctif posé sur un pont ou un
   porteur de lumière ne couvre pas son double ailleurs dans le code) : une retirée, une ajoutée, le
   tableau reste à sa taille. Son détail retiré reste dans `starTownActiveRef`/`.ferme-wait-pill`,
   que sa colonne de droite désignait déjà. Le bloc ⏭️ REPRISE a été remplacé en entier (pont du
   parc, torche, escaliers non retrouvés, focus personnel du chapitre 1, plongeon de l'étoile
   blanche) — aucun des cinq n'a pu être rejoué à l'écran, l'automatisation du déplacement restant
   bloquée ; seuls les bancs (`verify-vallee` 205/205, `verify-quete` 596/596), le bundle esbuild et
   `next build` ont vérifié cette livraison.)**.

   **480 bis (VINGT-ET-UNIÈME passe : la ligne 478 part avant la leçon de ce zip — une retirée,
   une ajoutée, le tableau reste à sa taille et couvre exactement 479 à 480 bis. Son détail reste
   dans `resolveStarTimberTick`/`starTimberBlock`, que sa colonne de droite désignait déjà.)**.

   **2026-08-31 bis, le fleuve (TRENTE-ET-UNIÈME passe : aucune ligne du tableau des leçons ne
   part, parce que cette session n'en ajoute AUCUNE — ses trois enseignements sont des leçons de
   CARTE, pas de projet, et ils vivent au §32 de `components/ferme/README.md`, à côté du générateur
   qu'ils décrivent : le sentier qui redevient un escalier quand il épouse la rive, les trois
   constantes du bois qui se règlent ensemble ou pas du tout, le dénominateur du banc qui comptait
   l'eau. ⚠️ *Une session qui ne produit pas de leçon à l'échelle du projet ne doit pas en inventer
   une pour remplir le tableau* — c'est ce qui l'a fait grossir deux fois. La passe corrige en
   revanche deux chiffres : `verify-vallee` passe de 208 à **214**, et le §13 perd sa question
   « lac-océan » puisqu'elle est répondue.)**.

   **2026-09-01, le rythme de la quête (TRENTE-QUATRIÈME passe : les DEUX lignes « scie » du
   tableau des leçons partent avant les deux de cette livraison — deux retirées, deux ajoutées, le
   tableau reste à quatre et couvre exactement les deux dernières sessions. Leur détail retiré vit
   dans `SAW_MAX_TICKS`/`sawTick`/`verify-scierie` §1 et dans l'en-tête de `render-scierie.mjs`,
   que leur colonne de droite désignait déjà. ⚠️ Cette passe AJOUTE une **seizième forme** au
   « banc qui passe » de l'en-tête — *il mesure une PRÉSENCE là où le joueur perçoit une VALEUR* —
   et deux pièges au §4 (l'animation CSS qui ne redémarre pas, le sélecteur redéclaré qui corrige
   au lieu de compléter). ⚠️⚠️ Et elle a trouvé ce qu'un élagage doit trouver, DEUX fois : (1) le
   §10 annonçait encore **« 18 bancs de contrôle et 20 bancs de rendu »** et le §« ce qui n'existe
   pas » **« les dix-huit bancs de rendu »**, alors qu'il y en a 19 et 21 depuis la livraison
   précédente — laquelle avait pourtant écrit noir sur blanc qu'elle corrigeait ce compte ; c'est la
   HUITIÈME fois que ce chapitre se fait reprendre sur un chiffre, et la seconde fois qu'une
   correction annoncée n'a porté que sur un des deux endroits. (2) Le bloc du maire réclamait encore
   deux choses **faites depuis** : les huit feuilles `L.maire` orphelines (supprimées, et un contrôle
   les garde) et « la fin de la quête est trois points colorés » (le navire entre dans sa scène de
   résolution). *Une dette payée qui reste écrite se relit comme une dette.*)**.

   **2026-08-31, la scie de Tristan — lot E (TRENTE-TROISIÈME passe : les DEUX lignes du 2026-08-31
   (le véhicule à deux degrés de liberté, la chaîne d'os remise à jour depuis sa racine) partent
   avant les deux leçons de cette livraison — deux retirées, deux ajoutées, le tableau reste à
   quatre et couvre exactement les trois dernières sessions. Leur détail retiré vit dans `boatStep`
   / `verify-vallee` §barque et dans `applyPose` / `maireBureau.js`, que leur colonne de droite
   désignait déjà. ⚠️ Cette passe AJOUTE aussi une **quatorzième forme** au « banc qui passe » de
   l'en-tête — *il accuse le personnage de ce que fait son cadrage* — et un piège React au §4
   (un nettoyage d'effet qui a un effet de bord). ⚠️ Et elle a trouvé ce qu'un élagage doit
   trouver : **le §10 annonçait « 18 bancs de contrôle et 20 bancs de rendu »** alors qu'il y en a
   19 et 21 depuis cette livraison, et le compte n'était écrit qu'à un seul endroit — la seule
   forme qui ne mente jamais deux fois, et la septième fois que ce chapitre se fait reprendre sur
   un chiffre.)**.

   **hors-zip, session saule (TRENTE-DEUXIÈME passe : la ligne 2026-08-30 (« deux horloges qui se
   croisent ») part avant la leçon de cette session — une retirée, une ajoutée, le tableau reste à
   quatre. Son détail retiré reste dans `STAR_CANDY_FRESH_MS`/`RUN_INJURED_MS`/`doAction`, que sa
   colonne de droite désignait déjà. La session corrige le saule procédural de Valley Town, signalé
   « affreux » par Guillaume à côté du saule importé qu'il trouve « merveilleux » : `townTreeKind`
   ne choisit plus `TT.WILLOW` sur la berge, et le saule importé porte deux variantes de teinte
   légères en automne. Vérifié par `render-arbres` et `verify-vallee` (223/223) uniquement — jamais
   revu sur la vraie berge.)**.

   **2026-08-31, le maire regardé (TRENTIÈME passe : les DEUX lignes « hors-zip » du tableau — le
   compteur cumulatif et l'horloge d'interface bornée par sa phase — partent avant les deux leçons
   de cette session (une garde qui borne au lieu de jeter, une chaîne d'os remise à jour depuis sa
   racine) : deux retirées, deux ajoutées, le tableau reste à quatre. Leur détail retiré vit dans
   `starTownActiveRef`/`STAR_TOWN_ACTIVE_MS` et `starTownWaiting`/`starTownActivityTick`, que leur
   colonne de droite désignait déjà. ⚠️ Cette passe AJOUTE aussi une treizième forme au « banc qui
   passe » de l'en-tête — *il vérifie qu'une chose EXISTE, jamais qu'elle TIENT ENSEMBLE* — et un
   piège JavaScript au §4 (l'étalement qui recopie les références de tableaux). ⚠️ Et elle a trouvé
   ce qu'un élagage doit trouver : **le §10 annonçait « 19 bancs de rendu »** alors que
   `render-maire` en fait vingt, et le compte n'était corrigé nulle part ailleurs — sixième
   occurrence du chiffre recopié, mais cette fois il n'était écrit QU'À UN endroit, ce qui est la
   seule forme qui ne ment jamais deux fois.)**.

   **hors-zip, textes de quête & lueur bleue (VINGT-SEPTIÈME passe : la ligne `solveArm` part
   avant la leçon de cette session (une même clé d'objectif qui pilote deux mécanismes — le
   chevron ET le forçage du monde maléfique — doit se scinder pour les deux, jamais un seul) :
   une retirée, une ajoutée, le tableau reste à sa taille. Son détail retiré reste dans
   `solveArm`/`maireBureau.js`, que sa colonne de droite désignait déjà. Session directe, sans
   upload — quatre demandes de Guillaume en jouant : le texte de la plongée de l'étoile blanche
   (pourquoi elle plonge, comment y remédier — `dig.bodyStarLure` corrigé, toast automatique une
   fois), l'annonce des puces cliquables à plusieurs (`hud.focusHint`, toast une fois), la lueur
   bleue du défi de fuite qui expire pour de vrai 5 minutes après la course
   (`STAR_CANDY_FRESH_MS`, `candyUntil`, halo pulsant sur le fermier — `drawStarCalmGlow`
   réutilisé), et le chevron de la blanche qui pointait encore le chaudron une fois la fiole
   prête (`farmImpactLureGive`, `ctx.potion`). Vérifié par les bancs (`verify-quete` 609/609,
   `verify-strings`, `verify-syntax`, bundle esbuild, `next build`, `render-etoile`,
   `verify-vallee`), jamais à l'écran — même blocage d'automatisation du déplacement que les
   sessions précédentes.)**.

   **2026-08-27, dossier quête & Ludo solo (VINGT-HUITIÈME passe : la ligne la plus ancienne du
   tableau, « un correctif de motif ne couvre pas sa sœur », part avant la leçon `self:true` — une
   retirée, une ajoutée, le tableau reste à quatre. Son détail demeure dans `fermeEngine.js`,
   `FermeGame.js` et `DESSIN.md`. La passe corrige aussi le compte des bancs : `verify-ludo`
   devient le dix-huitième banc de contrôle et passe 30/30. Le dossier créatif vit au §17 de
   `QUETE.md`, la mécanique Ludo dans `ludoBot.js` ; aucun des deux n'est recopié ici.)**.

   **2026-08-27, lumière bleue (VINGT-NEUVIÈME passe : la ligne `self:true` part avant la leçon
   sur les dates absolues — une retirée, une ajoutée, le tableau reste à quatre. Son détail demeure
   dans `tools/fake-supabase.mjs`, `verify-ludo.mjs` et `PetitsChevaux.js`. Le bloc ⏭️ REPRISE est
   remplacé par le paiement à rejouer et les deux chiffres de `verify-quete` passent ensemble à
   621/621.)**.

   **478 (DIX-HUITIÈME passe : la ligne 473 part avant la leçon de ce zip — une retirée, une
   ajoutée, le tableau reste à sa taille et couvre exactement 474 à 478. Son détail reste dans
   `starFarmImpactLandedReal`, `starImpactLandedReal` et `starCalmOk`, que sa colonne de droite
   désignait déjà. ⚠️ Et cette passe a trouvé ce qu'un élagage doit trouver : **le bloc ⏭️ REPRISE
   annonçait comme BLOQUANT un défaut qui n'existe pas** — « deux impacts derrière une rivière
   qu'on ne peut pas traverser » — alors qu'on traverse à cheval depuis 2026-07, et que le
   commentaire qui le dit est dans `fermeConstants.js` depuis. *Un rapport d'audit recopié dans ce
   fichier hérite de ses erreurs, et il les garde plus longtemps que lui.*)**.

      **467 (NEUVIÈME passe : la ligne 463 part avant l'ajout du 467. Le tableau couvre les quatre
   derniers zips 464 à 467 ; le détail retiré reste dans `QUETE.md` et `starCompanionsAt`.)**.

   ⚠️⚠️ **LE 451 A EXÉCUTÉ L'ORDRE DU 449 : §13 RELU LIGNE À LIGNE**, huit zips après le 442.
   Quatre entrées parlaient d'un code SUPPRIMÉ au 444 — elles décrivaient l'enquête cadastrale
   comme si elle tournait encore (« le 442 a ajouté une seconde raison d'aller en ville :
   l'enquête… ») — et une cinquième racontait sur onze lignes l'histoire de séances à deux clients
   au lieu de dire ce qui reste à faire. ⚠️ **Une question à laquelle on a répondu ne sort pas du
   fichier toute seule : elle y reste, et elle ment** — troisième preuve après 439 et 442.

   ⚠️⚠️ **LE 452 A EXÉCUTÉ L'ORDRE DU 451 : `QUETE.md` EST RELU CONTRE LE CODE** (943 → 1 141
   lignes ; il a grossi parce qu'il portait quatre dettes qui n'étaient écrites nulle part). Ce qui
   a été corrigé : la FICTION (§1, §2, le retournement, la fin), les **citations**, qui étaient en
   anglais alors que le jeu parle français depuis le 451, le **pisteur** (c'est le navire, plus un
   bandeau), les **dix** familles de dessin, le §10 qui ignorait quatre zips, et les **chiffres de
   bancs**, tous relancés (`verify-quete` **284/284** contre 220 écrit, `verify-vallee` **205/205**
   contre 200, `verify-strings` **1 082**). ⚠️ **Et une section « ce qui n'existe pas encore »
   annonçait le beffroi comme non construit, huit zips après sa construction.**

   ⚠️⚠️ **LE 453 A EXÉCUTÉ L'ORDRE DU 452 — LE BANC DU COMPTE DE MORCEAUX EST ÉCRIT — ET IL A
   TROUVÉ EN CHEMIN CE QUE PERSONNE NE CHERCHAIT.** Le tableau des leçons annonçait « les QUATRE
   derniers zips » et en portait SEPT : ramené à quatre, le détail restant à côté du code qu'il
   décrit. ⚠️ **Et l'élagage a trouvé ce qu'un élagage doit trouver** : la leçon 448 « une constante
   que seul le banc lit est débranchée » venait d'être **repayée par le zip qui l'avait écrite** —
   le 452 l'a diagnostiquée sur `STAR_SHIP_NEAR_R` puis a gardé la constante « en réserve ». La
   ligne le dit maintenant, et la constante est supprimée. *Une leçon qu'on écrit sans l'appliquer
   dans le même zip est une leçon qu'on repaiera.*

   ⚠️⚠️ **LE 454 A ÉLAGUÉ LE TABLEAU DES LEÇONS POUR LA SECONDE FOIS EN DEUX ZIPS, ET C'EST LE
   SIGNE QUE LA FORME EST LA BONNE** : il annonce « les quatre derniers zips », il en portait cinq
   (448 → 453), il en porte quatre (451 → 454). Les deux lignes du 448 ne sont pas résumées ailleurs
   — elles vivent au §28 de `ferme/README.md`, que leur colonne de droite désignait déjà. *Une ligne
   de tableau qu'on retire en ayant vérifié où elle vit n'est pas une perte, c'est un déménagement
   qui a réussi.*

   ⚠️⚠️ **LE 456 N'A PAS EXÉCUTÉ L'ORDRE DU 453 (RELIRE `ferme/README.md` CONTRE LE CODE) — IL EST
   DONC REPORTÉ POUR LA TROISIÈME FOIS, ET ÇA COMMENCE À RESSEMBLER AUX QUATRE REPORTS DU 444.** Ce
   qu'il a fait à la place mérite quand même d'être noté, parce que c'est la même grandeur : il a
   trouvé, en jouant, que **cinq phrases de la quête n'avaient aucun chemin d'affichage** alors que
   le banc les comptait comme lues. *La question du 453 — « chaque chose que le document dit visible
   a-t-elle un chemin de code qui l'affiche ? » — vient de se reposer sur le CODE au lieu du
   document, et elle a payé une seconde fois.*

   ⚠️⚠️ **LE 458 NE L'A PAS FAIT NON PLUS — CINQUIÈME REPORT, ET ON DÉPASSE MAINTENANT LES QUATRE
   REPORTS DU 444.** Ce qu'il a fait à la place est de la même famille et vaut d'être noté : il a
   trouvé, en jouant à DEUX clients, que **trois mécaniques décrites comme jouables ne l'étaient
   pas** dès qu'un second joueur se connectait. *La question du 453 — « chaque chose que le document
   dit possible a-t-elle un chemin de code qui la rende possible ? » — vient de se reposer sur la
   COOPÉRATION, et elle a payé une troisième fois.*

   ⚠️ **L'ORDRE DU PROCHAIN ZIP : RELIRE `components/ferme/README.md` CONTRE LE CODE**, comme le 452
   l'a fait pour `QUETE.md` et avec le même rendement. C'est le seul document d'autorité du dépôt
   qui n'ait jamais eu sa passe, il couvre 428-451, et deux de ses chapitres décrivent du code que
   le 453 vient de changer (§30 le navire, §26 le cratère). ⚠️ **La grandeur à mesurer en premier
   est celle qui a payé au 453** : *chaque chose que le document dit visible à l'écran a-t-elle un
   chemin de code qui l'affiche ?*

3. **Critère d'inclusion** : « est-ce vrai à l'échelle du projet, et invérifiable en ouvrant
   un seul fichier ? » Sinon, ça va dans un commentaire de code. **L'histoire d'un défaut
   corrigé n'y a pas sa place — seule sa LEÇON, en §4.**
4. **Écrire pour un modèle fort.** Densité maximale, phrases courtes, tableaux.
5. **Dire ce qui n'est PAS fait**, avant le reste.
6. ⚠️ **NE JAMAIS AFFIRMER QU'UN OUTIL EXISTE SANS L'AVOIR LANCÉ.** Le 425 décrivait
   `verify-vallee.mjs` « 74 contrôles, 74/74 » : le fichier n'existait pas. Un banc imaginaire
   fait passer pour testé ce qui ne l'est pas — c'est le stub menteur du §10, appliqué à la
   documentation elle-même. **Tout chiffre de banc écrit ici a été obtenu en le lançant.**
