/* =============================================================================
   bridge.js — dialogue postMessage avec Ferme Vallée.
   -----------------------------------------------------------------------------
   Calque de public/templerun/js/bridge.js et de public/labyrinth/js/bridge.js,
   et pour les trois mêmes raisons d'architecture (voir l'en-tête du premier,
   qui fait autorité) : la ferme doit CONTINUER À TOURNER derrière, le focus
   clavier se tranche tout seul dans une iframe, et three.js reste hors du
   bundle Next.

   PROTOCOLE
     ferme -> luge : { type:"vf-luge-init", lang, best,
                       skin:{ gender, shirt, pants, hair, skin } }
     luge -> ferme : { type:"vf-luge-ready" }
                     { type:"vf-luge-over",   score, candies, cause }
                     { type:"vf-luge-finish", score, candies, timeMs }
                     { type:"vf-luge-exit" }

   ⚠️ LES DEUX SORTIES N'OBÉISSENT PAS À LA MÊME RÈGLE, exactement comme au
   défi de fuite et au labyrinthe :

     "vf-luge-over" part quand le joueur FERME l'écran de fin. Il doit pouvoir
     lire son score avant que la ferme reprenne la main.

     "vf-luge-finish" part à l'arrivée, AVANT l'écran de fin, parce que c'est
     une réussite : une descente terminée ne doit pas pouvoir être perdue par
     un joueur qui ferme l'onglet en regardant son temps.
   ========================================================================== */

const Bridge = (function () {
  let embedded = false;
  let lang = "fr";
  let externalBest = null;
  let skin = null;
  let onInit = null;

  /* Une couleur reçue est une DONNÉE EXTERNE. Ce n'est pas de la paranoïa de
     sécurité (l'origine est déjà vérifiée) mais de la robustesse : une couleur
     absente ou malformée doit donner le lugeur par défaut, pas un lugeur noir
     ni une exception au milieu de la construction de la scène. */
  function hexOr(v, fallback) {
    return (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v))
      ? parseInt(v.slice(1), 16) : fallback;
  }

  function handle(e) {
    if (e.origin !== window.location.origin) return;
    const d = e.data;
    if (!d || typeof d !== "object" || d.type !== "vf-luge-init") return;
    lang = d.lang === "en" ? "en" : "fr";
    if (typeof d.best === "number") externalBest = d.best;
    if (d.skin && typeof d.skin === "object") {
      skin = {
        gender: d.skin.gender === "f" ? "f" : "m",
        shirt: hexOr(d.skin.shirt, CFG.COL_SHIRT),
        pants: hexOr(d.skin.pants, CFG.COL_PANTS),
        hair: hexOr(d.skin.hair, CFG.COL_HAIR),
        skin: hexOr(d.skin.skin, CFG.COL_SKIN),
      };
    }
    if (onInit) onInit();
  }

  function init(cb) {
    onInit = cb;
    embedded = window.parent && window.parent !== window;
    window.addEventListener("message", handle);
    if (embedded) send({ type: "vf-luge-ready" });
  }

  function send(msg) {
    if (!embedded) return;
    try { window.parent.postMessage(msg, window.location.origin); } catch (e) {}
  }

  return {
    init,
    get embedded() { return embedded; },
    get lang() { return lang; },
    get best() { return externalBest; },
    get skin() { return skin; },
    over: (p) => send({ type: "vf-luge-over", ...p }),
    finish: (p) => send({ type: "vf-luge-finish", ...p }),
    exit: () => send({ type: "vf-luge-exit" }),
  };
})();
