/* =============================================================================
   player.js — Déplacement, saut, glissade, virages, collisions.
   -----------------------------------------------------------------------------
   Le joueur n'a que 5 nombres d'état réels : le tronçon courant, l'avancée t
   dessus, le décalage latéral, la hauteur et la vitesse verticale. Tout le
   reste est du minutage.

   TROIS POINTS QUI FONT LA JUSTESSE DES COMMANDES :

   * Gauche/droite servent À LA FOIS au changement de voie et au virage, comme
     dans Temple Run. La règle de départage est la distance au virage : dans les
     TURN_INPUT_WINDOW dernières unités d'un tronçon qui tourne, la touche
     correspondant au virage ARME le virage au lieu de changer de voie.
   * Un virage raté ne tue pas instantanément. On glisse au-delà du coin pendant
     TURN_GRACE_AFTER unités, et une entrée tardive sauve encore la mise. Sans
     cette tolérance, la mort arrive systématiquement une frame avant l'appui.
   * Percuter un obstacle ne tue pas : on TRÉBUCHE. La sanction est la perte de
     vitesse, donc du terrain cédé aux loups. Ce sont les loups qui tuent, pas
     la barrière — c'est ce qui rend l'échec progressif au lieu d'être sec.
   ========================================================================== */

const LATERAL_HIT = CFG.LANE_WIDTH / 2 + CFG.PLAYER_RADIUS; // demi-largeur de contact

class Player {
  constructor(track) {
    this.track = track;
    this.nodeIndex = track.nodes[0].index;
    this.t = 0;
    this.prevT = 0;
    this.lane = 1;
    this.laneOffset = 0;
    this.y = 0;
    this.vy = 0;
    this.grounded = true;
    this.lastGroundedAt = performance.now();

    this.slideUntil = 0;
    this.slideStart = 0;    // instant de départ de la glissade en cours (anim. entrée/sortie)
    this.stumbleUntil = 0;
    this.stumbleRecoverUntil = 0;

    this.speed = CFG.SPEED_START;
    this.totalDist = 0;
    this.coins = 0;

    this.armedTurn = 0;     // -1 / +1 quand le joueur a demandé le virage
    this.overshoot = -1;    // >= 0 quand on a dépassé le coin sans avoir tourné

    this.alive = true;
    this.deathCause = null;

    this.onStumble = null;  // callbacks posés par Game
    this.onCoin = null;
    this.onDeath = null;
    this.onLand = null;
  }

  node() { return this.track.get(this.nodeIndex); }

  /* Vitesse effective : vitesse de base, réduite pendant un trébuchement puis
     remontée progressivement (pas d'un coup, sinon la reprise est brutale). */
  currentSpeed(now) {
    const base = CFG.SPEED_START + CFG.SPEED_RANGE * Math.min(1, this.totalDist / CFG.SPEED_RAMP_DIST);
    if (now < this.stumbleUntil) return base * CFG.STUMBLE_SPEED_MULT;
    if (now < this.stumbleRecoverUntil) {
      const k = 1 - (this.stumbleRecoverUntil - now) / CFG.STUMBLE_RECOVER_MS;
      return base * (CFG.STUMBLE_SPEED_MULT + (1 - CFG.STUMBLE_SPEED_MULT) * k);
    }
    return base;
  }

  isSliding(now) { return now < this.slideUntil; }
  headHeight(now) { return this.y + (this.isSliding(now) ? CFG.SLIDE_HEIGHT : CFG.PLAYER_HEIGHT); }

  /* ------------------------------------------------- ENVELOPPE DE GLISSADE
     Renvoie l'état complet de la glissade, que world.js n'a plus qu'à poser
     sur le squelette. Trois nombres, et c'est là que se joue la fluidité :

       k     0 -> 1 -> 0. C'est le « degré de glissade ». Volontairement
             ASYMÉTRIQUE : plongeon en SLIDE_IN_MS (court, courbe agressive),
             maintien, relevé en SLIDE_OUT_MS (plus long, courbe molle). Le
             va-et-vient symétrique de l'ancienne version est exactement ce
             qui donnait l'impression d'une interpolation plutôt que d'un
             geste.
       pop   petit rebond vertical au tout début du relevé : le fermier
             REPOUSSE le sol pour se remettre debout au lieu de remonter en
             ligne droite. Une bosse, pas une rampe.
       age   temps écoulé depuis le départ, pour la traînée de poussière.

     Rien ici ne touche la collision : le gabarit de glissade reste piloté par
     isSliding()/SLIDE_HEIGHT, inchangés. Une pose ne doit jamais pouvoir
     changer ce qui tue. */
  slidePose(now) {
    if (!this.isSliding(now)) return { k: 0, pop: 0, age: 0 };

    const age = now - this.slideStart;
    const left = this.slideUntil - now;

    // Plongeon : cubique out — presque tout le mouvement dans les 40 premiers
    // pour-cent du temps, comme un corps qui tombe.
    const dive = Math.min(1, age / CFG.SLIDE_IN_MS);
    const kIn = 1 - Math.pow(1 - dive, 3);

    // Relevé : sinusoïde d'accélération — lent au départ (il faut décoller le
    // dos du sol), rapide à la fin.
    const rise = Math.min(1, left / CFG.SLIDE_OUT_MS);
    const kOut = 1 - Math.cos(rise * Math.PI / 2);

    const k = Math.min(kIn, kOut);

    // Le rebond ne vit que pendant le relevé, et culmine à sa moitié.
    const pop = rise < 1 ? Math.sin(rise * Math.PI) * (1 - rise) * 2 : 0;

    return { k, pop, age };
  }

  /* ------------------------------------------------------------- ENTRÉES */
  handleInput(now) {
    const node = this.node();
    if (!node) return;
    const nearTurn = node.turn !== 0 && this.t >= node.length - CFG.TURN_INPUT_WINDOW;

    if (Input.consume("left")) {
      if (nearTurn && node.turn === -1) this.armedTurn = -1;
      else this.lane = Math.max(0, this.lane - 1);
    }
    if (Input.consume("right")) {
      if (nearTurn && node.turn === 1) this.armedTurn = 1;
      else this.lane = Math.min(CFG.LANE_COUNT - 1, this.lane + 1);
    }
    if (Input.consume("jump")) {
      const coyoteOk = this.grounded || (now - this.lastGroundedAt < CFG.COYOTE_MS);
      if (coyoteOk && this.y < 0.05) {
        this.vy = CFG.JUMP_VELOCITY;
        this.grounded = false;
        this.slideUntil = 0;          // sauter annule la glissade
      }
    }
    if (Input.consume("slide")) {
      this.slideStart = now;
      this.slideUntil = now + CFG.SLIDE_MS;
      if (!this.grounded && this.vy > 0) this.vy = -CFG.JUMP_VELOCITY * 0.55; // plaquage au sol
    }
  }

  /* -------------------------------------------------------------- UPDATE */
  update(dt, now) {
    if (!this.alive) return;

    this.handleInput(now);

    this.speed = this.currentSpeed(now);
    this.prevT = this.t;
    const step = this.speed * dt;
    this.t += step;
    this.totalDist += step;

    /* --- Vertical --- */
    if (!this.grounded || this.vy !== 0) {
      this.vy -= CFG.GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        const hard = this.vy < -12;
        this.y = 0; this.vy = 0;
        if (!this.grounded && this.onLand) this.onLand(hard);
        this.grounded = true;
      } else {
        this.grounded = false;
      }
    }
    if (this.grounded) this.lastGroundedAt = now;

    /* --- Latéral --- */
    const target = CFG.LANE_X[this.lane];
    const d = target - this.laneOffset;
    const maxStep = CFG.LANE_CHANGE_SPEED * dt;
    this.laneOffset += Math.abs(d) <= maxStep ? d : Math.sign(d) * maxStep;

    /* --- Collisions et ramassage sur le tronçon courant --- */
    this.checkNode(now);
    if (!this.alive) return;

    /* --- Fin de tronçon / virage --- */
    this.advanceNode(now);
  }

  checkNode(now) {
    const node = this.node();
    if (!node) return;

    for (const o of node.obstacles) {
      if (o.type === OBST.GAP) {
        // Trou : la mort n'arrive que si on est AU SOL au-dessus du vide.
        const half = CFG.GAP_LENGTH / 2;
        if (this.t > o.t - half && this.t < o.t + half && this.y <= 0.05) {
          return this.die("gap");
        }
        continue;
      }
      if (o.type === OBST.CREVASSE) {
        /* Sol effondré partiel. Deux différences avec le trou pleine largeur :
           il ne concerne que certaines voies, et le test latéral porte sur le
           CENTRE du joueur, pas sur son gabarit. Utiliser LATERAL_HIT comme
           pour un mur ferait tomber un joueur dont seule l'épaule dépasse
           au-dessus du vide — injuste et illisible, puisque le bord de la
           crevasse est justement l'endroit où l'on frôle. */
        const half = CFG.CREVASSE_LENGTH / 2;
        if (!(this.t > o.t - half && this.t < o.t + half) || this.y > 0.05) continue;
        for (let i = 0; i < CFG.LANE_COUNT; i++) {
          if (!o.lanes[i]) continue;
          if (Math.abs(this.laneOffset - CFG.LANE_X[i]) < CFG.LANE_WIDTH / 2) return this.die("gap");
        }
        continue;
      }
      if (o.hitBy === this) continue;                    // déjà encaissé
      const half = 0.9;
      if (!(this.prevT < o.t + half && this.t > o.t - half)) continue;

      // Est-on latéralement dans une voie bloquée ?
      let inBlocked = false;
      for (let i = 0; i < CFG.LANE_COUNT; i++) {
        if (!o.lanes[i]) continue;
        if (Math.abs(this.laneOffset - CFG.LANE_X[i]) < LATERAL_HIT) { inBlocked = true; break; }
      }
      if (!inBlocked) continue;

      if (o.type === OBST.LOW && this.y >= CFG.JUMP_CLEAR_HEIGHT) continue;      // sauté
      if (o.type === OBST.HIGH && this.headHeight(now) <= CFG.HIGH_CLEARANCE) continue; // glissé

      o.hitBy = this;
      this.stumble(now);
    }

    for (const c of node.coins) {
      if (c.taken) continue;
      if (Math.abs(c.t - this.t) > CFG.COIN_PICKUP_RADIUS) continue;
      if (Math.abs(CFG.LANE_X[c.lane] - this.laneOffset) > CFG.LANE_WIDTH * 0.6) continue;
      if (Math.abs(c.y - (this.y + 0.8)) > 1.5) continue;
      c.taken = true;
      this.coins++;
      if (this.onCoin) this.onCoin(c, node);
    }
  }

  advanceNode(now) {
    const node = this.node();
    if (!node) return;
    if (this.t < node.length) { this.overshoot = -1; return; }

    if (node.turn === 0) {
      this.enterNext(node, this.t - node.length, 0);
      return;
    }

    /* Le tronçon tourne. Soit le joueur a armé le bon virage, soit il dispose
       encore de TURN_GRACE_AFTER unités pour le faire. */
    if (this.armedTurn === node.turn) {
      this.enterNext(node, this.t - node.length, node.turn);
      return;
    }
    if (Input.peek(node.turn === -1 ? "left" : "right")) {
      Input.consume(node.turn === -1 ? "left" : "right");
      this.enterNext(node, this.t - node.length, node.turn);
      return;
    }
    if (this.overshoot < 0) this.overshoot = 0;
    this.overshoot = this.t - node.length;
    if (this.overshoot > CFG.TURN_GRACE_AFTER) this.die("fall");
  }

  enterNext(node, leftover, turn) {
    const next = this.track.get(node.index + 1);
    if (!next) return;
    this.nodeIndex = next.index;
    this.t = Math.max(0, leftover);
    this.prevT = 0;
    this.overshoot = -1;
    this.armedTurn = 0;
    // Dans un virage, on conserve la voie : sortir systématiquement au centre
    // donnerait un effet "téléport" et casserait la lisibilité.
    if (turn !== 0) this.laneOffset = CFG.LANE_X[this.lane];
    // NB : on n'appelle PAS track.ensureAhead() ici. C'est Game qui le fait,
    // parce que lui seul peut aussi libérer la géométrie des tronçons retirés.
    // L'appeler des deux côtés ferait fuiter des meshes à chaque virage.
  }

  stumble(now) {
    this.stumbleUntil = now + CFG.STUMBLE_MS;
    this.stumbleRecoverUntil = this.stumbleUntil + CFG.STUMBLE_RECOVER_MS;
    if (this.onStumble) this.onStumble();
  }

  die(cause) {
    if (!this.alive) return;
    this.alive = false;
    this.deathCause = cause;
    if (this.onDeath) this.onDeath(cause);
  }

  worldPos() {
    const n = this.node();
    return this.track.worldPos(n, this.t, this.laneOffset, this.y);
  }
}
