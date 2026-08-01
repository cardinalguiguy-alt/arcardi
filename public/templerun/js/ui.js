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
    "tHint", "tHintExit", "tHintFarm", "lScore", "lCoins", "lDistance", "lBest", "lPack",
    "pTitle", "btnResume", "btnQuit", "pQuitWarn",
    "oTitle", "oHint", "btnBack", "fLScore", "fLCoins", "fLDistance", "fLBest",
    // Zip 377 — sortie offroad.
    "exitHint", "escape", "eTitle", "eSub", "fadeVeil",
    // Zip 385 — seconde chance.
    "revive", "rTitle", "rSub", "rCountdown", "btnRevive", "btnReviveNo",
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
    txt("tHintExit", L.hintExit);
    txt("tHintFarm", Bridge.embedded ? L.hintFarm : "");
    txt("eTitle", L.escapeTitle); txt("eSub", L.escapeSub);
    txt("rTitle", L.reviveTitle); txt("rSub", L.reviveSub);
    txt("btnRevive", L.reviveYes); txt("btnReviveNo", L.reviveNo);

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

  /* `exitIn` (zip 377) : distance restante jusqu'au prochain embranchement, ou
     null s'il n'y en a pas en vue. On ARRONDIT À DIX MÈTRES plutôt qu'au
     mètre — un compteur qui défile de 34 unités par seconde est illisible, et
     un chiffre illisible qu'on essaie de lire coûte exactement l'attention
     dont on a besoin pour les obstacles. */
  function updateHud(score, coins, distance, danger, exitIn) {
    el.score.textContent = Math.floor(score);
    el.coins.textContent = coins;
    el.distance.textContent = Math.floor(distance) + " m";
    el.dangerFill.style.width = Math.round(danger * 100) + "%";

    const near = exitIn !== null && exitIn !== undefined && exitIn <= CFG.OFFROAD_HUD_DIST;
    el.exitHint.classList.toggle("on", near);
    if (!near) { el.exitHint.classList.remove("now"); return; }
    // « maintenant » = la fenêtre où l'appui est réellement pris en compte.
    // C'est la MÊME constante que celle qui pilote le jeu (TURN_INPUT_WINDOW),
    // pas une valeur d'affichage parallèle qui finirait par mentir.
    const nowWindow = exitIn <= CFG.TURN_INPUT_WINDOW;
    el.exitHint.classList.toggle("now", nowWindow);
    el.exitHint.textContent = nowWindow
      ? L.exitNow
      : L.exitIn(Math.round(Math.max(0, exitIn) / 10) * 10);
  }

  /* Bandeau et voile de la séquence de sortie. */
  function showEscape(on) {
    if (el.escape) el.escape.classList.toggle("visible", !!on);
  }

  /* Écran de seconde chance (zip 385). `seconds`, si fourni, initialise le
     compte à rebours dès l'ouverture — sans ça le premier chiffre resterait
     celui laissé par la course précédente pendant une frame. */
  function showRevive(on, seconds) {
    if (!el.revive) return;
    el.revive.classList.toggle("visible", !!on);
    if (on && seconds !== undefined) updateReviveCountdown(seconds);
  }
  function updateReviveCountdown(seconds) {
    if (el.rCountdown) el.rCountdown.textContent = Math.max(0, Math.ceil(seconds));
  }
  function setFade(a) {
    if (el.fadeVeil) el.fadeVeil.style.opacity = String(Math.max(0, Math.min(1, a)));
  }

  function reasonText(cause) {
    return ({
      wolves: L.reasonWolves, gap: L.reasonGap,
      fall: L.reasonFall, abort: L.reasonAbort,
      escape: L.reasonEscape,
    })[cause] || L.reasonWolves;
  }

  function showGameOver(score, coins, distance, cause, secondChanceUsed) {
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
    // Zip 377 : sortir par l'embranchement n'est pas se faire rattraper, et le
    // titre doit le dire. C'est la seule fin du jeu qui ne soit pas un échec ;
    // afficher « Rattrapé » par-dessus une fuite réussie annulerait
    // exactement ce que la mécanique vient d'accorder au joueur.
    el.oTitle.textContent = cause === "escape" ? L.escaped : L.over;
    // Zip 385 : la blessure est ×3 si la seconde chance a été utilisée, quelle
    // que soit l'issue finale de la course — c'est le prix fixé par Guillaume,
    // pas une pénalité supplémentaire sur l'échec lui-même.
    const isDefeat = cause !== "escape";
    if (el.oHint) el.oHint.textContent = Bridge.embedded
      ? (isDefeat && secondChanceUsed ? L.overHintFarmPenalty : L.overHintFarm)
      : L.overHintSolo;
    show("gameover");
  }

  function showLoadError() {
    const msg = (RUN_STR[Bridge.lang] || RUN_STR.fr).loadError;
    if (!el.loadError) { alert(msg); return; }
    el.loadError.textContent = msg;
    el.loadError.style.display = "block";
  }

  return { init, applyLang, show, updateHud, showGameOver, loadBest, showLoadError,
           showEscape, setFade };
})();
