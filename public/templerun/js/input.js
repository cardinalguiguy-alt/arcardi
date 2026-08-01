/* =============================================================================
   input.js — Clavier + tactile.
   -----------------------------------------------------------------------------
   Le reste du jeu ne lit JAMAIS un événement clavier. Il consomme des ACTIONS
   ("left", "right", "jump", "slide") via Input.consume(name).

   Deux idées importantes pour que les commandes soient justes :

   1. Tampon d'entrée (INPUT_BUFFER_MS) — une action pressée un poil trop tôt
      reste valable quelques dizaines de ms. Sans ça, un saut demandé pendant
      la dernière frame d'un atterrissage est perdu, et le joueur a raison de
      trouver ça injuste.
   2. consume() efface l'action. Une pression = un effet, jamais deux.
   ========================================================================== */

const Input = (function () {
  const buffer = {};        // action -> timestamp de la pression
  const held = {};          // touche physique maintenue (pour les virages)
  let touchStart = null;
  let onPause = null;

  const KEYMAP = {
    ArrowLeft: "left", KeyA: "left", KeyQ: "left",   // KeyQ : clavier AZERTY
    ArrowRight: "right", KeyD: "right",
    ArrowUp: "jump", KeyW: "jump", KeyZ: "jump", Space: "jump",
    ArrowDown: "slide", KeyS: "slide",
  };

  function press(action) { buffer[action] = performance.now(); }

  function onKeyDown(e) {
    if (e.code === "Escape") { if (onPause) onPause(); return; }
    const a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault();
    if (!held[e.code]) press(a);
    held[e.code] = true;
  }
  function onKeyUp(e) { delete held[e.code]; }

  /* Tactile : glissement dans les 4 directions. Utile pour tester au trackpad
     et gratuit à écrire — la version finale visera sans doute le mobile. */
  function onTouchStart(e) {
    const t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY, at: performance.now() };
  }
  function onTouchEnd(e) {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) press(dx > 0 ? "right" : "left");
    else press(dy > 0 ? "slide" : "jump");
  }

  return {
    init(pauseCallback) {
      onPause = pauseCallback;
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      window.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchend", onTouchEnd, { passive: true });
      window.addEventListener("blur", () => { for (const k in held) delete held[k]; });
    },

    /* Renvoie true UNE fois si l'action a été demandée récemment, et l'efface. */
    consume(action) {
      const t = buffer[action];
      if (t === undefined) return false;
      if (performance.now() - t > CFG.INPUT_BUFFER_MS) { delete buffer[action]; return false; }
      delete buffer[action];
      return true;
    },

    /* Regarde sans consommer — sert à la fenêtre de virage, qui teste
       l'entrée sur plusieurs frames avant de décider. */
    peek(action) {
      const t = buffer[action];
      return t !== undefined && performance.now() - t <= CFG.INPUT_BUFFER_MS;
    },

    clear() { for (const k in buffer) delete buffer[k]; },
  };
})();
