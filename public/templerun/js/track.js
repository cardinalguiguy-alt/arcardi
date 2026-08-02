/* =============================================================================
   track.js — Génération procédurale de la piste.
   -----------------------------------------------------------------------------
   MODÈLE. La piste est une suite de TRONÇONS DROITS ("nodes"), chacun orienté
   selon une des 4 directions cardinales. Un tronçon peut se terminer par un
   virage à 90°. Le joueur avance le long du tronçon courant avec un scalaire t,
   et se décale latéralement de laneOffset. Sa position monde vaut :

       pos = origine + avant * t + droite * laneOffset

   C'est tout. Pas de spline, pas de courbe : Temple Run n'en a pas besoin, et
   un modèle cardinal rend les collisions et la caméra triviales à écrire juste.

   ÉQUITÉ. C'est ici que se joue la promesse "toujours évitable". Trois règles,
   toutes dérivées de la PHYSIQUE du joueur plutôt que devinées :

     1. L'espacement minimal après un obstacle dépend du temps que coûte la
        parade. Un saut immobilise 0,71 s : à 34 u/s ça fait 24 unités pendant
        lesquelles on ne peut rien faire d'autre. Placer une poutre basse 15
        unités après un trou serait donc impossible à passer, quel que soit le
        talent du joueur. minSpacingAfter() calcule ça au lieu de l'estimer.
     2. Un mur ne bouche jamais les 3 voies.
     3. Entre deux murs, on vérifie le nombre de CHANGEMENTS DE VOIE nécessaires
        et on exige l'espace correspondant.

   Ces trois règles sont revérifiées par tools/verify-fairness.js, qui joue
   200 000 unités de piste et échoue si une seule configuration est injouable.

   ZIP 374 — DEUX CORRECTIONS D'ÉQUITÉ, toutes deux signalées en jeu :

     a. Les zones franches autour des virages étaient DEVINÉES (16 et 14
        unités). Elles sont maintenant calculées dans config.js depuis le
        temps d'aveuglement de la caméra, le temps de réaction et la durée de
        la parade la plus longue. Un obstacle « juste avant ou juste après un
        virage » était inévitable — il ne peut plus être placé là.
     b. La chaîne d'espacement s'ARRÊTAIT au bord de chaque tronçon : le
        dernier obstacle d'un tronçon et le premier du suivant ne se voyaient
        pas. Elle est désormais portée par le générateur (this.prevObst), en
        distance ABSOLUE, donc elle traverse les virages.

   ZIP 377 — BIFURCATION OFFROAD. Un troisième type de fin de tronçon apparaît
   à côté de « tout droit » et « virage » : l'EMBRANCHEMENT (node.exit). Il ne
   remplace ni l'un ni l'autre, il s'y ajoute, et il obéit à trois règles qui
   le rendent inoffensif par construction :

     * un tronçon qui porte un embranchement ne tourne jamais (exclusion
       mutuelle : une même touche ne peut pas vouloir dire deux choses) ;
     * il ouvre la même zone sans obstacle qu'un virage, donc le joueur n'a
       aucune raison de changer de voie dans la fenêtre d'armement ;
     * la branche elle-même (node.escape) vit HORS de this.nodes, ce qui
       suffit à ce que la meute — posée par locate() — ne la prenne jamais.
   ========================================================================== */

/* Types d'obstacles et parade associée. */
const OBST = {
  LOW:      "low",       // barrière basse       -> sauter
  HIGH:     "high",      // poutre en hauteur    -> glisser
  WALL:     "wall",      // bloc plein           -> changer de voie
  GAP:      "gap",       // trou pleine largeur  -> sauter
  CREVASSE: "crevasse",  // sol effondré partiel -> prendre une voie libre
};

const Track = (function () {

  /* --- Coûts en distance des différentes parades, déduits de la physique ---
     Les DURÉES vivent dans config.js (CFG.JUMP_AIRTIME_S & co) parce que les
     zones franches des virages en ont besoin elles aussi ; on ne les
     recalcule pas ici, on les relit. */
  const JUMP_AIRTIME = CFG.JUMP_AIRTIME_S;                      // s
  const SLIDE_TIME   = CFG.SLIDE_TIME_S;                        // s
  const LANE_TIME    = CFG.LANE_TIME_S;                         // s par voie
  const MARGIN       = 5;                                       // marge de confort, en unités

  function minSpacingAfter(type) {
    // Distance parcourue à vitesse MAX pendant que la parade occupe le joueur.
    if (type === OBST.LOW || type === OBST.GAP) return JUMP_AIRTIME * CFG.SPEED_MAX + MARGIN;
    if (type === OBST.HIGH) return SLIDE_TIME * CFG.SPEED_MAX + MARGIN;
    // La crevasse se contourne : le joueur n'est immobilisé que le temps du
    // changement de voie, mais il doit AVOIR FINI de traverser avant le bord
    // du trou, d'où la longueur de la crevasse ajoutée à l'espacement.
    if (type === OBST.CREVASSE) return CFG.OBST_SPACING_MIN + CFG.CREVASSE_LENGTH;
    return CFG.OBST_SPACING_MIN;
  }
  /* Espacement exigé entre deux obstacles selon le déplacement latéral imposé. */
  function spacingForLaneTravel(lanes) {
    return lanes * LANE_TIME * CFG.SPEED_MAX + MARGIN;
  }

  /* Nombre de changements de voie à prévoir entre deux obstacles, DANS LE PIRE
     CAS.

     CORRIGÉ AU ZIP 374, et c'est le défaut d'équité le plus sérieux trouvé
     cette session. L'ancienne version prenait le MINIMUM sur tous les couples
     (voie libre avant, voie libre après) : elle vérifiait donc qu'il EXISTE un
     trajet court, pas que TOUS les trajets possibles le soient. Un joueur
     laissé sur la voie 0 par une barrière qui libérait 0, 1 et 2, puis
     confronté à un obstacle ne libérant que la voie 2, se voyait accorder
     l'espace d'un trajet de zéro voie.

     Sur un mur, ça ne se voyait pas : on l'esquive à la dernière fraction de
     seconde et le pire cas coûte un trébuchement. Sur une CREVASSE, longue de
     5 unités et mortelle, ça tuait — 10 courses sur 120 dans simulate-run.js.

     La bonne question n'est pas « existe-t-il un chemin court ? » mais « le
     chemin le plus long qu'on puisse imposer au joueur tient-il dans la
     distance disponible ? ». D'où max(min(...)). */
  function worstLaneTravel(fromFree, toFree) {
    if (!fromFree || !fromFree.length || !toFree || !toFree.length) return 0;
    let worst = 0;
    for (const a of fromFree) {
      let best = Infinity;
      for (const b of toFree) best = Math.min(best, Math.abs(a - b));
      worst = Math.max(worst, best);
    }
    return worst;
  }

  const ALL_LANES = [];
  for (let i = 0; i < CFG.LANE_COUNT; i++) ALL_LANES.push(i);

  /* Voies dans lesquelles le joueur peut se trouver APRÈS avoir franchi un
     obstacle. Ce n'est PAS la liste de ses voies libres, et la confusion entre
     les deux est la seconde moitié du défaut d'équité corrigé au zip 374 :

       - un mur ou une crevasse FORCENT le joueur dans une voie libre ;
       - une barrière basse, une poutre haute ou un trou se franchissent
         VERTICALEMENT. Le joueur les passe sans bouger d'un centimètre sur le
         côté, y compris dans une voie « bloquée » — c'est même exactement ce
         que fait n'importe qui, et ce que fait l'oracle de simulate-run.js.

     Dimensionner l'espacement suivant sur `free` revenait donc à supposer un
     déport latéral que le joueur n'a aucune raison d'avoir fait. */
  function exitLanes(o) {
    if (o.type === OBST.WALL || o.type === OBST.CREVASSE) return o.free;
    return ALL_LANES;
  }

  /* ------------------------------------------------------------------ RNG --
     Générateur déterministe (mulberry32) : une graine = une piste. Permet de
     rejouer exactement la même partie pour reproduire un bug, et permet au
     script de vérification de balayer des milliers de graines. */
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class TrackGen {
    constructor(seed) {
      this.rng = makeRng(seed === undefined ? (Math.random() * 1e9) | 0 : seed);
      this.nodes = [];
      this.nextIndex = 0;
      this.nextOrigin = { x: 0, z: 0 };
      this.nextDir = 0;
      this.nextStartDist = 0;
      this.nodesSinceTurn = 99;
      this.lastTurn = 0;
      this.nextEntryTurn = 0;   // virage par lequel on ARRIVE sur le prochain tronçon
      // Zip 377 — BIFURCATION OFFROAD. Distance ABSOLUE du prochain
      // embranchement. On la porte sur le générateur, pas sur le tronçon :
      // un tronçon mesure entre 68 et 112 unités, la sortie tombe donc au
      // premier BORD de tronçon qui dépasse le seuil, et le seuil suivant
      // repart de la valeur théorique (4000, 8000, 12000…) et non du bord
      // atteint. Sans ça, l'écart réel entre deux sorties dériverait de
      // ~90 unités à chaque fois et la 10e serait à 4900 m de la 9e.
      this.nextExitThreshold = CFG.OFFROAD_EVERY;
      /* Zip 379 — FIN DE LA CHAUSSÉE DE PIERRE. Distance à laquelle se
         termine le premier tronçon qui TOURNE : c'est là que le décor de
         pierre commence à céder la place à la plateforme AA (décision
         Guillaume : « pierre jusqu'au premier virage »). Nul tant qu'aucun
         virage n'a été généré. */
      this.firstTurnEnd = null;
      // Dernier obstacle posé, en distance ABSOLUE. C'est ce qui permet à la
      // règle d'espacement de traverser les bords de tronçon (voir en-tête).
      this.prevObst = null;
      // Premier tronçon : long, droit, désert. On ne piège pas un joueur qui
      // vient à peine d'appuyer sur "jouer".
      this.pushNode(true);
      while (this.nodes.length < CFG.NODES_AHEAD) this.pushNode(false);
    }

    rand(a, b) { return a + this.rng() * (b - a); }
    randInt(a, b) { return Math.floor(this.rand(a, b + 1)); }

    /* Difficulté : 0 au départ, 1 une fois la rampe parcourue. */
    difficultyAt(dist) {
      return Math.min(1, dist / CFG.OBST_DENSITY_RAMP_DIST);
    }

    pushNode(isFirst) {
      const dist = this.nextStartDist;
      const diff = this.difficultyAt(dist);

      const node = {
        index: this.nextIndex++,
        dir: this.nextDir,
        ox: this.nextOrigin.x,
        oz: this.nextOrigin.z,
        length: isFirst ? 120 : Math.round(this.rand(CFG.NODE_LEN_MIN, CFG.NODE_LEN_MAX)),
        startDist: dist,
        turn: 0,          // 0 = tout droit, -1 = gauche, +1 = droite
        exit: 0,          // 0 = pas d'embranchement, -1 = offroad à gauche, +1 = à droite
        escape: null,     // tronçon de la branche offroad (voir makeEscape)
        entryTurn: this.nextEntryTurn,  // virage par lequel on ARRIVE ici (0 = tout droit)
        obstacles: [],
        coins: [],
        cracks: [],       // fissures PUREMENT décoratives (aucune collision)
        built: false,
        group: null,
      };

      /* ------------------------------------------- EMBRANCHEMENT OFFROAD --
         Traité AVANT le virage, et c'est l'ordre qui compte : un tronçon qui
         porte une sortie ne tourne JAMAIS. Sinon, à l'approche du coin, la
         même touche voudrait dire deux choses à la fois — « prends le virage
         obligatoire » et « quitte la course » — et l'une des deux tue quand
         l'autre sauve. Départager par un délai ou une priorité serait un
         piège ; l'exclusion mutuelle, elle, ne peut pas se tromper. */
      const isExitNode = !isFirst && dist + node.length >= this.nextExitThreshold;
      if (isExitNode) {
        node.exit = this.rng() < 0.5 ? -1 : 1;
        this.nextExitThreshold += CFG.OFFROAD_EVERY;
        node.escape = this.makeEscape(node);
      }

      /* ------------------------------------------------------------ VIRAGE */
      const turnChance = CFG.TURN_CHANCE_START + (CFG.TURN_CHANCE_MAX - CFG.TURN_CHANCE_START) * diff;
      if (!isFirst && !isExitNode && this.nodesSinceTurn > CFG.TURN_MIN_GAP_NODES && this.rng() < turnChance) {
        // On évite deux virages identiques d'affilée : ça produit des demi-tours
        // qui replient la piste sur elle-même et se voient à l'écran.
        let t = this.rng() < 0.5 ? -1 : 1;
        if (t === this.lastTurn && this.rng() < 0.75) t = -t;
        node.turn = t;
        this.lastTurn = t;
        this.nodesSinceTurn = 0;
      } else {
        this.nodesSinceTurn++;
      }

      /* --------------------------------------- DÉCOR : FIN DE LA PIERRE ---
         Zip 379. Résolu ICI, une fois pour toutes, et GELÉ SUR LE TRONÇON.
         C'est la seule façon d'être sûr que le décor ne se contredira jamais :
         un tronçon déjà construit ne se repeint pas, il ne doit donc pas
         dépendre d'une valeur qui bougera plus tard.

         La cohérence tient à deux propriétés, et il faut les deux :

           * un tronçon généré AVANT tout virage est ENTIÈREMENT dans la
             pierre — par définition, puisque la pierre va au moins jusqu'à la
             fin de ce tronçon-là. Lui donner l'infini est donc exact, pas un
             pis-aller ;
           * le plafond DECOR_STONE_MAX rend la valeur MONOTONE : une fois
             qu'un tronçon a retenu 700, aucun virage découvert plus tard ne
             peut faire redescendre ce nombre, donc aucun tronçon voisin ne
             peut se retrouver en désaccord avec lui. */
      if (node.turn !== 0 && this.firstTurnEnd === null) {
        this.firstTurnEnd = dist + node.length;
      }
      node.stoneEnd = Math.min(
        this.firstTurnEnd === null ? Infinity : this.firstTurnEnd,
        CFG.DECOR_STONE_MAX
      );

      if (!isFirst) this.populate(node, diff);
      this.decorate(node);

      this.nodes.push(node);

      /* Origine et direction du tronçon suivant. */
      const f = dirForward(node.dir);
      this.nextOrigin = { x: node.ox + f.x * node.length, z: node.oz + f.z * node.length };
      this.nextDir = (node.dir + (node.turn === 0 ? 0 : node.turn) + 4) & 3;
      this.nextStartDist = dist + node.length;
      this.nextEntryTurn = node.turn;
      return node;
    }

    /* ------------------------------------------- BRANCHE D'ÉCHAPPEMENT ---
       Le tronçon dans lequel le joueur s'engage s'il prend la sortie. C'est un
       tronçon comme les autres — même repère (origine, direction, t) — ce qui
       lui donne gratuitement la caméra, la pose du joueur et le placement du
       décor. Trois différences, toutes voulues :

         * il n'est PAS dans this.nodes. La meute est posée par locate(), qui
           balaie this.nodes : l'y ajouter ferait suivre la sortie aux loups,
           c'est-à-dire exactement le contraire de ce que le schéma demande.
           En le laissant dehors, les loups continuent tout droit SANS UNE
           LIGNE de code pour le leur dire.
         * il est vide : aucun obstacle, aucune pièce. La course est finie au
           moment du virage, le joueur n'a plus rien à jouer.
         * il ne mène nulle part : on ne construit jamais son successeur. La
           séquence de sortie s'achève par un fondu bien avant son bout (voir
           CFG.ESCAPE_TOTAL_MS et verify-offroad.js). */
    makeEscape(node) {
      const f = dirForward(node.dir);
      return {
        index: -1,                       // hors chaîne : get() ne le renverra jamais
        isEscape: true,
        dir: (node.dir + node.exit + 4) & 3,
        ox: node.ox + f.x * node.length,
        oz: node.oz + f.z * node.length,
        length: CFG.OFFROAD_BRANCH_LEN,
        startDist: node.startDist + node.length,
        turn: 0, exit: 0, escape: null, entryTurn: node.exit,
        obstacles: [], coins: [], cracks: [],
        // La branche hérite du décor du tronçon dont elle part : une sortie
        // ne peut tomber qu'à 4000 m au plus tôt, donc toujours en plein AA,
        // mais le faire dériver plutôt que de l'écrire évite d'avoir à y
        // repenser si la cadence des sorties changeait un jour.
        stoneEnd: node.stoneEnd,
        built: false, group: null,
      };
    }

    /* -------------------------------------------- FISSURES DÉCORATIVES ---
       Le « trou au milieu » de l'illustration, version inoffensive. Aucune
       collision, aucun trou réel dans le pavage : world.js pose simplement
       une entaille sombre et quelques éclats de dalle par-dessus le sol.

       C'est le « décor avant tout » demandé par Guillaume. Les crevasses
       BLOQUANTES, elles, passent par populate() comme n'importe quel autre
       obstacle, et sont rares.

       On les tient à l'écart des vrais obstacles et des bords de tronçon :
       une entaille purement cosmétique posée à côté d'une crevasse mortelle
       apprendrait au joueur que les fissures ne sont pas dangereuses, juste
       avant de le tuer avec l'une d'elles. */
    decorate(node) {
      const n = this.randInt(0, CFG.DECOR_CRACK_PER_NODE);
      for (let i = 0; i < n; i++) {
        const t = this.rand(6, Math.max(7, node.length - 6));
        let clash = false;
        for (const o of node.obstacles) {
          if (Math.abs(o.t - t) < CFG.CREVASSE_LENGTH * 2.5) { clash = true; break; }
        }
        if (clash) continue;
        node.cracks.push({
          t,
          off: this.rand(-CFG.TRACK_WIDTH * 0.36, CFG.TRACK_WIDTH * 0.36),
          len: this.rand(2.2, 5.5),
          wide: this.rand(0.35, 1.1),
          rot: this.rand(-0.5, 0.5),
        });
      }
    }

    /* ------------------------------------------------ OBSTACLES ET PIÈCES */
    populate(node, diff) {
      const density = CFG.OBST_DENSITY_START + (CFG.OBST_DENSITY_MAX - CFG.OBST_DENSITY_START) * diff;

      /* Fenêtre utilisable. Les deux bornes dépendent de la présence d'un
         virage, et SEULEMENT de ça — un tronçon qui ne sort pas d'un virage
         n'a aucune raison de gaspiller 26 unités d'entrée.

         C'est ici que se règle la demande de Guillaume : « enlève les
         obstacles qui sont direct avant ou après un virage car ils sont
         inévitables ». Les deux constantes sont dérivées de la physique dans
         config.js, pas devinées. */
      /* Zip 377 : un EMBRANCHEMENT ouvre la même zone franche qu'un virage,
         et c'est ce qui garantit qu'aucune sortie ne peut être prise par
         accident. Dans la fenêtre d'armement, la seule raison d'appuyer à
         gauche ou à droite serait d'esquiver quelque chose ; en n'y mettant
         rien à esquiver, on retire la raison plutôt que d'ajouter un garde-fou
         qui, lui, se règle et donc se dérègle. */
      let from = node.entryTurn !== 0 ? CFG.TURN_CLEAR_AFTER : CFG.ENTRY_CLEAR_STRAIGHT;
      let to = node.length - ((node.turn !== 0 || node.exit !== 0) ? CFG.TURN_CLEAR_BEFORE : CFG.END_CLEAR_STRAIGHT);
      if (node.startDist < CFG.OBST_START_SAFE_DIST) {
        from = Math.max(from, CFG.OBST_START_SAFE_DIST - node.startDist);
      }
      if (to - from < 12) return;

      /* La chaîne d'espacement continue d'un tronçon à l'autre : on repart du
         dernier obstacle posé, en distance absolue, converti dans le repère
         local de ce tronçon (donc avec un t négatif s'il est derrière). */
      let prev = this.prevObst
        ? { t: this.prevObst.abs - node.startDist, type: this.prevObst.type, free: this.prevObst.free }
        : null;
      let t = from;

      while (t < to) {
        // Emplacement candidat. On respecte d'abord l'espacement imposé par
        // l'obstacle précédent, puis on ajoute un peu d'aléa pour que le rythme
        // ne soit pas métronomique.
        if (prev) t = Math.max(t, prev.t + minSpacingAfter(prev.type));
        t += this.rand(0, 10);
        if (t >= to) break;

        if (this.rng() > density) { continue; }

        const cand = this.pickObstacle(node, t, prev, diff);
        if (!cand) { t += 6; continue; }

        node.obstacles.push(cand);
        prev = cand;
        this.prevObst = { abs: node.startDist + cand.t, type: cand.type, free: cand.free };
        t = cand.t;
      }

      this.addCoins(node, from, to);
    }

    /* Choisit un obstacle plaçable en t, compatible avec le précédent.
       Renvoie null si aucune combinaison n'est sûre — on saute l'emplacement
       plutôt que de produire quelque chose d'injuste. */
    pickObstacle(node, t, prev, diff) {
      const roll = this.rng();
      let type;
      if (roll < 0.34) type = OBST.LOW;
      else if (roll < 0.60) type = OBST.HIGH;
      else if (roll < 0.86) type = OBST.WALL;
      else type = OBST.GAP;

      // Le trou occupe toute la largeur : on le réserve à une difficulté déjà
      // installée, sinon la première minute est frustrante.
      if (type === OBST.GAP && diff < 0.25) type = OBST.LOW;

      /* CREVASSE. Tirée APRÈS coup, en remplaçant un obstacle déjà choisi,
         plutôt qu'ajoutée à la roue des types : c'est ce qui la garde rare
         sans avoir à rééquilibrer les quatre autres probabilités entre elles
         à chaque réglage de CREVASSE_CHANCE. */
      if (diff >= CFG.CREVASSE_MIN_DIFF && this.rng() < CFG.CREVASSE_CHANCE) type = OBST.CREVASSE;

      let lanes;
      if (type === OBST.GAP) {
        lanes = [true, true, true];
      } else if (type === OBST.CREVASSE) {
        // 1 ou 2 voies effondrées, jamais 3 : sinon c'est un GAP, et la parade
        // annoncée au joueur (« prends une voie libre ») deviendrait fausse.
        lanes = [false, false, false];
        if (this.rng() < 0.62) {
          lanes[this.randInt(0, 2)] = true;
        } else {
          const s = this.randInt(0, 1);
          lanes[s] = true; lanes[s + 1] = true;
        }
      } else if (type === OBST.WALL) {
        // RÈGLE 2 : jamais les 3 voies. 1 ou 2 voies bloquées.
        const n = this.rng() < 0.55 ? 1 : 2;
        lanes = [false, false, false];
        if (n === 1) {
          lanes[this.randInt(0, 2)] = true;
        } else {
          const start = this.randInt(0, 1);   // {0,1} ou {1,2}
          lanes[start] = true; lanes[start + 1] = true;
        }
      } else {
        // Barrière basse / poutre haute : sur 1 à 3 voies. Sur 3 voies, la
        // parade est le saut ou la glissade, pas le changement de voie — donc
        // c'est légitime.
        const n = this.rng() < 0.4 ? 3 : (this.rng() < 0.5 ? 1 : 2);
        lanes = [false, false, false];
        if (n === 3) lanes = [true, true, true];
        else if (n === 1) lanes[this.randInt(0, 2)] = true;
        else { const s = this.randInt(0, 1); lanes[s] = true; lanes[s + 1] = true; }
      }

      const free = [];
      for (let i = 0; i < 3; i++) if (!lanes[i]) free.push(i);
      // GAP et LOW/HIGH pleine largeur n'ont pas de voie libre : c'est normal,
      // la parade est verticale. Un WALL ou une CREVASSE sans voie libre serait
      // un mur de la mort — les règles ci-dessus l'interdisent, on revérifie.
      if ((type === OBST.WALL || type === OBST.CREVASSE) && free.length === 0) return null;

      /* RÈGLE 3 : si l'obstacle précédent forçait le joueur dans certaines
         voies, vérifier qu'il a la place de rejoindre une voie libre ici.

         Une crevasse a une LONGUEUR : le changement de voie doit être bouclé
         avant son bord d'attaque, pas avant son centre. Sans ce demi-décalage,
         on peut arriver sur le trou en plein glissement latéral. */
      /* La garde porte sur les voies de SORTIE du précédent, pas sur ses voies
         libres. Un obstacle pleine largeur (barrière basse sur les 3 voies,
         trou) a `free` vide : l'ancienne garde sautait donc tout le contrôle
         latéral juste après lui, alors que c'est précisément le cas où le
         joueur peut être n'importe où. */
      const fromLanes = prev ? exitLanes(prev) : null;
      if (prev && free.length > 0 && fromLanes && fromLanes.length > 0) {
        const travel = worstLaneTravel(fromLanes, free);
        const needed = Math.max(minSpacingAfter(prev.type), spacingForLaneTravel(travel));
        const arrival = type === OBST.CREVASSE ? t - CFG.CREVASSE_LENGTH / 2 : t;
        if (arrival - prev.t < needed) return null;
      }

      /* ZIP 381 — HABILLAGE « PLANCHE ». Un simple drapeau posé sur une
         barrière basse : world.js la rend alors en bois abîmé sur deux cales
         de pierre au lieu d'un bloc taillé. Rien d'autre ne le lit — ni la
         collision, ni l'équité, ni l'espacement.

         Il est tiré ICI, à la génération, et non à la construction du décor :
         un tronçon peut être reconstruit (retour en arrière de la caméra,
         changement de branche offroad), et un tirage fait dans buildNode
         changerait alors la matière de l'obstacle sous les yeux du joueur.
         Tout ce qui doit rester stable appartient au tronçon.

         GÉNÉRATEUR DÉDIÉ, et non `this.rng()`. C'est le point qui a demandé
         le plus d'attention de tout le zip. Un seul tirage de plus dans le
         flux commun décale TOUT ce qui vient après lui — types d'obstacles,
         voies, virages, longueurs de tronçon : la piste entière change de
         forme pour un choix de matériau. Mesuré : le tronçon d'ouverture
         passait de 544 à 562 unités et la densité de décor de 155 à 169
         objets/100 u, sans qu'une seule ligne de décor ait été touchée.

         Ce n'était pas faux (une piste vaut l'autre), c'était ILLISIBLE : les
         chiffres de smoke-render.js bougeaient sans rapport avec la cause, et
         un contrôle qu'on ne sait plus interpréter est un contrôle perdu.
         Semé sur (index du tronçon, position), le tirage est aussi stable et
         reproductible, et ne coûte rien au reste. */
      const plank = type === OBST.LOW
        && makeRng((node.index * 7717 + Math.round(t * 16) + 331) >>> 0)() < CFG.PLANK_CHANCE;
      /* ZIP 400 — le tronc mort. Même motif que la planche, et pour la même
         raison : une graine tirée de la POSITION, jamais du flux partagé.
         Le sel diffère (599 au lieu de 331) sans quoi planche et tronc
         tomberaient toujours sur les mêmes obstacles.
         Il habille soit une barrière basse PLEINE LARGEUR — trois voies, donc
         la parade est déjà le saut —, soit un bloc, qui se contourne. Sur une
         barrière partielle il mentirait : un tronc qui ne barre qu'une voie et
         qu'on peut sauter OU contourner brouille la lecture. */
      const fullWidth = lanes[0] && lanes[1] && lanes[2];
      const trunk = ((type === OBST.LOW && fullWidth && !plank) || type === OBST.WALL)
        && makeRng((node.index * 7717 + Math.round(t * 16) + 599) >>> 0)() < CFG.TRUNK_CHANCE;

      return { t, type, lanes, free, plank, trunk };
    }

    /* Pièces : chapelets posés dans une voie restée libre. Simple, lisible,
       et ça guide naturellement le joueur vers la bonne trajectoire. */
    addCoins(node, from, to) {
      let t = from + this.rand(4, 14);
      while (t < to - 6) {
        const runLen = this.randInt(CFG.COIN_RUN_MIN, CFG.COIN_RUN_MAX);
        const lane = this.randInt(0, 2);
        const arc = this.rng() < CFG.COIN_ARC_CHANCE;
        for (let i = 0; i < runLen; i++) {
          const ct = t + i * CFG.COIN_SPACING;
          if (ct > to - 2) break;
          if (this.blockedAt(node, ct, lane)) continue;
          // En arc : les pièces montent puis redescendent, ce qui récompense
          // un saut au bon moment.
          const k = runLen > 1 ? i / (runLen - 1) : 0;
          const y = arc ? CFG.COIN_HEIGHT + Math.sin(k * Math.PI) * 1.9 : CFG.COIN_HEIGHT;
          node.coins.push({ t: ct, lane, y, taken: false });
        }
        t += runLen * CFG.COIN_SPACING + this.rand(10, 28);
      }
    }

    /* Une pièce ne doit jamais appâter le joueur DANS un obstacle. La marge
       dépend de l'emprise réelle de l'obstacle le long de la piste : une
       crevasse est bien plus longue qu'une barrière, et une pièce posée sur
       son bord serait un piège pur. */
    blockedAt(node, t, lane) {
      for (const o of node.obstacles) {
        const reach = o.type === OBST.CREVASSE ? CFG.CREVASSE_LENGTH / 2 + 1.6
                    : o.type === OBST.GAP      ? CFG.GAP_LENGTH / 2 + 1.6
                    : 2.4;
        if (Math.abs(o.t - t) > reach) continue;
        if (o.lanes[lane]) return true;
      }
      return false;
    }

    /* ------------------------------------------------------------ ACCÈS --- */
    get(index) { return this.nodes[index - this.nodes[0].index] || null; }

    /* S'assure qu'il existe NODES_AHEAD tronçons devant l'index donné, et
       oublie ceux qui sont loin derrière. Renvoie les tronçons retirés pour
       que le rendu libère leur géométrie. */
    ensureAhead(currentIndex) {
      // ATTENTION : relire le dernier tronçon À CHAQUE tour. Le capturer avant
      // la boucle laisse la condition invariante et produit une boucle infinie
      // qui remplit la mémoire en quelques secondes (attrapé par
      // tools/simulate-run.js, invisible en lecture).
      while (this.nodes[this.nodes.length - 1].index - currentIndex < CFG.NODES_AHEAD) {
        this.pushNode(false);
      }
      const dropped = [];
      while (this.nodes.length && this.nodes[0].index < currentIndex - CFG.NODES_BEHIND) {
        dropped.push(this.nodes.shift());
      }
      return dropped;
    }

    /* Position monde d'un point de piste. */
    worldPos(node, t, laneOffset, y) {
      const f = dirForward(node.dir), r = dirRight(node.dir);
      return {
        x: node.ox + f.x * t + r.x * laneOffset,
        y: y || 0,
        z: node.oz + f.z * t + r.z * laneOffset,
      };
    }

    /* Distance ABSOLUE du prochain embranchement encore devant `dist`, ou
       null s'il n'est pas encore généré. Sert au compte à rebours du HUD.

       On ne renvoie PAS this.nextExitThreshold : cette valeur-là est le seuil
       théorique (4000, 8000…), pas le point de sortie réel, qui tombe au bord
       du premier tronçon qui le dépasse. Annoncer « sortie dans 40 m » alors
       qu'elle est à 130 m serait pire que ne rien annoncer. On lit donc les
       tronçons déjà générés, qui portent la vérité. */
    nextExitAt(dist) {
      for (const n of this.nodes) {
        if (n.exit === 0) continue;
        const at = n.startDist + n.length;
        if (at > dist) return at;
      }
      return null;
    }

    /* État du décor à une distance donnée (zip 379) : 0 = chaussée de pierre,
       1 = plateforme AA. Sert au RENDU GLOBAL (lampe chaude, brume), là où
       world.js utilise la valeur gelée sur chaque tronçon pour la géométrie.

       Les deux doivent donner le même résultat, et c'est le cas : `stoneEnd`
       est monotone et identique sur tous les tronçons une fois le premier
       virage passé. On lit celui du tronçon le plus avancé qu'on connaisse,
       qui est aussi le mieux informé. */
    stageAt(dist) {
      const last = this.nodes[this.nodes.length - 1];
      const end = last ? last.stoneEnd : CFG.DECOR_STONE_MAX;
      return Math.max(0, Math.min(1, (dist - end) / CFG.DECOR_BLEND_LEN));
    }

    /* Convertit une distance totale en (tronçon, t). Sert aux loups. */
    locate(dist) {
      for (const n of this.nodes) {
        if (dist >= n.startDist && dist < n.startDist + n.length) {
          return { node: n, t: dist - n.startDist };
        }
      }
      const first = this.nodes[0];
      if (dist < first.startDist) return { node: first, t: 0 };
      const lastN = this.nodes[this.nodes.length - 1];
      return { node: lastN, t: lastN.length };
    }
  }

  return { TrackGen, OBST, makeRng, minSpacingAfter, spacingForLaneTravel, worstLaneTravel, exitLanes,
           JUMP_AIRTIME, SLIDE_TIME, LANE_TIME };
})();

/* Export Node.js pour le script de vérification, ignoré par le navigateur. */
if (typeof module !== "undefined" && module.exports) module.exports = { Track, OBST };
