/* =============================================================================
   world.js — LA SCÈNE. Le paysage, la piste, la luge, les étoiles.
   -----------------------------------------------------------------------------
   ⚠️ LA QUALITÉ VISÉE EST CELLE DES ANCIENS MARIO KART, et c'est une consigne
   TECHNIQUE autant qu'esthétique : « pas trop poussé mais beau avec des moyens
   raisonnables ». Concrètement, cinq règles, tenues partout dans ce fichier :

     1. DES FORMES SIMPLES, DES COULEURS FRANCHES. Aucune texture photo, aucune
        normal map, aucune ombre portée. Un sapin de gomme est trois sphères
        aplaties ; une maison de pain d'épices est six boîtes. Ce qui fait la
        beauté, c'est la PALETTE et la SILHOUETTE, pas le nombre de polygones.

     2. TOUT EST MUTUALISÉ. Les géométries et les matériaux sont créés UNE
        fois, dans buildAssets(), et partagés par tous les objets. Un décor qui
        crée une géométrie par sucette produit quinze mille objets en trois
        minutes de descente et finit par ramer — c'est la faute qui tue ce
        genre de jeu, et elle ne se voit qu'après coup.

     3. LE LOINTAIN NE SE RAPPROCHE JAMAIS. Ciel, montagnes et neige qui tombe
        vivent dans des groupes qui SUIVENT LA CAMÉRA en x/z. C'est un décor de
        théâtre : il est immense parce qu'il est inatteignable, pas parce qu'il
        est grand.

     4. LE BROUILLARD EST ROSE, PAS GRIS. Il porte la couleur du ciel à
        l'horizon. Un brouillard gris sur un monde pastel salit tout le fond du
        cadre et donne cette teinte « plastique sale » qu'on reconnaît
        immédiatement.

     5. LA PISTE EST UN RUBAN CONTINU, épais de quelques centimètres, posé SUR
        la neige. Peinte à plat sur le sol, elle disparaît dans les virages —
        avec son épaisseur, elle garde un liseré visible sous tous les angles.
   ========================================================================== */

const World = (function () {
  let renderer, scene, camera, canvas;
  let ambient, sun, fill;
  let skyDome, skyMat, mountainsNear, mountainsFar, snowFall;
  let sledRig, sledParts = {};
  let stars, dust, lines;
  let geo = {}, mat = {};
  let lastNow = 0;
  let pendingSkin = null;

  /* Les meshes des gourmands et des bonbons sont mis EN RÉSERVE plutôt que
     détruits : une descente en crée quelques centaines, et créer/détruire un
     Mesh par gourmand fait travailler le ramasse-miettes pendant qu'on essaie
     de tenir 60 images par seconde. */
  const pool = { gum: [], marsh: [], jelly: [], candy: [] };

  /* ======================================================================
     TEXTURES — peintes au canvas 2D au démarrage.
     ⚠️ AUCUN FICHIER IMAGE N'EST CHARGÉ. Tout le décor est dessiné en
     quelques dizaines de lignes, ce qui a trois conséquences qui comptent :
     la page se charge instantanément, elle marche hors ligne, et une teinte se
     change en modifiant un nombre de config.js plutôt qu'en repassant par un
     logiciel de dessin.
     ====================================================================== */
  function cv(w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    return c;
  }
  const hex = (n) => "#" + n.toString(16).padStart(6, "0");

  /* Le CIEL. Un dégradé vertical à cinq arrêts (config) plus des nuages ronds
     et pâles. Peint à l'envers (le haut du dôme est en haut de l'image) et
     appliqué sur une sphère vue de l'intérieur. */
  function paintSky() {
    const W = 1024, H = 512, c = cv(W, H), g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 0, H);
    for (const [p, col] of CFG.COL_SKY) grad.addColorStop(p, col);
    g.fillStyle = grad; g.fillRect(0, 0, W, H);

    /* Les nuages : des amas d'ellipses blanches très transparentes, cantonnés
       à la moitié haute. Dans la moitié basse ils se retrouveraient SOUS
       l'horizon, où le joueur voit de la neige — un nuage sous les pieds est
       le genre de détail qu'on ne remarque qu'une fois et qu'on ne peut plus
       ignorer ensuite. */
    for (let n = 0; n < 26; n++) {
      const cx = Math.random() * W, cy = 60 + Math.random() * 190;
      const r = 26 + Math.random() * 54;
      g.globalAlpha = 0.16 + Math.random() * 0.16;
      g.fillStyle = "#ffffff";
      for (let k = 0; k < 6; k++) {
        g.beginPath();
        g.ellipse(cx + (k - 3) * r * 0.42, cy + Math.sin(k) * r * 0.13,
          r * (0.55 + Math.random() * 0.45), r * 0.34, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalAlpha = 1;
    /* Un soleil bas et diffus, côté gauche — le même côté que la lumière
       directionnelle de la scène. Deux sources qui ne viennent pas du même
       endroit, c'est l'erreur qui fait qu'un décor « sonne faux » sans qu'on
       sache dire pourquoi. */
    const sg = g.createRadialGradient(W * 0.22, H * 0.62, 0, W * 0.22, H * 0.62, 190);
    sg.addColorStop(0, "rgba(255,246,214,0.95)");
    sg.addColorStop(0.35, "rgba(255,226,190,0.42)");
    sg.addColorStop(1, "rgba(255,214,190,0)");
    g.fillStyle = sg; g.fillRect(0, H * 0.3, W, H * 0.7);
    return c;
  }

  /* LA PISTE. ⚠️ ELLE EST DAMÉE, ET C'EST CE QUI LUI DONNE SA VITESSE.
     Première version : des tourbillons de barbe à papa, et rien d'autre. Le
     reproche « y a pas de texture au sol » venait d'abord d'un défaut d'UV
     (voir ribbon), mais pas seulement — des tourbillons ronds sur un sol qui
     défile ne DONNENT AUCUN SENS DE MOUVEMENT. Ce qui donne la vitesse dans un
     jeu de descente, ce sont les SILLONS DE LA DAMEUSE : des lignes parallèles
     à la marche, qui filent sous la luge et qu'on lit du coin de l'œil.

     Les deux sont donc superposés, dans cet ordre : les sillons portent la
     vitesse, les tourbillons disent que c'est de la barbe à papa. Un seul des
     deux et il manque quelque chose. */
  function paintPiste() {
    const W = 256, H = 256, c = cv(W, H), g = c.getContext("2d");
    g.fillStyle = hex(CFG.COL_PISTE); g.fillRect(0, 0, W, H);

    /* 1. LES SILLONS. Verticaux dans la texture, donc DANS LE SENS DE LA
       MARCHE une fois posés (l'axe v du ruban suit la piste). Alternés clair /
       sombre : un sillon est un creux, il a une arête éclairée et une ombre. */
    for (let x = 0; x < W; x += 16) {
      g.fillStyle = "rgba(255,255,255,0.20)"; g.fillRect(x, 0, 8, H);
      g.fillStyle = "rgba(190,90,140,0.09)"; g.fillRect(x + 8, 0, 3, H);
    }

    /* 2. LES TOURBILLONS, par-dessus et translucides : ils marbrent le rose
       sans effacer les sillons. Une spirale de deux tours — la forme de la
       barbe à papa roulée, et elle se lit encore écrasée par la perspective. */
    g.strokeStyle = hex(CFG.COL_PISTE_SWIRL);
    g.lineCap = "round";
    /* ⚠️ DISCRETS. Au premier rendu texturé ils étaient à 0,42 d'opacité et
       marbraient la piste au point qu'elle avait l'air sale : sur une surface
       qui occupe le tiers du cadre et qui DÉFILE, un motif trop contrasté ne
       se lit plus comme une matière mais comme du bruit. Ils sont là pour dire
       « barbe à papa » du coin de l'œil, pas pour être regardés. */
    for (let n = 0; n < 9; n++) {
      const cx = Math.random() * W, cy = Math.random() * H;
      const r = 18 + Math.random() * 30;
      g.globalAlpha = 0.10 + Math.random() * 0.10;
      g.lineWidth = 5 + Math.random() * 7;
      g.beginPath();
      for (let a = 0; a < Math.PI * 4; a += 0.25) {
        const rr = r * (a / (Math.PI * 4));
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.75;
        if (a === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
    return c;
  }

  /* LA NEIGE SUCRÉE. ⚠️ TROIS ÉCHELLES, ET IL EN FAUT TROIS.
     La première version n'avait qu'un grain de deux pixels : sur un carreau de
     onze mètres, ça ne se voit pas — la neige était un aplat blanc mort, ce que
     Guillaume a vu tout de suite. Une surface qui occupe la moitié du cadre a
     besoin de structure à la taille où on la regarde, c'est-à-dire à plusieurs
     tailles à la fois :
       * de grandes ondes pâles (les congères) qu'on lit à vingt mètres ;
       * des plaques moyennes qui cassent leur régularité ;
       * des paillettes de sucre qu'on ne voit que sous la luge, et qui sont
         exactement ce qui fait dire « c'est du sucre » et pas « c'est blanc ». */
  function paintSnow() {
    const W = 256, H = 256, c = cv(W, H), g = c.getContext("2d");
    g.fillStyle = hex(CFG.COL_SNOW); g.fillRect(0, 0, W, H);

    // 1. Les congères : de grandes ellipses très pâles, à peine plus foncées.
    for (let n = 0; n < 14; n++) {
      g.globalAlpha = 0.30;
      g.fillStyle = hex(CFG.COL_SNOW_SHADE);
      g.beginPath();
      g.ellipse(Math.random() * W, Math.random() * H,
        34 + Math.random() * 58, 20 + Math.random() * 34,
        Math.random() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    // 2. Les plaques moyennes, en blanc pur : elles rattrapent la lumière.
    for (let n = 0; n < 26; n++) {
      g.globalAlpha = 0.34;
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.ellipse(Math.random() * W, Math.random() * H,
        10 + Math.random() * 22, 7 + Math.random() * 14,
        Math.random() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    // 3. Les paillettes de sucre.
    for (let n = 0; n < 1400; n++) {
      g.globalAlpha = 0.10 + Math.random() * 0.5;
      g.fillStyle = Math.random() < 0.62 ? "#ffffff" : "#ffd9ee";
      const sz = 1 + Math.random() * 2.2;
      g.fillRect(Math.random() * W, Math.random() * H, sz, sz);
    }
    g.globalAlpha = 1;
    return c;
  }

  /* Le SUCRE D'ORGE : bandes obliques rouges et blanches, pour les barrières
     et les arches de menthe poivrée. */
  function paintCane() {
    const W = 64, H = 64, c = cv(W, H), g = c.getContext("2d");
    g.fillStyle = hex(CFG.COL_CANE_WHITE); g.fillRect(0, 0, W, H);
    g.strokeStyle = hex(CFG.COL_CANE_RED);
    g.lineWidth = 13;
    for (let i = -2; i < 6; i++) {
      g.beginPath(); g.moveTo(i * 22, -10); g.lineTo(i * 22 + 40, H + 10); g.stroke();
    }
    return c;
  }

  /* L'ÉTOILE des dérapages. Une étoile à cinq branches, blanche au cœur, dans
     un halo — c'est le halo qui la fait « briller » une fois réduite à
     quelques pixels à l'écran ; sans lui, on obtient un confetti. */
  function paintStar() {
    const S = 64, c = cv(S, S), g = c.getContext("2d");
    const R = S / 2;
    const halo = g.createRadialGradient(R, R, 0, R, R, R);
    halo.addColorStop(0, "rgba(255,255,255,0.95)");
    halo.addColorStop(0.35, "rgba(255,225,245,0.45)");
    halo.addColorStop(1, "rgba(255,200,235,0)");
    g.fillStyle = halo; g.fillRect(0, 0, S, S);
    g.fillStyle = "#ffffff";
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr = i % 2 ? R * 0.30 : R * 0.78;
      const x = R + Math.cos(a) * rr, y = R + Math.sin(a) * rr;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath(); g.fill();
    return c;
  }

  /* La POUDRE : un simple point flou. Elle ne doit surtout pas être une
     étoile — deux effets qui se ressemblent se noient l'un l'autre. */
  function paintDust() {
    const S = 32, c = cv(S, S), g = c.getContext("2d");
    const R = S / 2;
    const d = g.createRadialGradient(R, R, 0, R, R, R);
    d.addColorStop(0, "rgba(255,255,255,0.85)");
    d.addColorStop(0.5, "rgba(255,235,250,0.30)");
    d.addColorStop(1, "rgba(255,220,245,0)");
    g.fillStyle = d; g.fillRect(0, 0, S, S);
    return c;
  }

  function tex(canvasEl, rx, ry) {
    const t = new THREE.CanvasTexture(canvasEl);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (rx) t.repeat.set(rx, ry === undefined ? rx : ry);
    return t;
  }

  /* ======================================================================
     ASSETS PARTAGÉS (règle 2 : tout est mutualisé).
     ====================================================================== */
  function buildAssets() {
    geo.box = new THREE.BoxGeometry(1, 1, 1);
    geo.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
    geo.cyl6 = new THREE.CylinderGeometry(0.5, 0.5, 1, 6);
    geo.cone = new THREE.ConeGeometry(0.5, 1, 10);
    geo.sphere = new THREE.SphereGeometry(0.5, 12, 9);
    geo.sphereLo = new THREE.SphereGeometry(0.5, 8, 6);
    geo.disc = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 16);
    geo.torus = new THREE.TorusGeometry(1, 0.14, 8, 26, Math.PI);
    geo.plane = new THREE.PlaneGeometry(1, 1);

    const L = (c, extra) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, extra || {}));
    mat.snow = new THREE.MeshLambertMaterial({ map: tex(paintSnow(), 1, 1) });
    mat.piste = new THREE.MeshLambertMaterial({ map: tex(paintPiste(), 1, 1) });
    mat.pisteEdge = L(CFG.COL_PISTE_EDGE);
    mat.cane = new THREE.MeshLambertMaterial({ map: tex(paintCane(), 1, 3) });
    mat.white = L(0xfffdff);
    mat.icing = L(CFG.COL_ICING);
    mat.ginger = L(CFG.COL_GINGER);
    mat.gingerDark = L(CFG.COL_GINGER_DARK);
    mat.trunk = L(CFG.COL_TRUNK);
    mat.mount = L(CFG.COL_MOUNT);
    mat.mountCap = L(CFG.COL_MOUNT_CAP);
    mat.mountFar = new THREE.MeshBasicMaterial({ color: CFG.COL_MOUNT_FAR, fog: false });
    mat.syrup = L(CFG.COL_SYRUP);
    mat.sled = L(CFG.COL_SLED);
    mat.sledDark = L(CFG.COL_SLED_DARK);
    mat.runner = L(CFG.COL_RUNNER);
    mat.shirt = L(CFG.COL_SHIRT);
    mat.pants = L(CFG.COL_PANTS);
    mat.hair = L(CFG.COL_HAIR);
    mat.skin = L(CFG.COL_SKIN);
    mat.scarf = L(CFG.COL_SCARF);
    mat.boot = L(CFG.COL_BOOT);
    mat.eye = L(0x2a1c2e);
    mat.candy = CFG.COL_CANDY_SET.map((c) => L(c));
    mat.candyGlow = CFG.COL_CANDY_SET.map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.35, fog: false }));
  }

  /* Petit constructeur : un mesh boîte posé en (x,y,z) avec une taille. Il
     revient si souvent que l'écrire à la main quinze fois par objet noierait
     la forme sous la plomberie. */
  function box(m, w, h, d, x, y, z) {
    const o = new THREE.Mesh(geo.box, m);
    o.scale.set(w, h, d); o.position.set(x, y, z);
    return o;
  }
  function cylM(m, r, h, x, y, z, lo) {
    const o = new THREE.Mesh(lo ? geo.cyl6 : geo.cyl, m);
    o.scale.set(r * 2, h, r * 2); o.position.set(x, y, z);
    return o;
  }
  function sph(m, r, x, y, z, lo) {
    const o = new THREE.Mesh(lo ? geo.sphereLo : geo.sphere, m);
    o.scale.set(r * 2, r * 2, r * 2); o.position.set(x, y, z);
    return o;
  }
  function coneM(m, r, h, x, y, z) {
    const o = new THREE.Mesh(geo.cone, m);
    o.scale.set(r * 2, h, r * 2); o.position.set(x, y, z);
    return o;
  }

  /* ======================================================================
     INIT
     ====================================================================== */
  function init(canvasEl) {
    canvas = canvasEl;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

    scene = new THREE.Scene();
    /* ⚠️ RÈGLE 4 : le brouillard porte la couleur du ciel À L'HORIZON, pas une
       teinte grise. Il est très peu dense — on veut voir loin, c'est tout le
       propos du cadrage large — mais il est indispensable : sans lui, la piste
       et les montagnes se découpent net sur le ciel et le décor devient une
       maquette. */
    scene.fog = new THREE.FogExp2(0xffeedd, 0.0022);

    camera = new THREE.PerspectiveCamera(CFG.CAM_FOV, 1, 0.5, CFG.DRAW_DISTANCE);

    /* L'ÉCLAIRAGE : trois sources, et le monde est LUMINEUX. C'est une
       demande — « aussi beau et lumineux ». L'ambiante est très forte (0,78) :
       dans un monde pastel, une ambiante faible creuse des ombres grises qui
       salissent toutes les teintes claires. Le soleil est chaud et rasant, la
       lampe d'appoint est froide et vient d'en bas pour simuler le rebond de
       la neige — c'est elle qui empêche les dessous d'être noirs. */
    ambient = new THREE.AmbientLight(0xfff0f6, 0.78);
    scene.add(ambient);
    sun = new THREE.DirectionalLight(0xfff2d8, 0.72);
    sun.position.set(-0.55, 1, 0.35);
    scene.add(sun);
    fill = new THREE.DirectionalLight(0xd8e8ff, 0.26);
    fill.position.set(0.5, -0.4, -0.6);
    scene.add(fill);

    buildAssets();
    buildSky();
    buildMountains();
    buildSnowFall();
    buildSled();
    buildParticles();
    resize();
    window.addEventListener("resize", resize);
    if (pendingSkin) applySkin(pendingSkin);
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* -------------------------------------------------------------- LE CIEL */
  function buildSky() {
    skyMat = new THREE.MeshBasicMaterial({
      map: tex(paintSky()), side: THREE.BackSide, fog: false, depthWrite: false,
    });
    skyDome = new THREE.Mesh(new THREE.SphereGeometry(CFG.DRAW_DISTANCE * 0.92, 24, 16), skyMat);
    skyDome.renderOrder = -10;
    scene.add(skyDome);
  }

  /* ------------------------------------------------------- LES MONTAGNES --
     Deux chaînes, et la différence entre elles n'est pas qu'une distance :

       * la PROCHE est en Lambert, elle reçoit la lumière, elle a des calottes
         de sucre glace et des ombres — c'est du relief ;
       * la LOINTAINE est en Basic SANS brouillard, d'une seule teinte bleutée.
         C'est un aplat. Lui donner du relief la ferait remonter au premier
         plan et écraserait la chaîne proche ; l'aplat, lui, recule.

     C'est la perspective atmosphérique, et c'est ce qui donne sa profondeur au
     cadre large qu'on demande. */
  function ring(count, radius, minR, maxR, minH, maxH, m, capM, group, seedBase) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.sin(i * 7.3) * 0.09;
      const rad = radius * (0.82 + ((i * 37) % 100) / 100 * 0.36);
      const r = minR + ((i * 53) % 100) / 100 * (maxR - minR);
      const h = minH + ((i * 71) % 100) / 100 * (maxH - minH);
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      const c = coneM(m, r, h, x, h / 2 - 18, z);
      group.add(c);
      if (capM) {
        /* La calotte : un second cône, plus petit, posé au sommet. Deux cônes
           valent mieux qu'une texture — la ligne de neige suit alors vraiment
           la silhouette, quel que soit l'angle sous lequel on la voit. */
        const ch = h * 0.34;
        group.add(coneM(capM, r * 0.34, ch, x, h - ch / 2 - 18, z));
      }
    }
  }

  function buildMountains() {
    mountainsNear = new THREE.Group();
    ring(CFG.WORLD_MOUNTAINS, 330, 46, 108, 62, 148, mat.mount, mat.mountCap, mountainsNear);
    scene.add(mountainsNear);

    mountainsFar = new THREE.Group();
    ring(CFG.WORLD_MOUNTAINS_FAR, 640, 90, 190, 110, 235, mat.mountFar, null, mountainsFar);
    mountainsFar.renderOrder = -5;
    scene.add(mountainsFar);
  }

  /* ------------------------------------------------ LA NEIGE QUI TOMBE ----
     Elle remplit le ciel au-dessus de l'horizon, là où il n'y a ni piste ni
     décor — c'est-à-dire précisément la moitié du cadre que le cadrage large
     nous a donnée. Sans elle, ce grand ciel est vide. */
  function buildSnowFall() {
    const n = CFG.FX_SNOW_COUNT;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * CFG.FX_SNOW_AREA * 2;
      pos[i * 3 + 1] = Math.random() * 60;
      pos[i * 3 + 2] = (Math.random() - 0.5) * CFG.FX_SNOW_AREA * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    snowFall = new THREE.Points(g, new THREE.PointsMaterial({
      map: tex(paintDust()), size: 0.55, transparent: true, opacity: 0.75,
      depthWrite: false, sizeAttenuation: true, fog: false,
    }));
    scene.add(snowFall);
  }

  /* ======================================================================
     LA LUGE ET SON PILOTE
     ----------------------------------------------------------------------
     Une trentaine de boîtes, articulées en trois groupes : la coque, le buste
     (qui se penche) et les bras (qui tiennent la corde). Le pilote est assis,
     jambes tendues vers l'avant — c'est la posture de luge, et elle vaut
     d'être tenue : un personnage debout sur une luge ressemble à un
     surfeur, ce qui n'est pas le même jeu.
     ====================================================================== */
  function buildSled() {
    sledRig = new THREE.Group();

    const body = new THREE.Group();
    sledParts.body = body;
    sledRig.add(body);

    // Les patins : deux longues barres de caramel, recourbées à l'avant par
    // trois segments d'inclinaison croissante.
    for (const side of [-1, 1]) {
      body.add(box(mat.runner, 0.22, 0.16, 3.4, side * 0.62, 0.12, 0));
      const t1 = box(mat.runner, 0.22, 0.16, 0.75, side * 0.62, 0.22, -1.9);
      t1.rotation.x = 0.42; body.add(t1);
      const t2 = box(mat.runner, 0.22, 0.16, 0.6, side * 0.62, 0.52, -2.28);
      t2.rotation.x = 1.0; body.add(t2);
      // Les montants qui relient le patin au plancher.
      body.add(box(mat.sledDark, 0.14, 0.34, 0.14, side * 0.62, 0.35, -1.0));
      body.add(box(mat.sledDark, 0.14, 0.34, 0.14, side * 0.62, 0.35, 0.9));
    }
    // Le plancher : cinq lattes, comme la luge de la capture de référence.
    for (let i = 0; i < 5; i++) {
      body.add(box(mat.sled, 0.28, 0.1, 3.1, -0.62 + i * 0.31, 0.56, 0));
    }
    body.add(box(mat.sledDark, 1.5, 0.12, 0.16, 0, 0.6, -1.45));
    body.add(box(mat.sledDark, 1.5, 0.12, 0.16, 0, 0.6, 1.45));

    /* ======================================================================
       LE PILOTE — ⚠️ C'EST LE FERMIER, PAS UN BONHOMME DE PLUS.
       ----------------------------------------------------------------------
       Reproche de Guillaume au premier jet : « le perso principal n'est pas
       travaillé (il doit ressembler au fermier) ». Il avait raison, et le
       défaut était de méthode : on avait empilé des boîtes au jugé au lieu de
       reprendre CELLES DU FERMIER.

       Les proportions ci-dessous sont donc RECOPIÉES de buildPlayer() dans
       public/templerun/js/world.js, à l'unité près : tête 0,78 × 0,68 × 0,62,
       calotte de cheveux 0,84 × 0,24 × 0,68, nuque en +Z, cou 0,34 de large,
       torse 0,95 × 0,75 × 0,55, et l'échelle générale de 0,88. Ce sont
       elles-mêmes les proportions du sprite 2D de la ferme (fermeArt.js). Le
       même homme doit se reconnaître d'un jeu à l'autre — c'est déjà vrai
       entre la ferme, le défi de fuite et le labyrinthe, ça doit l'être ici.

       ⚠️ LA NUQUE EST EN +Z, ET C'EST LA SEULE CHOSE QUI DIT DE QUEL CÔTÉ IL
       REGARDE. Le zip 377 avait posé la sienne du mauvais côté au défi de
       fuite : le fermier courait avec sa nuque sur le front pendant toute une
       version, et ça ne s'est vu qu'en le RENDANT. Ici la convention est la
       même : il regarde vers son -Z local, la caméra est en +Z.

       ⚠️ ET IL EXISTE EN FEMME. Le pont envoie `skin.gender` ; les cheveux
       longs sont construits masqués et révélés par applySkin, exactement comme
       au défi de fuite. Un fermier qui redevient un homme en montant sur une
       luge, c'est le genre de détail qui casse tout le reste.

       LA POSTURE est la seule chose qui change : assis, jambes tendues vers
       l'avant, buste incliné, bras tendus sur la corde. Un personnage debout
       sur une luge ressemble à un surfeur, ce qui n'est pas ce jeu.
       ====================================================================== */
    const rider = new THREE.Group();
    rider.position.set(0, 0.66, 0.15);
    rider.scale.setScalar(0.88);            // la même réduction qu'au défi de fuite
    sledParts.rider = rider;
    body.add(rider);

    // Le bassin, posé sur le plancher.
    rider.add(box(mat.pants, 0.86, 0.34, 0.62, 0, 0.17, 0.12));

    /* Les jambes, TENDUES VERS L'AVANT. Deux segments comme le fermier
       (cuisse + mollet), mais alignés à plat au lieu d'être articulés : une
       luge n'a pas de place pour un genou plié, et une jambe en un seul bloc
       se lit comme une planche. */
    for (const side of [-1, 1]) {
      rider.add(box(mat.pants, 0.32, 0.30, 0.86, side * 0.24, 0.19, -0.52));
      rider.add(box(mat.pants, 0.30, 0.28, 0.62, side * 0.24, 0.16, -1.14));
      rider.add(box(mat.boot, 0.34, 0.24, 0.46, side * 0.24, 0.12, -1.58));
    }

    const torso = new THREE.Group();
    torso.position.set(0, 0.30, 0.06);
    sledParts.torso = torso;
    rider.add(torso);

    torso.add(box(mat.shirt, 0.95, 0.75, 0.55, 0, 0.34, 0));     // torse du fermier
    torso.add(box(mat.scarf, 0.86, 0.16, 0.60, 0, 0.68, 0));     // écharpe (la seule pièce propre à la luge)
    torso.add(box(mat.skin, 0.34, 0.16, 0.34, 0, 0.78, 0));      // cou

    const head = new THREE.Group();
    head.position.set(0, 0.86, 0);
    torso.add(head);
    head.add(box(mat.skin, 0.78, 0.68, 0.62, 0, 0.34, 0));       // tête
    head.add(box(mat.hair, 0.84, 0.24, 0.68, 0, 0.62, 0));       // calotte
    const nape = box(mat.hair, 0.86, 0.44, 0.16, 0, 0.36, 0.26); // nuque, en +Z
    head.add(nape);
    sledParts.nape = nape;

    // Cheveux longs, masqués par défaut (révélés si la ferme annonce "f").
    const femHead = [
      box(mat.hair, 0.20, 0.72, 0.40, -0.40, 0.24, 0.08),
      box(mat.hair, 0.20, 0.72, 0.40, 0.40, 0.24, 0.08),
      box(mat.hair, 0.88, 0.76, 0.18, 0, 0.26, 0.30),
    ];
    for (const m of femHead) { m.visible = false; head.add(m); }
    sledParts.femHead = femHead;

    /* Les bras : épaule à hauteur de poitrine, tendus vers la corde. Deux
       segments, comme le fermier — un bras en une seule boîte ne peut pas
       avoir de coude, et c'est le coude qui fait qu'on tient quelque chose. */
    const arms = new THREE.Group();
    arms.position.set(0, 0.56, 0);
    sledParts.arms = arms;
    torso.add(arms);
    for (const side of [-1, 1]) {
      const up = box(mat.shirt, 0.26, 0.26, 0.52, side * 0.56, 0, -0.22);
      up.rotation.x = -0.30; arms.add(up);
      const lo = box(mat.skin, 0.24, 0.24, 0.48, side * 0.56, -0.10, -0.62);
      lo.rotation.x = -0.55; arms.add(lo);
      arms.add(box(mat.skin, 0.24, 0.22, 0.20, side * 0.54, -0.22, -0.86));  // main
    }

    // La corde de guidage, tendue entre les mains et le nez de la luge.
    const rope = box(mat.trunk, 0.05, 0.05, 1.5, 0, 1.0, -1.6);
    rope.rotation.x = 0.5; body.add(rope);

    scene.add(sledRig);
  }

  /* ⚠️ LA TENUE ARRIVE PAR MESSAGE, DONC PARFOIS AVANT LA SCÈNE. `pendingSkin`
     retient la première et init() la rejoue — c'est le même dispositif qu'au
     défi de fuite, et il rend l'ordre d'arrivée indifférent. Sans lui, un
     joueur sur une connexion rapide voyait le fermier par défaut. */
  function applySkin(sk) {
    if (!sk) return;
    if (!mat.shirt) { pendingSkin = sk; return; }
    mat.shirt.color.setHex(sk.shirt);
    mat.pants.color.setHex(sk.pants);
    mat.hair.color.setHex(sk.hair);
    mat.skin.color.setHex(sk.skin);
    const fem = sk.gender === "f";
    if (sledParts.femHead) for (const m of sledParts.femHead) m.visible = fem;
    /* La nuque est MASQUÉE chez la femme : les cheveux longs la recouvrent
       entièrement, et deux volumes de cheveux superposés se battraient en
       profondeur sur toute la descente. Même raison qu'au zip 377. */
    if (sledParts.nape) sledParts.nape.visible = !fem;
  }

  /* ======================================================================
     LES PARTICULES — étoiles de dérapage et poudre féérique.
     ----------------------------------------------------------------------
     ⚠️ DEUX SYSTÈMES SÉPARÉS, ET C'EST VOULU (voir config.js). Les étoiles
     sont nettes, colorées, éjectées vite, et elles se REGARDENT : c'est la
     récompense du geste. La poudre est pâle, lente, dense, et elle ne se
     regarde pas : elle donne la vitesse au coin de l'œil. Un seul système
     réglé au milieu ne ferait ni l'un ni l'autre.
     ====================================================================== */
  function makePoints(n, texCanvas, size, opacity, additive) {
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) pos[i] = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({
      map: tex(texCanvas), size, transparent: true, opacity,
      depthWrite: false, sizeAttenuation: true, vertexColors: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;    // les particules vivent autour de la luge, jamais autour de l'origine
    return { points: p, pos, col, n, live: [] };
  }

  function buildParticles() {
    stars = makePoints(CFG.FX_STAR_MAX, paintStar(), CFG.FX_STAR_SIZE, 0.95, true);
    dust = makePoints(CFG.FX_DUST_MAX, paintDust(), CFG.FX_DUST_SIZE, 0.5, false);
    lines = makePoints(CFG.FX_LINE_MAX, paintDust(), CFG.FX_LINE_SIZE, 0.42, true);
    scene.add(stars.points);
    scene.add(dust.points);
    scene.add(lines.points);
    for (let i = 0; i < CFG.FX_STAR_MAX; i++) stars.live.push({ t: -1 });
    for (let i = 0; i < CFG.FX_DUST_MAX; i++) dust.live.push({ t: -1 });
    for (let i = 0; i < CFG.FX_LINE_MAX; i++) lines.live.push({ t: -1 });
  }

  function emit(sys, x, y, z, vx, vy, vz, life, r, g, b) {
    for (let i = 0; i < sys.n; i++) {
      const p = sys.live[i];
      if (p.t > 0) continue;
      p.t = life; p.life = life;
      p.x = x; p.y = y; p.z = z;
      p.vx = vx; p.vy = vy; p.vz = vz;
      p.r = r; p.g = g; p.b = b;      // couleur de naissance, gardée pour l'extinction
      return;
    }
    // Réserve pleine : on laisse tomber. Recycler la plus ancienne ferait
    // clignoter les gerbes existantes, ce qui se voit bien plus qu'une
    // étincelle manquante sur deux cent soixante.
  }

  /* ⚠️ L'EXTINCTION SE FAIT PAR LA COULEUR, PAS PAR L'OPACITÉ. `PointsMaterial`
     n'a qu'une opacité GLOBALE, la même pour toutes les particules du système :
     la faire décroître éteindrait la gerbe entière d'un coup, y compris les
     étoiles qui viennent de naître. En modulant la couleur par particule (les
     étoiles sont en fondu additif, une couleur qui tend vers le noir tend donc
     vers l'invisible), chaque étincelle s'éteint pour son compte.
     Le fondu est quadratique : une extinction linéaire donne une gerbe qui
     « coupe », parce que l'œil lit la luminosité en gamma. */
  function stepParticles(sys, dt, gravity) {
    const P = sys.pos, C = sys.col;
    for (let i = 0; i < sys.n; i++) {
      const p = sys.live[i];
      if (p.t <= 0) {
        P[i * 3 + 1] = -99999;          // hors champ, et la couleur reste noire
        C[i * 3] = C[i * 3 + 1] = C[i * 3 + 2] = 0;
        continue;
      }
      p.t -= dt;
      p.vy -= gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      P[i * 3] = p.x; P[i * 3 + 1] = p.y; P[i * 3 + 2] = p.z;
      const k = Math.max(0, p.t / p.life);
      const f = k * k;
      C[i * 3] = p.r * f; C[i * 3 + 1] = p.g * f; C[i * 3 + 2] = p.b * f;
    }
    sys.points.geometry.attributes.position.needsUpdate = true;
    sys.points.geometry.attributes.color.needsUpdate = true;
  }

  /* ======================================================================
     LA PISTE ET SON DÉCOR — construits par tronçon.
     ====================================================================== */
  const SUB = 4;   // sous-découpes d'un tronçon : la courbe doit rester lisse

  /* Le RUBAN. Une BufferGeometry à la main, avec ses UV : c'est la seule façon
     d'avoir une piste qui suit exactement la courbe. Un plan déformé ou une
     suite de quads posés bout à bout laisse toujours voir ses jointures dans
     les virages — le défaut qu'on voit dans tous les jeux de descente ratés. */
  /* ⚠️ LES UV SONT EN UNITÉS DU MONDE, PAS EN 0..1. C'est LA correction du
     zip 412, et c'est ce qui donnait un sol « sans texture » :

     l'ancienne version posait `u = 0` d'un bord et `u = 1` de l'autre. Sur une
     bande de neige large de cent cinquante unités, le motif était donc étiré
     cent cinquante fois en travers — une bouillie uniforme, c'est-à-dire un
     aplat. Et sur la piste, la coordonnée le long de la marche était divisée
     par 34 puis multipliée par 26 (le `repeat` du matériau) : le motif se
     répétait tous les 1,3 mètre, ce qui à l'écran ne se lit plus comme un
     motif mais comme du bruit.

     Ici, `tile` est une TAILLE RÉELLE en unités : « ce carreau fait 6 mètres
     de côté ». Les deux axes sont traités pareil, le motif est donc carré au
     sol quelle que soit la largeur du ruban, et il ne change pas d'échelle
     quand la piste s'élargit. Les `repeat` des matériaux repassent à 1.
     ⚠️ NE PAS REVENIR À DES UV NORMALISÉS : c'est exactement la faute qu'on
     vient de corriger, et elle ne se voit qu'à l'écran. */
  function ribbon(s0, s1, uL, uR, yOff, m, tile, terrain) {
    const N = SUB;
    const T = tile || 6;
    const verts = [], uvs = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const s = s0 + (s1 - s0) * (i / N);
      /* ⚠️ `terrain` CHANGE LA SURFACE DE RÉFÉRENCE, et ce n'est pas un détail
         de rendu : la piste est BANQUÉE (son dévers est un profil de piste),
         le terrain ne l'est pas. Les confondre soulevait le champ de neige de
         trente-sept mètres à cent unités du centre — voir Slope.terrainAt. */
      const a = terrain ? Slope.terrainAt(s, uL) : Slope.pointAt(s, uL);
      const b = terrain ? Slope.terrainAt(s, uR) : Slope.pointAt(s, uR);
      verts.push(a.x, a.y + yOff, a.z, b.x, b.y + yOff, b.z);
      const v = s / T;
      uvs.push(uL / T, v, uR / T, v);
    }
    for (let i = 0; i < N; i++) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    /* Marqué : c'est la SEULE géométrie propre à un tronçon. dropNode ne
       libère que celles-là — libérer les géométries partagées viderait le
       décor de tous les autres tronçons d'un coup (voir dropNode). */
    g.__ribbon = true;
    return new THREE.Mesh(g, m);
  }

  /* Un hasard STABLE, dérivé de l'indice du tronçon. Deux joueurs voient le
     même décor, et surtout : revenir en arrière ne le redessine pas autrement.
     Un Math.random() ferait danser les sucettes à chaque reconstruction. */
  function hash(i, k) {
    let h = (i * 374761393 + k * 668265263) >>> 0;
    h = (h ^ (h >>> 13)) * 1274126177 >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  /* Une SUCETTE : un bâton et un disque. Le disque est légèrement incliné vers
     la piste — une sucette vue de profil est un trait, et une forêt de traits
     n'est pas une forêt. */
  function lollipop(g, x, y, z, r, hue, tilt) {
    g.add(cylM(mat.white, 0.09, r * 2.1, x, y + r * 1.05, z, true));
    const head = new THREE.Mesh(geo.disc, mat.candy[hue]);
    head.scale.set(r * 2, 1, r * 2);
    head.position.set(x, y + r * 2.1, z);
    head.rotation.x = Math.PI / 2;
    head.rotation.z = tilt;
    g.add(head);
  }

  /* Un SAPIN DE GOMME : trois sphères aplaties, de la plus large à la plus
     petite, sur un tronc. Trois teintes tirées de la même palette, jamais la
     même deux fois de suite sur un même arbre. */
  function gumTree(g, x, y, z, h, i) {
    g.add(cylM(mat.trunk, 0.22, h * 0.42, x, y + h * 0.21, z, true));
    for (let k = 0; k < 3; k++) {
      const r = h * (0.42 - k * 0.1);
      const hue = Math.floor(hash(i, 30 + k) * CFG.COL_CANDY_SET.length);
      const s = sph(mat.candy[hue], r, x, y + h * (0.42 + k * 0.26), z);
      s.scale.y *= 0.78;
      g.add(s);
    }
  }

  /* Une MAISON DE PAIN D'ÉPICES. Six boîtes, un toit à deux pentes en glaçage,
     des bonbons plantés dessus. C'est le seul objet du décor qui a une
     silhouette « construite » : c'est lui qui dit qu'on traverse un pays
     habité et pas un terrain vague enneigé. */
  function gingerHouse(g, x, y, z, sc, i) {
    const w = 3.4 * sc, h = 2.6 * sc, d = 3.0 * sc;
    g.add(box(mat.ginger, w, h, d, x, y + h / 2, z));
    // Le toit : deux plans inclinés qui se rejoignent en faîte.
    for (const side of [-1, 1]) {
      const r = box(mat.icing, w * 0.78, 0.22 * sc, d * 1.16, x + side * w * 0.29, y + h + 0.62 * sc, z);
      r.rotation.z = side * 0.72;
      g.add(r);
    }
    g.add(box(mat.icing, 0.3 * sc, 0.3 * sc, d * 1.2, x, y + h + 1.16 * sc, z));
    // Porte, fenêtres, et trois bonbons sur le faîte.
    g.add(box(mat.gingerDark, 0.8 * sc, 1.2 * sc, 0.1, x, y + 0.6 * sc, z + d / 2 + 0.05));
    g.add(box(mat.icing, 0.6 * sc, 0.6 * sc, 0.1, x - w * 0.3, y + h * 0.62, z + d / 2 + 0.05));
    g.add(box(mat.icing, 0.6 * sc, 0.6 * sc, 0.1, x + w * 0.3, y + h * 0.62, z + d / 2 + 0.05));
    for (let k = 0; k < 3; k++) {
      const hue = Math.floor(hash(i, 60 + k) * CFG.COL_CANDY_SET.length);
      g.add(sph(mat.candy[hue], 0.26 * sc, x, y + h + 1.5 * sc, z + (k - 1) * d * 0.34, true));
    }
    // Une cheminée, parce qu'une maison sans cheminée se lit comme une caisse.
    g.add(box(mat.gingerDark, 0.5 * sc, 1.1 * sc, 0.5 * sc, x + w * 0.24, y + h + 1.2 * sc, z - d * 0.22));
  }

  /* Une ARCHE DE MENTHE POIVRÉE au-dessus de la piste. Elle a deux fonctions,
     et la seconde est du gameplay : elle marque un repère de distance dans un
     paysage qui, sans elle, défile sans échelle. On sait qu'on avance parce
     qu'on passe des arches. */
  function archOver(g, s, width) {
    const c = Slope.pointAt(s, 0);
    const f = Slope.frameAt(s);
    const arc = new THREE.Mesh(geo.torus, mat.cane);
    const R = width * 0.56;
    arc.scale.set(R, R, 1.6);
    arc.position.set(c.x, c.y, c.z);
    arc.rotation.y = f.yaw;
    g.add(arc);
    for (const side of [-1, 1]) {
      const p = Slope.pointAt(s, side * width * 0.56);
      const post = cylM(mat.cane, 0.34, 1.4, p.x, p.y + 0.7, p.z);
      g.add(post);
      // Le bonbon rond planté au sommet de chaque montant.
      g.add(sph(mat.candy[Math.floor(hash(s | 0, 5) * CFG.COL_CANDY_SET.length)], 0.5,
        p.x, p.y + 1.6, p.z));
    }
  }

  /* ----------------------------------------------------------------------
     LE TRONÇON COMPLET.
     ---------------------------------------------------------------------- */
  function buildNode(node) {
    if (node.group) return;
    const g = new THREE.Group();
    const s0 = node.s0, s1 = node.s1;
    const W = node.width, half = W / 2;

    /* 1. LA NEIGE, largement débordante des deux côtés. Elle est construite en
       deux bandes plutôt qu'en un seul grand plan : un plan unique passant
       SOUS la piste produirait un z-fighting rose et blanc visible à
       cinquante mètres. */
    /* Trois bandes par côté, et non une seule : le relief du terrain est une
       somme de sinus, et une bande unique de cent cinquante unités de large ne
       l'échantillonnerait qu'à ses deux bords — donc pas du tout. Les bandes
       sont resserrées près de la piste, là où la remontée du talus est la plus
       raide et où le joueur regarde. */
    const BANDS = [0, 7, 16, 30, 52, 88, 155];
    for (const side of [-1, 1]) {
      for (let k = 0; k < BANDS.length - 1; k++) {
        g.add(ribbon(s0, s1, side * (half + BANDS[k]), side * (half + BANDS[k + 1]),
          0, mat.snow, 11, true));
      }
    }

    /* 2. LA PISTE : le dessus, puis un liseré vertical de chaque côté. Le
       liseré est l'épaisseur du ruban (règle 5) — c'est lui qui garde la piste
       lisible quand la caméra s'abaisse dans les virages relevés. */
    g.add(ribbon(s0, s1, -half, half, 0, mat.piste, 7.5));
    for (const side of [-1, 1]) {
      const e = ribbon(s0, s1, side * half, side * half, -0.34, mat.pisteEdge, 4);
      // Le liseré est un ruban de largeur nulle : on l'épaissit en écartant
      // ses deux bords en HAUTEUR plutôt qu'en largeur.
      const pos = e.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 6) pos[i + 4] += 0.34;
      e.geometry.attributes.position.needsUpdate = true;
      e.geometry.computeVertexNormals();
      g.add(e);
    }

    /* 3. LES BARRIÈRES en sucre d'orge : un piquet tous les 4 u, une lisse
       horizontale entre deux piquets. Elles bornent la piste à l'œil, ce qui
       est indispensable — sans elles, le bord de piste ne se voit qu'au moment
       où on le franchit. */
    const stepN = 4;
    for (const side of [-1, 1]) {
      for (let k = 0; k <= CFG.NODE_LEN / stepN; k++) {
        const s = s0 + k * stepN;
        if (s > s1) break;
        const p = Slope.pointAt(s, side * (half + 0.9));
        g.add(cylM(mat.cane, 0.16, 1.5, p.x, p.y + 0.75, p.z, true));
        const q = Slope.pointAt(s + stepN, side * (half + 0.9));
        const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, z: (p.z + q.z) / 2 };
        const rail = box(mat.cane, 0.12, 0.12, Math.hypot(q.x - p.x, q.z - p.z, q.y - p.y),
          mid.x, mid.y + 1.15, mid.z);
        rail.rotation.y = Math.atan2(q.x - p.x, q.z - p.z);
        g.add(rail);
      }
    }

    /* 4. LE DÉCOR, à droite et à gauche, tiré d'un hasard STABLE. Il change
       avec le palier : village de pain d'épices, forêt de sucettes, hauteurs
       glacées. Un jeu de descente qui montre le même paysage cinq minutes n'a
       pas de progression, même si ses nombres montent. */
    const st = node.stage;
    for (const side of [-1, 1]) {
      const base = node.i * 2 + (side > 0 ? 1 : 0);
      const s = s0 + hash(base, 1) * CFG.NODE_LEN;
      const near = half + 4 + hash(base, 2) * 12;
      const far = half + 20 + hash(base, 3) * 46;

      /* ⚠️ TOUT LE DÉCOR EST POSÉ SUR `terrainAt`, JAMAIS SUR `pointAt`. Posé
         sur la surface banquée, il flottait en l'air ou s'enterrait dès qu'on
         s'éloignait du bord — et cent unités de dévers extrapolé, ça se compte
         en dizaines de mètres. Une sucette plantée en l'air est le genre de
         détail qui décrédibilise un décor entier. */
      if (hash(base, 4) < CFG.WORLD_LOLLI_DENSITY * (st === 1 ? 1.6 : 1)) {
        const p = Slope.terrainAt(s, side * near);
        lollipop(g, p.x, p.y, p.z, 0.9 + hash(base, 5) * 1.5,
          Math.floor(hash(base, 6) * CFG.COL_CANDY_SET.length), (hash(base, 7) - 0.5) * 0.5);
      }
      if (hash(base, 8) < CFG.WORLD_TREE_DENSITY) {
        const p = Slope.terrainAt(s + 3, side * far);
        gumTree(g, p.x, p.y, p.z, 3.5 + hash(base, 9) * 4.5, base);
      }
      // Les sapins du fond, plus gros : c'est eux qui remplissent l'espace
      // entre la piste et les montagnes. Ils restent DANS la bande de neige
      // (150 unités) — au-delà, ils flotteraient au-dessus du vide.
      if (hash(base, 10) < 0.75) {
        const u = Math.min(half + 142, far + 26 + hash(base, 11) * 70);
        const p = Slope.terrainAt(s - 2, side * u);
        gumTree(g, p.x, p.y, p.z, 6 + hash(base, 12) * 7, base + 999);
      }
    }

    // Le hameau de pain d'épices : seulement au palier 0 et 3, et toujours du
    // même côté sur toute sa longueur — un village dont les maisons alternent
    // de bord n'est pas un village.
    if ((st === 0 || st === 3) && node.i % CFG.WORLD_HOUSE_EVERY === 0) {
      const side = hash(node.i, 20) < 0.5 ? -1 : 1;
      for (let k = 0; k < 3; k++) {
        const p = Slope.terrainAt(s0 + k * 3.1, side * (half + 15 + hash(node.i, 21 + k) * 14));
        gingerHouse(g, p.x, p.y, p.z, 1 + hash(node.i, 25 + k) * 0.6, node.i * 3 + k);
      }
    }

    if (node.i % CFG.WORLD_ARCH_EVERY === 0 && node.i > 2) {
      archOver(g, s0 + CFG.NODE_LEN / 2, W);
    }

    node.group = g;
    scene.add(g);
  }

  function dropNode(node) {
    if (!node.group) return;
    scene.remove(node.group);
    node.group.traverse((o) => {
      // ⚠️ ON NE DÉTRUIT QUE LES GÉOMÉTRIES PROPRES AU TRONÇON (les rubans).
      // Les autres sont partagées (règle 2) : les libérer viderait le décor de
      // tous les tronçons d'un coup, ce qui est la panne la plus déroutante
      // qu'on puisse s'infliger dans une scène à construction continue.
      if (o.isMesh && o.geometry && o.geometry.__ribbon) o.geometry.dispose();
    });
    node.group = null;
  }

  /* ======================================================================
     GOURMANDS ET BONBONS — meshes pris/rendus à la réserve.
     ====================================================================== */
  function makeCritter(kind) {
    const g = new THREE.Group();
    const hue = { gum: 0, marsh: 2, jelly: 4 }[kind];
    const bodyMat = mat.candy[hue];
    if (kind === "gum") {
      // L'ourson en gomme : un corps, une tête, deux oreilles, un museau clair.
      const b = sph(bodyMat, 1.15, 0, 1.15, 0); b.scale.y *= 1.1; g.add(b);
      g.add(sph(bodyMat, 0.78, 0, 2.5, 0));
      g.add(sph(bodyMat, 0.3, -0.6, 3.05, 0, true));
      g.add(sph(bodyMat, 0.3, 0.6, 3.05, 0, true));
      g.add(sph(mat.icing, 0.34, 0, 2.35, -0.6, true));
      for (const side of [-1, 1]) {
        g.add(sph(bodyMat, 0.42, side * 1.15, 1.1, 0.1, true));    // bras
        g.add(sph(bodyMat, 0.45, side * 0.55, 0.35, 0.15, true));  // pieds
      }
      g.add(sph(mat.eye, 0.14, -0.28, 2.66, -0.62, true));
      g.add(sph(mat.eye, 0.14, 0.28, 2.66, -0.62, true));
    } else if (kind === "marsh") {
      // La guimauve : un cylindre bien rond, un chapeau de glaçage.
      g.add(cylM(mat.icing, 1.1, 2.1, 0, 1.05, 0));
      g.add(sph(mat.icing, 1.08, 0, 2.1, 0));
      g.add(cylM(bodyMat, 1.12, 0.4, 0, 2.4, 0));
      g.add(sph(mat.eye, 0.15, -0.32, 1.85, -0.95, true));
      g.add(sph(mat.eye, 0.15, 0.32, 1.85, -0.95, true));
      g.add(box(mat.eye, 0.42, 0.08, 0.08, 0, 1.5, -1.0));
    } else {
      // La gelée : un cône mou, deux gros yeux. Elle tremble (voir update).
      const b = coneM(bodyMat, 1.25, 2.4, 0, 1.2, 0); g.add(b);
      g.add(sph(bodyMat, 1.2, 0, 0.6, 0));
      g.add(sph(mat.white, 0.34, -0.38, 1.55, -0.8, true));
      g.add(sph(mat.white, 0.34, 0.38, 1.55, -0.8, true));
      g.add(sph(mat.eye, 0.17, -0.38, 1.55, -1.0, true));
      g.add(sph(mat.eye, 0.17, 0.38, 1.55, -1.0, true));
    }
    return g;
  }

  function takeCritter(kind) {
    const m = pool[kind].pop() || makeCritter(kind);
    m.visible = true;
    scene.add(m);
    return m;
  }
  function giveCritter(kind, m) {
    scene.remove(m);
    pool[kind].push(m);
  }

  function makeCandy(hue) {
    const g = new THREE.Group();
    g.add(sph(mat.candy[hue], 0.62, 0, 0, 0));
    // Un halo non éclairé, légèrement plus gros : c'est ce qui fait que le
    // bonbon se voit à trente mètres, contre un fond blanc, sans avoir à le
    // faire briller par une lumière (qui coûterait cher et éclairerait la
    // neige autour).
    const halo = sph(mat.candyGlow[hue], 1.0, 0, 0, 0, true);
    g.add(halo);
    g.add(box(mat.white, 1.3, 0.1, 0.1, 0, 0, 0));
    return g;
  }

  /* ======================================================================
     MISE À JOUR PAR IMAGE
     ====================================================================== */
  function updateSled(sled, now) {
    const p = sled.worldPos();
    sledRig.position.set(p.x, p.y + 0.02, p.z);
    // L'orientation : le lacet de la PISTE, plus l'angle propre de la luge.
    sledRig.rotation.set(0, 0, 0);
    sledRig.rotation.y = Slope.yawAt(sled.s) + sled.heading;
    sledRig.rotation.x = sled.pitchVis;
    sledRig.rotation.z = sled.roll;

    /* Le buste CONTRE-BRAQUE : il se penche un peu moins que la luge, et un
       peu en retard. C'est ce qui empêche l'ensemble de se lire comme un bloc
       rigide, et c'est le détail qui fait qu'un dérapage a l'air piloté. */
    if (sledParts.torso) {
      sledParts.torso.rotation.z = -sled.roll * 0.45 + sled.drift * 0.12;
      sledParts.torso.rotation.x = 0.18 + Math.min(0.3, sled.v / 200) - (sled.grounded ? 0 : 0.15);
      sledParts.arms.rotation.x = -0.2 - sled.drift * 0.35;
    }
  }

  function updateCritters(field, now) {
    const t = now / 1000;
    for (const c of field.list) {
      if (!c.mesh) c.mesh = takeCritter(c.kind);
      const p = Slope.pointAt(c.s, c.u);
      const bob = c.kind === "jelly" ? 0 : Math.max(0, Math.sin(t * 4 + c.hop)) * 0.55;
      c.mesh.position.set(p.x, p.y + bob, p.z);
      c.mesh.rotation.y = Slope.yawAt(c.s) + Math.sin(t * 1.4 + c.hop) * 0.4;
      // La gelée TREMBLE au lieu de sautiller : trois créatures qui font le
      // même petit saut se liraient comme une seule créature repeinte.
      if (c.kind === "jelly") {
        const q = 1 + Math.sin(t * 9 + c.hop) * 0.12;
        c.mesh.scale.set(1 / q, q, 1 / q);
      }
    }
    for (const k of field.candies) {
      if (!k.mesh) { k.mesh = makeCandy(k.hue); scene.add(k.mesh); }
      const p = Slope.pointAt(k.s, k.u);
      k.mesh.position.set(p.x, p.y + 1.5 + Math.sin(t * 2.5 + k.s) * 0.22, p.z);
      k.mesh.rotation.y = t * 2.2 + k.s;
    }
    if (field.gone) {
      for (const c of field.gone) {
        if (!c.mesh) continue;
        if (c.kind) giveCritter(c.kind, c.mesh);
        else scene.remove(c.mesh);
        c.mesh = null;
      }
      field.gone.length = 0;
    }
  }

  /* Les particules. ⚠️ C'EST ICI QUE SE JOUE « DES DÉRAPAGES QUI PRODUISENT DES
     ÉTOILES ET DE LA POUDRE FÉERIQUE », et trois détails font toute la
     différence entre un effet joli et un effet quelconque :

       1. LES ÉTOILES PARTENT DES PATINS, pas du centre de la luge. Deux
          sources, une par patin, décalées vers l'arrière : c'est ce qui donne
          les deux gerbes symétriques qu'on attend d'un dérapage.
       2. ELLES SONT ÉJECTÉES VERS L'EXTÉRIEUR DU VIRAGE, donc vers le haut du
          dévers, donc dans le champ de la caméra. Éjectées vers l'intérieur,
          elles passeraient sous la luge et on ne les verrait jamais.
       3. LEUR COULEUR EST TIRÉE DE LA PALETTE DES BONBONS et change en
          continu. Des étincelles blanches seraient de la poussière ; des
          étincelles roses, jaunes et menthe sont de la magie. */
  function updateFx(sled, dt, now) {
    const p = sled.worldPos();
    const f = Slope.frameAt(sled.s);
    const yaw = Slope.yawAt(sled.s) + sled.heading;
    const back = { x: Math.sin(yaw) * 1.7, z: -Math.cos(yaw) * 1.7 };

    if (sled.drift > 0.05 && sled.grounded) {
      const n = Math.round(CFG.FX_STAR_RATE * sled.drift * dt);
      const outward = -Math.sign(sled.heading || 1);
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1;
        const ox = f.right.x * side * 0.65, oz = f.right.z * side * 0.65;
        const sp = CFG.FX_STAR_SPREAD * (0.5 + sled.drift * 0.9);
        const c = CFG.COL_CANDY_SET[(Math.random() * CFG.COL_CANDY_SET.length) | 0];
        emit(stars,
          p.x + ox + back.x, p.y + 0.25, p.z + oz + back.z,
          f.right.x * outward * sp * (0.6 + Math.random() * 0.8) + (Math.random() - 0.5) * 2,
          CFG.FX_STAR_RISE * (0.5 + Math.random()),
          f.right.z * outward * sp * (0.6 + Math.random() * 0.8) + (Math.random() - 0.5) * 2,
          CFG.FX_STAR_LIFE * (0.7 + Math.random() * 0.6),
          ((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255);
      }
    }
    // Le TURBO crache une gerbe blanche vers l'arrière, une seule fois.
    if (sled.boost > 0 && sled.boostFlash < 90) {
      for (let i = 0; i < 26; i++) {
        emit(stars, p.x + back.x, p.y + 0.4, p.z + back.z,
          (Math.random() - 0.5) * 7, 2 + Math.random() * 5, (Math.random() - 0.5) * 7,
          0.8, 1, 0.95, 1);
      }
    }
    // La POUDRE : en permanence, proportionnelle à la vitesse.
    const dn = Math.round(CFG.FX_DUST_RATE * Math.min(1, sled.v / 34) * dt);
    for (let i = 0; i < dn; i++) {
      emit(dust,
        p.x + back.x + (Math.random() - 0.5) * 1.6, p.y + 0.15 + Math.random() * 0.5,
        p.z + back.z + (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.5) * 1.4, 0.8 + Math.random() * 1.2, (Math.random() - 0.5) * 1.4,
        CFG.FX_DUST_LIFE, 1, 0.93, 0.99);
    }

    /* ⚠️ LES TRAITS DE VITESSE (412). Ils ne sortent pas de la luge : ils
       naissent AUTOUR DE LA CAMÉRA, sur les côtés, et filent vers l'arrière.
       C'est leur position dans le CADRE qui compte, pas leur position dans le
       monde — l'œil estime une vitesse en lisant ce qui défile dans les coins,
       jamais en regardant le centre. Émis depuis la luge, ils seraient au
       milieu de l'écran, cachés par la luge elle-même, et ne serviraient à
       rien.

       ⚠️ ET ILS N'EXISTENT QU'AU-DELÀ D'UN SEUIL. Une traînée permanente est
       un décor ; une traînée qui APPARAÎT à 34 u/s est une information. */
    if (sled.v > CFG.SPEED_LINE_FROM && camera) {
      const k = Math.min(1, (sled.v - CFG.SPEED_LINE_FROM) / (CFG.SLED_SPEED_MAX - CFG.SPEED_LINE_FROM));
      const n = Math.round(CFG.FX_LINE_RATE * k * dt);
      const c = camera.position;
      for (let i = 0; i < n; i++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const spread = 4.5 + Math.random() * 7;
        emit(lines,
          c.x + f.right.x * side * spread + (p.x - c.x) * 0.55,
          c.y - 1.2 + Math.random() * 4.5,
          c.z + f.right.z * side * spread + (p.z - c.z) * 0.55,
          -f.fwd.x * (30 + 26 * k), -f.fwd.y * 8, -f.fwd.z * (30 + 26 * k),
          CFG.FX_LINE_LIFE, 1, 0.94, 1);
      }
    }

    stepParticles(stars, dt, 9);
    stepParticles(dust, dt, -0.6);   // la poudre MONTE : c'est ce qui la rend féérique
    stepParticles(lines, dt, 0);
  }

  /* Le décor lointain suit la caméra (règle 3) et la neige tombe. */
  function updateAmbient(now, sled) {
    const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0;
    lastNow = now;
    const c = camera.position;
    skyDome.position.set(c.x, c.y, c.z);
    mountainsNear.position.set(c.x, 0, c.z);
    mountainsFar.position.set(c.x, 0, c.z);
    // Les montagnes suivent en x/z mais PAS en y : elles restent au niveau de
    // la vallée, donc on les surplombe de plus en plus en descendant. C'est
    // exactement ce qu'on veut voir dans une descente — le paysage monte
    // autour de soi.
    mountainsNear.position.y = Math.max(-260, c.y * 0.55 - 60);
    mountainsFar.position.y = Math.max(-380, c.y * 0.35 - 90);

    if (snowFall) {
      snowFall.position.set(c.x, 0, c.z);
      const pos = snowFall.geometry.attributes.position.array;
      const drop = CFG.FX_SNOW_FALL * dt;
      const baseY = c.y - 20;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] -= drop;
        pos[i] += Math.sin(now / 900 + i) * dt * 0.5;
        if (pos[i + 1] < baseY) pos[i + 1] = baseY + 70;
      }
      snowFall.geometry.attributes.position.needsUpdate = true;
    }
  }

  function clearAll() {
    for (const kind in pool) pool[kind].length = 0;
    if (stars) for (const p of stars.live) p.t = -1;
    if (dust) for (const p of dust.live) p.t = -1;
    if (lines) for (const p of lines.live) p.t = -1;
  }

  function render() { renderer.render(scene, camera); }

  return {
    init, resize, render, buildNode, dropNode, clearAll,
    updateSled, updateCritters, updateFx, updateAmbient, applySkin,
    get camera() { return camera; },
    get scene() { return scene; },
    get sledRig() { return sledRig; },
    get materials() { return mat; },
    get geometries() { return geo; },
  };
})();
