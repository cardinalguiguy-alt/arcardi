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
  let stalkerHud = null;      // zip 405 : sa jauge, qui n'existait pas
  let sparkPool = [], soulPool = [], scorePool = [];
  /* ZIP 397 — la vue subjective. */
  let mapMesh = null, bowMesh = null, boltPackMeshes = [], boltPool = [];
  let vmScene = null, vmCam = null, vm = null;
  let pitch = 0, pitchWant = 0;
  let bobT = { y: 0, x: 0, roll: 0 }, swayX = 0, swayY = 0;
  /* ⚠️ L'INSTANTANÉ PRÉCÉDENT, cœur de l'interpolation du zip 395. La
     simulation avance par pas de 1/30 s ; le rendu, lui, tourne à la cadence
     de l'écran. Sans mémoire de l'état d'avant, on afficherait deux fois la
     même image puis un saut — c'est exactement la saccade que Guillaume
     décrit. On garde donc le AVANT et le APRÈS, et on affiche entre les deux. */
  let prev = null;
  let wallFlames = [], holeGlows = [];
  /* ZIP 405 — les dalles saines, rangées par indice de cellule, pour que
     syncFloor() puisse en faire trembler une puis la retirer. `holeGlowGeo` et
     `holeGlowMat` sont gardés pour allumer un fût violet sur une cellule qui
     vient de s'effondrer : un trou neuf doit se lire comme les autres. */
  let floorTiles = new Map(), holeGlowGeo = null, holeGlowMat = null;
  let skin = null;
  let cam = { x: 0, y: 0, z: 0, ang: 0 };
  let flameCuts = [];
  let CFG_, ST_, M_;

  /* =========================================================================
     ZIP 399 — LE GROUPE DE LUMIÈRES, ET LA CAUSE RACINE DU JEU INJOUABLE.
     -------------------------------------------------------------------------
     Guillaume, au 399 : « il fait lagger mon ordinateur à mort et m'oblige à
     command+Q pour fermer mon navigateur (…) y a une ou deux images par
     seconde ». Sur un MacBook Pro M4, c'est-à-dire sur une machine qui n'a
     aucune excuse. La cause a été COMPTÉE, pas devinée : tools/verify-perf.mjs
     construit le monde contre un faux Three.js et compte ce qui s'y trouve.
     Il y avait **123 PointLight** — 82 pour les torches murales, 23 pour les
     brasiers et les objets, 9 au fond des trous, 6 pour la rotonde, 3 pour le
     reste.

     ⚠️ THREE.JS r128 EST UN MOTEUR *FORWARD* : IL NE TRIE PAS LES LUMIÈRES.
     Le nombre de PointLight PRÉSENTES dans la scène est compilé en dur dans le
     shader de chaque matériau (NUM_POINT_LIGHTS), et la boucle d'éclairage les
     parcourt TOUTES, y compris celles qui sont à l'autre bout du dédale. Et
     depuis le 397 la pierre est en MeshPhongMaterial — obligatoire pour le
     bumpMap, voir stoneMat — donc cette boucle tourne PAR PIXEL, sur les
     1 182 maillages de pierre et de sol. À 2880×1800 (Retina,
     devicePixelRatio 2), cela fait ~640 millions d'évaluations d'éclairage par
     image, avant même de compter le recouvrement. C'est très exactement « une
     ou deux images par seconde ».

     Le commentaire de buildWallTorches le disait déjà, au 394 : « une lampe une
     fois sur deux seulement : au-delà, on dépasse le budget de lumières
     dynamiques de WebGL et le rendu s'effondre ». Le garde-fou était juste. Il
     était calibré dix fois trop haut, et personne ne pouvait le voir en
     relisant : chaque lampe, prise seule, est parfaitement légitime.

     ⚠️ LA PARADE N'EST PAS DE SUPPRIMER DES LUMIÈRES, C'EST DE LES PRÊTER.
     Une torche murale porte à CELL×1,9 = 21,8 unités ; au-delà, sa
     contribution est MATHÉMATIQUEMENT NULLE (three.js coupe net à `distance`).
     Sur les 123 lampes, il n'y en a donc jamais qu'une poignée qui éclaire
     réellement le pixel qu'on regarde : tout le reste coûte plein tarif pour
     ajouter zéro. On garde donc la liste complète des ÉMETTEURS — de simples
     enregistrements, aucun coût GPU — et un POOL FIXE de PointLight réellement
     présentes dans la scène, réattribuées à chaque image aux émetteurs les
     plus proches qui portent jusqu'à l'œil.

     ⚠️ C'EST LE MÊME TEST QUE FAIT LE SHADER, SAUF QU'ON LE FAIT UNE FOIS PAR
     LAMPE AU LIEU D'UNE FOIS PAR LAMPE ET PAR PIXEL. C'est toute l'astuce, et
     c'est pour ça que le décor est identique à l'œil : la lampe n° 47, qui
     n'éclairait rien, ne coûte simplement plus rien non plus.

     ⚠️ LA TAILLE DU POOL EST FIGÉE À L'INIT, ET CE N'EST PAS NÉGOCIABLE.
     Changer le nombre de lumières présentes dans la scène change
     NUM_POINT_LIGHTS, donc invalide et RECOMPILE tous les shaders — un gel
     d'une seconde en pleine partie. Le pool est dimensionné une fois d'après
     CFG.QUAL[niveau].lights, et les créneaux inoccupés portent une intensité
     nulle : une lumière éteinte ne recompile rien et ne coûte qu'une poignée
     d'opérations par pixel.

     ⚠️ ET IL FAUT UN FONDU. Réattribuer un créneau d'un coup fait CLIGNOTER le
     décor dès qu'on marche. Chaque créneau porte donc un facteur k qui monte
     et descend en CFG.LIGHT_FADE secondes : l'émetteur qui sort s'éteint avant
     que le créneau ne change de main, et le suivant s'allume. Comme celui qui
     sort est toujours le PLUS LOINTAIN, donc le plus faible, le fondu ne se
     voit pas. Un hystérésis de 25 % empêche en plus deux lampes à distance
     quasi égale de s'échanger le créneau à chaque image.

     ⚠️ CE QUE CE MÉCANISME NE PEUT PAS FAIRE : si plus de `lights` émetteurs
     portent RÉELLEMENT jusqu'à l'œil au même instant, les surnuméraires sont
     perdus, et là il y aurait une vraie différence visible. C'est donc la
     seule chose à mesurer, et c'est ce que fait tools/verify-perf.mjs : il
     JOUE des parties entières et relève, à chaque pas, combien d'émetteurs
     atteignent la caméra. Le pool est dimensionné sur ce relevé, pas sur une
     intuition.
     ====================================================================== */
  /* =========================================================================
     ZIP 399 — LES TROIS NIVEAUX, ET LA RÉSOLUTION COMME SEUL LEVIER CONTINU.
     -------------------------------------------------------------------------
     Une fois les lumières réglées, le coût restant est presque entièrement du
     REMPLISSAGE : la pierre est en Phong avec relief (deux lectures de texture
     et deux dérivées par pixel) et 572 plans additifs se recouvrent. Ces deux
     postes sont proportionnels au NOMBRE DE PIXELS, et à rien d'autre.

     Rendre à 80 % de la largeur et de la hauteur, c'est donc rendre 36 % de
     pixels en moins — sans retirer un seul objet du décor. C'est le seul levier
     qui ne change pas ce qu'on VOIT, seulement la finesse avec laquelle on le
     voit ; et sur du pixel-art filtré en NEAREST, il ne se remarque presque
     pas. C'est aussi pour ça que le 399 ne coupe RIEN d'autre : pas de brouillard
     rapproché, pas de halos retirés, pas de relief désactivé. Le décor du 398
     est intact.

     ⚠️ ON PART TOUJOURS DU PLAFOND ET ON NE DESCEND QUE SI ON N'Y ARRIVE PAS.
     Sur une machine confortable, l'échelle reste à 1,0 pour toute la partie et
     l'image est au bit près celle du 398.
     ====================================================================== */
  let qual = null, qName = "high";
  let resScale = 1, baseRatio = 1, lastResChange = 0;
  const frameLog = [];
  let frameSeen = 0;
  /* Le chien de garde de la souris : compté ici parce que c'est ici qu'on sait
     combien de temps une image a duré. game.js n'a qu'à lire le drapeau. */
  let hangStrikes = 0, hangFlag = false;
  /* La rétrogradation automatique n'a lieu qu'une fois par partie, et
     l'interface doit pouvoir le dire une fois — d'où le drapeau, lu et effacé
     par takeDemote(). */
  let demoted = false, demotedTo = null;

  function qualOf(cfg, name) {
    const Q = cfg.QUAL || {};
    return Q[name] || Q[cfg.QUAL_DEFAULT] || Q.high;
  }

  /* Le plafond matériel : on ne rend JAMAIS au-delà de 2 pixels par point, même
     sur un écran qui en annonce 3. Au-delà, on paie 2,25 fois le remplissage
     pour une différence que personne ne voit. C'était déjà la règle du 397. */
  function baseRatioOf() { return Math.min(2, (window.devicePixelRatio || 1)); }

  function applyRes() {
    if (!renderer) return;
    renderer.setPixelRatio(baseRatio * resScale);
    resize();
  }

  /* ⚠️ MÉDIANE, JAMAIS MOYENNE. Une seule image longue — un ramasse-miettes,
     une notification du système, un changement d'onglet — ferait chuter une
     moyenne et déclencherait une baisse de qualité alors que le jeu tourne
     parfaitement. La médiane d'une fenêtre de quarante images ignore ces
     accidents par construction.
     ⚠️ ET LES QUARANTE PREMIÈRES IMAGES NE COMPTENT PAS : ce sont elles qui
     paient la compilation des shaders. Les mesurer, c'est mesurer le
     démarrage et conclure que la machine est lente. */
  function tickRes(cfg, dtMs, now) {
    // --- le chien de garde, d'abord : il doit répondre même pendant l'échauffement.
    if (dtMs > cfg.HANG_MS) { if (++hangStrikes >= cfg.HANG_STRIKES) hangFlag = true; }
    else hangStrikes = 0;

    if (++frameSeen <= cfg.RES_WARMUP) return;
    frameLog.push(dtMs);
    if (frameLog.length < cfg.RES_SAMPLES) return;
    if (frameLog.length > cfg.RES_SAMPLES) frameLog.shift();
    if (now - lastResChange < cfg.RES_COOLDOWN_MS) return;

    const sorted = frameLog.slice().sort((x, y) => x - y);
    const med = sorted[sorted.length >> 1];
    let want = resScale;
    if (med > cfg.RES_SLOW_MS) want = Math.max(qual.minRes, resScale * cfg.RES_DOWN);
    else if (med < cfg.RES_FAST_MS) want = Math.min(qual.maxRes, resScale * cfg.RES_UP);

    /* ⚠️ LE DERNIER RECOURS : ON EST AU PLANCHER DE RÉSOLUTION ET ÇA NE SUFFIT
       TOUJOURS PAS. La résolution ne peut plus rien : ce qui reste coûteux,
       c'est la boucle d'éclairage, et elle ne dépend pas du nombre de pixels.
       On descend donc d'un niveau, UNE SEULE FOIS par partie, et on lève un
       drapeau pour que l'interface le dise. Sans ce garde-fou, une machine trop
       faible resterait bloquée à quinze images par seconde en croyant faire de
       son mieux. */
    if (med > cfg.RES_SLOW_MS && resScale <= qual.minRes + 1e-3 && !demoted) {
      const next = qName === "high" ? "med" : qName === "med" ? "low" : null;
      if (next) {
        demoted = true; demotedTo = next;
        qName = next; qual = qualOf(cfg, qName);
        resizePool(cfg);
        resScale = qual.maxRes;
        lastResChange = now; frameLog.length = 0;
        applyRes();
        return;
      }
    }
    // Bande morte : sous 1,5 % d'écart, on ne réalloue pas le tampon d'image
    // pour rien — un changement de taille coûte plus cher qu'il ne rapporte.
    if (Math.abs(want - resScale) < 0.015) return;
    resScale = want;
    lastResChange = now;
    frameLog.length = 0;         // la fenêtre repart : elle mesurait l'ancienne taille
    applyRes();
  }

  let emitters = [];            // tous les foyers du décor — aucun coût GPU
  let lightPool = [];           // les PointLight réellement dans la scène
  let lightSlots = [];          // { em, k } — l'appariement courant
  let poolReady = false;
  let lightPeak = 0;            // le maximum d'émetteurs vus en portée (outils)
  let lastInRange = 0;          // émetteurs réellement utiles à l'image courante
  let lastGapOut = Infinity;    // l'émetteur le mieux placé qu'on ait DÛ jeter

  /* Un émetteur n'est PAS une lumière : c'est la DESCRIPTION d'une lumière.
     `intensity` reste public et modifiable — les brasiers l'éteignent quand ils
     sont consommés, et la carte quand elle est décrochée, exactement comme ils
     le faisaient sur l'objet PointLight qu'ils portaient avant le 399. Les deux
     lignes de sync() qui écrivent `.intensity` n'ont donc PAS bougé. */
  function addEmitter(color, intensity, distance, decay, x, y, z) {
    const e = { color, intensity, distance, decay, x, y, z, _slot: -1, _d2: 0 };
    emitters.push(e);
    return e;
  }

  /* Le pool, construit UNE fois, APRÈS tout le décor : il faut connaître le
     nombre d'émetteurs pour savoir si le pool est sous-dimensionné, et surtout
     il ne faut ajouter des PointLight à la scène qu'une seule fois. */
  function buildLightPool(cfg) {
    const n = Math.max(1, qual.lights | 0);
    lightPool = []; lightSlots = [];
    for (let i = 0; i < n; i++) {
      /* Intensité nulle et position hors du monde : tant qu'un créneau n'a pas
         d'émetteur, il ne doit rien éclairer du tout. Une lumière à l'origine
         avec une intensité résiduelle éclairerait le coin du dédale, et ce
         genre de défaut se cherche longtemps. */
      const L = new THREE_.PointLight(0xffffff, 0, 1, 2);
      L.position.set(0, -9999, 0);
      scene.add(L);
      lightPool.push(L);
      lightSlots.push({ em: null, k: 0 });
    }
    poolReady = true;
  }

  /* ⚠️ CHANGER LA TAILLE DU POOL RECOMPILE TOUS LES SHADERS, ET ÇA SE VOIT :
     un gel d'une seconde environ. On ne le fait donc QUE dans deux cas, tous
     deux volontaires et tous deux annoncés au joueur :
       * il change le niveau à la main depuis la pause ;
       * l'auto-détection constate qu'elle est au plancher de résolution et
         qu'elle n'y arrive TOUJOURS pas — une seule fois par partie.
     C'est le prix d'un moteur *forward* : le nombre de lumières est une
     constante de compilation. Le cacher au joueur donnerait un jeu qui hoquette
     sans raison apparente, ce qui est pire que d'être lent. */
  function resizePool(cfg) {
    const n = Math.max(1, qual.lights | 0);
    if (!poolReady || n === lightPool.length) return false;
    for (const L of lightPool) { L.intensity = 0; if (scene.remove) scene.remove(L); }
    for (const e of emitters) e._slot = -1;
    lightPool = []; lightSlots = [];
    for (let i = 0; i < n; i++) {
      const L = new THREE_.PointLight(0xffffff, 0, 1, 2);
      L.position.set(0, -9999, 0);
      scene.add(L);
      lightPool.push(L);
      lightSlots.push({ em: null, k: 0 });
    }
    return true;
  }

  /* La réattribution, une fois par image. Coût : une distance par émetteur
     (123) et une insertion dans un tableau de huit. Quelques microsecondes, à
     comparer aux centaines de millisecondes que coûtait la boucle de shader. */
  /* ⚠️⚠️ CE QU'ON CLASSE N'EST PAS UNE DISTANCE, C'EST UNE CONTRIBUTION À
     L'IMAGE — et c'est la seule vraie subtilité de tout ce mécanisme.

     Deux fausses pistes ont été essayées et mesurées avant celle-ci ; les
     garder écrites évite de les refaire.

     FAUSSE PISTE N° 1 — classer par la distance à la lampe. Une torche à
     30 unités de l'œil n'éclaire pas l'œil, mais elle éclaire LE MUR QUI EST À
     CÔTÉ D'ELLE, et ce mur est à l'écran. La jeter éteint le fond du couloir.

     FAUSSE PISTE N° 2 — classer par la distance à sa sphère d'influence
     (`distance − portée`). Mieux, mais ça favorise mécaniquement les lampes à
     grande portée : le fût de la rotonde (portée 69) écrasait dans le
     classement une torche murale à trois mètres (portée 21,8), alors que c'est
     la torche qu'on voit. verify-perf.mjs le chiffrait : 97 % des images
     jetaient un foyer proche.

     CE QU'ON CLASSE VRAIMENT : le maximum d'énergie que cette lampe peut
     encore mettre dans un pixel affiché. Deux cas, dont on garde le plus
     grand :

       * `att` — ce qu'elle apporte AU POINT OÙ SE TIENT LE JOUEUR. C'est
         l'atténuation EXACTE de three.js r128 en mode hérité (le mode par
         défaut, `physicallyCorrectLights` n'étant jamais activé ici) :
         `saturate(1 − d/portée)^decay`. preview-fps.mjs utilise déjà la même
         formule pour la torche, et deux formules qui doivent rester égales ne
         doivent exister qu'à un endroit — sauf qu'ici c'est le SHADER qui est
         la source, et on la recopie de lui.

       * `loin` — ce qu'elle apporte à la tache qu'elle éclaire autour d'elle,
         quand cette tache est encore devant nous. Cette tache est vue à
         travers `d` unités de brouillard (d'où `fogVis`) et n'occupe qu'une
         poignée de pixels (d'où le carré de la distance). C'est ce terme, et
         lui seul, qui garde allumé le fond d'un couloir.

     ⚠️ ET LA COUPURE EST DÉMONTRABLE : au-delà de `fog.far`, tout ce que la
     lampe peut éclairer est déjà peint en couleur de brouillard PURE. Elle ne
     peut plus rien changer à l'image. On ne la jette pas parce qu'elle est
     loin, on la jette parce qu'on a la preuve qu'elle est sans effet.

     ⚠️ CE CLASSEMENT N'A PAS ÉTÉ CHOISI, IL A ÉTÉ MESURÉ. verify-perf.mjs
     calcule l'éclairement en des milliers de points de surface RÉELLEMENT
     visibles, avec les 122 foyers puis avec le pool, et rend l'écart en
     niveaux de gris sur 255. C'est ce chiffre-là qui décide, pas l'élégance de
     la formule. */
  const LIGHT_R0 = 10;          // rayon de référence de la tache éclairée
  const wantEm = [];
  function updateLights(cx, cy, cz, dt, cfg, fogFar, fogNear) {
    if (!poolReady) return;
    const n = lightPool.length;
    wantEm.length = 0;
    let inRange = 0;
    lastGapOut = 0;
    const fogSpan = Math.max(1e-3, fogFar - fogNear);
    for (let i = 0; i < emitters.length; i++) {
      const e = emitters[i];
      if (e.intensity <= 0) continue;
      const dx = e.x - cx, dy = e.y - cy, dz = e.z - cz;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d - e.distance > fogFar) continue;    // preuve d'inutilité, voir ci-dessus
      // ce qu'elle donne SOUS NOS PIEDS — atténuation exacte du shader
      const u = 1 - d / e.distance;
      const att = u > 0 ? Math.pow(u, e.decay) : 0;
      // ce qu'elle donne LÀ-BAS, vu à travers le brouillard et de loin
      const vis = Math.min(1, Math.max(0, (fogFar - d) / fogSpan));
      const k = LIGHT_R0 / Math.max(LIGHT_R0, d);
      const score = e.intensity * Math.max(att, vis * k * k);
      if (score <= 1e-4) continue;
      inRange++;
      /* Hystérésis : un foyer DÉJÀ dans le pool est jugé 25 % plus fort qu'il
         ne l'est. Sans ça, deux lampes de contribution quasi égale s'échangent
         le créneau à chaque image quand on marche entre les deux, et le couloir
         se met à battre. */
      e._d2 = -(e._slot >= 0 ? score * 1.25 : score);    // on trie par score DÉCROISSANT
      let j = wantEm.length;
      while (j > 0 && wantEm[j - 1]._d2 > e._d2) j--;
      if (j >= n) { if (-e._d2 > lastGapOut) lastGapOut = -e._d2; continue; }
      wantEm.splice(j, 0, e);
      if (wantEm.length > n) {
        const drop = wantEm.pop();
        if (-drop._d2 > lastGapOut) lastGapOut = -drop._d2;
      }
    }
    if (inRange > lightPeak) lightPeak = inRange;
    lastInRange = inRange;

    // 1. les créneaux qui gardent leur émetteur montent, les autres descendent.
    const step = dt / Math.max(0.01, cfg.LIGHT_FADE);
    for (let s = 0; s < n; s++) {
      const sl = lightSlots[s];
      if (sl.em && wantEm.indexOf(sl.em) >= 0) sl.k = Math.min(1, sl.k + step);
      else {
        sl.k = Math.max(0, sl.k - step);
        if (sl.k <= 0 && sl.em) { sl.em._slot = -1; sl.em = null; }
      }
    }
    // 2. les créneaux libérés prennent les candidats qui n'en ont pas encore.
    for (let i = 0; i < wantEm.length; i++) {
      const e = wantEm[i];
      if (e._slot >= 0) continue;
      for (let s = 0; s < n; s++) {
        const sl = lightSlots[s];
        if (sl.em) continue;
        sl.em = e; sl.k = 0; e._slot = s; break;
      }
    }
    // 3. on pose les lumières.
    for (let s = 0; s < n; s++) {
      const sl = lightSlots[s], L = lightPool[s];
      if (!sl.em) { L.intensity = 0; continue; }
      L.color.setHex(sl.em.color);
      L.distance = sl.em.distance;
      L.decay = sl.em.decay;
      L.intensity = sl.em.intensity * sl.k;
      L.position.set(sl.em.x, sl.em.y, sl.em.z);
    }
  }

  /* =========================================================================
     LA LIBÉRATION DU MONDE PRÉCÉDENT — zip 399.
     -------------------------------------------------------------------------
     Il n'y avait AUCUN `dispose()` dans tout le fichier avant ce zip. Une
     géométrie, un matériau et une texture Three.js tiennent chacun un objet
     WebGL côté pilote, et le ramasse-miettes de JavaScript ne les rend jamais :
     il ne connaît pas le GPU. Rejouer trois fois, c'était donc garder trois
     dédales complets en mémoire vidéo — 3 465 géométries et 26 textures
     chacun.

     ⚠️ LE GARDE `typeof … === "function"` N'EST PAS DE LA PRUDENCE DÉCORATIVE.
     Les outils du chantier font tourner ce fichier contre un FAUX Three.js
     (smoke-render.mjs, verify-perf.mjs) qui ne connaît que ce dont world.js se
     sert vraiment. Le même garde existe déjà pour `renderer.clearDepth` dans
     sync(), et pour la même raison. */
  function walkTree(o, fn) {
    if (!o) return;
    fn(o);
    const c = o.children;
    if (c) for (let i = 0; i < c.length; i++) walkTree(c[i], fn);
  }
  function freeIt(x) { if (x && typeof x.dispose === "function") x.dispose(); }
  function disposeScene() {
    if (!scene) return;
    const geos = new Set(), mats = new Set();
    walkTree(scene, (o) => {
      if (o.geometry) geos.add(o.geometry);
      const m = o.material;
      if (m) { if (Array.isArray(m)) { for (const x of m) mats.add(x); } else mats.add(m); }
    });
    if (vmScene) walkTree(vmScene, (o) => {
      if (o.geometry) geos.add(o.geometry);
      if (o.material) mats.add(o.material);
    });
    geos.forEach(freeIt);
    /* Les textures partent AVEC leur matériau : chaque clone de pierre du 397
       porte sa propre `map` et sa propre `bumpMap` (l'image est partagée, la
       répétition ne l'est pas), et c'est le clone qui occupe une texture GPU. */
    mats.forEach((m) => {
      for (const k of ["map", "bumpMap", "alphaMap", "emissiveMap", "specularMap"]) freeIt(m[k]);
      freeIt(m);
    });
    for (const k in tex) delete tex[k];
    flameCuts = [];
    if (renderer && renderer.renderLists && typeof renderer.renderLists.dispose === "function") {
      renderer.renderLists.dispose();
    }
  }


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
    /* ⚠️ ZIP 397 — LA PIERRE PASSE À CFG.TEX_WALL (512) ET GAGNE UN RELIEF.
       Les deux vont ensemble et ne valent rien séparément :

         * à 128 px pour 5,75 unités de mur, un bloc recevait trente pixels ;
           il n'y avait physiquement pas la place d'y mettre un chanfrein, un
           grain et une piqûre. Le mur du 396 n'était pas mal dessiné, il était
           dessiné TROP PETIT — c'est pourquoi quatre refontes successives n'y
           avaient rien changé ;
         * le `bumpMap` est la seule couche de tout ce travail qui vive à
           L'EXÉCUTION. La torche du joueur bouge ; les creux du mortier et le
           fond des cratères changent donc d'ombre pendant qu'on avance. Aucune
           texture cuite ne produit ça, et c'est de très loin ce qui se voit le
           plus en jouant.

       ⚠️ ET C'EST POURQUOI LA PIERRE PASSE EN MeshPhongMaterial. Dans la r128,
       MeshLambertMaterial N'A PAS de `bumpMap` — il l'ignore silencieusement,
       ce qui est le pire des deux mondes : on croit avoir du relief, on n'en a
       pas, et rien ne le dit. Phong l'accepte ; on met sa brillance à zéro et
       son spéculaire au noir, donc on obtient très exactement un Lambert avec
       du relief, sans reflet parasite sur une pierre mate. */
    const TW = cfg.TEX_WALL, TF = cfg.TEX_FLOOR;
    tex.wall = canvasTex(TW, TW, (c) => Paint.wall(c, cfg, TW, TW, 1));
    tex.wall2 = canvasTex(TW, TW, (c) => Paint.wall(c, cfg, TW, TW, 7));
    tex.wallB = canvasTex(TW, TW, (c) => Paint.wallBump(c, cfg, TW, TW, 1));
    tex.wallB2 = canvasTex(TW, TW, (c) => Paint.wallBump(c, cfg, TW, TW, 7));
    /* ⚠️ DEUX DALLAGES, ET QUATRE ORIENTATIONS — huit cellules de sol
       différentes pour le prix d'une texture et demie.
       Une tuile de sol couvre EXACTEMENT une cellule (FLOOR_TILE = CELL) :
       avec un seul dessin, les 289 cellules du dédale montraient rigoureusement
       le même dallage, et on lisait la grille du labyrinthe à travers son
       propre sol. C'est très visible sur la vue subjective, et invisible sur
       une planche de texture — encore une fois.
       La rotation ne coûte RIEN (voir buildFloor : on tourne le maillage, pas
       l'image), donc deux textures suffisent à casser la répétition. */
    tex.floor = canvasTex(TF, TF, (c) => Paint.floor(c, cfg, TF, TF, 3));
    tex.floor2 = canvasTex(TF, TF, (c) => Paint.floor(c, cfg, TF, TF, 23));
    tex.floorB = canvasTex(TF, TF, (c) => Paint.floorBump(c, cfg, TF, TF, 3));
    tex.floorB2 = canvasTex(TF, TF, (c) => Paint.floorBump(c, cfg, TF, TF, 23));
    tex.mapSheet = canvasTex(192, 144, (c) => Paint.mapSheet(c, cfg, 192, 144));
    /* Les quatre marques de craie. Transparentes, posées sur le mur comme un
       décalque — voir buildChalk. */
    tex.chalk = [0, 1, 2, 3].map(k => canvasTex(64, 64, (c) => Paint.chalk(c, cfg, 64, 64, k)));
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

  /* -----------------------------------------------------------------------
     ⚠️ ZIP 397 — LA DENSITÉ DE TEXELS EST CONSTANTE, ET C'EST LE DEUXIÈME
     DÉFAUT QUE LE RASTERISEUR A RENDU VISIBLE.
     -----------------------------------------------------------------------
     Jusqu'ici, `matX`/`matZ` étaient DEUX matériaux pour neuf cents murs de
     longueurs différentes, et la texture n'avait pas de répétition : elle
     était donc ÉTIRÉE sur toute la face, quelle qu'en soit la taille. Un mur
     de 11,5 unités et un mur de 2 unités affichaient le même nombre de blocs.
     À l'écran, ça donne des pierres deux fois plus grosses selon le couloir où
     l'on se tient — sans qu'on sache dire pourquoi le décor « sonne faux ».

     Ici, chaque taille de boîte reçoit son matériau, dont la texture est
     CLONÉE (l'image est partagée, seule la répétition change) et réglée sur la
     taille RÉELLE du mur divisée par CFG.WALL_TILE. Comme les murs du
     générateur n'ont qu'une poignée de tailles distinctes, on passe de deux
     matériaux à une douzaine — pas de quoi peser sur le rendu, et la pierre a
     enfin la même échelle partout.
     -------------------------------------------------------------------- */
  const matCache = new Map();
  function stoneMat(cfg, w, h, alt) {
    const key = (alt ? "z" : "x") + w.toFixed(2) + "x" + h.toFixed(2);
    let mm = matCache.get(key);
    if (mm) return mm;
    const map = (alt ? tex.wall2 : tex.wall).clone();
    const bump = (alt ? tex.wallB2 : tex.wallB).clone();
    map.needsUpdate = bump.needsUpdate = true;
    /* ⚠️ UNE SEULE TUILE SUR LA HAUTEUR, ET C'EST VOULU. La texture porte une
       SUIE en haut (il y a une torche murale tous les trois mètres : c'est un
       fait, pas une coquetterie) et une MOUSSE en bas, là où l'eau stagne. Ces
       deux couches décrivent le haut et le bas D'UN MUR, pas d'une tuile : les
       répéter verticalement mettrait une bande de suie au milieu de la
       maçonnerie et de la mousse à mi-hauteur.

       tools/verify-textures.mjs a signalé le problème par sa mesure de
       couture — 7,1 en y contre 2,4 en x — et c'est exactement à ça que sert un
       chiffre : il a montré une asymétrie que personne ne cherchait, et
       l'asymétrie avait une cause physique.

       Conséquence heureuse : à 11 unités de haut pour cinq assises, un bloc
       fait 2,2 unités — la taille relevée sur les images de référence du 394,
       où l'on compte « quatre ou cinq assises sur toute la hauteur d'un mur ».
       On ne répète donc plus verticalement, et il n'y a plus de couture du
       tout dans cet axe. */
    const rx = Math.max(1, Math.round(w / cfg.WALL_TILE));
    map.repeat.set(rx, 1);
    bump.repeat.set(rx, 1);
    void h;
    mm = new THREE_.MeshPhongMaterial({
      map, bumpMap: bump, bumpScale: 0.55,
      shininess: 0, specular: 0x000000,      // = Lambert + relief, sans reflet
    });
    matCache.set(key, mm);
    return mm;
  }

  function buildWalls(cfg, m, st) {
    const geoCache = new Map();
    const group = new THREE_.Group();
    for (const b of st.boxes) {
      const w = b.x1 - b.x0, d = b.z1 - b.z0;
      const key = w.toFixed(2) + "x" + d.toFixed(2);
      let g = geoCache.get(key);
      if (!g) { g = new THREE_.BoxGeometry(w, cfg.WALL_H, d); geoCache.set(key, g); }
      const along = w > d;
      const mesh = new THREE_.Mesh(g, stoneMat(cfg, along ? w : d, cfg.WALL_H, !along));
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
    /* ⚠️ ZIP 405 — SUB, RAG_MIN ET RAG_MAX ONT QUITTÉ CE FICHIER. Ils
       décrivaient la forme du trou du côté du DESSIN, pendant que
       rules.js/handleFloor faisait tomber sur la cellule entière : de la
       pierre visible, praticable, et mortelle sur 2,8 unités de large. On
       demande maintenant la forme au moteur (Rules.holeR), qui est le seul
       à avoir le droit de dire où est le vide. */
    const SUB = cfg.HOLE_SUB;
    const sub = new THREE_.PlaneGeometry(cfg.CELL / SUB, cfg.CELL / SUB);
    // Le sol : une tuile par cellule pile (CFG.FLOOR_TILE = CELL), donc pas de
    // répétition à régler — et le relief, lui, compte double au sol : c'est la
    // surface qu'on voit de plus près et sous l'angle le plus rasant.
    const mats = [
      new THREE_.MeshPhongMaterial({ map: tex.floor, bumpMap: tex.floorB,
        bumpScale: 0.45, shininess: 0, specular: 0x000000 }),
      new THREE_.MeshPhongMaterial({ map: tex.floor2, bumpMap: tex.floorB2,
        bumpScale: 0.45, shininess: 0, specular: 0x000000 }),
    ];
    const mat = mats[0];
    const group = new THREE_.Group();
    for (let y = 0; y < m.G; y++) for (let x = 0; x < m.G; x++) {
      const j = m.idx(x, y);
      if (!m.cells[j]) continue;
      // La rotonde a son propre sol, en gradins : voir buildRotunda.
      if (inRotunda(m, x, y)) continue;
      const [wx, wz] = Rules.centerOf(cfg, x, y);
      if (!st.gaps.has(j)) {
        const mesh = new THREE_.Mesh(full, mats[(x * 7 + y * 13) % 2]);
        /* ⚠️ ZIP 405 — LA DALLE EST RETENUE PAR SON INDICE, et c'est une
           correction, pas une commodité. buildFloor était appelé UNE fois et
           son résultat jeté (`buildFloor(cfg, m, st);` sans affectation) :
           plus personne ne pouvait donc toucher une dalle après la
           construction. Conséquence, découverte en cherchant tout autre
           chose : une dalle fêlée ne tremblait pas (CRACK_SHAKE était déclaré
           et lu par PERSONNE), et une dalle EFFONDRÉE restait dessinée pour
           toujours. On tombait donc à travers un dallage intact, et — bien
           pire — la cellule effondrée continuait de se présenter comme de la
           pierre saine pendant tout le reste de la partie. C'est la seconde
           cause, indépendante de la première, du « je suis mort en tombant
           dans le lac alors que je ne suis pas allé dans la crevasse ». */
        floorTiles.set(j, mesh);
        mesh.rotation.x = -Math.PI / 2;
        /* ⚠️ LA ROTATION DU DALLAGE NE COÛTE RIEN ET CASSE TOUT LE MOTIF.
           Le plan est carré et sa texture aussi : le tourner d'un quart de
           tour dans son propre plan revient à faire pivoter l'image, sans
           second matériau, sans seconde texture, sans un octet de mémoire.
           Deux dessins × quatre orientations = huit dallages distincts, et la
           grille du labyrinthe cesse de se lire à travers son sol. */
        mesh.rotation.z = ((x * 5 + y * 3) % 4) * Math.PI / 2;
        mesh.position.set(wx, 0, wz);
        group.add(mesh);
        continue;
      }
      for (let sj = 0; sj < SUB; sj++) for (let si = 0; si < SUB; si++) {
        const fx = (si + 0.5) / SUB - 0.5, fz = (sj + 0.5) / SUB - 0.5;
        // Le bord déchiqueté vient du MOTEUR, sans marge : le rendu dessine le
        // contour exact, le moteur s'accorde HOLE_GRIP de margelle par-dessus.
        // C'est le seul écart entre les deux, il est d'un tiers de sous-dalle,
        // et il va dans le sens du joueur.
        if (Rules.inHole(cfg, j, fx, fz, 0)) continue;   // dans le trou : pas de dalle
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
    /* ⚠️ ZIP 405 — LE FÛT VIOLET FAIT DÉSORMAIS LA TAILLE DU TROU. Il était
       écrit 0,30 / 0,40 de cellule, tout près des 0,26 / 0,46 du trou sans
       jamais les valoir : la colonne qui dit « ici, le vide » débordait donc
       d'un côté et rentrait de l'autre. Maintenant qu'on ne tombe QUE dans le
       trou, ce halo est la seule chose qu'on voie du bord à distance : il doit
       en donner la mesure exacte, sinon il redevient un décor qui ment. */
    const g = new THREE_.CylinderGeometry(cfg.CELL * cfg.HOLE_R_MIN, cfg.CELL * cfg.HOLE_R_MAX,
                                          cfg.LAKE_GLOW_UP, 8, 1, true);
    holeGlowGeo = g; holeGlowMat = mat;   // zip 405 : relus par syncFloor()
    for (const j of st.gaps) {
      const x = j % m.G, y = (j / m.G) | 0;
      const [wx, wz] = Rules.centerOf(cfg, x, y);
      const mesh = new THREE_.Mesh(g, mat);
      mesh.position.set(wx, cfg.LAKE_GLOW_UP / 2 - 1.0, wz);
      scene.add(mesh);
      holeGlows.push(mesh);
      // Une petite lampe violette au fond de chaque trou : c'est elle qui
      // éclaire le bord par en dessous, comme sur l'image 2.
      addEmitter(cfg.COL_PURPLE, 1.1, cfg.CELL * 2.6, 2, wx, -2.2, wz);   // zip 399
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

    /* ⚠️ ZIP 405 — UN SEUL NOMBRE DE SEGMENTS POUR TOUTE LA SALLE.
       Le pourtour était un 44-gone, les gradins des 40-gones, tous inscrits
       dans les MÊMES cercles : deux polygones de pas différents ne se
       rejoignent nulle part, et entre leurs cordes s'ouvraient des croissants
       de 11 mm par lesquels on voyait le lac neuf mètres plus bas. Guillaume :
       « il y a des interstices où l'on voit le lac. » Un seul pas, partout, et
       le défaut devient impossible plutôt que corrigé. */
    const SEG = cfg.ROTUNDA_SEG;

    /* 1. Le pourtour plat.
       ⚠️ IL DÉBORDE MAINTENANT DE ROTUNDA_LAP DES DEUX CÔTÉS, et les deux
       débordements réparent deux fentes distinctes :
         * VERS L'INTÉRIEUR, il chevauche le premier gradin : plus aucune
           corde ne peut découvrir le vide, même si les pas divergeaient un
           jour ;
         * VERS L'EXTÉRIEUR, il dépassait à rad + 0,6 = 28,35 alors que le
           dallage ordinaire s'arrête au bord de la cellule de rotonde, à
           28,75. Il manquait donc 40 cm de sol AUX QUATRE PORTES — pile à
           l'endroit où l'on entre, et pile là où l'on regarde ses pieds. Le
           reste de cet anneau est sous la maçonnerie de la couronne : il ne
           coûte rien et ne se voit pas. */
    const rim = new THREE_.Mesh(
      new THREE_.RingGeometry(pit - cfg.ROTUNDA_LAP, rad + cfg.ROTUNDA_RIM_OUT, SEG), matF);
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(ccx, 0.02, ccz);
    grp.add(rim);

    /* 2. LES GRADINS — DES ANNEAUX, PLUS DES DISQUES. C'est la correction du
       second reproche : « au centre on s'enfonce un peu dans le sol ».

       ⚠️ CE QUI SE PASSAIT, ET POURQUOI PERSONNE NE L'AVAIT VU. Les trois
       gradins étaient des CylinderGeometry, donc des cylindres PLEINS,
       chapeaux compris. Le premier — rayon 20,75, dessus à −1,17 — couvrait
       donc à lui seul toute la fosse, et masquait les deux autres : la salle
       en gradins était en réalité une assiette plate. Pendant ce temps
       Rules.groundY, elle, descendait bien jusqu'à −3,51 au centre, et c'est
       elle qui pose le fermier. On marchait donc SOUS le sol qu'on voyait,
       jusqu'à 2,34 unités plus bas — un fermier à mi-cuisses dans la pierre.
       Chaque ligne était juste : c'est la GÉOMÉTRIE qui mentait, et il fallait
       la regarder de côté pour le voir.

       Maintenant : un ANNEAU horizontal par terrasse (le plat sur lequel on
       marche) et une contremarche OUVERTE à son bord (le flanc qu'on voit).
       Les rayons et les hauteurs restent ceux de Rules.groundY, terme pour
       terme — c'est toujours elle qui décrit le sol, on ne fait que le
       dessiner. */
    for (let i = 0; i < cfg.ROTUNDA_RINGS; i++) {
      const rOut = pit * (1 - i / cfg.ROTUNDA_RINGS);
      const rIn = i === cfg.ROTUNDA_RINGS - 1 ? 0 : pit * (1 - (i + 1) / cfg.ROTUNDA_RINGS);
      const top = -(i + 1) * cfg.ROTUNDA_DROP;
      // le plat : un anneau, ou un disque pour la dernière terrasse
      const tread = new THREE_.Mesh(
        rIn > 0 ? new THREE_.RingGeometry(rIn - cfg.ROTUNDA_LAP, rOut, SEG)
                : new THREE_.CircleGeometry(rOut, SEG), i % 2 ? matW : matF);
      tread.rotation.x = -Math.PI / 2;
      tread.position.set(ccx, top, ccz);
      grp.add(tread);
      /* la contremarche : un cylindre OUVERT (pas de chapeau, donc rien à
         masquer), qui descend du gradin précédent jusqu'à celui-ci. Il est
         allongé de ROTUNDA_LAP vers le bas pour mordre sur le plat suivant :
         deux surfaces qui se touchent pile finissent toujours par laisser
         passer un trait de lumière. DoubleSide parce qu'on la voit de dedans
         en descendant et de dehors en remontant. */
      const riser = new THREE_.Mesh(
        new THREE_.CylinderGeometry(rOut, rOut, cfg.ROTUNDA_DROP + cfg.ROTUNDA_LAP, SEG, 1, true),
        new THREE_.MeshLambertMaterial({ map: tex.wall, side: THREE_.DoubleSide }));
      riser.position.set(ccx, top + cfg.ROTUNDA_DROP / 2 - cfg.ROTUNDA_LAP / 2, ccz);
      grp.add(riser);
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
        /* ⚠️ ZIP 405 — LES MARCHES SONT RELEVÉES DE ROTUNDA_LAP. Elles étaient
           posées à la hauteur EXACTE de Rules.groundY, ce qui est juste ; mais
           au centre de la salle, la dernière marche et la dernière terrasse
           tombent au même millimètre (−3,51 toutes les deux), et deux plans
           coplanaires scintillent l'un à travers l'autre. Un millimètre de
           préséance coûte moins qu'un test de plus, et il va dans le bon
           sens : c'est l'escalier qu'on doit voir posé sur les gradins. */
        s2.position.set(ccx, top - 3.5 + cfg.ROTUNDA_LAP, z);
        grp.add(s2);
      }
    }
    /* ⚠️ LES DEUX JOUES DE PIERRE ONT ÉTÉ RETIRÉES AU 405 — DÉCISION PRISE
       SEUL, ET VOICI POURQUOI, POUR QU'ELLE PUISSE ÊTRE ANNULÉE.
       C'étaient deux longues boîtes par volée, tendues sur toute la descente à
       une hauteur FIXE (dessus à −1,76), posées au 396 pour que « l'escalier en
       boîtes ne flotte pas au-dessus des gradins ». Une hauteur fixe le long
       d'un escalier qui descend de 0 à −3,51 ne peut être juste qu'en un
       point : partout ailleurs la joue plonge sous les marches, ou DÉPASSE
       au-dessus de la terrasse voisine. Et là elle devient un parapet de pierre
       parfaitement visible que Rules.groundY ignore — donc qu'on traverse en
       marchant. C'est le défaut jumeau de celui qu'on répare ici : d'un côté on
       marchait sous le sol, de l'autre on marchait dans un mur.
       C'est verify-rotonde.mjs qui les a dénoncées, sur 16 points de mesure,
       sans qu'on lui ait demandé de les chercher.
       Elles ne sont pas remplacées, elles sont SUPPRIMÉES, parce que le
       problème qu'elles réglaient n'existe plus : les marches sont des boîtes
       de 7 unités de haut et les gradins sont désormais dessinés en anneaux
       avec leurs contremarches, si bien que le flanc de l'escalier est de la
       pierre pleine et se voit taillé dans la pente. Si à l'œil la volée
       paraissait quand même nue, la façon de les rétablir sans refaire le
       défaut est de les poser PAR MARCHE et ENTIÈREMENT dans la bande de
       l'escalier (|x − ccx| < ROTUNDA_STAIR_W/2), là où groundY décrit la
       marche et non la terrasse. */

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
          addEmitter(cfg.COL_TORCH, 1.1, C * 3.2, 2,          // zip 399
                     ccx + Math.cos(a) * (rad - 3), h + 2, ccz + Math.sin(a) * (rad - 3));
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
    addEmitter(cfg.SKY_HORIZON, 1.3, C * 6, 2, ccx, 12, ccz);   // zip 399

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
    addEmitter(cfg.COL_PURPLE, 1.5, C * 3, 2, ex, 3.0, zEdge + cfg.PLATFORM_LEN * 0.5);   // zip 399

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
  /* =======================================================================
     ZIP 397 — LE MODÈLE DE VUE. La pièce qui fait qu'un FPS est un FPS.
     -----------------------------------------------------------------------
     Guillaume : « ce doit être au niveau des first person shooters
     existants ». Voici la différence la plus visible, et ce n'est pas la
     caméra : ce sont LES MAINS.

     ⚠️ IL EST RENDU DANS UNE SECONDE PASSE, AVEC SA PROPRE SCÈNE ET SA PROPRE
     CAMÉRA. C'est la technique standard du genre et elle n'est pas un
     raffinement : une arme placée dans la scène principale RENTRE DANS LE MUR
     dès qu'on s'y colle — et dans un labyrinthe, on se colle aux murs en
     permanence. Deux passes, `autoClear = false` entre les deux, tampon de
     profondeur remis à zéro : l'arme est toujours devant, toujours entière,
     et rien d'autre ne change.

     Le champ de la seconde caméra est PLUS ÉTROIT (VM_FOV 55° contre 78°) :
     une arme filmée au grand-angle paraît difforme, la crosse énorme et la
     pointe minuscule. Tous les jeux du genre font ça, et pour cette raison-là.

     ⚠️ IL EST ÉCLAIRÉ PAR SA PROPRE LUMIÈRE, chaude et fixe. Il ne peut pas
     partager celle du monde (elle est dans l'autre scène), et c'est heureux :
     on veut que les mains restent lisibles quand la torche meurt, sinon
     l'écran devient noir avec un rectangle noir dessus.
     ======================================================================= */
  function buildViewModel(cfg, sk) {
    vmScene = new THREE_.Scene();
    vmCam = new THREE_.PerspectiveCamera(cfg.VM_FOV, 1, 0.02, 12);
    vmScene.add(new THREE_.AmbientLight(0xffffff, 0.62));
    const key = new THREE_.PointLight(cfg.COL_TORCH, 1.5, 6, 1.6);
    key.position.set(-0.5, 0.35, -0.4);
    vmScene.add(key);

    const skinC = (sk && sk.skin) || cfg.COL_SKIN;
    const shirtC = (sk && sk.shirt) || cfg.COL_SHIRT;
    const lam = (c) => new THREE_.MeshLambertMaterial({ color: c });
    const box = (w, h, d, c) => new THREE_.Mesh(new THREE_.BoxGeometry(w, h, d), lam(c));

    const root = new THREE_.Group();
    vmScene.add(root);

    /* --- LA MAIN GAUCHE ET LA TORCHE.
       Le poing est fait de quatre doigts SÉPARÉS plutôt que d'un bloc : au
       premier plan, à trente centimètres de l'œil, un moignon se voit
       immédiatement. C'est le seul endroit du jeu où le détail d'une main
       compte, et c'est là qu'il faut le mettre. */
    const left = new THREE_.Group();
    left.position.set(-0.42, -0.34, -0.62);
    root.add(left);
    const sleeveL = box(0.20, 0.20, 0.42, shirtC);
    sleeveL.position.set(0, -0.06, 0.20);
    left.add(sleeveL);
    const cuffL = box(0.23, 0.22, 0.09, Paint.mix(shirtC, 0xffffff, 0.25));
    cuffL.position.set(0, -0.05, 0.02);
    left.add(cuffL);
    const palmL = box(0.17, 0.19, 0.16, skinC);
    left.add(palmL);
    for (let i = 0; i < 4; i++) {
      const f = box(0.16, 0.042, 0.05, skinC);
      f.position.set(0.005, 0.075 - i * 0.048, -0.075);
      left.add(f);
    }
    const thumbL = box(0.055, 0.10, 0.06, skinC);
    thumbL.position.set(0.075, 0.05, -0.03);
    left.add(thumbL);
    const shaft = new THREE_.Mesh(new THREE_.CylinderGeometry(0.045, 0.055, 1.15, 6),
      new THREE_.MeshLambertMaterial({ map: tex.wood }));
    shaft.position.set(0, 0.42, -0.02);
    left.add(shaft);
    const wrap = box(0.11, 0.16, 0.11, cfg.COL_BARK_DARK);
    wrap.position.set(0, 0.02, -0.02);
    left.add(wrap);
    const vmFlame = new THREE_.Mesh(new THREE_.PlaneGeometry(0.62, 0.86),
      new THREE_.MeshBasicMaterial({ map: flameCuts[0], transparent: true,
        blending: THREE_.AdditiveBlending, depthWrite: false, fog: false }));
    vmFlame.position.set(0, 1.28, -0.02);
    left.add(vmFlame);
    const vmHalo = new THREE_.Mesh(new THREE_.PlaneGeometry(2.6, 2.6),
      new THREE_.MeshBasicMaterial({ map: tex.haloWarm, transparent: true, opacity: 0.45,
        blending: THREE_.AdditiveBlending, depthWrite: false, fog: false }));
    vmHalo.position.set(0, 1.22, -0.05);
    left.add(vmHalo);

    /* --- LA MAIN DROITE. Elle porte l'épée OU l'arbalète, jamais les deux :
       `swordG.visible` / `bowG.visible` s'excluent dans sync(). Le poing, lui,
       est commun — c'est la même main. */
    const right = new THREE_.Group();
    right.position.set(0.46, -0.40, -0.60);
    root.add(right);
    const sleeveR = box(0.20, 0.20, 0.42, shirtC);
    sleeveR.position.set(0, -0.06, 0.20);
    right.add(sleeveR);
    const gloveR = box(0.19, 0.20, 0.18, cfg.COL_BARK);
    right.add(gloveR);
    for (let i = 0; i < 4; i++) {
      const f = box(0.17, 0.044, 0.05, cfg.COL_BARK);
      f.position.set(-0.005, 0.078 - i * 0.05, -0.08);
      right.add(f);
    }

    // ---- l'épée, dans le prolongement de l'avant-bras
    const swordG = new THREE_.Group();
    right.add(swordG);
    const grip = new THREE_.Mesh(new THREE_.CylinderGeometry(0.036, 0.040, 0.30, 6), lam(cfg.COL_BARK_DARK));
    grip.position.set(0, 0.10, -0.02);
    swordG.add(grip);
    const pommel = box(0.09, 0.07, 0.09, cfg.COL_STEEL_EDGE);
    pommel.position.set(0, -0.06, -0.02);
    swordG.add(pommel);
    const cross = box(0.42, 0.055, 0.09, cfg.COL_STEEL_EDGE);
    cross.position.set(0, 0.26, -0.02);
    swordG.add(cross);
    const blade = box(0.115, 1.32, 0.036, cfg.COL_STEEL);
    blade.position.set(0, 0.96, -0.02);
    swordG.add(blade);
    const fuller = box(0.036, 1.18, 0.045, cfg.COL_STEEL_EDGE);
    fuller.position.set(0, 0.95, -0.02);
    swordG.add(fuller);
    const tip = box(0.075, 0.19, 0.03, cfg.COL_STEEL);
    tip.position.set(0, 1.70, -0.02);
    swordG.add(tip);
    // trois runes sur la lame : ce sont elles qu'on regarde en marchant
    for (let i = 0; i < 3; i++) {
      const r2 = box(0.05, 0.05, 0.05, cfg.COL_RUNE);
      r2.position.set(0, 0.62 + i * 0.30, -0.045);
      swordG.add(r2);
    }

    // ---- l'arbalète
    const bowG = new THREE_.Group();
    bowG.visible = false;
    right.add(bowG);
    const bstock = new THREE_.Mesh(new THREE_.BoxGeometry(0.16, 0.15, 1.05),
      new THREE_.MeshLambertMaterial({ map: tex.wood }));
    bstock.position.set(-0.10, 0.06, -0.42);
    bowG.add(bstock);
    const bbutt = box(0.16, 0.22, 0.22, cfg.COL_BARK);
    bbutt.position.set(-0.10, -0.01, 0.05);
    bowG.add(bbutt);
    const blimb = box(1.15, 0.085, 0.11, cfg.COL_STEEL_EDGE);
    blimb.position.set(-0.10, 0.10, -0.86);
    bowG.add(blimb);
    const bstring = box(1.02, 0.022, 0.022, cfg.COL_SAND);
    bstring.position.set(-0.10, 0.10, -0.60);
    bowG.add(bstring);
    const bnut = box(0.10, 0.10, 0.12, cfg.COL_STEEL);
    bnut.position.set(-0.10, 0.13, -0.34);
    bowG.add(bnut);
    const loaded = box(0.05, 0.05, 0.62, cfg.COL_STEEL);
    loaded.position.set(-0.10, 0.15, -0.66);
    bowG.add(loaded);
    const bhead = box(0.085, 0.085, 0.13, cfg.COL_STEEL_EDGE);
    bhead.position.set(-0.10, 0.15, -1.02);
    bowG.add(bhead);

    vm = { root, left, right, swordG, bowG, flame: vmFlame, halo: vmHalo, loaded, key };
  }

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
          addEmitter(cfg.COL_TORCH, 0.85, cfg.CELL * 1.9, 2,     // zip 399
                     t.position.x + S.dx * -1.0, cfg.WALL_TORCH_H + 2, t.position.z + S.dz * -1.0);
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
      // zip 399 : un ÉMETTEUR, plus une PointLight. `lamp.intensity` reste
      // écrit tel quel par sync() quand le brasier est consommé.
      const lamp = addEmitter(cfg.COL_TORCH, 1.9, cfg.CELL * 3.4, 2, wx, gy + 5.2, wz);
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
      addEmitter(cfg.COL_COIN_GLOW, 1.6, cfg.CELL * 2.4, 2, wx, 3.4, wz);   // zip 399
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

    /* ====================================================================
       ZIP 397 — LA CARTE LUISANTE, ACCROCHÉE AU MUR.
       --------------------------------------------------------------------
       Guillaume : « avoir un bonus qui permet de voir le plan du maze (quand
       on trouve une carte luisante accrochée au mur) ».

       ⚠️ ELLE EST PLAQUÉE SUR LA FACE QUE LE GÉNÉRATEUR A CHOISIE, pas sur
       une face devinée ici. maze.js sait quelles faces sont fermées ; les
       redécouvrir dans le rendu, ce serait une seconde description de la même
       chose, et la seconde finit toujours par se tromper (leçon du 387) — ici
       elle collerait un parchemin dans le vide au-dessus d'un couloir.

       Le halo est PLUS GRAND que la feuille et il ne dépend pas du
       brouillard : c'est lui qu'on voit d'abord, du bout d'un couloir, et
       c'est tout ce qu'on lui demande. Une carte qu'on ne remarque pas est
       une carte qui n'existe pas. */
    if (st.mapItem) {
      const it = st.mapItem;
      const grp = new THREE_.Group();
      const sheet = new THREE_.Mesh(new THREE_.PlaneGeometry(3.2, 2.4),
        new THREE_.MeshBasicMaterial({ map: tex.mapSheet, transparent: true, fog: false,
          side: THREE_.DoubleSide }));
      grp.add(sheet);
      const halo = new THREE_.Mesh(new THREE_.PlaneGeometry(11, 11),
        new THREE_.MeshBasicMaterial({ map: tex.haloCyan, color: cfg.COL_MAPGLOW,
          transparent: true, opacity: 0.55, blending: THREE_.AdditiveBlending,
          depthWrite: false, fog: false }));
      halo.position.z = -0.05;
      grp.add(halo);
      const [wx, wz] = Rules.centerOf(cfg, it.x, it.y);
      /* La face : N = -Z, E = +X, S = +Z, W = -X (voir Rules.N/E/S/W). On
         décale la feuille jusqu'au mur et on la tourne pour qu'elle regarde
         VERS le couloir. */
      const off = cfg.HALF - cfg.WALL * 0.5 - 0.15;
      let dx = 0, dz = 0, ry = 0;
      if (it.dir === Rules.N) { dz = -off; ry = 0; }
      else if (it.dir === Rules.S) { dz = off; ry = Math.PI; }
      else if (it.dir === Rules.E) { dx = off; ry = -Math.PI / 2; }
      else { dx = -off; ry = Math.PI / 2; }
      grp.position.set(wx + dx, Rules.groundY(cfg, m, wx, wz) + cfg.CHALK_H, wz + dz);
      grp.rotation.y = ry;
      scene.add(grp);
      // zip 399 : idem — sync() écrit `mapMesh.lamp.intensity`, inchangé.
      const lamp = addEmitter(cfg.COL_MAPGLOW, 1.5, cfg.MAP_GLOW_RANGE, 2,
                              wx + dx * 0.4, cfg.CHALK_H, wz + dz * 0.4);
      mapMesh = { grp, it, halo, lamp };
    }

    /* L'ARBALÈTE et LES CARREAUX, posés au sol. Même grammaire visuelle que
       l'épée — un halo, une couleur froide — parce que le joueur a appris en
       trente secondes que « froid et lumineux = à ramasser », et qu'inventer
       une seconde grammaire pour la seconde arme, c'est la lui faire
       réapprendre pour rien. */
    if (st.bow) {
      const grp = new THREE_.Group();
      const stock = new THREE_.Mesh(new THREE_.BoxGeometry(0.34, 0.30, 2.1),
        new THREE_.MeshLambertMaterial({ map: tex.wood }));
      grp.add(stock);
      const arms = new THREE_.Mesh(new THREE_.BoxGeometry(2.5, 0.20, 0.24),
        new THREE_.MeshLambertMaterial({ color: cfg.COL_STEEL_EDGE }));
      arms.position.z = -0.7;
      grp.add(arms);
      const halo = new THREE_.Mesh(new THREE_.PlaneGeometry(6.5, 6.5),
        new THREE_.MeshBasicMaterial({ map: tex.haloCyan, transparent: true, opacity: 0.55,
          blending: THREE_.AdditiveBlending, depthWrite: false, fog: false }));
      grp.add(halo);
      const [wx, wz] = Rules.centerOf(cfg, st.bow.x, st.bow.y);
      grp.position.set(wx, Rules.groundY(cfg, m, wx, wz) + 1.5, wz);
      scene.add(grp);
      bowMesh = { grp, halo, b: st.bow };
    }
    const bg = new THREE_.BoxGeometry(0.14, 0.14, 1.5);
    for (const bp of st.boltPacks) {
      const grp = new THREE_.Group();
      for (let k = 0; k < 3; k++) {
        const b2 = new THREE_.Mesh(bg, new THREE_.MeshLambertMaterial({ color: cfg.COL_STEEL_EDGE }));
        b2.position.set((k - 1) * 0.22, 0, 0);
        b2.rotation.z = 0.18 * (k - 1);
        grp.add(b2);
      }
      const halo = new THREE_.Mesh(new THREE_.PlaneGeometry(3.2, 3.2),
        new THREE_.MeshBasicMaterial({ map: tex.haloCyan, transparent: true, opacity: 0.42,
          blending: THREE_.AdditiveBlending, depthWrite: false, fog: false }));
      grp.add(halo);
      const [wx, wz] = Rules.centerOf(cfg, bp.x, bp.y);
      grp.position.set(wx, Rules.groundY(cfg, m, wx, wz) + 0.9, wz);
      scene.add(grp);
      boltPackMeshes.push({ grp, halo, b: bp });
    }
    /* LES CARREAUX EN VOL. Une réserve de huit, recyclée : rules.js peut en
       avoir plusieurs en l'air (le rechargement dure 0,9 s, le vol 1,4 s), et
       créer un maillage par tir ferait tousser le ramasse-miettes au pire
       moment — pendant un combat. Même motif que sparkPool. */
    const pg2 = new THREE_.BoxGeometry(0.13, 0.13, 1.35);
    for (let i = 0; i < 8; i++) {
      const mm = new THREE_.Mesh(pg2, new THREE_.MeshBasicMaterial({ color: cfg.COL_STEEL, fog: false }));
      mm.visible = false;
      scene.add(mm);
      boltPool.push(mm);
    }
  }

  /* =======================================================================
     ZIP 397 — LES MARQUES DE CRAIE, collées sur les murs.
     -----------------------------------------------------------------------
     Ce sont des DÉCALQUES : un plan transparent posé à deux centimètres du
     mur. Deux détails les rendent crédibles, et les deux ont été trouvés en
     regardant :

       * elles sont posées LÉGÈREMENT DE TRAVERS (rotation.z bruitée). Une
         marque parfaitement d'aplomb se lit comme une icône d'interface, pas
         comme une trace laissée par quelqu'un ;
       * la FLÈCHE est tournée vers la direction qu'elle indique — donc son
         angle vient de maze.js, qui connaît le chemin. Une flèche qui pointe
         au hasard serait pire que pas de flèche du tout : elle mentirait, et
         un joueur qui a été trompé une fois n'en regarde plus aucune.
     ======================================================================= */
  function buildChalk(cfg, m) {
    if (!m.chalk || !m.chalk.length) return;
    const g = new THREE_.PlaneGeometry(3.0, 3.0);
    const mats = tex.chalk.map(t => new THREE_.MeshBasicMaterial({
      map: t, transparent: true, opacity: 0.82, depthWrite: false, fog: true }));
    const grp = new THREE_.Group();
    for (const c of m.chalk) {
      const [wx, wz] = Rules.centerOf(cfg, c.x, c.y);
      const off = cfg.HALF - cfg.WALL * 0.5 - 0.12;
      let dx = 0, dz = 0, ry = 0;
      if (c.face === Rules.N) { dz = -off; ry = 0; }
      else if (c.face === Rules.S) { dz = off; ry = Math.PI; }
      else if (c.face === Rules.E) { dx = off; ry = -Math.PI / 2; }
      else { dx = -off; ry = Math.PI / 2; }
      const mesh = new THREE_.Mesh(g, mats[c.kind] || mats[0]);
      mesh.position.set(wx + dx, Rules.groundY(cfg, m, wx, wz) + cfg.CHALK_H, wz + dz);
      mesh.rotation.y = ry;
      /* ⚠️ UNE FLÈCHE SUR UN MUR NE PEUT DÉSIGNER QUE LA GAUCHE OU LA DROITE,
         et il a fallu écrire la projection pour s'en rendre compte. Le décalque
         est plaqué sur une surface VERTICALE : son plan ne contient pas la
         normale du mur, donc la composante « vers l'avant » de la direction à
         indiquer n'est pas représentable. On projette :

           localX (monde) = ( cos ry, 0, −sin ry )
           direction      = ( −sin to, 0, −cos to )     (convention ang du jeu)
           produit        = −sin(to − ry)

         Le signe de ce produit dit tout : positif, la flèche va vers son +X
         (roulis 0) ; négatif, vers son −X (roulis π). Un roulis CONTINU aurait
         donné des flèches pointant en biais vers le plafond — juste selon la
         formule, absurde sur un mur. */
      const proj = -Math.sin(c.to - ry);
      mesh.rotation.z = (c.kind === 0 || c.kind === 3)
        ? (proj < 0 ? Math.PI : 0) + (Paint.noise(c.x * 31 + c.y) - 0.5) * 0.18
        : (Paint.noise(c.x * 17 + c.y * 7) - 0.5) * 0.34;
      grp.add(mesh);
    }
    scene.add(grp);
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
    // ⚠️ Zip 405 : les collections neuves se remettent à zéro AVEC les autres.
    // Sans cette ligne, la seconde partie garderait les dalles de la première
    // et en cacherait au hasard — le défaut du 393, à l'identique.
    floorTiles = new Map(); holeGlowGeo = null; holeGlowMat = null;
    roamerRigs = []; playerRig = null; stalkerRig = null; stalkerHalo = null; prev = null;
    stalkerMesh = null; sword3 = null; player = null;
    torchMesh = null; flameMesh = null; torchHalo = null; skyMesh = null;
    // ⚠️ Zip 396 : les collections neuves se remettent à zéro AVEC les autres.
    // C'est la ligne qu'on oublie, et c'est le défaut du 393 — la deuxième
    // partie plantait, celle qu'on joue toujours.
    lakeMists = []; roamerHud = []; sparkPool = []; soulPool = []; scorePool = [];
    gateMesh = null; platformGroup = null; rotundaGroup = null; stalkerFlash = null;
    stalkerHud = null;          // zip 405, et pour la même raison que les autres
    // ⚠️ Zip 397 : les collections neuves se remettent à zéro AVEC les autres.
    // C'est la ligne qu'on oublie à chaque zip, et c'est le défaut du 393 —
    // la deuxième partie plantait, celle qu'on joue toujours.
    mapMesh = null; bowMesh = null; boltPackMeshes = []; boltPool = [];
    vmScene = null; vmCam = null; vm = null;
    pitch = pitchWant = 0; swayX = swayY = 0;
    bobT = { y: 0, x: 0, roll: 0 };
    /* ⚠️⚠️ L'ORDRE EST CRITIQUE : ON LIBÈRE AVANT DE REMPLACER.
       `disposeScene()` parcourt `scene` — donc tant que `scene` désigne encore
       le monde PRÉCÉDENT. Posé trois lignes plus bas, après
       `scene = new Scene()`, il libérait consciencieusement une scène vide et
       la fuite restait entière : c'est le premier état qu'a signalé
       smoke-render.mjs, avec « 0 objets rendus au GPU ». Un appel juste, au
       mauvais endroit, ne fait rien du tout et ne dit rien. */
    disposeScene();
    matCache.clear();
    /* ⚠️ ZIP 399 — LES ÉMETTEURS ET LE POOL SE REMETTENT À ZÉRO AVEC LE RESTE.
       C'est la ligne qu'on oublie à chaque zip (voir le 393, le 396 et le 397 :
       la deuxième partie plantait à chaque fois, et c'est celle qu'on joue
       toujours). Un émetteur qui survivrait à une partie éclairerait un mur qui
       n'existe plus, et le pool suivrait des positions du dédale précédent. */
    emitters = []; lightPool = []; lightSlots = []; poolReady = false;
    lightPeak = 0; wantEm.length = 0;
    frameLog.length = 0; frameSeen = 0; hangStrikes = 0; hangFlag = false;
    demoted = false; demotedTo = null;

    scene = new THREE_.Scene();
    scene.fog = new THREE_.Fog(cfg.COL_FOG, cfg.FOG_NEAR_FULL, cfg.FOG_FAR_FULL);

    /* ⚠️ LE PLAN DE COUPE PROCHE DESCEND À 0,05 EN VUE SUBJECTIVE. À 0,1, on
       voyait à travers un mur dès qu'on s'y collait — le corps a un rayon de
       0,9, mais l'œil, lui, peut arriver à quelques centimètres d'une arête de
       boîte. C'est le défaut le plus banal du passage en subjectif, et le
       seul qui donne l'impression que le décor n'est pas solide. */
    camera = new THREE_.PerspectiveCamera(fpsView ? cfg.FPS_FOV : cfg.CAM_FOV,
      1, fpsView ? 0.05 : 0.1, m.G * cfg.CELL * 4);
    /* ⚠️⚠️ ZIP 399 — LE RENDERER EST RÉUTILISÉ, ET L'ANCIEN MONDE EST LIBÉRÉ.
       C'EST LA DEUXIÈME CAUSE DU JEU INJOUABLE, ET ELLE ÉTAIT INVISIBLE.

       Cette ligne disait `renderer = new THREE_.WebGLRenderer({ canvas })`, à
       chaque appel de init() — c'est-à-dire à chaque nouvelle partie, ET une
       fois de plus au démarrage (voir game.js/boot, qui construit un dédale
       pour l'écran-titre). Or `canvas.getContext()` rend TOUJOURS le même
       contexte WebGL : on n'obtenait donc pas un second contexte, on obtenait
       un second RENDERER posé sur le premier, avec ses propres caches de
       programmes, de textures et de tampons. Conséquences, toutes silencieuses :

         * les 3 465 géométries, les 12 textures clonées et les 1 194 matériaux
           du monde précédent restaient alloués sur le GPU pour toujours —
           personne n'appelait `dispose()`, et il n'y en avait AUCUN dans tout
           le fichier ;
         * et surtout TOUS LES SHADERS ÉTAIENT RECOMPILÉS. Un shader Phong à
           123 lumières met des centaines de millisecondes à compiler sur
           Metal. On les payait deux fois, dont une pile au moment où le joueur
           clique sur « Entrer » — le « gel du lancement » que le 396 croyait
           avoir corrigé, et qui n'était qu'à moitié traité.

       On garde donc un seul renderer pour toute la vie de la page (son cache de
       programmes survit, donc rejouer ne recompile plus rien), et on rend
       explicitement au GPU tout ce que la scène précédente tenait. */
    if (!renderer) {
      renderer = new THREE_.WebGLRenderer({ canvas, antialias: false });
    }
    qual = qualOf(cfg, qName);
    baseRatio = baseRatioOf();
    resScale = qual.maxRes;
    renderer.setPixelRatio(baseRatio * resScale);

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
    buildChalk(cfg, m);        // zip 397 : les indices de craie
    buildPlatform(cfg, m);      // zip 396 : le renoncement...
    buildGate(cfg, m, st);      // ... et ce qui le referme
    buildFx(cfg);               // ... et les effets du combat

    /* ⚠️ LE POOL EST CONSTRUIT ICI, APRÈS TOUT LE DÉCOR, ET UNE SEULE FOIS.
       Après, parce que c'est le décor qui déclare les émetteurs. Une seule
       fois, parce que le nombre de PointLight présentes dans la scène est
       compilé dans les shaders : en ajouter une en cours de partie recompile
       tout. Voir l'en-tête du groupe de lumières. */
    buildLightPool(cfg);

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
    /* ⚠️ ZIP 405 — LE COMMENTAIRE QUI TENAIT ICI DEPUIS LE 393 EST DEVENU FAUX,
       ET LE VOICI, POUR MÉMOIRE : « Le traqueur a l'éclair du coup porté mais
       NI jauge NI liseré : il n'a pas de points de vie et on ne le tue pas. Lui
       donner une barre serait promettre qu'on peut la vider. » Il avait raison
       tant que la promesse était fausse. Guillaume a décidé au 405 qu'elle
       serait vraie — plusieurs carreaux, et il tombe — donc la barre est
       exactement ce qu'il faut : elle promet ce que le jeu tient.
       Elle est plus large et plus haute que celle d'un rôdeur, et elle est
       VIOLETTE et non rose : ce n'est pas la même créature, et on ne doit pas
       croire une demi-seconde qu'on vient de blesser un rôdeur particulièrement
       grand. */
    stalkerHud = (function () {
      const W = 4.0, H = 0.42;
      const grp = new THREE_.Group();
      grp.add(new THREE_.Mesh(new THREE_.PlaneGeometry(W + 0.22, H + 0.20),
        new THREE_.MeshBasicMaterial({ color: 0x0a0710, transparent: true, opacity: 0.8,
          depthWrite: false, fog: false })));
      const fillG = new THREE_.Group();
      const fill = new THREE_.Mesh(new THREE_.PlaneGeometry(W, H),
        new THREE_.MeshBasicMaterial({ color: cfg.COL_STALKER_EYE, transparent: true, opacity: 0.95,
          depthWrite: false, fog: false }));
      fill.position.x = W / 2;
      fillG.add(fill);
      fillG.position.x = -W / 2;
      grp.add(fillG);
      grp.visible = false;
      scene.add(grp);
      return { grp, fillG, W };
    })();
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
    buildViewModel(cfg, sk);   // zip 397 : les mains, la torche, l'arme
    snapPrev(st);

    cam.x = st.px; cam.y = cfg.CAM_HEIGHT; cam.z = st.pz + cfg.CAM_DIST;
    cam.ang = st.ang;      // zip 396 : la caméra démarre DERRIÈRE, pas en train de rattraper
    resize();
  }

  /* -----------------------------------------------------------------------
     LE TANGAGE — poussé depuis game.js à chaque pas, borné ici.
     -----------------------------------------------------------------------
     ⚠️ IL VIT DANS LE RENDU, PAS DANS LE MOTEUR, et c'est un choix assumé
     (voir le bloc « vue à la première personne » de config.js) : le sol est
     plat, on ne saute pas, on ne vise pas en hauteur, et une épée comme un
     carreau partent à l'horizontale. Le tangage ne décide donc de RIEN — ce
     qui est précisément la condition pour que les dix outils continuent de
     rejouer le même jeu qu'avant la bascule.
     -------------------------------------------------------------------- */
  function addPitch(d, cfg) {
    pitchWant = Math.max(-cfg.PITCH_MAX, Math.min(cfg.PITCH_MAX, pitchWant - d));
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
    /* La caméra du modèle de vue a SON propre rapport d'image. L'oublier est
       le défaut classique de la seconde passe : l'arme s'étire au
       redimensionnement de la fenêtre alors que le décor, lui, reste juste —
       et on cherche longtemps du côté du décor. */
    if (vmCam) { vmCam.aspect = w / h; vmCam.updateProjectionMatrix(); }
  }

  /* -----------------------------------------------------------------------
     sync — l'unique fonction appelée par la boucle. Elle LIT l'état.
     -------------------------------------------------------------------- */
  let lastFrameMs = 0, frameDt = 1 / 60;
  function sync(st, now, alpha) {
    const cfg = CFG_;
    // Intervalle réel entre deux images, borné : un onglet remis au premier
    // plan produit sinon un saut de plusieurs secondes.
    /* ⚠️⚠️ ZIP 399 — L'INTERVALLE BRUT EST GARDÉ À CÔTÉ DU BORNÉ, ET C'EST LE
       CONTRAIRE D'UN DÉTAIL. `frameDt` est BORNÉ À 0,1 s parce qu'il sert à
       l'animation : un onglet remis au premier plan ferait sinon avancer les
       flammes de plusieurs secondes d'un coup. Mais le chien de garde de la
       souris cherche justement des images d'UNE demi-seconde — bornées à 0,1,
       elles deviennent invisibles et le filet ne peut PLUS JAMAIS se
       déclencher. C'est exactement ce qu'a trouvé tools/verify-boot.mjs à sa
       première exécution : le filet était écrit, branché, testé… et muet.
       Une valeur bornée pour animer, une valeur brute pour diagnostiquer. */
    const rawMs = lastFrameMs ? (now - lastFrameMs) : 16.7;
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
    /* ⚠️ ZIP 405 — IL RESTE VISIBLE APRÈS SA MORT, LE TEMPS DE MOURIR. `dead`
       coupe stalkerAwake côté moteur (le voile rouge s'éteint, il cesse de
       chasser) ; ici on garde la silhouette pendant KILL_VANISH_MS pour que la
       colonne d'aspiration ait un corps d'où partir. Même durée, même
       constante et même règle que pour un rôdeur : l'échange le plus cher de
       la partie ne doit pas se terminer par une créature qui clignote hors
       d'existence. */
    const sDead = st.stalker.dead;
    const sVanish = sDead && st.stalker.deadT >= cfg.KILL_VANISH_MS / 1000;
    stalkerMesh.visible = (st.stalkerAwake || sDead) && !sVanish;
    if (stalkerFlash) stalkerFlash.material.opacity = (st.stalker.hitFlash || 0) * 0.45;
    if (stalkerHud) {
      /* LA JAUGE DU TRAQUEUR. Elle n'apparaît qu'une fois `wounded`, c'est-à-
         dire au premier carreau planté : tant qu'on ne l'a pas touché, rien à
         l'écran n'annonce qu'il puisse tomber. Une jauge montrée d'emblée
         aurait vendu la mèche avant même qu'on ait l'arbalète. */
      const show = st.stalker.wounded && !sVanish;
      stalkerHud.grp.visible = show;
      if (show) {
        const k = Math.max(0, st.stalker.hp) / cfg.STALK_HP;
        stalkerHud.fillG.scale.x = k;
        stalkerHud.grp.position.set(st.stalker.x, Rules.groundY(cfg, M_, st.stalker.x, st.stalker.z) + 5.2,
                                    st.stalker.z);
        stalkerHud.grp.lookAt(camera.position);
      }
    }
    if (stalkerMesh.visible) {
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

    syncFloor(st, cfg, t);      // zip 405 : les dalles qui cèdent, enfin visibles
    syncGate(st, cfg, t);
    syncFx(st, cfg, t);
    /* ⚠️ LA CAMÉRA EST POSÉE AVANT LE RESTE. Une bonne moitié de la scène
       (halos, flammes, jauges) fait `lookAt(camera.position)` : la poser après
       ferait regarder tout ce petit monde vers la position de l'image
       PRÉCÉDENTE. Une image de retard sur un plan face-caméra ne se voit pas ;
       sur une jauge de vie au-dessus d'un rôdeur qu'on longe, si. */
    if (fpsView) updateCameraFPS(st, cfg, px, pz, pang, pgait);
    else updateCamera(st, cfg, px, pz, pang);
    syncFPS(st, cfg, t, fl, px, pz, pang, pgait);

    /* ⚠️ ZIP 399 — LES LUMIÈRES SONT RÉATTRIBUÉES ICI, ET PAS AILLEURS.
       Après la caméra, parce que le classement se fait depuis l'ŒIL et qu'un
       classement fait sur la position de l'image précédente ferait clignoter
       la lampe qu'on longe. Avant le rendu, évidemment. Et on lui donne
       `scene.fog.far` COURANT — il descend à 26 quand la torche n'est plus
       qu'une braise, et c'est justement là que la coupure rapporte le plus,
       parce que c'est là que le joueur est en danger et qu'il a besoin de ses
       images. */
    updateLights(camera.position.x, camera.position.y, camera.position.z,
                 frameDt, cfg, scene.fog.far, scene.fog.near);
    /* La mesure d'allure, et le chien de garde de la souris. Ils lisent
       l'intervalle RÉEL entre deux images, celui que le joueur subit. */
    tickRes(cfg, rawMs, now);

    /* ⚠️ DEUX PASSES, ET L'ORDRE COMPTE.
       1. le monde, avec effacement normal ;
       2. le tampon de PROFONDEUR seul est vidé (pas la couleur), puis le
          modèle de vue est rendu par-dessus avec sa propre caméra.

       Sans le `clearDepth()`, les mains seraient masquées par le mur qui se
       trouve à trente centimètres devant elles ; sans `autoClear = false`, la
       seconde passe effacerait le monde et on ne verrait QUE les mains. C'est
       le montage standard du genre et il tient en trois lignes — mais chacune
       des trois est indispensable, et il n'y a pas d'autre façon d'obtenir
       une arme qui ne rentre jamais dans la pierre. */
    if (fpsView && vmScene && renderer.clearDepth) {
      renderer.autoClear = true;
      renderer.render(scene, camera);
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(vmScene, vmCam);
      renderer.autoClear = true;
    } else {
      renderer.render(scene, camera);
    }
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
  /* =======================================================================
     LE SOL QUI CÈDE — ZIP 405.
     -----------------------------------------------------------------------
     ⚠️ CETTE FONCTION N'EXISTAIT PAS, ET C'EST TOUT LE PROBLÈME. Le moteur
     tenait un état complet des dalles fêlées depuis le 394 — trois états, un
     compte à rebours, un tremblement réglé par CRACK_SHAKE — et le rendu n'en
     lisait pas un seul octet. Une dalle fêlée était donc INDISCERNABLE d'une
     dalle saine jusqu'à la seconde où elle vous tuait, puis restait dessinée,
     intacte et mortelle, pour le reste de la partie.

     Trois états, trois images, et aucune n'est un texte :
       0. saine                    — rien ;
       1. elle cède                — elle tremble et s'enfonce, de plus en plus
                                     fort à mesure que le délai s'épuise. Le
                                     tremblement CROÎT : c'est ce qui distingue
                                     « attention » de « maintenant » ;
       2. tombée                   — elle disparaît, et un fût violet s'allume
                                     à sa place. La cellule rejoint les trous
                                     d'origine, et se lit comme eux.

     ⚠️ ELLE SE LIT DEPUIS `st`, PAS DEPUIS UN COMPTE À REBOURS RECOPIÉ ICI.
     Deux descriptions d'une même chose finissent toujours par diverger (387) —
     et ici le rendu avait déjà divergé jusqu'à ne plus rien décrire du tout.
     ======================================================================= */
  function syncFloor(st, cfg, t) {
    if (!st.cracks || !st.cracks.size) return;
    for (const c of st.cracks.values()) {
      const j = M_.idx(c.x, c.y);
      const tile = floorTiles.get(j);
      if (!tile) continue;
      if (c.state === 1) {
        // k va de 0 à 1 sur toute la durée du sursis : le tremblement enfle.
        const k = Math.min(1, (c.t * 1000) / cfg.CRACK_DELAY_MS);
        const amp = cfg.CRACK_SHAKE * (0.35 + k * k * 2.2);
        const [wx, wz] = Rules.centerOf(cfg, c.x, c.y);
        tile.position.set(wx + Math.sin(t * 47 + c.x) * amp, -k * k * 0.30,
                          wz + Math.sin(t * 41 + c.y * 2.3) * amp);
      } else if (c.state === 2 && tile.visible) {
        tile.visible = false;
        if (holeGlowGeo && holeGlowMat) {
          const [wx, wz] = Rules.centerOf(cfg, c.x, c.y);
          const mesh = new THREE_.Mesh(holeGlowGeo, holeGlowMat);
          mesh.position.set(wx, cfg.LAKE_GLOW_UP / 2 - 1.0, wz);
          scene.add(mesh);
          holeGlows.push(mesh);
        }
      }
    }
  }

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
  /* =======================================================================
     ZIP 397 — TOUT CE QUE LA VUE SUBJECTIVE AJOUTE, EN UN SEUL ENDROIT.
     -----------------------------------------------------------------------
     Le corps du fermier, les objets neufs, les carreaux en vol et le modèle
     de vue. Regroupé ici plutôt qu'éparpillé dans sync() pour une raison
     simple : le jour où l'on voudra rebasculer en troisième personne, il n'y
     a qu'un appel à couper — et `fpsView` existe déjà pour ça, puisque
     l'écran-titre s'en sert.
     ======================================================================= */
  function syncFPS(st, cfg, t, fl, px, pz, pang, pgait) {
    /* ⚠️ LE CORPS DISPARAÎT, MAIS LE RIG CONTINUE D'ÊTRE POSÉ. Deux raisons :
       il redevient visible à l'écran-titre sans rien recalculer, et surtout
       la torche du monde reste accrochée à sa main — donc la lumière et le
       halo continuent de suivre le cycle de marche, gratuitement, comme
       depuis le 395. Le cacher coûte un booléen ; le débrancher aurait coûté
       de réécrire l'éclairage. */
    if (player) player.visible = !fpsView && (st.status !== "falling" || (Date.now() % 200 < 120));

    // --- la carte accrochée au mur
    if (mapMesh) {
      const on = !mapMesh.it.taken;
      mapMesh.grp.visible = on;
      mapMesh.lamp.intensity = on ? 1.5 : 0;
      if (on) {
        // elle respire : c'est ce qui la distingue d'une tache sur le mur
        const k = 0.45 + Math.sin(t * 2.1) * 0.14;
        mapMesh.halo.material.opacity = k;
        mapMesh.halo.scale.setScalar ? mapMesh.halo.scale.setScalar(1 + Math.sin(t * 2.1) * 0.07)
          : mapMesh.halo.scale.set(1, 1, 1);
      }
    }
    if (bowMesh) {
      bowMesh.grp.visible = !bowMesh.b.taken;
      if (bowMesh.grp.visible) {
        bowMesh.grp.rotation.y = t * 0.8;
        bowMesh.grp.position.y = Rules.groundY(cfg, M_, bowMesh.grp.position.x, bowMesh.grp.position.z)
          + 1.5 + Math.sin(t * 2.0) * 0.16;
        bowMesh.halo.lookAt(camera.position);
      }
    }
    for (const bp of boltPackMeshes) {
      bp.grp.visible = !bp.b.taken;
      if (bp.grp.visible) { bp.grp.rotation.y = t * 0.6; bp.halo.lookAt(camera.position); }
    }

    /* --- LES CARREAUX EN VOL. Ils viennent de rules.js et ne sont QUE lus :
       le rendu ne décide ni de leur trajectoire ni de leur fin. Un projectile
       dont la position serait recalculée à l'affichage finirait par se planter
       ailleurs que là où le moteur l'a arrêté, et le joueur verrait un carreau
       passer à travers un rôdeur qu'il vient de tuer. */
    let ib = 0;
    for (const p of st.projectiles) {
      if (ib >= boltPool.length) break;
      const mm = boltPool[ib++];
      mm.visible = true;
      mm.position.set(p.x, cfg.EYE_H * 0.8, p.z);
      mm.rotation.set(0, p.ang, 0);
    }
    for (; ib < boltPool.length; ib++) boltPool[ib].visible = false;

    if (!vm) return;

    /* --- LE MODÈLE DE VUE : la flamme, l'arme, le geste. */
    const cut = flameCuts[((t * 11) | 0) % 4];
    if (vm.flame.material.map !== cut) vm.flame.material.map = cut;
    const flick = 1 + Math.sin(t * 17.3) * cfg.TORCH_FLICKER + Math.sin(t * 6.1) * cfg.TORCH_FLICKER * 0.6;
    const fs = (0.45 + fl.k * 0.75) * flick;
    vm.flame.scale.set(fs, fs, 1);
    vm.flame.visible = st.flame > 0;
    vm.halo.visible = st.flame > 0;
    vm.halo.material.opacity = 0.18 + fl.k * 0.36;
    vm.key.intensity = 0.5 + fl.k * 1.4;
    /* La torche s'abaisse quand la flamme meurt : le bras fatigue, et surtout
       ça DIT que quelque chose se dégrade, sans jauge. */
    vm.left.rotation.x = -0.10 + (1 - fl.k) * 0.34;

    // l'arme tenue : l'arbalète prend la place de l'épée dès qu'on l'a
    const useBow = st.hasBow && st.bolts > 0;
    vm.bowG.visible = useBow;
    vm.swordG.visible = st.hasSword && !useBow;
    vm.right.visible = st.hasSword || st.hasBow;
    vm.loaded.visible = useBow && st.boltCd <= 0;   // pas de carreau visible pendant le rechargement

    /* LE COUP D'ÉPÉE EN VUE SUBJECTIVE — trois temps, comme au 395, mais dans
       l'espace de l'écran : l'arme part EN HAUT À DROITE (armé), traverse le
       cadre en diagonale (frappe), puis revient. La diagonale est ce qui rend
       un coup lisible en subjectif ; un coup qui part et revient sur le même
       axe ne se voit pas, parce qu'on n'a aucun repère de profondeur à trente
       centimètres de l'œil. */
    if (st.swingT > 0 && vm.swordG.visible) {
      const k = 1 - st.swingT / (cfg.SWING_MS / 1000);   // 0 → 1
      let a2, up, side;
      if (k < cfg.SWING_WINDUP) {
        const u = k / cfg.SWING_WINDUP;
        a2 = -0.9 * u; up = 0.30 * u; side = 0.26 * u;
      } else if (k < cfg.SWING_STRIKE) {
        const u = (k - cfg.SWING_WINDUP) / (cfg.SWING_STRIKE - cfg.SWING_WINDUP);
        a2 = -0.9 + 2.5 * u; up = 0.30 - 0.75 * u; side = 0.26 - 0.70 * u;
      } else {
        const u = (k - cfg.SWING_STRIKE) / (1 - cfg.SWING_STRIKE);
        a2 = 1.6 * (1 - u); up = -0.45 * (1 - u); side = -0.44 * (1 - u);
      }
      vm.swordG.rotation.set(a2 * 0.45, side * 0.9, -a2);
      vm.swordG.position.set(side * 0.5, up, -Math.abs(a2) * 0.10);
    } else if (vm.swordG.visible) {
      // repos : l'épée respire et penche vers l'intérieur du cadre
      vm.swordG.rotation.set(-0.18 + Math.sin(t * 1.4) * 0.02, 0.14, -0.30);
      vm.swordG.position.set(0, Math.sin(t * 1.4) * 0.012, 0);
    }

    /* LE RECUL DE L'ARBALÈTE. Il est court et sec — 0,9 s de rechargement
       derrière, donc on a tout le temps de le voir revenir. Un tir sans recul
       ne se sent pas ; un recul long donne l'impression d'une arme molle. */
    if (vm.bowG.visible) {
      const cd = Math.max(0, st.boltCd) / (cfg.BOLT_COOLDOWN_MS / 1000);
      const kick = Math.max(0, cd - 0.72) / 0.28;      // les 28 % du début
      vm.bowG.position.set(0, kick * 0.06, kick * 0.34);
      vm.bowG.rotation.set(-0.16 + kick * 0.42 + Math.sin(t * 1.3) * 0.015, 0.05, 0);
    }
  }

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
  /* =======================================================================
     ZIP 397 — LA CAMÉRA SUBJECTIVE, ET LE BALANCEMENT DE MARCHE.
     -----------------------------------------------------------------------
     Elle est à hauteur d'œil, à la position du fermier, et elle regarde là où
     il regarde. Tout le reste de cette fonction est du BALANCEMENT, et c'est
     là qu'est le travail :

       * LA TÊTE MONTE ET DESCEND AVEC LA FOULÉE, PAS AVEC LE TEMPS. `st.gait`
         est le cycle de marche du 395, avancé par la DISTANCE réellement
         parcourue après collision. Une caméra qui oscille au temps continue
         de tanguer quand on pousse un mur — c'est le défaut qu'on reconnaît
         sans savoir le nommer, et c'est exactement celui que le 395 avait
         corrigé pour les jambes. On réutilise la même horloge, donc le pas
         qu'on VOIT est le pas qu'on SENT ;
       * LE BALANCEMENT LATÉRAL EST À LA MOITIÉ DE LA CADENCE VERTICALE. Deux
         appuis de pied par cycle, un déhanchement par cycle. Mettre les deux à
         la même fréquence donne une démarche de crabe ;
       * LE ROULIS suit le déhanchement, très faible (1° au plus). Au-delà, on
         a le mal de mer en trente secondes ;
       * LA POSE DU PIED ajoute un petit choc vers le bas — c'est ce qui donne
         du POIDS. Sans lui, on flotte.

     ⚠️ ET RIEN DE TOUT ÇA N'EST DANS rules.js. Le balancement ne décide de
     rien : ni de ce qu'on touche, ni de ce qu'on voit venir. Les dix outils
     rejouent donc exactement le même jeu qu'avant.
     ======================================================================= */
  function updateCameraFPS(st, cfg, px, pz, pang, pgait) {
    const gy = Rules.groundY(cfg, M_, px, pz);

    // --- le tangage, lissé pour l'affichage (la souris arrive par paquets)
    const kp = 1 - Math.exp(-cfg.PITCH_LERP * frameDt);
    pitch += (pitchWant - pitch) * kp;

    // --- le balancement, à la DISTANCE
    const phase = pgait * Math.PI * 2;
    const amp = (0.35 + Math.min(1, st.gaitSpeed / cfg.WALK_SPEED) * 0.65) *
      (1 + st.runAmt * (cfg.BOB_RUN - 1));
    const kb = 1 - Math.exp(-14 * frameDt);
    // |sin| : deux creux par cycle, un par pied. Le sinus simple donnerait une
    // seule descente pour deux pas, et on marcherait comme un métronome mou.
    const wantY = -Math.abs(Math.sin(phase)) * cfg.BOB_V * amp
      - Math.max(0, Math.sin(phase * 2 - 0.6)) * cfg.STEP_LAND * amp;
    const wantX = Math.sin(phase * 0.5) * cfg.BOB_H * amp;
    const wantR = -Math.sin(phase * 0.5) * cfg.BOB_ROLL * amp;
    bobT.y += (wantY - bobT.y) * kb;
    bobT.x += (wantX - bobT.x) * kb;
    bobT.roll += (wantR - bobT.roll) * kb;

    const shake = st.camShake;
    const sinA = Math.sin(pang), cosA = Math.cos(pang);
    // le déport latéral est perpendiculaire au regard
    const ox = cosA * bobT.x, oz = -sinA * bobT.x;
    camera.position.set(
      px + ox + (Math.random() - 0.5) * shake,
      gy + cfg.EYE_H + bobT.y + (Math.random() - 0.5) * shake,
      pz + oz + (Math.random() - 0.5) * shake);

    /* ⚠️ ON POSE LES ANGLES D'EULER, ON N'UTILISE PAS lookAt(). lookAt ne sait
       pas produire un ROULIS (il redresse toujours la caméra sur l'axe Y),
       et le roulis est justement ce qui fait la démarche. L'ordre YXZ est
       obligatoire : lacet, puis tangage, puis roulis — dans l'ordre par défaut
       (XYZ), le tangage s'appliquerait AVANT le lacet et regarder en l'air en
       tournant ferait basculer l'horizon. */
    camera.rotation.order = "YXZ";
    camera.rotation.set(
      st.status === "falling" ? -1.15 : pitch,
      pang, bobT.roll);

    /* --- LE MODÈLE DE VUE : le retard de l'arme sur la rotation.
       On ne suit pas la caméra instantanément ; l'arme TRAÎNE, puis revient.
       C'est ce décalage — quelques centièmes de seconde — qui fait qu'un FPS a
       du poids, et son absence qu'il a l'air d'un diaporama. */
    if (vm) {
      const dAng = angDiff(pang, vm.lastAng === undefined ? pang : vm.lastAng);
      vm.lastAng = pang;
      const ks = 1 - Math.exp(-cfg.VM_SWAY_LAG * frameDt);
      swayX += (Math.max(-1, Math.min(1, -dAng * 26)) * cfg.VM_SWAY - swayX) * ks;
      swayY += (Math.max(-1, Math.min(1, (pitch - (vm.lastPitch === undefined ? pitch : vm.lastPitch)) * 26))
        * cfg.VM_SWAY - swayY) * ks;
      vm.lastPitch = pitch;
      vm.root.position.set(
        swayX,
        swayY + bobT.y * cfg.VM_BOB / Math.max(1e-6, cfg.BOB_V) - st.runAmt * cfg.VM_LOWER,
        0);
      vm.root.rotation.set(swayY * 1.5, swayX * 1.6, bobT.roll * 1.8 + st.strafeAmt * 0.05);
    }
  }
  function angDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  /* La caméra à la TROISIÈME personne du 396 est conservée telle quelle : elle
     sert l'écran-titre, qui montre le fermier de dos pendant qu'on lit le
     menu. La supprimer aurait fait de l'écran-titre une image de mur. */
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

  /* `fpsView` est un booléen de MODULE, pas un réglage de config : il ne se
     règle pas, il bascule. L'écran-titre montre le fermier de dos (troisième
     personne), la partie se joue en subjectif. Un seul commutateur, lu à trois
     endroits, et la troisième personne du 396 reste entièrement fonctionnelle
     derrière — on ne jette pas six zips de travail pour un changement de vue. */
  let fpsView = true;
  function setView(fps) {
    const v = !!fps;
    if (v === fpsView) return;
    fpsView = v;
    if (!camera || !CFG_) return;
    /* Le champ ET le plan de coupe proche changent avec la vue, et les deux
       comptent : 78° en subjectif (voir config.js — un champ étroit cache les
       embranchements latéraux, ce qui est rédhibitoire quand on demande une
       navigation évidente), 66° en troisième personne (un champ large amplifie
       toute rotation sur les bords, c'est le mécanisme du mal des transports).
       Et 0,05 de coupe proche en subjectif, sans quoi on voit à travers un mur
       auquel on se colle. */
    camera.fov = fpsView ? CFG_.FPS_FOV : CFG_.CAM_FOV;
    camera.near = fpsView ? 0.05 : 0.1;
    camera.rotation.set(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  /* =========================================================================
     LE RÉGLAGE DE QUALITÉ — zip 399.
     -------------------------------------------------------------------------
     ⚠️ CHANGER LE NIVEAU EN COURS DE PARTIE NE CHANGE QUE LA RÉSOLUTION.
     Le nombre de lampes du pool, lui, est compilé dans les shaders : le
     modifier gèlerait une seconde. Il est donc lu à la construction du dédale
     suivant, et l'interface le dit (voir LAB_STR.qualNextRun). C'est une
     limite du moteur, pas un oubli — et la cacher produirait exactement le
     genre d'échec silencieux que ce chantier passe son temps à traquer.
     ====================================================================== */
  function setQuality(cfg, name) {
    qName = (cfg.QUAL && cfg.QUAL[name]) ? name : (cfg.QUAL_DEFAULT || "high");
    qual = qualOf(cfg, qName);
    if (scene && poolReady) resizePool(cfg);      // gel volontaire, voir resizePool
    if (!renderer) return;
    baseRatio = baseRatioOf();
    resScale = qual.maxRes;
    lastResChange = 0; frameLog.length = 0; frameSeen = 0;
    applyRes();
  }

  return {
    init, sync, snapPrev, resize, fallStep, reskin, addPitch, setView, setQuality,
    get renderer() { return renderer; },
    get fps() { return fpsView; },
    get quality() { return qName; },
    /* Le pool réclame-t-il plus de lampes que le niveau courant n'en donne ?
       Lu par tools/verify-perf.mjs et par le panneau de mise au point. */
    get perf() {
      return { emitters: emitters.length, pool: lightPool.length,
               inRange: lastInRange, peak: lightPeak, gapOut: lastGapOut,
               res: resScale, ratio: baseRatio * resScale, level: qName };
    },
    /* ⚠️ ACCÈS RÉSERVÉ AUX OUTILS. tools/verify-perf.mjs recalcule
       l'éclairement de milliers de points de surface avec TOUS les foyers, puis
       avec ceux que le pool a retenus, et rend l'écart en niveaux de gris. Sans
       cet accès il devrait se refabriquer une liste de lampes — deux
       descriptions d'une même chose, le défaut que ce chantier traque depuis le
       387. Le jeu, lui, ne l'appelle jamais. */
    __lights() {
      return { all: emitters, chosen: lightSlots.map((s) => s.em).filter(Boolean),
               torch: torchLight, amb: 0.30, hemi: 0.45 };
    },
    /* Le chien de garde : game.js le lit à chaque image et rend la souris.
       On le remet à zéro EN LE LISANT — un drapeau qu'il faut penser à
       effacer ailleurs finit toujours par rester allumé. */
    /* ⚠️ ON NE REMET LE COMPTEUR À ZÉRO QUE SI LE FILET A SERVI, ET LA
       PREMIÈRE VERSION FAISAIT L'INVERSE. Elle écrivait `hangStrikes = 0`
       inconditionnellement — or game.js appelle takeHang() à CHAQUE image :
       le compteur retombait donc à zéro entre deux images et n'atteignait
       jamais deux. Le filet était écrit, branché, documenté, et strictement
       incapable de se déclencher. Trouvé par tools/verify-boot.mjs, qui
       fabrique quatorze images d'une seconde et exige que la souris revienne.
       Aucune relecture ne l'aurait vu : la ligne fautive était celle qui
       « nettoie proprement ». */
    takeHang() {
      const h = hangFlag;
      if (h) { hangFlag = false; hangStrikes = 0; }
      return h;
    },
    takeDemote() { const d = demotedTo; demotedTo = null; return d; },
  };
})();
