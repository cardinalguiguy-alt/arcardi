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

  const closed = state !== "open";
  const opening = state === "opening";

  // Même disposition que DoorStage : titre EN HAUT, bouton "Jouer" EN
  // DESSOUS du cadre (classes .door-title-top/.door-play-wrap réutilisées).
  return (
    <div className="door-wrap" style={{ "--accent": `var(${accentVar})` }}>
      {closed && (
        <div className={"door-title-top" + (opening ? " hidden" : "")}>
          <span className="door-title-icon">{icon}</span>
          <span className="door-title-name">{name}</span>
        </div>
      )}

      <div className="flash-stage">
        {closed && (
          <>
            <div className={"flash-cover" + (opening ? " fading" : "")} />
            <div className={"flash-white" + (opening ? " on" : "")} />
          </>
        )}
        {state === "open" && (
          <div className="flash-content" key={entryKey}>
            <GameRulesButton gameId={gameId} lang={lang} />
            {children}
          </div>
        )}
      </div>

      {closed && (
        <div className={"door-play-wrap" + (opening ? " hidden" : "")}>
          <button className="flash-play-btn" onClick={openFlash}>{t ? t("stagePlay") : "▶ Jouer"}</button>
        </div>
      )}
    </div>
  );
}
