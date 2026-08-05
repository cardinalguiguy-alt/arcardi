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
  };

  function reset() {
    S.z = 0; S.x = 0; S.vx = 0; S.shards = 0; S.chant = 0;
    S.lit = {}; S.got = {}; S.done = false; S.t = 0;
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
  /* La brume : nulle à huit unités, totale à la coupure. En puissance 1,35
     parce qu'une brume linéaire mange le plan moyen avant le plan lointain. */
  const fogAt = (z) => Math.pow(clamp01((z - 6) / (K.FAR - 6)), 1.35);

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
    fb.haze(P.fog, 0.30, 0, HOR + 6, (u) => 0.2 + u * 0.8);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     LE SOL — LA CHAUSSÉE ET LE LAC
     ═══════════════════════════════════════════════════════════════════════ */
  function ground(fb, t) {
    const camX = S.x * 0.35;   // la caméra suit mollement : elle traîne un peu
    for (let y = HOR + 1; y < H; y++) {
      const z = K.FOCAL * K.EYE / (y - HOR);
      if (z > K.FAR) { fb.hline(0, W - 1, y, mix(P.sky4, P.fog, 0.30)); continue; }
      const sc = scaleAt(z);
      const f = fogAt(z);
      const wz = z + S.z;

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
  }

  /* ── LES ARBRES DU BORD ────────────────────────────────────────────────────
     Semés par « créneau » de profondeur : un créneau tous les 2,4 unités, deux
     à quatre arbres par créneau, de chaque côté. Dessinés du plus loin au plus
     près pour que la superposition soit juste. */
  function trees(fb) {
    const camX = S.x * 0.35;
    const step = 2.4;
    const first = Math.ceil(S.z / step);
    const last = Math.floor((S.z + K.FAR) / step);
    for (let i = last; i >= first; i--) {
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
        /* La couleur de l'arbre vient de sa DISTANCE : proche il est presque
           noir, lointain il se fond dans la brume. C'est la règle des quatre
           plans des cinématiques, rendue continue par la profondeur. */
        const near = clamp01(1 - nz / 26);
        const col = mix(mix(P.tre1, P.sil1, near), P.fog, f);
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

    // les braseros
    const bi0 = Math.floor(S.z / K.BRAZIER_EVERY);
    for (let i = bi0 + 4; i >= bi0 - 1; i--) {
      if (i < 0) continue;
      const b = brazierAt(i);
      const nz = b.z - S.z;
      if (nz < 0.9 || nz > K.FAR) continue;
      const f = fogAt(nz);
      const sc = scaleAt(nz);
      Props.brazier(fb, screenX(b.x, nz, camX), screenY(nz), t, {
        scale: clamp01(sc / 26) * 1.5, k: 1 - f * 0.85,
      });
    }

    // les éclats de givre
    const si0 = Math.floor(S.z / K.SHARD_EVERY);
    for (let i = si0 + 6; i >= si0; i--) {
      if (i < 0 || S.got[i]) continue;
      const sh = shardAt(i);
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
    Props.hero(fb, sx, sy, t, { scale: 1.55, walk: true, walkSpd: 9.5 });
  }

  /* ── LA BOUCLE ─────────────────────────────────────────────────────────────── */
  function step(dt, input) {
    if (S.done) return;
    S.t += dt;
    S.z += K.SPEED * dt;

    // déplacement latéral, avec inertie : un pas de côté instantané se lit
    // comme un téléport à cette échelle.
    const want = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    S.vx += (want * K.STRAFE - S.vx) * Math.min(1, dt * 7.5);
    S.x += S.vx * dt;
    const lim = K.ROAD_HALF - 0.55;
    if (S.x < -lim) { S.x = -lim; S.vx = 0; }
    if (S.x > lim) { S.x = lim; S.vx = 0; }

    // ramassage des éclats
    const si = Math.floor(S.z / K.SHARD_EVERY);
    for (let i = si - 1; i <= si + 1; i++) {
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

    if (metres() >= K.GOAL_M) S.done = true;
  }

  function render(fb, t) {
    backdrop(fb, t);
    ground(fb, t);
    trees(fb);
    objects(fb, t);
    player(fb, t);
    Sky.reflect(fb, HOR + 1, HOR + 40, CFG.AURORA.REFLECT_K * 0.8);
    Props.snowfall(fb, S.z * 4, t, { density: 1.15 });
    Scenes.vignette(fb, 0.46);
    Scenes.grain(fb, 0.045);
  }

  /* Pour `tools/preview.mjs` : positionne l'état puis rend une image. */
  function debugRender(fb, t) {
    reset();
    S.z = t * K.SPEED;
    S.x = Math.sin(t * 0.5) * 1.6;
    render(fb, t);
  }

  return { S, reset, step, render, debugRender, metres,
           get goal() { return K.GOAL_M; } };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Walk;
