"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby, recordMatchResult } from "@/lib/gameSync";
import Crossfade from "../Crossfade";
import GameCountdown, { COUNTDOWN_MS } from "../GameCountdown";
import { sanForLang, PIECE_VALUE } from "./notation";
import { chooseBotMove } from "./engine";

const GAME_ID = "chess";
const BOT_ID = "__arcardi_bot__"; // identifiant du siège tenu par l'ordinateur (mode solo)
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const CLOCK_SEC = 10 * 60; // pendule par défaut : 10 min (sans incrément en v1)
// Cadences proposées au démarrage (secondes par joueur, sans incrément).
const CADENCES = [
  { min: 3, sec: 3 * 60, tagKey: "chessBlitz" },
  { min: 5, sec: 5 * 60, tagKey: "chessRapid" },
  { min: 10, sec: 10 * 60, tagKey: "chessClassic" },
];

// Glyphes Unicode des pièces (rendu CSS "vrai plateau", cohérent avec la
// maquette validée). Blancs et noirs coloriés en CSS (voir .chess-piece).
// On utilise les glyphes SOLIDES pour les DEUX camps : les pièces blanches
// sont ainsi "pleines" (coloriées en ivoire + liseré sombre côté CSS), et non
// plus des contours creux. La distinction blanc/noir se fait uniquement par la
// couleur CSS (voir .chess-piece.w / .chess-piece.b).
const GLYPH = {
  w: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};
const FILES = "abcdefgh";
const TERMINAL = ["checkmate", "stalemate", "draw", "timeout", "resign"];

function fmtClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ":" + (r < 10 ? "0" : "") + r;
}

// Statut/vainqueur déduits d'une instance chess.js APRÈS un coup. On ne
// réécrit aucune règle : tout vient de chess.js (mat/pat/nulle).
function deriveStatus(game, moverColor) {
  if (game.isCheckmate()) return { status: "checkmate", winner: moverColor };
  if (game.isStalemate()) return { status: "stalemate", winner: null };
  if (game.isDraw()) return { status: "draw", winner: null }; // 50 coups, répétition, matériel insuffisant
  if (game.isCheck()) return { status: "check", winner: null };
  return { status: "playing", winner: null };
}

export default function ChessGame({ room, me, isHost, players, t, lang, onFinish, solo = false }) {
  const [phase, setPhase] = useState("intro"); // intro -> playing
  const [white, setWhite] = useState(null); // { id, username, avatar }
  const [black, setBlack] = useState(null);
  const [fen, setFen] = useState(START_FEN);
  const [moves, setMoves] = useState([]); // [{ san, color, captured, from, to }]
  const [status, setStatus] = useState("playing");
  const [winner, setWinner] = useState(null); // 'w' | 'b' | null
  const [lastMove, setLastMove] = useState(null); // { from, to }
  const [clockW, setClockW] = useState(CLOCK_SEC);
  const [clockB, setClockB] = useState(CLOCK_SEC);
  const [selSquare, setSelSquare] = useState(null);
  const [promo, setPromo] = useState(null); // { from, to }
  const [takebackFrom, setTakebackFrom] = useState(null); // couleur demandeuse, en attente de réponse
  const [confirmResign, setConfirmResign] = useState(false);
  const [countingDown, setCountingDown] = useState(false);
  const [channelReady, setChannelReady] = useState(false);
  const [myWin, setMyWin] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const [botThinking, setBotThinking] = useState(false); // solo : l'ordinateur calcule son coup
  const [perms, setPerms] = useState({});                // analyse : { profileId: true } autorisés à bouger
  const [analysisFlip, setAnalysisFlip] = useState(false); // orientation locale du plateau d'analyse

  const channelRef = useRef(null);
  const gameRef = useRef(null);          // instance chess.js FAISANT AUTORITÉ (hôte)
  const movesRef = useRef([]);           // historique arbitre (hôte)
  const clockRef = useRef({ w: CLOCK_SEC, b: CLOCK_SEC });
  const clockStartRef = useRef(0);       // Date.now() à partir duquel la pendule tourne (après le décompte)
  const statusRef = useRef("playing");
  const whiteRef = useRef(null);
  const blackRef = useRef(null);
  const savedResultRef = useRef(false);
  const autoStartedRef = useRef(false);
  const restoredRef = useRef(false);
  const confettiRef = useRef(false);
  const timeouts = useRef([]);
  const soloRef = useRef(false);        // partie contre le bot (siège BOT_ID tenu par l'IA)
  const botTimerRef = useRef(null);     // minuteur du coup du bot (pour l'annuler : takeback/abandon/démontage)
  const permsRef = useRef({});          // miroir de `perms` pour l'arbitrage hôte
  const modeRef = useRef("game");       // "game" (partie chronométrée) | "analysis" (échiquier d'analyse)
  const cadenceRef = useRef(CLOCK_SEC); // cadence choisie (le bot y adapte son temps de réflexion)

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { whiteRef.current = white; blackRef.current = black; }, [white, black]);
  useEffect(() => { permsRef.current = perms; }, [perms]);

  const myColor = useMemo(() => {
    if (white && me.id === white.id) return "w";
    if (black && me.id === black.id) return "b";
    return null;
  }, [white, black, me.id]);

  const terminal = TERMINAL.includes(status);
  const isPlayer = myColor !== null;

  // Instance d'AFFICHAGE (tous les clients) : reconstruit la position depuis
  // le FEN reçu, pour dessiner le plateau et proposer les coups légaux du
  // joueur local. L'autorité reste gameRef côté hôte.
  const view = useMemo(() => {
    const c = new Chess();
    try { c.load(fen); } catch (e) { /* FEN toujours valide en pratique */ }
    return c;
  }, [fen]);

  const turnColor = view.turn();
  const isMyTurn = phase === "playing" && !terminal && myColor && turnColor === myColor && !countingDown;

  const legalTargets = useMemo(() => {
    if (!selSquare || !isMyTurn) return {};
    let ms = [];
    try { ms = view.moves({ square: selSquare, verbose: true }); } catch (e) { ms = []; }
    const map = {};
    ms.forEach(m => { map[m.to] = !!m.captured; });
    return map;
  }, [selSquare, isMyTurn, view]);

  // Analyse : ce client peut-il bouger les pièces ? (hôte toujours, sinon perm)
  const canAnalysisMove = phase === "analysis" && (isHost || !!perms[me.id]);

  // Analyse : coups légaux de la pièce sélectionnée, quelle que soit sa couleur
  // (on aligne le trait sur la couleur de la pièce, comme pour l'arbitrage hôte).
  const analysisTargets = useMemo(() => {
    if (phase !== "analysis" || !selSquare || !canAnalysisMove) return {};
    const piece = view.get(selSquare);
    if (!piece) return {};
    let src = view, ms = [];
    try {
      if (view.turn() !== piece.color) {
        const tmp = new Chess();
        const parts = fen.split(" "); parts[1] = piece.color; parts[3] = "-";
        tmp.load(parts.join(" ")); src = tmp;
      }
      ms = src.moves({ square: selSquare, verbose: true });
    } catch (e) { ms = []; }
    const map = {};
    ms.forEach(m => { map[m.to] = !!m.captured; });
    return map;
  }, [phase, selSquare, canAnalysisMove, view, fen]);

  function persist(extra = {}) {
    if (!isHost) return;
    saveGameState(room.id, GAME_ID, {
      phase: "playing",
      white: whiteRef.current, black: blackRef.current,
      fen: gameRef.current ? gameRef.current.fen() : fen,
      moves: movesRef.current.slice(),
      status: statusRef.current, winner,
      lastMove,
      clockW: clockRef.current.w, clockB: clockRef.current.b,
      solo: soloRef.current,
      ...extra,
    });
  }

  // ---- Canal Realtime propre au jeu (host-authoritative, self:true) ----
  useEffect(() => {
    const ch = supabase.channel("chess_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "match_start" }, ({ payload }) => {
      soloRef.current = !!payload.solo;
      modeRef.current = "game";
      cadenceRef.current = payload.clockSec;
      setPerms({}); permsRef.current = {};
      setAnalysisFlip(false);
      clearBotTimer();
      setWhite(payload.white);
      setBlack(payload.black);
      setFen(START_FEN);
      setMoves([]);
      setStatus("playing");
      setWinner(null);
      setLastMove(null);
      setClockW(payload.clockSec);
      setClockB(payload.clockSec);
      setSelSquare(null);
      setPromo(null);
      setTakebackFrom(null);
      setConfirmResign(false);
      setMyWin(false);
      savedResultRef.current = false;
      confettiRef.current = false;
      setConfetti([]);
      setPhase("playing");
      setCountingDown(true);
      if (isHost) {
        whiteRef.current = payload.white; blackRef.current = payload.black;
        gameRef.current = new Chess();
        movesRef.current = [];
        clockRef.current = { w: payload.clockSec, b: payload.clockSec };
        clockStartRef.current = Date.now() + COUNTDOWN_MS;
        statusRef.current = "playing";
        saveGameState(room.id, GAME_ID, {
          phase: "playing", white: payload.white, black: payload.black, fen: START_FEN,
          moves: [], status: "playing", winner: null, lastMove: null,
          clockW: payload.clockSec, clockB: payload.clockSec, solo: soloRef.current, cadence: payload.clockSec,
        });
        scheduleBotIfNeeded(); // solo : si l'ordinateur a les Blancs, il ouvre
      }
    });

    ch.on("broadcast", { event: "move_attempt" }, ({ payload }) => {
      if (!isHost) return;
      hostHandleMove(payload);
    });

    ch.on("broadcast", { event: "resign" }, ({ payload }) => {
      if (!isHost) return;
      hostHandleResign(payload.by);
    });

    ch.on("broadcast", { event: "takeback_request" }, ({ payload }) => {
      // Chaque camp voit la demande ; seul l'adversaire peut répondre (UI).
      setTakebackFrom(payload.by);
    });

    ch.on("broadcast", { event: "takeback_response" }, ({ payload }) => {
      setTakebackFrom(null);
      if (isHost && payload.accept) hostDoTakeback(payload.requester);
    });

    ch.on("broadcast", { event: "clock" }, ({ payload }) => {
      setClockW(payload.clockW);
      setClockB(payload.clockB);
    });

    ch.on("broadcast", { event: "state" }, ({ payload }) => {
      setFen(payload.fen);
      setMoves(payload.moves);
      setStatus(payload.status);
      setWinner(payload.winner);
      setLastMove(payload.lastMove);
      if (typeof payload.clockW === "number") setClockW(payload.clockW);
      if (typeof payload.clockB === "number") setClockB(payload.clockB);
      setSelSquare(null);
      if (isHost) persist();
    });

    // ---- Échiquier d'analyse (sans pendules, sans moteur) ----
    ch.on("broadcast", { event: "analysis_start" }, ({ payload }) => {
      modeRef.current = "analysis";
      soloRef.current = false;
      clearBotTimer();
      setPerms(payload.perms || {}); permsRef.current = payload.perms || {};
      setWhite(null); setBlack(null);
      setFen(START_FEN); setMoves([]); setStatus("playing"); setWinner(null); setLastMove(null);
      setSelSquare(null); setPromo(null); setTakebackFrom(null); setConfirmResign(false);
      setMyWin(false); savedResultRef.current = false; confettiRef.current = false; setConfetti([]);
      setAnalysisFlip(false);
      setPhase("analysis");
      if (isHost) {
        gameRef.current = new Chess();
        movesRef.current = [];
        statusRef.current = "playing";
        saveGameState(room.id, GAME_ID, { mode: "analysis", perms: payload.perms || {}, fen: START_FEN, moves: [], lastMove: null });
      }
    });
    ch.on("broadcast", { event: "analysis_move" }, ({ payload }) => { if (isHost) hostAnalysisMove(payload); });
    ch.on("broadcast", { event: "analysis_cmd" }, ({ payload }) => { if (isHost) hostAnalysisCmd(payload); });
    ch.on("broadcast", { event: "analysis_perms" }, ({ payload }) => {
      setPerms(payload.perms || {}); permsRef.current = payload.perms || {};
      if (isHost) persistAnalysis();
    });
    ch.on("broadcast", { event: "analysis_state" }, ({ payload }) => {
      setFen(payload.fen); setMoves(payload.moves); setLastMove(payload.lastMove); setSelSquare(null);
      if (isHost) persistAnalysis();
    });

    ch.subscribe(s => {
      if (s === "SUBSCRIBED") {
        setChannelReady(true);
        if (!restoredRef.current) {
          restoredRef.current = true;
          const saved = readGameState(room, GAME_ID);
          if (saved && saved.mode === "analysis") {
            // Reprise d'un échiquier d'analyse après rechargement.
            modeRef.current = "analysis";
            setPerms(saved.perms || {}); permsRef.current = saved.perms || {};
            setFen(saved.fen || START_FEN); setMoves(saved.moves || []); setLastMove(saved.lastMove || null);
            setPhase("analysis");
            autoStartedRef.current = true;
            if (isHost) {
              const g = new Chess();
              try { g.load(saved.fen || START_FEN); } catch (e) { g.reset(); }
              gameRef.current = g;
              movesRef.current = (saved.moves || []).slice();
              statusRef.current = "playing";
            }
          } else if (saved) {
            soloRef.current = !!saved.solo;
            cadenceRef.current = saved.cadence ?? CLOCK_SEC;
            setWhite(saved.white); setBlack(saved.black);
            setFen(saved.fen || START_FEN); setMoves(saved.moves || []);
            setStatus(saved.status || "playing"); setWinner(saved.winner ?? null);
            setLastMove(saved.lastMove || null);
            setClockW(saved.clockW ?? CLOCK_SEC); setClockB(saved.clockB ?? CLOCK_SEC);
            setPhase("playing");
            autoStartedRef.current = true;
            if (isHost) {
              const g = new Chess();
              try { g.load(saved.fen || START_FEN); } catch (e) { g.reset(); }
              gameRef.current = g;
              movesRef.current = (saved.moves || []).slice();
              clockRef.current = { w: saved.clockW ?? CLOCK_SEC, b: saved.clockB ?? CLOCK_SEC };
              clockStartRef.current = Date.now(); // pas de décompte à la reprise
              statusRef.current = saved.status || "playing";
              whiteRef.current = saved.white; blackRef.current = saved.black;
              scheduleBotIfNeeded(); // solo : reprendre la main du bot si c'est son trait
            }
          }
        }
      }
    });

    return () => {
      timeouts.current.forEach(clearTimeout);
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, isHost]);

  // ---- Arbitrage d'un coup (hôte uniquement) ----
  function hostHandleMove({ by, from, to, promotion }) {
    const g = gameRef.current;
    if (!g) return;
    if (TERMINAL.includes(statusRef.current)) return;
    const expected = g.turn() === "w" ? whiteRef.current?.id : blackRef.current?.id;
    if (by !== expected) return;
    let mv;
    try {
      mv = g.move({ from, to, promotion: promotion || undefined });
    } catch (e) {
      return; // coup illégal : chess.js lève, on ignore
    }
    movesRef.current = [...movesRef.current, { san: mv.san, color: mv.color, captured: mv.captured || null, from: mv.from, to: mv.to }];
    const { status: st, winner: wn } = deriveStatus(g, mv.color);
    statusRef.current = st;
    channelRef.current.send({
      type: "broadcast", event: "state",
      payload: {
        fen: g.fen(), moves: movesRef.current.slice(), status: st, winner: wn,
        lastMove: { from: mv.from, to: mv.to },
        clockW: clockRef.current.w, clockB: clockRef.current.b,
      },
    });
    scheduleBotIfNeeded(); // solo : si c'est maintenant au bot, il répond
  }

  // ---- Bot (mode solo) : l'hôte tient le siège BOT_ID et joue via engine.js ----
  function clearBotTimer() {
    if (botTimerRef.current) { clearTimeout(botTimerRef.current); botTimerRef.current = null; }
    setBotThinking(false);
  }
  function botSeatToMove() {
    const g = gameRef.current;
    if (!g) return false;
    const seat = g.turn() === "w" ? whiteRef.current : blackRef.current;
    return !!(seat && seat.id === BOT_ID);
  }
  function scheduleBotIfNeeded() {
    if (!isHost || !soloRef.current) return;
    if (TERMINAL.includes(statusRef.current)) return;
    if (!botSeatToMove()) return;
    clearBotTimer();
    // Attendre la fin du décompte 3-2-1 si besoin, puis un court temps de
    // "réflexion" pour que le coup ne soit pas instantané.
    const waitCountdown = Math.max(0, clockStartRef.current - Date.now());
    const cad = cadenceRef.current;
    const base = cad <= 180 ? 280 : cad <= 300 ? 430 : 550;
    const think = base + Math.floor(Math.random() * (cad <= 180 ? 260 : 460));
    setBotThinking(true);
    botTimerRef.current = setTimeout(() => {
      botTimerRef.current = null;
      setBotThinking(false);
      hostBotMove();
    }, waitCountdown + think);
  }
  function hostBotMove() {
    const g = gameRef.current;
    if (!g || TERMINAL.includes(statusRef.current) || !botSeatToMove()) return;
    let mv;
    try {
      const cad = cadenceRef.current;
      const timeMs = cad <= 180 ? 550 : cad <= 300 ? 800 : 1000;
      const maxDepth = cad <= 180 ? 3 : 4;
      const choice = chooseBotMove(g.fen(), { timeMs, maxDepth });
      if (!choice) return;
      mv = g.move({ from: choice.from, to: choice.to, promotion: choice.promotion || undefined });
    } catch (e) { return; }
    movesRef.current = [...movesRef.current, { san: mv.san, color: mv.color, captured: mv.captured || null, from: mv.from, to: mv.to }];
    const { status: st, winner: wn } = deriveStatus(g, mv.color);
    statusRef.current = st;
    channelRef.current?.send({
      type: "broadcast", event: "state",
      payload: {
        fen: g.fen(), moves: movesRef.current.slice(), status: st, winner: wn,
        lastMove: { from: mv.from, to: mv.to },
        clockW: clockRef.current.w, clockB: clockRef.current.b,
      },
    });
  }

  function hostHandleResign(byColor) {
    const g = gameRef.current;
    if (!g || TERMINAL.includes(statusRef.current)) return;
    statusRef.current = "resign";
    channelRef.current.send({
      type: "broadcast", event: "state",
      payload: {
        fen: g.fen(), moves: movesRef.current.slice(), status: "resign",
        winner: byColor === "w" ? "b" : "w", lastMove,
        clockW: clockRef.current.w, clockB: clockRef.current.b,
      },
    });
  }

  function hostDoTakeback(requesterColor) {
    const g = gameRef.current;
    if (!g) return;
    // On ramène le demandeur À SON TRAIT en effaçant son dernier coup : 2
    // demi-coups si c'est déjà à lui de jouer (coup adverse + le sien), sinon 1.
    const need = g.turn() === requesterColor ? 2 : 1;
    for (let i = 0; i < need && movesRef.current.length > 0; i++) {
      g.undo();
      movesRef.current = movesRef.current.slice(0, -1);
    }
    const last = movesRef.current[movesRef.current.length - 1];
    const st = g.isCheck() ? "check" : "playing"; // après un takeback la position n'est jamais terminale
    statusRef.current = st;
    channelRef.current.send({
      type: "broadcast", event: "state",
      payload: {
        fen: g.fen(), moves: movesRef.current.slice(), status: st, winner: null,
        lastMove: last ? { from: last.from, to: last.to } : null,
        clockW: clockRef.current.w, clockB: clockRef.current.b,
      },
    });
  }

  // ---- Pendule : autorité côté hôte, diffusée chaque seconde ----
  useEffect(() => {
    if (!isHost) return;
    const timer = setInterval(() => {
      if (phase !== "playing") return;
      if (TERMINAL.includes(statusRef.current)) return;
      if (Date.now() < clockStartRef.current) return; // décompte 3-2-1 pas fini
      const g = gameRef.current;
      if (!g) return;
      const side = g.turn();
      const key = side === "w" ? "w" : "b";
      const val = clockRef.current[key] - 1;
      clockRef.current = { ...clockRef.current, [key]: val };
      if (val <= 0) {
        statusRef.current = "timeout";
        channelRef.current?.send({
          type: "broadcast", event: "state",
          payload: {
            fen: g.fen(), moves: movesRef.current.slice(), status: "timeout",
            winner: side === "w" ? "b" : "w", lastMove,
            clockW: clockRef.current.w, clockB: clockRef.current.b,
          },
        });
      } else {
        channelRef.current?.send({ type: "broadcast", event: "clock", payload: { clockW: clockRef.current.w, clockB: clockRef.current.b } });
      }
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase]);

  // ---- Écran de réglage (l'hôte choisit la cadence ou l'échiquier d'analyse) ----
  // Plus de démarrage automatique : l'hôte voit un écran de choix. Les invités
  // patientent jusqu'à ce qu'un mode soit lancé (match_start / analysis_start).
  function seatsForGame() {
    if (solo && players.length === 1) {
      const a = players[0];
      const human = { id: a.profile_id, username: a.profiles?.username, avatar: a.profiles?.avatar };
      const bot = { id: BOT_ID, username: t("chessBot"), avatar: "\uD83E\uDD16" };
      return Math.random() < 0.5 ? [human, bot] : [bot, human];
    }
    const [a, b] = players;
    const pa = { id: a.profile_id, username: a.profiles?.username, avatar: a.profiles?.avatar };
    const pb = { id: b.profile_id, username: b.profiles?.username, avatar: b.profiles?.avatar };
    return Math.random() < 0.5 ? [pa, pb] : [pb, pa];
  }
  function startTimed(sec) {
    if (!isHost) return;
    const [w, bl] = seatsForGame();
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: { white: w, black: bl, clockSec: sec, solo: !!(solo && players.length === 1) } });
  }
  function startAnalysis() {
    if (!isHost) return;
    const initPerms = { [me.id]: true }; // au départ, seul l'hôte peut bouger les pièces
    channelRef.current.send({ type: "broadcast", event: "analysis_start", payload: { perms: initPerms } });
  }

  // ---- Arbitrage de l'échiquier d'analyse (hôte) ----
  function broadcastAnalysisState() {
    const g = gameRef.current; if (!g) return;
    const lm = movesRef.current[movesRef.current.length - 1];
    channelRef.current.send({
      type: "broadcast", event: "analysis_state",
      payload: { fen: g.fen(), moves: movesRef.current.slice(), lastMove: lm ? { from: lm.from, to: lm.to } : null },
    });
  }
  function persistAnalysis() {
    if (!isHost) return;
    const g = gameRef.current;
    const lm = movesRef.current[movesRef.current.length - 1];
    saveGameState(room.id, GAME_ID, {
      mode: "analysis", perms: permsRef.current,
      fen: g ? g.fen() : fen, moves: movesRef.current.slice(),
      lastMove: lm ? { from: lm.from, to: lm.to } : null,
    });
  }
  function analysisAllowed(by) { return by === room.host_id || !!permsRef.current[by]; }
  function hostAnalysisMove({ by, from, to, promotion }) {
    const g = gameRef.current; if (!g) return;
    if (!analysisAllowed(by)) return;
    const piece = g.get(from); if (!piece) return;
    // Échiquier libre : on peut jouer les DEUX camps. Si ce n'est pas le trait
    // de la pièce déplacée, on aligne le trait sur sa couleur (comme lichess),
    // puis chess.js valide la légalité du coup pour cette couleur.
    if (g.turn() !== piece.color) {
      const parts = g.fen().split(" ");
      parts[1] = piece.color; parts[3] = "-";
      try { g.load(parts.join(" ")); } catch (e) { return; }
    }
    let mv;
    try { mv = g.move({ from, to, promotion: promotion || "q" }); } catch (e) { return; }
    movesRef.current = [...movesRef.current, { san: mv.san, color: mv.color, captured: mv.captured || null, from: mv.from, to: mv.to }];
    broadcastAnalysisState();
  }
  function hostAnalysisCmd({ by, cmd }) {
    const g = gameRef.current; if (!g) return;
    if (!analysisAllowed(by)) return;
    if (cmd === "undo") { if (movesRef.current.length > 0) { g.undo(); movesRef.current = movesRef.current.slice(0, -1); } }
    else if (cmd === "reset") { g.reset(); movesRef.current = []; }
    broadcastAnalysisState();
  }
  // Actions locales (envoyées à l'hôte)
  function analysisAttemptMove(from, to, promotion) {
    channelRef.current?.send({ type: "broadcast", event: "analysis_move", payload: { by: me.id, from, to, promotion } });
    setSelSquare(null);
  }
  function analysisCmd(cmd) {
    channelRef.current?.send({ type: "broadcast", event: "analysis_cmd", payload: { by: me.id, cmd } });
  }
  function togglePerm(pid) {
    if (!isHost || pid === me.id) return; // l'hôte est toujours autorisé (verrouillé)
    const next = { ...permsRef.current };
    if (next[pid]) delete next[pid]; else next[pid] = true;
    channelRef.current?.send({ type: "broadcast", event: "analysis_perms", payload: { perms: next } });
  }

  // ---- Enregistrement du résultat (chaque joueur enregistre le sien) ----
  useEffect(() => {
    if (!winner || savedResultRef.current || !white || !black) return;
    if (!isPlayer) return;
    savedResultRef.current = true;
    const won = winner === myColor;
    setMyWin(won);
    if (soloRef.current) return; // pas d'enregistrement ARCARDI en partie contre le bot
    recordMatchResult(room.id, won);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  // ---- Confettis + flash sur une victoire (jamais sur une nulle) ----
  useEffect(() => {
    if (!winner) { confettiRef.current = false; return; }
    if (confettiRef.current) return;
    confettiRef.current = true;
    const colors = ["#FFD166", "#E8B75A", "#B6F04C", "#4ECDC4", "#ffffff"];
    const pieces = Array.from({ length: 54 }, (_, i) => ({
      key: "c-" + i + "-" + Date.now(),
      left: Math.round(Math.random() * 100),
      color: colors[i % colors.length],
      delay: (Math.random() * 0.5).toFixed(2),
      duration: (1.6 + Math.random() * 1.3).toFixed(2),
      size: 7 + Math.round(Math.random() * 5),
      round: i % 3 === 0,
      drift: Math.round((Math.random() - 0.5) * 140),
    }));
    setConfetti(pieces);
    const t1 = setTimeout(() => setConfetti([]), 3200);
    timeouts.current.push(t1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  // ---- Interactions ----
  function onSquareClick(square) {
    if (phase === "analysis") return onAnalysisSquareClick(square);
    if (!isMyTurn || promo) return;
    const piece = view.get(square);
    if (selSquare) {
      if (square === selSquare) { setSelSquare(null); return; }
      if (square in legalTargets) {
        const sel = view.get(selSquare);
        const rank = square[1];
        const isPromo = sel && sel.type === "p" && ((myColor === "w" && rank === "8") || (myColor === "b" && rank === "1"));
        if (isPromo) { setPromo({ from: selSquare, to: square }); return; }
        sendMove(selSquare, square);
        return;
      }
      if (piece && piece.color === myColor) { setSelSquare(square); return; }
      setSelSquare(null);
      return;
    }
    if (piece && piece.color === myColor) setSelSquare(square);
  }

  function onAnalysisSquareClick(square) {
    if (!canAnalysisMove || promo) return;
    const piece = view.get(square);
    if (selSquare) {
      if (square === selSquare) { setSelSquare(null); return; }
      if (square in analysisTargets) {
        const sel = view.get(selSquare);
        const rank = square[1];
        const isPromo = sel && sel.type === "p" && ((sel.color === "w" && rank === "8") || (sel.color === "b" && rank === "1"));
        if (isPromo) { setPromo({ from: selSquare, to: square, color: sel.color }); return; }
        analysisAttemptMove(selSquare, square);
        return;
      }
      if (piece) { setSelSquare(square); return; } // en analyse : sélectionner n'importe quelle pièce
      setSelSquare(null);
      return;
    }
    if (piece) setSelSquare(square);
  }

  function sendMove(from, to, promotion) {
    channelRef.current?.send({ type: "broadcast", event: "move_attempt", payload: { by: me.id, from, to, promotion } });
    setSelSquare(null);
  }
  function choosePromotion(type) {
    if (!promo) return;
    if (phase === "analysis") analysisAttemptMove(promo.from, promo.to, type);
    else sendMove(promo.from, promo.to, type);
    setPromo(null);
  }
  function requestTakeback() {
    if (!isPlayer || terminal || moves.length === 0) return;
    if (soloRef.current) {
      // Contre le bot : aucun consentement à demander, on annule directement
      // (l'hôte fait autorité) et on stoppe un éventuel coup du bot en attente.
      clearBotTimer();
      if (isHost) hostDoTakeback(myColor);
      return;
    }
    channelRef.current?.send({ type: "broadcast", event: "takeback_request", payload: { by: myColor } });
    setTakebackFrom(myColor);
  }
  function respondTakeback(accept) {
    channelRef.current?.send({ type: "broadcast", event: "takeback_response", payload: { accept, requester: takebackFrom } });
    setTakebackFrom(null);
  }
  function resign() {
    channelRef.current?.send({ type: "broadcast", event: "resign", payload: { by: myColor } });
    setConfirmResign(false);
  }
  function rematch() {
    if (!isHost || !white || !black) return;
    const [w, bl] = Math.random() < 0.5 ? [white, black] : [black, white];
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: { white: w, black: bl, clockSec: CLOCK_SEC, solo: soloRef.current } });
  }
  async function backToRoom() {
    await resetRoomToLobby(room.id);
    onFinish && onFinish();
  }

  // ---- Données dérivées pour l'affichage ----
  const capturedByWhite = moves.filter(m => m.color === "w" && m.captured).map(m => m.captured); // pièces noires prises
  const capturedByBlack = moves.filter(m => m.color === "b" && m.captured).map(m => m.captured); // pièces blanches prises
  const advWhite = capturedByWhite.reduce((s, p) => s + (PIECE_VALUE[p] || 0), 0) - capturedByBlack.reduce((s, p) => s + (PIECE_VALUE[p] || 0), 0);

  const movePairs = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({ num: i / 2 + 1, w: sanForLang(moves[i].san, lang), b: moves[i + 1] ? sanForLang(moves[i + 1].san, lang) : "" });
  }

  // Cases dans l'ordre d'affichage. En partie : camp du joueur local en bas ;
  // en analyse : orientation locale (bouton Retourner).
  const rows = view.board(); // rangée 8 -> rangée 1
  const flip = phase === "analysis" ? analysisFlip : (myColor === "b");
  const displayRows = flip ? rows.slice().reverse().map(r => r.slice().reverse()) : rows;
  const activeTargets = phase === "analysis" ? analysisTargets : legalTargets;

  // Roi en échec à surligner
  let checkedKingSq = null;
  if (status === "check" || status === "checkmate") {
    const side = status === "checkmate" ? winner === "w" ? "b" : "w" : turnColor;
    for (const row of rows) for (const cell of row) if (cell && cell.type === "k" && cell.color === side) checkedKingSq = cell.square;
  } else if (phase === "analysis") {
    try { if (view.isCheck()) { const side = view.turn(); for (const row of rows) for (const cell of row) if (cell && cell.type === "k" && cell.color === side) checkedKingSq = cell.square; } } catch (e) {}
  }

  function statusMessage() {
    if (status === "checkmate") return t("chessCheckmate").replace("{w}", winner === "w" ? t("chessWhite") : t("chessBlack"));
    if (status === "stalemate") return t("chessStalemate");
    if (status === "draw") return t("chessDraw");
    if (status === "timeout") return t("chessTimeout").replace("{w}", winner === "w" ? t("chessWhite") : t("chessBlack"));
    if (status === "resign") return t("chessResign").replace("{w}", winner === "w" ? t("chessWhite") : t("chessBlack"));
    if (status === "check") return t("chessCheck");
    if (botThinking) return t("chessBotThinking");
    if (isMyTurn) return t("chessYourTurn");
    if (isPlayer) return t("chessOpponentTurn");
    return t("chessSpectating");
  }

  const topPlayer = flip ? white : black;     // adversaire en haut pour un joueur ; sinon Noirs en haut
  const botPlayer = flip ? black : white;
  const topIsWhite = flip;                     // le joueur du haut est-il Blanc
  const topClock = topIsWhite ? clockW : clockB;
  const botClock = topIsWhite ? clockB : clockW;
  const topActive = phase === "playing" && !terminal && turnColor === (topIsWhite ? "w" : "b");
  const botActive = phase === "playing" && !terminal && turnColor === (topIsWhite ? "b" : "w");

  function PlayerCard({ player, isWhiteSide, clock, active }) {
    const capt = isWhiteSide ? capturedByWhite : capturedByBlack; // pièces prises PAR ce camp
    const captGlyphColor = isWhiteSide ? "b" : "w"; // il capture les pièces de l'autre couleur
    const adv = isWhiteSide ? advWhite : -advWhite;
    return (
      <div className={"chess-pcard" + (active ? " active" : "")}>
        <div className="chess-pname">
          <span className="chess-avatar">{player?.avatar}</span>
          <span className="chess-pname-txt">{player?.username || "?"}</span>
          <span className="chess-side">{isWhiteSide ? t("chessWhite") : t("chessBlack")}</span>
        </div>
        <div className={"chess-clock" + (active ? " on" : "") + (clock <= 20 ? " low" : "")}>{fmtClock(clock)}</div>
        <div className="chess-captrow">
          {capt.map((p, i) => <span key={i} className={"chess-cap " + captGlyphColor}>{GLYPH[captGlyphColor][p]}</span>)}
          {adv > 0 && <span className="chess-adv">+{adv}</span>}
        </div>
      </div>
    );
  }

  // ---- Plateau réutilisable (partie ET analyse), avec numéros de rangées ----
  function BoardGrid({ interactable }) {
    return (
      <div className="chess-board-frame">
        <div className="chess-grid">
          {displayRows.map((row, ri) => row.map((cell, ci) => {
            const sq = cell ? cell.square : squareFromDisplay(ri, ci, flip);
            const isLight = (ri + ci) % 2 === 0;
            const sel = sq === selSquare;
            const target = sq in activeTargets;
            const isCap = target && activeTargets[sq];
            const last = lastMove && (lastMove.from === sq || lastMove.to === sq);
            const check = sq === checkedKingSq;
            const rankNum = (flip ? ri : 7 - ri) + 1; // numéro de rangée (1-8), tient compte du flip
            return (
              <div
                key={sq}
                className={"chess-sq " + (isLight ? "l" : "d") + (sel ? " sel" : "") + (last ? " last" : "") + (check ? " check" : "")}
                onClick={() => onSquareClick(sq)}
                style={{ cursor: interactable(cell, target) ? "pointer" : "default" }}
              >
                {ci === 0 && <span className="chess-coord-rank">{rankNum}</span>}
                {cell && <span className={"chess-piece " + cell.color + " t-" + cell.type}>{GLYPH[cell.color][cell.type]}</span>}
                {target && !cell && <span className="chess-dot" />}
                {isCap && <span className="chess-ring" />}
              </div>
            );
          }))}
        </div>
      </div>
    );
  }

  const filesRow = (
    <div className="chess-coords-files">
      {(flip ? FILES.split("").reverse() : FILES.split("")).map(f => <span key={f}>{f}</span>)}
    </div>
  );

  const promoModal = promo ? (
    <div className="chess-overlay" onClick={() => setPromo(null)}>
      <div className="chess-promo" onClick={e => e.stopPropagation()}>
        <div className="chess-promo-title">{t("chessPromoTitle")}</div>
        <div className="chess-promo-row">
          {["q", "r", "b", "n"].map(type => (
            <button key={type} className="chess-promo-btn" onClick={() => choosePromotion(type)}>
              {GLYPH[(promo && promo.color) || myColor || "w"][type]}
            </button>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  let content;
  if (phase === "intro") {
    const ready = channelReady && ((solo && players.length === 1) || (!solo && players.length === 2));
    if (isHost && ready) {
      // Écran de choix (hôte) : cadence 3/5/10 min ou échiquier d'analyse.
      content = (
        <div className="chess-setup">
          <div className="chess-setup-title">{t("chessChooseCadence")}</div>
          <div className="chess-cadence-grid">
            {CADENCES.map(c => (
              <button key={c.min} className="chess-cad" onClick={() => startTimed(c.sec)}>
                <span className="chess-cad-n">{c.min}</span>
                <span className="chess-cad-unit">min</span>
                <span className="chess-cad-tag">{t(c.tagKey)}</span>
              </button>
            ))}
            <button className="chess-cad analysis" onClick={startAnalysis}>
              <span className="chess-cad-ico">♞</span>
              <span className="chess-cad-tag">{t("chessAnalysisBoard")}</span>
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>{t("chessGuestsWait")}</p>
        </div>
      );
    } else if (!solo && players.length < 2) {
      content = <p className="muted">{t("chessWaitPlayers")}</p>;
    } else {
      content = <p className="muted">{t("chessHostChoosing")}</p>;
    }
  } else if (phase === "analysis") {
    content = (
      <div className="chess-layout analysis">
        <div className="chess-board-wrap">
          <div className="chess-status">{t("chessAnalysisBoard")}{!canAnalysisMove ? " · " + t("chessAnalysisLocked") : ""}</div>
          <BoardGrid interactable={(cell, target) => canAnalysisMove && (!!cell || target)} />
          {filesRow}
          <div className="chess-btnrow" style={{ marginTop: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="chess-btn" onClick={() => analysisCmd("undo")} disabled={!canAnalysisMove || moves.length === 0}>{t("chessUndo")}</button>
            <button className="chess-btn" onClick={() => analysisCmd("reset")} disabled={!canAnalysisMove || moves.length === 0}>{t("chessReset")}</button>
            <button className="chess-btn" onClick={() => setAnalysisFlip(f => !f)}>{t("chessFlip")}</button>
            {isHost && <button className="chess-btn" onClick={backToRoom}>{t("chessBackRoom")}</button>}
          </div>
        </div>

        <div className="chess-side-bot">
          {isHost && (
            <div className="chess-perms">
              <div className="chess-perms-head">{t("chessWhoCanMove")}</div>
              {players.map(p => {
                const on = p.profile_id === me.id || !!perms[p.profile_id];
                const locked = p.profile_id === me.id;
                return (
                  <div
                    key={p.id}
                    className={"chess-perm-row" + (on ? " on" : "")}
                    onClick={() => togglePerm(p.profile_id)}
                    style={{ cursor: locked ? "default" : "pointer" }}
                  >
                    <span className="chess-avatar">{p.profiles?.avatar}</span>
                    <span className="chess-perm-name">{p.profiles?.username}{p.profile_id === room.host_id ? " 👑" : ""}</span>
                    <span className={"chess-check" + (on ? " on" : "")}>{on ? "✓" : ""}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="chess-histbox">
            <div className="chess-histhead"><span>{t("chessHistory")}</span></div>
            {movePairs.length === 0 && <div className="chess-hrow empty">·</div>}
            {movePairs.map(mp => (
              <div key={mp.num} className="chess-hrow">
                <span className="chess-hnum">{mp.num}.</span>
                <span className="chess-hcell">{mp.w}</span>
                <span className="chess-hcell">{mp.b}</span>
              </div>
            ))}
          </div>
        </div>

        {promoModal}
      </div>
    );
  } else {
    content = (
      <div className="chess-layout">
        <div className="chess-side-top">
          <PlayerCard player={topPlayer} isWhiteSide={topIsWhite} clock={topClock} active={topActive} />
        </div>

        <div className="chess-board-wrap">
          <div className="chess-status">{statusMessage()}</div>
          <BoardGrid interactable={(cell, target) => isMyTurn && (cell?.color === myColor || target)} />
          {filesRow}
        </div>

        <div className="chess-side-bot">
          <PlayerCard player={botPlayer} isWhiteSide={!topIsWhite} clock={botClock} active={botActive} />

          {isPlayer && !terminal && (
            <div className="chess-actions">
              {takebackFrom && takebackFrom !== myColor ? (
                <div className="chess-takeback-ask">
                  <span>{t("chessTakebackAsked")}</span>
                  <div className="chess-takeback-btns">
                    <button className="btn" style={{ marginTop: 0, padding: "8px 14px", width: "auto" }} onClick={() => respondTakeback(true)}>{t("chessAccept")}</button>
                    <button className="btn ghost" style={{ marginTop: 0, padding: "8px 14px", width: "auto" }} onClick={() => respondTakeback(false)}>{t("chessDecline")}</button>
                  </div>
                </div>
              ) : takebackFrom === myColor ? (
                <p className="muted" style={{ margin: 0 }}>{t("chessTakebackWait")}</p>
              ) : (
                <div className="chess-btnrow">
                  <button className="chess-btn" onClick={requestTakeback} disabled={moves.length === 0}>{t("chessTakeback")}</button>
                  {confirmResign ? (
                    <button className="chess-btn danger" onClick={resign}>{t("chessResignConfirm")}</button>
                  ) : (
                    <button className="chess-btn" onClick={() => setConfirmResign(true)}>{t("chessResignBtn")}</button>
                  )}
                </div>
              )}
            </div>
          )}

          {terminal && (
            <div className="chess-actions">
              {isHost ? (
                <div className="chess-btnrow">
                  <button className="chess-btn primary" onClick={rematch}>{t("chessRematch")}</button>
                  <button className="chess-btn" onClick={backToRoom}>{t("chessBackRoom")}</button>
                </div>
              ) : (
                <p className="muted" style={{ margin: 0 }}>{t("chessRematchWait")}</p>
              )}
            </div>
          )}

          <div className="chess-histbox">
            <div className="chess-histhead"><span>{t("chessHistory")}</span></div>
            {movePairs.length === 0 && <div className="chess-hrow empty">·</div>}
            {movePairs.map(mp => (
              <div key={mp.num} className="chess-hrow">
                <span className="chess-hnum">{mp.num}.</span>
                <span className="chess-hcell">{mp.w}</span>
                <span className="chess-hcell">{mp.b}</span>
              </div>
            ))}
          </div>
        </div>

        {promoModal}

        {winner && (
          <div className="win-banner" style={{ background: "radial-gradient(circle at 50% 40%, rgba(255,209,102,.18), rgba(10,7,5,.86) 72%)" }}>
            <div className="win-banner-title" style={{ textShadow: "0 0 18px rgba(255,209,102,.8), 0 3px 0 rgba(0,0,0,.4)" }}>
              {isPlayer ? (myWin ? "🏆 " + t("chessWinYou") : t("chessWinOpponent")) : t("chessGameOver")}
            </div>
          </div>
        )}
        {confetti.map(p => (
          <span key={p.key} className="confetti-piece" style={{ left: p.left + "%", width: p.size, height: p.size * 1.4, borderRadius: p.round ? "50%" : 2, background: p.color, "--drift": p.drift + "px", animationDuration: p.duration + "s", animationDelay: p.delay + "s" }} />
        ))}
      </div>
    );
  }
  return (
    <div className="panel chess-panel" style={{ maxWidth: "min(1080px, 96vw)" }}>
      <h1>{t("chessTitle")}</h1>
      <Crossfade id={phase}>{content}</Crossfade>
      {countingDown && phase === "playing" && (
        <GameCountdown variant="chess" onDone={() => setCountingDown(false)} />
      )}
    </div>
  );
}

// Nom de case pour une position d'affichage quand la cellule est vide.
function squareFromDisplay(ri, ci, flip) {
  const fileIdx = flip ? 7 - ci : ci;
  const rankIdx = flip ? ri : 7 - ri; // ri 0 = haut ; sans flip haut = rangée 8
  return "abcdefgh"[fileIdx] + (rankIdx + 1);
}
