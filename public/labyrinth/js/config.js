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
     ZIP 395 — LE PAS DE SIMULATION, ET POURQUOI IL DESCEND À 30 Hz
     ======================================================================
     Guillaume : « les mouvements ne sont pas assez soignés (…) tu peux
     réduire à 30 fps ». Les deux moitiés de la phrase vont ensemble, et la
     seconde est l'autorisation qui permet la première.

     ⚠️ 30 Hz N'EST PAS UNE BAISSE DE QUALITÉ, C'EST UN DÉCOUPLAGE. Jusqu'ici
     la simulation ET le rendu tournaient à 60 : chaque image affichée était un
     état de jeu brut, et tout écart de cadence du navigateur se voyait
     directement comme une saccade. Désormais :

       * la SIMULATION avance par pas fixes de 1/30 s — c'est elle qui décide
         de tout, et c'est elle que rejouent les outils ;
       * le RENDU tourne à la cadence de l'écran (60, 120, 144…) et INTERPOLE
         entre les deux derniers états simulés.

     Le mouvement affiché est donc continu même quand la simulation est
     discrète, et il le reste si une image de simulation est sautée. C'est la
     technique standard, et c'est LA réponse à « plus fluide » — bien plus que
     n'importe quel réglage de vitesse.

     ⚠️ TOUT CE QUI SIMULE DOIT LIRE CETTE CONSTANTE. game.js, lib-play.mjs,
     smoke-render.mjs et verify-controls.mjs l'utilisent : deux cadences qui
     doivent rester égales et qui sont écrites à deux endroits finissent
     toujours par diverger, et un outil qui joue à 60 pendant que le jeu joue
     à 30 mesure autre chose que le jeu. */
  SIM_HZ: 30,


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
  /* ⚠️ 19 ET NON 15 AU 396. Demande de Guillaume : « il faut pas que ce soit
     trop difficile, seulement que ce soit relativement long et avec des
     surprises ». Les deux moitiés de la phrase tirent dans des sens opposés,
     et il faut les traiter séparément :

     ⚠️ SEPT CONFIGURATIONS ONT ÉTÉ JOUÉES, 45 parties chacune, avant de
     trancher. Le résultat est contre-intuitif et vaut d'être écrit :

       grille 15 (celle du 395) → 58 % de sortie, médiane 114 s, p75 199 s
       grille 17                → 69 % de sortie, médiane 125 s, p75 156 s
       grille 19                → majorité de parties non finies en 10 min

     PLUS GRAND EST PLUS FACILE ENTRE 15 ET 17, ce qu'aucun raisonnement ne
     donnait : la rotonde occupe 25 cellules. Sur une grille de 15 elle en
     mange 11 %, étrangle le dédale autour et fait exploser les détours (p75 à
     199 s) ; sur 17 elle n'en mange que 8,6 % et redevient ce qu'elle doit
     être — un carrefour, pas un bouchon. Au-delà, la surface l'emporte et on
     ne termine plus.

     LE RESTE MONTE AVEC : brasiers 14 → 20, fioles 4 → 6, éclats 22 → 34,
     salles 3 → 4. Les dangers, eux, montent MOINS vite que la surface (trous
     7 → 9 pour 28 % de cellules en plus) : la densité de danger BAISSE. C'est
     ainsi qu'on obtient plus long ET moins difficile, ce qui était demandé. */
  GRID: 17,

  /* ======================================================================
     LE FERMIER
     ====================================================================== */
  WALK_SPEED: 9.0,          // unités/s en marche — relevée avec l'échelle
  RUN_SPEED: 14.0,          // ... en course (Maj) — bruyante, voir STALK_HEAR_*
  BACK_SPEED: 5.2,          // en marche arrière : nettement plus lent, on ne fuit pas à reculons
  STRAFE_SPEED: 7.0,        // pas de côté (A/E ou Q/D) — sert à esquiver, pas à voyager
  /* ⚠️ 2,6 ET NON 2,9 AU 396. Baisse volontairement MODESTE : l'essentiel de
     « la caméra bouge trop » est traité par le découplage caméra/cap (voir
     CAM_ANG_LAG) et par le recalage sur le couloir (SNAP_*), pas ici. Une
     rotation nettement plus lente aurait rendu le demi-tour de fuite — le
     geste qu'on fait quand le traqueur apparaît — trop long pour servir. */
  TURN_SPEED: 2.6,          // rad/s — un demi-tour prend ~1,30 s
  /* ⚠️ AJOUTÉE AU 394, seconde moitié du retour « pas très très fluide ».
     La rotation passait de 0 à pleine vitesse en UNE image : à chaque appui et
     à chaque relâchement, la caméra partait et s'arrêtait net. On monte et on
     redescend maintenant en ~0,16 s, ce qui suffit à rendre le balayage
     continu sans donner l'impression de patiner. */
  TURN_ACCEL: 14.0,         // rad/s² sur la vitesse de rotation
  /* ⚠️ FREINAGE DE ROTATION, AJOUTÉ AU 395. Monter en douceur ne suffisait
     pas : la rotation s'ARRÊTAIT net au relâchement de la flèche, ce qui est
     exactement l'à-coup qu'on entendait dans « les rotations aussi ». On
     décélère maintenant plus doucement qu'on n'accélère, ce qui donne à la
     caméra une fin de course qui glisse au lieu de buter. */
  TURN_DECEL: 9.0,          // rad/s² à la décélération (plus doux que l'accél.)
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
  FLAME_DRAIN_HIT: 0.03,    // chaque coup d'épée porté fait plonger la flamme (0,05 au 395)
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
  /* ======================================================================
     ⚠️ ZIP 396 — LE COMBAT DEVIENT PLUS PERMISSIF. C'EST UNE DEMANDE, ET ELLE
     EST ASSUMÉE AVEC SON COÛT.
     ----------------------------------------------------------------------
     Guillaume : « les scènes de bagarre avec le monstre noir ne sont pas
     claires, on sait pas quand on gagne, si on touche etc. ça doit être plus
     assisté et plus user friendly », et, à la question « seulement plus
     lisible, ou plus facile aussi ? » : PLUS FACILE AUSSI.

     Cinq nombres bougent, et chacun répond à un moment précis du reproche :

       SWING_RANGE 2,9 → 3,8   le fermier fait 1,7 de large et le rôdeur 2,0 :
                               à 2,9 il fallait être quasiment au contact,
                               c'est-à-dire déjà dans la portée de SES griffes ;
       SWING_ARC  1,95 → 2,35  135° au lieu de 112°. On ne vise pas au pixel
                               dans le noir, et encore moins au clavier ;
       SWING_MS    340 → 300   le geste rend la main plus vite ;
       SWING_COOLDOWN 420→240  DEUX coups d'affilée deviennent possibles dans
                               la fenêtre de ROAMER_STAGGER_MS, ce qui veut
                               dire qu'un rôdeur (2 PV) peut être tué en un
                               échange. C'est ce qui manquait le plus : on
                               frappait, il reculait, il revenait, on n'avait
                               rien gagné ;
       FLAME_DRAIN_HIT 0,05→0,03  se battre coûtait 5 % de flamme par coup, et
                               deux coups par créature sur quatre créatures
                               faisaient 40 % d'une torche. Le jeu punissait
                               ce qu'il demandait de faire.

     ⚠️ LE COÛT, ÉCRIT NOIR SUR BLANC : l'équilibrage mesuré sur 220 parties au
     395 (69,5 % de sortie) NE VAUT PLUS. La campagne est refaite au 396 et le
     nouveau chiffre est dans le README et dans le texte de contexte. Leçon du
     393 à garder en tête : un réglage qui paraît évident peut mesurablement
     EMPIRER le jeu — c'est pour ça qu'on remesure au lieu de supposer. */
  SWING_MS: 300,            // durée du geste
  SWING_COOLDOWN_MS: 240,   // ... et repos avant le suivant
  SWING_RANGE: 3.8,         // portée, mesurée du centre du fermier
  SWING_ARC: 2.35,          // rad — un arc très large (135°)
  SWING_DAMAGE: 1,
  SWING_KNOCKBACK: 4.6,     // recul infligé, unités

  /* L'ASSISTANCE À LA VISÉE, choisie par Guillaume au 396.
     Au moment du coup — et à ce moment SEULEMENT — le cap du fermier pivote
     vers la créature la plus proche située dans une fenêtre de AIM_ARC autour
     de son regard. Il ne pivote jamais de plus de AIM_MAX_TURN : l'assistance
     corrige une visée approximative, elle ne retourne pas le personnage.

     ⚠️ ELLE NE S'APPLIQUE QU'À CE QUI EST DÉJÀ ATTEIGNABLE : la cible doit
     passer canTouch() (pas de mur entre les deux) et être dans la portée. On
     ne peut donc pas frapper à travers une cloison, et l'assistance ne change
     RIEN à la portée réelle de l'épée — elle change seulement la probabilité
     qu'un joueur au clavier soit bien orienté au moment où il appuie. */
  AIM_ARC: 1.25,            // rad — demi-fenêtre de recherche de cible
  AIM_MAX_TURN: 0.85,       // rad — pivotement maximal consenti par coup
  AIM_MARGIN: 1.4,          // unités — la cible peut être un peu hors de portée

  /* ======================================================================
     LE FERMIER — POINTS DE VIE
     ====================================================================== */
  HEARTS: 6,
  HURT_INVULN_MS: 1200,     // clignotement d'invulnérabilité après un coup reçu
  HURT_KNOCKBACK: 5.0,
  POTION_HEAL: 1,           // fiole de suif : rend un cœur
  POTION_COUNT: 6,          // fioles posées dans tout le labyrinthe (4 au 395)

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
  /* ⚠️ 620 ET NON 380 AU 396, et ce nombre se lit AVEC SWING_COOLDOWN_MS.
     Le second coup demande SWING_MS + SWING_COOLDOWN_MS = 540 ms. À 380 ms de
     sonnerie, le rôdeur était donc TOUJOURS revenu avant qu'on puisse
     enchaîner : la fenêtre du second coup n'existait pas, malgré son nom. À
     620 elle existe et vaut 80 ms — étroite, mais réelle. C'est elle qui rend
     un rôdeur tuable en un échange, donc le combat gagnable.

     ⚠️ NE PAS CONFONDRE AVEC STALK_STAGGER_MS, dont l'allongement a été essayé
     puis ANNULÉ au 393 (voir son commentaire). Le traqueur et le rôdeur ne
     jouent pas le même rôle : on doit pouvoir régler ses comptes avec l'un,
     jamais avec l'autre. */
  ROAMER_STAGGER_MS: 620,   // sonné après un coup reçu : c'est la fenêtre du second coup
  ROAMER_BODY_R: 1.0,
  /* Distance à laquelle la jauge de vie d'un rôdeur s'affiche. Demande de
     Guillaume au 396 : « on doit voir la jauge ». Bornée pour que le HUD ne
     se remplisse pas de barres au fond d'un couloir : au-delà, la créature
     n'est de toute façon qu'une silhouette. */
  HP_BAR_RANGE: 26.0,

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
  STALK_WAKE_DEPTH: 17,
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
  GAP_COUNT: 9,
  CRACK_COUNT: 9,   /* 9 et non 7 : la surface a monté de 60 %, les dangers de 29 %. La densité de trous BAISSE donc d'un tiers — c'est la moitié « pas plus difficile » du 396. */
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
     ZIP 396 — LE PARVIS DE RENONCEMENT ET LA HERSE
     ----------------------------------------------------------------------
     Demande de Guillaume, mot pour mot : « au début du labyrinthe, quand on se
     retourne on doit voir une plateforme qui si on l'emprunte nous ramène
     directe dans le maze world. Comme un abandon sans coût. Mais on ne peut
     faire ça que dans les 15 premières secondes : une porte se referme après
     et nous force à avancer. »

     ⚠️ ELLE RÉPARE AUSSI UN VRAI TROU, trouvé en cherchant où la poser. Le
     générateur OUVRE le mur sud de la cellule d'entrée (rules.js /
     buildBoxes / openWall) pour faire une porte — et rien ne fermait derrière.
     Un joueur qui reculait franchissait donc cette porte, sortait de la
     grille, et se retrouvait sur le VIDE : handleFloor ne traite que les
     cellules valides, il n'y avait donc ni sol, ni chute, ni sortie. On
     flottait au-dessus du lac, indéfiniment. La plateforme comble exactement
     ce trou, et la herse le referme.

     LE DÉCOMPTE PART AU PREMIER PAS, réponse explicite de Guillaume. Les 15 s
     ne commencent donc pas à l'apparition de la scène : on peut regarder
     autour de soi, lire le HUD, comprendre où l'on est. L'horloge démarre
     quand le fermier a réellement bougé (ABANDON_START_DIST), ce qui est aussi
     ce que fait un joueur qui a décidé de jouer.

     LA HERSE EST UNE BOÎTE DE COLLISION COMME LES AUTRES : elle s'ajoute à la
     liste de Rules.buildBoxes() quand elle est tombée, donc le moteur l'arrête
     et world.js la dessine, par le même chemin que tous les murs. Un mur
     visible qu'on traverse reste impossible par construction. */
  /* ======================================================================
     ZIP 396 — LA ROTONDE, LA SALLE CENTRALE CIRCULAIRE
     ----------------------------------------------------------------------
     Demande de Guillaume, avec une image de référence : « je veux une salle
     centrale circulaire avec escaliers ». On y relève, et on reprend :
       * un mur COURBE en gros blocs khaki, avec une torche murale tous les
         quelques mètres, sur deux hauteurs ;
       * un sol EN CONTREBAS, atteint par un escalier de pierre large ;
       * le ciel violet visible par-dessus : c'est la seule vue dégagée ;
       * des orbes qui flottent au-dessus du sol.

     ⚠️ ELLE EST TOUJOURS AU CENTRE ET TOUJOURS IDENTIQUE, à l'inverse de tout
     le reste du dédale. C'est ce qui en fait un REPÈRE : le seul endroit dont
     un joueur puisse dire « je suis déjà passé par là ». Sans point fixe, un
     labyrinthe aléatoire ne produit pas de l'exploration mais de l'errance,
     et l'errance ne fait pas de souvenirs.

     Sa taille est IMPAIRE pour qu'elle ait une cellule centrale franche.
     À 5 cellules de 11,5, elle fait 57 unités de diamètre — trente fermiers
     de front, une place de village. */
  ROTUNDA_CELLS: 5,         // côté de la salle, en cellules (impair)
  ROTUNDA_BLOCK: 2.4,       // taille d'un bloc du mur rond : c'est la « résolution » du cercle
  ROTUNDA_RIM: 7.0,         // largeur du pourtour plat, avant le premier gradin
  ROTUNDA_RINGS: 3,         // nombre de gradins
  ROTUNDA_DROP: 1.17,       // hauteur d'un gradin — 3 gradins = 3,51 de fond
  ROTUNDA_STAIR_W: 7.5,     // largeur de l'escalier nord-sud
  ROTUNDA_STEP: 1.55,       // profondeur d'une marche
  /* ⚠️ 0,27 N'EST PAS CHOISI : il est CALCULÉ pour que l'escalier arrive au
     même niveau que le dernier gradin. Le rayon utile vaut (5×11,5)/2 - 1 - 7 =
     20,75 unités, soit 13 marches de 1,55 ; 13 × 0,27 = 3,51 = 3 × ROTUNDA_DROP.
     Si l'un des quatre nombres bouge sans les autres, l'escalier débouche sur
     une marche fantôme au milieu de la salle. tools/verify-maze.mjs le
     contrôle, justement parce que c'est invisible en relisant. */
  ROTUNDA_STEP_H: 0.27,     // ... et sa hauteur
  ROTUNDA_TORCHES: 14,      // torches murales de la couronne, par étage
  ROTUNDA_SHARDS: 5,        // éclats posés au fond : la récompense de la descente

  PLATFORM_LEN: 15.0,       // longueur de la plateforme au sud de l'entrée
  PLATFORM_DROP: 0.35,      // elle est légèrement plus basse que le dédale
  ABANDON_MS: 15000,        // fenêtre de renoncement, à partir du premier pas
  ABANDON_START_DIST: 1.2,  // distance à parcourir pour que l'horloge démarre
  GATE_FALL_MS: 1100,       // durée de la chute de la herse
  GATE_WARN_MS: 3500,       // ... et avertissement avant qu'elle tombe
  GATE_TEETH: 7,            // barreaux de la herse

  /* ======================================================================
     LES ÉCLATS — ce qu'on rapporte
     ----------------------------------------------------------------------
     Équivalent des bonbons du défi : ramassés pendant la partie, convertis
     en or par la ferme au retour, et gardés MÊME en cas de mort (décision
     Guillaume : « comme le défi de fuite »). Le plafond LAB_MAX_SHARDS côté
     ferme est ce qui empêche un message aberrant d'injecter une fortune. */
  SHARD_COUNT: 34,
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
     ZIP 395 — L'ANIMATION
     ----------------------------------------------------------------------
     Retour de Guillaume : « les animations ne sont pas du tout
     satisfaisantes ». Elles ne l'étaient pas, et pour une raison simple : il
     n'y en avait pas. Le fermier avait deux bras qui oscillaient en sinus du
     TEMPS, des jambes qui ne bougeaient pas du tout, et rien d'autre — pas de
     cycle de marche, pas de repos, pas d'élan d'attaque, pas de réaction au
     coup reçu.

     ⚠️ LE CYCLE DE MARCHE AVANCE À LA DISTANCE, PAS AU TEMPS. C'est la seule
     chose qui empêche le patinage : un personnage dont les jambes battent la
     mesure du temps glisse dès qu'il ralentit, et c'est le défaut qu'on
     reconnaît immédiatement sans savoir le nommer. Ici, un pas se fait tous
     les STRIDE mètres parcourus, quelle que soit la vitesse — donc le pied
     touche le sol au même endroit du cycle, toujours. */
  STRIDE: 2.9,              // distance parcourue par foulée complète (2 pas)
  GAIT_SWING: 0.85,         // amplitude d'oscillation des cuisses, rad
  GAIT_KNEE: 1.05,          // flexion maximale du genou, rad
  GAIT_ARM: 0.62,           // amplitude des bras (contre-balancement)
  GAIT_BOB: 0.11,           // montée/descente du bassin par pas, unités
  GAIT_ROLL: 0.07,          // roulis des épaules, rad
  LEAN_RUN: 0.17,           // inclinaison avant en course, rad
  LEAN_STRAFE: 0.16,        // inclinaison latérale en pas de côté, rad
  IDLE_BREATH: 0.030,       // respiration au repos (échelle du torse)
  IDLE_SWAY: 0.045,         // balancement au repos, rad

  /* ======================================================================
     ZIP 396 — LES QUATRE ANGLES QUI RÉPARENT « l'épée rentre dans le corps »
     ----------------------------------------------------------------------
     Ils ne sont pas décoratifs : ce sont les quatre écartements qui tiennent
     la lame et le flambeau LOIN du buste. tools/verify-rig.mjs les vérifie en
     construisant le vrai squelette et en testant les volumes deux à deux : si
     quelqu'un les remet à zéro un jour, l'outil échoue au lieu de laisser la
     pointe repasser par le crâne.

     TORCH_TILT est une inclinaison RÉSIDUELLE : poseFarmer annule d'abord
     l'angle cumulé du bras gauche, puis ajoute celle-ci. La torche penche donc
     toujours de 0,18 rad vers l'avant, quelle que soit la pose du bras. */
  /* ⚠️ LA HAUTEUR DU BASSIN, ET POURQUOI ELLE ARRIVE ICI AU 396.
     Elle valait 1,02 et elle était ÉCRITE DEUX FOIS dans rig.js — une fois
     dans buildFarmer (la position du joint), une fois dans poseFarmer (la
     ligne du rebond). Deux descriptions d'une même chose : la leçon du 387,
     dans le fichier même qui la cite.

     Et elle était FAUSSE. En cinématique directe, le point le plus bas des
     bottes tombait à y = -0,41 : le fermier avait les pieds enfoncés d'un
     tiers d'unité SOUS la dalle, en permanence, depuis le 395. Personne ne
     pouvait le voir en relisant — chaque segment pris séparément avait la
     bonne longueur, c'est leur SOMME qui dépassait. tools/verify-rig.mjs le
     trouve à sa neuvième question, qui ne lit aucune longueur : « aucun pied
     ne s'enfonce sous le sol ? ». */
  FARMER_HIP_Y: 1.40,       // hauteur du bassin au repos (1,02 au 395 : les pieds passaient sous la dalle)

  TORCH_TILT: -0.18,        // rad — inclinaison du flambeau, après annulation du bras
  ARM_OUT_GUARD: 0.30,      // rad — écartement du bras d'épée au repos (vers l'extérieur)
  ARM_OUT_SWING: 0.16,      // rad — ... pendant le coup, où le bras passe plus haut
  BLADE_OUT: 0.22,          // rad — la lame s'écarte encore de la jambe droite

  /* ======================================================================
     ZIP 396 — LA MORT D'UN RÔDEUR SE VOIT
     ----------------------------------------------------------------------
     Demande de Guillaume : « on sait pas quand on gagne (…) animation de
     désintégration et aspiration par le haut du monstre vaincu ». La créature
     ne s'affaisse plus : elle se défait en ses six membres, qui montent en
     tournant et s'effacent en fin de course. La montée est ACCÉLÉRÉE (en k²)
     — c'est ce qui distingue « aspiré » de « soulevé ». */
  KILL_VANISH_MS: 1500,     // durée totale de la désintégration
  KILL_RISE: 7.0,           // hauteur dont le corps monte pendant ce temps
  KILL_MOTES: 16,           // éclats qui montent avec lui (world.js)

  /* L'ATTAQUE EN TROIS TEMPS. Un coup d'épée qui n'est qu'un balayage n'a
     aucun poids : c'est l'ARMÉ qui donne la force, et la RÉCUPÉRATION qui
     donne le contrecoup. Les trois fractions se rapportent à SWING_MS. */
  SWING_WINDUP: 0.30,       // 0 → 30 % : on arme, l'épée part en arrière
  SWING_STRIKE: 0.55,       // 30 → 55 % : le coup, très rapide
  SWING_TWIST: 0.75,        // rotation du buste pendant le coup, rad
  HURT_RECOIL: 0.45,        // repli du buste quand on encaisse, rad

  /* ======================================================================
     CAMÉRA — troisième personne, comme l'image de référence
     ----------------------------------------------------------------------
     Elle est BASSE et PROCHE : c'est ce qui donne l'échelle des murs (on les
     regarde d'en dessous) et ce qui empêche de voir par-dessus. Elle se colle
     au fermier quand un mur la traverserait, plutôt que de le traverser. */
  CAM_DIST: 7.6,
  CAM_HEIGHT: 4.4,
  CAM_LOOK_H: 2.2,
  CAM_LAG: 9.0,             // suivi en POSITION (plus grand = plus rigide)
  CAM_MIN_DIST: 2.2,        // distance minimale quand un mur pousse la caméra
  /* ⚠️ DIVISÉ PAR DEUX AU 396. Retour de Guillaume : « la caméra bouge trop ».
     Une secousse de 0,35 unité à chaque coup reçu, sur une caméra déjà collée
     au personnage, se lit comme une perte de contrôle plutôt que comme un
     impact. 0,18 se sent encore et ne désoriente plus. */
  CAM_SHAKE_HURT: 0.18,

  /* ======================================================================
     ZIP 396 — LA CAMÉRA N'EST PLUS SOUDÉE AU CAP
     ----------------------------------------------------------------------
     Retour de Guillaume : « la caméra bouge trop, difficile à naviguer pour
     un simple clavier ». Le défaut n'était pas la vitesse de rotation mais le
     COUPLAGE : la caméra se plaçait à `CAM_DIST` derrière le cap COURANT du
     fermier, donc le moindre appui sur une flèche faisait pivoter tout le
     décor immédiatement et à la même vitesse que le personnage. Le lissage de
     position du 395 n'y pouvait rien — il lissait un point qui, lui, tournait
     déjà en bloc.

     Trois réglages, et ils travaillent ensemble :

       * CAM_ANG_LAG : la caméra a désormais SON PROPRE CAP, qui rattrape
         celui du fermier de façon exponentielle. On voit donc le fermier
         tourner DANS le cadre avant que le cadre ne tourne, ce qui est
         exactement ce qu'on veut ressentir ;
       * CAM_ANG_DEAD : en dessous de cet écart, la caméra ne bouge PAS du
         tout. C'est elle qui supprime le frémissement permanent des petites
         corrections de trajectoire ;
       * CAM_FOV : 74° était très large. Un champ large amplifie tout
         mouvement de rotation sur les bords de l'image — c'est le mécanisme
         du mal des transports en jeu. 66° calme sans rétrécir le couloir de
         façon perceptible (les murs font 11 unités et la caméra est à 4,4). */
  CAM_ANG_LAG: 3.6,         // rattrapage du cap de la caméra, par seconde
  CAM_ANG_DEAD: 0.11,       // rad — en deçà, la caméra ne bouge pas
  CAM_FOV: 66,              // degrés (74 au 395)

  /* ======================================================================
     ZIP 396 — LE RECALAGE SUR LE COULOIR
     ----------------------------------------------------------------------
     Seconde moitié de la réponse à « difficile à naviguer pour un simple
     clavier ». Le dédale est à angles droits ; un joueur au clavier, lui, ne
     lâche jamais sa flèche pile sur l'axe. Il avance donc en biais, frotte un
     mur, corrige, frotte l'autre — et c'est CE frottement permanent qui rend
     la conduite pénible, pas la vitesse de rotation.

     Quand aucune flèche de rotation n'est enfoncée ET que le fermier avance,
     son cap glisse doucement vers le multiple de 90° le plus proche, mais
     SEULEMENT s'il en est déjà proche (SNAP_WINDOW). Au-delà, on ne touche à
     rien : le joueur qui vise délibérément en diagonale (pour frapper une
     créature de biais, par exemple) garde la main.

     ⚠️ C'EST UNE RÈGLE, donc elle vit dans rules.js et pas dans world.js. Un
     recalage fait au rendu aurait fait diverger l'affichage du moteur, et
     tous les outils auraient continué de mesurer l'ancien jeu. */
  SNAP_WINDOW: 0.42,        // rad — écart max au multiple de 90° pour que le recalage agisse
  SNAP_SPEED: 1.9,          // rad/s — vitesse du recalage (bien plus lent que TURN_SPEED)

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

  /* ======================================================================
     ZIP 397 — LES HUIT TEINTES QUE LA REFONTE DES TEXTURES A DEMANDÉES
     ----------------------------------------------------------------------
     Guillaume : « beaucoup trop d'amateurisme dans les textures des murs et
     du sol ». En regardant enfin les PNG (tools/render-textures.mjs), la
     cause principale saute aux yeux : le mur du 396 n'avait que DOUZE niveaux
     de gris, parce qu'il n'était peint qu'avec les trois teintes de la
     carrière. Trois teintes ne font pas une matière.

     Ces huit-là ne sont pas des variantes des précédentes : chacune décrit un
     PHÉNOMÈNE physique qu'on ne peut pas obtenir en mélangeant les autres.

     ⚠️ TOUTES PROPRES AU LABYRINTHE, donc déclarées dans le OWN de
     tools/verify-palette.mjs. Le défi de fuite n'a ni suie (il n'a pas de
     torches murales), ni parchemin (il n'a pas de carte), ni craie. Les lui
     imposer, ce serait faire dériver sa palette pour une raison qui ne le
     concerne pas — l'inverse exact de ce que ce contrôle protège. */
  COL_SAND:       0xd9c795,   // usure claire : l'arête polie, le sillon du sol
  COL_SOOT:       0x1c1712,   // suie, en haut des murs — il y a une torche tous les 3 m
  COL_OCHRE:      0x7a5a2c,   // coulure ferrugineuse sous un joint qui suinte
  COL_CHALK:      0xe8e2cf,   // les marques laissées par ceux qui sont passés avant
  COL_PARCH:      0xd8c79a,   // le vélin de la carte
  COL_PARCH_DARK: 0xa8905f,
  COL_PARCH_INK:  0x2d1f10,
  COL_MAPGLOW:    0x9fd8ff,   // l'encre luisante du plan, et son halo sur le mur

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
CFG.MAZE_BRAID = 0.36;      // part des culs-de-sac rouverts (0 = labyrinthe parfait)
CFG.MAZE_ROOMS = 4;         // salles creusées dans le dédale (respirations + repères)
CFG.MAZE_ROOM_MIN = 2;
CFG.MAZE_ROOM_MAX = 4;
/* La BANDE de longueur du plus court chemin entrée→sortie, en cellules. Les
   deux bornes comptent : sans la haute, 2 000 graines produisaient des trajets
   optimaux de 48 à 311 cellules, soit des parties de 3 à 20 minutes tirées au
   sort avant le premier pas. Voir le commentaire de make() dans maze.js. */
CFG.MAZE_MIN_PATH = 40;
CFG.MAZE_MAX_PATH = 64;
CFG.MAZE_TORCHES = 20;      // brasiers ravivables posés dans tout le dédale
CFG.TORCH_MAX_GAP = 8;     // ⚠️ garantie dure : jamais plus de N cellules sans brasier sur le chemin

/* =============================================================================
   ZIP 397 — LA VUE À LA PREMIÈRE PERSONNE
   -----------------------------------------------------------------------------
   Guillaume : « Conçois le maze en un first person pov convaincant (…) mais en
   1st person shooter maintenant (…) ce doit être au niveau des first person
   shooters existants. »

   La bascule avait été PROPOSÉE au 394 et refusée alors, pour une raison qui
   était bonne à ce moment-là : ses deux images de référence étaient des vues à
   la troisième personne. Elle est maintenant demandée explicitement, et elle
   change beaucoup plus que la position de la caméra.

   ⚠️ CE QUI FAIT QU'UNE VUE SUBJECTIVE EST « CONVAINCANTE », dans l'ordre
   d'importance mesuré en jouant — et aucun de ces quatre points n'est un
   réglage de caméra :

     1. LA SOURIS. Une vue subjective au clavier n'existe pas. Le pointeur est
        capturé (pointer lock), la souris donne le lacet ET le tangage, et le
        clavier ne fait plus QUE se déplacer — ZQSD/WASD deviennent quatre
        directions, plus une seule flèche pour tourner quand on n'a pas de
        souris. C'est le changement qui compte le plus ;
     2. LE MODÈLE DE VUE (« viewmodel »). Des mains, une torche, une arme,
        rendus DANS UNE SECONDE PASSE avec leur propre caméra. C'est ce qui
        empêche l'arme de rentrer dans le mur quand on s'y colle — le défaut
        le plus reconnaissable d'un FPS bâclé — et ça ne s'obtient d'aucune
        autre façon ;
     3. LE BALANCEMENT. La tête monte et descend AVEC LA FOULÉE (donc à la
        DISTANCE parcourue, exactement comme le cycle de marche du 395), l'arme
        traîne derrière la rotation, et le pas se sent dans le poignet. Sans
        ça, on glisse comme un chariot sur des rails ;
     4. LE RÉTICULE. Il doit dire quand la cible est à portée, sinon on frappe
        dans le noir — c'est le reproche exact du 396, transposé.

   ⚠️ ET LE TANGAGE N'EXISTE PAS POUR LE MOTEUR. `pitch` vit dans world.js,
   jamais dans rules.js : le sol du labyrinthe est plat (à la rotonde près), on
   ne peut ni sauter ni viser en hauteur, et une épée ou un carreau part
   toujours à l'horizontale. C'est un choix, et il a une conséquence heureuse :
   les dix outils continuent de rejouer EXACTEMENT le même jeu, parce que rien
   de ce qui décide n'a bougé. La caméra a changé, la simulation non.
   ========================================================================== */
CFG.EYE_H = 3.4;              // hauteur des yeux — un fermier fait ~4 unités
CFG.FPS_FOV = 78;             /* plus large que les 66° de la 3e personne : en vue
                                 subjective, un champ étroit donne l'impression de
                                 regarder par une meurtrière, et surtout il cache
                                 les embranchements latéraux — ce qui est
                                 rédhibitoire quand on demande « naviguer de
                                 manière absolument évidente ». */
CFG.MOUSE_SENS = 0.0022;      // rad par pixel de souris
CFG.PITCH_MAX = 0.85;         // rad — on ne se casse pas la nuque
CFG.PITCH_LERP = 22.0;        // rattrapage du tangage affiché (lissage d'affichage)
/* LE BALANCEMENT DE MARCHE. `BOB_*` est une amplitude en unités, avancée à la
   DISTANCE parcourue (st.gait), jamais au temps — même règle qu'au 395, et
   pour la même raison : au temps, ça patine dès qu'on ralentit. */
CFG.BOB_V = 0.115;            // montée/descente de la tête par pas
CFG.BOB_H = 0.075;            // dérive latérale (elle est à la MOITIÉ de la cadence)
CFG.BOB_ROLL = 0.019;         // roulis de la tête, rad
CFG.BOB_RUN = 1.7;            // le balancement est amplifié en course
CFG.STEP_LAND = 0.05;         // petit choc vertical à la pose du pied
/* LE MODÈLE DE VUE. Rendu par une SECONDE caméra, dans une seconde passe, avec
   son propre champ (plus étroit : une arme filmée à 78° paraît difforme). */
CFG.VM_FOV = 55;
CFG.VM_SWAY = 0.055;          // amplitude du retard de l'arme sur la rotation
CFG.VM_SWAY_LAG = 7.0;        // vitesse à laquelle elle rattrape
CFG.VM_BOB = 0.030;
CFG.VM_LOWER = 0.16;          // l'arme descend quand on court

/* =============================================================================
   ZIP 397 — LA CARTE LUISANTE, LES INDICES, L'ARBALÈTE
   -----------------------------------------------------------------------------
   Trois demandes, dont une explicite : « avoir un bonus qui permet de voir le
   plan du maze (quand on trouve une carte luisante accrochée au mur) », et
   « ajoute des indices et armes si tu veux ».

   ⚠️ LA CARTE EST UN OBJET, PAS UNE OPTION. Elle est accrochée à un MUR, à une
   profondeur moyenne, et elle luit — donc on la voit d'un couloir plus loin,
   comme l'autel de l'épée. Tant qu'on ne l'a pas, la minicarte ne montre que
   ce qu'on a VU ; une fois ramassée, elle montre le plan ENTIER, la sortie et
   la rotonde. C'est exactement la différence entre « je suis perdu » et « je
   sais où aller mais pas comment » — la seconde est le jeu, la première est
   une panne.

   ⚠️ LES INDICES SONT DES MARQUES DE CRAIE, laissées par ceux qui sont passés
   avant. Une FLÈCHE aux carrefours du chemin de la sortie, une CROIX devant un
   trou, une MAIN quand un brasier est proche. Elles ne sont pas décoratives :
   sans elles, « naviguer de manière absolument évidente » est impossible dans
   un dédale de 289 cellules sans plan — et avec un plan, il n'y aurait plus de
   labyrinthe. La craie est la troisième réponse : elle aide LOCALEMENT, au
   moment de choisir, sans jamais montrer l'ensemble.
   ========================================================================== */
CFG.MAP_DEPTH_MIN = 8;        // profondeur BFS minimale où poser la carte
CFG.MAP_DEPTH_MAX = 18;       // ... et maximale : trouvée en explorant, pas offerte
CFG.MAP_GLOW_RANGE = 34.0;    // distance à laquelle son halo se voit
CFG.CHALK_ARROWS = 14;        // flèches posées aux carrefours du chemin
CFG.CHALK_CROSSES = 9;        // croix devant les trous
CFG.CHALK_HANDS = 8;          // mains vers les brasiers
CFG.CHALK_H = 4.2;            // hauteur des marques sur le mur : à hauteur d'œil

/* L'ARBALÈTE — la seconde arme, et le seul moyen de toucher à distance.
   ⚠️ ELLE NE REND PAS LE JEU PLUS FACILE, elle le rend plus LISIBLE. Le
   reproche du 396 (« on sait pas quand on gagne, si on touche ») venait d'un
   combat entièrement au contact, dans le noir, au clavier. Un carreau qu'on
   voit partir, voler et se planter dit sans un mot ce qui s'est passé.
   Les munitions sont RARES et se ramassent : on ne remplace pas l'épée, on
   ouvre un échange qu'on ne pouvait pas gagner. */
CFG.BOW_DEPTH_MIN = 10;       // posée plus loin que l'épée : c'est la seconde trouvaille
CFG.BOLTS_START = 5;
CFG.BOLT_PICKUPS = 7;         // carreaux posés dans le dédale
CFG.BOLT_PER_PICKUP = 3;
CFG.BOLT_SPEED = 62.0;        // unités/s — rapide, mais on le VOIT partir
CFG.BOLT_DAMAGE = 2;          // un rôdeur a 2 PV : un carreau bien placé le tue
CFG.BOLT_COOLDOWN_MS = 900;   // le rechargement d'une arbalète est lent, c'est son prix
CFG.BOLT_LIFE_MS = 1400;
CFG.BOLT_R = 0.55;            // rayon de collision du carreau
CFG.BOLT_STALK_STAGGER_MS = 1500;   // sur le traqueur : il recule, il ne meurt pas

/* =============================================================================
   ZIP 397 — LA RÉSOLUTION DES TEXTURES, ET POURQUOI ELLE EST ICI
   -----------------------------------------------------------------------------
   Elle vivait en dur dans world.js (« 128 »), ce qui est exactement la faute
   que ce fichier existe pour empêcher : un nombre de rendu écrit ailleurs que
   dans config.js, donc introuvable, donc jamais rejugé. Elle est aussi lue par
   tools/render-textures.mjs et tools/verify-textures.mjs — trois lecteurs, une
   seule écriture.

   ⚠️ LE PASSAGE DE 128 À 512 N'EST PAS UN CONFORT, C'EST LA CONDITION DE TOUT
   LE RESTE. Une tuile couvre une demi-cellule de mur, soit 5,75 unités : à 128
   px, un bloc de pierre reçoit 30 pixels, et il n'y a physiquement pas la place
   d'y mettre un chanfrein, un grain et une piqûre. Le mur du 396 n'était pas
   mal dessiné, il était dessiné TROP PETIT — et c'est pour ça que quatre
   refontes n'y avaient rien changé.

   Le coût est de ~0,25 s à la construction de la scène, une seule fois,
   derrière l'écran de chargement du 396. La mémoire vidéo tient : quatre
   textures de 512² en RGBA, mipmaps comprises, font 5,5 Mo.
   ========================================================================== */
CFG.TEX_WALL = 512;
CFG.TEX_FLOOR = 512;
/* Une tuile de mur couvre WALL_TILE unités en largeur ET en hauteur. C'est ce
   qui donne une DENSITÉ DE TEXELS CONSTANTE : world.js calcule la répétition
   de chaque mur à partir de sa longueur réelle, au lieu d'étirer une tuile sur
   un mur de 11,5 et de la comprimer sur un mur de 2. Le 396 faisait ça, et
   c'est pourquoi les blocs n'avaient pas la même taille selon le mur regardé —
   défaut qu'aucun outil ne voyait et qui saute aux yeux dès qu'on regarde. */
CFG.WALL_TILE = 5.75;
CFG.FLOOR_TILE = 11.5;      // une tuile de sol = une cellule pile

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

/* =============================================================================
   ZIP 399 — LE BUDGET DE RENDU. Trois niveaux, et un seul levier continu.
   -----------------------------------------------------------------------------
   Le 399 est une passe de DÉBOGAGE : le jeu était injouable (une à deux images
   par seconde sur un MacBook Pro M4, navigateur à fermer de force). Rien ici ne
   change ce qu'on voit — seulement ce que ça coûte. Voir l'en-tête du groupe de
   lumières dans world.js pour la cause racine.

   ⚠️ `lights` EST FIGÉ POUR TOUTE LA DURÉE D'UNE PARTIE. C'est le nombre de
   PointLight réellement présentes dans la scène, et three.js le compile en dur
   dans chaque shader : le changer en cours de route recompile tout et gèle une
   seconde. Le niveau se choisit donc à l'écran-titre ou à la pause, et
   l'auto-détection, elle, ne joue QUE sur la résolution — qui, elle, ne
   recompile rien.

   ⚠️⚠️ D'OÙ VIENNENT CES TROIS NOMBRES — ILS ONT ÉTÉ BALAYÉS, PAS CHOISIS.
   (Règle du zip 387 : quand une géométrie résiste, balayer plutôt que deviner.)

   tools/verify-perf.mjs joue de vraies parties et calcule, en des milliers de
   points de surface RÉELLEMENT VISIBLES — dans le champ, face à nous, non
   masqués par un mur — l'éclairement obtenu avec les 122 foyers puis avec le
   pool. Il rend l'écart en NIVEAUX DE GRIS SUR 255, écrêté à 255 comme le fait
   l'écran et pondéré par le brouillard. Voici la courbe, sur quatre parties :

     pool │ écart moyen │  p95  │  p99  │ maximum
     ─────┼─────────────┼───────┼───────┼─────────
        8 │     9,5     │ 39,5  │ 54,8  │  103
       12 │     5,0     │ 25,6  │ 41,6  │   95
       16 │     3,7     │ 21,6  │ 34,5  │   80
       24 │     1,6     │ 10,3  │ 22,3  │   44
       32 │     0,8     │  5,9  │ 14,8  │   30
       40 │     0,3     │  2,4  │  6,5  │   21
       48 │     0,1     │  0,6  │  3,0  │  8,8
       64 │     0,1     │  0,2  │  2,4  │  8,8   ← identique à 48

   La courbe est PLATE à partir de 48 : au-delà, on paie des lumières qui ne
   changent plus un seul pixel. En dessous de 24, l'écart devient lisible sur
   les dalles lointaines de la rotonde — c'est là que le jeu montre le plus de
   flammes à la fois, et c'est donc le cas qui dimensionne.

   **40 pour le niveau Haute** : écart moyen de 0,3/255 et 99 % des points sous
   6,5/255, c'est-à-dire trois fois moins que le plus petit pas qu'un écran
   sache montrer sur une pente sombre. C'est le point où l'on paie encore
   quelque chose ET où l'image est celle du 398.

   ⚠️ TOUTE MODIFICATION DE CES TROIS NOMBRES DOIT ÊTRE RELANCÉE CONTRE
   verify-perf.mjs. Et si un contrôle échoue, se demander D'ABORD s'il a raison
   (corollaire n°3 du zip 379) : la correction est d'agrandir le pool, jamais de
   baisser le seuil.

   ⚠️ `maxRes` EST UN PLAFOND, PAS UNE CONSIGNE. Le jeu part au plafond de son
   niveau et ne descend que s'il n'y arrive pas. Sur une machine confortable,
   l'échelle reste à 1,0 et l'image est exactement celle du 398.
   ========================================================================== */
CFG.QUAL = {
  /* Haute : le rendu du 398 À L'IDENTIQUE. Pleine résolution Retina, relief de
     la pierre intact, quarante lampes de décor en plus de la torche du joueur —
     écart mesuré : 0,3/255 en moyenne. */
  high: { lights: 40, maxRes: 1.00, minRes: 0.70, label: "high" },
  /* Moyenne : vingt lampes et 80 % de la surface, soit 36 % de pixels en moins.
     Sur du pixel-art filtré en NEAREST la baisse de définition ne se lit
     presque pas ; l'écart d'éclairement monte à 2,4/255, ce qui reste sous le
     seuil de visibilité sur les zones sombres. */
  med:  { lights: 20, maxRes: 0.80, minRes: 0.55, label: "med" },
  /* Basse : pour les machines sans GPU dédié et pour la tablette qui vient.
     Dix lampes et 62 % de la surface. Là, oui, les dalles lointaines de la
     rotonde s'assombrissent — c'est le compromis assumé de ce niveau, et c'est
     pour ça qu'il n'est jamais choisi tout seul sur une machine qui tient. */
  low:  { lights: 10, maxRes: 0.62, minRes: 0.45, label: "low" },
};
CFG.QUAL_DEFAULT = "high";

/* Le fondu d'un créneau de lumière qui change de main, en secondes. Trop court,
   ça clignote ; trop long, une lampe qu'on dépasse traîne derrière soi. 0,22 s
   est la valeur retenue : c'est le temps qu'il faut pour parcourir 1,6 unité à
   la marche, soit un septième de cellule. */
CFG.LIGHT_FADE = 0.22;

/* --- LA RÉSOLUTION ADAPTATIVE.
   On mesure la MÉDIANE des N dernières images, jamais la moyenne : une seule
   image longue (un ramasse-miettes, une notification du système) ferait
   chuter une moyenne et déclencherait une baisse de qualité pour rien.
   Les quarante premières images sont ignorées — ce sont celles qui paient la
   compilation des shaders, et elles ne disent rien de la vitesse du jeu. */
CFG.RES_SAMPLES = 40;         // taille de la fenêtre de mesure
CFG.RES_WARMUP = 40;          // images ignorées au démarrage
CFG.RES_SLOW_MS = 20.0;       // au-delà (soit < 50 i/s), on descend
CFG.RES_FAST_MS = 12.5;       // en deçà (soit > 80 i/s), on remonte
CFG.RES_DOWN = 0.86;          // facteur de descente
CFG.RES_UP = 1.07;            // facteur de remontée, plus lent que la descente
CFG.RES_COOLDOWN_MS = 900;    // délai minimum entre deux changements

/* --- LE CHIEN DE GARDE DE LA SOURIS.
   Le pointeur capturé est la norme du genre et il n'est pas en cause dans le
   ralentissement — mais à une image par seconde il devient un PIÈGE : Échap
   n'est plus traité assez vite pour rendre la main, et il ne reste que
   command+Q. On relâche donc le pointeur tout seul si les images s'effondrent,
   et on dit pourquoi. Ce filet ne doit JAMAIS se déclencher sur un jeu qui
   tourne : 500 ms est vingt-cinq fois le budget d'une image à 50 i/s. */
CFG.HANG_MS = 500;            // une image plus longue que ça est « effondrée »
CFG.HANG_STRIKES = 4;         // combien d'affilée avant de rendre la souris

if (typeof module === "object" && module.exports) module.exports = { CFG };
