/* =============================================================================
   walk.js — LA MARCHE SUR LE LAC GELÉ (segment jouable du chapitre 1).
   -----------------------------------------------------------------------------
   D'après la PREMIÈRE image partagée par Guillaume : vue de dos, chaussée de
   dalles fracturées qui fuit vers le fond, arbres qui défilent, aurore au bout.

   ⚠️ LA PROJECTION EST FAITE PAR LIGNE D'ÉCRAN, PAS PAR OBJET, ET C'EST LA
   DÉCISION QUI FAIT TOUT TENIR. Pour chaque ligne `y` sous l'horizon on
   REMONTE à la profondeur :

        z = FOCAL · EYE / (y − horizon)

   et on dessine cette ligne entière d'un coup. Trois conséquences, toutes
   décisives pour du pixel art :

     1. AUCUN TROU, AUCUN CHEVAUCHEMENT. Une chaussée découpée en quadrilatères
        projetés laisse des coutures d'un pixel entre deux dalles, ou les fait
        se recouvrir — et à 480 px de large, un pixel se voit.
     2. LA BRUME EST EXACTE. Elle se calcule sur `z`, donc par ligne, donc elle
        est rigoureusement fonction de la distance et non d'une approximation
        par objet.
     3. C'EST DÉTERMINISTE ET BON MARCHÉ. Cent soixante lignes, un calcul
        chacune.

   ⚠️ ET LE SOL N'EST PAS UNE TEXTURE QUI DÉFILE. La position de la dalle se
   déduit de `z + parcouru`, en unités-monde. On ne peut donc pas « glisser »
   par erreur : si la vitesse change, les dalles restent solidaires du sol.

   ⚠️ DEUX PARCOURS, UN SEUL MOTEUR (421). `reset("run")` ouvre le chapitre —
   on court vers une falaise, sans HUD ni éclats, et l'arrivée au bord DÉCLENCHE
   la cinématique. `reset("walk")` est le segment du milieu, inchangé. Les
   différences tiennent entièrement dans `CFG.WALK.MODES` ; il n'y a pas une
   ligne de rendu qui teste le mode, sauf la falaise, qui est un objet du
   monde et pas une variante de code.
   ========================================================================== */

const Walk = (function () {
  const P = CFG.PAL, W = CFG.W, H = CFG.H;
  const K = CFG.WALK;
  const mix = Pix.mix, clamp01 = Pix.clamp01;
  const HOR = Math.round(H * K.HORIZON);

  /* ── L'ÉTAT ─────────────────────────────────────────────────────────────── */
  const S = {
    z: 0,          // distance parcourue, unités-monde
    x: 0,          // position latérale, unités-monde
    vx: 0,
    shards: 0,
    chant: 0,      // la jauge de Chant : elle monte à chaque brasero passé
    lit: {},       // braseros déjà allumés, par index
    got: {},       // éclats déjà ramassés, par index
    done: false,
    t: 0,
    spd: 0,        // 421 : vitesse d'avance de l'image en cours
    mode: "walk",  // 421 : "run" (ouverture) | "walk" (milieu de chapitre)
    M: null,       // le préréglage courant, résolu une fois dans reset()
    hold: 0,       // 421 : temps déjà passé immobile au bord de la falaise
  };

  /* ⚠️ LE MODE EST RÉSOLU UNE SEULE FOIS, ICI. Le lire à chaque image aurait
     permis d'en changer en cours de course — c'est-à-dire de déplacer la
     falaise sous les pieds du joueur. */
  function reset(mode) {
    S.mode = K.MODES[mode] ? mode : "walk";
    S.M = K.MODES[S.mode];
    S.z = 0; S.x = 0; S.vx = 0; S.shards = 0; S.chant = 0;
    S.lit = {}; S.got = {}; S.done = false; S.t = 0; S.hold = 0;
    S.spd = K.SPEED;
  }

  /* Mètres affichés. Le facteur est arbitraire mais il est ÉCRIT UNE FOIS :
     l'affichage, l'objectif et les outils lisent la même conversion. */
  const metres = () => Math.round(S.z * 3.1);

  /* ── LES OBJETS DU PARCOURS ────────────────────────────────────────────────
     Ils ne sont pas stockés dans une liste : ils sont DÉDUITS de leur index.
     Le brasero n° i est à z = i · BRAZIER_EVERY, et son décalage latéral vient
     d'un tirage semé par i. Un parcours infini sans mémoire, rejouable à
     l'identique dans node — et impossible à désynchroniser d'un rechargement. */
  function brazierAt(i) {
    const R = Pix.rng(9001 + i * 131);
    return { z: i * K.BRAZIER_EVERY + 8, x: (R() < 0.5 ? -1 : 1) * (K.ROAD_HALF - 0.55) };
  }
  function shardAt(i) {
    const R = Pix.rng(4400 + i * 977);
    return { z: i * K.SHARD_EVERY + 5, x: (R() * 2 - 1) * (K.ROAD_HALF - 0.9) };
  }

  /* ── PROJECTION ──────────────────────────────────────────────────────────── */
  const scaleAt = (z) => K.FOCAL / Math.max(0.35, z);
  const screenY = (z) => HOR + K.FOCAL * K.EYE / Math.max(0.35, z);
  const screenX = (wx, z, camX) => W / 2 + (wx - camX) * scaleAt(z);

  /* ── LA BRUME ─────────────────────────────────────────────────────────────
     ⚠️ RÉÉCRITE AU 421 SUR MESURE, PAS AU JUGÉ. Version du 419 :

         Math.pow(clamp01((z - 6) / (FAR - 6)), 1.35)

     — nulle jusqu'à six unités, puis très tardive. Comparée bande par bande
     à la référence de la course réduite à 480×270, elle laissait le jeu
     CINQUANTE ET UN points de luminance en dessous, et 21,8 % des pixels
     écrasés sous L30 contre 2,5 % à la référence. Le plan moyen restait noir
     pendant que seul le fond blanchissait, ce qui est précisément l'inverse
     de ce que fait l'air.

     Trois changements, tous dans `config.js` pour qu'ils soient réglables
     sans rouvrir ce fichier :
       - un PLANCHER (`FOG_MIN`) : même à trois pas, l'air d'une vallée gelée
         n'est pas transparent. C'est lui qui remonte le plan proche.
       - un départ plus tôt (`FOG_NEAR` 6 → 3).
       - une courbe presque linéaire (`FOG_POW` 1,35 → 1,05).

     ⚠️ ET ON NE VOILE TOUJOURS PAS À LA FIN. Un calque final aurait donné
     les mêmes chiffres et détruit la seule chose de l'image qui doit rester
     noire : les branches de cadrage. La brume est fonction de la PROFONDEUR,
     donc chaque objet reçoit la sienne, et ce qui est au premier plan n'en
     reçoit presque pas. */
  const fogAt = (z) => {
    const u = clamp01((z - K.FOG_NEAR) / (K.FAR - K.FOG_NEAR));
    return clamp01(K.FOG_MIN + (1 - K.FOG_MIN) * Math.pow(u, K.FOG_POW));
  };

  /* ── LA FALAISE ───────────────────────────────────────────────────────────
     Le mètre où la chaussée s'arrête, converti en unités-monde. Hors mode
     `run` il n'y a pas de falaise et la fonction renvoie l'infini : aucun
     test de mode ne descend donc dans le rendu, qui se contente de comparer
     des distances. */
  const cliffZ = () => (S.M && S.M.cliff) ? S.M.endM / 3.1 : Infinity;

  /* ═══════════════════════════════════════════════════════════════════════
     LE DÉCOR DE FOND
     ───────────────────────────────────────────────────────────────────────
     Au-dessus de l'horizon : le même ciel et la même aurore que les
     cinématiques, au même fichier. ⚠️ C'EST VOULU ET C'EST IMPORTANT : si la
     partie jouable et les tableaux ne partagent pas leur ciel, le joueur
     change de jeu à chaque coupure. Ici il change de point de vue.
     ═══════════════════════════════════════════════════════════════════════ */
  function backdrop(fb, t) {
    Sky.gradient(fb, { top: P.sky0, bot: P.sky4, horizon: HOR + 30, steps: 14, curve: 2.4 });
    Sky.stars(fb, S.z * 6, t, { seed: 3311, count: 190, yMax: HOR / H * 0.9, par: 0.02 });
    Sky.aurora(fb, S.z * 6, t, { par: 0.02, yOff: -14, gain: 0.95 });
    // la chaîne lointaine, juste au-dessus de l'horizon
    Sky.ridge(fb, S.z * 6, { seed: 6161, par: 0.02, baseY: HOR + 2, h: 26, rough: 2.3,
      span: W * 1.4, body: mix(P.sky3, P.fog, 0.30),
      cap: mix(P.sky5, P.sn2, 0.5), capDim: mix(P.sky4, P.fog, 0.3) });

    /* ── LA CANOPÉE (421) ─────────────────────────────────────────────────
       La forêt qui remplit les deux coins hauts et laisse l'aurore au milieu.
       ⚠️ ELLE EST DESSINÉE APRÈS LA MONTAGNE ET AVANT LA BRUME. Après, parce
       qu'une forêt est devant une chaîne lointaine ; avant, parce qu'elle doit
       recevoir le même voile que tout ce qui est à cette distance — sans quoi
       elle se détache et devient un décor collé sur le ciel.

       ⚠️ SA PARALLAXE EST CELLE DU FOND, PAS CELLE DES ARBRES DE LA ROUTE.
       Elle glisse sur `S.z · 6 · 0,26`, c'est-à-dire à peine : elle appartient
       à l'horizon, pas au bord de la chaussée, et les arbres de la route lui
       passent devant à pleine vitesse. C'est ce rapport-là qui donne la
       profondeur, pas la couleur. */
    /* ⚠️ DEUX PASSES, ET C'EST LA DENSITÉ QUI CHANGE LA NATURE DE L'OBJET.
       Première planche du 421 avec une passe de 700 traits : on lisait de la
       PLUIE. C'est le même constat qu'au plan 4 des cinématiques (« à 200
       troncs on voit des piquets, à 900 on voit une forêt »), et il vaut
       encore plus haut ici parce que la bande est six fois plus haute.

       La passe lointaine est plus pâle, plus dense, plus basse ; la passe
       proche est un peu plus sombre et plus haute. Leur superposition donne
       l'épaisseur — une passe unique à 3 000 traits donne un aplat. */
    /* La passe lointaine porte le LAVIS : c'est elle qui fabrique le champ
       clair. La passe proche est en `wash: false` — un second lavis
       par-dessus le premier remplirait la trouée par accumulation, et
       l'aurore se retrouverait derrière deux voiles. */
    Flora.canopy(fb, S.z * 6, { seed: 4021, count: 1500, par: 0.24,
      baseY: HOR + 10, hMin: 26, hMax: 190, gap0: 176, gap1: 306, fade: 74,
      c0: mix(P.tre3, P.fog, 0.30), c1: mix(P.fog, P.sn4, 0.42),
      alpha: 0.34, wash: 0.62 });
    Flora.canopy(fb, S.z * 6, { seed: 7413, count: 900, par: 0.30,
      baseY: HOR + 14, hMin: 40, hMax: 250, gap0: 168, gap1: 314, fade: 66,
      c0: mix(P.tre2, P.fog, 0.42), c1: mix(P.tre3, P.fog, 0.60),
      alpha: 0.40, wash: false });

    fb.haze(P.fog, 0.30, 0, HOR + 6, (u) => 0.2 + u * 0.8);
    /* Le pied de la canopée noyé : sans ce voile, les troncs se terminent
       tous sur la même ligne d'écran et la forêt a l'air posée sur une
       étagère. Il ne monte que de vingt pixels. */
    fb.haze(P.fog, 0.34, HOR - 22, HOR + 20, (u) => u);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     LA VALLÉE, PAR-DESSUS LE BORD (421)
     ───────────────────────────────────────────────────────────────────────
     ⚠️ CETTE FONCTION EXISTE PARCE QU'ON A REGARDÉ LA PLANCHE. Première
     version de la falaise : le vide était un dégradé, correct au chiffre près
     et parfaitement mort à l'écran — une dalle de peinture bleue occupant la
     moitié du cadre, tenue deux secondes deux pendant que le personnage la
     contemple. Le moment le plus important de l'ouverture était le plus vide
     de l'image.

     ⚠️ ET LA CORRECTION N'EST PAS « AJOUTER DU DÉTAIL ». C'est de rendre la
     PROFONDEUR lisible : ce qu'on doit comprendre en une seconde, c'est que
     le sol est très loin en dessous. Trois plans suffisent, et ils sont
     empilés du plus lointain au plus proche comme dans les tableaux —
     versant d'en face, forêt sur ce versant, fond de vallée gelé — avec une
     nappe de brume entre chacun. Sans les nappes intercalées on obtient trois
     bandes côte à côte ; avec elles, on obtient une vallée.

     ⚠️ LA BRUME S'ÉPAISSIT VERS LE HAUT DE LA BANDE, PAS VERS LE BAS. C'est
     contre-intuitif et c'est géométrique : dans cette bande, le HAUT est ce
     qui est le plus loin (près de l'horizon) et le bas est le pied de la
     falaise, juste sous nos pieds. On voile donc le haut.
     ═══════════════════════════════════════════════════════════════════════ */
  function valley(fb, yLip) {
    const top = HOR + 1;
    const bot = Math.min(H - 1, yLip - 1);
    const span = bot - top;
    if (span < 8) return;
    const ox = S.z * 6;

    /* 1 ── LE VERSANT D'EN FACE. Plus CLAIR que le ciel, règle du 408 : une
       masse lointaine reçoit plus d'air qu'elle n'a de matière propre. */
    const ridgeY = Math.round(top + span * 0.30);
    Sky.ridge(fb, ox, { seed: 2884, par: 0.04, baseY: ridgeY, h: Math.max(6, span * 0.26),
      rough: 2.2, span: W * 1.6,
      body: mix(P.sky4, P.fog, 0.52), cap: mix(P.fog, P.sn5, 0.5),
      capDim: mix(P.sky5, P.fog, 0.55) });
    fb.haze(P.fog, 0.30, top, ridgeY + Math.round(span * 0.14), (u) => 1 - u * 0.7);

    /* 2 ── LA FORÊT SUR CE VERSANT. Le plan 4, à sa vraie fonction : dire
       qu'il y a trop d'arbres pour être comptés, donc que c'est loin.

       ⚠️ SUR UN PROFIL BRUITÉ, JAMAIS SUR UNE LIGNE. Première planche du
       421 : les trois plans posés chacun sur une ordonnée constante donnaient
       trois BANDES horizontales empilées — un drapeau, pas une vallée. Une
       ligne parfaitement droite dans un paysage naturel est lue par l'œil
       comme une frontière de calque avant d'être lue comme un horizon. Six
       pixels d'ondulation suffisent à la faire disparaître. */
    const fnF = Pix.fbm1(6421, 3);
    const forestY0 = top + span * 0.52;
    const forestAt = (x) => Math.round(forestY0 - (fnF((x + ox * 0.09) * 0.010) - 0.5) * Math.max(4, span * 0.11));
    Flora.distantMass(fb, ox, { seed: 6421, count: Math.round(520 + span * 3), par: 0.09,
      ground: forestAt, hMin: Math.max(3, span * 0.05), hMax: Math.max(6, span * 0.26),
      c0: mix(P.tre3, P.fog, 0.52), c1: mix(P.fog, P.sn4, 0.42), alpha: 0.8 });
    for (let x = 0; x < W; x++) fb.set(x, forestAt(x), mix(P.sn4, P.fog, 0.42));
    fb.haze(P.fog, 0.24, top, Math.round(forestY0 + span * 0.10), (u) => 0.35 + (1 - u) * 0.65);

    /* 3 ── LE FOND DE VALLÉE : un lac gelé, presque blanc de brume, avec de
       très longues fractures. ⚠️ LES FRACTURES SONT LA SEULE ÉCHELLE DONT ON
       DISPOSE. Sans elles, une surface pâle uniforme peut être à cent mètres
       comme à dix ; dès qu'elle porte des lignes trop fines pour être des
       objets, elle devient grande. */
    const fnL = Pix.fbm1(9704, 3);
    const floorY0 = top + span * 0.66;
    const floorAt = (x) => Math.round(floorY0 - (fnL((x + ox * 0.06) * 0.008) - 0.5) * Math.max(3, span * 0.09));
    const floorTop = Math.round(floorY0 - span * 0.06);
    for (let x = 0; x < W; x++) {
      const fy = floorAt(x);
      for (let y = fy; y <= bot; y++) {
        const u = (y - fy) / Math.max(1, bot - fy);
        fb.set(x, y, mix(mix(P.sn3, P.fog, 0.30), mix(P.sn1, P.ice1, 0.35), Math.pow(u, 1.3)));
      }
      fb.set(x, fy, mix(P.sn5, P.fog, 0.34));   // la rive éclairée, un pixel
    }
    /* ⚠️ LES FRACTURES SUIVENT LA PERSPECTIVE, ELLES NE SONT PAS
       HORIZONTALES. Posées à plat, elles se lisaient comme des rayures sur
       l'image ; inclinées et allongées vers le bas du cadre — c'est-à-dire
       vers nous —, elles deviennent des fractures vues en fuyante. */
    const R = Pix.rng(9704);
    for (let k = 0; k < 16; k++) {
      const u = R();
      const y0 = floorTop + u * (bot - floorTop);
      const x0 = R() * (W + 200) - 100 - ox * 0.06;
      const len = (24 + R() * 120) * (0.5 + u);
      const dy = (R() - 0.5) * 3 + u * 2.5;
      fb.line(x0, y0, x0 + len, y0 + dy, mix(P.ice2, P.fog, 0.45), 1);
    }
    fb.haze(P.fog, 0.22, floorTop - 4, bot, (u) => 1 - u * 0.55);

    /* 4 ── LA PAROI SOUS NOS PIEDS. Deux ou trois lignes seulement, mais
       elles disent que la falaise a une épaisseur — sans elles, le sol se
       termine sur une feuille de papier. */
    for (let j = 1; j <= 3; j++) {
      const y = bot - j + 1;
      if (y <= top) break;
      fb.hline(0, W - 1, y, mix(P.st1, P.fog, 0.20 + j * 0.08), 0.55);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     LE SOL — LA CHAUSSÉE ET LE LAC
     ═══════════════════════════════════════════════════════════════════════ */
  function ground(fb, t) {
    const camX = S.x * 0.35;   // la caméra suit mollement : elle traîne un peu
    const CZ = cliffZ();
    /* ⚠️ LA LÈVRE EST CALCULÉE UNE FOIS, AVANT LA BOUCLE. La calculer par
       ligne aurait donné la même chose ; la calculer ici permet de la
       comparer à `y` par un simple `<=`, donc de ne jamais dessiner une
       demi-dalle au-delà du vide à cause d'un arrondi qui bascule d'une ligne
       à l'autre. */
    const dCliff = CZ - S.z;
    const yLip = dCliff <= 0.35 ? H + 99
               : Math.round(HOR + K.FOCAL * K.EYE / dCliff);

    for (let y = HOR + 1; y < H; y++) {
      const z = K.FOCAL * K.EYE / (y - HOR);
      if (z > K.FAR) { fb.hline(0, W - 1, y, mix(P.sky4, P.fog, 0.30)); continue; }
      const sc = scaleAt(z);
      const f = fogAt(z);
      const wz = z + S.z;

      /* ═══ LE VIDE, AU-DELÀ DE LA LÈVRE (421) ═══════════════════════════
         ⚠️ CE N'EST PAS UN TROU NOIR, C'EST DE LA BRUME. Première intention :
         peindre le gouffre sombre, comme celui du tableau « pont ». Mais on
         ne regarde pas la même chose : au pont on est SOUS le couvert et le
         vide est proche ; ici on domine une vallée entière, et ce qu'on voit
         par-dessus le bord est la même brume que l'horizon, simplement plus
         épaisse. Un vide sombre aurait fait un mur au milieu du cadre.

         Le dégradé va du bleu de neige (près de la lèvre, on devine encore
         la profondeur) au voile d'horizon (plus loin, il n'y a plus rien à
         deviner). Il est indexé sur `f`, donc sur la DISTANCE — la même
         grandeur que tout le reste de l'image. */
      if (y <= yLip) {
        fb.hline(0, W - 1, y, mix(mix(P.sn0, P.fog, 0.58), mix(P.sky4, P.fog, 0.30), f));
        continue;
      }

      /* LE LAC GELÉ, de bord à bord. Il est plus sombre que la chaussée et il
         porte des fractures : c'est lui qui dit qu'on marche sur de l'eau. */
      const lakeShade = 0.55 + 0.45 * Math.sin(wz * 0.31);
      let lake = mix(P.ice0, P.ice1, lakeShade * 0.6);
      if ((Math.floor(wz * 0.7) % 13) === 0) lake = mix(lake, P.ice3, 0.35);
      fb.hline(0, W - 1, y, mix(lake, P.fog, f));

      const xl = screenX(-K.ROAD_HALF, z, camX);
      const xr = screenX(K.ROAD_HALF, z, camX);
      if (xr < 0 || xl > W - 1) continue;

      /* LA CHAUSSÉE. Les dalles sont des bandes de `SLAB` unités : on lit le
         reste de la division pour savoir si on est sur un joint. */
      const inSlab = wz % K.SLAB;
      const joint = inSlab < 0.12 || inSlab > K.SLAB - 0.10;
      const slabId = Math.floor(wz / K.SLAB);
      const R = Pix.rng(7000 + slabId * 17);
      const tone = 0.82 + R() * 0.36;

      let c = joint ? mix(P.sn1, P.st2, 0.45) : mix(P.sn2, P.sn3, clamp01(tone - 0.7));
      // la neige balayée : une dalle sur cinq est plus dégagée, donc plus grise
      if ((slabId % 5) === 0) c = mix(c, P.st3, 0.30);
      fb.hline(xl, xr, y, mix(c, P.fog, f));

      /* LES FRACTURES DE LA DALLE — la référence n°1 en montre une grande, en
         étoile. Elles sont déduites de l'identifiant de dalle, donc elles
         restent sur leur dalle quand on avance. */
      if (!joint && R() < 0.55) {
        const fx = xl + (xr - xl) * R();
        fb.blend(fx, y, mix(P.st1, P.fog, f), 0.55);
        if (R() < 0.4) fb.blend(fx + 1, y, mix(P.st1, P.fog, f), 0.35);
      }

      /* LES BORDS. Un liseré clair côté chaussée (la neige s'accumule au bord)
         et une paroi sombre d'un pixel : sans elle, la chaussée est un ruban
         peint sur le lac au lieu d'être une chaussée POSÉE dessus. */
      fb.blend(xl, y, mix(P.sn5, P.fog, f * 0.7), 0.9);
      fb.blend(xr, y, mix(P.sn5, P.fog, f * 0.7), 0.9);
      fb.blend(xl - 1, y, mix(P.st0, P.fog, f), 0.6);
      fb.blend(xr + 1, y, mix(P.st0, P.fog, f), 0.6);

      /* LES MURETS DE PIERRE (les rambardes de la référence). Dessinés ligne
         par ligne eux aussi : à chaque y correspond une hauteur d'écran. */
      const wallH = 0.62 * sc;
      if (wallH >= 1) {
        for (let j = 0; j < wallH; j++) {
          const u = j / wallH;
          const cw = u > 0.78 ? mix(P.sn4, P.fog, f) : mix(mix(P.st2, P.st1, u), P.fog, f);
          fb.set(xl - 1, y - j, cw); fb.set(xl - 2, y - j, mix(mix(P.st1, P.st0, u), P.fog, f));
          fb.set(xr + 1, y - j, cw); fb.set(xr + 2, y - j, mix(mix(P.st1, P.st0, u), P.fog, f));
        }
      }
    }

    // Ce qu'on découvre par-dessus le bord, avant de poser la lèvre dessus.
    if (yLip > HOR + 6 && yLip < H) valley(fb, yLip);

    /* ═══ LA LÈVRE DE LA FALAISE (421) ═══════════════════════════════════
       ⚠️ ELLE TRAVERSE TOUT LE CADRE, PAS SEULEMENT LA CHAUSSÉE. Première
       version : la chaussée s'arrêtait et le lac continuait de part et
       d'autre. On lisait un ponton qui s'arrête au milieu d'un lac, ce qui
       est une image de fin de quai — l'exact contraire de « la vallée
       s'ouvre ». Ici c'est le SOL qui finit : le lac, la chaussée et les
       murets s'arrêtent sur la même ligne, et cette ligne est la plus claire
       de l'image parce que c'est de la neige vue par la tranche, éclairée par
       l'aurore et rien derrière elle.

       Trois pixels seulement, et ils font tout le vertige. */
    if (yLip > HOR + 1 && yLip < H) {
      const fl = fogAt(Math.max(0.35, cliffZ() - S.z));
      fb.hline(0, W - 1, yLip, mix(P.sn5, P.fog, fl * 0.55));
      fb.hline(0, W - 1, yLip + 1, mix(P.sn4, P.fog, fl * 0.6));
      /* La corniche mange un peu de son propre bord : la neige surplombe, et
         c'est cette irrégularité qui empêche la ligne de se lire comme un
         trait tiré à la règle. Semée par l'abscisse, donc stable. */
      const R = Pix.rng(31337);
      for (let x = 0; x < W; x++) {
        if (R() < 0.34) fb.set(x, yLip - 1, mix(P.sn4, P.fog, fl * 0.7));
        if (R() < 0.22) fb.set(x, yLip + 2, mix(P.sn3, P.fog, fl * 0.5));
      }
    }
  }

  /* ── LES ARBRES DU BORD ────────────────────────────────────────────────────
     Semés par « créneau » de profondeur : un créneau tous les 2,4 unités, deux
     à quatre arbres par créneau, de chaque côté. Dessinés du plus loin au plus
     près pour que la superposition soit juste. */
  function trees(fb) {
    const camX = S.x * 0.35;
    const step = 2.4;
    const CZ = cliffZ();
    const first = Math.ceil(S.z / step);
    const last = Math.floor((S.z + K.FAR) / step);
    for (let i = last; i >= first; i--) {
      // 421 : rien ne pousse au-delà du bord. Sans ce test, une rangée
      // d'arbres flotte au-dessus du vide et le gouffre cesse d'exister.
      if (i * step > CZ) continue;
      const R = Pix.rng(1200 + i * 613);
      const nz = i * step - S.z;
      if (nz < 1.2) continue;
      const f = fogAt(nz);
      if (f > 0.985) continue;
      const sc = scaleAt(nz);
      const n = 2 + (R() * 3) | 0;
      for (let k = 0; k < n; k++) {
        const side = R() < 0.5 ? -1 : 1;
        const wx = side * (K.ROAD_HALF + 1.4 + R() * 16);
        const sx = screenX(wx, nz, camX);
        if (sx < -50 || sx > W + 50) continue;
        const gy = screenY(nz);
        const hgt = (5.5 + R() * 8) * sc;
        if (hgt < 3) { fb.vline(sx, gy - hgt, gy, mix(P.tre3, P.fog, f), 0.8); continue; }
        /* La couleur de l'arbre vient de sa DISTANCE : proche il est plus
           dense, lointain il se fond dans la brume. C'est la règle des quatre
           plans des cinématiques, rendue continue par la profondeur.

           ⚠️ CORRIGÉ AU 421, ET C'EST LA MOITIÉ DES 51 POINTS DE LUMINANCE
           MANQUANTS. La version du 419 tirait vers `sil1` — la valeur des
           branches de CADRAGE — dès qu'un arbre passait à moins de 26 unités.
           Les arbres de bord de route arrivaient donc presque noirs au premier
           plan, et ils occupent le haut du cadre : d'où 21,8 % de pixels sous
           L30 quand la référence en a 2,5 %.

           ⚠️ ET LE NOIR N'EST PAS UNE ERREUR EN SOI, C'EST UNE RESSOURCE
           RARE. `sil0`/`sil1` appartiennent aux branches qui entrent par les
           coins et qui cadrent l'image ; s'ils servent aussi au décor
           courant, ils cessent de découper quoi que ce soit et l'image perd
           sa profondeur au moment même où elle gagne du contraste. Les arbres
           de bord de route redescendent donc dans la famille `tre`, dont
           c'est le travail. */
        const near = clamp01(1 - nz / 26) * 0.62;
        const col = mix(mix(P.tre2, P.tre0, near), P.fog, f);
        Flora.tree(fb, sx, gy, hgt, col, 1200 + i * 613 + k * 31, {
          depth: hgt > 40 ? 5 : hgt > 16 ? 4 : 3,
          wid: Math.max(1, hgt / 26),
          spread: 0.6,
          snow: hgt > 24, snowCol: mix(P.sn3, P.fog, f),
        });
      }
    }
  }

  /* ── LES OBJETS POSÉS ─────────────────────────────────────────────────────── */
  function objects(fb, t) {
    const camX = S.x * 0.35;
    const CZ = cliffZ();

    // les braseros
    const bi0 = Math.floor(S.z / K.BRAZIER_EVERY);
    for (let i = bi0 + 4; i >= bi0 - 1; i--) {
      if (i < 0) continue;
      const b = brazierAt(i);
      if (b.z > CZ) continue;                 // 421 : rien au-delà du bord
      const nz = b.z - S.z;
      if (nz < 0.9 || nz > K.FAR) continue;
      const f = fogAt(nz);
      const sc = scaleAt(nz);
      Props.brazier(fb, screenX(b.x, nz, camX), screenY(nz), t, {
        scale: clamp01(sc / 26) * 1.5, k: 1 - f * 0.85,
      });
    }

    /* Les éclats de givre. ⚠️ ABSENTS DE L'OUVERTURE (421) : un objet qui
       brille et qu'on peut ramasser sur la toute première image apprend au
       joueur que ce jeu se collectionne. Le chapitre 1 lui apprend d'abord
       qu'il se regarde. Les éclats arrivent au segment du milieu, une fois
       qu'on sait ce qu'est le givre. */
    const si0 = Math.floor(S.z / K.SHARD_EVERY);
    for (let i = si0 + 6; S.M && S.M.shards && i >= si0; i--) {
      if (i < 0 || S.got[i]) continue;
      const sh = shardAt(i);
      if (sh.z > CZ) continue;
      const nz = sh.z - S.z;
      if (nz < 0.6 || nz > 46) continue;
      const f = fogAt(nz);
      const sc = scaleAt(nz);
      const bob = Math.sin(t * 2.2 + i) * 0.12;
      const sx = screenX(sh.x, nz, camX);
      const sy = screenY(nz) - (0.75 + bob) * sc;
      const r = Math.max(1, Math.round(sc / 44));
      // un losange, pas un carré : à trois pixels, l'orientation est le seul
      // indice de forme dont on dispose.
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++)
          if (Math.abs(dx) + Math.abs(dy) <= r)
            fb.set(sx + dx, sy + dy, mix(Math.abs(dx) + Math.abs(dy) === r ? P.cry1 : P.cry2, P.fog, f * 0.6));
      fb.glow(sx, sy, r * 5 + 4, P.cry1, 0.35 * (1 - f));
    }
  }

  /* ── LE PERSONNAGE ─────────────────────────────────────────────────────────
     Il est à une profondeur FIXE (2,6 unités) et c'est le monde qui bouge.
     Sa position à l'écran suit `S.x` mais amortie par le suivi de caméra :
     l'écart entre les deux est ce qui donne la sensation de pas de côté. */
  function player(fb, t) {
    const camX = S.x * 0.35;
    const nz = 2.6;
    const sx = Math.round(screenX(S.x, nz, camX));
    const sy = Math.round(screenY(nz));
    // l'ombre portée : une ellipse sombre, sinon il lévite
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -9; dx <= 9; dx++) {
        const d = Math.sqrt((dx / 9) ** 2 + (dy / 2.2) ** 2);
        if (d < 1) fb.blend(sx + dx, sy + dy, P.st1, (1 - d) * 0.34);
      }
    /* ⚠️ LE PAS SUIT LA VITESSE (421). Le personnage qui freine devant la
       falaise continuait de courir sur place à pleine cadence : c'est le
       genre de détail dont personne ne sait dire ce qui cloche, et qui suffit
       à faire lire toute la scène comme une animation qui bugue. Le pas
       s'éteint donc avec l'avance, et il s'arrête tout à fait au bord. */
    const gait = clamp01(S.spd / K.SPEED);
    Props.hero(fb, sx, sy, t, { scale: 1.55, walk: gait > 0.04, walkSpd: 9.5 * gait });
  }

  /* ── LA BOUCLE ─────────────────────────────────────────────────────────────── */
  function step(dt, input) {
    if (S.done) return;
    S.t += dt;

    /* ── L'AVANCE, ET LE FREINAGE DEVANT LE VIDE (421) ────────────────────
       ⚠️ ON NE COUPE PAS LE MOUVEMENT, ON L'ÉTEINT. Le personnage ralentit
       sur les derniers mètres et s'immobilise AU bord. Trois raisons, et la
       troisième est la vraie :
         1. une image qui se fige sur un déplacement à pleine vitesse se lit
            comme une chute ou comme un plantage ;
         2. le ralentissement donne au joueur le temps de VOIR ce qui s'ouvre,
            ce qui est tout le sujet de l'ouverture ;
         3. c'est le seul moment du jeu où on lui retire la main sans qu'il
            ait perdu. Il faut donc que ça ressemble à une décision du
            personnage, pas à une limite du programme.

       La vitesse suit une racine de la distance restante : elle décroît vite
       au début du freinage et devient très douce à la fin, ce qui est le
       profil d'un pas qui s'arrête. Une décroissance linéaire s'arrête net. */
    const CZ = cliffZ();
    let spd = K.SPEED;
    if (CZ !== Infinity) {
      /* ⚠️ ON NE S'ARRÊTE PAS À `CZ`, ET C'EST UN PIÈGE QUI NE LÈVE AUCUNE
         ERREUR. La caméra est DERRIÈRE le personnage : lui vit à 2,6 unités
         devant elle (voir `player`). Amener la caméra jusqu'à la lèvre
         placerait donc le personnage 2,6 unités AU-DELÀ du bord, debout sur
         le vide — et le rendu, qui ne compare que des distances, n'aurait
         rien à signaler. On s'arrête à `CZ − EDGE_GAP`, où `EDGE_GAP` vaut la
         profondeur du personnage plus la bande de sol qu'on veut lui laisser
         devant les pieds. */
      const stopZ = CZ - K.EDGE_GAP;
      const brakeZ = K.BRAKE_M / 3.1;
      const left = stopZ - S.z;
      if (left < brakeZ) spd = K.SPEED * Math.sqrt(clamp01(left / brakeZ));
      if (left <= 0.04) { spd = 0; S.z = stopZ; }
    }
    S.z += spd * dt;
    S.spd = spd;              // relu par `player` : le pas suit la vitesse

    // déplacement latéral, avec inertie : un pas de côté instantané se lit
    // comme un téléport à cette échelle.
    const want = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    S.vx += (want * K.STRAFE - S.vx) * Math.min(1, dt * 7.5);
    S.x += S.vx * dt;
    const lim = K.ROAD_HALF - 0.55;
    if (S.x < -lim) { S.x = -lim; S.vx = 0; }
    if (S.x > lim) { S.x = lim; S.vx = 0; }

    /* Ramassage des éclats.
       ⚠️ LA GARDE DE MODE EST ICI AUSSI, ET C'EST LE BANC D'ESSAI QUI L'A
       TROUVÉE (421). Première version : `objects()` ne DESSINAIT plus les
       éclats en mode « run », et on en avait conclu qu'ils n'existaient pas.
       Ils existaient, et on les ramassait — invisibles. Le compteur de la fin
       de chapitre partait donc à trois ou quatre sans que personne n'ait vu
       quoi que ce soit à l'écran. Rendre un objet invisible n'est pas le
       retirer du monde ; c'est la même erreur que cacher un panneau derrière
       une opacité CSS en continuant de peindre le décor. */
    const si = Math.floor(S.z / K.SHARD_EVERY);
    for (let i = si - 1; S.M && S.M.shards && i <= si + 1; i++) {
      if (i < 0 || S.got[i]) continue;
      const sh = shardAt(i);
      if (Math.abs(sh.z - S.z - 2.6) < 0.9 && Math.abs(sh.x - S.x) < 1.0) {
        S.got[i] = true; S.shards++;
      }
    }
    // passage d'un brasero : il « répond » et la jauge de Chant monte
    const bi = Math.floor(S.z / K.BRAZIER_EVERY);
    for (let i = bi - 1; i <= bi + 1; i++) {
      if (i < 0 || S.lit[i]) continue;
      const b = brazierAt(i);
      if (Math.abs(b.z - S.z - 2.6) < 1.4) { S.lit[i] = true; S.chant = Math.min(1, S.chant + 0.17); }
    }

    /* ── LA FIN ──────────────────────────────────────────────────────────
       Deux façons de finir, une par mode.

       `walk` — on atteint la distance, le récit reprend. Inchangé.

       `run`  — ⚠️ LA COURSE NE SE TERMINE PAS QUAND ON ARRIVE, MAIS UN PEU
       APRÈS. On tient `HOLD_S` secondes au bord, immobile, avant de rendre la
       main à la cinématique. Sans cette poignée de secondes, l'enchaînement
       est : le personnage s'arrête / fondu au noir — et on n'a pas eu le
       temps de comprendre pourquoi il s'est arrêté. Avec elle, on a REGARDÉ
       ce qu'il regarde, et le fondu devient la conséquence de ce regard.
       C'est deux secondes deux, et c'est la différence entre une transition
       et une coupure. */
    if (S.M && S.M.cliff) {
      if (S.z >= cliffZ() - K.EDGE_GAP - 0.05) {
        S.hold += dt;
        if (S.hold >= K.HOLD_S) S.done = true;
      }
    } else if (metres() >= S.M.endM) {
      S.done = true;
    }
  }

  function render(fb, t) {
    backdrop(fb, t);
    ground(fb, t);
    trees(fb);
    objects(fb, t);
    player(fb, t);
    Sky.reflect(fb, HOR + 1, HOR + 40, CFG.AURORA.REFLECT_K * 0.8);
    Props.snowfall(fb, S.z * 4, t, { density: 1.15 });
    /* ⚠️ VIGNETTE DIVISÉE PAR DEUX AU 421 (0,46 → 0,22), ET C'EST UNE
       CONTRADICTION QU'ON N'AVAIT PAS VUE. Elle assombrit les coins avec
       `sky0`, la valeur la plus noire de la palette — c'est-à-dire exactement
       les quatre zones que la canopée vient remplir, et exactement celles où
       la mesure disait qu'il manquait soixante-neuf points de luminance. On
       construisait un plan et on le repeignait en noir trois lignes plus bas.

       ⚠️ MAIS ON NE LA SUPPRIME PAS. Son travail — empêcher l'œil de sortir
       par les bords — est toujours nécessaire, et il est maintenant fait
       surtout par la canopée elle-même, qui ferme les coins avec de la
       matière au lieu de les fermer avec du noir. Ce qui reste de vignette
       n'est plus qu'un rattrapage. */
    Scenes.vignette(fb, 0.22);
    Scenes.grain(fb, 0.045);
  }

  /* ── POUR `tools/preview.mjs` ─────────────────────────────────────────────
     Positionne l'état puis rend une image.

     ⚠️ ON NE PEUT PLUS SE CONTENTER DE `z = t · SPEED` (421). Avec une
     falaise, la vitesse n'est plus constante : la placer au jugé donnerait
     une planche d'arrivée qui ne correspond à aucun instant réel du jeu — et
     la planche cesserait d'être une preuve. On SIMULE donc, au pas de la
     simulation réelle, ce qui coûte quelques milliers d'itérations et rend la
     planche exacte. C'est le même raisonnement qui a fait exister cet outil.

     `mode` accepte "run" ou "walk" ; `t` est le temps écoulé en secondes. */
  function debugRender(fb, t, mode) {
    reset(mode);
    const dt = 1 / CFG.SIM_HZ;
    const still = { left: false, right: false };
    for (let e = 0; e < t; e += dt) step(dt, still);
    S.x = Math.sin(t * 0.5) * 1.6;
    render(fb, t);
  }

  return { S, reset, step, render, debugRender, metres, fogAt, cliffZ,
           get goal() { return S.M ? S.M.endM : K.MODES.walk.endM; } };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Walk;
