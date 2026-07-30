/* =============================================================================
   ui.js — Écrans, compteurs, langue, score persistant. Aucune logique de jeu.
   -----------------------------------------------------------------------------
   Le meilleur score a deux sources selon le contexte :
     - EMBARQUÉ dans la ferme : il vient de la ferme ("vf-run-init") et y
       retourne par "vf-run-over". C'est la ferme qui fait foi, pas le
       navigateur — sinon le record suivrait la machine et pas le joueur.
     - AUTONOME (ouverture directe du fichier, pour itérer sur le gameplay) :
       localStorage, comme n'importe quel petit jeu web.
   ========================================================================== */

const UI = (function () {
  const el = {};
  let L = RUN_STR.fr;

  const IDS = [
    "title", "hud", "pause", "gameover", "score", "coins", "distance",
    "best", "finalScore", "finalCoins", "finalDistance", "finalBest",
    "deathReason", "newBest", "dangerFill", "loadError",
    "tTitle", "tSub", "btnStart", "cLane", "cJump", "cSlide", "cPause",
    "tHint", "tHintFarm", "lScore", "lCoins", "lDistance", "lBest", "lPack",
    "pTitle", "btnResume", "btnQuit", "pQuitWarn",
    "oTitle", "oHint", "btnBack", "fLScore", "fLCoins", "fLDistance", "fLBest",
  ];

  function init() {
    for (const id of IDS) el[id] = document.getElementById(id);
    applyLang();
  }

  /* Applique la langue à TOUS les textes fixes de la page d'un coup. Appelée à
     l'init, puis à nouveau quand la ferme annonce la sienne. */
  function applyLang() {
    L = RUN_STR[Bridge.lang] || RUN_STR.fr;
    const txt = (k, v) => { if (el[k]) el[k].textContent = v; };
    const html = (k, v) => { if (el[k]) el[k].innerHTML = v; };

    txt("tTitle", L.title); txt("tSub", L.sub); txt("btnStart", L.start);
    html("cLane", L.ctrlLane); html("cJump", L.ctrlJump);
    html("cSlide", L.ctrlSlide); html("cPause", L.ctrlPause);
    txt("tHint", L.hint);
    txt("tHintFarm", Bridge.embedded ? L.hintFarm : "");

    txt("lScore", L.hudScore); txt("lCoins", L.hudCandies);
    txt("lDistance", L.hudDistance); txt("lBest", L.hudBest); txt("lPack", L.hudPack);

    txt("pTitle", L.pause); txt("btnResume", L.resume); txt("btnQuit", L.quit);
    txt("pQuitWarn", Bridge.embedded ? L.quitWarn : "");

    txt("oTitle", L.over); txt("newBest", L.newBest);
    txt("fLScore", L.labelScore); txt("fLCoins", L.labelCandies);
    txt("fLDistance", L.labelDistance); txt("fLBest", L.labelBest);
    txt("btnBack", Bridge.embedded ? L.backFarm : L.backMenu);
    txt("oHint", Bridge.embedded ? L.overHintFarm : L.overHintSolo);

    if (el.best) el.best.textContent = loadBest();
  }

  function loadBest() {
    if (Bridge.embedded) return Bridge.externalBest || 0;
    try { return parseInt(localStorage.getItem(CFG.STORAGE_KEY) || "0", 10) || 0; }
    catch (e) { return 0; }   // navigation privée : on dégrade sans planter
  }
  function saveBest(v) {
    if (Bridge.embedded) return;  // embarqué, c'est la ferme qui persiste
    try { localStorage.setItem(CFG.STORAGE_KEY, String(v)); } catch (e) {}
  }

  function show(name) {
    for (const k of ["title", "pause", "gameover"]) el[k].classList.toggle("visible", k === name);
    el.hud.classList.toggle("visible", name === "hud");
  }

  function updateHud(score, coins, distance, danger) {
    el.score.textContent = Math.floor(score);
    el.coins.textContent = coins;
    el.distance.textContent = Math.floor(distance) + " m";
    el.dangerFill.style.width = Math.round(danger * 100) + "%";
  }

  function reasonText(cause) {
    return ({
      wolves: L.reasonWolves, gap: L.reasonGap,
      fall: L.reasonFall, abort: L.reasonAbort,
    })[cause] || L.reasonWolves;
  }

  function showGameOver(score, coins, distance, cause) {
    const s = Math.floor(score);
    const best = loadBest();
    const isNew = s > best;
    if (isNew) saveBest(s);
    el.finalScore.textContent = s;
    el.finalCoins.textContent = coins;
    el.finalDistance.textContent = Math.floor(distance) + " m";
    el.finalBest.textContent = isNew ? s : best;
    el.best.textContent = isNew ? s : best;
    el.newBest.style.display = isNew ? "block" : "none";
    el.deathReason.textContent = reasonText(cause);
    show("gameover");
  }

  function showLoadError() {
    const msg = (RUN_STR[Bridge.lang] || RUN_STR.fr).loadError;
    if (!el.loadError) { alert(msg); return; }
    el.loadError.textContent = msg;
    el.loadError.style.display = "block";
  }

  return { init, applyLang, show, updateHud, showGameOver, loadBest, showLoadError };
})();
