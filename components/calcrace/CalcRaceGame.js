"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby, recordMatchResult } from "@/lib/gameSync";
import { playAnswerRight, playGameWin, playGameLose } from "@/lib/sfx";
import Crossfade from "@/components/Crossfade";
import GameCountdown, { COUNTDOWN_MS } from "@/components/GameCountdown";
import { DIFFS, generateDeck, computeStep, targetDistance } from "./calcRaceEngine";

/* ==========================================================================
   Course de calcul mental (jeu n°20, 2026-07).

   Principe réseau, DÉLIBÉRÉMENT différent des jeux à tour ("host arbitre
   chaque coup") : ici l'hôte génère et diffuse UN SEUL paquet d'opérations
   commun à tous à "match_start" (mêmes opérations, même ordre pour tout le
   monde — course équitable, décision validée). Chaque client vérifie SES
   propres réponses EN LOCAL contre ce paquet (déjà connu de tous, comme le
   fait `good` dans QuizGame.js) : zéro aller-retour réseau par opération,
   donc zéro latence perçue à la validation — la leçon de la bataille navale
   (l'aller-retour hôte est la cause de la latence ressentie) est prise en
   compte dès la conception ici. Chaque bonne réponse diffuse juste sa
   nouvelle position ("progress") pour que les autres voient sa voiture
   avancer ; le premier à finir le paquet diffuse "finish", et l'HÔTE
   arbitre qui a fini en premier (garde anti-double-déclaration) puis
   diffuse "race_over" avec le classement — la manche s'arrête immédiatement
   dès ce premier franchissement (décision validée), sans attendre les
   autres.
   ========================================================================== */

const CAR_COLORS = ["#FF3B30", "#4ECDC4", "#FFD166", "#A78BFA", "#F783AC", "#4FD1FF", "#E07A5F", "#5FA83C", "#E8B75A", "#6FA8FF"];

function diffLabelKey(d) {
  return d === "easy" ? "diffEasy" : d === "hard" ? "diffHard" : "diffMedium";
}

// Voiture de F1 vue de dessus, en SVG pur (validé sur maquette) : nez
// pointu, ailerons avant/arrière, roues exposées. Couleur = couleur du
// joueur, tout le reste (roues, halo, ombre cockpit) reste sombre.
function F1Car({ color }) {
  return (
    <svg className="calcrace-car" viewBox="0 0 40 18" aria-hidden="true">
      <rect x="1" y="2" width="2.6" height="14" rx="1" fill="#141414" />
      <rect x="4" y="7" width="3" height="4" fill="#141414" />
      <circle cx="9" cy="2.4" r="2.4" fill="#141414" />
      <circle cx="9" cy="15.6" r="2.4" fill="#141414" />
      <path d="M6 9 L9 6.4 L20 5.8 Q26 5.8 29 7.6 L29 10.4 Q26 12.2 20 12.2 L9 11.6 Z" fill={color} />
      <path d="M14.5 6.9 Q17 4.6 19.5 6.9" stroke="#141414" strokeWidth="1" fill="none" opacity="0.75" />
      <ellipse cx="17" cy="9" rx="2.4" ry="1.8" fill="#141414" opacity="0.55" />
      <path d="M29 7.6 L38 9 L29 10.4 Z" fill={color} />
      <circle cx="27" cy="2.1" r="2.1" fill="#141414" />
      <circle cx="27" cy="15.9" r="2.1" fill="#141414" />
      <rect x="33" y="2.6" width="2.6" height="12.8" rx="1" fill="#141414" />
    </svg>
  );
}

// Confettis de fin de course (2026-07) : petit canvas en surimpression qui
// éclate une seule fois au montage, puis s'éteint. Isolé (son propre rAF) pour
// ne pas re-rendre l'écran de fin. Aucune dépendance ajoutée.
function Confetti() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    const parent = cv.parentElement;
    cv.width = Math.max(1, parent.clientWidth);
    cv.height = Math.max(1, parent.clientHeight);
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const cx = cv.width / 2, cy = cv.height * 0.30;
    const parts = [];
    for (let i = 0; i < 160; i++) {
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 7;
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4, g: 0.12 + Math.random() * 0.1, s: 4 + Math.random() * 5, rot: Math.random() * 6, vr: -0.2 + Math.random() * 0.4, c: CAR_COLORS[i % CAR_COLORS.length], life: 90 + Math.random() * 55 });
    }
    let raf;
    function step() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      let alive = false;
      parts.forEach(p => {
        if (p.life <= 0) return; alive = true; p.life--; p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 45)); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore();
      });
      if (alive) raf = requestAnimationFrame(step); else ctx.clearRect(0, 0, cv.width, cv.height);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="calcrace-confetti" aria-hidden="true" />;
}

// Chrono du mode solo, ISOLÉ dans son propre composant avec son propre
// setInterval local (piège de re-render identifié à la session 133, sur la
// bataille navale : un minuteur affiché qui tourne au niveau du composant
// PARENT re-rend tout à son rythme, y compris les voies/voitures qui n'ont
// pourtant pas changé). Ici le `setInterval` ne fait re-rendre QUE ce petit
// composant, jamais CalcRaceGame entier.
function ElapsedClock({ startAt, running }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(iv);
  }, [running]);
  const ms = Math.max(0, now - startAt);
  const totalCs = Math.floor(ms / 10);
  const mm = String(Math.floor(totalCs / 6000)).padStart(2, "0");
  const ss = String(Math.floor((totalCs % 6000) / 100)).padStart(2, "0");
  const cs = String(totalCs % 100).padStart(2, "0");
  return <span className="calcrace-timer">{mm}:{ss}.{cs}</span>;
}

export default function CalcRaceGame({ room, me, isHost, players, onFinish, t, lang }) {
  const isSolo = (players || []).length <= 1;

  const [phase, setPhase] = useState("intro"); // intro | countdown | racing | finished
  const [diff, setDiff] = useState("medium");
  const [deck, setDeck] = useState(null);
  const [opsTotal, setOpsTotal] = useState(0);
  const [racers, setRacers] = useState({}); // profile_id -> {username, avatar, index, progress, finished}
  const [winner, setWinner] = useState(null);
  const [standings, setStandings] = useState([]);
  const [myWin, setMyWin] = useState(false);
  const [answerVal, setAnswerVal] = useState("");
  const [flashKey, setFlashKey] = useState(0);

  const channelRef = useRef(null);
  const deckRef = useRef(null);
  const diffRef = useRef("medium");
  const myIndexRef = useRef(0);
  const myDistanceRef = useRef(0);
  const questionShownAtRef = useRef(0);
  const raceStartRef = useRef(0);
  const finishedFiredRef = useRef(false);
  const raceOverFiredRef = useRef(false);
  const playersRef = useRef(players);
  const racersRef = useRef({});
  const restoredRef = useRef(false);
  const lastDiffRef = useRef("medium");

  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { diffRef.current = diff; }, [diff]);

  function updateRacer(pid, patch) {
    setRacers(prev => {
      const next = { ...prev, [pid]: { ...(prev[pid] || {}), ...patch } };
      racersRef.current = next;
      return next;
    });
  }

  function persistState(state) {
    if (!isHost) return;
    saveGameState(room.id, "calcrace", state);
  }

  useEffect(() => {
    const ch = supabase.channel("calcrace_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "match_start" }, ({ payload }) => {
      deckRef.current = payload.deck;
      setDeck(payload.deck);
      setOpsTotal(payload.opsTotal);
      setDiff(payload.diff);
      diffRef.current = payload.diff;
      myIndexRef.current = 0;
      myDistanceRef.current = 0;
      finishedFiredRef.current = false;
      raceOverFiredRef.current = false;
      questionShownAtRef.current = 0;
      raceStartRef.current = 0;
      setAnswerVal("");
      setWinner(null);
      setStandings([]);
      setMyWin(false);
      const initRacers = {};
      (playersRef.current || []).forEach(p => {
        initRacers[p.profile_id] = { username: p.profiles?.username, avatar: p.profiles?.avatar, index: 0, progress: 0, finished: false };
      });
      racersRef.current = initRacers;
      setRacers(initRacers);
      setPhase("countdown");
    });

    ch.on("broadcast", { event: "progress" }, ({ payload }) => {
      updateRacer(payload.profile_id, { index: payload.index, progress: payload.progress });
    });

    ch.on("broadcast", { event: "finish" }, ({ payload }) => {
      updateRacer(payload.profile_id, { username: payload.username, avatar: payload.avatar, index: payload.index, progress: 1, finished: true });
      if (!isHost || raceOverFiredRef.current) return;
      raceOverFiredRef.current = true;
      const winnerInfo = { profile_id: payload.profile_id, username: payload.username, avatar: payload.avatar };
      const standingsList = Object.entries(racersRef.current)
        .map(([pid, r]) => ({ profile_id: pid, username: r.username, avatar: r.avatar, progress: r.progress || 0, index: r.index || 0 }))
        .sort((a, b) => (b.progress - a.progress) || (b.index - a.index));
      channelRef.current.send({ type: "broadcast", event: "race_over", payload: { winner: winnerInfo, standings: standingsList } });
      persistState({ phase: "finished", diff: diffRef.current, winner: winnerInfo, standings: standingsList });
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
      const saved = readGameState(room, "calcrace");
      if (!saved) return;
      if (saved.phase === "finished" && saved.winner) {
        setWinner(saved.winner);
        setStandings(saved.standings || []);
        setMyWin(saved.winner.profile_id === me.id);
        setPhase("finished");
      } else if (saved.phase === "racing" && saved.deck) {
        // Reprise après rechargement : le paquet partagé est restauré, mais
        // la progression PERSONNELLE (privée à chaque client) repart à zéro
        // — compromis assumé, identique à celui documenté dans gameSync.js
        // pour les jeux à progression non partagée.
        deckRef.current = saved.deck;
        diffRef.current = saved.diff || "medium";
        setDiff(saved.diff || "medium");
        setDeck(saved.deck);
        setOpsTotal(saved.deck.length);
        myIndexRef.current = 0;
        myDistanceRef.current = 0;
        finishedFiredRef.current = false;
        const initRacers = {};
        (playersRef.current || []).forEach(p => {
          initRacers[p.profile_id] = { username: p.profiles?.username, avatar: p.profiles?.avatar, index: 0, progress: 0, finished: false };
        });
        racersRef.current = initRacers;
        setRacers(initRacers);
        questionShownAtRef.current = Date.now();
        raceStartRef.current = Date.now();
        setPhase("racing");
      }
    });

    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  function hostStart(diffId) {
    if (!isHost || !channelRef.current) return;
    lastDiffRef.current = diffId;
    const newDeck = generateDeck(diffId);
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: { deck: newDeck, diff: diffId, opsTotal: newDeck.length } });
    persistState({ phase: "racing", diff: diffId, deck: newDeck });
  }

  function rejouer() {
    if (!isHost) return;
    hostStart(lastDiffRef.current);
  }

  async function backToRoom() {
    await resetRoomToLobby(room.id);
    onFinish && onFinish();
  }

  function checkAnswer(raw) {
    if (phase !== "racing") return;
    const v = raw.trim();
    if (v === "") return;
    const op = deckRef.current?.[myIndexRef.current];
    if (!op) return;
    if (Number(v) !== op.answer) return;
    const responseTime = Date.now() - (questionShownAtRef.current || Date.now());
    const step = computeStep(responseTime);
    myDistanceRef.current += step;
    myIndexRef.current += 1;
    const total = deckRef.current.length;
    const finished = myIndexRef.current >= total;
    const progress = finished ? 1 : Math.min(1, myDistanceRef.current / targetDistance(diffRef.current));
    updateRacer(me.id, { username: me.username, avatar: me.avatar, index: myIndexRef.current, progress, finished });
    setAnswerVal("");
    setFlashKey(k => k + 1);
    playAnswerRight();
    questionShownAtRef.current = Date.now();
    if (finished) {
      if (!finishedFiredRef.current) {
        finishedFiredRef.current = true;
        channelRef.current?.send({
          type: "broadcast", event: "finish",
          payload: { profile_id: me.id, username: me.username, avatar: me.avatar, index: myIndexRef.current, finishTimeMs: Date.now() - (raceStartRef.current || Date.now()) },
        });
      }
    } else {
      channelRef.current?.send({ type: "broadcast", event: "progress", payload: { profile_id: me.id, index: myIndexRef.current, progress } });
    }
  }

  const myRacer = racers[me.id] || { index: 0, progress: 0 };
  const myIdx = myRacer.index || 0;
  const laneCount = Math.max(1, Math.min(10, (players || []).length));
  const phaseKey = phase === "intro" ? "intro" : phase === "finished" ? "finished" : "race";

  return (
    <div className="panel calcrace-panel" style={{ maxWidth: "min(760px, 94vw)" }}>
      <h1>{t("calcraceTitle")}</h1>
      <Crossfade id={phaseKey}>
        {phase === "intro" && (
          isHost ? (
            <div className="calcrace-intro">
              <p className="hint">{isSolo ? t("calcraceSoloHint") : t("calcraceMultiHint")}</p>
              <div className="calcrace-diff-group">
                {DIFFS.map(d => (
                  <button
                    key={d}
                    type="button"
                    className={"calcrace-diff-btn" + (diff === d ? " on" : "")}
                    onClick={() => setDiff(d)}
                  >
                    {t(diffLabelKey(d))}
                  </button>
                ))}
              </div>
              <button className="btn" onClick={() => hostStart(diff)}>
                {isSolo ? t("calcraceStartSolo") : t("calcraceStartMulti")}
              </button>
            </div>
          ) : (
            <p className="hint">{t("calcraceWaitHost")}</p>
          )
        )}

        {(phase === "countdown" || phase === "racing") && (
          <div className="calcrace-stage">
            {phase === "countdown" && (
              <GameCountdown
                variant="calcrace"
                onDone={() => {
                  questionShownAtRef.current = Date.now();
                  raceStartRef.current = Date.now();
                  setPhase("racing");
                }}
              />
            )}
            {isSolo ? (
              <div className="calcrace-lanes calcrace-lanes-1">
                {phase === "racing" && (
                  <ElapsedClock startAt={raceStartRef.current || Date.now()} running={phase === "racing"} />
                )}
                <div className="calcrace-lane calcrace-lane-solo">
                  <div className="calcrace-track">
                    <div className="calcrace-centerline" />
                    <div className="calcrace-progress">{myIdx}/{opsTotal}</div>
                    <div className="calcrace-finish" />
                    <div className="calcrace-car-wrap" style={{ "--p": (myRacer.progress || 0).toFixed(3) }}>
                      <F1Car color={CAR_COLORS[0]} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={"calcrace-lanes calcrace-lanes-" + laneCount}>
                {(players || []).map((p, i) => {
                  const r = racers[p.profile_id] || { index: 0, progress: 0 };
                  return (
                    <div className="calcrace-lane" key={p.profile_id}>
                      <div className="calcrace-lane-tag">
                        <span className="calcrace-dot" style={{ background: CAR_COLORS[i % CAR_COLORS.length] }} />
                        <span className="calcrace-name">{p.profiles?.username}</span>
                      </div>
                      <div className="calcrace-track">
                        <div className="calcrace-centerline" />
                        <div className="calcrace-progress">{r.index || 0}/{opsTotal}</div>
                        <div className="calcrace-finish" />
                        <div className="calcrace-car-wrap" style={{ "--p": (r.progress || 0).toFixed(3) }}>
                          <F1Car color={CAR_COLORS[i % CAR_COLORS.length]} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {phase === "racing" && deck && deck[myIdx] && (
              <div className="calcrace-op-card">
                <div className="calcrace-op-expr" key={flashKey}>{deck[myIdx].expr}</div>
                <input
                  className="calcrace-op-input"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus
                  autoComplete="off"
                  value={answerVal}
                  onChange={e => { const v = e.target.value; setAnswerVal(v); checkAnswer(v); }}
                  placeholder="?"
                  aria-label={t("calcraceAnswerLabel")}
                />
              </div>
            )}
          </div>
        )}

        {phase === "finished" && (
          <div className="calcrace-finished">
            {/* Franchissement plus réaliste : ligne à damier, voiture du gagnant
                qui passe la ligne avec un léger zoom photo-finish, drapeau à
                damier agité, le tout saupoudré de confettis (2026-07). */}
            <div className="calcrace-fin-scene" aria-hidden="true">
              <div className="calcrace-fin-centerline" />
              <div className="calcrace-fin-line" />
              <div className="calcrace-fin-car">
                <F1Car color={(() => { const wi = (players || []).findIndex(p => p.profile_id === (winner && winner.profile_id)); return CAR_COLORS[(wi >= 0 ? wi : 0) % CAR_COLORS.length]; })()} />
              </div>
              <div className="calcrace-checkflag"><span /></div>
            </div>
            <Confetti />
            <p style={{ fontWeight: 800 }}>
              <span style={{ color: myWin ? "var(--ok)" : "#e05555" }}>
                {myWin ? t("calcraceWinBanner") : t("calcraceLoseBanner")}
              </span>
            </p>
            {!isSolo && (
              <ol className="calcrace-standings">
                {standings.map((s, i) => (
                  <li key={s.profile_id} className={winner && s.profile_id === winner.profile_id ? "win" : ""}>
                    <span>{i + 1}. {s.avatar} {s.username}</span>
                    <span className="calcrace-standings-ops">{s.index}/{opsTotal}</span>
                  </li>
                ))}
              </ol>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
              {isHost ? (
                <button className="btn" onClick={rejouer}>{t("calcraceRejouer")}</button>
              ) : (
                <p className="hint">{t("calcraceRejouerWait")}</p>
              )}
              <button className="btn ghost" onClick={backToRoom}>{t("calcraceBackToRoom")}</button>
            </div>
          </div>
        )}
      </Crossfade>
    </div>
  );
}
