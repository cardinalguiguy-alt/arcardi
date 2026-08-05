/* =============================================================================
   bridge.js — dialogue postMessage avec Ferme Vallée.
   -----------------------------------------------------------------------------
   Calque de public/labyrinth/js/bridge.js, lui-même calque de
   public/templerun/js/bridge.js — qui fait autorité. La duplication est la
   règle du projet pour les mini-jeux : ce sont des pages autonomes servies
   dans des <iframe> distinctes, et elles ne partagent aucun JavaScript.

   PROTOCOLE
     ferme -> vallée : { type:"vf-cry-init", lang, best,
                         skin:{ gender, shirt, pants, hair, skin } }
     vallée -> ferme : { type:"vf-cry-ready" }
                       { type:"vf-cry-chapter", n, shards, flags }
                       { type:"vf-cry-exit" }

   ⚠️ « vf-cry-chapter » N'EST PAS « vf-lab-over ». Les trois autres mini-jeux
   rendent un SCORE : on y meurt, on y gagne, la partie a une fin. Celui-ci
   rend un ÉTAT D'AVANCEMENT — le chapitre atteint et les décisions prises —
   parce que c'est un récit et qu'on ne le rejoue pas pour faire mieux. Coller
   un tableau de scores à la fin d'un chapitre casserait exactement ce qu'on
   essaie de construire. Même arbitrage que « vf-lab-won » au zip 393, poussé
   plus loin.

   ⚠️ ET LES DRAPEAUX REMONTENT DÈS LE CHAPITRE 1, alors que rien ne les lit
   encore côté ferme. C'est délibéré : le jour où le chapitre 7 décidera qui
   revient à la ferme, la sauvegarde aura déjà la mémoire des choix. Un état
   narratif qu'on commence à persister au moment où on en a besoin est un état
   narratif qui commence vide.
   ========================================================================== */

const Bridge = (function () {
  let embedded = false;
  let lang = "fr";
  let externalBest = null;
  let skin = null;
  let onInit = null;

  function hexOr(v, fallback) {
    return (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v))
      ? parseInt(v.slice(1), 16) : fallback;
  }

  function handle(e) {
    if (e.origin !== window.location.origin) return;
    const d = e.data;
    if (!d || typeof d !== "object" || d.type !== "vf-cry-init") return;
    lang = d.lang === "en" ? "en" : "fr";
    if (typeof d.best === "number") externalBest = d.best;
    if (d.skin && typeof d.skin === "object") {
      skin = {
        gender: d.skin.gender === "f" ? "f" : "m",
        shirt: hexOr(d.skin.shirt, 0x6d7858),
        pants: hexOr(d.skin.pants, 0x243550),
        hair: hexOr(d.skin.hair, 0x223c58),
        skin: hexOr(d.skin.skin, 0xc9a88a),
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
      // Trois relances : la ferme n'attache son écouteur qu'au moment où React
      // valide l'affichage de l'iframe. Un seul message perdu laisserait le jeu
      // en français avec un record à zéro, sans erreur visible.
      post({ type: "vf-cry-ready" });
      let tries = 0;
      const again = setInterval(function () {
        if (externalBest !== null || ++tries > 3) { clearInterval(again); return; }
        post({ type: "vf-cry-ready" });
      }, 300);
    },
    get embedded() { return embedded; },
    get lang() { return lang; },
    get externalBest() { return externalBest; },
    get skin() { return skin; },
    chapter(p) { post(Object.assign({ type: "vf-cry-chapter" }, p)); },
    exit() { post({ type: "vf-cry-exit" }); },
  };
})();
