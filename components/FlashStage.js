"use client";
import { useEffect, useRef, useState } from "react";
import GameRulesButton from "./GameRulesButton";

/* ==========================================================================
   FlashStage — habillage de présentation "flash + zoom" pour les jeux de
   mots (Mot Mystère, Worldle) : rythme plus vif que la porte ou le rideau,
   flash blanc bref puis léger zoom avant sur le plateau, teinté par l'accent
   du jeu. Même cycle de vie que DoorStage/CurtainStage, copie volontaire
   pour ne jamais toucher aux deux autres.

   Ouverture synchronisée (2026-07) : seul l'hôte peut cliquer sur "Jouer",
   et le flash se déclenche au même instant chez tout le monde grâce à
   `stageLaunchAt` (voir DoorStage.js pour le détail complet du mécanisme,
   identique ici).
   ========================================================================== */

export default function FlashStage({ gameId, icon, name, accentVar, lang, t, children, onRulesOpenChange, rulesReaderNames, isHost, stageLaunchAt, onHostOpen }) {
  const [state, setState] = useState("closed"); // 'closed' | 'opening' | 'open'
  const [entryKey, setEntryKey] = useState(0);
  const openTimer = useRef(null);
  const flashTimer = useRef(null);
  const waitTimer = useRef(null);

  useEffect(() => {
    clearTimeout(openTimer.current);
    clearTimeout(flashTimer.current);
    clearTimeout(waitTimer.current);
    setState("closed");
  }, [gameId]);

  useEffect(() => () => {
    clearTimeout(openTimer.current);
    clearTimeout(flashTimer.current);
    clearTimeout(waitTimer.current);
  }, []);

  // Même mécanisme que DoorStage : attend `stageLaunchAt` avant de
  // déclencher le flash, chez tout le monde y compris l'hôte. Un client en
  // retard (rejoint/rechargé après coup) saute directement à 'open'.
  useEffect(() => {
    clearTimeout(waitTimer.current);
    if (!stageLaunchAt || state !== "closed") return;
    const delay = new Date(stageLaunchAt).getTime() - Date.now();
    if (delay <= 0) {
      setState("open");
      setEntryKey(k => k + 1);
      return;
    }
    waitTimer.current = setTimeout(() => {
      setState("opening");
      flashTimer.current = setTimeout(() => {
        setState("open");
        setEntryKey(k => k + 1);
      }, 260);
    }, delay);
    return () => clearTimeout(waitTimer.current);
  }, [stageLaunchAt, state]);

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
        <GameRulesButton gameId={gameId} lang={lang} accentVar={accentVar} onOpenChange={onRulesOpenChange} />
        {closed && (
          <>
            <div className={"flash-cover" + (opening ? " fading" : "")} />
            <div className={"flash-white" + (opening ? " on" : "")} />
          </>
        )}
        {state === "open" && (
          <div className="flash-content" key={entryKey}>
            {children}
          </div>
        )}
      </div>

      {closed && (
        <div className={"door-play-wrap" + (opening ? " hidden" : "")}>
          {rulesReaderNames && rulesReaderNames.length > 0 && (
            <p className="rules-reading-banner">
              ⏳ {rulesReaderNames.join(", ")} {t ? t(rulesReaderNames.length > 1 ? "rulesReadingPlural" : "rulesReadingSingle") : "is reading the rules — please wait…"}
            </p>
          )}
          {isHost ? (
            <button className="flash-play-btn" onClick={onHostOpen} disabled={!!stageLaunchAt}>{t ? t("stagePlay") : "▶ Jouer"}</button>
          ) : (
            <p className="stage-wait-host">{t ? t("stageWaitHost") : "Waiting for the host…"}</p>
          )}
        </div>
      )}
    </div>
  );
}
