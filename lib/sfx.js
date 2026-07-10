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
// Précharge un ou plusieurs fichiers pour supprimer la latence de fetch/décodage
// du PREMIER appel (sinon le premier son arrive en retard). À appeler dès qu'un
// jeu sait de quels sons il aura besoin (ex. la dynamite de Gold Mines). Sans
// danger si déjà en cache, et ignoré côté serveur.
export function primeFiles(...srcs) {
  if (typeof window === "undefined") return;
  for (const src of srcs) {
    if (fileCache[src]) continue;
    try {
      const a = new Audio(src);
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

// Gold Mines — dynamite : vrai bruit de tir de mine (fichier fourni,
// demande 2026-07), découpé sur les 7 premières secondes avec un fondu de
// sortie délicat (1,6 s) intégré au fichier — rien à couper côté code, il
// s'éteint tout seul pendant que la poussière retombe.
export function playDynamite() {
  return playFile("/sounds/dynamite-blast.mp3", { volume: 0.6 });
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
