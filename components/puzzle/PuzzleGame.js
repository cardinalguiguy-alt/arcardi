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

const SCENE_W = 1000, SCENE_H = 640;
const BOARD_X = 50, BOARD_Y = 20, BOARD_W = 900, BOARD_H = 600;

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

  const channelRef = useRef(null);
  const boardSvgRef = useRef(null);
  const puzzleRef = useRef(null);
  const raceStartRef = useRef(0);
  const finishedFiredRef = useRef(false);
  const raceOverFiredRef = useRef(false);
  const playersRef = useRef(players);
  const racersRef = useRef({});
  const restoredRef = useRef(false);
  const lastSettingsRef = useRef({ imageId: IMAGE_BANK[0].id, pieceCount: 24 });

  useEffect(() => { playersRef.current = players; }, [players]);

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

  function hostStart(pickedImageId, pickedPieceCount) {
    if (!isHost || !channelRef.current) return;
    lastSettingsRef.current = { imageId: pickedImageId, pieceCount: pickedPieceCount };
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: { imageId: pickedImageId, pieceCount: pickedPieceCount } });
    persistState({ phase: "racing", imageId: pickedImageId, pieceCount: pickedPieceCount });
  }

  function rejouer() {
    if (!isHost) return;
    hostStart(lastSettingsRef.current.imageId, lastSettingsRef.current.pieceCount);
  }

  async function backToRoom() {
    await resetRoomToLobby(room.id);
    onFinish && onFinish();
  }

  // Construction impérative du plateau, une fois par entrée en course
  // (voir commentaire d'en-tête).
  useEffect(() => {
    if (phase !== "racing" || !boardSvgRef.current || !puzzleRef.current) return;
    const svg = boardSvgRef.current;
    const puzzle = puzzleRef.current;
    const { rows, cols, edges, pieces } = puzzle;
    const cellW = BOARD_W / cols, cellH = BOARD_H / rows;
    const bank = IMAGE_BANK.find(b => b.id === imageId) || IMAGE_BANK[0];
    const ns = "http://www.w3.org/2000/svg";
    const xlink = "http://www.w3.org/1999/xlink";
    const masterId = "pz-master-" + room.id;

    svg.innerHTML = "";
    const defs = document.createElementNS(ns, "defs");
    const artG = document.createElementNS(ns, "g");
    artG.setAttribute("id", masterId);
    artG.innerHTML = bank.render();
    defs.appendChild(artG);
    svg.appendChild(defs);

    // Image de référence, très pâle, visible sous les pièces pour se
    // repérer pendant l'assemblage (pratique courante des puzzles réels).
    const ghost = document.createElementNS(ns, "use");
    ghost.setAttributeNS(xlink, "href", "#" + masterId);
    ghost.setAttribute("href", "#" + masterId);
    ghost.setAttribute("transform", `translate(${BOARD_X},${BOARD_Y})`);
    ghost.setAttribute("class", "puzzle-ghost");
    svg.appendChild(ghost);

    const slotsLayer = document.createElementNS(ns, "g");
    const piecesLayer = document.createElementNS(ns, "g");
    svg.appendChild(slotsLayer);
    svg.appendChild(piecesLayer);

    raceStartRef.current = Date.now();
    setRaceStartAt(raceStartRef.current);
    let settled = 0;
    const total = pieces.length;

    pieces.forEach(({ r, c }) => {
      const homeX = BOARD_X + c * cellW, homeY = BOARD_Y + r * cellH;
      const d = piecePath(r, c, rows, cols, cellW, cellH, edges);

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

      const scatterX = Math.random() * (SCENE_W - cellW * 1.2);
      const scatterY = Math.random() * (SCENE_H - cellH * 1.2);

      const g = document.createElementNS(ns, "g");
      g.setAttribute("class", "puzzle-piece");
      g.setAttribute("transform", `translate(${(scatterX - homeX).toFixed(2)},${(scatterY - homeY).toFixed(2)})`);

      const pic = document.createElementNS(ns, "g");
      pic.setAttribute("clip-path", `url(#${clipId})`);
      const use = document.createElementNS(ns, "use");
      use.setAttributeNS(xlink, "href", "#" + masterId);
      use.setAttribute("href", "#" + masterId);
      use.setAttribute("transform", `translate(${BOARD_X},${BOARD_Y})`);
      pic.appendChild(use);
      g.appendChild(pic);

      const outline = document.createElementNS(ns, "path");
      outline.setAttribute("class", "puzzle-outline");
      outline.setAttribute("d", d);
      outline.setAttribute("transform", `translate(${homeX},${homeY})`);
      g.appendChild(outline);

      piecesLayer.appendChild(g);

      const piece = { homeX, homeY, curX: scatterX, curY: scatterY, settled: false };
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
        g.setAttribute("transform", `translate(${(piece.curX - piece.homeX).toFixed(2)},${(piece.curY - piece.homeY).toFixed(2)})`);
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
          playTokenDrop();

          // Surbrillance aux joints (demande de Guillaume) : contour
          // lumineux rejoué une fois via une classe animée CSS (aucun
          // minuteur JS de nettoyage requis pour l'animation elle-même,
          // seulement pour retirer l'élément du DOM une fois estompé).
          const glow = document.createElementNS(ns, "path");
          glow.setAttribute("class", "puzzle-snap-glow");
          glow.setAttribute("d", d);
          glow.setAttribute("transform", `translate(${homeX},${homeY})`);
          svg.appendChild(glow);
          setTimeout(() => glow.remove(), 750);

          settled += 1;
          setSolvedCount(settled);
          const progress = settled / total;
          if (settled >= total) {
            if (!finishedFiredRef.current) {
              finishedFiredRef.current = true;
              const timeMs = Date.now() - raceStartRef.current;
              channelRef.current?.send({
                type: "broadcast", event: "finish",
                payload: { profile_id: me.id, username: me.username, avatar: me.avatar, timeMs },
              });
            }
          } else {
            channelRef.current?.send({ type: "broadcast", event: "progress", payload: { profile_id: me.id, progress } });
          }
        }
      }
      g.addEventListener("pointerup", release);
      g.addEventListener("pointercancel", release);
    });

    return () => { svg.innerHTML = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, imageId, pieceCount, room.id, me.id]);

  const myProgress = totalPieces > 0 ? solvedCount / totalPieces : 0;
  const phaseKey = phase === "intro" ? "intro" : phase === "finished" ? "finished" : "race";

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
              <button className="btn" onClick={() => hostStart(imageId, pieceCount)}>
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
            <svg ref={boardSvgRef} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} className="puzzle-board" />
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
