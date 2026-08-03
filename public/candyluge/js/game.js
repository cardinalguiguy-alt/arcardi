/* =============================================================================
   game.js — Machine à états et boucle principale.
   -----------------------------------------------------------------------------
   Assemble les systèmes, et ne contient AUCUNE règle : la pente est dans
   slope.js, la physique dans sled.js, la justice des obstacles dans
   critters.js, le cadrage dans camera.js, et tous les nombres dans config.js.

   UNE SEULE RÈGLE DE JEU VIT ICI, parce qu'elle ne concerne que l'enchaînement
   des états : ABANDONNER EN PLEINE DESCENTE NE RAPPORTE RIEN. C'est le même
   arbitrage qu'au défi de fuite (RUN_ABORT_COUNTS_AS_LOSS) et pour la même
   raison : sans lui, il suffirait de mettre pause et de quitter juste avant un
   gourmand pour garder ses bonbons à chaque fois.

   ⚠️ MAIS LA SANCTION S'ARRÊTE LÀ. Perdre une descente ne blesse pas, ne coûte
   pas de position, ne déclenche aucune cinématique — contrairement au défi de
   fuite et au labyrinthe. Le Pays des Bonbons est un monde PAISIBLE (décision
   du zip 235 : seul « evil » garde des monstres), et lui coller une sanction de
   sortie en ferait un second monde sombre. On ouvre, on descend, on revient là
   où l'on était.
   ========================================================================== */

const Game = (function () {
  const STATE = { TITLE: "title", RUNNING: "running", PAUSED: "paused", OVER: "over" };

  let state = STATE.TITLE;
  let slope, sled, field, chaseCam;
  let lastFrame = 0, startedAt = 0, elapsed = 0;
  let score = 0, driftScore = 0;
  let running = false;
  let reported = false;

  /* ------------------------------------------------------------ DÉMARRAGE */
  function start() {
    slope = new Slope.SlopeGen();
    sled = new Sled();
    field = new Critters.Field();
    chaseCam = new ChaseCamera(World.camera);
    score = 0;
    elapsed = 0;
    reported = false;

    sled.onCrash = () => { chaseCam.addShake(1); setTimeout(endRun, 900); };
    sled.onLand = (hard) => { if (hard) chaseCam.addShake(0.4); };
    sled.onBoost = () => chaseCam.addShake(0.18);

    World.clearAll();
    for (const n of slope.nodes) World.buildNode(n);

    Input.clear();
    state = STATE.RUNNING;
    UI.show("hud");
    lastFrame = performance.now();
    startedAt = lastFrame;
  }

  function endRun() {
    if (state === STATE.OVER) return;
    state = STATE.OVER;
    UI.showGameOver(sled, score, sled.finished ? elapsed : 0, sled.finished);
    /* ⚠️ L'ARRIVÉE EST ANNONCÉE TOUT DE SUITE, la défaite seulement à la
       fermeture de l'écran de fin (voir leave()). Une descente terminée est une
       réussite : elle ne doit pas pouvoir être perdue par un joueur qui ferme
       l'onglet en regardant son temps. Un échec, lui, n'a rien à sauver, et le
       joueur doit pouvoir lire son score avant que la ferme reprenne la main.
       C'est exactement le partage du défi de fuite entre "escape" et "over". */
    if (sled.finished && !reported) {
      reported = true;
      Bridge.finish({
        score: Math.floor(score),
        candies: sled.candies | 0,
        timeMs: Math.floor(elapsed),
      });
    }
  }

  function togglePause() {
    if (state === STATE.RUNNING) { state = STATE.PAUSED; UI.show("pause"); }
    else if (state === STATE.PAUSED) {
      state = STATE.RUNNING;
      lastFrame = performance.now();
      UI.show("hud");
    }
  }

  /* Bouton « Abandonner » de l'écran de pause. */
  function giveUp() {
    if (!sled || !sled.alive) { leave(); return; }
    sled.die("abort");
    endRun();
  }

  function leave() {
    if (Bridge.embedded) {
      if (sled && !reported && !sled.finished) {
        reported = true;
        Bridge.over({
          score: Math.floor(score),
          candies: sled.candies | 0,
          cause: (sled.cause || "abort"),
        });
        return;
      }
      Bridge.exit();
      return;
    }
    state = STATE.TITLE;
    UI.show("title");
  }

  /* ------------------------------------------------------------- BOUCLE */
  function frame(now) {
    requestAnimationFrame(frame);

    let dt = (now - lastFrame) / 1000;
    lastFrame = now;
    // dt plafonné : un onglet en arrière-plan ne doit pas téléporter la luge à
    // travers trois vagues de gourmands à son retour.
    if (dt > 0.05) dt = 0.05;
    if (dt <= 0) return;

    if (state === STATE.RUNNING) {
      // Le chrono s'arrête À LA LIGNE, pas quand la luge s'immobilise : le
      // dégagement qui suit n'est plus de la course.
      if (!sled.finished) elapsed = now - startedAt;
      const finishK = slope.finishK(sled.s);
      sled.update(dt, now, finishK);
      field.update(dt, now, sled);

      const nodeIndex = Math.floor(sled.s / CFG.NODE_LEN);
      const dropped = slope.ensureAhead(nodeIndex);
      for (const n of dropped) World.dropNode(n);
      for (const n of slope.nodes) if (!n.group) World.buildNode(n);

      /* Le score suit la distance ET le dérapage tenu. Le second terme n'est
         pas décoratif : il dit au joueur, en chiffres, que la plus belle chose
         du jeu est aussi la plus payante. Un joueur qui ne dérape jamais finit
         la descente ; un joueur qui dérape la gagne. */
      driftScore += sled.drift * CFG.SCORE_DRIFT_PER_SEC * dt;
      score = sled.s * CFG.SCORE_PER_UNIT
            + sled.candies * CFG.CANDY_SCORE
            + driftScore;

      chaseCam.update(dt, sled, now);
      World.updateSled(sled, now);
      World.updateCritters(field, now);
      World.updateFx(sled, dt, now);
      World.updateAmbient(now, sled);
      UI.updateHud(sled, score, elapsed, slope.stageAt(sled.s));

      if (sled.finished && sled.v < 3) endRun();

    } else if (state === STATE.TITLE) {
      /* L'écran-titre montre LE VRAI PAYSAGE, caméra posée en haut de la piste
         et lentement dérivante. C'est la première image du jeu : un fond noir
         derrière un bouton ne donne envie de rien, et la scène est déjà
         construite de toute façon. */
      /* Un VA-ET-VIENT, pas une avance : au bout de 480 unités il n'y aurait
         plus de tronçon construit devant, et l'écran-titre finirait sur du
         vide. Un sinus reste dans la portion déjà bâtie, indéfiniment. */
      sled.s = 95 + Math.sin(now / 9000) * 55;
      sled.u = Math.sin(now / 4200) * 6;
      chaseCam.update(dt, sled, now);
      World.updateSled(sled, now);
      World.updateAmbient(now, sled);

    } else if (state === STATE.OVER || state === STATE.PAUSED) {
      /* La scène continue de vivre derrière l'écran de fin : la neige tombe,
         les gourmands bougent, la caméra respire. Un décor figé derrière un
         panneau de score donne l'impression d'un plantage. */
      World.updateAmbient(now, sled);
      if (sled) {
        chaseCam.update(dt, sled, now);
        World.updateCritters(field, now);
        World.updateFx(sled, dt, now);
      }
    }

    World.render();
  }

  /* --------------------------------------------------------------- INIT */
  function init() {
    Bridge.init(() => { UI.applyLang(); World.applySkin(Bridge.skin); });

    if (typeof THREE === "undefined") {
      UI.init();
      UI.showLoadError();
      document.getElementById("btnStart").disabled = true;
      return;
    }
    UI.init();
    World.init(document.getElementById("gl"));
    Input.init(togglePause);

    document.getElementById("btnStart").addEventListener("click", () => { driftScore = 0; start(); });
    document.getElementById("btnResume").addEventListener("click", togglePause);
    document.getElementById("btnQuit").addEventListener("click", giveUp);
    document.getElementById("btnBack").addEventListener("click", leave);

    /* La scène du menu : on construit la piste et on pose la caméra dessus,
       sans luge. L'écran-titre montre alors le vrai paysage du jeu au lieu
       d'un fond noir — c'est la première image que le joueur voit, et c'est
       elle qui donne envie d'appuyer sur « S'élancer ». */
    slope = new Slope.SlopeGen();
    sled = new Sled();
    field = new Critters.Field();
    chaseCam = new ChaseCamera(World.camera);
    for (const n of slope.nodes) World.buildNode(n);
    World.updateSled(sled, 0);

    UI.show("title");
    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  return { init, start, togglePause, giveUp, leave, get state() { return state; } };
})();

window.addEventListener("load", Game.init);
