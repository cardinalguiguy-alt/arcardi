/* =============================================================================
   sonMaison.js — LES SONS DE LA MAISON (2026-10-22, lot 4 des intérieurs)
   -----------------------------------------------------------------------------
   La SONNETTE : un « ding-dong » de carillon de porte (deux notes, mi puis do, en
   cloche tubulaire : un fondamental et deux partiels inharmoniques qui s'éteignent
   plus vite que lui). Synthétisée, comme les sons du park et du chantier : aucun
   fichier à charger, et elle respecte le réglage du son (`isSoundEnabled`).
   Elle sonne chez le PROPRIÉTAIRE, où qu'il soit (on sonne chez lui), et chez le
   visiteur au moment où il appuie (il s'entend sonner).
   ========================================================================== */
import { audioContext, isSoundEnabled } from "@/lib/sfx";

function ready() {
  if (!isSoundEnabled()) return null;
  const ctx = audioContext();
  return ctx && ctx.state === "running" ? ctx : null;
}
function cloche(ctx, f, t, a) {
  for (const [k, g, d] of [[1, 1, 1.6], [2.76, 0.32, 0.6], [5.4, 0.12, 0.3]]) {
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f * k;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(0.09 * a * g, t + 0.008);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(gn).connect(ctx.destination); o.start(t); o.stop(t + d + 0.05);
  }
}
/* `a` : la force (1 chez le propriétaire, plus faible chez le visiteur, qui l'entend à travers la porte). */
export function homeDingDong(a = 1) {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime + 0.01;
  cloche(ctx, 659.3, t, a);          // mi
  cloche(ctx, 523.3, t + 0.42, a);   // do
}
