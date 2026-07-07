"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState } from "@/lib/gameSync";
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
// Cases sûres (étoiles) en coordonnées, pour l'affichage
const SAFE_CELLS = new Set([...SAFE_ABS].map(i => TRACK[i].join("_")));

function absIndex(color, steps) {
  return (COLORS[color].start + steps - 1) % 56;
}
function cellFor(color, steps) {
  if (steps <= 0) return null;
  if (steps <= 55) return TRACK[absIndex(color, steps)];
  if (steps <= 61) return COLORS[color].home[steps - 56];
  return null;
}
function canMoveToken(steps, roll) {
  if (steps === 0) return roll === 6;
  if (steps >= 61) return false;
  return steps + roll <= 61;
}
function movableIndices(tokensOfColor, roll) {
  return tokensOfColor.map((s, i) => i).filter(i => canMoveToken(tokensOfColor[i], roll));
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
function emptyTokens() {
  const t = {};
  for (const c of COLOR_ORDER) t[c] = [0, 0, 0, 0];
  return t;
}

export default function PetitsChevaux({ room, me, isHost, players, t, lang, onFinish }) {
  const [phase, setPhase] = useState("intro"); // intro (choix/attente) -> playing -> finished
  const [order, setOrder] = useState([]);           // couleurs en jeu, dans l'ordre du tour
  const [colorOfPlayer, setColorOfPlayer] = useState({}); // profile_id -> couleur
  const [tokens, setTokens] = useState(emptyTokens());
  const [turnIdx, setTurnIdx] = useState(0);
  const [dice, setDice] = useState(null);
  const [movable, setMovable] = useState([]);
  const [lastMoved, setLastMoved] = useState(null); // { color, tokenIdx } pour l'anim
  const [lastEvent, setLastEvent] = useState(null); // texte de statut transitoire
  const [winner, setWinner] = useState(null);       // null | couleur
  const [selected, setSelected] = useState([]);     // sélection du picker (>4 joueurs)
  const [myGain, setMyGain] = useState(0);
  const [channelReady, setChannelReady] = useState(false);
  const [rolling, setRolling] = useState(false);

  const channelRef = useRef(null);
  const stateRef = useRef({ tokens, order, turnIdx, dice, movable, winner });
  const savedResultRef = useRef(false);
  const autoStartedRef = useRef(false);
  const restoredRef = useRef(false);
  const timeouts = useRef([]);
  // Miroirs annexes pour l'arbitre (hôte) : évitent des closures figées et
  // gardent les compteurs de 6 d'affilée en dehors du cycle de rendu React.
  const colorRef = useRef({});
  const sixesCountRef = useRef({});

  useEffect(() => {
    stateRef.current = { tokens, order, turnIdx, dice, movable, winner };
  }, [tokens, order, turnIdx, dice, movable, winner]);
  useEffect(() => { colorRef.current = colorOfPlayer; }, [colorOfPlayer]);

  useEffect(() => {
    const ch = supabase.channel("ludo_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "match_start" }, ({ payload }) => {
      setOrder(payload.order);
      setColorOfPlayer(payload.colorOfPlayer);
      setTokens(emptyTokens());
      setTurnIdx(0);
      setDice(null);
      setMovable([]);
      setLastMoved(null);
      setLastEvent(null);
      setWinner(null);
      setMyGain(0);
      savedResultRef.current = false;
      setPhase("playing");
      if (isHost) {
        saveGameState(room.id, "ludo", {
          phase: "playing", order: payload.order, colorOfPlayer: payload.colorOfPlayer,
          tokens: emptyTokens(), turnIdx: 0, dice: null, movable: [], lastMoved: null, lastEvent: null, winner: null,
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
      setTokens(payload.tokens);
      setTurnIdx(payload.turnIdx);
      setDice(payload.dice);
      setMovable(payload.movable);
      setLastMoved(payload.lastMoved);
      setLastEvent(payload.lastEvent);
      setWinner(payload.winner);
      if (isHost) {
        saveGameState(room.id, "ludo", {
          phase: "playing", order: stateRef.current.order, colorOfPlayer: colorRef.current,
          tokens: payload.tokens, turnIdx: payload.turnIdx, dice: payload.dice, movable: payload.movable,
          lastMoved: payload.lastMoved, lastEvent: payload.lastEvent, winner: payload.winner,
        });
      }
    });

    ch.on("broadcast", { event: "finished" }, () => setPhase("finished"));

    ch.subscribe(status => {
      if (status === "SUBSCRIBED") {
        setChannelReady(true);
        // Resynchronisation : une partie en cours (rechargement de page) est
        // restaurée immédiatement plutôt que d'attendre un message perdu.
        if (!restoredRef.current) {
          restoredRef.current = true;
          const saved = readGameState(room, "ludo");
          if (saved) {
            setOrder(saved.order); setColorOfPlayer(saved.colorOfPlayer);
            setTokens(saved.tokens); setTurnIdx(saved.turnIdx); setDice(saved.dice);
            setMovable(saved.movable); setLastMoved(saved.lastMoved); setLastEvent(saved.lastEvent);
            setWinner(saved.winner);
            setPhase(saved.phase === "finished" ? "finished" : "playing");
            autoStartedRef.current = true;
          }
        }
      }
    });

    return () => {
      timeouts.current.forEach(clearTimeout);
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
      movable: patch.movable ?? [],
      lastMoved: "lastMoved" in patch ? patch.lastMoved : null,
      lastEvent: "lastEvent" in patch ? patch.lastEvent : null,
      winner: "winner" in patch ? patch.winner : s.winner,
    };
    channelRef.current.send({ type: "broadcast", event: "state", payload });
  }

  // ----- Arbitrage du lancer de dé : seul l'hôte y répond -----
  function hostHandleRoll({ by }) {
    const s = stateRef.current;
    if (s.winner || s.dice !== null) return;
    const currentColor = s.order[s.turnIdx];
    const ownerId = Object.keys(colorRef.current).find(pid => colorRef.current[pid] === currentColor);
    if (by !== ownerId) return;

    const roll = 1 + Math.floor(Math.random() * 6);
    const consecutive = roll === 6 ? (sixesCountRef.current[currentColor] || 0) + 1 : 0;
    sixesCountRef.current[currentColor] = consecutive;

    if (consecutive === 3) {
      // Trois 6 d'affilée : tour perdu immédiatement, sans bouger.
      broadcastState({ dice: roll, movable: [], lastEvent: "threeSixes" });
      timeouts.current.push(setTimeout(() => {
        sixesCountRef.current[currentColor] = 0;
        broadcastState({ turnIdx: (s.turnIdx + 1) % s.order.length, dice: null, movable: [], lastEvent: null });
      }, 1300));
      return;
    }

    const mv = movableIndices(s.tokens[currentColor], roll);
    if (mv.length === 0) {
      broadcastState({ dice: roll, movable: [], lastEvent: "noMove" });
      timeouts.current.push(setTimeout(() => {
        const next = roll === 6 ? s.turnIdx : (s.turnIdx + 1) % s.order.length;
        broadcastState({ turnIdx: next, dice: null, movable: [], lastEvent: null });
      }, 1300));
      return;
    }

    broadcastState({ dice: roll, movable: mv, lastEvent: null });
  }

  // ----- Arbitrage d'un déplacement de pion : seul l'hôte y répond -----
  function hostHandleMove({ by, tokenIndex }) {
    const s = stateRef.current;
    if (s.winner || s.dice === null) return;
    const currentColor = s.order[s.turnIdx];
    const ownerId = Object.keys(colorRef.current).find(pid => colorRef.current[pid] === currentColor);
    if (by !== ownerId) return;
    if (!s.movable.includes(tokenIndex)) return;

    const { tokens: nextTokens, captured, won } = applyMove(s.tokens, currentColor, tokenIndex, s.dice);
    const rolledSixForEvent = s.dice === 6;
    const event = won ? null : (captured.length > 0 ? "captured:" + currentColor : (rolledSixForEvent ? "sixAgain" : null));

    if (won) {
      broadcastState({ tokens: nextTokens, movable: [], lastMoved: { color: currentColor, tokenIdx: tokenIndex }, lastEvent: null, winner: currentColor });
      timeouts.current.push(setTimeout(() => {
        channelRef.current.send({ type: "broadcast", event: "finished", payload: {} });
        if (isHost) saveGameState(room.id, "ludo", { ...stateRef.current, colorOfPlayer: colorRef.current, phase: "finished" });
        timeouts.current.push(setTimeout(async () => {
          await supabase.from("rooms").update({ status: "lobby", current_game: null, game_state: null }).eq("id", room.id);
          onFinish && onFinish();
        }, 3200));
      }, 900));
      return;
    }

    const rolledSix = s.dice === 6;
    const nextTurnIdx = rolledSix ? s.turnIdx : (s.turnIdx + 1) % s.order.length;
    if (!rolledSix) sixesCountRef.current[currentColor] = 0;

    broadcastState({
      tokens: nextTokens, movable: [], dice: null, turnIdx: nextTurnIdx,
      lastMoved: { color: currentColor, tokenIdx: tokenIndex }, lastEvent: event
    });
  }

  // Si le salon a entre 2 et 4 joueurs, l'hôte démarre automatiquement dès
  // que le canal est prêt : chacun reçoit une couleur, dans l'ordre.
  useEffect(() => {
    if (!isHost || phase !== "intro" || autoStartedRef.current || !channelReady) return;
    if (players.length >= 2 && players.length <= 4) {
      autoStartedRef.current = true;
      const ord = COLOR_ORDER.slice(0, players.length);
      const map = {};
      players.forEach((p, i) => { map[p.profile_id] = ord[i]; });
      channelRef.current.send({ type: "broadcast", event: "match_start", payload: { order: ord, colorOfPlayer: map } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, channelReady, players.length]);

  function confirmPick() {
    if (selected.length < 2 || selected.length > 4 || !channelReady) return;
    const ord = COLOR_ORDER.slice(0, selected.length);
    const map = {};
    selected.forEach((pid, i) => { map[pid] = ord[i]; });
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: { order: ord, colorOfPlayer: map } });
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
    setRolling(true);
    setTimeout(() => setRolling(false), 500);
    channelRef.current?.send({ type: "broadcast", event: "roll_attempt", payload: { by: me.id } });
  }
  function pickToken(idx) {
    if (!isMyTurn || dice === null || !movable.includes(idx)) return;
    channelRef.current?.send({ type: "broadcast", event: "move_attempt", payload: { by: me.id, tokenIndex: idx } });
  }

  const myColor = colorOfPlayer[me.id];
  const isPlayer = !!myColor;
  const currentColor = order[turnIdx];
  const isMyTurn = phase === "playing" && !winner && isPlayer && currentColor === myColor;
  const needsPick = players.length > 4;
  const playerNameFor = (color) => {
    const pid = Object.keys(colorOfPlayer).find(id => colorOfPlayer[id] === color);
    const p = players.find(pp => pp.profile_id === pid);
    return p?.profiles?.username || "?";
  };

  let content;

  if (phase === "finished") {
    const iWon = myColor && myColor === winner;
    content = (
      <div>
        <p className="hint">
          {isPlayer
            ? (iWon ? t("ludoWinYou") : `${playerNameFor(winner)} ${t("ludoWinSpectator")}`)
            : `${playerNameFor(winner)} ${t("ludoWinSpectator")}`}
        </p>
        {isPlayer && (
          <p style={{ fontWeight: 800 }}>
            {t("peYourGain")} <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>+{myGain} {t("pts")}</span>
          </p>
        )}
      </div>
    );
  } else if (phase === "playing") {
    let statusText;
    if (lastEvent === "threeSixes") statusText = t("ludoThreeSixes");
    else if (lastEvent === "noMove") statusText = t("ludoNoMove");
    else if (lastEvent === "sixAgain") statusText = t("ludoSixAgain");
    else if (lastEvent && lastEvent.startsWith("captured:")) {
      const moverColor = lastEvent.split(":")[1];
      statusText = `💥 ${playerNameFor(moverColor)} ${t("ludoCapturedSuffix")}`;
    } else if (isMyTurn && dice === null) statusText = t("ludoYourTurn");
    else if (isMyTurn && dice !== null) statusText = t("ludoPickToken");
    else if (isPlayer) statusText = `${t("ludoWaitingFor")} ${playerNameFor(currentColor)}…`;
    else statusText = t("ludoSpectating");

    content = (
      <div>
        <div className="ludo-players-row" style={{ marginBottom: 12 }}>
          {order.map(color => (
            <span key={color} className={"ludo-turn-chip" + (color === currentColor ? " active" : "")} style={{ "--accent-color": `var(${COLORS[color].css})` }}>
              <span className="swatch" style={{ background: `var(${COLORS[color].css})` }} />
              {playerNameFor(color)}
            </span>
          ))}
        </div>

        <p className="muted" style={{ textAlign: "center", marginBottom: 10, minHeight: 18 }}>{statusText}</p>

        <div className="ludo-board">
          {Object.entries(CELL_TYPE).map(([key, type]) => {
            const [r, c] = key.split("_").map(Number);
            const isSafe = SAFE_CELLS.has(key);
            const style = {
              top: (r / 15) * 100 + "%", left: (c / 15) * 100 + "%",
              width: (1 / 15) * 100 + "%", height: (1 / 15) * 100 + "%",
            };
            return <div key={key} className={"ludo-cell " + type + (isSafe ? " safe" : "")} style={style} />;
          })}

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

          {COLOR_ORDER.map(color => tokens[color].map((steps, idx) => {
            if (!order.includes(color)) return null;
            const cell = steps === 0 ? COLORS[color].yard[idx] : cellFor(color, steps);
            if (!cell) return null; // garde-fou, ne devrait pas arriver (steps=61 renvoie la dernière case privée)
            const [r, c] = cell;
            const isMine = color === myColor;
            const canPick = isMyTurn && isMine && movable.includes(idx);
            const isLast = !!(lastMoved && lastMoved.color === color && lastMoved.tokenIdx === idx);
            return (
              <div
                key={color + "-" + idx}
                className={"ludo-token " + color + (canPick ? " mine-movable" : "") + (isLast ? " last" : "")}
                onClick={() => canPick && pickToken(idx)}
                style={{
                  top: (r / 15) * 100 + "%", left: (c / 15) * 100 + "%",
                  width: (1 / 15) * 100 + "%", height: (1 / 15) * 100 + "%",
                }}
              />
            );
          }))}
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
          {isMyTurn && dice === null ? (
            <button className="btn" style={{ width: "auto", padding: "12px 26px" }} onClick={rollDice}>
              {t("ludoRollDice")}
            </button>
          ) : (
            <div className={"ludo-dice" + (rolling ? " rolling" : "")}>{dice ?? "🎲"}</div>
          )}
        </div>
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
