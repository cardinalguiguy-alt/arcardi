/* =============================================================================
   game.js — Machine à états et boucle principale.
   -----------------------------------------------------------------------------
   Assemble les systèmes. Ne contient AUCUNE règle de gameplay : tout est dans
   config.js (les réglages), track.js (la piste) et player.js (les commandes).

   DEUX RÈGLES D'INTÉGRATION à ne pas perdre de vue :

   * Pas de relance instantanée sur l'écran de fin. Perdre renvoie le joueur à
     la ferme, blessé — un bouton "rejouer" contredirait ça.
   * Abandonner une course DÉJÀ COMMENCÉE compte comme une défaite
     (RUN_ABORT_COUNTS_AS_LOSS). Sans cette règle, il suffirait de mettre pause
     et de quitter une demi-seconde avant de se faire rattraper pour ne jamais
     rentrer blessé. Quitter depuis l'écran-titre, en revanche, est gratuit :
     on doit pouvoir entrer par curiosité et ressortir.

   ZIP 377 — TROISIÈME ISSUE. Ces deux règles restent vraies mot pour mot ;
   il s'y ajoute une SORTIE PROPRE, la seule qui ne soit pas une défaite : la
   bifurcation offroad, tous les 4000 m. Elle ne remplace pas l'abandon, elle
   le complète, et les coûts diffèrent volontairement — abandonner reste
   pénalisant PARCE QUE la sortie honnête existe désormais. Le contraste est
   le mécanisme, pas un effet de bord.

   Une conséquence à ne pas perdre de vue : c'est le premier état du jeu où le
   joueur n'a plus la main tout en étant encore dans la scène. Rien ne doit
   pouvoir le tuer pendant ces trois secondes (voir STATE.ESCAPING).
   ========================================================================== */

const Game = (function () {
  const STATE = { TITLE: "title", RUNNING: "running", PAUSED: "paused", ESCAPING: "escaping", OVER: "over" };

  let state = STATE.TITLE;
  let track, player, pack, chaseCam;
  let lastFrame = 0;
  let score = 0;
  let running = false;
  let reported = false;   // "vf-run-over" / "vf-run-escape" n'est envoyé qu'une fois

  /* ------------------------------------------------------------ DÉMARRAGE */
  function start() {
    track = new Track.TrackGen();
    player = new Player(track);
    pack = new WolfPack(track);
    chaseCam = new ChaseCamera(World.camera);
    score = 0;
    reported = false;

    player.onStumble = () => { pack.onStumble(); chaseCam.addShake(0.9); };
    player.onLand = (hard) => { if (hard) chaseCam.addShake(0.35); };
    player.onDeath = () => endRun(player.deathCause);
    player.onEscape = () => beginEscape();

    World.clearAll();
    World.setMist(0, 0);
    World.setStage(0);        // on repart sur la chaussée de pierre
    UI.setFade(0);
    UI.showEscape(false);
    for (const n of track.nodes) World.buildNode(n);

    Input.clear();
    state = STATE.RUNNING;
    UI.show("hud");
    lastFrame = performance.now();
  }

  function endRun(cause) {
    state = STATE.OVER;
    UI.showGameOver(score, player.coins, player.totalDist, cause);
  }

  /* ------------------------------------------------- SORTIE OFFROAD (377)
     Le score est FIGÉ au virage, pas au fondu. C'est la règle posée par
     Guillaume : le score mesure la distance parcourue EN DANGER, et le danger
     s'arrête au moment où l'on quitte la piste. Les trois secondes qui suivent
     sont une fin de scène, pas du jeu — les compter reviendrait à offrir 90
     points à qui sort, toujours les mêmes, ce qui n'est pas un score. */
  function beginEscape() {
    if (state !== STATE.RUNNING) return;
    state = STATE.ESCAPING;
    score = player.escapeDist * CFG.SCORE_PER_UNIT + player.coins * CFG.SCORE_PER_COIN;
    // La meute se détache ICI, à la vitesse qu'avait la course. Le fermier,
    // lui, ralentit : sans ce détachement, les loups auraient ralenti avec lui
    // et seraient restés collés dans le cadre pendant tout le fondu.
    pack.detach(player.totalDist, player.escapeSpeed);
    Input.clear();
    UI.showEscape(true);
  }

  function finishEscape() {
    if (reported) return;
    reported = true;
    const payload = {
      score: Math.floor(score),
      candies: player.coins | 0,
      distance: Math.floor(player.escapeDist),
    };
    if (Bridge.embedded) { Bridge.escape(payload); return; }
    // Hors de la ferme (ouverture directe du fichier) : il n'y a pas de carte
    // du monde sombre où atterrir, on montre l'écran de fin avec sa propre
    // cause. Sans ça, le prototype autonome resterait bloqué sur un écran noir.
    UI.showEscape(false);
    UI.setFade(0);
    state = STATE.OVER;
    UI.showGameOver(payload.score, payload.candies, payload.distance, "escape");
  }

  function togglePause() {
    if (state === STATE.RUNNING) { state = STATE.PAUSED; UI.show("pause"); }
    else if (state === STATE.PAUSED) { state = STATE.RUNNING; lastFrame = performance.now(); UI.show("hud"); }
  }

  /* Bouton "Abandonner" de l'écran de pause. */
  function giveUp() {
    if (!player || !player.alive) { leave(); return; }
    player.alive = false;
    player.deathCause = "abort";
    endRun("abort");
  }

  /* Bouton de l'écran de fin. C'est ICI qu'on prévient la ferme, pas au moment
     de la mort : le joueur doit pouvoir lire son score avant que la ferme
     enchaîne son fondu au noir. */
  function leave() {
    if (Bridge.embedded) {
      if (player && !reported) {
        reported = true;
        Bridge.over({
          score: Math.floor(score),
          candies: player.coins | 0,
          distance: Math.floor(player.totalDist),
          cause: player.deathCause || "abort",
        });
        return;
      }
      Bridge.exit();   // on n'a jamais couru : sortie sans conséquence
      return;
    }
    state = STATE.TITLE;
    UI.show("title");
  }

  /* ------------------------------------------------------------- BOUCLE */
  function frame(now) {
    requestAnimationFrame(frame);

    // dt plafonné : un onglet en arrière-plan ne doit pas téléporter le joueur
    // à travers trois obstacles à son retour.
    let dt = (now - lastFrame) / 1000;
    lastFrame = now;
    if (dt > 0.05) dt = 0.05;
    if (dt <= 0) return;

    if (state === STATE.RUNNING) {
      player.update(dt, now);
      pack.update(dt, player);

      // Construction/destruction des tronçons au fil de l'avancée.
      const dropped = track.ensureAhead(player.nodeIndex);
      for (const n of dropped) World.dropNode(n);
      for (const n of track.nodes) if (!n.group) World.buildNode(n);

      score = player.totalDist * CFG.SCORE_PER_UNIT + player.coins * CFG.SCORE_PER_COIN;
      chaseCam.update(dt, player);
      World.updatePlayer(player, now);
      World.updateWolves(pack, player, now);
      World.updateAmbient(now, pack.danger());
      /* Zip 379 : le décor et la brume suivent la DISTANCE, pas le tronçon.
         Les deux sont continus, donc ils ne peuvent pas sauter à un bord de
         tronçon — c'est ce qui rend la progression pierre -> AA invisible. */
      World.setMist(0, player.totalDist);
      World.setStage(track.stageAt(player.totalDist));
      const exitAt = track.nextExitAt(player.totalDist);
      UI.updateHud(score, player.coins, player.totalDist, pack.danger(),
                   exitAt === null ? null : exitAt - player.totalDist);

    } else if (state === STATE.ESCAPING) {
      /* Le fermier court toujours — c'est ce qui fait vivre la scène — mais
         plus rien ne le menace :

           * pack.update() n'est PAS appelé : l'écart cesse d'évoluer, donc
             aucune capture n'est possible pendant le fondu. Une mort à
             2,8 secondes d'une sortie réussie serait la pire fin du jeu.
           * updateWolves() l'est, lui. Les loups sont posés par locate() sur
             la piste PRINCIPALE, où la branche ne figure pas : ils continuent
             donc tout droit et s'éloignent d'eux-mêmes, sans une ligne de
             code pour le leur ordonner. C'est le schéma de Guillaume, obtenu
             gratuitement par la structure des données.
           * ensureAhead() reste appelé : les loups ont besoin que les
             tronçons devant l'embranchement existent encore pour y courir.
           * le score n'est plus recalculé (figé dans beginEscape). */
      player.update(dt, now);
      pack.runOn(dt);          // la meute file tout droit, à SON allure
      const droppedE = track.ensureAhead(player.nodeIndex);
      for (const n of droppedE) World.dropNode(n);
      for (const n of track.nodes) if (!n.group) World.buildNode(n);

      const pose = player.escapePose(now);
      chaseCam.update(dt, player);
      World.updatePlayer(player, now);
      World.updateWolves(pack, player, now);
      World.updateAmbient(now, 0);
      World.setMist(pose.k, player.totalDist);
      UI.setFade(pose.fade);
      UI.updateHud(score, player.coins, player.escapeDist, 0, null);
      if (pose.k >= 1) finishEscape();

    } else if (state === STATE.OVER) {
      // On laisse la scène vivre doucement derrière l'écran de fin.
      World.updateAmbient(now, 1);
      chaseCam.update(dt, player);
    }

    // On rend à CHAQUE frame, y compris en pause et au titre : sans
    // preserveDrawingBuffer, ne pas rendre laisse un canvas potentiellement
    // vidé par le navigateur, et l'écran de pause se retrouve sur du noir.
    World.render();
  }

  /* --------------------------------------------------------------- INIT */
  function init() {
    // Le pont d'abord : il fixe la langue, le record ET LA TENUE avant le
    // premier affichage. Le rappel rejoue les deux si la ferme répond après
    // coup — et World.applySkin sait encaisser un appel avant que la scène
    // existe (voir pendingSkin), ce qui rend l'ordre d'arrivée indifférent.
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

    document.getElementById("btnStart").addEventListener("click", start);
    document.getElementById("btnResume").addEventListener("click", togglePause);
    document.getElementById("btnQuit").addEventListener("click", giveUp);
    document.getElementById("btnBack").addEventListener("click", leave);

    UI.show("title");
    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  return { init, start, togglePause, giveUp, leave, get state() { return state; } };
})();

window.addEventListener("load", Game.init);
