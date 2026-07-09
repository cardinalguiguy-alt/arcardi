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

// ----- Fichier réel ---------------------------------------------------------
// clone() à chaque appel : autorise deux lectures qui se chevauchent (ex. un
// second lancer de dés cliqué juste après le précédent) sans se couper.
// Retourne le nœud <audio> joué (ou null) pour pouvoir le couper plus tard
// (ex. dés révélés avant la fin naturelle du fichier, double-clic qui
// écourte l'animation).
export function playFile(src, { volume = 0.7 } = {}) {
  if (typeof window === "undefined" || !isSoundEnabled()) return null;
  try {
    let base = fileCache[src];
    if (!base) {
      base = new Audio(src);
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
