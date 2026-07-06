"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Crossfade from "./Crossfade";

/* ==========================================================================
   ÉCHOS — escape room coopératif ASYMÉTRIQUE à 2 joueurs (pattern réseau n°3)
   ==========================================================================
   Contrairement aux jeux "état partagé" (Quiz, Mot Mystère, Worldle) et aux
   jeux de plateau "arbitrés par l'hôte" (Puissance 4, Petits Chevaux), ce jeu
   n'a ni état unique affiché à tous, ni arbitre : chaque rôle (A / B) a sa
   PROPRE vue sur chaque énigme, jamais la même que l'autre. La seule vérité
   partagée est un petit historique d'événements (broadcast, self:true) que
   les deux clients appliquent chacun de leur côté, de façon idempotente :
     - "match_start" : l'hôte génère la partie ENTIÈRE (rôles + énigmes des
       5 chapitres + horodatage de fin) et l'envoie une fois pour toutes.
       Les deux clients adoptent exactement les mêmes données ; seul le
       RENDU diffère ensuite selon le rôle (A voit un indice, B voit le
       verrou, ou l'inverse) — aucune re-génération locale, donc aucun
       risque de désynchronisation.
     - "advance" : diffusé par le joueur qui vient de résoudre SON étape (il
       a vérifié la solution localement, comme dans Piano Escape Room) ;
       les deux clients avancent au chapitre suivant.
     - "penalty" : une mauvaise tentative réduit l'horodatage de fin partagé
       (jamais localement — toujours par diffusion — pour que le compte à
       rebours affiché reste identique des deux côtés).
     - "press_a" / "press_b" : le levier final. Aucun arbitre nécessaire :
       les DEUX clients reçoivent les deux horodatages (self:true) et
       calculent chacun de leur côté si la synchronisation est assez bonne.
   Ce pattern convient à un jeu coopératif (pas de conflit à trancher entre
   deux joueurs) ; il ne remplace pas le pattern n°2 pour les jeux de
   plateau à somme nulle, où l'arbitrage par l'hôte reste nécessaire.
   ========================================================================== */

const TOTAL_MS = 15 * 60 * 1000;   // 15 minutes pour les 5 chapitres
const PENALTY_MS = 20 * 1000;      // -20s par mauvaise tentative
const DIAL_PERIOD_MS = 4200;       // durée d'un tour complet de l'aiguille (chapitre 3)
const SYNC_WINDOW_MS = 900;        // fenêtre de synchronisation du levier final (chapitre 5)
const BASE_POINTS = 12;
const MAX_BONUS = 8;

const COLOR_EMOJIS = ["🔴", "🔵", "🟢", "🟡", "🟣", "🟠"];
const CIPHER_SYMBOLS = ["▲", "●", "■", "♦", "★", "✚", "◆", "▼", "♣", "☾"];
const SECRET_WORDS = {
  fr: ["PHARE", "VAGUE", "ORAGE", "VOILE", "MAREE", "ECUME", "RECIF", "FANAL", "ROCHE", "BRUME", "ALGUE", "NUAGE"],
  en: ["STORM", "WAVES", "OCEAN", "LIGHT", "CLIFF", "REEFS", "ROCKS", "SHORE", "TIDES", "FLARE"],
};

function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

/* ---------- Génération des 5 énigmes (données pures, indépendantes du rendu) ---------- */

function genChapter1() {
  const colors = shuffle(COLOR_EMOJIS).slice(0, 4);
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4);
  const legend = colors.map((c, i) => ({ emoji: c, digit: digits[i] }));
  const sequence = Array.from({ length: 4 }, () => pickRandom(colors));
  const solution = sequence.map(c => String(legend.find(l => l.emoji === c).digit)).join("");
  return { legend, sequence, solution };
}

function genChapter2() {
  const ops = [
    { type: "mult", n: 2 }, { type: "mult", n: 3 },
    { type: "add", n: randInt(3, 15) }, { type: "sub", n: randInt(2, 8) }
  ];
  const gears = ["A", "B", "C"].map(label => {
    const base = randInt(10, 30);
    const op = pickRandom(ops);
    const value = op.type === "mult" ? base * op.n : op.type === "add" ? base + op.n : base - op.n;
    const opText = op.type === "mult" ? `× ${op.n}` : op.type === "add" ? `+ ${op.n}` : `− ${op.n}`;
    return { label, base, opText, value };
  });
  const pairIdx = shuffle([0, 1, 2]).slice(0, 2).sort();
  const target = gears[pairIdx[0]].value + gears[pairIdx[1]].value;
  return { gears, target, correctPair: [gears[pairIdx[0]].label, gears[pairIdx[1]].label].sort() };
}

function genChapter3() {
  const size = 40;
  const start = randInt(0, 319);
  return { start, end: start + size };
}

function genChapter4(lang) {
  const bank = lang === "en" ? SECRET_WORDS.en : SECRET_WORDS.fr;
  const word = pickRandom(bank);
  const letters = [...new Set(word.split(""))];
  const symbolsPool = shuffle(CIPHER_SYMBOLS).slice(0, letters.length);
  const letterToSymbol = {};
  letters.forEach((l, i) => { letterToSymbol[l] = symbolsPool[i]; });
  const encoded = word.split("").map(l => letterToSymbol[l]);
  const legend = letters.map(l => ({ symbol: letterToSymbol[l], letter: l }));
  return { word, legend, encoded };
}

/* ---------- Sous-composants d'affichage (chacun ne voit que SA moitié) ---------- */

function LegendView({ legend }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "14px 0" }}>
      {legend.map(l => (
        <div key={l.emoji} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 700 }}>
          <span style={{ fontSize: 22 }}>{l.emoji}</span><span className="muted">=</span>
          <span style={{ fontFamily: "'Space Mono'", color: "var(--p3)", fontSize: 18 }}>{l.digit}</span>
        </div>
      ))}
    </div>
  );
}

function LockInput({ sequence, onSubmit, t }) {
  const [code, setCode] = useState("");
  return (
    <div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", fontSize: 30, margin: "14px 0" }}>
        {sequence.map((e, i) => <span key={i}>{e}</span>)}
      </div>
      <form onSubmit={e => { e.preventDefault(); onSubmit(code); setCode(""); }}
        style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center" }}>
        <input type="text" inputMode="numeric" maxLength={4} value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
          style={{ textAlign: "center", fontFamily: "'Space Mono'", fontSize: 22, letterSpacing: "0.3em", width: 140 }}
          placeholder="••••" />
        <button className="btn" style={{ margin: 0, width: "auto", padding: "12px 18px" }}>{t("echoesCh1Enter")}</button>
      </form>
    </div>
  );
}

function GearInfo({ gears }) {
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center", margin: "14px 0", flexWrap: "wrap" }}>
      {gears.map(g => (
        <div key={g.label} className="echo-gear-chip" style={{ cursor: "default" }}>
          <span className="letter">{g.label}</span>
          <span style={{ fontFamily: "'Space Mono'", fontSize: 15 }}>{g.base} {g.opText}</span>
        </div>
      ))}
    </div>
  );
}

function GearPicker({ onConfirm, t }) {
  const [picked, setPicked] = useState([]);
  function toggle(label) {
    setPicked(prev => {
      if (prev.includes(label)) return prev.filter(x => x !== label);
      if (prev.length >= 2) return prev;
      return [...prev, label];
    });
  }
  return (
    <div>
      <p className="hint">{t("echoesCh2Pick")}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", margin: "14px 0" }}>
        {["A", "B", "C"].map(label => (
          <div key={label} className={"echo-gear-chip" + (picked.includes(label) ? " picked" : "")} onClick={() => toggle(label)}>
            <span className="letter">{label}</span>
            <span style={{ fontSize: 20 }}>⚙️</span>
          </div>
        ))}
      </div>
      <button className="btn" disabled={picked.length !== 2} onClick={() => onConfirm(picked)}>{t("echoesCh2Confirm")}</button>
    </div>
  );
}

function ZoneClue({ start, end, t }) {
  return (
    <p className="hint" style={{ fontSize: 16, fontWeight: 700, textAlign: "center" }}>
      {t("echoesCh3ZonePrefix")}{" "}
      <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>{start}°</span>{" "}
      {t("echoesCh3ZoneJoin")}{" "}
      <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>{end}°</span>
    </p>
  );
}

function DialStopper({ period, onStop, t }) {
  const needleRef = useRef(null);
  const startRef = useRef(Date.now());
  const rafRef = useRef(null);

  useEffect(() => {
    function tick() {
      const elapsed = (Date.now() - startRef.current) % period;
      const angle = (elapsed / period) * 360;
      if (needleRef.current) needleRef.current.style.transform = `rotate(${angle}deg)`;
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [period]);

  function stop() {
    const elapsed = (Date.now() - startRef.current) % period;
    onStop((elapsed / period) * 360);
  }

  return (
    <div>
      <div className="echo-dial-wrap">
        <div className="echo-dial-needle" ref={needleRef} />
        <div className="echo-dial-center" />
      </div>
      <div style={{ textAlign: "center" }}>
        <button className="btn" style={{ width: "auto", padding: "12px 28px" }} onClick={stop}>{t("echoesCh3Stop")}</button>
      </div>
    </div>
  );
}

function CipherLegend({ legend }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "14px 0" }}>
      {legend.map(l => (
        <div key={l.symbol} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 700 }}>
          <span className="echo-cipher-symbol">{l.symbol}</span><span className="muted">=</span>
          <span style={{ color: "var(--p3)", fontSize: 18 }}>{l.letter}</span>
        </div>
      ))}
    </div>
  );
}

function EncodedMessage({ encoded }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", margin: "14px 0" }}>
      {encoded.map((s, i) => <span key={i} className="echo-cipher-symbol">{s}</span>)}
    </div>
  );
}

function CipherEntry({ onSubmit, t, length }) {
  const [word, setWord] = useState("");
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(word); setWord(""); }}
      style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center", marginTop: 10 }}>
      <input type="text" maxLength={length} value={word}
        onChange={e => setWord(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
        style={{ textAlign: "center", fontFamily: "'Space Mono'", fontSize: 20, letterSpacing: "0.22em", width: 160 }}
        placeholder={"?".repeat(length)} />
      <button className="btn" style={{ margin: 0, width: "auto", padding: "12px 18px" }}>{t("echoesCh4Enter")}</button>
    </form>
  );
}

function LeverButton({ onPress, pressed, t }) {
  return (
    <div style={{ marginTop: 14 }}>
      <button className="echo-lever-btn" disabled={pressed} onClick={onPress}>
        {pressed ? t("echoesCh5Pulled") : t("echoesCh5Lever")}
      </button>
    </div>
  );
}

/* ---------- Composant principal ---------- */

export default function EchoesRoom({ room, me, isHost, players, t, lang, onFinish }) {
  const [phase, setPhase] = useState("intro"); // intro -> playing -> success | failure
  const [roles, setRoles] = useState({ A: null, B: null });
  const [puzzle, setPuzzle] = useState(null);
  const [chapter, setChapter] = useState(1); // 1..5, 6 = victoire
  const [deadline, setDeadline] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TOTAL_MS);
  const [feedback, setFeedback] = useState("");
  const [wrongShake, setWrongShake] = useState(false);
  const [selected, setSelected] = useState([]);
  const [channelReady, setChannelReady] = useState(false);
  const [myGain, setMyGain] = useState(0);
  const [pressA, setPressA] = useState(null);
  const [pressB, setPressB] = useState(null);
  const [myPressed, setMyPressed] = useState(false);

  const channelRef = useRef(null);
  // Miroir toujours à jour pour les handlers de broadcast (évite les closures figées).
  const stateRef = useRef({ chapter, deadline, phase });
  const autoStartedRef = useRef(false);
  const savedResultRef = useRef(false);
  const feedbackTimers = useRef([]);

  useEffect(() => { stateRef.current = { chapter, deadline, phase }; }, [chapter, deadline, phase]);

  useEffect(() => {
    const ch = supabase.channel("echoes_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "match_start" }, ({ payload }) => {
      setRoles({ A: payload.roleA, B: payload.roleB });
      setPuzzle({ ch1: payload.ch1, ch2: payload.ch2, ch3: payload.ch3, ch4: payload.ch4 });
      setDeadline(payload.deadline);
      setChapter(1);
      setPhase("playing");
      setFeedback("");
      setSelected([]);
      setPressA(null); setPressB(null); setMyPressed(false);
      setMyGain(0);
      savedResultRef.current = false;
    });

    ch.on("broadcast", { event: "advance" }, ({ payload }) => {
      setChapter(c => Math.max(c, payload.chapter));
      setFeedback("");
      setPressA(null); setPressB(null); setMyPressed(false);
      if (payload.chapter >= 6) setPhase("success");
    });

    ch.on("broadcast", { event: "penalty" }, ({ payload }) => {
      setDeadline(d => (d == null ? payload.newDeadline : Math.min(d, payload.newDeadline)));
      setFeedback(t("echoesWrong") + " " + t("echoesPenalty"));
      setWrongShake(true);
      feedbackTimers.current.push(setTimeout(() => setWrongShake(false), 400));
      feedbackTimers.current.push(setTimeout(() => setFeedback(""), 2400));
    });

    ch.on("broadcast", { event: "press_a" }, ({ payload }) => setPressA(payload.ts));
    ch.on("broadcast", { event: "press_b" }, ({ payload }) => setPressB(payload.ts));
    ch.on("broadcast", { event: "sync_fail" }, () => {
      setPressA(null); setPressB(null); setMyPressed(false);
      setFeedback(t("echoesCh5Fail"));
      feedbackTimers.current.push(setTimeout(() => setFeedback(""), 2400));
    });

    ch.on("broadcast", { event: "timeout" }, () => {
      setPhase(p => (p === "playing" ? "failure" : p));
    });

    ch.subscribe(status => { if (status === "SUBSCRIBED") setChannelReady(true); });

    return () => {
      feedbackTimers.current.forEach(clearTimeout);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  function startMatch(pRow1, pRow2) {
    const pa = { id: pRow1.profile_id, username: pRow1.profiles?.username, avatar: pRow1.profiles?.avatar };
    const pb = { id: pRow2.profile_id, username: pRow2.profiles?.username, avatar: pRow2.profiles?.avatar };
    const [roleA, roleB] = Math.random() < 0.5 ? [pa, pb] : [pb, pa];
    const payload = {
      roleA, roleB,
      ch1: genChapter1(), ch2: genChapter2(), ch3: genChapter3(), ch4: genChapter4(lang),
      deadline: Date.now() + TOTAL_MS,
    };
    channelRef.current.send({ type: "broadcast", event: "match_start", payload });
  }

  // Si le salon compte exactement 2 joueurs, l'hôte démarre tout seul (même
  // convention que Puissance 4 / Petits Chevaux).
  useEffect(() => {
    if (!isHost || phase !== "intro" || autoStartedRef.current || !channelReady) return;
    if (players.length === 2) {
      autoStartedRef.current = true;
      startMatch(players[0], players[1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, channelReady, players.length]);

  function toggleSelect(pid) {
    setSelected(prev => {
      if (prev.includes(pid)) return prev.filter(x => x !== pid);
      if (prev.length >= 2) return prev;
      return [...prev, pid];
    });
  }
  function confirmPick() {
    if (selected.length !== 2 || !channelReady) return;
    const chosen = selected.map(pid => players.find(p => p.profile_id === pid)).filter(Boolean);
    if (chosen.length !== 2) return;
    startMatch(chosen[0], chosen[1]);
  }

  // Timer local recalculé à partir de l'horodatage partagé (comme Quiz/Mot Mystère).
  useEffect(() => {
    if (!deadline || phase !== "playing") return;
    const iv = setInterval(() => {
      setTimeLeft(Math.max(0, deadline - Date.now()));
    }, 200);
    return () => clearInterval(iv);
  }, [deadline, phase]);

  // Détection de la fin du temps imparti : n'importe quel client peut la
  // déclencher, la réception est idempotente (garde sur phase==="playing").
  useEffect(() => {
    if (phase !== "playing" || !deadline) return;
    const ms = Math.max(0, deadline - Date.now());
    const tm = setTimeout(() => {
      const s = stateRef.current;
      if (s.phase === "playing" && s.chapter < 6) {
        channelRef.current?.send({ type: "broadcast", event: "timeout", payload: {} });
      }
    }, ms + 60);
    return () => clearTimeout(tm);
  }, [deadline, phase]);

  function applyPenalty() {
    const s = stateRef.current;
    const newDeadline = (s.deadline || Date.now()) - PENALTY_MS;
    channelRef.current?.send({ type: "broadcast", event: "penalty", payload: { newDeadline } });
  }
  function advance(toChapter) {
    channelRef.current?.send({ type: "broadcast", event: "advance", payload: { chapter: toChapter } });
  }

  function tryChapter1(code) { code === puzzle.ch1.solution ? advance(2) : applyPenalty(); }
  function tryChapter2(pair) {
    const sorted = pair.slice().sort();
    (sorted[0] === puzzle.ch2.correctPair[0] && sorted[1] === puzzle.ch2.correctPair[1]) ? advance(3) : applyPenalty();
  }
  function tryChapter3(angle) {
    const { start, end } = puzzle.ch3;
    (angle >= start && angle <= end) ? advance(4) : applyPenalty();
  }
  function tryChapter4(word) { word.toUpperCase() === puzzle.ch4.word ? advance(5) : applyPenalty(); }

  function pressLever(role) {
    if (myPressed) return;
    setMyPressed(true);
    channelRef.current?.send({ type: "broadcast", event: role === "A" ? "press_a" : "press_b", payload: { ts: Date.now() } });
  }

  // Dès que les deux estampilles de pression sont connues (self:true : les
  // DEUX clients les reçoivent), chacun calcule la synchro de son côté.
  useEffect(() => {
    if (pressA == null || pressB == null) return;
    if (Math.abs(pressA - pressB) <= SYNC_WINDOW_MS) advance(6);
    else channelRef.current?.send({ type: "broadcast", event: "sync_fail", payload: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pressA, pressB]);

  // Écriture du résultat (une fois), points partagés entre les 2 joueurs.
  useEffect(() => {
    if ((phase !== "success" && phase !== "failure") || savedResultRef.current) return;
    const amA = roles.A && me.id === roles.A.id;
    const amB = roles.B && me.id === roles.B.id;
    if (!amA && !amB) return;
    savedResultRef.current = true;
    const gain = phase === "success"
      ? BASE_POINTS + Math.min(MAX_BONUS, Math.floor(timeLeft / 30000))
      : 2 * Math.max(0, chapter - 1);
    setMyGain(gain);
    (async () => {
      try {
        await supabase.from("game_results").insert({ room_id: room.id, profile_id: me.id, game_id: "echoes", points: gain });
        if (gain > 0) await supabase.rpc("add_points", { p_room: room.id, p_delta: gain });
      } catch (e) {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function backToLobby() {
    await supabase.from("rooms").update({ status: "lobby", current_game: null }).eq("id", room.id);
    onFinish && onFinish();
  }

  const amA = !!(roles.A && me.id === roles.A.id);
  const amB = !!(roles.B && me.id === roles.B.id);
  const isPlayer = amA || amB;
  const needsPick = players.length > 2;

  function renderChapterContent() {
    if (!puzzle) return null;
    if (chapter === 1) return (
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("echoesCh1Title")}</h2>
        <p className="hint">{t("echoesCh1Story")}</p>
        {!isPlayer ? <p className="muted">{t("echoesSpectatorNote")}</p> : amA ? (
          <><p className="muted">{t("echoesCh1TextA")}</p><LegendView legend={puzzle.ch1.legend} /></>
        ) : (
          <><p className="muted">{t("echoesCh1TextB")}</p><LockInput sequence={puzzle.ch1.sequence} onSubmit={tryChapter1} t={t} /></>
        )}
      </div>
    );
    if (chapter === 2) return (
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("echoesCh2Title")}</h2>
        <p className="hint">{t("echoesCh2Story")}</p>
        {!isPlayer ? <p className="muted">{t("echoesSpectatorNote")}</p> : amA ? (
          <>
            <p className="muted">{t("echoesCh2TextA")}</p>
            <p style={{ textAlign: "center", fontWeight: 800, fontSize: 22, margin: "10px 0" }}>
              🎯 <span style={{ fontFamily: "'Space Mono'", color: "var(--p3)" }}>{puzzle.ch2.target}</span>
            </p>
            <GearPicker onConfirm={tryChapter2} t={t} />
          </>
        ) : (
          <><p className="muted">{t("echoesCh2TextB")}</p><GearInfo gears={puzzle.ch2.gears} /></>
        )}
      </div>
    );
    if (chapter === 3) return (
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("echoesCh3Title")}</h2>
        <p className="hint">{t("echoesCh3Story")}</p>
        {!isPlayer ? <p className="muted">{t("echoesSpectatorNote")}</p> : amA ? (
          <><p className="muted">{t("echoesCh3TextA")}</p><ZoneClue start={puzzle.ch3.start} end={puzzle.ch3.end} t={t} /></>
        ) : (
          <><p className="muted">{t("echoesCh3TextB")}</p><DialStopper period={DIAL_PERIOD_MS} onStop={tryChapter3} t={t} /></>
        )}
      </div>
    );
    if (chapter === 4) return (
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("echoesCh4Title")}</h2>
        <p className="hint">{t("echoesCh4Story")}</p>
        {!isPlayer ? <p className="muted">{t("echoesSpectatorNote")}</p> : amA ? (
          <>
            <p className="muted">{t("echoesCh4TextA")}</p>
            <CipherLegend legend={puzzle.ch4.legend} />
            <CipherEntry onSubmit={tryChapter4} t={t} length={puzzle.ch4.word.length} />
          </>
        ) : (
          <><p className="muted">{t("echoesCh4TextB")}</p><EncodedMessage encoded={puzzle.ch4.encoded} /></>
        )}
      </div>
    );
    if (chapter === 5) return (
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("echoesCh5Title")}</h2>
        <p className="hint">{t("echoesCh5Story")}</p>
        {!isPlayer ? <p className="muted">{t("echoesSpectatorNote")}</p> :
          <LeverButton onPress={() => pressLever(amA ? "A" : "B")} pressed={myPressed} t={t} />}
      </div>
    );
    return null;
  }

  return (
    <div className="panel" style={{ maxWidth: 560 }}>
      <h1>{t("echoesTitle")}</h1>

      {phase === "playing" && (
        <>
          {isPlayer && <div className="echo-role-badge">🗼 {amA ? t("echoesRoleA") : t("echoesRoleB")}</div>}
          <div className="echo-timerbar">
            <div className="echo-timerbar-fill" style={{
              width: (timeLeft / TOTAL_MS * 100) + "%",
              background: timeLeft < 60000 ? "var(--p1)" : timeLeft < TOTAL_MS * 0.35 ? "var(--p4)" : "linear-gradient(90deg,var(--p3),var(--p2))"
            }} />
          </div>
          <div style={{ display: "flex", gap: 6, margin: "0 0 12px" }}>
            {[1, 2, 3, 4, 5].map(n => <div key={n} className={"progress-dot" + (chapter > n ? " done" : "")} />)}
          </div>
          <div className="echo-comm-banner">{t("echoesCommunicate")}</div>
        </>
      )}

      {feedback && (
        <p className="err" style={{ marginBottom: 10, animation: wrongShake ? "shakeRow .4s" : "none" }}>{feedback}</p>
      )}

      <Crossfade id={phase === "playing" ? "ch" + chapter : phase}>
        {phase === "intro" && (
          players.length < 2 ? <p className="muted">{t("echoesNotEnough")}</p>
          : !needsPick ? <p className="muted">{t("echoesStarting")}</p>
          : isHost ? (
            <div>
              <p className="hint">{t("echoesPickHint")}</p>
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
              <button className="btn" disabled={selected.length !== 2} onClick={confirmPick}>{t("echoesPickConfirm")}</button>
            </div>
          ) : <p className="muted">{t("echoesWaitPick")}</p>
        )}

        {phase === "playing" && (
          <div>
            <p className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 2 }}>
              {t("echoesChapterLabel")} {Math.min(chapter, 5)}/5
            </p>
            {renderChapterContent()}
          </div>
        )}

        {phase === "success" && (
          <div>
            <h2 style={{ fontSize: 22 }}>{t("echoesSuccessTitle")}</h2>
            <p className="hint">{t("echoesSuccessText")}</p>
            {isPlayer && (
              <p style={{ fontWeight: 800 }}>
                {t("peYourGain")} <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>+{myGain} {t("pts")}</span>
              </p>
            )}
            {isHost ? <button className="btn" onClick={backToLobby}>{t("backLounge")}</button> : <p className="muted">{t("hostBrings")}</p>}
          </div>
        )}

        {phase === "failure" && (
          <div>
            <h2 style={{ fontSize: 22 }}>{t("echoesFailureTitle")}</h2>
            <p className="hint">{t("echoesFailureText")}</p>
            {isPlayer && (
              <p style={{ fontWeight: 800 }}>
                {t("peYourGain")} <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>+{myGain} {t("pts")}</span>
              </p>
            )}
            {isHost ? <button className="btn" onClick={backToLobby}>{t("backLounge")}</button> : <p className="muted">{t("hostBrings")}</p>}
          </div>
        )}
      </Crossfade>
    </div>
  );
}
