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

    this.look.set(
      p.x + fx * CFG.CAM_LOOK_AHEAD,
      p.y + CFG.CAM_LOOK_HEIGHT,
      p.z + fz * CFG.CAM_LOOK_AHEAD
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
