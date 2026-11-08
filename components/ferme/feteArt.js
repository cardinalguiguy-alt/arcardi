/* =============================================================================
   feteArt.js — LE DESSIN DE LA FÊTE DU NAVIRE (2026-11-08, G9-G11).
   -----------------------------------------------------------------------------
   Ce que `fete.js` décide, ce fichier le peint : le décor du quai (mâts, guirlandes de fanions et de lampions, estrade,
   oriflammes), le navire hors de son ber (à flot, qui vire, qui coule sous une ligne d'eau), la bouteille, les éclats, le
   tirage au sort, le feu d'artifice, la foudre, les mouchoirs, les bandes du cinéma et le plan de nuit où la Brebis se dessine.
   ⚠️ TOUT EST UNE FONCTION PURE DE L'INSTANT ET D'UN INDICE (`seed`) : rien ne vieillit dans une closure, rien ne se
   réinitialise au remontage — la discipline des confettis de D11 (`drawStarConfetti`).
   ⚠️ LE NAUFRAGE NE TOUCHE PAS AU DESSIN DU NAVIRE (décision A3) : `drawFeteShip` peint le navire de `fermeArt.js` sur une
   toile à part, puis n'en recopie que ce qui est AU-DESSUS de la ligne d'eau. Le jour où le navire sera redessiné (M14), le
   naufrage, le virement et le mouillage n'auront rien à reprendre.
   ⚠️ CE FICHIER UTILISE `translate`/`scale` ET `globalCompositeOperation` : le faux canevas des bancs les ignore (§4 de
   CLAUDE.md). Rien ici n'est mesuré par un banc de rendu ; c'est jugé en jeu.
   ========================================================================== */
import * as C from "./fermeConstants";

const hashN = (n) => { let x = (n | 0) ^ 0x9e3779b9; x = Math.imul(x ^ (x >>> 16), 0x85ebca6b); x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
const rnd = (seed, k) => hashN(seed * 7919 + k * 104729 + 13);
const R = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
const FLAGS = ["#c8483c", "#e8c45a", "#3f9a5a", "#3c74c4", "#c45a98", "#f2ead6", "#e0873a"];
const LAMP = ["#e8503a", "#f0b03c", "#e86a9a", "#f4dc72"];

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 1. LE DÉCOR DU QUAI
   ╚════════════════════════════════════════════════════════════════════════════ */
/* Un mât de fête : un poteau de bois peint, une boule dorée. Pied au point (x, y) en px du monde. Rend le point d'accroche. */
export function drawFetePole(g, x, y, T, k) {
  const u = T / 16, h = Math.round(38 * u * Math.max(0, Math.min(1, k == null ? 1 : k)));
  if (h <= 0) return { x, y };
  R(g, x - 2 * u, y - 1 * u, 5 * u, 2 * u, "rgba(20,14,8,0.28)");
  R(g, x - 1 * u, y - h, 2 * u, h, "#7a5432");
  R(g, x - 1 * u, y - h, 1 * u, h, "#9a6e44");
  for (let s = 0; s < h; s += 7 * u) R(g, x - 1 * u, y - h + s, 2 * u, 2 * u, "#c8483c");   // peint en spirale (un ruban rouge)
  R(g, x - 2 * u, y - h - 3 * u, 4 * u, 3 * u, "#e8c45a");
  R(g, x - 1 * u, y - h - 3 * u, 1 * u, 1 * u, "#fff2b8");
  return { x, y: y - h + 2 * u };
}
/* Une guirlande de fanions et de lampions entre deux points d'accroche (px). Pend en chaînette, ondule au vent (`wind`).
   `out` reçoit les lampions { x, y } (px) pour la passe de lumière de la nuit. */
export function drawFeteGarland(g, ax, ay, bx, by, T, t, seed, opt) {
  const u = T / 16, o = opt || {};
  const len = Math.hypot(bx - ax, by - ay), n = Math.max(4, Math.round(len / (7 * u)));
  const sag = Math.min(14 * u, len * 0.12), wind = (o.wind || 0) * 2.2 * u;
  const pt = (k) => {
    const sw = Math.sin(t / 900 + seed + k * 3) * (1.2 * u + wind) * Math.sin(k * Math.PI);
    return [ax + (bx - ax) * k + sw * 0.4, ay + (by - ay) * k + Math.sin(k * Math.PI) * sag + sw];
  };
  g.strokeStyle = "rgba(58,44,30,0.9)"; g.lineWidth = Math.max(1, u * 0.7);
  g.beginPath();
  for (let i = 0; i <= n * 2; i++) { const [x, y] = pt(i / (n * 2)); if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }
  g.stroke();
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n, [x, y] = pt(k);
    if (i % 3 === 1) {
      // un lampion de papier : un ovale côtelé, un fond plus sombre, une flamme la nuit
      const col = LAMP[(i + seed) % LAMP.length], lit = o.lit || 0;
      R(g, x - 0.5 * u, y, 1 * u, 2 * u, "#3a2a18");
      R(g, x - 2.5 * u, y + 2 * u, 5 * u, 5 * u, col);
      R(g, x - 3 * u, y + 3 * u, 6 * u, 3 * u, col);
      R(g, x - 2.5 * u, y + 2 * u, 1 * u, 5 * u, "rgba(0,0,0,0.18)");
      R(g, x - 2 * u, y + 7 * u, 4 * u, 1 * u, "#3a2a18");
      if (lit > 0) { R(g, x - 1 * u, y + 3.5 * u, 2 * u, 2 * u, `rgba(255,246,200,${(0.55 + 0.45 * lit).toFixed(2)})`); if (o.out) o.out.push({ x, y: y + 4.5 * u }); }
    } else {
      const fw = 2.6 * u, fh = 5 * u + Math.sin(t / 280 + i + seed) * 0.8 * u;
      g.fillStyle = FLAGS[(i + seed) % FLAGS.length];
      g.beginPath(); g.moveTo(x - fw, y); g.lineTo(x + fw, y); g.lineTo(x + Math.sin(t / 330 + i) * 0.8 * u, y + fh); g.closePath(); g.fill();
    }
  }
}
/* L'estrade du maire : un plancher sur tréteaux, une jupe de feston tricolore, deux marches à l'ouest, un pupitre.
   (x0, y0)-(x1, y1) en CASES (bornes incluses) ; T la taille d'une case. Rend le point où se tient l'orateur (px). */
export function drawFeteStage(g, x0, y0, x1, y1, T, t) {
  const u = T / 16, X0 = x0 * T, X1 = (x1 + 1) * T, Y0 = y0 * T + 6 * u, Y1 = (y1 + 1) * T - 2 * u, H = 7 * u;
  R(g, X0 + 2 * u, Y1, X1 - X0, 3 * u, "rgba(20,14,8,0.3)");                       // l'ombre
  R(g, X0, Y0, X1 - X0, Y1 - Y0 - H, "#a87a4c");                                    // le plancher (vu de haut)
  for (let y = Y0 + 3 * u; y < Y1 - H; y += 4 * u) R(g, X0, y, X1 - X0, 1 * u, "#8a5e36");
  R(g, X0, Y0, X1 - X0, 1 * u, "#c89a64");
  // la jupe : feston bleu-blanc-rouge, plissé
  const SK = ["#3c64b4", "#f2ead6", "#c8483c"];
  for (let x = X0; x < X1; x += 4 * u) {
    const c = SK[Math.floor((x - X0) / (4 * u)) % 3];
    R(g, x, Y1 - H, 4 * u, H, c);
    R(g, x, Y1 - H, 1 * u, H, "rgba(0,0,0,0.14)");
  }
  for (let x = X0; x < X1; x += 8 * u) { g.fillStyle = "#e8c45a"; g.beginPath(); g.moveTo(x, Y1 - H); g.quadraticCurveTo(x + 4 * u, Y1 - H + 4 * u, x + 8 * u, Y1 - H); g.lineTo(x + 8 * u, Y1 - H + 1 * u); g.quadraticCurveTo(x + 4 * u, Y1 - H + 5 * u, x, Y1 - H + 1 * u); g.fill(); }
  // les marches, à l'ouest
  R(g, X0 - 5 * u, Y1 - 5 * u, 5 * u, 5 * u, "#8a5e36"); R(g, X0 - 5 * u, Y1 - 5 * u, 5 * u, 1 * u, "#b88a58");
  R(g, X0 - 9 * u, Y1 - 2 * u, 4 * u, 2 * u, "#8a5e36"); R(g, X0 - 9 * u, Y1 - 2 * u, 4 * u, 1 * u, "#b88a58");
  // le pupitre, côté sud-est (le maire parle à la foule et au navire)
  const lx = (X0 + X1) / 2 + 9 * u, ly = Y0 + 8 * u;
  R(g, lx - 3 * u, ly - 11 * u, 6 * u, 11 * u, "#6a4426"); R(g, lx - 4 * u, ly - 13 * u, 8 * u, 3 * u, "#8a5e36");
  R(g, lx - 1 * u, ly - 9 * u, 2 * u, 2 * u, "#e8c45a");
  return { x: (X0 + X1) / 2 - 2 * u, y: Y0 + 9 * u };
}
/* Une oriflamme : un mât fin, une longue flamme qui ondule. */
export function drawFeteMast(g, x, y, T, t, seed) {
  const u = T / 16, h = 46 * u;
  R(g, x - 0.5 * u, y - h, 1.5 * u, h, "#6a4a2c");
  R(g, x - 1.5 * u, y - h - 2 * u, 3 * u, 2 * u, "#e8c45a");
  const col = seed % 2 ? "#3c64b4" : "#c8483c";
  for (let i = 0; i < 14; i++) {
    const k = i / 14, wv = Math.sin(t / 240 + i * 0.55 + seed) * (1 + k * 3) * u;
    R(g, x + 1 * u + i * 2 * u, y - h + 2 * u + wv, 2 * u, Math.max(1, (6 - k * 4.5) * u), i % 5 === 4 ? "#f2ead6" : col);
  }
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 2. LE NAVIRE HORS DE SON BER — à flot, qui vire, qui coule. (A3 : le dessin du navire reste celui de `fermeArt.js`.)
   ╚════════════════════════════════════════════════════════════════════════════
   `pose` (de `fete.js`) : { x, y (cases), face (1 → −1), afloat, sink (0..1), rock, sail, fire, hidden } ; `sprites` : le
   jeu de sprites (`drawStarShip`, `drawStarShipName`). `o` : { parts, night, pavois, lantern, name, nameReveal, wake }. */
let OFF = null;
function offscreen(w, h) {
  if (typeof document === "undefined") return null;
  if (!OFF) OFF = document.createElement("canvas");
  if (OFF.width !== w || OFF.height !== h) { OFF.width = w; OFF.height = h; }
  const g = OFF.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); g.imageSmoothingEnabled = false;
  return [OFF, g];
}
/* `sink` = 1 : la ligne d'eau à 42 % de la hauteur peinte — le pont juste sous l'eau, les mâts et la vergue dehors. (Premier
   jet à 72 % : il ne dépassait que la pomme du mât, neuf pixels — l'épave ne se voyait plus, vu en jeu.) */
export const SHIP_WATER_K = 0.42;
export function drawFeteShip(g, sprites, pose, T, now, o) {
  if (!pose || pose.hidden || !sprites || !sprites.drawStarShip) return;
  const u = T / 16, cx = pose.x * T, cy = pose.y * T;
  const parts = o.parts || new Array(C.STAR_SHIP_ORDER.length).fill(true);
  const sopt = { night: !!o.night, afloat: !!pose.afloat, rockGain: pose.rock || 1, sailK: pose.sail === "furled" ? 0 : (o.sailK != null ? o.sailK : 1),
                 pavois: o.pavois || 0, lantern: o.lantern || 0, fire: pose.fire || 0 };
  const plain = !pose.afloat && (pose.sink || 0) <= 0 && pose.face === 1;
  if (plain) { sprites.drawStarShip(g, cx, cy, T, parts, now, sopt); nameOn(g, sprites, pose, T, now, o, cx, cy, 0); return; }
  const W = Math.round(((C.STAR_SHIP_DRAW_W || 9) + 2) * T), H = Math.round(((C.STAR_SHIP_DRAW_H || 7) + 2) * T);
  const off = offscreen(W, H); if (!off) return;
  const [cv, og] = off, ox = W / 2, oy = H - T;
  sprites.drawStarShip(og, ox, oy, T, parts, now, sopt);
  const sinkPx = Math.round((pose.sink || 0) * SHIP_WATER_K * (C.STAR_SHIP_DRAW_H || 7) * T);
  const face = Math.abs(pose.face) < 0.06 ? (pose.face < 0 ? -0.06 : 0.06) : pose.face;
  const tilt = Math.max(0, (pose.sink || 0) - 0.25) * 0.22;   // il pique de l'arrière en coulant
  const water = Math.round(cy);
  g.save();
  // ⚠️ AU-DESSUS DE LA LIGNE D'EAU, PLEIN ; EN DESSOUS, VU À TRAVERS L'EAU (un voile) — c'est ce qui le fait couler, pas fondre.
  for (const under of [false, true]) {
    g.save();
    g.beginPath();
    if (under) g.rect(cx - W, water, W * 2, H); else g.rect(cx - W, cy - H * 2, W * 2, water - (cy - H * 2));
    g.clip();
    if (under) g.globalAlpha = 0.16;
    g.translate(Math.round(cx), 0); g.scale(face, 1);
    if (tilt <= 0) g.drawImage(cv, -ox, Math.round(cy - oy + sinkPx));
    else {
      const STRIP = Math.max(2, Math.round(3 * u));
      for (let sx = 0; sx < W; sx += STRIP) {
        const rel = (sx - ox) / ox;                       // −1 (poupe) … 1 (proue)
        const dy = Math.round(-rel * tilt * H * 0.5);
        g.drawImage(cv, sx, 0, STRIP, H, sx - ox, Math.round(cy - oy + sinkPx + dy), STRIP, H);
      }
    }
    g.restore();
  }
  // l'écume à la ligne d'eau, et des bulles quand il coule
  if (pose.afloat) {
    const half = 4.3 * T * Math.abs(face), wob = (k) => Math.sin(now / 260 + k * 0.9) * u;
    for (let k = -half; k < half; k += 3 * u) R(g, cx + k, water - 1 * u + wob(k), 2 * u, 1 * u, "rgba(240,248,255,0.55)");
    if (o.wake > 0) for (let i = 0; i < 9; i++) { const kk = ((now / 90 + i * 17) % 60) / 60; R(g, cx - Math.sign(face) * (half + kk * 3.5 * T), water + (i % 3 - 1) * 2 * u, 3 * u * (1 - kk), 1 * u, `rgba(235,245,255,${(0.5 * (1 - kk) * o.wake).toFixed(2)})`); }
  }
  if ((pose.sink || 0) > 0.2) {
    for (let i = 0; i < 14; i++) {
      const ph = ((now / 700 + rnd(i, 1)) % 1), bx = cx + (rnd(i, 2) - 0.5) * 6 * T, by = water - ph * 10 * u;
      g.globalAlpha = 0.65 * (1 - ph); R(g, bx, by, 1.5 * u, 1.5 * u, "#e6f2ff");
    }
    g.globalAlpha = 1;
  }
  g.restore();
  nameOn(g, sprites, pose, T, now, o, cx, cy, sinkPx, water);
}
function nameOn(g, sprites, pose, T, now, o, cx, cy, sinkPx, water) {
  // ⚠️ le nom n'est peint que de profil plein : pendant le virement le navire se pince, et une étiquette pleine largeur sur
  // une coque pincée se lit comme un décollage (vu en jeu)
  if (!o.name || !sprites.drawStarShipName || Math.abs(pose.face) < 0.97 || (pose.sink || 0) > 0.3) return;
  const rev = o.nameReveal == null ? 1 : o.nameReveal;
  if (rev <= 0) return;
  g.save();
  g.beginPath();
  // ⚠️ le cadre du dévoilement suit la LARGEUR DU NOM (même police que `drawStarShipName`) : à sept cases fixes, « Le bout de bois
  // qui flotte mal » était rogné des deux côtés (vu en jeu)
  const w = sprites.shipNameWidth ? sprites.shipNameWidth(o.name, T) : 7 * T;
  g.rect(cx + (77 - 72) * (T / 16) - w / 2, cy - 8 * T, w * rev, water != null ? water - (cy - 8 * T) : 9 * T);
  g.clip();
  sprites.drawStarShipName(g, cx, cy + sinkPx, T, o.name, now);
  g.restore();
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 3. LA BOUTEILLE, LES ÉCLATS, LE TIRAGE AU SORT, LES MOUCHOIRS, LES GERBES
   ╚════════════════════════════════════════════════════════════════════════════ */
/* La bouteille en vol : de (x0, y0) à (x1, y1), `k` 0..1, une parabole et trois tours sur elle-même. */
export function drawFeteBottle(g, x0, y0, x1, y1, k, T) {
  const u = T / 16, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * 26 * u;
  const a = k * Math.PI * 6, c = Math.cos(a), s = Math.sin(a);
  const pts = [[-1.5, -5], [1.5, -5], [2, 3], [-2, 3]].map(([px, py]) => [x + (px * c - py * s) * u, y + (px * s + py * c) * u]);
  g.fillStyle = "#2f6a3a"; g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); g.fill();
  const nx = x + (0 * c - -7 * s) * u, ny = y + (0 * s + -7 * c) * u;
  R(g, nx - 1 * u, ny - 1 * u, 2 * u, 2 * u, "#e8c45a");   // le col doré, le ruban
}
/* L'éclat sur l'étrave : des éclats de verre, une gerbe d'écume, des gouttes. `age` en ms. */
export function drawFeteSmash(g, x, y, age, T) {
  if (age < 0 || age > 1800) return;
  const u = T / 16, k = age / 1800;
  if (age < 120) { g.fillStyle = `rgba(255,255,240,${(0.8 * (1 - age / 120)).toFixed(2)})`; g.beginPath(); g.arc(x, y, (6 + age / 12) * u, 0, 7); g.fill(); }
  for (let i = 0; i < 22; i++) {
    const a = rnd(i, 3) * Math.PI * 2, sp = (0.4 + rnd(i, 4)) * 32 * u, tt = age / 1000;
    const px = x + Math.cos(a) * sp * tt, py = y + Math.sin(a) * sp * tt * 0.7 + 30 * u * tt * tt;
    g.globalAlpha = Math.max(0, 1 - k * 1.3);
    R(g, px, py, i % 4 ? 1.2 * u : 2 * u, i % 4 ? 1.2 * u : 1 * u, i % 3 ? "#f4fbff" : "#9fd0b0");
  }
  g.globalAlpha = 1;
}
/* Le tirage au sort : une pièce lancée au-dessus du maire, qui tourne, monte, retombe. `age` 0..`DRAW` ms. */
export function drawFeteToss(g, x, y, age, T) {
  if (age < 0 || age > 3200) return;
  const u = T / 16, k = Math.min(1, age / 1500), h = Math.sin(k * Math.PI) * 26 * u, spin = Math.abs(Math.cos(age / 60));
  const py = y - 14 * u - h;
  R(g, x - 2.5 * u * spin, py - 2.5 * u, 5 * u * spin + 1, 5 * u, "#e8c45a");
  R(g, x - 1 * u * spin, py - 1.5 * u, 2 * u * spin + 1, 1 * u, "#fff2b8");
}
/* Un mouchoir qu'on agite : un carré blanc au bout du bras, qui claque. */
export function drawFeteHanky(g, x, y, t, seed, T) {
  const u = T / 16, ph = Math.sin(t / 150 + seed * 2.1), hx = x + ph * 3 * u, hy = y - 4 * u - Math.abs(ph) * 2 * u;
  R(g, hx - 1.5 * u, hy - 1.5 * u, 3.5 * u, 3 * u, "#f8f6ee");
  R(g, hx - 1.5 * u, hy + 1 * u, 3.5 * u, 0.6 * u, "#c9c4b6");
}
/* Une gerbe d'eau (la mise à l'eau, l'ancre, la foudre dans le lac). */
export function drawFeteSplash(g, x, y, age, T, big) {
  if (age < 0 || age > 1600) return;
  const u = T / 16, k = age / 1600, n = big ? 26 : 14;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.1 + 0.8 * rnd(i, 5)), sp = (0.5 + rnd(i, 6)) * (big ? 46 : 28) * u, tt = age / 1000;
    const px = x + Math.cos(a) * sp * tt * (rnd(i, 7) < 0.5 ? -1 : 1), py = y - Math.sin(a) * sp * tt + 60 * u * tt * tt;
    if (py > y + 2 * u) continue;
    g.globalAlpha = Math.max(0, 1 - k); R(g, px, py, 1.6 * u, 1.6 * u, "#e8f4ff");
  }
  g.globalAlpha = Math.max(0, 0.6 * (1 - k));
  R(g, x - (6 + k * 14) * u, y - 1 * u, (12 + k * 28) * u, 1.5 * u, "#f0f8ff");
  g.globalAlpha = 1;
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 4. LE CIEL — le feu d'artifice, la foudre
   ╚════════════════════════════════════════════════════════════════════════════
   `fw` (de `fete.js`) : { t0, x, y (cases : l'éclatement), kind, hue, rise, i } ; il part de (lx, ly) cases (le ponton). */
const hsl = (h, s, l, a) => `hsla(${h},${s}%,${l}%,${a.toFixed(3)})`;
export function drawFeteFirework(g, fw, t, T, lx, ly) {
  const age = t - fw.t0, u = T / 16;
  if (age < 0 || age > fw.rise + 3200) return;
  const bx = fw.x * T, by = fw.y * T, sx = lx * T, sy = ly * T;
  g.save();
  g.globalCompositeOperation = "lighter";
  if (age < fw.rise) {
    // la fusée : un point brillant qui monte en ralentissant, une traîne d'étincelles
    const k = age / fw.rise, e = 1 - (1 - k) * (1 - k);
    const x = sx + (bx - sx) * e, y = sy + (by - sy) * e;
    for (let i = 0; i < 9; i++) { const kk = Math.max(0, e - i * 0.025), tx = sx + (bx - sx) * kk, ty = sy + (by - sy) * kk; R(g, tx, ty, 2 * u, 2 * u, hsl(40, 95, 72, 0.75 * (1 - i / 9))); }
    R(g, x - 1.5 * u, y - 1.5 * u, 3 * u, 3 * u, "#fff6d8");
    g.restore(); return;
  }
  const a = age - fw.rise, k = a / 3200, n = fw.kind === "ring" ? 40 : fw.kind === "willow" ? 52 : 48;
  // l'éclair de l'éclatement : un disque blanc qui s'ouvre, puis un halo coloré qui s'éteint en une seconde
  if (a < 220) { g.fillStyle = hsl(fw.hue, 60, 92, 0.85 * (1 - a / 220)); g.beginPath(); g.arc(bx, by, (5 + a / 14) * u, 0, 7); g.fill(); }
  if (a < 1100) { const gr = g.createRadialGradient(bx, by, 0, bx, by, 46 * u); gr.addColorStop(0, hsl(fw.hue, 85, 65, 0.32 * (1 - a / 1100))); gr.addColorStop(1, hsl(fw.hue, 85, 50, 0)); g.fillStyle = gr; g.beginPath(); g.arc(bx, by, 46 * u, 0, 7); g.fill(); }
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rnd(fw.i, i) * 0.25;
    const sp = (fw.kind === "ring" ? 1 : 0.55 + rnd(fw.i, i + 99) * 0.6) * (fw.kind === "willow" ? 30 : 42) * u;
    const tt = a / 1000, drag = 1 - Math.exp(-tt * 2.4);
    const grav = (fw.kind === "willow" ? 26 : 14) * u * tt * tt;
    const alpha = Math.max(0, (1 - k) * (fw.kind === "crackle" && a > 900 ? (Math.sin(a / 40 + i) > 0 ? 1 : 0.15) : 1));
    if (alpha <= 0.01) continue;
    const L = fw.kind === "willow" ? 62 : 70;
    // une courte traîne : l'œil lit le mouvement, pas des points
    for (let s = 0; s < 3; s++) {
      const tt2 = Math.max(0, tt - s * 0.045), d2 = 1 - Math.exp(-tt2 * 2.4), g2 = (fw.kind === "willow" ? 26 : 14) * u * tt2 * tt2;
      R(g, bx + Math.cos(ang) * sp * d2, by + Math.sin(ang) * sp * d2 * 0.8 + g2, (s ? 1.6 : 2.4) * u, (s ? 1.6 : 2.4) * u, hsl(fw.hue + (s * 8), 95, L + 8 - s * 10, Math.min(1, alpha * (1.1 - s * 0.3))));
    }
  }
  g.restore();
}
/* La foudre : une ligne brisée du haut du cadre au point frappé, un cœur blanc, un halo bleu. `k` 0..1 (l'éclair s'éteint). */
export function drawFeteBolt(g, x0, y0, x1, y1, seed, k, T) {
  const u = T / 16, pts = [[x0, y0]], n = 9;
  for (let i = 1; i < n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t + (rnd(seed, i) - 0.5) * 18 * u, y0 + (y1 - y0) * t]); }
  pts.push([x1, y1]);
  g.save();
  g.globalCompositeOperation = "lighter";
  for (const [w, col] of [[7 * u, `rgba(120,160,255,${(0.25 * k).toFixed(3)})`], [3 * u, `rgba(200,220,255,${(0.6 * k).toFixed(3)})`], [1.3 * u, `rgba(255,255,255,${k.toFixed(3)})`]]) {
    g.strokeStyle = col; g.lineWidth = w; g.lineJoin = "round"; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  }
  // une branche
  const b = pts[4]; g.strokeStyle = `rgba(230,240,255,${(0.7 * k).toFixed(3)})`; g.lineWidth = 1 * u; g.beginPath(); g.moveTo(b[0], b[1]);
  g.lineTo(b[0] + 14 * u, b[1] + 16 * u); g.lineTo(b[0] + 10 * u, b[1] + 30 * u); g.stroke();
  g.restore();
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 5. L'ÉCRAN — les bandes du cinéma, le plan de nuit
   ╚════════════════════════════════════════════════════════════════════════════ */
export function drawFeteLetterbox(ctx, W, H, k) {
  if (!(k > 0)) return;
  const h = Math.round(H * 0.1 * k);
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h);
}
/* Le plan de nuit (F2, D11 d). `nt` (de `fete.js`, `feteNightAt`) ; `o` : { tints (7 couleurs), points (la Brebis : 7 [x, y]),
   edges, lines (4 textes), corner: { x, y } (le coin du HUD où elle vit ensuite), drawShip(ctx, x, y, s) }. */
export function drawFeteNight(ctx, W, H, nt, now, o) {
  if (!nt || nt.veil <= 0) return;
  ctx.save();
  ctx.globalAlpha = nt.veil;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#040817"); sky.addColorStop(0.62, "#0c1838"); sky.addColorStop(0.78, "#1a2a52"); sky.addColorStop(1, "#08101f");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  const hz = Math.round(H * 0.76);
  // les étoiles du fond, qui scintillent
  for (let i = 0; i < 140; i++) {
    const x = rnd(i, 11) * W, y = rnd(i, 12) * hz * 0.98, tw = 0.35 + 0.65 * Math.abs(Math.sin(now / (700 + rnd(i, 13) * 900) + i));
    ctx.fillStyle = `rgba(220,230,255,${(0.55 * tw).toFixed(3)})`; ctx.fillRect(Math.round(x), Math.round(y), i % 9 === 0 ? 2 : 1, i % 9 === 0 ? 2 : 1);
  }
  // la mer : des bandes de reflet qui bougent
  ctx.fillStyle = "#060d1e"; ctx.fillRect(0, hz, W, H - hz);
  for (let i = 0; i < 46; i++) {
    const y = hz + 3 + (i * (H - hz)) / 46, w = 10 + rnd(i, 21) * 50, x = ((rnd(i, 22) * W + now / (30 + i)) % (W + 80)) - 40;
    ctx.fillStyle = `rgba(150,180,240,${(0.05 + 0.08 * rnd(i, 23)).toFixed(3)})`; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), 1);
  }
  ctx.fillStyle = "rgba(150,180,240,0.22)"; ctx.fillRect(0, hz, W, 1);
  // le navire au loin, qui file à l'ouest — sa lanterne allumée
  const shipX = W * (0.76 - 0.12 * Math.min(1, nt.u / 50)), shipY = hz + 2;
  if (o.drawShip) nightShip(ctx, shipX, shipY, Math.max(4, Math.round(H / 90)), o.drawShip);
  const mastTop = { x: shipX, y: shipY - Math.max(4, Math.round(H / 90)) * 6.2 };
  // la Brebis, en grand, au centre du ciel ; puis elle rejoint son coin (le dessin du HUD), à l'échelle 1
  const S0 = Math.min(W, H) / 70, cx0 = W / 2 - 21 * S0, cy0 = H * 0.18;
  const c = nt.corner, S = S0 + (1 - S0) * c;
  const bx = cx0 + ((o.corner ? o.corner.x : W - 134) - cx0) * c, by = cy0 + ((o.corner ? o.corner.y : 60) - cy0) * c;
  const P = o.points.map(([x, y]) => [bx + x * S, by + y * S]);
  // les traits, l'un après l'autre
  const E = o.edges, nE = E.length;
  ctx.lineCap = "round";
  for (let i = 0; i < nE; i++) {
    const k = Math.max(0, Math.min(1, nt.draw * nE - i));
    if (k <= 0) continue;
    const [a, b] = E[i], A = P[a], B = P[b];
    ctx.strokeStyle = `rgba(190,215,255,${(0.42 * (1 - 0.4 * c)).toFixed(3)})`; ctx.lineWidth = Math.max(1, 1.6 * S / S0 * (1 - c) + c);
    ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k); ctx.stroke();
  }
  // les sept étoiles : elles quittent le navire une à une, montent en arc, se posent ; une traîne derrière chacune
  for (let i = 0; i < P.length; i++) {
    const d = i / P.length * 0.55, k = Math.max(0, Math.min(1, (nt.rise - d) / 0.45));
    if (k <= 0) continue;
    const e = 1 - Math.pow(1 - k, 3);
    const ctrl = { x: (mastTop.x + P[i][0]) / 2 + (i % 2 ? 1 : -1) * W * 0.08, y: Math.min(mastTop.y, P[i][1]) - H * 0.12 };
    const at = (q) => ({ x: (1 - q) * (1 - q) * mastTop.x + 2 * (1 - q) * q * ctrl.x + q * q * P[i][0], y: (1 - q) * (1 - q) * mastTop.y + 2 * (1 - q) * q * ctrl.y + q * q * P[i][1] });
    const tint = o.tints[i % o.tints.length] || "#fff4d0";
    for (let s = 6; s >= 1; s--) { const q = Math.max(0, e - s * 0.035); const p = at(q); ctx.globalAlpha = nt.veil * 0.12 * (7 - s) / 6 * (k < 1 ? 1 : 0); ctx.fillStyle = tint; ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 2, 2); }
    ctx.globalAlpha = nt.veil;
    const p = at(e), pulse = 0.5 + 0.5 * Math.sin(now / 520 + i), r = (i === 0 ? 3.4 : 2.6) * (S / S0 * (1 - c) + c * 0.55) + pulse * 0.8;
    const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5);
    halo.addColorStop(0, tint); halo.addColorStop(0.25, "rgba(255,240,200,0.35)"); halo.addColorStop(1, "rgba(255,240,200,0)");
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(p.x, p.y, r * 5, 0, 7); ctx.fill();
    ctx.fillStyle = "#fffaf0"; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
  }
  // le texte : blanc, centré, une ligne à la fois (fondu enchaîné)
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const fs = Math.max(15, Math.round(Math.min(W / 34, H / 22)));
  ctx.font = `italic ${fs}px Georgia, "Times New Roman", serif`;
  for (let i = 0; i < nt.text.length; i++) {
    const a = nt.text[i]; if (!(a > 0.01) || !o.lines[i]) continue;
    ctx.globalAlpha = nt.veil * a;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; wrapText(ctx, o.lines[i], W / 2 + 1, H * 0.62 + 1 + (1 - a) * 6, W * 0.8, fs * 1.35);
    ctx.fillStyle = "#f6f2ea"; wrapText(ctx, o.lines[i], W / 2, H * 0.62 + (1 - a) * 6, W * 0.8, fs * 1.35);
  }
  ctx.restore();
}
/* Le navire au loin, la nuit : peint sur une toile à part puis voilé de bleu nuit (`source-atop` : seulement ses pixels) —
   peint tel quel, il avait ses couleurs de plein jour sur un ciel noir (vu en jeu). La lanterne reste chaude, posée après. */
let NIGHT_OFF = null;
function nightShip(ctx, x, y, s, draw) {
  if (typeof document === "undefined") { draw(ctx, x, y, s); return; }
  const W = Math.ceil(12 * s), H = Math.ceil(9 * s);
  if (!NIGHT_OFF) NIGHT_OFF = document.createElement("canvas");
  if (NIGHT_OFF.width !== W || NIGHT_OFF.height !== H) { NIGHT_OFF.width = W; NIGHT_OFF.height = H; }
  const g = NIGHT_OFF.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, W, H);
  draw(g, W / 2, H - s, s);
  g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(8,14,38,0.62)"; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "source-over";
  ctx.drawImage(NIGHT_OFF, Math.round(x - W / 2), Math.round(y - (H - s)));
  // la lanterne de poupe, chaude, et son reflet tremblant dans l'eau
  const lx = x - 4.2 * s, ly = y - 2.9 * s, gl = ctx.createRadialGradient(lx, ly, 0, lx, ly, 3 * s);
  gl.addColorStop(0, "rgba(255,214,140,0.9)"); gl.addColorStop(1, "rgba(255,214,140,0)");
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(lx, ly, 3 * s, 0, 7); ctx.fill();
  ctx.fillStyle = "rgba(255,214,140,0.35)"; ctx.fillRect(Math.round(lx - 0.5 * s), Math.round(y + 2), Math.max(1, Math.round(s)), Math.round(2.5 * s));
}
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = String(text).split(" "), lines = [];
  let cur = "";
  for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  const y0 = y - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, y0 + i * lh));
}
