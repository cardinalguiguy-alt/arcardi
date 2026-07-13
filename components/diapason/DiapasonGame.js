"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby, recordMatchResult } from "@/lib/gameSync";
import { playNoteSequence } from "@/lib/sfx";
import Crossfade from "@/components/Crossfade";
import RoomIllustration from "./RoomIllustration";
import { genProloguePuzzle } from "./puzzle";
import { SYMBOLS, INTERVALS, INTERVAL_SEMITONES, INTERVAL_BASE_HZ, MAX_CORDES } from "./constants";

/* ==========================================================================
   DIAPASON — Prologue "Le Réveil" (jeu phare narratif coopératif d'ARCARDI)
   ==========================================================================
   Pattern n°3 (coopératif asymétrique, sans arbitre), mêmes conventions
   qu'Échos :
     - "match_start" : l'hôte génère les TROIS épreuves ENTIÈRES et les
       diffuse une fois pour toutes ; les deux clients adoptent exactement
       les mêmes données, seul le RENDU diffère selon le rôle.
     - "door_open" / "box_open" / "lock_open" : chacun diffusé par le joueur
       qui vient de réussir SA moitié de l'épreuve en cours (vérifiée
       localement) ; les deux clients l'appliquent (self:true) et chacun
       calcule de son côté si les deux moitiés sont réunies.
     - "life_lost" : une mauvaise tentative CASSE UNE CORDE partagée (vies).
       Diffusée par l'auteur de la faute, appliquée partout (−1). À zéro
       corde, l'instrument est brisé → échec. Empêche d'enchaîner les essais
       au hasard sur les cadrans / les intervalles.
     - "interval_play" : la manivelle de l'épreuve 2. Quand JE tourne MA
       manivelle, le son de MON accord ne se joue QUE chez mon partenaire
       (asymétrie sonore) : c'est lui l'oreille, il me dit lequel c'est.

   Trois épreuves, chacune avec une INTERACTION DE DÉCOR propre :
     1. "Le Réveil"  (entrance + door)  : trouver l'INTERRUPTEUR, allumer la
        lampe, puis régler les 3 cadrans de la porte sur le code décrit par
        l'autre.
     2. "L'Accord"   (musicroom)        : la clé est enfermée dans une BOÎTE
        À MUSIQUE. On tourne la MANIVELLE → l'accord se joue chez le
        partenaire, qui l'identifie ; on valide l'intervalle → la boîte
        s'ouvre. (Épreuve entièrement sonore, cœur "diapason" du jeu.)
     3. "Le Cadenas" (sanctuary)        : allumer le CANDÉLABRE pour rendre
        lisible la tablette gravée (code du partenaire), puis régler les 4
        anneaux du cadenas final.

   Règle Supabase respectée : réutilise rooms / recordMatchResult ;
   game_id = "diapason". Aucune manip Supabase.
   ========================================================================== */


function symbolLabelKey(sym) {
  return "diapasonSymbol" + sym.charAt(0).toUpperCase() + sym.slice(1);
}
function intervalLabelKey(iv) {
  return "diapasonInterval" + iv.charAt(0).toUpperCase() + iv.slice(1);
}

const VIEWPOINT_LABEL_KEY = {
  entrance: "diapasonViewEntrance",
  door: "diapasonViewDoor",
  musicroom: "diapasonViewMusicroom",
  sanctuary: "diapasonViewSanctuary",
};

const CLOSED_SIDES = { est: false, ouest: false };

export default function DiapasonGame({ room, me, isHost, players, t, lang, onFinish }) {
  const [phase, setPhase] = useState("intro"); // intro -> playing -> success | failure
  const [roles, setRoles] = useState({ est: null, ouest: null });
  const [puzzle, setPuzzle] = useState(null);
  const [selected, setSelected] = useState([]);
  const [channelReady, setChannelReady] = useState(false);
  const [viewpointKey, setViewpointKey] = useState("entrance");
  const [dialValues, setDialValues] = useState([0, 0, 0]);
  const [lockValues, setLockValues] = useState([0, 0, 0, 0]);
  const [lampLit, setLampLit] = useState(false);
  const [candelabraLit, setCandelabraLit] = useState(false); // épreuve 3, décor
  // Progression PARTAGÉE des 3 épreuves : { est, ouest } -> true dès que ce
  // siège a réussi SA moitié. Épreuve suivante débloquée quand les deux valent true.
  const [ch1Open, setCh1Open] = useState(CLOSED_SIDES); // "Le Réveil" (portes)
  const [ch2Open, setCh2Open] = useState(CLOSED_SIDES); // "L'Accord" (boîtes à musique)
  const [ch3Open, setCh3Open] = useState(CLOSED_SIDES); // "Le Cadenas" (final)
  const [cordes, setCordes] = useState(MAX_CORDES);      // vies PARTAGÉES
  // Progression PRIVÉE (jamais restaurée après un rechargement).
  const [myDoorLocked, setMyDoorLocked] = useState(false);
  const [myBoxOpen, setMyBoxOpen] = useState(false);
  const [myLockSubmitted, setMyLockSubmitted] = useState(false);
  const [wrongShake, setWrongShake] = useState(false);
  const [examine, setExamine] = useState(null);
  const [heardPulse, setHeardPulse] = useState(0); // anim "j'entends l'accord"
  const [myWin, setMyWin] = useState(false);

  const channelRef = useRef(null);
  const autoStartedRef = useRef(false);
  const restoredRef = useRef(false);
  const savedResultRef = useRef(false);
  const shakeTimerRef = useRef(null);
  const mySideRef = useRef(null);
  const stateRef = useRef({ roles, puzzle, ch1Open, ch2Open, ch3Open, cordes });

  useEffect(() => {
    stateRef.current = { roles, puzzle, ch1Open, ch2Open, ch3Open, cordes };
  }, [roles, puzzle, ch1Open, ch2Open, ch3Open, cordes]);

  function saveShared(patch) {
    const s = stateRef.current;
    saveGameState(room.id, "diapason", {
      phase: "playing",
      roleEst: s.roles.est, roleOuest: s.roles.ouest,
      estDoorCode: s.puzzle?.estDoorCode, ouestDoorCode: s.puzzle?.ouestDoorCode,
      estBoxInterval: s.puzzle?.estBoxInterval, ouestBoxInterval: s.puzzle?.ouestBoxInterval,
      estLockCode: s.puzzle?.estLockCode, ouestLockCode: s.puzzle?.ouestLockCode,
      ch1Open: s.ch1Open, ch2Open: s.ch2Open, ch3Open: s.ch3Open, cordes: s.cordes,
      ...patch,
    });
  }

  // ---- Audio épreuve 2 : synthèse d'un intervalle (2 notes) via Web Audio ----
  function playInterval(interval) {
    const semis = INTERVAL_SEMITONES[interval];
    if (semis == null) return;
    const root = INTERVAL_BASE_HZ;
    const top = root * Math.pow(2, semis / 12);
    playNoteSequence(
      [
        { freq: root, atMs: 0, durMs: 520, type: "sine" },
        { freq: top, atMs: 380, durMs: 640, type: "sine" },
      ],
      { gain: 0.2 }
    );
  }

  useEffect(() => {
    const ch = supabase.channel("diapason_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "match_start" }, ({ payload }) => {
      setRoles({ est: payload.roleEst, ouest: payload.roleOuest });
      setPuzzle({
        estDoorCode: payload.estDoorCode, ouestDoorCode: payload.ouestDoorCode,
        estBoxInterval: payload.estBoxInterval, ouestBoxInterval: payload.ouestBoxInterval,
        estLockCode: payload.estLockCode, ouestLockCode: payload.ouestLockCode,
      });
      setPhase("playing");
      setCh1Open(CLOSED_SIDES); setCh2Open(CLOSED_SIDES); setCh3Open(CLOSED_SIDES);
      setCordes(MAX_CORDES);
      setMyDoorLocked(false); setMyBoxOpen(false); setMyLockSubmitted(false);
      setDialValues([0, 0, 0]); setLockValues([0, 0, 0, 0]);
      setLampLit(false); setCandelabraLit(false);
      setViewpointKey("entrance");
      setExamine(null);
      setMyWin(false);
      savedResultRef.current = false;
      if (isHost) {
        saveGameState(room.id, "diapason", {
          phase: "playing", roleEst: payload.roleEst, roleOuest: payload.roleOuest,
          estDoorCode: payload.estDoorCode, ouestDoorCode: payload.ouestDoorCode,
          estBoxInterval: payload.estBoxInterval, ouestBoxInterval: payload.ouestBoxInterval,
          estLockCode: payload.estLockCode, ouestLockCode: payload.ouestLockCode,
          ch1Open: CLOSED_SIDES, ch2Open: CLOSED_SIDES, ch3Open: CLOSED_SIDES, cordes: MAX_CORDES,
        });
      }
    });

    ch.on("broadcast", { event: "door_open" }, ({ payload }) => {
      setCh1Open((prev) => {
        const next = { ...prev, [payload.side]: true };
        if (isHost) saveShared({ ch1Open: next });
        return next;
      });
    });

    ch.on("broadcast", { event: "box_open" }, ({ payload }) => {
      setCh2Open((prev) => {
        const next = { ...prev, [payload.side]: true };
        if (isHost) saveShared({ ch2Open: next });
        return next;
      });
    });

    ch.on("broadcast", { event: "lock_open" }, ({ payload }) => {
      setCh3Open((prev) => {
        const next = { ...prev, [payload.side]: true };
        const done = next.est && next.ouest;
        if (done) setPhase((p) => (p === "playing" ? "success" : p));
        if (isHost) saveShared({ ch3Open: next, phase: done ? "success" : "playing" });
        return next;
      });
    });

    // Une corde se casse (mauvaise tentative). Le compteur descend d'exactement
    // 1 partout (self:true), l'auteur ne l'émet qu'une fois par faute.
    ch.on("broadcast", { event: "life_lost" }, () => {
      setCordes((prev) => {
        const next = Math.max(0, prev - 1);
        if (next <= 0) setPhase((p) => (p === "playing" ? "failure" : p));
        if (isHost) saveShared({ cordes: next, phase: next <= 0 ? "failure" : "playing" });
        return next;
      });
      setWrongShake(true);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = setTimeout(() => setWrongShake(false), 420);
    });

    // Manivelle de l'épreuve 2 : je reçois l'accord d'un partenaire dont c'est
    // MOI l'oreille -> je le joue localement (Web Audio).
    ch.on("broadcast", { event: "interval_play" }, ({ payload }) => {
      if (payload.listenSide && mySideRef.current === payload.listenSide) {
        playInterval(payload.interval);
        setHeardPulse((n) => n + 1);
      }
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setChannelReady(true);
        if (!restoredRef.current) {
          restoredRef.current = true;
          const saved = readGameState(room, "diapason");
          if (saved) {
            setRoles({ est: saved.roleEst, ouest: saved.roleOuest });
            setPuzzle({
              estDoorCode: saved.estDoorCode, ouestDoorCode: saved.ouestDoorCode,
              estBoxInterval: saved.estBoxInterval, ouestBoxInterval: saved.ouestBoxInterval,
              estLockCode: saved.estLockCode, ouestLockCode: saved.ouestLockCode,
            });
            setCh1Open(saved.ch1Open || CLOSED_SIDES);
            setCh2Open(saved.ch2Open || CLOSED_SIDES);
            setCh3Open(saved.ch3Open || CLOSED_SIDES);
            setCordes(saved.cordes == null ? MAX_CORDES : saved.cordes);
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
    const p = genProloguePuzzle();
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: { roleEst, roleOuest, ...p } });
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
  const otherSide = mySide === "est" ? "ouest" : "est";
  const needsPick = players.length > 2;

  useEffect(() => { mySideRef.current = mySide; }, [mySide]);

  const myDoorCode = puzzle ? (mySide === "est" ? puzzle.estDoorCode : puzzle.ouestDoorCode) : null;
  const otherCode = puzzle ? (mySide === "est" ? puzzle.ouestDoorCode : puzzle.estDoorCode) : null;
  const myBoxInterval = puzzle ? (mySide === "est" ? puzzle.estBoxInterval : puzzle.ouestBoxInterval) : null;
  const myLockCode = puzzle ? (mySide === "est" ? puzzle.estLockCode : puzzle.ouestLockCode) : null;
  const otherLockCode = puzzle ? (mySide === "est" ? puzzle.ouestLockCode : puzzle.estLockCode) : null;

  const ch1Done = ch1Open.est && ch1Open.ouest;
  const ch2Done = ch2Open.est && ch2Open.ouest;
  const ch3Done = ch3Open.est && ch3Open.ouest;
  const chapter = !ch1Done ? 1 : !ch2Done ? 2 : !ch3Done ? 3 : 4;

  const VIEWPOINTS_BY_CHAPTER = { 1: ["entrance", "door"], 2: ["musicroom"], 3: ["sanctuary"] };
  const availableViewpoints = VIEWPOINTS_BY_CHAPTER[Math.min(chapter, 3)] || [];
  const vpIdx = Math.max(0, availableViewpoints.indexOf(viewpointKey));

  // À chaque changement d'épreuve, recentrer la vue sur un lieu valide.
  useEffect(() => {
    if (phase !== "playing") return;
    if (!availableViewpoints.includes(viewpointKey)) {
      setViewpointKey(availableViewpoints[0] || "entrance");
      setExamine(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter, phase]);

  function goViewpoint(dir) {
    const next = vpIdx + dir;
    if (next < 0 || next >= availableViewpoints.length) return;
    setViewpointKey(availableViewpoints[next]);
    setExamine(null);
  }

  function loseLife() {
    channelRef.current?.send({ type: "broadcast", event: "life_lost", payload: {} });
  }

  // ---- Épreuve 1 : cadrans de la porte ----
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
      loseLife();
    }
  }

  // ---- Épreuve 2 : boîte à musique / intervalle ----
  // Je tourne MA manivelle -> l'accord se joue chez mon partenaire (lui l'oreille).
  function crankMyBox() {
    if (myBoxOpen || !myBoxInterval) return;
    channelRef.current?.send({ type: "broadcast", event: "interval_play", payload: { listenSide: otherSide, interval: myBoxInterval } });
  }
  function submitBox(guess) {
    if (myBoxOpen) return;
    if (guess === myBoxInterval) {
      setMyBoxOpen(true);
      channelRef.current?.send({ type: "broadcast", event: "box_open", payload: { side: mySide } });
    } else {
      loseLife();
    }
  }

  // ---- Épreuve 3 : cadenas final (révélé par le candélabre) ----
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
      loseLife();
    }
  }

  // Victoire/défaite ARCARDI (une fois), partagée entre les deux joueurs.
  useEffect(() => {
    if ((phase !== "success" && phase !== "failure") || savedResultRef.current || !isPlayer) return;
    savedResultRef.current = true;
    const won = phase === "success";
    setMyWin(won);
    recordMatchResult(room.id, won);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function backToLobby() {
    await resetRoomToLobby(room.id);
    onFinish && onFinish();
  }

  function rejouer() {
    if (!isHost || !roles.est || !roles.ouest) return;
    const [roleEst, roleOuest] = Math.random() < 0.5 ? [roles.est, roles.ouest] : [roles.ouest, roles.est];
    const p = genProloguePuzzle();
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: { roleEst, roleOuest, ...p } });
  }

  function examineText() {
    if (examine === "dark-search") return t("diapasonSearchDark");
    if (examine === "switch-found") return t("diapasonSwitchFound");
    if (!lampLit && (examine === "tube" || examine === "door" || examine === "plaque")) return t("diapasonTooDark");
    if (examine === "tube") return t("diapasonExamineTube");
    if (examine === "door") return t("diapasonExamineDoor");
    if (examine === "plaque") return t("diapasonExaminePlaque");
    if (examine === "candelabra-found") return t("diapasonCandelabraFound");
    if (examine === "lock") return t("diapasonExamineLock");
    if (examine === "tablet") return candelabraLit ? t("diapasonExamineTablet") : t("diapasonTabletDark");
    return null;
  }

  function handleExamine(key) {
    if (key === "switch-found" && !lampLit) setLampLit(true);
    if (key === "candelabra-found" && !candelabraLit) setCandelabraLit(true);
    setExamine(key);
  }

  const accent = "#C9A24B";
  const storyLine = chapter === 1 ? t("diapasonStory") : chapter === 2 ? t("diapasonCh2Story") : t("diapasonCh3Story");
  const defaultHint =
    chapter === 2 ? t("diapasonBoxHint")
    : viewpointKey === "sanctuary" ? (candelabraLit ? t("diapasonLockHint") : t("diapasonCandelabraHint"))
    : t("diapasonFindLight");

  const showDiorama = chapter !== 2;

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

          {phase === "failure" && (
            <div>
              <h2 style={{ fontSize: 22 }}>{t("diapasonFailTitle")}</h2>
              <p className="hint">{t("diapasonFailText")}</p>
              {isHost ? (
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  <button className="btn" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={rejouer}>🔁 {t("c4Rejouer")}</button>
                  <button className="btn ghost" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={backToLobby}>{t("backLounge")}</button>
                </div>
              ) : <p className="muted">{t("hostBrings")}</p>}
            </div>
          )}

          {phase === "success" && (
            <div>
              <h2 style={{ fontSize: 22 }}>{t("diapasonEndTitle")}</h2>
              <p className="hint">{t("diapasonEndText")}</p>
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

      {phase === "playing" && puzzle && (
        <div>
          {isPlayer && (
            <div className="diapason-topbar">
              <div className="diapason-role-badge">
                🕯️ {amEst ? t("diapasonRoleEst") : t("diapasonRoleOuest")}
              </div>
              <div className="diapason-cordes" title={t("diapasonCordesLabel")}>
                {Array.from({ length: MAX_CORDES }, (_, i) => (
                  <span key={i} className={"diapason-corde" + (i < cordes ? "" : " broken")}>{i < cordes ? "🎻" : "💔"}</span>
                ))}
              </div>
            </div>
          )}
          <p className="hint" style={{ marginTop: 6 }}>{storyLine}</p>
          <div className="diapason-comm-banner">{t("diapasonCommunicate")}</div>

          {!isPlayer ? (
            <p className="muted" style={{ marginTop: 14 }}>{t("echoesSpectatorNote")}</p>
          ) : (
            <>
              {showDiorama && (
                <>
                  <div className={"diapason-stage-wrap" + (wrongShake ? " shake" : "")}>
                    <RoomIllustration
                      side={mySide}
                      viewpoint={viewpointKey}
                      dialValues={dialValues}
                      otherCode={otherCode}
                      lockValues={lockValues}
                      otherLockCode={otherLockCode}
                      accent={accent}
                      lampLit={lampLit}
                      candelabraLit={candelabraLit}
                      doorGlow={myDoorLocked}
                      lockGlow={myLockSubmitted}
                      onExamine={handleExamine}
                    />
                    <div className="diapason-vignette" />
                  </div>

                  {availableViewpoints.length > 1 && (
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
                  )}

                  <p className="hint diapason-examine-box">{examine ? examineText() : defaultHint}</p>
                </>
              )}

              {/* ---------- Épreuve 1 : cadrans de la porte ---------- */}
              {chapter === 1 && lampLit && viewpointKey === "door" && (
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
                      <button className="btn" style={{ width: "auto", padding: "12px 26px" }} onClick={submitDoor}>{t("diapasonSubmit")}</button>
                    )}
                  </div>
                </div>
              )}

              {/* ---------- Épreuve 2 : la boîte à musique (intervalle sonore) ---------- */}
              {chapter === 2 && (
                <div className="diapason-accord-wrap">
                  {/* Carte 1 — MA boîte : mon partenaire est mon oreille. */}
                  <div className={"diapason-music-card" + (wrongShake ? " shake" : "")}>
                    <div className="diapason-music-title">🎁 {t("diapasonMyBox")}</div>
                    {myBoxOpen ? (
                      <p className="muted" style={{ textAlign: "center", margin: "10px 0" }}>🗝️ {t("diapasonBoxOpen")}</p>
                    ) : (
                      <>
                        <p className="muted" style={{ fontSize: 12.5, textAlign: "center" }}>{t("diapasonMyBoxHint")}</p>
                        <div style={{ textAlign: "center", margin: "10px 0" }}>
                          <button className="btn" style={{ width: "auto", padding: "12px 22px" }} onClick={crankMyBox}>🔄 {t("diapasonCrank")}</button>
                        </div>
                        <p className="muted" style={{ fontSize: 12, textAlign: "center", marginBottom: 6 }}>{t("diapasonSubmitInterval")}</p>
                        <div className="diapason-interval-row">
                          {INTERVALS.map((iv) => (
                            <button key={iv} className="btn ghost diapason-interval-btn" onClick={() => submitBox(iv)}>
                              {t(intervalLabelKey(iv))}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Carte 2 — je suis l'oreille de la boîte du partenaire. */}
                  <div className={"diapason-music-card ear" + (heardPulse ? " heard" : "")} key={"ear" + heardPulse}>
                    <div className="diapason-music-title">🎧 {t("diapasonEarTitle")}</div>
                    <p className="muted" style={{ fontSize: 12.5, textAlign: "center" }}>{t("diapasonEarHint")}</p>
                    <p className="muted" style={{ fontSize: 12, textAlign: "center", marginBottom: 6 }}>{t("diapasonReferences")}</p>
                    <div className="diapason-interval-row">
                      {INTERVALS.map((iv) => (
                        <button key={iv} className="btn ghost diapason-interval-btn" onClick={() => playInterval(iv)}>
                          🔊 {t(intervalLabelKey(iv))}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ---------- Épreuve 3 : cadenas final (candélabre) ---------- */}
              {chapter === 3 && viewpointKey === "sanctuary" && candelabraLit && (
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
                      <button className="btn" style={{ width: "auto", padding: "12px 26px" }} onClick={submitLock}>{t("diapasonSubmitLock")}</button>
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
