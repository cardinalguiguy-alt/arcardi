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
   ========================================================================== */

const Game = (function () {
  const STATE = { TITLE: "title", RUNNING: "running", PAUSED: "paused", OVER: "over" };

  let state = STATE.TITLE;
  let track, player, pack, chaseCam;
  let lastFrame = 0;
  let score = 0;
  let running = false;
  let reported = false;   // "vf-run-over" n'est envoyé qu'une fois

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

    World.clearAll();
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
      UI.updateHud(score, player.coins, player.totalDist, pack.danger());

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
    // Le pont d'abord : il fixe la langue et le record avant le premier
    // affichage. applyLang() est rappelé si la ferme répond après coup.
    Bridge.init(() => UI.applyLang());

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
