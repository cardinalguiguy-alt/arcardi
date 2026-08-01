/* =============================================================================
   ui.js — Panneaux, libellés et bascules d'écran (zip 385).
   -----------------------------------------------------------------------------
   RÈGLE : aucun texte visible n'est écrit dans index.html. Tout est posé ici,
   depuis CANDY_STR, dans la langue imposée par la ferme. C'est la règle du
   défi de fuite, et elle existe pour une raison précise — un libellé écrit en
   dur dans le HTML reste en français pour un joueur anglophone, et personne ne
   le voit jamais parce qu'on teste toujours dans sa propre langue.

   IDS liste TOUS les identifiants du HTML. tools/check-strings.js vérifie que
   la liste est complète : un identifiant oublié ici ne provoque AUCUNE erreur,
   il laisse juste un libellé vide à l'écran.
   ========================================================================== */

const IDS = [
  "hud", "lLevel", "level", "lStars", "stars", "lBest", "best",
  "title", "tTitle", "tSub", "btnStart", "cCut", "cPop", "cRetry", "cPause",
  "tHintGoal", "tHintStars", "tHintFarm", "loadError",
  "pause", "pTitle", "btnResume", "btnQuit", "pQuitWarn",
  "won", "wTitle", "wSub", "wStars", "wPrize", "btnNext", "btnWonQuit",
  "lost", "xTitle", "xReason", "btnRetry", "btnLostQuit",
  "ending", "eTitle", "eSub", "btnEndQuit",
];

const UI = (function () {
  const el = {};
  let L = CANDY_STR.fr;

  function bind() { for (const id of IDS) el[id] = document.getElementById(id); }
  function text(id, v) { if (el[id]) el[id].textContent = v; }
  function html(id, v) { if (el[id]) el[id].innerHTML = v; }

  /* Pose les libellés FIXES. Tout ce qui dépend d'une partie en cours (numéro
     de niveau, sprinkles, message de récompense) est posé par les fonctions
     plus bas — les mélanger obligerait à rappeler applyLang à chaque image. */
  function applyLang(lang) {
    L = CANDY_STR[lang] || CANDY_STR.fr;
    document.documentElement.lang = lang;

    text("lLevel", L.hudLevel);
    text("lStars", L.hudStars);
    text("lBest", L.hudBest);

    text("tTitle", L.title);
    text("tSub", L.sub);
    html("cCut", L.ctrlCut);
    html("cPop", L.ctrlPop);
    html("cRetry", L.ctrlRetry);
    html("cPause", L.ctrlPause);
    text("tHintGoal", L.hintGoal);
    text("tHintStars", L.hintStars);
    text("tHintFarm", L.hintFarm);

    text("pTitle", L.pause);
    text("btnResume", L.resume);
    text("btnQuit", L.quit);
    text("pQuitWarn", L.quitWarn);

    text("wTitle", L.wonTitle);
    text("btnNext", L.next);
    text("btnWonQuit", L.quit);

    text("xTitle", L.lostTitle);
    text("btnRetry", L.retry);
    text("btnLostQuit", L.quit);

    text("eTitle", L.endTitle);
    text("eSub", L.endSub);
    text("btnEndQuit", L.backToFarm);
  }

  // Le bouton de départ dit où l'on reprend. Un « Jouer » muet ferait croire à
  // un joueur revenu au niveau 12 qu'il va tout recommencer.
  function startButton(nextLevel) {
    text("btnStart", nextLevel > 1 ? L.resumeAt(nextLevel) : L.start);
  }

  function hud(level, got, tot, best) {
    text("level", level + " / " + CFG.LEVELS);
    text("stars", got + " / " + tot);
    text("best", best + " / " + CFG.LEVELS);
  }

  function show(name) {
    for (const p of ["title", "pause", "won", "lost", "ending"]) {
      if (el[p]) el[p].classList.toggle("visible", p === name);
    }
    if (el.hud) el.hud.classList.toggle("dim", name !== null);
  }

  function won(level, got, tot, prize) {
    text("wSub", L.wonSub(level));
    text("wStars", L.wonStars(got, tot));
    text("wPrize", prize || "");
    if (el.wPrize) el.wPrize.classList.toggle("visible", !!prize);
    // Dernier niveau : plus de « suivant » à proposer.
    if (el.btnNext) el.btnNext.style.display = level >= CFG.LEVELS ? "none" : "";
    show("won");
  }

  function lost(reason) {
    text("xReason", reason === "spike" ? L.lostSpike : reason === "rest" ? L.lostTimeout : L.lostFell);
    show("lost");
  }

  function loadError(msg) { text("loadError", msg || L.loadError); }

  function strings() { return L; }

  return { bind, applyLang, startButton, hud, show, won, lost, loadError, strings, el };
})();
