/* =============================================================================
   land.js — NEIGE, FALAISES DE GLACE, RIVIÈRE GELÉE.
   -----------------------------------------------------------------------------
   ⚠️ TOUTE LA NEIGE DE CE JEU EST DESSINÉE PAR `bank()`, ET ELLE L'EST EN
   QUATRE COUCHES, TOUJOURS DANS CET ORDRE :

       1. l'ARÊTE       — un pixel de sn5, le point le plus clair de l'image
       2. la LUMIÈRE    — deux à trois pixels de sn4
       3. le CORPS      — sn3 puis sn2, sur l'essentiel de la hauteur
       4. l'OMBRE       — sn1/sn0 au contact de ce qui est en dessous

   Cet ordre n'est pas décoratif : c'est ce que fait la neige. Elle est
   éclairée par le ciel entier, donc son bord supérieur est toujours la chose
   la plus claire du cadre, et sa masse s'assombrit vers le bas beaucoup plus
   vite qu'un objet solide. Les deux références de Guillaume ne montrent
   presque rien d'autre que ça, répété à toutes les échelles.

   ⚠️ ET LE BORD SUPÉRIEUR N'EST JAMAIS UNE COURBE PROPRE. Il est bruité en
   quatre octaves puis DÉBORDÉ par des congères. Une congère au bord régulier
   se lit comme du plastique, quelle que soit la palette.
   ========================================================================== */

const Land = (function () {
  const P = CFG.PAL, W = CFG.W, H = CFG.H;
  const mix = Pix.mix, clamp01 = Pix.clamp01;

  /* Rend un profil de hauteur (un Int16Array de W valeurs) pour une congère.
     Séparé du dessin, parce que les props (braseros, personnage, cristaux)
     ont besoin de savoir OÙ est le sol pour s'y poser. Un décor qui sait sa
     propre altitude évite d'écrire des coordonnées à la main partout — et une
     coordonnée écrite à la main est une coordonnée qui périme au premier
     réglage. */
  function profile(cfg) {
    const f = Pix.fbm1(cfg.seed, 4);
    const g = Pix.fbm1(cfg.seed + 1013, 2);
    const out = new Int16Array(W);
    for (let x = 0; x < W; x++) {
      const wx = x + (cfg.ox || 0) * (cfg.par === undefined ? 1 : cfg.par);
      let y = cfg.y;
      y -= (f(wx * (cfg.freq || 0.011)) - 0.5) * (cfg.amp || 14);
      y -= (g(wx * (cfg.freq2 || 0.055)) - 0.5) * (cfg.amp2 || 4);
      if (cfg.tilt) y += (x / W - 0.5) * cfg.tilt;
      out[x] = Math.round(y);
    }
    return out;
  }

  /* La congère. `prof` vient de profile(), `bottom` est où elle s'arrête
     (souvent H, parfois la falaise en dessous). */
  function bank(fb, prof, bottom, opts) {
    opts = opts || {};
    const c5 = opts.c5 || P.sn5, c4 = opts.c4 || P.sn4;
    const c3 = opts.c3 || P.sn3, c2 = opts.c2 || P.sn2;
    const c1 = opts.c1 || P.sn1, c0 = opts.c0 || P.sn0;
    const lit = opts.lit === undefined ? 3 : opts.lit;
    const R = Pix.rng(opts.seed || 61);

    for (let x = 0; x < W; x++) {
      const y = prof[x];
      const bot = typeof bottom === "function" ? bottom(x) : bottom;
      if (y >= bot) continue;
      const depth = bot - y;

      /* 3 — le corps, d'abord, du plus clair au plus sombre en descendant.
         La transition n'est pas linéaire : la neige garde sa clarté longtemps
         puis chute vite dans l'ombre. */
      for (let j = 0; j < depth; j++) {
        const u = j / depth;
        let c;
        if (u < 0.30) c = c3;
        else if (u < 0.62) c = mix(c3, c2, (u - 0.30) / 0.32);
        else if (u < 0.85) c = mix(c2, c1, (u - 0.62) / 0.23);
        else c = mix(c1, c0, (u - 0.85) / 0.15);
        fb.set(x, y + j, c);
      }

      /* 2 — la lumière, sur les `lit` premiers pixels. */
      for (let j = 0; j < Math.min(lit, depth); j++) fb.set(x, y + j, c4);

      /* 1 — l'arête. Elle SAUTE là où la pente est forte : un liseré clair sur
         un flanc vertical serait un contresens d'éclairage (le ciel n'éclaire
         pas les murs). C'est le détail qui sépare une congère d'un ruban. */
      const yl = prof[Math.max(0, x - 1)], yr = prof[Math.min(W - 1, x + 1)];
      const slope = Math.abs(yr - yl) * 0.5;
      if (slope < 2.2) fb.set(x, y, c5);
      else fb.set(x, y, c4);
    }

    /* Le grain : quelques pixels plus clairs et plus sombres semés dans la
       masse. Sans lui, un aplat de 60 px de haut reste un aplat. */
    if (opts.grain !== false) {
      for (let i = 0; i < W * 0.9; i++) {
        const x = (R() * W) | 0;
        const bot = typeof bottom === "function" ? bottom(x) : bottom;
        const y = prof[x] + 4 + R() * Math.max(1, (bot - prof[x]) - 5);
        fb.blend(x, y, R() < 0.5 ? c4 : c1, 0.30);
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     LA FALAISE DE GLACE
     ───────────────────────────────────────────────────────────────────────
     Sous la lèvre de neige des deux références, il y a une paroi sombre à
     facettes, avec des fissures verticales et des stalactites. Elle est
     dessinée en FACETTES et non en dégradé : la glace casse en plans, elle ne
     s'arrondit pas. Chaque facette a sa propre valeur, tirée dans une plage
     étroite — c'est l'écart FAIBLE entre facettes qui fait lire « masse » ;
     un écart fort ferait lire « rochers empilés ».
     ═══════════════════════════════════════════════════════════════════════ */
  function cliff(fb, prof, bottom, opts) {
    opts = opts || {};
    const R = Pix.rng(opts.seed || 3307);
    const tone = [P.st2, P.st1, P.st3, P.st2, P.ice0, P.st1];
    // facettes : des colonnes de largeur variable
    let x = 0;
    while (x < W) {
      const w = 4 + (R() * 13) | 0;
      const c = tone[(R() * tone.length) | 0];
      const shift = (R() * 3) | 0;
      for (let i = 0; i < w && x + i < W; i++) {
        const xx = x + i;
        const top = prof[xx] + shift;
        const bot = typeof bottom === "function" ? bottom(xx) : bottom;
        for (let y = top; y < bot; y++) {
          const u = (y - top) / Math.max(1, bot - top);
          fb.set(xx, y, u > 0.62 ? mix(c, P.st0, (u - 0.62) / 0.38 * 0.85) : c);
        }
      }
      // la fissure : une colonne plus sombre au joint de deux facettes
      if (R() < 0.55) {
        const bot = typeof bottom === "function" ? bottom(x) : bottom;
        fb.vline(x, prof[x] + shift, bot, P.st0, 0.45);
      }
      x += w;
    }

    /* LES STALACTITES. Elles pendent de la lèvre, pas du haut de la paroi, et
       elles s'affinent. Une stalactite de largeur constante est un barreau. */
    const n = opts.icicles === undefined ? 26 : opts.icicles;
    for (let i = 0; i < n; i++) {
      const xx = (R() * W) | 0;
      const len = 3 + R() * 13;
      const wdt = R() < 0.75 ? 1 : 2;
      const y0 = prof[xx] + 2;
      for (let j = 0; j < len; j++) {
        const t = j / len;
        const ww = Math.max(1, Math.round(wdt * (1 - t)));
        for (let k = 0; k < ww; k++) fb.set(xx + k, y0 + j, t < 0.4 ? P.sn3 : mix(P.sn2, P.ice2, t));
        if (j === 0) fb.set(xx, y0, P.sn4);
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     LA RIVIÈRE GELÉE
     ───────────────────────────────────────────────────────────────────────
     Trois choses, et il en manque une seule pour que ça redevienne du bitume
     bleu :
       - les FRACTURES, en lignes brisées claires, jamais droites ;
       - les PLAQUES, larges zones à peine plus claires ou plus sombres ;
       - la RÉVERBÉRATION du ciel, en traînées horizontales floues. C'est elle
         qui dit « c'est une surface plate et lisse », et c'est le seul indice
         qui distingue de la glace d'un sol de pierre.
     ═══════════════════════════════════════════════════════════════════════ */
  function ice(fb, topProf, botProf, opts) {
    opts = opts || {};
    const R = Pix.rng(opts.seed || 8821);
    const f = Pix.fbm1((opts.seed || 8821) + 77, 3);

    for (let x = 0; x < W; x++) {
      const y0 = typeof topProf === "function" ? topProf(x) : topProf[x];
      const y1 = typeof botProf === "function" ? botProf(x) : botProf[x];
      for (let y = y0; y < y1; y++) {
        const u = clamp01((y - y0) / Math.max(1, y1 - y0));
        // plaques
        const pl = f(x * 0.021 + y * 0.05);
        let c = mix(P.ice0, P.ice1, clamp01(u * 1.5));
        if (pl > 0.60) c = mix(c, P.ice2, (pl - 0.60) * 1.4);
        if (pl < 0.32) c = mix(c, P.st0, (0.32 - pl) * 1.1);
        fb.set(x, y, c);
      }
    }

    // la réverbération : des traînées horizontales, plus denses en haut
    for (let i = 0; i < 44; i++) {
      const y = (typeof topProf === "function" ? topProf(0) : topProf[0]);
      const yy = y + R() * ((typeof botProf === "function" ? botProf(0) : botProf[0]) - y);
      const x0 = R() * W, len = 12 + R() * 70;
      const k = 0.05 + R() * 0.12;
      fb.hline(x0, x0 + len, yy, P.ice3, k);
    }

    // les fractures
    const nf = opts.cracks === undefined ? 14 : opts.cracks;
    for (let i = 0; i < nf; i++) {
      let x = R() * W;
      const yTop = typeof topProf === "function" ? topProf(0) : topProf[(x | 0) % W];
      let y = yTop + R() * 8;
      const segs = 2 + (R() * 4) | 0;
      for (let s = 0; s < segs; s++) {
        const dx = (R() - 0.35) * 70, dy = 3 + R() * 14;
        fb.line(x, y, x + dx, y + dy, P.ice3, 1, 0.55);
        fb.line(x, y + 1, x + dx, y + dy + 1, P.st0, 1, 0.30);
        x += dx; y += dy;
      }
    }
  }

  /* Cailloux et blocs affleurant la neige — l'image 1 en montre beaucoup, et
     ce sont eux qui empêchent les grandes surfaces blanches d'être vides. */
  function rocks(fb, prof, opts) {
    opts = opts || {};
    const R = Pix.rng(opts.seed || 4409);
    const n = opts.count || 16;
    for (let i = 0; i < n; i++) {
      const x = (R() * W) | 0;
      const w = 3 + (R() * 11) | 0, h = 2 + (R() * 6) | 0;
      const y = prof[x] - h + 1 + (R() * 2 | 0);
      const c = R() < 0.5 ? P.st2 : P.st1;
      for (let j = 0; j < h; j++) {
        const shr = Math.round((j / h) * w * 0.22);
        fb.hline(x + shr, x + w - shr, y + j, j === 0 ? mix(c, P.st3, 0.35) : c);
      }
      // le liseré de neige accroché au caillou
      fb.hline(x - 1, x + w + 1, y + h, P.sn4);
      fb.hline(x - 1, x + w + 1, y + h + 1, P.sn3);
    }
  }

  return { profile, bank, cliff, ice, rocks };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Land;
