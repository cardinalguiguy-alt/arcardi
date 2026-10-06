/* =============================================================================
   duo.js — LES FIGURES À DEUX SUR LA GLACE (2026-10-06 soir), PUR.
   -----------------------------------------------------------------------------
   Guillaume : « inventer des figures à deux (animations avec coordination de commandes des deux côtés, deux joueurs se
   tiennent la main sur la glace et font une figure à deux) ».

   ⚠️ LA COORDINATION EST DANS LE GESTE, PAS DANS LE RÉSEAU : H tend la main (figure au choix : H de nouveau la change), H chez
   l'autre l'accepte — deux commandes, une de chaque côté, sinon rien ne part. L'hôte arbitre (`duoAsk`, `duoYes`) et ne
   rediffuse que DES NOMS ET DES DURÉES (`{ a, b, fig, hx, hy, len }`) : aucune position ne circule (§3 de CLAUDE.md).
   ⚠️ CHAQUE CLIENT CALCULE LES DEUX PATINEURS, d'après SA vue des deux positions de départ (`duoPlan`), à partir de l'instant
   où il a reçu l'ordre (chacun date à la réception). Les deux écrans peuvent différer d'une fraction de case — c'est la
   cohérence DE CHAQUE ÉCRAN qui compte : les mains jointes se touchent toujours. Les poses des figures (`pose`, `ph`, `air`,
   `spin`) sont celles que `A.drawSkate` sait déjà dessiner ; ce fichier ne dessine rien.
   ⚠️ UNE FIGURE EST UNE FONCTION DU TEMPS DEPUIS L'ORDRE (`duoAt`), jamais un état qui avance : rejouable, testable
   (`tools/verify-duo.mjs`). Tout se passe en coordonnées de SEMELLE (`C.footX`, `C.footY`), en cases ; `dir` : 0 bas, 1 haut,
   2 gauche, 3 droite (comme le reste du jeu).
   ========================================================================== */
import * as C from "./fermeConstants.mjs";

export const DUO = {
  REACH: 2.6,        // cases : la portée pour tendre la main (entre semelles)
  ASK_MS: 7000,      // l'offre tient 7 s
  MAX_V: 3.2,        // cases/s : on ne tend pas la main en pleine course (l'un et l'autre)
  FIGS: ["ronde", "parade", "saut"],
  DUR: { ronde: 3.0, parade: 2.4, saut: 2.3 },      // secondes
  LAND_U: { saut: 0.82 },                           // la progression où l'on retombe (la gerbe)
  HANDS: { gap: 1.0 },                             // l'écart entre deux patineurs côte à côte
};
/* Le nom d'un code de figure (jamais autre chose que ces trois, l'hôte refuse le reste). */
export function duoFigOk(f) { return DUO.FIGS.indexOf(f) >= 0; }
export function duoFigNext(f) { return DUO.FIGS[(DUO.FIGS.indexOf(f) + 1) % DUO.FIGS.length]; }

const sm = (u) => { const k = Math.max(0, Math.min(1, u)); return k * k * (3 - 2 * k); };
const dirOf = (vx, vy, prev) => (Math.hypot(vx, vy) < 1e-6 ? prev : Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 2 : 3) : (vy < 0 ? 1 : 0));

/* Le plan d'une figure, depuis les deux semelles de départ `a0`, `b0` ({x,y}) et le cap (hx,hy) du proposant, `len` la
   longueur de glisse (parade, saut). Le cap est ramené à l'unité ; un cap nul devient « vers la droite ». */
export function duoPlan(fig, a0, b0, hx, hy, len) {
  let l = Math.hypot(hx || 0, hy || 0); if (!(l > 1e-6)) { hx = 1; hy = 0; l = 1; }
  hx /= l; hy /= l;
  const cx = (a0.x + b0.x) / 2, cy = (a0.y + b0.y) / 2;
  return { fig, a0: { x: a0.x, y: a0.y }, b0: { x: b0.x, y: b0.y }, hx, hy, sx: -hy, sy: hx, len: Math.max(0, +len || 0), cx, cy, dur: DUO.DUR[fig] || 2.4 };
}

/* La figure à l'instant `t` (secondes depuis l'ordre) : { done, u, a, b, vA, vB, landed } ; `a`/`b` = { x, y, dir, pose, ph,
   air, spin } (semelle, cases). Passé `dur`, la figure est finie et les deux patineurs gardent leur dernière place. */
export function duoAt(P, t) {
  const u = Math.max(0, Math.min(1, t / P.dur)), out = { done: t >= P.dur, u };
  const one = (who) => {
    const o = who === "a" ? P.a0 : P.b0, sgn = who === "a" ? 1 : -1;
    const pos = (uu) => {
      const k = Math.max(0, Math.min(1, uu));
      if (P.fig === "ronde") {
        const d0 = Math.max(0.3, Math.hypot(P.a0.x - P.b0.x, P.a0.y - P.b0.y) / 2), R = 0.62;
        const th0 = Math.atan2(P.a0.y - P.cy, P.a0.x - P.cx), th = th0 + 3 * Math.PI * sm(k);   // un tour et demi, départ et arrivée doux
        const r = d0 + (R - d0) * sm(k / 0.2);
        return { x: P.cx + sgn * r * Math.cos(th), y: P.cy + sgn * r * Math.sin(th), th, r };
      }
      // côte à côte : le milieu avance le long du cap, chacun se range à ±gap/2 de lui
      const adv = P.fig === "parade" ? P.len * (1 - (1 - k) * (1 - k)) : P.len * Math.sin(k * Math.PI / 2);
      const mx = P.cx + P.hx * adv, my = P.cy + P.hy * adv, kk = sm(k / 0.3);
      const dx = o.x - P.cx, dy = o.y - P.cy, lon = dx * P.hx + dy * P.hy, lat = dx * P.sx + dy * P.sy;
      const side = Math.sign((P.a0.x - P.b0.x) * P.sx + (P.a0.y - P.b0.y) * P.sy) || 1, tgt = sgn * side * DUO.HANDS.gap / 2;
      const la = lat * (1 - kk) + tgt * kk, lo = lon * (1 - kk);
      return { x: mx + P.hx * lo + P.sx * la, y: my + P.hy * lo + P.sy * la };
    };
    const p0 = pos(u), p1 = pos(u + 0.01), vx = (p1.x - p0.x) / (0.01 * P.dur), vy = (p1.y - p0.y) / (0.01 * P.dur), sp = Math.hypot(vx, vy);
    let dir, pose = "glide", air = 0, spin = 0;
    if (P.fig === "ronde") {
      dir = dirOf(vx, vy, 0);
      // la distance parcourue sert de foulée : on lit l'arc (r·dθ) au pas près
      let arc = 0, prev = pos(0);
      for (let i = 1; i <= 24; i++) { const q = pos(u * i / 24); arc += Math.hypot(q.x - prev.x, q.y - prev.y); prev = q; }
      return { x: p0.x, y: p0.y, dir, pose: sp > 0.35 ? "glide" : "stand", ph: arc / 2.4, air: 0, spin: 0, vx, vy };
    }
    dir = dirOf(P.hx, P.hy, 0);
    let arc = 0, prev = pos(0);
    for (let i = 1; i <= 24; i++) { const q = pos(u * i / 24); arc += Math.hypot(q.x - prev.x, q.y - prev.y); prev = q; }
    let ph = arc / 2.4;
    if (P.fig === "parade") { if (u > 0.22 && u < 0.88) { pose = "swan"; ph = u * P.dur; } else if (sp < 0.35) pose = "stand"; }
    else {   // le saut synchro : on glisse, on saute ENSEMBLE (même hauteur), un tour et demi, on retombe en gerbe
      const j0 = 0.34, j1 = DUO.LAND_U.saut;
      if (u >= j0 && u < j1) { const v = (u - j0) / (j1 - j0); pose = "axel"; air = 14 * Math.sin(v * Math.PI); spin = 1.5 * (v * v * (3 - 2 * v) * 0.5 + v * 0.5); ph = spin; }
      else if (u >= j1 && sp < 0.35) pose = "stand";
    }
    return { x: p0.x, y: p0.y, dir, pose, ph, air, spin, vx, vy };
  };
  out.a = one("a"); out.b = one("b");
  out.landed = P.fig === "saut" && u >= DUO.LAND_U.saut;
  return out;
}

/* Le plan tient-il sur la glace ? Chaque pas de la figure doit rester à ≥ 0,45 case de la bande (`C.rinkInside` sur le pourtour
   d'une semelle). Rend `{ ok, len }` : pour la parade et le saut, la longueur de glisse est RACCOURCIE jusqu'à tenir (de 7 à
   2,5 cases) ; s'il n'en tient aucune, ok = false. */
export function duoSpace(fig, a0, b0, hx, hy) {
  const inside = (p) => [[0.45, 0], [-0.45, 0], [0, 0.45], [0, -0.45], [0, 0]].every(([dx, dy]) => C.rinkInside(p.x + dx, p.y + dy));
  const fits = (len) => {
    const P = duoPlan(fig, a0, b0, hx, hy, len);
    for (let i = 0; i <= 30; i++) { const r = duoAt(P, P.dur * i / 30); if (!inside(r.a) || !inside(r.b)) return false; }
    return true;
  };
  if (fig === "ronde") return { ok: fits(0), len: 0 };
  const top = fig === "parade" ? 7 : 4.5;
  for (let len = top; len >= 2.5 - 1e-9; len -= 0.5) if (fits(len)) return { ok: true, len };
  return { ok: false, len: 0 };
}
