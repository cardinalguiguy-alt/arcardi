/* =============================================================================
   shots.js — LES TABLEAUX RAPPROCHÉS.
   -----------------------------------------------------------------------------
   ⚠️ POURQUOI CE FICHIER EXISTE : « les illustrations doivent suivre
   l'histoire ». Le chapitre 1 tenait sur DEUX tableaux pour cinquante-cinq
   répliques. Le joueur lisait quinze lignes devant la même image, et la même
   image ne disait rien de ce qu'il lisait — on regardait une vue générale
   pendant qu'on tendait la main vers une flamme.

   ⚠️ ET LA SOLUTION N'EST PAS DE ZOOMER. Agrandir un tampon de pixel art d'un
   facteur non entier détruit la grille ; l'agrandir d'un facteur entier double
   la taille du pixel, et la scène cesse d'appartenir au même jeu que celle
   d'avant. On ne zoome donc pas : ON RECOMPOSE. Chaque plan rapproché est un
   tableau à part entière, dessiné à SA propre échelle avec les mêmes
   primitives et la même palette — un brasero de 13 px devient un brasero de
   72 px, dessiné par le même code, avec les mêmes six couleurs de pierre.

   C'est plus cher qu'un zoom, et c'est la seule façon d'avoir un gros plan qui
   soit du dessin plutôt qu'un agrandissement.

   LES SEPT PLANS, dans l'ordre du chapitre :
     seuil     — on sort du passage. Presque noir, la vallée en contrebas.
     braseros  — gros plan sur les deux feux et la main tendue.
     harde     — les rennes sur la rivière gelée, à trente pixels.
     crete     — la cabane et sa fenêtre, le seul point chaud du monde.
     chevaux   — les deux chevaux de verre dans la brume, tout près.
     memoire   — ⚠️ LE PIVOT : l'aurore forme une file de gens qui s'en vont.
     aubin     — il se retourne. La lanterne au cristal fêlé.
   ========================================================================== */

const Shots = (function () {
  const P = CFG.PAL, W = CFG.W, H = CFG.H;
  const mix = Pix.mix, clamp01 = Pix.clamp01;

  /* ── LE FOND COMMUN ─────────────────────────────────────────────────────
     Ciel, aurore, masse d'arbres, brume. Tous les plans rapprochés le
     partagent : c'est ce qui garantit qu'un gros plan et une vue générale
     appartiennent au même monde et à la même nuit. Le paramètre `dark` fait
     glisser toute la scène d'un cran vers la nuit sans changer une couleur —
     on choisit la PLAGE de la palette, on n'en invente pas. */
  function backdrop(fb, ox, t, o) {
    o = o || {};
    const hz = o.horizon === undefined ? 150 : o.horizon;
    Sky.gradient(fb, { top: o.top || P.sky0, bot: o.bot || P.sky3,
                       horizon: hz + 40, steps: 13, curve: 2.5 });
    Sky.stars(fb, ox, t, { seed: o.seed || 4242, count: o.stars === undefined ? 170 : o.stars,
                           yMax: (hz / H) * 0.85, par: 0.03, k: 0.9 });
    if (o.aurora !== false) {
      Sky.aurora(fb, ox, t, { par: 0.03, yOff: o.auroraY || -22,
        gain: (o.gain === undefined ? 0.8 : o.gain) * (o.st && o.st.auroraGain !== undefined ? o.st.auroraGain : 1) });
    }
    if (o.ridge !== false) {
      Sky.ridge(fb, ox, { seed: 5757, par: 0.05, baseY: hz + 4, h: o.ridgeH || 24, rough: 2.3,
        span: W * 1.25, body: mix(P.sky3, P.fog, 0.14),
        cap: mix(P.sky5, P.sn2, 0.42), capDim: mix(P.sky4, P.fog, 0.2) });
    }
    fb.haze(P.fog, o.hazeSky === undefined ? 0.13 : o.hazeSky, 0, hz + 30, (u) => 0.3 + u * 0.7);

    /* La masse d'arbres. À ces échelles rapprochées elle n'est plus une
       texture : on distingue les troncs. On monte donc la hauteur et on
       baisse la densité — c'est le même code, lu autrement. */
    /* ⚠️ LE SOL DE LA MASSE ONDULE. Posée sur une horizontale parfaite, une
       forêt de cinq cents traits verticaux donne un CODE-BARRES — le défaut
       est apparu deux fois, sur deux tableaux différents, avant qu'on ne
       comprenne que ce n'est jamais la densité qui manque mais le TERRAIN.
       Douze pixels d'ondulation suffisent. */
    const gy = new Int16Array(W);
    const gn = Pix.fbm1((o.seed || 4242) + 555, 3);
    for (let x = 0; x < W; x++) gy[x] = Math.round(hz - (gn((x + ox * 0.16) * 0.010) - 0.5) * 12);
    Flora.distantMass(fb, ox, { seed: o.seed || 4242, count: o.mass === undefined ? 560 : o.mass,
      par: 0.16, ground: gy, hMin: o.tMin || 30, hMax: o.tMax || 96,
      c0: mix(P.tre2, P.fog, 0.24), c1: mix(P.tre3, P.fog, 0.32), alpha: 0.9 });
    // le pied de la masse : une bande de neige tassée, pas une ligne franche
    for (let x = 0; x < W; x++) {
      fb.vline(x, gy[x], gy[x] + 3, mix(P.sn2, P.fog, 0.34));
      fb.vline(x, gy[x] + 3, gy[x] + 16, mix(P.sn1, P.st2, 0.46));
    }
    fb.haze(P.fog, o.hazeMass === undefined ? 0.16 : o.hazeMass, hz - 90, H, (u) => 0.4 + u * 0.6);

    if (o.grove !== false) {
      Flora.grove(fb, ox, { seed: (o.seed || 4242) + 11, count: o.groveN || 7, par: 0.42,
        ground: gy, hMin: 90, hMax: 190, col: mix(P.tre0, P.fog, 0.12), depth: 6,
        spread: 0.66, wid: 3, snow: true, snowCol: mix(P.sn2, P.fog, 0.3) });
      fb.haze(P.fog, 0.07, hz - 60, H);
    }
  }

  /* ── LE SOL PROCHE ──────────────────────────────────────────────────────
     ⚠️ IL PORTE MAINTENANT DES TRACES DE PAS ET DES CONGÈRES BALAYÉES PAR LE
     VENT, et c'est ce qui manquait le plus aux premiers rendus. Une étendue
     de neige lisse est une nappe ; une étendue de neige où l'on voit d'où
     quelqu'un est venu est un LIEU. */
  function nearGround(fb, ox, t, o) {
    o = o || {};
    const prof = Land.profile({ seed: o.seed || 6060, y: o.y || 206, amp: 13, amp2: 5,
                                freq: 0.009, ox, par: 1 });
    Land.bank(fb, prof, H + 4, { seed: (o.seed || 6060) + 3, lit: 4 });

    /* LES STRIES DE VENT : des traînées horizontales très allongées, à peine
       plus claires ou plus sombres, alignées avec la pente. Deux valeurs
       d'écart, jamais plus — au-delà on lit des rayures. */
    const R = Pix.rng((o.seed || 6060) + 91);
    for (let i = 0; i < 90; i++) {
      const x0 = R() * (W + 120) - 60 - ox * 0.4;
      const y = prof[Math.max(0, Math.min(W - 1, x0 | 0))] + 5 + R() * (H - 210);
      const len = 14 + R() * 62;
      const c = R() < 0.55 ? P.sn4 : P.sn1;
      fb.hline(x0, x0 + len, y, c, 0.20 + R() * 0.22);
      if (R() < 0.4) fb.hline(x0 + 3, x0 + len - 4, y + 1, c, 0.12);
    }

    /* LES TRACES DE PAS. Deux empreintes par pas, décalées, qui s'éloignent en
       diminuant : c'est une perspective très pauvre et elle suffit largement à
       dire « quelqu'un est venu de là-bas ». Chaque empreinte est un creux —
       donc une ombre EN HAUT et une arête EN BAS, l'inverse d'une bosse. Ce
       renversement est tout ce qui distingue un pas d'un caillou. */
    if (o.tracks !== false) {
      const tx = (o.trackX === undefined ? 300 : o.trackX) - ox;
      const ty = o.trackY === undefined ? H - 12 : o.trackY;
      for (let i = 0; i < 14; i++) {
        const u = i / 14;
        const s = 1 - u * 0.72;
        const px = tx - u * (o.trackDX === undefined ? 150 : o.trackDX) + (i % 2 ? 4 : -4) * s;
        const py = ty - u * (o.trackDY === undefined ? 46 : o.trackDY);
        const w = Math.max(1, Math.round(3 * s)), h = Math.max(1, Math.round(2 * s));
        fb.rect(px, py, w, h, P.sn1, 0.55 - u * 0.28);        // le creux
        fb.hline(px, px + w - 1, py + h, P.sn5, 0.42 - u * 0.2); // l'arête basse
      }
    }
    return prof;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     1. LE SEUIL — on sort du passage
     ───────────────────────────────────────────────────────────────────────
     Le plan le plus sombre du jeu, et il est là pour ça : c'est l'étalon. Tout
     ce qui vient après paraîtra clair parce qu'on a commencé ici. On voit la
     vallée par une ouverture de roche, en contre-jour.
     ═══════════════════════════════════════════════════════════════════════ */
  const seuil = {
    id: "seuil", camMax: 40, ground: {},
    render(fb, cam, t, st) {
      const ox = cam.x;
      backdrop(fb, ox, t, { st, horizon: 168, gain: 0.9, auroraY: -6, stars: 200,
                            mass: 460, tMin: 20, tMax: 70, groveN: 5, seed: 1717 });
      const prof = Land.profile({ seed: 3131, y: 214, amp: 10, amp2: 4, freq: 0.01, ox, par: 1 });
      Land.bank(fb, prof, H + 4, { seed: 3134, lit: 3 });
      Land.rocks(fb, prof, { seed: 3137, count: 6 });

      /* L'EMBRASURE DU PASSAGE. Une masse noire qui mange les deux tiers du
         cadre, percée d'une ouverture irrégulière. Elle est en `sil0` sans
         aucune brume : c'est le plus proche, donc le plus sombre, et c'est ce
         noir qui donne sa profondeur à tout le reste. */
      const R = Pix.rng(8080);
      const cx = 244 - ox * 1.4, cy = 150;
      const rx = 150, ry = 128;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const dx = (x - cx) / rx, dy = (y - cy) / ry;
          // le bord de l'ouverture est bruité : une ellipse nette serait un trou
          const n = Math.sin(x * 0.11 + y * 0.07) * 0.055 + Math.sin(y * 0.19 - x * 0.05) * 0.035;
          const d = Math.sqrt(dx * dx + dy * dy) + n;
          if (d > 1) fb.set(x, y, P.sil0);
          else if (d > 0.955) fb.blend(x, y, P.sil0, (d - 0.955) / 0.045);
        }
      }
      // quelques éclats de cristal accrochés à la roche du seuil
      for (let i = 0; i < 5; i++) {
        const a = 0.6 + R() * 2.0;
        Props.crystals(fb, cx + Math.cos(a) * rx * 1.02, cy + Math.sin(a) * ry * 1.02,
                       { seed: 700 + i, count: 2, scale: 0.5 + R() * 0.5 });
      }
      // le personnage, minuscule, sur le seuil : l'échelle du monde tient à lui
      Props.hero(fb, Math.round(cx - ox * 0.0), Math.round(cy + ry * 0.86), t, { scale: 1 });
      Props.snowfall(fb, ox, t, { density: 0.7 });
      Scenes.vignette(fb, 0.40); Scenes.grain(fb, 0.05);
    },
  };

  /* ═══════════════════════════════════════════════════════════════════════
     2. LES BRASEROS — gros plan
     ═══════════════════════════════════════════════════════════════════════ */
  const braseros = {
    id: "braseros", camMax: 60, ground: {},
    render(fb, cam, t, st) {
      const ox = cam.x;
      backdrop(fb, ox, t, { st, horizon: 140, gain: 0.7, auroraY: -34, mass: 620,
                            tMin: 46, tMax: 130, groveN: 9, seed: 2626, hazeMass: 0.2 });
      const prof = nearGround(fb, ox, t, { seed: 6060, y: 208, trackX: 430, trackDX: 200, trackDY: 34 });
      const gy = (x) => prof[Math.max(0, Math.min(W - 1, Math.round(x)))];

      /* ⚠️ LES DEUX BRASEROS À L'ÉCHELLE 5, DESSINÉS PAR LE MÊME CODE QU'À
         L'ÉCHELLE 1. C'est la preuve que le gros plan est du dessin et pas un
         agrandissement : la vasque a des assises, le socle a une arête
         éclairée, la flamme a un cœur d'un pixel — à 13 px comme à 70. */
      const b1 = Math.round(88 - ox), b2 = Math.round(372 - ox);
      Props.brazier(fb, b1, gy(b1), t, { scale: 4.6 });
      Props.brazier(fb, b2, gy(b2), t, { scale: 5.2 });

      // le personnage entre les deux, de dos, la main levée vers la flamme
      const hx = Math.round(238 - ox);
      Props.hero(fb, hx, gy(hx), t, { scale: 3.1 });
      const R = Pix.rng(4141);
      // le bras tendu : trois rectangles, posés à la main. À cette échelle un
      // membre articulé procéduralement coûterait dix fois plus pour rien.
      fb.rect(hx + 12, gy(hx) - 58, 20, 6, Props.HERO.coatL);
      fb.rect(hx + 30, gy(hx) - 60, 9, 8, Props.HERO.skin);
      fb.rect(hx + 12, gy(hx) - 53, 20, 2, Props.HERO.coatD);
      // la lumière de la flamme sur la manche et sur la main
      fb.glow(hx + 34, gy(hx) - 57, 22, P.fl1, 0.22);

      Props.snowfall(fb, ox, t, { density: 1.2 });
      Sky.reflect(fb, 196, 250, CFG.AURORA.REFLECT_K * 0.6);
      Scenes.vignette(fb, 0.32); Scenes.grain(fb, 0.05);
    },
  };

  /* ═══════════════════════════════════════════════════════════════════════
     3. LA HARDE — les rennes sur la rivière gelée
     ═══════════════════════════════════════════════════════════════════════ */
  const harde = {
    id: "harde", camMax: 90, ground: {},
    render(fb, cam, t, st) {
      const ox = cam.x;
      backdrop(fb, ox, t, { st, horizon: 132, gain: 0.85, auroraY: -30, mass: 700,
                            tMin: 34, tMax: 104, groveN: 6, seed: 3838 });

      // la berge, puis la glace, puis la berge proche : trois bandes, et c'est
      // la glace qui porte le sujet.
      const bank = Land.profile({ seed: 7171, y: 158, amp: 8, amp2: 3, freq: 0.012, ox, par: 0.5 });
      const iceTop = new Int16Array(W), iceBot = new Int16Array(W);
      for (let x = 0; x < W; x++) { iceTop[x] = bank[x] + 8; iceBot[x] = 236; }
      Land.bank(fb, bank, (x) => iceTop[x], { seed: 7174, lit: 2,
        c5: mix(P.sn5, P.fog, 0.2), c4: mix(P.sn4, P.fog, 0.18), c3: mix(P.sn3, P.fog, 0.14) });
      Land.ice(fb, iceTop, iceBot, { seed: 7177, cracks: 22 });
      Sky.reflect(fb, iceTop[0], 236, CFG.AURORA.REFLECT_K * 1.5);

      /* ⚠️ NEUF BÊTES, ET ELLES SONT ALIGNÉES. Le texte du chapitre dit « elles
         marchent, toutes dans la même direction, à la même allure ». Un troupeau
         dispersé contredirait la seule chose qu'on demande au joueur de
         remarquer. Elles avancent donc en file, décalées, et leur sillage est
         tracé dans la neige derrière elles. */
      const R = Pix.rng(9292);
      for (let i = 0; i < 9; i++) {
        const wx = 52 + i * 46 + Math.sin(i * 2.1) * 9;
        const dx = Math.round(wx - ox * 0.9 + Math.sin(t * 0.22 + i) * 1.5);
        if (dx < -40 || dx > W + 40) continue;
        const dy = 206 - i * 3.2;
        const sc = 2.5 - i * 0.11;
        // la trace derrière chaque bête
        for (let k = 1; k < 8; k++)
          fb.blend(dx - k * 6, dy + 1, P.ice0, 0.18 * (1 - k / 8));
        Props.deer(fb, dx, dy, mix(P.st1, P.fog, 0.12 + i * 0.02), sc, true);
      }
      Land.bank(fb, Land.profile({ seed: 7180, y: 240, amp: 7, freq: 0.02, ox, par: 1 }), H + 4,
                { seed: 7183, lit: 3 });
      Props.snowfall(fb, ox, t, { density: 0.9 });
      Scenes.vignette(fb, 0.46); Scenes.grain(fb, 0.05);
    },
  };

  /* ═══════════════════════════════════════════════════════════════════════
     4. LA CRÊTE — la cabane, et sa fenêtre
     ───────────────────────────────────────────────────────────────────────
     ⚠️ TOUT CE PLAN EXISTE POUR DEUX PIXELS ORANGE. Le reste — la crête, les
     arbres, la fumée — n'est là que pour les entourer de bleu.
     ═══════════════════════════════════════════════════════════════════════ */
  const crete = {
    id: "crete", camMax: 50, ground: {},
    render(fb, cam, t, st) {
      const ox = cam.x;
      backdrop(fb, ox, t, { st, horizon: 118, gain: 0.75, auroraY: -46, mass: 520,
                            tMin: 40, tMax: 120, groveN: 5, seed: 5454, ridgeH: 30 });
      // la crête, très inclinée : la cabane est en haut à droite, on la regarde
      // d'en bas, ce qui est la seule chose que le plan doit dire.
      const crest = new Int16Array(W);
      const fn = Pix.fbm1(6363, 4);
      for (let x = 0; x < W; x++) {
        const wx = x + ox;
        crest[x] = Math.round(250 - Math.pow(clamp01(wx / 460), 1.35) * 138 - (fn(wx * 0.013) - 0.5) * 12);
      }
      Land.bank(fb, crest, H + 4, { seed: 6366, lit: 4 });
      Land.rocks(fb, crest, { seed: 6369, count: 10 });
      // des arbres plantés SUR la crête : ils donnent l'échelle de la cabane
      Flora.grove(fb, ox, { seed: 6372, count: 9, par: 1, ground: crest,
        hMin: 40, hMax: 96, col: P.sil1, depth: 5, spread: 0.58, wid: 2, snow: true, snowCol: P.sn2 });

      const cabX = Math.round(352 - ox);
      Props.cabin(fb, cabX, crest[Math.max(0, Math.min(W - 1, cabX))] + 1, 3.4);

      /* LA LUMIÈRE DE LA FENÊTRE SUR LA NEIGE. Une flaque chaude, additive,
         très faible et très étalée — c'est elle qui prouve que la fenêtre
         éclaire quelque chose. Sans elle, deux pixels orange sur un flanc bleu
         sont un défaut de compression. */
      const wy = crest[Math.max(0, Math.min(W - 1, cabX))] - 22;
      for (let dy = 0; dy < 26; dy++)
        for (let dx = -34; dx <= 34; dx++) {
          const d = Math.sqrt((dx / 34) ** 2 + (dy / 26) ** 2);
          if (d < 1) fb.add(cabX + dx - 6, wy + dy, P.warm, (1 - d) * (1 - d) * 0.13);
        }

      Flora.foreground(fb, ox, { par: 1.5, col: P.sil0, arms: [
        { x: -20, y: -16, ang: 0.6, len: 62, wid: 7, depth: 7, seed: 9001, leaves: 0.6, snow: true },
        { x: 470, y: -30, ang: 2.36, len: 54, wid: 6, depth: 7, seed: 9002, leaves: 0.62, snow: true },
      ]});
      Props.snowfall(fb, ox, t, { density: 1 });
      Scenes.vignette(fb, 0.34); Scenes.grain(fb, 0.05);
    },
  };

  /* ═══════════════════════════════════════════════════════════════════════
     5. LES CHEVAUX DE VERRE
     ───────────────────────────────────────────────────────────────────────
     ⚠️ ILS SONT À CONTRE-JOUR ET PRESQUE SANS CONTRASTE. À la vue générale on
     mettait une seconde à les voir ; de près, on doit mettre une seconde à
     croire qu'ils sont vivants. La brume est donc posée PAR-DESSUS eux, ce qui
     est l'inverse de la règle habituelle — et c'est le seul endroit du jeu où
     on le fait exprès.
     ═══════════════════════════════════════════════════════════════════════ */
  const chevaux = {
    id: "chevaux", camMax: 40, ground: {},
    render(fb, cam, t, st) {
      const ox = cam.x;
      backdrop(fb, ox, t, { st, horizon: 146, gain: 0.6, auroraY: -18, mass: 760,
                            tMin: 52, tMax: 150, groveN: 8, seed: 7878, hazeMass: 0.24 });
      const prof = nearGround(fb, ox, t, { seed: 8484, y: 212, tracks: false });

      const gy = (x) => prof[Math.max(0, Math.min(W - 1, Math.round(x)))];
      const h1 = Math.round(168 - ox), h2 = Math.round(300 - ox);
      Props.horse(fb, h1, gy(h1) - 2, mix(P.st2, P.fog, 0.30), 5.4, false);
      Props.horse(fb, h2, gy(h2) - 6, mix(P.st1, P.fog, 0.24), 6.2, true);
      // la glace prise dans la crinière : quelques pixels de cry1, et c'est
      // toute l'information du chapitre 3 posée quinze minutes à l'avance.
      const R = Pix.rng(8787);
      for (let i = 0; i < 9; i++) {
        fb.set(h2 + 22 + R() * 12, gy(h2) - 58 - R() * 26, P.cry1);
        fb.blend(h2 + 22 + R() * 12, gy(h2) - 58 - R() * 26, P.cry2, 0.6);
      }
      fb.haze(P.fog, 0.17, 120, 240, (u) => 0.4 + u * 0.6);
      // leur souffle : il n'y en a pas. On dessine donc DEUX bouffées côté
      // joueur et rien côté chevaux — c'est l'absence qui doit se voir.
      for (let i = 0; i < 5; i++)
        fb.blend(46 - i * 3, 196 - i * 2, P.sn4, 0.16 - i * 0.03);

      Flora.foreground(fb, ox, { par: 1.5, col: P.sil0, arms: [
        { x: -28, y: -22, ang: 0.58, len: 64, wid: 7, depth: 7, seed: 9101, leaves: 0.66, snow: true },
        { x: 96, y: -46, ang: 1.0, len: 46, wid: 5, depth: 6, seed: 9102, leaves: 0.6 },
        { x: 476, y: -24, ang: 2.4, len: 58, wid: 7, depth: 7, seed: 9103, leaves: 0.64, snow: true },
      ]});
      Props.snowfall(fb, ox, t, { density: 1.25 });
      Scenes.vignette(fb, 0.32); Scenes.grain(fb, 0.05);
    },
  };

  /* ═══════════════════════════════════════════════════════════════════════
     6. ⚠️ LA MÉMOIRE — l'aurore devient lisible
     ───────────────────────────────────────────────────────────────────────
     Le pivot du chapitre, et le seul plan où le CIEL est le sujet. Le sol
     tombe à une lanière de vingt pixels en bas de cadre ; tout le reste est
     l'aurore, qui se resserre, perd ses plis, et forme une file de gens qui
     marchent vers la gauche avec des charges sur le dos.

     ⚠️ LES FIGURES SONT PEINTES DANS L'AURORE, PAS DEVANT ELLE. Elles sont
     additives, de la couleur du rideau, et striées comme lui : ce ne sont pas
     des silhouettes posées sur un fond, c'est le rideau LUI-MÊME qui prend
     cette forme. Peintes en sombre par-dessus, elles auraient été des ombres
     chinoises — c'est-à-dire quelqu'un d'autre projetant une image, ce qui est
     exactement le contresens à éviter.
     ═══════════════════════════════════════════════════════════════════════ */
  const memoire = {
    id: "memoire", camMax: 30, ground: {},
    render(fb, cam, t, st) {
      const ox = cam.x;
      const k = st && st.auroraGain !== undefined ? clamp01(st.auroraGain / 2.3) : 1;
      Sky.gradient(fb, { top: P.sky0, bot: P.sky2, horizon: 250, steps: 12, curve: 2.9 });
      Sky.stars(fb, ox, t, { seed: 1234, count: 260, yMax: 0.78, par: 0.02, k: 1 - k * 0.5 });
      // le rideau s'efface à mesure que la mémoire prend forme : les deux ne
      // peuvent pas occuper le même ciel sans devenir illisibles.
      Sky.aurora(fb, ox, t, { par: 0.02, yOff: 2, gain: 1.05 * (1 - k * 0.5) });
      Sky.procession(fb, ox, t, k);

      /* ⚠️ LA LIGNE DE SOL DE LA FORÊT ÉTAIT PLATE, et 700 traits verticaux
         posés sur une horizontale parfaite donnent un CODE-BARRES. Il suffit
         de six pixels d'ondulation pour que la même forêt redevienne une
         forêt : ce n'est pas la densité qui manquait, c'est le terrain. */
      const gy = new Int16Array(W);
      const gn = Pix.fbm1(1236, 3);
      for (let x = 0; x < W; x++) gy[x] = Math.round(216 - (gn((x + ox * 0.1) * 0.011) - 0.5) * 13);
      Flora.distantMass(fb, ox, { seed: 1235, count: 560, par: 0.1, ground: gy,
        hMin: 20, hMax: 84, c0: mix(P.tre1, P.fog, 0.06), c1: mix(P.tre2, P.fog, 0.16), alpha: 0.85 });
      Flora.grove(fb, ox, { seed: 1237, count: 6, par: 0.22, ground: gy,
        hMin: 70, hMax: 130, col: mix(P.tre0, P.fog, 0.04), depth: 5, spread: 0.62, wid: 2 });
      for (let x = 0; x < W; x++) fb.vline(x, gy[x], gy[x] + 5, mix(P.sn1, P.st2, 0.5));
      fb.haze(P.fog, 0.09, 150, H, (u) => 0.5 + u * 0.5);

      const prof = Land.profile({ seed: 2468, y: 236, amp: 7, amp2: 3, freq: 0.014, ox, par: 1 });
      Land.bank(fb, prof, H + 4, { seed: 2471, lit: 3 });
      // le personnage, tout petit, tout en bas, la tête levée. Il regarde ce
      // que le joueur regarde — et c'est ce qui fait que le joueur regarde.
      const hx = Math.round(206 - ox);
      Props.hero(fb, hx, prof[Math.max(0, Math.min(W - 1, hx))] + 1, t, { scale: 1.15 });
      Sky.reflect(fb, 214, 258, CFG.AURORA.REFLECT_K * (1 + k));
      Props.snowfall(fb, ox, t, { density: 0.55 });
      Scenes.vignette(fb, 0.44); Scenes.grain(fb, 0.045);
    },
  };

  /* ═══════════════════════════════════════════════════════════════════════
     7. AUBIN
     ═══════════════════════════════════════════════════════════════════════ */
  const aubin = {
    id: "aubin", camMax: 34, ground: {},
    render(fb, cam, t, st) {
      const ox = cam.x;
      backdrop(fb, ox, t, { st, horizon: 138, gain: 0.55, auroraY: -40, mass: 640,
                            tMin: 60, tMax: 168, groveN: 9, seed: 1111, hazeMass: 0.2 });
      const prof = nearGround(fb, ox, t, { seed: 2222, y: 214, trackX: 60, trackDX: -170, trackDY: 30 });
      const gy = (x) => prof[Math.max(0, Math.min(W - 1, Math.round(x)))];

      // le joueur, de dos, décalé à gauche, en amorce
      const px = Math.round(78 - ox);
      Props.hero(fb, px, gy(px), t, { scale: 3.4 });
      // Aubin, de face, plus loin à droite, la lanterne au poing
      const ax = Math.round(316 - ox);
      Props.aubin(fb, ax, gy(ax), t, 3.0);

      Flora.foreground(fb, ox, { par: 1.5, col: P.sil0, arms: [
        { x: -24, y: -18, ang: 0.56, len: 66, wid: 8, depth: 7, seed: 9201, leaves: 0.68, snow: true },
        /* ⚠️ CETTE BRANCHE ÉTAIT À x=474 ET ELLE TOMBAIT PILE SUR LE VISAGE
           D'AUBIN. Un avant-plan est du cadrage : il ferme les coins, il ne
           traverse pas le sujet. Décalée hors champ à droite, elle fait le
           même travail sans rien couvrir. */
        { x: 528, y: -34, ang: 2.52, len: 58, wid: 7, depth: 6, seed: 9202, leaves: 0.6, snow: true },
      ]});
      Props.snowfall(fb, ox, t, { density: 1.15 });
      Scenes.vignette(fb, 0.30); Scenes.grain(fb, 0.05);
    },
  };

  const all = { seuil, braseros, harde, crete, chevaux, memoire, aubin };
  return { all };
})();

/* ⚠️ ON ENREGISTRE LES PLANS DANS `Scenes`, on ne crée pas un second registre.
   `cine.js` appelle `Scenes.get(id)` sans savoir si le tableau est une vue
   générale ou un gros plan — et c'est exactement ce qu'on veut : le récit
   nomme une image, il n'a pas à savoir de quel fichier elle vient. */
Object.assign(Scenes.all, Shots.all);

if (typeof module !== "undefined" && module.exports) module.exports = Shots;
