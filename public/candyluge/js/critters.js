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

  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ DE QUEL CÔTÉ EST LE TROU — ET IL NE CHANGE PAS À CHAQUE VAGUE (414).
     ──────────────────────────────────────────────────────────────────────────
     Une fois le trou repoussé hors de l'axe (voir DEAD_EDGE), il fallait aussi
     décider de quel côté. Le tirage indépendant à pile ou face, qui semblait
     évident, produisait le pire jeu possible :

     ⚠️ UNE VAGUE SUR DEUX IMPOSAIT DE TRAVERSER TOUTE LA PISTE. Passer de +8 à
     −8, c'est seize unités de déport — et pas n'importe lesquelles : il faut
     rendre la carre, repasser à plat, engager l'autre (qui coûte DEUX FOIS
     plus, EDGE_CROSS_MUL), traverser, puis se stabiliser. Environ quatre
     secondes. Avec des vagues tous les 205 unités, soit cinq secondes à pleine
     vitesse, il ne restait aucune marge — et à la moindre erreur, plus rien
     n'était rattrapable. Le banc d'essai voyait son pilote rater quatre vagues
     sur cinq.

     ⚠️ LA RÈGLE : CE N'EST PAS LA DIFFICULTÉ D'UN OBSTACLE QUI COMPTE, C'EST LA
     DIFFICULTÉ DE L'ENCHAÎNEMENT. Chaque vague était franchissable seule ; leur
     succession ne l'était pas. Un obstacle se juge toujours avec celui qui le
     précède.

     Le côté suit donc une marche aléatoire PARESSEUSE : il a environ deux
     chances sur trois de rester le même. On obtient des séries de deux ou trois
     vagues du même bord — c'est-à-dire un RYTHME, qu'on lit et qu'on anticipe —
     entrecoupées de vraies traversées qui deviennent, elles, des moments.
     C'est plus lisible ET plus intéressant que le pile ou face, pour exactement
     le même nombre d'obstacles.

     ⚠️ Déterministe, comme tout le reste : la descente est la même pour tout le
     monde, et l'outil de contrôle examine bien les vagues que le joueur aura. */
  function gapSide(w) {
    let side = -1;
    const r = rngOf(0x5A1DE);
    for (let k = 0; k <= w; k++) if (r() < 0.34) side = -side;
    return side;
  }

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
       reste entier dans la piste.

       ⚠️ ET IL N'EST JAMAIS AU MILIEU. C'est le contrôle le plus humiliant
       qu'ait produit tools/verify-luge.mjs : un pilote qui NE TOUCHAIT À RIEN
       descendait plus vite (148 s) et se vautrait moins (2 fois) qu'un pilote
       qui esquivait (191 s, 8 chutes). Autrement dit : le meilleur pilotage
       était l'absence de pilotage.

       La cause était là. Un trou tiré uniformément tombe souvent près du
       centre — c'est-à-dire pile là où se trouve un joueur qui ne fait rien.
       On le repousse donc systématiquement d'au moins DEAD_CENTER unités : le
       passage est toujours à gauche ou à droite, jamais devant. Le joueur DOIT
       choisir un côté, ce qui est la définition même d'un obstacle. */
    /* ⚠️⚠️ CORRIGÉ AU 414, ET C'ÉTAIT UNE ERREUR D'ARITHMÉTIQUE, PAS DE GOÛT.

       Le 413 avait bien vu le problème — « un pilote qui ne touchait à rien
       descendait plus vite qu'un pilote qui esquivait » — et avait écrit la
       bonne intention : repousser le trou d'au moins 4,5 unités du centre pour
       forcer le joueur à choisir un côté. Sauf que 4,5 est la distance du
       CENTRE DU TROU au milieu de la piste, et que le trou fait 13 unités de
       large. Son bord intérieur se trouvait donc à 4,5 − 6,5 = −2 : LE MILIEU
       DE LA PISTE ÉTAIT TOUJOURS DANS LE TROU. La correction n'en était pas
       une, et le contrôle a continué d'échouer pendant tout un zip sans qu'on
       comprenne pourquoi.

       ⚠️ CE QU'IL FAUT REPOUSSER, C'EST LE BORD DU TROU, PAS SON CENTRE. On
       exige donc que le bord intérieur soit à au moins DEAD_EDGE unités de
       l'axe : le joueur qui ne fait rien est alors VRAIMENT hors du passage, ce
       qui est la définition d'un obstacle. La distance du centre s'en déduit,
       elle ne se choisit pas. */
    const DEAD_EDGE = 2.2;
    const room = Math.max(0, W - gap) / 2;
    const wantCenter = gap / 2 + DEAD_EDGE;
    const side = gapSide(w);
    const gapCenter = room <= wantCenter
      ? side * room                      // piste trop étroite : on pousse au maximum
      : side * (wantCenter + rnd() * (room - wantCenter));
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
        /* La pulsation : période de 7 à 20 secondes, soit deux à six fois la
           durée d'une approche. Le gourmand décrit alors, dans le champ de
           vision du joueur, un mouvement PRESQUE RECTILIGNE dont on lit le
           sens d'un coup d'œil — au lieu d'un va-et-vient qu'il faudrait
           chronométrer. */
        const omega = Math.min(wMax, 0.32 + rnd() * 0.58);
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

  /* ══════════════════════════════════════════════════════════════════════════
     LE RECUL DES VAGUES (414) — le pendant de SlopeGen.rewind().
     ──────────────────────────────────────────────────────────────────────────
     ⚠️ SANS ÇA, LE CHECKPOINT SE VIDE DE SON SENS. Les vagues sont créées une
     fois, dans l'ordre, et jetées derrière : après une remise en place, le
     joueur refait le passage SANS AUCUN GOURMAND — c'est-à-dire qu'il ne refait
     pas le passage qu'il vient de rater. Le morceau à recommencer doit être le
     même, sinon la punition ne veut rien dire et la reprise n'apprend rien.

     On remet donc le compteur de vagues là où il était à cette abscisse, et on
     jette les gourmands en piste (ils seront recréés par update). Les bonbons
     suivent la même règle — mais eux REVIENNENT RAMASSABLES, ce qui est
     délibéré : ils marquent la trajectoire, ils ne sont pas un butin. Les faire
     disparaître définitivement retirerait au joueur qui recommence la seule
     chose qui lui montre où passer, exactement au moment où il en a besoin.
     ══════════════════════════════════════════════════════════════════════════ */
  Field.prototype.rewind = function (s, tries) {
    if (this.list.length) {
      this.gone = (this.gone || []).concat(this.list);
      this.list = [];
    }
    if (this.candies.length) {
      this.gone = (this.gone || []).concat(this.candies.filter((k) => k.mesh));
      this.candies = [];
    }
    /* ⚠️⚠️ ON REPREND APRÈS LA ZONE DÉGAGÉE, PAS À L'ABSCISSE DE REPRISE.
       C'est la moitié critique de la correction décrite dans config.js
       (CP_CLEAR) : une vague qui tombe juste devant le point de reprise crée
       une BOUCLE INFINIE — on réapparaît, on la percute avant d'avoir repris le
       contrôle, on réapparaît. Le banc d'essai a compté 199 chutes au même
       mètre avant qu'on l'ajoute.
       Les vagues sautées sont perdues, et c'est très bien : le joueur les avait
       déjà franchies pour atteindre la porte. */
    /* ⚠️⚠️ LA ZONE DÉGAGÉE S'AGRANDIT À CHAQUE ÉCHEC CONSÉCUTIF — C'EST LA
       GARANTIE DE PROGRESSION DU 414, ET ELLE EST NON NÉGOCIABLE.

       Le banc d'essai a montré que même une fois la reprise assainie, il reste
       des passages où un pilote donné échoue encore et encore : il repart, il
       retente exactement la même chose, il rate exactement pareil. Un système à
       checkpoints transforme alors ce passage en MUR DÉFINITIF — le joueur ne
       verra jamais la fin du jeu, quel que soit le temps qu'il y consacre.

       ⚠️ ET AUCUNE GARANTIE STATIQUE NE SUFFIT À L'ÉVITER. On a beau prouver
       qu'il existe toujours un passage de 7,7 unités pour une luge de 2,7 —
       et c'est prouvé, sur toutes les vagues et toute leur oscillation — cela
       ne dit rien de la capacité d'un joueur DONNÉ à le trouver. Une garantie
       géométrique n'est pas une garantie de progression.

       On dégage donc de plus en plus de piste à chaque tentative ratée d'affilée
       sur la même porte : au bout de trois ou quatre échecs, plusieurs vagues
       sautent et le passage s'ouvre pour de bon. Le compteur se remet à zéro dès
       qu'on gagne une porte.

       Trois raisons d'aimer ce dispositif plutôt qu'un simple adoucissement
       général :
         * il ne coûte RIEN au joueur qui passe — il ne le rencontre jamais ;
         * il s'adresse exactement à celui qui souffre, et à personne d'autre ;
         * il rend la boucle infinie IMPOSSIBLE PAR CONSTRUCTION, au lieu de la
           rendre improbable par réglage. C'est la seule forme de garantie qui
           tienne pour un défaut dont la conséquence est « le jeu est fini ».
       Le chrono, lui, a déjà tout encaissé : l'aide est réelle, elle n'est pas
       gratuite. */
    const t = Math.min(3, Math.max(0, (tries | 0) - 1));
    const from = s + CFG.CP_CLEAR * (1 + t);
    let ws = 240, w = 0;
    const total = waveCount();
    while (w < total) {
      const st = Math.min(5, Math.floor(ws / CFG.STAGE_LEN));
      if (ws >= from) break;
      ws += CFG.CRITTER_SPACING[st];
      w++;
    }
    this.nextWave = w;
    this.nextGarland = Math.max(0, Math.floor((s - 120) / (CFG.CANDY_SPACING * CFG.CANDY_RUN)));
  };

  Field.prototype.update = function (dt, now, sled) {
    const t = now / 1000;

    /* ══════════════════════════════════════════════════════════════════════
       ⚠️⚠️ LE RECUL SE DÉCLENCHE TOUT SEUL, ET C'EST UNE LEÇON D'ARCHITECTURE.
       ══════════════════════════════════════════════════════════════════════
       Première écriture : `rewind()` était appelé depuis game.js, dans le
       rappel `onRespawn`. C'était propre, lisible, et FAUX — parce que game.js
       n'existe que dans le navigateur. Les deux outils de `tools/`, eux,
       montent la luge et les gourmands SANS game.js : ils ne branchaient donc
       aucun rappel, le nettoyage des vagues n'avait jamais lieu chez eux, et
       tout le mécanisme de zone dégagée (CP_CLEAR) était mesuré... en étant
       désactivé. On a passé trois essais à faire varier un nombre qui n'était
       lu nulle part, en obtenant trois fois exactement le même résultat.

       ⚠️ LA RÈGLE : UNE INVARIANTE DE JEU NE DOIT PAS DÉPENDRE DE QUI APPELLE.
       Si une règle n'est vraie que parce qu'un module extérieur a pensé à
       brancher un rappel, alors elle est fausse partout où l'on oublie — et le
       banc d'essai, qui est justement là pour trouver ces oublis, est le
       premier à oublier. Le module qui POSSÈDE la règle doit la faire
       respecter lui-même.

       On détecte donc le retour en arrière ici, où l'on a la luge sous la main.
       Le seuil de 5 unités est large : la luge n'avance jamais à reculons, un
       recul ne peut venir que d'une remise en place. */
    if (this.lastS !== undefined && sled.s < this.lastS - 5) this.rewind(sled.s, sled.cpTries);
    this.lastS = sled.s;

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
      /* ⚠️ `grace` : l'invulnérabilité qui suit une reprise. Voir CP_GRACE_MS.
         Elle est le second garde-fou contre la boucle infinie de checkpoint —
         celui qui protège même si un placement de vague échappait au premier. */
      if (!c.alive || !sled.alive || sled.wipe > 0 || sled.reset > 0 || sled.grace > 0) continue;
      const ds = Math.abs(c.s - sled.s), du = Math.abs(c.u - sled.u);
      if (ds < CFG.CRITTER_RADIUS + 1.2 && du < CFG.CRITTER_RADIUS + CFG.SLED_HALF_W) {
        /* ⚠️ LE SAUT NE REND PAS INVULNÉRABLE, il fait PASSER PAR-DESSUS. La
           nuance est tout l'équilibre de la touche haut : une fenêtre de vol à
           viser, et non un bouton qui annule les obstacles. */
        if (sled.air > CFG.SLED_JUMP_CLEAR) continue;
        sled.bail("crash");
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
