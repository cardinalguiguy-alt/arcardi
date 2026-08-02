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
  let torchLight, ambient, hemi, beaconMat, lakeMat, lakeGlowMat, skyMesh;
  const tex = {};
  let player, sword3, torchMesh, flameMesh, torchHalo;
  let roamerMeshes = [], stalkerMesh, brazierMeshes = [], shardMeshes = [], potionMeshes = [];
  let playerRig = null, roamerRigs = [], stalkerRig = null, stalkerHalo = null;
  /* ZIP 396 — le décor et les effets neufs. */
  let lakeMists = [], gateMesh = null, platformGroup = null, rotundaGroup = null;
  let roamerHud = [], stalkerFlash = null;
  let sparkPool = [], soulPool = [], scorePool = [];
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
  let CFG_, ST_, M_;

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

  /* La taille du plan d'eau, écrite UNE fois : buildTextures en a besoin pour
     calculer la répétition, buildLake pour poser le plan. Deux formules qui
     doivent rester égales et qui vivraient à deux endroits finiraient par
     diverger, et l'échelle des vagues partirait sans que personne comprenne. */
  function lakeSizeOf(cfg) { return cfg.GRID * cfg.CELL * 2.4; }

  function buildTextures(cfg) {
    tex.wall = canvasTex(128, 128, (c) => Paint.wall(c, cfg, 128, 128, 1));
    tex.wall2 = canvasTex(128, 128, (c) => Paint.wall(c, cfg, 128, 128, 7));
    tex.floor = canvasTex(128, 128, (c) => Paint.floor(c, cfg, 128, 128, 3));
    /* ⚠️ LA RÉPÉTITION EST CALCULÉE, PAS CHOISIE. Le défi de fuite pose une
       tuile de houle tous les 26 unités (et 37 pour la nappe additive) ; on
       reprend ces deux nombres, divisés par la taille RÉELLE du plan d'ici.
       Écrire « 10, 10 » comme au 394 donnait des vagues six fois trop grandes
       et un motif dont on voyait la grille — c'est ce qu'on voit sur la
       capture de Guillaume, autant que le dessin lui-même. */
    const rep = lakeSizeOf(cfg) / 26, repG = lakeSizeOf(cfg) / 37;
    tex.lake = canvasTex(128, 128, (c) => Paint.lake(c, cfg, 128, 128), [rep, rep]);
    tex.lakeGlow = canvasTex(128, 128, (c) => Paint.lakeGlow(c, cfg, 128, 128), [repG, repG]);
    tex.score = canvasTex(64, 32, (c) => Paint.number(c, cfg, 64, 32, "+" + cfg.SCORE_PER_KILL, 0xffe9a8));
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
  const inRotunda = (m, x, y) => m.rotunda &&
    x >= m.rotunda.x && x < m.rotunda.x + m.rotunda.w &&
    y >= m.rotunda.y && y < m.rotunda.y + m.rotunda.h;

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
      // La rotonde a son propre sol, en gradins : voir buildRotunda.
      if (inRotunda(m, x, y)) continue;
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

  /* =======================================================================
     LE LAC — REPRIS DU DÉFI DE FUITE, ZIP 396.
     -----------------------------------------------------------------------
     Retour de Guillaume : « le rendu de l'eau du lac n'est pas convaincant.
     Copie simplement ce qu'il y a dans le endless run. C'est la texture
     parfaite. »

     Ce n'est pas seulement la TEXTURE qui a été reprise (voir Paint.lakeWaves,
     recopiée ligne pour ligne de public/templerun/js/world.js) mais tout le
     MONTAGE, parce que l'aspect de cette eau ne vient qu'à moitié de son
     dessin :

       1. DEUX NAPPES superposées, de phases et d'échelles différentes, qui
          dérivent à des vitesses différentes. Le miroitement naît du décalage
          entre les deux — aucune des deux textures ne le contient. C'est le
          cœur de l'effet, et c'était ce qui manquait le plus ;
       2. la seconde est ADDITIVE, à 0,4 d'opacité : elle éclaire les crêtes
          sans éclaircir les creux ;
       3. des VOILES DE BRUME qui traînent à la surface et ORBITENT autour du
          joueur. Neuf suffisent à entourer n'importe quelle position, là où en
          semer sur 414 unités en demanderait des centaines.

     ⚠️ L'ÉCHELLE PHYSIQUE DES VAGUES EST CELLE DU DÉFI, pas une valeur
     ressemblante : 26 unités par tuile pour la nappe profonde, 37 pour la
     nappe additive. Ce sont ces deux nombres-là qui font que la houle a la
     bonne taille par rapport à un fermier, et ils ne se devinent pas.

     ⚠️ ET LE BROUILLARD EST REVENU. L'ancien lac était en `fog: false` : il
     restait donc parfaitement net jusqu'à 400 unités, ce qui affichait le bord
     du plan et étalait le motif répété sur tout l'horizon — c'est très
     visible sur la capture de Guillaume. Avec le brouillard, l'eau se perd
     dans le violet sombre comme dans le défi de fuite.
     ======================================================================= */
  function buildLake(cfg, m) {
    const size = lakeSizeOf(cfg);
    const cx = m.G * cfg.CELL / 2, cz = m.G * cfg.CELL / 2;
    const g = new THREE_.PlaneGeometry(size, size);

    lakeMat = new THREE_.MeshBasicMaterial({ map: tex.lake, fog: true });
    const deep = new THREE_.Mesh(g, lakeMat);
    deep.rotation.x = -Math.PI / 2;
    deep.position.set(cx, cfg.LAKE_Y, cz);
    scene.add(deep);

    lakeGlowMat = new THREE_.MeshBasicMaterial({
      map: tex.lakeGlow, transparent: true, opacity: 0.4,
      depthWrite: false, blending: THREE_.AdditiveBlending, fog: true });
    const glow = new THREE_.Mesh(g, lakeGlowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(cx, cfg.LAKE_Y + 0.05, cz);
    scene.add(glow);

    /* Les voiles. COL_LAKE_BRIGHT sert ICI, et c'est sa seule lecture depuis
       que la houle a remplacé les anneaux : une constante déclarée que
       personne ne lit est une constante fausse en attente (leçon du 385). */
    const mg = new THREE_.PlaneGeometry(1, 1);
    for (let i = 0; i < 9; i++) {
      const mm = new THREE_.Mesh(mg, new THREE_.MeshBasicMaterial({
        map: tex.haloPurple, color: cfg.COL_LAKE_BRIGHT,
        transparent: true, opacity: 0.10 + Paint.noise(i * 31) * 0.08,
        depthWrite: false, blending: THREE_.AdditiveBlending, fog: false,
        side: THREE_.DoubleSide }));
      const s = 40 + Paint.noise(i * 7) * 90;
      mm.scale.set(s, s * 0.5, 1);
      mm.rotation.x = -Math.PI / 2;
      mm.userData.orbit = Paint.noise(i * 13) * Math.PI * 2;
      mm.userData.radius = 25 + Paint.noise(i * 19) * 95;
      mm.userData.speed = 0.04 + Paint.noise(i * 23) * 0.09;
      scene.add(mm);
      lakeMists.push(mm);
    }
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

  /* =======================================================================
     LA ROTONDE — ZIP 396. La salle centrale circulaire à escaliers.
     -----------------------------------------------------------------------
     Demande de Guillaume, avec une capture du défi de fuite comme référence :
     un mur courbe en gros blocs chauds, une couronne de torches murales, un
     sol EN CONTREBAS, un escalier de pierre, et le ciel violet par-dessus.

     ⚠️ LE MUR ROND N'EST PAS DESSINÉ ICI. Il est déjà là : Rules.buildBoxes()
     pose la couronne de blocs, et buildWalls() la dessine avec tous les autres
     murs. C'est la règle du chantier depuis le 393 — les murs sont les boîtes
     de collision, littéralement — et c'est ce qui rend impossible le défaut
     que cette salle appelait à grands cris : un mur courbe qu'on traverse.

     CE QUI EST ICI, c'est le SOL, et il est fait de quatre choses :

       1. LE POURTOUR : un anneau plat au niveau du dédale. C'est par là qu'on
          entre, et c'est de là qu'on découvre la salle d'un coup d'œil ;
       2. TROIS GRADINS, trois cylindres empilés de rayons décroissants. Leurs
          flancs sont les contremarches — on les obtient gratuitement, là où
          des blocs séparés auraient coûté quatre cents maillages ;
       3. DEUX ESCALIERS taillés nord-sud, treize marches chacun, qui
          descendent au fond. Ils sont POSÉS SUR les gradins, et leur hauteur
          est exactement celle que rend Rules.groundY : une seule description
          de « à quelle hauteur est le sol ici », lue par le rendu ET par le
          placement des personnages ;
       4. UNE COURONNE DE TORCHES sur deux étages, plus un fût de lumière
          au centre.

     ⚠️ ET ELLE EST VISIBLE DE LOIN. Le fût central est plus haut que les murs :
     c'est ce qui fait qu'on ne la rate pas. Une salle-surprise qu'on peut ne
     jamais trouver n'est pas une surprise, c'est un contenu perdu.
     ======================================================================= */
  function buildRotunda(cfg, m) {
    const R = m.rotunda;
    if (!R) return;
    const C = cfg.CELL;
    const ccx = (R.x + R.w / 2) * C, ccz = (R.y + R.h / 2) * C;
    const rad = (R.w * C) / 2 - cfg.WALL / 2;
    const pit = rad - cfg.ROTUNDA_RIM;
    const grp = new THREE_.Group();
    const matF = new THREE_.MeshLambertMaterial({ map: tex.floor });
    const matW = new THREE_.MeshLambertMaterial({ map: tex.wall });

    // 1. Le pourtour plat.
    const rim = new THREE_.Mesh(new THREE_.RingGeometry(pit, rad + 0.6, 44), matF);
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(ccx, 0.02, ccz);
    grp.add(rim);

    // 2. Les gradins. Trois cylindres pleins, dont les flancs FONT les
    //    contremarches. Les rayons viennent de la même division que
    //    Rules.groundY : ring = floor(((pit - d) / pit) * RINGS).
    for (let i = 0; i < cfg.ROTUNDA_RINGS; i++) {
      const r = pit * (1 - i / cfg.ROTUNDA_RINGS);
      const top = -(i + 1) * cfg.ROTUNDA_DROP;
      const H = 14;
      const cyl = new THREE_.Mesh(new THREE_.CylinderGeometry(r, r, H, 40), i % 2 ? matW : matF);
      cyl.position.set(ccx, top - H / 2, ccz);
      grp.add(cyl);
    }

    // 3. Les deux escaliers. La hauteur de chaque marche est LUE dans
    //    Rules.groundY : on ne la recalcule pas, on demande.
    const stepGeo = new THREE_.BoxGeometry(cfg.ROTUNDA_STAIR_W, 7, cfg.ROTUNDA_STEP);
    for (const side of [1, -1]) {
      for (let k = 0; ; k++) {
        const r = pit - (k + 0.5) * cfg.ROTUNDA_STEP;
        if (r < 0.8) break;
        const z = ccz + side * r;
        const top = Rules.groundY(cfg, m, ccx, z);
        const s2 = new THREE_.Mesh(stepGeo, matF);
        s2.position.set(ccx, top - 3.5, z);
        grp.add(s2);
      }
      // Une joue de pierre de chaque côté de la volée : sans elle, un escalier
      // en boîtes flotte au-dessus des gradins au lieu d'y être taillé.
      for (const w of [1, -1]) {
        const cheek = new THREE_.Mesh(
          new THREE_.BoxGeometry(0.8, 8, pit), matW);
        cheek.position.set(ccx + w * (cfg.ROTUNDA_STAIR_W / 2 + 0.4),
                           -cfg.ROTUNDA_RINGS * cfg.ROTUNDA_DROP / 2 - 4, ccz + side * pit / 2);
        grp.add(cheek);
      }
    }

    // 4. La couronne de torches, deux étages, toutes tournées vers le centre.
    for (let lvl = 0; lvl < 2; lvl++) {
      const h = lvl === 0 ? cfg.WALL_TORCH_H : cfg.WALL_TORCH_H + 3.4;
      for (let i = 0; i < cfg.ROTUNDA_TORCHES; i++) {
        const a = (i + (lvl ? 0.5 : 0)) / cfg.ROTUNDA_TORCHES * Math.PI * 2;
        const t2 = wallTorch(cfg, i * 3 + lvl);
        t2.position.set(ccx + Math.cos(a) * (rad - 0.5), h, ccz + Math.sin(a) * (rad - 0.5));
        // Le bras d'une torche murale part vers son -Z local : on tourne le
        // groupe pour que ce -Z pointe vers le centre de la salle.
        t2.rotation.y = Math.atan2(Math.cos(a), Math.sin(a));
        grp.add(t2);
        wallFlames.push(t2);
        if (i % 3 === 0 && lvl === 0) {
          const lamp = new THREE_.PointLight(cfg.COL_TORCH, 1.1, C * 3.2, 2);
          lamp.position.set(ccx + Math.cos(a) * (rad - 3), h + 2, ccz + Math.sin(a) * (rad - 3));
          grp.add(lamp);
        }
      }
    }

    // 5. Le fût de lumière central, plus haut que les murs : c'est lui qu'on
    //    voit d'un couloir, et c'est lui qui donne envie d'aller voir.
    const shaft = new THREE_.Mesh(
      new THREE_.CylinderGeometry(cfg.ROTUNDA_STAIR_W * 0.5, cfg.ROTUNDA_STAIR_W * 0.9, 46, 12, 1, true),
      new THREE_.MeshBasicMaterial({ color: cfg.COL_TORCH_CORE, transparent: true, opacity: 0.10,
        blending: THREE_.AdditiveBlending, side: THREE_.DoubleSide, depthWrite: false, fog: false }));
    shaft.position.set(ccx, 18, ccz);
    grp.add(shaft);
    grp.userData.shaft = shaft;
    const sun = new THREE_.PointLight(cfg.SKY_HORIZON, 1.3, C * 6, 2);
    sun.position.set(ccx, 12, ccz);
    grp.add(sun);

    scene.add(grp);
    rotundaGroup = grp;
  }

  /* =======================================================================
     LA PLATEFORME DE RENONCEMENT ET LA HERSE — ZIP 396.
     -----------------------------------------------------------------------
     « quand on se retourne on doit voir une plateforme qui si on l'emprunte
     nous ramène directe dans le maze world. »

     Elle doit se lire en une seconde, de dos, dans le noir, sans un mot. Trois
     choses s'en chargent, et aucune n'est un texte :
       * elle est ÉCLAIRÉE en violet — la couleur qui, depuis le 393, veut dire
         « ceci est une issue » (les trous, le phare de la sortie) ;
       * elle est PLUS BASSE que la dalle du dédale, donc on la voit descendre
         vers le monde d'où l'on vient ;
       * elle a des BORDS francs et pas de garde-corps : on voit le lac de
         chaque côté, donc on comprend qu'elle mène dehors.

     La herse, elle, est suspendue AU-DESSUS de la porte dès la première image.
     C'est délibéré : on doit voir la chose qui va tomber avant qu'elle ne
     tombe, sinon sa chute est une punition arbitraire au lieu d'une échéance
     annoncée.
     ======================================================================= */
  function buildPlatform(cfg, m) {
    const grp = new THREE_.Group();
    const C = cfg.CELL, W = cfg.WALL;
    const wide = C - W;
    const zEdge = (m.entry.y + 1) * C;
    const [ex] = Rules.centerOf(cfg, m.entry.x, m.entry.y);
    const matF = new THREE_.MeshLambertMaterial({ map: tex.floor });
    const matR = new THREE_.MeshLambertMaterial({ map: tex.rune });

    // Le tablier, en trois dalles : les jointures cassent l'aplat, et la
    // dernière déborde un peu pour qu'on voie où ça s'arrête.
    for (let i = 0; i < 3; i++) {
      const len = cfg.PLATFORM_LEN / 3;
      const slab = new THREE_.Mesh(new THREE_.BoxGeometry(wide - i * 0.9, 0.5, len - 0.25), matF);
      slab.position.set(ex, -cfg.PLATFORM_DROP - 0.25, zEdge + len * (i + 0.5));
      grp.add(slab);
    }
    // Deux stèles à runes en entrée de pont : le même vocabulaire que les
    // brasiers, donc « ceci est un objet du jeu », pas un morceau de décor.
    for (const s of [-1, 1]) {
      const st2 = new THREE_.Mesh(new THREE_.BoxGeometry(0.8, 3.2, 0.8), matR);
      st2.position.set(ex + s * (wide / 2 - 0.6), 1.3 - cfg.PLATFORM_DROP, zEdge + 1.4);
      grp.add(st2);
      const halo = new THREE_.Mesh(new THREE_.PlaneGeometry(6, 6),
        new THREE_.MeshBasicMaterial({ map: tex.haloPurple, transparent: true, opacity: 0.55,
          blending: THREE_.AdditiveBlending, depthWrite: false, fog: false }));
      halo.position.set(ex + s * (wide / 2 - 0.6), 3.0, zEdge + 1.4);
      grp.add(halo);
      grp.userData["halo" + s] = halo;
    }
    // La colonne violette du renoncement : plus courte et plus large que le
    // phare de la sortie, pour qu'on ne confonde jamais les deux.
    const col = new THREE_.Mesh(
      new THREE_.CylinderGeometry(wide * 0.30, wide * 0.45, 16, 10, 1, true),
      new THREE_.MeshBasicMaterial({ color: cfg.COL_PURPLE, transparent: true, opacity: 0.26,
        blending: THREE_.AdditiveBlending, side: THREE_.DoubleSide, depthWrite: false, fog: false }));
    col.position.set(ex, 6, zEdge + cfg.PLATFORM_LEN * 0.55);
    grp.add(col);
    grp.userData.col = col;
    const lamp = new THREE_.PointLight(cfg.COL_PURPLE, 1.5, C * 3, 2);
    lamp.position.set(ex, 3.0, zEdge + cfg.PLATFORM_LEN * 0.5);
    grp.add(lamp);

    scene.add(grp);
    platformGroup = grp;
  }

  /* LA HERSE. Des barreaux et une traverse, taillés sur l'emprise EXACTE de
     la boîte que rules.js ajoutera aux murs — c'est la même description lue
     deux fois, jamais deux descriptions. */
  function buildGate(cfg, m, st) {
    const b = st.gateBox;
    const grp = new THREE_.Group();
    const mat = new THREE_.MeshLambertMaterial({ map: tex.wall2 });
    const iron = new THREE_.MeshLambertMaterial({ color: 0x2b2721 });
    const w = b.x1 - b.x0, d = b.z1 - b.z0;
    grp.add(new THREE_.Mesh(new THREE_.BoxGeometry(w, 0.9, d * 1.1), mat));   // traverse haute
    const n = cfg.GATE_TEETH;
    for (let i = 0; i < n; i++) {
      const bar = new THREE_.Mesh(new THREE_.BoxGeometry(w / (n * 2.2), cfg.WALL_H, d * 0.8), iron);
      bar.position.set(-w / 2 + w * (i + 0.5) / n, -cfg.WALL_H / 2 - 0.4, 0);
      grp.add(bar);
      // Pointe en bas : c'est elle qui fait lire « herse » et non « grille ».
      const tip = new THREE_.Mesh(new THREE_.BoxGeometry(w / (n * 3.4), 0.7, d * 0.55), iron);
      tip.position.set(-w / 2 + w * (i + 0.5) / n, -cfg.WALL_H - 1.0, 0);
      grp.add(tip);
    }
    grp.position.set((b.x0 + b.x1) / 2, cfg.WALL_H + 1.2, (b.z0 + b.z1) / 2);
    scene.add(grp);
    gateMesh = grp;
    void m;
  }

  /* =======================================================================
     LES TROIS EFFETS DU COMBAT — ZIP 396.
     -----------------------------------------------------------------------
     « on sait pas quand on gagne, si on touche etc. »

     ⚠️ TOUT EST EN RÉSERVE, RIEN N'EST CRÉÉ EN COURS DE PARTIE. Fabriquer une
     géométrie au moment de l'impact, c'est allouer pendant l'image la plus
     chargée de la partie — et c'est le hoquet qu'on remarque. Les trois
     réserves sont donc construites une fois et recyclées ; leur taille est le
     nombre maximal d'effets simultanés, pas une estimation.
     ======================================================================= */
  function buildFx(cfg) {
    const sg = new THREE_.BoxGeometry(0.22, 0.22, 0.22);
    for (let i = 0; i < 48; i++) {
      const m2 = new THREE_.Mesh(sg, new THREE_.MeshBasicMaterial({
        color: i % 3 ? cfg.COL_TORCH_CORE : cfg.COL_STEEL, fog: false,
        transparent: true, opacity: 1, depthWrite: false, blending: THREE_.AdditiveBlending }));
      m2.visible = false;
      scene.add(m2);
      sparkPool.push(m2);
    }
    const cg = new THREE_.CylinderGeometry(1.1, 2.0, 9, 8, 1, true);
    for (let i = 0; i < 4; i++) {
      const m2 = new THREE_.Mesh(cg, new THREE_.MeshBasicMaterial({
        color: cfg.COL_PURPLE, transparent: true, opacity: 0, side: THREE_.DoubleSide,
        depthWrite: false, blending: THREE_.AdditiveBlending, fog: false }));
      m2.visible = false;
      scene.add(m2);
      soulPool.push(m2);
    }
    const pg = new THREE_.PlaneGeometry(3.4, 1.7);
    for (let i = 0; i < 4; i++) {
      const m2 = new THREE_.Mesh(pg, new THREE_.MeshBasicMaterial({
        map: tex.score, transparent: true, opacity: 0, depthWrite: false, fog: false }));
      m2.visible = false;
      scene.add(m2);
      scorePool.push(m2);
    }
  }

  /* LA JAUGE DE VIE. Demande explicite : « on doit voir la jauge ».
     Le remplissage est un plan DÉCALÉ dans un groupe qu'on met à l'échelle :
     c'est le seul moyen de faire décroître une barre par la droite sans
     recalculer sa géométrie, puisqu'un plan se met à l'échelle autour de son
     centre. Détail idiot, défaut classique — une barre qui rétrécit des deux
     côtés à la fois ne se lit pas comme une perte de vie. */
  function buildRoamerHud(cfg, rg) {
    const W = 2.4, H = 0.30;
    const grp = new THREE_.Group();
    const back = new THREE_.Mesh(new THREE_.PlaneGeometry(W + 0.16, H + 0.14),
      new THREE_.MeshBasicMaterial({ color: 0x140d18, transparent: true, opacity: 0.75,
        depthWrite: false, fog: false }));
    grp.add(back);
    const fillG = new THREE_.Group();
    const fill = new THREE_.Mesh(new THREE_.PlaneGeometry(W, H),
      new THREE_.MeshBasicMaterial({ color: 0xe8356e, transparent: true, opacity: 0.95,
        depthWrite: false, fog: false }));
    fill.position.x = W / 2;
    fillG.add(fill);
    fillG.position.x = -W / 2;
    grp.add(fillG);
    grp.position.y = 3.5;
    grp.visible = false;
    scene.add(grp);

    // Le blanchiment du coup porté : une boîte additive blanche autour du
    // tronc. Additive sur une créature presque noire, c'est un éclair.
    const flash = new THREE_.Mesh(new THREE_.BoxGeometry(1.5, 2.4, 1.3),
      new THREE_.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0,
        depthWrite: false, blending: THREE_.AdditiveBlending, fog: false }));
    flash.position.y = 0.5;
    rg.hips.add(flash);

    // Le liseré de la cible visée : un disque au sol, sous ses pieds. Au sol
    // plutôt qu'autour d'elle parce qu'un contour se perd dans un couloir
    // encombré, alors qu'une tache au sol se voit toujours.
    const ring = new THREE_.Mesh(new THREE_.PlaneGeometry(4.2, 4.2),
      new THREE_.MeshBasicMaterial({ map: tex.haloCyan, transparent: true, opacity: 0,
        depthWrite: false, blending: THREE_.AdditiveBlending, fog: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12;
    ring.visible = false;
    scene.add(ring);

    return { grp, fillG, flash, ring, W };
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
      // La rotonde a sa propre couronne de torches (voir buildRotunda) : celles
      // de la grille tomberaient dans la maçonnerie des coins.
      if (inRotunda(m, x, y)) continue;
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
    /* ⚠️ LA ROTONDE EST À CIEL OUVERT, comme les salles — c'est même la seule
       vraie vue dégagée du jeu, et la couvrir supprimerait tout ce qu'elle
       apporte. On l'ajoute donc au test, avec une cellule de marge. */
    const inRoom = (x, y) => m.rooms.some(r => x >= r.x - 1 && x < r.x + r.w + 1 && y >= r.y - 1 && y < r.y + r.h + 1)
      || (m.rotunda && x >= m.rotunda.x - 1 && x < m.rotunda.x + m.rotunda.w + 1
                    && y >= m.rotunda.y - 1 && y < m.rotunda.y + m.rotunda.h + 1);
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
      const gy = Rules.groundY(cfg, m, wx, wz);
      g.position.set(wx, gy, wz);
      scene.add(g);
      const lamp = new THREE_.PointLight(cfg.COL_TORCH, 1.9, cfg.CELL * 3.4, 2);
      lamp.position.set(wx, gy + 5.2, wz);
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
      const gy = Rules.groundY(cfg, m, wx, wz);
      grp.position.set(wx, gy + 1.9, wz);
      scene.add(grp);
      shardMeshes.push({ mesh: grp, s: sh, halo, gy });
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
      grp.position.set(wx, Rules.groundY(cfg, m, wx, wz) + 0.9, wz);
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
    CFG_ = cfg; ST_ = st; M_ = m; skin = sk;

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
    // ⚠️ Zip 396 : les collections neuves se remettent à zéro AVEC les autres.
    // C'est la ligne qu'on oublie, et c'est le défaut du 393 — la deuxième
    // partie plantait, celle qu'on joue toujours.
    lakeMists = []; roamerHud = []; sparkPool = []; soulPool = []; scorePool = [];
    gateMesh = null; platformGroup = null; rotundaGroup = null; stalkerFlash = null;

    scene = new THREE_.Scene();
    scene.fog = new THREE_.Fog(cfg.COL_FOG, cfg.FOG_NEAR_FULL, cfg.FOG_FAR_FULL);

    camera = new THREE_.PerspectiveCamera(cfg.CAM_FOV, 1, 0.1, m.G * cfg.CELL * 4);
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
    buildRotunda(cfg, m);      // zip 396 : la salle centrale
    buildProps(cfg, m, st);
    buildPlatform(cfg, m);      // zip 396 : le renoncement...
    buildGate(cfg, m, st);      // ... et ce qui le referme
    buildFx(cfg);               // ... et les effets du combat

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
      roamerHud.push(buildRoamerHud(cfg, rg));   // zip 396 : jauge, éclair, liseré
    }
    stalkerRig = Rig.buildStalker(cfg);
    stalkerMesh = stalkerRig.root;
    stalkerMesh.visible = false;
    scene.add(stalkerMesh);
    // Le traqueur a l'éclair du coup porté mais NI jauge NI liseré : il n'a
    // pas de points de vie et on ne le tue pas. Lui donner une barre serait
    // promettre qu'on peut la vider.
    stalkerFlash = new THREE_.Mesh(new THREE_.BoxGeometry(1.4, 3.4, 1.2),
      new THREE_.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0,
        depthWrite: false, blending: THREE_.AdditiveBlending, fog: false }));
    stalkerFlash.position.y = 0.6;
    stalkerRig.spine.add(stalkerFlash);
    // Halo violet autour du crâne du traqueur : il le rend repérable au fond
    // d'un couloir avant même qu'on distingue sa silhouette.
    stalkerHalo = new THREE_.Mesh(new THREE_.PlaneGeometry(3.4, 3.4),
      new THREE_.MeshBasicMaterial({ map: tex.haloPurple, transparent: true, opacity: 0.32,
        blending: THREE_.AdditiveBlending, depthWrite: false, fog: false }));
    stalkerRig.skull.add(stalkerHalo);
    stalkerHalo.position.set(0, 0.3, -0.1);
    snapPrev(st);

    cam.x = st.px; cam.y = cfg.CAM_HEIGHT; cam.z = st.pz + cfg.CAM_DIST;
    cam.ang = st.ang;      // zip 396 : la caméra démarre DERRIÈRE, pas en train de rattraper
    resize();
  }

  /* =======================================================================
     reskin — ZIP 396 : CHANGER LA TENUE SANS RECONSTRUIRE LE LABYRINTHE.
     -----------------------------------------------------------------------
     C'est la moitié de la réparation de la page de lancement. La ferme envoie
     la tenue du joueur (vf-lab-init) APRÈS le chargement de la page ; game.js
     rejouait alors newRun() en entier, c'est-à-dire regénérait le dédale,
     repeignait les textures et reconstruisait 2 400 maillages — pour changer
     quatre couleurs. D'où le gel signalé par Guillaume, juste avant que
     l'écran-titre s'affiche.

     Ici on ne refait QUE le fermier : une centaine de volumes, quelques
     millisecondes. Le décor, lui, n'a jamais rien eu à voir avec la tenue.

     ⚠️ ON REPREND LA POSITION ET LA VISIBILITÉ DE L'ÉPÉE de l'ancien rig. Un
     joueur qui change de tenue au milieu d'une partie (ça n'arrive pas
     aujourd'hui, mais rien ne l'interdit) ne doit pas être téléporté à
     l'origine ni désarmé.
     ======================================================================= */
  function reskin(cfg, sk) {
    if (!playerRig || !scene) return;
    const old = playerRig;
    const pos = old.root.position, rot = old.root.rotation.y, armed = old.sword.visible;
    scene.remove(old.root);
    skin = sk;
    playerRig = Rig.buildFarmer(cfg, tex, sk);
    player = playerRig.root;
    player.position.set(pos.x, pos.y, pos.z);
    player.rotation.y = rot;
    playerRig.sword.visible = armed;
    scene.add(player);
    playerRig.torch.add(flameMesh);
    playerRig.torch.add(torchHalo);
    torchMesh = playerRig.torch;
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

    /* ⚠️ LA HAUTEUR DU SOL VIENT DE Rules.groundY (zip 396), jamais d'un
       calcul local. C'est une fonction PURE du moteur : le fermier, les
       créatures, la caméra et les marches de l'escalier lisent tous la même,
       donc personne ne peut flotter au-dessus d'une marche que quelqu'un
       d'autre aurait posée ailleurs. */
    const pY = Rules.groundY(cfg, M_, px, pz);
    player.position.set(px, pY, pz);
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

    torchLight.position.set(px - Math.sin(pang) * 1.4, pY + 3.2, pz - Math.cos(pang) * 1.4);
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
      s.mesh.position.y = (s.gy || 0) + 1.9 + Math.sin(t * 2.2 + s.s.x) * CFG_.SHARD_BOB;
      s.halo.lookAt(camera.position);
    }
    for (const p of potionMeshes) {
      p.mesh.visible = !p.p.taken;
      if (p.mesh.visible) { p.mesh.rotation.y = t * 1.1; p.halo.lookAt(camera.position); }
    }

    // --- créatures, interpolées et posées par rig.js
    for (let i = 0; i < roamerRigs.length; i++) {
      const r = st.roamers[i], rg = roamerRigs[i], hud = roamerHud[i];
      // ⚠️ La durée de vie du cadavre vient de CFG.KILL_VANISH_MS, la même
      // constante que celle qui pilote la désintégration dans rig.js. Au 395
      // elle était écrite « 3 » ici et nulle part ailleurs : la créature
      // disparaissait donc au milieu de son animation de mort si l'une des
      // deux valeurs bougeait.
      rg.root.visible = !r.dead || r.deadT < cfg.KILL_VANISH_MS / 1000;
      if (!rg.root.visible) { hud.grp.visible = false; hud.ring.visible = false; continue; }
      const pr = prev && prev.roamers[i];
      const rx = pr ? Rig.lerp(pr.x, r.x, a) : r.x;
      const rz = pr ? Rig.lerp(pr.z, r.z, a) : r.z;
      rg.root.position.set(rx, Rules.groundY(cfg, M_, rx, rz), rz);
      rg.root.rotation.y = pr ? lerpA(pr.ang, r.ang, a) : r.ang;
      Rig.poseRoamer(rg, {
        gait: pr ? lerpGait(pr.gait, r.gait, a) : r.gait,
        gaitSpeed: r.gaitSpeed || 0,
        chasing: r.mode === "chase",
        stagger: r.staggerT / (cfg.ROAMER_STAGGER_MS / 1000),
        dead: r.dead, deadT: r.deadT,
      }, cfg, t + i * 1.7);   // décalage : deux créatures ne respirent jamais ensemble

      /* ---- ZIP 396 : LA JAUGE, L'ÉCLAIR ET LE LISERÉ.
         La jauge ne s'affiche pas en permanence : elle apparaît quand la
         créature est ASSEZ PRÈS pour qu'on la combatte. Une barre au fond d'un
         couloir ne renseigne sur rien et trahit une position que le noir était
         censé cacher — le noir protège aussi le joueur, c'est une règle du
         393 qu'un HUD trop bavard annulerait. */
      const dPlayer = Math.hypot(rx - px, rz - pz);
      const near = !r.dead && dPlayer < cfg.HP_BAR_RANGE;
      hud.grp.visible = near;
      if (near) {
        hud.grp.position.set(rx, Rules.groundY(cfg, M_, rx, rz) + 3.9, rz);
        hud.grp.lookAt(camera.position);
        const k2 = Math.max(0, Math.min(1, r.hp / (r.hpMax || cfg.ROAMER_HP)));
        hud.fillG.scale.set(k2, 1, 1);
      }
      hud.flash.material.opacity = (r.hitFlash || 0) * 0.55;
      hud.ring.visible = (r.aimT || 0) > 0 && !r.dead;
      if (hud.ring.visible) {
        hud.ring.position.set(rx, Rules.groundY(cfg, M_, rx, rz) + 0.12, rz);
        hud.ring.material.opacity = Math.min(0.7, r.aimT * 1.4);
      }
    }
    stalkerMesh.visible = st.stalkerAwake;
    if (stalkerFlash) stalkerFlash.material.opacity = (st.stalker.hitFlash || 0) * 0.45;
    if (st.stalkerAwake) {
      const s2 = st.stalker;
      const sx = prev ? Rig.lerp(prev.sx, s2.x, a) : s2.x;
      const sz = prev ? Rig.lerp(prev.sz, s2.z, a) : s2.z;
      const sang = prev ? lerpA(prev.sang, s2.ang, a) : s2.ang;
      stalkerMesh.position.set(sx, Rules.groundY(cfg, M_, sx, sz), sz);
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

    /* --- LAC, CIEL ET PHARE.
       ⚠️ LES DEUX NAPPES DÉRIVENT À DES VITESSES DIFFÉRENTES, et c'est tout
       l'effet : c'est leur décalage qui miroite, pas leur dessin. Les deux
       vitesses sont celles du défi de fuite. */
    lakeMat.map.offset.x = t * 0.035;
    lakeMat.map.offset.y = t * 0.022;
    if (lakeGlowMat) {
      lakeGlowMat.map.offset.x = -t * 0.021;
      lakeGlowMat.map.offset.y = t * 0.014;
    }
    // Les voiles orbitent autour du JOUEUR : ils l'entourent donc toujours,
    // où qu'il soit, sans qu'on en sème sur 414 unités de côté.
    for (let i = 0; i < lakeMists.length; i++) {
      const mm = lakeMists[i], u = mm.userData;
      const ang = u.orbit + t * u.speed;
      mm.position.set(px + Math.cos(ang) * u.radius, cfg.LAKE_Y + 0.9 + Math.sin(t * 0.3 + i) * 0.5,
                      pz + Math.sin(ang) * u.radius);
    }
    beaconMat.opacity = 0.3 + Math.sin(t * Math.PI * 2 * CFG_.BEACON_PULSE) * 0.14;
    if (skyMesh) skyMesh.rotation.y = t * 0.004;   // très lent : le ciel bouge à peine

    syncGate(st, cfg, t);
    syncFx(st, cfg, t);
    updateCamera(st, cfg, px, pz, pang);
    renderer.render(scene, camera);
  }

  /* -----------------------------------------------------------------------
     LA HERSE ET LA PLATEFORME, à l'image (zip 396).
     -----------------------------------------------------------------------
     ⚠️ LA HERSE NE DÉCIDE DE RIEN ICI : rules.js a déjà tranché son état
     (0 ouverte, 1 elle tombe, 2 fermée) et le moment où sa boîte rejoint les
     murs. On ne fait que la POSER à la hauteur que dit gate.t. Une porte qui
     descendrait au rendu et bloquerait au moteur à un autre instant, c'est
     très exactement le défaut du zip 387 — deux descriptions d'une même chose.
     -------------------------------------------------------------------- */
  function syncGate(st, cfg, t) {
    if (!gateMesh) return;
    const g = st.gate;
    const top = cfg.WALL_H + 1.2;
    if (g.state === 0) {
      // Suspendue, et elle FRÉMIT quand l'échéance approche : c'est le seul
      // avertissement non écrit, et il vaut mieux qu'un compte à rebours.
      const soon = st.abandonT > 0 && st.abandonT < cfg.GATE_WARN_MS / 1000;
      gateMesh.position.y = top + (soon ? Math.sin(t * 34) * 0.09 : 0);
    } else if (g.state === 1) {
      // Chute accélérée : une herse ne descend pas, elle TOMBE.
      const k = Math.min(1, g.t * 1000 / cfg.GATE_FALL_MS);
      gateMesh.position.y = top - (top - cfg.WALL_H / 2 + 0.4) * (k * k);
    } else {
      gateMesh.position.y = cfg.WALL_H / 2 - 0.4;
    }
    if (platformGroup) {
      // La plateforme s'éteint une fois la herse close : elle ne mène plus
      // nulle part, et une lumière qui invite vers une porte fermée est un
      // mensonge de plus dans un jeu qui en a déjà assez.
      const open = g.state !== 2;
      const pulse = 0.20 + Math.sin(t * 2.2) * 0.07;
      if (platformGroup.userData.col)
        platformGroup.userData.col.material.opacity = open ? pulse : 0.03;
      for (const s of [-1, 1]) {
        const h = platformGroup.userData["halo" + s];
        if (h) { h.material.opacity = open ? 0.45 + Math.sin(t * 2.6 + s) * 0.12 : 0.06; h.lookAt(camera.position); }
      }
    }
  }

  /* LES ÉTINCELLES, LES ÂMES ASPIRÉES ET LES POINTS QUI MONTENT.
     Tout est piloté par st.fx, produit par rules.js : le rendu ne décide ni
     du moment, ni de l'endroit, ni de la durée. Il lit. */
  function syncFx(st, cfg, t) {
    let is = 0, iso = 0, isc = 0;
    for (const f of st.fx) {
      const k = f.t / f.ttl;
      if (f.kind === "spark") {
        // Huit éclats par gerbe, chacun sur sa propre trajectoire tirée du
        // rang : déterministe, donc identique d'une rediffusion à l'autre.
        for (let i = 0; i < 8 && is < sparkPool.length; i++, is++) {
          const m2 = sparkPool[is];
          const a2 = Paint.noise(i * 17 + 3) * Math.PI * 2;
          const el = 0.3 + Paint.noise(i * 29) * 1.6;
          const sp = 3.4 + Paint.noise(i * 13) * 4.0;
          m2.visible = true;
          m2.position.set(f.x + Math.cos(a2) * sp * f.t,
                          f.y + el * f.t * 3.2 - 9 * f.t * f.t,
                          f.z + Math.sin(a2) * sp * f.t);
          const s = Math.max(0.05, 1 - k);
          m2.scale.set(s, s, s);
          m2.material.opacity = 1 - k;
        }
      } else if (f.kind === "soul" && iso < soulPool.length) {
        const m2 = soulPool[iso++];
        m2.visible = true;
        m2.position.set(f.x, 4.5 + k * cfg.KILL_RISE, f.z);
        // Elle s'étrangle en montant : une colonne d'aspiration se resserre,
        // sinon on lit « explosion » et pas « aspiration ».
        m2.scale.set(1 - k * 0.75, 1 + k * 0.8, 1 - k * 0.75);
        m2.material.opacity = 0.55 * (1 - k * k);
      } else if (f.kind === "score" && isc < scorePool.length) {
        const m2 = scorePool[isc++];
        m2.visible = true;
        m2.position.set(f.x, f.y + k * 2.6, f.z);
        m2.lookAt(camera.position);
        m2.material.opacity = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      }
    }
    for (; is < sparkPool.length; is++) sparkPool[is].visible = false;
    for (; iso < soulPool.length; iso++) soulPool[iso].visible = false;
    for (; isc < scorePool.length; isc++) scorePool[isc].visible = false;
    void t;
  }

  /* LA CAMÉRA NE TRAVERSE PAS LES MURS. Elle voudrait se poser à CAM_DIST
     derrière le joueur ; si de la maçonnerie se trouve sur ce segment, elle se
     rapproche jusqu'à CAM_MIN_DIST. Sans ça, tout virage serré met la caméra
     DANS la pierre et l'écran devient noir — le défaut le plus banal du genre,
     et le plus insupportable. */
  function updateCamera(st, cfg, px, pz, pang) {
    /* ⚠️ ZIP 396 — LA CAMÉRA A SON PROPRE CAP, ET C'EST TOUTE LA RÉPONSE À
       « la caméra bouge trop, difficile à naviguer pour un simple clavier ».

       Jusqu'ici cette fonction recevait `pang` — le cap du FERMIER — et posait
       la caméra derrière lui. Elle tournait donc exactement avec lui, à la
       même vitesse, à la même image : appuyer sur une flèche faisait pivoter
       le décor entier d'un bloc. Le lissage de POSITION ajouté au 395 n'y
       pouvait rien, puisqu'il lissait un point qui tournait déjà.

       Maintenant, `cam.ang` RATTRAPE `pang` :
         * rien ne bouge tant que l'écart reste sous CAM_ANG_DEAD. C'est cette
           zone morte qui supprime le frémissement permanent des micro-
           corrections, et c'est elle qu'on sent le plus ;
         * au-delà, on rattrape en exponentielle, donc indépendamment de la
           cadence d'écran — la seule forme qui le soit.

       Conséquence recherchée : on voit le fermier PIVOTER DANS LE CADRE avant
       que le cadre ne suive. C'est ce décalage qui rend un virage lisible, et
       c'est aussi ce qui fait qu'on ne perd plus le nord dans un croisement. */
    let d0 = pang - cam.ang;
    while (d0 > Math.PI) d0 -= Math.PI * 2;
    while (d0 < -Math.PI) d0 += Math.PI * 2;
    const over = Math.abs(d0) - cfg.CAM_ANG_DEAD;
    if (over > 0) {
      const k0 = 1 - Math.exp(-cfg.CAM_ANG_LAG * frameDt);
      cam.ang += Math.sign(d0) * over * k0;
    }

    const back = cfg.CAM_DIST;
    let d = back;
    const dirX = Math.sin(cam.ang), dirZ = Math.cos(cam.ang);   // vers l'arrière
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
    /* La caméra suit le sol elle aussi : sans ça, descendre dans la rotonde
       la ferait raser les gradins puis passer sous le fermier. */
    cam.y += (cfg.CAM_HEIGHT + Rules.groundY(cfg, M_, px, pz) - cam.y) * k;
    const shake = st.camShake;
    camera.position.set(
      cam.x + (Math.random() - 0.5) * shake,
      cam.y + (Math.random() - 0.5) * shake,
      cam.z + (Math.random() - 0.5) * shake);
    // Pendant la chute, on regarde EN BAS : c'est le seul moment où le lac est
    // le sujet, et il faut qu'on le voie arriver.
    const lookY = st.status === "falling" ? cfg.LAKE_Y : cfg.CAM_LOOK_H + Rules.groundY(cfg, M_, px, pz);
    camera.lookAt(px, lookY, pz);
  }

  function fallStep(st, dt) {
    // Purement visuel : rules.js a déjà tranché le sort du joueur.
    player.position.y -= dt * 16;
  }

  return { init, sync, snapPrev, resize, fallStep, reskin, get renderer() { return renderer; } };
})();
