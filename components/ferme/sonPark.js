"use client";
/* =============================================================================
   sonPark.js — LES SONS DES MONTURES DU SKATEPARK (2026-10-11), SYNTHÉTISÉS.
   -----------------------------------------------------------------------------
   Guillaume : « priorité jouabilité, effet bluffant et réaliste ». La moitié d'un skatepark s'entend : le ronronnement des roues
   qui change de grain quand on passe du pavé au bois creux d'une rampe, le petit choc à chaque joint de feuille, le POP du tail
   à l'ollie, le claquement de la planche à la réception, le crissement d'acier d'un grind. Aucun fichier : le site n'en a pas,
   et un son synthétisé suit la vitesse en continu, ce qu'un fichier ne fait pas.
   ⚠️ LE MÊME CONTEXTE AUDIO QUE TOUT LE SITE (`audioContext`, lib/sfx.js), et LA MÊME PRÉFÉRENCE (`isSoundEnabled`) : le son
   coupé l'est ici aussi. Un contexte suspendu (aucun geste encore) ne programme rien — mieux vaut muet que décalé.
   ⚠️ AUCUN `Math.random` DANS LE TEMPS : le bruit est un tampon tiré UNE fois (deux secondes de bruit brun), lu en boucle.
   ⚠️ CE FICHIER NE SAIT RIEN DE LA PHYSIQUE : le jeu lui passe la vitesse, la surface, l'état — et les événements.
   ========================================================================== */
import { audioContext, isSoundEnabled } from "@/lib/sfx";

const S = { ctx: null, noise: null, roll: null, grind: null, lastSeam: 0, on: false };

function ready() {
  if (!isSoundEnabled()) return null;
  const ctx = audioContext();
  if (!ctx || ctx.state !== "running") return null;
  if (S.ctx !== ctx) { S.ctx = ctx; S.noise = null; S.roll = null; S.grind = null; }
  if (!S.noise) {
    // deux secondes de bruit BRUN (le bruit blanc intégré) : le grave d'un roulement, pas le souffle d'une radio
    const n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0, seed = 12345;
    for (let i = 0; i < n; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const w = seed / 0x7fffffff * 2 - 1;
      last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5;
    }
    S.noise = buf;
  }
  return ctx;
}
function loopSource(ctx) { const src = ctx.createBufferSource(); src.buffer = S.noise; src.loop = true; return src; }

/* Le roulement : du bruit filtré dont le grain suit la surface et le volume la vitesse. Construit au premier besoin. */
function rollChain(ctx) {
  if (S.roll) return S.roll;
  const src = loopSource(ctx);
  const band = ctx.createBiquadFilter(); band.type = "bandpass"; band.frequency.value = 600; band.Q.value = 0.9;
  const low = ctx.createBiquadFilter(); low.type = "lowpass"; low.frequency.value = 2400;
  const g = ctx.createGain(); g.gain.value = 0;
  // la caisse de résonance d'une rampe en bois : un grave sourd, sous le roulement
  const boom = ctx.createOscillator(); boom.type = "sine"; boom.frequency.value = 72;
  const bg = ctx.createGain(); bg.gain.value = 0;
  src.connect(band).connect(low).connect(g).connect(ctx.destination);
  boom.connect(bg).connect(ctx.destination);
  src.start(); boom.start();
  S.roll = { src, band, low, g, boom, bg };
  return S.roll;
}
function grindChain(ctx) {
  if (S.grind) return S.grind;
  const src = loopSource(ctx);
  const b1 = ctx.createBiquadFilter(); b1.type = "bandpass"; b1.frequency.value = 2700; b1.Q.value = 7;
  const b2 = ctx.createBiquadFilter(); b2.type = "bandpass"; b2.frequency.value = 4300; b2.Q.value = 9;
  const g = ctx.createGain(); g.gain.value = 0;
  src.connect(b1).connect(g); src.connect(b2).connect(g); g.connect(ctx.destination);
  src.start();
  S.grind = { src, g, b1 };
  return S.grind;
}
const ramp = (param, v, ctx, tc) => param.setTargetAtTime(v, ctx.currentTime, tc || 0.05);

/* À chaque image, monté : `speed` (cases/s), `rolling` (au sol, roues sur la surface), `surface` ("wood" | "stone" | "steel"),
   `grinding` (sur un rail ou une arête), `dist` (la distance roulée, cumulée — les joints des feuilles se comptent dessus). */
export function parkSoundUpdate(o) {
  const ctx = ready();
  if (!ctx) { parkSoundStop(); return; }
  S.on = true;
  const R = rollChain(ctx), Gc = grindChain(ctx);
  const sp = Math.min(1, (o.speed || 0) / 7);
  const wood = o.surface === "wood";
  const roll = o.rolling && !o.grinding ? sp : 0;
  ramp(R.g.gain, roll * (wood ? 0.16 : 0.12), ctx);
  ramp(R.band.frequency, wood ? 380 + 260 * sp : 760 + 600 * sp, ctx);
  ramp(R.band.Q, wood ? 1.6 : 0.7, ctx);
  ramp(R.bg.gain, wood ? roll * 0.05 : 0, ctx, 0.08);
  ramp(R.boom.frequency, 62 + 30 * sp, ctx, 0.1);
  ramp(Gc.g.gain, o.grinding ? 0.05 + 0.07 * sp : 0, ctx, 0.03);
  ramp(Gc.b1.frequency, 2300 + 900 * sp, ctx);
  // les joints de feuille (un pas de 1,06 case, celui de `skateparkArt.js`) : un petit choc creux au passage
  if (o.rolling && wood && o.dist != null) {
    const k = Math.floor(o.dist / 1.06);
    if (k !== S.lastSeam && sp > 0.15) tick(ctx, 0.035 * sp, 520);
    S.lastSeam = k;
  }
}
export function parkSoundStop() {
  if (!S.on || !S.ctx) return;
  S.on = false;
  if (S.roll) { ramp(S.roll.g.gain, 0, S.ctx, 0.08); ramp(S.roll.bg.gain, 0, S.ctx, 0.08); }
  if (S.grind) ramp(S.grind.g.gain, 0, S.ctx, 0.05);
}
/* Un bref éclat de bruit filtré : la base de tous les chocs. */
function burst(ctx, gain, freq, q, dur, type) {
  const src = ctx.createBufferSource(); src.buffer = S.noise;
  const f = ctx.createBiquadFilter(); f.type = type || "bandpass"; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); const t = ctx.currentTime + 0.002;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(t, (t * 7.3) % 1.5); src.stop(t + dur + 0.02);
}
function thump(ctx, gain, f0, f1, dur) {
  const o = ctx.createOscillator(); o.type = "sine";
  const g = ctx.createGain(); const t = ctx.currentTime + 0.002;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
}
function tick(ctx, gain, freq) { burst(ctx, gain, freq, 2.5, 0.03); }

/* Les événements : "kick" (le pied racle le sol), "pop" (le tail claque : l'ollie), "land" (`k` 0..1, la dureté), "bail",
   "flip" (la planche tourne), "grind" (l'accroche sur l'acier). */
export function parkSoundEvent(name, k = 0.5) {
  const ctx = ready();
  if (!ctx) return;
  if (name === "kick") burst(ctx, 0.05, 1300, 0.8, 0.11);
  else if (name === "pop") { burst(ctx, 0.16, 2100, 1.4, 0.035); thump(ctx, 0.12, 240, 120, 0.07); }
  else if (name === "land") { const g = 0.08 + 0.18 * Math.min(1, k); thump(ctx, g, 110, 55, 0.14); burst(ctx, g * 0.7, 3100, 2.2, 0.03); burst(ctx, g * 0.5, 500, 0.8, 0.09, "lowpass"); }
  else if (name === "bail") { thump(ctx, 0.2, 90, 45, 0.2); burst(ctx, 0.08, 900, 0.7, 0.35); }
  else if (name === "flip") burst(ctx, 0.03, 1700, 3, 0.12);
  else if (name === "grind") { burst(ctx, 0.1, 3600, 6, 0.05); thump(ctx, 0.06, 300, 200, 0.05); }
}
