"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby } from "@/lib/gameSync";
import Crossfade from "@/components/Crossfade";
import GameCountdown, { COUNTDOWN_MS } from "@/components/GameCountdown";
import {
  GM_ROWS, GM_COLS, GM_NUGGETS, GM_WIN_AT,
  genMine, digResult, bombResult, nuggetsLeft, gmPointsForPlace,
} from "./mines";
import { decideBotMove } from "./botLogic";
import { playCashRegister, playDynamite, primeFiles } from "@/lib/sfx";

/* ==========================================================================
   GOLD MINES — démineur inversé en DUEL (refonte 2026-07, spec complète).

   Ambiance chercheur d'or : terre brune, pioches, et des PÉPITES dorées qui
   RAYONNENT à la découverte (éclat + rayons tournants ~2,8 s) avant de
   s'estomper en un petit résidu doré cerclé à la couleur du découvreur.

   Règles : chacun son tour, un clic = un coup de pioche.
   - pépite  -> +1 or au mineur, il REJOUE ;
   - chiffre -> nombre de pépites dans les 8 cases voisines, tour à l'autre ;
   - case vide -> toute la zone vide voisine se dégage (indices offerts à
     l'adversaire !), tour à l'autre.
   PREMIER À 13 PÉPITES (sur 25) : victoire immédiate — 13 est la majorité
   absolue de 25, un vainqueur est garanti, jamais d'égalité.
   DYNAMITE : une par joueur et par partie, remplace le coup, révèle le
   carré 3×3 visé (sans propagation), rafle ses pépites, et fait rejouer si
   au moins une pépite en sort. À utiliser au bon moment : mal placée, elle
   n'offre que des indices à l'adversaire.

   Pattern réseau : hôte arbitre, identique à Chromatik (match_start /
   state / move_attempt, bot calculé côté hôte, minuteur de tour 30s→5s,
   reprise sur rechargement avec réarmement bot+minuteur). Même modèle de
   confiance que le reste du site : l'état complet transite chez tous les
   clients, l'UI cache ce qui doit l'être.
   ========================================================================== */

const GAME_ID = "goldmines";
const TABLE_SIZE = 2; // duel — un bot complète si on joue seul
const HUMAN_TURN_MS = 30000;
const HUMAN_TURN_SHORT_MS = 5000;
const HUMAN_TURN_STRIKES = 2;
// Couleur d'identification de chaque mineur (cercle du résidu de pépite,
// liseré de sa carte joueur) : ambre pour le siège 0, cuivre pour le 1.
const SEAT_TONES = ["amber", "copper"];

function makeBotSeat(n) {
  return { id: "bot" + n, username: "Bot " + n, avatar: "🤖", isBot: true };
}

// ----- Pépite d'or dessinée (SVG) -------------------------------------------
// Remplace l'emoji 🪙 (demande 2026-07 : "jaune or, brillante, qui évoque
// vraiment une pépite") : caillou irrégulier à facettes, dégradé or clair ->
// or profond, reflet spéculaire — même dessin partout (grille, cartes de
// mineur, "+N"), seule la taille change via CSS (.gm-nugget-svg).
// Les ids de dégradé sont partagés entre toutes les instances : sans risque,
// elles sont identiques et toujours rendues visibles.
function NuggetIcon({ className = "" }) {
  return (
    <svg className={"gm-nugget-svg " + className} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="gmNugGrad" x1="0" y1="0" x2="0.55" y2="1">
          <stop offset="0" stopColor="#FFF6C4" />
          <stop offset="0.38" stopColor="#FFD23F" />
          <stop offset="0.75" stopColor="#EFAF1E" />
          <stop offset="1" stopColor="#C4820C" />
        </linearGradient>
        <linearGradient id="gmNugFacet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFEE9C" />
          <stop offset="1" stopColor="#E0A018" />
        </linearGradient>
      </defs>
      {/* Le caillou : contour volontairement bosselé et asymétrique (creux à
          droite, bosse en bas) — jamais un rond de pièce */}
      <path
        d="M14.5 2.5 L22.5 4 L25.5 8.5 L29.5 13 L27 18.5 L28.5 23.5 L21.5 27.5 L15 29.5 L7.5 27 L3 20.5 L2.5 13 L7 9.5 L8.5 4.5 Z"
        fill="url(#gmNugGrad)" stroke="#8A5A06" strokeWidth="1.2" strokeLinejoin="round"
      />
      {/* Facettes : deux plans plus clairs qui accrochent la lumière */}
      <path d="M14.5 2.5 L22.5 4 L19.5 11.5 L10 10 L8.5 4.5 Z" fill="url(#gmNugFacet)" opacity="0.8" />
      <path d="M10 10 L19.5 11.5 L17 20 L7.5 18 L3 20.5 L2.5 13 L7 9.5 Z" fill="#F6C232" opacity="0.55" />
      {/* Ombre interne, côté bas-droit */}
      <path d="M29.5 13 L27 18.5 L28.5 23.5 L21.5 27.5 L15 29.5 L17 20 L19.5 11.5 L25.5 8.5 Z" fill="#B0770A" opacity="0.38" />
      {/* Reflets spéculaires : l'étincelle qui fait "brillant" */}
      <path d="M10.2 5.8 L13.8 4.8 L12.4 8.4 L9.6 8.8 Z" fill="#FFFDEB" opacity="0.95" />
      <circle cx="21" cy="7.6" r="1.5" fill="#FFF9D6" opacity="0.9" />
      <circle cx="13" cy="15" r="1.1" fill="#FFF3B8" opacity="0.75" />
      <circle cx="23.5" cy="21" r="0.9" fill="#FFE68A" opacity="0.6" />
    </svg>
  );
}

function dealState(seats) {
  const mine = genMine();
  const gold = {}, bombs = {};
  seats.forEach(seat => { gold[seat.id] = 0; bombs[seat.id] = true; });
  return {
    seats, mine, revealed: {}, gold, bombs, turnIdx: 0, left: GM_NUGGETS,
    winner: null, lastAction: null,
  };
}

export default function GoldMinesGame({ room, me, isHost, players, t, lang, onFinish }) {
  const [phase, setPhase] = useState("intro");
  const [selected, setSelected] = useState([]);
  const [seats, setSeats] = useState([]);
  const [mine, setMine] = useState(null);
  const [revealed, setRevealed] = useState({});
  const [gold, setGold] = useState({});
  const [bombs, setBombs] = useState({});
  const [turnIdx, setTurnIdx] = useState(0);
  const [left, setLeft] = useState(GM_NUGGETS);
  const [winner, setWinner] = useState(null); // seatId | null
  const [lastAction, setLastAction] = useState(null);
  const [myGain, setMyGain] = useState(0);
  const [channelReady, setChannelReady] = useState(false);
  const [turnDeadline, setTurnDeadline] = useState(null);
  const [turnDeadlineSeat, setTurnDeadlineSeat] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  // Dynamite armée (local) : le prochain clic sur une case cachée fait
  // sauter le carré 3×3 au lieu de piocher.
  const [bombArmed, setBombArmed] = useState(false);
  // Effets locaux, tous dérivés du même lastAction reçu par broadcast :
  const [goldPop, setGoldPop] = useState(null);      // "+N pépite(s)" sur la carte du mineur
  const [freshNuggets, setFreshNuggets] = useState({ ids: [], key: 0 }); // pépites qui rayonnent
  const [bombFx, setBombFx] = useState(null);        // 💥 + secousse de la grille
  // Décompte 3-2-1 de début de partie (jamais rejoué au rechargement).
  const [countingDown, setCountingDown] = useState(false);
  // Curseur-pioche : c'est désormais un VRAI curseur CSS natif posé sur la
  // grille (voir .gm-grid.myturn dans globals.css) — le navigateur le dessine
  // lui-même, donc plus jamais "invisible", insensible au zoom du mode agrandi,
  // et zéro JS/événement à synchroniser. Au doigt (tactile), rien à faire : le
  // curseur ne s'affiche pas, on tape directement les cases.
  const gridRef = useRef(null);

  const channelRef = useRef(null);
  const stateRef = useRef(null);
  const savedResultRef = useRef(false);
  const autoStartedRef = useRef(false);
  const restoredRef = useRef(false);
  const botTimer = useRef(null);
  const turnTimeoutRef = useRef(null);
  const turnStrikesRef = useRef({});
  const turnMetaRef = useRef({ deadline: null, seatId: null });
  const goldPopKeyRef = useRef(0);
  const goldPopTimerRef = useRef(null);
  const freshKeyRef = useRef(0);
  const freshTimerRef = useRef(null);
  const bombFxKeyRef = useRef(0);
  const bombFxTimerRef = useRef(null);
  const lastActionSeenRef = useRef(null);
  // Fin du décompte 3-2-1 côté hôte : les bots et le minuteur de tour
  // attendent cette échéance avant de démarrer (voir scheduleBots et
  // sendMatchStart) — l'overlay et l'arbitrage restent synchronisés.
  const countdownEndRef = useRef(0);

  // Préchargement des sons du jeu dès le montage : sans lui, le PREMIER tir de
  // dynamite (et la première pépite) subissaient la latence de fetch/décodage
  // du mp3 — d'où un son en retard au premier boum.
  useEffect(() => { primeFiles("/sounds/dynamite-blast.mp3", "/sounds/cash-register.mp3"); }, []);

  useEffect(() => {
    stateRef.current = { seats, mine, revealed, gold, bombs, turnIdx, left, winner };
  }, [seats, mine, revealed, gold, bombs, turnIdx, left, winner]);

  function applyLocalState(s, extra = {}) {
    setSeats(s.seats); setMine(s.mine); setRevealed(s.revealed || {});
    setGold(s.gold || {}); setBombs(s.bombs || {}); setTurnIdx(s.turnIdx); setLeft(s.left);
    setWinner(s.winner || null); setLastAction(s.lastAction || null);
    setTurnDeadline(s.turnDeadline || null); setTurnDeadlineSeat(s.turnDeadlineSeat || null);
    if (extra.resetGain) { setMyGain(0); savedResultRef.current = false; setBombArmed(false); }
  }

  useEffect(() => {
    if (!turnDeadline) return;
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [turnDeadline]);

  // ----- Effets locaux dérivés de lastAction (jamais rejoués au reload) -----
  useEffect(() => {
    if (!lastAction) return;
    const key = lastAction.type + ":" + lastAction.seatId + ":" + (lastAction.idx ?? lastAction.center ?? "") + ":" + (lastAction.gained ?? "");
    if (lastActionSeenRef.current === key) return;
    lastActionSeenRef.current = key;

    const nuggetIds = lastAction.type === "dig" && lastAction.nugget
      ? [lastAction.idx]
      : lastAction.type === "bomb" ? (lastAction.nuggetCells || []) : [];
    if (nuggetIds.length > 0) {
      // Trouvaille : même caisse enregistreuse que la banque du 10000
      // (demande 2026-07) — l'or qui rentre fait le même bruit partout.
      playCashRegister();
      freshKeyRef.current += 1;
      setFreshNuggets({ ids: nuggetIds, key: freshKeyRef.current });
      clearTimeout(freshTimerRef.current);
      freshTimerRef.current = setTimeout(() => setFreshNuggets({ ids: [], key: freshKeyRef.current }), 2900);
      goldPopKeyRef.current += 1;
      setGoldPop({ seatId: lastAction.seatId, count: nuggetIds.length, key: goldPopKeyRef.current });
      clearTimeout(goldPopTimerRef.current);
      goldPopTimerRef.current = setTimeout(() => setGoldPop(null), 1500);
    }
    if (lastAction.type === "bomb") {
      // Vrai tir de mine (fichier découpé + fondu, voir lib/sfx.js). Le joueur
      // qui a tiré l'a DÉJÀ entendu au clic (jeu optimiste dans attemptCell,
      // pour supprimer le retard dû à l'aller-retour hôte-arbitre) : on ne le
      // (re)joue donc ici que pour les AUTRES clients, en synchro avec le 💥.
      if (lastAction.seatId !== me.id) playDynamite();
      bombFxKeyRef.current += 1;
      setBombFx({ center: lastAction.center, key: bombFxKeyRef.current });
      clearTimeout(bombFxTimerRef.current);
      bombFxTimerRef.current = setTimeout(() => setBombFx(null), 1100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAction]);

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
      // Décompte 3-2-1 avant que la mine ouvre (jamais au rechargement :
      // seul un vrai match_start passe ici). Les bots attendent la fin du
      // décompte via countdownEndRef (voir scheduleBots).
      countdownEndRef.current = Date.now() + COUNTDOWN_MS;
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
            // Marque le lastAction restauré comme déjà vu : jamais de
            // re-explosion ni de pépites qui re-rayonnent au rechargement.
            if (saved.lastAction) {
              lastActionSeenRef.current = saved.lastAction.type + ":" + saved.lastAction.seatId + ":" + (saved.lastAction.idx ?? saved.lastAction.center ?? "") + ":" + (saved.lastAction.gained ?? "");
            }
            applyLocalState(saved);
            setPhase("playing");
            autoStartedRef.current = true;
            // Reprise hôte : réarmer bot + minuteur (correctif Chromatik 2026-07).
            if (isHost && !saved.winner) {
              broadcastNewState(saved);
              scheduleBots();
            }
          }
        }
      }
    });

    return () => {
      clearTimeout(botTimer.current);
      clearTimeout(turnTimeoutRef.current);
      clearTimeout(goldPopTimerRef.current);
      clearTimeout(freshTimerRef.current);
      clearTimeout(bombFxTimerRef.current);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, isHost]);

  function computeTurnDeadline(next) {
    if (!next || next.winner || !next.seats || !next.seats.length) return { deadline: null, seatId: null };
    const seat = next.seats[next.turnIdx];
    if (!seat || seat.isBot) return { deadline: null, seatId: null };
    const strikes = turnStrikesRef.current[seat.id] || 0;
    const ms = strikes >= HUMAN_TURN_STRIKES ? HUMAN_TURN_SHORT_MS : HUMAN_TURN_MS;
    return { deadline: Date.now() + ms, seatId: seat.id };
  }

  // Échéance dépassée : pioche AU HASARD (jamais la dynamite) à la place du
  // joueur — la partie ne se fige jamais sur un distrait.
  function armHumanTurnTimer() {
    clearTimeout(turnTimeoutRef.current);
    if (!isHost) return;
    const { deadline, seatId } = turnMetaRef.current;
    if (!deadline || !seatId) return;
    const delay = Math.max(0, deadline - Date.now());
    turnTimeoutRef.current = setTimeout(() => {
      const s = stateRef.current;
      if (!s || s.winner || !s.mine) return;
      if (!s.seats[s.turnIdx] || s.seats[s.turnIdx].id !== seatId) return;
      turnStrikesRef.current[seatId] = (turnStrikesRef.current[seatId] || 0) + 1;
      const hidden = [];
      for (let i = 0; i < s.mine.nugget.length; i++) if (!s.revealed[i]) hidden.push(i);
      if (hidden.length === 0) return;
      hostApplyMove(seatId, { type: "dig", idx: hidden[Math.floor(Math.random() * hidden.length)] });
    }, delay);
  }

  function broadcastNewState(next) {
    const tm = computeTurnDeadline(next);
    turnMetaRef.current = tm;
    channelRef.current.send({ type: "broadcast", event: "state", payload: { ...next, turnDeadline: tm.deadline, turnDeadlineSeat: tm.seatId } });
    armHumanTurnTimer();
  }
  function sendMatchStart(payload) {
    turnStrikesRef.current = {};
    const tm = computeTurnDeadline(payload);
    // Décompte 3-2-1 : le premier tour humain ne commence à décompter ses
    // 30 s qu'une fois le décompte terminé (équité vis-à-vis de l'overlay
    // qui bloque les clics pendant ce temps).
    if (tm.deadline) tm.deadline += COUNTDOWN_MS;
    turnMetaRef.current = tm;
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: { ...payload, turnDeadline: tm.deadline, turnDeadlineSeat: tm.seatId } });
    armHumanTurnTimer();
  }

  // ----- Arbitrage (hôte uniquement) -----
  function hostApplyMove(seatId, action) {
    const s = stateRef.current;
    if (!s || s.winner || !s.mine) return;
    const currentSeat = s.seats[s.turnIdx];
    if (!currentSeat || currentSeat.id !== seatId) return;
    const idx = action.idx;
    if (typeof idx !== "number" || idx < 0 || idx >= s.mine.nugget.length) return;
    if (s.revealed[idx]) return; // case déjà creusée : coup illégal, ignoré

    const revealed = { ...s.revealed };
    const gold = { ...s.gold };
    const bombs = { ...s.bombs };
    let replay = false;
    let last = null;

    if (action.type === "bomb") {
      if (!bombs[seatId]) return; // dynamite déjà utilisée : coup illégal
      const res = bombResult(s.mine, s.revealed, idx);
      for (const c of res.cells) revealed[c] = s.mine.nugget[c] ? seatId : true;
      gold[seatId] = (gold[seatId] || 0) + res.nuggets.length;
      bombs[seatId] = false;
      replay = res.nuggets.length > 0; // au moins une pépite soufflée : il rejoue
      last = { type: "bomb", seatId, center: idx, cells: res.cells, nuggetCells: res.nuggets, gained: res.nuggets.length };
    } else if (action.type === "dig") {
      const res = digResult(s.mine, s.revealed, idx);
      for (const c of res.cells) revealed[c] = res.nugget ? seatId : true;
      if (res.nugget) { gold[seatId] = (gold[seatId] || 0) + 1; replay = true; }
      last = { type: "dig", seatId, idx, nugget: res.nugget, count: res.cells.length };
    } else return;

    const left = nuggetsLeft(s.mine, revealed);
    // Victoire : PREMIER À 13 PÉPITES (garanti avant l'épuisement des 25) ;
    // filet de sécurité si la mine se vide quand même : le plus riche gagne
    // (25 est impair, jamais d'égalité).
    let winner = null;
    if ((gold[seatId] || 0) >= GM_WIN_AT) winner = seatId;
    else if (left === 0) winner = [...s.seats].sort((a, b) => (gold[b.id] || 0) - (gold[a.id] || 0))[0].id;

    const next = {
      seats: s.seats, mine: s.mine, revealed, gold, bombs, left, winner,
      turnIdx: winner || replay ? s.turnIdx : (s.turnIdx + 1) % s.seats.length,
      lastAction: last,
    };
    broadcastNewState(next);
    scheduleBots();
  }

  // Bot au tour suivant : l'hôte joue pour lui après un délai de lisibilité.
  // Le délai ne descend jamais sous la fin du décompte 3-2-1 : un bot qui
  // piocherait pendant que les joueurs regardent "3… 2… 1…" casserait tout.
  function scheduleBots() {
    if (!isHost) return;
    const delay = Math.max(800 + Math.random() * 2200, countdownEndRef.current - Date.now());
    botTimer.current = setTimeout(() => {
      const s = stateRef.current;
      if (!s || s.winner || !s.mine) return;
      const seat = s.seats[s.turnIdx];
      if (!seat || !seat.isBot) return;
      const opp = s.seats.find(x => x.id !== seat.id);
      const move = decideBotMove(s.mine, s.revealed, {
        bombAvailable: !!s.bombs[seat.id],
        myGold: s.gold[seat.id] || 0,
        oppGold: opp ? (s.gold[opp.id] || 0) : 0,
      });
      if (!move) return;
      hostApplyMove(seat.id, move);
    }, delay);
  }

  // ----- Démarrage : duel, un bot complète si besoin -----
  function startWith(humanSeats) {
    const all = [...humanSeats];
    for (let i = all.length + 1; i <= TABLE_SIZE; i++) all.push(makeBotSeat(i - humanSeats.length));
    if (Math.random() < 0.5) all.reverse(); // qui ouvre la mine : pile ou face
    sendMatchStart(dealState(all));
  }

  useEffect(() => {
    if (!isHost || phase !== "intro" || autoStartedRef.current || !channelReady) return;
    if (players.length <= TABLE_SIZE) {
      autoStartedRef.current = true;
      const humanSeats = players.map(p => ({ id: p.profile_id, username: p.profiles?.username, avatar: p.profiles?.avatar, isBot: false }));
      startWith(humanSeats);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, channelReady, players.length]);

  function toggleSelect(pid) {
    setSelected(prev => {
      if (prev.includes(pid)) return prev.filter(x => x !== pid);
      if (prev.length >= TABLE_SIZE) return prev;
      return [...prev, pid];
    });
  }
  function confirmPick() {
    if (selected.length === 0 || selected.length > TABLE_SIZE || !channelReady) return;
    const chosen = selected.map(pid => players.find(p => p.profile_id === pid)).filter(Boolean);
    const humanSeats = chosen.map(p => ({ id: p.profile_id, username: p.profiles?.username, avatar: p.profiles?.avatar, isBot: false }));
    autoStartedRef.current = true;
    startWith(humanSeats);
  }

  function rejouer() {
    if (!isHost || !seats.length) return;
    startWith(seats.filter(s => !s.isBot));
  }
  async function backToRoom() {
    await resetRoomToLobby(room.id);
    onFinish && onFinish();
  }

  // ----- Joueur local -----
  const mySeatIdx = seats.findIndex(s => s.id === me.id);
  const isPlayer = mySeatIdx !== -1;
  const isMyTurn = phase === "playing" && !winner && isPlayer && seats[turnIdx]?.id === me.id;
  const turnRemaining = turnDeadline ? Math.max(0, Math.ceil((turnDeadline - now) / 1000)) : null;
  const myBombAvailable = isPlayer && !!bombs[me.id];

  function attemptCell(idx) {
    if (!isMyTurn || revealed[idx]) return;
    const action = bombArmed && myBombAvailable ? { type: "bomb", idx } : { type: "dig", idx };
    setBombArmed(false);
    // Son de dynamite joué EN OPTIMISTE dès le clic pour le joueur qui tire :
    // sinon il ne l'entendait qu'après l'aller-retour hôte-arbitre (broadcast
    // lastAction), d'où le retard signalé. L'effet dérivé de lastAction ne le
    // rejoue pas pour ce joueur (garde `seatId === me.id`).
    if (action.type === "bomb") playDynamite();
    channelRef.current?.send({ type: "broadcast", event: "move_attempt", payload: { seatId: me.id, action } });
  }


  // Points ARCARDI : 5 au vainqueur du duel, 0 au perdant — chacun
  // enregistre le sien (RLS), une seule fois, comme partout sur le site.
  useEffect(() => {
    if (!winner || savedResultRef.current || !isPlayer) return;
    savedResultRef.current = true;
    const gain = gmPointsForPlace(winner === me.id ? 0 : 1);
    setMyGain(gain);
    if (gain <= 0) return;
    (async () => {
      try {
        await supabase.from("game_results").insert({ room_id: room.id, profile_id: me.id, game_id: GAME_ID, points: gain });
        await supabase.rpc("add_points", { p_room: room.id, p_delta: gain });
      } catch (e) {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  const needsPick = players.length > TABLE_SIZE;
  const activeSeat = seats[turnIdx];
  const lastSeat = lastAction ? seats.find(s => s.id === lastAction.seatId) : null;
  const winnerSeat = winner ? seats.find(s => s.id === winner) : null;

  let content;
  if (phase === "playing" && mine) {
    // Statut en JSX (et non plus une simple chaîne) : l'or est représenté par
    // la MÊME pépite SVG que sur la grille (NuggetIcon), plus par l'emoji 🪙.
    let statusText;
    if (winner) statusText = null;
    else if (bombArmed && isMyTurn) statusText = <>🧨 {t("gmBombArm")}</>;
    else if (lastAction?.type === "bomb") {
      const who = lastAction.seatId === me.id ? t("gmBombYou") : `${lastSeat?.username} ${t("gmBombOther")}`;
      statusText = <>💥 {who} (+{lastAction.gained} <NuggetIcon className="inline" />)</>;
    } else if (lastAction?.type === "dig" && lastAction.nugget) {
      statusText = lastAction.seatId === me.id
        ? <><NuggetIcon className="inline" /> {t("gmNuggetYou")}</>
        : <><NuggetIcon className="inline" /> {lastSeat?.username} {t("gmNuggetOther")}</>;
    } else if (isMyTurn) statusText = <>⛏️ {t("gmYourTurn")}</>;
    else if (isPlayer) statusText = `${t("chromatikWaitingFor")} ${activeSeat?.username}…`;
    else statusText = t("gmSpectating");

    content = (
      <div>
        {/* Duel : deux cartes de mineur face à face, progression vers 13. */}
        <div className="gm-duel">
          {seats.map((s, i) => (
            <div key={s.id} className={"gm-miner " + SEAT_TONES[i]
              + (activeSeat?.id === s.id && !winner ? " active" : "")
              + (s.id === me.id ? " me" : "")
              + (winner === s.id ? " won" : "")}>
              <span className="gm-miner-avatar">{s.avatar}</span>
              <span className="gm-miner-name">
                {s.username}
                {activeSeat?.id === s.id && s.isBot && !winner && (
                  <span className="pres-think" aria-hidden="true"><i>.</i><i className="d2">.</i><i className="d3">.</i></span>
                )}
              </span>
              <span className="gm-miner-gold">
                {gold[s.id] || 0}<i>/{GM_WIN_AT}</i> <NuggetIcon className="inline" />
              </span>
              <span className="gm-miner-track" aria-hidden="true">
                <span className="gm-miner-fill" style={{ width: Math.min(100, ((gold[s.id] || 0) / GM_WIN_AT) * 100) + "%" }} />
              </span>
              {bombs[s.id] && <span className="gm-miner-bomb" title={t("gmBombHint")}>🧨</span>}
              {turnDeadlineSeat === s.id && turnRemaining != null && !winner && (
                <span className={"turn-timer-chip mini" + (turnRemaining <= 5 ? " hot" : "")}>{turnRemaining}s</span>
              )}
              {goldPop?.seatId === s.id && <span className="gm-gold-pop" key={goldPop.key}>+{goldPop.count} <NuggetIcon className="inline" /></span>}
            </div>
          ))}
          <span className="gm-vs" aria-hidden="true">⛏️</span>
        </div>

        <p className="muted gm-status">
          {winner
            ? <strong>🏆 {winner === me.id ? t("gmWinYou") : `${winnerSeat?.username} ${t("gmWinOther")}`}</strong>
            : <>{statusText} <span className="gm-left">— {left} {t("gmNuggetsLeft")}</span></>}
        </p>

        {!winner && isMyTurn && (
          <div className="turn-banner">
            <span className="turn-banner-badge">🫵 {t("yourTurnBadge")}</span>
            {turnRemaining != null && (
              <span className={"turn-timer-chip" + (turnRemaining <= 5 ? " hot" : "")}>⏱ {turnRemaining}s</span>
            )}
          </div>
        )}

        <div
          ref={gridRef}
          className={"gm-grid" + (isMyTurn && !winner ? " myturn" : "") + (bombArmed && isMyTurn ? " bombing" : "") + (bombFx ? " quake" : "")}
          style={{ "--gm-cols": GM_COLS }}
        >
          {Array.from({ length: GM_ROWS * GM_COLS }, (_, idx) => {
            const rev = revealed[idx];
            if (!rev) {
              return (
                <button
                  key={idx}
                  type="button"
                  className="gm-cell hidden"
                  onClick={() => attemptCell(idx)}
                  disabled={!isMyTurn || !!winner}
                  aria-label={"case " + idx}
                />
              );
            }
            if (mine.nugget[idx]) {
              const diggerIdx = seats.findIndex(s => s.id === rev);
              const tone = SEAT_TONES[diggerIdx] || "amber";
              const digger = seats[diggerIdx];
              const isFresh = freshNuggets.ids.includes(idx);
              return (
                <span key={idx} className={"gm-cell nugget " + tone + (isFresh ? " fresh" : " settled")} title={digger?.username}>
                  {isFresh && <i className="gm-rays" aria-hidden="true" />}
                  <b><NuggetIcon /></b>
                </span>
              );
            }
            const n = mine.adj[idx];
            const bombedNow = bombFx && lastAction?.type === "bomb" && lastAction.cells?.includes(idx);
            // Retournement en vague depuis le centre de l'explosion.
            const delay = bombedNow
              ? Math.max(Math.abs(Math.floor(idx / GM_COLS) - Math.floor(lastAction.center / GM_COLS)),
                         Math.abs((idx % GM_COLS) - (lastAction.center % GM_COLS))) * 130
              : 0;
            return (
              <span key={idx} className={"gm-cell open n" + n + (bombedNow ? " bombed" : "")}
                style={bombedNow ? { animationDelay: delay + "ms" } : undefined}>
                {n > 0 ? n : ""}
              </span>
            );
          })}

          {/* 💥 Explosion : onde de choc + éclat au centre du carré soufflé,
              pendant que la grille tremble (classe .quake). */}
          {bombFx && (
            <span
              key={bombFx.key}
              className="gm-boom"
              aria-hidden="true"
              style={{
                left: (((bombFx.center % GM_COLS) + 0.5) / GM_COLS * 100) + "%",
                top: ((Math.floor(bombFx.center / GM_COLS) + 0.5) / GM_ROWS * 100) + "%",
              }}
            >
              <i className="gm-boom-wave" />
              <i className="gm-boom-flash">💥</i>
            </span>
          )}

        </div>

        {/* Dynamite : un seul bâton par partie — armer, viser, boum. */}
        {!winner && isPlayer && (
          <div className="gm-bomb-bar">
            {myBombAvailable ? (
              bombArmed ? (
                <>
                  <span className="gm-bomb-armed-hint">🧨 {t("gmBombArm")}</span>
                  <button type="button" className="btn ghost" style={{ width: "auto", padding: "8px 16px", fontSize: 13 }} onClick={() => setBombArmed(false)}>
                    {t("chromatikCancel")}
                  </button>
                </>
              ) : (
                <button type="button" className="gm-bomb-btn" disabled={!isMyTurn} onClick={() => setBombArmed(true)} title={t("gmBombHint")}>
                  🧨 {t("gmBomb")}
                </button>
              )
            ) : (
              <span className="gm-bomb-used">💨 {t("gmBombUsed")}</span>
            )}
          </div>
        )}

        {winner && (
          <div className="chromatik-round-summary">
            <h3 className="chromatik-round-summary-title">
              🏆 {winnerSeat?.avatar} {winnerSeat?.username} {t("gmWinOther")}
            </h3>
            <div className="pres-podium">
              {[...seats].sort((a, b) => (gold[b.id] || 0) - (gold[a.id] || 0)).map((s, i) => (
                <div key={s.id} className={"pres-podium-row" + (i === 0 ? " first" : "") + (s.id === me.id ? " me" : "")}>
                  <span className="place">{i + 1}</span>
                  <span className="name">{s.avatar} {s.username}</span>
                  <span className="pts">{gold[s.id] || 0} <NuggetIcon className="inline" /></span>
                </div>
              ))}
            </div>
            {isPlayer && (
              <p style={{ fontWeight: 800, textAlign: "center", marginTop: 10 }}>
                {t("peYourGain")} <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>+{myGain} {t("pts")}</span>
              </p>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
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
    // phase "intro" : choix des 2 mineurs si la salle en compte plus
    if (needsPick) {
      content = isHost ? (
        <div>
          <p className="hint">{t("gmPickHint")}</p>
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
          <button className="btn" disabled={selected.length === 0 || selected.length > TABLE_SIZE} onClick={confirmPick}>
            {t("chromatikPickConfirm")}
          </button>
        </div>
      ) : <p className="muted">{t("chromatikWaitPick")}</p>;
    } else {
      content = <p className="muted">{t("gmStarting")}</p>;
    }
  }

  return (
    <div className="panel gm-panel" style={{ maxWidth: "min(640px, 94vw)" }}>
      <h1>{t("goldminesTitle")}</h1>
      <p className="muted gm-goal-line">🎯 {t("gmGoal")}</p>
      <Crossfade id={phase}>{content}</Crossfade>
      {/* Décompte 3-2-1 aux couleurs or du jeu : couvre tout le panneau et
          bloque les clics le temps que chacun soit prêt à piocher. */}
      {countingDown && phase === "playing" && (
        <GameCountdown variant="gm" onDone={() => setCountingDown(false)} />
      )}
    </div>
  );
}
