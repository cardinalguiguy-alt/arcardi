"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const QUESTIONS_FR = {
  easy: [
    ["Combien y a-t-il de continents sur Terre ?", "7", "5", "6", "8"],
    ["Quel est l'animal terrestre le plus rapide ?", "Le guépard", "Le lion", "Le cheval", "L'autruche"],
    ["Combien de jours compte une année bissextile ?", "366", "365", "364", "367"],
    ["Dans quel pays se trouve la tour Eiffel ?", "La France", "La Belgique", "L'Italie", "L'Espagne"],
    ["Quelle est la plus grande planète du système solaire ?", "Jupiter", "Saturne", "Neptune", "Uranus"],
    ["Combien de couleurs compte un arc-en-ciel, traditionnellement ?", "7", "5", "6", "8"],
    ["Quel est le plus grand désert froid du monde ?", "L'Antarctique", "Le Sahara", "Le Gobi", "L'Arctique"],
    ["Combien de joueurs une équipe de football aligne-t-elle sur le terrain ?", "11", "10", "9", "12"],
    ["Quelle est la capitale de l'Espagne ?", "Madrid", "Barcelone", "Séville", "Valence"],
    ["Quel fruit jaune, souvent associé aux singes, se pèle avant d'être mangé ?", "La banane", "La mangue", "L'ananas", "La papaye"],
    ["Combien de pattes possède un insecte ?", "6", "8", "4", "10"],
    ["Quel est le plus long fleuve d'Afrique ?", "Le Nil", "Le Congo", "Le Niger", "Le Zambèze"],
    ["Quelle mer borde Nice et Marseille ?", "La Méditerranée", "L'Atlantique", "La mer du Nord", "La mer Rouge"],
    ["Combien de temps dure un match de football en temps réglementaire ?", "90 minutes", "60 minutes", "120 minutes", "45 minutes"],
    ["Quel est le symbole chimique de l'eau ?", "H2O", "CO2", "O2", "NaCl"],
    ["Quelle BD met en scène un village gaulois qui résiste aux Romains ?", "Astérix", "Tintin", "Lucky Luke", "Spirou"],
  ],
  medium: [
    ["Quel pays a la forme d'une botte sur la carte de l'Europe ?", "L'Italie", "La Grèce", "Le Portugal", "La Croatie"],
    ["Environ combien de temps met la lumière du Soleil pour atteindre la Terre ?", "8 minutes", "1 minute", "1 heure", "8 secondes"],
    ["Qui a écrit « Les Misérables » ?", "Victor Hugo", "Émile Zola", "Alexandre Dumas", "Gustave Flaubert"],
    ["Quelle est la capitale du Brésil ?", "Brasilia", "Rio de Janeiro", "São Paulo", "Salvador"],
    ["En quelle année le mur de Berlin est-il tombé ?", "1989", "1991", "1985", "1993"],
    ["Quel est le plus grand organe du corps humain ?", "La peau", "Le foie", "Le cœur", "Le cerveau"],
    ["Quel peintre a réalisé « La Nuit étoilée » ?", "Van Gogh", "Monet", "Picasso", "Renoir"],
    ["Quelle est la monnaie officielle du Royaume-Uni ?", "La livre sterling", "L'euro", "Le dollar", "Le franc"],
    ["Combien d'anneaux compte le drapeau olympique ?", "5", "4", "6", "7"],
    ["Quel est l'océan le plus profond ?", "Le Pacifique", "L'Atlantique", "L'Indien", "L'Arctique"],
    ["Comment appelle-t-on le processus par lequel les plantes produisent de l'énergie grâce à la lumière ?", "La photosynthèse", "La respiration", "La fermentation", "La transpiration"],
    ["Quel pays est le berceau du tango ?", "L'Argentine", "Le Brésil", "L'Espagne", "Le Mexique"],
    ["Environ combien de temps met la Lune pour faire le tour de la Terre ?", "27 jours", "7 jours", "100 jours", "365 jours"],
    ["Quel écrivain britannique a créé Sherlock Holmes ?", "Arthur Conan Doyle", "Agatha Christie", "Charles Dickens", "Oscar Wilde"],
    ["Quelle est la langue officielle du Brésil ?", "Le portugais", "L'espagnol", "Le français", "L'italien"],
    ["Quel grand compositeur est devenu sourd à la fin de sa vie ?", "Beethoven", "Mozart", "Bach", "Chopin"],
  ],
  hard: [
    ["Quel est le seul mammifère capable de voler activement (et non de planer) ?", "La chauve-souris", "L'écureuil volant", "La roussette", "Le phalanger"],
    ["Quelle est la capitale du Kazakhstan ?", "Astana", "Almaty", "Bichkek", "Tachkent"],
    ["Quel traité a officiellement mis fin à la Première Guerre mondiale ?", "Le traité de Versailles", "Le traité de Vienne", "Le traité de Westphalie", "Le traité d'Utrecht"],
    ["Environ combien d'os un nouveau-né possède-t-il, soit plus que l'adulte ?", "Environ 300", "Environ 206", "Environ 150", "Environ 400"],
    ["Quel est l'élément chimique le plus abondant dans l'univers ?", "L'hydrogène", "L'hélium", "L'oxygène", "Le carbone"],
    ["Qui a composé l'opéra « La Flûte enchantée » ?", "Mozart", "Beethoven", "Wagner", "Verdi"],
    ["Quelle bataille a marqué la défaite finale de Napoléon ?", "Waterloo", "Austerlitz", "Trafalgar", "Iéna"],
    ["Quel pays compte le plus de fuseaux horaires, grâce à ses territoires d'outre-mer ?", "La France", "La Russie", "Les États-Unis", "Le Royaume-Uni"],
    ["Quel est le point culminant du continent africain ?", "Le Kilimandjaro", "Le mont Kenya", "Le mont Stanley", "L'Atlas"],
    ["Dans quelle ville siège la Cour pénale internationale ?", "La Haye", "Genève", "Bruxelles", "Strasbourg"],
    ["Qui a composé « Les Quatre Saisons » ?", "Vivaldi", "Bach", "Haendel", "Corelli"],
    ["Quel traité de 1494 a partagé le Nouveau Monde entre l'Espagne et le Portugal ?", "Le traité de Tordesillas", "Le traité de Madrid", "Le traité d'Utrecht", "Le traité de Saragosse"],
    ["Quelle est la particularité insolite de la planète Vénus ?", "Son jour dure plus longtemps que son année", "Elle n'a pas d'atmosphère", "Elle tourne à la même vitesse que la Terre", "C'est la planète la plus froide"],
    ["Quel explorateur a mené l'expédition qui a réalisé le premier tour du monde en bateau (achevé après sa mort) ?", "Magellan", "Christophe Colomb", "Vasco de Gama", "James Cook"],
    ["Quel est le plus grand désert du monde, déserts polaires exclus ?", "Le Sahara", "Le désert de Gobi", "Le désert d'Arabie", "Le Kalahari"],
    ["Quelle est, environ, la vitesse du son dans l'air à température ambiante ?", "340 m/s", "150 m/s", "500 m/s", "1000 m/s"],
  ],
};
const QUESTIONS_EN = {
  easy: [
    ["How many continents are there on Earth?", "7", "5", "6", "8"],
    ["What is the fastest land animal?", "The cheetah", "The lion", "The horse", "The ostrich"],
    ["How many days are in a leap year?", "366", "365", "364", "367"],
    ["In which country is the Eiffel Tower located?", "France", "Belgium", "Italy", "Spain"],
    ["What is the largest planet in the solar system?", "Jupiter", "Saturn", "Neptune", "Uranus"],
    ["How many colors does a rainbow traditionally have?", "7", "5", "6", "8"],
    ["What is the largest cold desert in the world?", "Antarctica", "The Sahara", "The Gobi", "The Arctic"],
    ["How many players does a football (soccer) team have on the field?", "11", "10", "9", "12"],
    ["What is the capital of Spain?", "Madrid", "Barcelona", "Seville", "Valencia"],
    ["What yellow fruit, often linked to monkeys, is peeled before eating?", "The banana", "The mango", "The pineapple", "The papaya"],
    ["How many legs does an insect have?", "6", "8", "4", "10"],
    ["What is the longest river in Africa?", "The Nile", "The Congo", "The Niger", "The Zambezi"],
    ["Which sea borders Nice and Marseille?", "The Mediterranean", "The Atlantic", "The North Sea", "The Red Sea"],
    ["How long is a regulation football (soccer) match?", "90 minutes", "60 minutes", "120 minutes", "45 minutes"],
    ["What is the chemical symbol for water?", "H2O", "CO2", "O2", "NaCl"],
    ["Which comic series features a small Gaulish village resisting the Romans?", "Asterix", "Tintin", "Lucky Luke", "Spirou"],
  ],
  medium: [
    ["Which country is shaped like a boot on the map of Europe?", "Italy", "Greece", "Portugal", "Croatia"],
    ["About how long does sunlight take to reach Earth?", "8 minutes", "1 minute", "1 hour", "8 seconds"],
    ["Who wrote 'Les Misérables'?", "Victor Hugo", "Émile Zola", "Alexandre Dumas", "Gustave Flaubert"],
    ["What is the capital of Brazil?", "Brasília", "Rio de Janeiro", "São Paulo", "Salvador"],
    ["In what year did the Berlin Wall fall?", "1989", "1991", "1985", "1993"],
    ["What is the largest organ in the human body?", "The skin", "The liver", "The heart", "The brain"],
    ["Which painter is known for 'The Starry Night'?", "Van Gogh", "Monet", "Picasso", "Renoir"],
    ["What is the official currency of the United Kingdom?", "The pound sterling", "The euro", "The dollar", "The franc"],
    ["How many rings are on the Olympic flag?", "5", "4", "6", "7"],
    ["Which ocean is the deepest?", "The Pacific", "The Atlantic", "The Indian", "The Arctic"],
    ["What is the process by which plants produce energy from light called?", "Photosynthesis", "Respiration", "Fermentation", "Transpiration"],
    ["Which country is the birthplace of the tango?", "Argentina", "Brazil", "Spain", "Mexico"],
    ["About how long does it take the Moon to orbit the Earth once?", "27 days", "7 days", "100 days", "365 days"],
    ["Which British writer created Sherlock Holmes?", "Arthur Conan Doyle", "Agatha Christie", "Charles Dickens", "Oscar Wilde"],
    ["What is the official language of Brazil?", "Portuguese", "Spanish", "French", "Italian"],
    ["Which great composer became deaf later in life?", "Beethoven", "Mozart", "Bach", "Chopin"],
  ],
  hard: [
    ["What is the only mammal capable of true powered flight (not just gliding)?", "The bat", "The flying squirrel", "The flying fox", "The sugar glider"],
    ["What is the capital of Kazakhstan?", "Astana", "Almaty", "Bishkek", "Tashkent"],
    ["Which treaty officially ended World War I?", "The Treaty of Versailles", "The Treaty of Vienna", "The Treaty of Westphalia", "The Treaty of Utrecht"],
    ["About how many bones does a newborn baby have, more than an adult?", "About 300", "About 206", "About 150", "About 400"],
    ["What is the most abundant element in the universe?", "Hydrogen", "Helium", "Oxygen", "Carbon"],
    ["Who composed the opera 'The Magic Flute'?", "Mozart", "Beethoven", "Wagner", "Verdi"],
    ["Which battle marked Napoleon's final defeat?", "Waterloo", "Austerlitz", "Trafalgar", "Jena"],
    ["Which country has the most time zones, thanks to its overseas territories?", "France", "Russia", "The United States", "The United Kingdom"],
    ["What is the highest point on the African continent?", "Kilimanjaro", "Mount Kenya", "Mount Stanley", "The Atlas Mountains"],
    ["In which city is the International Criminal Court headquartered?", "The Hague", "Geneva", "Brussels", "Strasbourg"],
    ["Who composed 'The Four Seasons'?", "Vivaldi", "Bach", "Handel", "Corelli"],
    ["Which 1494 treaty divided the New World between Spain and Portugal?", "The Treaty of Tordesillas", "The Treaty of Madrid", "The Treaty of Utrecht", "The Treaty of Zaragoza"],
    ["What is the unusual fact about the planet Venus?", "Its day is longer than its year", "It has no atmosphere", "It rotates at the same speed as Earth", "It's the coldest planet"],
    ["Whose expedition was the first to circumnavigate the globe, completed after his death?", "Magellan", "Christopher Columbus", "Vasco da Gama", "James Cook"],
    ["What is the largest desert in the world, excluding polar deserts?", "The Sahara", "The Gobi Desert", "The Arabian Desert", "The Kalahari"],
    ["What is approximately the speed of sound in air at room temperature?", "340 m/s", "150 m/s", "500 m/s", "1000 m/s"],
  ],
};

function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

const ROUND_MS_BY_DIFF = { easy: 11000, medium: 8500, hard: 6500 };
const POINTS_BY_DIFF = { easy: 1, medium: 2, hard: 3 };
const N_QUESTIONS = 10;

export default function QuizGame({ room, me, isHost, onFinish, t, lang }) {
  // Le paquet n'existe QUE chez l'hôte : les autres reçoivent tout par broadcast.
  const deckRef = useRef(null);
  const [q, setQ] = useState(null);          // { index, text, choices[], good, diff, roundMs }
  const [deadline, setDeadline] = useState(null);
  const [roundTotal, setRoundTotal] = useState(ROUND_MS_BY_DIFF.easy);
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [finished, setFinished] = useState(false);
  const [points, setPoints] = useState(0);
  const channelRef = useRef(null);
  const myGain = useRef(0);
  const timeouts = useRef([]);

  useEffect(() => {
    const ch = supabase.channel("quiz_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "question" }, ({ payload }) => {
      setQ(payload);
      setRoundTotal(payload.remaining);
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

  function hostStart(diff) {
    const bank = (lang === "en" ? QUESTIONS_EN : QUESTIONS_FR)[diff];
    deckRef.current = shuffle(bank).slice(0, N_QUESTIONS);
    hostSend(0, diff);
  }

  function hostSend(index, diff) {
    const item = deckRef.current[index];
    const roundMs = ROUND_MS_BY_DIFF[diff];
    const payload = {
      index,
      total: deckRef.current.length,
      text: item[0],
      good: item[1],
      choices: shuffle(item.slice(1)),
      remaining: roundMs,
      diff
    };
    channelRef.current.send({ type: "broadcast", event: "question", payload });
    timeouts.current.push(setTimeout(() => {
      channelRef.current.send({ type: "broadcast", event: "reveal", payload: {} });
      timeouts.current.push(setTimeout(() => {
        if (index + 1 < deckRef.current.length) hostSend(index + 1, diff);
        else hostFinish();
      }, 2000));
    }, roundMs));
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
      const gain = POINTS_BY_DIFF[q.diff] || 2;
      myGain.current += gain;
      setPoints(p => p + gain);
      // RPC atomique : pas d'écrasement de score en cas de réponses simultanées.
      await supabase.rpc("add_points", { p_room: room.id, p_delta: gain });
    }
  }

  if (finished) {
    return (
      <div className="panel" style={{ maxWidth: 620 }}>
        <h1>{t("quizTitle")}</h1>
        <p className="hint">{t("quizDone")}</p>
        <p style={{ fontWeight: 800 }}>{t("peYourGain")} <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>+{points} {t("pts")}</span></p>
      </div>
    );
  }

  const DIFFS = [
    { id: "easy", label: t("diffEasy"), color: "var(--p3)", grad: "linear-gradient(135deg, var(--p3), #7fd9c4)" },
    { id: "medium", label: t("diffMedium"), color: "var(--p4)", grad: "linear-gradient(135deg, var(--p4), var(--p2))" },
    { id: "hard", label: t("diffHard"), color: "var(--p1)", grad: "linear-gradient(135deg, var(--p1), var(--p5))" },
  ];
  const secondsLeft = Math.ceil(timeLeft / 1000);
  const isUrgent = q && !revealed && timeLeft > 0 && timeLeft < 3000;

  return (
    <div className="panel" style={{ maxWidth: 620 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <h1>{t("quizTitle")}</h1>
        {points > 0 && (
          <span style={{
            fontFamily: "'Space Mono'", fontWeight: 700, color: "var(--p3)",
            background: "rgba(182,240,76,.12)", border: "1.5px solid var(--p3)",
            borderRadius: 99, padding: "4px 10px", fontSize: 13, animation: "popIn .3s ease both"
          }} key={points}>+{points} {t("pts")}</span>
        )}
      </div>
      {!q && isHost && (
        <>
          <p className="hint">{N_QUESTIONS} {t("quizIntro")}</p>
          <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
            {DIFFS.map(d => (
              <button key={d.id} className="btn" style={{ background: d.grad }} onClick={() => hostStart(d.id)}>
                {d.label} <span style={{ opacity: .75, fontWeight: 600 }}>· {Math.round(ROUND_MS_BY_DIFF[d.id] / 1000)}s · +{POINTS_BY_DIFF[d.id]}{t("pts")}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {!q && !isHost && <p className="muted">{t("waitStart")}</p>}

      {q && (
        <div key={q.index} className="stage-enter">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <p className="muted" style={{ margin: 0 }}>{t("question")} {q.index + 1} / {q.total}</p>
            <span style={{
              fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em",
              color: DIFFS.find(d => d.id === q.diff)?.color, opacity: .85
            }}>{DIFFS.find(d => d.id === q.diff)?.label}</span>
          </div>

          <div style={{ position: "relative", height: 10, background: "rgba(255,255,255,.08)", borderRadius: 99, overflow: "hidden", margin: "0 0 18px" }}>
            <div style={{
              height: "100%", width: (timeLeft / roundTotal * 100) + "%",
              background: timeLeft < 3000 ? "var(--p1)" : timeLeft < roundTotal * 0.4 ? "var(--p4)" : "linear-gradient(90deg,var(--p3),var(--p1))",
              transition: "width .1s linear", animation: isUrgent ? "urgentPulse .4s ease-in-out infinite" : "none"
            }} />
          </div>

          <div style={{ position: "relative", minHeight: 78, display: "flex", alignItems: "center", marginBottom: 18 }}>
            <p style={{ fontWeight: 800, fontSize: 21, lineHeight: 1.35, margin: 0, paddingRight: isUrgent ? 54 : 0 }}>{q.text}</p>
            {isUrgent && (
              <span key={secondsLeft} style={{
                position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
                fontFamily: "'Space Mono'", fontWeight: 800, fontSize: 34, color: "var(--p1)",
                animation: "popIn .35s ease both"
              }}>{secondsLeft}</span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {q.choices.map((text, i) => {
              let bg = "rgba(255,255,255,.05)", border = "var(--line)", color = "var(--ink)", scale = 1;
              const isGood = revealed && text === q.good;
              const isWrongPick = revealed && picked === text && text !== q.good;
              if (isGood) { bg = "rgba(182,240,76,.18)"; border = "var(--p3)"; color = "var(--p3)"; scale = 1.03; }
              else if (isWrongPick) { bg = "rgba(255,93,115,.15)"; border = "var(--p1)"; color = "var(--p1)"; }
              else if (picked === text) { border = "var(--p2)"; }
              return (
                <button key={i} disabled={!!picked || revealed} onClick={() => pick(text)}
                  style={{
                    minHeight: 64, padding: "14px 12px", borderRadius: 14, border: `2.5px solid ${border}`, background: bg, color, fontWeight: 800, fontSize: 15,
                    transform: `scale(${scale})`, transition: "transform .2s, background .2s, border-color .2s"
                  }}>
                  {isGood ? "✅ " : isWrongPick ? "❌ " : ""}{text}
                </button>
              );
            })}
          </div>
          {revealed && picked !== q.good && (
            <p className="muted" style={{ marginTop: 14 }}>
              {picked ? "" : t("tooSlow") + " "} {t("rightAnswer")} <b style={{ color: "var(--p3)" }}>{q.good}</b>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
