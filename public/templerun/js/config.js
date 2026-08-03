/* =============================================================================
   config.js — TOUS les réglages de gameplay, au même endroit.
   -----------------------------------------------------------------------------
   Prototype "Temple Run" du monde maléfique de Ferme Vallée.
   Tout ce qui se règle à la main vit ici. Rien d'autre dans le projet ne doit
   contenir de nombre magique de gameplay : si tu veux que le jeu soit plus dur,
   plus rapide ou plus permissif, c'est ce fichier et lui seul.

   Unités : 1 unité de monde ≈ 1 mètre. Le couloir fait 3 voies.
   ========================================================================== */

const CFG = {

  /* ---------------------------------------------------------------- PISTE */
  LANE_COUNT: 3,
  LANE_WIDTH: 2.6,          // écart entre deux voies
  TRACK_WIDTH: 8.4,         // largeur de la dalle de pierre (3 voies + bordures)
  FLOOR_TILE: 4,            // longueur d'une dalle (le sol est pavé de dalles)
  FLOOR_THICKNESS: 0.6,

  // Tronçons rallongés au zip 374. Les zones sans obstacle autour des virages
  // sont désormais CALCULÉES depuis la physique (voir les dérivés en bas de
  // fichier) et valent ~26 u en sortie de virage + ~44 u avant le suivant :
  // sur un tronçon de 48 u il ne restait plus une seule place utilisable, et
  // la piste devenait déserte.
  NODE_LEN_MIN: 68,
  NODE_LEN_MAX: 112,

  /* Fenêtre de streaming RESSERRÉE au 374, et c'est ce qui finance tout le
     nouveau décor. Le raisonnement, mesuré et non estimé : avec
     FOG_NEAR_DENSITY à 0,019, un objet posé à 150 unités est déjà noyé à
     99,97 % dans le brouillard. Garder 5 tronçons de ~90 unités revenait donc
     à construire 450 unités de piste dont on n'en voyait que 150.

     4 devant (≈ 360 u) laisse une marge confortable, 1 derrière suffit
     largement aux loups : ils ne s'éloignent jamais de plus de CHASE_MAX + le
     décalage du dernier loup, soit ~26 unités, quand le tronçon le plus court
     en fait 68. */
  NODES_AHEAD: 4,           // tronçons construits devant le joueur
  NODES_BEHIND: 1,          // tronçons conservés derrière (pour voir les loups)

  /* --------------------------------------------------------------- VITESSE */
  SPEED_START: 16,          // vitesse au départ (unités/s)
  SPEED_MAX: 34,            // plafond
  SPEED_RAMP_DIST: 2600,    // distance sur laquelle on passe de START à MAX
  STUMBLE_SPEED_MULT: 0.45, // vitesse pendant un trébuchement
  STUMBLE_MS: 620,          // durée du trébuchement
  STUMBLE_RECOVER_MS: 500,  // remontée progressive après le trébuchement

  /* ---------------------------------------------------------------- JOUEUR */
  PLAYER_RADIUS: 0.55,
  PLAYER_HEIGHT: 1.7,
  LANE_CHANGE_SPEED: 13,    // vitesse de glissement latéral (unités/s)
  JUMP_VELOCITY: 9.2,
  GRAVITY: 26,
  JUMP_CLEAR_HEIGHT: 1.05,  // hauteur à partir de laquelle on passe une barrière basse
  SLIDE_MS: 620,
  SLIDE_HEIGHT: 0.75,       // hauteur du gabarit en glissade
  COYOTE_MS: 110,           // tolérance de saut juste après avoir quitté le sol
  INPUT_BUFFER_MS: 160,     // une entrée un poil trop tôt reste valable

  /* ------------------------------------------------------ GLISSADE (POSE) --
     Refonte du zip 374. L'ancienne glissade couchait le fermier sur le FLANC
     à 70° : vu de la caméra arrière, ça ne se lisait pas comme une glissade
     mais comme une chute, et la bascule symétrique entrée/sortie donnait un
     mouvement mécanique.

     Nouvelle pose, celle de Temple Run : pieds devant, buste renversé en
     arrière, une main plantée au sol qui traîne, jambe arrière repliée sous
     le corps. Elle se lit DE DOS, parce que c'est la silhouette qui change
     (le corps devient long et bas) et non l'orientation.

     Entrée et sortie sont volontairement ASYMÉTRIQUES : on se jette au sol
     plus vite qu'on ne s'en relève. C'est ce qui fait la différence entre un
     geste et une interpolation. */
  SLIDE_IN_MS: 105,         // plongeon au sol : bref et sec
  SLIDE_OUT_MS: 185,        // relevé : plus lent, avec un rebond (voir SLIDE_POP)
  SLIDE_LEAN: 0.95,         // bascule du bassin vers l'arrière (rad, ~54°)
  SLIDE_DROP: 0.30,         // abaissement du bassin, en plus de la bascule
  SLIDE_PELVIS_Y: 0.55,     // hauteur du pivot du bassin au repos
  SLIDE_POP: 0.16,          // ampleur du rebond vertical au relevé
  SLIDE_DUST_COUNT: 14,     // bouffées de poussière recyclées sous le fermier
  SLIDE_DUST_MS: 420,       // durée de vie d'une bouffée

  /* --------------------------------------------------------------- VIRAGES */
  TURN_INPUT_WINDOW: 16,    // distance AVANT le virage où l'entrée est acceptée
  TURN_GRACE_AFTER: 3.5,    // tolérance APRÈS le point de virage
  TURN_CHANCE_START: 0.22,  // probabilité qu'un tronçon se termine par un virage
  TURN_CHANCE_MAX: 0.5,
  TURN_MIN_GAP_NODES: 1,    // nb de tronçons droits minimum entre deux virages

  /* --- Zones sans obstacle autour d'un virage. NE PAS RÉGLER À LA MAIN : ---
     TURN_CLEAR_AFTER et TURN_CLEAR_BEFORE sont calculées en bas de fichier
     depuis la physique du joueur et de la caméra. Les valeurs devinées du
     zip 372 (16 avant / 14 après) étaient très en dessous du nécessaire,
     d'où les obstacles littéralement inévitables signalés en jeu.

     En SORTIE de virage, le joueur est aveugle deux fois : la caméra met
     TURN_CAM_SETTLE_S à se réaligner (constante de temps de CAM_YAW_LERP),
     et il lui faut ensuite TURN_REACT_S pour réagir à ce qu'il découvre.
     En ENTRÉE de virage, la dernière parade doit être TERMINÉE avant que
     s'ouvre la fenêtre d'armement : tant qu'il saute, il ne peut pas armer,
     et un virage non armé tue. */
  TURN_CAM_SETTLE_S: 0.35,  // temps de réalignement de la caméra après un virage
  TURN_REACT_S: 0.30,       // temps de réaction humain admis
  ENTRY_CLEAR_STRAIGHT: 10, // zone d'entrée d'un tronçon qui NE sort PAS d'un virage
  END_CLEAR_STRAIGHT: 10,   // zone de fin d'un tronçon qui ne tourne PAS

  /* --------------------------------------------- BIFURCATION OFFROAD ------
     Zip 377. Le défi n'avait AUCUNE fin « victoire » : une fois lancé, on ne
     pouvait que se faire rattraper ou abandonner, et les deux comptaient
     comme une défaite. Un embranchement apparaît désormais à intervalle
     RÉGULIER EN DISTANCE (et non en temps réel — tout le reste de la config
     raisonne en unités parcourues depuis le zip 373) et permet de quitter la
     course sain et sauf.

     COMMANDE : exactement la grammaire du virage (décision Guillaume).
     Dans les TURN_INPUT_WINDOW dernières unités, appuyer vers le côté de
     l'embranchement fait sortir ; ne rien faire continue tout droit. La
     différence avec un vrai virage est capitale et voulue : ici, ne rien
     faire est le comportement SÛR. Un embranchement n'est jamais mortel.

     PAS DE SORTIE ACCIDENTELLE, et ce n'est pas une promesse en l'air : un
     tronçon qui porte un embranchement se voit appliquer la MÊME zone sans
     obstacle qu'un tronçon qui tourne (TURN_CLEAR_BEFORE, calculée). Le
     joueur n'a donc aucune raison de changer de voie dans la fenêtre
     d'armement — il n'y a rien à esquiver. Revérifié par verify-offroad.js. */
  OFFROAD_EVERY: 4000,      // distance entre deux embranchements (unités ≈ mètres)
  OFFROAD_HUD_DIST: 400,    // distance à partir de laquelle le HUD annonce la sortie
  OFFROAD_MOUTH: 16,        // longueur de la trouée dans la bordure, côté embranchement
  OFFROAD_BRANCH_LEN: 132,  // longueur de la branche construite (voir ESCAPE_TOTAL_MS)

  /* --------------------------------------------- SÉQUENCE DE SORTIE -------
     Décrite par Guillaume : le joueur se retourne essoufflé, on voit la meute
     continuer tout droit, il court seul 3 secondes, fondu enchaîné lent, puis
     la carte 2D du monde sombre.

     ESCAPE_TOTAL_MS borne la longueur de branche nécessaire : à SPEED_MAX
     (34 u/s), 3 s font 102 unités. OFFROAD_BRANCH_LEN garde 30 unités de
     marge, et verify-offroad.js vérifie que le joueur n'atteint JAMAIS le
     bout de la branche (sortir par le vide au dernier dixième de seconde
     serait la pire fin possible). */
  /* RALLONGÉE ET APAISÉE (retour de Guillaume). Ce qui rendait la première
     version agitée n'était pas sa durée mais le fait que RIEN ne s'y arrêtait
     jamais : la caméra atteignait son point de vue le plus intéressant et
     repartait aussitôt, et le fermier traversait toute la scène à 34 u/s.
     Trois changements, dans l'ordre de leur effet :

       1. la caméra MARQUE UN TEMPS sur la meute (ESCAPE_LOOKBACK_HOLD) au
          lieu de la balayer ;
       2. le fermier RALENTIT jusqu'à un petit trot (ESCAPE_JOG_SPEED) — il
          vient d'échapper à une meute, il souffle. La foulée étant cadencée
          sur la distance, elle se calme d'elle-même, sans une ligne de plus ;
       3. les courbes d'entrée et de sortie du regard sont en sinusoïde
          adoucie plutôt qu'en cubique sèche. */
  ESCAPE_TOTAL_MS: 4400,      // durée totale de la séquence, avant le passage à la ferme

  /* Le regard en arrière est calé sur la GÉOMÉTRIE, pas au jugé. Au moment du
     virage, la meute est 17 à 22 unités derrière (CHASE_START/CHASE_MAX) et
     court toujours à la vitesse du fermier avant sa sortie : elle franchit
     donc l'embranchement environ 0,6 s plus tard. C'est là qu'il faut la
     regarder — et il faut continuer de la regarder pendant qu'elle s'éloigne,
     d'où le palier.

     Les bornes sont contraintes des deux côtés. Trop tôt : le fermier est
     encore collé au coin, qui remplit le cadre. Trop tard : la meute est
     partie trop loin sur le côté (elle sort du champ vers 45° du centre) et le
     brouillard l'a mangée — à 0,019 de densité, 21 unités laissent encore 85 %
     de visibilité, 60 n'en laissent plus que 20 %. La fenêtre utile va donc de
     ~0,65 s à ~1,25 s, et c'est exactement le palier. */
  ESCAPE_LOOKBACK_MS: 2600,    // fenêtre complète du regard en arrière
  ESCAPE_LOOKBACK_RISE: 0.25,  // fraction consacrée à se retourner (=> ~650 ms)
  ESCAPE_LOOKBACK_HOLD: 0.48,  // fin du palier (=> ~1250 ms) ; le reste est le retour
  ESCAPE_LOOKBACK_TORSO: 1.20, // rotation du buste (rad)
  ESCAPE_LOOKBACK_HEAD: 0.55,  // rotation de la tête EN PLUS du buste
  ESCAPE_BREATH_HZ: 1.5,       // cadence du souffle — ralentie avec le reste
  ESCAPE_BREATH_AMP: 0.055,

  /* Décélération. Le fermier ne s'arrête pas (il fuit encore) mais passe de sa
     vitesse de course à un trot. Décroissance exponentielle : brutale au début,
     elle s'aplatit — c'est la forme d'un coureur qui lâche l'effort, et non
     d'un curseur qu'on descend. */
  ESCAPE_JOG_SPEED: 13,        // vitesse d'équilibre du trot (u/s)
  ESCAPE_DECEL_TAU_MS: 1400,   // constante de temps de la décélération

  /* Le fondu commence EXACTEMENT quand la caméra a fini de revenir vers
     l'avant (4400 - 1800 = 2600 = ESCAPE_LOOKBACK_MS). Le fermier court donc
     seul, face à la route, pendant toute la durée du fondu — ce que Guillaume
     a décrit. Si l'une des deux valeurs bouge, l'autre doit suivre, et
     verify-offroad.js vérifie que la séquence tient dans la branche. */
  ESCAPE_FADE_MS: 1800,
  ESCAPE_MIST_MULT: 2.3,      // épaississement de la brume au bout de la branche

  /* ============================ PROGRESSION DU DÉCOR (zip 379) ============
     Demande de Guillaume, sur captures : la course commence sur une CHAUSSÉE
     DE PIERRE À RAMBARDES, traduction 3D de la jetée 2D du monde sombre, puis
     bascule progressivement sur la plateforme flottante actuelle — celle
     qu'il appelle « AA » et qu'il trouve réussie. Trois états au moins, et
     surtout aucune couture visible entre eux.

     UN SEUL PARAMÈTRE porte toute la progression : `stage`, continu de 0
     (pierre pleine) à 1 (AA). L'hybride n'est pas un troisième décor écrit à
     part, c'est stage ≈ 0,5 — et c'est ce qui garantit qu'il n'y a nulle part
     de bascule. Chaque élément l'interprète à sa façon : la rambarde
     s'affaisse, les dalles se délitent, les torches s'éteignent, les blocs
     tombent à l'eau.

     OÙ S'ARRÊTE LA PIERRE : AU PREMIER VIRAGE (décision Guillaume). Ce n'est
     pas une distance mais un ÉVÉNEMENT de la piste, et c'est bien mieux
     qu'un nombre : la chaussée de pierre est droite, comme la jetée dont elle
     sort, et le premier virage est exactement le moment où le joueur quitte
     l'axe du monde sombre. DECOR_STONE_MAX n'est qu'un garde-fou pour les
     graines où le premier virage tarde — une section de pierre de 1200 m
     ferait de AA l'exception. */
  DECOR_STONE_MAX: 700,     // borne haute de la section de pierre, si le 1er virage tarde
  DECOR_BLEND_LEN: 340,     // longueur du fondu pierre -> AA (c'est l'« hybride »)

  /* Brume cyclique. « Un très léger effet brouillard qui se dissipera très
     très progressivement et reviendra aussi progressivement tous les
     4000 mètres. » La période est celle des bifurcations offroad, et ce n'est
     pas un hasard qu'on subit : la brume est au plus épais PILE sur les
     embranchements, donc elle les annonce. C'est exactement ce que demandait
     le schéma de Guillaume au zip 377 (« brume qui s'épaissit vers la
     sortie »), obtenu ici pour tout le tracé au lieu de la seule branche. */
  FOG_CYCLE_DIST: 4000,     // doit rester égal à OFFROAD_EVERY
  FOG_CYCLE_MULT: 1.42,     // densité au sommet du cycle (1 = pas de cycle)

  /* Arbres morts submergés. Décision Guillaume : panneaux peints au loin,
     boîtes tout près. Le choix se fait sur le DÉCALAGE LATÉRAL de l'arbre,
     qui est fixe, et jamais sur sa distance au joueur — sans quoi un arbre
     changerait de nature sous les yeux du joueur en s'approchant. */
  TREE_BILLBOARD_OFF: 11,   // au-delà de cet écart latéral, l'arbre est un panneau
  TREE_BILLBOARD_VARIANTS: 4,

  /* ------------------------------------------------------------- OBSTACLES */
  OBST_SPACING_MIN: 15,     // distance minimale entre deux obstacles
  OBST_DENSITY_START: 0.45, // proportion des emplacements réellement occupés
  OBST_DENSITY_MAX: 0.85,
  OBST_DENSITY_RAMP_DIST: 2200,
  OBST_START_SAFE_DIST: 90, // aucun obstacle sur les 90 premières unités
  GAP_LENGTH: 4.6,          // longueur d'un trou pleine largeur (saut obligatoire)
  LOW_HEIGHT: 0.95,         // barrière basse : à sauter
  HIGH_CLEARANCE: 1.15,     // poutre haute : à passer en glissade

  /* ZIP 381 — LA PLANCHE TOMBÉE EN TRAVERS.
     Part des barrières basses rendues en BOIS plutôt qu'en pierre : une
     grosse planche abîmée posée sur deux cales, en travers de la voie.

     Ce n'est PAS un nouveau type d'obstacle, et c'est délibéré. La planche
     n'est qu'un habillage de OBST.LOW : elle hérite donc sans une ligne de
     plus de tout l'appareil d'équité de track.js (espacement minimal, voies
     libres garanties, distance de sécurité au départ, rampe de densité), et
     verify-fairness.js continue de la couvrir sans savoir qu'elle existe.
     Un type dédié aurait exigé d'étendre minSpacingAfter, worstLaneTravel et
     les trois tables associées pour un objet qui se saute exactement comme
     une barrière basse.

     0,22 : moins d'une barrière basse sur quatre, et les barrières basses
     sont elles-mêmes 34 % des obstacles. Soit environ une planche tous les
     treize obstacles — assez rare pour rester un événement. */
  PLANK_CHANCE: 0.22,

  /* ⚠️ ZIP 400 — LES TRONCS MORTS EN TRAVERS. Demande de Guillaume : « ajouter
     des troncs d'arbres morts en travers la route comme obstacles pour ajouter
     de la variété », et il a coché LES DEUX parades — à sauter ET à contourner.

     ⚠️⚠️ CE N'EST PAS UNE FAMILLE D'OBSTACLES NEUVE, ET C'EST DÉLIBÉRÉ. Un
     type neuf voudrait dire : une parade neuve, un espacement minimal neuf,
     une règle de solvabilité neuve, et tout l'équilibrage de 120 parties à
     refaire. Le tronc est un HABILLAGE de deux obstacles existants :

       * posé sur une barrière basse PLEINE LARGEUR, il se saute — c'est le
         tronc « à sauter » ;
       * posé sur un bloc, il se contourne — c'est le tronc « à contourner ».

     La collision, l'espacement et la solvabilité ne bougent donc pas d'un
     pouce, et simulate-run.js doit rendre EXACTEMENT les mêmes chiffres
     qu'au 399. C'est le contrôle de ce chantier : si les chiffres bougent,
     c'est qu'on a touché à autre chose que l'apparence.

     ⚠️ ET LE TIRAGE NE PASSE PAS PAR LE FLUX PARTAGÉ. Il est semé sur la
     POSITION de l'obstacle, comme PLANK_CHANCE depuis le 381 : ajouter un
     appel à this.rng() décalerait tous les tirages suivants et changerait la
     piste entière (« ne jamais ajouter un tirage dans un flux aléatoire
     partagé », zip 381). */
  TRUNK_CHANCE: 0.30,       // part des barrières pleine largeur et des blocs habillés en tronc

  /* -------------------------------------------- CREVASSE (sol effondré) ---
     Le trou au milieu de la chaussée de l'illustration de référence. À la
     différence du trou pleine largeur, il n'occupe qu'une ou deux voies : la
     parade est LATÉRALE, on prend une voie restée libre. Le saut marche aussi,
     mais ce n'est pas ce qu'on demande au joueur.

     Décision de Guillaume : « crevasse partielle rare, décor avant tout ».
     D'où deux objets distincts et volontairement dissociés :
       - la crevasse BLOQUANTE, tirée rarement parmi les obstacles ;
       - la fissure DÉCORATIVE, fréquente, purement visuelle, qui ne touche ni
         la collision ni le pavage du sol. C'est elle qui donne l'aspect « sol
         éventré » de l'image sans rendre la piste hostile. */
  CREVASSE_LENGTH: 5.2,     // longueur d'une crevasse le long de la piste
  CREVASSE_CHANCE: 0.07,    // part des obstacles tirés qui deviennent crevasse (~5 % au final)
  CREVASSE_MIN_DIFF: 0.18,  // pas de crevasse tant que la difficulté n'est pas installée
  DECOR_CRACK_PER_NODE: 6,  // fissures décoratives TIRÉES par tronçon ; beaucoup sont
                            // ensuite écartées parce qu'elles tombaient trop près d'un
                            // vrai obstacle (voir Track.decorate), d'où un chiffre élevé
                            // pour un résultat d'environ une fissure tous les 40 mètres

  /* ----------------------------------------------------------------- PIÈCES */
  COIN_VALUE: 1,
  COIN_RUN_MIN: 4,          // longueur d'un chapelet de pièces
  COIN_RUN_MAX: 9,
  COIN_SPACING: 3.2,
  COIN_HEIGHT: 1.1,
  COIN_PICKUP_RADIUS: 1.5,
  COIN_ARC_CHANCE: 0.35,    // chapelet en arc au-dessus d'une barrière basse

  /* ------------------------------------------------------------------ LOUPS */
  CHASE_START: 17,          // écart initial joueur/meute, en unités
  CHASE_MAX: 22,            // écart maximal regagnable
  CHASE_MIN_VISIBLE: 4,
  CHASE_RECOVER: 2.4,       // unités d'écart regagnées par seconde
  CHASE_LOSS_ON_STUMBLE: 8, // écart perdu à chaque trébuchement
  WOLF_COUNT: 3,

  /* ----------------------------------------------------------------- SCORE */
  SCORE_PER_UNIT: 0.6,      // points par unité parcourue
  SCORE_PER_COIN: 25,
  STORAGE_KEY: "vf_templerun_best_v1",

  /* ---------------------------------------------------------------- CAMÉRA */
  /* HAUTEUR INCHANGÉE au zip 374, à la demande expresse de Guillaume : le
     cadrage lui convient, seul le décor devait bouger. */
  CAM_BACK: 7.2,
  CAM_HEIGHT: 4.3,
  CAM_LOOK_AHEAD: 9,
  CAM_LOOK_HEIGHT: 1.5,
  CAM_YAW_LERP: 6.5,        // vitesse de rotation de la caméra dans les virages
  CAM_POS_LERP: 11,
  CAM_FOV: 72,
  SHAKE_DECAY: 4.5,

  /* ---------------------------------------------------------------- RENDU */
  PIXEL_SCALE: 3.4,         // rendu en basse résolution puis étirement : effet pixel
  FOG_NEAR_DENSITY: 0.019,  // un peu moins dense qu'au 372 : le lac et le ciel doivent se voir
  DRAW_DISTANCE: 420,       // doit porter au moins jusqu'au dôme de ciel

  /* ------------------------------------------------------------------ CIEL --
     Ciel de l'illustration de référence : violet nocturne saturé, nuages
     déchirés, croissant de lune bas, crêtes lointaines en silhouette. Peint
     une fois sur un canvas et plaqué sur un dôme (voir World.buildSky) — pas
     de shader, cohérent avec le reste du rendu.

     Assombri par rapport à l'image, sur demande de Guillaume.

     ZIP 383 — SECOND ASSOMBRISSEMENT, ET LE VRAI SUJET EST LE CONTRASTE.
     Demande de Guillaume sur une nouvelle référence : « l'ambiance peut être
     plus sombre en fond au début quand il y a l'orage ; seul le lac reste tel
     quel, et l'intensité des flammes et du glow ».

     C'est donc une opération à SENS UNIQUE : on ne touche QUE le fond (ciel de
     nuit, crêtes, brume). Le lac (COL_LAKE / COL_LAKE_GLOW), les torches
     (COL_TORCH), les halos et les runes ne bougent pas d'un bit — ce sont eux
     qui gagnent au change. Baisser le fond SANS toucher aux sources lumineuses
     est exactement ce qui produit « plus de contraste » : la même flamme sur un
     ciel deux fois plus sombre brûle deux fois plus.

     Valeurs relevées AU PIXEL sur la référence (moyennes par bande) : zénith
     ~#1d132d, corps du ciel ~#1a1026, bas du ciel ~#160b18, crêtes ~#0c0a15.
     Le ciel peint est légèrement SOUS ces valeurs : la texture est ensuite
     multipliée par la lumière de l'éclair et surtout relevée par la brume
     additive du lac, qui la ramène à peu près à la référence à l'écran. */
  SKY_TOP:       0x0e0818,  // zénith, presque noir
  SKY_MID:       0x1a1029,  // corps du ciel
  SKY_HORIZON:   0x2b1526,  // rougeoiement bas, désaturé (voir la bande, plus bas)
  SKY_CLOUD:     0x241634,  // masse nuageuse
  SKY_CLOUD_LIT: 0x40305e,  // liseré éclairé des nuages, côté lune
  SKY_MOON:      0xd7cae8,
  SKY_PEAKS:     0x0c0a15,  // crêtes en silhouette : quasi noires, comme sur l'image

  /* ========================================== CYCLE JOUR / NUIT (zip 382) ===
     Demande de Guillaume, sur une image de référence : « le même lac la
     journée, c'est ce qu'on doit commencer à voir après 15 000 mètres environ,
     avec un lever de soleil progressif », puis « le jour reste, puis l'orage
     revient des milliers de mètres plus loin, et de nouveau ambiance sombre ».

     UN SEUL PARAMÈTRE CONTINU, `day`, de 0 (nuit) à 1 (plein jour), calculé
     par `World.dayAt(distance)`. Même principe que `stage` au zip 379, et pour
     la même raison : il n'existe NULLE PART une distance où quelque chose
     bascule. Écrire une « ambiance de jour » et une « ambiance de nuit » puis
     passer de l'une à l'autre aurait produit exactement la couture qu'on
     cherche à éviter — et sur un ciel, une couture est encore plus visible que
     sur un sol, parce qu'elle occupe la moitié de l'écran.

     Déroulé, en mètres parcourus :

        0     ──────────── nuit franche
       10 000 ┐
              │ éclaircie : le ciel pâlit imperceptiblement (12 % du jour)
       15 000 ┘ LEVER DE SOLEIL
       18 000 ── plein jour
       24 000 ┐
              │ l'orage revient, la nuit retombe
       27 000 ┘ nuit franche
       33 000 ── le lever suivant, et ainsi de suite (cycle de 18 000)

     L'AMORCE N'EXISTE QUE DANS LE PREMIER CYCLE. Elle sert à dire au joueur
     qu'il se passe quelque chose bien avant les 15 000 m — sans elle, un
     joueur qui meurt à 12 000 m n'aurait jamais rien soupçonné. Ensuite, la
     nuit ne dure plus que 6 000 m et se lit toute entière comme une attente :
     une amorce y serait redondante. Voir `dayAt()` dans world.js pour la
     façon dont les deux se raccordent sans marche. */

  /* ZIP 382b — L'ÉCLAIRCIE COMMENCE À 10 000, PAS À 6 000.
     Retour de Guillaume, et c'est un arbitrage d'ambiance qu'il faut retenir
     tel qu'il l'a formulé : « je veux toujours un ciel sombre percé par les
     thunder, c'est un élément génial et réaliste à conserver aussi longtemps
     que possible ».

     À 6 000 m, l'amorce mordait sur près de la moitié des distances que les
     joueurs atteignent réellement (l'oracle de simulate-run.js tourne autour
     de 5 000 m) : le ciel d'orage, qui est le décor SIGNATURE du défi, était
     donc entamé pour presque tout le monde au profit d'un lever de soleil que
     presque personne n'atteint. Le jeu se serait délavé pour rien.

     Repoussée à 10 000, l'éclaircie ne dure plus que 5 000 m au lieu de 9 000.
     Elle garde exactement sa fonction — annoncer ce qui vient — mais ne la
     paie plus avec le décor qu'on voit le plus. Rien d'autre ne bouge : le
     lever reste à 15 000, le cycle à 18 000.

     Note utile pour la suite : l'orage ne faiblit QUE de 12 % pendant toute
     l'éclaircie (sa force est multipliée par `1 - day`, et `day` plafonne à
     DAY_PREDAWN_LEVEL avant le lever). Les éclairs restent donc pleinement là
     jusqu'aux 15 000 m. Ce qui les éteint vraiment, c'est le lever lui-même. */
  DAY_PREDAWN_AT: 10000,    // début de l'éclaircie
  DAY_PREDAWN_LEVEL: 0.12,  // ce qu'elle atteint au maximum, juste avant le lever
  DAY_RISE_AT: 15000,       // le lever de soleil commence ici
  DAY_RISE_LEN: 3000,       // ~90 s à 34 u/s
  DAY_FULL_LEN: 6000,       // durée du plein jour
  DAY_FALL_LEN: 3000,       // retour à la nuit, symétrique du lever
  DAY_NIGHT_LEN: 6000,      // nuit franche avant le lever suivant
  /* (La longueur du cycle est la SOMME des quatre, calculée plus bas à côté de
     LANE_X plutôt qu'écrite ici : deux valeurs qui doivent s'accorder finissent
     toujours par diverger. Un accesseur aurait fait la même chose, mais CFG est
     recopié tel quel par plusieurs outils de `tools/` — un objet de données
     doit le rester.) */

  /* ------------------------------------------------- PALETTE DE JOUR -------
     Relevée AU PIXEL sur l'image de référence de Guillaume, pas choisie à
     l'œil. C'est une aube violette, pas un plein jour bleu — et c'est la
     raison pour laquelle rien n'a eu à être éteint dans le décor : les
     champignons, les runes et le halo des bulles restent lisibles sur ce
     ciel-là, alors qu'un ciel bleu franc les aurait tous transformés en
     taches laiteuses. */
  SKY_DAY_TOP:       0x7b6ca3,  // zénith, bleu-violet doux
  SKY_DAY_MID:       0x7f6693,
  SKY_DAY_HORIZON:   0xbf8299,  // rose chaud du lever
  SKY_DAY_CLOUD:     0x8f7aad,
  SKY_DAY_CLOUD_LIT: 0xdaa9b4,  // liseré des nuages, côté soleil
  SKY_DAY_SUN:       0xffd9c0,
  SKY_DAY_PEAKS:     0x464365,  // crêtes proches : éclairées, plus en silhouette
  SKY_DAY_FAR:       0x504f75,  // crêtes lointaines

  /* ======================================================================
     ⚠️⚠️ ZIP 406 — LA TAILLE DES MONTAGNES, ET C'EST LA VRAIE CAUSE DES
     « TRIANGLES ». Ces huit nombres vivaient en dur dans world.js/paintSky.
     ----------------------------------------------------------------------
     Retour de Guillaume au 405 : « il existe toujours un problème géométrique
     sur le endless run, les triangles lumineux ne sont pas beaux. »

     Le 383 avait cherché du côté de la COULEUR. Le 400 avait trouvé l'ORDRE DE
     PEINTURE — et il avait raison, les triangles ont cessé d'être oranges. Ils
     n'ont jamais cessé d'être des triangles, et voici pourquoi :

       * le dôme fait 1024×512, l'horizon est peint à la ligne 266, et
         tools/preview-sky.js établit que **le joueur ne voit que les lignes
         202 à 282**. Au-dessus de l'horizon, cela fait SOIXANTE-QUATRE lignes ;
       * la chaîne lointaine montait à 62-132 px et la proche à 42-96. **Leurs
         sommets étaient donc au-dessus du cadre**, et ce qui restait à l'écran
         n'était pas des montagnes : c'étaient les VERSANTS qui se croisent, et
         entre eux des V pointe en bas remplis de ciel.
       * horizontalement, c'est pire : le champ visible ne couvre que ~302 px
         de texture, et une montagne lointaine faisait jusqu'à 300 px de large.
         **Une seule montagne pouvait occuper tout l'écran.** Un versant plein
         écran ne se lit pas comme un relief, il se lit comme un triangle.

     LA CORRECTION EST UNE MISE À L'ÉCHELLE, pas un repeint : on rentre les
     sommets dans le cadre. Les hauteurs sont calées pour que le relief occupe
     environ 60 % de la lanière visible — la proportion relevée sur l'image de
     référence de Guillaume — et les largeurs pour qu'on en voie CINQ ou SIX à
     l'écran au lieu d'une ou deux.

     ⚠️ LES DEUX ÉCHELLES NE SONT PAS LA MÊME, et c'est le piège de ce réglage.
     Sur une équirectangulaire, 1 px de texture vaut ~4,7 px d'écran en
     HORIZONTAL et ~11,7 px en VERTICAL. Une pyramide qui paraît haute dans la
     texture est écrasée à l'écran, et inversement. **Ne jamais juger ces huit
     nombres sur la texture : lancer tools/preview-sky.js, qui découpe la
     lanière réellement visible, et regarder.**

     ⚠️ LA PALETTE N'A PAS BOUGÉ D'UN BIT (consigne explicite de Guillaume au
     406 : « ne change pas la palette relevée »). Les couleurs sont celles
     relevées au pixel sur ses références ; seule la GÉOMÉTRIE change.
     ====================================================================== */
  SKY_FAR_H_MIN: 20,        // chaîne LOINTAINE : hauteur min, en px de texture
  SKY_FAR_H_MAX: 38,        // ... et max. Sommet le plus haut = ligne 228 sur 202 visibles.
  SKY_FAR_W_MIN: 70,        // largeur min : ~330 px d'écran
  SKY_FAR_W_MAX: 140,
  SKY_NEAR_H_MIN: 16,       // chaîne PROCHE : plus basse, elle passe DEVANT
  SKY_NEAR_H_MAX: 34,
  SKY_NEAR_W_MIN: 62,
  SKY_NEAR_W_MAX: 128,
  /* La hauteur du rougeoiement bas. ⚠️ ELLE NE SUIT PLUS LA CRÊTE LA PLUS
     BASSE, et c'est un changement de méthode assumé.
     Le 400 avait BORNÉ la bande chaude à la hauteur du col le plus bas de la
     chaîne proche, pour qu'elle ne dépasse jamais d'un col — sans quoi elle
     redessinait des triangles. C'était juste tant que la bande avait un BORD :
     un aplat qui s'arrête quelque part dessine forcément une forme.
     Guillaume au 406 : « une luminosité évoquée par dégradé ». Un dégradé qui
     part de zéro d'opacité n'a pas de bord — il ne peut donc rien dessiner, et
     il n'a plus besoin d'être borné par le relief. On le fait donc PLUS HAUT
     que le col le plus bas (ce qui était interdit avant), et il s'éteint tout
     seul avant d'atteindre quoi que ce soit de visible.
     Il reste peint ENTRE les deux chaînes — ça, c'est le correctif du 400 et
     il n'a pas bougé : la chaleur ne se voit que dans les cols du plan PROCHE,
     c'est-à-dire littéralement « entre les montagnes ». */
  SKY_GLOW_H: 34,
  COL_DAY_FOG:       0x7d6a9c,
  COL_DAY_LAKE:      0x443957,  // creux des ondes, de jour
  COL_DAY_LAKE_GLOW: 0x816aa6,  // crêtes, de jour

  /* --------------------------------------------------------------- ÉCLAIRS --
     Un éclair n'est pas un fondu blanc : c'est un premier coup bref, un noir
     très court, puis un second coup plus fort et plus long. Reproduire ce
     rythme coûte trois nombres et fait toute la différence. */
  /* ⚠️ ZIP 400 — LA PLUIE. Guillaume l'avait demandée en toutes lettres
     (« Tu peux ajouter de la pluie tu crois ? ») puis ne l'a PAS cochée dans
     les options. DÉCISION PRISE SEULE, et signalée comme telle : on la fait,
     discrète, et RAIN_MAX à 0 la supprime entièrement sans toucher au code.

     ⚠️ ELLE NE TOUCHE PAS À LA CONDUITE, et c'est une contrainte, pas un
     choix esthétique : le jeu est réglé sur 120 parties jouées (simulate-run),
     et rendre la piste glissante rejouerait tout cet équilibrage pour un
     effet de décor. Elle vit entièrement dans le rendu.

     TROIS NAPPES, pas trois cents gouttes. Le vrai budget de ce jeu est le
     nombre d'objets (200 pour 100 unités de chaussée, voir smoke-render.js) :
     un système de particules le ferait exploser sur la tablette. Trois plans
     texturés qui défilent à trois vitesses différentes donnent la même
     parallaxe pour trois objets — c'est le même raisonnement que les deux
     nappes du lac au 396. */
  /* ======================================================================
     ⚠️⚠️ ZIP 407 — LA PLUIE EST REFAITE EN ENTIER, SUR QUATRE REPROCHES.
     ----------------------------------------------------------------------
     Guillaume, après avoir joué au 406 : « la pluie n'est pas satisfaisante.
     la réduire en intensité — et elle ne disparaît pas comme convenu ?? on a
     dit disparition progressive à partir de 3000 m. et son étendue ne couvre
     pas tout l'écran ; et le sens du vent que son orientation oblique évoque
     est incohérent, car lorsqu'on tourne, les gouttes tombent toujours
     direction NO-SE. »

     Quatre reproches, quatre causes distinctes, et TROIS d'entre elles sont
     des nombres posés à la main là où il fallait un calcul.

       1. L'INTENSITÉ. 0,55 en additif sur trois nappes superposées : l'image
          entière blanchissait. Guillaume demande **un crachin — mais qui
          tombe BEAUCOUP plus vite**. C'est une réponse hors options, et elle
          est meilleure que les trois proposées : une goutte pâle et LENTE se
          lit comme du bruit d'image, une goutte pâle et RAPIDE se lit comme
          de la pluie. Ce n'est pas l'opacité qui dit « il pleut », c'est la
          vitesse.

       2. LA DÉCRUE COMMENÇAIT À 3 500 ET NON À 3 000. Sa demande d'origine
          disait 3 000 → 5 000 ; l'option qu'il avait cochée au 406 disait
          3 500 → 6 000 ; il revient à sa demande d'origine. **Quand il
          rappelle un nombre qu'il avait donné en clair, c'est celui-là.**

       3. L'ÉTENDUE. Les trois nappes étaient posées « à camera.y + 1,6 »,
          c'est-à-dire à une hauteur choisie au jugé, avec des tailles
          choisies au jugé elles aussi (22×15, 40×24, 66×38). Mesuré : à
          l'écran il manquait **6,3° de pluie en bas pour la nappe proche,
          12,4° pour la médiane et 14,9° pour la lointaine** — soit tout le
          quart bas de l'image, celui où se trouve la chaussée. Les tailles
          sont maintenant DÉDUITES du tronc de vue (voir buildRain).

       4. LE VENT. Les traînées obliques étaient peintes dans la TEXTURE, et
          la nappe faisait face à la caméra : l'inclinaison était donc fixe à
          l'ÉCRAN, ce qui veut dire que le vent tournait avec le joueur.
          Guillaume a tranché : **pas de vent, la pluie tombe droit.** Les
          traînées deviennent verticales et la nappe cesse de basculer avec le
          tangage — sans quoi « droit » voudrait dire « droit à l'écran »,
          c'est-à-dire 17,3° de travers dans le monde.
     ====================================================================== */
  RAIN_MAX: 0.18,           // opacité de la nappe la plus proche, à pleine intensité — un CRACHIN
  /* ======================================================================
     ⚠️ ZIP 406 — L'ORAGE A UNE FIN, ET C'EST UNE DEMANDE DE GUILLAUME.
     ----------------------------------------------------------------------
     « la pluie doit surtout disparaître progressivement de 3 000 à 5 000
     mètres » — puis, sur options : « pleine de 2 200 à 3 500 puis réduction
     progressive jusqu'à extinction à 6 000 ».

     La courbe monte donc plus vite qu'avant (elle atteignait son maximum à
     6 000 m, c'est-à-dire au-delà de la partie moyenne : autant dire jamais),
     tient huit cents mètres à pleine force, puis s'efface.

     ⚠️ ET LES QUATRE NOMBRES SE LISENT AVEC DEUX AUTRES, AILLEURS DANS CE
     FICHIER. La partie moyenne fait 5 018 m (simulate-run.js, inchangé depuis
     le 399) : l'orage couvre donc TOUTE la partie type, et son extinction est
     une chose que seuls ceux qui vont plus loin verront. Et DAY_PREDAWN_AT
     vaut 10 000 : la pluie cesse quatre mille mètres avant que le ciel
     commence à pâlir, ce qui fait de sa disparition l'annonce de l'éclaircie
     plutôt que sa contradiction. Un orage qui s'arrête pendant que le jour se
     lève ne raconte rien ; un orage qui s'arrête AVANT annonce quelque chose.
     ====================================================================== */
  RAIN_START_DIST: 900,     // avant ça, pas une goutte : le départ reste clair
  RAIN_RAMP_DIST: 2200,     // pleine intensité atteinte ici
  RAIN_HOLD_DIST: 3000,     // ... et tenue jusqu'ici (3 500 au 406 : c'était la faute)
  RAIN_END_DIST: 5000,      // extinction complète : plus une goutte au-delà
  /* ⚠️ ZIP 407 — UNE VITESSE DE CHUTE EN UNITÉS PAR SECONDE, ET PLUS UN
     COEFFICIENT DE DÉFILEMENT DE TEXTURE.
     `RAIN_FALL: 1.35` était un multiplicateur d'`offset.y`, c'est-à-dire un
     nombre qui ne veut rien dire tant qu'on ne connaît pas la taille de la
     nappe ET sa répétition — les trois nappes tombaient donc à trois vitesses
     sans rapport, réglées à la main par un facteur `sp` par couche.
     Ici c'est une VRAIE vitesse : les trois nappes tombent à la même vitesse
     dans le MONDE, et la parallaxe vient toute seule de leur distance, comme
     dans la vraie vie. Le facteur `sp` par couche a disparu avec.
     32 u/s, soit à peu près la vitesse de course en fin de rampe : c'est ce
     qui fait qu'un crachin pâle se lit quand même comme de la pluie. Une
     goutte pâle et LENTE se lit comme du bruit d'image. */
  RAIN_SPEED: 32.0,         // unités/s — vitesse de chute, la même pour les trois nappes
  /* Les trois nappes : à quelle distance de la caméra. Leur TAILLE, elle,
     n'est plus écrite nulle part — elle est déduite du tronc de vue à cette
     distance-là (voir buildRain). C'est la correction du reproche « son
     étendue ne couvre pas tout l'écran ». */
  /* Le côté d'une tuile de pluie, en unités de monde. Il vaut pour les trois
     nappes : c'est lui qui garantit qu'une goutte de la nappe lointaine est
     dessinée à la même taille RÉELLE qu'une goutte de la nappe proche, donc
     plus petite à l'écran. Avec des répétitions choisies à la main (l'ancienne
     version) les gouttes du fond étaient les plus grosses — l'inverse de la
     perspective, et l'une des raisons pour lesquelles l'averse se lisait comme
     un voile plutôt que comme de la pluie. */
  RAIN_TILE: 9.0,
  RAIN_LAYER_D: [5.5, 12.0, 22.0],
  RAIN_LAYER_OP: [1.00, 0.62, 0.34],   // poids relatif de chaque nappe
  /* La marge de sécurité sur la taille calculée. 1,12 = 12 % de rab : le
     tronc de vue est calculé pour un écran 16/9, et un écran plus large en
     demande davantage sur les côtés. Un joueur en 21/9 ne doit pas découvrir
     une bordure sèche. */
  RAIN_COVER_MARGIN: 1.12,

  LIGHTNING_MIN_MS: 7000,   // attente minimale entre deux éclairs
  LIGHTNING_MAX_MS: 19000,
  LIGHTNING_PRE_MS: 70,     // premier coup
  LIGHTNING_DARK_MS: 55,    // noir entre les deux coups
  LIGHTNING_MAIN_MS: 230,   // second coup, celui qu'on voit vraiment
  LIGHTNING_STRENGTH: 0.9,  // 0 = invisible, 1 = ciel entièrement délavé
  COL_LIGHTNING: 0xcdb6ff,  // teinte du flash : violet-blanc, pas blanc pur

  /* ------------------------------------------------------------------- LAC --
     Le lac violet inquiétant. La chaussée le franchit : c'est exactement ce
     que fait déjà carveRunCorridor côté ferme en creusant un couloir à
     travers le lac du monde sombre, et c'est ce qui relie visuellement le
     défi à la carte dont il sort. */
  LAKE_Y: -2.6,             // sous la chaussée
  LAKE_SIZE: 1400,          // plan unique, assez grand pour couvrir le brouillard
  LAKE_SCROLL: 0.035,       // vitesse de dérive de la texture d'ondes
  LAKE_MIST_COUNT: 9,       // voiles de brume qui traînent à la surface

  /* --------------------------------------- PALETTE — relevée dans le jeu ---
     Reprise de la carte maléfique de Ferme Vallée (drawEvilFrame dans
     FermeGame.js, deadTree dans fermeArt.js), puis ASSOMBRIE au zip 374 pour
     coller à l'illustration de référence tout en restant plus sombre qu'elle. */
  /* Zip 383 : la brume de nuit descend AVEC le ciel, et pas d'un cheveu de
     plus. C'est la couleur vers laquelle tout le décor lointain se fond ; la
     laisser au-dessus du ciel remettrait un voile clair devant des crêtes
     devenues noires, et on aurait assombri la texture sans assombrir l'image.
     Le brouillard de JOUR (COL_DAY_FOG) n'est pas touché : la demande ne porte
     que sur le début de course, sous l'orage. */
  COL_FOG:        0x100819,
  COL_GROUND:     0x121a12,  // sol de la carte maléfique, assombri
  COL_VOID:       0x080d10,  // fond, sous la piste
  COL_STONE:      0x565046,  // dalle de pierre du couloir
  COL_STONE_DARK: 0x3c372f,
  COL_STONE_EDGE: 0x2b2721,
  COL_PLANK:      0x4a3a28,  // madrier tombé en travers (zip 381)
  COL_BARK:       0x2e2822,  // arbre mort
  COL_BARK_DARK:  0x1b1712,
  COL_PURPLE:     0x8c5ADC,  // lueur du passage sombre / du lac
  COL_PURPLE_DIM: 0x3a2064,
  COL_LAKE:       0x2a1052,  // creux des ondes
  COL_LAKE_GLOW:  0x7b3fd8,  // crête des ondes : c'est elle qui « luit »
  COL_TORCH:      0xff9a3c,
  /* ZIP 381 — LES PIÈCES DEVIENNENT DES BULLES.
     `COL_COIN` est conservé sous son nom : il est lu par l'interface (compteur
     de pièces) et par les outils de rendu. Seule sa VALEUR change, du doré au
     cyan, pour que le compteur ne reste pas orange au-dessus d'un ramassage
     bleu. Renommer aurait touché sept fichiers pour zéro gain visuel. */
  COL_COIN:       0x9fecfb,  // corps de la bulle, plein et clair
  COL_COIN_GLOW:  0x4fd8f5,  // halo additif autour d'elle, plus saturé
  COL_WOLF:       0x0f0c0b,
  COL_WOLF_EYE:   0xff3020,
  COL_OBSTACLE:   0x453f33,
  COL_STAIN:      0x2f3d24,  // moisissure sur la pierre, teinte verdâtre raccord évil
  COL_STAIN_DARK: 0x1a2415,  // cœur des taches d'humidité, plus sombre
  COL_CRACK:      0x0a0807,  // fêlures dans la pierre
  COL_MOSS:       0x46592e,  // mousse franche, celle des joints de l'image
  COL_MOSS_DARK:  0x27351a,
  COL_VINE:       0x293a20,  // lierre
  COL_MUSHROOM:   0xb887ff,  // chapeau de champignon luminescent
  COL_RUNE:       0xa26bff,  // gravures runiques

  /* --------------------------------------------------- SOL EN RUINE ---
     3 paliers d'usure tirés au sort par dalle (voir World.buildStoneVariants) :
     0 intacte, 1 fissurée, 2 très abîmée. Pondération qui favorise le palier
     du milieu — décision prise avec Guillaume, pas de dalle neuve trop
     propre, pas de chaos permanent. */
  FLOOR_WEAR_WEIGHTS: [0.25, 0.45, 0.30],
  FLOOR_TILT_CRACKED: 0.02,   // rad — bascule légère des dalles fissurées
  FLOOR_TILT_RUINED:  0.05,   // rad — bascule plus marquée des dalles très abîmées
  FLOOR_SINK_RUINED:  0.05,   // affaissement visuel des dalles très abîmées

  /* -------------------------------------------- BORDS DE LA CHAUSSÉE ---
     Ce que Guillaume a retenu de l'illustration : « inspire-toi surtout de la
     plateforme ». Donc pas de couloir fermé, pas d'arches. Ce qui borde la
     piste, ce sont les blocs bas façon sarcophage, les stèles gravées, la
     mousse et les champignons — le ciel, le lac et les arbres morts se voient
     par-dessus, ce qui serait impossible avec deux murs pleins. */
  KERB_SPACING: 8.5,        // écart entre deux blocs de bordure
  KERB_SKIP_CHANCE: 0.3,    // blocs manquants : une bordure trop régulière fait décor de jeu
  STELE_CHANCE: 0.22,       // part des blocs remplacés par une stèle à runes
  MUSHROOM_CLUSTERS: 5,     // bouquets de champignons luminescents par tronçon
  VINE_CHANCE: 0.38,         // part des blocs portant du lierre retombant
  TORCH_SPACING: 22,        // torches nettement plus rares qu'au 372 (13)

  /* DEUX POSTES RÉDUITS AU ZIP 377 pour financer les flammes retravaillées.
     La règle du fichier est explicite : « si tu ajoutes du décor, retire
     ailleurs ». Une torche est passée de 2 à 4 objets (fût, tête carbonisée,
     corps de flamme, cœur), soit +16 par tronçon, et le total à l'écran
     dépassait le plafond de 1000.

     Le choix de ce qu'on retire n'est pas arbitraire : les arbres morts et
     les colonnes vivent entre 3,5 et 25 unités SUR LE CÔTÉ, donc largement
     mangés par le brouillard, tandis que les torches sont au premier plan,
     sont les seuls points chauds du cadre, et sont ce qui rend la ligne de la
     piste lisible de loin. On échange des branches qu'on devine contre des
     flammes qu'on regarde. */
  DECOR_PROPS: 12,          // arbres morts, colonnes brisées et rochers par tronçon (14 au 374)
  TREE_BRANCHES: 2,         // branches par arbre mort — le poste le plus coûteux du décor (3 au 374)

  /* ------------------------------- PIERRE DE LA CHAUSSÉE D'ENTRÉE (379) ---
     La rambarde et le pavage de la section de pierre. Teintes RELEVÉES par
     rapport à COL_STONE : sur les captures de référence, la chaussée d'entrée
     est nettement plus claire que la plateforme AA, et c'est ce contraste qui
     rend la dégradation lisible sur les 600 premiers mètres. */
  COL_PAVE:       0x6b6353,  // dalle taillée, chaussée d'entrée
  COL_PAVE_DARK:  0x4e483c,
  COL_MORTAR:     0x3a352c,  // joints de mortier entre les blocs
  /* ASSOMBRIS au zip 379b. À 0x635b4b/0x7a7160, éclairée par la lune, la
     rambarde ressortait CRÈME sur une chaussée grise et cassait l'unité de
     l'ouvrage — alors que sur la jetée 2D le muret n'est qu'à peine plus clair
     que la dalle qu'il borde. On garde l'écart, on divise son ampleur. */
  /* ⚠️ ZIP 406 — LE NOMBRE DE PIERRES SAILLANTES PAR TRONÇON DE RAMBARDE.
     Trois, sur la section d'entrée neuve, et zéro une fois l'ouvrage ruiné
     (le tirage est multiplié par 1 - s). C'est le seul nombre à toucher si la
     rambarde devient trop chargée ou trop lisse — et le seul à surveiller côté
     coût : chaque unité ajoute ~2 volumes par intervalle et par côté sur la
     seule section d'entrée. Mesuré contre le plafond de tools/smoke-render.js
     (≤ 200 objets / 100 u de chaussée) avant livraison. */
  /* ⚠️ COMBIEN D'INTERVALLES UN SEUL BLOC COUVRE, TANT QUE L'OUVRAGE EST NEUF.
     Deux, soit 17,6 unités d'un seul tenant. Quand la rambarde est continue,
     rien à l'écran ne distingue un bloc long de deux blocs accolés — mais le
     moteur, lui, compte deux objets au lieu d'un. C'est ce que ce nombre
     récupère, et c'est lui qui PAIE les pierres saillantes : 195 objets par
     100 u de chaussée de pierre avant le 406, 185 après la fusion, 199 une
     fois les saillies posées, pour un plafond de 200. Repasse-le à 1 et
     smoke-render.js refusera la livraison — ce qui est exactement ce qu'on lui
     demande.
     ⚠️ Il ne vaut QUE sur l'ouvrage neuf (s < 0,35). Passé le fondu les blocs
     sont isolés : en fusionner deux ferait un trou d'un intervalle entier dans
     une bordure déjà trouée. */
  RAIL_MERGE: 2,
  RAIL_ASPERITY: 1,
  COL_RAIL:       0x4f483b,  // blocs de la rambarde
  COL_RAIL_CAP:   0x605848,  // pierre de couronnement, sur le dessus
  RAIL_H_STONE: 1.55,       // hauteur de la rambarde côté pierre
  RAIL_H_AA: 0.80,          // ... et côté AA (les blocs bas d'aujourd'hui)

  /* Tenue du fermier — OUTFITS[0] de fermeConstants.js.
     Ce ne sont plus que des VALEURS DE REPLI depuis le zip 377 : en jeu, la
     ferme envoie la tenue réelle du joueur (genre + couleurs) dans le message
     vf-run-init, et World.applySkin les remplace. Elles ne servent donc plus
     qu'à l'ouverture directe du fichier, hors de la ferme. */
  COL_SHIRT: 0x3f7fd4,
  COL_PANTS: 0x454f66,
  COL_SKIN:  0xf0c8a0,
  COL_HAIR:  0x5a3a1e,   // HAIR_COLORS[0] de fermeArt.js (et non plus une teinte inventée)
};

/* =============================================================================
   DÉRIVÉS — ne pas régler à la main.
   ========================================================================== */

CFG.SPEED_RANGE = CFG.SPEED_MAX - CFG.SPEED_START;
CFG.LANE_X = [];
for (let i = 0; i < CFG.LANE_COUNT; i++) {
  CFG.LANE_X.push((i - (CFG.LANE_COUNT - 1) / 2) * CFG.LANE_WIDTH);
}

/* Longueur du cycle jour/nuit : la somme de ses quatre phases, jamais un
   nombre écrit à côté d'elles. Régler la durée du plein jour suffit donc, on
   ne peut pas oublier de mettre le total à jour. */
CFG.DAY_CYCLE = CFG.DAY_RISE_LEN + CFG.DAY_FULL_LEN + CFG.DAY_FALL_LEN + CFG.DAY_NIGHT_LEN;

/* Durées des parades, en secondes. Elles servent à DEUX choses : l'espacement
   des obstacles (track.js) et les zones franches autour des virages. Les
   dupliquer aux deux endroits serait la meilleure façon de les désaccorder. */
CFG.JUMP_AIRTIME_S = (2 * CFG.JUMP_VELOCITY) / CFG.GRAVITY;
CFG.SLIDE_TIME_S   = CFG.SLIDE_MS / 1000;
CFG.LANE_TIME_S    = CFG.LANE_WIDTH / CFG.LANE_CHANGE_SPEED;
CFG.LONGEST_PARADE_S = Math.max(CFG.JUMP_AIRTIME_S, CFG.SLIDE_TIME_S, CFG.LANE_TIME_S);

/* Zone franche APRÈS un virage : le joueur ne voit rien tant que la caméra ne
   s'est pas réalignée, puis il lui faut son temps de réaction. Tout obstacle
   placé plus tôt est inévitable, quel que soit le talent. */
CFG.TURN_CLEAR_AFTER = Math.ceil(
  (CFG.TURN_CAM_SETTLE_S + CFG.TURN_REACT_S) * CFG.SPEED_MAX
) + 4;

/* Zone franche AVANT un virage : la parade la plus longue doit être terminée
   quand s'ouvre la fenêtre d'armement du virage. Sinon le joueur est en l'air
   au moment où il devrait appuyer, et le virage manqué est fatal. */
CFG.TURN_CLEAR_BEFORE = Math.ceil(
  CFG.TURN_INPUT_WINDOW + CFG.LONGEST_PARADE_S * CFG.SPEED_MAX
) + 4;

/* Les 4 directions cardinales. dir+1 = tourner à droite, dir-1 = à gauche.
   (vérifié : forward (0,-1) a pour droite (1,0), qui est bien D[1]) */
const DIRS = [
  { x: 0, z: -1 },
  { x: 1, z: 0 },
  { x: 0, z: 1 },
  { x: -1, z: 0 },
];
function dirRight(d) { return DIRS[(d + 1) & 3]; }
function dirForward(d) { return DIRS[d & 3]; }
/* Lacet caméra correspondant à une direction (la caméra Three regarde -Z). */
function dirYaw(d) { const f = DIRS[d & 3]; return Math.atan2(-f.x, -f.z); }
