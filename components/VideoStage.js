"use client";
import { useEffect, useRef, useState } from "react";
import GameRulesButton from "./GameRulesButton";

/* ==========================================================================
   VideoStage — habillage de présentation spécifique à Worldle : PAS de porte
   en bois (incohérente avec un jeu de mappemonde). Le bouton "Jouer" lance
   directement la vidéo d'intro, bien alignée dans l'encart, jouée à vitesse
   accélérée pour ne durer que TARGET_SECONDS quelle que soit la durée réelle
   du clip source, puis fondu élégant (fondu croisé, pas de coupure nette)
   vers le jeu réel.

   Copie volontaire dans son propre fichier, à part de DoorStage.js et
   CurtainStage.js — ne concerne QUE Worldle pour l'instant, ne touche à
   aucun des autres jeux/stages.

   Purement une couche de présentation LOCALE au client : jamais envoyée en
   réseau, ne touche à rien de l'état de partie réel.

   États : 'closed' -> 'playing' (vidéo accélérée) -> 'fading' (fondu
   croisé vidéo -> jeu) -> 'open' (jeu réel monté, animation d'entrée qui
   rejoue à CHAQUE ouverture).
   ========================================================================== */

const TARGET_SECONDS = 3; // durée cible de l'intro, quelle que soit la durée réelle du clip exporté
const FADE_MS = 600; // fondu croisé vidéo -> jeu, élégant plutôt qu'une coupure nette

export default function VideoStage({ gameId, icon, name, accentVar, lang, t, children }) {
  const [state, setState] = useState("closed"); // 'closed' | 'playing' | 'fading' | 'open'
  const [entryKey, setEntryKey] = useState(0);
  const videoRef = useRef(null);
  const fadeTimer = useRef(null);

  // Nouveau jeu lancé par l'hôte : on repart toujours de zéro, jamais de
  // mise en scène court-circuitée.
  useEffect(() => {
    clearTimeout(fadeTimer.current);
    setState("closed");
  }, [gameId]);

  useEffect(() => () => clearTimeout(fadeTimer.current), []);

  function play() {
    if (state !== "closed") return;
    setState("playing");
  }

  function handleLoadedMetadata() {
    const v = videoRef.current;
    if (v && v.duration && isFinite(v.duration)) {
      // Accélère pour tenir pile TARGET_SECONDS, quelle que soit la durée
      // réelle exportée du clip (robuste si le fichier est re-découpé plus tard).
      v.playbackRate = v.duration / TARGET_SECONDS;
    }
  }

  function handleEnded() {
    setState("fading");
    fadeTimer.current = setTimeout(() => {
      setState("open");
      setEntryKey(k => k + 1);
    }, FADE_MS);
  }

  function replay() {
    clearTimeout(fadeTimer.current);
    setState("closed");
  }

  const closed = state === "closed";
  const showVideo = state === "playing" || state === "fading";

  return (
    <div className="video-stage" style={{ "--accent": `var(${accentVar})` }}>
      {closed && (
        <div className="video-label">
          <span className="video-label-icon">{icon}</span>
          <span className="video-label-name">{name}</span>
          <button className="video-play-btn" onClick={play}>{t ? t("stagePlay") : "▶ Jouer"}</button>
        </div>
      )}
      {showVideo && (
        <video
          ref={videoRef}
          className={"video-stage-clip" + (state === "fading" ? " fading" : "")}
          src="/videos/worldle-intro.mp4"
          autoPlay
          muted
          playsInline
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
      )}
      {state === "open" && (
        <div className="video-stage-content" key={entryKey}>
          <button className="door-replay-btn" onClick={replay} title={t ? t("stageReplay") : "Revoir l'entrée"} aria-label={t ? t("stageReplay") : "Revoir l'entrée"}>↺</button>
          <GameRulesButton gameId={gameId} lang={lang} />
          {children}
        </div>
      )}
    </div>
  );
}
