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

   Correctif (v47 → v48) : chargement PARESSEUX des pistes. Avant, les 20
   éléments <audio preload="auto"> de PLAYLIST (10 morceaux + 10 copies
   redondantes du même fichier forêt) étaient tous créés et lancés en
   téléchargement/décodage EN MÊME TEMPS au chargement de la page (~22 Mo
   d'un coup) — c'était la cause du ralentissement observé à l'ouverture du
   menu Paramètres juste après un chargement de page, et des échecs de
   lecture intermittents sur mobile (limite du nombre d'éléments <audio>
   simultanément chargés, notamment Safari iOS). Désormais : un seul élément
   partagé pour la pause forêt, et un élément par morceau créé seulement
   quand il devient nécessaire (piste en cours + préchargement de la
   suivante pendant que la piste en cours joue) — voir
   getForestAudio()/getTrackAudio()/audioForPlaylistIndex() plus bas.
   ========================================================================== */

const FOREST_PAUSE = { src: "/sounds/site-theme-birds.mp3" }; // fondus intégrés au fichier lui-même

// Morceaux musicaux du site, dans leur ordre de rotation — la pause forêt
// s'intercale AUTOMATIQUEMENT avant chacun (voir PLAYLIST plus bas), donc
// chaque morceau se retrouve précédé ET suivi de sons de forêt une fois la
// boucle refermée. `title`/`performer` = ce qui s'affiche (sur 2 lignes)
// dans la liste des pistes du menu Paramètres — référencement précis façon
// notice de programme (compositeur, œuvre, tonalité, interprète), toujours
// en anglais quelle que soit la langue du site (demande explicite, comme
// pour les titres d'œuvres classiques : pas de traduction FR/EN).
// `performer` peut être omis (ex. pistes 5/7/9/10, aucun interprète precisé).
// NB : les pistes 9 et 10 sont volontairement identiques (même œuvre, deux
// fichiers audio distincts) — demande explicite ("same as 9").
// NB2 (piège identifié en confirmant ce libellé) : les noms de FICHIER des
// pistes 8 et 9 semblent inversés par rapport au compositeur réel (le fichier
// "biber-imitatione-liuto.mp3" correspond en fait au Westhoff de la piste 8,
// et "westhoff-partita5-gigue.mp3" au Biber de la piste 9) — sans incidence
// sur la lecture (les `src` ne changent pas ici), mais à corriger un jour
// pour que les noms de fichiers eux-mêmes ne induisent plus en erreur.
const MUSIC_TRACKS = [
  { src: "/sounds/site-theme-flute.mp3", title: "ARCARDI Theme", performer: "Flute" },
  { src: "/sounds/site-theme-scarlatti.mp3", fadeInMs: 3000, fadeOutMs: 3000,
    title: "D. Scarlatti — Sonata K. 545 in B♭ Major", performer: "Trevor Pinnock" },
  { src: "/sounds/site-theme-cho-prelude.mp3", fadeInMs: 3000, fadeOutMs: 3000,
    title: "F. Chopin — Prélude Op. 28 No. 16 in B♭ Minor", performer: "Seong-Jin Cho" },
  { src: "/sounds/site-theme-bach-goldberg-var18.mp3", fadeInMs: 3000, fadeOutMs: 3000,
    title: "J.S. Bach — Goldberg Variations, Var. 18 “Canone alla Sesta”", performer: "Glenn Gould" },
  { src: "/sounds/site-theme-vivaldi-alla-rustica.mp3", fadeInMs: 3000, fadeOutMs: 3000,
    title: "A. Vivaldi — Concerto RV 151 “Alla Rustica,” III. Allegro", performer: "" },
  { src: "/sounds/site-theme-scarlatti-kk455.mp3", fadeInMs: 3000, fadeOutMs: 3000,
    title: "D. Scarlatti — Sonata K. 455 in G Major", performer: "Yuja Wang" },
  { src: "/sounds/site-theme-schubert-d960-scherzo-trio.mp3", fadeInMs: 3000, fadeOutMs: 3000,
    title: "F. Schubert — Sonata D. 960 in B♭ Major, III. Scherzo (Allegro vivace con delicatezza)", performer: "" },
  { src: "/sounds/site-theme-biber-imitatione-liuto.mp3", fadeInMs: 3000, fadeOutMs: 3000,
    title: "J.P. von Westhoff — Violin Sonata in A Minor, III. Imitazione del Liuto", performer: "Lina Tur Bonnet" },
  { src: "/sounds/site-theme-westhoff-partita5-gigue.mp3", fadeInMs: 3000, fadeOutMs: 3000,
    title: "H.I.F. Biber — Harmonia Artificiosa-Ariosa, Partita No. 5 in G Minor, IV. Gigue", performer: "" },
  { src: "/sounds/site-theme-biber-harmonia-partia5-gigue.mp3", fadeInMs: 3000, fadeOutMs: 3000,
    title: "H.I.F. Biber — Harmonia Artificiosa-Ariosa, Partita No. 5 in G Minor, IV. Gigue", performer: "" },
  // Ajout 2026-07 (4 pièces J.S. Bach) : WTC Livre I jouées par Sviatoslav
  // Richter, Suite anglaise par Murray Perahia (demande explicite).
  { src: "/sounds/site-theme-bach-wtc1-prelude19.mp3", fadeInMs: 3000, fadeOutMs: 3000,
    title: "J.S. Bach — Well-Tempered Clavier, Book I, Prelude No. 19 in A Major, BWV 864", performer: "Sviatoslav Richter" },
  { src: "/sounds/site-theme-bach-wtc1-prelude5.mp3", fadeInMs: 3000, fadeOutMs: 3000,
    title: "J.S. Bach — Well-Tempered Clavier, Book I, Prelude No. 5 in D Major, BWV 850", performer: "Sviatoslav Richter" },
  { src: "/sounds/site-theme-bach-english-suite6-gavotte.mp3", fadeInMs: 3000, fadeOutMs: 3000,
    title: "J.S. Bach — English Suite No. 6 in D Minor, BWV 811, V. Gavotte I", performer: "Murray Perahia" },
  { src: "/sounds/site-theme-bach-musical-offering.mp3", fadeInMs: 3000, fadeOutMs: 3000,
    title: "J.S. Bach — Musical Offering, BWV 1079, Fuga canonica in Epidiapente",
    performer: "Nils Thilo Krämer · Ariane Pfister · Christian Benda · Sebastian Benda · Capella Istropolitana" },
  // Ajout 2026-07 (Schumann) : « Vogel als Prophet » (Waldszenen Op. 82 No. 7),
  // Maria João Pires.
  { src: "/sounds/site-theme-schumann-vogel-prophet.mp3", fadeInMs: 3000, fadeOutMs: 3000,
    title: "R. Schumann — Waldszenen, Op. 82, No. 7 “Vogel als Prophet”", performer: "Maria João Pires" },
];

// La playlist alterne TOUJOURS forêt / morceau (forêt aux positions PAIRES,
// morceau aux IMPAIRES). Mais l'ORDRE des morceaux est ALÉATOIRE (demande
// 2026-07 : ne plus toujours entendre les mêmes enchaînements). `order` est
// une permutation des index de MUSIC_TRACKS, mélangée au démarrage puis
// re-mélangée à chaque tour complet (voir reshuffleOrder / scheduleNextAfterGap)
// — et on évite de rejouer d'affilée le même morceau au raccord de boucle.
const PLAYLIST_LEN = MUSIC_TRACKS.length * 2;
let order = MUSIC_TRACKS.map((_, i) => i);

function shuffleInPlace(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}
// Re-mélange `order`, en s'assurant que le PREMIER morceau du nouveau tour
// n'est pas celui qui vient de jouer (`avoid`) — pas de répétition au raccord.
function reshuffleOrder(avoid) {
  shuffleInPlace(order);
  if (order.length > 1 && order[0] === avoid) {
    const j = 1 + Math.floor(Math.random() * (order.length - 1));
    const tmp = order[0]; order[0] = order[j]; order[j] = tmp;
  }
}
// Index (dans MUSIC_TRACKS) du morceau à une position IMPAIRE de la playlist,
// ou -1 pour une position paire (pause forêt).
function musicIndexAtPlaylist(i) {
  return i % 2 === 1 ? order[(i - 1) / 2] : -1;
}

const GAP_BETWEEN_TRACKS_MS = 4000; // silence entre chaque étape du cycle (forêt comprise)
const TARGET_VOLUME = 0.34;         // "claire et nette" mais jamais forte, hors partie
const GAME_VOLUME = 0.09;           // pendant une partie : présente mais très en retrait
const DUCK_FADE_MS = 900;           // transition douce vers le volume "partie"
const RESUME_FADE_MS = 1300;        // transition douce vers le volume normal au retour au lobby
const MUTE_FADE_MS = 400;           // transition douce coupure/rétablissement depuis le menu Paramètres

// Éléments <audio> créés PARESSEUSEMENT (jamais les 20 d'un coup) — voir
// getForestAudio()/getTrackAudio()/audioForPlaylistIndex() plus bas. Avant
// ce correctif, initAmbience() créait un <audio preload="auto"> par ENTRÉE
// de PLAYLIST (20 éléments, dont 10 copies redondantes du même fichier
// forêt) et lançait leurs 20 téléchargements/décodages en même temps au
// chargement de la page : ~22 Mo d'audio en rafale, saturant les connexions
// réseau ET le thread principal pile au moment où l'utilisateur est
// susceptible d'ouvrir le menu Paramètres (d'où le ralentissement), et
// dépassant sur mobile (Safari iOS notamment) la limite d'éléments <audio>
// simultanément chargés que le navigateur tolère — au-delà, l'OS coupe
// silencieusement les plus anciens, d'où les échecs de lecture
// intermittents observés. Désormais : un seul élément partagé pour la pause
// forêt (jamais 10 téléchargements du même fichier), et un élément par
// morceau créé seulement quand il devient "le suivant" (préchargé pendant
// que le morceau courant joue, jamais tous en même temps).
let forestAudio = null;
let trackAudios = new Array(MUSIC_TRACKS.length).fill(null);
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
  return musicIndexAtPlaylist(trackIndex);
}

function notify() {
  const snapshot = { musicIndex: currentMusicIndexFromTrackIndex(), muted };
  listeners.forEach(fn => { try { fn(snapshot); } catch (e) {} });
}

// Attache les écouteurs communs à un élément <audio> nouvellement créé
// (avance de la rotation à la fin, fondu de sortie éventuel) — factorisé
// pour être appelé aussi bien pour la pause forêt que pour un morceau,
// qu'il soit créé au tout début ou en préchargement anticipé plus tard.
function attachAudioListeners(el, fadeOutMs) {
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
}

// Élément <audio> UNIQUE et partagé pour la pause forêt, créé au tout
// premier besoin — plus jamais une copie par occurrence dans PLAYLIST.
function getForestAudio() {
  if (!forestAudio) {
    forestAudio = new Audio(FOREST_PAUSE.src);
    forestAudio.preload = "auto";
    forestAudio.volume = 0;
    attachAudioListeners(forestAudio, null);
  }
  return forestAudio;
}

// Élément <audio> d'un morceau (index dans MUSIC_TRACKS), créé
// PARESSEUSEMENT au premier besoin réel (piste en cours, ou préchargement
// de la piste suivante juste avant qu'elle ne joue) — jamais les 10 d'un
// coup au chargement de la page.
function getTrackAudio(musicIndex) {
  let el = trackAudios[musicIndex];
  if (!el) {
    const track = MUSIC_TRACKS[musicIndex];
    el = new Audio(track.src);
    el.preload = "auto";
    el.volume = 0;
    attachAudioListeners(el, track.fadeOutMs);
    trackAudios[musicIndex] = el;
  }
  return el;
}

// Résout l'élément <audio> correspondant à une position dans PLAYLIST
// (forêt aux index pairs, morceau aux index impairs — voir PLAYLIST plus
// haut), en le créant si besoin.
function audioForPlaylistIndex(i) {
  return i % 2 === 0 ? getForestAudio() : getTrackAudio(musicIndexAtPlaylist(i));
}

function playTrackAt(i) {
  trackIndex = i;
  current = audioForPlaylistIndex(i);
  if (!current) return;
  const mi = musicIndexAtPlaylist(i);
  const cfg = mi >= 0 ? MUSIC_TRACKS[mi] : {}; // forêt = pas de fondu JS
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
  // Préchargement anticipé de la PROCHAINE étape pendant que celle-ci joue
  // (au lieu de tout précharger d'un coup au chargement de la page) : le
  // temps de lecture de l'étape courante + le silence entre les deux lui
  // sert de marge pour se charger sans compétition réseau/décodage avec
  // les autres pistes — c'est cette compétition qui causait les échecs de
  // lecture intermittents et le ralentissement du menu Paramètres.
  audioForPlaylistIndex((i + 1) % PLAYLIST_LEN);
  notify();
}

function scheduleNextAfterGap() {
  clearTimeout(sequenceTimer);
  sequenceTimer = setTimeout(() => {
    const next = (trackIndex + 1) % PLAYLIST_LEN;
    // Fin d'un tour complet : on re-mélange l'ordre des morceaux pour le tour
    // suivant (jamais deux fois la même séquence), en évitant de réenchaîner
    // sur le morceau qui vient de jouer.
    if (next === 0) reshuffleOrder(order[order.length - 1]);
    // La rotation continue même pendant une partie (juste plus discrète).
    playTrackAt(next);
  }, GAP_BETWEEN_TRACKS_MS);
}

export function initAmbience() {
  if (started || typeof window === "undefined") return;
  started = true;
  muted = !isMusicEnabled();
  reshuffleOrder(-1); // ordre aléatoire dès le premier tour
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
  const next = (trackIndex + 1) % PLAYLIST_LEN;
  fadeTo(el, 0, 250, () => {
    if (el) el.pause();
    playTrackAt(next);
  });
}

// ----- Menu Paramètres : liste des pistes, sélection directe, coupure ----

// Liste affichable dans le menu Paramètres — l'index (dans MUSIC_TRACKS, à
// passer à playTrackByIndex), le titre (compositeur/œuvre) et l'interprète
// (chaîne vide si non précisé, voir MUSIC_TRACKS plus haut).
export function getMusicTrackList() {
  return MUSIC_TRACKS.map((track, i) => ({
    index: i,
    title: track.title || ("Track " + (i + 1)),
    performer: track.performer || "",
  }));
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
  if (started) {
    cancelAnimationFrame(fadeRAF);
    if (muted) {
      // Coupe RÉELLEMENT le son en METTANT EN PAUSE. Régler simplement le
      // volume à 0 ne suffisait pas : Safari iOS ignore `el.volume` (contrôlé
      // par les boutons matériels), donc la musique continuait malgré
      // l'interrupteur. La pause, elle, coupe partout. La rotation est gelée
      // le temps de la coupure et reprend là où elle en était.
      clearTimeout(sequenceTimer);
      if (current) { try { current.pause(); } catch (e) {} }
    } else {
      // Rétablit : on remonte le volume et on relance la lecture. Si la piste
      // courante s'était terminée pendant la coupure, on relance l'étape.
      if (!current || current.ended) {
        playTrackAt(trackIndex % PLAYLIST_LEN);
      } else {
        current.volume = activeVolume();
        tryPlay(current);
      }
    }
  }
  notify();
}

// Lance directement une piste choisie dans la liste du menu Paramètres
// ("relancer la piste qu'on apprécie") — si la musique était coupée, la
// sélection d'une piste vaut intention claire d'écouter : on rétablit le
// son automatiquement plutôt que de laisser un clic sans effet audible.
export function playTrackByIndex(musicIndex) {
  if (!started) return;
  if (musicIndex < 0 || musicIndex >= MUSIC_TRACKS.length) return;
  if (muted) { muted = false; setMusicEnabled(true); }
  clearTimeout(sequenceTimer);
  // Position de ce morceau dans l'ordre (aléatoire) courant.
  const pos = order.indexOf(musicIndex);
  const playlistIdx = (pos >= 0 ? pos : 0) * 2 + 1;
  if (playlistIdx === trackIndex && current && !current.paused) { notify(); return; } // déjà en cours
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
