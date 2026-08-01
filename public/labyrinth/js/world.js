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
  let player, sword3, torchMesh, flameMesh, torchHalo;
  let roamerMeshes = [], stalkerMesh, brazierMeshes = [], shardMeshes = [], potionMeshes = [];
  let playerRig = null, roamerRigs = [], stalkerRig = null, stalkerHalo = null;
  /* ⚠️ L'INSTANTANÉ PRÉCÉDENT, cœur de l'interpolation du zip 395. La
     simulation avance par pas de 1/30 s ; le rendu, lui, tourne à la cadence
     de l'écran. Sans mémoire de l'état d'avant, on afficherait deux fois la
     même image puis un saut — c'est exactement la saccade que Guillaume
     décrit. On garde donc le AVANT et le APRÈS, et on affiche entre les deux. */
  let prev = null;
  let wallFlames = [], holeGlows = [];
  let skin = null;
  let cam = { x: 0, y: 0, z: 0, ang: 0 };
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
       alternance — les orbes des deux images de Guillaume. Le halo fait le
       triple du diamètre : sans lui, une petite sphère lumineuse disparaît dès
       qu'elle s'éloigne de trois mètres. */
    const sg = new THREE_.SphereGeometry(0.55, 10, 8);
    for (let i = 0; i < st.shards.length; i++) {
      const sh = st.shards[i];
      const cyan = (sh.x + sh.y) % 2 === 0;
      const grp = new THREE_.Group();
      grp.add(new THREE_.Mesh(sg, new THREE_.MeshBasicMaterial({
        color: cyan ? cfg.COL_COIN : cfg.COL_MUSHROOM, fog: false })));
      const halo = new THREE_.Mesh(new THREE_.PlaneGeometry(3.4, 3.4),
        new THREE_.MeshBasicMaterial({
          map: cyan ? tex.haloCyan : tex.haloPurple, transparent: true, opacity: 0.75,
          blending: THREE_.AdditiveBlending, depthWrite: false, fog: false }));
      grp.add(halo);
      const [wx, wz] = Rules.centerOf(cfg, sh.x, sh.y);
      grp.position.set(wx, 1.9, wz);
      scene.add(grp);
      shardMeshes.push({ mesh: grp, s: sh, halo });
    }
    const pg = new THREE_.BoxGeometry(0.7, 1.0, 0.7);
    for (const po of st.potions) {
      const grp = new THREE_.Group();
      grp.add(new THREE_.Mesh(pg, new THREE_.MeshBasicMaterial({ color: cfg.COL_MUSHROOM, fog: false })));
      const halo = new THREE_.Mesh(new THREE_.PlaneGeometry(4, 4),
        new THREE_.MeshBasicMaterial({
          map: tex.haloPurple, transparent: true, opacity: 0.6,
          blending: THREE_.AdditiveBlending, depthWrite: false, fog: false }));
      grp.add(halo);
      const [wx, wz] = Rules.centerOf(cfg, po.x, po.y);
      grp.position.set(wx, 0.9, wz);
      scene.add(grp);
      potionMeshes.push({ mesh: grp, p: po, halo });
    }
  }

  /* =======================================================================
     L'INTERPOLATION — le cœur de la fluidité du zip 395.
     -----------------------------------------------------------------------
     game.js appelle snapPrev() JUSTE AVANT chaque pas de simulation, puis
     sync(st, now, alpha) à chaque image d'écran avec alpha entre 0 et 1. On
     affiche donc une position qui n'a jamais existé dans la simulation — et
     c'est exactement ce qu'on veut : le mouvement devient continu alors que
     la simulation reste discrète et déterministe.

     ⚠️ LES ANGLES S'INTERPOLENT PAR LE PLUS COURT CHEMIN. Un cap qui passe de
     +179° à -179° est un pas d'un degré, pas de 358 : sans ce détour, le
     personnage ferait un tour complet sur lui-même à chaque passage par le
     sud. C'est le genre de défaut qui n'arrive qu'une fois sur cent et qu'on
     met une soirée à reproduire.
     ======================================================================= */
  function lerpA(a, b, k) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * k;
  }
  function snapPrev(st) {
    prev = {
      px: st.px, pz: st.pz, ang: st.ang, gait: st.gait,
      roamers: st.roamers.map(r => ({ x: r.x, z: r.z, ang: r.ang, gait: r.gait })),
      sx: st.stalker.x, sz: st.stalker.z, sang: st.stalker.ang, sgait: st.stalker.gait,
    };
  }
  /* La foulée s'interpole comme un angle : elle boucle sur [0,1[, donc passer
     de 0,98 à 0,03 est un pas de 5 %, pas un retour en arrière de 95 %. Sans
     ça, les jambes font une marche arrière fulgurante une fois par foulée. */
  function lerpGait(a, b, k) {
    let d = b - a;
    if (d > 0.5) d -= 1;
    if (d < -0.5) d += 1;
    return (a + d * k + 1) % 1;
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
    roamerRigs = []; playerRig = null; stalkerRig = null; stalkerHalo = null; prev = null;
    stalkerMesh = null; sword3 = null; player = null;
    torchMesh = null; flameMesh = null; torchHalo = null; skyMesh = null;

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

    /* ⚠️ LES ÊTRES VIVANTS SONT CONSTRUITS PAR rig.js, PAS ICI. Zip 395 :
       world.js s'occupe du décor (2 200 maillages, aucune articulation),
       rig.js des personnages (une centaine de volumes, huit joints animés
       chacun). Ce sont deux métiers, et les mélanger dans un fichier de mille
       lignes est la meilleure façon de ne plus relire ni l'un ni l'autre. */
    Rig.init(THREE_);
    playerRig = Rig.buildFarmer(cfg, tex, sk);
    player = playerRig.root;
    scene.add(player);
    /* LA FLAMME DE LA TORCHE est accrochée à la MAIN du rig, pas au
       personnage : elle hérite donc du cycle de marche, du balancement du bras
       et du tremblement du poignet, sans une ligne de code de plus. C'est tout
       l'intérêt d'une hiérarchie de joints — l'accessoire suit, gratuitement. */
    flameMesh = new THREE_.Mesh(new THREE_.PlaneGeometry(1.25, 1.75),
      new THREE_.MeshBasicMaterial({ map: flameCuts[0], transparent: true,
        blending: THREE_.AdditiveBlending, depthWrite: false, fog: false }));
    flameMesh.position.y = 1.42;
    playerRig.torch.add(flameMesh);
    torchMesh = playerRig.torch;
    torchHalo = new THREE_.Mesh(new THREE_.PlaneGeometry(7.5, 7.5),
      new THREE_.MeshBasicMaterial({ map: tex.haloWarm, transparent: true, opacity: 0.5,
        blending: THREE_.AdditiveBlending, depthWrite: false, fog: false }));
    torchHalo.position.y = 1.38;
    playerRig.torch.add(torchHalo);
    for (const r of st.roamers) {
      const rg = Rig.buildRoamer(cfg);
      scene.add(rg.root);
      roamerRigs.push(rg);
      roamerMeshes.push(rg.root);
    }
    stalkerRig = Rig.buildStalker(cfg);
    stalkerMesh = stalkerRig.root;
    stalkerMesh.visible = false;
    scene.add(stalkerMesh);
    // Halo violet autour du crâne du traqueur : il le rend repérable au fond
    // d'un couloir avant même qu'on distingue sa silhouette.
    stalkerHalo = new THREE_.Mesh(new THREE_.PlaneGeometry(3.4, 3.4),
      new THREE_.MeshBasicMaterial({ map: tex.haloPurple, transparent: true, opacity: 0.32,
        blending: THREE_.AdditiveBlending, depthWrite: false, fog: false }));
    stalkerRig.skull.add(stalkerHalo);
    stalkerHalo.position.set(0, 0.3, -0.1);
    snapPrev(st);

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
  let lastFrameMs = 0, frameDt = 1 / 60;
  function sync(st, now, alpha) {
    const cfg = CFG_;
    // Intervalle réel entre deux images, borné : un onglet remis au premier
    // plan produit sinon un saut de plusieurs secondes.
    frameDt = lastFrameMs ? Math.min(0.1, Math.max(0.002, (now - lastFrameMs) / 1000)) : 1 / 60;
    lastFrameMs = now;
    const fl = Rules.flameLevel(st);
    const t = now / 1000;
    const a = prev ? Rig.clamp(alpha === undefined ? 1 : alpha, 0, 1) : 1;

    /* ---- LE PERSONNAGE, à une position INTERPOLÉE.
       C'est ici que se joue la fluidité : `a` va de 0 (l'état d'avant) à 1
       (l'état courant), et l'écran affiche l'entre-deux. À 30 Hz de simulation
       et 144 Hz d'écran, on obtient quatre images distinctes par pas au lieu
       de quatre fois la même suivie d'un saut. */
    const px = prev ? Rig.lerp(prev.px, st.px, a) : st.px;
    const pz = prev ? Rig.lerp(prev.pz, st.pz, a) : st.pz;
    const pang = prev ? lerpA(prev.ang, st.ang, a) : st.ang;
    const pgait = prev ? lerpGait(prev.gait, st.gait, a) : st.gait;

    player.position.set(px, 0, pz);
    player.rotation.y = pang;
    player.visible = st.status !== "falling" || (now % 200 < 120);
    playerRig.sword.visible = st.hasSword;
    /* TOUTE LA POSE EST DÉLÉGUÉE À rig.js — huit joints, cycle de marche,
       attaque en trois temps, respiration au repos. world.js ne sait plus
       plier un bras, et c'est très bien ainsi. */
    Rig.poseFarmer(playerRig, {
      gait: pgait, gaitSpeed: st.gaitSpeed,
      runAmt: st.runAmt, strafeAmt: st.strafeAmt, backAmt: st.backAmt,
      swingT: st.swingT, hurt: st.hurtFlash, falling: st.status === "falling",
    }, cfg, t);
    if (sword3) {
      sword3.visible = !(st.sword && st.sword.taken);
      if (sword3.visible) { sword3.rotation.y = t * 0.9; sword3.userData.halo.lookAt(camera.position); }
    }

    // --- la flamme du joueur, accrochée à la MAIN du rig : elle suit donc le
    //     bras, le cycle de marche et le tremblement du poignet.
    const cut = flameCuts[((t * 11) | 0) % 4];
    if (flameMesh.material.map !== cut) flameMesh.material.map = cut;
    const flick = 1 + Math.sin(t * 17.3) * cfg.TORCH_FLICKER + Math.sin(t * 6.1) * cfg.TORCH_FLICKER * 0.6;
    const scale = 0.4 + fl.k * 0.85;
    flameMesh.scale.set(scale * flick, scale * flick, 1);
    flameMesh.visible = st.flame > 0;
    // Une flamme est un PLAN : vue par la tranche elle disparaît. Elle fait
    // donc toujours face à la caméra — défaut qu'on ne voit qu'en tournant.
    flameMesh.lookAt(camera.position);
    const th = torchHalo;
    th.visible = st.flame > 0;
    th.material.opacity = 0.2 + fl.k * 0.4;
    th.scale.set(0.5 + fl.k, 0.5 + fl.k, 1);
    th.lookAt(camera.position);

    torchLight.position.set(px - Math.sin(pang) * 1.4, 3.2, pz - Math.cos(pang) * 1.4);
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

    // --- créatures, interpolées et posées par rig.js
    for (let i = 0; i < roamerRigs.length; i++) {
      const r = st.roamers[i], rg = roamerRigs[i];
      rg.root.visible = !r.dead || r.deadT < 3;
      if (!rg.root.visible) continue;
      const pr = prev && prev.roamers[i];
      const rx = pr ? Rig.lerp(pr.x, r.x, a) : r.x;
      const rz = pr ? Rig.lerp(pr.z, r.z, a) : r.z;
      rg.root.position.set(rx, 0, rz);
      rg.root.rotation.y = pr ? lerpA(pr.ang, r.ang, a) : r.ang;
      Rig.poseRoamer(rg, {
        gait: pr ? lerpGait(pr.gait, r.gait, a) : r.gait,
        gaitSpeed: r.gaitSpeed || 0,
        chasing: r.mode === "chase",
        stagger: r.staggerT / (cfg.ROAMER_STAGGER_MS / 1000),
        dead: r.dead, deadT: r.deadT,
      }, cfg, t + i * 1.7);   // décalage : deux créatures ne respirent jamais ensemble
    }
    stalkerMesh.visible = st.stalkerAwake;
    if (st.stalkerAwake) {
      const s2 = st.stalker;
      const sx = prev ? Rig.lerp(prev.sx, s2.x, a) : s2.x;
      const sz = prev ? Rig.lerp(prev.sz, s2.z, a) : s2.z;
      const sang = prev ? lerpA(prev.sang, s2.ang, a) : s2.ang;
      stalkerMesh.position.set(sx, 0, sz);
      stalkerMesh.rotation.y = sang;
      // Angle RELATIF vers le joueur : c'est ce qui fait tourner son crâne
      // vers nous quoi qu'il fasse.
      let toP = Math.atan2(-(px - sx), -(pz - sz)) - sang;
      while (toP > Math.PI) toP -= Math.PI * 2;
      while (toP < -Math.PI) toP += Math.PI * 2;
      Rig.poseStalker(stalkerRig, {
        gait: prev ? lerpGait(prev.sgait, s2.gait, a) : s2.gait,
        gaitSpeed: s2.gaitSpeed || 0,
        stagger: s2.staggerT / (cfg.STALK_STAGGER_MS / 1000),
        toPlayer: toP,
      }, cfg, t);
      if (stalkerHalo) stalkerHalo.lookAt(camera.position);
    }

    // --- lac, ciel et phare
    lakeMat.map.offset.x = t * 0.035;
    lakeMat.map.offset.y = t * 0.022;
    beaconMat.opacity = 0.3 + Math.sin(t * Math.PI * 2 * CFG_.BEACON_PULSE) * 0.14;
    if (skyMesh) skyMesh.rotation.y = t * 0.004;   // très lent : le ciel bouge à peine

    updateCamera(st, cfg, px, pz, pang);
    renderer.render(scene, camera);
  }

  /* LA CAMÉRA NE TRAVERSE PAS LES MURS. Elle voudrait se poser à CAM_DIST
     derrière le joueur ; si de la maçonnerie se trouve sur ce segment, elle se
     rapproche jusqu'à CAM_MIN_DIST. Sans ça, tout virage serré met la caméra
     DANS la pierre et l'écran devient noir — le défaut le plus banal du genre,
     et le plus insupportable. */
  function updateCamera(st, cfg, px, pz, pang) {
    const back = cfg.CAM_DIST;
    let d = back;
    const dirX = Math.sin(pang), dirZ = Math.cos(pang);   // vers l'arrière
    for (let s = 0.5; s <= back; s += 0.5) {
      const tx = px + dirX * s, tz = pz + dirZ * s;
      const near = st.idxB.near(tx, tz);
      const [ox, oz] = Rules.pushOut(tx, tz, 0.6, near);
      if (Math.abs(ox - tx) > 0.01 || Math.abs(oz - tz) > 0.01) { d = Math.max(cfg.CAM_MIN_DIST, s - 0.6); break; }
    }
    const wantX = px + dirX * d, wantZ = pz + dirZ * d;
    /* ⚠️ LISSAGE CORRIGÉ EN dt AU 394. La première version multipliait par
       0,016 en dur : à 120 Hz la caméra suivait deux fois trop vite, à 30 Hz
       deux fois trop lentement. C'est une des causes du « pas très fluide »
       signalé par Guillaume, et elle ne se voyait pas sur un écran à 60 Hz. */
    /* ⚠️ LISSAGE EN TEMPS RÉEL D'AFFICHAGE (zip 395). Il était calé sur 1/60
       en dur : à 144 Hz la caméra rattrapait deux fois et demie trop
       lentement, à 30 Hz deux fois trop vite. On mesure donc l'intervalle
       réel entre deux images. La forme exponentielle rend le lissage
       INDÉPENDANT de la cadence — c'est la seule qui le soit. */
    const k = 1 - Math.exp(-cfg.CAM_LAG * frameDt);
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
    camera.lookAt(px, lookY, pz);
  }

  function fallStep(st, dt) {
    // Purement visuel : rules.js a déjà tranché le sort du joueur.
    player.position.y -= dt * 16;
  }

  return { init, sync, snapPrev, resize, fallStep, get renderer() { return renderer; } };
})();
