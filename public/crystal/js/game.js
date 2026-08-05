/* =============================================================================
   game.js — MUR DE CHANTIER, BOUCLE PRINCIPALE, PRÉSENTATION.
   ========================================================================== */

/* ═══════════════════════════════════════════════════════════════════════════
   LE MUR DE CHANTIER — « vallée en construction ».
   ───────────────────────────────────────────────────────────────────────────
   ⚠️ COPIE VOLONTAIRE DE `labyrinth/js/game.js` (LabGate, zip 417), et le
   raisonnement de son en-tête fait toujours autorité : les mini-jeux sont des
   pages autonomes, ce code est figé, et il est destiné à disparaître le jour
   où le jeu ouvre. Créer un module commun pour vingt lignes obligerait à
   décider où il vit et à l'ajouter à QUATRE pages au lieu de trois.

   ⚠️ MÊME GESTE, MÉMOIRE SÉPARÉE — la contrainte croisée posée par Guillaume
   au 417 et vérifiée par `tools/verify-gates.mjs`. Le raccourci est
   rigoureusement le même (⌘⇧X ou Ctrl+Maj+X, deux fois en moins de 3,5 s) ;
   la clé de session est `vf-cry-wip`, et elle DOIT différer de `vf-lab-wip` et
   de `vf-luge-wip`. Ouvrir la vallée pour la montrer ne doit pas rouvrir le
   labyrinthe ni la descente au passage — sinon un seul code déverrouille tout
   le site et personne ne sait plus ce qui est montré au public.

   ⚠️ CE N'EST PAS UNE PROTECTION. Les fichiers sont publics. Le but est de ne
   pas proposer aux visiteurs un jeu inachevé, rien de plus.

   ⚠️ POUR OUVRIR LA VALLÉE : `CFG.GATE_ON = false` (js/config.js), et rien
   d'autre. Ne PAS toucher à ce fichier — un réglage qui se fait en modifiant de
   la logique est un réglage qu'on finit par oublier de remettre.
   ═══════════════════════════════════════════════════════════════════════════ */
const CryGate = (function () {
  const KEY = "vf-cry-wip";
  const WINDOW_MS = 3500;
  let armed = 0;
  let onOpen = null;

  function unlocked() {
    try { return sessionStorage.getItem(KEY) === "1"; } catch (e) { return false; }
  }
  function remember() {
    try { sessionStorage.setItem(KEY, "1"); } catch (e) { /* navigation privée : tant pis */ }
  }

  function init(cb) {
    onOpen = cb;
    if (unlocked()) return;
    // ⚠️ EN PHASE DE CAPTURE : un code secret ne doit pas dépendre de l'ordre
    // de chargement des fichiers ni de qui a attaché son écouteur en premier.
    window.addEventListener("keydown", onKey, true);
  }

  function onKey(e) {
    if (unlocked()) return;
    // ⚠️ `e.code` et non `e.key` : avec Maj enfoncée `key` vaut "X", et il
    // change complètement sur un clavier non latin. `code` désigne la touche
    // PHYSIQUE, qui est ce qu'on veut pour un raccourci.
    if (e.code !== "KeyX" || !e.shiftKey || !(e.metaKey || e.ctrlKey)) return;
    e.preventDefault(); e.stopPropagation();

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
    armed = now;
    const panel = document.getElementById("construction");
    if (panel) {
      panel.classList.add("armed");
      setTimeout(() => {
        if (Date.now() - armed >= WINDOW_MS - 50) { armed = 0; panel.classList.remove("armed"); }
      }, WINDOW_MS);
    }
  }

  return { init, unlocked };
})();


(function () {
  const $ = (id) => document.getElementById(id);
  const DT = 1 / CFG.SIM_HZ;

  let canvas, ctx, off, offCtx, img, fb;
  let state = "gate";            // gate | title | cine | walk | pause | end
  let acc = 0, last = 0;
  let best = 0;
  const input = { left: false, right: false };

  /* ── PRÉSENTATION ────────────────────────────────────────────────────────
     ⚠️ L'AGRANDISSEMENT EST UN ENTIER, TOUJOURS. `imageSmoothingEnabled` à
     false ne suffit pas : à l'échelle 3,4 le plus proche voisin duplique
     certaines colonnes et pas d'autres, et on obtient des pixels de largeurs
     différentes dans la MÊME image. C'est le défaut le plus visible du faux
     pixel art, et il est invisible sur une capture d'écran redimensionnée —
     donc on ne le trouve jamais par accident. On arrondit à l'entier
     inférieur, et on accepte les bandes noires. */
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const vw = window.innerWidth, vh = window.innerHeight;
    const k = Math.max(1, Math.floor(Math.min(vw / CFG.W, vh / CFG.H)));
    canvas.width = CFG.W * k * dpr;
    canvas.height = CFG.H * k * dpr;
    canvas.style.width = (CFG.W * k) + "px";
    canvas.style.height = (CFG.H * k) + "px";
    ctx.imageSmoothingEnabled = false;
  }

  function present() {
    img.data.set(fb.d);
    offCtx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
  }

  /* ── ENTRÉES ────────────────────────────────────────────────────────────── */
  function keyDown(e) {
    if (e.code === "ArrowLeft" || e.code === "KeyA" || e.code === "KeyQ") input.left = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") input.right = true;

    if (e.code === "Escape") {
      if (state === "cine" || state === "walk") { state = "pause"; UI.show("pause"); }
      else if (state === "pause") { UI.hideAll(); state = Cine.mode === "play" ? "walk" : "cine"; }
      return;
    }
    if (state !== "cine") return;

    if (UI.choosing()) {
      const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 }[e.code];
      if (n !== undefined) { e.preventDefault(); UI.pickChoice(n); }
      return;
    }
    if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); tapAdvance(); }
  }
  function keyUp(e) {
    if (e.code === "ArrowLeft" || e.code === "KeyA" || e.code === "KeyQ") input.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") input.right = false;
  }

  /* Le double comportement : la frappe en cours se termine d'un clic, le clic
     suivant passe à la réplique d'après. Voir l'avertissement dans ui.js. */
  function tapAdvance() {
    if (state !== "cine") return;
    if (UI.choosing()) return;
    if (UI.typing()) { UI.finishType(); return; }
    Cine.advance();
  }

  /* ── LA BOUCLE ──────────────────────────────────────────────────────────── */
  function frame(now) {
    requestAnimationFrame(frame);
    if (!last) last = now;
    // ⚠️ plafond de 0,25 s : un onglet remis au premier plan après dix minutes
    // rejouerait sinon trente-six mille pas de simulation d'un coup.
    let dt = Math.min(0.25, (now - last) / 1000);
    last = now;

    /* ⚠️ TANT QUE LE MUR TIENT, ON NE REND PAS LE JEU DU TOUT.
       Le panneau de chantier est du DOM posé par-dessus le canvas : s'il est
       le moindrement translucide — et il l'était, pour la même raison que
       tous les autres panneaux du projet — le visiteur voit le tableau de la
       corniche s'animer derrière, avec l'aurore, les braseros et la neige.
       Un mur à travers lequel on voit le jeu ne cache rien ; il l'ANNONCE.

       ⚠️ ET CE N'EST PAS QU'UNE QUESTION D'OPACITÉ CSS. Même derrière un
       panneau parfaitement opaque, continuer de peindre 130 000 pixels et
       trois rubans d'aurore soixante fois par seconde pour ne rien montrer
       est un gâchis qui se voit sur la batterie d'un portable. On coupe donc
       à la source, et l'opacité du CSS devient une seconde ceinture. */
    if (state === "gate") { fb.fill(CFG.PAL.sky0); present(); return; }
    if (state === "pause") { present(); return; }
    acc += dt;
    let steps = 0;
    while (acc >= DT && steps < 8) { tick(DT); acc -= DT; steps++; }

    if (state === "walk") Walk.render(fb, Cine.clock);
    else Cine.render(fb);
    present();
  }

  function tick(dt) {
    if (state === "walk") {
      Cine.S.clock += dt;                      // le décor continue de vivre
      Walk.step(dt, input);
      UI.hudSet(Walk.S.shards, Walk.metres(), Walk.goal, best,
                Walk.S.chant, Walk.S.shards * 40 + Walk.metres());
      if (Walk.S.done) {
        UI.hud(false);
        state = "cine";
        Cine.resumeFromPlay();
      }
      return;
    }
    /* ⚠️ LE DÉCOR VIT AUSSI À L'ÉCRAN-TITRE ET À L'ÉCRAN DE FIN. Première
       version : `tick` ne mettait à jour que l'état "cine", donc le tableau
       de la corniche restait FIGÉ derrière le titre — aurore immobile,
       flammes éteintes, neige suspendue. Le panneau d'accueil montrait une
       capture d'écran. `Cine.update` est sans effet quand le récit n'est pas
       lancé (mode "idle" ou "done") : on peut donc l'appeler dans les trois
       états sans risque, et il fait avancer l'horloge, la caméra et le fondu. */
    if (state === "cine" || state === "title" || state === "end") {
      Cine.update(dt); UI.typeStep(dt);
    }
  }

  /* ── DÉMARRAGE ──────────────────────────────────────────────────────────── */
  function startChapter() {
    UI.hideAll();
    UI.clearChapter();
    Walk.reset();
    state = "cine";
    Cine.onPlay = function (id) {
      if (id !== "walk") { Cine.resumeFromPlay(); return; }
      Walk.reset();
      UI.hud(true);
      state = "walk";
    };
    Cine.onEnd = function () {
      UI.clearSay(); UI.clearChapter(); UI.hud(false);
      const f = Cine.flags, t = UI.T();
      const names = { flamme: t.fFlamme, harde: t.fHarde, cabane: t.fCabane,
                      approche: t.fApproche, confiance: t.fConfiance, marque: t.fMarque,
                      demande: t.fDemande, onze: t.fOnze, silence: t.fSilence };
      $("finalShards").textContent = Walk.S.shards;
      const ul = $("finalChoices"); ul.innerHTML = "";
      for (const k of Object.keys(f)) {
        if (!names[k]) continue;
        const li = document.createElement("li"); li.textContent = names[k]; ul.appendChild(li);
      }
      state = "end";
      UI.show("gameover");
      Bridge.chapter({ n: 1, shards: Walk.S.shards, flags: Object.keys(f) });
    };
    Cine.start(Story.CH1, UI.lang, {
      say: UI.say, clear: () => { UI.clearSay(); UI.clearChapter(); },
      choice: (q, o) => UI.choice(q, o, (i) => Cine.choose(i)),
      chapter: UI.chapter,
    });
  }

  function boot() {
    canvas = $("gl"); ctx = canvas.getContext("2d");
    off = document.createElement("canvas");
    off.width = CFG.W; off.height = CFG.H;
    offCtx = off.getContext("2d");
    img = offCtx.createImageData(CFG.W, CFG.H);
    fb = new Pix.Buffer(CFG.W, CFG.H);

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    canvas.addEventListener("pointerdown", tapAdvance);
    $("dialog").addEventListener("pointerdown", tapAdvance);

    $("btnStart").addEventListener("click", startChapter);
    $("btnResume").addEventListener("click", () => { UI.hideAll(); state = Cine.mode === "play" ? "walk" : "cine"; });
    $("btnQuit").addEventListener("click", () => { UI.clearSay(); UI.hud(false); UI.show("title"); state = "title"; });
    $("btnExit").addEventListener("click", () => Bridge.exit());
    $("btnBack").addEventListener("click", () => Bridge.exit());
    $("btnConstructionBack").addEventListener("click", () => Bridge.exit());

    Bridge.init(function () {
      UI.applyLang(Bridge.lang);
      if (Bridge.externalBest !== null) best = Bridge.externalBest;
    });
    UI.applyLang(Bridge.lang);

    /* ⚠️ LE DÉCOR N'EST MONTÉ QU'ICI, ET `openTitle` N'EST APPELÉE QUE DERRIÈRE
       LE MUR. C'est ce qui garantit qu'un visiteur ne peut pas apercevoir la
       vallée : elle n'existe pas tant que le code n'a pas été frappé.

       L'image de fond de l'écran-titre est le tableau de la corniche, animé,
       caméra qui glisse sur quatre-vingt-dix secondes. Un écran-titre sur fond
       noir gâche la seule chose qu'on ait à vendre. */
    function openTitle() {
      state = "title";
      Cine.S.scene = Scenes.get("corniche");
      Cine.S.cam.x = 0; Cine.S.cam.from = 0; Cine.S.cam.to = 140;
      Cine.S.cam.ms = 90000; Cine.S.cam.el = 0;
      Cine.S.fade = 1; Cine.S.fadeDir = -1; Cine.S.fadeMs = 2200; Cine.S.fadeEl = 0;
      UI.show("title");
    }

    /* ⚠️ UN SEUL ENDROIT DÉCIDE, ET CE N'EST PAS ICI : voir CFG.GATE_ON. */
    if (!CFG.GATE_ON) { openTitle(); }
    else {
      CryGate.init(openTitle);
      if (CryGate.unlocked()) openTitle();
      else { state = "gate"; UI.show("construction"); }
    }

    requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
