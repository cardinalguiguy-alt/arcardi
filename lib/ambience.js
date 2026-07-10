"use client";
import { isMusicEnabled, setMusicEnabled } from "./sfx";

/* ==========================================================================
   AMBIANCE SONORE DU SITE — rotation entre plusieurs thèmes, en boucle
   continue partout sur le site, y compris PENDANT une partie. Il n'y a plus
   de coupure au lancement d'un jeu : la musique continue de tourner en
   fond, simplement à un volume réduit (GAME_VOLUME) pour ne pas distraire
   les joueurs, puis remonte à son volume normal (TARGET_VOLUME) au retour
   au lobby. Seule une actualisation COMPLÈTE de la page relance le cycle
   depuis le tout début : le layout racine qui héberge ce module ne se
   remonte jamais lors d'une navigation interne Next.js (changement de page
   via les liens du site), seul un rechargement dur (F5, lien externe,
   fermeture d'onglet) réinitialise ce fichier.

   Cycle : chaque morceau musical est TOUJOURS précédé ET suivi d'une pause
   "sons de forêt" (fondus d'entrée/sortie déjà intégrés à ce fichier-là,
   seul fichier concerné par des fondus AU NIVEAU DU FICHIER). La playlist
   réellement jouée (PLAYLIST plus bas) est calculée UNE FOIS à partir de
   MUSIC_TRACKS : pour ajouter un futur morceau, il suffit d'allonger
   MUSIC_TRACKS, la pause forêt s'intercale automatiquement avant lui, rien
   d'autre à toucher. Un silence de quelques secondes
   (GAP_BETWEEN_TRACKS_MS) sépare chaque étape de cette liste, forêt
   comprise.

   Morceaux sans fondu intégré au fichier (tout sauf la forêt) : fondu
   d'entrée ET de sortie de 3s géré ICI en JS (fadeInMs/fadeOutMs).

   Menu Paramètres (ajout) : chaque morceau de MUSIC_TRACKS porte maintenant
   un `label` court ("Piste 1", "Piste 2"…) affiché dans une liste cliquable
   — voir getMusicTrackList()/playTrackByIndex()/getCurrentMusicIndex() plus
   bas. Le on/off musique du menu Paramètres est piloté par
   setAmbienceMuted(), qui persiste la préférence via isMusicEnabled()/
   setMusicEnabled() (lib/sfx.js) — même clé localStorage que prévu de
   longue date pour l'onglet Réglages, aucune nouvelle clé introduite.
   Un petit système d'abonnement (subscribeAmbience) permet à l'UI React de
   savoir en direct quelle piste joue et si le son est coupé, y compris
   quand la rotation avance toute seule pendant que le menu est ouvert.
   ========================================================================== */

const FOREST_PAUSE = { src: "/sounds/site-theme-birds.mp3" }; // fondus intégrés au fichier lui-même

// Morceaux musicaux du site, dans leur ordre de rotation — la pause forêt
// s'intercale AUTOMATIQUEMENT avant chacun (voir PLAYLIST plus bas), donc
// chaque morceau se retrouve précédé ET suivi de sons de forêt une fois la
// boucle refermée. `label` = ce qui s'affiche dans la liste des pistes du
// menu Paramètres (numéro + repère bref, pas besoin de traduction FR/EN).
const MUSIC_TRACKS = [
  { src: "/sounds/site-theme-flute.mp3", label: "Piste 1 · Flûte" },
  { src: "/sounds/site-theme-scarlatti.mp3", fadeInMs: 3000, fadeOutMs: 3000, label: "Piste 2 · Scarlatti" },
  { src: "/sounds/site-theme-cho-prelude.mp3", fadeInMs: 3000, fadeOutMs: 3000, label: "Piste 3 · Seong-Jin Cho" },
  { src: "/sounds/site-theme-bach-goldberg-var18.mp3", fadeInMs: 3000, fadeOutMs: 3000, label: "Piste 4 · Bach" },
  { src: "/sounds/site-theme-vivaldi-alla-rustica.mp3", fadeInMs: 3000, fadeOutMs: 3000, label: "Piste 5 · Vivaldi" },
  { src: "/sounds/site-theme-scarlatti-kk455.mp3", fadeInMs: 3000, fadeOutMs: 3000, label: "Piste 6 · Scarlatti" },
  { src: "/sounds/site-theme-schubert-d960-scherzo-trio.mp3", fadeInMs: 3000, fadeOutMs: 3000, label: "Piste 7 · Schubert" },
  { src: "/sounds/site-theme-biber-imitatione-liuto.mp3", fadeInMs: 3000, fadeOutMs: 3000, label: "Piste 8 · Biber" },
  { src: "/sounds/site-theme-westhoff-partita5-gigue.mp3", fadeInMs: 3000, fadeOutMs: 3000, label: "Piste 9 · Westhoff" },
  { src: "/sounds/site-theme-biber-harmonia-partia5-gigue.mp3", fadeInMs: 3000, fadeOutMs: 3000, label: "Piste 10 · Biber" },
];

// forêt, morceau, forêt, morceau, forêt, morceau… -> boucle.
const PLAYLIST = MUSIC_TRACKS.flatMap(track => [FOREST_PAUSE, track]);

const GAP_BETWEEN_TRACKS_MS = 4000; // silence entre chaque étape du cycle (forêt comprise)
const TARGET_VOLUME = 0.34;         // "claire et nette" mais jamais forte, hors partie
const GAME_VOLUME = 0.09;           // pendant une partie : présente mais très en retrait
const DUCK_FADE_MS = 900;           // transition douce vers le volume "partie"
const RESUME_FADE_MS = 1300;        // transition douce vers le volume normal au retour au lobby
const MUTE_FADE_MS = 400;           // transition douce coupure/rétablissement depuis le menu Paramètres

let audios = [];      // <audio> dans le même ordre que PLAYLIST
let trackIndex = 0;
let current = null;   // l'élément <audio> actuellement au premier plan
let sequenceTimer = null;
let fadeRAF = null;
let started = false;
let ducked = false;   // true pendant une partie : volume réduit, jamais coupé
let muted = false;    // true si l'utilisateur a coupé la musique depuis Paramètres

let listeners = [];   // callbacks abonnés à l'état (piste en cours, muted) — voir subscribeAmbience()

function activeVolume() {
  if (muted) return 0;
  return ducked ? GAME_VOLUME : TARGET_VOLUME;
}

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
      const retry = () => { el.play().catch(() => {}); };
      document.addEventListener("pointerdown", retry, { once: true });
      document.addEventListener("keydown", retry, { once: true });
    });
  }
}

// Index dans MUSIC_TRACKS de la piste musicale actuellement au premier plan,
// ou -1 si c'est une pause forêt qui joue (PLAYLIST alterne forêt/morceau,
// les morceaux sont toujours aux index IMPAIRS — voir PLAYLIST plus haut).
function currentMusicIndexFromTrackIndex() {
  return trackIndex % 2 === 1 ? (trackIndex - 1) / 2 : -1;
}

function notify() {
  const snapshot = { musicIndex: currentMusicIndexFromTrackIndex(), muted };
  listeners.forEach(fn => { try { fn(snapshot); } catch (e) {} });
}

function playTrackAt(i) {
  trackIndex = i;
  current = audios[i];
  if (!current) return;
  const cfg = PLAYLIST[i] || {};
  current.currentTime = 0;
  current._fadingOut = false;
  const vol = activeVolume();
  if (cfg.fadeInMs) {
    // Fondu d'entrée géré ici (fichier source sans fondu intégré) : on
    // démarre à volume 0 puis on remonte doucement vers le volume courant
    // (normal ou réduit si une partie est en cours, ou 0 si coupé).
    current.volume = 0;
    tryPlay(current);
    fadeTo(current, vol, cfg.fadeInMs);
  } else {
    current.volume = vol;
    tryPlay(current);
  }
  notify();
}

function scheduleNextAfterGap() {
  clearTimeout(sequenceTimer);
  sequenceTimer = setTimeout(() => {
    // La rotation continue même pendant une partie (juste plus discrète) et
    // même coupée (juste inaudible) : il n'y a plus de raison de
    // l'interrompre quand `ducked`/`muted` sont vrais.
    playTrackAt((trackIndex + 1) % audios.length);
  }, GAP_BETWEEN_TRACKS_MS);
}

export function initAmbience() {
  if (started || typeof window === "undefined") return;
  started = true;
  muted = !isMusicEnabled();

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
        if (el._fadingOut || current !== el || !isFinite(el.duration)) return;
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

// Lancement d'une partie : la musique n'est PLUS coupée, elle continue de
// tourner en fond (rotation comprise) mais à un volume très réduit
// (GAME_VOLUME) pour ne pas distraire les joueurs.
export function duckAmbienceForGame() {
  if (!started || ducked) return;
  ducked = true;
  if (!muted) fadeTo(current, GAME_VOLUME, DUCK_FADE_MS);
}

// Retour au lobby/menu : remontée douce au volume normal. La musique
// n'ayant jamais été mise en pause, il n'y a rien à relancer.
export function resumeAmbienceForNav() {
  if (!started || !ducked) return;
  ducked = false;
  if (!muted) fadeTo(current, TARGET_VOLUME, RESUME_FADE_MS);
}

// Passer à la piste suivante tout de suite (bouton discret / raccourci
// clavier), y compris pendant une partie (au volume réduit). Fondu de
// sortie très bref sur la piste en cours, puis démarrage immédiat de la
// suivante — pas d'attente du silence habituel entre deux pistes, l'action
// est volontaire.
export function skipAmbienceTrack() {
  if (!started) return;
  clearTimeout(sequenceTimer);
  const el = current;
  const next = (trackIndex + 1) % audios.length;
  fadeTo(el, 0, 250, () => {
    if (el) el.pause();
    playTrackAt(next);
  });
}

// ----- Menu Paramètres : liste des pistes, sélection directe, coupure ----

// Liste affichable dans le menu Paramètres — juste l'index (dans
// MUSIC_TRACKS, à passer à playTrackByIndex) et le label court.
export function getMusicTrackList() {
  return MUSIC_TRACKS.map((track, i) => ({ index: i, label: track.label || ("Piste " + (i + 1)) }));
}

// Index de la piste MUSICALE en cours (pas la pause forêt), -1 si aucune
// (forêt en cours, ou ambiance pas encore démarrée) — sert à surligner la
// ligne "en cours de lecture" dans la liste du menu Paramètres.
export function getCurrentMusicIndex() {
  return started ? currentMusicIndexFromTrackIndex() : -1;
}

export function isAmbienceMutedNow() {
  return muted;
}

// Coupe/rétablit la musique depuis le menu Paramètres — persiste la
// préférence (même clé localStorage que isMusicEnabled/setMusicEnabled,
// prévue de longue date pour cet usage). Ne touche PAS à la rotation ni aux
// timers : seul le volume audible change, tout continue de tourner en
// coulisses pour que la reprise soit instantanée.
export function setAmbienceMuted(nextMuted) {
  const v = !!nextMuted;
  if (v === muted) return;
  muted = v;
  setMusicEnabled(!muted);
  if (started) fadeTo(current, activeVolume(), MUTE_FADE_MS);
  notify();
}

// Lance directement une piste choisie dans la liste du menu Paramètres
// ("relancer la piste qu'on apprécie") — si la musique était coupée, la
// sélection d'une piste vaut intention claire d'écouter : on rétablit le
// son automatiquement plutôt que de laisser un clic sans effet audible.
export function playTrackByIndex(musicIndex) {
  if (!started || !audios.length) return;
  if (musicIndex < 0 || musicIndex >= MUSIC_TRACKS.length) return;
  if (muted) { muted = false; setMusicEnabled(true); }
  clearTimeout(sequenceTimer);
  const playlistIdx = musicIndex * 2 + 1;
  if (playlistIdx === trackIndex) { notify(); return; } // déjà la piste en cours
  const el = current;
  fadeTo(el, 0, 250, () => {
    if (el) el.pause();
    playTrackAt(playlistIdx);
  });
}

// Abonnement à l'état de l'ambiance (piste en cours + muted) pour l'UI
// React (menu Paramètres) — appelle `fn` à chaque changement (sélection
// manuelle, avance automatique de la rotation, coupure/rétablissement).
// Renvoie une fonction de désabonnement.
export function subscribeAmbience(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}
