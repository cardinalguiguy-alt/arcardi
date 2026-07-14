"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby, recordMatchResult } from "@/lib/gameSync";
import { CATEGORIES, CATEGORY_IDS, getQuestionPool, questionById } from "@/lib/tuPreferesQuestions";
import { playConfirmChime, playGameCardClick, playWordleGreen, playWordleYellow, playGameWin, playGameLose } from "@/lib/sfx";
import Crossfade from "../Crossfade";

/* ==========================================================================
   TU PRÉFÈRES ? — jeu de dilemmes à DEUX joueurs (duel humain, pas de bot).
   ==========================================================================
   Déroulé d'une manche :
     1. CHOOSE  : une question "Tu préfères A ou B" ; chacun choisit
                  SECRÈTEMENT A ou B.
     2. GUESS   : chacun tente de deviner le choix de l'ADVERSAIRE.
     3. REVEAL  : révélation animée des deux choix + des deux devinettes.
   Score de la manche (par joueur) :
     +1 si les deux ont choisi la MÊME réponse (compatibilité)
     +1 si le joueur a correctement deviné le choix adverse (lecture)
     → 0, 1 ou 2 points par manche. On enchaîne jusqu'à ce qu'un joueur
     atteigne le score cible AVEC une longueur d'avance (pas de victoire à
     égalité — manche supplémentaire tant que c'est à égalité au sommet).

   ARBITRAGE RÉSEAU (identique aux autres jeux) : l'hôte est l'unique source
   de vérité. MAIS comme l'hôte est AUSSI un des deux joueurs, on ne fait
   JAMAIS transiter la valeur d'un choix/devinette avant la révélation :
   pendant CHOOSE et GUESS, seuls des signaux "j'ai verrouillé" (booléens,
   sans valeur) circulent. Les valeurs ne sont diffusées (`values`) qu'une
   fois que TOUT LE MONDE a verrouillé sa devinette (événement
   `reveal_request`) — donc plus rien n'est modifiable, l'hôte ne peut pas
   "peeker" le choix adverse pour ajuster le sien. C'est ce qui garde le
   duel équitable malgré l'arbitrage centralisé.

   Persistance (rooms.game_state, LISIBLE PAR TOUS via RLS) : on n'y écrit
   que du NON-SECRET (phase, joueurs, réglages, manche, scores, id de
   question, verrous booléens, et — après coup — les valeurs déjà révélées).
   Jamais un choix/devinette encore secret. La progression privée d'un
   joueur qui recharge en pleine phase secrète repart de zéro pour cette
   manche (compromis assumé, cohérent avec gameSync.js) : si c'est l'HÔTE
   qui recharge, il relance proprement la manche en cours.
   ========================================================================== */

const GAME_ID = "tupreferes";
const TARGET_OPTIONS = [3, 5, 7, 10];
const TIMER_OPTIONS = [10, 15, 20, 30, 0]; // 0 = illimité
const DEFAULT_SETTINGS = { target: 5, timer: 20, cats: CATEGORY_IDS.slice() };

function playerObj(p) {
  return { id: p.profile_id, username: p.profiles?.username, avatar: p.profiles?.avatar };
}
function randChoice() { return Math.random() < 0.5 ? 0 : 1; }

export default function TuPreferesGame({ room, me, isHost, players, t, lang, onFinish }) {
  const [phase, setPhase] = useState("setup"); // setup | choose | guess | reveal | over
  const [p1, setP1] = useState(null);
  const [p2, setP2] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [round, setRound] = useState(1);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [question, setQuestion] = useState(null);
  const [deadline, setDeadline] = useState(null);   // horodatage ms de fin de phase (ou null = illimité)
  const [remaining, setRemaining] = useState(null);  // secondes restantes (cosmétique)
  const [locks, setLocks] = useState({ choose: { p1: false, p2: false }, guess: { p1: false, p2: false } });
  const [reveal, setReveal] = useState(null);        // { choices, guesses, deltas, scores, gameover, winnerSlot }
  const [channelReady, setChannelReady] = useState(false);

  // Choix/devinette LOCAUX (secrets jusqu'à la révélation) — jamais persistés.
  const [myChoice, setMyChoice] = useState(null);
  const [myGuess, setMyGuess] = useState(null);
  const [sel, setSel] = useState(null);              // sélection en cours avant validation
  const [scoreAnim, setScoreAnim] = useState({ p1: 0, p2: 0 }); // scores AVANT la manche révélée (pour l'anim)

  // Réglages en cours de composition côté hôte (écran setup).
  const [cfg, setCfg] = useState(DEFAULT_SETTINGS);
  const [pick, setPick] = useState([]); // ids des 2 duellistes si >2 joueurs

  // Liste "indésirables" de l'hôte : dilemmes marqués 🚩 pour suppression
  // ultérieure. Stockée en localStorage (côté hôte), consultable/copiable —
  // aucune table Supabase (Guillaume copie la liste puis me demande de les
  // retirer de lib/tuPreferesQuestions.js).
  const [flagged, setFlagged] = useState([]);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagCopied, setFlagCopied] = useState(false);
  const FLAG_KEY = "arcardi_tp_flagged";
  useEffect(() => {
    try { const raw = localStorage.getItem(FLAG_KEY); if (raw) setFlagged(JSON.parse(raw)); } catch (e) {}
  }, []);
  function saveFlagged(list) { setFlagged(list); try { localStorage.setItem(FLAG_KEY, JSON.stringify(list)); } catch (e) {} }
  function toggleFlag() {
    if (!question) return;
    if (flagged.some(f => f.id === question.id)) saveFlagged(flagged.filter(f => f.id !== question.id));
    else saveFlagged([...flagged, { id: question.id, cat: question.cat, fr: question.fr.join(" / "), en: question.en.join(" / ") }]);
  }
  function clearFlags() { saveFlagged([]); }
  function copyFlags() {
    const text = flagged.map(f => `${f.id} [${f.cat}] — ${f.fr}`).join("\n");
    try { navigator.clipboard.writeText(text); setFlagCopied(true); setTimeout(() => setFlagCopied(false), 1600); } catch (e) {}
  }

  const channelRef = useRef(null);
  const stateRef = useRef({});
  const myRef = useRef({ choice: null, guess: null });
  const hostRef = useRef({ lockChoose: { p1: false, p2: false }, lockGuess: { p1: false, p2: false }, values: { p1: null, p2: null } });
  const restoredRef = useRef(false);
  const autoSetupRef = useRef(false);
  const savedResultRef = useRef(false);
  const timers = useRef([]);          // timeouts génériques
  const phaseTimerRef = useRef(null); // timer d'arbitrage de phase (hôte)

  useEffect(() => { stateRef.current = { p1, p2, settings, round, scores, question }; }, [p1, p2, settings, round, scores, question]);
  useEffect(() => { myRef.current = { choice: myChoice, guess: myGuess }; }, [myChoice, myGuess]);

  const mySlot = () => (p1 && me.id === p1.id ? "p1" : p2 && me.id === p2.id ? "p2" : null);
  const oppSlot = () => (mySlot() === "p1" ? "p2" : mySlot() === "p2" ? "p1" : null);
  const amPlayer = () => mySlot() !== null;
  // Version basée sur stateRef (valeurs FRAÎCHES) pour le code appelé depuis
  // les handlers du canal, enregistrés une seule fois : `p1`/`p2` y seraient
  // sinon figés au premier rendu (closure), ce qui casserait l'envoi des
  // valeurs à la révélation.
  const slotOf = () => { const s = stateRef.current; return s.p1 && me.id === s.p1.id ? "p1" : s.p2 && me.id === s.p2.id ? "p2" : null; };

  // -------------------- persistance (NON-SECRET uniquement) ----------------
  function persist(extra = {}) {
    if (!isHost) return;
    const s = stateRef.current;
    saveGameState(room.id, GAME_ID, {
      phase, p1: s.p1, p2: s.p2, settings: s.settings, round: s.round,
      scores: s.scores, qid: s.question?.id || null,
      deadline, locks, ...extra,
    });
  }

  function clearPhaseTimer() { if (phaseTimerRef.current) { clearTimeout(phaseTimerRef.current); phaseTimerRef.current = null; } }
  function armPhaseTimer(dl, fn) {
    clearPhaseTimer();
    if (!dl) return; // illimité
    const ms = Math.max(0, dl - Date.now());
    phaseTimerRef.current = setTimeout(fn, ms + 250); // petite marge réseau
  }

  // ============================ CANAL ======================================
  useEffect(() => {
    const ch = supabase.channel("tp_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    // Démarrage d'une manche (nouvelle partie OU manche suivante).
    ch.on("broadcast", { event: "round_start" }, ({ payload }) => {
      applyRoundStart(payload);
    });

    // Un joueur a verrouillé sa phase (SANS valeur). Seul l'hôte arbitre.
    ch.on("broadcast", { event: "lock" }, ({ payload }) => {
      if (!isHost) return;
      hostOnLock(payload);
    });

    // Diffusion des voyants de verrou (hôte → tous).
    ch.on("broadcast", { event: "locks" }, ({ payload }) => {
      setLocks(payload.locks);
    });

    // Passage à la phase de devinette (hôte → tous).
    ch.on("broadcast", { event: "go_guess" }, ({ payload }) => {
      setPhase("guess");
      setSel(null);
      setDeadline(payload.deadline || null);
      // Si mon choix n'a pas été verrouillé à temps → tirage au sort local.
      setMyChoice(c => (c === null ? randChoice() : c));
    });

    // Tout le monde a verrouillé sa devinette : chacun DIFFUSE alors ses
    // valeurs (elles ne sont plus modifiables → aucune fuite exploitable).
    ch.on("broadcast", { event: "reveal_request" }, () => {
      const slot = slotOf();
      if (!slot) return;
      const choice = myRef.current.choice === null ? randChoice() : myRef.current.choice;
      const guess = myRef.current.guess === null ? randChoice() : myRef.current.guess;
      channelRef.current?.send({ type: "broadcast", event: "values", payload: { slot, choice, guess } });
    });

    // Réception des valeurs (hôte agrège, calcule, diffuse la révélation).
    ch.on("broadcast", { event: "values" }, ({ payload }) => {
      if (!isHost) return;
      hostOnValues(payload);
    });

    // Révélation finale (hôte → tous).
    ch.on("broadcast", { event: "reveal" }, ({ payload }) => {
      applyReveal(payload);
    });

    ch.subscribe(status => {
      if (status !== "SUBSCRIBED") return;
      setChannelReady(true);
      if (restoredRef.current) return;
      restoredRef.current = true;
      const saved = readGameState(room, GAME_ID);
      if (!saved || !saved.phase || saved.phase === "setup") return;
      // Restauration après rechargement de page.
      setP1(saved.p1); setP2(saved.p2); setSettings(saved.settings || DEFAULT_SETTINGS);
      setRound(saved.round || 1); setScores(saved.scores || { p1: 0, p2: 0 });
      setQuestion(saved.qid ? questionById(saved.qid) : null);
      setLocks(saved.locks || { choose: { p1: false, p2: false }, guess: { p1: false, p2: false } });
      autoSetupRef.current = true;
      if (saved.phase === "reveal" || saved.phase === "over") {
        setReveal(saved.reveal || null);
        setScoreAnim(saved.reveal ? saved.reveal.scores : (saved.scores || { p1: 0, p2: 0 }));
        setPhase(saved.phase);
      } else {
        // En pleine phase secrète : la progression privée est perdue. Si je
        // suis l'HÔTE, je relance proprement la manche en cours pour tout le
        // monde (verrous remis à zéro) plutôt que de rester bloqué.
        if (isHost) {
          setTimeout(() => hostRestartRound(saved), 300);
        } else {
          setMyChoice(null); setMyGuess(null); setSel(null);
          setPhase(saved.phase); setDeadline(saved.deadline || null);
        }
      }
    });

    return () => {
      timers.current.forEach(clearTimeout);
      clearPhaseTimer();
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, isHost]);

  // Countdown cosmétique (tous les clients), piloté par `deadline`.
  useEffect(() => {
    if (!deadline) { setRemaining(null); return; }
    const tick = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const iv = setInterval(tick, 200);
    return () => clearInterval(iv);
  }, [deadline]);

  // ==================== APPLICATION D'ÉTATS (tous clients) =================
  function applyRoundStart(payload) {
    clearPhaseTimer();
    computedRef.current = false;
    hostRef.current = { phase: "choose", lockChoose: { p1: false, p2: false }, lockGuess: { p1: false, p2: false }, values: { p1: null, p2: null } };
    setP1(payload.p1 || stateRef.current.p1);
    setP2(payload.p2 || stateRef.current.p2);
    if (payload.settings) setSettings(payload.settings);
    setRound(payload.round);
    setScores(payload.scores);
    setScoreAnim(payload.scores);
    setQuestion(questionById(payload.qid));
    setReveal(null);
    setMyChoice(null); setMyGuess(null); setSel(null);
    setLocks({ choose: { p1: false, p2: false }, guess: { p1: false, p2: false } });
    setDeadline(payload.deadline || null);
    setPhase("choose");
    savedResultRef.current = false;
    if (isHost) {
      const dl = payload.deadline || null;
      saveGameState(room.id, GAME_ID, {
        phase: "choose", p1: payload.p1 || stateRef.current.p1, p2: payload.p2 || stateRef.current.p2,
        settings: payload.settings || stateRef.current.settings, round: payload.round,
        scores: payload.scores, qid: payload.qid, deadline: dl,
        locks: { choose: { p1: false, p2: false }, guess: { p1: false, p2: false } },
      });
      armPhaseTimer(dl, () => hostGoGuess());
    }
  }

  function applyReveal(payload) {
    clearPhaseTimer();
    setReveal(payload);
    setScoreAnim(payload.scoresBefore);
    setDeadline(null);
    setPhase(payload.gameover ? "over" : "reveal");
    // Animation des scores : on part de scoresBefore puis on monte.
    const t1 = setTimeout(() => setScoreAnim(payload.scores), 650);
    timers.current.push(t1);
    // SFX légers de révélation.
    const same = payload.choices.p1 === payload.choices.p2;
    const t2 = setTimeout(() => { if (same) playWordleGreen(); else playWordleYellow(); }, 350);
    timers.current.push(t2);
    if (payload.gameover) {
      const sl = slotOf();
      const iWon = sl && payload.winnerSlot === sl;
      const t3 = setTimeout(() => { if (sl) { iWon ? playGameWin() : playGameLose(); } }, 900);
      timers.current.push(t3);
    }
    if (isHost) {
      saveGameState(room.id, GAME_ID, {
        phase: payload.gameover ? "over" : "reveal",
        p1: stateRef.current.p1, p2: stateRef.current.p2, settings: stateRef.current.settings,
        round: stateRef.current.round, scores: payload.scores, qid: stateRef.current.question?.id || null,
        deadline: null, locks, reveal: payload,
      });
    }
  }

  // ============================ HÔTE : arbitrage ===========================
  function hostOnLock({ slot, stage }) {
    if (!slot || (slot !== "p1" && slot !== "p2")) return;
    const h = hostRef.current;
    if (stage === "choose") h.lockChoose[slot] = true;
    else if (stage === "guess") h.lockGuess[slot] = true;
    const nextLocks = { choose: { ...h.lockChoose }, guess: { ...h.lockGuess } };
    setLocks(nextLocks);
    channelRef.current?.send({ type: "broadcast", event: "locks", payload: { locks: nextLocks } });
    if (stage === "choose" && h.lockChoose.p1 && h.lockChoose.p2) hostGoGuess();
    if (stage === "guess" && h.lockGuess.p1 && h.lockGuess.p2) hostGoReveal();
  }

  function hostGoGuess() {
    if (hostRef.current.phase !== "choose") return; // garde anti double-transition
    hostRef.current.phase = "guess";
    clearPhaseTimer();
    const timer = stateRef.current.settings?.timer || 0;
    const dl = timer ? Date.now() + timer * 1000 : null;
    channelRef.current?.send({ type: "broadcast", event: "go_guess", payload: { deadline: dl } });
    persist({ phase: "guess", deadline: dl });
    armPhaseTimer(dl, () => hostGoReveal());
  }

  function hostGoReveal() {
    if (hostRef.current.phase !== "guess") return; // garde anti double-transition
    hostRef.current.phase = "reveal";
    clearPhaseTimer();
    hostRef.current.values = { p1: null, p2: null };
    channelRef.current?.send({ type: "broadcast", event: "reveal_request", payload: {} });
    // Filet de sécurité : si un joueur est hors ligne et ne renvoie pas ses
    // valeurs, l'hôte complète au hasard après un court délai et calcule.
    const t = setTimeout(() => hostComputeReveal(true), 2200);
    timers.current.push(t);
  }

  function hostOnValues({ slot, choice, guess }) {
    if (!slot || (slot !== "p1" && slot !== "p2")) return;
    hostRef.current.values[slot] = { choice, guess };
    if (hostRef.current.values.p1 && hostRef.current.values.p2) hostComputeReveal(false);
  }

  const computedRef = useRef(false);
  function hostComputeReveal(fillMissing) {
    if (computedRef.current) return;
    const v = hostRef.current.values;
    if (!fillMissing && (!v.p1 || !v.p2)) return;
    const vp1 = v.p1 || { choice: randChoice(), guess: randChoice() };
    const vp2 = v.p2 || { choice: randChoice(), guess: randChoice() };
    computedRef.current = true;
    const same = vp1.choice === vp2.choice;
    const p1Right = vp1.guess === vp2.choice;
    const p2Right = vp2.guess === vp1.choice;
    const deltaP1 = (same ? 1 : 0) + (p1Right ? 1 : 0);
    const deltaP2 = (same ? 1 : 0) + (p2Right ? 1 : 0);
    const before = stateRef.current.scores;
    const after = { p1: before.p1 + deltaP1, p2: before.p2 + deltaP2 };
    const target = stateRef.current.settings?.target || 5;
    const reached = after.p1 >= target || after.p2 >= target;
    const gameover = reached && after.p1 !== after.p2;
    const winnerSlot = gameover ? (after.p1 > after.p2 ? "p1" : "p2") : null;
    channelRef.current?.send({
      type: "broadcast", event: "reveal",
      payload: {
        choices: { p1: vp1.choice, p2: vp2.choice },
        guesses: { p1: vp1.guess, p2: vp2.guess },
        deltas: { p1: deltaP1, p2: deltaP2 },
        same, right: { p1: p1Right, p2: p2Right },
        scoresBefore: before, scores: after, gameover, winnerSlot,
      },
    });
    setTimeout(() => { computedRef.current = false; }, 1500);
  }

  // Relance propre de la manche courante (hôte qui recharge en phase secrète).
  function hostRestartRound(saved) {
    const dl = (saved.settings?.timer || 0) ? Date.now() + (saved.settings.timer * 1000) : null;
    channelRef.current?.send({
      type: "broadcast", event: "round_start",
      payload: { p1: saved.p1, p2: saved.p2, settings: saved.settings, round: saved.round, scores: saved.scores, qid: saved.qid, deadline: dl },
    });
  }

  // ======================= HÔTE : lancement / suite =======================
  function nextQuestionId(excludeId) {
    const arr = getQuestionPool(stateRef.current.settings?.cats) ;
    const use = arr.length ? arr : getQuestionPool(null);
    let q = use[Math.floor(Math.random() * use.length)];
    if (excludeId && use.length > 1) { let guard = 0; while (q.id === excludeId && guard++ < 8) q = use[Math.floor(Math.random() * use.length)]; }
    return q.id;
  }

  function startMatch() {
    if (!isHost || !channelReady) return;
    const cats = cfg.cats && cfg.cats.length ? cfg.cats : CATEGORY_IDS.slice();
    const st = { target: cfg.target, timer: cfg.timer, cats };
    // Détermination des 2 duellistes.
    let duo;
    if (players.length === 2) duo = players;
    else {
      duo = pick.map(id => players.find(p => p.profile_id === id)).filter(Boolean);
      if (duo.length !== 2) return;
    }
    const a = playerObj(duo[0]), b = playerObj(duo[1]);
    const [first, second] = Math.random() < 0.5 ? [a, b] : [b, a];
    const dl = st.timer ? Date.now() + st.timer * 1000 : null;
    const arr = getQuestionPool(cats);
    const qid = (arr.length ? arr : getQuestionPool(null))[Math.floor(Math.random() * (arr.length ? arr.length : getQuestionPool(null).length))].id;
    channelRef.current?.send({
      type: "broadcast", event: "round_start",
      payload: { p1: first, p2: second, settings: st, round: 1, scores: { p1: 0, p2: 0 }, qid, deadline: dl },
    });
  }

  function nextRound() {
    if (!isHost) return;
    const st = stateRef.current;
    const dl = (st.settings?.timer || 0) ? Date.now() + st.settings.timer * 1000 : null;
    channelRef.current?.send({
      type: "broadcast", event: "round_start",
      payload: { round: (st.round || 1) + 1, scores: st.scores, qid: nextQuestionId(st.question?.id), deadline: dl },
    });
  }

  function rematch() {
    if (!isHost) return;
    const st = stateRef.current;
    const dl = (st.settings?.timer || 0) ? Date.now() + st.settings.timer * 1000 : null;
    const [first, second] = Math.random() < 0.5 ? [st.p1, st.p2] : [st.p2, st.p1];
    channelRef.current?.send({
      type: "broadcast", event: "round_start",
      payload: { p1: first, p2: second, settings: st.settings, round: 1, scores: { p1: 0, p2: 0 }, qid: nextQuestionId(st.question?.id), deadline: dl },
    });
  }

  async function backToRoom() { await resetRoomToLobby(room.id); onFinish && onFinish(); }

  // ======================= JOUEUR : actions ================================
  function lockChoice() {
    if (sel === null) return;
    setMyChoice(sel);
    playConfirmChime();
    channelRef.current?.send({ type: "broadcast", event: "lock", payload: { slot: mySlot(), stage: "choose" } });
    setSel(null);
  }
  function lockGuess() {
    if (sel === null) return;
    setMyGuess(sel);
    playConfirmChime();
    channelRef.current?.send({ type: "broadcast", event: "lock", payload: { slot: mySlot(), stage: "guess" } });
    setSel(null);
  }

  // Enregistrement du résultat (Victoires/Défaites du salon) à la fin.
  useEffect(() => {
    if (phase !== "over" || !reveal || savedResultRef.current) return;
    const slot = mySlot();
    if (!slot) return;
    savedResultRef.current = true;
    recordMatchResult(room.id, reveal.winnerSlot === slot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, reveal]);

  // Auto-setup : à 2 joueurs pile, pas d'écran de sélection de duellistes.
  useEffect(() => {
    if (players.length === 2 && pick.length !== 0) setPick([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.length]);

  // ============================== RENDU ====================================
  const optText = (side) => (question ? (question[lang] || question.fr)[side] : "");

  const slot = mySlot();
  const opp = slot === "p1" ? p2 : slot === "p2" ? p1 : null;
  const iLockedChoose = slot ? locks.choose[slot] : false;
  const iLockedGuess = slot ? locks.guess[slot] : false;
  const oppLockedChoose = oppSlot() ? locks.choose[oppSlot()] : false;
  const oppLockedGuess = oppSlot() ? locks.guess[oppSlot()] : false;
  const isFlagged = question ? flagged.some(f => f.id === question.id) : false;
  const inRound = !!question && (phase === "choose" || phase === "guess" || phase === "reveal" || phase === "over");

  let content;

  // ---------- SETUP ----------
  if (phase === "setup") {
    if (players.length < 2) {
      content = <p className="muted">{t("tpNotEnough")}</p>;
    } else if (!isHost) {
      content = <p className="muted">{t("tpWaitHostSetup")}</p>;
    } else {
      const needPick = players.length > 2;
      const canStart = (!needPick || pick.length === 2) && cfg.cats.length >= 1;
      content = (
        <div className="tp-setup">
          {needPick && (
            <div className="tp-setup-block">
              <p className="hint">{t("tpPickDuo")}</p>
              <div className="tp-chip-row">
                {players.map(p => {
                  const on = pick.includes(p.profile_id);
                  return (
                    <button key={p.id} type="button"
                      className={"tp-chip" + (on ? " on" : "")}
                      onClick={() => setPick(prev => prev.includes(p.profile_id) ? prev.filter(x => x !== p.profile_id) : prev.length >= 2 ? prev : [...prev, p.profile_id])}>
                      <span>{p.profiles?.avatar}</span><span>{p.profiles?.username}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="tp-setup-block">
            <p className="hint">{t("tpTargetLabel")}</p>
            <div className="tp-seg">
              {TARGET_OPTIONS.map(v => (
                <button key={v} type="button" className={"tp-seg-btn" + (cfg.target === v ? " on" : "")} onClick={() => setCfg(c => ({ ...c, target: v }))}>{v}</button>
              ))}
            </div>
          </div>

          <div className="tp-setup-block">
            <p className="hint">{t("tpTimerLabel")}</p>
            <div className="tp-seg">
              {TIMER_OPTIONS.map(v => (
                <button key={v} type="button" className={"tp-seg-btn" + (cfg.timer === v ? " on" : "")} onClick={() => setCfg(c => ({ ...c, timer: v }))}>
                  {v === 0 ? t("tpTimerOff") : v + "s"}
                </button>
              ))}
            </div>
          </div>

          <div className="tp-setup-block">
            <p className="hint">{t("tpCatsLabel")}</p>
            <div className="tp-chip-row">
              {CATEGORIES.map(c => {
                const on = cfg.cats.includes(c.id);
                return (
                  <button key={c.id} type="button" className={"tp-chip" + (on ? " on" : "")}
                    onClick={() => setCfg(cc => ({ ...cc, cats: on ? cc.cats.filter(x => x !== c.id) : [...cc.cats, c.id] }))}>
                    <span>{c.icon}</span><span>{lang === "en" ? c.en : c.fr}</span>
                  </button>
                );
              })}
            </div>
            {cfg.cats.length === 0 && <p className="tp-warn">{t("tpCatsWarn")}</p>}
          </div>

          <button className="btn tp-start" disabled={!canStart} onClick={startMatch}>🎬 {t("tpStart")}</button>
        </div>
      );
    }
  }

  // ---------- CHOOSE ----------
  else if (phase === "choose") {
    content = (
      <div className="tp-round">
        <TpHeader p1={p1} p2={p2} scores={scoreAnim} round={round} target={settings.target} slot={slot} t={t} />
        {remaining !== null && <div className={"tp-timer" + (remaining <= 5 ? " urgent" : "")}>⏱ {remaining}s</div>}
        <div className="tp-question"><span className="tp-question-lead">{t("tpPrompt")}</span></div>
        {amPlayer() ? (
          !iLockedChoose ? (
            <>
              <div className="tp-options">
                <OptionCard side={0} active={sel === 0} onPick={() => setSel(0)} text={optText(0)} />
                <div className="tp-or">{t("tpOr")}</div>
                <OptionCard side={1} active={sel === 1} onPick={() => setSel(1)} text={optText(1)} />
              </div>
              <button className="btn tp-validate" disabled={sel === null} onClick={lockChoice}>🔒 {t("tpLockChoice")}</button>
            </>
          ) : (
            <div className="tp-waiting">
              <div className="tp-locked-badge">✅ {t("tpChoiceLocked")}</div>
              <p className="muted">{oppLockedChoose ? t("tpBothLocked") : `${t("tpWaitingFor")} ${opp?.username}…`}</p>
              <TpLockDots a={iLockedChoose} b={oppLockedChoose} an={p1?.username} bn={p2?.username} me={slot} />
            </div>
          )
        ) : (
          <div className="tp-waiting">
            <div className="tp-options tp-options-spectate">
              <OptionCard side={0} disabled onPick={() => {}} text={optText(0)} />
              <div className="tp-or">{t("tpOr")}</div>
              <OptionCard side={1} disabled onPick={() => {}} text={optText(1)} />
            </div>
            <p className="muted">👀 {t("tpSpectateChoose")}</p>
            <TpLockDots a={locks.choose.p1} b={locks.choose.p2} an={p1?.username} bn={p2?.username} />
          </div>
        )}
      </div>
    );
  }

  // ---------- GUESS ----------
  else if (phase === "guess") {
    content = (
      <div className="tp-round">
        <TpHeader p1={p1} p2={p2} scores={scoreAnim} round={round} target={settings.target} slot={slot} t={t} />
        {remaining !== null && <div className={"tp-timer" + (remaining <= 5 ? " urgent" : "")}>⏱ {remaining}s</div>}
        <div className="tp-question"><span className="tp-question-lead">{t("tpPrompt")}</span></div>
        {amPlayer() ? (
          !iLockedGuess ? (
            <>
              <p className="tp-guess-lead">🔮 {t("tpGuessLead")} <b>{opp?.username}</b>{t("tpGuessTail")}</p>
              <div className="tp-options">
                <OptionCard side={0} active={sel === 0} onPick={() => setSel(0)} text={optText(0)} />
                <div className="tp-or">{t("tpOr")}</div>
                <OptionCard side={1} active={sel === 1} onPick={() => setSel(1)} text={optText(1)} />
              </div>
              <button className="btn tp-validate" disabled={sel === null} onClick={lockGuess}>🔒 {t("tpLockGuess")}</button>
            </>
          ) : (
            <div className="tp-waiting">
              <div className="tp-locked-badge">✅ {t("tpGuessLocked")}</div>
              <p className="muted">{oppLockedGuess ? t("tpRevealSoon") : `${t("tpWaitingFor")} ${opp?.username}…`}</p>
              <TpLockDots a={iLockedGuess} b={oppLockedGuess} an={p1?.username} bn={p2?.username} me={slot} />
            </div>
          )
        ) : (
          <div className="tp-waiting">
            <p className="muted">👀 {t("tpSpectateGuess")}</p>
            <TpLockDots a={locks.guess.p1} b={locks.guess.p2} an={p1?.username} bn={p2?.username} />
          </div>
        )}
      </div>
    );
  }

  // ---------- REVEAL / OVER ----------
  else if ((phase === "reveal" || phase === "over") && reveal) {
    const winner = phase === "over" ? (reveal.winnerSlot === "p1" ? p1 : p2) : null;
    const iWon = slot && reveal.winnerSlot === slot;
    content = (
      <div className="tp-round tp-reveal">
        <TpHeader p1={p1} p2={p2} scores={scoreAnim} round={round} target={settings.target} slot={slot} t={t} animated />
        <div className="tp-question"><span className="tp-question-lead">{t("tpPrompt")}</span></div>

        <div className="tp-reveal-grid">
          <RevealSide who={p1} choice={reveal.choices.p1} guessOfOpp={reveal.guesses.p1} oppChoice={reveal.choices.p2}
            right={reveal.right.p1} delta={reveal.deltas.p1} optText={optText} isMe={slot === "p1"} t={t} />
          <RevealSide who={p2} choice={reveal.choices.p2} guessOfOpp={reveal.guesses.p2} oppChoice={reveal.choices.p1}
            right={reveal.right.p2} delta={reveal.deltas.p2} optText={optText} isMe={slot === "p2"} t={t} />
        </div>

        <div className={"tp-match-line" + (reveal.same ? " same" : " diff")}>
          {reveal.same ? "💞 " + t("tpSameChoice") : "🔀 " + t("tpDiffChoice")}
        </div>

        {phase === "over" ? (
          <div className="tp-over">
            <div className={"tp-over-banner" + (iWon && amPlayer() ? " win" : "")}>
              {amPlayer() ? (iWon ? "🏆 " + t("tpYouWin") : "😅 " + t("tpYouLose")) : `🏆 ${winner?.username} ${t("tpWinsSpectator")}`}
            </div>
            <div className="tp-final-score">{p1?.username} {reveal.scores.p1} — {reveal.scores.p2} {p2?.username}</div>
            {isHost ? (
              <div className="tp-btn-row">
                <button className="btn" style={{ width: "auto" }} onClick={rematch}>🔁 {t("tpRematch")}</button>
                <button className="btn ghost" style={{ width: "auto" }} onClick={backToRoom}>🏠 {t("tpBackToRoom")}</button>
              </div>
            ) : <p className="muted">{t("tpWaitHostReplay")}</p>}
          </div>
        ) : (
          <div className="tp-next">
            {isHost ? (
              <button className="btn tp-next-btn" onClick={nextRound}>{t("tpNextRound")} →</button>
            ) : <p className="muted">{t("tpWaitNext")}</p>}
          </div>
        )}
      </div>
    );
  } else {
    content = <p className="muted">{t("tpLoading")}</p>;
  }

  return (
    <div className="panel tp-panel" style={{ maxWidth: "min(880px, 96vw)" }}>
      <h1>{t("tpTitle")}</h1>

      {isHost && (
        <div className="tp-flagbar">
          {inRound && (
            <button type="button" className={"tp-flag-btn" + (isFlagged ? " on" : "")} onClick={toggleFlag} title={t("tpFlagHint")}>
              {isFlagged ? "🚩" : "⚐"}
            </button>
          )}
          <button type="button" className="tp-flag-list-btn" onClick={() => setFlagOpen(o => !o)} title={t("tpFlagListTitle")}>
            🚩 {flagged.length}
          </button>
        </div>
      )}

      <Crossfade id={phase + (reveal ? "-r" : "")}>{content}</Crossfade>

      {isHost && flagOpen && (
        <div className="tp-flag-panel">
          <div className="tp-flag-panel-head">
            <b>🚩 {t("tpFlagListTitle")}</b>
            <button type="button" className="tp-flag-close" onClick={() => setFlagOpen(false)}>✕</button>
          </div>
          {flagged.length === 0 ? (
            <p className="muted" style={{ margin: "10px 0" }}>{t("tpFlagEmpty")}</p>
          ) : (
            <>
              <ul className="tp-flag-ul">
                {flagged.map(f => (
                  <li key={f.id}>
                    <button type="button" className="tp-flag-remove" onClick={() => saveFlagged(flagged.filter(x => x.id !== f.id))} title={t("tpFlagRemove")}>✕</button>
                    <span className="tp-flag-id">{f.id}</span> {f.fr}
                  </li>
                ))}
              </ul>
              <div className="tp-flag-actions">
                <button type="button" className="btn" style={{ width: "auto", marginTop: 0 }} onClick={copyFlags}>{flagCopied ? "✅ " + t("tpFlagCopied") : "📋 " + t("tpFlagCopy")}</button>
                <button type="button" className="btn ghost" style={{ width: "auto", marginTop: 0 }} onClick={clearFlags}>🗑 {t("tpFlagClear")}</button>
              </div>
              <p className="tp-flag-note">{t("tpFlagNote")}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* --------------------------- sous-composants ---------------------------- */
const OPT_COLORS = ["--tp-orange", "--tp-blue"];

// Carte d'option — définie AU NIVEAU MODULE (jamais dans le corps du jeu) :
// une fonction redéfinie à chaque rendu serait vue par React comme un type
// neuf et remonterait les boutons à chaque tick du chrono (toutes les
// 200 ms), ce qui rendait la sélection instable/inopérante. `onPick` est
// appelé AVANT le son, pour qu'un éventuel souci audio ne bloque jamais le
// clic.
function OptionCard({ side, active, disabled, onPick, text }) {
  return (
    <button
      type="button"
      className={"tp-option" + (active ? " active" : "") + (disabled ? " locked" : "")}
      style={{ "--opt": `var(${OPT_COLORS[side]})` }}
      onClick={() => { if (disabled) return; onPick(); try { playGameCardClick(); } catch (e) {} }}
      disabled={disabled}
    >
      <span className="tp-option-letter">{side === 0 ? "A" : "B"}</span>
      <span className="tp-option-text">{text}</span>
    </button>
  );
}

function TpHeader({ p1, p2, scores, round, target, slot, t, animated }) {
  return (
    <div className="tp-header">
      <div className={"tp-player p1" + (slot === "p1" ? " me" : "")}>
        <span className="tp-avatar">{p1?.avatar}</span>
        <span className="tp-name">{p1?.username}</span>
        <span className={"tp-score" + (animated ? " bump" : "")}>{scores.p1}</span>
      </div>
      <div className="tp-round-badge">{t("tpRound")} {round} · 🎯 {target}</div>
      <div className={"tp-player p2" + (slot === "p2" ? " me" : "")}>
        <span className={"tp-score" + (animated ? " bump" : "")}>{scores.p2}</span>
        <span className="tp-name">{p2?.username}</span>
        <span className="tp-avatar">{p2?.avatar}</span>
      </div>
    </div>
  );
}

function TpLockDots({ a, b, an, bn, me }) {
  return (
    <div className="tp-lockdots">
      <span className={"tp-lockdot" + (a ? " on" : "")}>{a ? "🔒" : "⏳"} {an}{me === "p1" ? " (toi)" : ""}</span>
      <span className={"tp-lockdot" + (b ? " on" : "")}>{b ? "🔒" : "⏳"} {bn}{me === "p2" ? " (toi)" : ""}</span>
    </div>
  );
}

function RevealSide({ who, choice, guessOfOpp, oppChoice, right, delta, optText, isMe, t }) {
  const cvar = choice === 0 ? "--tp-orange" : "--tp-blue";
  return (
    <div className={"tp-reveal-side" + (isMe ? " me" : "")}>
      <div className="tp-reveal-head">
        <span className="tp-avatar">{who?.avatar}</span>
        <span className="tp-name">{who?.username}{isMe ? " ·" + t("tpYouTag") : ""}</span>
      </div>
      <div className="tp-reveal-card" style={{ "--opt": `var(${cvar})` }}>
        <span className="tp-option-letter">{choice === 0 ? "A" : "B"}</span>
        <span className="tp-option-text">{optText(choice)}</span>
      </div>
      <div className={"tp-guess-result" + (right ? " ok" : " ko")}>
        {right ? "✅ " + t("tpGuessRight") : "❌ " + t("tpGuessWrong")}
      </div>
      {delta > 0 && <div className="tp-delta">+{delta}</div>}
    </div>
  );
}
