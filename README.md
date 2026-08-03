# ARCARDI 🎪

> **ZIP 408 — NUIT D'ENCRE, RELIEF REMONTÉ, NUAGES RETIRÉS.**
> Guillaume : « la palette de ciel et montagnes est encore trop lumineuse
> (surtout à cause de la réduction de la taille des montagnes opérée quelques
> zips auparavant…), cela rend le jeu moins effrayant. »
>
> **Sa cause est la bonne, et j'en avais ajouté une seconde au 406 sans la
> voir.** Tant que les montagnes montaient hors cadre, elles MASQUAIENT le
> ciel : la palette pouvait être ce qu'elle voulait, on ne la voyait pas. En
> les rentrant dans le cadre (406) on a exposé 40 % de ciel qui n'avait jamais
> été jugé. Et en redistribuant le dégradé de fond — `mid` à 42 % au lieu de
> 86 % — j'avais fait glisser toute la lanière visible vers `horizon`, la
> teinte la plus chaude de la palette. **Deux causes, et la seconde est de
> moi.**
>
> | | avant | après |
> |---|---|---|
> | zénith / corps / horizon | 0x0e0818 · 0x1a1029 · 0x2b1526 | **0x070410 · 0x0d0817 · 0x150a14** |
> | rougeoiement bas | 0,42 → 0,62 d'alpha sur 34 px | **0,12 → 0,18 sur 20 px** |
> | répartition du dégradé | `mid` à 42 % | **76 %** |
> | chaîne lointaine | 20-38 px | **28-50 px** |
> | chaîne proche | 16-34 px | **22-44 px**, et **0x030207** (elle était 0x0c0a15) |
> | nuages | 26 | **0** |
>
> **Et il a fallu une seconde passe, trouvée en regardant.** Une fois le ciel
> noirci, la chaîne LOINTAINE — inchangée depuis le 379 — composait plus CLAIR
> que le fond : des triangles **pâles** sur du noir, c'est-à-dire très
> exactement le mot que Guillaume employait aux 383, 400 et 405, retrouvé par
> l'autre bout. **Une teinte n'est jamais claire ou sombre en soi : elle l'est
> par rapport à ce qu'il y a derrière.** En noircissant un ciel, il faut
> noircir ce qui s'y découpe.
>
> Les nuages sont éteints par un compte (`SKY_CLOUD_COUNT: 0`) et non
> supprimés : **la boucle tourne encore à vide**, parce que ses tirages
> appartiennent au flux aléatoire partagé du ciel et qu'en retirer un
> décalerait les montagnes. C'est la règle du 381, appliquée à l'envers.

> **ZIP 407 — LA PLUIE, REFAITE EN ENTIER SUR QUATRE REPROCHES.**
> Guillaume, après le 406 : « la pluie n'est pas satisfaisante. la réduire en
> intensité — et elle ne disparaît pas comme convenu ?? on a dit disparition
> progressive à partir de 3000 m. et son étendue ne couvre pas tout l'écran ;
> et le sens du vent que son orientation oblique évoque est incohérent, car
> lorsqu'on tourne, les gouttes tombent toujours direction NO-SE. »
>
> **Quatre reproches, quatre causes, et trois d'entre elles sont des nombres
> posés à la main là où il fallait un calcul.**
>
> | ce qu'il a vu | la cause | après |
> |---|---|---|
> | trop intense | 0,55 d'opacité en additif sur trois nappes superposées | **0,18 — un crachin.** Mais **32 u/s de chute** au lieu d'un coefficient de défilement sans unité : une goutte pâle et LENTE se lit comme du bruit d'image, une goutte pâle et RAPIDE se lit comme de la pluie |
> | « elle ne disparaît pas à 3 000 » | la décrue commençait à **3 500** — sa demande d'origine disait 3 000 | pleine de 2 200 à **3 000**, éteinte à **5 000** |
> | « son étendue ne couvre pas tout l'écran » | les nappes étaient posées à `camera.y + 1,6`, hauteur au jugé, avec des tailles au jugé. **Il manquait 6,3° de pluie en bas pour la nappe proche, 12,4° pour la médiane, 14,9° pour la lointaine** — tout le quart bas de l'image, celui où se trouve la chaussée | tailles et hauteur **DÉDUITES du tronc de vue** : 2,0° de marge en bas, 3,1° sur les côtés |
> | « le vent tourne avec moi » | l'obliquité était peinte dans la TEXTURE et la nappe faisait face à la caméra : l'inclinaison était donc fixe à l'ÉCRAN | traînées verticales, plus de dérive latérale, et la nappe ne pivote plus qu'en **lacet** — elle basculait aussi en tangage, ce qui faisait tomber les gouttes 17,3° de travers |
>
> **Sa réponse était encore hors options, et encore meilleure.** Aux trois
> intensités proposées il a répondu « **un crachin, mais la vitesse de chute
> doit être bien plus rapide** ». Ce n'est pas l'opacité qui dit « il pleut »,
> c'est la vitesse — et aucune des trois options ne le voyait.
>
> **`verify-ambiance.mjs` passe de 19 à 31 contrôles, dont 12 échouaient sur le
> 406.** Il refait la projection de la caméra pour vérifier que chaque nappe
> couvre le cadre, y compris le bas.

> **ZIP 406 — LE CIEL TIENT ENFIN DANS LE CADRE, ET LA PLUIE TOMBE DANS LE BON SENS.**
> Quatre chantiers sur le défi de fuite, et **le premier durait depuis trois zips
> parce qu'on cherchait au mauvais endroit.**
>
> | ce qu'il a vu | la cause | après |
> |---|---|---|
> | « les triangles lumineux ne sont pas beaux » | pas la couleur (383), pas l'ordre de peinture (400) : **la TAILLE**. Les montagnes montaient à 132 px quand le joueur n'en voit que 64 — leurs sommets étaient hors cadre et il ne restait à l'écran que les V entre les versants | des montagnes ENTIÈRES, 4 à 5 par écran, 37 % de ciel libre au-dessus |
> | *(même reproche)* | une seule montagne pouvait faire 300 px de large pour 297 px de champ visible : **un versant plein écran** | largeurs divisées par deux |
> | « une luminosité évoquée par dégradé » | la bande chaude était un APLAT, et un aplat a un bord, et un bord dessine une forme | un dégradé qui part de zéro d'opacité : plus de bord, donc plus rien à dessiner |
> | « les rambardes… trop plates, pas d'aspérités » | une SEULE boîte par intervalle, texture de 32 px | des pierres qui dépassent, un couronnement dentelé, une texture de 64 px à trois assises |
> | « la pluie tombe à l'envers » | un signe de trop sur `offset.y` | elle tombe — et elle s'éteint de 3 500 à 6 000 m |
> | « les bras s'articulent à l'envers » | **le piège du 396 n'avait jamais été appliqué ici** : les trois coudes étaient négatifs, comme des genoux | coude positif, genou négatif, contrôlés sur toute la foulée |
>
> **Deux outils étaient morts, et c'est la découverte du zip.**
> `preview-sky.js` — celui-là même qui avait trouvé le triangle orange au 400 —
> **jetait depuis le zip 400** : la pluie ajoutée ce jour-là clone sa texture, et
> son faux Three.js n'avait pas `clone()`. L'outil qui voit les défauts du ciel
> est mort le jour où il a servi, et personne ne l'a relancé pendant cinq zips.
> Et une fois réparé, il **mentait sur les largeurs** : il découpait la lanière
> visible en hauteur mais étalait les 1024 colonnes de la texture sur toute la
> planche, soit un écrasement de sept fois. La leçon du 400 — « une planche à
> plat peut mentir sur un cadrage » — s'appliquait à l'outil qui l'avait énoncée.
>
> **Deux outils neufs :** `verify-ambiance.mjs` (19 contrôles, **15 échouaient
> sur le 405**) et `verify-pose.mjs` (8 contrôles, **5 échouaient**).
>
> **Le budget d'objets a refusé la première rambarde** — 255 pour un plafond de
> 200 — et il avait raison : c'est la section où la partie commence. On n'a pas
> relâché le plafond, on a payé : un bloc de rambarde neuve en couvre désormais
> deux, ce qui est invisible à l'écran puisqu'elle est continue, et les volumes
> ainsi libérés financent les pierres saillantes. **195 avant le zip, 199 après.**

> **ZIP 405 — LE DÉCOR CESSE DE MENTIR, ET LE COMBAT CESSE DE SE FIGER.**
> Quatre défauts signalés par Guillaume en jouant au labyrinthe, et **cinq
> causes** — deux d'entre elles se cachaient derrière le même symptôme.
>
> | ce qu'il a vu | la cause | après |
> |---|---|---|
> | « je suis mort en tombant dans le lac alors que je ne suis pas allé dans la crevasse » | le trou **dessiné** faisait 3 à 5 unités, le trou **qui tue** faisait la cellule entière (11,5) | une seule description, lue par le dessin ET par le moteur |
> | *(même symptôme, autre cause)* | une dalle effondrée **restait dessinée pour toujours** — `buildFloor` était appelé sans qu'on garde son résultat | elle tremble, elle tombe, elle disparaît, un fût violet la remplace |
> | « leurs déplacements sont absurdes pendant le combat » | `pathTo` rend `[]` quand la créature est dans VOTRE case : elle **se figeait**. Mesuré : **0,000 unité en 2 secondes** | elle marche droit sur vous dès qu'aucun mur ne s'interpose |
> | « ils finissent par gagner ou despawn sans vraiment mourir » | joueur injoignable → chemin `null` → `\|\| []` → statue définitive | elle rentre chez elle, ce qui se voit |
> | « des interstices où l'on voit le lac » | pourtour en **44**-gone contre gradins en **40**-gones, et 40 cm de sol manquants **aux quatre portes** | un seul pas de découpe (64), et le pourtour couvre les seuils |
> | « au centre on s'enfonce un peu dans le sol » | les 3 gradins étaient des cylindres **pleins** : le premier masquait les deux autres. On marchait **2,34 unités sous le sol visible** | des anneaux et des contremarches ouvertes — **0/2 688 points** hors tolérance |
> | « l'arbalète doit tirer à distance et one shot les monstres » | l'assistance à la visée n'avait jamais été branchée sur le tir, et la portée (86,8) tenait à 1,8 unité de la portée de vue (85) | elle vise comme l'épée, elle porte à 105, et **elle seule** peut abattre le traqueur |
>
> **Décision de Guillaume au 405 : le traqueur devient tuable, en plusieurs
> carreaux.** L'épée le repousse toujours sans l'entamer. C'est la première fois
> depuis le 393 que les deux armes disent deux choses différentes.
>
> **Deux outils neufs, et les deux ont trouvé plus que ce qu'on leur demandait :**
> `verify-crevasse.mjs` (17 contrôles — **13 échouaient sur le 404**) et
> `verify-rotonde.mjs` (7 contrôles — **6 échouaient**, dont 792 points de
> mesure sur 1 520). Plus `preview-rotonde.mjs`, qui DESSINE la coupe de la
> salle : c'est lui qui a trouvé le troisième défaut de la rotonde, celui que
> personne n'avait signalé.
>
> **Équilibrage : 72,0 % de sortie sur 100 parties** (73,3 % sur 120 au 404).
> Les chutes passent de **12,5 % à 9,0 %** des fins de partie, et les créatures
> tuent enfin — elles ne le faisaient jamais, puisqu'elles se figeaient.

> **ZIP 404 — LE VERGER SE SÈME COMME UNE GRAINE, ET LES FRUITS DESCENDENT AU BAC.**
> Demande de Guillaume : « pour les nouveaux arbustes fruitiers et buissons, il
> faut que greg puisse aussi les planter. Donc **même mécanisme que les seeds et
> crops habituels**, pour qu'ils apparaissent au même endroit dans le shop, et
> que greg puisse les planter. aussi, **je ne sais pas pourquoi les fruits
> apparaissent dans le bag...** »
>
> | | avant | après |
> |---|---|---|
> | **on plante un plant** | case 4 (Construction) | **case 3 (Graines)**, dans le même menu |
> | **on l'achète** | section Constructions | **section Graines & cultures** |
> | **Greg** | ne sait pas | **plante, et abat sur sélection** |
> | **on vend un fruit** | dans le sac | **au bac**, avec les cultures |
>
> ⚠️ **CE QUI NE POUVAIT PAS ÊTRE FAIT, ET POURQUOI CE N'EST PAS GRAVE.** Le 398
> a sorti les vergers de `CROPS` exprès : le pipeline des cultures tient sur une
> hypothèse gravée partout — *une culture disparaît quand on la récolte*. Un
> pérenne dans `CROPS` demanderait un drapeau lu à sept endroits dont trois qui
> ne se connaissent pas. Mais la demande porte sur le **geste**, pas sur la table
> de données : où on l'achète, avec quelle touche on le pose, qui d'autre sait le
> poser. Tout cela a été rattrapé **sans toucher au modèle et sans un seul
> message réseau neuf** — un plant part en `plantOrchard`, la requête que l'hôte
> connaît depuis le 398.
>
> ⚠️ **DEUX CHOSES S'APPELAIENT « FRUIT », ET C'EST PROBABLEMENT LA VRAIE CAUSE
> DE SA QUESTION.** `f.inv.fruit`, la pomme ramassée sur un arbre de la forêt,
> 18 or, vendue **au bac** sous le libellé « Fruit ». Et `f.inv.fruits`, les
> citrons/fraises/framboises/myrtilles des vergers, 70 à 110 or, vendus **dans le
> sac**. Deux stocks, deux prix, un seul mot à l'écran. **Mon propre contrôle est
> tombé dans le piège** : écrit avant la correction, il a cru les fruits de
> verger déjà au bac — il avait trouvé le bouton de la POMME. Une collision de
> noms qui trompe l'outil chargé de la détecter trompe aussi le joueur. La pomme
> s'appelle désormais « pomme des bois », et `sellFruit` s'appelle
> `sellWildApple`.
>
> **Greg abat sur sélection au clic**, hors des options proposées et il a eu
> raison : abattre est irréversible — des heures de pousse et jusqu'à 1 400 or.
> On marque les arbres un par un (cadre rouge + croix), le panneau compte, et on
> valide. **L'hôte revalide chaque case** avec la même fonction que le marquage.
>
> ⚠️ **TROUVÉ EN CHEMIN, HORS DE LA DEMANDE : UN INDICE EN DUR AVAIT SURVÉCU AU
> 403 ET LÂCHAIT L'ANIMAL QU'ON PORTE.** `selectSlot` testait `s !== 6`. La case
> troupeau était l'indice 6 avant le 403 ; depuis, l'indice le plus haut est 4,
> donc la condition était **toujours vraie** : porter un agneau et cliquer sur sa
> propre case pour ouvrir le menu — geste que le 403 a précisément rendu normal —
> le reposait au sol **sans un mot**. Le contrôle du 403 cherchait quatre formes
> (`slotRef.current === N`, `sl === N`, `slot === N`, `selectSlot(N)`) et le
> paramètre s'appelle `s`. **Un contrôle qui énumère des formes ne protège que
> des formes énumérées** — `verify-cycle.mjs` couvre `s` et `setSlot(` depuis ce
> zip.
>
> ⚠️ **ET J'AI ÉCRIT LE PIÈGE 375 MOI-MÊME, EN DIRECT.** La marque d'abattage
> était dessinée en lisant l'état React `gregChopMarks` — or le dessin vit dans
> la closure du gros `useEffect`. Le compte du panneau flottant aurait augmenté à
> chaque clic et **aucune marque ne serait apparue sur la ferme** : la moitié
> visible de la fonctionnalité marche, donc on cherche le défaut partout sauf là.
> Corrigé en refs, et `verify-vergers.mjs` interdit le retour de l'état React à
> cet endroit.
>
> **Le numéro de touche a quitté les textes.** Le 401 a corrigé « touche 8 » en
> « touche 6 », le 403 a dû recorriger en « touche 4 », et le contrôle généralisé
> du 403 rendait la phrase des vergers littéralement impossible à écrire juste,
> puisqu'elle parle d'une AUTRE case. `orchardShopHint` reçoit désormais sa
> touche de `SLOT_ORDER`. **Un texte qui contient un numéro de touche est un
> texte qui périme.**
>
> **Un outil neuf** : `tools/verify-vergers.mjs` — 58 contrôles,
> écrit AVANT la correction, **16 échecs au premier lancement**.


> **ZIP 403 — LA BARRE PASSE DE HUIT CASES À CINQ.**
> Demande de Guillaume : « 4 5 7 et 8 doivent être fusionnés avec rotation »,
> puis, mis en options, une réponse qui sort du cadre et qui fait foi :
> « **Mettre la canne, les snacks dans le bag finalement. Au clic, on pourra
> les consommer (snacks) ou les déployer ; et retirer les cases qui étaient
> attribuées.** »
>
> | avant | après |
> |---|---|
> | 1 outils ⟳ · 2 arrosoir · 3 graines · 4 nourriture · 5 canne · 6 **construction** ⟳ · 7 troupeau · 8 main | 1 outils ⟳ · 2 arrosoir · 3 graines · 4 **construction** ⟳ · 5 troupeau/main ⟳ |
>
> **Manger et pêcher ne sont pas des outils qu'on tient, ce sont des gestes
> qu'on fait de temps en temps.** Ils descendent dans le sac, en deux lignes
> cliquables copiées sur celle de la trousse de soins : le joueur connaît déjà
> ce geste. « Déployer » la canne l'ARME ; elle se range dès qu'on choisit une
> case, sans quoi on pêcherait en croyant labourer.
>
> ⚠️ **LE VRAI CHANTIER N'ÉTAIT PAS LA BARRE, C'ÉTAIT LES TRENTE INDICES EN
> DUR.** La position d'une case était comparée EN CHIFFRE à trente endroits de
> `FermeGame.js` : réordonner la barre, c'était retrouver trente comparaisons
> dans seize mille lignes, et **une seule oubliée donne une touche qui fait
> silencieusement autre chose**. L'ordre est donc décrit **une fois**
> (`SLOT_ORDER`), tout le reste le lit, et `verify-cycle.mjs` **interdit qu'un
> seul indice en chiffre revienne** — le contrôle a été écrit AVANT la
> correction, et il a échoué, ce qui est la seule preuve qu'il mesure quelque
> chose.
>
> Le contrôle des touches annoncées dans les textes a été **généralisé** : il
> compare à la position RÉELLE de la case au lieu de chercher un chiffre écrit
> en dur. Celui du 401 cherchait « touche 8 » et aurait laissé passer
> « touche 6 », qui est devenue fausse à son tour.
>
> **Trouvé en relisant, pas en jouant :** la première écriture des menus rendait
> le panneau des décorations **inatteignable** — plus personne n'appelait
> `setHandMenuOpen(true)`. Règle retenue : *le premier clic demande ce qu'on
> veut porter, les suivants ouvrent ce qu'on porte.*


> **ZIP 402 — LE MOULIN NE REFUSAIT PLUS RIEN EN SILENCE.**
> Retour de Guillaume : « vérifie la posabilité des moulins. il y a une ferme
> où c'est buggé. j'en pose ils disparaissent aussitôt. Et après on me dit que
> le nombre max est atteint. »
>
> Le moteur a été **interrogé** plutôt que relu (`tools/verify-cycle.mjs`), et
> il a répondu **quatre** fois :
>
> 1. **le deuxième clic reprenait le moulin, sans un mot** — poser et retirer
>    sont le même geste sur la même case ; mesuré : 1er clic → moulin au sol,
>    stock 5→4 ; 2e clic → plus rien, stock 4→5. C'est littéralement « j'en
>    pose ils disparaissent aussitôt » ;
> 2. **quinze sols le refusaient sans rien dire** — pavage, sable, rive, ponts,
>    jetée. Sur une ferme dont la place libre est pavée, poser un moulin ne
>    fait *rien*, et rien ne l'explique ;
> 3. **déposer du blé sans moulin terminé sortait en silence**, et quand un
>    moulin est plein le message est « Le moulin est plein » — ce qui se lit
>    très exactement comme « le nombre maximum est atteint » ;
> 4. **cliquer un moulin encore en chantier ne faisait rien du tout** — et
>    c'est le moment précis où l'on clique dessus.
>
> ⚠️ **Aucune règle de jeu ne change** : ni plafond, ni verrou, ni délai. Ce
> sont les six phrases qui manquaient. Un jeu qui refuse sans le dire est
> indiscernable d'un jeu cassé — et c'est bien pour un jeu cassé qu'il l'a pris.
>
> Corrigé aussi : le rebasculement de juillet, qui repassait sur « clôture »
> après CHAQUE pose et cassait la pose en série. Il ne rebascule plus qu'au
> dernier moulin du sac. Et le cycle de la case 6 accueille enfin le **chaudron**
> et les **trois variantes de pont** — les ponts n'ont pas de stock propre, ils
> apparaissent selon le bois et la pierre disponibles.


> **ZIP 401 — LES ARBUSTES SE TRAVERSENT, ET LA ROTATION SE VOIT.**
> Deux demandes de Guillaume, et deux défauts de nature opposée.
>
> **Les arbustes fruitiers** — « ils sont en dur, provoquent une collision or
> je veux pas cela ». `O_ORCHARD` et `O_BERRY_BUSH` sortent des DEUX listes de
> collision, à pied comme à cheval. Ce sont les seuls objets du jeu dont on
> récolte sans les détruire : on revient dessus tous les jours. Ce qui prend du
> temps n'est pas de retirer deux identifiants, c'est de savoir ce que ça
> casse — `tools/verify-cycle.mjs` le demande au moteur : on cueille encore un
> verger **debout dessus**, et un rocher bloque toujours.
>
> **La rotation de la case 6** — elle EXISTAIT depuis juillet et Guillaume ne
> l'avait jamais trouvée. Le défaut n'était pas le mécanisme, c'était
> l'affordance : rien ne disait qu'appuyer une deuxième fois sur 6 changeait
> quelque chose, et **trois textes de la boutique annonçaient la touche 8**,
> qui n'est plus la bonne depuis la réorganisation de la barre. Un chevron ⟳
> sur les cases qui tournent, le nom de la variante tenue au-dessus de la case
> sélectionnée, et une infobulle qui liste tout le cycle.
>
> ⚠️ **La liste affichée EST la liste qui tourne.** `buildCycle()` et
> `toolCycle()` sont appelées par la touche et par l'affichage. Recopier la
> liste dans l'interface aurait produit, au premier ajout de variante, une case
> qui en annonce une de moins qu'elle n'en propose. `verify-cycle.mjs` compte
> les listes littérales : il doit y en avoir exactement UNE.


Soirée de mini-jeux multijoueurs **en ligne**, à distance, entre 2 et 4+ amis. Comptes email/mot de passe, salons avec code à partager, scores synchronisés en direct via Supabase Realtime.

## Statut actuel

✅ Comptes (inscription / connexion), profils (pseudo, avatar)
✅ Salons avec code à 6 caractères, joignables depuis n'importe où dans le monde
✅ Liste des joueurs et scores synchronisés en direct
✅ Interface bilingue FR/EN (bouton en haut à droite)
✅ **Quiz Éclair** 🧠 en réseau — 20 questions de culture générale, tout le monde répond en même temps (questions synchronisées par l'hôte, scores atomiques)
✅ **Mot Mystère** 🔤 — Wordle-like en réseau, chacun devine le même mot caché de son côté, le plus rapide marque le plus de points, progression des autres visible en direct
✅ **Worldle** 🌍 — devine le pays mystère à l'aide de la distance, de la direction et du % de proximité (~48 pays)
✅ **Piano Escape Room** 🎹 — escape game coopératif : 5 salles, piano jouable, énigmes de musique classique, code final. Le premier qui résout fait avancer toute l'équipe (+3 pour lui, +1 pour les autres).
✅ **Puissance 4** 🔴 — premier jeu de plateau à deux. Si le salon a exactement 2 joueurs, la partie démarre directement ; sinon l'hôte choisit qui affronte qui, les autres suivent le match en direct. Victoire +3, défaite +1, match nul +2.
✅ **Petits Chevaux** 🐴 — jeu de plateau classique, jusqu'à 4 joueurs. Si le salon a entre 2 et 4 joueurs, la partie démarre directement avec une couleur par joueur ; au-delà, l'hôte choisit qui joue (2 à 4), les autres suivent en direct. Dé arbitré par l'hôte, capture des pions adverses (sauf sur les cases étoilées), 3 x 6 d'affilée = tour perdu, victoire dès que les 4 pions d'une couleur sont rentrés (+3 pour le vainqueur, +1 pour les autres).
✅ Records : chaque partie enregistre les points dans `game_results`, et les totaux de profil se mettent à jour automatiquement (trigger SQL).
✅ Interface repensée : le jeu en cours prend toute la priorité visuelle (le salon se réduit en barre compacte), fondu enchaîné entre les écrans (salon ↔ jeu, changements de phase), grille de cartes pour choisir un jeu.
✅ Le code du salon devient une pastille discrète en haut à droite de l'écran une fois la partie lancée (`app/globals.css` → `.room-code-fab`), au lieu d'un bandeau au-dessus du jeu — priorité à la jouabilité, moins de distraction visuelle.
✅ Favicon/icône d'onglet propre à ARCARDI (mosaïque des 4 couleurs de tuiles de la marque), fini le "V" générique du navigateur — fichiers `app/icon.png` et `app/apple-icon.png`, détectés automatiquement par Next.js (aucun code à modifier pour ça).
🥚 Quelques easter eggs sont cachés dans le site (et sont volontairement plus rares qu'avant).
⏳ Prochains chantiers : Monopoly et Échecs (mêmes patterns réseau que Puissance 4 / Petits Chevaux), puis un nouveau jeu arcade façon escape room sur le thème de la musique, puis une refonte de Piano Escape Room pour le rendre plus stressant.

> ⚠️ Aucun script SQL supplémentaire n'est nécessaire pour cette mise à jour — `upgrade-001.sql` (déjà exécuté) suffit toujours, `game_id` étant un simple champ texte.

## 1. Configuration locale

```bash
npm install
cp .env.local.example .env.local
```

Remplis `.env.local` avec les valeurs de ton projet Supabase (Project Settings → API) :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxx
```

Lance en local :

```bash
npm run dev
```

Puis ouvre http://localhost:3000

## 2. Base de données Supabase

Dans le dashboard Supabase → **SQL Editor** → New query, colle tout le contenu de `supabase/schema.sql` et clique **Run**.

Ça crée :
- `profiles` — un profil par compte (pseudo, avatar, points cumulés)
- `rooms` — les salons de soirée (code à partager)
- `room_players` — qui est dans quel salon, avec son score
- `game_results` — historique des points gagnés par mini-jeu (pour les records)

Toutes les tables ont des règles de sécurité (Row Level Security) : chacun ne peut modifier que ses propres données, même si la clé publique est visible dans le code.

## 3. Déploiement sur Vercel

1. Va sur [vercel.com/new](https://vercel.com/new)
2. Importe ce dépôt GitHub (`arcardi`)
3. Dans **Environment Variables**, ajoute les deux mêmes variables que dans `.env.local` :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique **Deploy**

Une fois déployé, Vercel te donne une URL publique (ex: `arcardi.vercel.app`) — c'est ce lien que tu partages à tes amis, où qu'ils soient.

## Comment ça marche (architecture)

- **Auth** : Supabase Auth (email + mot de passe), avec confirmation par email.
- **Salons** : chaque salon a un code unique. Rejoindre = ajouter une ligne dans `room_players`.
- **Temps réel** : deux mécanismes complémentaires de Supabase Realtime :
  - *Postgres Changes* pour tout ce qui doit être persistant (liste des joueurs, scores) — écouté par tout le monde dans le salon.
  - *Broadcast* (canal éphémère, sans écriture en base) pour le déroulé rapide d'un mini-jeu (question actuelle, minuteur) — l'hôte du salon pilote le rythme du jeu et diffuse les événements aux autres écrans.
- Chaque joueur calcule sa propre réponse localement puis écrit son score dans `room_players` — protégé par une règle RLS qui empêche de modifier le score de quelqu'un d'autre.

## Ajouter un nouveau mini-jeu

Le pattern du `QuizGame` (dans `components/QuizGame.js`, aussi utilisé par `WordGuess.js` et `Worldle.js`) est réutilisable pour les prochains jeux "tout le monde joue en même temps" :
1. Créer `components/NomDuJeu.js` sur le même modèle (canal broadcast `nomdujeu_{room.id}`)
2. L'ajouter dans `GAME_META`/`GAME_ORDER` en haut de `app/room/[code]/page.js` (icône, couleur d'accent, clés i18n) + le rendu conditionnel selon `room.current_game`
3. Chaque bonne action du joueur met à jour `room_players.score` via Supabase

### Jeux de plateau (Puissance 4, Petits Chevaux, Monopoly, Échecs)

`components/ConnectFour.js` (2 joueurs) et `components/PetitsChevaux.js` (2 à 4 joueurs) servent de modèle pour tous les prochains jeux de plateau. Le principe, à répliquer :
- Le composant reçoit une prop `players` (liste complète du salon) en plus de `room`/`me`/`isHost`/`t`/`lang`/`onFinish`.
- **Choix des joueurs** : si le salon a exactement le bon nombre de joueurs pour le jeu (2 pour Puissance 4, 2 à 4 pour Petits Chevaux), la partie démarre automatiquement dès que le canal est prêt. S'il y a plus de joueurs que le maximum du jeu, l'hôte voit un écran de sélection avant de lancer — les autres suivent en spectateurs.
- **Arbitrage** : l'hôte reste la seule source de vérité du plateau (et du dé pour Petits Chevaux), qu'il joue ou non. Chaque action est envoyée en broadcast (`move_attempt`, `roll_attempt`), seul l'hôte la valide et rediffuse l'état à jour (`state`) ; tout le monde affiche uniquement ce qui revient par broadcast.
- **Points** : chaque joueur (pas l'hôte à leur place) écrit sa propre ligne dans `game_results` — obligatoire à cause des règles RLS.
- **Fondu enchaîné** : le composant `Crossfade` encapsule les transitions entre phases (`<Crossfade id={phase}>{contenu}</Crossfade>`) ; réutilise-le pour les prochains jeux de plateau plutôt que des coupures sèches.
- **Petits Chevaux en particulier** : la géométrie du plateau (piste commune de 56 cases, couloirs privés de 6 cases par couleur, cases sûres) est définie en haut de `components/PetitsChevaux.js` sous forme de données pures (`TRACK`, `COLORS`), avec des fonctions utilitaires testables séparément de l'affichage (`cellFor`, `canMoveToken`, `applyMove`). Si Monopoly ou Échecs ont besoin d'un plateau ou d'un moteur de règles complexe, ce découpage données/logique/affichage est le pattern à suivre.

Ce pattern permettra d'ajouter Monopoly et Échecs sans changer l'architecture du salon.
