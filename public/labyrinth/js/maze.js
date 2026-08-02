/* =============================================================================
   maze.js — GÉNÉRATION DU DÉDALE. Aucune dépendance, aucun Three.js, aucun DOM.
   -----------------------------------------------------------------------------
   Ce fichier est volontairement PUR : il ne connaît ni le rendu ni le joueur.
   C'est ce qui permet à tools/verify-maze.mjs et tools/simulate-maze.mjs de le
   faire tourner des milliers de fois dans Node, avec les MÊMES fonctions que
   le jeu — et non une copie qui mesurerait son propre écart (corollaire n°5 du
   zip 387, le plus coûteux de la liste).

   ⚠️ RIEN ICI NE DOIT ÊTRE RECOPIÉ AILLEURS. Si le monde 3D a besoin de savoir
   où sont les murs, il APPELLE ce fichier. Deux descriptions d'une même chose
   finissent toujours par diverger, et un mur dessiné là où la collision n'en
   voit pas est exactement la panne qu'on ne trouve jamais.

   ===========================================================================
   LA STRUCTURE DE DONNÉES
   ---------------------------------------------------------------------------
   Une grille GRID×GRID de cellules. Chaque cellule porte un masque de 4 bits
   pour ses PASSAGES (pas ses murs — les passages, parce que c'est ce qu'on
   creuse) :

       N = 1   E = 2   S = 4   W = 8

   Deux cellules voisines partagent forcément le même état : si A a E, B a W.
   `link()` est le seul endroit qui écrit ces bits, et il écrit toujours les
   deux — un passage à sens unique est un bug qu'on ne verrait qu'en jeu.

   L'ORIGINE : cell (0,0) est au NORD-OUEST. L'entrée est au sud (rangée
   GRID-1), la sortie au nord (rangée 0). C'est le même sens que la carte du
   monde sombre, où l'on arrive par le bord sud (EVIL_SPAWN) — le joueur qui
   sort du labyrinthe repart donc dans le sens dont il est venu.

   ===========================================================================
   POURQUOI PAS UN LABYRINTHE PARFAIT
   ---------------------------------------------------------------------------
   Un labyrinthe parfait (un seul chemin entre deux points) se résout à la
   main droite, sans réfléchir, en longeant un mur. C'est la première chose
   que fait n'importe quel joueur, et ça rend TOUT le travail de génération
   inutile. On en rouvre donc une part (MAZE_BRAID) : le dédale gagne des
   boucles, la règle de la main droite ne termine plus, et surtout la FUITE
   devient possible — on peut semer une créature en tournant, ce qui est
   impossible dans un arbre où toute impasse est un piège mortel.

   Les SALLES servent la même cause pour une autre raison : dans un dédale de
   couloirs identiques, on ne se souvient de rien. Une salle est un repère,
   et un repère est ce qui transforme « je suis perdu » (frustrant) en « je
   suis déjà passé ici » (inquiétant).
   ========================================================================== */

const Maze = (function () {

  const N = 1, E = 2, S = 4, W = 8;
  const DX = { 1: 0, 2: 1, 4: 0, 8: -1 };
  const DY = { 1: -1, 2: 0, 4: 1, 8: 0 };
  const OPP = { 1: 4, 2: 8, 4: 1, 8: 2 };
  const DIRS = [N, E, S, W];

  /* Générateur pseudo-aléatoire à graine. mulberry32 : court, sans état
     caché, et surtout REPRODUCTIBLE — une graine donne toujours le même
     labyrinthe, ce qui est la condition pour qu'un outil puisse rejouer une
     partie ratée. */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function make(cfg, seed) {
    const G = cfg.GRID;
    const rand = rng(seed);
    const cells = new Uint8Array(G * G);        // masques de passages
    const idx = (x, y) => y * G + x;
    const inside = (x, y) => x >= 0 && y >= 0 && x < G && y < G;

    /* ==================================================================
       LA MAÇONNERIE DE LA ROTONDE, DÉCIDÉE AVANT TOUT CREUSEMENT (zip 396).
       ------------------------------------------------------------------
       ⚠️ CET ORDRE EST LA CORRECTION LA PLUS COÛTEUSE DU CHANTIER, et elle a
       été trouvée en MESURANT, jamais en relisant.

       Première version : on creusait le dédale, PUIS on retirait les cellules
       de la rotonde qui tombent hors de son cercle. Chaque ligne était juste.
       Le résultat ne l'était pas — un dédale creusé en profondeur est un
       ARBRE, et dans un arbre presque toute cellule est un point
       d'articulation. Retirer douze cellules d'un coup en détachait douze
       sous-arbres : sur la graine 1, la moitié du labyrinthe (140 cellules sur
       277) devenait inaccessible depuis l'entrée, et le taux de sortie tombait
       de 78 % à 25 %.

       La parade est celle qui vaut partout : on ne répare pas après, on pose
       la contrainte AVANT. Les cellules de pierre sont marquées ici ; le
       creusement, le tressage, les salles et la rotonde elle-même les évitent
       tous. La connexité ne peut donc plus se casser — elle n'a jamais eu
       l'occasion d'exister à travers eux.

       CE QUI EST DE LA PIERRE : toute cellule du carré central dont le centre
       tombe à moins de 0,30 cellule du mur rond. Les blocs de la couronne font
       ROTUNDA_BLOCK de côté, donc leur face intérieure peut mordre un
       demi-bloc en deçà du rayon nominal ; sans cette marge, le fermier (rayon
       BODY_R) est poussé dehors en permanence et s'y coince. */
    const RWc = cfg.ROTUNDA_CELLS;
    const rx0c = ((G - RWc) / 2) | 0, ry0c = ((G - RWc) / 2) | 0;
    const solid = new Uint8Array(G * G);
    {
      const radW = (RWc * cfg.CELL) / 2 - cfg.WALL / 2;
      const ccxW = (rx0c + RWc / 2) * cfg.CELL, cczW = (ry0c + RWc / 2) * cfg.CELL;
      for (let y = ry0c; y < ry0c + RWc; y++) for (let x = rx0c; x < rx0c + RWc; x++) {
        const px = (x + 0.5) * cfg.CELL, pz = (y + 0.5) * cfg.CELL;
        if (Math.hypot(px - ccxW, pz - cczW) <= radW - cfg.CELL * 0.30) continue;
        solid[idx(x, y)] = 1;
      }
    }
    const isSolid = (x, y) => solid[idx(x, y)] === 1;

    function link(x, y, d) {
      const nx = x + DX[d], ny = y + DY[d];
      if (!inside(nx, ny)) return false;
      cells[idx(x, y)] |= d;
      cells[idx(nx, ny)] |= OPP[d];
      return true;
    }
    function linked(x, y, d) { return (cells[idx(x, y)] & d) !== 0; }

    /* ------------------------------------------------------------------
       1. CREUSEMENT — parcours en profondeur itératif.
       ------------------------------------------------------------------
       Le DFS est choisi pour une raison de RESSENTI, pas d'algorithme : il
       produit de longs couloirs sinueux et peu d'embranchements, là où un
       Prim ou un Kruskal produisent un feuillage dense où l'on voit trois
       ouvertures à chaque pas. Un couloir long est angoissant parce qu'on
       s'y engage sans savoir ; un carrefour permanent est seulement confus.

       Pile explicite plutôt que récursion : à 27×27 la récursion passerait,
       mais le générateur doit rester utilisable si Guillaume monte GRID, et
       un débordement de pile dans un outil qui tourne 20 000 fois est le
       genre de panne qu'on met une heure à comprendre. */
    const stack = [[(G / 2) | 0, G - 1]];
    const seen = new Uint8Array(G * G);
    // La pierre de la rotonde est marquée « déjà vue » : le creusement ne
    // l'atteindra donc jamais, et aucun passage n'y mènera.
    for (let i = 0; i < seen.length; i++) if (solid[i]) seen[i] = 1;
    seen[idx(stack[0][0], stack[0][1])] = 1;
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const opts = [];
      for (const d of DIRS) {
        const nx = x + DX[d], ny = y + DY[d];
        if (inside(nx, ny) && !seen[idx(nx, ny)]) opts.push(d);
      }
      if (!opts.length) { stack.pop(); continue; }
      const d = opts[(rand() * opts.length) | 0];
      link(x, y, d);
      const nx = x + DX[d], ny = y + DY[d];
      seen[idx(nx, ny)] = 1;
      stack.push([nx, ny]);
    }

    /* ------------------------------------------------------------------
       2. TRESSAGE — on rouvre une part des culs-de-sac.
       ------------------------------------------------------------------
       Un cul-de-sac est une cellule à un seul passage. On en rouvre
       MAZE_BRAID vers un voisin quelconque, ce qui crée une boucle.
       ⚠️ On tire un nombre aléatoire pour CHAQUE cul-de-sac, même quand on
       décide de ne pas l'ouvrir : retirer un tirage d'un flux partagé décale
       tout ce qui suit (leçon du zip 381), et la graine ne produirait plus le
       même labyrinthe selon le nombre de culs-de-sac rencontrés. */
    const deadEnds = [];
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      const m = cells[idx(x, y)];
      if (m && (m & (m - 1)) === 0) deadEnds.push([x, y]);
    }
    for (const [x, y] of deadEnds) {
      const roll = rand();
      const pick = rand();
      if (roll > cfg.MAZE_BRAID) continue;
      const closed = DIRS.filter(d => !linked(x, y, d) && inside(x + DX[d], y + DY[d])
        && !isSolid(x + DX[d], y + DY[d]));
      if (!closed.length) continue;
      link(x, y, closed[(pick * closed.length) | 0]);
    }

    /* ------------------------------------------------------------------
       3. SALLES — on abat les murs d'un rectangle.
       ------------------------------------------------------------------
       Elles ne sont pas posées AVANT le creusement (ce qui obligerait à
       recoudre le dédale autour) mais après, en supprimant simplement les
       murs internes : la connexité ne peut donc que s'améliorer, jamais se
       casser. C'est la manière la plus sûre d'ajouter des salles, et c'est
       aussi pourquoi elles peuvent se chevaucher sans conséquence.

       Elles restent LOIN de l'entrée et de la sortie (marge de 2 cellules) :
       une salle collée à la sortie la rendrait visible de trop loin, et une
       salle à l'entrée donnerait un premier pas trop confortable. */
    const rooms = [];
    for (let r = 0; r < cfg.MAZE_ROOMS; r++) {
      const w = cfg.MAZE_ROOM_MIN + ((rand() * (cfg.MAZE_ROOM_MAX - cfg.MAZE_ROOM_MIN + 1)) | 0);
      const h = cfg.MAZE_ROOM_MIN + ((rand() * (cfg.MAZE_ROOM_MAX - cfg.MAZE_ROOM_MIN + 1)) | 0);
      const rx = 2 + ((rand() * (G - w - 4)) | 0);
      const ry = 2 + ((rand() * (G - h - 4)) | 0);
      for (let y = ry; y < ry + h; y++) for (let x = rx; x < rx + w; x++) {
        if (isSolid(x, y)) continue;   // une salle ne perce pas la rotonde
        if (x + 1 < rx + w && !isSolid(x + 1, y)) link(x, y, E);
        if (y + 1 < ry + h && !isSolid(x, y + 1)) link(x, y, S);
      }
      rooms.push({ x: rx, y: ry, w, h });
    }

    /* ------------------------------------------------------------------
       3 bis. LA ROTONDE (zip 396) — la salle centrale circulaire.
       ------------------------------------------------------------------
       Demande de Guillaume, image de référence à l'appui : « je veux une
       salle centrale circulaire avec escaliers ».

       Elle est TOUJOURS là, TOUJOURS au centre, TOUJOURS de la même taille.
       C'est le contraire de tout le reste du générateur, et c'est délibéré :
       un labyrinthe entièrement aléatoire n'a aucun point de repère, donc
       aucun souvenir. La rotonde est le seul endroit dont on puisse dire
       « j'y suis déjà passé », et c'est ce qui transforme une errance en
       exploration. Elle est aussi le seul lieu à ciel ouvert, la seule vue
       dégagée, et le seul endroit où l'on peut souffler.

       ⚠️ ELLE SE CREUSE COMME UNE SALLE, c'est-à-dire APRÈS le dédale, en
       abattant des murs internes. La connexité ne peut donc que s'améliorer.
       Sa géométrie ronde, elle, n'est pas ici : elle vit dans les BOÎTES
       (Rules.buildBoxes), parce que le mur circulaire doit être exactement
       ce qui arrête le joueur — une salle ronde dessinée sur une pièce carrée
       est un mur qu'on traverse, et c'est le défaut qu'on refuse depuis le 393.

       Sa taille est IMPAIRE pour qu'elle ait une cellule centrale franche, où
       poser le brasier et le fût de lumière. */
    const RW = RWc, rx0 = rx0c, ry0 = ry0c;
    for (let y = ry0; y < ry0 + RW; y++) for (let x = rx0; x < rx0 + RW; x++) {
      if (isSolid(x, y)) continue;
      if (x + 1 < rx0 + RW && !isSolid(x + 1, y)) link(x, y, E);
      if (y + 1 < ry0 + RW && !isSolid(x, y + 1)) link(x, y, S);
    }
    /* ⚠️ ON LUI GARANTIT QUATRE PORTES, une par côté, et ce n'est pas du
       confort : le creusement peut parfaitement n'attacher la zone centrale
       au reste que par un seul couloir. Une rotonde en cul-de-sac serait un
       détour pur, or on veut qu'elle soit un CARREFOUR — l'endroit où l'on
       revient, où l'on choisit, où l'on se réoriente. Quatre portes en font
       un vrai nœud du dédale. */
    const rc = (RW / 2) | 0;
    const doors = [
      [rx0 + rc, ry0, N], [rx0 + rc, ry0 + RW - 1, S],
      [rx0, ry0 + rc, W], [rx0 + RW - 1, ry0 + rc, E],
    ];
    for (const [dx2, dy2, d] of doors) {
      const nx = dx2 + DX[d], ny = dy2 + DY[d];
      if (inside(nx, ny)) link(dx2, dy2, d);
    }
    const rotunda = { x: rx0, y: ry0, w: RW, h: RW, cx: rx0 + rc, cy: ry0 + rc };

    /* ------------------------------------------------------------------
       4. ENTRÉE ET SORTIE.
       ------------------------------------------------------------------
       L'entrée est FIXE au milieu du bord sud : c'est la continuation du
       pont de haies, et le joueur doit toujours arriver au même endroit
       (sinon la première seconde de jeu est une désorientation gratuite).

       La sortie, elle, est CHOISIE — et bornée DES DEUX CÔTÉS. On retient,
       sur le bord nord, la cellule la plus lointaine dont le plus court
       chemin depuis l'entrée tienne dans [MAZE_MIN_PATH, MAZE_MAX_PATH].

       ⚠️ LA BORNE HAUTE A ÉTÉ AJOUTÉE APRÈS MESURE, pas par principe. La
       première version ne gardait que « le plus long » : sur 2 000 graines
       elle produisait des chemins de 48 à 311 cellules, c'est-à-dire, au
       même pas de marche, des parties allant de 40 secondes à 4 minutes de
       TRAJET OPTIMAL — donc de 3 à 20 minutes de jeu réel. Ce n'est pas de la
       variété, c'est une difficulté tirée au sort avant que le joueur ait
       touché une touche. La borne haute rend les parties comparables, ce qui
       est la condition pour qu'un record ait un sens.

       Si aucune cellule du bord nord ne tient dans la bande, la graine est
       REJETÉE et l'appelant en essaie une autre (voir generate()). Rejeter
       est plus honnête que rafistoler : on ne sait pas raccourcir un chemin
       sans casser la cohérence de ce qui a été creusé. */
    const distFrom = (sx, sy) => {
      const d = new Int32Array(G * G).fill(-1);
      d[idx(sx, sy)] = 0;
      const q = [[sx, sy]];
      for (let h = 0; h < q.length; h++) {
        const [x, y] = q[h];
        for (const dir of DIRS) {
          if (!linked(x, y, dir)) continue;
          const nx = x + DX[dir], ny = y + DY[dir];
          if (d[idx(nx, ny)] !== -1) continue;
          d[idx(nx, ny)] = d[idx(x, y)] + 1;
          q.push([nx, ny]);
        }
      }
      return d;
    };

    const entry = { x: (G / 2) | 0, y: G - 1 };
    const dEntry = distFrom(entry.x, entry.y);
    let exit = null, bestD = -1;
    for (let x = 0; x < G; x++) {
      const dd = dEntry[idx(x, 0)];
      if (dd < cfg.MAZE_MIN_PATH || dd > cfg.MAZE_MAX_PATH) continue;
      if (dd > bestD) { bestD = dd; exit = { x, y: 0 }; }
    }
    if (!exit) return null;                                // graine rejetée

    const dExit = distFrom(exit.x, exit.y);

    /* Le CHEMIN DE RÉFÉRENCE : la suite de cellules du plus court trajet
       entrée→sortie. Il ne sert pas à guider le joueur (il ne le voit jamais)
       mais à poser les brasiers : la garantie TORCH_MAX_GAP porte sur LUI,
       parce que c'est le seul trajet dont on sache qu'il existe. */
    const path = [];
    {
      let cx = entry.x, cy = entry.y;
      path.push([cx, cy]);
      let guard = 0;
      while (!(cx === exit.x && cy === exit.y) && guard++ < G * G * 4) {
        let nxt = null;
        for (const dir of DIRS) {
          if (!linked(cx, cy, dir)) continue;
          const nx = cx + DX[dir], ny = cy + DY[dir];
          if (dExit[idx(nx, ny)] === dExit[idx(cx, cy)] - 1) { nxt = [nx, ny]; break; }
        }
        if (!nxt) break;
        cx = nxt[0]; cy = nxt[1];
        path.push([cx, cy]);
      }
    }

    return {
      seed, G, cells, rooms, rotunda, entry, exit, path,
      dEntry, dExit, pathLen: bestD,
      idx, inside, linked,
      // exposés pour les outils ET pour le monde 3D : une seule description
      N, E, S, W, DX, DY, DIRS,
    };
  }

  /* =======================================================================
     TROUS — la partie la plus délicate du fichier.
     -----------------------------------------------------------------------
     Un trou RETIRE une cellule du graphe. En poser au hasard, c'est accepter
     qu'une graine sur dix soit insoluble, et le joueur n'aurait aucun moyen
     de le savoir : il chercherait une sortie qui n'existe pas.

     LA MÉTHODE : on ne vérifie pas la règle, on vérifie le RÉSULTAT. Chaque
     candidat est retiré POUR DE BON, puis on refait un parcours en largeur
     entrée→sortie sur le graphe amputé. S'il passe encore, le trou reste ;
     sinon on le remet et on essaie ailleurs. C'est plus coûteux qu'un
     raisonnement local (« ne pas percer une cellule d'articulation ») et
     c'est exactement pour ça qu'on le fait : le raisonnement local se trompe
     dès qu'on pose DEUX trous, parce que le second est jugé sur le graphe
     d'avant le premier.

     ⚠️ Le test est cumulatif et l'ordre compte : les trous sont posés un par
     un, chacun validé contre l'état laissé par les précédents. C'est ce qui
     rend le résultat correct quel que soit leur nombre.

     Les dalles qui CÈDENT (crack) sont soumises au MÊME test, pour une raison
     différente : le joueur passe dessus, donc le chemin existe à l'aller.
     Mais si elle tombe et coupe le seul accès à la sortie, il se retrouve
     enfermé sans faute de sa part. Le test garantit qu'il reste toujours une
     route, même si toutes les dalles fêlées du labyrinthe sont tombées.
     ======================================================================= */
  /* ⚠️ LE BUT EST DEVENU UN PARAMÈTRE AU 396, et ce n'est pas de la
     généralisation gratuite. Un trou n'a plus seulement à laisser la SORTIE
     atteignable : il doit aussi laisser LA ROTONDE atteignable. Mesuré, sans
     ce second appel : 2 % des dédales enfermaient la salle centrale derrière
     les trous — c'est-à-dire qu'une partie sur cinquante ne montrait jamais
     au joueur la seule chose qu'on ait construite pour être vue. Un contenu
     qu'on peut ne jamais rencontrer n'est pas une surprise, c'est une perte. */
  function reachable(m, blocked, target) {
    const { G, idx, linked, DIRS, DX, DY } = m;
    const goal = target || m.exit;
    if (blocked.has(idx(m.entry.x, m.entry.y))) return false;
    const seen = new Uint8Array(G * G);
    seen[idx(m.entry.x, m.entry.y)] = 1;
    const q = [[m.entry.x, m.entry.y]];
    for (let h = 0; h < q.length; h++) {
      const [x, y] = q[h];
      if (x === goal.x && y === goal.y) return true;
      for (const d of DIRS) {
        if (!linked(x, y, d)) continue;
        const nx = x + DX[d], ny = y + DY[d];
        const j = idx(nx, ny);
        if (seen[j] || blocked.has(j)) continue;
        seen[j] = 1;
        q.push([nx, ny]);
      }
    }
    return false;
  }

  function placeHoles(cfg, m, rand) {
    const { G, idx } = m;
    const blocked = new Set();
    const gaps = [], cracks = [];
    const forbidden = new Set();          // entrée, sortie, et leurs abords immédiats
    const bar = (x, y) => { if (x >= 0 && y >= 0 && x < G && y < G) forbidden.add(idx(x, y)); };
    for (const p of [m.entry, m.exit]) {
      bar(p.x, p.y);
      bar(p.x + 1, p.y); bar(p.x - 1, p.y); bar(p.x, p.y + 1); bar(p.x, p.y - 1);
    }
    /* ⚠️ AUCUN TROU DANS LA ROTONDE (zip 396), ET CE N'EST PAS UN CHOIX DE
       CONFORT — C'EST UN TROU INVISIBLE QU'ON REFUSE.
       -------------------------------------------------------------------
       world.js/buildFloor ne dessine PAS le sol des cellules de la rotonde :
       elle a le sien, en gradins (buildRotunda). Un trou posé là aurait donc
       été parfaitement mortel et parfaitement INVISIBLE — pas de bord
       déchiqueté, pas de lueur violette qui monte, rien. Mesuré : les chutes
       passaient de 5 % à 17 % des fins de partie dès l'arrivée de la salle,
       et aucune relecture ne pouvait le voir, chaque fichier ayant raison de
       son côté.
       C'est aussi cohérent avec ce que la salle EST : le seul refuge du
       dédale. On y trouve du feu, on n'y meurt pas d'un pas de travers. */
    if (m.rotunda) {
      const R = m.rotunda;
      for (let y = R.y - 1; y <= R.y + R.h; y++)
        for (let x = R.x - 1; x <= R.x + R.w; x++) bar(x, y);
    }
    // Les trois premières cellules du chemin sont épargnées : tomber dans les
    // deux premières secondes de jeu n'apprend rien, ça donne juste envie
    // d'arrêter.
    for (let i = 0; i < Math.min(3, m.path.length); i++) forbidden.add(idx(m.path[i][0], m.path[i][1]));

    /* ⚠️ AUCUN TROU OUVERT SUR LE CHEMIN DE RÉFÉRENCE — correctif, pas
       précaution. La promesse TORCH_MAX_GAP porte sur ce chemin-là ; s'il peut
       être coupé par un trou définitif, elle porte sur un trajet qui n'existe
       plus, et placeTorches saute la cellule percée en laissant DEUX
       intervalles bout à bout. verify-maze.mjs le voyait sans ambiguïté : 16
       cellules sans brasier pour un plafond de 11, sur une graine sur dix.

       Les dalles FÊLÉES, elles, restent autorisées sur le chemin, et c'est
       voulu : on les traverse, donc le chemin existe à l'aller. Qu'elles le
       coupent au retour est précisément la mécanique demandée — et la
       garantie n°2 de verify-maze.mjs contrôle qu'on peut encore sortir même
       si TOUTES sont tombées. */
    const onPath = new Set(m.path.map(([x, y]) => idx(x, y)));

    function tryPlace(list, want, avoidPath) {
      let tries = 0;
      while (list.length < want && tries++ < G * G * 8) {
        const x = (rand() * G) | 0, y = (rand() * G) | 0;
        const j = idx(x, y);
        if (forbidden.has(j) || blocked.has(j)) continue;
        if (avoidPath && onPath.has(j)) continue;
        if (!m.cells[j]) continue;                 // cellule murée de toutes parts : rien à percer
        blocked.add(j);
        if (reachable(m, blocked) &&
            (!m.rotunda || reachable(m, blocked, { x: m.rotunda.cx, y: m.rotunda.cy })))
          list.push({ x, y });
        else blocked.delete(j);                    // le trou coupait la sortie : refusé
      }
    }
    tryPlace(gaps, cfg.GAP_COUNT, true);      // trous définitifs : jamais sur le chemin
    tryPlace(cracks, cfg.CRACK_COUNT, false);  // dalles fêlées : oui, c'est la mécanique
    return { gaps, cracks, blocked };
  }

  /* =======================================================================
     BRASIERS — la garantie TORCH_MAX_GAP.
     -----------------------------------------------------------------------
     On pose d'abord des brasiers SUR le chemin de référence, à intervalle
     régulier strictement inférieur à TORCH_MAX_GAP. C'est la garantie dure :
     un joueur qui suivrait le chemin optimal ne peut pas manquer de flamme.
     Il ne le suit jamais — il ne le connaît pas — mais ça borne la punition
     de l'exploration à la marge qu'on a calculée dans config.js
     (FLAME_CELLS ≈ 96 cellules pour un écart de 11).

     Le reste est semé AILLEURS, loin du chemin, pour deux raisons : éclairer
     les impasses (sinon elles sont indiscernables et on n'ose plus rien), et
     donner au joueur perdu une chance de retrouver du feu là où il est.
     ======================================================================= */
  function placeTorches(cfg, m, rand, blocked) {
    const { idx } = m;
    const out = [];
    const used = new Set();
    /* ⚠️ ON AVANCE JUSQU'À UNE CELLULE UTILISABLE, ON NE SAUTE JAMAIS.
       La première version faisait `continue` quand la cellule visée était
       percée ou déjà prise : deux intervalles se retrouvaient bout à bout et
       la garantie sautait avec (16 cellules mesurées pour un plafond de 11).
       Maintenant qu'aucun trou définitif ne se pose sur le chemin, les seuls
       obstacles sont les dalles fêlées — un brasier posé sur une dalle qui
       cède serait un piège, puisqu'on s'arrête forcément pour s'en servir.
       On décale donc d'une ou deux cellules, ce qui RACCOURCIT l'intervalle
       au lieu de le doubler. */
    const step = Math.max(2, cfg.TORCH_MAX_GAP - 3);
    let last = 0;
    for (let i = step; i < m.path.length - 1; i += step) {
      let k = i;
      while (k < m.path.length - 1 && (blocked.has(idx(m.path[k][0], m.path[k][1])) || used.has(idx(m.path[k][0], m.path[k][1])))) k++;
      // On refuse de reculer : mieux vaut un intervalle court qu'un doublon.
      if (k <= last || k >= m.path.length - 1) continue;
      const [x, y] = m.path[k];
      const j = idx(x, y);
      if (blocked.has(j) || used.has(j)) continue;
      used.add(j); out.push({ x, y, spent: false, onPath: true });
      last = k;
    }
    let tries = 0;
    while (out.length < cfg.MAZE_TORCHES && tries++ < m.G * m.G * 6) {
      const x = (rand() * m.G) | 0, y = (rand() * m.G) | 0;
      const j = idx(x, y);
      if (used.has(j) || blocked.has(j) || !m.cells[j]) continue;
      used.add(j); out.push({ x, y, spent: false, onPath: false });
    }
    return out;
  }

  /* =======================================================================
     L'ÉPÉE, LES CRÉATURES, LES ÉCLATS, LES FIOLES.
     -----------------------------------------------------------------------
     L'ORDRE DE CES QUATRE APPELS EST UNE RÈGLE DE JEU, pas une commodité :
     l'épée d'abord, les créatures ensuite, et les créatures refusent toute
     cellule dont la profondeur est inférieure à celle de l'épée. C'est la
     traduction en code de la conséquence signalée à Guillaume — « épée
     trouvée » veut dire « désarmé au départ », donc le désarmement doit être
     BORNÉ, et borné par une garantie, pas par une probabilité.
     ======================================================================= */
  function plantSword(cfg, m, rand, blocked) {
    const { G, idx } = m;
    // Candidates : cellules à portée BFS de l'entrée, hors trous, et de
    // préférence dans une salle (une épée sur un autel au milieu d'un couloir
    // se voit mal, et l'objet doit APPELER).
    const inRoom = (x, y) => m.rooms.some(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
    const cand = [];
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      const j = idx(x, y);
      const d = m.dEntry[j];
      if (d < 3 || d > cfg.SWORD_MAX_DEPTH || blocked.has(j)) continue;
      cand.push({ x, y, d, room: inRoom(x, y) });
    }
    if (!cand.length) return null;
    const rooms = cand.filter(c => c.room);
    const pool = rooms.length ? rooms : cand;
    // La plus PROFONDE des candidates : on veut que le joueur ait marché,
    // pas qu'il trouve l'épée au premier pas.
    pool.sort((a, b) => b.d - a.d);
    const top = pool.slice(0, Math.max(1, (pool.length / 3) | 0));
    const c = top[(rand() * top.length) | 0];
    return { x: c.x, y: c.y, depth: c.d };
  }

  function placeRoamers(cfg, m, rand, blocked, swordDepth) {
    const { G, idx } = m;
    const out = [];
    let tries = 0;
    const used = new Set();
    while (out.length < cfg.ROAMER_COUNT && tries++ < G * G * 8) {
      const x = (rand() * G) | 0, y = (rand() * G) | 0;
      const j = idx(x, y);
      if (used.has(j) || blocked.has(j) || !m.cells[j]) continue;
      // ⚠️ LA RÈGLE : aucune créature avant l'épée. `+1` et non `>=` : une
      // créature posée exactement sur l'autel se battrait pour l'arme que le
      // joueur n'a pas encore.
      if (m.dEntry[j] <= swordDepth + 1) continue;
      used.add(j);
      out.push({ x, y, homeX: x, homeY: y });
    }
    return out;
  }

  function scatter(cfg, m, rand, blocked, count, minDepth) {
    const { G, idx } = m;
    const out = [];
    const used = new Set();
    let tries = 0;
    while (out.length < count && tries++ < G * G * 8) {
      const x = (rand() * G) | 0, y = (rand() * G) | 0;
      const j = idx(x, y);
      if (used.has(j) || blocked.has(j) || !m.cells[j]) continue;
      if (m.dEntry[j] < minDepth) continue;
      used.add(j);
      out.push({ x, y });
    }
    return out;
  }

  /* =======================================================================
     generate(cfg, seed) — le seul point d'entrée.
     -----------------------------------------------------------------------
     Boucle sur les graines jusqu'à en trouver une acceptable (chemin assez
     long). Le nombre d'essais est BORNÉ : au pire on rend la meilleure vue,
     parce qu'un jeu qui ne démarre pas est pire qu'un labyrinthe un peu
     court. `attempts` est renvoyé pour que les outils puissent surveiller le
     taux de rejet — s'il monte, c'est que MAZE_MIN_PATH est devenu trop
     ambitieux pour GRID, et c'est le genre de réglage qui pourrit en silence.
     ======================================================================= */
  /* =======================================================================
     ZIP 397 — LA CARTE LUISANTE, ACCROCHÉE À UN MUR.
     -----------------------------------------------------------------------
     Guillaume : « avoir un bonus qui permet de voir le plan du maze (quand on
     trouve une carte luisante accrochée au mur) ».

     TROIS CONTRAINTES, et chacune vient d'un raisonnement de jeu, pas de code :

       1. ELLE EST SUR UN MUR, donc il faut une cellule qui ait une FACE
          FERMÉE. On rend la direction de cette face : sans elle, world.js
          devrait la redécouvrir, c'est-à-dire redécrire ce que le générateur
          savait déjà — et deux descriptions divergent (leçon du 387) ;
       2. ELLE EST À PROFONDEUR MOYENNE (MAP_DEPTH_MIN..MAX). Trop tôt, le
          labyrinthe n'a jamais existé ; trop tard, on a fini de se perdre et
          elle ne sert plus à rien. La fenêtre est le bonus ;
       3. ELLE N'EST PAS SUR LE CHEMIN LE PLUS COURT. Un bonus posé sur la
          route qu'on prend de toute façon n'est pas une trouvaille, c'est une
          distribution. On préfère donc, à profondeur égale, une cellule qui
          n'est pas sur `m.path`.

     Repli : si aucune cellule ne remplit tout, on relâche dans l'ordre 3, 2,
     1 — un jeu où le bonus n'existe pas est pire qu'un bonus mal placé.
     ======================================================================= */
  function plantMap(cfg, m, rand, blocked) {
    const { G, idx, linked } = m;
    const onPath = new Set(m.path.map(([x, y]) => idx(x, y)));
    const tiers = [[], [], []];
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      const j = idx(x, y);
      if (!m.cells[j] || blocked.has(j)) continue;
      if (m.rotunda && x >= m.rotunda.x && x < m.rotunda.x + m.rotunda.w &&
          y >= m.rotunda.y && y < m.rotunda.y + m.rotunda.h) continue;
      const d = m.dEntry[j];
      if (d < 0) continue;
      // une face fermée pour l'accrocher, et de préférence pas vers l'extérieur
      const faces = [];
      for (const dir of DIRS) {
        if (linked(x, y, dir)) continue;
        const nx = x + DX[dir], ny = y + DY[dir];
        if (nx < 0 || ny < 0 || nx >= G || ny >= G) continue;
        faces.push(dir);
      }
      if (!faces.length) continue;
      const dir = faces[(rand() * faces.length) | 0];
      const inWindow = d >= cfg.MAP_DEPTH_MIN && d <= cfg.MAP_DEPTH_MAX;
      const off = !onPath.has(j);
      tiers[inWindow && off ? 0 : inWindow ? 1 : 2].push({ x, y, dir, depth: d });
    }
    for (const t of tiers) if (t.length) return t[(rand() * t.length) | 0];
    return null;
  }

  /* =======================================================================
     ZIP 397 — LES MARQUES DE CRAIE. « Naviguer de manière absolument
     évidente », sans donner le plan.
     -----------------------------------------------------------------------
     Trois espèces, et elles ne disent pas la même chose :

       FLÈCHE — posée sur un CARREFOUR du chemin de la sortie, elle pointe vers
         la cellule suivante de ce chemin. C'est le seul indice qui donne une
         DIRECTION, et il n'est posé que là où il y a un choix à faire : sur un
         couloir sans embranchement, il n'apprendrait rien et il salirait le
         mur ;
       CROIX — devant un trou. Elle ne dit pas « danger » dans l'absolu, elle
         dit « quelqu'un est tombé ici ». C'est le seul indice qui parle du
         passé, et c'est ce qui fait du dédale un lieu où d'autres sont venus ;
       MAIN — quand un brasier est à une cellule. Le feu est la ressource
         vitale du jeu et il est INVISIBLE derrière un mur : une main tendue au
         bon moment vaut mieux qu'un halo qu'on ne verra qu'une fois arrivé.

     ⚠️ ELLES SONT DU DÉCOR PUR. Aucune n'entre dans rules.js, aucune n'a
     d'effet, aucune ne peut mentir sur l'état du jeu — elles décrivent la
     TOPOLOGIE, qui ne change pas en cours de partie. C'est ce qui autorise à
     les calculer une fois ici et à ne plus jamais y penser.
     ======================================================================= */
  function markChalk(cfg, m, rand, holes, torches) {
    const { G, idx, linked } = m;
    const out = [];
    const used = new Set();
    const face = (x, y) => {
      // une face fermée au hasard, pour y coller la marque
      const f = [];
      for (const dir of DIRS) {
        if (linked(x, y, dir)) continue;
        const nx = x + DX[dir], ny = y + DY[dir];
        if (nx < 0 || ny < 0 || nx >= G || ny >= G) continue;
        f.push(dir);
      }
      return f.length ? f[(rand() * f.length) | 0] : -1;
    };

    // --- FLÈCHES aux carrefours du chemin
    let placed = 0;
    for (let i = 1; i < m.path.length - 1 && placed < cfg.CHALK_ARROWS; i++) {
      const [x, y] = m.path[i];
      const j = idx(x, y);
      if (used.has(j)) continue;
      let deg = 0;
      for (const dir of DIRS) if (linked(x, y, dir)) deg++;
      if (deg < 3) continue;                       // pas un carrefour : rien à dire
      const f = face(x, y);
      if (f < 0) continue;
      const [ax, ay] = m.path[i + 1];
      // le cap vers lequel la flèche pointe, en radians monde (ang = 0 → -Z)
      const to = Math.atan2(-(ax - x), -(ay - y));
      used.add(j);
      out.push({ x, y, face: f, kind: 0, to });
      placed++;
    }
    // --- CROIX devant les trous
    let cross = 0;
    for (const g of holes.gaps) {
      if (cross >= cfg.CHALK_CROSSES) break;
      for (const dir of DIRS) {
        const nx = g.x + DX[dir], ny = g.y + DY[dir];
        if (nx < 0 || ny < 0 || nx >= G || ny >= G) continue;
        const j = idx(nx, ny);
        if (!m.cells[j] || used.has(j)) continue;
        const f = face(nx, ny);
        if (f < 0) continue;
        used.add(j);
        out.push({ x: nx, y: ny, face: f, kind: 1, to: 0 });
        cross++; break;
      }
    }
    // --- MAINS vers les brasiers
    let hands = 0;
    for (const t of torches) {
      if (hands >= cfg.CHALK_HANDS) break;
      for (const dir of DIRS) {
        const nx = t.x + DX[dir], ny = t.y + DY[dir];
        if (nx < 0 || ny < 0 || nx >= G || ny >= G) continue;
        const j = idx(nx, ny);
        if (!m.cells[j] || used.has(j) || !linked(nx, ny, OPP[dir])) continue;
        const f = face(nx, ny);
        if (f < 0) continue;
        used.add(j);
        out.push({ x: nx, y: ny, face: f, kind: 3, to: Math.atan2(-(t.x - nx), -(t.y - ny)) });
        hands++; break;
      }
    }
    return out;
  }

  function generate(cfg, seed) {
    let m = null, attempts = 0, s = (seed >>> 0) || 1;
    /* La graine est rebattue par un congruentiel linéaire à chaque rejet,
       jamais incrémentée : deux graines voisines produisent deux dédales
       voisins, et une simple incrémentation aurait fait tourner longtemps
       autour de la même topologie ratée.

       LA BOUCLE EST BORNÉE, et le repli est explicite : au pire on relâche la
       borne haute (jamais la borne basse — un labyrinthe trop court serait
       une déception, un labyrinthe trop long reste un labyrinthe). Un jeu qui
       ne démarre pas est pire que les deux. */
    while (attempts < 40 && !m) {
      attempts++;
      m = make(cfg, s);
      if (!m) s = (s * 1664525 + 1013904223) >>> 0;
    }
    if (!m) {
      const relaxed = Object.assign({}, cfg, { MAZE_MAX_PATH: cfg.GRID * cfg.GRID });
      let s2 = (seed >>> 0) || 1;
      for (let i = 0; i < 40 && !m; i++) {
        m = make(relaxed, s2);
        if (!m) s2 = (s2 * 1664525 + 1013904223) >>> 0;
      }
    }
    if (!m) return null;

    const rand = rng((m.seed ^ 0x9e3779b9) >>> 0);
    const holes = placeHoles(cfg, m, rand);
    const torches = placeTorches(cfg, m, rand, holes.blocked);
    const sword = plantSword(cfg, m, rand, holes.blocked);
    const swordDepth = sword ? sword.depth : 0;
    const roamers = placeRoamers(cfg, m, rand, holes.blocked, swordDepth);
    const shards = scatter(cfg, m, rand, holes.blocked, cfg.SHARD_COUNT, 2);
    const potions = scatter(cfg, m, rand, holes.blocked, cfg.POTION_COUNT, swordDepth + 2);

    /* ==================================================================
       LA ROTONDE EST DOTÉE À LA MAIN (zip 396), et c'est le seul endroit du
       générateur où l'on pose quelque chose sans tirer au sort.

       POURQUOI. Une salle qu'on descend doit RÉCOMPENSER la descente, sinon
       elle n'est qu'un détour photogénique — et le joueur, qui l'apprend en
       une visite, ne redescendra plus jamais. Elle reçoit donc :
         * UN BRASIER en son centre, toujours. C'est le seul point du dédale
           dont on sache, avant d'entrer, qu'on y retrouvera du feu. Ça en
           fait un refuge, donc un but, donc un choix ;
         * DES ÉCLATS sur les gradins du fond, qu'on ne ramasse qu'en
           descendant vraiment.

       ⚠️ ON RETIRE D'ABORD CE QUE LE TIRAGE AURAIT PU Y METTRE, pour ne pas
       poser deux objets sur la même cellule — un éclat invisible sous un
       brasier est un point qu'on ne comprend jamais avoir raté. */
    if (m.rotunda) {
      const R = m.rotunda;
      const inRot = (o) => o.x >= R.x && o.x < R.x + R.w && o.y >= R.y && o.y < R.y + R.h;
      const cj = m.idx(R.cx, R.cy);
      for (let i = torches.length - 1; i >= 0; i--)
        if (m.idx(torches[i].x, torches[i].y) === cj) torches.splice(i, 1);
      torches.push({ x: R.cx, y: R.cy, spent: false, onPath: true, rotunda: true });

      for (let i = shards.length - 1; i >= 0; i--) if (inRot(shards[i])) shards.splice(i, 1);
      /* Les quatre cellules en croix autour du centre, plus le centre lui-
         même s'il reste de la place : ce sont les seules du fond de la
         cuvette, donc celles qu'on n'atteint qu'en descendant l'escalier. */
      const spots = [[R.cx, R.cy - 1], [R.cx, R.cy + 1], [R.cx - 1, R.cy], [R.cx + 1, R.cy],
                     [R.cx - 1, R.cy - 1], [R.cx + 1, R.cy + 1]];
      for (let i = 0; i < Math.min(cfg.ROTUNDA_SHARDS, spots.length); i++)
        shards.push({ x: spots[i][0], y: spots[i][1] });
    }

    /* ZIP 397 — la carte, l'arbalète, les carreaux, la craie.
       ⚠️ L'ARBALÈTE EST POSÉE PLUS LOIN QUE L'ÉPÉE (BOW_DEPTH_MIN > la
       profondeur de l'épée), et ce n'est pas décoratif : trouver la seconde
       arme AVANT la première annulerait tout le propos du parvis — on
       commencerait armé à distance, donc sans jamais avoir été vulnérable, et
       le premier tiers du jeu perdrait sa tension d'un coup. */
    const bowDepth = Math.max(cfg.BOW_DEPTH_MIN, swordDepth + 3);
    const bowList = scatter(cfg, m, rand, holes.blocked, 1, bowDepth);
    const bow = bowList.length ? bowList[0] : (scatter(cfg, m, rand, holes.blocked, 1, swordDepth + 1)[0] || null);
    const boltPacks = scatter(cfg, m, rand, holes.blocked, cfg.BOLT_PICKUPS, swordDepth + 1);
    const mapItem = plantMap(cfg, m, rand, holes.blocked);
    const chalk = markChalk(cfg, m, rand, holes, torches);

    m.gaps = holes.gaps;
    m.cracks = holes.cracks;
    m.blocked = holes.blocked;             // les GAP seuls bloquent dès le départ
    m.torches = torches;
    m.sword = sword;
    m.bow = bow;
    m.boltPacks = boltPacks;
    m.mapItem = mapItem;
    m.chalk = chalk;
    m.roamers = roamers;
    m.shards = shards;
    m.potions = potions;
    m.attempts = attempts;
    return m;
  }

  /* Chemin le plus court entre deux cellules, en tenant compte des trous
     OUVERTS ET des dalles déjà tombées. C'est la fonction que le traqueur
     utilise en jeu ET que le joueur oracle des outils utilise pour se
     déplacer : ils partagent donc rigoureusement la même idée de « ce qui
     est praticable », ce qui est la seule façon qu'une simulation mesure le
     jeu plutôt que son propre écart. */
  function pathTo(m, sx, sy, tx, ty, blockedSet) {
    const { G, idx, linked, DIRS, DX, DY } = m;
    const prev = new Int32Array(G * G).fill(-2);
    const s = idx(sx, sy), t = idx(tx, ty);
    if (s === t) return [];
    prev[s] = -1;
    const q = [[sx, sy]];
    for (let h = 0; h < q.length; h++) {
      const [x, y] = q[h];
      for (const d of DIRS) {
        if (!linked(x, y, d)) continue;
        const nx = x + DX[d], ny = y + DY[d];
        const j = idx(nx, ny);
        if (prev[j] !== -2) continue;
        if (blockedSet && blockedSet.has(j)) continue;
        prev[j] = idx(x, y);
        if (j === t) {
          const out = [];
          let cur = j;
          while (cur !== s) { out.push([cur % G, (cur / G) | 0]); cur = prev[cur]; }
          out.reverse();
          return out;
        }
        q.push([nx, ny]);
      }
    }
    return null;
  }

  return { generate, make, reachable, pathTo, rng, N, E, S, W, DX, DY, OPP, DIRS };
})();

if (typeof module === "object" && module.exports) module.exports = { Maze };
