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
  let invertY = false, sens = 1;
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

      intent.turnDelta = mdx * sens;
      intent.pitchDelta = (invertY ? -mdy : mdy) * sens;
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
