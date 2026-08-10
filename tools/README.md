# tools/ — LES BANCS, ET CE QU'ILS ATTRAPENT

Ce fichier est **l'autorité** sur les bancs du projet. Il a été extrait de `CLAUDE.md` §10 au
zip 432, sur l'ordre laissé par son §14.2 : « le jour où la liste dépasse la moitié du
chapitre, elle part dans un `tools/README.md` — en ne gardant là-bas QUE ce qui n'existe pas ».
Le 432 a ajouté deux entrées (`render-ruche.mjs`, `fake-supabase.mjs`) et l'a fait basculer.
Le 433 en ajoute trois (`verify-taxi`, `render-taxi`, `render-oiseaux`), le 434 une
(`render-rues`).

⚠️ **`CLAUDE.md` ne garde que la liste des bancs ABSENTS**, et c'est délibéré : c'est elle qui
protège du banc imaginaire (§14.6 — le 425 décrivait `verify-vallee.mjs` « 74 contrôles, 74/74 »
alors que le fichier n'existait pas). Une liste de ce qui existe se vérifie en lançant ; une
liste de ce qui n'existe pas ne se vérifie jamais tant qu'on ne l'écrit pas quelque part.

⚠️ **RÈGLE D'ENTRÉE : tout chiffre écrit ici a été obtenu en LANÇANT le banc.** Jamais estimé,
jamais recopié d'un zip précédent sans relance.

---

## Ce qui existe

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
