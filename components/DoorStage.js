"use client";
import { useEffect, useRef, useState } from "react";

/* ==========================================================================
   DoorStage — habillage de présentation "porte d'entrée" au-dessus d'un
   jeu réel, tel que décrit dans le design cozy (voir DESIGNARCARDI.zip).

   Purement une couche de présentation LOCALE au client : cet état n'est
   JAMAIS envoyé en réseau et ne touche à rien de l'état de partie réel
   (chaque joueur ouvre "sa" porte indépendamment, exactement comme on
   pousserait une porte différente pour entrer dans la même pièce).

   États : 'closed' -> 'opening' (1s, les battants pivotent) -> 'open'
   (le jeu réel est monté, avec une animation d'entrée qui rejoue à
   CHAQUE ouverture, pas seulement au premier montage).

   Réinitialisé à 'closed' à chaque fois que `gameId` change (nouveau jeu
   lancé par l'hôte) — on ne saute jamais la mise en scène.
   ========================================================================== */

export default function DoorStage({ gameId, icon, name, accentVar, children }) {
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
    openTimer.current = setTimeout(() => {
      setDoorState("open");
      setEntryKey(k => k + 1);
    }, 950);
  }

  function closeDoor() {
    clearTimeout(openTimer.current);
    setDoorState("closed");
  }

  const closed = doorState !== "open";
  const opening = doorState === "opening";

  return (
    <div className="door-stage" style={{ "--accent": `var(${accentVar})` }}>
      {closed && (
        <>
          <div className={"door-panel left" + (opening ? " open" : "")}><span className="door-handle" /></div>
          <div className={"door-panel right" + (opening ? " open" : "")}><span className="door-handle" /></div>
          <div className={"door-label" + (opening ? " hidden" : "")}>
            <span className="door-label-icon">{icon}</span>
            <span className="door-label-name">{name}</span>
            <button className="door-play-btn" onClick={openDoor}>▶ Jouer</button>
          </div>
        </>
      )}
      {doorState === "open" && (
        <div className="door-content" key={entryKey}>
          <button className="door-replay-btn" onClick={closeDoor} title="Revoir l'entrée">↺ Revoir l'entrée</button>
          {children}
        </div>
      )}
    </div>
  );
}
