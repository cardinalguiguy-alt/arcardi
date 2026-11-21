"use client";
/* =============================================================================
   sonGrues.js — LE CRI DES GRUES CENDRÉES (2026-11-21), SYNTHÉTISÉ.
   -----------------------------------------------------------------------------
   Une grue en migration, c'est d'abord un son : un « krrou » de trompette roulée, grave et rauque, que chaque oiseau du V lance à son
   tour, et qu'on entend avant de voir le vol (ou sans le voir du tout, quand il passe hors de l'écran). Ici :
     · un appel = une dent de scie autour de 520 à 700 Hz (chaque grue a sa voix), dont le volume ROULE (une modulation carrée à
       ~28 Hz : la gorge enroulée de l'oiseau, ce qui fait « krr » et pas « ouh »), avec une hauteur qui monte puis retombe, passée
       dans une bande de 0,9 à 2,4 kHz ; parfois redoublé (« krrou-krrou ») ;
     · les appels tombent sur l'horloge du contexte audio, découpée en créneaux de 0,3 s : un hachage (le vol, le créneau) décide si
       l'un des oiseaux appelle — AUCUN `Math.random` dans le temps (même contrat que `sonChantier.js`) ;
     · le jeu dit, à chaque image, à quel point le vol s'entend d'où l'on est (`k`, la distance déjà comptée, l'altitude comprise) et
       de quel côté (`pan`). Il cesse d'appeler `cranesSoundUpdate` dès qu'il n'y a plus de vol : plus rien n'est programmé (chaque
       appel est un événement court, programmé 0,25 s d'avance au plus — rien ne reste allumé).
   ⚠️ LE MÊME CONTEXTE AUDIO ET LA MÊME PRÉFÉRENCE QUE TOUT LE SITE (`audioContext`, `isSoundEnabled`, lib/sfx.js).
   Sous l'interrupteur des grues (`AJOUTS.cranes`, menu dev, « Ajouts de la nuit du 21 novembre »).
   ========================================================================== */
import { audioContext, isSoundEnabled } from "@/lib/sfx";

const SLOT = 0.3, AHEAD = 0.25, LOUD = 0.075;
const S = { ctx: null, master: null, pan: null, next: 0, fid: null };
function hash32(a, b) {
  let h = (Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
const u01 = (h) => (h >>> 8) / 16777216;

function ready() {
  if (!isSoundEnabled()) return null;
  const ctx = audioContext();
  if (!ctx || ctx.state !== "running") return null;
  if (S.ctx !== ctx) {
    S.ctx = ctx;
    S.master = ctx.createGain(); S.master.gain.value = 0;
    S.pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (S.pan) S.master.connect(S.pan).connect(ctx.destination); else S.master.connect(ctx.destination);
    S.next = 0;
  }
  return ctx;
}
/* Un appel à l'instant `t` (horloge audio) : `f0` la voix de l'oiseau, `dbl` redoublé. */
function call(ctx, t, f0, dbl, k) {
  const syl = (t0, dur, f) => {
    const o = ctx.createOscillator(); o.type = "sawtooth";
    o.frequency.setValueAtTime(f * 0.9, t0);
    o.frequency.linearRampToValueAtTime(f * 1.06, t0 + dur * 0.35);
    o.frequency.linearRampToValueAtTime(f * 0.82, t0 + dur);
    const rattle = ctx.createOscillator(); rattle.type = "square"; rattle.frequency.value = 26 + f * 0.004;
    const rg = ctx.createGain(); rg.gain.value = 0.42;
    const am = ctx.createGain(); am.gain.value = 0.58;
    rattle.connect(rg).connect(am.gain);
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1500; bp.Q.value = 0.9;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2600;
    const env = ctx.createGain(); env.gain.value = 0;
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(k, t0 + 0.03);
    env.gain.setValueAtTime(k * 0.85, t0 + dur * 0.6);
    env.gain.linearRampToValueAtTime(0, t0 + dur);
    o.connect(am).connect(bp).connect(lp).connect(env).connect(S.master);
    o.start(t0); rattle.start(t0); o.stop(t0 + dur + 0.02); rattle.stop(t0 + dur + 0.02);
  };
  syl(t, 0.3, f0);
  if (dbl) syl(t + 0.38, 0.26, f0 * 0.97);
}
/* À chaque image où un vol existe : `k` (0..1) combien il s'entend d'ici, `pan` (−1..1) de quel côté, `fid` le vol, `n` ses grues. */
export function cranesSoundUpdate({ k, pan, fid, n }) {
  const ctx = ready();
  if (!ctx) return;
  const now = ctx.currentTime;
  S.master.gain.setTargetAtTime(Math.max(0, Math.min(1, k || 0)) * LOUD, now, 0.25);
  if (S.pan) S.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan || 0)) * 0.7, now, 0.3);
  if (!(k > 0.01)) { S.next = 0; return; }
  if (S.fid !== fid) { S.fid = fid; S.next = 0; }
  let j = S.next ? S.next : Math.ceil(now / SLOT);
  // un V entier appelle plus souvent qu'un petit : 25 % à 45 % des créneaux
  const rate = 0.25 + 0.2 * Math.min(1, ((n || 9) - 7) / 8);
  for (; j * SLOT < now + AHEAD; j++) {
    if (j * SLOT < now) continue;
    const h = hash32(j * 7 + 3, (fid | 0) * 131 + 11);
    if (u01(h) >= rate) continue;
    const bird = hash32(h, 5) % Math.max(1, n || 9);
    const f0 = 520 + (hash32(bird + 1, (fid | 0) + 77) % 180);
    call(ctx, j * SLOT + u01(hash32(h, 9)) * 0.12, f0, u01(hash32(h, 13)) < 0.35, 1);
  }
  S.next = j;
}
