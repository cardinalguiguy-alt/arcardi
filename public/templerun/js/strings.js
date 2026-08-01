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
    // Zip 377. Le texte doit dire les trois choses qui comptent, dans cet
    // ordre : où c'est, ce que ça fait, ce que ça coûte. Un joueur qui lit
    // « sortie » sans savoir que son score s'arrête là se sentira volé.
    hintExit: "Tous les 4000 m, un embranchement s'ouvre sur le côté : tournez vers lui pour quitter la course sain et sauf. Votre score s'arrête au virage, mais il compte.",
    hintFarm: "Les bonbons ramassés seront rapportés à la ferme. En cas de défaite, vous rentrerez blessé.",

    hudScore: "Score",
    hudCandies: "Bonbons",
    hudDistance: "Distance",
    hudBest: "Record",
    hudPack: "Meute",
    exitIn: (m) => `Sortie dans ${m} m`,
    exitNow: "Sortie — tournez maintenant",

    pause: "Pause",
    resume: "Reprendre",
    quit: "Abandonner",
    quitWarn: "Abandonner une course en cours compte comme une défaite.",

    escapeTitle: "Vous quittez la piste",
    escapeSub: "La meute continue tout droit.",

    // Zip 385 — seconde chance.
    reviveTitle: "Rattrapé — continuer ?",
    reviveSub: "Une seule fois par course. En cas de nouvel échec, la blessure au retour sera triplée.",
    reviveYes: "Continuer",
    reviveNo: "Non merci",

    over: "Rattrapé",
    escaped: "Échappé",
    reasonWolves: "La meute vous a rattrapé.",
    reasonGap: "Vous êtes tombé dans le vide.",
    reasonFall: "Virage manqué — vous êtes passé par-dessus bord.",
    reasonAbort: "Course abandonnée.",
    reasonEscape: "Vous avez pris l'embranchement et semé la meute.",
    newBest: "Nouveau record !",
    labelScore: "Score",
    labelCandies: "Bonbons",
    labelDistance: "Distance",
    labelBest: "Record",
    backFarm: "Retour à la ferme",
    backMenu: "Retour au menu",
    overHintFarm: "Vous rentrez à la ferme blessé pour 10 minutes. Les bonbons ramassés sont conservés.",
    overHintFarmPenalty: "Vous avez continué après avoir été rattrapé : vous rentrez à la ferme blessé pour 30 minutes. Les bonbons ramassés sont conservés.",
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
    hintExit: "Every 4000 m a side track opens up: turn into it to leave the run in one piece. Your score stops at the fork — but it counts.",
    hintFarm: "Candies you pick up are carried back to the farm. If you lose, you return injured.",

    hudScore: "Score",
    hudCandies: "Candies",
    hudDistance: "Distance",
    hudBest: "Best",
    hudPack: "Pack",
    exitIn: (m) => `Exit in ${m} m`,
    exitNow: "Exit — turn now",

    pause: "Paused",
    resume: "Resume",
    quit: "Give up",
    quitWarn: "Giving up mid-run counts as a defeat.",

    // Traduit dans l'esprit (consigne du zip 371) : le français joue sur
    // « quitter la piste » / « continuer tout droit ». L'anglais garde le
    // même contraste avec ses propres mots plutôt que de calquer.
    escapeTitle: "You're off the track",
    escapeSub: "The pack keeps going straight.",

    // Zip 385 — second chance.
    reviveTitle: "Caught — keep going?",
    reviveSub: "Once per run only. If you're caught again, the injury on your return is tripled.",
    reviveYes: "Keep going",
    reviveNo: "No thanks",

    over: "Caught",
    escaped: "Got away",
    reasonWolves: "The pack caught you.",
    reasonGap: "You fell into the void.",
    reasonFall: "Missed turn — you went straight over the edge.",
    reasonAbort: "Run abandoned.",
    reasonEscape: "You took the side track and shook the pack off.",
    newBest: "New best!",
    labelScore: "Score",
    labelCandies: "Candies",
    labelDistance: "Distance",
    labelBest: "Best",
    backFarm: "Back to the farm",
    backMenu: "Back to menu",
    overHintFarm: "You return to the farm injured for 10 minutes. The candies you picked up are kept.",
    overHintFarmPenalty: "You kept going after being caught: you return to the farm injured for 30 minutes. The candies you picked up are kept.",
    overHintSolo: "Standalone prototype: no consequences outside the challenge.",

    loadError: "Three.js could not be loaded. The challenge needs internet access on first launch. Check the connection, then try again.",
  },
};
