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
   ========================================================================== */

/* Types d'obstacles et parade associée. */
const OBST = {
  LOW:  "low",   // barrière basse    -> sauter
  HIGH: "high",  // poutre en hauteur -> glisser
  WALL: "wall",  // bloc plein        -> changer de voie
  GAP:  "gap",   // trou dans le sol  -> sauter (toute la largeur)
};

const Track = (function () {

  /* --- Coûts en distance des différentes parades, déduits de la physique --- */
  const JUMP_AIRTIME = (2 * CFG.JUMP_VELOCITY) / CFG.GRAVITY;   // s
  const SLIDE_TIME   = CFG.SLIDE_MS / 1000;                     // s
  const LANE_TIME    = CFG.LANE_WIDTH / CFG.LANE_CHANGE_SPEED;  // s par voie
  const MARGIN       = 5;                                       // marge de confort, en unités

  function minSpacingAfter(type) {
    // Distance parcourue à vitesse MAX pendant que la parade occupe le joueur.
    if (type === OBST.LOW || type === OBST.GAP) return JUMP_AIRTIME * CFG.SPEED_MAX + MARGIN;
    if (type === OBST.HIGH) return SLIDE_TIME * CFG.SPEED_MAX + MARGIN;
    return CFG.OBST_SPACING_MIN;
  }
  /* Espacement exigé entre deux obstacles selon le déplacement latéral imposé. */
  function spacingForLaneTravel(lanes) {
    return lanes * LANE_TIME * CFG.SPEED_MAX + MARGIN;
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
        obstacles: [],
        coins: [],
        built: false,
        group: null,
      };

      /* ------------------------------------------------------------ VIRAGE */
      const turnChance = CFG.TURN_CHANCE_START + (CFG.TURN_CHANCE_MAX - CFG.TURN_CHANCE_START) * diff;
      if (!isFirst && this.nodesSinceTurn > CFG.TURN_MIN_GAP_NODES && this.rng() < turnChance) {
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

      if (!isFirst) this.populate(node, diff);

      this.nodes.push(node);

      /* Origine et direction du tronçon suivant. */
      const f = dirForward(node.dir);
      this.nextOrigin = { x: node.ox + f.x * node.length, z: node.oz + f.z * node.length };
      this.nextDir = (node.dir + (node.turn === 0 ? 0 : node.turn) + 4) & 3;
      this.nextStartDist = dist + node.length;
      return node;
    }

    /* ------------------------------------------------ OBSTACLES ET PIÈCES */
    populate(node, diff) {
      const density = CFG.OBST_DENSITY_START + (CFG.OBST_DENSITY_MAX - CFG.OBST_DENSITY_START) * diff;

      // Fenêtre utilisable : on laisse la piste libre juste après le départ du
      // tronçon (le joueur sort peut-être d'un virage) et juste avant sa fin
      // (il doit voir le virage venir et pouvoir s'y préparer).
      let from = CFG.TURN_CLEAR_AFTER;
      let to = node.length - (node.turn !== 0 ? CFG.TURN_CLEAR_BEFORE : 10);
      if (node.startDist < CFG.OBST_START_SAFE_DIST) {
        from = Math.max(from, CFG.OBST_START_SAFE_DIST - node.startDist);
      }
      if (to - from < 12) return;

      let t = from;
      let prev = null;   // { t, type, free:[voies libres] }

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

      let lanes;
      if (type === OBST.GAP) {
        lanes = [true, true, true];
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
      // la parade est verticale. Un WALL sans voie libre serait un mur de la
      // mort — la règle 2 l'interdit, on revérifie quand même.
      if (type === OBST.WALL && free.length === 0) return null;

      /* RÈGLE 3 : si l'obstacle précédent forçait le joueur dans certaines
         voies, vérifier qu'il a la place de rejoindre une voie libre ici. */
      if (prev && free.length > 0 && prev.free && prev.free.length > 0) {
        let travel = Infinity;
        for (const a of prev.free) for (const b of free) travel = Math.min(travel, Math.abs(a - b));
        const needed = Math.max(minSpacingAfter(prev.type), spacingForLaneTravel(travel));
        if (t - prev.t < needed) return null;
      }

      return { t, type, lanes, free };
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

    blockedAt(node, t, lane) {
      for (const o of node.obstacles) {
        if (Math.abs(o.t - t) > 2.4) continue;
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

  return { TrackGen, OBST, makeRng, minSpacingAfter, spacingForLaneTravel, JUMP_AIRTIME, SLIDE_TIME, LANE_TIME };
})();

/* Export Node.js pour le script de vérification, ignoré par le navigateur. */
if (typeof module !== "undefined" && module.exports) module.exports = { Track, OBST };
