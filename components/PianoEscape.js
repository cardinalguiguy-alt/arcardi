"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ---------- Audio (piano simple, Web Audio) ---------- */
const FREQ = {
  "C4": 261.63, "C#4": 277.18, "D4": 293.66, "D#4": 311.13, "E4": 329.63,
  "F4": 349.23, "F#4": 369.99, "G4": 392.0, "G#4": 415.3, "A4": 440.0,
  "A#4": 466.16, "B4": 493.88, "C5": 523.25
};
let actx = null;
function playNote(name, dur = 0.5) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = "triangle"; o.frequency.value = FREQ[name];
    o.connect(g); g.connect(actx.destination);
    g.gain.setValueAtTime(0.12, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.start(); o.stop(actx.currentTime + dur);
  } catch (e) {}
}
function playFanfare() {
  ["G4", "G4", "G4", "D#4", "F4", "F4", "F4", "D4"].forEach((n, i) =>
    setTimeout(() => playNote(n, i % 4 === 3 ? 1.1 : 0.32), i * 340)
  );
}

/* ---------- Données des épreuves ---------- */
const TARGET_MOTIF = ["G4", "G4", "G4", "D#4"]; // Beethoven, 5e symphonie
const WHITES = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
const BLACKS = { "C4": "C#4", "D4": "D#4", "F4": "F#4", "G4": "G#4", "A4": "A#4" };
const NOTE_LABELS = {
  fr: { "C4": "do", "D4": "ré", "E4": "mi", "F4": "fa", "G4": "sol", "A4": "la", "B4": "si", "C5": "do" },
  en: { "C4": "C", "D4": "D", "E4": "E", "F4": "F", "G4": "G", "A4": "A", "B4": "B", "C5": "C" }
};
const TEMPOS = ["Grave", "Adagio", "Andante", "Allegro", "Presto"]; // ordre correct
const COMPOSERS = [
  { n: "Bach", y: 1685 }, { n: "Mozart", y: 1756 }, { n: "Beethoven", y: 1770 },
  { n: "Chopin", y: 1810 }, { n: "Debussy", y: 1862 }
];
const CODE = "1685";
const DIGITS = ["1", "6", "8", "5"]; // révélé salle par salle

function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

export default function PianoEscape({ room, me, isHost, onFinish, t, lang }) {
  const [stage, setStage] = useState(0);        // 0 intro, 1..5 salles, 6 victoire
  const [solverMsg, setSolverMsg] = useState("");
  const [feedback, setFeedback] = useState("");
  const [showHint, setShowHint] = useState(false);
  const channelRef = useRef(null);
  const myGain = useRef(0);
  const resultSent = useRef(false);

  useEffect(() => {
    const ch = supabase.channel("piano_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "advance" }, async ({ payload }) => {
      setStage(s => Math.max(s, payload.stage));
      setShowHint(false); setFeedback("");
      if (payload.by && payload.byId !== me.id) {
        setSolverMsg(`✨ ${payload.roomName} ${t("peSolvedBy")} ${payload.by} !`);
        setTimeout(() => setSolverMsg(""), 3200);
        // Les non-résolveurs gagnent +1 par salle franchie
        if (payload.stage >= 2 && payload.stage <= 6) {
          myGain.current += 1;
          await supabase.rpc("add_points", { p_room: room.id, p_delta: 1 });
        }
      }
      if (payload.stage === 6) {
        playFanfare();
        if (!resultSent.current) {
          resultSent.current = true;
          try {
            await supabase.from("game_results").insert({
              room_id: room.id, profile_id: me.id, game_id: "piano", points: myGain.current
            });
          } catch (e) {}
        }
      }
    });

    ch.subscribe();
    return () => supabase.removeChannel(ch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  async function solve(currentStage, roomName) {
    // Le résolveur gagne +3 (les autres recevront +1 via le broadcast)
    myGain.current += 3;
    await supabase.rpc("add_points", { p_room: room.id, p_delta: 3 });
    channelRef.current.send({
      type: "broadcast", event: "advance",
      payload: { stage: currentStage + 1, by: me.username, byId: me.id, roomName }
    });
  }
  function enter() {
    channelRef.current.send({ type: "broadcast", event: "advance", payload: { stage: 1 } });
  }
  async function backToLobby() {
    await supabase.from("rooms").update({ status: "lobby", current_game: null }).eq("id", room.id);
    onFinish && onFinish();
  }

  const digitsFound = DIGITS.slice(0, Math.max(0, Math.min(stage - 1, 4)));

  return (
    <div className="panel" style={{ maxWidth: 560 }}>
      <h1>{t("peTitle")}</h1>
      {solverMsg && <p style={{ color: "var(--p3)", fontWeight: 800 }}>{solverMsg}</p>}
      {digitsFound.length > 0 && stage < 6 && (
        <p className="muted" style={{ fontFamily: "'Space Mono'", letterSpacing: "0.2em" }}>
          {t("peCode")} {digitsFound.join(" ")} {Array(4 - digitsFound.length).fill("_").join(" ")}
        </p>
      )}

      {stage === 0 && (
        <>
          <p className="hint">{t("peIntro")}</p>
          <button className="btn" onClick={enter}>{t("peEnter")}</button>
        </>
      )}

      {stage === 1 && <Stage1 t={t} lang={lang} onSolve={() => solve(1, t("peS1Title"))} showHint={showHint} setShowHint={setShowHint} />}
      {stage === 2 && <Stage2 t={t} onSolve={() => solve(2, t("peS2Title"))} showHint={showHint} setShowHint={setShowHint} feedback={feedback} setFeedback={setFeedback} />}
      {stage === 3 && <Stage3 t={t} onSolve={() => solve(3, t("peS3Title"))} showHint={showHint} setShowHint={setShowHint} feedback={feedback} setFeedback={setFeedback} />}
      {stage === 4 && <Stage4 t={t} onSolve={() => solve(4, t("peS4Title"))} showHint={showHint} setShowHint={setShowHint} feedback={feedback} setFeedback={setFeedback} />}
      {stage === 5 && <Stage5 t={t} onSolve={() => solve(5, t("peS5Title"))} showHint={showHint} setShowHint={setShowHint} feedback={feedback} setFeedback={setFeedback} />}

      {stage >= 6 && (
        <>
          <h1 style={{ fontSize: 30 }}>{t("peVictory")}</h1>
          <p className="hint">{t("peVictoryText")}</p>
          <p style={{ fontWeight: 800 }}>{t("peYourGain")} <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>+{myGain.current} {t("pts")}</span></p>
          {isHost
            ? <button className="btn" onClick={backToLobby}>{t("backLounge")}</button>
            : <p className="muted">{t("hostBrings")}</p>}
        </>
      )}
    </div>
  );
}

/* ---------- Salle 1 : le piano ---------- */
function Stage1({ t, lang, onSolve, showHint, setShowHint }) {
  const pressed = useRef([]);
  const solvedRef = useRef(false);
  const [flash, setFlash] = useState(null);

  function press(note) {
    playNote(note);
    setFlash(note); setTimeout(() => setFlash(null), 180);
    pressed.current = [...pressed.current, note].slice(-TARGET_MOTIF.length);
    if (!solvedRef.current && pressed.current.join(",") === TARGET_MOTIF.join(",")) {
      solvedRef.current = true;
      setTimeout(onSolve, 400);
    }
  }

  const labels = NOTE_LABELS[lang] || NOTE_LABELS.fr;
  return (
    <>
      <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("peS1Title")}</h2>
      <p className="hint">{t("peS1Text")}</p>
      <p className="muted" style={{ fontStyle: "italic", marginBottom: 12 }}>{t("peS1Egg")}</p>

      <div style={{ position: "relative", height: 150, display: "flex", userSelect: "none", touchAction: "manipulation" }}>
        {WHITES.map((w) => (
          <button key={w} onClick={() => press(w)}
            style={{
              flex: 1, background: flash === w ? "#ffe9a8" : "#F5F3FF", border: "2px solid #12142A",
              borderRadius: "0 0 8px 8px", position: "relative", color: "#12142A",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
              fontWeight: 800, fontSize: 12, paddingBottom: 6
            }}>
            {labels[w]}
          </button>
        ))}
        {WHITES.map((w, i) => BLACKS[w] ? (
          <button key={BLACKS[w]} onClick={(e) => { e.stopPropagation(); press(BLACKS[w]); }}
            style={{
              position: "absolute", left: `calc(${(i + 1) * 12.5}% - 4.5%)`, top: 0,
              width: "9%", height: "58%", background: flash === BLACKS[w] ? "#5a5470" : "#1a1a2a",
              border: "2px solid #000", borderRadius: "0 0 6px 6px", zIndex: 2
            }} aria-label={BLACKS[w]} />
        ) : null)}
      </div>

      <HintBlock t={t} text={t("peS1Hint")} showHint={showHint} setShowHint={setShowHint} />
    </>
  );
}

/* ---------- Salle 2 : énigme du compositeur ---------- */
function Stage2({ t, onSolve, showHint, setShowHint, feedback, setFeedback }) {
  const [opts] = useState(() => shuffle(["Mozart", "Salieri", "Clara Schumann", "Taylor Swift"]));
  function pick(o) {
    if (o === "Mozart") { onSolve(); return; }
    setFeedback(o === "Taylor Swift" ? t("peS2WrongTS") : t("peS2Wrong"));
  }
  return (
    <>
      <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("peS2Title")}</h2>
      <p className="hint">{t("peS2Text")}</p>
      <div style={{ display: "grid", gap: 10 }}>
        {opts.map(o => (
          <button key={o} className="btn ghost" style={{ margin: 0 }} onClick={() => pick(o)}>{o}</button>
        ))}
      </div>
      {feedback && <p className="err" style={{ marginTop: 12 }}>{feedback}</p>}
      <HintBlock t={t} text={t("peS2Hint")} showHint={showHint} setShowHint={setShowHint} />
    </>
  );
}

/* ---------- Salle 3 : tempos dans l'ordre ---------- */
function Stage3({ t, onSolve, showHint, setShowHint, feedback, setFeedback }) {
  const [display] = useState(() => shuffle(TEMPOS));
  const [picked, setPicked] = useState([]);
  function pick(x) {
    if (picked.includes(x)) return;
    const next = [...picked, x];
    if (TEMPOS[next.length - 1] !== x) {
      setPicked([]); setFeedback(t("peS3Wrong"));
      setTimeout(() => setFeedback(""), 1800);
      return;
    }
    setFeedback("");
    setPicked(next);
    if (next.length === TEMPOS.length) setTimeout(onSolve, 350);
  }
  return (
    <>
      <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("peS3Title")}</h2>
      <p className="hint">{t("peS3Text")}</p>
      <p className="muted" style={{ fontStyle: "italic", marginBottom: 12 }}>{t("peS3Egg")}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {display.map(x => (
          <button key={x} onClick={() => pick(x)}
            className="btn ghost"
            style={{
              margin: 0, width: "auto", padding: "12px 16px",
              borderColor: picked.includes(x) ? "var(--p3)" : "var(--line)",
              color: picked.includes(x) ? "var(--p3)" : "var(--ink)"
            }}>
            {picked.includes(x) ? (picked.indexOf(x) + 1) + ". " : ""}{x}
          </button>
        ))}
      </div>
      {feedback && <p className="err" style={{ marginTop: 12 }}>{feedback}</p>}
      <HintBlock t={t} text={t("peS3Hint")} showHint={showHint} setShowHint={setShowHint} />
    </>
  );
}

/* ---------- Salle 4 : compositeurs par date de naissance ---------- */
function Stage4({ t, onSolve, showHint, setShowHint, feedback, setFeedback }) {
  const [display] = useState(() => shuffle(COMPOSERS.map(c => c.n)));
  const [picked, setPicked] = useState([]);
  const order = COMPOSERS.map(c => c.n);
  function pick(x) {
    if (picked.includes(x)) return;
    const next = [...picked, x];
    if (order[next.length - 1] !== x) {
      setPicked([]); setFeedback(t("peS4Wrong"));
      setTimeout(() => setFeedback(""), 1800);
      return;
    }
    setFeedback("");
    setPicked(next);
    if (next.length === order.length) setTimeout(onSolve, 350);
  }
  return (
    <>
      <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("peS4Title")}</h2>
      <p className="hint">{t("peS4Text")}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {display.map(x => (
          <button key={x} onClick={() => pick(x)}
            className="btn ghost"
            style={{
              margin: 0, width: "auto", padding: "12px 16px",
              borderColor: picked.includes(x) ? "var(--p3)" : "var(--line)",
              color: picked.includes(x) ? "var(--p3)" : "var(--ink)"
            }}>
            {picked.includes(x) ? (picked.indexOf(x) + 1) + ". " : ""}{x}
          </button>
        ))}
      </div>
      {feedback && <p className="err" style={{ marginTop: 12 }}>{feedback}</p>}
      <HintBlock t={t} text={t("peS4Hint")} showHint={showHint} setShowHint={setShowHint} />
    </>
  );
}

/* ---------- Salle 5 : le coffre ---------- */
function Stage5({ t, onSolve, showHint, setShowHint, feedback, setFeedback }) {
  const [code, setCode] = useState("");
  function tryCode(e) {
    e.preventDefault();
    if (code.trim() === CODE) { onSolve(); return; }
    setFeedback(t("peS5Wrong"));
    setCode("");
    setTimeout(() => setFeedback(""), 1800);
  }
  return (
    <>
      <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("peS5Title")}</h2>
      <p className="hint">{t("peS5Text")}</p>
      <form onSubmit={tryCode} style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="text" inputMode="numeric" maxLength={4} value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
          style={{ textAlign: "center", fontFamily: "'Space Mono'", fontSize: 24, letterSpacing: "0.35em", width: 160 }}
          placeholder="• • • •"
        />
        <button className="btn" style={{ margin: 0, width: "auto", padding: "12px 18px" }}>{t("peTry")}</button>
      </form>
      {feedback && <p className="err" style={{ marginTop: 12 }}>{feedback}</p>}
      <HintBlock t={t} text={t("peS5Hint")} showHint={showHint} setShowHint={setShowHint} />
    </>
  );
}

function HintBlock({ t, text, showHint, setShowHint }) {
  return (
    <div style={{ marginTop: 16 }}>
      {!showHint
        ? <button className="btn ghost" style={{ margin: 0, width: "auto", padding: "8px 14px", fontSize: 13 }} onClick={() => setShowHint(true)}>{t("peHint")}</button>
        : <p className="muted" style={{ borderLeft: "3px solid var(--p4)", paddingLeft: 10 }}>{text}</p>}
    </div>
  );
}
