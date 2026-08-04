/* =============================================================================
   input.js — clavier, SOURIS et tactile → INTENTIONS. Rien d'autre.
   -----------------------------------------------------------------------------
   Il ne rend jamais un état de touche : il rend l'objet `intent` que
   Rules.step() attend. C'est ce qui permet au joueur oracle des outils de
   fabriquer les mêmes intentions sans périphérique, donc de jouer le VRAI jeu.

   ⚠️ AZERTY ET QWERTY. On teste `e.code` (position physique) et non `e.key`
   (lettre produite) — règle posée au zip 392. KeyW est la même touche physique
   sur les deux dispositions : le Z d'un AZERTY et le W d'un QWERTY tombent au
   même endroit sous le doigt.

   ===========================================================================
   ZIP 397 — LA SOURIS, ET POURQUOI ELLE CHANGE LE JEU PLUS QUE LA CAMÉRA
   ---------------------------------------------------------------------------
   Guillaume demande une vue subjective « au niveau des first person shooters
   existants ». Le premier de tous les écarts avec ces jeux-là n'était pas le
   rendu : c'était que le regard tournait à VITESSE CONSTANTE, sur appui d'une
   flèche, avec une accélération et une décélération. On ne VISE pas comme ça,
   on ne se retourne pas comme ça, et surtout on ne cherche pas un couloir
   comme ça — c'est ce qui produisait « la caméra bouge trop, difficile à
   naviguer » au 396, et le 396 y avait répondu par un amortissement, c'est-à-
   dire en soignant le symptôme.

   Avec le pointeur capturé, la rotation devient un DÉPLACEMENT (rad par pixel)
   et non une vitesse. Elle s'arrête quand la main s'arrête. Il n'y a plus rien
   à amortir, plus de zone morte, plus de recalage sur les axes : ces trois
   réglages du 396 ne servent QUE le mode clavier, et ils y restent.

   LE PLAN DE TOUCHES DEVIENT CELUI DU GENRE :
     Z Q S D / W A S D   se déplacer (Q/D et A/D sont des PAS DE CÔTÉ)
     souris              regarder (lacet + tangage)
     clic gauche         frapper à l'épée
     clic droit / R      tirer un carreau d'arbalète
     Maj                 courir (bruyant, brûle la torche deux fois plus vite)
     E ou F              raviver la torche à un brasier, ramasser la carte
     M ou Tab            déplier le plan (si on l'a trouvé)
     Échap               pause (et rend le pointeur)
     ← →                 tourner AU CLAVIER, pour qui n'a pas de souris

   ⚠️ LA CAPTURE DU POINTEUR NE PEUT PAS ÊTRE DEMANDÉE N'IMPORTE QUAND. Les
   navigateurs l'exigent depuis un geste de l'utilisateur (clic), et la refusent
   pendant quelques secondes après une sortie par Échap — d'où `wantLock` et le
   « cliquez pour jouer » : on ne peut pas la reprendre tout seul, il faut
   qu'un clic la redemande. Un jeu qui suppose l'avoir obtenue laisse le joueur
   incapable de tourner sans lui dire pourquoi.
   ========================================================================== */

const Input = (function () {
  const down = Object.create(null);
  let attackEdge = false, useEdge = false, pauseEdge = false, mapEdge = false, shootEdge = false;
  let touch = null;
  /* Le cumul de souris DEPUIS LE DERNIER read(). On accumule dans
     l'évènement et on vide à la lecture : la simulation tourne à 30 Hz et la
     souris peut envoyer 500 évènements par seconde. Prendre « le dernier
     mouvement » perdrait 94 % du geste, et la visée serait molle. */
  let mdx = 0, mdy = 0;
  let locked = false, wantLock = false;
  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️⚠️ LE DÉFAUT LE PLUS GROS DU LABYRINTHE, ET IL A SURVÉCU À VINGT ZIPS :
     `sens` VALAIT 1, DONC UN PIXEL DE SOURIS VALAIT UN RADIAN.
     ──────────────────────────────────────────────────────────────────────────
     Guillaume, au 416 : « le contrôle de la souris est trop sensible :
     incontrôlable sur pavé tactile, c'est n'importe quoi ». Ce n'était pas un
     problème de réglage — c'était une conversion d'unité MANQUANTE.

     `CFG.MOUSE_SENS = 0.0022` (« rad par pixel de souris ») existait depuis le
     zip 397. Elle était documentée dans le README. Elle était même VÉRIFIÉE par
     tools/verify-controls.mjs. Elle n'était simplement JAMAIS LUE : `sens`
     était initialisé à 1 et `setSens()` n'a jamais été appelé par personne. Le
     moindre frémissement du doigt faisait donc pivoter le joueur de plusieurs
     dizaines de degrés — 57° par pixel, très exactement.

     ⚠️⚠️ POURQUOI AUCUN CONTRÔLE NE L'A VU, ET C'EST LA VRAIE LEÇON.
     `verify-controls.mjs` teste que `rules.js` fait bien `st.ang -= turnDelta`,
     et il le teste bien : il lui passe `turnDelta = 200 × CFG.MOUSE_SENS` et
     vérifie l'angle obtenu. Autrement dit, IL SUPPOSE QUE L'ENTRÉE A DÉJÀ
     CONVERTI. Le moteur était juste, la constante était juste, le test était
     juste — et le raccord entre les deux n'existait pas.

     ⚠️ LA RÈGLE, ET ELLE VAUT POUR TOUT LE PROJET : UN TEST QUI FOURNIT
     LUI-MÊME SES ENTRÉES NE TESTE PAS LEUR PROVENANCE. C'est la même famille
     de faute que `Field.rewind` au 414 (mesuré en étant désactivé, parce que
     l'outil ne branchait pas le rappel) : deux modules corrects, une couture
     que personne ne regarde. Quand une constante existe, il faut vérifier
     qu'elle est LUE, pas seulement qu'elle est juste.
     ══════════════════════════════════════════════════════════════════════════ */
  let invertY = false, sens = CFG.MOUSE_SENS;
  let canvas = null;

  function isDown(...codes) { for (const c of codes) if (down[c]) return true; return false; }

  function onKey(e, v) {
    /* Un modificateur enfoncé ne déclenche RIEN — défaut (a) du zip 392 : sans
       ce test, Cmd+R faisait agir le jeu avant de recharger, et le keyup d'une
       lettre n'est pas délivré sous macOS tant que Cmd reste enfoncé, donc la
       touche restait à `true` et le fermier marchait tout seul. */
    if (e.metaKey || e.ctrlKey || e.altKey) { for (const k in down) down[k] = false; return; }
    if (v && !down[e.code]) {
      if (e.code === "Space") attackEdge = true;
      if (e.code === "KeyF" || e.code === "KeyE") useEdge = true;
      if (e.code === "KeyR") shootEdge = true;
      if (e.code === "KeyM" || e.code === "Tab") mapEdge = true;
      if (e.code === "Escape") pauseEdge = true;
    }
    down[e.code] = v;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Tab"].includes(e.code)) e.preventDefault();
  }

  function lockNow() {
    if (!canvas || locked) return;
    wantLock = true;
    const p = canvas.requestPointerLock && canvas.requestPointerLock();
    // Chrome rend une promesse depuis 2023, Safari non : on avale le refus,
    // il est normal (Échap vient d'être pressé) et il n'y a rien à en faire.
    if (p && p.catch) p.catch(() => {});
  }

  return {
    init() {
      window.addEventListener("keydown", (e) => onKey(e, true));
      window.addEventListener("keyup", (e) => onKey(e, false));
      window.addEventListener("blur", () => { for (const k in down) down[k] = false; });
      canvas = document.getElementById("gl");

      /* --- LA SOURIS. `movementX/Y` est le seul champ utilisable : `clientX`
         n'avance plus une fois le pointeur capturé (il n'y a plus de pointeur),
         et c'est le piège classique de cette API. */
      document.addEventListener("mousemove", (e) => {
        if (!locked) return;
        mdx += e.movementX || 0;
        mdy += e.movementY || 0;
      });
      document.addEventListener("pointerlockchange", () => {
        locked = document.pointerLockElement === canvas;
        if (!locked) { mdx = mdy = 0; for (const k in down) down[k] = false; }
      });
      document.addEventListener("pointerlockerror", () => { locked = false; });

      canvas.addEventListener("mousedown", (e) => {
        if (!locked) { lockNow(); return; }        // le premier clic capture, il n'agit pas
        if (e.button === 0) attackEdge = true;
        if (e.button === 2) shootEdge = true;
        e.preventDefault();
      });
      // Sans ça, le clic droit ouvre le menu du navigateur AU MILIEU d'un tir.
      canvas.addEventListener("contextmenu", (e) => e.preventDefault());

      /* --- TACTILE. Deux zones : moitié gauche = déplacement au pouce,
         moitié droite = REGARD (glisser pour tourner) et taper pour frapper.
         Ce n'est toujours PAS le joystick réclamé pour la ferme depuis le zip
         387 — celui-ci ne sert que le labyrinthe. La dette reste entière. */
      let lastT = null;
      canvas.addEventListener("touchstart", (e) => {
        for (const t of e.changedTouches) {
          if (t.clientX < window.innerWidth / 2) touch = t;
          else { lastT = { x: t.clientX, y: t.clientY, id: t.identifier, moved: 0 }; }
        }
      }, { passive: true });
      canvas.addEventListener("touchmove", (e) => {
        for (const t of e.changedTouches) {
          if (t.clientX < window.innerWidth / 2) { touch = t; continue; }
          if (!lastT || t.identifier !== lastT.id) continue;
          mdx += (t.clientX - lastT.x) * 1.7;      // le doigt est moins précis que la souris
          mdy += (t.clientY - lastT.y) * 1.7;
          lastT.moved += Math.abs(t.clientX - lastT.x) + Math.abs(t.clientY - lastT.y);
          lastT.x = t.clientX; lastT.y = t.clientY;
        }
      }, { passive: true });
      canvas.addEventListener("touchend", (e) => {
        for (const t of e.changedTouches) {
          if (lastT && t.identifier === lastT.id) {
            if (lastT.moved < 12) attackEdge = true;   // une tape courte = un coup
            lastT = null;
          } else touch = null;
        }
      }, { passive: true });
    },

    /* Appelé par game.js quand la partie démarre ou reprend. Le geste qui
       ouvre la partie EST le geste qui capture le pointeur : c'est la seule
       façon d'être sûr que le navigateur l'accorde. */
    grab() { lockNow(); },
    release() { if (document.exitPointerLock) document.exitPointerLock(); },
    get locked() { return locked; },
    setSens(v) { sens = v; },
    setInvert(v) { invertY = !!v; },

    clear() {
      for (const k in down) down[k] = false;
      attackEdge = useEdge = pauseEdge = mapEdge = shootEdge = false;
      mdx = mdy = 0;
      touch = null;
    },

    read() {
      const intent = {
        fwd: 0, strafe: 0, turn: 0, run: false, attack: false, use: false,
        /* ⚠️ `turnDelta` EST UN ANGLE, PAS UNE VITESSE, et c'est toute la
           différence avec `turn`. rules.js l'ajoute tel quel au cap, sans
           accélération ni amortissement : la main du joueur EST
           l'amortissement. Les deux coexistent — `turn` sert le clavier. */
        turnDelta: 0, pitchDelta: 0, shoot: false,
      };
      if (isDown("ArrowUp", "KeyW", "KeyZ")) intent.fwd = 1;
      else if (isDown("ArrowDown", "KeyS")) intent.fwd = -1;
      if (isDown("KeyA", "KeyQ")) intent.strafe = -1;
      else if (isDown("KeyD", "KeyE")) intent.strafe = 1;
      // Les flèches gauche/droite restent la rotation au clavier : c'est la
      // seule façon de jouer sans souris, et un joueur sur portable en a une.
      if (isDown("ArrowLeft")) intent.turn = -1;
      else if (isDown("ArrowRight")) intent.turn = 1;
      intent.run = isDown("ShiftLeft", "ShiftRight");
      intent.attack = attackEdge; attackEdge = false;
      intent.shoot = shootEdge; shootEdge = false;
      intent.use = useEdge; useEdge = false;

      /* ⚠️ E EST À LA FOIS « PAS DE CÔTÉ À DROITE » (AZERTY) ET « UTILISER ».
         Ce n'est pas un oubli : sur AZERTY le pas de côté droit est D, et E
         n'y sert qu'en QWERTY où il vaut « utiliser ». Le conflit est donc
         théorique sur les deux dispositions prises séparément — mais il est
         RÉEL si quelqu'un joue en QWERTY avec les doigts d'un AZERTY. On
         garde F comme second « utiliser », historique et sans ambiguïté. */

      /* ══════════════════════════════════════════════════════════════════
         LA COURBE DE PRÉCISION (416) — pour le PAVÉ TACTILE.
         ──────────────────────────────────────────────────────────────────
         Convertir les pixels en radians remet le regard dans l'ordre, mais ça
         ne suffit pas au pavé tactile, et il faut dire pourquoi : un pavé
         n'envoie pas un flot continu comme une souris, il envoie des SAUTS de
         plusieurs pixels séparés de blancs. Une conversion strictement
         linéaire transforme donc chaque saut en à-coup, et viser une porte à
         dix mètres devient un exercice de patience.

         ⚠️ ET CE N'EST PAS DE L'ACCÉLÉRATION DE SOURIS — C'EST L'INVERSE.
         L'accélération classique AUGMENTE le gain quand la main va vite ; ici
         on le RÉDUIT quand elle va lentement. La différence est capitale :
         l'accélération rend le geste imprévisible (le même déplacement ne
         donne pas le même angle selon la vitesse, donc on ne peut rien
         apprendre), alors qu'une zone de précision borne le gain PAR LE HAUT.
         Ici le gain ne dépasse JAMAIS `sens` : un grand balayage garde
         exactement le comportement d'avant, seul le petit geste s'affine.

         ⚠️ ET ON NE TOUCHE PAS À LA DIRECTION DE COURSE — demande explicite de
         Guillaume, « ne touche pas la direction de course qui est excellente ».
         Cette courbe ne s'applique qu'au REGARD (turnDelta/pitchDelta) ; le
         déplacement, le recalage sur le couloir et la rotation au clavier
         (`intent.turn`) ne sont pas modifiés d'une ligne. */
      const soften = (d) => {
        const a = Math.abs(d);
        if (a < 1e-6) return 0;
        const k = CFG.MOUSE_FINE + (1 - CFG.MOUSE_FINE) * Math.min(1, a / CFG.MOUSE_SOFT);
        return d * sens * k;
      };
      intent.turnDelta = soften(mdx);
      intent.pitchDelta = soften(invertY ? -mdy : mdy);
      mdx = mdy = 0;

      if (touch) {
        const w = window.innerWidth, h = window.innerHeight;
        if (touch.clientX < w / 2) {
          intent.fwd = touch.clientY < h * 0.6 ? 1 : -1;
          const dx = (touch.clientX - w * 0.25) / (w * 0.25);
          intent.strafe = Math.max(-1, Math.min(1, dx * 1.6));
        }
      }
      return intent;
    },

    takePause() { const p = pauseEdge; pauseEdge = false; return p; },
    takeMap() { const m = mapEdge; mapEdge = false; return m; },
  };
})();
