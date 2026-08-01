/* =============================================================================
   verify-maze.mjs — LES GARANTIES DU GÉNÉRATEUR, sur des milliers de dédales.
   -----------------------------------------------------------------------------
   Principe central du projet : ne pas vérifier la règle qu'on a écrite,
   vérifier le RÉSULTAT qu'on promet. verify-gate ne contrôle pas que le
   couloir a été creusé, il contrôle qu'on ARRIVE à la porte ; verify-levels
   ne relit aucune géométrie, il CHERCHE UNE SOLUTION. Celui-ci ne relit
   aucune constante : il refait, sur chaque dédale, les parcours en largeur
   qui décident si le jeu est jouable.

   LES SIX PROMESSES CONTRÔLÉES, et ce qu'un échec voudrait dire :

   1. LA SORTIE EST ATTEIGNABLE, tous les trous ouverts posés. Sinon le joueur
      cherche une issue qui n'existe pas, sans aucun moyen de le savoir. C'est
      la promesse la plus importante du fichier.

   2. ELLE L'EST ENCORE SI TOUTES LES DALLES FÊLÉES SONT TOMBÉES. Le joueur
      marche dessus, elles s'effondrent derrière lui : si l'une d'elles coupait
      le seul accès restant, il serait enfermé SANS AVOIR FAIT D'ERREUR.

   3. LE CHEMIN TIENT DANS LA BANDE [MAZE_MIN_PATH, MAZE_MAX_PATH]. Hors bande,
      la difficulté est tirée au sort avant le premier pas (voir make() dans
      maze.js : la version sans borne haute produisait des parties de 3 à 20
      minutes).

   4. AUCUN ÉCART DE PLUS DE TORCH_MAX_GAP CELLULES ENTRE DEUX BRASIERS sur le
      chemin de référence. C'est la garantie qui rend la torche tendue au lieu
      d'injuste : sans elle, une graine peut condamner le joueur à l'extinction
      quoi qu'il fasse.

   5. L'ÉPÉE EXISTE, elle est à SWORD_MAX_DEPTH au plus, et AUCUN RÔDEUR n'est
      posé avant elle plus le parvis. C'est la contrepartie du choix de
      Guillaume (« épée trouvée ») : on commence désarmé, donc la période
      désarmée doit être bornée par une garantie, pas par une probabilité.

   6. AUCUN TROU NI BRASIER NI ÉCLAT SUR UNE CELLULE MURÉE. Un objet posé dans
      la pierre est invisible et inatteignable, et c'est le genre de perte
      silencieuse qui fausse un budget (un brasier « existant » mais hors
      d'atteinte casse la promesse n°4 sans la faire échouer).

   ⚠️ CE QU'IL NE PROUVE PAS : rien de l'équilibrage (c'est simulate-maze.mjs
   et batch-maze.mjs), rien du rendu (smoke-render.mjs), rien du plaisir. Un
   labyrinthe peut passer les six contrôles et être ennuyeux.

   Usage : node tools/verify-maze.mjs [nombre de graines]
   ========================================================================== */

import { load } from "./lib-play.mjs";

const SEEDS = Number(process.argv[2] || 3000);
const { CFG, Maze, Rules } = load();

const errors = [];
function fail(seed, msg) { if (errors.length < 20) errors.push(`graine ${seed} : ${msg}`); }

let nGaps = 0, nCracks = 0, nTorches = 0, nRooms = 0, nBraid = 0;
let pathMin = 1e9, pathMax = 0, pathSum = 0;
let gapMax = 0, gapSum = 0, gapN = 0;
let swordMin = 1e9, swordMax = 0;
let attempts = 0;

const t0 = Date.now();
for (let s = 1; s <= SEEDS; s++) {
  const m = Maze.generate(CFG, s);
  if (!m) { fail(s, "génération impossible"); continue; }
  const st = Rules.create(CFG, m, s);
  attempts += m.attempts;

  // --- 1. sortie atteignable avec les trous ouverts
  if (!Maze.reachable(m, st.gaps)) fail(s, "la sortie n'est PAS atteignable avec les trous ouverts");

  // --- 2. ... et avec TOUTES les dalles fêlées tombées
  const worst = new Set(st.gaps);
  for (const c of m.cracks) worst.add(m.idx(c.x, c.y));
  if (!Maze.reachable(m, worst)) fail(s, "la sortie est perdue si toutes les dalles fêlées tombent");

  // --- 3. bande de longueur
  if (m.pathLen < CFG.MAZE_MIN_PATH || m.pathLen > CFG.MAZE_MAX_PATH) {
    fail(s, `chemin de ${m.pathLen} cellules, hors bande [${CFG.MAZE_MIN_PATH}, ${CFG.MAZE_MAX_PATH}]`);
  }
  pathMin = Math.min(pathMin, m.pathLen); pathMax = Math.max(pathMax, m.pathLen); pathSum += m.pathLen;

  // --- 4. écart maximal entre deux brasiers SUR LE CHEMIN
  //     On mesure l'écart réel, pas la règle de pose : c'est la différence
  //     entre contrôler ce qu'on a écrit et contrôler ce qu'on promet.
  {
    const onPath = new Set(m.torches.filter(t => t.onPath).map(t => m.idx(t.x, t.y)));
    let last = 0, worstGap = 0;
    for (let i = 0; i < m.path.length; i++) {
      if (!onPath.has(m.idx(m.path[i][0], m.path[i][1]))) continue;
      worstGap = Math.max(worstGap, i - last);
      last = i;
    }
    worstGap = Math.max(worstGap, (m.path.length - 1) - last);
    if (worstGap > CFG.TORCH_MAX_GAP) {
      fail(s, `${worstGap} cellules sans brasier sur le chemin (plafond ${CFG.TORCH_MAX_GAP})`);
    }
    gapMax = Math.max(gapMax, worstGap); gapSum += worstGap; gapN++;
  }

  // --- 5. l'épée, et le désarmement borné
  if (!m.sword) fail(s, "aucune épée posée");
  else {
    if (m.sword.depth > CFG.SWORD_MAX_DEPTH) fail(s, `épée à la profondeur ${m.sword.depth} (plafond ${CFG.SWORD_MAX_DEPTH})`);
    swordMin = Math.min(swordMin, m.sword.depth); swordMax = Math.max(swordMax, m.sword.depth);
    const safe = m.sword.depth + CFG.SANCTUARY_MARGIN;
    for (const r of m.roamers) {
      const d = m.dEntry[m.idx(r.x, r.y)];
      if (d <= m.sword.depth + 1) fail(s, `rôdeur posé à la profondeur ${d}, avant l'épée (${m.sword.depth})`);
    }
    // Le parvis doit être NON VIDE et contenir l'épée : sinon la garantie
    // « on ne meurt pas avant d'avoir pu s'armer » n'a plus de support.
    if (!st.sanctuary.has(m.idx(m.sword.x, m.sword.y))) fail(s, "l'épée est hors du parvis");
    void safe;
  }

  // --- 6. rien dans la pierre
  const buried = (x, y) => !m.cells[m.idx(x, y)];
  for (const g of m.gaps) if (buried(g.x, g.y)) fail(s, "trou posé dans une cellule murée");
  for (const t of m.torches) if (buried(t.x, t.y)) fail(s, "brasier posé dans une cellule murée");
  for (const sh of m.shards) if (buried(sh.x, sh.y)) fail(s, "éclat posé dans une cellule murée");
  if (m.sword && buried(m.sword.x, m.sword.y)) fail(s, "épée posée dans une cellule murée");

  nGaps += m.gaps.length; nCracks += m.cracks.length; nTorches += m.torches.length;
  nRooms += m.rooms.length;
  for (let i = 0; i < m.G * m.G; i++) { const c = m.cells[i]; if (c && (c & (c - 1)) === 0) nBraid++; }
}

const avg = (n) => +(n / SEEDS).toFixed(2);
console.log(`\n=== ${SEEDS} labyrinthes générés et contrôlés en ${((Date.now() - t0) / 1000).toFixed(1)} s ===\n`);
console.log(`  chemin entrée→sortie   min ${pathMin}  moy ${(pathSum / SEEDS).toFixed(1)}  max ${pathMax}  (bande ${CFG.MAZE_MIN_PATH}..${CFG.MAZE_MAX_PATH})`);
console.log(`  écart max sans brasier moy ${(gapSum / gapN).toFixed(1)}  max ${gapMax}  (plafond ${CFG.TORCH_MAX_GAP})`);
console.log(`  profondeur de l'épée   ${swordMin}..${swordMax}  (plafond ${CFG.SWORD_MAX_DEPTH})`);
console.log(`  par dédale : ${avg(nGaps)} trous · ${avg(nCracks)} dalles fêlées · ${avg(nTorches)} brasiers · ${avg(nRooms)} salles · ${avg(nBraid)} culs-de-sac`);
console.log(`  essais de génération   ${(attempts / SEEDS).toFixed(2)} par dédale (1,00 = aucun rejet)`);

if (errors.length) {
  console.log(`\n⚠️  ${errors.length} PROBLÈME(S) :`);
  for (const e of errors) console.log("   " + e);
  process.exit(1);
}
console.log("\nLes six garanties tiennent sur toutes les graines.\n");
console.log(`Ce script ne prouve RIEN de l'équilibrage (voir batch-maze.mjs et
report-maze.mjs), RIEN du rendu (smoke-render.mjs), et rien du plaisir. Un
labyrinthe peut passer les six contrôles et rester ennuyeux.\n`);
