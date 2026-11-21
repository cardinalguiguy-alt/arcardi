/* =============================================================================
   parapluie.js — LES PARAPLUIES SOUS LA PLUIE (2026-11-21).
   -----------------------------------------------------------------------------
   Un ajout de l'après-midi libre du 2026-11-21 (« be free, sois inventif »). Quand il pleut, la ville sort ses parapluies : chacun
   l'ouvre à SON seuil de pluie (une bruine n'en ouvre que quelques-uns, une averse presque tous ; un habitant sur cinq n'en a pas et
   marche tête nue), dans SA couleur — rouge, marine, vert, moutarde, noir, prune, rose, canard. Deux joueurs voient les mêmes : tout
   se tire d'un hachage de l'identifiant et de la pluie de l'instant (§3 : rien ne circule).
   · LE DESSIN, au trait simple : au PIXEL FIN (½ pixel d'art), posé au pixel d'écran entier (comme `buee.js`) ; un dôme de 30 pixels fins
     (15 px d'art : un mètre dix), quatre pans en aplats alternés — la base et la base −30, le pan éclairé à gauche (la lumière du nord-ouest,
     DESSIN.md) —, le bord festonné (chaque pan remonte d'un pixel entre deux baleines), la pointe et le manche d'un brun presque noir.
   · OÙ : le bord du dôme passe un pixel au-dessus de la tête (posé dessus, il se lisait comme un chapeau de paille), décalé vers
     la main qui le tient ; de face, le manche descend à côté du visage jusqu'à cette main ; de profil, il se porte à l'épaule ; de dos,
     on ne voit que le dôme (`umbrellaPlace`). Le dôme suit le pas (le `bob` de la marche).
   ⚠️ AUCUNE HORLOGE LUE ICI : rien ne dépend du temps, sauf la pluie que l'appelant passe.
   Désactivable : menu dev, « Ajouts de la nuit du 21 novembre » (`AJOUTS.umbrella`, FermeGame.js). Banc : `tools/verify-parapluie.mjs`.
   ========================================================================== */

export const PARAPLUIE = {
  COLORS: ["#c8323c", "#2f4f8a", "#3f8a4e", "#d6a23a", "#2b2b33", "#7a3f8a", "#de7896", "#2f8a94"],
  STICK: "#3a2a24",          // la pointe, le manche, la crosse
  OPEN: [0.1, 0.42],         // la pluie au sol (`PL.groundRain`) où chacun ouvre le sien, réparti dans cet intervalle
  BARE: 0.2,                 // la part des habitants qui n'en ont pas
  PLAYER_OPEN: 0.12,         // un joueur ouvre le sien dès une pluie franche
  W: 30, H: 9,               // le dôme, en pixels fins (pointe, sept rangées de toile, les bouts de baleines) : 15 px d'art, un mètre dix
};
function hash32(a, b) {
  let h = (Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
const u01 = (h) => (h >>> 8) / 16777216;
const minus = (hex, d) => "#" + [1, 3, 5].map((i) => Math.max(0, parseInt(hex.slice(i, i + 2), 16) - d).toString(16).padStart(2, "0")).join("");

/* Le parapluie de `seed` sous la pluie `rain` (0..1) : null (fermé, ou il n'en a pas), ou { col, dark, side } — `side` la main qui le
   tient (+1 la droite de l'écran, −1 la gauche), tirée elle aussi. */
export function umbrellaOf(seed, rain, isPlayer) {
  if (!(rain > 0)) return null;
  const P = PARAPLUIE;
  if (!isPlayer && u01(hash32(seed, 3)) < P.BARE) return null;
  const at = isPlayer ? P.PLAYER_OPEN : P.OPEN[0] + (P.OPEN[1] - P.OPEN[0]) * u01(hash32(seed, 5));
  if (rain < at) return null;
  const col = P.COLORS[hash32(seed, 7) % P.COLORS.length];
  return { col, dark: minus(col, 30), side: u01(hash32(seed, 11)) < 0.72 ? 1 : -1 };
}

/* Le dôme en pixels fins : une grille H × W de 0 (vide), 1 (pan clair), 2 (pan sombre), 3 (pointe, bouts de baleines). Calculée une fois.
   Une DEMI-ELLIPSE (rangées 1 à 7 ; un premier jet aux flancs droits se lisait comme une boîte), dont les pans sont des FUSEAUX : la
   place d'un pixel dans SA rangée (`t`, −1 au bord gauche, +1 au droit) dit son pan, donc les baleines convergent d'elles-mêmes vers la
   pointe. Quatre pans vus de face, ceux du milieu plus larges (la courbure) ; sous le bord, seuls les bouts des cinq baleines dépassent
   d'un pixel (le feston : la toile remonte entre deux baleines). */
let DOME = null;
export function domeGrid() {
  if (DOME) return DOME;
  const { W, H } = PARAPLUIE, g = new Uint8Array(W * H), cx = W / 2, R = 6.6, RIB = [-1, -0.52, 0, 0.52, 1];
  for (let y = 1; y <= 7; y++) {
    const hw = (W / 2) * Math.sqrt(Math.max(0, 1 - Math.pow((7.4 - y) / R, 2)));
    for (let x = 0; x < W; x++) {
      const t = (x + 0.5 - cx) / Math.max(0.5, hw);
      if (Math.abs(t) > 1) continue;
      const pan = t < RIB[1] ? 0 : t < RIB[2] ? 1 : t < RIB[3] ? 2 : 3;
      g[y * W + x] = pan % 2 === 0 ? 1 : 2;
    }
  }
  // les bouts des baleines ; celle du milieu tombe entre deux colonnes (largeur paire) : elle en prend deux, la silhouette reste symétrique
  for (const r of RIB) { if (r === 0) { g[8 * W + W / 2 - 1] = 3; g[8 * W + W / 2] = 3; continue; } const x = Math.min(W - 1, Math.max(0, Math.round(cx + r * (W / 2 - 0.5) - 0.5))); g[8 * W + x] = 3; }
  g[0 * W + W / 2 - 1] = 3; g[0 * W + W / 2] = 3;   // la pointe
  DOME = g;
  return g;
}

/* Où poser le dôme et le manche, en px d'art, pour un personnage dont le sprite 16 × 24 commence à (`ox`, `oy`) (le haut de la tête), à
   l'échelle `sc`, regardant `face` ("down" | "up" | "left" | "right"), tenant de la main `side`. Rend { dx, dy (le coin haut gauche du
   dôme), sx, sy0, sy1 (le manche : colonne, du dessous du dôme jusqu'où il se voit), stickVisible, hook (la crosse sous la main) }.
   Les colonnes se lisent sur la grille fine du trait simple (32 × 48) :
   · DE FACE : le manche descend dans la colonne fine 24 (ou 7, de l'autre main) — la patte de cheveux, puis le vide à côté de la joue,
     puis la manche — jusqu'à la main (rangée fine 30) ; la crosse tourne dessous. Jamais sur le visage (colonnes 8 à 23).
   · DE PROFIL : le bras du trait simple pend le long du corps, et la main qui tient le parapluie est l'autre, cachée : le manche ne se
     voit qu'entre le dôme et le haut des cheveux (rangée fine 2), au milieu de la tête, puis passe derrière elle. ⚠️ Un premier jet le
     descendait jusqu'à l'épaule : il traversait les cheveux et la tempe — un piquet planté dans la tête (vu sur la planche).
   · DE DOS : le manche est devant le corps, caché ; on ne voit que le dôme. */
export function umbrellaPlace(ox, oy, face, side, sc = 1) {
  const { W, H } = PARAPLUIE;
  let sx, sEnd, cx, stickVisible = true, hook = false;
  if (face === "left" || face === "right") {
    sx = ox + 7.5 * sc; sEnd = oy + 1 * sc;             // jusqu'au haut des cheveux (rangée fine 2), puis derrière la tête
    cx = ox + 8 * sc;
  } else {
    sx = ox + (side > 0 ? 12 : 3.5) * sc; sEnd = oy + 15 * sc;   // colonnes fines 24 et 7 ; la main, rangée fine 30
    cx = ox + (8 + side * 1.75) * sc;
    stickVisible = face === "down"; hook = face === "down";
  }
  /* le bord du dôme UN PIXEL AU-DESSUS de la tête : posé dessus (premier jet), il se lisait comme un chapeau de paille ; l'écart, où
     passe le manche, dit « tenu à bout de bras » */
  const dx = Math.round((cx - W / 4) * 2) / 2, dy = Math.round((oy - 4.5 * sc) * 2) / 2;
  return { dx, dy, sx: Math.round(sx * 2) / 2, sy0: dy + 4, sy1: Math.round(sEnd * 2) / 2, stickVisible, hook };
}

/* LE DESSIN (contexte du monde, px d'art ; au pixel d'écran entier comme la buée). `bob` : la descente du pas (px d'art). `stickOnly` :
   ne dessine que le manche (posé AVANT le personnage quand il passe derrière). */
export function drawUmbrella(ctx, { ox, oy, face, side, col, dark, bob = 0, sc = 1 }) {
  const { W, H, STICK } = PARAPLUIE;
  const pl = umbrellaPlace(ox, oy + bob, face, side, sc);
  const M = ctx.getTransform ? ctx.getTransform() : null;
  const z = M ? M.a : 1, cell = Math.max(1, Math.round(z / 2));
  const toS = (ax, ay) => (M ? [Math.round((M.e + ax * z) / cell) * cell, Math.round((M.f + ay * z) / cell) * cell] : [ax, ay]);
  ctx.save();
  if (M) ctx.setTransform(1, 0, 0, 1, 0, 0);
  // le manche : une colonne d'un pixel fin, du dessous du dôme jusqu'à la main ; la crosse, deux pixels qui tournent sous la main
  if (pl.stickVisible) {
    ctx.fillStyle = STICK;
    const [x0, y0] = toS(pl.sx, pl.sy0), [, y1] = toS(pl.sx, pl.sy1);
    ctx.fillRect(x0, y0, cell, Math.max(cell, y1 - y0));
    // la crosse : sous la main, elle tourne vers le corps (un pixel sous la main, un à côté)
    if (pl.hook) { const hs = side > 0 ? -1 : 1; ctx.fillRect(x0, y1 + cell, cell, cell); ctx.fillRect(x0 + hs * cell, y1 + 2 * cell, cell, cell); }
  }
  // le dôme
  const g = domeGrid(), [bx, by] = toS(pl.dx, pl.dy);
  const cols = [null, col, dark, STICK];
  for (let k = 1; k <= 3; k++) {
    ctx.fillStyle = cols[k];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y * W + x] === k) ctx.fillRect(bx + x * cell, by + y * cell, cell, cell);
  }
  ctx.restore();
}
