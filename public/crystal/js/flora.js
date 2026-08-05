/* =============================================================================
   flora.js — LES ARBRES, EN QUATRE PLANS.
   -----------------------------------------------------------------------------
   Les deux références de Guillaume sont d'abord des images d'ARBRES. Il y en a
   quatre populations distinctes, et les confondre est la façon la plus rapide
   de perdre la profondeur :

     PLAN 4 — la MASSE lointaine (image 2, la forêt derrière la rivière) :
              des traits verticaux d'un pixel, très clairs, très serrés. On n'y
              distingue aucune branche. Ce n'est pas une forêt d'arbres, c'est
              une TEXTURE.
     PLAN 3 — les arbres MOYENS : tronc de deux pixels, quatre à six branches,
              teinte intermédiaire. On lit la forme, pas le détail.
     PLAN 2 — les arbres PROCHES : silhouettes sombres, ramure complète.
     PLAN 1 — les BRANCHES D'AVANT-PLAN qui entrent par les coins du cadre
              (image 1). Presque noires, épaisses, avec des bouquets de
              feuilles mortes. Elles ne sont pas du décor : elles CADRENT.

   ⚠️ LA RÈGLE QUI GOUVERNE TOUT : plus c'est loin, plus c'est clair et moins
   c'est détaillé. Un arbre lointain dessiné avec autant de branches qu'un
   arbre proche ramène le fond au premier plan, même bien coloré.
   ========================================================================== */

const Flora = (function () {
  const P = CFG.PAL, W = CFG.W, H = CFG.H;
  const mix = Pix.mix;

  /* ── LA RAMURE RÉCURSIVE ────────────────────────────────────────────────
     ⚠️ L'ASYMÉTRIE EST OBLIGATOIRE. Les deux enfants d'une branche n'ont ni
     le même angle, ni la même longueur, ni la même probabilité d'exister. Un
     arbre parfaitement dichotomique se reconnaît instantanément comme
     fractal, et tous les arbres de la forêt se ressemblent. Ici chaque
     branche tire son propre déséquilibre.

     ⚠️ ET LA LONGUEUR DÉCROÎT PLUS VITE QUE L'ÉPAISSEUR NE PEUT SUIVRE. En
     dessous d'un pixel il n'y a rien : on arrête donc la récursion sur la
     LONGUEUR, jamais sur la profondeur seule, sinon on dessine des tas de
     pixels isolés au bout des rameaux. */
  function limb(fb, x, y, ang, len, wid, depth, col, R, opts) {
    if (len < 1.6 || depth <= 0) {
      // Bouquet de feuilles mortes en bout de rameau (image 1, avant-plan).
      if (opts.leaves && depth <= 0 && R() < opts.leaves) {
        const r = 1 + (R() * 2) | 0;
        fb.disc(x, y, r, col);
        if (R() < 0.4) fb.disc(x + (R() * 5 - 2.5), y + (R() * 5 - 2.5), r, col);
      }
      return;
    }
    const nx = x + Math.cos(ang) * len, ny = y + Math.sin(ang) * len;
    fb.line(x, y, nx, ny, col, Math.max(1, Math.round(wid)));

    /* LA NEIGE SUR LA BRANCHE. Elle ne tient que sur ce qui est à peu près
       horizontal — |sin(angle)| petit — et seulement sur les plans proches.
       C'est un pixel, décalé d'un vers le haut. Ce pixel-là fait la moitié de
       l'hiver de l'image. */
    if (opts.snow && wid >= 1.6) {
      const flat = 1 - Math.abs(Math.sin(ang));
      if (flat > 0.55) {
        const n = Math.max(1, Math.round(len));
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          if (R() < 0.62) fb.set(x + (nx - x) * t, y + (ny - y) * t - Math.ceil(wid / 2), opts.snowCol || P.sn3);
        }
      }
    }

    const spread = opts.spread || 0.62;
    const nDepth = depth - 1;
    // enfant « principal » : garde presque la direction
    limb(fb, nx, ny, ang + (R() - 0.5) * spread * 0.7, len * (0.70 + R() * 0.14),
         wid * 0.72, nDepth, col, R, opts);
    // enfant « latéral » : franchement écarté, et pas toujours là
    if (R() < (opts.fork === undefined ? 0.92 : opts.fork)) {
      const side = R() < 0.5 ? -1 : 1;
      limb(fb, nx, ny, ang + side * (spread * (0.6 + R() * 0.9)), len * (0.50 + R() * 0.22),
           wid * 0.60, nDepth, col, R, opts);
    }
    // troisième rameau, rare : c'est lui qui casse la dichotomie
    if (R() < 0.22) {
      limb(fb, nx, ny, ang + (R() - 0.5) * spread * 2.4, len * (0.34 + R() * 0.18),
           wid * 0.5, nDepth - 1, col, R, opts);
    }
  }

  function tree(fb, x, groundY, hgt, col, seed, opts) {
    opts = opts || {};
    const R = Pix.rng(seed);
    const wid = opts.wid || Math.max(1, hgt / 22);
    // Le tronc n'est pas droit : une très légère dérive, sinon c'est un poteau.
    const lean = (R() - 0.5) * 0.20;
    limb(fb, x, groundY, -Math.PI / 2 + lean, hgt * 0.38, wid,
         opts.depth || 5, col, R, opts);
    // évasement du pied
    if (wid >= 2) {
      for (let j = 0; j < 4; j++) {
        const w = Math.round(wid + (4 - j) * 0.5);
        fb.hline(x - w / 2, x + w / 2, groundY - j, col);
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PLAN 4 — LA MASSE LOINTAINE
     ───────────────────────────────────────────────────────────────────────
     La bande de forêt pâle de l'image 2. Des traits d'un pixel, de hauteur
     variable, très serrés, avec DEUX à QUATRE moignons de branche seulement.

     ⚠️ LA DENSITÉ EST LE SUJET. À 200 troncs on voit des piquets ; à 900 on
     voit une forêt. C'est un cas où la quantité change la NATURE de ce qu'on
     regarde, et c'est pour ça que ce plan est le moins cher et le plus
     rentable des quatre.
     ═══════════════════════════════════════════════════════════════════════ */
  function distantMass(fb, ox, cfg) {
    const R = Pix.rng(cfg.seed || 771);
    const n = cfg.count || 820;
    const prof = cfg.ground;
    for (let i = 0; i < n; i++) {
      const wx = R() * (W + 300) - 150;
      const x = Math.round(wx - ox * (cfg.par || 0.30));
      if (x < -2 || x >= W + 2) continue;
      const gy = typeof prof === "function" ? prof(x) : prof[Math.max(0, Math.min(W - 1, x))];
      const h = (cfg.hMin || 12) + R() * ((cfg.hMax || 34) - (cfg.hMin || 12));
      // La teinte varie par arbre : c'est ce qui donne l'épaisseur du massif.
      const c = mix(cfg.c0 || P.tre2, cfg.c1 || P.tre3, R());
      fb.vline(x, gy - h, gy, c, cfg.alpha === undefined ? 0.9 : cfg.alpha);
      const nb = 1 + (R() * 3) | 0;
      for (let b = 0; b < nb; b++) {
        const by = gy - h * (0.35 + R() * 0.6);
        const bl = 1 + (R() * 3) | 0;
        const dir = R() < 0.5 ? -1 : 1;
        for (let k = 1; k <= bl; k++) fb.blend(x + dir * k, by - k * 0.6, c, 0.75);
      }
    }
  }

  /* PLAN 3 & 2 — semis d'arbres complets sur un profil de sol. */
  function grove(fb, ox, cfg) {
    const R = Pix.rng(cfg.seed || 991);
    const n = cfg.count || 14;
    const prof = cfg.ground;
    const list = [];
    for (let i = 0; i < n; i++) {
      list.push({ wx: R() * (W + 260) - 130, h: (cfg.hMin || 40) + R() * ((cfg.hMax || 90) - (cfg.hMin || 40)), s: (R() * 1e9) | 0 });
    }
    // Les plus grands d'abord : les petits passent devant, ce qui range le
    // bosquet en profondeur sans avoir à lui donner une vraie coordonnée Z.
    list.sort((a, b) => b.h - a.h);
    for (const it of list) {
      const x = Math.round(it.wx - ox * (cfg.par || 0.55));
      if (x < -60 || x > W + 60) continue;
      const gy = typeof prof === "function" ? prof(x) : prof[Math.max(0, Math.min(W - 1, x))];
      tree(fb, x, gy, it.h, cfg.col || P.tre1, it.s, {
        depth: cfg.depth || 5,
        wid: cfg.wid || Math.max(1, it.h / 24),
        spread: cfg.spread || 0.6,
        snow: cfg.snow, snowCol: cfg.snowCol,
        leaves: cfg.leaves, fork: cfg.fork,
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PLAN 1 — LES BRANCHES D'AVANT-PLAN
     ───────────────────────────────────────────────────────────────────────
     ⚠️ CE PLAN N'EST PAS DU DÉCOR, C'EST DU CADRAGE. Sur l'image 1, deux
     grosses branches entrent par le haut et mangent un bon quart du cadre.
     Elles font trois choses qu'aucun autre élément ne fait :
       - elles donnent l'échelle (tout ce qui est derrière devient lointain) ;
       - elles ferment les coins, donc elles concentrent le regard au centre,
         là où est l'aurore ;
       - elles introduisent le NOIR dans une image qui n'a que des bleus, et
         c'est ce noir qui fait exister tous les autres.

     Elles sont donc dessinées en `sil0`, la valeur la plus sombre de la
     palette, sans aucune nuance et sans brume. Tout le reste de l'image est
     voilé ; ces branches-là, jamais.
     ═══════════════════════════════════════════════════════════════════════ */
  function foreground(fb, ox, cfg) {
    const arms = cfg.arms || [];
    for (const a of arms) {
      const R = Pix.rng(a.seed);
      const x = a.x - ox * (cfg.par || 1.55);
      limb(fb, x, a.y, a.ang, a.len, a.wid, a.depth || 6, cfg.col || P.sil0, R, {
        spread: a.spread || 0.55,
        leaves: a.leaves === undefined ? 0.55 : a.leaves,
        snow: a.snow, snowCol: P.sn2, fork: 0.95,
      });
    }
  }

  return { tree, grove, distantMass, foreground, limb };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Flora;
