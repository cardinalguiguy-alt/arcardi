/* =============================================================================
   strings.js — Textes du défi, FR et EN.
   -----------------------------------------------------------------------------
   Le défi vit dans public/ et n'est PAS un composant React : il ne peut donc
   pas lire FERME_STR. Il embarque sa propre table, sur le même principe — deux
   blocs de clés strictement identiques, à modifier ensemble.

   La langue est imposée par la ferme au moment d'ouvrir le défi (message
   "vf-run-init"). En dehors de la ferme (ouverture directe du fichier pour
   itérer sur le gameplay), on retombe sur le français.

   Vérification : tools/check-strings.js compare les deux ensembles de clés.
   ========================================================================== */

const RUN_STR = {
  fr: {
    title: "Fuite du monde sombre",
    sub: "Défi — Ferme Vallée",
    start: "Courir",
    ctrlLane: "<b>← →</b> ou <b>A D</b> — changer de voie, <i>et tourner aux intersections</i>",
    ctrlJump: "<b>↑</b>, <b>W</b> ou <b>Espace</b> — sauter",
    ctrlSlide: "<b>↓</b> ou <b>S</b> — glisser",
    ctrlPause: "<b>Échap</b> — pause",
    hint: "Les piliers violets annoncent un virage : appuyez dans la bonne direction avant le coin. Percuter un obstacle ne tue pas, mais la meute gagne du terrain.",
    hintFarm: "Les bonbons ramassés seront rapportés à la ferme. En cas de défaite, vous rentrerez blessé.",

    hudScore: "Score",
    hudCandies: "Bonbons",
    hudDistance: "Distance",
    hudBest: "Record",
    hudPack: "Meute",

    pause: "Pause",
    resume: "Reprendre",
    quit: "Abandonner",
    quitWarn: "Abandonner une course en cours compte comme une défaite.",

    over: "Rattrapé",
    reasonWolves: "La meute vous a rattrapé.",
    reasonGap: "Vous êtes tombé dans le vide.",
    reasonFall: "Virage manqué — vous êtes passé par-dessus bord.",
    reasonAbort: "Course abandonnée.",
    newBest: "Nouveau record !",
    labelScore: "Score",
    labelCandies: "Bonbons",
    labelDistance: "Distance",
    labelBest: "Record",
    backFarm: "Retour à la ferme",
    backMenu: "Retour au menu",
    overHintFarm: "Vous rentrez à la ferme blessé pour 10 minutes. Les bonbons ramassés sont conservés.",
    overHintSolo: "Prototype autonome : aucune conséquence hors du défi.",

    loadError: "Three.js n'a pas pu être chargé. Le défi a besoin d'un accès internet au premier lancement. Vérifiez la connexion, puis relancez.",
  },

  en: {
    title: "Escape from the dark world",
    sub: "Challenge — Valley Farm",
    start: "Run",
    ctrlLane: "<b>← →</b> or <b>A D</b> — switch lane, <i>and turn at junctions</i>",
    ctrlJump: "<b>↑</b>, <b>W</b> or <b>Space</b> — jump",
    ctrlSlide: "<b>↓</b> or <b>S</b> — slide",
    ctrlPause: "<b>Esc</b> — pause",
    hint: "Purple pillars announce a turn: press the matching direction before the corner. Hitting an obstacle won't kill you, but the pack gains ground.",
    hintFarm: "Candies you pick up are carried back to the farm. If you lose, you return injured.",

    hudScore: "Score",
    hudCandies: "Candies",
    hudDistance: "Distance",
    hudBest: "Best",
    hudPack: "Pack",

    pause: "Paused",
    resume: "Resume",
    quit: "Give up",
    quitWarn: "Giving up mid-run counts as a defeat.",

    over: "Caught",
    reasonWolves: "The pack caught you.",
    reasonGap: "You fell into the void.",
    reasonFall: "Missed turn — you went straight over the edge.",
    reasonAbort: "Run abandoned.",
    newBest: "New best!",
    labelScore: "Score",
    labelCandies: "Candies",
    labelDistance: "Distance",
    labelBest: "Best",
    backFarm: "Back to the farm",
    backMenu: "Back to menu",
    overHintFarm: "You return to the farm injured for 10 minutes. The candies you picked up are kept.",
    overHintSolo: "Standalone prototype: no consequences outside the challenge.",

    loadError: "Three.js could not be loaded. The challenge needs internet access on first launch. Check the connection, then try again.",
  },
};
