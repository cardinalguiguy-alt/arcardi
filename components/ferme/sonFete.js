"use client";
/* =============================================================================
   sonFete.js — LA FÊTE DU NAVIRE S'ENTEND (2026-11-08, G9-G11), SYNTHÉTISÉ.
   -----------------------------------------------------------------------------
   La cloche du navire (trois coups), une fanfare de place (cuivres, tuba, caisse claire, grosse caisse), la foule (le
   brouhaha, les vivats, les huées, les applaudissements), la bouteille qui éclate, la mise à l'eau, le vent de l'orage, le
   feu d'artifice (le sifflet, l'éclatement, le crépitement), l'ancre et sa chaîne. Le tonnerre est le fichier du jeu
   (`C.THUNDER_SRC`), joué par l'appelant.
   ⚠️ MÊME CONTEXTE AUDIO ET MÊME PRÉFÉRENCE QUE TOUT LE SITE (`audioContext`, `isSoundEnabled`, `isMusicEnabled` pour la
   fanfare), même contrat que `sonChantier.js`. ⚠️ AUCUN `Math.random` DANS LE TEMPS : les événements sont des DATES de la
   chronologie (`fete.js`), joués une fois chacun (`S.played`) ; la fanfare est une partition lue à sa mesure, ce qui fait
   que deux joueurs l'entendent au même temps fort.
   ========================================================================== */
import { audioContext, isSoundEnabled, isMusicEnabled } from "@/lib/sfx";

const S = { ctx: null, noise: null, ch: null, on: false, played: new Set(), key: null, lastT: 0, notes: new Set() };

function ready() {
  if (!isSoundEnabled()) return null;
  const ctx = audioContext();
  if (!ctx || ctx.state !== "running") return null;
  if (S.ctx !== ctx) { S.ctx = ctx; S.noise = null; S.ch = null; }
  if (!S.noise) {
    const n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    let seed = 424242;
    for (let i = 0; i < n; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; d[i] = seed / 0x7fffffff * 2 - 1; }
    S.noise = buf;
  }
  return ctx;
}
const ramp = (param, v, ctx, tc) => param.setTargetAtTime(v, ctx.currentTime, tc || 0.12);
function filt(ctx, type, f, q) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; }
function noiseSrc(ctx, loop) { const s = ctx.createBufferSource(); s.buffer = S.noise; s.loop = !!loop; return s; }

/* Les voix continues : le brouhaha de la foule, le vent de l'orage. */
function chains(ctx) {
  if (S.ch) return S.ch;
  const out = ctx.destination;
  const mN = noiseSrc(ctx, true), mBP = filt(ctx, "bandpass", 520, 0.9), mLP = filt(ctx, "lowpass", 1400), mur = ctx.createGain(); mur.gain.value = 0;
  const mLfo = ctx.createOscillator(); mLfo.frequency.value = 0.7; const mLg = ctx.createGain(); mLg.gain.value = 140; mLfo.connect(mLg).connect(mBP.frequency);
  mN.connect(mBP).connect(mLP).connect(mur).connect(out); mN.start(); mLfo.start();
  const wN = noiseSrc(ctx, true), wBP = filt(ctx, "bandpass", 420, 1.6), wind = ctx.createGain(); wind.gain.value = 0;
  const wLfo = ctx.createOscillator(); wLfo.frequency.value = 0.18; const wLg = ctx.createGain(); wLg.gain.value = 260; wLfo.connect(wLg).connect(wBP.frequency);
  wN.connect(wBP).connect(wind).connect(out); wN.start(); wLfo.start();
  S.ch = { mur, mBP, wind };
  return S.ch;
}
function env(ctx, g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function noiseHit(ctx, t, type, f, q, peak, a, d, sweepTo) {
  const n = noiseSrc(ctx), bf = filt(ctx, type, f, q), g = ctx.createGain();
  if (sweepTo) bf.frequency.exponentialRampToValueAtTime(sweepTo, t + a + d);
  env(ctx, g, t, a, peak, d); n.connect(bf).connect(g).connect(ctx.destination); n.start(t, (t * 7.31) % 1.5); n.stop(t + a + d + 0.05);
}
function osc(ctx, t, type, f, peak, a, d, fTo) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (fTo) o.frequency.exponentialRampToValueAtTime(fTo, t + a + d);
  const g = ctx.createGain(); env(ctx, g, t, a, peak, d); o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + a + d + 0.05);
}
/* Les sons ponctuels (k : 0..1, la distance déjà comptée). */
const ONE = {
  bell(ctx, t, k) { for (const [r, a, d] of [[1, 1, 2.6], [2.0, 0.5, 1.8], [2.76, 0.35, 1.2], [5.4, 0.18, 0.6], [1.19, 0.3, 2.2]]) osc(ctx, t, "sine", 523 * r, 0.11 * k * a, 0.004, d); },
  smash(ctx, t, k) { noiseHit(ctx, t, "highpass", 3200, 0.7, 0.16 * k, 0.002, 0.25); for (let i = 0; i < 6; i++) osc(ctx, t + i * 0.025, "sine", 3100 + i * 640, 0.04 * k, 0.002, 0.18 + i * 0.03); noiseHit(ctx, t + 0.02, "lowpass", 900, 0.8, 0.08 * k, 0.01, 0.5); },
  splash(ctx, t, k) { noiseHit(ctx, t, "lowpass", 1300, 0.6, 0.16 * k, 0.02, 0.9, 380); },
  cheer(ctx, t, k) { for (let i = 0; i < 5; i++) noiseHit(ctx, t + i * 0.09, "bandpass", 900 + i * 260, 3.5, 0.05 * k, 0.15, 1.6, 1300 + i * 200); this.clap(ctx, t + 0.3, k * 0.9); },
  boo(ctx, t, k) { for (let i = 0; i < 4; i++) noiseHit(ctx, t + i * 0.12, "bandpass", 330 + i * 35, 5, 0.07 * k, 0.25, 1.4, 210); },
  clap(ctx, t, k) { for (let i = 0; i < 46; i++) { const dt = ((i * 0.6180339) % 1) * 2.2; noiseHit(ctx, t + dt, "bandpass", 1800 + (i % 7) * 260, 1.2, 0.035 * k, 0.001, 0.05); } },
  toss(ctx, t, k) { osc(ctx, t, "triangle", 1900, 0.05 * k, 0.002, 0.25); osc(ctx, t + 1.5, "triangle", 1500, 0.06 * k, 0.002, 0.3); },
  whistle(ctx, t, k) { osc(ctx, t, "sine", 700, 0.03 * k, 0.05, 1.0, 2200); },
  burst(ctx, t, k) { noiseHit(ctx, t, "lowpass", 600, 0.7, 0.22 * k, 0.003, 0.7, 120); osc(ctx, t, "sine", 70, 0.16 * k, 0.003, 0.45, 38); },
  crackle(ctx, t, k) { for (let i = 0; i < 22; i++) noiseHit(ctx, t + 0.9 + ((i * 0.381966) % 1) * 1.4, "highpass", 2400, 0.8, 0.03 * k, 0.001, 0.025); },
  chain(ctx, t, k) { for (let i = 0; i < 16; i++) { const tt = t + i * 0.085; osc(ctx, tt, "triangle", 900 + (i % 3) * 230, 0.03 * k, 0.001, 0.07); noiseHit(ctx, tt, "bandpass", 2600, 2, 0.02 * k, 0.001, 0.04); } },
  rope(ctx, t, k) { noiseHit(ctx, t, "bandpass", 700, 1.2, 0.07 * k, 0.01, 0.25); osc(ctx, t, "sine", 140, 0.06 * k, 0.005, 0.2, 90); },
};
/* La fanfare : une marche à 116 battements, huit mesures en boucle. Les cuivres (dents de scie filtrées, un vibrato), le
   tuba (la basse, un temps sur deux), la caisse claire (sur 2 et 4) et la grosse caisse (sur 1 et 3). Chaque note est une
   DATE de la chronologie : on programme ce qui tombe dans le prochain quart de seconde, une fois. */
const BPM = 116, BEAT = 60 / BPM;
const MEL = [ // [temps, demi-tons au-dessus de do4, durée en temps]
  [0, 7, 1], [1, 7, 0.5], [1.5, 9, 0.5], [2, 11, 1], [3, 7, 1], [4, 12, 1.5], [5.5, 11, 0.5], [6, 9, 1], [7, 7, 1],
  [8, 5, 1], [9, 5, 0.5], [9.5, 7, 0.5], [10, 9, 1], [11, 5, 1], [12, 11, 1.5], [13.5, 9, 0.5], [14, 7, 2],
  [16, 7, 1], [17, 7, 0.5], [17.5, 9, 0.5], [18, 11, 1], [19, 12, 1], [20, 14, 1.5], [21.5, 12, 0.5], [22, 11, 1], [23, 9, 1],
  [24, 7, 1], [25, 9, 1], [26, 11, 0.5], [26.5, 9, 0.5], [27, 7, 1], [28, 12, 3],
];
const BASS = [0, 7, 0, 7, -7, 2, -7, 2, 0, 7, 0, 7, -5, 2, 0, 0];   // une note par deux temps (16 → 32 temps)
const f0 = (st) => 261.63 * Math.pow(2, st / 12);
function brass(ctx, t, st, dur, k) {
  const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f0(st);
  const o2 = ctx.createOscillator(); o2.type = "square"; o2.frequency.value = f0(st) * 1.003;
  const vib = ctx.createOscillator(); vib.frequency.value = 5.2; const vg = ctx.createGain(); vg.gain.value = 3; vib.connect(vg).connect(o.frequency);
  const lp = filt(ctx, "lowpass", 1800, 1.1), g = ctx.createGain();
  lp.frequency.setValueAtTime(900, t); lp.frequency.linearRampToValueAtTime(2200, t + 0.06);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.045 * k, t + 0.03); g.gain.setValueAtTime(0.04 * k, t + dur * BEAT * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * BEAT);
  const m = ctx.createGain(); m.gain.value = 0.35; o2.connect(m).connect(lp);
  o.connect(lp).connect(g).connect(ctx.destination); for (const x of [o, o2, vib]) { x.start(t); x.stop(t + dur * BEAT + 0.05); }
}
function fanfareTick(ctx, t0Host, tHost, k) {
  if (!isMusicEnabled()) return;
  const now = ctx.currentTime, ahead = 0.35;
  const rel = (tHost - t0Host) / 1000;               // en secondes depuis le début de la section
  const bar32 = 32 * BEAT;
  for (const loopShift of [0, 1]) {
    const loop = Math.floor(rel / bar32) + loopShift, base = loop * bar32;
    const at = (beat) => now + (base + beat * BEAT - rel);
    const once = (id, beat, fn) => { const tt = at(beat); if (tt < now - 0.02 || tt > now + ahead) return; const key = t0Host + ":" + loop + ":" + id; if (S.notes.has(key)) return; S.notes.add(key); fn(Math.max(now, tt)); };
    MEL.forEach(([b, st, d], i) => once("m" + i, b, (tt) => brass(ctx, tt, st, d, k)));
    BASS.forEach((st, i) => once("b" + i, i * 2, (tt) => osc(ctx, tt, "triangle", f0(st - 24), 0.09 * k, 0.01, BEAT * 1.6)));
    for (let b = 0; b < 32; b++) {
      if (b % 2 === 1) once("s" + b, b, (tt) => noiseHit(ctx, tt, "bandpass", 1900, 0.9, 0.05 * k, 0.001, 0.12));
      else once("k" + b, b, (tt) => osc(ctx, tt, "sine", 110, 0.12 * k, 0.002, 0.18, 45));
    }
  }
  if (S.notes.size > 4000) S.notes.clear();
}

/* À chaque image où la fête est en cours et que l'on est en ville. `o` : { t (heure de l'hôte), ev (les événements datés :
   [{ id, t, kind }]), sections ([{ t0, t1 }] : la fanfare), murmur (0..1), wind (0..1), near (0..1 : la distance au quai) }. */
export function feteSoundUpdate(o) {
  const ctx = ready();
  if (!ctx) { feteSoundStop(); return; }
  S.on = true;
  const ch = chains(ctx), near = Math.max(0, Math.min(1, o.near == null ? 1 : o.near));
  ramp(ch.mur.gain, 0.05 * (o.murmur || 0) * near, ctx, 0.6);
  ramp(ch.wind.gain, 0.09 * (o.wind || 0) * Math.max(0.4, near), ctx, 0.5);
  if (o.key !== S.key) { S.key = o.key; S.played.clear(); S.lastT = o.t; }
  const from = Math.max(S.lastT, o.t - 1500);
  for (const e of o.ev || []) {
    if (e.t > from && e.t <= o.t + 30 && !S.played.has(e.id)) {
      S.played.add(e.id);
      const f = ONE[e.kind]; if (f) f.call(ONE, ctx, ctx.currentTime + Math.max(0, (e.t - o.t) / 1000) + 0.005, near * (e.k == null ? 1 : e.k));
    }
  }
  S.lastT = o.t;
  for (const sec of o.sections || []) if (o.t >= sec.t0 && o.t < sec.t1) fanfareTick(ctx, sec.t0, o.t, near);
}
export function feteSoundStop() {
  if (!S.on || !S.ctx || !S.ch) return;
  S.on = false;
  ramp(S.ch.mur.gain, 0, S.ctx, 0.4); ramp(S.ch.wind.gain, 0, S.ctx, 0.4);
}
