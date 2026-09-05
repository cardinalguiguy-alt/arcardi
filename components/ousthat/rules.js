/*
 * Règles pures de « Où's that ? ».
 *
 * La formule de score est propre à Arcardi. Elle n'est pas présentée comme
 * celle de GeoGuessr : 5 000 points jusqu'à 25 m, puis une décroissance
 * exponentielle à l'échelle mondiale (2 000 km). Au-delà de la tolérance,
 * le plafond est explicitement 4 999 afin que « score parfait » garde un
 * sens stable malgré l'arrondi à l'entier.
 */

export const GAME_ID = "ousthat";
export const MAX_GEO_SCORE = 5000;
export const PERFECT_DISTANCE_KM = 0.025;
export const SCORE_DECAY_KM = 2000;
export const EARTH_RADIUS_KM = 6371.0088;

export const DEFAULT_CONFIG = Object.freeze({
  initialHp: 6000,
  roundSeconds: 120,
  finalSeconds: 15,
  multipliers: true,
  multiplierStartRound: 5,
  multiplierIncrement: 0.5,
});

export const CONFIG_LIMITS = Object.freeze({
  initialHp: [500, 30000],
  roundSeconds: [20, 300],
  finalSeconds: [3, 60],
  multiplierStartRound: [2, 20],
  multiplierIncrement: [0.1, 3],
});

const finite = (value) => Number.isFinite(Number(value));

export function normalizeLng(value) {
  const lng = Number(value);
  if (!Number.isFinite(lng)) return null;
  return ((lng + 180) % 360 + 360) % 360 - 180;
}

export function normalizeGuess(value) {
  if (!value || !finite(value.lat) || !finite(value.lng)) return null;
  const lat = Number(value.lat);
  const lng = normalizeLng(value.lng);
  if (lat < -90 || lat > 90 || lng === null) return null;
  return { lat, lng };
}

export function validateConfig(input = {}) {
  const value = { ...DEFAULT_CONFIG };
  const errors = [];
  const integerKeys = ["initialHp", "roundSeconds", "finalSeconds", "multiplierStartRound"];
  for (const key of integerKeys) {
    const n = Number(input[key]);
    const [min, max] = CONFIG_LIMITS[key];
    if (!Number.isInteger(n) || n < min || n > max) errors.push(key);
    else value[key] = n;
  }
  const inc = Number(input.multiplierIncrement);
  const [incMin, incMax] = CONFIG_LIMITS.multiplierIncrement;
  if (!Number.isFinite(inc) || inc < incMin || inc > incMax) errors.push("multiplierIncrement");
  else value.multiplierIncrement = Math.round(inc * 10) / 10;
  value.multipliers = input.multipliers !== false;
  return { ok: errors.length === 0, value, errors };
}

export function haversineDistanceKm(a, b) {
  const p1 = normalizeGuess(a);
  const p2 = normalizeGuess(b);
  if (!p1 || !p2) return null;
  const rad = Math.PI / 180;
  const dLat = (p2.lat - p1.lat) * rad;
  const dLng = normalizeLng(p2.lng - p1.lng) * rad;
  const lat1 = p1.lat * rad;
  const lat2 = p2.lat * rad;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export function distanceScore(distanceKm) {
  const d = Number(distanceKm);
  if (!Number.isFinite(d) || d < 0) return 0;
  if (d <= PERFECT_DISTANCE_KM) return MAX_GEO_SCORE;
  return Math.max(0, Math.min(MAX_GEO_SCORE - 1, Math.round(MAX_GEO_SCORE * Math.exp(-d / SCORE_DECAY_KM))));
}

export function roundMultiplier(round, config = DEFAULT_CONFIG) {
  if (!config.multipliers) return 1;
  const r = Math.max(1, Math.floor(Number(round) || 1));
  if (r < config.multiplierStartRound) return 1;
  return 1 + (r - config.multiplierStartRound + 1) * config.multiplierIncrement;
}

export function finalDeadline(now, roundDeadline, finalSeconds) {
  return Math.min(Number(roundDeadline), Number(now) + Number(finalSeconds) * 1000);
}

export function canAcceptAnswer({ phase, now, deadline, answer }) {
  if (phase !== "playing") return false;
  if (!Number.isFinite(now) || !Number.isFinite(deadline) || now > deadline) return false;
  return !answer?.confirmed;
}

export function effectiveAnswer(answer) {
  return normalizeGuess(answer?.confirmed) || normalizeGuess(answer?.proposal) || null;
}

export function resolveRound({ seats, teams, answers, target, round, config = DEFAULT_CONFIG }) {
  const cleanTarget = normalizeGuess(target);
  if (!cleanTarget) throw new Error("Target coordinates are invalid");
  const players = (seats || []).map((seat) => {
    const answer = answers?.[seat.id] || null;
    const guess = effectiveAnswer(answer);
    const distanceKm = guess ? haversineDistanceKm(guess, cleanTarget) : null;
    return {
      playerId: seat.id,
      teamId: seat.teamId,
      answered: !!guess,
      confirmed: !!normalizeGuess(answer?.confirmed),
      guess,
      distanceKm,
      score: guess ? distanceScore(distanceKm) : 0,
    };
  });

  const teamScores = {};
  for (const team of teams || []) {
    const members = players.filter((player) => player.teamId === team.id);
    teamScores[team.id] = members.length
      ? Math.round(members.reduce((sum, player) => sum + player.score, 0) / members.length)
      : 0;
  }

  const multiplier = roundMultiplier(round, config);
  const ranked = (teams || []).map((team) => ({ ...team, score: teamScores[team.id] || 0 }));
  const difference = ranked.length === 2 ? Math.abs(ranked[0].score - ranked[1].score) : 0;
  const damage = Math.round(difference * multiplier);
  let damagedTeamId = null;
  if (ranked.length === 2 && ranked[0].score !== ranked[1].score) {
    damagedTeamId = ranked[0].score < ranked[1].score ? ranked[0].id : ranked[1].id;
  }
  const nextTeams = ranked.map((team) => ({
    ...team,
    hp: team.id === damagedTeamId ? Math.max(0, Number(team.hp || 0) - damage) : Number(team.hp || 0),
  }));
  const defeated = nextTeams.find((team) => team.hp <= 0);
  const winnerTeamId = defeated ? nextTeams.find((team) => team.id !== defeated.id)?.id || null : null;

  return { players, teamScores, multiplier, difference, damage, damagedTeamId, teams: nextTeams, winnerTeamId };
}

export function canResolveRound(state, roundId) {
  return !!state && state.roundId === roundId && state.phase === "playing" && state.resolvedRoundId !== roundId;
}

export function resetForRematch(state, order, matchId) {
  const config = validateConfig(state?.config || DEFAULT_CONFIG).value;
  const teams = (state?.teams || []).map((team) => ({ ...team, hp: config.initialHp }));
  return {
    ...state,
    matchId,
    phase: "preparing",
    round: 1,
    retry: 0,
    roundId: `${matchId}:1:0`,
    config,
    teams,
    locationOrder: order.slice(),
    locationCursor: 0,
    usedLocationIds: order.length ? [order[0]] : [],
    loaded: {},
    answers: {},
    firstConfirmedBy: null,
    countdownAt: null,
    deadline: null,
    finalDeadline: null,
    resolvedRoundId: null,
    result: null,
    winnerTeamId: null,
  };
}
