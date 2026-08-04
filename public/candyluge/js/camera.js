/* =============================================================================
   camera.js — LE CADRE. C'est lui qui décide si le paysage existe.
   -----------------------------------------------------------------------------
   ⚠️ « CADRÉ LARGE POUR VOIR UN BEAU PAYSAGE » EST UNE CONSIGNE DE CAMÉRA, PAS
   DE DÉCOR. On peut modéliser les plus belles montagnes de sucre du monde : si
   la caméra est posée derrière la nuque du lugeur, le joueur ne verra qu'un
   ruban rose et deux barrières. C'est le défaut le plus courant des jeux de
   descente, et il ne se corrige pas en ajoutant des objets.

   QUATRE DÉCISIONS, ET ELLES TIENNENT ENSEMBLE :

     1. HAUTE ET RECULÉE (CAM_HEIGHT, CAM_BACK). La luge occupe le tiers bas du
        cadre, l'horizon tombe vers le milieu : il reste une moitié d'écran de
        ciel et de montagnes. Une caméra basse remplit l'écran de piste.

     2. ELLE SUIT LA PISTE, PAS LA LUGE. L'orientation de la caméra est prise
        SUR LA PISTE, à l'abscisse de la luge — pas sur le nez de la luge. En
        dérapage, la luge tourne jusqu'à 50° : une caméra collée à son axe
        ferait pivoter tout le paysage à chaque glissade, ce qui est
        proprement illisible. Ici, la luge dérape DANS le cadre, et c'est ce
        qui rend le dérapage visible.

     3. LE CHAMP S'OUVRE AVEC LA VITESSE (CAM_FOV_SPEED). Le plus vieux truc du
        jeu de course, et il n'a pas d'équivalent : sans lui, 30 u/s et 55 u/s
        se ressemblent, parce que rien à l'écran ne change de taille.

     4. LE ROULIS EST DISCRET (7° au maximum). Assez pour qu'un virage se
        sente, pas assez pour que l'horizon bascule — un horizon qui bascule
        prive le joueur de sa seule référence stable.

   ET UNE INTERDICTION : la caméra ne se secoue PAS pendant la descente. Le
   tremblement d'écran est un effet de choc ; l'employer en continu ferait
   trembler le paysage qu'on demande précisément de regarder. Elle ne bouge
   qu'à l'atterrissage et à la sortie de route.
   ========================================================================== */

function ChaseCamera(camera) {
  this.cam = camera;
  this.pos = { x: 0, y: 0, z: 0 };
  this.look = { x: 0, y: 0, z: 0 };
  this.yaw = 0;
  this.roll = 0;
  this.fov = CFG.CAM_FOV;
  this.shake = 0;
  this.ready = false;
}

ChaseCamera.prototype.addShake = function (k) {
  this.shake = Math.min(1, this.shake + k);
};

/* ⚠️ APPELÉ À CHAQUE REMISE EN PLACE AU CHECKPOINT (414). Tout le suivi de
   cette caméra est AMORTI : elle rejoint sa position voulue à vitesse finie,
   ce qui est exactement ce qu'on veut quand la luge se déplace normalement, et
   catastrophique quand elle se TÉLÉPORTE de plusieurs centaines d'unités. Sans
   cette remise à zéro, on verrait la caméra traverser tout le paysage en
   glissant pendant deux bonnes secondes après chaque chute — le décor
   défilerait à l'envers, à travers les montagnes. Remettre `ready` à faux
   suffit : la prochaine image se pose directement au bon endroit. */
ChaseCamera.prototype.reset = function () {
  this.ready = false;
  this.shake = 0;
};

ChaseCamera.prototype.update = function (dt, sled, now) {
  /* L'orientation vient de la PISTE (voir décision 2), lissée : le lacet de la
     piste change vite dans les épingles, et une caméra qui le suivrait à
     l'image près donnerait un cadre nerveux. */
  const wantYaw = Slope.yawAt(sled.s + 6);
  const k = 1 - Math.exp(-CFG.CAM_YAW_LAG * dt);
  let d = wantYaw - this.yaw;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  this.yaw += d * k;

  const p = sled.worldPos();
  const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
  /* ⚠️ LA CAMÉRA RECULE ET S'ABAISSE AVEC LA VITESSE (413). C'est le geste de
     caméra de Steep, et c'est le moyen le plus efficace de faire sentir une
     accélération sans toucher au jeu : à basse vitesse on domine la piste et
     on lit le tracé, à pleine vitesse on est plaqué derrière la luge, au ras
     de la neige, et l'horizon monte. Le joueur ne voit pas la caméra bouger —
     il sent que ça va vite. */
  const vk = Math.min(1, sled.v / CFG.SLED_SPEED_MAX);
  const back = CFG.CAM_BACK + vk * CFG.CAM_BACK_SPEED;
  const height = CFG.CAM_HEIGHT - vk * CFG.CAM_DROP_SPEED;
  // Le recul se fait le long de l'axe de la piste, à l'horizontale : reculer
  // le long de la PENTE plaquerait la caméra au sol dans les murs, là où on a
  // justement le plus besoin de voir loin.
  const want = {
    x: p.x - sy * back,
    y: p.y + height,
    z: p.z + cy * back,
  };
  /* La caméra ne suit PAS le décalage latéral de la luge en entier. Elle en
     reprend les deux tiers : le tiers restant est ce qui fait qu'on VOIT la
     luge se déporter dans le cadre au lieu de rester punaisée au centre. */
  const lat = Slope.pointAt(sled.s, sled.u * 0.34);
  want.x = want.x * 0.34 + (lat.x - sy * back) * 0.66;
  want.z = want.z * 0.34 + (lat.z + cy * back) * 0.66;

  if (!this.ready) { this.pos = want; this.ready = true; }
  else {
    const a = 1 - Math.exp(-CFG.CAM_LAG * dt);
    this.pos.x += (want.x - this.pos.x) * a;
    this.pos.z += (want.z - this.pos.z) * a;
    /* ⚠️ LA HAUTEUR EST BEAUCOUP PLUS MOLLE QUE LE RESTE (413). La luge a
       maintenant une suspension : elle monte et descend de presque un mètre
       sur chaque bosse. Une caméra qui copierait ce mouvement donnerait un
       tremblement vertical permanent — le plus sûr moyen d'écœurer le joueur
       en trois minutes. On garde donc l'assiette et on laisse la luge bouger
       DANS le cadre : c'est exactement comme ça qu'on filme un skieur. */
    this.pos.y += (want.y - this.pos.y) * (1 - Math.exp(-CFG.CAM_LAG_Y * dt));
  }

  // Le point visé : loin devant, sur la piste. C'est lui qui fait entrer le
  // paysage dans le cadre — viser la luge le ferait sortir.
  const ahead = Slope.pointAt(sled.s + CFG.CAM_LOOK_AHEAD, sled.u * 0.25);
  this.look = { x: ahead.x, y: ahead.y + CFG.CAM_LOOK_HEIGHT, z: ahead.z };

  /* ⚠️ LE CHAMP S'OUVRE AUSSI AVEC LA CHARGE (414), et c'est la traduction
     visuelle la plus directe de « la résistance du sol ». La charge dit combien
     on demande à l'adhérence ; en ouvrant le champ à mesure qu'elle monte, on
     donne au joueur la seule chose qui lui manquait au 413 : la sensation que
     ça FORCE, avant que ça lâche. Le cadre s'écarte, la vitesse paraît monter,
     l'engin semble tirer — et tout ça n'est qu'un angle de caméra.
     Cinq degrés, pas plus : au-delà, l'image « respire » en permanence et le
     joueur perd son échelle. */
  const boostK = sled.boost > 0 ? 1 : 0;
  const loadK = sled.load || 0;
  const wantFov = CFG.CAM_FOV + CFG.CAM_FOV_SPEED * vk + boostK * 5 + CFG.LOAD_FOV * loadK;
  this.fov += (wantFov - this.fov) * (1 - Math.exp(-3 * dt));

  /* Le roulis suit LA CARRE et non le nez : c'est l'engagement qu'on veut
     voir à l'écran, pas la direction pointée. Une luge qui dérape a le nez
     très tourné et n'est presque plus sur sa carre — la caméra ne doit donc
     pas basculer davantage, elle doit basculer MOINS. */
  const wantRoll = -sled.edge * 0.30 - Slope.curveAt(sled.s) * 190 * 0.4;
  this.roll += (Math.max(-CFG.CAM_ROLL_MAX, Math.min(CFG.CAM_ROLL_MAX, wantRoll)) - this.roll)
    * (1 - Math.exp(-5 * dt));

  this.shake = Math.max(0, this.shake - dt * 2.6);
  /* ⚠️ LE FRÉMISSEMENT DE CHARGE (414) — À NE PAS CONFONDRE AVEC LA SECOUSSE.
     L'interdiction posée au 413 (« la caméra ne se secoue PAS pendant la
     descente ») reste entière et elle est juste : un tremblement permanent
     ferait vibrer le paysage qu'on demande précisément de regarder, et
     écœurerait en trois minutes.
     Ce qu'on ajoute ici n'est pas un tremblement mais un FRÉMISSEMENT, et trois
     choses l'en distinguent : il est minuscule (LOAD_RUMBLE = 0,16 unité au
     maximum, contre 0,5 pour un choc), il est LENT (période de 60 ms et non de
     20), et surtout il n'existe QUE dans le dernier tiers de la charge — donc
     seulement quand on est près de décrocher, c'est-à-dire quand on veut
     justement être prévenu. C'est une information, pas un effet. */
  const rumble = Math.max(0, (sled.load || 0) - 0.62) / 0.38;
  const rk = rumble * rumble * CFG.LOAD_RUMBLE * (sled.grounded ? 1 : 0);
  const sh = this.shake * this.shake * 0.5;
  const jx = sh * Math.sin(now / 21) + rk * Math.sin(now / 61);
  const jy = sh * Math.sin(now / 17 + 1.7) + rk * Math.sin(now / 43 + 2.1);

  this.cam.position.set(this.pos.x + jx, this.pos.y + jy, this.pos.z);
  this.cam.lookAt(this.look.x, this.look.y, this.look.z);
  /* Le roulis s'ajoute APRÈS le lookAt : appliqué avant, il serait écrasé.
     C'est la même mécanique que le roulis des flammes du défi de fuite. */
  this.cam.rotateZ(this.roll);
  if (Math.abs(this.cam.fov - this.fov) > 0.01) {
    this.cam.fov = this.fov;
    this.cam.updateProjectionMatrix();
  }
};
