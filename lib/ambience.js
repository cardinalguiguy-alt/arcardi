"use client";

/* ==========================================================================
   AMBIANCE SONORE DU SITE — thème flûte + interlude "voix d'oiseaux", en
   boucle continue sur les écrans de menu/navigation (accueil, connexion,
   lounge, lobby de salon). Coupée en fondu délicat dès qu'une partie
   démarre, reprise en douceur (jamais redémarrée depuis le début) au retour
   au lobby. Seule une actualisation COMPLÈTE de la page relance le cycle
   depuis le tout début : le layout racine qui héberge ce module ne se
   remonte jamais lors d'une navigation interne Next.js (changement de page
   via les liens du site), seul un rechargement dur (F5, lien externe,
   fermeture d'onglet) réinitialise ce fichier.

   Cycle : flûte (piste complète) -> silence de quelques secondes ->
   interlude oiseaux (1 min, fondu d'entrée/sortie déjà intégré au fichier
   audio lui-même) -> retour à la flûte -> boucle indéfiniment.

   Autres thèmes à venir (le porteur de projet a d'autres pistes) : il
   suffira d'allonger TRACKS et la petite logique de cycle ci-dessous —
   aucune autre partie du site n'a besoin d'être touchée. Les thèmes par
   jeu (à l'étude) viendront s'ajouter par-dessus, pas remplacer, ce module.
   ========================================================================== */

const FLUTE_SRC = "/sounds/site-theme-flute.mp3";
const BIRDS_SRC = "/sounds/site-theme-birds.mp3"; // déjà découpé à 1 min, fondus intégrés

const GAP_AFTER_FLUTE_MS = 4000; // silence avant l'interlude oiseaux
const TARGET_VOLUME = 0.34;      // "claire et nette" mais jamais forte
const DUCK_FADE_MS = 900;        // sortie délicate quand on lance une partie
const RESUME_FADE_MS = 1300;     // reprise en douceur au retour au lobby

let flute = null, birds = null;
let current = null;      // l'élément <audio> actuellement au premier plan
let sequenceTimer = null;
let fadeRAF = null;
let started = false;
let ducked = false;      // true pendant une partie : silence voulu

function fadeTo(el, target, ms, onDone) {
  if (!el) { if (onDone) onDone(); return; }
  cancelAnimationFrame(fadeRAF);
  const start = el.volume;
  const t0 = performance.now();
  function step(now) {
    const p = Math.min(1, (now - t0) / ms);
    el.volume = start + (target - start) * p;
    if (p < 1) fadeRAF = requestAnimationFrame(step);
    else if (onDone) onDone();
  }
  fadeRAF = requestAnimationFrame(step);
}

// Contourne poliment les politiques d'autoplay des navigateurs : si la
// lecture est refusée faute d'interaction préalable, on retente au premier
// clic/appui/touche n'importe où sur la page — silencieux sinon.
function tryPlay(el) {
  if (!el) return;
  const p = el.play();
  if (p && typeof p.catch === "function") {
    p.catch(() => {
      const retry = () => { if (!ducked) el.play().catch(() => {}); };
      document.addEventListener("pointerdown", retry, { once: true });
      document.addEventListener("keydown", retry, { once: true });
    });
  }
}

function playFlute() {
  current = flute;
  flute.currentTime = 0;
  flute.volume = ducked ? 0 : TARGET_VOLUME;
  tryPlay(flute);
}

function playBirdsAfterGap() {
  clearTimeout(sequenceTimer);
  sequenceTimer = setTimeout(() => {
    if (ducked) return; // une partie a démarré pendant le silence : rien à relancer
    current = birds;
    birds.currentTime = 0;
    birds.volume = TARGET_VOLUME; // les fondus d'entrée/sortie sont déjà dans le fichier
    tryPlay(birds);
  }, GAP_AFTER_FLUTE_MS);
}

export function initAmbience() {
  if (started || typeof window === "undefined") return;
  started = true;

  flute = new Audio(FLUTE_SRC);
  birds = new Audio(BIRDS_SRC);
  flute.preload = "auto";
  birds.preload = "auto";
  flute.volume = 0;
  birds.volume = 0;

  flute.addEventListener("ended", playBirdsAfterGap);
  birds.addEventListener("ended", () => { if (!ducked) playFlute(); });

  playFlute();
}

// Lancement d'une partie : fondu délicat vers le silence. La piste en cours
// est mise EN PAUSE, pas arrêtée — elle reprendra pile où elle en était.
export function duckAmbienceForGame() {
  if (!started || ducked) return;
  ducked = true;
  clearTimeout(sequenceTimer);
  const el = current;
  fadeTo(el, 0, DUCK_FADE_MS, () => { if (el) el.pause(); });
}

// Retour au lobby/menu : reprise en douceur là où la piste avait été mise
// en pause. Filet de sécurité si la piste était déjà terminée pendant le
// ducking (partie qui a duré plus d'une minute pile pendant l'interlude) :
// on relance proprement le cycle depuis la flûte plutôt que de rester muet.
export function resumeAmbienceForNav() {
  if (!started || !ducked) return;
  ducked = false;
  const el = current;
  if (!el || el.ended) { playFlute(); return; }
  tryPlay(el);
  fadeTo(el, TARGET_VOLUME, RESUME_FADE_MS);
}
