/* =============================================================================
   game.js — machine à états et boucle principale.
   -----------------------------------------------------------------------------
   Cinq états : "title", "play", "pause", "over", "won". Rien d'autre n'existe.

   ⚠️ LE PAS EST FIXE (1/60), et ce n'est pas un détail de confort. Toute la
   vérification du chantier (tools/simulate-maze.mjs, batch-maze.mjs) joue à ce
   pas-là. Laisser le navigateur imposer un dt variable ferait diverger le jeu
   de l'outil qui le mesure — c'est-à-dire rendrait faux TOUT ce qui a été
   réglé. On accumule donc le temps réel et on consomme des pas entiers, avec
   un plafond pour ne pas exploser après un onglet mis en veille.
   ========================================================================== */

(function () {
  /* ⚠️ LE PAS VIENT DE CFG.SIM_HZ, IL N'EST PAS ÉCRIT ICI. lib-play.mjs,
     smoke-render.mjs et verify-controls.mjs lisent la même constante : deux
     cadences qui doivent rester égales et qui sont écrites à deux endroits
     finissent toujours par diverger, et un outil qui joue à 60 pendant que le
     jeu joue à 30 mesure autre chose que le jeu. */
  const DT = 1 / CFG.SIM_HZ;
  const MAX_STEPS = 5;          // au-delà, on laisse filer : mieux vaut sauter que geler

  let state = "title";
  let st = null, maze = null;
  let acc = 0, last = 0;
  let seed = 0;
  let ended = false;
  /* ⚠️ ZIP 396 — LE DRAPEAU QUI FAIT DISPARAÎTRE LE GEL DU LANCEMENT.
     Le titre n'est plus affiché par le HTML : il attend que la PREMIÈRE IMAGE
     3D soit réellement passée par renderer.render(). Tant qu'elle ne l'est
     pas, on montre l'écran de chargement. Voir boot(). */
  let firstFrame = false;

  const $ = (id) => document.getElementById(id);

  function newRun() {
    /* La graine vient de l'horloge : chaque venue au labyrinthe est un
       labyrinthe neuf. C'est le contraire du choix fait pour les cartes du
       passage (stables par semaine, pour qu'on reconnaisse le monde) — ici
       reconnaître le dédale supprimerait tout le jeu dès la deuxième partie. */
    seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
    maze = Maze.generate(CFG, seed);
    if (!maze) { seed = 1; maze = Maze.generate(CFG, 1); }
    st = Rules.create(CFG, maze, seed);
    World.init(CFG, maze, st, $("gl"), Bridge.skin);
    ended = false;
    acc = 0; last = performance.now();
  }

  function toTitle() { state = "title"; UI.show("title", true); Input.clear(); }

  function start() {
    UI.show("title", false);
    UI.show("gameover", false);
    UI.show("pause", false);
    Input.clear();
    newRun();
    state = "play";
  }

  /* ZIP 396 — LE RENONCEMENT. Demande de Guillaume : « comme un abandon sans
     coût ». On sort donc par Bridge.exit(), le MÊME message que le bouton
     « Ressortir » de l'écran-titre — celui que la ferme traite déjà comme
     « ressortir sans être entré : aucune conséquence » (voir closeLabGame
     dans FermeGame.js). Aucune blessure, aucune requête réseau, aucun score.

     ⚠️ ON NE PASSE SURTOUT PAS PAR quit(), qui compte l'abandon comme un
     ÉCHEC et renvoie le fermier blessé pour dix minutes. Les deux gestes
     portent le même mot en français et n'ont rien à voir : abandonner en
     plein dédale coûte, faire demi-tour dans les quinze premières secondes ne
     coûte rien. C'est toute la mécanique demandée. */
  function leaveFree() {
    if (ended) return;
    ended = true;
    state = "over";
    Input.clear();
    Bridge.exit();
    if (!Bridge.embedded) { newRun(); toTitle(); }
  }

  function finish(won) {
    if (ended) return;
    ended = true;
    state = won ? "won" : "over";
    Input.clear();
    if (won) {
      /* SORTIE : on part SANS écran de fin. Voir bridge.js — sortir d'un
         labyrinthe est un soulagement, pas un bilan. La ferme enchaîne son
         propre fondu et repose le fermier au pied du pont. */
      UI.show("win", true);
      setTimeout(() => {
        Bridge.won({ score: st.score | 0, shards: st.shardsTaken | 0 });
        if (!Bridge.embedded) toTitle();
      }, 1500);
    } else {
      UI.over(st, false);
    }
  }

  function quit() {
    /* Abandonner en cours de partie COMPTE COMME UN ÉCHEC, comme au défi de
       fuite (RUN_ABORT_COUNTS_AS_LOSS). Sans cette règle, il suffirait
       d'appuyer sur Échap dès qu'on est en danger pour ne jamais rien
       risquer, et le labyrinthe n'aurait plus d'enjeu du tout. Ressortir
       depuis l'ÉCRAN-TITRE, en revanche, est gratuit — on n'est pas entré. */
    if (!st) return;
    st.endCause = "quit";
    UI.show("pause", false);
    finish(false);
  }

  function loop(now) {
    requestAnimationFrame(loop);
    if (state === "play") {
      acc += Math.min(0.25, (now - last) / 1000);
      last = now;
      let steps = 0;
      while (acc >= DT && steps < MAX_STEPS) {
        acc -= DT; steps++;
        /* ⚠️ ON MÉMORISE L'ÉTAT D'AVANT AVANT DE SIMULER. C'est la moitié du
           travail de l'interpolation : le rendu affichera un entre-deux de
           snapPrev() et de l'état obtenu. Sans cette ligne, la simulation à
           30 Hz se verrait comme telle sur un écran à 60 ou 144 — c'est-à-dire
           exactement la saccade qu'on cherche à supprimer. */
        World.snapPrev(st);
        const intent = Input.read();
        Rules.step(st, DT, intent);
        UI.events(st);
        if (st.status === "won") { finish(true); break; }
        if (st.status === "abandon") { leaveFree(); break; }   // zip 396
        if (st.status === "dead") { finish(false); break; }
      }
      if (acc > DT * MAX_STEPS) acc = 0;
      if (Input.takePause()) { state = "pause"; UI.show("pause", true); Input.clear(); }
      UI.flameWarnings(st);
      UI.hud(st);
    } else {
      last = now;
    }
    if (st) {
      if (st.status === "falling") World.fallStep(st, DT);
      /* `alpha` est la fraction de pas déjà écoulée : 0 = on vient de simuler,
         1 = le pas suivant est dû. C'est lui qui rend le mouvement continu. */
      World.sync(st, now, state === "play" ? acc / DT : 1);
      /* ⚠️ LE TITRE ATTEND LA PREMIÈRE IMAGE, ET C'EST LA MOITIÉ VISIBLE DE LA
         RÉPARATION DE LA PAGE DE LANCEMENT (zip 396). Il était affiché par le
         HTML, donc AVANT que three.js ait compilé le moindre shader : on
         voyait un panneau posé sur du noir, puis le décor apparaissait
         derrière d'un coup — c'est ce que Guillaume décrit par « la page de
         lancement bug un peu avant de s'afficher ». On bascule ici, une seule
         fois, après le premier renderer.render() réellement passé. */
      if (!firstFrame) {
        firstFrame = true;
        UI.show("loading", false);
        if (state === "title") UI.show("title", true);
      }
    }
    UI.toastTick(now);
  }

  function boot() {
    if (!window.THREE) {
      const e = $("loadError");
      if (e) { e.textContent = LAB_STR[Bridge.lang].loadError; e.style.display = "block"; }
      // ⚠️ Sans trois.js il n'y aura JAMAIS de première image, donc jamais de
      // bascule : l'écran de chargement tournerait indéfiniment et l'erreur
      // resterait cachée derrière lui. On montre le titre à la main.
      UI.show("loading", false);
      UI.show("title", true);
      return;
    }
    Input.init();
    window.addEventListener("resize", () => World.resize());
    $("btnStart").addEventListener("click", start);
    $("btnResume").addEventListener("click", () => {
      state = "play"; last = performance.now(); acc = 0;
      UI.show("pause", false); Input.clear();
    });
    $("btnQuit").addEventListener("click", quit);
    $("btnBack").addEventListener("click", () => {
      UI.show("gameover", false);
      // "vf-lab-over" part ICI, pas à la mort : le joueur doit pouvoir lire
      // son score avant que la ferme enchaîne son fondu au noir.
      Bridge.over({ score: st.score | 0, shards: st.shardsTaken | 0, cause: st.endCause || "dead" });
      if (!Bridge.embedded) toTitle();
    });
    const be = $("btnExit");
    if (be) be.addEventListener("click", () => Bridge.exit());

    /* On construit un labyrinthe DÈS L'ÉCRAN-TITRE, et on le laisse tourner
       derrière. Deux raisons : le titre montre le jeu au lieu d'un fond noir,
       et surtout la première image d'une partie n'a plus à payer la
       construction de 900 murs — un gel d'une demi-seconde au moment précis
       où le joueur appuie sur « Entrer » se lit comme un jeu qui rame. */
    newRun();
    state = "title";
    requestAnimationFrame(loop);
  }

  Bridge.init(() => {
    UI.applyLang(Bridge.lang);
    if (Bridge.externalBest !== null) UI.setBest(Bridge.externalBest);
    /* ⚠️ ZIP 396 — LA CAUSE RACINE DU GEL DE LA PAGE DE LANCEMENT.
       Cette ligne disait `if (st) newRun();` : la ferme envoyant la tenue du
       joueur APRÈS le chargement de l'iframe, le labyrinthe était construit
       DEUX FOIS — génération du dédale, peinture de sept textures,
       reconstruction de 2 600 maillages — pour changer quatre couleurs de
       vêtement. Le second passage tombait pile au moment où l'écran-titre
       devait apparaître, d'où le hoquet que Guillaume a vu.

       On ne refait plus que le fermier (voir World.reskin), une centaine de
       volumes. Et on ne rejoue rien du tout si la partie est commencée : on
       ne va pas régénérer le dédale d'un joueur au motif qu'un message est
       arrivé tard. */
    if (st) World.reskin(CFG, Bridge.skin);
  });
  UI.applyLang(Bridge.lang);
  /* Hors ferme (double-clic sur index.html), le record vit en localStorage.
     Embarqué, il vient de la ferme et n'est jamais écrit ici — la sauvegarde
     du joueur est autoritaire côté hôte, un record écrit des deux côtés
     divergerait au premier rechargement. */
  if (!Bridge.embedded) {
    try { UI.setBest(parseInt(localStorage.getItem("vf-lab-best") || "0", 10) || 0); } catch (e) {}
    window.addEventListener("beforeunload", () => {
      try { localStorage.setItem("vf-lab-best", String(UI.best)); } catch (e) {}
    });
  }
  window.addEventListener("load", boot);
})();
