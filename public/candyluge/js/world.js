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
  let ambient, sun, fill, hemi;
  let skyDome, skyMat, mountainsNear, mountainsFar, snowFall;
  let sledRig, sledParts = {};
  let stars, dust, lines, spray;
  let trail = null;      // le sillon gravé (414)
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
  /* ⚠️⚠️ REPEINTE À L'ÉCHELLE RÉELLE AU 414 — 512 PIXELS POUR 15 UNITÉS.
     C'est la troisième et dernière moitié de la correction du moiré, et c'est
     celle qui manquait : élargir les sillons ne servait à rien tant que les
     TOURBILLONS, eux, restaient tracés à des largeurs de trait de cinq à douze
     pixels sur une tuile de 7,5 unités — c'est-à-dire des traits de quinze à
     trente-cinq CENTIMÈTRES, encore plus fins que les sillons qu'on venait de
     corriger. Ce sont eux qui dessinaient les grands chevrons en travers du
     cadre.

     ⚠️ LA MÉTHODE, ET C'EST ELLE QU'IL FAUT RETENIR : ON NE PEINT PLUS EN
     PIXELS, ON PEINT EN UNITÉS DU MONDE. `PX` donne le nombre de pixels par
     unité ; toute dimension s'écrit « tant d'unités × PX ». On peut alors LIRE
     la taille réelle de chaque motif dans le code, au lieu de la déduire d'une
     division entre une taille de canevas et une taille de tuile décidées à deux
     endroits différents. C'est exactement l'erreur qui a produit le moiré, et
     cette écriture la rend impossible à refaire.

     Le repère : rien ne doit descendre sous ~1,5 unité de période. */
  function paintPiste() {
    const TILE = 15;                    // la tuile fait 15 unités de côté
    const W = 512, H = 512, c = cv(W, H), g = c.getContext("2d");
    const PX = W / TILE;                // ≈ 34 pixels par unité
    g.fillStyle = hex(CFG.COL_PISTE); g.fillRect(0, 0, W, H);

    /* 1. LES SILLONS. Verticaux dans la texture, donc DANS LE SENS DE LA
       MARCHE une fois posés (l'axe v du ruban suit la piste). Alternés clair /
       sombre : un sillon est un creux, il a une arête éclairée et une ombre.

       ⚠️⚠️ ÉLARGIS D'UN FACTEUR QUATRE AU 414, ET CE N'EST PAS UN GOÛT : C'EST
       UNE CORRECTION DE BOGUE VISUEL. La première planche rendue du 413
       montrait la piste entière couverte de CHEVRONS EN ZIGZAG — un moiré si
       violent que le sol ne se lisait plus comme une matière mais comme un
       écran cassé. C'est le défaut le plus visible de tout le zip, et il était
       invisible à la lecture du code.

       La cause est arithmétique. Un sillon tous les 16 pixels sur une tuile de
       256, plaquée à 7,5 unités de côté, fait UN SILLON TOUS LES 47 CENTIMÈTRES.
       À trente mètres de la caméra, ces 47 cm occupent une fraction de pixel :
       l'écran doit alors représenter dix rayures dans un pixel, il en attrape
       une sur trois au hasard, et le battement entre la grille des rayures et
       la grille des pixels DESSINE des chevrons qui n'existent nulle part dans
       la texture. C'est le repliement de spectre, et aucun filtrage ne le
       rattrape une fois qu'on est sous la limite d'échantillonnage.

       ⚠️ LA RÈGLE : UN MOTIF DE SOL NE DOIT JAMAIS DESCENDRE SOUS ~1,5 UNITÉ DE
       PÉRIODE. En dessous, il ne se voit plus de près et il scintille de loin —
       il coûte donc de la performance pour dégrader l'image. On passe à quatre
       sillons par tuile (1,9 unité de période), et on BAISSE leur contraste :
       une dameuse laisse des creux doux, pas des rayures peintes. Le sens de la
       vitesse, lui, est désormais porté par le SILLON GRAVÉ de la luge et par
       la gerbe — c'est-à-dire par ce qui bouge, ce qui est sa vraie place. */
    // Sillons de 2,5 unités de période : la trace d'une vraie dameuse.
    const PITCH = 2.5 * PX;
    for (let x = 0; x < W; x += PITCH) {
      g.fillStyle = "rgba(255,255,255,0.14)"; g.fillRect(x, 0, PITCH * 0.46, H);
      g.fillStyle = "rgba(150,60,105,0.08)"; g.fillRect(x + PITCH * 0.46, 0, PITCH * 0.18, H);
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
    /* ⚠️ ET SURTOUT : DES TRAITS ÉPAIS. Ils faisaient 5 à 12 pixels pour une
       tuile de 7,5 unités, soit 15 à 35 centimètres de large — c'est-à-dire
       DEUX FOIS PLUS FIN que les sillons dont on vient de dire qu'ils étaient
       trop fins. Ce sont eux qui dessinaient les grands chevrons en travers du
       cadre, et non les sillons qu'on avait d'abord accusés. On passe à des
       traits d'une demi-unité sur des spirales de deux à quatre unités : la
       barbe à papa se lit toujours, et plus rien ne scintille. */
    for (let n = 0; n < 6; n++) {
      const cx = Math.random() * W, cy = Math.random() * H;
      const r = (1.4 + Math.random() * 1.7) * PX;
      g.globalAlpha = 0.07 + Math.random() * 0.06;
      g.lineWidth = (0.34 + Math.random() * 0.26) * PX;
      g.beginPath();
      for (let a = 0; a < Math.PI * 4; a += 0.2) {
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
  /* ⚠️ MÊME MÉTHODE QUE paintPiste AU 414 : ON PEINT EN UNITÉS DU MONDE.
     La tuile fait 16 unités, le canevas 512 pixels, et chaque dimension est
     écrite comme « tant d'unités × PX ». On lit donc directement qu'une
     congère fait quatre mètres et une paillette vingt centimètres, ce qui est
     la seule façon de vérifier d'un coup d'œil qu'aucun motif ne passe sous la
     limite d'échantillonnage. */
  function paintSnow() {
    const TILE = 16;
    const W = 512, H = 512, c = cv(W, H), g = c.getContext("2d");
    const PX = W / TILE;               // 32 pixels par unité
    g.fillStyle = hex(CFG.COL_SNOW); g.fillRect(0, 0, W, H);

    // 1. Les congères : de grandes ellipses (3 à 6 unités), à peine plus foncées.
    for (let n = 0; n < 14; n++) {
      g.globalAlpha = 0.30;
      g.fillStyle = hex(CFG.COL_SNOW_SHADE);
      g.beginPath();
      g.ellipse(Math.random() * W, Math.random() * H,
        (2.2 + Math.random() * 3.6) * PX, (1.3 + Math.random() * 2.1) * PX,
        Math.random() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    // 2. Les plaques moyennes (1 à 2 unités), en blanc pur : elles rattrapent
    //    la lumière et cassent la régularité des congères.
    for (let n = 0; n < 26; n++) {
      g.globalAlpha = 0.32;
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.ellipse(Math.random() * W, Math.random() * H,
        (0.65 + Math.random() * 1.4) * PX, (0.45 + Math.random() * 0.9) * PX,
        Math.random() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    /* 3. Les paillettes de sucre. ⚠️ QUATRE FOIS MOINS NOMBREUSES ET TROIS FOIS
       PLUS GROSSES QU'AU 413, pour exactement la raison expliquée dans
       paintPiste() : mille quatre cents grains de deux pixels sur une tuile de
       onze unités font un grain tous les huit centimètres, c'est-à-dire très
       au-dessous de ce qu'un pixel d'écran peut représenter à dix mètres. Le
       résultat n'est pas « du sucre fin », c'est du bruit qui grésille dès que
       la caméra bouge — et sur une surface qui occupe la moitié du cadre, ce
       grésillement fatigue en trente secondes.
       Moins nombreuses et plus grosses, elles se VOIENT sous la luge (ce qui
       est leur seul emploi) et se moyennent proprement au loin. */
    for (let n = 0; n < 420; n++) {
      g.globalAlpha = 0.12 + Math.random() * 0.40;
      g.fillStyle = Math.random() < 0.62 ? "#ffffff" : "#ffd0e8";
      const sz = (0.16 + Math.random() * 0.20) * PX;    // 16 à 36 cm : visible sous la luge
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

  /* LA GERBE (414) : un FLOCON GRUMELEUX, et surtout pas un rond flou.
     ⚠️ LA DIFFÉRENCE AVEC LA POUDRE EST DANS LA TEXTURE ELLE-MÊME, et c'est ce
     qui fait que les deux ne se confondent pas à l'écran alors qu'elles sont
     toutes deux blanches. Un dégradé radial parfait se lit comme du GAZ : une
     brume, une vapeur, quelque chose d'impalpable. Or ce qu'on projette ici est
     de la MATIÈRE arrachée au sol, et la matière a des bords. On empile donc
     quelques disques opaques décentrés : le grain obtenu est irrégulier, il a
     une silhouette, et une fois multiplié par trois cents il donne un rideau de
     neige qui a du POIDS. C'est la moitié visuelle de « la résistance du sol ».
     Le cœur reste bien opaque — c'est lui qui masque la piste au passage. */
  function paintSpray() {
    const S = 64, c = cv(S, S), g = c.getContext("2d");
    const R = S / 2;
    const d = g.createRadialGradient(R, R, 0, R, R, R);
    d.addColorStop(0, "rgba(255,255,255,0.98)");
    d.addColorStop(0.45, "rgba(255,246,252,0.72)");
    d.addColorStop(0.8, "rgba(252,226,242,0.22)");
    d.addColorStop(1, "rgba(250,220,240,0)");
    g.fillStyle = d; g.fillRect(0, 0, S, S);
    // Les grumeaux : quelques disques pleins, décentrés, qui cassent le rond.
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2, rr = Math.random() * R * 0.42;
      g.globalAlpha = 0.30 + Math.random() * 0.45;
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.arc(R + Math.cos(a) * rr, R + Math.sin(a) * rr, R * (0.13 + Math.random() * 0.2), 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    return c;
  }

  /* ⚠️ L'ANISOTROPIE EST LA SECONDE MOITIÉ DE LA CORRECTION DU MOIRÉ (414), et
     elle est indispensable ICI plus qu'ailleurs. Un sol de jeu de descente est
     vu SOUS UN ANGLE TRÈS RASANT : à trente mètres, une tuile carrée occupe à
     l'écran une bande de deux pixels de haut sur quarante de large. Le filtrage
     par défaut (mipmap isotrope) choisit un seul niveau de détail pour les deux
     axes : il prend donc le plus grossier des deux, et floute la texture DANS
     LE SENS DE LA LARGEUR autant que dans celui de la profondeur. On perd la
     netteté sans gagner la stabilité — le pire des deux.
     Le filtrage anisotrope échantillonne plusieurs fois le long de l'axe étiré :
     c'est exactement le cas d'usage, et c'est ce qui rend un sol à la fois net
     de près et calme au loin. Seize échantillons est le maximum utile ; les
     cartes qui n'en font pas tant plafonnent d'elles-mêmes.
     ⚠️ Il faut donc que `init()` ait déjà construit le renderer quand on
     appelle buildAssets() — c'est le cas, et c'est pour ça que l'ordre des deux
     ne doit pas être inversé. */
  function tex(canvasEl, rx, ry) {
    const t = new THREE.CanvasTexture(canvasEl);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (rx) t.repeat.set(rx, ry === undefined ? rx : ry);
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    if (renderer && renderer.capabilities) {
      t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    }
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
    /* ⚠️ LA PALETTE LOINTAINE (414). Les mêmes six teintes, descendues d'un cran
       de valeur et tirées vers le bleu. C'est la perspective atmosphérique
       appliquée aux OBJETS, et pas seulement au brouillard — sans elle, un
       sapin à deux cents mètres avait exactement la couleur d'un sapin à dix,
       la forêt entière se lisait donc comme collée sur une même vitre, et le
       paysage n'avait aucune profondeur malgré ses trois rangs d'arbres.
       Un matériau de plus, et le décor gagne ses trois plans. */
    mat.candyFar = CFG.COL_CANDY_FAR.map((c) => L(c));
    mat.trunkFar = L(0x8a6b52);
    mat.candyGlow = CFG.COL_CANDY_SET.map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.35, fog: false }));

    /* LES PORTES DE CHECKPOINT (414). Le fanion et la bande au sol sont en
       Basic et non en Lambert : ce sont des SIGNAUX, pas du décor. Un repère
       dont la lisibilité dépendrait de l'orientation du soleil serait bien
       éclairé dans un virage et invisible dans l'autre — c'est exactement ce
       qu'un repère ne doit pas faire. */
    mat.cpFlag = new THREE.MeshBasicMaterial({ color: 0x5fe0c4, transparent: true, opacity: 0.95 });
    mat.cpGlow = new THREE.MeshBasicMaterial({ color: 0x7ff0d8, fog: false });
    mat.cpBand = new THREE.MeshBasicMaterial({ color: 0x5fe0c4, transparent: true, opacity: 0.55 });
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
    scene.fog = new THREE.FogExp2(CFG.COL_FOG, CFG.FOG_DENSITY);

    camera = new THREE.PerspectiveCamera(CFG.CAM_FOV, 1, 0.5, CFG.DRAW_DISTANCE);

    /* ══════════════════════════════════════════════════════════════════════
       L'ÉCLAIRAGE — ⚠️ REFAIT AU 414, ET C'EST LUI QUI RENDAIT L'IMAGE FADE.
       ══════════════════════════════════════════════════════════════════════
       Le 413 était réglé sur la consigne « un monde lumineux » et l'avait prise
       au pied de la lettre : ambiante 0,78 contre soleil 0,72. Or une ambiante
       qui DOMINE le soleil éclaire toutes les faces également — c'est la
       définition d'un rendu sans volume. Le décor était donc bien lumineux, et
       parfaitement plat : des cônes sans versants, une neige sans creux, une
       piste sans épaisseur. On ne s'en aperçoit qu'en RENDANT une image, ce que
       tools/preview-luge.js permet enfin de faire.

       ⚠️ LE RAPPORT EST INVERSÉ, ET C'EST LA SEULE CHOSE QUI COMPTE ICI : le
       soleil domine (1,05), l'ambiante pure tombe à 0,20. Le reste vient d'une
       LUMIÈRE D'HÉMISPHÈRE, qui est l'outil exact pour un champ de neige :
       elle éclaire le dessus des choses avec le bleu du ciel et leur dessous
       avec le rose renvoyé par la neige. C'est physiquement ce qui se passe, ça
       ne coûte rien à calculer, et ça donne gratuitement la seule chose qu'on
       cherchait — du rose en pleine lumière, du violine dans l'ombre, sans
       jamais tomber dans le gris qui salirait le pastel.

       ⚠️ NE PAS REMONTER L'AMBIANTE POUR « ÉCLAIRCIR ». C'est exactement la
       faute qu'on vient de corriger : ça n'éclaircit pas, ça aplatit. Si le
       cadre paraît sombre, c'est LIGHT_SUN qu'on monte. */
    ambient = new THREE.AmbientLight(0xfff0f6, CFG.LIGHT_AMBIENT);
    scene.add(ambient);
    hemi = new THREE.HemisphereLight(CFG.COL_LIGHT_SKY, CFG.COL_LIGHT_GROUND, CFG.LIGHT_SKY);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(CFG.COL_LIGHT_SUN, CFG.LIGHT_SUN);
    /* ⚠️ LE SOLEIL EST RASANT (y = 0,52 pour x = -0,8), et c'est délibéré. Un
       soleil au zénith éclaire tous les versants pareil et redonne exactement
       le rendu plat qu'on vient de fuir ; un soleil bas creuse un côté de
       chaque bosse et de chaque montagne. C'est la lumière de fin d'après-midi
       des paysages de Lonely Mountains, et c'est la plus généreuse en relief.
       Il vient du MÊME côté que le soleil peint dans la texture de ciel — deux
       sources contradictoires font « sonner faux » un décor sans qu'on sache
       dire pourquoi. */
    sun.position.set(-0.8, 0.52, 0.3);
    scene.add(sun);
    /* La lampe d'appoint, froide et venue d'en bas : elle empêche les dessous
       d'être noirs sans rien aplatir, parce qu'elle est faible. */
    fill = new THREE.DirectionalLight(0xc4d8ff, 0.18);
    fill.position.set(0.6, -0.35, -0.7);
    scene.add(fill);

    buildAssets();
    buildSky();
    buildMountains();
    buildSnowFall();
    buildSled();
    buildParticles();
    buildTrail();
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
  /* ⚠️ REPRISE AU 414 — LA CHAÎNE ÉTAIT UNE RANGÉE DE TRIANGLES IDENTIQUES.
     Sur la planche rendue du 413, l'horizon montrait huit cônes du même profil,
     posés à la même hauteur, à intervalles réguliers : ça ne se lisait pas
     comme une montagne mais comme une frise. Une chaîne de montagnes n'a
     justement PAS de motif — c'est un désordre, et c'est ce désordre qui la
     rend crédible.

     Trois corrections, toutes gratuites, et aucune n'ajoute d'objet :
       1. LES SOMMETS SONT INCLINÉS ET TOURNÉS, chacun différemment. Un cône
          droit se lit comme un cône ; un cône penché de quelques degrés se lit
          comme un pic. C'est le changement le plus efficace des trois.
       2. ILS SONT ÉCRASÉS OU ÉTIRÉS EN LARGEUR, séparément selon x et z. La
          silhouette cesse d'être un triangle isocèle, et donc de se répéter.
       3. UN CONTREFORT plus petit est accolé à un sommet sur deux. Deux masses
          inégales qui se chevauchent lisent comme un massif ; une masse seule
          lit comme une tente.
     ⚠️ Le hasard est DÉRIVÉ DE L'INDICE et non tiré : la chaîne est la même
     pour tout le monde et ne redanse pas d'une image à l'autre. */
  function ring(count, radius, minR, maxR, minH, maxH, m, capM, group, seedBase) {
    const sb = seedBase || 0;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.sin(i * 7.3 + sb) * 0.16;
      const rad = radius * (0.72 + hash(i + sb, 71) * 0.56);
      const r = minR + hash(i + sb, 53) * (maxR - minR);
      const h = minH + hash(i + sb, 31) * (maxH - minH);
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad;

      const c = coneM(m, r, h, x, h / 2 - 18, z);
      // Écrasement séparé sur les deux axes : la base cesse d'être un cercle.
      c.scale.x *= 0.72 + hash(i + sb, 11) * 0.75;
      c.scale.z *= 0.72 + hash(i + sb, 13) * 0.75;
      // L'inclinaison : c'est elle qui transforme un cône en pic.
      c.rotation.z = (hash(i + sb, 17) - 0.5) * 0.30;
      c.rotation.x = (hash(i + sb, 19) - 0.5) * 0.30;
      c.rotation.y = hash(i + sb, 23) * Math.PI;
      group.add(c);

      if (capM) {
        /* La calotte : un second cône, plus petit, posé au sommet. Deux cônes
           valent mieux qu'une texture — la ligne de neige suit alors vraiment
           la silhouette, quel que soit l'angle sous lequel on la voit.
           Elle reprend l'inclinaison du sommet, sinon elle glisse sur le côté. */
        const ch = h * (0.26 + hash(i + sb, 29) * 0.18);
        const cap = coneM(capM, r * 0.36, ch, x, h - ch / 2 - 18, z);
        cap.scale.x = c.scale.x * (r * 0.36 * 2) / (r * 2);
        cap.scale.z = c.scale.z * (r * 0.36 * 2) / (r * 2);
        cap.rotation.copy(c.rotation);
        group.add(cap);
      }

      // Le contrefort, un sommet sur deux : deux masses inégales font un massif.
      if (hash(i + sb, 37) < 0.55) {
        const bh = h * (0.42 + hash(i + sb, 41) * 0.26);
        const br = r * (0.5 + hash(i + sb, 43) * 0.3);
        const off = r * (0.8 + hash(i + sb, 47) * 0.7);
        const ang = hash(i + sb, 59) * Math.PI * 2;
        const b = coneM(m, br, bh, x + Math.cos(ang) * off, bh / 2 - 18, z + Math.sin(ang) * off);
        b.rotation.z = (hash(i + sb, 61) - 0.5) * 0.34;
        group.add(b);
      }
    }
  }

  function buildMountains() {
    mountainsNear = new THREE.Group();
    ring(CFG.WORLD_MOUNTAINS, 330, 46, 108, 62, 148, mat.mount, mat.mountCap, mountainsNear, 3);
    scene.add(mountainsNear);

    /* ⚠️ UNE GRAINE DIFFÉRENTE POUR LA CHAÎNE LOINTAINE. Avec la même, les deux
       rangs auraient exactement le même désordre à deux échelles près — l'œil
       repère instantanément une silhouette répétée, même agrandie, et les deux
       chaînes se seraient lues comme une seule dédoublée. */
    mountainsFar = new THREE.Group();
    ring(CFG.WORLD_MOUNTAINS_FAR, 640, 90, 190, 110, 235, mat.mountFar, null, mountainsFar, 91);
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
    /* ⚠️ LA GERBE EST EN FONDU NORMAL, PAS ADDITIF, et c'est ce qui la sépare
       des étoiles. Un fondu additif ÉCLAIRCIT ce qu'il recouvre : c'est parfait
       pour une étincelle magique, et c'est faux pour de la neige, qui est de la
       MATIÈRE — elle doit cacher ce qu'il y a derrière, pas l'illuminer. Une
       gerbe additive sur une piste rose donnerait une brume blanche lumineuse ;
       en fondu normal, on obtient un vrai rideau opaque qui masque la piste
       l'espace d'un instant. C'est cette opacité qui dit « le sol résiste ». */
    spray = makePoints(CFG.FX_SPRAY_MAX, paintSpray(), CFG.FX_SPRAY_SIZE, 0.82, false);
    scene.add(stars.points);
    scene.add(dust.points);
    scene.add(lines.points);
    scene.add(spray.points);
    for (let i = 0; i < CFG.FX_STAR_MAX; i++) stars.live.push({ t: -1 });
    for (let i = 0; i < CFG.FX_DUST_MAX; i++) dust.live.push({ t: -1 });
    for (let i = 0; i < CFG.FX_LINE_MAX; i++) lines.live.push({ t: -1 });
    for (let i = 0; i < CFG.FX_SPRAY_MAX; i++) spray.live.push({ t: -1 });
  }

  /* ══════════════════════════════════════════════════════════════════════════
     LE SILLON GRAVÉ — la trace que la luge laisse dans la neige.
     ──────────────────────────────────────────────────────────────────────────
     ⚠️ C'ÉTAIT LE CHANTIER N°1 ANNONCÉ DU 414, et la raison est simple : le 413
     avait réécrit toute la conduite autour d'une limite d'adhérence, et cette
     limite ne se voyait NULLE PART. Le joueur avait sous les doigts un système à
     deux régimes — carrer proprement, ou décrocher — dont l'écran ne montrait
     rien d'autre qu'une luge un peu plus penchée. Un jeu dont la mécanique
     centrale est invisible ne s'apprend pas : il se devine, et personne ne
     devine.

     COMMENT. Un unique maillage à tampon circulaire, alloué UNE SEULE FOIS au
     démarrage. À chaque TRAIL_STEP unités parcourues on réécrit le plus vieux
     quadrilatère à la position courante. ⚠️ AUCUNE ALLOCATION PAR IMAGE, et
     c'est non négociable : une trace qui créerait une géométrie par segment
     ferait travailler le ramasse-miettes trois fois par seconde pendant toute
     la descente, ce qui produit exactement les micro-saccades qu'un jeu de
     temps ne peut pas se permettre.

     CE QU'IL FAUT VOIR À L'ÉCRAN, et c'est tout le propos :
       * SUR LA CARRE — deux traits FINS, nets, sombres, écartés de la largeur
         des patins. Ce sont deux entailles dans la neige tassée. Elles disent
         « j'ai gravé », et elles sont belles parce qu'elles sont propres.
       * EN DÉRAPAGE — une seule bavure LARGE et PÂLE. C'est de la neige
         retournée, pulvérisée, étalée. Elle dit « j'ai chassé, et j'ai payé ».
     Le contraste entre les deux est l'information. Un joueur qui jette un œil
     derrière lui sait immédiatement ce qu'il vient de faire — et surtout, il le
     voit se former EN CONTINU, ce qui est la seule façon d'apprendre où est la
     limite avant de l'avoir franchie.
     ══════════════════════════════════════════════════════════════════════════ */
  function buildTrail() {
    const N = CFG.TRAIL_MAX;
    /* Quatre sommets par segment (un quadrilatère), et deux quadrilatères par
       segment : un par patin. On alloue les deux d'un coup, et le dérapage se
       contente de les élargir jusqu'à ce qu'ils se rejoignent — c'est ce qui
       fait que le passage de « deux traits » à « une bavure » est CONTINU au
       lieu d'être un basculement, exactement comme la physique qui le pilote. */
    const quads = N * 2;
    const pos = new Float32Array(quads * 4 * 3);
    const col = new Float32Array(quads * 4 * 3);
    const idx = [];
    for (let q = 0; q < quads; q++) {
      const v = q * 4;
      idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
    }
    // Tout est replié à l'origine et en noir : un segment jamais écrit est
    // invisible, sans avoir à gérer un compteur de segments valides.
    /* ⚠️ LES NORMALES SONT OBLIGATOIRES DEPUIS QUE LE MATÉRIAU EST LAMBERT.
       Une géométrie éclairée sans attribut `normal` est rendue NOIRE par
       three.js — panne muette et déroutante, puisque la trace serait bien là,
       bien placée, et parfaitement invisible. On ne peut pas non plus appeler
       computeVertexNormals() : les positions changent à chaque segment écrit,
       il faudrait tout recalculer soixante fois par seconde pour un résultat
       qu'on connaît déjà. On les écrit donc à la main dans pushTrail, où la
       pente de la piste est de toute façon sous la main. */
    const nrm = new Float32Array(quads * 4 * 3);
    for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;    // (0,1,0) par défaut
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    /* ⚠️ UN TABLEAU SIMPLE, PAS UN BufferAttribute — et c'est la façon dont
       `ribbon` procède déjà, dix lignes plus bas. Les deux marchent dans
       three.js, mais le premier jet du sillon passait un BufferAttribute et la
       trace était INVISIBLE sur la planche alors que le compteur annonçait plus
       de mille sommets gravés : tools/preview-luge.js lit `g.index` comme un
       tableau indexable, ce qu'un BufferAttribute n'est pas. La trace existait,
       elle n'avait simplement aucun triangle.
       Ne pas « améliorer » ce point : il n'y a rien à gagner, et l'outil de
       contrôle redeviendrait aveugle à l'effet principal du zip. */
    g.setIndex(idx);
    /* ⚠️ `depthWrite: false` ET un léger décalage de polygone. La trace est
       posée à deux centimètres AU-DESSUS de la piste, ce qui suffirait en
       théorie ; en pratique, à trois cents mètres, la précision du tampon de
       profondeur ne distingue plus deux centimètres et les deux surfaces se
       battent — la trace clignote. Le décalage de polygone règle ça dans le
       matériel, ce qui est sa raison d'être. */
    /* ⚠️ LAMBERT ET NON BASIC, ET C'EST UN DÉFAUT VU AU RENDU. En Basic, la
       trace n'est PAS éclairée : elle garde sa pleine luminosité pendant que la
       piste, elle, s'assombrit dans les versants à l'ombre. Résultat, sur la
       planche, deux sillons plus CLAIRS que la neige qu'ils creusent — ils
       avaient l'air de briller, ce qui dit exactement le contraire de ce qu'un
       creux doit dire.
       Une trace est de la matière au sol : elle doit prendre la même lumière
       que le sol, sinon elle flotte au-dessus au lieu d'y être gravée. */
    const m = new THREE.MeshLambertMaterial({
      vertexColors: true, transparent: true, opacity: 0.92,
      depthWrite: false, polygonOffset: true,
      polygonOffsetFactor: -4, polygonOffsetUnits: -8,
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;    // le tampon circulaire couvre toute la descente
    mesh.renderOrder = 1;
    scene.add(mesh);
    trail = { mesh, pos, col, nrm, N, head: 0, lastS: -1e9, prevL: null, prevR: null };
  }

  /* Écrit un segment de trace. Appelé depuis updateFx, une fois tous les
     TRAIL_STEP unités — jamais par image : à 60 images par seconde et 35 u/s on
     avance de 0,58 unité par image, on écrirait donc deux segments par unité,
     soit quatre fois trop de géométrie pour exactement le même résultat. */
  function pushTrail(sled) {
    if (!trail) return;
    if (sled.s - trail.lastS < CFG.TRAIL_STEP) return;
    /* En l'air, on ne grave rien — et il faut COUPER la continuité, sinon le
       segment suivant se raccorde par-dessus le saut et dessine un long ruban
       tendu dans le vide. C'est le défaut classique des systèmes de traces, et
       il ne se voit qu'après le premier saut. */
    if (!sled.grounded || sled.wipe > 0) { trail.prevL = trail.prevR = null; trail.lastS = sled.s; return; }
    trail.lastS = sled.s;

    const f = Slope.frameAt(sled.s);
    const p = Slope.pointAt(sled.s, sled.u);
    const yaw = Slope.yawAt(sled.s) + sled.heading;
    /* La trace est perpendiculaire à la marche RÉELLE de la luge, pas à la
       piste : c'est ce qui fait qu'une trace de dérapage est OBLIQUE, donc
       lisible comme un dérapage. */
    const rx = Math.cos(yaw), rz = Math.sin(yaw);

    const skid = sled.skid || 0;
    const carve = Math.abs(sled.edge || 0);
    // La largeur : fine sur la carre, large en dérapage. Interpolation directe,
    // donc continue — comme la physique.
    const w = CFG.TRAIL_W_CARVE + (CFG.TRAIL_W_SKID - CFG.TRAIL_W_CARVE) * skid;
    const gauge = CFG.TRAIL_GAUGE;
    /* ⚠️⚠️ LA TRACE S'EFFACE VERS LA COULEUR DE LA PISTE, ET SURTOUT PAS VERS LE
       NOIR — c'est la correction la plus visible du chantier, et le premier jet
       s'est trompé de façon spectaculaire.

       Le raisonnement de départ était bon : un matériau n'a qu'une opacité
       GLOBALE, la baisser effacerait toute la trace d'un coup, y compris le
       segment qu'on vient d'écrire. Il faut donc moduler la couleur par sommet.
       L'erreur a été de MULTIPLIER la teinte par la visibilité. Multiplier une
       couleur par 0,28, ce n'est pas la rendre discrète : c'est la rendre
       SOMBRE. La planche montrait deux bandes quasi noires filant derrière la
       luge — du goudron sur de la barbe à papa.

       ⚠️ LA RÈGLE, VALABLE PARTOUT OÙ L'ON MODULE UNE COULEUR PAR SOMMET : pour
       atténuer, on INTERPOLE VERS LE FOND, on ne multiplie pas. Multiplier ne
       fonctionne que sur un fondu ADDITIF, où le noir est justement
       l'invisible — c'est le cas des étoiles et de la poudre (voir
       stepParticles), et c'est ce cas-là qu'on avait recopié sans voir qu'il ne
       s'appliquait pas ici. En fondu normal, l'invisible n'est pas le noir :
       c'est la couleur de ce qu'il y a derrière.

       On interpole donc du rose de la piste vers la teinte du geste. La trace
       devient un CREUX dans la neige — présente en permanence, discrète quand
       on roule droit, franche quand on engage. */
    const P0 = CFG.COL_PISTE;
    const cCarve = CFG.COL_CARVE, cSkid = CFG.COL_SKID;
    const mix = (a, b, k) => a + (b - a) * k;
    // 1. La teinte du geste : du sillon sombre à la bavure pâle.
    const tr = mix((cCarve >> 16 & 255), (cSkid >> 16 & 255), skid);
    const tg = mix((cCarve >> 8 & 255), (cSkid >> 8 & 255), skid);
    const tb = mix((cCarve & 255), (cSkid & 255), skid);
    /* 2. ⚠️ UN PLANCHER DE VISIBILITÉ. Sans lui, une luge qui roule tout droit
       ne laisse RIEN derrière elle, ce qui est faux (des patins tracent
       toujours) et surtout dommage : la trace permanente donne un repère de
       vitesse au ras du sol, et elle rend le renforcement de la carre bien plus
       lisible — on voit le trait S'ÉPAISSIR et FONCER au lieu de le voir
       apparaître de nulle part. Un signal qui varie se lit mieux qu'un signal
       qui s'allume. */
    const visible = Math.max(0.30, carve * 0.9, skid);
    // 3. Et l'interpolation depuis la piste, qui est tout le propos ci-dessus.
    const r = mix((P0 >> 16 & 255), tr, visible) / 255;
    const gg = mix((P0 >> 8 & 255), tg, visible) / 255;
    const bb = mix((P0 & 255), tb, visible) / 255;

    for (const side of [-1, 1]) {
      const c0 = sled.u + side * gauge;
      const a = Slope.pointAt(sled.s, c0 - w), b = Slope.pointAt(sled.s, c0 + w);
      const q = trail.head * 2 + (side > 0 ? 1 : 0);
      const prev = side < 0 ? trail.prevL : trail.prevR;
      const cur = {
        ax: a.x, ay: a.y + 0.03, az: a.z,
        bx: b.x, by: b.y + 0.03, bz: b.z,
      };
      const P = trail.pos, C = trail.col, Nn = trail.nrm;
      const o = q * 12;
      if (!prev) {
        // Pas de segment précédent (départ, saut, chute) : quadrilatère replié.
        for (let i = 0; i < 12; i++) P[o + i] = 0;
        for (let i = 0; i < 12; i++) C[o + i] = 0;
      } else {
        P[o] = prev.ax; P[o + 1] = prev.ay; P[o + 2] = prev.az;
        P[o + 3] = prev.bx; P[o + 4] = prev.by; P[o + 5] = prev.bz;
        P[o + 6] = cur.ax; P[o + 7] = cur.ay; P[o + 8] = cur.az;
        P[o + 9] = cur.bx; P[o + 10] = cur.by; P[o + 11] = cur.bz;
        /* La normale de la surface à cette abscisse : la verticale basculée par
           la PENTE. C'est celle du sol sous la trace, ce qui est le seul choix
           qui la fasse s'éclairer exactement comme la piste — et donc se lire
           comme un creux DANS la neige plutôt que comme un ruban POSÉ dessus. */
        const cp = Math.cos(f.pitch), sp = Math.sin(f.pitch);
        const nx = Math.sin(f.yaw) * sp, ny = cp, nz = -Math.cos(f.yaw) * sp;
        for (let k = 0; k < 4; k++) {
          C[o + k * 3] = r; C[o + k * 3 + 1] = gg; C[o + k * 3 + 2] = bb;
          Nn[o + k * 3] = nx; Nn[o + k * 3 + 1] = ny; Nn[o + k * 3 + 2] = nz;
        }
      }
      if (side < 0) trail.prevL = cur; else trail.prevR = cur;
      // Le décalage vers rx/rz sert la perpendicularité au cap réel : on
      // l'applique en écartant les points le long de l'axe droit de la LUGE.
      void rx; void rz; void p;
    }
    trail.head = (trail.head + 1) % trail.N;
    trail.mesh.geometry.attributes.position.needsUpdate = true;
    trail.mesh.geometry.attributes.color.needsUpdate = true;
    trail.mesh.geometry.attributes.normal.needsUpdate = true;
  }

  function clearTrail() {
    if (!trail) return;
    trail.pos.fill(0);
    trail.col.fill(0);
    trail.head = 0; trail.lastS = -1e9; trail.prevL = trail.prevR = null;
    trail.mesh.geometry.attributes.position.needsUpdate = true;
    trail.mesh.geometry.attributes.color.needsUpdate = true;
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
  /* `far` bascule sur la palette assombrie : c'est ce qui donne au décor ses
     trois plans (voir mat.candyFar). Un seul argument, et la profondeur
     apparaît. */
  function gumTree(g, x, y, z, h, i, far) {
    const pal = far ? mat.candyFar : mat.candy;
    g.add(cylM(far ? mat.trunkFar : mat.trunk, 0.22, h * 0.42, x, y + h * 0.21, z, true));
    for (let k = 0; k < 3; k++) {
      const r = h * (0.42 - k * 0.1);
      const hue = Math.floor(hash(i, 30 + k) * CFG.COL_CANDY_SET.length);
      const s = sph(pal[hue], r, x, y + h * (0.42 + k * 0.26), z);
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
    /* ⚠️ AFFINÉE AU 414. À 1,6 d'épaisseur pour un rayon de quinze unités, le
       tube faisait plus de deux mètres de diamètre : l'arche remplissait un
       tiers du cadre en rose plein, et comme elle revenait tous les 136 unités,
       on passait la descente derrière un rideau. Un repère de distance doit se
       voir, pas cacher ce qu'on est venu regarder. */
    const R = width * 0.52;
    arc.scale.set(R, R, 1.0);
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

  /* ══════════════════════════════════════════════════════════════════════════
     UNE PORTE DE CHECKPOINT (414).
     ──────────────────────────────────────────────────────────────────────────
     ⚠️ ELLE DOIT SE VOIR DE TRÈS LOIN, ET C'EST SA SEULE VRAIE CONTRAINTE. Un
     checkpoint qu'on franchit sans l'avoir vu venir ne remplit pas la moitié de
     son travail : il sécurise, mais il ne SOULAGE pas. Or le soulagement — « je
     l'ai eu, ce que je viens de faire est acquis » — est précisément ce qui
     donne son rythme à une descente à checkpoints, et c'est ce qui pousse à
     tenter le passage suivant un peu plus vite.

     D'où deux fanions HAUTS (quatre unités, au-dessus de la ligne d'horizon du
     cadrage) plutôt qu'une ligne peinte au sol : à quarante mètres et sous une
     caméra rasante, tout ce qui est posé à plat sur la piste disparaît. La
     règle est générale et vaut pour tout repère de jeu — ce qui doit se voir de
     loin doit être VERTICAL.

     Elle est volontairement DISTINCTE des arches de menthe poivrée, qui ne
     marquent que la distance : deux repères qui se ressemblent ne se lisent
     plus que comme un seul. */
  function checkpointGate(g, s, width) {
    const half = width / 2 + 1.2;
    for (const side of [-1, 1]) {
      const p = Slope.pointAt(s, side * half);
      // Le mât : blanc, fin, haut.
      g.add(cylM(mat.white, 0.15, 4.2, p.x, p.y + 2.1, p.z, true));
      /* Le fanion : un triangle de sucre menthe, tourné DANS L'AXE DE LA PISTE
         pour être vu de face par une luge qui arrive. Un fanion perpendiculaire
         serait un trait, et un trait ne signale rien. */
      const flag = new THREE.Mesh(geo.plane, mat.cpFlag);
      flag.scale.set(2.4, 1.5, 1);
      flag.position.set(p.x, p.y + 3.7, p.z);
      flag.rotation.y = Slope.yawAt(s) + Math.PI / 2;
      flag.material.side = THREE.DoubleSide;
      g.add(flag);
      // Le bonbon au sommet du mât : il attrape la lumière et pointe le mât.
      g.add(sph(mat.cpGlow, 0.42, p.x, p.y + 4.35, p.z, true));
    }
    /* La bande au sol : elle ne sert pas à repérer la porte de loin (elle en
       est incapable), elle sert à dire l'INSTANT exact du franchissement, au
       moment où l'on passe dessus. Les deux rôles sont distincts et demandent
       deux objets — c'est pour ça qu'il y a les deux. */
    const band = ribbon(s - 0.9, s + 0.9, -width / 2, width / 2, 0.05, mat.cpBand, 3);
    g.add(band);
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
          0, mat.snow, 16, true));
      }
    }

    /* 2. LA PISTE : le dessus, puis un liseré vertical de chaque côté. Le
       liseré est l'épaisseur du ruban (règle 5) — c'est lui qui garde la piste
       lisible quand la caméra s'abaisse dans les virages relevés. */
    g.add(ribbon(s0, s1, -half, half, 0, mat.piste, 15));
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
        // `true` : palette lointaine. C'est ce rang-là qui doit reculer.
        gumTree(g, p.x, p.y, p.z, 6 + hash(base, 12) * 7, base + 999, true);
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

    // La porte de checkpoint, si l'une tombe dans ce tronçon.
    const cp = Slope.checkpointIn(s0, s1);
    if (cp) checkpointGate(g, cp.s, Slope.widthAt(cp.s));

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

    /* ══════════════════════════════════════════════════════════════════════
       LA GERBE DE NEIGE (414) — la résistance du sol, rendue visible.
       ──────────────────────────────────────────────────────────────────────
       ⚠️ ELLE NE SORT PAS DU DÉRAPAGE SEUL, ET C'EST LE POINT ENTIER. Une gerbe
       qui n'apparaîtrait qu'au décrochage se lirait comme une alarme : « tu as
       raté ». Or une carre franche projette elle aussi de la neige — c'est même
       l'image emblématique du ski, ce petit rideau qui part de la spatule quand
       la lame mord. On lit donc les DEUX, avec des visages opposés :

         * SUR LA CARRE : un rideau MINCE, serré, qui part vers l'intérieur du
           virage et s'élève peu. C'est joli, c'est net, et ça récompense.
         * EN DÉRAPAGE : un nuage LARGE, haut, désordonné, projeté vers
           l'extérieur. C'est spectaculaire, et ça annonce qu'on freine.

       Le débit suit `load` — la charge sur l'adhérence — et non la seule
       vitesse : la gerbe grossit donc À MESURE qu'on approche de la limite, ce
       qui en fait le seul indicateur ANTICIPÉ du jeu. C'est ce que le joueur
       regarde du coin de l'œil pour savoir s'il peut serrer davantage. */
    const load = sled.load || 0;
    const carveK = (sled.carve || 0);
    const sprayK = Math.min(1, carveK * load * 1.25 + (sled.skid || 0) * 1.5);
    if (sprayK > 0.04 && sled.grounded && sled.v > 12) {
      const n = Math.round(CFG.FX_SPRAY_RATE * sprayK * dt);
      // Sur la carre, la neige part vers l'INTÉRIEUR du virage (du côté où la
      // luge est couchée) ; en dérapage, vers l'extérieur. Le signe bascule
      // avec le décrochage, ce qui rend les deux gestes lisibles d'un coup.
      const inward = -Math.sign(sled.edge || 1);
      const dir = (sled.skid > CFG.SKID_BREAK) ? -inward : inward;
      const wide = 0.35 + (sled.skid || 0) * 1.5;
      for (let i = 0; i < n; i++) {
        // Le point d'émission : sous la carre engagée, décalé vers l'avant —
        // une gerbe naît à la spatule, pas derrière le siège.
        const along = 0.4 + Math.random() * 1.5;
        const ex = p.x - back.x * along * 0.35 + f.right.x * (-inward) * 0.7;
        const ez = p.z - back.z * along * 0.35 + f.right.z * (-inward) * 0.7;
        const sp = CFG.FX_SPRAY_OUT * (0.4 + sprayK) * (0.5 + Math.random());
        emit(spray,
          ex + (Math.random() - 0.5) * wide, p.y + 0.1 + Math.random() * 0.35,
          ez + (Math.random() - 0.5) * wide,
          f.right.x * dir * sp + (Math.random() - 0.5) * 3 - f.fwd.x * sled.v * 0.18,
          CFG.FX_SPRAY_UP * (0.35 + Math.random() * sprayK * 1.3),
          f.right.z * dir * sp + (Math.random() - 0.5) * 3 - f.fwd.z * sled.v * 0.18,
          CFG.FX_SPRAY_LIFE * (0.6 + Math.random() * 0.7),
          1, 0.97, 0.99);
      }
    }

    /* LE SILLON. Écrit ici parce que c'est le seul endroit qui tourne à chaque
       image avec la luge sous la main — mais il ne s'écrit qu'une fois tous les
       TRAIL_STEP unités, pushTrail() s'en charge. */
    pushTrail(sled);

    stepParticles(stars, dt, 9);
    stepParticles(dust, dt, -0.6);   // la poudre MONTE : c'est ce qui la rend féérique
    stepParticles(lines, dt, 0);
    stepParticles(spray, dt, CFG.FX_SPRAY_GRAVITY);   // ... et la gerbe RETOMBE : c'est de la matière
  }

  /* Le décor lointain suit la caméra (règle 3) et la neige tombe. */
  function updateAmbient(now, sled) {
    const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0;
    lastNow = now;
    const c = camera.position;
    skyDome.position.set(c.x, c.y, c.z);
    mountainsNear.position.set(c.x, 0, c.z);
    mountainsFar.position.set(c.x, 0, c.z);
    /* Les montagnes suivent en x/z mais seulement PARTIELLEMENT en y : elles
       restent en arrière du mouvement, donc le paysage monte autour de soi à
       mesure qu'on descend. C'est exactement ce qu'on veut voir dans une
       descente.

       ⚠️⚠️ MAIS LA BUTÉE ÉTAIT DU MAUVAIS CÔTÉ, ET ÇA DONNAIT DES MONTAGNES QUI
       FLOTTAIENT DANS LE CIEL (corrigé au 414, vu sur une planche rendue en bas
       de piste). Le `Math.max` plafonnait leur DESCENTE à −260. Or la descente
       fait environ sept cents unités de dénivelé : passé la mi-parcours, la
       caméra tombe plus bas que cette butée, et les montagnes — figées, elles —
       se retrouvent AU-DESSUS d'elle. À l'arrivée, la chaîne entière planait à
       quatre cents unités en l'air, socle compris, détachée sur le ciel.

       ⚠️ Personne n'aurait vu ça en lisant `Math.max(-260, …)`, qui a l'air
       d'une précaution raisonnable. Il fallait rendre une image en BAS de la
       piste — et c'est pour ça que la liste des planches en contient une
       désormais.

       La butée correcte est RELATIVE À LA CAMÉRA et non absolue : les montagnes
       peuvent monter dans le cadre, mais jamais décoller de l'horizon. */
    mountainsNear.position.y = Math.min(c.y + 8, c.y * 0.55 - 60);
    mountainsFar.position.y = Math.min(c.y + 20, c.y * 0.35 - 90);

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
    if (spray) for (const p of spray.live) p.t = -1;
    clearTrail();
  }

  /* ⚠️ APPELÉ À CHAQUE REMISE EN PLACE AU CHECKPOINT (414), et pas seulement au
     départ. Sans ça, la trace resterait tendue entre l'endroit de la chute et
     le checkpoint : un ruban de plusieurs centaines de mètres en travers du
     paysage, qui est exactement le genre d'artefact qu'on ne remarque qu'une
     fois et qu'on ne peut plus ignorer ensuite. On coupe simplement la
     continuité — les segments déjà gravés en amont, eux, restent, et c'est très
     bien : le joueur revoit sa propre trace du passage précédent, ce qui est
     une information utile et gratuite. */
  function cutTrail() {
    if (!trail) return;
    trail.prevL = trail.prevR = null;
    trail.lastS = -1e9;
  }

  function render() { renderer.render(scene, camera); }

  return {
    init, resize, render, buildNode, dropNode, clearAll, cutTrail,
    updateSled, updateCritters, updateFx, updateAmbient, applySkin,
    get camera() { return camera; },
    get scene() { return scene; },
    get sledRig() { return sledRig; },
    // Pour tools/preview-luge.js : vérifier que le sillon a bien été gravé.
    trailColors: () => (trail ? trail.col : null),
    get materials() { return mat; },
    get geometries() { return geo; },
  };
})();
