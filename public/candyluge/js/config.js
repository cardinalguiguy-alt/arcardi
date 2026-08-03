/* =============================================================================
   config.js — TOUS les réglages de la descente en luge, en un seul endroit.
   -----------------------------------------------------------------------------
   Même règle que partout ailleurs dans le projet : aucun nombre de gameplay ni
   de mise en scène ne vit dans un autre fichier. Si on doit rendre la piste
   plus large, la pente plus raide ou les étoiles plus nombreuses, c'est ici et
   nulle part ailleurs — et les outils de `tools/` lisent CE fichier, jamais une
   copie des mêmes valeurs.

   ⚠️ TROIS FAMILLES DE NOMBRES, ET ELLES NE SE MÉLANGENT PAS :

     * LA PISTE (SLOPE_*) — la géométrie du terrain. Elle est tirée au sort,
       mais dans des bornes qui garantissent qu'elle reste DESCENDABLE. C'est
       tout l'objet de tools/verify-luge.mjs.
     * LA LUGE (SLED_*) — la physique. Elle ne connaît que la pente et les
       touches ; elle ne sait pas ce qu'est un gourmand ni un bonbon.
     * LE DÉCOR (COL_*, WORLD_*, FX_*) — ce qui ne touche pas au jeu. On peut
       tout y changer sans qu'une seule collision bouge, et c'est délibéré :
       le réglage visuel est ce qu'on refait le plus souvent.
   ========================================================================== */

const CFG = {
  /* ========================================================== LA CAMÉRA ====
     ⚠️ LE CADRE EST LARGE, C'EST UNE DEMANDE EXPLICITE : « cadré large pour
     voir un beau paysage ». Trois nombres portent ça, et il faut les bouger
     ensemble :
       - un champ de vision généreux (75°), qui écarte les bords ;
       - une caméra HAUTE et RECULÉE, qui dégage l'horizon au lieu de coller
         à la nuque du lugeur ;
       - un point visé LOIN DEVANT et légèrement au-dessus de la luge, qui
         fait entrer le paysage dans le tiers supérieur du cadre.
     Une caméra basse et proche donnerait un jeu plus nerveux — et un paysage
     réduit à une bande de piste. Ce n'est pas ce jeu-là. */
  CAM_FOV: 75,
  CAM_BACK: 13.0,          // recul derrière la luge, en unités
  CAM_HEIGHT: 7.2,         // hauteur au-dessus de la piste
  CAM_LOOK_AHEAD: 26,      // distance du point visé, devant la luge
  CAM_LOOK_HEIGHT: 3.6,    // hauteur du point visé
  CAM_LAG: 5.2,            // raideur du suivi (plus haut = plus collé)
  CAM_YAW_LAG: 3.4,        // raideur du suivi d'ORIENTATION, plus molle que la position
  /* Le champ s'ouvre avec la vitesse : +12° au maximum. C'est le plus vieux
     truc du jeu de course et il n'a pas d'équivalent — sans lui, 30 u/s et
     55 u/s se ressemblent, parce que rien à l'écran ne change de taille. */
  CAM_FOV_SPEED: 12,
  /* Roulis de la caméra dans le sens du virage. ⚠️ TRÈS discret : 4°, pas plus.
     La piste est DÉJÀ banquée jusqu'à 11° dans les grands virages ; les deux
     roulis s'additionnent à l'écran, et la première planche de
     tools/preview-luge.js montrait un horizon penché de plus de vingt degrés
     dans une simple courbe. Le joueur perd alors sa seule référence stable. */
  CAM_ROLL_MAX: 0.07,
  DRAW_DISTANCE: 900,

  /* ============================================================ LA PISTE ===
     La piste est une COURBE, pas une grille de voies. C'est la différence de
     fond avec le défi de fuite : là-bas on saute d'une voie à l'autre, ici on
     glisse en continu et le dérapage n'a de sens que si la position latérale
     est un nombre réel.

     Elle est décrite par deux fonctions de l'abscisse curviligne `s` :
     le LACET (le serpent) et la PENTE (la raideur). Tout le reste — position,
     hauteur, normale, dévers — s'en déduit par intégration, ce qui garantit
     qu'elle est continue : une piste construite par morceaux recollés a
     toujours une cassure quelque part, et une cassure à 50 u/s se ressent. */
  NODE_LEN: 8,             // longueur d'un tronçon, en unités
  NODES_AHEAD: 60,         // tronçons construits devant la luge (≈ 480 u)
  NODES_BEHIND: 8,         // tronçons gardés derrière (le rétro n'existe pas, mais l'ombre si)

  SLOPE_WIDTH: 23,         // largeur de la piste, en unités
  SLOPE_WIDTH_VAR: 5,      // ± variation lente de la largeur
  /* La pente, en radians. 0,13 rad ≈ 7,5° en croisière, 0,30 rad ≈ 17° dans
     les murs. ⚠️ SLOPE_PITCH_MAX EST UN PLAFOND DUR : au-delà de 20°, la
     vitesse terminale dépasse ce que le joueur peut lire, et la piste devient
     un couloir de réaction pure. */
  SLOPE_PITCH_BASE: 0.135,
  SLOPE_PITCH_VAR: 0.085,
  SLOPE_PITCH_MAX: 0.30,
  SLOPE_PITCH_WAVE: [520, 233, 97],   // longueurs d'onde de la raideur, en unités

  /* Le lacet. Trois sinus de longueurs d'onde premières entre elles : le motif
     ne se répète jamais à l'échelle d'une descente, sans une seule ligne de
     bruit ni de graine à stocker. YAW_MAX borne la courbure — un virage plus
     serré que ça ne se prend pas à pleine vitesse, quelle que soit l'adresse
     du joueur, et c'est exactement le genre de niveau injouable qu'on refuse
     de livrer. */
  SLOPE_YAW_AMP: [0.40, 0.22, 0.10],
  SLOPE_YAW_WAVE: [430, 197, 83],
  SLOPE_YAW_MAX: 0.62,     // rad, courbure cumulée maximale tolérée

  /* Le DÉVERS : la piste s'incline dans ses virages, comme une piste de ski
     damée. C'est ce qui fait qu'un virage se « creuse » au lieu de se subir,
     et c'est aussi ce qui rend le dérapage lisible — les étoiles partent vers
     l'extérieur du dévers. Proportionnel à la courbure, plafonné. */
  /* ⚠️ K EST CALIBRÉ POUR QUE LE DÉVERS NE SATURE PRESQUE JAMAIS. Le grand
     virage (longueur d'onde 430) donne une courbure lissée d'environ 0,0055 ;
     45 la transforme en 0,25 rad, soit 14°, ce qui est le dévers d'une vraie
     piste damée. Un K trop grand plaque le dévers à sa butée en permanence, et
     la piste devient un ruban vrillé — c'est exactement ce qui s'est passé au
     premier rendu, avec l'ancien coefficient. */
  SLOPE_BANK_K: 45,
  SLOPE_BANK_MAX: 0.20,   // 11°, et non 17° : au-delà la piste se lit comme un mur

  /* Les bosses : un relief doux SUR la piste, sans effet sur les collisions.
     Elles servent à deux choses — décoller la luge (le saut a besoin d'un
     tremplin naturel) et empêcher la piste de se lire comme un ruban plat. */
  BUMP_AMP: 0.85,
  BUMP_WAVE: [61, 27],

  DESCENT_LENGTH: 5200,    // longueur totale d'une descente, en unités
  FINISH_FADE: 260,        // longueur de la zone d'arrivée (ralentissement)

  /* ============================================================= LA LUGE ===
     ⚠️ ELLE N'A PAS DE MOTEUR. Toute la vitesse vient de la pente, et c'est ce
     qui fait la différence avec le défi de fuite, où le fermier accélère tout
     seul jusqu'à un plafond. Ici, une portion plate ralentit vraiment, un mur
     lance vraiment. Le joueur pilote son énergie, il ne la reçoit pas. */
  /* ⚠️ CES QUATRE NOMBRES SE CALIBRENT ENSEMBLE, ET LE PREMIER JEU ÉTAIT FAUX :
     la luge plafonnait à 17 u/s, soit 44 km/h affichés — une descente au pas.
     tools/verify-luge.mjs l'a dit avant qu'on l'ait jouée.

     La vitesse d'équilibre se lit directement : G·sin(pente) − friction = drag·v².
       pente de croisière (7,7°) : 52·0,135 − 1,6 = 5,4  →  v ≈ 34 u/s
       mur (12,5°)               : 52·0,216 − 1,6 = 9,6  →  v ≈ 45 u/s
       replat (2,9°)             : 52·0,050 − 1,6 = 1,0  →  v ≈ 15 u/s
     C'est cette FOURCHETTE qui fait le jeu : le joueur sent la pente changer
     sous lui. Un drag plus fort l'écraserait, un drag plus faible ferait de
     chaque mur une accélération sans fin. */
  GRAVITY: 52,             // u/s², la pesanteur du monde bonbon
  SLED_DRAG: 0.0047,       // frottement de l'air, quadratique — c'est lui qui fixe la vitesse d'équilibre
  SLED_FRICTION: 1.6,      // frottement de la neige sucrée, constant — c'est lui qui arrête sur un plat
  SLED_SPEED_MIN: 11,      // en dessous, la pente relance (on ne reste jamais planté)
  SLED_SPEED_MAX: 56,      // plafond dur, pour que la caméra et les collisions restent lisibles

  /* La DIRECTION. Deux nombres, et leur rapport est tout le pilotage :
       - STEER_RATE : à quelle vitesse la luge s'oriente quand on tient une flèche ;
       - STEER_GRIP : à quelle vitesse elle CONVERTIT son orientation en
         déplacement latéral réel.
     Quand le second est plus petit que le premier, la luge glisse : elle
     pointe déjà à gauche alors qu'elle file encore tout droit. C'est ça, un
     dérapage — pas une animation posée par-dessus. */
  SLED_STEER_RATE: 2.35,   // rad/s d'orientation gagnés à fond de flèche
  SLED_STEER_MAX: 0.85,    // rad, angle maximal entre la luge et la piste
  SLED_GRIP: 5.6,          // conversion orientation -> vitesse latérale
  SLED_GRIP_DRIFT: 2.1,    // la même, en dérapage : la luge « chasse »
  SLED_STEER_SPEED_FALLOFF: 0.55, // à SPEED_MAX, il ne reste que 55 % de la direction
  /* ⚠️ LE FREIN NE DOIT PAS TUER LA VITESSE : c'est avec lui qu'on amorce un
     dérapage, et un dérapage à l'arrêt n'existe pas. À 15 u/s² la luge tombait
     au plancher de vitesse en deux secondes et l'intensité de dérapage ne
     dépassait jamais 0,5 — donc jamais de turbo, donc jamais l'effet demandé. */
  SLED_SLIDE_BRAKE: 7,     // freinage de la touche bas, en u/s²
  SLED_SLIDE_STEER_BONUS: 1.5,    // ... qui fait TOURNER beaucoup plus : c'est le frein-virage
  SLED_LAT_DAMP: 3.2,      // amortissement du glissement latéral résiduel

  /* Le SAUT. Court, bas, et surtout : il ne rend PAS invulnérable. Sauter
     par-dessus un gourmand est une fenêtre de 0,55 s à viser, pas un bouton
     d'invincibilité — sinon la touche haut devient la réponse à tout. */
  SLED_JUMP_V: 11.5,
  SLED_JUMP_GRAVITY: 30,
  SLED_AIR_STEER: 0.35,    // en l'air on garde un peu de contrôle, pas tout
  SLED_JUMP_CLEAR: 1.6,    // hauteur au-dessus de laquelle on passe par-dessus un gourmand

  SLED_HALF_W: 1.35,       // demi-largeur de collision de la luge
  FENCE_MARGIN: 1.1,       // marge avant la barrière : on est sorti un peu avant de la toucher

  /* ============================================================ LE DÉRAPAGE
     ⚠️ C'EST LA DEMANDE CENTRALE DU CHANTIER : « LES MOUVEMENTS DE LA LUGE
     DOIVENT ÊTRE BEAUX. Des dérapages qui produisent des étoiles et de la
     poudre féérique ».

     Le dérapage n'est donc pas un état binaire mais une INTENSITÉ continue,
     `drift` ∈ [0,1], calculée à partir du glissement réel (l'écart entre là où
     la luge pointe et là où elle va). Tout le reste s'y branche : le nombre
     d'étoiles, leur vitesse d'éjection, le roulis de la caméra, le crissement,
     et le TURBO. Un état binaire aurait donné des étincelles qui s'allument et
     s'éteignent d'un coup — le défaut classique. */
  DRIFT_ENTER: 0.15,       // glissement (rad) à partir duquel les étoiles partent
  DRIFT_FULL: 0.45,        // ... et à partir duquel elles partent à plein débit
  /* Le TURBO récompense le dérapage TENU. Un dérapage court est joli ; un
     dérapage tenu deux secondes doit RAPPORTER, sinon le joueur ne dérape que
     par accident et ne verra jamais le plus bel effet du jeu. */
  /* ⚠️ 850 ms ET NON 1400 : mesuré, pas choisi. Un dérapage RÉEL ne tient pas
     l'intensité maximale plus d'une seconde — la vitesse latérale finit par
     rattraper l'orientation, le glissement retombe, c'est la physique qui veut
     ça. Le banc d'essai de tools/verify-luge.mjs montrait une charge plafonnant
     vers 900 ms : un seuil à 1400 rendait le turbo strictement inatteignable,
     et personne ne l'aurait jamais vu. */
  DRIFT_CHARGE_MS: 850,
  BOOST_MS: 1100,
  BOOST_ACCEL: 30,
  BOOST_SPEED_BONUS: 9,

  /* ========================================================= LES GOURMANDS
     Les obstacles sont MOBILES — demande explicite (« éviter les monstres
     dynamiques »). Un obstacle fixe se lit à l'avance et se contourne d'un
     seul geste ; un obstacle qui traverse la piste demande de LIRE une
     trajectoire, ce qui est un jeu.

     ⚠️ TROIS RÈGLES DE JUSTICE, toutes les trois contrôlées par
     tools/verify-luge.mjs. Elles existent parce que « le niveau 5 est
     impossible » est un reproche qu'on ne veut pas entendre deux fois :

       1. il reste TOUJOURS un passage d'au moins GAP_MIN unités ;
       2. aucun gourmand n'apparaît à moins de SPAWN_AHEAD unités devant la
          luge — on ne peut pas être surpris par ce qui naît sous le nez ;
       3. leur densité monte avec les paliers, mais leur VITESSE latérale est
          plafonnée : un gourmand plus rapide que la luge est un piège, pas un
          obstacle. */
  CRITTER_SPAWN_AHEAD: 210,
  CRITTER_DESPAWN_BEHIND: 40,
  CRITTER_GAP_MIN: 9.5,    // passage libre garanti, en unités (luge = 2,7 de large)
  CRITTER_SPEED_MAX: 7.0,  // vitesse latérale maximale, u/s
  CRITTER_RADIUS: 1.9,
  /* Espacement entre deux vagues, en unités de piste. Il RÉTRÉCIT avec les
     paliers, et c'est la seule chose qui rend le jeu plus dur — pas la
     vitesse des gourmands, pas la largeur de la piste. Une seule variable de
     difficulté est une difficulté qu'on peut régler. */
  CRITTER_SPACING: [95, 82, 70, 60, 52, 46],
  CRITTER_PER_WAVE: [1, 1, 2, 2, 3, 3],

  /* ============================================================ LES BONBONS
     Ramassés en passant dessus. Ils ne sont pas là pour le score : ils sont là
     pour DESSINER LA BONNE TRAJECTOIRE. Une file de bonbons dans la corde d'un
     virage apprend le virage sans un mot d'explication. */
  CANDY_SPACING: 34,
  CANDY_RUN: 6,            // nombre de bonbons par guirlande
  CANDY_RADIUS: 2.2,
  CANDY_SCORE: 12,
  SCORE_PER_UNIT: 0.9,     // le score suit la distance descendue
  SCORE_DRIFT_PER_SEC: 40, // ... et le dérapage tenu

  /* Les paliers : ils changent le DÉCOR autant que la difficulté. On traverse
     un village de pain d'épices, puis une forêt de sucettes, puis les hauteurs
     glacées. Un jeu de descente qui montre le même paysage pendant cinq
     minutes n'a pas de progression, même si ses nombres montent. */
  STAGE_LEN: 900,

  /* ============================================================== LE DÉCOR
     ⚠️ AUCUNE DE CES VALEURS N'A D'EFFET SUR LE JEU. C'est écrit ici pour
     qu'on ose y toucher : le réglage visuel est ce qu'on refait le plus
     souvent, et hésiter à bouger une couleur de peur de casser une collision
     est le meilleur moyen de livrer un jeu terne. */
  COL_SKY: [
    [0.00, "#cfe6ff"],   // haut : bleu poudre
    [0.26, "#e3d8fa"],   // lavande
    [0.50, "#ffdcee"],   // rose dragée
    [0.72, "#ffe9cf"],   // pêche
    [1.00, "#fff8e8"],   // crème, à l'horizon
  ],
  COL_SNOW: 0xfff6fa,        // la neige sucrée
  COL_SNOW_SHADE: 0xe9dcee,  // son ombre, violine et non grise
  COL_PISTE: 0xff9fc8,       // la barbe à papa de la piste
  COL_PISTE_SWIRL: 0xffd9ec,  // ses tourbillons plus clairs
  COL_PISTE_EDGE: 0xf47ba8,  // le liseré, un ton plus soutenu
  COL_MOUNT: 0xf3e3d2,       // chocolat blanc des montagnes
  COL_MOUNT_CAP: 0xfffdfb,   // leur calotte de sucre glace
  COL_MOUNT_FAR: 0xdcd2ea,   // la chaîne lointaine, bleuie par l'air
  COL_CANE_RED: 0xff5478,    // sucre d'orge
  COL_CANE_WHITE: 0xfff4f8,
  COL_GINGER: 0xc98a4b,      // pain d'épices
  COL_GINGER_DARK: 0xa96f38,
  COL_ICING: 0xfff7f0,       // glaçage
  COL_TRUNK: 0xb98a5e,
  COL_SYRUP: 0x7fc8e8,       // la rivière de sirop, bleu bonbon
  COL_SYRUP_DEEP: 0xff9ad4,  // ses veines roses
  COL_SLED: 0xb97f45,        // bois de la luge
  COL_SLED_DARK: 0x8d5c2e,
  COL_RUNNER: 0xffd98a,      // les patins, en caramel doré
  /* La tenue par défaut du lugeur. Elle est ÉCRASÉE par celle reçue de la
     ferme (voir bridge.js) : on doit se reconnaître d'un monde à l'autre. */
  COL_SHIRT: 0x3f7fd0,
  COL_PANTS: 0x2b4c86,
  COL_HAIR: 0x4a3220,
  COL_SKIN: 0xf0c39a,
  COL_SCARF: 0xff5478,

  /* Les six teintes des sucettes et des buissons de gomme. Six, pas trois :
     en dessous, la forêt se lit comme un motif répété. */
  COL_CANDY_SET: [0xff7aa8, 0xffd166, 0x7ee0c9, 0x9db8ff, 0xc89bff, 0xff9e6b],

  WORLD_LOLLI_DENSITY: 0.62,   // sucettes par tronçon et par côté
  WORLD_TREE_DENSITY: 0.85,    // sapins de gomme
  WORLD_HOUSE_EVERY: 11,       // un hameau tous les N tronçons (palier village)
  WORLD_ARCH_EVERY: 17,        // une arche de menthe poivrée tous les N tronçons
  WORLD_MOUNTAINS: 26,         // sommets de la chaîne proche
  WORLD_MOUNTAINS_FAR: 20,

  /* ================================================== ÉTOILES ET POUDRE ====
     Deux systèmes distincts, et ils ne servent pas à la même chose :

       * LES ÉTOILES (FX_STAR_*) sortent des patins EN DÉRAPAGE. Elles sont
         nettes, colorées, éjectées vers l'extérieur du virage. C'est la
         récompense visuelle du geste — elles doivent se voir.
       * LA POUDRE FÉERIQUE (FX_DUST_*) traîne DERRIÈRE la luge en permanence,
         d'autant plus dense qu'on va vite. Elle est pâle, lente, et elle ne
         se regarde pas : elle donne la vitesse au coin de l'œil.

     Les confondre en un seul système donnerait soit un dérapage noyé, soit une
     traînée qui clignote. */
  FX_STAR_MAX: 260,
  FX_STAR_RATE: 150,       // étoiles par seconde, à dérapage plein
  FX_STAR_LIFE: 0.95,
  FX_STAR_SIZE: 1.5,
  FX_STAR_SPREAD: 9.5,     // vitesse d'éjection latérale
  FX_STAR_RISE: 4.2,
  FX_DUST_MAX: 340,
  FX_DUST_RATE: 90,
  FX_DUST_LIFE: 1.5,
  FX_DUST_SIZE: 1.1,
  /* La neige qui tombe : très peu dense, très lente. Elle sert à remplir le
     ciel vide au-dessus de l'horizon, là où il n'y a ni piste ni décor. */
  FX_SNOW_COUNT: 420,
  FX_SNOW_AREA: 120,
  FX_SNOW_FALL: 2.4,

  BEST_KEY: "vf-luge-best",
};
