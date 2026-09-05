"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { readGameState, recordMatchResult, resetRoomToLobby, saveGameState } from "@/lib/gameSync";
import GuessMap from "./GuessMap";
import StreetViewFrame from "./StreetViewFrame";
import { LOCATION_BY_ID, countryFlag, locationOrder } from "./locations";
import {
  DEFAULT_CONFIG,
  GAME_ID,
  canAcceptAnswer,
  canResolveRound,
  finalDeadline,
  normalizeGuess,
  resetForRematch,
  resolveRound,
  roundMultiplier,
  validateConfig,
} from "./rules";
import { copyFor } from "./strings";

const STATE_VERSION = 1;
const PANORAMA_SETTLE_MS = 2500;
const COUNTDOWN_MS = 3000;
const PROPOSAL_INTERVAL_MS = 120; // 8,3/s maximum, sous la limite projet de 10/s.

function seatList(players) {
  return (players || []).slice(0, 2).map((player, index) => ({
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
  };
}

function nextLocation(state, advanceRound) {
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
  };
}

function currentLimit(state) {
  if (!state || state.phase !== "playing") return null;
  return state.finalDeadline || state.deadline || null;
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

function PlayerBadge({ seat, team, maxHp, ready, answered, active }) {
  const hp = Math.max(0, team?.hp || 0);
  const pct = Math.max(0, Math.min(100, hp / Math.max(1, maxHp) * 100));
  return (
    <div className={"ot-player" + (active ? " active" : "") + (answered ? " answered" : "")}>
      <span className="ot-player-avatar">{seat?.avatar}</span>
      <span className="ot-player-copy"><b>{seat?.username}</b><small>{hp.toLocaleString()} PV</small></span>
      <span className="ot-hp"><i style={{ width: `${pct}%` }} /></span>
      {ready !== undefined && <span className={"ot-ready-dot" + (ready ? " ready" : "")} aria-label={ready ? "prêt" : "chargement"} />}
    </div>
  );
}

function AnimatedHealth({ team, maxHp, fromHp }) {
  const [shown, setShown] = useState(fromHp ?? team.hp);
  useEffect(() => {
    setShown(fromHp ?? team.hp);
    const frame = requestAnimationFrame(() => setShown(team.hp));
    return () => cancelAnimationFrame(frame);
  }, [team.hp, fromHp]);
  const pct = Math.max(0, Math.min(100, shown / Math.max(1, maxHp) * 100));
  return <span className="ot-reveal-hp"><i style={{ width: `${pct}%` }} /></span>;
}

function formatDistance(km, lang) {
  if (km === null || km === undefined) return "—";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toLocaleString(lang === "en" ? "en-US" : "fr-FR", { maximumFractionDigits: km < 100 ? 1 : 0 })} km`;
}

export default function OusThatGame({ room, me, isHost, players, lang, onFinish }) {
  const c = copyFor(lang);
  const hasEmbedKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;
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

  const stateRef = useRef(null);
  const channelRef = useRef(null);
  const hostTimerRef = useRef(null);
  const recordedMatchRef = useRef(null);
  const lastProposalAtRef = useRef(0);
  const pendingProposalRef = useRef(null);
  const proposalTimerRef = useRef(null);

  const applyIncoming = useCallback((next, transport = {}) => {
    if (!next || next.v !== STATE_VERSION) return;
    stateRef.current = next;
    setState(next);
    if (next.phase === "playing") {
      const remaining = Number(transport.remainingMs);
      if (Number.isFinite(remaining)) setLocalDeadline(Date.now() + Math.max(0, remaining));
      else if (isHost && currentLimit(next)) setLocalDeadline(currentLimit(next));
    } else {
      setLocalDeadline(null);
    }
    if (next.phase === "countdown") {
      const remaining = Number(transport.countdownMs);
      setLocalCountdown(Date.now() + (Number.isFinite(remaining) ? Math.max(0, remaining) : COUNTDOWN_MS));
    } else {
      setLocalCountdown(null);
    }
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
    const beforeTeams = current.teams.map((team) => ({ ...team }));
    const result = resolveRound({
      seats: current.seats,
      teams: current.teams,
      answers: current.answers,
      target,
      round: current.round,
      config: current.config,
    });
    emitState({
      ...current,
      phase: result.winnerTeamId ? "finished" : "reveal",
      teams: result.teams,
      deadline: null,
      finalDeadline: null,
      resolvedRoundId: roundId,
      result: { ...result, beforeTeams },
      winnerTeamId: result.winnerTeamId,
    });
  }, [emitState, isHost]);

  const hostHandleRequest = useCallback((request) => {
    const current = stateRef.current;
    if (!isHost || !current || !request || !current.seats.some((seat) => seat.id === request.from)) return;
    const now = Date.now();
    const answer = current.answers?.[request.from] || null;

    if (request.kind === "sync") {
      const transport = transportFor(current);
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { state: current, transport, to: request.from } });
      return;
    }
    if (request.kind === "start" && current.phase === "setup" && request.from === room.host_id) {
      const checked = validateConfig(request.config);
      if (!checked.ok || current.seats.length !== 2) return;
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
        resolvedRoundId: null, result: null, winnerTeamId: null,
      });
      return;
    }
    if (request.kind === "panorama_loaded" && current.phase === "preparing" && request.roundId === current.roundId) {
      if (current.loaded?.[request.from]) return;
      emitState({ ...current, loaded: { ...current.loaded, [request.from]: true } });
      return;
    }
    if (request.kind === "proposal" && canAcceptAnswer({ phase: current.phase, now, deadline: currentLimit(current), answer })) {
      const guess = normalizeGuess(request.guess);
      if (!guess || request.roundId !== current.roundId) return;
      const next = { ...current, answers: { ...current.answers, [request.from]: { ...answer, proposal: guess } } };
      saveHostOnly(next);
      return;
    }
    if (request.kind === "confirm" && canAcceptAnswer({ phase: current.phase, now, deadline: currentLimit(current), answer })) {
      const guess = normalizeGuess(request.guess) || normalizeGuess(answer?.proposal);
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
      // emitState met stateRef à jour synchroniquement : résoudre ici ferme la
      // fenêtre où un signalement tardif pourrait annuler deux réponses déjà
      // verrouillées avant le prochain tour de boucle.
      if (current.seats.every((seat) => !!answers[seat.id]?.confirmed)) hostResolve(current.roundId);
      return;
    }
    const canVoidLocation = ["preparing", "countdown"].includes(current.phase)
      || (current.phase === "playing"
        && now <= currentLimit(current)
        && !current.seats.some((seat) => current.answers?.[seat.id]?.confirmed));
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

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!state?.roundId) return;
    clearTimeout(proposalTimerRef.current);
    proposalTimerRef.current = null;
    pendingProposalRef.current = null;
    lastProposalAtRef.current = 0;
    const mine = state.answers?.[me.id];
    setDraft(normalizeGuess(mine?.confirmed) || normalizeGuess(mine?.proposal) || null);
    setMapOpen(false);
    setMapExpanded(false);
    setNotice("");
  }, [state?.roundId, me.id]);

  useEffect(() => {
    if (!isHost || !state) return;
    clearTimeout(hostTimerRef.current);
    if (state.phase === "preparing" && state.seats.length === 2 && state.seats.every((seat) => state.loaded?.[seat.id])) {
      hostTimerRef.current = setTimeout(() => {
        const current = stateRef.current;
        if (!current || current.phase !== "preparing" || current.roundId !== state.roundId) return;
        emitState({ ...current, phase: "countdown", countdownAt: Date.now() + COUNTDOWN_MS });
      }, PANORAMA_SETTLE_MS);
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
  }, [emitState, hostResolve, isHost, state?.phase, state?.roundId, state?.loaded, state?.countdownAt, state?.deadline, state?.finalDeadline]);

  useEffect(() => {
    if (!state || !["countdown", "playing"].includes(state.phase)) return;
    const timer = setInterval(() => setTick(Date.now()), 100);
    return () => clearInterval(timer);
  }, [state?.phase]);

  useEffect(() => {
    if (state?.phase !== "finished" || !state.matchId || recordedMatchRef.current === state.matchId) return;
    recordedMatchRef.current = state.matchId;
    const mySeat = state.seats.find((seat) => seat.id === me.id);
    if (mySeat) recordMatchResult(room.id, mySeat.teamId === state.winnerTeamId);
  }, [state?.phase, state?.matchId, state?.winnerTeamId, me.id, room.id]);

  const location = state ? LOCATION_BY_ID[state.locationOrder?.[state.locationCursor]] : null;
  const myAnswer = state?.answers?.[me.id] || null;
  const locked = !!myAnswer?.confirmed;
  const remainingMs = state?.phase === "playing" && localDeadline ? Math.max(0, localDeadline - tick) : 0;
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const countdown = state?.phase === "countdown" && localCountdown ? Math.max(1, Math.ceil((localCountdown - tick) / 1000)) : 3;
  const multiplier = state ? roundMultiplier(state.round || 1, state.config || DEFAULT_CONFIG) : 1;
  const revealTarget = location ? { lat: location.lat, lng: location.lng, country: location.country } : null;

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

  // Ces callbacks restent stables pendant les ticks du chrono : l'iframe
  // Street View ne doit jamais être reconstruite dix fois par seconde.
  const markPanoramaLoaded = useCallback(() => {
    const current = stateRef.current;
    if (current?.roundId) sendRequest("panorama_loaded", { roundId: current.roundId });
  }, [sendRequest]);
  const markPanoramaSlow = useCallback(() => {
    setNotice(copyFor(lang).loadingSlow);
  }, [lang]);

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

  if (!channelReady || !state) {
    return <div className="ot-root ot-center"><div className="ot-orbit" /><p>{c.connection}</p></div>;
  }

  if (state.phase === "setup") {
    const checked = validateConfig(draftConfig);
    return (
      <div className="ot-root ot-setup-root">
        <div className="ot-setup-globe" aria-hidden="true" />
        <section className="ot-setup-card">
          <div className="ot-kicker">ARCARDI · {c.subtitle}</div>
          <h1>Où&apos;s that ?</h1>
          <p className="ot-setup-lead">{c.setupIntro}</p>
          <div className="ot-versus">
            {state.seats.map((seat, index) => <div key={seat.id}><span>{seat.avatar}</span><b>{seat.username}</b>{index === 0 && <i>VS</i>}</div>)}
          </div>
          {isHost ? (
            <>
              <div className="ot-settings">
                <ConfigField label={c.hp} unit={c.points} value={draftConfig.initialHp} min={500} max={30000} invalid={configErrors.includes("initialHp")} onChange={(value) => setDraftConfig((old) => ({ ...old, initialHp: value }))} />
                <ConfigField label={c.roundTime} unit={c.seconds} value={draftConfig.roundSeconds} min={20} max={300} invalid={configErrors.includes("roundSeconds")} onChange={(value) => setDraftConfig((old) => ({ ...old, roundSeconds: value }))} />
                <ConfigField label={c.finalTime} unit={c.seconds} value={draftConfig.finalSeconds} min={3} max={60} invalid={configErrors.includes("finalSeconds")} onChange={(value) => setDraftConfig((old) => ({ ...old, finalSeconds: value }))} />
                <label className="ot-field ot-toggle-field"><span>{c.multipliers}</span><button type="button" className={draftConfig.multipliers ? "on" : ""} onClick={() => setDraftConfig((old) => ({ ...old, multipliers: !old.multipliers }))}><i />{draftConfig.multipliers ? c.enabled : c.disabled}</button></label>
                {draftConfig.multipliers && <ConfigField label={c.firstBoost} unit={c.round.toLowerCase()} value={draftConfig.multiplierStartRound} min={2} max={20} invalid={configErrors.includes("multiplierStartRound")} onChange={(value) => setDraftConfig((old) => ({ ...old, multiplierStartRound: value }))} />}
                {draftConfig.multipliers && <ConfigField label={c.increment} unit="×" value={draftConfig.multiplierIncrement} min={0.1} max={3} step={0.1} invalid={configErrors.includes("multiplierIncrement")} onChange={(value) => setDraftConfig((old) => ({ ...old, multiplierIncrement: value }))} />}
              </div>
              <div className="ot-summary"><b>{c.summary}</b><span>{checked.value.initialHp.toLocaleString()} PV · {checked.value.roundSeconds}s · délai {checked.value.finalSeconds}s</span><small>{c.scoreRule}<br />{c.damageRule}</small></div>
              {!hasEmbedKey && <div className="ot-key-warning"><b>{c.noKeyTitle}</b><span>{c.noKeyBody}</span></div>}
              {state.seats.length !== 2 && <p className="ot-form-error">{c.needTwo}</p>}
              {notice && <p className="ot-form-error">{notice}</p>}
              <div className="ot-setup-actions">
                <button className="ot-btn secondary" onClick={() => { setDraftConfig({ ...DEFAULT_CONFIG }); setConfigErrors([]); setNotice(""); }}>{c.reset}</button>
                <button className="ot-btn primary" disabled={!hasEmbedKey || state.seats.length !== 2} onClick={start}>{c.launch}</button>
              </div>
            </>
          ) : <div className="ot-wait-card"><div className="ot-orbit" /><p>{c.waitingHost}</p></div>}
          <button className="ot-text-button" onClick={backToLobby}>{c.lobby}</button>
        </section>
      </div>
    );
  }

  if (state.phase === "reveal" || state.phase === "finished") {
    const result = state.result;
    const winnerSeat = state.seats.find((seat) => seat.teamId === state.winnerTeamId);
    return (
      <div className={"ot-root ot-reveal-root" + (state.phase === "finished" ? " finished" : "")}>
        <div className="ot-reveal-head">
          <div><span className="ot-kicker">{state.phase === "finished" ? c.victory : `${c.round} ${state.round}`}</span><h1>{state.phase === "finished" ? `${winnerSeat?.avatar || "🏆"} ${winnerSeat?.username || ""}` : c.reveal}</h1></div>
          <div className="ot-damage-burst"><small>{c.damage}</small><strong>{result?.damage || 0}</strong><span>×{result?.multiplier?.toLocaleString(lang === "en" ? "en-US" : "fr-FR")}</span></div>
        </div>
        <div className="ot-reveal-grid">
          <section className="ot-reveal-map"><GuessMap expanded reveal={{ target: revealTarget, players: result?.players || [] }} /><span className="ot-actual-chip">{countryFlag(revealTarget?.country)} {c.actual}</span></section>
          <section className="ot-scoreboard">
            {state.seats.map((seat, index) => {
              const player = result?.players?.find((entry) => entry.playerId === seat.id);
              const team = state.teams.find((entry) => entry.id === seat.teamId);
              const before = result?.beforeTeams?.find((entry) => entry.id === seat.teamId);
              return <article className={team?.id === result?.damagedTeamId ? "damaged" : ""} key={seat.id} style={{ "--seat": index ? "#68d9ff" : "#ffca5f" }}>
                <header><span>{seat.avatar}</span><b>{seat.username}</b><strong>{player?.score?.toLocaleString() || 0}</strong></header>
                <AnimatedHealth team={team} maxHp={state.config.initialHp} fromHp={before?.hp} />
                <div><span>{player?.answered ? (player.confirmed ? c.confirmed : c.unconfirmed) : c.noAnswer}</span><b>{c.distance} · {formatDistance(player?.distanceKm, lang)}</b></div>
              </article>;
            })}
            <p className="ot-damage-copy">{result?.damage ? `${c.damageRule} ${result.damage.toLocaleString()} PV.` : c.tie}</p>
            <div className="ot-reveal-actions">
              {isHost ? <>
                {state.phase === "reveal" && <button className="ot-btn primary" onClick={() => sendRequest("next")}>{c.next}</button>}
                {state.phase === "finished" && <button className="ot-btn primary" onClick={() => sendRequest("rematch")}>{c.rematch}</button>}
                <button className="ot-btn secondary" onClick={backToLobby}>{c.lobby}</button>
              </> : <><p>{c.hostOnly}</p><button className="ot-btn secondary" onClick={backToLobby}>{c.lobby}</button></>}
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (state.phase === "exhausted") {
    return <div className="ot-root ot-center"><h1>Où&apos;s that ?</h1><p>{c.exhausted}</p><button className="ot-btn primary" onClick={backToLobby}>{c.lobby}</button></div>;
  }

  const preparing = state.phase === "preparing" || state.phase === "countdown";
  return (
    <div className={"ot-root ot-arena" + (mapOpen ? " map-open" : "")}>
      {location && <StreetViewFrame location={location} roundId={state.roundId} lang={lang} onFrameLoad={markPanoramaLoaded} onSlow={markPanoramaSlow} />}
      <header className="ot-hud">
        <PlayerBadge seat={state.seats[0]} team={state.teams[0]} maxHp={state.config.initialHp} ready={preparing ? !!state.loaded?.[state.seats[0]?.id] : undefined} answered={!!state.answers?.[state.seats[0]?.id]?.confirmed} active={state.firstConfirmedBy === state.seats[0]?.id} />
        <div className="ot-round-clock"><small>{c.round} {state.round} · ×{multiplier.toLocaleString(lang === "en" ? "en-US" : "fr-FR")}</small><strong className={state.finalDeadline ? "urgent" : ""}>{state.phase === "playing" ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "—:—"}</strong></div>
        <PlayerBadge seat={state.seats[1]} team={state.teams[1]} maxHp={state.config.initialHp} ready={preparing ? !!state.loaded?.[state.seats[1]?.id] : undefined} answered={!!state.answers?.[state.seats[1]?.id]?.confirmed} active={state.firstConfirmedBy === state.seats[1]?.id} />
      </header>

      {preparing && <div className="ot-panorama-cover">
        <div className="ot-cover-card">
          {state.phase === "countdown" ? <div className="ot-countdown" key={countdown}>{countdown}</div> : <><div className="ot-orbit" /><h2>{c.loading}</h2><div className="ot-load-list">{state.seats.map((seat) => <span key={seat.id} className={state.loaded?.[seat.id] ? "ready" : ""}>{seat.avatar} {seat.username} · {state.loaded?.[seat.id] ? c.loaded : c.loadingOne}</span>)}</div><p>{c.fairStart}</p><small>{c.externalLimit}</small></>}
        </div>
      </div>}

      {state.phase === "playing" && <>
        <section className={"ot-map-dock " + (mapOpen ? "open" : "collapsed") + (mapExpanded ? " expanded" : "")}>
          <button className="ot-map-peek" onClick={() => setMapOpen(true)} aria-label={c.openMap}><span>🗺️</span>{draft && <i>✓</i>}</button>
          <div className="ot-map-head"><div><b>{c.mapTitle}</b><small>{locked ? c.waitingOpponent : c.placeHint}</small></div><div className="ot-map-head-controls"><button onClick={(event) => { event.stopPropagation(); setMapExpanded((value) => !value); }} aria-label={mapExpanded ? c.shrink : c.expand}>{mapExpanded ? "↘" : "↗"}</button><button onClick={(event) => { event.stopPropagation(); setMapExpanded(false); setMapOpen(false); }} aria-label={c.closeMap}>×</button></div></div>
          <GuessMap marker={draft} onChange={updateDraft} locked={locked} expanded={mapOpen ? (mapExpanded ? "fullscreen" : "open") : "closed"} />
          <div className="ot-map-actions">
            <span>{draft ? `${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}` : c.noMarker}</span>
            <button className="ot-btn primary" disabled={!draft || locked} onClick={(event) => { event.stopPropagation(); if (draft) { sendRequest("confirm", { roundId: state.roundId, guess: draft }); setMapExpanded(false); setMapOpen(false); } }}>{locked ? c.confirmed : c.confirm}</button>
          </div>
        </section>
        {state.finalDeadline && state.firstConfirmedBy !== me.id && !locked && <div className="ot-final-alert">⚡ {c.firstLocked}</div>}
        {locked && <div className="ot-locked-toast">✓ {c.waitingOpponent}</div>}
      </>}

      <div className="ot-corner-actions">
        <button onClick={() => { if (window.confirm(c.reportHint)) sendRequest("location_problem", { roundId: state.roundId }); }}>{c.report}</button>
        <button onClick={backToLobby}>{c.lobby}</button>
      </div>
      {notice && <div className="ot-network-note">{notice}</div>}
    </div>
  );
}
