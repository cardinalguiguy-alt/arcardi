"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState } from "@/lib/gameSync";
import { DICT_FR, DICT_EN } from "@/lib/wordDictionary";
import FlagIcon from "./FlagIcon";

const WORD_LEN = 5;
const MAX_TRIES = 6;

const WORDS_FR = [
  "PLAGE","TABLE","CHIEN","VOILE","PORTE","FLEUR","MONDE","DANSE","FORCE","GLACE",
  "PIANO","CADRE","TIGRE","VERRE","GUIDE","LIVRE","PLUIE","ARBRE","CHAMP","FORET",
  "CRAIE","GRAIN","PLUME","TOAST","VIRUS","ZEBRE","SALLE","HOTEL","MOTEL","FUSEE",
  "RADIO","STADE","TRAIN","AVION","BATON","CANOT","CRABE","DRAPS","ECRAN","FORME",
  "GLAND","HERBE","IGLOO","JAUNE","LARME","MAGMA","OASIS","PONEY","QUEUE","SABLE",
  "TASSE","USINE","VAGUE","WAGON","ZESTE","FLUTE","OPERA","TEMPO","GAMME","CORDE",
  "NOTES","ORGUE","BASSE","RONDE","CHANT","ROBOT","ANNEE","MAGIE","BIJOU","CANAL",
  "CYGNE","DRAME","ECOLE","ENFER","ETAGE","FILET","GLOBE","IMAGE","JETON","LUEUR",
  "MERCI","MUSEE","NUAGE","ONGLE","PHARE","PRIME","RIVAL","ROSEE","SIROP","SOLDE",
  "STYLO","TABAC","TRIBU","RECIT","VALSE"
];
const WORDS_EN = [
  "PLANE","HOUSE","MUSIC","VIOLA","CHORD","TEMPO","NOTES","STAGE","SOUND","BEACH",
  "RIVER","TIGER","GRAPE","CANDY","CLOUD","STORM","TRAIN","PLANT","HEART","LIGHT",
  "NIGHT","WATCH","BREAD","GLASS","STONE","FLAME","OCEAN","MOUSE","HORSE","EAGLE",
  "ROBOT","SPACE","MAGIC","DANCE","SMILE","SWEET","GHOST","BRAVE","QUIET","SHARP",
  "FRESH","QUICK","PIANO","ANGEL","BERRY","CABIN","CHESS","CROWN","DIARY","DRESS",
  "EARTH","ELBOW","FAIRY","FIELD","FROST","GIANT","GLORY","GRACE","HONEY","IVORY",
  "JOKER","JUDGE","KNIFE","LEMON","MELON","MOUNT","NOVEL","OLIVE","PEARL","PIZZA",
  "POWER","QUEEN","ROYAL","SALAD","SHORE","SNAKE","SOLAR","STORY","SUGAR","SUNNY",
  "TOWER","TRUST","WORLD","YOUTH","ZEBRA"
];

const KB_FR = [["A","Z","E","R","T","Y","U","I","O","P"], ["Q","S","D","F","G","H","J","K","L","M"], ["W","X","C","V","B","N"]];
const KB_EN = [["Q","W","E","R","T","Y","U","I","O","P"], ["A","S","D","F","G","H","J","K","L"], ["Z","X","C","V","B","N","M"]];

function normalize(s) {
  return (s || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/g, "");
}

// Algorithme classique Wordle (gère bien les lettres en double).
function evaluate(guess, secret) {
  const res = Array(WORD_LEN).fill("absent");
  const secretArr = secret.split("");
  const guessArr = guess.split("");
  const used = Array(WORD_LEN).fill(false);
  for (let i = 0; i < WORD_LEN; i++) {
    if (guessArr[i] === secretArr[i]) { res[i] = "correct"; used[i] = true; guessArr[i] = null; }
  }
  for (let i = 0; i < WORD_LEN; i++) {
    if (guessArr[i] == null) continue;
    const idx = secretArr.findIndex((c, j) => c === guessArr[i] && !used[j]);
    if (idx > -1) { res[i] = "present"; used[idx] = true; }
  }
  return res;
}

const COLORS = { correct: "var(--p3)", present: "var(--p4)", absent: "rgba(255,255,255,.10)" };
const SQ = { correct: "🟩", present: "🟨", absent: "⬛" };
const RANK = { correct: 3, present: 2, absent: 1 };

// Le meilleur statut connu l'emporte (ex: une lettre "présente" ailleurs puis "correcte" reste verte).
function letterStatuses(guesses) {
  const map = {};
  guesses.forEach(g => g.word.split("").forEach((ch, i) => {
    const s = g.pattern[i];
    if (!map[ch] || RANK[s] > RANK[map[ch]]) map[ch] = s;
  }));
  return map;
}

export default function WordGuess({ room, me, isHost, players, onFinish, t, lang }) {
  const [secret, setSecret] = useState(null);
  const [wordLang, setWordLang] = useState(null); // langue réelle du mot en cours ("fr" | "en")
  const [guesses, setGuesses] = useState([]); // [{ word, pattern }]
  const [current, setCurrent] = useState("");
  const [shake, setShake] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [finished, setFinished] = useState(false);
  const [opponents, setOpponents] = useState({}); // profile_id -> { tries, solved, failed, username, avatar }
  const [revealState, setRevealState] = useState({ row: -1, count: 0 });
  const panelRef = useRef(null);
  const revealTimers = useRef([]);
  const channelRef = useRef(null);
  const myResult = useRef({ solved: false, tries: 0 });
  const doneSetRef = useRef(new Set());
  const restoredRef = useRef(false);

  useEffect(() => {
    const ch = supabase.channel("wordle_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "start" }, ({ payload }) => {
      setSecret(payload.word);
      setWordLang(payload.wordLang || "fr");
      setGuesses([]); setCurrent(""); setFinished(false);
      setOpponents({});
      setRevealState({ row: -1, count: 0 });
      myResult.current = { solved: false, tries: 0 };
      doneSetRef.current = new Set();
      setTimeout(() => panelRef.current && panelRef.current.focus(), 50);
      if (isHost) {
        saveGameState(room.id, "wordle", {
          phase: "playing", word: payload.word, wordLang: payload.wordLang || "fr", finished: false,
        });
      }
    });
    ch.on("broadcast", { event: "progress" }, ({ payload }) => {
      // Fin de manche anticipée : dès que tout le monde a fini (trouvé ou
      // épuisé ses essais), pas besoin d'attendre le chrono complet.
      if (payload.solved || payload.failed) {
        doneSetRef.current.add(payload.profile_id);
        if (isHost && players?.length > 0 && doneSetRef.current.size >= players.length) {
          hostEndRound();
        }
      }
      if (payload.profile_id === me.id) return;
      setOpponents(prev => ({ ...prev, [payload.profile_id]: payload }));
    });
    ch.on("broadcast", { event: "finished" }, async () => {
      setFinished(true);
      if (isHost) {
        saveGameState(room.id, "wordle", { phase: "finished", finished: true });
      }
      try {
        await supabase.from("game_results").insert({
          room_id: room.id, profile_id: me.id, game_id: "wordle", points: pointsFor(myResult.current)
        });
        if (pointsFor(myResult.current) > 0) {
          await supabase.rpc("add_points", { p_room: room.id, p_delta: pointsFor(myResult.current) });
        }
      } catch (e) {}
    });

    ch.subscribe(status => {
      if (status !== "SUBSCRIBED" || restoredRef.current) return;
      restoredRef.current = true;
      // Resynchronisation : le mot et le chrono partagés sont restaurés
      // immédiatement après un rechargement de page. Seule la progression
      // PRIVÉE du joueur (ses propres essais) ne peut pas être restaurée
      // (RLS : seul l'hôte écrit sur le salon) — il rejoint la manche en
      // cours avec une grille vierge plutôt que de rester bloqué sur l'écran
      // de démarrage.
      const saved = readGameState(room, "wordle");
      if (!saved) return;
      if (saved.finished) { setFinished(true); return; }
      if (!saved.word) return;
      setSecret(saved.word);
      setWordLang(saved.wordLang || "fr");
      setTimeout(() => panelRef.current && panelRef.current.focus(), 50);
    });
    return () => {
      revealTimers.current.forEach(clearTimeout);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  function pointsFor(res) {
    if (!res.solved) return 0;
    return Math.max(7 - res.tries, 1);
  }

  function hostStart() {
    const wl = lang === "en" ? "en" : "fr";
    const bank = wl === "en" ? WORDS_EN : WORDS_FR;
    const word = bank[Math.floor(Math.random() * bank.length)];
    channelRef.current.send({ type: "broadcast", event: "start", payload: { word, wordLang: wl } });
  }

  function hostEndRound() {
    channelRef.current.send({ type: "broadcast", event: "finished", payload: {} });
  }

  function rejouer() {
    if (!isHost) return;
    hostStart();
  }

  async function backToRoom() {
    await supabase.from("rooms").update({ status: "lobby", current_game: null, game_state: null }).eq("id", room.id);
    onFinish && onFinish();
  }

  function sendProgress(tries, solved, failed) {
    channelRef.current.send({
      type: "broadcast", event: "progress",
      payload: { profile_id: me.id, username: me.username, avatar: me.avatar, tries, solved, failed }
    });
  }

  function typeLetter(l) {
    if (myResult.current.solved || finished) return;
    if (current.length >= WORD_LEN) return;
    setCurrent(c => c + l);
  }
  function backspace() { setCurrent(c => c.slice(0, -1)); }

  function submit() {
    if (myResult.current.solved || finished) return;
    const g = normalize(current);
    if (g.length !== WORD_LEN) {
      setShake(true); setErrorMsg(t("wordleInvalid"));
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setErrorMsg(""), 1800);
      return;
    }
    // Le mot doit exister dans la langue réelle du mot à deviner (pas juste 5 lettres au hasard).
    const dict = wordLang === "en" ? DICT_EN : DICT_FR;
    if (!dict.has(g)) {
      setShake(true); setErrorMsg(t("wordleNotAWord"));
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setErrorMsg(""), 1800);
      return;
    }
    setErrorMsg("");
    const pattern = evaluate(g, secret);
    const nextGuesses = [...guesses, { word: g, pattern }];
    const rowIndex = nextGuesses.length - 1;
    setGuesses(nextGuesses);
    setCurrent("");
    setRevealState({ row: rowIndex, count: 0 });
    for (let i = 0; i <= WORD_LEN; i++) {
      revealTimers.current.push(setTimeout(() => setRevealState({ row: rowIndex, count: i }), i * 230));
    }
    const solved = g === secret;
    const failed = !solved && nextGuesses.length >= MAX_TRIES;
    myResult.current = { solved, tries: nextGuesses.length };
    sendProgress(nextGuesses.length, solved, failed);
  }

  function onKeyDown(e) {
    if (e.key === "Enter") submit();
    else if (e.key === "Backspace") backspace();
    else if (/^[a-zA-Z]$/.test(e.key)) typeLetter(e.key.toUpperCase());
  }

  const kb = wordLang === "en" ? KB_EN : KB_FR;
  const done = myResult.current.solved || guesses.length >= MAX_TRIES;
  const letterMap = letterStatuses(guesses);
  const nextTryPoints = Math.max(7 - (guesses.length + 1), 1);

  if (finished) {
    const pts = pointsFor(myResult.current);
    return (
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <h1>{t("wordleTitle")}</h1>
          <span className="lang-pill"><FlagIcon code={wordLang === "en" ? "gb" : "fr"} size={14} /> {wordLang === "en" ? "EN" : "FR"}</span>
        </div>
        {myResult.current.solved
          ? <p className="hint">{t("foundInPre")} {myResult.current.tries} {t("foundInSuffix")}</p>
          : <p className="hint">{t("wordleFailedPre")} <b style={{ color: "var(--p2)" }}>{secret}</b></p>}
        <p style={{ fontWeight: 800 }}>{t("peYourGain")} <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>+{pts} {t("pts")}</span></p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
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
    );
  }

  return (
    <div className="panel" ref={panelRef} tabIndex={0} onKeyDown={onKeyDown} style={{ outline: "none", maxWidth: "min(560px, 90vw)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <h1>{t("wordleTitle")}</h1>
        {secret && <span className="lang-pill"><FlagIcon code={wordLang === "en" ? "gb" : "fr"} size={14} /> {wordLang === "en" ? "EN" : "FR"}</span>}
      </div>
      {!secret && isHost && (
        <>
          <p className="hint">{MAX_TRIES} {t("wordleIntro")}</p>
          <button className="btn" onClick={hostStart}>{t("start")}</button>
        </>
      )}
      {!secret && !isHost && <p className="muted">{t("waitStart")}</p>}

      {secret && (
        <>
          <div style={{ display: "grid", gap: 6, marginBottom: 6 }}>
            {Array.from({ length: MAX_TRIES }).map((_, row) => {
              const g = guesses[row];
              const letters = g ? g.word.split("") : (row === guesses.length ? current.padEnd(WORD_LEN, " ").split("") : Array(WORD_LEN).fill(" "));
              const isCurrentRow = row === guesses.length && !g;
              const revealedCount = g ? (row === revealState.row ? revealState.count : WORD_LEN) : 0;
              return (
                <div key={row} style={{ display: "flex", gap: 6, animation: isCurrentRow && shake ? "shakeRow .5s" : "none" }}>
                  {letters.map((l, i) => {
                    const shown = g && i < revealedCount;
                    return (
                      <div key={i} style={{
                        width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center",
                        border: `2.5px solid ${shown ? COLORS[g.pattern[i]] : "var(--line)"}`,
                        background: shown ? COLORS[g.pattern[i]] : "rgba(255,255,255,.03)",
                        color: shown ? "#12142A" : "var(--ink)",
                        borderRadius: 10, fontFamily: "'Space Mono'", fontWeight: 700, fontSize: 24,
                        transition: "transform .22s, background-color .22s, border-color .22s",
                        transform: g && !shown ? "scale(.85) rotateX(40deg)" : "scale(1) rotateX(0deg)"
                      }}>{l.trim()}</div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          {errorMsg && <p className="err" style={{ marginBottom: 10 }}>{errorMsg}</p>}
          {!done && (
            <p className="muted" style={{ marginBottom: 10, fontSize: 12 }}>
              {t("wordleLiveHint")} <b style={{ color: "var(--p3)" }}>+{nextTryPoints} {t("pts")}</b>
            </p>
          )}

          {!done && (
            <div style={{ display: "grid", gap: 6, marginBottom: 6 }}>
              {kb.map((row, i) => (
                <div key={i} style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                  {row.map(l => {
                    const st = letterMap[l];
                    return (
                      <button key={l} className={st ? "" : "btn ghost"}
                        style={{
                          margin: 0, width: 30, padding: "10px 0", fontSize: 13, borderRadius: 8,
                          background: st ? COLORS[st] : undefined, color: st ? "#12142A" : undefined,
                          fontWeight: st ? 800 : undefined, transition: "background-color .2s"
                        }}
                        onClick={() => typeLetter(l)}>{l}</button>
                    );
                  })}
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button className="btn ghost" style={{ margin: 0 }} onClick={backspace}>⌫</button>
                <button className="btn" style={{ margin: 0 }} onClick={submit}>↵ {t("wordleSubmit")}</button>
              </div>
            </div>
          )}

          {done && !myResult.current.solved && (
            <p className="muted" style={{ marginTop: 10 }}>{t("wordleWaitOthers")}</p>
          )}
          {done && myResult.current.solved && (
            <p style={{ color: "var(--p3)", fontWeight: 800, marginTop: 10 }}>{t("foundInPre")} {myResult.current.tries} {t("foundInSuffix")}</p>
          )}

          {Object.keys(opponents).length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
              <p className="muted" style={{ marginBottom: 8 }}>{t("wordleOpponents")}</p>
              {Object.values(opponents).map(o => (
                <div className="player-chip" key={o.profile_id} style={{ padding: "6px 10px" }}>
                  <span>{o.avatar}</span>
                  <span>{o.username}</span>
                  <span className="pt">{o.solved ? "✅ " + o.tries + "/" + MAX_TRIES : (o.failed ? "❌" : o.tries + "/" + MAX_TRIES)}</span>
                </div>
              ))}
            </div>
          )}
          {isHost && done && (
            <button className="btn ghost" style={{ marginTop: 14 }} onClick={hostEndRound}>⏭️ {t("endRoundNow")}</button>
          )}
        </>
      )}
    </div>
  );
}
