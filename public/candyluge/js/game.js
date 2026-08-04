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

/* ═══════════════════════════════════════════════════════════════════════════
   LA PORTE DÉROBÉE — « jeu en construction » et son code secret (415).
   ───────────────────────────────────────────────────────────────────────────
   La descente n'est pas ouverte au public tant qu'elle se construit. Elle
   s'ouvre par ⌘⇧X (ou Ctrl+Maj+X) pressé DEUX FOIS.

   ⚠️ POURQUOI DEUX FOIS PLUTÔT QU'UNE. Un raccourci unique se déclenche par
   accident — et le jour où ça arrive, le mur est tombé sans que personne ne
   sache pourquoi ni comment le remettre. Deux pressions successives dans une
   fenêtre de temps courte ne se produisent jamais par hasard : c'est une
   INTENTION, et c'est tout ce qu'on demande à un code secret.

   ⚠️ CTRL EST ACCEPTÉ EN PLUS DE CMD, et ce n'est pas une trahison de la
   consigne (« command shift X ») : `metaKey` n'existe tout simplement pas sur
   un clavier Windows ou Linux. S'en tenir à Cmd rendrait le jeu définitivement
   inaccessible depuis ces machines, y compris pour celui qui connaît le code.
   Sur Mac, ⌘⇧X marche exactement comme demandé.

   ⚠️ LE DÉVERROUILLAGE TIENT POUR LA SESSION DE L'ONGLET, pas pour toujours.
   `sessionStorage` et non `localStorage`, et c'est un arbitrage :
     * avec localStorage, un navigateur ayant vu le code une fois serait ouvert
       POUR TOUJOURS — y compris sur une machine prêtée ou une démo, et sans
       qu'on puisse vérifier que le mur tient encore ;
     * sans rien du tout, il faudrait retaper le code à chaque rechargement,
       ce qui est pénible quand on teste le jeu vingt fois de suite.
   La session est le bon milieu : on ouvre une fois, on teste tranquillement, et
   une nouvelle visite retrouve le mur. Pour re-verrouiller tout de suite :
   fermer l'onglet, ou vider le stockage de session.

   ⚠️ ET ON NE FAIT QUE MASQUER UN PANNEAU. Ce n'est PAS une protection : les
   fichiers du jeu sont publics et n'importe qui sachant lire du JavaScript
   franchira ce mur en trente secondes. Ce n'est pas le but — le but est de ne
   pas proposer aux joueurs un jeu qui n'est pas fini. Ne jamais mettre derrière
   ce mur quoi que ce soit qui doive VRAIMENT rester secret.
   ═══════════════════════════════════════════════════════════════════════════ */
const Gate = (function () {
  const KEY = "vf-luge-wip";
  const WINDOW_MS = 3500;      // délai maximal entre les deux pressions
  let armed = 0;               // date de la première pression, 0 si aucune
  let onOpen = null;

  function unlocked() {
    try { return sessionStorage.getItem(KEY) === "1"; } catch (e) { return false; }
  }
  function remember() {
    try { sessionStorage.setItem(KEY, "1"); } catch (e) { /* mode privé : tant pis */ }
  }

  function init(cb) {
    onOpen = cb;
    if (unlocked()) return;
    /* ⚠️ EN PHASE DE CAPTURE (`true`), donc AVANT le gestionnaire de input.js.
       Sans ça, l'ordre des écouteurs déciderait de qui voit la touche en
       premier — et input.js appelle preventDefault sur une partie du clavier.
       Un code secret ne doit pas dépendre de l'ordre de chargement des
       fichiers. */
    window.addEventListener("keydown", onKey, true);
  }

  function onKey(e) {
    if (unlocked()) return;
    // ⚠️ `e.code` et non `e.key` : avec Maj enfoncée, `key` vaut "X" majuscule,
    // et il change complètement de valeur sur un clavier non-latin. `code`
    // désigne la TOUCHE PHYSIQUE, qui est ce qu'on veut pour un raccourci.
    if (e.code !== "KeyX" || !e.shiftKey || !(e.metaKey || e.ctrlKey)) return;
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    if (armed && now - armed < WINDOW_MS) {
      armed = 0;
      remember();
      window.removeEventListener("keydown", onKey, true);
      const panel = document.getElementById("construction");
      if (panel) panel.classList.remove("armed");
      if (onOpen) onOpen();
      return;
    }
    // Première pression : on arme, avec un retour très discret (voir le CSS).
    armed = now;
    const panel = document.getElementById("construction");
    if (panel) {
      panel.classList.add("armed");
      setTimeout(() => {
        if (Date.now() - armed >= WINDOW_MS - 50) {
          armed = 0;
          panel.classList.remove("armed");
        }
      }, WINDOW_MS);
    }
  }

  return { init, unlocked };
})();

const Game = (function () {
  const STATE = { TITLE: "title", RUNNING: "running", PAUSED: "paused", OVER: "over" };

  let state = STATE.TITLE;
  let slope, sled, field, chaseCam;
  let lastFrame = 0, startedAt = 0, elapsed = 0;
  let score = 0, driftScore = 0;
  let running = false;
  let reported = false;
  let cpFlash = -1e9;

  /* ------------------------------------------------------------ DÉMARRAGE */
  function start() {
    slope = new Slope.SlopeGen();
    sled = new Sled();
    field = new Critters.Field();
    chaseCam = new ChaseCamera(World.camera);
    score = 0;
    elapsed = 0;
    reported = false;

    /* ⚠️ UNE CHUTE RENVOIE AU DERNIER CHECKPOINT (414). Elle n'arrête toujours
       pas la descente — la seule fin possible reste le bas de la piste ou
       l'abandon — mais elle coûte désormais le morceau de piste à refaire, et
       c'est ce qui met enfin quelque chose en jeu. */
    sled.onWipe = () => chaseCam.addShake(1);
    sled.onCrash = () => { chaseCam.addShake(1); setTimeout(endRun, 900); };
    sled.onLand = (hard, q) => { if (hard) chaseCam.addShake(0.35 + (1 - q) * 0.5); };
    sled.onCheckpoint = (i) => { cpFlash = performance.now(); UI.flashCheckpoint(i); };
    /* ⚠️ LA TRACE EST COUPÉE À LA REMISE EN PLACE, sans quoi elle resterait
       tendue entre le lieu de la chute et le checkpoint : un ruban de plusieurs
       centaines de mètres en travers du paysage. La caméra, elle, est
       RÉINITIALISÉE — un suivi amorti qui verrait la luge se téléporter
       traverserait tout le décor en glissant pendant deux secondes. */
    sled.onRespawn = () => {
      World.cutTrail();
      chaseCam.reset();
      /* ⚠️ ET ON RECONSTRUIT LA PISTE AUTOUR DU POINT DE REPRISE. Sans ces trois
         lignes, le joueur repart DANS LE VIDE : les tronçons du checkpoint ont
         été jetés quand il est passé devant, et `ensureAhead` ne sait que
         construire vers l'avant (voir la note dans slope.js). Bogue trouvé en
         RENDANT une image après une chute — la physique, elle, était juste. */
      const ni = Math.floor(sled.s / CFG.NODE_LEN);
      for (const n of slope.rewind(ni)) World.dropNode(n);
      for (const n of slope.nodes) if (!n.group) World.buildNode(n);
      /* Les gourmands et les bonbons doivent redescendre avec la luge. Sans
         ça, on refait le passage DÉSERT : les vagues déjà consommées ne
         reviennent pas, et le morceau à refaire n'est plus le même que celui
         qu'on vient de rater — ce qui vide le checkpoint de son sens. */
      field.rewind(sled.s, sled.cpTries);
    };
    // Le décrochage se SECOUE : c'est le seul retour immédiat qui dit « tu en
    // as trop demandé », et il arrive avant que le compteur ne baisse.
    sled.onCarveBreak = () => chaseCam.addShake(0.22);
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
      /* Le chrono s'arrête À LA LIGNE, pas quand la luge s'immobilise : le
         dégagement qui suit n'est plus de la course.
         ⚠️ ET IL NE S'ARRÊTE PAS PENDANT UNE CHUTE (414). C'est LUI la sanction
         du modèle Lonely Mountains — pas un écran, pas une vie perdue. Un
         chrono qui se suspendrait pendant la culbute et la remise en place
         rendrait la chute gratuite, et on retomberait exactement dans le 413
         qu'on vient de quitter. */
      if (!sled.finished) elapsed = now - startedAt;
      const finishK = slope.finishK(sled.s);
      sled.update(dt, now, finishK);
      field.update(dt, now, sled);

      const nodeIndex = Math.floor(sled.s / CFG.NODE_LEN);
      const dropped = slope.ensureAhead(nodeIndex);
      for (const n of dropped) World.dropNode(n);
      for (const n of slope.nodes) if (!n.group) World.buildNode(n);

      /* ⚠️ LE SCORE SUIT LA CARRE, PAS LE DÉRAPAGE (413). Au 412 il payait le
         dérapage, ce qui devient une faute dès lors que la carre existe : on
         payait le geste sale et lent. Un joueur qui ne carve jamais finit la
         descente ; un joueur qui carve la gagne — et c'est la même phrase que
         se disent tous les jeux de glisse depuis trente ans. */
      driftScore += sled.carve * CFG.SCORE_CARVE_PER_SEC * dt;
      score = sled.s * CFG.SCORE_PER_UNIT
            + sled.candies * CFG.CANDY_SCORE
            + driftScore;

      chaseCam.update(dt, sled, now);
      World.updateSled(sled, now);
      World.updateCritters(field, now, sled);
      World.updateFx(sled, dt, now);
      World.updateAmbient(now, sled);
      UI.updateHud(sled, score, elapsed, slope.stageAt(sled.s), now - cpFlash);

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
        World.updateCritters(field, now, sled);
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
      /* ⚠️ MÊME DANS CETTE BRANCHE, LE MUR PASSE AVANT (415). Depuis que
         l'écran-titre n'est plus visible par défaut, ne rien afficher ici
         laisserait une page vide : le message d'erreur vit DANS le titre. On
         montre donc l'un ou l'autre selon le verrou — et le mur reste
         prioritaire, parce qu'un jeu en construction dont la 3D n'a pas chargé
         est toujours un jeu en construction. */
      UI.show(Gate.unlocked() ? "title" : "construction");
      Gate.init(() => UI.show("title"));
      return;
    }
    UI.init();
    World.init(document.getElementById("gl"));
    Input.init(togglePause);

    document.getElementById("btnStart").addEventListener("click", () => { driftScore = 0; start(); });
    document.getElementById("btnResume").addEventListener("click", togglePause);
    document.getElementById("btnQuit").addEventListener("click", giveUp);
    document.getElementById("btnBack").addEventListener("click", leave);
    /* ⚠️ LE RETOUR DEPUIS LE MUR SORT DIRECTEMENT, IL NE PASSE PAS PAR leave().
       `leave()` déclare une descente PERDUE à la ferme (Bridge.over) quand une
       luge existe et n'a pas fini — or il en existe toujours une, construite
       pour animer l'écran-titre. Un joueur qui ouvre la descente, lit « jeu en
       construction » et repart se verrait donc compter une partie ratée, avec
       la cause « abandon ». On n'a rien joué : on sort, un point c'est tout. */
    const btnWip = document.getElementById("btnConstructionBack");
    if (btnWip) btnWip.addEventListener("click", () => {
      if (Bridge.embedded) Bridge.exit();
    });

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

    /* ⚠️ LE MUR DE CHANTIER (415). Il remplace l'écran-titre tant que le code
       secret n'a pas été donné. La SCÈNE, elle, tourne quand même derrière :
       le décor est déjà construit, la caméra dérive, et on voit donc la piste
       qu'on n'a pas encore le droit de descendre. C'est plus engageant qu'un
       panneau sur fond noir, et ça ne coûte rien puisque tout est là. */
    UI.show(Gate.unlocked() ? "title" : "construction");
    Gate.init(() => UI.show("title"));

    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  return { init, start, togglePause, giveUp, leave, get state() { return state; } };
})();

window.addEventListener("load", Game.init);
