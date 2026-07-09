"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby } from "@/lib/gameSync";
import Crossfade from "@/components/Crossfade";
import RoomIllustration from "./RoomIllustration";
import { genProloguePuzzle } from "./puzzle";
import { SYMBOLS } from "./constants";

/* ==========================================================================
   DIAPASON — Prologue "Le Réveil" (jeu phare narratif coopératif d'ARCARDI)
   ==========================================================================
   Pattern n°3 (coopératif asymétrique, sans arbitre), même conventions
   qu'Échos :
     - "match_start" : l'hôte génère les TROIS épreuves ENTIÈRES (rôles +
       codes des portes + cachettes des clés + codes du cadenas final) et
       les diffuse une fois pour toutes ; les deux clients adoptent
       exactement les mêmes données, seul le RENDU diffère selon le rôle.
     - "door_open" / "gate_open" / "lock_open" : chacun diffusé par le
       joueur qui vient de réussir SA part de l'épreuve en cours (vérifiée
       localement) ; les deux clients l'appliquent (self:true) et chacun
       calcule de son côté si les deux moitiés sont réunies pour passer à
       l'épreuve suivante.

   Trois épreuves, même structure narrative à chaque fois (voir puzzle.js) :
   ce que je vois chez MOI ne me sert jamais à MOI, seulement à décrire à
   mon partenaire ce qu'IL doit faire chez LUI, et réciproquement — aucun
   des deux ne peut donc progresser seul.
     1. "Le Réveil"  (entrance + door)    : trouver l'interrupteur, régler
        les 3 cadrans de la porte scellée sur le code décrit par l'autre.
     2. "La Clé"     (storage + gate)     : trouver la clé dans la bonne
        cachette du débarras (décrite par l'autre via le sceau de SA
        grille), puis déverrouiller la grille.
     3. "Le Cadenas" (sanctuary)          : régler les 4 anneaux du cadenas
        final sur le code décrit par l'autre (tablette gravée).

   Aucun chronomètre dans ce prologue (volontaire) : c'est une scène
   d'ouverture atmosphérique, pas une épreuve contre la montre.

   Règle Supabase respectée : seule la RÉSOLUTION des puzzles transite par
   le réseau (rôles, codes, cachette trouvée ou non, porte/grille/cadenas
   ouvert ou non). Tout le reste — la caméra, le vacillement de la lampe,
   l'animation des cadrans — est calculé en local par chaque client et
   n'est jamais synchronisé.
   ========================================================================== */

const BASE_POINTS = 20;

function symbolLabelKey(sym) {
  return "diapasonSymbol" + sym.charAt(0).toUpperCase() + sym.slice(1);
}

const VIEWPOINT_LABEL_KEY = {
  entrance: "diapasonViewEntrance",
  door: "diapasonViewDoor",
  storage: "diapasonViewStorage",
  gate: "diapasonViewGate",
  sanctuary: "diapasonViewSanctuary",
};

const CLOSED_SIDES = { est: false, ouest: false };

export default function DiapasonGame({ room, me, isHost, players, t, lang, onFinish }) {
  const [phase, setPhase] = useState("intro"); // intro -> playing -> success
  const [roles, setRoles] = useState({ est: null, ouest: null });
  const [puzzle, setPuzzle] = useState(null);
  const [selected, setSelected] = useState([]);
  const [channelReady, setChannelReady] = useState(false);
  const [viewpointKey, setViewpointKey] = useState("entrance");
  const [dialValues, setDialValues] = useState([0, 0, 0]);
  const [lockValues, setLockValues] = useState([0, 0, 0, 0]);
  const [lampLit, setLampLit] = useState(false);
  // Progression PARTAGÉE des 3 épreuves : { est, ouest } -> true dès que ce
  // siège a réussi SA moitié de l'épreuve. Épreuve suivante débloquée dès
  // que les deux valent true.
  const [ch1Open, setCh1Open] = useState(CLOSED_SIDES); // "Le Réveil" (portes)
  const [ch2Open, setCh2Open] = useState(CLOSED_SIDES); // "La Clé" (grilles)
  const [ch3Open, setCh3Open] = useState(CLOSED_SIDES); // "Le Cadenas" (final)
  // Progression PRIVÉE (jamais restaurée après un rechargement, comme le
  // reste de l'état privé de ce jeu — voir la resynchronisation plus bas).
  const [myDoorLocked, setMyDoorLocked] = useState(false);
  const [myKeyFound, setMyKeyFound] = useState(null); // symbole trouvé, ou null
  const [myGateOpen, setMyGateOpen] = useState(false);
  const [myLockSubmitted, setMyLockSubmitted] = useState(false);
  const [wrongShake, setWrongShake] = useState(false);
  const [examine, setExamine] = useState(null);
  const [myGain, setMyGain] = useState(0);

  const channelRef = useRef(null);
  const autoStartedRef = useRef(false);
  const restoredRef = useRef(false);
  const savedResultRef = useRef(false);
  const shakeTimerRef = useRef(null);
  const stateRef = useRef({ roles, puzzle, ch1Open, ch2Open, ch3Open });

  useEffect(() => {
    stateRef.current = { roles, puzzle, ch1Open, ch2Open, ch3Open };
  }, [roles, puzzle, ch1Open, ch2Open, ch3Open]);

  useEffect(() => {
    const ch = supabase.channel("diapason_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "match_start" }, ({ payload }) => {
      setRoles({ est: payload.roleEst, ouest: payload.roleOuest });
      setPuzzle({
        estDoorCode: payload.estDoorCode, ouestDoorCode: payload.ouestDoorCode,
        estKeySpot: payload.estKeySpot, ouestKeySpot: payload.ouestKeySpot,
        estLockCode: payload.estLockCode, ouestLockCode: payload.ouestLockCode,
      });
      setPhase("playing");
      setCh1Open(CLOSED_SIDES); setCh2Open(CLOSED_SIDES); setCh3Open(CLOSED_SIDES);
      setMyDoorLocked(false); setMyKeyFound(null); setMyGateOpen(false); setMyLockSubmitted(false);
      setDialValues([0, 0, 0]); setLockValues([0, 0, 0, 0]);
      setLampLit(false);
      setViewpointKey("entrance");
      setExamine(null);
      setMyGain(0);
      savedResultRef.current = false;
      if (isHost) {
        saveGameState(room.id, "diapason", {
          phase: "playing", roleEst: payload.roleEst, roleOuest: payload.roleOuest,
          estDoorCode: payload.estDoorCode, ouestDoorCode: payload.ouestDoorCode,
          estKeySpot: payload.estKeySpot, ouestKeySpot: payload.ouestKeySpot,
          estLockCode: payload.estLockCode, ouestLockCode: payload.ouestLockCode,
          ch1Open: CLOSED_SIDES, ch2Open: CLOSED_SIDES, ch3Open: CLOSED_SIDES,
        });
      }
    });

    ch.on("broadcast", { event: "door_open" }, ({ payload }) => {
      setCh1Open((prev) => {
        const next = { ...prev, [payload.side]: true };
        if (isHost) {
          const s = stateRef.current;
          saveGameState(room.id, "diapason", {
            phase: "playing",
            roleEst: s.roles.est, roleOuest: s.roles.ouest,
            estDoorCode: s.puzzle?.estDoorCode, ouestDoorCode: s.puzzle?.ouestDoorCode,
            estKeySpot: s.puzzle?.estKeySpot, ouestKeySpot: s.puzzle?.ouestKeySpot,
            estLockCode: s.puzzle?.estLockCode, ouestLockCode: s.puzzle?.ouestLockCode,
            ch1Open: next, ch2Open: s.ch2Open, ch3Open: s.ch3Open,
          });
        }
        return next;
      });
    });

    ch.on("broadcast", { event: "gate_open" }, ({ payload }) => {
      setCh2Open((prev) => {
        const next = { ...prev, [payload.side]: true };
        if (isHost) {
          const s = stateRef.current;
          saveGameState(room.id, "diapason", {
            phase: "playing",
            roleEst: s.roles.est, roleOuest: s.roles.ouest,
            estDoorCode: s.puzzle?.estDoorCode, ouestDoorCode: s.puzzle?.ouestDoorCode,
            estKeySpot: s.puzzle?.estKeySpot, ouestKeySpot: s.puzzle?.ouestKeySpot,
            estLockCode: s.puzzle?.estLockCode, ouestLockCode: s.puzzle?.ouestLockCode,
            ch1Open: s.ch1Open, ch2Open: next, ch3Open: s.ch3Open,
          });
        }
        return next;
      });
    });

    ch.on("broadcast", { event: "lock_open" }, ({ payload }) => {
      setCh3Open((prev) => {
        const next = { ...prev, [payload.side]: true };
        const done = next.est && next.ouest;
        if (done) setPhase((p) => (p === "playing" ? "success" : p));
        if (isHost) {
          const s = stateRef.current;
          saveGameState(room.id, "diapason", {
            phase: done ? "success" : "playing",
            roleEst: s.roles.est, roleOuest: s.roles.ouest,
            estDoorCode: s.puzzle?.estDoorCode, ouestDoorCode: s.puzzle?.ouestDoorCode,
            estKeySpot: s.puzzle?.estKeySpot, ouestKeySpot: s.puzzle?.ouestKeySpot,
            estLockCode: s.puzzle?.estLockCode, ouestLockCode: s.puzzle?.ouestLockCode,
            ch1Open: s.ch1Open, ch2Open: s.ch2Open, ch3Open: next,
          });
        }
        return next;
      });
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setChannelReady(true);
        // Resynchronisation : une partie en cours (rechargement de page) est
        // restaurée immédiatement — seule la progression PRIVÉE de chaque
        // joueur (lampe allumée, position des cadrans, clé trouvée…) repart
        // de zéro, le canal Supabase ne pouvant persister que l'état
        // PARTAGÉ. Rejouer son propre coup déjà validé est sans danger
        // (idempotent : le siège est déjà à `true` côté partagé).
        if (!restoredRef.current) {
          restoredRef.current = true;
          const saved = readGameState(room, "diapason");
          if (saved) {
            setRoles({ est: saved.roleEst, ouest: saved.roleOuest });
            setPuzzle({
              estDoorCode: saved.estDoorCode, ouestDoorCode: saved.ouestDoorCode,
              estKeySpot: saved.estKeySpot, ouestKeySpot: saved.ouestKeySpot,
              estLockCode: saved.estLockCode, ouestLockCode: saved.ouestLockCode,
            });
            setCh1Open(saved.ch1Open || CLOSED_SIDES);
            setCh2Open(saved.ch2Open || CLOSED_SIDES);
            setCh3Open(saved.ch3Open || CLOSED_SIDES);
            setPhase(saved.phase);
            autoStartedRef.current = true;
          }
        }
      }
    });

    return () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  function startMatch(pRow1, pRow2) {
    const p1 = { id: pRow1.profile_id, username: pRow1.profiles?.username, avatar: pRow1.profiles?.avatar };
    const p2 = { id: pRow2.profile_id, username: pRow2.profiles?.username, avatar: pRow2.profiles?.avatar };
    const [roleEst, roleOuest] = Math.random() < 0.5 ? [p1, p2] : [p2, p1];
    const { estDoorCode, ouestDoorCode, estKeySpot, ouestKeySpot, estLockCode, ouestLockCode } = genProloguePuzzle();
    channelRef.current.send({
      type: "broadcast",
      event: "match_start",
      payload: { roleEst, roleOuest, estDoorCode, ouestDoorCode, estKeySpot, ouestKeySpot, estLockCode, ouestLockCode },
    });
  }

  // Démarrage auto si le salon compte exactement 2 joueurs (même convention
  // que Puissance 4 / Petits Chevaux / Échos).
  useEffect(() => {
    if (!isHost || phase !== "intro" || autoStartedRef.current || !channelReady) return;
    if (players.length === 2) {
      autoStartedRef.current = true;
      startMatch(players[0], players[1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, channelReady, players.length]);

  function toggleSelect(pid) {
    setSelected((prev) => {
      if (prev.includes(pid)) return prev.filter((x) => x !== pid);
      if (prev.length >= 2) return prev;
      return [...prev, pid];
    });
  }
  function confirmPick() {
    if (selected.length !== 2 || !channelReady) return;
    const chosen = selected.map((pid) => players.find((p) => p.profile_id === pid)).filter(Boolean);
    if (chosen.length !== 2) return;
    startMatch(chosen[0], chosen[1]);
  }

  const amEst = !!(roles.est && me.id === roles.est.id);
  const amOuest = !!(roles.ouest && me.id === roles.ouest.id);
  const isPlayer = amEst || amOuest;
  const mySide = amEst ? "est" : amOuest ? "ouest" : null;
  const needsPick = players.length > 2;

  const myDoorCode = puzzle ? (mySide === "est" ? puzzle.estDoorCode : puzzle.ouestDoorCode) : null;
  const otherCode = puzzle ? (mySide === "est" ? puzzle.ouestDoorCode : puzzle.estDoorCode) : null;
  const myKeySpot = puzzle ? (mySide === "est" ? puzzle.estKeySpot : puzzle.ouestKeySpot) : null;
  const otherKeySpot = puzzle ? (mySide === "est" ? puzzle.ouestKeySpot : puzzle.estKeySpot) : null;
  const myLockCode = puzzle ? (mySide === "est" ? puzzle.estLockCode : puzzle.ouestLockCode) : null;
  const otherLockCode = puzzle ? (mySide === "est" ? puzzle.ouestLockCode : puzzle.estLockCode) : null;

  // Épreuve courante, dérivée de la progression PARTAGÉE (jamais un état à
  // part : impossible que ça diverge de ch1Open/ch2Open/ch3Open).
  const ch1Done = ch1Open.est && ch1Open.ouest;
  const ch2Done = ch2Open.est && ch2Open.ouest;
  const ch3Done = ch3Open.est && ch3Open.ouest;
  const chapter = !ch1Done ? 1 : !ch2Done ? 2 : !ch3Done ? 3 : 4;

  // Lieux accessibles à la navigation ⬅➡, en fonction de l'épreuve atteinte.
  const VIEWPOINTS_BY_CHAPTER = { 1: ["entrance", "door"], 2: ["storage", "gate"], 3: ["sanctuary"] };
  const availableViewpoints = [
    ...VIEWPOINTS_BY_CHAPTER[1],
    ...(chapter >= 2 ? VIEWPOINTS_BY_CHAPTER[2] : []),
    ...(chapter >= 3 ? VIEWPOINTS_BY_CHAPTER[3] : []),
  ];
  const vpIdx = Math.max(0, availableViewpoints.indexOf(viewpointKey));
  const hasMoreAhead = vpIdx < availableViewpoints.length - 1;

  function goViewpoint(dir) {
    const next = vpIdx + dir;
    if (next < 0 || next >= availableViewpoints.length) return;
    setViewpointKey(availableViewpoints[next]);
    setExamine(null);
  }

  function cycleDial(i, dir) {
    if (myDoorLocked) return;
    setDialValues((prev) => {
      const next = prev.slice();
      next[i] = (next[i] + dir + SYMBOLS.length) % SYMBOLS.length;
      return next;
    });
  }

  function submitDoor() {
    if (!myDoorCode || myDoorLocked) return;
    const ok = dialValues.every((v, i) => SYMBOLS[v] === myDoorCode[i]);
    if (ok) {
      setMyDoorLocked(true);
      channelRef.current?.send({ type: "broadcast", event: "door_open", payload: { side: mySide } });
    } else {
      setWrongShake(true);
      shakeTimerRef.current = setTimeout(() => setWrongShake(false), 420);
    }
  }

  // Épreuve 2 "La Clé" : chercher la bonne cachette (décrite par le
  // partenaire via le sceau de SA grille), puis déverrouiller SA propre
  // grille avec la clé trouvée.
  function trySpot(sym) {
    if (myKeyFound) { setExamine("spot-already"); return; }
    if (sym === myKeySpot) {
      setMyKeyFound(sym);
      setExamine("spot-found");
    } else {
      setExamine("spot-empty");
      setWrongShake(true);
      shakeTimerRef.current = setTimeout(() => setWrongShake(false), 420);
    }
  }
  function tryGate() {
    if (!myKeyFound) { setExamine("gate-locked"); return; }
    if (myGateOpen) { setExamine("gate-open-already"); return; }
    setMyGateOpen(true);
    channelRef.current?.send({ type: "broadcast", event: "gate_open", payload: { side: mySide } });
    setExamine("gate-open");
  }

  // Épreuve 3 "Le Cadenas" : même mécanique que la porte scellée (épreuve
  // 1), mais 4 symboles au lieu de 3, dans le sanctuaire final.
  function cycleLock(i, dir) {
    if (myLockSubmitted) return;
    setLockValues((prev) => {
      const next = prev.slice();
      next[i] = (next[i] + dir + SYMBOLS.length) % SYMBOLS.length;
      return next;
    });
  }
  function submitLock() {
    if (!myLockCode || myLockSubmitted) return;
    const ok = lockValues.every((v, i) => SYMBOLS[v] === myLockCode[i]);
    if (ok) {
      setMyLockSubmitted(true);
      channelRef.current?.send({ type: "broadcast", event: "lock_open", payload: { side: mySide } });
    } else {
      setWrongShake(true);
      shakeTimerRef.current = setTimeout(() => setWrongShake(false), 420);
    }
  }

  // Sauvegarde du résultat (une fois), points partagés entre les deux joueurs.
  useEffect(() => {
    if (phase !== "success" || savedResultRef.current || !isPlayer) return;
    savedResultRef.current = true;
    setMyGain(BASE_POINTS);
    (async () => {
      try {
        await supabase.from("game_results").insert({ room_id: room.id, profile_id: me.id, game_id: "diapason", points: BASE_POINTS });
        await supabase.rpc("add_points", { p_room: room.id, p_delta: BASE_POINTS });
      } catch (e) {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function backToLobby() {
    await resetRoomToLobby(room.id);
    onFinish && onFinish();
  }

  // "Rejouer" : relance le Prologue avec les 2 mêmes joueurs, nouvelles
  // épreuves (codes/cachettes redistribués).
  function rejouer() {
    if (!isHost || !roles.est || !roles.ouest) return;
    const [roleEst, roleOuest] = Math.random() < 0.5 ? [roles.est, roles.ouest] : [roles.ouest, roles.est];
    const { estDoorCode, ouestDoorCode, estKeySpot, ouestKeySpot, estLockCode, ouestLockCode } = genProloguePuzzle();
    channelRef.current.send({
      type: "broadcast", event: "match_start",
      payload: { roleEst, roleOuest, estDoorCode, ouestDoorCode, estKeySpot, ouestKeySpot, estLockCode, ouestLockCode },
    });
  }

  function examineText() {
    if (examine === "dark-search") return t("diapasonSearchDark");
    if (examine === "switch-found") return t("diapasonSwitchFound");
    if (!lampLit) return t("diapasonTooDark");
    if (examine === "tube") return t("diapasonExamineTube");
    if (examine === "door") return t("diapasonExamineDoor");
    if (examine === "plaque") return t("diapasonExaminePlaque");
    if (examine === "spot-found") return t("diapasonKeySpotFound");
    if (examine === "spot-empty") return t("diapasonKeySpotEmpty");
    if (examine === "spot-already") return t("diapasonKeyCarrying");
    if (examine === "sigil") return t("diapasonExamineSigil");
    if (examine === "gate-locked") return t("diapasonGateLocked");
    if (examine === "gate-open") return t("diapasonGateOpenFlavor");
    if (examine === "gate-open-already") return t("diapasonMyGateOpen");
    if (examine === "lock") return t("diapasonExamineLock");
    if (examine === "tablet") return t("diapasonExamineTablet");
    return null;
  }

  function handleExamine(key) {
    if (key === "switch-found" && !lampLit) {
      setLampLit(true);
    }
    setExamine(key);
  }

  const accent = "#C9A24B";
  const storyLine = chapter === 1 ? t("diapasonStory") : chapter === 2 ? t("diapasonCh2Story") : t("diapasonCh3Story");
  const defaultHint =
    viewpointKey === "storage" ? t("diapasonKeyHint")
    : viewpointKey === "gate" ? t("diapasonSigilHint")
    : viewpointKey === "sanctuary" ? t("diapasonLockHint")
    : t("diapasonFindLight");

  return (
    <div className="panel" style={{ maxWidth: "min(880px, 94vw)" }}>
      <h1>{t("diapasonTitle")}</h1>

      {phase !== "playing" && (
        <Crossfade id={phase}>
          {phase === "intro" && (
            <div>
              {players.length < 2 ? (
                <p className="muted">{t("diapasonNotEnough")}</p>
              ) : !needsPick ? (
                <p className="muted">{t("diapasonStarting")}</p>
              ) : isHost ? (
                <div>
                  <p className="hint">{t("diapasonPickHint")}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0 16px" }}>
                    {players.map((p) => {
                      const on = selected.includes(p.profile_id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggleSelect(p.profile_id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 99,
                            border: `2px solid ${on ? "var(--p3)" : "var(--line)"}`,
                            background: on ? "rgba(182,240,76,.12)" : "rgba(255,255,255,.04)",
                            fontWeight: 700, fontSize: 13, color: "var(--ink)",
                          }}
                        >
                          <span>{p.profiles?.avatar}</span><span>{p.profiles?.username}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button className="btn" disabled={selected.length !== 2} onClick={confirmPick}>{t("diapasonPickConfirm")}</button>
                </div>
              ) : (
                <p className="muted">{t("diapasonWaitPick")}</p>
              )}
            </div>
          )}

          {phase === "success" && (
            <div>
              <h2 style={{ fontSize: 22 }}>{t("diapasonEndTitle")}</h2>
              <p className="hint">{t("diapasonEndText")}</p>
              {isPlayer && (
                <p style={{ fontWeight: 800 }}>
                  {t("peYourGain")} <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>+{myGain} {t("pts")}</span>
                </p>
              )}
              {isHost ? (
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button className="btn" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={rejouer}>🔁 {t("c4Rejouer")}</button>
                <button className="btn ghost" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={backToLobby}>{t("backLounge")}</button>
              </div>
            ) : <p className="muted">{t("hostBrings")}</p>}
            </div>
          )}
        </Crossfade>
      )}

      {/* Rendu stable, JAMAIS enveloppé dans le fondu enchaîné : un canvas
          WebGL ne doit pas être monté deux fois pendant une transition. */}
      {phase === "playing" && puzzle && (
        <div>
          {isPlayer && (
            <div className="diapason-role-badge">
              🕯️ {amEst ? t("diapasonRoleEst") : t("diapasonRoleOuest")}
            </div>
          )}
          <p className="hint" style={{ marginTop: 6 }}>{storyLine}</p>
          <div className="diapason-comm-banner">{t("diapasonCommunicate")}</div>

          {!isPlayer ? (
            <p className="muted" style={{ marginTop: 14 }}>{t("echoesSpectatorNote")}</p>
          ) : (
            <>
              <div className="diapason-stage-wrap">
                <RoomIllustration
                  side={mySide}
                  viewpoint={viewpointKey}
                  dialValues={dialValues}
                  otherCode={otherCode}
                  lockValues={lockValues}
                  otherLockCode={otherLockCode}
                  foundKeySpot={myKeyFound}
                  otherKeySpot={otherKeySpot}
                  keyFound={!!myKeyFound}
                  gateGlow={myGateOpen}
                  lockGlow={myLockSubmitted}
                  accent={accent}
                  lampLit={lampLit}
                  doorGlow={myDoorLocked}
                  onExamine={handleExamine}
                  onSpotClick={trySpot}
                  onGateClick={tryGate}
                />
                <div className="diapason-vignette" />
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "center", margin: "12px 0", flexWrap: "wrap" }}>
                {vpIdx > 0 && (
                  <button className="btn ghost" style={{ width: "auto", padding: "8px 16px", fontSize: 13 }} onClick={() => goViewpoint(-1)}>
                    ⬅ {t(VIEWPOINT_LABEL_KEY[availableViewpoints[vpIdx - 1]])}
                  </button>
                )}
                {vpIdx < availableViewpoints.length - 1 && (
                  <button className="btn ghost" style={{ width: "auto", padding: "8px 16px", fontSize: 13 }} onClick={() => goViewpoint(1)}>
                    {t(VIEWPOINT_LABEL_KEY[availableViewpoints[vpIdx + 1]])} ➡
                  </button>
                )}
              </div>

              <p className="hint diapason-examine-box">{examine ? examineText() : defaultHint}</p>
              {hasMoreAhead && <p className="muted" style={{ textAlign: "center", fontSize: 12, marginTop: -4 }}>{t("diapasonMoreAhead")}</p>}

              {lampLit && viewpointKey === "door" && (
                <div style={{ marginTop: 4 }}>
                  <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{t("diapasonDialsHint")}</p>

                  <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 10 }}>
                    {otherCode.map((sym, i) => (
                      <span key={i} className="diapason-symbol-chip">{t(symbolLabelKey(sym))}</span>
                    ))}
                  </div>

                  <div className={"diapason-dial-row" + (wrongShake ? " shake" : "")}>
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="diapason-dial-control">
                        <button className="btn ghost" style={{ width: "auto", padding: "6px 10px" }} onClick={() => cycleDial(i, -1)} disabled={myDoorLocked}>◀</button>
                        <span className="diapason-dial-label">{t(symbolLabelKey(SYMBOLS[dialValues[i]]))}</span>
                        <button className="btn ghost" style={{ width: "auto", padding: "6px 10px" }} onClick={() => cycleDial(i, 1)} disabled={myDoorLocked}>▶</button>
                      </div>
                    ))}
                  </div>

                  <div style={{ textAlign: "center", marginTop: 14 }}>
                    {myDoorLocked ? (
                      <p className="muted">{t("diapasonMyDoorOpen")}</p>
                    ) : (
                      <button className="btn" style={{ width: "auto", padding: "12px 26px" }} onClick={submitDoor}>
                        {t("diapasonSubmit")}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {viewpointKey === "storage" && myKeyFound && (
                <p className="diapason-comm-banner" style={{ marginTop: 10 }}>🔑 {t("diapasonKeyCarrying")}</p>
              )}

              {viewpointKey === "gate" && (
                <p className="muted" style={{ textAlign: "center", fontSize: 13, marginTop: 4 }}>
                  {myGateOpen ? t("diapasonMyGateOpen") : myKeyFound ? "🔑 " + t("diapasonKeyCarrying") : null}
                </p>
              )}

              {lampLit && viewpointKey === "sanctuary" && (
                <div style={{ marginTop: 4 }}>
                  <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{t("diapasonLockHint")}</p>

                  <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 10 }}>
                    {otherLockCode.map((sym, i) => (
                      <span key={i} className="diapason-symbol-chip">{t(symbolLabelKey(sym))}</span>
                    ))}
                  </div>

                  <div className={"diapason-dial-row" + (wrongShake ? " shake" : "")}>
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="diapason-dial-control">
                        <button className="btn ghost" style={{ width: "auto", padding: "6px 10px" }} onClick={() => cycleLock(i, -1)} disabled={myLockSubmitted}>◀</button>
                        <span className="diapason-dial-label">{t(symbolLabelKey(SYMBOLS[lockValues[i]]))}</span>
                        <button className="btn ghost" style={{ width: "auto", padding: "6px 10px" }} onClick={() => cycleLock(i, 1)} disabled={myLockSubmitted}>▶</button>
                      </div>
                    ))}
                  </div>

                  <div style={{ textAlign: "center", marginTop: 14 }}>
                    {myLockSubmitted ? (
                      <p className="muted">{t("diapasonMyLockOpen")}</p>
                    ) : (
                      <button className="btn" style={{ width: "auto", padding: "12px 26px" }} onClick={submitLock}>
                        {t("diapasonSubmitLock")}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
