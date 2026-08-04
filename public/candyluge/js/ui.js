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
      "cpTag", "resetTag", "wipes", "wipesPlate", "finalWipes",
      "construction",
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
      lWipes: L.wipes, fLWipes: L.wipes, resetTag: L.resetting,
      cReset: L.cReset,
      wTitle: L.wipTitle, wSub: L.wipSub, wHint: L.wipHint,
      btnConstructionBack: L.back,
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

  /* ⚠️ « construction » EST UN CALQUE COMME LES AUTRES, et il devait l'être :
     géré à part, il aurait pu rester affiché PAR-DESSUS l'écran-titre après le
     déverrouillage, ou disparaître sans que le titre le remplace. Un seul
     calque visible à la fois est une propriété qu'on obtient en les listant au
     même endroit, pas en s'en souvenant. */
  function show(which) {
    for (const k of ["construction", "title", "pause", "gameover"]) {
      if (el[k]) el[k].classList.toggle("visible", k === which);
    }
    if (el.hud) el.hud.classList.toggle("visible", which === "hud");
  }

  /* L'annonce de checkpoint (414). Elle apparaît, elle s'efface toute seule.
     ⚠️ ELLE EST INDISPENSABLE ET NE COÛTE RIEN : un checkpoint qui ne
     s'annonce pas ne procure aucun SOULAGEMENT, et le soulagement est
     exactement ce qu'on achète en adoptant le modèle Lonely Mountains. Le
     joueur doit savoir, à l'instant précis où ça arrive, que ce qu'il vient de
     réussir est acquis — c'est ce qui lui donne envie d'attaquer le morceau
     suivant plus fort. */
  function flashCheckpoint(i) {
    if (!el.cpTag) return;
    el.cpTag.textContent = L.checkpoint + " " + (i + 1) + "/" + Slope.checkpointCount();
    el.cpTag.classList.remove("visible");
    // Redéclenche l'animation CSS : sans ce reflow forcé, deux checkpoints
    // rapprochés ne rejoueraient pas l'apparition.
    void el.cpTag.offsetWidth;
    el.cpTag.classList.add("visible");
  }

  function updateHud(sled, score, ms, stage, sinceCp) {
    el.score.textContent = Math.floor(score);
    el.candies.textContent = sled.candies;
    el.speed.textContent = sled.kmh();
    el.time.textContent = fmtTime(ms);
    el.stage.textContent = stage + 1;
    if (el.cpTag && sinceCp !== undefined && sinceCp > CFG.CP_FLASH_MS) {
      el.cpTag.classList.remove("visible");
    }
    /* ⚠️ LE COMPTEUR DE CHUTES EST LE SECOND CHIFFRE DU JEU (414), à côté du
       chrono. Dans Lonely Mountains, on ne se souvient pas de son temps : on se
       souvient d'être descendu SANS TOMBER. Afficher les chutes en fait un
       objectif à part entière, et un objectif que le joueur se fixe lui-même —
       ce qui est la meilleure espèce. Il n'apparaît qu'à la première chute :
       un « 0 » permanent serait un reproche par anticipation. */
    if (el.wipes) {
      el.wipes.textContent = sled.wipes;
      el.wipesPlate.classList.toggle("visible", sled.wipes > 0);
    }
    // Le bandeau de remise en place, pendant la culbute et le retour.
    if (el.resetTag) {
      el.resetTag.classList.toggle("visible", sled.wipe > 0 || sled.reset > 0);
    }
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
    if (el.finalWipes) el.finalWipes.textContent = sled.wipes;
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
    flashCheckpoint,
    get best() { return best; },
    get L() { return L; },
  };
})();
