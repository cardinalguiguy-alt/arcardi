"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby, recordMatchResult } from "@/lib/gameSync";
import { playConfirmChime, playAnswerWrong, playGameWin, playGameLose } from "@/lib/sfx";
import Crossfade from "./Crossfade";
import EchoesFinale from "./echoes/EchoesFinale";

/* ==========================================================================
   ÉCHOS v3 — escape room coopératif ASYMÉTRIQUE à 2 joueurs (pattern n°3)
   ==========================================================================
   Chaque rôle (A / B) est ENFERMÉ dans sa propre pièce scellée : aucune vue
   partagée, aucun arbitre. La seule vérité commune est un petit historique
   d'événements (broadcast, self:true) que les deux clients appliquent
   chacun de leur côté, de façon idempotente :
     - "match_start" : l'hôte génère la partie ENTIÈRE (rôles + 9 énigmes +
       horodatage de fin) et l'envoie une fois pour toutes. Les deux clients
       adoptent exactement les mêmes données ; seul le RENDU diffère ensuite
       selon le rôle — aucune re-génération locale, donc aucun risque de
       désynchronisation.
     - "advance" : diffusé par le joueur qui vient de résoudre SON étape
       (vérifiée localement, comme Piano Escape Room) ; les deux avancent.
     - "penalty" : une mauvaise tentative (ou un coup d'œil mémoire payant)
       réduit l'horodatage de fin partagé — toujours par diffusion, jamais
       localement, pour que le compte à rebours reste identique partout.
     - "press_a" / "press_b" : le levier final. Aucun arbitre nécessaire :
       les deux clients reçoivent les deux horodatages (self:true) et
       calculent chacun de leur côté si la synchronisation est assez bonne.
   v3 (zip 82, demande "allonger le jeu") : 3 nouvelles épreuves à mécaniques
   INÉDITES — vannes à configurer (Salle des Machines), lampes à bascule
   croisée façon lights-out (Lampisterie), tracé de constellation sur grille
   repérée (Carte des Étoiles) — soit 10 chapitres en 18 minutes. L'ordre du
   flux ALTERNE le joueur qui manipule à chaque chapitre (B,A,B,A…), le 10e
   restant symétrique : les deux actionnent leur propre levier.
   ========================================================================== */

const TOTAL_MS = 22 * 60 * 1000;     // 22 minutes pour les 16 chapitres (v4, durée validée par Guillaume)
const PENALTY_MS = 20 * 1000;        // -20s par mauvaise tentative
const PENALTY_KEY_MS = 60 * 1000;    // -1 min : mauvaise clé essayée sur le cadenas du final (v4, validé)
const PENALTY_PEEK_MS = 15 * 1000;   // -15s par coup d'œil mémoire supplémentaire
const DIAL_PERIOD_MS = 4200;         // durée d'un tour complet de l'aiguille (cadran)
const SYNC_WINDOW_MS = 900;          // fenêtre de synchro des leviers du final
const MEMORY_REVEAL_MS = 6000;       // durée d'affichage initial de la séquence (mémoire)
const MEMORY_PEEK_MS = 3000;         // durée d'un coup d'œil supplémentaire (mémoire)
const TOTAL_CHAPTERS = 16;
const VICTORY = TOTAL_CHAPTERS + 1;  // "chapter" atteint 17 => victoire

// Ordre du flux v4 : le numéro de chapitre (1..16) est mappé sur un TYPE
// d'épreuve. Les 6 nouvelles mécaniques (soute, pipes, fanal, mirrors,
// maze, jars) sont intercalées de sorte que le joueur qui MANIPULE alterne
// à chaque chapitre (B,A,B,A,...) : personne ne reste "lecteur d'indices"
// deux étapes de suite. Manipulateur par type (constaté dans le rendu) :
//   B : code, memory, dial, lights, pattern, soute, fanal, maze
//   A : gears, valves, decor, cipher, pipes, mirrors, jars
// Le final "naufrage" (Le Naufrage, v4) remplace l'ancien "lever" : les
// DEUX joueurs y manipulent chacun leur propre cale.
const CHAPTER_FLOW = ["code", "gears", "soute", "pipes", "memory", "decor", "fanal", "valves", "dial", "mirrors", "lights", "cipher", "maze", "jars", "pattern", "naufrage"];

const COLOR_EMOJIS = ["🔴", "🔵", "🟢", "🟡", "🟣", "🟠"];
// Deuxième "vocabulaire" pour la légende du chapitre 1 : au lieu de lanternes
// colorées, des glyphes gravés. Change visiblement l'énigme d'une partie à
// l'autre sans rien changer à l'interaction (lire une légende → composer un
// code). Rendu par un simple <span> texte comme les emojis.
const GLYPH_EMOJIS = ["✦", "✚", "❖", "⬢", "◆", "✱"];
const CIPHER_SYMBOLS = ["▲", "●", "■", "♦", "★", "✚", "◆", "▼", "♣", "☾"];
const SECRET_WORDS = {
  fr: ["PHARE", "VAGUE", "ORAGE", "VOILE", "MAREE", "ECUME", "RECIF", "FANAL", "ROCHE", "BRUME",
       "ALGUE", "NUAGE", "HOULE", "LARGE", "QUART", "NORD", "SUD", "CAP", "MOUSSE", "HUNIER",
       "AMER", "DIGUE", "SABLE", "GALET", "CORNE", "LAMPE", "SIGNE", "PROUE", "POUPE", "GREER"],
  en: ["STORM", "WAVES", "OCEAN", "LIGHT", "CLIFF", "REEFS", "ROCKS", "SHORE", "TIDES", "FLARE",
       "SWELL", "NORTH", "SOUTH", "COAST", "BEACH", "FOAMY", "MISTY", "CHART", "SAILS", "BUOYS",
       "GLINT", "SPRAY", "WATCH", "DEPTH", "WRECK"],
};
const MEMORY_ICONS = ["⚓", "🕯️", "🔔", "🗝️", "⚙️", "📜", "🧭", "🪵", "🪝", "🕰️", "🧵", "🪗"];
const DECOR_ICONS = ["🕯️", "⚙️", "🔔", "🪞", "🗝️", "🧭", "🪝", "🕰️"];
const ANIM_TYPES = ["float", "swing", "flicker", "drift", "pulse", "spin"];

function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ---------- Génération des 6 énigmes (données pures, indépendantes du rendu) ---------- */

function genChapter1() {
  // Variante : lanternes colorées OU glyphes gravés, code de 4 OU 5 signes.
  const pool = Math.random() < 0.5 ? COLOR_EMOJIS : GLYPH_EMOJIS;
  const codeLen = pickRandom([4, 5]);
  const colors = shuffle(pool).slice(0, 4);
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4);
  const legend = colors.map((c, i) => ({ emoji: c, digit: digits[i] }));
  const sequence = Array.from({ length: codeLen }, () => pickRandom(colors));
  const solution = sequence.map(c => String(legend.find(l => l.emoji === c).digit)).join("");
  return { legend, sequence, solution };
}

function genChapter2() {
  // Variante : 3 OU 4 rouages (plus de rouages = plus de couples possibles).
  const gearCount = pickRandom([3, 4]);
  const labels = ["A", "B", "C", "D"].slice(0, gearCount);
  const ops = [
    { type: "mult", n: 2 }, { type: "mult", n: 3 },
    { type: "add", n: randInt(3, 15) }, { type: "sub", n: randInt(2, 8) }
  ];
  const gears = labels.map(label => {
    const base = randInt(10, 30);
    const op = pickRandom(ops);
    const value = op.type === "mult" ? base * op.n : op.type === "add" ? base + op.n : base - op.n;
    const opText = op.type === "mult" ? `× ${op.n}` : op.type === "add" ? `+ ${op.n}` : `− ${op.n}`;
    return { label, base, opText, value };
  });
  const idxPool = labels.map((_, i) => i);
  const pairIdx = shuffle(idxPool).slice(0, 2).sort((a, b) => a - b);
  // Variété d'une partie à l'autre : la cible est tantôt la SOMME, tantôt
  // la DIFFÉRENCE (valeur absolue) des 2 rouages — même interaction (choisir
  // 2 rouages), mais un calcul mental différent à chaque fois.
  const goal = pickRandom(["sum", "diff"]);
  const a = gears[pairIdx[0]].value, b = gears[pairIdx[1]].value;
  const target = goal === "sum" ? a + b : Math.abs(a - b);
  return { gears, target, goal, correctPair: [gears[pairIdx[0]].label, gears[pairIdx[1]].label].sort() };
}

// Chapitre 3 — mémoire : 5 OU 6 symboles à retenir, mélangés parmi 3 leurres.
function genChapter3() {
  const seqLen = pickRandom([5, 6]);
  const pool = shuffle(MEMORY_ICONS);
  const sequence = pool.slice(0, seqLen);
  const decoys = pool.slice(seqLen, seqLen + 3);
  const tiles = shuffle([...sequence, ...decoys]);
  return { sequence, tiles, seqLen };
}

// Chapitre 4 — alignement (habileté / timing). Variante : sens horaire ou
// anti-horaire, vitesse et largeur de fenêtre variables.
function genChapter4() {
  const size = pickRandom([30, 40, 50]);
  const start = randInt(0, 359 - size);
  const dir = pickRandom(["cw", "ccw"]);
  const period = pickRandom([3400, 4200, 5200]);
  return { start, end: start + size, dir, period };
}

// Chapitre 5 — décor interactif et mouvant : 5 OU 6 objets, une seule
// animation-cible (pool d'icônes et d'animations élargi).
function genChapter5() {
  const count = pickRandom([5, 6]);
  const icons = shuffle(DECOR_ICONS).slice(0, count);
  const anims = shuffle(ANIM_TYPES).slice(0, count);
  const objects = icons.map((icon, i) => ({ icon, anim: anims[i] }));
  const target = pickRandom(objects);
  return { objects, targetAnim: target.anim };
}

// ===== v3 — trois nouvelles épreuves à mécaniques inédites =====

// Vannes (Salle des Machines) — 5 vannes de vapeur, chacune à laisser
// OUVERTE ou FERMÉE. Mécanique nouvelle : configuration d'interrupteurs
// (ni saisie de code, ni choix d'un élément). Au moins une vanne de chaque
// état, sinon l'énigme se décrit en un seul mot ("tout ouvert").
function genValves() {
  let states;
  do { states = Array.from({ length: 5 }, () => Math.random() < 0.5); }
  while (states.every(s => s) || states.every(s => !s));
  return { labels: ["A", "B", "C", "D", "E"], states };
}

// Lampisterie — grille 3×3 de lampes façon "lights-out" : presser une lampe
// bascule AUSSI ses voisines orthogonales. La cible est générée en appliquant
// 3 ou 4 pressions distinctes depuis "tout éteint" : elle est donc toujours
// atteignable, et jamais vide (la matrice lights-out 3×3 est inversible —
// un ensemble de pressions non vide ne peut pas redonner l'état éteint).
function genLights() {
  const presses = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, pickRandom([3, 4]));
  const target = Array(9).fill(false);
  const tog = k => { target[k] = !target[k]; };
  presses.forEach(p => {
    const r = Math.floor(p / 3), c = p % 3;
    tog(p);
    if (r > 0) tog(p - 3);
    if (r < 2) tog(p + 3);
    if (c > 0) tog(p - 1);
    if (c < 2) tog(p + 1);
  });
  return { target, pressCount: presses.length };
}

// Carte des Étoiles — un tracé de 5 étoiles adjacentes (8-voisinage, sans
// repasser deux fois par la même) sur une grille 3×3 repérée A–C / 1–3.
// Mécanique nouvelle : tracer un CHEMIN ORDONNÉ dicté case par case.
// La marche aléatoire peut se coincer (aucun voisin libre) : on retire.
function genPattern() {
  for (;;) {
    const path = [randInt(0, 8)];
    while (path.length < 5) {
      const cur = path[path.length - 1];
      const r = Math.floor(cur / 3), c = cur % 3;
      const nbrs = [];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr > 2 || nc < 0 || nc > 2) continue;
        const idx = nr * 3 + nc;
        if (!path.includes(idx)) nbrs.push(idx);
      }
      if (!nbrs.length) break;
      path.push(pickRandom(nbrs));
    }
    if (path.length === 5) return { path };
  }
}

// ===== v4 — six nouvelles épreuves à mécaniques inédites =====

// La Soute (balance) — 6 caisses au poids gravé (visible par A seul), B doit
// en charger sur la balance pour atteindre EXACTEMENT le poids cible.
// Mécanique nouvelle : somme d'un sous-ensemble. Toute combinaison qui
// atteint la cible est acceptée (pas seulement celle qui a servi à générer).
function genSoute() {
  const labels = ["A", "B", "C", "D", "E", "F"];
  let weights;
  do {
    weights = [];
    while (weights.length < 6) {
      const w = randInt(8, 40);
      if (!weights.includes(w)) weights.push(w);
    }
  } while (false);
  const solIdx = shuffle([0, 1, 2, 3, 4, 5]).slice(0, 3);
  const target = solIdx.reduce((s, i) => s + weights[i], 0);
  return { labels, weights, target };
}

// La Tuyauterie — 6 segments de tuyau en série (pompe -> cale), chacun à
// faire PIVOTER jusqu'à sa bonne orientation. A manipule (clic = quart de
// tour), B lit le plan (les segments dessinés dans la bonne orientation).
// Mécanique nouvelle : rotation d'éléments. Un segment droit a une symétrie
// à 180° (rotation 0 == 2, 1 == 3), un coude non : l'égalité de la
// vérification en tient compte (pipeRotEqual).
function genPipes() {
  const tiles = Array.from({ length: 6 }, () => ({
    kind: pickRandom(["straight", "elbow"]),
    target: randInt(0, 3),
  }));
  // Orientations de départ : jamais déjà toutes correctes.
  let start;
  do { start = tiles.map(() => randInt(0, 3)); }
  while (start.every((r, i) => pipeRotEqual(tiles[i].kind, r, tiles[i].target)));
  return { tiles, start };
}
export function pipeRotEqual(kind, a, b) {
  return kind === "straight" ? (a % 2) === (b % 2) : (a % 4) === (b % 4);
}

// Le Fanal — la lanterne du sémaphore clignote (impulsions courtes/longues)
// sous les yeux de B, qui doit décrire les motifs à A ; A seul possède la
// table motif -> lettre ; B compose ensuite le mot dicté par A. Mécanique
// nouvelle : code TEMPOREL à observer. 6 lettres dans la légende, motifs
// tous distincts (2 ou 3 impulsions), message de 4 lettres distinctes.
function genFanal() {
  const letters = shuffle(["K", "L", "M", "N", "O", "P", "R", "S", "T", "V"]).slice(0, 6);
  const patterns = [];
  const seen = new Set();
  while (patterns.length < 6) {
    const len = pickRandom([2, 3]);
    const p = Array.from({ length: len }, () => (Math.random() < 0.5 ? "S" : "L"));
    const k = p.join("");
    if (!seen.has(k)) { seen.add(k); patterns.push(p); }
  }
  const legend = letters.map((letter, i) => ({ letter, pattern: patterns[i] }));
  const message = shuffle(letters).slice(0, 4);
  return { legend, message };
}

// La Cale aveugle — labyrinthe 6×6 parfait (backtracker récursif). B déplace
// un pion SANS voir les murs, A a le plan complet et guide en direct.
// Mécanique nouvelle : guidage pas à pas en temps réel. Murs par case,
// bitmask N=1 E=2 S=4 W=8 (murs PRÉSENTS). Départ en bas à gauche (case 30),
// sortie en haut à droite (case 5).
export function genMaze() {
  const N = 6;
  const walls = Array(N * N).fill(15); // tous les murs présents
  const visited = Array(N * N).fill(false);
  const stack = [0];
  visited[0] = true;
  const DIRS = [
    { bit: 1, opp: 4, dr: -1, dc: 0 }, // N
    { bit: 2, opp: 8, dr: 0, dc: 1 },  // E
    { bit: 4, opp: 1, dr: 1, dc: 0 },  // S
    { bit: 8, opp: 2, dr: 0, dc: -1 }, // W
  ];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const r = Math.floor(cur / N), c = cur % N;
    const options = DIRS.filter(d => {
      const nr = r + d.dr, nc = c + d.dc;
      return nr >= 0 && nr < N && nc >= 0 && nc < N && !visited[nr * N + nc];
    });
    if (!options.length) { stack.pop(); continue; }
    const d = pickRandom(options);
    const nxt = (r + d.dr) * N + (c + d.dc);
    walls[cur] &= ~d.bit;
    walls[nxt] &= ~d.opp;
    visited[nxt] = true;
    stack.push(nxt);
  }
  return { size: N, walls, start: (N - 1) * N, exit: N - 1 };
}

// Les Miroirs — grille 5×5, 4 miroirs orientables ("/" ou "\"), le faisceau
// de la lanterne entre à gauche et ressort par un des ports du bord. A
// oriente les miroirs et VOIT le faisceau en direct ; B seul connaît le
// port de sortie exigé. Mécanique nouvelle : optique + dialogue en direct.
// Simulation partagée (générateur, rendu ET validation) : traceBeam.
export function traceBeam(mirrors, orientations, entryRow, size = 5) {
  // mirrors : [{r,c}] ; orientations : ["/"|"\\"] ; retour {exit:"top-N"|"right-N"|"bottom-N"|"left-N", cells:[...]}
  const at = {};
  mirrors.forEach((m, i) => { at[m.r + "," + m.c] = i; });
  let r = entryRow, c = 0, dr = 0, dc = 1;
  const cells = [];
  let guard = 0;
  for (;;) {
    if (guard++ > 200) return { exit: null, cells };
    cells.push({ r, c });
    const mi = at[r + "," + c];
    if (mi != null) {
      const o = orientations[mi];
      if (o === "/") { const t = dr; dr = -dc; dc = -t; }
      else { const t = dr; dr = dc; dc = t; }
    }
    const nr = r + dr, nc = c + dc;
    if (nr < 0) return { exit: "top-" + c, cells };
    if (nr >= size) return { exit: "bottom-" + c, cells };
    if (nc < 0) return { exit: "left-" + r, cells };
    if (nc >= size) return { exit: "right-" + r, cells };
    r = nr; c = nc;
  }
}
function genMirrors() {
  for (let attempt = 0; attempt < 200; attempt++) {
    const cells = shuffle(Array.from({ length: 25 }, (_, i) => i)).slice(0, 4);
    const mirrors = cells.map(i => ({ r: Math.floor(i / 5), c: i % 5 }));
    const entryRow = randInt(0, 4);
    const solution = mirrors.map(() => (Math.random() < 0.5 ? "/" : "\\"));
    const res = traceBeam(mirrors, solution, entryRow);
    // Le faisceau doit rencontrer au moins 2 miroirs (sinon l'épreuve est
    // triviale) et ne pas ressortir tout droit à droite sur la même ligne.
    const touched = mirrors.filter(m => res.cells.some(cl => cl.r === m.r && cl.c === m.c)).length;
    if (!res.exit || touched < 2 || res.exit === "right-" + entryRow) continue;
    let start;
    do { start = mirrors.map(() => (Math.random() < 0.5 ? "/" : "\\")); }
    while (traceBeam(mirrors, start, entryRow).exit === res.exit);
    return { mirrors, entryRow, start, targetExit: res.exit };
  }
  // Repli déterministe (ne devrait jamais servir) : deux miroirs en équerre.
  const mirrors = [{ r: 2, c: 2 }, { r: 0, c: 2 }, { r: 4, c: 4 }, { r: 4, c: 0 }];
  return { mirrors, entryRow: 2, start: ["/", "/", "/", "/"], targetExit: traceBeam(mirrors, ["/", "\\", "/", "/"], 2).exit, solution: ["/", "\\", "/", "/"] };
}

// Les Jarres — transvasements classiques : deux jarres NON graduées chez A
// (niveaux visibles, capacités inconnues de lui), B seul connaît les
// capacités et le volume exact à verser dans la pompe. Mécanique nouvelle :
// casse-tête d'états à résoudre de tête par B puis à dicter. Variantes
// toutes solvables (vérifié par exploration exhaustive en test Node).
const JAR_VARIANTS = [
  { small: 3, big: 5, target: 4 },
  { small: 3, big: 8, target: 4 },
  { small: 4, big: 9, target: 6 },
  { small: 5, big: 7, target: 6 },
];
function genJars() {
  return { ...pickRandom(JAR_VARIANTS) };
}

// Le Naufrage (final v4) — configuration par rôle : ordre d'accrochage des
// 3 clés au râtelier, laquelle est la bonne (annoncée sur la plaque du
// BINÔME), position où la clé coule (fraction de la largeur d'eau), et
// habillage aléatoire de la cale (fuites actives parmi 5 points hauts et
// latéraux, phases des débris) pour que chaque naufrage soit unique.
const KEY_SHAPES = ["ronde", "trefle", "losange"];
function genFinaleSide() {
  return {
    keys: shuffle(KEY_SHAPES),
    correct: pickRandom(KEY_SHAPES),
    dropX: 0.2 + Math.random() * 0.6,      // où la clé coule (fraction de la zone d'eau)
    leaks: shuffle([0, 1, 2, 3, 4]).slice(0, randInt(2, 3)), // fuites actives (plafond + flancs)
    debrisSeed: Math.random(),
  };
}
function genFinale() {
  return { A: genFinaleSide(), B: genFinaleSide() };
}

// Chapitre 6 — chiffre du gardien (cipher).
function genChapter6(lang) {
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

/* ---------- Ambiance de salle scellée (décor mouvant, persistant pendant le jeu) ---------- */

function RoomAtmosphere({ chapter, timeLeft }) {
  const doorProgress = Math.max(0, Math.min(1, (chapter - 1) / TOTAL_CHAPTERS));
  const dangerRatio = 1 - Math.max(0, timeLeft) / TOTAL_MS;
  return (
    <div className="echo-atmosphere">
      <div className="echo-atmosphere-fog" />
      <span className="echo-atmosphere-lamp">🏮</span>
      <div className="echo-atmosphere-water" style={{ height: (12 + dangerRatio * 62) + "%" }} />
      <span className="echo-atmosphere-door" style={{
        filter: `grayscale(${100 - doorProgress * 100}%)`,
        opacity: 0.4 + doorProgress * 0.6,
      }}>🚪</span>
    </div>
  );
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
        <input type="text" inputMode="numeric" maxLength={sequence.length} value={code}
          autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="go"
          onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
          style={{ textAlign: "center", fontFamily: "'Space Mono'", fontSize: 22, letterSpacing: "0.3em", width: 140 }}
          placeholder={"•".repeat(sequence.length)} />
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

function GearPicker({ onConfirm, t, labels = ["A", "B", "C"] }) {
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
      <div style={{ display: "flex", gap: 10, justifyContent: "center", margin: "14px 0", flexWrap: "wrap" }}>
        {labels.map(label => (
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

// Chapitre 3 (mémoire) — celui qui voit doit MÉMORISER avant que ça disparaisse.
function MemoryInfo({ sequence, t, onPeek }) {
  const [revealed, setRevealed] = useState(true);
  useEffect(() => {
    const tm = setTimeout(() => setRevealed(false), MEMORY_REVEAL_MS);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function peekAgain() {
    onPeek();
    setRevealed(true);
    setTimeout(() => setRevealed(false), MEMORY_PEEK_MS);
  }

  return (
    <div>
      <p className="muted" style={{ textAlign: "center", marginBottom: 8 }}>
        {revealed ? t("echoesCh3Memorize") : t("echoesCh3Hidden")}
      </p>
      <div style={{ textAlign: "center" }}>
        {sequence.map((icon, i) => (
          <span key={i} className={"echo-memory-tile" + (!revealed ? " hidden-tile" : "")}>
            {revealed ? icon : "?"}
          </span>
        ))}
      </div>
      {!revealed && (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <button className="btn ghost" style={{ width: "auto", padding: "8px 14px", fontSize: 12 }} onClick={peekAgain}>
            👁️ {t("echoesCh3Peek")}
          </button>
        </div>
      )}
    </div>
  );
}

// Chapitre 3 (mémoire) — celui qui n'a pas vu doit reconstituer l'ordre d'après la description.
function MemoryInput({ tiles, onConfirm, t, count = 5 }) {
  const [picks, setPicks] = useState([]);
  function toggle(icon) {
    setPicks(prev => {
      if (prev.includes(icon)) return prev.filter(x => x !== icon);
      if (prev.length >= count) return prev;
      return [...prev, icon];
    });
  }
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        {Array.from({ length: count }, (_, i) => i).map(i => (
          <span key={i} className={"echo-memory-slot" + (picks[i] ? " filled" : "")}>{picks[i] || ""}</span>
        ))}
      </div>
      <div style={{ textAlign: "center" }}>
        {tiles.map((icon, i) => (
          <span key={i}
            className={"echo-memory-tile pickable" + (picks.includes(icon) ? " chosen" : "")}
            onClick={() => toggle(icon)}>
            {icon}
          </span>
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 12, display: "flex", gap: 8, justifyContent: "center" }}>
        <button className="btn ghost" style={{ width: "auto", padding: "10px 16px" }} onClick={() => setPicks([])}>{t("echoesCh3Clear")}</button>
        <button className="btn" style={{ width: "auto", padding: "10px 16px" }} disabled={picks.length !== count}
          onClick={() => { onConfirm(picks); setPicks([]); }}>{t("echoesCh3Confirm")}</button>
      </div>
    </div>
  );
}

function ZoneClue({ start, end, t }) {
  return (
    <p className="hint" style={{ fontSize: 16, fontWeight: 700, textAlign: "center" }}>
      {t("echoesCh4ZonePrefix")}{" "}
      <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>{start}°</span>{" "}
      {t("echoesCh4ZoneJoin")}{" "}
      <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>{end}°</span>
    </p>
  );
}

function DialStopper({ period, onStop, t, dir = "cw" }) {
  const needleRef = useRef(null);
  const startRef = useRef(Date.now());
  const rafRef = useRef(null);

  // Angle réel du marqueur : horaire (cw) ou anti-horaire (ccw). L'angle
  // renvoyé à onStop est TOUJOURS l'angle réel affiché, pour que la
  // vérification [start,end] reste valable quel que soit le sens.
  function angleAt(elapsed) {
    const a = (elapsed / period) * 360;
    return dir === "ccw" ? (360 - a) % 360 : a;
  }

  useEffect(() => {
    function tick() {
      const elapsed = (Date.now() - startRef.current) % period;
      if (needleRef.current) needleRef.current.style.transform = `rotate(${angleAt(elapsed)}deg)`;
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, dir]);

  function stop() {
    const elapsed = (Date.now() - startRef.current) % period;
    onStop(angleAt(elapsed));
  }

  return (
    <div>
      <div className="echo-dial-wrap">
        <div className="echo-dial-needle" ref={needleRef} />
        <div className="echo-dial-center" />
      </div>
      <div style={{ textAlign: "center" }}>
        <button className="btn" style={{ width: "auto", padding: "12px 28px" }} onClick={stop}>{t("echoesCh4Stop")}</button>
      </div>
    </div>
  );
}

// Chapitre 5 (décor) — indice textuel décrivant le mouvement de l'objet cible.
function DecorClue({ targetAnim, t }) {
  const key = "echoesCh5Anim" + cap(targetAnim);
  return (
    <p className="hint" style={{ textAlign: "center", fontWeight: 700, fontSize: 15 }}>
      "… {t(key)} …"
    </p>
  );
}

// Chapitre 5 (décor) — objets réellement animés en CSS, à cliquer.
function DecorRoom({ objects, onPick }) {
  return (
    <div className="echo-decor-room">
      {objects.map((o, i) => (
        <button key={i} className={"echo-decor-object anim-" + o.anim} onClick={() => onPick(o.anim)}>
          {o.icon}
        </button>
      ))}
    </div>
  );
}

// ----- Vannes (v3) : côté info, la configuration cible en lecture seule -----
function ValveTargets({ valves, t }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", margin: "12px 0" }}>
      {valves.labels.map((label, i) => (
        <span key={label} className={"echo-valve-target" + (valves.states[i] ? " open" : " closed")}>
          <span className="letter">{label}</span>
          <span>{valves.states[i] ? "🔓 " + t("echoesValveOpen") : "🔒 " + t("echoesValveClosed")}</span>
        </span>
      ))}
    </div>
  );
}

// ----- Vannes (v3) : côté action, 5 volants à basculer puis un levier de confirmation -----
function ValveBoard({ labels, onConfirm, t }) {
  const [states, setStates] = useState(labels.map(() => false));
  function toggle(i) { setStates(prev => prev.map((s, j) => (j === i ? !s : s))); }
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", margin: "12px 0" }}>
        {labels.map((label, i) => (
          <button key={label} className={"echo-valve" + (states[i] ? " open" : "")} onClick={() => toggle(i)}>
            <span className="letter">{label}</span>
            <span className="wheel">☸️</span>
            <span className="state">{states[i] ? t("echoesValveOpen") : t("echoesValveClosed")}</span>
          </button>
        ))}
      </div>
      <button className="btn" style={{ width: "auto", padding: "10px 18px" }} onClick={() => onConfirm(states)}>
        {t("echoesValvesConfirm")}
      </button>
    </div>
  );
}

// ----- Lampisterie (v3) : côté info, la disposition cible des lampes -----
function LightsTarget({ target }) {
  return (
    <div className="echo-lamp-grid">
      {target.map((lit, i) => (
        <div key={i} className={"echo-lamp" + (lit ? " lit" : "")}>{lit ? "🏮" : "·"}</div>
      ))}
    </div>
  );
}

// ----- Lampisterie (v3) : côté action, presser une lampe bascule aussi ses voisines -----
function LightsBoard({ onConfirm, t }) {
  const [grid, setGrid] = useState(Array(9).fill(false));
  function press(i) {
    setGrid(prev => {
      const g = prev.slice();
      const r = Math.floor(i / 3), c = i % 3;
      const tog = k => { g[k] = !g[k]; };
      tog(i);
      if (r > 0) tog(i - 3);
      if (r < 2) tog(i + 3);
      if (c > 0) tog(i - 1);
      if (c < 2) tog(i + 1);
      return g;
    });
  }
  return (
    <div>
      <div className="echo-lamp-grid">
        {grid.map((lit, i) => (
          <button key={i} className={"echo-lamp pressable" + (lit ? " lit" : "")} onClick={() => press(i)}>
            {lit ? "🏮" : "·"}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
        {/* Remise à zéro GRATUITE : repartir de "tout éteint" fait partie de la
            résolution normale d'un lights-out, la pénaliser serait injuste. */}
        <button className="btn ghost" style={{ width: "auto", padding: "10px 16px" }} onClick={() => setGrid(Array(9).fill(false))}>
          {t("echoesLightsReset")}
        </button>
        <button className="btn" style={{ width: "auto", padding: "10px 16px" }} onClick={() => onConfirm(grid)}>
          {t("echoesLightsConfirm")}
        </button>
      </div>
    </div>
  );
}

// Coordonnée parlée d'une case 3×3 : rangées A–C (haut->bas), colonnes 1–3.
function starCoord(i) { return "ABC"[Math.floor(i / 3)] + (i % 3 + 1); }

// ----- Constellation (v3) : côté info, le tracé dessiné sur la carte repérée -----
function PatternClue({ path, t }) {
  const pos = i => ({ x: 40 + (i % 3) * 60, y: 34 + Math.floor(i / 3) * 60 });
  const pts = path.map(pos);
  return (
    <div style={{ textAlign: "center" }}>
      <svg width="210" height="190" viewBox="0 0 200 180" style={{ maxWidth: "100%" }} role="img" aria-label={path.map(starCoord).join(" → ")}>
        {[1, 2, 3].map((n, i) => (
          <text key={"c" + n} x={40 + i * 60} y={12} textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="'Space Mono'">{n}</text>
        ))}
        {["A", "B", "C"].map((l, i) => (
          <text key={"r" + l} x={12} y={38 + i * 60} textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="'Space Mono'">{l}</text>
        ))}
        <polyline points={pts.map(p => p.x + "," + p.y).join(" ")} fill="none"
          stroke="var(--acc-echoes)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
        {Array.from({ length: 9 }, (_, i) => i).map(i => {
          const p = pos(i);
          const on = path.includes(i);
          return <circle key={i} cx={p.x} cy={p.y} r={on ? 7 : 4.5} fill={on ? "var(--acc-echoes)" : "var(--line)"} />;
        })}
        <circle cx={pts[0].x} cy={pts[0].y} r={12} fill="none" stroke="var(--p2)" strokeWidth="2.5" />
      </svg>
      <p className="hint" style={{ fontSize: 12.5 }}>⭐ {t("echoesPatternStart")}</p>
    </div>
  );
}

// ----- Constellation (v3) : côté action, cliquer les étoiles dans l'ordre dicté -----
function PatternInput({ length, onConfirm, t }) {
  const [seq, setSeq] = useState([]);
  function tap(i) {
    setSeq(prev => (prev.includes(i) || prev.length >= length ? prev : [...prev, i]));
  }
  return (
    <div>
      <div className="echo-star-grid">
        {Array.from({ length: 9 }, (_, i) => i).map(i => {
          const ord = seq.indexOf(i);
          return (
            <button key={i} className={"echo-star-cell" + (ord >= 0 ? " lit" : "")} onClick={() => tap(i)}>
              {ord >= 0 ? "⭐" : "✦"}
              {ord >= 0 && <span className="ord">{ord + 1}</span>}
              <span className="echo-star-coord" style={{ position: "absolute", bottom: 2, left: 5 }}>{starCoord(i)}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
        <button className="btn ghost" style={{ width: "auto", padding: "10px 16px" }} onClick={() => setSeq([])}>
          {t("echoesPatternClear")}
        </button>
        <button className="btn" style={{ width: "auto", padding: "10px 16px" }} disabled={seq.length !== length}
          onClick={() => { onConfirm(seq); setSeq([]); }}>
          {t("echoesPatternConfirm")}
        </button>
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
      {/* Audit mobile 2026-07 : l'autocorrection iOS transformait le mot
          décodé en cours de frappe (ex. un mot de code inventé "corrigé"
          en mot du dictionnaire) — coupée, avec majuscules au clavier. */}
      <input type="text" maxLength={length} value={word}
        autoCapitalize="characters" autoCorrect="off" spellCheck={false}
        autoComplete="off" enterKeyHint="go"
        onChange={e => setWord(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
        style={{ textAlign: "center", fontFamily: "'Space Mono'", fontSize: 20, letterSpacing: "0.22em", width: 160 }}
        placeholder={"?".repeat(length)} />
      <button className="btn" style={{ margin: 0, width: "auto", padding: "12px 18px" }}>{t("echoesCh6Enter")}</button>
    </form>
  );
}

/* ===== v4 — composants des six nouvelles épreuves ===== */

// ----- La Soute : côté info (A), les caisses avec leur poids gravé -----
function SouteInfo({ soute }) {
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", margin: "14px 0" }}>
      {soute.labels.map((label, i) => (
        <div key={label} className="echo-crate" style={{ cursor: "default" }}>
          <span className="letter">{label}</span>
          <span className="icon">📦</span>
          <span className="weight">{soute.weights[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ----- La Soute : côté action (B), charger la balance jusqu'au poids cible -----
function SouteBoard({ labels, target, onConfirm, t }) {
  const [picked, setPicked] = useState([]);
  function toggle(l) { setPicked(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]); }
  return (
    <div>
      <p style={{ textAlign: "center", fontWeight: 800, fontSize: 20, margin: "8px 0" }}>
        ⚖️ {t("echoesSouteTarget")} <span style={{ fontFamily: "'Space Mono'", color: "var(--p3)" }}>{target}</span>
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", margin: "12px 0" }}>
        {labels.map(label => (
          <button key={label} className={"echo-crate" + (picked.includes(label) ? " picked" : "")} onClick={() => toggle(label)}>
            <span className="letter">{label}</span>
            <span className="icon">📦</span>
          </button>
        ))}
      </div>
      <p className="muted" style={{ textAlign: "center", fontSize: 12.5 }}>
        {t("echoesSouteOnScale")} : {picked.length ? picked.slice().sort().join(", ") : "…"}
      </p>
      <button className="btn" style={{ width: "auto", padding: "10px 18px" }} disabled={!picked.length}
        onClick={() => { onConfirm(picked); setPicked([]); }}>
        {t("echoesSouteConfirm")}
      </button>
    </div>
  );
}

// ----- La Tuyauterie : dessin d'un segment (droit ou coude) à une rotation -----
function PipeTile({ kind, rot, onClick, num, dim }) {
  return (
    <button className={"echo-pipe-tile" + (onClick ? " turnable" : "") + (dim ? " dim" : "")} onClick={onClick} disabled={!onClick}>
      <svg viewBox="0 0 44 44" width="44" height="44" style={{ transform: `rotate(${rot * 90}deg)`, transition: "transform .25s ease" }}>
        {kind === "straight"
          ? <rect x="0" y="16" width="44" height="12" rx="3" fill="#7a8a94" stroke="#3c4a54" strokeWidth="2.5" />
          : <path d="M0,22 L22,22 L22,44" fill="none" stroke="#7a8a94" strokeWidth="12" strokeLinecap="butt" style={{ paintOrder: "stroke" }} />}
        {kind === "elbow" && <path d="M0,22 L22,22 L22,44" fill="none" stroke="#3c4a54" strokeWidth="2.5" transform="translate(0,-7)" opacity="0" />}
      </svg>
      {num != null && <span className="num">{num}</span>}
    </button>
  );
}

// ----- La Tuyauterie : côté info (B), le plan des segments bien orientés -----
function PipesPlan({ pipes, t }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", margin: "12px 0" }}>
        {pipes.tiles.map((tile, i) => (
          <PipeTile key={i} kind={tile.kind} rot={tile.target} num={i + 1} />
        ))}
      </div>
      <p className="muted" style={{ textAlign: "center", fontSize: 12 }}>💧 {t("echoesPipesFlow")}</p>
    </div>
  );
}

// ----- La Tuyauterie : côté action (A), pivoter chaque segment (quart de tour) -----
function PipesBoard({ pipes, onConfirm, t }) {
  const [rots, setRots] = useState(pipes.start.slice());
  function turn(i) { setRots(prev => prev.map((r, j) => (j === i ? (r + 1) % 4 : r))); }
  return (
    <div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", margin: "12px 0" }}>
        {rots.map((r, i) => (
          <PipeTile key={i} kind={pipes.tiles[i].kind} rot={r} num={i + 1} onClick={() => turn(i)} />
        ))}
      </div>
      <button className="btn" style={{ width: "auto", padding: "10px 18px" }} onClick={() => onConfirm(rots)}>
        {t("echoesPipesConfirm")}
      </button>
    </div>
  );
}

// ----- Le Fanal : côté info (A), la table motif -> lettre -----
function FanalLegend({ legend, t }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, margin: "12px 0", alignItems: "center" }}>
      {legend.map(l => (
        <div key={l.letter} style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 800 }}>
          <span style={{ fontFamily: "'Space Mono'", fontSize: 16, letterSpacing: "0.18em", minWidth: 74, textAlign: "right" }}>
            {l.pattern.map(p => (p === "S" ? "●" : "▬")).join(" ")}
          </span>
          <span className="muted">=</span>
          <span style={{ color: "var(--p3)", fontSize: 18 }}>{l.letter}</span>
        </div>
      ))}
      <p className="muted" style={{ fontSize: 11.5 }}>● {t("echoesFanalShort")} · ▬ {t("echoesFanalLong")}</p>
    </div>
  );
}

// ----- Le Fanal : côté action (B), la lanterne clignote, composer le mot -----
const FANAL_SHORT_MS = 260, FANAL_LONG_MS = 780, FANAL_GAP_MS = 300, FANAL_LETTER_GAP_MS = 1100, FANAL_LOOP_GAP_MS = 2400;
function FanalWatcher({ fanal, onConfirm, t }) {
  const [on, setOn] = useState(false);
  const [letterIdx, setLetterIdx] = useState(0);
  const [picks, setPicks] = useState([]);
  const timersRef = useRef([]);

  // Timeline des flashs : reconstruite en boucle, purement locale.
  useEffect(() => {
    let cancelled = false;
    function schedule(fn, ms) { const tm = setTimeout(fn, ms); timersRef.current.push(tm); return ms; }
    function playLoop() {
      if (cancelled) return;
      let at = 400;
      fanal.message.forEach((letter, li) => {
        const pattern = fanal.legend.find(l => l.letter === letter).pattern;
        schedule(() => setLetterIdx(li), at);
        pattern.forEach(p => {
          const dur = p === "S" ? FANAL_SHORT_MS : FANAL_LONG_MS;
          schedule(() => setOn(true), at);
          schedule(() => setOn(false), at + dur);
          at += dur + FANAL_GAP_MS;
        });
        at += FANAL_LETTER_GAP_MS;
      });
      schedule(() => { setLetterIdx(0); playLoop(); }, at + FANAL_LOOP_GAP_MS);
    }
    playLoop();
    return () => { cancelled = true; timersRef.current.forEach(clearTimeout); timersRef.current = []; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const letters = fanal.legend.map(l => l.letter);
  function tap(l) { setPicks(prev => (prev.length >= fanal.message.length ? prev : [...prev, l])); }
  return (
    <div style={{ textAlign: "center" }}>
      <div className="echo-fanal-lamp-wrap">
        <span className={"echo-fanal-lamp" + (on ? " on" : "")} />
      </div>
      <p className="muted" style={{ fontSize: 12 }}>{t("echoesFanalSignal")} {letterIdx + 1}/{fanal.message.length}</p>
      <div style={{ margin: "10px 0 6px" }}>
        {Array.from({ length: fanal.message.length }, (_, i) => (
          <span key={i} className={"echo-memory-slot" + (picks[i] ? " filled" : "")}>{picks[i] || ""}</span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {letters.map(l => (
          <button key={l} className="echo-fanal-letter" onClick={() => tap(l)}>{l}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
        <button className="btn ghost" style={{ width: "auto", padding: "10px 16px" }} onClick={() => setPicks([])}>{t("echoesCh3Clear")}</button>
        <button className="btn" style={{ width: "auto", padding: "10px 16px" }} disabled={picks.length !== fanal.message.length}
          onClick={() => { onConfirm(picks); setPicks([]); }}>{t("echoesFanalConfirm")}</button>
      </div>
    </div>
  );
}

// ----- La Cale aveugle : côté info (A), le plan complet du labyrinthe -----
function MazeMap({ maze }) {
  const N = maze.size, cs = 34, pad = 10;
  const lines = [];
  for (let i = 0; i < N * N; i++) {
    const r = Math.floor(i / N), c = i % N;
    const x = pad + c * cs, y = pad + r * cs;
    const w = maze.walls[i];
    if (w & 1) lines.push([x, y, x + cs, y]);
    if (w & 2) lines.push([x + cs, y, x + cs, y + cs]);
    if (w & 4) lines.push([x, y + cs, x + cs, y + cs]);
    if (w & 8) lines.push([x, y, x, y + cs]);
  }
  const cell = i => ({ x: pad + (i % N) * cs + cs / 2, y: pad + Math.floor(i / N) * cs + cs / 2 });
  const st = cell(maze.start), ex = cell(maze.exit);
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={N * cs + pad * 2} height={N * cs + pad * 2} style={{ maxWidth: "100%" }}>
        <rect x={pad} y={pad} width={N * cs} height={N * cs} fill="rgba(255,255,255,.02)" />
        {/* repères A-F / 1-6 pour se parler */}
        {Array.from({ length: N }, (_, i) => (
          <text key={"c" + i} x={pad + i * cs + cs / 2} y={pad - 2} textAnchor="middle" fill="var(--muted)" fontSize="9" fontFamily="'Space Mono'">{i + 1}</text>
        ))}
        {Array.from({ length: N }, (_, i) => (
          <text key={"r" + i} x={pad - 5} y={pad + i * cs + cs / 2 + 3} textAnchor="middle" fill="var(--muted)" fontSize="9" fontFamily="'Space Mono'">{"ABCDEF"[i]}</text>
        ))}
        {lines.map((l, i) => <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} stroke="var(--acc-echoes)" strokeWidth="2.5" strokeLinecap="round" opacity=".8" />)}
        <circle cx={st.x} cy={st.y} r="7" fill="var(--p2)" />
        <text x={ex.x} y={ex.y + 5} textAnchor="middle" fontSize="14">🚪</text>
      </svg>
    </div>
  );
}

// ----- La Cale aveugle : côté action (B), avancer sans voir les murs -----
function MazeWalk({ maze, onReach, t }) {
  const N = maze.size;
  const [pos, setPos] = useState(maze.start);
  const [trail, setTrail] = useState([maze.start]);
  const [bump, setBump] = useState(false);
  const doneRef = useRef(false);
  function move(bit, dr, dc) {
    if (doneRef.current) return;
    if (maze.walls[pos] & bit) {
      setBump(true);
      setTimeout(() => setBump(false), 350);
      return;
    }
    const nxt = (Math.floor(pos / N) + dr) * N + (pos % N + dc);
    setPos(nxt);
    setTrail(prev => (prev.includes(nxt) ? prev : [...prev, nxt]));
    if (nxt === maze.exit) { doneRef.current = true; onReach(); }
  }
  return (
    <div style={{ textAlign: "center" }}>
      <div className={"echo-maze-grid" + (bump ? " bump" : "")}>
        {Array.from({ length: N * N }, (_, i) => (
          <div key={i} className={"echo-maze-cell" + (trail.includes(i) ? " seen" : "") + (i === pos ? " here" : "")}>
            {i === pos ? "🧍" : i === maze.exit ? "🚪" : ""}
            <span className="coord">{"ABCDEF"[Math.floor(i / N)]}{i % N + 1}</span>
          </div>
        ))}
      </div>
      {bump && <p className="err" style={{ margin: "6px 0 0", fontSize: 12.5 }}>{t("echoesMazeBump")}</p>}
      <div className="echo-maze-pad">
        <button onClick={() => move(1, -1, 0)}>▲</button>
        <div>
          <button onClick={() => move(8, 0, -1)}>◀</button>
          <button onClick={() => move(2, 0, 1)}>▶</button>
        </div>
        <button onClick={() => move(4, 1, 0)}>▼</button>
      </div>
    </div>
  );
}

// Libellé parlé d'un port de sortie du faisceau ("haut 3", "droite B"...).
function mirrorPortLabel(exit, t) {
  if (!exit) return "?";
  const [side, nStr] = exit.split("-");
  const n = Number(nStr);
  const sideLabel = t(side === "top" ? "echoesMirrorsTop" : side === "bottom" ? "echoesMirrorsBottom" : side === "left" ? "echoesMirrorsLeft" : "echoesMirrorsRight");
  const coord = side === "top" || side === "bottom" ? String(n + 1) : "ABCDE"[n];
  return sideLabel + " " + coord;
}

// ----- Les Miroirs : côté info (B), le port de sortie exigé -----
function MirrorsTargetInfo({ targetExit, t }) {
  return (
    <p style={{ textAlign: "center", fontWeight: 800, fontSize: 19, margin: "12px 0" }}>
      🎯 {t("echoesMirrorsTargetIs")} <span style={{ color: "var(--p3)" }}>{mirrorPortLabel(targetExit, t)}</span>
    </p>
  );
}

// ----- Les Miroirs : côté action (A), orienter les miroirs, faisceau EN DIRECT -----
function MirrorsBoard({ mirrors, entryRow, start, onConfirm, t }) {
  const [ors, setOrs] = useState(start.slice());
  const size = 5, cs = 40, pad = 22;
  const res = traceBeam(mirrors, ors, entryRow, size);
  const center = (r, c) => ({ x: pad + c * cs + cs / 2, y: pad + r * cs + cs / 2 });
  // Points du faisceau : entrée + centres des cases traversées + sortie.
  const pts = [{ x: pad - 12, y: pad + entryRow * cs + cs / 2 }, ...res.cells.map(cl => center(cl.r, cl.c))];
  if (res.exit) {
    const [side, nStr] = res.exit.split("-");
    const n = Number(nStr);
    if (side === "top") pts.push({ x: pad + n * cs + cs / 2, y: pad - 12 });
    if (side === "bottom") pts.push({ x: pad + n * cs + cs / 2, y: pad + size * cs + 12 });
    if (side === "left") pts.push({ x: pad - 12, y: pad + n * cs + cs / 2 });
    if (side === "right") pts.push({ x: pad + size * cs + 12, y: pad + n * cs + cs / 2 });
  }
  function toggle(i) { setOrs(prev => prev.map((o, j) => (j === i ? (o === "/" ? "\\" : "/") : o))); }
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size * cs + pad * 2} height={size * cs + pad * 2} style={{ maxWidth: "100%" }}>
        <rect x={pad} y={pad} width={size * cs} height={size * cs} fill="rgba(255,255,255,.02)" stroke="var(--line)" strokeWidth="1.5" />
        {/* repères : colonnes 1-5 en haut/bas, rangées A-E sur les côtés */}
        {Array.from({ length: size }, (_, i) => (
          <text key={"t" + i} x={pad + i * cs + cs / 2} y={pad - 8} textAnchor="middle" fill="var(--muted)" fontSize="9" fontFamily="'Space Mono'">{i + 1}</text>
        ))}
        {Array.from({ length: size }, (_, i) => (
          <text key={"l" + i} x={pad - 10} y={pad + i * cs + cs / 2 + 3} textAnchor="middle" fill="var(--muted)" fontSize="9" fontFamily="'Space Mono'">{"ABCDE"[i]}</text>
        ))}
        {/* quadrillage */}
        {Array.from({ length: size - 1 }, (_, i) => (
          <g key={i}>
            <line x1={pad + (i + 1) * cs} y1={pad} x2={pad + (i + 1) * cs} y2={pad + size * cs} stroke="var(--line)" strokeWidth="1" opacity=".4" />
            <line x1={pad} y1={pad + (i + 1) * cs} x2={pad + size * cs} y2={pad + (i + 1) * cs} stroke="var(--line)" strokeWidth="1" opacity=".4" />
          </g>
        ))}
        {/* lanterne d'entrée */}
        <text x={pad - 14} y={pad + entryRow * cs + cs / 2 + 5} textAnchor="middle" fontSize="14">🏮</text>
        {/* faisceau EN DIRECT */}
        <polyline points={pts.map(p => p.x + "," + p.y).join(" ")} fill="none"
          stroke="#f2d9a0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".85" className="echo-beam" />
        {/* miroirs cliquables */}
        {mirrors.map((m, i) => {
          const p = center(m.r, m.c);
          return (
            <g key={i} onClick={() => toggle(i)} style={{ cursor: "pointer" }}>
              <rect x={p.x - cs / 2 + 3} y={p.y - cs / 2 + 3} width={cs - 6} height={cs - 6} rx="6" fill="rgba(90,208,194,.1)" stroke="var(--acc-echoes)" strokeWidth="1.5" />
              <line x1={p.x - 11} y1={ors[i] === "/" ? p.y + 11 : p.y - 11} x2={p.x + 11} y2={ors[i] === "/" ? p.y - 11 : p.y + 11}
                stroke="#cfe0e6" strokeWidth="4.5" strokeLinecap="round" />
            </g>
          );
        })}
      </svg>
      <p className="muted" style={{ fontSize: 12.5 }}>
        {t("echoesMirrorsNow")} : <b style={{ color: "var(--ink)" }}>{mirrorPortLabel(res.exit, t)}</b>
      </p>
      <button className="btn" style={{ width: "auto", padding: "10px 18px" }} onClick={() => onConfirm(ors)}>
        {t("echoesMirrorsConfirm")}
      </button>
    </div>
  );
}

// ----- Les Jarres : côté info (B), capacités + volume exigé -----
function JarsInfo({ jars, t }) {
  return (
    <div style={{ textAlign: "center", margin: "12px 0" }}>
      <p style={{ fontWeight: 800, fontSize: 16 }}>
        🏺 {t("echoesJarsSmall")} : <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>{jars.small}</span>
        {" · "}{t("echoesJarsBig")} : <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>{jars.big}</span>
      </p>
      <p style={{ fontWeight: 800, fontSize: 19, marginTop: 8 }}>
        🎯 {t("echoesJarsTarget")} <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>{jars.target}</span>
      </p>
    </div>
  );
}

// ----- Les Jarres : côté action (A), jarres NON graduées à manipuler -----
function JarsBoard({ jars, onPour, t }) {
  const [small, setSmall] = useState(0);
  const [big, setBig] = useState(0);
  function transfer(fromSmall) {
    if (fromSmall) {
      const amount = Math.min(small, jars.big - big);
      setSmall(small - amount); setBig(big + amount);
    } else {
      const amount = Math.min(big, jars.small - small);
      setBig(big - amount); setSmall(small + amount);
    }
  }
  const Jar = ({ value, capacity, label }) => (
    <div className="echo-jar">
      <div className="echo-jar-body">
        <div className="echo-jar-water" style={{ height: (value / capacity * 100) + "%" }} />
      </div>
      <span className="echo-jar-label">{label}</span>
    </div>
  );
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", gap: 26, justifyContent: "center", margin: "12px 0" }}>
        <Jar value={small} capacity={jars.small} label={t("echoesJarsSmallLbl")} />
        <Jar value={big} capacity={jars.big} label={t("echoesJarsBigLbl")} />
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="echo-jar-btn" onClick={() => setSmall(jars.small)}>{t("echoesJarsFill")} P</button>
        <button className="echo-jar-btn" onClick={() => setBig(jars.big)}>{t("echoesJarsFill")} G</button>
        <button className="echo-jar-btn" onClick={() => setSmall(0)}>{t("echoesJarsEmpty")} P</button>
        <button className="echo-jar-btn" onClick={() => setBig(0)}>{t("echoesJarsEmpty")} G</button>
        <button className="echo-jar-btn" onClick={() => transfer(true)}>P → G</button>
        <button className="echo-jar-btn" onClick={() => transfer(false)}>G → P</button>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
        <button className="btn" style={{ width: "auto", padding: "10px 16px" }} onClick={() => onPour(small)}>
          ⛽ {t("echoesJarsPour")} P
        </button>
        <button className="btn" style={{ width: "auto", padding: "10px 16px" }} onClick={() => onPour(big)}>
          ⛽ {t("echoesJarsPour")} G
        </button>
      </div>
    </div>
  );
}

// (LeverButton supprimé en v4 : le tirage synchronisé des leviers vit
// désormais DANS la scène du final, voir components/echoes/EchoesFinale.js.)

/* ---------- Composant principal ---------- */

export default function EchoesRoom({ room, me, isHost, players, t, lang, onFinish }) {
  const [phase, setPhase] = useState("intro"); // intro -> playing -> success | failure
  const [roles, setRoles] = useState({ A: null, B: null });
  const [puzzle, setPuzzle] = useState(null);
  const [chapter, setChapter] = useState(1); // 1..7, 8 = victoire
  const [deadline, setDeadline] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TOTAL_MS);
  const [feedback, setFeedback] = useState("");
  const [wrongShake, setWrongShake] = useState(false);
  const [selected, setSelected] = useState([]);
  const [channelReady, setChannelReady] = useState(false);
  const [myWin, setMyWin] = useState(false);
  const [endingVariant, setEndingVariant] = useState("standard");
  const [pressA, setPressA] = useState(null);
  const [pressB, setPressB] = useState(null);
  const [myPressed, setMyPressed] = useState(false);
  // v4 : progression de chacun DANS le final (voir final_status) — sert au
  // bandeau "où en est mon binôme" et à l'affichage spectateur.
  const [finaleStatus, setFinaleStatus] = useState({ A: "dark", B: "dark" });

  const channelRef = useRef(null);
  // Miroir toujours à jour pour les handlers de broadcast (évite les closures figées).
  const stateRef = useRef({ chapter, deadline, phase, roles, puzzle });
  const autoStartedRef = useRef(false);
  const restoredRef = useRef(false);
  const savedResultRef = useRef(false);
  const feedbackTimers = useRef([]);

  useEffect(() => { stateRef.current = { chapter, deadline, phase, roles, puzzle }; }, [chapter, deadline, phase, roles, puzzle]);

  useEffect(() => {
    const ch = supabase.channel("echoes_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "match_start" }, ({ payload }) => {
      const puz = {
        ch1: payload.ch1, ch2: payload.ch2, ch3: payload.ch3, ch4: payload.ch4, ch5: payload.ch5, ch6: payload.ch6,
        chValves: payload.chValves, chLights: payload.chLights, chPattern: payload.chPattern,
        chSoute: payload.chSoute, chPipes: payload.chPipes, chFanal: payload.chFanal,
        chMaze: payload.chMaze, chMirrors: payload.chMirrors, chJars: payload.chJars,
        chFinale: payload.chFinale,
      };
      setRoles({ A: payload.roleA, B: payload.roleB });
      setPuzzle(puz);
      setDeadline(payload.deadline);
      setChapter(1);
      setPhase("playing");
      setFeedback("");
      setSelected([]);
      setPressA(null); setPressB(null); setMyPressed(false);
      setFinaleStatus({ A: "dark", B: "dark" });
      setMyWin(false);
      setEndingVariant("standard");
      savedResultRef.current = false;
      if (isHost) {
        saveGameState(room.id, "echoes", {
          phase: "playing", roleA: payload.roleA, roleB: payload.roleB,
          puzzle: puz, deadline: payload.deadline, chapter: 1,
        });
      }
    });

    ch.on("broadcast", { event: "advance" }, ({ payload }) => {
      playConfirmChime(); // SFX (2026-07) : chapitre résolu, chez les deux joueurs
      setChapter(c => Math.max(c, payload.chapter));
      setFeedback("");
      setPressA(null); setPressB(null); setMyPressed(false);
      if (payload.chapter >= VICTORY) setPhase("success");
      if (isHost) {
        const s = stateRef.current;
        saveGameState(room.id, "echoes", {
          phase: payload.chapter >= VICTORY ? "success" : "playing",
          roleA: s.roles.A, roleB: s.roles.B, puzzle: s.puzzle,
          deadline: s.deadline, chapter: payload.chapter,
        });
      }
    });

    ch.on("broadcast", { event: "penalty" }, ({ payload }) => {
      playAnswerWrong(); // SFX (2026-07) : pénalité de temps, chez les deux joueurs
      setDeadline(d => (d == null ? payload.newDeadline : Math.min(d, payload.newDeadline)));
      const secs = Math.round(payload.amount / 1000);
      const label = payload.reason === "peek" ? t("echoesPeekUsed") : t("echoesWrong") + " " + t("echoesPenalty");
      setFeedback(`${label} (−${secs}s)`);
      setWrongShake(true);
      feedbackTimers.current.push(setTimeout(() => setWrongShake(false), 400));
      feedbackTimers.current.push(setTimeout(() => setFeedback(""), 2400));
      if (isHost) {
        const s = stateRef.current;
        saveGameState(room.id, "echoes", {
          phase: "playing", roleA: s.roles.A, roleB: s.roles.B, puzzle: s.puzzle,
          deadline: payload.newDeadline, chapter: s.chapter,
        });
      }
    });

    ch.on("broadcast", { event: "press_a" }, ({ payload }) => setPressA(payload.ts));
    ch.on("broadcast", { event: "press_b" }, ({ payload }) => setPressB(payload.ts));
    // v4 : progression de chaque cale pendant le final (informative).
    ch.on("broadcast", { event: "final_status" }, ({ payload }) => {
      if (payload.role !== "A" && payload.role !== "B") return;
      setFinaleStatus(prev => ({ ...prev, [payload.role]: payload.stage }));
    });
    ch.on("broadcast", { event: "sync_fail" }, () => {
      setPressA(null); setPressB(null); setMyPressed(false);
      // v4 : les leviers se réarment, la progression affichée redevient "PRÊT".
      setFinaleStatus(prev => ({
        A: prev.A === "pulled" ? "unlocked" : prev.A,
        B: prev.B === "pulled" ? "unlocked" : prev.B,
      }));
      setFeedback(t("echoesCh7Fail"));
      feedbackTimers.current.push(setTimeout(() => setFeedback(""), 2400));
    });

    ch.on("broadcast", { event: "timeout" }, () => {
      setPhase(p => (p === "playing" ? "failure" : p));
      if (isHost) {
        const s = stateRef.current;
        saveGameState(room.id, "echoes", {
          phase: "failure", roleA: s.roles.A, roleB: s.roles.B, puzzle: s.puzzle,
          deadline: s.deadline, chapter: s.chapter,
        });
      }
    });

    ch.subscribe(status => {
      if (status === "SUBSCRIBED") {
        setChannelReady(true);
        // Resynchronisation : une partie en cours (rechargement de page) est
        // restaurée immédiatement plutôt que d'attendre un message perdu.
        if (!restoredRef.current) {
          restoredRef.current = true;
          const saved = readGameState(room, "echoes");
          // Garde-fou v4 : une sauvegarde d'AVANT cette version (sans les 6
          // nouvelles épreuves ni le final) est ignorée — la restaurer ferait
          // planter le rendu (puzzle.chSoute/chFinale absents) avec un flux
          // de chapitres décalé.
          if (saved && (!saved.puzzle || !saved.puzzle.chValves || !saved.puzzle.chFinale)) {
            // rien : on repart proprement sur l'écran d'intro
          } else if (saved) {
            setRoles({ A: saved.roleA, B: saved.roleB });
            setPuzzle(saved.puzzle);
            setDeadline(saved.deadline);
            setChapter(saved.chapter);
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
      ch1: genChapter1(), ch2: genChapter2(), ch3: genChapter3(),
      ch4: genChapter4(), ch5: genChapter5(), ch6: genChapter6(lang),
      chValves: genValves(), chLights: genLights(), chPattern: genPattern(),
      chSoute: genSoute(), chPipes: genPipes(), chFanal: genFanal(),
      chMaze: genMaze(), chMirrors: genMirrors(), chJars: genJars(),
      chFinale: genFinale(),
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
      if (s.phase === "playing" && s.chapter < VICTORY) {
        channelRef.current?.send({ type: "broadcast", event: "timeout", payload: {} });
      }
    }, ms + 60);
    return () => clearTimeout(tm);
  }, [deadline, phase]);

  function applyPenalty(amount = PENALTY_MS, reason = "wrong") {
    const s = stateRef.current;
    const newDeadline = (s.deadline || Date.now()) - amount;
    channelRef.current?.send({ type: "broadcast", event: "penalty", payload: { newDeadline, amount, reason } });
  }
  function advance(toChapter) {
    channelRef.current?.send({ type: "broadcast", event: "advance", payload: { chapter: toChapter } });
  }

  // v3 : le flux étant réordonné (CHAPTER_FLOW), chaque réussite avance vers
  // "le chapitre suivant" plutôt que vers un numéro codé en dur — lu dans
  // stateRef pour ne jamais dépendre d'une closure figée.
  function advanceNext() { advance(stateRef.current.chapter + 1); }

  function tryChapter1(code) { code === puzzle.ch1.solution ? advanceNext() : applyPenalty(); }
  function tryChapter2(pair) {
    const sorted = pair.slice().sort();
    (sorted[0] === puzzle.ch2.correctPair[0] && sorted[1] === puzzle.ch2.correctPair[1]) ? advanceNext() : applyPenalty();
  }
  function tryChapter3(picks) {
    const seq = puzzle.ch3.sequence;
    const ok = picks.length === seq.length && picks.every((v, i) => v === seq[i]);
    ok ? advanceNext() : applyPenalty();
  }
  function peekChapter3() { applyPenalty(PENALTY_PEEK_MS, "peek"); }
  function tryChapter4(angle) {
    const { start, end } = puzzle.ch4;
    (angle >= start && angle <= end) ? advanceNext() : applyPenalty();
  }
  function tryChapter5(anim) { anim === puzzle.ch5.targetAnim ? advanceNext() : applyPenalty(); }
  function tryChapter6(word) { word.toUpperCase() === puzzle.ch6.word ? advanceNext() : applyPenalty(); }
  function tryValves(states) {
    const tgt = puzzle.chValves.states;
    (states.length === tgt.length && states.every((v, i) => v === tgt[i])) ? advanceNext() : applyPenalty();
  }
  // ----- v4 : validations des six nouvelles épreuves -----
  function trySoute(pickedLabels) {
    const { labels, weights, target } = puzzle.chSoute;
    const sum = pickedLabels.reduce((s, l) => s + weights[labels.indexOf(l)], 0);
    (pickedLabels.length > 0 && sum === target) ? advanceNext() : applyPenalty();
  }
  function tryPipes(rotations) {
    const tiles = puzzle.chPipes.tiles;
    const ok = rotations.length === tiles.length && rotations.every((r, i) => pipeRotEqual(tiles[i].kind, r, tiles[i].target));
    ok ? advanceNext() : applyPenalty();
  }
  function tryFanal(picks) {
    const msg = puzzle.chFanal.message;
    const ok = picks.length === msg.length && picks.every((l, i) => l === msg[i]);
    ok ? advanceNext() : applyPenalty();
  }
  // Cale aveugle : pas de "tentative" ratée possible, B avance jusqu'à la
  // sortie (les chocs contre les murs ne coûtent que du temps réel).
  function mazeReached() { advanceNext(); }
  function tryMirrors(orientations) {
    const { mirrors, entryRow, targetExit } = puzzle.chMirrors;
    (traceBeam(mirrors, orientations, entryRow).exit === targetExit) ? advanceNext() : applyPenalty();
  }
  function tryJars(amount) {
    (amount === puzzle.chJars.target) ? advanceNext() : applyPenalty();
  }
  // Naufrage : mauvaise clé sur le cadenas = 1 minute (validé par Guillaume).
  function wrongFinaleKey() { applyPenalty(PENALTY_KEY_MS, "key"); }
  // Naufrage : diffusion de MA progression (informative, idempotente).
  function sendFinaleStatus(stage) {
    channelRef.current?.send({ type: "broadcast", event: "final_status", payload: { role: amA ? "A" : "B", stage } });
  }
  function tryLights(grid) {
    const tgt = puzzle.chLights.target;
    (grid.length === tgt.length && grid.every((v, i) => v === tgt[i])) ? advanceNext() : applyPenalty();
  }
  function tryPattern(seq) {
    const tgt = puzzle.chPattern.path;
    (seq.length === tgt.length && seq.every((v, i) => v === tgt[i])) ? advanceNext() : applyPenalty();
  }

  function pressLever(role) {
    if (myPressed) return;
    setMyPressed(true);
    channelRef.current?.send({ type: "broadcast", event: role === "A" ? "press_a" : "press_b", payload: { ts: Date.now() } });
  }

  // Dès que les deux estampilles de pression sont connues (self:true : les
  // DEUX clients les reçoivent), chacun calcule la synchro de son côté.
  useEffect(() => {
    if (pressA == null || pressB == null) return;
    if (Math.abs(pressA - pressB) <= SYNC_WINDOW_MS) advance(VICTORY);
    else channelRef.current?.send({ type: "broadcast", event: "sync_fail", payload: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pressA, pressB]);

  // Écriture du résultat (une fois), fin variable selon le temps restant /
  // la progression, points partagés entre les 2 joueurs.
  useEffect(() => {
    if ((phase !== "success" && phase !== "failure") || savedResultRef.current) return;
    const amAr = roles.A && me.id === roles.A.id;
    const amBr = roles.B && me.id === roles.B.id;
    if (!amAr && !amBr) return;
    savedResultRef.current = true;

    let variant;
    const won = phase === "success";
    if (won) {
      // Seuil "perfect" recalé sur le nouveau total de 18 min (1/3 restant).
      variant = timeLeft > 6 * 60 * 1000 ? "perfect" : timeLeft > 60 * 1000 ? "standard" : "narrow";
    } else {
      variant = chapter >= TOTAL_CHAPTERS ? "close" : "storm";
    }
    setEndingVariant(variant);
    setMyWin(won);
    if (won) playGameWin(); else playGameLose(); // SFX fin de partie (2026-07)
    recordMatchResult(room.id, won);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // "Rejouer" : relance avec les 2 mêmes joueurs, puzzle entièrement régénéré
  // (cohérent avec le principe procédural/rejouable d'Échos).
  function rejouer() {
    if (!isHost || !roles.A || !roles.B) return;
    const [roleA, roleB] = Math.random() < 0.5 ? [roles.A, roles.B] : [roles.B, roles.A];
    const payload = {
      roleA, roleB,
      ch1: genChapter1(), ch2: genChapter2(), ch3: genChapter3(),
      ch4: genChapter4(), ch5: genChapter5(), ch6: genChapter6(lang),
      chValves: genValves(), chLights: genLights(), chPattern: genPattern(),
      chSoute: genSoute(), chPipes: genPipes(), chFanal: genFanal(),
      chMaze: genMaze(), chMirrors: genMirrors(), chJars: genJars(),
      chFinale: genFinale(),
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
    // v3 : le numéro de chapitre est traduit en TYPE d'épreuve via
    // CHAPTER_FLOW — les blocs ci-dessous sont inchangés pour les 6 énigmes
    // historiques, seuls leurs déclencheurs (type au lieu de numéro) bougent.
    const type = CHAPTER_FLOW[chapter - 1];
    if (type === "code") return (
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
    if (type === "gears") return (
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("echoesCh2Title")}</h2>
        <p className="hint">{t("echoesCh2Story")}</p>
        {!isPlayer ? <p className="muted">{t("echoesSpectatorNote")}</p> : amA ? (
          <>
            <p className="muted">{t("echoesCh2TextA")}</p>
            <p style={{ textAlign: "center", fontWeight: 800, fontSize: 22, margin: "10px 0" }}>
              🎯 {t(puzzle.ch2.goal === "diff" ? "echoesCh2GoalDiff" : "echoesCh2GoalSum")}{" "}
              <span style={{ fontFamily: "'Space Mono'", color: "var(--p3)" }}>{puzzle.ch2.target}</span>
            </p>
            <GearPicker onConfirm={tryChapter2} t={t} labels={puzzle.ch2.gears.map(g => g.label)} />
          </>
        ) : (
          <><p className="muted">{t("echoesCh2TextB")}</p><GearInfo gears={puzzle.ch2.gears} /></>
        )}
      </div>
    );
    if (type === "memory") return (
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("echoesCh3Title")}</h2>
        <p className="hint">{t("echoesCh3Story")}</p>
        {!isPlayer ? <p className="muted">{t("echoesSpectatorNote")}</p> : amA ? (
          <><p className="muted">{t("echoesCh3TextInfo")}</p><MemoryInfo sequence={puzzle.ch3.sequence} t={t} onPeek={peekChapter3} /></>
        ) : (
          <><p className="muted">{t("echoesCh3TextInput")}</p><MemoryInput tiles={puzzle.ch3.tiles} onConfirm={tryChapter3} t={t} count={puzzle.ch3.sequence.length} /></>
        )}
      </div>
    );
    if (type === "valves") return (
      // NOUVEAU (v3) — Salle des Machines : B lit la configuration cible,
      // A manœuvre les volants. Mécanique : configuration d'interrupteurs.
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("echoesChValvesTitle")}</h2>
        <p className="hint">{t("echoesChValvesStory")}</p>
        {!isPlayer ? <p className="muted">{t("echoesSpectatorNote")}</p> : amB ? (
          <><p className="muted">{t("echoesChValvesTextInfo")}</p><ValveTargets valves={puzzle.chValves} t={t} /></>
        ) : (
          <><p className="muted">{t("echoesChValvesTextInput")}</p><ValveBoard labels={puzzle.chValves.labels} onConfirm={tryValves} t={t} /></>
        )}
      </div>
    );
    if (type === "dial") return (
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("echoesCh4Title")}</h2>
        <p className="hint">{t("echoesCh4Story")}</p>
        {!isPlayer ? <p className="muted">{t("echoesSpectatorNote")}</p> : amA ? (
          <><p className="muted">{t("echoesCh4TextA")}</p><ZoneClue start={puzzle.ch4.start} end={puzzle.ch4.end} t={t} /></>
        ) : (
          <><p className="muted">{t("echoesCh4TextB")}</p><DialStopper period={puzzle.ch4.period || DIAL_PERIOD_MS} dir={puzzle.ch4.dir || "cw"} onStop={tryChapter4} t={t} /></>
        )}
      </div>
    );
    if (type === "decor") return (
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("echoesCh5Title")}</h2>
        <p className="hint">{t("echoesCh5Story")}</p>
        {!isPlayer ? <p className="muted">{t("echoesSpectatorNote")}</p> : amB ? (
          <><p className="muted">{t("echoesCh5TextInfo")}</p><DecorClue targetAnim={puzzle.ch5.targetAnim} t={t} /></>
        ) : (
          <><p className="muted">{t("echoesCh5TextInput")}</p><DecorRoom objects={puzzle.ch5.objects} onPick={tryChapter5} /></>
        )}
      </div>
    );
    if (type === "lights") return (
      // NOUVEAU (v3) — Lampisterie : A lit la disposition cible, B presse des
      // lampes qui basculent aussi leurs voisines (lights-out coopératif).
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("echoesChLightsTitle")}</h2>
        <p className="hint">{t("echoesChLightsStory")}</p>
        {!isPlayer ? <p className="muted">{t("echoesSpectatorNote")}</p> : amA ? (
          <><p className="muted">{t("echoesChLightsTextInfo")}</p><LightsTarget target={puzzle.chLights.target} /></>
        ) : (
          <><p className="muted">{t("echoesChLightsTextInput")}</p><LightsBoard onConfirm={tryLights} t={t} /></>
        )}
      </div>
    );
    if (type === "cipher") return (
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("echoesCh6Title")}</h2>
        <p className="hint">{t("echoesCh6Story")}</p>
        {!isPlayer ? <p className="muted">{t("echoesSpectatorNote")}</p> : amA ? (
          <>
            <p className="muted">{t("echoesCh6TextA")}</p>
            <CipherLegend legend={puzzle.ch6.legend} />
            <CipherEntry onSubmit={tryChapter6} t={t} length={puzzle.ch6.word.length} />
          </>
        ) : (
          <><p className="muted">{t("echoesCh6TextB")}</p><EncodedMessage encoded={puzzle.ch6.encoded} /></>
        )}
      </div>
    );
    if (type === "pattern") return (
      // NOUVEAU (v3) — Carte des Étoiles : A lit le tracé sur la carte
      // repérée (A–C / 1–3), B le reproduit étoile par étoile, dans l'ordre.
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("echoesChPatternTitle")}</h2>
        <p className="hint">{t("echoesChPatternStory")}</p>
        {!isPlayer ? <p className="muted">{t("echoesSpectatorNote")}</p> : amA ? (
          <><p className="muted">{t("echoesChPatternTextInfo")}</p><PatternClue path={puzzle.chPattern.path} t={t} /></>
        ) : (
          <><p className="muted">{t("echoesChPatternTextInput")}</p><PatternInput length={puzzle.chPattern.path.length} onConfirm={tryPattern} t={t} /></>
        )}
      </div>
    );
    // ===== v4 : les six nouvelles épreuves =====
    if (type === "soute") return (
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("echoesSouteTitle")}</h2>
        <p className="hint">{t("echoesSouteStory")}</p>
        {!isPlayer ? <p className="muted">{t("echoesSpectatorNote")}</p> : amA ? (
          <><p className="muted">{t("echoesSouteTextInfo")}</p><SouteInfo soute={puzzle.chSoute} /></>
        ) : (
          <><p className="muted">{t("echoesSouteTextInput")}</p><SouteBoard labels={puzzle.chSoute.labels} target={puzzle.chSoute.target} onConfirm={trySoute} t={t} /></>
        )}
      </div>
    );
    if (type === "pipes") return (
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("echoesPipesTitle")}</h2>
        <p className="hint">{t("echoesPipesStory")}</p>
        {!isPlayer ? <p className="muted">{t("echoesSpectatorNote")}</p> : amB ? (
          <><p className="muted">{t("echoesPipesTextInfo")}</p><PipesPlan pipes={puzzle.chPipes} t={t} /></>
        ) : (
          <><p className="muted">{t("echoesPipesTextInput")}</p><PipesBoard pipes={puzzle.chPipes} onConfirm={tryPipes} t={t} /></>
        )}
      </div>
    );
    if (type === "fanal") return (
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("echoesFanalTitle")}</h2>
        <p className="hint">{t("echoesFanalStory")}</p>
        {!isPlayer ? <p className="muted">{t("echoesSpectatorNote")}</p> : amA ? (
          <><p className="muted">{t("echoesFanalTextInfo")}</p><FanalLegend legend={puzzle.chFanal.legend} t={t} /></>
        ) : (
          <><p className="muted">{t("echoesFanalTextInput")}</p><FanalWatcher fanal={puzzle.chFanal} onConfirm={tryFanal} t={t} /></>
        )}
      </div>
    );
    if (type === "mirrors") return (
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("echoesMirrorsTitle")}</h2>
        <p className="hint">{t("echoesMirrorsStory")}</p>
        {!isPlayer ? <p className="muted">{t("echoesSpectatorNote")}</p> : amB ? (
          <><p className="muted">{t("echoesMirrorsTextInfo")}</p><MirrorsTargetInfo targetExit={puzzle.chMirrors.targetExit} t={t} /></>
        ) : (
          <><p className="muted">{t("echoesMirrorsTextInput")}</p><MirrorsBoard mirrors={puzzle.chMirrors.mirrors} entryRow={puzzle.chMirrors.entryRow} start={puzzle.chMirrors.start} onConfirm={tryMirrors} t={t} /></>
        )}
      </div>
    );
    if (type === "maze") return (
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("echoesMazeTitle")}</h2>
        <p className="hint">{t("echoesMazeStory")}</p>
        {!isPlayer ? <p className="muted">{t("echoesSpectatorNote")}</p> : amA ? (
          <><p className="muted">{t("echoesMazeTextInfo")}</p><MazeMap maze={puzzle.chMaze} /></>
        ) : (
          <><p className="muted">{t("echoesMazeTextInput")}</p><MazeWalk maze={puzzle.chMaze} onReach={mazeReached} t={t} /></>
        )}
      </div>
    );
    if (type === "jars") return (
      <div>
        <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("echoesJarsTitle")}</h2>
        <p className="hint">{t("echoesJarsStory")}</p>
        {!isPlayer ? <p className="muted">{t("echoesSpectatorNote")}</p> : amB ? (
          <><p className="muted">{t("echoesJarsTextInfo")}</p><JarsInfo jars={puzzle.chJars} t={t} /></>
        ) : (
          <><p className="muted">{t("echoesJarsTextInput")}</p><JarsBoard jars={puzzle.chJars} onPour={tryJars} t={t} /></>
        )}
      </div>
    );
    // ===== v4 : final "Le Naufrage" (les DEUX joueurs manipulent) =====
    if (type === "naufrage") {
      const myRole = amA ? "A" : "B";
      const otherRole = amA ? "B" : "A";
      return (
        <div>
          <h2 style={{ fontSize: 17, margin: "10px 0 6px" }}>{t("echoesFinTitle")}</h2>
          <p className="hint">{t("echoesFinStory")}</p>
          {!isPlayer ? (
            <>
              <p className="muted">{t("echoesSpectatorNote")}</p>
              <p className="muted" style={{ textAlign: "center" }}>
                {roles.A?.username} : {t("echoesFinStage" + cap(finaleStatus.A))} · {roles.B?.username} : {t("echoesFinStage" + cap(finaleStatus.B))}
              </p>
            </>
          ) : (
            <EchoesFinale
              role={myRole}
              conf={puzzle.chFinale[myRole]}
              plaqueShape={puzzle.chFinale[otherRole].correct}
              partnerStage={finaleStatus[otherRole]}
              partnerName={(amA ? roles.B : roles.A)?.username}
              timeLeft={timeLeft}
              totalMs={TOTAL_MS}
              t={t}
              onWrongKey={wrongFinaleKey}
              onStatus={sendFinaleStatus}
              onLever={() => pressLever(myRole)}
              leverPressed={myPressed}
            />
          )}
        </div>
      );
    }
    return null;
  }

  // v4 : le final "Le Naufrage" a droit à une fenêtre AGRANDIE (demande
  // explicite) pour que la scène de la cale respire ; le reste du jeu garde
  // son gabarit habituel.
  const inFinale = phase === "playing" && CHAPTER_FLOW[chapter - 1] === "naufrage";
  return (
    <div className="panel" style={{ maxWidth: inFinale ? "min(1020px, 97vw)" : "min(820px, 94vw)" }}>
      <h1>{t("echoesTitle")}</h1>

      {phase === "playing" && (
        <>
          {isPlayer && <div className="echo-role-badge">🗼 {amA ? t("echoesRoleA") : t("echoesRoleB")}</div>}
          <RoomAtmosphere chapter={chapter} timeLeft={timeLeft} />
          <div className="echo-timerbar">
            <div className="echo-timerbar-fill" style={{
              width: (timeLeft / TOTAL_MS * 100) + "%",
              background: timeLeft < 60000 ? "var(--p1)" : timeLeft < TOTAL_MS * 0.35 ? "var(--p4)" : "linear-gradient(90deg,var(--acc-echoes),var(--p3))"
            }} />
          </div>
          <div style={{ display: "flex", gap: 5, margin: "0 0 12px", flexWrap: "wrap" }}>
            {Array.from({ length: TOTAL_CHAPTERS }, (_, i) => i + 1).map(n => (
              <div key={n} className={"progress-dot" + (chapter > n ? " done" : "")} />
            ))}
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
              {t("echoesChapterLabel")} {Math.min(chapter, TOTAL_CHAPTERS)}/{TOTAL_CHAPTERS}
            </p>
            {renderChapterContent()}
          </div>
        )}

        {(phase === "success" || phase === "failure") && (
          <div>
            <h2 style={{ fontSize: 22 }}>{t("echoesEnd" + cap(endingVariant) + "Title")}</h2>
            <p className="hint">{t("echoesEnd" + cap(endingVariant) + "Text")}</p>
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
