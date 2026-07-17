"use client";

/* ==========================================================================
   SFX — lecteur de sons minimal, sans dépendance externe.

   Deux familles de sons :
   - fichiers réels servis depuis /public/sounds (ex. mélange de dés,
     musiques MuseScore à venir) ;
   - sons synthétiques générés à la volée via Web Audio (ex. validation) —
     zéro fichier à fournir, cohérence garantie sur toutes les tables.

   Prépare le terrain pour l'onglet Paramètres à venir (bascule son on/off,
   musique on/off) : la préférence est déjà persistée dans localStorage sous
   une clé unique par catégorie. Il suffira que Paramètres appelle
   setSoundEnabled()/setMusicEnabled() — aucun autre fichier n'aura besoin
   d'être modifié.
   ========================================================================== */

const SOUND_KEY = "arcardi:soundEnabled";
const MUSIC_KEY = "arcardi:musicEnabled";

let audioCtx = null;
const fileCache = {};
// Buffers Web Audio décodés (src -> AudioBuffer). La lecture par buffer est
// QUASI INSTANTANÉE (pas de latence de démarrage comme HTMLAudio, surtout sur
// Safari) : utilisée pour les sons qui doivent claquer PILE au clic, ex. la
// dynamite de Gold Mines.
const bufferCache = {};

export function isSoundEnabled() {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(SOUND_KEY);
  return v === null ? true : v === "1";
}
export function setSoundEnabled(enabled) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
}

export function isMusicEnabled() {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(MUSIC_KEY);
  return v === null ? true : v === "1";
}
export function setMusicEnabled(enabled) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MUSIC_KEY, enabled ? "1" : "0");
}

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  // Certains navigateurs démarrent le contexte suspendu tant qu'aucun geste
  // utilisateur n'a été détecté — reprise silencieuse si refusée.
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

// Décode un fichier en AudioBuffer et le met en cache (une seule fois). À
// lancer à l'avance (primeFiles) pour que la première lecture soit instantanée.
// decodeAudioData fonctionne même si le contexte est encore suspendu.
function primeBuffer(src) {
  if (typeof window === "undefined" || bufferCache[src]) return;
  const ctx = getCtx();
  if (!ctx) return;
  bufferCache[src] = "loading"; // évite les décodages concurrents
  fetch(src)
    .then(r => r.arrayBuffer())
    .then(buf => ctx.decodeAudioData(buf))
    .then(decoded => { bufferCache[src] = decoded; })
    .catch(() => { delete bufferCache[src]; });
}

// Joue un son via Web Audio (latence quasi nulle) si son buffer est prêt.
// Sinon, repli transparent sur HTMLAudio (playFile). Retourne true si joué en
// Web Audio, false si repli (l'appelant n'a rien à gérer).
export function playBuffer(src, { volume = 0.7 } = {}) {
  if (typeof window === "undefined" || !isSoundEnabled()) return false;
  const decoded = bufferCache[src];
  if (!decoded || decoded === "loading") {
    // Pas encore décodé : on lance le décodage pour la prochaine fois, et on
    // joue tout de suite en HTMLAudio pour ne rien rater.
    primeBuffer(src);
    playFile(src, { volume });
    return false;
  }
  try {
    const ctx = getCtx();
    if (!ctx) { playFile(src, { volume }); return false; }
    const source = ctx.createBufferSource();
    source.buffer = decoded;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(ctx.destination);
    source.start(0);
    return true;
  } catch (e) { playFile(src, { volume }); return false; }
}

// ----- Fichier réel ---------------------------------------------------------
// clone() à chaque appel : autorise deux lectures qui se chevauchent (ex. un
// second lancer de dés cliqué juste après le précédent) sans se couper.
// Retourne le nœud <audio> joué (ou null) pour pouvoir le couper plus tard
// (ex. dés révélés avant la fin naturelle du fichier, double-clic qui
// écourte l'animation).
// Précharge un ou plusieurs fichiers pour supprimer la latence de fetch/décodage
// du PREMIER appel (sinon le premier son arrive en retard). À appeler dès qu'un
// jeu sait de quels sons il aura besoin (ex. la dynamite de Gold Mines). Sans
// danger si déjà en cache, et ignoré côté serveur.
export function primeFiles(...srcs) {
  if (typeof window === "undefined") return;
  for (const src of srcs) {
    // Décodage Web Audio à l'avance : lecture instantanée au 1er clic.
    primeBuffer(src);
    if (fileCache[src]) continue;
    try {
      const a = new Audio(src); // repli HTMLAudio (si Web Audio indispo)
      a.preload = "auto";
      a.load();
      fileCache[src] = a;
    } catch (e) {}
  }
}

export function playFile(src, { volume = 0.7 } = {}) {
  if (typeof window === "undefined" || !isSoundEnabled()) return null;
  try {
    let base = fileCache[src];
    if (!base) {
      base = new Audio(src);
      base.preload = "auto";
      fileCache[src] = base;
    }
    const node = base.cloneNode();
    node.volume = volume;
    node.play().catch(() => {}); // autoplay bloqué : silencieux, jamais d'erreur visible
    return node;
  } catch (e) { return null; }
}

// Coupe un son en cours (pause + retour au début) — jamais d'exception si
// le nœud est déjà terminé ou invalide.
export function stopSound(node) {
  if (!node) return;
  try { node.pause(); node.currentTime = 0; } catch (e) {}
}

// ----- Sons synthétiques (Web Audio) -----------------------------------------

// Joue une séquence de notes (fréquences en Hz) à des instants PRÉCIS (offsets
// en ms depuis l'appel), via l'horloge Web Audio — timing d'échantillon, donc
// calage parfait sur une animation (ex. l'intro ARCARDI, une note par lettre).
// Chaque note = clochette douce (attaque rapide, extinction exponentielle).
// Silencieux si le son est coupé, ou si le contexte est bloqué par la politique
// d'autoplay (aucune interaction encore) — aucune erreur dans ce cas.
export function playNoteSequence(notes, { type = "triangle", gain = 0.16, durMs = 300 } = {}) {
  if (!isSoundEnabled()) return false;
  const ctx = getCtx();
  if (!ctx) return false;
  // Le contexte doit DÉJÀ tourner : s'il est encore "suspended" (aucune
  // interaction depuis le chargement), on ne programme RIEN — sinon les notes
  // resteraient en file et se déclencheraient toutes à la première interaction,
  // bien après l'intro ("calé au mauvais moment"). Mieux vaut silencieux que
  // décalé. L'appelant peut regarder la valeur de retour pour réagir.
  if (ctx.state !== "running") return false;
  const t0 = ctx.currentTime + 0.02;
  for (const n of notes) {
    const at = t0 + (n.atMs || 0) / 1000;
    const dur = (n.durMs || durMs) / 1000;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = n.type || type;
    osc.frequency.value = n.freq;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(n.gain || gain, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + dur + 0.03);
  }
  return true;
}

// Mot Mystère — deux sons DISTINCTS à la révélation des lettres (correctif
// 2026-07, demande explicite) : le son qui servait auparavant au JAUNE passe
// désormais au VERT (lettre bien placée) — une note grave et douce, mi5. Le
// JAUNE (lettre présente ailleurs) reçoit un tout nouveau son, volontairement
// plus CREUX/mat (percussif, filtré passe-bas, la hauteur retombe très vite)
// pour rester clairement distinct des deux autres cas à l'oreille.
//
// Synchronisation fine : contrairement à playNoteSequence (qui programme son
// départ ~20 ms à l'avance, confortable pour une séquence de plusieurs notes
// mais perceptible comme un léger retard sur un déclenchement ponctuel calé
// sur une animation), ces deux fonctions démarrent quasiment immédiatement
// (décalage résiduel de 2 ms, juste ce qu'il faut pour éviter le clic audio
// de démarrage) afin que le son parte pile au moment où la lettre se
// retourne, sans décalage perceptible avec l'animation CSS de la tuile.
export function playWordleGreen() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + 0.002;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(660, t0); // mi5, grave et doux (hérité de l'ancien son "jaune")
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.10, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.17);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.19);
}
export function playWordleYellow() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + 0.002;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(320, t0);
  osc.frequency.exponentialRampToValueAtTime(150, t0 + 0.10); // la hauteur retombe vite — effet "creux"
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(700, t0);
  filter.Q.value = 1.2;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.14, t0 + 0.006); // attaque courte, plus mate/percussive
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.17);
}

// Petit arpège ascendant, chaleureux et bref : validation d'une action
// importante. Aucun fichier, rendu identique partout.
export function playConfirmChime() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = [660, 880, 1108]; // mi5 - la5 - do#6, arpège léger
  notes.forEach((freq, i) => {
    const t0 = now + i * 0.07;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.16, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.42);
  });
}

// 10 000 — Farkle : buzz dissonant bref et descendant (deux oscillateurs
// détonants en scie, glissando vers le grave), moment clairement négatif
// sans être désagréable à répétition (le farkle arrive souvent).
export function playFarkle() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  [1, 1.015].forEach((detune) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220 * detune, now);
    osc.frequency.exponentialRampToValueAtTime(70 * detune, now + 0.5);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
  });
}

// 10 000 — Hot dice : petit arpège ascendant scintillant, plus vif et
// pailleté que playConfirmChime, pour marquer le moment où les 6 dés
// repartent d'un coup.
export function playHotDice() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = [740, 988, 1244, 1568]; // fa#5 - si5 - re#6 - sol6
  notes.forEach((freq, i) => {
    const t0 = now + i * 0.055;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.15, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.34);
  });
}

// ----- Sons de jeu concrets ---------------------------------------------------
// Deux montages différents selon le nombre de dés réellement relancés (les
// dés gardés ne comptent pas) : un mélange "few" plus discret sous 4 dés
// (dernière seconde du fichier original, la plus dynamique, avec un fondu
// d'entrée de 80ms pour éviter le "pop" de la coupe), un mélange "many" plus
// fourni à partir de 4. Retourne le nœud audio joué pour pouvoir le couper à
// la révélation (ou lors d'un double-clic qui écourte).
export function playDiceShuffle(diceCount = 5) {
  const src = diceCount < 4 ? "/sounds/dice-shuffle-few.mp3" : "/sounds/dice-shuffle-many.mp3";
  return playFile(src, { volume: 0.55 });
}

// Ouverture des portes en bois (DoorStage) : 3s, synchronisées avec la
// rotation des deux battants (voir components/DoorStage.js). Fichier déjà
// découpé/accéléré pour tenir exactement dans ces 3 secondes, avec un léger
// fondu de sortie intégré — inutile de le couper manuellement au clic sur
// Rejouer/Revoir l'entrée, il se termine tout seul avant la fin de la scène.
// 10 000 — banque : vrai bruit de caisse enregistreuse / machine à sous
// (fichier réel fourni, demande 2026-07), joué à CHAQUE encaissement.
export function playCashRegister() {
  return playFile("/sounds/cash-register.mp3", { volume: 0.65 });
}

export function playDoorOpen() {
  return playFile("/sounds/door-open.mp3", { volume: 0.6 });
}

// Gold Mines — coup de pioche sur une case SANS pépite (un chiffre ou une case
// vide) : bruit de terre creusée (fichier fourni, découpé 0,5→2 s). Web Audio
// (buffer préchargé) pour claquer au bon moment, comme la dynamite.
export function playDigDirt() {
  return playBuffer("/sounds/dig-dirt.mp3", { volume: 0.5 });
}

// Gold Mines — dynamite : vrai bruit de tir de mine (fichier fourni,
// demande 2026-07), découpé sur les 7 premières secondes avec un fondu de
// sortie délicat (1,6 s) intégré au fichier — rien à couper côté code, il
// s'éteint tout seul pendant que la poussière retombe.
export function playDynamite() {
  // Web Audio (buffer préchargé via primeFiles au montage de Gold Mines) :
  // le boum claque PILE au clic, sans la latence de démarrage de HTMLAudio
  // (très sensible sur Safari) qui donnait un son "en retard". Repli
  // automatique sur HTMLAudio si le buffer n'est pas prêt.
  return playBuffer("/sounds/dynamite-blast.mp3", { volume: 0.6 });
}

// Fin de partie — joués une seule fois par manche, pour CHAQUE joueur selon
// son propre résultat (voir la logique de déclenchement dans chaque jeu,
// ex. YahtzeeGame.js). "win" : applaudissements (6s, déjà découpés).
// "lose" : sting de violon (3s, déjà court, utilisé tel quel).
export function playGameWin() {
  return playFile("/sounds/game-win.mp3", { volume: 0.65 });
}
export function playGameLose() {
  return playFile("/sounds/game-lose.mp3", { volume: 0.55 });
}

// ----- Habillage sonore des jeux muets (2026-07, demande explicite) --------
// Style "sobre" validé : 2 à 4 sons par jeu, tout en Web Audio synthétique
// (zéro fichier, cohérent partout). Chaque son est court, feutré, esprit
// feu de camp — jamais agressif à la répétition.

// Générateur de bruit blanc partagé (buffer créé une fois) : sert aux sons
// "matière" (carte qui claque/glisse, jeton qui tombe).
let noiseBuf = null;
function getNoiseBuffer(ctx) {
  if (noiseBuf) return noiseBuf;
  const len = Math.floor(ctx.sampleRate * 0.25);
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
// Bouffée de bruit filtré : la brique de base des sons "matière".
function noiseBurst(ctx, at, { durMs = 70, freq = 1800, q = 1.2, gain = 0.16, type = "bandpass" }) {
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(freq, at);
  filter.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, at + durMs / 1000);
  src.connect(filter).connect(g).connect(ctx.destination);
  src.start(at);
  src.stop(at + durMs / 1000 + 0.03);
}

// Carte posée sur le tapis : claquement feutré (bruit médium très court +
// petit "toc" grave). Président, Chromatik, Rami.
export function playCardPlace() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx || ctx.state !== "running") return;
  const t0 = ctx.currentTime + 0.002;
  noiseBurst(ctx, t0, { durMs: 55, freq: 2100, q: 0.9, gain: 0.13 });
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(210, t0);
  osc.frequency.exponentialRampToValueAtTime(130, t0 + 0.07);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.1, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.12);
}

// Carte piochée / qui glisse : frottement bref, plus discret que la pose.
export function playCardSlide() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx || ctx.state !== "running") return;
  const t0 = ctx.currentTime + 0.002;
  noiseBurst(ctx, t0, { durMs: 110, freq: 3200, q: 0.6, gain: 0.07, type: "highpass" });
}

// Puissance 4 : jeton qui tombe (glissando descendant très court + toc mat
// à l'atterrissage).
export function playTokenDrop() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx || ctx.state !== "running") return;
  const t0 = ctx.currentTime + 0.002;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(620, t0);
  osc.frequency.exponentialRampToValueAtTime(160, t0 + 0.12);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.11, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.16);
  noiseBurst(ctx, t0 + 0.11, { durMs: 45, freq: 420, q: 1.4, gain: 0.12 });
}

// Échecs : pièce déposée (toc de bois sec) ; capture : plus grave et appuyé.
export function playChessMove() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx || ctx.state !== "running") return;
  const t0 = ctx.currentTime + 0.002;
  noiseBurst(ctx, t0, { durMs: 40, freq: 900, q: 2.2, gain: 0.14 });
}
export function playChessCapture() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx || ctx.state !== "running") return;
  const t0 = ctx.currentTime + 0.002;
  noiseBurst(ctx, t0, { durMs: 60, freq: 520, q: 1.6, gain: 0.18 });
  noiseBurst(ctx, t0 + 0.045, { durMs: 45, freq: 780, q: 2, gain: 0.1 });
}

// Bonne réponse (double ding lumineux) / mauvaise réponse (buzz descendant
// doux, volontairement moins agressif que le farkle). Quiz, et signal
// positif/négatif générique des escape rooms (Échos, Heist).
export function playAnswerRight() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx || ctx.state !== "running") return;
  const now = ctx.currentTime;
  [880, 1318].forEach((freq, i) => {
    const t0 = now + i * 0.09;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.13, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.34);
  });
}
export function playAnswerWrong() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx || ctx.state !== "running") return;
  const t0 = ctx.currentTime + 0.002;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(260, t0);
  osc.frequency.exponentialRampToValueAtTime(140, t0 + 0.22);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(600, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
  osc.connect(filter).connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.32);
}

// Échos (final "Le Naufrage") : éclaboussure d'eau — bouffée de bruit grave
// qui retombe, pour la clé qui tombe à l'eau et la main qui fouille.
export function playSplash() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx || ctx.state !== "running") return;
  const t0 = ctx.currentTime + 0.002;
  noiseBurst(ctx, t0, { durMs: 90, freq: 700, q: 0.8, gain: 0.16, type: "lowpass" });
  noiseBurst(ctx, t0 + 0.06, { durMs: 220, freq: 1600, q: 0.7, gain: 0.08, type: "bandpass" });
}

// Bataille navale : tir dans l'eau (case vide) — vrai mp3 fourni par Guillaume
// (2026-07). Fonction DÉDIÉE (ne réutilise pas playSplash, partagé avec Échos)
// pour ne changer QUE le son de la navale. Web Audio si le buffer est prêt
// (préchargé par primeFiles au montage de la navale), sinon repli HTMLAudio.
export function playNavalSplash() {
  if (!isSoundEnabled()) return;
  playBuffer("/sounds/naval-splash.mp3", { volume: 0.7 });
}

// ----- Bataille navale : bonus & naufrage (2026-07) -------------------------
// DOUBLURES synthétiques en attendant les mp3 dédiés (naval-missile-whistle,
// naval-rain-whistle, naval-ship-sink). Guillaume fournira les fichiers ; il
// suffira alors de remplacer le corps par playFile("/sounds/naval-....mp3").
//
// Missile lourd / pluie : sifflement descendant du projectile qui tombe.
export function playNavalWhistle() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx || ctx.state !== "running") return;
  const t0 = ctx.currentTime + 0.002;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1650, t0);
  osc.frequency.exponentialRampToValueAtTime(320, t0 + 0.5);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.10, t0 + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.6);
}

// Navire coulé : grondement grave descendant + glouglou de coque qui sombre.
export function playNavalSink() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx || ctx.state !== "running") return;
  const t0 = ctx.currentTime + 0.002;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(120, t0);
  osc.frequency.exponentialRampToValueAtTime(42, t0 + 0.9);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(300, t0);
  filter.Q.value = 2.5;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.11, t0 + 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.0);
  osc.connect(filter).connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 1.05);
  noiseBurst(ctx, t0 + 0.15, { durMs: 400, freq: 500, q: 0.6, gain: 0.07, type: "lowpass" });
}

// Échos (final) : craquement sourd de la coque qui travaille — grincement
// grave descendant, filtré, jamais strident. Joué aléatoirement pendant le
// naufrage pour la tension.
export function playCreak() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx || ctx.state !== "running") return;
  const t0 = ctx.currentTime + 0.002;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(96, t0);
  osc.frequency.exponentialRampToValueAtTime(58, t0 + 0.7);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(240, t0);
  filter.Q.value = 3.5;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.8);
  osc.connect(filter).connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.85);
}

// Petit Bac : quelqu'un a terminé, 10 secondes de panique — petite montée
// d'urgence (deux notes ascendantes pressées), jouée UNE fois au signal.
export function playPanicClock() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx || ctx.state !== "running") return;
  const now = ctx.currentTime;
  [523, 659, 784].forEach((freq, i) => {
    const t0 = now + i * 0.11;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.2);
  });
}

// Clic de sélection d'un jeu (cartes du lobby UNIQUEMENT — voir room
// page.js) : préchargé dès l'import de ce module, PAS paresseusement comme
// playFile ci-dessus, pour que même le tout premier clic de la soirée soit
// synchronisé sans décalage perceptible avec le clic effectif.
let gameCardClickEl = null;
if (typeof window !== "undefined") {
  gameCardClickEl = new Audio("/sounds/game-card-click.mp3");
  gameCardClickEl.preload = "auto";
}
export function playGameCardClick() {
  if (!isSoundEnabled() || !gameCardClickEl) return;
  try {
    const node = gameCardClickEl.cloneNode();
    node.volume = 0.6;
    node.play().catch(() => {});
  } catch (e) {}
}
