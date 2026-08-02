/* =============================================================================
   strings.js — textes FR/EN du Labyrinthe.
   -----------------------------------------------------------------------------
   Troisième table du projet à vivre hors de fermeStrings.js, pour la même
   raison que les deux autres (RUN_STR, CANDY_STR) : une page servie depuis
   public/ ne peut pas lire FERME_STR. La ferme impose sa langue au chargement
   par vf-lab-init, le jeu la suit.

   ⚠️ PARITÉ VÉRIFIÉE PAR tools/check-strings.js, qui compte les clés des deux
   blocs ET exécute ui.js contre un faux DOM. La symétrie ne suffit pas : une
   clé FONCTION appelée alors qu'elle n'existe pas ne laisse pas un libellé
   vide, elle jette une exception en pleine partie (leçon du zip 387).

   Règle de traduction du projet (371) : « on traduit dans l'esprit, pas
   toujours littéralement si l'effet n'est pas aussi bon ». Règle du site :
   aucun tiret quadratin dans le texte FR joueur.
   ========================================================================== */

const LAB_STR = {
  fr: {
    title: "Le Labyrinthe",
    sub: "Quelque chose t'attend dans le noir. Ta torche ne durera pas.",
    start: "Entrer",
    back: "Ressortir",
    resume: "Reprendre",
    quit: "Abandonner",
    pause: "Pause",
    quitWarn: "Abandonner compte comme un échec : tu rentres blessé.",

    hScore: "SCORE",
    hShards: "ÉCLATS",
    hFlame: "TORCHE",
    hHearts: "VIE",
    hBest: "RECORD",

    cLane: "Z Q S D : se déplacer · Maj : courir (bruyant)",
    cLook: "Souris : regarder · ← → : tourner au clavier",
    cStrafe: "Clic gauche : frapper (il faut d'abord trouver une épée)",
    cHit: "Clic droit ou R : tirer un carreau d'arbalète",
    cShoot: "E ou F : raviver la torche · ramasser",
    cUse: "M ou Tab : déplier le plan (si tu l'as trouvé)",
    cMap: "Échap : pause",
    cPause: "Échap : pause",

    hint: "La sortie est au nord : cherche la colonne de lumière violette. Elle dit où, jamais comment.",
    hintFarm: "Tu joues depuis Ferme Vallée : les éclats rapportés deviennent de l'or.",
    hintExit: "Ressortir sans entrer ne coûte rien.",

    tipSword: "⚔️ Une épée ! Espace pour frapper.",
    tipRevive: "🔥 Torche ravivée. Le brasier est éteint pour de bon.",
    tipTorchLow: "La flamme faiblit. Trouve un brasier.",
    tipTorchOut: "Ta torche est morte. Il sait exactement où tu es.",
    tipCrack: "La dalle craque sous tes pieds. Ne reste pas là.",
    tipStalker: "Quelque chose s'est mis en marche, quelque part au nord.",
    tipPotion: "Un champignon de suif : un cœur retrouvé.",

    /* ZIP 396 — le renoncement, la herse, et l'écran de chargement. */
    tipPlatform: "Derrière toi, une passerelle : tu peux repartir sans rien risquer.",
    tipGateWarn: "La herse tremble au-dessus de la porte.",
    tipGateShut: "La herse est tombée. Il n'y a plus qu'à avancer.",
    /* ZIP 397 — la carte, l'arbalète, les carreaux, la navigation. */
    tipMap: "Un plan du dédale ! La minicarte montre maintenant tout — M pour le déplier.",
    tipBow: "Une arbalète, et cinq carreaux. Clic droit pour tirer.",
    tipBolts: "Des carreaux.",
    tipNoMap: "Tu n'as pas encore trouvé de plan. Cherche une carte luisante accrochée à un mur.",
    mapPartial: "ce que tu as vu",
    mapFull: "plan complet",
    mapHint: "M ou Tab pour refermer. Le temps continue de passer.",
    lockHint: "Clique pour reprendre la souris",
    hBack: "RETOUR",
    loading: "Le labyrinthe se construit…",
    cBack: "Faire demi-tour dans les 15 premières secondes pour repartir sans rien perdre",

    overTitle: "Le labyrinthe t'a gardé",
    overFall: "Tu es passé à travers la dalle. Le lac t'attendait dessous.",
    overRoamer: "Une créature a eu raison de toi.",
    overStalker: "Il t'a rattrapé. Il n'y avait rien à faire d'autre que courir.",
    overQuit: "Tu as fait demi-tour.",
    winTitle: "Dehors",
    winSub: "Tu ressors au pied du pont, du bon côté du lac.",
    newBest: "NOUVEAU RECORD",
    fScore: "Score",
    fShards: "Éclats",
    fDepth: "Cellules explorées",
    fBest: "Record",
    loadError: "Impossible de charger le moteur 3D (three.js). Vérifie ta connexion, puis recharge.",
  },
  en: {
    title: "The Labyrinth",
    sub: "Something is waiting in the dark. Your torch will not last.",
    start: "Go in",
    back: "Leave",
    resume: "Resume",
    quit: "Give up",
    pause: "Paused",
    quitWarn: "Giving up counts as a loss: you come home hurt.",

    hScore: "SCORE",
    hShards: "SHARDS",
    hFlame: "TORCH",
    hHearts: "LIFE",
    hBest: "BEST",

    cLane: "W A S D : move · Shift : run (loud)",
    cLook: "Mouse : look · ← → : turn with the keyboard",
    cStrafe: "Left click : strike (you must find a sword first)",
    cHit: "Right click or R : loose a crossbow bolt",
    cShoot: "E or F : relight your torch · pick up",
    cUse: "M or Tab : unfold the map (once you have found it)",
    cMap: "Esc : pause",
    cPause: "Esc : pause",

    hint: "The way out is north: look for the violet pillar of light. It tells you where, never how.",
    hintFarm: "You are playing from Valley Farm: shards you bring back turn into gold.",
    hintExit: "Leaving without going in costs nothing.",

    tipSword: "⚔️ A sword! Press Space to strike.",
    tipRevive: "🔥 Torch relit. That brazier is out for good.",
    tipTorchLow: "The flame is dying. Find a brazier.",
    tipTorchOut: "Your torch is dead. It knows exactly where you are.",
    tipCrack: "The slab is cracking under you. Do not stand still.",
    tipStalker: "Something started moving, somewhere to the north.",
    tipPotion: "A tallow mushroom: one heart back.",

    /* ZIP 396 — giving up, the portcullis, and the loading screen. */
    tipPlatform: "There is a walkway behind you: you can still leave, free of charge.",
    tipGateWarn: "The portcullis is shaking above the doorway.",
    tipGateShut: "The portcullis is down. The only way now is forward.",
    /* ZIP 397 — the map, the crossbow, the bolts, navigation. */
    tipMap: "A plan of the maze! The minimap now shows everything — press M to unfold it.",
    tipBow: "A crossbow, and five bolts. Right click to shoot.",
    tipBolts: "Bolts.",
    tipNoMap: "You have not found a plan yet. Look for a glowing map pinned to a wall.",
    mapPartial: "what you have seen",
    mapFull: "full plan",
    mapHint: "M or Tab to close. Time keeps running.",
    lockHint: "Click to take the mouse back",
    hBack: "WAY BACK",
    loading: "Building the labyrinth…",
    cBack: "Turn back within the first 15 seconds to leave with nothing lost",

    overTitle: "The labyrinth kept you",
    overFall: "You went through the slab. The lake was waiting underneath.",
    overRoamer: "A creature got the better of you.",
    overStalker: "It caught you. There was never anything to do but run.",
    overQuit: "You turned back.",
    winTitle: "Out",
    winSub: "You step out at the foot of the bridge, on the right side of the lake.",
    newBest: "NEW BEST",
    fScore: "Score",
    fShards: "Shards",
    fDepth: "Cells explored",
    fBest: "Best",
    loadError: "Could not load the 3D engine (three.js). Check your connection, then reload.",
  },
};
