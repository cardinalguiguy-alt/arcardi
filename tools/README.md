# tools/ — LES BANCS, ET CE QU'ILS ATTRAPENT

Ce fichier est **l'autorité** sur les bancs du projet. Il a été extrait de `CLAUDE.md` §10 au
zip 432, sur l'ordre laissé par son §14.2 : « le jour où la liste dépasse la moitié du
chapitre, elle part dans un `tools/README.md` — en ne gardant là-bas QUE ce qui n'existe pas ».
Le 432 a ajouté deux entrées (`render-ruche.mjs`, `fake-supabase.mjs`) et l'a fait basculer.
Le 433 en ajoute trois (`verify-taxi`, `render-taxi`, `render-oiseaux`), le 434 une
(`render-rues`), le 435 une (`render-eau`), le 436 une (`render-escaliers`).

⚠️ **`CLAUDE.md` ne garde que la liste des bancs ABSENTS**, et c'est délibéré : c'est elle qui
protège du banc imaginaire (§14.6 — le 425 décrivait `verify-vallee.mjs` « 74 contrôles, 74/74 »
alors que le fichier n'existait pas). Une liste de ce qui existe se vérifie en lançant ; une
liste de ce qui n'existe pas ne se vérifie jamais tant qu'on ne l'écrit pas quelque part.

⚠️ **RÈGLE D'ENTRÉE : tout chiffre écrit ici a été obtenu en LANÇANT le banc.** Jamais estimé,
jamais recopié d'un zip précédent sans relance.

---

## Ce qui existe

- **`tools/render-mairie.mjs` — l'intérieur de l'hôtel de ville, 9 contrôles (438).** Un intérieur
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

- **`tools/render-parc.mjs` — le parc et les deux rives du lac du sud, 15 contrôles (437).**
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

- **`tools/verify-vallee.mjs` — 172 contrôles, 172/172 (431 ; 137 au 430, 113 au 427).** Il
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
- **`tools/render-eau.mjs` — 16 contrôles, 16/16 (435 ; 14 à l'origine, 2 ajoutés au 436).** L'eau de Valley Town et sa berge :
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

## Jouer à deux en local

**`tools/fake-supabase.mjs`** (432) — REST bidon **+ relais Realtime**, donc deux onglets =
deux joueurs, sans compte et sans consommer un message du quota. `LAT=90 JIT=60` simule une
vraie liaison ; il imprime le débit réel PAR TYPE de message toutes les 5 s.
⚠️ **C'est lui qui a trouvé les trois défauts multijoueur du 432**, dont un qui rendait Valley
Town injouable à deux depuis un zip entier. La recette complète (`.env.local`, page jetable,
onglet d'arrière-plan) est en §10 de `CLAUDE.md`, avec ses trois pièges.
