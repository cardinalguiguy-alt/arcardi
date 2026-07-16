"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby, recordMatchResult } from "@/lib/gameSync";
import { playCardPlace, playCardSlide, playConfirmChime, playGameWin, playGameLose } from "@/lib/sfx";
import Crossfade from "../Crossfade";
import {
  SUITS, deal, sortHand, sortHandByRank, isJoker, validateCombination, combosPoints, canOpen,
  canAppend, handPenalty, drawFromStock, OPEN_THRESHOLD, pointsForPlace, detectHandCombos,
} from "./ramiEngine";

const GAME_ID = "rami";
// Temps imparti par tour (auto-défausse à l'expiration, arbitrée par l'hôte).
const TURN_MS = 60000;

/* Carte à jouer — refonte visuelle 2026-07 (captures de référence fournies
   par Guillaume : organisation type "table rouge", cartes épurées à GROS
   indices de coin et VRAIS pips dessinés au centre pour les numérales).
   Classes DÉDIÉES `rami-card` (on ne réutilise plus le rendu du Président,
   demande explicite). Purement présentational. */

// Disposition des pips (enseignes) au centre de la carte, par valeur :
// [x%, y%, retourné]. Dispositions classiques des cartes françaises.
const PIP_LAYOUTS = {
  A: [[50, 50]],
  2: [[50, 22], [50, 78, 1]],
  3: [[50, 22], [50, 50], [50, 78, 1]],
  4: [[32, 22], [68, 22], [32, 78, 1], [68, 78, 1]],
  5: [[32, 22], [68, 22], [50, 50], [32, 78, 1], [68, 78, 1]],
  6: [[32, 22], [68, 22], [32, 50], [68, 50], [32, 78, 1], [68, 78, 1]],
  // 7/8/9 (2026-07) : symboles centraux ré-espacés (colonnes 30/70, rangées
  // mieux réparties) + classe ".hi" en CSS qui élargit la boîte et réduit un
  // peu les glyphes — les pips de ces cartes hautes ne se touchent plus.
  7: [[30, 18], [70, 18], [50, 33], [30, 52], [70, 52], [30, 84, 1], [70, 84, 1]],
  8: [[30, 16], [70, 16], [50, 31], [30, 50], [70, 50], [50, 69, 1], [30, 84, 1], [70, 84, 1]],
  9: [[30, 16], [70, 16], [30, 37], [70, 37], [50, 50], [30, 63, 1], [70, 63, 1], [30, 84, 1], [70, 84, 1]],
  10: [[32, 20], [68, 20], [50, 31], [32, 44], [68, 44], [32, 62, 1], [68, 62, 1], [50, 73, 1], [32, 84, 1], [68, 84, 1]],
};
const FIGURE_GLYPHS = { J: "♞", Q: "♛", K: "♚" };

function RCard({ card, faceDown, size = "sm", onClick, sel, dim, style, assist }) {
  const cls = "rami-card"
    + (faceDown ? " back" : "")
    + (onClick ? " clickable" : "")
    + (sel ? " sel" : "")
    + (dim ? " dim" : "")
    // Assistance (zip 125) : liseré coloré par groupe détecté dans la main —
    // 4 teintes qui tournent, voir .rami-card.assist-N dans globals.css.
    + (assist != null ? " assist-" + (assist % 4) : "");
  if (faceDown) {
    return <div className={cls} onClick={onClick} style={style}><span className="rami-card-backmark">✦</span></div>;
  }
  if (isJoker(card)) {
    return (
      <div className={cls + " joker"} onClick={onClick} style={style}>
        <span className="rami-card-corner"><b>★</b></span>
        <span className="rami-card-face">🃏</span>
        <span className="rami-card-corner flip"><b>★</b></span>
      </div>
    );
  }
  const suit = SUITS.find(s => s.id === card.suit);
  const pips = PIP_LAYOUTS[card.rank];
  // Cartes hautes (7/8/9) : boîte de pips élargie + glyphes réduits (".hi")
  // pour aérer les symboles qui se serraient au centre (demande 2026-07).
  const densePips = pips && (card.rank === "7" || card.rank === "8" || card.rank === "9");
  return (
    <div className={cls + (suit.red ? " red" : "")} onClick={onClick} style={style}>
      <span className="rami-card-corner"><b>{card.rank}</b><i>{suit.sym}</i></span>
      <span className="rami-card-corner flip"><b>{card.rank}</b><i>{suit.sym}</i></span>
      {pips ? (
        <span className={"rami-card-pips" + (card.rank === "A" ? " ace" : "") + (densePips ? " hi" : "")}>
          {pips.map(([x, y, f], i) => (
            <i key={i} style={{ left: x + "%", top: y + "%", transform: "translate(-50%,-50%)" + (f ? " rotate(180deg)" : "") }}>{suit.sym}</i>
          ))}
        </span>
      ) : (
        <span className="rami-card-face">
          {FIGURE_GLYPHS[card.rank]}
          <i>{suit.sym}</i>
        </span>
      )}
    </div>
  );
}

export default function RamiGame({ room, me, isHost, players, t, lang, onFinish }) {
  const [phase, setPhase] = useState("intro"); // intro | playing
  const [seats, setSeats] = useState([]);
  const [hands, setHands] = useState({});
  const [stock, setStock] = useState([]);
  const [discard, setDiscard] = useState([]);
  const [table, setTable] = useState([]);   // [{id, owner, type, cards}]
  const [turnIdx, setTurnIdx] = useState(0);
  const [turnPhase, setTurnPhase] = useState("draw"); // draw | act
  const [opened, setOpened] = useState({});
  const [scores, setScores] = useState({});
  const [endThreshold, setEndThreshold] = useState(null); // null=manche unique, sinon 51/101
  const [round, setRound] = useState(1);
  const [roundOver, setRoundOver] = useState(false);
  const [roundWinner, setRoundWinner] = useState(null);
  const [matchOver, setMatchOver] = useState(false);
  const [ranking, setRanking] = useState([]);
  const [lastAction, setLastAction] = useState("");
  const [channelReady, setChannelReady] = useState(false);
  const [deadline, setDeadline] = useState(null); // échéance du tour courant (timestamp)
  const [now, setNow] = useState(Date.now());     // horloge locale (tick 1s) pour le décompte

  // Réglage de l'hôte avant le lancement (par défaut : fin à 51, canonique).
  const [setupThreshold, setSetupThreshold] = useState(51);
  const [sortMode, setSortMode] = useState("color"); // "color" | "rank"
  // Assistance : surligne les combinaisons complètes détectées dans MA main.
  // Purement locale et personnelle (jamais diffusée), persistée d'une partie
  // à l'autre en localStorage.
  const ASSIST_KEY = "arcardi:ramiAssist";
  const [assistOn, setAssistOn] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem(ASSIST_KEY) === "1") setAssistOn(true); } catch (e) {}
  }, []);
  function toggleAssist() {
    setAssistOn(v => {
      try { localStorage.setItem(ASSIST_KEY, v ? "0" : "1"); } catch (e) {}
      return !v;
    });
  }
  // Aide textuelle par étape (activable/désactivable façon 10000) : un bandeau
  // qui rappelle quoi faire à l'instant (piocher, ouvrir/poser, défausser, ou
  // attendre l'adversaire). Personnelle, persistée en localStorage. Distincte
  // du 💡 (assistance qui surligne les combinaisons dans la main).
  const HELP_KEY = "arcardi:ramiHelp";
  const [helpOn, setHelpOn] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem(HELP_KEY) === "1") setHelpOn(true); } catch (e) {}
  }, []);
  function toggleHelp() {
    setHelpOn(v => {
      try { localStorage.setItem(HELP_KEY, v ? "0" : "1"); } catch (e) {}
      return !v;
    });
  }

  // État d'interaction local (jamais diffusé) : sélection + poses en préparation.
  const [sel, setSel] = useState([]);        // ids de cartes sélectionnées dans la main
  const [staged, setStaged] = useState([]);  // [[card,...], ...] combinaisons préparées ce tour
  const [pickMeld, setPickMeld] = useState(null); // id de meld ciblé pour compléter

  const channelRef = useRef(null);
  const stateRef = useRef({});
  const restoredRef = useRef(false);
  const autoRef = useRef(false);
  const savedResultRef = useRef(false);
  const turnMetaRef = useRef(null);   // { seatId, deadline } du tour courant (hôte)
  const turnTimeoutRef = useRef(null); // handle du setTimeout d'auto-défausse (hôte)

  useEffect(() => {
    stateRef.current = { seats, hands, stock, discard, table, turnIdx, turnPhase, opened, scores, endThreshold, round, roundOver, roundWinner, matchOver, ranking, deadline };
  }, [seats, hands, stock, discard, table, turnIdx, turnPhase, opened, scores, endThreshold, round, roundOver, roundWinner, matchOver, ranking, deadline]);

  // Horloge locale : re-render chaque seconde pour animer le décompte du tour.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  function applyState(s, extraPhase) {
    setSeats(s.seats); setHands(s.hands); setStock(s.stock || []); setDiscard(s.discard || []);
    setTable(s.table || []); setTurnIdx(s.turnIdx || 0); setTurnPhase(s.turnPhase || "draw");
    setOpened(s.opened || {}); setScores(s.scores || {}); setEndThreshold(s.endThreshold ?? null);
    setRound(s.round || 1); setRoundOver(!!s.roundOver); setRoundWinner(s.roundWinner || null);
    setMatchOver(!!s.matchOver); setRanking(s.ranking || []);
    setDeadline(s.deadline ?? null);
    if (typeof s.lastAction === "string") setLastAction(s.lastAction);
    if (extraPhase) setPhase(extraPhase);
  }

  // Pose l'échéance du tour sur l'état à diffuser : on GARDE la même échéance
  // tant que c'est le même joueur (le tour = une seule échéance, même s'il
  // pioche/pose/complète plusieurs fois), une NOUVELLE échéance dès que la
  // main passe à un autre siège. `null` s'il n'y a pas de tour actif.
  function stampDeadline(next) {
    if (next.roundOver || next.matchOver || !next.seats || !next.seats.length) {
      turnMetaRef.current = null;
      return { ...next, deadline: null };
    }
    const seatId = next.seats[next.turnIdx]?.id;
    const prev = turnMetaRef.current;
    const dl = (prev && prev.seatId === seatId && prev.deadline) ? prev.deadline : Date.now() + TURN_MS;
    turnMetaRef.current = { seatId, deadline: dl };
    return { ...next, deadline: dl };
  }

  function hostBroadcast(next) {
    const stamped = stampDeadline(next);
    channelRef.current.send({ type: "broadcast", event: "state", payload: stamped });
    armTimer();
  }

  // Arme (hôte) le minuteur qui joue à la place du joueur inactif à
  // l'échéance : pioche au talon s'il n'a pas encore pioché, puis défausse
  // une carte pour finir son tour. Action ATOMIQUE (un seul état diffusé) pour
  // ne pas dépendre d'un aller-retour réseau entre pioche et défausse.
  function armTimer() {
    if (!isHost) return;
    clearTimeout(turnTimeoutRef.current);
    const meta = turnMetaRef.current;
    if (!meta || !meta.deadline) return;
    const delay = Math.max(0, meta.deadline - Date.now());
    const seatId = meta.seatId;
    turnTimeoutRef.current = setTimeout(() => autoPlayTimeout(seatId), delay);
  }

  function autoPlayTimeout(seatId) {
    const s = stateRef.current;
    if (!s || s.roundOver || s.matchOver || !s.seats?.length) return;
    if (s.seats[s.turnIdx]?.id !== seatId) return; // le tour a déjà changé
    let hands = { ...s.hands }, stock = s.stock, discardPile = s.discard;
    if (s.turnPhase === "draw") {
      const r = drawFromStock(stock, discardPile);
      if (r.card) { hands[seatId] = (hands[seatId] || []).concat([r.card]); stock = r.stock; discardPile = r.discard; }
      else if (discardPile.length) { discardPile = discardPile.slice(); hands[seatId] = (hands[seatId] || []).concat([discardPile.pop()]); }
    }
    const hand = hands[seatId] || [];
    if (!hand.length) return;
    const cardOut = hand[hand.length - 1];
    hands[seatId] = hand.slice(0, -1);
    discardPile = discardPile.concat([cardOut]);
    if (hands[seatId].length === 0) { hostBroadcast(buildRoundOver({ ...s, stock }, seatId, hands, discardPile)); return; }
    hostBroadcast({ ...s, hands, stock, discard: discardPile, turnIdx: nextIdx(s), turnPhase: "draw", lastAction: "timeout", lastBy: seatId });
  }

  useEffect(() => {
    const ch = supabase.channel("rami_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "match_start" }, ({ payload }) => {
      applyState(payload, "playing");
      setSel([]); setStaged([]); setPickMeld(null);
      savedResultRef.current = false;
      if (isHost) saveGameState(room.id, GAME_ID, { phase: "playing", ...payload });
    });

    ch.on("broadcast", { event: "state" }, ({ payload }) => {
      // SFX (2026-07) : comparaison avec l'état ENCORE affiché (stateRef,
      // valeurs fraîches). Tapis qui grandit = pose/complétion (chime) ;
      // défausse qui grandit = défausse (carte posée) ; total des mains qui
      // grandit = pioche (glissement). Un seul son par event (priorité au
      // plus signifiant). Jamais rejoué au rechargement (la restauration
      // n'emprunte pas ce handler).
      {
        const prev = stateRef.current;
        const tableSum = (tb) => (tb || []).reduce((n, m) => n + (m.cards?.length || 0), 0);
        const handSum = (h) => Object.values(h || {}).reduce((n, cards) => n + (cards?.length || 0), 0);
        if (tableSum(payload.table) > tableSum(prev.table)) playConfirmChime();
        else if ((payload.discard || []).length > (prev.discard || []).length) playCardPlace();
        else if (handSum(payload.hands) > handSum(prev.hands)) playCardSlide();
      }
      applyState(payload, "playing");
      // Le joueur actif garde sa sélection tant que c'est son tour ; sinon on
      // nettoie (l'état a bougé, la préparation n'a plus de sens).
      setSel([]); setStaged([]); setPickMeld(null);
      if (isHost) saveGameState(room.id, GAME_ID, { phase: "playing", ...payload });
    });

    ch.on("broadcast", { event: "draw_attempt" }, ({ payload }) => { if (isHost) hostDraw(payload); });
    ch.on("broadcast", { event: "meld_attempt" }, ({ payload }) => { if (isHost) hostMeld(payload); });
    ch.on("broadcast", { event: "append_attempt" }, ({ payload }) => { if (isHost) hostAppend(payload); });
    ch.on("broadcast", { event: "swap_attempt" }, ({ payload }) => { if (isHost) hostSwap(payload); });
    ch.on("broadcast", { event: "discard_attempt" }, ({ payload }) => { if (isHost) hostDiscard(payload); });

    ch.subscribe(status => {
      if (status === "SUBSCRIBED") {
        setChannelReady(true);
        if (!restoredRef.current) {
          restoredRef.current = true;
          const saved = readGameState(room, GAME_ID);
          if (saved && saved.seats) {
            applyState(saved, "playing");
            // L'hôte reprend l'arbitrage du minuteur après un rechargement.
            if (isHost && !saved.roundOver && !saved.matchOver && saved.seats.length) {
              turnMetaRef.current = { seatId: saved.seats[saved.turnIdx]?.id, deadline: saved.deadline || (Date.now() + TURN_MS) };
              armTimer();
            }
          }
        }
      }
    });

    return () => { clearTimeout(turnTimeoutRef.current); supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, isHost]);

  // L'hôte démarre le match dès que le canal est prêt et qu'il a choisi le
  // format (manche unique / au score). On construit les sièges depuis les
  // joueurs présents (ordre stable par profile_id).
  function startMatch(threshold) {
    if (!isHost || !channelReady) return;
    const st = buildSeats();
    if (st.length < 2) return;
    const d = deal(st);
    const opened = {}; const scores = {};
    st.forEach(s => { opened[s.id] = false; scores[s.id] = 0; });
    const payload = {
      seats: st, hands: d.hands, stock: d.stock, discard: d.discard, table: [],
      turnIdx: 0, turnPhase: "draw", opened, scores, endThreshold: threshold ?? null,
      round: 1, roundOver: false, roundWinner: null, matchOver: false, ranking: [],
      lastAction: "",
    };
    turnMetaRef.current = null;
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: stampDeadline(payload) });
    armTimer();
  }

  function buildSeats() {
    return players
      .slice()
      .sort((a, b) => String(a.profile_id).localeCompare(String(b.profile_id)))
      .map(p => ({ id: p.profile_id, username: p.profiles?.username, avatar: p.profiles?.avatar }));
  }

  useEffect(() => {
    if (!isHost || phase !== "intro" || autoRef.current || !channelReady) return;
    // On n'auto-démarre pas : l'hôte choisit d'abord le format. Rien ici.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, channelReady]);

  // ---------------- Arbitrage (hôte) ----------------
  function curSeatId(s) { return s.seats[s.turnIdx]?.id; }
  function removeIds(hand, ids) { return hand.filter(c => !ids.includes(c.id)); }
  function findByIds(hand, ids) { return ids.map(id => hand.find(c => c.id === id)).filter(Boolean); }
  function nextIdx(s) { return (s.turnIdx + 1) % s.seats.length; }

  // Fin de manche : `by` a vidé sa main (par défausse OU en posant sa
  // dernière carte). Calcule les pénalités des autres, la fin de match
  // éventuelle et le classement. `discardPile` = défausse à jour.
  function buildRoundOver(s, by, hands, discardPile) {
    const scores = { ...s.scores };
    s.seats.forEach(seat => {
      if (seat.id !== by) scores[seat.id] = (scores[seat.id] || 0) + handPenalty(hands[seat.id] || []);
    });
    let matchOver = false, ranking = s.ranking;
    const threshold = s.endThreshold;
    const reached = threshold != null && s.seats.some(seat => scores[seat.id] >= threshold);
    if (threshold == null || reached) {
      matchOver = true;
      ranking = s.seats.slice().map(seat => ({ id: seat.id, username: seat.username, avatar: seat.avatar, score: scores[seat.id] || 0 }))
        .sort((a, b) => a.score - b.score);
    }
    return { ...s, hands, discard: discardPile, scores, roundOver: true, roundWinner: by,
      matchOver, ranking, lastAction: "rami", lastBy: by };
  }

  function hostDraw({ by, from }) {
    const s = stateRef.current;
    if (s.roundOver || s.matchOver) return;
    if (by !== curSeatId(s) || s.turnPhase !== "draw") return;
    const hands = { ...s.hands };
    let stock = s.stock, discardPile = s.discard;
    let drawn = null;
    if (from === "discard") {
      if (!discardPile.length) return;
      discardPile = discardPile.slice();
      drawn = discardPile.pop();
    } else {
      const r = drawFromStock(s.stock, s.discard);
      if (!r.card) return;
      drawn = r.card; stock = r.stock; discardPile = r.discard;
    }
    hands[by] = sortHand(hands[by].concat([drawn]));
    hostBroadcast({ ...s, hands, stock, discard: discardPile, turnPhase: "act",
      lastAction: from === "discard" ? "drewDiscard" : "drewStock", lastBy: by });
  }

  function hostMeld({ by, combos }) {
    const s = stateRef.current;
    if (s.roundOver || s.matchOver) return;
    if (by !== curSeatId(s) || s.turnPhase !== "act") return;
    const hand = s.hands[by] || [];
    // Résout chaque combo en vraies cartes de la main, sans réutilisation.
    const used = new Set();
    const resolved = [];
    for (const ids of combos) {
      const cards = ids.map(id => (used.has(id) ? null : hand.find(c => c.id === id)));
      if (cards.some(c => !c)) return; // carte absente ou réutilisée
      ids.forEach(id => used.add(id));
      resolved.push(cards);
    }
    if (!resolved.length) return;
    if (!resolved.every(cards => validateCombination(cards).valid)) return;
    // Seuil d'ouverture si le joueur n'a pas encore ouvert.
    if (!s.opened[by]) {
      if (combosPoints(resolved) < OPEN_THRESHOLD) return;
    }
    const table = s.table.slice();
    let tid = table.length;
    resolved.forEach(cards => {
      const r = validateCombination(cards);
      table.push({ id: "m" + Date.now() + "_" + (tid++), owner: by, type: r.type, cards });
    });
    const hands = { ...s.hands };
    hands[by] = removeIds(hand, [...used]);
    const opened = { ...s.opened, [by]: true };
    if (hands[by].length === 0) { hostBroadcast(buildRoundOver({ ...s, opened, table }, by, hands, s.discard)); return; }
    hostBroadcast({ ...s, hands, table, opened, lastAction: "melded", lastBy: by });
  }

  function hostAppend({ by, meldId, ids }) {
    const s = stateRef.current;
    if (s.roundOver || s.matchOver) return;
    if (by !== curSeatId(s) || s.turnPhase !== "act") return;
    if (!s.opened[by]) return; // il faut avoir ouvert
    const meld = s.table.find(m => m.id === meldId);
    if (!meld) return;
    const hand = s.hands[by] || [];
    const added = findByIds(hand, ids);
    if (added.length !== ids.length || !added.length) return;
    const res = canAppend(meld.cards, added);
    if (!res.valid) return;
    const table = s.table.map(m => m.id === meldId ? { ...m, type: res.type, cards: m.cards.concat(added) } : m);
    const hands = { ...s.hands };
    hands[by] = removeIds(hand, ids);
    if (hands[by].length === 0) { hostBroadcast(buildRoundOver({ ...s, table }, by, hands, s.discard)); return; }
    hostBroadcast({ ...s, hands, table, lastAction: "appended", lastBy: by });
  }

  // Reprise d'un joker posé : le joueur remplace le joker d'un meld par la
  // vraie carte de sa main ; le joker revient dans sa main.
  function hostSwap({ by, meldId, cardId }) {
    const s = stateRef.current;
    if (s.roundOver || s.matchOver) return;
    if (by !== curSeatId(s) || s.turnPhase !== "act") return;
    if (!s.opened[by]) return;
    const meld = s.table.find(m => m.id === meldId);
    if (!meld) return;
    const jokerIdx = meld.cards.findIndex(isJoker);
    if (jokerIdx < 0) return;
    const hand = s.hands[by] || [];
    const card = hand.find(c => c.id === cardId);
    if (!card || isJoker(card)) return;
    const newCards = meld.cards.map((c, i) => i === jokerIdx ? card : c);
    const r = validateCombination(newCards);
    if (!r.valid || r.type !== meld.type) return;
    const joker = meld.cards[jokerIdx];
    const table = s.table.map(m => m.id === meldId ? { ...m, cards: newCards } : m);
    const hands = { ...s.hands };
    hands[by] = sortHand(removeIds(hand, [cardId]).concat([joker]));
    hostBroadcast({ ...s, hands, table, lastAction: "swapped", lastBy: by });
  }

  function hostDiscard({ by, cardId }) {
    const s = stateRef.current;
    if (s.roundOver || s.matchOver) return;
    if (by !== curSeatId(s) || s.turnPhase !== "act") return;
    const hand = s.hands[by] || [];
    const card = hand.find(c => c.id === cardId);
    if (!card) return;
    const hands = { ...s.hands };
    const newHand = removeIds(hand, [cardId]);
    hands[by] = newHand;
    const discardPile = s.discard.concat([card]);

    if (newHand.length === 0) { hostBroadcast(buildRoundOver(s, by, hands, discardPile)); return; }

    hostBroadcast({ ...s, hands, discard: discardPile, turnIdx: nextIdx(s), turnPhase: "draw",
      lastAction: "discarded", lastBy: by });
  }

  function nextRound() {
    const s = stateRef.current;
    if (!isHost || s.matchOver) return;
    const d = deal(s.seats);
    const opened = {}; s.seats.forEach(seat => { opened[seat.id] = false; });
    // Le gagnant de la manche précédente ouvre la nouvelle.
    let startIdx = s.seats.findIndex(seat => seat.id === s.roundWinner);
    if (startIdx < 0) startIdx = 0;
    turnMetaRef.current = null;
    channelRef.current.send({ type: "broadcast", event: "state", payload: stampDeadline({
      ...s, hands: d.hands, stock: d.stock, discard: d.discard, table: [],
      turnIdx: startIdx, turnPhase: "draw", opened, round: (s.round || 1) + 1,
      roundOver: false, roundWinner: null, lastAction: "newRound",
    }) });
    armTimer();
  }

  // Enregistrement du résultat ARCARDI en fin de MATCH (chaque joueur pour
  // lui-même). Gagnant = score final le plus bas.
  useEffect(() => {
    if (!matchOver || savedResultRef.current || !ranking.length) return;
    const amPlayer = seats.some(s => s.id === me.id);
    if (!amPlayer) return;
    savedResultRef.current = true;
    const min = ranking[0].score;
    const won = (scores[me.id] ?? Infinity) === min;
    if (won) playGameWin(); else playGameLose(); // SFX fin de match (2026-07)
    recordMatchResult(room.id, won);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchOver]);

  async function backToRoom() { await resetRoomToLobby(room.id); onFinish && onFinish(); }

  // ---------------- Actions locales (envoient des *_attempt) ----------------
  const mySeat = seats.find(s => s.id === me.id) || null;
  const isPlayer = !!mySeat;
  const isMyTurn = isPlayer && !roundOver && !matchOver && curSeatIdLocal() === me.id;
  function curSeatIdLocal() { return seats[turnIdx]?.id; }
  const myHand = hands[me.id] || [];
  const iOpened = !!opened[me.id];
  const secsLeft = (phase === "playing" && deadline && !roundOver && !matchOver)
    ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;

  // Cartes de la main non encore placées dans une combinaison en préparation.
  const stagedIds = new Set(staged.flat().map(c => c.id));
  const availableHand = myHand.filter(c => !stagedIds.has(c.id));

  // Assistance : groupes DISJOINTS détectés dans les cartes encore en main
  // (detectHandCombos < 1 ms pour 14 cartes, recalcul à chaque rendu sans
  // enjeu). id de carte -> index de groupe, pour la teinte du liseré.
  const assistIdx = new Map();
  if (assistOn && isPlayer && !matchOver) {
    detectHandCombos(availableHand).forEach((g, i) => g.ids.forEach(id => assistIdx.set(id, i)));
  }

  function toggleSel(id) {
    setSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function drawStock() { if (isMyTurn && turnPhase === "draw") channelRef.current.send({ type: "broadcast", event: "draw_attempt", payload: { by: me.id, from: "stock" } }); }
  function drawDiscard() { if (isMyTurn && turnPhase === "draw") channelRef.current.send({ type: "broadcast", event: "draw_attempt", payload: { by: me.id, from: "discard" } }); }

  const selCards = sel.map(id => availableHand.find(c => c.id === id)).filter(Boolean);
  const selCombo = selCards.length >= 3 ? validateCombination(selCards) : { valid: false };

  function addStaged() {
    if (!selCombo.valid) return;
    setStaged(prev => [...prev, selCards]);
    setSel([]);
  }
  function unstage(i) { setStaged(prev => prev.filter((_, k) => k !== i)); }

  const stagedTotal = combosPoints(staged);
  const canSubmit = staged.length > 0 && (iOpened || stagedTotal >= OPEN_THRESHOLD);
  function submitMelds() {
    if (!isMyTurn || turnPhase !== "act" || !canSubmit) return;
    channelRef.current.send({ type: "broadcast", event: "meld_attempt", payload: { by: me.id, combos: staged.map(cards => cards.map(c => c.id)) } });
    setStaged([]); setSel([]);
  }

  function doAppend() {
    if (!isMyTurn || turnPhase !== "act" || !iOpened || !pickMeld || !sel.length) return;
    channelRef.current.send({ type: "broadcast", event: "append_attempt", payload: { by: me.id, meldId: pickMeld, ids: sel } });
    setSel([]); setPickMeld(null);
  }
  function doSwap() {
    if (!isMyTurn || turnPhase !== "act" || !iOpened || !pickMeld || sel.length !== 1) return;
    channelRef.current.send({ type: "broadcast", event: "swap_attempt", payload: { by: me.id, meldId: pickMeld, cardId: sel[0] } });
    setSel([]); setPickMeld(null);
  }
  function doDiscard() {
    if (!isMyTurn || turnPhase !== "act" || sel.length !== 1) return;
    channelRef.current.send({ type: "broadcast", event: "discard_attempt", payload: { by: me.id, cardId: sel[0] } });
    setSel([]);
  }

  // ---------------- Rendu ----------------
  let content;

  if (phase === "intro") {
    if (players.length < 2) {
      content = <p className="muted">{t("ramiNotEnough")}</p>;
    } else if (isHost) {
      content = (
        <div>
          <p className="hint">{t("ramiSetupHint")}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", margin: "14px 0" }}>
            {[{ v: null, k: "ramiFmtSingle" }, { v: 51, k: "ramiFmt51" }, { v: 101, k: "ramiFmt101" }].map(opt => {
              const on = setupThreshold === opt.v;
              return (
                <button key={String(opt.v)} onClick={() => setSetupThreshold(opt.v)}
                  style={{ padding: "10px 16px", borderRadius: 12, fontWeight: 800, fontSize: 13, color: "var(--ink)",
                    border: `2px solid ${on ? "var(--p2)" : "rgba(255,255,255,.35)"}`,
                    background: on ? "rgba(255,209,102,.18)" : "rgba(0,0,0,.15)" }}>
                  {t(opt.k)}
                </button>
              );
            })}
          </div>
          <button className="btn" disabled={!channelReady} onClick={() => startMatch(setupThreshold)}>{t("ramiStart")}</button>
        </div>
      );
    } else {
      content = <p className="muted">{t("ramiWaitHost")}</p>;
    }
  } else {
    // phase playing
    const topDiscard = discard[discard.length - 1];
    const turnSeat = seats[turnIdx];
    // Aide textuelle par étape (bandeau, activable via le bouton "?").
    let helpText = null;
    if (helpOn && !roundOver) {
      if (!isPlayer) helpText = t("ramiHelpSpectate");
      else if (!isMyTurn) helpText = `${t("ramiHelpWait")} ${turnSeat?.username || ""}`.trim();
      else if (turnPhase === "draw") helpText = t("ramiHelpDraw");
      else helpText = iOpened ? t("ramiHelpAct") : t("ramiHelpOpen").replace("{n}", OPEN_THRESHOLD);
    }
    content = (
      <div>
        {/* Bandeau des joueurs */}
        <div className="rami-seats">
          {seats.map((s, i) => (
            <div key={s.id} className={"rami-seat" + (i === turnIdx && !roundOver ? " active" : "") + (s.id === me.id ? " me" : "")}>
              <span className="av">{s.avatar}</span>
              <span className="nm">{s.username}</span>
              <span className="ct">{(hands[s.id] || []).length} 🂠</span>
              {endThreshold != null && <span className="sc">{scores[s.id] || 0} pts</span>}
              {opened[s.id] && <span className="op">✓</span>}
            </div>
          ))}
        </div>

        {/* Aide textuelle par étape (activable/désactivable, bouton "?") */}
        {helpText && <div className="rami-help">💡 {helpText}</div>}

        {/* Tapis : combinaisons posées */}
        <div className="rami-table">
          {table.length === 0 && <p className="muted" style={{ margin: "8px 0" }}>{t("ramiTableEmpty")}</p>}
          {table.map(m => {
            const owner = seats.find(s => s.id === m.owner);
            const selectable = isMyTurn && turnPhase === "act" && iOpened;
            return (
              <div key={m.id} className={"rami-meld" + (pickMeld === m.id ? " picked" : "")}
                onClick={() => selectable && setPickMeld(pickMeld === m.id ? null : m.id)}
                style={{ cursor: selectable ? "pointer" : "default" }}>
                <div className="rami-meld-cards">
                  {m.cards.map(c => <RCard key={c.id} card={c} size="sm" />)}
                </div>
                <span className="rami-meld-tag">{owner?.avatar} · {validateCombination(m.cards).points} pts</span>
              </div>
            );
          })}
        </div>

        {/* Pioche + défausse : libellés AU-DESSUS des talons, ancrés à gauche
            (organisation des captures de référence, refonte 2026-07). */}
        <div className="rami-piles">
          <div className="rami-pile">
            <span className="rami-pile-lbl">{t("ramiStock")} · {stock.length}</span>
            <div className={"rami-pile-slot" + (isMyTurn && turnPhase === "draw" ? " live" : "")} onClick={drawStock}>
              {stock.length > 0 ? <RCard faceDown size="sm" /> : <div className="rami-empty" />}
            </div>
          </div>
          <div className="rami-pile">
            <span className="rami-pile-lbl">{t("ramiDiscard")}</span>
            <div className={"rami-pile-slot" + (isMyTurn && turnPhase === "draw" && topDiscard ? " live" : "")} onClick={drawDiscard}>
              {topDiscard ? <RCard card={topDiscard} size="sm" /> : <div className="rami-empty" />}
            </div>
          </div>
        </div>

        {/* Message d'état + décompte du tour */}
        <p className="muted" style={{ textAlign: "center", minHeight: 20, marginTop: 6, fontWeight: 700 }}>
          {roundOver
            ? (matchOver ? t("ramiMatchOver") : `🎉 ${seats.find(s => s.id === roundWinner)?.username || ""} ${t("ramiRoundWon")}`)
            : isMyTurn
              ? (turnPhase === "draw" ? t("ramiYourDraw") : t("ramiYourAct"))
              : (isPlayer ? `${t("ramiWaitingFor")} ${turnSeat?.username || ""}…` : t("ramiSpectating"))}
        </p>
        {secsLeft != null && (
          <p style={{ textAlign: "center", marginTop: 4 }}>
            <span className={"rami-timer-chip" + (secsLeft <= 10 ? " urgent" : "")}>
              {Math.floor(secsLeft / 60)}:{String(secsLeft % 60).padStart(2, "0")}
            </span>
          </p>
        )}

        {/* Podium de fin de match */}
        {matchOver && (
          <div className="rami-podium">
            {ranking.map((r, i) => (
              <div key={r.id} className={"rami-podium-row" + (i === 0 ? " first" : "") + (r.id === me.id ? " me" : "")}>
                <span className="place">{i + 1}</span>
                <span className="av">{r.avatar}</span>
                <span className="name">{r.username}</span>
                <span className="pts">{r.score} pts</span>
              </div>
            ))}
          </div>
        )}

        {/* Ma main + actions (seulement si je joue) */}
        {isPlayer && !matchOver && (
          <div className="rami-me">
            {/* Préparation de combinaisons */}
            {staged.length > 0 && (
              <div className="rami-staged">
                <span className="rami-staged-lbl">{t("ramiStagedLbl")} · {stagedTotal} pts{!iOpened && ` / ${OPEN_THRESHOLD}`}</span>
                <div className="rami-staged-rows">
                  {staged.map((cards, i) => (
                    <div key={i} className="rami-staged-row" onClick={() => unstage(i)} title={t("ramiRemoveCombo")}>
                      {cards.map(c => <RCard key={c.id} card={c} size="sm" />)}
                      <span className="rami-x">✕</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rami-hand-head">
              <span className="rami-hand-lbl">{t("ramiYourHand")} · {myHand.length}</span>
            </div>
            {/* Main en éventail + pile de petits boutons carrés à droite
                (tri par valeur "789→", tri par couleur "enseignes", assistance),
                organisation des captures de référence (refonte 2026-07). */}
            <div className="rami-hand-row">
              <div className="rami-hand">
                {(sortMode === "rank" ? sortHandByRank(availableHand) : sortHand(availableHand)).map(c => (
                  <RCard key={c.id} card={c} size="sm" onClick={isMyTurn ? () => toggleSel(c.id) : undefined}
                    sel={sel.includes(c.id)} dim={!isMyTurn} assist={assistIdx.get(c.id)} />
                ))}
              </div>
              <div className="rami-side-btns">
                <button className={"rami-square-btn" + (sortMode === "rank" ? " on" : "")}
                  onClick={() => setSortMode("rank")} title={t("ramiSortByRank")}>
                  <span className="rami-square-top">789</span>
                  <span className="rami-square-bottom">→</span>
                </button>
                <button className={"rami-square-btn" + (sortMode === "color" ? " on" : "")}
                  onClick={() => setSortMode("color")} title={t("ramiSortByColor")}>
                  <span className="rami-square-suits"><i>♠</i><b>♥</b><b>♦</b><i>♣</i></span>
                </button>
                <button className={"rami-square-btn" + (assistOn ? " on" : "")}
                  onClick={toggleAssist} title={t("ramiAssistHint")}>
                  <span style={{ fontSize: 17 }}>💡</span>
                </button>
                <button className={"rami-square-btn" + (helpOn ? " on" : "")}
                  onClick={toggleHelp} title={t("ramiHelpToggle")}>
                  <span style={{ fontSize: 17, fontWeight: 900 }}>?</span>
                </button>
              </div>
            </div>

            {isMyTurn && turnPhase === "act" && (
              <div className="rami-actions">
                <button className="btn rami-main-btn" disabled={!canSubmit} onClick={submitMelds}>
                  ⬆ {iOpened ? t("ramiPlace") : t("ramiOpen")}
                </button>
                <button className="btn" style={{ width: "auto" }} disabled={!selCombo.valid} onClick={addStaged}>
                  ➕ {t("ramiAddCombo")}{selCombo.valid ? ` (${selCombo.points})` : ""}
                </button>
                <button className="btn ghost" style={{ width: "auto" }} disabled={!iOpened || !pickMeld || !sel.length} onClick={doAppend}>
                  🔗 {t("ramiAppend")}
                </button>
                <button className="btn ghost" style={{ width: "auto" }} disabled={!iOpened || !pickMeld || sel.length !== 1} onClick={doSwap}>
                  🃏 {t("ramiSwap")}
                </button>
                <button className="btn rami-discard-btn" disabled={sel.length !== 1} onClick={doDiscard}>
                  🗑️ {t("ramiDiscardBtn")}
                </button>
              </div>
            )}
            {isMyTurn && turnPhase === "draw" && (
              <p className="hint" style={{ textAlign: "center" }}>{t("ramiDrawHint")}</p>
            )}
          </div>
        )}

        {/* Contrôles hôte de fin de manche/partie */}
        {roundOver && (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
            {isHost ? (
              matchOver ? (
                <button className="btn" style={{ width: "auto" }} onClick={backToRoom}>🏠 {t("ramiBackToRoom")}</button>
              ) : (
                <>
                  <button className="btn" style={{ width: "auto" }} onClick={nextRound}>🔁 {t("ramiNextRound")}</button>
                  <button className="btn ghost" style={{ width: "auto" }} onClick={backToRoom}>🏠 {t("ramiBackToRoom")}</button>
                </>
              )
            ) : (
              <p className="muted">{t("ramiWaitHostNext")}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="panel rami-panel" style={{ maxWidth: "min(980px, 97vw)" }}>
      <h1>{t("ramiTitle")}</h1>
      <Crossfade id={phase + (roundOver ? "-over" : "")}>{content}</Crossfade>
    </div>
  );
}
