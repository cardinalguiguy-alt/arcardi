/* =============================================================================
   pix.js — TAMPON D'IMAGE LOGICIEL.
   -----------------------------------------------------------------------------
   ⚠️ C'EST LA DÉCISION D'ARCHITECTURE DU JEU, ET ELLE EST DÉLIBÉRÉE.

   Rien ici ne touche au DOM. Tout le dessin va dans un Uint8ClampedArray de
   480x270, et l'affichage n'est qu'un putImageData suivi d'un agrandissement
   au plus proche voisin. Trois raisons, dans l'ordre d'importance :

     1. ⚠️ AUCUN ANTICRÉNELAGE N'EST POSSIBLE. Un canvas 2D lisse les bords des
        arcs, des lignes obliques et des dégradés — c'est très exactement ce
        qui trahit un faux pixel art. Ici un pixel est écrit ou ne l'est pas.
        La palette reste la palette.

     2. ⚠️ LE MÊME CODE TOURNE DANS NODE. `tools/preview.mjs` charge ces
        fichiers, rend une scène et écrit un PNG. On peut donc REGARDER ce
        qu'on livre avant de le livrer — c'est la dette que le contexte 417
        signale trois fois (le sillage du labyrinthe, la gerbe du 414, le mur
        du 417 : des effets corrects sur le papier, jamais regardés).

     3. Le mélange additif de l'aurore est écrit à la main, donc exact et
        identique partout. `globalCompositeOperation` varie d'un navigateur à
        l'autre sur les bords.

   ⚠️ LE TAMPON EST TOUJOURS OPAQUE. On n'écrit jamais dans le canal alpha ;
   `a` est un facteur de mélange, pas une transparence conservée. Un tampon
   qui garde de la transparence se compose mal avec lui-même, et on finit par
   voir à travers une montagne.
   ========================================================================== */

const Pix = (function () {

  /* ── LE GÉNÉRATEUR ALÉATOIRE ─────────────────────────────────────────────
     ⚠️ IL EST SEMÉ, ET C'EST OBLIGATOIRE. Chaque couche de décor rappelle
     `Pix.rng(graine)` au début de CHAQUE image. Sans ça les arbres
     changeraient de place soixante fois par seconde. Le corollaire est qu'on
     ne doit jamais tirer un nombre « en plus » au milieu d'une couche sans
     réfléchir : tout ce qui suit se décale. C'est la règle du zip 381,
     retrouvée ici par le même bout (voir SKY_CLOUD_COUNT: 0 côté défi). */
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5;  s >>>= 0;
      return s / 4294967296;
    };
  }

  /* Bruit de valeur 1D, lissé au cosinus. Sert au relief de la neige, aux
     crêtes de montagne et à l'enveloppe de l'aurore. Déterministe pour une
     graine donnée, donc rejouable dans node. */
  function noise1(seed) {
    const R = rng(seed);
    const g = new Float32Array(512);
    for (let i = 0; i < 512; i++) g[i] = R();
    return function (x) {
      const i = Math.floor(x), f = x - i;
      const a = g[((i % 512) + 512) % 512];
      const b = g[(((i + 1) % 512) + 512) % 512];
      const u = (1 - Math.cos(f * Math.PI)) * 0.5;
      return a * (1 - u) + b * u;
    };
  }

  /* Bruit fractal : quatre octaves, chacune deux fois plus fine et deux fois
     plus discrète. C'est ce qui donne à une crête de neige des bosses ET des
     grumeaux, au lieu d'une sinusoïde propre qui se voit tout de suite. */
  function fbm1(seed, oct) {
    const n = [];
    for (let i = 0; i < (oct || 4); i++) n.push(noise1(seed + i * 7919));
    return function (x) {
      let v = 0, amp = 1, frq = 1, tot = 0;
      for (let i = 0; i < n.length; i++) {
        v += n[i](x * frq) * amp; tot += amp; amp *= 0.5; frq *= 2.03;
      }
      return v / tot;
    };
  }

  const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  /* Mélange deux couleurs de palette. Rend un tableau NEUF : les couleurs de
     la palette ne doivent jamais être modifiées sur place, elles sont
     partagées par tout le jeu. */
  const mix = (c1, c2, t) => [
    c1[0] + (c2[0] - c1[0]) * t,
    c1[1] + (c2[1] - c1[1]) * t,
    c1[2] + (c2[2] - c1[2]) * t,
  ];

  function Buffer(w, h) {
    this.w = w; this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
    for (let i = 3; i < this.d.length; i += 4) this.d[i] = 255;
  }

  /* ── ÉCRITURE DIRECTE ───────────────────────────────────────────────────── */
  Buffer.prototype.set = function (x, y, c) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) << 2;
    this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2];
  };

  /* ── MÉLANGE NORMAL (source par-dessus) ─────────────────────────────────── */
  Buffer.prototype.blend = function (x, y, c, a) {
    if (a >= 1) return this.set(x, y, c);
    if (a <= 0) return;
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) << 2, d = this.d;
    d[i]     = d[i]     + (c[0] - d[i])     * a;
    d[i + 1] = d[i + 1] + (c[1] - d[i + 1]) * a;
    d[i + 2] = d[i + 2] + (c[2] - d[i + 2]) * a;
  };

  /* ── MÉLANGE ADDITIF ─────────────────────────────────────────────────────
     Réservé à ce qui ÉMET de la lumière : l'aurore, les flammes, les cristaux,
     les étoiles. Une lumière qui s'ajoute ne peut pas assombrir ce qu'elle
     éclaire, ce qui est la moitié de la raison pour laquelle une aurore peinte
     en mélange normal a toujours l'air d'un autocollant. */
  Buffer.prototype.add = function (x, y, c, a) {
    if (a <= 0) return;
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) << 2, d = this.d;
    d[i]     = d[i]     + c[0] * a;
    d[i + 1] = d[i + 1] + c[1] * a;
    d[i + 2] = d[i + 2] + c[2] * a;
  };

  /* ── PRIMITIVES ─────────────────────────────────────────────────────────── */
  Buffer.prototype.hline = function (x0, x1, y, c, a) {
    if (x0 > x1) { const t = x0; x0 = x1; x1 = t; }
    for (let x = x0 | 0; x <= (x1 | 0); x++) (a === undefined || a >= 1) ? this.set(x, y, c) : this.blend(x, y, c, a);
  };
  Buffer.prototype.vline = function (x, y0, y1, c, a) {
    if (y0 > y1) { const t = y0; y0 = y1; y1 = t; }
    for (let y = y0 | 0; y <= (y1 | 0); y++) (a === undefined || a >= 1) ? this.set(x, y, c) : this.blend(x, y, c, a);
  };
  Buffer.prototype.rect = function (x, y, w, h, c, a) {
    for (let j = 0; j < h; j++) this.hline(x, x + w - 1, y + j, c, a);
  };
  Buffer.prototype.fill = function (c) {
    for (let y = 0; y < this.h; y++) this.hline(0, this.w - 1, y, c);
  };

  /* Trait épais, en pixels carrés. Pas de Bresenham à demi-pixel : un trait
     d'un pixel de large doit toucher un pixel par colonne, pas deux à moitié. */
  Buffer.prototype.line = function (x0, y0, x1, y1, c, w, a) {
    w = w || 1;
    const dx = x1 - x0, dy = y1 - y0;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
    const h = (w - 1) / 2;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + dx * t, y = y0 + dy * t;
      if (w <= 1) { (a === undefined || a >= 1) ? this.set(x, y, c) : this.blend(x, y, c, a); continue; }
      for (let oy = -h; oy <= h; oy++)
        for (let ox = -h; ox <= h; ox++)
          (a === undefined || a >= 1) ? this.set(x + ox, y + oy, c) : this.blend(x + ox, y + oy, c, a);
    }
  };

  /* Disque plein — utilisé pour les bouquets de feuilles et les congères. */
  Buffer.prototype.disc = function (cx, cy, r, c, a) {
    const r2 = r * r;
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++)
        if (x * x + y * y <= r2) (a === undefined || a >= 1) ? this.set(cx + x, cy + y, c) : this.blend(cx + x, cy + y, c, a);
  };

  /* Halo lumineux, additif, à décroissance quadratique. C'est ce qui pose une
     flamme DANS la scène au lieu de la poser DESSUS. */
  Buffer.prototype.glow = function (cx, cy, r, c, k) {
    const r2 = r * r;
    for (let y = -r; y <= r; y++) {
      const yy = cy + y | 0;
      if (yy < 0 || yy >= this.h) continue;
      for (let x = -r; x <= r; x++) {
        const d2 = x * x + y * y;
        if (d2 > r2) continue;
        const f = 1 - d2 / r2;
        this.add(cx + x, yy, c, f * f * k);
      }
    }
  };

  /* ── BRUME ATMOSPHÉRIQUE ────────────────────────────────────────────────
     ⚠️ APPELÉE ENTRE LES COUCHES, JAMAIS À LA FIN. C'est elle, et elle seule,
     qui fabrique l'impression d'immensité : chaque plan est voilé par tout ce
     qui le sépare de l'œil. Une brume posée en dernier aplatit tout d'un coup
     et donne un décor sous cellophane.

     `y0`/`y1` permettent de charger la brume à une hauteur donnée — au ras du
     sol elle est toujours plus dense, c'est ce qu'on voit sur les deux images
     de référence, et c'est ce qui fait « flotter » les montagnes. */
  Buffer.prototype.haze = function (c, a, y0, y1, curve) {
    y0 = y0 === undefined ? 0 : y0;
    y1 = y1 === undefined ? this.h : y1;
    for (let y = y0; y < y1; y++) {
      let k = a;
      if (curve) {
        const t = (y - y0) / Math.max(1, y1 - y0);
        k = a * curve(t);
      }
      if (k > 0.002) this.hline(0, this.w - 1, y, c, k);
    }
  };

  return { Buffer, rng, noise1, fbm1, clamp01, lerp, mix };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Pix;
