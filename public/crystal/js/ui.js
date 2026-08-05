/* =============================================================================
   ui.js — LES COUCHES DOM PAR-DESSUS LE CANVAS.
   -----------------------------------------------------------------------------
   Panneaux, réplique en cours, boutons de choix, HUD du segment jouable.
   ========================================================================== */

const UI = (function () {
  const $ = (id) => document.getElementById(id);
  let lang = "fr";
  let type = null;          // { el, full, n, acc } — la frappe en cours
  let onChoice = null;

  const T = () => STR[lang];

  function applyLang(l) {
    lang = l === "en" ? "en" : "fr";
    const t = T();
    const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    set("tTitle", t.title); set("tSub", t.sub);
    set("btnStart", t.start); set("btnExit", t.exit);
    set("cSkip", t.cSkip); set("cWalk", t.cWalk); set("cPause", t.cPause);
    set("lLoading", t.loading);
    set("wTitle", t.wTitle); set("wSub", t.wSub); set("wHint", t.wHint);
    set("btnConstructionBack", t.wBack);
    set("lScore", t.hScore); set("lShards", t.hShards);
    set("lDist", t.hDist); set("lBest", t.hBest);
    set("lChant", t.hChant); set("hLabel", t.hLabel);
    set("pTitle", t.pause); set("btnResume", t.resume);
    set("btnQuit", t.quit); set("pQuitWarn", t.quitWarn);
    set("oTitle", t.endTitle); set("fLShards", t.endShards);
    set("fLChoices", t.endChoices); set("btnBack", t.endBack);
    set("oNote", t.endNote);
    document.documentElement.lang = lang;
  }

  /* Une seule couche visible à la fois, sauf le HUD et la boîte de dialogue
     qui sont des surimpressions. Un gestionnaire d'écrans qui laisse deux
     panneaux visibles est un gestionnaire qui finira par en laisser deux. */
  const LAYERS = ["loading", "construction", "title", "pause", "gameover"];
  function show(id) {
    for (const l of LAYERS) {
      const e = $(l); if (!e) continue;
      e.classList.toggle("visible", l === id);
    }
  }
  function hideAll() { for (const l of LAYERS) { const e = $(l); if (e) e.classList.remove("visible"); } }

  /* ── LA RÉPLIQUE ──────────────────────────────────────────────────────────
     ⚠️ LA FRAPPE PROGRESSIVE EST INTERRUPTIBLE, ET C'EST OBLIGATOIRE. Un
     joueur qui lit vite doit pouvoir faire apparaître la phrase entière d'un
     clic, et le clic SUIVANT passe à la réplique d'après. Sans ce double
     comportement, on se retrouve à cliquer dans le vide pendant qu'un texte
     s'écrit tout seul — et c'est la première chose qu'on reproche à un jeu
     narratif. */
  function say(who, text, key) {
    const box = $("dialog"), nm = $("dName"), tx = $("dText");
    box.classList.add("visible");
    const speaker = key && SPEAKER[lang][key] ? SPEAKER[lang][key] : "";
    nm.textContent = speaker;
    nm.style.display = speaker ? "" : "none";
    box.classList.toggle("narration", !speaker);
    tx.textContent = "";
    type = { el: tx, full: text, n: 0, acc: 0 };
  }

  function typeStep(dt) {
    if (!type) return;
    type.acc += dt * CFG.TYPE_CPS;
    while (type.acc >= 1 && type.n < type.full.length) { type.acc -= 1; type.n++; }
    type.el.textContent = type.full.slice(0, type.n);
    $("dMore").style.display = type.n >= type.full.length ? "" : "none";
  }
  const typing = () => !!(type && type.n < type.full.length);
  function finishType() { if (type) { type.n = type.full.length; type.el.textContent = type.full; $("dMore").style.display = ""; } }
  function clearSay() { type = null; $("dialog").classList.remove("visible"); $("choices").classList.remove("visible"); }

  /* ── LES CHOIX ─────────────────────────────────────────────────────────── */
  function choice(question, opts, cb) {
    onChoice = cb;
    const box = $("choices");
    $("cQuestion").textContent = question;
    const list = $("cList");
    list.innerHTML = "";
    opts.forEach((label, i) => {
      const b = document.createElement("button");
      b.className = "choice";
      b.type = "button";
      // Le numéro sert au clavier ET à la lecture : trois options numérotées
      // se comparent plus vite que trois phrases alignées.
      b.innerHTML = '<i>' + (i + 1) + '</i><span></span>';
      b.querySelector("span").textContent = label;
      b.addEventListener("click", () => { if (onChoice) onChoice(i); });
      list.appendChild(b);
    });
    box.classList.add("visible");
    $("dialog").classList.remove("visible");
  }
  function pickChoice(i) { if ($("choices").classList.contains("visible") && onChoice) onChoice(i); }
  const choosing = () => $("choices").classList.contains("visible");

  /* ── LE CARTON DE CHAPITRE ─────────────────────────────────────────────── */
  function chapter(text) {
    const e = $("chapterCard");
    $("chapterTxt").textContent = text;
    e.classList.add("visible");
  }
  function clearChapter() { $("chapterCard").classList.remove("visible"); }

  /* ── LE HUD DU SEGMENT JOUABLE ─────────────────────────────────────────── */
  function hud(on) { $("hud").classList.toggle("visible", !!on); }
  function hudSet(shards, dist, goal, best, chant, score) {
    $("score").textContent = score;
    $("shards").textContent = shards;
    $("dist").textContent = dist + " m";
    $("best").textContent = best;
    $("chantFill").style.width = Math.round(chant * 100) + "%";
    $("goalFill").style.width = Math.round(Math.min(1, dist / goal) * 100) + "%";
  }

  function toast(msg) {
    const e = $("toast");
    e.textContent = msg; e.classList.add("visible");
    clearTimeout(e._t);
    e._t = setTimeout(() => e.classList.remove("visible"), 1900);
  }

  return { applyLang, show, hideAll, say, typeStep, typing, finishType, clearSay,
           choice, pickChoice, choosing, chapter, clearChapter, hud, hudSet, toast,
           get lang() { return lang; }, T };
})();
