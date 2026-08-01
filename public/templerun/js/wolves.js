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
    /* Zip 377 — LA MEUTE DÉTACHÉE DU JOUEUR.
       En temps normal, sa position se DÉDUIT de celle du fermier (`gap`), et
       c'est tout l'intérêt du système. Mais à la sortie offroad le fermier
       ralentit jusqu'au trot : déduite de lui, la meute aurait ralenti avec
       lui, ce qui est exactement le contraire de ce que la scène raconte. Elle
       ne le poursuit plus, elle file tout droit — elle a donc besoin, à ce
       moment-là et à ce moment-là seulement, de sa propre distance.
       `freeDist` à null = comportement d'origine, inchangé. */
    this.freeDist = null;
    this.freeSpeed = 0;
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

  /* Seconde chance (zip 385) : repousse la meute à l'écart de DÉPART, pas à
     l'écart MAXIMAL (CHASE_MAX) — revivre doit rester tendu. `caught` est
     réarmé, sinon la meute resterait figée sur son ancien verdict et
     redéclarerait `player.die("wolves")` dès la frame suivante. */
  reprise() { this.gap = CFG.SECOND_CHANCE_GAP; this.caught = false; }

  /* Détache la meute au moment de la sortie offroad : à partir de là elle
     avance seule, à la vitesse qu'avait la course, sans plus jamais regarder
     où est le fermier. */
  detach(dist, speed) { this.freeDist = dist; this.freeSpeed = speed; }
  runOn(dt) { if (this.freeDist !== null) this.freeDist += this.freeSpeed * dt; }

  /* Distance de RÉFÉRENCE de la meute. Un seul endroit la calcule : world.js
     s'en sert aussi pour orienter les loups, et deux formules pour la même
     chose finiraient par se désaccorder — les corps regarderaient dans une
     direction et se tiendraient dans une autre. */
  baseDist(player) {
    return this.freeDist !== null ? this.freeDist : player.totalDist;
  }

  /* Positions monde des loups, pour le rendu. */
  positions(player, now) {
    const out = [];
    const base = this.baseDist(player);
    for (const o of this.offsets) {
      const d = base - this.gap - o.back;
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
