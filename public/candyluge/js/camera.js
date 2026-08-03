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
  // Le recul se fait le long de l'axe de la piste, à l'horizontale : reculer
  // le long de la PENTE plaquerait la caméra au sol dans les murs, là où on a
  // justement le plus besoin de voir loin.
  const want = {
    x: p.x - sy * CFG.CAM_BACK,
    y: p.y + CFG.CAM_HEIGHT,
    z: p.z + cy * CFG.CAM_BACK,
  };
  /* La caméra ne suit PAS le décalage latéral de la luge en entier. Elle en
     reprend les deux tiers : le tiers restant est ce qui fait qu'on VOIT la
     luge se déporter dans le cadre au lieu de rester punaisée au centre. */
  const lat = Slope.pointAt(sled.s, sled.u * 0.34);
  want.x = want.x * 0.34 + (lat.x - sy * CFG.CAM_BACK) * 0.66;
  want.z = want.z * 0.34 + (lat.z + cy * CFG.CAM_BACK) * 0.66;

  if (!this.ready) { this.pos = want; this.ready = true; }
  else {
    const a = 1 - Math.exp(-CFG.CAM_LAG * dt);
    this.pos.x += (want.x - this.pos.x) * a;
    this.pos.y += (want.y - this.pos.y) * a;
    this.pos.z += (want.z - this.pos.z) * a;
  }

  // Le point visé : loin devant, sur la piste. C'est lui qui fait entrer le
  // paysage dans le cadre — viser la luge le ferait sortir.
  const ahead = Slope.pointAt(sled.s + CFG.CAM_LOOK_AHEAD, sled.u * 0.25);
  this.look = { x: ahead.x, y: ahead.y + CFG.CAM_LOOK_HEIGHT, z: ahead.z };

  const vk = Math.min(1, sled.v / CFG.SLED_SPEED_MAX);
  const boostK = sled.boost > 0 ? 1 : 0;
  this.fov += ((CFG.CAM_FOV + CFG.CAM_FOV_SPEED * vk + boostK * 5) - this.fov) * (1 - Math.exp(-3 * dt));

  const wantRoll = -sled.heading * 0.35 - Slope.curveAt(sled.s) * 190 * 0.5;
  this.roll += (Math.max(-CFG.CAM_ROLL_MAX, Math.min(CFG.CAM_ROLL_MAX, wantRoll)) - this.roll)
    * (1 - Math.exp(-5 * dt));

  this.shake = Math.max(0, this.shake - dt * 2.6);
  const sh = this.shake * this.shake * 0.5;
  const jx = sh * Math.sin(now / 21), jy = sh * Math.sin(now / 17 + 1.7);

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
