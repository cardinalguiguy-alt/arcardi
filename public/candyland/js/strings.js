/* =============================================================================
   strings.js — Textes du mini-jeu du Pays des Bonbons, FR et EN.
   -----------------------------------------------------------------------------
   Zip 385. Même principe que public/templerun/js/strings.js : ce mini-jeu vit
   dans public/, ce n'est PAS un composant React, il ne peut donc pas lire
   FERME_STR. Il embarque sa propre table — deux blocs de clés strictement
   identiques, À MODIFIER ENSEMBLE.

   La langue est imposée par la ferme à l'ouverture (message "vf-candy-init").
   Hors de la ferme (ouverture directe du fichier pour itérer sur le gameplay),
   on retombe sur le français.

   Vérification : tools/check-strings.js compare les deux ensembles de clés ET
   exécute ui.js contre un faux DOM dans les deux langues. La symétrie des clés
   ne suffit pas — une clé FONCTION appelée alors qu'elle n'existe pas ne laisse
   pas un libellé vide, elle jette une exception en pleine partie.
   ========================================================================== */

const CANDY_STR = {
  fr: {
    title: "Le Gourmandin",
    sub: "Pays des Bonbons — Ferme Vallée",
    start: "Nourrir le Gourmandin",
    resumeAt: (n) => `Reprendre au niveau ${n}`,

    ctrlCut: "<b>Glissez</b> la souris (ou le doigt) en travers d'une corde pour la <b>trancher</b>",
    ctrlPop: "<b>Cliquez</b> une bulle de sucre pour la faire éclater",
    ctrlBlow: "<b>Coup sec</b> près du bonbon, sans toucher de corde — le <b>souffler</b> (niveaux 13 et 14)",
    ctrlRetry: "<b>R</b> — recommencer le niveau",
    ctrlPause: "<b>Échap</b> — pause",
    hintGoal: "Faites tomber le bonbon dans la bouche du Gourmandin. Il a très faim, et il est très patient.",
    hintStars: "Les trois sprinkles dorés sont facultatifs : ils ne débloquent rien, ils se ramassent pour la beauté du geste.",
    hintFarm: "Votre progression est gardée à la ferme : vous reprendrez là où vous vous êtes arrêté, même après un aller-retour.",

    hudLevel: "Niveau",
    hudStars: "Sprinkles",
    hudBest: "Meilleur niveau",

    pause: "Pause",
    resume: "Reprendre",
    quit: "Quitter",
    quitWarn: "Vous pouvez revenir quand vous voulez : le niveau atteint est conservé.",

    wonTitle: "Miam !",
    wonSub: (n) => `Niveau ${n} terminé.`,
    wonStars: (got, tot) => `Sprinkles : ${got} / ${tot}`,
    next: "Niveau suivant",
    replay: "Rejouer",

    lostTitle: "Raté",
    lostFell: "Le bonbon est tombé à côté.",
    lostSpike: "Un bonbon acidulé a eu raison du vôtre.",
    lostSpider: "L'araignée a atteint le bonbon avant vous.",
    lostTimeout: "Le bonbon s'est immobilisé hors de portée.",
    retry: "Réessayer",

    prizeGold: (g) => `🪙 Le Gourmandin recrache un trésor : ${g} pièces d'or !`,
    prizeCat: "🐱 Un chat berlingot sort de sa poche et vous suit. Il est à vous.",
    prizeGoldSeen: "🪙 Le trésor du niveau 10 a déjà été réclamé pour cette venue du Pays des Bonbons. Il reviendra à la prochaine.",
    prizeCatSeen: "🐱 Vous avez déjà votre chat berlingot.",

    endTitle: "Le Gourmandin est repu",
    endSub: "Les quinze niveaux sont terminés. Il vous fait un signe de la patte.",
    backToFarm: "Retourner au Pays des Bonbons",

    loadError: "Impossible de charger le mini-jeu.",
  },

  en: {
    title: "The Muncher",
    sub: "Candy Land — Valley Farm",
    start: "Feed the Muncher",
    resumeAt: (n) => `Resume at level ${n}`,

    ctrlCut: "<b>Swipe</b> the mouse (or your finger) across a rope to <b>cut</b> it",
    ctrlPop: "<b>Click</b> a sugar bubble to pop it",
    ctrlBlow: "<b>Flick</b> near the candy without touching a rope — <b>blow</b> it (levels 13 and 14)",
    ctrlRetry: "<b>R</b> — restart the level",
    ctrlPause: "<b>Esc</b> — pause",
    hintGoal: "Drop the candy into the Muncher's mouth. He is very hungry, and very patient.",
    hintStars: "The three golden sprinkles are optional: they unlock nothing, they are there for the style points.",
    hintFarm: "Your progress is kept back at the farm: you will resume where you left off, even after a round trip.",

    hudLevel: "Level",
    hudStars: "Sprinkles",
    hudBest: "Best level",

    pause: "Paused",
    resume: "Resume",
    quit: "Leave",
    quitWarn: "Come back whenever you like: the level you reached is kept.",

    wonTitle: "Yum!",
    wonSub: (n) => `Level ${n} cleared.`,
    wonStars: (got, tot) => `Sprinkles: ${got} / ${tot}`,
    next: "Next level",
    replay: "Play again",

    lostTitle: "Missed",
    lostFell: "The candy fell wide.",
    lostSpike: "A sour drop got to your candy first.",
    lostSpider: "The spider reached the candy before you did.",
    lostTimeout: "The candy came to rest out of reach.",
    retry: "Try again",

    prizeGold: (g) => `🪙 The Muncher coughs up a treasure: ${g} gold!`,
    prizeCat: "🐱 A candy cat climbs out of his pocket and follows you. He's yours.",
    prizeGoldSeen: "🪙 The level 10 treasure has already been claimed for this visit of Candy Land. It comes back next time.",
    prizeCatSeen: "🐱 You already have your candy cat.",

    endTitle: "The Muncher is full",
    endSub: "All fifteen levels are done. He waves a paw at you.",
    backToFarm: "Back to Candy Land",

    loadError: "Could not load the minigame.",
  },
};
