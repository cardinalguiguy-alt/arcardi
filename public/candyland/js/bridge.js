/* =============================================================================
   bridge.js — Dialogue avec Ferme Vallée (zip 385).
   -----------------------------------------------------------------------------
   Mini-jeu servi depuis public/candyland/ et affiché par la ferme dans une
   <iframe> plein écran. Il ne partage AUCUN état avec elle : tout passe par
   postMessage, dans les deux sens, avec un protocole minuscule. Mêmes raisons
   qu'au zip 372 pour le défi de fuite (voir public/templerun/js/bridge.js) :

   * La ferme doit CONTINUER À TOURNER derrière. Si c'est l'hôte qui joue,
     arrêter FermeGame arrêterait le monde pour tout le monde.
   * Le clavier et la souris. Le mini-jeu capte les clics et R/Échap ; dans le
     même document il faudrait démêler deux jeux d'écouteurs, et un clic de
     coupe déclencherait aussi les outils de la ferme.
   * Aucune ligne de plus dans FermeGame.js, qui fait déjà 14 900 lignes.

   PROTOCOLE
     ferme -> jeu : { type:"vf-candy-init", lang:"fr"|"en", level:<n>,
                      goldClaimed:<bool>, catDone:<bool> }
     jeu -> ferme : { type:"vf-candy-ready" }
                    { type:"vf-candy-level", level:<n>, stars:<n> }
                    { type:"vf-candy-exit" }

   `level` À L'ALLER = le plus haut niveau DÉJÀ terminé (0 si jamais joué) ;
   le jeu ouvre donc au niveau suivant. `level` AU RETOUR = le niveau qu'on
   vient de terminer, envoyé DÈS la victoire (et pas à la fermeture de l'écran
   de fin, contrairement à "vf-run-over") : le joueur peut fermer l'onglet
   entre deux niveaux, sa progression ne doit pas dépendre de sa patience.

   `goldClaimed` / `catDone` ne servent QU'À CHOISIR LE TEXTE affiché. La ferme
   reste seule juge de l'attribution : elle revérifie tout à la réception, et
   un client modifié qui mentirait ici ne gagnerait rien d'autre qu'un message
   inexact sur son propre écran.
   ========================================================================== */

const Bridge = (function () {
  let embedded = false;
  let lang = "fr";
  let startLevel = null;      // null tant que la ferme n'a pas répondu
  let goldClaimed = false;
  let catDone = false;
  let onInit = null;

  function handle(e) {
    // L'iframe est servie par la ferme elle-même : même origine obligatoire.
    if (e.origin !== window.location.origin) return;
    const d = e.data;
    if (!d || typeof d !== "object" || d.type !== "vf-candy-init") return;
    lang = d.lang === "en" ? "en" : "fr";
    // Une valeur reçue est une DONNÉE EXTERNE : on la borne au lieu de la
    // croire. Un niveau négatif ou à 900 ouvrirait le jeu sur un niveau qui
    // n'existe pas, et LEVELS[n] vaudrait undefined en pleine partie.
    const lv = (typeof d.level === "number" && isFinite(d.level)) ? Math.floor(d.level) : 0;
    startLevel = Math.max(0, Math.min(CFG.LEVELS, lv));
    goldClaimed = !!d.goldClaimed;
    catDone = !!d.catDone;
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
      // laisserait le mini-jeu en français et au niveau 1, sans erreur visible
      // — c'est-à-dire en effaçant la progression aux yeux du joueur.
      post({ type: "vf-candy-ready" });
      let tries = 0;
      const again = setInterval(function () {
        if (startLevel !== null || ++tries > 3) { clearInterval(again); return; }
        post({ type: "vf-candy-ready" });
      }, 300);
    },
    get embedded() { return embedded; },
    get lang() { return lang; },
    get startLevel() { return startLevel; },
    get goldClaimed() { return goldClaimed; },
    set goldClaimed(v) { goldClaimed = !!v; },
    get catDone() { return catDone; },
    set catDone(v) { catDone = !!v; },
    levelDone(level, stars) { post({ type: "vf-candy-level", level: level, stars: stars }); },
    exit() { post({ type: "vf-candy-exit" }); },
  };
})();
