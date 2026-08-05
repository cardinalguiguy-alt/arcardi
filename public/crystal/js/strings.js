/* =============================================================================
   strings.js — TEXTES D'INTERFACE, FR/EN.
   -----------------------------------------------------------------------------
   ⚠️ RIEN DE VISIBLE N'EST ÉCRIT DANS index.html. La ferme impose sa langue au
   chargement (voir bridge.js) et le jeu doit la suivre — un seul mot en dur
   dans le HTML est un mot qui restera français pour un joueur anglais, sans
   erreur ni trace.

   ⚠️ LES RÉPLIQUES DU RÉCIT NE SONT PAS ICI, elles sont dans `story.js`, à
   côté de l'instruction qui les joue. Séparer un dialogue de sa mise en scène
   oblige à faire l'aller-retour entre deux fichiers pour relire une scène, et
   c'est comme ça qu'on finit par livrer une réplique orpheline.
   ========================================================================== */

const STR = {
  fr: {
    title: "La Vallée de Verre",
    sub: "Chapitre 1 — Le froid qui se souvient",
    start: "Commencer",
    resume: "Reprendre",
    exit: "Retour à la ferme",
    loading: "La vallée se referme…",

    wTitle: "Vallée en construction",
    wSub: "Ce mini-jeu n'est pas encore ouvert aux visiteurs.",
    wHint: "Revenez bientôt — il y aura une aurore.",
    wBack: "Retour à la ferme",

    cSkip: "Espace / clic : continuer",
    cWalk: "◀ ▶ ou A / D : se déplacer",
    cPause: "Échap : pause",

    hScore: "SCORE",
    hShards: "ÉCLATS",
    hDist: "DISTANCE",
    hBest: "RECORD",
    hChant: "CHANT",
    hLabel: "La Vallée de Verre — Chapitre 1",

    pause: "Pause",
    quit: "Quitter le chapitre",
    quitWarn: "Le chapitre reprendra depuis le début.",

    endTitle: "Fin du chapitre 1",
    endShards: "Éclats de givre rapportés",
    endChoices: "Décisions prises",
    endBack: "Retour à la ferme",
    endNote: "La démo s'arrête ici. Le chapitre 2 vous mènera à la cabane.",

    fFlamme: "Vous avez touché la flamme.",
    fHarde: "Vous avez compté la harde.",
    fCabane: "Vous avez vu la fenêtre.",
    fApproche: "Vous êtes allé vers les chevaux.",
    fConfiance: "Vous avez attendu, et l'un d'eux est venu.",
    fMarque: "Vous avez trouvé les entailles.",
    fDemande: "Vous avez demandé qui ils étaient.",
    fOnze: "Vous avez relevé les onze ans.",
    fSilence: "Vous n'avez rien dit.",
  },

  en: {
    title: "The Glass Valley",
    sub: "Chapter 1 — The Cold That Remembers",
    start: "Begin",
    resume: "Resume",
    exit: "Back to the farm",
    loading: "The valley is closing…",

    wTitle: "Valley under construction",
    wSub: "This mini-game isn't open to visitors yet.",
    wHint: "Come back soon — there will be an aurora.",
    wBack: "Back to the farm",

    cSkip: "Space / click: continue",
    cWalk: "◀ ▶ or A / D: move",
    cPause: "Esc: pause",

    hScore: "SCORE",
    hShards: "SHARDS",
    hDist: "DISTANCE",
    hBest: "BEST",
    hChant: "SONG",
    hLabel: "The Glass Valley — Chapter 1",

    pause: "Paused",
    quit: "Leave the chapter",
    quitWarn: "The chapter will restart from the beginning.",

    endTitle: "End of Chapter 1",
    endShards: "Frost shards brought back",
    endChoices: "Decisions made",
    endBack: "Back to the farm",
    endNote: "The demo stops here. Chapter 2 will take you to the cabin.",

    fFlamme: "You touched the flame.",
    fHarde: "You counted the herd.",
    fCabane: "You saw the window.",
    fApproche: "You walked toward the horses.",
    fConfiance: "You waited, and one of them came.",
    fMarque: "You found the tally marks.",
    fDemande: "You asked who they were.",
    fOnze: "You caught the eleven years.",
    fSilence: "You said nothing.",
  },
};

/* Le nom affiché d'Aubin. ⚠️ IL EST « ? » AU CHAPITRE 1 ET C'EST VOULU : le
   joueur ne l'apprendra qu'au chapitre 2, et une étiquette qui donne le nom
   avant la scène qui le donne désamorce la scène. */
const SPEAKER = {
  fr: { aubin: "?", moi: "Vous" },
  en: { aubin: "?", moi: "You" },
};

if (typeof module !== "undefined" && module.exports) module.exports = { STR, SPEAKER };
