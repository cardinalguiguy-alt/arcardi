"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby, recordMatchResult } from "@/lib/gameSync";
import { playDynamite, playSplash, playTokenDrop, playConfirmChime, playPanicClock, playGameWin, playGameLose } from "@/lib/sfx";
import Crossfade from "../Crossfade";
import GameCountdown from "../GameCountdown";
import {
  N, FLEET, shipDef, shipCells, autoPlace, emptyShots, occupiedSet, cellsFit,
  validPlacements, resolveFire, fleetStatus, randomShot,
} from "./navalEngine";

const GAME_ID = "naval";
const PLACE_MS = 45000;   // temps de placement
const TURN_MS = 30000;    // temps par tir en combat
const VIEW_KEY = "arcardi:navalView";

// ---- petites aides de rendu (positions en % du plateau, responsive) ----
function pctPos(r, c, rows, cols) {
  return { left: (c / N) * 100 + "%", top: (r / N) * 100 + "%", width: (cols / N) * 100 + "%", height: (rows / N) * 100 + "%" };
}
function shipRect(pl) {
  const s = shipDef(pl.id);
  const rows = pl.horiz ? s.beam : s.len;
  const cols = pl.horiz ? s.len : s.beam;
  return { rows, cols };
}

export default function NavalGame({ room, me, isHost, players, t, lang, onFinish }) {
  const [phase, setPhase] = useState("intro");
  const [sub, setSub] = useState("place");        // place | combat (dans "playing")
  const [p1, setP1] = useState(null);
  const [p2, setP2] = useState(null);
  const [boards, setBoards] = useState({});        // { pid: placements[] }
  const [ready, setReady] = useState({});          // { pid: bool }
  const [shots, setShots] = useState({});          // { pid: grille des tirs REÇUS }
  const [turn, setTurn] = useState(null);          // pid qui tire
  const [winner, setWinner] = useState(null);
  const [scores, setScores] = useState({});        // tally multi-manches
  const [lastShot, setLastShot] = useState(null);  // { by, target, r, c, result, sunkId }
  const [placeDeadline, setPlaceDeadline] = useState(null);
  const [turnDeadline, setTurnDeadline] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [channelReady, setChannelReady] = useState(false);
  const [countingDown, setCountingDown] = useState(false);
  const [myWin, setMyWin] = useState(false);
  const [selected, setSelected] = useState([]);    // pick (>2 joueurs)

  // ---- état local (jamais diffusé) ----
  const [myPlacements, setMyPlacements] = useState([]);
  const [selShip, setSelShip] = useState(FLEET[0].id);
  const [horiz, setHoriz] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [hoverCell, setHoverCell] = useState(null); // [r,c] au placement
  const [view, setView] = useState("2d");
  const [fx, setFx] = useState([]);                 // effets transitoires

  const channelRef = useRef(null);
  const stateRef = useRef({});
  const restoredRef = useRef(false);
  const autoStartedRef = useRef(false);
  const savedResultRef = useRef(false);
  const timeouts = useRef([]);
  const placeTimerRef = useRef(null);
  const turnTimerRef = useRef(null);
  const fxSeq = useRef(0);
  const lastShotSeenRef = useRef(null);

  useEffect(() => {
    stateRef.current = { phase, sub, p1, p2, boards, ready, shots, turn, winner, scores, placeDeadline, turnDeadline };
  });

  useEffect(() => { try { const v = localStorage.getItem(VIEW_KEY); if (v === "iso" || v === "2d") setView(v); } catch (e) {} }, []);
  function toggleView() {
    setView(v => { const nv = v === "2d" ? "iso" : "2d"; try { localStorage.setItem(VIEW_KEY, nv); } catch (e) {} return nv; });
  }

  // horloge locale (décomptes)
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, []);

  const opponentId = (pid) => (p1 && pid === p1.id ? p2?.id : p1?.id);
  const playerObj = (pid) => (p1 && pid === p1.id ? p1 : p2);

  // ================= RÉSEAU =================
  function persist(snapshot) {
    if (!isHost) return;
    saveGameState(room.id, GAME_ID, { v: 1, phase: "playing", ...snapshot });
  }

  useEffect(() => {
    const ch = supabase.channel("naval_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "match_start" }, ({ payload }) => {
      setP1(payload.p1); setP2(payload.p2);
      setBoards({}); setReady({});
      setShots({ [payload.p1.id]: emptyShots(), [payload.p2.id]: emptyShots() });
      setTurn(null); setWinner(null); setSub("place");
      setScores(payload.scores || { [payload.p1.id]: 0, [payload.p2.id]: 0 });
      setLastShot(null); lastShotSeenRef.current = null;
      setPlaceDeadline(payload.placeDeadline);
      setTurnDeadline(null);
      setMyPlacements([]); setSubmitted(false); setSelShip(FLEET[0].id); setHoriz(true);
      setMyWin(false); savedResultRef.current = false;
      setPhase("playing"); setCountingDown(true);
      if (isHost) {
        clearTimeout(placeTimerRef.current); clearTimeout(turnTimerRef.current);
        persist({ sub: "place", p1: payload.p1, p2: payload.p2, boards: {}, ready: {},
          shots: { [payload.p1.id]: emptyShots(), [payload.p2.id]: emptyShots() },
          turn: null, winner: null, scores: payload.scores || { [payload.p1.id]: 0, [payload.p2.id]: 0 },
          placeDeadline: payload.placeDeadline, turnDeadline: null, lastShot: null });
        armPlaceTimer(payload.placeDeadline);
      }
    });

    ch.on("broadcast", { event: "place_ready" }, ({ payload }) => { if (isHost) hostHandleReady(payload); });
    ch.on("broadcast", { event: "fire_attempt" }, ({ payload }) => { if (isHost) hostHandleFire(payload); });

    ch.on("broadcast", { event: "state" }, ({ payload }) => {
      applyState(payload);
      if (isHost) persist(payload);
    });

    ch.subscribe(status => {
      if (status === "SUBSCRIBED") {
        setChannelReady(true);
        if (!restoredRef.current) {
          restoredRef.current = true;
          const saved = readGameState(room, GAME_ID);
          if (saved && saved.v) {
            applyState(saved);
            setP1(saved.p1); setP2(saved.p2);
            setPhase("playing");
            autoStartedRef.current = true;
            // si j'avais déjà soumis ma flotte, la retrouver depuis boards
            const mineSaved = saved.boards && saved.boards[me.id];
            if (mineSaved) { setMyPlacements(mineSaved); setSubmitted(true); }
            if (isHost && !saved.winner) {
              if (saved.sub === "place") armPlaceTimer(saved.placeDeadline);
              else if (saved.sub === "combat" && saved.turnDeadline) armTurnTimer(saved.turnDeadline);
            }
          }
        }
      }
    });

    return () => {
      timeouts.current.forEach(clearTimeout);
      clearTimeout(placeTimerRef.current); clearTimeout(turnTimerRef.current);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, isHost]);

  function applyState(s) {
    setSub(s.sub); setBoards(s.boards || {}); setReady(s.ready || {});
    setShots(s.shots || {}); setTurn(s.turn); setWinner(s.winner);
    setScores(s.scores || {}); setPlaceDeadline(s.placeDeadline || null);
    setTurnDeadline(s.turnDeadline || null); setLastShot(s.lastShot || null);
    if (s.p1) setP1(s.p1); if (s.p2) setP2(s.p2);
    // SFX + effets, une seule fois par tir
    if (s.lastShot && s.lastShot.key && s.lastShot.key !== lastShotSeenRef.current) {
      lastShotSeenRef.current = s.lastShot.key;
      const ls = s.lastShot;
      if (ls.result === "hit") { playDynamite(); spawnFx(ls.target, ls.r, ls.c, "boom"); if (ls.sunkId) setTimeout(() => playConfirmChime(), 180); }
      else if (ls.result === "miss") { playSplash(); spawnFx(ls.target, ls.r, ls.c, "splash"); }
    }
  }

  function broadcast(payload) {
    channelRef.current.send({ type: "broadcast", event: "state", payload });
  }

  // ---- arbitrage placement ----
  function hostHandleReady({ by, placements }) {
    const s = stateRef.current;
    if (s.winner || s.sub !== "place") return;
    if (by !== s.p1?.id && by !== s.p2?.id) return;
    if (!validPlacements(placements)) return;
    const boards2 = { ...s.boards, [by]: placements };
    const ready2 = { ...s.ready, [by]: true };
    if (ready2[s.p1.id] && ready2[s.p2.id]) { startCombat(boards2); return; }
    broadcast({ sub: "place", p1: s.p1, p2: s.p2, boards: boards2, ready: ready2, shots: s.shots,
      turn: null, winner: null, scores: s.scores, placeDeadline: s.placeDeadline, turnDeadline: null, lastShot: null });
  }

  function startCombat(boards2) {
    const s = stateRef.current;
    const first = Math.random() < 0.5 ? s.p1.id : s.p2.id;
    const dl = Date.now() + TURN_MS;
    clearTimeout(placeTimerRef.current);
    broadcast({ sub: "combat", p1: s.p1, p2: s.p2, boards: boards2, ready: s.ready,
      shots: { [s.p1.id]: emptyShots(), [s.p2.id]: emptyShots() },
      turn: first, winner: null, scores: s.scores, placeDeadline: null, turnDeadline: dl, lastShot: null });
    armTurnTimer(dl);
  }

  function armPlaceTimer(deadline) {
    clearTimeout(placeTimerRef.current);
    if (!isHost || !deadline) return;
    placeTimerRef.current = setTimeout(() => {
      const s = stateRef.current;
      if (s.winner || s.sub !== "place") return;
      const boards2 = { ...s.boards };
      for (const pid of [s.p1.id, s.p2.id]) {
        if (!s.ready[pid] || !validPlacements(boards2[pid])) boards2[pid] = autoPlace();
      }
      startCombat(boards2);
    }, Math.max(0, deadline - Date.now()));
  }

  // ---- arbitrage tir ----
  function hostHandleFire({ by, r, c }) {
    const s = stateRef.current;
    if (s.winner || s.sub !== "combat") return;
    if (by !== s.turn) return;
    const target = by === s.p1.id ? s.p2.id : s.p1.id;
    const res = resolveFire(s.boards[target], s.shots[target], r, c);
    if (res.already) return;
    const shots2 = { ...s.shots, [target]: res.shots };
    const key = Date.now() + "-" + Math.random().toString(36).slice(2, 6);
    const ls = { key, by, target, r, c, result: res.result, sunkId: res.sunk ? res.shipId : null };
    if (res.allSunk) {
      const scores2 = { ...s.scores, [by]: (s.scores[by] || 0) + 1 };
      clearTimeout(turnTimerRef.current);
      broadcast({ sub: "combat", p1: s.p1, p2: s.p2, boards: s.boards, ready: s.ready, shots: shots2,
        turn: by, winner: by, scores: scores2, placeDeadline: null, turnDeadline: null, lastShot: ls });
      return;
    }
    // touché = on rejoue ; manqué = au tour de l'adversaire
    const nextTurn = res.result === "hit" ? by : target;
    const dl = Date.now() + TURN_MS;
    broadcast({ sub: "combat", p1: s.p1, p2: s.p2, boards: s.boards, ready: s.ready, shots: shots2,
      turn: nextTurn, winner: null, scores: s.scores, placeDeadline: null, turnDeadline: dl, lastShot: ls });
    armTurnTimer(dl);
  }

  function armTurnTimer(deadline) {
    clearTimeout(turnTimerRef.current);
    if (!isHost || !deadline) return;
    turnTimerRef.current = setTimeout(() => {
      const s = stateRef.current;
      if (s.winner || s.sub !== "combat") return;
      // le joueur au tour n'a pas tiré : tir aléatoire à sa place, puis le
      // tour passe (pas de relance sur un tir automatique de pénalité).
      const by = s.turn;
      const target = by === s.p1.id ? s.p2.id : s.p1.id;
      const rc = randomShot(s.shots[target]);
      if (!rc) return;
      const res = resolveFire(s.boards[target], s.shots[target], rc[0], rc[1]);
      const shots2 = { ...s.shots, [target]: res.shots };
      const key = Date.now() + "-to";
      const ls = { key, by, target, r: rc[0], c: rc[1], result: res.result, sunkId: res.sunk ? res.shipId : null, timeout: true };
      if (res.allSunk) {
        const scores2 = { ...s.scores, [by]: (s.scores[by] || 0) + 1 };
        broadcast({ sub: "combat", p1: s.p1, p2: s.p2, boards: s.boards, ready: s.ready, shots: shots2,
          turn: by, winner: by, scores: scores2, placeDeadline: null, turnDeadline: null, lastShot: ls });
        return;
      }
      const dl = Date.now() + TURN_MS;
      broadcast({ sub: "combat", p1: s.p1, p2: s.p2, boards: s.boards, ready: s.ready, shots: shots2,
        turn: target, winner: null, scores: s.scores, placeDeadline: null, turnDeadline: dl, lastShot: ls });
      armTurnTimer(dl);
    }, Math.max(0, deadline - Date.now()));
  }

  // ================= DÉMARRAGE / PICK =================
  useEffect(() => {
    if (!isHost || phase !== "intro" || autoStartedRef.current || !channelReady) return;
    if (players.length === 2) {
      autoStartedRef.current = true;
      const [a, b] = players;
      const pa = { id: a.profile_id, username: a.profiles?.username, avatar: a.profiles?.avatar };
      const pb = { id: b.profile_id, username: b.profiles?.username, avatar: b.profiles?.avatar };
      const [first, second] = Math.random() < 0.5 ? [pa, pb] : [pb, pa];
      channelRef.current.send({ type: "broadcast", event: "match_start",
        payload: { p1: first, p2: second, placeDeadline: Date.now() + PLACE_MS, scores: { [first.id]: 0, [second.id]: 0 } } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, channelReady, players.length]);

  function toggleSelect(pid) {
    setSelected(prev => prev.includes(pid) ? prev.filter(x => x !== pid) : (prev.length >= 2 ? prev : [...prev, pid]));
  }
  function confirmPick() {
    if (selected.length !== 2 || !channelReady) return;
    const chosen = selected.map(pid => players.find(p => p.profile_id === pid)).filter(Boolean);
    if (chosen.length !== 2) return;
    const pa = { id: chosen[0].profile_id, username: chosen[0].profiles?.username, avatar: chosen[0].profiles?.avatar };
    const pb = { id: chosen[1].profile_id, username: chosen[1].profiles?.username, avatar: chosen[1].profiles?.avatar };
    const [first, second] = Math.random() < 0.5 ? [pa, pb] : [pb, pa];
    channelRef.current.send({ type: "broadcast", event: "match_start",
      payload: { p1: first, p2: second, placeDeadline: Date.now() + PLACE_MS, scores: { [first.id]: 0, [second.id]: 0 } } });
  }

  function rejouer() {
    if (!isHost || !p1 || !p2) return;
    const [first, second] = Math.random() < 0.5 ? [p1, p2] : [p2, p1];
    channelRef.current.send({ type: "broadcast", event: "match_start",
      payload: { p1: first, p2: second, placeDeadline: Date.now() + PLACE_MS, scores } });
  }
  async function backToRoom() { await resetRoomToLobby(room.id); onFinish && onFinish(); }

  // enregistrement du résultat une fois le vainqueur connu
  useEffect(() => {
    if (!winner || savedResultRef.current || !p1 || !p2) return;
    const isPlayer = me.id === p1.id || me.id === p2.id;
    if (!isPlayer) return;
    savedResultRef.current = true;
    const won = winner === me.id;
    setMyWin(won);
    if (won) playGameWin(); else playGameLose();
    recordMatchResult(room.id, won);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  // panique quand le décompte du tour passe sous 6 s (à moi de jouer)
  const panicRef = useRef(false);
  useEffect(() => {
    const dl = sub === "combat" ? turnDeadline : sub === "place" ? placeDeadline : null;
    const left = dl ? Math.ceil((dl - now) / 1000) : null;
    const mine = sub === "combat" ? turn === me.id : sub === "place" ? !submitted : false;
    if (left != null && left <= 6 && left > 0 && mine && !winner) {
      if (!panicRef.current) { panicRef.current = true; playPanicClock(); }
    } else panicRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  // ================= FX =================
  function spawnFx(target, r, c, kind) {
    const id = "fx-" + (fxSeq.current++);
    setFx(prev => [...prev, { id, target, r, c, kind }]);
    const tm = setTimeout(() => setFx(prev => prev.filter(f => f.id !== id)), 900);
    timeouts.current.push(tm);
  }

  // ================= PLACEMENT (local) =================
  function selectShip(id) { if (!myPlacements.some(p => p.id === id)) setSelShip(id); }
  function placeAt(r, c) {
    if (submitted) return;
    const id = selShip; if (!id || myPlacements.some(p => p.id === id)) return;
    const cells = shipCells(id, r, c, horiz);
    const occ = occupiedSet(myPlacements);
    if (!cellsFit(occ, cells)) return;
    const next = [...myPlacements, { id, r, c, horiz }];
    setMyPlacements(next);
    playTokenDrop();
    const remaining = FLEET.find(s => !next.some(p => p.id === s.id));
    setSelShip(remaining ? remaining.id : null);
  }
  function resetPlacement() { if (!submitted) { setMyPlacements([]); setSelShip(FLEET[0].id); } }
  function autoPlaceMine() { if (submitted) return; const p = autoPlace(); if (p) { setMyPlacements(p); setSelShip(null); playTokenDrop(); } }
  function submitFleet() {
    if (submitted || !validPlacements(myPlacements)) return;
    setSubmitted(true);
    channelRef.current?.send({ type: "broadcast", event: "place_ready", payload: { by: me.id, placements: myPlacements } });
  }
  function fireAt(r, c) {
    if (winner || sub !== "combat" || turn !== me.id) return;
    const target = opponentId(me.id);
    if (!shots[target] || shots[target][r][c]) return;
    channelRef.current?.send({ type: "broadcast", event: "fire_attempt", payload: { by: me.id, r, c } });
  }

  // hover fantôme au placement (cellules du navier sélectionné)
  function hoverGhost() {
    if (submitted || !hoverCell || !selShip || myPlacements.some(p => p.id === selShip)) return null;
    const [r, c] = hoverCell;
    const cells = shipCells(selShip, r, c, horiz);
    const occ = occupiedSet(myPlacements);
    const ok = cellsFit(occ, cells);
    return { cells, ok };
  }

  // ================= DÉRIVÉS =================
  const amP1 = !!(p1 && me.id === p1.id);
  const amP2 = !!(p2 && me.id === p2.id);
  const isPlayer = amP1 || amP2;
  const oppId = opponentId(me.id);
  const isMyTurn = sub === "combat" && !winner && turn === me.id;
  const needsPick = players.length > 2;
  const placeLeft = placeDeadline ? Math.max(0, Math.ceil((placeDeadline - now) / 1000)) : null;
  const turnLeft = turnDeadline ? Math.max(0, Math.ceil((turnDeadline - now) / 1000)) : null;

  // ================= RENDU =================
  function renderGrid({ owner, placements, shotsGrid, isEnemy, interactive }) {
    // owner = pid du propriétaire du plateau ; on affiche les navires du
    // propriétaire seulement si ce n'est PAS le plateau adverse (sinon on ne
    // montre que les navires COULÉS).
    const cellMapVisible = placements || [];
    const ghost = interactive && !isEnemy ? hoverGhost() : null;
    const ghostSet = new Set(ghost ? ghost.cells.map(([r, c]) => r + "," + c) : []);
    return (
      <div className="naval-grid">
        {Array.from({ length: N }).map((_, r) => Array.from({ length: N }).map((__, c) => {
          const shot = shotsGrid && shotsGrid[r] ? shotsGrid[r][c] : null;
          const aim = isEnemy && interactive && !shot;
          const gcell = ghostSet.has(r + "," + c);
          const cls = "naval-cell"
            + (shot === "miss" ? " sea-lo" : "")
            + (aim ? " aim" : "")
            + (gcell ? (ghost.ok ? " ghost-ok" : " ghost-bad") : "");
          return (
            <div key={r + "-" + c} className={cls}
              onClick={() => { if (interactive) { isEnemy ? fireAt(r, c) : placeAt(r, c); } }}
              onMouseEnter={() => { if (interactive && !isEnemy) setHoverCell([r, c]); }}
              onMouseLeave={() => { if (interactive && !isEnemy) setHoverCell(cur => (cur && cur[0] === r && cur[1] === c ? null : cur)); }}
            >
              {shot === "miss" && <span className="naval-mark"><span className="naval-miss" /></span>}
              {shot === "hit" && <span className="naval-hit"><span className="em">🔥</span></span>}
            </div>
          );
        }))}
        {/* navires */}
        {cellMapVisible.map(pl => {
          const sunk = shotsGrid ? shipCells(pl.id, pl.r, pl.c, pl.horiz).every(([rr, cc]) => shotsGrid[rr] && shotsGrid[rr][cc] === "hit") : false;
          if (isEnemy && !sunk) return null;            // ennemi : navires cachés sauf coulés
          const { rows, cols } = shipRect(pl);
          return (
            <div key={pl.id} className={"naval-ship " + pl.id + (sunk ? " sunk" : "") + (pl.horiz ? " h" : " v")}
              style={pctPos(pl.r, pl.c, rows, cols)}>
              <span className="naval-ship-body" />
            </div>
          );
        })}
        {/* FX (explosions / gerbes) sur ce plateau */}
        {fx.filter(f => f.target === owner).map(f => (
          <span key={f.id} className={"naval-fx " + f.kind}
            style={{ left: ((f.c + 0.5) / N) * 100 + "%", top: ((f.r + 0.5) / N) * 100 + "%" }}>
            {f.kind === "boom" ? (
              <><span className="naval-fx-wave" /><span className="naval-fx-flash"><span className="em">💥</span></span>
                {Array.from({ length: 8 }).map((_, i) => <span key={i} className="naval-fx-spark" style={fxScatter(i, 22)} />)}</>
            ) : (
              <><span className="naval-fx-ring" />
                {Array.from({ length: 7 }).map((_, i) => <span key={i} className="naval-fx-drop" style={fxScatter(i, 16)} />)}</>
            )}
          </span>
        ))}
      </div>
    );
  }

  function fxScatter(i, dist) {
    const a = (i / 8) * Math.PI * 2 + (i % 2 ? 0.4 : 0);
    return { "--dx": (Math.cos(a) * dist).toFixed(1) + "px", "--dy": (Math.sin(a) * dist).toFixed(1) + "px" };
  }

  function renderRoster(placements, shotsGrid, label) {
    const st = fleetStatus(placements, shotsGrid || emptyShots());
    return (
      <div className="naval-roster">
        <span className="naval-roster-lbl">{label}</span>
        {st.map(s => (
          <span key={s.id} className={"naval-roster-ship" + (s.sunk ? " sunk" : "")}>
            {Array.from({ length: s.size }).map((_, i) => <i key={i} />)}
          </span>
        ))}
      </div>
    );
  }

  // ---------- contenu ----------
  let content;
  if (phase === "intro") {
    if (players.length < 2) content = <p className="muted">{t("navalNotEnough")}</p>;
    else if (!needsPick) content = <p className="muted">{t("navalStarting")}</p>;
    else if (isHost) {
      content = (
        <div>
          <p className="hint">{t("navalPickHint")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0 16px" }}>
            {players.map(p => {
              const on = selected.includes(p.profile_id);
              return (
                <button key={p.id} onClick={() => toggleSelect(p.profile_id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 99,
                    border: `2px solid ${on ? "var(--acc-naval)" : "var(--line)"}`,
                    background: on ? "rgba(63,169,214,.14)" : "rgba(255,255,255,.04)", fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>
                  <span>{p.profiles?.avatar}</span><span>{p.profiles?.username}</span>
                </button>
              );
            })}
          </div>
          <button className="btn" disabled={selected.length !== 2} onClick={confirmPick}>{t("navalPickConfirm")}</button>
        </div>
      );
    } else content = <p className="muted">{t("navalWaitPick")}</p>;
  } else {
    // playing
    const iAmSpectator = !isPlayer;
    const myBoardPlacements = submitted ? (boards[me.id] || myPlacements) : myPlacements;
    const viewCls = "naval-arena view-" + view;
    const viewToggle = (
      <div className="naval-topbar">
        <div className="naval-scoreline">
          <span className={"naval-pchip" + (turn === p1?.id && sub === "combat" && !winner ? " active" : "")}>
            <span className="av">{p1?.avatar}</span>{p1?.username} <b>{scores[p1?.id] || 0}</b>
          </span>
          <span className="naval-vs">{t("navalVs")}</span>
          <span className={"naval-pchip" + (turn === p2?.id && sub === "combat" && !winner ? " active" : "")}>
            <span className="av">{p2?.avatar}</span>{p2?.username} <b>{scores[p2?.id] || 0}</b>
          </span>
        </div>
        <button className="naval-view-btn" onClick={toggleView} title={t("navalViewToggle")}>
          {view === "2d" ? "◱ 3D" : "▦ 2D"}
        </button>
      </div>
    );

    if (sub === "place" && isPlayer) {
      const ready1 = ready[p1?.id], ready2 = ready[p2?.id];
      content = (
        <div>
          {viewToggle}
          <p className="naval-status">
            {submitted ? t("navalWaitOpponentPlace") : t("navalPlacePrompt")}
            {placeLeft != null && <span className={"naval-timer" + (placeLeft <= 6 ? " hot" : "")}>0:{String(placeLeft).padStart(2, "0")}</span>}
          </p>
          <div className={viewCls + " placing"}>
            <div className="naval-board-wrap">
              <p className="naval-board-title">{t("navalYourFleet")}</p>
              <div className="naval-scene">
                {renderGrid({ owner: me.id, placements: myBoardPlacements, shotsGrid: null, isEnemy: false, interactive: !submitted })}
              </div>
            </div>
            {!submitted && (
              <div className="naval-tray">
                <p className="naval-tray-title">{t("navalPlaceShips")}</p>
                {FLEET.map(s => {
                  const done = myPlacements.some(p => p.id === s.id);
                  return (
                    <div key={s.id} className={"naval-tray-ship" + (selShip === s.id ? " sel" : "") + (done ? " done" : "")}
                      onClick={() => !done && selectShip(s.id)}>
                      <span className="naval-tray-pips">{Array.from({ length: s.len * s.beam }).map((_, i) => <i key={i} />)}</span>
                      <span className="nm">{t(s.nameKey)} <em>{s.len}{s.beam > 1 ? "×" + s.beam : ""}</em></span>
                    </div>
                  );
                })}
                <div className="naval-tray-btns">
                  <button className="btn" onClick={() => setHoriz(h => !h)}>⟳ {t("navalRotate")}</button>
                  <button className="btn" onClick={autoPlaceMine}>🎲 {t("navalAuto")}</button>
                </div>
                <button className="btn ghost" onClick={resetPlacement} style={{ width: "100%" }}>↺ {t("navalReset")}</button>
                <button className="btn naval-done-btn" disabled={!validPlacements(myPlacements)} onClick={submitFleet} style={{ width: "100%" }}>
                  ✓ {t("navalDone")}
                </button>
              </div>
            )}
          </div>
          <p className="naval-place-progress">
            {(ready1 ? "✓" : "…") + " " + (p1?.username || "")} &nbsp;·&nbsp; {(ready2 ? "✓" : "…") + " " + (p2?.username || "")}
          </p>
        </div>
      );
    } else {
      // combat (ou spectateur, ou fin)
      const iWon = winner && winner === me.id;
      const targetForMe = isPlayer ? oppId : p2?.id;
      const myBoard = isPlayer ? me.id : p1?.id;
      const myShotsRecv = shots[myBoard];
      const enemyShots = shots[targetForMe];
      content = (
        <div style={{ position: "relative" }}>
          {viewToggle}
          <p className="naval-status">
            {winner
              ? (isPlayer ? (iWon ? "🏆 " + t("navalWinYou") : "☠️ " + t("navalWinOpponent")) : `${playerObj(winner)?.username} ${t("navalWinSpectator")}`)
              : isMyTurn ? "🎯 " + t("navalYourTurn")
              : isPlayer ? `${t("navalWaitingFor")} ${playerObj(turn)?.username || ""}…`
              : `${t("navalWaitingFor")} ${playerObj(turn)?.username || ""}…`}
            {!winner && turnLeft != null && isPlayer && <span className={"naval-timer" + (turnLeft <= 6 ? " hot" : "")}>0:{String(turnLeft).padStart(2, "0")}</span>}
          </p>
          <div className={viewCls}>
            <div className="naval-board-wrap">
              <p className="naval-board-title">{isPlayer ? t("navalYourFleet") : (p1?.username || "")}</p>
              <div className="naval-scene">
                {renderGrid({ owner: myBoard, placements: boards[myBoard], shotsGrid: myShotsRecv, isEnemy: false, interactive: false })}
              </div>
              {renderRoster(boards[myBoard], myShotsRecv, t("navalYourShips"))}
            </div>
            <div className="naval-board-wrap">
              <p className="naval-board-title"><b className="naval-enemy-lbl">{isPlayer ? t("navalEnemyWaters") : (p2?.username || "")}</b></p>
              <div className="naval-scene">
                {renderGrid({ owner: targetForMe, placements: boards[targetForMe], shotsGrid: enemyShots, isEnemy: isPlayer, interactive: isMyTurn })}
              </div>
              {renderRoster(boards[targetForMe], enemyShots, t("navalEnemyShips"))}
            </div>
          </div>
          {winner && (
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
              {isHost ? (
                <>
                  <button className="btn" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={rejouer}>🔁 {t("navalRejouer")}</button>
                  <button className="btn ghost" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={backToRoom}>🏠 {t("navalBackToRoom")}</button>
                </>
              ) : <p className="muted">{t("navalRejouerWait")}</p>}
            </div>
          )}
        </div>
      );
    }
  }

  return (
    <div className="panel naval-panel" style={{ maxWidth: "min(1040px, 98vw)" }}>
      <h1>{t("navalTitle")}</h1>
      <Crossfade id={phase + "-" + sub + (winner ? "-over" : "")}>{content}</Crossfade>
      {countingDown && phase === "playing" && (
        <GameCountdown variant="naval" onDone={() => setCountingDown(false)} />
      )}
    </div>
  );
}
