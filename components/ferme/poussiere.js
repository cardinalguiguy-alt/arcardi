/* ═══════════════════════════════════════════════════════════════════════════
   LA POUSSIÈRE SOUS LES PIEDS — 2026-10-04
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « marcher sur la terre (autour du marché) ou le sable,
   doit avoir un effet au niveau des pieds. Genre une petite traînée de
   poussière remuée par les pieds. »
   ⚠️⚠️ LOCALE, COMME LES PAS DANS LA NEIGE ET LES ÉCLABOUSSURES : chaque client
   soulève la poussière de ce qu'il voit marcher. Rien ne circule (§3 : ce qui se
   déduit des positions ne se diffuse pas).
   ⚠️ À LA FOULÉE, PAS À L'IMAGE : la distance parcourue s'accumule et un pied se
   pose tous les `stride` px — la traînée ne dépend pas de la cadence d'image, et
   un marcheur arrêté ne fume pas.
   ⚠️ DEUX MATIÈRES, DEUX GESTES, et c'est ce qui fait qu'on les reconnaît :
     · la TERRE BATTUE fait un petit nuage mou, qui monte et traîne derrière le
       talon, avec deux ou trois grains plus sombres qui retombent ;
     · le SABLE fait des grains qui sautent en arc et retombent vite, et à peine
       de nuage — le sable est lourd, il ne flotte pas.
   La terre labourée sèche de la ferme fait la même chose que la terre battue, en
   plus sombre et en plus discret.
   ⚠️ PAS DE POUSSIÈRE SUR UN SOL MOUILLÉ NI SOUS LA NEIGE : c'est l'appelant qui le
   dit (`mute`), parce que lui seul connaît la pluie et le manteau de sa carte.
   ⚠️ Le dessin se fait EN FILE DE TRI, comme la poussière de la glissade du
   cratère (458), mais AVANCÉ de quelques pixels (`DUST_SORT_AHEAD`) : rangée à la
   hauteur exacte du talon, la bouffée passait sous les jambes de celui qui la
   soulève — un marcheur qui descend vers l'écran la cachait TOUTE (vu en jeu le
   jour même : rien à l'écran, quarante bouffées dans la file). La poussière
   tourne autour des chevilles ; elle reste donc basse (`vz` faible) pour ne pas
   voiler le corps.
   ═══════════════════════════════════════════════════════════════════════════ */

export const DUST_STRIDE = { boot: 7, child: 5, hoof: 9 };
export const DUST_SORT_AHEAD = 6;     // px : devant les pieds du marcheur, derrière quiconque est un pas plus bas
/* Les teintes, de la plus claire à la plus sombre, en pixels d'art. Prises sur les
   tuiles qu'elles recouvrent, éclaircies d'un cran : une poussière en suspension
   est toujours plus pâle que le sol dont elle vient (elle prend la lumière). */
export const DUST_KINDS = {
  /* ⚠️ VU EN JEU, EN PLEIN JOUR : le premier jeu de teintes (le sol éclairci d'un
     seul cran) se confondait avec la terre battue — trois bouffées par pas, et rien
     à l'écran. Le nuage est maintenant nettement plus clair que son sol (crème),
     les grains, eux, restent de la couleur du sol foncé : c'est le contraste
     clair/sombre qui fait lire « de la poussière », pas la couleur. */
  earth: { cloud: ["#f2e4c6", "#e8d5b0", "#dcc49a"], grit: "#7d5f3c", nCloud: 4, nGrit: 2, a: 0.78 },
  sand:  { cloud: ["#fbf5e3", "#f3e8c8"], grit: "#b89d66", gritHi: "#fffaf0", nCloud: 2, nGrit: 5, a: 0.8 },
  soil:  { cloud: ["#cdb393", "#bda27f"], grit: "#5e432b", nCloud: 2, nGrit: 2, a: 0.6 },
};
const KIND_K = { boot: 1, child: 0.6, hoof: 1.9 };
const MAX_PUFFS = 220;

export function makeDust() {
  const steps = new Map();
  const puffs = [];
  /* `ground(gx, gy)` rend "earth" | "sand" | "soil" | null pour un point en px
     monde ; `lvl` est l'altitude de la ville (en niveaux), que l'appelant applique
     au dessin par sa propre translation (`pushE`) — jamais deux fois. */
  function emit(gx, gy, lvl, ux, uy, side, kind, g, now) {
    const D = DUST_KINDS[g];
    if (!D || puffs.length >= MAX_PUFFS) return;
    const kk = KIND_K[kind] || 1;
    const hx = gx - ux * 1.5 - uy * side * 2.5, hy = gy - uy * 1.5 + ux * side * 1.5;   // le talon, du côté du pied posé
    const parts = [];
    const nC = Math.max(1, Math.round(D.nCloud * kk)), nG = Math.max(1, Math.round(D.nGrit * kk));
    for (let i = 0; i < nC; i++) {
      parts.push({
        dx: (Math.random() - 0.5) * 2.5, dy: (Math.random() - 0.5) * 1.2,
        vx: -ux * (7 + Math.random() * 7) + (Math.random() - 0.5) * 7,
        vy: -uy * (5 + Math.random() * 5) + (Math.random() - 0.5) * 3,
        vz: 2 + Math.random() * 4, gz: -2,                 // un nuage monte à peine : il roule autour des chevilles
        life: (650 + Math.random() * 350) * (kind === "hoof" ? 1.3 : 1),
        cloud: true, c: D.cloud[i % D.cloud.length], a: D.a,
      });
    }
    for (let i = 0; i < nG; i++) {
      parts.push({
        dx: (Math.random() - 0.5) * 2, dy: (Math.random() - 0.5) * 0.8,
        vx: -ux * (10 + Math.random() * 10) + (Math.random() - 0.5) * 10,
        vy: -uy * (6 + Math.random() * 8) + (Math.random() - 0.5) * 4,
        vz: 13 + Math.random() * 11, gz: 95,               // un grain saute et retombe : un arc, pas une fumée
        life: 300 + Math.random() * 150,
        cloud: false, c: D.gritHi && Math.random() < 0.35 ? D.gritHi : D.grit, a: 0.9,
      });
    }
    puffs.push({ x: hx, y: hy, lvl: lvl || 0, t0: now, parts, big: kind === "hoof" });
  }
  return {
    /* Un marcheur, une image. `mute` : sol mouillé, neige, ou rien à soulever. */
    step(id, kind, gx, gy, lvl, now, ground, mute) {
      const stride = DUST_STRIDE[kind];
      if (!stride) return;
      let w = steps.get(id);
      if (!w) { steps.set(id, { x: gx, y: gy, acc: 0, side: 1, ux: 0, uy: 1, t: now }); return; }
      w.t = now;
      const dx = gx - w.x, dy = gy - w.y, d = Math.hypot(dx, dy);
      w.x = gx; w.y = gy;
      if (d > 32) { w.acc = 0; return; }                   // téléport, changement de zone : pas de traînée à travers la carte
      if (d < 1e-3) return;
      w.ux = w.ux * 0.4 + (dx / d) * 0.6; w.uy = w.uy * 0.4 + (dy / d) * 0.6;
      const n = Math.hypot(w.ux, w.uy) || 1; w.ux /= n; w.uy /= n;
      w.acc += d;
      while (w.acc >= stride) {
        w.acc -= stride;
        w.side = -w.side;
        if (mute) continue;
        const back = w.acc, fx = gx - (dx / d) * back, fy = gy - (dy / d) * back;
        const g = ground(fx, fy);
        if (g) emit(fx, fy, lvl, w.ux, w.uy, w.side, kind, g, now);
      }
    },
    /* Retire ce qui est fini ; oublie les marcheurs disparus. */
    prune(now) {
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        let alive = false;
        for (const q of p.parts) if (now - p.t0 < q.life) { alive = true; break; }
        if (!alive) puffs.splice(i, 1);
      }
      if (steps.size > 64) for (const [k, w] of steps) if (now - w.t > 6000) steps.delete(k);
    },
    puffs() { return puffs; },
    size() { return puffs.length; },
  };
}

/* Une bouffée, en pixels d'art (le contexte est déjà à l'échelle du monde). */
export function drawDustPuff(ctx, p, now) {
  const age = now - p.t0;
  for (const q of p.parts) {
    if (age >= q.life) continue;
    const k = age / q.life, s = age / 1000;
    const x = p.x + q.dx + q.vx * s * (1 - 0.45 * k);     // l'air freine ce qui a été lancé
    const y = p.y + q.dy + q.vy * s * (1 - 0.45 * k);
    const z = Math.max(0, q.vz * s - 0.5 * q.gz * s * s);
    if (!q.cloud && z <= 0 && s > 0.05) continue;         // le grain est retombé : il est redevenu du sol
    const a = q.a * (q.cloud ? Math.pow(1 - k, 1.4) * Math.min(1, k * 8 + 0.75) : 1 - k * k);
    if (a <= 0.02) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = q.c;
    const sz = q.cloud ? (k < (p.big ? 0.7 : 0.55) ? 2 : 1) : 1;
    ctx.fillRect(Math.round(x - sz / 2), Math.round(y - z - sz / 2), sz, sz);
  }
  ctx.globalAlpha = 1;
}
