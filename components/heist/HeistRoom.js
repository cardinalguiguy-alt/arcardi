"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby, recordMatchResult } from "@/lib/gameSync";
import Crossfade from "@/components/Crossfade";

/* ==========================================================================
   LE LOUVRE (heist) — escape room coopératif ASYMÉTRIQUE à 2 joueurs,
   version NERVEUSE (pattern n°3, mêmes conventions qu'Échos).
   ==========================================================================
   Renommé "Le Casse" -> "Le Louvre" (zip 82). L'identifiant technique
   game_id RESTE "heist" (canal, saveGameState) : le renommage est
   purement d'AFFICHAGE (i18n) — aucune manip Supabase.

   Deux cambrioleurs infiltrés dans le Louvre, chacun dans une aile
   différente (Denon / Richelieu), reliés seulement par oreillette : aucune
   vue partagée, aucun arbitre. La seule vérité commune est un petit
   historique d'événements (broadcast, self:true) que les deux clients
   appliquent de façon idempotente :
     - "match_start" : l'hôte génère la partie ENTIÈRE (rôles + 6 coups +
       horodatage de fin de ronde) et l'envoie une fois pour toutes. Les deux
       clients adoptent exactement les mêmes données ; seul le RENDU diffère
       selon le rôle — aucune re-génération locale, donc aucun risque de
       désynchronisation.
     - "advance" : diffusé par le joueur qui vient de réussir SON étape.
     - "alarm"   : une mauvaise tentative FAIT MONTER LE NIVEAU D'ALERTE
       partagé ET grignote l'horodatage de fin (double pression). Toujours
       par diffusion, jamais localement, pour que le compteur d'alerte et le
       chrono restent identiques partout. À 100 % → repérés, échec.
     - "final_ok" : finale "La Joconde" (zip 82), phase 1 — le complice qui
       vient d'ouvrir SON verrou (vérifié localement) le déclare aux deux
       clients ; quand les DEUX verrous sont ouverts, la phase 2 s'affiche.
     - "press_a" / "press_b" : le décrochage synchronisé final. Aucun
       arbitre : les deux clients reçoivent les deux horodatages (self:true)
       et calculent chacun si le décrochage est assez synchrone.

   6 chapitres, rôle "info"/"action" équilibré entre A et B. Le 6e — LA
   JOCONDE — est la finale, voulue PLUS LONGUE ET PLUS DURE que les coups
   précédents (zip 82) : deux codes de 5 symboles à information CROISÉE
   (l'indice de chacun s'affiche chez l'AUTRE, les deux dictent et composent
   en même temps, pupitres mélangés différemment pour que décrire une
   position ne serve à rien), puis un décrochage synchronisé à fenêtre
   RÉDUITE (700 ms au lieu de 900).

   Ce qui rend LE LOUVRE plus stressant qu'Échos :
     - ronde plus courte (6 min — resserrée depuis 8, zip 82) ;
     - DEUX façons de perdre (temps écoulé OU jauge d'alerte pleine) ;
     - un gardien qui patrouille en fond (barre d'atmosphère) et accélère à
       mesure que l'alerte monte ;
     - le champ de lasers se REFERME sur une erreur (on repart au bord).

   Règle Supabase respectée : réutilise rooms / recordMatchResult ;
   game_id = "heist" (simple chaîne). Aucune manip Supabase.
   ========================================================================== */

const TOTAL_MS = 6 * 60 * 1000;        // 6 minutes : la ronde du gardien (resserrée, zip 82)
const TIME_PENALTY_MS = 15 * 1000;     // temps grignoté par mauvaise tentative
const ALERT_MAX = 100;                 // jauge pleine => repérés
const ALERT_STEP = 20;                 // +20 % par mauvaise tentative (≈5 fautes)
const ALERT_STEP_LASER = 12;           // frôlement de laser : moins puni (mais reset)
const SYNC_WINDOW_MS = 700;            // fenêtre de synchro du décrochage (ch.6, resserrée)
const GUARD_PERIOD_MS = 4000;          // période du marqueur de garde (ch.5)
const TOTAL_CHAPTERS = 6;
const VICTORY = TOTAL_CHAPTERS + 1;    // "chapter" atteint 7 => victoire

const WIRE_COLORS = ["🔴", "🔵", "🟢", "🟡", "🟣", "🟠", "⚪", "🟤"];
const LOOT_ICONS = ["💎", "👑", "🏺", "💍", "🗿", "⚱️", "🖼️", "⌛"];
const LASER_ROWS = 5, LASER_COLS = 4;
// Butin ramassé au fil des chapitres réussis (purement cosmétique, montre la
// progression comme un "sac qui se remplit").
const LOOT_HAUL = ["💠", "👑", "🏺", "💍", "🗝️"];

function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

/* ---------- Génération des 5 coups (données pures, indépendantes du rendu) ---------- */

// Ch1 — désarmer le boîtier d'alarme (code couleur -> chiffre).
function genC1() {
  const colors = shuffle(WIRE_COLORS).slice(0, 4);
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4);
  const legend = colors.map((c, i) => ({ emoji: c, digit: digits[i] }));
  const sequence = Array.from({ length: 4 }, () => pickRandom(colors));
  const solution = sequence.map(c => String(legend.find(l => l.emoji === c).digit)).join("");
  return { legend, sequence, solution };
}

// Ch2 — traverser le champ de lasers (une case sûre par rangée).
function genC2() {
  const safe = Array.from({ length: LASER_ROWS }, () => randInt(0, LASER_COLS - 1));
  return { safe };
}

// Ch3 — le coffre : 3 crans à composer sur un cadran 0..11.
function genC3() {
  const combo = Array.from({ length: 3 }, () => randInt(0, 11));
  return { combo };
}

// Ch4 — repérer la pièce authentique parmi 5 (par le rang de son poids).
const RANKS = ["heaviest", "lightest", "second_heaviest", "second_lightest", "middle"];
function genC4() {
  const icons = shuffle(LOOT_ICONS).slice(0, 5);
  // Poids distincts, un chiffre après la virgule, pour un tri sans égalité.
  const seen = new Set(); const weights = [];
  while (weights.length < 5) { const w = randInt(12, 98) / 10; if (!seen.has(w)) { seen.add(w); weights.push(w); } }
  const items = icons.map((icon, i) => ({ icon, weight: weights[i] }));
  const rank = pickRandom(RANKS);
  const byWeight = items.slice().sort((a, b) => b.weight - a.weight); // du + lourd au + léger
  let idx;
  if (rank === "heaviest") idx = 0;
  else if (rank === "second_heaviest") idx = 1;
  else if (rank === "middle") idx = 2;
  else if (rank === "second_lightest") idx = 3;
  else idx = 4; // lightest
  const targetIcon = byWeight[idx].icon;
  return { items, rank, targetIcon };
}

// Ch5 — la fenêtre du gardien : stopper le marqueur quand le gardien a le dos
// tourné (arc "sûr" décrit par le partenaire).
function genC5() {
  const size = 52;
  const start = randInt(0, 359 - size);
  return { start, end: start + size };
}

// Ch6 — LA JOCONDE (finale, zip 82) : la vitrine à DOUBLE VERROU. Chaque
// complice doit composer un code de 5 symboles sur SON pupitre, mais
// l'indice de chaque code s'affiche dans l'aile de L'AUTRE (information
// croisée : les deux dictent ET composent en même temps). Les pupitres sont
// mélangés différemment pour chacun — décrire une position ("en haut à
// gauche") ne sert à rien, il faut NOMMER les symboles. Symboles choisis
// faciles à nommer à voix haute dans les deux langues.
const FINAL_SYMBOLS = ["🌙", "⭐", "☀️", "🔥", "🌊", "🗝️", "👁️", "🌹", "🐍"];
const FINAL_CODE_LEN = 5;
function genC6() {
  const draw = () => Array.from({ length: FINAL_CODE_LEN }, () => pickRandom(FINAL_SYMBOLS));
  return { codeA: draw(), codeB: draw(), padA: shuffle(FINAL_SYMBOLS), padB: shuffle(FINAL_SYMBOLS) };
}

/* ---------- Atmosphère : gardien qui patrouille + jauge d'alerte ---------- */

function HeistAtmosphere({ chapter, alert }) {
  const haul = LOOT_HAUL.slice(0, Math.max(0, Math.min(LOOT_HAUL.length, chapter - 1)));
  // Le gardien patrouille plus vite quand l'alerte monte (stress visuel).
  const patrolDur = Math.max(2.2, 6 - (alert / ALERT_MAX) * 3.6);
  return (
    <div className="heist-atmosphere">
      <div className="heist-atmo-beam" />
      <span className="heist-atmo-guard" style={{ animationDuration: patrolDur + "s" }}>👮</span>
      <div className="heist-atmo-haul">{haul.map((h, i) => <span key={i}>{h}</span>)}</div>
    </div>
  );
}

function AlertMeter({ alert, t }) {
  const pct = Math.max(0, Math.min(100, alert));
  const hot = pct >= 60;
  return (
    <div className="heist-alert">
      <div className="heist-alert-head">
        <span>🚨 {t("heistAlert")}</span>
        <span style={{ fontFamily: "'Space Mono'", color: hot ? "var(--p1)" : "var(--p4)" }}>{Math.round(pct)}%</span>
      </div>
      <div className="heist-alert-bar">
        <div className={"heist-alert-fill" + (pct >= 80 ? " critical" : "")} style={{ width: pct + "%" }} />
      </div>
    </div>
  );
}

/* ---------- Sous-composants d'affichage (chacun ne voit que SA moitié) ---------- */

function WireLegend({ legend }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "14px 0" }}>
      {legend.map(l => (
        <div key={l.emoji} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 700 }}>
          <span style={{ fontSize: 22 }}>{l.emoji}</span><span className="muted">→</span>
          <span style={{ fontFamily: "'Space Mono'", color: "var(--p3)", fontSize: 18 }}>{l.digit}</span>
        </div>
      ))}
    </div>
  );
}

function KeypadInput({ sequence, onSubmit, t }) {
  const [code, setCode] = useState("");
  return (
    <div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", fontSize: 30, margin: "14px 0" }}>
        {sequence.map((e, i) => <span key={i}>{e}</span>)}
      </div>
      <form onSubmit={e => { e.preventDefault(); onSubmit(code); setCode(""); }}
        style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center" }}>
        <input type="text" inputMode="numeric" maxLength={4} value={code}
          autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="go"
          onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
          style={{ textAlign: "center", fontFamily: "'Space Mono'", fontSize: 22, letterSpacing: "0.3em", width: 140 }}
          placeholder="••••" />
        <button className="btn" style={{ margin: 0, width: "auto", padding: "12px 18px" }}>{t("heistDisarm")}</button>
      </form>
    </div>
  );
}

// Ch2 info — carte du champ de lasers : la case sûre de chaque rangée.
function LaserMap({ safe }) {
  return (
    <div className="heist-laser-grid">
      {safe.map((sc, r) => (
        <div key={r} className="heist-laser-row">
          {Array.from({ length: LASER_COLS }, (_, c) => (
            <div key={c} className={"heist-laser-cell" + (c === sc ? " safe" : " beam")}>
              {c === sc ? "·" : ""}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Ch2 action — traversée pas à pas. Une erreur ramène au bord (stress).
function LaserCross({ safe, onWrong, onDone }) {
  const [rowsOk, setRowsOk] = useState(0); // combien de rangées franchies
  function tap(r, c) {
    if (r !== rowsOk) return; // on ne joue que la rangée courante
    if (c === safe[r]) {
      const next = rowsOk + 1;
      if (next >= safe.length) { setRowsOk(next); onDone(); }
      else setRowsOk(next);
    } else {
      setRowsOk(0);      // déclenché un faisceau : on ressort et on recommence
      onWrong();
    }
  }
  return (
    <div className="heist-laser-grid" style={{ margin: "10px auto 4px" }}>
      {safe.map((_, r) => (
        <div key={r} className="heist-laser-row">
          {Array.from({ length: LASER_COLS }, (_, c) => {
            const done = r < rowsOk;
            const active = r === rowsOk;
            return (
              <button key={c}
                className={"heist-laser-cell action" + (done ? " crossed" : active ? " live" : " locked")}
                onClick={() => tap(r, c)} disabled={!active}>
                {done && c === safe[r] ? "🦶" : ""}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Ch3 info — la combinaison du coffre.
function ComboClue({ combo }) {
  return (
    <div style={{ display: "flex", gap: 12, justifyContent: "center", margin: "16px 0" }}>
      {combo.map((n, i) => (
        <span key={i} style={{
          fontFamily: "'Space Mono'", fontSize: 26, fontWeight: 800, color: "var(--p3)",
          width: 54, height: 54, borderRadius: 12, border: "2px solid var(--line)",
          display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.04)"
        }}>{n}</span>
      ))}
    </div>
  );
}

// Ch3 action — cadran rotatif : on compose 3 crans dans l'ordre.
function SafeDial({ combo, onWrong, onDone, t }) {
  const [pos, setPos] = useState(0);
  const [locked, setLocked] = useState([]);
  function rotate(dir) { setPos(p => (p + dir + 12) % 12); }
  function lockIn() {
    const next = [...locked, pos];
    if (pos !== combo[locked.length]) { setLocked([]); onWrong(); return; }
    if (next.length >= combo.length) { setLocked(next); onDone(); return; }
    setLocked(next);
  }
  const angle = (pos / 12) * 360;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
        {combo.map((_, i) => (
          <span key={i} className={"heist-combo-slot" + (locked[i] != null ? " set" : "")}>
            {locked[i] != null ? locked[i] : "–"}
          </span>
        ))}
      </div>
      <div className="heist-safe-wrap">
        <div className="heist-safe-dial" style={{ transform: `rotate(${angle}deg)` }}>
          <div className="heist-safe-mark" />
        </div>
        <div className="heist-safe-readout">{pos}</div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10 }}>
        <button className="btn ghost" style={{ width: "auto", padding: "10px 16px" }} onClick={() => rotate(-1)}>◀</button>
        <button className="btn" style={{ width: "auto", padding: "10px 18px" }} onClick={lockIn}>{t("heistLockIn")}</button>
        <button className="btn ghost" style={{ width: "auto", padding: "10px 16px" }} onClick={() => rotate(1)}>▶</button>
      </div>
    </div>
  );
}

// Ch4 info — le rang du poids de la pièce authentique.
function LootClue({ rank, t }) {
  return (
    <p className="hint" style={{ textAlign: "center", fontWeight: 800, fontSize: 16, margin: "14px 0" }}>
      🏛️ {t("heistC4Clue")}{" "}
      <span style={{ color: "var(--p3)" }}>{t("heistRank_" + rank)}</span>
    </p>
  );
}

// Ch4 action — les 5 pièces avec leur poids ; on vole la bonne.
function LootPick({ items, onPick }) {
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", margin: "12px 0" }}>
      {items.map((it, i) => (
        <button key={i} className="heist-loot-item" onClick={() => onPick(it.icon)}>
          <span style={{ fontSize: 34 }}>{it.icon}</span>
          <span style={{ fontFamily: "'Space Mono'", fontSize: 13, color: "var(--muted)" }}>{it.weight.toFixed(1)} kg</span>
        </button>
      ))}
    </div>
  );
}

// Ch5 info — l'arc "sûr" (quand le gardien tourne le dos).
function GuardWindowClue({ start, end, t }) {
  return (
    <p className="hint" style={{ fontSize: 16, fontWeight: 700, textAlign: "center", margin: "14px 0" }}>
      🕶️ {t("heistC5Clue")}{" "}
      <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>{start}°</span>{" "}{t("heistC5Join")}{" "}
      <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>{end}°</span>
    </p>
  );
}

// Ch5 action — un marqueur tourne ; on l'arrête dans la fenêtre sûre.
function GuardStop({ period, onStop, t }) {
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
      <div className="heist-guard-wrap">
        <div className="heist-guard-needle" ref={needleRef} />
        <div className="heist-guard-center">👁️</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <button className="btn" style={{ width: "auto", padding: "12px 28px" }} onClick={stop}>{t("heistC5Stop")}</button>
      </div>
    </div>
  );
}

function ExitButton({ onPress, pressed, t }) {
  return (
    <div style={{ marginTop: 14 }}>
      <button className="heist-exit-btn" disabled={pressed} onClick={onPress}>
        {pressed ? t("heistC6Waiting") : t("heistC6Go")}
      </button>
    </div>
  );
}

// Ch6 phase 1 — le pupitre du verrou : composer SON code de 5 symboles
// (dicté par le complice). La vérification est LOCALE (chacun connaît tout
// le puzzle depuis match_start), seule la réussite est diffusée (final_ok).
function FinalVault({ pad, expected, onSuccess, onWrong, t }) {
  const [entry, setEntry] = useState([]);
  function tap(sym) {
    setEntry(prev => (prev.length >= expected.length ? prev : [...prev, sym]));
  }
  function submit() {
    const ok = entry.length === expected.length && entry.every((s, i) => s === expected[i]);
    setEntry([]);
    ok ? onSuccess() : onWrong();
  }
  return (
    <div>
      <div className="heist-final-slots">
        {Array.from({ length: expected.length }, (_, i) => (
          <span key={i} className={"heist-final-slot" + (entry[i] ? " filled" : "")}>{entry[i] || "·"}</span>
        ))}
      </div>
      <div className="heist-final-pad">
        {pad.map(sym => (
          <button key={sym} className="heist-final-key" onClick={() => tap(sym)} disabled={entry.length >= expected.length}>
            {sym}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10 }}>
        <button className="btn ghost" style={{ width: "auto", padding: "10px 16px" }} onClick={() => setEntry([])}>
          {t("heistC6Clear")}
        </button>
        <button className="btn" style={{ width: "auto", padding: "10px 16px" }} disabled={entry.length !== expected.length} onClick={submit}>
          {t("heistC6Validate")}
        </button>
      </div>
    </div>
  );
}

/* ---------- Composant principal ---------- */

export default function HeistRoom({ room, me, isHost, players, t, lang, onFinish, restartToken }) {
  const [phase, setPhase] = useState("intro"); // intro -> playing -> success | failure
  const [roles, setRoles] = useState({ A: null, B: null });
  const [puzzle, setPuzzle] = useState(null);
  const [chapter, setChapter] = useState(1); // 1..6, 7 = évasion réussie
  const [deadline, setDeadline] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TOTAL_MS);
  const [alert, setAlert] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [wrongShake, setWrongShake] = useState(false);
  const [selected, setSelected] = useState([]);
  const [channelReady, setChannelReady] = useState(false);
  const [myWin, setMyWin] = useState(false);
  const [endingVariant, setEndingVariant] = useState("standard");
  const [pressA, setPressA] = useState(null);
  const [pressB, setPressB] = useState(null);
  const [myPressed, setMyPressed] = useState(false);
  // Finale "La Joconde" (zip 82) : chaque verrou ouvert est déclaré par
  // broadcast (final_ok) et mémorisé chez les DEUX clients.
  const [finalA, setFinalA] = useState(false);
  const [finalB, setFinalB] = useState(false);

  const channelRef = useRef(null);
  const stateRef = useRef({ chapter, deadline, phase, roles, puzzle, alert, finalA, finalB });
  const autoStartedRef = useRef(false);
  const restoredRef = useRef(false);
  const savedResultRef = useRef(false);
  const feedbackTimers = useRef([]);

  useEffect(() => { stateRef.current = { chapter, deadline, phase, roles, puzzle, alert, finalA, finalB }; }, [chapter, deadline, phase, roles, puzzle, alert, finalA, finalB]);

  function saveState(patch) {
    const s = stateRef.current;
    saveGameState(room.id, "heist", {
      phase: s.phase, roleA: s.roles.A, roleB: s.roles.B, puzzle: s.puzzle,
      deadline: s.deadline, chapter: s.chapter, alert: s.alert,
      finalA: s.finalA, finalB: s.finalB, ...patch,
    });
  }

  useEffect(() => {
    const ch = supabase.channel("heist_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "match_start" }, ({ payload }) => {
      const puz = { c1: payload.c1, c2: payload.c2, c3: payload.c3, c4: payload.c4, c5: payload.c5, c6: payload.c6 };
      setRoles({ A: payload.roleA, B: payload.roleB });
      setPuzzle(puz);
      setDeadline(payload.deadline);
      setChapter(1);
      setAlert(0);
      setPhase("playing");
      setFeedback(""); setSelected([]);
      setPressA(null); setPressB(null); setMyPressed(false);
      setFinalA(false); setFinalB(false);
      setMyWin(false); setEndingVariant("standard");
      savedResultRef.current = false;
      if (isHost) {
        saveGameState(room.id, "heist", {
          phase: "playing", roleA: payload.roleA, roleB: payload.roleB,
          puzzle: puz, deadline: payload.deadline, chapter: 1, alert: 0,
          finalA: false, finalB: false,
        });
      }
    });

    ch.on("broadcast", { event: "advance" }, ({ payload }) => {
      setChapter(c => Math.max(c, payload.chapter));
      setFeedback("");
      setPressA(null); setPressB(null); setMyPressed(false);
      if (payload.chapter >= VICTORY) setPhase("success");
      if (isHost) saveState({ phase: payload.chapter >= VICTORY ? "success" : "playing", chapter: payload.chapter });
    });

    // Finale "La Joconde" : un verrou vient de s'ouvrir (phase 1). Réception
    // idempotente (passer un booléen à true est stable) — quand les deux
    // sont ouverts, chaque client affiche la phase 2 de lui-même.
    ch.on("broadcast", { event: "final_ok" }, ({ payload }) => {
      if (payload.role === "A") setFinalA(true); else setFinalB(true);
      if (isHost) saveState(payload.role === "A" ? { finalA: true } : { finalB: true });
    });

    ch.on("broadcast", { event: "alarm" }, ({ payload }) => {
      setAlert(a => Math.max(a, payload.newAlert));
      setDeadline(d => (d == null ? payload.newDeadline : Math.min(d, payload.newDeadline)));
      const secs = Math.round(TIME_PENALTY_MS / 1000);
      setFeedback(`${t("heistTripped")} (−${secs}s · +${payload.step}% ${t("heistAlertShort")})`);
      setWrongShake(true);
      feedbackTimers.current.push(setTimeout(() => setWrongShake(false), 400));
      feedbackTimers.current.push(setTimeout(() => setFeedback(""), 2400));
      if (payload.newAlert >= ALERT_MAX) {
        setPhase(p => (p === "playing" ? "failure" : p));
        if (isHost) saveState({ phase: "failure", alert: payload.newAlert, deadline: payload.newDeadline });
      } else if (isHost) {
        saveState({ alert: payload.newAlert, deadline: payload.newDeadline });
      }
    });

    ch.on("broadcast", { event: "press_a" }, ({ payload }) => setPressA(payload.ts));
    ch.on("broadcast", { event: "press_b" }, ({ payload }) => setPressB(payload.ts));
    ch.on("broadcast", { event: "sync_fail" }, () => {
      setPressA(null); setPressB(null); setMyPressed(false);
      setFeedback(t("heistC6Fail"));
      feedbackTimers.current.push(setTimeout(() => setFeedback(""), 2400));
    });

    ch.on("broadcast", { event: "timeout" }, () => {
      setPhase(p => (p === "playing" ? "failure" : p));
      if (isHost) saveState({ phase: "failure" });
    });

    ch.subscribe(status => {
      if (status === "SUBSCRIBED") {
        setChannelReady(true);
        if (!restoredRef.current) {
          restoredRef.current = true;
          const saved = readGameState(room, "heist");
          // Garde-fou zip 82 : une sauvegarde d'AVANT la finale "La Joconde"
          // (sans puzzle.c6) est ignorée — la restaurer ferait planter le
          // rendu du chapitre 6.
          if (saved && (!saved.puzzle || !saved.puzzle.c6)) {
            // rien : retour propre à l'écran d'intro
          } else if (saved) {
            setRoles({ A: saved.roleA, B: saved.roleB });
            setPuzzle(saved.puzzle);
            setDeadline(saved.deadline);
            setChapter(saved.chapter);
            setAlert(saved.alert || 0);
            setFinalA(!!saved.finalA); setFinalB(!!saved.finalB);
            setPhase(saved.phase);
            autoStartedRef.current = true;
          }
        }
      }
    });

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
      c1: genC1(), c2: genC2(), c3: genC3(), c4: genC4(), c5: genC5(), c6: genC6(),
      deadline: Date.now() + TOTAL_MS,
    };
    channelRef.current.send({ type: "broadcast", event: "match_start", payload });
  }

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

  useEffect(() => {
    if (!deadline || phase !== "playing") return;
    const iv = setInterval(() => setTimeLeft(Math.max(0, deadline - Date.now())), 200);
    return () => clearInterval(iv);
  }, [deadline, phase]);

  useEffect(() => {
    if (phase !== "playing" || !deadline) return;
    const ms = Math.max(0, deadline - Date.now());
    const tm = setTimeout(() => {
      const s = stateRef.current;
      if (s.phase === "playing" && s.chapter < VICTORY) {
        channelRef.current?.send({ type: "broadcast", event: "timeout", payload: {} });
      }
    }, ms + 60);
    return () => clearTimeout(tm);
  }, [deadline, phase]);

  function applyAlarm(step = ALERT_STEP) {
    const s = stateRef.current;
    const newAlert = Math.min(ALERT_MAX, (s.alert || 0) + step);
    const newDeadline = (s.deadline || Date.now()) - TIME_PENALTY_MS;
    channelRef.current?.send({ type: "broadcast", event: "alarm", payload: { newAlert, newDeadline, step } });
  }
  function advance(toChapter) {
    channelRef.current?.send({ type: "broadcast", event: "advance", payload: { chapter: toChapter } });
  }

  function tryC1(code) { code === puzzle.c1.solution ? advance(2) : applyAlarm(); }
  function tryC3Done() { advance(4); }
  function tryC4(icon) { icon === puzzle.c4.targetIcon ? advance(5) : applyAlarm(); }
  function tryC5(angle) {
    const { start, end } = puzzle.c5;
    (angle >= start && angle <= end) ? advance(6) : applyAlarm();
  }
  // Finale phase 1 : MON verrou vient de s'ouvrir (vérifié localement par
  // FinalVault) — on le déclare aux deux clients.
  function sendFinalOk(role) {
    channelRef.current?.send({ type: "broadcast", event: "final_ok", payload: { role } });
  }

  function pressLever(role) {
    if (myPressed) return;
    setMyPressed(true);
    channelRef.current?.send({ type: "broadcast", event: role === "A" ? "press_a" : "press_b", payload: { ts: Date.now() } });
  }

  useEffect(() => {
    if (pressA == null || pressB == null) return;
    if (Math.abs(pressA - pressB) <= SYNC_WINDOW_MS) advance(VICTORY);
    else channelRef.current?.send({ type: "broadcast", event: "sync_fail", payload: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pressA, pressB]);

  useEffect(() => {
    if ((phase !== "success" && phase !== "failure") || savedResultRef.current) return;
    const amAr = roles.A && me.id === roles.A.id;
    const amBr = roles.B && me.id === roles.B.id;
    if (!amAr && !amBr) return;
    savedResultRef.current = true;

    let variant;
    const won = phase === "success";
    if (won) {
      // Seuils recalés sur la ronde de 6 min (zip 82) : "clean" au-delà de
      // 2 min 30 restantes, "narrow" sous 45 s ou à forte alerte.
      variant = (alert <= 20 && timeLeft > 150 * 1000) ? "clean" : (alert >= 60 || timeLeft < 45 * 1000) ? "narrow" : "standard";
    } else {
      variant = alert >= ALERT_MAX ? "caught" : "spotted";
    }
    setEndingVariant(variant);
    setMyWin(won);
    recordMatchResult(room.id, won);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function rejouer() {
    if (!isHost || !roles.A || !roles.B) return;
    const [roleA, roleB] = Math.random() < 0.5 ? [roles.A, roles.B] : [roles.B, roles.A];
    const payload = {
      roleA, roleB,
      c1: genC1(), c2: genC2(), c3: genC3(), c4: genC4(), c5: genC5(), c6: genC6(),
      deadline: Date.now() + TOTAL_MS,
    };
    channelRef.current.send({ type: "broadcast", event: "match_start", payload });
  }

  // "Terminer la partie" (demande 2026-07, page du salon) : la pastille
  // globale rappelle rejouer() via ce jeton — voir DiapasonGame.js pour le
  // détail du mécanisme (identique dans tous les jeux).
  useEffect(() => {
    if (!restartToken) return;
    rejouer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartToken]);

  async function backToLobby() {
    await resetRoomToLobby(room.id);
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
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("heistC1Title")}</h2>
        <p className="hint">{t("heistC1Story")}</p>
        {!isPlayer ? <p className="muted">{t("heistSpectatorNote")}</p> : amA ? (
          <><p className="muted">{t("heistC1TextInfo")}</p><WireLegend legend={puzzle.c1.legend} /></>
        ) : (
          <><p className="muted">{t("heistC1TextAction")}</p><KeypadInput sequence={puzzle.c1.sequence} onSubmit={tryC1} t={t} /></>
        )}
      </div>
    );
    if (chapter === 2) return (
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("heistC2Title")}</h2>
        <p className="hint">{t("heistC2Story")}</p>
        {!isPlayer ? <p className="muted">{t("heistSpectatorNote")}</p> : amB ? (
          <><p className="muted">{t("heistC2TextInfo")}</p><LaserMap safe={puzzle.c2.safe} /></>
        ) : (
          <><p className="muted">{t("heistC2TextAction")}</p>
            <LaserCross safe={puzzle.c2.safe} onWrong={() => applyAlarm(ALERT_STEP_LASER)} onDone={() => advance(3)} /></>
        )}
      </div>
    );
    if (chapter === 3) return (
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("heistC3Title")}</h2>
        <p className="hint">{t("heistC3Story")}</p>
        {!isPlayer ? <p className="muted">{t("heistSpectatorNote")}</p> : amA ? (
          <><p className="muted">{t("heistC3TextInfo")}</p><ComboClue combo={puzzle.c3.combo} /></>
        ) : (
          <><p className="muted">{t("heistC3TextAction")}</p>
            <SafeDial combo={puzzle.c3.combo} onWrong={() => applyAlarm()} onDone={tryC3Done} t={t} /></>
        )}
      </div>
    );
    if (chapter === 4) return (
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("heistC4Title")}</h2>
        <p className="hint">{t("heistC4Story")}</p>
        {!isPlayer ? <p className="muted">{t("heistSpectatorNote")}</p> : amB ? (
          <><p className="muted">{t("heistC4TextInfo")}</p><LootClue rank={puzzle.c4.rank} t={t} /></>
        ) : (
          <><p className="muted">{t("heistC4TextAction")}</p><LootPick items={puzzle.c4.items} onPick={tryC4} /></>
        )}
      </div>
    );
    if (chapter === 5) return (
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("heistC5Title")}</h2>
        <p className="hint">{t("heistC5Story")}</p>
        {!isPlayer ? <p className="muted">{t("heistSpectatorNote")}</p> : amA ? (
          <><p className="muted">{t("heistC5TextInfo")}</p><GuardWindowClue start={puzzle.c5.start} end={puzzle.c5.end} t={t} /></>
        ) : (
          <><p className="muted">{t("heistC5TextAction")}</p><GuardStop period={GUARD_PERIOD_MS} onStop={tryC5} t={t} /></>
        )}
      </div>
    );
    if (chapter === 6) {
      // FINALE "La Joconde" (zip 82) — deux phases, voulues plus longues et
      // plus dures que les coups précédents :
      //   1. double verrou à codes croisés (chacun compose SON code de 5
      //      symboles, dicté par l'autre, pupitres mélangés différemment) ;
      //   2. décrochage synchronisé, fenêtre resserrée à 700 ms.
      const bothOpen = finalA && finalB;
      const myDone = amA ? finalA : finalB;
      const clue = amA ? puzzle.c6.codeB : puzzle.c6.codeA;
      return (
        <div>
          <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("heistC6Title")}</h2>
          {!isPlayer ? (
            <><p className="hint">{t("heistC6Story")}</p><p className="muted">{t("heistSpectatorNote")}</p></>
          ) : bothOpen ? (
            <>
              <p className="hint">{t("heistC6Phase2Story")}</p>
              <ExitButton onPress={() => pressLever(amA ? "A" : "B")} pressed={myPressed} t={t} />
            </>
          ) : (
            <>
              <p className="hint">{t("heistC6Story")}</p>
              <p className="muted" style={{ marginTop: 8 }}>{t("heistC6ClueLead")}</p>
              <div className="heist-final-clue">
                {clue.map((s, i) => <span key={i} className="sym">{s}</span>)}
              </div>
              {myDone ? (
                <div style={{ textAlign: "center" }}>
                  <span className="heist-final-done">✅ {t("heistC6Done")}</span>
                </div>
              ) : (
                <>
                  <p className="muted">{t("heistC6PadLead")}</p>
                  <FinalVault
                    pad={amA ? puzzle.c6.padA : puzzle.c6.padB}
                    expected={amA ? puzzle.c6.codeA : puzzle.c6.codeB}
                    onSuccess={() => sendFinalOk(amA ? "A" : "B")}
                    onWrong={() => applyAlarm()}
                    t={t}
                  />
                </>
              )}
            </>
          )}
        </div>
      );
    }
    return null;
  }

  return (
    <div className="panel" style={{ maxWidth: "min(820px, 94vw)" }}>
      <h1>{t("heistTitle")}</h1>

      {phase === "playing" && (
        <>
          {isPlayer && <div className="heist-role-badge">🕵️ {amA ? t("heistRoleA") : t("heistRoleB")}</div>}
          <HeistAtmosphere chapter={chapter} alert={alert} />
          <AlertMeter alert={alert} t={t} />
          <div className="echo-timerbar">
            <div className="echo-timerbar-fill" style={{
              width: (timeLeft / TOTAL_MS * 100) + "%",
              background: timeLeft < 60000 ? "var(--p1)" : timeLeft < TOTAL_MS * 0.35 ? "var(--p4)" : "linear-gradient(90deg,var(--acc-heist),#FF7AA0)"
            }} />
          </div>
          <div style={{ display: "flex", gap: 5, margin: "0 0 12px", flexWrap: "wrap" }}>
            {Array.from({ length: TOTAL_CHAPTERS }, (_, i) => i + 1).map(n => (
              <div key={n} className={"progress-dot" + (chapter > n ? " done" : "")} />
            ))}
          </div>
          <div className="heist-comm-banner">{t("heistCommunicate")}</div>
        </>
      )}

      {feedback && (
        <p className="err" style={{ marginBottom: 10, animation: wrongShake ? "shakeRow .4s" : "none" }}>{feedback}</p>
      )}

      <Crossfade id={phase === "playing" ? "ch" + chapter : phase}>
        {phase === "intro" && (
          players.length < 2 ? <p className="muted">{t("heistNotEnough")}</p>
          : !needsPick ? <p className="muted">{t("heistStarting")}</p>
          : isHost ? (
            <div>
              <p className="hint">{t("heistPickHint")}</p>
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
              <button className="btn" disabled={selected.length !== 2} onClick={confirmPick}>{t("heistPickConfirm")}</button>
            </div>
          ) : <p className="muted">{t("heistWaitPick")}</p>
        )}

        {phase === "playing" && (
          <div>
            <p className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 2 }}>
              {t("heistStepLabel")} {Math.min(chapter, TOTAL_CHAPTERS)}/{TOTAL_CHAPTERS}
            </p>
            {renderChapterContent()}
          </div>
        )}

        {(phase === "success" || phase === "failure") && (
          <div>
            <h2 style={{ fontSize: 22 }}>{t("heistEnd" + endingVariant.charAt(0).toUpperCase() + endingVariant.slice(1) + "Title")}</h2>
            <p className="hint">{t("heistEnd" + endingVariant.charAt(0).toUpperCase() + endingVariant.slice(1) + "Text")}</p>
            {isHost ? (
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button className="btn" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={rejouer}>🔁 {t("c4Rejouer")}</button>
                <button className="btn ghost" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={backToLobby}>{t("backLounge")}</button>
              </div>
            ) : <p className="muted">{t("hostBrings")}</p>}
          </div>
        )}
      </Crossfade>
    </div>
  );
}
