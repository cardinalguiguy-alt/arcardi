/* =============================================================================
   ui.js — Le HUD et les panneaux.
   -----------------------------------------------------------------------------
   ⚠️ LE HUD EST DANS LES QUATRE COINS, ET C'EST UNE DÉCISION DE CADRAGE.
   Le chantier demande un cadre large pour voir le paysage : mettre le HUD en
   colonne (comme au défi de fuite) rendrait cette demande absurde, puisqu'on
   rendrait au décor d'une main ce qu'on lui prendrait de l'autre. Score en haut
   à gauche, vitesse et chrono en haut à droite, palier en bas à gauche : le
   centre du cadre — la piste, l'horizon, les montagnes — reste vide.

   C'est aussi la disposition de la capture de référence fournie par Guillaume,
   et ce n'est pas une coïncidence : c'est celle de tous les jeux de descente,
   parce que c'est la seule qui laisse voir la pente.
   ========================================================================== */

const UI = (function () {
  let L = STR.fr;
  const el = {};
  let best = 0;

  const $ = (id) => document.getElementById(id);

  function init() {
    for (const id of [
      "hud", "title", "pause", "gameover", "score", "candies", "speed", "time",
      "best", "stage", "finalScore", "finalCandies", "finalTime", "finalBest",
      "oTitle", "overReason", "newBest", "boostTag", "driftBar", "driftFill",
    ]) el[id] = $(id);
    best = loadBest();
    applyLang();
  }

  function loadBest() {
    try { return parseInt(localStorage.getItem(CFG.BEST_KEY) || "0", 10) || 0; }
    catch (e) { return 0; }
  }
  function saveBest(v) {
    try { localStorage.setItem(CFG.BEST_KEY, String(v)); } catch (e) {}
  }

  function applyLang() {
    L = STR[Bridge.lang] || STR.fr;
    if (Bridge.best !== null && Bridge.best > best) best = Bridge.best;
    const t = {
      tTitle: L.title, tSub: L.sub, btnStart: L.start,
      cLane: L.cLane, cJump: L.cJump, cSlide: L.cSlide, cPause: L.cPause,
      tHint: L.hint, tHintExit: L.hintExit, tHintFarm: L.hintFarm,
      lScore: L.score, lCandies: L.candies, lSpeed: L.speed, lTime: L.time,
      lBest: L.best, lStage: L.stage,
      pTitle: L.pause, btnResume: L.resume, btnQuit: L.quit, pQuitWarn: L.quitWarn,
      fLScore: L.score, fLCandies: L.candies, fLTime: L.time, fLBest: L.best,
      btnBack: L.back, oHint: L.overHint, boostTag: L.boost,
    };
    for (const id in t) { const n = $(id); if (n) n.textContent = t[id]; }
    if (el.best) el.best.textContent = fmtTime(best);
  }

  /* Le chrono, au format de la capture de référence : mm:ss.mmm. Les
     millisecondes ne servent à rien pour jouer — elles servent à COMPARER, et
     c'est la seule chose qu'on fait avec un temps de descente. */
  function fmtTime(ms) {
    if (!ms) return "--:--.---";
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const t = Math.floor(ms % 1000);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(t).padStart(3, "0")}`;
  }

  function show(which) {
    for (const k of ["title", "pause", "gameover"]) {
      if (el[k]) el[k].classList.toggle("visible", k === which);
    }
    if (el.hud) el.hud.classList.toggle("visible", which === "hud");
  }

  function updateHud(sled, score, ms, stage) {
    el.score.textContent = Math.floor(score);
    el.candies.textContent = sled.candies;
    el.speed.textContent = sled.kmh();
    el.time.textContent = fmtTime(ms);
    el.stage.textContent = stage + 1;
    /* La jauge de charge du turbo. Elle n'apparaît QUE pendant un dérapage :
       une jauge toujours visible et presque toujours vide est un élément
       d'interface qui ne dit rien 95 % du temps. */
    const k = Math.min(1, sled.driftCharge / CFG.DRIFT_CHARGE_MS);
    el.driftBar.classList.toggle("visible", sled.drift > 0.2 || k > 0.02);
    el.driftFill.style.width = (k * 100).toFixed(0) + "%";
    el.driftFill.classList.toggle("full", k >= 1);
    el.boostTag.classList.toggle("visible", sled.boost > 0);
  }

  function showGameOver(sled, score, ms, finished) {
    el.oTitle.textContent = finished ? L.finish : L.overTitle;
    el.overReason.textContent = finished ? L.finishSub
      : (sled.cause === "crash" ? L.overCrash : sled.cause === "fence" ? L.overFence : L.overAbort);
    el.finalScore.textContent = Math.floor(score);
    el.finalCandies.textContent = sled.candies;
    el.finalTime.textContent = finished ? fmtTime(ms) : "--:--.---";
    /* ⚠️ LE RECORD EST UN TEMPS, DONC LE PLUS PETIT GAGNE — et il ne se met à
       jour QUE sur une descente TERMINÉE. Un abandon à mi-parcours produit un
       temps court qui n'est pas une performance : le compter ferait du record
       une récompense pour qui s'arrête tôt. */
    let isNew = false;
    if (finished && ms > 0 && (best === 0 || ms < best)) { best = ms; saveBest(best); isNew = true; }
    el.finalBest.textContent = fmtTime(best);
    el.newBest.classList.toggle("visible", isNew);
    show("gameover");
  }

  function showLoadError() {
    const n = $("loadError");
    if (n) { n.textContent = L.loadError; n.classList.add("visible"); }
  }

  return {
    init, applyLang, show, updateHud, showGameOver, showLoadError, fmtTime,
    get best() { return best; },
    get L() { return L; },
  };
})();
