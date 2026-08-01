/* =============================================================================
   physics.js — Simulation du bonbon (zip 385, refondu au zip 387).
   -----------------------------------------------------------------------------
   AUCUN accès au DOM, au canvas ou à l'horloge. C'est la règle qui rend
   tools/verify-levels.js possible : le solveur charge CE fichier tel quel dans
   un contexte `vm` sans navigateur et rejoue les niveaux avec la VRAIE
   physique. Un `performance.now()` glissé ici, et la garantie tombe.

   ⚠️ LA CORRECTION CENTRALE DU ZIP 387 — LA CORDE QU'ON VOIT EST ENFIN LA
   CORDE QU'ON COUPE.

   Jusqu'ici, `render.js` dessinait la corde AVEC SA FLÈCHE (le ventre d'une
   corde molle, indispensable pour lire qu'elle ne retient rien) tandis que
   `cut` testait le geste contre une DROITE tendue de l'ancre au bonbon. Les
   deux formes divergeaient au maximum en leur milieu — c'est-à-dire très
   exactement là où un joueur vise. On tranchait visiblement la corde et il ne
   se passait rien.

   Il n'y a donc plus qu'UNE seule description de la corde, `ropePolyline`,
   appelée par le rendu ET par la coupe. Elles ne peuvent plus diverger : ce
   n'est pas un correctif de valeur, c'est la suppression de la source. Toute
   modification future du tracé profite automatiquement à la détection.

   MODÈLE
     Le bonbon est UN point de Verlet. Les cordes sont des contraintes de
     DISTANCE MAXIMALE, pas des ressorts : tant que le bonbon est à moins de
     `len` de son ancre, la corde ne fait rien du tout.

     Un pas de temps FIXE (CFG.SUB_DT), jamais le temps réel écoulé.
   ========================================================================== */

const Phys = (function () {

  /* ------------------------------------------------------------- ancres --- */
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

  function cross(ax, ay, bx, by) { return ax * by - ay * bx; }

  /* ------------------------------------------------------- ÉPINGLES -------
     Zip 387. Une épingle est un point autour duquel la corde S'ENROULE. Le
     modèle est une PILE d'enroulements par corde : l'ancre effective est le
     dernier point enroulé, et la longueur restante est la longueur d'origine
     moins tout ce qui est déjà consommé par les tours.

     Enroulement : l'épingle est happée quand le brin courant passe à moins de
     `r` d'elle. On mémorise alors DE QUEL CÔTÉ le bonbon se trouve (signe du
     produit vectoriel).
     Déroulement : quand ce signe s'inverse, le bonbon est repassé de l'autre
     côté, la corde se dévide et on dépile.

     C'est la formulation classique, et surtout c'est la seule qui reste
     déterministe : rien n'y dépend du pas de temps ni de l'ordre des cordes. */
  function chainOf(st, r) {
    const pts = [{ x: r.ax, y: r.ay }];
    for (const w of r.wraps) pts.push({ x: st.pins[w.pin].x, y: st.pins[w.pin].y });
    return pts;
  }

  function chainLen(pts) {
    let d = 0;
    for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    return d;
  }

  function effAnchor(st, r) {
    if (!r.wraps.length) return { x: r.ax, y: r.ay };
    const p = st.pins[r.wraps[r.wraps.length - 1].pin];
    return { x: p.x, y: p.y };
  }

  function effLen(st, r) {
    return Math.max(6, r.len - chainLen(chainOf(st, r)));
  }

  // Distance d'un point à un segment. Sert à happer les épingles.
  function distToSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const L = dx * dx + dy * dy;
    let t = L > 1e-9 ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  }

  function updateWraps(st, r, c) {
    // Déroulement d'abord : sinon on pourrait ré-enrouler la même épingle
    // dans le même pas et bloquer la corde définitivement.
    while (r.wraps.length) {
      const w = r.wraps[r.wraps.length - 1];
      const p = st.pins[w.pin];
      const prev = r.wraps.length > 1
        ? st.pins[r.wraps[r.wraps.length - 2].pin]
        : { x: r.ax, y: r.ay };
      const s = cross(p.x - prev.x, p.y - prev.y, c.x - p.x, c.y - p.y);
      if (s === 0 || Math.sign(s) === w.side) break;
      r.wraps.pop();
    }
    const a = effAnchor(st, r);
    for (let i = 0; i < st.pins.length; i++) {
      if (r.wraps.length && r.wraps[r.wraps.length - 1].pin === i) continue;
      const p = st.pins[i];
      if (distToSeg(p.x, p.y, a.x, a.y, c.x, c.y) > p.r) continue;
      // Pas d'enroulement si l'épingle est au bout du brin (sur le bonbon ou
      // sur l'ancre) : la corde n'aurait rien à contourner.
      if (Math.hypot(p.x - c.x, p.y - c.y) < p.r * 0.8) continue;
      if (Math.hypot(p.x - a.x, p.y - a.y) < p.r * 0.8) continue;
      const s = cross(p.x - a.x, p.y - a.y, c.x - p.x, c.y - p.y);
      if (s === 0) continue;
      r.wraps.push({ pin: i, side: Math.sign(s) });
      break;
    }
  }

  /* ------------------------------------------------- LA CORDE, UNE FOIS ---
     LE tracé de la corde. Rendu et coupe l'appellent tous les deux — voir
     l'avertissement en tête de fichier. Renvoie une liste de points : l'ancre,
     les épingles enroulées, puis le brin final avec sa flèche. */
  function ropePolyline(st, r) {
    const c = st.candy;
    const pts = chainOf(st, r);
    const a = pts[pts.length - 1];
    const dx = c.x - a.x, dy = c.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const slack = Math.max(0, effLen(st, r) - d);
    const nx = -dy / d, ny = dx / d;
    const out = pts.slice(0, pts.length - 1);
    const N = CFG.ROPE_SEGMENTS;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      // Chaînette approchée par un arc : la flèche vaut ce qui reste de mou,
      // et pend vers le BAS (+y) plus qu'elle ne s'écarte latéralement.
      const bow = Math.sin(u * Math.PI) * slack * 0.5;
      out.push({
        x: a.x + dx * u + nx * bow * 0.15,
        y: a.y + dy * u + ny * bow * 0.15 + bow * 0.85,
      });
    }
    return out;
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ------------------------------------------------------- état de départ */
  function makeState(level) {
    const L = clone(level);
    const st = {
      t: 0,
      level: L,
      candy: { x: L.candy.x, y: L.candy.y, px: L.candy.x, py: L.candy.y },
      ropes: (L.ropes || []).map(r => Object.assign({}, r, {
        cut: false,
        // Zip 387 : une corde AUTOMATIQUE n'est pas accrochée au départ. Elle
        // happe le bonbon quand il passe à portée (`reach`), une seule fois —
        // une corde coupée ne rattrape plus rien, sinon aucun niveau ne se
        // terminerait jamais.
        attached: !r.auto,
        spent: false,
        wraps: [],
        ax: r.x, ay: r.y,
      })),
      pins: (L.pins || []).map(p => ({ x: p.x, y: p.y, r: p.r || 9 })),
      stars: (L.stars || []).map(s => ({ x: s.x, y: s.y, got: false })),
      spikes: L.spikes || [],
      bumpers: L.bumpers || [],
      bubbles: (L.bubbles || []).map(b => ({ x: b.x, y: b.y, r: b.r, lift: b.lift, popped: false, held: false })),
      fans: L.fans || [],
      // Zip 387 : araignées. Chacune descend LE LONG d'une corde, de l'ancre
      // vers le bonbon. Elle disparaît avec sa corde ; arrivée au bout, c'est
      // perdu. `t` va de 0 (ancre) à 1 (bonbon).
      spiders: (L.spiders || []).map(sp => ({ rope: sp.rope | 0, t: sp.start || 0, speed: sp.speed || 0.18, gone: false })),
      mouth: L.mouth,
      blow: !!L.blow,
      inBubble: -1,
      acted: false,
      status: "run",
      reason: null,      // "fell" | "spike" | "rest" | "spider"
      restMs: 0,
      cuts: 0,
      blows: 0,
      trail: [],
      fx: [],            // effets visuels (coupes, bouchée) — purgés dans step
    };
    for (const r of st.ropes) { const a = anchorAt(r, 0); r.ax = a.x; r.ay = a.y; }
    return st;
  }

  /* --------------------------------------------------------- intersection */
  function segHit(ax, ay, bx, by, cx, cy, dx, dy) {
    const d1x = bx - ax, d1y = by - ay, d2x = dx - cx, d2y = dy - cy;
    const den = d1x * d2y - d1y * d2x;
    if (Math.abs(den) < 1e-9) return false;
    const u = ((cx - ax) * d2y - (cy - ay) * d2x) / den;
    const v = ((cx - ax) * d1y - (cy - ay) * d1x) / den;
    return u >= 0 && u <= 1 && v >= 0 && v <= 1;
  }

  /* Geste de coupe. Testé contre le TRACÉ RÉEL de la corde, segment par
     segment (voir ropePolyline). Renvoie le nombre de cordes tranchées ; un
     seul geste peut en trancher plusieurs, et c'est voulu. */
  function cut(st, x0, y0, x1, y1) {
    if (st.status !== "run") return 0;
    const dx = x1 - x0, dy = y1 - y0;
    if (dx * dx + dy * dy < CFG.CUT_MIN_DIST * CFG.CUT_MIN_DIST) return 0;
    let n = 0;
    for (const r of st.ropes) {
      if (r.cut || !r.attached) continue;
      const pts = ropePolyline(st, r);
      for (let i = 1; i < pts.length; i++) {
        if (segHit(x0, y0, x1, y1, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y)) {
          r.cut = true; n++;
          st.fx.push({ kind: "cut", x: pts[i].x, y: pts[i].y, t: st.t });
          break;
        }
      }
    }
    if (n > 0) { st.cuts += n; st.acted = true; }
    return n;
  }

  /* Zip 387 — SOUFFLE. Un geste rapide qui ne coupe RIEN et qui passe près du
     bonbon le pousse dans le sens du geste.

     Il n'est actif que sur les niveaux qui le déclarent (`blow: true`). C'est
     une décision de confort, pas de moteur : sur un niveau qui ne l'attend
     pas, un geste de coupe manqué enverrait le bonbon promener, et le joueur
     n'aurait aucun moyen de comprendre ce qui vient de se passer. */
  function blow(st, x0, y0, x1, y1) {
    if (st.status !== "run" || !st.blow) return false;
    const c = st.candy;
    const dx = x1 - x0, dy = y1 - y0;
    const d = Math.hypot(dx, dy);
    if (d < CFG.BLOW_MIN_SWIPE) return false;
    if (distToSeg(c.x, c.y, x0, y0, x1, y1) > CFG.BLOW_R) return false;
    const k = Math.min(CFG.BLOW_MAX, d) * CFG.BLOW_GAIN;
    // En Verlet, on change une vitesse en déplaçant la position PRÉCÉDENTE.
    c.px -= (dx / d) * k;
    c.py -= (dy / d) * k;
    st.blows++; st.acted = true;
    st.fx.push({ kind: "blow", x: c.x, y: c.y, dx: dx / d, dy: dy / d, t: st.t });
    return true;
  }

  function pop(st, x, y) {
    if (st.status !== "run") return false;
    for (let i = 0; i < st.bubbles.length; i++) {
      const b = st.bubbles[i];
      if (b.popped) continue;
      if (Math.hypot(x - b.x, y - b.y) <= b.r + CFG.POP_R) {
        b.popped = true; st.acted = true;
        if (st.inBubble === i) st.inBubble = -1;
        st.fx.push({ kind: "pop", x: b.x, y: b.y, t: st.t });
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

    // Cordes automatiques : elles happent le bonbon au passage.
    for (const r of st.ropes) {
      if (r.cut || r.attached || r.spent) continue;
      const d = Math.hypot(c.x - r.ax, c.y - r.ay);
      if (d <= (r.reach || CFG.AUTO_REACH)) {
        r.attached = true; r.spent = true;
        r.len = Math.max(d, CFG.AUTO_MIN_LEN);
        st.fx.push({ kind: "grab", x: r.ax, y: r.ay, t: st.t });
      }
    }

    if (st.inBubble < 0) {
      for (let i = 0; i < st.bubbles.length; i++) {
        const b = st.bubbles[i];
        if (b.popped || b.held) continue;
        if (Math.hypot(c.x - b.x, c.y - b.y) <= b.r) { st.inBubble = i; b.held = true; break; }
      }
    }

    let ax = 0, ay = CFG.GRAVITY;
    if (st.inBubble >= 0) {
      const b0 = st.bubbles[st.inBubble];
      ay = CFG.BUBBLE_LIFT * (b0.lift === undefined ? 1 : b0.lift);
    }

    for (const f of st.fans) {
      if (c.x >= f.x && c.x <= f.x + f.w && c.y >= f.y && c.y <= f.y + f.h) {
        const pw = f.power === undefined ? 1 : f.power;
        ax += (f.dx || 0) * CFG.FAN_POWER * pw;
        ay += (f.dy || 0) * CFG.FAN_POWER * pw;
      }
    }

    const damp = st.inBubble >= 0 ? CFG.BUBBLE_DAMP : CFG.DAMPING;
    const vx = (c.x - c.px) * damp, vy = (c.y - c.py) * damp;
    c.px = c.x; c.py = c.y;
    c.x += vx + ax * dt * dt;
    c.y += vy + ay * dt * dt;

    // Enroulements, PUIS contraintes : une épingle happée doit agir dans le
    // même pas, sinon la corde traverse visiblement l'épingle d'une image.
    for (const r of st.ropes) {
      if (r.cut || !r.attached) continue;
      if (st.pins.length) updateWraps(st, r, c);
    }

    for (let k = 0; k < CFG.CONSTRAINT_ITER; k++) {
      for (const r of st.ropes) {
        if (r.cut || !r.attached) continue;
        const a = effAnchor(st, r), max = effLen(st, r);
        const dx = c.x - a.x, dy = c.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d > max && d > 1e-6) {
          const k2 = (d - max) / d;
          c.x -= dx * k2; c.y -= dy * k2;
        }
      }
    }

    if (st.inBubble >= 0) { const b = st.bubbles[st.inBubble]; b.x = c.x; b.y = c.y; }

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

    /* Araignées. Elles descendent le long de leur corde ; couper la corde les
       emporte. Arrivée au bout, c'est perdu. */
    for (const sp of st.spiders) {
      if (sp.gone) continue;
      const r = st.ropes[sp.rope];
      if (!r || r.cut || !r.attached) { sp.gone = true; continue; }
      sp.t += sp.speed * dt;
      if (sp.t >= 1) { st.status = "lost"; st.reason = "spider"; return; }
    }

    for (const s of st.stars) {
      if (!s.got && Math.hypot(c.x - s.x, c.y - s.y) < CFG.CANDY_R + 10) {
        s.got = true;
        st.fx.push({ kind: "star", x: s.x, y: s.y, t: st.t });
      }
    }

    for (const sp of st.spikes) {
      if (Math.hypot(c.x - sp.x, c.y - sp.y) < sp.r + CFG.CANDY_R * 0.72) {
        st.status = "lost"; st.reason = "spike"; return;
      }
    }

    if (Math.hypot(c.x - st.mouth.x, c.y - st.mouth.y) < st.mouth.r * CFG.MOUTH_FORGIVE) {
      st.status = "won"; return;
    }

    if (c.y > CFG.H + CFG.OUT_MARGIN_Y || c.y < -CFG.OUT_MARGIN_Y
      || c.x < -CFG.OUT_MARGIN_X || c.x > CFG.W + CFG.OUT_MARGIN_X) {
      st.status = "lost"; st.reason = "fell"; return;
    }

    const sp2 = Math.hypot(c.x - c.px, c.y - c.py) / dt;
    if (st.acted && sp2 < CFG.REST_SPEED) {
      st.restMs += dt * 1000;
      if (st.restMs > CFG.REST_MS) { st.status = "lost"; st.reason = "rest"; }
    } else st.restMs = 0;
  }

  function step(st, ms) {
    if (st.status !== "run") return;
    st.acc = (st.acc || 0) + ms / 1000;
    let n = 0;
    while (st.acc >= CFG.SUB_DT && st.status === "run" && n < CFG.MAX_SUB) {
      st.acc -= CFG.SUB_DT; substep(st); n++;
    }
    if (st.acc > CFG.SUB_DT * CFG.MAX_SUB) st.acc = 0;
    const c = st.candy;
    st.trail.push({ x: c.x, y: c.y });
    if (st.trail.length > 14) st.trail.shift();
    // Purge des effets ICI et pas dans le rendu : le solveur ne dessine rien,
    // il les accumulerait sur quatorze secondes de simulation.
    st.fx = st.fx.filter(e => st.t - e.t < 0.6);
  }

  function starsGot(st) { let n = 0; for (const s of st.stars) if (s.got) n++; return n; }

  return { makeState, step, cut, pop, blow, anchorAt, starsGot, ropePolyline, effAnchor, effLen };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Phys;
