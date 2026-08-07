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
    /* ⚠️ AUCUNE COMMANDE NOUVELLE AU 414, et c'est une demande explicite :
       « pas besoin de mettre trop de commandes différentes ». Tout ce que le
       zip ajoute — la résistance du sol, la charge, le sillon, la gerbe, les
       checkpoints — se pilote avec les QUATRE MÊMES TOUCHES. Une mécanique qui
       réclame un bouton de plus est presque toujours une mécanique mal pensée :
       la profondeur vient de ce qu'une touche connue fait de plus, jamais du
       nombre de touches. */
    cReset: "Une chute te ramène au dernier fanion.",
    hint: "La neige damée du milieu est rapide ; les bords sont profonds et freinent.",
    hintExit: "La descente se termine toute seule en bas de la vallée.",
    hintFarm: "Tes bonbons et ton meilleur temps sont rapportés au Pays des Bonbons.",
    loadError: "La 3D n'a pas pu se charger. Vérifie ta connexion, puis recharge la page.",

    score: "Score",
    candies: "Bonbons",
    speed: "KM/H",
    time: "Temps",
    best: "Record",
    /* ⚠️ 425 : « Palier » → « Fanion ». L'étiquette suit ce que la case compte
       vraiment depuis que le HUD montre les fanions et non plus les paliers de
       difficulté (voir game.js). Une étiquette laissée derrière est pire qu'un
       mauvais chiffre : elle rend le bon chiffre incompréhensible. */
    stage: "Fanion",

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
    /* ⚠️ EN MAJUSCULES DANS LA CHAÎNE, PAS EN `text-transform` (424). Demande
       explicite de Guillaume, et il vaut mieux qu'elle soit lisible ici : une
       capitalisation posée en CSS se perd au premier changement de feuille de
       style, et la traduction ne peut pas la contredire quand une langue ne
       l'accepte pas. */
    finishTag: "ARRIVÉE !",
    newBest: "Nouveau record !",
    back: "Retour au Pays des Bonbons",
    overHint: "Reviens quand tu veux : le monstre du lac garde la piste ouverte.",

    boost: "TURBO",
    drift: "DÉRAPAGE",

    /* LE MUR DE CHANTIER. ⚠️ Aucun de ces textes ne mentionne le code secret,
       et il ne faut pas en ajouter un qui le ferait : un mur qui explique
       comment le franchir n'est plus un mur. */
    wipTitle: "Jeu en construction",
    wipSub: "La Grande Descente n'est pas encore ouverte. Reviens plus tard !",
    wipHint: "Les pisteurs dament encore la barbe à papa.",
    checkpoint: "FANION",
    resetting: "On remonte au fanion…",
    wipes: "Chutes",
  },

  en: {
    title: "The Great Descent",
    sub: "Race down the cotton-candy slope. Grab the sweets, dodge the gluttons.",
    start: "Push off",
    cLane: "← → : steer the sled",
    cJump: "↑ : jump the bump",
    cSlide: "↓ : brake and drift",
    cPause: "Esc : pause",
    cReset: "A crash sends you back to the last flag.",
    hint: "The groomed middle is fast; the edges are deep and slow you down.",
    hintExit: "The run ends by itself at the bottom of the valley.",
    hintFarm: "Your sweets and best time are carried back to Candy Land.",
    loadError: "3D failed to load. Check your connection, then reload the page.",

    score: "Score",
    candies: "Sweets",
    speed: "KM/H",
    time: "Time",
    best: "Best",
    stage: "Flag",       // 425 : voir la note côté français

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
    finishTag: "FINISH!",
    newBest: "New best!",
    back: "Back to Candy Land",
    overHint: "Come back any time — the lake monster keeps the slope open.",

    boost: "BOOST",
    drift: "DRIFT",

    wipTitle: "Under construction",
    wipSub: "The Great Descent isn't open yet. Come back later!",
    wipHint: "The groomers are still combing the cotton candy.",
    checkpoint: "FLAG",
    resetting: "Back to the flag…",
    wipes: "Crashes",
  },
};
