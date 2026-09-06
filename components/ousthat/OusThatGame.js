"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { readGameState, recordMatchResult, resetRoomToLobby, saveGameState } from "@/lib/gameSync";
import GuessMap from "./GuessMap";
import StreetViewFrame from "./StreetViewFrame";
import {
  COUNTRIES,
  countryChoices,
  countryFlag,
  countryName,
  normalizeCountryCode,
  searchableCountryText,
} from "./countries";
import { LOCATION_BY_ID, locationOrder } from "./locations";
import {
  DEFAULT_CONFIG,
  GAME_ID,
  MAX_PLAYERS,
  MULTI_COUNTRY_ROUNDS,
  SOLO_ROUNDS,
  activeSeats,
  addCountryScores,
  canAcceptAnswer,
  canResolveRound,
  finalDeadline,
  matchWinners,
  normalizeGuess,
  resetForRematch,
  resolveCountryRound,
  resolveRound,
  roundMultiplier,
  validateConfig,
} from "./rules";
import { copyFor } from "./strings";

const STATE_VERSION = 2;
const PANORAMA_SETTLE_MS = 2500;
const COUNTDOWN_MS = 3000;
const PROPOSAL_INTERVAL_MS = 120; // 8,3/s maximum, sous la limite projet de 10/s.
const SEAT_COLORS = ["#ffca5f", "#68d9ff", "#ff7fa4", "#86e39a", "#bda0ff", "#ff9f68", "#78e4da", "#e4de78"];

function seatList(players) {
  return (players || []).slice(0, MAX_PLAYERS).map((player, index) => ({
    id: player.profile_id,
    teamId: `team-${index + 1}`,
    username: player.profiles?.username || `Joueur ${index + 1}`,
    avatar: player.profiles?.avatar || (index ? "🧭" : "🗺️"),
  }));
}

function setupState(players) {
  const seats = seatList(players);
  return {
    v: STATE_VERSION,
    phase: "setup",
    matchId: null,
    config: { ...DEFAULT_CONFIG },
    seats,
    teams: seats.map((seat) => ({ id: seat.teamId, hp: DEFAULT_CONFIG.initialHp })),
    round: 0,
    roundId: null,
    locationOrder: [],
    locationCursor: 0,
    usedLocationIds: [],
    loaded: {},
    answers: {},
    firstConfirmedBy: null,
    deadline: null,
    finalDeadline: null,
    resolvedRoundId: null,
    result: null,
    winnerTeamId: null,
    winnerPlayerIds: [],
    countryScores: {},
    soloScore: 0,
    streak: 0,
    history: [],
    matchComplete: false,
  };
}

function isSolo(state) {
  return (state?.seats?.length || 0) === 1;
}

function modeOf(state) {
  return state?.config?.mode === "country" ? "country" : "pinpoint";
}

function playingSeats(state) {
  if (!state) return [];
  if (modeOf(state) === "pinpoint" && !isSolo(state)) return activeSeats(state.seats, state.teams);
  return state.seats || [];
}

function normalizeModeGuess(mode, value) {
  return mode === "country" ? normalizeCountryCode(value) : normalizeGuess(value);
}

function nextLocation(state, advanceRound) {
  if (state.matchComplete) return { ...state, phase: "finished", deadline: null, finalDeadline: null };
  const cursor = state.locationCursor + 1;
  const nextId = state.locationOrder[cursor];
  if (!nextId) return { ...state, phase: "exhausted", deadline: null, finalDeadline: null };
  const round = advanceRound ? state.round + 1 : state.round;
  const retry = advanceRound ? 0 : (state.retry || 0) + 1;
  return {
    ...state,
    phase: "preparing",
    round,
    retry,
    roundId: `${state.matchId}:${round}:${retry}`,
    locationCursor: cursor,
    usedLocationIds: [...(state.usedLocationIds || []), nextId],
    loaded: {},
    answers: {},
    firstConfirmedBy: null,
    countdownAt: null,
    deadline: null,
    finalDeadline: null,
    resolvedRoundId: null,
    result: null,
    matchComplete: false,
  };
}

function currentLimit(state) {
  if (!state || state.phase !== "playing") return null;
  return state.finalDeadline || state.deadline || null;
}

function normalizeSearch(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function ConfigField({ label, unit, value, min, max, step = 1, invalid, onChange }) {
  return (
    <label className={"ot-field" + (invalid ? " invalid" : "")}>
      <span>{label}</span>
      <span className="ot-input-wrap">
        <input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(event.target.value)} />
        <small>{unit}</small>
      </span>
    </label>
  );
}

function PlayerBadge({ seat, team, maxHp, ready, answered, active, scoreLabel, eliminated, color }) {
  const hp = Math.max(0, team?.hp || 0);
  const pct = Math.max(0, Math.min(100, hp / Math.max(1, maxHp) * 100));
  return (
    <div className={"ot-player" + (active ? " active" : "") + (answered ? " answered" : "") + (eliminated ? " eliminated" : "")} style={{ "--seat": color }}>
      <span className="ot-player-avatar">{seat?.avatar}</span>
      <span className="ot-player-copy"><b>{seat?.username}</b><small>{scoreLabel ?? `${hp.toLocaleString()} PV`}</small></span>
      {scoreLabel === undefined && <span className="ot-hp"><i style={{ width: `${pct}%` }} /></span>}
      {ready !== undefined && <span className={"ot-ready-dot" + (ready ? " ready" : "")} aria-label={ready ? "prêt" : "chargement"} />}
    </div>
  );
}

function AnimatedHealth({ team, maxHp, fromHp }) {
  const [shown, setShown] = useState(fromHp ?? team?.hp ?? 0);
  useEffect(() => {
    setShown(fromHp ?? team?.hp ?? 0);
    const frame = requestAnimationFrame(() => setShown(team?.hp ?? 0));
    return () => cancelAnimationFrame(frame);
  }, [team?.hp, fromHp]);
  const pct = Math.max(0, Math.min(100, shown / Math.max(1, maxHp) * 100));
  return <span className="ot-reveal-hp"><i style={{ width: `${pct}%` }} /></span>;
}

function formatDistance(km, lang) {
  if (km === null || km === undefined) return "—";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toLocaleString(lang === "en" ? "en-US" : "fr-FR", { maximumFractionDigits: km < 100 ? 1 : 0 })} km`;
}

function CountryPicker({ choices, inputMode, lang, selected, locked, onChange, onConfirm, c }) {
  const [query, setQuery] = useState("");
  const needle = normalizeSearch(query);
  const filtered = useMemo(() => {
    if (!needle) return COUNTRIES.slice().sort((a, b) => countryName(a.code, lang).localeCompare(countryName(b.code, lang))).slice(0, 10);
    return COUNTRIES
      .filter((country) => normalizeSearch(searchableCountryText(country, lang)).includes(needle))
      .sort((a, b) => countryName(a.code, lang).localeCompare(countryName(b.code, lang)))
      .slice(0, 10);
  }, [lang, needle]);

  return (
    <section className={"ot-country-picker " + inputMode}>
      <div className="ot-country-title"><span className="ot-kicker">{c.countryMode}</span><h2>{c.whichCountry}</h2></div>
      {inputMode === "multiple-choice" ? (
        <div className="ot-country-choices">
          {choices.map((code) => (
            <button key={code} type="button" disabled={locked} className={selected === code ? "selected" : ""} onClick={() => onChange(code)}>
              <span>{countryFlag(code)}</span><b>{countryName(code, lang)}</b>
            </button>
          ))}
        </div>
      ) : (
        <div className="ot-country-search">
          <div className="ot-country-searchbox"><span>⌕</span><input value={query} disabled={locked} placeholder={c.searchCountry} autoComplete="off" onChange={(event) => setQuery(event.target.value)} /></div>
          <div className="ot-country-results">
            {filtered.map((country) => (
              <button key={country.code} type="button" disabled={locked} className={selected === country.code ? "selected" : ""} onClick={() => { onChange(country.code); setQuery(countryName(country.code, lang)); }}>
                <span>{countryFlag(country.code)}</span><b>{countryName(country.code, lang)}</b><small>{country.code}</small>
              </button>
            ))}
            {!filtered.length && <p>{c.noCountry}</p>}
          </div>
        </div>
      )}
      <div className="ot-country-submit"><span>{selected ? <>{countryFlag(selected)} {countryName(selected, lang)}</> : c.chooseCountry}</span><button className="ot-btn primary" disabled={!selected || locked} onClick={onConfirm}>{locked ? c.confirmed : c.confirmCountry}</button></div>
    </section>
  );
}

// Vérifié une seule fois, au montage : GuessMap ne découvre l'absence de
// WebGL qu'au moment de poser le point, la manche déjà lancée (§ audit
// 2026-09-06). Un joueur sans accélération graphique doit le savoir AVANT de
// s'engager sur Pinpoint, pas au milieu d'une manche qu'il ne peut plus finir.
function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch (error) {
    return false;
  }
}

export default function OusThatGame({ room, me, isHost, players, lang, onFinish }) {
  const c = copyFor(lang);
  const hasEmbedKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;
  const hasWebGL = useMemo(() => supportsWebGL(), []);
  const [state, setState] = useState(null);
  const [channelReady, setChannelReady] = useState(false);
  const [draftConfig, setDraftConfig] = useState({ ...DEFAULT_CONFIG });
  const [configErrors, setConfigErrors] = useState([]);
  const [draft, setDraft] = useState(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [notice, setNotice] = useState("");
  const [tick, setTick] = useState(() => Date.now());
  const [localDeadline, setLocalDeadline] = useState(null);
  const [localCountdown, setLocalCountdown] = useState(null);
  const [reportArmed, setReportArmed] = useState(false);

  const stateRef = useRef(null);
  const channelRef = useRef(null);
  const hostTimerRef = useRef(null);
  const recordedMatchRef = useRef(null);
  const lastProposalAtRef = useRef(0);
  const pendingProposalRef = useRef(null);
  const proposalTimerRef = useRef(null);
  const reportTimerRef = useRef(null);

  const proposedSeats = seatList(players);
  const playerSignature = proposedSeats.map((seat) => seat.id).join("|");
  const onlineSeatIds = useMemo(() => new Set(proposedSeats.map((seat) => seat.id)), [playerSignature]);

  const applyIncoming = useCallback((next, transport = {}) => {
    if (!next || next.v !== STATE_VERSION) return;
    stateRef.current = next;
    setState(next);
    if (next.phase === "playing") {
      const remaining = Number(transport.remainingMs);
      if (Number.isFinite(remaining)) setLocalDeadline(Date.now() + Math.max(0, remaining));
      else if (isHost && currentLimit(next)) setLocalDeadline(currentLimit(next));
    } else setLocalDeadline(null);
    if (next.phase === "countdown") {
      const remaining = Number(transport.countdownMs);
      setLocalCountdown(Date.now() + (Number.isFinite(remaining) ? Math.max(0, remaining) : COUNTDOWN_MS));
    } else setLocalCountdown(null);
  }, [isHost]);

  const transportFor = useCallback((next) => ({
    remainingMs: currentLimit(next) ? Math.max(0, currentLimit(next) - Date.now()) : null,
    countdownMs: next.phase === "countdown" && next.countdownAt ? Math.max(0, next.countdownAt - Date.now()) : null,
  }), []);

  const emitState = useCallback((next, to = null) => {
    if (!isHost) return;
    const transport = transportFor(next);
    applyIncoming(next, transport);
    channelRef.current?.send({ type: "broadcast", event: "apply", payload: { state: next, transport, to } });
    saveGameState(room.id, GAME_ID, { phase: "playing", ...next });
  }, [applyIncoming, isHost, room.id, transportFor]);

  const saveHostOnly = useCallback((next) => {
    if (!isHost) return;
    stateRef.current = next;
    setState(next);
    saveGameState(room.id, GAME_ID, { phase: "playing", ...next });
  }, [isHost, room.id]);

  const sendRequest = useCallback((kind, data = {}) => {
    if (!channelRef.current || !me?.id) return;
    channelRef.current.send({ type: "broadcast", event: "request", payload: { kind, from: me.id, ...data } });
  }, [me?.id]);

  const hostResolve = useCallback((roundId) => {
    const current = stateRef.current;
    if (!isHost || !canResolveRound(current, roundId)) return;
    const target = LOCATION_BY_ID[current.locationOrder[current.locationCursor]];
    if (!target) return;
    const seats = playingSeats(current);
    const solo = isSolo(current);

    if (modeOf(current) === "country") {
      const result = resolveCountryRound({ seats, answers: current.answers, targetCountry: target.country });
      const countryScores = addCountryScores(current.countryScores, result.players);
      const mine = result.players[0];
      const streak = solo && mine?.correct ? current.streak + 1 : current.streak;
      const lastLocation = current.locationCursor >= current.locationOrder.length - 1;
      const matchComplete = solo ? (!mine?.correct || lastLocation) : current.round >= MULTI_COUNTRY_ROUNDS;
      const winnerPlayerIds = matchComplete ? (solo ? [current.seats[0]?.id].filter(Boolean) : matchWinners(current.seats, countryScores)) : [];
      emitState({
        ...current,
        phase: "reveal",
        deadline: null,
        finalDeadline: null,
        resolvedRoundId: roundId,
        result,
        countryScores,
        streak,
        matchComplete,
        winnerPlayerIds,
        history: [...(current.history || []), { round: current.round, locationId: target.id, targetCountry: target.country, guessCountry: mine?.guessCountry || null, correct: !!mine?.correct }],
      });
      return;
    }

    const beforeTeams = current.teams.map((team) => ({ ...team }));
    const result = resolveRound({ seats, teams: current.teams, answers: current.answers, target, round: current.round, config: current.config });
    if (solo) {
      const player = result.players[0];
      const soloScore = current.soloScore + Number(player?.score || 0);
      const matchComplete = current.round >= SOLO_ROUNDS;
      emitState({
        ...current,
        phase: "reveal",
        teams: result.teams,
        deadline: null,
        finalDeadline: null,
        resolvedRoundId: roundId,
        result: { ...result, beforeTeams },
        soloScore,
        matchComplete,
        winnerPlayerIds: matchComplete ? [current.seats[0]?.id].filter(Boolean) : [],
        history: [...(current.history || []), { round: current.round, locationId: target.id, score: Number(player?.score || 0), distanceKm: player?.distanceKm ?? null }],
      });
      return;
    }

    const winnerPlayerIds = result.winnerTeamId ? current.seats.filter((seat) => seat.teamId === result.winnerTeamId).map((seat) => seat.id) : [];
    emitState({
      ...current,
      phase: result.winnerTeamId ? "finished" : "reveal",
      teams: result.teams,
      deadline: null,
      finalDeadline: null,
      resolvedRoundId: roundId,
      result: { ...result, beforeTeams },
      winnerTeamId: result.winnerTeamId,
      winnerPlayerIds,
      matchComplete: !!result.winnerTeamId,
    });
  }, [emitState, isHost]);

  const hostHandleRequest = useCallback((request) => {
    const current = stateRef.current;
    if (!isHost || !current || !request || !current.seats.some((seat) => seat.id === request.from)) return;
    const now = Date.now();
    const mode = modeOf(current);
    const answer = current.answers?.[request.from] || null;
    const eligible = playingSeats(current);
    if (!eligible.some((seat) => seat.id === request.from) && !["sync", "next", "rematch"].includes(request.kind)) return;

    if (request.kind === "sync") {
      const transport = transportFor(current);
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { state: current, transport, to: request.from } });
      return;
    }
    if (request.kind === "start" && current.phase === "setup" && request.from === room.host_id) {
      const checked = validateConfig(request.config);
      if (!checked.ok || current.seats.length < 1 || current.seats.length > MAX_PLAYERS) return;
      const matchId = `${room.id}:${now}`;
      const order = locationOrder(matchId);
      const teams = current.seats.map((seat) => ({ id: seat.teamId, hp: checked.value.initialHp }));
      emitState({
        ...current,
        phase: "preparing",
        matchId,
        config: checked.value,
        teams,
        round: 1,
        retry: 0,
        roundId: `${matchId}:1:0`,
        locationOrder: order,
        locationCursor: 0,
        usedLocationIds: [order[0]],
        loaded: {}, answers: {}, firstConfirmedBy: null,
        countdownAt: null, deadline: null, finalDeadline: null,
        resolvedRoundId: null, result: null, winnerTeamId: null, winnerPlayerIds: [],
        countryScores: {}, soloScore: 0, streak: 0, history: [], matchComplete: false,
      });
      return;
    }
    if (request.kind === "panorama_loaded" && current.phase === "preparing" && request.roundId === current.roundId) {
      if (current.loaded?.[request.from]) return;
      emitState({ ...current, loaded: { ...current.loaded, [request.from]: true } });
      return;
    }
    if (request.kind === "proposal" && canAcceptAnswer({ phase: current.phase, now, deadline: currentLimit(current), answer })) {
      const guess = normalizeModeGuess(mode, request.guess);
      if (!guess || request.roundId !== current.roundId) return;
      saveHostOnly({ ...current, answers: { ...current.answers, [request.from]: { ...answer, proposal: guess } } });
      return;
    }
    if (request.kind === "confirm" && canAcceptAnswer({ phase: current.phase, now, deadline: currentLimit(current), answer })) {
      const guess = normalizeModeGuess(mode, request.guess) || normalizeModeGuess(mode, answer?.proposal);
      if (!guess || request.roundId !== current.roundId) return;
      const answers = { ...current.answers, [request.from]: { ...answer, proposal: guess, confirmed: guess, confirmedAt: now } };
      const first = current.firstConfirmedBy || request.from;
      const next = {
        ...current,
        answers,
        firstConfirmedBy: first,
        finalDeadline: current.firstConfirmedBy ? current.finalDeadline : finalDeadline(now, current.deadline, current.config.finalSeconds),
      };
      emitState(next);
      // Un joueur éliminé en Pinpoint reste spectateur et ne peut pas bloquer
      // la manche suivante dans une partie à trois joueurs ou plus.
      if (eligible.every((seat) => !!answers[seat.id]?.confirmed)) hostResolve(current.roundId);
      return;
    }
    const canVoidLocation = ["preparing", "countdown"].includes(current.phase)
      || (current.phase === "playing" && now <= currentLimit(current) && !eligible.some((seat) => current.answers?.[seat.id]?.confirmed));
    if (request.kind === "location_problem" && canVoidLocation && request.roundId === current.roundId) {
      emitState(nextLocation(current, false));
      return;
    }
    if (request.kind === "next" && current.phase === "reveal" && request.from === room.host_id) {
      emitState(nextLocation(current, true));
      return;
    }
    if (request.kind === "rematch" && current.phase === "finished" && request.from === room.host_id) {
      const matchId = `${room.id}:${now}`;
      emitState(resetForRematch(current, locationOrder(matchId), matchId));
    }
  }, [emitState, hostResolve, isHost, room.host_id, room.id, saveHostOnly, transportFor]);

  useEffect(() => {
    document.body.classList.add("ousthat-active");
    return () => document.body.classList.remove("ousthat-active");
  }, []);

  useEffect(() => {
    const channel = supabase.channel(`${GAME_ID}_${room.id}`, { config: { broadcast: { self: true } } });
    channelRef.current = channel;
    channel.on("broadcast", { event: "apply" }, ({ payload }) => {
      if (payload?.to && payload.to !== me.id) return;
      applyIncoming(payload?.state, payload?.transport || {});
    });
    channel.on("broadcast", { event: "request" }, ({ payload }) => hostHandleRequest(payload));
    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      setChannelReady(true);
      const saved = readGameState(room, GAME_ID);
      if (saved?.v === STATE_VERSION) applyIncoming(saved, isHost ? transportFor(saved) : {});
      else if (isHost) emitState(setupState(players));
      if (!isHost) channel.send({ type: "broadcast", event: "request", payload: { kind: "sync", from: me.id } });
    });
    return () => {
      clearTimeout(hostTimerRef.current);
      clearTimeout(proposalTimerRef.current);
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [room.id, isHost]); // Les handlers lisent l'état vivant via stateRef.

  useEffect(() => { stateRef.current = state; }, [state]);

  // Le salon peut passer de solo à groupe pendant l'écran de réglage. Le
  // nombre de sièges suit alors la présence réelle ; une fois lancé il reste
  // figé afin qu'une reconnexion retrouve exactement la partie commencée.
  useEffect(() => {
    const current = stateRef.current;
    if (!isHost || !current || current.phase !== "setup") return;
    const before = current.seats.map((seat) => seat.id).join("|");
    if (before === playerSignature) return;
    const seats = seatList(players);
    emitState({ ...current, seats, teams: seats.map((seat) => ({ id: seat.teamId, hp: current.config.initialHp })) });
  }, [emitState, isHost, playerSignature]);

  useEffect(() => {
    if (!state?.roundId) return;
    clearTimeout(proposalTimerRef.current);
    proposalTimerRef.current = null;
    pendingProposalRef.current = null;
    lastProposalAtRef.current = 0;
    const mine = state.answers?.[me.id];
    setDraft(normalizeModeGuess(modeOf(state), mine?.confirmed) || normalizeModeGuess(modeOf(state), mine?.proposal) || null);
    setMapOpen(false);
    setMapExpanded(false);
    setNotice("");
    clearTimeout(reportTimerRef.current);
    setReportArmed(false);
  }, [state?.roundId, me.id]);

  useEffect(() => {
    if (!isHost || !state) return;
    clearTimeout(hostTimerRef.current);
    if (state.phase === "preparing") {
      const expected = playingSeats(state).filter((seat) => onlineSeatIds.has(seat.id));
      if (expected.length && expected.every((seat) => state.loaded?.[seat.id])) {
        hostTimerRef.current = setTimeout(() => {
          const current = stateRef.current;
          if (!current || current.phase !== "preparing" || current.roundId !== state.roundId) return;
          emitState({ ...current, phase: "countdown", countdownAt: Date.now() + COUNTDOWN_MS });
        }, PANORAMA_SETTLE_MS);
      }
      return () => clearTimeout(hostTimerRef.current);
    }
    if (state.phase === "countdown" && state.countdownAt) {
      hostTimerRef.current = setTimeout(() => {
        const current = stateRef.current;
        if (!current || current.phase !== "countdown" || current.roundId !== state.roundId) return;
        const deadline = Date.now() + current.config.roundSeconds * 1000;
        emitState({ ...current, phase: "playing", countdownAt: null, deadline, finalDeadline: null });
      }, Math.max(0, state.countdownAt - Date.now()));
      return () => clearTimeout(hostTimerRef.current);
    }
    if (state.phase === "playing" && currentLimit(state)) {
      hostTimerRef.current = setTimeout(() => hostResolve(state.roundId), Math.max(0, currentLimit(state) - Date.now()));
      return () => clearTimeout(hostTimerRef.current);
    }
  }, [emitState, hostResolve, isHost, onlineSeatIds, state?.phase, state?.roundId, state?.loaded, state?.countdownAt, state?.deadline, state?.finalDeadline]);

  useEffect(() => {
    if (!state || !["countdown", "playing"].includes(state.phase)) return;
    const timer = setInterval(() => setTick(Date.now()), 100);
    return () => clearInterval(timer);
  }, [state?.phase]);

  useEffect(() => {
    if (state?.phase !== "finished" || isSolo(state) || !state.matchId || recordedMatchRef.current === state.matchId) return;
    recordedMatchRef.current = state.matchId;
    if (state.seats.some((seat) => seat.id === me.id)) recordMatchResult(room.id, (state.winnerPlayerIds || []).includes(me.id));
  }, [state?.phase, state?.matchId, state?.winnerPlayerIds, me.id, room.id]);

  const location = state ? LOCATION_BY_ID[state.locationOrder?.[state.locationCursor]] : null;
  const mode = modeOf(state);
  const solo = isSolo(state);
  const mySeat = state?.seats?.find((seat) => seat.id === me.id);
  const myAnswer = state?.answers?.[me.id] || null;
  const myPlaying = !!playingSeats(state).find((seat) => seat.id === me.id);
  const locked = !!myAnswer?.confirmed || !myPlaying;
  const remainingMs = state?.phase === "playing" && localDeadline ? Math.max(0, localDeadline - tick) : 0;
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const countdown = state?.phase === "countdown" && localCountdown ? Math.max(1, Math.ceil((localCountdown - tick) / 1000)) : 3;
  const multiplier = state ? roundMultiplier(state.round || 1, state.config || DEFAULT_CONFIG) : 1;
  const revealTarget = location ? { lat: location.lat, lng: location.lng, country: location.country } : null;
  const choiceCodes = useMemo(() => location && state?.roundId ? countryChoices(location.country, state.roundId, 4) : [], [location, state?.roundId]);

  const updateDraft = useCallback((guess) => {
    if (locked || stateRef.current?.phase !== "playing") return;
    setDraft(guess);
    pendingProposalRef.current = { roundId: stateRef.current.roundId, guess };
    const now = Date.now();
    if (now - lastProposalAtRef.current >= PROPOSAL_INTERVAL_MS) {
      clearTimeout(proposalTimerRef.current);
      proposalTimerRef.current = null;
      lastProposalAtRef.current = now;
      const pending = pendingProposalRef.current;
      pendingProposalRef.current = null;
      sendRequest("proposal", pending);
      return;
    }
    if (proposalTimerRef.current) return;
    proposalTimerRef.current = setTimeout(() => {
      proposalTimerRef.current = null;
      const pending = pendingProposalRef.current;
      pendingProposalRef.current = null;
      if (!pending || stateRef.current?.phase !== "playing" || stateRef.current.roundId !== pending.roundId) return;
      lastProposalAtRef.current = Date.now();
      sendRequest("proposal", pending);
    }, Math.max(0, PROPOSAL_INTERVAL_MS - (now - lastProposalAtRef.current)));
  }, [locked, sendRequest]);

  const updateCountryDraft = useCallback((code) => {
    const clean = normalizeCountryCode(code);
    if (!clean || locked || stateRef.current?.phase !== "playing") return;
    setDraft(clean);
    sendRequest("proposal", { roundId: stateRef.current.roundId, guess: clean });
  }, [locked, sendRequest]);

  const submitDraft = useCallback(() => {
    if (!draft || locked || !stateRef.current?.roundId) return;
    sendRequest("confirm", { roundId: stateRef.current.roundId, guess: draft });
    setMapExpanded(false);
    setMapOpen(false);
  }, [draft, locked, sendRequest]);

  // Ces callbacks restent stables pendant les ticks du chrono : l'iframe
  // Street View ne doit jamais être reconstruite dix fois par seconde.
  const markPanoramaLoaded = useCallback(() => {
    const current = stateRef.current;
    if (current?.roundId) sendRequest("panorama_loaded", { roundId: current.roundId });
  }, [sendRequest]);
  const markPanoramaSlow = useCallback(() => { setNotice(copyFor(lang).loadingSlow); }, [lang]);

  // Deux clics dans le thème du jeu plutôt qu'une boîte de dialogue native du
  // navigateur : celle-ci cassait le thème sombre et bloquait toute
  // automatisation de test (§ audit 2026-09-06). Le second clic doit arriver
  // dans les 3 s.
  const handleReport = useCallback(() => {
    if (!reportArmed) {
      setReportArmed(true);
      clearTimeout(reportTimerRef.current);
      reportTimerRef.current = setTimeout(() => setReportArmed(false), 3000);
      return;
    }
    clearTimeout(reportTimerRef.current);
    setReportArmed(false);
    const current = stateRef.current;
    if (current?.roundId) sendRequest("location_problem", { roundId: current.roundId });
  }, [reportArmed, sendRequest]);

  const start = () => {
    const checked = validateConfig(draftConfig);
    setConfigErrors(checked.errors);
    if (!checked.ok) { setNotice(c.invalid); return; }
    sendRequest("start", { config: checked.value });
  };

  const backToLobby = async () => {
    if (isHost) await resetRoomToLobby(room.id);
    onFinish?.();
  };

  if (!channelReady || !state) return <div className="ot-root ot-center"><div className="ot-orbit" /><p>{c.connection}</p></div>;

  if (state.phase === "setup") {
    const checked = validateConfig(draftConfig);
    const setupSolo = state.seats.length === 1;
    return (
      <div className="ot-root ot-setup-root">
        <div className="ot-setup-globe" aria-hidden="true" />
        <section className="ot-setup-card">
          <div className="ot-kicker">ARCARDI · {setupSolo ? c.solo : c.multiplayer}</div>
          <h1>Où&apos;s that ?</h1>
          <p className="ot-setup-lead">{setupSolo ? c.soloIntro : c.multiIntro}</p>
          <div className="ot-roster">{state.seats.map((seat) => <div key={seat.id}><span>{seat.avatar}</span><b>{seat.username}</b></div>)}</div>
          {isHost ? (
            <>
              <div className="ot-mode-picker">
                <button className={draftConfig.mode === "country" ? "selected" : ""} onClick={() => setDraftConfig((old) => ({ ...old, mode: "country" }))}><span>🌐</span><b>{setupSolo ? c.countryStreak : c.countryBattle}</b><small>{setupSolo ? c.countryStreakDesc : c.countryBattleDesc}</small></button>
                <button className={draftConfig.mode === "pinpoint" ? "selected" : ""} onClick={() => setDraftConfig((old) => ({ ...old, mode: "pinpoint" }))}><span>⌖</span><b>{c.pinpoint}</b><small>{setupSolo ? c.pinpointSoloDesc : c.pinpointMultiDesc}</small></button>
              </div>
              {draftConfig.mode === "country" && <div className="ot-answer-picker"><b>{c.answerMethod}</b><button className={draftConfig.countryInput === "multiple-choice" ? "selected" : ""} onClick={() => setDraftConfig((old) => ({ ...old, countryInput: "multiple-choice" }))}>🚩 {c.multipleChoice}</button><button className={draftConfig.countryInput === "search" ? "selected" : ""} onClick={() => setDraftConfig((old) => ({ ...old, countryInput: "search" }))}>⌕ {c.countrySearch}</button></div>}
              <div className="ot-settings">
                {draftConfig.mode === "pinpoint" && !setupSolo && <ConfigField label={c.hp} unit={c.points} value={draftConfig.initialHp} min={500} max={30000} invalid={configErrors.includes("initialHp")} onChange={(value) => setDraftConfig((old) => ({ ...old, initialHp: value }))} />}
                <ConfigField label={c.roundTime} unit={c.seconds} value={draftConfig.roundSeconds} min={20} max={300} invalid={configErrors.includes("roundSeconds")} onChange={(value) => setDraftConfig((old) => ({ ...old, roundSeconds: value }))} />
                {!setupSolo && <ConfigField label={c.finalTime} unit={c.seconds} value={draftConfig.finalSeconds} min={3} max={60} invalid={configErrors.includes("finalSeconds")} onChange={(value) => setDraftConfig((old) => ({ ...old, finalSeconds: value }))} />}
                {draftConfig.mode === "pinpoint" && !setupSolo && <label className="ot-field ot-toggle-field"><span>{c.multipliers}</span><button type="button" className={draftConfig.multipliers ? "on" : ""} onClick={() => setDraftConfig((old) => ({ ...old, multipliers: !old.multipliers }))}><i />{draftConfig.multipliers ? c.enabled : c.disabled}</button></label>}
                {draftConfig.mode === "pinpoint" && !setupSolo && draftConfig.multipliers && <ConfigField label={c.firstBoost} unit={c.round.toLowerCase()} value={draftConfig.multiplierStartRound} min={2} max={20} invalid={configErrors.includes("multiplierStartRound")} onChange={(value) => setDraftConfig((old) => ({ ...old, multiplierStartRound: value }))} />}
                {draftConfig.mode === "pinpoint" && !setupSolo && draftConfig.multipliers && <ConfigField label={c.increment} unit="×" value={draftConfig.multiplierIncrement} min={0.1} max={3} step={0.1} invalid={configErrors.includes("multiplierIncrement")} onChange={(value) => setDraftConfig((old) => ({ ...old, multiplierIncrement: value }))} />}
              </div>
              <div className="ot-summary"><b>{c.summary}</b><span>{draftConfig.mode === "country" ? (setupSolo ? c.untilMistake : `${MULTI_COUNTRY_ROUNDS} ${c.rounds}`) : (setupSolo ? `${SOLO_ROUNDS} ${c.rounds} · 25 000 ${c.points}` : `${checked.value.initialHp.toLocaleString()} PV`)}</span><small>{draftConfig.mode === "country" ? c.countryRule : (setupSolo ? c.soloScoreRule : c.damageRule)}</small></div>
              {!hasEmbedKey && <div className="ot-key-warning"><b>{c.noKeyTitle}</b><span>{c.noKeyBody}</span></div>}
              {draftConfig.mode === "pinpoint" && !hasWebGL && <div className="ot-key-warning"><b>{c.noWebglTitle}</b><span>{c.noWebglBody}</span></div>}
              {notice && <p className="ot-form-error">{notice}</p>}
              <div className="ot-setup-actions"><button className="ot-btn secondary" onClick={() => { setDraftConfig({ ...DEFAULT_CONFIG }); setConfigErrors([]); setNotice(""); }}>{c.reset}</button><button className="ot-btn primary" disabled={!hasEmbedKey || !state.seats.length || (draftConfig.mode === "pinpoint" && !hasWebGL)} onClick={start}>{setupSolo ? c.launchSolo : c.launchMulti}</button></div>
            </>
          ) : <div className="ot-wait-card"><div className="ot-orbit" /><p>{c.waitingHost}</p></div>}
          <button className="ot-text-button" onClick={backToLobby}>{c.lobby}</button>
        </section>
      </div>
    );
  }

  if (state.phase === "reveal" || state.phase === "finished") {
    const finished = state.phase === "finished";
    const result = state.result;
    const winnerSeats = state.seats.filter((seat) => (state.winnerPlayerIds || []).includes(seat.id));
    const pinpointWinner = state.seats.find((seat) => seat.teamId === state.winnerTeamId);
    const finalTitle = solo
      ? (mode === "country" ? `${state.streak} ${state.streak === 1 ? c.country : c.countries}` : `${state.soloScore.toLocaleString()} / 25 000`)
      : (winnerSeats.length ? winnerSeats.map((seat) => `${seat.avatar} ${seat.username}`).join(" · ") : pinpointWinner ? `${pinpointWinner.avatar} ${pinpointWinner.username}` : c.results);
    return (
      <div className={"ot-root ot-reveal-root" + (finished ? " finished" : "") + (mode === "country" ? " country" : "")}>
        <div className="ot-reveal-head">
          <div><span className="ot-kicker">{finished ? c.finalResult : `${c.round} ${state.round}`}</span><h1>{finished ? finalTitle : c.reveal}</h1></div>
          {mode === "pinpoint" && !solo && <div className="ot-damage-burst"><small>{c.maxDamage}</small><strong>{result?.damage || 0}</strong><span>×{result?.multiplier?.toLocaleString(lang === "en" ? "en-US" : "fr-FR")}</span></div>}
          {mode === "pinpoint" && solo && !finished && <div className="ot-score-burst"><small>{c.roundScore}</small><strong>{result?.players?.[0]?.score?.toLocaleString() || 0}</strong></div>}
          {mode === "country" && <div className="ot-country-target"><span>{countryFlag(result?.targetCountry || location?.country)}</span><div><small>{c.correctCountry}</small><b>{countryName(result?.targetCountry || location?.country, lang)}</b></div></div>}
        </div>

        {finished && solo && <section className="ot-final-summary"><span className="ot-final-icon">{mode === "country" ? "⚡" : "⌖"}</span><h2>{mode === "country" ? c.streakComplete : c.fiveRoundsComplete}</h2><strong>{finalTitle}</strong><div className="ot-history">{(state.history || []).map((entry) => <div key={`${entry.round}-${entry.locationId}`} className={entry.correct === false ? "wrong" : ""}><span>{entry.round}</span><b>{entry.targetCountry ? countryFlag(entry.targetCountry) : `${Number(entry.score || 0).toLocaleString()} pts`}</b><small>{entry.targetCountry ? countryName(entry.targetCountry, lang) : formatDistance(entry.distanceKm, lang)}</small></div>)}</div></section>}

        {(!finished || !solo) && <div className="ot-reveal-grid">
          {mode === "pinpoint" ? <section className="ot-reveal-map"><GuessMap expanded reveal={{ target: revealTarget, players: result?.players || [] }} seats={state.seats} unavailableMessage={c.mapUnavailable} /><span className="ot-actual-chip">{countryFlag(revealTarget?.country)} {c.actual}</span></section> : <section className="ot-country-reveal"><div className="ot-country-reveal-flag">{countryFlag(result?.targetCountry)}</div><span className="ot-kicker">{c.correctCountry}</span><h2>{countryName(result?.targetCountry, lang)}</h2>{solo && <p className={result?.players?.[0]?.correct ? "correct" : "wrong"}>{result?.players?.[0]?.correct ? c.streakContinues : c.streakStops}</p>}</section>}
          <section className="ot-scoreboard">
            {state.seats.map((seat, index) => {
              const player = result?.players?.find((entry) => entry.playerId === seat.id);
              const team = state.teams.find((entry) => entry.id === seat.teamId);
              const before = result?.beforeTeams?.find((entry) => entry.id === seat.teamId);
              const countryTotal = Number(state.countryScores?.[seat.id] || 0);
              return <article className={(team?.damage > 0 ? "damaged " : "") + (player?.correct ? "correct" : mode === "country" ? "wrong" : "")} key={seat.id} style={{ "--seat": SEAT_COLORS[index % SEAT_COLORS.length] }}>
                <header><span>{seat.avatar}</span><b>{seat.username}</b><strong>{mode === "country" ? `${countryTotal}/${state.round}` : (player?.score?.toLocaleString() || 0)}</strong></header>
                {mode === "pinpoint" && !solo && <AnimatedHealth team={team} maxHp={state.config.initialHp} fromHp={before?.hp} />}
                {mode === "pinpoint" ? <div><span>{player?.answered ? (player.confirmed ? c.confirmed : c.unconfirmed) : c.noAnswer}</span><b>{c.distance} · {formatDistance(player?.distanceKm, lang)}</b></div> : <div><span>{player?.guessCountry ? `${countryFlag(player.guessCountry)} ${countryName(player.guessCountry, lang)}` : c.noAnswer}</span><b>{player?.correct ? `✓ ${c.correct}` : `✕ ${c.wrong}`}</b></div>}
              </article>;
            })}
            {mode === "pinpoint" && !solo && <p className="ot-damage-copy">{result?.damagedTeamIds?.length ? c.multiDamageRule : c.tie}</p>}
            <div className="ot-reveal-actions">{isHost ? <>{state.phase === "reveal" && <button className="ot-btn primary" onClick={() => sendRequest("next")}>{state.matchComplete ? c.seeResults : c.next}</button>}{finished && <button className="ot-btn primary" onClick={() => sendRequest("rematch")}>{c.rematch}</button>}<button className="ot-btn secondary" onClick={backToLobby}>{c.lobby}</button></> : <><p>{c.hostOnly}</p><button className="ot-btn secondary" onClick={backToLobby}>{c.lobby}</button></>}</div>
          </section>
        </div>}
        {finished && solo && <div className="ot-final-actions"><button className="ot-btn primary" onClick={() => sendRequest("rematch")}>{c.playAgain}</button><button className="ot-btn secondary" onClick={backToLobby}>{c.lobby}</button></div>}
      </div>
    );
  }

  if (state.phase === "exhausted") return <div className="ot-root ot-center"><h1>Où&apos;s that ?</h1><p>{c.exhausted}</p><button className="ot-btn primary" onClick={backToLobby}>{c.lobby}</button></div>;

  const preparing = state.phase === "preparing" || state.phase === "countdown";
  return (
    <div className={"ot-root ot-arena" + (mapOpen ? " map-open" : "") + (mode === "country" ? " country" : "")}>
      {location && <StreetViewFrame location={location} roundId={state.roundId} lang={lang} onFrameLoad={markPanoramaLoaded} onSlow={markPanoramaSlow} />}
      {/* Les deux modes révèlent la position si on les laisse tels quels : le
          cartouche d'adresse de Google trahit le pays en mode Pays, et son
          lien « Afficher dans Google Maps » pose la réponse exacte en
          Pinpoint. Masqué dans les deux cas, jamais un seul (2026-09-06). */}
      <div className="ot-google-place-mask" aria-hidden="true" />
      <header className="ot-hud ot-hud-many">
        <div className="ot-player-strip">{state.seats.map((seat, index) => {
          const team = state.teams.find((entry) => entry.id === seat.teamId);
          const eliminated = mode === "pinpoint" && !solo && Number(team?.hp || 0) <= 0;
          const scoreLabel = mode === "country" ? `${Number(state.countryScores?.[seat.id] || 0)} ${c.pointsShort}` : solo ? `${state.soloScore.toLocaleString()} / 25 000` : undefined;
          return <PlayerBadge key={seat.id} seat={seat} team={team} maxHp={state.config.initialHp} ready={preparing && !eliminated ? !!state.loaded?.[seat.id] : undefined} answered={!!state.answers?.[seat.id]?.confirmed} active={state.firstConfirmedBy === seat.id} scoreLabel={scoreLabel} eliminated={eliminated} color={SEAT_COLORS[index % SEAT_COLORS.length]} />;
        })}</div>
        <div className="ot-round-clock"><small>{mode === "country" ? (solo ? `${c.streak} ${state.streak}` : `${c.round} ${state.round}/${MULTI_COUNTRY_ROUNDS}`) : `${c.round} ${state.round}${solo ? `/${SOLO_ROUNDS}` : ` · ×${multiplier.toLocaleString(lang === "en" ? "en-US" : "fr-FR")}`}`}</small><strong className={state.finalDeadline ? "urgent" : ""}>{state.phase === "playing" ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "—:—"}</strong></div>
      </header>

      {preparing && <div className="ot-panorama-cover"><div className="ot-cover-card">{state.phase === "countdown" ? <div className="ot-countdown" key={countdown}>{countdown}</div> : <><div className="ot-orbit" /><h2>{c.loading}</h2><div className="ot-load-list">{playingSeats(state).filter((seat) => onlineSeatIds.has(seat.id)).map((seat) => <span key={seat.id} className={state.loaded?.[seat.id] ? "ready" : ""}>{seat.avatar} {seat.username} · {state.loaded?.[seat.id] ? c.loaded : c.loadingOne}</span>)}</div><p>{solo ? c.soloFairStart : c.fairStart}</p><small>{c.externalLimit}</small></>}</div></div>}

      {state.phase === "playing" && mode === "pinpoint" && <section className={"ot-map-dock " + (mapOpen ? "open" : "collapsed") + (mapExpanded ? " expanded" : "")}>
        <button className="ot-map-peek" onClick={() => setMapOpen(true)} aria-label={c.openMap}><span>🗺️</span>{draft && <i>✓</i>}</button>
        <div className="ot-map-head"><div><b>{c.mapTitle}</b><small>{locked ? (myPlaying ? c.answerLocked : c.spectating) : c.placeHint}</small></div><div className="ot-map-head-controls"><button onClick={(event) => { event.stopPropagation(); setMapExpanded((value) => !value); }} aria-label={mapExpanded ? c.shrink : c.expand}>{mapExpanded ? "↘" : "↗"}</button><button onClick={(event) => { event.stopPropagation(); setMapExpanded(false); setMapOpen(false); }} aria-label={c.closeMap}>×</button></div></div>
        <GuessMap marker={draft} onChange={updateDraft} locked={locked} expanded={mapOpen ? (mapExpanded ? "fullscreen" : "open") : "closed"} avatar={mySeat?.avatar} unavailableMessage={c.mapUnavailable} />
        <div className="ot-map-actions"><span>{draft ? `${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}` : c.noMarker}</span><button className="ot-btn primary" disabled={!draft || locked} onClick={(event) => { event.stopPropagation(); submitDraft(); }}>{locked ? c.confirmed : c.confirm}</button></div>
      </section>}

      {state.phase === "playing" && mode === "country" && <CountryPicker key={state.roundId} choices={choiceCodes} inputMode={state.config.countryInput} lang={lang} selected={typeof draft === "string" ? draft : null} locked={locked} onChange={updateCountryDraft} onConfirm={submitDraft} c={c} />}

      {state.finalDeadline && state.firstConfirmedBy !== me.id && !locked && <div className="ot-final-alert">⚡ {c.firstLocked}</div>}
      {locked && myPlaying && state.phase === "playing" && <div className="ot-locked-toast">✓ {solo ? c.answerLocked : c.waitingOpponent}</div>}
      {!myPlaying && state.phase === "playing" && <div className="ot-locked-toast">◉ {c.spectating}</div>}
      <div className="ot-corner-actions"><button className={reportArmed ? "armed" : ""} title={reportArmed ? c.reportConfirmHint : undefined} onClick={handleReport}>{reportArmed ? c.reportConfirm : c.report}</button><button onClick={backToLobby}>{c.lobby}</button></div>
      {notice && <div className="ot-network-note">{notice}</div>}
    </div>
  );
}
