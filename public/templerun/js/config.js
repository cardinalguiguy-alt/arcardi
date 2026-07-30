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

  NODE_LEN_MIN: 48,         // longueur d'un tronçon droit, en unités
  NODE_LEN_MAX: 92,
  NODES_AHEAD: 5,           // tronçons construits devant le joueur
  NODES_BEHIND: 2,          // tronçons conservés derrière (pour voir les loups)

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
  SLIDE_ROLL_MS: 130,       // durée du bascule sur le flanc, en entrée ET en sortie
  SLIDE_ROLL_ANGLE: 1.22,   // inclinaison du corps en glissade (rad, ~70°, pas 90 pour rester lisible)
  SLIDE_DROP: 0.42,         // abaissement du buste pour coller le flanc au sol
  SLIDE_PELVIS_Y: 0.55,     // hauteur du pivot de bascule (bassin) utilisé pour coucher le corps
  COYOTE_MS: 110,           // tolérance de saut juste après avoir quitté le sol
  INPUT_BUFFER_MS: 160,     // une entrée un poil trop tôt reste valable

  /* --------------------------------------------------------------- VIRAGES */
  TURN_INPUT_WINDOW: 16,    // distance AVANT le virage où l'entrée est acceptée
  TURN_GRACE_AFTER: 3.5,    // tolérance APRÈS le point de virage
  TURN_CHANCE_START: 0.22,  // probabilité qu'un tronçon se termine par un virage
  TURN_CHANCE_MAX: 0.5,
  TURN_MIN_GAP_NODES: 1,    // nb de tronçons droits minimum entre deux virages
  TURN_CLEAR_BEFORE: 16,    // zone sans obstacle avant un virage
  TURN_CLEAR_AFTER: 14,     // zone sans obstacle après un virage

  /* ------------------------------------------------------------- OBSTACLES */
  OBST_SPACING_MIN: 15,     // distance minimale entre deux obstacles
  OBST_DENSITY_START: 0.45, // proportion des emplacements réellement occupés
  OBST_DENSITY_MAX: 0.85,
  OBST_DENSITY_RAMP_DIST: 2200,
  OBST_START_SAFE_DIST: 90, // aucun obstacle sur les 90 premières unités
  GAP_LENGTH: 4.6,          // longueur d'un trou (saut obligatoire)
  LOW_HEIGHT: 0.95,         // barrière basse : à sauter
  HIGH_CLEARANCE: 1.15,     // poutre haute : à passer en glissade

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
  FOG_NEAR_DENSITY: 0.024,
  DRAW_DISTANCE: 260,

  /* --------------------------------------- PALETTE — relevée dans le jeu ---
     Reprise telle quelle de la carte maléfique de Ferme Vallée
     (drawEvilFrame dans FermeGame.js, deadTree dans fermeArt.js) pour que le
     défi ne détonne pas à côté du reste du monde. */
  COL_SKY:        0x2a1840,  // ciel violet nocturne (illustration de référence)
  COL_FOG:        0x1a1030,
  COL_GROUND:     0x182417,  // sol de la carte maléfique
  COL_VOID:       0x0b120c,  // fond, sous la piste
  COL_STONE:      0x6b6152,  // dalle de pierre du couloir
  COL_STONE_DARK: 0x4a4438,
  COL_STONE_EDGE: 0x3a352c,
  COL_BARK:       0x3a342e,  // arbre mort
  COL_BARK_DARK:  0x231f1a,
  COL_PURPLE:     0x8c5ADC,  // lueur du passage sombre / du lac
  COL_PURPLE_DIM: 0x4a2a7a,
  COL_TORCH:      0xff9a3c,
  COL_COIN:       0xf2c43d,
  COL_WOLF:       0x14100f,
  COL_WOLF_EYE:   0xff3020,
  COL_OBSTACLE:   0x55503f,
  COL_STAIN:      0x3a4a2e,  // moisissure/mousse sur la pierre, teinte verdâtre raccord évil
  COL_STAIN_DARK: 0x22301c,  // cœur des taches d'humidité, plus sombre
  COL_CRACK:      0x110d0b,  // fêlures dans la pierre

  /* --------------------------------------------------- SOL EN RUINE ---
     3 paliers d'usure tirés au sort par dalle (voir World.buildStoneVariants) :
     0 intacte, 1 fissurée, 2 très abîmée. Pondération qui favorise le palier
     du milieu — décision prise avec Guillaume, pas de dalle neuve trop
     propre, pas de chaos permanent. */
  FLOOR_WEAR_WEIGHTS: [0.25, 0.45, 0.30],
  FLOOR_TILT_CRACKED: 0.02,   // rad — bascule légère des dalles fissurées
  FLOOR_TILT_RUINED:  0.05,   // rad — bascule plus marquée des dalles très abîmées
  FLOOR_SINK_RUINED:  0.05,   // affaissement visuel des dalles très abîmées

  /* Tenue du fermier — OUTFITS[0] de fermeConstants.js */
  COL_SHIRT: 0x3f7fd4,
  COL_PANTS: 0x454f66,
  COL_SKIN:  0xf0c8a0,
  COL_HAIR:  0x8a5a30,
};

/* Dérivés — ne pas régler à la main. */
CFG.SPEED_RANGE = CFG.SPEED_MAX - CFG.SPEED_START;
CFG.LANE_X = [];
for (let i = 0; i < CFG.LANE_COUNT; i++) {
  CFG.LANE_X.push((i - (CFG.LANE_COUNT - 1) / 2) * CFG.LANE_WIDTH);
}

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
