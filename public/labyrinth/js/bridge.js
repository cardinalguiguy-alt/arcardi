/* =============================================================================
   bridge.js — dialogue postMessage avec Ferme Vallée.
   -----------------------------------------------------------------------------
   Calque de public/templerun/js/bridge.js, et pour les trois mêmes raisons
   d'architecture (voir son en-tête, qui fait autorité) : la ferme doit
   CONTINUER À TOURNER derrière, le focus clavier se tranche tout seul dans une
   iframe, et three.js reste hors du bundle Next.

   PROTOCOLE
     ferme -> labyrinthe : { type:"vf-lab-init", lang, best,
                             skin:{ gender, shirt, pants, hair, skin } }
     labyrinthe -> ferme : { type:"vf-lab-ready" }
                           { type:"vf-lab-over", score, shards, cause }
                           { type:"vf-lab-won",  score, shards }
                           { type:"vf-lab-exit" }

   ⚠️ LES DEUX SORTIES N'OBÉISSENT PAS À LA MÊME RÈGLE, exactement comme au
   défi de fuite :

     "vf-lab-over" part quand le joueur FERME l'écran de fin. Il doit pouvoir
     lire son score avant que la ferme enchaîne son fondu au noir.

     "vf-lab-won" part à la fin du fondu, SANS écran intermédiaire. Sortir d'un
     labyrinthe est un soulagement, pas un bilan : y coller un tableau de
     scores casserait le seul moment de détente du jeu. Même arbitrage que
     "vf-run-escape" au zip 377.
   ========================================================================== */

const Bridge = (function () {
  let embedded = false;
  let lang = "fr";
  let externalBest = null;
  let skin = null;
  let onInit = null;

  /* Une couleur reçue est une DONNÉE EXTERNE. Ce n'est pas de la paranoïa de
     sécurité (même origine déjà vérifiée) mais de la robustesse : une couleur
     absente ou malformée doit donner le fermier par défaut, pas un fermier
     noir ni une exception dans la construction de la scène. */
  function hexOr(v, fallback) {
    return (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v))
      ? parseInt(v.slice(1), 16) : fallback;
  }

  function handle(e) {
    if (e.origin !== window.location.origin) return;
    const d = e.data;
    if (!d || typeof d !== "object" || d.type !== "vf-lab-init") return;
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

  function post(msg) {
    if (!embedded) return;
    try { window.parent.postMessage(msg, window.location.origin); } catch (err) {}
  }

  return {
    init(cb) {
      onInit = cb;
      try { embedded = window.parent && window.parent !== window; } catch (err) { embedded = true; }
      window.addEventListener("message", handle);
      // On annonce plusieurs fois : la ferme n'attache son écouteur qu'au
      // moment où React valide l'affichage de l'iframe. Un seul message perdu
      // laisserait le jeu en français avec un record à zéro, sans erreur
      // visible. Trois tentatives coûtent trois messages.
      post({ type: "vf-lab-ready" });
      let tries = 0;
      const again = setInterval(function () {
        if (externalBest !== null || ++tries > 3) { clearInterval(again); return; }
        post({ type: "vf-lab-ready" });
      }, 300);
    },
    get embedded() { return embedded; },
    get lang() { return lang; },
    get externalBest() { return externalBest; },
    get skin() { return skin; },
    over(p) { post(Object.assign({ type: "vf-lab-over" }, p)); },
    won(p) { post(Object.assign({ type: "vf-lab-won" }, p)); },
    exit() { post({ type: "vf-lab-exit" }); },
  };
})();
