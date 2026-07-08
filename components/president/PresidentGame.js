"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby } from "@/lib/gameSync";
import Crossfade from "@/components/Crossfade";
import PresCard from "./PresCard";
import {
  dealAll, shuffle, isLegalPlay, hasLegalPlay, pointsForPlace, TWO_V,
  takeBest, sortHand, exchangeRoles, findLowestCardSeatIdx,
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
  const [selected, setSelected] = useState([]);
  const [giveSelected, setGiveSelected] = useState([]);
  const [myGain, setMyGain] = useState(0);
  const [channelReady, setChannelReady] = useState(false);

  const channelRef = useRef(null);
  const stateRef = useRef(null);
  const savedResultRef = useRef(false);
  const autoStartedRef = useRef(false);
  const restoredRef = useRef(false);
  const botTimer = useRef(null);

  useEffect(() => {
    stateRef.current = { seats, hands, current, turnIdx, passed, finishedOrder, over, matchPhase, exchange };
  }, [seats, hands, current, turnIdx, passed, finishedOrder, over, matchPhase, exchange]);

  function applyLocalState(s, extra = {}) {
    setSeats(s.seats); setHands(s.hands); setCurrent(s.current || null);
    setTurnIdx(s.turnIdx); setPassed(s.passed || []);
    setFinishedOrder(s.finishedOrder || []); setOver(!!s.over);
    setLastAction(s.lastAction || null);
    setMatchPhase(s.matchPhase || "trick"); setExchange(s.exchange || null);
    setSelected([]); setGiveSelected([]);
    if (extra.resetGain) { setMyGain(0); savedResultRef.current = false; }
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
      persist(payload);
      scheduleNext();
    });

    ch.on("broadcast", { event: "state" }, ({ payload }) => {
      applyLocalState(payload);
      persist(payload);
    });

    ch.on("broadcast", { event: "move_attempt" }, ({ payload }) => {
      if (!isHost) return;
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
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, isHost]);

  function broadcastNewState(next) {
    channelRef.current.send({ type: "broadcast", event: "state", payload: next });
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
      const next = { seats: s.seats, hands: h, current: cur, turnIdx: ti, passed: ps, finishedOrder: fo, over, lastAction, matchPhase: "trick", exchange: null };
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

    const next = { seats: s.seats, hands: h, current: cur, turnIdx: ti, passed: ps, finishedOrder: fo, over, lastAction, matchPhase: "trick", exchange: null };
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

    const pending = s.exchange.pending.map(e => e === entry ? { ...e, done: true } : e);
    const allDone = pending.every(e => e.done);

    const next = allDone
      ? {
          seats: s.seats, hands: h, current: null,
          turnIdx: s.seats.findIndex(x => x.id === s.exchange.nextLeaderId),
          passed: [], finishedOrder: [], over: false, lastAction: null,
          matchPhase: "trick", exchange: null,
        }
      : {
          seats: s.seats, hands: h, current: null, turnIdx: s.turnIdx,
          passed: [], finishedOrder: [], over: false, lastAction: null,
          matchPhase: "exchange", exchange: { pending, nextLeaderId: s.exchange.nextLeaderId },
        };
    broadcastNewState(next);
    scheduleNext();
  }

  function scheduleNext() {
    if (!isHost) return;
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
    }, 900);
  }

  function startFirstRound(humanSeats) {
    const bots = [];
    for (let i = humanSeats.length + 1; i <= tableSize; i++) bots.push(makeBotSeat(i - humanSeats.length));
    const seatsFull = shuffle([...humanSeats, ...bots]);
    const initial = dealFirstRound(seatsFull);
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: initial });
  }

  useEffect(() => {
    if (!isHost || phase !== "intro" || autoStartedRef.current || !channelReady || !tableSize) return;
    if (players.length <= tableSize) {
      autoStartedRef.current = true;
      const humanSeats = players.map(p => ({ id: p.profile_id, username: p.profiles?.username, avatar: p.profiles?.avatar, isBot: false }));
      startFirstRound(humanSeats);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, channelReady, players.length, tableSize]);

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
    if (!isHost || !seats.length || !over) return;
    const next = dealNextRound(seats, finishedOrder);
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: next });
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

  const myGiveEntry = matchPhase === "exchange" && isPlayer
    ? exchange?.pending?.find(e => e.superior === me.id && !e.done) : null;
  const myWaitEntry = matchPhase === "exchange" && isPlayer
    ? exchange?.pending?.find(e => e.inferior === me.id && !e.done) : null;

  function onCardClick(card) {
    if (!isMyTurn) return;
    setSelected(prev => {
      if (prev.includes(card.id)) return current ? [] : prev.filter(x => x !== card.id);
      if (current) {
        const sameRank = myHand.filter(c => c.v === card.v);
        if (sameRank.length < current.count) return prev;
        return sameRank.slice(0, current.count).map(c => c.id);
      }
      const prevCards = prev.map(id => myHand.find(c => c.id === id)).filter(Boolean);
      if (prevCards.length && prevCards[0].v !== card.v) return [card.id];
      if (prev.length >= 4) return prev;
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

  if (phase === "playing" && matchPhase === "exchange") {
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
              {myHand.map(card => (
                <PresCard key={card.id} card={card} size="sm" sel={giveSelected.includes(card.id)} onClick={() => onGiveCardClick(card)} />
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
      : isPlayer ? `${t("chromatikWaitingFor")} ${turnSeat?.username}…`
      : t("chromatikSpectating");

    content = (
      <div>
        <div className="chromatik-opponents">
          {seats.filter(x => x.id !== me.id).map(x => {
            const place = finishedOrder.indexOf(x.id);
            return (
              <div key={x.id} className={"chromatik-opponent" + (turnSeat?.id === x.id && !over ? " active" : "")}>
                <span className="avatar">{x.avatar}</span>
                <span className="name">{x.username}</span>
                {place !== -1
                  ? <span className="pres-badge out">{t(rankKey(place, seats.length))}</span>
                  : passed.includes(x.id)
                    ? <span className="pres-badge">{t("presPassedTag")}</span>
                    : <span className="count">{(hands[x.id] || []).length} 🂠</span>}
              </div>
            );
          })}
        </div>

        <div className="pres-table">
          {current ? (
            <>
              <div className="pres-pile">
                {current.cards.map(c => <PresCard key={c.id} card={c} size="md" glow />)}
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

        {!over && (
          <p className="muted" style={{ textAlign: "center", margin: "10px 0 4px", minHeight: 18, fontWeight: isMyTurn ? 800 : 400, color: isMyTurn ? "var(--ink)" : undefined }}>
            {statusLine}
          </p>
        )}

        {isPlayer && !iFinished && !over && (
          <>
            <div className="pres-hand">
              {myHand.map(card => {
                const playableAlone = !current
                  || (card.v >= current.v && myHand.filter(c => c.v === card.v).length >= current.count);
                return (
                  <PresCard
                    key={card.id} card={card} size="sm"
                    sel={selected.includes(card.id)}
                    dim={!isMyTurn || !playableAlone}
                    onClick={() => onCardClick(card)}
                  />
                );
              })}
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
            ✨ {t("presFinishedYou")} {t(rankKey(finishedOrder.indexOf(me.id), seats.length))}
          </p>
        )}

        {over && (
          <div style={{ marginTop: 14 }}>
            <h2 style={{ textAlign: "center", fontFamily: "'Bungee'", fontSize: 17, marginBottom: 10 }}>🏁 {t("presOverTitle")}</h2>
            <div className="pres-podium">
              {finishedOrder.map((id, place) => {
                const seat = seats.find(x => x.id === id);
                return (
                  <div key={id} className={"pres-podium-row" + (place === 0 ? " first" : "") + (id === me.id ? " me" : "")}>
                    <span className="place">{place + 1}</span>
                    <span>{seat?.avatar}</span>
                    <span className="name">{seat?.username}</span>
                    <span className="title">{t(rankKey(place, seats.length))}</span>
                    <b className="pts">+{pointsForPlace(place, seats.length)}</b>
                  </div>
                );
              })}
            </div>
            {isPlayer && (
              <p style={{ fontWeight: 800, textAlign: "center", marginTop: 12 }}>
                {t("peYourGain")} <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>+{myGain} {t("pts")}</span>
              </p>
            )}
            <p className="muted" style={{ textAlign: "center", fontSize: 12, marginTop: 4 }}>{t("presNextExchangeHint")}</p>
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
    <div className="panel" style={{ maxWidth: "min(820px, 94vw)" }}>
      <h1>{t("presTitle")}</h1>
      <Crossfade id={phase + ":" + matchPhase}>{content}</Crossfade>
    </div>
  );
}
