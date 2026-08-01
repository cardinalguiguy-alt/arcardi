/* =============================================================================
   game.js — Boucle, commandes et progression (zip 385).
   -----------------------------------------------------------------------------
   Assemble les cinq autres morceaux : la physique (physics.js) avance, le
   rendu (render.js) peint, l'interface (ui.js) parle, le pont (bridge.js)
   prévient la ferme, les niveaux (levels.js) décrivent quoi jouer.

   RÈGLE DE PROGRESSION, et c'est la seule qui compte : un niveau terminé est
   annoncé à la ferme IMMÉDIATEMENT, à l'instant de la victoire, avant même
   d'afficher l'écran de fin. Le joueur peut fermer l'onglet, perdre le
   réseau, se faire appeler à table — le niveau est acquis. Le défi de fuite
   fait l'inverse (il attend la fermeture de l'écran de fin) et c'est correct
   là-bas : un score se contemple, une progression se garde.
   ========================================================================== */

(function () {
  const canvas = document.getElementById("gl");
  const ctx = canvas.getContext("2d");

  let scale = 1;
  let st = null;              // état de physique du niveau en cours
  let level = 1;              // niveau affiché
  let best = 0;               // plus haut niveau terminé
  let paused = false;
  let ended = false;          // écran de fin affiché : la physique n'avance plus
  let lastT = 0;
  const swipe = [];           // points du geste en cours (repère scène)

  /* ------------------------------------------------------------ commandes */
  let pointerDown = false, moved = false, lastPt = null;

  function pt(e) {
    const src = e.touches && e.touches[0] ? e.touches[0] : e;
    return Render.toScene(canvas, src.clientX, src.clientY);
  }

  function down(e) {
    if (!st || paused || ended || st.status !== "run") return;
    pointerDown = true; moved = false;
    lastPt = pt(e);
    swipe.length = 0; swipe.push(lastPt);
    e.preventDefault();
  }

  function move(e) {
    if (!pointerDown || !st || st.status !== "run") return;
    const p = pt(e);
    if (Math.hypot(p.x - lastPt.x, p.y - lastPt.y) >= CFG.CUT_MIN_DIST) {
      Phys.cut(st, lastPt.x, lastPt.y, p.x, p.y);
      lastPt = p; moved = true;
      swipe.push(p);
      if (swipe.length > 16) swipe.shift();
    }
    e.preventDefault();
  }

  function up(e) {
    // Un clic SANS déplacement crève une bulle ; un geste tranche des cordes.
    // Distinguer les deux sur le déplacement plutôt que sur deux boutons est
    // ce qui permet de jouer à la souris et au doigt avec le même code.
    if (pointerDown && !moved && st && st.status === "run" && lastPt) Phys.pop(st, lastPt.x, lastPt.y);
    pointerDown = false;
    swipe.length = 0;
    if (e && e.preventDefault) e.preventDefault();
  }

  window.addEventListener("mousedown", down);
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
  canvas.addEventListener("touchstart", down, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", up, { passive: false });

  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { if (st && !ended) togglePause(); }
    else if (e.key === "r" || e.key === "R") { if (st && !paused && !ended) startLevel(level); }
  });

  /* ------------------------------------------------------------ déroulé -- */
  function startLevel(n) {
    level = Math.max(1, Math.min(CFG.LEVELS, n));
    st = Phys.makeState(LEVELS[level - 1]);
    paused = false; ended = false;
    swipe.length = 0;
    UI.show(null);
    UI.hud(level, 0, (LEVELS[level - 1].stars || []).length, best);
  }

  function togglePause() {
    if (!st || st.status !== "run") return;
    paused = !paused;
    UI.show(paused ? "pause" : null);
  }

  /* Message de récompense affiché sur l'écran de victoire. La ferme décide
     VRAIMENT de l'attribution ; ici on choisit seulement quoi écrire, à partir
     de ce qu'elle nous a dit à l'ouverture (goldClaimed / catDone). D'où les
     deux variantes « déjà réclamé » : rejouer le niveau 10 après avoir pris
     l'or ne doit pas promettre 10 000 pièces une deuxième fois. */
  function prizeFor(n) {
    const L = UI.strings();
    if (n === CFG.GOLD_LEVEL) {
      if (!Bridge.goldClaimed) { Bridge.goldClaimed = true; return L.prizeGold(CFG.GOLD_AMOUNT); }
      return L.prizeGoldSeen;
    }
    if (n === CFG.PET_LEVEL) {
      if (!Bridge.catDone) { Bridge.catDone = true; return L.prizeCat; }
      return L.prizeCatSeen;
    }
    return "";
  }

  function onWon() {
    const got = Phys.starsGot(st);
    // D'ABORD la ferme, ENSUITE l'écran. Voir l'en-tête du fichier.
    Bridge.levelDone(level, got);
    if (level > best) best = level;
    UI.hud(level, got, st.stars.length, best);
    UI.won(level, got, st.stars.length, prizeFor(level));
  }

  function nextLevel() {
    if (level >= CFG.LEVELS) { ended = true; UI.show("ending"); return; }
    startLevel(level + 1);
  }

  function quit() { Bridge.exit(); }

  /* -------------------------------------------------------------- boucle */
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = lastT ? Math.min(100, t - lastT) : 16;
    lastT = t;

    if (st) {
      if (!paused && !ended && st.status === "run") {
        const before = st.status;
        Phys.step(st, dt);
        if (st.status !== before) {
          if (st.status === "won") onWon();
          else UI.lost(st.reason);
        } else {
          UI.hud(level, Phys.starsGot(st), st.stars.length, best);
        }
      }
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      Render.draw(ctx, st, t, swipe);
    }
  }

  function resize() { scale = Render.fit(canvas); }
  window.addEventListener("resize", resize);

  /* ------------------------------------------------------------ démarrage */
  function boot() {
    UI.bind();
    UI.applyLang(Bridge.lang);
    best = Bridge.startLevel === null ? 0 : Bridge.startLevel;
    const next = Math.min(CFG.LEVELS, best + 1);
    UI.startButton(next);
    UI.hud(next, 0, (LEVELS[next - 1].stars || []).length, best);

    UI.el.btnStart.onclick = function () { startLevel(best + 1); };
    UI.el.btnResume.onclick = togglePause;
    UI.el.btnQuit.onclick = quit;
    UI.el.btnNext.onclick = nextLevel;
    UI.el.btnWonQuit.onclick = quit;
    UI.el.btnRetry.onclick = function () { startLevel(level); };
    UI.el.btnLostQuit.onclick = quit;
    UI.el.btnEndQuit.onclick = quit;

    resize();
    UI.show("title");
    // Une image est peinte même avant la première partie : sans elle, l'écran
    // de titre flotte sur du vide et on croit que le jeu n'a pas chargé.
    st = Phys.makeState(LEVELS[next - 1]);
    requestAnimationFrame(frame);
  }

  // La ferme peut répondre avant ou après le chargement du script. On démarre
  // sur le premier des deux événements, et `booted` interdit la deuxième
  // entrée — sinon la langue serait posée deux fois et l'écran de titre
  // réapparaîtrait par-dessus une partie déjà commencée.
  let booted = false;
  function once() { if (booted) return; booted = true; boot(); }
  Bridge.init(function () {
    if (!booted) { once(); return; }
    // Init arrivée après le démarrage (cas normal quand React est lent) :
    // on rattrape la langue et la progression sans casser l'écran en cours.
    UI.applyLang(Bridge.lang);
    best = Bridge.startLevel === null ? 0 : Bridge.startLevel;
    const nx = Math.min(CFG.LEVELS, best + 1);
    UI.startButton(nx);
    UI.hud(nx, 0, (LEVELS[nx - 1].stars || []).length, best);
  });
  // Hors iframe (ouverture directe du fichier pour itérer), aucun message
  // n'arrivera jamais : on démarre quand même, en français, au niveau 1.
  setTimeout(once, 900);
})();
