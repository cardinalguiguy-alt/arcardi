"use client";
import { useEffect, useRef, useState } from "react";
import GameRulesButton from "./GameRulesButton";

/* ==========================================================================
   FlashStage — habillage de présentation "flash + zoom" pour les jeux de
   mots (Mot Mystère, Worldle) : rythme plus vif que la porte ou le rideau,
   flash blanc bref puis léger zoom avant sur le plateau, teinté par l'accent
   du jeu. Même cycle de vie que DoorStage/CurtainStage, copie volontaire
   pour ne jamais toucher aux deux autres.
   ========================================================================== */

export default function FlashStage({ gameId, icon, name, accentVar, lang, t, children }) {
  const [state, setState] = useState("closed"); // 'closed' | 'opening' | 'open'
  const [entryKey, setEntryKey] = useState(0);
  const openTimer = useRef(null);
  const flashTimer = useRef(null);

  useEffect(() => {
    clearTimeout(openTimer.current);
    clearTimeout(flashTimer.current);
    setState("closed");
  }, [gameId]);

  useEffect(() => () => {
    clearTimeout(openTimer.current);
    clearTimeout(flashTimer.current);
  }, []);

  function openFlash() {
    if (state !== "closed") return;
    setState("opening");
    flashTimer.current = setTimeout(() => {
      setState("open");
      setEntryKey(k => k + 1);
    }, 260);
  }

  function closeFlash() {
    clearTimeout(openTimer.current);
    clearTimeout(flashTimer.current);
    setState("closed");
  }

  const closed = state !== "open";
  const opening = state === "opening";

  return (
    <div className="flash-stage" style={{ "--accent": `var(${accentVar})` }}>
      {closed && (
        <>
          <div className={"flash-cover" + (opening ? " fading" : "")}>
            <span className="flash-cover-icon">{icon}</span>
            <span className="flash-cover-name">{name}</span>
            <button className="flash-play-btn" onClick={openFlash}>{t ? t("stagePlay") : "▶ Jouer"}</button>
          </div>
          <div className={"flash-white" + (opening ? " on" : "")} />
        </>
      )}
      {state === "open" && (
        <div className="flash-content" key={entryKey}>
          <button className="door-replay-btn" onClick={closeFlash} title={t ? t("stageReplay") : "Revoir l'entrée"} aria-label={t ? t("stageReplay") : "Revoir l'entrée"}>↺</button>
          <GameRulesButton gameId={gameId} lang={lang} />
          {children}
        </div>
      )}
    </div>
  );
}
