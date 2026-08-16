# DESSIN — ce qui est vrai de TOUT dessin du projet

⚠️⚠️ **CE FICHIER A ÉTÉ SORTI DU §4 DE `CLAUDE.md` AU 441, SUR L'ORDRE LAISSÉ PAR LE §14.2 DU
440 — reporté deux fois, et « un ordre reporté deux fois cesse d'être un ordre ».** Le §4 avait
passé les cent-cinquante lignes en mélangeant trois sujets sans rapport (le dessin,
l'architecture du générateur, les pièges de JavaScript) ; il ne garde plus que les deux derniers.
C'est le même geste qu'au 428 (§6 → `components/ferme/README.md`) et au 432
(§10 → `tools/README.md`) : **une règle vit à côté de ce qu'elle décrit.**

⚠️ **RIEN N'A ÉTÉ RECOPIÉ, TOUT A ÉTÉ DÉPLACÉ**, et chaque ligne a été relue contre le dépôt
avant de bouger — c'est là qu'on trouve les périmées (le 431 l'a fait pour le §4, sa première
ligne relue ne correspondait à aucun symbole du dépôt). Ce qui est resté en §4 y est resté
exprès : la CASE contre la SURFACE COUVERTE est une règle du GÉNÉRATEUR, pas du dessin.

**Autorité :** ce fichier pour les principes ; `components/ferme/fermeArt.js` pour les dessins
eux-mêmes ; `tools/README.md` pour les bancs qui les regardent.

---

## Les règles, et chacune a été payée
- ⚠️⚠️⚠️ **ON NE TEXTURE PAS UNE SILHOUETTE, ON ASSEMBLE DES FORMES** (438). Dessiner un contour
  puis le remplir de tirages donne du BRUIT à toutes les échelles ; dessiner dix masses pleines,
  cernées, chacune avec son arc d'ombre, donne une MATIÈRE — et la silhouette sort toute seule,
  festonnée. **Aucun pixel tiré au hasard nulle part.** Corollaire mesuré au 439 : *ce qui fait la
  matière n'est pas le contraste, c'est la forme* — six tons de parquet bien séparés donnent un
  velours côtelé, six tons resserrés donnent du bois.
  ⚠️ Le contrôle de propreté qui va avec a dû être écrit **quatre fois** : la bonne grandeur est
  **l'îlot qui flotte dans un APLAT**, en connexité à **huit** voisins (à quatre, un cerne d'un
  pixel en diagonale n'est plus connexe et le banc accuse le contour lui-même). « Le pixel isolé »
  interdit le pixel art ; « les îlots de moins de quatre pixels » accuse les dégradés.
- ⚠️⚠️ **UNE COURBE ÉCRITE `f(x)` NE PEUT PAS SE REPLIER** (437) — pas de crique, pas de
  presqu'île, pas d'îlot, pas d'ovale. Une rive, un contour, une côte, une table de conseil se
  décrivent par un **CHAMP `s(x,y)` dont on prend l'isoligne**, jamais par une hauteur par colonne
  ni par des angles coupés à la main.
- ⚠️⚠️ **LA PÉRIODE D'UN MOTIF COMPTE PLUS QUE SES DÉTAILS** (434, 439). Une tuile de 16 px se
  répète tous les 16 px : l'œil voit la grille avant le dessin, **quelle que soit sa finesse**. On
  dessine un pavé de 4×4 tuiles d'un seul tenant, il doit **boucler sur lui-même**, et ce qui a une
  longueur propre (une lame de parquet) prend une longueur **première avec la case**.
- ⚠️⚠️ **UNE ALLÉE D'UNE CASE DE LARGE NE MONTRE QUE SES MARCHES** — payé quatre fois dans le seul
  437. **La parade n'est JAMAIS de lisser le tracé** (ce serait revenir à la ligne droite qu'on
  corrige) : on l'ÉPAISSIT, ou on l'ÉCARTE de tout l'accident d'un coup, ou on décale la phase.
- ⚠️⚠️ **LE NATUREL NE S'OBTIENT PAS EN METTANT DU DÉSORDRE PARTOUT** (437). Un ouvrage EST droit,
  c'est ce qui le fait lire comme un ouvrage : **on oppose une ligne construite à une ligne qui ne
  l'est pas**. Tordre les deux donne deux lignes molles.
- ⚠️⚠️ **UNE POSITION RÉGLÉE À LA MAIN EST UNE POSITION QUI PENCHERA** (433, 439). Un défaut de
  symétrie ne se voit pas en regardant l'élément fautif — la rangée est impeccable, c'est son
  RAPPORT À L'AXE qui est faux. Toute position se DÉDUIT d'un centre. Payé au 439 encore : une
  maquette posée deux fois de part et d'autre de l'axe sur lequel un commentaire la jurait centrée.
- ⚠️⚠️ **ENRICHIR UNE TEXTURE REND VISIBLES LES ERREURS DE GÉOMÉTRIE QU'ELLE CACHAIT** (436) : 22
  des 52 cases d'escalier de la ville étaient dessinées perpendiculairement à leur volée depuis le
  425. **S'attendre à en trouver après chaque montée en qualité, et avoir un banc pour les voir.**
- ⚠️⚠️ **DEUX SUITES À FAIBLE DISCRÉPANCE NE FONT PAS UNE RÉPARTITION DANS LE PLAN** (438) : deux
  suites d'or dont le rapport est presque rationnel **alignent les points sur des droites**. On
  emploie une suite faite pour le plan (R2). Même famille que la distance de Manhattan prise pour
  l'euclidienne au 435 : *une bonne propriété en dimension 1 ne se transporte pas gratuitement en
  dimension 2.*
- ⚠️ **MEUBLER LE LONG D'UN MUR FABRIQUE DES CULS-DE-SAC D'UNE CASE** (439, trois fois dans le
  même zip). Aucun ne se voit sur une planche, aucun ne se voit en jouant sans y tomber : seul un
  contrôle de connexité les trouve. Meubler à une case du mur laisse toujours un passage derrière.
- ⚠️⚠️ **UN CERNE SERT AUSSI CONTRE UN FOND CLAIR** (441). Un cierge de cire blanche posé sur le
  marbre pâle d'un chœur disparaît : les deux chandeliers de l'église, rigoureusement symétriques
  dans les données, n'en avaient l'air que d'un côté — selon la dalle qui passait derrière. Ce
  qui manquait n'était pas du CONTRASTE, c'était un CERNE. La règle du 438 (« on assemble des
  masses cernées ») n'est pas une règle de fond sombre, c'est une règle tout court.
- ⚠️⚠️ **UN SPRITE HAUT CONTRE LE MUR DU FOND AVALE CE QUI PASSE DEVANT** (441). Dans une vue de
  dessus, le mur SUD est le plus PRÈS du spectateur : un buffet d'orgue de cinq cases de haut
  posé là a une clé de tri plus grande que tout ce qui est au nord de lui, donc il se dessine en
  dernier, donc il recouvre l'organiste assis devant. **La parade n'est pas de rabaisser le
  sprite** (il redevient un harmonium, et on perd ce pour quoi on l'avait fait haut) : ce qui est
  aussi haut qu'un mur EST un mur, et on le dessine dans la passe des MURS. *On ne règle pas un
  tri, on change de passe.*
- ⚠️⚠️ **UN OUVRAGE CONTINU NE PORTE PAS UNE OMBRE PAR CASE** (441). L'ombre portée d'un meuble
  isolé est juste ; répétée sous les huit cases d'un banc de nef ou les vingt d'un garde-corps,
  elle donne une file de taches grises sous une masse continue. Ce qui se répète porte son ombre
  DANS son dessin, en trait — c'est la seule façon qu'elle suive la forme.
- ⚠️⚠️ **UNE USURE A UN BORD FLOU, PAR DÉFINITION** (441). Un dallage éclairci « dans les deux
  travées qui bordent l'allée » dessine deux bandes à bords francs en travers du sol : l'œil y lit
  une couture, pas un passage — et cette couture redessine exactement la grille de 16 px que la
  dalle de deux cases venait d'effacer. Ce qui varie avec la distance se calcule AVEC la distance,
  pas avec un test.
- ⚠️⚠️⚠️ **CE QUI CREUSE UNE IMAGE VUE DE DESSUS EST L'ÉCLAIRAGE D'UNE PENTE, PAS UN DÉGRADÉ**
  (446, le cratère refait sur modèle). Le premier cratère (444) était six anneaux concentriques
  du sombre au clair : lisible, et **plat** — Guillaume l'a dit en une phrase. Un dégradé du
  centre vers le bord dessine une CIBLE ; ce qui dessine un TROU, c'est qu'une paroi soit dans
  l'ombre et l'autre au soleil. La recette tient en quatre lignes et elle se réemploie pour toute
  cuvette, tout monticule, tout bourrelet : on décrit une **hauteur le long du rayon** (le trou
  descend, le bourrelet remonte, l'éjecta retombe), on en prend la **pente**, et
  `1 − k · pente · cos(angle − lumière)` donne d'un seul coup les quatre lectures — paroi proche
  sombre, paroi opposée claire, dos du bourrelet clair du côté de la lumière, sombre de l'autre.
  ⚠️ **Et la lumière n'est pas un choix libre : tout le projet éclaire en HAUT À GAUCHE** (le
  four, les moellons, les toits). Un relief éclairé de l'autre côté a l'air découpé et collé.
  ⚠️ **La valeur se QUANTIFIE en paliers** (une douzaine) : dans un monde en gros pixels, un
  dégradé continu fait une tache lisse, les paliers font des courbes de niveau.
- ⚠️⚠️ **UNE GERBE SE DÉCRIT PAR SES FIBRES, ET LEURS LONGUEURS DOIVENT AVOIR UNE QUEUE LOURDE**
  (446). Deux jets ratés avant le bon, et les deux sont instructifs : *(a)* un lobe `sin(πs)` par
  secteur donne un PÉTALE par fibre, donc une **collerette de tournesol** — d'autant plus visible
  qu'on réduit le nombre de fibres ; *(b)* des longueurs tirées uniformément donnent la même
  collerette en plus fin. La forme juste vient de deux choses : une **ligne brisée interpolée**
  entre fibres voisines (deux voisines très inégales font une dent, deux proches n'en font
  aucune), et une distribution **`pow(rnd, 1.5)`** — la plupart courtes, quelques-unes très
  longues. *L'irrégularité doit venir des LONGUEURS, jamais d'une formule de forme qui décore.*
- ⚠️⚠️ **UN TRAMAGE SERT UNE POINTE, JAMAIS UNE SURFACE** (446). Écrit `keep *= 0,82 + 0,18·bruit`,
  il s'appliquait à tout le cratère : de loin ça fait flou, de près ça fait sale, et le dessin
  entier ressemble à de la fourrure. Une pointe d'éjecta s'effiloche ; une paroi, non. ⚠️ Et le
  tramage se fait en **trame de Bayer sur des pixels OPAQUES**, pas en alpha : une pointe
  semi-transparente sur de l'herbe donne un brun verdâtre translucide — du brouillard, pas de la
  terre.
- ⚠️⚠️ **CE QUI SORT D'UNE MASSE DOIT EN PRENDRE LA COULEUR DE SORTIE** (446). Les fibres du
  cratère, peintes du même tan que la lèvre soulevée, faisaient un **halo poilu** autour du trou.
  Dans le modèle, le tan est l'anneau SOULEVÉ et ce qui en sort va au brun sombre — la même
  couleur que les fissures qui les prolongent. La couleur relie les deux, et l'œil lit **une seule
  chose qui part du trou** au lieu de deux décors superposés.
- ⚠️ **UNE BRAISE EST UN TIRET COUCHÉ SUR LA STRIE, ET IL Y EN A PEU** (446). Des points, ou des
  points étalés sur toute la cuvette, font des confettis oranges — c'est le « poivre » du 438,
  repayé. Le foyer se groupe dans la moitié intérieure, et chaque braise suit la fibre sur
  laquelle elle brûle.
- ⚠️ **UN DÉCOR QUI DOIT SE FONDRE DANS UN SOL PEUT ÊTRE CUIT QUAND MÊME** (446). Le 444 refusait
  de cuire le cratère « parce qu'il faudrait y peindre l'herbe » — c'était faux : on cuit dans un
  canevas TRANSPARENT, le sol reste dessous, la saison, la nuit et la météo continuent d'être
  héritées gratuitement, et on gagne le droit de peindre pixel par pixel. Ce qu'il ne faut pas
  cuire, c'est le FOND, jamais la forme.
