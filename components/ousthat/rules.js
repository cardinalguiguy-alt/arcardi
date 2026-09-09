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
export const SOLO_ROUNDS = 5;
export const MULTI_COUNTRY_ROUNDS = 5;
export const MAX_PLAYERS = 8;
export const GAME_MODES = Object.freeze(["pinpoint", "country"]);
export const COUNTRY_INPUTS = Object.freeze(["multiple-choice", "search"]);
// Whitelist des cartes jouables (2026-09-06) — un id de plus ici à chaque
// nouvelle carte enregistrée dans maps.js (voir tools/import-map.mjs). Une
// petite liste manuelle plutôt qu'un import de maps.js : ce fichier reste
// des règles pures, sans dépendre du catalogue de panoramas ni de sa taille.
export const GAME_MAP_IDS = Object.freeze(["beautiful-world", "australie"]);

// Sentinel de durée de manche illimitée (2026-09-07). 0, jamais Infinity :
// l'état voyage en JSON (broadcast Realtime + rooms.game_state), et
// JSON.stringify(Infinity) === "null" — indiscernable d'une valeur absente.
// 0 est un entier ordinaire qui traverse cette tuyauterie sans se transformer.
export const ROUND_SECONDS_UNLIMITED = 0;

export const DEFAULT_CONFIG = Object.freeze({
  mode: "pinpoint",
  mapId: "beautiful-world",
  countryInput: "multiple-choice",
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

export function isUnlimitedRound(config) {
  return Number(config?.roundSeconds) === ROUND_SECONDS_UNLIMITED;
}

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
  value.mode = GAME_MODES.includes(input.mode) ? input.mode : DEFAULT_CONFIG.mode;
  value.mapId = GAME_MAP_IDS.includes(input.mapId) ? input.mapId : DEFAULT_CONFIG.mapId;
  value.countryInput = COUNTRY_INPUTS.includes(input.countryInput) ? input.countryInput : DEFAULT_CONFIG.countryInput;
  const integerKeys = ["initialHp", "roundSeconds", "finalSeconds", "multiplierStartRound"];
  for (const key of integerKeys) {
    const n = Number(input[key]);
    const [min, max] = CONFIG_LIMITS[key];
    // roundSeconds a une valeur spéciale en dehors de ses bornes : 0 veut dire
    // illimité, jamais 0 seconde de manche (voir ROUND_SECONDS_UNLIMITED).
    const unlimited = key === "roundSeconds" && n === ROUND_SECONDS_UNLIMITED;
    if (!Number.isInteger(n) || (!unlimited && (n < min || n > max))) errors.push(key);
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
  // Une manche illimitée n'a pas d'échéance (roundDeadline === null) : le
  // délai de rush après la première réponse ne doit alors JAMAIS s'activer,
  // sinon "illimité" redeviendrait sous pression dès qu'un joueur répond.
  // Number(null) vaut 0 : sans ce garde, Math.min renverrait 0 (échéance déjà
  // passée) et clôturerait la manche pour tout le monde à l'instant même.
  if (roundDeadline === null) return null;
  return Math.min(Number(roundDeadline), Number(now) + Number(finalSeconds) * 1000);
}

export function canAcceptAnswer({ phase, now, deadline, answer }) {
  if (phase !== "playing") return false;
  if (!Number.isFinite(now)) return false;
  // deadline === null ne peut se produire qu'en cours de manche (le test de
  // phase ci-dessus l'a déjà garanti) : c'est le signal d'une manche
  // illimitée, pas d'une manche inexistante. Toute autre valeur non finie
  // (undefined, NaN) reste refusée.
  if (deadline !== null && (!Number.isFinite(deadline) || now > deadline)) return false;
  return !answer?.confirmed;
}

export function effectiveAnswer(answer) {
  return normalizeGuess(answer?.confirmed) || normalizeGuess(answer?.proposal) || null;
}

export function normalizeCountryAnswer(value) {
  const code = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

export function effectiveCountryAnswer(answer) {
  return normalizeCountryAnswer(answer?.confirmed) || normalizeCountryAnswer(answer?.proposal) || null;
}

export function activeSeats(seats, teams) {
  const teamById = Object.fromEntries((teams || []).map((team) => [team.id, team]));
  return (seats || []).filter((seat) => Number(teamById[seat.teamId]?.hp || 0) > 0);
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
  const participatingIds = new Set(players.map((player) => player.teamId));
  const ranked = (teams || []).map((team) => ({ ...team, score: teamScores[team.id] || 0 }));
  const participants = ranked.filter((team) => participatingIds.has(team.id) && Number(team.hp || 0) > 0);
  const bestScore = participants.length ? Math.max(...participants.map((team) => team.score)) : 0;
  const nextTeams = ranked.map((team) => {
    if (!participatingIds.has(team.id) || Number(team.hp || 0) <= 0 || team.score === bestScore) {
      return { ...team, hp: Number(team.hp || 0), damage: 0 };
    }
    const damage = Math.round((bestScore - team.score) * multiplier);
    return { ...team, hp: Math.max(0, Number(team.hp || 0) - damage), damage };
  });
  const damagedTeamIds = nextTeams.filter((team) => team.damage > 0).map((team) => team.id);
  // Ces deux champs singuliers restent pour le duel historique et ses bancs.
  const damagedTeamId = damagedTeamIds.length === 1 ? damagedTeamIds[0] : null;
  const difference = participants.length === 2 ? Math.abs(participants[0].score - participants[1].score) : 0;
  const damage = participants.length === 2 ? Math.round(difference * multiplier) : Math.max(0, ...nextTeams.map((team) => team.damage));
  const alive = nextTeams.filter((team) => team.hp > 0);
  const winnerTeamId = participants.length > 1 && alive.length === 1 ? alive[0].id : null;

  return { players, teamScores, bestScore, multiplier, difference, damage, damagedTeamId, damagedTeamIds, teams: nextTeams, winnerTeamId };
}

export function resolveCountryRound({ seats, answers, targetCountry }) {
  const target = normalizeCountryAnswer(targetCountry);
  if (!target) throw new Error("Target country is invalid");
  const players = (seats || []).map((seat) => {
    const answer = answers?.[seat.id] || null;
    const guessCountry = effectiveCountryAnswer(answer);
    return {
      playerId: seat.id,
      teamId: seat.teamId,
      answered: !!guessCountry,
      confirmed: !!normalizeCountryAnswer(answer?.confirmed),
      guessCountry,
      correct: guessCountry === target,
      score: guessCountry === target ? 1 : 0,
    };
  });
  return { targetCountry: target, players };
}

export function addCountryScores(previous, players) {
  const totals = { ...(previous || {}) };
  for (const player of players || []) totals[player.playerId] = Number(totals[player.playerId] || 0) + (player.correct ? 1 : 0);
  return totals;
}

export function matchWinners(seats, scores) {
  const ranked = (seats || []).map((seat) => ({ id: seat.id, score: Number(scores?.[seat.id] || 0) }));
  const best = ranked.length ? Math.max(...ranked.map((entry) => entry.score)) : 0;
  return ranked.filter((entry) => entry.score === best).map((entry) => entry.id);
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
    countryScores: {},
    soloScore: 0,
    streak: 0,
    history: [],
    matchComplete: false,
    winnerPlayerIds: [],
    firstConfirmedBy: null,
    countdownAt: null,
    deadline: null,
    finalDeadline: null,
    resolvedRoundId: null,
    result: null,
    winnerTeamId: null,
  };
}
