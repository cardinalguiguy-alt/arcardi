/* =============================================================================
   input.js — clavier et tactile → INTENTIONS. Rien d'autre.
   -----------------------------------------------------------------------------
   Il ne rend jamais un état de touche : il rend l'objet `intent` que
   Rules.step() attend. C'est ce qui permet au joueur oracle des outils de
   fabriquer les mêmes intentions sans clavier, donc de jouer le VRAI jeu.

   ⚠️ AZERTY ET QWERTY. On teste `e.code` (position physique) et non `e.key`
   (lettre produite) — c'est la règle posée au zip 392 pour le menu
   développeur, et elle vaut ici pour ZQSD/WASD : KeyW est la même touche
   physique sur les deux dispositions, ce qui fait que Z d'un AZERTY et W d'un
   QWERTY tombent au même endroit sous le doigt.

   LES COMMANDES (demande de Guillaume : « avancer avec les flèches ») :
     ↑ / W        avancer            ← → / A D   TOURNER
     ↓ / S        reculer            Q E         pas de côté
     Maj          courir (bruyant, brûle la torche deux fois plus vite)
     Espace       coup d'épée        F           raviver la torche au brasier
     Échap        pause

   LE TACTILE arrive par la même porte : deux zones (moitié gauche = direction
   au pouce, moitié droite = actions). Ce n'est PAS le joystick réclamé depuis
   le zip 387 pour la ferme — celui-ci ne sert que le labyrinthe et ne touche
   pas FermeGame.js. Voir le README : la dette du joystick reste entière.
   ========================================================================== */

const Input = (function () {
  const down = Object.create(null);
  let attackEdge = false, useEdge = false, pauseEdge = false;
  let touch = null;

  function isDown(...codes) { for (const c of codes) if (down[c]) return true; return false; }

  function onKey(e, v) {
    /* Un modificateur enfoncé ne déclenche RIEN. C'est le défaut (a) découvert
       au zip 392 côté ferme : sans ce test, Cmd+R faisait agir le jeu avant de
       recharger, et surtout le keyup d'une lettre n'est pas délivré sous macOS
       tant que Cmd reste enfoncé — la touche restait à `true` et le
       personnage marchait tout seul. */
    if (e.metaKey || e.ctrlKey || e.altKey) { for (const k in down) down[k] = false; return; }
    if (v && !down[e.code]) {
      if (e.code === "Space") attackEdge = true;
      if (e.code === "KeyF") useEdge = true;
      if (e.code === "Escape") pauseEdge = true;
    }
    down[e.code] = v;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  }

  return {
    init() {
      window.addEventListener("keydown", (e) => onKey(e, true));
      window.addEventListener("keyup", (e) => onKey(e, false));
      window.addEventListener("blur", () => { for (const k in down) down[k] = false; });
      const c = document.getElementById("gl");
      c.addEventListener("touchstart", (e) => { touch = e.touches[0]; }, { passive: true });
      c.addEventListener("touchmove", (e) => { touch = e.touches[0]; }, { passive: true });
      c.addEventListener("touchend", () => { touch = null; }, { passive: true });
    },
    // Vidé à la perte de focus ET à l'ouverture d'un écran : une touche
    // « collée » derrière une modale fait avancer le fermier tout seul, bug
    // vécu au zip 372 avec le défi de fuite.
    clear() { for (const k in down) down[k] = false; attackEdge = useEdge = pauseEdge = false; },
    read() {
      const intent = { fwd: 0, strafe: 0, turn: 0, run: false, attack: false, use: false };
      if (isDown("ArrowUp", "KeyW")) intent.fwd = 1;
      else if (isDown("ArrowDown", "KeyS")) intent.fwd = -1;
      if (isDown("ArrowLeft")) intent.turn = -1;
      else if (isDown("ArrowRight")) intent.turn = 1;
      if (isDown("KeyA", "KeyQ")) intent.strafe = -1;
      else if (isDown("KeyD", "KeyE")) intent.strafe = 1;
      intent.run = isDown("ShiftLeft", "ShiftRight");
      intent.attack = attackEdge; attackEdge = false;
      intent.use = useEdge; useEdge = false;
      if (touch) {
        const w = window.innerWidth, h = window.innerHeight;
        if (touch.clientX < w / 2) {
          intent.fwd = touch.clientY < h * 0.6 ? 1 : -1;
          const dx = (touch.clientX - w * 0.25) / (w * 0.25);
          intent.turn = Math.max(-1, Math.min(1, dx * 1.6));
        }
      }
      return intent;
    },
    takePause() { const p = pauseEdge; pauseEdge = false; return p; },
  };
})();
