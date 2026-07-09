"use client";
import { useState } from "react";

// Intro vidéo Worldle UNIQUEMENT : jouée une fois après l'ouverture de la
// porte, fondu vers le jeu réel ensuite. Purement locale au client (comme
// DoorStage), aucun état réseau.
export default function WorldleIntro({ children }) {
  const [done, setDone] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      {!done && (
        <video
          className="worldle-intro-video"
          src="/videos/worldle-intro.mp4"
          autoPlay
          muted
          playsInline
          onEnded={() => setDone(true)}
        />
      )}
      <div className={done ? "worldle-intro-fadein" : "worldle-intro-hidden"}>
        {children}
      </div>
    </div>
  );
}
