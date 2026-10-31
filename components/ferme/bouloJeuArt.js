/* =============================================================================
   bouloJeuArt.js — LE BOULODROME, LOT 3 : CE QUI SE DESSINE PENDANT UNE PARTIE (2026-10-31)
   -----------------------------------------------------------------------------
   Les boules d'ACIER à BANDE de couleur, le cochonnet ORANGE, leurs ombres ; le cercle de craie ; le GUIDE de visée (l'arc
   pointillé, l'anneau doré de la donnée, le roulé sur le plat, la boule fantôme) ; la JAUGE au-dessus du joueur ; l'ANNEAU de
   craie du point ; le « +2 » de la fin de mène. Les verdicts : docs/PROJETS.md §11 (lot 3), maquettes sur le vrai sable de la page.
   ⚠️⚠️ TOUT SE POSE AU PIXEL D'ÉCRAN, PAS AU PIXEL D'ART (le premier tour l'a décidé : « 3 pixels du jeu, dessinées au pixel de
   l'écran pour rester nettes à ×3 »). Une boule de 3 px d'art agrandie au plus proche serait un carré de 9 × 9 ; dessinée à 9 px
   d'écran, c'est une sphère. L'appelant passe le `ctx` du monde (sa transformation) : on lit `getTransform()`, on convertit le
   point du monde en pixel d'écran, et on pose une image cuite à cette taille (`spriteBoule(k, …)`, en cache par cran entier).
   Pendant un fondu de zoom (cran fractionnaire), le cran est arrondi : une boule ne grossit pas d'un demi-pixel.
   ⚠️ LE FAUX CANEVAS DES BANCS IGNORE `setTransform` : les bancs passent un cran explicite (`k`) et un repère d'écran.
   ========================================================================== */
import { PETANQUE } from "./petanque";
import { drawPixelText } from "./pixelFont";

const PX_M = PETANQUE.PX_M;
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/* ── LES SPHÈRES ──
   Éclairées d'en haut à gauche (le soleil du jeu), quatre tons quantifiés comme le pixel art de la ville — jamais un dégradé
   lisse : ombre, corps, clair, et le point de reflet (à partir du cran 2 : à 3 px, il mangerait la boule). La bande se lit
   juste sous l'équateur (une boule posée montre sa bande de profil), dans les tons de la couleur du joueur. */
const ACIER = ["#454b54", "#7f8892", "#b9c1c9", "#eef2f5"];
const ORANGE = ["#9c4416", "#e2702a", "#ff9e55", "#ffe0b8"];
function sphere(D, tons, bande) {
  const c = mk(D, D), g = c.getContext("2d"), im = g.createImageData ? g.createImageData(D, D) : { data: new Uint8ClampedArray(D * D * 4), width: D, height: D };
  const r = D / 2, L = [-0.47, -0.62, 0.63], T = tons.map(hx), Bt = bande ? [mix(hx(bande), [0, 0, 0], 0.45), mix(hx(bande), [0, 0, 0], 0.15), hx(bande), mix(hx(bande), [255, 255, 255], 0.45)] : null;
  for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) {
    const dx = (i + 0.5 - r) / r, dy = (j + 0.5 - r) / r, q = dx * dx + dy * dy;
    if (q > 1.0001 + (D <= 3 ? 0.4 : D <= 5 ? 0.15 : 0)) continue;
    const nz = Math.sqrt(Math.max(0, 1 - q)), lam = dx * L[0] + dy * L[1] + nz * L[2];
    let t = lam < 0.22 ? 0 : lam < 0.62 ? 1 : lam < 0.9 || D < 6 ? 2 : 3;
    if (q > 0.72 && dy > 0.15) t = 0;                     // le bord bas reste sombre : la boule repose, elle ne flotte pas
    const inBand = Bt && dy > 0.12 && dy < 0.52 && t < 3;
    const col = inBand ? Bt[Math.min(2, t + (t === 0 ? 0 : 0))] : T[t];
    const k = (j * D + i) * 4;
    im.data[k] = col[0]; im.data[k + 1] = col[1]; im.data[k + 2] = col[2]; im.data[k + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  return c;
}
const CACHE = new Map();
const cached = (key, f) => { let v = CACHE.get(key); if (!v) CACHE.set(key, (v = f())); return v; };
/** Le diamètre d'écran d'une boule (3 px d'art) et du cochonnet (la moitié) au cran `k`. */
export const diamBoule = (k) => Math.max(3, Math.round(3 * k));
export const diamBut = (k) => Math.max(2, Math.round(1.5 * k));
export const spriteBoule = (k, couleur) => cached("b" + k + couleur, () => sphere(diamBoule(k), ACIER, couleur));
export const spriteBut = (k) => cached("c" + k, () => sphere(diamBut(k), ORANGE, null));
/** L'ombre au sol : une ellipse pleine, au pixel d'écran (un tiers de noir). */
const spriteOmbre = (D) => cached("o" + D, () => {
  const w = D + 1, h = Math.max(2, Math.round(D / 2)), c = mk(w, h), g = c.getContext("2d");
  g.fillStyle = "rgba(20,14,8,0.32)";
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dx = (i + 0.5 - w / 2) / (w / 2), dy = (j + 0.5 - h / 2) / (h / 2);
    if (dx * dx + dy * dy <= 1) g.fillRect(i, j, 1, 1);
  }
  return c;
});
/* Un anneau d'un pixel (ou deux) d'écran, rayon `R` : la craie (le cercle de lancer, le point), l'or (la donnée). */
const spriteAnneau = (R, ep, col) => cached("a" + R + "|" + ep + "|" + col, () => {
  const D = 2 * R + 2, c = mk(D, D), g = c.getContext("2d");
  g.fillStyle = col;
  for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) {
    const d = Math.sqrt((i + 0.5 - D / 2) ** 2 + (j + 0.5 - D / 2) ** 2);
    if (d <= R + 0.5 && d > R + 0.5 - ep) g.fillRect(i, j, 1, 1);
  }
  return c;
});

/* ── LE PASSAGE DU MONDE À L'ÉCRAN ── */
/** Le cran entier courant (écran par px d'art) et une fonction monde → écran, lus sur la transformation du contexte. */
export function repere(ctx) {
  const M = ctx.getTransform ? ctx.getTransform() : { a: 1, d: 1, e: 0, f: 0 };
  const k = Math.max(1, Math.round(M.a));
  return { k, sx: (wx) => M.a * wx + M.e, sy: (wy) => M.d * wy + M.f };
}
function poser(ctx, img, x, y) {
  ctx.save(); if (ctx.setTransform) ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
  ctx.restore();
}

/** Une boule (ou le cochonnet) posée ou en vol : `wx`, `wy` le point au SOL (px du monde), `z` sa hauteur (m). L'ombre reste au
    sol, la boule monte de `z` (noyau §4 : « un dessin rejoué en ombre rejoue aussi ses décalages de hauteur » — ici l'inverse). */
export function dessinerBoule(ctx, R, wx, wy, z, couleur, but, alpha = 1) {
  const k = R.k, D = but ? diamBut(k) : diamBoule(k), x = R.sx(wx), y = R.sy(wy);
  const lift = Math.round((z || 0) * PX_M * k);
  ctx.save(); ctx.globalAlpha *= alpha;
  const om = spriteOmbre(D), sh = Math.max(0, 1 - (z || 0) / 3);
  ctx.globalAlpha *= 0.4 + 0.6 * sh;
  poser(ctx, om, x, y + D / 2 - om.height / 2 + 1);
  ctx.globalAlpha = alpha;
  poser(ctx, but ? spriteBut(k) : spriteBoule(k, couleur), x, y - lift);
  ctx.restore();
}
/** Le cercle de lancer, tracé à la craie (rayon réel : 25 cm). `faible` : le cercle d'une piste libre, une invitation. */
export function dessinerCercle(ctx, R, wx, wy, faible) {
  const Rp = Math.max(3, Math.round(PETANQUE.CERCLE_R * PX_M * R.k));
  ctx.save(); ctx.globalAlpha *= faible ? 0.45 : 0.85;
  poser(ctx, spriteAnneau(Rp, Math.max(1, Math.round(R.k / 2)), "#f3eee0"), R.sx(wx), R.sy(wy));
  ctx.restore();
}
/** L'anneau de craie du point, autour de la boule la plus proche du cochonnet. */
export function dessinerPoint(ctx, R, wx, wy) {
  const Rp = Math.round(diamBoule(R.k) / 2) + Math.max(2, R.k);
  ctx.save(); ctx.globalAlpha *= 0.9;
  poser(ctx, spriteAnneau(Rp, Math.max(1, Math.round(R.k / 2)), "#f6f1e2"), R.sx(wx), R.sy(wy));
  ctx.restore();
}

/** LE GUIDE : `g` = `bouloJeu.guide(…)` (mètres de la piste), `versMonde(mx, my)` → [wx, wy]. L'arc en points blancs (le vol,
    hauteur comprise), l'anneau doré de la donnée, le roulé en pointillé au sol jusqu'à la boule fantôme (l'arrêt sur le plat). */
export function dessinerGuide(ctx, R, g, versMonde, couleur, but) {
  if (!g) return;
  const k = R.k, dot = Math.max(1, Math.round(k / 2)), p = [0, 0];
  ctx.save(); if (ctx.setTransform) ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "rgba(255,252,240,0.92)";
  for (let i = 1; i < g.arc.length - 1; i++) {
    const a = g.arc[i], w = versMonde(a[0], a[1], p);
    ctx.fillRect(Math.round(R.sx(w[0]) - dot / 2), Math.round(R.sy(w[1]) - a[2] * PX_M * k - dot / 2), dot, dot);
  }
  if (g.arret) {
    const d0 = versMonde(g.donnee[0], g.donnee[1], [0, 0]), d1 = versMonde(g.arret[0], g.arret[1], [0, 0]);
    const L = Math.sqrt((d1[0] - d0[0]) ** 2 + (d1[1] - d0[1]) ** 2), n = Math.floor(L / 3);
    ctx.fillStyle = "rgba(255,252,240,0.7)";
    for (let i = 1; i < n; i++) { const f = i / n; ctx.fillRect(Math.round(R.sx(d0[0] + (d1[0] - d0[0]) * f) - dot / 2), Math.round(R.sy(d0[1] + (d1[1] - d0[1]) * f) - dot / 2), dot, dot); }
  }
  ctx.restore();
  const w = versMonde(g.donnee[0], g.donnee[1], [0, 0]);
  poser(ctx, spriteAnneau(Math.max(3, Math.round(1.6 * k)), Math.max(1, Math.round(k / 2)), "#f2c23e"), R.sx(w[0]), R.sy(w[1]));
  if (g.arret) { const a = versMonde(g.arret[0], g.arret[1], [0, 0]); dessinerBoule(ctx, R, a[0], a[1], 0, couleur, but, 0.45); }
}

/** LA JAUGE, au-dessus du joueur (`wx`, `wy` : le haut de sa tête, px du monde) : un arc de bois clair, la marque dorée au milieu,
    l'aiguille (`v` ∈ [−1, 1], la valeur de `petanque.jauge` ÷ 1000) qui va et vient. Court à gauche, long à droite — toujours le
    même sens, ça s'apprend. */
export function dessinerJauge(ctx, R, wx, wy, v) {
  const k = R.k, Rr = 6 * k + 2, cx = Math.round(R.sx(wx)), cy = Math.round(R.sy(wy) - 3 * k) + Rr;
  const fond = cached("j" + k, () => {
    const D = 2 * Rr + 3, c = mk(D, Rr + 3), g = c.getContext("2d");
    for (let j = 0; j < Rr + 3; j++) for (let i = 0; i < D; i++) {
      const dx = i + 0.5 - D / 2, dy = j + 0.5 - (Rr + 1), d = Math.sqrt(dx * dx + dy * dy), a = Math.atan2(dx, -dy);
      if (Math.abs(a) > 1.05 || dy > 0) continue;
      const ep = Math.max(2, Math.round(k * 0.9));
      if (d <= Rr + 1 && d > Rr + 1 - ep - 2) g.fillStyle = d > Rr + 1 - 1 || d <= Rr + 1 - ep - 1 ? "#3a2a1c" : "#efe2c2";
      else continue;
      if (Math.abs(a) < 0.07 && d > Rr + 1 - ep - 1 && d <= Rr) g.fillStyle = "#d6a024";
      g.fillRect(i, j, 1, 1);
    }
    return c;
  });
  ctx.save(); if (ctx.setTransform) ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(fond, cx - Math.floor(fond.width / 2), cy - Rr - 1);
  const a = Math.max(-1, Math.min(1, v)) * 1.0, ex = Math.sin(a) * (Rr - 1), ey = -Math.cos(a) * (Rr - 1), n = Math.ceil(Rr);
  ctx.fillStyle = "#7a1f14";
  const t = Math.max(1, Math.round(k / 2));
  for (let i = Math.round(n * 0.25); i <= n; i++) ctx.fillRect(Math.round(cx + (ex * i) / n - t / 2), Math.round(cy + (ey * i) / n - t / 2), t, t);
  ctx.fillStyle = "#3a2a1c"; ctx.fillRect(cx - t, cy - t, 2 * t, 2 * t);
  ctx.restore();
}

/** Le « +2 » de la fin de mène, au-dessus de la boule qui marque (pixels de la police du jeu, à l'échelle du cran). */
export function dessinerPoints(ctx, R, wx, wy, txt, couleur, alpha) {
  ctx.save(); if (ctx.setTransform) ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  try { drawPixelText(ctx, mk, txt, R.sx(wx), R.sy(wy) - 4 * R.k, Math.max(1, R.k - 1), couleur, "#2a1a10"); } catch (e) { /* hors navigateur */ }
  ctx.restore();
}

/** La boule (ou le cochonnet) TENUE : dans la main du lanceur (`wx`, `wy` : la main, px du monde), sans ombre au sol. */
export function dessinerBouleMain(ctx, R, wx, wy, couleur, but) {
  poser(ctx, but ? spriteBut(R.k) : spriteBoule(R.k, couleur), R.sx(wx), R.sy(wy));
}
