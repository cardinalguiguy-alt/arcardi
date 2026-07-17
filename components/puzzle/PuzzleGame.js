"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby, recordMatchResult } from "@/lib/gameSync";
import { playGameWin, playGameLose, playTokenDrop } from "@/lib/sfx";
import Crossfade from "@/components/Crossfade";
import GameCountdown from "@/components/GameCountdown";
import { DIFF_LEVELS, generatePuzzle, piecePath, isSnap } from "./puzzleEngine";
import { IMAGE_BANK, PUZZLE_VIEWBOX } from "./puzzleArt";

/* ==========================================================================
   Puzzle Race (jeu n°21, 2026-07) — MODE COMPÉTITIF uniquement pour cette
   livraison (le mode collaboratif, avec verrouillage de pièce partagé, est
   prévu dans un prochain zip — découpage volontaire, voir le document de
   cadrage du jeu).

   Principe réseau, léger, dans l'esprit de la course de calcul mental :
   l'hôte diffuse juste {imageId, pieceCount} à "match_start" ; CHAQUE
   client construit ensuite SON PROPRE puzzle en local (son propre tirage
   de pattes, indépendant des autres) — l'équité de la course ne dépend
   que de l'image et du nombre de pièces, pas de la forme exacte des
   pattes. Chaque pièce posée correctement est vérifiée EN LOCAL (zéro
   aller-retour réseau par pièce), puis diffuse juste sa progression ; le
   premier paquet complet diffuse "finish", l'hôte arbitre le premier
   arrivé (garde anti-double-déclaration) et diffuse "race_over".

   Construction du plateau : VOLONTAIREMENT impérative (DOM SVG direct,
   comme la maquette validée), parce que le déplacement d'une pièce touche
   le DOM à chaque pointermove (60+ fois/seconde) — le faire passer par le
   state React re-rendrait tout le composant à ce rythme (piège de
   re-render déjà rencontré sur la bataille navale, session 133). Seule
   une pièce qui SE VERROUILLE déclenche un vrai setState (peu fréquent).
   ========================================================================== */

// Dimensions natives de l'illustration (PUZZLE_VIEWBOX = "0 0 900 600").
const ART_W = 900, ART_H = 600;

// Disposition ADAPTATIVE (2026-07) : le plateau et un BAC DE TRI cohabitent
// dans la scène SVG. En portrait le bac est en bas, en paysage il est à droite.
// Le plateau garde le ratio 3:2 de l'illustration ; les pièces gardent leur
// TAILLE PLATEAU en toute circonstance (le drag & drop n'est pas modifié), le
// bac est simplement dimensionné pour les accueillir (léger recouvrement en
// pile pour les grosses difficultés, ce que le shuffle aide à démêler).
function computeLayout(orientation) {
  const M = 20, GAP = 20, AR = ART_W / ART_H;
  if (orientation === "portrait") {
    const SCENE_W = 680;
    const bw = SCENE_W - 2 * M;         // 640
    const bh = bw / AR;                 // 426.7
    const th = 300;
    const SCENE_H = Math.round(M + bh + GAP + th + M);
    return { SCENE_W, SCENE_H, board: { x: M, y: M, w: bw, h: bh }, tray: { x: M, y: M + bh + GAP, w: bw, h: th } };
  }
  const SCENE_H = 480;
  const bh = SCENE_H - 2 * M;           // 440
  const bw = bh * AR;                   // 660
  const tw = 480;
  const SCENE_W = Math.round(M + bw + GAP + tw + M);
  return { SCENE_W, SCENE_H, board: { x: M, y: M, w: bw, h: bh }, tray: { x: M + bw + GAP, y: M, w: tw, h: bh } };
}

function formatMs(ms) {
  const totalCs = Math.floor(Math.max(0, ms) / 10);
  const mm = String(Math.floor(totalCs / 6000)).padStart(2, "0");
  const ss = String(Math.floor((totalCs % 6000) / 100)).padStart(2, "0");
  const cs = String(totalCs % 100).padStart(2, "0");
  return `${mm}:${ss}.${cs}`;
}

// Chrono isolé dans son propre composant (son propre setInterval local) :
// ne re-rend jamais le plateau lui-même, voir le commentaire d'en-tête.
function ElapsedClock({ startAt, running }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(iv);
  }, [running]);
  return <span className="puzzle-timer">{formatMs(now - startAt)}</span>;
}

function toSvgPoint(svg, evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function ImageThumb({ bank }) {
  return (
    <svg viewBox={PUZZLE_VIEWBOX} className="puzzle-thumb-svg" dangerouslySetInnerHTML={{ __html: bank.render() }} />
  );
}

export default function PuzzleGame({ room, me, isHost, players, onFinish, t, lang }) {
  const isSolo = (players || []).length <= 1;

  const [phase, setPhase] = useState("intro");
  const [imageId, setImageId] = useState(IMAGE_BANK[0].id);
  const [pieceCount, setPieceCount] = useState(24);
  const [racers, setRacers] = useState({});
  const [winner, setWinner] = useState(null);
  const [standings, setStandings] = useState([]);
  const [myWin, setMyWin] = useState(false);
  const [solvedCount, setSolvedCount] = useState(0);
  const [totalPieces, setTotalPieces] = useState(0);
  const [raceStartAt, setRaceStartAt] = useState(0);
  const [solved, setSolved] = useState(false);
  // Bonus "indice image" (2026-07) : l'image guide n'est PLUS affichée en fond
  // par défaut. L'hôte règle un nombre d'indices (0 à 5, défaut 2) au départ ;
  // en course, chaque joueur peut révéler l'image en fond pendant 15 s, dans la
  // limite de son quota (décompté localement, progression personnelle).
  const [imageBonus, setImageBonus] = useState(2); // réglage hôte
  const [bonusLeft, setBonusLeft] = useState(2);   // restant pour ce joueur
  const [guideOn, setGuideOn] = useState(false);   // révélation en cours
  const [orientation, setOrientation] = useState(() =>
    (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(orientation: portrait)").matches) ? "portrait" : "landscape"
  );

  const channelRef = useRef(null);
  const boardSvgRef = useRef(null);
  const puzzleRef = useRef(null);
  const settledRef = useRef(new Set());   // pièces posées, clés "r-c" (survit à un reflow d'orientation)
  const shuffleRef = useRef(() => {});     // mélange du bac, appelé par le bouton
  const solvedFiredRef = useRef(false);
  const raceStartRef = useRef(0);
  const finishedFiredRef = useRef(false);
  const raceOverFiredRef = useRef(false);
  const playersRef = useRef(players);
  const racersRef = useRef({});
  const restoredRef = useRef(false);
  const guideTimerRef = useRef(null);
  const lastSettingsRef = useRef({ imageId: IMAGE_BANK[0].id, pieceCount: 24, imageBonus: 2 });

  // Nettoyage du minuteur de révélation au démontage.
  useEffect(() => () => { if (guideTimerRef.current) clearTimeout(guideTimerRef.current); }, []);

  // Révèle l'image guide en fond pendant 15 s (consomme un indice).
  function revealGuide() {
    if (guideOn || bonusLeft <= 0) return;
    const svg = boardSvgRef.current;
    if (!svg) return;
    setBonusLeft(n => n - 1);
    setGuideOn(true);
    svg.classList.add("guide-on");
    if (guideTimerRef.current) clearTimeout(guideTimerRef.current);
    guideTimerRef.current = setTimeout(() => {
      const s = boardSvgRef.current;
      if (s) s.classList.remove("guide-on");
      setGuideOn(false);
      guideTimerRef.current = null;
    }, 15000);
  }

  useEffect(() => { playersRef.current = players; }, [players]);

  // Bascule portrait/paysage : on rebâtit le plateau au changement d'orientation
  // (la progression est préservée via settledRef).
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(orientation: portrait)");
    const onChange = () => setOrientation(mq.matches ? "portrait" : "landscape");
    mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", onChange) : mq.removeListener(onChange); };
  }, []);

  function updateRacer(pid, patch) {
    setRacers(prev => {
      const next = { ...prev, [pid]: { ...(prev[pid] || {}), ...patch } };
      racersRef.current = next;
      return next;
    });
  }

  function persistState(state) {
    if (!isHost) return;
    saveGameState(room.id, "puzzle", state);
  }

  useEffect(() => {
    const ch = supabase.channel("puzzle_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "match_start" }, ({ payload }) => {
      finishedFiredRef.current = false;
      raceOverFiredRef.current = false;
      setWinner(null);
      setStandings([]);
      setMyWin(false);
      setImageId(payload.imageId);
      setPieceCount(payload.pieceCount);
      // quota d'indices image pour ce joueur (défaut 2 si l'hôte n'en envoie pas)
      const nb = payload.imageBonus ?? 2;
      setBonusLeft(nb);
      setGuideOn(false);
      if (guideTimerRef.current) { clearTimeout(guideTimerRef.current); guideTimerRef.current = null; }
      const initRacers = {};
      (playersRef.current || []).forEach(p => {
        initRacers[p.profile_id] = { username: p.profiles?.username, avatar: p.profiles?.avatar, progress: 0, finished: false };
      });
      racersRef.current = initRacers;
      setRacers(initRacers);
      // Paquet PROPRE à ce client (voir commentaire d'en-tête) : seuls
      // l'image et le nombre de pièces viennent du réseau.
      const puzzle = generatePuzzle(payload.pieceCount);
      puzzleRef.current = puzzle;
      settledRef.current = new Set();
      raceStartRef.current = 0;
      solvedFiredRef.current = false;
      setSolved(false);
      setTotalPieces(puzzle.pieces.length);
      setSolvedCount(0);
      setPhase("countdown");
    });

    ch.on("broadcast", { event: "progress" }, ({ payload }) => {
      updateRacer(payload.profile_id, { progress: payload.progress });
    });

    ch.on("broadcast", { event: "finish" }, ({ payload }) => {
      updateRacer(payload.profile_id, { username: payload.username, avatar: payload.avatar, progress: 1, finished: true, timeMs: payload.timeMs });
      if (!isHost || raceOverFiredRef.current) return;
      raceOverFiredRef.current = true;
      const winnerInfo = { profile_id: payload.profile_id, username: payload.username, avatar: payload.avatar, timeMs: payload.timeMs };
      const standingsList = Object.entries(racersRef.current)
        .map(([pid, r]) => ({ profile_id: pid, username: r.username, avatar: r.avatar, progress: r.progress || 0, timeMs: r.timeMs }))
        .sort((a, b) => (b.progress - a.progress) || ((a.timeMs ?? Infinity) - (b.timeMs ?? Infinity)));
      channelRef.current.send({ type: "broadcast", event: "race_over", payload: { winner: winnerInfo, standings: standingsList } });
      persistState({ phase: "finished", winner: winnerInfo, standings: standingsList });
    });

    ch.on("broadcast", { event: "race_over" }, ({ payload }) => {
      setWinner(payload.winner);
      setStandings(payload.standings || []);
      setPhase("finished");
      const won = payload.winner.profile_id === me.id;
      setMyWin(won);
      if (won) playGameWin(); else playGameLose();
      if ((playersRef.current || []).length > 1) recordMatchResult(room.id, won);
    });

    ch.subscribe(status => {
      if (status !== "SUBSCRIBED" || restoredRef.current) return;
      restoredRef.current = true;
      const saved = readGameState(room, "puzzle");
      if (!saved) return;
      if (saved.phase === "finished" && saved.winner) {
        setWinner(saved.winner);
        setStandings(saved.standings || []);
        setMyWin(saved.winner.profile_id === me.id);
        setPhase("finished");
      }
      // Une manche interrompue en plein "racing" n'est pas restaurée telle
      // quelle (progression personnelle non partagée, voir gameSync.js) :
      // l'écran d'intro reste affiché, l'hôte peut relancer.
    });

    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  function hostStart(pickedImageId, pickedPieceCount, pickedImageBonus) {
    if (!isHost || !channelRef.current) return;
    const nb = pickedImageBonus ?? 2;
    lastSettingsRef.current = { imageId: pickedImageId, pieceCount: pickedPieceCount, imageBonus: nb };
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: { imageId: pickedImageId, pieceCount: pickedPieceCount, imageBonus: nb } });
    persistState({ phase: "racing", imageId: pickedImageId, pieceCount: pickedPieceCount, imageBonus: nb });
  }

  function rejouer() {
    if (!isHost) return;
    hostStart(lastSettingsRef.current.imageId, lastSettingsRef.current.pieceCount, lastSettingsRef.current.imageBonus);
  }

  async function backToRoom() {
    await resetRoomToLobby(room.id);
    onFinish && onFinish();
  }

  // Construction impérative du plateau. Rejouée à l'entrée en course ET au
  // changement d'orientation (la progression est préservée via settledRef —
  // voir commentaire d'en-tête pour le choix du DOM SVG direct).
  useEffect(() => {
    if (phase !== "racing" || !boardSvgRef.current || !puzzleRef.current) return;
    const svg = boardSvgRef.current;
    const puzzle = puzzleRef.current;
    const { rows, cols, edges, pieces } = puzzle;
    const layout = computeLayout(orientation);
    const board = layout.board, tray = layout.tray;
    const cellW = board.w / cols, cellH = board.h / rows;
    const sx = board.w / ART_W, sy = board.h / ART_H;                 // échelle image -> plateau
    const artTransform = `translate(${board.x},${board.y}) scale(${sx.toFixed(5)},${sy.toFixed(5)})`;
    const bank = IMAGE_BANK.find(b => b.id === imageId) || IMAGE_BANK[0];
    const ns = "http://www.w3.org/2000/svg";
    const xlink = "http://www.w3.org/1999/xlink";
    const masterId = "pz-master-" + room.id;
    const total = pieces.length;

    svg.setAttribute("viewBox", `0 0 ${layout.SCENE_W} ${layout.SCENE_H}`);
    svg.classList.remove("solved");
    svg.innerHTML = "";
    const defs = document.createElementNS(ns, "defs");
    const artG = document.createElementNS(ns, "g");
    artG.setAttribute("id", masterId);
    artG.innerHTML = bank.render();
    defs.appendChild(artG);
    svg.appendChild(defs);

    // Cadre du bac de tri (zone où se rangent les pièces non posées).
    const trayBg = document.createElementNS(ns, "rect");
    trayBg.setAttribute("class", "puzzle-tray-bg");
    trayBg.setAttribute("x", tray.x); trayBg.setAttribute("y", tray.y);
    trayBg.setAttribute("width", tray.w); trayBg.setAttribute("height", tray.h);
    trayBg.setAttribute("rx", 14);
    svg.appendChild(trayBg);

    // Cadre du plateau.
    const boardBg = document.createElementNS(ns, "rect");
    boardBg.setAttribute("class", "puzzle-board-bg");
    boardBg.setAttribute("x", board.x); boardBg.setAttribute("y", board.y);
    boardBg.setAttribute("width", board.w); boardBg.setAttribute("height", board.h);
    boardBg.setAttribute("rx", 8);
    svg.appendChild(boardBg);

    // Image de référence, très pâle, sous les pièces (repère d'assemblage).
    const ghost = document.createElementNS(ns, "use");
    ghost.setAttributeNS(xlink, "href", "#" + masterId);
    ghost.setAttribute("href", "#" + masterId);
    ghost.setAttribute("transform", artTransform);
    ghost.setAttribute("class", "puzzle-ghost");
    svg.appendChild(ghost);

    const slotsLayer = document.createElementNS(ns, "g");
    const piecesLayer = document.createElementNS(ns, "g");
    svg.appendChild(slotsLayer);
    svg.appendChild(piecesLayer);

    if (!raceStartRef.current) { raceStartRef.current = Date.now(); }
    setRaceStartAt(raceStartRef.current);

    // Répartition des pièces NON posées dans le bac (grille étalée, léger
    // recouvrement pour les grosses difficultés). `order` permet le shuffle.
    function trayPositions(count) {
      const tcols = Math.max(1, Math.floor(tray.w / (cellW * 0.8)));
      const trows = Math.max(1, Math.ceil(count / tcols));
      const spanX = tray.w - cellW, spanY = tray.h - cellH;
      const pos = [];
      for (let i = 0; i < count; i++) {
        const cc = i % tcols, rr = Math.floor(i / tcols);
        const jx = (Math.random() - 0.5) * cellW * 0.12, jy = (Math.random() - 0.5) * cellH * 0.12;
        pos.push({
          x: tray.x + (tcols > 1 ? cc * spanX / (tcols - 1) : spanX / 2) + jx,
          y: tray.y + (trows > 1 ? rr * spanY / (trows - 1) : spanY / 2) + jy,
        });
      }
      return pos;
    }

    const pieceObjs = [];   // pièces NON posées (pour le shuffle)

    function setPieceTransform(g, piece) {
      g.setAttribute("transform", `translate(${(piece.curX - piece.homeX).toFixed(2)},${(piece.curY - piece.homeY).toFixed(2)})`);
    }

    function doReveal() {
      if (solvedFiredRef.current) return;
      solvedFiredRef.current = true;
      svg.classList.add("solved");
      const reveal = document.createElementNS(ns, "use");
      reveal.setAttributeNS(xlink, "href", "#" + masterId);
      reveal.setAttribute("href", "#" + masterId);
      reveal.setAttribute("transform", artTransform);
      reveal.setAttribute("class", "puzzle-reveal");
      svg.appendChild(reveal);
      setSolved(true);
    }

    pieces.forEach(({ r, c }) => {
      const key = r + "-" + c;
      const homeX = board.x + c * cellW, homeY = board.y + r * cellH;
      const d = piecePath(r, c, rows, cols, cellW, cellH, edges);
      const wasSettled = settledRef.current.has(key);

      const slot = document.createElementNS(ns, "rect");
      slot.setAttribute("class", "puzzle-slot");
      slot.setAttribute("x", homeX); slot.setAttribute("y", homeY);
      slot.setAttribute("width", cellW); slot.setAttribute("height", cellH);
      slotsLayer.appendChild(slot);

      const clipId = `pz-clip-${room.id}-${r}-${c}`;
      const clip = document.createElementNS(ns, "clipPath");
      clip.setAttribute("id", clipId);
      const clipPathEl = document.createElementNS(ns, "path");
      clipPathEl.setAttribute("d", d);
      clipPathEl.setAttribute("transform", `translate(${homeX},${homeY})`);
      clip.appendChild(clipPathEl);
      defs.appendChild(clip);

      const g = document.createElementNS(ns, "g");
      g.setAttribute("class", "puzzle-piece" + (wasSettled ? " puzzle-settled" : ""));

      const pic = document.createElementNS(ns, "g");
      pic.setAttribute("clip-path", `url(#${clipId})`);
      const use = document.createElementNS(ns, "use");
      use.setAttributeNS(xlink, "href", "#" + masterId);
      use.setAttribute("href", "#" + masterId);
      use.setAttribute("transform", artTransform);
      pic.appendChild(use);
      g.appendChild(pic);

      const outline = document.createElementNS(ns, "path");
      outline.setAttribute("class", "puzzle-outline");
      outline.setAttribute("d", d);
      outline.setAttribute("transform", `translate(${homeX},${homeY})`);
      g.appendChild(outline);

      piecesLayer.appendChild(g);

      const piece = { homeX, homeY, curX: homeX, curY: homeY, settled: wasSettled, g };
      if (wasSettled) { setPieceTransform(g, piece); }   // reste à sa place (translate 0,0)
      else { pieceObjs.push(piece); }

      let dragging = false, offX = 0, offY = 0;
      g.addEventListener("pointerdown", e => {
        if (piece.settled) return;
        dragging = true;
        g.setPointerCapture(e.pointerId);
        g.classList.add("puzzle-dragging");
        piecesLayer.appendChild(g);
        const pt = toSvgPoint(svg, e);
        offX = pt.x - piece.curX; offY = pt.y - piece.curY;
      });
      g.addEventListener("pointermove", e => {
        if (!dragging) return;
        const pt = toSvgPoint(svg, e);
        piece.curX = pt.x - offX; piece.curY = pt.y - offY;
        setPieceTransform(g, piece);
      });
      function release() {
        if (!dragging) return;
        dragging = false;
        g.classList.remove("puzzle-dragging");
        const dx = piece.curX - piece.homeX, dy = piece.curY - piece.homeY;
        if (isSnap(dx, dy, cellW, cellH)) {
          piece.curX = piece.homeX; piece.curY = piece.homeY;
          g.setAttribute("transform", "translate(0,0)");
          piece.settled = true;
          g.classList.add("puzzle-settled");
          settledRef.current.add(key);
          playTokenDrop();

          const glow = document.createElementNS(ns, "path");
          glow.setAttribute("class", "puzzle-snap-glow");
          glow.setAttribute("d", d);
          glow.setAttribute("transform", `translate(${homeX},${homeY})`);
          svg.appendChild(glow);
          setTimeout(() => glow.remove(), 750);

          const settled = settledRef.current.size;
          setSolvedCount(settled);
          if (settled >= total) {
            doReveal();
            if (!finishedFiredRef.current) {
              finishedFiredRef.current = true;
              const timeMs = Date.now() - raceStartRef.current;
              channelRef.current?.send({
                type: "broadcast", event: "finish",
                payload: { profile_id: me.id, username: me.username, avatar: me.avatar, timeMs },
              });
            }
          } else {
            channelRef.current?.send({ type: "broadcast", event: "progress", payload: { profile_id: me.id, progress: settled / total } });
          }
        }
      }
      g.addEventListener("pointerup", release);
      g.addEventListener("pointercancel", release);
    });

    // Placement initial dans le bac (ordre mélangé) + exposition du shuffle.
    function layoutTray(order) {
      const pos = trayPositions(order.length);
      order.forEach((piece, i) => { piece.curX = pos[i].x; piece.curY = pos[i].y; setPieceTransform(piece.g, piece); piece.g.parentNode && piece.g.parentNode.appendChild(piece.g); });
    }
    function shuffleArr(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    layoutTray(shuffleArr(pieceObjs));
    shuffleRef.current = () => layoutTray(shuffleArr(pieceObjs.filter(p => !p.settled)));

    setSolvedCount(settledRef.current.size);
    if (settledRef.current.size >= total && total > 0) doReveal();

    return () => { shuffleRef.current = () => {}; svg.innerHTML = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, imageId, pieceCount, room.id, me.id, orientation]);

  const myProgress = totalPieces > 0 ? solvedCount / totalPieces : 0;
  const phaseKey = phase === "intro" ? "intro" : phase === "finished" ? "finished" : "race";
  const layout0 = computeLayout(orientation);

  return (
    <div className="panel puzzle-panel" style={{ maxWidth: "min(880px, 96vw)" }}>
      <h1>{t("puzzleTitle")}</h1>
      <Crossfade id={phaseKey}>
        {phase === "intro" && (
          isHost ? (
            <div className="puzzle-intro">
              <p className="hint">{isSolo ? t("puzzleSoloHint") : t("puzzleMultiHint")}</p>
              <div className="puzzle-thumb-row">
                {IMAGE_BANK.map(bank => (
                  <button
                    key={bank.id}
                    type="button"
                    className={"puzzle-thumb" + (imageId === bank.id ? " on" : "")}
                    onClick={() => setImageId(bank.id)}
                  >
                    <ImageThumb bank={bank} />
                    <span>{t(bank.nameKey)}</span>
                  </button>
                ))}
              </div>
              <div className="puzzle-diff-group">
                {DIFF_LEVELS.map(n => (
                  <button
                    key={n}
                    type="button"
                    className={"puzzle-diff-btn" + (pieceCount === n ? " on" : "")}
                    onClick={() => setPieceCount(n)}
                  >
                    {n} {t("puzzlePiecesLabel")}
                  </button>
                ))}
              </div>
              <div className="puzzle-bonus-group">
                <span className="puzzle-bonus-label">{t("puzzleBonusLabel")}</span>
                {[0, 1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={"puzzle-diff-btn" + (imageBonus === n ? " on" : "")}
                    onClick={() => setImageBonus(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button className="btn" onClick={() => hostStart(imageId, pieceCount, imageBonus)}>
                {t("puzzleStart")}
              </button>
            </div>
          ) : (
            <p className="hint">{t("puzzleWaitHost")}</p>
          )
        )}

        {(phase === "countdown" || phase === "racing") && (
          <div className="puzzle-stage">
            {phase === "countdown" && (
              <GameCountdown variant="puzzle" onDone={() => setPhase("racing")} />
            )}
            <div className="puzzle-hud">
              <span className="puzzle-progress-badge">{solvedCount}/{totalPieces}</span>
              {phase === "racing" && <ElapsedClock startAt={raceStartAt} running={phase === "racing"} />}
              {phase === "racing" && !solved && (
                <button type="button" className="puzzle-shuffle-btn" onClick={() => shuffleRef.current()}>
                  🔀 {t("puzzleShuffle")}
                </button>
              )}
              {phase === "racing" && !solved && (
                <button type="button" className="puzzle-guide-btn" disabled={bonusLeft <= 0 || guideOn} onClick={revealGuide}>
                  🖼️ {t("puzzleGuide")} <b>×{bonusLeft}</b>
                </button>
              )}
            </div>
            {!isSolo && (
              <div className="puzzle-leaderboard">
                {(players || []).map(p => {
                  const r = racers[p.profile_id] || { progress: 0 };
                  const pct = Math.round((r.progress || 0) * 100);
                  return (
                    <div className={"puzzle-lb-row" + (r.finished ? " done" : "")} key={p.profile_id}>
                      <span className="puzzle-lb-name">{p.profiles?.avatar} {p.profiles?.username}</span>
                      <span className="puzzle-lb-pct">{r.finished ? "🏁" : pct + "%"}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <svg ref={boardSvgRef} viewBox={`0 0 ${layout0.SCENE_W} ${layout0.SCENE_H}`} className="puzzle-board" />
          </div>
        )}

        {phase === "finished" && (
          <div className="puzzle-finished">
            <p style={{ fontWeight: 800 }}>
              <span style={{ color: myWin ? "var(--ok)" : "#e05555" }}>
                {myWin ? t("puzzleWinBanner") : t("puzzleLoseBanner")}
              </span>
            </p>
            {!isSolo && (
              <ol className="puzzle-standings">
                {standings.map((s, i) => (
                  <li key={s.profile_id} className={winner && s.profile_id === winner.profile_id ? "win" : ""}>
                    <span>{i + 1}. {s.avatar} {s.username}</span>
                    <span className="puzzle-standings-time">{s.timeMs != null ? formatMs(s.timeMs) : Math.round((s.progress || 0) * 100) + "%"}</span>
                  </li>
                ))}
              </ol>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
              {isHost ? (
                <button className="btn" onClick={rejouer}>{t("puzzleRejouer")}</button>
              ) : (
                <p className="hint">{t("puzzleRejouerWait")}</p>
              )}
              <button className="btn ghost" onClick={backToRoom}>{t("puzzleBackToRoom")}</button>
            </div>
          </div>
        )}
      </Crossfade>
    </div>
  );
}
