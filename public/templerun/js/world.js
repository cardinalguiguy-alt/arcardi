/* =============================================================================
   world.js — Rendu Three.js. Scène, matériaux, construction des tronçons.
   -----------------------------------------------------------------------------
   Les graphismes sont VOLONTAIREMENT jetables : que des boîtes, des matériaux
   plats, aucun shader. Tout est isolé dans ce fichier pour pouvoir être
   remplacé sans toucher au gameplay.

   Exception à "aucune texture" (le sol, depuis la demande de dalles en
   ruine) : quelques textures canvas générées au démarrage, en très basse
   résolution et NearestFilter, pour rester dans l'esprit pixel-art plutôt
   que d'ouvrir la porte à des textures peintes finement. Voir
   buildStoneVariants.

   Deux partis pris qui donnent beaucoup pour presque rien :

   * Rendu en basse résolution puis étirement en CSS (CFG.PIXEL_SCALE). C'est ce
     qui donne l'aspect pixelisé demandé, et ça divise le coût de remplissage
     par ~11. Un seul réglage à bouger si c'est trop ou pas assez gros.
   * Brouillard exponentiel dense. Il fait l'ambiance ET il masque la fin de la
     piste, donc on n'affiche que 5 tronçons.

   La palette est celle de la carte maléfique du jeu (voir CFG, section palette).
   ========================================================================== */

const World = (function () {
  let renderer, scene, camera, canvas;
  let playerMesh, playerLegs, playerRig, wolfMeshes = [], torchLight;
  let geo = {}, mat = {};
  let flames = [];        // plans de flamme à faire vaciller
  const nodeGroups = new Map();

  /* --------------------------------------------------------------- SETUP */
  function init(canvasEl) {
    canvas = canvasEl;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(1);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(CFG.COL_SKY);
    scene.fog = new THREE.FogExp2(CFG.COL_FOG, CFG.FOG_NEAR_DENSITY);

    camera = new THREE.PerspectiveCamera(CFG.CAM_FOV, 1, 0.1, CFG.DRAW_DISTANCE);

    // Éclairage : 3 sources, pas une de plus.
    scene.add(new THREE.AmbientLight(CFG.COL_PURPLE_DIM, 0.55));
    const moon = new THREE.DirectionalLight(0xb9a6e8, 0.55);
    moon.position.set(-0.4, 1, 0.25);
    scene.add(moon);
    torchLight = new THREE.PointLight(CFG.COL_TORCH, 1.5, 34, 2);
    scene.add(torchLight);

    buildAssets();
    resize();
    window.addEventListener("resize", resize);
  }

  function buildAssets() {
    geo.box = new THREE.BoxGeometry(1, 1, 1);
    geo.coin = new THREE.OctahedronGeometry(0.42, 0);
    geo.plane = new THREE.PlaneGeometry(1, 1);

    const L = (c, opts) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, opts || {}));
    mat.stone     = L(CFG.COL_STONE);
    mat.stoneDark = L(CFG.COL_STONE_DARK);
    mat.edge      = L(CFG.COL_STONE_EDGE);
    mat.obstacle  = L(CFG.COL_OBSTACLE);
    mat.bark      = L(CFG.COL_BARK);
    mat.barkDark  = L(CFG.COL_BARK_DARK);
    mat.wolf      = L(CFG.COL_WOLF);
    mat.shirt     = L(CFG.COL_SHIRT);
    mat.pants     = L(CFG.COL_PANTS);
    mat.skin      = L(CFG.COL_SKIN);
    mat.hair      = L(CFG.COL_HAIR);
    mat.coin      = new THREE.MeshLambertMaterial({ color: CFG.COL_COIN, emissive: CFG.COL_COIN, emissiveIntensity: 0.45 });
    mat.torchWood = L(0x2e2822);
    mat.flame     = new THREE.MeshBasicMaterial({ color: CFG.COL_TORCH, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide });
    mat.eye       = new THREE.MeshBasicMaterial({ color: CFG.COL_WOLF_EYE });
    mat.rune      = new THREE.MeshBasicMaterial({ color: CFG.COL_PURPLE, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
    mat.stoneVariants = buildStoneVariants();

    buildPlayer();
    buildWolves();
  }

  /* --------------------------------------------------- SOL EN RUINE ---
     Un petit pool de textures par palier d'usure (pas une par dalle : on
     réutilise le pool, seul le TIRAGE est par dalle). Peint sur un canvas
     minuscule puis figé en NearestFilter, pour rester du pixel-art plaqué
     et non une texture "peinte" — cohérent avec le reste du rendu, qui
     mise sur la basse résolution plutôt que sur le détail. */
  function cssHex(hex) { return "#" + hex.toString(16).padStart(6, "0"); }

  function paintStoneTile(tier) {
    const SIZE = 32;
    const cv = document.createElement("canvas");
    cv.width = cv.height = SIZE;
    const ctx = cv.getContext("2d");

    // Fond + blotches de pierre plus sombre (remplace l'ancienne alternance
    // de deux tons de dalle par une texture qui porte les deux tons elle-même).
    ctx.fillStyle = cssHex(CFG.COL_STONE);
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = cssHex(CFG.COL_STONE_DARK);
    const blotches = 4 + Math.floor(Math.random() * 4);
    for (let b = 0; b < blotches; b++) {
      ctx.beginPath();
      ctx.arc(Math.random() * SIZE, Math.random() * SIZE, 2 + Math.random() * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = cssHex(CFG.COL_STONE_EDGE);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0.5, 0.5, SIZE - 1, SIZE - 1);

    // Taches d'humidité/mousse : plus nombreuses et plus sombres à mesure
    // que le palier d'usure monte. 0 = quasi rien, 2 = franchement moisi.
    const stainCounts = [1, 3, 6];
    const n = stainCounts[tier];
    for (let s = 0; s < n; s++) {
      const x = Math.random() * SIZE, y = Math.random() * SIZE;
      const r = 2.5 + Math.random() * (3 + tier * 2);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, cssHex(CFG.COL_STAIN_DARK));
      grad.addColorStop(1, cssHex(CFG.COL_STAIN) + "00"); // fondu transparent
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }

    // Fêlures : lignes brisées, absentes au palier intact.
    const crackCounts = [0, 2, 5];
    ctx.strokeStyle = cssHex(CFG.COL_CRACK);
    ctx.lineWidth = 1;
    for (let c = 0; c < crackCounts[tier]; c++) {
      let x = Math.random() * SIZE, y = Math.random() * SIZE;
      ctx.beginPath(); ctx.moveTo(x, y);
      const segs = 2 + Math.floor(Math.random() * 3);
      for (let seg = 0; seg < segs; seg++) {
        x += (Math.random() - 0.5) * SIZE * 0.5;
        y += (Math.random() - 0.5) * SIZE * 0.5;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return new THREE.MeshLambertMaterial({ map: tex });
  }

  function buildStoneVariants() {
    const VARIANTS_PER_TIER = [3, 4, 4]; // intacte, fissurée, très abîmée
    return VARIANTS_PER_TIER.map((n, tier) => {
      const list = [];
      for (let i = 0; i < n; i++) list.push(paintStoneTile(tier));
      return list;
    });
  }

  // Tirage pondéré du palier d'usure (voir CFG.FLOOR_WEAR_WEIGHTS).
  function pickWearTier(roll) {
    const w = CFG.FLOOR_WEAR_WEIGHTS;
    if (roll < w[0]) return 0;
    if (roll < w[0] + w[1]) return 1;
    return 2;
  }

  function box(w, h, d, material, x, y, z) {
    const m = new THREE.Mesh(geo.box, material);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    return m;
  }

  /* Fermier : silhouette bloc reprenant les proportions du sprite de Ferme
     Vallée (16 px de large pour 24 de haut, tête large, jambes courtes) et ses
     couleurs OUTFITS[0]. Placeholder assumé, à remplacer par le vrai sprite.

     Structure : playerMesh (position + cap monde, comme avant) > pelvis
     (pivot de bascule, posé à hauteur de bassin) > tout le reste du corps,
     positionné en coordonnées RELATIVES au bassin. Au repos (rotation.z = 0)
     ça retombe exactement sur les mêmes coordonnées monde qu'avant : seule
     la glissade fait tourner le pelvis pour coucher le corps sur le flanc. */
  function buildPlayer() {
    playerMesh = new THREE.Group();
    const g = playerMesh;

    const pelvis = new THREE.Group();
    pelvis.position.set(0, CFG.SLIDE_PELVIS_Y, 0);
    g.add(pelvis);

    const rel = (y) => y - CFG.SLIDE_PELVIS_Y; // reconvertit une hauteur monde en hauteur relative au bassin

    const torso = box(0.95, 0.75, 0.55, mat.shirt, 0, rel(1.12), 0);
    const armL  = box(0.28, 0.6, 0.3, mat.skin, -0.62, rel(1.15), 0); // bras gauche (se replie contre le torse en glissade)
    const armR  = box(0.28, 0.6, 0.3, mat.skin, 0.62, rel(1.15), 0);  // bras droit (prend appui au sol en glissade)
    const head  = box(0.78, 0.68, 0.62, mat.skin, 0, rel(1.78), 0);
    const hair  = box(0.84, 0.24, 0.68, mat.hair, 0, rel(2.06), 0);
    [torso, armL, armR, head, hair].forEach(m => pelvis.add(m));

    playerLegs = [
      box(0.34, 0.72, 0.34, mat.pants, -0.24, rel(0.4), 0),
      box(0.34, 0.72, 0.34, mat.pants, 0.24, rel(0.4), 0),
    ];
    playerLegs.forEach(l => pelvis.add(l));

    scene.add(g);
    playerRig = { pelvis, torso, armL, armR, head, hair };
  }

  function buildWolves() {
    for (let i = 0; i < CFG.WOLF_COUNT; i++) {
      const g = new THREE.Group();
      g.add(box(0.8, 0.7, 1.7, mat.wolf, 0, 0, 0));       // corps
      g.add(box(0.6, 0.55, 0.6, mat.wolf, 0, 0.18, -1.0)); // tête
      g.add(box(0.14, 0.14, 0.05, mat.eye, -0.17, 0.26, -1.31));
      g.add(box(0.14, 0.14, 0.05, mat.eye, 0.17, 0.26, -1.31));
      g.add(box(0.18, 0.5, 0.18, mat.wolf, 0, 0.35, 0.95)); // queue
      scene.add(g);
      wolfMeshes.push(g);
    }
  }

  /* ----------------------------------------------------- TRONÇON -> MESHES */
  function buildNode(node) {
    if (nodeGroups.has(node.index)) return;
    const g = new THREE.Group();
    const f = dirForward(node.dir), r = dirRight(node.dir);
    const yaw = dirYaw(node.dir);

    // Positionne un objet dans le repère du tronçon (t le long, off en travers).
    const place = (mesh, t, off, y) => {
      mesh.position.set(node.ox + f.x * t + r.x * off, y, node.oz + f.z * t + r.z * off);
      mesh.rotation.y += yaw;
      g.add(mesh);
    };

    /* --- Sol : dalles de pierre, avec des trous EXACTEMENT là où la collision
       en voit. On construit d'abord la liste des intervalles pleins (le
       complémentaire des trous), puis on pave chaque intervalle. Découper
       naïvement en dalles fixes et retirer celles qui touchent un trou
       agrandirait le vide visible jusqu'à 4 unités de chaque côté : le joueur
       verrait un trou plus large que celui qui le tue, ou l'inverse. --- */
    const gaps = node.obstacles.filter(o => o.type === OBST.GAP)
      .map(o => [o.t - CFG.GAP_LENGTH / 2, o.t + CFG.GAP_LENGTH / 2])
      .sort((a, b) => a[0] - b[0]);
    const solids = [];
    let cursor = 0;
    for (const [a, b] of gaps) { if (a > cursor) solids.push([cursor, a]); cursor = Math.max(cursor, b); }
    if (cursor < node.length) solids.push([cursor, node.length]);

    /* Sol pavé de dalles en ruine : chaque dalle tire son palier d'usure
       (voir pickWearTier/CFG.FLOOR_WEAR_WEIGHTS) puis une texture au sein de
       ce palier. Les dalles fissurées/très abîmées basculent légèrement et,
       pour les très abîmées, s'affaissent un peu et perdent des éclats à
       leurs bords — purement visuel, la collision reste celle du plateau
       plat calculée ailleurs (voir OBST.GAP plus haut). */
    const tile = CFG.FLOOR_TILE;
    const rngFloor = Track.makeRng(node.index * 5231 + 7);
    for (const [a, b] of solids) {
      for (let t = a; t < b - 0.01; t += tile) {
        const len = Math.min(tile, b - t);
        const tier = pickWearTier(rngFloor());
        const variants = mat.stoneVariants[tier];
        const material = variants[Math.floor(rngFloor() * variants.length)];

        const tiltMax = tier === 2 ? CFG.FLOOR_TILT_RUINED : tier === 1 ? CFG.FLOOR_TILT_CRACKED : 0;
        const sink = tier === 2 ? rngFloor() * CFG.FLOOR_SINK_RUINED : 0;

        const slabMesh = box(CFG.TRACK_WIDTH, CFG.FLOOR_THICKNESS, Math.max(0.2, len - 0.12), material, 0, 0, 0);
        slabMesh.rotation.x = (rngFloor() - 0.5) * tiltMax;
        slabMesh.rotation.z = (rngFloor() - 0.5) * tiltMax;
        place(slabMesh, t + len / 2, 0, -CFG.FLOOR_THICKNESS / 2 - sink);

        if (tier === 2) {
          const chips = 1 + Math.floor(rngFloor() * 2);
          for (let c = 0; c < chips; c++) {
            const side = rngFloor() < 0.5 ? -1 : 1;
            const cw = 0.3 + rngFloor() * 0.5;
            const chip = box(cw, CFG.FLOOR_THICKNESS * 0.4, cw, mat.stoneDark, 0, 0, 0);
            chip.rotation.y = rngFloor() * 6.28;
            place(chip, t + rngFloor() * len, side * (CFG.TRACK_WIDTH / 2 - cw / 2), -CFG.FLOOR_THICKNESS - sink - 0.05);
          }
        }
      }
    }

    /* --- Bordures + torches --- */
    for (const side of [-1, 1]) {
      place(box(0.5, 0.75, node.length, mat.edge, 0, 0, 0), node.length / 2, side * (CFG.TRACK_WIDTH / 2 + 0.2), -0.05);
      for (let t = 6; t < node.length - 4; t += 13) {
        place(box(0.22, 1.5, 0.22, mat.torchWood, 0, 0, 0), t, side * (CFG.TRACK_WIDTH / 2 + 0.35), 0.75);
        const fl = new THREE.Mesh(geo.plane, mat.flame);
        fl.scale.set(0.75, 1.0, 1);
        place(fl, t, side * (CFG.TRACK_WIDTH / 2 + 0.35), 1.85);
        fl.userData.baseY = 1.85;
        fl.userData.phase = (node.index * 7 + t) * 0.7;
        flames.push(fl);
      }
    }

    /* --- Obstacles --- */
    for (const o of node.obstacles) {
      if (o.type === OBST.GAP) continue;
      for (let i = 0; i < CFG.LANE_COUNT; i++) {
        if (!o.lanes[i]) continue;
        const x = CFG.LANE_X[i];
        if (o.type === OBST.LOW) {
          place(box(CFG.LANE_WIDTH - 0.1, CFG.LOW_HEIGHT, 0.6, mat.obstacle, 0, 0, 0), o.t, x, CFG.LOW_HEIGHT / 2);
        } else if (o.type === OBST.HIGH) {
          const h = 3.2 - CFG.HIGH_CLEARANCE;
          place(box(CFG.LANE_WIDTH - 0.1, h, 0.6, mat.obstacle, 0, 0, 0), o.t, x, CFG.HIGH_CLEARANCE + h / 2);
          place(box(0.22, CFG.HIGH_CLEARANCE, 0.22, mat.torchWood, 0, 0, 0), o.t, x + CFG.LANE_WIDTH / 2 - 0.2, CFG.HIGH_CLEARANCE / 2);
        } else { // WALL
          place(box(CFG.LANE_WIDTH - 0.1, 2.6, 0.7, mat.obstacle, 0, 0, 0), o.t, x, 1.3);
        }
      }
    }

    /* --- Pièces --- */
    for (const c of node.coins) {
      const m = new THREE.Mesh(geo.coin, mat.coin);
      m.userData.coin = c;
      place(m, c.t, CFG.LANE_X[c.lane], c.y);
      if (!g.userData.coins) g.userData.coins = [];
      g.userData.coins.push(m);
    }

    /* --- Décor : arbres morts, colonnes en ruine, runes violettes --- */
    const rng = Track.makeRng(node.index * 9176 + 13);
    for (let i = 0; i < 14; i++) {
      const t = rng() * node.length;
      const side = rng() < 0.5 ? -1 : 1;
      const off = side * (CFG.TRACK_WIDTH / 2 + 2.5 + rng() * 16);
      const kind = rng();
      if (kind < 0.55) {
        const h = 3.5 + rng() * 4;
        place(box(0.5, h, 0.5, mat.bark, 0, 0, 0), t, off, h / 2);
        for (let b = 0; b < 3; b++) {
          const bm = box(0.2, 0.2, 1.6 + rng(), mat.barkDark, 0, 0, 0);
          bm.rotation.set((rng() - 0.5) * 1.2, rng() * 6.28, (rng() - 0.5) * 1.4);
          place(bm, t, off, h * (0.55 + rng() * 0.4));
        }
      } else if (kind < 0.85) {
        const h = 2 + rng() * 6;
        place(box(1.5, h, 1.5, mat.edge, 0, 0, 0), t, off, h / 2 - 1);
      } else {
        const rn = new THREE.Mesh(geo.plane, mat.rune);
        rn.scale.set(1.6, 1.6, 1);
        rn.rotation.x = -Math.PI / 2;
        place(rn, t, off, 0.05);
      }
    }

    /* --- Balise de virage : deux piliers violets bien visibles au coin --- */
    if (node.turn !== 0) {
      for (const side of [-1, 1]) {
        const p = box(0.7, 5, 0.7, mat.edge, 0, 0, 0);
        place(p, node.length - 1, side * (CFG.TRACK_WIDTH / 2 + 0.6), 2.5);
        const glow = new THREE.Mesh(geo.plane, mat.rune);
        glow.scale.set(1.1, 4, 1);
        place(glow, node.length - 1.5, side * (CFG.TRACK_WIDTH / 2 + 0.6), 2.5);
      }
      // Flèche au sol, du côté où il faut tourner.
      const arrow = new THREE.Mesh(geo.plane, mat.rune);
      arrow.scale.set(4.5, 2.4, 1);
      arrow.rotation.x = -Math.PI / 2;
      place(arrow, node.length - 6, node.turn * 2.2, 0.06);
    }

    scene.add(g);
    nodeGroups.set(node.index, g);
    node.group = g;
  }

  function dropNode(node) {
    const g = nodeGroups.get(node.index);
    if (!g) return;
    scene.remove(g);
    g.traverse(o => { if (o.isMesh && o.geometry && o.geometry !== geo.box && o.geometry !== geo.coin && o.geometry !== geo.plane) o.geometry.dispose(); });
    flames = flames.filter(fl => fl.parent !== g);
    nodeGroups.delete(node.index);
    node.group = null;
  }

  function clearAll() {
    for (const [, g] of nodeGroups) scene.remove(g);
    nodeGroups.clear();
    flames = [];
  }

  /* ----------------------------------------------------------- ANIMATION */
  function updatePlayer(player, now) {
    if (!player.node()) return;   // garde : un tronçon peut manquer une frame
    const p = player.worldPos();
    playerMesh.position.set(p.x, p.y, p.z);
    playerMesh.rotation.y = dirYaw(player.node().dir);

    // roll : 0 debout -> 1 couché à plat sur le flanc, lissé en entrée/sortie
    // (voir Player.slideRoll : monte, tient, redescend avant la fin de glissade).
    const roll = player.slideRoll(now);
    const { pelvis, armL, armR } = playerRig;

    // Bascule du bassin (et donc tout le torse/tête/jambes accrochés dessus) :
    // rotation négative sur Z envoie le bras DROIT vers le bas (voir plus bas),
    // c'est physiquement lui qui prend appui au sol pendant la glissade.
    pelvis.rotation.z = -CFG.SLIDE_ROLL_ANGLE * roll;
    playerMesh.position.y = p.y - CFG.SLIDE_DROP * roll; // colle le flanc au sol

    // Course : jambes en opposition de phase, figées en l'air, coupée en glissade
    // (les jambes se resserrent et filent droit derrière une fois sur le flanc).
    const runSwing = player.grounded ? Math.sin(now / 62) * 0.55 : 0.35;
    const swing = runSwing * (1 - roll);
    playerLegs[0].position.z = swing * 0.5 + roll * 0.3;
    playerLegs[1].position.z = -swing * 0.5 + roll * 0.3;
    const legLift = 0.4 + Math.abs(swing) * 0.08;
    playerLegs[0].position.y = legLift;
    playerLegs[1].position.y = legLift;
    playerLegs[0].position.x = -0.24 * (1 - roll * 0.5);
    playerLegs[1].position.x = 0.24 * (1 - roll * 0.5);

    // Bras droit : passe de "le long du corps" à "tendu au sol", avec un
    // léger va-et-vient pour donner l'impression qu'il contrôle la glissade
    // (freinage / appui), au lieu de traîner passivement.
    const drag = Math.sin(now / 55) * 0.12 * roll;
    armR.rotation.z = -1.15 * roll + drag;
    armR.position.set(0.62 + 0.35 * roll, (1.15 - CFG.SLIDE_PELVIS_Y) - 0.55 * roll, 0.18 * roll);

    // Bras gauche : se replie contre le torse, hors du chemin.
    armL.rotation.z = 0.9 * roll;
    armL.position.set(-0.62 + 0.22 * roll, (1.15 - CFG.SLIDE_PELVIS_Y) + 0.1 * roll, -0.1 * roll);

    torchLight.position.set(p.x, p.y + 2.4, p.z);
  }

  function updateWolves(pack, player, now) {
    const pos = pack.positions(player, now);
    for (let i = 0; i < wolfMeshes.length; i++) {
      const m = wolfMeshes[i];
      if (i >= pos.length) { m.visible = false; continue; }
      m.visible = true;
      m.position.set(pos[i].x, pos[i].y, pos[i].z);
      // Orientation : on regarde vers le joueur, ça suffit largement.
      const loc = pack.track.locate(Math.max(0, player.totalDist - pack.gap - pack.offsets[i].back));
      m.rotation.y = dirYaw(loc.node.dir);
    }
  }

  function updateAmbient(now, danger) {
    for (const fl of flames) {
      fl.rotation.y = 0; // les plans regardent la caméra
      fl.lookAt(camera.position);
      const s = 0.8 + Math.sin(now / 90 + fl.userData.phase) * 0.18;
      fl.scale.set(0.75 * s, 1.0 * s, 1);
    }
    for (const [, g] of nodeGroups) {
      if (!g.userData.coins) continue;
      for (const c of g.userData.coins) {
        c.rotation.y += 0.06;
        c.visible = !c.userData.coin.taken;
      }
    }
    // Plus les loups sont proches, plus la scène vire au rouge sombre.
    const c = new THREE.Color(CFG.COL_FOG).lerp(new THREE.Color(0x3a0d12), danger * 0.8);
    scene.fog.color.copy(c);
    scene.background.copy(new THREE.Color(CFG.COL_SKY).lerp(new THREE.Color(0x40101c), danger * 0.7));
    torchLight.intensity = 1.5 + Math.sin(now / 110) * 0.18;
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(Math.max(1, Math.round(w / CFG.PIXEL_SCALE)), Math.max(1, Math.round(h / CFG.PIXEL_SCALE)), false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render() { renderer.render(scene, camera); }

  return {
    init, buildNode, dropNode, clearAll, updatePlayer, updateWolves, updateAmbient, render, resize,
    get camera() { return camera; },
    get scene() { return scene; },
    get playerMesh() { return playerMesh; },
  };
})();
