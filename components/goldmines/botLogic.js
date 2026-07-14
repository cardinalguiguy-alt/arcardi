import { neighborsOf, bombSquare, nuggetsLeft, GM_WIN_AT } from "./mines";

// ==========================================================================
// Décision d'un bot pour son coup. Renvoie { type:"dig", idx } ou
// { type:"bomb", idx } (idx = case visée / centre du carré de dynamite).
//
// Heuristique de démineur inversé, volontairement lisible :
//   1. Carte de probabilités par case cachée : pour chaque chiffre révélé,
//      (pépites manquantes / voisines cachées) ; une contrainte satisfaite
//      met ses voisines cachées à 0 (sûrement vides) ; ailleurs, densité
//      globale restante.
//   2. Contraintes certaines (proba 1) : le bot pioche dedans... plus ou
//      moins souvent selon le niveau.
//   3. Dynamite : si elle est encore disponible, le bot la garde pour un
//      moment RENTABLE ou DÉCISIF — espérance suffisante dans le meilleur
//      carré 3×3, OU l'adversaire est à 1-2 pépites de la victoire (coup de
//      poker défensif), OU il peut lui-même conclure la partie avec.
//   4. Sinon, pioche parmi les cases les PLUS probables — pas forcément LA
//      meilleure : le voisinage des bonnes probabilités est éligible, comme
//      un humain qui joue "dans la bonne zone" sans calculer au %.
//   5. Imperfection assumée : des coups "au jugé" et des bourdes visibles.
//
// ---------------------------------------------------------------------------
// TROIS NIVEAUX DE DIFFICULTÉ (ajout 2026-07) — pilotés par un simple jeu de
// paramètres (GM_BOT_PARAMS), la logique ci-dessous étant IDENTIQUE pour les
// trois. Le niveau MOYEN reproduit À L'IDENTIQUE le bot historique (mêmes
// constantes que le réglage "nerf v2" précédent) : c'est la référence
// explicitement demandée. FACILE affaiblit franchement le bot (beaucoup de
// coups au hasard, déductions sûres souvent manquées, bourdes fréquentes,
// dynamite quasi jamais bien employée) ; EXPERT le rend quasi optimal (zéro
// coup au hasard, zéro bourde, TOUTES les déductions certaines jouées,
// toujours la meilleure case, dynamite dégainée dès un filon rentable).
//
//   - randomGuess : proba d'un coup au hasard pur (jamais la dynamite).
//   - bombConsider : proba que la dynamite lui "vienne à l'esprit" ce tour.
//   - bombThreshold : espérance minimale de pépites dans le meilleur carré 3×3
//     pour qu'il la dégaine (hors coup décisif/défensif).
//   - certainPlay : proba de jouer une déduction certaine quand il en existe.
//   - blunder : proba d'une bourde (creuse franchement dans les pires cases).
//   - window : largeur de la "bonne zone" (fraction de la meilleure proba
//     encore jugée éligible — 1 = uniquement la toute meilleure case).
//
// Triche structurellement impossible à tous les niveaux : le bot ne lit QUE
// les chiffres des cases révélées et le compteur global de pépites restantes
// — jamais mine.nugget des cases cachées.
// ==========================================================================

export const GM_DIFFICULTIES = ["easy", "medium", "expert"];
export const GM_DEFAULT_DIFFICULTY = "medium";

export const GM_BOT_PARAMS = {
  // FACILE — nettement battable : joue souvent au hasard, rate la plupart des
  // déductions sûres, se trompe volontiers de zone, et n'exploite presque
  // jamais correctement sa dynamite.
  easy:   { randomGuess: 0.55, bombConsider: 0.30, bombThreshold: 3.6, certainPlay: 0.25, blunder: 0.32, window: 0.30 },
  // MOYEN — le bot historique, inchangé (référence demandée).
  medium: { randomGuess: 0.26, bombConsider: 0.65, bombThreshold: 2.8, certainPlay: 0.55, blunder: 0.12, window: 0.62 },
  // EXPERT — quasi optimal : aucun coup au hasard ni bourde, toutes les
  // déductions certaines jouées, toujours la meilleure case, dynamite
  // dégainée dès un filon vraiment rentable.
  expert: { randomGuess: 0.0,  bombConsider: 1.0,  bombThreshold: 2.4, certainPlay: 1.0,  blunder: 0.0,  window: 1.0  },
};

function probMap(mine, revealed) {
  const n = mine.nugget.length;
  const hidden = [];
  for (let i = 0; i < n; i++) if (!revealed[i]) hidden.push(i);
  const prob = {};
  const baseP = hidden.length ? nuggetsLeft(mine, revealed) / hidden.length : 0;
  for (const i of hidden) prob[i] = baseP;
  const certain = [];
  for (let i = 0; i < n; i++) {
    if (!revealed[i] || mine.nugget[i] || mine.adj[i] === 0) continue;
    const nbs = neighborsOf(i);
    const hiddenNbs = nbs.filter(j => !revealed[j]);
    if (hiddenNbs.length === 0) continue;
    const foundNbs = nbs.filter(j => revealed[j] && mine.nugget[j]).length;
    const remaining = mine.adj[i] - foundNbs;
    if (remaining <= 0) { for (const j of hiddenNbs) prob[j] = 0; continue; }
    const p = remaining / hiddenNbs.length;
    if (p >= 1) certain.push(...hiddenNbs);
    else for (const j of hiddenNbs) prob[j] = Math.max(prob[j], p);
  }
  return { hidden, prob, certain };
}

export function decideBotMove(mine, revealed, { bombAvailable = false, myGold = 0, oppGold = 0, difficulty = GM_DEFAULT_DIFFICULTY } = {}) {
  const P = GM_BOT_PARAMS[difficulty] || GM_BOT_PARAMS[GM_DEFAULT_DIFFICULTY];
  const { hidden, prob, certain } = probMap(mine, revealed);
  if (hidden.length === 0) return null;

  // Coup au jugé (jamais la dynamite au jugé). Fréquence selon le niveau :
  // très fréquent en FACILE, jamais en EXPERT.
  if (Math.random() < P.randomGuess) return { type: "dig", idx: hidden[Math.floor(Math.random() * hidden.length)] };

  // La dynamite ne lui "vient à l'esprit" qu'une fraction des tours (selon le
  // niveau) : un humain concentré sur ses chiffres oublie son bâton dans le sac.
  if (bombAvailable && Math.random() < P.bombConsider) {
    // Meilleur carré 3×3 par espérance de pépites.
    let bestIdx = -1, bestExp = 0;
    for (const i of hidden) {
      let exp = 0;
      for (const c of bombSquare(i)) if (!revealed[c]) exp += prob[c] || 0;
      if (exp > bestExp) { bestExp = exp; bestIdx = i; }
    }
    const oppAboutToWin = oppGold >= GM_WIN_AT - 2;
    const canFinish = GM_WIN_AT - myGold <= Math.floor(bestExp);
    if (bestIdx !== -1 && (bestExp >= P.bombThreshold || oppAboutToWin || canFinish)) {
      return { type: "bomb", idx: bestIdx };
    }
  }

  // Contraintes certaines : jouées selon le niveau (toujours en EXPERT,
  // rarement en FACILE) — le bot peut "ne pas voir" une déduction pourtant sûre.
  if (certain.length > 0 && Math.random() < P.certainPlay) {
    return { type: "dig", idx: certain[Math.floor(Math.random() * certain.length)] };
  }

  let best = -1;
  for (const i of hidden) if (prob[i] > best) best = prob[i];

  // BOURDE assumée : au lieu de viser la bonne zone, le bot pioche franchement
  // dans les cases les MOINS probables ("il creuse à côté"). Jamais en EXPERT.
  if (Math.random() < P.blunder) {
    let worst = Infinity;
    for (const i of hidden) if (prob[i] < worst) worst = prob[i];
    const badCells = hidden.filter(i => prob[i] <= worst + 1e-9);
    return { type: "dig", idx: badCells[Math.floor(Math.random() * badCells.length)] };
  }

  // Fenêtre de la "bonne zone" (fraction de la meilleure proba). En EXPERT
  // (window = 1) le bot ne retient que la toute meilleure case ; en FACILE il
  // joue "à peu près par là", très loin de l'optimum.
  const bestCells = hidden.filter(i => prob[i] >= best * P.window - 1e-9);
  return { type: "dig", idx: bestCells[Math.floor(Math.random() * bestCells.length)] };
}
