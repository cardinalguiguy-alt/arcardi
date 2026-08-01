/* =============================================================================
   physics.js — Simulation du bonbon (zip 385).
   -----------------------------------------------------------------------------
   AUCUN accès au DOM, au canvas ou à l'horloge dans ce fichier. C'est délibéré
   et c'est la règle qui rend `tools/verify-levels.js` possible : le solveur
   charge CE fichier tel quel dans un contexte `vm` sans navigateur, rejoue les
   quinze niveaux avec la VRAIE physique et affirme qu'ils sont résolubles.
   Un `performance.now()` glissé ici, et la garantie tombe.

   (C'est la même règle que le corollaire du zip 378 côté ferme : un morceau qui
   ne touche à aucun état de rendu sort de la closure pour pouvoir être regardé
   hors navigateur. Ici c'est l'inverse du rendu, même bénéfice.)

   MODÈLE
     Le bonbon est UN point de Verlet (position + position précédente ; la
     vitesse est implicite). Les cordes sont des contraintes de DISTANCE
     MAXIMALE, pas des ressorts : tant que le bonbon est à moins de `len` de
     son ancre, la corde ne fait rien du tout. C'est ce qui donne le geste de
     Cut the Rope — le bonbon tombe librement, puis la corde le cueille.

     Un pas de temps FIXE (CFG.SUB_DT), jamais le temps réel écoulé. Avec un
     pas variable, une image sautée changerait la trajectoire et deux parties
     identiques donneraient deux résultats différents ; la vérification hors
     navigateur ne vaudrait plus rien.
   ========================================================================== */

const Phys = (function () {

  /* Position d'une ancre à l'instant t. Trois familles, et le niveau choisit :
       - fixe      : rien d'autre que x, y ;
       - `move`    : va-et-vient sinusoïdal le long d'un vecteur (ax, ay) ;
       - `spin`    : révolution autour d'un centre.
     Toutes DÉRIVÉES DE t, jamais intégrées : une ancre ne dérive donc pas au
     fil d'une longue partie, et l'état du niveau reste entièrement décrit par
     le seul t (ce dont le solveur a besoin pour rejouer un scénario). */
  function anchorAt(r, t) {
    if (r.spin) {
      const a = r.spin.phase + t * r.spin.speed;
      return { x: r.spin.cx + Math.cos(a) * r.spin.r, y: r.spin.cy + Math.sin(a) * r.spin.r };
    }
    if (r.move) {
      const s = Math.sin(r.move.phase + t * r.move.speed);
      return { x: r.x + r.move.ax * s, y: r.y + r.move.ay * s };
    }
    return { x: r.x, y: r.y };
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ------------------------------------------------------- état de départ */
  function makeState(level) {
    const L = clone(level);
    const st = {
      t: 0,
      level: L,
      candy: { x: L.candy.x, y: L.candy.y, px: L.candy.x, py: L.candy.y },
      ropes: (L.ropes || []).map(r => Object.assign({}, r, { cut: false, ax: r.x, ay: r.y })),
      stars: (L.stars || []).map(s => ({ x: s.x, y: s.y, got: false })),
      spikes: L.spikes || [],
      bumpers: L.bumpers || [],
      bubbles: (L.bubbles || []).map(b => ({ x: b.x, y: b.y, r: b.r, lift: b.lift, popped: false, held: false })),
      fans: L.fans || [],
      mouth: L.mouth,
      inBubble: -1,
      acted: false,      // le joueur a-t-il DÉJÀ agi (coupé ou crevé) ?
      status: "run",     // "run" | "won" | "lost"
      reason: null,      // "fell" | "spike" | "rest"
      restMs: 0,
      cuts: 0,           // cordes tranchées (statistique, et utile au solveur)
      trail: [],         // dernières positions, pour la traînée au rendu
    };
    for (const r of st.ropes) { const a = anchorAt(r, 0); r.ax = a.x; r.ay = a.y; }
    return st;
  }

  /* --------------------------------------------------------- intersection --
     Segment/segment classique. Sert à trancher une corde : on teste le geste
     du joueur (segment entre deux positions successives du pointeur) contre
     chaque corde ENTIÈRE (ancre -> bonbon), pas contre les segments dessinés.
     Tester le tracé dessiné donnerait des ratés incompréhensibles quand la
     corde est molle et ondule. */
  function segHit(ax, ay, bx, by, cx, cy, dx, dy) {
    const d1x = bx - ax, d1y = by - ay, d2x = dx - cx, d2y = dy - cy;
    const den = d1x * d2y - d1y * d2x;
    if (Math.abs(den) < 1e-9) return false;
    const u = ((cx - ax) * d2y - (cy - ay) * d2x) / den;
    const v = ((cx - ax) * d1y - (cy - ay) * d1x) / den;
    return u >= 0 && u <= 1 && v >= 0 && v <= 1;
  }

  /* Geste de coupe. Renvoie le nombre de cordes tranchées : le jeu s'en sert
     pour ne jouer le son/l'étincelle que si quelque chose a vraiment été
     coupé. Un geste peut trancher DEUX cordes d'un coup, et c'est voulu —
     plusieurs niveaux ne se résolvent qu'ainsi. */
  function cut(st, x0, y0, x1, y1) {
    if (st.status !== "run") return 0;
    const dx = x1 - x0, dy = y1 - y0;
    if (dx * dx + dy * dy < CFG.CUT_MIN_DIST * CFG.CUT_MIN_DIST) return 0;
    let n = 0;
    for (const r of st.ropes) {
      if (r.cut) continue;
      if (segHit(x0, y0, x1, y1, r.ax, r.ay, st.candy.x, st.candy.y)) { r.cut = true; n++; }
    }
    st.cuts += n;
    if (n > 0) st.acted = true;
    return n;
  }

  /* Crever une bulle. On accepte un clic un peu large (CFG.POP_R) : viser un
     disque translucide qui monte est déjà assez difficile comme ça. */
  function pop(st, x, y) {
    if (st.status !== "run") return false;
    for (let i = 0; i < st.bubbles.length; i++) {
      const b = st.bubbles[i];
      if (b.popped) continue;
      const d = Math.hypot(x - b.x, y - b.y);
      if (d <= b.r + CFG.POP_R) {
        b.popped = true;
        st.acted = true;
        if (st.inBubble === i) st.inBubble = -1;
        return true;
      }
    }
    return false;
  }

  /* ------------------------------------------------------------- un pas --- */
  function substep(st) {
    const dt = CFG.SUB_DT, c = st.candy;
    st.t += dt;

    for (const r of st.ropes) { const a = anchorAt(r, st.t); r.ax = a.x; r.ay = a.y; }

    /* La bulle attrape le bonbon au contact, puis le PORTE : son centre suit
       le bonbon tant qu'elle n'a pas éclaté. Une bulle qui resterait sur place
       obligerait à la crever à l'instant précis du passage, ce qui n'est pas le
       jeu qu'on veut. */
    if (st.inBubble < 0) {
      for (let i = 0; i < st.bubbles.length; i++) {
        const b = st.bubbles[i];
        if (b.popped || b.held) continue;
        if (Math.hypot(c.x - b.x, c.y - b.y) <= b.r) { st.inBubble = i; b.held = true; break; }
      }
    }

    let ax = 0, ay = CFG.GRAVITY;
    if (st.inBubble >= 0) {
      // `lift` (défaut 1) : la poussée d'une bulle est un réglage DE NIVEAU,
      // pour la même raison que `power` sur les souffleurs. Une bulle unique
      // et très vive convient au niveau 8 (montée verticale, courte) et rend
      // le relais du niveau 13 impossible : le bonbon sort par le haut avant
      // d'avoir dérivé assez loin.
      const b0 = st.bubbles[st.inBubble];
      ay = CFG.BUBBLE_LIFT * (b0.lift === undefined ? 1 : b0.lift);
    }

    for (const f of st.fans) {
      if (c.x >= f.x && c.x <= f.x + f.w && c.y >= f.y && c.y <= f.y + f.h) {
        // `power` (défaut 1) : la force du souffleur est un réglage DE NIVEAU,
        // pas une constante globale. Découvert en vérifiant le niveau 9 —
        // une seule valeur pour tous rendait la moitié des niveaux à bulle
        // soit inertes, soit incontrôlables (le bonbon sortait par la droite).
        const pw = f.power === undefined ? 1 : f.power;
        ax += (f.dx || 0) * CFG.FAN_POWER * pw;
        ay += (f.dy || 0) * CFG.FAN_POWER * pw;
      }
    }

    // Verlet. L'amortissement porte sur la VITESSE (donc sur l'écart entre
    // les deux positions), pas sur la position : l'appliquer à la position
    // ferait dériver le bonbon vers l'origine du repère.
    const damp = st.inBubble >= 0 ? CFG.BUBBLE_DAMP : CFG.DAMPING;
    const vx = (c.x - c.px) * damp, vy = (c.y - c.py) * damp;
    c.px = c.x; c.py = c.y;
    c.x += vx + ax * dt * dt;
    c.y += vy + ay * dt * dt;

    // Cordes : contrainte de distance MAXIMALE, résolue par passes.
    for (let k = 0; k < CFG.CONSTRAINT_ITER; k++) {
      for (const r of st.ropes) {
        if (r.cut) continue;
        const dx = c.x - r.ax, dy = c.y - r.ay;
        const d = Math.hypot(dx, dy), max = r.len * CFG.ROPE_SLACK;
        if (d > max && d > 1e-6) {
          const k2 = (d - max) / d;
          c.x -= dx * k2; c.y -= dy * k2;
        }
      }
    }

    if (st.inBubble >= 0) { const b = st.bubbles[st.inBubble]; b.x = c.x; b.y = c.y; }

    // Coussins de guimauve : on ressort le bonbon puis on réfléchit sa vitesse
    // en réécrivant la position PRÉCÉDENTE — c'est la seule façon de changer
    // une vitesse en Verlet.
    for (const bp of st.bumpers) {
      const dx = c.x - bp.x, dy = c.y - bp.y;
      const d = Math.hypot(dx, dy), min = bp.r + CFG.CANDY_R;
      if (d < min && d > 1e-6) {
        const nx = dx / d, ny = dy / d;
        c.x = bp.x + nx * min; c.y = bp.y + ny * min;
        let sx = c.x - c.px, sy = c.y - c.py;
        const dot = sx * nx + sy * ny;
        sx = (sx - 2 * dot * nx) * CFG.BUMPER_RESTITUTION;
        sy = (sy - 2 * dot * ny) * CFG.BUMPER_RESTITUTION;
        c.px = c.x - sx; c.py = c.y - sy;
      }
    }

    for (const s of st.stars) {
      if (!s.got && Math.hypot(c.x - s.x, c.y - s.y) < CFG.CANDY_R + 10) s.got = true;
    }

    for (const sp of st.spikes) {
      if (Math.hypot(c.x - sp.x, c.y - sp.y) < sp.r + CFG.CANDY_R * 0.72) {
        st.status = "lost"; st.reason = "spike"; return;
      }
    }

    if (Math.hypot(c.x - st.mouth.x, c.y - st.mouth.y) < st.mouth.r * CFG.MOUTH_FORGIVE) {
      st.status = "won"; return;
    }

    /* Hors-jeu. Le HAUT compte aussi : un bonbon emporté par une bulle qu'on
       n'a pas crevée s'en va pour de bon, exactement comme s'il tombait. Sans
       cette borne il monterait indéfiniment et le niveau ne finirait jamais. */
    if (c.y > CFG.H + CFG.OUT_MARGIN_Y || c.y < -CFG.OUT_MARGIN_Y
      || c.x < -CFG.OUT_MARGIN_X || c.x > CFG.W + CFG.OUT_MARGIN_X) {
      st.status = "lost"; st.reason = "fell"; return;
    }

    // Immobilité : un bonbon posé sur un coussin, ou pendu au bout d'une corde
    // qu'on a oublié de couper, doit conclure le niveau. Sans ça le joueur
    // reste devant un écran figé sans savoir s'il a perdu.
    /* ...mais SEULEMENT après la première action du joueur. Au départ le
       bonbon pend, immobile et parfaitement légitime : sans cette garde, tout
       niveau se perdrait tout seul 1,4 s après son ouverture. */
    const sp2 = Math.hypot(c.x - c.px, c.y - c.py) / dt;
    if (st.acted && sp2 < CFG.REST_SPEED) {
      st.restMs += dt * 1000;
      if (st.restMs > CFG.REST_MS) { st.status = "lost"; st.reason = "rest"; }
    } else st.restMs = 0;
  }

  /* Avance de `ms` millisecondes réelles, en pas fixes. Le reliquat est
     conservé dans st.acc pour ne pas perdre de temps entre deux images. */
  function step(st, ms) {
    if (st.status !== "run") return;
    st.acc = (st.acc || 0) + ms / 1000;
    let n = 0;
    while (st.acc >= CFG.SUB_DT && st.status === "run" && n < CFG.MAX_SUB) {
      st.acc -= CFG.SUB_DT; substep(st); n++;
    }
    // Anti-spirale : si on est très en retard (onglet en arrière-plan), on
    // jette le retard au lieu de simuler mille pas d'un coup.
    if (st.acc > CFG.SUB_DT * CFG.MAX_SUB) st.acc = 0;
    const c = st.candy;
    st.trail.push({ x: c.x, y: c.y });
    if (st.trail.length > 14) st.trail.shift();
  }

  function starsGot(st) { let n = 0; for (const s of st.stars) if (s.got) n++; return n; }

  return { makeState, step, cut, pop, anchorAt, starsGot };
})();

// Chargement hors navigateur (tools/verify-levels.js) : `module` n'existe pas
// dans la page, on ne touche donc à rien quand il est absent.
if (typeof module !== "undefined" && module.exports) module.exports = Phys;
