/* =============================================================================
   world.js — TOUT THREE.JS, ET RIEN QUE THREE.JS.
   -----------------------------------------------------------------------------
   ⚠️ CE FICHIER NE DÉCIDE DE RIEN. Il lit l'état produit par rules.js et le
   dessine. Aucune règle de jeu, aucune collision, aucune distance de combat.
   Si un jour on a besoin ici d'un nombre qui change quelque chose, il ne se met
   pas ici : il va dans config.js et se lit dans rules.js.

   LES MURS SONT LES BOÎTES DE COLLISION, littéralement : buildWalls() parcourt
   Rules.buildBoxes(), la liste que le moteur utilise pour arrêter le joueur. Un
   mur visible qu'on traverse est impossible par construction.

   ===========================================================================
   ZIP 394 — REFONTE COMPLÈTE DU RENDU, D'APRÈS LES DEUX IMAGES DE GUILLAUME
   ---------------------------------------------------------------------------
   Retour : « reprends les graphismes pour que ce soit plus impressionnant »,
   avec deux captures données comme cibles littérales. Six ajouts, tous relevés
   sur elles :

     1. UN CIEL. Violet, avec pyramides et arbres morts. La première version
        n'en avait pas : au-dessus des murs, il n'y avait que du brouillard
        noir, et un labyrinthe à ciel ouvert ressemblait à une cave sans
        plafond ;
     2. DES TORCHES MURALES PARTOUT, sur potence de bois — c'est l'élément le
        plus présent des deux images, et il n'existait pas (on n'avait que les
        brasiers ravivables, un tous les huit mètres) ;
     3. DES POUTRES ET UN PLAFOND PARTIEL, avec des ouvertures déchiquetées sur
        le ciel (image 2) ;
     4. DES TROUS DÉCHIQUETÉS, faits de sous-dalles retirées une à une, et non
        plus d'une case carrée manquante ;
     5. UN LAC LUMINEUX qui tourne au fond des trous et les éclaire par en
        dessous ;
     6. DES ÉCLATS EN SPHÈRES À HALO, violets et cyans, comme les orbes des
        images.

   ⚠️ LA CONSÉQUENCE LA PLUS IMPORTANTE N'EST PAS GRAPHIQUE : le lieu est
   maintenant ÉCLAIRÉ. Les images de Guillaume ne montrent pas un jeu noir mais
   une ruine chaude et lisible. L'ambiante est donc passée de 0,06 à 0,30, et
   les torches murales portent leur propre lumière. La torche du joueur ne fait
   plus la différence entre « voir » et « ne rien voir » mais entre « voir loin »
   et « voir le pas suivant » — ce qui reste une tension, et correspond à sa
   demande de ne pas rendre le jeu trop difficile.
   ========================================================================== */

const World = (function () {

  let THREE_, scene, camera, renderer;
  let torchLight, ambient, hemi, beaconMat, lakeMat, skyMesh;
  const tex = {};
  let player, sword3, torchMesh, flameMesh;
  let roamerMeshes = [], stalkerMesh, brazierMeshes = [], shardMeshes = [], potionMeshes = [];
  let wallFlames = [], holeGlows = [];
  let skin = null;
  let cam = { x: 0, y: 0, z: 0 };
  let flameCuts = [];
  let CFG_, ST_;

  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"));
    const t = new THREE_.CanvasTexture(c);
    t.magFilter = THREE_.NearestFilter;      // pixel franc : signature du site
    t.minFilter = THREE_.NearestMipmapNearestFilter;
    t.wrapS = t.wrapT = THREE_.RepeatWrapping;
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
    return t;
  }

  function buildTextures(cfg) {
    tex.wall = canvasTex(128, 128, (c) => Paint.wall(c, cfg, 128, 128, 1));
    tex.wall2 = canvasTex(128, 128, (c) => Paint.wall(c, cfg, 128, 128, 7));
    tex.floor = canvasTex(128, 128, (c) => Paint.floor(c, cfg, 128, 128, 3));
    tex.lake = canvasTex(128, 128, (c) => Paint.lake(c, cfg, 128, 128), [10, 10]);
    tex.wood = canvasTex(16, 64, (c) => Paint.wood(c, cfg, 16, 64));
    tex.rune = canvasTex(48, 96, (c) => Paint.rune(c, cfg, 48, 96));
    tex.sky = canvasTex(1024, 256, (c) => Paint.sky(c, cfg, 1024, 256));
    tex.haloWarm = canvasTex(64, 64, (c) => Paint.halo(c, cfg, 64, 64, cfg.COL_TORCH));
    tex.haloCyan = canvasTex(64, 64, (c) => Paint.halo(c, cfg, 64, 64, cfg.COL_COIN_GLOW));
    tex.haloPurple = canvasTex(64, 64, (c) => Paint.halo(c, cfg, 64, 64, cfg.COL_PURPLE));
    /* QUATRE DÉCOUPES DE FLAMME. Une flamme animée par une seule image tourne
       visiblement en boucle ; quatre découpes tirées à des cadences
       différentes par torche font que deux torches ne vacillent jamais
       ensemble — c'est ce détail qui fait « feu » plutôt que « sprite ». */
    flameCuts = [0, 1, 2, 3].map(i => canvasTex(32, 48, (c) => Paint.flame(c, cfg, 32, 48, i)));
  }

  /* -----------------------------------------------------------------------
     LE CIEL. Une sphère retournée, sans brouillard.
     -----------------------------------------------------------------------
     `fog: false` est indispensable : un ciel pris par le brouillard vire à la
     couleur du brouillard, et on repeindrait en gris tout ce qu'on vient de
     peindre en violet. C'est aussi pourquoi les yeux du traqueur sont hors
     brouillard — on les voit avant lui, et c'est tout ce qu'on veut.
     -------------------------------------------------------------------- */
  function buildSky(cfg, m) {
    const R = m.G * cfg.CELL * 1.6;
    const g = new THREE_.SphereGeometry(R, 24, 12);
    const mat = new THREE_.MeshBasicMaterial({
      map: tex.sky, side: THREE_.BackSide, fog: false, depthWrite: false });
    skyMesh = new THREE_.Mesh(g, mat);
    skyMesh.position.set(m.G * cfg.CELL / 2, 0, m.G * cfg.CELL / 2);
    scene.add(skyMesh);
  }

  function buildWalls(cfg, m, st) {
    const geoCache = new Map();
    const matX = new THREE_.MeshLambertMaterial({ map: tex.wall });
    const matZ = new THREE_.MeshLambertMaterial({ map: tex.wall2 });
    const group = new THREE_.Group();
    for (const b of st.boxes) {
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

  /* -----------------------------------------------------------------------
     LE SOL, ET LES TROUS DÉCHIQUETÉS.
     -----------------------------------------------------------------------
     Une cellule saine = une dalle. Une cellule percée = une grille de
     SUB×SUB sous-dalles dont on retire celles qui tombent dans le trou, le
     trou étant défini par un rayon bruité — d'où le bord irrégulier de
     l'image 2, où l'on voit clairement des dalles à demi arrachées et des
     coins qui tiennent encore.

     ⚠️ CE N'EST QUE DU DÉCOR : le moteur, lui, considère la cellule entière
     comme un trou (voir handleFloor dans rules.js). Le bord déchiqueté ne
     doit donc PAS mordre au-delà de la cellule, sinon on verrait du sol là où
     l'on tombe. On le fait au contraire mordre un peu MOINS que la cellule
     (RAG_MAX < 0,5) : mieux vaut tomber en voyant encore un bout de dalle sous
     soi que marcher sur une dalle qui n'existe pas.
     -------------------------------------------------------------------- */
  function buildFloor(cfg, m, st) {
    const full = new THREE_.PlaneGeometry(cfg.CELL, cfg.CELL);
    const SUB = 6;
    const sub = new THREE_.PlaneGeometry(cfg.CELL / SUB, cfg.CELL / SUB);
    const mat = new THREE_.MeshLambertMaterial({ map: tex.floor });
    const group = new THREE_.Group();
    const RAG_MIN = 0.26, RAG_MAX = 0.46;
    for (let y = 0; y < m.G; y++) for (let x = 0; x < m.G; x++) {
      const j = m.idx(x, y);
      if (!m.cells[j]) continue;
      const [wx, wz] = Rules.centerOf(cfg, x, y);
      if (!st.gaps.has(j)) {
        const mesh = new THREE_.Mesh(full, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(wx, 0, wz);
        group.add(mesh);
        continue;
      }
      for (let sj = 0; sj < SUB; sj++) for (let si = 0; si < SUB; si++) {
        const fx = (si + 0.5) / SUB - 0.5, fz = (sj + 0.5) / SUB - 0.5;
        const ang = Math.atan2(fz, fx);
        // Rayon du trou, bruité par l'angle : c'est ce bruit-là qui fait le
        // bord déchiqueté plutôt qu'un disque propre.
        const wob = Paint.noise(j * 31 + ((ang * 3) | 0) * 7) * (RAG_MAX - RAG_MIN);
        const r = RAG_MIN + wob;
        if (Math.hypot(fx, fz) < r) continue;      // dans le trou : pas de dalle
        const mesh = new THREE_.Mesh(sub, mat);
        mesh.rotation.x = -Math.PI / 2;
        // Les sous-dalles du bord s'affaissent un peu : elles vont tomber.
        const sag = Math.max(0, 0.55 - Math.hypot(fx, fz)) * 1.6;
        mesh.position.set(wx + fx * cfg.CELL, -sag, wz + fz * cfg.CELL);
        group.add(mesh);
      }
    }
    scene.add(group);
    return group;
  }

  /* LE LAC. Un seul plan, très bas, avec sa texture qui DÉRIVE en continu —
     c'est la dérive qui fait le tourbillon, pas la texture. */
  function buildLake(cfg, m) {
    const g = new THREE_.PlaneGeometry(m.G * cfg.CELL * 2.4, m.G * cfg.CELL * 2.4);
    lakeMat = new THREE_.MeshBasicMaterial({ map: tex.lake, fog: false });
    const mesh = new THREE_.Mesh(g, lakeMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(m.G * cfg.CELL / 2, cfg.LAKE_Y, m.G * cfg.CELL / 2);
    scene.add(mesh);
  }

  /* La colonne de lumière qui monte de chaque trou, et le PHARE de la sortie.
     Même matière, deux tailles : le joueur apprend en une seconde que violet
     vertical = le vide, et que la sortie est un trou comme les autres — sauf
     que celui-là, on le prend. */
  function buildGlows(cfg, m, st) {
    const mat = new THREE_.MeshBasicMaterial({
      color: cfg.COL_LAKE_GLOW, transparent: true, opacity: 0.34,
      blending: THREE_.AdditiveBlending, side: THREE_.DoubleSide, depthWrite: false, fog: false });
    const g = new THREE_.CylinderGeometry(cfg.CELL * 0.30, cfg.CELL * 0.40, cfg.LAKE_GLOW_UP, 8, 1, true);
    for (const j of st.gaps) {
      const x = j % m.G, y = (j / m.G) | 0;
      const [wx, wz] = Rules.centerOf(cfg, x, y);
      const mesh = new THREE_.Mesh(g, mat);
      mesh.position.set(wx, cfg.LAKE_GLOW_UP / 2 - 1.0, wz);
      scene.add(mesh);
      holeGlows.push(mesh);
      // Une petite lampe violette au fond de chaque trou : c'est elle qui
      // éclaire le bord par en dessous, comme sur l'image 2.
      const lamp = new THREE_.PointLight(cfg.COL_PURPLE, 1.1, cfg.CELL * 2.6, 2);
      lamp.position.set(wx, -2.2, wz);
      scene.add(lamp);
    }
    const bg = new THREE_.CylinderGeometry(cfg.BEACON_R, cfg.BEACON_R * 2.2, cfg.BEACON_H, 10, 1, true);
    beaconMat = new THREE_.MeshBasicMaterial({
      color: cfg.COL_PURPLE, transparent: true, opacity: 0.4,
      blending: THREE_.AdditiveBlending, side: THREE_.DoubleSide, depthWrite: false, fog: false });
    const bm = new THREE_.Mesh(bg, beaconMat);
    const [ex, ez] = Rules.centerOf(cfg, m.exit.x, m.exit.y);
    bm.position.set(ex, cfg.BEACON_H / 2 - 3, ez);
    scene.add(bm);
  }

  /* -----------------------------------------------------------------------
     LA TORCHE MURALE SUR POTENCE — l'élément signature des deux images.
     -----------------------------------------------------------------------
     Un bras horizontal, une jambe de force en diagonale (les deux en bois),
     un fût court, une tête carbonisée, un corps de flamme peint et un halo
     additif. Six volumes par torche, et il y en a beaucoup : c'est le poste
     le plus coûteux du décor, et c'est celui qui fait l'image.

     ⚠️ ELLES NE SONT PAS INTERACTIVES. Les brasiers ravivables (voir plus bas)
     sont d'un autre modèle, avec une stèle à runes : dans un couloir où trente
     torches brûlent, il faut qu'on reconnaisse SANS HÉSITER celle qui sert.
     -------------------------------------------------------------------- */
  function wallTorch(cfg, seed) {
    const grp = new THREE_.Group();
    const woodMat = new THREE_.MeshLambertMaterial({ map: tex.wood });
    const arm = new THREE_.Mesh(new THREE_.BoxGeometry(0.26, 0.26, 1.5), woodMat);
    arm.position.set(0, 0, -0.62);
    grp.add(arm);
    const brace = new THREE_.Mesh(new THREE_.BoxGeometry(0.2, 1.15, 0.2), woodMat);
    brace.position.set(0, -0.5, -0.42);
    brace.rotation.x = 0.62;
    grp.add(brace);
    const stick = new THREE_.Mesh(new THREE_.BoxGeometry(0.22, 1.15, 0.22), woodMat);
    stick.position.set(0, 0.5, -1.15);
    grp.add(stick);
    const head = new THREE_.Mesh(new THREE_.BoxGeometry(0.3, 0.28, 0.3),
      new THREE_.MeshLambertMaterial({ color: 0x1a1512 }));
    head.position.set(0, 1.12, -1.15);
    grp.add(head);
    const fl = new THREE_.Mesh(new THREE_.PlaneGeometry(1.5, 2.1),
      new THREE_.MeshBasicMaterial({
        map: flameCuts[seed % 4], transparent: true,
        blending: THREE_.AdditiveBlending, depthWrite: false, fog: false }));
    fl.position.set(0, 2.05, -1.15);
    grp.add(fl);
    const halo = new THREE_.Mesh(new THREE_.PlaneGeometry(5.5, 5.5),
      new THREE_.MeshBasicMaterial({
        map: tex.haloWarm, transparent: true, opacity: 0.5,
        blending: THREE_.AdditiveBlending, depthWrite: false, fog: false }));
    halo.position.set(0, 2.0, -1.15);
    grp.add(halo);
    grp.userData.flame = fl;
    grp.userData.halo = halo;
    grp.userData.seed = seed;
    return grp;
  }

  /* Où poser les torches murales : sur chaque face FERMÉE d'une cellule, avec
     une probabilité. On les tire sur le même bruit déterministe que les
     textures — deux clients voient donc exactement le même couloir, ce qui
     compte le jour où la ferme affichera le labyrinthe à deux. */
  function buildWallTorches(cfg, m) {
    const SIDES = [
      { d: m.N, dx: 0, dz: -1, rot: Math.PI },
      { d: m.E, dx: 1, dz: 0, rot: -Math.PI / 2 },
      { d: m.S, dx: 0, dz: 1, rot: 0 },
      { d: m.W, dx: -1, dz: 0, rot: Math.PI / 2 },
    ];
    let k = 0, placed = 0;
    for (let y = 0; y < m.G; y++) for (let x = 0; x < m.G; x++) {
      const j = m.idx(x, y);
      if (!m.cells[j]) continue;
      for (const S of SIDES) {
        k++;
        if (m.linked(x, y, S.d)) continue;              // face ouverte : pas de mur
        if (Paint.noise(k * 17 + j) > cfg.WALL_TORCH_CHANCE) continue;
        const [wx, wz] = Rules.centerOf(cfg, x, y);
        const t = wallTorch(cfg, k);
        t.position.set(wx + S.dx * (cfg.CELL / 2 - cfg.WALL / 2 - 0.1),
                       cfg.WALL_TORCH_H,
                       wz + S.dz * (cfg.CELL / 2 - cfg.WALL / 2 - 0.1));
        t.rotation.y = S.rot;
        scene.add(t);
        wallFlames.push(t);
        placed++;
        // Une lampe une fois sur deux seulement : au-delà, on dépasse le
        // budget de lumières dynamiques de WebGL et le rendu s'effondre.
        // Les autres torches éclairent par leur halo, qui ne coûte rien.
        if (placed % 2 === 0) {
          const lamp = new THREE_.PointLight(cfg.COL_TORCH, 0.85, cfg.CELL * 1.9, 2);
          lamp.position.set(t.position.x + S.dx * -1.0, cfg.WALL_TORCH_H + 2, t.position.z + S.dz * -1.0);
          scene.add(lamp);
        }
      }
    }
    return placed;
  }

  /* -----------------------------------------------------------------------
     POUTRES ET PLAFOND PARTIEL (image 2).
     -----------------------------------------------------------------------
     Des poutres de bois en travers des couloirs, et une dalle de plafond sur
     une partie seulement des cellules : les autres laissent voir le ciel
     violet par une ouverture déchiquetée. C'est ce contraste qui donne la
     sensation d'être SOUS quelque chose d'effondré.

     ⚠️ AUCUN PLAFOND SUR LES SALLES. Sur l'image 1, la grande salle est à ciel
     ouvert et c'est elle qui donne l'échelle du lieu : la couvrir reviendrait
     à supprimer la seule vue dégagée du jeu.
     -------------------------------------------------------------------- */
  function buildCeiling(cfg, m) {
    const inRoom = (x, y) => m.rooms.some(r => x >= r.x - 1 && x < r.x + r.w + 1 && y >= r.y - 1 && y < r.y + r.h + 1);
    const woodMat = new THREE_.MeshLambertMaterial({ map: tex.wood });
    const slabMat = new THREE_.MeshLambertMaterial({ map: tex.wall2 });
    const beamGeo = new THREE_.BoxGeometry(cfg.CELL, 0.55, 0.75);
    const slabGeo = new THREE_.BoxGeometry(cfg.CELL, 0.6, cfg.CELL);
    const grp = new THREE_.Group();
    let slabs = 0;
    for (let y = 0; y < m.G; y++) for (let x = 0; x < m.G; x++) {
      const j = m.idx(x, y);
      if (!m.cells[j] || inRoom(x, y)) continue;
      const [wx, wz] = Rules.centerOf(cfg, x, y);
      const n = Paint.noise(j * 53 + 9);
      if (n < cfg.CEILING_CHANCE) {
        const s = new THREE_.Mesh(slabGeo, slabMat);
        s.position.set(wx, cfg.WALL_H + 0.3, wz);
        grp.add(s);
        slabs++;
      }
      // Les poutres, elles, sont partout : c'est ce qui relie les morceaux de
      // plafond et rend l'effondrement lisible.
      if (Paint.noise(j * 91 + 4) < cfg.BEAM_CHANCE) {
        const along = Paint.noise(j * 13) < 0.5;
        for (let b = -1; b <= 1; b++) {
          const beam = new THREE_.Mesh(beamGeo, woodMat);
          beam.position.set(wx + (along ? 0 : b * cfg.CELL * 0.3),
                            cfg.WALL_H - 0.6,
                            wz + (along ? b * cfg.CELL * 0.3 : 0));
          if (!along) beam.rotation.y = Math.PI / 2;
          grp.add(beam);
        }
      }
    }
    scene.add(grp);
    return slabs;
  }

  /* LE BRASIER RAVIVABLE. Une vasque sur pied + une stèle à runes : il ne
     ressemble à AUCUNE des torches murales, ce qui est tout son intérêt. */
  function brazier(cfg) {
    const grp = new THREE_.Group();
    const stoneMat = new THREE_.MeshLambertMaterial({ map: tex.rune });
    const foot = new THREE_.Mesh(new THREE_.BoxGeometry(1.5, 0.5, 1.5), stoneMat);
    foot.position.y = 0.25; grp.add(foot);
    const col = new THREE_.Mesh(new THREE_.BoxGeometry(0.7, 2.2, 0.7), stoneMat);
    col.position.y = 1.4; grp.add(col);
    const bowl = new THREE_.Mesh(new THREE_.BoxGeometry(1.9, 0.7, 1.9),
      new THREE_.MeshLambertMaterial({ color: 0x2a2018 }));
    bowl.position.y = 2.75; grp.add(bowl);
    const stele = new THREE_.Mesh(new THREE_.BoxGeometry(1.5, 3.4, 0.4), stoneMat);
    stele.position.set(0, 1.7, -1.5); grp.add(stele);
    const fl = new THREE_.Mesh(new THREE_.PlaneGeometry(2.4, 3.4),
      new THREE_.MeshBasicMaterial({
        map: flameCuts[0], transparent: true,
        blending: THREE_.AdditiveBlending, depthWrite: false, fog: false }));
    fl.position.y = 4.6; grp.add(fl);
    const halo = new THREE_.Mesh(new THREE_.PlaneGeometry(11, 11),
      new THREE_.MeshBasicMaterial({
        map: tex.haloWarm, transparent: true, opacity: 0.55,
        blending: THREE_.AdditiveBlending, depthWrite: false, fog: false }));
    halo.position.y = 4.4; grp.add(halo);
    grp.userData.flame = fl;
    grp.userData.halo = halo;
    return grp;
  }

  function buildProps(cfg, m, st) {
    for (const t of st.torches) {
      const g = brazier(cfg);
      const [wx, wz] = Rules.centerOf(cfg, t.x, t.y);
      g.position.set(wx, 0, wz);
      scene.add(g);
      const lamp = new THREE_.PointLight(cfg.COL_TORCH, 1.9, cfg.CELL * 3.4, 2);
      lamp.position.set(wx, 5.2, wz);
      scene.add(lamp);
      brazierMeshes.push({ g, t, lamp });
    }
    if (st.sword) {
      const grp = new THREE_.Group();
      const altar = new THREE_.Mesh(new THREE_.BoxGeometry(2.6, 1.1, 2.6),
        new THREE_.MeshLambertMaterial({ map: tex.rune }));
      altar.position.y = 0.55; grp.add(altar);
      const blade = new THREE_.Mesh(new THREE_.BoxGeometry(0.2, 2.4, 0.5),
        new THREE_.MeshBasicMaterial({ color: cfg.COL_STEEL, fog: false }));
      blade.position.y = 2.5; grp.add(blade);
      const guard = new THREE_.Mesh(new THREE_.BoxGeometry(1.1, 0.2, 0.3),
        new THREE_.MeshBasicMaterial({ color: cfg.COL_STEEL_EDGE, fog: false }));
      guard.position.y = 1.4; grp.add(guard);
      const halo = new THREE_.Mesh(new THREE_.PlaneGeometry(9, 9),
        new THREE_.MeshBasicMaterial({
          map: tex.haloCyan, transparent: true, opacity: 0.5,
          blending: THREE_.AdditiveBlending, depthWrite: false, fog: false }));
      halo.position.y = 2.4; grp.add(halo);
      grp.userData.halo = halo;
      const [wx, wz] = Rules.centerOf(cfg, st.sword.x, st.sword.y);
      grp.position.set(wx, 0, wz);
      scene.add(grp);
      const lamp = new THREE_.PointLight(cfg.COL_COIN_GLOW, 1.6, cfg.CELL * 2.4, 2);
      lamp.position.set(wx, 3.4, wz);
      scene.add(lamp);
      sword3 = grp;
    }
    /* LES ÉCLATS : sphère pleine + halo additif, violets et cyans en
       alternance — les orbes des deux images. Le halo fait le double du
       diamètre : sans lui, une petite sphère lumineuse disparaît dès qu'elle
       s'éloigne de trois mètres. */
    const sg = new THREE_.SphereGeometry(0.55, 10, 8);
    for (let i = 0; i < st.shards.length; i++) {
      const s = st.shards[i];
      const cyan = (s.x + s.y) % 2 === 0;
      const grp = new THREE_.Group();
      const core = new THREE_.Mesh(sg, new THREE_.MeshBasicMaterial({
        color: cyan ? cfg.COL_COIN : cfg.COL_MUSHROOM, fog: false }));
      grp.add(core);
      const halo = new THREE_.Mesh(new THREE_.PlaneGeometry(3.4, 3.4),
        new THREE_.MeshBasicMaterial({
          map: cyan ? tex.haloCyan : tex.haloPurple, transparent: true, opacity: 0.75,
          blending: THREE_.AdditiveBlending, depthWrite: false, fog: false }));
      grp.add(halo);
      const [wx, wz] = Rules.centerOf(cfg, s.x, s.y);
      grp.position.set(wx, 1.9, wz);
      scene.add(grp);
      shardMeshes.push({ mesh: grp, s, halo });
    }
    const pg = new THREE_.BoxGeometry(0.7, 1.0, 0.7);
    for (const p of st.potions) {
      const grp = new THREE_.Group();
      grp.add(new THREE_.Mesh(pg, new THREE_.MeshBasicMaterial({ color: cfg.COL_MUSHROOM, fog: false })));
      const halo = new THREE_.Mesh(new THREE_.PlaneGeometry(4, 4),
        new THREE_.MeshBasicMaterial({
          map: tex.haloPurple, transparent: true, opacity: 0.6,
          blending: THREE_.AdditiveBlending, depthWrite: false, fog: false }));
      grp.add(halo);
      const [wx, wz] = Rules.centerOf(cfg, p.x, p.y);
      grp.position.set(wx, 0.9, wz);
      scene.add(grp);
      potionMeshes.push({ mesh: grp, p, halo });
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
    const body = new THREE_.Mesh(new THREE_.BoxGeometry(0.95, 1.05, 0.55), M(col.shirt || cfg.COL_SHIRT));
    body.position.y = 1.5; grp.add(body);
    const legs = new THREE_.Mesh(new THREE_.BoxGeometry(0.85, 1.0, 0.5), M(col.pants || cfg.COL_PANTS));
    legs.position.y = 0.5; grp.add(legs);
    const head = new THREE_.Mesh(new THREE_.BoxGeometry(0.7, 0.68, 0.62), M(col.skin || cfg.COL_SKIN));
    head.position.y = 2.35; grp.add(head);
    const hair = new THREE_.Mesh(new THREE_.BoxGeometry(0.76, 0.24, 0.68), M(col.hair || cfg.COL_HAIR));
    hair.position.y = 2.72; grp.add(hair);
    /* ⚠️ LA NUQUE EST DERRIÈRE. Le zip 377 a livré, pendant trois zips, un
       fermier dont la nuque était du côté du visage — trouvé EN REGARDANT,
       jamais en relisant. Le personnage regarde vers -Z ; la nuque est donc
       en +Z, et cette ligne est la seule qui le dise. */
    const nape = new THREE_.Mesh(new THREE_.BoxGeometry(0.68, 0.4, 0.12), M(col.hair || cfg.COL_HAIR));
    nape.position.set(0, 2.4, 0.33); grp.add(nape);

    const armL = new THREE_.Mesh(new THREE_.BoxGeometry(0.25, 0.9, 0.25), M(col.skin || cfg.COL_SKIN));
    armL.position.set(-0.62, 1.5, 0); grp.add(armL);
    const armR = new THREE_.Mesh(new THREE_.BoxGeometry(0.25, 0.9, 0.25), M(col.skin || cfg.COL_SKIN));
    armR.position.set(0.62, 1.5, 0); grp.add(armR);
    grp.userData.armL = armL; grp.userData.armR = armR;

    // LA TORCHE, dans la main GAUCHE (l'épée occupe la droite), tendue vers
    // l'AVANT : sur les images, la lumière part devant le personnage.
    const t = new THREE_.Group();
    const stick = new THREE_.Mesh(new THREE_.BoxGeometry(0.14, 1.1, 0.14),
      new THREE_.MeshLambertMaterial({ map: tex.wood }));
    stick.position.y = -0.15; t.add(stick);
    const head2 = new THREE_.Mesh(new THREE_.BoxGeometry(0.24, 0.26, 0.24), M(0x1a1512));
    head2.position.y = 0.5; t.add(head2);
    const fl = new THREE_.Mesh(new THREE_.PlaneGeometry(1.15, 1.6),
      new THREE_.MeshBasicMaterial({
        map: flameCuts[0], transparent: true,
        blending: THREE_.AdditiveBlending, depthWrite: false, fog: false }));
    fl.position.y = 1.3; t.add(fl);
    const halo = new THREE_.Mesh(new THREE_.PlaneGeometry(7, 7),
      new THREE_.MeshBasicMaterial({
        map: tex.haloWarm, transparent: true, opacity: 0.5,
        blending: THREE_.AdditiveBlending, depthWrite: false, fog: false }));
    halo.position.y = 1.25; t.add(halo);
    t.position.set(-0.85, 1.7, -0.5);
    grp.add(t);
    torchMesh = t; flameMesh = fl;
    grp.userData.torchHalo = halo;

    // L'ÉPÉE, cachée tant qu'on ne l'a pas.
    const sw = new THREE_.Group();
    const blade = new THREE_.Mesh(new THREE_.BoxGeometry(0.12, 1.6, 0.3),
      new THREE_.MeshBasicMaterial({ color: cfg.COL_STEEL, fog: false }));
    blade.position.y = 0.8; sw.add(blade);
    const guard = new THREE_.Mesh(new THREE_.BoxGeometry(0.55, 0.12, 0.2),
      new THREE_.MeshBasicMaterial({ color: cfg.COL_STEEL_EDGE, fog: false }));
    sw.add(guard);
    sw.position.set(0.85, 1.5, -0.25);
    sw.visible = false;
    grp.add(sw);
    grp.userData.sword = sw;
    return grp;
  }

  function makeRoamer(cfg) {
    const grp = new THREE_.Group();
    const M = (c) => new THREE_.MeshLambertMaterial({ color: c });
    const body = new THREE_.Mesh(new THREE_.BoxGeometry(1.15, 1.7, 0.9), M(cfg.COL_WOLF));
    body.position.y = 1.05; grp.add(body);
    const head = new THREE_.Mesh(new THREE_.BoxGeometry(0.8, 0.7, 0.8), M(cfg.COL_BARK_DARK));
    head.position.y = 2.2; grp.add(head);
    for (const s of [-1, 1]) {
      const eye = new THREE_.Mesh(new THREE_.BoxGeometry(0.16, 0.16, 0.07),
        new THREE_.MeshBasicMaterial({ color: cfg.COL_WOLF_EYE, fog: false }));
      eye.position.set(s * 0.2, 2.26, -0.42); grp.add(eye);
    }
    for (const s of [-1, 1]) {
      const arm = new THREE_.Mesh(new THREE_.BoxGeometry(0.2, 1.2, 0.2), M(cfg.COL_WOLF));
      arm.position.set(s * 0.72, 1.1, 0); grp.add(arm);
    }
    return grp;
  }

  /* LE TRAQUEUR est plus GRAND que le joueur et plus étroit — la silhouette
     doit se reconnaître en une image, à la limite de la lumière. Ses yeux sont
     hors brouillard : on les voit avant lui, et c'est tout ce qu'on veut. */
  function makeStalker(cfg) {
    const grp = new THREE_.Group();
    const M = (c) => new THREE_.MeshLambertMaterial({ color: c });
    const body = new THREE_.Mesh(new THREE_.BoxGeometry(0.85, 2.9, 0.7), M(cfg.COL_STALKER));
    body.position.y = 1.7; grp.add(body);
    const head = new THREE_.Mesh(new THREE_.BoxGeometry(0.62, 0.8, 0.62), M(cfg.COL_STALKER));
    head.position.y = 3.55; grp.add(head);
    for (const s of [-1, 1]) {
      const eye = new THREE_.Mesh(new THREE_.BoxGeometry(0.12, 0.26, 0.06),
        new THREE_.MeshBasicMaterial({ color: cfg.COL_STALKER_EYE, fog: false }));
      eye.position.set(s * 0.17, 3.6, -0.34); grp.add(eye);
    }
    const halo = new THREE_.Mesh(new THREE_.PlaneGeometry(3, 3),
      new THREE_.MeshBasicMaterial({
        map: tex.haloPurple, transparent: true, opacity: 0.35,
        blending: THREE_.AdditiveBlending, depthWrite: false, fog: false }));
    halo.position.y = 3.6; grp.add(halo);
    grp.userData.halo = halo;
    for (const s of [-1, 1]) {
      const arm = new THREE_.Mesh(new THREE_.BoxGeometry(0.18, 2.0, 0.18), M(cfg.COL_STALKER));
      arm.position.set(s * 0.58, 1.8, 0); grp.add(arm);
    }
    return grp;
  }

  /* =======================================================================
     API
     ======================================================================= */
  function init(cfg, m, st, canvas, sk) {
    THREE_ = window.THREE;
    CFG_ = cfg; ST_ = st; skin = sk;

    /* ⚠️ ON REPART DE ZÉRO. Sans cette remise à zéro, un second appel à init()
       CUMULAIT les collections du module — et init() est rappelé à chaque
       nouvelle partie (game.js/newRun). Dès la première fois qu'on rejouait
       après être mort, roamerMeshes contenait deux fois trop d'entrées et
       sync() jetait à la première image. Une partie sur deux plantait, et
       c'était la seconde : celle qu'on joue toujours. Trouvé par
       tools/smoke-render.mjs à sa deuxième graine ; aucune relecture ne
       l'aurait vu, chaque ligne prise séparément étant juste. */
    roamerMeshes = []; brazierMeshes = []; shardMeshes = []; potionMeshes = [];
    wallFlames = []; holeGlows = [];
    stalkerMesh = null; sword3 = null; player = null;
    torchMesh = null; flameMesh = null; skyMesh = null;

    scene = new THREE_.Scene();
    scene.fog = new THREE_.Fog(cfg.COL_FOG, cfg.FOG_NEAR_FULL, cfg.FOG_FAR_FULL);

    camera = new THREE_.PerspectiveCamera(74, 1, 0.1, m.G * cfg.CELL * 4);
    renderer = new THREE_.WebGLRenderer({ canvas, antialias: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

    buildTextures(cfg);
    buildSky(cfg, m);
    buildWalls(cfg, m, st);
    buildFloor(cfg, m, st);
    buildLake(cfg, m);
    buildGlows(cfg, m, st);
    buildWallTorches(cfg, m);
    buildCeiling(cfg, m);
    buildProps(cfg, m, st);

    /* L'ÉCLAIRAGE. ⚠️ REVU EN ENTIER AU 394 : l'ambiante passe de 0,06 à 0,30
       et gagne une hémisphérique. La première version faisait de la torche du
       joueur la SEULE source, ce qui donnait un jeu quasi noir — juste, mais
       très loin des images de Guillaume, où l'on voit l'architecture entière,
       le ciel, et une trentaine de flammes. La tension ne vient plus de
       l'aveuglement mais de la distance de vue, ce qui est aussi la réponse à
       « ça doit pas être trop difficile ». */
    ambient = new THREE_.AmbientLight(0x6a5580, 0.30);
    scene.add(ambient);
    hemi = new THREE_.HemisphereLight(cfg.SKY_HORIZON, cfg.COL_PURPLE_DIM, 0.45);
    scene.add(hemi);
    torchLight = new THREE_.PointLight(cfg.COL_TORCH, 2.6, cfg.TORCH_LIGHT_MAX, 1.7);
    scene.add(torchLight);

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
      const k = st.swingT > 0 ? 1 - st.swingT / (cfg.SWING_MS / 1000) : 0;
      player.userData.sword.rotation.z = st.swingT > 0 ? -1.5 + k * 2.6 : -0.25;
      player.userData.sword.rotation.x = st.swingT > 0 ? -0.9 + k * 0.9 : 0;
    }
    if (sword3) {
      sword3.visible = !(st.sword && st.sword.taken);
      if (sword3.visible) { sword3.rotation.y = t * 0.9; sword3.userData.halo.lookAt(camera.position); }
    }

    // --- la flamme du joueur
    const cut = flameCuts[((t * 11) | 0) % 4];
    if (flameMesh.material.map !== cut) flameMesh.material.map = cut;
    const flick = 1 + Math.sin(t * 17.3) * cfg.TORCH_FLICKER + Math.sin(t * 6.1) * cfg.TORCH_FLICKER * 0.6;
    const scale = 0.4 + fl.k * 0.85;
    flameMesh.scale.set(scale * flick, scale * flick, 1);
    flameMesh.visible = st.flame > 0;
    // Une flamme est un PLAN : vue par la tranche elle disparaît. Elle fait
    // donc toujours face à la caméra — défaut qu'on ne voit qu'en tournant.
    flameMesh.lookAt(camera.position);
    const th = player.userData.torchHalo;
    th.visible = st.flame > 0;
    th.material.opacity = 0.2 + fl.k * 0.4;
    th.scale.set(0.5 + fl.k, 0.5 + fl.k, 1);
    th.lookAt(camera.position);

    torchLight.position.set(st.px - Math.sin(st.ang) * 1.4, 3.2, st.pz - Math.cos(st.ang) * 1.4);
    torchLight.distance = cfg.TORCH_LIGHT_MIN + (cfg.TORCH_LIGHT_MAX - cfg.TORCH_LIGHT_MIN) * fl.k;
    torchLight.intensity = (0.6 + fl.k * 2.4) * flick;

    scene.fog.near = cfg.FOG_NEAR_EMBER + (cfg.FOG_NEAR_FULL - cfg.FOG_NEAR_EMBER) * fl.k;
    scene.fog.far = cfg.FOG_FAR_EMBER + (cfg.FOG_FAR_FULL - cfg.FOG_FAR_EMBER) * fl.k;

    // --- torches murales : elles vacillent chacune à sa cadence
    for (let i = 0; i < wallFlames.length; i++) {
      const w = wallFlames[i];
      const f = w.userData.flame;
      const s = w.userData.seed;
      f.material.map = flameCuts[(((t * (7 + (s % 5))) | 0) + s) % 4];
      const k2 = 1 + Math.sin(t * (11 + (s % 7)) + s) * 0.16;
      f.scale.set(k2, k2, 1);
      f.lookAt(camera.position);
      w.userData.halo.lookAt(camera.position);
    }

    // --- brasiers ravivables
    for (const b of brazierMeshes) {
      const on = !b.t.spent;
      b.g.userData.flame.visible = on;
      b.g.userData.halo.visible = on;
      b.lamp.intensity = on ? 1.9 : 0;
      if (on) {
        b.g.userData.flame.material.map = flameCuts[(((t * 9) | 0) + b.t.x + b.t.y) % 4];
        const k2 = 1 + Math.sin(t * 13 + b.t.x * 2.1) * 0.14;
        b.g.userData.flame.scale.set(k2, k2, 1);
        b.g.userData.flame.lookAt(camera.position);
        b.g.userData.halo.lookAt(camera.position);
      }
    }

    // --- ramassables
    for (const s of shardMeshes) {
      s.mesh.visible = !s.s.taken;
      if (!s.mesh.visible) continue;
      s.mesh.position.y = 1.9 + Math.sin(t * 2.2 + s.s.x) * CFG_.SHARD_BOB;
      s.halo.lookAt(camera.position);
    }
    for (const p of potionMeshes) {
      p.mesh.visible = !p.p.taken;
      if (p.mesh.visible) { p.mesh.rotation.y = t * 1.1; p.halo.lookAt(camera.position); }
    }

    // --- créatures
    for (let i = 0; i < roamerMeshes.length; i++) {
      const r = st.roamers[i], g = roamerMeshes[i];
      g.visible = !r.dead;
      g.position.set(r.x, 0, r.z);
      g.rotation.y = r.ang;
    }
    stalkerMesh.visible = st.stalkerAwake;
    if (st.stalkerAwake) {
      stalkerMesh.position.set(st.stalker.x, Math.sin(t * 2.6) * 0.1, st.stalker.z);
      stalkerMesh.rotation.y = st.stalker.ang;
      stalkerMesh.userData.halo.lookAt(camera.position);
    }

    // --- lac, ciel et phare
    lakeMat.map.offset.x = t * 0.035;
    lakeMat.map.offset.y = t * 0.022;
    beaconMat.opacity = 0.3 + Math.sin(t * Math.PI * 2 * CFG_.BEACON_PULSE) * 0.14;
    if (skyMesh) skyMesh.rotation.y = t * 0.004;   // très lent : le ciel bouge à peine

    updateCamera(st, cfg);
    renderer.render(scene, camera);
  }

  /* LA CAMÉRA NE TRAVERSE PAS LES MURS. Elle voudrait se poser à CAM_DIST
     derrière le joueur ; si de la maçonnerie se trouve sur ce segment, elle se
     rapproche jusqu'à CAM_MIN_DIST. Sans ça, tout virage serré met la caméra
     DANS la pierre et l'écran devient noir — le défaut le plus banal du genre,
     et le plus insupportable. */
  function updateCamera(st, cfg) {
    const back = cfg.CAM_DIST;
    let d = back;
    const dirX = Math.sin(st.ang), dirZ = Math.cos(st.ang);   // vers l'arrière
    for (let s = 0.5; s <= back; s += 0.5) {
      const tx = st.px + dirX * s, tz = st.pz + dirZ * s;
      const near = st.idxB.near(tx, tz);
      const [ox, oz] = Rules.pushOut(tx, tz, 0.6, near);
      if (Math.abs(ox - tx) > 0.01 || Math.abs(oz - tz) > 0.01) { d = Math.max(cfg.CAM_MIN_DIST, s - 0.6); break; }
    }
    const wantX = st.px + dirX * d, wantZ = st.pz + dirZ * d;
    /* ⚠️ LISSAGE CORRIGÉ EN dt AU 394. La première version multipliait par
       0,016 en dur : à 120 Hz la caméra suivait deux fois trop vite, à 30 Hz
       deux fois trop lentement. C'est une des causes du « pas très fluide »
       signalé par Guillaume, et elle ne se voyait pas sur un écran à 60 Hz. */
    const k = 1 - Math.exp(-cfg.CAM_LAG * (1 / 60));
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
    // Purement visuel : rules.js a déjà tranché le sort du joueur.
    player.position.y -= dt * 16;
  }

  return { init, sync, resize, fallStep, get renderer() { return renderer; } };
})();
