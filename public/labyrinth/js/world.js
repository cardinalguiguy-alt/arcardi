/* =============================================================================
   world.js — TOUT THREE.JS, ET RIEN QUE THREE.JS.
   -----------------------------------------------------------------------------
   ⚠️ CE FICHIER NE DÉCIDE DE RIEN. Il lit l'état produit par rules.js et le
   dessine. Aucune règle de jeu, aucune collision, aucune distance de combat.
   C'est ce partage qui rend tools/simulate-maze.mjs capable de JOUER le jeu
   sans navigateur, et c'est lui qui a permis de trouver sept défauts avant
   d'avoir écrit une seule ligne de rendu.

   La conséquence à respecter : si un jour on a besoin ici d'un nombre qui
   change quelque chose (une portée, une vitesse), il ne se met pas ici. Il va
   dans config.js et se lit dans rules.js.

   ---------------------------------------------------------------------------
   LES MURS SONT LES BOÎTES DE COLLISION, littéralement
   ---------------------------------------------------------------------------
   buildWalls() ne recalcule PAS la géométrie du labyrinthe : il parcourt
   Rules.buildBoxes(), c'est-à-dire exactement la liste que le moteur utilise
   pour arrêter le joueur. Un mur visible qu'on traverse ou un mur invisible
   qui bloque sont donc impossibles par construction, et pas seulement
   improbables. (Leçon du zip 387 : deux descriptions d'une même chose
   finissent toujours par diverger.)
   ========================================================================== */

const World = (function () {

  let THREE_, scene, camera, renderer;
  let torchLight, ambient, beaconMat, lakeMat;
  const tex = {};
  let player, sword3, torchMesh, flameMesh;
  let roamerMeshes = [], stalkerMesh, brazierMeshes = [], shardMeshes = [], potionMeshes = [];
  let holeGlows = [];
  let skin = null;
  let cam = { x: 0, y: 0, z: 0 };
  let flameCuts = [];
  let CFG_, ST_;

  function canvasTex(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"));
    const t = new THREE_.CanvasTexture(c);
    t.magFilter = THREE_.NearestFilter;      // pixel franc : c'est la signature du site
    t.minFilter = THREE_.NearestMipmapNearestFilter;
    t.wrapS = t.wrapT = THREE_.RepeatWrapping;
    return t;
  }

  function buildTextures(cfg) {
    tex.wall = canvasTex(128, 128, (c) => Paint.wall(c, cfg, 128, 128, 1));
    tex.wall2 = canvasTex(128, 128, (c) => Paint.wall(c, cfg, 128, 128, 7));
    tex.floor = canvasTex(96, 96, (c) => Paint.floor(c, cfg, 96, 96, 3));
    tex.lake = canvasTex(128, 128, (c) => Paint.lake(c, cfg, 128, 128));
    tex.lake.repeat.set(18, 18);
    tex.wood = canvasTex(16, 64, (c) => Paint.wood(c, cfg, 16, 64));
    tex.rune = canvasTex(48, 96, (c) => Paint.rune(c, cfg, 48, 96));
    /* QUATRE DÉCOUPES DE FLAMME, comme au défi de fuite. Une flamme animée par
       une seule image tourne visiblement en boucle ; quatre découpes tirées à
       des cadences différentes par torche font que deux torches ne vacillent
       jamais ensemble — c'est ce détail-là qui fait « feu » plutôt que
       « sprite orange ». */
    flameCuts = [0, 1, 2, 3].map(i => canvasTex(32, 48, (c) => Paint.flame(c, cfg, 32, 48, i)));
  }

  /* -----------------------------------------------------------------------
     LE DÉCOR FIXE
     -------------------------------------------------------------------- */
  function buildWalls(cfg, m, st) {
    const boxes = st.boxes;
    const geoCache = new Map();
    const matX = new THREE_.MeshLambertMaterial({ map: tex.wall });
    const matZ = new THREE_.MeshLambertMaterial({ map: tex.wall2 });
    const group = new THREE_.Group();
    for (const b of boxes) {
      const w = b.x1 - b.x0, d = b.z1 - b.z0;
      const key = w.toFixed(2) + "x" + d.toFixed(2);
      let g = geoCache.get(key);
      if (!g) { g = new THREE_.BoxGeometry(w, cfg.WALL_H, d); geoCache.set(key, g); }
      const mesh = new THREE_.Mesh(g, w > d ? matX : matZ);
      mesh.position.set((b.x0 + b.x1) / 2, cfg.WALL_H / 2, (b.z0 + b.z1) / 2);
      group.add(mesh);
    }
    scene.add(group);
  }

  /* Le SOL, cellule par cellule — et les cellules percées n'en reçoivent pas.
     C'est la traduction la plus directe possible de la règle : un trou n'est
     pas une texture noire, c'est une DALLE ABSENTE. On voit le lac dessous
     parce qu'il est réellement dessous. */
  function buildFloor(cfg, m, st) {
    const g = new THREE_.PlaneGeometry(cfg.CELL, cfg.CELL);
    const mat = new THREE_.MeshLambertMaterial({ map: tex.floor });
    const group = new THREE_.Group();
    for (let y = 0; y < m.G; y++) for (let x = 0; x < m.G; x++) {
      const j = m.idx(x, y);
      if (st.gaps.has(j)) continue;
      if (!m.cells[j]) continue;
      const mesh = new THREE_.Mesh(g, mat);
      mesh.rotation.x = -Math.PI / 2;
      const [wx, wz] = Rules.centerOf(cfg, x, y);
      mesh.position.set(wx, 0, wz);
      mesh.userData.cell = j;
      group.add(mesh);
    }
    scene.add(group);
    return group;
  }

  function buildLake(cfg, m) {
    const g = new THREE_.PlaneGeometry(m.G * cfg.CELL * 2.2, m.G * cfg.CELL * 2.2);
    lakeMat = new THREE_.MeshBasicMaterial({ map: tex.lake });
    const mesh = new THREE_.Mesh(g, lakeMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(m.G * cfg.CELL / 2, cfg.LAKE_Y, m.G * cfg.CELL / 2);
    scene.add(mesh);
  }

  /* LE PHARE de la sortie. Un cylindre additif qui monte bien au-dessus des
     murs — voir le commentaire de BEACON_H dans config.js : c'est le seul
     repère de navigation du jeu, et sans lui l'oracle ne terminait aucune
     partie en huit minutes. */
  function buildBeacon(cfg, m) {
    const g = new THREE_.CylinderGeometry(cfg.BEACON_R, cfg.BEACON_R * 1.8, cfg.BEACON_H, 8, 1, true);
    beaconMat = new THREE_.MeshBasicMaterial({
      color: cfg.COL_PURPLE, transparent: true, opacity: 0.42,
      blending: THREE_.AdditiveBlending, side: THREE_.DoubleSide, depthWrite: false,
    });
    const mesh = new THREE_.Mesh(g, beaconMat);
    const [wx, wz] = Rules.centerOf(cfg, m.exit.x, m.exit.y);
    mesh.position.set(wx, cfg.BEACON_H / 2 - 2, wz);
    scene.add(mesh);
  }

  /* La lueur qui monte d'un trou. Elle sert le jeu autant que le décor : c'est
     ce qui rend un trou ouvert visible d'un couloir de distance, donc évitable
     — la condition pour que tomber soit une faute et non un tirage au sort. */
  function buildHoleGlows(cfg, m, st) {
    const g = new THREE_.CylinderGeometry(cfg.CELL * 0.42, cfg.CELL * 0.42, cfg.LAKE_GLOW_UP, 6, 1, true);
    const mat = new THREE_.MeshBasicMaterial({
      color: cfg.COL_LAKE_GLOW, transparent: true, opacity: 0.5,
      blending: THREE_.AdditiveBlending, side: THREE_.DoubleSide, depthWrite: false,
    });
    for (const j of st.gaps) {
      const x = j % m.G, y = (j / m.G) | 0;
      const [wx, wz] = Rules.centerOf(cfg, x, y);
      const mesh = new THREE_.Mesh(g, mat);
      mesh.position.set(wx, cfg.LAKE_GLOW_UP / 2 - 0.4, wz);
      scene.add(mesh);
      holeGlows.push(mesh);
    }
  }

  function brazier(cfg) {
    const grp = new THREE_.Group();
    const post = new THREE_.Mesh(
      new THREE_.BoxGeometry(0.34, 2.5, 0.34),
      new THREE_.MeshLambertMaterial({ map: tex.wood }));
    post.position.y = 1.25;
    grp.add(post);
    const stele = new THREE_.Mesh(
      new THREE_.BoxGeometry(0.9, 1.8, 0.28),
      new THREE_.MeshLambertMaterial({ map: tex.rune }));
    stele.position.set(0, 0.9, -0.45);
    grp.add(stele);
    const fl = new THREE_.Mesh(
      new THREE_.PlaneGeometry(1.0, 1.5),
      new THREE_.MeshBasicMaterial({
        map: flameCuts[0], transparent: true, blending: THREE_.AdditiveBlending, depthWrite: false }));
    fl.position.y = 3.0;
    grp.add(fl);
    grp.userData.flame = fl;
    return grp;
  }

  function buildProps(cfg, m, st) {
    for (const t of st.torches) {
      const g = brazier(cfg);
      const [wx, wz] = Rules.centerOf(cfg, t.x, t.y);
      g.position.set(wx, 0, wz);
      scene.add(g);
      brazierMeshes.push({ g, t });
    }
    if (st.sword) {
      const grp = new THREE_.Group();
      const altar = new THREE_.Mesh(
        new THREE_.BoxGeometry(1.6, 0.7, 1.6),
        new THREE_.MeshLambertMaterial({ map: tex.rune }));
      altar.position.y = 0.35;
      grp.add(altar);
      const blade = new THREE_.Mesh(
        new THREE_.BoxGeometry(0.14, 1.5, 0.34),
        new THREE_.MeshBasicMaterial({ color: cfg.COL_STEEL }));
      blade.position.y = 1.5;
      grp.add(blade);
      const guard = new THREE_.Mesh(
        new THREE_.BoxGeometry(0.7, 0.14, 0.2),
        new THREE_.MeshBasicMaterial({ color: cfg.COL_STEEL_EDGE }));
      guard.position.y = 0.85;
      grp.add(guard);
      const [wx, wz] = Rules.centerOf(cfg, st.sword.x, st.sword.y);
      grp.position.set(wx, 0, wz);
      scene.add(grp);
      sword3 = grp;
    }
    const sg = new THREE_.OctahedronGeometry(0.36);
    const sm = new THREE_.MeshBasicMaterial({ color: cfg.COL_COIN });
    for (const s of st.shards) {
      const mesh = new THREE_.Mesh(sg, sm);
      const [wx, wz] = Rules.centerOf(cfg, s.x, s.y);
      mesh.position.set(wx, 1.1, wz);
      scene.add(mesh);
      shardMeshes.push({ mesh, s });
    }
    const pg = new THREE_.BoxGeometry(0.4, 0.6, 0.4);
    const pm = new THREE_.MeshBasicMaterial({ color: cfg.COL_MUSHROOM });
    for (const p of st.potions) {
      const mesh = new THREE_.Mesh(pg, pm);
      const [wx, wz] = Rules.centerOf(cfg, p.x, p.y);
      mesh.position.set(wx, 0.55, wz);
      scene.add(mesh);
      potionMeshes.push({ mesh, p });
    }
  }

  /* -----------------------------------------------------------------------
     LE FERMIER, en boîtes articulées — même squelette qu'au défi de fuite,
     et il PORTE LA TENUE DU JOUEUR (skin reçu dans vf-lab-init).
     -------------------------------------------------------------------- */
  function makeFarmer(cfg, sk) {
    const col = sk || {};
    const M = (c) => new THREE_.MeshLambertMaterial({ color: c });
    const grp = new THREE_.Group();
    const body = new THREE_.Mesh(new THREE_.BoxGeometry(0.85, 0.95, 0.5), M(col.shirt || cfg.COL_SHIRT));
    body.position.y = 1.35; grp.add(body);
    const legs = new THREE_.Mesh(new THREE_.BoxGeometry(0.75, 0.9, 0.45), M(col.pants || cfg.COL_PANTS));
    legs.position.y = 0.45; grp.add(legs);
    const head = new THREE_.Mesh(new THREE_.BoxGeometry(0.62, 0.6, 0.55), M(col.skin || cfg.COL_SKIN));
    head.position.y = 2.1; grp.add(head);
    const hair = new THREE_.Mesh(new THREE_.BoxGeometry(0.68, 0.22, 0.6), M(col.hair || cfg.COL_HAIR));
    hair.position.y = 2.42; grp.add(hair);
    // ⚠️ LA NUQUE EST DERRIÈRE. Le zip 377 a livré, pendant trois zips, un
    // fermier dont la nuque était du côté du visage — trouvé EN REGARDANT,
    // jamais en relisant. Le personnage regarde vers -Z ; la nuque est donc
    // en +Z, et cette ligne est la seule qui le dise.
    const nape = new THREE_.Mesh(new THREE_.BoxGeometry(0.6, 0.36, 0.1), M(col.hair || cfg.COL_HAIR));
    nape.position.set(0, 2.16, 0.29); grp.add(nape);

    const armL = new THREE_.Mesh(new THREE_.BoxGeometry(0.22, 0.8, 0.22), M(col.skin || cfg.COL_SKIN));
    armL.position.set(-0.55, 1.35, 0); grp.add(armL);
    const armR = new THREE_.Mesh(new THREE_.BoxGeometry(0.22, 0.8, 0.22), M(col.skin || cfg.COL_SKIN));
    armR.position.set(0.55, 1.35, 0); grp.add(armR);
    grp.userData.armL = armL; grp.userData.armR = armR;

    // LA TORCHE, dans la main GAUCHE (l'épée occupe la droite).
    const t = new THREE_.Group();
    const stick = new THREE_.Mesh(new THREE_.BoxGeometry(0.12, 0.9, 0.12),
      new THREE_.MeshLambertMaterial({ map: tex.wood }));
    stick.position.y = -0.1; t.add(stick);
    const head2 = new THREE_.Mesh(new THREE_.BoxGeometry(0.2, 0.22, 0.2), M(0x1a1512));
    head2.position.y = 0.42; t.add(head2);
    const fl = new THREE_.Mesh(new THREE_.PlaneGeometry(0.75, 1.05),
      new THREE_.MeshBasicMaterial({
        map: flameCuts[0], transparent: true, blending: THREE_.AdditiveBlending, depthWrite: false }));
    fl.position.y = 1.05; t.add(fl);
    t.position.set(-0.72, 1.5, -0.15);
    grp.add(t);
    torchMesh = t; flameMesh = fl;

    // L'ÉPÉE, cachée tant qu'on ne l'a pas.
    const sw = new THREE_.Group();
    const blade = new THREE_.Mesh(new THREE_.BoxGeometry(0.1, 1.25, 0.26),
      new THREE_.MeshBasicMaterial({ color: cfg.COL_STEEL }));
    blade.position.y = 0.62; sw.add(blade);
    const guard = new THREE_.Mesh(new THREE_.BoxGeometry(0.45, 0.1, 0.16),
      new THREE_.MeshBasicMaterial({ color: cfg.COL_STEEL_EDGE }));
    sw.add(guard);
    sw.position.set(0.72, 1.35, -0.2);
    sw.visible = false;
    grp.add(sw);
    grp.userData.sword = sw;
    return grp;
  }

  function makeRoamer(cfg) {
    const grp = new THREE_.Group();
    const M = (c) => new THREE_.MeshLambertMaterial({ color: c });
    const body = new THREE_.Mesh(new THREE_.BoxGeometry(1.0, 1.5, 0.8), M(cfg.COL_WOLF));
    body.position.y = 0.95; grp.add(body);
    const head = new THREE_.Mesh(new THREE_.BoxGeometry(0.7, 0.6, 0.7), M(cfg.COL_BARK_DARK));
    head.position.y = 1.95; grp.add(head);
    for (const s of [-1, 1]) {
      const eye = new THREE_.Mesh(new THREE_.BoxGeometry(0.14, 0.14, 0.06),
        new THREE_.MeshBasicMaterial({ color: cfg.COL_WOLF_EYE }));
      eye.position.set(s * 0.18, 2.0, -0.36); grp.add(eye);
    }
    return grp;
  }

  /* LE TRAQUEUR est plus GRAND que le joueur et plus étroit — la silhouette
     doit se reconnaître en une image, dans un couloir, à la limite de la
     lumière. Ses yeux sont le seul élément non affecté par le brouillard :
     on les voit avant lui, et c'est tout ce qu'on veut. */
  function makeStalker(cfg) {
    const grp = new THREE_.Group();
    const M = (c) => new THREE_.MeshLambertMaterial({ color: c });
    const body = new THREE_.Mesh(new THREE_.BoxGeometry(0.75, 2.3, 0.6), M(cfg.COL_STALKER));
    body.position.y = 1.35; grp.add(body);
    const head = new THREE_.Mesh(new THREE_.BoxGeometry(0.55, 0.7, 0.55), M(cfg.COL_STALKER));
    head.position.y = 2.85; grp.add(head);
    for (const s of [-1, 1]) {
      const eye = new THREE_.Mesh(new THREE_.BoxGeometry(0.1, 0.2, 0.05),
        new THREE_.MeshBasicMaterial({ color: cfg.COL_STALKER_EYE, fog: false }));
      eye.position.set(s * 0.15, 2.9, -0.3); grp.add(eye);
    }
    for (const s of [-1, 1]) {
      const arm = new THREE_.Mesh(new THREE_.BoxGeometry(0.16, 1.6, 0.16), M(cfg.COL_STALKER));
      arm.position.set(s * 0.5, 1.5, 0); grp.add(arm);
    }
    return grp;
  }

  /* =======================================================================
     API
     ======================================================================= */
  function init(cfg, m, st, canvas, sk) {
    THREE_ = window.THREE;
    CFG_ = cfg; ST_ = st; skin = sk;

    /* ⚠️ ON REPART DE ZÉRO, ET CETTE LIGNE-CI EST UN CORRECTIF, PAS DE
       L'HYGIÈNE. Les collections ci-dessous vivent au niveau du module :
       sans cette remise à zéro, un second appel à init() les CUMULAIT. En
       jeu, init() est rappelé à chaque nouvelle partie (game.js/newRun) —
       donc dès la première fois qu'on rejoue après être mort, roamerMeshes
       contenait dix entrées pour cinq rôdeurs, et sync() jetait sur
       `st.roamers[5].dead` à la première image. Une partie sur deux plantait,
       et c'est exactement la seconde partie : celle qu'on joue toujours.

       Trouvé par tools/smoke-render.mjs à sa deuxième graine. Aucune
       relecture ne l'aurait vu : chaque ligne prise séparément est juste. */
    roamerMeshes = [];
    brazierMeshes = [];
    shardMeshes = [];
    potionMeshes = [];
    holeGlows = [];
    stalkerMesh = null; sword3 = null; player = null;
    torchMesh = null; flameMesh = null;

    scene = new THREE_.Scene();
    scene.fog = new THREE_.Fog(cfg.COL_FOG, cfg.FOG_NEAR_FULL, cfg.FOG_FAR_FULL);
    scene.background = new THREE_.Color(cfg.SKY_TOP);

    camera = new THREE_.PerspectiveCamera(72, 1, 0.1, 400);
    renderer = new THREE_.WebGLRenderer({ canvas, antialias: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

    buildTextures(cfg);
    buildWalls(cfg, m, st);
    buildFloor(cfg, m, st);
    buildLake(cfg, m);
    buildBeacon(cfg, m);
    buildHoleGlows(cfg, m, st);
    buildProps(cfg, m, st);

    /* L'ÉCLAIRAGE EST LA TORCHE, et presque rien d'autre. L'ambiante est
       volontairement misérable : c'est elle qui décide si le jeu est
       angoissant ou seulement sombre. À 0,06 on distingue la silhouette d'un
       mur à trois mètres et rien de plus, ce qui est exactement le contrat
       passé avec le joueur — la lumière est une ressource. */
    ambient = new THREE_.AmbientLight(0x3a2f52, 0.06);
    scene.add(ambient);
    torchLight = new THREE_.PointLight(cfg.COL_TORCH, 2.4, cfg.TORCH_LIGHT_MAX, 1.6);
    scene.add(torchLight);
    // Une seconde source, froide et très faible, montant du lac : sans elle
    // les trous ne se lisent pas comme des trous mais comme des taches.
    const under = new THREE_.PointLight(cfg.COL_PURPLE, 0.5, 26, 2);
    under.position.set(m.G * cfg.CELL / 2, cfg.LAKE_Y + 1, m.G * cfg.CELL / 2);
    scene.add(under);

    player = makeFarmer(cfg, sk);
    scene.add(player);
    for (const r of st.roamers) { const g = makeRoamer(cfg); scene.add(g); roamerMeshes.push(g); }
    stalkerMesh = makeStalker(cfg);
    stalkerMesh.visible = false;
    scene.add(stalkerMesh);

    cam.x = st.px; cam.y = cfg.CAM_HEIGHT; cam.z = st.pz + cfg.CAM_DIST;
    resize();
  }

  function resize() {
    if (!renderer) return;
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* -----------------------------------------------------------------------
     sync — l'unique fonction appelée par la boucle. Elle LIT l'état.
     -------------------------------------------------------------------- */
  function sync(st, now) {
    const cfg = CFG_;
    const fl = Rules.flameLevel(st);
    const t = now / 1000;

    // --- personnage
    player.position.set(st.px, 0, st.pz);
    player.rotation.y = st.ang;
    player.visible = st.status !== "falling" || (now % 200 < 120);
    const bob = Math.sin(t * 9) * Math.min(1, st.speed / cfg.WALK_SPEED);
    player.userData.armL.rotation.x = bob * 0.5;
    player.userData.armR.rotation.x = -bob * 0.5;
    player.userData.sword.visible = st.hasSword;
    if (st.hasSword) {
      // Le geste : l'épée balaie de la droite vers l'avant sur SWING_MS.
      const k = st.swingT > 0 ? 1 - st.swingT / (cfg.SWING_MS / 1000) : 0;
      player.userData.sword.rotation.z = st.swingT > 0 ? -1.5 + k * 2.6 : -0.25;
      player.userData.sword.rotation.x = st.swingT > 0 ? -0.9 + k * 0.9 : 0;
    }
    if (sword3) sword3.visible = !(st.sword && st.sword.taken);
    if (sword3 && sword3.visible) sword3.rotation.y = t * 0.9;

    // --- la flamme du joueur : vacillement + découpe qui tourne
    const cut = flameCuts[((t * 11) | 0) % 4];
    if (flameMesh.material.map !== cut) flameMesh.material.map = cut;
    const flick = 1 + Math.sin(t * 17.3) * cfg.TORCH_FLICKER + Math.sin(t * 6.1) * cfg.TORCH_FLICKER * 0.6;
    const scale = 0.35 + fl.k * 0.9;
    flameMesh.scale.set(scale * flick, scale * flick, 1);
    flameMesh.visible = st.flame > 0;
    // La flamme fait toujours face à la caméra : un plan vu par la tranche
    // disparaît, et une flamme qui disparaît quand on tourne est le genre de
    // défaut qu'on ne voit qu'en jouant.
    flameMesh.lookAt(camera.position);

    torchLight.position.set(st.px - Math.cos(st.ang) * 0.7, 2.6, st.pz + Math.sin(st.ang) * 0.7);
    torchLight.distance = cfg.TORCH_LIGHT_MIN + (cfg.TORCH_LIGHT_MAX - cfg.TORCH_LIGHT_MIN) * fl.k;
    torchLight.intensity = (0.4 + fl.k * 2.2) * flick;

    scene.fog.near = cfg.FOG_NEAR_EMBER + (cfg.FOG_NEAR_FULL - cfg.FOG_NEAR_EMBER) * fl.k;
    scene.fog.far = cfg.FOG_FAR_EMBER + (cfg.FOG_FAR_FULL - cfg.FOG_FAR_EMBER) * fl.k;

    // --- brasiers
    for (const b of brazierMeshes) {
      const f = b.g.userData.flame;
      f.visible = !b.t.spent;
      if (!b.t.spent) {
        f.material.map = flameCuts[(((t * 9) | 0) + b.t.x + b.t.y) % 4];
        const k2 = 1 + Math.sin(t * 13 + b.t.x * 2.1) * 0.14;
        f.scale.set(k2, k2, 1);
        f.lookAt(camera.position);
      }
    }

    // --- ramassables
    for (const s of shardMeshes) {
      s.mesh.visible = !s.s.taken;
      s.mesh.rotation.y = t * CFG_.SHARD_SPIN;
      s.mesh.position.y = 1.1 + Math.sin(t * 2.2 + s.s.x) * CFG_.SHARD_BOB;
    }
    for (const p of potionMeshes) p.mesh.visible = !p.p.taken;

    // --- créatures
    for (let i = 0; i < roamerMeshes.length; i++) {
      const r = st.roamers[i], g = roamerMeshes[i];
      g.visible = !r.dead;
      g.position.set(r.x, 0, r.z);
      g.rotation.y = r.ang;
    }
    stalkerMesh.visible = st.stalkerAwake;
    if (st.stalkerAwake) {
      stalkerMesh.position.set(st.stalker.x, 0, st.stalker.z);
      stalkerMesh.rotation.y = st.stalker.ang;
      // Il « respire » : une oscillation lente de la hauteur. C'est le seul
      // signe de vie qu'on ait de lui tant qu'il n'y a pas de son.
      stalkerMesh.position.y = Math.sin(t * 2.6) * 0.08;
    }

    // --- lac et phare
    lakeMat.map.offset.x = t * 0.02;
    lakeMat.map.offset.y = t * 0.013;
    beaconMat.opacity = 0.3 + Math.sin(t * Math.PI * 2 * CFG_.BEACON_PULSE) * 0.14;

    // --- caméra
    updateCamera(st, cfg);
    renderer.render(scene, camera);
  }

  /* LA CAMÉRA NE TRAVERSE PAS LES MURS. Elle voudrait se poser à CAM_DIST
     derrière le joueur ; si de la maçonnerie se trouve sur ce segment, elle se
     rapproche jusqu'à CAM_MIN_DIST. Sans ça, tout virage serré dans un couloir
     de 4,8 unités met la caméra DANS la pierre et l'écran devient noir — le
     défaut le plus banal du genre, et le plus insupportable. */
  function updateCamera(st, cfg) {
    const back = cfg.CAM_DIST;
    let d = back;
    const dirX = Math.sin(st.ang), dirZ = Math.cos(st.ang);   // vers l'arrière
    for (let s = 0.4; s <= back; s += 0.4) {
      const tx = st.px + dirX * s, tz = st.pz + dirZ * s;
      const near = st.idxB.near(tx, tz);
      const [ox, oz] = Rules.pushOut(tx, tz, 0.55, near);
      if (Math.abs(ox - tx) > 0.01 || Math.abs(oz - tz) > 0.01) { d = Math.max(cfg.CAM_MIN_DIST, s - 0.5); break; }
    }
    const wantX = st.px + dirX * d, wantZ = st.pz + dirZ * d;
    const k = Math.min(1, cfg.CAM_LAG * 0.016);
    cam.x += (wantX - cam.x) * k;
    cam.z += (wantZ - cam.z) * k;
    cam.y += (cfg.CAM_HEIGHT - cam.y) * k;
    const shake = st.camShake;
    camera.position.set(
      cam.x + (Math.random() - 0.5) * shake,
      cam.y + (Math.random() - 0.5) * shake,
      cam.z + (Math.random() - 0.5) * shake);
    // Pendant la chute, on regarde EN BAS : c'est le seul moment où le lac est
    // le sujet, et il faut qu'on le voie arriver.
    const lookY = st.status === "falling" ? cfg.LAKE_Y : cfg.CAM_LOOK_H;
    camera.lookAt(st.px, lookY, st.pz);
  }

  function fallStep(st, dt) {
    // La chute est purement visuelle : rules.js a déjà tranché le sort du
    // joueur. On ne fait que descendre le personnage vers l'eau.
    player.position.y -= dt * 14;
  }

  return { init, sync, resize, fallStep, get renderer() { return renderer; } };
})();
