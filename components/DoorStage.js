"use client";
import { useEffect, useRef, useState } from "react";
import { playDoorOpen } from "@/lib/sfx";
import GameRulesButton from "./GameRulesButton";

/* ==========================================================================
   DoorStage — habillage de présentation "porte d'entrée" au-dessus d'un
   jeu réel, tel que décrit dans le design cozy (voir DESIGNARCARDI.zip).

   Purement une couche de présentation LOCALE au client : cet état n'est
   JAMAIS envoyé en réseau et ne touche à rien de l'état de partie réel
   (chaque joueur ouvre "sa" porte indépendamment, exactement comme on
   pousserait une porte différente pour entrer dans la même pièce).

   États : 'closed' -> 'opening' (3s, les battants pivotent, synchronisés
   avec door-open.mp3) -> 'open' (le jeu réel est monté, avec une animation
   d'entrée qui rejoue à CHAQUE ouverture, pas seulement au premier montage).

   Réinitialisé à 'closed' à chaque fois que `gameId` change (nouveau jeu
   lancé par l'hôte) — on ne saute jamais la mise en scène.

   Disposition (retour d'expérience du porteur de projet) : le titre du jeu
   doit être EN HAUT et bien lisible, le bouton "Jouer" EN DESSOUS du cadre
   en bois — plus l'un ni l'autre planqués/centrés à l'intérieur de l'encart
   comme avant, où les deux se fondaient dans le décor.
   ========================================================================== */

export default function DoorStage({ gameId, icon, name, accentVar, lang, t, children }) {
  const [doorState, setDoorState] = useState("closed"); // 'closed' | 'opening' | 'open'
  const [entryKey, setEntryKey] = useState(0); // change à chaque ouverture -> rejoue l'animation povPush
  const openTimer = useRef(null);

  // Nouveau jeu lancé par l'hôte : on repart toujours de la porte fermée,
  // la mise en scène ne doit jamais être court-circuitée.
  useEffect(() => {
    clearTimeout(openTimer.current);
    setDoorState("closed");
  }, [gameId]);

  useEffect(() => () => clearTimeout(openTimer.current), []);

  function openDoor() {
    if (doorState !== "closed") return;
    setDoorState("opening");
    playDoorOpen(); // son de portes coulissantes, synchro sur les 3s de rotation
    openTimer.current = setTimeout(() => {
      setDoorState("open");
      setEntryKey(k => k + 1);
    }, 3000); // durée EXACTE de door-open.mp3 (5s d'origine accélérées à 3s) et de la transition CSS .door-panel
  }

  const closed = doorState !== "open";
  const opening = doorState === "opening";

  return (
    <div className="door-wrap" style={{ "--accent": `var(${accentVar})` }}>
      {closed && (
        <div className={"door-title-top" + (opening ? " hidden" : "")}>
          <span className="door-title-icon">{icon}</span>
          <span className="door-title-name">{name}</span>
        </div>
      )}

      <div className="door-stage">
        {closed && (
          <>
            <div className={"door-panel left" + (opening ? " open" : "")}><span className="door-handle" /></div>
            <div className={"door-panel right" + (opening ? " open" : "")}><span className="door-handle" /></div>
          </>
        )}
        {doorState === "open" && (
          <div className="door-content" key={entryKey}>
            <GameRulesButton gameId={gameId} lang={lang} />
            {children}
          </div>
        )}
      </div>

      {closed && (
        <div className={"door-play-wrap" + (opening ? " hidden" : "")}>
          <button className="door-play-btn" onClick={openDoor}>{t ? t("stagePlay") : "▶ Jouer"}</button>
        </div>
      )}
    </div>
  );
}
