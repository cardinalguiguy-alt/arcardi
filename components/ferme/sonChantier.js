"use client";
/* =============================================================================
   sonChantier.js — LE CHANTIER DE LA PLACE S'ENTEND (2026-10-12), SYNTHÉTISÉ.
   -----------------------------------------------------------------------------
   Un chantier qu'on regarde par-dessus la barrière, c'est d'abord du bruit : le diesel du camion qui tourne au ralenti, le BIP du
   recul quand il entre dans l'allée, le sifflement des vérins quand la flèche se déplie, le crépitement d'une soudure, les rafales
   des visseuses, le clang d'un panneau de barrière posé sur ses plots. Le jeu dit, à chaque image, combien chacun s'entend d'où l'on
   est (0..1, la distance déjà comptée) ; ce fichier ne sait rien du chantier.
   ⚠️ LE MÊME CONTEXTE AUDIO ET LA MÊME PRÉFÉRENCE QUE TOUT LE SITE (`audioContext`, `isSoundEnabled`, lib/sfx.js) — même contrat que
   `sonPark.js`. ⚠️ AUCUN `Math.random` DANS LE TEMPS : le bruit est un tampon tiré une fois ; les rafales et les bips tombent sur
   l'horloge du contexte audio, découpée en périodes.
   ========================================================================== */
import { audioContext, isSoundEnabled } from "@/lib/sfx";

const S = { ctx: null, noise: null, ch: null, on: false, beepK: -1, drillK: -1 };

function ready() {
  if (!isSoundEnabled()) return null;
  const ctx = audioContext();
  if (!ctx || ctx.state !== "running") return null;
  if (S.ctx !== ctx) { S.ctx = ctx; S.noise = null; S.ch = null; }
  if (!S.noise) {
    const n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    let seed = 987654;
    for (let i = 0; i < n; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; d[i] = seed / 0x7fffffff * 2 - 1; }
    S.noise = buf;
  }
  return ctx;
}
const ramp = (param, v, ctx, tc) => param.setTargetAtTime(v, ctx.currentTime, tc || 0.08);
function noiseSrc(ctx) { const s = ctx.createBufferSource(); s.buffer = S.noise; s.loop = true; s.start(); return s; }
function filt(ctx, type, f, q) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; }
function gain(ctx) { const g = ctx.createGain(); g.gain.value = 0; return g; }

/* Les voix continues, construites au premier besoin. */
function chains(ctx) {
  if (S.ch) return S.ch;
  const out = ctx.destination;
  // le diesel : deux harmoniques graves qui battent, un peu de bruit sourd — le ralenti d'un moteur de camion
  const e1 = ctx.createOscillator(); e1.type = "sawtooth"; e1.frequency.value = 36;
  const e2 = ctx.createOscillator(); e2.type = "square"; e2.frequency.value = 54.5;
  const eN = noiseSrc(ctx), eNf = filt(ctx, "lowpass", 160);
  const eLP = filt(ctx, "lowpass", 210, 0.8), eng = gain(ctx);
  e1.connect(eLP); e2.connect(eLP); eN.connect(eNf).connect(eLP); eLP.connect(eng).connect(out);
  e1.start(); e2.start();
  // les vérins : un sifflement de fluide (bruit en bande étroite) sur un ronron de pompe
  const hN = noiseSrc(ctx), hBP = filt(ctx, "bandpass", 820, 7), hyd = gain(ctx);
  const hP = ctx.createOscillator(); hP.type = "triangle"; hP.frequency.value = 118;
  const hPg = ctx.createGain(); hPg.gain.value = 0.5;
  hN.connect(hBP).connect(hyd); hP.connect(hPg).connect(hyd); hyd.connect(out); hP.start();
  // la soudure : un crépitement aigu (bruit passe-haut) dont le volume tremble (une modulation rapide, pas un tirage)
  const wN = noiseSrc(ctx), wHP = filt(ctx, "highpass", 2600), wBP = filt(ctx, "peaking", 5200, 1.2), weld = gain(ctx);
  wBP.gain.value = 6;
  const wLfo = ctx.createOscillator(); wLfo.type = "square"; wLfo.frequency.value = 23;
  const wLg = ctx.createGain(); wLg.gain.value = 0.45;
  const wAmp = ctx.createGain(); wAmp.gain.value = 0.55;
  wLfo.connect(wLg).connect(wAmp.gain);
  wN.connect(wHP).connect(wBP).connect(wAmp).connect(weld).connect(out); wLfo.start();
  // la visseuse : un moteur électrique qui monte en régime par rafales (le gain est rythmé dans `update`)
  const dO = ctx.createOscillator(); dO.type = "sawtooth"; dO.frequency.value = 410;
  const dBP = filt(ctx, "bandpass", 1100, 2.2), drill = gain(ctx);
  dO.connect(dBP).connect(drill).connect(out); dO.start();
  S.ch = { eng, e1, e2, hyd, hBP, weld, drill, dO };
  return S.ch;
}

/* À chaque image où l'on est à portée du chantier : `engine`, `hyd`, `weld`, `drill` (0..1, déjà atténués par la distance),
   `reverse` (0..1 : un engin recule — le bip), `rev` (0..1 : le régime du moteur, 0 au ralenti). */
export function chantierSoundUpdate(o) {
  const ctx = ready();
  if (!ctx) { chantierSoundStop(); return; }
  S.on = true;
  const C = chains(ctx), t = ctx.currentTime;
  ramp(C.eng.gain, 0.06 * (o.engine || 0), ctx, 0.25);
  ramp(C.e1.frequency, 34 + 22 * (o.rev || 0), ctx, 0.4); ramp(C.e2.frequency, 52 + 33 * (o.rev || 0), ctx, 0.4);
  ramp(C.hyd.gain, 0.035 * (o.hyd || 0), ctx, 0.12); ramp(C.hBP.frequency, 760 + 260 * (o.hyd || 0), ctx, 0.2);
  ramp(C.weld.gain, 0.03 * (o.weld || 0), ctx, 0.06);
  // la visseuse : 0,7 s de vissage, 0,9 s de repos, une période après l'autre ; le régime monte au début de chaque vis
  const pd = 1.6, k = Math.floor(t / pd), ph = t - k * pd;
  ramp(C.drill.gain, ph < 0.7 ? 0.022 * (o.drill || 0) : 0, ctx, 0.03);
  if (k !== S.drillK) { S.drillK = k; C.dO.frequency.setValueAtTime(260, t); C.dO.frequency.linearRampToValueAtTime(470, t + 0.25); }
  // le bip de recul : un kilohertz, une demi-seconde sur deux
  if (o.reverse > 0.01) {
    const bk = Math.floor(t / 0.9);
    if (bk !== S.beepK) { S.beepK = bk; tone(ctx, 1040, 0.035 * o.reverse, 0.42); }
  }
}
export function chantierSoundStop() {
  if (!S.on || !S.ctx || !S.ch) return;
  S.on = false;
  const ctx = S.ctx, C = S.ch;
  for (const g of [C.eng, C.hyd, C.weld, C.drill]) ramp(g.gain, 0, ctx, 0.2);
}
function tone(ctx, f, g0, dur) {
  const o = ctx.createOscillator(); o.type = "square"; o.frequency.value = f;
  const lp = filt(ctx, "lowpass", 2400), g = ctx.createGain(), t = ctx.currentTime + 0.002;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(g0, t + 0.01); g.gain.setValueAtTime(g0, t + dur - 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp).connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
}
/* Un panneau de barrière posé sur ses plots (`k` 0..1, la distance comptée) : un clang métallique bref, deux partiels qui battent. */
export function chantierSoundClank(k) {
  const ctx = ready();
  if (!ctx || k < 0.02) return;
  const t = ctx.currentTime + 0.002;
  for (const [f, a] of [[620, 1], [1490, 0.6], [2730, 0.35]]) {
    const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = f;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 * k * a, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.4);
  }
}
