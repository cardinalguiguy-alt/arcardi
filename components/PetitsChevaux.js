"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby, recordMatchResult } from "@/lib/gameSync";
import { playDiceShuffle } from "@/lib/sfx";
import Crossfade from "./Crossfade";


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
// case sûre) : y ATTERRIR — pile — ouvre désormais une ROUE DE LA FORTUNE
// (voir MYSTERY_KINDS/pickMysteryKind/applyMysteryKind plus bas) au lieu de
// révéler l'effet immédiatement. Positions choisies à mi-chemin entre les
// étoiles pour rythmer chaque quart de plateau.
const MYSTERY_ABS = new Set([4, 11, 18, 25, 32, 39, 46, 53]);

// Effets de la roue (2026-07) : 4 bonus/malus CLASSIQUES (probabilité
// élevée, poids 22 chacun) + 4 bonus/malus EXTRÊMES (bien plus puissants,
// beaucoup plus rares — poids 3 chacun, ~12 % cumulés) :
// - boost        : +3 cases (capture possible à l'arrivée) ;
// - setback      : -4 cases (plancher case 1, capture possible) ;
// - oppOneDie    : le joueur SUIVANT ne lancera qu'UN dé à son prochain tour ;
// - reroll       : relance complète (2 dés) immédiate en fin de tour ;
// - superBoost   : +8 cases d'un bond (capture possible) ;
// - freeToken    : libère directement un AUTRE pion de l'enclos (repli sur
//                  un petit +2 si tous les pions de la couleur sont déjà sortis) ;
// - sendHome     : renvoie le pion tiré directement à l'enclos ;
// - doubleSetback: -8 cases (plancher case 1, capture possible).
// `swatch` = couleur de la tranche sur la roue, `pop` = texte du pop-up bref
// après résolution, `labelKey` = clé i18n du statut détaillé. `deferred:true`
// (correctif 2026-07, voir MysteryWheel) = effet qui ne s'applique PAS tout
// de suite mais au prochain tour concerné (ici : le joueur SUIVANT n'aura
// qu'un dé à SON prochain lancer) — affiché dans le bouton-texte de
// révélation pour que ce soit limpide, tous les autres effets s'appliquant
// immédiatement (déjà visible sur le plateau dès la fin de la roue).
const MYSTERY_KINDS = [
  { id: "boost",         weight: 22, tier: "common",  icon: "🎁", pop: "🎁 +3",  labelKey: "ludoMysteryBoost",         swatch: "var(--ok)" },
  { id: "setback",       weight: 22, tier: "common",  icon: "💫", pop: "💫 -4",  labelKey: "ludoMysterySetback",       swatch: "#FF5D73" },
  { id: "oppOneDie",     weight: 22, tier: "common",  icon: "🎲", pop: "🎲½",   labelKey: "ludoMysteryOppOneDie",     swatch: "var(--ludoB)", deferred: true },
  { id: "reroll",        weight: 22, tier: "common",  icon: "🔁", pop: "🔁",    labelKey: "ludoMysteryReroll",        swatch: "var(--ludoY)" },
  { id: "superBoost",    weight: 3,  tier: "extreme", icon: "🚀", pop: "🚀 +8",  labelKey: "ludoMysterySuperBoost",    swatch: "var(--p3)" },
  { id: "freeToken",     weight: 3,  tier: "extreme", icon: "🔓", pop: "🔓",    labelKey: "ludoMysteryFreeToken",     swatch: "#4ECDC4" },
  { id: "sendHome",      weight: 3,  tier: "extreme", icon: "💀", pop: "💀",    labelKey: "ludoMysterySendHome",      swatch: "var(--acc-c4)" },
  { id: "doubleSetback", weight: 3,  tier: "extreme", icon: "⚡", pop: "⚡ -8",  labelKey: "ludoMysteryDoubleSetback", swatch: "var(--acc-ludo)" },
];
const MYSTERY_KIND_TOTAL_WEIGHT = MYSTERY_KINDS.reduce((sum, k) => sum + k.weight, 0);
function pickMysteryKind() {
  let r = Math.random() * MYSTERY_KIND_TOTAL_WEIGHT;
  for (const k of MYSTERY_KINDS) {
    if (r < k.weight) return k;
    r -= k.weight;
  }
  return MYSTERY_KINDS[0];
}

// Minuteur de TOUR (2026-07) : 20 s, désormais actif en PERMANENCE dès le
// début du tour d'un joueur (lancer ou déplacement) et réarmé à chaque
// nouvelle phase (lancer -> jouer -> relance méritée -> etc.), jusqu'à ce
// que le tour passe réellement au joueur suivant. Dépassement = tour passé
// (voir armMoveTimer). Le décompte AFFICHÉ ne démarre qu'après l'animation
// de lancer (ROLL_ANIM_MS) pour ne pas grignoter le temps de jeu réel.
const MOVE_MS = 20000;
const ROLL_ANIM_MS = 950;
// Roue de la fortune (2026-07, correctif 2026-07 sur le rythme + la
// révélation) : durée totale VISIBLE = rotation + TENUE (le résultat tiré
// s'affiche enfin en toutes lettres, voir MysteryWheel — c'était l'un des
// bugs de l'audit : la roue s'arrêtait pile sur l'icône gagnante SANS
// jamais dire ce qu'elle signifiait, tant que le petit texte de statut
// au-dessus du plateau n'avait pas pris le relais après coup) + fondu de
// sortie. MYSTERY_ROT_MS ne couvre plus que la ROTATION elle-même
// (raccourcie et redessinée avec une décélération plus marquée — voir
// ludoWheelSpin en CSS — pour "tourner plus vite puis ralentir jusqu'à
// s'arrêter", demande explicite). L'hôte attend exactement MYSTERY_SPIN_MS
// (somme des trois phases) avant de révéler/appliquer l'effet — pile calé
// sur la fin de l'animation cliente, comme les faces de dés factices
// pendant le roulis.
const MYSTERY_ROT_MS = 2100;     // rotation seule : rapide puis décélération étalée
const MYSTERY_REVEAL_MS = 1500;  // tenue : le résultat reste affiché, lisible
const MYSTERY_FADE_MS = 550;     // fondu de sortie final
const MYSTERY_SPIN_MS = MYSTERY_ROT_MS + MYSTERY_REVEAL_MS + MYSTERY_FADE_MS;

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
// ----- Capture (vérifiée 2026-07, cf. tâche "captures") -----------------
// La capture est calculée UNIQUEMENT sur la case d'ARRIVÉE finale du pion
// (jamais en survolant une case intermédiaire) : quel que soit le chemin
// pour y parvenir — un seul dé, la somme des deux, ou un bonus mystère
// (boost/superBoost, qui rappellent cette même fonction pour leur propre
// avancée) — TOUS les pions adverses présents sur cette case, capturés en
// une seule fois via `.forEach` (pas juste le premier trouvé), sauf case
// sûre. Couverte par 100 000 tirages aléatoires dans harness_zip85.mjs.
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
// Recul (case mystère "setback"/"doubleSetback") : `amount` cases en
// arrière, plancher à la case 1 — capture à l'arrivée comme un coup normal
// (hors case sûre). `amount` par défaut 4 (setback classique) ; 8 pour la
// variante extrême doubleSetback (voir applyMysteryKind).
function applySetback(tokens, color, tokenIdx, amount = 4) {
  const next = {};
  for (const c of COLOR_ORDER) next[c] = tokens[c].slice();
  const steps = next[color][tokenIdx];
  if (steps < 1 || steps > 55) return { tokens: next, captured: [] };
  const newSteps = Math.max(1, steps - amount);
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
// Applique l'effet d'une case mystère déjà TIRÉ par la roue (kind connu,
// choisi par pickMysteryKind() au lancement — voir hostHandleSpin) sur une
// copie des pions. Retourne { tokens, captured, extraRoll, effectsPatch,
// info } : `info.won` si l'effet fait terminer le pion (boost/superBoost
// jusqu'à 61), `info.freedIdx` si un AUTRE pion est concerné (freeToken).
function applyMysteryKind(tokens, color, tokenIdx, kind, nextColor) {
  let next = tokens, captured = [], extraRoll = false, effectsPatch = null;
  const info = {};
  switch (kind) {
    case "boost": {
      const steps = next[color][tokenIdx];
      const gain = Math.min(3, 61 - steps);
      if (gain > 0) {
        const r = applyMove(next, color, tokenIdx, gain);
        next = r.tokens; captured = r.captured; info.won = r.won;
      }
      break;
    }
    case "setback": {
      const r = applySetback(next, color, tokenIdx, 4);
      next = r.tokens; captured = r.captured;
      break;
    }
    case "oppOneDie": {
      effectsPatch = { color: nextColor, patch: { oneDie: true } };
      break;
    }
    case "reroll": {
      extraRoll = true;
      break;
    }
    case "superBoost": {
      const steps = next[color][tokenIdx];
      const gain = Math.min(8, 61 - steps);
      if (gain > 0) {
        const r = applyMove(next, color, tokenIdx, gain);
        next = r.tokens; captured = r.captured; info.won = r.won;
      }
      break;
    }
    case "doubleSetback": {
      const r = applySetback(next, color, tokenIdx, 8);
      next = r.tokens; captured = r.captured;
      break;
    }
    case "sendHome": {
      const t2 = {};
      for (const c of COLOR_ORDER) t2[c] = next[c].slice();
      t2[color][tokenIdx] = 0;
      next = t2;
      break;
    }
    case "freeToken": {
      const idxInYard = next[color].findIndex((s, i) => s === 0 && i !== tokenIdx);
      if (idxInYard >= 0) {
        const r = applyMove(next, color, idxInYard, 0); // steps===0 -> sortie directe, roll ignoré
        next = r.tokens; captured = r.captured; info.won = r.won; info.freedIdx = idxInYard;
      } else {
        // Repli si tous les pions de la couleur sont déjà sortis de l'enclos :
        // petit boost de consolation plutôt qu'un effet qui ne ferait rien.
        const steps = next[color][tokenIdx];
        const gain = Math.min(2, 61 - steps);
        if (gain > 0) {
          const r = applyMove(next, color, tokenIdx, gain);
          next = r.tokens; captured = r.captured; info.won = r.won;
        }
      }
      break;
    }
    default: break;
  }
  return { tokens: next, captured, extraRoll, effectsPatch, info };
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

// ===== Roue de la fortune des cases « ? » (2026-07, révisée 2026-07) =====
// Remplace la révélation immédiate par un tirage ANIMÉ, visible de TOUS
// les joueurs/spectateurs (elle vit dans le state broadcast, pas un state
// local) : fondu d'entrée, rotation (rapide puis décélération marquée
// jusqu'à l'arrêt — voir ludoWheelSpin en CSS), RÉVÉLATION du résultat en
// toutes lettres via un bouton-texte, tenue, fondu de sortie.
// Correctif audit 2026-07 : la roue s'arrêtait auparavant pile sur l'icône
// gagnante SANS jamais dire ce qu'elle voulait dire — seul le minuscule
// texte de statut au-dessus du plateau le révélait, et seulement une fois
// l'overlay déjà refermé. `revealed` (local, retardé de MYSTERY_ROT_MS —
// pile la fin de la rotation) affiche maintenant un bouton-texte bien
// visible avec l'icône + le libellé complet, et précise si l'effet est
// déjà appliqué ou s'il ne jouera qu'au prochain tour concerné (voir
// `deferred` sur MYSTERY_KINDS).
function MysteryWheel({ pending, isOwner, onSpin, t }) {
  const spin = pending.spin;
  const segAngle = 360 / MYSTERY_KINDS.length;
  const targetIdx = spin ? MYSTERY_KINDS.findIndex(k => k.id === spin.kind) : -1;
  const resultInfo = targetIdx >= 0 ? MYSTERY_KINDS[targetIdx] : null;
  // 5 tours complets pour le suspense, puis pile sur le centre de la tranche
  // gagnante (le repère fixe pointe vers le haut, 0°).
  const rot = spin && targetIdx >= 0
    ? 5 * 360 + (360 - (targetIdx * segAngle + segAngle / 2))
    : 0;
  const gradient = MYSTERY_KINDS.map((k, i) => `${k.swatch} ${i * segAngle}deg ${(i + 1) * segAngle}deg`).join(", ");

  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!spin) { setRevealed(false); return; }
    const tm = setTimeout(() => setRevealed(true), MYSTERY_ROT_MS);
    return () => clearTimeout(tm);
  }, [spin?.key]);

  return (
    <div
      className={"ludo-wheel-overlay" + (spin ? " spinning" : "")}
      style={{ "--wheel-life": MYSTERY_SPIN_MS + "ms", "--wheel-spin": MYSTERY_ROT_MS + "ms" }}
    >
      <div className="ludo-wheel-card">
        <p className="ludo-wheel-title">🎡 {t("ludoMysteryWheelTitle")}</p>
        <div className="ludo-wheel-wrap" onClick={!spin && isOwner ? onSpin : undefined}>
          <span className="ludo-wheel-pointer" aria-hidden="true" />
          <div
            className="ludo-wheel-disc"
            style={{ background: `conic-gradient(${gradient})`, "--wheel-rot": rot + "deg" }}
          >
            {MYSTERY_KINDS.map((k, i) => (
              <span
                key={k.id}
                className={"ludo-wheel-icon" + (k.tier === "extreme" ? " extreme" : "")}
                style={{ transform: `rotate(${i * segAngle + segAngle / 2}deg) translate(0, -70px) rotate(${-(i * segAngle + segAngle / 2)}deg)` }}
              >
                {k.icon}
              </span>
            ))}
          </div>
        </div>
        {!spin && isOwner && (
          <button type="button" className="btn ludo-wheel-btn" onClick={onSpin}>{t("ludoMysterySpin")}</button>
        )}
        {!spin && !isOwner && <p className="muted">{t("ludoMysteryWaitSpin")}</p>}
        {/* Correctif 2026-07 : le résultat, enfin dit en toutes lettres — un
            bouton-texte (non cliquable : rien à faire, juste très visible)
            qui apparaît pile quand la roue s'immobilise. */}
        {spin && revealed && resultInfo && (
          <div
            className={"ludo-wheel-result" + (resultInfo.tier === "extreme" ? " extreme" : "")}
            role="status" aria-live="polite"
          >
            <span className="ludo-wheel-result-icon">{resultInfo.icon}</span>
            <span className="ludo-wheel-result-text">{t(resultInfo.labelKey)}</span>
            <span className="ludo-wheel-result-timing">
              {resultInfo.deferred ? t("ludoMysteryTimingNext") : t("ludoMysteryTimingNow")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Décision "Épargner ?" à la capture (2026-07) =====
// Dès qu'un pion atterrit sur une case occupée par un ou plusieurs pions
// adverses (hors case sûre), la capture n'est plus automatique : un petit
// overlay demande au propriétaire du pion arrivant s'il veut épargner
// l'adversaire (aucune capture, mais un tour bonus complet — un peu comme
// le bonus mystère "reroll") ou capturer normalement (comportement
// classique, la partie continue ensuite comme avant). Visible de TOUS
// (spectateurs compris), vit dans le state broadcast comme pendingMystery ;
// seul le propriétaire voit les deux boutons, les autres attendent.
function CaptureChoice({ pending, isOwner, onDecide, t, playerNameFor }) {
  const opponentColors = [...new Set(pending.captured.map(([c]) => c))];
  return (
    <div className="ludo-capture-overlay">
      <div className="ludo-capture-card">
        <p className="ludo-capture-title">⚔️ {t("ludoSpareTitle")}</p>
        <p className="ludo-capture-desc">
          {opponentColors.map(playerNameFor).join(", ")}
        </p>
        {isOwner ? (
          <div className="ludo-capture-actions">
            <button type="button" className="btn ghost" onClick={() => onDecide(true)}>{t("ludoSpareYes")}</button>
            <button type="button" className="btn" onClick={() => onDecide(false)}>{t("ludoSpareNo")}</button>
          </div>
        ) : (
          <p className="muted">{t("ludoSpareWait")}</p>
        )}
      </div>
    </div>
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
  const [myWin, setMyWin] = useState(false);
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
  // Case mystère EN ATTENTE (2026-07) : { color, tokenIdx, dice, key,
  // spin:null|{key,kind} } — non-null dès qu'un pion atterrit pile dessus,
  // jusqu'à ce que la roue ait fini de tourner (voir hostHandleSpin /
  // resolveMysterySpin). Bloque tout déplacement tant qu'elle est active.
  const [pendingMystery, setPendingMystery] = useState(null);
  // Capture EN ATTENTE de décision "Épargner ?" (2026-07) : { key, color,
  // tokenIdx, captured:[[couleur,idx],...], diceAfter, movedInfo,
  // tokensCapture, tokensSpare } — non-null dès qu'un pion atterrit sur une
  // case occupée par un ou plusieurs pions adverses (hors case sûre),
  // jusqu'à ce que le propriétaire du pion arrivant choisisse (voir
  // hostHandleSpare/requestSpare). Bloque tout autre coup tant qu'elle est
  // active, comme pendingMystery.
  const [pendingCapture, setPendingCapture] = useState(null);
  // Aperçu au survol (2026-07, confort de jeu) : { tokenIdx, cell:[r,c],
  // captureCount } — purement LOCAL (jamais diffusé), recalculé à chaque
  // survol d'un pion jouable en fonction du dé actuellement sélectionné.
  const [hoverPreview, setHoverPreview] = useState(null);

  const channelRef = useRef(null);
  const stateRef = useRef({ tokens, order, turnIdx, dice, movablePlan, effects, winner, pendingMystery: null, pendingCapture: null });
  const savedResultRef = useRef(false);
  const autoStartedRef = useRef(false);
  const restoredRef = useRef(false);
  const timeouts = useRef([]);
  // Miroirs annexes pour l'arbitre (hôte) : évitent des closures figées et
  // gardent les compteurs de 6 d'affilée en dehors du cycle de rendu React.
  const colorRef = useRef({});
  const sixesCountRef = useRef({});
  const moveTimerRef = useRef(null);   // couperet du minuteur de tour (hôte)
  const rollAnimTimerRef = useRef(null);
  const rollAnimIvRef = useRef(null);

  useEffect(() => {
    stateRef.current = { tokens, order, turnIdx, dice, movablePlan, effects, winner, pendingMystery, pendingCapture };
  }, [tokens, order, turnIdx, dice, movablePlan, effects, winner, pendingMystery, pendingCapture]);
  useEffect(() => { colorRef.current = colorOfPlayer; }, [colorOfPlayer]);

  // Horloge d'affichage du compte à rebours de coup (250 ms suffit).
  useEffect(() => {
    if (!moveDeadline) return;
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [moveDeadline]);

  // Animation de lancer : déclenchée par CHAQUE nouveau rollKey reçu (tous
  // les clients la voient, spectateurs compris). Le son playDiceShuffle(2)
  // démarre PILE avec l'animation (2026-07) ; trois variantes de roulis pour
  // la variété (rollKey % 3), faces aléatoires pendant ~1 s, puis les vraies
  // valeurs se posent — le résultat ne se révèle donc qu'à la fin.
  useEffect(() => {
    if (!dice || dice.rollKey == null) { setRollAnim(null); return; }
    const key = dice.rollKey;
    playDiceShuffle(2);
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

  // L'aperçu de survol (confort de jeu) devient obsolète dès que le dé
  // sélectionné, le tirage ou le plan changent — on l'efface plutôt que de
  // laisser un fantôme pointer vers une case qui n'est plus la bonne.
  useEffect(() => {
    setHoverPreview(null);
  }, [selectedDie, dice?.rollKey, movablePlan]);

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
    setPendingMystery(payload.pendingMystery || null);
    setPendingCapture(payload.pendingCapture || null);
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
      setPendingMystery(null);
      setPendingCapture(null);
      // Minuteur dès le DÉBUT du tour (2026-07, demande explicite) : calculé
      // localement par CHAQUE client (un écart de quelques dizaines de ms
      // entre eux est sans conséquence sur une fenêtre de 20 s) — seul
      // l'hôte fait vraiment foi côté arbitrage (armMoveTimer ci-dessous).
      const initialDeadline = Date.now() + MOVE_MS;
      setMoveDeadline(initialDeadline);
      setLastMoved(null);
      setLastEvent(null);
      setWinner(null);
      setMyWin(false);
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
          moveDeadline: initialDeadline, lastMoved: null, lastEvent: null, winner: null, pendingMystery: null,
          pendingCapture: null,
        });
        armMoveTimer(initialDeadline);
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

    ch.on("broadcast", { event: "spin_attempt" }, ({ payload }) => {
      if (!isHost) return;
      hostHandleSpin(payload);
    });

    ch.on("broadcast", { event: "spare_attempt" }, ({ payload }) => {
      if (!isHost) return;
      hostHandleSpare(payload);
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
          pendingMystery: payload.pendingMystery || null,
          pendingCapture: payload.pendingCapture || null,
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
            setPendingMystery(saved.pendingMystery || null);
            setPendingCapture(saved.pendingCapture || null);
            setPhase("playing");
            autoStartedRef.current = true;
            // Reprise HÔTE : le minuteur tourne désormais en PERMANENCE tant
            // que la partie n'est pas finie (2026-07) — on le réarme donc à
            // CHAQUE rechargement avec une échéance fraîche, plutôt que
            // seulement quand un tirage était en cours comme avant.
            if (isHost && !saved.winner) {
              const deadline = Date.now() + MOVE_MS;
              broadcastState({
                tokens: saved.tokens, turnIdx: saved.turnIdx, dice: saved.dice || null,
                movablePlan: saved.movablePlan || null, effects: saved.effects || {},
                moveDeadline: deadline, lastMoved: saved.lastMoved, lastEvent: saved.lastEvent,
                winner: saved.winner, pendingMystery: saved.pendingMystery || null,
                pendingCapture: saved.pendingCapture || null,
              });
              if (saved.pendingMystery && saved.pendingMystery.spin) {
                // Reprise EN PLEIN tirage de la roue (fenêtre de quelques
                // secondes, rare) : on relance la résolution depuis le
                // début plutôt que de laisser la partie bloquée.
                timeouts.current.push(setTimeout(() => resolveMysterySpin(saved.pendingMystery), MYSTERY_SPIN_MS));
              } else {
                armMoveTimer(deadline);
              }
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
      pendingMystery: "pendingMystery" in patch ? patch.pendingMystery : null,
      pendingCapture: "pendingCapture" in patch ? patch.pendingCapture : null,
    };
    channelRef.current.send({ type: "broadcast", event: "state", payload });
  }

  // Couperet du minuteur de TOUR (hôte) : si le joueur n'a pas agi à
  // l'échéance — que ce soit pour LANCER les dés, JOUER un coup, ou LANCER
  // LA ROUE d'une case mystère — le tour est réputé perdu. Se réarme lui-
  // même pour le joueur suivant : le minuteur ne s'arrête donc jamais tant
  // que la partie continue (corrige l'angle mort "personne ne lance jamais
  // les dés" signalé à l'audit du zip 84).
  function armMoveTimer(deadline) {
    clearTimeout(moveTimerRef.current);
    if (!isHost || !deadline) return;
    moveTimerRef.current = setTimeout(() => {
      const s = stateRef.current;
      if (!s || s.winner) return;
      // Roue mystère en attente de lancer : le temps presse aussi CE
      // geste — on lance la roue à la place du joueur plutôt que d'annuler
      // le coup déjà joué qui l'a amené sur cette case.
      if (s.pendingMystery && !s.pendingMystery.spin) {
        const ownerId = Object.keys(colorRef.current).find(pid => colorRef.current[pid] === s.pendingMystery.color);
        hostHandleSpin({ by: ownerId });
        return;
      }
      // Décision "Épargner ?" non prise à temps : filet de sécurité, on
      // tranche à la place du joueur — capture NORMALE par défaut (spare:
      // false), qui correspond au comportement "silencieux" d'avant ce
      // correctif et ne change donc jamais le déroulé pour qui répond dans
      // les temps.
      if (s.pendingCapture) {
        const ownerId = Object.keys(colorRef.current).find(pid => colorRef.current[pid] === s.pendingCapture.color);
        hostHandleSpare({ by: ownerId, spare: false });
        return;
      }
      // Sinon (en attente d'un lancer de dés OU d'un déplacement) : tour
      // passé, minuteur tout neuf réarmé pour le joueur suivant.
      const currentColor = s.order[s.turnIdx];
      sixesCountRef.current[currentColor] = 0;
      const nextTurnIdx = (s.turnIdx + 1) % s.order.length;
      const deadline2 = Date.now() + MOVE_MS;
      broadcastState({
        turnIdx: nextTurnIdx, dice: null, movablePlan: null, moveDeadline: deadline2,
        effects: s.effects, lastEvent: "timeout", pendingMystery: null,
      });
      armMoveTimer(deadline2);
    }, Math.max(0, deadline - Date.now()));
  }

  // Termine un tirage (plus aucun dé jouable) : décide si le joueur rejoue
  // — et avec COMBIEN de dés, cf. règle du 6 simple/double ci-dessous — ou
  // fait avancer le tour sinon, puis réarme systématiquement le minuteur
  // pour la PHASE SUIVANTE (nouveau lancer du même joueur, ou tour du
  // joueur suivant). Partagée par hostHandleMove ET resolveMysterySpin pour
  // ne jamais dupliquer cette logique de fin de tour.
  function finishDiceTurn({ color, tokens, effects, diceAfter, extraReroll, lastMoved, baseLastEvent }) {
    const s = stateRef.current;
    const colorIdx = s.order.indexOf(color);
    // Règle du 6 simple/double (2026-07, demande explicite) : UN SEUL 6 dans
    // le tirage ne relance QUE ce dé (le prochain lancer du joueur n'aura
    // qu'un dé — même drapeau "oneDie" que le malus mystère, sémantique
    // identique) ; DEUX 6 — ou une case mystère "reroll" — relancent les
    // deux dés normalement.
    const sixCount = (diceAfter.a === 6 ? 1 : 0) + (diceAfter.b === 6 ? 1 : 0);
    const hadSix = sixCount > 0;
    const goAgain = hadSix || extraReroll;
    let nextEffects = effects;
    if (!hadSix) sixesCountRef.current[color] = 0;
    clearTimeout(moveTimerRef.current);

    if (goAgain) {
      if (!extraReroll && sixCount === 1) {
        nextEffects = { ...nextEffects, [color]: { ...(nextEffects[color] || {}), oneDie: true } };
      }
      const deadline = Date.now() + MOVE_MS;
      broadcastState({
        tokens, dice: null, movablePlan: null, effects: nextEffects,
        moveDeadline: deadline, turnIdx: colorIdx,
        lastMoved, lastEvent: baseLastEvent || (extraReroll && !hadSix ? "extraRoll" : "sixAgain"),
        pendingMystery: null,
      });
      armMoveTimer(deadline);
      return;
    }

    const nextTurnIdx = (colorIdx + 1) % s.order.length;
    const deadline = Date.now() + MOVE_MS;
    broadcastState({
      tokens, dice: null, movablePlan: null, effects: nextEffects,
      moveDeadline: deadline, turnIdx: nextTurnIdx,
      lastMoved, lastEvent: baseLastEvent, pendingMystery: null,
    });
    armMoveTimer(deadline);
  }

  // ----- Arbitrage du lancer des dés : seul l'hôte y répond -----
  function hostHandleRoll({ by }) {
    const s = stateRef.current;
    if (s.winner || s.dice !== null || s.pendingMystery || s.pendingCapture) return;
    const currentColor = s.order[s.turnIdx];
    const ownerId = Object.keys(colorRef.current).find(pid => colorRef.current[pid] === currentColor);
    if (by !== ownerId) return;
    // Le joueur vient d'agir avant l'échéance "en attente de lancer" :
    // on neutralise ce minuteur-là tout de suite (les branches ci-dessous
    // en réarment un nouveau, adapté à la phase qui suit).
    clearTimeout(moveTimerRef.current);

    // Malus "un seul dé" (case mystère oppOneDie OU 6 simple du tour
    // précédent) : consommé par CE lancer.
    const eff = { ...(s.effects || {}) };
    const single = !!(eff[currentColor] && eff[currentColor].oneDie);
    if (single) eff[currentColor] = {};

    const a = 1 + Math.floor(Math.random() * 6);
    const b = single ? null : 1 + Math.floor(Math.random() * 6);
    const hasSix = a === 6 || b === 6;
    // Nombre de dés affichant 6 dans CE lancer (utilisé pour la granularité
    // simple/double de la relance, y compris quand ce lancer ne débouche
    // sur aucun coup jouable — voir le correctif "noMove" plus bas).
    const sixCount = (a === 6 ? 1 : 0) + (b === 6 ? 1 : 0);
    // Règle des 6 adaptée aux deux dés : on compte les LANCERS consécutifs
    // contenant au moins un 6 (l'esprit "trois 6 d'affilée = tour perdu"
    // est conservé tel quel).
    const consecutive = hasSix ? (sixesCountRef.current[currentColor] || 0) + 1 : 0;
    sixesCountRef.current[currentColor] = consecutive;

    const rollKey = Date.now();
    const dicePayload = { a, b, used: [false, b == null], rollKey };

    if (consecutive === 3) {
      // Trois lancers avec 6 d'affilée : tour perdu immédiatement.
      broadcastState({ dice: dicePayload, movablePlan: { d0: [], d1: [], sum: [] }, effects: eff, moveDeadline: null, lastEvent: "threeSixes", pendingMystery: null });
      timeouts.current.push(setTimeout(() => {
        sixesCountRef.current[currentColor] = 0;
        const nextTurnIdx = (s.turnIdx + 1) % s.order.length;
        const deadline = Date.now() + MOVE_MS;
        broadcastState({ turnIdx: nextTurnIdx, dice: null, movablePlan: null, moveDeadline: deadline, effects: eff, lastEvent: null, pendingMystery: null });
        armMoveTimer(deadline);
      }, ROLL_ANIM_MS + 1300));
      return;
    }

    const plan = buildPlan(s.tokens[currentColor], dicePayload);
    if (!planHasMove(plan)) {
      broadcastState({ dice: dicePayload, movablePlan: { d0: [], d1: [], sum: [] }, effects: eff, moveDeadline: null, lastEvent: "noMove", pendingMystery: null });
      timeouts.current.push(setTimeout(() => {
        // Un 6 sans coup possible garde la relance (règle historique).
        // Correctif 2026-07 (audit "le 6 parfois pas jouable") : cette
        // branche oubliait de reposer le malus "un seul dé" pour la relance
        // qui suit un 6 SIMPLE (sixCount===1) sans coup jouable — seule la
        // branche "coup joué" (finishDiceTurn) le faisait. Résultat : un 6
        // simple sans coup possible redonnait par erreur DEUX dés au lieu
        // d'UN SEUL à la relance suivante, cassant la règle "un seul 6 = un
        // seul dé relancé" dans ce cas précis (double 6 sans coup, lui,
        // reste inchangé : sixCount===2 => deux dés, comportement voulu).
        let effAfter = eff;
        if (hasSix && sixCount === 1) {
          effAfter = { ...eff, [currentColor]: { ...(eff[currentColor] || {}), oneDie: true } };
        }
        const nextTurnIdx = hasSix ? s.turnIdx : (s.turnIdx + 1) % s.order.length;
        const deadline = Date.now() + MOVE_MS;
        broadcastState({ turnIdx: nextTurnIdx, dice: null, movablePlan: null, moveDeadline: deadline, effects: effAfter, lastEvent: null, pendingMystery: null });
        armMoveTimer(deadline);
      }, ROLL_ANIM_MS + 1300));
      return;
    }

    // Échéance de coup : 20 s APRÈS l'animation de lancer.
    const deadline = Date.now() + ROLL_ANIM_MS + MOVE_MS;
    broadcastState({
      dice: dicePayload, movablePlan: plan, effects: eff,
      moveDeadline: deadline, lastEvent: single ? "oneDieTurn" : null, pendingMystery: null,
    });
    armMoveTimer(deadline);
  }

  // ----- Arbitrage d'un déplacement de pion : seul l'hôte y répond -----
  // `die` : 0 (1er dé), 1 (2e dé) ou "sum" (les deux d'un coup).
  function hostHandleMove({ by, tokenIndex, die }) {
    const s = stateRef.current;
    if (s.winner || s.dice === null || !s.movablePlan || s.pendingMystery || s.pendingCapture) return;
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

    const { tokens: nextTokens, captured, won } = applyMove(s.tokens, currentColor, tokenIndex, value);
    const effects = { ...(s.effects || {}) };
    const movedInfo = { color: currentColor, tokenIdx: tokenIndex };

    if (won) {
      clearTimeout(moveTimerRef.current);
      const captureEvent = captured.length > 0 ? "captured:" + currentColor : null;
      broadcastState({
        tokens: nextTokens, dice: null, movablePlan: null, moveDeadline: null, effects,
        lastMoved: movedInfo, lastEvent: captureEvent, winner: currentColor, pendingMystery: null,
      });
      return;
    }

    // Consommation du/des dé(s) joué(s) : le coup a bien eu lieu, qu'il
    // tombe ou non sur une case mystère (elle ne fait que DIFFÉRER
    // l'application du bonus/malus, jamais le déplacement lui-même).
    const used = die === "sum" ? [true, true] : [die === 0 ? true : d.used[0], die === 1 ? true : (d.b == null ? true : d.used[1])];
    const diceAfter = { ...d, used };

    // ----- Capture => décision "Épargner ?" (2026-07) -----------------
    // Demande explicite : au lieu de capturer AUTOMATIQUEMENT et
    // silencieusement (ancien comportement), on arrive sur la case
    // adverse, on marque une PAUSE (comme pendingMystery) et on demande au
    // propriétaire du pion qui vient d'arriver s'il veut épargner
    // l'adversaire (aucune capture + un tour bonus complet) ou capturer
    // normalement (comportement inchangé). Le reste de la logique de fin de
    // coup (case mystère / dé restant / fin de tour) est repris à
    // l'IDENTIQUE dans hostHandleSpare une fois la décision connue.
    if (captured.length > 0) {
      const tokensSpare = {};
      for (const c of COLOR_ORDER) tokensSpare[c] = nextTokens[c].slice();
      captured.forEach(([oc, oi]) => { tokensSpare[oc][oi] = s.tokens[oc][oi]; });
      const pending = {
        key: Date.now(), color: currentColor, tokenIdx: tokenIndex, captured,
        diceAfter, movedInfo, tokensCapture: nextTokens, tokensSpare,
      };
      const deadline = Date.now() + MOVE_MS;
      broadcastState({
        tokens: tokensSpare, dice: diceAfter, movablePlan: { d0: [], d1: [], sum: [] }, effects,
        moveDeadline: deadline, pendingCapture: pending,
        lastMoved: null, lastEvent: null, pendingMystery: null,
      });
      armMoveTimer(deadline);
      return;
    }

    continueTurnAfterMove({
      color: currentColor, tokens: nextTokens, diceAfter, effects, movedInfo, baseEvent: null,
    });
  }

  // Suite d'un coup une fois la question de capture réglée (ou d'emblée
  // s'il n'y avait rien à capturer) : case mystère, dé restant à jouer, ou
  // fin du tour de dés — partagée par hostHandleMove (coup sans capture) ET
  // hostHandleSpare (coup avec capture tranchée), pour ne jamais dupliquer
  // cette logique entre les deux chemins.
  function continueTurnAfterMove({ color, tokens: nextTokens, diceAfter, effects, movedInfo, baseEvent }) {
    const landed = nextTokens[color][movedInfo.tokenIdx];
    const isMystery = landed >= 1 && landed <= 55 && MYSTERY_ABS.has(absIndex(color, landed));

    if (isMystery) {
      // Case « ? » : la ROUE DE LA FORTUNE s'ouvre (2026-07) — voir
      // hostHandleSpin/resolveMysterySpin. Plus aucun coup n'est jouable
      // tant qu'elle n'a pas tranché ; le joueur (ou le minuteur, en
      // dernier recours) doit d'abord la lancer.
      const pending = { color, tokenIdx: movedInfo.tokenIdx, dice: diceAfter, key: Date.now(), spin: null };
      const deadline = Date.now() + MOVE_MS;
      broadcastState({
        tokens: nextTokens, dice: diceAfter, movablePlan: { d0: [], d1: [], sum: [] }, effects,
        moveDeadline: deadline, pendingMystery: pending,
        lastMoved: movedInfo, lastEvent: baseEvent, pendingCapture: null,
      });
      armMoveTimer(deadline);
      return;
    }

    const planAfter = buildPlan(nextTokens[color], diceAfter);
    if (planHasMove(planAfter)) {
      // Il reste un dé jouable : même joueur, échéance REMISE à 20 s
      // (réinitialisation à chaque coup, demande explicite).
      const deadline = Date.now() + MOVE_MS;
      broadcastState({
        tokens: nextTokens, dice: diceAfter, movablePlan: planAfter, effects,
        moveDeadline: deadline, lastMoved: movedInfo, lastEvent: baseEvent, pendingMystery: null, pendingCapture: null,
      });
      armMoveTimer(deadline);
      return;
    }

    finishDiceTurn({
      color, tokens: nextTokens, effects, diceAfter,
      extraReroll: false, lastMoved: movedInfo, baseLastEvent: baseEvent,
    });
  }

  // ----- Arbitrage de la décision "Épargner ?" : seul l'hôte y répond -----
  function hostHandleSpare({ by, spare }) {
    const s = stateRef.current;
    if (s.winner || !s.pendingCapture) return;
    const pc = s.pendingCapture;
    const ownerId = Object.keys(colorRef.current).find(pid => colorRef.current[pid] === pc.color);
    if (by !== ownerId) return;
    clearTimeout(moveTimerRef.current);

    if (spare) {
      // Épargné : aucune capture (les pions adverses restent en place,
      // tokensSpare était déjà diffusé pendant l'attente) + récompense =
      // un tour ENTIER bonus (deux dés neufs), immédiatement, qu'il reste
      // ou non un dé à jouer dans le tirage en cours — même mécanisme que
      // le bonus mystère "reroll" (extraReroll), demande explicite
      // ("il gagne encore un tour").
      const deadline = Date.now() + MOVE_MS;
      broadcastState({
        tokens: pc.tokensSpare, dice: null, movablePlan: null, effects: s.effects,
        moveDeadline: deadline, turnIdx: s.order.indexOf(pc.color),
        lastMoved: pc.movedInfo, lastEvent: "spared:" + pc.color, pendingCapture: null,
      });
      armMoveTimer(deadline);
      return;
    }

    // Capture confirmée : reprend exactement le fil normal d'un coup
    // (case mystère / dé restant / fin de tour) via continueTurnAfterMove.
    continueTurnAfterMove({
      color: pc.color, tokens: pc.tokensCapture, diceAfter: pc.diceAfter, effects: s.effects,
      movedInfo: pc.movedInfo, baseEvent: "captured:" + pc.color,
    });
  }

  // ----- Arbitrage du lancer de la roue de la fortune : seul l'hôte y répond -----
  function hostHandleSpin({ by }) {
    const s = stateRef.current;
    if (s.winner || !s.pendingMystery || s.pendingMystery.spin || s.pendingCapture) return;
    const ownerId = Object.keys(colorRef.current).find(pid => colorRef.current[pid] === s.pendingMystery.color);
    if (by !== ownerId) return;
    clearTimeout(moveTimerRef.current);
    const kind = pickMysteryKind().id;
    const pending = { ...s.pendingMystery, spin: { key: Date.now(), kind } };
    // Aucune échéance pendant l'animation : personne n'a d'action à faire,
    // seule la résolution différée (ci-dessous) fait avancer la partie.
    broadcastState({
      dice: s.dice, movablePlan: { d0: [], d1: [], sum: [] }, effects: s.effects,
      moveDeadline: null, pendingMystery: pending,
    });
    timeouts.current.push(setTimeout(() => resolveMysterySpin(pending), MYSTERY_SPIN_MS));
  }

  // Résolution de la roue une fois l'animation terminée (délai
  // MYSTERY_SPIN_MS après le lancer) : applique l'effet déjà tiré, puis
  // reprend exactement le fil du tour (dé(s) restant à jouer, relance
  // méritée ou passage au joueur suivant) via finishDiceTurn.
  function resolveMysterySpin(pending) {
    const s = stateRef.current;
    // Garde-fou : si la partie a changé entretemps (nouvelle partie, victoire
    // déclarée autrement, etc.), on abandonne proprement.
    if (s.winner || !s.pendingMystery || s.pendingMystery.key !== pending.key) return;
    const { color, tokenIdx, dice: diceAfter } = pending;
    const kind = pending.spin && pending.spin.kind;
    const colorIdx = s.order.indexOf(color);
    const nextColor = s.order[(colorIdx + 1) % s.order.length];
    const { tokens: nextTokens, captured, extraRoll, effectsPatch, info } =
      applyMysteryKind(s.tokens, color, tokenIdx, kind, nextColor);
    let effects = { ...(s.effects || {}) };
    if (effectsPatch) {
      effects[effectsPatch.color] = { ...(effects[effectsPatch.color] || {}), ...effectsPatch.patch };
    }
    // Correctif 2026-07 (audit jouabilité) : BUG — quand l'effet de la roue
    // capturait AUSSI un pion adverse (boost/superBoost/setback/
    // doubleSetback qui retombent sur un adversaire), le message affiché
    // était TOUJOURS celui de la roue seule (mysteryEvent, une chaîne non
    // vide donc toujours "vraie") : `mysteryEvent || captureEvent` ne
    // laissait jamais la moindre chance à captureEvent de s'afficher, alors
    // que le pion était bel et bien capturé en jeu. Le suffixe ":captured"
    // porte maintenant cette info DANS le même événement (un seul "slot"
    // lastEvent existe) ; voir son décodage côté rendu (mysteryCaptured).
    const mysteryEvent = "mystery:" + kind + ":" + color + (captured.length > 0 ? ":captured" : "");
    const movedInfo = { color, tokenIdx: info.freedIdx != null ? info.freedIdx : tokenIdx };

    if (info.won) {
      clearTimeout(moveTimerRef.current);
      broadcastState({
        tokens: nextTokens, dice: null, movablePlan: null, moveDeadline: null, effects,
        lastMoved: movedInfo, lastEvent: mysteryEvent, winner: color, pendingMystery: null,
      });
      return;
    }

    const planAfter = buildPlan(nextTokens[color], diceAfter);
    if (planHasMove(planAfter)) {
      const deadline = Date.now() + MOVE_MS;
      broadcastState({
        tokens: nextTokens, dice: diceAfter, movablePlan: planAfter, effects,
        moveDeadline: deadline, lastMoved: movedInfo, lastEvent: mysteryEvent, pendingMystery: null,
      });
      armMoveTimer(deadline);
      return;
    }

    // Correctif (freeze après la roue) : `finishDiceTurn` attend une clé
    // `extraReroll`, alors que la valeur tirée d'applyMysteryKind s'appelle
    // `extraRoll`. L'ancien code passait `extraReroll` en raccourci d'objet
    // SANS que cette variable existe dans ce scope, ce qui levait un
    // ReferenceError non intercepté à chaque fois que la roue mystère
    // terminait un tour (aucun dé restant à jouer) — précisément le cas le
    // plus fréquent. L'exception, levée dans le setTimeout de
    // resolveMysterySpin, ne cassait pas React mais empêchait tout
    // broadcastState/armMoveTimer de s'exécuter ensuite : plus aucune
    // échéance active, pendingMystery.spin déjà posé (donc requestSpin ne
    // relance rien) -> partie figée en permanence.
    finishDiceTurn({
      color, tokens: nextTokens, effects, diceAfter,
      extraReroll: extraRoll, lastMoved: movedInfo, baseLastEvent: mysteryEvent,
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

  // Chaque joueur enregistre SON propre résultat (RLS/RPC oblige).
  useEffect(() => {
    if (!winner || savedResultRef.current) return;
    const myColor = colorOfPlayer[me.id];
    if (!myColor) return;
    savedResultRef.current = true;
    const won = myColor === winner;
    setMyWin(won);
    recordMatchResult(room.id, won);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  function rollDice() {
    if (!isMyTurn || dice !== null || pendingMystery || pendingCapture) return;
    channelRef.current?.send({ type: "broadcast", event: "roll_attempt", payload: { by: me.id } });
  }
  // Options de dé permettant de jouer CE pion précis, dans l'état actuel du
  // plan (peut en avoir 0, 1, plusieurs si plusieurs dés/la somme le
  // permettent tous). Partagé par le rendu (canPick) et pickToken.
  function dieOptionsFor(idx) {
    const opts = [];
    if (movablePlan?.d0?.includes(idx)) opts.push(0);
    if (movablePlan?.d1?.includes(idx)) opts.push(1);
    if (movablePlan?.sum?.includes(idx)) opts.push("sum");
    return opts;
  }
  // Correctif 2026-07 (audit "le 6 parfois pas jouable") : cliquer un pion
  // dépendait STRICTEMENT du dé actuellement présélectionné (selectedDie) —
  // or la présélection par défaut privilégie toujours le 1er dé encore
  // jouable (voir l'effet plus haut), qui n'est pas forcément celui qui
  // permet CE pion précis. Cas typique : un pion encore dans l'enclos ne
  // peut sortir qu'avec un dé affichant 6 ; si ce 6 tombe sur le SECOND dé
  // et que le premier dé a par ailleurs un autre coup possible, la
  // présélection reste sur le premier dé et le pion de l'enclos apparaît
  // alors comme non cliquable tant qu'on n'a pas explicitement cliqué la
  // face "6" — un joueur qui l'ignore perçoit ça comme "le 6 ne marche
  // pas". Désormais : n'importe quel pion réellement jouable (par au moins
  // une option) est cliquable ; le dé utilisé est celui présélectionné s'il
  // convient, sinon la première option valide pour CE pion (déterministe,
  // ne change jamais un coup ambigu déjà couvert par la présélection).
  function pickToken(idx) {
    if (!isMyTurn || dice === null || pendingMystery || pendingCapture) return;
    if (rollAnim && rollAnim.phase === "rolling") return; // laisse les dés s'immobiliser
    const opts = dieOptionsFor(idx);
    if (!opts.length) return;
    const die = opts.includes(selectedDie) ? selectedDie : opts[0];
    channelRef.current?.send({ type: "broadcast", event: "move_attempt", payload: { by: me.id, tokenIndex: idx, die } });
  }
  // Déclenche la roue (clic sur la roue/le bouton, ou barre d'espace) —
  // uniquement le propriétaire du pion concerné peut la lancer.
  function requestSpin() {
    if (!pendingMystery || pendingMystery.spin || pendingCapture) return;
    if (colorOfPlayer[me.id] !== pendingMystery.color) return;
    channelRef.current?.send({ type: "broadcast", event: "spin_attempt", payload: { by: me.id } });
  }
  // Décision "Épargner ?" (2026-07) : seul le propriétaire du pion arrivé
  // sur la case adverse peut trancher. spare=true => aucune capture + tour
  // bonus complet ; spare=false => capture normale, la partie continue.
  function requestSpare(spare) {
    if (!pendingCapture) return;
    if (colorOfPlayer[me.id] !== pendingCapture.color) return;
    channelRef.current?.send({ type: "broadcast", event: "spare_attempt", payload: { by: me.id, spare } });
  }

  const myColor = colorOfPlayer[me.id];
  const isPlayer = !!myColor;
  const currentColor = order[turnIdx];
  const isMyTurn = phase === "playing" && !winner && isPlayer && currentColor === myColor;
  const needsPick = players.length > 4;
  const settled = !rollAnim || rollAnim.phase === "settled";
  const moveRemaining = moveDeadline ? Math.max(0, Math.ceil((moveDeadline - now) / 1000)) : null;
  // Pions cliquables (2026-07, voir dieOptionsFor/pickToken plus haut) :
  // TOUT pion jouable par au moins une option (dé 1, dé 2 ou somme) du plan
  // courant est cliquable, quel que soit le dé actuellement présélectionné
  // — corrige le cas où un pion (ex. sortie d'enclos, uniquement via un 6)
  // n'était affiché comme jouable QUE si le joueur avait explicitement
  // sélectionné le bon dé au préalable.
  const canPlayNow = isMyTurn && dice && movablePlan && settled && !pendingMystery && !pendingCapture;
  const movableNow = canPlayNow
    ? [...new Set([...(movablePlan.d0 || []), ...(movablePlan.d1 || []), ...(movablePlan.sum || [])])]
    : [];

  // Aperçu de destination au survol (confort de jeu, 2026-07, étendu au
  // correctif "le 6 parfois pas jouable") : simule localement le coup (même
  // fonction PURE applyMove que l'arbitre hôte), sans rien diffuser — juste
  // de quoi afficher un fantôme discret sur la case d'arrivée, et un 💥 si
  // ce coup capturerait un ou plusieurs pions. Utilise la même résolution
  // de dé que pickToken (présélection si valide pour CE pion, sinon la
  // première option disponible) pour rester cohérent avec le coup qui sera
  // réellement joué au clic.
  function previewFor(tokenIdx) {
    if (!dice || !myColor || !movablePlan) return null;
    const opts = [];
    if (movablePlan.d0?.includes(tokenIdx)) opts.push(0);
    if (movablePlan.d1?.includes(tokenIdx)) opts.push(1);
    if (movablePlan.sum?.includes(tokenIdx)) opts.push("sum");
    if (!opts.length) return null;
    const die = opts.includes(selectedDie) ? selectedDie : opts[0];
    const value = die === "sum" ? dice.a + dice.b : die === 0 ? dice.a : dice.b;
    if (value == null) return null;
    const { tokens: simTokens, captured } = applyMove(tokens, myColor, tokenIdx, value);
    const cell = cellFor(myColor, simTokens[myColor][tokenIdx]);
    if (!cell) return null;
    return { tokenIdx, cell, captureCount: captured.length };
  }

  // Raccourci clavier (barre d'Espace, demande 2026-07) : lance les dés à
  // son tour, ET lance la roue de la fortune quand une case mystère
  // l'exige — ignoré si le focus est sur un champ de saisie (ex. le chat du
  // salon) pour ne jamais voler un espace tapé dans un message.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.code !== "Space") return;
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable) return;
      if (pendingCapture) return; // décision à la souris (overlay Épargner ?)
      if (pendingMystery && !pendingMystery.spin && colorOfPlayer[me.id] === pendingMystery.color) {
        e.preventDefault();
        requestSpin();
        return;
      }
      if (!isMyTurn || dice !== null || pendingMystery) return;
      e.preventDefault();
      rollDice();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, dice, pendingMystery, pendingCapture, myColor]);
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
    const mysteryInfo = mysteryMatch ? MYSTERY_KINDS.find(k => k.id === mysteryMatch[1]) : null;
    // Correctif 2026-07 : la roue peut AUSSI capturer un pion adverse
    // (boost/setback qui retombent sur un adversaire) — cette info voyage
    // désormais dans le même événement (suffixe ":captured", voir
    // resolveMysterySpin) plutôt que d'être silencieusement perdue.
    const mysteryCaptured = mysteryMatch && mysteryMatch[3] === "captured";
    if (winner) statusText = null;
    else if (pendingMystery && pendingMystery.spin) statusText = t("ludoMysterySpinning");
    else if (pendingMystery && !pendingMystery.spin) {
      statusText = myColor === pendingMystery.color
        ? t("ludoMysterySpinPrompt")
        : `${t("ludoWaitingFor")} ${playerNameFor(pendingMystery.color)} (🎡)…`;
    }
    else if (pendingCapture) {
      statusText = myColor === pendingCapture.color
        ? t("ludoSpareTitle")
        : `${t("ludoWaitingFor")} ${playerNameFor(pendingCapture.color)} (⚔️)…`;
    }
    else if (lastEvent === "threeSixes") statusText = t("ludoThreeSixes");
    else if (lastEvent === "noMove") statusText = t("ludoNoMove");
    else if (lastEvent === "timeout") statusText = t("ludoTimeout");
    else if (lastEvent === "sixAgain") statusText = t("ludoSixAgain");
    else if (lastEvent === "extraRoll") statusText = t("ludoExtraRoll");
    else if (lastEvent === "oneDieTurn") statusText = t("ludoOneDieTurn");
    else if (mysteryInfo) {
      statusText = t(mysteryInfo.labelKey);
      if (mysteryCaptured) statusText += ` · 💥 ${playerNameFor(mysteryMatch[2])} ${t("ludoCapturedSuffix")}`;
    }
    else if (lastEvent && lastEvent.startsWith("spared:")) {
      const moverColor = lastEvent.split(":")[1];
      statusText = `🕊️ ${playerNameFor(moverColor)} ${t("ludoSparedSuffix")}`;
    }
    else if (lastEvent && lastEvent.startsWith("captured:")) {
      const moverColor = lastEvent.split(":")[1];
      statusText = `💥 ${playerNameFor(moverColor)} ${t("ludoCapturedSuffix")}`;
    } else if (isMyTurn && dice === null) statusText = t("ludoYourTurn");
    else if (isMyTurn && dice !== null) statusText = t("ludoPickToken");
    else if (isPlayer) statusText = `${t("ludoWaitingFor")} ${playerNameFor(currentColor)}…`;
    else statusText = t("ludoSpectating");

    // Plateau de dés : ancré près du camp du joueur ACTIF, pips à sa couleur.
    // Caché pendant la roue de la fortune ET la décision "Épargner ?"
    // (2026-07) pour ne pas encombrer.
    const trayPos = currentColor ? DICE_TRAY_POS[currentColor] : null;
    const trayColorVar = currentColor ? COLORS[currentColor].css : "--p2";
    const dieValues = dice ? [dice.a, dice.b] : [];
    const showTray = phase === "playing" && !winner && dice !== null && !pendingMystery && !pendingCapture;
    const sumAvailable = !!(isMyTurn && settled && movablePlan && movablePlan.sum.length > 0 && dice && dice.b != null && !dice.used[0] && !dice.used[1] && !pendingMystery && !pendingCapture);

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
            {/* Le minuteur tourne dès le DÉBUT du tour (2026-07) : la
                pastille est donc visible même AVANT le premier lancer
                (dice === null), pas seulement une fois les dés posés. */}
            {moveRemaining != null && settled && !pendingMystery && !pendingCapture && (
              <span className={"turn-timer-chip" + (moveRemaining <= 5 ? " hot" : "")} style={{ marginLeft: 8 }}>⏱ {moveRemaining}s</span>
            )}
          </p>
        )}

        {/* Correctif 2026-07 : cadre (bordure/ombre/rognage) et grille de
            coordonnées désormais séparés — voir le commentaire CSS sur
            .ludo-board-frame/.ludo-board (corrige les pions tronqués en
            haut du plateau). */}
        <div className="ludo-board-frame">
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
          {mysteryMatch && !winner && !pendingMystery && (
            <div className="ludo-mystery-pop" key={lastEvent + "-" + (lastMoved ? lastMoved.tokenIdx : "")} aria-hidden="true">
              <span className="ludo-mystery-pop-text">{mysteryInfo ? mysteryInfo.pop : "🎁"}</span>
            </div>
          )}

          {/* Roue de la fortune (2026-07) : visible de TOUS dès qu'un pion
              atterrit pile sur une case « ? », jusqu'à résolution. */}
          {pendingMystery && (
            <MysteryWheel
              pending={pendingMystery}
              isOwner={myColor === pendingMystery.color}
              onSpin={requestSpin}
              t={t}
            />
          )}

          {/* Décision "Épargner ?" (2026-07) : visible de TOUS dès qu'un
              pion atterrit sur une case occupée par un ou plusieurs pions
              adverses (hors case sûre), jusqu'à ce que le propriétaire du
              pion arrivant tranche (voir requestSpare/hostHandleSpare). */}
          {pendingCapture && (
            <CaptureChoice
              pending={pendingCapture}
              isOwner={myColor === pendingCapture.color}
              onDecide={requestSpare}
              t={t}
              playerNameFor={playerNameFor}
            />
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
                  onMouseEnter={() => canPick && setHoverPreview(previewFor(idx))}
                  onMouseLeave={() => setHoverPreview(prev => (prev && prev.tokenIdx === idx ? null : prev))}
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

          {/* Aperçu de destination au survol (confort de jeu, 2026-07) :
              anneau discret sur la case d'arrivée du pion survolé, + 💥 si
              ce coup capturerait un ou plusieurs pions adverses. */}
          {hoverPreview && (() => {
            const [pr, pc] = hoverPreview.cell;
            return (
              <>
                <div
                  className={"ludo-preview" + (hoverPreview.captureCount > 0 ? " capture" : "")}
                  style={{
                    top: (pr / 15) * 100 + "%", left: (pc / 15) * 100 + "%",
                    width: (0.82 / 15) * 100 + "%", height: (0.82 / 15) * 100 + "%",
                  }}
                />
                {hoverPreview.captureCount > 0 && (
                  <span
                    className="ludo-preview-capture"
                    style={{ top: (pr / 15) * 100 + "%", left: ((pc + 0.5) / 15) * 100 + "%" }}
                  >💥</span>
                )}
              </>
            );
          })()}
        </div>
        </div>

        {winner ? (
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
        ) : (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
            {isMyTurn && dice === null && !pendingMystery && !pendingCapture && (
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
    <div className="panel ludo-panel" style={{ maxWidth: "min(800px, 96vw)" }}>
      <h1>{t("ludoTitle")}</h1>
      <Crossfade id={phase}>{content}</Crossfade>
    </div>
  );
}
