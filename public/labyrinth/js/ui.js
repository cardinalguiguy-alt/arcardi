/* =============================================================================
   ui.js — écrans, jauges, langue, record.
   -----------------------------------------------------------------------------
   ⚠️ UNE SEULE DESCRIPTION DE CHAQUE CHOSE. La jauge de flamme, le voile
   d'angoisse et les cœurs LISENT l'état du moteur ; ils ne recalculent rien.
   Le voile en particulier appelle Rules.dread(), qui vit dans rules.js à côté
   de la position du traqueur — un voile calculé ici aurait fini par annoncer
   une menace ailleurs que là où elle est (leçon du zip 387, et application
   directe de ce qui a été fait au 392 pour notifItems()).
   ========================================================================== */

const UI = (function () {
  const $ = (id) => document.getElementById(id);
  let L = LAB_STR.fr;
  let best = 0;
  let toastT = 0;

  function show(id, on) { const e = $(id); if (e) e.classList.toggle("visible", !!on); }

  function applyLang(lang) {
    L = LAB_STR[lang] || LAB_STR.fr;
    const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    set("tTitle", L.title); set("tSub", L.sub); set("btnStart", L.start);
    set("cLane", L.cLane); set("cStrafe", L.cStrafe); set("cHit", L.cHit);
    set("cUse", L.cUse); set("cPause", L.cPause);
    set("tHint", L.hint); set("tHintExit", L.hintExit);
    set("lScore", L.hScore); set("lShards", L.hShards);
    set("lFlame", L.hFlame); set("lBest", L.hBest);
    set("pTitle", L.pause); set("btnResume", L.resume); set("btnQuit", L.quit);
    set("pQuitWarn", L.quitWarn);
    set("fLScore", L.fScore); set("fLShards", L.fShards);
    set("fLDepth", L.fDepth); set("fLBest", L.fBest);
    set("btnBack", L.back);
    const farm = $("tHintFarm");
    if (farm) { farm.textContent = L.hintFarm; farm.style.display = Bridge.embedded ? "" : "none"; }
    const btnExit = $("btnExit");
    if (btnExit) { btnExit.textContent = L.back; btnExit.style.display = Bridge.embedded ? "" : "none"; }
  }

  function setBest(v) { best = v | 0; const e = $("best"); if (e) e.textContent = best; }

  /* Le HUD est appelé à chaque image. Il n'écrit dans le DOM que ce qui a
     CHANGÉ : réécrire six textContent soixante fois par seconde relance la
     mise en page du navigateur et fait tomber le rendu 3D, ce qui est le
     genre de perte qu'on met des heures à attribuer au bon coupable. */
  const last = {};
  function hud(st) {
    const put = (id, v) => { if (last[id] === v) return; last[id] = v; const e = $(id); if (e) e.textContent = v; };
    put("score", st.score | 0);
    put("shards", st.shardsTaken | 0);

    const f = Math.max(0, Math.min(1, st.flame));
    const bar = $("flameFill");
    if (bar) {
      bar.style.width = (f * 100).toFixed(1) + "%";
      bar.className = f <= st.cfg.FLAME_CRITICAL ? "ember" : f <= st.cfg.FLAME_LOW ? "low" : "";
    }
    const hearts = $("hearts");
    const hv = st.hearts + "/" + st.cfg.HEARTS;
    if (hearts && last.h !== hv) {
      last.h = hv;
      hearts.innerHTML = "";
      for (let i = 0; i < st.cfg.HEARTS; i++) {
        const s = document.createElement("span");
        s.className = "heart" + (i < st.hearts ? "" : " off");
        hearts.appendChild(s);
      }
    }
    const swd = $("swordIcon");
    if (swd) swd.classList.toggle("on", !!st.hasSword);

    // LE VOILE D'ANGOISSE. C'est le seul « son » du jeu tant qu'il n'y en a
    // pas : plus il est proche, plus le bord de l'écran rougit.
    const dr = $("dread");
    if (dr) dr.style.opacity = Rules.dread(st).toFixed(3);
    const hurt = $("hurtFlash");
    if (hurt) hurt.style.opacity = (st.hurtFlash * 0.55).toFixed(3);
  }

  function toast(msg) {
    const e = $("toast");
    if (!e) return;
    e.textContent = msg;
    e.classList.add("visible");
    toastT = performance.now() + 2600;
  }
  function toastTick(now) {
    if (!toastT || now < toastT) return;
    toastT = 0;
    const e = $("toast"); if (e) e.classList.remove("visible");
  }

  /* Les évènements du moteur deviennent des messages. La table est ICI et pas
     dans rules.js : le moteur n'a pas à connaître de texte, sinon il faudrait
     lui passer la langue et il cesserait d'être vérifiable hors navigateur. */
  function events(st) {
    for (const ev of st.events) {
      if (ev.type === "sword") toast(L.tipSword);
      else if (ev.type === "revive") toast(L.tipRevive);
      else if (ev.type === "crack") toast(L.tipCrack);
      else if (ev.type === "potion") toast(L.tipPotion);
      else if (ev.type === "stalkerWake") toast(L.tipStalker);
    }
  }

  let warnedLow = false, warnedOut = false;
  function flameWarnings(st) {
    if (!warnedLow && st.flame <= st.cfg.FLAME_LOW) { warnedLow = true; toast(L.tipTorchLow); }
    if (!warnedOut && st.flame <= 0) { warnedOut = true; toast(L.tipTorchOut); }
    if (st.flame > st.cfg.FLAME_LOW) warnedLow = false;
    if (st.flame > 0) warnedOut = false;
  }

  function over(st, won) {
    const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    set("oTitle", won ? L.winTitle : L.overTitle);
    set("deathReason", won ? L.winSub
      : st.endCause === "fall" ? L.overFall
      : st.endCause === "stalker" ? L.overStalker
      : st.endCause === "quit" ? L.overQuit
      : L.overRoamer);
    set("finalScore", st.score | 0);
    set("finalShards", st.shardsTaken | 0);
    set("finalDepth", st.seen.size);
    const isBest = (st.score | 0) > best;
    if (isBest) { best = st.score | 0; setBest(best); }
    set("finalBest", best);
    const nb = $("newBest");
    if (nb) nb.style.display = isBest ? "" : "none";
    show("gameover", true);
  }

  return { applyLang, setBest, hud, toast, toastTick, events, flameWarnings, over, show, get L() { return L; }, get best() { return best; } };
})();
