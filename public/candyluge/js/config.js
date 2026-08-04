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
  CAM_FOV: 82,
  CAM_BACK: 9.0,           // recul derrière la luge, en unités
  CAM_HEIGHT: 4.6,         // hauteur au-dessus de la piste
  CAM_LOOK_AHEAD: 15,      // distance du point visé, devant la luge
  CAM_LOOK_HEIGHT: 2.3,    // hauteur du point visé
  CAM_LAG: 7.0,            // raideur du suivi horizontal (plus haut = plus collé)
  CAM_LAG_Y: 2.4,          // ⚠️ et le suivi VERTICAL est bien plus mou : voir camera.js
  CAM_BACK_SPEED: 3.4,     // recul supplémentaire à pleine vitesse
  CAM_DROP_SPEED: 1.5,     // ... et abaissement, sur la même plage
  CAM_YAW_LAG: 4.2,        // raideur du suivi d'ORIENTATION, plus molle que la position
  /* Le champ s'ouvre avec la vitesse : +12° au maximum. C'est le plus vieux
     truc du jeu de course et il n'a pas d'équivalent — sans lui, 30 u/s et
     55 u/s se ressemblent, parce que rien à l'écran ne change de taille. */
  CAM_FOV_SPEED: 16,
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
  EDGE_RATE: 4.2,
  EDGE_CROSS_MUL: 0.5,
  EDGE_SPEED_FALLOFF: 0.62,   // à pleine vitesse, il reste 62 % de cette vivacité
  EDGE_AIR_MUL: 0.3,          // en l'air, on oriente à peine

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
  LAT_GRIP: 8.5,              // vitesse à laquelle la trajectoire rejoint le nez, sur la carre

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
  LIGHT_SUN: 1.05,           // le soleil, chaud et rasant — il DOMINE (était 0,72)
  LIGHT_SKY: 0.46,           // l'hémisphère : bleu du ciel en haut, rose de la neige en bas
  LIGHT_AMBIENT: 0.20,       // et ce qui reste d'ambiante pure (était 0,78 : voir ci-dessus)
  COL_LIGHT_SUN: 0xfff0cc,   // lumière chaude
  COL_LIGHT_SKY: 0xa8c4ff,   // le ciel, franchement bleu
  COL_LIGHT_GROUND: 0xffc0dd, // le rebond de la neige, franchement rose
  FOG_DENSITY: 0.0016,       // moins dense qu'au 413 : le brouillard mangeait les montagnes
  COL_FOG: 0xffdccb,

  ROLL_PER_EDGE: 0.62,        // inclinaison visuelle de la luge à pleine carre

  SLED_STEER_MAX: 0.85,       // rad, angle maximal entre le nez et la piste

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
  COL_CARVE: 0xd2699a,       // le sillon : plus sombre que la piste, sans virer au brun
  COL_SKID: 0xffd9ea,        // la bavure : plus claire, neige retournée
  COL_MOUNT: 0xe2cbc0,       // chocolat blanc des montagnes, assombri pour qu'elles aient des faces
  COL_MOUNT_CAP: 0xfffaf6,   // leur calotte de sucre glace, restée le point le plus clair
  COL_MOUNT_FAR: 0xb9aed6,   // la chaîne lointaine, bleuie par l'air ET assez sombre pour se voir
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
  FX_SNOW_COUNT: 420,
  FX_SNOW_AREA: 120,
  FX_SNOW_FALL: 2.4,

  BEST_KEY: "vf-luge-best",
};
