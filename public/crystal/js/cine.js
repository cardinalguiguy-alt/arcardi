/* =============================================================================
   cine.js — LE MOTEUR DE CINÉMATIQUE.
   -----------------------------------------------------------------------------
   Il exécute la liste d'instructions de `story.js` et ne sait rien du récit.

   ⚠️ IL NE DESSINE AUCUN TEXTE. Les répliques et les choix sont des éléments
   DOM posés par `ui.js` par-dessus le canvas. Trois raisons, et la première
   suffirait :

     1. ⚠️ UNE POLICE BITMAP DESSINÉE DANS UN TAMPON DE 480 px DE LARGE DONNE
        DES CARACTÈRES DE 5 px DE HAUT. C'est illisible, et c'est irréparable :
        on ne peut pas grossir le texte sans grossir le pixel du décor. Le seul
        moyen d'avoir un décor en gros pixels ET un texte lisible est de les
        séparer.
     2. La sélection, l'accessibilité et le passage FR/EN sont gratuits en DOM.
     3. Le texte reste net quel que soit l'agrandissement du canvas.

   ⚠️ LE TEMPS DE LA CINÉMATIQUE N'EST PAS LE TEMPS DU DÉCOR. `Cine.clock`
   avance toujours (l'aurore ondule, la flamme vacille, la neige tombe) même
   quand le récit attend une action du joueur. Un décor qui se fige pendant
   qu'on lit une réplique tue en une seconde tout ce que le décor a construit.
   ========================================================================== */

const Cine = (function () {

  const S = {
    script: null,
    i: 0,
    mode: "idle",     // idle | run | say | choice | play | chapter | done
    clock: 0,         // temps du DÉCOR, toujours croissant
    flags: {},
    lang: "fr",

    scene: null,
    cam: { x: 0, from: 0, to: 0, ms: 0, el: 0 },
    st: { auroraGain: 1 },
    fx: null,         // { key, from, to, ms, el }

    fade: 0,          // 1 = noir plein
    fadeDir: 0, fadeMs: 0, fadeEl: 0,

    wait: 0,
    queue: [],        // répliques injectées par un choix
    onPlay: null,     // rendu par game.js pour le segment jouable
    onEnd: null,
  };

  const hooks = { say: null, choice: null, clear: null, chapter: null };

  function start(script, lang, cb) {
    S.script = script; S.i = 0; S.clock = 0; S.flags = {};
    S.lang = lang === "en" ? "en" : "fr";
    S.mode = "run"; S.queue = [];
    S.st = { auroraGain: 1 };
    S.fade = 1; S.fadeDir = 0;
    Object.assign(hooks, cb || {});
  }

  const txt = (o) => (S.lang === "en" && o.en) ? o.en : o.fr;

  /* ── AVANCEMENT ─────────────────────────────────────────────────────────── */
  function next() {
    // les répliques injectées par un choix passent avant la suite du script
    if (S.queue.length) { emit(S.queue.shift()); return; }
    if (!S.script || S.i >= S.script.length) { S.mode = "done"; if (S.onEnd) S.onEnd(); return; }
    emit(S.script[S.i++]);
  }

  function emit(step) {
    switch (step.t) {

      case "scene": {
        S.scene = Scenes.get(step.id);
        S.cam.x = S.cam.from = S.cam.to = step.cam || 0;
        S.cam.ms = 0; S.cam.el = 0;
        /* ⚠️ LE FONDU EST UNE OUVERTURE, PAS UNE FERMETURE. On part du noir
           plein posé par l'instruction précédente et on découvre le tableau.
           L'inverse (fermer puis rouvrir) ferait clignoter le décor à chaque
           changement de plan. */
        S.fade = 1; S.fadeDir = -1; S.fadeMs = step.fade || 1200; S.fadeEl = 0;
        S.mode = "run";
        if (hooks.clear) hooks.clear();
        break;
      }

      case "cam":
        S.cam.from = S.cam.x; S.cam.to = step.to;
        S.cam.ms = step.ms || 8000; S.cam.el = 0;
        next();                                   // non bloquant : on enchaîne
        break;

      case "say":
        if (step.if && !S.flags[step.if]) { next(); return; }
        S.mode = "say";
        if (hooks.say) hooks.say(Story.WHO[step.who || ""], txt(step), step.who || "");
        break;

      case "wait":
        S.mode = "run"; S.wait = (step.ms || 500) / 1000;
        break;

      case "fx": {
        const k = Object.keys(step.set)[0];
        S.fx = { key: k, from: S.st[k] === undefined ? 1 : S.st[k],
                 to: step.set[k], ms: step.ms || 1500, el: 0 };
        next();                                   // non bloquant, lui aussi
        break;
      }

      case "choice":
        S.mode = "choice";
        if (hooks.choice) hooks.choice(txt(step.q), step.opts.map((o) => txt(o)));
        S._opts = step.opts;
        break;

      case "play":
        S.mode = "play";
        if (hooks.clear) hooks.clear();
        if (S.onPlay) S.onPlay(step.id);
        break;

      case "chapter":
        S.mode = "chapter";
        if (hooks.chapter) hooks.chapter(txt(step));
        break;

      default: next();
    }
  }

  /* Appelé par un clic ou la barre d'espace. */
  function advance() {
    if (S.mode === "say") { if (hooks.clear) hooks.clear(); next(); }
    else if (S.mode === "chapter") { S.mode = "done"; if (S.onEnd) S.onEnd(); }
  }

  function choose(k) {
    if (S.mode !== "choice" || !S._opts) return;
    const o = S._opts[k];
    if (!o) return;
    if (o.flag) S.flags[o.flag] = true;
    S.queue = (o.say || []).map((r) => Object.assign({ t: "say" }, r));
    /* ⚠️ UNE OPTION PEUT CHANGER DE TABLEAU. C'est la moitié de la demande
       « les illustrations doivent suivre l'histoire » : regarder la harde et
       regarder la fenêtre de la cabane ne peuvent pas se jouer devant la même
       image. L'instruction est empilée EN TÊTE de file, donc le fondu part
       avant la première réplique de la branche. */
    if (o.scene) S.queue.unshift({ t: "scene", id: o.scene, cam: o.cam || 0, fade: o.fade || 900 });
    S._opts = null;
    if (hooks.clear) hooks.clear();
    next();
  }

  /* Fin du segment jouable : le récit reprend là où il s'était arrêté. */
  function resumeFromPlay() { if (S.mode === "play") { S.mode = "run"; next(); } }

  /* ── MISE À JOUR ────────────────────────────────────────────────────────── */
  function update(dt) {
    S.clock += dt;

    // le fondu
    if (S.fadeDir !== 0) {
      S.fadeEl += dt * 1000;
      const u = Math.min(1, S.fadeEl / Math.max(1, S.fadeMs));
      S.fade = S.fadeDir < 0 ? 1 - u : u;
      if (u >= 1) S.fadeDir = 0;
    }

    /* LA CAMÉRA. Interpolation en cosinus : un glissement linéaire démarre et
       s'arrête net, ce qui se voit immédiatement sur un plan long. */
    if (S.cam.ms > 0) {
      S.cam.el += dt * 1000;
      const u = Math.min(1, S.cam.el / S.cam.ms);
      const e = (1 - Math.cos(u * Math.PI)) * 0.5;
      S.cam.x = S.cam.from + (S.cam.to - S.cam.from) * e;
      if (u >= 1) S.cam.ms = 0;
    }

    // l'effet en cours (l'intensité de l'aurore, pour l'instant)
    if (S.fx) {
      S.fx.el += dt * 1000;
      const u = Math.min(1, S.fx.el / S.fx.ms);
      const e = (1 - Math.cos(u * Math.PI)) * 0.5;
      S.st[S.fx.key] = S.fx.from + (S.fx.to - S.fx.from) * e;
      if (u >= 1) S.fx = null;
    }

    if (S.mode === "run") {
      if (S.wait > 0) { S.wait -= dt; if (S.wait <= 0) { S.wait = 0; next(); } }
      else next();
    }
  }

  function render(fb) {
    if (!S.scene) { fb.fill(CFG.PAL.sky0); return; }
    S.scene.render(fb, { x: S.cam.x }, S.clock, S.st);
    if (S.fade > 0.001) {
      // ⚠️ le fondu se fait DANS le tampon, pas en CSS : sinon le grain et la
      // vignette resteraient nets sur du noir, ce qui se voit.
      for (let y = 0; y < CFG.H; y++) fb.hline(0, CFG.W - 1, y, CFG.PAL.sky0, S.fade);
    }
  }

  return { S, start, update, render, advance, choose, resumeFromPlay,
           get mode() { return S.mode; },
           set onPlay(f) { S.onPlay = f; },
           set onEnd(f) { S.onEnd = f; },
           get flags() { return S.flags; },
           get clock() { return S.clock; } };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Cine;
