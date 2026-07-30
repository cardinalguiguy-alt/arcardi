/* =============================================================================
   wolves.js — La meute démoniaque.
   -----------------------------------------------------------------------------
   Volontairement SANS IA. La meute n'est qu'un seul nombre : `gap`, l'écart en
   unités entre le joueur et le museau du premier loup.

     - il remonte tout seul (CHASE_RECOVER) tant que le joueur court proprement
     - il chute d'un coup à chaque trébuchement (CHASE_LOSS_ON_STUMBLE)
     - à zéro, le joueur est rattrapé

   Les loups sont ensuite POSÉS sur la piste à la distance correspondante, en
   réutilisant Track.locate(). Ils suivent donc les virages gratuitement, sans
   une ligne de navigation. C'est le même principe que les entités décoratives
   simulées localement de Ferme Vallée : si la position peut être dérivée, elle
   n'a pas besoin d'être calculée.
   ========================================================================== */

class WolfPack {
  constructor(track) {
    this.track = track;
    this.gap = CFG.CHASE_START;
    this.caught = false;
    // Décalages fixes : la meute court en formation, ce qui suffit à la rendre
    // lisible sans logique de groupe.
    this.offsets = [];
    for (let i = 0; i < CFG.WOLF_COUNT; i++) {
      this.offsets.push({
        back: i * 2.1,
        lane: (i - (CFG.WOLF_COUNT - 1) / 2) * CFG.LANE_WIDTH * 0.72,
        bobPhase: i * 1.9,
      });
    }
  }

  onStumble() {
    this.gap = Math.max(0, this.gap - CFG.CHASE_LOSS_ON_STUMBLE);
  }

  update(dt, player) {
    if (this.caught || !player.alive) return;
    this.gap = Math.min(CFG.CHASE_MAX, this.gap + CFG.CHASE_RECOVER * dt);
    if (this.gap <= 0.01) { this.caught = true; player.die("wolves"); }
  }

  /* Positions monde des loups, pour le rendu. */
  positions(player, now) {
    const out = [];
    for (const o of this.offsets) {
      const d = player.totalDist - this.gap - o.back;
      if (d < 0) continue;
      const loc = this.track.locate(d);
      const bob = Math.abs(Math.sin(now / 90 + o.bobPhase)) * 0.28;
      out.push(this.track.worldPos(loc.node, loc.t, o.lane, 0.45 + bob));
    }
    return out;
  }

  /* 0 = collés au joueur, 1 = distance maximale. Sert à l'UI (jauge de danger)
     et à l'intensité du grondement visuel. */
  danger() { return 1 - Math.min(1, this.gap / CFG.CHASE_MAX); }
}
