"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby, recordMatchResult } from "@/lib/gameSync";
import Crossfade from "@/components/Crossfade";
import GameCountdown, { COUNTDOWN_MS } from "@/components/GameCountdown";
import TenkDie from "./TenkDie";
import { DICE_COUNT, evaluateSelection, isFarkle, listScoringGroups, MIN_TO_BANK, FARKLE_STREAK_LIMIT, FARKLE_STREAK_PENALTY } from "./scoring";
import { decideBotSelection, decideBotContinue } from "./botLogic";
import { playDiceShuffle, playConfirmChime, playFarkle, playHotDice, playGameWin, playGameLose, playCashRegister } from "@/lib/sfx";

/* Minuteur de tour humain (anti-AFK), même convention que Président et
   Chromatik : 30s par défaut (20s jugés trop stressants à l'usage), réduit
   à 5s après 2 dépassements consécutifs du MÊME joueur, remis à 30s dès
   qu'il rejoue de lui-même. Ne concerne jamais les bots (temporisés
   séparément par scheduleBots). À l'échéance, l'hôte joue à la place du
   joueur : garde la meilleure combinaison si un lancer attend, banque si le
   score du tour le permet, relance sinon. */
const HUMAN_TURN_MS = 30000;
const HUMAN_TURN_SHORT_MS = 5000;
const HUMAN_TURN_STRIKES = 2;

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
// Après un hot dice (les 6 dés combinés), le bouton Lancer reste verrouillé
// ce temps-ci pour que la petite animation de célébration ait le temps
// d'être vue — demande explicite du porteur de projet, l'enchaînement était
// trop rapide pour qu'on remarque qu'on venait de bien jouer.
const HOT_DICE_PAUSE_MS = 2000;
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
    farkleStreak: Object.fromEntries(seats.map(s => [s.id, 0])), // lancers blancs consécutifs par siège (voir MIN_TO_BANK/FARKLE_STREAK_* dans scoring.js)
    hotDiceUntil: 0,       // timestamp (Date.now()) jusqu'auquel le bouton Lancer reste verrouillé après un hot dice — voir HOT_DICE_PAUSE_MS
    finalRound: null,      // { triggeredBy, remaining: [seatId,...] } une fois la cible atteinte
    finished: false,
    winners: [],
    target,
    lastAction: null,
  };
}

export default function TenkGame({ room, me, isHost, players, t, lang, onFinish, restartToken }) {
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
  const [farkleStreak, setFarkleStreak] = useState({}); // { [seatId]: nombre de lancers blancs consécutifs }
  const [hotDiceUntil, setHotDiceUntil] = useState(0); // timestamp jusqu'auquel Lancer reste verrouillé (pause célébration)
  const [hotDiceLock, setHotDiceLock] = useState(false); // dérivé de hotDiceUntil, voir le useEffect dédié plus bas
  const [finalRound, setFinalRound] = useState(null);
  const [finished, setFinished] = useState(false);
  const [winners, setWinners] = useState([]);
  const [target, setTarget] = useState(5000);
  const [lastAction, setLastAction] = useState(null);

  const [selected, setSelected] = useState([]); // indices dans activeDice choisis pour la sélection en cours
  // ----- Mode assisté ("Aide") : pré-sélection automatique de la meilleure
  // combinaison à chaque lancer. DÉSACTIVÉ par défaut (retour du porteur de
  // projet : l'ordi ne doit pas "faire tout le taff" d'office), activable
  // par un curseur on/off dans le panneau Combinaisons, préférence
  // mémorisée dans localStorage. Lu uniquement côté client (useEffect) pour
  // ne jamais désaccorder serveur/client au premier rendu. assistRef évite
  // les fermetures obsolètes dans applyLocalState (appelé depuis le canal).
  const [assistOn, setAssistOn] = useState(false);
  const assistRef = useRef(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("arcardi_tenk_assist") === "1";
      setAssistOn(saved); assistRef.current = saved;
    } catch { /* localStorage indisponible : reste off */ }
  }, []);
  function toggleAssist() {
    setAssistOn(prev => {
      const next = !prev;
      assistRef.current = next;
      try { localStorage.setItem("arcardi_tenk_assist", next ? "1" : "0"); } catch {}
      // Activation en plein tour : on applique l'aide tout de suite au
      // lancer en cours (sinon elle ne servirait qu'au prochain lancer).
      if (next && activeDice && activeDice.length) {
        const rows = listScoringGroups(activeDice);
        if (rows.length) setSelected(rows[0].indices.slice());
      }
      return next;
    });
  }
  const [myWin, setMyWin] = useState(false);
  const [channelReady, setChannelReady] = useState(false);
  const [rollFlash, setRollFlash] = useState(false);
  const [banner, setBanner] = useState(null); // "farkle" | "hotdice" | null, transitoire
  const [endBanner, setEndBanner] = useState(null);
  const [penaltyPop, setPenaltyPop] = useState(false); // popup "Ayoye !" -500 (3 farkles de suite)
  // Minuteur de tour humain (affichage) : deadline + siège concerné,
  // diffusés par l'hôte dans chaque état réseau — tous les clients
  // calculent le compte à rebours localement à partir du même horodatage,
  // jamais de minuteur qui diverge d'un écran à l'autre (même mécanique
  // que Président, voir computeTurnDeadline/armHumanTurnTimer).
  const [turnDeadline, setTurnDeadline] = useState(null);
  const [turnDeadlineSeat, setTurnDeadlineSeat] = useState(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  // Décompte 3-2-1 de début de partie (demande 2026-07) : affiché à chaque
  // match_start (jamais lors d'une reprise sur rechargement).
  const [countingDown, setCountingDown] = useState(false);

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
  const penaltyPopTimerRef = useRef(null);
  const turnTimeoutRef = useRef(null);  // setTimeout qui joue à la place du joueur humain AFK
  const turnStrikesRef = useRef({});    // seatId -> dépassements consécutifs (remis à 0 dès qu'il rejoue)
  const turnMetaRef = useRef({ deadline: null, seatId: null }); // dernière deadline diffusée
  const lastProgressRef = useRef(Date.now()); // watchdog anti-blocage : horodatage du dernier état reçu
  // Fin du décompte 3-2-1 (côté hôte : les bots n'agissent jamais avant) et
  // fin de la période "départ rapide" des bots — voir botThinkDelay.
  const countdownEndRef = useRef(0);
  const botFastUntilRef = useRef(0);

  useEffect(() => {
    stateRef.current = { seats, scores, turnIdx, activeDice, diceRemaining, turnScore, keptDice, farkleStreak, hotDiceUntil, finalRound, finished, winners, target, lastAction };
  }, [seats, scores, turnIdx, activeDice, diceRemaining, turnScore, keptDice, farkleStreak, hotDiceUntil, finalRound, finished, winners, target, lastAction]);

  // Dérive le verrou local du bouton Lancer depuis hotDiceUntil (état
  // partagé) : se reprogramme à chaque nouvelle valeur reçue, y compris
  // après un reload (readGameState) où le délai peut déjà être écoulé.
  useEffect(() => {
    const remain = hotDiceUntil - Date.now();
    if (remain > 0) {
      setHotDiceLock(true);
      const timer = setTimeout(() => setHotDiceLock(false), remain);
      return () => clearTimeout(timer);
    }
    setHotDiceLock(false);
  }, [hotDiceUntil]);

  useEffect(() => {
    if (!turnDeadline) return;
    const iv = setInterval(() => setNowTick(Date.now()), 250);
    return () => clearInterval(iv);
  }, [turnDeadline]);

  function applyLocalState(s, extra = {}) {
    setSeats(s.seats); setScores(s.scores || {}); setTurnIdx(s.turnIdx || 0);
    setActiveDice(s.activeDice || null); setDiceRemaining(s.diceRemaining ?? DICE_COUNT);
    setTurnScore(s.turnScore || 0); setKeptDice(s.keptDice || []);
    setFarkleStreak(s.farkleStreak || {});
    setHotDiceUntil(s.hotDiceUntil || 0);
    setFinalRound(s.finalRound || null); setFinished(!!s.finished); setWinners(s.winners || []);
    setTarget(s.target || 5000); setLastAction(s.lastAction || null);
    setTurnDeadline(s.turnDeadline || null); setTurnDeadlineSeat(s.turnDeadlineSeat || null);
    lastProgressRef.current = Date.now();
    // Suggestion automatique : seulement si le mode assisté ("Aide") est
    // activé, on pré-sélectionne à chaque nouveau lancer la combinaison qui
    // rapporte le plus (listScoringGroups est triée par points décroissants)
    // — le joueur reste entièrement libre de la changer. Aide désactivée :
    // aucune pré-sélection, le joueur choisit tout lui-même (le raccourci
    // Cmd/Ctrl+Maj+K reste disponible ponctuellement dans les deux cas).
    if (assistRef.current && s.activeDice && s.activeDice.length) {
      const rows = listScoringGroups(s.activeDice);
      setSelected(rows.length ? rows[0].indices : []);
    } else {
      setSelected([]);
    }
    if (extra.resetGain) { setMyWin(false); savedResultRef.current = false; }
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
        // Synchronisé avec HOT_DICE_PAUSE_MS (verrou du bouton Lancer) :
        // la bannière reste affichée tout le temps de la pause célébration.
        bannerTimerRef.current = setTimeout(() => setBanner(null), HOT_DICE_PAUSE_MS);
      } else {
        playConfirmChime();
      }
    } else if (lastAction.type === "bank") {
      // Encaissement : vrai bruit de caisse enregistreuse (demande 2026-07),
      // joué chez TOUS les clients (humain comme bot qui banque) — même
      // logique lastAction que les autres sons de la table.
      playCashRegister();
    } else if (lastAction.type === "farkle") {
      const penalized = lastAction.penalty > 0;
      if (penalized) {
        playGameLose();
        setPenaltyPop(true);
        clearTimeout(penaltyPopTimerRef.current);
        penaltyPopTimerRef.current = setTimeout(() => setPenaltyPop(false), 2200);
      } else {
        playFarkle();
      }
      setBanner("farkle");
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), penalized ? 2200 : 1600);
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
      // Décompte 3-2-1 avant le premier lancer (jamais au rechargement) ;
      // pendant ~12 s après le décompte, les bots jouent nettement plus
      // vite (demande 2026-07 : l'entame traînait), puis reprennent leur
      // rythme "réfléchi" habituel — voir botThinkDelay.
      countdownEndRef.current = Date.now() + COUNTDOWN_MS;
      botFastUntilRef.current = countdownEndRef.current + 12000;
      setCountingDown(true);
      persist(payload);
      scheduleBots();
    });

    ch.on("broadcast", { event: "state" }, ({ payload }) => {
      applyLocalState(payload);
      persist(payload);
    });

    ch.on("broadcast", { event: "move_attempt" }, ({ payload }) => {
      if (!isHost) return;
      // Un message reçu de ce siège = il n'est plus AFK : on lui redonne
      // le bénéfice du délai complet (30s) pour son PROCHAIN tour, que ce
      // coup-ci soit finalement légal ou non.
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
            // CORRECTIF BLOCAGE : au rechargement de l'hôte en pleine
            // partie, il faut relancer la boucle des bots (comme le fait
            // Président avec scheduleNext()) — sinon, si c'était le tour
            // d'un bot au moment du reload, plus rien ne le rejouait et la
            // partie restait figée pour tout le monde. Même chose pour le
            // minuteur du joueur humain actif (deadline recalculée à
            // neuf : il récupère un délai complet, ce qui est équitable).
            if (isHost) {
              stateRef.current = { ...saved };
              scheduleBots();
              turnMetaRef.current = computeTurnDeadline(saved);
              armHumanTurnTimer();
            }
          }
        }
      }
    });

    return () => {
      clearTimeout(botTimer.current);
      clearTimeout(turnTimeoutRef.current);
      clearTimeout(bannerTimerRef.current);
      clearTimeout(rollFlashTimerRef.current);
      clearTimeout(endBannerTimerRef.current);
      clearTimeout(penaltyPopTimerRef.current);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, isHost]);

  // ----- Arbitrage (hôte uniquement) -----
  // Calcule, à partir d'un état sur le point d'être diffusé, la deadline du
  // tour humain à venir ({ null, null } : pas de minuteur — bot, partie
  // finie). Pure lecture de turnStrikesRef : c'est armHumanTurnTimer(),
  // juste après, qui arme le VRAI minuteur avec exactement cette durée —
  // affichage et action automatique ne divergent donc jamais.
  function computeTurnDeadline(next) {
    if (!next || next.finished || !next.seats || !next.seats.length) return { deadline: null, seatId: null };
    const seat = next.seats[next.turnIdx];
    if (!seat || seat.isBot) return { deadline: null, seatId: null };
    const strikes = turnStrikesRef.current[seat.id] || 0;
    const ms = strikes >= HUMAN_TURN_STRIKES ? HUMAN_TURN_SHORT_MS : HUMAN_TURN_MS;
    return { deadline: Date.now() + ms, seatId: seat.id };
  }

  // Arme le minuteur qui, si le joueur humain actif ne fait rien avant la
  // deadline, joue à sa place : garde la meilleure combinaison si un lancer
  // attend une sélection, banque si le score du tour atteint le minimum,
  // relance sinon. Chaque dépassement incrémente son compteur de grillages
  // consécutifs (turnStrikesRef), remis à 0 dès qu'il rejoue de lui-même.
  function armHumanTurnTimer() {
    clearTimeout(turnTimeoutRef.current);
    if (!isHost) return;
    const { deadline, seatId } = turnMetaRef.current;
    if (!deadline || !seatId) return;
    const delay = Math.max(0, deadline - Date.now());
    turnTimeoutRef.current = setTimeout(() => {
      const s = stateRef.current;
      if (!s || s.finished) return;
      const seat = s.seats[s.turnIdx];
      if (!seat || seat.id !== seatId || seat.isBot) return; // le tour a déjà changé
      // Pause célébration hot dice encore active : hostApplyRoll refuserait
      // le coup — on se re-arme juste après la fin du verrou plutôt que de
      // griller le joueur sur un refus technique.
      if (!s.activeDice && Date.now() < (s.hotDiceUntil || 0)) {
        turnMetaRef.current = { deadline: (s.hotDiceUntil || 0) + 400, seatId };
        armHumanTurnTimer();
        return;
      }
      turnStrikesRef.current[seatId] = (turnStrikesRef.current[seatId] || 0) + 1;
      if (s.activeDice) {
        const rows = listScoringGroups(s.activeDice);
        if (rows.length) hostApplyKeep(seatId, rows[0].indices);
      } else if (s.turnScore >= MIN_TO_BANK) {
        hostApplyBank(seatId);
      } else {
        hostApplyRoll(seatId);
      }
    }, delay);
  }

  function broadcastNewState(next) {
    const tm = computeTurnDeadline(next);
    turnMetaRef.current = tm;
    channelRef.current.send({ type: "broadcast", event: "state", payload: { ...next, turnDeadline: tm.deadline, turnDeadlineSeat: tm.seatId } });
    persist(next);
    armHumanTurnTimer();
  }
  function sendMatchStart(payload) {
    lastActionSeenRef.current = null;
    const tm = computeTurnDeadline(payload);
    // Décompte 3-2-1 : le premier tour humain ne commence à décompter ses
    // 30 s qu'après le décompte (l'overlay bloque les clics pendant ce temps).
    if (tm.deadline) tm.deadline += COUNTDOWN_MS;
    turnMetaRef.current = tm;
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: { ...payload, turnDeadline: tm.deadline, turnDeadlineSeat: tm.seatId } });
    persist(payload);
    armHumanTurnTimer();
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
    if (Date.now() < (s.hotDiceUntil || 0)) return; // pause célébration hot dice encore active, voir HOT_DICE_PAUSE_MS

    const n = s.diceRemaining;
    const values = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6));

    if (isFarkle(values)) {
      // Trois lancers blancs (farkle) de suite pour ce siège -> -500 pts
      // sur son total (jamais sous 0), puis le compteur repart de 0.
      const streak = (s.farkleStreak?.[seatId] || 0) + 1;
      const penalized = streak >= FARKLE_STREAK_LIMIT;
      const newScores = penalized
        ? { ...s.scores, [seatId]: Math.max(0, (s.scores[seatId] || 0) - FARKLE_STREAK_PENALTY) }
        : s.scores;
      const nextStreak = penalized ? 0 : streak;
      const { finalRound, finished, winners } = resolveTurnEnd(s, seatId, newScores);
      const next = {
        ...s,
        scores: newScores,
        turnScore: 0,
        activeDice: null,
        diceRemaining: DICE_COUNT,
        keptDice: [],
        farkleStreak: { ...(s.farkleStreak || {}), [seatId]: nextStreak },
        turnIdx: finished ? s.turnIdx : (s.turnIdx + 1) % s.seats.length,
        finalRound, finished, winners,
        lastAction: { type: "farkle", seatId, values, streak, penalty: penalized ? FARKLE_STREAK_PENALTY : 0 },
      };
      broadcastNewState(next);
      scheduleBots();
      return;
    }

    // Lancer valable : la série de lancers blancs de ce siège est rompue.
    const next = {
      ...s,
      activeDice: values,
      farkleStreak: { ...(s.farkleStreak || {}), [seatId]: 0 },
      lastAction: { type: "roll", seatId, values },
    };
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
    const hotDiceUntil = hotDice ? Date.now() + HOT_DICE_PAUSE_MS : 0;
    const next = {
      ...s,
      turnScore: s.turnScore + evalRes.points,
      activeDice: null,
      diceRemaining: hotDice ? DICE_COUNT : remaining,
      keptDice: (s.keptDice || []).concat(values),
      hotDiceUntil,
      lastAction: { type: "keep", seatId, points: evalRes.points, shape: evalRes.shape, hotDice, hotDiceUntil },
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
    if (!s.turnScore || s.turnScore < MIN_TO_BANK) return; // filet de sécurité : 300 pts minimum pour banquer, voir attemptBank() côté client

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
  //
  // Délai "réfléchi" (demande explicite du porteur de projet : un bot qui
  // agit toujours au même rythme métronomique casse l'illusion). Trois
  // fourchettes selon la nature de la décision — garder une sélection déjà
  // "vue" est quasi instantané, mais choisir de relancer ou de banquer
  // prend sensiblement plus de temps (c'est le vrai dilemme du jeu) — plus
  // une petite chance d'hésitation supplémentaire, pour ne jamais paraître
  // parfaitement régulier.
  function botThinkDelay(kind) {
    // Départ rapide (demande 2026-07) : pendant les ~12 premières secondes
    // d'une partie, le bot enchaîne sans tergiverser (et sans hésitation
    // aléatoire) — l'entame était jugée trop lente. Passé ce cap, retour au
    // rythme "réfléchi" habituel.
    const fast = Date.now() < botFastUntilRef.current;
    const ranges = fast
      ? { keep: [280, 600], decide: [550, 1100], roll: [320, 700] }
      : { keep: [650, 1350], decide: [1500, 3100], roll: [850, 1650] };
    const [min, max] = ranges[kind] || ranges.roll;
    let d = min + Math.random() * (max - min);
    if (!fast && Math.random() < 0.12) d += 1100 + Math.random() * 1500; // hésitation occasionnelle
    return d;
  }
  function scheduleBots() {
    if (!isHost) return;
    clearTimeout(botTimer.current);
    const s0 = stateRef.current;
    if (!s0 || s0.finished) return;
    const seat0 = s0.seats[s0.turnIdx];
    if (!seat0 || !seat0.isBot) return;

    // Classification rapide pour choisir la fourchette de délai — la vraie
    // décision est reprise depuis zéro dans le setTimeout (état frais).
    let kind = "roll";
    if (s0.activeDice) {
      kind = decideBotSelection(s0.activeDice).length ? "keep" : "roll";
    } else if (s0.turnScore > 0) {
      kind = "decide";
    }
    // Pause célébration hot dice (voir HOT_DICE_PAUSE_MS) : hostApplyRoll
    // la refuse de toute façon côté hôte, donc si le prochain coup peut être
    // un lancer (kind !== "keep"), on ne programme jamais le bot avant que
    // le verrou soit levé — sinon son coup serait silencieusement ignoré et
    // plus rien ne le relancerait derrière.
    const hotDiceLockRemain = Math.max(0, (s0.hotDiceUntil || 0) - Date.now());
    const baseDelay = botThinkDelay(kind);
    let delay = kind === "keep" ? baseDelay : Math.max(baseDelay, hotDiceLockRemain);
    // Décompte 3-2-1 en cours : le bot ne joue JAMAIS pendant que les
    // joueurs regardent l'overlay (sinon des dés apparaîtraient déjà lancés
    // à la fin du décompte).
    delay = Math.max(delay, countdownEndRef.current - Date.now());

    botTimer.current = setTimeout(() => {
      const s = stateRef.current;
      if (!s || s.finished) return;
      const seat = s.seats[s.turnIdx];
      if (!seat || !seat.isBot) return;
      if (s.activeDice) {
        const idx = decideBotSelection(s.activeDice);
        if (!idx.length) {
          // Ne devrait jamais arriver (un lancer sans aucune sélection
          // possible est un farkle, traité au moment du lancer) — mais
          // l'ancien repli hostApplyRoll était un BLOCAGE garanti (refusé
          // tant qu'un lancer attend). Filet de sécurité : on garde la
          // meilleure combinaison listée par le moteur de score.
          const rows = listScoringGroups(s.activeDice);
          if (rows.length) hostApplyKeep(seat.id, rows[0].indices);
          return;
        }
        hostApplyKeep(seat.id, idx);
      } else if (s.turnScore > 0 && !decideBotContinue(s.turnScore, s.diceRemaining)) {
        hostApplyBank(seat.id);
      } else {
        hostApplyRoll(seat.id);
      }
    }, delay);
  }

  // ----- Watchdog anti-blocage (hôte) -----
  // Les setTimeout d'un onglet en arrière-plan peuvent être étranglés ou
  // perdus par le navigateur : si c'est le tour d'un bot et que RIEN ne
  // s'est passé depuis 8s (aucun nouvel état), on relance scheduleBots().
  // Sans effet dans le cas nominal (le bot joue bien avant 8s).
  useEffect(() => {
    if (!isHost || phase !== "playing") return;
    const iv = setInterval(() => {
      const s = stateRef.current;
      if (!s || s.finished) return;
      const seat = s.seats[s.turnIdx];
      if (!seat || !seat.isBot) return;
      if (Date.now() - lastProgressRef.current > 8000) scheduleBots();
    }, 4000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase]);

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

  // "Terminer la partie" (demande 2026-07, page du salon) : la pastille
  // globale rappelle rejouer() via ce jeton — voir DiapasonGame.js pour le
  // détail du mécanisme (identique dans tous les jeux).
  useEffect(() => {
    if (!restartToken) return;
    rejouer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartToken]);
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
  // Panneau "Combinaisons possibles" : cliquer une ligne REMPLACE la
  // sélection en cours par les dés de cette combinaison précise (le joueur
  // garde par ailleurs toute liberté d'affiner en cliquant les dés un par
  // un, voir toggleDie ci-dessus — les deux pilotent le même `selected`).
  function selectCombo(row) {
    if (!isMyTurn || !activeDice) return;
    setSelected(row.indices.slice());
  }
  function isRowActive(row) {
    if (selected.length !== row.indices.length) return false;
    const a = selected.slice().sort((x, y) => x - y);
    const b = row.indices.slice().sort((x, y) => x - y);
    return a.every((v, i) => v === b[i]);
  }
  function attemptRoll() {
    if (!isMyTurn || activeDice || hotDiceLock) return;
    channelRef.current?.send({ type: "broadcast", event: "move_attempt", payload: { seatId: me.id, action: { type: "roll" } } });
  }
  function attemptKeep() {
    if (!isMyTurn || !activeDice || !selected.length || !selEval.valid) return;
    channelRef.current?.send({ type: "broadcast", event: "move_attempt", payload: { seatId: me.id, action: { type: "keep", indices: selected } } });
    setSelected([]);
  }
  function attemptBank() {
    if (!isMyTurn || activeDice || !turnScore || turnScore < MIN_TO_BANK) return;
    channelRef.current?.send({ type: "broadcast", event: "move_attempt", payload: { seatId: me.id, action: { type: "bank" } } });
  }

  // ----- Fin de match : bannière + son + victoire/défaite ARCARDI (une fois) -----
  useEffect(() => {
    if (!finished || savedResultRef.current || !isPlayer) return;
    savedResultRef.current = true;
    const won = winners.includes(me.id);
    setMyWin(won);
    setEndBanner(won ? "win" : "lose");
    if (won) playGameWin(); else playGameLose();
    clearTimeout(endBannerTimerRef.current);
    endBannerTimerRef.current = setTimeout(() => setEndBanner(null), won ? 4000 : 3400);
    recordMatchResult(room.id, won);
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

  // Dispersion façon "dés jetés sur la table" : un décalage/rotation
  // aléatoire par dé, calculé UNE SEULE FOIS par lancer (useMemo garde la
  // même valeur tant qu'activeDice ne change pas de référence, donc reste
  // stable pendant que le joueur clique pour sélectionner) — demande
  // explicite du porteur de projet pour plus de réalisme. Hook au niveau
  // racine du composant (jamais dans une branche conditionnelle), donc
  // calculé à chaque rendu mais quasi gratuit (6 nombres aléatoires).
  const diceJitter = useMemo(() => {
    if (!activeDice) return [];
    return activeDice.map(() => ({
      dx: Math.round((Math.random() - 0.5) * 22),  // ±11px
      dy: Math.round((Math.random() - 0.5) * 16),  // ±8px
      rot: Math.round((Math.random() - 0.5) * 26), // ±13deg
    }));
  }, [activeDice]);

  // Combinaisons du lancer actif — calculées au niveau racine (pas QUE
  // dans la branche "playing") pour piloter le raccourci clavier d'aide
  // ci-dessous sans enfreindre les règles des hooks React (toujours au
  // même endroit, jamais dans une branche conditionnelle).
  const activeComboRows = useMemo(() => (activeDice ? listScoringGroups(activeDice) : []), [activeDice]);

  // ----- Raccourci clavier d'aide : Cmd/Ctrl+Maj+K -----
  // Redonne en évidence (et resélectionne) la combinaison la plus
  // rentable du lancer en cours — pensé pour débloquer un joueur qui ne
  // saurait pas quoi faire de ses dés, sur simple demande plutôt qu'imposé
  // à l'écran en permanence. Choix de la touche K (et non une lettre déjà
  // très utilisée) après vérification des raccourcis Cmd/Ctrl+Maj+ courants
  // de Chrome/Safari/macOS (T, N, W, Q, R, S, V, Z, H sont tous pris —
  // rechargement, incognito, fermeture, capture d'écran système, collage
  // sans mise en forme, rétablir, page d'accueil…) : K n'entre en conflit
  // avec aucun d'entre eux. Comparaison sur `e.code` (touche physique), pas
  // `e.key`, même raison que AmbienceSkipButton.js (Maj change la valeur de
  // `key` sur beaucoup de claviers).
  const [hintPulse, setHintPulse] = useState(false);
  const hintPulseTimerRef = useRef(null);
  useEffect(() => {
    function onKeyDown(e) {
      // Raccourci "lancer les dés" à la barre d'espace (demande 2026-07) :
      // vient S'AJOUTER au bouton 🎲 existant, ne le remplace pas. Ignoré
      // si le focus est sur un champ de saisie (ex. le chat du salon,
      // toujours accessible pendant une partie) pour ne jamais voler un
      // espace tapé dans un message. Mêmes garde-fous qu'attemptRoll
      // (son tour, pas de dés déjà lancés, pas verrouillé en "dés chauds").
      if (e.code === "Space") {
        const tag = (document.activeElement?.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable) return;
        if (!isMyTurn || activeDice || hotDiceLock) return;
        e.preventDefault();
        attemptRoll();
        return;
      }
      if (!(e.metaKey || e.ctrlKey) || !e.shiftKey || e.code !== "KeyK") return;
      if (!isMyTurn || !activeDice || !activeComboRows.length) return;
      e.preventDefault();
      setSelected(activeComboRows[0].indices.slice());
      playConfirmChime();
      setHintPulse(true);
      clearTimeout(hintPulseTimerRef.current);
      hintPulseTimerRef.current = setTimeout(() => setHintPulse(false), 900);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); clearTimeout(hintPulseTimerRef.current); };
  }, [isMyTurn, activeDice, activeComboRows, hotDiceLock]);

  let content;

  if (phase === "playing" && seats.length) {
    const orderedDice = activeDice || Array.from({ length: diceRemaining }, () => 1);
    // Classement de la sidebar paysage : trié par score, indépendant de
    // l'ordre des tours (idx d'origine conservé pour repérer le joueur actif).
    const rankedSeats = seats
      .map((s, i) => ({ seat: s, idx: i, score: scores[s.id] || 0 }))
      .sort((a, b) => b.score - a.score);
    // Combinaisons proposées pour le lancer en cours (calculées au niveau
    // racine, voir activeComboRows plus haut, partagées avec le raccourci
    // clavier d'aide Cmd/Ctrl+Maj+K).
    const comboRows = activeComboRows;
    // Jauge du score du tour : 1500 = repère visuel (une suite), le score
    // peut le dépasser (la jauge plafonne alors à 100% mais le nombre
    // affiché, lui, ne plafonne jamais). Marqueur à 300 = seuil pour banquer.
    const TURN_GAUGE_MAX = 1500;
    // Compte à rebours du tour humain en cours, calculé localement chez
    // TOUS les clients à partir de la deadline diffusée par l'hôte — même
    // horodatage partout (mêmes classes CSS que Président : .turn-timer-chip).
    const turnRemaining = turnDeadline && currentSeat && turnDeadlineSeat === currentSeat.id
      ? Math.max(0, Math.ceil((turnDeadline - nowTick) / 1000))
      : null;
    const turnGaugeFillPct = Math.max(0, Math.min(100, Math.round((turnScore / TURN_GAUGE_MAX) * 100)));
    const turnGaugeMarkerPct = Math.round((MIN_TO_BANK / TURN_GAUGE_MAX) * 100);
    content = (
      <div className="tenk-stage">
        {!finished && currentSeat && (
          <div className="turn-banner">
            {isMyTurn ? (
              <span className="turn-banner-badge">🎲 {t("yourTurnBadge")}</span>
            ) : (
              <span className="turn-banner-badge other">
                {lang === "fr" ? t("tenkOpponentTurnPrefix") + " " : ""}
                {currentSeat.avatar} {currentSeat.username}
                {lang === "fr" ? "" : t("tenkOpponentTurnSuffix")}
              </span>
            )}
            {turnRemaining !== null && (
              <span className={"turn-timer-chip" + (turnRemaining <= 5 ? " hot" : "")}>⏱ {turnRemaining}s</span>
            )}
          </div>
        )}

        <div className="tenk-hud-top">
          <span className="tenk-target-badge">🎯 {t("tenkTargetLabel")} · {target} {t("pts")}</span>
        </div>

        <div className="tenk-layout">
          <aside className={"tenk-combos" + (hintPulse ? " hint-pulse" : "")}>
            <div className="tenk-combos-title">💡 {t("tenkCombosTitle")}</div>
            {/* Les OPTIONS du lancer d'abord (retouche 2026-07) : ce sont
                elles qu'on vient lire dans ce panneau — la bascule "Aide"
                est rabattue tout en bas, en réglage discret. */}
            {!activeDice ? (
              <p className="tenk-combos-empty">{t("tenkCombosEmptyHint")}</p>
            ) : comboRows.length === 0 ? (
              <p className="tenk-combos-empty">{t("tenkCombosNoneHint")}</p>
            ) : (
              <div className="tenk-combo-list">
                {comboRows.map((row, i) => (
                  <button
                    key={row.key}
                    type="button"
                    className={"tenk-combo-row" + (isRowActive(row) ? " active" : "") + (assistOn && i === 0 ? " best" : "")}
                    disabled={!isMyTurn}
                    onClick={() => selectCombo(row)}
                  >
                    {assistOn && i === 0 && <span className="tenk-combo-best-badge">★</span>}
                    <span className="tenk-combo-dice">{row.diceValues.join("-")}</span>
                    <span className="tenk-combo-pts">+{row.points}</span>
                  </button>
                ))}
              </div>
            )}
            {isMyTurn && activeDice && comboRows.length > 0 && (
              <p className="tenk-combos-shortcut">⌘⇧K {t("tenkHintShortcutHint")}</p>
            )}
            <div className="tenk-assist-row bottom">
              <span className="tenk-assist-label">{t("tenkAssistLabel")}</span>
              <button
                type="button"
                className={"settings-switch small" + (assistOn ? " on" : "")}
                onClick={toggleAssist}
                aria-pressed={assistOn}
                title={t("tenkAssistTitle")}
              >
                <span className="settings-switch-knob" />
              </button>
            </div>
          </aside>

          <div className="tenk-main">
            <div className="tenk-felt">
              {banner === "farkle" && <div className="tenk-farkle-flash" />}
              {banner === "hotdice" && <div className="tenk-hotdice-flash" />}
              {penaltyPop && (
                <div className="tenk-penalty-pop">
                  <span className="tenk-penalty-pop-face">😩</span>
                  <span className="tenk-penalty-pop-text">{t("tenkAyoye")}</span>
                  <span className="tenk-penalty-pop-amount">-500</span>
                </div>
              )}
              <div className="tenk-dice-row">
                {orderedDice.map((v, i) => {
                  const j = activeDice ? diceJitter[i] : null;
                  const die = (
                    <TenkDie
                      value={v}
                      ghost={!activeDice}
                      selected={!!activeDice && selected.includes(i)}
                      dead={!!activeDice && selected.includes(i) && deadValueSet.has(v)}
                      rolling={rollFlash}
                      disabled={!isMyTurn || !activeDice}
                      onClick={activeDice ? () => toggleDie(i) : undefined}
                    />
                  );
                  return j ? (
                    <span key={i} className="tenk-die-slot" style={{ transform: "translate(" + j.dx + "px," + j.dy + "px) rotate(" + j.rot + "deg)" }}>
                      {die}
                    </span>
                  ) : (
                    <span key={i} className="tenk-die-slot">{die}</span>
                  );
                })}
              </div>
              {keptDice.length > 0 && (
                <div className="tenk-dice-row" style={{ marginTop: 10 }}>
                  {keptDice.map((v, i) => (
                    <TenkDie key={"k" + i} value={v} kept style={{ transform: "scale(.7)" }} />
                  ))}
                </div>
              )}
            </div>

            {banner === "farkle" && (
              <div className="tenk-farkle-banner">
                💥 {t("tenkFarkleTitle")}
                {lastAction?.type === "farkle" && lastAction.penalty > 0 && (
                  <span className="tenk-farkle-penalty"> — {t("tenkFarklePenalty")}</span>
                )}
              </div>
            )}
            {banner === "hotdice" && <div className="tenk-hotdice-banner">🔥 {t("tenkHotDiceTitle")}</div>}

            <div className="tenk-turn-gauge">
              <div className="tenk-turn-gauge-head">
                <span className="n">{turnScore}</span>
                <span className="lbl">{t("tenkTurnScore")}</span>
              </div>
              <div className="tenk-turn-gauge-track">
                <div className="tenk-turn-gauge-marker" style={{ left: turnGaugeMarkerPct + "%" }} title={t("tenkBankMinHint")} />
                <div className={"tenk-turn-gauge-fill" + (turnScore >= MIN_TO_BANK ? " ready" : "")} style={{ width: turnGaugeFillPct + "%" }} />
              </div>
            </div>
            {isMyTurn && activeDice && (
              <p className="tenk-best-hint">
                {selected.length === 0
                  ? t("tenkSelectHint")
                  : (selEval.valid ? "+" + selEval.points + " " + t("pts") : t("tenkNoScoreHint"))}
              </p>
            )}
            {isMyTurn && !activeDice && turnScore > 0 && turnScore < MIN_TO_BANK && (
              <p className="tenk-best-hint">{t("tenkBankMinHint")}</p>
            )}
            {isMyTurn && !finished && !activeDice && (farkleStreak[me.id] || 0) >= FARKLE_STREAK_LIMIT - 1 && (
              <p className="tenk-best-hint tenk-streak-warn">⚠️ {t("tenkFarkleStreakWarn")}</p>
            )}

            {isMyTurn && !finished && (
              <div className="tenk-actions">
                {!activeDice ? (
                  <>
                    <button className={"tenk-btn-roll" + (hotDiceLock ? " celebrating" : "")} disabled={hotDiceLock} onClick={attemptRoll} title={t("tenkRollSpaceHint")}>
                      {hotDiceLock ? "🔥 " + t("tenkHotDiceTitle") : "🎲 " + t("tenkRoll")}
                    </button>
                    <button className="tenk-btn-bank" disabled={!turnScore || turnScore < MIN_TO_BANK} onClick={attemptBank}>💰 {t("tenkBank")}</button>
                  </>
                ) : (
                  <button className="tenk-btn-keep" disabled={!selected.length || !selEval.valid} onClick={attemptKeep}>
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
          </div>

          <aside className="tenk-sidebar">
            <div className="tenk-leaderboard">
              <div className="tenk-lb-title">🏆 {t("tenkLeaderboard")}</div>
              {rankedSeats.map(({ seat: s, idx, score }, rank) => {
                const pct = Math.max(4, Math.min(100, Math.round((score / target) * 100)));
                return (
                  <div
                    key={s.id}
                    className={"tenk-lb-row" + (s.id === me.id ? " me" : "") + (idx === turnIdx && !finished ? " active" : "")}
                  >
                    <div className="tenk-lb-row-top">
                      <span className="tenk-lb-rank">{rank + 1}</span>
                      <span className="tenk-lb-name">{s.avatar} {s.username}</span>
                      <span className="tenk-lb-score">{score}</span>
                    </div>
                    <div className="tenk-lb-bar-track">
                      <div className="tenk-lb-bar-fill" style={{ width: pct + "%" }} />
                    </div>
                  </div>
                );
              })}
              <div className="tenk-lb-target">{t("tenkTargetLabel")} · {target} {t("pts")}</div>
            </div>
          </aside>
        </div>

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
    <div className="panel tenk-panel">
      <h1>{t("tenkTitle")}</h1>
      <Crossfade id={phase + ":" + finished}>{content}</Crossfade>
      {/* Décompte 3-2-1 aux couleurs néon du jeu : couvre tout le panneau
          et bloque les clics le temps que chacun soit prêt. */}
      {countingDown && phase === "playing" && (
        <GameCountdown variant="tenk" onDone={() => setCountingDown(false)} />
      )}
    </div>
  );
}
