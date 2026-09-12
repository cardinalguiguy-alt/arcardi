"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { readGameState, recordMatchResult, resetRoomToLobby, saveGameState } from "@/lib/gameSync";
import MapPortal from "./MapPortal";
import StreetViewFrame from "./StreetViewFrame";
import {
  COUNTRIES,
  countryChoices,
  countryFlag,
  countryName,
  normalizeCountryCode,
  searchableCountryText,
} from "./countries";
import { LOCATION_BY_ID, MAPS, locationOrder, orderForMatch } from "./locations";
import {
  CONFIG_LIMITS,
  COUNTDOWN_MS,
  DEFAULT_CONFIG,
  DUEL_FINAL_SECONDS,
  GAME_ID,
  MAX_PLAYERS,
  MULTI_COUNTRY_ROUNDS,
  SOLO_ROUNDS,
  activeSeats,
  addCountryScores,
  canAcceptAnswer,
  canResolveRound,
  canVoidLocation,
  finalDeadline,
  isUnlimitedRound,
  matchWinners,
  normalizeGuess,
  resetForRematch,
  resolveCountryRound,
  resolveRound,
  ROUND_SECONDS_UNLIMITED,
  roundMultiplier,
  toggleTransitionPause,
  validateConfig,
} from "./rules";
import { copyFor } from "./strings";

const STATE_VERSION = 2;
const PANORAMA_SETTLE_MS = 2500;
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
    locationCursor: 0,
    usedLocationIds: [],
    loaded: {},
    answers: {},
    firstConfirmedBy: null,
    deadline: null,
    finalDeadline: null,
    transitionPaused: false,
    pausedCountdownMs: null,
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
  const nextId = orderForMatch(state.matchId, state.config?.mode, state.config?.mapId)[cursor];
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
    transitionPaused: false,
    pausedCountdownMs: null,
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

function ConfigField({ label, unit, value, min, max, step = 1, invalid, dimmed, hint, onChange }) {
  return (
    <label className={"ot-field" + (invalid ? " invalid" : "") + (dimmed ? " dimmed" : "")}>
      <span>{label}</span>
      <span className="ot-input-wrap">
        <input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(event.target.value)} />
        <small>{unit}</small>
      </span>
      {hint && <small className="ot-field-hint">{hint}</small>}
    </label>
  );
}

// Curseur de durée de manche (2026-09-07) : remplace le champ numérique brut
// par un contrôle continu qui va jusqu'à Illimité en bout de course, plutôt
// qu'une case à cocher séparée — un seul geste, une seule valeur affichée.
const ROUND_DURATION_STEP = 10;
const ROUND_DURATION_INFINITE_SLOT = CONFIG_LIMITS.roundSeconds[1] + ROUND_DURATION_STEP;

function formatRoundSeconds(value, c) {
  if (value === ROUND_SECONDS_UNLIMITED) return c.unlimited;
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  if (!minutes) return `${seconds} ${c.secondsShort}`;
  if (!seconds) return `${minutes} ${c.min}`;
  return `${minutes} ${c.min} ${seconds}`;
}

function RoundDurationField({ label, value, invalid, onChange, c }) {
  const [min] = CONFIG_LIMITS.roundSeconds;
  const sliderValue = value === ROUND_SECONDS_UNLIMITED ? ROUND_DURATION_INFINITE_SLOT : value;
  return (
    <label className={"ot-field ot-field-slider" + (invalid ? " invalid" : "")}>
      <span>{label}</span>
      <span className="ot-slider-wrap">
        <input
          type="range"
          min={min}
          max={ROUND_DURATION_INFINITE_SLOT}
          step={ROUND_DURATION_STEP}
          value={sliderValue}
          onChange={(event) => {
            const raw = Number(event.target.value);
            onChange(raw >= ROUND_DURATION_INFINITE_SLOT ? ROUND_SECONDS_UNLIMITED : raw);
          }}
        />
        <strong className={value === ROUND_SECONDS_UNLIMITED ? "infinite" : ""}>{formatRoundSeconds(value, c)}</strong>
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
  // Replié par défaut : le panorama est le seul point d'intérêt tant qu'on ne
  // cherche pas à répondre. Survol en entrée/sortie sur desktop (la souris
  // reste sur le panneau pendant qu'on tape) ; un clic sur la bulle repliée
  // ou sur le panneau lui-même l'ouvre pour le tactile, qui ne connaît pas le
  // survol. Se referme tout seul dès la réponse verrouillée (2026-09-06,
  // retour de Guillaume : le panneau plein écran masquait trop le panorama).
  const [open, setOpen] = useState(false);
  useEffect(() => { if (locked) setOpen(false); }, [locked]);
  const needle = normalizeSearch(query);
  const filtered = useMemo(() => {
    if (!needle) return COUNTRIES.slice().sort((a, b) => countryName(a.code, lang).localeCompare(countryName(b.code, lang))).slice(0, 10);
    return COUNTRIES
      .filter((country) => normalizeSearch(searchableCountryText(country, lang)).includes(needle))
      .sort((a, b) => countryName(a.code, lang).localeCompare(countryName(b.code, lang)))
      .slice(0, 10);
  }, [lang, needle]);

  return (
    <section
      className={"ot-country-picker " + inputMode + (open ? " open" : " collapsed")}
      onMouseEnter={() => !locked && setOpen(true)}
      onMouseLeave={() => !locked && setOpen(false)}
    >
      <button type="button" className="ot-country-peek" onClick={() => setOpen(true)} aria-label={c.openPanel}>
        <span>{selected ? countryFlag(selected) : "🌐"}</span><b>{selected ? countryName(selected, lang) : c.peekCountry}</b>
        {locked && <i>✓</i>}
      </button>
      <div className="ot-country-title">
        <span className="ot-kicker">{c.countryMode}</span><h2>{c.whichCountry}</h2>
        <button type="button" className="ot-country-collapse" onClick={(event) => { event.stopPropagation(); setOpen(false); }} aria-label={c.closePanel}>×</button>
      </div>
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

// Révélation de la manche EN INCRUSTATION sur le panorama toujours monté,
// pas un écran séparé qui le fait disparaître (2026-09-06). Repliable comme
// le dock de carte : ouverte par défaut (le résultat est ce qu'on veut voir
// tout de suite), mais on peut la refermer pour regarder autour de soi
// pendant que la manche suivante n'a pas encore chargé.
function RevealDock({ state, result, mode, solo, lang, c, revealTarget, isHost, myId, onNext, onLobby, mapAnchorRef }) {
  const [open, setOpen] = useState(true);
  // Repliée, la pastille doit garder MON résultat, pas celui du premier siège
  // (audit 2026-09-11 §P1 "Urgence et résultats peu personnels", corrigé
  // 2026-09-12) — en solo players[0] EST moi, d'où le repli qui garde le
  // même comportement qu'avant pour ce cas.
  const myResult = result?.players?.find((entry) => entry.playerId === myId) || result?.players?.[0];
  const soloCorrect = myResult?.correct;
  return (
    <section className={"ot-reveal-dock " + (open ? "open" : "collapsed") + (mode === "country" ? " country" : "")}>
      <button type="button" className="ot-reveal-peek" onClick={() => setOpen(true)} aria-label={c.openPanel}>
        <span>{mode === "country" ? countryFlag(result?.targetCountry) : "📍"}</span>
        <b>{mode === "country" ? (soloCorrect ? c.correct : c.wrong) : (myResult?.score?.toLocaleString() || 0)}</b>
      </button>
      <div className="ot-reveal-dock-head">
        <div><span className="ot-kicker">{c.round} {state.round}</span><h2>{c.reveal}</h2></div>
        <button type="button" className="ot-country-collapse" onClick={(event) => { event.stopPropagation(); setOpen(false); }} aria-label={c.closePanel}>×</button>
      </div>
      {mode === "pinpoint" && !solo && <div className="ot-damage-burst"><small>{c.maxDamage}</small><strong>{result?.damage || 0}</strong><span>×{result?.multiplier?.toLocaleString(lang === "en" ? "en-US" : "fr-FR")}</span></div>}
      {mode === "pinpoint" && solo && <div className="ot-score-burst"><small>{c.roundScore}</small><strong>{result?.players?.[0]?.score?.toLocaleString() || 0}</strong></div>}
      {mode === "country" && <div className="ot-country-target"><span>{countryFlag(result?.targetCountry)}</span><div><small>{c.correctCountry}</small><b>{countryName(result?.targetCountry, lang)}</b></div></div>}
      {mode === "country" && solo && <p className={"ot-reveal-streak " + (soloCorrect ? "correct" : "wrong")}>{soloCorrect ? c.streakContinues : c.streakStops}</p>}
      {mode === "pinpoint" && <section className="ot-reveal-map"><div ref={mapAnchorRef} className="ot-map-canvas" /><span className="ot-actual-chip">{countryFlag(revealTarget?.country)} {c.actual}</span></section>}
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
      </section>
      <div className="ot-reveal-actions">{isHost ? <button className="ot-btn primary" onClick={onNext}>{state.matchComplete ? c.seeResults : c.next}</button> : <p>{c.hostOnly}</p>}<button className="ot-btn secondary" onClick={onLobby}>{c.lobby}</button></div>
    </section>
  );
}

// Fin de partie EN INCRUSTATION sur le dernier panorama (2026-09-06, retour
// de Guillaume), plutôt qu'une page séparée : même principe que RevealDock,
// qui avait déjà quitté ce travers le même jour pour la révélation manche
// par manche. `location` reste celui de la DERNIÈRE manche (locationCursor
// ne bouge plus une fois matchComplete) : le panorama derrière le voile reste
// donc le bon, pas un panorama neuf ou vide.
function FinishedDock({ state, result, mode, solo, lang, c, revealTarget, location, isHost, onRematch, onLobby, mapAnchorRef }) {
  const winnerSeats = state.seats.filter((seat) => (state.winnerPlayerIds || []).includes(seat.id));
  const pinpointWinner = state.seats.find((seat) => seat.teamId === state.winnerTeamId);
  const finalTitle = solo
    ? (mode === "country" ? `${state.streak} ${state.streak === 1 ? c.country : c.countries}` : `${state.soloScore.toLocaleString()} / 25 000`)
    : (winnerSeats.length ? winnerSeats.map((seat) => `${seat.avatar} ${seat.username}`).join(" · ") : pinpointWinner ? `${pinpointWinner.avatar} ${pinpointWinner.username}` : c.results);
  return (
    <div className={"ot-finished-overlay" + (mode === "country" ? " country" : "")}>
      <div className="ot-reveal-root finished">
        <div className="ot-reveal-head">
          <div><span className="ot-kicker">{c.finalResult}</span><h1>{finalTitle}</h1></div>
          {mode === "pinpoint" && !solo && <div className="ot-damage-burst"><small>{c.maxDamage}</small><strong>{result?.damage || 0}</strong><span>×{result?.multiplier?.toLocaleString(lang === "en" ? "en-US" : "fr-FR")}</span></div>}
          {mode === "country" && <div className="ot-country-target"><span>{countryFlag(result?.targetCountry || location?.country)}</span><div><small>{c.correctCountry}</small><b>{countryName(result?.targetCountry || location?.country, lang)}</b></div></div>}
        </div>

        {solo && <section className="ot-final-summary"><span className="ot-final-icon">{mode === "country" ? "⚡" : "⌖"}</span><h2>{mode === "country" ? c.streakComplete : c.fiveRoundsComplete}</h2><strong>{finalTitle}</strong><div className="ot-history">{(state.history || []).map((entry) => <div key={`${entry.round}-${entry.locationId}`} className={entry.correct === false ? "wrong" : ""}><span>{entry.round}</span><b>{entry.targetCountry ? countryFlag(entry.targetCountry) : `${Number(entry.score || 0).toLocaleString()} pts`}</b><small>{entry.targetCountry ? countryName(entry.targetCountry, lang) : formatDistance(entry.distanceKm, lang)}</small></div>)}</div></section>}

        {!solo && <div className="ot-reveal-grid">
          {mode === "pinpoint" ? <section className="ot-reveal-map"><div ref={mapAnchorRef} className="ot-map-canvas" /><span className="ot-actual-chip">{countryFlag(revealTarget?.country)} {c.actual}</span></section> : <section className="ot-country-reveal"><div className="ot-country-reveal-flag">{countryFlag(result?.targetCountry)}</div><span className="ot-kicker">{c.correctCountry}</span><h2>{countryName(result?.targetCountry, lang)}</h2></section>}
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
            <div className="ot-reveal-actions">{isHost ? <><button className="ot-btn primary" onClick={onRematch}>{c.rematch}</button><button className="ot-btn secondary" onClick={onLobby}>{c.lobby}</button></> : <><p>{c.hostOnly}</p><button className="ot-btn secondary" onClick={onLobby}>{c.lobby}</button></>}</div>
          </section>
        </div>}
        {solo && <div className="ot-final-actions"><button className="ot-btn primary" onClick={onRematch}>{c.playAgain}</button><button className="ot-btn secondary" onClick={onLobby}>{c.lobby}</button></div>}
      </div>
    </div>
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [notice, setNotice] = useState("");
  const [tick, setTick] = useState(() => Date.now());
  const [localDeadline, setLocalDeadline] = useState(null);
  const [localCountdown, setLocalCountdown] = useState(null);
  const [reportArmed, setReportArmed] = useState(false);
  const [fsActive, setFsActive] = useState(false);
  // Son discret et réglable (audit 2026-09-11 §P1, livré 2026-09-12) :
  // préférence PAR SPECTATEUR, jamais un champ d'état partagé — elle ne
  // concerne que ce qu'on entend soi-même, comme mapOpen ou mapExpanded.
  const [soundOn, setSoundOn] = useState(() => {
    try { return localStorage.getItem("ousthat-sound") !== "0"; } catch (error) { return true; }
  });

  const arenaRef = useRef(null);
  const stateRef = useRef(null);
  const channelRef = useRef(null);
  const hostTimerRef = useRef(null);
  const recordedMatchRef = useRef(null);
  const lastProposalAtRef = useRef(0);
  const pendingProposalRef = useRef(null);
  const proposalTimerRef = useRef(null);
  const reportTimerRef = useRef(null);
  // Rythme des tours (audit 2026-09-11) : trois emplacements visuels pour
  // une seule carte persistante (voir MapPortal.js) — chaque dock pose une
  // ancre vide, le portail choisit laquelle est active selon la phase.
  const playMapAnchorRef = useRef(null);
  const revealMapAnchorRef = useRef(null);
  const finishedMapAnchorRef = useRef(null);
  // Préchargement du panorama suivant PENDANT la révélation : chaque client
  // le fait pour son propre compte (aucun protocole réseau nouveau), et
  // court-circuite l'attente de "preparing" s'il retrouve exactement le même
  // roundId une fois la manche suivante réellement lancée.
  const preloadedRoundIdRef = useRef(null);
  const nextPredictedRef = useRef(null);
  // Un seul AudioContext, créé au premier son plutôt qu'au montage : la
  // plupart des navigateurs le suspendent tant qu'aucun geste utilisateur ne
  // l'a débloqué, et un geste a toujours déjà eu lieu ici (Jouer, Confirmer…)
  // avant qu'une urgence de duel ne puisse survenir.
  const audioCtxRef = useRef(null);
  const pingedFinalDeadlineRef = useRef(null);

  const proposedSeats = seatList(players);
  const playerSignature = proposedSeats.map((seat) => seat.id).join("|");
  const onlineSeatIds = useMemo(() => new Set(proposedSeats.map((seat) => seat.id)), [playerSignature]);

  const applyIncoming = useCallback((next, transport = {}) => {
    if (!next || next.v !== STATE_VERSION) return;
    stateRef.current = next;
    setState(next);
    if (next.phase === "playing") {
      // transport.remainingMs vaut null pour une manche illimitée (voir
      // transportFor) : Number(null) === 0 le ferait passer pour "0 ms
      // restante" au lieu de "aucune échéance" — d'où la vérification de
      // type AVANT la conversion numérique.
      const remaining = typeof transport.remainingMs === "number" ? transport.remainingMs : NaN;
      if (Number.isFinite(remaining)) setLocalDeadline(Date.now() + Math.max(0, remaining));
      else if (isHost && currentLimit(next)) setLocalDeadline(currentLimit(next));
      else setLocalDeadline(null);
    } else setLocalDeadline(null);
    if (next.phase === "countdown") {
      // Même garde que remainingMs juste au-dessus : countdownMs vaut null,
      // jamais 0, quand le décompte est en PAUSE (transitionPaused) — un
      // Number(null) === 0 non gardé ferait croire à un décompte à 0 s au
      // lieu d'aucune échéance à reconstruire (voir toggleTransitionPause,
      // rules.js). L'affichage figé pendant la pause relit directement
      // state.pausedCountdownMs, pas ce compte à rebours local.
      const remaining = typeof transport.countdownMs === "number" ? transport.countdownMs : NaN;
      setLocalCountdown(Number.isFinite(remaining) ? Date.now() + Math.max(0, remaining) : null);
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
    const order = orderForMatch(current.matchId, current.config?.mode, current.config?.mapId);
    const target = LOCATION_BY_ID[order[current.locationCursor]];
    if (!target) return;
    const seats = playingSeats(current);
    const solo = isSolo(current);

    if (modeOf(current) === "country") {
      const result = resolveCountryRound({ seats, answers: current.answers, targetCountry: target.country });
      const countryScores = addCountryScores(current.countryScores, result.players);
      const mine = result.players[0];
      const streak = solo && mine?.correct ? current.streak + 1 : current.streak;
      const lastLocation = current.locationCursor >= order.length - 1;
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
      const order = locationOrder(matchId, checked.value.mode, checked.value.mapId);
      // Une carte future, croisée avec le mode Pays, peut n'avoir AUCUN lieu
      // rattaché à un pays (audit 2026-09-06) : refuser plutôt que démarrer
      // sur un tirage vide, que hostResolve ne saurait pas résoudre.
      if (!order.length) return;
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
      // Audit 2026-09-11 : en duel (exactement 2 joueurs actifs), la première
      // validation arme toujours 10 s fixes pour l'autre, y compris en durée
      // illimitée (current.deadline === null, où finalDeadline() renvoie
      // sciemment null — voir sa garde). Les parties à 3+ gardent le
      // comportement existant (finalSeconds configurable, toujours désarmé
      // en illimité) : l'extension au-delà du duel reste hors scope.
      const isDuel = eligible.length === 2;
      const nextFinalDeadline = current.firstConfirmedBy
        ? current.finalDeadline
        : isDuel && current.deadline === null
          ? now + DUEL_FINAL_SECONDS * 1000
          : finalDeadline(now, current.deadline, isDuel ? DUEL_FINAL_SECONDS : current.config.finalSeconds);
      const next = {
        ...current,
        answers,
        firstConfirmedBy: first,
        finalDeadline: nextFinalDeadline,
      };
      emitState(next);
      // Un joueur éliminé en Pinpoint reste spectateur et ne peut pas bloquer
      // la manche suivante dans une partie à trois joueurs ou plus.
      if (eligible.every((seat) => !!answers[seat.id]?.confirmed)) hostResolve(current.roundId);
      return;
    }
    const locationVoidable = canVoidLocation({
      phase: current.phase,
      now,
      limit: currentLimit(current),
      anyConfirmed: eligible.some((seat) => current.answers?.[seat.id]?.confirmed),
    });
    if (request.kind === "location_problem" && locationVoidable && request.roundId === current.roundId) {
      emitState(nextLocation(current, false));
      return;
    }
    if (request.kind === "toggle_pause" && request.from === room.host_id) {
      const next = toggleTransitionPause(current, now);
      if (next !== current) emitState(next);
      return;
    }
    if (request.kind === "next" && current.phase === "reveal" && request.from === room.host_id) {
      emitState(nextLocation(current, true));
      return;
    }
    if (request.kind === "rematch" && current.phase === "finished" && request.from === room.host_id) {
      const matchId = `${room.id}:${now}`;
      emitState(resetForRematch(current, locationOrder(matchId, current.config.mode, current.config.mapId), matchId));
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
    // Le dock se replie à chaque manche (le panorama garde l'attention au
    // démarrage), mais la TAILLE choisie (plein écran ou non) survit d'une
    // manche à l'autre depuis le rythme des tours du 2026-09-11 — avant, un
    // joueur qui préférait la carte en plein écran devait ré-agrandir à
    // chaque manche (audit : "taille/ouverture réinitialisées").
    setMapOpen(false);
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
        // Une manche illimitée part sans échéance (deadline: null) plutôt
        // qu'avec une échéance lointaine : voir isUnlimitedRound et le garde
        // équivalent de finalDeadline() dans rules.js.
        const deadline = isUnlimitedRound(current.config) ? null : Date.now() + current.config.roundSeconds * 1000;
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

  const location = state ? LOCATION_BY_ID[orderForMatch(state.matchId, state.config?.mode, state.config?.mapId)[state.locationCursor]] : null;
  const mode = modeOf(state);
  const solo = isSolo(state);
  const mySeat = state?.seats?.find((seat) => seat.id === me.id);
  const myAnswer = state?.answers?.[me.id] || null;
  const myPlaying = !!playingSeats(state).find((seat) => seat.id === me.id);
  const locked = !!myAnswer?.confirmed || !myPlaying;
  const remainingMs = state?.phase === "playing" && localDeadline ? Math.max(0, localDeadline - tick) : 0;
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  // En pause, le nombre affiché relit directement l'état diffusé (une durée
  // déjà calculée par l'hôte), jamais le décompte local à base de tick : les
  // deux ne doivent jamais comparer d'horloges (§3 CLAUDE.md), et l'état
  // diffusé est justement ce qui reste identique pour tout le monde tant que
  // rien ne reprend.
  const countdown = state?.phase === "countdown"
    ? (state.transitionPaused
        ? Math.max(1, Math.ceil((state.pausedCountdownMs ?? COUNTDOWN_MS) / 1000))
        : (localCountdown ? Math.max(1, Math.ceil((localCountdown - tick) / 1000)) : 3))
    : 3;
  const multiplier = state ? roundMultiplier(state.round || 1, state.config || DEFAULT_CONFIG) : 1;
  const revealTarget = location ? { lat: location.lat, lng: location.lng, country: location.country } : null;
  const choiceCodes = useMemo(() => location && state?.roundId ? countryChoices(location.country, state.roundId, 4) : [], [location, state?.roundId]);

  // Rythme des tours : le lieu suivant se déduit sans requête (matchId +
  // curseur + numéro de manche sont déjà dans l'état partagé) UNIQUEMENT
  // pour l'avancée normale ("Suivant" en reveal) — un signalement de lieu
  // (location_problem) change le tirage de façon imprévisible côté client,
  // donc n'est jamais préchargé : au pire, "preparing" attend normalement.
  const nextPredicted = useMemo(() => {
    if (!state || state.phase !== "reveal" || state.matchComplete || mode !== "pinpoint") return null;
    const order = orderForMatch(state.matchId, state.config?.mode, state.config?.mapId);
    const nextId = order[state.locationCursor + 1];
    const nextLoc = nextId ? LOCATION_BY_ID[nextId] : null;
    if (!nextLoc) return null;
    return { location: nextLoc, roundId: `${state.matchId}:${state.round + 1}:0` };
  }, [state?.phase, state?.matchComplete, state?.matchId, state?.config?.mode, state?.config?.mapId, state?.locationCursor, state?.round, mode]);
  nextPredictedRef.current = nextPredicted;

  const handlePreloadLoaded = useCallback(() => {
    const predicted = nextPredictedRef.current;
    if (!predicted) return;
    preloadedRoundIdRef.current = predicted.roundId;
    const current = stateRef.current;
    if (current?.phase === "preparing" && current.roundId === predicted.roundId && !current.loaded?.[me.id]) {
      sendRequest("panorama_loaded", { roundId: predicted.roundId });
    }
  }, [me.id, sendRequest]);

  // Le préchargement peut finir PENDANT reveal, avant que la phase ne passe
  // à "preparing" — dans ce cas handlePreloadLoaded ne peut pas encore
  // envoyer l'accusé (l'hôte le refuserait, phase !== "preparing"). Cet
  // effet rattrape ce cas dès que la manche prédite devient la manche RÉELLE.
  useEffect(() => {
    if (state?.phase !== "preparing" || !state.roundId) return;
    if (preloadedRoundIdRef.current !== state.roundId) return;
    if (state.loaded?.[me.id]) return;
    sendRequest("panorama_loaded", { roundId: state.roundId });
  }, [state?.phase, state?.roundId, state?.loaded, me.id, sendRequest]);

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

  // 2026-09-07 (retour de Guillaume) : Espace confirme le pin posé, comme le
  // bouton "Confirmer" de .ot-map-actions — submitDraft() se garde déjà tout
  // seul (pas de pin/verrouillé/pas de manche = no-op). Ignoré si le focus
  // est sur un champ de saisie (recherche pays du mode Country, chat…) pour
  // ne jamais voler un espace tapé au clavier.
  useEffect(() => {
    if (state?.phase !== "playing" || mode !== "pinpoint") return;
    const onKeyDown = (event) => {
      if (event.code !== "Space" && event.key !== " ") return;
      const target = event.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      event.preventDefault();
      submitDraft();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state?.phase, mode, submitDraft]);

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

  // Plein écran RENDU PAR ARCARDI (2026-09-06, retour de Guillaume : « il
  // était cool, remets-le, en censurant toujours les infos ») — jamais via
  // l'attribut allowFullScreen de l'iframe (retiré à l'audit : Google y
  // promeut SON iframe seul dans le calque plein écran, hors de portée d'un
  // masque posé en frère dans le DOM parent, HUD compris). En demandant le
  // plein écran sur ot-arena elle-même, le masque ET le HUD sont des
  // DESCENDANTS de l'élément promu : ils restent rendus par-dessus, à
  // n'importe quelle taille d'écran.
  // Testé en dev (2026-09-06) : un contexte qui refuse le plein écran
  // (Permissions-Policy sans "fullscreen", iframe sans allow="fullscreen")
  // ne rejette pas toujours proprement une promesse — Chrome peut lever un
  // TypeError SYNCHRONE ("Permissions check failed"), qui remontait tel
  // quel jusqu'à React et cassait tout le jeu pour un simple bouton de
  // confort. try/catch + .catch() couvrent les deux formes d'échec.
  const toggleFullscreen = useCallback(() => {
    try {
      if (document.fullscreenElement) document.exitFullscreen?.()?.catch(() => {});
      else arenaRef.current?.requestFullscreen?.()?.catch(() => {});
    } catch (error) {
      // Rien à faire : le jeu reste jouable, seul le plein écran est refusé.
    }
  }, []);
  useEffect(() => {
    const onChange = () => setFsActive(document.fullscreenElement === arenaRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    try { localStorage.setItem("ousthat-sound", soundOn ? "1" : "0"); } catch (error) { /* confort seul, jamais bloquant */ }
  }, [soundOn]);

  // Bip discret, synthétisé (aucun fichier à livrer) : deux notes courtes en
  // glissando, jamais plus de 0,25 s. Un échec (API absente, contexte refusé
  // par la politique d'autoplay du navigateur) laisse simplement le jeu muet
  // — le son est un confort, jamais un blocage.
  const playPing = useCallback(() => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.16);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    } catch (error) { /* confort seul, jamais bloquant */ }
  }, []);

  // Sonne une seule fois par manche, seulement pour le joueur qui doit se
  // presser (pas celui qui vient de répondre) — jamais en solo, où personne
  // n'attend personne. pingedFinalDeadlineRef évite de rejouer le bip à
  // chaque re-rendu tant que finalDeadline garde la même échéance.
  useEffect(() => {
    if (!soundOn || solo || !state?.finalDeadline) return;
    if (pingedFinalDeadlineRef.current === state.finalDeadline) return;
    pingedFinalDeadlineRef.current = state.finalDeadline;
    if (state.firstConfirmedBy !== me.id) playPing();
  }, [soundOn, solo, state?.finalDeadline, state?.firstConfirmedBy, me.id, playPing]);

  const start = () => {
    const checked = validateConfig(draftConfig);
    setConfigErrors(checked.errors);
    if (!checked.ok) { setNotice(c.invalid); return; }
    // Vérifié côté client AVANT d'envoyer (audit 2026-09-06) : l'hôte refuse
    // silencieusement un tirage vide (croisement mode Pays × carte sans
    // aucun lieu rattaché à un pays) — mieux vaut le dire tout de suite que
    // laisser le clic "Jouer" ne rien faire sans explication.
    if (!locationOrder("preview", checked.value.mode, checked.value.mapId).length) { setNotice(c.noLocationsForMap); return; }
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
    // Repliés par défaut (audit 2026-09-11 : "réglages avancés exposés dès
    // l'entrée" faisait passer Lancer la partie sous le pli) — mais jamais
    // repliés SUR une valeur hors bornes : une erreur de validation doit
    // rester visible, jamais cachée derrière un volet fermé.
    const advancedVisible = advancedOpen || configErrors.includes("multiplierStartRound") || configErrors.includes("multiplierIncrement");
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
              {/* Sélecteur de carte (2026-09-06) : une seule carte à ce jour
                  (Beautiful World, tout le stock) — voir maps.js pour en
                  ajouter. Rendu même à une seule entrée : c'est ce qui rend
                  visible qu'il y en aura d'autres, sans logique à changer le
                  jour où une deuxième carte s'ajoute au registre. */}
              <div className="ot-map-picker">
                <b className="ot-map-picker-label">{c.mapLabel}</b>
                <div className="ot-map-picker-list">
                  {MAPS.map((map) => (
                    <button key={map.id} className={draftConfig.mapId === map.id ? "selected" : ""} onClick={() => setDraftConfig((old) => ({ ...old, mapId: map.id }))}>
                      <span>{map.icon}</span><b>{map.name}</b><small>{map.locations.length.toLocaleString(lang === "en" ? "en-US" : "fr-FR")} {c.mapLocations}</small>
                    </button>
                  ))}
                </div>
              </div>
              {draftConfig.mode === "country" && <div className="ot-answer-picker"><b>{c.answerMethod}</b><button className={draftConfig.countryInput === "multiple-choice" ? "selected" : ""} onClick={() => setDraftConfig((old) => ({ ...old, countryInput: "multiple-choice" }))}>🚩 {c.multipleChoice}</button><button className={draftConfig.countryInput === "search" ? "selected" : ""} onClick={() => setDraftConfig((old) => ({ ...old, countryInput: "search" }))}>⌕ {c.countrySearch}</button></div>}
              {/* La ligne pleine largeur (.ot-field-slider) force un saut de
                  ligne dans la grille à trois colonnes : la mettre EN
                  PREMIER lui laisse sa rangée à elle seule, puis vie/délai se
                  PARTAGENT la rangée suivante au lieu d'ouvrir chacun la
                  sienne. Mesuré (audit 2026-09-11, 1280×720) : 294px → 150px
                  pour ce bloc, la moitié de l'écart qui passait "Lancer la
                  partie" sous le pli. Champs identiques, ordre seul change. */}
              <div className="ot-settings">
                <RoundDurationField label={c.roundTime} value={draftConfig.roundSeconds} invalid={configErrors.includes("roundSeconds")} c={c} onChange={(value) => setDraftConfig((old) => ({ ...old, roundSeconds: value }))} />
                {draftConfig.mode === "pinpoint" && !setupSolo && <ConfigField label={c.hp} unit={c.points} value={draftConfig.initialHp} min={500} max={30000} invalid={configErrors.includes("initialHp")} onChange={(value) => setDraftConfig((old) => ({ ...old, initialHp: value }))} />}
                {!setupSolo && <ConfigField label={c.finalTime} unit={c.seconds} value={draftConfig.finalSeconds} min={3} max={60} invalid={configErrors.includes("finalSeconds")} dimmed={isUnlimitedRound(draftConfig)} hint={isUnlimitedRound(draftConfig) ? c.finalTimeDisabledHint : ""} onChange={(value) => setDraftConfig((old) => ({ ...old, finalSeconds: value }))} />}
              </div>
              {/* Volet replié par défaut (audit 2026-09-11, §P1 "tableau de
                  réglages") : les multiplicateurs étaient exposés au même
                  niveau que les réglages courants (HP, durée) dès l'entrée
                  sur l'écran. Sorti de .ot-settings plutôt que cousu dedans :
                  sa visibilité dépend de advancedVisible, pas seulement du
                  mode/solo comme les champs ci-dessus. */}
              {draftConfig.mode === "pinpoint" && !setupSolo && (
                <div className={"ot-advanced" + (advancedVisible ? " open" : "")}>
                  <button type="button" className="ot-advanced-toggle" aria-expanded={advancedVisible} onClick={() => setAdvancedOpen((value) => !value)}>
                    <b>{c.advancedSettings}</b>
                    <small>{c.multipliers} · {draftConfig.multipliers ? c.enabled : c.disabled}</small>
                    <i aria-hidden="true">{advancedVisible ? "▲" : "▼"}</i>
                  </button>
                  {advancedVisible && <div className="ot-settings">
                    <label className="ot-field ot-toggle-field"><span>{c.multipliers}</span><button type="button" className={draftConfig.multipliers ? "on" : ""} onClick={() => setDraftConfig((old) => ({ ...old, multipliers: !old.multipliers }))}><i />{draftConfig.multipliers ? c.enabled : c.disabled}</button></label>
                    {draftConfig.multipliers && <ConfigField label={c.firstBoost} unit={c.round.toLowerCase()} value={draftConfig.multiplierStartRound} min={2} max={20} invalid={configErrors.includes("multiplierStartRound")} onChange={(value) => setDraftConfig((old) => ({ ...old, multiplierStartRound: value }))} />}
                    {draftConfig.multipliers && <ConfigField label={c.increment} unit="×" value={draftConfig.multiplierIncrement} min={0.1} max={3} step={0.1} invalid={configErrors.includes("multiplierIncrement")} onChange={(value) => setDraftConfig((old) => ({ ...old, multiplierIncrement: value }))} />}
                  </div>}
                </div>
              )}
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


  if (state.phase === "exhausted") return <div className="ot-root ot-center"><h1>Où&apos;s that ?</h1><p>{c.exhausted}</p><button className="ot-btn primary" onClick={backToLobby}>{c.lobby}</button></div>;

  const preparing = state.phase === "preparing" || state.phase === "countdown";
  // Rythme des tours : UNE carte persistante (MapPortal.js), qui choisit
  // l'ancre active et les props GuessMap selon la phase — jamais trois
  // <GuessMap> séparés qui démontaient le contexte WebGL à chaque manche.
  const mapActive = mode === "pinpoint" && (state.phase === "playing" || state.phase === "reveal" || state.phase === "finished");
  const mapAnchorRef = state.phase === "playing" ? playMapAnchorRef : state.phase === "reveal" ? revealMapAnchorRef : finishedMapAnchorRef;
  const mapProps = state.phase === "playing"
    ? { marker: draft, onChange: updateDraft, locked, avatar: mySeat?.avatar, reveal: null, seats: state.seats, unavailableMessage: c.mapUnavailable }
    : { reveal: { target: revealTarget, players: state.result?.players || [] }, seats: state.seats, unavailableMessage: c.mapUnavailable };
  // Urgence/résultats (audit 2026-09-11 §P1, direction tranchée par
  // Guillaume, livrée 2026-09-12) : le duel (exactement deux sièges, la même
  // borne que DUEL_FINAL_SECONDS) retrouve le face-à-face — .ot-hud SANS
  // .ot-hud-many réactive le grid 3 colonnes et le miroir nth-child(3)
  // encore présents dans le CSS, orphelins depuis le passage au roster
  // horizontal (v2). Les parties à 3+ gardent .ot-player-strip, inchangé.
  const isDuelLayout = state.seats.length === 2;
  const renderPlayerBadge = (seat, index) => {
    const team = state.teams.find((entry) => entry.id === seat.teamId);
    const eliminated = mode === "pinpoint" && !solo && Number(team?.hp || 0) <= 0;
    const scoreLabel = mode === "country" ? `${Number(state.countryScores?.[seat.id] || 0)} ${c.pointsShort}` : solo ? `${state.soloScore.toLocaleString()} / 25 000` : undefined;
    return <PlayerBadge key={seat.id} seat={seat} team={team} maxHp={state.config.initialHp} ready={preparing && !eliminated ? !!state.loaded?.[seat.id] : undefined} answered={!!state.answers?.[seat.id]?.confirmed} active={state.firstConfirmedBy === seat.id} scoreLabel={scoreLabel} eliminated={eliminated} color={SEAT_COLORS[index % SEAT_COLORS.length]} />;
  };
  const roundClock = (
    <div className="ot-round-clock"><small>{mode === "country" ? (solo ? `${c.streak} ${state.streak}` : `${c.round} ${state.round}/${MULTI_COUNTRY_ROUNDS}`) : `${c.round} ${state.round}${solo ? `/${SOLO_ROUNDS}` : ` · ×${multiplier.toLocaleString(lang === "en" ? "en-US" : "fr-FR")}`}`}</small><strong className={state.finalDeadline ? "urgent" : ""}>{state.phase === "playing" ? (isUnlimitedRound(state.config) && !state.finalDeadline ? "∞" : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`) : "—:—"}</strong></div>
  );
  const firstConfirmedSeat = state.seats.find((seat) => seat.id === state.firstConfirmedBy);
  return (
    <div ref={arenaRef} className={"ot-root ot-arena" + (mapOpen ? " map-open" : "") + (mode === "country" ? " country" : "")}>
      {location && <StreetViewFrame location={location} roundId={state.roundId} lang={lang} onFrameLoad={markPanoramaLoaded} onSlow={markPanoramaSlow} />}
      {/* Rythme des tours (audit 2026-09-11) : charge en coulisses le
          panorama de la manche suivante PENDANT que la révélation est
          affichée, pour que l'attente de "preparing" soit déjà résolue une
          fois "Suivant" cliqué — jamais retiré du DOM par un simple masque
          CSS (§4 CLAUDE.md : ça ne l'empêcherait pas de charger, ici c'est
          justement le but, mais autant garder le geste conscient plutôt
          qu'un display:none accidentel qui l'empêcherait). */}
      {nextPredicted && <div aria-hidden="true" className="ot-sv-preload"><StreetViewFrame location={nextPredicted.location} roundId={nextPredicted.roundId} lang={lang} onFrameLoad={handlePreloadLoaded} onSlow={() => {}} /></div>}
      {/* Les deux modes révèlent la position si on les laisse tels quels : le
          cartouche d'adresse de Google trahit le pays en mode Pays, et son
          lien « Afficher dans Google Maps » pose la réponse exacte en
          Pinpoint. Masqué dans les deux cas, jamais un seul (2026-09-06).
          Habillage « dynamic island » (retour de Guillaume, même date) : un
          repère de coin plutôt qu'un bandeau plat — le glyphe est un simple
          rappel de marque, posé loin du coin exact (haut-gauche) où Google
          rend son texte, jamais dessus. */}
      <div className="ot-google-place-mask" aria-hidden="true"><span className="ot-google-place-mask-glyph">⌖</span></div>
      <header className={"ot-hud" + (isDuelLayout ? "" : " ot-hud-many")}>
        {isDuelLayout ? (
          <>
            {renderPlayerBadge(state.seats[0], 0)}
            {roundClock}
            {renderPlayerBadge(state.seats[1], 1)}
          </>
        ) : (
          <>
            <div className="ot-player-strip">{state.seats.map((seat, index) => renderPlayerBadge(seat, index))}</div>
            {roundClock}
          </>
        )}
      </header>

      {/* Toujours monté, jamais démonté/remonté (2026-09-06, retour de
          Guillaume sur les transitions) : la classe .hidden pilote un fondu
          CSS en sortie — avant, {preparing && <div>} démontait le voile
          d'un coup dès "playing", découvrant le panorama déjà chargé sans
          transition. */}
      <div className={"ot-panorama-cover" + (preparing ? "" : " hidden")}><div className="ot-cover-card">{state.phase === "countdown" ? <>
        <div className="ot-countdown" key={countdown}>{countdown}</div>
        {state.transitionPaused && <p className="ot-transition-paused-note">{c.transitionPausedNote}</p>}
        {/* Rythme des tours (audit 2026-09-11) : ne pause QUE ce décompte
            visible, jamais l'attente de chargement (pas d'horloge à figer
            là — voir toggleTransitionPause, rules.js). Hôte seul, comme le
            reste de l'arbitrage réseau (§3 CLAUDE.md). */}
        {isHost && <button type="button" className="ot-btn secondary ot-transition-pause" onClick={() => sendRequest("toggle_pause")}>{state.transitionPaused ? c.resumeTransition : c.pauseTransition}</button>}
      </> : <><div className="ot-orbit" /><h2>{c.loading}</h2><div className="ot-load-list">{playingSeats(state).filter((seat) => onlineSeatIds.has(seat.id)).map((seat) => <span key={seat.id} className={state.loaded?.[seat.id] ? "ready" : ""}>{seat.avatar} {seat.username} · {state.loaded?.[seat.id] ? c.loaded : c.loadingOne}</span>)}</div><p>{solo ? c.soloFairStart : c.fairStart}</p><small>{c.externalLimit}</small></>}</div></div>

      {mapActive && <MapPortal anchorRef={mapAnchorRef} active={mapActive} {...mapProps} />}

      {state.phase === "playing" && mode === "pinpoint" && <section className={"ot-map-dock " + (mapOpen ? "open" : "collapsed") + (mapExpanded ? " expanded" : "")} onMouseEnter={() => setMapOpen(true)}>
        {/* 2026-09-07 (retour de Guillaume : ouverture facilitée) : le survol
            de tout le dock ouvre la carte, pas seulement le clic sur le
            rond — le clic reste nécessaire au doigt (aucun "hover" tactile). */}
        <button className="ot-map-peek" onClick={() => setMapOpen(true)} aria-label={c.openMap}><span>🗺️</span>{draft && <i>✓</i>}</button>
        <div className="ot-map-head"><div><b>{c.mapTitle}</b><small>{locked ? (myPlaying ? c.answerLocked : c.spectating) : c.placeHint}</small></div><div className="ot-map-head-controls"><button onClick={(event) => { event.stopPropagation(); setMapExpanded((value) => !value); }} aria-label={mapExpanded ? c.shrink : c.expand}>{mapExpanded ? "↘" : "↗"}</button><button onClick={(event) => { event.stopPropagation(); setMapExpanded(false); setMapOpen(false); }} aria-label={c.closeMap}>×</button></div></div>
        <div ref={playMapAnchorRef} className="ot-map-canvas" />
        <div className="ot-map-actions"><span>{draft ? c.markerPlaced : c.noMarker}</span><button className="ot-btn primary" disabled={!draft || locked} onClick={(event) => { event.stopPropagation(); submitDraft(); }}>{locked ? c.confirmed : c.confirm}</button></div>
      </section>}

      {state.phase === "playing" && mode === "country" && <CountryPicker key={state.roundId} choices={choiceCodes} inputMode={state.config.countryInput} lang={lang} selected={typeof draft === "string" ? draft : null} locked={locked} onChange={updateCountryDraft} onConfirm={submitDraft} c={c} />}

      {state.phase === "reveal" && <RevealDock key={state.roundId} state={state} result={state.result} mode={mode} solo={solo} lang={lang} c={c} revealTarget={revealTarget} isHost={isHost} myId={me.id} onNext={() => sendRequest("next")} onLobby={backToLobby} mapAnchorRef={revealMapAnchorRef} />}

      {state.phase === "finished" && <FinishedDock state={state} result={state.result} mode={mode} solo={solo} lang={lang} c={c} revealTarget={revealTarget} location={location} isHost={isHost} onRematch={() => sendRequest("rematch")} onLobby={backToLobby} mapAnchorRef={finishedMapAnchorRef} />}

      {state.finalDeadline && state.firstConfirmedBy !== me.id && !locked && <div className="ot-final-alert">⚡ {c.playerAnsweredAlert(firstConfirmedSeat?.username || c.opponent, seconds)}</div>}
      {locked && myPlaying && state.phase === "playing" && <div className="ot-locked-toast">✓ {solo ? c.answerLocked : c.waitingOpponent}</div>}
      {!myPlaying && state.phase === "playing" && <div className="ot-locked-toast">◉ {c.spectating}</div>}
      {/* Le bouton doit aussi vivre pendant preparing/countdown (audit
          2026-09-06) : le moteur accepte déjà location_problem à ces phases
          (canVoidLocation, plus haut) — un panorama qui ne finit jamais de
          charger n'avait sinon aucune échappatoire hors "Retour au salon". */}
      {/* Garde-fou (2026-09-07) : une manche Illimité n'a plus AUCUNE échéance
          qui la termine toute seule — sans ce bouton, un joueur AFK/déconnecté
          la bloquerait pour toujours (seul "tous confirmés" la résout sinon). */}
      <div className="ot-corner-actions">{(state.phase === "playing" || preparing) && <button className={reportArmed ? "armed" : ""} title={reportArmed ? c.reportConfirmHint : undefined} onClick={handleReport}>{reportArmed ? c.reportConfirm : c.report}</button>}{isHost && state.phase === "playing" && isUnlimitedRound(state.config) && <button title={c.endRoundHint} onClick={() => hostResolve(state.roundId)}>⏭ {c.endRound}</button>}<button onClick={() => setSoundOn((value) => !value)} aria-label={soundOn ? c.muteSound : c.unmuteSound} title={soundOn ? c.muteSound : c.unmuteSound}>{soundOn ? "🔊" : "🔇"}</button><button onClick={toggleFullscreen} aria-label={fsActive ? c.exitFullscreen : c.enterFullscreen} title={fsActive ? c.exitFullscreen : c.enterFullscreen}>{fsActive ? "⤡" : "⤢"}</button><button onClick={backToLobby}>{c.lobby}</button></div>
      {notice && <div className="ot-network-note">{notice}</div>}
    </div>
  );
}
