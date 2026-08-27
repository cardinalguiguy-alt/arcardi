// =============================================================================
// Bots des Petits Chevaux — livraison solo 2026-08-27
// -----------------------------------------------------------------------------
// Ce module ne lance aucun dé et ne modifie aucun état : il ne fait que choisir
// parmi les coups que l'arbitre hôte a déjà déclarés légaux. Le composant garde
// donc UNE mécanique pour les humains et les bots ; inventer ici une seconde
// version de canMoveToken/applyMove ferait diverger le solo du multijoueur.
// =============================================================================

export const LUDO_SOLO_BOTS = Object.freeze([
  Object.freeze({ id: "__ludo_bot_green__", color: "green", nameKey: "ludoBotGreen" }),
  Object.freeze({ id: "__ludo_bot_yellow__", color: "yellow", nameKey: "ludoBotYellow" }),
  Object.freeze({ id: "__ludo_bot_blue__", color: "blue", nameKey: "ludoBotBlue" }),
]);

const BOT_IDS = new Set(LUDO_SOLO_BOTS.map((bot) => bot.id));

export function isLudoBotId(id) {
  return BOT_IDS.has(String(id || ""));
}

export function ludoBotNameKey(id) {
  return LUDO_SOLO_BOTS.find((bot) => bot.id === id)?.nameKey || null;
}

// Le joueur solo garde le Rouge, donc le premier tour. À deux camps, son seul
// adversaire prend le Jaune, diagonalement opposé comme dans le duel humain ;
// à trois et quatre camps, l'ordre horaire historique est conservé. Les IDs
// synthétiques vivent uniquement dans la sauvegarde Ludo et ne prétendent
// jamais être des profils Supabase.
export function ludoSoloMatch(humanId, requestedBotCount = 1) {
  const id = String(humanId || "");
  const botCount = Math.max(1, Math.min(3, Math.trunc(+requestedBotCount || 1)));
  const order = botCount === 1
    ? ["red", "yellow"]
    : ["red", "green", "yellow", "blue"].slice(0, botCount + 1);
  const colorOfPlayer = { [id]: "red" };
  for (const color of order.slice(1)) {
    const bot = LUDO_SOLO_BOTS.find((candidate) => candidate.color === color);
    colorOfPlayer[bot.id] = bot.color;
  }
  return { order, colorOfPlayer };
}

function optionValue(dice, die) {
  if (die === "sum") return (+dice.a || 0) + (+dice.b || 0);
  return die === 0 ? +dice.a || 0 : +dice.b || 0;
}

function moveOptions(plan) {
  const out = [];
  for (const tokenIndex of plan?.d0 || []) out.push({ tokenIndex, die: 0 });
  for (const tokenIndex of plan?.d1 || []) out.push({ tokenIndex, die: 1 });
  for (const tokenIndex of plan?.sum || []) out.push({ tokenIndex, die: "sum" });
  return out;
}

// Stratégie volontairement lisible : finir > rentrer dans le couloir > capturer
// > sortir de l'enclos > progresser. Le très léger tirage final ne change que
// les égalités exactes, pour éviter que les trois bots rejouent toujours la même
// chorégraphie. `simulateMove` est le VRAI applyMove du composant.
export function chooseLudoBotMove({ tokens, color, dice, movablePlan, simulateMove, rng = Math.random }) {
  if (!tokens?.[color] || !dice || typeof simulateMove !== "function") return null;
  const options = moveOptions(movablePlan);
  if (!options.length) return null;

  let best = null;
  for (const option of options) {
    const before = +tokens[color][option.tokenIndex] || 0;
    const value = optionValue(dice, option.die);
    const result = simulateMove(option.tokenIndex, value);
    const after = +result?.tokens?.[color]?.[option.tokenIndex] || 0;
    const captured = Array.isArray(result?.captured) ? result.captured : [];
    const capturedAdvance = captured.reduce((sum, [other, idx]) => sum + (+tokens?.[other]?.[idx] || 0), 0);

    let score = Math.max(0, after - before) * 90;
    if (before === 0 && after === 1) score += 2800;
    if (before <= 55 && after >= 56) score += 6500;
    if (after === 61) score += 28000;
    if (result?.won) score += 1000000;
    score += captured.length * 9000 + capturedAdvance * 35;

    // Employer la somme sacrifie les deux dés. À bénéfice strictement égal,
    // garder un second déplacement possible est plus intéressant.
    if (option.die === "sum") score -= 120;
    score += Math.max(0, Math.min(0.999, +rng() || 0));

    if (!best || score > best.score) best = { ...option, score };
  }
  return best ? { tokenIndex: best.tokenIndex, die: best.die } : null;
}

// Épargner donne une relance, mais laisse aussi intact le pion qu'on vient de
// rejoindre. Le bot choisit la règle sûre et compréhensible : il capture. Ce
// choix fixe évite un pile-ou-face opaque sur l'unique décision morale du Ludo.
export function chooseLudoBotSpare() {
  return false;
}

// Pour un renvoi, viser le pion le plus avancé est toujours cohérent. Pour un
// échange, le composant fournit `scoreSwap`, calculé avec ses vrais repères de
// couleur (absIndex/stepsFromAbs) : recopier ces repères ici reproduirait deux
// géométries du plateau, le genre de divergence que le correctif du swap avait
// précisément supprimé.
export function chooseLudoBotTarget({ tokens, order, color, tokenIdx, kind, scoreSwap }) {
  const candidates = [];
  for (const other of order || []) {
    if (other === color) continue;
    (tokens?.[other] || []).forEach((steps, targetIdx) => {
      if (steps < 1 || steps > 55) return;
      const score = kind === "swapPlaces" && typeof scoreSwap === "function"
        ? scoreSwap({ targetColor: other, targetIdx })
        : steps;
      candidates.push({ targetColor: other, targetIdx, score, steps });
    });
  }
  candidates.sort((a, b) => b.score - a.score || b.steps - a.steps || a.targetColor.localeCompare(b.targetColor) || a.targetIdx - b.targetIdx);
  return candidates[0] ? { targetColor: candidates[0].targetColor, targetIdx: candidates[0].targetIdx } : null;
}

// Une seule table de décision pour les cinq phases où un bot peut agir. Le
// composant ne choisit plus lui-même si une roue passe avant un dé : il ne fait
// que traduire cette action vers l'arbitre hôte correspondant.
export function ludoBotActionForState({ state, color, simulateMove, scoreSwap, rng = Math.random }) {
  if (!state || state.winner) return null;
  if (state.pendingMystery) return state.pendingMystery.spin ? null : { type: "spin" };
  if (state.pendingCapture) return { type: "spare", spare: chooseLudoBotSpare() };
  if (state.pendingTarget) {
    const pending = state.pendingTarget;
    const target = chooseLudoBotTarget({
      tokens: state.tokens, order: state.order, color: pending.color,
      tokenIdx: pending.tokenIdx, kind: pending.kind, scoreSwap,
    });
    return { type: "target", targetColor: target?.targetColor || null, targetIdx: target?.targetIdx ?? -1 };
  }
  if (!state.dice) return { type: "roll" };
  if (!state.movablePlan) return null;
  const move = chooseLudoBotMove({
    tokens: state.tokens, color, dice: state.dice, movablePlan: state.movablePlan,
    simulateMove, rng,
  });
  return move ? { type: "move", ...move } : null;
}
