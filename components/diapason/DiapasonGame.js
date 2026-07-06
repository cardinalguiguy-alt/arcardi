"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Crossfade from "@/components/Crossfade";
import DiapasonScene from "./DiapasonScene";
import { genProloguePuzzle } from "./puzzle";
import { SYMBOLS } from "./constants";

/* ==========================================================================
   DIAPASON — Prologue "Le Réveil" (jeu phare narratif coopératif d'ARCARDI)
   ==========================================================================
   Pattern n°3 (coopératif asymétrique, sans arbitre), même conventions
   qu'Échos :
     - "match_start" : l'hôte génère l'énigme ENTIÈRE (rôles + code des deux
       portes) et la diffuse une fois pour toutes ; les deux clients adoptent
       exactement les mêmes données, seul le RENDU diffère selon le rôle.
     - "door_open" : diffusé par le joueur qui vient d'ouvrir SA porte
       (vérifiée localement) ; les deux clients l'appliquent (self:true) et
       chacun calcule de son côté si les deux portes sont ouvertes.

   Aucun chronomètre dans ce prologue (volontaire) : c'est une scène
   d'ouverture atmosphérique, pas une épreuve contre la montre.

   Règle Supabase respectée : seule la RÉSOLUTION du puzzle transite par le
   réseau (rôles, code des portes, porte ouverte/fermée). Tout le reste —
   la caméra, le vacillement de la lampe, l'animation des cadrans — est
   calculé en local par chaque client et n'est jamais synchronisé.
   ========================================================================== */

const VIEWPOINTS = {
  entrance: { position: [1.0, 1.6, 1.6], lookAt: [3.4, 1.5, -0.5] },
  door: { position: [-0.4, 1.6, -1.2], lookAt: [-0.6, 1.5, -3.85] },
};

const BASE_POINTS = 15;

function symbolLabelKey(sym) {
  return "diapasonSymbol" + sym.charAt(0).toUpperCase() + sym.slice(1);
}

export default function DiapasonGame({ room, me, isHost, players, t, lang, onFinish }) {
  const [phase, setPhase] = useState("intro"); // intro -> playing -> success
  const [roles, setRoles] = useState({ est: null, ouest: null });
  const [puzzle, setPuzzle] = useState(null);
  const [selected, setSelected] = useState([]);
  const [channelReady, setChannelReady] = useState(false);
  const [viewpointKey, setViewpointKey] = useState("entrance");
  const [dialValues, setDialValues] = useState([0, 0, 0]);
  const [doorOpen, setDoorOpen] = useState({ est: false, ouest: false });
  const [myDoorLocked, setMyDoorLocked] = useState(false);
  const [wrongShake, setWrongShake] = useState(false);
  const [examine, setExamine] = useState(null); // "tube" | "door" | "plaque" | null
  const [myGain, setMyGain] = useState(0);

  const channelRef = useRef(null);
  const autoStartedRef = useRef(false);
  const savedResultRef = useRef(false);
  const shakeTimerRef = useRef(null);

  useEffect(() => {
    const ch = supabase.channel("diapason_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "match_start" }, ({ payload }) => {
      setRoles({ est: payload.roleEst, ouest: payload.roleOuest });
      setPuzzle({ estDoorCode: payload.estDoorCode, ouestDoorCode: payload.ouestDoorCode });
      setPhase("playing");
      setDoorOpen({ est: false, ouest: false });
      setMyDoorLocked(false);
      setDialValues([0, 0, 0]);
      setViewpointKey("entrance");
      setExamine(null);
      setMyGain(0);
      savedResultRef.current = false;
    });

    ch.on("broadcast", { event: "door_open" }, ({ payload }) => {
      setDoorOpen((prev) => {
        const next = { ...prev, [payload.side]: true };
        if (next.est && next.ouest) {
          setPhase((p) => (p === "playing" ? "success" : p));
        }
        return next;
      });
    });

    ch.subscribe((status) => { if (status === "SUBSCRIBED") setChannelReady(true); });

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
    const { estDoorCode, ouestDoorCode } = genProloguePuzzle();
    channelRef.current.send({
      type: "broadcast",
      event: "match_start",
      payload: { roleEst, roleOuest, estDoorCode, ouestDoorCode },
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
    await supabase.from("rooms").update({ status: "lobby", current_game: null }).eq("id", room.id);
    onFinish && onFinish();
  }

  function examineText() {
    if (examine === "tube") return t("diapasonExamineTube");
    if (examine === "door") return t("diapasonExamineDoor");
    if (examine === "plaque") return t("diapasonExaminePlaque");
    return null;
  }

  const accent = "#C9A24B";

  return (
    <div className="panel" style={{ maxWidth: 760 }}>
      <h1>{t("diapasonTitle")}</h1>

      <Crossfade id={phase === "playing" ? "playing" : phase}>
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

        {phase === "playing" && puzzle && (
          <div>
            {isPlayer && (
              <div className="diapason-role-badge">
                🕯️ {amEst ? t("diapasonRoleEst") : t("diapasonRoleOuest")}
              </div>
            )}
            <p className="hint" style={{ marginTop: 6 }}>{t("diapasonStory")}</p>
            <div className="diapason-comm-banner">{t("diapasonCommunicate")}</div>

            {!isPlayer ? (
              <p className="muted" style={{ marginTop: 14 }}>{t("echoesSpectatorNote")}</p>
            ) : (
              <>
                <div className="diapason-stage-wrap">
                  <DiapasonScene
                    side={mySide}
                    dialValues={dialValues}
                    otherCode={otherCode}
                    accent={accent}
                    viewpoint={VIEWPOINTS[viewpointKey]}
                    onExamine={setExamine}
                    doorGlow={myDoorLocked}
                  />
                  <div className="diapason-vignette" />
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "center", margin: "12px 0" }}>
                  <button
                    className="btn ghost"
                    style={{ width: "auto", padding: "8px 16px", fontSize: 13 }}
                    onClick={() => setViewpointKey("entrance")}
                    disabled={viewpointKey === "entrance"}
                  >
                    ⬅ {t("diapasonViewEntrance")}
                  </button>
                  <button
                    className="btn ghost"
                    style={{ width: "auto", padding: "8px 16px", fontSize: 13 }}
                    onClick={() => setViewpointKey("door")}
                    disabled={viewpointKey === "door"}
                  >
                    {t("diapasonViewDoor")} ➡
                  </button>
                </div>

                {examine && <p className="hint diapason-examine-box">{examineText()}</p>}

                {viewpointKey === "door" && (
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
              </>
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
            {isHost ? <button className="btn" onClick={backToLobby}>{t("backLounge")}</button> : <p className="muted">{t("hostBrings")}</p>}
          </div>
        )}
      </Crossfade>
    </div>
  );
}
