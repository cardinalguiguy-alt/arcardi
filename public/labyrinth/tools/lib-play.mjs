/* =============================================================================
   lib-play.mjs — LE JOUEUR ORACLE, et le chargeur des fichiers du jeu.
   -----------------------------------------------------------------------------
   Partagé par simulate-maze.mjs, tune-maze.mjs et verify-maze.mjs.

   ⚠️ CE QU'IL PROUVE ET CE QU'IL NE PROUVE PAS (corollaire n°4 du zip 385).
   Il prouve que le labyrinthe est traversable, combien de temps ça prend, et
   par quoi on meurt. Il ne prouve RIEN de la lisibilité à l'écran, rien du
   confort des commandes, rien de la peur — et la peur est l'objet du chantier.
   Ces trois-là ne se mesurent qu'en jouant, et c'est pour ça que la livraison
   demande explicitement à Guillaume d'y jouer.

   ---------------------------------------------------------------------------
   L'ORACLE NE TRICHE PAS SUR LA CARTE, et c'est tout l'intérêt.
   ---------------------------------------------------------------------------
   Un oracle omniscient marcherait droit à la sortie et mesurerait la longueur
   du plus court chemin — un nombre qu'on connaît déjà, et qui ne dit rien de
   ce que vit un joueur. Celui-ci n'a accès qu'aux cellules qu'il a VUES : il
   explore, il revient sur ses pas, il se trompe. Ses temps sont donc de vrais
   temps de partie, et son taux de mort une vraie difficulté.

   Il reste meilleur qu'un humain sur deux points, qu'il faut garder en tête en
   lisant les chiffres : il n'oublie jamais un brasier qu'il a croisé, et il ne
   panique pas. Le taux de mort réel sera plus haut que celui qu'il rapporte,
   jamais plus bas. C'est le bon sens de l'erreur pour un outil de réglage.
   ========================================================================== */

import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(HERE, "..");

export function load(files = ["js/config.js", "js/maze.js", "js/rules.js"]) {
  const ctx = vm.createContext({
    Math, console, Object, Set, Map, Uint8Array, Int32Array, Float32Array, Array, Proxy, JSON,
    module: {}, performance: { now: () => Date.now() },
    // smoke-render.mjs installe un faux Three.js et un faux DOM sur le global
    // AVANT d'appeler load() : world.js et paint.js les cherchent là.
    window: typeof global !== "undefined" ? global.window : undefined,
    document: typeof global !== "undefined" ? global.document : undefined,
  });
  for (const f of files) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
  }
  // `const` au niveau d'un script vm vit dans la portée lexicale du contexte,
  // pas sur l'objet global : on va le chercher par une expression. Motif repris
  // tel quel de public/templerun/tools/verify-fairness.js.
  return vm.runInContext("({ CFG, Maze, Rules, Paint: typeof Paint !== \"undefined\" ? Paint : null, World: typeof World !== \"undefined\" ? World : null })", ctx);
}

const DT = 1 / 60;   // le jeu tourne au pas fixe côté simulation (voir game.js)

/* ---------------------------------------------------------------------------
   playOne — une partie complète, image par image, par Rules.step().
   -------------------------------------------------------------------------- */
export function playOne({ CFG, Maze, Rules }, seed, opts = {}) {
  const maxSeconds = opts.maxSeconds || 480;
  const m = Maze.generate(CFG, seed);
  if (!m) return { ok: false, why: "generation" };
  const st = Rules.create(CFG, m, seed);

  const G = m.G;
  const known = new Uint8Array(G * G);          // cellules dont l'oracle a la topologie
  const visited = new Uint8Array(G * G);
  const knownTorch = new Map();                 // idx -> brasier vu, non consommé
  const knownBlocked = new Set();               // trous et dalles tombées VUS
  let exitKnown = false;

  let plan = null, planI = 0, planKind = "explore";
  /* ⚠️ LA CELLULE-BUT, mémorisée À CÔTÉ du chemin. Sans elle, un but qui se
     trouve être la cellule COURANTE produit un chemin VIDE (pathTo ne renvoie
     jamais la case de départ) : le plan est aussitôt « épuisé », on
     replanifie, on retombe sur le même but, et l'oracle reste immobile
     jusqu'au bout du temps imparti. C'est exactement ce qui arrivait devant
     un brasier — flamme basse, brasier le plus proche = ici, chemin vide,
     blocage. Le détecteur de blocage ne le voyait pas non plus, parce qu'il
     n'abandonnait que sur planKind === "lost".
     Avec le but mémorisé, un chemin vide veut simplement dire « marche vers
     le centre de ta propre case », ce qui est la bonne action. */
  let goal = null;
  let frames = 0, stuck = 0, lastX = st.px, lastZ = st.pz;
  let lastCellX = -1, lastCellY = -1, stuckOut = false;

  /* Ce que l'oracle « voit » d'une cellule : la cellule elle-même et ses
     voisines directes. C'est volontairement pauvre — un humain voit plus loin
     dans un couloir droit. L'oracle est donc pénalisé sur l'exploration, ce
     qui, encore une fois, va dans le bon sens : ses temps sont des majorants. */
  /* PORTÉE DE VUE DE L'ORACLE, en cellules. Elle n'est pas choisie : c'est ce
     que porte la torche. TORCH_LIGHT_MAX / CELL ≈ 2,6 cellules à flamme
     pleine, arrondi à 3 — un joueur voit le fond du couloir suivant, pas
     au-delà.

     ⚠️ LA PREMIÈRE VERSION NE VOYAIT QUE LES CASES ADJACENTES, et c'était un
     biais grossier : elle marchait dans les trous ouverts sans jamais pouvoir
     les éviter, alors qu'en jeu la lueur violette d'un trou se voit de loin
     (c'est même la seule chose qui éclaire un couloir sans brasier). L'outil
     mesurait donc la maladresse de son propre oracle, pas la difficulté du
     labyrinthe — exactement le corollaire n°5 du zip 387. */
  const VISION = 3;

  function observe() {
    const [cx, cy] = Rules.cellOf(CFG, st.px, st.pz);
    if (cx < 0 || cy < 0 || cx >= G || cy >= G) return;
    const j = m.idx(cx, cy);
    known[j] = 1; visited[j] = 1;
    // Propagation à travers les passages ouverts : on voit dans les couloirs,
    // jamais à travers un mur.
    const q = [[cx, cy, 0]];
    const seenLocal = new Set([j]);
    for (let h = 0; h < q.length; h++) {
      const [x, y, d] = q[h];
      if (d >= VISION) continue;
      for (const dir of m.DIRS) {
        if (!m.linked(x, y, dir)) continue;
        const nx = x + m.DX[dir], ny = y + m.DY[dir];
        const nj = m.idx(nx, ny);
        known[nj] = 1;
        if (st.gaps.has(nj) || st.fallen.has(nj)) knownBlocked.add(nj);
        if (seenLocal.has(nj)) continue;
        seenLocal.add(nj);
        q.push([nx, ny, d + 1]);
      }
    }
    for (const t of st.torches) {
      const tj = m.idx(t.x, t.y);
      if (!known[tj]) continue;
      if (t.spent) knownTorch.delete(tj); else knownTorch.set(tj, t);
    }
    if (known[m.idx(m.exit.x, m.exit.y)]) exitKnown = true;
    for (const jj of st.fallen) knownBlocked.add(jj);
  }

  /* ⚠️ LE TRAJET NE PASSE QUE PAR CE QUE L'ORACLE CONNAÎT. La première
     version appelait Maze.pathTo sur le labyrinthe ENTIER : elle traversait
     donc allègrement des cellules jamais vues, c'est-à-dire qu'elle trichait
     — l'outil mesurait un joueur qui connaît la carte, exactement ce qu'on
     voulait éviter. On interdit ici toute cellule inconnue, en plus des trous
     repérés. */
  function pathToCell(tx, ty) {
    const [cx, cy] = Rules.cellOf(CFG, st.px, st.pz);
    const blk = new Set(knownBlocked);
    for (let j = 0; j < known.length; j++) if (!known[j]) blk.add(j);
    return Maze.pathTo(m, cx, cy, tx, ty, blk);
  }

  /* Cellule connue la plus proche où l'on n'a jamais MIS LES PIEDS. Repli
     quand il n'y a plus de frontière joignable : on retourne fouiller ce
     qu'on a seulement entrevu. C'est aussi ce que fait un humain qui tourne
     en rond — il revient sur la salle qu'il a traversée sans regarder. */
  function nearestUnvisitedKnown() {
    const [cx, cy] = Rules.cellOf(CFG, st.px, st.pz);
    const seen = new Uint8Array(G * G);
    const q = [[cx, cy]];
    seen[m.idx(cx, cy)] = 1;
    for (let h = 0; h < q.length; h++) {
      const [x, y] = q[h];
      if (!visited[m.idx(x, y)]) return { x, y };
      for (const dir of m.DIRS) {
        if (!m.linked(x, y, dir)) continue;
        const nx = x + m.DX[dir], ny = y + m.DY[dir];
        const nj = m.idx(nx, ny);
        if (seen[nj] || knownBlocked.has(nj) || !known[nj]) continue;
        seen[nj] = 1; q.push([nx, ny]);
      }
    }
    return null;
  }

  /* La FRONTIÈRE : une cellule connue qui a un passage vers une cellule
     inconnue. C'est la définition d'exploration la plus simple qui donne un
     comportement humain — on va voir là où on n'est pas allé, en commençant
     par le plus proche. Le tri privilégie ensuite le NORD, parce qu'un joueur
     à qui on a dit « la sortie est au nord » remonte, et le jeu le lui dit
     (écran-titre + la sortie est le seul bord éclairé). */
  function nearestFrontier() {
    const [cx, cy] = Rules.cellOf(CFG, st.px, st.pz);
    const blk = new Set(knownBlocked);
    const seen = new Uint8Array(G * G);
    const q = [[cx, cy, 0]];
    seen[m.idx(cx, cy)] = 1;
    let best = null;
    for (let h = 0; h < q.length; h++) {
      const [x, y, d] = q[h];
      let frontier = false;
      for (const dir of m.DIRS) {
        if (!m.linked(x, y, dir)) continue;
        const nx = x + m.DX[dir], ny = y + m.DY[dir];
        if (!known[m.idx(nx, ny)]) frontier = true;
      }
      if (frontier && !(x === cx && y === cy)) {
        /* LE PHARE ENTRE ICI. On ne choisit plus la frontière la plus proche
           (ce qui faisait faire des allers-retours entre deux branches
           équidistantes, et zéro partie terminée en huit minutes) mais celle
           qui RAPPROCHE DE LA SORTIE, à coût de trajet comparable.

           Les deux termes disent exactement ce que voit un joueur : `d`, ce
           que ça coûte d'y aller ; `toExit`, la direction du phare. Le
           facteur 1,6 les met à peu près à égalité — on accepte de marcher
           un peu plus longtemps pour aller dans la bonne direction, jamais
           beaucoup plus. */
        const toExit = Math.hypot(x - m.exit.x, y - m.exit.y);
        const sc = d * 1.0 + toExit * 1.6;
        if (!best || sc < best.sc) best = { x, y, sc };
      }
      for (const dir of m.DIRS) {
        if (!m.linked(x, y, dir)) continue;
        const nx = x + m.DX[dir], ny = y + m.DY[dir];
        const nj = m.idx(nx, ny);
        if (seen[nj] || blk.has(nj) || !known[nj]) continue;
        seen[nj] = 1; q.push([nx, ny, d + 1]);
      }
    }
    return best;
  }

  function nearestTorch() {
    let best = null;
    for (const t of knownTorch.values()) {
      const p = pathToCell(t.x, t.y);
      if (!p) continue;
      if (!best || p.length < best.p.length) best = { t, p };
    }
    return best;
  }

  /* ⚠️ VERROU ANTI-OSCILLATION. Sans lui, la condition « flamme basse » se
     déclenchait à CHAQUE image tant qu'aucun brasier n'était joignable : le
     plan était refait soixante fois par seconde, et comme deux frontières
     voisines peuvent se départager d'un cheveu, l'oracle repartait
     alternativement vers l'une puis vers l'autre. On l'a vu tourner 400
     secondes en ne visitant que 67 cellules. Il ne se replanifie donc plus
     qu'à l'épuisement du plan, à sa invalidation, ou toutes les REPLAN_MIN
     secondes — ce qui est aussi, accessoirement, ce que fait un humain. */
  const REPLAN_MIN = 0.5;
  let replanT = 0;

  function replan() {
    replanT = REPLAN_MIN;
    goal = null;
    // 1. LA FLAMME PASSE AVANT TOUT. Le seuil de 0,45 n'est pas arbitraire :
    //    à FLAME_DRAIN il reste alors ~36 s de marche, soit ~43 cellules, ce
    //    qui couvre largement TORCH_MAX_GAP (11) plus une erreur de chemin.
    if (st.flame < 0.45) {
      const nt = nearestTorch();
      if (nt && nt.p.length * CFG.CELL / CFG.WALK_SPEED < st.flame / CFG.FLAME_DRAIN) {
        plan = nt.p; planI = 0; planKind = "torch"; goal = [nt.t.x, nt.t.y]; return;
      }
    }
    /* 2. L'ÉPÉE, dès qu'elle est en vue. Ce n'est pas de l'optimisation : un
          autel éclairé est la seule chose qui brille dans un couloir noir, et
          tout joueur y va. Ne pas le modéliser faisait passer l'oracle à côté
          de l'arme par pure indifférence, et gonflait artificiellement les
          morts « désarmé » que l'on cherchait justement à mesurer. */
    if (!st.hasSword && st.sword && !st.sword.taken && known[m.idx(st.sword.x, st.sword.y)]) {
      const p = pathToCell(st.sword.x, st.sword.y);
      if (p) { plan = p; planI = 0; planKind = "sword"; goal = [st.sword.x, st.sword.y]; return; }
    }
    if (exitKnown) {
      const p = pathToCell(m.exit.x, m.exit.y);
      if (p) { plan = p; planI = 0; planKind = "exit"; goal = [m.exit.x, m.exit.y]; return; }
    }
    const f = nearestFrontier();
    if (f) {
      const p = pathToCell(f.x, f.y);
      if (p) { plan = p; planI = 0; planKind = "explore"; goal = [f.x, f.y]; return; }
    }
    /* ⚠️ TROIS REPLIS AVANT D'ABANDONNER. La première version passait
       directement à « perdu » dès qu'aucune frontière n'était joignable —
       et « perdu » ne se relevait jamais : l'oracle restait immobile jusqu'à
       la fin du temps, et le rapport comptait ça comme une difficulté du
       labyrinthe. C'était un abandon de l'outil, pas du joueur.
       Un humain, lui, retourne fouiller ce qu'il a survolé, puis se remet
       simplement en marche. */
    const u = nearestUnvisitedKnown();
    if (u) {
      const p = pathToCell(u.x, u.y);
      if (p) { plan = p; planI = 0; planKind = "revisit"; goal = [u.x, u.y]; return; }
    }
    {
      // Dernier recours : une cellule connue au hasard, pour se remettre en
      // mouvement. Bouger révèle ; rester immobile ne révèle jamais rien.
      const pool = [];
      for (let j = 0; j < known.length; j++) if (known[j] && !knownBlocked.has(j)) pool.push(j);
      if (pool.length) {
        const j = pool[(Math.random() * pool.length) | 0];
        const p = pathToCell(j % G, (j / G) | 0);
        if (p && p.length) { plan = p; planI = 0; planKind = "wander"; goal = [j % G, (j / G) | 0]; return; }
      }
    }
    plan = null; planKind = "lost";
  }

  observe();
  replan();

  while (st.status === "play" && st.time < maxSeconds) {
    frames++;
    observe();

    // Replanification : chemin épuisé, chemin devenu invalide, ou flamme basse.
    replanT -= DT;
    if (!plan || planI >= plan.length) replan();
    else {
      const nextJ = m.idx(plan[planI][0], plan[planI][1]);
      if (knownBlocked.has(nextJ)) replan();
      else if (replanT <= 0 && planKind !== "torch" && st.flame < 0.42) replan();
    }

    const intent = { fwd: 0, strafe: 0, turn: 0, run: false, attack: false, use: false };

    /* ------------------------------------------------------------------
       LE COMBAT PASSE AVANT LA NAVIGATION.
       ------------------------------------------------------------------
       ⚠️ LA PREMIÈRE VERSION DE L'ORACLE NE SE RETOURNAIT JAMAIS : il ne
       frappait que ce qui se trouvait par hasard dans l'arc de son chemin.
       Résultat, 0 % de réussite et 60 % de morts par créature — un chiffre
       qui ne disait rien du jeu et tout de la bêtise de l'oracle. Un
       contrôle qui sort tout le catalogue a tort, pas le catalogue.

       Il fait maintenant ce que fait n'importe qui : quand une créature
       arrive à portée d'épée, il s'arrête, lui fait face et frappe. S'il
       n'a pas encore l'épée, il court. C'est le comportement minimal
       au-dessous duquel les chiffres ne mesurent plus le labyrinthe.
       ------------------------------------------------------------------ */
    let engaged = null;
    {
      const reach = CFG.SWING_RANGE + CFG.ROAMER_BODY_R;
      let best = null;
      for (const r of st.roamers) {
        if (r.dead) continue;
        const d = Math.hypot(r.x - st.px, r.z - st.pz);
        /* ⚠️ `reach + 0.6` ET NON `reach + 2.0`, et le mur compte. Avec la
           marge large, l'oracle s'arrêtait pour affronter une créature encore
           hors de portée — et si elle était derrière une cloison, elle ne
           venait jamais : il attendait 300 secondes en lui faisant face. On
           n'engage donc que ce qu'on peut RÉELLEMENT frapper maintenant. */
        if (d > reach + 0.6) continue;
        if (!Rules.canTouch(CFG, m, st.px, st.pz, r.x, r.z)) continue;
        if (!best || d < best.d) best = { e: r, d, radius: CFG.ROAMER_BODY_R };
      }
      if (st.stalkerAwake) {
        const s = st.stalker;
        const d = Math.hypot(s.x - st.px, s.z - st.pz);
        // Le traqueur n'est engagé QUE s'il est déjà sur nous : le frapper
        // ne le tue pas, ça n'achète que STALK_STAGGER_MS. S'arrêter pour lui
        // à cinq mètres serait perdre du temps contre un mur.
        if (d < CFG.SWING_RANGE + CFG.STALK_BODY_R && (!best || d < best.d) &&
            Rules.canTouch(CFG, m, st.px, st.pz, s.x, s.z)) {
          best = { e: s, d, radius: CFG.STALK_BODY_R };
        }
      }
      if (best && st.hasSword) engaged = best;
      else if (best && best.d < 4.5) intent.run = true;   // désarmé : on ne discute pas
    }

    if (engaged) {
      const dx = engaged.e.x - st.px, dz = engaged.e.z - st.pz;
      const want = Math.atan2(-dx, -dz);
      let diff = want - st.ang;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      intent.turn = Math.max(-1, Math.min(1, diff * 4.0));
      /* ⚠️ TROIS CAS, ET JAMAIS « NE RIEN FAIRE ». Les deux versions
         précédentes de cette ligne mettaient fwd à 0 dès que la créature
         n'était pas à bonne distance — et l'oracle restait alors immobile
         indéfiniment devant une créature qui ne venait pas (bloquée par un
         mur, coincée dans un coin, ou simplement plus lente que le recul
         qu'on venait de lui infliger). Ces blocages ressortaient dans le
         rapport comme des « temps écoulé », c'est-à-dire comme de la
         difficulté. C'était de la panne.

         On recule si elle est trop près (on veut frapper au BOUT de la
         portée, là où le recul infligé nous protège), on AVANCE si elle est
         trop loin, et on ne s'immobilise que dans la fenêtre où l'on frappe
         réellement. */
      const reachHere = CFG.SWING_RANGE + engaged.radius;
      intent.fwd = engaged.d < CFG.SWING_RANGE * 0.75 ? -1
        : engaged.d > reachHere ? 1 : 0;
      if (Math.abs(diff) < CFG.SWING_ARC / 2 && engaged.d <= CFG.SWING_RANGE + engaged.radius) {
        intent.attack = true;
      }
    } else if ((plan && planI < plan.length) || goal) {
      // Chemin épuisé mais but connu : on vise le centre de la case-but.
      const [tcx, tcy] = (plan && planI < plan.length) ? plan[planI] : goal;
      const [tx, tz] = Rules.centerOf(CFG, tcx, tcy);
      const dx = tx - st.px, dz = tz - st.pz;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.55) planI++;
      else {
        const want = Math.atan2(-dx, -dz);
        let diff = want - st.ang;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        intent.turn = Math.max(-1, Math.min(1, diff * 3.0));
        intent.fwd = Math.abs(diff) < 0.75 ? 1 : 0.25;
      }
    }

    // Brasier à portée et flamme entamée : on rallume.
    for (const t of st.torches) {
      if (t.spent) continue;
      const [tx, tz] = Rules.centerOf(CFG, t.x, t.y);
      if (Math.hypot(tx - st.px, tz - st.pz) <= CFG.TORCH_USE_RANGE && st.flame < 0.62) {
        intent.use = true; break;
      }
    }

    // Course : quand le traqueur est proche, et seulement alors. Elle le
    // renseigne (STALK_HEAR_RUN) mais elle sauve dans l'instant — c'est
    // exactement l'arbitrage qu'on veut que le joueur ait à faire, et
    // l'oracle le tranche de la façon la plus naïve qui soit.
    if (st.stalkerAwake && !engaged) {
      const d = Math.hypot(st.px - st.stalker.x, st.pz - st.stalker.z);
      if (d < 16) intent.run = true;
    }

    Rules.step(st, DT, intent);

    if (opts.trace && frames % 1200 === 0) {
      const [cx, cy] = Rules.cellOf(CFG, st.px, st.pz);
      let visN = 0; for (let i = 0; i < visited.length; i++) visN += visited[i];
      console.log(`t=${st.time.toFixed(0)}s cell=${cx},${cy} plan=${planKind} goal=${goal} planI=${planI}/${plan?plan.length:0} fl=${st.flame.toFixed(2)} hp=${st.hearts} sw=${st.hasSword} vis=${visN} exitKnown=${exitKnown}`);
    }

    // Détection de blocage : si l'oracle n'avance plus, on replanifie ; s'il
    // s'obstine, on abandonne la partie et on la COMPTE, plutôt que de la
    // laisser tourner jusqu'au temps maximum et fausser toutes les moyennes.
    /* ⚠️ DÉTECTEUR DE BLOCAGE, sur la CELLULE et non sur la position. Un
       oracle qui vibre d'un demi-centimètre entre deux murs « bouge » au sens
       des coordonnées, et l'ancien détecteur (distance parcourue par image)
       ne le voyait donc jamais. Changer de cellule, en revanche, est la
       définition même de progresser.

       Et il ABANDONNE au lieu de laisser courir le temps : un blocage compté
       comme « temps écoulé » se lit dans le rapport comme de la difficulté,
       alors que c'est une panne. Une cause de fin distincte est ce qui a
       permis de trouver les trois blocages successifs de ce chantier. */
    const [ccx, ccy] = Rules.cellOf(CFG, st.px, st.pz);
    if (ccx === lastCellX && ccy === lastCellY) {
      stuck += DT;
      if (stuck > 6 && stuck < 6 + DT * 1.5) { plan = null; goal = null; replan(); }
      if (stuck > 25) { stuckOut = true; break; }
    } else { stuck = 0; lastCellX = ccx; lastCellY = ccy; }
    lastX = st.px; lastZ = st.pz;
  }

  return {
    ok: true, seed,
    status: st.status, cause: stuckOut ? "stuck" : st.endCause,
    time: st.time, frames,
    score: st.score, shards: st.shardsTaken, kills: st.kills,
    hearts: st.hearts, flame: st.flame,
    torchesUsed: st.torchesUsed,
    seen: st.seen.size, cells: G * G,
    pathLen: m.pathLen,
    hadSword: st.hasSword,
    fallen: st.fallen.size,
  };
}

export function stats(arr) {
  if (!arr.length) return { n: 0 };
  const a = arr.slice().sort((x, y) => x - y);
  const sum = a.reduce((x, y) => x + y, 0);
  return {
    n: a.length,
    min: +a[0].toFixed(1),
    p25: +a[(a.length * 0.25) | 0].toFixed(1),
    med: +a[(a.length * 0.5) | 0].toFixed(1),
    p75: +a[(a.length * 0.75) | 0].toFixed(1),
    max: +a[a.length - 1].toFixed(1),
    avg: +(sum / a.length).toFixed(1),
  };
}
