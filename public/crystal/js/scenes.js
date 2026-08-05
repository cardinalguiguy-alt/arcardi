/* =============================================================================
   scenes.js — LES TABLEAUX.
   -----------------------------------------------------------------------------
   Deux scènes de cinématique, transcrites des deux images de référence de
   Guillaume :

     "corniche" — image 2 : la grande vue. Le personnage entre deux braseros,
                  la rivière gelée, la harde, la cabane sur la crête.
     "pont"     — image 1 : le sous-bois. Les colonnes brisées, le pont à
                  arches sur le gouffre, les deux chevaux dans la brume.

   ⚠️ L'ORDRE DE DESSIN EST LA MOITIÉ DU TRAVAIL. Chaque tableau est peint
   du plus lointain au plus proche, et entre deux plans on pose une NAPPE DE
   BRUME. C'est ce voile intercalé — jamais un voile final — qui fabrique
   l'immensité que Guillaume demande. Déplacer un appel à `haze` d'une ligne
   change la profondeur de toute l'image.

   ⚠️ ET CHAQUE PLAN A SON FACTEUR DE PARALLAXE. Le ciel bouge de 4 %, les
   branches d'avant-plan de 155 %. Sans ça, une caméra qui glisse donne un
   panneau peint qui coulisse ; avec, elle donne un espace.
   ========================================================================== */

const Scenes = (function () {
  const P = CFG.PAL, W = CFG.W, H = CFG.H;
  const mix = Pix.mix, clamp01 = Pix.clamp01;

  /* Vignette : elle assombrit les coins de deux valeurs, pas plus. Une
     vignette qui se voit est une vignette ratée — son seul travail est
     d'empêcher l'œil de sortir par les bords. */
  function vignette(fb, k) {
    k = k === undefined ? 0.42 : k;
    const cx = W / 2, cy = H / 2, m = Math.sqrt(cx * cx + cy * cy);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = (x - cx) / m, dy = (y - cy) / m;
        const d = Math.sqrt(dx * dx + dy * dy) * 1.42;
        if (d < 0.62) continue;
        fb.blend(x, y, P.sky0, Math.pow((d - 0.62) / 0.38, 1.8) * k);
      }
    }
  }

  /* Le grain : un pixel sur douze, décalé d'un cran, figé (pas d'animation).
     Il empêche les grands aplats de ciel de « bander » sur un écran mal
     calibré, et il donne à l'image la texture d'une planche peinte. */
  function grain(fb, k) {
    const R = Pix.rng(24601);
    const n = (W * H) / 9;
    for (let i = 0; i < n; i++) {
      const x = (R() * W) | 0, y = (R() * H) | 0;
      fb.blend(x, y, R() < 0.5 ? P.sn4 : P.sky0, (k === undefined ? 0.045 : k) * R());
    }
  }

  /* ═════════════════════════════════════════════════════════════════════════
     TABLEAU « LA CORNICHE » — d'après l'image 2
     ═════════════════════════════════════════════════════════════════════════ */
  const corniche = {
    id: "corniche",
    /* La scène est plus large que le cadre : la caméra peut glisser de 0 à
       CAM_MAX. C'est ce glissement lent qui ouvre le chapitre. */
    camMax: 150,

    ground: {},   // rempli au premier rendu, puis relu par les props

    build(ox) {
      /* Les profils de terrain. Ils sont recalculés à chaque image parce
         qu'ils dépendent de la caméra — mais ils sont DÉTERMINISTES, donc
         c'est le même terrain qui glisse, pas un terrain qui se régénère. */
      const g = this.ground;

      // le sol de la forêt lointaine, qui monte vers la droite pour former
      // la crête où est posée la cabane.
      g.far = new Int16Array(W);
      const fn = Pix.fbm1(3121, 3);
      for (let x = 0; x < W; x++) {
        const wx = x + ox * 0.22;
        let y = 154 - Math.pow(clamp01((wx - 250) / 260), 1.7) * 62;   // la crête
        y -= (fn(wx * 0.012) - 0.5) * 7;
        g.far[x] = Math.round(y);
      }

      // la berge médiane et la rivière gelée (à droite, elle vient vers nous)
      g.bank = Land.profile({ seed: 5501, y: 176, amp: 11, amp2: 4, freq: 0.010, ox, par: 0.42 });
      g.riverTop = new Int16Array(W);
      g.riverBot = new Int16Array(W);
      const rn = Pix.fbm1(6600, 3);
      for (let x = 0; x < W; x++) {
        const wx = x + ox * 0.42;
        // La rivière s'élargit en venant vers l'observateur : c'est la seule
        // perspective du tableau, et elle porte toute la profondeur du côté
        // droit.
        const t = clamp01((wx - 190) / 300);
        const top = 178 + t * 26 - (rn(wx * 0.013) - 0.5) * 6;
        const wide = 8 + t * t * 96;
        g.riverTop[x] = Math.round(top);
        g.riverBot[x] = Math.round(top + wide);
      }

      // LA CORNICHE elle-même : le promontoire de gauche. Au-delà de son
      // bord, le profil est renvoyé sous le cadre pour que rien ne s'y dessine.
      g.ledge = new Int16Array(W);
      const ln = Pix.fbm1(7702, 4);
      for (let x = 0; x < W; x++) {
        const wx = x + ox * 1.0;
        // le bord est oblique et bruité : une falaise à bord vertical net se
        // lit comme une découpe, pas comme de la neige en surplomb.
        const edge = 268 + (ln(wx * 0.05) - 0.5) * 14;
        if (wx > edge) { g.ledge[x] = H + 40; continue; }
        let y = 214 - (ln(wx * 0.014) - 0.5) * 15;
        y -= (ln(wx * 0.07) - 0.5) * 4;
        // la lèvre remonte au bord du vide (la neige s'accumule en corniche)
        const near = clamp01((wx - (edge - 46)) / 46);
        y -= Math.pow(near, 2.2) * 9;
        g.ledge[x] = Math.round(y);
      }
      return g;
    },

    render(fb, cam, t, st) {
      const ox = cam.x;
      const g = this.build(ox);

      /* 1 ── LE CIEL. Il monte jusqu'à sky5 : c'est la scène ouverte, on voit
         le ciel entier, il est donc plus clair que celui du pont. */
      Sky.gradient(fb, { top: P.sky1, bot: P.sky5, horizon: 168, steps: 16, curve: 2.3 });
      Sky.stars(fb, ox, t, { seed: 5501, count: 260, yMax: 0.60, par: 0.04 });
      Sky.aurora(fb, ox, t, { par: 0.045, gain: st && st.auroraGain !== undefined ? st.auroraGain : 1 });
      Sky.shootingStars(fb, ox, t, { seed: 2207, count: 3 });

      /* 2 ── LES MONTAGNES, deux chaînes. La lointaine est PLUS CLAIRE que le
         ciel (règle du 408), la proche est plus sombre. */
      Sky.ridge(fb, ox, { seed: 4501, par: 0.10, baseY: 158, h: 46, rough: 2.15, span: W * 1.5,
        body: mix(P.sky4, P.fog, 0.34), cap: mix(P.fog, P.sn4, 0.5), capDim: mix(P.sky5, P.fog, 0.5) });
      fb.haze(P.fog, 0.26, 0, 170, (u) => 0.35 + u * 0.65);
      Sky.ridge(fb, ox, { seed: 8802, par: 0.16, baseY: 162, h: 30, rough: 2.40, span: W * 1.15, x0: 90,
        body: mix(P.sky4, P.fog, 0.18), cap: mix(P.fog, P.sn4, 0.35), capDim: mix(P.sky4, P.fog, 0.35) });
      fb.haze(P.fog, 0.20, 0, 175, (u) => 0.30 + u * 0.70);

      /* 3 ── LA MASSE DE FORÊT LOINTAINE. Neuf cents traits d'un pixel.
         C'est le plan le moins cher du tableau et celui qui porte le plus
         d'immensité : on ne voit pas des arbres, on voit qu'il y en a trop
         pour être comptés. */
      Flora.distantMass(fb, ox, { seed: 771, count: 900, par: 0.22, ground: g.far,
        hMin: 10, hMax: 36, c0: mix(P.tre3, P.fog, 0.35), c1: mix(P.fog, P.sn3, 0.45), alpha: 0.92 });
      // la crête enneigée sur laquelle la forêt est posée
      for (let x = 0; x < W; x++) {
        fb.vline(x, g.far[x], Math.min(H, g.far[x] + 26), mix(P.sn2, P.fog, 0.45));
        fb.set(x, g.far[x], mix(P.sn4, P.fog, 0.3));
      }
      fb.haze(P.fog, 0.15, 0, 200, (u) => 0.4 + u * 0.6);

      /* 4 ── LA CABANE. Posée sur la crête, à droite. Le seul point chaud. */
      const cabX = Math.round(408 - ox * 0.22);
      if (cabX > -30 && cabX < W + 30) Props.cabin(fb, cabX, g.far[Math.max(0, Math.min(W - 1, cabX))] + 1, 1);

      /* 5 ── UNE SECONDE FORÊT, plus proche et plus sombre. */
      Flora.distantMass(fb, ox, { seed: 3355, count: 420, par: 0.34, ground: g.bank,
        hMin: 14, hMax: 44, c0: mix(P.tre2, P.fog, 0.10), c1: mix(P.tre3, P.fog, 0.25), alpha: 0.95 });

      /* 6 ── LA BERGE ET LA RIVIÈRE GELÉE. */
      Land.bank(fb, g.bank, (x) => g.riverTop[x], { seed: 5501,
        c5: mix(P.sn5, P.fog, 0.25), c4: mix(P.sn4, P.fog, 0.22), c3: mix(P.sn3, P.fog, 0.18),
        c2: P.sn2, c1: P.sn1, c0: P.sn0, lit: 2 });
      Land.ice(fb, g.riverTop, g.riverBot, { seed: 8821, cracks: 16 });
      // la neige de l'autre rive, sous la rivière, qui remonte vers nous
      Land.bank(fb, g.riverBot, H + 4, { seed: 9911, lit: 2 });
      Land.rocks(fb, g.riverBot, { seed: 4409, count: 7 });

      /* 7 ── LA HARDE. Quatre rennes sur la berge, à droite. Ils bougent à
         peine : une bête immobile dans un paysage immobile a l'air d'un
         décor, une bête qui pose la tête tous les six secondes est vivante. */
      const herd = [[352, 0], [366, 0.7], [381, 1.4], [396, 2.2]];
      for (let i = 0; i < herd.length; i++) {
        const hx = Math.round(herd[i][0] - ox * 0.42);
        if (hx < -20 || hx > W + 20) continue;
        const gy = g.bank[Math.max(0, Math.min(W - 1, hx))] + 2 + Math.round(Math.sin(t * 0.35 + herd[i][1]) * 0.5);
        Props.deer(fb, hx, gy, mix(P.tre0, P.fog, 0.30), 0.95, i % 2 === 0);
      }
      fb.haze(P.fog, 0.10, 100, 240, (u) => 0.5 + u * 0.5);

      /* 8 ── LES ARBRES MOYENS, sur la berge. */
      Flora.grove(fb, ox, { seed: 991, count: 11, par: 0.52, ground: g.bank,
        hMin: 34, hMax: 76, col: mix(P.tre1, P.fog, 0.12), depth: 5, spread: 0.62, snow: true,
        snowCol: mix(P.sn3, P.fog, 0.3) });
      fb.haze(P.fog, 0.07, 120, H);

      /* 9 ── LA CORNICHE. Neige, falaise, stalactites, cailloux. */
      Land.bank(fb, g.ledge, H + 4, { seed: 7702, lit: 3, grain: true });
      // la paroi de glace sous la lèvre : elle commence 14 px sous la crête
      const wallTop = new Int16Array(W);
      for (let x = 0; x < W; x++) wallTop[x] = g.ledge[x] > H ? H + 40 : g.ledge[x] + 16;
      Land.cliff(fb, wallTop, H + 4, { seed: 3307, icicles: 30 });
      Land.rocks(fb, g.ledge, { seed: 1201, count: 5 });

      /* 10 ── LES CRISTAUX, en bas à gauche du promontoire, et au bord droit.
         Ils sont l'annonce visuelle des Grottes de Cristal — le monde dit ce
         qu'il est avant qu'un texte le dise. */
      const cr1 = Math.round(44 - ox * 1.0);
      if (cr1 > -30 && cr1 < W + 30) Props.crystals(fb, cr1, H - 6, { seed: 909, count: 6, scale: 1.15 });
      const cr2 = Math.round(300 - ox * 1.0);
      if (cr2 > -30 && cr2 < W + 30) Props.crystals(fb, cr2, H - 14, { seed: 313, count: 4, scale: 0.85 });

      /* 11 ── LES DEUX BRASEROS ET LE PERSONNAGE.
         ⚠️ IL EST ENTRE LES DEUX, ET C'EST TOUTE LA MISE EN SCÈNE DE L'IMAGE 2.
         Deux feux qu'il n'a pas allumés, un de chaque côté : le cadre dit
         « tu es arrivé chez quelqu'un » avant la première réplique. */
      const bx1 = Math.round(96 - ox), bx2 = Math.round(214 - ox);
      const hx = Math.round(158 - ox);
      const gy = (x) => g.ledge[Math.max(0, Math.min(W - 1, Math.round(x)))];
      const lit1 = !st || st.brazier1 !== false, lit2 = !st || st.brazier2 !== false;
      if (lit1) Props.brazier(fb, bx1, gy(bx1) + 1, t, { scale: 1.0 });
      if (lit2) Props.brazier(fb, bx2, gy(bx2) + 1, t, { scale: 1.15 });
      Props.hero(fb, hx, gy(hx) + 1, t, { scale: 1 });

      /* 12 ── LE PREMIER PLAN. Arbres sombres au bord gauche, branches qui
         entrent par le haut. Aucune brume ne les touche : c'est leur noir qui
         fait exister tout le bleu du reste. */
      Flora.grove(fb, ox, { seed: 4404, count: 4, par: 1.28, ground: g.ledge,
        hMin: 120, hMax: 190, col: P.sil1, depth: 6, spread: 0.5, wid: 4, snow: true, snowCol: P.sn2 });
      Flora.foreground(fb, ox, { par: 1.55, col: P.sil0, arms: [
        { x: -26, y: -14, ang: 0.62, len: 46, wid: 5, depth: 6, seed: 8181, leaves: 0.62, snow: true },
        { x: 128, y: -30, ang: 1.16, len: 34, wid: 4, depth: 5, seed: 3434, leaves: 0.5, snow: true },
        { x: 470, y: -20, ang: 2.32, len: 42, wid: 5, depth: 6, seed: 6767, leaves: 0.58, snow: true },
      ]});

      /* 13 ── LA RÉVERBÉRATION DE L'AURORE sur la neige et la glace, puis la
         neige qui tombe, puis la vignette et le grain. Dans cet ordre. */
      Sky.reflect(fb, 168, 232, CFG.AURORA.REFLECT_K * (st && st.auroraGain !== undefined ? st.auroraGain : 1));
      Props.snowfall(fb, ox, t, { density: 1 });
      vignette(fb, 0.40);
      grain(fb, 0.05);
    },
  };

  /* ═════════════════════════════════════════════════════════════════════════
     TABLEAU « LE PONT » — d'après l'image 1
     ─────────────────────────────────────────────────────────────────────────
     ⚠️ CE TABLEAU EST LE MÊME MONDE VU AUTREMENT, ET C'EST DÉLIBÉRÉ : même
     palette, même aurore, même neige — mais un ciel qui s'arrête à sky3, une
     brume deux fois plus dense, et un avant-plan qui mange le tiers du cadre.
     On passe de « c'est immense » à « je ne vois pas loin », sans changer une
     seule couleur. C'est ce que fait l'image 1 par rapport à l'image 2.
     ═════════════════════════════════════════════════════════════════════════ */
  const pont = {
    id: "pont",
    camMax: 120,
    ground: {},

    build(ox) {
      const g = this.ground;
      const fn = Pix.fbm1(2233, 3);
      // le fond du gouffre : lac gelé, très loin, très voilé
      g.abyss = new Int16Array(W);
      for (let x = 0; x < W; x++) g.abyss[x] = 196;
      // la rive lointaine, où passent les chevaux
      g.farBank = new Int16Array(W);
      for (let x = 0; x < W; x++) {
        const wx = x + ox * 0.24;
        g.farBank[x] = Math.round(170 - (fn(wx * 0.011) - 0.5) * 8);
      }
      // la corniche du premier plan, à gauche : elle s'arrête net au gouffre
      g.ledge = new Int16Array(W);
      const ln = Pix.fbm1(4488, 4);
      for (let x = 0; x < W; x++) {
        const wx = x + ox * 1.0;
        const edge = 150 + (ln(wx * 0.06) - 0.5) * 12;
        if (wx > edge) { g.ledge[x] = H + 40; continue; }
        let y = 212 - (ln(wx * 0.015) - 0.5) * 13;
        const near = clamp01((wx - (edge - 40)) / 40);
        y -= Math.pow(near, 2.0) * 8;
        g.ledge[x] = Math.round(y);
      }
      // la plate-forme de droite, celle du pont
      g.right = new Int16Array(W);
      for (let x = 0; x < W; x++) {
        const wx = x + ox * 1.0;
        if (wx < 236) { g.right[x] = H + 40; continue; }
        let y = 218 - (ln(wx * 0.017 + 40) - 0.5) * 12;
        const near = clamp01((260 - wx) / 30);
        y -= Math.pow(clamp01(near), 2.0) * 7;
        g.right[x] = Math.round(y);
      }
      return g;
    },

    render(fb, cam, t, st) {
      const ox = cam.x;
      const g = this.build(ox);

      /* 1 ── LE CIEL, beaucoup plus sombre : on le regarde par une trouée. */
      Sky.gradient(fb, { top: P.sky0, bot: P.sky2, horizon: 200, steps: 12, curve: 2.8 });
      Sky.stars(fb, ox, t, { seed: 1919, count: 150, yMax: 0.48, par: 0.04, k: 0.85 });
      Sky.aurora(fb, ox, t, { par: 0.05, yOff: -6,
        gain: (st && st.auroraGain !== undefined ? st.auroraGain : 1) * 0.92 });

      /* 2 ── LES MONTAGNES.
         ⚠️ ELLES ÉTAIENT UNE MASSE BLANCHE À LA PREMIÈRE IMAGE, et elles
         mangeaient tout le milieu du cadre. Deux causes, et les deux sont la
         même erreur vue par deux bouts : une calotte de neige trop claire ET
         une brume à 0,30 qui ramenait le corps de la montagne à la valeur de
         la calotte. Une montagne dont le corps et le sommet ont la même
         valeur n'est plus une montagne, c'est une tache. Corps assombri,
         calotte réduite, brume divisée par deux. */
      Sky.ridge(fb, ox, { seed: 7171, par: 0.09, baseY: 168, h: 30, rough: 2.30, span: W * 1.3, x0: 40,
        body: mix(P.sky3, P.fog, 0.16), cap: mix(P.sky5, P.sn2, 0.45), capDim: mix(P.sky4, P.fog, 0.20) });
      fb.haze(P.fog, 0.14, 0, 200, (u) => 0.30 + u * 0.70);

      /* 3 ── LA FORÊT LOINTAINE. Pâle, dense — mais posée sur un sol
         beaucoup plus sombre qu'à la corniche : ici on est SOUS le couvert,
         et le sol ne reçoit plus le ciel. */
      Flora.distantMass(fb, ox, { seed: 5511, count: 780, par: 0.20, ground: g.farBank,
        hMin: 26, hMax: 68, c0: mix(P.tre2, P.fog, 0.22), c1: mix(P.tre3, P.fog, 0.30), alpha: 0.9 });
      for (let x = 0; x < W; x++) {
        fb.vline(x, g.farBank[x], g.farBank[x] + 3, mix(P.sn3, P.fog, 0.35));
        fb.vline(x, g.farBank[x] + 3, g.farBank[x] + 26, mix(P.sn1, P.st2, 0.42));
      }
      fb.haze(P.fog, 0.11, 60, H, (u) => 0.45 + u * 0.55);

      /* 4 ── LA CHAUSSÉE LOINTAINE ET LES DEUX CHEVAUX.
         ⚠️ ILS SONT PRESQUE INVISIBLES, ET C'EST LE SUJET. Sur la référence
         on met une seconde à les voir. Un contraste plus fort les
         transformerait en objectif de quête ; à ce contraste-là, ils sont une
         présence, ce qui est très différent — et beaucoup plus inquiétant.

         ⚠️ MAIS « PRESQUE » N'EST PAS « PAS ». Première image : ils avaient
         disparu pour de bon, noyés dans une brume à 0,42 posée juste après
         eux. On voile donc AVANT de les poser, plus du tout après. Un élément
         qu'on veut discret se peint faible ; il ne se peint pas fort puis se
         recouvre — sinon on ne contrôle plus rien. */
      const fdX = Math.round(238 - ox * 0.24);
      fb.haze(P.fog, 0.28, 150, 200, (u) => 0.5 + u * 0.5);
      /* ⚠️ LES CHEVAUX SE TIENNENT SUR LA NEIGE, PAS SUR UNE CHAUSSÉE. La
         première version leur avait construit un petit pont : à cette échelle
         et dans cette brume, il se lisait comme une TABLE, et les chevaux
         dessus comme des objets posés. Un décor qu'on ne peut pas rendre
         lisible à sa taille réelle, on ne le rend pas — on le remplace par ce
         qu'il servait à porter. */
      const farSnow = 188;
      for (let x = 0; x < W; x++) {
        fb.vline(x, farSnow, farSnow + 8, mix(P.sn2, P.fog, 0.30));
        fb.set(x, farSnow, mix(P.sn4, P.fog, 0.28));
      }
      const hxs = [Math.round(212 - ox * 0.24), Math.round(240 - ox * 0.24)];
      for (let i = 0; i < 2; i++) {
        Props.horse(fb, hxs[i], farSnow, mix(P.st1, P.fog, 0.26), 1.15, i === 1);
      }
      Props.brazier(fb, Math.round(300 - ox * 0.24), farSnow, t, { scale: 0.5, k: 0.6 });

      /* 5 ── LE GOUFFRE. Entre la rive lointaine et le premier plan il y a du
         VIDE, et il doit être la zone la plus sombre du tableau — sans quoi le
         pont n'enjambe rien. */
      for (let x = 0; x < W; x++) {
        for (let y = 197; y < H; y++) {
          const u = (y - 197) / (H - 197);
          fb.set(x, y, mix(mix(P.st1, P.fog, 0.22), P.sky0, Math.pow(u, 0.75) * 0.92));
        }
      }
      fb.haze(P.fog, 0.10, 197, 232, (u) => 1 - u);

      /* 6 ── LES COLONNES BRISÉES, plan médian. Elles donnent l'échelle et
         elles racontent : quelqu'un a bâti ici, il y a longtemps. */
      const cols = [[188, 62, false], [292, 40, false], [158, 26, false], [348, 76, true]];
      for (const c of cols) {
        const cx = Math.round(c[0] - ox * 0.62);
        if (cx < -20 || cx > W + 20) continue;
        Props.column(fb, cx, 194, c[1], { seed: 55 + c[0], w: 9, capital: c[2] });
      }
      // la grande architrave posée sur deux colonnes, à droite (image 1)
      const aX = Math.round(366 - ox * 0.62);
      if (aX > -90 && aX < W + 90) {
        Props.column(fb, aX + 60, 194, 72, { seed: 91, w: 8, capital: true });
        fb.rect(aX - 12, 120, 84, 6, P.st1);
        fb.hline(aX - 12, aX + 72, 119, P.st2);
        fb.hline(aX - 12, aX + 72, 118, mix(P.sn3, P.fog, 0.3));
        fb.hline(aX - 12, aX + 72, 126, P.st0);
      }

      /* 7 ── LES ARBRES MOYENS, partout : c'est un sous-bois. */
      Flora.grove(fb, ox, { seed: 2211, count: 16, par: 0.72, ground: g.farBank,
        hMin: 70, hMax: 150, col: mix(P.tre0, P.fog, 0.10), depth: 6, spread: 0.66, wid: 2,
        snow: true, snowCol: mix(P.sn2, P.fog, 0.30) });
      fb.haze(P.fog, 0.06, 100, H);

      /* 8 ── LE GRAND PONT, au premier plan, qui enjambe le gouffre.
         Il relie la corniche de gauche à la plate-forme de droite : c'est le
         chemin, et c'est pour ça qu'il est le seul objet parfaitement net du
         tableau. */
      const bx0 = Math.round(118 - ox), bx1 = Math.round(338 - ox);
      Props.bridge(fb, { x0: bx0, x1: bx1, deck: 218, deckH: 8, bottom: H + 4, span: 54, seed: 1717 });

      /* 9 ── LES DEUX RIVES DU PREMIER PLAN. */
      Land.bank(fb, g.ledge, H + 4, { seed: 4488, lit: 3 });
      const wallL = new Int16Array(W);
      for (let x = 0; x < W; x++) wallL[x] = g.ledge[x] > H ? H + 40 : g.ledge[x] + 15;
      Land.cliff(fb, wallL, H + 4, { seed: 5150, icicles: 26 });
      Land.bank(fb, g.right, H + 4, { seed: 6161, lit: 3 });
      const wallR = new Int16Array(W);
      for (let x = 0; x < W; x++) wallR[x] = g.right[x] > H ? H + 40 : g.right[x] + 15;
      Land.cliff(fb, wallR, H + 4, { seed: 7272, icicles: 20 });
      Land.rocks(fb, g.ledge, { seed: 8383, count: 5 });

      /* 10 ── LES CRISTAUX du coin bas-droit (référence n°1). */
      const crX = Math.round(430 - ox);
      if (crX > -40 && crX < W + 40) Props.crystals(fb, crX, H - 12, { seed: 4747, count: 7, scale: 1.35 });

      /* 11 ── LES BRASEROS DE LA CORNICHE et le personnage, s'il est en scène. */
      const gy = (x) => {
        const i = Math.max(0, Math.min(W - 1, Math.round(x)));
        return g.ledge[i] > H ? g.right[i] : g.ledge[i];
      };
      const b1 = Math.round(52 - ox), b2 = Math.round(110 - ox);
      Props.brazier(fb, b1, gy(b1) + 1, t, { scale: 0.9 });
      Props.brazier(fb, b2, gy(b2) + 1, t, { scale: 1.0 });
      if (!st || st.hero !== false) {
        const hx = Math.round((st && st.heroX !== undefined ? st.heroX : 82) - ox);
        Props.hero(fb, hx, gy(hx) + 1, t, { scale: 1 });
      }

      /* 12 ── L'AVANT-PLAN. Sur l'image 1 il occupe les deux coins hauts et
         il est PRESQUE NOIR. C'est ce qui donne au tableau sa profondeur de
         champ — et sa claustrophobie. */
      Flora.grove(fb, ox, { seed: 9092, count: 2, par: 1.3, ground: g.ledge,
        hMin: 170, hMax: 240, col: P.sil0, depth: 6, spread: 0.52, wid: 7, snow: true, snowCol: P.sn2 });
      Flora.foreground(fb, ox, { par: 1.5, col: P.sil0, arms: [
        { x: -34, y: -20, ang: 0.55, len: 58, wid: 6, depth: 7, seed: 1414, leaves: 0.68, snow: true },
        { x: 62,  y: -46, ang: 1.02, len: 44, wid: 5, depth: 6, seed: 2525, leaves: 0.6,  snow: true },
        { x: 452, y: -26, ang: 2.42, len: 52, wid: 6, depth: 7, seed: 3636, leaves: 0.66, snow: true },
        { x: 386, y: -50, ang: 2.02, len: 38, wid: 4, depth: 5, seed: 4646, leaves: 0.55 },
      ]});

      Sky.reflect(fb, 196, 240, CFG.AURORA.REFLECT_K * 0.7);
      Props.snowfall(fb, ox, t, { density: 0.85 });
      vignette(fb, 0.52);
      grain(fb, 0.05);
    },
  };

  const all = { corniche, pont };
  return { all, get(id) { return all[id]; }, vignette, grain };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Scenes;
