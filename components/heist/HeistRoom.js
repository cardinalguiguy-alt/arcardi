"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby, recordMatchResult } from "@/lib/gameSync";
import { playConfirmChime, playAnswerWrong, playGameWin, playGameLose } from "@/lib/sfx";
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

const TOTAL_MS = 8 * 60 * 1000;        // 8 minutes : ronde rallongée pour absorber le chapitre labyrinthe (2026-07)
const TIME_PENALTY_MS = 15 * 1000;     // temps grignoté par mauvaise tentative
const ALERT_MAX = 100;                 // jauge pleine => repérés
const ALERT_STEP = 20;                 // +20 % par mauvaise tentative (≈5 fautes)
const ALERT_STEP_LASER = 12;           // frôlement de laser : moins puni (mais reset)
const SYNC_WINDOW_MS = 700;            // fenêtre de synchro du décrochage (finale, resserrée)
const GUARD_PERIOD_MS = 4000;          // période du marqueur de garde (ch.5)
const TOTAL_CHAPTERS = 7;              // +1 : chapitre labyrinthe inséré en ch.6, La Joconde passe en ch.7 (2026-07)
const VICTORY = TOTAL_CHAPTERS + 1;    // "chapter" atteint 8 => victoire

/* ---------- Chapitre 6 : LABYRINTHE à la lampe torche (2026-07) ----------
   Escape room asymétrique : un joueur (l'EXPLORATEUR) avance dans un
   labyrinthe sombre, torche à la main ; l'autre (le GUIDE) voit le plan
   complet et le garde, et dicte le chemin. La torche tombe en panne à
   mi-parcours (guidage à la voix, 3 erreurs = perdu) et se rallume sur la
   dernière ligne droite. Un garde SOMNOLANT part du fond et remonte vers le
   joueur ; combinaison de camouflage activable 20 s. La géométrie du
   labyrinthe est générée par l'hôte au match_start et partagée (les DEUX
   clients bâtissent la même grille) ; l'explorateur fait AUTORITÉ sur la
   simulation (position, garde) et diffuse `maze_pos`, que le guide affiche. */
const MAZE_N = 11;
const MAZE_BIT = { N: 1, S: 2, E: 4, W: 8 };
function genMaze(n = MAZE_N) {
  const cells = new Array(n * n).fill(0);
  const seen = new Array(n * n).fill(false);
  const idx = (x, y) => y * n + x;
  const D = [[0, -1, MAZE_BIT.N, MAZE_BIT.S], [0, 1, MAZE_BIT.S, MAZE_BIT.N], [1, 0, MAZE_BIT.E, MAZE_BIT.W], [-1, 0, MAZE_BIT.W, MAZE_BIT.E]];
  const st = [[0, 0]]; seen[0] = true;
  while (st.length) {
    const [cx, cy] = st[st.length - 1];
    const opts = D.filter(([dx, dy]) => { const nx = cx + dx, ny = cy + dy; return nx >= 0 && ny >= 0 && nx < n && ny < n && !seen[idx(nx, ny)]; });
    if (!opts.length) { st.pop(); continue; }
    const [dx, dy, bf, bt] = opts[Math.floor(Math.random() * opts.length)];
    const nx = cx + dx, ny = cy + dy;
    cells[idx(cx, cy)] |= bf; cells[idx(nx, ny)] |= bt; seen[idx(nx, ny)] = true; st.push([nx, ny]);
  }
  return { n, cells, start: [0, 0], exit: [n - 1, n - 1] };
}
function mazePassable(maze, x, y, dx, dy) {
  const bit = dx === 1 ? MAZE_BIT.E : dx === -1 ? MAZE_BIT.W : dy === 1 ? MAZE_BIT.S : MAZE_BIT.N;
  return (maze.cells[y * maze.n + x] & bit) !== 0;
}
function mazeBfs(maze, tx, ty) {
  const n = maze.n;
  const d = new Array(n * n).fill(Infinity);
  d[ty * n + tx] = 0;
  const q = [[tx, ty]];
  while (q.length) {
    const [x, y] = q.shift();
    [[0, -1], [0, 1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) return;
      if (mazePassable(maze, x, y, dx, dy) && d[ny * n + nx] > d[y * n + x] + 1) { d[ny * n + nx] = d[y * n + x] + 1; q.push([nx, ny]); }
    });
  }
  return d;
}

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

// Overlay "Salle des États" : texte sur fond noir affiché à la résolution du
// labyrinthe, avant La Joconde (demande de Guillaume, 2026-07).
function SalleOverlay({ t, onClose }) {
  return (
    <div className="heist-salle-overlay">
      <div className="heist-salle-card">
        <h3>{t("heistSalleTitle")}</h3>
        <p>{t("heistSalleText")}</p>
        <button className="btn" style={{ width: "auto", padding: "12px 20px", margin: "18px auto 0" }} onClick={onClose}>{t("heistSalleContinue")}</button>
      </div>
    </div>
  );
}

/* Chapitre 6 — LABYRINTHE. Composant temps réel autonome (canvas), rôles
   asymétriques. L'EXPLORATEUR simule tout (mouvement clavier/pavé, garde
   somnolant, torche directionnelle qui meurt à mi-parcours puis se rallume,
   camouflage 20 s) et diffuse `maze_pos` via onMove ; le GUIDE (et les
   spectateurs) n'affichent que le plan complet à partir de `net`. Rendu au
   canvas (pas de state React par frame) — même discipline que Puzzle/Naval. */
function MazeChapter({ role, maze, net, avatar, onMove, onSolve, onFail, t }) {
  const canvasRef = useRef(null);
  const simRef = useRef(null);
  const netRef = useRef(net);
  const cbRef = useRef({ onMove, onSolve, onFail });
  const rafRef = useRef(0);
  const [hud, setHud] = useState({ phase: "torch", strikes: 0, camo: "ready", camoLeft: 0, guardTxt: "", batt: 100 });

  useEffect(() => { netRef.current = net; }, [net]);
  useEffect(() => { cbRef.current = { onMove, onSolve, onFail }; }, [onMove, onSolve, onFail]);

  const N = maze.n;
  const CANVAS = 330, OX = 6, OY = 6, CELL = (CANVAS - 2 * OX) / N;
  const isExplorer = role === "explorer";

  function cellCenter(x, y) { return [OX + x * CELL + CELL / 2, OY + y * CELL + CELL / 2]; }

  function drawWalls(ctx, litFn) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const a = litFn(x, y); if (a <= 0.02) continue;
      const X = OX + x * CELL, Y = OY + y * CELL, bits = maze.cells[y * N + x];
      const seg = (x1, y1, x2, y2) => {
        ctx.globalAlpha = a; ctx.lineCap = "round";
        ctx.strokeStyle = "#6b6257"; ctx.lineWidth = 5.5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.strokeStyle = "#a79c86"; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.strokeStyle = "rgba(255,247,220,.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      };
      if (!(bits & MAZE_BIT.N)) seg(X, Y, X + CELL, Y);
      if (!(bits & MAZE_BIT.S)) seg(X, Y + CELL, X + CELL, Y + CELL);
      if (!(bits & MAZE_BIT.W)) seg(X, Y, X, Y + CELL);
      if (!(bits & MAZE_BIT.E)) seg(X + CELL, Y, X + CELL, Y + CELL);
      ctx.globalAlpha = a; ctx.fillStyle = "#8a8072";
      [[X, Y], [X + CELL, Y], [X, Y + CELL], [X + CELL, Y + CELL]].forEach(([jx, jy]) => { ctx.beginPath(); ctx.arc(jx, jy, 3, 0, 7); ctx.fill(); });
    }
    ctx.globalAlpha = 1;
  }

  // Facteur d'éclairage torche directionnelle (amplitude volontairement courte).
  function litFactor(sim, x, y) {
    const [cx, cy] = cellCenter(x, y); const [ax, ay] = cellCenter(sim.px, sim.py);
    const d = Math.hypot(cx - ax, cy - ay);
    const spill = CELL * 0.95, R = CELL * 2.5;
    if (d < spill) return 1;
    if (d > R) return 0;
    const fa = Math.atan2(sim.face.y, sim.face.x), ca = Math.atan2(cy - ay, cx - ax);
    let diff = Math.abs(ca - fa); if (diff > Math.PI) diff = 2 * Math.PI - diff;
    const cone = 0.8;
    if (diff > cone) return 0;
    return Math.max(0, Math.min(1, (1 - d / R) * (1 - diff / cone) * 1.3));
  }

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    const dist = mazeBfs(maze, maze.exit[0], maze.exit[1]);
    const distStart = mazeBfs(maze, maze.start[0], maze.start[1]);
    const total = dist[maze.start[1] * N + maze.start[0]] || 1;
    let guardTimer = 0, hudTimer = 0;

    // ----- EXPLORATEUR : simulation autoritaire -----
    if (isExplorer) {
      const now0 = performance.now();
      const sim = {
        px: maze.start[0], py: maze.start[1], face: { x: 0, y: 1 },
        phase: "torch", strikes: 0, maxProg: 0, camoUntil: 0, camoCoolUntil: 0, done: false,
        guard: { x: maze.exit[0], y: maze.exit[1], from: { x: maze.exit[0], y: maze.exit[1] }, sleepUntil: 0, nextSleepAt: now0 + (14000 + Math.random() * 16000) },
      };
      simRef.current = sim;
      const camoActive = () => performance.now() < sim.camoUntil;
      const guardAwake = () => performance.now() >= sim.guard.sleepUntil;

      function pushNet() {
        cbRef.current.onMove && cbRef.current.onMove({
          px: sim.px, py: sim.py, fx: sim.face.x, fy: sim.face.y,
          gx: sim.guard.x, gy: sim.guard.y, asleep: !guardAwake(), phase: sim.phase,
          camo: camoActive(), strikes: sim.strikes,
        });
      }
      function refreshHud() {
        const nowp = performance.now();
        const batt = sim.phase === "dark" ? 0 : sim.phase === "last" ? 60 : Math.max(0, Math.round((1 - sim.maxProg / 0.5) * 100));
        let camo = "ready", camoLeft = 0;
        if (camoActive()) { camo = "on"; camoLeft = Math.ceil((sim.camoUntil - nowp) / 1000); }
        else if (nowp < sim.camoCoolUntil) { camo = "cool"; camoLeft = Math.ceil((sim.camoCoolUntil - nowp) / 1000); }
        const gd = Math.abs(sim.guard.x - sim.px) + Math.abs(sim.guard.y - sim.py);
        const guardTxt = !guardAwake() ? "sleep" : (gd <= 2 ? "near" : "far");
        setHud({ phase: sim.phase, strikes: sim.strikes, camo, camoLeft, guardTxt, batt });
      }
      function fail() { if (sim.done) return; sim.done = true; cbRef.current.onFail && cbRef.current.onFail(); }
      function solve() { if (sim.done) return; sim.done = true; cbRef.current.onSolve && cbRef.current.onSolve(); }
      function checkGuard() {
        if (sim.done || !guardAwake() || camoActive()) return;
        const gd = Math.abs(sim.guard.x - sim.px) + Math.abs(sim.guard.y - sim.py);
        if (gd === 0) { fail(); return; }
        if (gd === 1) { const dx = sim.px - sim.guard.x, dy = sim.py - sim.guard.y; if (mazePassable(maze, sim.guard.x, sim.guard.y, dx, dy)) fail(); }
      }
      function move(dx, dy) {
        if (sim.done) return;
        sim.face = { x: dx, y: dy };
        if (!mazePassable(maze, sim.px, sim.py, dx, dy)) {
          if (sim.phase === "dark") { sim.strikes++; if (sim.strikes >= 3) { refreshHud(); fail(); return; } }
          refreshHud(); pushNet(); return;
        }
        sim.px += dx; sim.py += dy;
        const prog = (total - dist[sim.py * N + sim.px]) / total;
        if (prog > sim.maxProg) sim.maxProg = prog;
        sim.phase = sim.maxProg < 0.5 ? "torch" : (sim.maxProg < 0.82 ? "dark" : "last");
        checkGuard();
        if (sim.px === maze.exit[0] && sim.py === maze.exit[1]) { refreshHud(); pushNet(); solve(); return; }
        refreshHud(); pushNet();
      }
      function camo() {
        const nowp = performance.now();
        if (nowp < sim.camoCoolUntil || camoActive()) return;
        sim.camoUntil = nowp + 20000; sim.camoCoolUntil = sim.camoUntil + 8000; refreshHud(); pushNet();
      }
      function guardStep() {
        if (sim.done) return;
        const nowp = performance.now();
        if (nowp < sim.guard.sleepUntil) { refreshHud(); return; }
        if (nowp >= sim.guard.nextSleepAt) { sim.guard.sleepUntil = nowp + (7000 + Math.random() * 3000); sim.guard.nextSleepAt = sim.guard.sleepUntil + (25000 + Math.random() * 25000); refreshHud(); pushNet(); return; }
        const g = sim.guard;
        let opts = [[0, -1], [0, 1], [1, 0], [-1, 0]].filter(([dx, dy]) => mazePassable(maze, g.x, g.y, dx, dy)).map(([dx, dy]) => ({ x: g.x + dx, y: g.y + dy }));
        if (!opts.length) return;
        opts.sort((a, b) => distStart[a.y * N + a.x] - distStart[b.y * N + b.x]);
        let nxt;
        if (Math.random() < 0.72) nxt = opts[0];
        else { const nb = opts.filter(o => !(o.x === g.from.x && o.y === g.from.y)); const pool = nb.length ? nb : opts; nxt = pool[Math.floor(Math.random() * pool.length)]; }
        g.from = { x: g.x, y: g.y }; g.x = nxt.x; g.y = nxt.y;
        checkGuard(); refreshHud(); pushNet();
      }

      simRef.current.move = move; simRef.current.camo = camo;
      const onKey = e => {
        const m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
        if (m[e.key]) { e.preventDefault(); move(m[e.key][0], m[e.key][1]); }
        else if (e.key === " ") { e.preventDefault(); camo(); }
      };
      window.addEventListener("keydown", onKey);
      guardTimer = setInterval(guardStep, 1150);
      hudTimer = setInterval(refreshHud, 500);
      refreshHud(); pushNet();

      function draw() {
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, CANVAS, CANVAS);
        const [ax, ay] = cellCenter(sim.px, sim.py);
        if (sim.phase !== "dark") {
          const R = CELL * 2.5 * (1 + Math.sin(performance.now() / 120) * 0.03);
          const fa = Math.atan2(sim.face.y, sim.face.x);
          ctx.save(); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.arc(ax, ay, R, fa - 0.8, fa + 0.8); ctx.closePath(); ctx.clip();
          const g = ctx.createRadialGradient(ax, ay, 3, ax, ay, R);
          g.addColorStop(0, "rgba(255,240,205,.95)"); g.addColorStop(.5, "rgba(255,228,175,.45)"); g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g; ctx.fillRect(0, 0, CANVAS, CANVAS); ctx.restore();
          const g2 = ctx.createRadialGradient(ax, ay, 2, ax, ay, CELL * 0.95);
          g2.addColorStop(0, "rgba(255,240,205,.6)"); g2.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(ax, ay, CELL * 0.95, 0, 7); ctx.fill();
          drawWalls(ctx, (x, y) => litFactor(sim, x, y));
        } else {
          const g2 = ctx.createRadialGradient(ax, ay, 2, ax, ay, CELL * 0.7);
          g2.addColorStop(0, "rgba(120,120,140,.35)"); g2.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(ax, ay, CELL * 0.7, 0, 7); ctx.fill();
        }
        // garde : lampe rouge (visible même dans le noir), silhouette si éclairée
        const [gx, gy] = cellCenter(sim.guard.x, sim.guard.y);
        const asleep = !guardAwake();
        const rr = ctx.createRadialGradient(gx, gy, 2, gx, gy, CELL * 1.35);
        rr.addColorStop(0, "rgba(255,55,45," + (asleep ? 0.14 : 0.42) + ")"); rr.addColorStop(1, "rgba(255,55,45,0)");
        ctx.fillStyle = rr; ctx.beginPath(); ctx.arc(gx, gy, CELL * 1.35, 0, 7); ctx.fill();
        const gLit = sim.phase !== "dark" ? litFactor(sim, sim.guard.x, sim.guard.y) : 0;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        if (gLit > 0.12) { ctx.globalAlpha = Math.min(1, gLit * 1.5); ctx.font = "18px serif"; ctx.fillText("👮", gx, gy); ctx.globalAlpha = 1; }
        ctx.globalAlpha = camoActive() ? 0.5 : 1; ctx.font = "18px serif"; ctx.fillText(avatar || "🙂", ax, ay); ctx.globalAlpha = 1;
        rafRef.current = requestAnimationFrame(draw);
      }
      rafRef.current = requestAnimationFrame(draw);
      return () => { window.removeEventListener("keydown", onKey); clearInterval(guardTimer); clearInterval(hudTimer); cancelAnimationFrame(rafRef.current); };
    }

    // ----- GUIDE / SPECTATEUR : plan complet à partir de `net` -----
    function draw() {
      const nt = netRef.current;
      ctx.fillStyle = "#0b0a07"; ctx.fillRect(0, 0, CANVAS, CANVAS);
      drawWalls(ctx, () => 1);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const [exx, exy] = cellCenter(maze.exit[0], maze.exit[1]);
      ctx.font = "17px serif"; ctx.fillText("🖼️", exx, exy);
      if (nt) {
        const [gx, gy] = cellCenter(nt.gx, nt.gy);
        const rg = ctx.createRadialGradient(gx, gy, 2, gx, gy, CELL * 1.6);
        rg.addColorStop(0, "rgba(255,60,50," + (nt.asleep ? 0.10 : 0.34) + ")"); rg.addColorStop(1, "rgba(255,60,50,0)");
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(gx, gy, CELL * 1.6, 0, 7); ctx.fill();
        ctx.font = "18px serif"; ctx.fillText("👮", gx, gy);
        if (nt.asleep) { ctx.font = "13px serif"; ctx.fillText("💤", gx + CELL * 0.55, gy - CELL * 0.45); }
        const [ax, ay] = cellCenter(nt.px, nt.py);
        ctx.globalAlpha = nt.camo ? 0.5 : 1; ctx.font = "18px serif"; ctx.fillText(avatar || "🙂", ax, ay); ctx.globalAlpha = 1;
      }
      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); clearInterval(guardTimer); clearInterval(hudTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, maze]);

  const nt = net;
  return (
    <div className="heist-maze">
      <canvas ref={canvasRef} width={CANVAS} height={CANVAS} className="heist-maze-canvas" />
      {isExplorer ? (
        <div className="heist-maze-controls">
          <div className="heist-maze-hud">
            <span className={"heist-maze-chip" + (hud.phase === "dark" ? " warn" : hud.phase === "last" ? " ok" : "")}>
              {hud.phase === "dark" ? "🌑 " + t("heistMazeTorchOut") : hud.phase === "last" ? "🔦 " + t("heistMazeTorchBack") : "🔦 " + t("heistMazeTorchOn")}
            </span>
            <span className="heist-maze-batt"><i style={{ width: hud.batt + "%" }} /></span>
            <span className={"heist-maze-chip" + (hud.guardTxt === "near" ? " warn" : hud.guardTxt === "sleep" ? " ok" : "")}>
              {hud.guardTxt === "sleep" ? "👮 💤" : hud.guardTxt === "near" ? "👮 ‼" : "👮"}
            </span>
            <span className="heist-maze-strikes">{["", "❌", "❌❌", "❌❌❌"][Math.min(3, hud.strikes)]}</span>
          </div>
          <div className="heist-maze-dpad">
            <span />
            <button onClick={() => simRef.current && simRef.current.move(0, -1)}>▲</button>
            <span />
            <button onClick={() => simRef.current && simRef.current.move(-1, 0)}>◀</button>
            <button className="camo" disabled={hud.camo !== "ready"} onClick={() => simRef.current && simRef.current.camo()}>
              {hud.camo === "on" ? "🫥" + hud.camoLeft : hud.camo === "cool" ? "…" + hud.camoLeft : "🫥"}
            </button>
            <button onClick={() => simRef.current && simRef.current.move(1, 0)}>▶</button>
            <span />
            <button onClick={() => simRef.current && simRef.current.move(0, 1)}>▼</button>
            <span />
          </div>
        </div>
      ) : (
        <p className="muted heist-maze-guidenote">
          {t("heistMazeGuideNote")}
          {nt && nt.asleep ? " " + t("heistMazeGuardSleeps") : nt && nt.phase === "dark" ? " " + t("heistMazeDarkNote") : ""}
        </p>
      )}
    </div>
  );
}

export default function HeistRoom({ room, me, isHost, players, t, lang, onFinish }) {
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
  // Chapitre 6 labyrinthe (2026-07) : état réseau diffusé par l'explorateur
  // (affiché par le guide), et texte "Salle des États" montré à la résolution.
  const [mazeNet, setMazeNet] = useState(null);
  const [showSalleText, setShowSalleText] = useState(false);

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
      const puz = { c1: payload.c1, c2: payload.c2, c3: payload.c3, c4: payload.c4, c5: payload.c5, c6: payload.c6, maze: payload.maze };
      setRoles({ A: payload.roleA, B: payload.roleB });
      setPuzzle(puz);
      setDeadline(payload.deadline);
      setChapter(1);
      setAlert(0);
      setPhase("playing");
      setFeedback(""); setSelected([]);
      setPressA(null); setPressB(null); setMyPressed(false);
      setFinalA(false); setFinalB(false);
      setMazeNet(null); setShowSalleText(false);
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

    // Chapitre 6 : position temps réel diffusée par l'explorateur, affichée par
    // le guide (et les spectateurs).
    ch.on("broadcast", { event: "maze_pos" }, ({ payload }) => setMazeNet(payload));

    ch.on("broadcast", { event: "advance" }, ({ payload }) => {
      playConfirmChime(); // SFX (2026-07) : étape franchie, chez les deux joueurs
      setChapter(c => Math.max(c, payload.chapter));
      setFeedback("");
      setPressA(null); setPressB(null); setMyPressed(false);
      if (payload.chapter === 7) setShowSalleText(true); // sortie du labyrinthe -> Salle des États
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
      playAnswerWrong(); // SFX (2026-07) : alarme déclenchée, chez les deux joueurs
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
          // Garde-fou : une sauvegarde d'un ANCIEN format (sans la finale
          // "La Joconde" puzzle.c6, ou sans le labyrinthe puzzle.maze ajouté au
          // zip 138) est ignorée — la restaurer ferait planter le rendu.
          if (saved && (!saved.puzzle || !saved.puzzle.c6 || !saved.puzzle.maze)) {
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
      c1: genC1(), c2: genC2(), c3: genC3(), c4: genC4(), c5: genC5(), c6: genC6(), maze: genMaze(),
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
    if (won) playGameWin(); else playGameLose(); // SFX fin de partie (2026-07)
    recordMatchResult(room.id, won);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function rejouer() {
    if (!isHost || !roles.A || !roles.B) return;
    const [roleA, roleB] = Math.random() < 0.5 ? [roles.A, roles.B] : [roles.B, roles.A];
    const payload = {
      roleA, roleB,
      c1: genC1(), c2: genC2(), c3: genC3(), c4: genC4(), c5: genC5(), c6: genC6(), maze: genMaze(),
      deadline: Date.now() + TOTAL_MS,
    };
    channelRef.current.send({ type: "broadcast", event: "match_start", payload });
  }


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
      // CHAPITRE LABYRINTHE (2026-07) — escape room asymétrique à la lampe
      // torche (voir le composant MazeChapter en tête de fichier).
      const explorerAvatar = (roles.A && roles.A.avatar) || "🙂";
      const myRole = amA ? "explorer" : amB ? "guide" : "spectator";
      return (
        <div>
          <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("heistMazeTitle")}</h2>
          <p className="hint">{t("heistMazeStory")}</p>
          {!isPlayer ? <p className="muted">{t("heistSpectatorNote")}</p>
            : <p className="muted">{amA ? t("heistMazeYouExplorer") : t("heistMazeYouGuide")}</p>}
          <MazeChapter
            role={myRole}
            maze={puzzle.maze}
            net={mazeNet}
            avatar={explorerAvatar}
            onMove={p => channelRef.current?.send({ type: "broadcast", event: "maze_pos", payload: p })}
            onSolve={() => advance(7)}
            onFail={() => applyAlarm(ALERT_MAX)}
            t={t}
          />
        </div>
      );
    }
    if (chapter === 7) {
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
          {showSalleText && <SalleOverlay t={t} onClose={() => setShowSalleText(false)} />}
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
