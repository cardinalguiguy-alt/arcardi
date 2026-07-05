"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Petite banque de questions — à enrichir librement.
const QUESTIONS = [
  ["Combien de côtés possède un hexagone ?", "6", "5", "7", "8"],
  ["Quel est le plus grand océan du monde ?", "Le Pacifique", "L'Atlantique", "L'Indien", "L'Arctique"],
  ["Qui a peint la Joconde ?", "Léonard de Vinci", "Michel-Ange", "Raphaël", "Botticelli"],
  ["Quelle est la capitale de l'Australie ?", "Canberra", "Sydney", "Melbourne", "Perth"],
  ["Quelle planète est la plus proche du Soleil ?", "Mercure", "Vénus", "Mars", "La Terre"],
  ["Quel est le plus long fleuve de France ?", "La Loire", "La Seine", "Le Rhône", "La Garonne"],
  ["Quel est le symbole chimique de l'or ?", "Au", "Or", "Ag", "Go"],
  ["Quel pays a offert la statue de la Liberté aux États-Unis ?", "La France", "L'Angleterre", "L'Italie", "L'Espagne"],
];

function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

const ROUND_MS = 12000;
const N_QUESTIONS = 6;

export default function QuizGame({ room, me, isHost, onFinish }) {
  const [deck] = useState(() => shuffle(QUESTIONS).slice(0, N_QUESTIONS));
  const [qIndex, setQIndex] = useState(-1); // -1 = pas encore démarré
  const [choices, setChoices] = useState([]);
  const [deadline, setDeadline] = useState(null);
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const channelRef = useRef(null);
  const answeredRef = useRef(new Set());

  useEffect(() => {
    const ch = supabase.channel("quiz_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "question" }, ({ payload }) => {
      setQIndex(payload.index);
      setChoices(payload.choices);
      setDeadline(payload.deadline);
      setPicked(null);
      setRevealed(false);
      answeredRef.current = new Set();
    });

    ch.on("broadcast", { event: "reveal" }, ({ payload }) => {
      setRevealed(true);
      setChoices(c => c.map(x => ({ ...x, isGood: x.text === payload.good })));
    });

    ch.on("broadcast", { event: "finished" }, () => {
      onFinish && onFinish();
    });

    ch.subscribe();
    return () => supabase.removeChannel(ch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  // Compte à rebours visuel, basé sur le "deadline" partagé par l'hôte
  useEffect(() => {
    if (!deadline) return;
    const iv = setInterval(() => {
      const left = Math.max(0, deadline - Date.now());
      setTimeLeft(left);
      if (left <= 0) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, [deadline]);

  function sendQuestion(index) {
    const item = deck[index];
    const good = item[1];
    const opts = shuffle(item.slice(1)).map(text => ({ text }));
    const deadline = Date.now() + ROUND_MS;
    channelRef.current.send({ type: "broadcast", event: "question", payload: { index, choices: opts, deadline, good } });
    setTimeout(() => {
      channelRef.current.send({ type: "broadcast", event: "reveal", payload: { good } });
      setTimeout(() => {
        if (index + 1 < deck.length) sendQuestion(index + 1);
        else finishGame();
      }, 2200);
    }, ROUND_MS);
  }

  async function finishGame() {
    channelRef.current.send({ type: "broadcast", event: "finished", payload: {} });
    await supabase.from("rooms").update({ status: "lobby", current_game: null }).eq("id", room.id);
  }

  async function pick(choice) {
    if (picked || revealed) return;
    setPicked(choice.text);
    const good = deck[qIndex][1];
    if (choice.text === good) {
      const gained = 2;
      const { data: row } = await supabase.from("room_players").select("score").eq("room_id", room.id).eq("profile_id", me.id).single();
      await supabase.from("room_players").update({ score: (row?.score || 0) + gained }).eq("room_id", room.id).eq("profile_id", me.id);
    }
  }

  const started = qIndex >= 0;

  return (
    <div className="panel">
      <h1>🧠 Quiz Éclair</h1>
      {!started && isHost && (
        <>
          <p className="hint">{N_QUESTIONS} questions, tout le monde répond en même temps sur son écran. Bonne réponse = +2 points.</p>
          <button className="btn" onClick={() => sendQuestion(0)}>▶️ Démarrer</button>
        </>
      )}
      {!started && !isHost && <p className="muted">En attente que l'hôte démarre le quiz…</p>}

      {started && (
        <>
          <p className="muted">Question {qIndex + 1} / {deck.length}</p>
          <div className="timerbar-wrap" style={{ height: 8, background: "rgba(255,255,255,.08)", borderRadius: 99, overflow: "hidden", margin: "10px 0 16px" }}>
            <div style={{ height: "100%", width: (timeLeft / ROUND_MS * 100) + "%", background: "linear-gradient(90deg,var(--p3),var(--p1))", transition: "width .1s linear" }} />
          </div>
          <p style={{ fontWeight: 800, fontSize: 18, marginBottom: 14 }}>{deck[qIndex][0]}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {choices.map((c, i) => {
              let bg = "rgba(255,255,255,.05)", border = "var(--line)", color = "var(--ink)";
              if (revealed && c.isGood) { bg = "rgba(182,240,76,.18)"; border = "var(--p3)"; color = "var(--p3)"; }
              else if (revealed && picked === c.text) { bg = "rgba(255,93,115,.15)"; border = "var(--p1)"; color = "var(--p1)"; }
              else if (picked === c.text) { border = "var(--p2)"; }
              return (
                <button key={i} disabled={!!picked || revealed} onClick={() => pick(c)}
                  style={{ padding: "14px 10px", borderRadius: 12, border: `2.5px solid ${border}`, background: bg, color, fontWeight: 800 }}>
                  {c.text}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
