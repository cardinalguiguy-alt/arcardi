"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby, recordMatchResult } from "@/lib/gameSync";
import Crossfade from "@/components/Crossfade";
import GameCountdown, { COUNTDOWN_MS } from "@/components/GameCountdown";
import CardView from "./CardView";
import {
  COLORS, freshDeck, shuffle, canPlay, hasPlayable, drawCards, nextSeatIdx,
  canStackOn, hasStackable, handPenaltyValue, sortHandForDisplay,
} from "./deck";
import { decideBotMove, decideBotDrawFollowUp } from "./botLogic";

/* ==========================================================================
   CHROMATIK — jeu de cartes original (pas UNO : mêmes racines de mécanique
   que toute la famille des jeux de cartes à défausse colorée, mais nom,
   identité visuelle et libellés propres à ARCARDI).

   Pattern réseau : hôte arbitre (comme Puissance 4 / Petits Chevaux). Les
   bots ne sont PAS des participants réseau : quand c'est leur tour, l'HÔTE
   calcule leur coup directement (decideBotMove) et l'applique exactement
   comme un coup humain reçu par broadcast — aucune infrastructure nouvelle.

   PARTIE EN PLUSIEURS MANCHES (demande explicite) : l'hôte choisit un
   nombre de manches (5/7/10) au lancement. À la fin de CHAQUE manche,
   chaque siège ajoute à son score de PARTIE (matchScores) la valeur des
   cartes qui lui restent en main (voir handPenaltyValue dans deck.js) —
   objectif : le score cumulé le plus BAS à l'issue de la dernière manche.
   Un même événement réseau "match_start" sert à distribuer CHAQUE manche
   (round 1 comme round 2..N) ; seul le contenu du payload change (round 1
   repart de matchScores à zéro, les suivantes les portent d'une manche à
   l'autre) — voir dealRoundState()/startWith()/nextRound().

   SURENCHÈRE +2/+4 (règle demandée, pas UNO officiel) : un +2 ne peut être
   contré que par un +2 ; un +4 peut être contré par un +4 OU un +2. Tant
   qu'une pile de pioche est en attente (pendingDraw = {kind, count,
   seatId}), le siège concerné n'a que deux choix légaux : contrer avec une
   carte qui "surenchérit" (canStackOn) ou piocher le total accumulé
   (draw_pending, qui solde la pile). Tant que pendingDraw cible un siège,
   c'est TOUJOURS son tour (turnIdx pointe dessus) — jamais un état à part.

   ANNONCE UNO (règle demandée) : dès qu'un siège n'a plus qu'une carte,
   unoCalled[siège] repart à false — il doit presser le bouton avant de
   jouer cette dernière carte. S'il la joue sans l'avoir annoncée, il pioche
   2 cartes au lieu de remporter la manche (voir le branchement dans
   hostApplyMove). Les bots s'annoncent automatiquement (pas d'interface).

   Confidentialité des mains : modèle de confiance simple, comme le reste
   de la plateforme (ex: le code des portes de Diapason transite aussi en
   clair). Chaque client REÇOIT l'état complet (toutes les mains), mais
   n'affiche que la sienne en face visible ; celles des autres sont
   rendues dos tourné. Pas de canaux privés par joueur pour cette v1.
   ========================================================================== */

const GAME_ID = "chromatik";
const HAND_SIZE = 7;
// Minuteur de tour humain (même convention que Président, voir
// armHumanTurnTimer plus bas) : 30s par défaut (20s jugés trop stressants à
// l'usage), réduit à 5s après 2 dépassements consécutifs du même joueur,
// remis à 30s dès qu'il rejoue. S'applique aussi quand le siège actif doit
// répondre à une pile de pioche en attente (l'échéance pioche le total pour
// lui, exactement comme un tour normal non joué).
const HUMAN_TURN_MS = 30000;
const HUMAN_TURN_SHORT_MS = 5000;
const HUMAN_TURN_STRIKES = 2;
const BOT_AVATARS = ["🤖", "🦾", "👾"];
// Nerf bots (demande 2026-07) : probabilité qu'un bot OUBLIE d'annoncer
// UNO en tombant à 1 carte — comme un humain, ~1,5 fois sur 10. S'il joue
// ensuite sa dernière carte sans annonce, pénalité classique de 2 cartes.
const BOT_UNO_FORGET_RATE = 0.15;
// Seuils "grande main" (demande 2026-07) : au-delà, les cartes de la main
// locale rétrécissent, puis la main passe en défilement latéral — voir
// .chromatik-hand.crowded/.packed dans globals.css.
const HAND_CROWDED_AT = 13;
const HAND_PACKED_AT = 19;
// Vert dédié aux cartes (voir COLOR_VARS dans deck.js pour le détail) — pas
// --p3, réservé à l'accent général du site.
const COLOR_VAR_MAP = { red: "--p1", green: "--chromatik-green", blue: "--ludoB", yellow: "--ludoY" };
const ROUND_OPTIONS = [1, 3, 5];
// Nombre de dos de carte affichés par l'animation de pioche (voir drawFx) —
// plafonné pour rester lisible même si une pile de surenchère s'est
// accumulée à 6, 8 cartes ou plus.
const DRAW_FX_MAX = 6;

function makeBotSeat(n) {
  return { id: "bot" + n, username: "Bot " + n, avatar: BOT_AVATARS[(n - 1) % BOT_AVATARS.length], isBot: true };
}

// Décalage/rotation de la pile de défausse (fix jouabilité 2026-07) : dérivé
// de l'id de la carte par un petit hash déterministe — STABLE d'un rendu à
// l'autre (jamais retiré au hasard à chaque render, sinon les cartes déjà
// posées "sauteraient" visuellement à chaque mise à jour d'état reçue par
// broadcast). Donne l'effet d'une vraie pile posée sur la table.
function discardCardOffset(cardId) {
  let h = 0;
  for (let i = 0; i < cardId.length; i++) h = (h * 31 + cardId.charCodeAt(i)) | 0;
  h = Math.abs(h);
  return {
    angle: (h % 17) - 8,      // -8..+8deg
    dx: ((h >> 4) % 13) - 6,  // -6..+6px
    dy: ((h >> 8) % 9) - 4,   // -4..+4px
  };
}

// Flèches de sens de jeu (demande 2026-07) : chevrons translucides et
// "vivants" (vague de lumière qui court dans le sens du jeu), intercalés
// ENTRE les joueurs plutôt qu'un badge statique dans un coin. Quand une
// carte Inverse passe, la clé React (= direction) remonte le composant et
// rejoue l'animation de bascule (morph scaleX -1 -> 1), donc l'inversion
// se VOIT. Uniquement à 3-4 joueurs : à 2, le sens n'a aucun effet
// (Inverse = rejouer), une flèche serait du bruit visuel.
function FlowArrow({ direction, size }) {
  return (
    <span
      key={direction}
      className={"chromatik-flow" + (direction === -1 ? " rev" : "") + (size ? " " + size : "")}
      aria-hidden="true"
    >
      <i>❯</i><i>❯</i><i>❯</i>
    </span>
  );
}

// Distribue UNE manche (la première comme les suivantes) : cartes fraîches
// et mélangées, mais `matchScores`/`roundIndex`/`roundTarget` sont fournis
// par l'appelant (startWith pour la manche 1, nextRound pour la suite) —
// c'est ce qui fait persister le score cumulé d'une manche à l'autre.
function dealRoundState(seats, matchInfo) {
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
  // Rotation du premier joueur (équité, correctif 2026-07) : mesuré sur
  // 90 000 manches simulées, le siège qui ouvre gagne sensiblement plus
  // souvent (51,2 % à 2 joueurs) — et sans rotation le MÊME siège ouvrait
  // toutes les manches du match. Manche 1 -> siège 0, manche 2 -> siège 1,
  // etc. (l'ordre des sièges, lui, a déjà été mélangé au lancement).
  const openerIdx = ((matchInfo.roundIndex || 1) - 1) % seats.length;
  return {
    seats, hands, deck, discard, activeColor, turnIdx: openerIdx, direction: 1, winner: null, lastAction: null,
    pendingDraw: null, pendingDrawnCard: null, unoCalled: {}, roundScores: {},
    roundIndex: matchInfo.roundIndex, roundTarget: matchInfo.roundTarget, matchScores: matchInfo.matchScores,
  };
}

export default function ChromatikGame({ room, me, isHost, players, t, lang, onFinish }) {
  const [phase, setPhase] = useState("intro"); // intro -> playing (le winner ne fait jamais disparaître la table)
  const [tableSize, setTableSize] = useState(null); // 2 | 3 | 4, choisi par l'hôte
  const [roundTarget, setRoundTarget] = useState(null); // 5 | 7 | 10, choisi par l'hôte
  const [selected, setSelected] = useState([]);
  const [seats, setSeats] = useState([]);
  const [hands, setHands] = useState({});
  const [deck, setDeck] = useState([]);
  const [discard, setDiscard] = useState([]);
  const [activeColor, setActiveColor] = useState(null);
  const [turnIdx, setTurnIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [winner, setWinner] = useState(null); // vainqueur de LA MANCHE en cours (jamais celui du match, voir matchOver)
  const [lastAction, setLastAction] = useState(null);
  const [pendingDraw, setPendingDraw] = useState(null); // {kind:"draw2"|"wild4", count, seatId} | null
  // Pioche volontaire dont la carte piochée est jouable (fix jouabilité
  // 2026-07) : le tour ne change PAS tant que ce siège n'a pas choisi de la
  // jouer immédiatement ou de la garder (voir action "keep" côté hôte).
  const [pendingDrawnCard, setPendingDrawnCard] = useState(null); // { seatId, cardId } | null
  const [unoCalled, setUnoCalled] = useState({});
  const [roundIndex, setRoundIndex] = useState(1);
  const [matchScores, setMatchScores] = useState({}); // seatId -> score cumulé (manches précédentes incluses)
  const [roundScores, setRoundScores] = useState({}); // seatId -> valeur ajoutée par LA manche qui vient de finir
  const [colorPickerFor, setColorPickerFor] = useState(null); // cardId en attente de choix de couleur (joueur local)
  const [myWin, setMyWin] = useState(false);
  const [channelReady, setChannelReady] = useState(false);
  // Minuteur de tour humain (affichage) : deadline + siège concerné,
  // diffusés par l'hôte dans chaque état réseau — tous les clients
  // calculent le compte à rebours localement à partir du même horodatage.
  const [turnDeadline, setTurnDeadline] = useState(null);
  const [turnDeadlineSeat, setTurnDeadlineSeat] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  // Décompte 3-2-1 (2026-07) : déclenché au MÊME moment que match_start,
  // c'est-à-dire seulement APRÈS que l'hôte a choisi les sièges (humains +
  // bots) — voir startWith/sendMatchStart plus bas, aucun changement de
  // logique de démarrage nécessaire, juste un voile posé au bon moment.
  const [countingDown, setCountingDown] = useState(false);
  const countdownEndRef = useRef(0);
  // Animation de pioche (voir lastAction plus bas) : purement locale à
  // chaque client, jamais synchronisée en tant que telle — chacun la
  // déclenche de son côté en réaction au MÊME lastAction reçu par broadcast.
  const [drawFx, setDrawFx] = useState(null); // { seatId, count, toMe, key } | null
  // Bulle "crie UNO" (fix jouabilité 2026-07) : purement locale à chaque
  // client, affichée pour TOUT LE MONDE (dont les spectateurs) dès qu'un
  // événement call_uno est reçu — indépendante de la mise à jour d'état
  // (unoCalled), qui reste réservée à l'hôte.
  const [unoBubble, setUnoBubble] = useState(null); // { seatId, key } | null
  // Annonce de pénalité (correctif lisibilité 2026-07) : overlay centré sur
  // la table, "UNTEL pioche N cartes", affiché ~2,6s à chaque pile +2/+4
  // soldée ou pénalité UNO — purement local, dérivé du même lastAction que
  // l'animation de pioche.
  const [penaltyFx, setPenaltyFx] = useState(null); // { seatId, count, key } | null

  const channelRef = useRef(null);
  const stateRef = useRef(null);
  const savedResultRef = useRef(false);
  const autoStartedRef = useRef(false);
  const restoredRef = useRef(false);
  const botTimer = useRef(null);
  const turnTimeoutRef = useRef(null);  // setTimeout qui déclenche l'action automatique du joueur humain actif
  const turnStrikesRef = useRef({});    // seatId -> nombre de dépassements consécutifs
  const turnMetaRef = useRef({ deadline: null, seatId: null });
  const drawFxKeyRef = useRef(0);
  const drawFxTimerRef = useRef(null);
  const unoBubbleKeyRef = useRef(0);
  const unoBubbleTimerRef = useRef(null);
  const penaltyFxKeyRef = useRef(0);
  const penaltyFxTimerRef = useRef(null);

  useEffect(() => {
    stateRef.current = {
      seats, hands, deck, discard, activeColor, turnIdx, direction, winner,
      pendingDraw, pendingDrawnCard, unoCalled, roundIndex, roundTarget, matchScores, roundScores,
    };
  }, [seats, hands, deck, discard, activeColor, turnIdx, direction, winner,
      pendingDraw, pendingDrawnCard, unoCalled, roundIndex, roundTarget, matchScores, roundScores]);

  function applyLocalState(s, extra = {}) {
    setSeats(s.seats); setHands(s.hands); setDeck(s.deck); setDiscard(s.discard);
    setActiveColor(s.activeColor); setTurnIdx(s.turnIdx); setDirection(s.direction);
    setWinner(s.winner || null); setLastAction(s.lastAction || null);
    setPendingDraw(s.pendingDraw || null); setPendingDrawnCard(s.pendingDrawnCard || null); setUnoCalled(s.unoCalled || {});
    setRoundIndex(s.roundIndex || 1); setMatchScores(s.matchScores || {}); setRoundScores(s.roundScores || {});
    setTurnDeadline(s.turnDeadline || null); setTurnDeadlineSeat(s.turnDeadlineSeat || null);
    if (extra.resetGain) { setMyWin(false); savedResultRef.current = false; }
  }

  useEffect(() => {
    if (!turnDeadline) return;
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [turnDeadline]);

  // Déclenche l'animation "cartes qui glissent depuis la pioche" quand
  // quelqu'un pioche réellement (pénalité +2/+4 non contrée, dépassement du
  // minuteur, pioche volontaire, ou pioche UNO manquée) — jamais quand un
  // joueur CONTRE avec son propre +2/+4 (il ne pioche rien, la pile
  // continue simplement vers le suivant).
  useEffect(() => {
    if (!lastAction) return;
    const isDraw = lastAction.type === "draw" && lastAction.count > 0;
    const isUnoPenalty = lastAction.type === "unoPenalty";
    if (!isDraw && !isUnoPenalty) return;
    // Pénalité (pile +2/+4 soldée ou oubli d'UNO) : animation RALENTIE
    // (correctif lisibilité 2026-07 — trop rapide, on ne voyait pas à qui
    // elle s'appliquait) + annonce centrée "qui pioche combien" (voir
    // penaltyFx plus bas), en plus des dos de cartes qui volent.
    const isPenalty = (isDraw && lastAction.wasPenalty) || isUnoPenalty;
    const realCount = isUnoPenalty ? 2 : lastAction.count;
    const count = Math.min(realCount, DRAW_FX_MAX);
    drawFxKeyRef.current += 1;
    setDrawFx({ seatId: lastAction.seatId, count, toMe: lastAction.seatId === me.id, slow: isPenalty, key: drawFxKeyRef.current });
    clearTimeout(drawFxTimerRef.current);
    drawFxTimerRef.current = setTimeout(() => setDrawFx(null), isPenalty ? 1000 + count * 170 : 700 + count * 90);
    if (isPenalty) {
      penaltyFxKeyRef.current += 1;
      setPenaltyFx({ seatId: lastAction.seatId, count: realCount, key: penaltyFxKeyRef.current });
      clearTimeout(penaltyFxTimerRef.current);
      penaltyFxTimerRef.current = setTimeout(() => setPenaltyFx(null), 2600);
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
      setColorPickerFor(null);
      // Décompte 3-2-1 : posé pile au démarrage de la manche (après le choix
      // des sièges par l'hôte, jamais avant — voir startWith). Les bots
      // attendent sa fin via countdownEndRef (voir scheduleBots).
      countdownEndRef.current = Date.now() + COUNTDOWN_MS;
      setCountingDown(true);
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
      // Un message reçu de ce siège = il n'est plus AFK : bénéfice du délai
      // complet (30s) pour son PROCHAIN tour.
      turnStrikesRef.current[payload.seatId] = 0;
      hostApplyMove(payload.seatId, payload.action);
    });

    ch.on("broadcast", { event: "call_uno" }, ({ payload }) => {
      // Bulle "crie UNO" : affichage LOCAL pour TOUS les clients, y compris
      // les spectateurs — fusionnée dans le même callback que la résolution
      // d'état plutôt qu'un second .on() séparé, pour ne dépendre d'aucune
      // hypothèse sur le nombre d'écouteurs qu'un canal Supabase accepte
      // pour un même événement. Seule hostApplyUnoCall (état de partie)
      // reste réservée à l'hôte ci-dessous.
      unoBubbleKeyRef.current += 1;
      setUnoBubble({ seatId: payload.seatId, key: unoBubbleKeyRef.current });
      clearTimeout(unoBubbleTimerRef.current);
      unoBubbleTimerRef.current = setTimeout(() => setUnoBubble(null), 2200);
      if (!isHost) return;
      hostApplyUnoCall(payload.seatId);
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
            // Reprise après rechargement de l'HÔTE (correctif 2026-07) :
            // sans ça, si la sauvegarde datait d'un tour de BOT (ou d'une
            // échéance humaine en cours), plus rien ne relançait jamais
            // l'arbitrage — ni scheduleBots ni le minuteur n'étaient
            // réarmés — et la table restait figée pour tout le monde. On
            // rediffuse l'état restauré (deadline fraîche, pile de pénalité
            // éventuellement soldée par settleForcedDraw) et on réarme les
            // deux moteurs, exactement comme après un coup normal. Entre
            // deux manches (winner posé), rien à réarmer : le bouton
            // "manche suivante" de l'hôte suffit.
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
      clearTimeout(drawFxTimerRef.current);
      clearTimeout(unoBubbleTimerRef.current);
      clearTimeout(penaltyFxTimerRef.current);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, isHost]);

  // Calcule, à partir d'un état sur le point d'être diffusé, la deadline du
  // tour humain à venir (voir le pendant côté Président pour le détail).
  function computeTurnDeadline(next) {
    if (!next || next.winner || !next.seats || !next.seats.length) return { deadline: null, seatId: null };
    const seat = next.seats[next.turnIdx];
    if (!seat || seat.isBot) return { deadline: null, seatId: null };
    const strikes = turnStrikesRef.current[seat.id] || 0;
    const ms = strikes >= HUMAN_TURN_STRIKES ? HUMAN_TURN_SHORT_MS : HUMAN_TURN_MS;
    return { deadline: Date.now() + ms, seatId: seat.id };
  }

  // Arme le minuteur qui, si le joueur humain actif ne fait rien, agit à sa
  // place à l'échéance : pioche à sa place (mécanique historique — à
  // Chromatik il n'existe pas de "passe" distincte, piocher termine
  // toujours le tour, jouable ou non), SAUF s'il a déjà une carte piochée
  // en attente de décision (voir pendingDrawnCard/fix "jouer ou garder"),
  // auquel cas une pioche de plus serait illégale (voir hostApplyMove) et
  // bloquerait la partie : l'échéance "garde" alors la carte à sa place.
  // Chaque dépassement incrémente le compteur de grillages consécutifs
  // (turnStrikesRef), remis à 0 dès que le joueur agit de lui-même.
  function armHumanTurnTimer() {
    clearTimeout(turnTimeoutRef.current);
    if (!isHost) return;
    const { deadline, seatId } = turnMetaRef.current;
    if (!deadline || !seatId) return;
    const delay = Math.max(0, deadline - Date.now());
    turnTimeoutRef.current = setTimeout(() => {
      const s = stateRef.current;
      if (!s || s.winner) return;
      if (!s.seats[s.turnIdx] || s.seats[s.turnIdx].id !== seatId) return; // le tour a déjà changé
      turnStrikesRef.current[seatId] = (turnStrikesRef.current[seatId] || 0) + 1;
      const awaitingDecision = !!(s.pendingDrawnCard && s.pendingDrawnCard.seatId === seatId);
      hostApplyMove(seatId, awaitingDecision ? { type: "keep" } : { type: "draw" });
    }, delay);
  }

  // ----- Arbitrage (hôte uniquement) -----

  // Pioche FORCÉE d'une pile de pénalité +2/+4 (correctif demandé) : dès
  // qu'un état sur le point d'être diffusé cible un siège qui n'a
  // RIGOUREUSEMENT AUCUNE carte pour contrer (hasStackable), il n'y a plus
  // aucune décision à prendre — la pioche du total accumulé est donc
  // OBLIGATOIRE et AUTOMATIQUE, réglée ici immédiatement plutôt que
  // d'attendre un clic sur la pioche ou l'échéance du minuteur de tour.
  // S'il PEUT contrer, on ne touche à rien : la main lui revient (contrer
  // ou piocher volontairement restent tous les deux légaux, voir
  // hostApplyMove).
  //
  // Précision (correctif demandé) : si cette pioche automatique lui donne
  // justement une carte capable de contrer, la dette est payée (pile
  // soldée) mais son tour NE passe PAS automatiquement au suivant — le
  // dessus de la défausse est toujours le +2/+4 en question, donc
  // canPlay() la reconnaît comme un coup normal légal : on le laisse
  // simplement continuer son tour comme n'importe quel tour normal (jouer
  // cette carte — ce qui ouvre une TOUTE NOUVELLE pile, la dette d'avant
  // étant déjà payée — ou "passer" via la pioche volontaire habituelle,
  // aucun bouton dédié nécessaire). Seulement s'il n'a TOUJOURS rien après
  // avoir pioché, le tour avance réellement au siège suivant.
  // À distinguer du cas où un joueur POUVAIT contrer mais a choisi de
  // piocher volontairement (bouton pioche pendant pendingDraw, voir action
  // "draw" dans hostApplyMove) : dans CE cas-là, le tour passe toujours au
  // suivant, même si la pioche lui redonne de quoi contrer — c'est un choix
  // assumé de passer, pas une pioche forcée, donc jamais géré ici.
  function settleForcedDraw(next) {
    if (!next || !next.pendingDraw || !next.seats || !next.seats.length) return next;
    const { kind, count, seatId } = next.pendingDraw;
    const hand = (next.hands && next.hands[seatId]) || [];
    if (hasStackable(hand, kind)) return next;
    const res = drawCards(next.deck, next.discard, count);
    const newHand = hand.concat(res.cards);
    const hands = { ...next.hands, [seatId]: newHand };
    const targetIdx = next.seats.findIndex(seat => seat.id === seatId);
    const turnIdx = hasStackable(newHand, kind)
      ? next.turnIdx // pioche forcée mais désormais capable de contrer : son tour continue
      : nextSeatIdx(targetIdx, next.direction, next.seats.length); // toujours rien : le tour avance
    return {
      ...next, hands, deck: res.deck, discard: res.discard, turnIdx,
      pendingDraw: null, pendingDrawnCard: null,
      unoCalled: { ...(next.unoCalled || {}), [seatId]: false },
      lastAction: { type: "draw", seatId, count, wasPenalty: true },
    };
  }

  function broadcastNewState(rawNext) {
    const next = settleForcedDraw(rawNext);
    const tm = computeTurnDeadline(next);
    turnMetaRef.current = tm;
    channelRef.current.send({ type: "broadcast", event: "state", payload: { ...next, turnDeadline: tm.deadline, turnDeadlineSeat: tm.seatId } });
    armHumanTurnTimer();
  }
  // Bulle "crie UNO" pour les BOTS (nerf 2026-07) : quand un bot annonce
  // (il "oublie" parfois, voir BOT_UNO_FORGET_RATE), l'hôte diffuse le même
  // événement call_uno qu'un clic humain — tous les clients voient la même
  // bulle, et hostApplyUnoCall côté hôte est un no-op inoffensif (l'annonce
  // est déjà posée dans l'état diffusé juste avant).
  function maybeAnnounceBotUno(prevState, next, seatId, seat) {
    if (!seat?.isBot || !next) return;
    if (!next.unoCalled || !next.unoCalled[seatId]) return;
    if ((prevState.unoCalled || {})[seatId]) return; // déjà annoncé avant ce coup
    if ((next.hands[seatId] || []).length !== 1) return;
    channelRef.current?.send({ type: "broadcast", event: "call_uno", payload: { seatId } });
  }

  function sendMatchStart(payload) {
    // Nouvelle manche : chacun repart avec le délai complet (30s).
    turnStrikesRef.current = {};
    const tm = computeTurnDeadline(payload);
    // Décompte 3-2-1 (2026-07) : le premier tour humain ne commence à
    // décompter ses 30 s qu'une fois le décompte terminé (équité vis-à-vis
    // de l'overlay qui bloque les clics pendant ce temps).
    if (tm.deadline) tm.deadline += COUNTDOWN_MS;
    turnMetaRef.current = tm;
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: { ...payload, turnDeadline: tm.deadline, turnDeadlineSeat: tm.seatId } });
    armHumanTurnTimer();
  }

  function hostApplyMove(seatId, action) {
    const s = stateRef.current;
    if (!s || s.winner) return;
    const currentSeat = s.seats[s.turnIdx];
    if (!currentSeat || currentSeat.id !== seatId) return;

    let { hands: h, deck: d, discard: disc, activeColor: ac, turnIdx: ti, direction: dir, pendingDraw: pd } = s;
    h = { ...h }; d = d.slice(); disc = disc.slice();
    const hand = h[seatId] || [];
    // Champs de match qu'on reporte tels quels dans CHAQUE état diffusé —
    // seule la résolution de manche (plus bas) les fait évoluer.
    const carry = { roundIndex: s.roundIndex, roundTarget: s.roundTarget, matchScores: s.matchScores };
    const respondingToPending = !!(pd && pd.seatId === seatId);
    // Pioche volontaire dont la carte est jouable, en attente que CE siège
    // choisisse de la jouer ou de la garder (voir action "keep" plus bas) —
    // tant qu'elle est active, aucune nouvelle pioche n'est légale, et un
    // "play" n'est légal QUE sur cette carte précise.
    const drawDecision = s.pendingDrawnCard && s.pendingDrawnCard.seatId === seatId ? s.pendingDrawnCard : null;

    // Résout la conséquence d'une carte JOUÉE (retirée de `activeHand`, qui
    // peut être la main d'avant tour normale OU la main incluant la carte
    // tout juste piochée) : légalité déjà vérifiée par l'appelant. Centralisé
    // ici pour être appelé aussi bien depuis un coup "play" classique que
    // depuis l'auto-jeu d'un bot sur sa propre carte piochée (voir plus bas)
    // — jamais dupliqué, et jamais via un second hostApplyMove imbriqué (qui
    // lirait un stateRef pas encore à jour, toujours l'état d'AVANT ce coup).
    function resolvePlayedCard(activeHand, card, chosenColor) {
      const idx = activeHand.findIndex(c => c.id === card.id);
      if (idx === -1) return null;
      const newHand = activeHand.slice(0, idx).concat(activeHand.slice(idx + 1));
      h[seatId] = newHand;
      disc = disc.concat([card]);
      const isWild = card.kind === "wild" || card.kind === "wild4";
      ac = isWild ? (chosenColor || ac) : card.color;

      // Toute carte jouée "consomme" une éventuelle annonce UNO déjà faite
      // (elle ne vaut que pour LA carte annoncée) ; un bot annonce tout seul
      // dès qu'il tombe pile à 1 carte (pas d'interface pour lui) — MAIS il
      // "oublie" parfois, comme un humain (nerf demandé 2026-07) : ~15 % du
      // temps il n'annonce pas et mangera la pénalité de 2 cartes s'il pose
      // sa dernière carte sans s'être rattrapé. Le "❗" côté adversaires
      // s'affiche alors sur lui, exactement comme pour un humain distrait.
      let unoCalledNext = { ...(s.unoCalled || {}), [seatId]: false };
      if (currentSeat.isBot && newHand.length === 1) unoCalledNext[seatId] = Math.random() >= BOT_UNO_FORGET_RATE;

      if (newHand.length === 0) {
        const hadCalledUno = !!(s.unoCalled && s.unoCalled[seatId]);
        if (!hadCalledUno) {
          // Oubli d'annonce UNO : pioche-pénalité de 2, LA MANCHE CONTINUE
          // (il rejoue avec 2 cartes au lieu de 0 — jamais une victoire).
          const res2 = drawCards(d, disc, 2);
          h[seatId] = res2.cards;
          return {
            ...carry, seats: s.seats, hands: h, deck: res2.deck, discard: res2.discard, activeColor: ac,
            turnIdx: nextSeatIdx(ti, dir, s.seats.length), direction: dir, winner: null,
            pendingDraw: null, pendingDrawnCard: null, unoCalled: unoCalledNext,
            lastAction: { type: "unoPenalty", seatId, card },
          };
        }
        // Cas +2/+4 joué comme DERNIÈRE carte (correctif demandé) : la
        // manche se termine immédiatement — l'adversaire visé n'a aucune
        // occasion de surenchérir — mais l'effet de la carte doit tout de
        // même s'appliquer avant le calcul des scores : il pioche
        // AUTOMATIQUEMENT le total (2/4, ou plus si cette carte contrait
        // elle-même une pile de surenchère déjà en cours — même calcul
        // `base + 2/4` que dans la branche normale plus bas), ajouté à sa
        // main AVANT handPenaltyValue. Exception déjà couverte au-dessus :
        // si l'annonce UNO n'a pas été faite, on ne passe jamais ici (la
        // manche continue, pénalité UNO classique).
        if (card.kind === "draw2" || card.kind === "wild4") {
          const base = respondingToPending ? pd.count : 0;
          const finalCount = base + (card.kind === "draw2" ? 2 : 4);
          const targetIdx = nextSeatIdx(ti, dir, s.seats.length);
          const targetId = s.seats[targetIdx].id;
          const forced = drawCards(d, disc, finalCount);
          h[targetId] = (h[targetId] || []).concat(forced.cards);
          d = forced.deck; disc = forced.discard;
        }
        // Victoire de LA MANCHE : chaque siège ajoute la valeur de sa main
        // restante à son score de partie (le vainqueur ajoute 0, sa main
        // est déjà vide dans `h` ; l'adversaire visé ci-dessus a déjà sa
        // main mise à jour avec les cartes forcées).
        const roundScores = {};
        const matchScores = { ...(s.matchScores || {}) };
        s.seats.forEach(seat => {
          const val = handPenaltyValue(h[seat.id] || []);
          roundScores[seat.id] = val;
          matchScores[seat.id] = (matchScores[seat.id] || 0) + val;
        });
        return {
          seats: s.seats, hands: h, deck: d, discard: disc, activeColor: ac,
          turnIdx: ti, direction: dir, winner: seatId, pendingDraw: null, pendingDrawnCard: null, unoCalled: unoCalledNext,
          roundIndex: s.roundIndex, roundTarget: s.roundTarget, roundScores, matchScores,
          lastAction: { type: "play", seatId, card },
        };
      }

      // Poursuite normale de la manche, ou empilement d'une pioche en attente.
      let advance = 1;
      let newPending = null;
      if (card.kind === "skip") advance = 2;
      else if (card.kind === "reverse") {
        if (s.seats.length === 2) advance = 2;
        else dir = -dir;
      } else if (card.kind === "draw2") {
        const base = respondingToPending ? pd.count : 0;
        const targetIdx = nextSeatIdx(ti, dir, s.seats.length);
        // CORRECTIF : pendingDraw.seatId doit être l'ID du siège visé (chaîne),
        // jamais son INDEX numérique — sinon aucune comparaison seatId===id
        // ne matche jamais nulle part (myPendingResponse toujours null côté
        // client, respondingToPending toujours false côté hôte), et TOUTE la
        // règle de surenchère +2/+4 est silencieusement contournée : personne
        // n'est jamais forcé de contrer ou de piocher la pile, et cliquer la
        // pioche pendant qu'elle est censée être active ne tire qu'1 carte
        // au lieu du total accumulé.
        newPending = { kind: "draw2", count: base + 2, seatId: s.seats[targetIdx].id };
      } else if (card.kind === "wild4") {
        const base = respondingToPending ? pd.count : 0;
        const targetIdx = nextSeatIdx(ti, dir, s.seats.length);
        newPending = { kind: "wild4", count: base + 4, seatId: s.seats[targetIdx].id };
      }
      for (let i = 0; i < advance; i++) ti = nextSeatIdx(ti, dir, s.seats.length);

      return {
        ...carry, seats: s.seats, hands: h, deck: d, discard: disc, activeColor: ac,
        turnIdx: ti, direction: dir, winner: null, pendingDraw: newPending, pendingDrawnCard: null, unoCalled: unoCalledNext,
        lastAction: { type: "play", seatId, card },
      };
    }

    if (action.type === "draw") {
      // Décision "jouer ou garder" déjà en attente pour ce siège : une
      // pioche de plus n'est jamais légale tant qu'elle n'est pas tranchée
      // (voir aussi armHumanTurnTimer, qui "garde" plutôt que de reproduire
      // cette pioche à l'échéance, pour ne jamais bloquer la partie ici).
      if (drawDecision) return;
      // Pile de surenchère en attente pour CE siège : il pioche le TOTAL
      // accumulé (pas 1 seule carte) et solde la pile. Sinon, pioche
      // volontaire classique d'une carte.
      const drawN = respondingToPending ? pd.count : 1;
      const res = drawCards(d, disc, drawN);
      h[seatId] = hand.concat(res.cards);
      d = res.deck; disc = res.discard;

      if (!respondingToPending) {
        // Pioche volontaire (jamais le cas d'une pile de pénalité, qui ne
        // rend jamais ses cartes immédiatement jouables) : si la carte
        // piochée peut être jouée tout de suite, le tour ne se termine PAS
        // encore — ce siège doit choisir de la jouer ou de la garder.
        const drawnCard = res.cards[0];
        const topAfterDraw = disc[disc.length - 1];
        if (drawnCard && canPlay(drawnCard, topAfterDraw, ac)) {
          if (currentSeat.isBot) {
            // Comportement bot par défaut (demande explicite) : joue
            // immédiatement la carte piochée si elle est jouable.
            const followUp = decideBotDrawFollowUp(drawnCard, topAfterDraw, ac, h[seatId].filter(c => c.id !== drawnCard.id));
            if (followUp.play) {
              const next = resolvePlayedCard(h[seatId], drawnCard, followUp.chosenColor);
              if (next) { broadcastNewState(next); maybeAnnounceBotUno(s, next, seatId, currentSeat); scheduleBots(); return; }
            }
          } else {
            // Humain : décision différée, le tour reste le sien — voir
            // pendingDrawnCard (bouton "Garder" côté UI ; jouer se fait en
            // cliquant la carte normalement, comme n'importe quelle carte
            // jouable de la main).
            const next = {
              ...carry, seats: s.seats, hands: h, deck: d, discard: disc, activeColor: ac,
              turnIdx: ti, direction: dir, winner: null,
              pendingDraw: null, pendingDrawnCard: { seatId, cardId: drawnCard.id },
              unoCalled: { ...(s.unoCalled || {}), [seatId]: false },
              lastAction: { type: "draw", seatId, count: drawN, wasPenalty: false },
            };
            broadcastNewState(next);
            // Pas de scheduleBots() ici : c'est TOUJOURS le tour de ce même
            // siège humain, en attente de son choix.
            return;
          }
        }
      }

      const next = {
        ...carry, seats: s.seats, hands: h, deck: d, discard: disc, activeColor: ac,
        turnIdx: nextSeatIdx(ti, dir, s.seats.length), direction: dir, winner: null,
        pendingDraw: null, pendingDrawnCard: null, unoCalled: { ...(s.unoCalled || {}), [seatId]: false },
        lastAction: { type: "draw", seatId, count: drawN, wasPenalty: respondingToPending },
      };
      broadcastNewState(next);
      scheduleBots();
      return;
    }

    if (action.type === "keep") {
      // Garder la carte tout juste piochée plutôt que de la jouer (voir
      // ci-dessus) : termine le tour sans rien jouer de plus.
      if (!drawDecision) return;
      const next = {
        ...carry, seats: s.seats, hands: h, deck: d, discard: disc, activeColor: ac,
        turnIdx: nextSeatIdx(ti, dir, s.seats.length), direction: dir, winner: null,
        pendingDraw: null, pendingDrawnCard: null, unoCalled: { ...(s.unoCalled || {}), [seatId]: false },
        lastAction: { type: "keep", seatId },
      };
      broadcastNewState(next);
      scheduleBots();
      return;
    }

    const idx = hand.findIndex(c => c.id === action.cardId);
    if (idx === -1) return;
    const card = hand[idx];
    // Légalité : en pleine surenchère, SEULE une carte qui "contre"
    // légalement est jouable (canStackOn) ; une décision jouer/garder en
    // attente restreint de même à la SEULE carte tout juste piochée ;
    // sinon, règles normales.
    const legal = respondingToPending
      ? canStackOn(card, pd.kind)
      : (drawDecision ? card.id === drawDecision.cardId : canPlay(card, disc[disc.length - 1], ac));
    if (!legal) return;

    const next = resolvePlayedCard(hand, card, action.chosenColor);
    if (!next) return;
    broadcastNewState(next);
    maybeAnnounceBotUno(s, next, seatId, currentSeat);
    scheduleBots();
  }

  // Annonce UNO : n'importe quand (pas forcément le tour du siège), tant
  // qu'il lui reste exactement 1 carte — pas de minuteur, pas de nouveau
  // tour, ne perturbe JAMAIS le compte à rebours du tour en cours (on
  // réutilise tel quel le couple deadline/siège déjà armé, voir
  // turnMetaRef, plutôt que de le recalculer).
  function hostApplyUnoCall(seatId) {
    const s = stateRef.current;
    if (!s || s.winner) return;
    const hand = (s.hands && s.hands[seatId]) || [];
    if (hand.length !== 1) return;
    if (s.unoCalled && s.unoCalled[seatId]) return;
    const next = { ...s, unoCalled: { ...(s.unoCalled || {}), [seatId]: true } };
    const tm = turnMetaRef.current;
    channelRef.current.send({ type: "broadcast", event: "state", payload: { ...next, turnDeadline: tm.deadline, turnDeadlineSeat: tm.seatId } });
    persist(next);
  }

  // Si le nouveau tour revient à un bot, l'hôte joue à sa place après un
  // délai (lisibilité), en chaîne jusqu'à un tour humain ou victoire. Un
  // bot qui doit répondre à une pile de pioche en attente contre
  // systématiquement s'il le peut (voir decideBotMove). Délai aléatoire
  // (500ms-4s) plutôt que fixe (demande explicite) : rythme moins
  // mécanique, moins "un bot répond instantanément comme une horloge".
  function scheduleBots() {
    if (!isHost) return;
    const thinkDelay = 500 + Math.random() * 3500;
    const waitForCountdown = Math.max(0, countdownEndRef.current - Date.now());
    const delay = waitForCountdown + thinkDelay;
    botTimer.current = setTimeout(() => {
      const s = stateRef.current;
      if (!s || s.winner) return;
      const seat = s.seats[s.turnIdx];
      if (!seat || !seat.isBot) return;
      const hand = s.hands[seat.id] || [];
      const top = s.discard[s.discard.length - 1];
      const pending = s.pendingDraw && s.pendingDraw.seatId === seat.id ? s.pendingDraw : null;
      const move = decideBotMove(hand, top, s.activeColor, pending);
      hostApplyMove(seat.id, move);
    }, delay);
  }

  // ----- Démarrage : choix de la taille de table, sièges bots pour compléter -----
  function startWith(humanSeats) {
    const bots = [];
    for (let i = humanSeats.length + 1; i <= tableSize; i++) bots.push(makeBotSeat(i - humanSeats.length));
    const seatsFull = shuffle([...humanSeats, ...bots]);
    const zeroScores = {};
    seatsFull.forEach(seat => { zeroScores[seat.id] = 0; });
    const initial = dealRoundState(seatsFull, { roundIndex: 1, roundTarget, matchScores: zeroScores });
    sendMatchStart(initial);
  }

  // Manche suivante (même sièges, même score cumulé) — appelée par l'hôte
  // depuis l'écran de fin de manche tant que roundIndex < roundTarget.
  function nextRound() {
    if (!isHost || !seats.length) return;
    const initial = dealRoundState(seats, { roundIndex: roundIndex + 1, roundTarget, matchScores });
    sendMatchStart(initial);
  }

  useEffect(() => {
    if (!isHost || phase !== "intro" || autoStartedRef.current || !channelReady || !tableSize || !roundTarget) return;
    if (players.length <= tableSize) {
      autoStartedRef.current = true;
      const humanSeats = players.map(p => ({ id: p.profile_id, username: p.profiles?.username, avatar: p.profiles?.avatar, isBot: false }));
      startWith(humanSeats);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, channelReady, players.length, tableSize, roundTarget]);

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

  // "Rejouer" : repart d'une PARTIE ENTIÈREMENT NEUVE (manche 1, scores à
  // zéro) — n'est proposé qu'une fois la dernière manche jouée (voir
  // matchOver plus bas).
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
  const myPendingResponse = isMyTurn && pendingDraw && pendingDraw.seatId === me.id ? pendingDraw : null;
  // Pioche volontaire jouable en attente de décision (jouer ou garder) —
  // voir pendingDrawnCard/action "keep" côté hôte.
  const myDrawDecision = isMyTurn && pendingDrawnCard && pendingDrawnCard.seatId === me.id ? pendingDrawnCard : null;
  // Compte à rebours du tour humain en cours, calculé localement à partir de
  // la deadline diffusée par l'hôte — même horodatage partout.
  const turnRemaining = turnDeadline ? Math.max(0, Math.ceil((turnDeadline - now) / 1000)) : null;
  // Manche en cours terminée (winner non nul) ET c'était la DERNIÈRE manche
  // programmée -> c'est la partie entière qui se termine (podium + points
  // ARCARDI), pas juste une pause entre deux manches.
  const matchOver = !!(winner && roundTarget && roundIndex >= roundTarget);

  function attemptDraw() {
    // Une décision jouer/garder est déjà en attente : une pioche de plus
    // serait rejetée côté hôte de toute façon (voir hostApplyMove).
    if (!isMyTurn || myDrawDecision) return;
    channelRef.current?.send({ type: "broadcast", event: "move_attempt", payload: { seatId: me.id, action: { type: "draw" } } });
  }
  function attemptPlay(card) {
    if (!isMyTurn || !topCard) return;
    const legal = myPendingResponse
      ? canStackOn(card, myPendingResponse.kind)
      : (myDrawDecision ? card.id === myDrawDecision.cardId : canPlay(card, topCard, activeColor));
    if (!legal) return;
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
  // Garder la carte tout juste piochée plutôt que de la jouer (fix
  // jouabilité 2026-07) : termine le tour sans la poser.
  function keepDrawnCard() {
    if (!myDrawDecision) return;
    channelRef.current?.send({ type: "broadcast", event: "move_attempt", payload: { seatId: me.id, action: { type: "keep" } } });
  }
  function callUno() {
    if (!mySeat) return;
    channelRef.current?.send({ type: "broadcast", event: "call_uno", payload: { seatId: me.id } });
  }

  // Victoire/défaite ARCARDI (chaque joueur enregistre la sienne, RLS/RPC
  // oblige) — UNE SEULE FOIS, à la toute fin de la PARTIE (dernière
  // manche), jamais entre deux manches. Classement au score de match le
  // plus BAS ; le premier (place 0) gagne, tous les autres perdent.
  useEffect(() => {
    if (!matchOver || savedResultRef.current || !isPlayer) return;
    savedResultRef.current = true;
    const ranking = [...seats].sort((a, b) => (matchScores[a.id] ?? 0) - (matchScores[b.id] ?? 0));
    const place = ranking.findIndex(s => s.id === me.id);
    const won = place === 0;
    setMyWin(won);
    recordMatchResult(room.id, won);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchOver]);

  const needsPick = players.length > (tableSize || 0);
  const canIPlaySomething = isMyTurn && !myPendingResponse && topCard && hasPlayable(myHand, topCard, activeColor);
  const canICounter = myPendingResponse ? hasStackable(myHand, myPendingResponse.kind) : false;
  // Surbrillance de la pioche (fix jouabilité 2026-07) : le joueur actif
  // n'a plus le choix — aucune carte jouable, ou pile de pénalité qu'il ne
  // peut pas contrer — jamais pendant une décision jouer/garder déjà en
  // cours (il a déjà pioché ce tour-ci).
  const mustDrawPile = isMyTurn && !winner && !myDrawDecision && (myPendingResponse ? !canICounter : !canIPlaySomething);
  // Bot dont c'est le tour MAINTENANT : dérivé, jamais un état à part (tous
  // les clients reçoivent le même seats/turnIdx/winner par broadcast).
  const activeBotSeat = !winner && seats[turnIdx]?.isBot ? seats[turnIdx] : null;
  const showUnoButton = isPlayer && !winner && myHand.length === 1 && !unoCalled[me.id];

  let content;

  if (phase === "playing") {
    const winnerSeat = seats.find(s => s.id === winner);
    const ranking = winner ? [...seats].sort((a, b) => (matchScores[a.id] ?? 0) - (matchScores[b.id] ?? 0)) : [];

    let statusText;
    if (winner) statusText = null;
    else if (isMyTurn) {
      if (myPendingResponse) {
        statusText = canICounter
          ? `${t("chromatikCanCounter")} — ${t("chromatikMustDrawPile")} ${myPendingResponse.count}`
          : `${t("chromatikMustDrawPile")} ${myPendingResponse.count}`;
      } else if (myDrawDecision) {
        statusText = t("chromatikDrawnPlayableHint");
      } else {
        statusText = canIPlaySomething ? t("chromatikYourTurn") : t("chromatikMustDraw");
      }
    } else if (isPlayer) statusText = `${t("chromatikWaitingFor")} ${seats[turnIdx]?.username}…`;
    else statusText = t("chromatikSpectating");

    // Bulle "crie UNO" (fix jouabilité 2026-07) : siège concerné, résolu
    // depuis unoBubble pour afficher avatar + pseudo.
    const unoShoutSeat = unoBubble ? seats.find(s => s.id === unoBubble.seatId) : null;

    // CORRECTIF (zip 83) — chevrons inversés côté INVITÉ : avant, on
    // retirait simplement "moi" de la liste globale des sièges. Pour l'hôte
    // (siège 0), les adversaires restants étaient bien consécutifs dans
    // l'ordre du tour ; mais pour un invité assis AU MILIEU de la liste,
    // deux sièges affichés côte à côte n'étaient PAS consécutifs (le sien
    // manquait entre eux), et les chevrons lumineux semblaient indiquer le
    // sens inverse du tour. On fait donc TOURNER le tour de table pour
    // qu'il commence au siège qui joue juste APRÈS moi : gauche -> droite
    // = ordre de jeu en direction 1, pour tout le monde. Les spectateurs
    // (sans siège, myIdx = -1) gardent la liste brute, déjà correcte.
    const myIdx = seats.findIndex(s => s.id === me.id);
    const displayedOpponents = myIdx < 0
      ? seats
      : Array.from({ length: seats.length - 1 }, (_, k) => seats[(myIdx + 1 + k) % seats.length]);

    // Vignette d'adversaire FACTORISÉE (refonte table 2026-07) : exactement
    // le même rendu partout — rangée du haut (2-3 joueurs, spectateurs) ou
    // positions Nord/Est/Ouest de la table à 4 — pour un design harmonisé.
    const renderOpponent = (s) => {
      if (!s) return null;
      const oppHand = hands[s.id] || [];
      const oppAtRisk = oppHand.length === 1 && !unoCalled[s.id];
      const penalized = penaltyFx && penaltyFx.seatId === s.id;
      return (
        <div key={s.id} className={"chromatik-opponent" + (seats[turnIdx]?.id === s.id ? " active" : "") + (penalized ? " penalized" : "")}>
          <span className="avatar">{s.avatar}</span>
          <span className="name">{s.username}</span>
          {activeBotSeat?.id === s.id && (
            <span className="pres-think" aria-hidden="true"><i>.</i><i className="d2">.</i><i className="d3">.</i></span>
          )}
          {/* Compteur de cartes : pastille contrastée (retouche lisibilité
              2026-07 — l'ancien texte gris se perdait), dorée quand il ne
              reste qu'une carte. */}
          <span className={"count" + (oppHand.length === 1 ? " low" : "")}>
            {oppHand.length} 🂠
            {oppAtRisk && <span className="chromatik-uno-warn" title="UNO">❗</span>}
            {turnDeadlineSeat === s.id && turnRemaining != null && (
              <span className={"turn-timer-chip mini" + (turnRemaining <= 5 ? " hot" : "")}>{turnRemaining}s</span>
            )}
          </span>
          {penalized && (
            <span className="chromatik-penalty-chip" key={penaltyFx.key}>+{penaltyFx.count} 🂠</span>
          )}
        </div>
      );
    };

    // Table à 4 joueurs (demande 2026-07) : disposition Nord/Sud/Est/Ouest,
    // MON point de vue restant au SUD (ma main en bas). displayedOpponents
    // est déjà tourné dans l'ordre du tour après moi : en direction 1 le
    // tour circule moi (Sud) -> Ouest -> Nord -> Est — un cycle horaire à
    // l'écran, et gauche -> droite en haut de table = sens du jeu (les
    // chevrons du centre de table le confirment). Les spectateurs (4
    // vignettes, pas de main au sud) gardent la rangée classique.
    const fourTable = isPlayer && displayedOpponents.length === 3;

    const tableJsx = (
        <div className="chromatik-table">
          <div
            className={"chromatik-pile draw" + (mustDrawPile ? " urge" : "")}
            onClick={attemptDraw}
            title={t("chromatikDrawPile")}
          >
            <CardView faceDown size="md" />
            <span className="pile-count">{deck.length}</span>
          </div>
          {/* Table à 4 (2026-07) : les chevrons de sens reviennent au CENTRE
              de la table (ils n'ont plus de rangée où s'intercaler) — le
              flux gauche->droite en haut de table = direction 1. */}
          {fourTable && (
            <div className="chromatik-flow-table"><FlowArrow direction={direction} /></div>
          )}
          <div className="chromatik-discard">
            {/* Pile réaliste (fix jouabilité 2026-07) : les 3-4 dernières
                cartes défaussées restent visibles, légèrement décalées/
                tournées (offset STABLE par carte, voir discardCardOffset),
                la plus récente bien lisible au-dessus. */}
            {discard.slice(-4).map((c, i, arr) => {
              const isTop = i === arr.length - 1;
              const off = isTop ? { dx: 0, dy: 0, angle: 0 } : discardCardOffset(c.id);
              return (
                <CardView
                  key={c.id}
                  card={c}
                  size="lg"
                  glow={isTop}
                  style={{
                    transform: `translate(${off.dx}px, ${off.dy}px) rotate(${off.angle}deg)`,
                    zIndex: i + 1,
                    opacity: isTop ? 1 : .92,
                  }}
                />
              );
            })}
            {activeColor && <span className="chromatik-active-color" style={{ background: `var(${COLOR_VAR_MAP[activeColor]})` }} />}
          </div>
          {/* Le flux central de la table a été retiré (retouche 2026-07) :
              il doublonnait les chevrons entre les sièges, qui suffisent à
              lire le sens du jeu. */}

          {drawFx && (
            <div className="chromatik-drawfx" aria-hidden="true">
              {Array.from({ length: drawFx.count }, (_, i) => (
                <span
                  key={drawFx.key + "-" + i}
                  className={"chromatik-drawfx-card" + (drawFx.toMe ? " toMe" : " toOpponent") + (drawFx.slow ? " slow" : "")}
                  style={{
                    animationDelay: (i * (drawFx.slow ? 160 : 80)) + "ms",
                    "--dx": (Math.round((Math.random() - 0.5) * 90)) + "px",
                    "--rot": (Math.round((Math.random() - 0.5) * 40)) + "deg",
                  }}
                />
              ))}
            </div>
          )}

          {/* Annonce de pénalité (correctif lisibilité 2026-07) : qui pioche
              combien, en toutes lettres au centre de la table, le temps que
              l'animation (ralentie) se joue. */}
          {penaltyFx && (() => {
            const pSeat = seats.find(s => s.id === penaltyFx.seatId);
            if (!pSeat) return null;
            return (
              <div className="chromatik-penalty-shout" key={penaltyFx.key} aria-live="polite">
                <span className="chromatik-penalty-shout-text">
                  {pSeat.avatar} {pSeat.id === me.id
                    ? `${t("chromatikPenaltyYou")} ${penaltyFx.count} ${t("chromatikPenaltyCards")}`
                    : `${pSeat.username} ${t("chromatikPenaltyOther")} ${penaltyFx.count} ${t("chromatikPenaltyCards")}`}
                </span>
              </div>
            );
          })()}

          {unoShoutSeat && (
            <div className="chromatik-uno-shout" key={unoBubble.key} aria-live="polite">
              <span className="chromatik-uno-shout-text">
                {unoShoutSeat.avatar} {unoShoutSeat.id === me.id ? t("chromatikUnoShoutYou") : `${unoShoutSeat.username} ${t("chromatikUnoShoutOther")}`}
              </span>
            </div>
          )}
        </div>
    );

    content = (
      <div>
        {/* .chromatik-stage : ancre de position POUR l'overlay de fin de
            manche ci-dessous (position:relative) — la table elle-même ne
            change jamais de taille selon qu'une manche vient de se
            terminer ou non (voir chromatik-round-overlay). */}
        <div className="chromatik-stage">
          {fourTable ? (
            /* ----- Table à 4 : Nord en haut, Ouest/Est de part et d'autre de
               la table, moi au Sud (ma main, déjà en bas). Le tour circule
               moi -> Ouest -> Nord -> Est en direction 1. ----- */
            <div className="chromatik-arena-four">
              <div className="chromatik-north">{renderOpponent(displayedOpponents[1])}</div>
              <div className="chromatik-mid">
                <div className="chromatik-side west">{renderOpponent(displayedOpponents[0])}</div>
                {tableJsx}
                <div className="chromatik-side east">{renderOpponent(displayedOpponents[2])}</div>
              </div>
            </div>
          ) : (
            <>
              <div className={"chromatik-opponents opp-" + displayedOpponents.length}>
                {/* Rangée du haut (2-3 joueurs, ou spectateurs) : vignettes
                    bien HORIZONTALES et alignées (les inclinaisons "arc" de
                    l'ancienne version ont été retirées, retouche 2026-07),
                    chevrons de sens intercalés dans l'ordre du tour. À une
                    table de 2, face-à-face Nord/Sud : l'adversaire unique est
                    centré en haut, ma main en bas. */}
                {displayedOpponents.map((s, i) => (
                  <Fragment key={s.id}>
                    {i > 0 && seats.length > 2 && <FlowArrow direction={direction} size="mini" />}
                    {renderOpponent(s)}
                  </Fragment>
                ))}
              </div>
              {tableJsx}
            </>
          )}

          {/* Repère de manche (demande explicite "afficher le numéro de la
              manche pendant la partie") : petit badge en position ABSOLUE
              (comme le récap ci-dessous) pour ne jamais pousser la table ni
              déclencher le zoom automatique. Masqué en partie à une seule
              manche (rien à repérer). */}
          {roundTarget > 1 && (
            <div className="chromatik-round-indicator">{t("chromatikRoundOverTitle")} {roundIndex}/{roundTarget}</div>
          )}

          {/* Récap de fin de manche (2026-07, demande explicite) : OVERLAY
              par-dessus la table plutôt qu'un bloc dans le flux normal — à 4
              joueurs surtout, il poussait la table vers le bas et déclenchait
              le zoom automatique du mode agrandi (toute la scène rétrécissait
              juste pour afficher le récap). Apparition en fondu + léger pop
              (voir chromatikSummaryFade/Pop) ; la disposition de la table ne
              bouge donc plus JAMAIS entre deux manches. */}
          {winner && (
            <div className="chromatik-round-overlay">
              <div className="chromatik-round-card">
                <h3 className="chromatik-round-summary-title">
                  {matchOver ? t("chromatikMatchOverTitle") : `${t("chromatikRoundOverTitle")} ${roundIndex} ${t("chromatikRoundOverOf")} ${roundTarget}`}
                </h3>
                <div className="pres-podium chromatik-podium">
                  {/* Mains finales en miniature (demande 2026-07) : sous chaque
                      ligne du classement, les cartes restées en main à la fin de
                      la manche (triées comme une main), en tout petit mais avec
                      leurs vraies couleurs — on VOIT d'où viennent les points.
                      Le vainqueur n'a rien à montrer (main vide, +0). */}
                  {ranking.map((s, i) => {
                    const finalHand = sortHandForDisplay(hands[s.id] || []);
                    return (
                      <div key={s.id} className={"chromatik-podium-block" + (i === 0 ? " first" : "") + (s.id === me.id ? " me" : "")}>
                        <div className={"pres-podium-row" + (i === 0 ? " first" : "") + (s.id === me.id ? " me" : "")}>
                          <span className="place">{i + 1}</span>
                          <span className="name">{s.avatar} {s.username}</span>
                          <span className="pts">
                            {matchScores[s.id] ?? 0} {t("pts")}
                            <span className="chromatik-round-delta"> (+{roundScores[s.id] ?? 0} {t("chromatikThisRound")})</span>
                          </span>
                        </div>
                        {finalHand.length > 0 && (
                          <div className="chromatik-final-hand">
                            {finalHand.map(c => <CardView key={c.id} card={c} size="xs" />)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
                  {isHost ? (
                    matchOver ? (
                      <>
                        <button className="btn" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={rejouer}>🔁 {t("c4Rejouer")}</button>
                        <button className="btn ghost" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={backToRoom}>🏠 {t("c4BackToRoom")}</button>
                      </>
                    ) : (
                      <button className="btn chromatik-next-round-btn" onClick={nextRound}>{t("chromatikNextRound")}</button>
                    )
                  ) : (
                    <p className="muted">{matchOver ? t("c4RejouerWait") : t("chromatikNextRoundWait")}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {!winner && isMyTurn && (
          <div className="turn-banner">
            <span className="turn-banner-badge">🫵 {t("yourTurnBadge")}</span>
            {turnRemaining != null && (
              <span className={"turn-timer-chip" + (turnRemaining <= 5 ? " hot" : "")}>⏱ {turnRemaining}s</span>
            )}
          </div>
        )}
        <p className="muted" style={{ textAlign: "center", margin: "10px 0", minHeight: 18, fontWeight: winner ? 800 : 400 }}>
          {winner ? (
            matchOver
              ? (winner === me.id ? t("chromatikMatchWinYou") : `${winnerSeat?.username} ${t("chromatikMatchWinOther")}`)
              : (winner === me.id ? "🏆 " + t("chromatikWinYou") : `${winnerSeat?.username} ${t("chromatikWinOther")}`)
          ) : lastAction?.type === "unoPenalty" ? (
            `😅 ${seats.find(s => s.id === lastAction.seatId)?.username || "?"} ${t("chromatikUnoPenalty")}`
          ) : statusText}
        </p>

        {isPlayer && (
          <div className={"chromatik-hand"
            + (myHand.length >= HAND_PACKED_AT ? " packed" : myHand.length >= HAND_CROWDED_AT ? " crowded" : "")}>
            {/* Tri d'affichage (demande explicite) : gauche→droite par
                couleur puis 0-9 puis spéciales ; jokers/+4 tout à droite.
                Purement visuel — voir sortHandForDisplay dans deck.js.
                Grande main (demande 2026-07) : cartes réduites dès
                HAND_CROWDED_AT, puis rangée unique à défilement latéral dès
                HAND_PACKED_AT — une main de 25+ cartes (grosse surenchère)
                reste jouable sans écraser toute la table. */}
            {sortHandForDisplay(myHand).map(card => (
              <CardView
                key={card.id}
                card={card}
                size="sm"
                onClick={() => attemptPlay(card)}
                dim={!isMyTurn || (myPendingResponse
                  ? !canStackOn(card, myPendingResponse.kind)
                  : (myDrawDecision ? card.id !== myDrawDecision.cardId : !canPlay(card, topCard, activeColor)))}
              />
            ))}
          </div>
        )}

        {showUnoButton && (
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <button type="button" className="chromatik-uno-btn" onClick={callUno}>{t("chromatikUnoButton")}</button>
          </div>
        )}
        {isPlayer && myHand.length === 1 && unoCalled[me.id] && !winner && (
          <p className="chromatik-uno-called-badge">{t("chromatikUnoCalledBadge")}</p>
        )}

        {myPendingResponse && !winner && (
          <div style={{ textAlign: "center", marginTop: 4 }}>
            <button type="button" className="btn ghost" style={{ width: "auto", padding: "8px 16px", fontSize: 13 }} onClick={attemptDraw}>
              🂠 {t("chromatikMustDrawPile")} {myPendingResponse.count}
            </button>
          </div>
        )}

        {myDrawDecision && !winner && (
          <div style={{ textAlign: "center", marginTop: 4 }}>
            <button type="button" className="btn ghost" style={{ width: "auto", padding: "8px 16px", fontSize: 13 }} onClick={keepDrawnCard}>
              🤚 {t("chromatikKeepDrawn")}
            </button>
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
      </div>
    );
  } else {
    // phase "intro" : choix de la taille de table, du nombre de manches, puis des joueurs si besoin
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
    } else if (!roundTarget) {
      content = isHost ? (
        <div>
          <p className="hint">{t("chromatikRoundsHint")}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
            {ROUND_OPTIONS.map(n => (
              <button key={n} className="btn" style={{ width: "auto", padding: "14px 22px" }} onClick={() => setRoundTarget(n)}>
                {n} {t("chromatikRoundsUnit")}
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
    // .chromatik-panel : accroche du mode agrandi (voir globals.css) — en
    // stage-focus, la table gagne de la hauteur (espacements élargis) et un
    // peu de largeur pour la disposition Nord/Sud/Est/Ouest à 4 joueurs.
    <div className="panel chromatik-panel" style={{ maxWidth: "min(940px, 94vw)" }}>
      <h1>{t("chromatikTitle")}</h1>
      <Crossfade id={phase}>{content}</Crossfade>
      {/* Décompte 3-2-1 : posé après le choix des sièges par l'hôte (voir
          match_start), couvre la table et bloque les clics le temps que
          chacun soit prêt à jouer sa première carte. */}
      {countingDown && phase === "playing" && (
        <GameCountdown variant="chromatik" onDone={() => setCountingDown(false)} />
      )}
    </div>
  );
}
