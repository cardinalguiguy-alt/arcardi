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

export default function CurtainStage({ gameId, icon, name, accentVar, lang, t, children }) {
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

  const closed = state !== "open";
  const opening = state === "opening";

  // Même disposition que DoorStage (retour d'expérience du porteur de
  // projet) : titre du jeu EN HAUT, bouton "Jouer" EN DESSOUS du cadre —
  // bien lisibles tous les deux, plus rien de fondu dans le décor du rideau.
  // Les classes .door-title-top/.door-play-wrap sont volontairement
  // réutilisées telles quelles (globals.css) pour une cohérence parfaite.
  return (
    <div className="door-wrap" style={{ "--accent": `var(${accentVar})` }}>
      {closed && (
        <div className={"door-title-top" + (opening ? " hidden" : "")}>
          <span className="door-title-icon">{icon}</span>
          <span className="door-title-name">{name}</span>
        </div>
      )}

      <div className="curtain-stage">
        {closed && (
          <>
            <div className="curtain-valance" />
            <div className={"curtain-panel" + (opening ? " open" : "")}>
              <span className="curtain-fringe" />
            </div>
          </>
        )}
        {state === "open" && (
          <div className="curtain-content" key={entryKey}>
            <GameRulesButton gameId={gameId} lang={lang} />
            {children}
          </div>
        )}
      </div>

      {closed && (
        <div className={"door-play-wrap" + (opening ? " hidden" : "")}>
          <button className="curtain-play-btn" onClick={openCurtain}>{t ? t("stagePlay") : "▶ Jouer"}</button>
        </div>
      )}
    </div>
  );
}
