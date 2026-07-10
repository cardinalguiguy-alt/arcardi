"use client";
import { useEffect, useRef, useState } from "react";

/* ==========================================================================
   Décompte "3, 2, 1" de début de partie (demande 2026-07).

   Affiché par-dessus le jeu à CHAQUE match_start (10000, Gold Mines,
   Président — jamais lors d'une reprise sur rechargement) : trois chiffres
   qui claquent l'un après l'autre, dans la police et la couleur du THÈME du
   jeu (variante passée en prop, stylée dans globals.css — .game-countdown).

   Le voile couvre tout le panneau et intercepte les clics : personne ne
   joue pendant le décompte — côté hôte, bots et minuteur de tour sont
   décalés d'autant (voir countdownEndRef dans chaque jeu), l'overlay n'est
   donc jamais un simple cache-misère désynchronisé de l'arbitrage.

   POURQUOI un composant autonome : chaque jeu n'a qu'un booléen à gérer
   (visible/caché) — le rythme (800 ms par chiffre) et l'accessibilité
   (aria-live, prefers-reduced-motion géré en CSS) vivent ici, une fois.
   ========================================================================== */

export const COUNTDOWN_MS = 2400; // 3 chiffres x 800 ms — partagé avec les hôtes

export default function GameCountdown({ variant = "", onDone }) {
  const [n, setN] = useState(3);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (n <= 0) { onDoneRef.current && onDoneRef.current(); return; }
    const timer = setTimeout(() => setN(x => x - 1), COUNTDOWN_MS / 3);
    return () => clearTimeout(timer);
  }, [n]);

  if (n <= 0) return null;
  return (
    <div className={"game-countdown " + variant} role="status" aria-live="assertive">
      {/* key={n} : remonte le <span> à chaque chiffre pour rejouer l'animation */}
      <span key={n} className="game-countdown-digit">{n}</span>
    </div>
  );
}
