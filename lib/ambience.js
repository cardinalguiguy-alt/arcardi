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

   Cycle : chaque morceau musical est TOUJOURS précédé ET suivi d'une pause
   "sons de forêt" (fondus d'entrée/sortie déjà intégrés à ce fichier-là,
   seul fichier concerné par des fondus AU NIVEAU DU FICHIER). Avec les 3
   morceaux ci-dessous, la boucle réelle est donc :
     forêt -> flûte -> forêt -> Scarlatti -> forêt -> Cho (prélude) -> forêt
     -> (retour à flûte) -> boucle indéfiniment.
   Un silence de quelques secondes (GAP_BETWEEN_TRACKS_MS) sépare chaque
   étape de cette liste, forêt comprise. La playlist réellement jouée
   (PLAYLIST plus bas) est calculée UNE FOIS à partir de MUSIC_TRACKS : pour
   ajouter un futur morceau, il suffit d'allonger MUSIC_TRACKS, la pause
   forêt s'intercale automatiquement avant lui, rien d'autre à toucher.

   Morceaux sans fondu intégré au fichier (tout sauf la forêt) : fondu
   d'entrée ET de sortie de 3s géré ICI en JS (fadeInMs/fadeOutMs).
   ========================================================================== */

const FOREST_PAUSE = { src: "/sounds/site-theme-birds.mp3" }; // fondus intégrés au fichier lui-même

// Morceaux musicaux du site, dans leur ordre de rotation — la pause forêt
// s'intercale AUTOMATIQUEMENT avant chacun (voir PLAYLIST plus bas), donc
// chaque morceau se retrouve précédé ET suivi de sons de forêt une fois la
// boucle refermée.
const MUSIC_TRACKS = [
  { src: "/sounds/site-theme-flute.mp3" },      // musique orchestrale légère
  { src: "/sounds/site-theme-scarlatti.mp3", fadeInMs: 3000, fadeOutMs: 3000 }, // sonate Scarlatti
  { src: "/sounds/site-theme-cho-prelude.mp3", fadeInMs: 3000, fadeOutMs: 3000 }, // Seong-Jin Cho, prélude
];

// forêt, morceau, forêt, morceau, forêt, morceau… -> boucle.
const PLAYLIST = MUSIC_TRACKS.flatMap(track => [FOREST_PAUSE, track]);

const GAP_BETWEEN_TRACKS_MS = 4000; // silence entre chaque étape du cycle (forêt comprise)
const TARGET_VOLUME = 0.34;         // "claire et nette" mais jamais forte
const DUCK_FADE_MS = 900;           // sortie délicate quand on lance une partie
const RESUME_FADE_MS = 1300;        // reprise en douceur au retour au lobby

let audios = [];      // <audio> dans le même ordre que PLAYLIST
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
  const cfg = PLAYLIST[i] || {};
  current.currentTime = 0;
  current._fadingOut = false;
  if (ducked) {
    current.volume = 0;
    tryPlay(current);
  } else if (cfg.fadeInMs) {
    // Fondu d'entrée géré ici (fichier source sans fondu intégré) : on
    // démarre à volume 0 puis on remonte doucement vers TARGET_VOLUME.
    current.volume = 0;
    tryPlay(current);
    fadeTo(current, TARGET_VOLUME, cfg.fadeInMs);
  } else {
    current.volume = TARGET_VOLUME;
    tryPlay(current);
  }
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

  audios = PLAYLIST.map(({ src, fadeOutMs }) => {
    const el = new Audio(src);
    el.preload = "auto";
    el.volume = 0;
    el._fadingOut = false;
    el.addEventListener("ended", scheduleNextAfterGap);
    if (fadeOutMs) {
      // Fondu de sortie géré ici (fichier source sans fondu intégré) :
      // dès qu'il reste moins de fadeOutMs avant la fin naturelle du
      // fichier, on ramène doucement le volume à 0 pour arriver pile à
      // zéro à la toute fin — jamais de coupure sèche.
      el.addEventListener("timeupdate", () => {
        if (el._fadingOut || ducked || current !== el || !isFinite(el.duration)) return;
        const remainingMs = (el.duration - el.currentTime) * 1000;
        if (remainingMs <= fadeOutMs) {
          el._fadingOut = true;
          fadeTo(el, 0, Math.max(200, remainingMs));
        }
      });
    }
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
