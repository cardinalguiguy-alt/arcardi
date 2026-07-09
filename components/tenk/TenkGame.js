"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby } from "@/lib/gameSync";
import Crossfade from "@/components/Crossfade";
import TenkDie from "./TenkDie";
import { DICE_COUNT, evaluateSelection, isFarkle } from "./scoring";
import { decideBotSelection, decideBotContinue } from "./botLogic";
import { playDiceShuffle, playConfirmChime, playFarkle, playHotDice, playGameWin, playGameLose } from "@/lib/sfx";

/* ==========================================================================
   10 000 (TENK) — jeu de dés au tour par tour, 2 à 4 joueurs, bots pour
   compléter la table (même écran de setup que Chromatik). Objectif de
   points configurable par l'hôte (5000 ou 10000, même écran que la cible
   de mandats du Président).

   Pattern réseau : hôte arbitre, identique à Yahtzee/Chromatik/Président.
   L'ALÉATOIRE (lancer de dés) n'existe que chez l'hôte — un client demande
   un lancer, l'hôte tire les valeurs et les diffuse via `state`.

   Toute la logique de score/validation vit dans ./scoring.js (pur,
   déterministe, couvert par le script d'audit PRNG exhaustif). Ce
   fichier-ci ne contient QUE l'orchestration réseau et l'affichage.

   Règle centrale demandée par le porteur de projet : le joueur choisit
   LUI-MÊME quels dés il met de côté parmi ce qui est valable — jamais de
   sélection automatique du meilleur score. Le bouton de confirmation
   n'est actif que si la sélection en cours est 100% valable (aucun dé
   "mort" dedans) ; le score correspondant s'affiche en direct.

   Bots : comme Chromatik/Président, l'hôte calcule leur coup et l'applique
   exactement comme un coup humain reçu par broadcast — un tour de bot est
   une CHAÎNE de plusieurs coups (lancer -> garder -> relancer/banquer),
   rejouée pas à pas via scheduleBots() après chaque nouvel état.
   ========================================================================== */

const GAME_ID = "tenk";
const BOT_AVATARS = ["🤖", "🦾", "👾"];

function makeBotSeat(n) {
  return { id: "bot" + n, username: "Bot " + n, avatar: BOT_AVATARS[(n - 1) % BOT_AVATARS.length], isBot: true };
}

function shuffleArr(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dealFreshState(seats, target) {
  return {
    seats,
    scores: Object.fromEntries(seats.map(s => [s.id, 0])),
    turnIdx: 0,
    activeDice: null,      // null = dés du tour pas encore lancés / en attente d'un nouveau lancer
    diceRemaining: DICE_COUNT,
    turnScore: 0,
    keptDice: [],          // valeurs déjà mises de côté CE tour (affichage seulement)
    finalRound: null,      // { triggeredBy, remaining: [seatId,...] } une fois la cible atteinte
    finished: false,
    winners: [],
    target,
    lastAction: null,
  };
}

export default function TenkGame({ room, me, isHost, players, t, lang, onFinish }) {
  const [phase, setPhase] = useState("intro"); // intro -> playing
  const [tableSize, setTableSize] = useState(null);
  const [pendingTarget, setPendingTarget] = useState(5000);
  const [targetConfirmed, setTargetConfirmed] = useState(false);
  const [picked, setPicked] = useState([]);

  const [seats, setSeats] = useState([]);
  const [scores, setScores] = useState({});
  const [turnIdx, setTurnIdx] = useState(0);
  const [activeDice, setActiveDice] = useState(null);
  const [diceRemaining, setDiceRemaining] = useState(DICE_COUNT);
  const [turnScore, setTurnScore] = useState(0);
  const [keptDice, setKeptDice] = useState([]);
  const [finalRound, setFinalRound] = useState(null);
  const [finished, setFinished] = useState(false);
  const [winners, setWinners] = useState([]);
  const [target, setTarget] = useState(5000);
  const [lastAction, setLastAction] = useState(null);

  const [selected, setSelected] = useState([]); // indices dans activeDice choisis pour la sélection en cours
  const [myGain, setMyGain] = useState(0);
  const [channelReady, setChannelReady] = useState(false);
  const [rollFlash, setRollFlash] = useState(false);
  const [banner, setBanner] = useState(null); // "farkle" | "hotdice" | null, transitoire
  const [endBanner, setEndBanner] = useState(null);

  const channelRef = useRef(null);
  const stateRef = useRef(null);
  const savedResultRef = useRef(false);
  const autoStartedRef = useRef(false);
  const restoredRef = useRef(false);
  const botTimer = useRef(null);
  const lastActionSeenRef = useRef(null); // évite de rejouer sons/bannières au montage/reload
  const bannerTimerRef = useRef(null);
  const rollFlashTimerRef = useRef(null);
  const endBannerTimerRef = useRef(null);

  useEffect(() => {
    stateRef.current = { seats, scores, turnIdx, activeDice, diceRemaining, turnScore, keptDice, finalRound, finished, winners, target, lastAction };
  }, [seats, scores, turnIdx, activeDice, diceRemaining, turnScore, keptDice, finalRound, finished, winners, target, lastAction]);

  function applyLocalState(s, extra = {}) {
    setSeats(s.seats); setScores(s.scores || {}); setTurnIdx(s.turnIdx || 0);
    setActiveDice(s.activeDice || null); setDiceRemaining(s.diceRemaining ?? DICE_COUNT);
    setTurnScore(s.turnScore || 0); setKeptDice(s.keptDice || []);
    setFinalRound(s.finalRound || null); setFinished(!!s.finished); setWinners(s.winners || []);
    setTarget(s.target || 5000); setLastAction(s.lastAction || null);
    setSelected([]);
    if (extra.resetGain) { setMyGain(0); savedResultRef.current = false; }
  }

  function persist(s) {
    if (!isHost) return;
    saveGameState(room.id, GAME_ID, { phase: "playing", ...s });
  }

  // ----- Réactions locales (son + bannière) à un lastAction jamais vu -----
  useEffect(() => {
    if (!lastAction) return;
    const key = lastAction.type + ":" + (lastAction.seatId || "") + ":" + (lastAction.points ?? "") + ":" + (lastAction.values ? lastAction.values.join(",") : "");
    if (lastActionSeenRef.current === key) return;
    lastActionSeenRef.current = key;

    if (lastAction.type === "roll") {
      playDiceShuffle(lastAction.values.length);
      setRollFlash(true);
      clearTimeout(rollFlashTimerRef.current);
      rollFlashTimerRef.current = setTimeout(() => setRollFlash(false), 520);
    } else if (lastAction.type === "keep") {
      if (lastAction.hotDice) {
        playHotDice();
        setBanner("hotdice");
        clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = setTimeout(() => setBanner(null), 1700);
      } else {
        playConfirmChime();
      }
    } else if (lastAction.type === "farkle") {
      playFarkle();
      setBanner("farkle");
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), 1600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAction]);

  useEffect(() => {
    const ch = supabase.channel(GAME_ID + "_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "match_start" }, ({ payload }) => {
      applyLocalState(payload, { resetGain: true });
      setPhase("playing");
      lastActionSeenRef.current = null;
      persist(payload);
      scheduleBots();
    });

    ch.on("broadcast", { event: "state" }, ({ payload }) => {
      applyLocalState(payload);
      persist(payload);
    });

    ch.on("broadcast", { event: "move_attempt" }, ({ payload }) => {
      if (!isHost) return;
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
          }
        }
      }
    });

    return () => {
      clearTimeout(botTimer.current);
      clearTimeout(bannerTimerRef.current);
      clearTimeout(rollFlashTimerRef.current);
      clearTimeout(endBannerTimerRef.current);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, isHost]);

  // ----- Arbitrage (hôte uniquement) -----
  function broadcastNewState(next) {
    channelRef.current.send({ type: "broadcast", event: "state", payload: next });
    persist(next);
  }
  function sendMatchStart(payload) {
    lastActionSeenRef.current = null;
    channelRef.current.send({ type: "broadcast", event: "match_start", payload });
    persist(payload);
  }

  // Retire seatId de la liste "dernier tour" en cours si applicable, ou
  // déclenche le dernier tour si ce siège vient de franchir la cible.
  // newTotals doit refléter le score APRÈS l'action en cours (inchangé en
  // cas de farkle, incrémenté en cas de banque).
  function resolveTurnEnd(s, seatId, newTotals) {
    let fr = s.finalRound;
    if (!fr && (newTotals[seatId] || 0) >= s.target) {
      fr = { triggeredBy: seatId, remaining: s.seats.filter(x => x.id !== seatId).map(x => x.id) };
    } else if (fr) {
      fr = { ...fr, remaining: fr.remaining.filter(id => id !== seatId) };
    }
    let fin = false, win = [];
    if (fr && fr.remaining.length === 0) {
      fin = true;
      const max = Math.max(...s.seats.map(x => newTotals[x.id] || 0));
      win = s.seats.filter(x => (newTotals[x.id] || 0) === max).map(x => x.id);
    }
    return { finalRound: fr, finished: fin, winners: win };
  }

  function hostApplyMove(seatId, action) {
    if (!action) return;
    if (action.type === "roll") hostApplyRoll(seatId);
    else if (action.type === "keep") hostApplyKeep(seatId, action.indices);
    else if (action.type === "bank") hostApplyBank(seatId);
  }

  function hostApplyRoll(seatId) {
    const s = stateRef.current;
    if (!s || s.finished) return;
    const seat = s.seats[s.turnIdx];
    if (!seat || seat.id !== seatId) return;
    if (s.activeDice) return; // un lancer est déjà en attente de sélection

    const n = s.diceRemaining;
    const values = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6));

    if (isFarkle(values)) {
      const { finalRound, finished, winners } = resolveTurnEnd(s, seatId, s.scores);
      const next = {
        ...s,
        turnScore: 0,
        activeDice: null,
        diceRemaining: DICE_COUNT,
        keptDice: [],
        turnIdx: finished ? s.turnIdx : (s.turnIdx + 1) % s.seats.length,
        finalRound, finished, winners,
        lastAction: { type: "farkle", seatId, values },
      };
      broadcastNewState(next);
      scheduleBots();
      return;
    }

    const next = { ...s, activeDice: values, lastAction: { type: "roll", seatId, values } };
    broadcastNewState(next);
    scheduleBots();
  }

  function hostApplyKeep(seatId, indices) {
    const s = stateRef.current;
    if (!s || s.finished) return;
    const seat = s.seats[s.turnIdx];
    if (!seat || seat.id !== seatId) return;
    if (!s.activeDice || !indices || !indices.length) return;

    const uniq = Array.from(new Set(indices)).filter(i => Number.isInteger(i) && i >= 0 && i < s.activeDice.length);
    if (!uniq.length) return;
    const values = uniq.map(i => s.activeDice[i]);
    const evalRes = evaluateSelection(values);
    if (!evalRes.valid) return; // le client ne devrait jamais envoyer une sélection invalide, filet de sécurité

    const remaining = s.activeDice.length - uniq.length;
    const hotDice = remaining === 0;
    const next = {
      ...s,
      turnScore: s.turnScore + evalRes.points,
      activeDice: null,
      diceRemaining: hotDice ? DICE_COUNT : remaining,
      keptDice: (s.keptDice || []).concat(values),
      lastAction: { type: "keep", seatId, points: evalRes.points, shape: evalRes.shape, hotDice },
    };
    broadcastNewState(next);
    scheduleBots();
  }

  function hostApplyBank(seatId) {
    const s = stateRef.current;
    if (!s || s.finished) return;
    const seat = s.seats[s.turnIdx];
    if (!seat || seat.id !== seatId) return;
    if (s.activeDice) return; // il faut d'abord résoudre le lancer en attente
    if (!s.turnScore) return;

    const newScores = { ...s.scores, [seatId]: (s.scores[seatId] || 0) + s.turnScore };
    const { finalRound, finished, winners } = resolveTurnEnd(s, seatId, newScores);
    const next = {
      ...s,
      scores: newScores,
      turnScore: 0,
      activeDice: null,
      diceRemaining: DICE_COUNT,
      keptDice: [],
      turnIdx: finished ? s.turnIdx : (s.turnIdx + 1) % s.seats.length,
      finalRound, finished, winners,
      lastAction: { type: "bank", seatId, points: s.turnScore, total: newScores[seatId] },
    };
    broadcastNewState(next);
    scheduleBots();
  }

  // Un tour de bot est une chaîne de coups (lancer -> garder -> relancer ou
  // banquer) : chaque appel ne joue QU'UNE étape, rappelé après chaque
  // nouvel état tant que c'est le tour d'un bot — même principe que
  // Chromatik/Président, juste rejoué plusieurs fois par tour ici.
  function scheduleBots() {
    if (!isHost) return;
    clearTimeout(botTimer.current);
    botTimer.current = setTimeout(() => {
      const s = stateRef.current;
      if (!s || s.finished) return;
      const seat = s.seats[s.turnIdx];
      if (!seat || !seat.isBot) return;
      if (s.activeDice) {
        const idx = decideBotSelection(s.activeDice);
        if (!idx.length) { hostApplyRoll(seat.id); return; }
        hostApplyKeep(seat.id, idx);
      } else if (s.turnScore > 0 && !decideBotContinue(s.turnScore, s.diceRemaining)) {
        hostApplyBank(seat.id);
      } else {
        hostApplyRoll(seat.id);
      }
    }, 1100);
  }

  // ----- Démarrage : taille de table + cible, sièges bots pour compléter -----
  function startWith(humanSeats) {
    const bots = [];
    for (let i = humanSeats.length + 1; i <= tableSize; i++) bots.push(makeBotSeat(i - humanSeats.length));
    const seatsFull = shuffleArr([...humanSeats, ...bots]);
    const initial = dealFreshState(seatsFull, pendingTarget);
    sendMatchStart(initial);
  }

  useEffect(() => {
    if (!isHost || phase !== "intro" || autoStartedRef.current || !channelReady || !tableSize || !targetConfirmed) return;
    if (players.length <= tableSize) {
      autoStartedRef.current = true;
      const humanSeats = players.map(p => ({ id: p.profile_id, username: p.profiles?.username, avatar: p.profiles?.avatar, isBot: false }));
      startWith(humanSeats);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, channelReady, players.length, tableSize, targetConfirmed]);

  function togglePick(pid) {
    setPicked(prev => {
      if (prev.includes(pid)) return prev.filter(x => x !== pid);
      if (prev.length >= tableSize) return prev;
      return [...prev, pid];
    });
  }
  function confirmPick() {
    if (picked.length === 0 || picked.length > tableSize || !channelReady) return;
    const chosen = picked.map(pid => players.find(p => p.profile_id === pid)).filter(Boolean);
    const humanSeats = chosen.map(p => ({ id: p.profile_id, username: p.profiles?.username, avatar: p.profiles?.avatar, isBot: false }));
    autoStartedRef.current = true;
    startWith(humanSeats);
  }

  function rejouer() {
    if (!isHost || !seats.length) return;
    const humanSeats = seats.filter(s => !s.isBot);
    startWith(humanSeats);
  }
  async function backToRoom() {
    await resetRoomToLobby(room.id);
    onFinish && onFinish();
  }

  // ----- Actions du joueur local -----
  const mySeat = seats.find(s => s.id === me.id);
  const isPlayer = !!mySeat;
  const currentSeat = seats[turnIdx];
  const isMyTurn = phase === "playing" && !finished && isPlayer && currentSeat?.id === me.id;

  const selectedValues = activeDice ? selected.map(i => activeDice[i]) : [];
  const selEval = selectedValues.length ? evaluateSelection(selectedValues) : { valid: false, points: 0, deadValues: [] };
  const deadValueSet = new Set(selEval.deadValues || []);

  function toggleDie(i) {
    if (!isMyTurn || !activeDice) return;
    setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  }
  function attemptRoll() {
    if (!isMyTurn || activeDice) return;
    channelRef.current?.send({ type: "broadcast", event: "move_attempt", payload: { seatId: me.id, action: { type: "roll" } } });
  }
  function attemptKeep() {
    if (!isMyTurn || !activeDice || !selected.length || !selEval.valid) return;
    channelRef.current?.send({ type: "broadcast", event: "move_attempt", payload: { seatId: me.id, action: { type: "keep", indices: selected } } });
    setSelected([]);
  }
  function attemptBank() {
    if (!isMyTurn || activeDice || !turnScore) return;
    channelRef.current?.send({ type: "broadcast", event: "move_attempt", payload: { seatId: me.id, action: { type: "bank" } } });
  }

  // ----- Fin de match : bannière + son + insertion du score (une fois) -----
  useEffect(() => {
    if (!finished || savedResultRef.current || !isPlayer) return;
    savedResultRef.current = true;
    const won = winners.includes(me.id);
    const gain = won ? 5 : 1;
    setMyGain(gain);
    setEndBanner(won ? "win" : "lose");
    if (won) playGameWin(); else playGameLose();
    clearTimeout(endBannerTimerRef.current);
    endBannerTimerRef.current = setTimeout(() => setEndBanner(null), won ? 4000 : 3400);
    (async () => {
      try {
        await supabase.from("game_results").insert({ room_id: room.id, profile_id: me.id, game_id: GAME_ID, points: gain });
        await supabase.rpc("add_points", { p_room: room.id, p_delta: gain });
      } catch (e) {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const endConfettiPieces = (() => {
    if (endBanner !== "win") return [];
    const palette = ["#C24CF2", "#FF2D95", "#8b5cf6", "#e879f9"];
    return Array.from({ length: 30 }, (_, i) => ({
      id: i, left: Math.random() * 100, delay: Math.random() * 1.5,
      duration: 1.8 + Math.random() * 1.6, color: palette[i % palette.length],
      rot: Math.round(Math.random() * 360), size: 6 + Math.round(Math.random() * 6),
    }));
  })();

  const needsPick = players.length > (tableSize || 0);

  let content;

  if (phase === "playing" && seats.length) {
    const orderedDice = activeDice || Array.from({ length: diceRemaining }, () => 1);
    content = (
      <div className="tenk-stage">
        {!finished && currentSeat && (
          <p className="turn-banner">
            {isMyTurn ? "🎲 " + t("yourTurnBadge") : (currentSeat.avatar + " " + currentSeat.username)}
          </p>
        )}

        <div className="tenk-felt">
          {banner === "farkle" && <div className="tenk-farkle-flash" />}
          {banner === "hotdice" && <div className="tenk-hotdice-flash" />}
          <div className="tenk-dice-row">
            {orderedDice.map((v, i) => (
              <TenkDie
                key={i}
                value={v}
                ghost={!activeDice}
                selected={!!activeDice && selected.includes(i)}
                dead={!!activeDice && selected.includes(i) && deadValueSet.has(v)}
                rolling={rollFlash}
                disabled={!isMyTurn || !activeDice}
                onClick={activeDice ? () => toggleDie(i) : undefined}
              />
            ))}
          </div>
          {keptDice.length > 0 && (
            <div className="tenk-dice-row" style={{ marginTop: 10 }}>
              {keptDice.map((v, i) => (
                <TenkDie key={"k" + i} value={v} kept style={{ transform: "scale(.7)" }} />
              ))}
            </div>
          )}
        </div>

        {banner === "farkle" && <div className="tenk-farkle-banner">💥 {t("tenkFarkleTitle")}</div>}
        {banner === "hotdice" && <div className="tenk-hotdice-banner">🔥 {t("tenkHotDiceTitle")}</div>}

        <div className="tenk-turn-score">
          <span className="n">{turnScore}</span>
          <span className="lbl">{t("tenkTurnScore")}</span>
        </div>
        {isMyTurn && activeDice && (
          <p className="tenk-best-hint">
            {selected.length === 0
              ? t("tenkSelectHint")
              : (selEval.valid ? "+" + selEval.points + " " + t("pts") : t("tenkNoScoreHint"))}
          </p>
        )}

        {isMyTurn && !finished && (
          <div className="tenk-actions">
            {!activeDice ? (
              <>
                <button className="tenk-btn-roll" onClick={attemptRoll}>🎲 {t("tenkRoll")}</button>
                <button className="tenk-btn-bank" disabled={!turnScore} onClick={attemptBank}>💰 {t("tenkBank")}</button>
              </>
            ) : (
              <button className="tenk-btn-roll" disabled={!selected.length || !selEval.valid} onClick={attemptKeep}>
                ✅ {t("tenkKeepSelection")}
              </button>
            )}
          </div>
        )}

        {finalRound && !finished && (
          <p className="tenk-hotdice-banner" style={{ animation: "none" }}>
            🏁 {t("tenkFinalRoundTitle")}
          </p>
        )}

        <div className="tenk-score-bar">
          {seats.map((s, i) => (
            <div key={s.id} className={"tenk-score-chip" + (s.id === me.id ? " me" : "") + (i === turnIdx && !finished ? " active" : "")}>
              <span>{s.avatar} {s.username}</span>
              <b>{scores[s.id] || 0}</b>
            </div>
          ))}
        </div>
        <p className="tenk-best-hint">{t("tenkTargetLabel")} : {target} {t("pts")}</p>

        {finished && (
          <div className="yz-final">
            {endBanner && (
              <div className={"yz-end-banner " + endBanner}>
                {endBanner === "win" && endConfettiPieces.map(p => (
                  <span
                    key={p.id}
                    className="yz-confetti-piece"
                    style={{
                      left: p.left + "%", width: p.size, height: p.size * 1.4,
                      background: p.color, animationDelay: p.delay + "s", animationDuration: p.duration + "s",
                      "--rot0": p.rot + "deg",
                    }}
                  />
                ))}
                {endBanner === "win" ? (
                  <>
                    <div className="yz-end-banner-text win">🎉 {t("yzEndWinBanner")}</div>
                    <div className="yz-end-banner-claps"><span>👏</span><span>👏</span><span>👏</span><span>👏</span><span>👏</span></div>
                  </>
                ) : (
                  <div className="yz-end-banner-text lose">😔 {t("yzEndLoseBanner")}</div>
                )}
              </div>
            )}
            <div className="yz-final-board">
              {seats
                .map(s => ({ seat: s, total: scores[s.id] || 0 }))
                .sort((a, b) => b.total - a.total)
                .map(({ seat, total }, idx) => (
                  <div key={seat.id} className={"yz-final-row" + (winners.includes(seat.id) ? " winner" : "")}>
                    <span>{idx + 1}.</span>
                    <span>{seat.avatar} {seat.username}</span>
                    <b>{total}</b>
                  </div>
                ))}
            </div>
            {isPlayer && (
              <p style={{ fontWeight: 800, textAlign: "center", marginTop: 10 }}>
                {t("peYourGain")} <span style={{ color: "var(--tenk-pink)", fontFamily: "'Space Mono'" }}>+{myGain} {t("pts")}</span>
              </p>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
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
    if (!tableSize) {
      content = isHost ? (
        <div>
          <p className="hint">{t("chromatikSizeHint")}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
            {[2, 3, 4].map(n => (
              <button key={n} className="btn" style={{ width: "auto", padding: "14px 22px" }} onClick={() => setTableSize(n)}>
                {n} {t("chromatikSeats")}
              </button>
            ))}
          </div>
        </div>
      ) : <p className="muted">{t("chromatikWaitHostSize")}</p>;
    } else if (!targetConfirmed) {
      content = isHost ? (
        <div>
          <p className="hint">{t("tenkTargetHint")}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
            {[5000, 10000].map(n => (
              <button
                key={n}
                className={"btn" + (pendingTarget === n ? "" : " ghost")}
                style={{ width: "auto", padding: "14px 22px" }}
                onClick={() => setPendingTarget(n)}
              >
                {n} {t("tenkTargetUnit")}
              </button>
            ))}
          </div>
          <button className="btn" style={{ marginTop: 16 }} onClick={() => setTargetConfirmed(true)}>
            {t("presMandatesConfirm")}
          </button>
        </div>
      ) : <p className="muted">{t("chromatikWaitHostSize")}</p>;
    } else if (needsPick) {
      content = isHost ? (
        <div>
          <p className="hint">{t("chromatikPickHint")} ({tableSize} {t("chromatikSeats")})</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0 16px" }}>
            {players.map(p => {
              const on = picked.includes(p.profile_id);
              return (
                <button
                  key={p.profile_id}
                  className={"btn" + (on ? "" : " ghost")}
                  style={{ width: "auto", padding: "10px 16px" }}
                  onClick={() => togglePick(p.profile_id)}
                >
                  {p.profiles?.avatar} {p.profiles?.username}
                </button>
              );
            })}
          </div>
          <button className="btn" disabled={picked.length === 0 || picked.length > tableSize} onClick={confirmPick}>
            {t("presMandatesConfirm")}
          </button>
        </div>
      ) : <p className="muted">{t("chromatikWaitHostSize")}</p>;
    } else {
      content = <p className="muted">{t("tenkStarting")}</p>;
    }
  }

  return (
    <div className="panel" style={{ maxWidth: "min(860px, 94vw)" }}>
      <h1>{t("tenkTitle")}</h1>
      <Crossfade id={phase + ":" + finished}>{content}</Crossfade>
    </div>
  );
}
