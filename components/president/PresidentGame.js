"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby } from "@/lib/gameSync";
import Crossfade from "@/components/Crossfade";
import GameCountdown, { COUNTDOWN_MS } from "@/components/GameCountdown";
import PresCard from "./PresCard";
import {
  dealAll, shuffle, isLegalPlay, hasLegalPlay, pointsForPlace, TWO_V,
  takeBest, sortHand, exchangeRoles, findLowestCardSeatIdx, dealDictatorRound,
} from "./deck52";
import { decideBotMove, decideBotGiveback } from "./botLogic";

/* ==========================================================================
   PRÉSIDENT — jeu de plis à combinaisons, 2 à 4 joueurs, sièges vides
   comblés par des bots (heuristique sensée, voir ./botLogic.js).

   Pattern réseau : hôte arbitre, copie conforme de Chromatik. Les joueurs
   envoient des `move_attempt` en broadcast ; SEUL l'hôte valide (via les
   règles pures de ./deck52.js) et rediffuse `state`. Les bots ne sont pas
   des participants réseau : l'hôte joue pour eux.

   Règles : voir l'en-tête de ./deck52.js pour les plis, et l'en-tête de
   `exchangeRoles` (même fichier) pour l'échange de cartes entre manches
   — règle vérifiée (Wikipedia, pagat.com) : à la fin d'une manche, le Trou
   donne ses 2 meilleures cartes au Président (qui rend 2 cartes de son
   choix), et à 4 joueurs le Vice-Trou/Vice-Président font de même avec 1
   carte. Aucun échange à la toute première manche d'un match.

   Déroulé d'une manche (matchPhase diffusé dans l'état) :
   - "exchange" : uniquement après la 1ère manche. Les dons forcés
     (Trou -> Président, Vice-Trou -> Vice-Président) sont déjà appliqués
     par l'hôte AVANT diffusion (aucune action requise du donneur, c'est
     la règle). Ne reste en attente que le RETOUR : le Président/Vice-
     Président doit choisir les cartes qu'il rend. `exchange.pending`
     liste ces retours encore dus.
   - "trick" : la manche se joue normalement (plis, cf. ci-dessus).

   Confidentialité des mains : même modèle de confiance que Chromatik
   (l'état complet transite, chaque client n'affiche que sa main).
   ========================================================================== */

const GAME_ID = "president";
const BOT_AVATARS = ["🤖", "🦾", "👾"];
// Minuteur de tour humain (voir armHumanTurnTimer plus bas) : 30s par défaut
// (20s jugés trop stressants à l'usage), réduit à 5s après 2 dépassements
// consécutifs du MÊME joueur, remis à 30s dès qu'il rejoue de lui-même. Ne
// concerne jamais les bots (déjà temporisés séparément par scheduleNext).
const HUMAN_TURN_MS = 30000;
const HUMAN_TURN_SHORT_MS = 5000;
const HUMAN_TURN_STRIKES = 2;

function makeBotSeat(n) {
  return { id: "bot" + n, username: "Bot " + n, avatar: BOT_AVATARS[(n - 1) % BOT_AVATARS.length], isBot: true };
}

// Toute première manche d'un match : aucun classement précédent, donc
// aucun échange. Le meneur est le porteur du 3♠ (règle traditionnelle),
// pas un siège arbitraire.
function dealFirstRound(seats) {
  const hands = dealAll(seats);
  const leaderIdx = findLowestCardSeatIdx(seats, hands);
  return {
    seats, hands,
    current: null, turnIdx: leaderIdx, passed: [], finishedOrder: [], over: false,
    lastAction: null, matchPhase: "trick", exchange: null,
  };
}

// Manche suivante : nouvelle donne + échange de cartes basé sur le
// classement de la manche précédente (voir exchangeRoles pour le détail).
function dealNextRound(seats, prevFinishedOrder) {
  const hands = dealAll(seats);
  const roles = exchangeRoles(prevFinishedOrder, seats.length);
  roles.forEach(({ giver, receiver, count }) => {
    const { taken, rest } = takeBest(hands[giver], count);
    hands[giver] = rest;
    hands[receiver] = sortHand(hands[receiver].concat(taken));
  });
  const pending = roles.map(r => ({ superior: r.receiver, inferior: r.giver, count: r.count, done: false }));
  return {
    seats, hands,
    current: null, turnIdx: 0, passed: [], finishedOrder: [], over: false,
    lastAction: null,
    matchPhase: pending.length ? "exchange" : "trick",
    exchange: pending.length ? { pending, nextLeaderId: prevFinishedOrder[0] } : null,
  };
}

// Libellé du rang de sortie selon la place et la taille de table.
function rankKey(place, nSeats) {
  if (place === 0) return "presRank1";
  if (place === nSeats - 1) return "presRankLast";
  if (place === 1 && nSeats === 4) return "presRank2";
  if (nSeats === 4) return "presRank3";
  return "presRankMid";
}

// Emoji attaché à chaque rang. Rendu SÉPARÉMENT du libellé i18n pour
// pouvoir styler le 💩 du Trou en "arc-en-ciel" (animation hue-rotate,
// classe .pres-poo dans globals.css) — impossible si l'emoji restait
// noyé dans la chaîne de traduction.
function rankEmoji(place, nSeats) {
  if (place === 0) return "👑";
  if (place === nSeats - 1) return "💩";
  if (place === 1 && nSeats === 4) return "🎩";
  if (nSeats === 4) return "🤡"; // Vice-Trou
  return "😐";
}
function RankTag({ place, nSeats, t }) {
  const emoji = rankEmoji(place, nSeats);
  return (
    <>
      {t(rankKey(place, nSeats))}{" "}
      <span className={emoji === "💩" ? "pres-poo" : undefined}>{emoji}</span>
    </>
  );
}

export default function PresidentGame({ room, me, isHost, players, t, lang, onFinish }) {
  const [phase, setPhase] = useState("intro");
  const [tableSize, setTableSize] = useState(null);
  const [picked, setPicked] = useState([]);
  const [seats, setSeats] = useState([]);
  const [hands, setHands] = useState({});
  const [current, setCurrent] = useState(null);
  const [turnIdx, setTurnIdx] = useState(0);
  const [passed, setPassed] = useState([]);
  const [finishedOrder, setFinishedOrder] = useState([]);
  const [over, setOver] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [matchPhase, setMatchPhase] = useState("trick");
  const [exchange, setExchange] = useState(null);
  const [joke, setJoke] = useState(false); // manche "Dictateur" bonus en cours (hors classement)
  const [selected, setSelected] = useState([]);
  const [giveSelected, setGiveSelected] = useState([]);
  const [myGain, setMyGain] = useState(0);
  const [channelReady, setChannelReady] = useState(false);
  // Système de mandats : accumulés (Président/Vice-Président) manche après
  // manche, synchronisés dans chaque état diffusé (voir matchMetaRef plus
  // bas). `champion` = id du siège qui a atteint la cible -> fin du MATCH
  // (pas seulement de la manche).
  const [mandates, setMandates] = useState({});
  const [target, setTarget] = useState(3);
  const [champion, setChampion] = useState(null);
  // Choix de la cible de mandats par l'hôte, AVANT la toute première manche
  // (écran de setup, purement local tant que le match n'a pas démarré).
  const [pendingTarget, setPendingTarget] = useState(3);
  const [targetConfirmed, setTargetConfirmed] = useState(false);
  // Recap d'échange de cartes (fin de manche, hors 1ère) : qui a donné
  // quelles cartes à qui, affiché quelques instants avant d'attaquer la
  // manche suivante.
  const [exchangeRecap, setExchangeRecap] = useState(null); // [{giver, receiver, cards}] | null
  // Animation de "brûlage" (2 posé) : capture le pli qui vient d'être
  // brûlé (cartes de l'ancien pli + le/les 2 posés) pour un fondu en
  // cendres au lieu d'une disparition sèche. Purement cosmétique/local.
  const [burningPile, setBurningPile] = useState(null); // { cards, key } | null
  // Minuteur de tour humain (affichage) : deadline + siège concerné, diffusés
  // par l'hôte (voir computeTurnDeadline/armHumanTurnTimer) dans chaque état
  // réseau — tous les clients calculent le compte à rebours localement à
  // partir de ce même horodatage, jamais de minuteur divergent d'un écran
  // à l'autre.
  const [turnDeadline, setTurnDeadline] = useState(null);
  const [turnDeadlineSeat, setTurnDeadlineSeat] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  // Décompte 3-2-1 de début de manche (demande 2026-07) : affiché à chaque
  // match_start (nouvelle manche, nouveau match, tour Dictateur — jamais
  // lors d'une reprise sur rechargement).
  const [countingDown, setCountingDown] = useState(false);

  const channelRef = useRef(null);
  const stateRef = useRef(null);
  const savedResultRef = useRef(false);
  const autoStartedRef = useRef(false);
  const restoredRef = useRef(false);
  const botTimer = useRef(null);
  // Mandats/cible/champion : maintenus côté hôte, rattachés automatiquement
  // à CHAQUE état diffusé (voir broadcastNewState/sendMatchStart) — évite
  // de devoir modifier chacun des nombreux points d'émission de `next`.
  const matchMetaRef = useRef({ mandates: {}, target: 3, champion: null });
  const prevCurrentRef = useRef(null); // pli juste avant la mise à jour, pour l'animation de burn
  const burnTimerRef = useRef(null);
  const recapTimerRef = useRef(null);
  const turnTimeoutRef = useRef(null);  // setTimeout qui déclenche l'action automatique du joueur humain actif
  const turnStrikesRef = useRef({});    // seatId -> nombre de dépassements consécutifs (remis à 0 dès qu'il rejoue)
  const turnMetaRef = useRef({ deadline: null, seatId: null }); // dernière deadline diffusée
  // Fin du décompte 3-2-1 côté hôte : les bots (scheduleNext) et le minuteur
  // du premier tour humain (sendMatchStart) attendent cette échéance.
  const countdownEndRef = useRef(0);

  useEffect(() => {
    stateRef.current = { seats, hands, current, turnIdx, passed, finishedOrder, over, matchPhase, exchange, joke };
  }, [seats, hands, current, turnIdx, passed, finishedOrder, over, matchPhase, exchange, joke]);

  // Miroir séparé : la valeur de `current` juste avant le PROCHAIN
  // applyLocalState (utilisé pour l'animation de burn ci-dessus).
  useEffect(() => { prevCurrentRef.current = current; }, [current]);
  useEffect(() => () => { clearTimeout(burnTimerRef.current); clearTimeout(recapTimerRef.current); }, []);

  useEffect(() => {
    if (!turnDeadline) return;
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [turnDeadline]);

  function applyLocalState(s, extra = {}) {
    // Capture le pli tel qu'il était juste AVANT cette mise à jour : c'est
    // lui qui doit partir en cendres si ce coup est un "burn" (un 2 posé).
    const prevCurrent = prevCurrentRef.current;
    setSeats(s.seats); setHands(s.hands); setCurrent(s.current || null);
    setTurnIdx(s.turnIdx); setPassed(s.passed || []);
    setFinishedOrder(s.finishedOrder || []); setOver(!!s.over);
    setLastAction(s.lastAction || null);
    setMatchPhase(s.matchPhase || "trick"); setExchange(s.exchange || null);
    setJoke(!!s.joke);
    setSelected([]); setGiveSelected([]);
    setMandates(s.mandates || {}); setTarget(s.target || 3); setChampion(s.champion || null);
    setTurnDeadline(s.turnDeadline || null); setTurnDeadlineSeat(s.turnDeadlineSeat || null);
    if (extra.resetGain) { setMyGain(0); savedResultRef.current = false; }

    if (!s.current && s.lastAction?.type === "burn") {
      const burned = (prevCurrent?.cards || []).concat(s.lastAction.cards || []);
      clearTimeout(burnTimerRef.current);
      setBurningPile({ cards: burned, key: Date.now() + "" });
      burnTimerRef.current = setTimeout(() => setBurningPile(null), 950);
    }
  }

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
      // Décompte 3-2-1 avant la première carte (jamais au rechargement).
      // Les bots attendent la fin du décompte via countdownEndRef.
      countdownEndRef.current = Date.now() + COUNTDOWN_MS;
      setCountingDown(true);
      persist(payload);
      scheduleNext();
    });

    ch.on("broadcast", { event: "state" }, ({ payload }) => {
      applyLocalState(payload);
      persist(payload);
    });

    ch.on("broadcast", { event: "move_attempt" }, ({ payload }) => {
      if (!isHost) return;
      // Un message reçu de ce siège = il n'est plus AFK : on lui redonne le
      // bénéfice du délai complet (30s) pour son PROCHAIN tour, que ce
      // coup-ci soit finalement légal ou non.
      turnStrikesRef.current[payload.seatId] = 0;
      hostApplyMove(payload.seatId, payload.action);
    });

    ch.on("broadcast", { event: "giveback_attempt" }, ({ payload }) => {
      if (!isHost) return;
      hostApplyGiveback(payload.seatId, payload.cardIds);
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
            if (isHost) scheduleNext();
          }
        }
      }
    });

    return () => {
      clearTimeout(botTimer.current);
      clearTimeout(turnTimeoutRef.current);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, isHost]);

  // Calcule, à partir d'un état sur le point d'être diffusé, la deadline du
  // tour humain à venir (ou { null, null } : pas de minuteur — bot, personne
  // en jeu, manche/échange hors "trick", ou joueur déjà arrivé). Pure
  // lecture de turnStrikesRef (jamais de mutation ici) : c'est
  // armHumanTurnTimer(), juste après, qui arme le VRAI minuteur avec
  // exactement cette même durée — affichage et action automatique ne
  // peuvent donc jamais diverger.
  function computeTurnDeadline(next) {
    if (!next || next.over || !next.seats || !next.seats.length) return { deadline: null, seatId: null };
    if (next.matchPhase && next.matchPhase !== "trick") return { deadline: null, seatId: null };
    const seat = next.seats[next.turnIdx];
    if (!seat || seat.isBot) return { deadline: null, seatId: null };
    if ((next.finishedOrder || []).includes(seat.id)) return { deadline: null, seatId: null };
    const strikes = turnStrikesRef.current[seat.id] || 0;
    const ms = strikes >= HUMAN_TURN_STRIKES ? HUMAN_TURN_SHORT_MS : HUMAN_TURN_MS;
    return { deadline: Date.now() + ms, seatId: seat.id };
  }

  // Arme le minuteur qui, si le joueur humain actif ne fait rien, joue à sa
  // place à l'échéance : passe s'il y a un pli à suivre (comme le bouton
  // "Passer"), ou pose sa carte la plus faible en solo s'il doit OUVRIR le
  // pli (impossible de "passer" en tête de pli, la règle l'exige). Chaque
  // dépassement incrémente son compteur de grillages consécutifs
  // (turnStrikesRef), remis à 0 dès qu'il rejoue de lui-même.
  function armHumanTurnTimer() {
    clearTimeout(turnTimeoutRef.current);
    if (!isHost) return;
    const { deadline, seatId } = turnMetaRef.current;
    if (!deadline || !seatId) return;
    const delay = Math.max(0, deadline - Date.now());
    turnTimeoutRef.current = setTimeout(() => {
      const s = stateRef.current;
      if (!s || s.over || s.matchPhase !== "trick") return;
      if (!s.seats[s.turnIdx] || s.seats[s.turnIdx].id !== seatId) return; // le tour a déjà changé
      turnStrikesRef.current[seatId] = (turnStrikesRef.current[seatId] || 0) + 1;
      if (s.current) {
        hostApplyMove(seatId, { type: "pass" });
      } else {
        const hand = s.hands[seatId] || [];
        if (!hand.length) return;
        const lowest = hand.reduce((a, b) => (b.v < a.v ? b : a), hand[0]);
        hostApplyMove(seatId, { type: "play", cardIds: [lowest.id] });
      }
    }, delay);
  }

  function broadcastNewState(next) {
    const meta = matchMetaRef.current;
    const tm = computeTurnDeadline(next);
    turnMetaRef.current = tm;
    channelRef.current.send({
      type: "broadcast", event: "state",
      payload: { ...next, mandates: meta.mandates, target: meta.target, champion: meta.champion, turnDeadline: tm.deadline, turnDeadlineSeat: tm.seatId },
    });
    armHumanTurnTimer();
  }
  function sendMatchStart(payload) {
    // Nouvelle manche/match : chacun repart avec le délai complet (30s),
    // aucun grillage précédent ne doit peser sur ce nouveau départ.
    turnStrikesRef.current = {};
    const meta = matchMetaRef.current;
    const tm = computeTurnDeadline(payload);
    // Décompte 3-2-1 : le premier tour humain ne commence à décompter ses
    // 30 s qu'après le décompte (l'overlay bloque les clics pendant ce temps).
    if (tm.deadline) tm.deadline += COUNTDOWN_MS;
    turnMetaRef.current = tm;
    channelRef.current.send({
      type: "broadcast", event: "match_start",
      payload: { ...payload, mandates: meta.mandates, target: meta.target, champion: meta.champion, turnDeadline: tm.deadline, turnDeadlineSeat: tm.seatId },
    });
    armHumanTurnTimer();
  }

  function nextActiveIdx(s, idx) {
    for (let step = 1; step <= s.seats.length; step++) {
      const i = (idx + step) % s.seats.length;
      if (!s.finishedOrder.includes(s.seats[i].id)) return i;
    }
    return idx;
  }
  function nextEligibleIdx(s, idx) {
    for (let step = 1; step <= s.seats.length; step++) {
      const i = (idx + step) % s.seats.length;
      const id = s.seats[i].id;
      if (!s.finishedOrder.includes(id) && !s.passed.includes(id)) return i;
    }
    return -1;
  }

  function hostApplyMove(seatId, action) {
    const s = stateRef.current;
    if (!s || s.over || s.matchPhase !== "trick" || !s.seats.length) return;
    const currentSeat = s.seats[s.turnIdx];
    if (!currentSeat || currentSeat.id !== seatId) return;
    if (s.finishedOrder.includes(seatId)) return;

    let { hands: h, current: cur, turnIdx: ti, passed: ps, finishedOrder: fo } = s;
    h = { ...h }; ps = ps.slice(); fo = fo.slice();
    const hand = h[seatId] || [];
    let over = false;
    let lastAction = null;

    if (action.type === "pass") {
      if (!cur) return;
      ps.push(seatId);
      lastAction = { type: "pass", seatId };
      const nx = nextEligibleIdx({ ...s, passed: ps, finishedOrder: fo }, ti);
      if (nx === -1) {
        const byIdx = s.seats.findIndex(x => x.id === cur.by);
        ti = nextActiveIdx({ ...s, finishedOrder: fo }, byIdx);
        cur = null; ps = [];
      } else if (s.seats[nx].id === cur.by) {
        lastAction = { type: "trick", seatId: cur.by };
        ti = nx; cur = null; ps = [];
      } else {
        ti = nx;
      }
      const next = { seats: s.seats, hands: h, current: cur, turnIdx: ti, passed: ps, finishedOrder: fo, over, lastAction, matchPhase: "trick", exchange: null, joke: s.joke };
      broadcastNewState(next);
      scheduleNext();
      return;
    }

    const cards = (action.cardIds || []).map(id => hand.find(c => c.id === id)).filter(Boolean);
    if (cards.length !== (action.cardIds || []).length) return;
    if (!isLegalPlay(cards, cur)) return;

    const playedIds = new Set(cards.map(c => c.id));
    h[seatId] = hand.filter(c => !playedIds.has(c.id));
    const isBurn = cards[0].v === TWO_V;
    lastAction = { type: isBurn ? "burn" : "play", seatId, cards };

    if (h[seatId].length === 0) {
      fo.push(seatId);
      const actives = s.seats.filter(x => !fo.includes(x.id));
      if (actives.length === 1) { fo.push(actives[0].id); over = true; }
    }

    if (over) {
      // Manche "Dictateur" (bonus pour rire) : ne compte JAMAIS pour les
      // mandats — le Dictateur en titre reste le même quoi qu'il arrive ici,
      // matchMetaRef n'est même pas consulté.
      if (s.joke) {
        const next = { seats: s.seats, hands: h, current: null, turnIdx: ti, passed: [], finishedOrder: fo, over, lastAction, matchPhase: "trick", exchange: null, joke: true };
        broadcastNewState(next);
        return;
      }
      // Mandats : SEUL le Président (place 0) en gagne un. Le Vice-
      // Président ne compte JAMAIS pour la victoire — être Vice-Président
      // ne rapproche pas du titre de Dictateur, seule la place de
      // Président fait avancer le compteur. Dès qu'un siège atteint la
      // cible choisie par l'hôte, il devient Dictateur — c'est le MATCH
      // entier qui se termine, pas seulement cette manche.
      const meta = matchMetaRef.current;
      const newMandates = { ...meta.mandates };
      newMandates[fo[0]] = (newMandates[fo[0]] || 0) + 1;
      let champ = null;
      for (const seat of s.seats) {
        if ((newMandates[seat.id] || 0) >= meta.target) { champ = seat.id; break; }
      }
      matchMetaRef.current = { mandates: newMandates, target: meta.target, champion: champ };
      const next = { seats: s.seats, hands: h, current: null, turnIdx: ti, passed: [], finishedOrder: fo, over, lastAction, matchPhase: "trick", exchange: null };
      broadcastNewState(next);
      return;
    }

    if (isBurn) {
      cur = null; ps = [];
      ti = fo.includes(seatId) ? nextActiveIdx({ ...s, finishedOrder: fo }, ti) : ti;
    } else {
      cur = { count: cards.length, v: cards[0].v, cards, by: seatId };
      const nx = nextEligibleIdx({ ...s, passed: ps, finishedOrder: fo }, ti);
      if (nx === -1 || s.seats[nx].id === seatId) {
        cur = null; ps = [];
        ti = fo.includes(seatId) ? nextActiveIdx({ ...s, finishedOrder: fo }, ti) : ti;
      } else {
        ti = nx;
      }
    }

    const next = { seats: s.seats, hands: h, current: cur, turnIdx: ti, passed: ps, finishedOrder: fo, over, lastAction, matchPhase: "trick", exchange: null, joke: s.joke };
    broadcastNewState(next);
    scheduleNext();
  }

  function hostApplyGiveback(seatId, cardIds) {
    const s = stateRef.current;
    if (!s || s.matchPhase !== "exchange" || !s.exchange) return;
    const entry = s.exchange.pending.find(e => e.superior === seatId && !e.done);
    if (!entry || !cardIds || cardIds.length !== entry.count) return;

    const hand = s.hands[seatId] || [];
    const cards = cardIds.map(id => hand.find(c => c.id === id)).filter(Boolean);
    if (cards.length !== cardIds.length) return;

    const givenIds = new Set(cardIds);
    const h = { ...s.hands };
    h[seatId] = hand.filter(c => !givenIds.has(c.id));
    h[entry.inferior] = sortHand((h[entry.inferior] || []).concat(cards));

    const pending = s.exchange.pending.map(e => e === entry ? { ...e, done: true, cardsGiven: cards } : e);
    const allDone = pending.every(e => e.done);

    const next = allDone
      ? {
          seats: s.seats, hands: h, current: null,
          turnIdx: s.seats.findIndex(x => x.id === s.exchange.nextLeaderId),
          passed: [], finishedOrder: [], over: false, lastAction: null,
          // Étape intermédiaire "recap" : affiche qui a donné quelles cartes
          // à qui avant d'attaquer réellement la manche (matchPhase "trick"
          // n'arrive qu'après, via scheduleRecapAdvance).
          matchPhase: "recap",
          exchange: { pending, nextLeaderId: s.exchange.nextLeaderId },
        }
      : {
          seats: s.seats, hands: h, current: null, turnIdx: s.turnIdx,
          passed: [], finishedOrder: [], over: false, lastAction: null,
          matchPhase: "exchange", exchange: { pending, nextLeaderId: s.exchange.nextLeaderId },
        };
    broadcastNewState(next);
    if (allDone) scheduleRecapAdvance(next);
    else scheduleNext();
  }

  // La manche réelle ("trick") ne démarre qu'après un court délai
  // d'affichage du récap d'échange — le temps que tout le monde voie qui a
  // donné quoi à qui. Seul l'hôte déclenche cette transition.
  function scheduleRecapAdvance(recapState) {
    if (!isHost) return;
    clearTimeout(recapTimerRef.current);
    recapTimerRef.current = setTimeout(() => {
      const trickState = { ...recapState, matchPhase: "trick", exchange: null };
      broadcastNewState(trickState);
      scheduleNext();
    }, 4200);
  }

  // Tempo "humain" des bots : entre 1 et 5 secondes, tiré au hasard à
  // chaque coup (un vrai joueur ne joue jamais à cadence fixe). Le timer
  // précédent est TOUJOURS annulé avant d'en poser un nouveau : sans ça,
  // plusieurs broadcasts rapprochés empileraient des timers périmés qui
  // feraient jouer le bot suivant trop vite.
  function scheduleNext() {
    if (!isHost) return;
    clearTimeout(botTimer.current);
    // 1s à 5s — mais jamais avant la fin du décompte 3-2-1 : un bot qui
    // jouerait sa carte pendant l'overlay casserait l'effet de départ.
    const delay = Math.max(1000 + Math.floor(Math.random() * 4000), countdownEndRef.current - Date.now());
    botTimer.current = setTimeout(() => {
      const s = stateRef.current;
      if (!s) return;
      if (s.matchPhase === "exchange" && s.exchange) {
        const entry = s.exchange.pending.find(e => !e.done);
        if (!entry) return;
        const seat = s.seats.find(x => x.id === entry.superior);
        if (!seat || !seat.isBot) return;
        const cardIds = decideBotGiveback(s.hands[seat.id] || [], entry.count);
        hostApplyGiveback(seat.id, cardIds);
        return;
      }
      if (s.over || !s.seats.length) return;
      const seat = s.seats[s.turnIdx];
      if (!seat || !seat.isBot) return;
      const hand = s.hands[seat.id] || [];
      const othersMin = Math.min(...s.seats
        .filter(x => x.id !== seat.id && !s.finishedOrder.includes(x.id))
        .map(x => (s.hands[x.id] || []).length));
      const move = decideBotMove(hand, s.current, { othersMin });
      hostApplyMove(seat.id, move);
    }, delay);
  }

  function startFirstRound(humanSeats) {
    const bots = [];
    for (let i = humanSeats.length + 1; i <= tableSize; i++) bots.push(makeBotSeat(i - humanSeats.length));
    const seatsFull = shuffle([...humanSeats, ...bots]);
    matchMetaRef.current = { mandates: Object.fromEntries(seatsFull.map(s => [s.id, 0])), target: pendingTarget, champion: null };
    const initial = dealFirstRound(seatsFull);
    sendMatchStart(initial);
  }

  useEffect(() => {
    if (!isHost || phase !== "intro" || autoStartedRef.current || !channelReady || !tableSize || !targetConfirmed) return;
    if (players.length <= tableSize) {
      autoStartedRef.current = true;
      const humanSeats = players.map(p => ({ id: p.profile_id, username: p.profiles?.username, avatar: p.profiles?.avatar, isBot: false }));
      startFirstRound(humanSeats);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, channelReady, players.length, tableSize, targetConfirmed]);

  function togglePick(pid) {
    setPicked(prev => prev.includes(pid) ? prev.filter(x => x !== pid) : (prev.length >= tableSize ? prev : [...prev, pid]));
  }
  function confirmPick() {
    if (picked.length === 0 || picked.length > tableSize || !channelReady) return;
    const chosen = picked.map(pid => players.find(p => p.profile_id === pid)).filter(Boolean);
    autoStartedRef.current = true;
    startFirstRound(chosen.map(p => ({ id: p.profile_id, username: p.profiles?.username, avatar: p.profiles?.avatar, isBot: false })));
  }
  function rejouer() {
    if (!isHost || !seats.length || !over || champion) return; // un match déjà remporté ne se "rejoue" pas manche par manche
    const next = dealNextRound(seats, finishedOrder);
    sendMatchStart(next);
  }
  // Un champion a été couronné : on repart sur un tout nouveau match (cartes
  // rebattues, mandats remis à zéro), mêmes sièges.
  function nouveauMatch() {
    if (!isHost || !seats.length) return;
    matchMetaRef.current = { mandates: Object.fromEntries(seats.map(s => [s.id, 0])), target: matchMetaRef.current.target, champion: null };
    const initial = dealFirstRound(shuffle(seats));
    sendMatchStart(initial);
  }
  // Tour "Dictateur" — bonus HUMORISTIQUE demandé par l'hôte une fois le
  // Dictateur couronné : sa main ne contient QUE des 2, il gagne quasi
  // automatiquement. Ne touche JAMAIS aux mandats ni au titre de Dictateur
  // (voir le garde-fou `s.joke` dans hostApplyMove).
  function lancerTourDictateur() {
    if (!isHost || !seats.length || !champion) return;
    const hands = dealDictatorRound(seats, champion);
    const dictIdx = seats.findIndex(s => s.id === champion);
    const initial = {
      seats, hands, current: null, turnIdx: dictIdx, passed: [], finishedOrder: [], over: false,
      lastAction: null, matchPhase: "trick", exchange: null, joke: true,
    };
    sendMatchStart(initial);
  }
  async function backToRoom() {
    await resetRoomToLobby(room.id);
    onFinish && onFinish();
  }

  const mySeat = seats.find(x => x.id === me.id);
  const isPlayer = !!mySeat;
  const myHand = hands[me.id] || [];
  const iFinished = finishedOrder.includes(me.id);
  const isMyTurn = phase === "playing" && matchPhase === "trick" && !over && isPlayer && !iFinished && seats[turnIdx]?.id === me.id;
  const selCards = selected.map(id => myHand.find(c => c.id === id)).filter(Boolean);
  const canPlaySel = isMyTurn && selCards.length > 0 && isLegalPlay(selCards, current);
  const canPass = isMyTurn && !!current;
  const stuck = isMyTurn && !!current && !hasLegalPlay(myHand, current);
  // Compte à rebours du tour humain en cours, calculé localement chez TOUS
  // les clients à partir de la deadline diffusée (turnDeadline/turnDeadlineSeat) :
  // même horodatage partout, jamais de minuteur qui diverge d'un écran à l'autre.
  const turnRemaining = turnDeadline ? Math.max(0, Math.ceil((turnDeadline - now) / 1000)) : null;

  const myGiveEntry = matchPhase === "exchange" && isPlayer
    ? exchange?.pending?.find(e => e.superior === me.id && !e.done) : null;
  const myWaitEntry = matchPhase === "exchange" && isPlayer
    ? exchange?.pending?.find(e => e.inferior === me.id && !e.done) : null;

  // Sélection ENTIÈREMENT manuelle : cliquer une carte ne fait QUE
  // l'ajouter (jamais d'auto-complétion d'une paire/brelan à la place du
  // joueur). Le contrôle reste au joueur — s'il doit jouer "double 6", le
  // jeu ne lui indique rien avant qu'il ait lui-même cliqué un premier 6 ;
  // ce n'est qu'APRÈS ce clic que les autres 6 disponibles se mettent en
  // surbrillance pour l'inviter à compléter, sans jamais les sélectionner
  // à sa place (voir la classe .match, calculée dans le rendu).
  function onCardClick(card) {
    if (!isMyTurn) return;
    setSelected(prev => {
      if (prev.includes(card.id)) return prev.filter(x => x !== card.id);
      const prevCards = prev.map(id => myHand.find(c => c.id === id)).filter(Boolean);
      if (prevCards.length && prevCards[0].v !== card.v) return [card.id]; // nouvelle valeur : on repart
      const cap = current ? current.count : 4;
      if (prev.length >= cap) return prev;
      return [...prev, card.id];
    });
  }

  function onGiveCardClick(card) {
    if (!myGiveEntry) return;
    setGiveSelected(prev => {
      if (prev.includes(card.id)) return prev.filter(x => x !== card.id);
      if (prev.length >= myGiveEntry.count) return prev;
      return [...prev, card.id];
    });
  }

  function attemptPlay() {
    if (!canPlaySel) return;
    channelRef.current?.send({ type: "broadcast", event: "move_attempt", payload: { seatId: me.id, action: { type: "play", cardIds: selected } } });
    setSelected([]);
  }
  function attemptPass() {
    if (!canPass) return;
    channelRef.current?.send({ type: "broadcast", event: "move_attempt", payload: { seatId: me.id, action: { type: "pass" } } });
    setSelected([]);
  }
  function confirmGiveback() {
    if (!myGiveEntry || giveSelected.length !== myGiveEntry.count) return;
    channelRef.current?.send({ type: "broadcast", event: "giveback_attempt", payload: { seatId: me.id, cardIds: giveSelected } });
    setGiveSelected([]);
  }

  useEffect(() => {
    if (!over || savedResultRef.current || !isPlayer) return;
    savedResultRef.current = true;
    const place = finishedOrder.indexOf(me.id);
    const gain = pointsForPlace(place, seats.length);
    setMyGain(gain);
    if (gain <= 0) return;
    (async () => {
      try {
        await supabase.from("game_results").insert({ room_id: room.id, profile_id: me.id, game_id: GAME_ID, points: gain });
        await supabase.rpc("add_points", { p_room: room.id, p_delta: gain });
      } catch (e) {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over]);

  const needsPick = players.length > (tableSize || 0);

  let content;

  if (phase === "playing" && matchPhase === "recap") {
    content = (
      <div>
        <h2 style={{ textAlign: "center", fontFamily: "'Bungee'", fontSize: 16, marginBottom: 12 }}>
          🔄 {t("presExchangeRecapTitle")}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 460, margin: "0 auto 16px" }}>
          {exchange?.pending?.map((e, i) => {
            const sup = seats.find(x => x.id === e.superior);
            const inf = seats.find(x => x.id === e.inferior);
            return (
              <div key={i} className="pres-exchange-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
                <span>{inf?.avatar} <b>{inf?.username}</b> → {sup?.avatar} <b>{sup?.username}</b></span>
                <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                  {(e.cardsGiven || []).map(c => <PresCard key={c.id} card={c} size="sm" />)}
                </div>
              </div>
            );
          })}
        </div>
        <p className="muted" style={{ textAlign: "center" }}>{t("presExchangeRecapContinue")}…</p>
      </div>
    );
  } else if (phase === "playing" && matchPhase === "exchange") {
    content = (
      <div>
        <h2 style={{ textAlign: "center", fontFamily: "'Bungee'", fontSize: 16, marginBottom: 12 }}>
          🔄 {t("presExchangeTitle")}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 420, margin: "0 auto 16px" }}>
          {exchange?.pending?.map((e, i) => {
            const sup = seats.find(x => x.id === e.superior);
            const inf = seats.find(x => x.id === e.inferior);
            return (
              <div key={i} className="pres-exchange-row">
                <span>{inf?.avatar} <b>{inf?.username}</b> → {sup?.avatar} <b>{sup?.username}</b></span>
                <span className={"pres-badge" + (e.done ? " out" : "")}>
                  {e.done ? "✅" : `${e.count} 🂠`}
                </span>
              </div>
            );
          })}
        </div>

        {myGiveEntry && (
          <>
            <p className="muted" style={{ textAlign: "center", fontWeight: 800, color: "var(--ink)" }}>
              {t("presGiveHint").replace("{n}", myGiveEntry.count).replace("{name}", seats.find(x => x.id === myGiveEntry.inferior)?.username || "")}
            </p>
            <div className="pres-hand">
              {myHand.map((card, i) => (
                <PresCard key={card.id} card={card} size="sm" sel={giveSelected.includes(card.id)} onClick={() => onGiveCardClick(card)}
                  style={{ animationDelay: `${i * 35}ms` }} />
              ))}
            </div>
            <div className="pres-actions">
              <button className="btn" disabled={giveSelected.length !== myGiveEntry.count} onClick={confirmGiveback}
                style={{ width: "auto", padding: "12px 26px", marginTop: 0 }}>
                🤝 {t("presConfirmGive")} ({giveSelected.length}/{myGiveEntry.count})
              </button>
            </div>
          </>
        )}

        {myWaitEntry && (
          <p className="muted" style={{ textAlign: "center" }}>{t("presWaitReturn")}</p>
        )}

        {!myGiveEntry && !myWaitEntry && (
          <p className="muted" style={{ textAlign: "center" }}>{t("presExchangeSpectate")}</p>
        )}
      </div>
    );
  } else if (phase === "playing") {
    const turnSeat = seats[turnIdx];
    const statusLine = over ? null
      : isMyTurn ? (current ? (stuck ? t("presMustPass") : t("presYourTurnFollow")) : t("presYourTurnLead"))
      : isPlayer ? `💭 ${turnSeat?.username} ${t("presThinking")}` // tempo humain : les bots "réfléchissent" 1 à 5s
      : t("chromatikSpectating");

    content = (
      <div>
        {joke && (
          <p className="pres-joke-banner">😈 {t("presDictatorRoundBanner")}</p>
        )}

        {/* Sens du tour : toujours le même sens autour de la table (index de
            siège croissant) — une frise d'avatars reliés par des flèches le
            rend visible d'un coup d'œil, plutôt qu'un simple pictogramme. */}
        <div className="pres-turn-order" title={t("presTurnDirection")}>
          {/* Les mandats se lisent désormais ICI (retouche 2026-07) : une
              étoile par manche remportée en Président, directement sous
              l'avatar de chaque siège — l'ancienne rangée de vignettes de
              mandats doublonnait celle des adversaires et créait la
              confusion, elle est supprimée. La cible du match reste
              rappelée par la pastille 👑 en bout de ligne. */}
          {seats.map((s, i) => (
            <span key={s.id} style={{ display: "contents" }}>
              <span className={"pres-turn-seat" + (turnSeat?.id === s.id && !over ? " active" : "") + (s.id === me.id ? " me" : "")}>
                {s.avatar}
                {(mandates[s.id] || 0) > 0 && (
                  <i className="pres-seat-stars" title={`${mandates[s.id]} 👑`}>{"⭐".repeat(Math.min(mandates[s.id] || 0, 5))}</i>
                )}
              </span>
              {i < seats.length - 1 && <span className="pres-turn-arrow">➜</span>}
            </span>
          ))}
          <span className="pres-turn-arrow wrap">↩</span>
          <span className="pres-target-chip" title={t("presMandatesTarget") + " " + target}>👑 {target}</span>
        </div>

        <div className="chromatik-opponents">
          {seats.filter(x => x.id !== me.id).map(x => {
            const place = finishedOrder.indexOf(x.id);
            return (
              <div key={x.id} className={"chromatik-opponent" + (turnSeat?.id === x.id && !over ? " active" : "")}>
                <span className="avatar">{x.avatar}</span>
                <span className="name">{x.username}</span>
                {(mandates[x.id] || 0) > 0 && (
                  <span className="pres-opp-stars" title={`${mandates[x.id]} 👑`}>{"⭐".repeat(Math.min(mandates[x.id] || 0, 5))}</span>
                )}
                {place !== -1
                  ? <span className="pres-badge out"><RankTag place={place} nSeats={seats.length} t={t} /></span>
                  : passed.includes(x.id)
                    ? <span className="pres-badge">{t("presPassedTag")}</span>
                    : turnSeat?.id === x.id && !over
                      ? <span className="pres-think" title={t("presThinking")}>
                          💭<i className="d1">.</i><i className="d2">.</i><i className="d3">.</i>
                          {turnDeadlineSeat === x.id && turnRemaining != null && (
                            <span className={"turn-timer-chip mini" + (turnRemaining <= 5 ? " hot" : "")}>{turnRemaining}s</span>
                          )}
                        </span>
                      : <span className="count">{(hands[x.id] || []).length} 🂠</span>}
              </div>
            );
          })}
        </div>

        <div className={"pres-table" + (!current && lastAction?.type === "burn" ? " burned" : "")}>
          {burningPile ? (
            <div className="pres-pile pres-burn-pile" key={burningPile.key}>
              {burningPile.cards.map((c, i) => (
                <PresCard key={c.id} card={c} size="md" style={{ animationDelay: `${i * 40}ms` }} />
              ))}
            </div>
          ) : current ? (
            <>
              {/* Les cartes du pli arrivent en "vol" (animation presPlayIn,
                  échelonnée) : les clés changent à chaque nouveau coup, donc
                  React remonte les éléments et l'animation se rejoue —
                  jamais de téléportation sèche. */}
              <div className="pres-pile">
                {current.cards.map((c, i) => (
                  <PresCard key={c.id} card={c} size="md" glow style={{ animationDelay: `${i * 70}ms` }} />
                ))}
              </div>
              <p className="muted" style={{ fontSize: 12.5 }}>
                {t("presPlayedBy")} <b>{seats.find(x => x.id === current.by)?.username}</b> — {t("presToBeat")}
              </p>
            </>
          ) : (
            <p className="muted" style={{ fontSize: 13, fontWeight: 700 }}>
              {lastAction?.type === "burn" ? t("presBurn") : "🪄 " + t("presFreePile")}
            </p>
          )}
        </div>

        {!over && isMyTurn && (
          <div className="turn-banner">
            <span className="turn-banner-badge">🫵 {t("yourTurnBadge")}</span>
            {turnRemaining != null && (
              <span className={"turn-timer-chip" + (turnRemaining <= 5 ? " hot" : "")}>⏱ {turnRemaining}s</span>
            )}
          </div>
        )}
        {!over && (
          <p className="muted" style={{ textAlign: "center", margin: "10px 0 4px", minHeight: 18, fontWeight: isMyTurn ? 800 : 400, color: isMyTurn ? "var(--ink)" : undefined }}>
            {statusLine}
          </p>
        )}

        {isPlayer && !iFinished && !over && (
          <>
            <div className="pres-hand">
              {(() => {
                // Surbrillance ("match") uniquement APRÈS que le joueur a lui-même
                // cliqué une première carte — jamais avant. Aucune indication de
                // légalité n'est donnée en amont : toutes les cartes se présentent
                // à égalité tant qu'aucun clic n'a eu lieu.
                const selRank = selCards.length ? selCards[0].v : null;
                const cap = current ? current.count : 4;
                const capReached = selected.length >= cap;
                return myHand.map((card, i) => {
                  const isSel = selected.includes(card.id);
                  const isMatch = isMyTurn && selRank !== null && !isSel && !capReached && card.v === selRank;
                  const isFaded = isMyTurn && selRank !== null && !isSel && !isMatch;
                  return (
                    <PresCard
                      key={card.id} card={card} size="sm"
                      sel={isSel} match={isMatch} faded={isFaded}
                      dim={!isMyTurn}
                      onClick={() => onCardClick(card)}
                      style={{ animationDelay: `${i * 35}ms` }}
                    />
                  );
                });
              })()}
            </div>
            <div className="pres-actions">
              <button className="btn" disabled={!canPlaySel} onClick={attemptPlay}
                style={{ width: "auto", padding: "12px 26px", marginTop: 0 }}>
                🃏 {t("presPlay")}{selCards.length > 1 ? ` ×${selCards.length}` : ""}
              </button>
              <button className="btn ghost" disabled={!canPass} onClick={attemptPass}
                style={{ width: "auto", padding: "12px 22px", marginTop: 0 }}>
                🙅 {t("presPass")}
              </button>
            </div>
            {isMyTurn && !current && <p className="muted" style={{ textAlign: "center", fontSize: 12, marginTop: 6 }}>{t("presSelHint")}</p>}
          </>
        )}

        {isPlayer && iFinished && !over && (
          <p style={{ textAlign: "center", fontWeight: 800, margin: "14px 0" }}>
            ✨ {t("presFinishedYou")} <RankTag place={finishedOrder.indexOf(me.id)} nSeats={seats.length} t={t} />
          </p>
        )}

        {over && (
          <div style={{ marginTop: 14 }}>
            <h2 style={{ textAlign: "center", fontFamily: "'Bungee'", fontSize: 17, marginBottom: 10 }}>
              {joke ? "😈 " + t("presDictatorRoundOverTitle") : champion ? t("presChampionTitle") : "🏁 " + t("presRoundOverTitle")}
            </h2>
            {champion && !joke && (
              <p style={{ textAlign: "center", fontWeight: 800, marginBottom: 12 }}>
                {seats.find(x => x.id === champion)?.avatar} <b>{seats.find(x => x.id === champion)?.username}</b>{" "}
                {t("presChampionText").replace("{n}", target)}
              </p>
            )}
            {joke && (
              <p className="muted" style={{ textAlign: "center", marginBottom: 12 }}>{t("presDictatorRoundOverNote")}</p>
            )}
            <div className="pres-podium">
              {finishedOrder.map((id, place) => {
                const seat = seats.find(x => x.id === id);
                return (
                  <div key={id} className={"pres-podium-row" + (place === 0 ? " first" : "") + (id === me.id ? " me" : "")}>
                    <span className="place">{place + 1}</span>
                    <span>{seat?.avatar}</span>
                    <span className="name">{seat?.username}</span>
                    <span className="title"><RankTag place={place} nSeats={seats.length} t={t} /></span>
                    <b className="pts">+{pointsForPlace(place, seats.length)}</b>
                    {!joke && <span className="muted" style={{ fontSize: 11 }}>👑×{mandates[id] || 0}</span>}
                  </div>
                );
              })}
            </div>
            {isPlayer && (
              <p style={{ fontWeight: 800, textAlign: "center", marginTop: 12 }}>
                {t("peYourGain")} <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>+{myGain} {t("pts")}</span>
              </p>
            )}
            {!champion && !joke && (
              <p className="muted" style={{ textAlign: "center", fontSize: 12, marginTop: 4 }}>{t("presNextExchangeHint")}</p>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
              {isHost ? (
                <>
                  {champion ? (
                    <>
                      <button className="btn ghost" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={lancerTourDictateur}>
                        😈 {joke ? t("presDictatorReplay") : t("presDictatorLaunch")}
                      </button>
                      <button className="btn" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={nouveauMatch}>🔁 {t("presNewMatch")}</button>
                    </>
                  ) : (
                    <button className="btn" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={rejouer}>🔁 {t("c4Rejouer")}</button>
                  )}
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
          <p className="hint">{t("presMandatesHint")}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
            {[3, 4, 5].map(n => (
              <button
                key={n}
                className={"btn" + (pendingTarget === n ? "" : " ghost")}
                style={{ width: "auto", padding: "14px 22px" }}
                onClick={() => setPendingTarget(n)}
              >
                {n} {t("presMandatesUnit")}
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
                <button key={p.id} onClick={() => togglePick(p.profile_id)}
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
          <button className="btn" disabled={picked.length === 0 || picked.length > tableSize} onClick={confirmPick}>
            {t("chromatikPickConfirm")}
          </button>
        </div>
      ) : <p className="muted">{t("chromatikWaitPick")}</p>;
    } else {
      content = <p className="muted">{t("chromatikStarting")}</p>;
    }
  }

  return (
    <div className="panel pres-panel" style={{ maxWidth: "min(820px, 94vw)" }}>
      <h1>{t("presTitle")}</h1>
      <Crossfade id={phase + ":" + matchPhase}>{content}</Crossfade>
      {/* Décompte 3-2-1 aux couleurs vertes du jeu : couvre tout le panneau
          et bloque les clics le temps que chacun ait ses cartes en main. */}
      {countingDown && phase === "playing" && (
        <GameCountdown variant="pres" onDone={() => setCountingDown(false)} />
      )}
    </div>
  );
}
