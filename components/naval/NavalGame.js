"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby, recordMatchResult } from "@/lib/gameSync";
import { playDynamite, playNavalSplash, playTokenDrop, playPanicClock, playGameWin, playGameLose, playNavalWhistle, playNavalSink, primeFiles } from "@/lib/sfx";
import Crossfade from "../Crossfade";
import GameCountdown from "../GameCountdown";
import {
  N, shipDef, shipCells, autoPlace, emptyShots,
  validPlacements, resolveFire, fleetStatus, randomShot,
} from "./navalEngine";
import { decideBotShot, NAVAL_DIFFICULTIES, NAVAL_DEFAULT_DIFFICULTY } from "./botLogic";
import { boardSVG, boardGeom, dualBoardSVG, dualBoardGeom, topSpriteSVG, missileSVG, FLEET_ORDER } from "./navalArt";

const GAME_ID = "naval";
const PLACE_MS = 45000;   // temps de placement
const TURN_MS = 30000;    // temps par tir en combat
const VIEW_KEY = "arcardi:navalView";
const TABLE = 2;          // duel : un bot complète en solo
const BOT_SHOT_DELAY = 900; // délai de lisibilité avant chaque tir du bot

function makeBotSeat() { return { id: "bot1", username: "Bot", avatar: "🤖", isBot: true }; }
const DIFF_META = {
  easy:   { icon: "🟢", key: "navalDiffEasy" },
  medium: { icon: "🟡", key: "navalDiffMedium" },
  expert: { icon: "🔴", key: "navalDiffExpert" },
};
const inB = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
// [rows, cols] occupés selon l'orientation (horiz = grand axe le long des colonnes)
function dims(id, horiz) { const s = shipDef(id); return horiz ? [s.beam, s.len] : [s.len, s.beam]; }

// ================= FX (SVG, une couche par plateau) =================
function fxMarkup(kind, big, u) {
  const s = (big ? 1.5 : 1) * u;
  if (kind === "boom") {
    let g = `<circle class="nvfx-ring" cx="0" cy="0" r="${(0.2 * s).toFixed(1)}" fill="none" stroke="rgba(255,200,110,.95)" stroke-width="3"/>`;
    g += `<circle class="nvfx-flash" cx="0" cy="0" r="${(0.3 * s).toFixed(1)}" fill="#fff3c4"/>`;
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      g += `<circle class="nvfx-spark" style="--dx:${(Math.cos(a) * 0.85 * s).toFixed(1)}px;--dy:${(Math.sin(a) * 0.55 * s).toFixed(1)}px" cx="0" cy="0" r="${(0.06 * s).toFixed(1)}" fill="#ff9430"/>`;
    }
    return g;
  }
  if (kind === "splash") {
    let g = `<ellipse class="nvfx-sring" cx="0" cy="0" rx="${(0.16 * u).toFixed(1)}" ry="${(0.1 * u).toFixed(1)}" fill="none" stroke="rgba(160,220,255,.9)" stroke-width="2.5"/>`;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + 0.5;
      g += `<circle class="nvfx-drop" style="--dx:${(Math.cos(a) * 0.5 * u).toFixed(1)}px;--dy:${(-Math.abs(Math.sin(a)) * 0.8 * u).toFixed(1)}px" cx="0" cy="0" r="${(0.05 * u).toFixed(1)}" fill="#bfe4ff"/>`;
    }
    return g;
  }
  if (kind === "missile") {
    const len = (big ? 2.6 : 1.15) * u;
    const sx = (big ? 4.2 : 2.1) * u, sy = -(big ? 9 : 5.4) * u;
    return `<g class="nvfx-msfall${big ? " big" : ""}" style="--sx:${sx.toFixed(1)}px;--sy:${sy.toFixed(1)}px">${missileSVG(len)}</g>`;
  }
  return "";
}

function NavalBoard({
  mode, edge, u, headroom, shots, ships, ghost, aoe, aim, fx, badges,
  onCellClick, onCellHover, onCellLeave, onShipPointerDown, boardRef, idSalt,
}) {
  const geom = useMemo(() => boardGeom(mode, u, headroom), [mode, u, headroom]);
  const html = useMemo(
    () => boardSVG({ mode, u, edge, headroom, shots, ships, ghost, aoe, aim, idSalt }),
    [mode, u, edge, headroom, shots, ships, ghost, aoe, aim, idSalt]
  );
  const wrapRef = useRef(null);
  const tapRef = useRef(null);
  useEffect(() => { if (boardRef) boardRef.current = wrapRef.current; });

  function rcFromEvent(e) {
    const el = e.target.closest && e.target.closest("[data-r]");
    if (!el) return null;
    return [+el.getAttribute("data-r"), +el.getAttribute("data-c")];
  }
  function shipFromEvent(e) {
    const el = e.target.closest && e.target.closest("[data-ship]");
    return el ? el.getAttribute("data-ship") : null;
  }

  return (
    <div className="naval-scene" ref={wrapRef}
      onPointerDown={(e) => {
        if (onShipPointerDown) { const sid = shipFromEvent(e); if (sid) { onShipPointerDown(sid, e); tapRef.current = null; return; } }
        const rc = rcFromEvent(e); tapRef.current = rc ? { r: rc[0], c: rc[1], x: e.clientX, y: e.clientY } : null;
      }}
      onPointerUp={(e) => {
        const tp = tapRef.current; tapRef.current = null;
        if (!tp || !onCellClick) return;
        if (Math.hypot(e.clientX - tp.x, e.clientY - tp.y) > 12) return; // c'était un drag, pas un tir
        const rc = rcFromEvent(e);
        onCellClick(rc ? rc[0] : tp.r, rc ? rc[1] : tp.c);
      }}
      onPointerCancel={() => { tapRef.current = null; }}
      onMouseMove={(e) => { const rc = rcFromEvent(e); if (rc && onCellHover) onCellHover(rc[0], rc[1]); }}
      onMouseLeave={() => onCellLeave && onCellLeave()}
    >
      <div className="naval-svg-host" dangerouslySetInnerHTML={{ __html: html }} />
      <svg className="naval-ov" viewBox={geom.vb.map(n => (Math.round(n * 10) / 10)).join(" ")} preserveAspectRatio="xMidYMid meet">
        <g pointerEvents="none">
          {fx && fx.map(f => {
            const [x, y] = geom.center(f.r, f.c, mode === "iso" ? 0.1 : 0);
            return <g key={f.id} transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}
              className={"nvfx nvfx-" + f.kind} dangerouslySetInnerHTML={{ __html: fxMarkup(f.kind, f.big, u) }} />;
          })}
        </g>
        {badges && badges.map(b => {
          const [rows, cols] = dims(b.id, b.horiz);
          const p = geom.iso ? geom.art.pr(b.c + cols / 2, b.r + rows / 2, 1.9)
            : [geom.center(b.r, b.c)[0] + (cols - 1) * u / 2, geom.center(b.r, b.c)[1] - rows * u / 2 - 14];
          return (
            <g key={b.id} className="nvRot" onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); b.onRotate(b.id); }}>
              <circle cx={p[0]} cy={p[1]} r="11" fill="#f0a026" stroke="#7a4d0e" strokeWidth="2" />
              <text x={p[0]} y={p[1] + 4.5} textAnchor="middle" fontSize="13" fontWeight="900" fill="#3a2504">⟳</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Combat : les DEUX plateaux dans UN seul svg accolé (disposition "vidéo de
// référence"). Un seul overlay FX porte les effets des deux plateaux (chacun
// repéré par son rôle own|enemy). Les cases portent data-side, on route donc
// le clic/survol vers le bon plateau (seul l'ennemi est ciblable).
function DualBoard({ mode, u, headroom, gap, maxH, own, enemy, fxOwn, fxEnemy, onCellClick, onCellHover, onCellLeave }) {
  const geom = useMemo(() => dualBoardGeom(mode, u, headroom, gap), [mode, u, headroom, gap]);
  const html = useMemo(
    () => dualBoardSVG({ mode, u, headroom, gap, own, enemy, idSalt: "duel" }),
    [mode, u, headroom, gap, own, enemy]
  );
  const tapRef = useRef(null);
  function sideRc(e) {
    const el = e.target.closest && e.target.closest("[data-r]");
    if (!el) return null;
    return { side: el.getAttribute("data-side"), r: +el.getAttribute("data-r"), c: +el.getAttribute("data-c") };
  }
  // La boîte a le MÊME ratio que le dessin (aspect-ratio = W/H) : quand le
  // plafond de hauteur borne le scène, la LARGEUR suit (max-width = maxH·W/H),
  // donc la boîte reste calée sur le dessin — plus de décalage à gauche, et
  // l'overlay FX (inset:0) épouse pile le svg (fin des animations décalées au
  // clic). Centrée par margin auto.
  const boxStyle = { aspectRatio: `${Math.round(geom.W)} / ${Math.round(geom.H)}` };
  if (maxH) { boxStyle.maxHeight = maxH + "px"; boxStyle.maxWidth = Math.round(maxH * geom.W / geom.H) + "px"; }
  return (
    <div className="naval-scene naval-scene-duo" style={boxStyle}
      onPointerDown={(e) => { const h = sideRc(e); tapRef.current = h ? { ...h, x: e.clientX, y: e.clientY } : null; }}
      onPointerUp={(e) => {
        const tp = tapRef.current; tapRef.current = null;
        if (!tp || !onCellClick) return;
        if (Math.hypot(e.clientX - tp.x, e.clientY - tp.y) > 12) return; // drag, pas un tir
        const h = sideRc(e) || tp;
        onCellClick(h.side, h.r, h.c);
      }}
      onPointerCancel={() => { tapRef.current = null; }}
      onMouseMove={(e) => { const h = sideRc(e); if (h && onCellHover) onCellHover(h.side, h.r, h.c); }}
      onMouseLeave={() => onCellLeave && onCellLeave()}
    >
      <div className="naval-svg-host" dangerouslySetInnerHTML={{ __html: html }} />
      <svg className="naval-ov" viewBox={geom.vb.map(n => (Math.round(n * 10) / 10)).join(" ")} preserveAspectRatio="xMidYMid meet">
        <g pointerEvents="none">
          {fxEnemy && fxEnemy.map(f => {
            const [x, y] = geom.center("enemy", f.r, f.c, mode === "iso" ? 0.1 : 0);
            return <g key={"e" + f.id} transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}
              className={"nvfx nvfx-" + f.kind} dangerouslySetInnerHTML={{ __html: fxMarkup(f.kind, f.big, u) }} />;
          })}
          {fxOwn && fxOwn.map(f => {
            const [x, y] = geom.center("own", f.r, f.c, mode === "iso" ? 0.1 : 0);
            return <g key={"o" + f.id} transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}
              className={"nvfx nvfx-" + f.kind} dangerouslySetInnerHTML={{ __html: fxMarkup(f.kind, f.big, u) }} />;
          })}
        </g>
      </svg>
    </div>
  );
}

export default function NavalGame({ room, me, isHost, players, t, lang, onFinish }) {
  const [phase, setPhase] = useState("intro");
  const [sub, setSub] = useState("place");
  const [p1, setP1] = useState(null);
  const [p2, setP2] = useState(null);
  const [boards, setBoards] = useState({});
  const [ready, setReady] = useState({});
  const [shots, setShots] = useState({});
  const [turn, setTurn] = useState(null);
  const [winner, setWinner] = useState(null);
  const [scores, setScores] = useState({});
  const [bonuses, setBonuses] = useState({});
  const [lastShot, setLastShot] = useState(null);
  const [placeDeadline, setPlaceDeadline] = useState(null);
  const [turnDeadline, setTurnDeadline] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [channelReady, setChannelReady] = useState(false);
  const [countingDown, setCountingDown] = useState(false);
  const [myWin, setMyWin] = useState(false);
  const [selected, setSelected] = useState([]);

  // ---- état local (jamais diffusé) ----
  const [myPlacements, setMyPlacements] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [view, setView] = useState("2d");
  const [fxOwn, setFxOwn] = useState([]);
  const [fxEnemy, setFxEnemy] = useState([]);
  const [botDifficulty, setBotDifficulty] = useState(NAVAL_DEFAULT_DIFFICULTY);
  const [armed, setArmed] = useState(null);          // "missile" | null
  const [aoeHover, setAoeHover] = useState(null);    // [[r,c]...]
  const [oris, setOris] = useState({});              // orientation mémorisée par navire
  const [drag, setDrag] = useState(null);            // { id, horiz, r, c, valid }
  const [dragPos, setDragPos] = useState(null);      // { x, y } du fantôme
  const [sceneMaxH, setSceneMaxH] = useState(null);  // plafond de hauteur du scène combat (zéro scroll)

  const channelRef = useRef(null);
  const stateRef = useRef({});
  const restoredRef = useRef(false);
  const autoStartedRef = useRef(false);
  const savedResultRef = useRef(false);
  const timeouts = useRef([]);
  const placeTimerRef = useRef(null);
  const turnTimerRef = useRef(null);
  const botTimerRef = useRef(null);
  const fxSeq = useRef(0);
  const lastShotSeenRef = useRef(null);
  const setupBoardRef = useRef(null);
  const dragRef = useRef(null);
  const navalPanelRef = useRef(null);
  const sceneWrapRef = useRef(null);

  useEffect(() => {
    stateRef.current = { phase, sub, p1, p2, boards, ready, shots, turn, winner, scores, bonuses, placeDeadline, turnDeadline, botDifficulty };
  });

  // Préchargement du mp3 de splash (tir dans l'eau) pour une lecture instantanée.
  useEffect(() => { primeFiles("/sounds/naval-splash.mp3"); }, []);

  useEffect(() => { try { const v = localStorage.getItem(VIEW_KEY); if (v === "iso" || v === "2d") setView(v); } catch (e) {} }, []);
  function toggleView() {
    setView(v => { const nv = v === "2d" ? "iso" : "2d"; try { localStorage.setItem(VIEW_KEY, nv); } catch (e) {} return nv; });
  }

  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(iv); }, []);

  // ---- Fit du scène de combat : ZÉRO SCROLL sur laptop/tablette (bornage par
  // la HAUTEUR de viewport, pas seulement la largeur — c'était la cause du bug
  // de la disposition précédente). Le scène (svg accolé unique) a une largeur
  // 100 % ; on lui pose en plus un plafond de HAUTEUR = hauteur d'écran − tout
  // le reste (titre, barre de score, statut, barre de bonus, inventaires,
  // marges). Le svg garde son ratio et se cale sur la contrainte la plus
  // serrée (largeur OU hauteur). `reserved` = panneau − scène : les deux
  // varient ensemble quand on change le plafond, donc `reserved` est stable
  // (pas de boucle de rétroaction). Sur TÉLÉPHONE (largeur <= 620) on n'impose
  // aucun plafond : léger scroll toléré plutôt que des grilles minuscules
  // (choix validé).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isCombatDuo = phase === "playing" && sub === "combat";
    if (!isCombatDuo) { setSceneMaxH(null); return; }
    let raf = 0;
    const compute = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const panel = navalPanelRef.current, scene = sceneWrapRef.current;
        if (!panel || !scene) return;
        if (window.innerWidth <= 620) { setSceneMaxH(null); return; }
        const reserved = panel.offsetHeight - scene.offsetHeight;
        const budget = Math.round(window.innerHeight - reserved - 24);
        setSceneMaxH(prev => (prev == null || Math.abs(prev - budget) > 4) ? Math.max(220, budget) : prev);
      });
    };
    compute();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(compute) : null;
    if (ro && navalPanelRef.current) ro.observe(navalPanelRef.current);
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sub, winner, view]);

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
      setBonuses(freshBonuses(payload.p1.id, payload.p2.id));
      setBotDifficulty(payload.botDifficulty || NAVAL_DEFAULT_DIFFICULTY);
      setLastShot(null); lastShotSeenRef.current = null;
      setPlaceDeadline(payload.placeDeadline);
      setTurnDeadline(null);
      setMyPlacements([]); setSubmitted(false); setOris({}); setArmed(null); setAoeHover(null);
      setFxOwn([]); setFxEnemy([]);
      setMyWin(false); savedResultRef.current = false;
      setPhase("playing"); setCountingDown(true);
      if (isHost) {
        clearTimeout(placeTimerRef.current); clearTimeout(turnTimerRef.current); clearTimeout(botTimerRef.current);
        persist({ sub: "place", p1: payload.p1, p2: payload.p2, boards: {}, ready: {},
          shots: { [payload.p1.id]: emptyShots(), [payload.p2.id]: emptyShots() },
          turn: null, winner: null, scores: payload.scores || { [payload.p1.id]: 0, [payload.p2.id]: 0 },
          bonuses: freshBonuses(payload.p1.id, payload.p2.id),
          placeDeadline: payload.placeDeadline, turnDeadline: null, lastShot: null, botDifficulty: payload.botDifficulty || NAVAL_DEFAULT_DIFFICULTY });
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
      clearTimeout(placeTimerRef.current); clearTimeout(turnTimerRef.current); clearTimeout(botTimerRef.current);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, isHost]);

  function freshBonuses(a, b) { return { [a]: { missile: 1, rain: 1 }, [b]: { missile: 1, rain: 1 } }; }

  function applyState(s) {
    setSub(s.sub); setBoards(s.boards || {}); setReady(s.ready || {});
    setShots(s.shots || {}); setTurn(s.turn); setWinner(s.winner);
    setScores(s.scores || {}); setBonuses(s.bonuses || {}); setPlaceDeadline(s.placeDeadline || null);
    setTurnDeadline(s.turnDeadline || null); setLastShot(s.lastShot || null);
    if (s.botDifficulty) setBotDifficulty(s.botDifficulty);
    if (s.p1) setP1(s.p1); if (s.p2) setP2(s.p2);
    if (isHost) maybeScheduleBot(s);
    // SFX + effets, une seule fois par tir
    if (s.lastShot && s.lastShot.key && s.lastShot.key !== lastShotSeenRef.current) {
      lastShotSeenRef.current = s.lastShot.key;
      playShotFx(s.lastShot);
    }
  }

  function broadcast(payload) {
    if (payload.botDifficulty == null) payload.botDifficulty = stateRef.current.botDifficulty;
    if (payload.bonuses == null) payload.bonuses = stateRef.current.bonuses;
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
    const oppSeat = by === s.p1.id ? s.p2 : s.p1;
    if (oppSeat && oppSeat.isBot && !ready2[oppSeat.id]) { boards2[oppSeat.id] = autoPlace(); ready2[oppSeat.id] = true; }
    if (ready2[s.p1.id] && ready2[s.p2.id]) { startCombat(boards2); return; }
    broadcast({ sub: "place", p1: s.p1, p2: s.p2, boards: boards2, ready: ready2, shots: s.shots,
      turn: null, winner: null, scores: s.scores, bonuses: s.bonuses, placeDeadline: s.placeDeadline, turnDeadline: null, lastShot: null });
  }

  function startCombat(boards2) {
    const s = stateRef.current;
    const first = Math.random() < 0.5 ? s.p1.id : s.p2.id;
    const dl = Date.now() + TURN_MS;
    clearTimeout(placeTimerRef.current);
    broadcast({ sub: "combat", p1: s.p1, p2: s.p2, boards: boards2, ready: s.ready,
      shots: { [s.p1.id]: emptyShots(), [s.p2.id]: emptyShots() },
      turn: first, winner: null, scores: s.scores, bonuses: s.bonuses, placeDeadline: null, turnDeadline: dl, lastShot: null });
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

  // ---- arbitrage tir : kind = shot | missile | rain
  function hostHandleFire({ by, r, c, kind }) {
    const s = stateRef.current;
    if (s.winner || s.sub !== "combat" || by !== s.turn) return;
    const target = by === s.p1.id ? s.p2.id : s.p1.id;
    if (kind === "missile") {
      if (!(s.bonuses[by] && s.bonuses[by].missile > 0)) return;
      const cells = [];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (inB(rr, cc) && !s.shots[target][rr][cc]) cells.push([rr, cc]);
      }
      const bonuses2 = { ...s.bonuses, [by]: { ...s.bonuses[by], missile: 0 } };
      applyShots(s, by, cells, { kind: "missile", center: [r, c], bonuses: bonuses2 });
    } else if (kind === "rain") {
      if (!(s.bonuses[by] && s.bonuses[by].rain > 0)) return;
      const free = [];
      for (let rr = 0; rr < N; rr++) for (let cc = 0; cc < N; cc++) if (!s.shots[target][rr][cc]) free.push([rr, cc]);
      const cells = [];
      for (let i = 0; i < 5 && free.length; i++) cells.push(free.splice(Math.floor(Math.random() * free.length), 1)[0]);
      const bonuses2 = { ...s.bonuses, [by]: { ...s.bonuses[by], rain: 0 } };
      applyShots(s, by, cells, { kind: "rain", bonuses: bonuses2 });
    } else {
      if (s.shots[target][r][c]) return;
      applyShots(s, by, [[r, c]], { kind: "shot" });
    }
  }

  // Résolution partagée : liste de cases, un seul lastShot agrégé.
  function applyShots(s, by, cellList, o) {
    o = o || {};
    const target = by === s.p1.id ? s.p2.id : s.p1.id;
    let grid = s.shots[target];
    const resolved = [];
    let anyHit = false, allSunk = false;
    for (const [r, c] of cellList) {
      const res = resolveFire(s.boards[target], grid, r, c);
      if (res.already) continue;
      grid = res.shots;
      if (res.result === "hit") anyHit = true;
      if (res.allSunk) allSunk = true;
      resolved.push({ r, c, result: res.result, sunkId: res.sunk ? res.shipId : null });
    }
    if (!resolved.length) return;
    const shots2 = { ...s.shots, [target]: grid };
    const bonuses2 = o.bonuses || s.bonuses;
    const key = Date.now() + "-" + Math.random().toString(36).slice(2, 6);
    const ls = { key, by, target, kind: o.kind || "shot", center: o.center || null, cells: resolved, timeout: !!o.timeout };
    if (allSunk) {
      const scores2 = { ...s.scores, [by]: (s.scores[by] || 0) + 1 };
      clearTimeout(turnTimerRef.current); clearTimeout(botTimerRef.current);
      broadcast({ sub: "combat", p1: s.p1, p2: s.p2, boards: s.boards, ready: s.ready, shots: shots2,
        turn: by, winner: by, scores: scores2, bonuses: bonuses2, placeDeadline: null, turnDeadline: null, lastShot: ls });
      return;
    }
    const nextTurn = (anyHit && !o.timeout) ? by : target;
    const dl = Date.now() + TURN_MS;
    broadcast({ sub: "combat", p1: s.p1, p2: s.p2, boards: s.boards, ready: s.ready, shots: shots2,
      turn: nextTurn, winner: null, scores: s.scores, bonuses: bonuses2, placeDeadline: null, turnDeadline: dl, lastShot: ls });
    armTurnTimer(dl);
  }

  // ---- bot : l'hôte joue pour lui quand c'est son tour ----
  function seatTurnIsBot(s) {
    const seat = s.turn === s.p1?.id ? s.p1 : (s.turn === s.p2?.id ? s.p2 : null);
    return !!(seat && seat.isBot);
  }
  function maybeScheduleBot(s) {
    clearTimeout(botTimerRef.current);
    if (!isHost || s.winner || s.sub !== "combat") return;
    if (!seatTurnIsBot(s)) return;
    botTimerRef.current = setTimeout(botFire, BOT_SHOT_DELAY);
  }
  function botFire() {
    const s = stateRef.current;
    if (s.winner || s.sub !== "combat" || !seatTurnIsBot(s)) return;
    const by = s.turn;
    const target = by === s.p1.id ? s.p2.id : s.p1.id;
    const rc = decideBotShot(s.boards[target], s.shots[target], { difficulty: s.botDifficulty || NAVAL_DEFAULT_DIFFICULTY });
    if (!rc) return;
    applyShots(s, by, [[rc[0], rc[1]]], { kind: "shot" });
  }

  function armTurnTimer(deadline) {
    clearTimeout(turnTimerRef.current);
    if (!isHost || !deadline) return;
    turnTimerRef.current = setTimeout(() => {
      const s = stateRef.current;
      if (s.winner || s.sub !== "combat") return;
      const by = s.turn;
      const target = by === s.p1.id ? s.p2.id : s.p1.id;
      const rc = randomShot(s.shots[target]);
      if (!rc) return;
      applyShots(s, by, [[rc[0], rc[1]]], { kind: "shot", timeout: true });
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

  function startSolo() {
    if (!channelReady || autoStartedRef.current || players.length !== 1) return;
    autoStartedRef.current = true;
    const a = players[0];
    const human = { id: a.profile_id, username: a.profiles?.username, avatar: a.profiles?.avatar, isBot: false };
    const bot = makeBotSeat();
    const [first, second] = Math.random() < 0.5 ? [human, bot] : [bot, human];
    channelRef.current.send({ type: "broadcast", event: "match_start",
      payload: { p1: first, p2: second, placeDeadline: Date.now() + PLACE_MS, scores: { [human.id]: 0, [bot.id]: 0 }, botDifficulty } });
  }

  function rejouer() {
    if (!isHost || !p1 || !p2) return;
    const [first, second] = Math.random() < 0.5 ? [p1, p2] : [p2, p1];
    channelRef.current.send({ type: "broadcast", event: "match_start",
      payload: { p1: first, p2: second, placeDeadline: Date.now() + PLACE_MS, scores, botDifficulty } });
  }
  async function backToRoom() { await resetRoomToLobby(room.id); onFinish && onFinish(); }

  useEffect(() => {
    if (!winner || savedResultRef.current || !p1 || !p2) return;
    const isPlayerNow = me.id === p1.id || me.id === p2.id;
    if (!isPlayerNow) return;
    savedResultRef.current = true;
    const won = winner === me.id;
    setMyWin(won);
    if (won) playGameWin(); else playGameLose();
    recordMatchResult(room.id, won);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

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

  // ================= FX (clients) =================
  function spawnFx(target, r, c, kind, big) {
    const id = "fx-" + (fxSeq.current++);
    const setter = target === "enemy" ? setFxEnemy : setFxOwn;
    setter(prev => [...prev, { id, r, c, kind, big: !!big }]);
    const tm = setTimeout(() => setter(prev => prev.filter(f => f.id !== id)), 950);
    timeouts.current.push(tm);
  }
  // un tir "par moi" frappe le plateau ENNEMI ; sinon MON plateau
  function playShotFx(ls) {
    const side = (ls.by === me.id) ? "enemy" : "own";
    const doCell = (cell, delay) => {
      const tm = setTimeout(() => {
        if (cell.result === "hit") { playDynamite(); spawnFx(side, cell.r, cell.c, "boom", ls.kind !== "shot"); if (cell.sunkId) playNavalSink(); }
        else if (cell.result === "miss") { playNavalSplash(); spawnFx(side, cell.r, cell.c, "splash"); }
      }, delay);
      timeouts.current.push(tm);
    };
    if (ls.kind === "missile") {
      playNavalWhistle();
      const cr = ls.center ? ls.center[0] : ls.cells[0].r, cc = ls.center ? ls.center[1] : ls.cells[0].c;
      spawnFx(side, cr, cc, "missile", true);
      const bigBoom = setTimeout(() => spawnFx(side, cr, cc, "boom", true), 500);
      timeouts.current.push(bigBoom);
      ls.cells.forEach((cell, i) => doCell(cell, 560 + i * 80));
    } else if (ls.kind === "rain") {
      playNavalWhistle();
      ls.cells.forEach((cell, i) => {
        const tm = setTimeout(() => spawnFx(side, cell.r, cell.c, "missile", false), i * 300);
        timeouts.current.push(tm);
        doCell(cell, i * 300 + 480);
      });
    } else {
      ls.cells.forEach(cell => doCell(cell, 0));
    }
  }

  // ================= PLACEMENT (drag & drop) =================
  const placedIds = useMemo(() => new Set(myPlacements.map(p => p.id)), [myPlacements]);
  function occSetLocal(exceptId) {
    const s = new Set();
    for (const p of myPlacements) {
      if (p.id === exceptId) continue;
      for (const [rr, cc] of shipCells(p.id, p.r, p.c, p.horiz)) s.add(rr + "," + cc);
    }
    return s;
  }
  function fitsLocal(id, r, c, horiz, exceptId) {
    const [rows, cols] = dims(id, horiz);
    if (r < 0 || c < 0 || r + rows > N || c + cols > N) return false;
    const occ = occSetLocal(exceptId);
    for (let dr = 0; dr < rows; dr++) for (let dc = 0; dc < cols; dc++) if (occ.has((r + dr) + "," + (c + dc))) return false;
    return true;
  }
  function rcFromPoint(clientX, clientY, boardEl, mode) {
    if (!boardEl) return null;
    const svg = boardEl.querySelector("svg.naval-svg");
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    try {
      const pt = svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
      const q = pt.matrixTransform(svg.getScreenCTM().inverse());
      const u = mode === "iso" ? 34 : 40, K = 0.70711, M = 0.40558, MG = 0.5 * u;
      if (mode === "iso") { const sx = q.x / (K * u), d = q.y / (M * u); return [(sx + d) / 2, (sx - d) / 2]; }
      return [(q.y - MG) / u, (q.x - MG) / u];
    } catch (e) { return null; }
  }
  function startDrag(id, e, fromBoard) {
    if (submitted) return;
    if (e.preventDefault) e.preventDefault();
    let horiz = oris[id] != null ? oris[id] : true;
    if (fromBoard) {
      const cur = myPlacements.find(p => p.id === id);
      if (cur) horiz = cur.horiz;
      setMyPlacements(prev => prev.filter(p => p.id !== id));
    }
    const d = { id, horiz, r: -1, c: -1, valid: false };
    dragRef.current = d; setDrag(d);
    setDragPos({ x: e.clientX, y: e.clientY });
    // Capture du pointeur sur le plateau (élément STABLE, jamais démonté) :
    // au doigt (tablette/smartphone), les pointermove/up continuent d'arriver
    // même quand on déplace un navire DÉJÀ posé — son <g> est retiré du DOM au
    // pointerdown, ce qui, sans capture explicite, pouvait couper le suivi du
    // drag sur mobile (capture implicite perdue avec l'élément retiré).
    if (e.pointerId != null && setupBoardRef.current) {
      try { setupBoardRef.current.setPointerCapture(e.pointerId); dragRef.current.pointerId = e.pointerId; } catch (err) {}
    }
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragUp, { once: true });
  }
  function onDragMove(e) {
    setDragPos({ x: e.clientX, y: e.clientY });
    const d = dragRef.current; if (!d) return;
    const rc = rcFromPoint(e.clientX, e.clientY, setupBoardRef.current, view);
    if (!rc) { const nd = { ...d, valid: false, r: -1, c: -1 }; dragRef.current = nd; setDrag(nd); return; }
    const [rows, cols] = dims(d.id, d.horiz);
    const r = Math.round(rc[0] - rows / 2), c = Math.round(rc[1] - cols / 2);
    const valid = fitsLocal(d.id, r, c, d.horiz, d.id);
    const nd = { ...d, r, c, valid };
    dragRef.current = nd; setDrag(nd);
  }
  function onDragUp() {
    window.removeEventListener("pointermove", onDragMove);
    const d = dragRef.current;
    if (d && d.pointerId != null && setupBoardRef.current) {
      try { setupBoardRef.current.releasePointerCapture(d.pointerId); } catch (err) {}
    }
    if (d && d.valid) {
      setMyPlacements(prev => [...prev.filter(p => p.id !== d.id), { id: d.id, r: d.r, c: d.c, horiz: d.horiz }]);
      setOris(o => ({ ...o, [d.id]: d.horiz }));
      playTokenDrop();
    }
    dragRef.current = null; setDrag(null); setDragPos(null);
  }
  function rotateShip(id) {
    if (submitted) return;
    const p = myPlacements.find(x => x.id === id); if (!p) return;
    const [rows0, cols0] = dims(id, p.horiz);
    const cr = p.r + rows0 / 2, cc = p.c + cols0 / 2;
    const nh = !p.horiz;
    const [rows1, cols1] = dims(id, nh);
    let r1 = Math.round(cr - rows1 / 2), c1 = Math.round(cc - cols1 / 2);
    r1 = Math.max(0, Math.min(N - rows1, r1)); c1 = Math.max(0, Math.min(N - cols1, c1));
    if (fitsLocal(id, r1, c1, nh, id)) {
      setMyPlacements(prev => prev.map(x => x.id === id ? { id, r: r1, c: c1, horiz: nh } : x));
      setOris(o => ({ ...o, [id]: nh }));
      playTokenDrop();
    }
  }
  function autoPlaceMine() { if (submitted) return; const p = autoPlace(); if (p) { setMyPlacements(p); const o = {}; p.forEach(x => o[x.id] = x.horiz); setOris(o); playTokenDrop(); } }
  function resetPlacement() { if (!submitted) { setMyPlacements([]); setOris({}); } }
  function submitFleet() {
    if (submitted || !validPlacements(myPlacements)) return;
    setSubmitted(true);
    channelRef.current?.send({ type: "broadcast", event: "place_ready", payload: { by: me.id, placements: myPlacements } });
  }

  // ================= DÉRIVÉS =================
  const amP1 = !!(p1 && me.id === p1.id);
  const amP2 = !!(p2 && me.id === p2.id);
  const isPlayer = amP1 || amP2;
  const oppId = opponentId(me.id);
  const isMyTurn = sub === "combat" && !winner && turn === me.id;
  const needsPick = players.length > TABLE;
  const soloVsBot = !needsPick && players.length < TABLE;
  const placeLeft = placeDeadline ? Math.max(0, Math.ceil((placeDeadline - now) / 1000)) : null;
  const turnLeft = turnDeadline ? Math.max(0, Math.ceil((turnDeadline - now) / 1000)) : null;
  const myBonus = (bonuses && bonuses[me.id]) || { missile: 0, rain: 0 };

  // ---- données de plateau mémoïsées : évite de reconstruire le SVG entier
  // (dangerouslySetInnerHTML) à chaque tick de l'horloge (setInterval 250ms),
  // seule cause du clignotement et du "délai" ressenti au clic.
  const myBoardId = isPlayer ? me.id : p1?.id;
  const targetBoardId = isPlayer ? oppId : p2?.id;
  const myShotsRecv = shots[myBoardId];
  const enemyShotsRecv = shots[targetBoardId];
  const ownShips = useMemo(
    () => shipsForBoard(boards[myBoardId], myShotsRecv, false, false),
    [boards, myBoardId, myShotsRecv]
  );
  const enemyShips = useMemo(
    () => shipsForBoard(boards[targetBoardId], enemyShotsRecv, true, false),
    [boards, targetBoardId, enemyShotsRecv]
  );
  const setupShips = useMemo(
    () => shipsForBoard(myPlacements, null, false, !submitted),
    [myPlacements, submitted]
  );
  const placeBadges = useMemo(
    () => (!submitted ? myPlacements.map(p => ({ id: p.id, r: p.r, c: p.c, horiz: p.horiz, onRotate: rotateShip })) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [myPlacements, submitted]
  );
  const placeGhost = useMemo(() => {
    if (!(drag && drag.r >= 0)) return null;
    const [rows, cols] = dims(drag.id, drag.horiz);
    const cs = [];
    for (let dr = 0; dr < rows; dr++) for (let dc = 0; dc < cols; dc++) {
      const rr = drag.r + dr, cc = drag.c + dc;
      if (inB(rr, cc)) cs.push([rr, cc]);
    }
    return { cells: cs, ok: drag.valid };
  }, [drag]);

  // Specs mémoïsés des deux plateaux du combat (références stables : le SVG
  // accolé n'est reconstruit que quand l'état de jeu change vraiment, pas à
  // chaque tick d'horloge — même précaution que ownShips/enemyShips).
  const ownSpec = useMemo(
    () => ({ shots: myShotsRecv, ships: ownShips }),
    [myShotsRecv, ownShips]
  );
  const enemySpec = useMemo(
    () => ({ shots: enemyShotsRecv, ships: enemyShips, aim: isMyTurn, aoe: armed === "missile" ? aoeHover : null }),
    [enemyShotsRecv, enemyShips, isMyTurn, armed, aoeHover]
  );

  function fireAt(r, c) {
    if (!isMyTurn) return;
    const target = oppId;
    if (!shots[target] || shots[target][r][c]) return;
    if (armed === "missile") {
      if (myBonus.missile <= 0) return;
      setArmed(null); setAoeHover(null);
      channelRef.current?.send({ type: "broadcast", event: "fire_attempt", payload: { by: me.id, r, c, kind: "missile" } });
      return;
    }
    channelRef.current?.send({ type: "broadcast", event: "fire_attempt", payload: { by: me.id, r, c, kind: "shot" } });
  }
  function fireRain() {
    if (!isMyTurn || myBonus.rain <= 0) return;
    setArmed(null); setAoeHover(null);
    channelRef.current?.send({ type: "broadcast", event: "fire_attempt", payload: { by: me.id, kind: "rain" } });
  }
  function enemyHover(r, c) {
    if (armed !== "missile") { if (aoeHover) setAoeHover(null); return; }
    const cells = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (inB(rr, cc)) cells.push([rr, cc]);
    }
    setAoeHover(cells);
  }

  // navires à dessiner (dérivés des placements + tirs)
  function shipsForBoard(placements, shotsGrid, hideUnlessSunk, draggable) {
    if (!placements) return [];
    const out = [];
    for (const pl of placements) {
      const sunk = shotsGrid ? shipCells(pl.id, pl.r, pl.c, pl.horiz).every(([rr, cc]) => shotsGrid[rr] && shotsGrid[rr][cc] === "hit") : false;
      if (hideUnlessSunk && !sunk) continue;
      out.push({ id: pl.id, r: pl.r, c: pl.c, horiz: pl.horiz, wreck: sunk, drag: draggable && !sunk });
    }
    return out;
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

  // ================= RENDU =================
  let content;
  if (phase === "intro") {
    if (soloVsBot) {
      content = isHost ? (
        <div>
          <p className="hint">{t("navalSoloHint")}</p>
          <div className="naval-diff-row">
            {NAVAL_DIFFICULTIES.map(d => {
              const on = botDifficulty === d;
              return (
                <button key={d} className={"naval-diff-btn" + (on ? " on" : "")} aria-pressed={on} onClick={() => setBotDifficulty(d)}>
                  <span className="naval-diff-icon">{DIFF_META[d].icon}</span>{t(DIFF_META[d].key)}
                </button>
              );
            })}
          </div>
          <button className="btn" disabled={!channelReady} onClick={startSolo}>🤖 {t("navalStartBot")}</button>
        </div>
      ) : <p className="muted">{t("navalStarting")}</p>;
    }
    else if (players.length < 2) content = <p className="muted">{t("navalNotEnough")}</p>;
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
    const viewToggle = (
      <div className="naval-topbar">
        <div className="naval-scoreline">
          <span className={"naval-pchip" + (turn === p1?.id && sub === "combat" && !winner ? " active" : "")}>
            <span className="av">{p1?.avatar}</span>{p1?.username}
            {p1?.isBot && DIFF_META[botDifficulty] && <span className={"naval-bot-diff " + botDifficulty}>{DIFF_META[botDifficulty].icon}</span>}
            <b>{scores[p1?.id] || 0}</b>
          </span>
          <span className="naval-vs">{t("navalVs")}</span>
          <span className={"naval-pchip" + (turn === p2?.id && sub === "combat" && !winner ? " active" : "")}>
            <span className="av">{p2?.avatar}</span>{p2?.username}
            {p2?.isBot && DIFF_META[botDifficulty] && <span className={"naval-bot-diff " + botDifficulty}>{DIFF_META[botDifficulty].icon}</span>}
            <b>{scores[p2?.id] || 0}</b>
          </span>
        </div>
        <button className="naval-view-btn" onClick={toggleView} title={t("navalViewToggle")}>
          {view === "2d" ? "◱ 3D" : "▦ 2D"}
        </button>
      </div>
    );

    if (sub === "place" && isPlayer) {
      const ready1 = ready[p1?.id], ready2 = ready[p2?.id];
      const badges = placeBadges;
      const ghost = placeGhost;
      content = (
        <div>
          {viewToggle}
          <p className="naval-status">
            {submitted ? t("navalWaitOpponentPlace") : t("navalPlacePrompt")}
            {placeLeft != null && <span className={"naval-timer" + (placeLeft <= 6 ? " hot" : "")}>0:{String(placeLeft).padStart(2, "0")}</span>}
          </p>
          <div className={"naval-arena placing view-" + view}>
            <div className="naval-board-wrap">
              <p className="naval-board-title">{t("navalYourFleet")}</p>
              <NavalBoard mode={view} edge="own" u={view === "iso" ? 34 : 40} headroom={150}
                shots={null} ships={setupShips} ghost={ghost} aim={false} idSalt="setup"
                boardRef={setupBoardRef} badges={badges}
                onShipPointerDown={(sid, e) => startDrag(sid, e, true)} />
            </div>
            {!submitted && (
              <div className="naval-tray">
                <p className="naval-tray-title">{t("navalPlaceShips")}</p>
                {FLEET_ORDER.map(id => {
                  const s = shipDef(id);
                  const done = placedIds.has(id);
                  return (
                    <div key={id} className={"naval-tray-ship" + (done ? " gone" : "")}
                      onPointerDown={(e) => { if (!done) startDrag(id, e, false); }}>
                      <span className="naval-tray-thumb" dangerouslySetInnerHTML={{ __html: topSpriteSVG(id, id === "carrier" ? 13 : 16, false, false) }} />
                      <span className="nm">{t(s.nameKey)}<em>{s.len}{s.beam > 1 ? "×" + s.beam : ""} {t("navalCells")}</em></span>
                    </div>
                  );
                })}
                <div className="naval-tray-btns">
                  <button className="btn" onClick={autoPlaceMine}>🎲 {t("navalAuto")}</button>
                  <button className="btn ghost" onClick={resetPlacement}>↺ {t("navalReset")}</button>
                </div>
                <button className="btn naval-done-btn" disabled={!validPlacements(myPlacements)} onClick={submitFleet} style={{ width: "100%" }}>
                  ✓ {t("navalDone")}
                </button>
                <p className="naval-tray-hint">{t("navalDragHint")}</p>
              </div>
            )}
          </div>
          <p className="naval-place-progress">
            {(ready1 ? "✓" : "…") + " " + (p1?.username || "")} &nbsp;·&nbsp; {(ready2 ? "✓" : "…") + " " + (p2?.username || "")}
          </p>
        </div>
      );
    } else {
      const iWon = winner && winner === me.id;
      const targetForMe = targetBoardId;
      const myBoard = myBoardId;
      const enemyShots = enemyShotsRecv;
      content = (
        <div style={{ position: "relative" }}>
          {viewToggle}
          <p className="naval-status">
            {winner
              ? (isPlayer ? (iWon ? "🏆 " + t("navalWinYou") : "☠️ " + t("navalWinOpponent")) : `${playerObj(winner)?.username} ${t("navalWinSpectator")}`)
              : isMyTurn ? "🎯 " + t("navalYourTurn")
              : `${t("navalWaitingFor")} ${playerObj(turn)?.username || ""}…`}
            {!winner && turnLeft != null && isPlayer && <span className={"naval-timer" + (turnLeft <= 6 ? " hot" : "")}>0:{String(turnLeft).padStart(2, "0")}</span>}
          </p>
          {view === "iso" ? (
            /* ISO : disposition "vidéo de référence" — les DEUX grilles dans un
               seul scène accolé (ennemi en haut-gauche, notre flotte en
               bas-droite, même bord partagé en diagonale). Borné en hauteur
               (sceneMaxH) => zéro scroll paysage ; profite de toute la largeur
               du mode agrandi. */
            <div className="naval-arena-duo view-iso">
              <div className="naval-duo-labels">
                <span className="naval-duo-lbl enemy"><b className="naval-enemy-lbl">{isPlayer ? t("navalEnemyWaters") : (p2?.username || "")}</b></span>
                <span className="naval-duo-lbl own">{isPlayer ? t("navalYourFleet") : (p1?.username || "")}</span>
              </div>
              <div className="naval-duo-scene" ref={sceneWrapRef}>
                <DualBoard mode="iso" u={30} headroom={16} gap={0.6} maxH={sceneMaxH}
                  own={ownSpec} enemy={enemySpec} fxOwn={fxOwn} fxEnemy={fxEnemy}
                  onCellClick={(side, r, c) => { if (side === "enemy" && isMyTurn) fireAt(r, c); }}
                  onCellHover={(side, r, c) => { if (side === "enemy" && isMyTurn) enemyHover(r, c); else if (aoeHover) setAoeHover(null); }}
                  onCellLeave={() => { if (aoeHover) setAoeHover(null); }} />
              </div>
              <div className="naval-rosters">
                {renderRoster(boards[targetForMe], enemyShots, t("navalEnemyShips"))}
                {renderRoster(boards[myBoard], myShotsRecv, t("navalYourShips"))}
              </div>
            </div>
          ) : (
            /* 2D : grille ADVERSE (celle qu'on attaque) en GRAND au centre,
               notre propre grille en PETIT sur le côté. Mêmes animations (chaque
               plateau garde son overlay FX). Le grand plateau est borné pour
               tenir en hauteur sans scroll. */
            <div className="naval-arena-2d">
              <div className="naval-2d-main">
                <p className="naval-board-title"><b className="naval-enemy-lbl">{isPlayer ? t("navalEnemyWaters") : (p2?.username || "")}</b></p>
                <div className="naval-2d-boardbox" ref={sceneWrapRef}
                  style={sceneMaxH ? { maxWidth: sceneMaxH } : undefined}>
                  <NavalBoard mode="2d" edge="enemy" u={40} headroom={12}
                    shots={enemyShots} ships={enemyShips} aim={isMyTurn} aoe={armed === "missile" ? aoeHover : null}
                    idSalt="enemy2d" fx={fxEnemy}
                    onCellClick={isMyTurn ? fireAt : null}
                    onCellHover={isMyTurn ? enemyHover : null}
                    onCellLeave={() => { if (aoeHover) setAoeHover(null); }} />
                </div>
                {renderRoster(boards[targetForMe], enemyShots, t("navalEnemyShips"))}
              </div>
              <div className="naval-2d-mini">
                <p className="naval-board-title">{isPlayer ? t("navalYourFleet") : (p1?.username || "")}</p>
                <NavalBoard mode="2d" edge="own" u={34} headroom={10}
                  shots={myShotsRecv} ships={ownShips} aim={false} idSalt="own2d" fx={fxOwn} />
                {renderRoster(boards[myBoard], myShotsRecv, t("navalYourShips"))}
              </div>
            </div>
          )}
          {isPlayer && !winner && (
            <div className="naval-bonus-bar">
              <button className={"naval-bonus-btn" + (armed === "missile" ? " on" : "")} disabled={!isMyTurn || myBonus.missile <= 0}
                onClick={() => { if (myBonus.missile > 0) setArmed(a => a === "missile" ? null : "missile"); }}>
                🚀 {t("navalMissile")} <b>×{myBonus.missile}</b>
              </button>
              <button className="naval-bonus-btn" disabled={!isMyTurn || myBonus.rain <= 0} onClick={fireRain}>
                🌧 {t("navalRain")} <b>×{myBonus.rain}</b>
              </button>
              {armed === "missile" && <span className="naval-bonus-hint">{t("navalMissileArmed")}</span>}
            </div>
          )}
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
    <div className="panel naval-panel" ref={navalPanelRef} style={{ maxWidth: "min(1040px, 98vw)" }}>
      <h1>{t("navalTitle")}</h1>
      <Crossfade id={phase + "-" + sub + (winner ? "-over" : "")}>{content}</Crossfade>
      {drag && dragPos && (
        <div className="naval-drag-ghost" style={{ left: dragPos.x, top: dragPos.y }}>
          <span style={{ display: "inline-block", transform: drag.horiz ? "none" : "rotate(90deg)" }}
            dangerouslySetInnerHTML={{ __html: topSpriteSVG(drag.id, 15, false, false) }} />
        </div>
      )}
      {countingDown && phase === "playing" && (
        <GameCountdown variant="naval" onDone={() => setCountingDown(false)} />
      )}
    </div>
  );
}
