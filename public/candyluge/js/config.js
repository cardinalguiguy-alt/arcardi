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
  /* ⚠️ RECALIBRÉE AU 412 : « le jeu doit être aussi dynamique et vif et
     époustouflant que le endless run ». La première caméra était posée à
     13 unités de recul et visait 26 unités devant — un cadrage de carte
     postale, magnifique et MOU. Le défi de fuite, lui, est à 7,2 de recul et
     vise 9 devant : c'est ce qui le rend nerveux.

     On ne copie pas ses chiffres (on perdrait le paysage, qui est la raison
     d'être de ce jeu-là), on prend le milieu ET on compense par le CHAMP : à
     82° qui s'ouvrent jusqu'à 98 en vitesse, on voit plus large qu'avant tout
     en étant deux fois plus près. Un champ large et une caméra proche, c'est
     précisément la recette du « ça va vite » — les bords du cadre défilent,
     et ce sont eux que l'œil lit pour estimer une vitesse. */
  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ RECALIBRÉE AU 416 — « LE SOL PARAÎT TRANSPARENT, ON DIRAIT QUE LA VUE
     EST EN DESSOUS DU SOL ». Trois fautes, et elles se cumulaient.
     ──────────────────────────────────────────────────────────────────────────
     1. LA CAMÉRA PASSAIT VRAIMENT SOUS LE TERRAIN. Elle recule de 9 à 12,4
        unités À L'HORIZONTALE derrière la luge (c'est voulu, voir camera.js) —
        mais la piste MONTE derrière la luge, puisqu'on descend. À 17° de pente
        et 12,4 unités de recul, le sol derrière est 3,8 unités PLUS HAUT que
        la luge, alors que la caméra n'était qu'à 3,1 au-dessus d'elle. Le
        calcul est sans appel : garde minimale MOINS 0,56 unité sur l'axe, et
        moins 2,94 en déport latéral (le terrain hors piste remonte en plus).
        15 % de la descente se jouait à moins de 1,2 unité du sol.
        ⚠️ ET C'EST LÀ QUE LE « SOL TRANSPARENT » NAÎT : les rubans de neige
        sont des faces simples, invisibles par derrière. Une caméra sous le
        terrain ne voit donc pas de sol du tout — elle voit le CIEL à travers,
        avec la piste qui flotte au-dessus comme une plaque. Rien n'est
        transparent : il n'y a simplement pas de face de ce côté-là.
     2. LE CHAMP ÉTAIT DÉMESURÉ. 82° de champ VERTICAL, c'est 114° à
        l'horizontale en 16/9. Au-delà de ~95° l'œil ne lit plus une
        perspective mais un fisheye : le sol proche s'étale sur les deux tiers
        bas du cadre et se bombe. Sur les planches du 414, la piste occupe
        littéralement la moitié de l'image en pure surface plate.
     3. LA CAMÉRA ÉTAIT TROP BASSE POUR SON CHAMP. Haute et large ne vont pas
        ensemble : plus le champ est ouvert, plus il faut de hauteur pour que
        le sol proche ne mange pas le cadre.
     ⚠️ LES TROIS SE CORRIGENT ENSEMBLE ET PAS SÉPARÉMENT. Monter la caméra
     sans fermer le champ ne fait que montrer plus de neige ; fermer le champ
     sans monter ne fait que rapprocher un sol déjà trop présent. Et AUCUN des
     deux ne suffit sans la GARDE AU SOL de camera.js, parce qu'un réglage ne
     démontre rien : il rend le défaut rare au lieu de le rendre impossible.
     ══════════════════════════════════════════════════════════════════════════ */
  CAM_FOV: 62,             // champ VERTICAL. 62 ≈ 95° à l'horizontale en 16/9.
  CAM_BACK: 11.5,          // recul derrière la luge, en unités
  CAM_HEIGHT: 7.4,         // hauteur au-dessus de la piste
  CAM_LOOK_AHEAD: 20,      // distance du point visé, devant la luge
  CAM_LOOK_HEIGHT: 2.6,    // hauteur du point visé
  CAM_LAG: 7.0,            // raideur du suivi horizontal (plus haut = plus collé)
  CAM_LAG_Y: 2.4,          // ⚠️ et le suivi VERTICAL est bien plus mou : voir camera.js
  CAM_BACK_SPEED: 3.4,     // recul supplémentaire à pleine vitesse
  CAM_DROP_SPEED: 1.2,     // ... et abaissement, sur la même plage
  CAM_YAW_LAG: 4.2,        // raideur du suivi d'ORIENTATION, plus molle que la position
  /* ⚠️ LA GARDE AU SOL (416). La caméra ne descend JAMAIS à moins de
     CAM_CLEAR unités au-dessus de la surface la plus haute qu'elle survole.
     Ce n'est pas un amortisseur de plus : c'est une INVARIANTE, et elle est
     imposée après tous les amortissements, donc rien ne peut la contourner.
     ⚠️ NE PAS LA REMPLACER PAR « UNE CAMÉRA UN PEU PLUS HAUTE ». Une hauteur
     fixe est fausse quelque part par construction : le terrain hors piste
     remonte en racine carrée, la pente varie du simple au triple, les bosses
     ajoutent ±0,85, et une chute téléporte la luge. Seul un plancher mesuré à
     chaque image tient dans tous ces cas. */
  CAM_CLEAR: 2.6,          // garde minimale au-dessus du sol, en unités
  CAM_CLEAR_FALL: 5,       // vitesse de RETOUR seulement : on monte d'un coup, on redescend doucement
  CAM_CLEAR_TAPS: 6,       // points de sondage entre la luge et la caméra (le sol est une crête, pas un plan)
  /* Le champ s'ouvre avec la vitesse. ⚠️ RELEVÉ AU 416 pour compenser le champ
     de base plus fermé : l'ouverture RELATIVE compte plus que la valeur
     absolue, c'est elle qui produit la sensation de vitesse. 62 → 82 au lieu
     de 82 → 98 : l'écart est plus grand qu'avant, l'effet est donc plus fort,
     et on ne part pas d'un fisheye. */
  CAM_FOV_SPEED: 20,
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

  /* ⚠️ ÉLARGIE AU 413. Ce n'est pas du confort : c'est la place qu'il faut
     pour qu'un passage garanti reste FRANCHISSABLE avec la nouvelle conduite.
     Une carre se déporte en deux à trois secondes ; viser un trou au mètre
     près, comme le permettait la conduite instantanée du 412, n'a plus de
     sens. Le trou doit être visé À LA LOUCHE — et pour ça il doit être large,
     donc la piste aussi. */
  SLOPE_WIDTH: 29,         // largeur de la piste, en unités (⚠️ +2 au 414 : il faut la place pour que le trou tienne ENTIÈREMENT d'un côté de l'axe — voir DEAD_EDGE dans critters.js)
  SLOPE_WIDTH_VAR: 4,      // ± variation lente de la largeur
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
  /* ⚠️ ADOUCI AU 413, ET C'EST UNE CORRECTION DE FOND, PAS UN GOÛT.
     Une fois la limite d'adhérence inventée, tools/verify-luge.mjs a mesuré
     que LE TRACÉ SEUL réclamait 58 u/s² d'adhérence latérale à pleine vitesse,
     pour 27 disponibles. Autrement dit : la piste faisait déraper la luge en
     permanence sans que le joueur ait rien demandé — et un joueur qui dérape
     sans avoir touché à rien ne comprend pas ce qui lui arrive, il croit que
     le jeu est cassé.

     La faute venait des ONDULATIONS COURTES : à 83 unités de longueur d'onde,
     un frétillement d'un dixième de radian produit plus de courbure que le
     grand virage de 430. On les allonge et on les rabote. La piste y gagne
     deux fois : elle est descendable, et elle est PLUS PROPRE — de vrais
     virages qu'on lit de loin, au lieu d'un serpent nerveux. */
  SLOPE_YAW_AMP: [0.38, 0.15, 0.045],
  SLOPE_YAW_WAVE: [430, 250, 130],
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

  /* ══════════════════════════════════════════════════════════════════════════
     LA LIGNE D'ARRIVÉE (ZIP 424) — demande explicite de Guillaume.
     ──────────────────────────────────────────────────────────────────────────
     ⚠️ IL N'Y AVAIT AUCUNE LIGNE, ET C'EST TOUT LE DÉFAUT. La piste s'aplanissait
     sur `FINISH_FADE` unités, le chrono se figeait sans rien dire, la pluie de
     bonbons tombait, et le panneau de score n'arrivait que plusieurs secondes
     plus tard, à l'arrêt complet. Le joueur ne savait ni QUAND il avait fini, ni
     qu'il avait fini.

     ⚠️ LA LIGNE EST EXACTEMENT LÀ OÙ `finishKAt` PASSE AU-DESSUS DE ZÉRO, soit
     `DESCENT_LENGTH − FINISH_FADE`. Elle n'a PAS de constante à elle : elle est
     DÉRIVÉE (voir Slope.finishSAt). Deux nombres décrivant le même endroit, c'est
     la divergence garantie du jour où l'un des deux bouge — la leçon la plus
     coûteuse du projet, écrite au §7 de CLAUDE.md.

     ⚠️ ET C'EST BIEN LA LIGNE, PAS LE BAS DE LA PISTE. Ce qui suit est le
     DÉGAGEMENT : dans une station, on franchit la ligne à pleine vitesse et on
     s'arrête après. Mettre la ligne au bout des 5 200 unités la placerait là où
     la luge est déjà immobile depuis longtemps.

     LE RUBAN SE ROMPT. C'est le seul objet du jeu qui change d'état au passage,
     et c'est pour ça qu'il a été choisi : un portail qu'on traverse ne prouve
     rien, un ruban qui se casse dit « c'est fait » sans un mot de texte. */
  FINISH_POST_H: 5.6,        // hauteur des mâts, en unités
  FINISH_POST_R: 0.30,
  /* ⚠️ LE RUBAN EST BAS ET HAUT DE VISAGE, pas tendu à trois mètres. La caméra
     est à 2,6 unités derrière la luge et regarde légèrement vers le bas : un
     ruban trop haut sort du cadre à l'instant même où il faudrait le voir se
     rompre. 2,4 est la hauteur à laquelle il coupe l'horizon du cadrage. */
  FINISH_BANNER_Y: 2.4,      // hauteur du centre du ruban
  FINISH_BANNER_H: 1.45,     // sa largeur de bande
  FINISH_BREAK_MS: 1700,     // durée de vol des deux moitiés après la rupture
  FINISH_BREAK_OUT: 7.5,     // vitesse d'écartement latéral, u/s
  FINISH_BREAK_UP: 3.2,      // et vers le haut : elles s'envolent, elles ne tombent pas
  FINISH_BREAK_SPIN: 3.4,    // rad/s — elles vrillent, sinon elles glissent
  COL_FINISH_POST: 0xfff4fa,
  COL_FINISH_BANNER: 0xff5b93,   // le rose le plus saturé du jeu : rien d'autre ne l'est autant
  COL_FINISH_TRIM: 0xffe066,     // le liseré doré, pour que le ruban ne soit pas un aplat

  /* LE FREINAGE D'ARRIVÉE (424). ⚠️ IL REMPLACE UN `finishK * 10` ÉCRIT EN DUR
     DANS sled.js, ET IL CORRIGE UN VRAI BOGUE DE PARTIE : en enchaînant les
     turbos après la ligne, `BOOST_ACCEL` (30) dépassait la décélération (10 au
     maximum), la luge ne descendait jamais sous les 3 u/s exigés par `endRun`,
     et LA PARTIE NE SE TERMINAIT JAMAIS. Rapporté par Guillaume.
     Deux verrous, et il faut les deux : le turbo est coupé à la ligne (on ne
     conduit plus, on dégage), et la décélération est franche.
     ⚠️ ELLE COMMENCE DÉJÀ FORTE (0,55) au lieu de partir de zéro avec `finishK`.
     Un freinage qui monte depuis rien laisse filer trois secondes de roue libre
     avant de mordre — exactement l'attente que ce zip supprime. */
  FINISH_BRAKE: 26,          // u/s² à pleine zone
  FINISH_BRAKE_BASE: 0.55,   // fraction déjà appliquée dès la ligne
  /* Le dérapage VISUEL du dégagement. Il ne freine pas (c'est FINISH_BRAKE qui
     freine) : il met la luge en travers et ouvre la gerbe, pour que l'arrêt se
     lise comme un geste de pilote et non comme une panne de moteur. */
  FINISH_SKID: 0.8,
  /* ⚠️ LE FILET DE SÉCURITÉ. Même avec tout ce qui précède, `endRun` ne doit pas
     dépendre d'une condition de vitesse pour se produire : un jour, un réglage
     rendra le seuil inatteignable et la partie se figera de nouveau. Passé ce
     délai on termine, quoi qu'il arrive. C'est la ceinture, pas la bretelle. */
  FINISH_MAX_MS: 4600,

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
  GRAVITY: 68,             // u/s², la pesanteur du monde bonbon
  SLED_DRAG: 0.0042,       // frottement de l'air, quadratique — c'est lui qui fixe la vitesse d'équilibre
  SLED_FRICTION: 1.6,      // frottement de la neige sucrée, constant — c'est lui qui arrête sur un plat
  SLED_SPEED_MIN: 14,      // en dessous, la pente relance (on ne reste jamais planté)
  SLED_SPEED_MAX: 62,      // plafond dur, pour que la caméra et les collisions restent lisibles

  /* ══════════════════════════════════════════════════════════════════════
     LA CONDUITE — RÉÉCRITE AU 413 SUR LE MODÈLE DE STEEP.
     ══════════════════════════════════════════════════════════════════════
     ⚠️ CES NOMBRES NE SE RÈGLENT PAS UN PAR UN. Ils décrivent UNE limite
     d'adhérence et deux façons de la vivre ; en bouger un seul déplace la
     frontière entre carver et déraper, c'est-à-dire tout le jeu. L'ordre dans
     lequel les lire est celui-ci.

     1. LA CARRE. `EDGE_RATE` est la vitesse à laquelle on couche la luge sur
        sa carre. ⚠️ `EDGE_CROSS_MUL` < 1 est LE nombre qui donne son poids à
        l'engin : changer de carre oblige à repasser à plat, donc coûte deux
        fois plus de temps que d'en engager une. Sans lui, on obtient un
        zigzag gratuit — le défaut le plus visible d'un jeu de glisse raté. */
  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ RÉGLÉE AU 416 — « un peu trop mou et manque de stabilité ».
     ──────────────────────────────────────────────────────────────────────────
     Les deux moitiés de la phrase se contredisent en apparence (une luge plus
     vive est d'ordinaire moins stable) et c'est ce qui rend le diagnostic
     intéressant : ELLES NE PARLENT PAS DU MÊME MOMENT.

       * « MOU » parle de l'ENTRÉE. Entre la touche pressée et la luge qui
         s'incline, il s'écoule le temps de EDGE_RATE — et au-delà d'un tiers
         de seconde, la main ne relie plus le geste à son effet. La luge ne
         paraît pas lourde, elle paraît DÉBRANCHÉE. C'est le pire défaut d'un
         jeu de conduite parce qu'il ne s'apprend pas : on ne s'habitue jamais
         à un retard, on renonce.
       * « MANQUE DE STABILITÉ » parle de TOUT LE RESTE DU TEMPS. Une fois la
         touche relâchée, la luge ne se remettait dans l'axe qu'en une demi-
         seconde et demie (rappel de 2,2/s), et sa trajectoire rejoignait son
         nez mollement (LAT_GRIP). Entre deux appuis, elle DÉRIVAIT — le joueur
         corrigeait donc en permanence une luge qui n'allait nulle part, ce
         qu'on ressent exactement comme « ça flotte ».

     ⚠️ LA LEÇON, ET ELLE VAUT POUR TOUTE CONDUITE : « VIF » ET « STABLE » NE
     SONT PAS OPPOSÉS, ILS SONT ORTHOGONAUX. Le premier est le temps de
     RÉPONSE à une commande, le second le temps de RETOUR au repos quand il n'y
     en a plus. On peut monter les deux ensemble, et il le faut : c'est ce que
     font tous les bons jeux de glisse. Ce qui s'oppose vraiment à la vivacité,
     c'est le POIDS — et le poids est porté par EDGE_CROSS_MUL, qu'on ne
     touche pas.

     ⚠️ EDGE_CROSS_MUL RESTE À 0,5, ET C'EST DÉLIBÉRÉ. C'est lui qui interdit le
     zigzag gratuit, c'est-à-dire lui qui rend la trajectoire intéressante :
     changer de carre coûte deux fois plus que d'en engager une, donc choisir
     son côté à l'avance a une valeur. Le monter aurait « réglé le mou » en
     supprimant le jeu. */
  EDGE_RATE: 6.4,             // (416) 4,2 → 6,4 : ~160 ms pour engager, au lieu de 240
  EDGE_CROSS_MUL: 0.5,        // ⚠️ NE PAS MONTER : c'est le poids de l'engin
  EDGE_SPEED_FALLOFF: 0.72,   // à pleine vitesse, il reste 72 % de cette vivacité
  EDGE_AIR_MUL: 0.3,          // en l'air, on oriente à peine
  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ L'AMORTISSEMENT DE LACET (417) — LE NOMBRE QUI DÉCIDE À QUEL POINT LA
     LUGE SE MET EN TRAVERS.
     ──────────────────────────────────────────────────────────────────────────
     Il REMPLACE `STEER_RETURN` du 416, qui ne s'appliquait que touche relâchée.
     La démonstration est dans sled.js et elle vaut d'être lue ; en deux lignes :
     sans rappel permanent, tenir une touche fait tourner le nez SANS FIN
     jusqu'à la butée, et le banc mesurait 48,7° atteints en moins d'une seconde,
     à toutes les vitesses. Guillaume : « elle se retrouve trop souvent
     perpendiculaire à la piste ».

     ⚠️ AVEC CE TERME, LA TOUCHE NE COMMANDE PLUS UNE VITESSE DE ROTATION MAIS
     UN ANGLE D'ÉQUILIBRE : `heading = yawRate / STEER_DAMP`. C'est le nombre à
     bouger — et le seul — si la luge paraît encore trop ou pas assez en
     travers. Le MONTER redresse (cap plus serré, traversée plus lente), le
     BAISSER remet en biais.

     ⚠️ NE PAS LE CONFONDRE AVEC `LAT_GRIP`, qui dit à quelle vitesse la
     TRAJECTOIRE rejoint le nez. Celui-ci dit jusqu'où le NEZ s'écarte de l'axe.
     Les deux se ressemblent en jouant et n'ont rien à voir : le premier corrige
     un flottement, le second un travers. */
  STEER_DAMP: 2.9,            // rappel du cap vers l'axe, en 1/s — TOUJOURS actif
  /* ⚠️ ET IL MONTE AVEC LA VITESSE, comme sur tout véhicule réel : c'est
     l'effet de girouette. Sans lui, la luge est docile à l'arrêt et flottante à
     50 u/s — exactement l'inverse du besoin, puisque c'est vite qu'on a besoin
     d'être posé. */
  STEER_DAMP_V: 0.6,          // part ajoutée à pleine vitesse (×STEER_DAMP)
  /* ⚠️ LE FREIN À MAIN DIVISE LE RAPPEL PAR DEUX, et c'est ce qui garde les
     deux régimes de conduite distincts (voir sled.js) : l'amortissement de
     lacet vient de l'adhérence ARRIÈRE, or un frein à main la fait décrocher.
     ⚠️ C'est le second nombre à toucher si le dérapage paraît fade — jamais
     SLED_STEER_MAX, qui n'est qu'un garde-fou. */
  BRAKE_DAMP_MUL: 0.5,
  /* ⚠️ LE PIVOT VISUEL DE LACET (417), en unités vers l'ARRIÈRE du point suivi.
     Il ne change RIEN à la physique — pas une collision, pas une trajectoire —
     et il change tout à la lecture : un véhicule dirigé par l'avant pivote
     autour de son train arrière, jamais autour de son milieu. Voir buildSled.
     Les patins font 3,4 unités de long, l'arrière est donc vers z = +1,2. */
  SLED_PIVOT: 1.2,

  /* LA SOURIS (416). Elle pilote le même axe que les flèches, mais elle donne
     un nombre CONTINU là où le clavier donne −1, 0 ou +1 : sans courbe de
     réponse, chaque pixel de tremblement de la main devient du braquage.
     ⚠️ MOUSE_CURVE > 1 rend les petits mouvements précis SANS retirer la
     pleine butée aux grands ; c'est la même correction qu'au labyrinthe, où
     Guillaume a signalé le problème en premier (« incontrôlable sur pavé
     tactile »). Deux jeux, un même défaut, une même courbe. */
  MOUSE_DEAD: 0.10,           // zone morte au centre, en fraction de la course
  MOUSE_FULL: 0.62,           // fraction de la demi-largeur qui donne la butée
  MOUSE_CURVE: 1.7,           // exposant ; ⚠️ au-delà de 2 le centre paraît mort

  /* 2. L'ARC. Un braquage plein trace un arc dont la courbure sature avec la
        vitesse : `CARVE_K · v/(v+CARVE_V0)`. C'est la forme classique, et
        c'est elle qui fait qu'on tourne large à 55 u/s sans jamais devenir
        incontrôlable. V0 est la vitesse à laquelle on obtient la moitié du
        braquage maximal. */
  CARVE_K: 1.9,              // rad/s à pleine carre, à vitesse infinie
  CARVE_V0: 15,

  /* 3. ⚠️ LA LIMITE D'ADHÉRENCE — LE NOMBRE CENTRAL DU JEU.
        C'est une ACCÉLÉRATION LATÉRALE, en u/s². Tant que l'arc demandé (plus
        ce que la piste impose déjà) reste en dessous, la luge grave un arc
        propre et ne perd presque rien. Au-dessus, l'excédent décroche en
        dérapage — proportionnellement, pas d'un coup.

        40 u/s² veut dire, concrètement : à 45 u/s, on peut tenir un arc de
        75 mètres de rayon. Plus serré, ça part. C'est ce chiffre qu'un joueur
        apprend sans jamais le connaître, et c'est le seul à bouger si la
        conduite paraît trop facile (baisser) ou trop punitive (monter). */
  GRIP_MAX: 40,
  SKID_BREAK: 0.22,           // au-delà, on considère la carre « décrochée » (gerbe, son, score)
  /* ⚠️ MONTÉ AU 416 (8,5 → 11,5), ET C'EST LA SECONDE MOITIÉ DE LA STABILITÉ.
     `LAT_GRIP` dit à quelle vitesse la TRAJECTOIRE rejoint le NEZ. Trop bas, la
     luge glisse en permanence légèrement en crabe : elle ne dérape pas (skid
     reste à zéro, tous les contrôles passent), elle ne va simplement jamais
     tout à fait là où elle pointe. On ne peut pas le nommer en jouant — on dit
     « ça flotte » — et aucun nombre du banc d'essai ne le montrait, parce
     qu'aucun ne mesurait l'écart entre cap et trajectoire en régime établi.
     ⚠️ NE PAS CONFONDRE AVEC `GRIP_MAX`, qui décide QUAND ça décroche. Celui-ci
     décide de la netteté quand ça NE décroche PAS. Les monter ensemble rendrait
     le jeu plat ; c'est celui-ci seul qu'il fallait. */
  LAT_GRIP: 11.5,             // vitesse à laquelle la trajectoire rejoint le nez, sur la carre

  /* 4. LE FREIN (touche bas) EST UN FREIN À MAIN, pas un frein. Il ferme le
        rayon ET fait chuter l'adhérence : c'est l'outil du dérapage volontaire,
        pour se replacer d'urgence — au prix de beaucoup de vitesse. */
  BRAKE_TURN_MUL: 1.7,
  BRAKE_GRIP_MUL: 0.45,
  SLED_SLIDE_BRAKE: 9,        // freinage propre, en u/s²

  /* 5. LE COÛT DE CHAQUE GESTE. ⚠️ LE RAPPORT ENTRE CES DEUX-LÀ EST TOUT LE
        JEU : carver coûte à peine, déraper coûte huit fois plus. Si on les
        rapproche, personne n'apprend à carver et le jeu redevient plat — ce
        qu'il était au 412. */
  CARVE_SCRUB: 0.055,         // ×|carre|×v : le prix d'un bel arc
  SKID_SCRUB: 0.42,           // ×dérapage×v : le prix d'un décrochage

  /* 6. LA POSITION D'ŒUF (flèche haut maintenue au sol). Elle coupe un tiers
        de la traînée. C'est le seul moyen d'aller plus vite EN LIGNE DROITE,
        donc le choix permanent entre vitesse et réactivité. */
  TUCK_DRAG_CUT: 0.34,

  /* 7. LA SUSPENSION ET LE POMPAGE. Un ressort amorti entre la luge et la
        surface. `PUMP_K` transforme la DÉTENTE en vitesse : absorber une
        bosse puis se relâcher accélère vraiment. C'est le geste signature de
        Steep, et il ne coûte que ces cinq nombres. */
  SUSP_K: 46,                 // raideur
  SUSP_D: 7.5,                // amortissement
  SUSP_FOLLOW: 0.55,          // part du mouvement de surface transmise
  SUSP_MAX: 0.85,             // débattement, en unités
  PUMP_K: 0.55,               // détente -> accélération
  CREST_V: 7.0,               // vitesse de surface descendante qui fait décoller

  /* ══════════════════════════════════════════════════════════════════════
     LA RÉSISTANCE DU SOL — LE CHANTIER CENTRAL DU 414.
     ══════════════════════════════════════════════════════════════════════
     Demande : « une belle sensation de glisse ET DE RÉSISTANCE DU SOL ».
     Ce sont deux choses opposées, et c'est justement leur OPPOSITION qui fait
     le plaisir : glisser n'est agréable que si l'on sent ce qu'on aurait pu
     accrocher. Au 413 il n'y avait que la glisse — la luge filait sur une
     surface qui ne répondait jamais, et la seule chose que le sol savait faire
     était de laisser tomber l'adhérence d'un coup.

     Trois forces ajoutées, et elles se lisent dans cet ordre :

     1. LE LABOUR (SNOW_PLOW). Une carre couchée ENFONCE la neige et la pousse
        devant elle. C'est une résistance qui monte avec le CARRÉ de l'angle :
        une carre douce ne coûte presque rien, une carre franche freine
        franchement. ⚠️ C'est ce qui rend un virage COÛTEUX même parfaitement
        réussi, et c'est ce qui crée le vrai arbitrage d'un jeu de descente :
        la trajectoire courte n'est pas la trajectoire rapide. Sans ça, carver
        est gratuit et il n'y a rien à décider.
     2. LE LABOUR EN TRAVERS (SNOW_PLOW_SKID). Le même effet, en bien pire,
        quand la luge est en crabe : elle ne fend plus la neige, elle la pelle.
     3. LA NEIGE PROFONDE DES BORDS. Le milieu de la piste est damé ; ses bords
        ne le sont pas. S'en écarter coûte de la vitesse ET de l'adhérence.
        ⚠️ C'EST CE QUI DONNE UNE VALEUR À LA BELLE TRAJECTOIRE. Au 413, la
        piste était uniforme : rouler au bord ou dans la corde revenait
        exactement au même, donc le tracé n'était qu'un décor. Ici, la ligne
        rapide EXISTE, et on la sent sous soi avant de la comprendre. */
  /* ⚠️⚠️ CES QUATRE NOMBRES ONT ÉTÉ DIVISÉS PAR DEUX APRÈS MESURE, ET LA RAISON
     VAUT D'ÊTRE LUE AVANT D'Y RETOUCHER — c'est un piège de conception, pas une
     erreur de valeur.

     Premier réglage : SNOW_PLOW à 0,085. Le banc d'essai a alors montré une
     luge qui tombait de 30 à 25 u/s en tenant une carre, et à 13 u/s en
     enchaînant des appuis. On peut trouver ça « réaliste » ; c'est surtout
     injouable, et ça produit un effet de bord bien pire :

     ⚠️ À 13 u/s, PLUS RIEN NE PEUT DÉCROCHER. L'accélération latérale demandée
     vaut à peu près `braquage × v` : en divisant la vitesse par trois, on divise
     la demande par trois, elle repasse très au-dessous de GRIP_MAX, et le
     dérapage devient INATTEIGNABLE. Autrement dit, une résistance trop forte ne
     rend pas le jeu plus exigeant — elle SUPPRIME un de ses deux régimes de
     conduite, c'est-à-dire la moitié du jeu, et le 413 tout entier avec.

     ⚠️ LA RÈGLE GÉNÉRALE, ÉCRITE POUR NE PLUS LA REDÉCOUVRIR : dans ce jeu, tout
     ce qui coûte de la VITESSE coûte aussi de la DIFFICULTÉ, parce que la
     limite d'adhérence est proportionnelle à la vitesse. Un frein n'est jamais
     seulement un frein. Toute nouvelle résistance doit donc être mesurée au
     banc d'essai sur la valeur de `skid` — pas seulement sur celle de `v`. */
  SNOW_PLOW: 0.038,          // ×edge²×v : le prix d'une carre enfoncée
  SNOW_PLOW_SKID: 0.18,      // ×skid×v : le prix de la neige pelletée
  SNOW_DEEP_FROM: 0.68,      // fraction de la demi-largeur où la neige cesse d'être damée
  SNOW_DEEP_DRAG: 4.0,       // u/s² de freinage supplémentaire, à pleine profondeur
  SNOW_DEEP_GRIP: 0.74,      // ... et l'adhérence qu'il y reste
  /* LA CHARGE. Ce n'est pas une force : c'est la MESURE de ce qu'on demande à
     l'adhérence, entre 0 et 1, et c'est la seule information que le 413 ne
     donnait au joueur par AUCUN canal. Elle pilote maintenant le tremblement
     de la caméra, le champ, la gerbe et l'assiette de la luge — on sent donc
     la limite APPROCHER, au lieu de la découvrir en la franchissant.
     ⚠️ Une limite qu'on ne sent pas venir ne s'apprend pas : elle se subit. */
  LOAD_RUMBLE: 0.16,         // secousse de caméra à pleine charge — TRÈS discrète
  LOAD_FOV: 5,               // degrés de champ gagnés à pleine charge

  /* ══════════════════════════════════════════════════════════════════════
     LA CHUTE ET LES CHECKPOINTS — MODÈLE LONELY MOUNTAINS (414).
     ══════════════════════════════════════════════════════════════════════
     ⚠️ CHANGEMENT DE DOCTRINE, ET IL EST ASSUMÉ. Le 413 avait pris la clémence
     de SSX 3 : on se vautrait, on perdait 1,6 s, on repartait sur place. C'est
     confortable et ça ne coûte RIEN — donc il ne se joue rien pendant les trois
     minutes de descente. Un jeu sans enjeu n'est pas addictif, il est joli.

     Lonely Mountains fait l'inverse et c'est ce qui rend ce jeu-là impossible à
     reposer : la faute renvoie AU DERNIER CHECKPOINT. La punition est réelle
     (on refait le passage), mais la reprise est immédiate et le morceau à
     refaire est court. C'est la boucle « encore une fois » ; elle ne marche que
     si les deux moitiés sont vraies EN MÊME TEMPS.

     ⚠️ LE CHRONO NE S'ARRÊTE JAMAIS, y compris pendant la remise en place.
     C'est LUI la sanction — pas un écran, pas une vie perdue. Un chrono qui se
     suspendrait rendrait la chute gratuite et on retomberait dans le 413. */
  WIPE_MS: 1100,             // la culbute elle-même, avant la remise en place
  /* ⚠️ RESSERRÉ APRÈS MESURE. À 560, le banc d'essai voyait son pilote maladroit
     mettre 400 SECONDES à descendre (15 chutes × ~500 unités à refaire) pour
     une piste qui se fait en trois minutes proprement. Une reprise de vingt
     secondes est une punition ; une descente de six minutes et demie est un
     abandon. La bonne mesure d'un checkpoint n'est pas sa distance mais LE
     TEMPS QU'IL FAUT POUR REVENIR — on vise une quinzaine de secondes. */
  CP_EVERY: 420,             // une porte tous les N unités (≈ 11 sur la descente)
  CP_FIRST: 380,             // la première, tôt : on ne renvoie jamais au tout début
  CP_BACK: 14,               // on repart légèrement EN AMONT de la porte, jamais dessus
  CP_RESET_MS: 700,          // le temps de la remise en place
  CP_SPEED: 21,              // la vitesse au redémarrage : lancé, mais pas relancé
  CP_FLASH_MS: 1500,         // durée de l'annonce « CHECKPOINT » à l'écran

  /* ══════════════════════════════════════════════════════════════════════
     ⚠️⚠️⚠️ LA ZONE DÉGAGÉE À LA REPRISE — LE BOGUE LE PLUS GRAVE DU 414.
     ══════════════════════════════════════════════════════════════════════
     LE JEU ÉTAIT INACHEVABLE, ET RIEN NE LE DISAIT.

     Le banc d'essai a mesuré 213 chutes en une descente. Le détail était sans
     appel : 199 D'ENTRE ELLES AU MÊME ENDROIT, à l'unité près, à l'abscisse
     3321. La porte de checkpoint no 7 tombe à 3320 ; on repartait à 3306 ; un
     gourmand se trouvait à 3321. On réapparaissait donc À QUINZE UNITÉS d'un
     obstacle, on le percutait avant même d'avoir repris le contrôle, on
     retournait au même checkpoint, et ainsi de suite. Sans fin.

     ⚠️ C'EST LE DANGER PROPRE AU MODÈLE À CHECKPOINTS, et il faut le nommer :
     un système de reprise transforme n'importe quel passage infranchissable en
     BOUCLE INFINIE. Sans reprise, un mauvais placement d'obstacle coûte une
     partie ; avec reprise, il coûte le jeu entier. La reprise doit donc être
     garantie propre — ce n'est pas du confort, c'est la condition pour que le
     système soit utilisable du tout.

     ⚠️ ET ÇA NE POUVAIT PAS SE VOIR AUTREMENT QU'EN MESURANT. La physique était
     juste, les portes étaient bien placées, les vagues respectaient toutes
     leurs garanties de passage, et chaque contrôle pris séparément passait. Le
     défaut naissait de la RENCONTRE entre deux systèmes corrects — le placement
     des portes et celui des vagues — qui ne se connaissaient pas.

     Deux garde-fous, et il faut les deux :
       * CP_CLEAR : à la reprise, on saute les vagues situées à moins de tant
         d'unités devant. On repart toujours avec de la piste libre.
       * CP_GRACE_MS : et pendant ce court instant, les collisions sont
         ignorées de toute façon. Ceinture et bretelles, parce que le prix
         d'une erreur ici n'est pas une chute mais un jeu impossible. */
  CP_CLEAR: 120,              // unités de piste garanties libres après une reprise
  CP_GRACE_MS: 700,          // ... et l'invulnérabilité qui couvre le même instant

  /* ══════════════════════════════════════════════════════════════════════
     LE SILLON GRAVÉ — CHANTIER N°1 ANNONCÉ DU 414.
     ══════════════════════════════════════════════════════════════════════
     ⚠️ AU 413, `edge` ET `skid` NE SE VOYAIENT QU'À L'INCLINAISON DE LA LUGE.
     Toute la conduite avait été réécrite autour d'une limite d'adhérence, et
     cette limite était INVISIBLE : le joueur avait sous les doigts un système à
     deux régimes dont l'écran ne montrait rien. C'est le pire écart possible
     entre un jeu et son rendu.

     Le sillon le règle d'un coup, et c'est pour ça qu'il passe avant tout le
     reste : la trace qu'on laisse DERRIÈRE soi est la seule preuve visuelle du
     geste qu'on vient de faire. Deux traits fins et nets = j'ai carvé. Une
     large bavure pâle = j'ai dérapé, et j'ai payé. On l'apprend sans un mot. */
  TRAIL_MAX: 300,            // segments gardés (≈ 330 unités de piste derrière soi)
  TRAIL_STEP: 1.1,           // distance entre deux segments, en unités
  TRAIL_W_CARVE: 0.17,       // demi-largeur d'UN sillon de carre — FIN, c'est le propos
  TRAIL_W_SKID: 2.4,         // ... et d'une bavure de dérapage, dix fois plus large
  TRAIL_GAUGE: 0.62,         // écartement des deux patins

  /* ══════════════════════════════════════════════════════════════════════
     LA GERBE DE NEIGE (414) — le TROISIÈME système de particules.
     ══════════════════════════════════════════════════════════════════════
     ⚠️ ELLE NE REMPLACE NI LES ÉTOILES NI LA POUDRE, et il faut résister à
     l'envie de fusionner les trois : chacun répond à une question différente,
     et un système unique réglé au milieu ne répondrait à aucune.
       * les ÉTOILES disent « c'est un monde de bonbons » (colorées, additives) ;
       * la POUDRE dit « ça va vite » (pâle, permanente, au coin de l'œil) ;
       * la GERBE dit « LE SOL RÉSISTE » — c'est de la matière arrachée, blanche,
         lourde, projetée large, et elle retombe. C'est le seul des trois qui
         rende la résistance du sol VISIBLE, et c'est pour ça qu'il fallait
         l'ajouter plutôt que de gonfler un des deux autres. */
  FX_SPRAY_MAX: 420,
  FX_SPRAY_RATE: 230,        // grains par seconde, à pleine charge
  FX_SPRAY_LIFE: 0.72,
  FX_SPRAY_SIZE: 2.7,        // GROS : c'est un rideau, pas des étincelles
  FX_SPRAY_OUT: 7.5,         // vitesse d'éjection latérale
  FX_SPRAY_UP: 5.0,
  FX_SPRAY_GRAVITY: 13,      // elle RETOMBE, contrairement à la poudre qui monte

  /* ═════════════════════════════════════════════════════ LA LUMIÈRE (414) ==
     ⚠️ TROIS NOMBRES, ET ILS EXPLIQUENT À EUX SEULS POURQUOI LE 413 ÉTAIT FADE.
     L'ambiante y était à 0,78 pour un soleil à 0,72 : la lumière diffuse
     dominait la lumière dirigée, donc AUCUNE face n'était vraiment plus sombre
     qu'une autre, donc rien n'avait de volume. C'est le réglage qui « rend
     lumineux » et qui, ce faisant, tue le relief — l'erreur d'éclairage la plus
     courante et la plus difficile à voir sans regarder une image.

     Le rapport est inversé : le SOLEIL domine, l'ambiante devient un simple
     rebond. Et surtout, elle est remplacée par une lumière d'HÉMISPHÈRE — bleu
     froid venu du ciel, rose chaud renvoyé par la neige. C'est exactement le
     modèle physique d'un champ de neige au soleil, ça ne coûte pas une image
     par seconde, et ça donne gratuitement le rose-en-lumière / violine-à-
     l'ombre qui EST la « neige rose bonbon » qu'on cherche. */
  /* ⚠️⚠️ ZIP 422 — CES TROIS NOMBRES SONT MAINTENANT EXPRIMÉS EN LINÉAIRE, ET
     C'EST POUR ÇA QU'ILS ONT BAISSÉ. Voir le bloc RENDU ci-dessous : depuis
     que le rendu se fait en espace linéaire avec sortie sRGB, une intensité de
     1,05 ne donne plus du tout la même image qu'avant — l'ancien pipeline
     multipliait des valeurs DÉJÀ encodées en gamma, ce qui écrasait
     silencieusement les hautes lumières. On ne compare donc PAS ces valeurs à
     celles du 414 : elles ne sont pas dans la même unité.
     ⚠️ Et le rapport de force du 414 reste tenu, parce que c'est LUI qui compte
     et pas les valeurs absolues : soleil ≫ hémisphère > ambiante. */
  /* ⚠️⚠️ CES QUATRE VALEURS ONT ÉTÉ RÉGLÉES SUR PLANCHE RENDUE, PAS CALCULÉES.
     Premier jet du 422 : soleil 2,45, hémisphère 0,62. Raisonnement « il faut
     compenser le passage en linéaire, donc il faut monter » — et le résultat
     était une image ENTIÈREMENT BLANCHE, montagnes, arbres et neige confondus.
     La leçon est celle du 414 sous une autre forme : on ne devine pas une
     lumière, on la regarde.
     Le repère utile, si l'on doit y revenir : une face de neige EN PLEIN SOLEIL
     doit totaliser ~1,15 en linéaire (ACES la ramène à 0,83, soit un blanc
     franc mais non écrêté), et la MÊME face à l'ombre ~0,40 (soit 0,63 à
     l'écran). C'est cet écart de 1 à 3 qui fait le relief ; le monter davantage
     brûle, le baisser aplatit. */
  LIGHT_SUN: 1.28,           // le soleil, chaud et rasant — il DOMINE
  LIGHT_SKY: 0.22,           // l'hémisphère : bleu du ciel en haut, rose de la neige en bas
  LIGHT_AMBIENT: 0.03,       // et ce qui reste d'ambiante pure (l'environnement l'a remplacée)
  LIGHT_FILL: 0.16,          // l'appoint froid à contre-jour (422 : c'est lui qui dessine les bords)
  COL_LIGHT_SUN: 0xffd9a0,   // ⚠️ 422 : nettement plus AMBRÉ — c'est le « golden hour » demandé
  COL_LIGHT_SKY: 0x9fbcff,   // le ciel, franchement bleu
  COL_LIGHT_GROUND: 0xffb8d8, // le rebond de la neige, franchement rose
  COL_LIGHT_FILL: 0xa8c0ff,  // l'appoint : bleu franc, il vient de derrière-dessous
  FOG_DENSITY: 0.00125,       // moins dense qu'au 413 : le brouillard mangeait les montagnes
  COL_FOG: 0xffdccb,

  /* ═══════════════════════════════════════════════ LE RENDU (ZIP 422) ══════
     ──────────────────────────────────────────────────────────────────────────
     ⚠️⚠️ CE BLOC EST LE CŒUR DU 422, ET IL FAUT COMPRENDRE UNE SEULE CHOSE POUR
     LE LIRE : jusqu'au 421 le jeu calculait sa lumière DANS L'ESPACE GAMMA.
     three.js multipliait des octets déjà encodés (0xfa96c0 tel quel) par un
     facteur d'éclairage, ce qui n'a aucun sens physique — c'est comme
     additionner des décibels. Conséquences visibles, et toutes présentes sur
     les planches du 421 : les dégradés d'ombre virent au sale, deux lumières
     qui se croisent donnent une valeur trop claire, et surtout AUCUNE haute
     lumière ne peut exister puisque tout sature à 1,0 d'un coup.

     Le 422 remet la chaîne à l'endroit :
       1. les couleurs de matériaux sont converties sRGB → LINÉAIRE à la
          création (`convertSRGBToLinear`), les textures portent
          `encoding = sRGBEncoding` ;
       2. l'éclairage se calcule en linéaire, sans plafond — un reflet peut
          valoir 4,0 et c'est très bien, c'est ce qui donne le bloom ;
       3. le tone mapping ACES Filmic ramène ce domaine ouvert dans [0,1] avec
          un genou doux, comme une pellicule ;
       4. l'encodage sRGB final ramène le tout à l'écran.

     ⚠️ NE PAS RETIRER L'UNE DES QUATRE ÉTAPES EN CROYANT SIMPLIFIER. Elles ne
     sont correctes qu'ensemble ; à trois sur quatre, l'image est soit délavée
     (linéaire non ré-encodé) soit noire (sRGB compté deux fois), et les deux
     ressemblent assez à « un réglage de couleur à retoucher » pour qu'on perde
     une journée à chercher ailleurs.

     ⚠️ LA SENSIBILITÉ AUX PALETTES (zips 405-408) EST RESPECTÉE PAR
     CONSTRUCTION : toutes les constantes COL_* restent les mêmes valeurs sRGB
     qu'avant. C'est la CHAÎNE qui change, pas les teintes. Une couleur de
     bonbon reste exactement la couleur qu'on lit dans ce fichier, à la
     compression des hautes lumières près. */
  /* ⚠️⚠️ ZIP 423 — CES TROIS NOMBRES ONT ÉTÉ DIVISÉS, ET LA CAUSE EST UNE
     ERREUR DE MODÈLE DANS L'OUTIL, PAS DANS LE JEU.
     ──────────────────────────────────────────────────────────────────────────
     Guillaume, sur le rendu réel : « les reflets sont bien trop intenses, on ne
     voit quasiment plus la piste ». Les planches du 422 ne le montraient pas —
     et c'est ÇA qu'il fallait comprendre, parce qu'un outil qui rassure est
     pire qu'un outil absent.

     Dans three.js r128, `scene.environment` alimente DEUX termes :
     `RE_IndirectSpecular` (le reflet, celui auquel on pense) ET
     `RE_IndirectDiffuse` (une ambiante colorée par le ciel). Les deux sont
     multipliés par `envMapIntensity`. Or l'environnement est ici fabriqué à
     partir de la TEXTURE DE CIEL, dont la radiance moyenne est très élevée
     (~0,8 en linéaire : c'est un ciel de plein jour). Le terme diffus valait
     donc en vrai ≈ 0,8 × 0,55 = 0,44 — alors que la planche le modélisait
     comme une constante séparée à 0,18.

     Conséquence : le jeu recevait ~0,3 de lumière ambiante de plus que la
     planche sur CHAQUE surface. Ça lave l'image, ça écrase les ombres, et ça
     fait glisser une nappe spéculaire sur la piste.
     ⚠️ LA CORRECTION DE FOND EST DANS L'OUTIL : `preview-luge.js` calcule
     désormais le diffus d'environnement à partir de `ENV_INTENSITY`, comme
     r128, et non plus depuis une constante indépendante. `ENV_DIFFUSE` n'est
     plus qu'un facteur de forme (l'irradiance d'un hémisphère vaut moins que
     la radiance de la source), et il n'y a plus qu'un seul nombre à régler. */
  TONE_EXPOSURE: 1.44,       // ⚠️ ACES assombrit les tons moyens : on compense ici, et NULLE PART ailleurs
  ENV_INTENSITY: 0.22,       // force de l'éclairage d'environnement (le ciel réfléchi) sur les PBR
  ENV_DIFFUSE: 0.75,         // facteur de forme du diffus d'environnement, ×ENV_INTENSITY
  ENV_SIZE: 256,             // côté de l'équirectangulaire servant à fabriquer l'environnement

  /* ── LES RUGOSITÉS. Elles font autant que la couleur, et c'est nouveau. ──
     Une surface de rugosité 1,0 est un plâtre ; à 0,2 c'est un vernis. Toute la
     différence entre « du plastique coloré » et « du bonbon » est là, pas dans
     la teinte. ⚠️ La neige n'est PAS mate : la neige tassée d'une piste renvoie
     un éclat large et doux, c'est ce qui la distingue d'une nappe blanche. */
  /* ⚠️⚠️ ZIP 423 — LA NEIGE ET LA PISTE SONT REMONTÉES EN RUGOSITÉ, ET LA
     CARTE DE RUGOSITÉ DE LA PISTE A ÉTÉ RETIRÉE.
     Deux fautes cumulées au 422, et la seconde était sournoise :
       1. 0,52 pour un sol est une valeur de PLASTIQUE VERNI. De la neige damée
          renvoie un éclat LARGE, jamais un éclat net ;
       2. `roughnessMap` MULTIPLIE la rugosité par le canal VERT de la texture.
          Le vert de la barbe à papa vaut ~0,59 : la piste se retrouvait donc à
          0,52 × 0,59 = **0,31**, deux fois plus lisse que voulu, et sur la
          surface qui occupe la moitié du cadre. C'est la nappe qui « mangeait »
          la piste. La neige, elle, est presque blanche (vert ~0,96) et n'était
          quasiment pas affectée — d'où le fait que seule la piste posait
          problème.
     ⚠️ LA NEIGE GARDE SA CARTE, LA PISTE NON. Sur la neige, la variation casse
     la bande spéculaire uniforme et c'est utile ; sur la piste, la texture est
     colorée, donc sa luminance n'a AUCUN rapport avec sa rugosité. Une carte de
     rugosité ne se dérive d'une carte de couleur que si la couleur est neutre. */
  RGH_SNOW: 0.86,
  RGH_PISTE: 0.80,           // la piste est un peu plus lisse que la neige : elle est damée
  RGH_CANDY: 0.34,           // le bonbon : vernis
  RGH_CANE: 0.30,            // le sucre d'orge : verre
  RGH_ICING: 0.92,           // le glaçage : mat et poudreux
  RGH_GINGER: 0.86,          // le pain d'épices : franchement mat
  RGH_WOOD: 0.72,            // le bois de la luge
  RGH_CLOTH: 0.92,           // les vêtements du fermier
  RGH_MOUNT: 0.96,           // les montagnes : mates, elles doivent RECULER
  CLEARCOAT_CANDY: 0.55,     // le vernis du bonbon, en couche par-dessus
  METAL_RUNNER: 0.30,        // les patins en caramel doré : à demi métalliques, ils brillent

  /* ══ LES OMBRES (422) — ON EST PASSÉ À DE VRAIES SHADOW MAPS. ═════════════
     ⚠️ ET LA SEULE RAISON POUR LAQUELLE ÇA TIENT, C'EST QUE LE VOLUME D'OMBRE
     SUIT LA LUGE. Une shadow map couvrant les 900 unités de tirage aurait une
     résolution de 0,9 unité par texel : de la bouillie. Ici la caméra d'ombre
     est une boîte de SHADOW_RADIUS unités recentrée sur la luge à chaque
     image — soit ~4 cm par texel en 2048. C'est la « cascade à un seul étage »,
     et pour un jeu où la caméra ne quitte jamais la luge, c'est suffisant :
     personne ne regarde jamais l'ombre d'une montagne.
     ⚠️ Les décalques 2D du 416 N'ONT PAS ÉTÉ RETIRÉS pour autant — ils servent
     désormais aux gourmands lointains, hors du volume d'ombre, où la shadow map
     ne peut rien. Les deux se relaient, voir SHADOW_DECAL_FROM. */
  SHADOW_ON: true,
  SHADOW_MAP: 2048,          // côté de la carte d'ombre (1024 en qualité réduite)
  SHADOW_RADIUS: 46,         // demi-côté du volume d'ombre autour de la luge, en unités
  SHADOW_NEAR: 1,
  SHADOW_FAR: 240,
  SHADOW_BIAS: -0.0009,      // ⚠️ NÉGATIF : sinon la luge « décolle » de son ombre
  SHADOW_NORMAL_BIAS: 0.035, // et celui-ci coupe l'acné sur les surfaces rasantes (la neige EST rasante)
  SHADOW_SOFT: 3.0,          // rayon du PCF, en texels
  SHADOW_CAST_RANGE: 62,     // au-delà, un décor ne projette plus : hors volume, ça ne coûterait rien pour rien
  SHADOW_DECAL_FROM: 34,     // en deçà, le décalque d'un gourmand s'efface (la vraie ombre prend le relais)

  /* ══ LE POST-TRAITEMENT (422) ═════════════════════════════════════════════
     ⚠️ LE BLOOM NE SERT PAS À « FAIRE BRILLER », IL SERT À DIRE QU'UNE VALEUR
     DÉPASSE LE BLANC. C'est pour ça que le seuil est HAUT (0,92) : à 0,6 tout
     le champ de neige déborderait et on obtiendrait le voile laiteux qu'on
     reconnaît dans tous les jeux qui abusent du bloom. Ici, seuls les émissifs
     (bonbons, fanions de checkpoint, rideau de porte, soleil) passent le
     seuil — et ils le passent franchement, parce qu'ils sont au-dessus de 1,0
     en linéaire. */
  BLOOM_ON: true,
  BLOOM_STRENGTH: 0.62,
  BLOOM_RADIUS: 0.55,
  BLOOM_THRESHOLD: 0.92,
  BLOOM_SCALE: 0.5,          // la passe de bloom tourne à demi-résolution : invisible, et 4× moins cher

  /* Le vignettage et le grain. ⚠️ LES DEUX SONT VOLONTAIREMENT À LA LIMITE DU
     PERCEPTIBLE. Un vignettage qu'on remarque est un vignettage raté : son
     travail est de retenir le regard au centre, pas de se faire voir. Le grain,
     lui, a une fonction technique en plus de l'ambiance — il casse le banding
     des grands dégradés de ciel, qui est le défaut le plus visible d'un ciel
     pastel en 8 bits. */
  VIGNETTE: 0.34,            // force au coin de l'image
  VIGNETTE_SOFT: 0.62,       // rayon où elle commence
  GRAIN: 0.022,
  /* L'étalonnage final : un soupçon de « split toning » — hautes lumières
     tirées vers l'ambre, ombres vers le violet. C'est le geste qui fait
     ressembler une image à une photo de fin de journée plutôt qu'à un rendu. */
  GRADE_WARM: 0.055,
  GRADE_COOL: 0.070,
  GRADE_SAT: 1.00,           // ACES désature : on rend un peu de saturation, pas plus
  /* ⚠️⚠️ LE CONTRASTE FINAL, ET C'EST LA MESURE QUI L'A IMPOSÉ, PAS LE GOÛT.
     Méthode du 421 (réduire à 480×270, mesurer bande par bande), appliquée à la
     référence de Guillaume et à la planche :

              | référence | 422 premier jet |
       L global |   180,6 |          177,9  ← identique, donc « bien exposé »
       ÉCART-TYPE|   47,7 |           28,4  ← LA MOITIÉ
       < L60     |   2,1 % |          0,0 % ← AUCUN NOIR DANS L'IMAGE

     Autrement dit : la luminosité MOYENNE était juste et l'image était fausse.
     C'est exactement la leçon du 421 sous une autre forme — « le jeu n'était pas
     trop sombre, il était sombre à l'envers ». Ici il n'est pas trop clair : il
     est PLAT. Une image sans aucun pixel sous L60 n'a pas d'ombre, donc pas de
     volume, quelle que soit la qualité de son éclairage.
     ⚠️ NE PAS CORRIGER ÇA EN BAISSANT L'EXPOSITION : on obtiendrait la même
     image en plus sombre, écart-type inchangé, et on aurait perdu les hautes
     lumières en prime. Ce qu'il faut est un ÉCART, pas un décalage. */
  GRADE_CONTRAST: 1.34,      // pivot sur le gris moyen, appliqué après ACES

  /* ══ LES PALIERS DE QUALITÉ (422) ═════════════════════════════════════════
     ⚠️ MESURÉS, PAS SUPPOSÉS. `QUALITY_AUTO` fait tourner un compteur d'images
     pendant les QUALITY_WINDOW premières secondes ; si la moyenne tombe sous
     QUALITY_DROP_FPS, on descend d'un palier (bloom coupé, puis ombres, puis
     résolution). Le jeu tourne dans une iframe par-dessus une ferme temps réel :
     le budget n'est PAS celui d'une page seule, et il varie selon ce que fait
     la ferme derrière. Un réglage fixe serait faux la moitié du temps.
     ⚠️ La remontée existe aussi (QUALITY_RAISE_FPS), avec une hystérésis large :
     sans elle, une seule saccade condamnerait la descente entière au palier bas. */
  QUALITY_AUTO: true,
  QUALITY_WINDOW: 2.5,       // secondes d'observation avant de trancher
  QUALITY_DROP_FPS: 48,
  QUALITY_RAISE_FPS: 58,
  QUALITY_MAX_PIXEL_RATIO: 2,

  ROLL_PER_EDGE: 0.62,        // inclinaison visuelle de la luge à pleine carre

  /* ⚠️ CE N'EST PLUS UN RÉGLAGE MAIS UN GARDE-FOU (417). Jusqu'au 416, le cap
     venait TOUJOURS buter dessus — c'était donc lui, et non la conduite, qui
     décidait de l'angle de la luge. Depuis que STEER_DAMP tient le cap à un
     angle d'équilibre, on ne l'atteint plus qu'au frein à main, ce qui est
     exactement ce qu'une butée doit faire : ne rien limiter en conduite
     normale, et empêcher l'absurde (une luge à 90° de sa trajectoire).
     ⚠️ Ne PAS le baisser pour « redresser » la luge : c'est STEER_DAMP.
     Baisser la butée écrêterait le frein à main, donc supprimerait le second
     régime de conduite au lieu de corriger le premier. */
  /* ⚠️ L'ÉCHELLE DU MODÈLE DE LUGE (422). Le modèle Blender est écrit à sa
     taille naturelle (≈2,7 unités de long) ; la luge du 413, elle, avait grandi
     à 3,7 au fil des réglages de cadrage. Ce facteur les raccorde, et il est
     ICI et pas dans le modèle pour une raison précise : la taille apparente de
     la luge est un réglage de CADRAGE (elle se juge contre la largeur de piste
     et la focale), pas une propriété de l'objet. La régler dans Blender
     obligerait à rouvrir Blender pour un essai. */
  SLED_MODEL_SCALE: 1.42,
  SLED_MODEL_SEAT: 0.95,      // hauteur du pivot du buste, en unités de jeu

  SLED_STEER_MAX: 0.62,       // rad (35°), garde-fou ; le frein à main y monte, la carre non

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
  /* Le TURBO récompense la CARRE TENUE (413, voir sled.js). Un dérapage court est joli ; un
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
  CRITTER_SPAWN_AHEAD: 420,
  CRITTER_DESPAWN_BEHIND: 40,
  /* ⚠️ RAMENÉ DE 13 À 11,5 AU 414. Ce n'est pas un durcissement : c'est ce
     qu'il faut pour que le trou puisse tenir entièrement d'un côté de l'axe.
     Un passage de 13 sur une piste de 27 laissait 7 unités de battement, alors
     qu'il en fallait 8,7 pour dégager le milieu — la contrainte était donc
     géométriquement insatisfaisable, et le trou recouvrait toujours le centre.
     11,5 reste plus de quatre fois la largeur de la luge (2,7). */
  CRITTER_GAP_MIN: 11.5, // passage libre garanti, en unités (luge = 2,7 de large)
  /* ⚠️ DIVISÉ PAR DEUX AU 413, ET C'EST UNE CORRECTION DE JUSTICE, PAS DE
     DIFFICULTÉ. Avec la conduite du 412 on rejoignait un trou en une demi-
     seconde : un gourmand qui traversait la piste en trois secondes restait
     lisible. La carre demande maintenant DEUX À TROIS SECONDES pour se
     déporter — c'est-à-dire le temps que le gourmand met à faire un aller-
     retour complet. Le joueur visait donc un passage qui n'existait déjà plus
     quand il y arrivait, sans avoir rien fait de mal.
     Une trajectoire d'obstacle doit être LISIBLE SUR LA DURÉE DE L'APPROCHE.
     C'est la règle, et elle se recalcule à chaque fois qu'on touche à la
     conduite. */
  CRITTER_SPEED_MAX: 3.2,  // vitesse latérale maximale, u/s
  CRITTER_RADIUS: 1.7,
  /* Espacement entre deux vagues, en unités de piste. Il RÉTRÉCIT avec les
     paliers, et c'est la seule chose qui rend le jeu plus dur — pas la
     vitesse des gourmands, pas la largeur de la piste. Une seule variable de
     difficulté est une difficulté qu'on peut régler. */
  /* ⚠️ ESPACÉ AU 413, ET C'EST UNE CONSÉQUENCE DIRECTE DE LA CARRE.
     Avec l'ancienne conduite, se déporter de huit mètres coûtait une demi-
     seconde : des vagues toutes les 95 unités laissaient largement le temps.
     Une carre, elle, met une demi-seconde à s'engager PUIS une seconde à
     déplacer la luge — deux fois plus. Les mêmes espacements devenaient donc
     un test de réflexe impossible, et le pilote automatique mourait à la
     deuxième vague.
     ⚠️ LA RÈGLE, ÉCRITE POUR NE PLUS AVOIR À LA REDÉCOUVRIR : IL FAUT AU
     MOINS TROIS SECONDES ET DEMIE ENTRE DEUX VAGUES, À LA VITESSE MAXIMALE.
     C'est le temps d'engager une carre, de traverser, et de la rendre. À
     50 u/s cela fait 175 unités — d'où ces valeurs, qui décroissent à peine.

     ⚠️ ET LA DIFFICULTÉ NE VIENT PLUS DU RYTHME MAIS DU NOMBRE. Serrer les
     vagues ne rend pas le jeu plus dur, ça le rend IMPOSSIBLE : en dessous du
     temps d'un déport, aucune adresse ne rattrape. Ajouter un gourmand dans la
     vague, en revanche, rétrécit le choix sans jamais retirer le temps de
     l'exécuter. C'est la seule bonne façon de monter en difficulté dans un jeu
     à conduite lente, et c'est CRITTER_PER_WAVE qui s'en charge. */
  CRITTER_SPACING: [205, 196, 188, 180, 172, 165],
  /* ⚠️⚠️ MONTÉ AU 414, ET C'EST LE LEVIER QUE LE 413 AVAIT DÉSIGNÉ SANS
     POUVOIR TRANCHER : « ou les gourmands sont trop peu nombreux — ce serait
     alors CRITTER_PER_WAVE qu'il faut monter, jamais CRITTER_SPACING qu'il
     faut resserrer ». C'était la bonne piste.
     Avec un seul gourmand sur une piste de 29 unités, il reste tant d'espace
     libre EN DEHORS du passage garanti qu'un joueur immobile au centre ne
     croise presque rien : le passage garanti n'est plus le seul passage, donc
     il ne contraint personne. En doublant le nombre, on rétrécit le choix sans
     jamais retirer le temps de l'exécuter — ce qui est la seule bonne façon de
     monter en difficulté dans un jeu à conduite lente. */
  CRITTER_PER_WAVE: [2, 2, 3, 3, 4, 4],

  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ LA LISIBILITÉ DE L'ÉVITEMENT (416) — « les mécanismes d'évitement ne
     sont pas clairs ».
     ──────────────────────────────────────────────────────────────────────────
     Le reproche est juste, et le plus instructif est qu'AUCUN NOMBRE DE
     GAMEPLAY N'ÉTAIT EN CAUSE. Le passage garanti existe (prouvé sur les 27
     vagues et toute leur oscillation), il fait 7,7 unités pour une luge de
     2,7, le gourmand est plafonné en vitesse latérale, la vague apparaît à
     420 unités. Tout ce qu'il faut pour esquiver était là. RIEN NE LE DISAIT
     AU JOUEUR.

     ⚠️ LA RÈGLE, ET ELLE VAUT POUR TOUT LE JEU : UNE GARANTIE QUI NE SE VOIT
     PAS N'EN EST PAS UNE. C'est exactement la faute du 413 sur la limite
     d'adhérence — mécanique centrale, invisible, donc inapprenable — et on la
     refait ici sur l'évitement. Le réflexe est d'adoucir la difficulté ; c'est
     le mauvais, et il aurait cassé tout ce que le 414 a construit.

     TROIS AJOUTS, ET AUCUN NE TOUCHE À UNE COLLISION :

       1. LA PORTE (GATE_*). Une bande lumineuse posée AU SOL, en travers de la
          piste, exactement large du passage garanti et à l'abscisse de la
          vague. Elle ne se déduit pas : elle EST le trou tiré par
          `buildWave`. Le joueur ne calcule plus un intervalle libre entre des
          créatures qui bougent, il vise une porte éclairée.
          ⚠️ ET ELLE NE BOUGE PAS, alors que les gourmands oscillent. C'est le
          point : viser une cible mobile qu'on ne rejoint qu'en trois secondes
          est un exercice de prédiction ; viser une porte fixe est un exercice
          de PILOTAGE, et c'est ce jeu-là qu'on fait.

       2. L'OMBRE PORTÉE (SHADOW_*). Un gourmand est une forme colorée sur de
          la neige rose, à mi-hauteur du cadre : rien ne dit à quelle DISTANCE
          il est ni sur quelle position latérale il se trouve. Une ombre au sol
          répond aux deux d'un coup — c'est le plus vieux truc du jeu en 3D, et
          il n'a pas d'équivalent. Elle sert aussi les bonbons et la luge.

       3. LE CERNE D'ALERTE (WARN_*). L'ombre s'entoure d'un anneau qui bat
          quand le gourmand entre dans les dernières WARN_FROM unités. Il ne
          donne aucune information nouvelle — il donne le MOMENT. Un joueur qui
          regarde loin devant a besoin qu'on lui dise « celui-ci, maintenant ».

     ⚠️ CE QUE ÇA NE FAIT PAS : rendre le jeu plus facile. La porte est
     toujours hors de l'axe (DEAD_EDGE), il faut toujours deux à trois secondes
     pour s'y déporter, et les gourmands qui bordent le trou restent mortels.
     On a rendu VISIBLE une difficulté qui était OBSCURE, ce qui est le
     contraire de l'avoir baissée.
     ══════════════════════════════════════════════════════════════════════════ */
  GATE_SHOW_FROM: 300,       // distance à laquelle la porte commence à apparaître
  GATE_FULL_FROM: 150,       // ... et à laquelle elle est à pleine intensité
  GATE_LEN: 4.2,             // longueur de la bande au sol, en unités de piste
  GATE_LIFT: 0.06,           // décollement du sol, en unités (contre le z-fighting)
  GATE_OPACITY: 0.5,         // ⚠️ discrète : c'est un repère, pas un tapis
  /* ⚠️⚠️ LES MONTANTS FONT SEPT UNITÉS, ET C'EST LA PREMIÈRE PLANCHE
     `luge-evitement` QUI L'A IMPOSÉ. À 3,4 unités — la hauteur « raisonnable »
     d'une porte de slalom — ils apparaissaient comme deux traits verts de
     quarante pixels perdus au bord du cadre, alors que la bande au sol, elle,
     était PUREMENT ET SIMPLEMENT INVISIBLE : la piste a des bosses et des
     crêtes, et un repère peint au sol disparaît derrière la première.

     ⚠️ LA RÈGLE, ET ELLE VAUT POUR TOUT REPÈRE DE JEU DE DESCENTE : C'EST LA
     VERTICALE QUI PORTE À DISTANCE. Un décalque au sol vu sous un angle rasant
     n'occupe que quelques pixels de haut et se fait masquer par le moindre
     relief. C'est déjà la raison d'être des barrières en sucre d'orge et des
     fanions de checkpoint ; on l'avait oubliée en dessinant une porte à plat.
     La bande au sol reste — elle est parfaite dans les vingt dernières unités,
     quand on ajuste — mais elle ne peut pas être le signal principal. */
  GATE_POST_H: 7.0,          // hauteur des deux montants de sucre d'orge
  /* LE RIDEAU : un voile lumineux tendu entre les montants, dégradé vers le
     haut. ⚠️ IL EST TRÈS TRANSPARENT ET TRÈS BAS, et les deux comptent : un
     voile dense ou haut se lirait comme un MUR, c'est-à-dire l'inverse exact du
     message. À 0,16 d'opacité et deux unités de haut, il se lit comme de la
     lumière qui monte du sol — on passe dedans sans y penser, et on le voit de
     deux cents mètres. */
  GATE_CURTAIN_H: 2.2,
  GATE_CURTAIN_OPACITY: 0.16,
  GATE_PULSE: 2.1,           // rad/s de la respiration lumineuse
  COL_GATE: 0x63f58f,        // vert pomme : le seul ton franchement absent de la piste
  COL_GATE_POST: 0xa8ffc4,

  SHADOW_SIZE: 1.0,          // multiplicateur du rayon de l'ombre
  SHADOW_OPACITY: 0.5,
  SHADOW_LIFT: 0.05,

  WARN_FROM: 52,             // distance à laquelle le cerne d'alerte s'allume
  WARN_PULSE: 7.5,           // rad/s : nettement plus rapide que la porte
  COL_WARN: 0xff4d7d,

  /* ============================================================ LES BONBONS
     Ramassés en passant dessus. Ils ne sont pas là pour le score : ils sont là
     pour DESSINER LA BONNE TRAJECTOIRE. Une file de bonbons dans la corde d'un
     virage apprend le virage sans un mot d'explication. */
  CANDY_SPACING: 34,
  CANDY_RUN: 6,            // nombre de bonbons par guirlande
  CANDY_RADIUS: 2.2,
  CANDY_SCORE: 12,
  SCORE_PER_UNIT: 0.9,     // le score suit la distance descendue
  SCORE_CARVE_PER_SEC: 55, // ... et la CARRE tenue (413 : plus le dérapage)

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
  /* ⚠️⚠️ REFONTE COMPLÈTE AU 414, ET C'EST LA CORRECTION LA PLUS IMPORTANTE
     DU ZIP. Le rendu du 413 a été REGARDÉ (tools/preview-luge.js), et il avait
     un défaut qu'aucune relecture de code ne pouvait montrer :

         TOUTE L'IMAGE TENAIT DANS UN DIXIÈME DE PLAGE DE VALEURS.

     Neige à 0,98, ciel à 0,95, montagnes à 0,94, piste à 0,88. Un paysage où
     tout a la même LUMINOSITÉ n'a ni relief, ni profondeur, ni silhouette : il
     se lit comme du brouillard rose, et c'est exactement l'effet que ça
     faisait. Le réflexe est d'ajouter des objets ; c'est le mauvais. Ce qui
     manquait n'était pas de la matière, c'était du CONTRASTE.

     ⚠️ LA RÈGLE, ÉCRITE POUR NE PLUS LA REDÉCOUVRIR : un monde pastel n'est
     PAS un monde clair. Le pastel est une affaire de SATURATION (des teintes
     douces), pas de VALEUR (des tons clairs). Un décor de bonbon réussi garde
     toute sa plage : rose vif en pleine lumière, violine profond dans l'ombre.
     C'est ce qui donne à la fois la douceur et le volume — et c'est comme ça
     que sont peints les paysages de Lonely Mountains, référence de ce zip.

     Concrètement, trois familles ont été SÉPARÉES en valeur, et il faut que
     l'écart reste :
       * la NEIGE reste le point le plus clair du cadre. C'est sa fonction.
       * la PISTE descend d'un cran et se sature : elle doit se découper sur la
         neige, sinon on ne lit plus où l'on a le droit d'aller.
       * le DÉCOR (arbres, montagnes proches, maisons) descend de DEUX crans.
         C'est lui qui porte la silhouette, et une silhouette est un contraste. */
  COL_SKY: [
    [0.00, "#7ea8e8"],   // haut : un vrai bleu, et non un bleu blanchi
    [0.22, "#a9b6ee"],   // lavande soutenue
    [0.46, "#e7a9d8"],   // rose dragée, saturé
    [0.70, "#ffc9b4"],   // pêche
    [1.00, "#ffeccf"],   // crème chaude, à l'horizon seulement
  ],
  COL_SNOW: 0xfff4fb,        // la neige sucrée, en pleine lumière
  COL_SNOW_SHADE: 0xc7b4dd,  // son ombre, VIOLINE ET FRANCHE (était 0xe9dcee : trop pâle de deux crans)
  /* ⚠️ ÉCLAIRCIE APRÈS RENDU. Premier réglage à 0xf87fb4, en réaction au rose
     délavé du 413 — et c'était une surcorrection : la piste occupait le tiers
     bas du cadre en magenta soutenu et devenait l'élément le plus saturé de
     l'image, écrasant les bonbons, les fanions et le décor, qui sont justement
     ce qu'on doit repérer. Une surface qui couvre autant d'écran ne peut pas
     être aussi la plus saturée : elle doit se DISTINGUER de la neige (c'est son
     seul travail) et laisser les accents aux petits objets. */
  COL_PISTE: 0xfa96c0,       // la barbe à papa de la piste
  COL_PISTE_SWIRL: 0xffc5e2,  // ses tourbillons plus clairs
  COL_PISTE_EDGE: 0xd9527f,  // le liseré, nettement plus soutenu : c'est lui qui borne la piste à l'œil
  /* ⚠️ LE SILLON GRAVÉ ET LA TRACE DE DÉRAPAGE. Deux teintes, et l'écart entre
     elles EST l'information : la carre creuse un trait sombre et net dans la
     neige tassée, le dérapage étale une bavure PÂLE (de la neige retournée,
     pulvérisée). On lit donc d'un coup d'œil, derrière soi, ce qu'on vient de
     faire — et c'est tout l'objet du chantier. */
  /* ⚠️⚠️ ZIP 423 — LES DEUX TEINTES ONT ÉTÉ ÉCARTÉES, ET C'EST LE PASSAGE EN
     LINÉAIRE QUI L'IMPOSAIT. Guillaume : « la traînée est quasi invisible
     maintenant sur les virages ».
     Le sillon était réglé au 414 par comparaison de valeurs GAMMA : 0xd2699a
     contre 0xfa96c0 pour la piste, soit un écart qui SEMBLE net dans un
     sélecteur de couleur. En linéaire, ces deux valeurs sont beaucoup plus
     proches qu'elles n'en ont l'air (la courbe sRGB étire les tons sombres et
     tasse les clairs), et le tone mapping ACES les rapproche encore.
     ⚠️ LA LEÇON GÉNÉRALE, ET ELLE VAUT POUR TOUTE LA PALETTE : deux couleurs
     réglées « à l'œil » côte à côte dans un pipeline gamma ne gardent PAS leur
     écart apparent une fois le rendu passé en linéaire. Ce n'est pas une
     dérive de palette, c'est un changement d'unité — et ça ne se voit que sur
     les paires dont l'écart EST l'information. Il y en a trois dans ce jeu :
     le sillon, la bavure, et le liseré de piste. */
  COL_CARVE: 0xa83e6f,  // le sillon : franchement plus sombre
  COL_SKID: 0xfff0f8,        // la bavure : franchement plus claire, neige pulvérisée
  /* ⚠️⚠️ REFROIDIES AU 422, ET C'EST LE SEUL DÉPLACEMENT DE PALETTE DU ZIP.
     La valeur du 414 (0xe2cbc0) était réglée sous une lumière NEUTRE. Sous le
     soleil ambré du 422, la même teinte vire au brun : les montagnes prenaient
     le tiers haut du cadre en chocolat au lait, alors que la référence de
     Guillaume les montre blanches, bleutées dans l'ombre. La teinte n'a pas
     changé d'intention — « chocolat blanc, assombri pour avoir des faces » —
     elle a été recalée pour la donner sous la nouvelle lumière.
     ⚠️ ON NE COMPENSE PAS ÇA EN REFROIDISSANT LE SOLEIL : il éclaire tout le
     reste, et tout le reste est correct. Quand un seul objet vire, c'est cet
     objet qu'on corrige. */
  COL_MOUNT: 0xd8cede,       // chocolat blanc des montagnes, tiré vers le lilas (était 0xe2cbc0)
  COL_MOUNT_CAP: 0xfffaf6,   // leur calotte de sucre glace, restée le point le plus clair
  COL_MOUNT_FAR: 0xb9aed6,   // la chaîne lointaine, bleuie par l'air ET assez sombre pour se voir
  COL_CANE_RED: 0xff5478,    // sucre d'orge
  COL_CANE_WHITE: 0xfff4f8,
  /* ⚠️ DÉSATURÉ AU 422, MÊME RAISON QUE COL_MOUNT : sous un soleil ambré, un
     brun déjà chaud vire à l'ORANGE VIF, et le hameau devenait la chose la plus
     saturée du cadre — devant les bonbons, qui sont ce qu'on doit repérer. La
     règle du 414 (« une surface qui couvre beaucoup d'écran ne peut pas être
     aussi la plus saturée ») vaut pour un village comme pour la piste. */
  COL_GINGER: 0xb98a63,      // pain d'épices (était 0xc98a4b)
  COL_GINGER_DARK: 0x9a6f4c,
  COL_ICING: 0xfff7f0,       // glaçage
  COL_TRUNK: 0xb98a5e,
  COL_SYRUP: 0x7fc8e8,       // la rivière de sirop, bleu bonbon
  COL_SYRUP_DEEP: 0xff9ad4,  // ses veines roses
  COL_SLED: 0xb97f45,        // bois de la luge
  COL_SLED_DARK: 0x8d5c2e,
  COL_RUNNER: 0xffd98a,      // les patins, en caramel doré
  /* La tenue par défaut du lugeur. Elle est ÉCRASÉE par celle reçue de la
     ferme (voir bridge.js) : on doit se reconnaître d'un monde à l'autre. */
  COL_SHIRT: 0x3f7fd4,
  COL_PANTS: 0x454f66,
  COL_HAIR: 0x5a3a1e,
  COL_SKIN: 0xf0c8a0,
  COL_SCARF: 0xff5478,
  COL_BOOT: 0x4a3a2c,        // les bottes du fermier
  /* ⚠️ CES QUATRE-LÀ SONT CELLES DU DÉFI DE FUITE, VALEUR POUR VALEUR
     (public/templerun/js/config.js), et elles viennent elles-mêmes de
     HAIR_COLORS[0] / charPalette() dans fermeArt.js. Ce sont des REPLIS : la
     ferme envoie la vraie tenue du joueur. Elles ne comptent que quand on
     ouvre la page directement, hors ferme — mais alors le fermier doit quand
     même être LE fermier, pas un bonhomme bleu inventé pour l'occasion. */

  /* Les six teintes des sucettes et des buissons de gomme. Six, pas trois :
     en dessous, la forêt se lit comme un motif répété. */
  COL_CANDY_SET: [0xff7aa8, 0xffd166, 0x7ee0c9, 0x9db8ff, 0xc89bff, 0xff9e6b],
  /* ⚠️ LA MÊME PALETTE, ASSOMBRIE ET DÉSATURÉE, POUR LE DÉCOR LOINTAIN (414).
     C'est la PERSPECTIVE ATMOSPHÉRIQUE appliquée aux objets et pas seulement au
     brouillard, et c'est ce qui manquait le plus au 413 : les sapins du fond
     avaient exactement les mêmes teintes vives que ceux du bord de piste, si
     bien que la profondeur ne se lisait pas — une forêt entière semblait
     collée sur une même vitre. En descendant les lointains d'un cran de valeur
     et en les tirant vers le bleu, on obtient gratuitement les trois plans
     (piste / coteau / horizon) qu'un paysage doit avoir. */
  COL_CANDY_FAR: [0xb9648a, 0xc0a274, 0x7aaea9, 0x8496c4, 0x9d85bd, 0xc0806a],

  WORLD_LOLLI_DENSITY: 0.62,   // sucettes par tronçon et par côté
  WORLD_TREE_DENSITY: 0.85,    // sapins de gomme
  WORLD_HOUSE_EVERY: 11,       // un hameau tous les N tronçons (palier village)
  WORLD_ARCH_EVERY: 27,        // une arche de menthe poivrée tous les N tronçons (⚠️ espacée au 414 : à 17, soit toutes les 136 unités, on descendait derrière un rideau d'arches)
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
  FX_STAR_MAX: 340,
  FX_STAR_RATE: 210,       // étoiles par seconde, à dérapage plein
  FX_STAR_LIFE: 0.95,
  FX_STAR_SIZE: 1.5,
  FX_STAR_SPREAD: 9.5,     // vitesse d'éjection latérale
  FX_STAR_RISE: 4.2,
  FX_DUST_MAX: 460,
  FX_DUST_RATE: 130,
  FX_DUST_LIFE: 1.5,
  FX_DUST_SIZE: 1.1,
  /* ⚠️ LES TRAITS DE VITESSE (412). De longues traînées pâles éjectées vers
     l'arrière, de part et d'autre de la caméra, et SEULEMENT au-delà de
     SPEED_LINE_FROM. C'est le troisième pilier du « ça va vite », après la
     caméra proche et le champ qui s'ouvre : elles passent dans les coins du
     cadre, là où l'œil mesure le défilement sans regarder. En dessous du
     seuil il n'y en a aucune — sinon on ne sait plus si on va vite. */
  FX_LINE_MAX: 90,
  FX_LINE_RATE: 46,
  FX_LINE_LIFE: 0.42,
  FX_LINE_SIZE: 2.4,
  SPEED_LINE_FROM: 34,     // u/s à partir desquels elles apparaissent

  /* La neige qui tombe : très peu dense, très lente. Elle sert à remplir le
     ciel vide au-dessus de l'horizon, là où il n'y a ni piste ni décor. */
  /* ══════════════════════════════════════════════════════════════════════════
     LA PLUIE DE BONBONS DE L'ARRIVÉE (416) — demande explicite de Guillaume.
     ──────────────────────────────────────────────────────────────────────────
     ⚠️ CINQUIÈME SYSTÈME DE PARTICULES, ET IL NE RESSEMBLE À AUCUN DES QUATRE
     AUTRES — sinon il n'aurait pas fallu l'écrire. Ce qui le distingue :

       * IL EST COLORÉ ET SATURÉ, tiré de la palette des bonbons. Les quatre
         autres sont blancs ou pâles (neige, poudre, gerbe, traînées) : c'est
         la première fois que le ciel se remplit de couleur, et c'est ce qui
         fait l'événement.
       * IL TOMBE DU CIEL au lieu de sortir de la luge. Il n'est pas la
         conséquence d'un geste, il est une RÉCOMPENSE — donc il vient d'en
         haut, comme des confettis, et pas de sous les patins.
       * IL EST EN FONDU NORMAL. Un bonbon est de la MATIÈRE : il doit cacher
         ce qu'il y a derrière. En additif on obtiendrait une pluie de lumière,
         jolie et impalpable — exactement la faute que le 414 avait raisonnée
         pour la gerbe et que le 416 a dû corriger dans stepParticles.
       * IL DURE. Deux secondes et demie de chute pour chaque bonbon, et la
         pluie s'entretient pendant tout le dégagement : on doit avoir le temps
         de la regarder en s'arrêtant.

     ⚠️ ET ELLE SE DÉCLENCHE À LA LIGNE, PAS À L'ARRÊT. `sled.finished` passe à
     vrai dès l'entrée dans la zone de dégagement ; l'écran de fin, lui,
     n'arrive qu'une fois la luge posée, plusieurs secondes plus tard. Fêter à
     l'écran de fin serait fêter APRÈS coup, devant un panneau — la pluie doit
     tomber pendant qu'on roule encore, sur le paysage, en pleine glisse. */
  FX_RAIN_MAX: 300,
  /* ⚠️ DÉBIT ET TAILLE DIVISÉS PAR TROIS APRÈS REGARD SUR PLANCHE. Premier
     réglage : 210 bonbons par seconde de 2,2 unités. L'image est revenue
     ILLISIBLE — deux cents disques pastel géants recouvrant la piste, les
     montagnes et la luge. On ne voyait plus le jeu.
     ⚠️ UN EFFET DE FÊTE SE JUGE À CE QU'IL LAISSE VOIR, PAS À CE QU'IL AJOUTE.
     Le joueur vient de finir une descente de trois minutes : ce qu'il veut
     regarder, c'est SA luge qui franchit la ligne. La pluie encadre ce
     moment, elle ne le remplace pas. */
  FX_RAIN_RATE: 62,          // bonbons par seconde pendant la salve
  FX_RAIN_BURST: 2.6,        // durée de la salve pleine, en secondes
  FX_RAIN_TAIL: 6.0,         // ... puis elle décroît jusqu'à cette durée totale
  FX_RAIN_LIFE: 2.6,
  FX_RAIN_SIZE: 1.25,        // plus gros qu'une étincelle (0,55) sans occuper le cadre
  /* ⚠️⚠️ LA HAUTEUR A DÛ ÊTRE DIVISÉE PAR DEUX APRÈS REGARD SUR PLANCHE, ET LA
     RAISON EST GÉOMÉTRIQUE, PAS ESTHÉTIQUE. Premier réglage : trente-quatre
     unités, « la hauteur d'un vrai lâcher de confettis ». La planche est
     revenue VIDE — pas un bonbon.
     Le champ vertical de la caméra fait 62°, donc 31° au-dessus de l'axe visé.
     Un bonbon lâché à 34 unités au-dessus d'un point situé à 30 unités devant
     est à 48° : il est HORS CADRE. Et il meurt de vieillesse avant d'être
     redescendu dans le champ.
     ⚠️ LA RÈGLE : UN EFFET AÉRIEN SE RÈGLE SUR LE CHAMP DE LA CAMÉRA, PAS SUR
     LA VRAISEMBLANCE. Ce qu'on ne cadre pas n'existe pas. Quinze unités est à
     peu près la limite haute de ce qu'on voit à trente unités devant. */
  FX_RAIN_HEIGHT: 15,        // hauteur d'apparition au-dessus de la piste
  /* ⚠️ ET ON EN SÈME AUSSI DERRIÈRE LA LUGE (valeurs négatives) : ceux-là
     passent tout près de l'objectif, énormes et flous. C'est ce qui fait la
     différence entre « il y a des bonbons dans le ciel » et « on est DANS la
     pluie de bonbons » — le premier plan, toujours. */
  FX_RAIN_AHEAD_MIN: 4,
  FX_RAIN_AHEAD_MAX: 52,
  FX_RAIN_SPREAD: 46,        // largeur de la zone arrosée, en unités
  FX_RAIN_FALL: 11,          // gravité ; ⚠️ FAIBLE : des confettis flottent
  FX_RAIN_DRIFT: 3.2,        // dérive latérale, pour que ça ne tombe pas droit

  /* ══════════════════════════════════════════════════════════════════════════
     LES CONFETTIS DE L'ARRIVÉE (ZIP 424).
     ──────────────────────────────────────────────────────────────────────────
     ⚠️ POURQUOI UN SYSTÈME DE PLUS PLUTÔT QU'UNE VARIANTE DE LA PLUIE. Un
     système de points n'a QU'UNE texture : on ne peut pas mêler des bonbons
     ronds et des confettis plats dans le même. Et le mélange est justement
     l'effet recherché — deux tailles, deux formes et deux vitesses de chute
     lues ensemble, c'est ça qui fait « fête » plutôt que « pluie colorée ».

     ⚠️ LEUR GÉOMÉTRIE D'ÉMISSION EST CELLE DE LA PLUIE, RÉUTILISÉE TELLE QUELLE
     (hauteur, avance, largeur d'arrosage). Ce ne sont pas des réglages libres :
     ce sont des contraintes du CHAMP DE LA CAMÉRA, démontrées au 416 (voir
     FX_RAIN_HEIGHT). Les recopier en les retouchant, c'est reconstituer la
     divergence que le §7 interdit — on les DÉRIVE.

     Ce qui leur appartient en propre : ils sont PLUS PETITS, PLUS NOMBREUX,
     ils tombent DEUX FOIS PLUS LENTEMENT et dérivent DEUX FOIS PLUS. Un
     confetti est une feuille : il ne tombe pas, il descend en tournoyant. */
  FX_CONF_MAX: 280,
  FX_CONF_RATE: 130,         // par seconde pendant la salve — le double des bonbons
  FX_CONF_LIFE: 3.4,
  FX_CONF_SIZE: 0.42,        // un tiers d'un bonbon de pluie (1,25)
  FX_CONF_FALL: 5.0,         // ⚠️ moitié de FX_RAIN_FALL : ils PLANENT
  FX_CONF_DRIFT: 6.0,        // et partent de côté bien plus que les bonbons

  /* ══════════════════════════════════════════════════════════════════════════
     LES BALLONS DE L'ARRIVÉE (ZIP 424) — lâchés à la ligne, gonflés à l'hélium.
     ──────────────────────────────────────────────────────────────────────────
     ⚠️ ILS MONTENT, ET C'EST LEUR SEULE RAISON D'EXISTER. Tout ce qui tombe
     déjà (bonbons, confettis) dit la même chose ; un mouvement à CONTRE-SENS
     dans le même cadre est ce qui transforme une pluie en fête. Deux directions
     opposées se lisent instantanément, là où trois systèmes qui tombent
     ensemble se lisent comme un seul, plus dense.

     ⚠️ ET CE NE SONT PAS DES PARTICULES : ce sont de vrais objets, avec une
     ficelle. Un point de sprite ne peut pas porter de ficelle, et c'est la
     ficelle qui fait lire « ballon » plutôt que « bulle » — à seize exemplaires,
     le coût est nul et la lecture est acquise.

     ⚠️ ILS SORTENT DU CADRE PAR LE HAUT, VITE. Un ballon qui traînerait dans le
     champ pendant tout le dégagement masquerait la piste au moment où le joueur
     regarde son arrêt. Ils montent, ils partent, on ne les revoit pas. */
  FINISH_BALLOONS: 16,
  FINISH_BALLOON_R: 0.60,
  FINISH_BALLOON_RISE: 4.6,      // u/s, vers le haut
  FINISH_BALLOON_SPREAD: 20,     // largeur du lâcher, en travers de la piste
  FINISH_BALLOON_SWAY: 0.65,     // amplitude du balancement latéral
  FINISH_BALLOON_LIFE: 7.0,      // secondes avant disparition
  FINISH_BALLOON_STRING: 1.5,    // longueur de la ficelle, en unités

  /* ══════════════════════════ LE SOLEIL ET SON HALO (ZIP 422) ══════════════
     ⚠️ LE SOLEIL N'ÉTAIT QU'UNE TACHE PEINTE DANS LA TEXTURE DE CIEL. Une tache
     peinte ne peut pas déborder : elle est plafonnée à 1,0 par construction,
     donc elle ne passe jamais le seuil du bloom, donc elle ne rayonne pas. Le
     ciel avait un soleil, le monde n'en avait pas.
     On pose donc un vrai disque dans la scène, à une valeur linéaire très
     supérieure à 1 — c'est la SEULE source de l'image qui vaille plus que le
     blanc, et c'est pour elle que le seuil de bloom a été réglé haut.
     ⚠️ IL EST DANS LE GROUPE DU CIEL, donc il suit la caméra : un soleil qu'on
     pourrait approcher serait un lampion. C'est la règle 3 de world.js. */
  SUN_DISC: 26,              // rayon du disque, en unités, à la distance du dôme
  SUN_DISC_GAIN: 7.0,        // sa valeur linéaire : très au-dessus du blanc
  SUN_HALO: 190,             // rayon du halo diffus qui l'entoure
  SUN_HALO_GAIN: 0.42,
  COL_SUN_DISC: 0xfff2d8,
  COL_SUN_HALO: 0xffd9b0,

  /* Les POUSSIÈRES DE SUCRE en suspension (422). ⚠️ Elles ne tombent pas et ne
     sont pas de la neige : elles FLOTTENT, très près de la caméra, et leur seul
     travail est de donner de l'épaisseur à l'air entre l'objectif et le
     paysage. C'est le plan le plus proche de toute l'image, et il n'existait
     pas — le cadre commençait à la piste, c'est-à-dire à dix mètres. */
  FX_MOTE_COUNT: 130,
  FX_MOTE_AREA: 26,
  FX_MOTE_SIZE: 0.16,

  FX_SNOW_COUNT: 420,
  FX_SNOW_AREA: 120,
  FX_SNOW_FALL: 2.4,

  BEST_KEY: "vf-luge-best",
};
