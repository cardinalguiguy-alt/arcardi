/* =============================================================================
   sled.js — LA LUGE. Sa physique, et rien d'autre.
   -----------------------------------------------------------------------------
   Elle ne connaît que la pente et les touches. Elle ignore les gourmands, les
   bonbons, la caméra et les étoiles — ce sont eux qui la lisent. C'est le même
   partage qu'entre player.js et game.js au défi de fuite, et il vaut ici pour
   une raison de plus : tools/verify-luge.mjs fait tourner CETTE physique, sans
   navigateur et sans décor, pour prouver que la piste se descend. Une luge qui
   aurait besoin de la scène pour avancer ne se simulerait pas.

   ═══════════════════════════════════════════════════════════════════════════
   ⚠️ LE CŒUR DU CHANTIER EST ICI : « LES MOUVEMENTS DE LA LUGE DOIVENT ÊTRE
   BEAUX ». Ce n'est pas une couche d'animation posée par-dessus une boîte qui
   glisse — c'est une conséquence de trois choix de physique, et si on les
   défait, aucune animation ne rattrapera :
   ═══════════════════════════════════════════════════════════════════════════

   1. ELLE N'A PAS DE MOTEUR. Toute la vitesse vient de `g·sin(pente)`. Une
      portion plate ralentit vraiment, un mur lance vraiment. Le défi de fuite
      accélère tout seul jusqu'à un plafond ; ici le joueur gère son énergie.
      C'est ce qui rend une descente RACONTABLE : on se souvient du mur.

   2. LA LUGE POINTE OÙ ELLE VEUT, ELLE VA OÙ ELLE PEUT. Deux nombres, et tout
      le pilotage est dans leur rapport : STEER_RATE (vitesse à laquelle elle
      s'ORIENTE) et GRIP (vitesse à laquelle elle CONVERTIT cette orientation
      en déplacement réel). Quand le second est plus petit, la luge est déjà
      tournée alors qu'elle file encore tout droit — c'est exactement ce qu'on
      appelle un dérapage, et il naît de la physique, pas d'un booléen.

   3. LE DÉRAPAGE EST UNE INTENSITÉ, PAS UN ÉTAT. `drift` ∈ [0,1] se déduit du
      GLISSEMENT RÉEL (l'angle entre le nez de la luge et sa trajectoire). Tout
      s'y branche : le débit d'étoiles, le roulis de la caméra, la charge du
      turbo, le score. Un booléen aurait donné des étincelles qui s'allument et
      s'éteignent d'un coup — le défaut visuel classique de ce genre de jeu.
   ========================================================================== */

function Sled() {
  this.s = 0;             // abscisse le long de la piste
  this.u = 0;             // position latérale, 0 = centre, + = droite
  this.v = 14;            // vitesse le long de la piste (u/s)
  this.lat = 0;           // vitesse latérale réelle (u/s)
  this.heading = 0;       // angle du nez de la luge par rapport à la piste (rad)

  this.air = 0;           // hauteur au-dessus de la piste
  this.vy = 0;
  this.grounded = true;

  this.drift = 0;         // intensité de dérapage, 0..1
  this.driftCharge = 0;   // ms de dérapage tenu
  this.boost = 0;         // ms de turbo restantes
  this.boostFlash = 0;    // ms depuis le déclenchement (pour l'éclair visuel)

  this.candies = 0;
  this.alive = true;
  this.finished = false;
  this.cause = null;

  this.onCrash = null;
  this.onBoost = null;
  this.onLand = null;

  /* Le ROULIS et le TANGAGE visuels. Ils sont lissés à part de la physique :
     une luge dont l'inclinaison suivrait le braquage à l'image près aurait
     l'air nerveuse et raide. On veut qu'elle « pose » dans le virage. */
  this.roll = 0;
  this.pitchVis = 0;
}

/* Interpolation douce, bornée. Un `lerp` par image dépend de la fréquence
   d'images ; celui-ci n'en dépend pas — indispensable, un jeu qui pilote plus
   nerveusement à 144 Hz qu'à 60 Hz n'est pas le même jeu. */
function damp(a, b, rate, dt) {
  return b + (a - b) * Math.exp(-rate * dt);
}
function smooth01(x, a, b) {
  const t = Math.max(0, Math.min(1, (x - a) / Math.max(1e-6, b - a)));
  return t * t * (3 - 2 * t);
}

Sled.prototype.update = function (dt, now, finishK) {
  if (!this.alive) return;

  const steer = Input.axis();
  const sliding = Input.sliding() && this.grounded;
  const pitch = Slope.pitchAt(this.s);
  const curve = Slope.curveAt(this.s);

  /* ------------------------------------------------------------ VITESSE --
     Pesanteur le long de la pente, moins les deux frottements. Le frottement
     de l'air est quadratique (c'est lui qui fixe la vitesse terminale sur un
     mur), celui de la neige est constant (c'est lui qui arrête sur un plat). */
  let acc = CFG.GRAVITY * Math.sin(pitch)
          - CFG.SLED_FRICTION
          - CFG.SLED_DRAG * this.v * this.v;
  if (sliding) acc -= CFG.SLED_SLIDE_BRAKE;
  if (this.boost > 0) acc += CFG.BOOST_ACCEL;
  /* L'arrivée : la piste s'aplanit et la luge s'arrête d'elle-même. Elle ne
     s'arrête PAS net — on regarde la vallée en roue libre, c'est la
     récompense de la descente, pas un écran qui tombe. */
  if (finishK > 0) acc -= finishK * 10;

  this.v += acc * dt;
  const vMax = CFG.SLED_SPEED_MAX + (this.boost > 0 ? CFG.BOOST_SPEED_BONUS : 0);
  if (this.v > vMax) this.v = damp(this.v, vMax, 3, dt);
  /* Le plancher de vitesse n'existe QUE hors zone d'arrivée : on ne doit
     jamais rester planté au milieu d'une descente, mais on doit pouvoir
     s'immobiliser en bas. */
  if (finishK <= 0 && this.v < CFG.SLED_SPEED_MIN) this.v = CFG.SLED_SPEED_MIN;
  if (this.v < 0) this.v = 0;

  /* ---------------------------------------------------------- DIRECTION --
     ⚠️ L'AUTORITÉ DE DIRECTION BAISSE AVEC LA VITESSE. C'est ce qui donne son
     enjeu à la vitesse : à 20 u/s on se replace où l'on veut, à 60 on négocie.
     Sans cette baisse, aller vite n'aurait aucun coût et le jeu se résumerait
     à tenir la ligne droite la plus raide. */
  const vk = Math.min(1, this.v / CFG.SLED_SPEED_MAX);
  let authority = 1 - vk * (1 - CFG.SLED_STEER_SPEED_FALLOFF);
  if (sliding) authority *= CFG.SLED_SLIDE_STEER_BONUS;   // le frein-virage
  if (!this.grounded) authority *= CFG.SLED_AIR_STEER;

  const target = steer * CFG.SLED_STEER_MAX;
  this.heading = damp(this.heading, target, CFG.SLED_STEER_RATE * authority * 2.4, dt);

  /* ------------------------------------------------------------ ADHÉRENCE
     La vitesse latérale VOULUE est celle d'une luge qui irait pile où elle
     pointe. La vraie la rejoint à la vitesse `grip` — et c'est l'écart entre
     les deux qui EST le dérapage. */
  const wantLat = Math.sin(this.heading) * this.v;
  const grip = (sliding ? CFG.SLED_GRIP_DRIFT : CFG.SLED_GRIP) * (this.grounded ? 1 : 0.35);
  this.lat = damp(this.lat, wantLat, grip, dt);

  /* La force centrifuge : un virage pris vite POUSSE vers l'extérieur. Le
     dévers en reprend une partie (c'est à ça qu'il sert), le reste est à la
     charge du joueur. C'est ce qui fait qu'une corde se travaille. */
  const bank = Slope.bankAt(this.s);
  /* ⚠️ LES DEUX COEFFICIENTS SE COMPENSENT À LA VITESSE DE CROISIÈRE, et c'est
     ce qui rend le dévers utile plutôt que dominant : à 34 u/s dans le grand
     virage, la force centrifuge (0,0055·34²·0,55 ≈ 3,5) et la reprise du
     dévers (sin(0,25)·52·0,27 ≈ 3,5) s'annulent. Plus vite, on est poussé
     dehors ; plus lentement, on glisse vers la corde. C'est exactement ce
     qu'on veut avoir à corriger au volant. */
  /* ⚠️ LES DEUX FORCES S'ÉTEIGNENT AVEC LA VITESSE, et la seconde a coûté cher
     à trouver : à l'arrêt, la direction ne produit plus rien (`wantLat` est
     proportionnel à la vitesse) tandis que le dévers, lui, tirait toujours.
     Une luge à l'arrêt sur une piste relevée glissait donc dans la barrière
     sans que le joueur puisse lever le petit doigt — le pilote automatique
     mourait invariablement à 5 025 unités sur 5 200, à quelques mètres de
     l'arrivée. `min(1, v/12)` est l'adhérence statique de la neige : en
     dessous, ça ne glisse plus. */
  const vGrip = Math.min(1, this.v / 12);
  this.lat += (curve * this.v * this.v * 0.55
             - Math.sin(bank) * CFG.GRAVITY * 0.27 * vGrip) * dt;
  this.lat = damp(this.lat, this.lat, CFG.SLED_LAT_DAMP, dt);

  /* ------------------------------------------------- INTENSITÉ DE DÉRAPAGE
     Le glissement réel : l'angle entre le nez et la trajectoire. */
  const travelAngle = this.v > 1 ? Math.atan2(this.lat, this.v) : 0;
  const slip = Math.abs(this.heading - travelAngle);
  const targetDrift = this.grounded
    ? smooth01(slip, CFG.DRIFT_ENTER, CFG.DRIFT_FULL) * Math.min(1, this.v / 16)
    : 0;
  this.drift = damp(this.drift, targetDrift, 12, dt);

  /* ---------------------------------------------------------- LE TURBO ----
     Il récompense le dérapage TENU. Sans lui, le joueur ne dérape que par
     accident et ne verra jamais le plus bel effet du jeu ; avec lui, il
     cherche le dérapage — et le cherche dans les virages, c'est-à-dire là où
     il est beau. La charge se perd si le dérapage retombe : c'est une figure
     à tenir, pas un compteur qui s'empile. */
  if (this.drift > 0.40) {
    this.driftCharge += dt * 1000;
  } else {
    if (this.driftCharge >= CFG.DRIFT_CHARGE_MS) {
      this.boost = CFG.BOOST_MS;
      this.boostFlash = 0;
      /* ⚠️ LA CHARGE EST REMISE À ZÉRO SUR-LE-CHAMP. Sans cette ligne elle
         reste au-dessus du seuil pendant plusieurs images et le turbo se
         redéclenche à chaque image : le banc d'essai en comptait quarante-huit
         en douze secondes, là où le joueur en attend quatre. Un turbo qui part
         en rafale ne se voit pas comme un bogue, il se voit comme un jeu
         trop facile — c'est pire. */
      this.driftCharge = 0;
      if (this.onBoost) this.onBoost();
    }
    this.driftCharge = Math.max(0, this.driftCharge - dt * 1800);
  }
  if (this.boost > 0) { this.boost -= dt * 1000; this.boostFlash += dt * 1000; }

  /* --------------------------------------------------------- LE SAUT -----
     Deux façons de décoller : la touche haut, et le SOMMET D'UNE BOSSE pris
     vite. La seconde n'est pas un gadget — c'est elle qui fait que le relief
     de la piste se joue au lieu de se traverser, et elle ne coûte rien : la
     bosse est déjà là, on ne fait que la lire. */
  if (this.grounded && Input.jumpPressed()) {
    this.vy = CFG.SLED_JUMP_V;
    this.grounded = false;
  } else if (this.grounded && this.v > 26) {
    const dh = (Slope.bumpAt(this.s + this.v * dt) - Slope.bumpAt(this.s)) / Math.max(1e-4, dt);
    if (dh < -6.5) { this.vy = Math.min(7.5, -dh * 0.55); this.grounded = false; }
  }
  if (!this.grounded) {
    this.vy -= CFG.SLED_JUMP_GRAVITY * dt;
    this.air += this.vy * dt;
    if (this.air <= 0) {
      const hard = this.vy < -9;
      this.air = 0; this.vy = 0; this.grounded = true;
      if (this.onLand) this.onLand(hard);
    }
  }

  /* -------------------------------------------------------- AVANCEMENT ---
     `cos(heading)` : une luge en travers avance moins vite le long de la
     piste. C'est le coût du dérapage, et il est nécessaire — sans lui,
     déraper serait gratuit et il n'y aurait plus de choix à faire. */
  this.s += this.v * Math.cos(this.heading) * dt;
  this.u += this.lat * dt;

  /* ---------------------------------------------------------- LES BORDS --
     ⚠️ ON SORT DE PISTE UN PEU AVANT DE TOUCHER LA BARRIÈRE (FENCE_MARGIN).
     Toucher pile la barrière donnerait des sorties qu'on ne comprend pas :
     à l'écran, la luge semble encore sur le rose. La marge fait que la sortie
     arrive quand on est visiblement dans la neige. */
  const halfW = Slope.widthAt(this.s) / 2 - CFG.SLED_HALF_W - CFG.FENCE_MARGIN;
  if (Math.abs(this.u) > halfW) {
    const outward = Math.sign(this.u);
    this.u = outward * halfW;
    /* ⚠️ ON NE TUE QUE LA COMPOSANTE QUI POUSSE ENCORE DEHORS. La première
       version inversait `lat` tout court : un joueur plaqué contre la barrière
       et braquant DÉJÀ vers l'intérieur voyait sa correction retournée contre
       lui à chaque image, et ne pouvait plus revenir. Le pilote automatique de
       tools/verify-luge.mjs mourait là, systématiquement, à 316 unités — sur
       une piste pourtant vide de gourmands. C'est le genre de faute qu'on ne
       trouve jamais en relisant : elle ressemble à un rebond. */
    if (this.lat * outward > 0) this.lat *= -0.15;   // on ripe le long de la barrière
    this.v = damp(this.v, this.v * 0.55, 6, dt);
    this.offTrack = (this.offTrack || 0) + dt;
    /* Une seconde entière hors piste, pas un frôlement. Le joueur doit avoir
       le temps de se rattraper — un jeu qui tue au premier contact de
       barrière n'apprend pas à négocier les virages, il apprend à ralentir. */
    if (this.offTrack > 1.0) this.die("fence");
  } else {
    this.offTrack = Math.max(0, (this.offTrack || 0) - dt * 2);
  }

  /* ------------------------------------------------- INCLINAISONS VISUELLES
     Elles ne changent RIEN à la physique. Elles sont ici parce qu'elles se
     déduisent d'elle : la luge se couche dans le sens où elle glisse, et
     pique du nez quand la pente se raidit. */
  const wantRoll = -this.heading * 0.55 - this.drift * Math.sign(this.heading || 1) * 0.22 + bank;
  this.roll = damp(this.roll, wantRoll, 7, dt);
  this.pitchVis = damp(this.pitchVis, -pitch * 0.5 - (this.grounded ? 0 : 0.18), 5, dt);

  /* ⚠️ LA LIGNE D'ARRIVÉE EST À L'ENTRÉE DE LA ZONE PLATE, PAS À SON BOUT.
     Les 260 dernières unités sont un DÉGAGEMENT : on les traverse en roue
     libre, on regarde la vallée, on s'arrête où l'on s'arrête. Attendre
     `s >= DESCENT_LENGTH` pour déclarer l'arrivée était une faute — le
     freinage de la zone plate immobilise la luge AVANT ce point, et le banc
     d'essai voyait le pilote automatique planté à 5 025 unités pendant les
     quatre cents secondes du test, jamais arrivé. Une ligne d'arrivée se
     franchit à la vitesse qu'on a ; le reste est de la décélération. */
  if (finishK > 0 && !this.finished) this.finished = true;
};

/* La mort. Elle est CENTRALISÉE ici (et pas dans game.js) parce que deux
   sources la déclenchent — la barrière, plus haut, et le contact avec un
   gourmand, depuis critters.js — et qu'elles doivent produire exactement le
   même état. Deux écritures d'une même fin finissent toujours par diverger. */
Sled.prototype.die = function (cause) {
  if (!this.alive) return;
  this.alive = false;
  this.cause = cause;
  this.drift = 0;
  this.boost = 0;
  if (this.onCrash) this.onCrash(cause);
};

/* Position monde de la luge, dévers et saut compris. Lue par la caméra, le
   décor et les collisions : une seule écriture, donc aucune divergence
   possible entre ce qu'on voit et ce qui touche. */
Sled.prototype.worldPos = function () {
  const p = Slope.pointAt(this.s, this.u);
  return { x: p.x, y: p.y + this.air, z: p.z };
};

Sled.prototype.kmh = function () {
  // 1 unité ≈ 1 mètre, et on affiche du km/h « de jeu » : ×3,6 donnerait 200
  // à pleine vitesse, ce qui n'a pas de sens sur une luge. ×2,6 place le
  // compteur autour de 160 dans les murs — le chiffre de la capture de
  // référence, et une échelle qu'on lit d'un coup d'œil.
  return Math.round(this.v * 2.6);
};
