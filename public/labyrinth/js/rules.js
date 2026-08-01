/* =============================================================================
   rules.js — TOUTE LA SIMULATION DU LABYRINTHE. Aucun Three.js, aucun DOM.
   -----------------------------------------------------------------------------
   ⚠️ C'EST LE FICHIER LE PLUS IMPORTANT DU CHANTIER, et son intérêt n'est pas
   ce qu'il contient mais ce qu'il ne contient PAS : il ne sait pas dessiner.

   POURQUOI CE DÉCOUPAGE N'EST PAS CELUI DU DÉFI DE FUITE. Dans templerun,
   player.js/wolves.js/track.js parlent chacun un peu à world.js, et les outils
   de vérification ont dû, chacun, se reconstruire un bout de jeu — d'où le
   corollaire n°5 du zip 387 : « un contrôle qui s'écarte du moteur mesure son
   propre écart, pas le jeu ». Ici le problème est pris à la racine : TOUT ce
   qui a une conséquence est dans ce fichier, et le rendu n'est qu'un lecteur.

   La conséquence pratique est considérable : tools/simulate-maze.mjs ne
   « simule » rien, il JOUE. Il appelle Rules.step() image par image, exactement
   comme la boucle du navigateur, avec les mêmes nombres. Quand il dit qu'une
   partie sur trois se termine à court de flamme, ce n'est pas une estimation.

   ---------------------------------------------------------------------------
   LA GÉOMÉTRIE DE COLLISION, ET POURQUOI ELLE EST AUSSI CELLE DU DÉCOR
   ---------------------------------------------------------------------------
   buildBoxes() rend la liste des BOÎTES de maçonnerie. Le moteur s'en sert
   pour la collision ; world.js s'en sert pour poser les murs. Une seule
   description, deux lecteurs — c'est la règle du zip 387 appliquée d'avance,
   et c'est ce qui interdit le défaut classique du genre : un mur visible
   qu'on traverse, ou un mur invisible qui bloque.
   ========================================================================== */

const Rules = (function () {

  const N = 1, E = 2, S = 4, W = 8;

  /* -----------------------------------------------------------------------
     LES BOÎTES.
     Deux familles, et la distinction n'est pas cosmétique :
       * les POTEAUX, aux (GRID+1)² intersections. Ils existent TOUJOURS, même
         au croisement de quatre passages ouverts. C'est eux qui empêchent de
         couper un angle en diagonale, et sans eux un joueur qui longe un mur
         en biais traverse la maçonnerie à chaque virage ;
       * les PANS, un par frontière non ouverte.
     -------------------------------------------------------------------- */
  function buildBoxes(cfg, m) {
    const C = cfg.CELL, Wt = cfg.WALL, h = Wt / 2, G = m.G;
    const boxes = [];
    // Poteaux
    for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) {
      boxes.push({ x0: i * C - h, z0: j * C - h, x1: i * C + h, z1: j * C + h, kind: "post" });
    }
    // Pans verticaux (le long de Z) : frontières EST/OUEST fermées
    for (let y = 0; y < G; y++) for (let x = 0; x <= G; x++) {
      let closed;
      if (x === 0) closed = true;
      else if (x === G) closed = true;
      else closed = !m.linked(x - 1, y, E);
      if (!closed) continue;
      boxes.push({ x0: x * C - h, z0: y * C + h, x1: x * C + h, z1: (y + 1) * C - h, kind: "z" });
    }
    // Pans horizontaux (le long de X) : frontières NORD/SUD fermées
    for (let y = 0; y <= G; y++) for (let x = 0; x < G; x++) {
      let closed;
      if (y === 0) closed = true;
      else if (y === G) closed = true;
      else closed = !m.linked(x, y - 1, S);
      if (!closed) continue;
      boxes.push({ x0: x * C + h, z0: y * C - h, x1: (x + 1) * C - h, z1: y * C + h, kind: "x" });
    }
    /* LES DEUX PORTES. L'entrée et la sortie sont des trous dans le mur
       d'enceinte : on les rouvre après coup plutôt que de les traiter dans la
       boucle ci-dessus, parce qu'une exception glissée dans une boucle de
       construction est la première chose qu'on oublie en relisant. */
    const openWall = (cx, cy, side) => {
      const wantX0 = side === "s" || side === "n" ? cx * C + h : null;
      for (let i = boxes.length - 1; i >= 0; i--) {
        const b = boxes[i];
        if (b.kind !== "x") continue;
        const zEdge = side === "s" ? (cy + 1) * C : cy * C;
        if (Math.abs(b.z0 + h - zEdge) > 0.001) continue;
        if (Math.abs(b.x0 - wantX0) > 0.001) continue;
        boxes.splice(i, 1);
        return true;
      }
      return false;
    };
    openWall(m.entry.x, m.entry.y, "s");
    openWall(m.exit.x, m.exit.y, "n");
    return boxes;
  }

  /* Index spatial : les boîtes rangées par cellule, pour ne tester que le
     voisinage. Sans lui, chaque image coûterait ~2 500 tests par entité, et
     l'outil de simulation (qui joue des milliers de parties) deviendrait
     inutilisable — donc, en pratique, ne serait pas lancé. Un contrôle trop
     lent est un contrôle mort. */
  function indexBoxes(cfg, m, boxes) {
    const G = m.G, C = cfg.CELL;
    const grid = new Map();
    const key = (i, j) => i * 4096 + j;
    for (const b of boxes) {
      const i0 = Math.floor(b.x0 / C), i1 = Math.floor(b.x1 / C);
      const j0 = Math.floor(b.z0 / C), j1 = Math.floor(b.z1 / C);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const k = key(i, j);
        let a = grid.get(k); if (!a) { a = []; grid.set(k, a); }
        a.push(b);
      }
    }
    return {
      near(x, z) {
        const i = Math.floor(x / C), j = Math.floor(z / C);
        const out = [];
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const a = grid.get(key(i + di, j + dj));
          if (a) for (const b of a) out.push(b);
        }
        return out;
      },
      G, C,
    };
  }

  /* Résolution cercle / boîte alignée. On repousse selon l'axe de MOINDRE
     pénétration : c'est ce qui fait glisser le long d'un mur au lieu de
     coller, et c'est indispensable ici — un joueur qui poursuit un couloir en
     appuyant vaguement en diagonale doit avancer, pas s'arrêter. */
  function pushOut(px, pz, r, boxes) {
    let x = px, z = pz;
    for (const b of boxes) {
      const cx = Math.max(b.x0, Math.min(x, b.x1));
      const cz = Math.max(b.z0, Math.min(z, b.z1));
      const dx = x - cx, dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 > r * r) continue;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * r;
        z = cz + (dz / d) * r;
      } else {
        // Centre DANS la boîte (arrive après un téléport ou un recul violent) :
        // on sort par la face la plus proche. Sans ce cas, le cercle reste
        // piégé et le joueur est immobilisé sans explication.
        const dl = Math.abs(x - b.x0), dr = Math.abs(b.x1 - x);
        const dt = Math.abs(z - b.z0), db = Math.abs(b.z1 - z);
        const mn = Math.min(dl, dr, dt, db);
        if (mn === dl) x = b.x0 - r; else if (mn === dr) x = b.x1 + r;
        else if (mn === dt) z = b.z0 - r; else z = b.z1 + r;
      }
    }
    return [x, z];
  }

  const cellOf = (cfg, x, z) => [Math.floor(x / cfg.CELL), Math.floor(z / cfg.CELL)];
  const centerOf = (cfg, cx, cy) => [cx * cfg.CELL + cfg.HALF, cy * cfg.CELL + cfg.HALF];

  /* =======================================================================
     canTouch — DEUX POINTS PEUVENT-ILS S'ATTEINDRE ?
     -----------------------------------------------------------------------
     ⚠️ FONCTION AJOUTÉE APRÈS SIMULATION, et elle corrige le pire défaut
     trouvé du chantier : TOUTES les portées du jeu étaient euclidiennes.
     L'épée traversait les murs, et une créature bloquée derrière une cloison
     comptait comme « au contact ». Dans un labyrinthe — c'est-à-dire dans un
     décor fait de cloisons — c'est une faute de fond, pas un détail : à
     4,8 unités de couloir et 6 de cellule, deux cases voisines NON reliées
     sont à moins de 6 unités l'une de l'autre, soit largement dans la portée
     d'épée (2,35 + rayon) dès qu'on s'approche du mur mitoyen.

     Le symptôme observé était d'ailleurs muet : l'oracle restait planté 300
     secondes devant un mur, à faire face à un rôdeur qu'il ne pouvait ni
     atteindre ni fuir. Aucune erreur, aucun avertissement.

     LA RÈGLE : on ne s'atteint que dans la MÊME cellule, ou dans deux
     cellules reliées par un passage ouvert. C'est grossier — deux points aux
     extrémités opposées de deux cases reliées passent le test — mais c'est
     exact là où ça compte (jamais à travers un mur) et ça coûte deux
     divisions. Un vrai lancer de rayon contre les 892 boîtes coûterait mille
     fois plus pour corriger un cas que personne ne verra.
     ======================================================================= */
  function canTouch(cfg, m, ax, az, bx, bz) {
    const [acx, acy] = cellOf(cfg, ax, az);
    const [bcx, bcy] = cellOf(cfg, bx, bz);
    if (acx === bcx && acy === bcy) return true;
    const dx = bcx - acx, dy = bcy - acy;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return false;   // ni voisines, ni diagonale
    if (acx < 0 || acy < 0 || acx >= m.G || acy >= m.G) return false;
    const d = dx === 1 ? E : dx === -1 ? W : dy === 1 ? S : N;
    return m.linked(acx, acy, d);
  }

  /* =======================================================================
     CRÉATION DE L'ÉTAT
     ======================================================================= */
  function create(cfg, m, seed) {
    const boxes = buildBoxes(cfg, m);
    const idxB = indexBoxes(cfg, m, boxes);
    const rand = (function () {
      let a = ((seed >>> 0) ^ 0x5f356495) >>> 0;
      return function () {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })();

    const [ex, ez] = centerOf(cfg, m.entry.x, m.entry.y);
    const gapSet = new Set(m.gaps.map(g => m.idx(g.x, g.y)));
    const crackMap = new Map();
    for (const c of m.cracks) crackMap.set(m.idx(c.x, c.y), { x: c.x, y: c.y, state: 0, t: 0 });

    const st = {
      cfg, m, boxes, idxB, rand,
      // Le fermier entre par le sud, tourné vers le NORD (vers la sortie) :
      // ang = 0 regarde vers -Z, et -Z est le nord de la grille.
      px: ex, pz: ez + cfg.CELL * 0.35, ang: 0,
      vx: 0, vz: 0, speed: 0,
      flame: cfg.FLAME_START,
      hearts: cfg.HEARTS,
      invulnT: 0, swingT: 0, cooldownT: 0, hasSword: false,
      hurtFlash: 0, camShake: 0,
      time: 0, score: 0, kills: 0, shardsTaken: 0, torchesUsed: 0,
      seen: new Set(), status: "play", fallT: 0, endCause: null,
      events: [],
      gaps: gapSet,
      cracks: crackMap,
      fallen: new Set(),          // dalles tombées : elles s'ajoutent à `gaps` pour tout le monde
      torches: m.torches.map(t => ({ x: t.x, y: t.y, spent: false, onPath: !!t.onPath })),
      shards: m.shards.map(s => ({ x: s.x, y: s.y, taken: false })),
      potions: m.potions.map(p => ({ x: p.x, y: p.y, taken: false })),
      sword: m.sword ? { x: m.sword.x, y: m.sword.y, taken: false } : null,
      roamers: m.roamers.map((r, i) => ({
        id: i, x: 0, z: 0, ang: 0, hp: cfg.ROAMER_HP,
        cx: r.x, cy: r.y, homeX: r.homeX, homeY: r.homeY,
        mode: "patrol", target: null, path: null, pathI: 0,
        staggerT: 0, hitT: 0, giveUpT: 0, dead: false, deadT: 0,
      })),
      stalker: null,
      stalkerAwake: false,
      /* ==================================================================
         LE PARVIS — les cellules où les rôdeurs n'entrent JAMAIS.
         ------------------------------------------------------------------
         ⚠️ AJOUTÉ APRÈS MESURE, et il corrige une faute de conception, pas un
         bug. La règle du générateur (« aucune créature avant l'épée ») porte
         sur le PLACEMENT. Elle ne dit rien de la patrouille, ni de la
         poursuite : un rôdeur posé à la profondeur 10 patrouille sur 4
         cellules, poursuit sans limite, et se retrouvait donc à la
         profondeur 4 devant un joueur désarmé. La simulation l'a montré
         crûment — des parties perdues à 23 secondes, sans épée, sans avoir
         frappé un seul coup.

         Le parvis est la MÊME garantie, mais tenue jusqu'au bout : les
         cellules à portée de l'entrée sont interdites aux rôdeurs, pour
         toujours. Elle donne au passage au joueur un endroit où souffler,
         ce qui est exactement ce qui manque à un jeu où tout poursuit.

         ⚠️ LE TRAQUEUR N'EST PAS CONCERNÉ, et c'est délibéré. S'il l'était,
         le parvis deviendrait un abri définitif où camper en attendant qu'il
         se lasse — et rien de ce qui a été écrit plus haut à son sujet
         n'aurait plus de sens. On peut souffler, jamais se cacher. */
      sanctuary: new Set(),
    };
    {
      const depth = (m.sword ? m.sword.depth : 0) + (cfg.SANCTUARY_MARGIN | 0);
      for (let y = 0; y < m.G; y++) for (let x = 0; x < m.G; x++) {
        const j = m.idx(x, y);
        if (m.dEntry[j] >= 0 && m.dEntry[j] <= depth) st.sanctuary.add(j);
      }
    }
    for (const r of st.roamers) {
      const [wx, wz] = centerOf(cfg, r.cx, r.cy);
      r.x = wx; r.z = wz;
    }
    /* LE TRAQUEUR NAÎT À LA SORTIE, et c'est délibéré : il descend vers le
       joueur, donc il se rapproche pendant que le joueur progresse. Le poser
       au hasard aurait rendu la première rencontre imprévisible, alors que
       tout l'intérêt est qu'elle soit INÉVITABLE mais tardive. */
    {
      const [sx, sz] = centerOf(cfg, m.exit.x, m.exit.y);
      st.stalker = {
        x: sx, z: sz + cfg.CELL * 0.5, ang: 0,
        mode: "idle", tx: m.exit.x, ty: m.exit.y,
        path: null, pathI: 0, repathT: 0, staggerT: 0, hitT: 0,
        knowsT: 0,
      };
    }
    markSeen(st);
    return st;
  }

  function markSeen(st) {
    const [cx, cy] = cellOf(st.cfg, st.px, st.pz);
    const j = st.m.idx(cx, cy);
    if (cx < 0 || cy < 0 || cx >= st.m.G || cy >= st.m.G) return;
    if (!st.seen.has(j)) { st.seen.add(j); st.score += st.cfg.SCORE_PER_CELL; }
  }

  /* Ensemble des cellules INFRANCHISSABLES à cet instant : trous ouverts +
     dalles déjà tombées. Utilisé par le traqueur, les rôdeurs et les outils.
     Recalculé à la demande plutôt que maintenu : une dalle tombe une fois
     toutes les dizaines de secondes, et un ensemble maintenu à deux endroits
     est un ensemble qui finit désaccordé. */
  function blockedNow(st) {
    if (!st._blkCache || st._blkN !== st.fallen.size) {
      const s = new Set(st.gaps);
      for (const j of st.fallen) s.add(j);
      st._blkCache = s; st._blkN = st.fallen.size;
    }
    return st._blkCache;
  }

  /* Le même ensemble, PLUS le parvis : ce que voient les rôdeurs, et eux
     seuls. Mis en cache sur le même critère (le nombre de dalles tombées),
     parce qu'il est lu une fois par image et que le reconstruire coûterait
     autant que tout le reste de la boucle réunie. */
  function blockedForRoamers(st) {
    if (!st._blkRCache || st._blkRN !== st.fallen.size) {
      const s = new Set(blockedNow(st));
      for (const j of st.sanctuary) s.add(j);
      st._blkRCache = s; st._blkRN = st.fallen.size;
    }
    return st._blkRCache;
  }

  /* =======================================================================
     LA FLAMME
     ----------------------------------------------------------------------
     Une seule fonction la lit pour en tirer TOUT ce qui en dépend : portée de
     la lumière, brouillard, portée de vue des rôdeurs, capacité du traqueur à
     te repérer. Si chaque système avait sa propre lecture du seuil, ils
     auraient fini par ne plus basculer au même moment — et le joueur aurait
     vu sa lumière tomber sans que les créatures changent de comportement,
     c'est-à-dire aurait cessé de croire à la règle.
     ======================================================================= */
  function flameLevel(st) {
    const f = st.flame;
    return {
      f,
      low: f <= st.cfg.FLAME_LOW,
      ember: f <= st.cfg.FLAME_CRITICAL,
      // k va de 0 (braise) à 1 (pleine), avec une courbe : la perte est
      // ressentie tôt, ce qui pousse à chercher un brasier avant l'urgence.
      k: Math.max(0, Math.min(1, Math.pow(f, 0.7))),
    };
  }

  /* =======================================================================
     LE PAS DE SIMULATION
     ----------------------------------------------------------------------
     intent = { fwd:-1..1, strafe:-1..1, turn:-1..1, run:bool, attack:bool, use:bool }
     dt en SECONDES, borné par l'appelant.
     ======================================================================= */
  function step(st, dt, intent) {
    const cfg = st.cfg;
    st.events.length = 0;
    if (st.status !== "play") {
      if (st.status === "falling") {
        st.fallT += dt;
        if (st.fallT * 1000 >= cfg.FALL_MS) { st.status = "dead"; st.endCause = "fall"; }
      }
      return st;
    }
    st.time += dt;

    // ---- orientation
    st.ang += (intent.turn || 0) * cfg.TURN_SPEED * dt;

    // ---- déplacement voulu
    const running = !!intent.run && (intent.fwd || 0) > 0;
    const fwdSpeed = (intent.fwd || 0) > 0
      ? (running ? cfg.RUN_SPEED : cfg.WALK_SPEED)
      : cfg.BACK_SPEED;
    const sin = Math.sin(st.ang), cos = Math.cos(st.ang);
    // ang = 0 → on regarde vers -Z.
    let wx = (-sin) * (intent.fwd || 0) * fwdSpeed + (cos) * (intent.strafe || 0) * cfg.STRAFE_SPEED;
    let wz = (-cos) * (intent.fwd || 0) * fwdSpeed + (-sin) * (intent.strafe || 0) * cfg.STRAFE_SPEED;

    st.vx += (wx - st.vx) * Math.min(1, cfg.ACCEL * dt / Math.max(1, cfg.WALK_SPEED));
    st.vz += (wz - st.vz) * Math.min(1, cfg.ACCEL * dt / Math.max(1, cfg.WALK_SPEED));
    st.speed = Math.hypot(st.vx, st.vz);

    st.px += st.vx * dt;
    st.pz += st.vz * dt;
    const near = st.idxB.near(st.px, st.pz);
    const [nx, nz] = pushOut(st.px, st.pz, cfg.BODY_R, near);
    st.px = nx; st.pz = nz;

    markSeen(st);

    // ---- la flamme
    const drain = running ? cfg.FLAME_DRAIN_RUN : cfg.FLAME_DRAIN;
    st.flame = Math.max(0, st.flame - drain * dt);

    // ---- trous et dalles
    handleFloor(st, dt);
    if (st.status !== "play") return st;

    // ---- ramassages et brasiers
    handlePickups(st, intent);

    // ---- épée
    if (st.cooldownT > 0) st.cooldownT -= dt;
    if (st.swingT > 0) {
      st.swingT -= dt;
      if (st.swingT <= 0) st.swingT = 0;
    }
    if (intent.attack && st.hasSword && st.swingT <= 0 && st.cooldownT <= 0) {
      st.swingT = cfg.SWING_MS / 1000;
      st.cooldownT = (cfg.SWING_MS + cfg.SWING_COOLDOWN_MS) / 1000;
      st.flame = Math.max(0, st.flame - cfg.FLAME_DRAIN_HIT);
      resolveSwing(st);
      st.events.push({ type: "swing" });
    }

    // ---- créatures
    updateRoamers(st, dt);
    updateStalker(st, dt, running);

    if (st.invulnT > 0) st.invulnT -= dt;
    if (st.hurtFlash > 0) st.hurtFlash = Math.max(0, st.hurtFlash - dt * 2.5);
    if (st.camShake > 0) st.camShake = Math.max(0, st.camShake - dt * 2.2);

    // ---- sortie
    const [cx, cy] = cellOf(cfg, st.px, st.pz);
    if (cy < 0 || (cx === st.m.exit.x && cy === st.m.exit.y && st.pz < st.m.exit.y * cfg.CELL + cfg.HALF * 0.4)) {
      st.status = "won";
      st.endCause = "exit";
      st.score += cfg.SCORE_EXIT_BONUS;
      st.events.push({ type: "won" });
    }
    return st;
  }

  /* -----------------------------------------------------------------------
     LE SOL. Trois cas, et le troisième est la mécanique du chantier.
     -------------------------------------------------------------------- */
  function handleFloor(st, dt) {
    const cfg = st.cfg, m = st.m;
    const [cx, cy] = cellOf(cfg, st.px, st.pz);
    if (cx < 0 || cy < 0 || cx >= m.G || cy >= m.G) return;
    const j = m.idx(cx, cy);

    // 1. trou ouvert, ou dalle déjà tombée : on tombe.
    if (st.gaps.has(j) || st.fallen.has(j)) {
      st.status = "falling"; st.fallT = 0;
      st.events.push({ type: "fall" });
      return;
    }
    // 2. dalle fêlée : elle commence à céder au premier pas, PAS avant.
    const cr = st.cracks.get(j);
    if (cr && cr.state === 0) {
      cr.state = 1; cr.t = 0;
      st.events.push({ type: "crack", x: cx, y: cy });
    }
    // 3. toutes les dalles en train de céder avancent, où que soit le joueur —
    //    y compris celle qu'il vient de quitter. C'est ce qui fait qu'on
    //    l'entend tomber DANS SON DOS, et c'est le seul moment du jeu où le
    //    joueur apprend quelque chose sans le voir.
    for (const c of st.cracks.values()) {
      if (c.state !== 1) continue;
      c.t += dt;
      if (c.t * 1000 >= cfg.CRACK_DELAY_MS) {
        c.state = 2;
        const cj = m.idx(c.x, c.y);
        st.fallen.add(cj);
        st.events.push({ type: "collapse", x: c.x, y: c.y });
        // Le joueur encore dessus tombe avec elle.
        const [pcx, pcy] = cellOf(cfg, st.px, st.pz);
        if (pcx === c.x && pcy === c.y) {
          st.status = "falling"; st.fallT = 0;
          st.events.push({ type: "fall" });
          return;
        }
      }
    }
  }

  function handlePickups(st, intent) {
    const cfg = st.cfg, m = st.m;
    const [cx, cy] = cellOf(cfg, st.px, st.pz);
    const hit = (o) => o.x === cx && o.y === cy;

    for (const s of st.shards) {
      if (s.taken || !hit(s)) continue;
      s.taken = true; st.shardsTaken++; st.score += cfg.SCORE_PER_SHARD;
      st.events.push({ type: "shard" });
    }
    for (const p of st.potions) {
      if (p.taken || !hit(p)) continue;
      if (st.hearts >= cfg.HEARTS) continue;   // pleine vie : on la laisse pour plus tard
      p.taken = true;
      st.hearts = Math.min(cfg.HEARTS, st.hearts + cfg.POTION_HEAL);
      st.events.push({ type: "potion" });
    }
    if (st.sword && !st.sword.taken && hit(st.sword)) {
      st.sword.taken = true; st.hasSword = true;
      st.events.push({ type: "sword" });
    }
    /* LE BRASIER SE PREND À LA TOUCHE, pas au passage. Deux raisons, et la
       seconde est la vraie : d'abord un rallumage automatique gaspillerait le
       brasier d'un joueur à flamme presque pleine ; ensuite, et surtout,
       APPUYER est ce qui fait du rallumage un geste. On s'arrête, on tend la
       torche, on regarde derrière soi. Un ramassage automatique n'aurait
       produit aucun de ces trois instants. */
    if (intent.use) {
      for (const t of st.torches) {
        if (t.spent) continue;
        const [tx, tz] = centerOf(cfg, t.x, t.y);
        if (Math.hypot(tx - st.px, tz - st.pz) > cfg.TORCH_USE_RANGE) continue;
        t.spent = true; st.torchesUsed++;
        st.flame = cfg.FLAME_REVIVE;
        st.events.push({ type: "revive" });
        break;
      }
    }
    void m;
  }

  /* -----------------------------------------------------------------------
     LE COUP D'ÉPÉE. Arc devant le joueur ; touche tout ce qui est dedans.
     Le traqueur est touché comme les autres MAIS n'a pas de points de vie :
     il recule. Le distinguer ici, et pas dans une branche du joueur, est ce
     qui garantit qu'on ne pourra jamais le tuer « par accident » en ajoutant
     une arme un jour.
     -------------------------------------------------------------------- */
  function resolveSwing(st) {
    const cfg = st.cfg;
    const fx = -Math.sin(st.ang), fz = -Math.cos(st.ang);
    const inArc = (ox, oz, r) => {
      const dx = ox - st.px, dz = oz - st.pz;
      const d = Math.hypot(dx, dz);
      if (d > cfg.SWING_RANGE + r) return false;
      // ⚠️ Le mur d'abord, l'angle ensuite : voir canTouch().
      if (!canTouch(cfg, st.m, st.px, st.pz, ox, oz)) return false;
      if (d < 0.001) return true;
      const dot = (dx / d) * fx + (dz / d) * fz;
      return dot > Math.cos(cfg.SWING_ARC / 2);
    };
    for (const r of st.roamers) {
      if (r.dead || !inArc(r.x, r.z, cfg.ROAMER_BODY_R)) continue;
      r.hp -= cfg.SWING_DAMAGE;
      r.staggerT = cfg.ROAMER_STAGGER_MS / 1000;
      const d = Math.hypot(r.x - st.px, r.z - st.pz) || 1;
      r.x += ((r.x - st.px) / d) * cfg.SWING_KNOCKBACK;
      r.z += ((r.z - st.pz) / d) * cfg.SWING_KNOCKBACK;
      const nb = st.idxB.near(r.x, r.z);
      const [rx, rz] = pushOut(r.x, r.z, cfg.ROAMER_BODY_R, nb);
      r.x = rx; r.z = rz;
      if (r.hp <= 0) {
        r.dead = true; r.deadT = 0;
        st.kills++; st.score += cfg.SCORE_PER_KILL;
        st.events.push({ type: "kill" });
      } else st.events.push({ type: "hit" });
    }
    const s = st.stalker;
    if (s && inArc(s.x, s.z, cfg.STALK_BODY_R)) {
      s.staggerT = cfg.STALK_STAGGER_MS / 1000;
      const d = Math.hypot(s.x - st.px, s.z - st.pz) || 1;
      s.x += ((s.x - st.px) / d) * cfg.SWING_KNOCKBACK * 1.5;
      s.z += ((s.z - st.pz) / d) * cfg.SWING_KNOCKBACK * 1.5;
      const nb = st.idxB.near(s.x, s.z);
      const [sx2, sz2] = pushOut(s.x, s.z, cfg.STALK_BODY_R, nb);
      s.x = sx2; s.z = sz2;
      s.path = null;
      st.events.push({ type: "stalkerHit" });
    }
  }

  /* `who` sert UNIQUEMENT au rapport de simulation, et ce n'est pas un
     luxe : « mort par créature » mélange les rôdeurs (qu'on peut tuer) et le
     traqueur (qu'on ne peut pas). Ce sont deux des trois dangers demandés par
     Guillaume, et les confondre rendait impossible de vérifier qu'ils pèsent
     tous les deux. Un contrôle qui agrège deux causes ne peut pas dire
     laquelle domine. */
  function hurt(st, dmg, fromX, fromZ, who) {
    const cfg = st.cfg;
    if (st.invulnT > 0) return false;
    st.hearts -= dmg;
    st.invulnT = cfg.HURT_INVULN_MS / 1000;
    st.hurtFlash = 1; st.camShake = cfg.CAM_SHAKE_HURT;
    const d = Math.hypot(st.px - fromX, st.pz - fromZ) || 1;
    st.px += ((st.px - fromX) / d) * cfg.HURT_KNOCKBACK;
    st.pz += ((st.pz - fromZ) / d) * cfg.HURT_KNOCKBACK;
    const nb = st.idxB.near(st.px, st.pz);
    const [hx, hz] = pushOut(st.px, st.pz, cfg.BODY_R, nb);
    st.px = hx; st.pz = hz;
    st.events.push({ type: "hurt" });
    if (st.hearts <= 0) {
      st.hearts = 0; st.status = "dead"; st.endCause = who || "creature";
      st.events.push({ type: "dead" });
    }
    return true;
  }

  /* -----------------------------------------------------------------------
     LES RÔDEURS.
     -------------------------------------------------------------------- */
  function updateRoamers(st, dt) {
    const cfg = st.cfg, m = st.m;
    const fl = flameLevel(st);
    const sight = cfg.ROAMER_SIGHT_EMBER + (cfg.ROAMER_SIGHT - cfg.ROAMER_SIGHT_EMBER) * fl.k;
    /* Les rôdeurs voient le parvis comme un mur. C'est la seule mise en œuvre
       possible qui ne demande AUCUN cas particulier ailleurs : leur recherche
       de chemin ne peut pas y entrer, donc leur locomotion non plus, donc leur
       contact non plus. Un test « suis-je dans le parvis ? » posé dans la
       boucle de déplacement aurait dû être répété dans la poursuite, dans la
       patrouille et dans le retour au secteur — trois endroits, donc un
       oubli. */
    const blk = blockedForRoamers(st);
    for (const r of st.roamers) {
      if (r.dead) { r.deadT += dt; continue; }
      if (r.hitT > 0) r.hitT -= dt;
      if (r.staggerT > 0) { r.staggerT -= dt; continue; }

      const dToPlayer = Math.hypot(st.px - r.x, st.pz - r.z);
      const [rcx, rcy] = cellOf(cfg, r.x, r.z);
      const [pcx, pcy] = cellOf(cfg, st.px, st.pz);

      if (dToPlayer <= sight) { r.mode = "chase"; r.giveUpT = cfg.ROAMER_GIVEUP_MS / 1000; }
      else if (r.mode === "chase") {
        r.giveUpT -= dt;
        if (r.giveUpT <= 0) r.mode = "home";
      }

      let tgt;
      if (r.mode === "chase") tgt = [pcx, pcy];
      else if (r.mode === "home") {
        tgt = [r.homeX, r.homeY];
        if (rcx === r.homeX && rcy === r.homeY) r.mode = "patrol";
      } else {
        // patrouille : nouvelle destination dans le rayon du secteur quand on
        // a atteint la précédente. Le tirage passe par le rng de l'ÉTAT, donc
        // une partie rejouée avec la même graine se déroule à l'identique —
        // ce qui est la condition pour qu'un outil puisse reproduire un bug.
        if (!r.target || (rcx === r.target[0] && rcy === r.target[1])) {
          const R = cfg.ROAMER_PATROL_R;
          const tx = Math.max(0, Math.min(m.G - 1, r.homeX + ((st.rand() * (2 * R + 1)) | 0) - R));
          const ty = Math.max(0, Math.min(m.G - 1, r.homeY + ((st.rand() * (2 * R + 1)) | 0) - R));
          r.target = [tx, ty];
          r.path = null;
        }
        tgt = r.target;
      }

      /* Le chemin n'est recalculé qu'à l'expiration de ROAMER_REPATH_MS, ou
         quand il est épuisé. Voir le commentaire de cette constante : c'est
         ce délai qui fait qu'une créature S'ENGAGE dans un couloir au lieu de
         corriger sa trajectoire en continu — donc qu'on puisse la semer. */
      r.repathT = (r.repathT || 0) - dt;
      const exhausted = !r.path || !r.path.length || r.pathI >= r.path.length;
      if (exhausted || r.repathT <= 0) {
        r.repathT = cfg.ROAMER_REPATH_MS / 1000;
        r.path = Maze.pathTo(m, rcx, rcy, tgt[0], tgt[1], blk) || [];
        r.pathI = 0;
      }
      const spd = r.mode === "chase" ? cfg.ROAMER_CHASE_SPEED : cfg.ROAMER_SPEED;
      stepAlong(st, r, spd, dt, cfg.ROAMER_BODY_R);

      // contact
      if (dToPlayer < cfg.BODY_R + cfg.ROAMER_BODY_R + 0.15 && r.hitT <= 0 &&
          canTouch(cfg, m, st.px, st.pz, r.x, r.z)) {
        if (hurt(st, cfg.ROAMER_HIT_DAMAGE, r.x, r.z, "roamer")) r.hitT = cfg.ROAMER_HIT_COOLDOWN_MS / 1000;
        if (st.status !== "play") return;
      }
    }
  }

  /* Avance une entité le long de son chemin de cellules. C'est la SEULE
     locomotion des créatures : elles ne se dirigent jamais « vers le joueur »
     en ligne droite, ce qui les collerait aux murs en permanence. Elles
     suivent le graphe du labyrinthe, comme le joueur doit le faire. */
  function stepAlong(st, ent, speed, dt, radius) {
    const cfg = st.cfg;
    if (!ent.path || ent.pathI >= ent.path.length) return;
    const [tcx, tcy] = ent.path[ent.pathI];
    const [tx, tz] = centerOf(cfg, tcx, tcy);
    const dx = tx - ent.x, dz = tz - ent.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.35) { ent.pathI++; return; }
    ent.ang = Math.atan2(-dx, -dz);
    ent.x += (dx / d) * speed * dt;
    ent.z += (dz / d) * speed * dt;
    const nb = st.idxB.near(ent.x, ent.z);
    const [ex, ez] = pushOut(ent.x, ent.z, radius, nb);
    ent.x = ex; ent.z = ez;
  }

  /* -----------------------------------------------------------------------
     LE TRAQUEUR.
     ----------------------------------------------------------------------
     Toute la mécanique tient dans knownCell() : ce qu'il CROIT savoir. Il ne
     poursuit jamais le joueur, il poursuit une hypothèse — et c'est la seule
     façon de rendre le noir utile au joueur sans rendre la créature stupide.
     -------------------------------------------------------------------- */
  function knownCell(st, running) {
    const cfg = st.cfg, m = st.m;
    const s = st.stalker;
    const fl = flameLevel(st);
    const [pcx, pcy] = cellOf(cfg, st.px, st.pz);
    const [scx, scy] = cellOf(cfg, s.x, s.z);
    const cellDist = Math.abs(pcx - scx) + Math.abs(pcy - scy);

    /* 0. LE NOIR COMPLET. Torche éteinte, il sait tout.
       ------------------------------------------------------------------
       ⚠️ CETTE BRANCHE CORRIGE UNE FAILLE DE CONCEPTION TROUVÉE PAR LA
       SIMULATION, et c'est la plus grosse du chantier. Sans elle, la vue du
       traqueur vaut STALK_SIGHT_FULL × k, et k vaut ZÉRO à flamme nulle :
       laisser sa torche s'éteindre et ne plus bouger rendait le joueur
       littéralement introuvable. La ressource la plus précieuse du jeu
       devenait quelque chose qu'on avait intérêt à gaspiller, et la
       stratégie optimale était de s'asseoir dans le noir.

       Le remède est celui que la fiction dictait depuis le début : le noir
       n'est pas une cachette, c'est CHEZ LUI. Torche morte, il ne cherche
       plus — il vient, et plus vite que le joueur ne court (voir
       STALK_SPEED_DARK). Il n'y a donc pas de minuterie arbitraire du genre
       « vous mourez 30 s après l'extinction » : la sanction est incarnée,
       et elle laisse au joueur la chance de courir vers un brasier. */
    if (st.flame <= 0) return { cell: [pcx, pcy], sure: true, dark: true };

    // 1. LA VUE. Elle dépend de la flamme, et seulement d'elle.
    const sight = cfg.STALK_SIGHT_FULL * fl.k;
    if (cellDist <= sight) return { cell: [pcx, pcy], sure: true };

    // 2. L'OUÏE. Elle dépend de ce que fait le joueur, et pas du tout de sa
    //    lumière. Rester immobile ne s'entend pas : c'est la seule façon de
    //    disparaître complètement, et elle coûte de la flamme.
    const moving = st.speed > 0.6;
    const hear = !moving ? 0 : (running ? cfg.STALK_HEAR_RUN : cfg.STALK_HEAR_WALK);
    if (cellDist <= hear) return { cell: [pcx, pcy], sure: true };

    // 3. RIEN. Il continue vers son dernier point connu ; arrivé, il erre.
    if (s.tx === scx && s.ty === scy) {
      const R = 3;
      const tx = Math.max(0, Math.min(m.G - 1, scx + ((st.rand() * (2 * R + 1)) | 0) - R));
      const ty = Math.max(0, Math.min(m.G - 1, scy + ((st.rand() * (2 * R + 1)) | 0) - R));
      return { cell: [tx, ty], sure: false };
    }
    return { cell: [s.tx, s.ty], sure: false };
  }

  function updateStalker(st, dt, running) {
    const cfg = st.cfg, m = st.m;
    const s = st.stalker;
    if (!s) return;
    if (s.hitT > 0) s.hitT -= dt;
    if (s.staggerT > 0) { s.staggerT -= dt; return; }

    // Il dort tant que le joueur n'est pas entré assez loin. Les premières
    // cellules doivent être calmes : c'est là qu'on apprend à jouer, et une
    // créature increvable dans la minute d'ouverture ferait juste quitter.
    if (!st.stalkerAwake) {
      const [pcx, pcy] = cellOf(cfg, st.px, st.pz);
      if (pcx >= 0 && pcy >= 0 && pcx < m.G && pcy < m.G &&
          m.dEntry[m.idx(pcx, pcy)] >= cfg.STALK_WAKE_DEPTH) {
        st.stalkerAwake = true;
        st.events.push({ type: "stalkerWake" });
      } else return;
    }

    s.repathT -= dt;
    const blk = blockedNow(st);
    const [scx, scy] = cellOf(cfg, s.x, s.z);
    if (s.repathT <= 0 || !s.path || s.pathI >= (s.path ? s.path.length : 0)) {
      s.repathT = cfg.STALK_REPATH_MS / 1000;
      const k = knownCell(st, running);
      s.tx = k.cell[0]; s.ty = k.cell[1];
      s.mode = k.dark ? "dark" : (k.sure ? "hunt" : "search");
      s.path = Maze.pathTo(m, scx, scy, s.tx, s.ty, blk) || [];
      s.pathI = 0;
    }
    const spd = s.mode === "dark" ? cfg.STALK_SPEED_DARK
      : s.mode === "hunt" ? cfg.STALK_SPEED : cfg.STALK_SPEED_LOST;
    stepAlong(st, s, spd, dt, cfg.STALK_BODY_R);

    const d = Math.hypot(st.px - s.x, st.pz - s.z);
    if (d < cfg.BODY_R + cfg.STALK_BODY_R + 0.2 && s.hitT <= 0 &&
        canTouch(cfg, m, st.px, st.pz, s.x, s.z)) {
      if (hurt(st, cfg.STALK_HIT_DAMAGE, s.x, s.z, "stalker")) s.hitT = cfg.STALK_HIT_COOLDOWN_MS / 1000;
    }
  }

  /* Distance au traqueur, normalisée, pour le voile d'angoisse du HUD. Sortie
     ici plutôt que dans ui.js pour la raison habituelle : une seule
     description de « à quel point c'est proche ». */
  function dread(st) {
    const s = st.stalker;
    if (!s || !st.stalkerAwake) return 0;
    const d = Math.hypot(st.px - s.x, st.pz - s.z);
    const k = 1 - Math.min(1, d / st.cfg.STALK_DREAD_RANGE);
    return k * k * st.cfg.STALK_DREAD_MAX;
  }

  return { create, step, buildBoxes, indexBoxes, pushOut, cellOf, centerOf, canTouch, flameLevel, blockedNow, dread, hurt, N, E, S, W };
})();

if (typeof module === "object" && module.exports) module.exports = { Rules };
