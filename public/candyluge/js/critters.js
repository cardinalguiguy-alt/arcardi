/* =============================================================================
   critters.js — LES GOURMANDS ET LES BONBONS. Ce qui vit sur la piste.
   -----------------------------------------------------------------------------
   Les gourmands sont MOBILES — demande explicite (« éviter les monstres
   dynamiques »). Ce n'est pas un détail de mise en scène : un obstacle fixe se
   lit de loin et se contourne d'un seul geste, un obstacle qui TRAVERSE la
   piste demande de lire une trajectoire et de choisir un moment. Le premier est
   un décor à éviter, le second est un jeu.

   ═══════════════════════════════════════════════════════════════════════════
   ⚠️ LA GARANTIE DE PASSAGE — LA PARTIE LA PLUS IMPORTANTE DE CE FICHIER
   ═══════════════════════════════════════════════════════════════════════════
   « Le niveau 5 est impossible » est un reproche entendu sur l'autre mini-jeu
   du Pays des Bonbons. On ne veut pas l'entendre deux fois, et on ne compte pas
   sur des essais pour l'éviter : ici, l'existence d'un passage est une
   PROPRIÉTÉ DE CONSTRUCTION, pas un résultat de test.

   Une vague de N gourmands est posée ainsi :

     1. on tire d'abord LE TROU — sa position sur la largeur de la piste, large
        d'au moins CRITTER_GAP_MIN (9,5 u, pour une luge de 2,7 u de large) ;
     2. la place qui RESTE, de part et d'autre, est découpée en N bandes ;
     3. chaque gourmand reçoit une bande et ne peut JAMAIS en sortir — son
        oscillation est bornée par la bande, pas par un espoir.

   Conséquence : le trou existe à tout instant, quel que soit le nombre de
   gourmands, la difficulté ou le hasard du tirage. Il peut être difficile à
   atteindre — c'est le jeu — mais il est là. tools/verify-luge.mjs le
   re-vérifie par balayage sur toute la descente, à toutes les difficultés,
   parce qu'une garantie qu'on ne mesure pas est une intention.

   ⚠️ ET LEUR VITESSE EST PLAFONNÉE (CRITTER_SPEED_MAX). Un gourmand plus
   rapide que le déplacement latéral de la luge n'est pas un obstacle difficile,
   c'est un piège : il rattrape la luge où qu'elle aille.
   ========================================================================== */

const Critters = (function () {

  /* Générateur pseudo-aléatoire à graine. ⚠️ IL EST DÉTERMINISTE ET C'EST
     NÉCESSAIRE : la descente doit être la même pour tout le monde (c'est un
     jeu de temps), et surtout l'outil de contrôle doit pouvoir examiner
     EXACTEMENT les vagues que le joueur rencontrera. Un Math.random() rendrait
     la vérification statistique, donc décorative. */
  function rngOf(seed) {
    let a = (seed * 1664525 + 1013904223) >>> 0;
    return function () {
      a = (a * 1664525 + 1013904223) >>> 0;
      return a / 4294967296;
    };
  }

  const KINDS = ["gum", "marsh", "jelly"];

  /* Construit la vague numéro `w`. Renvoie la liste de ses gourmands.
     La difficulté ne joue QUE sur le nombre et l'espacement des vagues — voir
     CRITTER_SPACING / CRITTER_PER_WAVE. Une seule variable de difficulté est
     une difficulté qu'on peut régler ; trois sont une difficulté qu'on subit. */
  function buildWave(w) {
    const rnd = rngOf(0x10CE + w * 7919);
    // L'abscisse de la vague : la somme des espacements des paliers traversés.
    let s = 240;   // les 240 premières unités sont vierges : on apprend à diriger
    for (let k = 0; k < w; k++) {
      const st = Math.min(5, Math.floor(s / CFG.STAGE_LEN));
      s += CFG.CRITTER_SPACING[st];
    }
    const stage = Math.min(5, Math.floor(s / CFG.STAGE_LEN));
    const n = CFG.CRITTER_PER_WAVE[stage];
    const W = Slope.widthAt(s);
    const R = CFG.CRITTER_RADIUS;
    const gap = CFG.CRITTER_GAP_MIN;

    /* 1. LE TROU d'abord. Son centre peut aller d'un bord à l'autre, mais il
       reste entier dans la piste. */
    const gapCenter = (rnd() - 0.5) * Math.max(0, W - gap);
    const gapL = gapCenter - gap / 2, gapR = gapCenter + gap / 2;

    /* 2. Les deux régions restantes, et leurs largeurs. */
    const regions = [];
    if (gapL > -W / 2 + 0.5) regions.push({ a: -W / 2, b: gapL });
    if (gapR < W / 2 - 0.5) regions.push({ a: gapR, b: W / 2 });
    if (!regions.length) return [];

    /* 3. Répartition des N gourmands dans ces régions, au prorata de leur
       largeur — sinon une vague de 3 en collerait 2 dans une région étroite et
       les bandes y seraient plus petites qu'un gourmand. */
    const total = regions.reduce((t, r) => t + (r.b - r.a), 0);
    const out = [];
    let placed = 0;
    for (let ri = 0; ri < regions.length; ri++) {
      const r = regions[ri];
      const share = ri === regions.length - 1
        ? n - placed
        : Math.round(n * (r.b - r.a) / total);
      for (let k = 0; k < share && placed < n; k++, placed++) {
        const bandW = (r.b - r.a) / share;
        /* ⚠️ LE GOURMAND EST RENTRÉ DE FORCE DANS SA RÉGION, RAYON COMPRIS.
           Première version : on posait le centre au milieu de la bande et on
           bornait l'oscillation. Ça suffit tant que la bande est plus large que
           le gourmand — et tools/verify-luge.mjs a trouvé 32 cas où elle ne
           l'était pas : le gourmand débordait alors de son propre côté, donc du
           bord de piste, donc de l'accord passé avec le joueur.
           Une région trop étroite pour un gourmand n'en reçoit PLUS AUCUN : une
           vague de deux au lieu de trois est un moindre mal comparé à un
           obstacle planté dans la barrière. */
        const lo = r.a + R, hi = r.b - R;
        if (hi <= lo) { placed--; continue; }
        const c0 = Math.max(lo, Math.min(hi, r.a + bandW * (k + 0.5)));
        const amp = Math.max(0, Math.min(bandW / 2 - R, Math.min(c0 - lo, hi - c0)));
        /* La pulsation est déduite de l'amplitude pour respecter le plafond de
           vitesse : v = amp·ω, donc ω ≤ SPEED_MAX / amp. */
        const wMax = amp > 0.01 ? CFG.CRITTER_SPEED_MAX / amp : 0;
        const omega = Math.min(wMax, 0.9 + rnd() * 1.3);
        out.push({
          s, u: c0, c0, amp, omega, phase: rnd() * Math.PI * 2,
          kind: KINDS[(w + placed) % KINDS.length],
          hop: rnd() * Math.PI * 2,
          alive: true, mesh: null, wave: w,
        });
      }
    }
    return out;
  }

  /* Le nombre total de vagues d'une descente. Calculé une fois : il sert au
     jeu ET à l'outil de contrôle, qui doit toutes les examiner. */
  function waveCount() {
    let s = 240, w = 0;
    while (s < CFG.DESCENT_LENGTH && w < 400) {
      const st = Math.min(5, Math.floor(s / CFG.STAGE_LEN));
      s += CFG.CRITTER_SPACING[st];
      w++;
    }
    return w;
  }

  function Field() {
    this.list = [];       // gourmands vivants à l'écran
    this.nextWave = 0;
    this.candies = [];
    this.nextGarland = 0;
  }

  /* Les BONBONS ne sont pas là pour le score : ils sont là pour DESSINER LA
     BONNE TRAJECTOIRE. Une guirlande posée dans la corde d'un virage apprend
     la corde sans un mot d'explication — c'est la plus vieille pédagogie du
     jeu de course, et elle ne coûte pas une ligne d'interface. */
  Field.prototype.buildGarland = function (g) {
    const s0 = 120 + g * CFG.CANDY_SPACING * CFG.CANDY_RUN;
    const out = [];
    for (let k = 0; k < CFG.CANDY_RUN; k++) {
      const s = s0 + k * CFG.CANDY_SPACING;
      const curve = Slope.curveAt(s);
      const W = Slope.widthAt(s);
      // La corde : à l'intérieur du virage, d'autant plus que le virage est
      // serré. En ligne droite, léger balancement pour ne pas faire un rail.
      const inside = -Math.sign(curve) * Math.min(1, Math.abs(curve) * 900);
      const u = inside * (W * 0.28) + Math.sin(s / 140) * (W * 0.1);
      out.push({ s, u, taken: false, mesh: null, hue: (g + k) % CFG.COL_CANDY_SET.length });
    }
    return out;
  };

  Field.prototype.update = function (dt, now, sled) {
    const t = now / 1000;

    // Apparition des vagues, loin devant : on ne peut pas être surpris par ce
    // qui naît sous le nez (voir CRITTER_SPAWN_AHEAD).
    while (this.nextWave < waveCount()) {
      const wv = buildWave(this.nextWave);
      const ws = wv.length ? wv[0].s : Infinity;
      if (ws > sled.s + CFG.CRITTER_SPAWN_AHEAD) break;
      this.list.push(...wv);
      this.nextWave++;
    }
    while (this.nextGarland * CFG.CANDY_SPACING * CFG.CANDY_RUN + 120 < sled.s + CFG.CRITTER_SPAWN_AHEAD
           && this.nextGarland * CFG.CANDY_SPACING * CFG.CANDY_RUN < CFG.DESCENT_LENGTH) {
      this.candies.push(...this.buildGarland(this.nextGarland));
      this.nextGarland++;
    }

    // Déplacement + collision.
    for (const c of this.list) {
      c.u = c.c0 + (c.amp ? Math.sin(t * c.omega + c.phase) * c.amp : 0);
      c.bob = Math.sin(t * 3.1 + c.hop);
      if (!c.alive || !sled.alive) continue;
      const ds = Math.abs(c.s - sled.s), du = Math.abs(c.u - sled.u);
      if (ds < CFG.CRITTER_RADIUS + 1.2 && du < CFG.CRITTER_RADIUS + CFG.SLED_HALF_W) {
        /* ⚠️ LE SAUT NE REND PAS INVULNÉRABLE, il fait PASSER PAR-DESSUS. La
           nuance est tout l'équilibre de la touche haut : une fenêtre de vol à
           viser, et non un bouton qui annule les obstacles. */
        if (sled.air > CFG.SLED_JUMP_CLEAR) continue;
        sled.die("crash");
      }
    }

    for (const k of this.candies) {
      if (k.taken || !sled.alive) continue;
      if (Math.abs(k.s - sled.s) < CFG.CANDY_RADIUS + 1.5
        && Math.abs(k.u - sled.u) < CFG.CANDY_RADIUS + CFG.SLED_HALF_W
        && sled.air < 3.2) {
        k.taken = true;
        sled.candies++;
      }
    }

    // Nettoyage derrière. Les meshes sont détruits par world.js, qui les
    // possède : on marque, on ne libère pas.
    const cut = sled.s - CFG.CRITTER_DESPAWN_BEHIND;
    this.gone = [];
    this.list = this.list.filter((c) => {
      if (c.s < cut) { this.gone.push(c); return false; }
      return true;
    });
    this.candies = this.candies.filter((k) => {
      if (k.s >= cut && !k.taken) return true;
      // Ramassé ou dépassé : on le signale à world.js, qui possède son mesh.
      if (k.mesh) this.gone.push(k);
      return false;
    });
  };

  return { Field, buildWave, waveCount, rngOf };
})();
