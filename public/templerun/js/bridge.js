/* =============================================================================
   bridge.js — Dialogue avec Ferme Vallée.
   -----------------------------------------------------------------------------
   Le défi est servi depuis public/templerun/ et affiché par la ferme dans une
   <iframe> plein écran. Il ne partage AUCUN état avec elle : tout passe par
   postMessage, dans les deux sens, avec un protocole minuscule.

   POURQUOI UNE IFRAME plutôt qu'un composant React :

   * La ferme doit CONTINUER À TOURNER pendant la course. Si c'est l'hôte qui
     joue au défi, arrêter FermeGame arrêterait le monde pour tout le monde
     (c'est déjà le problème que résout l'instance cachée de FermeGame quand
     l'hôte quitte la vue ferme). L'iframe laisse le composant vivant derrière.
   * Le clavier. Le défi capte flèches, WASD et Espace, exactement les touches
     de la ferme. Dans le même document, il faudrait démêler les deux jeux
     d'écouteurs ; dans une iframe, le focus tranche tout seul.
   * three.js reste chargé dans l'iframe, donc jamais dans le bundle de la
     ferme. Rien à ajouter à package.json, et un échec de CDN ne casse que le
     défi.

   PROTOCOLE
     ferme -> défi : { type:"vf-run-init", lang:"fr"|"en", best:<nombre> }
     défi -> ferme : { type:"vf-run-ready" }
                     { type:"vf-run-over", score, candies, distance, cause }
                     { type:"vf-run-exit" }   (sortie sans avoir couru)

   "vf-run-over" n'est PAS envoyé à la mort mais au moment où le joueur ferme
   l'écran de fin : il doit pouvoir lire son score avant que la ferme enchaîne
   son fondu au noir.
   ========================================================================== */

const Bridge = (function () {
  let embedded = false;
  let lang = "fr";
  let externalBest = null;
  let onInit = null;

  function handle(e) {
    // L'iframe est servie par la ferme elle-même : même origine. On refuse
    // tout le reste plutôt que d'accepter un message de n'importe quelle page.
    if (e.origin !== window.location.origin) return;
    const d = e.data;
    if (!d || typeof d !== "object" || d.type !== "vf-run-init") return;
    lang = d.lang === "en" ? "en" : "fr";
    if (typeof d.best === "number") externalBest = d.best;
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
      // moment où React valide l'affichage de l'iframe. Dans l'ordre normal
      // des choses elle est prête avant nous, mais un seul message perdu
      // laisserait le défi en français avec un record à zéro, sans erreur
      // visible. Trois tentatives coûtent trois messages.
      post({ type: "vf-run-ready" });
      let tries = 0;
      const again = setInterval(function () {
        if (externalBest !== null || ++tries > 3) { clearInterval(again); return; }
        post({ type: "vf-run-ready" });
      }, 300);
    },
    get embedded() { return embedded; },
    get lang() { return lang; },
    get externalBest() { return externalBest; },
    over(payload) { post(Object.assign({ type: "vf-run-over" }, payload)); },
    exit() { post({ type: "vf-run-exit" }); },
  };
})();
