"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby } from "@/lib/gameSync";
import Crossfade from "@/components/Crossfade";
import { GM_ROWS, GM_COLS, GM_NUGGETS, genMine, digResult, nuggetsLeft, gmPointsForPlace } from "./mines";
import { decideBotDig } from "./botLogic";

/* ==========================================================================
   GOLD MINES — démineur inversé en 2 contre 2 (demande 2026-07).

   La grille cache des PÉPITES D'OR ; un coup de pioche révèle soit un
   chiffre (pépites voisines, indices classiques du démineur), soit une
   pépite : +1 or pour le mineur ET il REJOUE immédiatement. Les tours
   alternent entre les deux équipes (sièges entrelacés Or/Bleu). Quand la
   dernière pépite est extraite, on compte l'or : équipe gagnante au total
   (le nombre de pépites est IMPAIR — jamais d'égalité), classement
   individuel pour les points ARCARDI.

   Pattern réseau : hôte arbitre, identique à Chromatik (match_start /
   state / move_attempt, bots calculés côté hôte, minuteur de tour 30s→5s,
   reprise sur rechargement avec réarmement bots+minuteur). Même modèle de
   confiance : l'état complet (dont la position des pépites) transite chez
   tous les clients, seule l'UI cache ce qui doit l'être — comme les mains
   de Chromatik ou le code des portes de Diapason.
   ========================================================================== */

const GAME_ID = "goldmines";
const TABLE_SIZE = 4;
const HUMAN_TURN_MS = 30000;
const HUMAN_TURN_SHORT_MS = 5000;
const HUMAN_TURN_STRIKES = 2;
const BOT_AVATARS = ["🤖", "🦾", "👾"];
// Sièges pairs = équipe Or, impairs = équipe Bleu : l'ordre des sièges EST
// l'ordre des tours, donc les équipes alternent naturellement un coup de
// pioche chacun (A1, B1, A2, B2, A1…).
export function teamOf(seatIdx) { return seatIdx % 2 === 0 ? "gold" : "blue"; }

function makeBotSeat(n) {
  return { id: "bot" + n, username: "Bot " + n, avatar: BOT_AVATARS[(n - 1) % BOT_AVATARS.length], isBot: true };
}

function dealState(seats) {
  const mine = genMine();
  const gold = {};
  seats.forEach(seat => { gold[seat.id] = 0; });
  return {
    seats, mine, revealed: {}, gold, turnIdx: 0, left: GM_NUGGETS,
    winner: null, lastAction: null,
  };
}

// Or d'une équipe, à partir du tableau de sièges et du sac d'or individuel.
function teamGold(seats, gold, team) {
  return seats.reduce((s, seat, i) => s + (teamOf(i) === team ? (gold[seat.id] || 0) : 0), 0);
}

export default function GoldMinesGame({ room, me, isHost, players, t, lang, onFinish }) {
  const [phase, setPhase] = useState("intro");
  const [selected, setSelected] = useState([]);
  const [seats, setSeats] = useState([]);
  const [mine, setMine] = useState(null);
  const [revealed, setRevealed] = useState({});
  const [gold, setGold] = useState({});
  const [turnIdx, setTurnIdx] = useState(0);
  const [left, setLeft] = useState(GM_NUGGETS);
  const [winner, setWinner] = useState(null); // "gold" | "blue" | null
  const [lastAction, setLastAction] = useState(null);
  const [myGain, setMyGain] = useState(0);
  const [channelReady, setChannelReady] = useState(false);
  const [turnDeadline, setTurnDeadline] = useState(null);
  const [turnDeadlineSeat, setTurnDeadlineSeat] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  // "+1 🪙" qui saute sur la puce du mineur quand une pépite sort — effet
  // purement local, dérivé du même lastAction reçu par tous.
  const [goldPop, setGoldPop] = useState(null); // { seatId, key } | null

  const channelRef = useRef(null);
  const stateRef = useRef(null);
  const savedResultRef = useRef(false);
  const autoStartedRef = useRef(false);
  const restoredRef = useRef(false);
  const botTimer = useRef(null);
  const turnTimeoutRef = useRef(null);
  const turnStrikesRef = useRef({});
  const turnMetaRef = useRef({ deadline: null, seatId: null });
  const goldPopKeyRef = useRef(0);
  const goldPopTimerRef = useRef(null);

  useEffect(() => {
    stateRef.current = { seats, mine, revealed, gold, turnIdx, left, winner };
  }, [seats, mine, revealed, gold, turnIdx, left, winner]);

  function applyLocalState(s, extra = {}) {
    setSeats(s.seats); setMine(s.mine); setRevealed(s.revealed || {});
    setGold(s.gold || {}); setTurnIdx(s.turnIdx); setLeft(s.left);
    setWinner(s.winner || null); setLastAction(s.lastAction || null);
    setTurnDeadline(s.turnDeadline || null); setTurnDeadlineSeat(s.turnDeadlineSeat || null);
    if (extra.resetGain) { setMyGain(0); savedResultRef.current = false; }
  }

  useEffect(() => {
    if (!turnDeadline) return;
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [turnDeadline]);

  useEffect(() => {
    if (!lastAction || lastAction.type !== "dig" || !lastAction.nugget) return;
    goldPopKeyRef.current += 1;
    setGoldPop({ seatId: lastAction.seatId, key: goldPopKeyRef.current });
    clearTimeout(goldPopTimerRef.current);
    goldPopTimerRef.current = setTimeout(() => setGoldPop(null), 1400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAction]);

  function persist(s) {
    if (!isHost) return;
    saveGameState(room.id, GAME_ID, { phase: "playing", ...s });
  }

  useEffect(() => {
    const ch = supabase.channel(GAME_ID + "_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "match_start" }, ({ payload }) => {
      applyLocalState(payload, { resetGain: true });
      setPhase("playing");
      persist(payload);
      scheduleBots(); // si un bot ouvre la mine, l'hôte doit l'armer ici
    });

    ch.on("broadcast", { event: "state" }, ({ payload }) => {
      applyLocalState(payload);
      persist(payload);
    });

    ch.on("broadcast", { event: "move_attempt" }, ({ payload }) => {
      if (!isHost) return;
      turnStrikesRef.current[payload.seatId] = 0;
      hostApplyMove(payload.seatId, payload.action);
    });

    ch.subscribe(status => {
      if (status === "SUBSCRIBED") {
        setChannelReady(true);
        if (!restoredRef.current) {
          restoredRef.current = true;
          const saved = readGameState(room, GAME_ID);
          if (saved) {
            applyLocalState(saved);
            setPhase("playing");
            autoStartedRef.current = true;
            // Reprise hôte : réarmer bots + minuteur, sinon table figée si
            // la sauvegarde datait d'un tour de bot (même correctif que
            // Chromatik 2026-07).
            if (isHost && !saved.winner) {
              broadcastNewState(saved);
              scheduleBots();
            }
          }
        }
      }
    });

    return () => {
      clearTimeout(botTimer.current);
      clearTimeout(turnTimeoutRef.current);
      clearTimeout(goldPopTimerRef.current);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, isHost]);

  function computeTurnDeadline(next) {
    if (!next || next.winner || !next.seats || !next.seats.length) return { deadline: null, seatId: null };
    const seat = next.seats[next.turnIdx];
    if (!seat || seat.isBot) return { deadline: null, seatId: null };
    const strikes = turnStrikesRef.current[seat.id] || 0;
    const ms = strikes >= HUMAN_TURN_STRIKES ? HUMAN_TURN_SHORT_MS : HUMAN_TURN_MS;
    return { deadline: Date.now() + ms, seatId: seat.id };
  }

  // Échéance dépassée : l'hôte pioche AU HASARD parmi les cases cachées à
  // la place du joueur — le jeu ne se fige jamais sur un distrait.
  function armHumanTurnTimer() {
    clearTimeout(turnTimeoutRef.current);
    if (!isHost) return;
    const { deadline, seatId } = turnMetaRef.current;
    if (!deadline || !seatId) return;
    const delay = Math.max(0, deadline - Date.now());
    turnTimeoutRef.current = setTimeout(() => {
      const s = stateRef.current;
      if (!s || s.winner || !s.mine) return;
      if (!s.seats[s.turnIdx] || s.seats[s.turnIdx].id !== seatId) return;
      turnStrikesRef.current[seatId] = (turnStrikesRef.current[seatId] || 0) + 1;
      const hidden = [];
      for (let i = 0; i < s.mine.nugget.length; i++) if (!s.revealed[i]) hidden.push(i);
      if (hidden.length === 0) return;
      hostApplyMove(seatId, { type: "dig", idx: hidden[Math.floor(Math.random() * hidden.length)] });
    }, delay);
  }

  function broadcastNewState(next) {
    const tm = computeTurnDeadline(next);
    turnMetaRef.current = tm;
    channelRef.current.send({ type: "broadcast", event: "state", payload: { ...next, turnDeadline: tm.deadline, turnDeadlineSeat: tm.seatId } });
    armHumanTurnTimer();
  }
  function sendMatchStart(payload) {
    turnStrikesRef.current = {};
    const tm = computeTurnDeadline(payload);
    turnMetaRef.current = tm;
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: { ...payload, turnDeadline: tm.deadline, turnDeadlineSeat: tm.seatId } });
    armHumanTurnTimer();
  }

  // ----- Arbitrage (hôte uniquement) -----
  function hostApplyMove(seatId, action) {
    const s = stateRef.current;
    if (!s || s.winner || !s.mine) return;
    const currentSeat = s.seats[s.turnIdx];
    if (!currentSeat || currentSeat.id !== seatId) return;
    if (action.type !== "dig") return;
    const idx = action.idx;
    if (typeof idx !== "number" || idx < 0 || idx >= s.mine.nugget.length) return;
    if (s.revealed[idx]) return; // déjà pioché : coup illégal, ignoré

    const res = digResult(s.mine, s.revealed, idx);
    const revealed = { ...s.revealed };
    // Pépite : marquée à l'id du mineur (pour colorer la case à son équipe) ;
    // chiffres/zéros : simple `true`.
    for (const c of res.cells) revealed[c] = res.nugget ? seatId : true;
    const gold = { ...s.gold };
    if (res.nugget) gold[seatId] = (gold[seatId] || 0) + 1;
    const left = nuggetsLeft(s.mine, revealed);

    let winner = null;
    if (left === 0) {
      // Le nombre de pépites est impair : jamais d'égalité d'équipes.
      winner = teamGold(s.seats, gold, "gold") > teamGold(s.seats, gold, "blue") ? "gold" : "blue";
    }
    // Pépite trouvée -> le mineur REJOUE (le tour ne bouge pas) ; sinon le
    // tour passe au siège suivant (l'ordre des sièges alterne les équipes).
    const turnIdx = res.nugget ? s.turnIdx : (s.turnIdx + 1) % s.seats.length;

    const next = {
      seats: s.seats, mine: s.mine, revealed, gold, left, winner,
      turnIdx: winner ? s.turnIdx : turnIdx,
      lastAction: { type: "dig", seatId, idx, nugget: res.nugget, count: res.cells.length },
    };
    broadcastNewState(next);
    scheduleBots();
  }

  // Bot au tour suivant : l'hôte pioche pour lui après un délai de
  // lisibilité (même respiration aléatoire que Chromatik).
  function scheduleBots() {
    if (!isHost) return;
    const delay = 700 + Math.random() * 2300;
    botTimer.current = setTimeout(() => {
      const s = stateRef.current;
      if (!s || s.winner || !s.mine) return;
      const seat = s.seats[s.turnIdx];
      if (!seat || !seat.isBot) return;
      const idx = decideBotDig(s.mine, s.revealed);
      if (idx == null) return;
      hostApplyMove(seat.id, { type: "dig", idx });
    }, delay);
  }

  // ----- Démarrage : 4 sièges fixes, bots pour compléter, équipes entrelacées -----
  function startWith(humanSeats) {
    const bots = [];
    for (let i = humanSeats.length + 1; i <= TABLE_SIZE; i++) bots.push(makeBotSeat(i - humanSeats.length));
    // Mélange puis entrelacement implicite : l'ordre mélangé DEVIENT l'ordre
    // des tours, sièges pairs = Or, impairs = Bleu (voir teamOf).
    const all = [...humanSeats, ...bots];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    sendMatchStart(dealState(all));
  }

  useEffect(() => {
    if (!isHost || phase !== "intro" || autoStartedRef.current || !channelReady) return;
    if (players.length <= TABLE_SIZE) {
      autoStartedRef.current = true;
      const humanSeats = players.map(p => ({ id: p.profile_id, username: p.profiles?.username, avatar: p.profiles?.avatar, isBot: false }));
      startWith(humanSeats);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, channelReady, players.length]);

  function toggleSelect(pid) {
    setSelected(prev => {
      if (prev.includes(pid)) return prev.filter(x => x !== pid);
      if (prev.length >= TABLE_SIZE) return prev;
      return [...prev, pid];
    });
  }
  function confirmPick() {
    if (selected.length === 0 || selected.length > TABLE_SIZE || !channelReady) return;
    const chosen = selected.map(pid => players.find(p => p.profile_id === pid)).filter(Boolean);
    const humanSeats = chosen.map(p => ({ id: p.profile_id, username: p.profiles?.username, avatar: p.profiles?.avatar, isBot: false }));
    autoStartedRef.current = true;
    startWith(humanSeats);
  }

  function rejouer() {
    if (!isHost || !seats.length) return;
    startWith(seats.filter(s => !s.isBot));
  }
  async function backToRoom() {
    await resetRoomToLobby(room.id);
    onFinish && onFinish();
  }

  // ----- Joueur local -----
  const mySeatIdx = seats.findIndex(s => s.id === me.id);
  const isPlayer = mySeatIdx !== -1;
  const isMyTurn = phase === "playing" && !winner && isPlayer && seats[turnIdx]?.id === me.id;
  const turnRemaining = turnDeadline ? Math.max(0, Math.ceil((turnDeadline - now) / 1000)) : null;

  function attemptDig(idx) {
    if (!isMyTurn || revealed[idx]) return;
    channelRef.current?.send({ type: "broadcast", event: "move_attempt", payload: { seatId: me.id, action: { type: "dig", idx } } });
  }

  // Points ARCARDI en fin de partie : classement individuel à l'or récolté,
  // équipe gagnante prioritaire sur les ex æquo — chacun enregistre le sien
  // (RLS), une seule fois, comme partout ailleurs sur le site.
  useEffect(() => {
    if (!winner || savedResultRef.current || !isPlayer) return;
    savedResultRef.current = true;
    const ranking = rankSeats();
    const place = ranking.findIndex(x => x.seat.id === me.id);
    const gain = gmPointsForPlace(place);
    setMyGain(gain);
    if (gain <= 0) return;
    (async () => {
      try {
        await supabase.from("game_results").insert({ room_id: room.id, profile_id: me.id, game_id: GAME_ID, points: gain });
        await supabase.rpc("add_points", { p_room: room.id, p_delta: gain });
      } catch (e) {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  function rankSeats() {
    return seats
      .map((seat, i) => ({ seat, i, team: teamOf(i), g: gold[seat.id] || 0 }))
      .sort((a, b) => (b.g - a.g) || ((b.team === winner) - (a.team === winner)));
  }

  const needsPick = players.length > TABLE_SIZE;
  const activeSeat = seats[turnIdx];
  const lastSeat = lastAction ? seats.find(s => s.id === lastAction.seatId) : null;

  let content;
  if (phase === "playing" && mine) {
    let statusText;
    if (winner) statusText = null;
    else if (lastAction?.nugget) {
      statusText = lastAction.seatId === me.id
        ? `🪙 ${t("gmNuggetYou")}`
        : `🪙 ${lastSeat?.username} ${t("gmNuggetOther")}`;
    } else if (isMyTurn) statusText = `⛏️ ${t("gmYourTurn")}`;
    else if (isPlayer) statusText = `${t("chromatikWaitingFor")} ${activeSeat?.username}…`;
    else statusText = t("gmSpectating");

    const tg = teamGold(seats, gold, "gold");
    const tb = teamGold(seats, gold, "blue");

    content = (
      <div>
        {/* Deux camps face à face, sièges dans l'ordre des tours. */}
        <div className="gm-teams">
          {["gold", "blue"].map(team => (
            <div key={team} className={"gm-team " + team + (winner === team ? " won" : "")}>
              <div className="gm-team-head">
                <span className="gm-team-name">{team === "gold" ? `🟡 ${t("gmTeamGold")}` : `🔵 ${t("gmTeamBlue")}`}</span>
                <span className="gm-team-total">{team === "gold" ? tg : tb} 🪙</span>
              </div>
              {seats.map((s, i) => teamOf(i) === team && (
                <div key={s.id} className={"gm-player" + (activeSeat?.id === s.id && !winner ? " active" : "") + (s.id === me.id ? " me" : "")}>
                  <span className="avatar">{s.avatar}</span>
                  <span className="name">{s.username}</span>
                  {activeSeat?.id === s.id && s.isBot && !winner && (
                    <span className="pres-think" aria-hidden="true"><i>.</i><i className="d2">.</i><i className="d3">.</i></span>
                  )}
                  <span className="gm-player-gold">
                    {gold[s.id] || 0} 🪙
                    {turnDeadlineSeat === s.id && turnRemaining != null && !winner && (
                      <span className={"turn-timer-chip mini" + (turnRemaining <= 5 ? " hot" : "")}>{turnRemaining}s</span>
                    )}
                  </span>
                  {goldPop?.seatId === s.id && <span className="gm-gold-pop" key={goldPop.key}>+1 🪙</span>}
                </div>
              ))}
            </div>
          ))}
        </div>

        <p className="muted gm-status">
          {winner
            ? <strong>{winner === "gold" ? `🟡 ${t("gmTeamGold")}` : `🔵 ${t("gmTeamBlue")}`} {t("gmWinTeam")}</strong>
            : <>{statusText} <span className="gm-left">— {left} {t("gmNuggetsLeft")}</span></>}
        </p>

        {!winner && isMyTurn && (
          <div className="turn-banner">
            <span className="turn-banner-badge">🫵 {t("yourTurnBadge")}</span>
            {turnRemaining != null && (
              <span className={"turn-timer-chip" + (turnRemaining <= 5 ? " hot" : "")}>⏱ {turnRemaining}s</span>
            )}
          </div>
        )}

        <div className={"gm-grid" + (isMyTurn && !winner ? " myturn" : "")} style={{ "--gm-cols": GM_COLS }}>
          {Array.from({ length: GM_ROWS * GM_COLS }, (_, idx) => {
            const rev = revealed[idx];
            if (!rev) {
              return (
                <button
                  key={idx}
                  type="button"
                  className="gm-cell hidden"
                  onClick={() => attemptDig(idx)}
                  disabled={!isMyTurn || !!winner}
                  aria-label={"case " + idx}
                />
              );
            }
            if (mine.nugget[idx]) {
              const diggerIdx = seats.findIndex(s => s.id === rev);
              const team = diggerIdx !== -1 ? teamOf(diggerIdx) : "gold";
              const digger = seats[diggerIdx];
              const isLast = lastAction?.idx === idx && lastAction?.nugget;
              return (
                <span key={idx} className={"gm-cell nugget " + team + (isLast ? " fresh" : "")} title={digger?.username}>
                  🪙
                </span>
              );
            }
            const n = mine.adj[idx];
            return (
              <span key={idx} className={"gm-cell open n" + n}>
                {n > 0 ? n : ""}
              </span>
            );
          })}
        </div>

        {winner && (
          <div className="chromatik-round-summary">
            <h3 className="chromatik-round-summary-title">
              {winner === "gold" ? "🟡" : "🔵"} {winner === "gold" ? t("gmTeamGold") : t("gmTeamBlue")} {t("gmWinTeam")}
            </h3>
            <div className="pres-podium">
              {rankSeats().map((x, i) => (
                <div key={x.seat.id} className={"pres-podium-row" + (i === 0 ? " first" : "") + (x.seat.id === me.id ? " me" : "")}>
                  <span className="place">{i + 1}</span>
                  <span className="name">{x.team === "gold" ? "🟡" : "🔵"} {x.seat.avatar} {x.seat.username}</span>
                  <span className="pts">{x.g} 🪙</span>
                </div>
              ))}
            </div>
            {isPlayer && (
              <p style={{ fontWeight: 800, textAlign: "center", marginTop: 10 }}>
                {t("peYourGain")} <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>+{myGain} {t("pts")}</span>
              </p>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
              {isHost ? (
                <>
                  <button className="btn" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={rejouer}>🔁 {t("c4Rejouer")}</button>
                  <button className="btn ghost" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={backToRoom}>🏠 {t("c4BackToRoom")}</button>
                </>
              ) : (
                <p className="muted">{t("c4RejouerWait")}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  } else {
    // phase "intro" : choix des 4 joueurs si la salle en compte plus
    if (needsPick) {
      content = isHost ? (
        <div>
          <p className="hint">{t("gmPickHint")} ({TABLE_SIZE} {t("chromatikSeats")})</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0 16px" }}>
            {players.map(p => {
              const on = selected.includes(p.profile_id);
              return (
                <button key={p.id} onClick={() => toggleSelect(p.profile_id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 99,
                    border: `2px solid ${on ? "var(--p3)" : "var(--line)"}`,
                    background: on ? "rgba(182,240,76,.12)" : "rgba(255,255,255,.04)",
                    fontWeight: 700, fontSize: 13, color: "var(--ink)"
                  }}>
                  <span>{p.profiles?.avatar}</span><span>{p.profiles?.username}</span>
                </button>
              );
            })}
          </div>
          <button className="btn" disabled={selected.length === 0 || selected.length > TABLE_SIZE} onClick={confirmPick}>
            {t("chromatikPickConfirm")}
          </button>
        </div>
      ) : <p className="muted">{t("chromatikWaitPick")}</p>;
    } else {
      content = <p className="muted">{t("gmStarting")}</p>;
    }
  }

  return (
    <div className="panel" style={{ maxWidth: "min(720px, 94vw)" }}>
      <h1>{t("goldminesTitle")}</h1>
      <Crossfade id={phase}>{content}</Crossfade>
    </div>
  );
}
