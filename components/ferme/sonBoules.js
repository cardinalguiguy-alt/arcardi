"use client";
/* =============================================================================
   sonBoules.js — LES SONS DU BOULODROME (2026-11-01, la part sonore du lot 5), SYNTHÉTISÉS.
   -----------------------------------------------------------------------------
   Décidé au premier tour (docs/PROJETS.md §11, « le folklore ») : des sons synthétisés. Une partie de boules s'entend avant de se
   voir : la boule qui tombe dans le gravier (sourde, plus lourde pour une plombée), le « clac » de l'acier contre l'acier quand on
   tire au fer, le « toc » du cochonnet en buis, le tintement d'un carreau, et le gravier qui crisse sous une roulette.
   ⚠️ LE MÊME CONTEXTE AUDIO QUE TOUT LE SITE (`audioContext`, lib/sfx.js) ET LA MÊME PRÉFÉRENCE (`isSoundEnabled`) : le son coupé
   l'est ici aussi ; un contexte suspendu (aucun geste encore) ne programme rien — mieux vaut muet que décalé (le modèle de
   `sonPark.js`).
   ⚠️ CE FICHIER NE SAIT RIEN DE LA PHYSIQUE : le jeu lui passe les événements que la simulation a datés (`sim.ev` de `petanque.js` :
   « sol », « fer », « choc », « carreau ») au moment où l'animation les atteint — chaque écran rejoue le même lancer, chacun les
   entend au même instant de SA boule, sans un message. `vol` (0..1) : la distance du joueur au terrain, que le jeu calcule.
   ⚠️ AUCUN `Math.random` DANS LE TEMPS : le bruit est un tampon tiré UNE fois, lu en boucle (un départ décalé à chaque éclat).
   ========================================================================== */
import { audioContext, isSoundEnabled } from "@/lib/sfx";

const S = { ctx: null, noise: null, roll: null, on: false, k: 0 };

function ready() {
  if (!isSoundEnabled()) return null;
  const ctx = audioContext();
  if (!ctx || ctx.state !== "running") return null;
  if (S.ctx !== ctx) { S.ctx = ctx; S.noise = null; S.roll = null; }
  if (!S.noise) {
    // une seconde et demie de bruit ROSE approché (trois pôles) : le grain du gravier, ni souffle ni grondement
    const n = Math.floor(ctx.sampleRate * 1.5), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, seed = 424242;
    for (let i = 0; i < n; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const w = seed / 0x7fffffff * 2 - 1;
      b0 = 0.997 * b0 + 0.029591 * w; b1 = 0.985 * b1 + 0.032534 * w; b2 = 0.95 * b2 + 0.048056 * w;
      d[i] = (b0 + b1 + b2 + 0.1848 * w) * 1.6;
    }
    S.noise = buf;
  }
  return ctx;
}

/* Le roulé : le gravier qui crisse sous les boules qui roulent. Construit au premier besoin, monté à chaque image. */
function rollChain(ctx) {
  if (S.roll) return S.roll;
  const src = ctx.createBufferSource(); src.buffer = S.noise; src.loop = true;
  const band = ctx.createBiquadFilter(); band.type = "bandpass"; band.frequency.value = 900; band.Q.value = 0.8;
  const hi = ctx.createBiquadFilter(); hi.type = "highpass"; hi.frequency.value = 260;
  const g = ctx.createGain(); g.gain.value = 0;
  src.connect(hi).connect(band).connect(g).connect(ctx.destination);
  src.start();
  S.roll = { src, band, g };
  return S.roll;
}
const ramp = (param, v, ctx, tc) => param.setTargetAtTime(v, ctx.currentTime, tc || 0.04);

/** À chaque image : `speed` la vitesse de la boule la plus rapide qui roule au sol (m/s), `vol` 0..1. */
export function boulesRoll(speed, vol) {
  // appelée à chaque image, en ville ou non : le cas courant (rien ne roule) ne touche pas au contexte audio
  if (!(speed > 0.03) || !(vol > 0)) { if (S.on) boulesStop(); return; }
  const ctx = ready();
  if (!ctx) { boulesStop(); return; }
  S.on = true;
  const R = rollChain(ctx), sp = Math.min(1, speed / 3);
  ramp(R.g.gain, (0.025 + 0.11 * sp) * vol, ctx);
  ramp(R.band.frequency, 650 + 650 * sp, ctx, 0.08);
}
export function boulesStop() {
  if (!S.on || !S.ctx) return;
  S.on = false;
  if (S.roll) ramp(S.roll.g.gain, 0, S.ctx, 0.06);
}

/* Les briques : un éclat de bruit filtré, un sinus qui glisse, un partiel métallique qui sonne. */
function burst(ctx, gain, freq, q, dur, type) {
  const src = ctx.createBufferSource(); src.buffer = S.noise;
  const f = ctx.createBiquadFilter(); f.type = type || "bandpass"; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); const t = ctx.currentTime + 0.002;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(ctx.destination);
  S.k = (S.k + 0.37) % 1.2;
  src.start(t, S.k); src.stop(t + dur + 0.02);
}
function thump(ctx, gain, f0, f1, dur) {
  const o = ctx.createOscillator(); o.type = "sine";
  const g = ctx.createGain(); const t = ctx.currentTime + 0.002;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
}
function ring(ctx, gain, freq, dur) {
  const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq;
  const g = ctx.createGain(); const t = ctx.currentTime + 0.002;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
}
/* L'ACIER CONTRE L'ACIER : un claquement sec puis trois partiels INHARMONIQUES (une sphère pleine ne sonne pas comme une corde —
   des rapports 1 : 1,56 : 2,38, qui font « clac » et pas « ding »), courts. `k` 0..1 : la violence du choc. */
function acier(ctx, k, vol) {
  const g = (0.05 + 0.2 * k) * vol;
  burst(ctx, g * 0.9, 5200, 1.2, 0.018, "highpass");
  ring(ctx, g * 0.55, 2650, 0.11 + 0.12 * k);
  ring(ctx, g * 0.32, 4130, 0.08 + 0.08 * k);
  ring(ctx, g * 0.18, 6310, 0.05 + 0.05 * k);
}

/** Un événement de la simulation : "sol" (`k` la chute, 0..1), "butSol", "fer", "choc", "but" (le buis heurté), "carreau". */
export function boulesEvent(name, k = 0.5, vol = 1) {
  const ctx = ready();
  if (!ctx || !(vol > 0)) return;
  k = Math.max(0, Math.min(1, k));
  if (name === "sol") {
    // la boule s'enfonce : un coup sourd (plus grave et plus fort quand elle tombe de haut) et le gravier qui gicle
    const g = (0.07 + 0.2 * k) * vol;
    thump(ctx, g, 150 - 40 * k, 52, 0.13 + 0.06 * k);
    burst(ctx, g * 0.6, 1900, 0.7, 0.07 + 0.06 * k);
  } else if (name === "butSol") {
    const g = (0.04 + 0.08 * k) * vol;
    thump(ctx, g, 260, 140, 0.07);
    burst(ctx, g * 0.5, 2300, 0.9, 0.05);
  } else if (name === "fer") acier(ctx, 0.55 + 0.45 * k, vol);
  else if (name === "choc") acier(ctx, 0.25 * k, vol * 0.8);
  else if (name === "but") {
    // le buis : un « toc » bref et boisé, sans résonance
    const g = (0.05 + 0.12 * k) * vol;
    thump(ctx, g, 1150, 820, 0.05);
    burst(ctx, g * 0.6, 1600, 2.2, 0.035);
  } else if (name === "carreau") {
    // la boule tireuse reste sur place : un tintement clair qui s'attarde, par-dessus le clac
    ring(ctx, 0.07 * vol, 3310, 0.55);
    ring(ctx, 0.04 * vol, 4960, 0.4);
  }
}
