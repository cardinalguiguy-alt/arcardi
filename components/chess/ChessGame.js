"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby, recordMatchResult } from "@/lib/gameSync";
import Crossfade from "../Crossfade";
import GameCountdown, { COUNTDOWN_MS } from "../GameCountdown";
import { sanForLang, PIECE_VALUE } from "./notation";

const GAME_ID = "chess";
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const CLOCK_SEC = 10 * 60; // pendule par défaut : 10 min (sans incrément en v1)

// Glyphes Unicode des pièces (rendu CSS "vrai plateau", cohérent avec la
// maquette validée). Blancs et noirs coloriés en CSS (voir .chess-piece).
const GLYPH = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
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

export default function ChessGame({ room, me, isHost, players, t, lang, onFinish }) {
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

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { whiteRef.current = white; blackRef.current = black; }, [white, black]);

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
      ...extra,
    });
  }

  // ---- Canal Realtime propre au jeu (host-authoritative, self:true) ----
  useEffect(() => {
    const ch = supabase.channel("chess_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "match_start" }, ({ payload }) => {
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
        gameRef.current = new Chess();
        movesRef.current = [];
        clockRef.current = { w: payload.clockSec, b: payload.clockSec };
        clockStartRef.current = Date.now() + COUNTDOWN_MS;
        statusRef.current = "playing";
        saveGameState(room.id, GAME_ID, {
          phase: "playing", white: payload.white, black: payload.black, fen: START_FEN,
          moves: [], status: "playing", winner: null, lastMove: null,
          clockW: payload.clockSec, clockB: payload.clockSec,
        });
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

    ch.subscribe(s => {
      if (s === "SUBSCRIBED") {
        setChannelReady(true);
        if (!restoredRef.current) {
          restoredRef.current = true;
          const saved = readGameState(room, GAME_ID);
          if (saved) {
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
            }
          }
        }
      }
    });

    return () => {
      timeouts.current.forEach(clearTimeout);
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

  // ---- Démarrage auto (exactement 2 joueurs) ----
  useEffect(() => {
    if (!isHost || phase !== "intro" || autoStartedRef.current || !channelReady) return;
    if (players.length === 2) {
      autoStartedRef.current = true;
      const [a, b] = players;
      const pa = { id: a.profile_id, username: a.profiles?.username, avatar: a.profiles?.avatar };
      const pb = { id: b.profile_id, username: b.profiles?.username, avatar: b.profiles?.avatar };
      const [w, bl] = Math.random() < 0.5 ? [pa, pb] : [pb, pa];
      channelRef.current.send({ type: "broadcast", event: "match_start", payload: { white: w, black: bl, clockSec: CLOCK_SEC } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, channelReady, players.length]);

  // ---- Enregistrement du résultat (chaque joueur enregistre le sien) ----
  useEffect(() => {
    if (!winner || savedResultRef.current || !white || !black) return;
    if (!isPlayer) return;
    savedResultRef.current = true;
    const won = winner === myColor;
    setMyWin(won);
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

  function sendMove(from, to, promotion) {
    channelRef.current?.send({ type: "broadcast", event: "move_attempt", payload: { by: me.id, from, to, promotion } });
    setSelSquare(null);
  }
  function choosePromotion(type) {
    if (!promo) return;
    sendMove(promo.from, promo.to, type);
    setPromo(null);
  }
  function requestTakeback() {
    if (!isPlayer || terminal || moves.length === 0) return;
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
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: { white: w, black: bl, clockSec: CLOCK_SEC } });
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

  // Cases dans l'ordre d'affichage (le camp du joueur local en bas).
  const rows = view.board(); // rangée 8 -> rangée 1
  const flip = myColor === "b";
  const displayRows = flip ? rows.slice().reverse().map(r => r.slice().reverse()) : rows;

  // Roi en échec à surligner
  let checkedKingSq = null;
  if (status === "check" || status === "checkmate") {
    const side = status === "checkmate" ? winner === "w" ? "b" : "w" : turnColor;
    for (const row of rows) for (const cell of row) if (cell && cell.type === "k" && cell.color === side) checkedKingSq = cell.square;
  }

  function statusMessage() {
    if (status === "checkmate") return t("chessCheckmate").replace("{w}", winner === "w" ? t("chessWhite") : t("chessBlack"));
    if (status === "stalemate") return t("chessStalemate");
    if (status === "draw") return t("chessDraw");
    if (status === "timeout") return t("chessTimeout").replace("{w}", winner === "w" ? t("chessWhite") : t("chessBlack"));
    if (status === "resign") return t("chessResign").replace("{w}", winner === "w" ? t("chessWhite") : t("chessBlack"));
    if (status === "check") return t("chessCheck");
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

  let content;
  if (phase === "intro") {
    if (players.length < 2) content = <p className="muted">{t("chessWaitPlayers")}</p>;
    else content = <p className="muted">{t("chessStarting")}</p>;
  } else {
    content = (
      <div className="chess-layout">
        <div className="chess-side-top">
          <PlayerCard player={topPlayer} isWhiteSide={topIsWhite} clock={topClock} active={topActive} />
        </div>

        <div className="chess-board-wrap">
          <div className="chess-status">{statusMessage()}</div>
          <div className="chess-board-frame">
            <div className="chess-grid">
              {displayRows.map((row, ri) => row.map((cell, ci) => {
                const sq = cell ? cell.square : squareFromDisplay(ri, ci, flip);
                const isLight = (ri + ci) % 2 === 0;
                const sel = sq === selSquare;
                const target = sq in legalTargets;
                const isCap = target && legalTargets[sq];
                const last = lastMove && (lastMove.from === sq || lastMove.to === sq);
                const check = sq === checkedKingSq;
                return (
                  <div
                    key={sq}
                    className={"chess-sq " + (isLight ? "l" : "d") + (sel ? " sel" : "") + (last ? " last" : "") + (check ? " check" : "")}
                    onClick={() => onSquareClick(sq)}
                    style={{ cursor: isMyTurn && (cell?.color === myColor || target) ? "pointer" : "default" }}
                  >
                    {cell && <span className={"chess-piece " + cell.color}>{GLYPH[cell.color][cell.type]}</span>}
                    {target && !cell && <span className="chess-dot" />}
                    {isCap && <span className="chess-ring" />}
                  </div>
                );
              }))}
            </div>
          </div>
          <div className="chess-coords-files">
            {(flip ? FILES.split("").reverse() : FILES.split("")).map(f => <span key={f}>{f}</span>)}
          </div>
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
            {movePairs.length === 0 && <div className="chess-hrow empty">—</div>}
            {movePairs.map(mp => (
              <div key={mp.num} className="chess-hrow">
                <span className="chess-hnum">{mp.num}.</span>
                <span className="chess-hcell">{mp.w}</span>
                <span className="chess-hcell">{mp.b}</span>
              </div>
            ))}
          </div>
        </div>

        {promo && (
          <div className="chess-overlay" onClick={() => setPromo(null)}>
            <div className="chess-promo" onClick={e => e.stopPropagation()}>
              <div className="chess-promo-title">{t("chessPromoTitle")}</div>
              <div className="chess-promo-row">
                {["q", "r", "b", "n"].map(type => (
                  <button key={type} className="chess-promo-btn" onClick={() => choosePromotion(type)}>
                    {GLYPH[myColor || "w"][type]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

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
