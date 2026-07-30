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
  let flames = [];        // plans de flamme à faire vaciller
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
    mat.pants     = L(CFG.COL_PANTS);
    mat.skin      = L(CFG.COL_SKIN);
    mat.hair      = L(CFG.COL_HAIR);
    mat.moss      = L(CFG.COL_MOSS);
    mat.mossDark  = L(CFG.COL_MOSS_DARK);
    mat.vine      = L(CFG.COL_VINE);
    mat.mushStem  = L(0x6a5f7a);
    mat.torchWood = L(0x241f1a);
    mat.coin      = new THREE.MeshLambertMaterial({ color: CFG.COL_COIN, emissive: CFG.COL_COIN, emissiveIntensity: 0.45 });

    mat.pit       = new THREE.MeshBasicMaterial({ color: 0x05060a });   // paroi intérieure d'une crevasse
    mat.eye       = new THREE.MeshBasicMaterial({ color: CFG.COL_WOLF_EYE });
    mat.mushroom  = new THREE.MeshBasicMaterial({ color: CFG.COL_MUSHROOM });
    mat.flame     = new THREE.MeshBasicMaterial({ color: CFG.COL_TORCH, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });

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
    mat.kerb = paintKerbMaterial();

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

    // Crêtes lointaines en silhouette. Le profil PART et REVIENT à la même
    // hauteur, sinon la ligne d'horizon a une marche visible à la couture.
    const EDGE_Y = HORIZON - 14;
    ctx.fillStyle = cssHex(CFG.SKY_PEAKS);
    ctx.beginPath();
    ctx.moveTo(0, HORIZON + 30);
    ctx.lineTo(0, EDGE_Y);
    let x = 0;
    while (x < W) {
      const step = 40 + Math.random() * 90;
      const summit = x + step >= W ? EDGE_Y : HORIZON - 14 - Math.random() * 62;
      ctx.lineTo(Math.min(W, x + step * 0.5), summit);
      ctx.lineTo(Math.min(W, x + step), HORIZON - 6 - Math.random() * 18);
      x += step;
    }
    ctx.lineTo(W, EDGE_Y);
    ctx.lineTo(W, HORIZON + 30);
    ctx.closePath();
    ctx.fill();

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
    skyMat = new THREE.MeshBasicMaterial({
      map: pixelTexture(paintSky()), side: THREE.BackSide, fog: false, depthWrite: false,
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
     (16 px de large pour 24 de haut, tête large, jambes courtes) et ses
     couleurs OUTFITS[0]. Placeholder assumé, à remplacer par le vrai sprite.

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
    head.add(box(0.86, 0.30, 0.16, mat.hair, 0, 0.44, -0.26));  // nuque : c'est ce qu'on voit de dos
    chest.add(head);

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
    playerRig = { pelvis, chest, head, armL, armR, legL, legR };
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
        const tier = pickWearTier(rngFloor());
        const variants = mat.stoneVariants[tier];
        const material = variants[Math.floor(rngFloor() * variants.length)];
        const tiltMax = tier === 2 ? CFG.FLOOR_TILT_RUINED : tier === 1 ? CFG.FLOOR_TILT_CRACKED : 0;
        const sink = tier === 2 ? rngFloor() * CFG.FLOOR_SINK_RUINED : 0;
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
        if (rng() < CFG.KERB_SKIP_CHANCE) continue;
        const jitter = (rng() - 0.5) * 1.4;

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

        const h = 0.75 + rng() * 0.45;
        const len = 2.0 + rng() * 1.4;
        const b = box(1.5, h, len, mat.kerb, 0, 0, 0);
        b.rotation.y = (rng() - 0.5) * 0.12;   // blocs légèrement désalignés
        place(b, t + jitter, off, h / 2 - 0.25);

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
      for (let t = 8; t < node.length - 4; t += CFG.TORCH_SPACING) {
        const off = side * (CFG.TRACK_WIDTH / 2 + 0.45);
        // Un seul mât, pas de coupelle : à 3,4 px par pixel elle ne faisait
        // qu'épaissir la torche d'un pixel pour un mesh de plus par torche.
        place(box(0.22, 2.2, 0.22, mat.torchWood, 0, 0, 0), t, off, 1.1);
        const fl = new THREE.Mesh(geo.plane, mat.flame);
        fl.scale.set(0.7, 0.95, 1);
        place(fl, t, off, 2.4);
        fl.userData.phase = (node.index * 7 + t) * 0.7;
        flames.push(fl);
      }
    }

    /* --- 8. Champignons luminescents, le motif le plus reconnaissable de
       l'illustration. Un bouquet = quelques chapeaux + UN seul halo pour tout
       le bouquet (un halo par chapeau tripleraient le coût pour un gain nul à
       cette résolution). --- */
    for (let i = 0; i < CFG.MUSHROOM_CLUSTERS; i++) {
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
    for (let i = 0; i < CFG.DECOR_PROPS; i++) {
      const t = rng() * node.length;
      const side = rng() < 0.5 ? -1 : 1;
      const off = side * (CFG.TRACK_WIDTH / 2 + 3.5 + rng() * 22);
      const kind = rng();

      if (kind < 0.5) {
        // Arbre mort : tronc légèrement incliné + branches en éventail, plus
        // fines et plus nombreuses qu'au 372 pour lire comme une ramure.
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
          place(box(0.22, CFG.HIGH_CLEARANCE, 0.22, mat.torchWood, 0, 0, 0), o.t, x + CFG.LANE_WIDTH / 2 - 0.2, CFG.HIGH_CLEARANCE / 2);
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

    scene.add(g);
    nodeGroups.set(node.index, g);
    node.group = g;
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
    nodeGroups.delete(node.index);
    node.group = null;
  }

  function clearAll() {
    for (const [, g] of nodeGroups) scene.remove(g);
    nodeGroups.clear();
    flames = [];
    glows = [];
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
      const loc = pack.track.locate(Math.max(0, player.totalDist - pack.gap - pack.offsets[i].back));
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

    /* --- Flammes : elles regardent la caméra et respirent. --- */
    for (const fl of flames) {
      fl.rotation.set(0, 0, 0);
      fl.lookAt(camera.position);
      const s = 0.8 + Math.sin(now / 90 + fl.userData.phase) * 0.18;
      fl.scale.set(0.7 * s, 0.95 * s, 1);
    }
    /* --- Halos (champignons, pierres levées, balises) : même billboard, sans
       le vacillement. --- */
    for (const gl of glows) {
      gl.rotation.set(0, 0, 0);
      gl.lookAt(camera.position);
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
    torchLight.intensity = 1.35 + Math.sin(now / 110) * 0.16;
    mushLight.intensity = 0.75 + Math.sin(now / 260) * 0.12 + flash * 0.6;
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
