# tools/ — LES BANCS, ET CE QU'ILS ATTRAPENT

Ce fichier est **l'autorité** sur les bancs du projet. Il a été extrait de `CLAUDE.md` §10 au
zip 432, sur l'ordre laissé par son §14.2 : « le jour où la liste dépasse la moitié du
chapitre, elle part dans un `tools/README.md` — en ne gardant là-bas QUE ce qui n'existe pas ».
Le 432 a ajouté deux entrées (`render-ruche.mjs`, `fake-supabase.mjs`) et l'a fait basculer.
Le 433 en ajoute trois (`verify-taxi`, `render-taxi`, `render-oiseaux`), le 434 une
(`render-rues`), le 435 une (`render-eau`), le 436 une (`render-escaliers`), le 440 une
(`verify-compo`).

⚠️ **`CLAUDE.md` ne garde que la liste des bancs ABSENTS**, et c'est délibéré : c'est elle qui
protège du banc imaginaire (§14.6 — le 425 décrivait `verify-vallee.mjs` « 74 contrôles, 74/74 »
alors que le fichier n'existait pas). Une liste de ce qui existe se vérifie en lançant ; une
liste de ce qui n'existe pas ne se vérifie jamais tant qu'on ne l'écrit pas quelque part.

⚠️ **RÈGLE D'ENTRÉE : tout chiffre écrit ici a été obtenu en LANÇANT le banc.** Jamais estimé,
jamais recopié d'un zip précédent sans relance.

---

## ⚠️⚠️ ZIP 439 — CE QUE CETTE PASSE A APPRIS SUR LES BANCS EUX-MÊMES

Trois des défauts livrés ce zip-ci étaient **regardés par un banc qui passait au vert**. Ce n'est
pas une coïncidence, ce sont trois formes distinctes de la même faute, et elles valent d'être
nommées ensemble parce qu'on les refera :

1. **UN BANC QUI SE DONNE UN PÉRIMÈTRE EXCLUT LES DÉGÂTS QU'IL CAUSE À CÔTÉ.**
   `render-mairie` filtrait les refus de meubles sur les deux niveaux de la mairie, puis
   imprimait « 0 refus (le tribunal en garde 10, **antérieurs**) ». Ils ne l'étaient pas : cinq
   venaient d'être créés par l'escalier que le même zip ajoutait, dont la **statue de la Justice**
   du tribunal, effacée en silence pendant un zip entier. *Un chiffre qu'on excuse dans son propre
   rapport est un chiffre qu'on ne regarde plus.* Il échoue désormais sur tout le bâtiment.

2. **UN BANC QUI MESURE LA CARTE NE MESURE PAS L'INTERACTION.**
   « Le seuil de « hall » est bien une sortie — cases 9/9 » : vrai, et le joueur était enfermé,
   parce que le prédicat de la touche E testait le niveau 0 avec le seuil du tribunal en dur. Le
   banc **rejoue maintenant `nearCourtExit`** pour chaque bâtiment, position par position.

3. **UN BANC QUI REPEINT NE JUGE PAS LE JEU, IL JUGE SA PROPRE MAQUETTE.**
   `render-mairie` peignait les sols en aplats parce qu'ils vivaient dans la closure du rendu. Il
   les **appelle** depuis que `drawCourtWoodTile` & co. sont dans `fermeArt.js` — et sa première
   exécution a montré un tapis en tartan, parce qu'il passait un `y` local là où le jeu passe un
   `y` absolu. *Un banc qui appelle peut encore se tromper d'unité ; un banc qui repeint ne peut
   même pas s'en apercevoir.*

Et un quatrième, côté seuils : **`render-mairie` déclarait « meublé » un bureau de 221 cases qui
contenait huit meubles**, parce que le contrôle était `n < 6`. Il mesure une DENSITÉ depuis le 439
(meubles pour cent cases, minimum 8) et il a immédiatement attrapé la salle des mariages à 6 %.
*Un seuil absolu sur une grandeur qui dépend du décor est faux dès que le décor change* — c'est le
seuil du taxi au 434, transposé au mobilier.

⚠️ **`render-oiseaux` avait la même forme de trou** : sa section « le pain jeté depuis un banc »
tournait avec `threats: []`, c'est-à-dire **sans personne sur le banc**. Elle mesurait un
attroupement dans un monde où le joueur n'existe pas, et elle passait au vert pendant que
Guillaume voyait les pigeons s'envoler. Une section « assis sur un banc » a été ajoutée : le
lanceur y est, les miettes tombent où `throwCrumbs` les met, et **le premier contrôle est
arithmétique** — aucune miette ne doit tomber dans le rayon d'envol de celui qui les jette. Il
aurait attrapé le défaut du 433 sans dessiner une image.

## ⚠️⚠️ ZIP 440 — TROIS BANCS SE SONT TROMPÉS DE GRANDEUR DANS LA MÊME PASSE

Et la série est maintenant longue (rues 434, eau 435, escaliers 436, mairie 439) : **c'est la
règle, pas l'accident.** Les trois valent d'être nommés parce que les trois formes reviendront.

1. **UN BANC QUI REFAIT UNE FONCTION AU LIEU DE L'APPELER MESURE UN AUTRE MONDE.**
   `render-parc` s'est recopié le champ du bois — avec un hachage réinventé, donc un autre champ.
   Il annonçait « taillis 12 % » pour une futaie réglée à 50 % **en passant au vert**, et on
   serait allé corriger un dessin qui n'avait rien. C'est le §3 du 439 (« un banc qui repeint juge
   sa propre maquette ») commis sur une FONCTION. `townWoodDepth` est sortie de la closure du
   générateur pour ça, et le banc l'appelle.
2. **UNE BANDE DE COLONNES N'EST PAS UNE TRANCHE DE FORÊT.** Le même banc mesurait la densité du
   bois par trois bandes verticales moyennées sur toute la hauteur de son rectangle : elles
   diluaient le cœur avec les rangées où le champ est négatif, c'est-à-dire où il n'y a par
   construction aucun arbre. **On mesure par tranche de PROFONDEUR**, et les bornes sont celles du
   modèle (`TOWN_WOOD_DEPTH`), pas des nombres ronds — un seuil écrit à la main ici est le
   paramètre qui double un paramètre du §8, dans l'outil censé le surveiller.
3. **UN ÉCART-TYPE BRUT SUR UNE FRONTIÈRE EN PENTE NE MESURE QUE LA PENTE.** La lisière de ce bois
   est diagonale par construction : son écart-type vaut 24 cases **quelle que soit sa forme**, et
   une diagonale tirée à la règle serait passée haut la main. On retire la droite des moindres
   carrés et on mesure le RÉSIDU.

⚠️ Et un quatrième, côté catégories : **`verify-vallee` ne connaissait que « bâti » et
« prairie »**, donc un chemin qui traverse un bois faisait réclamer « une raison qu'on y aille »
pour une forêt. Le seuil n'était pas faux, sa catégorie l'était. ⚠️ **Le mécanisme sous-jacent
vaut d'être retenu** : le seuil mesure `pavé / praticable`, or les arbres retirent du praticable —
**planter une forêt augmente le taux d'aménagement d'un bloc sans y construire quoi que ce soit.**
C'est le « seuil absolu sur une grandeur qui dépend du décor » du 439, avec le DÉNOMINATEUR qui
bouge.

⚠️ **`render-eau` a eu droit à la correction inverse, et c'est la même règle vue de l'autre côté.**
Son contrôle de grille intérieure est tombé sous son seuil d'échantillon (192 arêtes pour 200)
parce que l'étang s'est resserré au droit du pont. Baisser le seuil aurait rendu le vert sans rien
mesurer de plus ; il mesure désormais **les deux arêtes de case, pas seulement l'est-ouest** — une
grille est une grille dans les deux sens, donc c'est une mesure plus complète ET deux fois plus
d'échantillon. **On agrandit l'échantillon, on ne desserre pas la mesure.**

## Ce qui existe

- **`tools/verify-compo.mjs` — 13 contrôles, 13/13 (440).** LA COMPOSITION DES DÉCORS, sur toute la carte.
  ⚠️ Il existe parce que Guillaume a vu « un arbre sur un pont » et qu'aucun des quinze autres
  bancs ne pouvait le voir. La grandeur qui manquait tient en une phrase : **le générateur raisonne
  en CASES, le rendu dessine des sprites de CINQ cases de large, et rien ne comparait les deux.**
  Un pont occupe une case et en couvre cinq ; une clôture en occupe une et en couvre quatre. Tout
  ce qui est posé après tombe librement dans les cases COUVERTES sans être OCCUPÉES — ça ne bloque
  rien, ne casse aucun trajet, ne lève rien. Ça se voit, et c'est tout.
  Il mesure : rien de planté ni de posé sur un ouvrage (tablier, ponton, allée, dallage, eau) ·
  **l'ouvrage dessiné couvre exactement son tablier** (le contrôle qui justifie `TOWN_BRIDGE_SPAN`)
  · aucun arbre dans le corps d'un décor · aucun décor dans le corps d'un autre · **aucun ouvrage
  linéaire en tronçon isolé** (une clôture de quatre cases seule au milieu d'un pré est légale,
  propre, et ne veut rien dire : ce qui fait un garde-corps, c'est qu'il COURE).
  ⚠️ **Il a trouvé six défauts à sa première exécution**, dont deux saules au milieu du tour de
  l'étang (trois passes de pavage testaient `solid`, or un arbre n'est pas solide dans cette
  couche) et deux nénuphars sur la même case.
  ⚠️⚠️ **ET IL IMPRIME CE QU'IL NE SAIT PAS MESURER, À CHAQUE LANCEMENT** : les 137 décors
  procéduraux (étal, kiosque, statue, puits, tombe) n'ont pas de taille lisible hors de
  `fermeArt.js` et comptent pour une case. C'est la seule chose qui empêche de lire « verify-compo
  passe » comme « la composition est bonne ». Recopier leur largeur dans les constantes serait le
  doublon du §8 dans l'outil censé nous en protéger : **un trou déclaré vaut mieux qu'un doublon
  silencieux.**

- **`tools/render-mairie.mjs` — l'intérieur de l'hôtel de ville, 11 contrôles (438, refondu au 439).** Un intérieur
  ne se vérifie pas en le lisant : le tribunal du 426 a livré **six pièces inaccessibles sur
  dix-sept** — une colonne posée devant une porte, écrites à cent lignes l'une de l'autre — et
  personne ne l'avait vu à la relecture. Celui-ci DESSINE le plan de chaque niveau et contrôle ce
  que la connexité ne dit pas : chaque pièce est meublée (une pièce nue dans un bâtiment public se
  lit comme une pièce oubliée), **aucun meuble n'a été refusé** par le garde-fou des portes (un
  refus n'est pas un incident, c'est une pièce appauvrie **en silence** — il a trouvé deux portes
  de l'étage posées sur une rangée de colonnes), et surtout **la mairie ne ressemble pas au
  tribunal** : on compte les meubles qu'elle ne partage pas avec lui (11 sur 23). À zéro, on aurait
  dessiné deux fois le même couloir.
  ⚠️ Il rejoue le générateur en interceptant `console.warn` : c'est la seule façon de compter les
  refus sans recopier la règle qui refuse.


- **`tools/render-arbres.mjs` — 11 essences × 3 saisons, 9 contrôles (437).** Il existe parce
  que `oakTree` (trois `arc()`) et `pineTree` (quatre triangles) n'avaient **jamais** été
  regardés : écrits dans les premiers zips, jamais retouchés, pendant que la rue prenait un
  motif de 64 px (434) et la falaise ses assises (436). C'est le constat de tête de
  `CLAUDE.md` appliqué aux arbres.
  ⚠️⚠️ **SON CONTRÔLE CENTRAL A ÉTÉ ÉCRIT QUATRE FOIS, ET C'EST LA LEÇON DU 438.** Le 437
  mesurait le « grain » — le nombre de frontières de ton par pixel — **en le prenant pour de la
  qualité**. Verdict de Guillaume sur le résultat : « c'est dégueulasse […] vraiment sale ». *Le
  grain montait, la propreté baissait, et le banc applaudissait.* Trois rédactions ont suivi :
  « le pixel isolé » (elle accusait la pointe d'un rameau de saule et le cœur d'une fleur —
  **elle interdisait le pixel art**), « les îlots de moins de quatre pixels » (elle accusait les
  éclats d'un dégradé, 20 % sur des dessins propres), et enfin la bonne : **les îlots qui flottent
  dans un APLAT**, tout leur pourtour d'une seule couleur, en connexité à **huit** voisins — à
  quatre, un cerne d'un pixel en diagonale n'est plus connexe et le banc accuse le contour
  lui-même. Mesuré : ancien chêne **1,3 %**, nouvelles essences **0 à 0,4 %**.
  Il contrôle aussi qu'aucun pixel ne touche le bord du canevas (le piège n°1 des sprites, §4) et
  que les trois silhouettes saisonnières sont identiques au pixel près (**un arbre qui change de
  forme en changeant de couleur se lit comme un autre arbre**).
  ⚠️ Il appelle `A.townTreeKind` sur les **859 arbres de la carte** : aucun saule loin de
  l'eau, aucun pommier hors du verger, aucune essence au-delà de 39 % du total.
  ⚠️ **Il a trouvé trois défauts à la première passe** : la flèche du cyprès sortait du canevas
  par le haut (rabotée en silence), le liseré clair faisait le TOUR du houppier au lieu de son
  seul bord nord-ouest (l'arbre était détouré en vert vif), et le bouleau sortait **en beignet**
  — huit bouquets sur un anneau étroit ne couvrent pas le centre.

- **`tools/render-parc.mjs` — le parc, les deux rives du lac du sud, LE PONT et LE SENTIER DE
  L'EST, 31 contrôles, 31/31 (437, + le pont au 439, + le bois au 440).**
  ⚠️ **440 — son chapitre 6 mesure une FIN, et une fin est difficile à mesurer** : « le chemin
  s'arrête » est vrai de la mauvaise version comme de la bonne. Ce qui les sépare tient en trois
  grandeurs, et aucune n'est la longueur — il est CONTINU tant qu'il est à découvert (une coupure
  avant le bois, c'est le défaut de départ déplacé de cinquante cases), il devient LACUNAIRE avant
  de cesser (sinon c'est une coupe nette, donc le défaut lui-même), et il ne rétrécit JAMAIS à une
  case (le piège payé quatre fois au 437, qui frapperait ici au moment précis où l'on veut que le
  chemin se fasse oublier). Plus le bois : gradient de densité mesuré par tranche de profondeur
  (**lisière 10 % · taillis 40 % · futaie 62 %**) et lisière qui ondule AUTOUR de sa pente.
  Deux planches neuves : `sentier-est.png`, `sentier-bois.png`.
  ⚠️ **439 — il dessine quelqu'un DEBOUT SUR LE PONT**, et c'est tout l'intérêt de sa nouvelle
  planche (`pont-praticable.png`) : à l'échelle du parc, un pont traversé et un pont franchi font
  la même tache brune. Il faut voir le passant dépasser du garde-corps du fond et être coupé aux
  mollets par celui du devant — c'est ça, et rien d'autre, la preuve qu'on marche dessus. Il
  vérifie aussi que la flèche de l'arc atteint son sommet, retombe à zéro à ses deux têtes (sinon
  le raccord avec le chemin est une marche), ne monte aucune case hors tablier, et **ne touche pas
  `tw.elev`** — passée dans l'altitude de collision, elle aurait rendu les deux ponts
  infranchissables.
  ⚠️⚠️ **C'EST LA PREMIÈRE PLANCHE DU PROJET OÙ L'ON VOIT UN MORCEAU DE VILLE À PEU PRÈS
  COMME LE JOUEUR LE VOIT**, et c'est une réponse partielle à l'angle mort nommé en §10 de
  `CLAUDE.md`. Les six bancs du 434-436 peignent chacun SA surface et approximent le reste ;
  celui-ci assemble tout ce qui vit hors de la closure — herbe, revêtement (gravier compris),
  massifs fleuris, berge, eau, arbres — et ne refait que la mise en FILE des props.
  Ce qu'il mesure : la plus longue suite de colonnes dont la rive est à la même rangée (**24
  au premier jet, 4 aujourd'hui**, quai maçonné exclu — un ouvrage EST droit) ; le nombre de
  criques profondes et de replis, **ce dont une `shore(x)` est incapable par construction** ;
  l'écart-type de la largeur du haut-fond (**0,91 case** : à zéro, le lac est peint au
  pochoir) ; l'écart parc↔place ; la surface fleurie et le nombre d'espèces ; et surtout
  **qu'aucun des cinquante décors semés n'a les pieds dans l'eau ni ne bouche une allée**.
  ⚠️ **Il a trouvé trois défauts** : la promenade de l'étang en escalier d'une case, le
  sentier de rive qui épousait chaque encoche de crique, et un buisson enterré sous le parvis
  du kiosque — posé sur de l'herbe, dallé par une passe ultérieure, resté SOLIDE.

- **`tools/verify-vallee.mjs` — 194 contrôles, 194/194 (439-440 ; 182 au 438, 172 au 431, 113 au 427).** Il
  importe le VRAI moteur : circulation, murs invisibles ET décors traversables, géométrie des
  bâtiments, rebords sautables, le tribunal pièce par pièce, la coupe de bois, les familles,
  la garde-robe.
  ⚠️⚠️ **DEPUIS LE 431 IL JOUE DES VENTES ET COMPTE LES PIÈCES**, et c'est le seul endroit du
  projet où un banc touche à de l'ARGENT — demande explicite de Guillaume (« l'argent doit bien
  être récupéré »). Six contrôles rejouent une vente complète : l'or crédité, le stock retiré,
  le panier multi-lignes, la barquette de verger **qui ne doit pas être payée deux fois** (trois
  résolveurs créditent `shared.money` eux-mêmes, les autres non), et le refus depuis la ferme
  qui ne doit RIEN changer — ni l'or, ni le stock. Un refus qui retire quand même la
  marchandise serait le pire bogue possible, et il ne lèverait aucune erreur.
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
- **`tools/render-ruche.mjs`** (432) — **la ruche en trois quarts, l'établi de l'apiculteur
  DANS SES QUATRE ÉTATS et le pot de lavande** (nu / enfumoir / pots de miel / les deux), à leur place réelle et à
  l'échelle de dessin réelle, avec une fermière comme repère. ⚠️ Il existe parce que trois de
  ces quatre états ne s'obtiennent en jeu qu'en attendant le bon moment de la journée de
  René — c'est-à-dire jamais, à la relecture. ⚠️ **Il ÉCHOUE si le vol des abeilles ne passe
  jamais derrière la ruche** : la profondeur est dérivée du même angle que l'abscisse, et une
  régression qui les remettrait toutes devant ne lèverait aucune erreur. ⚠️ Il n'écrit AUCUN
  texte : le faux canvas ne connaît pas `fillText`, les cas sont repérés par un témoin de
  couleur.
- **`tools/render-echelle.mjs`** (429) — **chaque décor à côté d'une fermière**, sur la même
  ligne de sol, avec le rapport de hauteur comparé au repère physique attendu. C'est le seul
  banc qui puisse attraper une erreur d'ÉCHELLE. Il en a trouvé trois du premier coup ; il
  mesure les six métiers d'étal séparément depuis le 431 (ils partagent leur ossature, pas leur
  marchandise).
- **`tools/render-foire.mjs`** (431) — **la RANGÉE d'étals**, pas les étals un par un : avec ses
  guirlandes, ses clients devant, l'arche découpée en deux moitiés comme le fait le jeu, et les
  six métiers en gros plan. ⚠️ C'est le banc qui a montré que la balance du fromager se lisait
  comme une fenêtre, que ses meules jaunes disparaissaient dans la bâche jaune, et que la
  guirlande était mal placée **deux fois de suite**. Aucun des trois ne se voyait à la lecture.
- **`tools/render-tribunal.mjs`** — le mobilier, les décors de rue, les **bâtiments de la
  Haute-Ville** (sur du dallage, à côté de la gare : une cohérence se juge côte à côte) et **la
  garde-robe PORTÉE**. Il a montré la rangée d'étals monochrome (426), le haut-de-forme
  décapité et deux défauts de façade du salon (427).
  ⚠️⚠️ **ET IL MESURE LA SYMÉTRIE DES FAÇADES DEPUIS LE 431** : on replie l'image sur son axe
  et on compte l'écart colonne par colonne. C'est ce qui manquait pour attraper la colonnade du
  tribunal, décalée de six pixels **depuis le 425**. ⚠️ Il ne teste QUE les façades censées
  être symétriques : l'hôtel de ville est asymétrique exprès (beffroi décalé) et l'église porte
  son clocher sur le flanc — les y inscrire reviendrait à demander un jour qu'on les corrige.
- **`tools/verify-taxi.mjs` — 15 contrôles, 15/15 (relancé au 434).**
  ⚠️ **Il était écrit ici « 18 contrôles, 18/18 » : c'était FAUX.** Le fichier du 433 en compte
  quinze — vérifié en le relançant tel quel depuis git. Le chiffre avait été estimé, pas
  obtenu ; c'est exactement ce que la règle d'entrée en tête de ce fichier interdit, et ça
  s'est glissé dans le zip qui a écrit la règle.
  ⚠️⚠️ **ET SON CONTRÔLE D'AXE A CHANGÉ D'UNITÉ AU 434** — même famille de défaut de banc qu'au
  433. Il exigeait un écart absolu de moins de **0,22 case**, seuil qui n'a de sens que dans
  une ville faite de rues de deux cases (où 0,5 = « collé au trottoir »). L'artère élargie à
  quatre cases l'a fait échouer sur une conduite **meilleure** : mesuré par largeur de rue,
  **0,180 de demi-chaussée sur les rues de deux, 0,156 sur l'artère de quatre**. On mesure donc
  la fraction de demi-chaussée (0 = sur l'axe, 1 = roue sur la bordure) : **0,177** aujourd'hui,
  et l'écart en cases reste imprimé à côté. Ce n'est pas un seuil desserré, c'est une unité qui
  a un sens à toutes les largeurs.
  Il rejoue les
  **132 trajets** de la ville image par image avec la VRAIE conduite du moteur
  (`E.taxiStep`) : arrivée, chaussée, ralentissement en courbe, distance de
  freinage.
  ⚠️⚠️ **LE 433 LUI A AJOUTÉ LE CHAPITRE « LA FORME DU TRAJET », ET C'EST LUI QUI
  MANQUAIT.** Les douze contrôles du 432 disaient tous OK pendant que Guillaume
  voyait, en jouant, « une trajectoire stupide, il prend des virages plus que
  nécessaire » : ils mesuraient l'ARRIVÉE, la CHAUSSÉE et la VITESSE, jamais la
  FORME. On mesure donc trois quantités géométriques, obtenues en lançant ce banc
  contre les deux moteurs :

  | | 432 | 433 |
  |---|---|---|
  | aller-retour (dents de scie) | **598** | **0** |
  | rotation cumulée, moyenne | **969°** | **214°** |
  | rotation cumulée, pire | 2095° | 462° |
  | pire détour | ×1,11 | ×1,03 |

  ⚠️ Son Dijkstra de référence est écrit DANS le banc et pas dans le moteur : on
  ne mesure pas un trajet avec l'outil qui l'a produit.
- **`tools/render-taxi.mjs`** (432) — les cinq vues du véhicule sur une ligne de
  sol commune, plus leurs mesures.
  ⚠️⚠️ **DEPUIS LE 433 IL COMPARE DES PIXELS, PLUS SEULEMENT DES NOMBRES DÉCLARÉS**,
  et c'est ce qui manquait : les deux trois-quarts annonçaient `ground = 23` sur
  un dessin qui s'arrêtait cinq pixels plus haut — **à chaque virage, le taxi
  décollait de son ombre** — et la vue « nord-est » montrait une voiture roulant
  vers le **nord-ouest**. Deux invariants les attrapent : la dernière rangée
  peinte DOIT être `ground`, et le cap se lit dans le dessin (le bout le plus bas
  est le plus proche de la caméra, donc le plus au sud).
- **`tools/render-oiseaux.mjs`** (433) — **les pigeons et les colombes, dessinés
  ET rejoués**. Deux bancs en un, parce que les deux moitiés du défaut sont de
  natures différentes : neuf poses par espèce (dont quatre qui durent un
  vingtième de seconde en jeu, donc que personne ne regardera jamais ailleurs
  qu'ici), et **quatre minutes de vie de groupe à 60 images/s**.
  ⚠️⚠️ **SON SECOND CHAPITRE EXISTE PARCE QUE LE PREMIER MODÈLE PASSAIT TOUS LES
  AUTRES CONTRÔLES.** Les oiseaux arrivaient, se posaient, ne restaient pas en
  l'air — et Guillaume a quand même écrit « ils se comportent comme les animaux
  de la ferme ». Ce qui manquait n'était mesuré nulle part, et l'est maintenant :
  la VARIÉTÉ des activités (aucune au-dessus de 55 % du temps, au moins quatre
  différentes), l'IRRÉGULARITÉ de l'espacement (écart-type de la distance au plus
  proche voisin), le fait qu'ils ACCÉLÈRENT (nombre de paliers de vitesse
  distincts), et l'effet du **pain jeté depuis un banc** — il rassemble, il fait
  revenir les absents, il fait se chamailler, et **la mêlée est une ROSACE, pas
  une file indienne** (rapport des axes du nuage : ×1,13 ; une file donne 4).
  ⚠️ Ce dernier contrôle a été écrit APRÈS avoir vu le défaut en jouant : sur un
  point de pain unique, douze pigeons s'empilaient en chenille.
  ⚠️⚠️ **SA GRAINE EST FIXÉE DEPUIS LE 436, ET C'ÉTAIT UNE CORRECTION URGENTE.** Trouvé pendant
  l'audit graphique : il échouait **une fois sur huit** sur « la population se renouvelle —
  0 arrivées en 4 min », sans qu'un pixel du jeu ait changé. `flockStep` tire dans le
  `Math.random` global, et le contrôle demande un événement rare sur quatre minutes simulées.
  **Un banc qui échoue au hasard est pire qu'un banc absent** : il apprend à relancer jusqu'au
  vert, et le jour où il attrape un vrai défaut, on relance. Le banc remplace donc `Math.random`
  par un générateur semé le temps des deux chapitres de simulation — et **le remet en place
  après**, un stub global laissé en vie contaminant tout ce qui suit. Résultat : 3 arrivées, le
  même nombre à chaque lancement.
- **`tools/render-rues.mjs` — 28 contrôles, 28/28 (434).** Le revêtement des rues de Valley
  Town : les trois pavés de 4×4 tuiles assemblés sur six tuiles de côté, puis **quatre fenêtres
  de la VRAIE carte** (l'artère, un carrefour, le cimetière, le bord de l'esplanade) peintes
  par `A.drawTownRoadTile`, c'est-à-dire par la fonction que la boucle de rendu appelle.
  ⚠️⚠️ **IL A REFUSÉ QUATRE DÉFAUTS AVANT QUE GUILLAUME LES VOIE**, et aucun ne se lisait dans
  le code : le goudron était un aplat (écart-type **8,7** → **11,4** après granulat), les pavés
  du papier bulle, les briques un mur neuf, et le nez de bordure était haché tous les 8 px par
  le joint des pierres de taille.
  ⚠️ **La grandeur qui manquait partout est le BOUCLAGE** : un motif de 4×4 qui ne se raccorde
  pas à lui-même dessine une SECONDE grille, tous les 64 px — pire que la tuile unique qu'il
  remplace, et invisible tant qu'on regarde une tuile. Deux mesures, et la seconde décide :
  la couture ne doit pas être plus contrastée que la pire transition interne, **et les formes
  doivent traverser le bord** (40/64 rangées concordantes sur les pavés, 31/64 sur les
  briques ; sans `roadWrap`, ça tombe à zéro).
  ⚠️ **ET LE BANC S'EST TROMPÉ AVANT LE DESSIN** : sa première mesure de couture comparait à la
  MOYENNE des transitions et accusait à tort tout pavage correct (l'intérieur d'une pierre ne
  change pas d'une colonne à l'autre, un joint change beaucoup — la moyenne est tirée vers le
  bas). *Un banc de rendu se vérifie aussi.*
- **`tools/render-eau.mjs` — 16 contrôles, 16/16 (435 ; 14 à l'origine, 2 ajoutés au 436, chapitre 4 bis élargi aux deux axes au 440).** L'eau de Valley Town et sa berge :
  l'étang du parc dans son décor, **la même scène quatre minutes plus tard**, le lac du sud, et
  les **seize configurations de coins** à toutes les profondeurs, hors décor. Il appelle
  `A.drawTownWaterTile` / `A.drawTownShoreTile`, c'est-à-dire les fonctions du jeu.
  ⚠️⚠️ **LA GRANDEUR QUI MANQUAIT EST LA RECTITUDE DU RIVAGE**, et c'est Guillaume qui l'a
  nommée (« les rives sont trop géométriques »). On la mesure comme une côte : la plus longue
  suite de pixels du trait d'eau alignés sur une même ligne. **Ancien rendu : 16 px minimum par
  construction** (une case d'eau était un `fillRect` pleine case, donc le rivage ne POUVAIT pas
  descendre sous une case). Aujourd'hui : **8 px en X comme en Y**, et le seuil est à 16.
  ⚠️ Les trois autres grandeurs, toutes nouvelles : **la continuité** (zéro pixel sec cerné
  d'eau — une erreur d'ordre des bits dans la configuration des coins ouvrirait une fissure
  d'un pixel tout autour du plan d'eau, muette à la relecture et hurlante en jeu) ; **la
  profondeur** (L **160** au bord contre **54** au large, seuil à 25 d'écart — pas la moyenne,
  qui ne dit rien, §8) ; **le contraste** (écart-type **27,4** contre **8,3** pour l'ancienne
  eau, mesuré au 434).
  ⚠️⚠️ **ET LE BANC S'EST TROMPÉ DE GRANDEUR AVANT LE DESSIN, comme celui des rues.** Il
  accusait une rive droite de 21 px : il mesurait la RANGÉE DE SAPINS qui borde le parc, peinte
  en vert-bleu, que son détecteur d'eau (bleu dominant) comptait comme un rivage. Les mesures se
  font donc sur une scène nue — herbe, berge, eau — et la planche garde son décor, parce qu'une
  rive se JUGE dans son décor. *Un banc qui échoue peut se tromper de grandeur exactement comme
  un banc qui passe.*
  ⚠️⚠️ **AJOUT DU 436 — LE CHAPITRE « 4 bis », ET IL EST L'ILLUSTRATION LA PLUS PURE DU §14.6
  DE `CLAUDE.md`.** Les quatre chapitres du 435 disaient tous OK pendant que l'étang rendait une
  **mosaïque de carrés bleus de 16 px** : ils mesuraient la rectitude du RIVAGE, la continuité
  du TRAIT, l'écart bord/large et l'écart-type de la nappe — quatre grandeurs justes, aucune ne
  parlant de la grille INTÉRIEURE. C'est le même défaut que le banc corrigeait au rivage,
  déplacé de deux mètres vers le large. La grandeur qui manquait : **le saut de luminance à
  travers une arête de case, rapporté au saut moyen à l'intérieur d'une case** — si les cases se
  voient, le premier est plus grand. Mesuré en relançant le banc contre les deux moteurs :
  **×3,05 au 435, ×1,27 aujourd'hui.**
  ⚠️ Son cinquième chapitre n'est pas du dessin mais de la RÈGLE, et il a été écrit après avoir
  perdu un décor : en poussant les harmoniques du contour d'un cran, l'étang a mangé la case du
  massif taillé (122, 83). Le générateur refuse poliment de poser un décor dans l'eau — donc
  rien n'a levé, il y avait juste **trois massifs au lieu de quatre**. Il les compte.
- **`tools/render-escaliers.mjs` — 22 contrôles, 22/22 (436).** Les marches, le parement de
  falaise, le limon et le **dallage d'esplanade** de la Haute-Ville : les quatre matières
  assemblées sur six tuiles de côté **à côté des pavés de rue du 434**, puis les trois vraies
  volées de `generateTownWorld()` dans leur décor.
  ⚠️⚠️ **IL EXISTE PARCE QUE GUILLAUME A VU L'ÉCART QU'AUCUN BANC NE POUVAIT VOIR** : « il y a
  un écart flagrant de qualité de textures » entre le sol pavé et les escaliers du courthouse.
  Et la cause de l'écart n'était pas artistique, elle était structurelle : les revêtements du
  434 vivent dans `fermeArt`, donc `render-rues` les regarde à chaque lancement et ils ont reçu
  quatre refus avant livraison ; les marches, la falaise, le limon et le dallage vivaient dans
  la **closure de `drawTownFrame`**, donc aucun outil ne pouvait les rastériser. Ils sont restés
  au dessin du 425 pendant que tout le reste du sol de la ville passait au motif de 64 px.
  **Un dessin qu'aucun banc ne peut appeler est un dessin qui vieillit tout seul.**
  ⚠️ **LA GRANDEUR NEUVE EST LA PARITÉ DE MATIÈRE**, c'est-à-dire la phrase de Guillaume
  traduite en nombre : on mesure l'écart-type et le nombre de teintes de chaque matière **et
  des pavés de rue, dans la même passe**, et on exige un rapport ≥ 0,75. Un rapport, pas un
  seuil absolu — leçon du seuil d'axe du taxi (434). Mesuré aujourd'hui : marches **×0,91**,
  falaise **×0,90**, limon **×0,88**.
  ⚠️ **LE DALLAGE EN EST EXEMPTÉ, AVEC SA RAISON ÉCRITE** (comme `render-rues` exempte le
  goudron du contrôle de continuité) : une esplanade est faite de peu de grandes pierres, sa
  matière tient dans l'écart d'une dalle à l'autre. On le mesure donc **contre ce qu'il
  remplace** — écart-type **10,1 (425) → 32,4 (436)**, et **plus aucune période de 16 ni de
  32 px** (r = −0,04 et −0,29 à l'autocorrélation).
  ⚠️⚠️ **ET IL A TROUVÉ DEUX DÉFAUTS QUE PERSONNE NE CHERCHAIT :**
  - **22 marches sur 52 étaient dessinées PERPENDICULAIREMENT à leur volée** — sur les trois
    volées de la ville. Le sens de la montée se déduisait du gradient d'altitude lu sur les
    quatre voisines, terrain compris : ça marche au milieu d'une volée et ça bascule sur son
    bord, où la case du dessus est de la terrasse. Corrigé en ne regardant que les voisines qui
    sont elles-mêmes des MARCHES (en travers, une volée est de niveau par construction). Avec
    les quatre traits gris du 425 ça ne se voyait pas ; en pierre, c'est la première chose
    qu'on voit ;
  - **la période de la volée**, que le banc a d'abord mal mesurée deux fois (voir plus bas).
  ⚠️⚠️ **CE BANC S'EST TROMPÉ DE GRANDEUR TROIS FOIS AVANT QUE LE DESSIN SOIT EN CAUSE**, et
  c'est la troisième fois d'affilée (rues 434, eau 435). Ça vaut d'être su :
  1. compter les « nez de marche » sur UNE colonne → 29 nez pour 16 marches (le granulat fait
     sauter n'importe quelle colonne) ;
  2. les compter sur la moyenne par rangée → 32, soit exactement deux fois trop : une marche a
     DEUX montées de luminance (contremarche → dallage, puis ombre portée → nez). Il aurait
     fallu un seuil réglé pour n'en garder qu'un sur deux, c'est-à-dire un seuil réglé sur le
     résultat. On mesure donc la PÉRIODE par **autocorrélation** — aucun seuil de couleur, et
     on prend le **fondamental** et non le pic (un signal de période 4 corrèle aussi bien à 8) ;
  3. comparer le nombre de teintes du dallage neuf à celui du damier du 425 : **le damier en
     comptait 49 contre 24**, et il aurait donc « gagné ». Ses deux gris étaient recouverts de
     quatre voiles alpha, et chaque combinaison fabriquait une teinte de plus. **Compter les
     couleurs d'une image composée en alpha, c'est compter des accidents de mélange.**
- `verify-constants` · `verify-objects` · `verify-strings` · `verify-syntax` · `verify-gates` ·
  `verify-cycle` · `verify-orchards` · `verify-scope` · `verify-vergers` · `render-fruits`.

---

## `verify-pont.mjs` — le passant reste-t-il entre les deux garde-corps ? (441)

`node tools/verify-pont.mjs` — **12/12.**

⚠️⚠️ **IL EXISTE PARCE QUE DEUX CONTRÔLES JUSTES ÉTAIENT AU VERT PENDANT QUE LE PONT ÉTAIT
INTRAVERSABLE AU REGARD.** `verify-vallee` mesurait « le dos d'âne existe » (20 cases) et « il ne
touche pas la collision » (0 case polluée). Personne ne comparait **la clé de tri du passant à
celles des deux moitiés du pont** — et c'est là qu'était le défaut : sur la rangée nord des DEUX
ponts, le fermier disparaissait entièrement derrière le garde-corps du fond. La question utile
n'était pas « où est le bogue » mais, comme les six fois d'avant, *quelle grandeur ne mesure-t-on
pas*.

- **il APPELLE les trois clés, il ne les recopie pas.** Elles vivaient dans la closure de la
  boucle de rendu ; elles sont dans `fermeConstants.js` (`townDepthKey`, `townBridgeDepthKeys`,
  `townWalkerDepthKey`), le jeu les appelle, le banc les appelle. *Une formule réécrite ne diverge
  jamais d'elle-même* (§3 du 439) ;
- **il rejoue la faute pour en mesurer le coût** : 10 cases de tablier sur 20. Un banc qui passe
  au vert sans jamais avoir pu passer au rouge ne prouve rien ;
- **un garde-fou de SOURCE** interdit qu'une hauteur d'image (`archPxTown`, `TOWN_JUMP_ARC_PX`)
  reparte dans l'argument d'ALTITUDE de `pushE` — ce que les chapitres de données ne peuvent pas
  voir, puisqu'ils ne lisent pas la closure.
  ⚠️⚠️ **ET SA PREMIÈRE ÉCRITURE NE SCANNAIT RIEN.** `/pushE\(([^;]*)$/` est ancré sur la fin de
  ligne : il ne peut pas matcher une ligne qui se termine par `;`, c'est-à-dire la quasi-totalité
  des appels. Il annonçait « 0 appel fautif » après n'avoir lu que les appels coupés en deux
  lignes, et il est **passé au vert sur une faute injectée exprès**. D'où le compte d'appels VUS
  (26) : la seule façon de s'apercevoir qu'un scanner ne scanne pas.

---

## `render-eglise.mjs` — la nef et la tribune, en plan (441)

`node tools/render-eglise.mjs` → `eglise-nef.png` · `eglise-tribune.png`. **13/13.**

Écrit **avant le premier `fillRect`**, pas après : c'est le corollaire du §4.2 de `CLAUDE.md`.
Il APPELLE `drawChurchFlagTile` et `drawChurchGlass` (nées dans `fermeArt.js` pour cette raison),
donc il juge le jeu et pas sa maquette.

Il a trouvé, à l'exécution, ce qu'aucune lecture n'aurait trouvé : le chœur en parquet, une
couture d'usure à bord franc, la période des bancs, une poche murée et vide à l'étage, et — dès
la première exécution des variantes de bout — que **le miroir d'un `pewL` est un `pewR`**.

⚠️ **SON CONTRÔLE DE SYMÉTRIE A DÛ ÊTRE RÉÉCRIT.** Comparer toute la largeur échouait *à raison
de son point de vue et à tort sur le fond* : une église a UN clocher, UNE chaire, UN
confessionnal. Il compare donc le VAISSEAU entre les colonnades, **annonce** le périmètre exclu,
et vérifie séparément que les deux bas-côtés sont meublés — sinon « asymétrique » finirait par
vouloir dire « vide d'un côté ». *Restreindre un périmètre sans le dire, c'est le défaut du 439.*

⚠️ **CE QU'IL NE MESURE PAS, ET IL LE DIT :** il ne joue pas (l'orgue, les cierges et l'assise
passent par la touche E), et **il ne dessine pas la vue plongeante** — elle est peinte dans la
closure du rendu, la redessiner serait juger sa propre maquette. Le contrôle 4 mesure donc ce qui
est mesurable (le vide existe, aucun mur ne le bouche), et la planche montre un plancher nu.
**C'est en jouant, et là seulement, qu'on voit si la tribune donne sur quelque chose** — elle n'y
donnait pas, d'une rangée.

---

## `verify-enquete.mjs` — la chaîne de l'enquête tient-elle debout ? (442)

`node tools/verify-enquete.mjs` — **91 contrôles.**

⚠️⚠️ **IL EXISTE PARCE QUE LES DÉFAUTS D'UN CHANTIER NARRATIF NE SONT PAS DES
DÉFAUTS DE DESSIN NI DE NAVIGATION.** Ce sont des défauts de CHAÎNE — un indice
qu'aucun chapitre ne réclame, une déduction fausse sur le terrain, une porte à
deux joueurs infranchissable seul, un texte anglais qui manque. Aucun ne lève
d'erreur, aucun ne se voit sur une planche, et **tous se voient à la vingtième
minute d'une soirée, une fois le joueur engagé**. Six grandeurs, six chapitres :

1. **la table se referme sur elle-même** — aucun indice orphelin, aucune
   dépendance circulaire entre prérequis, et ⚠️ **la parité FR/EN PROFONDE** :
   tout le chantier vit sous UNE clé (`enq`), donc `verify-strings` en compte une
   de chaque côté et s'arrête là. 157 entrées appariées ici, **et le compte des
   entrées LUES est imprimé** — la seule façon de s'apercevoir qu'un contrôle ne
   contrôle rien (leçon du garde-fou de `verify-pont`, 441) ;
2. ⚠️⚠️ **elle se boucle DANS LE DÉSORDRE** — 400 permutations des vingt-et-un
   indices, toutes menées à terme, **et l'or total ne dépend pas de l'ordre**.
   C'est le contrôle qui compte : deux joueurs qui se répartissent la carte ne
   trouvent RIEN dans l'ordre écrit. Il vérifie aussi qu'une découverte répétée
   ne paie pas, qu'on ne dépose qu'une fois, et qu'une sauvegarde abîmée se
   recharge sans planter ni tricher ;
3. ⚠️⚠️ **la déduction du code A est vraie SUR LA CARTE.** Le joueur raisonne
   « le verger est à 25, la promenade à 27, la promenade est la dernière du plan,
   or il y a une borne plus à l'est » : c'est faux si les trois pierres ne sont
   pas dans cet ordre, et le générateur est parfaitement content de les poser
   autrement. **Il a attrapé l'énigme fausse à l'écriture** — le premier jet
   annonçait le verger comme dernière parcelle alors qu'il est tout à l'ouest.
   Plus l'aller-retour du chiffre de Chaband **et l'absence de fuite** : aucun mot
   de plus de cinq lettres du texte clair ne survit dans le texte chiffré (43
   mots testés) — un Vigenère mal branché rendrait la page en clair sans que
   personne ne s'en aperçoive ;
4. **la géographie** : les quatorze meubles sont dans les pièces que la table leur
   donne (via `E.courtRoomAt`), les deux commandes de verrou sont à **deux niveaux
   différents**, la borne de la ferme est sur une case libre, praticable, à
   l'écart de la boutique, du bac, du panneau de gare et du seuil ;
5. ⚠️⚠️ **LA PORTE À DEUX SE FRANCHIT SEUL, ET ON LA MESURE.** Parcours en
   largeur sur la vraie grille du tribunal, avec la vraie collision
   (`E.courtBoxFree`, sortie de la closure du rendu POUR CE BANC) et les cages
   d'escalier comme arêtes : **68 cases, 10,5 s en courant pour une fenêtre de
   22 s**, plancher à un tiers de la fenêtre pour qu'elle demande encore quelque
   chose. Une fenêtre réglée à l'œil ici, c'est le seuil d'axe du taxi du 434 —
   défendable et faux dès que la géométrie bouge. ⚠️ Il DIT ce qu'il approxime :
   une distance n'est pas un trajet joué, d'où la marge humaine de 3 s, écrite ;
6. **le marché** : ⚠️ **sans enquête, la cote est BIT À BIT celle du 430** (5 000
   couples jour × famille contre une réimplémentation de la formule d'origine
   écrite DANS le banc — *on ne mesure pas un trajet avec l'outil qui l'a
   produit*), les deux issues restent déterministes, et elles ne donnent pas le
   même marché.
   ⚠️ **CE DERNIER CONTRÔLE A MESURÉ LA MAUVAISE GRANDEUR D'ABORD** : il comptait
   les cotes IDENTIQUES et échouait à 10,8 % pour un seuil de 10 % choisi à l'œil.
   Deux distributions linéaires tirées du même hachage se CROISENT forcément ; ce
   qu'on veut savoir est si le joueur sent la différence, et ça se mesure en écart
   moyen (**13,7 points**). *Vérifier le repère avant de corriger le dessin* (429).

⚠️ **CE QU'IL NE MESURE PAS, ET IL LE DIT** : il ne joue pas. Les panneaux,
l'ordre des invites, le carnet et la lisibilité des documents ne se voient qu'en
jouant — et il ne dit rien de la QUALITÉ des textes, seulement qu'aucun ne manque.

---

## `render-enquete.mjs` — les onze dessins de l'enquête (442)

`node tools/render-enquete.mjs` → `enquete-meubles.png` · `enquete-dehors.png`.
**36 contrôles.**

Écrit **avant le premier `fillRect`**, comme `render-eglise` au 441 : onze dessins
neufs sans banc, c'est onze dessins qui auront douze zips de retard le jour où
quelqu'un les regardera (436).

**Il a trouvé quatre choses à sa première exécution**, dont deux que la lecture ne
pouvait pas voir : les bornes de section étaient à hauteur de **poitrine** (×0,83
d'un fermier pour un repère à ×0,61 — on enjambe une borne, on ne la contourne
pas), la mousse était **du poivre** (des pixels isolés dans un aplat, la grandeur
du 438), et **deux dessins étaient rognés par le haut** — les tringles de verrou
de l'armoire et la corniche du fichier, c'est-à-dire le piège n°1 des sprites,
payé trois fois au seul zip 433.

⚠️⚠️ **ET IL S'EST TROMPÉ DE GRANDEUR AVANT LE DESSIN, POUR LA SEPTIÈME FOIS
D'AFFILÉE DANS CE DÉPÔT** (rues 434, eau 435, escaliers 436, mairie 439, parc 440,
pont 441). Il interdisait tout pixel sur les QUATRE bords et refusait **cinq
dessins sur douze, tous corrects** : le mobilier d'intérieur fait seize de large
PAR CONVENTION depuis le 426, et les deux moitiés de l'armoire scellée DOIVENT se
toucher sous peine de fendre le meuble. Ce qui est réellement dangereux est le
HAUT — un sprite est ancré par le bas et grandit vers le haut. Le contrôle mesure
donc le haut pour les meubles, les trois côtés pour les décors de plein air (qui
sont cernés, cf. `padOutline`), **et l'INVERSE pour l'armoire** : ses deux moitiés
doivent se rejoindre.

Il mesure aussi : la propreté (0 % de points perdus partout, seuil du 438 à 1 %),
l'échelle contre un personnage de 23 px, ⚠️ **que la borne martelée SE VOIT**
(20 % de pixels différents de l'intacte, à silhouette identique — c'est sur elle
que repose la déduction du code A, et deux dessins qui ne diffèrent que dans les
données seraient une énigme invisible), que les deux moitiés de l'armoire ont
**exactement les mêmes rangées peintes** (le taxi a payé la divergence au 436) et
que leurs entrées de serrure sont de part et d'autre, et enfin qu'**Ombeline a
l'anatomie de Léonie sans être Léonie recolorée** (même gabarit, même ligne
d'épaules, 12 % de pixels communs).

---

## Jouer à deux en local

**`tools/fake-supabase.mjs`** (432) — REST bidon **+ relais Realtime**, donc deux onglets =
deux joueurs, sans compte et sans consommer un message du quota. `LAT=90 JIT=60` simule une
vraie liaison ; il imprime le débit réel PAR TYPE de message toutes les 5 s.
⚠️ **C'est lui qui a trouvé les trois défauts multijoueur du 432**, dont un qui rendait Valley
Town injouable à deux depuis un zip entier. La recette complète (`.env.local`, page jetable,
onglet d'arrière-plan) est en §10 de `CLAUDE.md`, avec ses trois pièges.
