"use client";
/* ==========================================================================
   ÉCHECS (jeu n°17) — refonte de l'audit du 2026-09-24 (lots 1 à 3).

   Objectif fixé par Guillaume : « une jouabilité équivalente à lichess, pas de
   bug de sélection au clic, une beauté visuelle et de la précision ». Ce que
   l'audit a trouvé et ce qui y répond (le détail est à côté de chaque ligne) :

   - CLICS PERDUS (13 % des appuis, mesuré) : plateau recréé à chaque seconde.
     -> ChessBoard.js, composant de module ; pendule dans son propre composant.
   - LATENCE : un coup faisait DEUX passages par le serveur (clic -> serveur ->
     hôte -> serveur -> plateau) avant de bouger, même pour l'hôte.
     -> coup OPTIMISTE : la pièce bouge au doigt, l'hôte confirme ou corrige
        (`pending`), et l'hôte arbitre ses propres coups sans passer par le
        réseau.
   - PENDULE AU TOP D'UNE SECONDE, rediffusée toutes les 10 s.
     -> clock.js : pendule horodatée, voyage dans `state`, plus aucun message
        périodique ; incréments ; dixièmes sous 10 s ; latence compensée.
   - ORDINATEUR sur le fil principal (page gelée 0,5 à 1 s), coup parfois
     choisi sur une recherche coupée (2 positions sur 40).
     -> engine.worker.js ; engine.js ne compare plus un score tronqué.
   - BUGS : ordinateur figé après une reprise (reproduit), « Annuler » de
     l'analyse qui désynchronise le plateau (reproduit), revanche toujours en
     10 min, vainqueur sauvegardé vide, cadence perdue au premier coup, drapeau
     contre un roi seul, avantage sans les promotions, triple répétition
     oubliée au rechargement.
   - MANQUES face à lichess : glisser-déposer, pré-coups, animations, nulle
     proposée, partie annulée, navigation dans les coups PENDANT la partie
     (flèches du clavier), promotion en colonne, flèches au clic droit.

   ⚠️⚠️ LE PIÈGE QUI A PRODUIT LA MOITIÉ DES BUGS, ET LA RÈGLE QUI L'ÉVITE ICI.
   L'effet réseau est monté une fois (dépendances [room.id, isHost]) : toute
   fonction qu'il capturait voyait l'état React DU PREMIER RENDU. `persist()`
   y lisait `winner` et `lastMove` — donc toujours null. Désormais l'effet
   n'appelle QUE `H.current.x(...)`, un objet de gestionnaires réassigné à
   chaque rendu : ils voient toujours l'état courant. Et tout ce que l'hôte
   arbitre vit dans des refs `h*`, jamais dans l'état React.
   ========================================================================== */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { supabase } from "@/lib/supabaseClient";
import { noteSend } from "@/lib/realtimeQuota";
import { saveGameState, readGameState, resetRoomToLobby, recordMatchResult } from "@/lib/gameSync";
import { playChessMove, playChessCapture, playGameWin, playGameLose, playConfirmChime } from "@/lib/sfx";
import Crossfade from "../Crossfade";
import GameCountdown, { COUNTDOWN_MS } from "../GameCountdown";
import ChessBoard from "./ChessBoard";
import { sanForLang } from "./notation";
import { pieceBg } from "./pieces";
import {
  START_FEN, isTerminal, otherColor, deriveStatus, timeoutOutcome, materialDiff, legalDests,
  takebackPlies, replayMoves, positionsOf, alignTurn, checkSquare, buildPgn, pgnResult,
} from "./rules";
import { LAG_COMP_MS, clockRemaining, chargeMove, stopClock, snapshotClock, snapRemaining, fmtClock } from "./clock";
import { chooseBotMove } from "./engine";

const GAME_ID = "chess";
const BOT_ID = "__arcardi_bot__"; // siège tenu par l'ordinateur (mode solo)
// Cadences (audit 2026-09-24) : les trois de toujours, avec un INCRÉMENT en
// blitz et en rapide comme sur lichess — sans incrément, une partie de 3 min
// se perd au temps dans une finale gagnée, faute de pouvoir la jouer.
const CADENCES = [
  { base: 180, inc: 2, tagKey: "chessBlitz" },
  { base: 300, inc: 3, tagKey: "chessRapid" },
  { base: 600, inc: 0, tagKey: "chessClassic" },
];
const DEFAULT_CADENCE = { base: 600, inc: 0 };
// Un coup optimiste que l'hôte n'a ni confirmé ni refusé au bout de 5 s est
// abandonné (on revient à la dernière position confirmée et on redemande
// l'état) : un message perdu ne doit jamais laisser un plateau qui ment.
const PENDING_TIMEOUT_MS = 5000;
const EMPTY_GAME = { mid: null, seq: 0, fen: START_FEN, moves: [], status: "playing", winner: null, reason: null, lastMove: null, offers: {} };
const DRAW_KEY = {
  agreement: "chessDrawAgreement", repetition: "chessDrawRepetition", fifty: "chessDrawFifty",
  material: "chessDrawMaterial", timeoutMaterial: "chessDrawTimeout",
};

const cadLabel = (c) => Math.round(c.base / 60) + "+" + c.inc;
const newId = () => Math.random().toString(36).slice(2, 10);
const moveRec = (mv) => ({ san: mv.san, color: mv.color, captured: mv.captured || null, from: mv.from, to: mv.to, promotion: mv.promotion || null });
const turnOf = (fen) => String(fen || START_FEN).split(" ")[1] || "w";
const later = (fn) => (typeof queueMicrotask === "function" ? queueMicrotask(fn) : Promise.resolve().then(fn));

/* ---- Pendule affichée --------------------------------------------------------
   Composant À PART, qui se rafraîchit seul (10 fois par seconde, et ne se
   re-rend que si le texte change) : c'était le rendu du jeu ENTIER à chaque
   seconde qui recréait le plateau sous le doigt du joueur. */
const ClockFace = memo(function ClockFace({ snap, color, running }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!running || !snap) return undefined;
    let last = "";
    const iv = setInterval(() => {
      const txt = fmtClock(snapRemaining(snap, color, performance.now()));
      if (txt !== last) { last = txt; setTick((n) => n + 1); }
    }, 100);
    return () => clearInterval(iv);
  }, [snap, color, running]);
  const ms = snap ? snapRemaining(snap, color, performance.now()) : 0;
  const cls = "chess-clock" + (running ? " on" : "") + (snap && ms < 20000 ? " low" : "") + (snap && ms < 10000 ? " crit" : "");
  return <div className={cls} role="timer">{snap ? fmtClock(ms) : "–:––"}</div>;
});

function PlayerBar({ player, color, snap, running, material, thinking, t }) {
  const opp = otherColor(color);
  return (
    <div className={"chess-pbar" + (running ? " active" : "")}>
      <span className="chess-avatar">{player?.avatar}</span>
      <div className="chess-pbar-main">
        <div className="chess-pname">
          <span className={"chess-swatch " + color} title={color === "w" ? t("chessWhite") : t("chessBlack")} />
          <span className="chess-pname-txt">{player?.username || "?"}</span>
          {thinking && <span className="chess-thinking" aria-label={t("chessBotThinking")}><i /><i /><i /></span>}
        </div>
        <div className="chess-mat">
          {material.pieces.map((p, i) => (
            <i key={i} className={"chess-mat-p" + (i > 0 && material.pieces[i - 1] === p ? " same" : "")} style={{ backgroundImage: pieceBg(opp, p) }} />
          ))}
          {material.score > 0 && <b>+{material.score}</b>}
        </div>
      </div>
      <ClockFace snap={snap} color={color} running={running} />
    </div>
  );
}

/* ---- Liste des coups, cliquable PENDANT la partie comme après ---------------- */
function MoveList({ moves, lang, curPly, onJump, footer, t }) {
  const boxRef = useRef(null);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const cur = box.querySelector(".chess-mv.cur");
    if (!cur) { box.scrollTop = box.scrollHeight; return; }
    // Défilement du SEUL cadre de la liste (scrollIntoView ferait aussi
    // défiler la page, donc sauter le plateau sous le doigt).
    const top = cur.offsetTop, bottom = top + cur.offsetHeight;
    if (top < box.scrollTop + 4 || bottom > box.scrollTop + box.clientHeight - 4) {
      box.scrollTop = Math.max(0, top - box.clientHeight / 2);
    }
  }, [curPly, moves.length, !!footer]);
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) rows.push(i);
  const cell = (ply) => {
    const m = moves[ply - 1];
    if (!m) return <span className="chess-mv empty" />;
    return (
      <span
        className={"chess-mv" + (curPly === ply ? " cur" : "") + (onJump ? " clk" : "")}
        onClick={onJump ? () => onJump(ply) : undefined}
      >{sanForLang(m.san, lang)}</span>
    );
  };
  return (
    <div className="chess-moves" ref={boxRef}>
      {rows.length === 0 && <div className="chess-moves-empty">{t("chessNoMoves")}</div>}
      {rows.map((i) => (
        <div key={i} className="chess-mrow">
          <span className="chess-mnum">{i / 2 + 1}</span>
          {cell(i + 1)}
          {cell(i + 2)}
        </div>
      ))}
      {footer}
    </div>
  );
}

export default function ChessGame({ room, me, isHost, players, t, lang, onFinish, solo = false }) {
  const [phase, setPhase] = useState("intro"); // intro -> playing | analysis
  const [white, setWhite] = useState(null);    // { id, username, avatar }
  const [black, setBlack] = useState(null);
  const [cadence, setCadence] = useState(DEFAULT_CADENCE);
  const [game, setGame] = useState(EMPTY_GAME); // état CONFIRMÉ par l'hôte
  const [snap, setSnap] = useState(null);       // pendule affichée { w, b, side, at }
  const [pending, setPending] = useState(null); // coup optimiste en attente de l'hôte
  const [premove, setPremove] = useState(null); // { from, to }
  const [viewPly, setViewPly] = useState(null); // null = position actuelle
  const [flipped, setFlipped] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [countingDown, setCountingDown] = useState(false);
  const [channelReady, setChannelReady] = useState(false);
  const [myWin, setMyWin] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const [botThinking, setBotThinking] = useState(false);
  const [perms, setPerms] = useState({}); // analyse : { profileId: true } autorisés à bouger
  const [banner, setBanner] = useState(false); // bandeau de victoire, 3 s puis le plateau final redevient visible

  const channelRef = useRef(null);
  const H = useRef({}); // gestionnaires À JOUR, seuls appelés par l'effet réseau (voir l'en-tête)
  // Audit août 2026 : nombre RÉEL d'abonnés au moment d'un envoi (quota).
  const playersRef = useRef(players);
  useEffect(() => { playersRef.current = players; }, [players]);

  // Miroirs de l'état, lus par les gestionnaires réseau et les minuteurs.
  const confirmedRef = useRef(EMPTY_GAME);
  const snapRef = useRef(null);
  const pendingRef = useRef(null);
  const premoveRef = useRef(null);
  const turnStartRef = useRef(0);  // performance.now() du début de MON tour, chez moi
  const whiteRef = useRef(null);
  const blackRef = useRef(null);
  const cadenceRef = useRef(DEFAULT_CADENCE);
  const soloRef = useRef(false);
  const modeRef = useRef("game");  // "game" | "analysis"
  const phaseRef = useRef("intro");
  const permsRef = useRef({});
  const endedLiveRef = useRef(false); // la partie s'est terminée SOUS NOS YEUX (pas restaurée finie)
  // Arbitre (hôte seulement). Rien ici ne passe par l'état React.
  const hGame = useRef(null);    // chess.js AVEC historique (triple répétition)
  const hMoves = useRef([]);
  const hMeta = useRef({ status: "playing", winner: null, reason: null, lastMove: null, offers: {} });
  const hClock = useRef(null);   // pendule horodatée (clock.js), dates de l'HÔTE
  const hMid = useRef(null);     // identifiant de manche
  const hSeq = useRef(0);        // numéro d'état dans la manche
  const hStack = useRef([START_FEN]); // analyse : positions successives, pour « Annuler »
  const flagTimer = useRef(null);
  const botTimer = useRef(null);
  const botReq = useRef(0);
  const workerRef = useRef(undefined); // undefined = pas encore essayé ; null = indisponible
  const workerSeq = useRef(0);
  const restoredRef = useRef(false);
  const savedResultRef = useRef(false);
  const confettiRef = useRef(false);
  const timeouts = useRef([]);

  const myColor = useMemo(() => {
    if (white && me.id === white.id) return "w";
    if (black && me.id === black.id) return "b";
    return null;
  }, [white, black, me.id]);
  const colorNow = () => (whiteRef.current?.id === me.id ? "w" : blackRef.current?.id === me.id ? "b" : null);
  const seatColor = (by) => (whiteRef.current?.id === by ? "w" : blackRef.current?.id === by ? "b" : null);

  // ---- Envoi -----------------------------------------------------------------
  function send(event, payload) {
    const ch = channelRef.current;
    if (ch) ch.send({ type: "broadcast", event, payload });
  }
  // Une action de l'hôte s'arbitre sur place : pas d'aller-retour réseau pour
  // savoir ce qu'il a lui-même décidé.
  function toHost(event, payload, fn) {
    if (isHost) fn(payload); else send(event, payload);
  }
  function setPremoveBoth(pm) { premoveRef.current = pm; setPremove(pm); }

  // =========================================================================
  //  RÉCEPTION (tous les clients, hôte compris pour son propre état)
  // =========================================================================
  function applySeats(p) {
    if (p.white !== undefined) { whiteRef.current = p.white; setWhite(p.white); }
    if (p.black !== undefined) { blackRef.current = p.black; setBlack(p.black); }
    if (p.cadence) { cadenceRef.current = p.cadence; setCadence(p.cadence); }
    if (p.solo !== undefined) soloRef.current = !!p.solo;
  }

  function onState(p) {
    if (!p || !p.fen) return;
    const c = confirmedRef.current;
    // Un état plus ancien que celui qu'on a (écho de l'hôte, réordonnancement)
    // ne recule jamais le plateau.
    if (p.mid && p.mid === c.mid && (p.seq || 0) <= (c.seq || 0)) return;
    const nowL = performance.now();
    if (p.white !== undefined) {
      applySeats(p);
      modeRef.current = "game"; // un état de PARTIE (il porte les sièges), même si on était en analyse
    }
    if (phaseRef.current !== "playing" && modeRef.current === "game") {
      // Arrivé en cours de partie (resynchronisation) : on entre sans décompte.
      phaseRef.current = "playing"; setPhase("playing");
    }
    const next = {
      mid: p.mid || c.mid, seq: p.seq || 0, fen: p.fen, moves: p.moves || [],
      status: p.status || "playing", winner: p.winner ?? null, reason: p.reason || null,
      lastMove: p.lastMove || null, offers: p.offers || {},
    };
    const moved = next.moves.length !== c.moves.length || next.mid !== c.mid;
    if (!isTerminal(c.status) && isTerminal(next.status) && next.mid === c.mid) endedLiveRef.current = true;
    confirmedRef.current = next;
    setGame(next);
    if (p.clock) {
      const s = { w: p.clock.w, b: p.clock.b, side: p.clock.side || null, at: nowL + (p.clock.startIn || 0) };
      snapRef.current = s; setSnap(s);
    }
    if (moved) turnStartRef.current = Math.max(nowL, snapRef.current ? snapRef.current.at : nowL);

    const pd = pendingRef.current;
    if (pd && (p.ack === pd.id || next.mid !== pd.mid || next.moves.length !== pd.baseLen || isTerminal(next.status))) {
      pendingRef.current = null; setPending(null);
    }
    // Pré-coup : il part DÈS que la main revient, s'il est encore légal.
    const pm = premoveRef.current;
    if (pm) {
      if (isTerminal(next.status) || modeRef.current !== "game") setPremoveBoth(null);
      else if (colorNow() && turnOf(next.fen) === colorNow() && !pendingRef.current) {
        setPremoveBoth(null);
        // Hors de la pile en cours : chez l'hôte, on est peut-être au milieu
        // de l'arbitrage du coup adverse (celui de l'ordinateur).
        later(() => H.current.tryPremove(pm));
      }
    }
  }

  function tryPremove(pm) {
    const c = confirmedRef.current;
    const g = new Chess();
    try { g.load(c.fen); } catch (e) { return; }
    const piece = g.get(pm.from);
    if (!piece || piece.color !== colorNow() || !legalDests(g, pm.from).includes(pm.to)) return;
    const promo = piece.type === "p" && (pm.to[1] === "8" || pm.to[1] === "1") ? "q" : undefined; // pré-promotion = dame, comme lichess
    playMove(pm.from, pm.to, promo);
  }

  function resetMatchUi() {
    pendingRef.current = null; setPending(null);
    setPremoveBoth(null); setViewPly(null);
    setConfirmResign(false); setMyWin(false);
    savedResultRef.current = false; confettiRef.current = false; endedLiveRef.current = false;
    setConfetti([]); setBanner(false);
  }

  function onMatchStart(p) {
    if (!p || !p.mid) return;
    if (p.mid === confirmedRef.current.mid && phaseRef.current === "playing") return; // écho de l'hôte
    modeRef.current = "game";
    applySeats({ white: p.white, black: p.black, cadence: p.cadence || DEFAULT_CADENCE, solo: !!p.solo });
    permsRef.current = {}; setPerms({});
    setFlipped(false);
    clearBot();
    const g0 = { ...EMPTY_GAME, mid: p.mid };
    confirmedRef.current = g0; setGame(g0);
    const base = (p.cadence || DEFAULT_CADENCE).base * 1000;
    const s = { w: base, b: base, side: "w", at: performance.now() + COUNTDOWN_MS };
    snapRef.current = s; setSnap(s);
    turnStartRef.current = s.at;
    resetMatchUi();
    phaseRef.current = "playing"; setPhase("playing");
    setCountingDown(true);
    if (isHost) hostInitMatch(p);
  }

  function onAnalysisStart(p) {
    if (!p || !p.mid) return;
    if (p.mid === confirmedRef.current.mid && phaseRef.current === "analysis") return;
    enterAnalysis(p, { ...EMPTY_GAME, mid: p.mid });
    if (isHost) {
      hGame.current = new Chess();
      hMoves.current = [];
      hStack.current = [START_FEN];
      hMeta.current = { status: "playing", winner: null, reason: null, lastMove: null, offers: {} };
      hMid.current = p.mid; hSeq.current = 0; hClock.current = null;
      hostPersistAnalysis(hostAnalysisPayload(null, false));
    }
  }
  function enterAnalysis(p, g0) {
    modeRef.current = "analysis";
    soloRef.current = false;
    clearBot();
    const pm = p.perms || {};
    permsRef.current = pm; setPerms(pm);
    whiteRef.current = null; blackRef.current = null; setWhite(null); setBlack(null);
    confirmedRef.current = g0; setGame(g0);
    snapRef.current = null; setSnap(null);
    resetMatchUi();
    setFlipped(false);
    phaseRef.current = "analysis"; setPhase("analysis");
  }
  function onAnalysisState(p) {
    if (!p) return;
    if (phaseRef.current !== "analysis") enterAnalysis(p, { ...EMPTY_GAME, mid: p.mid });
    if (p.perms) { permsRef.current = p.perms; setPerms(p.perms); }
    onState(p);
  }

  // =========================================================================
  //  COUPS DU JOUEUR LOCAL (optimistes)
  // =========================================================================
  function playMove(from, to, promotion) {
    const color = colorNow();
    const c = confirmedRef.current;
    if (!color || modeRef.current !== "game" || isTerminal(c.status)) return false;
    const pd = pendingRef.current;
    const base = pd || c;
    const g = new Chess();
    try { g.load(base.fen); } catch (e) { return false; }
    if (g.turn() !== color) return false;
    let mv = null;
    try { mv = g.move({ from, to, promotion: promotion || undefined }); } catch (e) { mv = null; }
    if (!mv) return false;
    const id = newId();
    const nowL = performance.now();
    // Réflexion mesurée CHEZ MOI (une durée, jamais une date : §3) ; l'hôte
    // s'en sert pour ne pas me faire payer la latence de ma liaison.
    const think = Math.max(0, Math.round(nowL - (turnStartRef.current || nowL)));
    const payload = { by: me.id, from, to, promotion: promotion || undefined, think, mv: id };
    if (isHost) { hostHandleMove(payload); return true; }
    const baseSnap = pd ? pd.snap : snapRef.current;
    const s2 = baseSnap
      ? { ...baseSnap, [color]: snapRemaining(baseSnap, color, nowL) + cadenceRef.current.inc * 1000, side: otherColor(color), at: nowL }
      : null;
    const st = deriveStatus(g, color);
    const p = {
      ...c, id, baseLen: base.moves.length, fen: g.fen(), moves: [...base.moves, moveRec(mv)],
      lastMove: { from: mv.from, to: mv.to },
      // Jamais de fin de partie optimiste : le mat s'annonce quand l'hôte le confirme.
      status: st.status === "check" || st.status === "checkmate" ? "check" : "playing",
      snap: s2,
    };
    pendingRef.current = p; setPending(p);
    send("move_attempt", payload);
    return true;
  }

  function analysisMove(from, to, promotion) {
    const c = confirmedRef.current;
    const pd = pendingRef.current;
    const base = pd || c;
    const g = new Chess();
    try { g.load(base.fen); } catch (e) { return; }
    const piece = g.get(from);
    if (!piece) return;
    if (g.turn() !== piece.color) { try { g.load(alignTurn(base.fen, piece.color)); } catch (e) { return; } }
    let mv = null;
    try { mv = g.move({ from, to, promotion: promotion || undefined }); } catch (e) { mv = null; }
    if (!mv) return;
    const id = newId();
    const payload = { by: me.id, from, to, promotion: promotion || undefined, mv: id };
    if (isHost) { hostAnalysisMove(payload); return; }
    const p = { ...c, id, baseLen: base.moves.length, fen: g.fen(), moves: [...base.moves, moveRec(mv)], lastMove: { from: mv.from, to: mv.to }, snap: null };
    pendingRef.current = p; setPending(p);
    send("analysis_move", payload);
  }

  function userMove(from, to, promotion) {
    setViewPly(null);
    if (modeRef.current === "analysis") analysisMove(from, to, promotion);
    else playMove(from, to, promotion);
  }

  // =========================================================================
  //  ARBITRE (hôte)
  // =========================================================================
  function hostPayload(ack) {
    const g = hGame.current, m = hMeta.current;
    hSeq.current += 1;
    return {
      mid: hMid.current, seq: hSeq.current,
      white: whiteRef.current, black: blackRef.current, cadence: cadenceRef.current, solo: soloRef.current,
      fen: g.fen(), moves: hMoves.current.slice(),
      status: m.status, winner: m.winner, reason: m.reason, lastMove: m.lastMove, offers: { ...m.offers },
      clock: snapshotClock(hClock.current, Date.now()),
      ack: ack || null,
    };
  }
  // Une seule fonction diffuse, s'applique à l'hôte et SAUVEGARDE le même
  // objet : ce qui est persisté ne peut plus diverger de ce qui est diffusé
  // (c'était le défaut du vainqueur sauvegardé vide).
  function hostBroadcast(ack) {
    if (!hGame.current) return;
    const payload = hostPayload(ack);
    send("state", payload);
    onState(payload);
    saveGameState(room.id, GAME_ID, { v: 2, mode: "game", ...payload, ack: null });
    hostScheduleFlag();
  }

  function hostInitMatch(p) {
    const cad = p.cadence || DEFAULT_CADENCE;
    hGame.current = new Chess();
    hMoves.current = [];
    hMeta.current = { status: "playing", winner: null, reason: null, lastMove: null, offers: {} };
    hMid.current = p.mid; hSeq.current = 0;
    hClock.current = { w: cad.base * 1000, b: cad.base * 1000, side: "w", since: Date.now() + COUNTDOWN_MS };
    const payload = hostPayload(null);
    saveGameState(room.id, GAME_ID, { v: 2, mode: "game", ...payload });
    confirmedRef.current = { ...confirmedRef.current, seq: payload.seq };
    hostScheduleFlag();
    scheduleBotIfNeeded();
  }

  function hostHandleMove({ by, from, to, promotion, think, mv }) {
    const g = hGame.current, m = hMeta.current;
    if (!g || modeRef.current !== "game" || isTerminal(m.status)) return;
    const color = seatColor(by);
    const now = Date.now();
    const clock = hClock.current;
    // Refus (pas son tour, décompte pas fini, coup illégal) : on rediffuse
    // l'état, qui efface le coup optimiste de l'expéditeur.
    if (!color || g.turn() !== color || !clock || now < clock.since) { hostBroadcast(mv); return; }
    const remote = by !== me.id && by !== BOT_ID;
    const res = chargeMove(clock, color, now, {
      incMs: cadenceRef.current.inc * 1000,
      thinkMs: remote ? think : null,
      lagCompMs: remote ? LAG_COMP_MS : 0,
    });
    if (res.flagged) { hostTimeout(color); return; }
    let done = null;
    try { done = g.move({ from, to, promotion: promotion || undefined }); } catch (e) { done = null; }
    if (!done) { hostBroadcast(mv); return; }
    hClock.current = res.clock;
    hMoves.current = [...hMoves.current, moveRec(done)];
    const st = deriveStatus(g, done.color);
    m.status = st.status; m.winner = st.winner; m.reason = st.reason;
    m.lastMove = { from: done.from, to: done.to };
    // Jouer, c'est refuser la nulle que l'autre proposait ; une demande de
    // reprise ne survit à aucun coup (la position n'est plus la même).
    const offers = { ...m.offers };
    delete offers.takeback;
    if (offers.draw && offers.draw !== color) delete offers.draw;
    m.offers = offers;
    if (isTerminal(m.status)) { hClock.current = stopClock(hClock.current, now); clearBot(); }
    hostBroadcast(mv);
    scheduleBotIfNeeded();
  }

  function hostEnd(status, winner, reason) {
    const m = hMeta.current;
    m.status = status; m.winner = winner; m.reason = reason; m.offers = {};
    hClock.current = stopClock(hClock.current, Date.now());
    clearBot();
    hostBroadcast();
  }
  function hostTimeout(color) {
    const g = hGame.current;
    if (!g || isTerminal(hMeta.current.status)) return;
    const out = timeoutOutcome(g, color);
    hClock.current = { ...stopClock(hClock.current, Date.now()), [color]: 0 };
    const m = hMeta.current;
    m.status = out.status; m.winner = out.winner; m.reason = out.reason; m.offers = {};
    clearBot();
    hostBroadcast();
  }
  function hostResign(by) {
    const color = seatColor(by);
    if (!color || !hGame.current || isTerminal(hMeta.current.status)) return;
    hostEnd("resign", otherColor(color), "resign");
  }
  function hostAbort(by) {
    const color = seatColor(by);
    if (!color || !hGame.current || isTerminal(hMeta.current.status)) return;
    if (hMoves.current.length >= 2) return; // comme lichess : seulement avant que chacun ait joué
    hostEnd("aborted", null, "aborted");
  }
  function hostOffer({ by, kind }) {
    const color = seatColor(by);
    const g = hGame.current, m = hMeta.current;
    if (!color || !g || isTerminal(m.status)) return;
    if (kind === "draw") {
      if (soloRef.current) return;
      if (m.offers.draw && m.offers.draw !== color) { hostEnd("draw", null, "agreement"); return; } // deux offres croisées = accord
      m.offers = { ...m.offers, draw: color };
      hostBroadcast();
      return;
    }
    if (kind === "takeback") {
      if (!takebackPlies(hMoves.current.map((x) => x.color), g.turn(), color)) return;
      if (soloRef.current) { hostDoTakeback(color); return; } // l'ordinateur accepte toujours
      m.offers = { ...m.offers, takeback: color };
      hostBroadcast();
    }
  }
  function hostReply({ by, kind, accept }) {
    const color = seatColor(by);
    const m = hMeta.current;
    if (!color || !hGame.current || isTerminal(m.status)) return;
    const off = m.offers[kind];
    if (!off) return;
    if (off === color || !accept) { // retrait de sa propre offre, ou refus
      const o = { ...m.offers }; delete o[kind]; m.offers = o;
      hostBroadcast();
      return;
    }
    if (kind === "draw") { hostEnd("draw", null, "agreement"); return; }
    if (kind === "takeback") hostDoTakeback(off);
  }
  function hostDoTakeback(requester) {
    const g = hGame.current, m = hMeta.current;
    if (!g) return;
    const plies = takebackPlies(hMoves.current.map((x) => x.color), g.turn(), requester);
    if (!plies) { const o = { ...m.offers }; delete o.takeback; m.offers = o; hostBroadcast(); return; }
    clearBot();
    const now = Date.now();
    const stopped = stopClock(hClock.current, now);
    hMoves.current = hMoves.current.slice(0, -plies);
    // On REJOUE depuis le départ plutôt que d'appeler undo() : après un
    // rechargement de l'hôte, l'historique de chess.js pouvait manquer.
    const rebuilt = replayMoves(hMoves.current);
    if (rebuilt) hGame.current = rebuilt; else for (let i = 0; i < plies; i++) g.undo();
    const g2 = hGame.current;
    const last = hMoves.current[hMoves.current.length - 1];
    m.lastMove = last ? { from: last.from, to: last.to } : null;
    m.status = g2.isCheck() ? "check" : "playing"; m.winner = null; m.reason = null; m.offers = {};
    hClock.current = { ...stopped, side: g2.turn(), since: now };
    hostBroadcast();
    // ⚠️ Le bug reproduit par l'audit : sans cette ligne, une reprise qui
    // rendait la main à l'ordinateur le laissait figé pour toujours.
    scheduleBotIfNeeded();
  }

  // ---- Chute du drapeau : un minuteur réglé sur l'échéance exacte -------------
  function hostScheduleFlag() {
    clearTimeout(flagTimer.current);
    const c = hClock.current;
    if (modeRef.current !== "game" || !hGame.current || isTerminal(hMeta.current.status) || !c || !c.side) return;
    const due = c.since + c[c.side] + graceOf(c.side) - Date.now();
    flagTimer.current = setTimeout(() => H.current.hostCheckFlag(), Math.max(0, due) + 15);
  }
  // Un invité a droit au même rabais de latence que sur ses coups : sinon son
  // coup parti à 0,2 s pouvait arriver après un drapeau déjà tombé.
  function graceOf(color) {
    const seat = color === "w" ? whiteRef.current : blackRef.current;
    return seat && seat.id !== me.id && seat.id !== BOT_ID ? LAG_COMP_MS : 0;
  }
  function hostCheckFlag() {
    const c = hClock.current;
    if (!c || !c.side || !hGame.current || isTerminal(hMeta.current.status)) return;
    if (clockRemaining(c, c.side, Date.now()) + graceOf(c.side) <= 0) hostTimeout(c.side);
    else hostScheduleFlag();
  }

  // ---- Ordinateur (mode solo) -------------------------------------------------
  function clearBot() {
    if (botTimer.current) { clearTimeout(botTimer.current); botTimer.current = null; }
    botReq.current += 1; // toute réponse encore en vol sera jetée
    setBotThinking(false);
  }
  function computeBotMove(fen, timeMs, maxDepth) {
    return new Promise((resolve) => {
      const direct = () => { let mv = null; try { mv = chooseBotMove(fen, { timeMs, maxDepth }); } catch (e) { mv = null; } resolve(mv); };
      if (workerRef.current === undefined) {
        try {
          const w = new Worker(new URL("./engine.worker.js", import.meta.url));
          w.addEventListener("error", () => { workerRef.current = null; });
          workerRef.current = w;
        } catch (e) { workerRef.current = null; }
      }
      const w = workerRef.current;
      if (!w) { direct(); return; }
      const id = ++workerSeq.current;
      let settled = false;
      const onMsg = (e) => {
        if (!e.data || e.data.id !== id || settled) return;
        settled = true; clearTimeout(guard); w.removeEventListener("message", onMsg);
        resolve(e.data.move || null);
      };
      // Worker muet (chargement raté) : on calcule ici plutôt que de figer l'ordinateur.
      const guard = setTimeout(() => {
        if (settled) return;
        settled = true; w.removeEventListener("message", onMsg);
        workerRef.current = null;
        direct();
      }, timeMs + 2500);
      w.addEventListener("message", onMsg);
      w.postMessage({ id, fen, timeMs, maxDepth });
    });
  }
  function scheduleBotIfNeeded() {
    if (!isHost || !soloRef.current || modeRef.current !== "game") return;
    const g = hGame.current;
    if (!g || isTerminal(hMeta.current.status)) return;
    const color = g.turn();
    const seat = color === "w" ? whiteRef.current : blackRef.current;
    if (!seat || seat.id !== BOT_ID) return;
    clearBot();
    const req = botReq.current;
    const base = cadenceRef.current.base;
    const now = Date.now();
    const wait = Math.max(0, hClock.current.since - now); // décompte 3-2-1
    // Temps de « réflexion » visible + temps de calcul, bornés par ce qui lui
    // reste à la pendule : l'ordinateur ne perd jamais au temps bêtement.
    const left = Math.max(0, clockRemaining(hClock.current, color, now + wait));
    let think = (base <= 180 ? 240 : base <= 300 ? 360 : 500) + Math.floor(Math.random() * (base <= 180 ? 240 : 420));
    think = Math.min(think, left / 40);
    const timeMs = Math.max(60, Math.min(base <= 180 ? 550 : base <= 300 ? 800 : 1000, left / 25));
    const maxDepth = base <= 180 ? 3 : 4;
    const fen = g.fen();
    setBotThinking(true);
    botTimer.current = setTimeout(async () => {
      botTimer.current = null;
      const choice = await computeBotMove(fen, timeMs, maxDepth);
      if (req !== botReq.current) return; // reprise, abandon ou revanche entre-temps
      setBotThinking(false);
      const g2 = hGame.current;
      if (!g2 || g2.fen() !== fen || !choice) return;
      H.current.hostHandleMove({ by: BOT_ID, from: choice.from, to: choice.to, promotion: choice.promotion });
    }, wait + think);
  }

  // ---- Échiquier d'analyse (hôte) ---------------------------------------------
  function hostAnalysisPayload(ack, bump = true) {
    const g = hGame.current;
    if (bump) hSeq.current += 1;
    const last = hMoves.current[hMoves.current.length - 1];
    return {
      mid: hMid.current, seq: hSeq.current, fen: g.fen(), moves: hMoves.current.slice(),
      lastMove: last ? { from: last.from, to: last.to } : null,
      status: "playing", winner: null, reason: null, offers: {},
      perms: permsRef.current, ack: ack || null,
    };
  }
  function hostPersistAnalysis(payload) {
    saveGameState(room.id, GAME_ID, { v: 2, mode: "analysis", ...payload, ack: null, stack: hStack.current.slice() });
  }
  function hostAnalysisBroadcast(ack) {
    if (!hGame.current) return;
    const payload = hostAnalysisPayload(ack);
    send("analysis_state", payload);
    onAnalysisState(payload);
    hostPersistAnalysis(payload);
  }
  const analysisAllowed = (by) => by === room.host_id || by === me.id && isHost || !!permsRef.current[by];
  function hostAnalysisMove({ by, from, to, promotion, mv }) {
    const g = hGame.current;
    if (!g || modeRef.current !== "analysis") return;
    const piece = g.get(from);
    if (!analysisAllowed(by) || !piece) { hostAnalysisBroadcast(mv); return; }
    // Échiquier libre : on joue les DEUX camps ; si ce n'est pas le trait de
    // la pièce, on le lui donne (comme lichess) et chess.js juge la légalité.
    if (g.turn() !== piece.color) { try { g.load(alignTurn(g.fen(), piece.color)); } catch (e) { hostAnalysisBroadcast(mv); return; } }
    let done = null;
    try { done = g.move({ from, to, promotion: promotion || undefined }); } catch (e) { done = null; }
    if (!done) { hostAnalysisBroadcast(mv); return; }
    hMoves.current = [...hMoves.current, moveRec(done)];
    hStack.current = [...hStack.current, g.fen()];
    hostAnalysisBroadcast(mv);
  }
  // ⚠️ Audit 2026-09-24, BUG REPRODUIT : « Annuler » appelait g.undo(), mais
  // donner le trait à l'autre camp RECHARGE la position (load), ce qui efface
  // l'historique de chess.js — après deux coups de la même couleur, la liste
  // se vidait et le pion restait sur le plateau. On garde désormais la PILE
  // des positions, et annuler, c'est recharger la précédente.
  function hostAnalysisCmd({ by, cmd }) {
    const g = hGame.current;
    if (!g || !analysisAllowed(by)) return;
    if (cmd === "undo" && hStack.current.length > 1) {
      hStack.current = hStack.current.slice(0, -1);
      hMoves.current = hMoves.current.slice(0, -1);
      try { g.load(hStack.current[hStack.current.length - 1]); } catch (e) { /* position sûre */ }
    } else if (cmd === "reset") {
      hStack.current = [START_FEN]; hMoves.current = []; g.reset();
    }
    hostAnalysisBroadcast();
  }

  // ---- Resynchronisation, reprise après rechargement ou changement d'hôte ----
  function hostResync() {
    if (!hGame.current) return;
    if (modeRef.current === "analysis") hostAnalysisBroadcast(); else hostBroadcast();
  }
  function hostAdoptGame(g0, clk) {
    const g = replayMoves(g0.moves) || (() => { const x = new Chess(); try { x.load(g0.fen); } catch (e) { /* départ */ } return x; })();
    hGame.current = g;
    hMoves.current = (g0.moves || []).slice();
    hMeta.current = { status: g0.status, winner: g0.winner, reason: g0.reason, lastMove: g0.lastMove, offers: { ...(g0.offers || {}) } };
    hMid.current = g0.mid; hSeq.current = g0.seq || 0;
    hClock.current = { w: clk.w, b: clk.b, side: isTerminal(g0.status) ? null : (clk.side || g.turn()), since: Date.now() };
    hostScheduleFlag();
    scheduleBotIfNeeded();
  }
  function hostAdoptAnalysis(g0, stack) {
    const g = new Chess();
    try { g.load(g0.fen); } catch (e) { /* départ */ }
    hGame.current = g;
    hMoves.current = (g0.moves || []).slice();
    hStack.current = Array.isArray(stack) && stack.length ? stack.slice() : [g0.fen];
    hMeta.current = { status: "playing", winner: null, reason: null, lastMove: g0.lastMove, offers: {} };
    hMid.current = g0.mid; hSeq.current = g0.seq || 0; hClock.current = null;
  }
  function restoreFromSave(saved) {
    if (saved.mode === "analysis") {
      const g0 = { ...EMPTY_GAME, mid: saved.mid || "restored", seq: saved.seq || 0, fen: saved.fen || START_FEN, moves: saved.moves || [], lastMove: saved.lastMove || null };
      enterAnalysis({ perms: saved.perms || {} }, g0);
      if (isHost) hostAdoptAnalysis(g0, saved.stack);
      return;
    }
    modeRef.current = "game";
    // Compatibilité des sauvegardes d'avant 2026-09-24 : cadence en secondes
    // seules, pendules `clockW`/`clockB` en secondes, vainqueur parfois vide.
    const cad = saved.cadence && typeof saved.cadence === "object" ? saved.cadence : { base: Number(saved.cadence) || DEFAULT_CADENCE.base, inc: 0 };
    applySeats({ white: saved.white || null, black: saved.black || null, cadence: cad, solo: !!saved.solo });
    const fen = saved.fen || START_FEN;
    const status = saved.status || "playing";
    let winner = saved.winner ?? null;
    if (status === "checkmate" && !winner) winner = otherColor(turnOf(fen));
    const clk = saved.clock || {
      w: (saved.clockW ?? cad.base) * 1000, b: (saved.clockB ?? cad.base) * 1000,
      side: isTerminal(status) ? null : turnOf(fen),
    };
    const g0 = { mid: saved.mid || "restored", seq: saved.seq || 0, fen, moves: saved.moves || [], status, winner, reason: saved.reason || null, lastMove: saved.lastMove || null, offers: saved.offers || {} };
    confirmedRef.current = g0; setGame(g0);
    const nowL = performance.now();
    const s = { w: clk.w, b: clk.b, side: clk.side || null, at: nowL };
    snapRef.current = s; setSnap(s);
    turnStartRef.current = nowL;
    resetMatchUi();
    phaseRef.current = "playing"; setPhase("playing");
    if (isHost) hostAdoptGame(g0, clk);
  }
  function onSubscribed() {
    if (!restoredRef.current) {
      restoredRef.current = true;
      const saved = readGameState(room, GAME_ID);
      if (saved && (saved.mode === "analysis" || saved.fen)) restoreFromSave(saved);
      // L'état sauvegardé date du dernier coup : sa pendule a vieilli. On
      // demande l'état VIVANT à l'hôte (deux messages par arrivée, rien de plus).
      if (!isHost) send("sync_req", {});
      return;
    }
    // L'hôte a changé en cours de partie : le nouveau reprend l'arbitrage à
    // partir de ce qu'il affiche, et le rediffuse.
    if (isHost && !hGame.current) {
      const c = confirmedRef.current;
      if (phaseRef.current === "playing" && c.mid) {
        const s = snapRef.current, n = performance.now();
        const clk = s ? { w: snapRemaining(s, "w", n), b: snapRemaining(s, "b", n), side: s.side } : { w: cadenceRef.current.base * 1000, b: cadenceRef.current.base * 1000, side: null };
        hostAdoptGame(c, clk);
        hostBroadcast();
      } else if (phaseRef.current === "analysis" && c.mid) {
        hostAdoptAnalysis(c, null);
        hostAnalysisBroadcast();
      }
    }
  }

  // Gestionnaires à jour, réassignés à CHAQUE rendu (voir l'en-tête).
  H.current = {
    onState, onMatchStart, onAnalysisStart, onAnalysisState, onSubscribed, tryPremove, userMove, setPremoveBoth,
    hostHandleMove, hostResign, hostAbort, hostOffer, hostReply, hostResync, hostCheckFlag,
    hostAnalysisMove, hostAnalysisCmd,
  };

  // ---- Canal Realtime propre au jeu (hôte qui fait autorité, self:true) -------
  useEffect(() => {
    const ch = supabase.channel("chess_" + room.id, { config: { broadcast: { self: true } } });
    // Audit août 2026 — quota Realtime (lib/realtimeQuota.js) : coût d'un send
    // = 1 envoi + une réception par joueur abonné (canal en self:true).
    {
      const rawSend = ch.send.bind(ch);
      ch.send = (msg, opts) => {
        noteSend(playersRef.current.length, "chess:" + ((msg && msg.event) || "?"));
        return rawSend(msg, opts);
      };
    }
    channelRef.current = ch;
    const on = (event, fn) => ch.on("broadcast", { event }, ({ payload }) => fn(payload || {}));
    on("match_start", (p) => H.current.onMatchStart(p));
    on("state", (p) => H.current.onState(p));
    on("analysis_start", (p) => H.current.onAnalysisStart(p));
    on("analysis_state", (p) => H.current.onAnalysisState(p));
    // Demandes adressées à l'hôte : les autres les ignorent.
    on("move_attempt", (p) => { if (isHost) H.current.hostHandleMove(p); });
    on("resign", (p) => { if (isHost) H.current.hostResign(p.by); });
    on("abort", (p) => { if (isHost) H.current.hostAbort(p.by); });
    on("offer", (p) => { if (isHost) H.current.hostOffer(p); });
    on("offer_reply", (p) => { if (isHost) H.current.hostReply(p); });
    on("sync_req", () => { if (isHost) H.current.hostResync(); });
    on("analysis_move", (p) => { if (isHost) H.current.hostAnalysisMove(p); });
    on("analysis_cmd", (p) => { if (isHost) H.current.hostAnalysisCmd(p); });
    ch.subscribe((s) => {
      if (s !== "SUBSCRIBED") return;
      setChannelReady(true);
      H.current.onSubscribed();
    });
    return () => {
      timeouts.current.forEach(clearTimeout);
      clearTimeout(flagTimer.current);
      if (botTimer.current) clearTimeout(botTimer.current);
      botReq.current += 1;
      // Un client qui CESSE d'être hôte ne doit plus arbitrer ; et s'il le
      // redevient, il reprendra depuis ce qu'il affiche, pas depuis un
      // arbitre resté figé au moment où il a passé la main.
      hGame.current = null;
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, isHost]);

  useEffect(() => () => { try { if (workerRef.current) workerRef.current.terminate(); } catch (e) { /* rien */ } }, []);

  // Coup optimiste resté sans réponse : on revient à la position confirmée.
  useEffect(() => {
    if (!pending) return undefined;
    const id = pending.id;
    const tm = setTimeout(() => {
      if (pendingRef.current && pendingRef.current.id === id) {
        pendingRef.current = null; setPending(null);
        send("sync_req", {});
      }
    }, PENDING_TIMEOUT_MS);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  // =========================================================================
  //  AFFICHAGE
  // =========================================================================
  const disp = pending || game;
  const dispSnap = pending ? pending.snap : snap;
  const inGame = phase === "playing";
  const terminal = isTerminal(game.status);
  const isPlayer = myColor !== null;
  const view = useMemo(() => { const c = new Chess(); try { c.load(disp.fen); } catch (e) { /* départ */ } return c; }, [disp.fen]);
  const turnColor = view.turn();
  const fens = useMemo(() => (inGame ? positionsOf(disp.moves) : [disp.fen]), [inGame, disp.moves, disp.fen]);
  const liveLen = disp.moves.length;
  const viewing = inGame && viewPly !== null && viewPly < liveLen && viewPly < fens.length;
  const boardFen = viewing ? fens[viewPly] : disp.fen;
  const boardLast = viewing ? (viewPly > 0 ? { from: disp.moves[viewPly - 1].from, to: disp.moves[viewPly - 1].to } : null) : disp.lastMove;
  const boardGame = useMemo(() => {
    if (boardFen === disp.fen) return view;
    const c = new Chess(); try { c.load(boardFen); } catch (e) { /* départ */ } return c;
  }, [boardFen, disp.fen, view]);
  const checkSq = checkSquare(boardGame);
  const material = useMemo(() => materialDiff(boardFen), [boardFen]);

  const baseOrient = phase === "analysis" ? "w" : myColor === "b" ? "b" : "w";
  const orientation = flipped ? otherColor(baseOrient) : baseOrient;
  const canAnalysisMove = phase === "analysis" && (isHost || !!perms[me.id]);

  let movableColor = null, premoveColor = null;
  if (inGame && isPlayer && !terminal && !viewing) {
    if (turnColor === myColor) { if (!countingDown) movableColor = myColor; }
    else premoveColor = myColor;
  } else if (phase === "analysis" && canAnalysisMove) {
    movableColor = "both";
  }

  const getDests = useCallback((sq) => {
    if (phase === "analysis") {
      const p = view.get(sq);
      if (!p) return [];
      if (p.color === view.turn()) return legalDests(view, sq);
      try { return legalDests(new Chess(alignTurn(disp.fen, p.color)), sq); } catch (e) { return []; }
    }
    return legalDests(view, sq);
  }, [phase, view, disp.fen]);
  const onBoardMove = useCallback((from, to, promotion) => H.current.userMove(from, to, promotion), []);
  const onBoardPremove = useCallback((pm) => H.current.setPremoveBoth(pm), []);

  // ---- Effets de fin de partie, sons ------------------------------------------
  // Résultat : seulement pour une partie terminée SOUS NOS YEUX — recharger la
  // page sur une partie finie l'aurait sinon comptée une seconde fois.
  useEffect(() => {
    if (!game.winner || savedResultRef.current || !white || !black || !isPlayer || !endedLiveRef.current) return;
    savedResultRef.current = true;
    const won = game.winner === myColor;
    setMyWin(won);
    if (won) playGameWin(); else playGameLose();
    if (soloRef.current) return; // pas de palmarès contre l'ordinateur
    recordMatchResult(room.id, won);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.winner]);

  const prevStatusRef = useRef("playing");
  useEffect(() => {
    if ((game.status === "stalemate" || game.status === "draw") && !isTerminal(prevStatusRef.current) && isPlayer && endedLiveRef.current) playConfirmChime();
    prevStatusRef.current = game.status;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status]);

  // Toc de bois à chaque coup affiché (optimiste compris : le son part au
  // doigt), plus grave sur une prise. Jamais quand l'historique arrive d'un
  // bloc (restauration) ; la navigation ramène au direct à chaque coup neuf.
  const prevLenRef = useRef(0);
  useEffect(() => {
    const n = disp.moves.length;
    if (n === prevLenRef.current + 1) {
      const last = disp.moves[n - 1];
      if (last?.captured) playChessCapture(); else playChessMove();
    }
    if (n !== prevLenRef.current) setViewPly(null);
    prevLenRef.current = n;
  }, [disp.moves]);

  useEffect(() => {
    if (!game.winner || !endedLiveRef.current) { if (!game.winner) confettiRef.current = false; return; }
    if (confettiRef.current) return;
    confettiRef.current = true;
    const colors = ["#FFD166", "#E8B75A", "#B6F04C", "#4ECDC4", "#ffffff"];
    setConfetti(Array.from({ length: 54 }, (_, i) => ({
      key: "c-" + i + "-" + Date.now(),
      left: Math.round(Math.random() * 100),
      color: colors[i % colors.length],
      delay: (Math.random() * 0.5).toFixed(2),
      duration: (1.6 + Math.random() * 1.3).toFixed(2),
      size: 7 + Math.round(Math.random() * 5),
      round: i % 3 === 0,
      drift: Math.round((Math.random() - 0.5) * 140),
    })));
    timeouts.current.push(setTimeout(() => setConfetti([]), 3200));
    // Le bandeau se RETIRE : avant, il voilait le plateau jusqu'à la revanche,
    // alors que la position finale est justement ce qu'on veut regarder.
    setBanner(true);
    timeouts.current.push(setTimeout(() => setBanner(false), 3000));
  }, [game.winner]);

  // Navigation dans les coups au clavier, PENDANT la partie comme après
  // (← → pas à pas, ↑/Début au départ, ↓/Fin au direct). Jamais quand on
  // écrit dans le tchat.
  useEffect(() => {
    if (phase !== "playing") return undefined;
    const onKey = (e) => {
      const tg = e.target;
      if (tg && tg.closest && tg.closest("input, textarea, select, [contenteditable='true']")) return;
      const len = liveLen;
      if (e.key === "ArrowLeft") { e.preventDefault(); setViewPly((p) => Math.max(0, (p ?? len) - 1)); }
      else if (e.key === "ArrowRight") { e.preventDefault(); setViewPly((p) => (p === null || p + 1 >= len ? null : p + 1)); }
      else if (e.key === "ArrowUp" || e.key === "Home") { e.preventDefault(); setViewPly(len > 0 ? 0 : null); }
      else if (e.key === "ArrowDown" || e.key === "End") { e.preventDefault(); setViewPly(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, liveLen]);

  // ---- Actions ---------------------------------------------------------------
  function seatsForGame() {
    const seat = (p) => ({ id: p.profile_id, username: p.profiles?.username, avatar: p.profiles?.avatar });
    if (solo && players.length === 1) {
      const human = seat(players[0]);
      const bot = { id: BOT_ID, username: t("chessBot"), avatar: "🤖" };
      return Math.random() < 0.5 ? [human, bot] : [bot, human];
    }
    const [a, b] = players.map(seat);
    return Math.random() < 0.5 ? [a, b] : [b, a];
  }
  function startTimed(cad) {
    if (!isHost) return;
    const [w, b] = seatsForGame();
    const payload = { white: w, black: b, cadence: { base: cad.base, inc: cad.inc }, solo: !!(solo && players.length === 1), mid: newId() };
    send("match_start", payload);
    onMatchStart(payload);
  }
  // Revanche : MÊME cadence (audit : elle retombait toujours en 10 min) et
  // couleurs INVERSÉES, comme sur lichess.
  function rematch() {
    if (!isHost || !whiteRef.current || !blackRef.current) return;
    const payload = { white: blackRef.current, black: whiteRef.current, cadence: cadenceRef.current, solo: soloRef.current, mid: newId() };
    send("match_start", payload);
    onMatchStart(payload);
  }
  function startAnalysis() {
    if (!isHost) return;
    const payload = { perms: { [me.id]: true }, mid: newId() }; // au départ, seul l'hôte bouge les pièces
    send("analysis_start", payload);
    onAnalysisStart(payload);
  }
  function analysisCmd(cmd) { toHost("analysis_cmd", { by: me.id, cmd }, hostAnalysisCmd); }
  function togglePerm(pid) {
    if (!isHost || pid === me.id) return; // l'hôte est toujours autorisé
    const next = { ...permsRef.current };
    if (next[pid]) delete next[pid]; else next[pid] = true;
    permsRef.current = next; setPerms(next);
    hostAnalysisBroadcast();
  }
  const requestTakeback = () => toHost("offer", { by: me.id, kind: "takeback" }, hostOffer);
  const offerDraw = () => toHost("offer", { by: me.id, kind: "draw" }, hostOffer);
  const replyOffer = (kind, accept) => toHost("offer_reply", { by: me.id, kind, accept }, hostReply);
  const resign = () => { setConfirmResign(false); toHost("resign", { by: me.id }, (p) => hostResign(p.by)); };
  const abortGame = () => toHost("abort", { by: me.id }, (p) => hostAbort(p.by));
  async function backToRoom() {
    await resetRoomToLobby(room.id);
    onFinish && onFinish();
  }
  function downloadPgn() {
    try {
      const d = new Date();
      const stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
      const text = buildPgn({ moves: game.moves, whiteName: white?.username, blackName: black?.username, status: game.status, winner: game.winner, date: d });
      const url = URL.createObjectURL(new Blob([text], { type: "application/x-chess-pgn" }));
      const a = document.createElement("a");
      a.href = url; a.download = "arcardi-echecs-" + stamp + ".pgn";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) { /* rien */ }
  }

  // ---- Textes ------------------------------------------------------------------
  const colorName = (c) => (c === "w" ? t("chessWhite") : t("chessBlack"));
  function resultText() {
    const s = game.status;
    if (s === "checkmate") return t("chessCheckmate").replace("{w}", colorName(game.winner));
    if (s === "timeout") return t("chessTimeout").replace("{w}", colorName(game.winner));
    if (s === "resign") return t("chessResign").replace("{w}", colorName(game.winner));
    if (s === "stalemate") return t("chessStalemate");
    if (s === "aborted") return t("chessAborted");
    if (s === "draw") return t(DRAW_KEY[game.reason] || "chessDraw");
    return "";
  }
  function statusMessage() {
    if (terminal) return resultText();
    if (viewing) return t("chessReviewing");
    if (disp.status === "check") return t("chessCheck");
    if (botThinking) return t("chessBotThinking");
    if (isPlayer && turnColor === myColor) return t("chessYourTurn");
    if (isPlayer) return premove ? t("chessPremoveSet") : t("chessOpponentTurn");
    return t("chessSpectating");
  }

  // ---- Morceaux d'interface ---------------------------------------------------
  const boardEl = (interactiveViewOnly) => (
    <div className="chess-board-frame">
      <ChessBoard
        fen={boardFen}
        orientation={orientation}
        lastMove={boardLast}
        check={checkSq}
        movableColor={movableColor}
        premoveColor={premoveColor}
        premove={premove}
        getDests={getDests}
        onMove={onBoardMove}
        onPremove={onBoardPremove}
        viewOnly={interactiveViewOnly}
      />
    </div>
  );
  const navEl = (
    <div className="chess-nav">
      <button className="chess-navbtn" onClick={() => setViewPly(liveLen > 0 ? 0 : null)} disabled={liveLen === 0 || viewPly === 0} aria-label={t("chessReviewFirst")} title={t("chessReviewFirst")}>⏮</button>
      <button className="chess-navbtn" onClick={() => setViewPly((p) => Math.max(0, (p ?? liveLen) - 1))} disabled={liveLen === 0 || viewPly === 0} aria-label={t("chessReviewPrev")} title={t("chessReviewPrev")}>◀</button>
      <button className="chess-navbtn" onClick={() => setViewPly((p) => (p === null || p + 1 >= liveLen ? null : p + 1))} disabled={!viewing} aria-label={t("chessReviewNext")} title={t("chessReviewNext")}>▶</button>
      <button className="chess-navbtn" onClick={() => setViewPly(null)} disabled={!viewing} aria-label={t("chessReviewLast")} title={t("chessReviewLast")}>⏭</button>
      <button className="chess-navbtn flip" onClick={() => setFlipped((f) => !f)} aria-label={t("chessFlip")} title={t("chessFlip")}>⇅</button>
    </div>
  );

  let content;
  if (phase === "intro") {
    const ready = channelReady && ((solo && players.length === 1) || (!solo && players.length === 2));
    if (isHost && ready) {
      content = (
        <div className="chess-setup">
          <div className="chess-setup-title">{t("chessChooseCadence")}</div>
          <div className="chess-cadence-grid">
            {CADENCES.map((c) => (
              <button key={c.base} className="chess-cad" onClick={() => startTimed(c)}>
                <span className="chess-cad-n">{cadLabel(c)}</span>
                <span className="chess-cad-unit">{t("chessCadenceUnit")}</span>
                <span className="chess-cad-tag">{t(c.tagKey)}</span>
              </button>
            ))}
            <button className="chess-cad analysis" onClick={startAnalysis}>
              <span className="chess-cad-ico" style={{ backgroundImage: pieceBg("w", "n") }} />
              <span className="chess-cad-tag">{t("chessAnalysisBoard")}</span>
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>{t("chessGuestsWait")}</p>
        </div>
      );
    } else if (!solo && players.length < 2) {
      content = <p className="muted">{t("chessWaitPlayers")}</p>;
    } else {
      content = <p className="muted">{t("chessHostChoosing")}</p>;
    }
  } else if (phase === "analysis") {
    content = (
      <div className="chess-layout analysis">
        <div className="chess-a-status chess-status">{t("chessAnalysisBoard")}{!canAnalysisMove ? " · " + t("chessAnalysisLocked") : ""}</div>
        <div className="chess-a-board">{boardEl(!canAnalysisMove)}</div>
        {isHost && (
          <div className="chess-a-top">
            <div className="chess-perms">
              <div className="chess-perms-head">{t("chessWhoCanMove")}</div>
              {players.map((p) => {
                const on = p.profile_id === me.id || !!perms[p.profile_id];
                const locked = p.profile_id === me.id;
                return (
                  <div key={p.id} className={"chess-perm-row" + (on ? " on" : "")} onClick={() => togglePerm(p.profile_id)} style={{ cursor: locked ? "default" : "pointer" }}>
                    <span className="chess-avatar">{p.profiles?.avatar}</span>
                    <span className="chess-perm-name">{p.profiles?.username}{p.profile_id === room.host_id ? " 👑" : ""}</span>
                    <span className={"chess-check" + (on ? " on" : "")}>{on ? "✓" : ""}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="chess-a-moves">
          <div className="chess-moves-box">
            <MoveList moves={disp.moves} lang={lang} curPly={liveLen} t={t} />
          </div>
        </div>
        <div className="chess-a-actions">
          <div className="chess-btnrow">
            <button className="chess-btn" onClick={() => analysisCmd("undo")} disabled={!canAnalysisMove || disp.moves.length === 0}>{t("chessUndo")}</button>
            <button className="chess-btn" onClick={() => analysisCmd("reset")} disabled={!canAnalysisMove || disp.moves.length === 0}>{t("chessReset")}</button>
            <button className="chess-btn" onClick={() => setFlipped((f) => !f)}>⇅ {t("chessFlip")}</button>
            {isHost && <button className="chess-btn" onClick={backToRoom}>{t("chessBackRoom")}</button>}
          </div>
        </div>
      </div>
    );
  } else {
    const topColor = orientation === "w" ? "b" : "w";
    const botColor = otherColor(topColor);
    const seatOf = (c) => (c === "w" ? white : black);
    const running = (c) => !terminal && !!dispSnap && dispSnap.side === c;
    const offers = game.offers || {};
    const oppOffer = (k) => offers[k] && offers[k] !== myColor;
    const tbPlies = isPlayer ? takebackPlies(game.moves.map((m) => m.color), turnOf(game.fen), myColor) : 0;
    const isSolo = soloRef.current;
    const early = !isSolo && game.moves.length < 2;
    content = (
      <div className="chess-layout">
        <div className="chess-a-status chess-status">{statusMessage()}</div>
        <div className="chess-a-top">
          <PlayerBar player={seatOf(topColor)} color={topColor} snap={dispSnap} running={running(topColor)} material={material[topColor]} thinking={botThinking && seatOf(topColor)?.id === BOT_ID} t={t} />
        </div>
        <div className="chess-a-board">{boardEl(!isPlayer || terminal || viewing)}</div>
        <div className="chess-a-bot">
          <PlayerBar player={seatOf(botColor)} color={botColor} snap={dispSnap} running={running(botColor)} material={material[botColor]} thinking={botThinking && seatOf(botColor)?.id === BOT_ID} t={t} />
        </div>

        <div className="chess-a-actions">
          {isPlayer && !terminal && (
            <div className="chess-actions">
              {oppOffer("takeback") && (
                <div className="chess-offer">
                  <span>{t("chessTakebackAsked")}</span>
                  <div className="chess-btnrow">
                    <button className="chess-btn primary" onClick={() => replyOffer("takeback", true)}>{t("chessAccept")}</button>
                    <button className="chess-btn" onClick={() => replyOffer("takeback", false)}>{t("chessDecline")}</button>
                  </div>
                </div>
              )}
              {oppOffer("draw") && (
                <div className="chess-offer">
                  <span>{t("chessDrawAsked")}</span>
                  <div className="chess-btnrow">
                    <button className="chess-btn primary" onClick={() => replyOffer("draw", true)}>{t("chessAccept")}</button>
                    <button className="chess-btn" onClick={() => replyOffer("draw", false)}>{t("chessDecline")}</button>
                  </div>
                </div>
              )}
              {offers.takeback === myColor && (
                <div className="chess-offer mine"><span>{t("chessTakebackWait")}</span><button className="chess-btn" onClick={() => replyOffer("takeback", false)}>{t("chessCancel")}</button></div>
              )}
              {offers.draw === myColor && (
                <div className="chess-offer mine"><span>{t("chessDrawWait")}</span><button className="chess-btn" onClick={() => replyOffer("draw", false)}>{t("chessCancel")}</button></div>
              )}
              <div className="chess-btnrow">
                {early ? (
                  <button className="chess-btn" onClick={abortGame}>{t("chessAbort")}</button>
                ) : (
                  <>
                    <button className="chess-btn" onClick={requestTakeback} disabled={!tbPlies || !!offers.takeback || !!pending}>{t("chessTakeback")}</button>
                    {!isSolo && <button className="chess-btn" onClick={offerDraw} disabled={offers.draw === myColor}>{t("chessOfferDraw")}</button>}
                    {confirmResign ? (
                      <button className="chess-btn danger" onClick={resign}>{t("chessResignConfirm")}</button>
                    ) : (
                      <button className="chess-btn" onClick={() => setConfirmResign(true)}>{t("chessResignBtn")}</button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          {terminal && (
            <div className="chess-actions">
              {isHost ? (
                <div className="chess-btnrow">
                  <button className="chess-btn primary" onClick={rematch}>{t("chessRematch")} · {cadLabel(cadence)}</button>
                  <button className="chess-btn" onClick={backToRoom}>{t("chessBackRoom")}</button>
                </div>
              ) : (
                <p className="muted" style={{ margin: 0 }}>{t("chessRematchWait")}</p>
              )}
              <div className="chess-btnrow">
                <button className="chess-btn" onClick={downloadPgn} disabled={game.moves.length === 0}>{t("chessDownloadPgn")}</button>
              </div>
            </div>
          )}
        </div>

        <div className="chess-a-moves">
          <div className="chess-moves-box">
            <MoveList
              moves={disp.moves}
              lang={lang}
              curPly={viewing ? viewPly : liveLen}
              onJump={(ply) => setViewPly(ply >= liveLen ? null : ply)}
              t={t}
              footer={terminal ? (
                <div className="chess-result"><b>{pgnResult(game.status, game.winner)}</b><span>{resultText()}</span></div>
              ) : null}
            />
            {navEl}
          </div>
        </div>

        {banner && game.winner && !viewing && (
          <div className="win-banner" style={{ background: "radial-gradient(circle at 50% 40%, rgba(255,209,102,.18), rgba(10,7,5,.86) 72%)" }}>
            <div className="win-banner-title" style={{ textShadow: "0 0 18px rgba(255,209,102,.8), 0 3px 0 rgba(0,0,0,.4)" }}>
              {isPlayer ? (myWin ? "🏆 " + t("chessWinYou") : t("chessWinOpponent")) : t("chessGameOver")}
            </div>
          </div>
        )}
        {confetti.map((p) => (
          <span key={p.key} className="confetti-piece" style={{ left: p.left + "%", width: p.size, height: p.size * 1.4, borderRadius: p.round ? "50%" : 2, background: p.color, "--drift": p.drift + "px", animationDuration: p.duration + "s", animationDelay: p.delay + "s" }} />
        ))}
      </div>
    );
  }

  return (
    <div className="panel chess-panel">
      <h1>{t("chessTitle")}</h1>
      <Crossfade id={phase}>{content}</Crossfade>
      {countingDown && phase === "playing" && (
        <GameCountdown variant="chess" onDone={() => setCountingDown(false)} />
      )}
    </div>
  );
}
