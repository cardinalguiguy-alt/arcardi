"use client";
import { useEffect, useRef, useState } from "react";
import { playDoorOpen } from "@/lib/sfx";
import { SYNC_MAX_WAIT_MS } from "@/lib/gameSync";
import GameRulesButton from "./GameRulesButton";

/* ==========================================================================
   DoorStage — habillage de présentation "porte d'entrée" au-dessus d'un
   jeu réel, tel que décrit dans le design cozy (voir DESIGNARCARDI.zip).

   Ouverture synchronisée (2026-07) : cet état reste LOCAL à chaque client
   (jamais envoyé en réseau, ne touche à rien de l'état de partie réel),
   mais son DÉCLENCHEMENT ne l'est plus. Avant, chaque joueur pouvait ouvrir
   "sa" porte indépendamment, à son propre rythme — désormais, seul l'hôte
   peut cliquer sur "Jouer" (voir `isHost`/`onHostOpen`), et la porte pivote
   au même instant chez TOUT LE MONDE, hôte compris, grâce à `stageLaunchAt`
   (horodatage partagé écrit par launchStage, voir lib/gameSync.js) — même
   principe que le palier de lancement de la partie elle-même (launch_at).

   États : 'closed' -> 'opening' (3s, les battants pivotent, synchronisés
   avec door-open.mp3) -> 'open' (le jeu réel est monté, avec une animation
   d'entrée qui rejoue à CHAQUE ouverture, pas seulement au premier montage).

   Réinitialisé à 'closed' à chaque fois que `gameId` change (nouveau jeu
   lancé par l'hôte) — on ne saute jamais la mise en scène. Un client qui
   rejoint ou recharge après que `stageLaunchAt` soit déjà passé saute
   directement à 'open', sans rejouer l'animation pour lui tout seul.

   Disposition (retour d'expérience du porteur de projet) : le titre du jeu
   doit être EN HAUT et bien lisible, le bouton "Jouer" EN DESSOUS du cadre
   en bois — plus l'un ni l'autre planqués/centrés à l'intérieur de l'encart
   comme avant, où les deux se fondaient dans le décor.
   ========================================================================== */

export default function DoorStage({ gameId, icon, name, accentVar, lang, t, children, onRulesOpenChange, rulesReaderNames, isHost, stageLaunchAt, onHostOpen }) {
  const [doorState, setDoorState] = useState("closed"); // 'closed' | 'opening' | 'open'
  const [entryKey, setEntryKey] = useState(0); // change à chaque ouverture -> rejoue l'animation povPush
  const openTimer = useRef(null);
  const waitTimer = useRef(null);

  // Nouveau jeu lancé par l'hôte : on repart toujours de la porte fermée,
  // la mise en scène ne doit jamais être court-circuitée.
  useEffect(() => {
    clearTimeout(openTimer.current);
    clearTimeout(waitTimer.current);
    setDoorState("closed");
  }, [gameId]);

  useEffect(() => () => { clearTimeout(openTimer.current); clearTimeout(waitTimer.current); }, []);

  // Attend `stageLaunchAt` (écrit par l'hôte au clic sur "Jouer") avant de
  // faire pivoter la porte — TOUS les clients passent par ce même effet, y
  // compris l'hôte, pour une ouverture réellement simultanée.
  //
  // Correctif URGENT 2026-07 (blocage invités) : le `delay` est calculé en
  // comparant l'horloge de l'HÔTE (qui a écrit l'horodatage) à l'horloge
  // LOCALE — à la moindre dérive entre machines, il devenait gigantesque
  // (porte fermée à jamais chez l'invité) ou très négatif (animation sautée
  // à tort). Deux gardes désormais :
  // - `justLaunched` (l'horodatage vient d'APPARAÎTRE alors qu'on regardait
  //   la porte fermée = déclenchement reçu en direct) : on anime TOUJOURS,
  //   avec une attente bornée entre 0 et SYNC_MAX_WAIT_MS, même si l'horloge
  //   locale prétend que l'instant est déjà passé.
  // - horodatage déjà présent au montage (rejoint/rechargé après coup) : on
  //   saute à 'open' si l'instant est passé, comme avant — et s'il est
  //   "dans le futur", on borne aussi l'attente (horloge locale en retard).
  const prevLaunchRef = useRef(stageLaunchAt);
  useEffect(() => {
    const prev = prevLaunchRef.current;
    prevLaunchRef.current = stageLaunchAt;
    clearTimeout(waitTimer.current);
    if (!stageLaunchAt || doorState !== "closed") return;
    const raw = new Date(stageLaunchAt).getTime() - Date.now();
    const justLaunched = !prev;
    if (raw <= 0 && !justLaunched) {
      setDoorState("open");
      setEntryKey(k => k + 1);
      return;
    }
    // Correctif latence hôte 2026-07 : quand c'est l'HÔTE lui-même qui vient
    // de cliquer "Jouer" (justLaunched, l'horodatage sort de SA machine), sa
    // porte pivote IMMÉDIATEMENT — le tampon STAGE_LAUNCH_BUFFER_MS n'existe
    // que pour laisser aux INVITÉS le temps de recevoir l'horodatage. Avant
    // ce correctif, l'hôte voyait son bouton grisé ~0,9s sans aucun effet.
    // Même principe que l'exemption launchHold de l'hôte (page.js, zip 115).
    const delay = isHost && justLaunched ? 0 : Math.max(0, Math.min(raw, SYNC_MAX_WAIT_MS));
    waitTimer.current = setTimeout(() => {
      setDoorState("opening");
      playDoorOpen(); // son de portes coulissantes, synchro sur les 3s de rotation
      openTimer.current = setTimeout(() => {
        setDoorState("open");
        setEntryKey(k => k + 1);
      }, 3000); // durée EXACTE de door-open.mp3 (5s d'origine accélérées à 3s) et de la transition CSS .door-panel
    }, delay);
    return () => clearTimeout(waitTimer.current);
  }, [stageLaunchAt, doorState, isHost]);

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
        {/* Bouton "i" rendu QUELLE QUE SOIT la position de la porte —
            consultable dès l'écran "Jouer", pas seulement une fois ouvert
            (voir GameRulesButton.js pour le pourquoi du portail React). */}
        <GameRulesButton gameId={gameId} lang={lang} accentVar={accentVar} onOpenChange={onRulesOpenChange} />
        {closed && (
          <>
            <div className={"door-panel left" + (opening ? " open" : "")}><span className="door-handle" /></div>
            <div className={"door-panel right" + (opening ? " open" : "")}><span className="door-handle" /></div>
          </>
        )}
        {doorState === "open" && (
          <div className="door-content" key={entryKey}>
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
          {/* Seul l'hôte peut ouvrir la porte (2026-07) : les autres
              joueurs voient un message d'attente à la place du bouton,
              même endroit, même gabarit — voir stageWaitHost dans i18n.js. */}
          {isHost ? (
            <button className="door-play-btn" onClick={onHostOpen} disabled={!!stageLaunchAt}>{t ? t("stagePlay") : "▶ Jouer"}</button>
          ) : (
            <p className="stage-wait-host">{t ? t("stageWaitHost") : "Waiting for the host…"}</p>
          )}
        </div>
      )}
    </div>
  );
}
