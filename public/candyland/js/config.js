/* =============================================================================
   config.js — Constantes du mini-jeu du Pays des Bonbons (zip 385).
   -----------------------------------------------------------------------------
   TOUT ce qui se règle vit ici, y compris la physique. C'est la leçon du défi
   de fuite : un chiffre écrit en dur au milieu d'une boucle de rendu est un
   chiffre qu'on ne retrouve plus quand Guillaume demande « le bonbon tombe trop
   vite ».

   REPÈRE FONDAMENTAL : la scène est en coordonnées LOGIQUES fixes, W x H
   (800 x 600). Le canvas est mis à l'échelle pour tenir dans la fenêtre, avec
   des bandes noires si besoin. Conséquence directe et voulue : un niveau se
   joue EXACTEMENT pareil sur toutes les tailles d'écran, et tools/verify-
   levels.js peut rejouer la vraie physique sans navigateur et affirmer qu'un
   niveau est résoluble. Passer en coordonnées relatives à la fenêtre casserait
   les deux propriétés d'un coup.
   ========================================================================== */

const CFG = {
  /* ------------------------------------------------------------- la scène */
  W: 800,
  H: 600,

  /* --------------------------------------------------------- la physique --
     Intégration de Verlet à pas FIXE (SUB_DT), quel que soit le temps réel
     écoulé. Un pas variable ferait qu'une image sautée change la trajectoire :
     le même niveau, joué deux fois de la même façon, ne donnerait pas le même
     résultat, et aucune vérification hors navigateur n'aurait de valeur. */
  SUB_DT: 1 / 120,          // pas de simulation, secondes
  MAX_SUB: 8,               // pas de simulation max rattrapés en une image (anti-spirale)
  GRAVITY: 1180,            // px/s², vers le bas
  DAMPING: 0.9975,          // amortissement par pas (air)
  CONSTRAINT_ITER: 6,       // passes de résolution des cordes par pas

  CANDY_R: 13,              // rayon du bonbon
  ROPE_SEGMENTS: 12,        // segments dessinés le long d'une corde (visuel seulement)

  /* Les cordes ne sont PAS des ressorts : elles ne font rien tant que le
     bonbon est à moins de `len` de l'ancre, et deviennent inextensibles au
     delà. C'est le comportement de Cut the Rope, et c'est ce qui rend le
     balancement lisible : le bonbon tombe librement puis est cueilli. */
  ROPE_SLACK: 1.0,          // multiplicateur de longueur au repos (1 = strict)

  BUMPER_RESTITUTION: 0.82, // rebond sur un coussin de guimauve
  BUBBLE_LIFT: -520,        // accélération verticale dans une bulle (px/s²), vers le haut
  BUBBLE_DAMP: 0.985,       // la bulle freine : sans ça le bonbon part en orbite
  FAN_POWER: 620,           // poussée d'un souffleur de sucre glace (px/s²)

  /* Fin de niveau par immobilité : sans ça, un bonbon coincé sur un coussin
     laisse le joueur devant un écran figé sans savoir s'il a perdu. */
  REST_SPEED: 12,           // px/s en dessous desquels on considère l'arrêt
  REST_MS: 1400,            // durée d'immobilité avant la défaite

  /* Marge de tolérance de la bouche. Le rayon de la zone de victoire est un
     peu plus grand que la bouche dessinée : un bonbon qui frôle la lèvre DOIT
     être mangé, sinon le joueur a raison de crier à l'injustice. */
  MOUTH_FORGIVE: 1.25,

  /* Hors-jeu. Généreux sur les côtés (un bonbon peut sortir et revenir grâce
     à une corde), strict en bas (rien ne remonte du bas de l'écran). */
  OUT_MARGIN_X: 260,
  OUT_MARGIN_Y: 120,

  /* ------------------------------------------- mécanismes du zip 387 -----
     Épingles, cordes automatiques, araignées, souffle. Les quatre demandés par
     Guillaume. Tous les réglages ici, aucun chiffre en dur dans le moteur. */
  AUTO_REACH: 62,           // portée d'une corde automatique (px)
  AUTO_MIN_LEN: 34,         // longueur minimale au moment où elle happe
  SPIDER_SPEED: 0.18,       // fraction de corde parcourue par seconde (défaut)

  /* Le souffle. BLOW_MIN_SWIPE est délibérément haut : un geste lent qui vise
     une corde ne doit JAMAIS souffler par accident. Seul un vrai coup sec
     compte, et uniquement sur les niveaux qui déclarent `blow: true`. */
  BLOW_R: 74,               // distance max entre le geste et le bonbon
  BLOW_MIN_SWIPE: 46,       // longueur minimale du geste (px logiques)
  BLOW_MAX: 320,            // au-delà, le geste ne pousse pas plus fort
  BLOW_GAIN: 0.014,         // conversion longueur de geste -> vitesse

  /* ------------------------------------------------------------- la coupe */
  CUT_MIN_DIST: 4,          // longueur minimale d'un geste pris en compte (px logiques)
  POP_R: 26,                // rayon de clic pour crever une bulle

  /* ------------------------------------------------------------ récompenses
     Doivent rester d'accord avec fermeConstants.js (CANDY_GAME_*). La ferme
     est seule juge : ces valeurs ne servent QU'À l'affichage côté mini-jeu. */
  LEVELS: 15,
  GOLD_LEVEL: 10,
  GOLD_AMOUNT: 10000,
  PET_LEVEL: 15,

  /* -------------------------------------------------------------- palette */
  COL_BG_TOP: "#ffd9ec",
  COL_BG_BOT: "#f9a8cd",
  COL_HILL_1: "#f7c6de",
  COL_HILL_2: "#eda9c8",
  COL_ROPE: "#7a4a2e",
  COL_ROPE_HI: "#a2673f",
  COL_ANCHOR: "#5c3520",
  COL_CANDY: "#e8356e",
  COL_CANDY_HI: "#ff7fa8",
  COL_CANDY_WRAP: "#fff3f8",
  COL_STAR: "#ffd23f",
  COL_STAR_HI: "#fff0b0",
  COL_SPIKE: "#a8e02a",
  COL_SPIKE_HI: "#d7f77a",
  COL_BUMPER: "#fff6fb",
  COL_BUMPER_HI: "#ffc9e2",
  COL_BUBBLE: "rgba(255,255,255,0.42)",
  COL_BUBBLE_EDGE: "rgba(255,255,255,0.85)",
  COL_FAN: "#c9a6ff",
  COL_MONSTER: "#ff9ecb",        // zip 387 : rose et pelucheux (demande Guillaume)
  COL_MONSTER_DARK: "#e26ba6",
  COL_MONSTER_MOUTH: "#7d1f4a",
  COL_MONSTER_TONGUE: "#ff5c8a",
  COL_CUT: "rgba(255,255,255,0.9)",

  /* Zip 387 — PIXELLISATION DU GOURMANDIN (demande Guillaume : « pixelate
     it »). Le monstre est peint dans un tampon RÉDUIT puis agrandi sans
     lissage : les gros pixels sont donc de vrais pixels, pas un filtre.

     C'est la seule façon d'obtenir le grain de la ferme (tout le pixel art du
     site est généré par code) sans réécrire le monstre case par case — et ça
     garde la bouche exactement là où la physique la teste, ce qui est le point
     à ne jamais perdre de vue dans ce jeu. */
  PIX_SCALE: 0.25,
};
