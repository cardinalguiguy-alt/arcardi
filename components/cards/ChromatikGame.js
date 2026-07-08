"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby } from "@/lib/gameSync";
import Crossfade from "@/components/Crossfade";
import CardView from "./CardView";
import { COLORS, freshDeck, shuffle, canPlay, hasPlayable, drawCards, nextSeatIdx } from "./deck";
import { decideBotMove } from "./botLogic";

/* ==========================================================================
   CHROMATIK — jeu de cartes original (pas UNO : mêmes racines de mécanique
   que toute la famille des jeux de cartes à défausse colorée, mais nom,
   identité visuelle et libellés propres à ARCARDI).

   Pattern réseau : hôte arbitre (comme Puissance 4 / Petits Chevaux). Les
   bots ne sont PAS des participants réseau : quand c'est leur tour, l'HÔTE
   calcule leur coup directement (decideBotMove) et l'applique exactement
   comme un coup humain reçu par broadcast — aucune infrastructure nouvelle.

   Confidentialité des mains : modèle de confiance simple, comme le reste
   de la plateforme (ex: le code des portes de Diapason transite aussi en
   clair). Chaque client REÇOIT l'état complet (toutes les mains), mais
   n'affiche que la sienne en face visible ; celles des autres sont
   rendues dos tourné. Pas de canaux privés par joueur pour cette v1.
   ========================================================================== */

const GAME_ID = "chromatik";
const HAND_SIZE = 7;
const BOT_AVATARS = ["🤖", "🦾", "👾"];
const COLOR_VAR_MAP = { red: "--p1", green: "--p3", blue: "--ludoB", yellow: "--ludoY" };

function makeBotSeat(n) {
  return { id: "bot" + n, username: "Bot " + n, avatar: BOT_AVATARS[(n - 1) % BOT_AVATARS.length], isBot: true };
}

function dealFreshState(seats) {
  let deck = shuffle(freshDeck());
  const hands = {};
  seats.forEach(seat => {
    hands[seat.id] = deck.slice(0, HAND_SIZE);
    deck = deck.slice(HAND_SIZE);
  });
  // Première carte de la défausse : si c'est un joker, on lui assigne une
  // couleur de départ au hasard plutôt que de gérer un cas spécial rare.
  const first = deck.pop();
  const discard = [first];
  const activeColor = first.color || COLORS[Math.floor(Math.random() * COLORS.length)];
  return { seats, hands, deck, discard, activeColor, turnIdx: 0, direction: 1, winner: null, lastAction: null };
}

export default function ChromatikGame({ room, me, isHost, players, t, lang, onFinish }) {
  const [phase, setPhase] = useState("intro"); // intro -> playing (le winner ne fait jamais disparaître la table)
  const [tableSize, setTableSize] = useState(null); // 2 | 3 | 4, choisi par l'hôte
  const [selected, setSelected] = useState([]);
  const [seats, setSeats] = useState([]);
  const [hands, setHands] = useState({});
  const [deck, setDeck] = useState([]);
  const [discard, setDiscard] = useState([]);
  const [activeColor, setActiveColor] = useState(null);
  const [turnIdx, setTurnIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [winner, setWinner] = useState(null);
  const [lastAction, setLastAction] = useState(null);
  const [colorPickerFor, setColorPickerFor] = useState(null); // cardId en attente de choix de couleur (joueur local)
  const [myGain, setMyGain] = useState(0);
  const [channelReady, setChannelReady] = useState(false);

  const channelRef = useRef(null);
  const stateRef = useRef(null);
  const savedResultRef = useRef(false);
  const autoStartedRef = useRef(false);
  const restoredRef = useRef(false);
  const botTimer = useRef(null);

  useEffect(() => {
    stateRef.current = { seats, hands, deck, discard, activeColor, turnIdx, direction, winner };
  }, [seats, hands, deck, discard, activeColor, turnIdx, direction, winner]);

  function applyLocalState(s, extra = {}) {
    setSeats(s.seats); setHands(s.hands); setDeck(s.deck); setDiscard(s.discard);
    setActiveColor(s.activeColor); setTurnIdx(s.turnIdx); setDirection(s.direction);
    setWinner(s.winner || null); setLastAction(s.lastAction || null);
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
      setColorPickerFor(null);
      persist(payload);
      // Si le mélange des sièges place un BOT en premier, personne d'autre
      // ne déclenchera jamais son tour : l'hôte doit l'armer ici. (Sans ça,
      // ~1 partie sur N démarrait figée, selon le tirage des sièges.)
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
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, isHost]);

  // ----- Arbitrage (hôte uniquement) -----
  function broadcastNewState(next) {
    channelRef.current.send({ type: "broadcast", event: "state", payload: next });
  }

  function hostApplyMove(seatId, action) {
    const s = stateRef.current;
    if (!s || s.winner) return;
    const currentSeat = s.seats[s.turnIdx];
    if (!currentSeat || currentSeat.id !== seatId) return;

    let { hands: h, deck: d, discard: disc, activeColor: ac, turnIdx: ti, direction: dir } = s;
    h = { ...h }; d = d.slice(); disc = disc.slice();
    const hand = h[seatId] || [];

    if (action.type === "draw") {
      const res = drawCards(d, disc, 1);
      h[seatId] = hand.concat(res.cards);
      const next = { seats: s.seats, hands: h, deck: res.deck, discard: res.discard, activeColor: ac,
        turnIdx: nextSeatIdx(ti, dir, s.seats.length), direction: dir, winner: null,
        lastAction: { type: "draw", seatId } };
      broadcastNewState(next);
      scheduleBots();
      return;
    }

    const idx = hand.findIndex(c => c.id === action.cardId);
    if (idx === -1) return;
    const card = hand[idx];
    if (!canPlay(card, disc[disc.length - 1], ac)) return;

    const newHand = hand.slice(0, idx).concat(hand.slice(idx + 1));
    h[seatId] = newHand;
    disc = disc.concat([card]);
    const isWild = card.kind === "wild" || card.kind === "wild4";
    ac = isWild ? (action.chosenColor || ac) : card.color;

    if (newHand.length === 0) {
      const next = { seats: s.seats, hands: h, deck: d, discard: disc, activeColor: ac,
        turnIdx: ti, direction: dir, winner: seatId, lastAction: { type: "play", seatId, card } };
      broadcastNewState(next);
      return;
    }

    let advance = 1;
    let victimIdx = null, drawCount = 0;
    if (card.kind === "skip") advance = 2;
    else if (card.kind === "reverse") {
      if (s.seats.length === 2) advance = 2;
      else dir = -dir;
    } else if (card.kind === "draw2") { victimIdx = nextSeatIdx(ti, dir, s.seats.length); drawCount = 2; advance = 2; }
    else if (card.kind === "wild4") { victimIdx = nextSeatIdx(ti, dir, s.seats.length); drawCount = 4; advance = 2; }

    if (victimIdx != null) {
      const victimId = s.seats[victimIdx].id;
      const res = drawCards(d, disc, drawCount);
      h[victimId] = (h[victimId] || []).concat(res.cards);
      d = res.deck; disc = res.discard;
    }
    for (let i = 0; i < advance; i++) ti = nextSeatIdx(ti, dir, s.seats.length);

    const next = { seats: s.seats, hands: h, deck: d, discard: disc, activeColor: ac,
      turnIdx: ti, direction: dir, winner: null, lastAction: { type: "play", seatId, card } };
    broadcastNewState(next);
    scheduleBots();
  }

  // Si le nouveau tour revient à un bot, l'hôte joue à sa place après un
  // court délai (lisibilité), en chaîne jusqu'à un tour humain ou victoire.
  function scheduleBots() {
    if (!isHost) return;
    botTimer.current = setTimeout(() => {
      const s = stateRef.current;
      if (!s || s.winner) return;
      const seat = s.seats[s.turnIdx];
      if (!seat || !seat.isBot) return;
      const hand = s.hands[seat.id] || [];
      const top = s.discard[s.discard.length - 1];
      const move = decideBotMove(hand, top, s.activeColor);
      hostApplyMove(seat.id, move);
    }, 950);
  }

  // ----- Démarrage : choix de la taille de table, sièges bots pour compléter -----
  function startWith(humanSeats) {
    const bots = [];
    for (let i = humanSeats.length + 1; i <= tableSize; i++) bots.push(makeBotSeat(i - humanSeats.length));
    const seatsFull = shuffle([...humanSeats, ...bots]);
    const initial = dealFreshState(seatsFull);
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: initial });
  }

  useEffect(() => {
    if (!isHost || phase !== "intro" || autoStartedRef.current || !channelReady || !tableSize) return;
    if (players.length <= tableSize) {
      autoStartedRef.current = true;
      const humanSeats = players.map(p => ({ id: p.profile_id, username: p.profiles?.username, avatar: p.profiles?.avatar, isBot: false }));
      startWith(humanSeats);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, channelReady, players.length, tableSize]);

  function toggleSelect(pid) {
    setSelected(prev => {
      if (prev.includes(pid)) return prev.filter(x => x !== pid);
      if (prev.length >= tableSize) return prev;
      return [...prev, pid];
    });
  }
  function confirmPick() {
    if (selected.length === 0 || selected.length > tableSize || !channelReady) return;
    const chosen = selected.map(pid => players.find(p => p.profile_id === pid)).filter(Boolean);
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
  const myHand = hands[me.id] || [];
  const topCard = discard[discard.length - 1];
  const isMyTurn = phase === "playing" && !winner && isPlayer && seats[turnIdx]?.id === me.id;

  function attemptDraw() {
    if (!isMyTurn) return;
    channelRef.current?.send({ type: "broadcast", event: "move_attempt", payload: { seatId: me.id, action: { type: "draw" } } });
  }
  function attemptPlay(card) {
    if (!isMyTurn || !topCard) return;
    if (!canPlay(card, topCard, activeColor)) return;
    if (card.kind === "wild" || card.kind === "wild4") {
      setColorPickerFor(card.id);
      return;
    }
    channelRef.current?.send({ type: "broadcast", event: "move_attempt", payload: { seatId: me.id, action: { type: "play", cardId: card.id } } });
  }
  function chooseColor(color) {
    if (!colorPickerFor) return;
    channelRef.current?.send({ type: "broadcast", event: "move_attempt", payload: { seatId: me.id, action: { type: "play", cardId: colorPickerFor, chosenColor: color } } });
    setColorPickerFor(null);
  }

  // Sauvegarde du score (chaque joueur enregistre le sien, RLS oblige).
  useEffect(() => {
    if (!winner || savedResultRef.current || !isPlayer) return;
    savedResultRef.current = true;
    const gain = winner === me.id ? 5 : 1;
    setMyGain(gain);
    (async () => {
      try {
        await supabase.from("game_results").insert({ room_id: room.id, profile_id: me.id, game_id: GAME_ID, points: gain });
        await supabase.rpc("add_points", { p_room: room.id, p_delta: gain });
      } catch (e) {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  const needsPick = players.length > (tableSize || 0);
  const canIPlaySomething = isMyTurn && topCard && hasPlayable(myHand, topCard, activeColor);

  let content;

  if (phase === "playing") {
    const winnerSeat = seats.find(s => s.id === winner);
    content = (
      <div>
        <div className="chromatik-opponents">
          {seats.filter(s => s.id !== me.id).map(s => (
            <div key={s.id} className={"chromatik-opponent" + (seats[turnIdx]?.id === s.id ? " active" : "")}>
              <span className="avatar">{s.avatar}</span>
              <span className="name">{s.username}</span>
              <span className="count">{(hands[s.id] || []).length} 🂠</span>
            </div>
          ))}
        </div>

        <div className="chromatik-table">
          <div className="chromatik-pile draw" onClick={attemptDraw} title={t("chromatikDrawPile")}>
            <CardView faceDown size="md" />
            <span className="pile-count">{deck.length}</span>
          </div>
          <div className="chromatik-discard">
            {topCard && <CardView card={topCard} size="lg" glow />}
            {activeColor && <span className="chromatik-active-color" style={{ background: `var(${COLOR_VAR_MAP[activeColor]})` }} />}
          </div>
        </div>

        <p className="muted" style={{ textAlign: "center", margin: "10px 0", minHeight: 18, fontWeight: winner ? 800 : 400 }}>
          {winner ? (
            winner === me.id ? "🏆 " + t("chromatikWinYou")
              : `${winnerSeat?.username} ${t("chromatikWinOther")}`
          ) : isMyTurn ? (canIPlaySomething ? t("chromatikYourTurn") : t("chromatikMustDraw"))
            : isPlayer ? `${t("chromatikWaitingFor")} ${seats[turnIdx]?.username}…`
              : t("chromatikSpectating")}
        </p>

        {isPlayer && (
          <div className="chromatik-hand">
            {myHand.map(card => (
              <CardView
                key={card.id}
                card={card}
                size="sm"
                onClick={() => attemptPlay(card)}
                dim={!isMyTurn || !canPlay(card, topCard, activeColor)}
              />
            ))}
          </div>
        )}

        {colorPickerFor && (
          <div className="chromatik-color-picker">
            <p className="muted" style={{ marginBottom: 8 }}>{t("chromatikPickColor")}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              {COLORS.map(c => (
                <button key={c} className="chromatik-color-btn" style={{ background: `var(${COLOR_VAR_MAP[c]})` }} onClick={() => chooseColor(c)} />
              ))}
            </div>
            <button className="btn ghost" style={{ width: "auto", padding: "6px 14px", marginTop: 10, fontSize: 12 }} onClick={() => setColorPickerFor(null)}>
              {t("chromatikCancel")}
            </button>
          </div>
        )}

        {winner && (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
            {isPlayer && (
              <p style={{ fontWeight: 800, width: "100%", textAlign: "center" }}>
                {t("peYourGain")} <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>+{myGain} {t("pts")}</span>
              </p>
            )}
            {isHost ? (
              <>
                <button className="btn" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={rejouer}>🔁 {t("c4Rejouer")}</button>
                <button className="btn ghost" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={backToRoom}>🏠 {t("c4BackToRoom")}</button>
              </>
            ) : (
              <p className="muted">{t("c4RejouerWait")}</p>
            )}
          </div>
        )}
      </div>
    );
  } else {
    // phase "intro" : choix de la taille de table, puis des joueurs si besoin
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
          <button className="btn" disabled={selected.length === 0 || selected.length > tableSize} onClick={confirmPick}>
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
      <h1>{t("chromatikTitle")}</h1>
      <Crossfade id={phase}>{content}</Crossfade>
    </div>
  );
}
