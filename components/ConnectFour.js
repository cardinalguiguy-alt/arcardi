"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby, recordMatchResult } from "@/lib/gameSync";
import Crossfade from "./Crossfade";

const ROWS = 6, COLS = 7;
const GAME_ID = "connect4";

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

// Renvoie la ligne où le jeton tombera dans la colonne `col`, ou -1 si pleine.
function dropRow(board, col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!board[r][col]) return r;
  }
  return -1;
}

// Vérifie s'il y a 4 jetons alignés passant par (r, c) pour `player`.
// Renvoie la liste des cellules alignées (pour les surligner), ou null.
function checkWin(board, r, c, player) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    const cells = [[r, c]];
    for (const sign of [1, -1]) {
      for (let s = 1; s < 4; s++) {
        const rr = r + dr * s * sign, cc = c + dc * s * sign;
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || board[rr][cc] !== player) break;
        cells.push([rr, cc]);
      }
    }
    if (cells.length >= 4) return cells;
  }
  return null;
}

function isBoardFull(board) {
  return board[0].every(cell => cell !== null);
}

export default function ConnectFour({ room, me, isHost, players, t, lang, onFinish }) {
  const [phase, setPhase] = useState("intro"); // intro (choix/attente) -> playing (le plateau reste affiché même après la victoire)
  const [p1, setP1] = useState(null);
  const [p2, setP2] = useState(null);
  const [board, setBoard] = useState(emptyBoard());
  const [turn, setTurn] = useState("p1");
  const [winner, setWinner] = useState(null); // null | "p1" | "p2" | "draw"
  const [lastMove, setLastMove] = useState(null);
  const [winningCells, setWinningCells] = useState(null);
  const [hoverCol, setHoverCol] = useState(null);
  const [selected, setSelected] = useState([]);
  const [myWin, setMyWin] = useState(false);
  const [channelReady, setChannelReady] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const [flash, setFlash] = useState(false);

  const channelRef = useRef(null);
  const stateRef = useRef({ board, turn, p1, p2, winner, lastMove, winningCells });
  const savedResultRef = useRef(false);
  const autoStartedRef = useRef(false);
  const restoredRef = useRef(false);
  const timeouts = useRef([]);

  // Miroir toujours à jour de l'état, pour que l'arbitre (hôte) lise des
  // valeurs fraîches dans le handler de broadcast (évite les closures figées),
  // et pour pouvoir persister un instantané complet à tout moment.
  useEffect(() => {
    stateRef.current = { board, turn, p1, p2, winner, lastMove, winningCells };
  }, [board, turn, p1, p2, winner, lastMove, winningCells]);

  function persistSnapshot(extra = {}) {
    if (!isHost) return;
    const s = stateRef.current;
    saveGameState(room.id, GAME_ID, {
      phase: "playing",
      p1: s.p1, p2: s.p2, board: s.board, turn: s.turn,
      winner: s.winner, lastMove: s.lastMove, winningCells: s.winningCells,
      ...extra,
    });
  }

  useEffect(() => {
    const ch = supabase.channel("c4_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "match_start" }, ({ payload }) => {
      setP1(payload.p1);
      setP2(payload.p2);
      setBoard(emptyBoard());
      setTurn(payload.turn);
      setWinner(null);
      setLastMove(null);
      setWinningCells(null);
      setMyWin(false);
      savedResultRef.current = false;
      setPhase("playing");
      if (isHost) {
        saveGameState(room.id, GAME_ID, {
          phase: "playing", p1: payload.p1, p2: payload.p2, board: emptyBoard(),
          turn: payload.turn, winner: null, lastMove: null, winningCells: null,
        });
      }
    });

    // Seul l'hôte arbitre les coups (source de vérité), qu'il joue ou non.
    ch.on("broadcast", { event: "move_attempt" }, ({ payload }) => {
      if (!isHost) return;
      hostHandleMove(payload);
    });

    ch.on("broadcast", { event: "state" }, ({ payload }) => {
      setBoard(payload.board);
      setTurn(payload.turn);
      setWinner(payload.winner);
      setLastMove(payload.lastMove);
      setWinningCells(payload.winningCells || null);
      if (isHost) {
        saveGameState(room.id, GAME_ID, {
          phase: "playing", p1: stateRef.current.p1, p2: stateRef.current.p2,
          board: payload.board, turn: payload.turn, winner: payload.winner,
          lastMove: payload.lastMove, winningCells: payload.winningCells || null,
        });
      }
    });

    ch.subscribe(status => {
      if (status === "SUBSCRIBED") {
        setChannelReady(true);
        // Resynchronisation : si une partie était déjà en cours (rechargement
        // de page), on restaure l'état tout de suite plutôt que d'attendre un
        // message qui ne reviendra jamais.
        if (!restoredRef.current) {
          restoredRef.current = true;
          const saved = readGameState(room, GAME_ID);
          if (saved) {
            setP1(saved.p1); setP2(saved.p2); setBoard(saved.board); setTurn(saved.turn);
            setWinner(saved.winner); setLastMove(saved.lastMove); setWinningCells(saved.winningCells || null);
            setPhase("playing");
            autoStartedRef.current = true;
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

  // Arbitrage d'un coup : ne fait rien si ce n'est pas le bon tour / colonne pleine.
  function hostHandleMove({ by, col }) {
    const s = stateRef.current;
    if (s.winner) return;
    const expected = s.turn === "p1" ? s.p1?.id : s.p2?.id;
    if (by !== expected) return;
    if (col < 0 || col >= COLS) return;
    const r = dropRow(s.board, col);
    if (r === -1) return;

    const board2 = s.board.map(row => row.slice());
    board2[r][col] = s.turn;
    const winCells = checkWin(board2, r, col, s.turn);
    const full = !winCells && isBoardFull(board2);
    const winner2 = winCells ? s.turn : (full ? "draw" : null);
    const nextTurn = s.turn === "p1" ? "p2" : "p1";

    channelRef.current.send({
      type: "broadcast", event: "state",
      payload: { board: board2, turn: winner2 ? s.turn : nextTurn, winner: winner2, lastMove: { r, c: col }, winningCells: winCells }
    });
  }

  // Si le salon compte exactement 2 joueurs, l'hôte démarre le match tout
  // seul dès que le canal est prêt — pas besoin de choisir qui affronte qui.
  useEffect(() => {
    if (!isHost || phase !== "intro" || autoStartedRef.current || !channelReady) return;
    if (players.length === 2) {
      autoStartedRef.current = true;
      const [a, b] = players;
      const pa = { id: a.profile_id, username: a.profiles?.username, avatar: a.profiles?.avatar };
      const pb = { id: b.profile_id, username: b.profiles?.username, avatar: b.profiles?.avatar };
      const [first, second] = Math.random() < 0.5 ? [pa, pb] : [pb, pa];
      channelRef.current.send({ type: "broadcast", event: "match_start", payload: { p1: first, p2: second, turn: "p1" } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, channelReady, players.length]);

  // Chaque joueur (p1 ou p2) enregistre SON propre résultat (RLS/RPC
  // oblige). Un match nul n'est ni une victoire ni une défaite : rien
  // n'est enregistré dans ce cas.
  useEffect(() => {
    if (!winner || savedResultRef.current || !p1 || !p2) return;
    const amP1 = me.id === p1.id, amP2 = me.id === p2.id;
    if (!amP1 && !amP2) return;
    savedResultRef.current = true;
    if (winner === "draw") return;
    const won = (winner === "p1" && amP1) || (winner === "p2" && amP2);
    setMyWin(won);
    recordMatchResult(room.id, won);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  // Confettis + flash : uniquement sur une VRAIE victoire (jamais sur un
  // match nul), pour tout le monde présent (joueurs et spectateurs) —
  // effet purement visuel, ne touche à aucun score ni état de partie.
  const confettiSpawnedRef = useRef(false);
  useEffect(() => {
    if (!winner) { confettiSpawnedRef.current = false; return; }
    if (winner === "draw" || confettiSpawnedRef.current) return;
    confettiSpawnedRef.current = true;
    const colors = ["#FF3B30", "#FFD166", "#4ECDC4", "#A8E063", "#ffffff"];
    const pieces = Array.from({ length: 60 }, (_, i) => {
      const big = Math.random() < 0.3;
      return {
        key: "c-" + i + "-" + Date.now(),
        left: Math.round(Math.random() * 100),
        color: colors[i % colors.length],
        delay: (Math.random() * 0.5).toFixed(2),
        duration: (1.6 + Math.random() * 1.3).toFixed(2),
        size: big ? 14 : 7 + Math.round(Math.random() * 4),
        round: i % 3 === 0,
        drift: Math.round((Math.random() - 0.5) * 140),
      };
    });
    setConfetti(pieces);
    setFlash(true);
    const t1 = setTimeout(() => setFlash(false), 550);
    const t2 = setTimeout(() => setConfetti([]), 3200);
    timeouts.current.push(t1, t2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  function toggleSelect(pid) {
    setSelected(prev => {
      if (prev.includes(pid)) return prev.filter(x => x !== pid);
      if (prev.length >= 2) return prev;
      return [...prev, pid];
    });
  }

  function confirmPick() {
    if (selected.length !== 2 || !channelReady) return;
    const chosen = selected.map(pid => players.find(p => p.profile_id === pid)).filter(Boolean);
    if (chosen.length !== 2) return;
    const pa = { id: chosen[0].profile_id, username: chosen[0].profiles?.username, avatar: chosen[0].profiles?.avatar };
    const pb = { id: chosen[1].profile_id, username: chosen[1].profiles?.username, avatar: chosen[1].profiles?.avatar };
    const [first, second] = Math.random() < 0.5 ? [pa, pb] : [pb, pa];
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: { p1: first, p2: second, turn: "p1" } });
  }

  // "Rejouer" : rebat les cartes avec les 2 mêmes joueurs, sans repasser par le salon.
  function rejouer() {
    if (!isHost || !p1 || !p2) return;
    const [first, second] = Math.random() < 0.5 ? [p1, p2] : [p2, p1];
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: { p1: first, p2: second, turn: "p1" } });
  }

  async function backToRoom() {
    await resetRoomToLobby(room.id);
    onFinish && onFinish();
  }

  function attemptMove(col) {
    if (winner || !isMyTurn) return;
    channelRef.current?.send({ type: "broadcast", event: "move_attempt", payload: { by: me.id, col } });
  }

  const amP1 = !!(p1 && me.id === p1.id);
  const amP2 = !!(p2 && me.id === p2.id);
  const isPlayer = amP1 || amP2;
  const isMyTurn = !winner && ((turn === "p1" && amP1) || (turn === "p2" && amP2));
  const needsPick = players.length > 2;
  const ghostRow = hoverCol !== null && isMyTurn && !winner ? dropRow(board, hoverCol) : -1;
  const isWinningCell = (r, c) => !!(winningCells && winningCells.some(([wr, wc]) => wr === r && wc === c));

  let content;

  if (phase === "playing") {
    const iWon = (winner === "p1" && amP1) || (winner === "p2" && amP2);
    const winnerObj = winner === "p1" ? p1 : winner === "p2" ? p2 : null;
    const otherObj = winner === "p1" ? p2 : winner === "p2" ? p1 : null;
    const winnerColorVar = winner === "p1" ? "--p1" : "--p2";
    content = (
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 14, color: turn === "p1" && !winner ? "var(--p1)" : "var(--muted)" }}>
            <span style={{ fontSize: 20 }}>{p1?.avatar}</span>{p1?.username}
          </span>
          <span style={{ fontFamily: "'Bungee'", fontSize: 12, opacity: .55 }}>{t("c4VsLabel")}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 14, color: turn === "p2" && !winner ? "var(--p2)" : "var(--muted)" }}>
            {p2?.username}<span style={{ fontSize: 20 }}>{p2?.avatar}</span>
          </span>
        </div>

        <p className="muted" style={{ textAlign: "center", marginBottom: 12, minHeight: 18, fontWeight: winner ? 800 : 400 }}>
          {winner ? (
            winner === "draw" ? "🤝 " + t("c4Draw")
              : isPlayer ? (iWon ? "🏆 " + t("c4WinYou") : t("c4WinOpponent"))
              : `${winner === "p1" ? p1?.username : p2?.username} ${t("c4WinSpectator")}`
          ) : isMyTurn ? t("c4YourTurn")
            : isPlayer ? `${t("c4WaitingFor")} ${turn === "p1" ? p1?.username : p2?.username}…`
              : t("c4Spectating")}
        </p>

        <div className="c4-board">
          {Array.from({ length: COLS }).map((_, c) => (
            <div
              key={c}
              className="c4-col"
              onClick={() => attemptMove(c)}
              onMouseEnter={() => setHoverCol(c)}
              onMouseLeave={() => setHoverCol(h => (h === c ? null : h))}
              style={{ cursor: isMyTurn && !winner ? "pointer" : "default" }}
            >
              {Array.from({ length: ROWS }).map((_, r) => {
                const val = board[r][c];
                const isLast = !!(lastMove && lastMove.r === r && lastMove.c === c);
                const isGhost = !val && r === ghostRow && c === hoverCol;
                const cls = "c4-cell"
                  + (val ? " filled " + val : "")
                  + (isLast ? " last" : "")
                  + (isWinningCell(r, c) ? " win" : "")
                  + (isGhost ? " ghost " + turn : "");
                return <div key={r} className={cls} />;
              })}
            </div>
          ))}
        </div>

        {winner && (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
            {isHost ? (
              <>
                <button className="btn" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={rejouer}>🔁 {t("c4Rejouer")}</button>
                <button className="btn ghost" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={backToRoom}>🏠 {t("c4BackToRoom")}</button>
              </>
            ) : (
              <p className="muted">{t("c4RejouerWait")}</p>
            )}
          </div>
        )}

        {/* Flash blanc + bannière de victoire flashy — jamais à la place du
            plateau, toujours PAR-DESSUS : "ça doit être clair qui gagne
            des points" (retour explicite de l'hôte du projet). */}
        <div className={"door-flash" + (flash ? " on" : "")} />
        {winner && (
          <div
            className="win-banner"
            style={{ background: `radial-gradient(circle at 50% 40%, ${winner === "draw" ? "#F5F3FF" : `var(${winnerColorVar})`}26, rgba(10,7,5,.86) 72%)` }}
          >
            <div className="win-banner-title" style={{ textShadow: `0 0 18px ${winner === "draw" ? "#F5F3FF" : `var(${winnerColorVar})`}, 0 3px 0 rgba(0,0,0,.4)` }}>
              {winner === "draw" ? "🤝 " + t("c4BannerDrawTitle") : `🎉 ${winnerObj?.username} ${t("c4BannerWins")}`}
            </div>
            <div className="win-banner-sub" style={{ color: winner === "draw" ? "#F5F3FF" : `var(${winnerColorVar})`, border: `1.5px solid ${winner === "draw" ? "#F5F3FF" : `var(${winnerColorVar})`}` }}>
              {winner === "draw"
                ? `+${DRAW_POINTS} ${t("pts")} ${t("c4BannerEach")}`
                : `+${WIN_POINTS} ${t("pts")} ${t("c4BannerFor")} ${winnerObj?.username} · +${LOSE_POINTS} ${t("c4BannerFor")} ${otherObj?.username}`}
            </div>
          </div>
        )}
        {confetti.map(p => (
          <span
            key={p.key}
            className="confetti-piece"
            style={{
              left: p.left + "%", width: p.size, height: p.size * 1.4,
              borderRadius: p.round ? "50%" : 2, background: p.color,
              "--drift": p.drift + "px",
              animationDuration: p.duration + "s", animationDelay: p.delay + "s",
            }}
          />
        ))}
      </div>
    );
  } else {
    // phase "intro" : choix des joueurs, attente, ou pas assez de monde
    if (players.length < 2) {
      content = <p className="muted">{t("c4NotEnough")}</p>;
    } else if (!needsPick) {
      content = <p className="muted">{t("c4Starting")}</p>;
    } else if (isHost) {
      content = (
        <div>
          <p className="hint">{t("c4PickHint")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0 16px" }}>
            {players.map(p => {
              const on = selected.includes(p.profile_id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleSelect(p.profile_id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 99,
                    border: `2px solid ${on ? "var(--p3)" : "var(--line)"}`,
                    background: on ? "rgba(182,240,76,.12)" : "rgba(255,255,255,.04)",
                    fontWeight: 700, fontSize: 13, color: "var(--ink)"
                  }}
                >
                  <span>{p.profiles?.avatar}</span><span>{p.profiles?.username}</span>
                </button>
              );
            })}
          </div>
          <button className="btn" disabled={selected.length !== 2} onClick={confirmPick}>
            {t("c4PickConfirm")}
          </button>
        </div>
      );
    } else {
      content = <p className="muted">{t("c4WaitPick")}</p>;
    }
  }

  return (
    <div className="panel" style={{ maxWidth: "min(920px, 96vw)" }}>
      <h1>{t("c4Title")}</h1>
      <Crossfade id={phase}>{content}</Crossfade>
    </div>
  );
}
