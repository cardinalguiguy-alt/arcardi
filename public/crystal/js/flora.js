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

   ⚠️ IL Y A QUATRE POPULATIONS, PAS CINQ (421). `canopy` s'ajoute au fichier
   mais n'ajoute pas de plan : c'est le PLAN 4 vu de plus près, là où la forêt
   ne tient plus dans la bande d'horizon et sort par le haut du cadre. Même
   nature — une texture, pas des arbres —, même famille de couleurs, même
   absence de détail. Ce qui change est la GÉOMÉTRIE : elle se pose sur une
   ligne d'écran au lieu d'un profil de sol, et elle a un trou au milieu.
   Lui donner le statut de cinquième plan aurait invité à lui inventer des
   règles propres, et la doctrine des quatre valeurs aurait fini par en avoir
   cinq.
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

  /* ═══════════════════════════════════════════════════════════════════════
     LA CANOPÉE HAUTE — LE PLAN 4 QUI SORT PAR LE HAUT DU CADRE (421)
     ───────────────────────────────────────────────────────────────────────
     ⚠️ POURQUOI ELLE EXISTE : parce qu'on l'a MESURÉE. Les références
     réduites à 480×270 et comparées bande par bande aux planches du jeu
     donnaient, sur la bande y 0–45 :

         référence 106,9   ·   jeu 37,7   ·   écart −69

     et sur la course, 21,8 % de pixels sous L30 contre 2,5 %. Décomposé par
     tiers, le défaut était entièrement dans les COINS : côté référence 56 %
     des pixels du tiers gauche dépassent L90, côté jeu 0 %.

     ⚠️ ET DEUX CORRECTIONS ÉVIDENTES ONT ÉTÉ MESURÉES PUIS ÉCARTÉES (420) :
     monter le dégradé du ciel d'un cran rend +5,7 sur un écart de 56, et
     doubler le halo d'aurore rend +0,1 — rigoureusement rien. Le ciel n'est
     pas en cause : il MANQUE de la matière dans les coins hauts, et aucune
     couleur ne remplace de la matière.

     ⚠️ LE TROU DU MILIEU EST LA MOITIÉ DE L'IDÉE. Une canopée pleine largeur
     ferme le ciel et efface l'aurore, qui est le sujet. Les arbres tiennent
     donc les deux tiers extérieurs et libèrent le centre — c'est ce que font
     les deux références, et c'est ce qui concentre le regard là où il faut.
     `gap0`/`gap1` bornent le vide, `fade` donne sa largeur au fondu : sans ce
     fondu on ne voit pas une clairière, on voit deux murs.

     ⚠️ ET ELLE EST PÂLE, PRESQUE À LA VALEUR DE LA BRUME. La tentation est de
     la peindre lisible ; une canopée lisible se lit comme un plan proche et
     ramène le fond au premier plan. Elle doit être à la limite de disparaître.
     ═══════════════════════════════════════════════════════════════════════ */
  function canopy(fb, ox, cfg) {
    const R = Pix.rng(cfg.seed || 4021);
    const n = cfg.count || 620;
    const baseY = cfg.baseY === undefined ? 150 : cfg.baseY;
    const par = cfg.par === undefined ? 0.26 : cfg.par;
    const g0 = cfg.gap0 === undefined ? 150 : cfg.gap0;
    const g1 = cfg.gap1 === undefined ? 330 : cfg.gap1;
    const fade = cfg.fade === undefined ? 62 : cfg.fade;
    const hMin = cfg.hMin === undefined ? 90 : cfg.hMin;
    const hMax = cfg.hMax === undefined ? 240 : cfg.hMax;
    const c0 = cfg.c0 || mix(P.tre3, P.fog, 0.45);
    const c1 = cfg.c1 || mix(P.fog, P.sn4, 0.35);
    const alpha = cfg.alpha === undefined ? 0.85 : cfg.alpha;

    /* Le poids d'une abscisse : 1 dehors, 0 dans la trouée, et entre les deux
       une rampe cubique. ⚠️ EN CUBIQUE ET NON LINÉAIRE — une rampe linéaire
       laisse une densité constante sur toute sa largeur, donc une frange
       régulière qui se voit comme un dégradé de calque. */
    function weight(x) {
      if (x <= g0 - fade || x >= g1 + fade) return 1;
      if (x >= g0 && x <= g1) return 0;
      const u = x < g0 ? (g0 - x) / fade : (x - g1) / fade;
      return u * u * u;
    }

    /* ═══ LE LAVIS, AVANT LES TRONCS ═══════════════════════════════════════
       ⚠️ C'EST L'INVERSION QUI A DÉBLOQUÉ LE 421, ET ELLE VAUT D'ÊTRE ÉCRITE.
       Deux planches ont été perdues à densifier des traits clairs sur un ciel
       noir : à 700 puis à 1 900 troncs, on lisait de la PLUIE VERTICALE, et
       la bande haute ne remontait que de 38 à 59 pour une cible à 107.

       Une forêt lointaine noyée de brume n'est pas un fond sombre rayé de
       clair. C'est un CHAMP CLAIR — l'air lui-même, éclairé — dans lequel les
       troncs creusent des vides à peine plus foncés. Tant qu'on peint la
       figure au lieu du fond, aucune densité ne suffit : on ne fait
       qu'ajouter des rayures.

       On pose donc d'abord le champ, dégradé vers le haut (l'air est plus
       épais au ras de l'horizon), puis les troncs par-dessus. Le lavis
       respecte la même enveloppe horizontale que les troncs : le centre reste
       ouvert, sinon l'aurore se pose sur un voile. */
    if (cfg.wash !== false) {
      const wk = cfg.wash === undefined ? 0.55 : cfg.wash;
      const top = Math.max(0, baseY - hMax);
      for (let x = 0; x < W; x++) {
        const w = weight(x);
        if (w <= 0) continue;
        for (let y = top; y <= baseY && y < H; y++) {
          if (y < 0) continue;
          /* Plus dense en bas de la bande, plus léger vers les cimes — mais
             ⚠️ LA MODULATION RESTE FAIBLE (0,68 → 1,0). Premier essai à
             0,25 → 1,0 : le champ s'effaçait avant d'atteindre le haut du
             cadre, et les coins hauts restaient noirs, c'est-à-dire que le
             lavis ne réparait rien là où était tout le défaut. Une forêt
             noyée ne s'éclaircit pas vers le haut : elle disparaît d'un coup
             quand les arbres s'arrêtent. */
          const u = (y - top) / Math.max(1, baseY - top);
          fb.blend(x, y, c1, wk * w * (0.68 + Math.pow(u, 0.8) * 0.32));
        }
      }
    }

    for (let i = 0; i < n; i++) {
      const wx = R() * (W + 320) - 160;
      const x = Math.round(wx - ox * par);
      /* ⚠️ LA HAUTEUR EST TIRÉE EN PUISSANCE 0,55, PAS UNIFORMÉMENT. Un
         tirage uniforme entre deux bornes donne des cimes réparties à peu
         près à la même altitude : on obtient un PEIGNE, et à l'écran ça se lit
         comme de la pluie verticale — défaut vu à la première planche du 421.
         La puissance concentre les tirages vers le haut tout en gardant une
         minorité d'arbres bas, et c'est cette minorité qui casse la ligne des
         cimes et fabrique une masse. */
      const h = hMin + Math.pow(R(), 0.55) * (hMax - hMin);
      const c = mix(c0, c1, R());
      const jitter = R();                    // tiré même si l'arbre est rejeté
      if (x < -2 || x >= W + 2) continue;
      /* ⚠️ LE TIRAGE A LIEU AVANT LE REJET, TOUJOURS. Si on sortait de la
         boucle sans consommer le même nombre de tirages, la trouée du milieu
         décalerait la suite du flux et TOUS les arbres de droite changeraient
         quand on déplace le bord gauche. Règle du 381, appliquée ici. */
      if (jitter >= weight(x)) continue;
      const top = baseY - h;
      fb.vline(x, Math.max(-1, top), baseY, c, alpha);
      // deux à quatre moignons : au-delà on lit un arbre, et ce n'en est pas un
      const nb = 1 + (R() * 3) | 0;
      for (let b = 0; b < nb; b++) {
        const by = baseY - h * (0.30 + R() * 0.62);
        const bl = 1 + (R() * 3) | 0;
        const dir = R() < 0.5 ? -1 : 1;
        for (let k = 1; k <= bl; k++) fb.blend(x + dir * k, by - k * 0.6, c, 0.7 * alpha);
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

  return { tree, grove, distantMass, canopy, foreground, limb };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Flora;
