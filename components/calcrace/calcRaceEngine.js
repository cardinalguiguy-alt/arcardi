/* ==========================================================================
   calcRaceEngine — moteur PUR de la Course de calcul mental (jeu n°20).
   Aucune dépendance React/Supabase ici : génération du paquet d'opérations
   partagé (même paquet pour tous les joueurs, mélange complet dès la
   première opération) et calcul de l'avancée selon la vitesse de réponse.
   Testé en Node avant intégration (voir commentaire de session).
   ========================================================================== */

export const DIFFS = ["easy", "medium", "hard"];

const DIFF_CONFIG = {
  easy: {
    opsTotal: 14,
    add: [1, 20], sub: [10, 30],
    mulA: [2, 10], mulB: [2, 10],
    divB: [2, 10], divQ: [2, 10],
    sqrtN: [2, 12],
    powBase: [2, 9], powExp: [2, 2],
    eqA: [2, 5], eqX: [1, 9], eqB: [1, 15],
  },
  medium: {
    opsTotal: 16,
    add: [20, 120], sub: [30, 150],
    mulA: [4, 15], mulB: [4, 12],
    divB: [3, 12], divQ: [4, 15],
    sqrtN: [11, 20],
    powBase: [2, 12], powExp: [2, 2],
    eqA: [2, 9], eqX: [1, 12], eqB: [1, 40],
  },
  hard: {
    opsTotal: 18,
    add: [100, 900], sub: [200, 999],
    mulA: [12, 30], mulB: [3, 9],
    divB: [4, 15], divQ: [12, 30],
    sqrtN: [21, 30],
    powBase: [2, 9], powExp: [2, 3],
    eqA: [3, 12], eqX: [2, 15], eqB: [5, 80],
  },
};

const KINDS = ["add", "sub", "mul", "div", "sqrt", "pow", "eq"];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Répartit les types d'opération le plus uniformément possible sur `total`
// tirages puis mélange l'ordre : garantit le "mélange complet dès le
// début" décidé (toutes les catégories actives dès la 1ère opération de la
// course), sans jamais regrouper deux mêmes types côte à côte par hasard
// plus que la moyenne.
function buildKindSequence(total) {
  const seq = [];
  while (seq.length < total) seq.push(...KINDS);
  return shuffle(seq.slice(0, total));
}

function genOp(kind, cfg) {
  switch (kind) {
    case "add": {
      const a = randInt(cfg.add[0], cfg.add[1]);
      const b = randInt(cfg.add[0], cfg.add[1]);
      return { kind, expr: `${a} + ${b} = ?`, answer: a + b };
    }
    case "sub": {
      const a = randInt(cfg.sub[0], cfg.sub[1]);
      const b = randInt(1, a);
      return { kind, expr: `${a} - ${b} = ?`, answer: a - b };
    }
    case "mul": {
      const a = randInt(cfg.mulA[0], cfg.mulA[1]);
      const b = randInt(cfg.mulB[0], cfg.mulB[1]);
      return { kind, expr: `${a} × ${b} = ?`, answer: a * b };
    }
    case "div": {
      const b = randInt(cfg.divB[0], cfg.divB[1]);
      const q = randInt(cfg.divQ[0], cfg.divQ[1]);
      const a = b * q;
      return { kind, expr: `${a} ÷ ${b} = ?`, answer: q };
    }
    case "sqrt": {
      const n = randInt(cfg.sqrtN[0], cfg.sqrtN[1]);
      return { kind, expr: `√${n * n} = ?`, answer: n };
    }
    case "pow": {
      const base = randInt(cfg.powBase[0], cfg.powBase[1]);
      const exp = randInt(cfg.powExp[0], cfg.powExp[1]);
      const sup = exp === 3 ? "³" : "²";
      return { kind, expr: `${base}${sup} = ?`, answer: Math.pow(base, exp) };
    }
    case "eq": {
      const a = randInt(cfg.eqA[0], cfg.eqA[1]);
      const x = randInt(cfg.eqX[0], cfg.eqX[1]);
      const b = randInt(cfg.eqB[0], cfg.eqB[1]);
      const c = a * x + b;
      return { kind, expr: `${a}x + ${b} = ${c}  →  x = ?`, answer: x };
    }
    default:
      return { kind: "add", expr: "1 + 1 = ?", answer: 2 };
  }
}

// Paquet d'opérations d'une course : même paquet envoyé à tous les joueurs
// par l'hôte (voir CalcRaceGame.js) — course strictement équitable.
export function generateDeck(diff) {
  const cfg = DIFF_CONFIG[diff] || DIFF_CONFIG.medium;
  return buildKindSequence(cfg.opsTotal).map(k => genOp(k, cfg));
}

export function opsTotalFor(diff) {
  return (DIFF_CONFIG[diff] || DIFF_CONFIG.medium).opsTotal;
}

/* ==========================================================================
   Avancée selon la vitesse de réponse (décision validée) : une réponse
   juste rapide fait avancer la voiture plus qu'une réponse juste lente,
   avec un PLANCHER (STEP_MIN) — une réponse juste reste toujours
   récompensée, même lente. Aucune pénalité en cas d'erreur (décidé) :
   computeStep n'est appelé qu'à la validation d'une bonne réponse.
   ========================================================================== */
export const STEP_MAX = 1;
export const STEP_MIN = 0.32;
export const FAST_MS = 1200;
export const SLOW_MS = 8000;

export function computeStep(responseTimeMs) {
  const t = Math.max(FAST_MS, Math.min(SLOW_MS, responseTimeMs));
  const ratio = (t - FAST_MS) / (SLOW_MS - FAST_MS);
  return STEP_MAX - ratio * (STEP_MAX - STEP_MIN);
}

// Distance "cible" de la course, calibrée sous la moyenne théorique des pas
// (0.62 plutôt que (STEP_MAX+STEP_MIN)/2 = 0.66) : un rythme moyen amène la
// voiture tout près de la ligne à la dernière opération, un rythme rapide
// atteint la ligne avant la fin du paquet (la voiture patiente à l'arrivée
// jusqu'à la dernière bonne réponse), un rythme lent finit son paquet un
// peu avant la ligne — dans ce dernier cas la voiture est amenée
// (translation visuelle) jusqu'à la ligne au moment de la Nème réponse
// juste, qui met fin à la manche dans tous les cas.
export function targetDistance(diff) {
  return opsTotalFor(diff) * 0.62;
}
