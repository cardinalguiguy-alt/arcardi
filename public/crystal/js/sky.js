/* =============================================================================
   sky.js — CIEL, ÉTOILES, AURORE, MONTAGNES.
   -----------------------------------------------------------------------------
   Ce fichier contient la chose que Guillaume a nommément demandée d'être
   « très précise graphiquement ». Le reste du jeu peut être bon ; si l'aurore
   est ratée, le jeu est raté.
   ========================================================================== */

const Sky = (function () {
  const P = CFG.PAL, W = CFG.W, H = CFG.H;
  const clamp01 = Pix.clamp01, mix = Pix.mix;

  /* ═══════════════════════════════════════════════════════════════════════
     LE DÉGRADÉ DE FOND
     ───────────────────────────────────────────────────────────────────────
     ⚠️ IL EST QUANTIFIÉ EN PALIERS, PAS LISSE. Un dégradé continu sur 270
     lignes donne 270 bleus différents — c'est joli sur une capture et c'est
     mort à l'écran : ça ne ressemble plus à rien de dessiné. Les deux
     références montrent des BANDES. On en pose donc un nombre fini, et le
     bruit d'un demi-palier casse la régularité pour que les frontières ne
     forment pas des lignes droites parfaites.

     ⚠️ LA RÉPARTITION EST EN PUISSANCE, PAS LINÉAIRE. C'est très exactement
     la correction du zip 408 : l'essentiel de la course de teinte doit se
     jouer dans le BAS du ciel. Réparti linéairement, le haut du cadre est déjà
     trop clair et la nuit cesse d'être une nuit.
     ═══════════════════════════════════════════════════════════════════════ */
  function gradient(fb, cfg) {
    const top = cfg.top, bot = cfg.bot, steps = cfg.steps || 15;
    const y1 = cfg.horizon !== undefined ? cfg.horizon : H;
    const n = Pix.noise1(7331);
    for (let y = 0; y < H; y++) {
      let t = clamp01(y / y1);
      t = Math.pow(t, cfg.curve || 2.15);
      // un demi-palier de bruit : les frontières de bande cessent d'être des
      // droites, et la bande cesse de se voir en tant que bande.
      const q = Math.round(t * steps + (n(y * 0.9) - 0.5) * 0.55) / steps;
      fb.hline(0, W - 1, y, mix(top, bot, clamp01(q)));
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     LES ÉTOILES
     ───────────────────────────────────────────────────────────────────────
     Elles sont ADDITIVES et de trois vigueurs. La grande majorité est à peine
     visible : sur l'image 2 on n'en distingue nettement qu'une vingtaine, et
     c'est le fourmillement des autres qui donne le grain du ciel. Un ciel
     d'étoiles toutes également brillantes ressemble à du poivre.
     ═══════════════════════════════════════════════════════════════════════ */
  function stars(fb, ox, t, cfg) {
    const R = Pix.rng(cfg.seed || 5501);
    const n = cfg.count || 220;
    const yMax = (cfg.yMax || 0.62) * H;
    for (let i = 0; i < n; i++) {
      const wx = R() * (W + 460) - 230;
      const y = R() * yMax;
      const mag = R();
      // le scintillement : chaque étoile a sa propre période, sinon elles
      // clignotent toutes ensemble et le ciel a l'air de respirer.
      const tw = 0.75 + 0.25 * Math.sin(t * (0.6 + mag * 2.2) + i * 1.77);
      const x = wx - ox * (cfg.par || 0.04);
      if (x < -2 || x > W + 2) continue;
      let k = mag < 0.72 ? 0.20 : mag < 0.94 ? 0.48 : 0.92;
      k *= tw * (cfg.k || 1);
      fb.add(x, y, P.star, k);
      if (mag > 0.965) {
        // les plus vives débordent d'un pixel en croix — c'est ce qui les
        // fait lire comme des étoiles et pas comme des poussières.
        fb.add(x + 1, y, P.star, k * 0.30); fb.add(x - 1, y, P.star, k * 0.30);
        fb.add(x, y + 1, P.star, k * 0.30); fb.add(x, y - 1, P.star, k * 0.30);
      }
    }
  }

  /* Étoiles filantes : rares, et c'est ce qui les rend précieuses. L'image 2
     en montre trois. Elles sont déterministes — pilotées par le temps, pas
     par un tirage — donc rejouables dans node. */
  function shootingStars(fb, ox, t, cfg) {
    const R = Pix.rng(cfg.seed || 2207);
    const n = cfg.count || 3;
    for (let i = 0; i < n; i++) {
      const period = 9 + R() * 11;
      const phase = R() * period;
      const life = 1.15;
      const u = ((t + phase) % period) / life;
      if (u > 1) continue;                      // hors de sa fenêtre
      const sx = R() * (W + 300) - 150 - ox * 0.04;
      const sy = R() * H * 0.34;
      const len = 22 + R() * 18;
      const dx = 0.86, dy = 0.50;               // toutes dans le même sens :
      const hx = sx + dx * len * u;             // ce sont les mêmes débris.
      const hy = sy + dy * len * u;
      const fade = Math.sin(u * Math.PI);
      for (let j = 0; j < 16; j++) {
        const q = j / 16;
        fb.add(hx - dx * j * 1.15, hy - dy * j * 1.15, P.star, fade * (1 - q) * 0.85);
      }
      fb.add(hx, hy, P.fl3, fade);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     ⚠️⚠️ L'AURORE
     ───────────────────────────────────────────────────────────────────────
     Quatre composantes, et il en manque une seule pour que tout s'effondre :

       1. LE PLI (`base`)  — trois harmoniques sur la position verticale du
          bord bas. La plus lente et la plus ample domine ; les deux autres
          empêchent que le pli soit une sinusoïde reconnaissable. C'est ce qui
          donne le grand S de l'image 2.

       2. L'ENVELOPPE (`env`) — un rideau ne traverse pas le cadre de bord à
          bord à intensité constante. Il naît, culmine, s'éteint. Sans
          enveloppe, l'aurore est coupée net par le cadre et devient un
          bandeau.

       3. ⚠️ LA STRIATION (`ray`) — LA COMPOSANTE QUI FAIT TOUT. Trois
          fréquences de sinus le long de X, dont une très fine. Elle module à
          la fois la HAUTEUR de la colonne et son INTENSITÉ. C'est elle qui
          produit les rayons verticaux, et c'est à ça qu'on reconnaît une
          aurore. Sans elle : un dégradé vert. Avec elle, et sans rien changer
          d'autre : une aurore.

       4. LA DISSOLUTION DU HAUT — au-delà de 45 % de la hauteur, l'intensité
          est REMULTIPLIÉE par la striation. Le bas reste donc continu et net,
          le haut se déchire en lanières. C'est l'asymétrie du phénomène réel,
          et c'est ce qui empêche le rideau d'avoir un bord supérieur.

     ⚠️ ET LE TOUT EST ADDITIF. Le ciel se voit à travers, les étoiles restent
     visibles dans les zones faibles, et deux rubans qui se croisent donnent
     naturellement le blanc-menthe du cœur. En mélange normal il faudrait
     peindre ce blanc à la main, et il aurait l'air peint.
     ═══════════════════════════════════════════════════════════════════════ */

  /* La rampe de couleur en fonction de la hauteur dans le rideau.
     u = 0 au bord bas (le plus vif), u = 1 au sommet (dissous, pourpre). */
  function auroraColor(u) {
    if (u < 0.055) return P.aur4;                       // liseré bas, menthe
    if (u < 0.20)  return mix(P.aur4, P.aur3, (u - 0.055) / 0.145);
    if (u < 0.42)  return mix(P.aur3, P.aur2, (u - 0.20) / 0.22);
    if (u < 0.63)  return mix(P.aur2, P.aur1, (u - 0.42) / 0.21);
    if (u < 0.80)  return mix(P.aur1, P.aur0, (u - 0.63) / 0.17);
    if (u < 0.92)  return mix(P.aur0, P.aurV, (u - 0.80) / 0.12);
    return mix(P.aurV, P.aurM, (u - 0.92) / 0.08);      // frange pourpre
  }

  /* La position du BORD BAS du rideau principal, en un point donné. Extraite
     de `aurora()` pour que la procession puisse s'y poser : c'est la même
     expression, et elle ne doit exister qu'une fois — deux formules de pli qui
     doivent rester égales finissent toujours par diverger, et les marcheurs se
     mettraient à flotter dès qu'on retoucherait une amplitude. */
  function ribbonBase(wx, t, yOff) {
    const rb = CFG.AURORA.RIBBONS[0];
    return rb.y * H + (yOff || 0)
      + Math.sin(wx * rb.f1 + rb.p + t * rb.drift) * rb.a1
      + Math.sin(wx * rb.f2 - rb.p * 1.7 + t * rb.drift * 1.55) * rb.a2
      + Math.sin(wx * rb.f3 + t * rb.drift * 0.45) * rb.a3;
  }

  function aurora(fb, ox, t, opts) {
    opts = opts || {};
    const A = CFG.AURORA;
    const gain = opts.gain === undefined ? 1 : opts.gain;
    const yOff = opts.yOff || 0;
    if (gain <= 0.001) return;

    for (let r = 0; r < A.RIBBONS.length; r++) {
      const rb = A.RIBBONS[r];
      const env1 = Pix.fbm1(rb.seed, 3);

      for (let x = -6; x < W + 6; x++) {
        const wx = x + ox * (opts.par === undefined ? 0.055 : opts.par);

        /* 1 — LE PLI */
        const base = rb.y * H + yOff
          + Math.sin(wx * rb.f1 + rb.p + t * rb.drift) * rb.a1
          + Math.sin(wx * rb.f2 - rb.p * 1.7 + t * rb.drift * 1.55) * rb.a2
          + Math.sin(wx * rb.f3 + t * rb.drift * 0.45) * rb.a3;

        /* 2 — L'ENVELOPPE : un demi-sinus sur la portée du rideau, adouci,
           puis grumelé par un bruit lent pour que les extrémités ne meurent
           pas symétriquement. */
        const s01 = (wx - rb.x0) / rb.span;
        if (s01 <= 0 || s01 >= 1) continue;
        let env = Math.sin(s01 * Math.PI);
        env = Math.pow(clamp01(env * 1.22), 0.62);
        env *= 0.62 + 0.38 * env1(wx * 0.017 + t * 0.03);
        if (env < 0.02) continue;

        /* 3 — LA STRIATION.
           ⚠️ ELLE EST ÉLEVÉE À LA PUISSANCE 1,7, ET C'EST LA CORRECTION QUI A
           TOUT CHANGÉ. Brute, la somme de sinus reste autour de 0,5 presque
           partout : toutes les colonnes se ressemblent et le rideau redevient
           un aplat dégradé. La puissance écrase les valeurs moyennes vers le
           bas et laisse ressortir les crêtes — on obtient des rayons SÉPARÉS
           PAR DU VIDE, ce qui est exactement ce qu'on voit dans le ciel. */
        const raw = clamp01(
          0.46
          + 0.30 * Math.sin(wx * 0.605 + t * 0.52 + rb.p)
          + 0.17 * Math.sin(wx * 1.463 - t * 0.29)
          + 0.10 * Math.sin(wx * 3.117 + t * 0.15)
          + 0.07 * Math.sin(wx * 6.410 - t * 0.09)
        );
        const ray = Math.pow(raw, 1.7);

        const h = rb.h * (0.34 + 0.66 * ray) * env;
        const k = rb.k * gain * env * (0.22 + 0.78 * ray);
        if (h < 1 || k < 0.02) continue;

        /* LE HALO DIFFUS SOUS LE RIDEAU — posé avant, donc recouvert par le
           liseré. Il éclaire le ciel, il ne le remplace pas. */
        for (let j = 1; j <= A.BLOOM_H; j++) {
          const f = 1 - j / A.BLOOM_H;
          fb.add(x, base + j, P.aur1, f * f * A.BLOOM_K * k);
        }

        /* LA COLONNE */
        for (let j = 0; j < h; j++) {
          const u = j / h;
          let i = Math.pow(1 - u, 1.55) * k;
          /* LE LISERÉ BAS. Deux pixels, surintensifiés de 80 %. C'est le
             détail le plus rentable de tout le fichier : c'est ce bord net,
             et lui seul, qui distingue une aurore d'une tache lumineuse. */
          if (j < 2) i *= 1.8;
          if (u > 0.38) i *= 0.18 + 0.82 * ray;       // 4 — la dissolution
          if (i < 0.030) continue;
          fb.add(x, base - j, auroraColor(u), i);
        }

        /* LA FRANGE POURPRE, au-dessus du rideau et détachée de lui.
           Sur l'image 2 elle est nettement séparée du vert : c'est une
           altitude différente, pas un dégradé du même voile. La peindre en
           prolongement de la rampe verte ne la rendait pas visible. */
        if (rb.k > 0.7) {
          const vh = h * 0.55;
          for (let j = 0; j < vh; j++) {
            const u = j / vh;
            const i = Math.pow(1 - u, 2.1) * k * 0.16 * ray;
            if (i < 0.012) continue;
            fb.add(x, base - h - 2 - j, mix(P.aurV, P.aurM, u), i);
          }
        }
      }
    }
  }

  /* La réverbération de l'aurore sur une surface claire (neige, glace).
     ⚠️ APPELÉE APRÈS LE SOL, et volontairement très faible : au-delà de 0,2
     la neige devient verte et la scène cesse d'être froide. On cherche à
     signaler que la lumière vient de quelque part, pas à colorer le sol. */
  function reflect(fb, y0, y1, k) {
    const kk = (k === undefined ? CFG.AURORA.REFLECT_K : k);
    for (let y = y0; y < y1; y++) {
      const f = 1 - (y - y0) / Math.max(1, y1 - y0);
      fb.haze(P.aur2, kk * f * 0.5, y, y + 1);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     LES MONTAGNES
     ───────────────────────────────────────────────────────────────────────
     Déplacement du milieu (midpoint displacement) plutôt que des sinus : une
     crête faite de sinus se répète et l'œil l'attrape en deux secondes.

     ⚠️ LA CHAÎNE LOINTAINE DOIT ÊTRE PLUS CLAIRE QUE LE CIEL, ET LA PROCHE
     PLUS SOMBRE. C'est la double leçon du zip 408 : ce qui est loin se
     rapproche de la brume, ce qui est près s'en éloigne. Une chaîne lointaine
     peinte trop sombre fait un trou dans l'image ; peinte trop claire sur un
     ciel déjà clair, elle disparaît. Ici on lit `body` depuis l'appelant, qui
     sait quel ciel il a posé.
     ═══════════════════════════════════════════════════════════════════════ */
  function ridge(fb, ox, cfg) {
    const R = Pix.rng(cfg.seed);
    const n = 129;
    const pts = new Float32Array(n);
    pts[0] = 0.35 + R() * 0.3; pts[n - 1] = 0.35 + R() * 0.3;
    for (let step = n - 1; step > 1; step >>= 1) {
      const half = step >> 1, amp = step / (n - 1);
      for (let i = half; i < n; i += step) {
        pts[i] = (pts[i - half] + pts[i + half]) * 0.5 + (R() - 0.5) * amp * cfg.rough;
      }
    }
    const span = cfg.span || W * 1.9;
    const x0 = -ox * cfg.par - (cfg.x0 || 0);
    const baseY = cfg.baseY, hMax = cfg.h;

    // La ligne de crête, échantillonnée par colonne d'écran.
    const crest = new Int16Array(W);
    for (let x = 0; x < W; x++) {
      const u = ((x - x0) / span) * (n - 1);
      const i = Math.floor(u), f = u - i;
      const a = pts[((i % n) + n) % n], b = pts[(((i + 1) % n) + n) % n];
      crest[x] = Math.round(baseY - (a + (b - a) * f) * hMax);
    }

    for (let x = 0; x < W; x++) {
      const y = crest[x];
      fb.vline(x, y, baseY, cfg.body);
      /* LA NEIGE DE SOMMET n'est pas une bande horizontale : elle suit la
         pente et ne tient que là où la pente est faible. Un sommet enneigé
         dessiné en bandeau se voit immédiatement. */
      const slope = Math.abs((crest[Math.min(W - 1, x + 1)] - crest[Math.max(0, x - 1)]) * 0.5);
      const depth = Math.max(0, 5 - slope * 2.1);
      for (let j = 0; j < depth; j++) fb.set(x, y + j, j === 0 ? cfg.cap : cfg.capDim);
      // L'arête éclairée d'un pixel, côté aurore (à gauche).
      if (crest[Math.max(0, x - 1)] > y) fb.set(x, y, cfg.cap);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     ⚠️⚠️ LA PROCESSION — L'AURORE QUI DEVIENT LISIBLE
     ───────────────────────────────────────────────────────────────────────
     Le pivot du chapitre 1 : le rideau se resserre et forme une file de gens
     qui s'en vont, avec des charges sur le dos et une lumière portée en tête.

     ⚠️ ELLES SONT PEINTES *DANS* LE RIDEAU, PAS DEVANT LUI. Trois règles, et
     il en manque une seule pour que l'effet tombe :

       1. ADDITIF, et de la couleur du rideau. Une silhouette sombre posée
          par-dessus serait une ombre chinoise — donc quelqu'un d'autre
          projetant une image, ce qui est le contresens exact : la vallée ne
          projette pas un souvenir, elle EST le souvenir.
       2. STRIÉES COMME LUI. Chaque figure est hachée par la même fonction de
          rayons verticaux que l'aurore. Sans ça elle est nette, et une figure
          nette dans un rideau flou se lit comme un calque.
       3. ELLES MARCHENT. La file dérive lentement vers la gauche et chaque
          silhouette a sa propre phase de foulée. Une frise immobile serait un
          pictogramme ; c'est le mouvement qui fait qu'on y croit.

     ⚠️ ET ELLES NE SONT JAMAIS COMPLÈTES. `k` monte de 0 à 1 : au début on ne
     voit que des fragments, et la forme ne se referme qu'au bout de plusieurs
     secondes. Une révélation qui arrive d'un coup est une image ; une
     révélation qui se rassemble sous les yeux est une scène. */
  /* ⚠️ LA SILHOUETTE EST DÉCRITE PAR RÉGION, PAS PAR UNE COURBE.
     Première version : une demi-largeur interpolée le long du corps. Regardée
     dans `preview.mjs`, elle donnait des BLOCS — parce qu'une largeur continue
     ne peut pas produire les deux choses qui font lire « humain » : le
     RÉTRÉCISSEMENT BRUTAL du cou, et la FENTE entre les deux jambes. Ce sont
     deux discontinuités ; une fonction lisse ne les fabrique jamais.

     À quarante pixels de haut on a donc quatre régions franches, et l'écart
     entre elles fait tout le travail :
        u < 0.42   deux jambes séparées par un vide de deux pixels
        u < 0.76   le torse, épaules légèrement plus larges en haut
        u < 0.83   le cou — deux pixels de large, et c'est LUI qui fait la tête
        sinon      la tête */
  function inFigure(dx, u, gait) {
    if (u < 0.42) {
      const sw = Math.sin(gait) * 2.4 * (1 - u / 0.42);   // la foulée
      const l = -2.6 + sw, r = 2.6 + sw;
      return (dx >= l - 1.6 && dx <= l + 1.0) || (dx >= r - 1.0 && dx <= r + 1.6);
    }
    if (u < 0.76) {
      const half = u > 0.70 ? 5.0 : 4.0;                  // les épaules
      if (Math.abs(dx) <= half) return true;
      // les bras, le long du corps, un peu écartés par la charge
      if (u > 0.48 && u < 0.72 && Math.abs(dx) <= half + 1.6) return true;
      return false;
    }
    if (u < 0.83) return Math.abs(dx) <= 1.2;             // ⚠️ le cou
    return Math.abs(dx) <= 2.6;                           // la tête
  }

  function procession(fb, ox, t, k) {
    if (k <= 0.01) return;
    const N = 8;
    const drift = (t * 4.6) % 58;
    /* ⚠️ ILS MARCHENT SUR LE BORD BAS DU RIDEAU, pas dans le ciel au-dessus.
       Première version regardée : les figures flottaient à hauteur fixe et le
       rideau ondulait sous elles — on lisait « des gens PEINTS SUR le ciel »,
       c'est-à-dire une projection, exactement le contresens que ce fichier
       s'était promis d'éviter. Posés sur la ligne de pli, ils épousent l'onde,
       montent et descendent avec elle : le rideau ne les porte pas, il EST
       eux. Une ligne de code, et l'image change de sens. */

    for (let i = 0; i < N; i++) {
      const R = Pix.rng(3300 + i * 137);
      const wx = 486 - i * 58 - drift + Math.sin(i * 1.7) * 5;
      const x0 = wx - ox * 0.03;
      if (x0 < -26 || x0 > W + 26) continue;

      /* Chaque marcheur apparaît à son tour, tête de file d'abord : la
         révélation a un SENS DE LECTURE au lieu d'arriver d'un bloc. */
      const kk = clamp01((k - i * 0.055) / 0.5);
      if (kk <= 0.02) continue;

      const h = 34 + R() * 8;
      const gait = t * 2.4 + i * 1.1;
      const gy = ribbonBase(wx, t, 2) + 2 + Math.abs(Math.sin(gait)) * 1.2;

      for (let dx = -8; dx <= 8; dx++) {
        // la même striation que le rideau : la figure est FAITE de rideau
        const ray = clamp01(0.40
          + 0.34 * Math.sin((x0 + dx) * 0.61 + t * 0.5)
          + 0.18 * Math.sin((x0 + dx) * 1.46 - t * 0.3)
          + 0.10 * Math.sin((x0 + dx) * 3.11));
        for (let j = 0; j < h; j++) {
          const u = j / h;
          if (!inFigure(dx, u, gait)) continue;
          const y = gy - j;
          const c = auroraColor(0.06 + (1 - u) * 0.40);
          // le bord de la silhouette est plus vif que son intérieur : c'est ce
          // qui la détache du rideau sans avoir à l'assombrir.
          const edge = (!inFigure(dx - 1, u, gait) || !inFigure(dx + 1, u, gait)) ? 1.55 : 1;
          fb.add(x0 + dx, y, c, 0.34 * kk * (0.22 + 0.78 * ray) * edge);
        }
      }

      /* LA CHARGE SUR LE DOS. Elle est DERRIÈRE l'épaule — donc du côté d'où
         ils viennent, à droite — et elle penche. C'est ce détail, pas la
         silhouette, qui dit « ils déménagent » plutôt que « ils marchent ». */
      for (let dy = 0; dy < 11; dy++) {
        const w = 7 - Math.round(dy * 0.25);
        for (let dx = 0; dx < w; dx++)
          fb.add(x0 + 5 + dx + dy * 0.22, gy - h * 0.70 - dy, auroraColor(0.30), 0.26 * kk * (0.3 + 0.7 * Math.abs(Math.sin((x0 + dx) * 0.61 + t * 0.5))));
      }

      fb.glow(x0, gy - h * 0.45, 18, P.aur2, 0.085 * kk);
    }

    /* LA LUMIÈRE PORTÉE EN TÊTE. Le récit la nomme ; elle doit exister. */
    const lx = 486 - (N - 1) * 58 - drift - 20 - ox * 0.03;
    const lk = clamp01((k - 0.45) / 0.4);
    if (lk > 0.02 && lx > -20 && lx < W + 20) {
      const ly = ribbonBase(486 - (N - 1) * 58 - drift - 20, t, 2) - 26;
      fb.add(lx, ly, P.aur4, 0.95 * lk); fb.add(lx + 1, ly, P.aur4, 0.7 * lk);
      fb.add(lx, ly + 1, P.aur4, 0.6 * lk);
      fb.glow(lx, ly, 26, P.aur3, 0.30 * lk);
    }
  }

  return { gradient, stars, shootingStars, aurora, auroraColor, reflect, ridge,
           procession, ribbonBase };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Sky;
