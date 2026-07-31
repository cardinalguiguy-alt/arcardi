/* =============================================================================
   world.js — Rendu Three.js. Scène, matériaux, construction des tronçons.
   -----------------------------------------------------------------------------
   ZIP 374 — REFONTE DU DÉCOR d'après l'illustration de référence fournie par
   Guillaume (chaussée de temple en ruine, ciel violet orageux, lac luisant).

   Consigne exacte : « inspire-toi surtout de la PLATEFORME. Les arches ne sont
   pas pour l'instant essentielles. » D'où le parti pris central de ce fichier :
   PAS de couloir fermé. Ce qui borde la piste, ce sont des blocs bas, des
   stèles, de la mousse et des champignons — hauts d'un mètre, pas de trois. La
   raison n'est pas seulement esthétique : deux murs pleins masqueraient le ciel
   ET le lac, c'est-à-dire les deux choses expressément demandées.

   Toujours vrai depuis le 372 :
   * Rendu en basse résolution puis étirement en CSS (CFG.PIXEL_SCALE). C'est ce
     qui donne l'aspect pixelisé, et ça divise le coût de remplissage par ~11.
   * Brouillard exponentiel dense, pour l'ambiance et pour masquer la fin de la
     piste.
   * Que des boîtes et des plans. Aucun shader, aucun modèle importé.

   Les textures sont peintes au démarrage sur des canvas MINUSCULES (32 à 128
   px) et figées en NearestFilter. C'est volontaire : on reste du pixel-art
   plaqué, on n'ouvre pas la porte à des textures peintes finement qui
   jureraient avec le reste du jeu.

   BUDGET DE MESHES. Chaque boîte est un appel de rendu. La règle qu'on s'est
   donnée : un tronçon reste sous ~180 objets, tout compris. Les torches sont
   passées de 13 à 22 unités d'écart pour financer les champignons et les
   bordures. Si tu ajoutes du décor, retire ailleurs.
   ========================================================================== */

const World = (function () {
  let renderer, scene, camera, canvas;
  let playerMesh, playerRig, wolfMeshes = [], torchLight, mushLight;
  let ambientLight, moonLight;
  let sky, skyMat, boltMesh, boltMats = [];
  let lake, lakeMat, lakeGlow, lakeGlowMat, mists = [];
  let geo = {}, mat = {};
  let flames = [];        // plans de flamme à faire vaciller (corps ET cœurs)
  let trees = [];         // arbres morts en panneaux, pivotés autour de Y (zip 379)
  const flamePulse = [];  // cadences de respiration des matériaux de flamme
  let glows = [];         // plans lumineux (champignons, runes) à tourner vers la caméra
  let dust = [];          // bouffées de poussière de glissade, recyclées
  let lastNow = 0;
  const nodeGroups = new Map();

  /* Échelles de répétition des textures du lac. Dérivées de LAKE_SIZE une
     fois pour toutes : elles servent AUSSI à compenser le déplacement du plan
     dans updateAmbient, et les recalculer là-bas serait le meilleur moyen de
     les désaccorder (l'eau se mettrait à filer avec la caméra). */
  let lakeUnitsPerTile = 26, glowUnitsPerTile = 37;

  /* État de l'orage. Voir tickLightning(). */
  const storm = { nextAt: 0, startedAt: -1e9, bolt: -1, boltU: 0 };

  /* --------------------------------------------------------------- SETUP */
  function init(canvasEl) {
    canvas = canvasEl;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(1);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(CFG.COL_FOG, CFG.FOG_NEAR_DENSITY);

    camera = new THREE.PerspectiveCamera(CFG.CAM_FOV, 1, 0.1, CFG.DRAW_DISTANCE);

    /* Éclairage : quatre sources, pas une de plus. L'ambiante est violette
       (c'est elle qui porte l'ambiance), la lune est froide et rasante, la
       torche suit le joueur, et une quatrième lampe très faible imite la
       lueur du lac — c'est elle qui détache les silhouettes du fond noir. */
    ambientLight = new THREE.AmbientLight(CFG.COL_PURPLE_DIM, 0.5);
    scene.add(ambientLight);
    moonLight = new THREE.DirectionalLight(0xa694d4, 0.5);
    moonLight.position.set(-0.4, 1, 0.25);
    scene.add(moonLight);
    torchLight = new THREE.PointLight(CFG.COL_TORCH, 1.35, 30, 2);
    scene.add(torchLight);
    mushLight = new THREE.PointLight(CFG.COL_PURPLE, 0.75, 26, 2);
    scene.add(mushLight);

    buildAssets();
    buildSky();
    buildLake();
    buildDust();
    resize();
    window.addEventListener("resize", resize);

    storm.nextAt = 3000 + Math.random() * CFG.LIGHTNING_MAX_MS;
  }

  function cssHex(hex) { return "#" + hex.toString(16).padStart(6, "0"); }

  /* Assombrissement d'une couleur, équivalent 3D du `shade()` de fermeArt.js.
     Le sprite 2D ombre déjà le bas de la jupe (« P(g, x+3, 20, 10, 1,
     shade(o.shirt)) ») ; sans ça, buste et jupe fusionnent en un seul aplat et
     la silhouette féminine perd sa taille. Vérifié au rendu. */
  function shadeHex(hex) {
    const r = Math.round(((hex >> 16) & 255) * 0.72);
    const g = Math.round(((hex >> 8) & 255) * 0.72);
    const b = Math.round((hex & 255) * 0.72);
    return (r << 16) | (g << 8) | b;
  }

  /* Canvas de travail. Passer par un helper permet au faux DOM de
     tools/smoke-render.js de fournir un canvas bidon en UN seul endroit. */
  function makeCanvas(w, h) {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    return cv;
  }

  function pixelTexture(cv, repeatX, repeatY) {
    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    if (repeatX) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeatX, repeatY);
    }
    return tex;
  }

  function buildAssets() {
    geo.box = new THREE.BoxGeometry(1, 1, 1);
    geo.coin = new THREE.OctahedronGeometry(0.42, 0);
    geo.plane = new THREE.PlaneGeometry(1, 1);
    geo.cap = new THREE.SphereGeometry(0.5, 6, 4);   // chapeau de champignon, très peu de segments

    const L = (c, opts) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, opts || {}));
    mat.stone     = L(CFG.COL_STONE);
    mat.stoneDark = L(CFG.COL_STONE_DARK);
    mat.edge      = L(CFG.COL_STONE_EDGE);
    mat.obstacle  = L(CFG.COL_OBSTACLE);
    mat.bark      = L(CFG.COL_BARK);
    mat.barkDark  = L(CFG.COL_BARK_DARK);
    mat.wolf      = L(CFG.COL_WOLF);
    mat.shirt     = L(CFG.COL_SHIRT);
    mat.shirtDark = L(shadeHex(CFG.COL_SHIRT));   // bas de jupe : voir buildPlayer
    mat.pants     = L(CFG.COL_PANTS);
    mat.skin      = L(CFG.COL_SKIN);
    mat.hair      = L(CFG.COL_HAIR);
    mat.earring   = L(0xe85a8a);   // le pixel rose du sprite féminin (fermeArt.js)
    mat.moss      = L(CFG.COL_MOSS);
    mat.mossDark  = L(CFG.COL_MOSS_DARK);
    mat.vine      = L(CFG.COL_VINE);
    mat.mushStem  = L(0x6a5f7a);
    mat.torchWood = L(0x241f1a);
    mat.torchHead = L(0x140f0a);   // extrémité carbonisée du bâton (zip 377)
    /* Même bois que la torche, IDENTITÉ DISTINCTE. Le montant qui soutient une
       poutre haute n'est pas une torche : les confondre suffisait à faire
       échouer le contrôle « aucune torche ne flotte » de smoke-render.js sur
       trois faux positifs, et un contrôle bruyant finit ignoré, donc mort. */
    mat.beamPost = L(0x241f1a);
    mat.coin      = new THREE.MeshLambertMaterial({ color: CFG.COL_COIN, emissive: CFG.COL_COIN, emissiveIntensity: 0.45 });

    mat.pit       = new THREE.MeshBasicMaterial({ color: 0x05060a });   // paroi intérieure d'une crevasse
    mat.eye       = new THREE.MeshBasicMaterial({ color: CFG.COL_WOLF_EYE });
    mat.mushroom  = new THREE.MeshBasicMaterial({ color: CFG.COL_MUSHROOM });
    /* --------------------------------------------- FLAMMES (zip 377) ---
       Remplacent le plan orange uni du 372. Deux matériaux par flamme, et
       c'est la séparation qui fait tout le travail :

         * le CORPS, en fondu normal, porte la SILHOUETTE — c'est lui qui a une
           pointe, des épaules irrégulières et un liseré sombre. Une flamme
           entièrement additive n'a pas de contour : elle se dissout dans le
           fond et redevient la tache orange qu'on veut quitter.
         * le CŒUR, additif, porte la LUMIÈRE. Plus petit, plus court, presque
           blanc, il déborde en clair au milieu du corps.

       QUATRE VARIANTES de chaque, tirées avec des graines différentes : deux
       torches côte à côte n'ont donc pas la même découpe. Elles sont MISES EN
       COMMUN et non clonées par torche — un matériau cloné par flamme fuirait
       à chaque dropNode, qui ne libère que les géométries. */
    mat.flameBody = [];
    mat.flameCore = [];
    for (let i = 0; i < 4; i++) {
      mat.flameBody.push(new THREE.MeshBasicMaterial({
        map: pixelTexture(paintFlame(1471 + i * 733, false)),
        transparent: true, opacity: 0.86, depthWrite: false, side: THREE.DoubleSide,
      }));
      mat.flameCore.push(new THREE.MeshBasicMaterial({
        map: pixelTexture(paintFlame(9043 + i * 617, true)),
        transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }));
    }
    /* Respiration lumineuse des matériaux. Elle ne peut pas être par torche
       (voir ci-dessus), mais elle n'a pas besoin de l'être : quatre cadences
       incommensurables entre elles, combinées au vacillement propre à chaque
       flamme, suffisent à ce qu'on ne surprenne jamais deux torches en train
       de faire la même chose au même instant. */
    for (let i = 0; i < mat.flameBody.length; i++) {
      flamePulse.push({
        fb: 0.0091 + i * 0.0017, pb: i * 2.31,
        fc: 0.0223 + i * 0.0041, pc: i * 1.77 + 0.9,
      });
    }

    // Halo doux, réutilisé par les champignons, la brume, la poussière et le
    // fond des crevasses : une seule texture pour toutes les lueurs du jeu.
    const glowTex = pixelTexture(paintGlow());
    mat.glow = new THREE.MeshBasicMaterial({
      map: glowTex, color: CFG.COL_PURPLE,
      transparent: true, opacity: 0.55, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    mat.glowTex = glowTex;
    mat.rune = new THREE.MeshBasicMaterial({
      map: pixelTexture(paintRunes()), color: CFG.COL_RUNE,
      transparent: true, opacity: 0.75, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    // Flèche de virage : sans texture. Elle doit rester une masse lisible même
    // à 3,4 px par pixel, une rune s'y réduirait à du bruit.
    mat.marker = new THREE.MeshBasicMaterial({
      color: CFG.COL_PURPLE, transparent: true, opacity: 0.45,
      depthWrite: false, side: THREE.DoubleSide,
    });
    mat.crack = new THREE.MeshBasicMaterial({
      map: pixelTexture(paintCrack()), transparent: true, opacity: 0.95,
      depthWrite: false, side: THREE.DoubleSide,
    });
    mat.dust = new THREE.MeshBasicMaterial({
      map: glowTex, color: 0x8f8878,
      transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
    });

    mat.stoneVariants = buildStoneVariants();
    mat.paveVariants = buildPaveVariants();          // chaussée d'entrée (zip 379)
    mat.kerb = paintKerbMaterial();
    mat.rail = L(CFG.COL_RAIL);
    mat.railCap = L(CFG.COL_RAIL_CAP);

    /* Arbres morts en panneaux. `transparent` + `alphaTest` : sans alphaTest,
       deux arbres qui se recouvrent se découpent l'un l'autre selon l'ordre de
       tri, et on voit des trous rectangulaires dans la ramure au moment où la
       caméra tourne. Avec, la découpe est décidée par pixel et le tri ne
       compte plus. */
    mat.trees = [];
    for (let i = 0; i < CFG.TREE_BILLBOARD_VARIANTS; i++) {
      mat.trees.push(new THREE.MeshLambertMaterial({
        map: pixelTexture(paintDeadTree(4001 + i * 977)),
        transparent: true, alphaTest: 0.5, side: THREE.DoubleSide,
      }));
    }

    buildPlayer();
    buildWolves();
  }

  /* ============================================================ TEXTURES === */

  /* Halo radial générique : blanc au centre, transparent au bord. */
  function paintGlow() {
    const S = 32;
    const cv = makeCanvas(S, S);
    const ctx = cv.getContext("2d");
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.45, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return cv;
  }

  /* ============================================== FLAMME PEINTE (zip 377) ===
     Demande de Guillaume : « une vraie flamme plus travaillée ». Avant, la
     torche était un plan uni de la couleur COL_TORCH avec une opacité fixe —
     donc une pastille orange, et toutes les mêmes.

     TROIS CHOSES FONT QU'UNE FLAMME SE LIT COMME UNE FLAMME, et c'est ce que
     cette texture peint :

       1. UN PROFIL, pas une ellipse : effilée en pointe, la plus large vers
          70 % de sa hauteur, pincée à la base sur la mèche. Les épaules sont
          irrégulières (une dizaine de nœuds interpolés) et l'AXE lui-même
          serpente — une flamme n'est jamais symétrique.
       2. UN DÉGRADÉ DOUBLE. La chaleur monte quand on va vers l'axe ET quand
          on descend vers la base. Une flamme est blanche en bas au centre et
          rouge sombre en haut sur les bords ; un dégradé purement radial
          donne un œil, pas un feu.
       3. UN BORD QUI S'ÉTEINT. L'alpha tombe au bord et vers la pointe, ce
          qui donne la fumée sans dessiner de fumée.

     Peinte pixel par pixel dans un ImageData de 32×48, filtrée en Nearest
     comme tout le reste : on reste du pixel-art plaqué, on n'introduit pas
     une texture peinte finement qui jurerait avec le décor.

     `inner` produit la variante CŒUR : plus étroite, plus courte, presque
     blanche, et qui ne monte pas jusqu'à la pointe. */
  function paintFlame(seed, inner) {
    const W = 32, H = 48;
    const cv = makeCanvas(W, H);
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    const rng = Track.makeRng(seed >>> 0);

    // Nœuds du profil et du serpentement de l'axe, interpolés linéairement.
    const N = 9, jitter = [], sway = [];
    for (let i = 0; i <= N; i++) {
      jitter.push(0.76 + rng() * 0.46);
      sway.push((rng() - 0.5) * (inner ? 2.4 : 5.0));
    }
    const at = (arr, v) => {
      const x = Math.max(0, Math.min(N - 1e-6, v * N));
      const i = Math.floor(x), f = x - i;
      return arr[i] * (1 - f) + arr[i + 1] * f;
    };

    // Rampe de chaleur : du cœur presque blanc au liseré rouge sombre.
    const RAMP = inner
      ? [[1.00, 255, 253, 240], [0.55, 255, 238, 176], [0.22, 255, 198, 96], [0.00, 255, 152, 56]]
      : [[1.00, 255, 247, 212], [0.70, 255, 208, 108], [0.44, 255, 154, 60],
         [0.22, 224, 88, 28], [0.00, 118, 38, 22]];
    const heatColor = (h) => {
      for (let i = 0; i < RAMP.length - 1; i++) {
        const a = RAMP[i], b = RAMP[i + 1];
        if (h <= a[0] && h >= b[0]) {
          const f = (h - b[0]) / (a[0] - b[0]);
          return [b[1] + (a[1] - b[1]) * f, b[2] + (a[2] - b[2]) * f, b[3] + (a[3] - b[3]) * f];
        }
      }
      const last = RAMP[RAMP.length - 1];
      return [last[1], last[2], last[3]];
    };

    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    const maxHalf = W * (inner ? 0.19 : 0.41);

    for (let y = 0; y < H; y++) {
      /* v = 0 en HAUT de l'image (la pointe), 1 en BAS (la base, sur la
         mèche). Three.js retourne les textures par défaut, donc la première
         rangée de l'image se retrouve bien en haut du plan. */
      const v = y / (H - 1);
      /* Silhouette. L'EXPOSANT est le seul nombre qui compte ici, et la
         première version l'avait à 0,58 : le ventre tombait alors à un tiers
         DEPUIS LE HAUT et la flamme s'effilait vers le bas, ce qui donnait un
         panache de fumée suspendu au-dessus du bâton. À 1,94, le ventre est à
         ~70 % de la hauteur, donc BAS, près de la mèche — c'est là qu'une
         flamme est la plus large, et c'est ce qui la fait tenir au bâton.

         Rien dans le code ne signalait l'erreur : la flamme était simplement à
         l'envers. Trouvée sur la planche de tools/render-runner.js. Le facteur
         0,84 pince la dernière rangée sans la refermer, pour que la flamme se rétrécisse
         sur la mèche au lieu de s'y poser à plat. */
      let hw = Math.sin(Math.pow(v, 1.94) * Math.PI * 0.84) * maxHalf * at(jitter, v);
      if (inner) hw *= Math.min(1, v * 2.1);       // le cœur ne monte pas en pointe
      if (hw < 0.5) continue;
      const axis = W / 2 + at(sway, v) * (1 - v * 0.55);   // la base bouge moins : elle tient à la mèche
      const x0 = Math.max(0, Math.floor(axis - hw)), x1 = Math.min(W - 1, Math.ceil(axis + hw));
      for (let x = x0; x <= x1; x++) {
        const dd = Math.abs(x + 0.5 - axis) / hw;
        if (dd > 1) continue;
        const heat = Math.min(1, Math.pow(1 - dd, 1.25) * (0.30 + 0.80 * Math.pow(v, 0.75)));
        const c = heatColor(heat);
        const a = Math.min(1, (1 - dd) * 2.3)
                * (inner ? 0.52 + 0.48 * v : 0.40 + 0.60 * Math.min(1, v * 1.5));
        const k = (y * W + x) * 4;
        d[k] = c[0] | 0; d[k + 1] = c[1] | 0; d[k + 2] = c[2] | 0; d[k + 3] = (a * 255) | 0;
      }
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  /* ========================= ARBRE MORT EN PANNEAU (zip 379) ==============
     Guillaume a fourni un pixel-art d'arbre mort et demandé d'en reprendre
     l'idée : tronc noueux et fendu, branches griffues, lambeaux de mousse
     pendante, souches noyées au pied. En boîtes, on n'en approcherait jamais
     la silhouette — un arbre mort, c'est une DÉCOUPE, et une découpe se peint.

     Décision Guillaume : panneaux au LOIN, boîtes tout PRÈS. Le partage se
     fait sur le décalage latéral de l'arbre, qui ne change jamais — jamais sur
     sa distance au joueur, sinon un arbre changerait de nature sous ses yeux
     en s'approchant. C'est la seule façon d'avoir les deux sans que la
     bascule se voie une seule fois.

     Bénéfice collatéral, et il est décisif : un panneau coûte UN objet là où
     un arbre en boîtes en coûte quatre à six. C'est ce qui finance les
     rambardes de pierre de la section d'entrée.

     TRACÉ. Un tronc qui monte en serpentant et s'amincit, une fourche haute,
     des branches récursives à deux niveaux, et de la mousse suspendue aux
     départs de branche. Tout en pas entiers : on reste du pixel-art. */
  const TREE_TEX_W = 64, TREE_TEX_H = 128;   // proportions du panneau d'arbre
  function paintDeadTree(seed) {
    // 128 de haut et non 112 : à 112, la ramure des variantes les plus
    // élancées sortait par le haut du canvas et se retrouvait tranchée net.
    // Vu au rendu (tools/render-textures.js) ; invisible autrement, puisque
    // la texture n'apparaît jamais qu'à cinquante mètres dans le brouillard.
    const W = 64, H = TREE_TEX_H;
    const cv = makeCanvas(W, H);
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    const rng = Track.makeRng(seed >>> 0);

    const BARK = ["#241f1a", "#1b1712", "#2e2822"];
    const CORE = "#0d0b09";                 // fente centrale du tronc
    // Mousse pendante NETTEMENT assombrie par rapport au premier jet : à
    // #6d6480 elle ressortait plus clair que le tronc et se lisait comme des
    // barres de code-barres accrochées à l'arbre. Elle doit être une nuance,
    // pas un motif.
    const MOSS = ["#3d3849", "#484254", "#332f3e"];

    // Trait épais en pas entiers. Pas de lineTo : on veut des pixels francs,
    // et le faux canvas des outils ne sait dessiner que des rectangles.
    const limb = (x0, y0, x1, y1, w0, w1, col) => {
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        const w = Math.max(1, Math.round(w0 + (w1 - w0) * k));
        ctx.fillStyle = col;
        ctx.fillRect(Math.round(x0 + (x1 - x0) * k) - (w >> 1), Math.round(y0 + (y1 - y0) * k), w, 1);
      }
    };

    // Mousse pendante : quelques mèches verticales effilées.
    const hang = (x, y, len) => {
      for (let s = 0; s < 1 + Math.floor(rng() * 2); s++) {
        const hx = x + Math.round((rng() - 0.5) * 6);
        const hl = Math.round(len * (0.5 + rng() * 0.7));
        for (let i = 0; i < hl; i++) {
          ctx.fillStyle = MOSS[Math.floor(rng() * MOSS.length)];
          // Effilée sur toute sa longueur, et jamais plus de 2 px : une mèche
          // de mousse pend, elle ne descend pas en colonne.
          const w = i < hl * 0.35 ? 2 : 1;
          ctx.fillRect(hx + (i > hl * 0.6 ? 1 : 0), y + i, w, 1);
        }
      }
    };

    // Branches récursives. Deux niveaux : au-delà, à cette résolution, on
    // n'ajoute que du bruit.
    const branch = (x, y, ang, len, w, depth) => {
      const ex = x + Math.sin(ang) * len;
      const ey = y - Math.cos(ang) * len;
      limb(x, y, ex, ey, w, Math.max(1, w - 1), BARK[Math.floor(rng() * BARK.length)]);
      if (depth <= 0) return;
      const n = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const a = ang + (rng() - 0.5) * 1.5 + (i - (n - 1) / 2) * 0.55;
        branch(ex, ey, a, len * (0.45 + rng() * 0.3), Math.max(2, w - 2), depth - 1);
      }
      if (rng() < 0.45) hang(Math.round(ex), Math.round(ey), 9 + rng() * 12);
    };

    /* Tronc : une suite de segments qui serpentent, chacun un peu plus fin.
       C'est le serpentement qui fait l'arbre MORT — un tronc droit lit comme
       un poteau, quelle que soit la ramure qu'on lui accroche. */
    /* PROPORTIONS REPRISES DU PIXEL-ART DE RÉFÉRENCE, après un premier jet
       trop grêle : là-bas, le tronc occupe près du tiers de la largeur et
       reste massif jusqu'aux deux tiers de la hauteur. C'est cette MASSE qui
       fait l'arbre mort — un tronc fin couvert de brindilles se lit comme un
       arbuste, quelle que soit la torsion qu'on lui donne. */
    let x = W / 2, y = H - 8, w = 21, ang = (rng() - 0.5) * 0.25;
    const nodes = [];
    for (let s = 0; s < 6; s++) {
      const len = 10 + rng() * 6;
      const nx = x + Math.sin(ang) * len, ny = y - Math.cos(ang) * len;
      limb(x, y, nx, ny, w, Math.max(7, w - 2.6), BARK[0]);
      // Fente sombre au cœur du tronc : c'est elle qui le creuse, et elle est
      // le trait le plus reconnaissable de la référence.
      limb(x + 1, y, nx + 1, ny, Math.max(2, w * 0.28), Math.max(1, w * 0.2), CORE);
      // Arête éclairée d'un seul côté : un cylindre, pas une planche.
      limb(x - w * 0.36, y, nx - w * 0.32, ny, 2, 1, BARK[2]);
      nodes.push({ x: nx, y: ny, w });
      x = nx; y = ny; w = Math.max(7, w - 2.4);
      ang += (rng() - 0.5) * 0.5;
    }

    // Fourche haute : deux limbes ÉPAIS et courts, pas deux tiges.
    branch(x, y, ang - 0.5, 13 + rng() * 7, Math.max(5, w - 2), 2);
    branch(x, y, ang + 0.55, 11 + rng() * 7, Math.max(5, w - 2), 2);
    // Moignons latéraux : de gros départs cassés le long du tronc.
    for (const nd of nodes.slice(1, 5)) {
      if (rng() < 0.8) branch(nd.x, nd.y, (rng() < 0.5 ? -1 : 1) * (0.95 + rng() * 0.55),
                              8 + rng() * 7, Math.max(3, nd.w * 0.35), 1);
    }

    // Contreforts et racines : le pied s'évase largement avant de plonger.
    for (let r = 0; r < 6; r++) {
      const a = (r - 2.5) * 0.42;
      limb(W / 2, H - 14, W / 2 + Math.sin(a) * 17, H - 1, 7 - Math.abs(r - 2.5), 2, BARK[1]);
    }
    return cv;
  }

  /* Gravures runiques, du même esprit que les pierres levées de l'image : des
     hampes et des chevrons, pas un alphabet. Fond transparent — le matériau
     additif ne montrera que les traits. */
  function paintRunes() {
    const S = 64;
    const cv = makeCanvas(S, S);
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, S, S);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const cx = 12 + col * 20, cy = 12 + row * 20;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 7); ctx.lineTo(cx, cy + 7);       // hampe
        const n = 1 + Math.floor(Math.random() * 3);
        for (let b = 0; b < n; b++) {
          const y = cy - 6 + Math.random() * 12;
          const dir = Math.random() < 0.5 ? -1 : 1;
          ctx.moveTo(cx, y);
          ctx.lineTo(cx + dir * 6, y + (Math.random() < 0.5 ? -5 : 5));
        }
        ctx.stroke();
      }
    }
    return cv;
  }

  /* Entaille dans la pierre : une fente noire irrégulière sur fond
     transparent, posée à plat sur le sol. C'est elle qui fait le « trou au
     milieu » de l'illustration sans rien creuser du tout. */
  function paintCrack() {
    const W = 32, H = 64;
    const cv = makeCanvas(W, H);
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    // Corps de la fente : un polygone en zigzag, large au centre et effilé aux
    // deux bouts — une fissure s'ouvre puis se referme, elle n'a pas de bord
    // franc.
    const left = [], right = [];
    for (let i = 0; i <= 10; i++) {
      const y = (i / 10) * H;
      const taper = Math.sin((i / 10) * Math.PI);          // 0 aux bouts, 1 au centre
      const w = 1 + taper * 6 + Math.random() * 2.5;
      const drift = (Math.random() - 0.5) * 4;
      left.push([W / 2 - w + drift, y]);
      right.push([W / 2 + w + drift, y]);
    }
    ctx.fillStyle = cssHex(CFG.COL_CRACK);
    ctx.beginPath();
    ctx.moveTo(left[0][0], left[0][1]);
    for (const p of left) ctx.lineTo(p[0], p[1]);
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
    ctx.closePath();
    ctx.fill();

    // Lèvres éclatées : quelques pixels de pierre claire le long des bords.
    ctx.fillStyle = cssHex(CFG.COL_STONE_DARK);
    for (let i = 0; i < 22; i++) {
      const k = Math.floor(Math.random() * left.length);
      const x = Math.random() < 0.5 ? left[k][0] - 2 : right[k][0];
      ctx.fillRect(x, left[k][1], 2, 2);
    }
    return cv;
  }

  /* ------------------------------------------------------ SOL EN RUINE ---
     Un petit pool de textures par palier d'usure (pas une par dalle : on
     réutilise le pool, seul le TIRAGE est par dalle).

     Ajoutée au 374 : la MOUSSE des joints, très présente sur l'illustration.
     Elle est semée le long des BORDS de la dalle et non au hasard, parce que
     c'est là qu'elle pousse — dans l'eau qui stagne entre deux pierres. C'est
     ce détail-là qui fait basculer le sol de « pierre grise » à « ruine ». */
  function paintStoneTile(tier) {
    const SIZE = 32;
    const cv = makeCanvas(SIZE, SIZE);
    const ctx = cv.getContext("2d");

    ctx.fillStyle = cssHex(CFG.COL_STONE);
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = cssHex(CFG.COL_STONE_DARK);
    const blotches = 4 + Math.floor(Math.random() * 4);
    for (let b = 0; b < blotches; b++) {
      ctx.beginPath();
      ctx.arc(Math.random() * SIZE, Math.random() * SIZE, 2 + Math.random() * 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mousse des joints : on longe les quatre bords, la taille et la quantité
    // montant avec l'usure.
    const mossAmount = [5, 11, 18][tier];
    for (let m = 0; m < mossAmount; m++) {
      const edge = Math.floor(Math.random() * 4);
      const along = Math.random() * SIZE;
      const depth = Math.random() * (2 + tier * 2.5);
      const x = (edge === 0 || edge === 1) ? along : (edge === 2 ? depth : SIZE - depth);
      const y = (edge === 0) ? depth : (edge === 1 ? SIZE - depth : along);
      ctx.fillStyle = Math.random() < 0.55 ? cssHex(CFG.COL_MOSS_DARK) : cssHex(CFG.COL_MOSS);
      ctx.globalAlpha = 0.55 + Math.random() * 0.35;
      ctx.beginPath(); ctx.arc(x, y, 1.5 + Math.random() * (1.5 + tier), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = cssHex(CFG.COL_STONE_EDGE);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0.5, 0.5, SIZE - 1, SIZE - 1);

    // Taches d'humidité : plus nombreuses et plus sombres à mesure que le
    // palier d'usure monte. 0 = quasi rien, 2 = franchement moisi.
    const stainCounts = [1, 3, 6];
    for (let s = 0; s < stainCounts[tier]; s++) {
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

    return new THREE.MeshLambertMaterial({ map: pixelTexture(cv) });
  }

  /* ------------------------------- PAVAGE DE LA CHAUSSÉE D'ENTRÉE (379) ---
     La dalle de la section de pierre. Ce n'est PAS la même matière que le sol
     de la plateforme AA, et c'est tout l'enjeu : sur les références de
     Guillaume, la chaussée d'entrée est un ouvrage TAILLÉ — de gros blocs
     rectangulaires, des joints de mortier nets, une pierre claire — là où AA
     est une surface usée, sombre, presque du bois délavé.

     Deux choses font basculer la lecture de « sol » à « ouvrage », et il faut
     les deux : un APPAREILLAGE visible (le quadrillage de blocs, décalé d'une
     assise à l'autre) et un MORTIER plus sombre que la pierre. Sans le
     décalage, on lit un carrelage ; sans le mortier, on lit une texture. */
  function paintPaveTile(tier) {
    const SIZE = 32;
    const cv = makeCanvas(SIZE, SIZE);
    const ctx = cv.getContext("2d");

    ctx.fillStyle = cssHex(CFG.COL_MORTAR);
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Deux assises de deux blocs, la seconde décalée d'un demi-bloc.
    const rows = 2, cols = 2, gap = 2;
    const bh = (SIZE - gap * (rows + 1)) / rows;
    for (let r = 0; r < rows; r++) {
      const off = (r & 1) ? SIZE * 0.25 : 0;
      for (let c = -1; c <= cols; c++) {
        const bw = (SIZE - gap * (cols + 1)) / cols;
        const bx = gap + c * (bw + gap) + off;
        const by = gap + r * (bh + gap);
        if (bx > SIZE || bx + bw < 0) continue;
        // Chaque bloc a sa propre valeur : une chaussée dont toutes les
        // pierres seraient identiques se lit comme un motif imprimé.
        const k = 0.86 + Math.random() * 0.28;
        const base = CFG.COL_PAVE;
        const r8 = Math.min(255, Math.round(((base >> 16) & 255) * k));
        const g8 = Math.min(255, Math.round(((base >> 8) & 255) * k));
        const b8 = Math.min(255, Math.round((base & 255) * k));
        ctx.fillStyle = `rgb(${r8},${g8},${b8})`;
        ctx.fillRect(bx, by, bw, bh);
        // Arête éclairée en haut, ombre en bas : le bloc a une épaisseur.
        ctx.fillStyle = `rgba(255,255,255,0.06)`;
        ctx.fillRect(bx, by, bw, 1);
        ctx.fillStyle = `rgba(0,0,0,0.18)`;
        ctx.fillRect(bx, by + bh - 1, bw, 1);
      }
    }

    // Mousse dans les joints, très peu au palier intact : cette chaussée-là
    // est encore entretenue, c'est plus loin qu'elle se délite.
    const mossAmount = [3, 8, 14][tier];
    for (let m = 0; m < mossAmount; m++) {
      const along = Math.random() * SIZE;
      const jy = Math.random() < 0.5 ? gap + bh + gap / 2 : (Math.random() < 0.5 ? 1 : SIZE - 2);
      ctx.fillStyle = Math.random() < 0.55 ? cssHex(CFG.COL_MOSS_DARK) : cssHex(CFG.COL_MOSS);
      ctx.globalAlpha = 0.45 + Math.random() * 0.35;
      ctx.beginPath(); ctx.arc(along, jy + (Math.random() - 0.5) * 3, 1 + Math.random() * (1 + tier), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Fêlures : uniquement sur les paliers abîmés, et fines.
    const crackCounts = [0, 1, 3];
    ctx.strokeStyle = cssHex(CFG.COL_CRACK);
    ctx.lineWidth = 1;
    for (let c = 0; c < crackCounts[tier]; c++) {
      let x = Math.random() * SIZE, y = Math.random() * SIZE;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let seg = 0; seg < 2 + Math.floor(Math.random() * 2); seg++) {
        x += (Math.random() - 0.5) * SIZE * 0.4;
        y += (Math.random() - 0.5) * SIZE * 0.4;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    return new THREE.MeshLambertMaterial({ map: pixelTexture(cv) });
  }

  function buildPaveVariants() {
    const VARIANTS_PER_TIER = [3, 3, 3];
    return VARIANTS_PER_TIER.map((n, tier) => {
      const list = [];
      for (let i = 0; i < n; i++) list.push(paintPaveTile(tier));
      return list;
    });
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

  /* Bloc de bordure : pierre appareillée coiffée de mousse. La mousse est
     peinte EN HAUT de la texture ; comme la face supérieure d'une BoxGeometry
     échantillonne cette même image, tous les blocs se retrouvent coiffés de
     vert sans qu'on ait à ajouter un second mesh par bloc. */
  function paintKerbMaterial() {
    const S = 32;
    const cv = makeCanvas(S, S);
    const ctx = cv.getContext("2d");
    ctx.fillStyle = cssHex(CFG.COL_STONE_DARK);
    ctx.fillRect(0, 0, S, S);

    // Appareillage : deux assises décalées.
    ctx.strokeStyle = cssHex(CFG.COL_STONE_EDGE);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2);
    ctx.moveTo(S / 2, S / 2); ctx.lineTo(S / 2, S);
    ctx.moveTo(S / 4, 0); ctx.lineTo(S / 4, S / 2);
    ctx.moveTo(3 * S / 4, 0); ctx.lineTo(3 * S / 4, S / 2);
    ctx.stroke();

    // Coiffe de mousse, dégressive vers le bas.
    const band = S * 0.30;
    for (let m = 0; m < 26; m++) {
      const x = Math.random() * S;
      const y = Math.random() * band;
      ctx.fillStyle = Math.random() < 0.5 ? cssHex(CFG.COL_MOSS) : cssHex(CFG.COL_MOSS_DARK);
      ctx.globalAlpha = 0.9 - (y / band) * 0.7;
      ctx.beginPath(); ctx.arc(x, y, 1.5 + Math.random() * 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    return new THREE.MeshLambertMaterial({ map: pixelTexture(cv) });
  }

  /* ================================================================ CIEL ===
     Un dôme peint une fois, recentré sur la caméra à chaque frame. Pas de
     shader, pas de cubemap : une seule image équirectangulaire de 1024×512
     dont on ne voit jamais que la moitié haute.

     PIÈGE À NE PAS REFAIRE : tout ce qui est peint près des bords gauche et
     droit du canvas doit être peint DEUX FOIS (à x et à x±W), sinon la couture
     se voit — et on la traverse à chaque virage. */
  function paintSky() {
    const W = 1024, H = 512;
    const cv = makeCanvas(W, H);
    const ctx = cv.getContext("2d");
    const HORIZON = H * 0.52;

    // Dégradé vertical : zénith presque noir -> corps violet -> rougeoiement.
    const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
    g.addColorStop(0, cssHex(CFG.SKY_TOP));
    g.addColorStop(0.45, cssHex(CFG.SKY_MID));
    g.addColorStop(1, cssHex(CFG.SKY_HORIZON));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, HORIZON);
    ctx.fillStyle = cssHex(CFG.SKY_TOP);
    ctx.fillRect(0, HORIZON, W, H - HORIZON);   // sous l'horizon : masqué par le lac

    // Halo puis croissant de lune. Le croissant s'obtient en recouvrant le
    // disque d'un second disque décalé, peint dans la couleur du ciel.
    const mx = W * 0.30, my = H * 0.19, mr = 30;
    const halo = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 5);
    halo.addColorStop(0, "rgba(196,178,224,0.36)");
    halo.addColorStop(1, "rgba(196,178,224,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
    ctx.fillStyle = cssHex(CFG.SKY_MOON);
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cssHex(CFG.SKY_MID);
    ctx.beginPath(); ctx.arc(mx + mr * 0.62, my - mr * 0.30, mr * 0.94, 0, Math.PI * 2); ctx.fill();

    // Nuages déchirés : des paquets d'ellipses, avec un liseré éclairé du côté
    // de la lune. Ils s'arrêtent avant l'horizon, que les crêtes occupent.
    const drawCloud = (cx, cy, scale, lit) => {
      const lobes = 5 + Math.floor(Math.random() * 5);
      for (let i = 0; i < lobes; i++) {
        const ox = (Math.random() - 0.5) * 130 * scale;
        const oy = (Math.random() - 0.5) * 26 * scale;
        const rx = (26 + Math.random() * 46) * scale;
        const ry = (8 + Math.random() * 13) * scale;
        if (lit) {
          ctx.fillStyle = cssHex(CFG.SKY_CLOUD_LIT);
          ctx.globalAlpha = 0.5;
          ctx.beginPath(); ctx.ellipse(cx + ox, cy + oy - ry * 0.35, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = cssHex(CFG.SKY_CLOUD);
        ctx.globalAlpha = 0.62;
        ctx.beginPath(); ctx.ellipse(cx + ox, cy + oy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    for (let c = 0; c < 26; c++) {
      const cx = Math.random() * W;
      const cy = H * 0.06 + Math.random() * (HORIZON - H * 0.14);
      const scale = 0.6 + Math.random() * 1.1;
      const lit = Math.abs(cx - mx) < W * 0.22;
      drawCloud(cx, cy, scale, lit);
      if (cx < 160) drawCloud(cx + W, cy, scale, lit);          // recouture
      if (cx > W - 160) drawCloud(cx - W, cy, scale, lit);
    }

    /* ================ MONTAGNES (refaites au zip 379) ==================
       Sur les trois références de Guillaume, l'horizon est occupé par de
       grandes PYRAMIDES nettes qui se chevauchent, et non par la crête
       dentelée que peignait le zip 374. La différence n'est pas décorative :
       une silhouette pyramidale donne une profondeur immédiate parce que
       l'œil lit sans effort quel sommet est devant quel autre, ce qu'une
       ligne brisée continue ne permet pas.

       DEUX PLANS, et c'est ce qui fait la distance : le lointain est plus
       haut, plus pâle et déjà mangé par la brume ; le proche est presque
       noir. Peints dans cet ordre, ils se recouvrent tout seuls.

       ENTRE LES DEUX, une bande rouge sombre. C'est elle qu'on voit briller
       entre les pyramides sur les captures, et c'est le seul rappel chaud de
       tout le ciel une fois les torches éteintes.

       Chaque plan PART et REVIENT à la même hauteur aux deux bords, sinon la
       ligne d'horizon a une marche visible à la couture — et on la traverse
       à chaque virage. */
    const EDGE_Y = HORIZON - 12;

    // Rougeoiement bas, derrière tout le relief.
    const glow = ctx.createLinearGradient(0, HORIZON - 74, 0, HORIZON);
    glow.addColorStop(0, "rgba(126,26,48,0)");
    glow.addColorStop(0.55, "rgba(146,30,52,0.55)");
    glow.addColorStop(1, "rgba(92,18,40,0.85)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, HORIZON - 74, W, 74);

    const range = (color, minH, maxH, minW, maxW, jitterY) => {
      ctx.fillStyle = color;
      let x = -60;
      while (x < W + 60) {
        const bw = minW + Math.random() * (maxW - minW);
        const h = minH + Math.random() * (maxH - minH);
        const baseY = HORIZON + jitterY;
        // Une pyramide : deux versants droits et un sommet légèrement
        // décentré. Le décentrage suffit à ce qu'aucune ne soit identique.
        const apex = x + bw * (0.38 + Math.random() * 0.24);
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.lineTo(apex, baseY - h);
        ctx.lineTo(x + bw, baseY);
        ctx.closePath();
        ctx.fill();
        x += bw * (0.52 + Math.random() * 0.3);   // elles se chevauchent
      }
    };

    // Plan LOINTAIN : plus haut, délavé par la brume.
    range("rgba(62,40,92,0.72)", 62, 132, 150, 300, -2);
    // Plan PROCHE : plus bas, presque noir.
    range(cssHex(CFG.SKY_PEAKS), 42, 96, 110, 240, 6);

    // Base commune : elle ferme le bas et garantit qu'aucun trou ne laisse
    // voir le dégradé du ciel sous les montagnes.
    ctx.fillStyle = cssHex(CFG.SKY_PEAKS);
    ctx.fillRect(0, EDGE_Y + 10, W, H - EDGE_Y - 10);

    return cv;
  }

  /* Un éclair DESSINÉ : une ligne brisée qui descend, doublée d'un halo, avec
     deux ramifications. Ça ne coûte qu'un plan, et ça ne se voit que pendant
     le flash — mais sans lui, un ciel qui s'éclaire est juste un bug d'expo. */
  function paintBolt() {
    const W = 128, H = 256;
    const cv = makeCanvas(W, H);
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";

    // Le tracé est calculé UNE fois, puis repassé deux fois (halo large, puis
    // cœur fin). Retirer un tracé au hasard à chaque passe donnerait deux
    // éclairs superposés et non un éclair avec son halo.
    const pts = [[W / 2, 6]];
    const segs = 11;
    for (let i = 1; i <= segs; i++) {
      pts.push([
        pts[i - 1][0] + (Math.random() - 0.5) * 34,
        6 + (i / segs) * (H - 30),
      ]);
    }
    const stroke = (style, width) => {
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts) ctx.lineTo(p[0], p[1]);
      ctx.stroke();
    };
    stroke("rgba(190,150,255,0.40)", 10);
    stroke("rgba(255,255,255,0.95)", 3);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(230,215,255,0.8)";
    for (let b = 0; b < 2; b++) {
      const from = pts[2 + Math.floor(Math.random() * (segs - 4))];
      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.lineTo(from[0] + (Math.random() - 0.5) * 70, from[1] + 30 + Math.random() * 50);
      ctx.stroke();
    }
    return cv;
  }

  function buildSky() {
    const geoSky = new THREE.SphereGeometry(CFG.DRAW_DISTANCE * 0.9, 24, 14);
    // La texture est retenue dans `mat` pour que tools/render-textures.js
    // puisse la regarder : c'est le seul dessin du jeu qu'on ne voit jamais
    // de près, et c'est aussi le plus grand.
    mat.skyTex = pixelTexture(paintSky());
    skyMat = new THREE.MeshBasicMaterial({
      map: mat.skyTex, side: THREE.BackSide, fog: false, depthWrite: false,
    });
    sky = new THREE.Mesh(geoSky, skyMat);
    sky.renderOrder = -10;   // toujours dessiné en premier, jamais devant le décor
    scene.add(sky);

    for (let i = 0; i < 3; i++) {
      boltMats.push(new THREE.MeshBasicMaterial({
        map: pixelTexture(paintBolt()), transparent: true, opacity: 0,
        depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      }));
    }
    boltMesh = new THREE.Mesh(geo.plane, boltMats[0]);
    boltMesh.scale.set(70, 150, 1);
    boltMesh.visible = false;
    boltMesh.renderOrder = -9;
    scene.add(boltMesh);
  }

  /* ================================================================= LAC ===
     Un grand plan sous la chaussée, plus un second légèrement au-dessus qui
     dérive à une autre vitesse. Le décalage entre les deux crée un
     miroitement qu'aucune des deux textures ne contient — même astuce que deux
     calques de nuages, et ça coûte deux meshes.

     Le lac est en MeshBasicMaterial : il ÉMET, il ne reçoit pas la lumière.
     Une eau maléfique qui s'assombrirait dans l'ombre n'aurait aucun sens. */
  function paintLakeWaves(seedPhase) {
    const S = 128;
    const cv = makeCanvas(S, S);
    const ctx = cv.getContext("2d");
    ctx.fillStyle = cssHex(CFG.COL_LAKE);
    ctx.fillRect(0, 0, S, S);
    const img = ctx.getImageData(0, 0, S, S);
    const d = img.data;
    const gr = (CFG.COL_LAKE_GLOW >> 16) & 255;
    const gg = (CFG.COL_LAKE_GLOW >> 8) & 255;
    const gb = CFG.COL_LAKE_GLOW & 255;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        // Somme de sinus dont les périodes DIVISENT S : la texture se répète
        // sans couture, ce qui est indispensable avec RepeatWrapping.
        const a = Math.sin((x / S) * Math.PI * 2 * 3 + seedPhase);
        const b = Math.sin((y / S) * Math.PI * 2 * 2 - seedPhase * 1.7);
        const c = Math.sin(((x + y) / S) * Math.PI * 2 * 5 + seedPhase * 0.5);
        let k = (a * 0.45 + b * 0.35 + c * 0.20 + 1) / 2;
        k = Math.pow(k, 3.2);                 // crêtes fines, creux larges
        const i = (y * S + x) * 4;
        d[i]     += (gr - d[i]) * k;
        d[i + 1] += (gg - d[i + 1]) * k;
        d[i + 2] += (gb - d[i + 2]) * k;
      }
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  function buildLake() {
    const size = CFG.LAKE_SIZE;
    lakeUnitsPerTile = 26;
    glowUnitsPerTile = 37;

    lakeMat = new THREE.MeshBasicMaterial({
      map: pixelTexture(paintLakeWaves(0), size / lakeUnitsPerTile, size / lakeUnitsPerTile), fog: true,
    });
    lake = new THREE.Mesh(geo.plane, lakeMat);
    lake.scale.set(size, size, 1);
    lake.rotation.x = -Math.PI / 2;
    lake.position.y = CFG.LAKE_Y;
    lake.renderOrder = -5;
    scene.add(lake);

    lakeGlowMat = new THREE.MeshBasicMaterial({
      map: pixelTexture(paintLakeWaves(2.1), size / glowUnitsPerTile, size / glowUnitsPerTile),
      transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    lakeGlow = new THREE.Mesh(geo.plane, lakeGlowMat);
    lakeGlow.scale.set(size, size, 1);
    lakeGlow.rotation.x = -Math.PI / 2;
    lakeGlow.position.y = CFG.LAKE_Y + 0.05;
    lakeGlow.renderOrder = -4;
    scene.add(lakeGlow);

    // Voiles de brume qui traînent à la surface. Ils ORBITENT autour de la
    // caméra : ils entourent donc toujours le joueur sans qu'on ait à en semer
    // sur toute la carte.
    for (let i = 0; i < CFG.LAKE_MIST_COUNT; i++) {
      const m = new THREE.Mesh(geo.plane, new THREE.MeshBasicMaterial({
        map: mat.glowTex, color: CFG.COL_PURPLE_DIM,
        transparent: true, opacity: 0.11 + Math.random() * 0.09,
        depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide,
      }));
      const s = 40 + Math.random() * 90;
      m.scale.set(s, s * 0.5, 1);
      m.rotation.x = -Math.PI / 2;
      m.userData.orbit = Math.random() * Math.PI * 2;
      m.userData.radius = 25 + Math.random() * 95;
      m.userData.speed = 0.04 + Math.random() * 0.09;
      m.renderOrder = -3;
      scene.add(m);
      mists.push(m);
    }
  }

  /* Bouffées de poussière de glissade. Pool FIXE, recyclé : allouer des meshes
     pendant une course finirait par se voir. */
  function buildDust() {
    for (let i = 0; i < CFG.SLIDE_DUST_COUNT; i++) {
      const m = new THREE.Mesh(geo.plane, mat.dust.clone());
      m.visible = false;
      m.userData.born = -1e9;
      m.userData.size = 1;
      scene.add(m);
      dust.push(m);
    }
  }

  /* ============================================================= HELPERS === */

  function box(w, h, d, material, x, y, z) {
    const m = new THREE.Mesh(geo.box, material);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    return m;
  }

  /* Membre à DEUX segments : un pivot à l'articulation haute (hanche/épaule),
     un segment supérieur suspendu dessous, et un second pivot à son extrémité
     (genou/coude) portant le segment inférieur.

     Ajouté au zip 374. Un membre d'un seul segment ne peut ni se replier sous
     le corps en glissade, ni ramener le talon sous la fesse à la course : la
     jambe balaie en bloc et le pied rase le sol au lieu de se lever. C'est ce
     qui restait de « patinage » une fois la cadence corrigée au 373. */
  function limb2(w, upperLen, lowerLen, d, material, x, jointY, z) {
    const hip = new THREE.Group();
    hip.position.set(x, jointY, z);
    const upper = box(w, upperLen, d, material, 0, -upperLen / 2, 0);
    hip.add(upper);

    const knee = new THREE.Group();
    knee.position.set(0, -upperLen, 0);
    hip.add(knee);
    const lower = box(w * 0.92, lowerLen, d * 0.92, material, 0, -lowerLen / 2, 0);
    knee.add(lower);

    return { hip, knee, upper, lower, upperLen, lowerLen };
  }

  /* ============================================================= FERMIER ===
     Silhouette bloc reprenant les proportions du sprite de Ferme Vallée
     (16 px de large pour 24 de haut, tête large, jambes courtes).

     ZIP 377 — CE N'EST PLUS UN PLACEHOLDER GÉNÉRIQUE : c'est LE fermier du
     joueur. La ferme envoie son genre et ses quatre couleurs dans
     "vf-run-init" (voir bridge.js) et applySkin() les pose ici.

     COMMENT LE GENRE EST RENDU, et pourquoi comme ça. Le sprite 2D de la ferme
     (drawCharFrame, fermeArt.js) distingue l'homme de la femme par trois
     choses et trois seulement : des cheveux longs qui descendent le long du
     visage et dans la nuque, un bas de tenue qui s'évase en jupe au lieu de
     deux jambes de pantalon, et une boucle d'oreille rose. On reprend les
     trois, à l'identique dans leur INTENTION — pas de nouvelle direction
     artistique inventée pour la 3D. C'est la règle « chercher le motif déjà
     présent dans le code avant d'en inventer un ».

     Les pièces féminines sont CONSTRUITES UNE FOIS et masquées, jamais
     reconstruites : applySkin peut être rappelée à tout moment (la ferme
     réémet vf-run-init si son premier message s'est perdu), et reconstruire le
     squelette invaliderait playerRig au milieu d'une frame.

     Hiérarchie : playerMesh (position + cap monde) > pelvis (pivot de toutes
     les poses) > chest (buste, qui doit pouvoir se pencher SANS entraîner les
     jambes) > tête et bras. Au repos, tout retombe sur les coordonnées monde
     d'avant. */
  function buildPlayer() {
    playerMesh = new THREE.Group();
    const g = playerMesh;
    // Réduction générale, purement visuelle : les collisions restent pilotées
    // par CFG.PLAYER_RADIUS/HEIGHT, inchangés.
    g.scale.setScalar(0.88);

    const pelvis = new THREE.Group();
    pelvis.position.set(0, CFG.SLIDE_PELVIS_Y, 0);
    g.add(pelvis);

    const rel = (y) => y - CFG.SLIDE_PELVIS_Y; // hauteur monde -> hauteur relative au bassin

    const chest = new THREE.Group();
    chest.position.set(0, rel(0.78), 0);
    pelvis.add(chest);

    chest.add(box(0.95, 0.75, 0.55, mat.shirt, 0, 0.34, 0));    // torse
    chest.add(box(0.34, 0.16, 0.34, mat.skin, 0, 0.78, 0));     // cou

    const head = new THREE.Group();
    head.position.set(0, 0.86, 0);
    head.add(box(0.78, 0.68, 0.62, mat.skin, 0, 0.34, 0));
    head.add(box(0.84, 0.24, 0.68, mat.hair, 0, 0.62, 0));
    /* Nuque courte : c'est ce qu'on voit de dos, et c'est LA seule chose qui
       distingue l'arrière du crâne de l'avant sur ce personnage sans visage.

       CORRIGÉE AU ZIP 377 : elle était posée à z = -0,26, c'est-à-dire du
       côté du VISAGE. Le fermier courait donc avec sa nuque sur le front, et
       l'arrière de son crâne — la seule face qu'on voie pendant toute la
       partie — était de la peau nue. Trouvée en rendant le squelette et en le
       regardant (tools/render-runner.js), pas en relisant : le code ne dit
       nulle part de quel côté regarde le personnage.

       La convention, revérifiée sur trois poses indépendantes plutôt que
       supposée : le fermier regarde vers son -Z local (inclinaison de course
       de -0,1 qui penche le buste EN AVANT, bascule de glissade de +0,95 qui
       le renverse EN ARRIÈRE, bras d'appui planté à -1,75 DERRIÈRE lui). Le
       dos est donc en +Z, et la caméra, posée à p - avant × CAM_BACK, s'y
       trouve bien.

       Masquée chez la femme, dont les cheveux longs la recouvrent entièrement
       — deux volumes de cheveux superposés se battraient en profondeur
       (z-fighting) sur toute la course. */
    // Descendue jusqu'à la naissance des cheveux (0,14 au lieu de 0,29) une
    // fois la face arrière enfin visible : sinon le crâne montrait une large
    // bande de peau nue entre les cheveux et le cou. Invisible tant que la
    // nuque était du mauvais côté.
    const napeM = box(0.86, 0.44, 0.16, mat.hair, 0, 0.36, 0.26);
    head.add(napeM);
    chest.add(head);

    /* --- Pièces féminines, masquées par défaut --------------------------- */
    /* Cheveux longs : deux mèches le long des tempes + une masse dans le dos,
       descendant jusqu'aux épaules — les colonnes de cheveux du sprite 2D
       (x+3 et x+11, de y3 à y13) et sa masse arrière.

       Les mèches sont DÉCALÉES VERS L'ARRIÈRE (z = +0,08) et peu profondes :
       la première version, centrée et profonde de 0,54, transformait la tête
       en bloc noir de profil, visage compris. Vue de côté, une chevelure
       longue doit encadrer le visage, pas le manger. Encore une chose que
       seul le rendu dit. */
    const hairL = box(0.20, 0.72, 0.40, mat.hair, -0.40, 0.24, 0.08);
    const hairR = box(0.20, 0.72, 0.40, mat.hair, 0.40, 0.24, 0.08);
    const hairB = box(0.88, 0.76, 0.18, mat.hair, 0, 0.26, 0.30);
    // Boucle d'oreille : un pixel rose dans le sprite, un cube d'un dixième
    // d'unité ici. Invisible neuf fois sur dix, et c'est très bien : c'est le
    // genre de détail qui ne se remarque que quand il manque.
    const earring = box(0.10, 0.12, 0.10, mat.earring, 0.42, 0.30, -0.14);
    const femHead = [hairL, hairR, hairB, earring];
    for (const m of femHead) { m.visible = false; head.add(m); }

    // Jupe évasée : deux étages plutôt qu'un tronc de cône, pour rester dans
    // la grammaire « que des boîtes » du fichier. Portée par le BASSIN, donc
    // elle suit la bascule de la glissade sans un mot de plus.
    const skirtA = box(1.00, 0.26, 0.66, mat.shirt, 0, rel(0.86), 0);
    const skirtB = box(1.18, 0.22, 0.78, mat.shirtDark, 0, rel(0.70), 0);
    const femBody = [skirtA, skirtB];
    for (const m of femBody) { m.visible = false; pelvis.add(m); }

    // Bras : épaule à hauteur de poitrine, coude à mi-longueur.
    const armL = limb2(0.26, 0.34, 0.32, 0.28, mat.skin, -0.60, 0.60, 0);
    const armR = limb2(0.26, 0.34, 0.32, 0.28, mat.skin, 0.60, 0.60, 0);
    chest.add(armL.hip); chest.add(armR.hip);

    // Jambes : hanche au bassin, genou à mi-longueur, chaussure au bout.
    const legL = limb2(0.32, 0.40, 0.36, 0.32, mat.pants, -0.24, rel(0.76), 0);
    const legR = limb2(0.32, 0.40, 0.36, 0.32, mat.pants, 0.24, rel(0.76), 0);
    for (const leg of [legL, legR]) {
      leg.knee.add(box(0.34, 0.16, 0.46, mat.barkDark, 0, -leg.lowerLen - 0.06, -0.06));
      pelvis.add(leg.hip);
    }

    scene.add(g);
    playerRig = { pelvis, chest, head, armL, armR, legL, legR, napeM, femHead, femBody };
    if (pendingSkin) applySkin(pendingSkin);   // message arrivé avant la scène
  }

  /* Applique la tenue reçue de la ferme. Idempotente et sans allocation : on
     ne fait que reteinter des matériaux existants et basculer des visibilités.

     Les matériaux sont PARTAGÉS avec le décor pour deux d'entre eux — mat.skin
     ne sert qu'au fermier, mais on prend soin de ne jamais toucher mat.kerb ou
     mat.stone ici. Reteinter un matériau partagé repeindrait la moitié du
     temple en bleu chemise, et l'erreur ne se verrait qu'en jeu. */
  let pendingSkin = null;
  function applySkin(s) {
    pendingSkin = s;
    if (!s || !playerRig) return;
    mat.shirt.color.setHex(s.shirt);
    mat.shirtDark.color.setHex(shadeHex(s.shirt));
    mat.pants.color.setHex(s.pants);
    mat.hair.color.setHex(s.hair);
    mat.skin.color.setHex(s.skin);

    const fem = s.gender === "f";
    for (const m of playerRig.femHead) m.visible = fem;
    for (const m of playerRig.femBody) m.visible = fem;
    playerRig.napeM.visible = !fem;
    // Sous la jupe, les jambes sont nues : le sprite 2D ne pose pas de
    // pantalon chez la femme, il descend la chemise et laisse la peau
    // jusqu'aux bottines. On suit, sinon la jupe aurait l'air enfilée
    // par-dessus un pantalon.
    const legMat = fem ? mat.skin : mat.pants;
    for (const leg of [playerRig.legL, playerRig.legR]) {
      leg.upper.material = legMat;
      leg.lower.material = legMat;
    }
  }

  function buildWolves() {
    for (let i = 0; i < CFG.WOLF_COUNT; i++) {
      const g = new THREE.Group();
      g.add(box(0.8, 0.7, 1.7, mat.wolf, 0, 0, 0));        // corps
      g.add(box(0.6, 0.55, 0.6, mat.wolf, 0, 0.18, -1.0)); // tête
      g.add(box(0.14, 0.14, 0.05, mat.eye, -0.17, 0.26, -1.31));
      g.add(box(0.14, 0.14, 0.05, mat.eye, 0.17, 0.26, -1.31));
      g.add(box(0.18, 0.5, 0.18, mat.wolf, 0, 0.35, 0.95)); // queue
      scene.add(g);
      wolfMeshes.push(g);
    }
  }

  /* ================================================= UNE TORCHE (zip 377) ===
     Quatre meshes : le fût, sa tête carbonisée, le corps de flamme et son
     cœur. Deux de plus qu'au 372, et c'est assumé — le budget est mesuré par
     smoke-render.js, et le poste a été financé en retirant un objet de décor
     de fond par tronçon (DECOR_PROPS). Les torches sont les seuls points
     chauds du cadre et le seul repère qui rende la ligne de la piste lisible
     de loin : c'est le bon endroit où dépenser.

     La TÊTE n'est pas la coupelle écartée au 374 (qui n'épaississait la torche
     que d'un pixel). C'est l'extrémité brûlée du bâton, plus large et presque
     noire : elle donne un point d'accroche à la flamme, qui flottait jusqu'ici
     au-dessus d'un manche net.

     DÉSYNCHRONISATION, exigée explicitement. Elle est obtenue à trois niveaux
     indépendants, parce qu'un seul ne suffit jamais à tromper l'œil :
       - la DÉCOUPE (4 textures tirées séparément) ;
       - le MOUVEMENT (quatre oscillateurs par flamme, fréquences et phases
         tirées de la graine du tronçon — donc stables d'une reconstruction à
         l'autre, mais différentes d'une torche à l'autre) ;
       - la LUMIÈRE (4 cadences de respiration sur les matériaux).
     Corps et cœur d'une MÊME torche ont eux aussi leurs propres oscillateurs :
     c'est ce décalage-là qui fait qu'une flamme paraît vivante plutôt que
     simplement animée. */
  function addTorch(place, t, off, seed, stage, side, forceLit) {
    const rng = Track.makeRng(seed >>> 0);
    const s = Math.max(0, Math.min(1, stage === undefined ? 0 : stage));
    /* `forceLit` : les deux torches rapprochées d'un embranchement offroad
       brûlent TOUJOURS, même en plein AA où tout le reste est éteint.

       Ce n'est pas une entorse à « on perdra les flammes », c'est ce qui rend
       la règle utile : puisqu'il n'y a plus un seul feu sur la chaussée, deux
       flammes côte à côte deviennent le repère le plus fort du jeu. Le zip 377
       comptait dessus pour signaler la sortie ; les éteindre aurait effacé un
       repère de GAMEPLAY au nom d'un choix d'ambiance. */
    const fs = forceLit ? Math.min(s, 0.30) : s;

    /* ZIP 379 — LA TORCHE EST FIXÉE, PLUS POSÉE.
       Retour de Guillaume : « les torches ne devront plus flotter à côté de
       la plateforme AA mais être fixées de manière cohérente et réaliste sur
       les côtés ». Elles étaient un mât planté dans le vide, à 45 cm en
       dehors de la chaussée : rien ne les tenait, et ça se voyait dès qu'on
       passait à côté.

       Elles reposent désormais sur un SOCLE posé sur la rambarde, et leur mât
       est INCLINÉ VERS L'EXTÉRIEUR — comme une torche scellée dans un mur
       l'est toujours, pour que la flamme ne lèche pas la pierre. C'est cette
       inclinaison, plus que le socle, qui fait qu'on la lit comme fixée : un
       mât parfaitement vertical à côté d'un muret reste un mât posé là.

       La hauteur du socle suit celle de la rambarde, qui s'affaisse avec le
       fondu : la torche descend donc avec elle, au lieu de rester en l'air
       quand la pierre a fondu sous elle. */
    const railH = CFG.RAIL_H_STONE + (CFG.RAIL_H_AA - CFG.RAIL_H_STONE) * s;

    /* PILIER, et non pas socle posé sur la rambarde. La première version
       coiffait le muret d'un petit bloc — ce qui marchait tant que la
       rambarde était CONTINUE, c'est-à-dire uniquement sur la section de
       pierre. Sur AA, où il ne reste que des blocs isolés séparés de vide,
       une torche sur deux se retrouvait au-dessus d'un trou : exactement le
       défaut que Guillaume demandait de corriger, simplement déplacé.

       Le pilier, lui, DESCEND JUSQU'À LA CHAUSSÉE. Il ne peut donc rien y
       avoir sous lui, quelle que soit la rambarde — la garantie est
       géométrique, elle ne dépend d'aucun tirage. Il déborde volontairement de
       la rambarde en largeur, pour se lire comme un ouvrage distinct plutôt
       que comme un renflement du muret. */
    const plinthH = railH + 0.10;
    place(box(0.85, plinthH, 0.85, mat.railCap, 0, 0, 0), t, off, plinthH / 2 - 0.25);
    const baseY = plinthH - 0.25;

    const lean = (side === undefined ? 0 : side) * (0.20 + 0.10 * (1 - s));
    const shaft = box(0.19, 1.55, 0.19, mat.torchWood, 0, 0, 0);
    shaft.rotation.x = 0;
    shaft.rotation.z = lean;
    /* `baseY` est le SOMMET du pilier : le pied du mât s'y pose, et son centre
       se trouve donc une demi-longueur plus haut — décalée par l'inclinaison.

       Ce calcul portait encore, un temps, l'épaisseur de l'ancien socle
       (+0,34) : le mât flottait de trente-quatre centimètres au-dessus de son
       propre pilier. Invisible sur les captures, et attrapé par le contrôle
       géométrique de smoke-render.js — qui exige, pour CHAQUE torche, une
       continuité de pierre du sol jusqu'au pied du mât. */
    const shaftMid = baseY + Math.cos(lean) * 0.775;
    place(shaft, t, off + Math.sin(lean) * 0.775, shaftMid);

    const headY = baseY + Math.cos(lean) * 1.55;
    const headOff = off + Math.sin(lean) * 1.55;
    const head = box(0.28, 0.30, 0.28, mat.torchHead, 0, 0, 0);
    head.rotation.y = rng() * 0.9;
    head.rotation.z = lean;
    place(head, t, headOff, headY);

    /* Flamme ÉTEINTE sur AA (décision Guillaume). On ne la met pas à opacité
       nulle : on ne la construit pas du tout. Deux objets de moins par torche
       sur toute la piste AA, c'est-à-dire sur l'écrasante majorité de la
       course — c'est ce qui paie la rambarde de pierre du début. */
    if (fs > 0.92) return;

    const pick = Math.floor(rng() * mat.flameBody.length);
    const fade = 1 - fs;                      // la flamme meurt en avançant
    const h = (1.00 + rng() * 0.28) * (0.45 + 0.55 * fade);
    const w = (0.60 + rng() * 0.18) * (0.55 + 0.45 * fade);

    /* Quatre échelles de temps, du lent au vif : le balancement d'ensemble
       (~1,3 Hz), le battement (~2,8 Hz), le grésillement (~7 Hz) et la bouffée
       (~0,15 Hz, brève et rare). Les quatre sont incommensurables entre elles,
       donc le motif ne se répète jamais à l'œil. */
    const osc = () => ({
      f1: 0.0069 + rng() * 0.0044, p1: rng() * 6.283,
      f2: 0.0138 + rng() * 0.0076, p2: rng() * 6.283,
      f3: 0.0314 + rng() * 0.0189, p3: rng() * 6.283,
      f4: 0.00075 + rng() * 0.00065, p4: rng() * 6.283,
    });

    // La flamme sort de la TÊTE, qui a bougé avec le mât : elle la suit, sinon
    // elle brûlerait à côté de sa propre torche dès que celle-ci penche.
    const yBody = headY + 0.10 + h * 0.5;
    const body = new THREE.Mesh(geo.plane, mat.flameBody[pick]);
    body.userData = Object.assign({ w, h, y0: yBody }, osc());
    place(body, t, headOff, yBody);
    flames.push(body);

    const hc = h * 0.60, yCore = yBody - h * 0.17;
    const core = new THREE.Mesh(geo.plane, mat.flameCore[(pick + 2) % mat.flameCore.length]);
    core.userData = Object.assign({ w: w * 0.50, h: hc, y0: yCore }, osc());
    core.renderOrder = 1;   // toujours par-dessus le corps, jamais l'inverse
    place(core, t, headOff, yCore);
    flames.push(core);
  }

  /* ===================================================== TRONÇON -> MESHES ===
     Découpage du sol. Deux causes de trou, traitées séparément :

       - le GAP pleine largeur découpe le sol LE LONG de la piste ;
       - la CREVASSE découpe EN TRAVERS, sur une ou deux voies seulement.

     On calcule donc d'abord les intervalles pleins (complémentaire des gaps),
     puis on les recoupe aux bords des crevasses, et seulement alors on pave.
     Découper naïvement en dalles fixes et retirer celles qui touchent un trou
     agrandirait le vide visible jusqu'à 4 unités de chaque côté : le joueur
     verrait un trou plus large que celui qui le tue, ou l'inverse. */

  // Retire l'intervalle [a,b] d'une liste de segments 1D.
  function subtractSpan(spans, a, b) {
    const out = [];
    for (const [s0, s1] of spans) {
      if (b <= s0 || a >= s1) { out.push([s0, s1]); continue; }
      if (a > s0) out.push([s0, a]);
      if (b < s1) out.push([b, s1]);
    }
    return out;
  }

  // Bandes de sol restantes EN TRAVERS de la piste, une fois les voies
  // effondrées retirées.
  function freeXSpans(lanes) {
    const W = CFG.TRACK_WIDTH / 2;
    let spans = [[-W, W]];
    if (!lanes) return spans;
    for (let i = 0; i < CFG.LANE_COUNT; i++) {
      if (!lanes[i]) continue;
      spans = subtractSpan(spans, CFG.LANE_X[i] - CFG.LANE_WIDTH / 2, CFG.LANE_X[i] + CFG.LANE_WIDTH / 2);
    }
    return spans;
  }

  /* ÉTAT DU DÉCOR à une position donnée : 0 = chaussée de pierre pleine,
     1 = plateforme AA. Continu, donc l'« hybride » n'est pas un cas à part.

     Il se calcule depuis `node.stoneEnd`, GELÉ à la génération du tronçon
     (voir track.js) : un tronçon déjà construit ne se repeint pas, son décor
     ne doit donc dépendre d'aucune valeur susceptible de bouger ensuite. */
  function stageAt(node, t) {
    const d = node.startDist + t;
    return Math.max(0, Math.min(1, (d - node.stoneEnd) / CFG.DECOR_BLEND_LEN));
  }

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
      return mesh;
    };

    const rng = Track.makeRng(node.index * 9176 + 13);
    const rngFloor = Track.makeRng(node.index * 5231 + 7);

    /* --- 1. Intervalles pleins, hors trous pleine largeur --- */
    const gaps = node.obstacles.filter(o => o.type === OBST.GAP)
      .map(o => [o.t - CFG.GAP_LENGTH / 2, o.t + CFG.GAP_LENGTH / 2])
      .sort((a, b) => a[0] - b[0]);
    const solids = [];
    let cursor = 0;
    for (const [a, b] of gaps) { if (a > cursor) solids.push([cursor, a]); cursor = Math.max(cursor, b); }
    if (cursor < node.length) solids.push([cursor, node.length]);

    /* --- 2. Recoupe aux bords des crevasses, en notant les voies effondrées --- */
    const crevs = node.obstacles.filter(o => o.type === OBST.CREVASSE)
      .map(o => ({ a: o.t - CFG.CREVASSE_LENGTH / 2, b: o.t + CFG.CREVASSE_LENGTH / 2, lanes: o.lanes }))
      .sort((x, y) => x.a - y.a);
    let pieces = solids.map(([a, b]) => ({ a, b, lanes: null }));
    for (const c of crevs) {
      const next = [];
      for (const p of pieces) {
        if (c.b <= p.a || c.a >= p.b) { next.push(p); continue; }
        if (c.a > p.a) next.push({ a: p.a, b: c.a, lanes: p.lanes });
        next.push({ a: Math.max(p.a, c.a), b: Math.min(p.b, c.b), lanes: c.lanes });
        if (c.b < p.b) next.push({ a: c.b, b: p.b, lanes: p.lanes });
      }
      pieces = next;
    }

    /* --- 3. Pavage. Chaque dalle tire son palier d'usure puis une texture au
       sein de ce palier ; les dalles abîmées basculent, s'affaissent et perdent
       des éclats. Purement visuel : la collision reste celle du plateau plat
       calculée dans player.js. --- */
    const tile = CFG.FLOOR_TILE;
    for (const piece of pieces) {
      const xs = freeXSpans(piece.lanes);
      if (!xs.length) continue;
      for (let t = piece.a; t < piece.b - 0.01; t += tile) {
        const len = Math.min(tile, piece.b - t);
        /* ZIP 379 — FONDU DU PAVAGE, dalle par dalle.
           La bascule pierre -> AA se fait par TIRAGE et non par un seuil : à
           mi-fondu, une dalle sur deux est encore de la chaussée taillée, et
           les deux matières s'entremêlent sur une trentaine de mètres. C'est
           ce qui donne l'hybride demandé — et c'est aussi ce qui rend la
           transition invisible, puisqu'il n'existe nulle part de ligne où le
           décor change.

           Le tirage sort de rngFloor, donc du tronçon : le même tronçon
           reconstruit donne le même damier, sans quoi la chaussée
           scintillerait à chaque passage de streaming. */
        const s = stageAt(node, t);
        const stony = rngFloor() > s;
        const tier = pickWearTier(rngFloor());
        const variants = (stony ? mat.paveVariants : mat.stoneVariants)[tier];
        const material = variants[Math.floor(rngFloor() * variants.length)];
        // La chaussée taillée est encore d'aplomb ; c'est en se délitant
        // qu'elle bascule et s'affaisse. On interpole donc le désordre.
        const tiltMax = (tier === 2 ? CFG.FLOOR_TILT_RUINED : tier === 1 ? CFG.FLOOR_TILT_CRACKED : 0)
                        * (stony ? 0.25 : 1);
        const sink = tier === 2 ? rngFloor() * CFG.FLOOR_SINK_RUINED * (stony ? 0.2 : 1) : 0;
        const tx = (rngFloor() - 0.5) * tiltMax, tz = (rngFloor() - 0.5) * tiltMax;

        for (const [x0, x1] of xs) {
          const w = x1 - x0;
          if (w < 0.05) continue;
          const slab = box(w, CFG.FLOOR_THICKNESS, Math.max(0.2, len - 0.12), material, 0, 0, 0);
          slab.rotation.x = tx; slab.rotation.z = tz;
          place(slab, t + len / 2, (x0 + x1) / 2, -CFG.FLOOR_THICKNESS / 2 - sink);
        }

        if (tier === 2) {
          const side = rngFloor() < 0.5 ? -1 : 1;
          const cw = 0.3 + rngFloor() * 0.5;
          const chip = box(cw, CFG.FLOOR_THICKNESS * 0.4, cw, mat.stoneDark, 0, 0, 0);
          chip.rotation.y = rngFloor() * 6.28;
          place(chip, t + rngFloor() * len, side * (CFG.TRACK_WIDTH / 2 - cw / 2), -CFG.FLOOR_THICKNESS - sink - 0.05);
        }
      }
    }

    /* --- 4. Parois et lueur des crevasses. Le lac est juste dessous : une
       crevasse laisse donc filtrer du violet, ce qui la signale de loin sans le
       moindre balisage artificiel. Même idée que la chaussée sombre au milieu
       du lac côté ferme (carveRunCorridor). --- */
    for (const c of crevs) {
      const len = c.b - c.a, mid = (c.a + c.b) / 2;
      for (let i = 0; i < CFG.LANE_COUNT; i++) {
        if (!c.lanes[i]) continue;
        const x = CFG.LANE_X[i], w = CFG.LANE_WIDTH;
        /* Parois : quatre bandes noires qui donnent de la PROFONDEUR au trou.
           Sans elles on voit le lac à travers une découpe plate, et le trou
           ressemble à une flaque — donc à quelque chose qu'on peut traverser. */
        place(box(w, 1.6, 0.14, mat.pit, 0, 0, 0), c.a, x, -0.8);
        place(box(w, 1.6, 0.14, mat.pit, 0, 0, 0), c.b, x, -0.8);
        place(box(0.14, 1.6, len, mat.pit, 0, 0, 0), mid, x - w / 2, -0.8);
        place(box(0.14, 1.6, len, mat.pit, 0, 0, 0), mid, x + w / 2, -0.8);
        const lit = new THREE.Mesh(geo.plane, mat.glow);
        lit.scale.set(w * 1.1, len * 1.1, 1);
        lit.rotation.x = -Math.PI / 2;
        place(lit, mid, x, -1.5);
      }
    }

    /* --- 5. Fissures DÉCORATIVES : une entaille à plat, quelques éclats.
       Aucune collision — voir Track.decorate(). --- */
    for (const k of node.cracks) {
      const c = new THREE.Mesh(geo.plane, mat.crack);
      c.scale.set(k.wide, k.len, 1);
      c.rotation.x = -Math.PI / 2;
      c.rotation.z = k.rot;
      place(c, k.t, k.off, 0.035);
      for (let i = 0; i < 2; i++) {
        const cw = 0.22 + rng() * 0.3;
        const chip = box(cw, 0.14, cw, mat.stoneDark, 0, 0, 0);
        chip.rotation.y = rng() * 6.28;
        place(chip, k.t + (rng() - 0.5) * k.len, k.off + (rng() - 0.5) * 1.6, 0.06);
      }
    }

    /* --- 6. Bordures : blocs bas façon sarcophage, coiffés de mousse, avec
       stèles gravées et lierre retombant. C'est LE motif retenu de
       l'illustration ; il borde la piste sans jamais dépasser la hauteur du
       joueur, donc sans masquer le ciel ni le lac. --- */
    for (const side of [-1, 1]) {
      const off = side * (CFG.TRACK_WIDTH / 2 + 0.75);
      for (let t = 3; t < node.length - 3; t += CFG.KERB_SPACING) {
        // Zip 377 : on N'OUVRE PAS la bordure au ciseau, on l'interrompt. Une
        // trouée franche dans une haie de blocs est le signal le plus lisible
        // qu'il existe un passage — et c'est le seul endroit du jeu où la
        // bordure s'interrompt, donc il ne peut pas être confondu.
        if (node.exit === side && t > node.length - CFG.OFFROAD_MOUTH) continue;

        /* ZIP 379 — LA RAMBARDE S'AFFAISSE.
           Un seul et même élément du début à la fin, qui interpole quatre
           choses à la fois : sa HAUTEUR (1,55 -> 0,80), sa CONTINUITÉ (aucun
           manque au début, KERB_SKIP_CHANCE une fois sur AA), sa LONGUEUR
           (un bloc couvrait tout l'intervalle, il n'en reste que des morceaux
           isolés) et sa PIERRE DE COURONNEMENT, qui tombe en chemin.

           Écrire deux décors séparés et basculer de l'un à l'autre aurait été
           bien plus simple à lire, et c'est exactement ce qu'il ne fallait pas
           faire : la couture se serait vue, et l'hybride demandé n'aurait
           jamais existé — il n'est rien d'autre que le milieu de ce fondu. */
        const s = stageAt(node, t);
        if (rng() < CFG.KERB_SKIP_CHANCE * s * s) continue;
        const jitter = (rng() - 0.5) * (0.3 + 1.1 * s);

        if (rng() < CFG.STELE_CHANCE) {
          const h = 1.9 + rng() * 0.8;
          place(box(0.34, h, 1.5, mat.kerb, 0, 0, 0), t + jitter, off + side * 0.2, h / 2 - 0.2);
          // Gravure sur la face INTÉRIEURE : elle n'est pas billboardée, elle
          // appartient à la pierre. C'est ce qui la distingue des halos.
          const gl = new THREE.Mesh(geo.plane, mat.rune);
          gl.scale.set(1.2, h * 0.62, 1);
          gl.rotation.y = -side * Math.PI / 2;
          place(gl, t + jitter, off + side * 0.02, h * 0.55);
          continue;
        }

        const h = (CFG.RAIL_H_STONE + (CFG.RAIL_H_AA - CFG.RAIL_H_STONE) * s) * (0.9 + rng() * 0.2);
        /* La LONGUEUR est ce qui distingue le plus une rambarde d'une bordure :
           au début un bloc couvre tout l'intervalle, la pierre est continue ;
           en fin de fondu il ne reste que des blocs isolés séparés de vide.
           Deux fois le même mesh, deux lectures opposées. */
        const len = (CFG.KERB_SPACING + 0.6) * (1 - s) + (2.0 + rng() * 1.4) * s;
        const b = box(1.5 - 0.2 * s, h, len, s > 0.5 ? mat.kerb : mat.rail, 0, 0, 0);
        b.rotation.y = (rng() - 0.5) * 0.12 * s;   // l'ouvrage se désaligne en se ruinant
        place(b, t + jitter, off, h / 2 - 0.25);

        /* Pierre de COURONNEMENT : la tablette posée sur le muret, c'est elle
           qui fait « ouvrage taillé » plutôt que « tas de blocs ». Elle
           s'ébrèche d'abord (elle raccourcit et se décale), puis disparaît. */
        if (s < 0.72 && rng() < 0.8) {
          const cap = box(1.9 - 0.3 * s, 0.22, len * (1 - s * 0.5), mat.railCap, 0, 0, 0);
          cap.rotation.y = b.rotation.y;
          place(cap, t + jitter + (rng() - 0.5) * s * 1.6, off, h - 0.25 + 0.11);
        }

        if (rng() < CFG.VINE_CHANCE) {
          const vl = 0.5 + rng() * 1.1;
          const v = box(0.1, vl, 0.1, mat.vine, 0, 0, 0);
          v.rotation.z = (rng() - 0.5) * 0.35;
          place(v, t + jitter + (rng() - 0.5) * len * 0.6, off + side * 0.7, h - 0.25 - vl / 2);
        }
      }
    }

    /* --- 7. Torches. Nettement plus rares qu'au 372 : dans l'illustration
       l'éclairage vient du ciel et de la lueur violette, pas d'une haie de
       flammes. Elles restent le seul point CHAUD du cadre, et c'est aussi ce
       qui rend la ligne de la piste lisible de loin. --- */
    for (const side of [-1, 1]) {
      /* L'ESPACEMENT NE CHANGE PAS avec le décor, et c'est un arbitrage de
         budget assumé. Le rapprocher sur la section de pierre était tentant
         (les références en montrent davantage) et coûtait 96 objets par
         tronçon : la chaussée d'entrée passait à 261 objets pour 100 unités,
         soit 30 % au-dessus du plafond que smoke-render.js fait respecter.

         Ce qui distingue la section de pierre n'est donc pas le NOMBRE de
         torches mais le fait qu'elles brûlent — et une flamme se voit de bien
         plus loin qu'un mât de plus. La monture, elle, reste sur toute la
         piste : un pilier de torche éteint tous les vingt mètres raconte mieux
         l'abandon qu'une absence de torche. */
      for (let t = 8; t < node.length - 4; t += CFG.TORCH_SPACING) {
        addTorch(place, t, side * (CFG.TRACK_WIDTH / 2 + 0.75),
                 node.index * 9631 + Math.round(t) * 137 + (side > 0 ? 61 : 0),
                 stageAt(node, t), side);
      }
    }

    /* --- 8. Champignons luminescents, le motif le plus reconnaissable de
       l'illustration. Un bouquet = quelques chapeaux + UN seul halo pour tout
       le bouquet (un halo par chapeau tripleraient le coût pour un gain nul à
       cette résolution). --- */
    /* Zip 379 : les champignons luminescents SE MULTIPLIENT à mesure qu'on
       s'enfonce. Sur la chaussée d'entrée, encore entretenue et éclairée aux
       torches, ils n'ont pas leur place ; ils prennent le relais quand le feu
       s'éteint. C'est le même échange que partout ailleurs dans ce fondu —
       ce qui part est remplacé, jamais simplement retiré — et c'est aussi ce
       qui paie la pierre de couronnement de la rambarde. */
    const nMush = Math.round(CFG.MUSHROOM_CLUSTERS * (0.4 + 0.6 * stageAt(node, node.length / 2)));
    for (let i = 0; i < nMush; i++) {
      const t = rng() * node.length;
      const side = rng() < 0.5 ? -1 : 1;
      const off = side * (CFG.TRACK_WIDTH / 2 + 0.9 + rng() * 3.5);
      const n = 2 + Math.floor(rng() * 3);
      for (let m = 0; m < n; m++) {
        const dt = (rng() - 0.5) * 1.5, dz = (rng() - 0.5) * 1.2;
        const hh = 0.16 + rng() * 0.26;
        const capSize = 0.3 + rng() * 0.28;
        // Le pied n'est modélisé que pour les grands chapeaux : sur un petit,
        // il fait moins d'un pixel à l'écran et ne coûte qu'un mesh.
        if (capSize > 0.42) place(box(0.09, hh, 0.09, mat.mushStem, 0, 0, 0), t + dt, off + dz, hh / 2);
        const cap = new THREE.Mesh(geo.cap, mat.mushroom);
        cap.scale.set(capSize, capSize * 0.62, capSize);
        place(cap, t + dt, off + dz, hh);
      }
      const halo = new THREE.Mesh(geo.plane, mat.glow);
      const hs = 2.6 + rng() * 1.6;
      halo.scale.set(hs, hs, 1);
      place(halo, t, off, 0.5);
      glows.push(halo);
    }

    /* --- 9. Décor de fond : arbres morts ramifiés, colonnes brisées, rochers
       moussus, pierres levées. Leur pied descend SOUS le niveau de la
       chaussée — c'est ce qui donne l'impression que la piste est une digue
       posée sur le lac, et non une route flottant sur un sol invisible. --- */
    /* Zip 379 : moins de décor de fond sur la section de pierre — les blocs
       tombés à l'eau y tiennent déjà le premier plan, et sur les références
       de Guillaume la chaussée d'entrée est bien plus dégagée que la suite.
       Le lac s'encombre à mesure qu'on s'éloigne de l'ouvrage. */
    const nProps = Math.round(CFG.DECOR_PROPS * (0.55 + 0.45 * stageAt(node, node.length / 2)));
    for (let i = 0; i < nProps; i++) {
      const t = rng() * node.length;
      const side = rng() < 0.5 ? -1 : 1;
      const off = side * (CFG.TRACK_WIDTH / 2 + 3.5 + rng() * 22);
      const kind = rng();

      if (kind < 0.5) {
        /* ZIP 379 — ARBRES MORTS SUBMERGÉS, deux rendus pour un seul motif.
           Décision Guillaume : PANNEAUX au loin, BOÎTES tout près.

           Le partage se fait sur `off`, le décalage latéral, qui est fixé une
           fois pour toutes à la génération. Jamais sur la distance au joueur :
           un arbre changerait alors de nature sous ses yeux en s'approchant,
           et c'est précisément le défaut que « les deux » risquait
           d'introduire. Ici, un arbre naît panneau ou boîte et le reste. */
        if (Math.abs(off) > CFG.TREE_BILLBOARD_OFF) {
          // Panneau peint : la silhouette noueuse du pixel-art de référence,
          // impossible à approcher en boîtes, pour UN objet au lieu de cinq.
          const h = 7 + rng() * 7;
          const m = new THREE.Mesh(geo.plane, mat.trees[Math.floor(rng() * mat.trees.length)]);
          m.scale.set(h * (TREE_TEX_W / TREE_TEX_H) * (0.85 + rng() * 0.3), h, 1);
          place(m, t, off, h / 2 - 1.6);
          m.userData.upright = true;   // pivote autour de Y seulement (updateAmbient)
          trees.push(m);
        } else {
          // Arbre mort : tronc légèrement incliné + branches en éventail, plus
          // fines et plus nombreuses qu'au 372 pour lire comme une ramure.
          // Réservé aux arbres PROCHES, où la parallaxe d'un vrai volume se
          // voit et où un panneau se trahirait en pivotant.
          const h = 4.5 + rng() * 5.5;
          const trunk = box(0.42, h, 0.42, mat.bark, 0, 0, 0);
          trunk.rotation.z = (rng() - 0.5) * 0.18;
          place(trunk, t, off, h / 2 - 1.4);
          const nb = CFG.TREE_BRANCHES + Math.floor(rng() * 2);
          for (let b = 0; b < nb; b++) {
            const bl = 1.4 + rng() * 2.2;
            const bm = box(0.16, bl, 0.16, mat.barkDark, 0, 0, 0);
            bm.rotation.set((rng() - 0.5) * 1.6, rng() * 6.28, (rng() - 0.5) * 1.9);
            place(bm, t + (rng() - 0.5) * 0.5, off + (rng() - 0.5) * 0.5, h * (0.5 + rng() * 0.45) - 1.4);
          }
        }
      } else if (kind < 0.78) {
        // Colonne brisée : deux fûts décalés, la cassure fait la silhouette.
        const h = 2.4 + rng() * 5;
        place(box(1.25, h, 1.25, mat.kerb, 0, 0, 0), t, off, h / 2 - 1.9);
        const top = box(1.15, 0.7, 1.15, mat.stoneDark, 0, 0, 0);
        top.rotation.set((rng() - 0.5) * 0.3, rng() * 6.28, (rng() - 0.5) * 0.3);
        place(top, t + (rng() - 0.5) * 0.5, off + (rng() - 0.5) * 0.5, h - 1.7);
      } else if (kind < 0.93) {
        // Rocher moussu à demi noyé.
        const s = 0.9 + rng() * 1.8;
        const rock = box(s, s * 0.75, s * 1.2, mat.mossDark, 0, 0, 0);
        rock.rotation.set((rng() - 0.5) * 0.4, rng() * 6.28, (rng() - 0.5) * 0.4);
        place(rock, t, off, s * 0.3 - 1.7);
      } else {
        // Pierre levée gravée, isolée dans le lac.
        const h = 1.8 + rng() * 1.6;
        place(box(0.3, h, 1.1, mat.kerb, 0, 0, 0), t, off, h / 2 - 1.5);
        const gl = new THREE.Mesh(geo.plane, mat.rune);
        gl.scale.set(0.9, h * 0.6, 1);
        place(gl, t, off, h * 0.55 - 1.5);
        glows.push(gl);
      }
    }

    /* --- 9 bis. RUINES IMMERGÉES (zip 379). Des blocs de la chaussée tombés
       à l'eau, à demi noyés et de guingois. Sur les références de Guillaume,
       c'est ce qui donne son âge à l'ouvrage : une rambarde intacte au milieu
       d'un lac vide se lit comme un décor neuf ; les mêmes pierres éparpillées
       autour disent qu'elle s'écroule depuis longtemps.

       Réservées à la section de pierre et au fondu (rien à faire tomber d'une
       plateforme qui n'a plus de rambarde), et posées près du bord pour rester
       dans le premier plan éclairé. --- */
    {
      const sMid = stageAt(node, node.length / 2);
      const nRuins = Math.round(5 * (1 - sMid));
      for (let i = 0; i < nRuins; i++) {
        const t = rng() * node.length;
        const side = rng() < 0.5 ? -1 : 1;
        const off = side * (CFG.TRACK_WIDTH / 2 + 1.6 + rng() * 5);
        const w = 0.8 + rng() * 1.3;
        const b = box(w, 0.55 + rng() * 0.5, w * (0.7 + rng() * 0.8), rng() < 0.5 ? mat.rail : mat.kerb, 0, 0, 0);
        // Basculés, et enfoncés juste sous le niveau du lac : ils affleurent.
        b.rotation.set((rng() - 0.5) * 0.5, rng() * 6.28, (rng() - 0.5) * 0.5);
        place(b, t, off, CFG.LAKE_Y + 1.9 + rng() * 0.5);
      }
    }

    /* --- 10. Obstacles --- */
    for (const o of node.obstacles) {
      if (o.type === OBST.GAP || o.type === OBST.CREVASSE) continue;  // traités par le sol
      for (let i = 0; i < CFG.LANE_COUNT; i++) {
        if (!o.lanes[i]) continue;
        const x = CFG.LANE_X[i];
        if (o.type === OBST.LOW) {
          // Bloc de pierre tombé en travers, MÊME matériau que les bordures :
          // c'est ce qui le relie au décor au lieu d'en faire une caisse de
          // jeu vidéo posée sur un temple.
          place(box(CFG.LANE_WIDTH - 0.1, CFG.LOW_HEIGHT, 0.6, mat.kerb, 0, 0, 0), o.t, x, CFG.LOW_HEIGHT / 2);
        } else if (o.type === OBST.HIGH) {
          const h = 3.2 - CFG.HIGH_CLEARANCE;
          place(box(CFG.LANE_WIDTH - 0.1, h, 0.6, mat.obstacle, 0, 0, 0), o.t, x, CFG.HIGH_CLEARANCE + h / 2);
          place(box(0.22, CFG.HIGH_CLEARANCE, 0.22, mat.beamPost, 0, 0, 0), o.t, x + CFG.LANE_WIDTH / 2 - 0.2, CFG.HIGH_CLEARANCE / 2);
        } else { // WALL
          place(box(CFG.LANE_WIDTH - 0.1, 2.6, 0.7, mat.kerb, 0, 0, 0), o.t, x, 1.3);
        }
      }
    }

    /* --- 11. Pièces --- */
    for (const c of node.coins) {
      const m = new THREE.Mesh(geo.coin, mat.coin);
      m.userData.coin = c;
      place(m, c.t, CFG.LANE_X[c.lane], c.y);
      if (!g.userData.coins) g.userData.coins = [];
      g.userData.coins.push(m);
    }

    /* --- 12. Balise de virage : deux piliers gravés au coin + flèche au sol.
       Seul endroit où on s'autorise de la signalétique franche : un virage
       manqué tue, il ne doit jamais être une surprise. --- */
    if (node.turn !== 0) {
      for (const side of [-1, 1]) {
        place(box(0.75, 4.6, 0.75, mat.kerb, 0, 0, 0), node.length - 1, side * (CFG.TRACK_WIDTH / 2 + 0.65), 2.3);
        const glow = new THREE.Mesh(geo.plane, mat.rune);
        glow.scale.set(1.0, 3.6, 1);
        place(glow, node.length - 1.5, side * (CFG.TRACK_WIDTH / 2 + 0.65), 2.4);
        glows.push(glow);
      }
      const arrow = new THREE.Mesh(geo.plane, mat.marker);
      arrow.scale.set(4.5, 2.4, 1);
      arrow.rotation.x = -Math.PI / 2;
      place(arrow, node.length - 6, node.turn * 2.2, 0.06);
    }

    /* --- 13. BIFURCATION OFFROAD (zip 377). ---------------------------------
       Trois repères, et volontairement AUCUN de ceux du virage. La flèche au
       sol et les deux piliers jumeaux restent réservés aux virages
       obligatoires : confondre « tourne ou tu meurs » avec « tu peux sortir
       ici » serait le pire malentendu que ce jeu puisse produire, et le
       vocabulaire visuel est ce qui l'empêche, pas un libellé.

       Les trois repères sont ceux du schéma fourni par Guillaume :
         a. une stèle à runes unique, côté sortie, au glow renforcé ;
         b. deux torches RAPPROCHÉES juste avant (resserrement local — c'est
            l'écart inhabituel qui se remarque, pas la torche) ;
         c. un chemin de champignons luminescents qui s'engage dans la trouée,
            seul élément qui DÉSIGNE une direction. Diégétique : le monde
            sombre est déjà éclairé comme ça partout ailleurs. --- */
    if (node.exit !== 0) {
      const side = node.exit;
      const t0 = node.length;

      // a. Stèle isolée, plus haute que les bordures, au bord de la trouée.
      const sh = 2.9;
      place(box(0.4, sh, 1.7, mat.kerb, 0, 0, 0), t0 - CFG.OFFROAD_MOUTH - 1.2,
            side * (CFG.TRACK_WIDTH / 2 + 0.9), sh / 2 - 0.2);
      const runeG = new THREE.Mesh(geo.plane, mat.rune);
      runeG.scale.set(1.5, sh * 0.7, 1);
      place(runeG, t0 - CFG.OFFROAD_MOUTH - 1.2, side * (CFG.TRACK_WIDTH / 2 + 0.9), sh * 0.55);
      glows.push(runeG);
      // Glow « renforcé » : un second halo, plus large et plus doux, par-dessus
      // la gravure. Deux plans valent mieux qu'un matériau dédié — le halo est
      // billboardé comme les autres et suit la caméra sans code en plus.
      const runeHalo = new THREE.Mesh(geo.plane, mat.glow);
      runeHalo.scale.set(4.2, 4.2, 1);
      place(runeHalo, t0 - CFG.OFFROAD_MOUTH - 1.2, side * (CFG.TRACK_WIDTH / 2 + 0.9), sh * 0.5);
      glows.push(runeHalo);

      // b. Deux torches rapprochées (2,5 u d'écart, contre TORCH_SPACING = 22).
      //    Deux graines VOISINES mais distinctes : c'est le cas le plus dur
      //    pour la désynchronisation, puisqu'on les voit côte à côte.
      for (let i = 0; i < 2; i++) {
        addTorch(place, t0 - CFG.OFFROAD_MOUTH - 5 + i * 2.5,
                 side * (CFG.TRACK_WIDTH / 2 + 0.75),
                 node.index * 9631 + 7717 + i * 4409,
                 stageAt(node, t0 - CFG.OFFROAD_MOUTH - 5), side, true);
      }

      // c. Chapelet de champignons qui s'enfonce dans la trouée, en biais.
      for (let i = 0; i < 5; i++) {
        const k = i / 4;
        const tt = t0 - CFG.OFFROAD_MOUTH * 0.55 + k * (CFG.OFFROAD_MOUTH * 0.5);
        const off = side * (CFG.TRACK_WIDTH / 2 - 0.4 + k * 3.2);
        const capSize = 0.34 + (1 - k) * 0.12;
        place(box(0.09, 0.22, 0.09, mat.mushStem, 0, 0, 0), tt, off, 0.11);
        const cap = new THREE.Mesh(geo.cap, mat.mushroom);
        cap.scale.set(capSize, capSize * 0.62, capSize);
        place(cap, tt, off, 0.22);
      }
      const trailHalo = new THREE.Mesh(geo.plane, mat.glow);
      trailHalo.scale.set(5.5, 5.5, 1);
      place(trailHalo, t0 - CFG.OFFROAD_MOUTH * 0.3, side * (CFG.TRACK_WIDTH / 2 + 1.4), 0.5);
      glows.push(trailHalo);

      // La branche est bâtie DANS LE MÊME GROUPE que l'embranchement : elle
      // apparaît et disparaît avec lui, donc elle est visible au moment de la
      // décision (sans quoi le joueur choisirait à l'aveugle) et elle est
      // libérée par dropNode sans une ligne de gestion de plus.
      if (node.escape) buildEscapeBranch(node.escape, g);
    }

    scene.add(g);
    nodeGroups.set(node.index, g);
    node.group = g;
  }

  /* ------------------------------------------- BRANCHE D'ÉCHAPPEMENT (377)
     Une chaussée qui s'en va vers le lac, et rien d'autre. Pas d'obstacle
     (il n'y a plus rien à jouer), pas de pièce (le score est arrêté), pas de
     torche (on s'éloigne du temple), et une bordure qui se délite au lieu de
     s'arrêter net.

     BUDGET. Un embranchement tous les 4000 unités, c'est un tronçon sur
     quarante environ : le surcoût ne pèse que sur ces tronçons-là, et il est
     mesuré par smoke-render.js, qui force désormais un embranchement dans son
     scénario. Le décor est volontairement plus maigre que sur la piste
     principale — c'est aussi ce qui fait sentir qu'on quitte le chemin. */
  function buildEscapeBranch(esc, g) {
    const f = dirForward(esc.dir), r = dirRight(esc.dir);
    const yaw = dirYaw(esc.dir);
    const rng = Track.makeRng(Math.round(esc.startDist) * 31 + 17);
    const place = (mesh, t, off, y) => {
      mesh.position.set(esc.ox + f.x * t + r.x * off, y, esc.oz + f.z * t + r.z * off);
      mesh.rotation.y += yaw;
      g.add(mesh);
      return mesh;
    };

    /* Pavage. Il DÉMARRE à t négatif : la branche et la piste principale
       partagent leur coin, et sans ce recouvrement on verrait le vide sous le
       joueur pendant la fraction de seconde du virage. Même raison que le
       chevauchement naturel des tronçons dans un virage ordinaire. */
    const tile = CFG.FLOOR_TILE;
    for (let t = -CFG.TRACK_WIDTH / 2; t < esc.length - 0.01; t += tile) {
      const len = Math.min(tile, esc.length - t);
      const tier = pickWearTier(rng());
      const variants = mat.stoneVariants[tier];
      const material = variants[Math.floor(rng() * variants.length)];
      // La chaussée se dégrade en s'éloignant : bascule et affaissement
      // croissants. C'est un chemin qui n'est plus entretenu.
      const wear = Math.min(1, Math.max(0, t) / esc.length);
      const tilt = (rng() - 0.5) * (CFG.FLOOR_TILT_CRACKED + wear * 0.09);
      const slab = box(CFG.TRACK_WIDTH, CFG.FLOOR_THICKNESS, Math.max(0.2, len - 0.12), material, 0, 0, 0);
      slab.rotation.x = tilt; slab.rotation.z = (rng() - 0.5) * 0.03;
      place(slab, t + len / 2, 0, -CFG.FLOOR_THICKNESS / 2 - wear * 0.12);
    }

    // Bordure qui se délite : de plus en plus de blocs manquants à mesure
    // qu'on s'éloigne, jusqu'à disparaître complètement.
    for (const s of [-1, 1]) {
      for (let t = 2; t < esc.length * 0.62; t += CFG.KERB_SPACING) {
        if (rng() < CFG.KERB_SKIP_CHANCE + (t / esc.length) * 1.1) continue;
        const h = 0.7 + rng() * 0.4;
        const b = box(1.4, h, 2.0 + rng() * 1.2, mat.kerb, 0, 0, 0);
        b.rotation.y = (rng() - 0.5) * 0.22;
        place(b, t, s * (CFG.TRACK_WIDTH / 2 + 0.75), h / 2 - 0.25);
      }
    }

    // Champignons : le chemin lumineux commencé dans la trouée continue, et
    // c'est lui qui tient la lecture de la branche une fois les torches
    // laissées derrière.
    for (let i = 0; i < 4; i++) {
      const t = 6 + i * (esc.length * 0.2);
      const off = (i % 2 === 0 ? -1 : 1) * (CFG.TRACK_WIDTH / 2 + 1.1 + rng() * 1.8);
      for (let m = 0; m < 2; m++) {
        const cap = new THREE.Mesh(geo.cap, mat.mushroom);
        const cs = 0.3 + rng() * 0.24;
        cap.scale.set(cs, cs * 0.62, cs);
        place(cap, t + (rng() - 0.5) * 1.2, off + (rng() - 0.5) * 1.0, 0.18);
      }
      const halo = new THREE.Mesh(geo.plane, mat.glow);
      const hs = 2.8 + rng() * 1.4;
      halo.scale.set(hs, hs, 1);
      place(halo, t, off, 0.5);
      glows.push(halo);
    }

    // Quelques arbres morts, moitié moins qu'ailleurs : la branche est déjà
    // le poste le plus chargé de son tronçon, et le brouillard épaissi de la
    // séquence de sortie en mange la plus grande part.
    for (let i = 0; i < 5; i++) {
      const t = rng() * esc.length;
      const off = (rng() < 0.5 ? -1 : 1) * (CFG.TRACK_WIDTH / 2 + 4 + rng() * 16);
      const h = 4 + rng() * 4.5;
      const trunk = box(0.42, h, 0.42, mat.bark, 0, 0, 0);
      trunk.rotation.z = (rng() - 0.5) * 0.22;
      place(trunk, t, off, h / 2 - 1.4);
      for (let b = 0; b < 2; b++) {
        const bl = 1.3 + rng() * 1.8;
        const bm = box(0.16, bl, 0.16, mat.barkDark, 0, 0, 0);
        bm.rotation.set((rng() - 0.5) * 1.6, rng() * 6.28, (rng() - 0.5) * 1.9);
        place(bm, t + (rng() - 0.5) * 0.5, off + (rng() - 0.5) * 0.5, h * (0.55 + rng() * 0.4) - 1.4);
      }
    }
    esc.built = true;
  }

  function dropNode(node) {
    const g = nodeGroups.get(node.index);
    if (!g) return;
    scene.remove(g);
    g.traverse(o => {
      if (o.isMesh && o.geometry && o.geometry !== geo.box && o.geometry !== geo.coin
          && o.geometry !== geo.plane && o.geometry !== geo.cap) o.geometry.dispose();
    });
    // Les deux listes d'animation référencent des meshes du groupe : les
    // oublier ICI est ce qui empêche la fuite. Sans ça elles grandiraient sans
    // fin et on continuerait d'animer des objets retirés de la scène.
    flames = flames.filter(fl => fl.parent !== g);
    glows = glows.filter(gl => gl.parent !== g);
    trees = trees.filter(tr => tr.parent !== g);
    nodeGroups.delete(node.index);
    node.group = null;
  }

  function clearAll() {
    for (const [, g] of nodeGroups) scene.remove(g);
    nodeGroups.clear();
    flames = [];
    glows = [];
    trees = [];
    for (const d of dust) { d.visible = false; d.userData.born = -1e9; }
  }

  /* ============================================================ ANIMATION ===
     LA COURSE (principe inchangé depuis le 373, étendu aux articulations). La
     foulée est cadencée sur la DISTANCE parcourue, pas sur le temps réel : un
     rythme basé sur "now" continuerait de battre à la même cadence à l'arrêt
     ou en sortie de trébuchement, ce qui est exactement ce qui rendait la
     course artificielle.

     LA GLISSADE (refaite au 374). world.js ne décide de rien : il lit
     player.slidePose() et pose la silhouette. Toute la temporalité — plongeon
     sec, maintien, relevé mou avec rebond — vit dans player.js, à côté de la
     règle de jeu qu'elle illustre.

     Les deux poses sont calculées SÉPARÉMENT puis mélangées par k. C'est ce
     qui garantit qu'on ne peut pas casser la course en retouchant la glissade
     — l'erreur classique étant d'accumuler des termes sur le même angle. */
  const STRIDE_PER_UNIT = 1.35;   // cycles de foulée par unité de distance
  const RUN_SWING = 0.95;         // amplitude de balancement des cuisses (rad)
  const ARM_SWING = 0.62;         // amplitude de balancement des bras (rad)
  /* Hauteur de repos du buste, relative au bassin. Elle est DÉRIVÉE de la même
     expression que dans buildPlayer (rel(0.78)) et non recopiée : le souffle
     de la sortie offroad doit y revenir exactement, sinon le fermier reste
     tassé d'un demi-centimètre pour le restant de la partie. */
  const CHEST_REST_Y = 0.78 - CFG.SLIDE_PELVIS_Y;

  function updatePlayer(player, now) {
    if (!player.node()) return;   // garde : un tronçon peut manquer une frame
    const p = player.worldPos();
    const { pelvis, chest, head, armL, armR, legL, legR } = playerRig;

    const pose = player.slidePose(now);
    const k = pose.k;                 // 0 debout, 1 glissade pleine
    const s = 1 - k;
    const mix = (run, slide) => run * s + slide * k;

    playerMesh.position.set(p.x, p.y, p.z);
    playerMesh.rotation.y = dirYaw(player.node().dir);

    /* ------------------------------------------------- POSE DE COURSE --- */
    const phase = player.totalDist * STRIDE_PER_UNIT;
    const swing = player.grounded ? Math.sin(phase) * RUN_SWING : 0.5;
    // Le genou ne se plie que vers l'ARRIÈRE (angle négatif), et surtout
    // pendant la phase de retour de la jambe. Un genou qui plie en phase
    // d'appui donne une démarche d'insecte.
    const kneeRun = (a) => -Math.max(0, -a) * 1.5 - 0.12;
    const bob = player.grounded ? Math.abs(Math.sin(phase)) * 0.05 : 0;

    /* ----------------------------------------------- POSE DE GLISSADE ---
       Pieds devant, dos renversé. La lecture DE DOS tient à trois choses, et
       il faut les trois : la silhouette s'ALLONGE (jambe avant tendue), elle
       DESCEND (bassin au ras du sol), et une main reste PLANTÉE derrière —
       c'est elle qui dit qu'il y a contact, et pas une chute. */
    const dragArm = Math.sin(now / 48) * 0.10;   // le bras d'appui vibre sur la pierre

    pelvis.rotation.x = CFG.SLIDE_LEAN * k;
    pelvis.position.y = CFG.SLIDE_PELVIS_Y
      + bob * s
      - CFG.SLIDE_DROP * k
      + CFG.SLIDE_POP * pose.pop;

    chest.rotation.x = mix(-0.1, -0.42);
    chest.rotation.z = Math.sin(phase) * 0.05 * s;
    head.rotation.x = mix(0, -0.55);             // le regard reste sur la piste

    // Jambe avant tendue, jambe arrière repliée sous le corps. L'asymétrie est
    // ce qui fait la différence avec un mannequin qu'on couche.
    legL.hip.rotation.x = mix(swing, 0.95);
    legL.knee.rotation.x = mix(kneeRun(swing), -0.05);
    legR.hip.rotation.x = mix(-swing, 0.30);
    legR.knee.rotation.x = mix(kneeRun(-swing), -1.65);

    // Bras en opposition avec la jambe du même côté ; coude toujours un peu
    // fléchi, un bras droit à la course fait pantin.
    armL.hip.rotation.x = mix(-swing * (ARM_SWING / RUN_SWING), 0.55);
    armL.hip.rotation.z = 0.85 * k;
    armL.knee.rotation.x = mix(-0.35 - Math.max(0, -swing) * 0.5, -1.1);

    armR.hip.rotation.x = mix(swing * (ARM_SWING / RUN_SWING), -1.75 + dragArm);
    armR.hip.rotation.z = -0.55 * k;
    armR.knee.rotation.x = mix(-0.35 - Math.max(0, swing) * 0.5, -0.25);

    /* ------------------------------------ SORTIE OFFROAD : IL SE RETOURNE ---
       Zip 377. Le fermier ne s'arrête pas de courir — il jette un œil
       par-dessus l'épaule, du côté d'où il vient, pendant que la meute file
       tout droit. Deux rotations en Y qui S'AJOUTENT (buste puis tête) : c'est
       ce qui donne un mouvement de torsion et non une tête vissée à l'envers.

       Elles vivent sur l'axe Y, que ni la course ni la glissade n'utilisent —
       aucun terme n'est accumulé sur un angle déjà occupé, ce qui est
       exactement l'erreur classique que la séparation course/glissade évite
       depuis le 374. Remettre à zéro EN DEHORS de la sortie est indispensable :
       une torsion oubliée survivrait à la partie suivante.

       Le souffle est porté par le buste et non par le bassin : un bassin qui
       respire fait tanguer les jambes et casse la foulée. */
    if (player.escaping) {
      const e = player.escapePose(now);
      chest.rotation.y = player.escapeSide * CFG.ESCAPE_LOOKBACK_TORSO * e.look;
      head.rotation.y = player.escapeSide * CFG.ESCAPE_LOOKBACK_HEAD * e.look;
      chest.position.y = CHEST_REST_Y + e.breath * CFG.ESCAPE_BREATH_AMP;
    } else if (chest.rotation.y !== 0) {
      chest.rotation.y = 0;
      head.rotation.y = 0;
      chest.position.y = CHEST_REST_Y;
    }

    if (k > 0.35 && player.grounded) emitDust(now, p, k);

    torchLight.position.set(p.x, p.y + 2.4, p.z);
    mushLight.position.set(p.x, p.y + 0.6, p.z);
  }

  /* Poussière : on recycle la plus vieille bouffée du pool, on la sème au ras
     du sol avec un peu de dispersion, et updateAmbient la fait grossir en
     s'effaçant. Rien à allouer, rien à libérer, jamais. */
  let dustCursor = 0, lastDustAt = 0;
  function emitDust(now, p, k) {
    if (now - lastDustAt < 40) return;
    lastDustAt = now;
    const m = dust[dustCursor++ % dust.length];
    m.visible = true;
    m.userData.born = now;
    m.userData.size = 0.5 + Math.random() * 0.7;
    m.material.opacity = 0.32 * k;
    m.position.set(
      p.x + (Math.random() - 0.5) * 1.1,
      p.y + 0.1,
      p.z + (Math.random() - 0.5) * 1.1
    );
    m.scale.set(m.userData.size, m.userData.size, 1);
  }

  function updateWolves(pack, player, now) {
    const pos = pack.positions(player, now);
    for (let i = 0; i < wolfMeshes.length; i++) {
      const m = wolfMeshes[i];
      if (i >= pos.length) { m.visible = false; continue; }
      m.visible = true;
      m.position.set(pos[i].x, pos[i].y, pos[i].z);
      // Orientation : on regarde vers le joueur, ça suffit largement.
      // baseDist(), pas player.totalDist : à la sortie offroad la meute est
      // détachée du fermier (voir wolves.js). Lire la distance ici aurait
      // orienté les corps sur une piste et posé les positions sur une autre.
      const loc = pack.track.locate(Math.max(0, pack.baseDist(player) - pack.gap - pack.offsets[i].back));
      m.rotation.y = dirYaw(loc.node.dir);
    }
  }

  /* ================================================================ ORAGE ===
     Trois temps, comme un vrai éclair : un premier coup bref, un noir très
     court, puis le coup principal, plus fort et plus long. Renvoie 0..1.

     Le flash n'est PAS un voile blanc par-dessus l'image : il éclaircit le
     ciel, remonte les deux lumières de la scène et déteint sur le brouillard.
     Un voile aurait délavé la piste au lieu de l'éclairer, et le joueur aurait
     perdu de vue ses obstacles au pire moment. */
  function tickLightning(now) {
    if (now >= storm.nextAt) {
      storm.startedAt = now;
      storm.bolt = Math.floor(Math.random() * boltMats.length);
      storm.boltU = Math.random() * Math.PI * 2;
      storm.nextAt = now + CFG.LIGHTNING_MIN_MS
        + Math.random() * (CFG.LIGHTNING_MAX_MS - CFG.LIGHTNING_MIN_MS);
    }
    const age = now - storm.startedAt;
    const t1 = CFG.LIGHTNING_PRE_MS;
    const t2 = t1 + CFG.LIGHTNING_DARK_MS;
    const t3 = t2 + CFG.LIGHTNING_MAIN_MS;
    if (age < 0 || age > t3) return 0;
    if (age < t1) return (1 - age / t1) * 0.55;   // premier coup, décroissant
    if (age < t2) return 0;                       // noir
    return Math.pow(1 - (age - t2) / (t3 - t2), 1.7);
  }

  function updateAmbient(now, danger) {
    const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0;
    lastNow = now;

    /* --- Flammes (refaites au zip 377). ------------------------------------
       L'ancienne version multipliait les deux échelles par UN SEUL sinus : la
       flamme gonflait et dégonflait sans jamais changer de forme, et toutes
       les torches le faisaient au même rythme. Ici :

         * la HAUTEUR et la LARGEUR sont pilotées séparément — une flamme qui
           monte s'AFFINE, elle ne grossit pas ;
         * elle grandit PAR LE HAUT : le pied reste soudé à la mèche, ce qui
           est le détail qui la relie physiquement à la torche. Sans ça, elle
           enfle autour de son centre et se décolle du bâton à chaque bouffée ;
         * un roulis appliqué APRÈS le billboard la fait vaciller dans le plan
           de l'écran, donc lisiblement quel que soit l'angle de vue ;
         * la bouffée (f4) est cubique et unilatérale : longue attente, court
           sursaut. Un sinus rond aurait donné une respiration régulière, ce
           qui est exactement ce qu'un feu ne fait pas. */
    for (const fl of flames) {
      const u = fl.userData;
      fl.rotation.set(0, 0, 0);
      fl.lookAt(camera.position);
      const a = Math.sin(now * u.f1 + u.p1);
      const b = Math.sin(now * u.f2 + u.p2);
      const c = Math.sin(now * u.f3 + u.p3);
      const s4 = Math.sin(now * u.f4 + u.p4);
      const flare = s4 > 0 ? s4 * s4 * s4 : 0;
      const sy = u.h * (0.86 + 0.12 * a + 0.06 * c + 0.26 * flare);
      const sx = u.w * (0.95 + 0.08 * b - 0.04 * a - 0.06 * flare);
      fl.scale.set(sx, sy, 1);
      fl.position.y = u.y0 + (sy - u.h) * 0.5;
      fl.rotateZ(0.13 * b + 0.06 * c + 0.05 * a);
    }
    /* Respiration lumineuse des quatre matériaux partagés. Quatre lignes pour
       toutes les torches de l'écran : c'est le seul poste de cette refonte qui
       ne coûte rien du tout. */
    for (let i = 0; i < flamePulse.length; i++) {
      const q = flamePulse[i];
      mat.flameBody[i].opacity = 0.80 + Math.sin(now * q.fb + q.pb) * 0.14;
      mat.flameCore[i].opacity = 0.66 + Math.sin(now * q.fc + q.pc) * 0.26;
    }
    /* --- Halos (champignons, pierres levées, balises) : même billboard, sans
       le vacillement. --- */
    for (const gl of glows) {
      gl.rotation.set(0, 0, 0);
      gl.lookAt(camera.position);
    }
    /* --- Arbres morts en panneaux (zip 379). Ils pivotent autour de l'axe
       VERTICAL uniquement, jamais vers la caméra comme les halos : un arbre
       qui s'incline pour faire face à une caméra placée en hauteur se couche
       vers le joueur, et la supercherie saute aux yeux. En ne tournant qu'en
       lacet, il reste debout — c'est la règle de tous les billboards de
       végétation, et elle suffit ici parce que la caméra ne survole jamais
       la piste. --- */
    for (const tr of trees) {
      tr.rotation.set(0, Math.atan2(camera.position.x - tr.position.x,
                                    camera.position.z - tr.position.z), 0);
    }

    /* --- Pièces --- */
    for (const [, g] of nodeGroups) {
      if (!g.userData.coins) continue;
      for (const c of g.userData.coins) {
        c.rotation.y += 0.06;
        c.visible = !c.userData.coin.taken;
      }
    }

    /* --- Poussière de glissade : elle grossit et s'efface. --- */
    for (const d of dust) {
      if (!d.visible) continue;
      const age = now - d.userData.born;
      if (age > CFG.SLIDE_DUST_MS) { d.visible = false; continue; }
      const k = age / CFG.SLIDE_DUST_MS;
      const sz = d.userData.size * (1 + k * 2.2);
      d.scale.set(sz, sz, 1);
      d.material.opacity = 0.32 * (1 - k) * (1 - k);
      d.position.y += dt * 0.35;
      d.lookAt(camera.position);
    }

    /* --- Ciel et lac suivent la caméra. Ce sont des décors INFINIS : les
       laisser fixes ferait apparaître leurs bords au bout de quelques
       centaines d'unités de course. --- */
    const cam = camera.position;
    sky.position.set(cam.x, 0, cam.z);
    lake.position.set(cam.x, CFG.LAKE_Y, cam.z);
    lakeGlow.position.set(cam.x, CFG.LAKE_Y + 0.05, cam.z);

    /* Le défilement de texture COMPENSE le déplacement du plan. Sans lui, la
       texture serait solidaire de la caméra et l'eau paraîtrait parfaitement
       figée sous les pieds du joueur, ce qui est pire que pas de lac du tout.
       Signes : le plan est tourné de -90° sur X, donc son y local vaut -z
       monde — d'où le moins sur la composante V. */
    if (lakeMat.map) {
      lakeMat.map.offset.x = cam.x / lakeUnitsPerTile;
      lakeMat.map.offset.y = -cam.z / lakeUnitsPerTile + now * 0.001 * CFG.LAKE_SCROLL;
    }
    if (lakeGlowMat.map) {
      lakeGlowMat.map.offset.x = cam.x / glowUnitsPerTile + now * 0.0006 * CFG.LAKE_SCROLL;
      lakeGlowMat.map.offset.y = -cam.z / glowUnitsPerTile - now * 0.0014 * CFG.LAKE_SCROLL;
    }
    for (const m of mists) {
      m.userData.orbit += dt * m.userData.speed;
      m.position.set(
        cam.x + Math.cos(m.userData.orbit) * m.userData.radius,
        CFG.LAKE_Y + 1.2,
        cam.z + Math.sin(m.userData.orbit) * m.userData.radius
      );
    }

    /* --- Orage --- */
    const flash = tickLightning(now) * CFG.LIGHTNING_STRENGTH;
    if (flash > 0.01 && storm.bolt >= 0) {
      boltMesh.visible = true;
      boltMesh.material = boltMats[storm.bolt];
      boltMesh.material.opacity = Math.min(1, flash * 1.4);
      const R = CFG.DRAW_DISTANCE * 0.7;
      boltMesh.position.set(cam.x + Math.cos(storm.boltU) * R, 90, cam.z + Math.sin(storm.boltU) * R);
      boltMesh.lookAt(cam.x, 90, cam.z);
    } else if (boltMesh.visible) {
      boltMesh.visible = false;
    }

    /* --- Couleurs d'ambiance. Plus les loups sont proches, plus la scène vire
       au rouge sombre ; l'éclair, lui, tire tout vers le violet blanc. --- */
    const fogCol = new THREE.Color(CFG.COL_FOG).lerp(new THREE.Color(0x3a0d12), danger * 0.8);
    fogCol.lerp(new THREE.Color(CFG.COL_LIGHTNING), flash * 0.55);
    scene.fog.color.copy(fogCol);

    /* Le ciel est un MeshBasicMaterial texturé : sa couleur MULTIPLIE la
       texture. Passer au-dessus de 1 donne le sur-éclairement du flash sans
       ajouter un seul objet à la scène. */
    const lit = 1 + flash * 2.2;
    skyMat.color.setRGB(lit, lit, lit * 1.05);
    lakeGlowMat.opacity = 0.4 + flash * 0.4;

    ambientLight.intensity = 0.5 + flash * 1.5;
    moonLight.intensity = 0.5 + flash * 1.9;
    // Zip 377 : deux harmoniques au lieu d'une. La lampe qui suit le joueur
    // battait à une seconde près, ce qui s'entendait à l'œil comme un
    // clignotant. Deux périodes incommensurables suffisent à la rendre
    // irrégulière, pour le même prix.
    torchLight.intensity = (1.35 + Math.sin(now / 110) * 0.12 + Math.sin(now / 47 + 1.7) * 0.07) * torchFade;
    mushLight.intensity = 0.75 + Math.sin(now / 260) * 0.12 + flash * 0.6;
  }

  /* Épaississement de la brume pendant la sortie offroad (zip 377).
     C'est le brouillard EXISTANT qu'on densifie, pas un voile ajouté : la
     piste s'efface d'elle-même dans le lointain, le lac et les arbres morts
     s'estompent dans le bon ordre, et le fondu de l'interface n'a plus qu'à
     achever ce que la scène a commencé. Un voile plat par-dessus l'image
     aurait délavé le fermier au premier plan aussi fort que l'horizon.

     Remis à zéro par Game.start() : une densité laissée en l'état ferait
     commencer la course suivante dans la purée de pois. */
  function setMist(k, dist) {
    if (!scene || !scene.fog) return;
    const m = Math.max(0, Math.min(1, k));

    /* CYCLE DE BRUME (zip 379). « Un très léger effet brouillard qui se
       dissipera très très progressivement et reviendra aussi progressivement
       tous les 4000 mètres. »

       Un cosinus sur la distance, pas un seuil : il est maximal à 0, nul à
       mi-période, et remonte — donc la brume respire sur 2000 mètres dans
       chaque sens, ce qui est aussi progressif qu'on peut l'être. Aucune
       dérivée discontinue nulle part, donc aucun moment où l'on « voit » la
       brume changer d'avis.

       La période est celle des bifurcations offroad. Conséquence voulue : la
       brume est au plus épais PILE sur les embranchements, elle les annonce
       donc plusieurs centaines de mètres à l'avance. C'est ce que demandait
       le schéma du zip 377, obtenu ici pour toute la piste.

       Le facteur de la SORTIE offroad se multiplie par-dessus au lieu de le
       remplacer : les deux brumes ont des causes différentes et doivent
       pouvoir s'additionner. */
    const u = ((dist || 0) % CFG.FOG_CYCLE_DIST) / CFG.FOG_CYCLE_DIST;
    const cycle = 1 + (CFG.FOG_CYCLE_MULT - 1) * (0.5 + Math.cos(u * Math.PI * 2) * 0.5);
    scene.fog.density = CFG.FOG_NEAR_DENSITY * cycle * (1 + (CFG.ESCAPE_MIST_MULT - 1) * m);
  }

  /* La lampe CHAUDE qui suit le joueur s'éteint avec les flammes (zip 379).
     Elle éclairait le fermier en orange sur toute la piste ; une fois les
     torches mortes, plus rien ne justifie cette lumière, et la garder aurait
     annulé l'assombrissement qu'on vient de construire. La lampe violette du
     lac, elle, reste : c'est le lac qui éclaire, et il ne s'éteint pas. */
  let torchFade = 1;
  function setStage(s) { torchFade = 1 - Math.max(0, Math.min(1, s)); }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(Math.max(1, Math.round(w / CFG.PIXEL_SCALE)), Math.max(1, Math.round(h / CFG.PIXEL_SCALE)), false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render() { renderer.render(scene, camera); }

  return {
    init, buildNode, dropNode, clearAll, updatePlayer, updateWolves, updateAmbient, render, resize,
    applySkin, setMist, setStage,
    get camera() { return camera; },
    get scene() { return scene; },
    get playerMesh() { return playerMesh; },
    get playerRig() { return playerRig; },   // lecture seule, pour tools/smoke-render.js
    get geometries() { return geo; },        // idem : identifier une boîte sans navigateur
    get materials() { return mat; },         // idem : vérifier une teinte sans navigateur
  };
})();
