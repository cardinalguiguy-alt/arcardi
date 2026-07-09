"use client";
import { useEffect, useRef, useState } from "react";
import GameRulesButton from "./GameRulesButton";

/* ==========================================================================
   CurtainStage — habillage de présentation "lever de rideau" pour les jeux
   au ton narratif / performance (Piano Escape Room, Diapason, Échos) et pour
   Puissance 4. Calqué sur DoorStage (mêmes états, même cycle de vie), mais
   NE TOUCHE PAS à DoorStage.js — copie volontaire pour ne jamais risquer de
   régression sur les jeux de cartes/dés qui gardent la porte en bois.

   Purement une couche de présentation LOCALE au client, comme DoorStage :
   cet état n'est jamais envoyé en réseau et ne touche à rien de l'état de
   partie réel.

   États : 'closed' -> 'opening' (rideau qui monte) -> 'open' (le jeu réel
   est monté, avec l'animation d'entrée qui rejoue à CHAQUE ouverture).
   ========================================================================== */

export default function CurtainStage({ gameId, icon, name, accentVar, lang, children }) {
  const [state, setState] = useState("closed"); // 'closed' | 'opening' | 'open'
  const [entryKey, setEntryKey] = useState(0);
  const openTimer = useRef(null);

  useEffect(() => {
    clearTimeout(openTimer.current);
    setState("closed");
  }, [gameId]);

  useEffect(() => () => clearTimeout(openTimer.current), []);

  function openCurtain() {
    if (state !== "closed") return;
    setState("opening");
    openTimer.current = setTimeout(() => {
      setState("open");
      setEntryKey(k => k + 1);
    }, 1150);
  }

  function closeCurtain() {
    clearTimeout(openTimer.current);
    setState("closed");
  }

  const closed = state !== "open";
  const opening = state === "opening";

  return (
    <div className="curtain-stage" style={{ "--accent": `var(${accentVar})` }}>
      {closed && (
        <>
          <div className="curtain-valance" />
          <div className={"curtain-panel" + (opening ? " open" : "")}>
            <span className="curtain-fringe" />
          </div>
          <div className={"curtain-label" + (opening ? " hidden" : "")}>
            <span className="curtain-label-icon">{icon}</span>
            <span className="curtain-label-name">{name}</span>
            <button className="curtain-play-btn" onClick={openCurtain}>▶ Jouer</button>
          </div>
        </>
      )}
      {state === "open" && (
        <div className="curtain-content" key={entryKey}>
          <button className="door-replay-btn" onClick={closeCurtain} title="Revoir l'entrée" aria-label="Revoir l'entrée">↺</button>
          <GameRulesButton gameId={gameId} lang={lang} />
          {children}
        </div>
      )}
    </div>
  );
}
