"use client";

/* ==========================================================================
   AMBIANCE SONORE DU SITE — rotation entre plusieurs thèmes, en boucle
   continue sur les écrans de menu/navigation (accueil, connexion, lounge,
   lobby de salon). Coupée en fondu délicat dès qu'une partie démarre,
   reprise en douceur (jamais redémarrée depuis le début) au retour au
   lobby. Seule une actualisation COMPLÈTE de la page relance le cycle
   depuis le tout début : le layout racine qui héberge ce module ne se
   remonte jamais lors d'une navigation interne Next.js (changement de page
   via les liens du site), seul un rechargement dur (F5, lien externe,
   fermeture d'onglet) réinitialise ce fichier.

   Cycle : piste 1 (flûte) -> silence de quelques secondes -> piste 2
   (oiseaux, fondus d'entrée/sortie déjà intégrés au fichier lui-même,
   SEULE piste concernée par ces fondus) -> silence -> piste 3 (orchestral)
   -> silence -> retour à la piste 1 -> boucle indéfiniment.

   Pour ajouter un futur thème (le porteur de projet a d'autres pistes) :
   il suffit d'allonger TRACKS ci-dessous, rien d'autre à toucher. Les
   thèmes par jeu (à l'étude) viendront s'ajouter par-dessus, pas remplacer,
   ce module.
   ========================================================================== */

const TRACKS = [
  { src: "/sounds/site-theme-flute.mp3" },      // musique orchestrale légère
  { src: "/sounds/site-theme-birds.mp3" },      // sons de forêt — fondus intégrés au fichier
  { src: "/sounds/site-theme-orchestral.mp3" }, // second thème orchestral
];

const GAP_BETWEEN_TRACKS_MS = 4000; // silence entre chaque piste du cycle
const TARGET_VOLUME = 0.34;         // "claire et nette" mais jamais forte
const DUCK_FADE_MS = 900;           // sortie délicate quand on lance une partie
const RESUME_FADE_MS = 1300;        // reprise en douceur au retour au lobby

let audios = [];      // <audio> dans le même ordre que TRACKS
let trackIndex = 0;
let current = null;   // l'élément <audio> actuellement au premier plan
let sequenceTimer = null;
let fadeRAF = null;
let started = false;
let ducked = false;   // true pendant une partie : silence voulu

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

function playTrackAt(i) {
  trackIndex = i;
  current = audios[i];
  if (!current) return;
  current.currentTime = 0;
  current.volume = ducked ? 0 : TARGET_VOLUME;
  tryPlay(current);
}

function scheduleNextAfterGap() {
  clearTimeout(sequenceTimer);
  sequenceTimer = setTimeout(() => {
    if (ducked) return; // une partie a démarré pendant le silence : rien à relancer
    playTrackAt((trackIndex + 1) % audios.length);
  }, GAP_BETWEEN_TRACKS_MS);
}

export function initAmbience() {
  if (started || typeof window === "undefined") return;
  started = true;

  audios = TRACKS.map(({ src }) => {
    const el = new Audio(src);
    el.preload = "auto";
    el.volume = 0;
    el.addEventListener("ended", scheduleNextAfterGap);
    return el;
  });

  playTrackAt(0);
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
// ducking (partie qui a duré plus longtemps que le temps restant sur la
// piste) : on relance proprement le cycle depuis la première piste plutôt
// que de rester muet.
export function resumeAmbienceForNav() {
  if (!started || !ducked) return;
  ducked = false;
  const el = current;
  if (!el || el.ended) { playTrackAt(0); return; }
  tryPlay(el);
  fadeTo(el, TARGET_VOLUME, RESUME_FADE_MS);
}

// Passer à la piste suivante tout de suite (bouton discret / raccourci
// clavier). Sans effet pendant une partie (ducked) : rien n'est audible,
// il n'y a rien à "sauter". Fondu de sortie très bref sur la piste en
// cours, puis démarrage immédiat de la suivante — pas d'attente du silence
// habituel entre deux pistes, l'action est volontaire.
export function skipAmbienceTrack() {
  if (!started || ducked) return;
  clearTimeout(sequenceTimer);
  const el = current;
  const next = (trackIndex + 1) % audios.length;
  fadeTo(el, 0, 250, () => {
    if (el) el.pause();
    playTrackAt(next);
  });
}
