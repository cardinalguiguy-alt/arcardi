/* =============================================================================
   slope.js — LA PISTE. Une courbe, pas une grille.
   -----------------------------------------------------------------------------
   ⚠️ LA DIFFÉRENCE DE FOND AVEC LE DÉFI DE FUITE EST ICI, et tout le reste du
   jeu en découle. Le défi de fuite a TROIS VOIES : la position latérale du
   fermier est un entier, on saute d'une voie à l'autre, et un dérapage n'y
   voudrait rien dire. La descente a une piste CONTINUE : la position latérale
   est un nombre réel, ce qui rend possibles la corde d'un virage, le dévers,
   la glissade et le dérapage — c'est-à-dire tout ce qui fait une descente.

   TROIS FONCTIONS DE `s` (l'abscisse curviligne, en unités), et rien d'autre :

     yawAt(s)    le LACET  — de quel côté la piste tourne
     pitchAt(s)  la PENTE  — à quel point elle plonge
     bumpAt(s)   les BOSSES — le relief doux posé par-dessus

   Tout le reste (position, hauteur, normale, dévers, largeur) s'en DÉDUIT par
   intégration. C'est ce qui garantit la continuité : une piste construite par
   morceaux recollés a toujours une cassure quelque part, et une cassure à
   50 u/s se ressent comme un bug de collision.

   ⚠️ AUCUNE GRAINE, AUCUN TIRAGE AU SORT. La piste est une somme de sinus de
   longueurs d'onde premières entre elles : elle ne se répète pas à l'échelle
   d'une descente, elle est la MÊME pour tout le monde, et surtout elle est
   ENTIÈREMENT CALCULABLE À L'AVANCE — ce qui est la seule raison pour laquelle
   tools/verify-luge.mjs peut prouver qu'elle est descendable de bout en bout.
   Une piste aléatoire ne se prouve pas, elle s'échantillonne et on espère.
   ========================================================================== */

const Slope = (function () {

  /* Le LACET cumulé, en radians, à l'abscisse s. Trois sinus.
     ⚠️ IL EST BORNÉ. SLOPE_YAW_MAX n'est pas un réglage esthétique : au-delà,
     la piste tourne plus vite que la luge ne peut s'orienter à pleine vitesse,
     et le virage devient infranchissable — quelle que soit l'adresse du
     joueur. C'est la définition même d'un niveau injouable, et on la refuse
     par construction plutôt qu'en la testant après coup. */
  /* LA ZONE D'ARRIVÉE : 0 avant, 1 sur les derniers FINISH_FADE mètres.
     ⚠️ ELLE EST DÉFINIE ICI ET NON DANS LE JEU, parce qu'elle ne sert pas
     seulement à ralentir : elle REDRESSE ET APLANIT LA PISTE. La raison est
     venue du banc d'essai, qui voyait le pilote automatique mourir contre la
     barrière à 5 025 unités sur 5 200 — dans la zone d'arrivée, donc à
     l'arrêt. En roue libre, la vitesse ne produit plus de force centrifuge
     mais le dévers, lui, tire toujours vers le bas du virage : la luge
     glissait doucement dans la barrière sans que le joueur puisse rien faire.
     Une aire d'arrivée est plate et droite, dans une station de ski comme
     ici — et ça règle le problème par le décor plutôt que par une exception. */
  /* ⚠️⚠️ ZIP 424 — L'ABSCISSE DE LA LIGNE EST DÉFINIE ICI, UNE FOIS, ET LE
     RUBAN COMME LE FREINAGE LA LISENT. Elle était calculée en dur à quatre
     endroits (ici, dans critters.js, dans checkpointIn, et elle allait l'être
     une cinquième fois pour le décor). Un nombre qui décrit LE MÊME ENDROIT en
     plusieurs exemplaires finit toujours par en décrire deux — et le jour où
     `FINISH_FADE` bougera, le ruban se retrouvera à cinquante mètres de
     l'endroit où le chrono s'arrête, sans que rien ne lève d'erreur.
     C'est la règle du §7 de CLAUDE.md : DÉRIVÉ, jamais réglé. */
  function finishSAt() {
    return CFG.DESCENT_LENGTH - CFG.FINISH_FADE;
  }

  function finishKAt(s) {
    const start = finishSAt();
    if (s < start) return 0;
    return Math.min(1, (s - start) / CFG.FINISH_FADE);
  }

  function yawAt(s) {
    const A = CFG.SLOPE_YAW_AMP, W = CFG.SLOPE_YAW_WAVE;
    let y = 0;
    for (let i = 0; i < A.length; i++) y += A[i] * Math.sin((s / W[i]) * Math.PI * 2);
    y = Math.max(-CFG.SLOPE_YAW_MAX, Math.min(CFG.SLOPE_YAW_MAX, y));
    return y * (1 - finishKAt(s));      // l'arrivée est DROITE
  }

  /* La PENTE, en radians sous l'horizontale. Toujours > 0 : une descente ne
     remonte jamais. C'est une contrainte de jeu et pas de décor — la luge n'a
     pas de moteur, une contre-pente l'arrêterait pour de bon. */
  function pitchAt(s) {
    const W = CFG.SLOPE_PITCH_WAVE;
    const v = 0.55 * Math.sin((s / W[0]) * Math.PI * 2 + 1.1)
            + 0.32 * Math.sin((s / W[1]) * Math.PI * 2 + 2.7)
            + 0.13 * Math.sin((s / W[2]) * Math.PI * 2);
    const p = CFG.SLOPE_PITCH_BASE + CFG.SLOPE_PITCH_VAR * v;
    return Math.max(0.05, Math.min(CFG.SLOPE_PITCH_MAX, p));
  }

  /* Les BOSSES. Elles ne touchent à AUCUNE collision : elles soulèvent la luge
     et la caméra, rien de plus. Une bosse qui déciderait d'un contact
     rendrait les gourmands injustes — on ne voit pas le relief d'assez loin
     pour l'anticiper. */
  function bumpAt(s) {
    const W = CFG.BUMP_WAVE;
    return CFG.BUMP_AMP * (0.62 * Math.sin(s / W[0] * Math.PI * 2)
                         + 0.38 * Math.sin(s / W[1] * Math.PI * 2 + 0.9));
  }

  /* La LARGEUR respire lentement. Les rétrécissements sont les seuls endroits
     de la piste où la trajectoire est imposée, et ils tombent volontairement
     hors des virages (déphasage de 1,7) : un virage serré ET étroit serait la
     recette exacte du passage injouable. */
  function widthAt(s) {
    return CFG.SLOPE_WIDTH + CFG.SLOPE_WIDTH_VAR * Math.sin(s / 311 * Math.PI * 2 + 1.7);
  }

  /* La COURBURE : la dérivée du lacet. Elle sert au dévers et à la caméra.
     Calculée par différence finie plutôt qu'analytiquement — la borne de
     yawAt() n'est pas dérivable, et une dérivée analytique mentirait
     exactement là où la piste est le plus serrée. */
  function curveAt(s) {
    const h = 4;
    return (yawAt(s + h) - yawAt(s - h)) / (2 * h);
  }

  /* ⚠️ LA COURBURE *LISSE*, sur trente unités. C'est la deuxième chose qu'a
     trouvée tools/preview-luge.js, et elle était invisible à la lecture : le
     dévers était calculé sur `curveAt`, qui voit AUSSI la petite ondulation de
     83 unités du lacet. Résultat, le dévers basculait de +0,34 à -0,34 en
     trente unités, saturé en permanence — la piste était un ruban vrillé, et
     à l'écran ça donnait deux immenses plaques roses en travers du cadre.

     Un dévers est un profil de GRAND virage. Il doit ignorer le frétillement,
     d'où la différence finie large : les ondulations courtes s'y moyennent
     d'elles-mêmes, sans un seul filtre ni une seule constante de plus. */
  function curveSmoothAt(s) {
    const h = 30;
    return (yawAt(s + h) - yawAt(s - h)) / (2 * h);
  }

  /* Le DÉVERS. La piste s'incline dans son virage, comme une piste damée.
     C'est ce qui fait qu'un virage se creuse au lieu de se subir — et c'est
     aussi ce qui rend le dérapage lisible : les étoiles partent vers le haut
     du dévers, donc vers l'extérieur, donc dans le champ de la caméra. */
  function bankAt(s) {
    const b = curveSmoothAt(s) * CFG.SLOPE_BANK_K;
    return Math.max(-CFG.SLOPE_BANK_MAX, Math.min(CFG.SLOPE_BANK_MAX, b)) * (1 - finishKAt(s));
  }

  /* ------------------------------------------------------------------------
     LA POSITION DU CENTRE DE PISTE, par intégration à pas fixe.
     ------------------------------------------------------------------------
     ⚠️ ELLE EST MISE EN CACHE, ET IL LE FAUT. On l'interroge des centaines de
     fois par image (chaque sucette, chaque bonbon, chaque gourmand, la luge,
     la caméra) et l'intégrale coûte un pas par NODE_LEN unités depuis le
     départ : sans cache, une descente de 5 200 unités ferait 650 pas par
     appel. Le cache est un simple tableau indexé par tronçon, rempli une fois,
     jamais invalidé — la piste ne change pas.
     ------------------------------------------------------------------------ */
  const STEP = 2;                 // pas d'intégration, en unités
  const cache = [{ x: 0, y: 0, z: 0 }];   // cache[i] = position à s = i*STEP

  function centerAt(s) {
    const i = Math.max(0, Math.floor(s / STEP));
    while (cache.length <= i + 1) {
      const k = cache.length - 1;
      const sk = k * STEP;
      const p = cache[k];
      const yaw = yawAt(sk), pit = pitchAt(sk);
      const c = Math.cos(pit);
      cache.push({
        x: p.x + Math.sin(yaw) * c * STEP,
        y: p.y - Math.sin(pit) * STEP,
        z: p.z - Math.cos(yaw) * c * STEP,
      });
    }
    const a = cache[i], b = cache[i + 1];
    const t = (s - i * STEP) / STEP;
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t + bumpAt(s),
      z: a.z + (b.z - a.z) * t,
    };
  }

  /* Le REPÈRE local de la piste à l'abscisse s : avant, droite, haut.
     `right` est horizontal (pas de composante verticale) AVANT le dévers :
     c'est lui qui définit la position latérale `u`, et une piste dont l'axe
     latéral plongerait ferait dériver les collisions avec la pente. Le dévers
     n'est appliqué qu'à la HAUTEUR, dans heightAt(). */
  function frameAt(s) {
    const yaw = yawAt(s), pit = pitchAt(s);
    const c = Math.cos(pit);
    return {
      yaw, pitch: pit, bank: bankAt(s),
      fwd: { x: Math.sin(yaw) * c, y: -Math.sin(pit), z: -Math.cos(yaw) * c },
      right: { x: Math.cos(yaw), y: 0, z: Math.sin(yaw) },
    };
  }

  /* Le POINT de la piste à (s, u) : u = 0 au centre, positif à droite.
     La hauteur inclut le dévers — c'est la seule chose que la luge « sent »
     du dévers, et c'est suffisant : une luge posée sur le haut du dévers est
     plus haute, donc la caméra bascule, donc le virage se voit. */
  function pointAt(s, u) {
    const c = centerAt(s), f = frameAt(s);
    return {
      x: c.x + f.right.x * u,
      y: c.y + u * Math.sin(f.bank),
      z: c.z + f.right.z * u,
    };
  }

  /* ------------------------------------------------------------------------
     LE TERRAIN AUTOUR DE LA PISTE — et ⚠️ IL N'EST PAS BANQUÉ.
     ------------------------------------------------------------------------
     C'est la première chose qu'a montrée tools/preview-luge.js, et elle ne se
     voyait pas du tout dans le code : en posant la neige avec `pointAt`, son
     dévers s'appliquait à toute la largeur. À 34° de dévers et 100 unités de
     large, le champ de neige se soulevait de TRENTE-SEPT MÈTRES d'un côté —
     deux rampes géantes qui écrasaient le paysage et cachaient l'horizon.

     Le dévers est un profil de PISTE : il n'a de sens qu'entre les barrières.
     Au-delà, le terrain reprend ses droits, et il fait deux choses :

       * IL REMONTE en s'éloignant (RISE). La piste est creusée dans le flanc
         de la colline, comme une vraie piste damée. C'est ce qui donne au
         cadre son creux — et c'est ce qui empêche de voir « par-dessus » le
         décor jusqu'à la couture entre le sol et le ciel.
       * IL ONDULE (deux sinus croisés). Une plaine parfaitement lisse sur cent
         mètres de large est une nappe, pas un paysage.
     ------------------------------------------------------------------------ */
  function terrainAt(s, u) {
    const c = centerAt(s), f = frameAt(s);
    const half = widthAt(s) / 2;
    const d = Math.max(0, Math.abs(u) - half);      // distance depuis le bord de piste
    /* La remontée est en RACINE et non linéaire : raide tout de suite (le
       talus de la piste), douce ensuite (le flanc). Une pente linéaire donne
       un cône, une racine donne une colline. */
    const rise = 1.9 * Math.sqrt(d) + d * 0.055;
    const hills = Math.sin(s / 97 + u / 61) * 2.6 + Math.sin(s / 41 - u / 29) * 1.1;
    return {
      x: c.x + f.right.x * u,
      y: c.y - 0.35 + rise + hills * Math.min(1, d / 26),
      z: c.z + f.right.z * u,
    };
  }

  /* ------------------------------------------------------------------------
     LES TRONÇONS. Même découpage que le défi de fuite (build/drop au fil de
     l'avancée), pour la même raison : on ne garde en mémoire que ce qu'on
     voit. La différence est qu'un tronçon de descente ne contient AUCUN
     obstacle — les gourmands et les bonbons vivent dans leurs propres modules
     et ne sont pas attachés à la géométrie. C'est ce qui permet de les faire
     BOUGER sans reconstruire la piste.
     ------------------------------------------------------------------------ */
  function makeNode(i) {
    const s0 = i * CFG.NODE_LEN;
    return {
      i, s0, s1: s0 + CFG.NODE_LEN,
      width: widthAt(s0 + CFG.NODE_LEN / 2),
      stage: Math.min(5, Math.floor(s0 / CFG.STAGE_LEN)),
      group: null,        // rempli par world.js
    };
  }

  function SlopeGen() {
    this.nodes = [];
    this.first = 0;
    for (let i = 0; i < CFG.NODES_AHEAD; i++) this.nodes.push(makeNode(i));
  }

  /* Construit devant, jette derrière. Renvoie les tronçons à détruire —
     c'est world.js qui possède leurs meshes, pas nous. */
  SlopeGen.prototype.ensureAhead = function (nodeIndex) {
    const dropped = [];
    const last = this.nodes[this.nodes.length - 1].i;
    for (let i = last + 1; i <= nodeIndex + CFG.NODES_AHEAD; i++) this.nodes.push(makeNode(i));
    while (this.nodes.length && this.nodes[0].i < nodeIndex - CFG.NODES_BEHIND) {
      dropped.push(this.nodes.shift());
    }
    return dropped;
  };

  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️ LE RECUL DE LA FENÊTRE — BOGUE TROUVÉ AU RENDU, PAS À LA LECTURE (414).
     ──────────────────────────────────────────────────────────────────────────
     `ensureAhead` a une hypothèse cachée qui a été vraie pendant treize zips :
     LA LUGE N'AVANCE QUE VERS L'AVANT. Elle ne construit donc que devant le
     dernier tronçon connu, et jette tout ce qui passe derrière — définitivement,
     puisque plus rien ne redemandera jamais ces indices-là.

     Les checkpoints cassent cette hypothèse pour la première fois. Après une
     remise en place, la luge REVIENT plusieurs centaines d'unités en arrière,
     dans une zone dont les tronçons ont été jetés : `ensureAhead` ne rajoute
     rien (le dernier indice connu est déjà bien au-delà) et ne jette rien. Le
     joueur se retrouve donc à rouler DANS LE VIDE — pas de piste, pas de
     barrières, pas de décor, juste le ciel et les montagnes au loin — jusqu'à
     ce qu'il rattrape l'ancienne fenêtre.

     ⚠️ ÇA NE SE VOIT PAS EN LISANT LE CODE, et ça ne se voit pas non plus dans
     un banc d'essai sans rendu : la physique, elle, marchait parfaitement — la
     luge descendait une piste correcte, simplement invisible. Il a fallu
     RENDRE une image après une chute pour le découvrir. C'est le meilleur
     argument qu'on ait pour tools/preview-luge.js, et il vaut d'être noté.

     La correction reconstruit la fenêtre complète autour d'un indice, dans les
     deux sens. On la rend au jeu, qui possède les meshes et doit donc décider
     quoi bâtir : ce module ne connaît pas three.js et ce n'est pas à lui de
     l'apprendre.
     ══════════════════════════════════════════════════════════════════════════ */
  SlopeGen.prototype.rewind = function (nodeIndex) {
    const lo = Math.max(0, nodeIndex - CFG.NODES_BEHIND);
    const hi = nodeIndex + CFG.NODES_AHEAD;
    const dropped = [];
    // 1. On jette tout ce qui sort de la nouvelle fenêtre, des deux côtés.
    const kept = [];
    for (const n of this.nodes) {
      if (n.i < lo || n.i > hi) dropped.push(n); else kept.push(n);
    }
    // 2. On complète les trous. `kept` est trié, la piste étant construite en
    //    ordre : un simple index suffit, pas de tri.
    const have = new Set(kept.map((n) => n.i));
    const out = [];
    for (let i = lo; i <= hi; i++) {
      if (have.has(i)) out.push(kept[kept.findIndex((n) => n.i === i)]);
      else out.push(makeNode(i));
    }
    this.nodes = out;
    return dropped;
  };

  SlopeGen.prototype.stageAt = function (s) {
    return Math.min(5, Math.floor(s / CFG.STAGE_LEN));
  };

  /* La zone d'arrivée : 0 avant, monte à 1 sur les derniers FINISH_FADE. Sert
     à ralentir la luge et à ouvrir le décor sur la vallée. */
  SlopeGen.prototype.finishK = function (s) { return finishKAt(s); };
  /* L'abscisse de la LIGNE elle-même (424) : world.js y plante le ruban. */
  SlopeGen.prototype.finishS = function () { return finishSAt(); };

  /* ══════════════════════════════════════════════════════════════════════════
     LES CHECKPOINTS (414).
     ──────────────────────────────────────────────────────────────────────────
     ⚠️ ILS VIVENT DANS LA PISTE ET NON DANS LE JEU, et c'est le même choix que
     pour la zone d'arrivée : ce sont des positions sur une courbe, pas des
     événements. Trois conséquences, et les trois comptent :

       1. tools/verify-luge.mjs peut les lire sans navigateur, donc CONTRÔLER
          qu'aucun ne tombe dans un passage impossible ;
       2. world.js peut construire la porte au moment où il bâtit le tronçon,
          sans rien demander à personne ;
       3. la luge sait où revenir sans qu'aucun module ne tienne une liste — il
          n'y a qu'une seule écriture de la vérité, donc rien à désynchroniser.

     ⚠️ LE DERNIER CHECKPOINT S'ARRÊTE AVANT LA ZONE D'ARRIVÉE. Une porte posée
     dans le dégagement final renverrait le joueur DERRIÈRE la ligne alors qu'il
     a déjà fini, ce qui est le genre de bogue absurde qu'on préfère rendre
     impossible par construction plutôt que de le corriger par un cas
     particulier ailleurs. */
  /* ⚠️⚠️ ZIP 425 — L'ESPACEMENT EST DÉRIVÉ DU NOMBRE, ET PLUS L'INVERSE.
     Voir la note de CP_COUNT dans config.js : le réglage est « dix fanions »,
     et la distance entre deux portes s'en déduit. Les dix se répartissent
     régulièrement de CP_FIRST au dernier point autorisé, qui reste CP_LAST_GAP
     unités AVANT la ligne — la raison du 414 n'a pas changé : une porte posée
     dans le dégagement final renverrait un joueur DÉJÀ ARRIVÉ derrière la
     ligne. */
  function cpEvery() {
    const span = finishSAt() - CFG.CP_LAST_GAP - CFG.CP_FIRST;
    return span / Math.max(1, (CFG.CP_COUNT | 0) - 1);
  }

  function checkpointCount() {
    return Math.max(1, CFG.CP_COUNT | 0);
  }

  function checkpointAt(i) {
    return CFG.CP_FIRST + i * cpEvery();
  }

  /* L'indice du dernier checkpoint FRANCHI à l'abscisse s, ou -1 avant le
     premier. Avant le premier, la luge revient au départ — ce qui n'arrive que
     sur les 380 premières unités, soit une dizaine de secondes. */
  function checkpointIndexAt(s) {
    if (s < CFG.CP_FIRST) return -1;
    return Math.min(checkpointCount() - 1, Math.floor((s - CFG.CP_FIRST) / cpEvery()));
  }

  /* Vrai si un checkpoint tombe dans [s0, s1[ — c'est ce que buildNode
     interroge pour savoir s'il doit construire une porte. */
  function checkpointIn(s0, s1) {
    const n = checkpointCount();
    for (let i = 0; i < n; i++) {
      const cs = checkpointAt(i);
      if (cs >= s0 && cs < s1) return { i, s: cs };
    }
    return null;
  }

  return {
    SlopeGen, yawAt, pitchAt, bumpAt, widthAt, curveAt, bankAt,
    centerAt, frameAt, pointAt, terrainAt, finishKAt, finishSAt,
    checkpointCount, checkpointAt, checkpointIndexAt, checkpointIn, cpEvery,
  };
})();
