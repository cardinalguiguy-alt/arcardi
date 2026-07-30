/* =============================================================================
   camera.js — Caméra de poursuite.
   -----------------------------------------------------------------------------
   Rien de cinématographique : on veut VOIR, et on veut que les virages soient
   lisibles. Deux lissages seulement.

   * Le LACET est lissé séparément de la position, en passant toujours par le
     plus court chemin angulaire. Sans ça, un virage de -90° à +180° fait faire
     un tour complet à la caméra et le joueur perd le fil.
   * La caméra suit une position CIBLE calculée derrière le joueur dans le
     repère de la caméra elle-même (et non du joueur). Pendant un virage, elle
     coupe donc légèrement le coin au lieu de balayer violemment le décor.
   ========================================================================== */

class ChaseCamera {
  constructor(cam) {
    this.cam = cam;
    this.yaw = 0;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.shake = 0;
    this.initialised = false;
  }

  addShake(amount) { this.shake = Math.min(1.6, this.shake + amount); }

  /* Interpolation angulaire par le plus court chemin. */
  static lerpAngle(a, b, k) {
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * k;
  }

  update(dt, player) {
    const node = player.node();
    if (!node) return;            // garde : un tronçon peut manquer une frame
    const targetYaw = dirYaw(node.dir);
    const p = player.worldPos();

    if (!this.initialised) { this.yaw = targetYaw; this.initialised = true; }
    this.yaw = ChaseCamera.lerpAngle(this.yaw, targetYaw, Math.min(1, CFG.CAM_YAW_LERP * dt));

    // Vecteur "avant" de la caméra, dérivé de son propre lacet lissé.
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);

    const want = new THREE.Vector3(
      p.x - fx * CFG.CAM_BACK,
      p.y + CFG.CAM_HEIGHT,
      p.z - fz * CFG.CAM_BACK
    );
    const k = Math.min(1, CFG.CAM_POS_LERP * dt);
    this.pos.lerp(want, this.initialised ? k : 1);
    if (this.pos.lengthSq() === 0) this.pos.copy(want);

    /* Zip 377 — REGARD EN ARRIÈRE de la sortie offroad.
       La POSITION de la caméra ne bouge pas d'un pouce : elle reste derrière
       le fermier, sur la branche. Seule la DIRECTION DE VISÉE balaie 180°,
       jusqu'à regarder en arrière le long de la branche — c'est-à-dire vers
       l'embranchement, que la meute traverse tout droit à ce moment-là.

       POURQUOI 180° ET PAS UN SIMPLE COUP D'ŒIL DE CÔTÉ. La question a été
       tranchée en calculant, pas à l'estime : la caméra de poursuite garde le
       fermier exactement sur son axe, donc la meute — qui court derrière lui
       puis derrière l'embranchement — se retrouve toujours à 120°-160° de cet
       axe. Aucun décalage modéré ne peut la ramener dans le champ (72° de FOV,
       ~52° de demi-champ horizontal en 16:9). Avec 180°, l'embranchement est
       plein cadre et les loups le traversent à ~20° du centre. Le fermier, lui,
       passe derrière la caméra : c'est normal, c'est SON regard qu'on adopte.

       Le sens du balayage compte autant que son amplitude : dirYaw décroît
       quand on tourne à droite, donc +escapeSide fait passer la visée PAR la
       direction de la piste principale à mi-parcours. On ne coupe pas au plus
       court, on panoramique le long de la piste qu'on abandonne.

       Aucun lissage ajouté ici, et c'est délibéré : `look` est DÉJÀ une courbe
       continue (montée cubique, retour en cosinus, voir Player.escapePose).
       Lisser une courbe lissée n'ajoute que du retard. */
    let lx = fx, lz = fz, fromCam = false;
    if (player.escaping) {
      const a = player.escapeSide * Math.PI * player.escapePose(performance.now()).look;
      const ca = Math.cos(a), sa = Math.sin(a);
      // Rotation de +a dans la convention de dirYaw, où f = (-sin yaw, -cos yaw).
      lx = fx * ca + fz * sa;
      lz = fz * ca - fx * sa;
      fromCam = true;   // la visée part de la CAMÉRA, sinon l'axe n'est exact qu'à 0° et 180°
    }

    const ox = fromCam ? this.pos.x : p.x;
    const oz = fromCam ? this.pos.z : p.z;
    this.look.set(
      ox + lx * CFG.CAM_LOOK_AHEAD,
      p.y + CFG.CAM_LOOK_HEIGHT,
      oz + lz * CFG.CAM_LOOK_AHEAD
    );

    // Secousse : décroissance exponentielle, appliquée après le lissage pour
    // qu'elle ne soit pas mangée par l'interpolation.
    if (this.shake > 0.001) {
      const s = this.shake;
      this.cam.position.set(
        this.pos.x + (Math.random() - 0.5) * s,
        this.pos.y + (Math.random() - 0.5) * s,
        this.pos.z + (Math.random() - 0.5) * s
      );
      this.shake -= CFG.SHAKE_DECAY * this.shake * dt;
    } else {
      this.cam.position.copy(this.pos);
      this.shake = 0;
    }
    this.cam.lookAt(this.look);
  }

  reset() { this.initialised = false; this.shake = 0; this.pos.set(0, 0, 0); }
}
