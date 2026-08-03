/* =============================================================================
   strings.js — Tous les textes de la descente, en français et en anglais.
   -----------------------------------------------------------------------------
   Même règle qu'au défi de fuite et au labyrinthe : RIEN n'est écrit en dur
   dans index.html. La ferme impose sa langue au chargement (message
   "vf-luge-init"), la page la suit. Un texte oublié ici se voit tout de suite
   — il apparaît vide à l'écran — alors qu'un texte oublié dans le HTML ne se
   voit qu'en anglais, chez quelqu'un d'autre.
   ========================================================================== */

const STR = {
  fr: {
    title: "La Grande Descente",
    sub: "Dévale la piste de barbe à papa. Les bonbons se ramassent, les gourmands s'évitent.",
    start: "S'élancer",
    cLane: "← → : diriger la luge",
    cJump: "↑ : sauter la bosse",
    cSlide: "↓ : freiner et déraper",
    cPause: "Échap : pause",
    hint: "Plus la pente est raide, plus tu vas vite — et moins tu tournes.",
    hintExit: "La descente se termine toute seule en bas de la vallée.",
    hintFarm: "Tes bonbons et ton meilleur temps sont rapportés au Pays des Bonbons.",
    loadError: "La 3D n'a pas pu se charger. Vérifie ta connexion, puis recharge la page.",

    score: "Score",
    candies: "Bonbons",
    speed: "KM/H",
    time: "Temps",
    best: "Record",
    stage: "Palier",

    pause: "Pause",
    resume: "Reprendre",
    quit: "Abandonner",
    quitWarn: "Abandonner en pleine descente ne rapporte rien.",

    overCrash: "Tu as percuté un gourmand !",
    overFence: "Tu as quitté la piste.",
    overAbort: "Descente abandonnée.",
    overTitle: "Fin de la descente",
    finish: "Vallée atteinte !",
    finishSub: "La luge s'arrête d'elle-même au bord du lac de sirop.",
    newBest: "Nouveau record !",
    back: "Retour au Pays des Bonbons",
    overHint: "Reviens quand tu veux : le monstre du lac garde la piste ouverte.",

    boost: "TURBO",
    drift: "DÉRAPAGE",
  },

  en: {
    title: "The Great Descent",
    sub: "Race down the cotton-candy slope. Grab the sweets, dodge the gluttons.",
    start: "Push off",
    cLane: "← → : steer the sled",
    cJump: "↑ : jump the bump",
    cSlide: "↓ : brake and drift",
    cPause: "Esc : pause",
    hint: "The steeper it gets, the faster you go — and the less you turn.",
    hintExit: "The run ends by itself at the bottom of the valley.",
    hintFarm: "Your sweets and best time are carried back to Candy Land.",
    loadError: "3D failed to load. Check your connection, then reload the page.",

    score: "Score",
    candies: "Sweets",
    speed: "KM/H",
    time: "Time",
    best: "Best",
    stage: "Stage",

    pause: "Paused",
    resume: "Resume",
    quit: "Give up",
    quitWarn: "Giving up mid-run earns nothing.",

    overCrash: "You slammed into a glutton!",
    overFence: "You left the slope.",
    overAbort: "Run abandoned.",
    overTitle: "Run over",
    finish: "Valley reached!",
    finishSub: "The sled coasts to a stop at the edge of the syrup lake.",
    newBest: "New best!",
    back: "Back to Candy Land",
    overHint: "Come back any time — the lake monster keeps the slope open.",

    boost: "BOOST",
    drift: "DRIFT",
  },
};
