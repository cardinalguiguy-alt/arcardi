"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const QUESTIONS_FR = [
  ["Combien de côtés possède un hexagone ?", "6", "5", "7", "8"],
  ["Quel est le plus grand océan du monde ?", "Le Pacifique", "L'Atlantique", "L'Indien", "L'Arctique"],
  ["Qui a peint la Joconde ?", "Léonard de Vinci", "Michel-Ange", "Raphaël", "Botticelli"],
  ["Quelle est la capitale de l'Australie ?", "Canberra", "Sydney", "Melbourne", "Perth"],
  ["Quelle planète est la plus proche du Soleil ?", "Mercure", "Vénus", "Mars", "La Terre"],
  ["Quel est le plus long fleuve de France ?", "La Loire", "La Seine", "Le Rhône", "La Garonne"],
  ["Quel est le symbole chimique de l'or ?", "Au", "Or", "Ag", "Go"],
  ["Quel pays a offert la statue de la Liberté aux États-Unis ?", "La France", "L'Angleterre", "L'Italie", "L'Espagne"],
  ["Combien de cordes possède un violon ?", "4", "6", "5", "3"],
  ["Quelle est la plus haute montagne du monde ?", "L'Everest", "Le K2", "Le Mont Blanc", "Le Kilimandjaro"],
  ["Qui a composé la 9e symphonie « Ode à la joie » ?", "Beethoven", "Mozart", "Bach", "Chopin"],
  ["Combien de pattes possède une araignée ?", "8", "6", "10", "12"],
];
const QUESTIONS_EN = [
  ["How many sides does a hexagon have?", "6", "5", "7", "8"],
  ["What is the largest ocean in the world?", "The Pacific", "The Atlantic", "The Indian", "The Arctic"],
  ["Who painted the Mona Lisa?", "Leonardo da Vinci", "Michelangelo", "Raphael", "Botticelli"],
  ["What is the capital of Australia?", "Canberra", "Sydney", "Melbourne", "Perth"],
  ["Which planet is closest to the Sun?", "Mercury", "Venus", "Mars", "Earth"],
  ["What is the chemical symbol for gold?", "Au", "Or", "Ag", "Go"],
  ["Which country gave the Statue of Liberty to the USA?", "France", "England", "Italy", "Spain"],
  ["How many strings does a violin have?", "4", "6", "5", "3"],
  ["What is the highest mountain in the world?", "Everest", "K2", "Mont Blanc", "Kilimanjaro"],
  ["Who composed the 9th symphony “Ode to Joy”?", "Beethoven", "Mozart", "Bach", "Chopin"],
  ["How many legs does a spider have?", "8", "6", "10", "12"],
  ["What is the longest river in France?", "The Loire", "The Seine", "The Rhône", "The Garonne"],
];

function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

const ROUND_MS = 12000;
const N_QUESTIONS = 6;

export default function QuizGame({ room, me, isHost, onFinish, t, lang }) {
  // Le paquet n'existe QUE chez l'hôte : les autres reçoivent tout par broadcast.
  const deckRef = useRef(null);
  const [q, setQ] = useState(null);          // { index, text, choices[], good }
  const [deadline, setDeadline] = useState(null);
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);
  const [finished, setFinished] = useState(false);
  const channelRef = useRef(null);
  const myGain = useRef(0);
  const timeouts = useRef([]);

  useEffect(() => {
    const ch = supabase.channel("quiz_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "question" }, ({ payload }) => {
      setQ(payload);
      setDeadline(Date.now() + payload.remaining);
      setPicked(null);
      setRevealed(false);
    });
    ch.on("broadcast", { event: "reveal" }, () => setRevealed(true));
    ch.on("broadcast", { event: "finished" }, async () => {
      setFinished(true);
      // Chaque joueur enregistre SON résultat (RLS : on ne peut écrire que le sien).
      try {
        await supabase.from("game_results").insert({
          room_id: room.id, profile_id: me.id, game_id: "quiz", points: myGain.current
        });
      } catch (e) {}
    });

    ch.subscribe();
    return () => {
      timeouts.current.forEach(clearTimeout);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  useEffect(() => {
    if (!deadline) return;
    const iv = setInterval(() => {
      const left = Math.max(0, deadline - Date.now());
      setTimeLeft(left);
      if (left <= 0) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, [deadline]);

  function hostStart() {
    deckRef.current = shuffle(lang === "en" ? QUESTIONS_EN : QUESTIONS_FR).slice(0, N_QUESTIONS);
    hostSend(0);
  }

  function hostSend(index) {
    const item = deckRef.current[index];
    const payload = {
      index,
      total: deckRef.current.length,
      text: item[0],
      good: item[1],
      choices: shuffle(item.slice(1)),
      remaining: ROUND_MS
    };
    channelRef.current.send({ type: "broadcast", event: "question", payload });
    timeouts.current.push(setTimeout(() => {
      channelRef.current.send({ type: "broadcast", event: "reveal", payload: {} });
      timeouts.current.push(setTimeout(() => {
        if (index + 1 < deckRef.current.length) hostSend(index + 1);
        else hostFinish();
      }, 2400));
    }, ROUND_MS));
  }

  async function hostFinish() {
    channelRef.current.send({ type: "broadcast", event: "finished", payload: {} });
    timeouts.current.push(setTimeout(async () => {
      await supabase.from("rooms").update({ status: "lobby", current_game: null }).eq("id", room.id);
      onFinish && onFinish();
    }, 3000));
  }

  async function pick(text) {
    if (picked || revealed || !q) return;
    setPicked(text);
    if (text === q.good) {
      myGain.current += 2;
      // RPC atomique : pas d'écrasement de score en cas de réponses simultanées.
      await supabase.rpc("add_points", { p_room: room.id, p_delta: 2 });
    }
  }

  if (finished) {
    return (
      <div className="panel">
        <h1>{t("quizTitle")}</h1>
        <p className="hint">{t("quizDone")}</p>
        <p style={{ fontWeight: 800 }}>{t("peYourGain")} <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>+{myGain.current} {t("pts")}</span></p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h1>{t("quizTitle")}</h1>
      {!q && isHost && (
        <>
          <p className="hint">{N_QUESTIONS} {t("quizIntro")}</p>
          <button className="btn" onClick={hostStart}>{t("start")}</button>
        </>
      )}
      {!q && !isHost && <p className="muted">{t("waitStart")}</p>}

      {q && (
        <>
          <p className="muted">{t("question")} {q.index + 1} / {q.total}</p>
          <div style={{ height: 8, background: "rgba(255,255,255,.08)", borderRadius: 99, overflow: "hidden", margin: "10px 0 16px" }}>
            <div style={{ height: "100%", width: (timeLeft / ROUND_MS * 100) + "%", background: "linear-gradient(90deg,var(--p3),var(--p1))", transition: "width .1s linear" }} />
          </div>
          <p style={{ fontWeight: 800, fontSize: 18, marginBottom: 14 }}>{q.text}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {q.choices.map((text, i) => {
              let bg = "rgba(255,255,255,.05)", border = "var(--line)", color = "var(--ink)";
              if (revealed && text === q.good) { bg = "rgba(182,240,76,.18)"; border = "var(--p3)"; color = "var(--p3)"; }
              else if (revealed && picked === text) { bg = "rgba(255,93,115,.15)"; border = "var(--p1)"; color = "var(--p1)"; }
              else if (picked === text) { border = "var(--p2)"; }
              return (
                <button key={i} disabled={!!picked || revealed} onClick={() => pick(text)}
                  style={{ padding: "14px 10px", borderRadius: 12, border: `2.5px solid ${border}`, background: bg, color, fontWeight: 800 }}>
                  {text}
                </button>
              );
            })}
          </div>
          {revealed && picked !== q.good && (
            <p className="muted" style={{ marginTop: 12 }}>
              {picked ? "" : t("tooSlow") + " "} {t("rightAnswer")} <b style={{ color: "var(--p3)" }}>{q.good}</b>
            </p>
          )}
        </>
      )}
    </div>
  );
}
