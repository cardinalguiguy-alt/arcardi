/* =============================================================================
   sled.js — LA LUGE. Sa physique, et rien d'autre.
   -----------------------------------------------------------------------------
   Elle ne connaît que la pente et les touches. Elle ignore les gourmands, les
   bonbons, la caméra et les étoiles — ce sont eux qui la lisent. C'est ce qui
   permet à tools/verify-luge.mjs de faire tourner CETTE physique sans
   navigateur et sans décor, pour prouver que la piste se descend.

   ═══════════════════════════════════════════════════════════════════════════
   ⚠️ RÉÉCRIT AU 413 — « PRENDS POUR RÉFÉRENCE LE GAMEPLAY DE STEEP »
   ═══════════════════════════════════════════════════════════════════════════
   Le 412 avait une luge qui tournait vite et glissait joliment. Ce n'était pas
   sale, c'était PLAT : un seul régime de conduite, donc un seul ressenti, donc
   rien à apprendre. Ce qui fait la descente dans Steep — et dans le ski, et
   dans la luge — ce sont QUATRE choses, et aucune n'était là :

   ┌─ 1. LA CARRE CONTRE LE DÉRAPAGE, SÉPARÉS PAR UNE LIMITE D'ADHÉRENCE ─────┐
   │ C'est LE cœur, et tout le reste en découle.                              │
   │                                                                          │
   │   * une luge SUR LA CARRE trace un arc PROPRE : elle ne perd presque pas  │
   │     de vitesse, elle est silencieuse, elle grave la neige. C'est le geste │
   │     qu'on veut réussir.                                                   │
   │   * si l'on demande à cette carre plus que l'adhérence ne peut donner     │
   │     (trop d'angle, trop vite, trop serré), elle DÉCROCHE : la luge part   │
   │     en dérapage, gerbe de neige, et surtout ELLE FREINE.                  │
   │                                                                          │
   │ La limite est un NOMBRE (GRIP_MAX, une accélération latérale), pas un     │
   │ état : on la frôle, on la dépasse un peu, on la dépasse beaucoup. C'est   │
   │ cette frontière continue qu'on apprend à sentir, et c'est exactement ce   │
   │ qu'un joueur appelle « le jeu est bon ».                                  │
   │                                                                          │
   │ ⚠️ AU 412, L'ADHÉRENCE ÉTAIT UNE CONSTANTE. Il n'y avait donc pas de      │
   │ limite à frôler : déraper était un choix binaire (touche bas) et non une  │
   │ CONSÉQUENCE de la conduite. C'est toute la différence.                    │
   └──────────────────────────────────────────────────────────────────────────┘

   2. LA CARRE SE PREND ET SE REND — ELLE N'EST PAS INSTANTANÉE. `edge` est un
      état à inertie : engager prend du temps, changer de carre en prend deux
      fois plus (il faut repasser à plat). C'est ce qui donne son POIDS à la
      luge. Une direction qui répond à l'image donne un curseur de souris, pas
      un engin lancé à cinquante à l'heure.

   3. LE TERRAIN SE SENT. Une suspension (ressort amorti) sépare la luge de la
      surface : elle s'écrase dans les creux, s'allège sur les bosses, et REND
      cette énergie. On peut donc POMPER — absorber la bosse et se détendre
      après, ce qui accélère vraiment. C'est le geste signature de Steep, et il
      ne coûte qu'un ressort.

   4. L'ATTERRISSAGE SE RATE. Retomber dans l'axe conserve la vitesse ;
      retomber en travers ou en catastrophe la détruit. Sans ça, sauter est
      gratuit et le relief n'est qu'un décor.

   TOUT LE RESTE (étoiles, caméra, score, turbo, sillon gravé) SE BRANCHE SUR
   CES QUATRE NOMBRES — `edge`, `skid`, `comp`, `landQuality` — et sur rien
   d'autre.
   ========================================================================== */

function Sled() {
  this.s = 0;             // abscisse le long de la piste
  this.u = 0;             // position latérale, 0 = centre, + = droite
  this.v = 16;            // vitesse le long de la piste (u/s)
  this.lat = 0;           // vitesse latérale réelle (u/s)
  this.heading = 0;       // angle du nez de la luge par rapport à la piste (rad)

  /* LA CARRE. -1 (couché à gauche) à +1 (couché à droite). C'est l'état
     central du 413 : ce n'est pas la touche, c'est ce que la luge a réussi à
     en faire. */
  this.edge = 0;
  this.skid = 0;          // dépassement de l'adhérence, 0..1 — le dérapage
  this.carve = 0;         // qualité de la carre PROPRE, 0..1 — le geste réussi

  /* ⚠️ LA CHARGE (414). Ce qu'on demande à l'adhérence, rapporté à ce qu'elle
     peut donner : 0 = on roule tranquille, 1 = on est PILE sur la limite,
     au-delà on décroche. C'est la seule grandeur du jeu qui dise « attention,
     ça vient » — tout le reste (skid, carve) ne parle qu'une fois la limite
     franchie. La caméra, le champ, la gerbe et l'assiette de la luge s'y
     branchent, et c'est ce qui permet enfin de SENTIR la limite approcher au
     lieu de la découvrir en la dépassant. */
  this.load = 0;
  this.deep = 0;          // enfoncement dans la neige non damée des bords, 0..1

  this.air = 0;           // hauteur au-dessus de la surface
  this.vy = 0;
  this.grounded = true;
  this.comp = 0;          // suspension : < 0 = écrasée, > 0 = détendue
  this.compV = 0;
  this.landQuality = 1;   // 1 = atterrissage propre, 0 = vautré

  this.drift = 0;         // intensité visuelle du dérapage (= skid lissé)
  this.driftCharge = 0;
  this.boost = 0;
  this.boostFlash = 0;
  this.tuck = 0;          // position d'œuf, 0..1

  /* ⚠️ LA CHUTE ET LES CHECKPOINTS (414, référence Lonely Mountains).
     `wipe` est la culbute, `reset` la remise en place qui la suit. On ne meurt
     toujours pas — mais on ne repart plus SUR PLACE comme au 413 : on repart au
     dernier checkpoint franchi. Voir bail() et respawn(). */
  this.wipe = 0;
  this.reset = 0;
  this.wipes = 0;
  this.spin = 0;          // rotation de la culbute, pour l'affichage
  /* Le dernier checkpoint FRANCHI. Il démarre à CP_FIRST et non à zéro : on ne
     renvoie jamais le joueur au tout début de la piste, même s'il se vautre
     dans les vingt premières secondes. */
  this.cp = 0;
  this.cpIndex = -1;
  this.grace = 0;        // invulnérabilité brève après une reprise (voir CP_GRACE_MS)
  /* Échecs CONSÉCUTIFS sur la porte courante. Remis à zéro dès qu'on en gagne
     une. Il pilote la garantie de progression — voir Field.rewind. */
  this.cpTries = 0;
  this.onCheckpoint = null;
  this.onRespawn = null;

  this.candies = 0;
  this.alive = true;
  this.finished = false;
  this.cause = null;

  this.onCrash = null;
  this.onWipe = null;
  this.onBoost = null;
  this.onLand = null;
  this.onCarveBreak = null;   // au moment précis où la carre décroche

  this.roll = 0;
  this.pitchVis = 0;
  this.lastBump = 0;
  this.offTrack = 0;
}

/* Amortissement indépendant de la fréquence d'images. Un `lerp` par image
   pilote plus nerveusement à 144 Hz qu'à 60 — ce n'est alors plus le même jeu
   selon l'écran, ce qui est inacceptable pour un jeu de temps. */
function damp(a, b, rate, dt) { return b + (a - b) * Math.exp(-rate * dt); }
const clampN = (x, a, b) => Math.max(a, Math.min(b, x));

Sled.prototype.update = function (dt, now, finishK) {
  if (!this.alive) return;

  /* ═══════════════════════════════════════════════════════════════════════
     ⚠️ LA CHUTE — LE CHANGEMENT LE PLUS IMPORTANT DU 413, ET IL VIENT DE
     SSX 3 : ON NE MEURT PAS.
     ═══════════════════════════════════════════════════════════════════════
     Percuter un gourmand ARRÊTAIT la descente. C'était la règle du défi de
     fuite recopiée sans réfléchir — et elle est fausse ici, pour deux raisons
     qui se sont révélées en mesurant :

       1. ELLE REND LA PISTE INJUSTE. Avec la conduite du 412, on rejoignait un
          trou en une demi-seconde et une erreur se rattrapait. La carre demande
          deux à trois secondes : sur une piste semée d'obstacles mobiles, une
          seule erreur devenait fatale. Le pilote automatique de
          tools/verify-luge.mjs n'a jamais réussi à descendre — non parce qu'il
          était mauvais, mais parce que le jeu ne pardonnait rien.
       2. ELLE PRIVE DE LA MEILLEURE RÉCOMPENSE. Dans SSX, se vautrer est
          spectaculaire ET on repart : la punition est le CHRONO. Le joueur
          reste dans la descente, il perd des secondes, il enrage et il
          recommence — au lieu de regarder un écran de fin.

     Une chute coûte donc : le contrôle pendant WIPE_MS, l'essentiel de la
     vitesse, et le temps de tout reprendre. C'est très cher, et ça ne ferme
     rien. La seule vraie fin est le bas de la piste. */
  /* LA CULBUTE. La luge part en tonneau, ralentit, et on ne pilote plus rien.
     Elle dure WIPE_MS puis cède la place à la remise en place. */
  if (this.wipe > 0) {
    this.wipe -= dt * 1000;
    this.spin += dt * 9;
    this.v = damp(this.v, 6, 3.2, dt);
    this.edge = damp(this.edge, 0, 6, dt);
    this.heading = damp(this.heading, 0, 4, dt);
    this.lat = damp(this.lat, 0, 4, dt);
    this.skid = damp(this.skid, 1, 6, dt);
    this.carve = 0; this.drift = this.skid; this.driftCharge = 0; this.load = 0;
    this.s += this.v * dt;
    this.u += this.lat * dt;
    this.roll = damp(this.roll, 0, 4, dt);
    this.comp = damp(this.comp, 0, 5, dt);
    if (this.wipe <= 0) {
      this.wipe = 0;
      this.reset = CFG.CP_RESET_MS;
      this.respawn();
    }
    return;
  }

  /* LA REMISE EN PLACE. La luge est DÉJÀ au checkpoint (respawn() l'y a
     posée) ; ce délai n'existe que pour laisser le joueur reprendre ses
     repères avant que les commandes ne répondent. ⚠️ LE CHRONO, LUI, CONTINUE
     DE TOURNER — c'est lui la sanction, et la suspendre rendrait la chute
     gratuite. */
  if (this.reset > 0) {
    this.reset -= dt * 1000;
    this.v = damp(this.v, CFG.CP_SPEED, 4, dt);
    this.s += this.v * dt;
    if (this.reset <= 0) { this.reset = 0; this.grace = CFG.CP_GRACE_MS; }
    return;
  }
  if (this.grace > 0) this.grace -= dt * 1000;

  /* ══════════════════════════════════════════════════════════════════════
     LE FRANCHISSEMENT D'UN CHECKPOINT (414).
     ══════════════════════════════════════════════════════════════════════
     Une simple comparaison d'abscisse : les portes sont à des `s` fixes, la
     luge ne recule jamais, et il n'y a donc rien de plus à faire. ⚠️ ON NE
     TESTE PAS LA POSITION LATÉRALE : une porte qu'on pourrait MANQUER en
     passant à côté transformerait chaque checkpoint en obstacle à viser, ce
     qui est un autre jeu — et surtout, un joueur qui rate une porte sans le
     comprendre est renvoyé bien plus loin qu'il ne s'y attend, ce qui est la
     pire chose qu'un système de checkpoints puisse faire. La porte est LARGE
     et couvre toute la piste : elle marque la progression, elle ne la teste
     pas. */
  const cpIdx = Slope.checkpointIndexAt(this.s);
  if (cpIdx > this.cpIndex) {
    this.cpIndex = cpIdx;
    this.cp = Slope.checkpointAt(cpIdx);
    this.cpTries = 0;          // on a progressé : l'aide se remet à zéro
    if (this.onCheckpoint) this.onCheckpoint(cpIdx);
  }

  const steer = Input.axis();
  const braking = Input.sliding();
  const pitch = Slope.pitchAt(this.s);
  const curve = Slope.curveAt(this.s);
  const bank = Slope.bankAt(this.s);

  /* ======================================================== 1. LA CARRE ====
     ⚠️ CHANGER DE CARRE COÛTE PLUS CHER QUE D'EN ENGAGER UNE. Passer de la
     gauche à la droite oblige à repasser à plat : c'est le temps mort que tout
     lugeur connaît, et c'est lui qui donne son poids à l'engin. Sans cette
     asymétrie, on obtient un slalom en zigzag gratuit — le défaut le plus
     visible d'un jeu de glisse raté. */
  const crossing = steer * this.edge < -0.02;      // on demande l'autre carre
  const rate = CFG.EDGE_RATE * (crossing ? CFG.EDGE_CROSS_MUL : 1)
    * (1 - clampN(this.v / CFG.SLED_SPEED_MAX, 0, 1) * (1 - CFG.EDGE_SPEED_FALLOFF))
    * (this.grounded ? 1 : CFG.EDGE_AIR_MUL);
  this.edge = damp(this.edge, steer, rate, dt);

  /* Le RAYON de l'arc que cette carre veut décrire. Il grandit avec la vitesse
     mais SATURE (v/(v+v0)) : c'est la forme classique, et c'est elle qui fait
     qu'on tourne large à haute vitesse sans devenir incontrôlable. */
  const speedK = this.v / (this.v + CFG.CARVE_V0);
  let yawRate = this.edge * CFG.CARVE_K * speedK;
  if (braking && this.grounded) yawRate *= CFG.BRAKE_TURN_MUL;   // le frein-carre ferme le rayon
  if (!this.grounded) yawRate *= CFG.EDGE_AIR_MUL;

  /* ================================== 2. LA LIMITE D'ADHÉRENCE ============
     L'accélération latérale que cet arc RÉCLAME, plus celle que la piste
     impose déjà (sa courbure, moins ce que le dévers en reprend). Si la somme
     dépasse ce que la neige peut tenir, l'excédent DÉCROCHE. */
  const trackPull = curve * this.v * this.v * 0.55
    - Math.sin(bank) * CFG.GRAVITY * 0.22 * clampN(this.v / 12, 0, 1);
  const need = Math.abs(yawRate * this.v) + Math.abs(trackPull);

  /* ══════════════════════════════════════════════════════════════════════
     LA NEIGE PROFONDE DES BORDS (414) — ce qui donne une valeur au tracé.
     ══════════════════════════════════════════════════════════════════════
     ⚠️ AU 413, LA PISTE ÉTAIT UNIFORME D'UNE BARRIÈRE À L'AUTRE. Rouler dans la
     corde ou raser la barrière revenait donc EXACTEMENT au même, et le tracé
     n'était qu'un dessin : il n'y avait aucune raison mécanique de chercher la
     belle trajectoire. C'est la chose qui manquait le plus à un jeu dont tout
     le propos est de descendre bien.

     Le milieu est damé, les bords ne le sont pas. S'en écarter coûte de la
     vitesse ET de l'adhérence — donc la ligne rapide EXISTE, et le joueur la
     sent sous lui bien avant de pouvoir l'expliquer. C'est de la pédagogie par
     la semelle, qui est la seule qui marche dans un jeu de glisse.
     Le carré adoucit l'entrée : on ne tombe pas dans un mur de sirop en
     franchissant une ligne invisible, on s'enfonce progressivement. */
  /* ⚠️ LA FRACTION EST CALCULÉE SUR LA LARGEUR RÉELLEMENT ATTEIGNABLE, PAS SUR
     LA LARGEUR DE LA PISTE — corrigé au 414, et le banc d'essai l'a attrapé.
     La luge est arrêtée par la barrière bien avant le bord du ruban rose
     (SLED_HALF_W + FENCE_MARGIN, soit 2,45 unités de retrait). Rapportée à la
     largeur brute, sa position latérale ne dépassait donc JAMAIS 0,83 — et
     comme la neige profonde ne commence qu'à 0,68, l'enfoncement plafonnait à
     0,2 sur 1. Tout le dispositif ne délivrait qu'un cinquième de son effet,
     silencieusement.
     Rapportée à la largeur atteignable, la fraction va vraiment de 0 à 1 : on
     est enfoncé à fond quand on racle la barrière, ce qui est exactement ce
     qu'on voulait dire. */
  const halfNow = Math.max(1, Slope.widthAt(this.s) / 2 - CFG.SLED_HALF_W - CFG.FENCE_MARGIN);
  const rel = Math.abs(this.u) / halfNow;
  const deepRaw = clampN((rel - CFG.SNOW_DEEP_FROM) / (1 - CFG.SNOW_DEEP_FROM), 0, 1);
  this.deep = damp(this.deep, deepRaw * deepRaw, 8, dt);

  /* L'adhérence disponible. Elle CHUTE au freinage (c'est le principe du frein
     à main) et en l'air ; une luge posée à plat sur sa semelle tient moins
     bien qu'une luge posée sur sa carre — ce qui récompense l'engagement ; et
     depuis le 414 elle chute aussi dans la neige non damée des bords. */
  const gripMax = CFG.GRIP_MAX
    * (braking && this.grounded ? CFG.BRAKE_GRIP_MUL : 1)
    * (this.grounded ? 1 : 0.25)
    * (0.78 + 0.22 * Math.abs(this.edge))
    * (1 - this.deep * (1 - CFG.SNOW_DEEP_GRIP));
  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ ON NE DÉRAPE PAS EN L'AIR (417) — TROUVÉ PAR LE BANC D'ESSAI, ET LE
     DÉFAUT ÉTAIT LÀ DEPUIS LE 413.
     ──────────────────────────────────────────────────────────────────────────
     `gripMax` est divisé par quatre hors du sol, ce qui est juste : on ne tient
     pas une ligne en l'air. Mais l'excédent était quand même versé dans `skid`,
     et `skid` n'est pas « je n'ai pas d'adhérence » — c'est « MES PATINS
     RIPENT SUR LA NEIGE ». Une luge en vol ne rape rien du tout.

     Conséquences, et elles étaient toutes visibles sans qu'on les relie :
       * le dérapage montait à 0,88 en plein saut, donc la luge se mettait en
         travers dans les airs et le pilote prenait sa pose de dérapage ;
       * la charge saturait, donc le champ de la caméra s'ouvrait à fond ;
       * et au 416, la gerbe de neige jaillissait… au-dessus du vide (elle est
         heureusement conditionnée à `grounded`, sinon on aurait vu de la neige
         voler à trois mètres du sol).

     ⚠️ ET IL A FALLU QUE LA LUGE DEVIENNE ASSEZ RAPIDE POUR DÉCOLLER. Le 417
     redresse le cap, la luge perd donc moins de vitesse, le turbo la pousse
     au-delà de 62 u/s, et elle s'envole sur une bosse qu'elle avalait avant.
     Le contrôle « elle ne décroche pas en carvant » est alors tombé — sur un
     défaut qui n'avait rien à voir avec le cap. C'est le meilleur argument
     qu'on ait pour garder ces bancs d'essai : ils échouent sur ce qu'on n'a pas
     changé.

     La correction est d'une ligne : hors du sol, l'excédent d'adhérence ne
     produit plus de dérapage. Le dérapage déjà acquis, lui, continue de
     décroître — on atterrit donc dans l'état où l'on a décollé, ce qui est ce
     qu'on veut : un saut ne rattrape pas une faute, il la met en pause. */
  const over = Math.max(0, need - gripMax) * (this.grounded ? 1 : 0);
  /* ⚠️ LA CHARGE. Elle se lit AVANT le décrochage, contrairement à `skid` qui
     ne dit quelque chose qu'une fois la limite passée. C'est la grandeur que
     tout le retour sensoriel du 414 utilise — sans elle, le joueur n'a aucun
     moyen de savoir qu'il est à 90 % de l'adhérence plutôt qu'à 40 %. */
  this.load = damp(this.load, clampN(need / Math.max(1, gripMax), 0, 1), 10, dt);
  const wasSkidding = this.skid > CFG.SKID_BREAK;
  this.skid = damp(this.skid, clampN(over / Math.max(1, gripMax), 0, 1), 14, dt);
  if (!wasSkidding && this.skid > CFG.SKID_BREAK && this.onCarveBreak) this.onCarveBreak();

  /* LA CARRE PROPRE : engagée ET dans la limite. Elle a besoin d'un nom parce
     que trois systèmes la lisent — le sillon gravé, le score, le turbo. */
  this.carve = Math.abs(this.edge) * (1 - this.skid)
    * clampN(this.v / 18, 0, 1) * (this.grounded ? 1 : 0);

  /* Le décrochage ÉLARGIT l'arc : une luge qui dérape tourne MOINS que ce
     qu'on lui demande. C'est la sensation qui apprend au joueur qu'il en a
     trop demandé — et elle ne s'explique pas, elle se subit. */
  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ L'AMORTISSEMENT DE LACET (417) — « ELLE SE RETROUVE TROP SOUVENT
     PERPENDICULAIRE À LA PISTE, ON DIRAIT QUE LE CONTRÔLE SE FAIT PAR L'ARRIÈRE
     DE L'ENGIN. C'EST UN PEU EXTRÊME. »
     ──────────────────────────────────────────────────────────────────────────
     Les deux moitiés de la phrase décrivent LE MÊME défaut, et il tenait en une
     ligne : jusqu'ici le cap s'INTÉGRAIT librement et n'était retenu que par une
     BUTÉE.

         heading += yawRate · dt        puis        clamp(±SLED_STEER_MAX)

     Autrement dit, tant qu'on tient la touche, le nez tourne, tourne, tourne —
     et ne s'arrête que contre le mur. Mesuré au banc : **le cap atteignait la
     butée de 48,7° en moins d'une seconde, à toutes les vitesses, et y
     restait.** Quarante-neuf degrés en travers d'une piste, c'est exactement ce
     que Guillaume appelle « perpendiculaire », et ce n'était pas une impression.

     ⚠️ ET C'EST AUSSI CE QUI FAISAIT « CONTRÔLE PAR L'ARRIÈRE ». Un véhicule
     dont le cap s'écarte continûment de sa trajectoire est un véhicule qui
     PIVOTE SUR PLACE pendant qu'il glisse : le nez part d'un côté, la masse
     continue tout droit, et l'œil lit ça comme un train arrière qui décroche.
     Une luge qui carve fait le contraire — elle décrit un arc, et son nez reste
     à peu près tangent à cet arc.

     LA CORRECTION EST UN TERME DE RAPPEL PROPORTIONNEL AU CAP, TOUJOURS ACTIF :

         heading += (yawRate − heading · yawDamp) · dt

     C'est l'amortissement de lacet de n'importe quel véhicule réel, et il change
     la NATURE de la commande : au lieu d'une VITESSE de rotation qu'on intègre
     sans fin, la touche commande désormais un ANGLE D'ÉQUILIBRE — celui où le
     braquage et le rappel se compensent, `heading = yawRate / yawDamp`. Tenir la
     touche donne un cap stable d'une quinzaine de degrés, avec lequel on
     traverse la piste en biais ; la butée redevient ce qu'elle aurait toujours
     dû être, un garde-fou qu'on ne touche jamais en conduite normale.

     ⚠️⚠️ ET IL REMPLACE `STEER_RETURN` DU 416, IL NE S'Y AJOUTE PAS. Le 416
     avait vu la moitié du problème (« entre deux appuis, elle dérivait ») et
     ajouté un rappel qui ne s'appliquait QUE touche relâchée. C'était traiter le
     symptôme : la dérive entre deux appuis et le cap qui part en travers PENDANT
     l'appui sont le même défaut — un cap sans rappel. Un seul terme, actif tout
     le temps, fait les deux, et il fait mieux le premier.

     ⚠️ LE RAPPEL MONTE AVEC LA VITESSE (effet de girouette, conservé du 416) :
     un rappel constant donne une luge docile au pas et flottante à cinquante,
     l'inverse exact du besoin.

     ⚠️ CE QUE ÇA NE TOUCHE PAS, ET C'EST VOLONTAIRE : LE FREIN À MAIN. Il
     multiplie `yawRate` par BRAKE_TURN_MUL, donc il multiplie aussi l'angle
     d'équilibre — on passe d'une quinzaine de degrés à plus de vingt-cinq. Les
     deux régimes de conduite du 413 restent donc parfaitement distincts, et ils
     sont même PLUS lisibles qu'avant : la carre tient un cap serré, le frein à
     main met vraiment en travers. Avant, tout finissait à 48,7°. */
  const vkD = clampN(this.v / CFG.SLED_SPEED_MAX, 0, 1);
  /* ⚠️⚠️ LE FREIN À MAIN COUPE L'AMORTISSEMENT, ET SANS CETTE LIGNE LA
     CORRECTION AURAIT TUÉ LE DÉRAPAGE. Première mesure après avoir posé le
     rappel : la carre tenait 12°… et le frein à main 10°. Autrement dit, le
     geste censé mettre la luge EN TRAVERS la mettait moins en travers que la
     conduite normale — les deux régimes du 413 s'étaient effondrés l'un sur
     l'autre.

     La cause est physique et elle est intéressante : l'amortissement de lacet
     vient de l'ADHÉRENCE ARRIÈRE. C'est parce que les patins accrochent que
     l'engin se remet dans l'axe tout seul, comme une girouette. Un frein à main
     fait exactement l'inverse — il fait DÉCROCHER l'arrière. Un modèle qui
     garderait le même rappel en dérapage décrirait une luge dont le train
     arrière tiendrait pendant qu'il glisse, ce qui n'a aucun sens.

     ⚠️ ET C'EST CE QUI REND LES DEUX RÉGIMES PLUS LISIBLES QU'AVANT LE 417 :
     `yawRate` est multiplié par BRAKE_TURN_MUL et le rappel divisé par deux, le
     cap d'équilibre est donc trois à quatre fois plus ouvert. La carre tient un
     cap serré, le frein à main met vraiment en travers. Au 416, tout finissait
     indistinctement à 48,7°. */
  const yawDamp = CFG.STEER_DAMP * (1 + CFG.STEER_DAMP_V * vkD)
    * (braking && this.grounded ? CFG.BRAKE_DAMP_MUL : 1);
  this.heading += (yawRate * (1 - this.skid * 0.55) - this.heading * yawDamp) * dt;
  this.heading = clampN(this.heading, -CFG.SLED_STEER_MAX, CFG.SLED_STEER_MAX);

  /* ==================================================== 3. LA VITESSE =====
     Pesanteur le long de la pente, moins : la traînée (position d'œuf
     comprise), le frottement, le SCRUB DE CARRE (petit) et le SCRUB DE
     DÉRAPAGE (gros). ⚠️ C'est ce rapport qui fait tout : si déraper ne coûtait
     pas beaucoup plus cher que carver, personne n'apprendrait à carver. */
  const wantTuck = (Input.tucking && Input.tucking() && this.grounded) ? 1 : 0;
  this.tuck = damp(this.tuck, wantTuck, 6, dt);
  const dragK = CFG.SLED_DRAG * (1 - this.tuck * CFG.TUCK_DRAG_CUT);
  const onSnow = this.grounded ? 1 : 0;
  let acc = CFG.GRAVITY * Math.sin(pitch)
          - CFG.SLED_FRICTION
          - dragK * this.v * this.v
          - CFG.CARVE_SCRUB * Math.abs(this.edge) * this.v * onSnow
          - CFG.SKID_SCRUB * this.skid * this.v * onSnow;

  /* ══════════════════════════════════════════════════════════════════════
     LE LABOUR (414) — « une belle sensation de glisse ET DE RÉSISTANCE DU SOL ».
     ══════════════════════════════════════════════════════════════════════
     ⚠️ CE SONT LES TROIS LIGNES QUI CHANGENT LE PLUS LE RESSENTI DE TOUT LE ZIP,
     et il faut comprendre pourquoi avant d'y toucher.

     Le 413 avait bien un coût de carre (CARVE_SCRUB), mais il était LINÉAIRE en
     angle : une carre à fond coûtait exactement deux fois une demi-carre. Or ce
     n'est pas comme ça que la neige se comporte. Une carre à peine posée
     effleure ; une carre franchement couchée S'ENFONCE, et la neige qu'elle
     doit alors pousser devant elle croît beaucoup plus vite que l'angle. D'où
     le CARRÉ : la première moitié de l'engagement est presque gratuite, la
     seconde se paie très cher.

     ⚠️ ET C'EST CE QUI CRÉE ENFIN UN VRAI ARBITRAGE. Avec un coût linéaire, la
     meilleure conduite est toujours la même — on braque autant qu'il faut, le
     prix suit. Avec un coût quadratique, la trajectoire la plus COURTE cesse
     d'être la plus RAPIDE : mieux vaut deux appuis mesurés qu'un gros coup de
     carre. C'est exactement le calcul qu'on fait en descendant une piste, c'est
     ce qui rend Lonely Mountains passionnant à optimiser, et ça ne coûte qu'un
     exposant.

     Le troisième terme est la neige profonde des bords : elle freine pour de
     bon. C'est elle qui donne son prix à une sortie de trajectoire, et donc sa
     valeur à la belle. */
  const e2 = this.edge * this.edge;
  acc -= CFG.SNOW_PLOW * e2 * this.v * onSnow;                 // la carre enfonce
  acc -= CFG.SNOW_PLOW_SKID * this.skid * this.v * onSnow;     // le travers pelle
  acc -= CFG.SNOW_DEEP_DRAG * this.deep * onSnow;              // les bords ne sont pas damés

  if (braking && this.grounded) acc -= CFG.SLED_SLIDE_BRAKE;
  if (this.boost > 0) acc += CFG.BOOST_ACCEL;
  if (finishK > 0) acc -= finishK * 10;

  /* ================================= 4. LA SUSPENSION ET LE POMPAGE =======
     ⚠️ LE GESTE SIGNATURE DE STEEP, ET IL NE COÛTE QU'UN RESSORT. La surface
     monte et descend sous la luge (les bosses) ; la luge la suit avec du
     retard et de l'amortissement. Elle s'écrase dans les creux — et rend cette
     énergie en se détendant, ce qui ACCÉLÈRE VRAIMENT (PUMP_K).

     Conséquence de jeu, gratuite et juste : passer les bosses en les absorbant
     rapporte de la vitesse, les subir n'en rapporte pas. Personne n'a besoin
     qu'on le lui explique — ça se lit au compteur. */
  const bumpNow = Slope.bumpAt(this.s);
  const surfV = (bumpNow - this.lastBump) / Math.max(1e-4, dt);
  this.lastBump = bumpNow;
  if (this.grounded) {
    const springA = -CFG.SUSP_K * this.comp - CFG.SUSP_D * this.compV + surfV * CFG.SUSP_FOLLOW;
    this.compV += springA * dt;
    this.comp = clampN(this.comp + this.compV * dt, -CFG.SUSP_MAX, CFG.SUSP_MAX);
    // La détente REND de la vitesse ; l'écrasement n'en prend pas — on ne punit
    // pas le joueur pour un relief qu'il n'a pas choisi.
    if (this.compV > 0) acc += this.compV * CFG.PUMP_K;
  } else {
    this.comp = damp(this.comp, 0, 6, dt);
    this.compV = 0;
  }

  this.v += acc * dt;
  const vMax = CFG.SLED_SPEED_MAX + (this.boost > 0 ? CFG.BOOST_SPEED_BONUS : 0);
  if (this.v > vMax) this.v = damp(this.v, vMax, 3, dt);
  if (finishK <= 0 && this.v < CFG.SLED_SPEED_MIN) this.v = CFG.SLED_SPEED_MIN;
  if (this.v < 0) this.v = 0;

  /* ============================== 5. LA TRAJECTOIRE =======================
     Sur la carre, la luge va EXACTEMENT où elle pointe : pas de glissement,
     c'est la définition d'un arc propre. En dérapage, elle continue tout droit
     d'autant plus que le décrochage est franc. */
  const wantLat = Math.sin(this.heading) * this.v;
  const gripRate = CFG.LAT_GRIP * (1 - this.skid * 0.8) * (this.grounded ? 1 : 0.3);
  this.lat = damp(this.lat, wantLat, Math.max(0.4, gripRate), dt);
  this.lat += trackPull * dt;

  /* ==================================== 6. LE SAUT ET L'ATTERRISSAGE ======
     Deux façons de décoller : la touche, et le SOMMET D'UNE BOSSE pris vite —
     et la seconde compte plus, parce qu'elle fait JOUER le relief au lieu de
     le traverser. Une suspension détendue au bon moment donne un saut plus
     haut : c'est le pompage récompensé une seconde fois. */
  if (this.grounded && Input.jumpPressed()) {
    this.vy = CFG.SLED_JUMP_V * (1 + this.comp * 0.35);
    this.grounded = false;
  } else if (this.grounded && this.v > 24 && surfV < -CFG.CREST_V) {
    this.vy = Math.min(9, -surfV * 0.5);
    this.grounded = false;
  }
  if (!this.grounded) {
    this.vy -= CFG.SLED_JUMP_GRAVITY * dt;
    this.air += this.vy * dt;
    if (this.air <= 0) {
      /* ⚠️ L'ATTERRISSAGE SE RATE, et c'est ce qui donne un enjeu au saut.
         Deux fautes : retomber EN TRAVERS (le nez hors de l'axe) et retomber
         de trop haut. Un atterrissage raté ne tue pas — il DÉTRUIT LA VITESSE,
         ce qui est la punition juste et immédiatement lisible. */
      const skew = Math.abs(this.heading) / CFG.SLED_STEER_MAX;
      const hard = clampN(-this.vy / 16, 0, 1);
      this.landQuality = clampN(1 - skew * 0.75 - hard * 0.5, 0, 1);
      this.v *= 0.55 + 0.45 * this.landQuality;
      this.comp = -CFG.SUSP_MAX * (0.4 + 0.6 * hard);
      this.compV = 0;
      this.air = 0; this.vy = 0; this.grounded = true;
      if (this.onLand) this.onLand(hard > 0.45, this.landQuality);
    }
  }

  /* ==================================================== 7. AVANCEMENT =====
     `cos(heading)` : une luge en travers avance moins vite le long de la
     piste. C'est le coût géométrique du dérapage — sans lui, se mettre en
     travers serait gratuit. */
  this.s += this.v * Math.cos(this.heading) * dt;
  this.u += this.lat * dt;

  /* ===================================================== 8. LES BORDS =====
     On sort de piste un peu AVANT la barrière : sinon les sorties arrivent
     alors qu'à l'écran la luge semble encore sur le rose. */
  const halfW = Slope.widthAt(this.s) / 2 - CFG.SLED_HALF_W - CFG.FENCE_MARGIN;
  if (Math.abs(this.u) > halfW) {
    const outward = Math.sign(this.u);
    this.u = outward * halfW;
    /* ⚠️ ON NE TUE QUE LA COMPOSANTE QUI POUSSE ENCORE DEHORS. Inverser `lat`
       tout court retournait la correction du joueur contre lui à chaque
       image : plaqué contre la barrière, il ne pouvait plus revenir. */
    if (this.lat * outward > 0) this.lat *= -0.15;
    this.v = damp(this.v, this.v * 0.5, 7, dt);
    this.offTrack += dt;
    /* ⚠️ ALLONGÉ À 1,5 s AU 414, ET C'EST UNE CONSÉQUENCE DIRECTE DES
       CHECKPOINTS. Tant qu'une chute coûtait 1,6 s sur place, se vautrer contre
       la barrière au bout d'une seconde était une sanction proportionnée.
       Maintenant qu'elle renvoie en arrière, la même seconde devient très
       chère — et surtout, elle punirait deux fois : la neige profonde des bords
       (SNOW_DEEP_*) freine DÉJÀ franchement bien avant qu'on touche la
       barrière. Le joueur qui frôle est donc prévenu par la vitesse, puis
       sanctionné s'il insiste. C'est le bon ordre : on avertit, ensuite on
       punit. Toucher n'est pas tomber ; RESTER contre la barrière, si. */
    if (this.offTrack > 1.5) { this.offTrack = 0; this.bail("fence"); }
  } else {
    this.offTrack = Math.max(0, this.offTrack - dt * 2);
  }

  /* ============================== 9. LE TURBO (récompense de la CARRE) ====
     ⚠️ IL A CHANGÉ DE MAÎTRE AU 413. Au 412 il récompensait le DÉRAPAGE, ce
     qui devient une faute de conception une fois la carre inventée : on
     poussait le joueur vers le geste sale et lent. Il récompense désormais la
     CARRE PROPRE TENUE — le geste rapide, silencieux, difficile. Le dérapage
     garde ses étoiles (il est spectaculaire) mais ne rapporte plus rien : il
     coûte de la vitesse, un point c'est tout. */
  if (this.carve > 0.45) {
    this.driftCharge += dt * 1000;
  } else {
    if (this.driftCharge >= CFG.DRIFT_CHARGE_MS) {
      this.boost = CFG.BOOST_MS;
      this.boostFlash = 0;
      this.driftCharge = 0;      // sinon il repart à chaque image (48 turbos en 12 s)
      if (this.onBoost) this.onBoost();
    }
    this.driftCharge = Math.max(0, this.driftCharge - dt * 1800);
  }
  if (this.boost > 0) { this.boost -= dt * 1000; this.boostFlash += dt * 1000; }

  this.drift = damp(this.drift, this.skid, 12, dt);

  /* ========================================= 10. INCLINAISONS VISUELLES ===
     Elles ne changent RIEN à la physique — elles la MONTRENT, ce qui est
     indispensable : une limite d'adhérence qu'on ne voit pas approcher ne
     s'apprend pas. La luge se couche sur sa carre (l'angle dit donc combien on
     en demande) et se met en travers quand elle décroche. */
  const wantRoll = -this.edge * CFG.ROLL_PER_EDGE * clampN(this.v / 22, 0, 1)
                 + bank - this.skid * Math.sign(this.edge || 1) * 0.10;
  this.roll = damp(this.roll, wantRoll, 8, dt);
  this.pitchVis = damp(this.pitchVis,
    -pitch * 0.5 - this.comp * 0.09 - this.tuck * 0.12 - (this.grounded ? 0 : 0.16), 7, dt);

  if (finishK > 0 && !this.finished) this.finished = true;
};

/* LA CHUTE. Elle est CENTRALISÉE ici parce que deux sources la déclenchent —
   la barrière et le contact avec un gourmand — et qu'elles doivent produire
   exactement le même état. Deux écritures d'une même chute divergent toujours. */
Sled.prototype.bail = function (cause) {
  if (this.wipe > 0 || this.reset > 0 || !this.alive) return;   // on ne se vautre pas deux fois
  this.wipe = CFG.WIPE_MS;
  this.wipes++;
  this.cpTries++;            // échec de plus sur cette porte : voir Field.rewind
  this.cause = cause;
  this.boost = 0; this.driftCharge = 0;
  this.grounded = true; this.air = 0; this.vy = 0;
  if (this.onWipe) this.onWipe(cause);
};

/* ══════════════════════════════════════════════════════════════════════════
   LA REMISE EN PLACE AU CHECKPOINT (414, Lonely Mountains).
   ──────────────────────────────────────────────────────────────────────────
   ⚠️ C'EST LE CHANGEMENT DE DOCTRINE DU ZIP, ET IL EST DÉLIBÉRÉ. Le 413 avait
   pris la clémence de SSX 3 : on se relevait sur place, on avait perdu une
   seconde et demie, on repartait. C'est agréable, ça ne frustre personne — et
   ça ne met RIEN en jeu. Trois minutes de descente pendant lesquelles aucune
   faute ne coûte vraiment quelque chose ne produisent pas d'attention, donc
   pas de tension, donc pas d'envie de recommencer. Le jeu était joli et sans
   appétit.

   Lonely Mountains fait l'inverse et c'est ce qui rend ce jeu-là impossible à
   reposer : la faute renvoie au dernier checkpoint. Les DEUX moitiés doivent
   être vraies en même temps, et c'est tout le réglage :
     * la punition doit être RÉELLE — on refait le passage, on perd vingt
       secondes au chrono, c'est cher ;
     * la reprise doit être IMMÉDIATE et le morceau COURT — pas d'écran, pas de
       menu, pas de rechargement, et jamais plus de ~560 unités à refaire.
   Enlever l'une des deux casse la boucle : une punition sans reprise rapide
   décourage, une reprise rapide sans punition ne fait rien ressentir.

   ⚠️ ON REPART AU CENTRE DE LA PISTE ET DANS L'AXE. Reprendre avec l'angle et
   la position qu'on avait en tombant serait « fidèle » et parfaitement
   injouable : on se remettrait en travers, à l'endroit exact où l'on vient
   d'échouer. Un checkpoint est un état PROPRE, c'est sa définition.
   ══════════════════════════════════════════════════════════════════════════ */
Sled.prototype.respawn = function () {
  this.s = Math.max(0, this.cp - CFG.CP_BACK);
  this.u = 0;
  this.v = CFG.CP_SPEED;
  this.lat = 0;
  this.heading = 0;
  this.edge = 0; this.skid = 0; this.carve = 0; this.drift = 0;
  this.load = 0; this.deep = 0;
  this.air = 0; this.vy = 0; this.grounded = true;
  this.comp = 0; this.compV = 0;
  this.roll = 0; this.spin = 0; this.tuck = 0;
  this.boost = 0; this.driftCharge = 0; this.boostFlash = 0;
  this.offTrack = 0;
  this.grace = CFG.CP_GRACE_MS;
  /* ⚠️ `lastBump` DOIT ÊTRE RESYNCHRONISÉ. Il sert à calculer la vitesse de la
     surface par différence entre deux images ; après une téléportation de
     plusieurs centaines d'unités, la différence est énorme et la suspension
     interpréterait ça comme un tremplin — la luge décollerait de dix mètres à
     chaque remise en place. Le genre de bogue qu'on ne trouve qu'en jouant. */
  this.lastBump = Slope.bumpAt(this.s);
  if (this.onRespawn) this.onRespawn();
};

/* La fin définitive. ⚠️ ELLE N'A PLUS QU'UNE SEULE SOURCE DEPUIS LE 413 :
   l'abandon volontaire depuis l'écran de pause. Ni un gourmand, ni une
   barrière ne peuvent arrêter une descente. */
Sled.prototype.die = function (cause) {
  if (!this.alive) return;
  this.alive = false;
  this.cause = cause;
  this.skid = 0; this.carve = 0; this.drift = 0; this.boost = 0;
  if (this.onCrash) this.onCrash(cause);
};

/* Position monde de la luge : la surface de la piste, plus la suspension, plus
   le saut. ⚠️ UNE SEULE ÉCRITURE, lue par la caméra, le décor et les
   collisions — deux écritures divergent toujours, et on voit alors la luge
   traverser ce qu'elle touche. */
Sled.prototype.worldPos = function () {
  const p = Slope.pointAt(this.s, this.u);
  return { x: p.x, y: p.y + this.air + this.comp * 0.35, z: p.z };
};

Sled.prototype.kmh = function () {
  // km/h « de jeu » : ×2,6 place le compteur autour de 150 dans les murs, ce
  // qui se lit d'un coup d'œil. ×3,6 donnerait 200 sur une luge, ce qui ne
  // veut rien dire.
  return Math.round(this.v * 2.6);
};
