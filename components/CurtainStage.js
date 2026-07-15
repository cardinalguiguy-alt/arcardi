"use client";
import { useEffect, useRef, useState } from "react";
import { SYNC_MAX_WAIT_MS } from "@/lib/gameSync";
import GameRulesButton from "./GameRulesButton";

/* ==========================================================================
   CurtainStage — habillage de présentation "lever de rideau" pour les jeux
   au ton narratif / performance (Piano Escape Room, Diapason, Échos) et pour
   Puissance 4. Calqué sur DoorStage (mêmes états, même cycle de vie), mais
   NE TOUCHE PAS à DoorStage.js — copie volontaire pour ne jamais risquer de
   régression sur les jeux de cartes/dés qui gardent la porte en bois.

   Ouverture synchronisée (2026-07) : cet état reste LOCAL à chaque client,
   jamais envoyé en réseau, mais son DÉCLENCHEMENT ne l'est plus — seul
   l'hôte peut cliquer sur "Jouer", et le rideau se lève au même instant
   chez tout le monde grâce à `stageLaunchAt` (voir DoorStage.js pour le
   détail complet du mécanisme, identique ici).

   États : 'closed' -> 'opening' (rideau qui monte) -> 'open' (le jeu réel
   est monté, avec l'animation d'entrée qui rejoue à CHAQUE ouverture).
   ========================================================================== */

export default function CurtainStage({ gameId, icon, name, accentVar, lang, t, children, onRulesOpenChange, rulesReaderNames, isHost, stageLaunchAt, onHostOpen }) {
  const [state, setState] = useState("closed"); // 'closed' | 'opening' | 'open'
  const [entryKey, setEntryKey] = useState(0);
  const openTimer = useRef(null);
  const waitTimer = useRef(null);

  useEffect(() => {
    clearTimeout(openTimer.current);
    clearTimeout(waitTimer.current);
    setState("closed");
  }, [gameId]);

  useEffect(() => () => { clearTimeout(openTimer.current); clearTimeout(waitTimer.current); }, []);

  // Même mécanisme que DoorStage : attend `stageLaunchAt` avant de lever le
  // rideau, chez tout le monde y compris l'hôte. Correctif URGENT 2026-07
  // (dérive d'horloge entre machines, voir DoorStage.js pour le détail) :
  // attente BORNÉE par SYNC_MAX_WAIT_MS, et un déclenchement reçu en direct
  // (`justLaunched`) anime toujours au lieu de sauter à 'open'. Un client en
  // retard (rejoint/rechargé après coup) saute directement à 'open'.
  const prevLaunchRef = useRef(stageLaunchAt);
  useEffect(() => {
    const prev = prevLaunchRef.current;
    prevLaunchRef.current = stageLaunchAt;
    clearTimeout(waitTimer.current);
    if (!stageLaunchAt || state !== "closed") return;
    const raw = new Date(stageLaunchAt).getTime() - Date.now();
    const justLaunched = !prev;
    if (raw <= 0 && !justLaunched) {
      setState("open");
      setEntryKey(k => k + 1);
      return;
    }
    const delay = Math.max(0, Math.min(raw, SYNC_MAX_WAIT_MS));
    waitTimer.current = setTimeout(() => {
      setState("opening");
      openTimer.current = setTimeout(() => {
        setState("open");
        setEntryKey(k => k + 1);
      }, 1150);
    }, delay);
    return () => clearTimeout(waitTimer.current);
  }, [stageLaunchAt, state]);

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
        <GameRulesButton gameId={gameId} lang={lang} accentVar={accentVar} onOpenChange={onRulesOpenChange} />
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
            <button className="curtain-play-btn" onClick={onHostOpen} disabled={!!stageLaunchAt}>{t ? t("stagePlay") : "▶ Jouer"}</button>
          ) : (
            <p className="stage-wait-host">{t ? t("stageWaitHost") : "Waiting for the host…"}</p>
          )}
        </div>
      )}
    </div>
  );
}
