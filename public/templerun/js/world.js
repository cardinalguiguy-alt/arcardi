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
  const rainLayers = [];        // zip 400 : les trois nappes de pluie
  let skyDay, skyDayMat, lakeDay, lakeDayMat;   // cycle jour/nuit (zip 382)
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

    buildDayNightColors();
    buildAssets();
    buildSky();
    buildRain();                          // zip 400 : trois nappes, objets permanents
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
    /* ZIP 381 — la pièce octaédrique devient une SPHÈRE. 10×8 segments : c'est
       le minimum où la silhouette ne montre plus d'angle à la taille où la
       bulle est ramassée. En dessous (8×6) le contour est un polygone visible,
       ce qui trahit le « bien nettes » demandé — net ne veut pas dire facetté.
       Au-dessus, on paie des triangles pour un contour déjà rond. */
    geo.coin = new THREE.SphereGeometry(0.34, 10, 8);
    geo.plane = new THREE.PlaneGeometry(1, 1);
    geo.cap = new THREE.SphereGeometry(0.5, 6, 4);   // chapeau de champignon, très peu de segments

    const L = (c, opts) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, opts || {}));
    mat.stone     = L(CFG.COL_STONE);
    mat.stoneDark = L(CFG.COL_STONE_DARK);
    mat.edge      = L(CFG.COL_STONE_EDGE);
    /* Zip 380 — PLUS AUCUN VOLUME EN COULEUR UNIE (« je ne veux pas de modules
       non texturés »). La poutre haute, les troncs proches et les mâts de
       torche étaient les derniers aplats du décor : ils se lisaient comme des
       primitives posées au milieu d'un monde texturé. */
    mat.obstacle  = paintMasonry(CFG.COL_OBSTACLE, 3, 4, CFG.COL_STONE_EDGE, false, 3);
    mat.bark      = paintWood(CFG.COL_BARK);
    mat.barkDark  = paintWood(CFG.COL_BARK_DARK);
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
    mat.torchWood = paintWood(0x241f1a);
    mat.torchHead = L(0x140f0a);   // extrémité carbonisée du bâton (zip 377)
    /* Même bois que la torche, IDENTITÉ DISTINCTE. Le montant qui soutient une
       poutre haute n'est pas une torche : les confondre suffisait à faire
       échouer le contrôle « aucune torche ne flotte » de smoke-render.js sur
       trois faux positifs, et un contrôle bruyant finit ignoré, donc mort. */
    mat.beamPost = paintWood(0x2a231c);

    /* ZIP 381 — PLANCHE TOMBÉE EN TRAVERS : « abîmée et robuste » (Guillaume).
       Les deux mots tirent en sens contraire, et c'est le sujet de la texture.

       ROBUSTE vient de la SECTION, pas du dessin : une madrier épais de 34 cm
       posé sur deux cales ne peut pas se lire comme une latte. Le dessin, lui,
       ne fait que l'ABÎMER — sinon on obtient une poutre neuve, qui dans un
       temple noyé depuis des siècles est le plus invraisemblable des deux.
       D'où deux couches distinctes : un veinage marqué (la fibre tient), puis
       usure, éclats et mousse par-dessus (le temps l'a mangée).

       `repeat` 2×1 : la planche fait 2,5 unités de long pour 0,34 de haut. Une
       texture unique s'y étalerait en un dégradé, exactement le défaut relevé
       au 379b sur la rambarde de pierre. */
    mat.plank = new THREE.MeshLambertMaterial({ map: pixelTexture(paintPlank(), 2, 1) });
    mat.plankEnd = paintWood(0x3a2f22);   // bois de bout, plus clair : la cassure se voit

    /* ------------------------------------------------- BULLES (zip 381) ---
       Décision Guillaume : les pièces orange deviennent des bulles cyan,
       « bien nettes ».

       MeshBasicMaterial, et non Lambert émissif comme la pièce dorée. C'est
       tout l'enjeu du mot « nettes » : un Lambert reste éclairé par la scène,
       donc sa face à l'ombre s'assombrit et son bord se dissout dans un
       dégradé — sur une piste nocturne violette, la bulle devenait une tache
       laiteuse. Un Basic ignore la lumière : la sphère est un disque d'une
       seule couleur pleine, au contour franc, à 3,4 px par pixel comme à
       cent mètres. C'est le même arbitrage que la flèche de virage plus bas. */
    mat.coin      = new THREE.MeshBasicMaterial({ color: CFG.COL_COIN });

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

    /* Halo de la bulle. Il réutilise la texture de lueur commune, mais avec sa
       propre teinte et une opacité BASSE (0,34 contre 0,55 pour mat.glow).

       Un halo à l'opacité des champignons noyait le corps de la bulle : en
       additif, la couronne finissait plus lumineuse que le disque qu'elle
       entoure, et on retombait sur la tache floue que le Basic venait
       justement d'éliminer. Le halo n'est là que pour dire « ça brille » à
       vingt mètres ; c'est le disque net qui dit « c'est ramassable ». */
    mat.coinGlow = new THREE.MeshBasicMaterial({
      map: glowTex, color: CFG.COL_COIN_GLOW,
      transparent: true, opacity: 0.34, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });

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
    /* `repeat` en X : un bloc de rambarde fait ~9 unités de long pour 1,55 de
       haut. Sans répétition, la texture s'étirerait six fois et l'appareillage
       deviendrait un dégradé. Trois motifs sur la longueur donnent des blocs
       d'environ trois mètres — l'échelle de la jetée 2D. */
    mat.rail = new THREE.MeshLambertMaterial({ map: pixelTexture(paintRailWall(), 3, 1) });
    mat.railCap = new THREE.MeshLambertMaterial({ map: pixelTexture(paintRailCap(), 3, 1) });

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

  /* =================== MAÇONNERIE ET BOIS TEXTURÉS (zip 380) ==============
     Retour de Guillaume : « la rambarde de pierre utilise un matériau non
     texturé, qui ne correspond pas du tout au niveau attendu. Je ne veux pas
     de modules non texturés. »

     Il avait raison, et le défaut était systémique : tout ce qui n'était pas
     le SOL était peint d'un aplat. Rambarde, couronnement, poutres, troncs,
     mâts de torche — une douzaine de volumes en couleur unie au milieu d'un
     décor entièrement texturé. À plat, un bloc de pierre uni ne se lit pas
     comme de la pierre : il n'a ni assise, ni joint, ni usure, seulement une
     silhouette.

     Deux peintres génériques suffisent à tout couvrir, et c'est délibéré :
     une fonction par objet aurait produit douze dessins qui divergent, alors
     que la carrière doit être la même partout. */

  function tone(hex, k) {
    const r = Math.min(255, Math.round(((hex >> 16) & 255) * k));
    const g = Math.min(255, Math.round(((hex >> 8) & 255) * k));
    const b = Math.min(255, Math.round((hex & 255) * k));
    return `rgb(${r},${g},${b})`;
  }

  /* MAÇONNERIE. Des assises décalées d'un demi-bloc, un mortier plus sombre,
     une arête éclairée en haut de chaque pierre et une ombre en bas — c'est ce
     couple d'arêtes qui donne l'épaisseur, bien plus que le joint lui-même.
     `mossTop` coiffe la bande supérieure : la mousse pousse sur le dessus des
     murets, pas sur leurs flancs. */
  function paintMasonry(base, rows, cols, mortar, mossTop, wear) {
    const S = 32;
    const cv = makeCanvas(S, S);
    const ctx = cv.getContext("2d");
    ctx.fillStyle = cssHex(mortar);
    ctx.fillRect(0, 0, S, S);

    const bh = S / rows, bw = S / cols;
    for (let r = 0; r < rows; r++) {
      const y = r * bh;
      const off = (r & 1) ? bw / 2 : 0;
      for (let c = -1; c <= cols; c++) {
        const x = c * bw + off;
        // Chaque pierre a sa valeur : un appareillage dont tous les blocs
        // seraient identiques se lit comme un motif imprimé, pas comme un mur.
        ctx.fillStyle = tone(base, 0.82 + Math.random() * 0.36);
        ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
        ctx.fillStyle = "rgba(255,255,255,0.10)";
        ctx.fillRect(x + 1, y + 1, bw - 2, 1);
        ctx.fillStyle = "rgba(0,0,0,0.30)";
        ctx.fillRect(x + 1, y + bh - 2, bw - 2, 1);
        // Éclats et piqûres : l'usure, sans laquelle la pierre est neuve.
        for (let w = 0; w < wear; w++) {
          ctx.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0,0.26)" : "rgba(255,255,255,0.07)";
          ctx.fillRect(x + 2 + Math.random() * (bw - 4), y + 2 + Math.random() * (bh - 4),
                       1 + (Math.random() < 0.3 ? 1 : 0), 1);
        }
      }
    }
    if (mossTop) {
      const band = S * 0.34;
      for (let m = 0; m < 34; m++) {
        const x = Math.random() * S, y = Math.random() * band;
        ctx.fillStyle = Math.random() < 0.5 ? cssHex(CFG.COL_MOSS) : cssHex(CFG.COL_MOSS_DARK);
        ctx.globalAlpha = 0.85 - (y / band) * 0.75;
        ctx.beginPath(); ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    return new THREE.MeshLambertMaterial({ map: pixelTexture(cv) });
  }

  /* PIERRE TAILLÉE D'UN SEUL TENANT — le couronnement, les piliers de torche.
     Pas d'assises : c'est un monolithe. Ce qui le fait vivre, c'est un grain
     fin, une arête supérieure claire et des angles ébréchés. */
  function paintDressedStone(base, mossy) {
    const S = 32;
    const cv = makeCanvas(S, S);
    const ctx = cv.getContext("2d");
    ctx.fillStyle = cssHex(base);
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 130; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.10)";
      ctx.fillRect(Math.random() * S, Math.random() * S, 1 + (Math.random() < 0.25 ? 1 : 0), 1);
    }
    ctx.fillStyle = "rgba(255,255,255,0.13)"; ctx.fillRect(0, 0, S, 2);
    ctx.fillStyle = "rgba(0,0,0,0.26)"; ctx.fillRect(0, S - 2, S, 2);
    // Angles ébréchés : deux ou trois entailles sur les bords.
    for (let i = 0; i < 3; i++) {
      const w = 2 + Math.random() * 3;
      ctx.fillStyle = "rgba(0,0,0,0.34)";
      ctx.fillRect(Math.random() < 0.5 ? 0 : S - w, Math.random() * S, w, 1 + Math.random() * 3);
    }
    if (mossy) {
      for (let m = 0; m < 16; m++) {
        ctx.fillStyle = Math.random() < 0.5 ? cssHex(CFG.COL_MOSS_DARK) : cssHex(CFG.COL_MOSS);
        ctx.globalAlpha = 0.4 + Math.random() * 0.4;
        ctx.beginPath(); ctx.arc(Math.random() * S, Math.random() * (S * 0.35), 1 + Math.random() * 1.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    return new THREE.MeshLambertMaterial({ map: pixelTexture(cv) });
  }

  /* BOIS. Fil VERTICAL — les troncs et les mâts sont debout, et un fil
     horizontal les ferait lire comme des rondins couchés. Quelques nœuds, et
     des fentes plus sombres qui suivent le fil. */
  function paintWood(base) {
    const S = 32;
    const cv = makeCanvas(S, S);
    const ctx = cv.getContext("2d");
    ctx.fillStyle = cssHex(base);
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * S;
      ctx.fillStyle = Math.random() < 0.55 ? "rgba(0,0,0,0.24)" : "rgba(255,255,255,0.06)";
      ctx.fillRect(x, 0, 1 + (Math.random() < 0.2 ? 1 : 0), S);
    }
    for (let i = 0; i < 3; i++) {
      const x = 3 + Math.random() * (S - 6), y = 3 + Math.random() * (S - 6);
      ctx.fillStyle = "rgba(0,0,0,0.42)";
      ctx.beginPath(); ctx.arc(x, y, 1.6 + Math.random() * 1.6, 0, Math.PI * 2); ctx.fill();
    }
    return new THREE.MeshLambertMaterial({ map: pixelTexture(cv) });
  }

  /* --------------------------------- PLANCHE TOMBÉE EN TRAVERS (zip 381) ---
     Le madrier qui remplace une barrière basse sur une fois quatre. Peint et
     non pas dérivé de paintWood() : paintWood strie sur toute la hauteur du
     carré, ce qui donne un poteau vu de face — parfait pour un mât de torche,
     faux pour une planche, dont la fibre court en LONGUEUR. Un mât de torche
     retourné de 90° aurait suffi à trahir la réutilisation.

     Trois couches, dans cet ordre, et l'ordre compte :
       1. la fibre : longues stries horizontales, contraste marqué — c'est la
          seule chose qui dit « robuste » ;
       2. l'usure : nœuds, fentes ouvertes, éclats sur les arêtes ;
       3. la mousse, uniquement sur l'arête basse, comme partout ailleurs dans
          ce décor (paintKerbMaterial, paintRailCap) — c'est cette cohérence
          qui rattache la planche à l'ouvrage au lieu d'en faire un accessoire.
     Peindre l'usure avant la fibre l'aurait recouverte : la planche aurait
     paru vernie. */
  function paintPlank() {
    const W = 48, H = 16;
    const cv = makeCanvas(W, H);
    const ctx = cv.getContext("2d");

    ctx.fillStyle = cssHex(CFG.COL_PLANK);
    ctx.fillRect(0, 0, W, H);

    // 1. Fibre. Des stries de LONGUEUR, jamais interrompues : une strie coupée
    //    lit comme une rayure, une strie continue lit comme du bois.
    for (let i = 0; i < 22; i++) {
      const y = Math.random() * H;
      ctx.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0,0.26)" : "rgba(255,255,255,0.07)";
      ctx.fillRect(0, y, W, 1);
    }

    // 2. Usure. Nœuds sombres, fentes ouvertes le long du fil, arêtes ébréchées.
    for (let i = 0; i < 4; i++) {
      const x = 4 + Math.random() * (W - 8), y = 3 + Math.random() * (H - 6);
      ctx.fillStyle = "rgba(0,0,0,0.46)";
      ctx.beginPath(); ctx.arc(x, y, 1.4 + Math.random() * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath(); ctx.arc(x, y, 2.6 + Math.random() * 1.4, 0, Math.PI * 2); ctx.fill();
    }
    // Fentes : elles suivent le fil, donc horizontales. Une fente verticale
    // ferait une planche fendue en deux, c'est-à-dire cassée, pas abîmée.
    for (let i = 0; i < 5; i++) {
      const y = 1 + Math.random() * (H - 2), x0 = Math.random() * W * 0.6;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(x0, y, 4 + Math.random() * (W * 0.35), 1);
    }
    // Éclats sur les deux arêtes : de petites morsures dans le bord.
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * W, w = 1 + Math.random() * 3;
      ctx.fillStyle = "rgba(0,0,0,0.38)";
      if (Math.random() < 0.5) ctx.fillRect(x, 0, w, 1 + Math.random() * 2);
      else ctx.fillRect(x, H - 1 - Math.random() * 2, w, 1 + Math.random() * 2);
    }

    // 3. Mousse, arête basse seulement — le bord qui touche la pierre.
    const band = H * 0.3;
    for (let m = 0; m < 16; m++) {
      const dy = Math.random() * band;
      ctx.fillStyle = Math.random() < 0.5 ? cssHex(CFG.COL_MOSS) : cssHex(CFG.COL_MOSS_DARK);
      ctx.globalAlpha = 0.7 - (dy / band) * 0.55;
      ctx.fillRect(Math.random() * W, H - 1 - dy, 1 + Math.random() * 2, 1);
    }
    ctx.globalAlpha = 1;
    return cv;
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

    /* ÉCHELLE DES BLOCS — corrigée au zip 380, et c'est la cause du « sol
       incohérent avec la version 2D » relevé par Guillaume.

       La texture est plaquée UNE fois sur une dalle de 8,4 × 4 unités. Avec
       deux blocs par côté, chaque pierre mesurait donc 4,2 m sur 2 : des
       dalles de la taille d'une voiture, alors que la jetée 2D pose deux
       assises par CASE, c'est-à-dire des blocs d'environ 1,3 m.

       Six colonnes sur trois assises redonnent la bonne taille (1,4 × 1,33 m),
       et le rapport 6/3 compense l'étirement : la dalle est deux fois plus
       large que longue, il faut donc deux fois plus de colonnes que d'assises
       pour que les pierres soient CARRÉES dans le monde. Un appareillage aux
       pierres écrasées se lit comme du carrelage. */
    const rows = 3, cols = 6, gap = 1;
    const bh = (SIZE - gap * (rows + 1)) / rows;
    for (let r = 0; r < rows; r++) {
      const off = (r & 1) ? SIZE / (cols * 2) : 0;
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
    const mossAmount = [2, 5, 9][tier];
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

  /* ------------------------------ RAMBARDE DE PIERRE (refaite au zip 379b) ---
     AUDIT COMPARATIF avec la jetée 2D, sur capture de Guillaume : « la
     plateforme en pierre du début n'est pas assez soignée, ne correspond pas
     du tout au niveau attendu ». Trois causes distinctes, toutes trouvées en
     comparant point par point avec drawRunDeckTile (fermeArt.js) :

       1. LE MUR N'AVAIT AUCUNE TEXTURE. `mat.rail` était un simple Lambert de
          couleur unie : la rambarde de la section soignée était donc MOINS
          détaillée que la bordure d'AA, qui a la sienne depuis le zip 374.
          C'est le défaut principal, et il explique à lui seul l'aplat beige.
       2. ELLE ÉTAIT TROP CLAIRE. À 0x635b4b, éclairée par la lune, elle
          ressortait crème sur une chaussée grise — alors qu'en 2D le muret est
          à peine plus clair que la dalle.
       3. ÉTIREMENT. Un bloc de 9 mètres de long reçoit UNE seule fois sa
          texture : même bien peinte, elle se serait étalée en un dégradé.
          D'où `repeat` réglé ici, et non à la pose.

     Le motif reprend celui de la jetée 2D : deux assises de blocs taillés,
     joints décalés d'une demi-longueur, mortier plus sombre, et une COIFFE DE
     MOUSSE sur la bande supérieure. */
  function paintRailWall() {
    /* ⚠️⚠️ ZIP 406 — 32 px POUR TROIS ASSISES, C'ÉTAIT LA MOITIÉ DU REPROCHE.
       Guillaume : « les rambardes en pierre au début ne sont pas assez
       réalistes (trop plates, pas d'aspérités, on dirait des boîtes en bois
       plus que des empilements de pierres) ».

       « Boîtes en BOIS » est le mot qui désigne la cause. À 32 px pour deux
       assises de deux blocs, un bloc reçoit 14×14 pixels : il n'y a
       physiquement pas la place d'y mettre un bord éclairé, un bord d'ombre,
       un éclat et un grain. Il ne reste qu'un rectangle uni séparé du voisin
       par un trait — c'est-à-dire exactement la façon dont on dessine une
       PLANCHE. C'est le même raisonnement qu'au 397 pour la pierre du
       labyrinthe (128 → 512), et il donne ici 64 px pour trois assises, soit
       un bloc de 19×18 : la place d'un relief.

       QUATRE COUCHES, et chacune répond à un mot de Guillaume :
         1. le mortier CREUSÉ (deux pixels d'ombre sous chaque bloc, un pixel
            de lumière au-dessus) — c'est ce qui fait « empilement » ;
         2. le grain par bloc : chaque pierre a sa teinte ET son bruit propre ;
         3. les ÉCLATS de coin — quelques pixels du bloc rendus au mortier.
            Une pierre taillée depuis longtemps n'a pas d'angle droit ;
         4. la mousse, déjà là, inchangée.

       ⚠️ MAIS LA TEXTURE NE SUFFIT PAS, et c'est le point : « pas
       d'aspérités » décrit la SILHOUETTE. Voir la pose de la rambarde, où le
       406 ajoute des pierres qui dépassent. Une texture, si fine soit-elle,
       ne change jamais un contour. */
    const S = 64;
    const cv = makeCanvas(S, S);
    const ctx = cv.getContext("2d");
    const shade = (base, k) => `rgb(${Math.round(((base >> 16) & 255) * k)},` +
      `${Math.round(((base >> 8) & 255) * k)},${Math.round((base & 255) * k)})`;

    ctx.fillStyle = cssHex(CFG.COL_MORTAR);
    ctx.fillRect(0, 0, S, S);

    // Trois assises, décalées d'un demi-bloc l'une sur l'autre : c'est le
    // décalage qui fait lire un APPAREILLAGE. Alignés, les mêmes blocs font
    // un carrelage.
    const gap = 3, rows = 3, cols = 3;
    const bh = (S - gap * (rows + 1)) / rows;
    for (let r = 0; r < rows; r++) {
      const off = (r & 1) ? S * 0.17 : 0;
      for (let c = -1; c <= cols; c++) {
        const bw = (S - gap * (cols + 1)) / cols;
        const bx = gap + c * (bw + gap) + off, by = gap + r * (bh + gap);
        const k = 0.80 + Math.random() * 0.38;
        const base = CFG.COL_RAIL;
        ctx.fillStyle = shade(base, k);
        ctx.fillRect(bx, by, bw, bh);

        // Grain : la pierre n'est pas un aplat. Sept touches suffisent parce
        // qu'on les voit à travers le bumpMap du matériau.
        for (let n = 0; n < 7; n++) {
          ctx.fillStyle = shade(base, k * (0.86 + Math.random() * 0.28));
          ctx.fillRect(bx + Math.random() * bw, by + Math.random() * bh,
                       1 + Math.random() * 2, 1 + Math.random() * 2);
        }
        // Le relief du joint : lumière en haut, ombre EN BAS et sur deux
        // pixels — une pierre porte celle du dessus, son ombre est du côté où
        // elle reçoit.
        ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.fillRect(bx, by, bw, 1);
        ctx.fillStyle = "rgba(0,0,0,0.32)"; ctx.fillRect(bx, by + bh - 2, bw, 2);
        ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.fillRect(bx + bw - 1, by, 1, bh);

        // Éclats de coin : on rend au mortier deux ou trois angles au hasard.
        for (let n = 0; n < 3; n++) {
          if (Math.random() > 0.45) continue;
          const cw = 1 + Math.random() * 3, ch = 1 + Math.random() * 2;
          const cxp = Math.random() < 0.5 ? bx : bx + bw - cw;
          const cyp = Math.random() < 0.5 ? by : by + bh - ch;
          ctx.fillStyle = cssHex(CFG.COL_MORTAR);
          ctx.fillRect(cxp, cyp, cw, ch);
        }
      }
    }

    // Coiffe de mousse sur la bande haute, dégressive vers le bas — comme
    // paintKerbMaterial, et comme la bordure 2D.
    const band = S * 0.26;
    for (let m = 0; m < 22; m++) {
      const y = Math.random() * band;
      ctx.fillStyle = Math.random() < 0.5 ? cssHex(CFG.COL_MOSS) : cssHex(CFG.COL_MOSS_DARK);
      ctx.globalAlpha = 0.75 - (y / band) * 0.6;
      ctx.beginPath(); ctx.arc(Math.random() * S, y, 1 + Math.random() * 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    return cv;
  }

  /* Pierre de couronnement : une tablette lisse, coupée de rares joints
     transversaux, avec de la mousse sur son arête extérieure. Volontairement
     PEU détaillée — c'est une surface usée par la pluie, pas de la maçonnerie,
     et c'est ce contraste avec le mur qui la fait lire comme une tablette. */
  function paintRailCap() {
    const W = 32, H = 16;
    const cv = makeCanvas(W, H);
    const ctx = cv.getContext("2d");
    ctx.fillStyle = cssHex(CFG.COL_RAIL_CAP);
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.10)";
      ctx.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1);
    }
    ctx.fillStyle = cssHex(CFG.COL_MORTAR);
    for (const jx of [W * 0.5]) ctx.fillRect(jx, 0, 1, H);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(0, H - 2, W, 2);
    for (let m = 0; m < 10; m++) {
      ctx.fillStyle = Math.random() < 0.5 ? cssHex(CFG.COL_MOSS_DARK) : cssHex(CFG.COL_MOSS);
      ctx.globalAlpha = 0.5;
      ctx.fillRect(Math.random() * W, H - 3 - Math.random() * 3, 1 + Math.random() * 2, 1);
    }
    ctx.globalAlpha = 1;
    return cv;
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
  /* ZIP 382 — LE MÊME PEINTRE POUR LES DEUX CIELS.

     `paintSky` prend désormais une PALETTE en argument et rien d'autre n'a
     changé : mêmes nuages, mêmes pyramides, mêmes proportions. Écrire un
     second `paintDaySky()` aurait été beaucoup plus rapide, et c'était le
     piège — les deux ciels se recouvrent en fondu pendant 3 000 mètres, donc
     tout ce qui ne serait pas EXACTEMENT à la même place dans les deux
     dessins se verrait glisser à l'écran. Une chaîne de montagnes qui bouge
     pendant un lever de soleil est un défaut qu'aucune relecture ne rattrape,
     parce qu'il n'apparaît que pendant le fondu.

     Le hasard est semé (`mulberry32` via `Track.makeRng`) pour la même raison,
     et c'est le vrai correctif du zip : nuages et pyramides étaient tirés au
     `Math.random()`. Deux appels auraient donc produit deux reliefs
     DIFFÉRENTS, et le lever de soleil aurait fait apparaître une seconde
     chaîne de montagnes par-dessus la première. Avec la même graine, les deux
     ciels sont le même dessin sous deux éclairages — c'est exactement ce
     qu'est un lever de soleil.

     `night` : la lune n'existe que dans le ciel de nuit, le soleil que dans
     celui de jour. Ils sont aux deux extrémités du ciel, comme il se doit à
     l'aube : pendant le fondu, la lune s'efface à l'ouest pendant que le
     soleil monte à l'est, et le mouvement est offert par le fondu lui-même. */
  function paintSky(P, night) {
    const W = 1024, H = 512;
    const cv = makeCanvas(W, H);
    const ctx = cv.getContext("2d");
    const HORIZON = H * 0.52;
    /* Graine FIXE et partagée par les deux ciels. Voir le commentaire ci-dessus.

       ELLE A ÉTÉ CHOISIE EN REGARDANT, pas prise au hasard, et c'est un effet
       de bord du zip qu'il ne fallait pas rater : tant que les nuages étaient
       tirés au `Math.random()`, leur disposition changeait à chaque
       chargement — la lune était donc dégagée une fois sur deux et personne
       ne pouvait s'en plaindre. En figeant la graine, on fige AUSSI une
       disposition particulière, et la première essayée (0x5C1A7E) enterrait
       la lune sous le banc de nuages à tous les coups.

       Huit graines rendues côte à côte avec render-textures.js, une retenue :
       croissant entièrement dégagé, nuages répartis sur toute la largeur, et
       une trouée à droite qui laisse passer le soleil du ciel de jour.
       Regarder coûte cinq minutes, et c'est la seule façon de savoir. */
    const rnd = Track.makeRng(0x314159);

    /* ⚠️⚠️ ZIP 400, SECONDE SOURCE DU DÉFAUT — ET C'EST CELLE QU'ON N'AURAIT
       JAMAIS TROUVÉE SANS REGARDER LE CADRAGE.

       Déplacer la bande chaude après la chaîne lointaine (voir plus bas) ne
       suffisait PAS : tools/preview-sky.js montrait encore du brun-rouge dans
       les V du plan lointain, tout en haut du cadre. La cause n'était plus la
       bande, c'était le DÉGRADÉ DE FOND. Il court du zénith jusqu'à l'horizon
       et finit sur P.horizon, qui est un violet ROUGE (0x2b1526 la nuit) : à la
       ligne 202 — la première que le joueur voit — il en est déjà aux trois
       quarts. Tout le ciel bas était donc chaud, et n'importe quel creux le
       laissait voir.

       On tient donc le corps du ciel FROID jusqu'à la crête la plus basse du
       plan proche, et on ne bascule vers la teinte chaude que sous cette
       ligne. Résultat, exactement la phrase de Guillaume : la teinte chaude
       n'existe plus qu'ENTRE les montagnes.

       ⚠️ LA BORNE EST CALCULÉE, PAS ÉCRITE. Elle vient de `warmTop`, lui-même
       tiré des hauteurs de la chaîne proche. Changer ces hauteurs demain
       déplacera la borne toute seule — c'est la différence entre un réglage et
       un nombre magique, et c'est la leçon que le 383 avait manquée en
       corrigeant une couleur au lieu d'une géométrie. */
    const NEAR_MIN_H = CFG.SKY_NEAR_H_MIN, NEAR_BASE_DY = 6;
    /* ⚠️ ZIP 406 — LE HAUT DU ROUGEOIEMENT NE SUIT PLUS LE COL LE PLUS BAS.
       Il valait `HORIZON - (NEAR_MIN_H - NEAR_BASE_DY)`, c'est-à-dire la crête
       la plus basse de la chaîne proche : la bande chaude ne pouvait ainsi
       jamais dépasser d'un col. C'était la parade du 400 contre un APLAT, qui
       a forcément un bord, et dont le bord dessine une forme. Le 406 la
       remplace par un vrai dégradé partant de zéro d'opacité : sans bord, il
       n'y a plus rien à borner, et la hauteur devient un réglage d'ambiance
       (SKY_GLOW_H) au lieu d'une conséquence du relief. */
    const warmTop = HORIZON - CFG.SKY_GLOW_H;

    /* Dégradé vertical : zénith -> corps du ciel -> rougeoiement bas.
       ⚠️ ZIP 406 — LES ARRÊTS BOUGENT, LES COULEURS NON. Guillaume a demandé
       « une luminosité évoquée par dégradé » ET « ne change pas la palette
       relevée » : les trois teintes sont donc exactement celles de config.js,
       relevées au pixel sur ses références, et c'est leur RÉPARTITION qui
       change. `mid` tenait jusqu'à `warmTop` — qui valait 230 sur 266, soit
       86 % de la hauteur : le ciel était donc un aplat de `mid` sur presque
       toute sa surface, et virait à `horizon` dans les 36 derniers pixels.
       Un aplat plus une bascule, ce n'est pas un dégradé. Réparti de 0,42 à
       1, on obtient une descente continue du zénith à l'horizon — c'est-à-dire
       la lumière évoquée plutôt que posée. */
    const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
    g.addColorStop(0, cssHex(P.top));
    g.addColorStop(0.76, cssHex(P.mid));
    g.addColorStop(1, cssHex(P.horizon));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, HORIZON);
    ctx.fillStyle = cssHex(P.top);
    ctx.fillRect(0, HORIZON, W, H - HORIZON);   // sous l'horizon : masqué par le lac

    const mx = W * 0.30, my = H * 0.19, mr = 30;
    if (night) {
      // Halo puis croissant de lune. Le croissant s'obtient en recouvrant le
      // disque d'un second disque décalé, peint dans la couleur du ciel.
      const halo = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 5);
      halo.addColorStop(0, "rgba(196,178,224,0.36)");
      halo.addColorStop(1, "rgba(196,178,224,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
      ctx.fillStyle = cssHex(CFG.SKY_MOON);
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = cssHex(P.mid);
      ctx.beginPath(); ctx.arc(mx + mr * 0.62, my - mr * 0.30, mr * 0.94, 0, Math.PI * 2); ctx.fill();
    } else {
      /* SOLEIL LEVANT, à l'opposé de la lune et BAS — son disque est aux trois
         quarts avalé par les pyramides, qui sont peintes après lui.

         C'est volontaire et c'est ce qui le distingue d'une lampe collée dans
         le ciel : sur la référence de Guillaume on ne voit aucun disque, on ne
         voit que le rose qu'il projette sur l'horizon. Un soleil entier et
         haut aurait dit « midi », pas « lever ». Son halo, lui, est énorme
         (neuf rayons) parce que c'est LUI qu'on voit, pas l'astre. */
      const sx = W * 0.72, sy = HORIZON - 16, sr = 26;
      const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 9);
      halo.addColorStop(0, "rgba(255,206,178,0.55)");
      halo.addColorStop(0.35, "rgba(233,150,152,0.28)");
      halo.addColorStop(1, "rgba(233,150,152,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(sx - sr * 9, sy - sr * 9, sr * 18, sr * 18);
      ctx.fillStyle = cssHex(CFG.SKY_DAY_SUN);
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    }

    // Nuages déchirés : des paquets d'ellipses, avec un liseré éclairé du côté
    // de la lune. Ils s'arrêtent avant l'horizon, que les crêtes occupent.
    const drawCloud = (cx, cy, scale, lit) => {
      const lobes = 5 + Math.floor(rnd() * 5);
      for (let i = 0; i < lobes; i++) {
        const ox = (rnd() - 0.5) * 130 * scale;
        const oy = (rnd() - 0.5) * 26 * scale;
        const rx = (26 + rnd() * 46) * scale;
        const ry = (8 + rnd() * 13) * scale;
        if (lit) {
          ctx.fillStyle = cssHex(P.cloudLit);
          ctx.globalAlpha = 0.5;
          ctx.beginPath(); ctx.ellipse(cx + ox, cy + oy - ry * 0.35, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = cssHex(P.cloud);
        ctx.globalAlpha = 0.62;
        ctx.beginPath(); ctx.ellipse(cx + ox, cy + oy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    /* Le côté ÉCLAIRÉ des nuages change d'astre : de nuit ils sont bordés du
       côté de la lune (à l'ouest), de jour du côté du soleil (à l'est). C'est
       le seul détail du dessin qui n'est pas identique entre les deux ciels,
       et il ne peut pas glisser — un nuage ne change pas de place, seul son
       liseré passe d'un bord à l'autre. */
    /* ⚠️⚠️ ZIP 408 — LES NUAGES SONT RETIRÉS, ET LE TIRAGE EST CONSERVÉ.
       Demande de Guillaume : « nuit d'encre et les nuages retirés ». Ils
       étaient la seule masse CLAIRE du ciel (0x241634 et 0x40305e sur un
       zénith à 0x070410) : sur une lanière visible où le relief n'occupe plus
       tout le cadre, ils redevenaient le sujet — et une nuit qui doit faire
       peur n'a pas de gros nuages pâles au-dessus de la tête.
       ⚠️ LA BOUCLE TOURNE QUAND MÊME, À VIDE, ET C'EST DÉLIBÉRÉ. Elle tire
       quatre nombres par nuage dans `rnd`, le flux PARTAGÉ du ciel : la
       supprimer décalerait tout ce qui vient après — donc les montagnes, donc
       le dessin entier. C'est la règle du 381 (« ne jamais ajouter un tirage
       dans un flux aléatoire partagé »), appliquée à l'envers : en RETIRER un
       est tout aussi grave. On garde donc les tirages et on ne dessine plus.
       SKY_CLOUD_COUNT à 0 les éteint ; le remettre à 26 les rend tels quels,
       à l'identique, sans un pixel de différence ailleurs. */
    const litX = night ? mx : W * 0.72;
    for (let c = 0; c < 26; c++) {
      const cx = rnd() * W;
      const cy = H * 0.06 + rnd() * (HORIZON - H * 0.14);
      const scale = 0.6 + rnd() * 1.1;
      const lit = Math.abs(cx - litX) < W * 0.22;
      if (c >= CFG.SKY_CLOUD_COUNT) continue;   // zip 408 : tirage gardé, dessin coupé
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

    /* ⚠️⚠️ ZIP 400 — LE « TRIANGLE ORANGE RETOURNÉ » N'ÉTAIT PAS UN PROBLÈME DE
       COULEUR, C'EST UN PROBLÈME D'ORDRE DE PEINTURE. Le 383 avait cherché du
       côté de la teinte et désaturé la bande ; ça a réduit le contraste et le
       défaut est resté, parce que la teinte n'y était pour rien.

       Retour de Guillaume au 400 : « au dessus des montagnes s'affichent des
       triangles retournés oranges (…) la teinte orange rougeâtre doit être
       ENTRE les montagnes, pas partir de leur cime ».

       LA GÉOMÉTRIE, mesurée et non supposée (voir tools/preview-sky.js, qui
       découpe la bande de dôme réellement à l'écran) :

         * le dôme fait 1024×512 et l'horizon peint est à la ligne 266 ;
         * la caméra est à 4,3 de haut, vise 1,5 à 9 devant — soit un tangage
           de -17,3° — avec un champ vertical de 72° ;
         * **le joueur ne voit donc JAMAIS que les lignes 203 à 266 du ciel.**
           Soixante-trois lignes sur cinq cent douze ;
         * or la chaîne LOINTAINE monte jusqu'à 132 px au-dessus de l'horizon,
           c'est-à-dire jusqu'à la ligne 132. **Ses sommets sont hors écran par
           le haut** : à l'image, on n'en voit que les VERSANTS, qui se
           croisent deux à deux et dessinent des V pointe en bas ;
         * et la bande chaude, peinte AVANT tout le relief, se voyait au
           travers de ces V. Un creux entre deux versants rempli de rouge, c'est
           un triangle retourné orange. Exactement ce que Guillaume décrit, et
           exactement là où il le décrit : à hauteur de la cime des montagnes
           proches.

       LA PARADE : la bande ne change pas de couleur, elle change de PLACE dans
       l'ordre de peinture. Elle passe APRÈS la chaîne lointaine et AVANT la
       proche. Conséquences, toutes voulues :

         * les V de la chaîne lointaine se remplissent désormais de CIEL, donc
           de violet froid : plus un seul triangle chaud ;
         * la chaleur ne se voit plus que dans les creux de la chaîne PROCHE,
           c'est-à-dire littéralement « entre les montagnes » ;
         * et elle lave le pied de la chaîne lointaine, ce qui donne la brume
           basse que le commentaire du 379 décrivait déjà sans jamais l'obtenir.

       ⚠️ ET SA HAUTEUR EST BORNÉE À LA CRÊTE PROCHE, PAS CHOISIE. La chaîne
       proche mesure 42 à 96 px pour une base à HORIZON+6 : sa crête la plus
       BASSE est donc à 36 px au-dessus de l'horizon. Une bande plus haute que
       36 dépasserait des cols les plus bas et on retrouverait des triangles,
       plus petits. On prend cette borne telle quelle plutôt qu'un nombre écrit
       à la main — si quelqu'un change les hauteurs de la chaîne proche demain,
       la bande suivra toute seule. */
    const gh = HORIZON - warmTop;      // = SKY_GLOW_H
    const glow = ctx.createLinearGradient(0, HORIZON - gh, 0, HORIZON);
    if (night) {
      /* ZIP 383 — LE « TRIANGLE RETOURNÉ ORANGE » ÉTAIT ICI, et il n'a jamais
         été un objet : c'était CETTE bande, vue par le creux en V entre deux
         pyramides voisines. Un rouge saturé à 0,55 d'alpha derrière une
         silhouette presque noire ne se lit pas comme un rougeoiement d'horizon
         mais comme une FORME — et la forme d'un creux entre deux pyramides est
         un triangle pointe en bas. Rien n'était à supprimer côté relief : il
         suffisait que la bande cesse d'être plus lumineuse que ce que la
         référence montre.

         Valeurs relevées sur l'image de Guillaume : le pixel le plus chaud de
         la zone vaut ~#4a3343, soit un mauve-rouge sombre et TRÈS désaturé, pas
         un rouge franc. La bande vise cette valeur une fois composée sur le
         ciel : la teinte rougeâtre reste (Guillaume l'a demandée), le triangle
         disparaît parce qu'il n'y a plus assez d'écart pour dessiner un bord. */
      glow.addColorStop(0, "rgba(74,34,48,0)");
      glow.addColorStop(0.55, "rgba(84,38,54,0.12)");
      glow.addColorStop(1, "rgba(58,26,42,0.18)");
    } else {
      glow.addColorStop(0, "rgba(191,130,153,0)");
      glow.addColorStop(0.5, "rgba(199,138,152,0.62)");
      glow.addColorStop(1, "rgba(224,164,160,0.92)");
    }
    /* ⚠️ LA BANDE N'EST PAS PEINTE ICI. Voir le bloc ci-dessus : elle attend
       que la chaîne lointaine soit posée. Le dégradé est seulement PRÉPARÉ à
       cet endroit parce que c'est là que vivent les deux palettes, et qu'un
       dégradé décrit à côté des couleurs qu'il emploie est un dégradé qu'on
       relit. */

    const range = (color, minH, maxH, minW, maxW, jitterY) => {
      ctx.fillStyle = color;
      let x = -60;
      while (x < W + 60) {
        const bw = minW + rnd() * (maxW - minW);
        const h = minH + rnd() * (maxH - minH);
        const baseY = HORIZON + jitterY;
        // Une pyramide : deux versants droits et un sommet légèrement
        // décentré. Le décentrage suffit à ce qu'aucune ne soit identique.
        const apex = x + bw * (0.38 + rnd() * 0.24);
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.lineTo(apex, baseY - h);
        ctx.lineTo(x + bw, baseY);
        ctx.closePath();
        ctx.fill();
        x += bw * (0.52 + rnd() * 0.3);   // elles se chevauchent
      }
    };

    /* Les deux plans gardent EXACTEMENT les mêmes hauteurs, largeurs et
       chevauchements dans les deux ciels — seule la couleur change. C'est ce
       que la graine partagée garantit, et c'est ce qui fait que le fondu se lit
       comme un éclairage qui change et non comme un décor qu'on remplace. */
    // Plan LOINTAIN : plus haut, délavé par la brume.
    // (zip 383 : le plan lointain de nuit suit l'assombrissement du ciel. Le
    // laisser à son violet d'avant l'aurait fait ressortir COMME un objet
    // éclairé au-dessus d'un ciel devenu noir — l'inverse d'un lointain.)
    /* ⚠️⚠️ ZIP 408 — LA CHAÎNE LOINTAINE EST RABAISSÉE AVEC LE CIEL, SINON ELLE
       DEVIENT L'OBJET LE PLUS CLAIR DE L'IMAGE. Sur un zénith à 0x070410, le
       violet du 379 (38,26,58 à 0,72) composait à ~(31,21,45) : plus clair que
       le ciel, donc des triangles PÂLES sur du noir. C'est très exactement le
       mot que Guillaume employait aux 383, 400 et 405 — « les triangles
       lumineux » — et on le retrouvait par l'autre bout en noircissant le
       fond. Une teinte n'est jamais claire ou sombre en soi : elle l'est par
       rapport à ce qu'il y a derrière. En noircissant un ciel, il faut
       noircir ce qui s'y découpe, ou l'inverser. */
    range(night ? "rgba(24,17,38,0.62)" : "rgba(80,79,117,0.78)",
          CFG.SKY_FAR_H_MIN, CFG.SKY_FAR_H_MAX, CFG.SKY_FAR_W_MIN, CFG.SKY_FAR_W_MAX, -2);

    /* ⚠️⚠️ ICI, ET PAS AVANT — c'est tout le correctif du zip 400.
       Entre les deux chaînes : elle lave le pied du lointain, et elle ne se
       verra plus que dans les cols du plan proche, qui est peint juste après. */
    ctx.fillStyle = glow;
    ctx.fillRect(0, HORIZON - gh, W, gh);

    // Plan PROCHE : plus bas, presque noir de nuit ; de jour il prend enfin
    // une couleur, parce qu'un relief qui reste en silhouette sous un ciel
    // clair se lit comme un trou découpé dans l'image.
    range(cssHex(night ? CFG.SKY_PEAKS : CFG.SKY_DAY_PEAKS),
          CFG.SKY_NEAR_H_MIN, CFG.SKY_NEAR_H_MAX,
          CFG.SKY_NEAR_W_MIN, CFG.SKY_NEAR_W_MAX, NEAR_BASE_DY);

    // Base commune : elle ferme le bas et garantit qu'aucun trou ne laisse
    // voir le dégradé du ciel sous les montagnes.
    ctx.fillStyle = cssHex(night ? CFG.SKY_PEAKS : CFG.SKY_DAY_PEAKS);
    ctx.fillRect(0, EDGE_Y + 10, W, H - EDGE_Y - 10);

    return cv;
  }

  /* Les deux palettes, côte à côte pour qu'on voie d'un coup d'œil ce qui
     change d'un ciel à l'autre. Les valeurs de jour sont relevées AU PIXEL sur
     l'image de référence de Guillaume (voir config.js). */
  const SKY_NIGHT_PAL = {
    top: CFG.SKY_TOP, mid: CFG.SKY_MID, horizon: CFG.SKY_HORIZON,
    cloud: CFG.SKY_CLOUD, cloudLit: CFG.SKY_CLOUD_LIT,
  };
  const SKY_DAY_PAL = {
    top: CFG.SKY_DAY_TOP, mid: CFG.SKY_DAY_MID, horizon: CFG.SKY_DAY_HORIZON,
    cloud: CFG.SKY_DAY_CLOUD, cloudLit: CFG.SKY_DAY_CLOUD_LIT,
  };

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

  /* ⚠️ ZIP 400 — LA PLUIE, PEINTE AU fillRect ET RIEN D'AUTRE.
     Une traînée est une colonne de petits rectangles décalés d'un pixel tous
     les quatre : c'est ce qui lui donne son inclinaison, en escalier, sans un
     seul tracé vectoriel. La contrainte n'est pas décorative — c'est la
     signature pixel-art du site, et c'est aussi ce qui permet aux rasteriseurs
     maison de la rendre (ils ne connaissent que fillRect en toute rigueur).

     La texture est TRANSPARENTE hors des traînées, et elle se répète : trois
     nappes la partagent, avec trois répétitions et trois vitesses. */
  function paintRain() {
    const W = 128, H = 256;
    const cv = makeCanvas(W, H);
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    const rnd = Track.makeRng(0x7A1DEE);
    /* ⚠️⚠️ ZIP 407 — LES TRAÎNÉES SONT VERTICALES, ET PLUS LONGUES.
       -----------------------------------------------------------------------
       VERTICALES : l'ancienne version décalait la traînée d'un pixel tous les
       quatre (`x0 + ((k / 4) | 0)`), ce qui la couchait à ~14°. Cette
       obliquité était peinte dans la TEXTURE, et la nappe faisait face à la
       caméra : elle était donc fixe à L'ÉCRAN, et le vent tournait avec le
       joueur. Guillaume, au 406 : « lorsqu'on tourne, les gouttes tombent
       toujours direction NO-SE ». Il a tranché : pas de vent. Une traînée
       parfaitement verticale n'évoque aucune direction, donc n'en contredit
       aucune.

       PLUS LONGUES, ET C'EST LA CONTREPARTIE DU CRACHIN. Guillaume demande
       « un crachin, mais la vitesse de chute des gouttes doit être bien plus
       rapide » — réponse hors options, et meilleure que les trois proposées.
       Une goutte pâle et LENTE se lit comme du bruit d'image ; une goutte pâle
       et RAPIDE se lit comme de la pluie. Or ce qui dit la vitesse à l'œil,
       c'est le FILÉ : une goutte rapide laisse une trace longue. On allonge
       donc les traînées dans la même proportion qu'on accélère la chute, et on
       les affine (une seule fois sur huit à deux pixels au lieu d'une sur
       quatre) pour que l'ensemble reste léger.

       ⚠️ MOINS DE TRAÎNÉES, AUSSI : 34 au lieu de 46. À 0,18 d'opacité et avec
       des filés deux fois plus longs, la surface couverte augmenterait sans ça
       — et un crachin dont on a seulement baissé l'opacité reste un voile. */
    for (let i = 0; i < 34; i++) {
      const x0 = Math.floor(rnd() * W);
      const y0 = Math.floor(rnd() * H);
      const len = 34 + Math.floor(rnd() * 58);
      const thick = rnd() < 0.12 ? 2 : 1;
      /* Les gouttes ne sont pas toutes également claires : sans cet écart, une
         nappe unique se lit comme une grille et non comme de la pluie. */
      const a = 0.18 + rnd() * 0.40;
      for (let k = 0; k < len; k++) {
        // ⚠️ On reboucle en Y à la main : une traînée coupée par le bord du
        // canvas ferait une couture horizontale visible à chaque répétition.
        const y = (y0 + k) % H;
        ctx.globalAlpha = a * (1 - k / len) * 0.9 + a * 0.1;
        ctx.fillStyle = "#cfd6ff";
        ctx.fillRect(x0, y, thick, 1);
      }
    }
    ctx.globalAlpha = 1;
    return cv;
  }

  /* Trois nappes devant l'œil, à trois profondeurs. Elles sont reposées à
     chaque image devant la caméra : ce sont des objets PERMANENTS, donc hors
     du budget par tronçon, et elles ne suivent aucun tronçon. */
  /* ⚠️⚠️ ZIP 407 — LA TAILLE D'UNE NAPPE SE CALCULE, ELLE NE SE CHOISIT PAS.
     -------------------------------------------------------------------------
     Reproche de Guillaume : « son étendue ne couvre pas tout l'écran ». Il a
     raison, et le chiffre est net : les trois nappes étaient posées à
     `camera.y + 1,6` avec des tailles écrites à la main (22×15, 40×24,
     66×38). Or la caméra REGARDE VERS LE BAS de 17,3°, avec un demi-champ
     vertical de 36° : le bord bas de l'écran est donc à −53,3° sous
     l'horizontale, quand une nappe posée 1,6 au-dessus de la caméra ne
     descend qu'à −47°. **Il manquait 6,3° de pluie en bas pour la nappe
     proche, 12,4° pour la médiane, 14,9° pour la lointaine** — tout le quart
     bas de l'image, celui où se trouve la chaussée, c'est-à-dire celui qu'on
     regarde en courant.

     La règle qui remplace les six nombres : à la distance horizontale d, le
     tronc de vue occupe en hauteur de `d·tan(tangage − demi-champ)` à
     `d·tan(tangage + demi-champ)` autour de la caméra. On dimensionne et on
     centre là-dessus, avec RAIN_COVER_MARGIN de rab. Le jour où quelqu'un
     touche au tangage ou au champ, les nappes suivent toutes seules.

     ⚠️ ET LA NAPPE EST DÉSORMAIS D'APLOMB. Elle basculait vers la caméra
     (`lookAt`), donc sa verticale suivait le TANGAGE : « la pluie tombe
     droit » aurait voulu dire « droit à l'écran », c'est-à-dire 17,3° de
     travers par rapport aux murs et à la chaussée. Elle ne pivote plus qu'en
     LACET. Voir tickRain. */
  function rainLayerSize(d) {
    const pitch = Math.atan2(CFG.CAM_LOOK_HEIGHT - CFG.CAM_HEIGHT, CFG.CAM_LOOK_AHEAD);
    const halfV = CFG.CAM_FOV / 2 * Math.PI / 180;
    // 16/9 est le format de référence ; RAIN_COVER_MARGIN paie les écrans plus larges.
    const halfH = Math.atan(Math.tan(halfV) * (16 / 9));
    const yTop = d * Math.tan(pitch + halfV);
    const yBot = d * Math.tan(pitch - halfV);
    const h = (yTop - yBot) * CFG.RAIN_COVER_MARGIN;
    const w = 2 * d * Math.tan(halfH) * CFG.RAIN_COVER_MARGIN;
    // `yc` est la hauteur du CENTRE du tronc de vue à cette distance, relative
    // à la caméra : c'est là qu'il faut centrer la nappe, et nulle part ailleurs.
    return { w, h, yc: (yTop + yBot) / 2 };
  }

  function buildRain() {
    const texR = pixelTexture(paintRain(), 1, 1);
    /* La répétition suit la TAILLE : une tuile de pluie fait RAIN_TILE unités
       de côté quelle que soit la nappe, sinon les gouttes de la nappe
       lointaine seraient dessinées trois fois plus grosses que celles de la
       proche — l'inverse de la perspective. */
    const TILE = CFG.RAIN_TILE;
    const layers = CFG.RAIN_LAYER_D.map((d, i) => {
      const s = rainLayerSize(d);
      return { d, w: s.w, h: s.h, yc: s.yc,
               rx: s.w / TILE, ry: s.h / TILE, op: CFG.RAIN_LAYER_OP[i] };
    });
    for (const L of layers) {
      /* Une texture CLONÉE par nappe : l'image est partagée (une seule montée
         sur le GPU), seuls la répétition et le défilement diffèrent. Même
         motif que la pierre du labyrinthe au 397. */
      const t = texR.clone();
      t.needsUpdate = true;
      t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(L.rx, L.ry);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(L.w, L.h),
        new THREE.MeshBasicMaterial({
          map: t, transparent: true, opacity: 0, depthWrite: false,
          fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      m.renderOrder = 40;          // après le décor, avant le HUD
      m.userData.L = L;
      scene.add(m);
      rainLayers.push(m);
    }
  }

  /* L'INTENSITÉ DE L'ORAGE EN FONCTION DE LA DISTANCE — une seule fonction,
     lue par le rendu et par tools/verify-rain.mjs (zip 406).
     -----------------------------------------------------------------------
     Quatre bornes, trois pentes : rien avant START, montée jusqu'à RAMP,
     plein régime jusqu'à HOLD, extinction jusqu'à END, plus rien après.
     ⚠️ ELLE EST EXPORTÉE. Écrire la courbe ici et la redécrire dans le
     contrôle, c'est deux descriptions d'une même chose (387) — et sur une
     courbe, elles divergent au premier réglage. */
  function rainLevel(dist) {
    if (dist <= CFG.RAIN_START_DIST) return 0;
    if (dist >= CFG.RAIN_END_DIST) return 0;
    if (dist < CFG.RAIN_RAMP_DIST)
      return (dist - CFG.RAIN_START_DIST) /
             Math.max(1, CFG.RAIN_RAMP_DIST - CFG.RAIN_START_DIST);
    if (dist <= CFG.RAIN_HOLD_DIST) return 1;
    return 1 - (dist - CFG.RAIN_HOLD_DIST) /
               Math.max(1, CFG.RAIN_END_DIST - CFG.RAIN_HOLD_DIST);
  }

  /* Elle monte avec les mètres, elle ne commence pas au premier pas — un
     joueur qui démarre sous l'averse n'a aucun moyen de savoir qu'elle
     s'intensifie — et depuis le 406 elle FINIT. */
  function tickRain(now, dist) {
    if (!rainLayers.length || CFG.RAIN_MAX <= 0) return;
    const k = rainLevel(dist);
    const yaw = camera.rotation.y;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    for (const m of rainLayers) {
      const L = m.userData.L;
      m.material.opacity = CFG.RAIN_MAX * L.op * k;
      m.visible = m.material.opacity > 0.004;
      if (!m.visible) continue;
      /* ⚠️ ZIP 407 — CENTRÉE SUR LE TRONC DE VUE, ET D'APLOMB.
         `camera.position.y + 1.6` était une hauteur au jugé : elle plaçait le
         centre de la nappe à 33° AU-DESSUS du centre de l'écran, si bien que
         le bas de l'image n'avait pas de pluie. `L.yc` est la hauteur du
         centre du tronc de vue à cette distance — calculée, pas choisie.
         Et `lookAt` a disparu : il inclinait la nappe vers la caméra, donc
         faisait tomber les gouttes le long de l'axe de VUE (17,3° de travers)
         au lieu de la verticale du MONDE. La nappe ne pivote plus qu'en
         LACET, elle reste debout, et « la pluie tombe droit » veut enfin dire
         ce que ça dit. */
      m.position.set(camera.position.x + fx * L.d,
                     camera.position.y + L.yc,
                     camera.position.z + fz * L.d);
      m.rotation.set(0, yaw, 0);
      /* ⚠️⚠️ ZIP 407 — LE DÉFILEMENT EST UNE VITESSE, ET LA DÉRIVE LATÉRALE A
         DISPARU.
         Une tuile de pluie fait TILE unités de haut dans le monde ; avancer
         `offset.y` d'une unité fait défiler une tuile. Pour tomber à
         RAIN_SPEED unités par seconde, il faut donc avancer de
         RAIN_SPEED / TILE par seconde — la même valeur pour les trois nappes,
         puisqu'elles ont toutes des tuiles de même taille. La parallaxe naît
         de la perspective et non d'un coefficient par couche : c'est ce que
         faisait l'ancien facteur `sp`, à la main et sans rapport avec la
         distance réelle.
         Et la dérive en X est retirée : c'était elle, le « vent » dont
         Guillaume dit que la direction est incohérente quand on tourne. Sans
         vent, il n'y a plus de direction à contredire.
         ⚠️ ZIP 406 — LE SIGNE ÉTAIT INVERSÉ, ET LA PLUIE MONTAIT.
         Guillaume : « la pluie tombe à l'envers (bas vers le haut) ». Le
         raisonnement, pour qu'on n'ait plus jamais à le refaire : le shader
         échantillonne `uv + offset`. Quand `offset.y` AUGMENTE, un même point
         de l'écran va lire un texel plus haut dans l'image — donc le motif
         DESCEND à l'écran. Sur un PlaneGeometry, v croît vers le haut, et une
         CanvasTexture a flipY à vrai : les deux inversions se compensent, et
         la règle tient en une phrase — **offset.y qui monte = la pluie qui
         tombe.** Le moins de trop faisait exactement le contraire.
         C'est un défaut qu'on ne voit pas en relisant (la ligne est
         parfaitement bien écrite) et qu'on ne voit pas non plus sur une image
         fixe : il faut regarder bouger. */
      m.material.map.offset.y = (now * 0.001 * (CFG.RAIN_SPEED / CFG.RAIN_TILE)) % 1;
      m.material.map.offset.x = 0;      // plus de vent : plus de dérive
    }
  }

  function buildSky() {
    const geoSky = new THREE.SphereGeometry(CFG.DRAW_DISTANCE * 0.9, 24, 14);
    // La texture est retenue dans `mat` pour que tools/render-textures.js
    // puisse la regarder : c'est le seul dessin du jeu qu'on ne voit jamais
    // de près, et c'est aussi le plus grand.
    mat.skyTex = pixelTexture(paintSky(SKY_NIGHT_PAL, true));
    skyMat = new THREE.MeshBasicMaterial({
      map: mat.skyTex, side: THREE.BackSide, fog: false, depthWrite: false,
    });
    sky = new THREE.Mesh(geoSky, skyMat);
    sky.renderOrder = -10;   // toujours dessiné en premier, jamais devant le décor
    scene.add(sky);

    /* ZIP 382 — SECOND DÔME, celui du jour, en fondu par-dessus le premier.

       C'est UN objet permanent de plus sur 83, et zéro coût par tronçon : le
       plafond de 200 objets / 100 unités, qui est le vrai budget de ce jeu, ne
       le voit même pas. À comparer avec l'alternative — repeindre la texture
       du ciel pendant la course — qui coûterait un canvas de 1024×512 plus un
       téléversement GPU à chaque palier, en pleine course, sur mobile.

       `renderOrder` : -10 pour la nuit, -9,5 pour le jour, et le décor ensuite.
       Le ciel de jour doit passer APRÈS celui de nuit pour se fondre dessus, et
       AVANT tout le reste pour ne jamais recouvrir un obstacle. Ni l'un ni
       l'autre n'écrit dans le tampon de profondeur, donc l'ordre de dessin est
       la seule chose qui les départage. */
    mat.skyDayTex = pixelTexture(paintSky(SKY_DAY_PAL, false));
    skyDayMat = new THREE.MeshBasicMaterial({
      map: mat.skyDayTex, side: THREE.BackSide, fog: false,
      transparent: true, opacity: 0, depthWrite: false,
    });
    skyDay = new THREE.Mesh(geoSky, skyDayMat);
    skyDay.renderOrder = -9.5;
    scene.add(skyDay);

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
  /* ZIP 382 — les deux couleurs sont des ARGUMENTS. Le lac de jour est la même
     houle exactement, avec le creux et la crête relevés sur la référence
     (`COL_DAY_LAKE` / `COL_DAY_LAKE_GLOW`).

     Pourquoi une seconde texture plutôt qu'une teinte sur la première : le
     matériau du lac est un `MeshBasicMaterial`, dont la couleur MULTIPLIE la
     texture. Or il faut passer de 0x2a1052 à 0x443957 pour le creux et de
     0x7b3fd8 à 0x816aa6 pour la crête — deux transformations différentes, que
     AUCUN multiplicateur unique ne réalise. J'ai essayé : le facteur qui
     redresse le creux (×3,6 sur le vert) transforme les crêtes en turquoise
     fluo. Une eau qui vire au cyan à l'aube, ce n'est pas un compromis, c'est
     un bug avec une bonne excuse. */
  function paintLakeWaves(seedPhase, deepCol, crestCol) {
    const S = 128;
    const cv = makeCanvas(S, S);
    const ctx = cv.getContext("2d");
    ctx.fillStyle = cssHex(deepCol);
    ctx.fillRect(0, 0, S, S);
    const img = ctx.getImageData(0, 0, S, S);
    const d = img.data;
    const gr = (crestCol >> 16) & 255;
    const gg = (crestCol >> 8) & 255;
    const gb = crestCol & 255;
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
      map: pixelTexture(paintLakeWaves(0, CFG.COL_LAKE, CFG.COL_LAKE_GLOW),
                        size / lakeUnitsPerTile, size / lakeUnitsPerTile), fog: true,
    });
    lake = new THREE.Mesh(geo.plane, lakeMat);
    lake.scale.set(size, size, 1);
    lake.rotation.x = -Math.PI / 2;
    lake.position.y = CFG.LAKE_Y;
    lake.renderOrder = -5;
    scene.add(lake);

    /* Le lac de jour : MÊME phase de houle (0), donc EXACTEMENT les mêmes
       vagues aux mêmes endroits, et il défile plus bas avec le même décalage
       de texture. Fondu par opacité par-dessus le lac de nuit.

       Une phase différente aurait donné deux houles superposées pendant les
       3 000 mètres du lever, c'est-à-dire une mer croisée qui n'existe ni de
       jour ni de nuit — le même piège que les montagnes du ciel, et la même
       parade : ce qui se fond doit être le même dessin. */
    lakeDayMat = new THREE.MeshBasicMaterial({
      map: pixelTexture(paintLakeWaves(0, CFG.COL_DAY_LAKE, CFG.COL_DAY_LAKE_GLOW),
                        size / lakeUnitsPerTile, size / lakeUnitsPerTile), fog: true,
      transparent: true, opacity: 0, depthWrite: false,
    });
    lakeDay = new THREE.Mesh(geo.plane, lakeDayMat);
    lakeDay.scale.set(size, size, 1);
    lakeDay.rotation.x = -Math.PI / 2;
    lakeDay.position.y = CFG.LAKE_Y + 0.02;
    lakeDay.renderOrder = -4.5;
    scene.add(lakeDay);

    lakeGlowMat = new THREE.MeshBasicMaterial({
      map: pixelTexture(paintLakeWaves(2.1, CFG.COL_LAKE, CFG.COL_LAKE_GLOW),
                        size / glowUnitsPerTile, size / glowUnitsPerTile),
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
  /* ======================================= CYCLE JOUR / NUIT (zip 382) ======
     `dayAt(dist)` : 0 = nuit franche, 1 = plein jour. Continue, dérivable à
     l'œil, et c'est la SEULE chose que le reste du moteur consulte — ciel, lac,
     brume, brouillard, lumières et orage en sont tous dérivés. Aucun d'eux ne
     connaît une distance ; aucun ne peut donc se désynchroniser d'un autre.

     Découpage : voir le schéma de CFG (§ CYCLE JOUR / NUIT).

     LE POINT DÉLICAT est le raccord entre l'amorce, qui n'existe que dans le
     premier cycle, et le cycle lui-même. À 15 000 m pile, l'amorce vaut 0,12 et
     le cycle vaut 0 : les brancher bout à bout ferait chuter le ciel de 12 % en
     une image, juste au moment où le joueur regarde le lever de soleil.

     La parade est de ne PAS les mettre bout à bout mais de les SUPERPOSER, avec
     une amorce qui s'efface exactement à la vitesse où le lever monte. La
     composition `d + (1-d)*pre` a deux propriétés qui font tout le travail :
     elle ne peut jamais dépasser 1, et elle vaut `pre` quand d vaut 0. Le
     raccord est alors continu aux deux bouts, par construction et non par
     réglage. */
  function smooth01(x) {
    const k = Math.max(0, Math.min(1, x));
    return k * k * (3 - 2 * k);
  }

  function dayAt(dist) {
    const d0 = CFG.DAY_RISE_AT;

    // Cycle proprement dit. Il n'existe qu'à partir du premier lever : avant,
    // le modulo ramènerait la course dans le « plein jour » d'un cycle
    // imaginaire qui l'aurait précédée, et le jeu s'ouvrirait en plein soleil.
    let d = 0;
    if (dist >= d0) {
      const u = (dist - d0) % CFG.DAY_CYCLE;
      const rise = CFG.DAY_RISE_LEN;
      const full = rise + CFG.DAY_FULL_LEN;
      const fall = full + CFG.DAY_FALL_LEN;
      if (u < rise)      d = smooth01(u / rise);
      else if (u < full) d = 1;
      else if (u < fall) d = smooth01(1 - (u - full) / CFG.DAY_FALL_LEN);
      else               d = 0;
    }

    /* AMORCE, premier cycle seulement. Elle monte de 6 000 à 15 000 m, puis
       s'efface sur toute la durée du lever. Un joueur qui meurt à 12 000 m aura
       vu le ciel pâlir sans savoir pourquoi — c'est précisément ce qu'on veut :
       la promesse d'un lever qu'il n'a pas atteint. */
    if (dist < d0 + CFG.DAY_RISE_LEN) {
      const p = smooth01((dist - CFG.DAY_PREDAWN_AT) / (d0 - CFG.DAY_PREDAWN_AT));
      const fade = Math.max(0, Math.min(1, 1 - (dist - d0) / CFG.DAY_RISE_LEN));
      const pre = CFG.DAY_PREDAWN_LEVEL * p * fade;
      d = d + (1 - d) * pre;
    }
    return d;
  }

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
      /* ZIP 379b — PAS DE FISSURES SUR LA CHAUSSÉE ENTRETENUE.
         Second grief de Guillaume : « il y a de nouveaux obstacles à travers
         lesquels on peut passer au tout début ». Ce ne sont pas des obstacles :
         ce sont les entailles DÉCORATIVES du zip 374, qui n'ont jamais rien
         bloqué. Mais elles étaient dessinées pour une dalle sombre et usée ;
         posées sur la pierre claire et nette de la nouvelle section d'entrée,
         elles ressortent comme des trous béants — et le joueur essaie de les
         éviter, puis les traverse.

         Le décor mentait donc sur ce qu'il annonçait, ce qui est plus grave
         qu'un décor laid. On les fait apparaître AVEC l'usure : quasi aucune
         sur l'ouvrage entretenu, toutes une fois sur AA. Le tirage est continu,
         donc il n'y a pas de ligne où elles surgissent. */
      if (rng() > 0.12 + 0.88 * stageAt(node, k.t)) continue;
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
      // zip 406 : le compteur d'intervalles, lu par la fusion des blocs neufs,
      // et le flux aléatoire PROPRE aux pierres saillantes (règle du 381).
      let kerbIdx = 0;
      const rngAsp = Track.makeRng(node.index * 7717 + 29 + (side > 0 ? 3 : 0));
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
           Deux fois le même mesh, deux lectures opposées.

           ⚠️⚠️ ZIP 406 — SUR L'OUVRAGE NEUF, UN BLOC COUVRE DEUX INTERVALLES,
           ET C'EST CE QUI FINANCE LES ASPÉRITÉS.
           ------------------------------------------------------------------
           tools/smoke-render.js a refusé la première version : 255 objets par
           100 u de chaussée de pierre pour un plafond de 200. Le contrôle avait
           RAISON, et son commentaire dit pourquoi mieux que moi — la section
           d'entrée « doit tenir dans le MÊME plafond que les autres, sans quoi
           les images par seconde tomberaient pile sur les premières secondes de
           course ». C'est-à-dire précisément là où Guillaume regarde la
           rambarde. Relâcher le plafond aurait été rendre le contrôle muet
           (leçon du 404) ; on change donc la CHOSE.

           Mesuré : la chaussée de pierre était déjà à 195 sur 200 avant ce zip.
           Il n'y avait pas cinq objets de marge, il fallait en LIBÉRER. Or
           quand la rambarde est neuve elle est CONTINUE : deux blocs voisins se
           touchent bout à bout et rien, à l'écran, ne distingue un bloc de 17,6
           unités de deux blocs de 8,8 accolés. On en pose donc un sur deux, deux
           fois plus long — zéro différence visible, la moitié des volumes — et
           on dépense ce qu'on vient d'économiser en pierres qui dépassent.
           À l'arrivée : même budget qu'avant le zip, une silhouette qui n'est
           plus une boîte.

           ⚠️ ET SEULEMENT SUR L'OUVRAGE NEUF. Passé le fondu, les blocs sont
           ISOLÉS : en fusionner deux ferait un trou d'un intervalle entier dans
           une bordure déjà trouée. Le seuil est bas (s < 0,35) pour que la
           fusion cesse bien avant que les vides n'apparaissent. */
        const mergeN = s < 0.35 ? CFG.RAIL_MERGE : 1;
        if (mergeN > 1 && (kerbIdx % mergeN)) { kerbIdx++; continue; }
        kerbIdx++;
        const len = (CFG.KERB_SPACING * mergeN + 0.6) * (1 - s)
                  + (2.0 + rng() * 1.4) * s;
        const bw0 = 1.5 - 0.2 * s;
        const b = box(bw0, h, len, s > 0.5 ? mat.kerb : mat.rail, 0, 0, 0);
        b.rotation.y = (rng() - 0.5) * 0.12 * s;   // l'ouvrage se désaligne en se ruinant
        place(b, t + jitter, off, h / 2 - 0.25);

        /* ⚠️⚠️ ZIP 406 — LES PIERRES QUI DÉPASSENT, ET C'EST LE VRAI CORRECTIF.
           ------------------------------------------------------------------
           Guillaume : « trop plates, pas d'aspérités, on dirait des boîtes en
           bois plus que des empilements de pierres ». Les deux premiers mots
           décrivent une SILHOUETTE, pas une peinture — et la silhouette d'une
           rambarde, c'était une seule boîte, donc une arête parfaitement
           droite sur toute la longueur du tronçon. Aucune texture n'y peut
           quoi que ce soit : un contour droit reste un contour droit, et un
           volume long, droit et lisse, l'œil le lit comme une planche.

           Deux familles de saillies, et il faut LES DEUX :

             * LE COURONNEMENT DENTELÉ. Deux à quatre pierres posées sur le
               dessus, à des hauteurs différentes, avec des vides entre elles.
               C'est ce qui casse la ligne du HAUT — celle qu'on suit du regard
               en courant, et donc celle qui trahissait la boîte ;
             * LES PIERRES DÉBOÎTÉES. Une ou deux qui sortent du parement, du
               côté de la piste, à mi-hauteur. C'est ce qui donne l'épaisseur
               et dit qu'il y a plusieurs pierres et non un bloc.

           ⚠️ ELLES SUIVENT L'USURE À L'ENVERS DU RESTE, ET C'EST VOULU. Tout
           le reste de la rambarde se DÉGRADE quand s monte (elle s'affaisse,
           se troue, se désaligne) ; les saillies, elles, se raréfient — parce
           qu'en fin de fondu il ne reste plus une rambarde mais des blocs
           isolés dans l'herbe, et poser un couronnement sur une ruine
           reviendrait à soigner ce qui est censé être abandonné. Le facteur
           (1 - s) fait exactement ça, et il finance aussi le budget : les
           saillies n'existent QUE sur la section d'entrée, la seule que
           Guillaume regarde en démarrant.

           ⚠️ AUCUNE COLLISION. Ces pierres sont posées dans le groupe du
           décor, comme les fissures et le lierre. La rambarde n'a jamais eu de
           collision — le joueur ne dépasse pas ±3,9 et elle est à ±4,95 — et
           en donner une à des cailloux de 30 cm serait le meilleur moyen de
           tuer quelqu'un pour un détail décoratif. */
        /* ⚠️⚠️ UN FLUX ALÉATOIRE À ELLES, ET C'EST LA RÈGLE DU 381 : « ne
           jamais ajouter un tirage dans un flux aléatoire partagé ». Les
           saillies tirent une demi-douzaine de nombres par bloc ; les prendre
           dans `rng` aurait décalé TOUT ce qui suit dans le tronçon — quelles
           bordures deviennent des stèles, où tombent les fissures, quelles
           torches s'allument. Je l'ai fait dans la première version, et le
           budget mesuré est passé de 200 à 209 objets sans qu'une seule
           saillie ait été ajoutée : ce n'était pas le coût des cailloux, c'était
           le décor entier qui avait changé de tirage. Un flux séparé rend les
           mesures comparables ET garantit qu'on peut régler RAIL_ASPERITY sans
           redessiner la piste. */
        const asp = Math.round(CFG.RAIL_ASPERITY * (1 - s));
        for (let a = 0; a < asp; a++) {
          const top = rngAsp() < 0.62;
          if (top) {
            // couronnement : une pierre sur le dessus, jamais centrée
            const sw = bw0 * (0.5 + rngAsp() * 0.45);
            const sh = 0.14 + rngAsp() * 0.22;
            const sl = 0.5 + rngAsp() * Math.min(1.3, len * 0.5);
            const st2 = box(sw, sh, sl, s > 0.5 ? mat.kerb : mat.rail, 0, 0, 0);
            st2.rotation.y = (rngAsp() - 0.5) * 0.30;
            place(st2, t + jitter + (rngAsp() - 0.5) * (len - sl),
                  off + (rngAsp() - 0.5) * (bw0 - sw), h - 0.25 + sh / 2 - 0.02);
          } else {
            // pierre déboîtée : elle sort du parement, côté piste
            const sw = 0.22 + rngAsp() * 0.20;
            const sh = 0.20 + rngAsp() * 0.26;
            const sl = 0.45 + rngAsp() * 0.7;
            const st2 = box(sw, sh, sl, s > 0.5 ? mat.kerb : mat.rail, 0, 0, 0);
            st2.rotation.y = (rngAsp() - 0.5) * 0.22;
            place(st2, t + jitter + (rngAsp() - 0.5) * (len - sl),
                  off - side * (bw0 / 2 + sw * 0.35),
                  -0.25 + h * (0.28 + rngAsp() * 0.5));
          }
        }

        /* ZIP 381 — LA PIERRE DE COURONNEMENT EST RETIRÉE.

           C'était une tablette de 1,9 de large et jusqu'à 9 de long posée sur
           chaque bloc de bordure, des deux côtés, sur toute la piste. Elle
           était censée faire « ouvrage taillé » ; à l'écran, Guillaume n'y a
           vu que « des planches latérales qui n'ont aucune utilité apparente,
           pas de collision et moche ».

           Il a raison sur le fond, et la raison est géométrique : les dalles
           sont à ±4,95, le joueur ne dépasse jamais 3,9. Elles étaient donc
           les seuls objets longs et plats du cadre à hauteur de hanche, assez
           gros pour se lire comme franchissables, et strictement inatteignables.
           Un décor qui promet une interaction impossible coûte plus cher qu'il
           ne rapporte, quelle que soit sa texture.

           On ne la déplace pas vers l'intérieur — elle deviendrait un obstacle
           inconnu du générateur, donc plaçable juste après un autre, donc
           injuste. Le bois franchissable réapparaît là où il est légitime :
           dans la roue des obstacles, sous forme de planche tombée en travers
           (section 10). `mat.railCap` reste utilisé par le pilier des torches. */

        if (rngAsp() < CFG.VINE_CHANCE) {
          const vl = 0.5 + rngAsp() * 1.1;
          const v = box(0.1, vl, 0.1, mat.vine, 0, 0, 0);
          v.rotation.z = (rngAsp() - 0.5) * 0.35;
          place(v, t + jitter + (rngAsp() - 0.5) * len * 0.6, off + side * 0.7, h - 0.25 - vl / 2);
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
          /* Zip 380 : le pied descend SOUS la surface du lac. Il en émergeait
             d'un bon mètre, et Guillaume l'a vu tout de suite — contreforts et
             racines à l'air libre, ce qui contredit l'idée même d'arbre
             submergé. Dérivé de CFG.LAKE_Y et non écrit en dur : si le niveau
             du lac bouge, les arbres suivent. */
          // Enfoncé de 15 % de sa hauteur : c'est exactement la part du dessin
          // qu'occupent les contreforts et les racines. Proportionnel, et non
          // fixe, sinon un grand arbre garderait ses racines à l'air et un
          // petit disparaîtrait à mi-tronc.
          place(m, t, off, h / 2 + CFG.LAKE_Y - h * 0.15);
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
          place(trunk, t, off, h / 2 + CFG.LAKE_Y - h * 0.15);   // pied noyé (zip 380)
          const nb = CFG.TREE_BRANCHES + Math.floor(rng() * 2);
          for (let b = 0; b < nb; b++) {
            const bl = 1.4 + rng() * 2.2;
            const bm = box(0.16, bl, 0.16, mat.barkDark, 0, 0, 0);
            bm.rotation.set((rng() - 0.5) * 1.6, rng() * 6.28, (rng() - 0.5) * 1.9);
            place(bm, t + (rng() - 0.5) * 0.5, off + (rng() - 0.5) * 0.5, h * (0.5 + rng() * 0.45) + CFG.LAKE_Y - h * 0.15);
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

    /* --- 9 bis. RUINES IMMERGÉES : RETIRÉES AU ZIP 380.
       Elles étaient posées à CFG.LAKE_Y + 1,9, soit 70 cm sous la chaussée et
       près de deux mètres AU-DESSUS du lac : elles ne se lisaient donc pas
       comme des blocs tombés à l'eau mais comme des obstacles au bord de la
       piste — et sans collision, puisque le décor n'en a jamais. Guillaume :
       « ils arrivent trop tôt, il y en a beaucoup trop, pas de collision,
       retire-les. »

       Retirées, et non pas simplement replacées plus bas : le premier plan de
       la section de pierre est l'endroit où le joueur apprend à lire la piste,
       et tout ce qui y ressemble à un obstacle sans en être un lui apprend le
       contraire de ce qu'il doit savoir. --- */

    /* ⚠️ ZIP 400 — UN SEUL DESSIN DE TRONC POUR LES DEUX PARADES. Deux
       fonctions auraient fini par diverger (leçon du 387, appliquée ici
       d'avance) : c'est la même chose vue à deux tailles, donc c'est UNE
       description avec une hauteur en argument.

       Tout est proportionnel à `h` : un tronc deux fois et demie plus haut a
       des branches deux fois et demie plus longues, et il continue de se lire
       comme le même objet. La seule chose qui ne l'est pas est la LARGEUR,
       qui suit la voie — un tronc doit border sa voie, sinon la collision, qui
       est décidée voie par voie dans player.js, cesse d'être lisible. */
    function trunkAcross(o, x, h, depth) {
      const w = CFG.LANE_WIDTH - 0.1;
      // Deux étages : le gros du fût, puis un dos plus étroit. C'est ce qui
      // fait la rondeur sans cylindre.
      const hLow = h * 0.66, hTop = h - hLow;   // quatre volumes en tout, voir plus bas
      place(box(w, hLow, depth, mat.bark, 0, 0, 0), o.t, x, hLow / 2);
      place(box(w, hTop, depth * 0.76, mat.bark, 0, 0, 0), o.t, x, hLow + hTop / 2);
      /* LE BOIS DE BOUT, D'UN SEUL CÔTÉ — et le côté ALTERNE.
         C'est lui qui dit « tronc » et pas « poutre » : une section claire, à
         l'endroit où l'arbre a cassé. Même matériau que l'éclat de la planche
         du 381 : deux bois de bout de deux couleurs dans le même jeu se
         verraient tout de suite.

         ⚠️ UN SEUL CÔTÉ, ET CE N'EST PAS UNE ÉCONOMIE DE CONFORT.
         tools/smoke-render.js a refusé la première version : 202 objets pour
         100 unités de chaussée, contre un plafond de 200. Ce plafond est le
         VRAI budget de ce jeu — c'est celui qui décide s'il tourne sur la
         tablette — et le contrôle avait raison contre le dessin. Six volumes
         par tronc sont devenus quatre : deux étages de fût, une section, un
         moignon. Effet de bord heureux : un tronc cassé d'un seul côté est
         plus juste qu'un tronc scié aux deux bouts. */
      const sx = (Math.round(o.t * 16) & 1) ? 1 : -1;
      place(box(0.12, hLow * 0.92, depth * 0.92, mat.plankEnd, 0, 0, 0),
            o.t, x + sx * (w / 2 + 0.05), hLow / 2);
      /* DEUX MOIGNONS DE BRANCHE, décalés et penchés. Ils ne changent rien à
         la collision (elle ne regarde que la voie) et ils font toute la
         silhouette : un fût nu se relit comme un rouleau posé là, un fût
         ébranché se lit comme un arbre mort tombé. Leur position vient de la
         POSITION de l'obstacle, jamais d'un tirage — deux troncs voisins
         doivent être différents, et le même tronc doit être identique d'une
         reconstruction de tronçon à l'autre. */
      const seed = Math.abs(Math.round(o.t * 16) + Math.round(x * 8));
      const bl = h * (0.55 + (seed % 3) * 0.16);
      const br = box(0.16, bl, 0.16, mat.bark, 0, 0, 0);
      br.rotation.z = -sx * (0.55 + (seed % 4) * 0.13);   // il part À L'OPPOSÉ de la cassure
      br.rotation.x = ((seed % 5) - 2) * 0.10;
      place(br, o.t + (seed % 2 ? 0.18 : -0.16), x + ((seed % 5) - 2) * (w * 0.12),
            hLow + hTop + bl * 0.32);
    }

    /* --- 10. Obstacles --- */
    for (const o of node.obstacles) {
      if (o.type === OBST.GAP || o.type === OBST.CREVASSE) continue;  // traités par le sol
      for (let i = 0; i < CFG.LANE_COUNT; i++) {
        if (!o.lanes[i]) continue;
        const x = CFG.LANE_X[i];
        if (o.type === OBST.LOW && o.plank) {
          /* ZIP 381 — PLANCHE TOMBÉE EN TRAVERS, sur deux cales de pierre.
             Elle remplace le bloc taillé sur une barrière basse sur quatre
             (CFG.PLANK_CHANCE) et c'est le seul bois franchissable du jeu.

             LE SOMMET DOIT RESTER À CFG.LOW_HEIGHT, et c'est la contrainte
             qui commande tout le reste. La collision, elle, n'a pas changé
             d'un pouce : player.js teste `y >= JUMP_CLEAR_HEIGHT`, sans jamais
             regarder ce qu'il y a à l'écran. Si la planche était plus basse
             que le bloc qu'elle remplace, elle exigerait exactement le même
             saut en paraissant enjambable — un obstacle qui ment sur sa taille
             est le pire défaut possible dans un jeu de réflexe.

             D'où le partage : cales de 0,61 + madrier de 0,34 = 0,95, la
             valeur exacte de CFG.LOW_HEIGHT, dérivée et non écrite en dur.

             « ROBUSTE » tient au madrier : 34 cm d'épaisseur sur 75 de large,
             une section de charpente. « ABÎMÉE » tient au reste : il déborde
             de sa voie, il n'est pas d'aplomb, et il lui manque un bout. */
          const w = CFG.LANE_WIDTH - 0.1;
          const chockH = CFG.LOW_HEIGHT * 0.64;      // 0,61
          const plankH = CFG.LOW_HEIGHT - chockH;    // 0,34

          // Cales : même pierre que les bordures, comme le bloc qu'on remplace.
          // Elles sont ce qui rattache la planche à l'ouvrage — un madrier
          // posé à même la dalle aurait l'air tombé du ciel.
          for (const sx of [-1, 1]) {
            place(box(0.34, chockH, 0.5, mat.kerb, 0, 0, 0),
                  o.t, x + sx * (w / 2 - 0.24), chockH / 2);
          }

          /* Le madrier DÉBORDE de sa voie (w + 0,5) et penche légèrement.
             Un bois parfaitement bordé à la voie se relit comme une barrière
             de jeu vidéo — c'est précisément le reproche que la pierre évitait
             déjà en empruntant le matériau des bordures. Le débord ne change
             rien à la collision, qui est décidée voie par voie dans
             player.js : il ne mord pas sur les voies libres du point de vue
             des règles, seulement du point de vue de l'œil. */
          const plank = box(w + 0.5, plankH, 0.75, mat.plank, 0, 0, 0);
          plank.rotation.z = 0.045;                  // pas d'aplomb : elle a bougé
          place(plank, o.t, x, chockH + plankH / 2);

          /* L'ÉCLAT MANQUANT. Un morceau de bois de bout arraché à une
             extrémité, plus clair que la face : c'est lui, et lui seul, qui
             fait lire « abîmée » de loin. Les fentes et les nœuds de la
             texture ne portent qu'à deux mètres ; une silhouette entamée
             porte à toute la longueur de vue.

             Posé À CÔTÉ du madrier et non dedans : on ne peut pas creuser une
             BoxGeometry partagée, et en créer une par planche coûterait une
             géométrie par obstacle. Un petit volume décalé donne la même
             lecture pour un objet dont on connaît déjà le coût. */
          const chip = box(0.30, plankH * 0.62, 0.62, mat.plankEnd, 0, 0, 0);
          chip.rotation.z = 0.045;
          chip.rotation.y = 0.22;
          place(chip, o.t + 0.08, x + (w + 0.5) / 2 - 0.02,
                chockH + plankH * 0.28);

        } else if (o.type === OBST.LOW && o.trunk) {
          /* ⚠️ ZIP 400 — TRONC MORT COUCHÉ EN TRAVERS, VERSION « À SAUTER ».
             Il n'existe que sur une barrière PLEINE LARGEUR : sur trois voies,
             la parade annoncée est déjà le saut, donc l'habillage ne promet
             rien de neuf. Voir CFG.TRUNK_CHANCE pour la raison de fond.

             ⚠️ SON SOMMET EST À CFG.LOW_HEIGHT, EXACTEMENT, et c'est la même
             contrainte que celle de la planche du 381 : player.js teste
             `y >= JUMP_CLEAR_HEIGHT` sans jamais regarder ce qu'il y a à
             l'écran. Un tronc plus bas que le bloc qu'il remplace exigerait le
             même saut en paraissant enjambable — un obstacle qui ment sur sa
             taille est le pire défaut possible dans un jeu de réflexe. Les
             deux hauteurs sont donc DÉRIVÉES de LOW_HEIGHT, jamais écrites.

             La rondeur se fait en DEUX ÉTAGES de largeurs différentes plutôt
             qu'avec un cylindre : c'est du pixel-art en volume, la signature du
             projet depuis la rotonde du 396, et ça ne coûte pas une géométrie
             de plus par obstacle. */
          trunkAcross(o, x, CFG.LOW_HEIGHT, 0.95);
        } else if (o.type === OBST.LOW) {
          // Bloc de pierre tombé en travers, MÊME matériau que les bordures :
          // c'est ce qui le relie au décor au lieu d'en faire une caisse de
          // jeu vidéo posée sur un temple.
          place(box(CFG.LANE_WIDTH - 0.1, CFG.LOW_HEIGHT, 0.6, mat.kerb, 0, 0, 0), o.t, x, CFG.LOW_HEIGHT / 2);
        } else if (o.type === OBST.HIGH) {
          const h = 3.2 - CFG.HIGH_CLEARANCE;
          place(box(CFG.LANE_WIDTH - 0.1, h, 0.6, mat.obstacle, 0, 0, 0), o.t, x, CFG.HIGH_CLEARANCE + h / 2);
          place(box(0.22, CFG.HIGH_CLEARANCE, 0.22, mat.beamPost, 0, 0, 0), o.t, x + CFG.LANE_WIDTH / 2 - 0.2, CFG.HIGH_CLEARANCE / 2);
        } else if (o.trunk) {
          /* TRONC MORT, VERSION « À CONTOURNER ». Même matière, même grammaire,
             mais 2,6 de haut au lieu de 0,95 : c'est la hauteur du bloc qu'il
             remplace, et c'est elle qui dit « celui-là, on ne le saute pas ».
             La différence entre les deux troncs doit se lire À PLEINE VITESSE
             et à trente mètres — d'où un rapport de près de trois, et non un
             écart de nuance. */
          trunkAcross(o, x, 2.6, 1.25);
        } else { // WALL
          place(box(CFG.LANE_WIDTH - 0.1, 2.6, 0.7, mat.kerb, 0, 0, 0), o.t, x, 1.3);
        }
      }
    }

    /* --- 11. Pièces — devenues BULLES au zip 381. --- */
    for (const c of node.coins) {
      const m = new THREE.Mesh(geo.coin, mat.coin);
      m.userData.coin = c;
      m.userData.y0 = c.y;                    // altitude de repos, pour le flottement
      /* Phase propre à chaque bulle, dérivée de sa POSITION et non tirée au
         hasard : un chapelet dont les bulles montent et descendent ensemble se
         lit comme un objet unique qui pulse, et le décalage doit survivre à la
         reconstruction du tronçon. Le pas (0,9 rad par unité) est choisi pour
         qu'un chapelet dessine une onde lisible sur sa longueur plutôt qu'un
         désordre. */
      m.userData.phase = c.t * 0.9 + c.lane * 2.1;
      place(m, c.t, CFG.LANE_X[c.lane], c.y);
      if (!g.userData.coins) g.userData.coins = [];
      g.userData.coins.push(m);

      /* HALO. Un plan billboardé posé au même endroit, poussé dans `glows` :
         il tourne donc vers la caméra avec tous les autres halos du jeu, sans
         une ligne de code de plus.

         Il n'est PAS enfant de la bulle. Un enfant hériterait de sa rotation
         locale, et `glows` écrit des rotations en repère MONDE — le halo
         serait alors billboardé de travers dès que le tronçon n'est pas
         orienté au nord. Il est frère, et suit la visibilité de la bulle par
         la référence croisée ci-dessous. */
      const halo = new THREE.Mesh(geo.plane, mat.coinGlow);
      halo.scale.set(1.5, 1.5, 1);
      place(halo, c.t, CFG.LANE_X[c.lane], c.y);
      glows.push(halo);
      m.userData.halo = halo;
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

    /* ⚠️⚠️ ZIP 406 — LE COUDE PLIE EN POSITIF, LE GENOU EN NÉGATIF. C'EST LE
       PIÈGE DU 396, ET IL N'AVAIT JAMAIS ÉTÉ APPLIQUÉ ICI.
       -------------------------------------------------------------------
       Retour de Guillaume au 405 : « les bras du personnage semblent
       s'articuler à l'envers (avant-bras qui s'orientent dans le mauvais sens
       pendant la course) ».

       La géométrie, et elle ne se devine pas — elle se pose. Dans limb2(), le
       segment inférieur pend vers -Y depuis son pivot. Une rotation de θ
       autour de +X envoie ce (0,-1,0) sur (0, -cos θ, -sin θ) : **θ POSITIF
       pousse le segment vers -Z, c'est-à-dire VERS L'AVANT.** Le fermier court
       vers -Z.

       Donc :
         * un GENOU replie le tibia vers l'ARRIÈRE, talon vers la fesse
           → rotation NÉGATIVE. C'est ce que fait kneeRun(), et c'est juste
           depuis le 374 ;
         * un COUDE replie l'avant-bras vers l'AVANT, main vers l'épaule
           → rotation POSITIVE.

       Les trois lignes de coude étaient toutes NÉGATIVES : les avant-bras se
       repliaient donc exactement comme des tibias, poignets partant vers
       l'arrière. Vu de dos, c'est le seul défaut d'animation qu'on remarque
       sans savoir le nommer — et c'est précisément la formule que Guillaume a
       employée, « semblent s'articuler à l'envers ».

       ⚠️ ET POURQUOI ÇA A SURVÉCU DEPUIS LE 374 : les DEUX bras étaient faux
       DU MÊME CÔTÉ. Une asymétrie se voit tout de suite ; une symétrie fausse
       se lit comme un style. Le 396 avait posé la règle des signes opposés
       pour le labyrinthe (rig.js) et personne n'est revenu la vérifier ici.
       verify-pose.mjs (zip 406) évalue désormais les quatre angles sur toute
       la foulée ET toute la glissade, et exige que les deux familles restent de
       signes opposés.

       Le bras d'appui de la GLISSADE garde un coude presque tendu (+0,15) :
       une main plantée au sol le bras cassé ne porte rien. */
    armL.hip.rotation.x = mix(-swing * (ARM_SWING / RUN_SWING), 0.55);
    armL.hip.rotation.z = 0.85 * k;
    armL.knee.rotation.x = mix(0.35 + Math.max(0, -swing) * 0.5, 1.10);

    armR.hip.rotation.x = mix(swing * (ARM_SWING / RUN_SWING), -1.75 + dragArm);
    armR.hip.rotation.z = -0.55 * k;
    armR.knee.rotation.x = mix(0.35 + Math.max(0, swing) * 0.5, 0.15);

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

  /* Couleurs de travail du cycle jour/nuit, allouées UNE fois. Elles sont
     recalculées à chaque image mais jamais réallouées : `updateAmbient` tourne
     soixante fois par seconde, et douze voiles de brume qui recevraient chacun
     un `new THREE.Color` feraient sept cents allocations par seconde pour rien.
     C'est le seul endroit du fichier où ça vaut la peine d'y penser.

     Elles sont remplies par `buildDayNightColors()`, appelée depuis `init()`, et
     PAS écrites au niveau du module : rien dans ce fichier ne touche à THREE
     avant `init()`, et c'est ce qui permet aux outils de `tools/` de charger
     world.js puis d'installer leur faux THREE ensuite. */
  let NIGHT_MIST, DAY_MIST, NIGHT_AMB, DAY_AMB, NIGHT_SUN, DAY_SUN;
  let mistCol, ambCol, sunCol;

  function buildDayNightColors() {
    NIGHT_MIST = new THREE.Color(CFG.COL_PURPLE_DIM);
    DAY_MIST   = new THREE.Color(0x9d86bd);
    NIGHT_AMB  = new THREE.Color(CFG.COL_PURPLE_DIM);
    DAY_AMB    = new THREE.Color(0x9f8fc4);
    NIGHT_SUN  = new THREE.Color(0xa694d4);   // clair de lune, froid
    DAY_SUN    = new THREE.Color(0xffcbb0);   // soleil rasant, chaud
    mistCol = new THREE.Color();
    ambCol  = new THREE.Color();
    sunCol  = new THREE.Color();
  }

  /* `dist` (zip 382) : la distance parcourue, en mètres. Troisième argument et
     non quatrième champ d'un objet d'état, pour rester dans la forme des deux
     premiers — `updateAmbient` reçoit ce dont l'ambiance dépend, rien de plus.
     Elle vaut 0 par défaut : l'écran-titre et l'écran de fin appellent la
     fonction sans course en cours, et doivent montrer la nuit. */
  function updateAmbient(now, danger, dist) {
    const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0;
    lastNow = now;

    const day = dayAt(dist || 0);
    mistCol.copy(NIGHT_MIST).lerp(DAY_MIST, day);
    ambCol.copy(NIGHT_AMB).lerp(DAY_AMB, day);
    sunCol.copy(NIGHT_SUN).lerp(DAY_SUN, day);

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

    /* --- Bulles (zip 381). La rotation continue de la pièce octaédrique est
       remplacée par un FLOTTEMENT vertical.

       Faire tourner une sphère ne se voit pas : la pièce dorée tirait toute sa
       présence de ses facettes qui accrochaient la lumière tour à tour, et une
       sphère unie sur un Basic n'a rien à accrocher. Sans mouvement, elle
       serait un point mort dans un décor où tout respire (flammes, halos,
       lac) ; le flottement est ce qui la rattrape.

       ±11 cm à ~0,3 Hz, autour de son altitude de repos `y0` : assez pour que
       l'œil l'attrape en périphérie, assez peu pour que le test de ramassage,
       qui tolère 1,5 unité d'écart vertical (player.js), n'en sache rien. Le
       gameplay ne bouge pas d'un pouce. */
    for (const [, g] of nodeGroups) {
      if (!g.userData.coins) continue;
      for (const c of g.userData.coins) {
        const bob = Math.sin(now * 0.0019 + c.userData.phase) * 0.11;
        c.position.y = c.userData.y0 + bob;
        const vis = !c.userData.coin.taken;
        c.visible = vis;
        /* Le halo suit la bulle, en hauteur ET en visibilité. Oublier la
           seconde laisserait une lueur cyan orpheline flotter à l'endroit
           d'une bulle déjà ramassée — le défaut est invisible en capture fixe
           et saute aux yeux en jeu. */
        const halo = c.userData.halo;
        if (halo) {
          halo.position.y = c.userData.y0 + bob;
          halo.visible = vis;
        }
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
    tickRain(now, dist);                 // zip 400
    sky.position.set(cam.x, 0, cam.z);
    skyDay.position.set(cam.x, 0, cam.z);
    lake.position.set(cam.x, CFG.LAKE_Y, cam.z);
    lakeDay.position.set(cam.x, CFG.LAKE_Y + 0.02, cam.z);
    lakeGlow.position.set(cam.x, CFG.LAKE_Y + 0.05, cam.z);

    /* Le défilement de texture COMPENSE le déplacement du plan. Sans lui, la
       texture serait solidaire de la caméra et l'eau paraîtrait parfaitement
       figée sous les pieds du joueur, ce qui est pire que pas de lac du tout.
       Signes : le plan est tourné de -90° sur X, donc son y local vaut -z
       monde — d'où le moins sur la composante V. */
    if (lakeMat.map) {
      lakeMat.map.offset.x = cam.x / lakeUnitsPerTile;
      lakeMat.map.offset.y = -cam.z / lakeUnitsPerTile + now * 0.001 * CFG.LAKE_SCROLL;
      // Le lac de jour reçoit le MÊME décalage, au pixel près. Sans ça, les
      // deux houles glisseraient l'une sur l'autre pendant tout le lever.
      if (lakeDayMat.map) {
        lakeDayMat.map.offset.x = lakeMat.map.offset.x;
        lakeDayMat.map.offset.y = lakeMat.map.offset.y;
      }
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

    /* --- Orage. Il s'éteint avec le jour (zip 382) : `day` multiplie sa force,
       il n'y a donc pas d'éclair en plein soleil, et il revient tout seul quand
       la nuit retombe — sans un seul interrupteur, ni un seul seuil.

       Le compteur, lui, continue de tourner sous le soleil. Le couper aurait
       fait éclater un coup de tonnerre pile à la seconde où la nuit revient,
       parce que l'attente accumulée se serait vidée d'un coup. --- */
    const flash = tickLightning(now) * CFG.LIGHTNING_STRENGTH * (1 - day);
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

    /* --- Couleurs d'ambiance. Trois influences se composent, TOUJOURS dans cet
       ordre : le jour d'abord (c'est le fond du tableau), la meute ensuite
       (elle vire au rouge sombre), l'éclair en dernier (il délave tout vers le
       violet blanc).

       L'ordre n'est pas indifférent : appliquer le jour APRÈS le rouge de la
       meute effacerait l'avertissement le plus important du jeu dès que le
       soleil se lève. Le danger doit rester lisible à toute heure. --- */
    const fogCol = new THREE.Color(CFG.COL_FOG).lerp(new THREE.Color(CFG.COL_DAY_FOG), day);
    fogCol.lerp(new THREE.Color(0x3a0d12), danger * 0.8);
    fogCol.lerp(new THREE.Color(CFG.COL_LIGHTNING), flash * 0.55);
    scene.fog.color.copy(fogCol);

    /* Le ciel est un MeshBasicMaterial texturé : sa couleur MULTIPLIE la
       texture. Passer au-dessus de 1 donne le sur-éclairement du flash sans
       ajouter un seul objet à la scène. Les DEUX dômes la reçoivent, sinon un
       éclair pendant le lever n'éclairerait que la moitié du ciel. */
    const lit = 1 + flash * 2.2;
    skyMat.color.setRGB(lit, lit, lit * 1.05);
    skyDayMat.color.setRGB(lit, lit, lit * 1.05);
    skyDayMat.opacity = day;
    lakeDayMat.opacity = day;

    /* La crête violette du lac RESTE allumée de jour — c'est ce que montre la
       référence de Guillaume, où l'eau garde franchement sa lueur sous un ciel
       clair. Elle faiblit seulement d'un tiers : un additif à pleine puissance
       sur une eau devenue claire se serait empâté en blanc. */
    lakeGlowMat.opacity = (0.4 - 0.13 * day) + flash * 0.4;

    /* La brume passe du violet sombre au lilas clair de la référence. Elle est
       en additif : de jour, sur un lac clair, elle doit surtout ÉCLAIRCIR, d'où
       la teinte plutôt que l'opacité. */
    for (const m of mists) m.material.color.copy(mistCol);

    /* Lumières. La lune ne devient pas un soleil par magie : elle se réchauffe
       et force le trait. Deux fois plus d'ambiante au plein jour, c'est ce qui
       fait ressortir la pierre des bordures — de nuit elles étaient presque des
       silhouettes, et sous un ciel clair une silhouette se lit comme un trou. */
    ambientLight.color.copy(ambCol);
    ambientLight.intensity = 0.5 + day * 0.55 + flash * 1.5;
    moonLight.color.copy(sunCol);
    moonLight.intensity = 0.5 + day * 0.45 + flash * 1.9;
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
    // Exporté pour les outils : c'est la seule façon de vérifier le cycle
    // jour/nuit sans lancer une course de 33 000 mètres (zip 382).
    dayAt,
    // Zip 406, même raison exactement : la courbe de l'orage se contrôle sans
    // courir 6 000 mètres, et le contrôle lit LA fonction du jeu, pas une
    // seconde écriture de la même courbe.
    rainLevel,
    get camera() { return camera; },
    get scene() { return scene; },
    get playerMesh() { return playerMesh; },
    get playerRig() { return playerRig; },   // lecture seule, pour tools/smoke-render.js
    get geometries() { return geo; },        // idem : identifier une boîte sans navigateur
    get materials() { return mat; },         // idem : vérifier une teinte sans navigateur
  };
})();
