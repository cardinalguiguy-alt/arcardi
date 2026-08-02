/* =============================================================================
   rules.js — TOUTE LA SIMULATION DU LABYRINTHE. Aucun Three.js, aucun DOM.
   -----------------------------------------------------------------------------
   ⚠️ C'EST LE FICHIER LE PLUS IMPORTANT DU CHANTIER, et son intérêt n'est pas
   ce qu'il contient mais ce qu'il ne contient PAS : il ne sait pas dessiner.

   POURQUOI CE DÉCOUPAGE N'EST PAS CELUI DU DÉFI DE FUITE. Dans templerun,
   player.js/wolves.js/track.js parlent chacun un peu à world.js, et les outils
   de vérification ont dû, chacun, se reconstruire un bout de jeu — d'où le
   corollaire n°5 du zip 387 : « un contrôle qui s'écarte du moteur mesure son
   propre écart, pas le jeu ». Ici le problème est pris à la racine : TOUT ce
   qui a une conséquence est dans ce fichier, et le rendu n'est qu'un lecteur.

   La conséquence pratique est considérable : tools/simulate-maze.mjs ne
   « simule » rien, il JOUE. Il appelle Rules.step() image par image, exactement
   comme la boucle du navigateur, avec les mêmes nombres. Quand il dit qu'une
   partie sur trois se termine à court de flamme, ce n'est pas une estimation.

   ---------------------------------------------------------------------------
   LA GÉOMÉTRIE DE COLLISION, ET POURQUOI ELLE EST AUSSI CELLE DU DÉCOR
   ---------------------------------------------------------------------------
   buildBoxes() rend la liste des BOÎTES de maçonnerie. Le moteur s'en sert
   pour la collision ; world.js s'en sert pour poser les murs. Une seule
   description, deux lecteurs — c'est la règle du zip 387 appliquée d'avance,
   et c'est ce qui interdit le défaut classique du genre : un mur visible
   qu'on traverse, ou un mur invisible qui bloque.
   ========================================================================== */

const Rules = (function () {

  const N = 1, E = 2, S = 4, W = 8;

  /* -----------------------------------------------------------------------
     LES BOÎTES.
     Deux familles, et la distinction n'est pas cosmétique :
       * les POTEAUX, aux (GRID+1)² intersections. Ils existent TOUJOURS, même
         au croisement de quatre passages ouverts. C'est eux qui empêchent de
         couper un angle en diagonale, et sans eux un joueur qui longe un mur
         en biais traverse la maçonnerie à chaque virage ;
       * les PANS, un par frontière non ouverte.
     -------------------------------------------------------------------- */
  function buildBoxes(cfg, m) {
    const C = cfg.CELL, Wt = cfg.WALL, h = Wt / 2, G = m.G;
    const boxes = [];
    // Poteaux
    for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) {
      boxes.push({ x0: i * C - h, z0: j * C - h, x1: i * C + h, z1: j * C + h, kind: "post" });
    }
    // Pans verticaux (le long de Z) : frontières EST/OUEST fermées
    for (let y = 0; y < G; y++) for (let x = 0; x <= G; x++) {
      let closed;
      if (x === 0) closed = true;
      else if (x === G) closed = true;
      else closed = !m.linked(x - 1, y, E);
      if (!closed) continue;
      boxes.push({ x0: x * C - h, z0: y * C + h, x1: x * C + h, z1: (y + 1) * C - h, kind: "z" });
    }
    // Pans horizontaux (le long de X) : frontières NORD/SUD fermées
    for (let y = 0; y <= G; y++) for (let x = 0; x < G; x++) {
      let closed;
      if (y === 0) closed = true;
      else if (y === G) closed = true;
      else closed = !m.linked(x, y - 1, S);
      if (!closed) continue;
      boxes.push({ x0: x * C + h, z0: y * C - h, x1: (x + 1) * C - h, z1: y * C + h, kind: "x" });
    }
    /* LES DEUX PORTES. L'entrée et la sortie sont des trous dans le mur
       d'enceinte : on les rouvre après coup plutôt que de les traiter dans la
       boucle ci-dessus, parce qu'une exception glissée dans une boucle de
       construction est la première chose qu'on oublie en relisant. */
    const openWall = (cx, cy, side) => {
      const wantX0 = side === "s" || side === "n" ? cx * C + h : null;
      for (let i = boxes.length - 1; i >= 0; i--) {
        const b = boxes[i];
        if (b.kind !== "x") continue;
        const zEdge = side === "s" ? (cy + 1) * C : cy * C;
        if (Math.abs(b.z0 + h - zEdge) > 0.001) continue;
        if (Math.abs(b.x0 - wantX0) > 0.001) continue;
        boxes.splice(i, 1);
        return true;
      }
      return false;
    };
    openWall(m.entry.x, m.entry.y, "s");
    openWall(m.exit.x, m.exit.y, "n");

    /* ==================================================================
       LA ROTONDE (zip 396) — UN MUR ROND FAIT DE BLOCS CARRÉS.
       ------------------------------------------------------------------
       Guillaume : « je veux une salle centrale circulaire avec escaliers »,
       image de référence à l'appui.

       ⚠️ LE PROBLÈME, ET SA SEULE SOLUTION HONNÊTE. Une boîte de collision de
       ce moteur est un rectangle aligné sur les axes : on ne peut pas en faire
       un cercle. Deux fausses solutions se présentaient, et elles sont fausses
       de la même façon — dessiner un mur rond par-dessus une collision carrée,
       ou l'inverse. Dans les deux cas on obtient un mur qu'on traverse ou un
       mur invisible qui bloque, c'est-à-dire le défaut que ce fichier refuse
       depuis sa première ligne.

       La vraie solution est celle du site : on PIXÉLISE le cercle. La couronne
       est faite de petits blocs carrés posés là où la distance au centre
       dépasse le rayon — un cercle de Bresenham en maçonnerie. Le moteur et
       world.js lisent la même liste, donc le mur qu'on voit est exactement le
       mur qui arrête, escalier de pierre compris. Et c'est du pixel-art en
       volume, ce qui est la signature du projet plutôt qu'un pis-aller.

       LES PORTES sont taillées d'après les LIAISONS RÉELLES du dédale : pour
       chaque cellule du bord de la rotonde qui communique avec l'extérieur, on
       épargne le couloir correspondant. Elles ne peuvent donc pas se retrouver
       ailleurs que là où le générateur a ouvert — c'est encore la même règle :
       une seule description, plusieurs lecteurs.
       ================================================================== */
    if (m.rotunda) {
      const R = m.rotunda;
      const x0 = R.x * C, z0 = R.y * C, x1 = (R.x + R.w) * C, z1 = (R.y + R.h) * C;
      const ccx = (x0 + x1) / 2, ccz = (z0 + z1) / 2;
      const rad = (R.w * C) / 2 - Wt / 2;          // le cercle inscrit dans la salle
      const B = cfg.ROTUNDA_BLOCK;

      // 1. On RETIRE tout ce que la grille avait posé à l'intérieur du carré :
      //    poteaux et pans compris. La salle est un espace d'un seul tenant.
      for (let i = boxes.length - 1; i >= 0; i--) {
        const b = boxes[i];
        const mx = (b.x0 + b.x1) / 2, mz = (b.z0 + b.z1) / 2;
        if (mx > x0 + 0.01 && mx < x1 - 0.01 && mz > z0 + 0.01 && mz < z1 - 0.01) boxes.splice(i, 1);
      }

      // 2. Les couloirs à épargner, un par liaison réelle vers l'extérieur.
      const halls = [];
      const sides = [[0, -1, "n"], [1, 0, "e"], [0, 1, "s"], [-1, 0, "w"]];
      for (let y = R.y; y < R.y + R.h; y++) for (let x = R.x; x < R.x + R.w; x++) {
        for (const [dx2, dz2] of sides) {
          const nx = x + dx2, ny = y + dz2;
          if (nx >= R.x && nx < R.x + R.w && ny >= R.y && ny < R.y + R.h) continue;
          const dir = dz2 < 0 ? N : dz2 > 0 ? S : dx2 > 0 ? E : W;
          if (!m.linked(x, y, dir)) continue;
          const [hx, hz] = centerOf(cfg, x, y);
          halls.push({ x: hx, z: hz, ax: dx2, az: dz2 });
        }
      }
      const inHall = (px, pz) => {
        const half = (C - Wt) / 2;
        for (const h of halls) {
          if (h.ax) { if (Math.abs(pz - h.z) < half && (h.ax > 0 ? px > h.x : px < h.x)) return true; }
          else { if (Math.abs(px - h.x) < half && (h.az > 0 ? pz > h.z : pz < h.z)) return true; }
        }
        return false;
      };

      // 3. La couronne : un bloc partout où l'on sort du cercle, sauf dans un
      //    couloir. Les coins du carré se remplissent donc de maçonnerie
      //    pleine, ce qui donne son épaisseur au mur rond.
      const n = Math.round((R.w * C) / B);
      const step = (R.w * C) / n;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const bx0 = x0 + i * step, bz0 = z0 + j * step;
        const mx = bx0 + step / 2, mz = bz0 + step / 2;
        if (Math.hypot(mx - ccx, mz - ccz) < rad) continue;   // dedans : c'est la salle
        if (inHall(mx, mz)) continue;                          // c'est une porte
        boxes.push({ x0: bx0, z0: bz0, x1: bx0 + step, z1: bz0 + step, kind: "rot" });
      }
    }
    return boxes;
  }

  /* =======================================================================
     LE SOL DE LA ROTONDE — TROIS TERRASSES ET DEUX ESCALIERS (zip 396).
     -----------------------------------------------------------------------
     ⚠️ C'EST UNE FONCTION PURE, et c'est ce qui la rend acceptable ici. Elle
     ne lit aucun état, ne modifie rien, et rend une hauteur pour un point du
     monde. Le rendu s'en sert pour poser le fermier, les créatures et la
     caméra ; le moteur, lui, continue d'ignorer complètement la verticale.

     POURQUOI PAS UNE VRAIE HAUTEUR DANS LE MOTEUR. Ajouter un axe Y à la
     simulation, c'est ajouter la gravité, les sauts, les chutes de faible
     hauteur, et refaire la collision entière — pour une salle. Ici la descente
     est une DESCENTE VISIBLE, pas une contrainte de jeu : on ne peut ni tomber
     d'une terrasse, ni se coincer dessous. C'est un arbitrage, il est assumé,
     et il est écrit noir sur blanc pour que personne ne croie plus tard que
     le jeu a une troisième dimension jouable.

     La forme : trois terrasses concentriques, plus deux escaliers taillés
     nord-sud qui les traversent en marches fines. Sur les escaliers on
     descend par petites marches régulières ; ailleurs, par grands gradins —
     exactement l'amphithéâtre de l'image de référence.
     ======================================================================= */
  function groundY(cfg, m, x, z) {
    const R = m && m.rotunda;
    if (!R) return 0;
    const C = cfg.CELL;
    const ccx = (R.x + R.w / 2) * C, ccz = (R.y + R.h / 2) * C;
    const d = Math.hypot(x - ccx, z - ccz);
    const rad = (R.w * C) / 2 - cfg.WALL / 2;
    const pit = rad - cfg.ROTUNDA_RIM;          // au-delà, on est sur le pourtour plat
    if (d >= pit) return 0;
    const depth = (pit - d) / pit;               // 0 au bord du gradin, 1 au centre
    // L'ESCALIER : une bande nord-sud, marches fines et régulières.
    if (Math.abs(x - ccx) < cfg.ROTUNDA_STAIR_W / 2)
      return -Math.floor((pit - d) / cfg.ROTUNDA_STEP) * cfg.ROTUNDA_STEP_H;
    // LES GRADINS : trois marches larges.
    const ring = Math.min(cfg.ROTUNDA_RINGS - 1, Math.floor(depth * cfg.ROTUNDA_RINGS));
    return -(ring + 1) * cfg.ROTUNDA_DROP;
  }

  /* -----------------------------------------------------------------------
     LA HERSE (zip 396) — la boîte qui referme la porte d'entrée.
     -----------------------------------------------------------------------
     Elle est construite ici, avec les autres murs, et pour la même raison :
     `World.buildWalls()` et le moteur lisent la MÊME description. Une herse
     dessinée d'un côté et bloquante de l'autre finirait par ne plus tomber au
     même endroit — c'est la leçon du 387, et c'est le seul défaut que ce
     découpage rend impossible.

     Elle n'est PAS dans la liste au départ : on l'y ajoute au moment où elle
     touche le sol (voir dropGate). Jusque-là, la porte est franchement
     ouverte, ce qui est tout le propos du renoncement sans coût.

     ⚠️ ELLE OCCUPE EXACTEMENT L'EMPRISE DU PAN QU'openWall A RETIRÉ, sans un
     centimètre de plus. Un barreau qui déborderait sur les cellules voisines
     bloquerait un couloir que le générateur croit ouvert, et verify-maze.mjs
     ne le verrait pas : il contrôle la grille, pas la maçonnerie.
     -------------------------------------------------------------------- */
  function gateBoxOf(cfg, m) {
    const C = cfg.CELL, h = cfg.WALL / 2;
    const zEdge = (m.entry.y + 1) * C;
    return { x0: m.entry.x * C + h, z0: zEdge - h,
             x1: (m.entry.x + 1) * C - h, z1: zEdge + h, kind: "gate" };
  }

  /* Index spatial : les boîtes rangées par cellule, pour ne tester que le
     voisinage. Sans lui, chaque image coûterait ~2 500 tests par entité, et
     l'outil de simulation (qui joue des milliers de parties) deviendrait
     inutilisable — donc, en pratique, ne serait pas lancé. Un contrôle trop
     lent est un contrôle mort. */
  function indexBoxes(cfg, m, boxes) {
    const G = m.G, C = cfg.CELL;
    const grid = new Map();
    const key = (i, j) => i * 4096 + j;
    for (const b of boxes) {
      const i0 = Math.floor(b.x0 / C), i1 = Math.floor(b.x1 / C);
      const j0 = Math.floor(b.z0 / C), j1 = Math.floor(b.z1 / C);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const k = key(i, j);
        let a = grid.get(k); if (!a) { a = []; grid.set(k, a); }
        a.push(b);
      }
    }
    return {
      near(x, z) {
        const i = Math.floor(x / C), j = Math.floor(z / C);
        const out = [];
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const a = grid.get(key(i + di, j + dj));
          if (a) for (const b of a) out.push(b);
        }
        return out;
      },
      G, C,
    };
  }

  /* Résolution cercle / boîte alignée. On repousse selon l'axe de MOINDRE
     pénétration : c'est ce qui fait glisser le long d'un mur au lieu de
     coller, et c'est indispensable ici — un joueur qui poursuit un couloir en
     appuyant vaguement en diagonale doit avancer, pas s'arrêter. */
  function pushOut(px, pz, r, boxes) {
    let x = px, z = pz;
    for (const b of boxes) {
      const cx = Math.max(b.x0, Math.min(x, b.x1));
      const cz = Math.max(b.z0, Math.min(z, b.z1));
      const dx = x - cx, dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 > r * r) continue;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * r;
        z = cz + (dz / d) * r;
      } else {
        // Centre DANS la boîte (arrive après un téléport ou un recul violent) :
        // on sort par la face la plus proche. Sans ce cas, le cercle reste
        // piégé et le joueur est immobilisé sans explication.
        const dl = Math.abs(x - b.x0), dr = Math.abs(b.x1 - x);
        const dt = Math.abs(z - b.z0), db = Math.abs(b.z1 - z);
        const mn = Math.min(dl, dr, dt, db);
        if (mn === dl) x = b.x0 - r; else if (mn === dr) x = b.x1 + r;
        else if (mn === dt) z = b.z0 - r; else z = b.z1 + r;
      }
    }
    return [x, z];
  }

  const cellOf = (cfg, x, z) => [Math.floor(x / cfg.CELL), Math.floor(z / cfg.CELL)];
  const centerOf = (cfg, cx, cy) => [cx * cfg.CELL + cfg.HALF, cy * cfg.CELL + cfg.HALF];

  /* =======================================================================
     canTouch — DEUX POINTS PEUVENT-ILS S'ATTEINDRE ?
     -----------------------------------------------------------------------
     ⚠️ FONCTION AJOUTÉE APRÈS SIMULATION, et elle corrige le pire défaut
     trouvé du chantier : TOUTES les portées du jeu étaient euclidiennes.
     L'épée traversait les murs, et une créature bloquée derrière une cloison
     comptait comme « au contact ». Dans un labyrinthe — c'est-à-dire dans un
     décor fait de cloisons — c'est une faute de fond, pas un détail : à
     4,8 unités de couloir et 6 de cellule, deux cases voisines NON reliées
     sont à moins de 6 unités l'une de l'autre, soit largement dans la portée
     d'épée (2,35 + rayon) dès qu'on s'approche du mur mitoyen.

     Le symptôme observé était d'ailleurs muet : l'oracle restait planté 300
     secondes devant un mur, à faire face à un rôdeur qu'il ne pouvait ni
     atteindre ni fuir. Aucune erreur, aucun avertissement.

     LA RÈGLE : on ne s'atteint que dans la MÊME cellule, ou dans deux
     cellules reliées par un passage ouvert. C'est grossier — deux points aux
     extrémités opposées de deux cases reliées passent le test — mais c'est
     exact là où ça compte (jamais à travers un mur) et ça coûte deux
     divisions. Un vrai lancer de rayon contre les 892 boîtes coûterait mille
     fois plus pour corriger un cas que personne ne verra.
     ======================================================================= */
  function canTouch(cfg, m, ax, az, bx, bz) {
    const [acx, acy] = cellOf(cfg, ax, az);
    const [bcx, bcy] = cellOf(cfg, bx, bz);
    if (acx === bcx && acy === bcy) return true;
    const dx = bcx - acx, dy = bcy - acy;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return false;   // ni voisines, ni diagonale
    if (acx < 0 || acy < 0 || acx >= m.G || acy >= m.G) return false;
    const d = dx === 1 ? E : dx === -1 ? W : dy === 1 ? S : N;
    return m.linked(acx, acy, d);
  }

  /* =======================================================================
     CRÉATION DE L'ÉTAT
     ======================================================================= */
  function create(cfg, m, seed) {
    const boxes = buildBoxes(cfg, m);
    const idxB = indexBoxes(cfg, m, boxes);
    const rand = (function () {
      let a = ((seed >>> 0) ^ 0x5f356495) >>> 0;
      return function () {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })();

    const [ex, ez] = centerOf(cfg, m.entry.x, m.entry.y);
    const gapSet = new Set(m.gaps.map(g => m.idx(g.x, g.y)));
    const crackMap = new Map();
    for (const c of m.cracks) crackMap.set(m.idx(c.x, c.y), { x: c.x, y: c.y, state: 0, t: 0 });

    const st = {
      cfg, m, boxes, idxB, rand,
      // Le fermier entre par le sud, tourné vers le NORD (vers la sortie) :
      // ang = 0 regarde vers -Z, et -Z est le nord de la grille.
      px: ex, pz: ez + cfg.CELL * 0.35, ang: 0,
      vx: 0, vz: 0, speed: 0, turnVel: 0,
      // --- matière d'animation (lue par rig.js, jamais par une règle)
      gait: 0, gaitSpeed: 0, strafeAmt: 0, runAmt: 0, backAmt: 0,
      flame: cfg.FLAME_START,
      hearts: cfg.HEARTS,
      invulnT: 0, swingT: 0, cooldownT: 0, hasSword: false,
      hurtFlash: 0, camShake: 0,
      time: 0, score: 0, kills: 0, shardsTaken: 0, torchesUsed: 0,
      seen: new Set(), status: "play", fallT: 0, endCause: null,
      events: [],

      /* ==================================================================
         ZIP 396 — LE RENONCEMENT, ET L'HORLOGE QUI LE FERME
         ------------------------------------------------------------------
         `walked` est la distance TOTALE parcourue depuis le premier instant.
         C'est elle qui décide que la partie a commencé — décision de
         Guillaume : « le décompte part au premier pas ». Pas au chargement,
         pas à l'appui sur Entrer : au premier pas. On peut donc regarder
         autour de soi, lire le HUD, comprendre où l'on est, sans que le
         couperet tombe pendant qu'on lit.

         `abandonT` vaut -1 tant que l'horloge n'a pas démarré, puis décroît
         de ABANDON_MS jusqu'à zéro. Un seul nombre porte donc les trois
         états (pas commencé / en cours / fini), ce qui évite le drapeau
         redondant qui finit toujours par se désaccorder de la valeur. */
      walked: 0, abandonT: -1,
      gate: { state: 0, t: 0 },   // 0 = ouverte, 1 = elle tombe, 2 = fermée
      gateBox: gateBoxOf(cfg, m),

      /* LES EFFETS. ⚠️ Ils vivent dans l'ÉTAT et pas dans `events`, et la
         raison est mécanique : `events` est vidé à chaque pas de simulation
         (30 Hz) alors que le rendu tourne à la cadence de l'écran (60, 144…).
         Une gerbe d'étincelles publiée par un évènement serait donc vue une
         image sur deux, ou pas du tout. Ici chaque effet porte sa propre
         durée de vie, décomptée par le moteur : le rendu n'a qu'à lire.

         Ils restent parfaitement DÉTERMINISTES — position, type, durée — donc
         les outils rejouent exactement les mêmes, et un effet ne peut pas
         faire diverger une partie de sa rediffusion. */
      fx: [],
      gaps: gapSet,
      cracks: crackMap,
      fallen: new Set(),          // dalles tombées : elles s'ajoutent à `gaps` pour tout le monde
      torches: m.torches.map(t => ({ x: t.x, y: t.y, spent: false, onPath: !!t.onPath })),
      shards: m.shards.map(s => ({ x: s.x, y: s.y, taken: false })),
      potions: m.potions.map(p => ({ x: p.x, y: p.y, taken: false })),
      sword: m.sword ? { x: m.sword.x, y: m.sword.y, taken: false } : null,
      roamers: m.roamers.map((r, i) => ({
        id: i, x: 0, z: 0, ang: 0, hp: cfg.ROAMER_HP,
        cx: r.x, cy: r.y, homeX: r.homeX, homeY: r.homeY,
        mode: "patrol", target: null, path: null, pathI: 0, gait: 0, gaitSpeed: 0,
        staggerT: 0, hitT: 0, giveUpT: 0, dead: false, deadT: 0,
        /* ZIP 396 — les deux nombres qui rendent le combat lisible.
           `hitFlash` : la créature BLANCHIT une fraction de seconde quand on
           la touche. C'est le retour le plus important du chantier — sans lui
           on frappe dans le noir sans savoir si le coup a porté, et c'est mot
           pour mot le reproche de Guillaume.
           `hpMax` : le plein, pour que la jauge sache de quoi elle est la
           fraction. Écrit ici plutôt que relu dans CFG au rendu, parce qu'une
           jauge qui divise par une constante différente de celle qui a servi
           à créer la créature ment le jour où on change ROAMER_HP. */
        hitFlash: 0, hpMax: cfg.ROAMER_HP, aimT: 0,
      })),
      stalker: null,
      stalkerAwake: false,
      /* ==================================================================
         LE PARVIS — les cellules où les rôdeurs n'entrent JAMAIS.
         ------------------------------------------------------------------
         ⚠️ AJOUTÉ APRÈS MESURE, et il corrige une faute de conception, pas un
         bug. La règle du générateur (« aucune créature avant l'épée ») porte
         sur le PLACEMENT. Elle ne dit rien de la patrouille, ni de la
         poursuite : un rôdeur posé à la profondeur 10 patrouille sur 4
         cellules, poursuit sans limite, et se retrouvait donc à la
         profondeur 4 devant un joueur désarmé. La simulation l'a montré
         crûment — des parties perdues à 23 secondes, sans épée, sans avoir
         frappé un seul coup.

         Le parvis est la MÊME garantie, mais tenue jusqu'au bout : les
         cellules à portée de l'entrée sont interdites aux rôdeurs, pour
         toujours. Elle donne au passage au joueur un endroit où souffler,
         ce qui est exactement ce qui manque à un jeu où tout poursuit.

         ⚠️ LE TRAQUEUR N'EST PAS CONCERNÉ, et c'est délibéré. S'il l'était,
         le parvis deviendrait un abri définitif où camper en attendant qu'il
         se lasse — et rien de ce qui a été écrit plus haut à son sujet
         n'aurait plus de sens. On peut souffler, jamais se cacher. */
      sanctuary: new Set(),
    };
    {
      const depth = (m.sword ? m.sword.depth : 0) + (cfg.SANCTUARY_MARGIN | 0);
      for (let y = 0; y < m.G; y++) for (let x = 0; x < m.G; x++) {
        const j = m.idx(x, y);
        if (m.dEntry[j] >= 0 && m.dEntry[j] <= depth) st.sanctuary.add(j);
      }
    }
    for (const r of st.roamers) {
      const [wx, wz] = centerOf(cfg, r.cx, r.cy);
      r.x = wx; r.z = wz;
    }
    /* LE TRAQUEUR NAÎT À LA SORTIE, et c'est délibéré : il descend vers le
       joueur, donc il se rapproche pendant que le joueur progresse. Le poser
       au hasard aurait rendu la première rencontre imprévisible, alors que
       tout l'intérêt est qu'elle soit INÉVITABLE mais tardive. */
    {
      const [sx, sz] = centerOf(cfg, m.exit.x, m.exit.y);
      st.stalker = {
        x: sx, z: sz + cfg.CELL * 0.5, ang: 0,
        mode: "idle", tx: m.exit.x, ty: m.exit.y,
        path: null, pathI: 0, repathT: 0, staggerT: 0, hitT: 0, gait: 0, gaitSpeed: 0,
        knowsT: 0, hitFlash: 0, aimT: 0,
      };
    }
    markSeen(st);
    return st;
  }

  function markSeen(st) {
    const [cx, cy] = cellOf(st.cfg, st.px, st.pz);
    const j = st.m.idx(cx, cy);
    if (cx < 0 || cy < 0 || cx >= st.m.G || cy >= st.m.G) return;
    if (!st.seen.has(j)) { st.seen.add(j); st.score += st.cfg.SCORE_PER_CELL; }
  }

  /* Ensemble des cellules INFRANCHISSABLES à cet instant : trous ouverts +
     dalles déjà tombées. Utilisé par le traqueur, les rôdeurs et les outils.
     Recalculé à la demande plutôt que maintenu : une dalle tombe une fois
     toutes les dizaines de secondes, et un ensemble maintenu à deux endroits
     est un ensemble qui finit désaccordé. */
  function blockedNow(st) {
    if (!st._blkCache || st._blkN !== st.fallen.size) {
      const s = new Set(st.gaps);
      for (const j of st.fallen) s.add(j);
      st._blkCache = s; st._blkN = st.fallen.size;
    }
    return st._blkCache;
  }

  /* Le même ensemble, PLUS le parvis : ce que voient les rôdeurs, et eux
     seuls. Mis en cache sur le même critère (le nombre de dalles tombées),
     parce qu'il est lu une fois par image et que le reconstruire coûterait
     autant que tout le reste de la boucle réunie. */
  function blockedForRoamers(st) {
    if (!st._blkRCache || st._blkRN !== st.fallen.size) {
      const s = new Set(blockedNow(st));
      for (const j of st.sanctuary) s.add(j);
      st._blkRCache = s; st._blkRN = st.fallen.size;
    }
    return st._blkRCache;
  }

  /* =======================================================================
     LA FLAMME
     ----------------------------------------------------------------------
     Une seule fonction la lit pour en tirer TOUT ce qui en dépend : portée de
     la lumière, brouillard, portée de vue des rôdeurs, capacité du traqueur à
     te repérer. Si chaque système avait sa propre lecture du seuil, ils
     auraient fini par ne plus basculer au même moment — et le joueur aurait
     vu sa lumière tomber sans que les créatures changent de comportement,
     c'est-à-dire aurait cessé de croire à la règle.
     ======================================================================= */
  function flameLevel(st) {
    const f = st.flame;
    return {
      f,
      low: f <= st.cfg.FLAME_LOW,
      ember: f <= st.cfg.FLAME_CRITICAL,
      // k va de 0 (braise) à 1 (pleine), avec une courbe : la perte est
      // ressentie tôt, ce qui pousse à chercher un brasier avant l'urgence.
      k: Math.max(0, Math.min(1, Math.pow(f, 0.7))),
    };
  }

  /* =======================================================================
     LE PAS DE SIMULATION
     ----------------------------------------------------------------------
     intent = { fwd:-1..1, strafe:-1..1, turn:-1..1, run:bool, attack:bool, use:bool }
     dt en SECONDES, borné par l'appelant.
     ======================================================================= */
  function step(st, dt, intent) {
    const cfg = st.cfg;
    st.events.length = 0;
    if (st.status !== "play") {
      if (st.status === "falling") {
        st.fallT += dt;
        if (st.fallT * 1000 >= cfg.FALL_MS) { st.status = "dead"; st.endCause = "fall"; }
      }
      return st;
    }
    st.time += dt;

    /* ---- orientation ------------------------------------------------
       ⚠️ LE SIGNE EST NÉGATIF, ET C'ÉTAIT LE DÉFAUT SIGNALÉ PAR GUILLAUME
       (« tes contrôles sont inversés »). Il avait raison, et la démonstration
       tient en une ligne : le vecteur avant vaut (-sin a, -cos a), donc sa
       dérivée en a vaut (-cos a, sin a), soit (-1, 0) quand on regarde au
       nord. Faire CROÎTRE l'angle emmenait donc le regard vers -X, c'est-à-dire
       vers l'OUEST — à gauche. Flèche droite = angle qui DÉCROÎT.

       Aucun outil ne pouvait le voir : l'oracle de tools/lib-play.mjs calcule
       son intention de rotation À PARTIR de la même convention, donc il
       tournait « juste » dans un monde inversé et arrivait à destination. Un
       contrôle qui partage la convention du code qu'il vérifie ne vérifie
       rien. C'est le corollaire n°5 du zip 387 sous une forme nouvelle, et
       c'est pour ça que /tmp/turn.mjs teste désormais le RÉSULTAT (« vers où
       part le regard ? ») et non la formule.

       LE LISSAGE, lui, répond à l'autre moitié du retour (« pas très très
       fluide ») : la rotation passait de 0 à 3,4 rad/s en une image, ce qui
       donne un à-coup à chaque appui et à chaque relâchement. On monte et on
       redescend maintenant en TURN_ACCEL, ce qui coûte ~0,15 s de montée et
       rend le balayage continu. */
    const wantTurn = -(intent.turn || 0) * cfg.TURN_SPEED;
    /* On ACCÉLÈRE vite et on FREINE doucement. Le départ doit répondre au
       doigt ; la fin de course, elle, doit glisser — une rotation qui s'arrête
       net au relâchement de la touche est exactement l'à-coup que Guillaume a
       signalé au 395. On reconnaît le freinage au fait qu'on se rapproche de
       zéro. */
    const braking = Math.abs(wantTurn) < Math.abs(st.turnVel) || (wantTurn * st.turnVel) < 0;
    const dTurn = (braking ? cfg.TURN_DECEL : cfg.TURN_ACCEL) * dt;
    if (st.turnVel < wantTurn) st.turnVel = Math.min(wantTurn, st.turnVel + dTurn);
    else st.turnVel = Math.max(wantTurn, st.turnVel - dTurn);
    st.ang += st.turnVel * dt;

    /* ---- LE RECALAGE SUR LE COULOIR (zip 396) ------------------------
       Seconde moitié de la réponse à « difficile à naviguer pour un simple
       clavier ». Un dédale est à angles droits ; un doigt sur une flèche ne
       l'est pas. On lâche la touche à 8° de l'axe, on avance en biais, on
       frotte un mur, on corrige, on frotte l'autre — et c'est CE frottement,
       pas la vitesse de rotation, qui rend la conduite pénible.

       Trois conditions, et les trois comptent :
         * aucune flèche de rotation enfoncée — sinon on se battrait contre le
           joueur, ce qui est le défaut classique de ce genre d'aide ;
         * la rotation est presque arrêtée (turnVel faible) — sinon le recalage
           mangerait la fin de course glissée qu'on a ajoutée au 395 ;
         * on AVANCE. À l'arrêt, on tourne pour regarder ; recaler quelqu'un
           qui inspecte un mur serait exactement le contraire du service rendu.

       Et il ne mord que dans une fenêtre de SNAP_WINDOW autour du multiple de
       90° : viser délibérément en diagonale reste possible, ce qui compte le
       jour où une créature arrive par un angle. */
    if (!intent.turn && Math.abs(st.turnVel) < 0.35 && Math.abs(intent.fwd || 0) > 0) {
      const q = Math.PI / 2;
      let d = Math.round(st.ang / q) * q - st.ang;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) < cfg.SNAP_WINDOW) {
        const s = Math.sign(d) * Math.min(Math.abs(d), cfg.SNAP_SPEED * dt);
        st.ang += s;
      }
    }

    // ---- déplacement voulu
    const running = !!intent.run && (intent.fwd || 0) > 0;
    const fwdSpeed = (intent.fwd || 0) > 0
      ? (running ? cfg.RUN_SPEED : cfg.WALK_SPEED)
      : cfg.BACK_SPEED;
    const sin = Math.sin(st.ang), cos = Math.cos(st.ang);
    // ang = 0 → on regarde vers -Z.
    let wx = (-sin) * (intent.fwd || 0) * fwdSpeed + (cos) * (intent.strafe || 0) * cfg.STRAFE_SPEED;
    let wz = (-cos) * (intent.fwd || 0) * fwdSpeed + (-sin) * (intent.strafe || 0) * cfg.STRAFE_SPEED;

    st.vx += (wx - st.vx) * Math.min(1, cfg.ACCEL * dt / Math.max(1, cfg.WALK_SPEED));
    st.vz += (wz - st.vz) * Math.min(1, cfg.ACCEL * dt / Math.max(1, cfg.WALK_SPEED));
    st.speed = Math.hypot(st.vx, st.vz);
    /* Trois quantités LISSÉES pour le rendu : elles disent « à quel point »
       on court, on se déporte, on recule. Lissées parce qu'une inclinaison de
       buste qui bascule d'un coup à l'appui d'une touche est un à-coup de
       plus, et qu'on en corrige justement trois dans ce zip. */
    const k4 = Math.min(1, dt * 7);
    st.runAmt += ((running ? 1 : 0) - st.runAmt) * k4;
    st.strafeAmt += ((intent.strafe || 0) - st.strafeAmt) * k4;
    st.backAmt += (((intent.fwd || 0) < 0 ? 1 : 0) - st.backAmt) * k4;

    const bx = st.px, bz = st.pz;
    st.px += st.vx * dt;
    st.pz += st.vz * dt;
    const near = st.idxB.near(st.px, st.pz);
    const [nx, nz] = pushOut(st.px, st.pz, cfg.BODY_R, near);
    st.px = nx; st.pz = nz;

    /* ======================================================================
       LA FOULÉE — avancée par la DISTANCE RÉELLEMENT PARCOURUE.
       ----------------------------------------------------------------------
       ⚠️ C'est LA ligne qui décide si le personnage marche ou s'il patine, et
       c'est la seule information d'animation que le moteur produise. Tout le
       reste (angles des cuisses, des genoux, des bras, roulis, respiration)
       s'en déduit dans rig.js.

       On mesure le déplacement APRÈS la collision : un fermier qui pousse
       contre un mur ne parcourt aucune distance, donc ses jambes s'arrêtent.
       Un cycle basé sur le temps l'aurait laissé pédaler contre la pierre —
       le défaut le plus visible du genre, et celui qu'on ne pardonne pas.

       `gait` est un nombre de FOULÉES cumulées, jamais remis à zéro : le
       rendu n'a qu'à en prendre le sinus. Il est borné modulo 1 pour ne pas
       perdre en précision au bout d'une heure de jeu. */
    const moved = Math.hypot(st.px - bx, st.pz - bz);
    st.walked += moved;
    st.gait = (st.gait + moved / cfg.STRIDE) % 1;
    // Vitesse LISSÉE : la vitesse instantanée saute au moindre frottement de
    // mur, et une amplitude de pas qui saute est pire que pas d'animation.
    st.gaitSpeed += (moved / Math.max(1e-6, dt) - st.gaitSpeed) * Math.min(1, dt * 8);

    markSeen(st);

    // ---- la porte de renoncement et sa herse
    updateGate(st, dt);
    if (st.status !== "play") return st;

    // ---- la flamme
    const drain = running ? cfg.FLAME_DRAIN_RUN : cfg.FLAME_DRAIN;
    st.flame = Math.max(0, st.flame - drain * dt);

    // ---- trous et dalles
    handleFloor(st, dt);
    if (st.status !== "play") return st;

    // ---- les effets visuels vieillissent (voir st.fx dans create())
    for (let i = st.fx.length - 1; i >= 0; i--) {
      st.fx[i].t += dt;
      if (st.fx[i].t >= st.fx[i].ttl) st.fx.splice(i, 1);
    }

    // ---- ramassages et brasiers
    handlePickups(st, intent);

    // ---- épée
    if (st.cooldownT > 0) st.cooldownT -= dt;
    if (st.swingT > 0) {
      st.swingT -= dt;
      if (st.swingT <= 0) st.swingT = 0;
    }
    if (intent.attack && st.hasSword && st.swingT <= 0 && st.cooldownT <= 0) {
      aimAssist(st);                       // zip 396 : on se tourne vers la cible
      st.swingT = cfg.SWING_MS / 1000;
      st.cooldownT = (cfg.SWING_MS + cfg.SWING_COOLDOWN_MS) / 1000;
      st.flame = Math.max(0, st.flame - cfg.FLAME_DRAIN_HIT);
      resolveSwing(st);
      st.events.push({ type: "swing" });
    }
    for (const r of st.roamers) {
      if (r.hitFlash > 0) r.hitFlash = Math.max(0, r.hitFlash - dt * 4);
      if (r.aimT > 0) r.aimT = Math.max(0, r.aimT - dt);
    }
    if (st.stalker) {
      if (st.stalker.hitFlash > 0) st.stalker.hitFlash = Math.max(0, st.stalker.hitFlash - dt * 4);
      if (st.stalker.aimT > 0) st.stalker.aimT = Math.max(0, st.stalker.aimT - dt);
    }

    // ---- créatures
    updateRoamers(st, dt);
    updateStalker(st, dt, running);

    if (st.invulnT > 0) st.invulnT -= dt;
    if (st.hurtFlash > 0) st.hurtFlash = Math.max(0, st.hurtFlash - dt * 2.5);
    if (st.camShake > 0) st.camShake = Math.max(0, st.camShake - dt * 2.2);

    /* ---- sortie -----------------------------------------------------
       ⚠️ IL SUFFIT D'ENTRER DANS LA CELLULE DE SORTIE. La première version
       exigeait en plus d'avoir dépassé le premier dixième de cette cellule
       vers le nord (`pz < exit.y·CELL + HALF·0,4`) : autrement dit, arriver
       sous le phare, se tenir au milieu de la porte, et ne rien voir se
       passer. La simulation en donnait la preuve la plus nette qu'on puisse
       avoir — l'oracle atteignait la case de sortie, s'y arrêtait, et y
       restait jusqu'à la fin du temps imparti. C'est ce que comptait 47 % de
       « blocages » : pas une panne de l'outil, une victoire refusée.

       Un joueur ne doit jamais avoir à deviner qu'il faut avancer de trois
       pas de plus. On franchit la porte, on est dehors. */
    const [cx, cy] = cellOf(cfg, st.px, st.pz);
    if (cy < 0 || (cx === st.m.exit.x && cy === st.m.exit.y)) {
      st.status = "won";
      st.endCause = "exit";
      st.score += cfg.SCORE_EXIT_BONUS;
      st.events.push({ type: "won" });
    }
    return st;
  }

  /* =======================================================================
     LA PLATEFORME DE RENONCEMENT ET LA HERSE (zip 396)
     -----------------------------------------------------------------------
     Demande de Guillaume : « au début du labyrinthe, quand on se retourne on
     doit voir une plateforme qui si on l'emprunte nous ramène directe dans le
     maze world. Comme un abandon sans coût. Mais on ne peut faire ça que dans
     les 15 premières secondes : une porte se referme après et nous force à
     avancer. »

     ⚠️ ÇA RÉPARE AUSSI UN TROU RÉEL, découvert en cherchant où poser la
     plateforme. Le générateur retire le pan sud de la cellule d'entrée pour
     faire une porte, et RIEN ne fermait derrière. Un joueur qui reculait
     sortait donc de la grille — où handleFloor ne fait rien du tout, puisqu'il
     ne traite que les cellules valides. On ne tombait pas, on ne gagnait pas,
     on ne mourait pas : on flottait au-dessus du lac, indéfiniment. Aucun des
     neuf outils ne pouvait le voir, parce que l'oracle ne recule jamais au
     premier pas — il n'a aucune raison de le faire.
     ======================================================================= */
  function onPlatform(cfg, m, x, z) {
    const C = cfg.CELL, h = cfg.WALL / 2;
    const zEdge = (m.entry.y + 1) * C;
    return x > m.entry.x * C + h && x < (m.entry.x + 1) * C - h &&
           z >= zEdge - 0.01 && z <= zEdge + cfg.PLATFORM_LEN;
  }

  function updateGate(st, dt) {
    const cfg = st.cfg, m = st.m, g = st.gate;

    /* 1. L'HORLOGE DÉMARRE AU PREMIER PAS, et pas avant. Réponse explicite de
          Guillaume. On mesure une DISTANCE et non un appui de touche : une
          touche enfoncée contre un mur ne fait pas commencer une partie. */
    if (st.abandonT < 0 && g.state === 0 && st.walked >= cfg.ABANDON_START_DIST) {
      st.abandonT = cfg.ABANDON_MS / 1000;
      st.events.push({ type: "abandonStart" });
    }
    if (st.abandonT > 0) {
      const was = st.abandonT;
      st.abandonT -= dt;
      // Un seul avertissement, au franchissement du seuil : répété à chaque
      // image, il chasserait tous les autres messages du jeu.
      if (was > cfg.GATE_WARN_MS / 1000 && st.abandonT <= cfg.GATE_WARN_MS / 1000)
        st.events.push({ type: "gateWarn" });
      if (st.abandonT <= 0) {
        st.abandonT = 0;
        g.state = 1; g.t = 0;
        st.events.push({ type: "gateFall" });
      }
    }

    /* 2. ELLE TOMBE. Purement temporel : le rendu lit g.t pour la descendre. */
    if (g.state === 1) {
      g.t += dt;
      if (g.t * 1000 >= cfg.GATE_FALL_MS) {
        g.state = 2;
        /* ⚠️ ON POUSSE LE JOUEUR À L'INTÉRIEUR PLUTÔT QUE DE L'ÉCRASER.
           Décision prise seul, et ce n'est pas du confort : sans elle il
           existe une position — pile sous la herse — où le joueur se retrouve
           coincé DANS une boîte de collision, que pushOut ne sait pas
           trancher (il n'y a pas de « dehors » le plus proche évident au
           centre d'un pan). C'est le genre de trou où une partie se fige. La
           herse ne blesse jamais : elle ferme, c'est tout. Le labyrinthe
           punit les mauvais chemins, pas le mauvais timing. */
        const b = st.gateBox;
        if (st.px > b.x0 - cfg.BODY_R && st.px < b.x1 + cfg.BODY_R &&
            st.pz > b.z0 - cfg.BODY_R && st.pz < b.z1 + cfg.BODY_R) {
          st.pz = b.z0 - cfg.BODY_R - 0.15;      // vers le nord : dans le dédale
          st.vz = 0;
        }
        /* La herse rejoint les murs, et l'index spatial est refait. Une fois
           par partie : c'est le seul endroit du moteur où la géométrie change,
           et le refaire coûte moins cher que maintenir un drapeau « active »
           sur chaque boîte, lu à chaque image par chaque créature. */
        st.boxes.push(b);
        st.idxB = indexBoxes(cfg, m, st.boxes);
        st.events.push({ type: "gateShut" });
      }
    }

    /* 3. LE RENONCEMENT. On s'en va quand on a franchi la moitié de la
          plateforme : assez loin pour que ce soit un choix, assez près pour
          qu'on n'ait pas l'impression de marcher dans le vide. */
    const zEdge = (m.entry.y + 1) * cfg.CELL;
    if (st.pz > zEdge + cfg.PLATFORM_LEN * 0.55) {
      st.status = "abandon";
      st.endCause = "abandon";
      st.events.push({ type: "abandon" });
    }
  }

  /* -----------------------------------------------------------------------
     LE SOL. Trois cas, et le troisième est la mécanique du chantier.
     -------------------------------------------------------------------- */
  function handleFloor(st, dt) {
    const cfg = st.cfg, m = st.m;
    const [cx, cy] = cellOf(cfg, st.px, st.pz);
    if (cx < 0 || cy < 0 || cx >= m.G || cy >= m.G) {
      /* Hors de la grille : la SEULE surface qui existe est la plateforme de
         renoncement. Partout ailleurs, c'est le lac — et on tombe, comme dans
         n'importe quel trou. Avant le 396 on ne tombait pas : on flottait. */
      if (!onPlatform(cfg, m, st.px, st.pz)) {
        st.status = "falling"; st.fallT = 0;
        st.events.push({ type: "fall" });
      }
      return;
    }
    const j = m.idx(cx, cy);

    // 1. trou ouvert, ou dalle déjà tombée : on tombe.
    if (st.gaps.has(j) || st.fallen.has(j)) {
      st.status = "falling"; st.fallT = 0;
      st.events.push({ type: "fall" });
      return;
    }
    // 2. dalle fêlée : elle commence à céder au premier pas, PAS avant.
    const cr = st.cracks.get(j);
    if (cr && cr.state === 0) {
      cr.state = 1; cr.t = 0;
      st.events.push({ type: "crack", x: cx, y: cy });
    }
    // 3. toutes les dalles en train de céder avancent, où que soit le joueur —
    //    y compris celle qu'il vient de quitter. C'est ce qui fait qu'on
    //    l'entend tomber DANS SON DOS, et c'est le seul moment du jeu où le
    //    joueur apprend quelque chose sans le voir.
    for (const c of st.cracks.values()) {
      if (c.state !== 1) continue;
      c.t += dt;
      if (c.t * 1000 >= cfg.CRACK_DELAY_MS) {
        c.state = 2;
        const cj = m.idx(c.x, c.y);
        st.fallen.add(cj);
        st.events.push({ type: "collapse", x: c.x, y: c.y });
        // Le joueur encore dessus tombe avec elle.
        const [pcx, pcy] = cellOf(cfg, st.px, st.pz);
        if (pcx === c.x && pcy === c.y) {
          st.status = "falling"; st.fallT = 0;
          st.events.push({ type: "fall" });
          return;
        }
      }
    }
  }

  function handlePickups(st, intent) {
    const cfg = st.cfg, m = st.m;
    const [cx, cy] = cellOf(cfg, st.px, st.pz);
    const hit = (o) => o.x === cx && o.y === cy;

    for (const s of st.shards) {
      if (s.taken || !hit(s)) continue;
      s.taken = true; st.shardsTaken++; st.score += cfg.SCORE_PER_SHARD;
      st.events.push({ type: "shard" });
    }
    for (const p of st.potions) {
      if (p.taken || !hit(p)) continue;
      if (st.hearts >= cfg.HEARTS) continue;   // pleine vie : on la laisse pour plus tard
      p.taken = true;
      st.hearts = Math.min(cfg.HEARTS, st.hearts + cfg.POTION_HEAL);
      st.events.push({ type: "potion" });
    }
    if (st.sword && !st.sword.taken && hit(st.sword)) {
      st.sword.taken = true; st.hasSword = true;
      st.events.push({ type: "sword" });
    }
    /* LE BRASIER SE PREND À LA TOUCHE, pas au passage. Deux raisons, et la
       seconde est la vraie : d'abord un rallumage automatique gaspillerait le
       brasier d'un joueur à flamme presque pleine ; ensuite, et surtout,
       APPUYER est ce qui fait du rallumage un geste. On s'arrête, on tend la
       torche, on regarde derrière soi. Un ramassage automatique n'aurait
       produit aucun de ces trois instants. */
    if (intent.use) {
      for (const t of st.torches) {
        if (t.spent) continue;
        const [tx, tz] = centerOf(cfg, t.x, t.y);
        if (Math.hypot(tx - st.px, tz - st.pz) > cfg.TORCH_USE_RANGE) continue;
        t.spent = true; st.torchesUsed++;
        st.flame = cfg.FLAME_REVIVE;
        st.events.push({ type: "revive" });
        break;
      }
    }
    void m;
  }

  /* -----------------------------------------------------------------------
     LE COUP D'ÉPÉE. Arc devant le joueur ; touche tout ce qui est dedans.
     Le traqueur est touché comme les autres MAIS n'a pas de points de vie :
     il recule. Le distinguer ici, et pas dans une branche du joueur, est ce
     qui garantit qu'on ne pourra jamais le tuer « par accident » en ajoutant
     une arme un jour.
     -------------------------------------------------------------------- */
  /* -----------------------------------------------------------------------
     L'ASSISTANCE À LA VISÉE (zip 396, choisie par Guillaume).
     -----------------------------------------------------------------------
     Au moment du coup, et à ce moment SEULEMENT, le cap pivote vers la
     créature la plus proche située dans une fenêtre de AIM_ARC autour du
     regard. Trois garde-fous, et ils font toute la différence entre une aide
     et une triche :

       1. la cible doit être ATTEIGNABLE — canTouch(), donc pas de mur entre
          les deux. On ne peut pas frapper à travers une cloison, ce qui reste
          la règle la plus importante du combat dans un décor de cloisons ;
       2. le pivotement est plafonné à AIM_MAX_TURN. L'assistance corrige une
          visée approximative ; elle ne retourne pas le personnage vers une
          créature qu'on avait décidé d'ignorer ;
       3. elle ne touche NI la portée NI les dégâts. Un coup qui rate reste un
          coup qui rate — c'est seulement la probabilité d'être bien orienté
          au moment où le doigt appuie qui change, et c'était exactement le
          problème au clavier.

     ⚠️ ELLE CHANGE st.ang, donc c'est une RÈGLE, donc elle est ici. Faite au
     rendu, elle aurait fait diverger ce qu'on voit de ce que le moteur
     calcule, et les neuf outils auraient continué de mesurer l'ancien jeu.
     -------------------------------------------------------------------- */
  function aimAssist(st) {
    const cfg = st.cfg;
    const reach = cfg.SWING_RANGE + cfg.AIM_MARGIN;
    let best = null, bestD = 1e9;
    const consider = (e, r) => {
      const dx = e.x - st.px, dz = e.z - st.pz;
      const d = Math.hypot(dx, dz);
      if (d > reach + r || d < 0.001) return;
      let a = Math.atan2(-dx, -dz) - st.ang;      // même convention que le moteur
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      if (Math.abs(a) > cfg.AIM_ARC) return;
      if (!canTouch(cfg, st.m, st.px, st.pz, e.x, e.z)) return;
      if (d < bestD) { bestD = d; best = { e, a }; }
    };
    for (const r of st.roamers) if (!r.dead) consider(r, cfg.ROAMER_BODY_R);
    if (st.stalker && st.stalkerAwake) consider(st.stalker, cfg.STALK_BODY_R);
    if (!best) return;
    st.ang += Math.sign(best.a) * Math.min(Math.abs(best.a), cfg.AIM_MAX_TURN);
    st.turnVel = 0;                 // on ne repart pas en glissade après le coup
    best.e.aimT = 0.5;              // liseré sur la cible, lu par world.js
  }

  function resolveSwing(st) {
    const cfg = st.cfg;
    const fx = -Math.sin(st.ang), fz = -Math.cos(st.ang);
    const inArc = (ox, oz, r) => {
      const dx = ox - st.px, dz = oz - st.pz;
      const d = Math.hypot(dx, dz);
      if (d > cfg.SWING_RANGE + r) return false;
      // ⚠️ Le mur d'abord, l'angle ensuite : voir canTouch().
      if (!canTouch(cfg, st.m, st.px, st.pz, ox, oz)) return false;
      if (d < 0.001) return true;
      const dot = (dx / d) * fx + (dz / d) * fz;
      return dot > Math.cos(cfg.SWING_ARC / 2);
    };
    for (const r of st.roamers) {
      if (r.dead || !inArc(r.x, r.z, cfg.ROAMER_BODY_R)) continue;
      r.hp -= cfg.SWING_DAMAGE;
      r.staggerT = cfg.ROAMER_STAGGER_MS / 1000;
      const d = Math.hypot(r.x - st.px, r.z - st.pz) || 1;
      r.x += ((r.x - st.px) / d) * cfg.SWING_KNOCKBACK;
      r.z += ((r.z - st.pz) / d) * cfg.SWING_KNOCKBACK;
      const nb = st.idxB.near(r.x, r.z);
      const [rx, rz] = pushOut(r.x, r.z, cfg.ROAMER_BODY_R, nb);
      r.x = rx; r.z = rz;
      /* ZIP 396 — LE COUP SE VOIT. Trois signaux d'un coup, et pas un de
         plus : la créature BLANCHIT (hitFlash), une gerbe part du point de
         contact (fx), et elle recule (déjà là). Un coup dans le vide ne
         produit RIEN — c'est le contraste qui informe, pas l'effet. */
      r.hitFlash = 1;
      const cx2 = (r.x + st.px) / 2, cz2 = (r.z + st.pz) / 2;
      st.fx.push({ kind: "spark", x: cx2, y: 1.7, z: cz2, t: 0, ttl: 0.45 });
      if (r.hp <= 0) {
        r.dead = true; r.deadT = 0;
        st.kills++; st.score += cfg.SCORE_PER_KILL;
        // La colonne d'aspiration et le compte de points montent d'où elle
        // tombe : le joueur n'a pas à chercher le score en haut de l'écran
        // pour savoir qu'il a gagné l'échange.
        st.fx.push({ kind: "soul", x: r.x, y: 0, z: r.z, t: 0, ttl: cfg.KILL_VANISH_MS / 1000 });
        st.fx.push({ kind: "score", x: r.x, y: 2.6, z: r.z, v: cfg.SCORE_PER_KILL, t: 0, ttl: 1.5 });
        st.events.push({ type: "kill" });
      } else st.events.push({ type: "hit" });
    }
    const s = st.stalker;
    if (s && inArc(s.x, s.z, cfg.STALK_BODY_R)) {
      s.staggerT = cfg.STALK_STAGGER_MS / 1000;
      const d = Math.hypot(s.x - st.px, s.z - st.pz) || 1;
      s.x += ((s.x - st.px) / d) * cfg.SWING_KNOCKBACK * 1.5;
      s.z += ((s.z - st.pz) / d) * cfg.SWING_KNOCKBACK * 1.5;
      const nb = st.idxB.near(s.x, s.z);
      const [sx2, sz2] = pushOut(s.x, s.z, cfg.STALK_BODY_R, nb);
      s.x = sx2; s.z = sz2;
      s.path = null;
      // Il blanchit lui aussi, et il étincelle — mais il n'a pas de jauge et
      // ne meurt pas. Le joueur doit voir qu'il a TOUCHÉ sans jamais croire
      // qu'il peut le tuer : c'est exactement l'écart qu'on veut lui faire
      // sentir entre les deux créatures.
      s.hitFlash = 1;
      st.fx.push({ kind: "spark", x: (s.x + st.px) / 2, y: 2.4, z: (s.z + st.pz) / 2, t: 0, ttl: 0.45 });
    }
  }

  /* `who` sert UNIQUEMENT au rapport de simulation, et ce n'est pas un
     luxe : « mort par créature » mélange les rôdeurs (qu'on peut tuer) et le
     traqueur (qu'on ne peut pas). Ce sont deux des trois dangers demandés par
     Guillaume, et les confondre rendait impossible de vérifier qu'ils pèsent
     tous les deux. Un contrôle qui agrège deux causes ne peut pas dire
     laquelle domine. */
  function hurt(st, dmg, fromX, fromZ, who) {
    const cfg = st.cfg;
    if (st.invulnT > 0) return false;
    st.hearts -= dmg;
    st.invulnT = cfg.HURT_INVULN_MS / 1000;
    st.hurtFlash = 1; st.camShake = cfg.CAM_SHAKE_HURT;
    const d = Math.hypot(st.px - fromX, st.pz - fromZ) || 1;
    st.px += ((st.px - fromX) / d) * cfg.HURT_KNOCKBACK;
    st.pz += ((st.pz - fromZ) / d) * cfg.HURT_KNOCKBACK;
    const nb = st.idxB.near(st.px, st.pz);
    const [hx, hz] = pushOut(st.px, st.pz, cfg.BODY_R, nb);
    st.px = hx; st.pz = hz;
    st.events.push({ type: "hurt" });
    if (st.hearts <= 0) {
      st.hearts = 0; st.status = "dead"; st.endCause = who || "creature";
      st.events.push({ type: "dead" });
    }
    return true;
  }

  /* -----------------------------------------------------------------------
     LES RÔDEURS.
     -------------------------------------------------------------------- */
  function updateRoamers(st, dt) {
    const cfg = st.cfg, m = st.m;
    const fl = flameLevel(st);
    const sight = cfg.ROAMER_SIGHT_EMBER + (cfg.ROAMER_SIGHT - cfg.ROAMER_SIGHT_EMBER) * fl.k;
    /* Les rôdeurs voient le parvis comme un mur. C'est la seule mise en œuvre
       possible qui ne demande AUCUN cas particulier ailleurs : leur recherche
       de chemin ne peut pas y entrer, donc leur locomotion non plus, donc leur
       contact non plus. Un test « suis-je dans le parvis ? » posé dans la
       boucle de déplacement aurait dû être répété dans la poursuite, dans la
       patrouille et dans le retour au secteur — trois endroits, donc un
       oubli. */
    const blk = blockedForRoamers(st);
    for (const r of st.roamers) {
      if (r.dead) { r.deadT += dt; continue; }
      if (r.hitT > 0) r.hitT -= dt;
      if (r.staggerT > 0) { r.staggerT -= dt; continue; }

      const dToPlayer = Math.hypot(st.px - r.x, st.pz - r.z);
      const [rcx, rcy] = cellOf(cfg, r.x, r.z);
      const [pcx, pcy] = cellOf(cfg, st.px, st.pz);

      if (dToPlayer <= sight) { r.mode = "chase"; r.giveUpT = cfg.ROAMER_GIVEUP_MS / 1000; }
      else if (r.mode === "chase") {
        r.giveUpT -= dt;
        if (r.giveUpT <= 0) r.mode = "home";
      }

      let tgt;
      if (r.mode === "chase") tgt = [pcx, pcy];
      else if (r.mode === "home") {
        tgt = [r.homeX, r.homeY];
        if (rcx === r.homeX && rcy === r.homeY) r.mode = "patrol";
      } else {
        // patrouille : nouvelle destination dans le rayon du secteur quand on
        // a atteint la précédente. Le tirage passe par le rng de l'ÉTAT, donc
        // une partie rejouée avec la même graine se déroule à l'identique —
        // ce qui est la condition pour qu'un outil puisse reproduire un bug.
        if (!r.target || (rcx === r.target[0] && rcy === r.target[1])) {
          const R = cfg.ROAMER_PATROL_R;
          const tx = Math.max(0, Math.min(m.G - 1, r.homeX + ((st.rand() * (2 * R + 1)) | 0) - R));
          const ty = Math.max(0, Math.min(m.G - 1, r.homeY + ((st.rand() * (2 * R + 1)) | 0) - R));
          r.target = [tx, ty];
          r.path = null;
        }
        tgt = r.target;
      }

      /* Le chemin n'est recalculé qu'à l'expiration de ROAMER_REPATH_MS, ou
         quand il est épuisé. Voir le commentaire de cette constante : c'est
         ce délai qui fait qu'une créature S'ENGAGE dans un couloir au lieu de
         corriger sa trajectoire en continu — donc qu'on puisse la semer. */
      r.repathT = (r.repathT || 0) - dt;
      const exhausted = !r.path || !r.path.length || r.pathI >= r.path.length;
      if (exhausted || r.repathT <= 0) {
        r.repathT = cfg.ROAMER_REPATH_MS / 1000;
        r.path = Maze.pathTo(m, rcx, rcy, tgt[0], tgt[1], blk) || [];
        r.pathI = 0;
      }
      const spd = r.mode === "chase" ? cfg.ROAMER_CHASE_SPEED : cfg.ROAMER_SPEED;
      stepAlong(st, r, spd, dt, cfg.ROAMER_BODY_R);

      // contact
      if (dToPlayer < cfg.BODY_R + cfg.ROAMER_BODY_R + 0.15 && r.hitT <= 0 &&
          canTouch(cfg, m, st.px, st.pz, r.x, r.z)) {
        if (hurt(st, cfg.ROAMER_HIT_DAMAGE, r.x, r.z, "roamer")) r.hitT = cfg.ROAMER_HIT_COOLDOWN_MS / 1000;
        if (st.status !== "play") return;
      }
    }
  }

  /* Avance une entité le long de son chemin de cellules. C'est la SEULE
     locomotion des créatures : elles ne se dirigent jamais « vers le joueur »
     en ligne droite, ce qui les collerait aux murs en permanence. Elles
     suivent le graphe du labyrinthe, comme le joueur doit le faire. */
  function stepAlong(st, ent, speed, dt, radius) {
    const cfg = st.cfg;
    const bx = ent.x, bz = ent.z;
    const advance = () => {
      // Même règle que pour le joueur : la foulée d'une créature avance à la
      // distance qu'elle a RÉELLEMENT parcourue, jamais au temps.
      const mv = Math.hypot(ent.x - bx, ent.z - bz);
      ent.gait = ((ent.gait || 0) + mv / (cfg.STRIDE * 0.8)) % 1;
      ent.gaitSpeed = mv / Math.max(1e-6, dt);
    };
    if (!ent.path || ent.pathI >= ent.path.length) { advance(); return; }
    const [tcx, tcy] = ent.path[ent.pathI];
    const [tx, tz] = centerOf(cfg, tcx, tcy);
    const dx = tx - ent.x, dz = tz - ent.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.35) { ent.pathI++; advance(); return; }
    /* L'ORIENTATION SE LISSE, elle aussi. Une créature qui recale son cap
       d'un coup à chaque nœud de son chemin pivote par saccades — c'est ce
       qu'on voyait, et c'est aussi laid sur un monstre que sur le joueur. */
    const want = Math.atan2(-dx, -dz);
    let diff = want - ent.ang;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    ent.ang += diff * Math.min(1, dt * 7);
    ent.x += (dx / d) * speed * dt;
    ent.z += (dz / d) * speed * dt;
    const nb = st.idxB.near(ent.x, ent.z);
    const [ex, ez] = pushOut(ent.x, ent.z, radius, nb);
    ent.x = ex; ent.z = ez;
    advance();
  }

  /* -----------------------------------------------------------------------
     LE TRAQUEUR.
     ----------------------------------------------------------------------
     Toute la mécanique tient dans knownCell() : ce qu'il CROIT savoir. Il ne
     poursuit jamais le joueur, il poursuit une hypothèse — et c'est la seule
     façon de rendre le noir utile au joueur sans rendre la créature stupide.
     -------------------------------------------------------------------- */
  function knownCell(st, running) {
    const cfg = st.cfg, m = st.m;
    const s = st.stalker;
    const fl = flameLevel(st);
    const [pcx, pcy] = cellOf(cfg, st.px, st.pz);
    const [scx, scy] = cellOf(cfg, s.x, s.z);
    const cellDist = Math.abs(pcx - scx) + Math.abs(pcy - scy);

    /* 0. LE NOIR COMPLET. Torche éteinte, il sait tout.
       ------------------------------------------------------------------
       ⚠️ CETTE BRANCHE CORRIGE UNE FAILLE DE CONCEPTION TROUVÉE PAR LA
       SIMULATION, et c'est la plus grosse du chantier. Sans elle, la vue du
       traqueur vaut STALK_SIGHT_FULL × k, et k vaut ZÉRO à flamme nulle :
       laisser sa torche s'éteindre et ne plus bouger rendait le joueur
       littéralement introuvable. La ressource la plus précieuse du jeu
       devenait quelque chose qu'on avait intérêt à gaspiller, et la
       stratégie optimale était de s'asseoir dans le noir.

       Le remède est celui que la fiction dictait depuis le début : le noir
       n'est pas une cachette, c'est CHEZ LUI. Torche morte, il ne cherche
       plus — il vient, et plus vite que le joueur ne court (voir
       STALK_SPEED_DARK). Il n'y a donc pas de minuterie arbitraire du genre
       « vous mourez 30 s après l'extinction » : la sanction est incarnée,
       et elle laisse au joueur la chance de courir vers un brasier. */
    if (st.flame <= 0) return { cell: [pcx, pcy], sure: true, dark: true };

    // 1. LA VUE. Elle dépend de la flamme, et seulement d'elle.
    const sight = cfg.STALK_SIGHT_FULL * fl.k;
    if (cellDist <= sight) return { cell: [pcx, pcy], sure: true };

    // 2. L'OUÏE. Elle dépend de ce que fait le joueur, et pas du tout de sa
    //    lumière. Rester immobile ne s'entend pas : c'est la seule façon de
    //    disparaître complètement, et elle coûte de la flamme.
    const moving = st.speed > 0.6;
    const hear = !moving ? 0 : (running ? cfg.STALK_HEAR_RUN : cfg.STALK_HEAR_WALK);
    if (cellDist <= hear) return { cell: [pcx, pcy], sure: true };

    // 3. RIEN. Il continue vers son dernier point connu ; arrivé, il erre.
    if (s.tx === scx && s.ty === scy) {
      const R = 3;
      const tx = Math.max(0, Math.min(m.G - 1, scx + ((st.rand() * (2 * R + 1)) | 0) - R));
      const ty = Math.max(0, Math.min(m.G - 1, scy + ((st.rand() * (2 * R + 1)) | 0) - R));
      return { cell: [tx, ty], sure: false };
    }
    return { cell: [s.tx, s.ty], sure: false };
  }

  function updateStalker(st, dt, running) {
    const cfg = st.cfg, m = st.m;
    const s = st.stalker;
    if (!s) return;
    if (s.hitT > 0) s.hitT -= dt;
    if (s.staggerT > 0) { s.staggerT -= dt; return; }

    // Il dort tant que le joueur n'est pas entré assez loin. Les premières
    // cellules doivent être calmes : c'est là qu'on apprend à jouer, et une
    // créature increvable dans la minute d'ouverture ferait juste quitter.
    if (!st.stalkerAwake) {
      const [pcx, pcy] = cellOf(cfg, st.px, st.pz);
      if (pcx >= 0 && pcy >= 0 && pcx < m.G && pcy < m.G &&
          m.dEntry[m.idx(pcx, pcy)] >= cfg.STALK_WAKE_DEPTH) {
        st.stalkerAwake = true;
        st.events.push({ type: "stalkerWake" });
      } else return;
    }

    s.repathT -= dt;
    const blk = blockedNow(st);
    const [scx, scy] = cellOf(cfg, s.x, s.z);
    if (s.repathT <= 0 || !s.path || s.pathI >= (s.path ? s.path.length : 0)) {
      s.repathT = cfg.STALK_REPATH_MS / 1000;
      const k = knownCell(st, running);
      s.tx = k.cell[0]; s.ty = k.cell[1];
      s.mode = k.dark ? "dark" : (k.sure ? "hunt" : "search");
      s.path = Maze.pathTo(m, scx, scy, s.tx, s.ty, blk) || [];
      s.pathI = 0;
    }
    const spd = s.mode === "dark" ? cfg.STALK_SPEED_DARK
      : s.mode === "hunt" ? cfg.STALK_SPEED : cfg.STALK_SPEED_LOST;
    stepAlong(st, s, spd, dt, cfg.STALK_BODY_R);

    const d = Math.hypot(st.px - s.x, st.pz - s.z);
    if (d < cfg.BODY_R + cfg.STALK_BODY_R + 0.2 && s.hitT <= 0 &&
        canTouch(cfg, m, st.px, st.pz, s.x, s.z)) {
      if (hurt(st, cfg.STALK_HIT_DAMAGE, s.x, s.z, "stalker")) s.hitT = cfg.STALK_HIT_COOLDOWN_MS / 1000;
    }
  }

  /* Distance au traqueur, normalisée, pour le voile d'angoisse du HUD. Sortie
     ici plutôt que dans ui.js pour la raison habituelle : une seule
     description de « à quel point c'est proche ». */
  function dread(st) {
    const s = st.stalker;
    if (!s || !st.stalkerAwake) return 0;
    const d = Math.hypot(st.px - s.x, st.pz - s.z);
    const k = 1 - Math.min(1, d / st.cfg.STALK_DREAD_RANGE);
    return k * k * st.cfg.STALK_DREAD_MAX;
  }

  return { create, step, buildBoxes, indexBoxes, gateBoxOf, onPlatform, groundY, pushOut, cellOf, centerOf, canTouch, flameLevel, blockedNow, dread, hurt, N, E, S, W };
})();

if (typeof module === "object" && module.exports) module.exports = { Rules };
