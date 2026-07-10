import { neighborsOf, nuggetsLeft } from "./mines";

// ==========================================================================
// Décision d'un bot pour son coup de pioche. Renvoie l'INDEX de la case à
// piocher. Heuristique de démineur inversé, volontairement lisible :
//
//   1. Contraintes certaines : pour chaque chiffre révélé, si le nombre de
//      pépites qui lui manquent égale son nombre de voisines cachées,
//      TOUTES ces voisines sont des pépites -> le bot pioche dedans.
//   2. Sinon, probabilité estimée par case cachée : le max de
//      (pépites manquantes / voisines cachées) sur les contraintes qui la
//      touchent, sinon la densité globale restante. Le bot pioche une case
//      parmi les meilleures (choix aléatoire entre ex æquo, pour ne pas
//      être une horloge).
//   3. Imperfection assumée (~10%) : un coup "au jugé" dans une case
//      cachée quelconque — un bot infaillible serait insupportable en
//      face, exactement comme l'oubli d'UNO des bots de Chromatik.
//
// `revealed` : map idx -> truthy pour toute case déjà révélée.
// La triche est structurellement impossible : le bot ne lit QUE adj des
// cases révélées et la densité restante — jamais mine.nugget des cachées
// (sauf via nuggetsLeft, un simple compteur global connu de tous).
// ==========================================================================
export function decideBotDig(mine, revealed) {
  const n = mine.nugget.length;
  const hidden = [];
  for (let i = 0; i < n; i++) if (!revealed[i]) hidden.push(i);
  if (hidden.length === 0) return null;

  // ~10% : coup au jugé.
  if (Math.random() < 0.1) return hidden[Math.floor(Math.random() * hidden.length)];

  const prob = {};
  const baseP = nuggetsLeft(mine, revealed) / hidden.length;
  for (const i of hidden) prob[i] = baseP;

  const certain = [];
  for (let i = 0; i < n; i++) {
    if (!revealed[i] || mine.nugget[i] || mine.adj[i] === 0) continue;
    const nbs = neighborsOf(i);
    const hiddenNbs = nbs.filter(j => !revealed[j]);
    if (hiddenNbs.length === 0) continue;
    const foundNbs = nbs.filter(j => revealed[j] && mine.nugget[j]).length;
    const remaining = mine.adj[i] - foundNbs;
    if (remaining <= 0) {
      // Contrainte satisfaite : ses voisines cachées sont SÛREMENT vides.
      for (const j of hiddenNbs) prob[j] = 0;
      continue;
    }
    const p = remaining / hiddenNbs.length;
    if (p >= 1) certain.push(...hiddenNbs);
    else for (const j of hiddenNbs) prob[j] = Math.max(prob[j], p);
  }

  if (certain.length > 0) return certain[Math.floor(Math.random() * certain.length)];

  let best = -1;
  for (const i of hidden) if (prob[i] > best) best = prob[i];
  const bestCells = hidden.filter(i => prob[i] >= best - 1e-9);
  return bestCells[Math.floor(Math.random() * bestCells.length)];
}
