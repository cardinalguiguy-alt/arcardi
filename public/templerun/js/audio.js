/* =============================================================================
   audio.js — Sons du endless run.
   -----------------------------------------------------------------------------
   Volontairement minimal, sur le modèle des autres petits modules du jeu :
   deux <audio> HTML, pas de Web Audio API, pas de mixeur. On ajoutera les
   sons au fur et à mesure ; pas besoin d'architecture plus lourde pour deux
   pistes.

   - OPENING  : jouée une seule fois, au lancement de la course (Game.start),
     donc à la toute première frame de la partie. Jamais rejouée ensuite.
   - FOOTSTEPS : boucle continue pendant la course. Coupée pendant le saut
     (joueur en l'air) et pendant la glissade, reprise dès que le joueur est
     de nouveau au sol et ne glisse plus. C'est Game qui pilote ce play/pause
     frame par frame, via setFootsteps(active) — Audio ne connaît rien de
     player.js, il ne fait qu'obéir.
   ========================================================================== */

const AudioFX = (function () {
  let opening = null;
  let footsteps = null;
  let footstepsActive = false; // état voulu par Game, indépendant du <audio>.paused

  function init() {
    opening = new window.Audio("sounds/opening.mp3");
    opening.preload = "auto";

    footsteps = new window.Audio("sounds/footsteps.mp3");
    footsteps.loop = true;
    footsteps.preload = "auto";
  }

  /* Jouée une fois, au tout début de la course. */
  function playOpening() {
    if (!opening) return;
    opening.currentTime = 0;
    opening.play().catch(() => {}); // autoplay peut être bloqué avant tout geste utilisateur ; on ignore
  }

  /* Démarre la boucle de pas depuis le début (nouvelle course). */
  function startFootsteps() {
    if (!footsteps) return;
    footsteps.currentTime = 0;
    footstepsActive = true;
    footsteps.play().catch(() => {});
  }

  /* Appelée à chaque frame par Game pendant STATE.RUNNING : active=true si le
     joueur est au sol et ne glisse pas, false pendant saut/glissade. Ne fait
     rien si l'état demandé est déjà l'état courant, pour ne pas relancer le
     fichier à chaque frame. */
  function setFootsteps(active) {
    if (!footsteps || footstepsActive === active) return;
    footstepsActive = active;
    if (active) footsteps.play().catch(() => {});
    else footsteps.pause();
  }

  /* Coupe tout : pause, fin de course, écran de fin, sortie offroad. */
  function stopFootsteps() {
    if (!footsteps) return;
    footstepsActive = false;
    footsteps.pause();
  }

  return { init, playOpening, startFootsteps, setFootsteps, stopFootsteps };
})();
