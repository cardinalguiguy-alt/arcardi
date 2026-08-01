/* =============================================================================
   config.js — TOUS les réglages du Labyrinthe.
   -----------------------------------------------------------------------------
   Même règle que le défi de fuite (public/templerun/js/config.js) : pour régler
   le jeu, on n'ouvre QUE ce fichier. Aucun autre ne contient de nombre de
   gameplay, et les outils de tools/ recopient CFG tel quel — c'est un objet de
   DONNÉES, il doit le rester (pas d'accesseur, pas de fonction).

   LA PALETTE EST CELLE DU DÉFI DE FUITE, à la valeur près. Demande de
   Guillaume : « des textures similaires au jeu de fuite (evil world), même
   environnement sombre ». Elle n'a donc pas été choisie à l'œil ici : elle est
   RECOPIÉE de templerun/js/config.js, et tools/verify-palette.mjs compare les
   deux fichiers clé par clé et ÉCHOUE si l'une des deux dérive. Deux
   descriptions d'une même chose finissent toujours par diverger (leçon du zip
   387) : ici la seule protection possible est un contrôle, parce que les deux
   pages ne peuvent pas se lire l'une l'autre.

   CE QUI CHANGE PAR RAPPORT AU DÉFI, et pourquoi :
     - il n'y a plus de course, donc plus de vitesse imposée : c'est le joueur
       qui décide d'avancer, et c'est la TORCHE qui impose le rythme ;
     - la lumière n'est plus décorative mais VITALE, donc le brouillard est
       beaucoup plus proche (12 unités contre 260) : on ne voit qu'un couloir ;
     - les murs sont pleins et hauts. Le défi refusait explicitement les murs
       (« pas de couloir fermé, pas d'arches ») parce qu'on y regarde le ciel ;
       ici on regarde le coin d'après.
   ========================================================================== */

const CFG = {

  /* ======================================================================
     LE LABYRINTHE — GÉOMÉTRIE
     ======================================================================
     Le dédale est une grille de CELLULES. Une cellule fait CELL unités de
     côté, un mur fait WALL d'épaisseur : un couloir mesure donc CELL - WALL
     de large. À 6,0 / 1,2 on obtient 4,8 unités, soit un peu plus de deux
     fois la largeur du fermier — assez pour esquiver une créature de côté,
     trop peu pour la contourner sans la toucher. C'est ce rapport-là qui
     rend un couloir étouffant plutôt qu'un boulevard.

     La taille de la grille est IMPAIRE par construction (voir maze.js) : un
     labyrinthe parfait se creuse de deux en deux, et une dimension paire
     laisse une bande de mur mort sur un bord. */
  /* ⚠️ TOUT A DOUBLÉ AU ZIP 394, SUR RETOUR DE GUILLAUME : « j'imaginais pas
     un labyrinthe aussi étroit ». Ses deux images de référence montrent des
     couloirs où l'on tiendrait à cinq de front, des murs qui montent hors du
     cadre, et des salles ouvertes. La première version faisait 4,8 unités de
     couloir pour un fermier de 1,7 de large : c'était un boyau.

     11,5 - 2,0 = 9,5 unités de couloir, soit CINQ fermiers de front, et des
     murs de 11 unités qu'on ne voit pas finir depuis une caméra à 4,4. C'est
     l'échelle des images, mesurée sur elles : le personnage y occupe environ
     un cinquième de la largeur du couloir et un dixième de la hauteur du mur. */
  CELL: 11.5,
  WALL: 2.0,
  WALL_H: 11.0,             // les murs sortent du cadre, comme sur les images
  /* ⚠️ 21 ET NON 27, APRÈS MESURE. À 27×27 (729 cellules) l'oracle de
     tools/simulate-maze.mjs ne voyait que 70 cellules en 420 secondes : à ce
     rythme, traverser un chemin de 110 cellules demandait plus de DIX
     MINUTES, sans une seule mort — c'est-à-dire un mini-jeu qu'on abandonne
     avant de perdre. À 21×21 (441 cellules) et avec la bande de chemin
     resserrée, une partie tient dans les 3 à 6 minutes du Gourmandin et du
     défi de fuite. On perd de l'immensité, on gagne un jeu qui se termine. */
  /* 15 et non 21 : la surface d'une cellule ayant presque quadruplé, garder
     21×21 aurait donné un monde de 240 unités de côté et des parties d'un
     quart d'heure. 15×15 à 11,5 fait 172 unités — plus grand qu'avant EN
     DISTANCE, plus petit en nombre de décisions. C'est exactement l'échange
     demandé : plus impressionnant, moins difficile. */
  GRID: 15,

  /* ======================================================================
     LE FERMIER
     ====================================================================== */
  WALK_SPEED: 9.0,          // unités/s en marche — relevée avec l'échelle
  RUN_SPEED: 14.0,          // ... en course (Maj) — bruyante, voir STALK_HEAR_*
  BACK_SPEED: 5.2,          // en marche arrière : nettement plus lent, on ne fuit pas à reculons
  STRAFE_SPEED: 7.0,        // pas de côté (A/E ou Q/D) — sert à esquiver, pas à voyager
  TURN_SPEED: 2.9,          // rad/s — un demi-tour prend ~1,08 s
  /* ⚠️ AJOUTÉE AU 394, seconde moitié du retour « pas très très fluide ».
     La rotation passait de 0 à pleine vitesse en UNE image : à chaque appui et
     à chaque relâchement, la caméra partait et s'arrêtait net. On monte et on
     redescend maintenant en ~0,16 s, ce qui suffit à rendre le balayage
     continu sans donner l'impression de patiner. */
  TURN_ACCEL: 18.0,         // rad/s² sur la vitesse de rotation
  ACCEL: 34,                // montée en vitesse, unités/s²
  BODY_R: 0.9,             // rayon de collision du fermier

  /* ======================================================================
     LA TORCHE — le cœur du jeu
     ----------------------------------------------------------------------
     Réponse de Guillaume : « elle se consume si on ne la ravive pas ». Les
     deux mots comptent autant l'un que l'autre : elle descend TOUJOURS, et
     il existe TOUJOURS un moyen de la remonter. Un jeu où elle descend sans
     recours serait un compte à rebours déguisé ; un jeu où elle se recharge
     partout n'aurait pas de torche du tout.

     FLAME va de 0 à 1. Le budget est calculé, pas choisi : à FLAME_DRAIN =
     0,0125/s une torche pleine dure 80 secondes de marche, et le générateur
     garantit qu'aucun brasier n'est à plus de TORCH_MAX_GAP cellules du
     précédent sur le chemin de la sortie (voir maze.js / verify-maze.mjs).
     C'est cette garantie qui rend la contrainte tendue au lieu d'injuste. */
  FLAME_START: 1.0,
  FLAME_DRAIN: 0.009,       // par seconde, en marche → 111 s de torche pleine
  FLAME_DRAIN_RUN: 0.016,   // courir consomme presque le double : l'air attise
  FLAME_DRAIN_HIT: 0.05,    // chaque coup d'épée porté fait plonger la flamme
  FLAME_LOW: 0.35,          // seuil « basse » : halo qui se referme, brume qui monte
  FLAME_CRITICAL: 0.12,     // seuil « braise » : on ne voit plus que ses mains
  FLAME_REVIVE: 1.0,        // ce que rend un brasier : la totalité, jamais un appoint
  /* Un brasier ne sert QU'UNE FOIS. C'est ce qui interdit de camper : le
     joueur ne peut pas faire l'aller-retour entre deux feux en attendant que
     les créatures s'en aillent. Le brasier consommé reste visible, éteint et
     fumant — il devient un repère de navigation, ce qui est exactement ce
     dont on manque dans un labyrinthe. */
  /* ⚠️ 3,4 ET NON 2,6, et ce n'est pas du confort. Une cellule fait 6 unités :
     depuis son centre, un joueur peut se tenir à 3,0 du brasier tout en étant
     dans la même case. À 2,6 il existait donc une couronne où l'on VOIT le
     brasier, où l'on est DEVANT, et où la touche ne fait rien — sans un mot
     d'explication. La simulation l'a payé cher : l'oracle restait planté
     devant un feu qu'il ne pouvait pas rallumer jusqu'à la fin du temps.
     3,4 couvre toute la cellule sauf ses coins. */
  TORCH_USE_RANGE: 6.0,     // distance à laquelle F rallume (la cellule fait 11,5)
  TORCH_LIGHT_MAX: 30.0,    // portée de la lumière à flamme pleine
  TORCH_LIGHT_MIN: 7.0,      // ... à la braise
  TORCH_FLICKER: 0.10,      // amplitude du vacillement (fraction de la portée)

  /* ======================================================================
     LE BROUILLARD
     ----------------------------------------------------------------------
     Il ne sert pas à cacher le lointain (il n'y a pas de lointain dans un
     labyrinthe) mais à faire que la lumière S'ARRÊTE. Le fond du couloir se
     perd dans le noir à quelques cellules, et c'est ce noir-là qu'on regarde
     pendant toute la partie. Il suit la flamme : à la braise, il se referme
     à 5 unités et le jeu devient presque aveugle. */
  /* ⚠️ LE BROUILLARD A RECULÉ D'UN FACTEUR TROIS AU 394. Les images de
     Guillaume ne montrent pas un jeu noir : elles montrent une ruine
     ÉCLAIRÉE — des dizaines de torches murales, une brume violette au fond,
     une architecture qu'on voit en entier. La première version se refermait à
     27 unités, c'est-à-dire deux cellules et demie : on ne voyait jamais une
     salle, seulement le bout de son nez.
     À 85, on voit le fond d'un couloir et l'autre rive d'une grande salle,
     et la brume ne sert plus à cacher mais à donner de la profondeur — comme
     sur les images. La flamme continue de moduler ce voile, mais entre
     « loin » et « moins loin », plus entre « peu » et « rien ». */
  FOG_NEAR_FULL: 12.0,
  FOG_FAR_FULL: 85.0,
  FOG_NEAR_EMBER: 2.0,
  FOG_FAR_EMBER: 26.0,

  /* ======================================================================
     L'ÉPÉE — trouvée, jamais donnée
     ----------------------------------------------------------------------
     Choix de Guillaume : « torche + épée trouvée dans le labyrinthe ». La
     conséquence, signalée et assumée : on commence DÉSARMÉ. Le générateur
     pose donc l'épée dans la première salle atteignable, à SWORD_MAX_DEPTH
     cellules au plus de l'entrée, et n'autorise AUCUNE créature avant elle
     (voir maze.js : plantSword puis placeRoamers). Sans cette règle, un
     joueur malchanceux passait ses trois premières minutes à fuir sans rien
     pouvoir faire — ce qui n'est pas de la tension, c'est de l'impuissance.

     L'épée est posée sur un autel ÉCLAIRÉ, visible d'un couloir plus loin
     que le reste : c'est la seule chose du labyrinthe qui appelle. */
  SWORD_MAX_DEPTH: 6,       // cellules de profondeur BFS depuis l'entrée (chemin de 26 à 46)
  /* ⚠️ LE PARVIS DÉBORDE L'ÉPÉE DE CINQ CELLULES, et ces cinq cellules sont
     la correction la plus importante du réglage. La première version tenait
     les rôdeurs hors des cellules de profondeur ≤ SWORD_MAX_DEPTH — c'est-à-
     dire que la zone sûre s'arrêtait pile là où l'épée pouvait se trouver.
     Un joueur qui la cherchait dans la mauvaise branche sortait du parvis
     désarmé, et la simulation le montrait sans appel : trois morts sur
     quatre survenaient AVANT le ramassage de l'épée, en moins de cinquante
     secondes. Ce n'est pas une difficulté, c'est une loterie.
     Avec la marge, on ne peut plus mourir sans avoir eu l'occasion de
     s'armer — et si on sort quand même désarmé, c'est un choix. */
  SANCTUARY_MARGIN: 5,
  SWING_MS: 340,            // durée du geste
  SWING_COOLDOWN_MS: 420,   // ... et repos avant le suivant
  SWING_RANGE: 2.9,        // portée, mesurée du centre du fermier
  SWING_ARC: 1.95,          // rad — un arc large (112°), on ne vise pas au pixel dans le noir
  SWING_DAMAGE: 1,
  SWING_KNOCKBACK: 4.6,     // recul infligé, unités

  /* ======================================================================
     LE FERMIER — POINTS DE VIE
     ====================================================================== */
  HEARTS: 6,
  HURT_INVULN_MS: 1200,     // clignotement d'invulnérabilité après un coup reçu
  HURT_KNOCKBACK: 5.0,
  POTION_HEAL: 1,           // fiole de suif : rend un cœur
  POTION_COUNT: 4,          // fioles posées dans tout le labyrinthe

  /* ======================================================================
     LES RÔDEURS — les créatures « ordinaires »
     ----------------------------------------------------------------------
     Elles PATROUILLENT une zone et ne quittent jamais leur secteur : c'est ce
     qui rend une section nettoyée réellement plus sûre, donc ce qui donne au
     joueur une raison de se battre plutôt que de courir. Le traqueur, lui,
     est l'exact contraire (voir plus bas), et c'est le contraste entre les
     deux qui fait la peur : on peut régler ses comptes avec l'un, jamais
     avec l'autre. */
  ROAMER_COUNT: 4,
  ROAMER_HP: 2,
  ROAMER_SPEED: 5.6,
  ROAMER_CHASE_SPEED: 6.6,   // ⚠️ SOUS la marche du joueur (9,0) : reculer marche TOUJOURS
  ROAMER_SIGHT: 15.0,       // portée de détection à flamme PLEINE (échelle ×1,6)
  ROAMER_SIGHT_EMBER: 7.0,  // ... à la braise : le noir protège aussi le joueur
  ROAMER_PATROL_R: 3,       // rayon de patrouille, en cellules
  ROAMER_GIVEUP_MS: 4200,   // temps avant de renoncer et de rentrer au secteur
  /* ⚠️ AJOUTÉ APRÈS MESURE, et c'est un réglage de JEU avant d'être un réglage
     de coût. La première version recalculait le chemin de poursuite à chaque
     image : une créature qui se re-décide 60 fois par seconde suit le joueur
     au pixel, hésite à chaque carrefour et donne l'impression de glisser sur
     des rails. À 480 ms elle s'engage dans un couloir et s'y tient — donc on
     peut la semer, ce qui est la condition pour que fuir soit une option.
     (Effet de bord recherché : simulate-maze.mjs est passé d'inutilisable à
     ~40 parties par seconde. Un outil trop lent n'est pas lancé, donc mort.) */
  ROAMER_REPATH_MS: 480,
  ROAMER_HIT_DAMAGE: 1,
  ROAMER_HIT_COOLDOWN_MS: 1500,
  ROAMER_STAGGER_MS: 380,   // sonné après un coup reçu : c'est la fenêtre du second coup
  ROAMER_BODY_R: 1.0,

  /* ======================================================================
     LE TRAQUEUR — un seul, jamais tuable
     ----------------------------------------------------------------------
     Deuxième danger choisi par Guillaume. Il ne patrouille pas : il CHERCHE.
     Toutes les STALK_REPATH_MS il recalcule un chemin (BFS sur la grille du
     labyrinthe, la vraie, celle du générateur) vers sa CIBLE — qui n'est pas
     le joueur mais la dernière position qu'il croit connaître de lui.

     COMMENT IL SAIT OÙ TU ES, et c'est tout le sel :
       - à flamme PLEINE, il te voit : cible = ta cellule exacte ;
       - à flamme basse, il ne voit plus rien et suit le BRUIT : courir
         l'informe (STALK_HEAR_RUN cellules), marcher beaucoup moins
         (STALK_HEAR_WALK), s'arrêter ne l'informe pas du tout ;
       - hors de portée d'oreille et de vue, il va au dernier point connu,
         puis erre autour.

     La conséquence de jeu, voulue : la torche pleine te fait voir ET te fait
     voir. Courir te sauve ET te trahit. Il n'y a aucune option gratuite,
     jamais, et c'est ça qu'on veut ressentir.

     Sa vitesse est délibérément un cheveu SOUS la course du joueur (10,6
     contre 11,4) : on lui échappe toujours en ligne droite, jamais dans un
     cul-de-sac. Il rattrape sur les erreurs de navigation, pas sur le
     clavier. Le frapper ne le tue pas — il RECULE (STALK_STAGGER_MS), ce qui
     achète le temps de passer, et rien de plus. */
  STALK_SPEED: 10.2,
  STALK_SPEED_LOST: 7.0,    // quand il a perdu la trace, il ralentit et cherche
  /* ⚠️ LA SEULE VITESSE DU JEU SUPÉRIEURE À LA COURSE DU JOUEUR (11,4), et
     c'est tout son propos. Torche éteinte, il ne cherche plus : il sait, et
     il gagne du terrain quoi qu'on fasse. C'est ce qui interdit la stratégie
     que la simulation avait trouvée — laisser mourir sa torche et s'asseoir
     dans le noir, où plus rien ne pouvait le voir. On peut encore s'en
     sortir : il faut atteindre un brasier, et c'est une course perdue
     d'avance si on l'a laissée commencer trop tard. */
  STALK_SPEED_DARK: 15.0,
  STALK_REPATH_MS: 620,
  STALK_HEAR_RUN: 11,       // cellules
  STALK_HEAR_WALK: 4,
  STALK_SIGHT_FULL: 15,     // cellules, à flamme pleine
  /* ⚠️ 1 500, ET L'ESSAI À 2 600 A ÉTÉ ANNULÉ — à noter, parce que c'est un
     contre-exemple utile. Le raisonnement paraissait solide : le traqueur
     faisait 34 % des fins de partie contre 4 % aux rôdeurs, donc l'épée ne
     servait pas assez contre lui, donc allongeons ce qu'elle rachète. Mesure
     faite, le taux de sortie est TOMBÉ de 14,4 % à 7,7 % et les morts par
     traqueur ont MONTÉ à 44,6 %. La raison est contre-intuitive et n'apparaît
     qu'en jouant : un recul plus long rend l'affrontement payant, donc on
     s'arrête pour frapper, donc on brûle sa flamme et on le laisse revenir.
     Contre lui, la bonne réponse est de PARTIR — et le réglage doit continuer
     de le dire. Ne pas remonter cette valeur sans refaire la mesure. */
  STALK_STAGGER_MS: 1500,   // ce que rachète un coup d'épée
  STALK_HIT_DAMAGE: 1,
  STALK_HIT_COOLDOWN_MS: 1400,
  STALK_BODY_R: 1.1,
  /* Relevé de 12 à 18 en même temps que SANCTUARY_MARGIN : à 12 il s'éveillait
     À L'INTÉRIEUR du parvis, c'est-à-dire pendant que le joueur cherche encore
     son épée dans le seul endroit censé être calme. Le parvis protège des
     rôdeurs, jamais de lui — mais il ne doit pas se lever avant qu'on en soit
     sorti une première fois. */
  STALK_WAKE_DEPTH: 14,
  /* Il RESPIRE, et c'est le seul signal qu'on ait de lui dans le noir : un
     souffle dont le volume ne dépend que de la distance. Sans son (le jeu
     n'en a pas encore, cf. feuille de route), c'est le HUD qui le porte —
     un halo rouge en bord d'écran, d'intensité STALK_DREAD au plus près. */
  STALK_DREAD_RANGE: 30.0,  // unités : distance à laquelle le voile commence
  STALK_DREAD_MAX: 0.42,    // opacité maximale du voile

  /* ======================================================================
     LES TROUS — la structure repose sur le lac violet
     ----------------------------------------------------------------------
     Premier danger choisi par Guillaume, et rappel explicite de sa part :
     « la structure repose sur le lac violet, ne l'oublions pas ». Le sol du
     labyrinthe est donc une DALLE POSÉE SUR L'EAU, et un trou n'est pas un
     décor : c'est l'eau qu'on voit, elle luit, et on tombe dedans.

     DEUX ESPÈCES, et la différence est le tout du chantier :

       * les trous OUVERTS (GAP) sont visibles de loin — la lueur violette
         monte du sol. Ils bloquent un couloir. Le générateur ne les pose
         QUE là où le labyrinthe reste résoluble sans eux (verify-maze.mjs
         le contrôle, et c'est son contrôle le plus important) ;

       * les dalles QUI CÈDENT (CRACK) sont indiscernables d'une dalle saine
         tant qu'on n'a pas marché dessus. Elles se fendent sous le pas,
         tiennent CRACK_DELAY_MS, puis tombent. Le joueur PASSE — mais le
         chemin du retour, lui, a disparu.

     C'est la seconde espèce qui fait le jeu : elle transforme un labyrinthe
     en décision irréversible, sans jamais tuer par surprise. Elles ne sont
     posées que sur des cellules dont le retrait laisse la sortie atteignable
     (même contrôle que les GAP), sinon un joueur pouvait s'enfermer. */
  GAP_COUNT: 7,
  CRACK_COUNT: 7,
  /* ⚠️ CE NOMBRE EST CALCULÉ, PAS CHOISI, et la première version était FAUSSE.
     Traverser une cellule prend CELL / WALK_SPEED = 6 / 7,2 = 833 ms en marche
     et 526 ms en course. À 620 ms — la valeur d'origine — une dalle fêlée
     tombait AVANT qu'un joueur qui marche normalement ait fini de la traverser :
     elles étaient donc toutes mortelles, sans faute et sans recours. La
     simulation l'a vu tout de suite (67 % des parties finissaient dans le lac,
     voir tools/simulate-maze.mjs) ; aucune relecture ne l'aurait vu, parce que
     la ligne était juste et c'est le NOMBRE qui mentait.
     À 1 300 ms, traverser en marchant laisse 467 ms de marge, courir en laisse
     774 — et s'arrêter dessus reste fatal. C'est ce qu'on veut dire : « ça
     cède, ne reste pas là ». */
  /* Relevé une seconde fois, de 1 300 à 1 800 ms, après mesure : à 1 300 les
     chutes faisaient encore 47 % des fins de partie, contre 25 % pour les
     créatures. Trois dangers ont été demandés ; si l'un en tue deux fois plus
     que les deux autres réunis, il n'y a pas trois dangers, il y en a un.
     1 800 ms laisse près d'une seconde de marge à qui traverse en marchant,
     et reste sans appel pour qui s'arrête, recule ou fait demi-tour dessus. */
  /* ⚠️ RECALCULÉ AU 394 avec la nouvelle échelle. Traverser une cellule prend
     maintenant 11,5 / 9,0 = 1 278 ms en marche et 821 ms en course. 2 400 ms
     laisse donc 1,1 s de marge à qui marche, et reste sans appel pour qui
     s'arrête ou fait demi-tour dessus. C'est le troisième calcul de cette
     valeur, et les deux premiers étaient faux dans le même sens : on sous-
     estime toujours le temps qu'il faut pour traverser une case. */
  CRACK_DELAY_MS: 2400,     // temps entre le premier craquement et la chute
  CRACK_SHAKE: 0.09,        // tremblement de la dalle pendant ce délai
  FALL_MS: 900,             // durée de la chute avant l'écran de fin
  LAKE_Y: -9.0,             // niveau de l'eau sous la dalle
  LAKE_GLOW_UP: 4.5,        // hauteur du halo violet qui monte d'un trou

  /* ======================================================================
     LE PHARE DE LA SORTIE
     ----------------------------------------------------------------------
     ⚠️ AJOUT NON DEMANDÉ, ASSUMÉ, et pris seul après mesure. Sans lui, le
     joueur oracle de tools/simulate-maze.mjs n'atteignait la sortie dans
     AUCUNE partie : au bout de huit minutes il avait parcouru dix fois la
     longueur du chemin optimal en tournant en rond. Ce n'est pas une
     difficulté, c'est une absence de repère — et le labyrinthe demandé est
     « difficile », pas « désorientant ».

     Le phare est une colonne de lumière violette qui monte du lac par la
     porte de sortie, plus haute que les murs, visible de partout. Il donne
     une DIRECTION, jamais un chemin : savoir que la sortie est au nord-est
     ne dit rien des trois murs qui séparent. C'est exactement le partage
     qu'on veut — le joueur ne se demande plus « où aller » (question sans
     intérêt) mais « comment y aller » (le jeu).

     Il sert aussi la fiction : c'est le lac violet qui éclaire par en
     dessous, donc la même lumière que celle des trous. Le joueur apprend en
     une seconde que violet = le vide, et que la sortie est un trou comme les
     autres — sauf que celui-là, on le prend. */
  /* ======================================================================
     ZIP 394 — LE DÉCOR DES IMAGES : TORCHES MURALES, POUTRES, PLAFOND
     ----------------------------------------------------------------------
     Les torches murales sont l'élément le plus présent des deux captures de
     Guillaume, et elles n'existaient tout simplement pas au 393 : on n'avait
     que les brasiers ravivables, un tous les huit mètres. Une face de mur
     fermée sur trois en porte une, ce qui donne une trentaine de flammes
     visibles à la fois dans un couloir — l'image.

     ⚠️ UNE TORCHE SUR DEUX SEULEMENT PORTE UNE VRAIE LUMIÈRE. WebGL plafonne
     le nombre de sources ponctuelles d'un matériau ; au-delà, le rendu ne
     ralentit pas, il ÉCHOUE (les lumières excédentaires sont silencieusement
     ignorées, ou le shader refuse de compiler selon la machine). Les autres
     éclairent par leur halo additif, qui ne coûte rien et se voit autant. */
  WALL_TORCH_CHANCE: 0.34,   // part des faces fermées qui portent une torche
  WALL_TORCH_H: 5.6,         // hauteur du bras, à mi-mur

  /* Le plafond de l'image 2 : partiel, avec des ouvertures déchiquetées sur
     le ciel violet, et des poutres de bois qui relient les morceaux. AUCUN
     plafond sur les salles — c'est la grande salle à ciel ouvert de l'image 1
     qui donne l'échelle du lieu, la couvrir supprimerait la seule vue dégagée
     du jeu. */
  CEILING_CHANCE: 0.42,      // part des cellules de couloir couvertes
  BEAM_CHANCE: 0.55,         // part des cellules portant trois poutres

  BEACON_H: 70.0,           // hauteur de la colonne, très au-dessus de WALL_H
  BEACON_R: 2.6,
  BEACON_PULSE: 0.9,        // battements par seconde

  /* ======================================================================
     LES ÉCLATS — ce qu'on rapporte
     ----------------------------------------------------------------------
     Équivalent des bonbons du défi : ramassés pendant la partie, convertis
     en or par la ferme au retour, et gardés MÊME en cas de mort (décision
     Guillaume : « comme le défi de fuite »). Le plafond LAB_MAX_SHARDS côté
     ferme est ce qui empêche un message aberrant d'injecter une fortune. */
  SHARD_COUNT: 22,
  SHARD_SPIN: 1.8,          // rad/s
  SHARD_BOB: 0.22,

  /* ======================================================================
     SCORE
     ----------------------------------------------------------------------
     Il récompense ce qu'on veut voir faire : explorer (cellules découvertes),
     ramasser, et se battre. Il ne récompense PAS le temps passé — sinon la
     stratégie optimale serait d'attendre dans un coin, ce qui est exactement
     le contraire du jeu. */
  SCORE_PER_CELL: 4,
  SCORE_PER_SHARD: 25,
  SCORE_PER_KILL: 60,
  SCORE_EXIT_BONUS: 750,

  /* ======================================================================
     CAMÉRA — troisième personne, comme l'image de référence
     ----------------------------------------------------------------------
     Elle est BASSE et PROCHE : c'est ce qui donne l'échelle des murs (on les
     regarde d'en dessous) et ce qui empêche de voir par-dessus. Elle se colle
     au fermier quand un mur la traverserait, plutôt que de le traverser. */
  CAM_DIST: 7.6,
  CAM_HEIGHT: 4.4,
  CAM_LOOK_H: 2.2,
  CAM_LAG: 9.0,             // suivi (plus grand = plus rigide)
  CAM_MIN_DIST: 2.2,        // distance minimale quand un mur pousse la caméra
  CAM_SHAKE_HURT: 0.35,

  /* ======================================================================
     PALETTE — RECOPIÉE de public/templerun/js/config.js
     ----------------------------------------------------------------------
     ⚠️ Ne PAS retoucher une de ces valeurs sans la retoucher là-bas :
     tools/verify-palette.mjs lit les deux fichiers et échoue si l'une des
     clés communes diverge. C'est le seul garde-fou possible entre deux pages
     autonomes qui ne peuvent pas s'importer l'une l'autre.
     ====================================================================== */
  COL_FOG:        0x100819,
  COL_GROUND:     0x121a12,
  COL_VOID:       0x080d10,
  COL_STONE:      0x565046,
  COL_STONE_DARK: 0x3c372f,
  COL_STONE_EDGE: 0x2b2721,
  COL_PLANK:      0x4a3a28,
  COL_BARK:       0x2e2822,
  COL_BARK_DARK:  0x1b1712,
  COL_PURPLE:     0x8c5adc,
  COL_PURPLE_DIM: 0x3a2064,
  COL_LAKE:       0x2a1052,
  COL_LAKE_GLOW:  0x7b3fd8,
  COL_TORCH:      0xff9a3c,
  COL_COIN:       0x9fecfb,
  COL_COIN_GLOW:  0x4fd8f5,
  COL_WOLF:       0x0f0c0b,
  COL_WOLF_EYE:   0xff3020,
  COL_OBSTACLE:   0x453f33,
  COL_STAIN:      0x2f3d24,
  COL_STAIN_DARK: 0x1a2415,
  COL_CRACK:      0x0a0807,
  COL_MOSS:       0x46592e,
  COL_MOSS_DARK:  0x27351a,
  COL_VINE:       0x293a20,
  COL_MUSHROOM:   0xb887ff,
  COL_RUNE:       0xa26bff,
  COL_PAVE:       0x6b6353,
  COL_PAVE_DARK:  0x4e483c,
  COL_MORTAR:     0x3a352c,
  COL_RAIL:       0x4f483b,
  COL_RAIL_CAP:   0x605848,

  /* ======================================================================
     ZIP 394 — LES COULEURS RELEVÉES SUR LES DEUX IMAGES DE GUILLAUME
     ----------------------------------------------------------------------
     Elles ne sont PAS dans la comparaison de tools/verify-palette.mjs : ce
     sont des teintes propres au labyrinthe, déclarées comme telles. Le défi
     de fuite n'a ni brique chaude, ni ciel violet clair, ni eau lumineuse —
     et lui imposer les nôtres le dénaturerait.

     ⚠️ LA PIERRE EST CHAUDE, ET C'EST LE CHANGEMENT LE PLUS IMPORTANT DU ZIP.
     La première version reprenait COL_STONE (0x565046), un gris-vert froid
     parfaitement juste pour une chaussée sous l'orage… et parfaitement faux
     pour un couloir éclairé aux torches. Sur les images, les blocs sont
     KHAKI/SABLE : c'est la lumière du feu peinte DANS la texture. Aucune
     lumière ponctuelle de Three.js ne rattrape une texture froide — elle la
     multiplie, elle ne la réchauffe pas. */
  COL_BRICK:      0x9c8b5e,   // bloc courant, khaki chaud
  COL_BRICK_LIT:  0xc4b073,   // bloc pris de plein fouet par une torche
  COL_BRICK_DARK: 0x6b5f42,   // bloc à l'ombre
  COL_FLOOR:      0x6e6752,   // dalle courante (plus sombre que les murs)
  COL_FLOOR_LIT:  0x8d8468,
  COL_FLOOR_DARK: 0x4e4938,

  /* Le ciel des images : violet franc au zénith, rose-violet à l'horizon.
     Nettement plus CLAIR que la nuit du défi de fuite — sur les images, le
     ciel est la zone la plus lumineuse du cadre après les flammes. */
  SKY_TOP:        0x6b3f8f,
  SKY_HORIZON:    0xb987c8,
  COL_PYRAMID:    0x4a3560,   // silhouette des pyramides
  COL_DEADTREE:   0x241a30,   // arbres morts sur l'horizon

  /* L'eau du lac, vue par un trou : violet SATURÉ et lumineux, avec des
     crêtes presque blanches. Elle éclaire le bord du trou par en dessous. */
  COL_LAKE_BRIGHT: 0xe4b6ff,

  /* Trois paliers de flamme, au lieu de deux : sur les images une torche
     murale est une grosse tache à cœur blanc. */
  COL_TORCH_OUT:  0xff6a18,   // frange extérieure, orange franc
  COL_TORCH_CORE: 0xfff3cf,   // cœur, presque blanc

  /* Deux teintes PROPRES au labyrinthe, donc absentes du défi et exclues de
     la comparaison de palette : l'acier de l'épée et l'os du traqueur. */
  COL_STEEL:      0xb9c2cc,
  COL_STEEL_EDGE: 0x6f7a86,
  COL_STALKER:    0x0b0910,
  COL_STALKER_EYE:0xff2a4a,

  /* Tenue de repli — OUTFITS[0] de fermeConstants.js, comme le défi. En jeu,
     la ferme envoie la vraie tenue du joueur dans vf-lab-init. */
  COL_SHIRT: 0x3f7fd4,
  COL_PANTS: 0x454f66,
  COL_SKIN:  0xf0c8a0,
  COL_HAIR:  0x5a3a1e,
};

/* =============================================================================
   RÉGLAGES DE TOPOLOGIE DU DÉDALE
   -----------------------------------------------------------------------------
   Séparés du reste parce qu'ils ne se règlent pas à l'œil mais au BALAYAGE :
   tools/tune-maze.mjs fait tourner le générateur et le joueur oracle sur des
   milliers de graines pour chaque jeu de valeurs, et c'est lui qui a choisi
   celles-ci. Leçon du zip 387 (le niveau 7 du Gourmandin) : quand une
   géométrie résiste, on balaie au lieu de deviner — et on ÉCRIT dans le
   commentaire que la valeur vient d'un balayage, sinon quelqu'un la « rangera ».

   ⚠️ VALEURS ISSUES DU BALAYAGE DE tools/tune-maze.mjs. Ne pas les « arrondir ».
   ========================================================================== */
CFG.MAZE_BRAID = 0.30;      // part des culs-de-sac rouverts (0 = labyrinthe parfait)
CFG.MAZE_ROOMS = 3;         // salles creusées dans le dédale (respirations + repères)
CFG.MAZE_ROOM_MIN = 2;
CFG.MAZE_ROOM_MAX = 4;
/* La BANDE de longueur du plus court chemin entrée→sortie, en cellules. Les
   deux bornes comptent : sans la haute, 2 000 graines produisaient des trajets
   optimaux de 48 à 311 cellules, soit des parties de 3 à 20 minutes tirées au
   sort avant le premier pas. Voir le commentaire de make() dans maze.js. */
CFG.MAZE_MIN_PATH = 32;
CFG.MAZE_MAX_PATH = 56;
CFG.MAZE_TORCHES = 14;      // brasiers ravivables posés dans tout le dédale
CFG.TORCH_MAX_GAP = 8;     // ⚠️ garantie dure : jamais plus de N cellules sans brasier sur le chemin

/* =============================================================================
   DÉRIVÉS — ne pas régler à la main.
   ========================================================================== */
CFG.CORRIDOR = CFG.CELL - CFG.WALL;          // largeur utile d'un couloir
CFG.HALF = CFG.CELL / 2;
/* Budget de flamme, en SECONDES et en CELLULES, calculé et non écrit : c'est
   lui qui justifie TORCH_MAX_GAP. À 7,2 u/s et 6 unités par cellule, on
   traverse 1,2 cellule par seconde ; une torche pleine vaut donc ~96 cellules
   de marche. TORCH_MAX_GAP = 11 laisse une marge de 8, ce qui autorise à se
   tromper de chemin plusieurs fois entre deux brasiers. */
CFG.FLAME_SECONDS = 1 / CFG.FLAME_DRAIN;
CFG.FLAME_CELLS = (CFG.FLAME_SECONDS * CFG.WALK_SPEED) / CFG.CELL;

if (typeof module === "object" && module.exports) module.exports = { CFG };
