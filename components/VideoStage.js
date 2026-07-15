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

   Ouverture synchronisée (2026-07) : seul l'hôte peut cliquer sur "Jouer",
   et la vidéo démarre au même instant chez tout le monde grâce à
   `stageLaunchAt` (voir DoorStage.js pour le détail complet du mécanisme).
   Un client en retard (rejoint/rechargé après coup) saute directement à
   'open', sans lancer la vidéo pour lui tout seul.
   ========================================================================== */

const TARGET_SECONDS = 3; // durée cible de l'intro, quelle que soit la durée réelle du clip exporté
const FADE_MS = 600; // fondu croisé vidéo -> jeu, élégant plutôt qu'une coupure nette

export default function VideoStage({ gameId, icon, name, accentVar, lang, t, children, onRulesOpenChange, rulesReaderNames, isHost, stageLaunchAt, onHostOpen }) {
  const [state, setState] = useState("closed"); // 'closed' | 'playing' | 'fading' | 'open'
  const [entryKey, setEntryKey] = useState(0);
  const videoRef = useRef(null);
  const fadeTimer = useRef(null);
  const waitTimer = useRef(null);

  // Nouveau jeu lancé par l'hôte : on repart toujours de zéro, jamais de
  // mise en scène court-circuitée.
  useEffect(() => {
    clearTimeout(fadeTimer.current);
    clearTimeout(waitTimer.current);
    setState("closed");
  }, [gameId]);

  useEffect(() => () => { clearTimeout(fadeTimer.current); clearTimeout(waitTimer.current); }, []);

  // Même mécanisme que DoorStage : attend `stageLaunchAt` avant de lancer
  // la vidéo, chez tout le monde y compris l'hôte.
  useEffect(() => {
    clearTimeout(waitTimer.current);
    if (!stageLaunchAt || state !== "closed") return;
    const delay = new Date(stageLaunchAt).getTime() - Date.now();
    if (delay <= 0) {
      setState("open");
      setEntryKey(k => k + 1);
      return;
    }
    waitTimer.current = setTimeout(() => setState("playing"), delay);
    return () => clearTimeout(waitTimer.current);
  }, [stageLaunchAt, state]);

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

  const closed = state === "closed";
  const showVideo = state === "playing" || state === "fading";

  // Même disposition que DoorStage : titre EN HAUT, bouton "Jouer" EN
  // DESSOUS du cadre (classes .door-title-top/.door-play-wrap réutilisées).
  return (
    <div className="door-wrap" style={{ "--accent": `var(${accentVar})` }}>
      {closed && (
        <div className="door-title-top">
          <span className="door-title-icon">{icon}</span>
          <span className="door-title-name">{name}</span>
        </div>
      )}

      <div className="video-stage">
      <GameRulesButton gameId={gameId} lang={lang} accentVar={accentVar} onOpenChange={onRulesOpenChange} />
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
          {children}
        </div>
      )}
      </div>

      {closed && (
        <div className="door-play-wrap">
          {rulesReaderNames && rulesReaderNames.length > 0 && (
            <p className="rules-reading-banner">
              ⏳ {rulesReaderNames.join(", ")} {t ? t(rulesReaderNames.length > 1 ? "rulesReadingPlural" : "rulesReadingSingle") : "is reading the rules — please wait…"}
            </p>
          )}
          {isHost ? (
            <button className="video-play-btn" onClick={onHostOpen} disabled={!!stageLaunchAt}>{t ? t("stagePlay") : "▶ Jouer"}</button>
          ) : (
            <p className="stage-wait-host">{t ? t("stageWaitHost") : "Waiting for the host…"}</p>
          )}
        </div>
      )}
    </div>
  );
}
