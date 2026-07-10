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
//   2. Contraintes certaines (proba 1) : le bot pioche dedans... la plupart
//      du temps — il lui arrive d'en RATER une (voir plus bas).
//   3. Dynamite : si elle est encore disponible, le bot la garde pour un
//      moment RENTABLE ou DÉCISIF — espérance suffisante dans le meilleur
//      carré 3×3, OU l'adversaire est à 1-2 pépites de la victoire (coup de
//      poker défensif), OU il peut lui-même conclure la partie avec. Et il
//      lui arrive de ne même pas y penser ce tour-ci.
//   4. Sinon, pioche parmi les cases les PLUS probables — pas forcément LA
//      meilleure : tout le voisinage des bonnes probabilités est éligible,
//      comme un humain qui joue "dans la bonne zone" sans calculer au %.
//   5. Imperfection assumée (~15 %) : un coup "au jugé".
//
// NERF 2026-07 (retour du porteur de projet : "bots trop cheatés") : coups
// au jugé 8 % -> 15 %, contraintes certaines ratées 1 fois sur 4, fenêtre
// d'ex æquo élargie (85 % de la meilleure proba), dynamite plus exigeante
// (espérance >= 2.4) et oubliée ~20 % des tours. Mesuré par simulation :
// le bot nerfé perd nettement plus souvent face à l'ancien (voir zip 60),
// tout en restant un adversaire crédible.
//
// Triche structurellement impossible : le bot ne lit QUE les chiffres des
// cases révélées et le compteur global de pépites restantes — jamais
// mine.nugget des cases cachées.
// ==========================================================================

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

export function decideBotMove(mine, revealed, { bombAvailable = false, myGold = 0, oppGold = 0 } = {}) {
  const { hidden, prob, certain } = probMap(mine, revealed);
  if (hidden.length === 0) return null;

  // ~26 % : coup au jugé (jamais la dynamite au jugé) — NERF 2026-07 (v2).
  // Le porteur de projet trouvait le bot "quasiment imbattable" : mesuré par
  // simulation (voir gm_sim), l'ancien réglage (15 %) perdait déjà 73 % face
  // à un jeu PARFAIT, mais restait redoutable face à un humain réel qui ne
  // calcule pas au pourcent près. On monte donc franchement le taux d'erreurs
  // VISIBLES (coups au hasard + bourdes assumées) : le bot écrase encore un
  // joueur aléatoire (~100 %) mais un bon joueur le bat largement (~92 %).
  if (Math.random() < 0.26) return { type: "dig", idx: hidden[Math.floor(Math.random() * hidden.length)] };

  // La dynamite ne lui "vient à l'esprit" que ~65 % des tours : un humain
  // concentré sur ses chiffres oublie régulièrement son bâton dans le sac.
  if (bombAvailable && Math.random() < 0.65) {
    // Meilleur carré 3×3 par espérance de pépites.
    let bestIdx = -1, bestExp = 0;
    for (const i of hidden) {
      let exp = 0;
      for (const c of bombSquare(i)) if (!revealed[c]) exp += prob[c] || 0;
      if (exp > bestExp) { bestExp = exp; bestIdx = i; }
    }
    const oppAboutToWin = oppGold >= GM_WIN_AT - 2;
    const canFinish = GM_WIN_AT - myGold <= Math.floor(bestExp);
    // Seuil relevé 2.4 -> 2.8 (nerf v2) : il ne dynamite plus qu'au VRAI
    // filon, sauf coup décisif/défensif.
    if (bestIdx !== -1 && (bestExp >= 2.8 || oppAboutToWin || canFinish)) {
      return { type: "bomb", idx: bestIdx };
    }
  }

  // Contraintes certaines : jouées seulement ~55 % du temps (nerf v2) — le
  // bot rate désormais souvent une déduction pourtant sûre, comme un joueur
  // qui ne voit pas TOUT ce que la grille lui souffle.
  if (certain.length > 0 && Math.random() < 0.55) {
    return { type: "dig", idx: certain[Math.floor(Math.random() * certain.length)] };
  }

  let best = -1;
  for (const i of hidden) if (prob[i] > best) best = prob[i];

  // BOURDE assumée (~12 %, nerf v2) : au lieu de viser la bonne zone, le bot
  // pioche franchement dans les cases les MOINS probables — l'erreur bien
  // visible que réclamait le porteur de projet (il "creuse à côté").
  if (Math.random() < 0.12) {
    let worst = Infinity;
    for (const i of hidden) if (prob[i] < worst) worst = prob[i];
    const badCells = hidden.filter(i => prob[i] <= worst + 1e-9);
    return { type: "dig", idx: badCells[Math.floor(Math.random() * badCells.length)] };
  }

  // Fenêtre encore élargie (>= 62 % de la meilleure proba, nerf v2) : le bot
  // joue "à peu près dans la bonne zone", loin du choix optimal au pourcent.
  const bestCells = hidden.filter(i => prob[i] >= best * 0.62 - 1e-9);
  return { type: "dig", idx: bestCells[Math.floor(Math.random() * bestCells.length)] };
}
