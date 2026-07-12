"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby } from "@/lib/gameSync";
import Crossfade from "./Crossfade";

const WIN_POINTS = 3, PARTICIPATE_POINTS = 1;

// ===================================================================
// Géométrie du plateau (15x15), dérivée et vérifiée case par case.
// Piste commune : 56 cases dans l'ordre horaire en partant de la case
// de départ du Rouge. Symétrie à 4 branches (56 / 4 = 14 cases entre
// chaque départ de couleur). Chaque couleur a ensuite un couloir privé
// de 6 cases menant au centre, emprunté après avoir fait le tour complet.
// Cette géométrie a été testée unitairement (adjacence de chaque case,
// raccord des fourches d'entrée en couloir privé) avant intégration ici.
// ===================================================================
const TRACK = [
  [6,1],[6,2],[6,3],[6,4],[6,5],[6,6],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],
  [1,8],[2,8],[3,8],[4,8],[5,8],[6,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],
  [8,13],[8,12],[8,11],[8,10],[8,9],[8,8],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],
  [13,6],[12,6],[11,6],[10,6],[9,6],[8,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]
];

const COLORS = {
  red:    { css: "--p1",   start: 0,  home: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],       yard: [[1,1],[1,4],[4,1],[4,4]],       yardBox: [0,0,5,5] },
  green:  { css: "--p3",   start: 14, home: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],       yard: [[1,10],[1,13],[4,10],[4,13]],   yardBox: [0,9,5,14] },
  yellow: { css: "--ludoY", start: 28, home: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],   yard: [[10,10],[10,13],[13,10],[13,13]], yardBox: [9,9,14,14] },
  blue:   { css: "--ludoB", start: 42, home: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],   yard: [[10,1],[10,4],[13,1],[13,4]],   yardBox: [9,0,14,5] },
};
const COLOR_ORDER = ["red", "green", "yellow", "blue"];
const SAFE_ABS = new Set([0, 8, 14, 22, 28, 36, 42, 50]);

// ===== Cases MYSTÈRE « ? » (2026-07) =====
// 8 cases fixes réparties sur la piste commune (jamais un départ ni une
// case sûre) : y ATTERRIR — pile — révèle un bonus ou un malus au hasard
// (tiré par l'hôte, voir MYSTERY_KINDS/hostHandleMove). Positions choisies
// à mi-chemin entre les étoiles pour rythmer chaque quart de plateau.
const MYSTERY_ABS = new Set([4, 11, 18, 25, 32, 39, 46, 53]);
// Effets possibles (équiprobables) — pensés pour pimenter sans casser :
// - boost    : le pion qui vient d'atterrir avance de 3 cases en plus ;
// - setback  : il recule de 4 cases (jamais plus bas que la case 1) ;
// - oppOneDie: le joueur SUIVANT ne lancera qu'UN dé à son prochain tour ;
// - reroll   : relance immédiate (comme un 6) une fois le tour fini.
const MYSTERY_KINDS = ["boost", "setback", "oppOneDie", "reroll"];

// Minuteur de COUP (2026-07) : 20 s pour jouer après chaque tirage,
// réinitialisé à chaque déplacement (un coup = 20 s pleines). Dépassement =
// tour passé. Le décompte ne démarre qu'après l'animation de lancer.
const MOVE_MS = 20000;
const ROLL_ANIM_MS = 950;

// Attribution des couleurs selon le nombre de joueurs (retouche 2026-07 /
// zip 83) : en 1 CONTRE 1, les deux joueurs partent DIAGONALEMENT opposés
// (rouge haut-gauche / jaune bas-droite — départs distants d'exactement une
// demi-piste, 28 cases sur 56) : duel face-à-face lisible et équitable, au
// lieu de deux enclos voisins. À 3-4 joueurs, ordre horaire classique.
function colorsForCount(count) {
  return count === 2 ? ["red", "yellow"] : COLOR_ORDER.slice(0, count);
}

// Zone d'ARRIVÉE centrale élargie (zip 83) : coin haut-gauche (en cases
// fractionnaires) du quadrant de chaque couleur, où se rangent ses pions
// arrivés (steps = 61), en mini-grille 2×2. Quadrants orientés comme les
// enclos : rouge NO, vert NE, jaune SE, bleu SO.
const GOAL_QUADRANT = { red: [6.55, 6.55], green: [6.55, 7.55], yellow: [7.55, 7.55], blue: [7.55, 6.55] };

// Ancrage du PLATEAU DE DÉS (2026-07) : près du camp du joueur dont c'est
// le tour (même coin que son enclos), en % du plateau.
const DICE_TRAY_POS = {
  red:    { top: "13%", left: "13%" },
  green:  { top: "13%", right: "13%" },
  yellow: { bottom: "13%", right: "13%" },
  blue:   { bottom: "13%", left: "13%" },
};

// --- Classification statique des 225 cases du plateau (calculée une seule fois) ---
const CELL_TYPE = {};
for (let r = 0; r < 15; r++) {
  for (let c = 0; c < 15; c++) {
    let type = "path";
    for (const [color, cfg] of Object.entries(COLORS)) {
      const [r1, c1, r2, c2] = cfg.yardBox;
      if (r >= r1 && r <= r2 && c >= c1 && c <= c2) { type = "yard-" + color; break; }
    }
    if (type === "path") {
      if (r === 7 && c === 7) type = "center";
      else {
        for (const color of COLOR_ORDER) {
          if (COLORS[color].home.some(([hr, hc]) => hr === r && hc === c)) { type = "home-" + color; break; }
        }
      }
    }
    CELL_TYPE[r + "_" + c] = type;
  }
}
// Cases sûres (étoiles) et cases mystère (?) en coordonnées, pour l'affichage
const SAFE_CELLS = new Set([...SAFE_ABS].map(i => TRACK[i].join("_")));
const MYSTERY_CELLS = new Set([...MYSTERY_ABS].map(i => TRACK[i].join("_")));

function absIndex(color, steps) {
  return (COLORS[color].start + steps - 1) % 56;
}
function cellFor(color, steps) {
  if (steps <= 0) return null;
  if (steps <= 55) return TRACK[absIndex(color, steps)];
  if (steps <= 61) return COLORS[color].home[steps - 56];
  return null;
}
// Sortie d'enclos : uniquement avec un dé affichant 6 (JAMAIS la somme —
// règle conservée du jeu à un dé, adaptée : le 6 doit être lu sur UN dé).
function canMoveToken(steps, roll, isSum) {
  if (steps === 0) return roll === 6 && !isSum;
  if (steps >= 61) return false;
  return steps + roll <= 61;
}
function movableIndices(tokensOfColor, roll, isSum) {
  return tokensOfColor.map((s, i) => i).filter(i => canMoveToken(tokensOfColor[i], roll, isSum));
}
// Applique un mouvement sur une copie profonde de `tokens` ; renvoie le
// nouvel état, la liste des captures ([couleur, index]) et si la couleur
// vient de terminer (ses 4 pions à la maison).
function applyMove(tokens, color, tokenIdx, roll) {
  const next = {};
  for (const c of COLOR_ORDER) next[c] = tokens[c].slice();
  const steps = next[color][tokenIdx];
  const newSteps = steps === 0 ? 1 : steps + roll;
  const captured = [];
  if (newSteps >= 1 && newSteps <= 55) {
    const abs = absIndex(color, newSteps);
    if (!SAFE_ABS.has(abs)) {
      for (const other of COLOR_ORDER) {
        if (other === color) continue;
        next[other].forEach((s, i) => {
          if (s >= 1 && s <= 55 && absIndex(other, s) === abs) {
            captured.push([other, i]);
            next[other][i] = 0;
          }
        });
      }
    }
  }
  next[color][tokenIdx] = newSteps;
  const won = next[color].every(s => s === 61);
  return { tokens: next, captured, won };
}
// Recul (case mystère "setback") : -4 cases sur la piste, plancher à la
// case 1 — capture à l'arrivée comme un coup normal (hors case sûre).
function applySetback(tokens, color, tokenIdx) {
  const next = {};
  for (const c of COLOR_ORDER) next[c] = tokens[c].slice();
  const steps = next[color][tokenIdx];
  if (steps < 1 || steps > 55) return { tokens: next, captured: [] };
  const newSteps = Math.max(1, steps - 4);
  const captured = [];
  const abs = absIndex(color, newSteps);
  if (!SAFE_ABS.has(abs)) {
    for (const other of COLOR_ORDER) {
      if (other === color) continue;
      next[other].forEach((s, i) => {
        if (s >= 1 && s <= 55 && absIndex(other, s) === abs) {
          captured.push([other, i]);
          next[other][i] = 0;
        }
      });
    }
  }
  next[color][tokenIdx] = newSteps;
  return { tokens: next, captured };
}
function emptyTokens() {
  const t = {};
  for (const c of COLOR_ORDER) t[c] = [0, 0, 0, 0];
  return t;
}

// Chiffres romains 1-12 (affichage de l'addition des dés : "III + V = VIII").
const ROMANS = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
function toRoman(n) { return ROMANS[n] || String(n); }

// Plan des coups légaux pour un tirage : indices jouables par dé + par la
// somme (somme = un SEUL déplacement de a+b, uniquement si les deux dés
// sont encore inutilisés — jamais pour sortir de l'enclos).
function buildPlan(tokensOfColor, dice) {
  const d0 = dice.used[0] ? [] : movableIndices(tokensOfColor, dice.a, false);
  const d1 = dice.b == null || dice.used[1] ? [] : movableIndices(tokensOfColor, dice.b, false);
  const sum = dice.b != null && !dice.used[0] && !dice.used[1]
    ? movableIndices(tokensOfColor, dice.a + dice.b, true)
    : [];
  return { d0, d1, sum };
}
function planHasMove(plan) {
  return plan.d0.length > 0 || plan.d1.length > 0 || plan.sum.length > 0;
}

// ----- Dé visuel : pips en grille 3×3, colorés à la couleur du camp -----
const PIP_MAP = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};
function DieFace({ value, colorVar, size, selected, dim, onClick, animClass }) {
  return (
    <button
      type="button"
      className={
        "ludo-die" + (animClass ? " " + animClass : "") + (selected ? " selected" : "")
        + (dim ? " dim" : "") + (onClick ? " pickable" : "")
      }
      style={{ "--die-pip": `var(${colorVar})`, width: size, height: size }}
      onClick={onClick || undefined}
      disabled={!onClick}
    >
      <span className="ludo-die-grid">
        {Array.from({ length: 9 }, (_, i) => (
          <i key={i} className={PIP_MAP[value]?.includes(i) ? "pip on" : "pip"} />
        ))}
      </span>
    </button>
  );
}

export default function PetitsChevaux({ room, me, isHost, players, t, lang, onFinish }) {
  const [phase, setPhase] = useState("intro"); // intro (choix/attente) -> playing -> finished
  const [order, setOrder] = useState([]);           // couleurs en jeu, dans l'ordre du tour
  const [colorOfPlayer, setColorOfPlayer] = useState({}); // profile_id -> couleur
  const [tokens, setTokens] = useState(emptyTokens());
  const [turnIdx, setTurnIdx] = useState(0);
  // DEUX DÉS (2026-07) : dice = { a, b (null si tour à un dé), used:[bool,
  // bool], rollKey } | null. movablePlan = { d0, d1, sum } (indices de pions
  // jouables par option). effects = malus/bonus persistants par couleur.
  const [dice, setDice] = useState(null);
  const [movablePlan, setMovablePlan] = useState(null);
  const [effects, setEffects] = useState({});
  const [moveDeadline, setMoveDeadline] = useState(null);
  const [lastMoved, setLastMoved] = useState(null); // { color, tokenIdx } pour l'anim
  const [lastEvent, setLastEvent] = useState(null); // texte de statut transitoire
  const [winner, setWinner] = useState(null);       // null | couleur
  const [selected, setSelected] = useState([]);     // sélection du picker (>4 joueurs)
  const [myGain, setMyGain] = useState(0);
  const [channelReady, setChannelReady] = useState(false);
  // Choix LOCAL du dé à jouer (0 | 1 | "sum") — jamais diffusé : seul le
  // move_attempt (pion + dé) part en réseau.
  const [selectedDie, setSelectedDie] = useState(null);
  // Animation de lancer : phase locale ("rolling" pendant ~1 s, puis
  // "settled"), avec faces aléatoires qui défilent pendant le roulis.
  const [rollAnim, setRollAnim] = useState(null); // { key, phase, faces:[a,b], variant }
  const [now, setNow] = useState(() => Date.now());
  // Zone d'arrivée (zip 83) : rayons de lumière tournants pendant 5 s quand
  // un pion vient d'arriver au centre — { key, color } ou null.
  const [goalBurst, setGoalBurst] = useState(null);

  const channelRef = useRef(null);
  const stateRef = useRef({ tokens, order, turnIdx, dice, movablePlan, effects, winner });
  const savedResultRef = useRef(false);
  const autoStartedRef = useRef(false);
  const restoredRef = useRef(false);
  const timeouts = useRef([]);
  // Miroirs annexes pour l'arbitre (hôte) : évitent des closures figées et
  // gardent les compteurs de 6 d'affilée en dehors du cycle de rendu React.
  const colorRef = useRef({});
  const sixesCountRef = useRef({});
  const moveTimerRef = useRef(null);   // couperet 20 s côté hôte
  const rollAnimTimerRef = useRef(null);
  const rollAnimIvRef = useRef(null);

  useEffect(() => {
    stateRef.current = { tokens, order, turnIdx, dice, movablePlan, effects, winner };
  }, [tokens, order, turnIdx, dice, movablePlan, effects, winner]);
  useEffect(() => { colorRef.current = colorOfPlayer; }, [colorOfPlayer]);

  // Horloge d'affichage du compte à rebours de coup (250 ms suffit).
  useEffect(() => {
    if (!moveDeadline) return;
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [moveDeadline]);

  // Animation de lancer : déclenchée par CHAQUE nouveau rollKey reçu (tous
  // les clients la voient, spectateurs compris). Trois variantes de roulis
  // pour la variété (rollKey % 3), faces aléatoires pendant ~1 s, puis les
  // vraies valeurs se posent.
  useEffect(() => {
    if (!dice || dice.rollKey == null) { setRollAnim(null); return; }
    const key = dice.rollKey;
    setRollAnim({ key, phase: "rolling", faces: [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)], variant: key % 3 });
    clearInterval(rollAnimIvRef.current);
    rollAnimIvRef.current = setInterval(() => {
      setRollAnim(prev => prev && prev.phase === "rolling"
        ? { ...prev, faces: [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)] }
        : prev);
    }, 90);
    clearTimeout(rollAnimTimerRef.current);
    rollAnimTimerRef.current = setTimeout(() => {
      clearInterval(rollAnimIvRef.current);
      setRollAnim({ key, phase: "settled", faces: null, variant: key % 3 });
    }, ROLL_ANIM_MS);
    return () => { clearInterval(rollAnimIvRef.current); clearTimeout(rollAnimTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dice?.rollKey]);

  // Choix par défaut du dé à jouer, recalculé quand le tirage ou le plan
  // change : la somme si c'est la seule option, sinon le premier dé encore
  // jouable — le joueur peut toujours cliquer un autre dé/la somme.
  useEffect(() => {
    if (!dice || !movablePlan) { setSelectedDie(null); return; }
    setSelectedDie(prev => {
      const valid = (d) => d === "sum" ? movablePlan.sum.length > 0
        : d === 0 ? movablePlan.d0.length > 0
        : d === 1 ? movablePlan.d1.length > 0 : false;
      if (prev != null && valid(prev)) return prev;
      if (movablePlan.d0.length) return 0;
      if (movablePlan.d1.length) return 1;
      if (movablePlan.sum.length) return "sum";
      return null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dice?.rollKey, movablePlan]);

  function applyBroadcastState(payload) {
    setTokens(payload.tokens);
    setTurnIdx(payload.turnIdx);
    setDice(payload.dice || null);
    setMovablePlan(payload.movablePlan || null);
    setEffects(payload.effects || {});
    setMoveDeadline(payload.moveDeadline || null);
    setLastMoved(payload.lastMoved);
    setLastEvent(payload.lastEvent);
    setWinner(payload.winner);
    // Zone d'arrivée (zip 83) : si ce coup vient de faire ENTRER un pion
    // au centre (61), déclenche les rayons tournants pendant 5 secondes.
    if (payload.lastMoved) {
      const { color: gbColor, tokenIdx: gbIdx } = payload.lastMoved;
      if (payload.tokens?.[gbColor]?.[gbIdx] === 61) {
        setGoalBurst({ key: Date.now(), color: gbColor });
        timeouts.current.push(setTimeout(() => setGoalBurst(null), 5000));
      }
    }
  }

  useEffect(() => {
    const ch = supabase.channel("ludo_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "match_start" }, ({ payload }) => {
      setOrder(payload.order);
      setColorOfPlayer(payload.colorOfPlayer);
      setTokens(emptyTokens());
      setTurnIdx(0);
      setDice(null);
      setMovablePlan(null);
      setEffects({});
      setMoveDeadline(null);
      setLastMoved(null);
      setLastEvent(null);
      setWinner(null);
      setMyGain(0);
      savedResultRef.current = false;
      sixesCountRef.current = {}; // sinon un reliquat de la partie précédente
      // (ex: 2 six d'affilée juste avant la victoire) fait perdre un tour
      // pour "3 six d'affilée" dès le 1er ou 2e six de la revanche.
      setPhase("playing");
      if (isHost) {
        clearTimeout(moveTimerRef.current);
        saveGameState(room.id, "ludo", {
          v2: true, phase: "playing", order: payload.order, colorOfPlayer: payload.colorOfPlayer,
          tokens: emptyTokens(), turnIdx: 0, dice: null, movablePlan: null, effects: {},
          moveDeadline: null, lastMoved: null, lastEvent: null, winner: null,
        });
      }
    });

    ch.on("broadcast", { event: "roll_attempt" }, ({ payload }) => {
      if (!isHost) return;
      hostHandleRoll(payload);
    });

    ch.on("broadcast", { event: "move_attempt" }, ({ payload }) => {
      if (!isHost) return;
      hostHandleMove(payload);
    });

    ch.on("broadcast", { event: "state" }, ({ payload }) => {
      applyBroadcastState(payload);
      if (isHost) {
        saveGameState(room.id, "ludo", {
          v2: true, phase: "playing", order: stateRef.current.order, colorOfPlayer: colorRef.current,
          tokens: payload.tokens, turnIdx: payload.turnIdx, dice: payload.dice || null,
          movablePlan: payload.movablePlan || null, effects: payload.effects || {},
          moveDeadline: payload.moveDeadline || null,
          lastMoved: payload.lastMoved, lastEvent: payload.lastEvent, winner: payload.winner,
        });
      }
    });

    ch.subscribe(status => {
      if (status === "SUBSCRIBED") {
        setChannelReady(true);
        // Resynchronisation : une partie en cours (rechargement de page) est
        // restaurée immédiatement plutôt que d'attendre un message perdu.
        // GARDE-FOU : une sauvegarde d'AVANT le passage aux deux dés (sans
        // le drapeau v2) est ignorée — son format (dice numérique, movable
        // à plat) ferait crasher le moteur ; on repart proprement du choix
        // des joueurs plutôt que de restaurer un état incompatible.
        if (!restoredRef.current) {
          restoredRef.current = true;
          const saved = readGameState(room, "ludo");
          if (saved && saved.v2) {
            setOrder(saved.order); setColorOfPlayer(saved.colorOfPlayer);
            setTokens(saved.tokens); setTurnIdx(saved.turnIdx);
            setDice(saved.dice || null); setMovablePlan(saved.movablePlan || null);
            setEffects(saved.effects || {}); setMoveDeadline(saved.moveDeadline || null);
            setLastMoved(saved.lastMoved); setLastEvent(saved.lastEvent);
            setWinner(saved.winner);
            setPhase("playing");
            autoStartedRef.current = true;
            // Reprise HÔTE avec un tirage en cours : rediffuse l'état avec
            // une échéance fraîche et réarme le couperet 20 s (sans ça, le
            // tour resterait figé pour tout le monde).
            if (isHost && !saved.winner && saved.dice) {
              const deadline = Date.now() + MOVE_MS;
              broadcastState({
                tokens: saved.tokens, turnIdx: saved.turnIdx, dice: saved.dice,
                movablePlan: saved.movablePlan, effects: saved.effects || {},
                moveDeadline: deadline, lastMoved: saved.lastMoved, lastEvent: saved.lastEvent,
                winner: saved.winner,
              });
              armMoveTimer(deadline);
            }
          }
        }
      }
    });

    return () => {
      timeouts.current.forEach(clearTimeout);
      clearTimeout(moveTimerRef.current);
      clearTimeout(rollAnimTimerRef.current);
      clearInterval(rollAnimIvRef.current);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, isHost]);

  function broadcastState(patch) {
    const s = stateRef.current;
    const payload = {
      tokens: patch.tokens ?? s.tokens,
      turnIdx: patch.turnIdx ?? s.turnIdx,
      dice: "dice" in patch ? patch.dice : s.dice,
      movablePlan: "movablePlan" in patch ? patch.movablePlan : null,
      effects: "effects" in patch ? patch.effects : s.effects,
      moveDeadline: "moveDeadline" in patch ? patch.moveDeadline : null,
      lastMoved: "lastMoved" in patch ? patch.lastMoved : null,
      lastEvent: "lastEvent" in patch ? patch.lastEvent : null,
      winner: "winner" in patch ? patch.winner : s.winner,
    };
    channelRef.current.send({ type: "broadcast", event: "state", payload });
  }

  // Couperet 20 s (hôte) : si le joueur n'a pas fini de jouer son tirage à
  // l'échéance, son tour passe — dés restants perdus, pas de relance même
  // avec un 6 (la relance se mérite en jouant).
  function armMoveTimer(deadline) {
    clearTimeout(moveTimerRef.current);
    if (!isHost || !deadline) return;
    moveTimerRef.current = setTimeout(() => {
      const s = stateRef.current;
      if (!s || s.winner || !s.dice) return;
      const currentColor = s.order[s.turnIdx];
      sixesCountRef.current[currentColor] = 0;
      broadcastState({
        turnIdx: (s.turnIdx + 1) % s.order.length,
        dice: null, movablePlan: null, moveDeadline: null,
        effects: s.effects, lastEvent: "timeout",
      });
    }, Math.max(0, deadline - Date.now()));
  }

  // ----- Arbitrage du lancer des dés : seul l'hôte y répond -----
  function hostHandleRoll({ by }) {
    const s = stateRef.current;
    if (s.winner || s.dice !== null) return;
    const currentColor = s.order[s.turnIdx];
    const ownerId = Object.keys(colorRef.current).find(pid => colorRef.current[pid] === currentColor);
    if (by !== ownerId) return;

    // Malus "un seul dé" (case mystère oppOneDie) : consommé par CE lancer.
    const eff = { ...(s.effects || {}) };
    const single = !!(eff[currentColor] && eff[currentColor].oneDie);
    if (single) eff[currentColor] = {};

    const a = 1 + Math.floor(Math.random() * 6);
    const b = single ? null : 1 + Math.floor(Math.random() * 6);
    const hasSix = a === 6 || b === 6;
    // Règle des 6 adaptée aux deux dés : on compte les LANCERS consécutifs
    // contenant au moins un 6 (l'esprit "trois 6 d'affilée = tour perdu"
    // est conservé tel quel).
    const consecutive = hasSix ? (sixesCountRef.current[currentColor] || 0) + 1 : 0;
    sixesCountRef.current[currentColor] = consecutive;

    const rollKey = Date.now();
    const dicePayload = { a, b, used: [false, b == null], rollKey };

    if (consecutive === 3) {
      // Trois lancers avec 6 d'affilée : tour perdu immédiatement.
      broadcastState({ dice: dicePayload, movablePlan: { d0: [], d1: [], sum: [] }, effects: eff, lastEvent: "threeSixes" });
      timeouts.current.push(setTimeout(() => {
        sixesCountRef.current[currentColor] = 0;
        broadcastState({ turnIdx: (s.turnIdx + 1) % s.order.length, dice: null, movablePlan: null, effects: eff, lastEvent: null });
      }, ROLL_ANIM_MS + 1300));
      return;
    }

    const plan = buildPlan(s.tokens[currentColor], dicePayload);
    if (!planHasMove(plan)) {
      broadcastState({ dice: dicePayload, movablePlan: { d0: [], d1: [], sum: [] }, effects: eff, lastEvent: "noMove" });
      timeouts.current.push(setTimeout(() => {
        // Un 6 sans coup possible garde la relance (règle historique).
        const next = hasSix ? s.turnIdx : (s.turnIdx + 1) % s.order.length;
        broadcastState({ turnIdx: next, dice: null, movablePlan: null, effects: eff, lastEvent: null });
      }, ROLL_ANIM_MS + 1300));
      return;
    }

    // Échéance de coup : 20 s APRÈS l'animation de lancer.
    const deadline = Date.now() + ROLL_ANIM_MS + MOVE_MS;
    broadcastState({
      dice: dicePayload, movablePlan: plan, effects: eff,
      moveDeadline: deadline, lastEvent: single ? "oneDieTurn" : null,
    });
    armMoveTimer(deadline);
  }

  // ----- Arbitrage d'un déplacement de pion : seul l'hôte y répond -----
  // `die` : 0 (1er dé), 1 (2e dé) ou "sum" (les deux d'un coup).
  function hostHandleMove({ by, tokenIndex, die }) {
    const s = stateRef.current;
    if (s.winner || s.dice === null || !s.movablePlan) return;
    const currentColor = s.order[s.turnIdx];
    const ownerId = Object.keys(colorRef.current).find(pid => colorRef.current[pid] === currentColor);
    if (by !== ownerId) return;

    const d = s.dice;
    // Légalité stricte : dé encore disponible + pion listé dans le plan.
    let value;
    if (die === "sum") {
      if (d.b == null || d.used[0] || d.used[1]) return;
      if (!s.movablePlan.sum.includes(tokenIndex)) return;
      value = d.a + d.b;
    } else if (die === 0) {
      if (d.used[0]) return;
      if (!s.movablePlan.d0.includes(tokenIndex)) return;
      value = d.a;
    } else if (die === 1) {
      if (d.b == null || d.used[1]) return;
      if (!s.movablePlan.d1.includes(tokenIndex)) return;
      value = d.b;
    } else return;

    let { tokens: nextTokens, captured, won } = applyMove(s.tokens, currentColor, tokenIndex, value);
    let effects = { ...(s.effects || {}) };
    let mysteryEvent = null;
    let extraRoll = false;

    // Case mystère « ? » : uniquement en atterrissant PILE dessus (piste
    // commune 1-55), jamais en la survolant. Un seul effet par coup.
    if (!won) {
      const landed = nextTokens[currentColor][tokenIndex];
      if (landed >= 1 && landed <= 55 && MYSTERY_ABS.has(absIndex(currentColor, landed))) {
        const kind = MYSTERY_KINDS[Math.floor(Math.random() * MYSTERY_KINDS.length)];
        mysteryEvent = "mystery:" + kind + ":" + currentColor;
        if (kind === "boost") {
          // +3 cases dans la foulée, si le couloir le permet (capture
          // possible à l'arrivée du boost, comme un coup normal).
          if (landed + 3 <= 61) {
            const res2 = applyMove(nextTokens, currentColor, tokenIndex, 3);
            nextTokens = res2.tokens;
            captured = captured.concat(res2.captured);
            won = res2.won;
          }
        } else if (kind === "setback") {
          const res2 = applySetback(nextTokens, currentColor, tokenIndex);
          nextTokens = res2.tokens;
          captured = captured.concat(res2.captured);
        } else if (kind === "oppOneDie") {
          const nextColor = s.order[(s.turnIdx + 1) % s.order.length];
          effects[nextColor] = { ...(effects[nextColor] || {}), oneDie: true };
        } else if (kind === "reroll") {
          extraRoll = true;
        }
      }
    }

    if (won) {
      clearTimeout(moveTimerRef.current);
      broadcastState({
        tokens: nextTokens, dice: null, movablePlan: null, moveDeadline: null, effects,
        lastMoved: { color: currentColor, tokenIdx: tokenIndex }, lastEvent: null, winner: currentColor,
      });
      return;
    }

    // Consommation du/des dé(s) joué(s).
    const used = die === "sum" ? [true, true] : [die === 0 ? true : d.used[0], die === 1 ? true : (d.b == null ? true : d.used[1])];
    const diceAfter = { ...d, used };
    const planAfter = buildPlan(nextTokens[currentColor], diceAfter);
    const stillToPlay = planHasMove(planAfter);

    const hadSix = d.a === 6 || d.b === 6;
    const captureEvent = captured.length > 0 ? "captured:" + currentColor : null;

    if (stillToPlay) {
      // Il reste un dé jouable : même joueur, échéance REMISE à 20 s
      // (réinitialisation à chaque coup, demande explicite).
      const deadline = Date.now() + MOVE_MS;
      broadcastState({
        tokens: nextTokens, dice: diceAfter, movablePlan: planAfter, effects,
        moveDeadline: deadline,
        lastMoved: { color: currentColor, tokenIdx: tokenIndex },
        lastEvent: mysteryEvent || captureEvent,
      });
      armMoveTimer(deadline);
      return;
    }

    // Tirage épuisé (ou plus aucun coup possible) : fin du tour. La relance
    // est accordée si le lancer contenait un 6 (règle historique conservée)
    // OU si une case mystère "reroll" vient d'être décrochée.
    clearTimeout(moveTimerRef.current);
    const goAgain = hadSix || extraRoll;
    if (!hadSix) sixesCountRef.current[currentColor] = 0;
    const nextTurnIdx = goAgain ? s.turnIdx : (s.turnIdx + 1) % s.order.length;
    broadcastState({
      tokens: nextTokens, dice: null, movablePlan: null, moveDeadline: null, effects,
      turnIdx: nextTurnIdx,
      lastMoved: { color: currentColor, tokenIdx: tokenIndex },
      lastEvent: mysteryEvent || captureEvent || (goAgain ? (hadSix ? "sixAgain" : "extraRoll") : null),
    });
  }

  // Si le salon a entre 2 et 4 joueurs, l'hôte démarre automatiquement dès
  // que le canal est prêt : chacun reçoit une couleur, dans l'ordre.
  useEffect(() => {
    if (!isHost || phase !== "intro" || autoStartedRef.current || !channelReady) return;
    if (players.length >= 2 && players.length <= 4) {
      autoStartedRef.current = true;
      const ord = colorsForCount(players.length);
      const map = {};
      players.forEach((p, i) => { map[p.profile_id] = ord[i]; });
      channelRef.current.send({ type: "broadcast", event: "match_start", payload: { order: ord, colorOfPlayer: map } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, channelReady, players.length]);

  function confirmPick() {
    if (selected.length < 2 || selected.length > 4 || !channelReady) return;
    const ord = colorsForCount(selected.length);
    const map = {};
    selected.forEach((pid, i) => { map[pid] = ord[i]; });
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: { order: ord, colorOfPlayer: map } });
  }

  // "Rejouer" : relance avec les mêmes joueurs / mêmes couleurs, sans repasser par le salon.
  function rejouer() {
    if (!isHost) return;
    channelRef.current.send({
      type: "broadcast", event: "match_start",
      payload: { order: stateRef.current.order, colorOfPlayer: colorRef.current },
    });
  }

  async function backToRoom() {
    await resetRoomToLobby(room.id);
    onFinish && onFinish();
  }

  function toggleSelect(pid) {
    setSelected(prev => {
      if (prev.includes(pid)) return prev.filter(x => x !== pid);
      if (prev.length >= 4) return prev;
      return [...prev, pid];
    });
  }

  // Chaque joueur enregistre SON propre résultat (RLS oblige).
  useEffect(() => {
    if (!winner || savedResultRef.current) return;
    const myColor = colorOfPlayer[me.id];
    if (!myColor) return;
    savedResultRef.current = true;
    const gain = myColor === winner ? WIN_POINTS : PARTICIPATE_POINTS;
    setMyGain(gain);
    (async () => {
      try {
        await supabase.from("game_results").insert({ room_id: room.id, profile_id: me.id, game_id: "ludo", points: gain });
        await supabase.rpc("add_points", { p_room: room.id, p_delta: gain });
      } catch (e) {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  function rollDice() {
    if (!isMyTurn || dice !== null) return;
    channelRef.current?.send({ type: "broadcast", event: "roll_attempt", payload: { by: me.id } });
  }
  function pickToken(idx) {
    if (!isMyTurn || dice === null || selectedDie == null) return;
    if (rollAnim && rollAnim.phase === "rolling") return; // laisse les dés s'immobiliser
    const list = selectedDie === "sum" ? movablePlan?.sum : selectedDie === 0 ? movablePlan?.d0 : movablePlan?.d1;
    if (!list || !list.includes(idx)) return;
    channelRef.current?.send({ type: "broadcast", event: "move_attempt", payload: { by: me.id, tokenIndex: idx, die: selectedDie } });
  }

  const myColor = colorOfPlayer[me.id];
  const isPlayer = !!myColor;
  const currentColor = order[turnIdx];
  const isMyTurn = phase === "playing" && !winner && isPlayer && currentColor === myColor;
  const needsPick = players.length > 4;
  const settled = !rollAnim || rollAnim.phase === "settled";
  const moveRemaining = moveDeadline ? Math.max(0, Math.ceil((moveDeadline - now) / 1000)) : null;
  // Pions cliquables = ceux du plan de l'option sélectionnée.
  const movableNow = isMyTurn && dice && movablePlan && settled
    ? (selectedDie === "sum" ? movablePlan.sum : selectedDie === 0 ? movablePlan.d0 : selectedDie === 1 ? movablePlan.d1 : [])
    : [];

  // Raccourci "lancer les dés" à la barre d'espace (demande 2026-07) :
  // s'AJOUTE au bouton existant, ne le remplace pas. Ignoré si le focus
  // est sur un champ de saisie (ex. le chat du salon) pour ne jamais voler
  // un espace tapé dans un message. Mêmes garde-fous que rollDice().
  useEffect(() => {
    function onKeyDown(e) {
      if (e.code !== "Space") return;
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable) return;
      if (!isMyTurn || dice !== null) return;
      e.preventDefault();
      rollDice();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, dice]);
  const playerNameFor = (color) => {
    const pid = Object.keys(colorOfPlayer).find(id => colorOfPlayer[id] === color);
    const p = players.find(pp => pp.profile_id === pid);
    return p?.profiles?.username || "?";
  };

  let content;

  if (phase === "playing") {
    const iWon = myColor && myColor === winner;
    let statusText;
    const mysteryMatch = typeof lastEvent === "string" && lastEvent.startsWith("mystery:") ? lastEvent.split(":") : null;
    if (winner) statusText = null;
    else if (lastEvent === "threeSixes") statusText = t("ludoThreeSixes");
    else if (lastEvent === "noMove") statusText = t("ludoNoMove");
    else if (lastEvent === "timeout") statusText = t("ludoTimeout");
    else if (lastEvent === "sixAgain") statusText = t("ludoSixAgain");
    else if (lastEvent === "extraRoll") statusText = t("ludoExtraRoll");
    else if (lastEvent === "oneDieTurn") statusText = t("ludoOneDieTurn");
    else if (mysteryMatch) {
      const kind = mysteryMatch[1];
      statusText = kind === "boost" ? t("ludoMysteryBoost")
        : kind === "setback" ? t("ludoMysterySetback")
        : kind === "oppOneDie" ? t("ludoMysteryOppOneDie")
        : t("ludoMysteryReroll");
    }
    else if (lastEvent && lastEvent.startsWith("captured:")) {
      const moverColor = lastEvent.split(":")[1];
      statusText = `💥 ${playerNameFor(moverColor)} ${t("ludoCapturedSuffix")}`;
    } else if (isMyTurn && dice === null) statusText = t("ludoYourTurn");
    else if (isMyTurn && dice !== null) statusText = t("ludoPickToken");
    else if (isPlayer) statusText = `${t("ludoWaitingFor")} ${playerNameFor(currentColor)}…`;
    else statusText = t("ludoSpectating");

    // Plateau de dés : ancré près du camp du joueur ACTIF, pips à sa couleur.
    const trayPos = currentColor ? DICE_TRAY_POS[currentColor] : null;
    const trayColorVar = currentColor ? COLORS[currentColor].css : "--p2";
    const dieValues = dice ? [dice.a, dice.b] : [];
    const showTray = phase === "playing" && !winner && dice !== null;
    const sumAvailable = !!(isMyTurn && settled && movablePlan && movablePlan.sum.length > 0 && dice && dice.b != null && !dice.used[0] && !dice.used[1]);

    content = (
      <div>
        <div className="ludo-players-row" style={{ marginBottom: 12 }}>
          {order.map(color => (
            <span key={color} className={"ludo-turn-chip" + (color === currentColor ? " active" : "")} style={{ "--accent-color": `var(${COLORS[color].css})` }}>
              <span className="swatch" style={{ background: `var(${COLORS[color].css})` }} />
              {playerNameFor(color)}
              {effects[color]?.oneDie && <span title={t("ludoOneDieTurn")} style={{ marginLeft: 4 }}>🎲½</span>}
            </span>
          ))}
        </div>

        {winner ? (
          <p className="muted" style={{ textAlign: "center", marginBottom: 10, fontWeight: 800 }}>
            {isPlayer
              ? (iWon ? "🏆 " + t("ludoWinYou") : `${playerNameFor(winner)} ${t("ludoWinSpectator")}`)
              : `${playerNameFor(winner)} ${t("ludoWinSpectator")}`}
          </p>
        ) : (
          <p className="muted" style={{ textAlign: "center", marginBottom: 10, minHeight: 18 }}>
            {statusText}
            {moveRemaining != null && dice !== null && settled && (
              <span className={"turn-timer-chip" + (moveRemaining <= 5 ? " hot" : "")} style={{ marginLeft: 8 }}>⏱ {moveRemaining}s</span>
            )}
          </p>
        )}

        <div className="ludo-board">
          {Object.entries(CELL_TYPE).map(([key, type]) => {
            const [r, c] = key.split("_").map(Number);
            const isSafe = SAFE_CELLS.has(key);
            const isMystery = MYSTERY_CELLS.has(key);
            const style = {
              top: (r / 15) * 100 + "%", left: (c / 15) * 100 + "%",
              width: (1 / 15) * 100 + "%", height: (1 / 15) * 100 + "%",
            };
            return <div key={key} className={"ludo-cell " + type + (isSafe ? " safe" : "") + (isMystery ? " mystery" : "")} style={style} />;
          })}

          {/* Zone d'ARRIVÉE centrale élargie (zip 83). */}
          <div className="ludo-goal-zone" aria-hidden="true">
            {goalBurst && (
              <span
                key={goalBurst.key}
                className="ludo-goal-burst"
                style={{ "--burst-color": `var(${COLORS[goalBurst.color].css})` }}
              />
            )}
            <span className="ludo-goal-flag">🏁</span>
          </div>

          {COLOR_ORDER.map(color => (
            [0, 1, 2, 3].map(slot => {
              const [yr, yc] = COLORS[color].yard[slot];
              return (
                <div key={color + "slot" + slot} className="ludo-yard-slot" style={{
                  top: (yr / 15) * 100 + "%", left: (yc / 15) * 100 + "%",
                  width: (1 / 15) * 100 + "%", height: (1 / 15) * 100 + "%",
                }} />
              );
            })
          ))}

          {/* ----- Plateau de dés (2026-07) : deux dés qui ROULENT près du
              camp du joueur actif, pips à sa couleur, puis l'addition en
              chiffres romains (III + V = VIII). Cliquer un dé (à son tour)
              choisit lequel jouer ; cliquer l'addition choisit la somme. */}
          {showTray && trayPos && (
            <div className="ludo-dice-tray" style={trayPos} key={dice.rollKey}>
              <div className="ludo-dice-row">
                {dieValues.map((v, di) => {
                  if (v == null) return null;
                  const rolling = rollAnim && rollAnim.phase === "rolling";
                  const shown = rolling ? rollAnim.faces[di] : v;
                  const isUsed = dice.used[di];
                  const listOk = di === 0 ? movablePlan?.d0?.length : movablePlan?.d1?.length;
                  const clickable = isMyTurn && settled && !isUsed && !!listOk;
                  return (
                    <DieFace
                      key={di}
                      value={shown}
                      colorVar={trayColorVar}
                      selected={settled && selectedDie === di}
                      dim={settled && (isUsed || (!clickable && isMyTurn))}
                      onClick={clickable ? () => setSelectedDie(di) : null}
                      animClass={rolling ? "rolling v" + rollAnim.variant : "settle"}
                    />
                  );
                })}
              </div>
              {settled && dice.b != null && (
                <button
                  type="button"
                  className={"ludo-roman" + (sumAvailable ? " pickable" : "") + (selectedDie === "sum" ? " selected" : "")}
                  onClick={sumAvailable ? () => setSelectedDie("sum") : undefined}
                  disabled={!sumAvailable}
                  title={sumAvailable ? t("ludoUseSum") : undefined}
                >
                  {toRoman(dice.a)} + {toRoman(dice.b)} = {toRoman(dice.a + dice.b)}
                </button>
              )}
              {settled && dice.b == null && (
                <span className="ludo-roman">{toRoman(dice.a)}</span>
              )}
            </div>
          )}

          {/* Révélation de case mystère : pop central bref, aux couleurs du
              jeu — purement décoratif (le statut texte dit la même chose). */}
          {mysteryMatch && !winner && (
            <div className="ludo-mystery-pop" key={lastEvent + "-" + (lastMoved ? lastMoved.tokenIdx : "")} aria-hidden="true">
              <span className="ludo-mystery-pop-text">
                {mysteryMatch[1] === "boost" ? "🎁 +3" : mysteryMatch[1] === "setback" ? "💫 -4" : mysteryMatch[1] === "oppOneDie" ? "🎲½" : "🎁 🎲"}
              </span>
            </div>
          )}

          {(() => {
            // Regroupe les pions qui partagent EXACTEMENT la même case (hors
            // enclos, où chaque pion a déjà son propre emplacement dédié).
            const stacks = {};
            COLOR_ORDER.forEach(color => {
              if (!order.includes(color)) return;
              tokens[color].forEach((steps, idx) => {
                if (steps === 0 || steps >= 61) return;
                const cell = cellFor(color, steps);
                if (!cell) return;
                const key = cell[0] + "," + cell[1];
                (stacks[key] = stacks[key] || []).push({ color, idx });
              });
            });
            function stackLayout(n, i) {
              if (n <= 1) return { left: 0, top: 0, size: 1 };
              if (n === 2) {
                const p = [[0, 0], [0.42, 0.42]][i];
                return { left: p[0], top: p[1], size: 0.62 };
              }
              const p = [[0, 0], [0.5, 0], [0, 0.5], [0.5, 0.5]][i] || [0.25, 0.25];
              return { left: p[0], top: p[1], size: 0.52 };
            }

            return COLOR_ORDER.map(color => tokens[color].map((steps, idx) => {
              if (!order.includes(color)) return null;
              // Pions ARRIVÉS (zip 83) : rangés dans le quadrant central.
              if (steps >= 61) {
                const [qr, qc] = GOAL_QUADRANT[color];
                const fr = qr + (idx >> 1) * 0.47, fc = qc + (idx & 1) * 0.47;
                const isLastFinished = !!(lastMoved && lastMoved.color === color && lastMoved.tokenIdx === idx);
                return (
                  <div
                    key={color + "-" + idx}
                    className={"ludo-token finished " + color + (isLastFinished ? " last" : "")}
                    style={{
                      top: (fr / 15) * 100 + "%",
                      left: (fc / 15) * 100 + "%",
                      width: (0.44 / 15) * 100 + "%",
                      height: (0.44 / 15) * 100 + "%",
                      zIndex: 2,
                    }}
                  >
                    <span className="ludo-token-pin" />
                  </div>
                );
              }
              const cell = steps === 0 ? COLORS[color].yard[idx] : cellFor(color, steps);
              if (!cell) return null; // garde-fou, ne devrait pas arriver
              const [r, c] = cell;
              const isMine = color === myColor;
              const canPick = isMyTurn && isMine && movableNow.includes(idx);
              const isLast = !!(lastMoved && lastMoved.color === color && lastMoved.tokenIdx === idx);

              let left = 0, top = 0, size = 1;
              if (steps > 0) {
                const key = r + "," + c;
                const stack = stacks[key] || [{ color, idx }];
                const posInStack = stack.findIndex(s => s.color === color && s.idx === idx);
                const layout = stackLayout(stack.length, posInStack < 0 ? 0 : posInStack);
                left = layout.left; top = layout.top; size = layout.size;
              }

              return (
                <div
                  key={color + "-" + idx}
                  className={"ludo-token " + color + (canPick ? " mine-movable" : "") + (isLast ? " last" : "")}
                  onClick={() => canPick && pickToken(idx)}
                  style={{
                    top: ((r + top) / 15) * 100 + "%",
                    left: ((c + left) / 15) * 100 + "%",
                    width: (size / 15) * 100 + "%",
                    height: (size / 15) * 100 + "%",
                    zIndex: canPick ? 5 : 1,
                  }}
                >
                  <span className="ludo-token-pin" />
                </div>
              );
            }));
          })()}
        </div>

        {winner ? (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
            {isPlayer && (
              <p style={{ fontWeight: 800, width: "100%", textAlign: "center" }}>
                {t("peYourGain")} <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>+{myGain} {t("pts")}</span>
              </p>
            )}
            {isHost ? (
              <>
                <button className="btn" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={rejouer}>🔁 {t("c4Rejouer")}</button>
                <button className="btn ghost" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={backToRoom}>🏠 {t("c4BackToRoom")}</button>
              </>
            ) : (
              <p className="muted">{t("c4RejouerWait")}</p>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
            {isMyTurn && dice === null && (
              <button className="btn" style={{ width: "auto", padding: "12px 26px" }} onClick={rollDice} title={t("ludoRollSpaceHint")}>
                {t("ludoRollDice")}
              </button>
            )}
          </div>
        )}
      </div>
    );
  } else {
    // phase "intro" : choix des joueurs, attente, ou pas assez de monde
    if (players.length < 2) {
      content = <p className="muted">{t("ludoNotEnough")}</p>;
    } else if (!needsPick) {
      content = <p className="muted">{t("ludoStarting")}</p>;
    } else if (isHost) {
      content = (
        <div>
          <p className="hint">{t("ludoPickHint")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0 16px" }}>
            {players.map(p => {
              const on = selected.includes(p.profile_id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleSelect(p.profile_id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 99,
                    border: `2px solid ${on ? "var(--p3)" : "var(--line)"}`,
                    background: on ? "rgba(182,240,76,.12)" : "rgba(255,255,255,.04)",
                    fontWeight: 700, fontSize: 13, color: "var(--ink)"
                  }}
                >
                  <span>{p.profiles?.avatar}</span><span>{p.profiles?.username}</span>
                </button>
              );
            })}
          </div>
          <button className="btn" disabled={selected.length < 2 || selected.length > 4} onClick={confirmPick}>
            {t("ludoPickConfirm")}
          </button>
        </div>
      );
    } else {
      content = <p className="muted">{t("ludoWaitPick")}</p>;
    }
  }

  return (
    <div className="panel" style={{ maxWidth: "min(760px, 94vw)" }}>
      <h1>{t("ludoTitle")}</h1>
      <Crossfade id={phase}>{content}</Crossfade>
    </div>
  );
}
