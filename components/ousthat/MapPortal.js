"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import GuessMap from "./GuessMap";

// Rythme des tours (audit 2026-09-11, "carte persistante + pause") : la
// carte de réponse vivait dans trois <GuessMap> séparés (dock de jeu en
// cercle, dock de révélation, modale de fin), démontés/remontés à chaque
// changement de phase — donc le contexte WebGL de MapLibre recréé, le
// pan/zoom perdu, à chaque manche. Les trois emplacements n'ont PAS la même
// géométrie CSS, et celle de la révélation dépend de la hauteur du texte
// voisin (score, dégâts, langue) : pas de rectangle statique possible, d'où
// ce portail. Un seul <GuessMap> vit dans une couche position:fixed dont le
// rectangle est resynchronisé à chaque image sur l'ancre active (measure,
// jamais un calcul CSS statique — §8 CLAUDE.md, mesuré pas supposé).
export default function MapPortal({ anchorRef, active, ...guessMapProps }) {
  const containerRef = useRef(null);
  if (typeof document !== "undefined" && !containerRef.current) {
    containerRef.current = document.createElement("div");
    containerRef.current.className = "ot-map-portal";
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    document.body.appendChild(container);
    return () => { container.remove(); };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let frame;
    const sync = () => {
      const anchor = active ? anchorRef?.current : null;
      // visibility:hidden garde ses dimensions de mise en page (contrairement
      // à display:none) : un dock "replié" (.ot-map-dock.collapsed) cache
      // ainsi son ancre sans lui donner un rect nul — il faut donc vérifier
      // le style calculé en plus du rect, sinon la carte reste visible par-
      // dessus un dock censé être réduit à son bouton rond.
      const rect = anchor ? anchor.getBoundingClientRect() : null;
      const hidden = anchor ? getComputedStyle(anchor).visibility === "hidden" : true;
      if (!rect || hidden || rect.width <= 0 || rect.height <= 0) {
        container.style.pointerEvents = "none";
        container.style.left = "-99999px";
        container.style.top = "-99999px";
      } else {
        container.style.pointerEvents = "auto";
        container.style.top = `${rect.top}px`;
        container.style.left = `${rect.left}px`;
        container.style.width = `${rect.width}px`;
        container.style.height = `${rect.height}px`;
        container.style.borderRadius = getComputedStyle(anchor).borderRadius;
      }
      frame = requestAnimationFrame(sync);
    };
    frame = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(frame);
  }, [active, anchorRef]);

  if (!containerRef.current) return null;
  return createPortal(<GuessMap {...guessMapProps} />, containerRef.current);
}
