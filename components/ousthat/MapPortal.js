"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
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
//
// `overlay` (B2, audit 2026-09-19) : ce qui doit s'afficher PAR-DESSUS la
// carte vit ici, dans le portail, jamais dans l'ancre. Le portail
// (z-index:85, enfant de body) recouvre tout ce que contient .ot-root
// (contexte d'empilement à z-index:80) : la pastille « drapeau + Lieu réel »,
// posée dans l'ancre depuis le 2026-09-12, n'a jamais été visible —
// elementFromPoint en son centre renvoyait le canevas MapLibre.
export default function MapPortal({ anchorRef, active, overlay = null, ...guessMapProps }) {
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

  // B1 (audit 2026-09-19) : useLayoutEffect, et un premier sync IMMÉDIAT,
  // plus seulement à l'image suivante. Avant, au passage jeu → révélation,
  // GuessMap cadrait la révélation (effet passif) alors que le portail avait
  // encore la taille de l'ancre précédente — le dock agrandi, 1176×587 — et
  // map.resize() garde centre et zoom : la cible finissait hors du canevas de
  // 444×302. Un effet de mise en page passe avant TOUS les effets passifs,
  // donc avant le cadrage. ⚠️ Il ne voit l'ancre que si elle est déjà
  // attachée : React attache les refs des frères dans l'ordre du JSX, d'où
  // <MapPortal> rendu APRÈS les docks dans OusThatGame.js.
  useLayoutEffect(() => {
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
        // B1 (2026-09-19) : la TAILLE vient de la mise en page de l'ancre
        // (offsetWidth/offsetHeight, insensibles aux transform de ses
        // ancêtres), la POSITION de son rectangle visuel, centrée dessus. Le
        // dock de révélation entre en scale(.94) → 1 (otRevealIn, 0,38 s) : un
        // conteneur calé sur le rectangle visuel grandissait de 6 % pendant le
        // vol de révélation, cadré pour la taille de départ — il fallait donc
        // recadrer à l'atterrissage, un saut visible. Hors de cette entrée, les
        // deux mesures coïncident (au demi-pixel d'arrondi près).
        const width = anchor.offsetWidth;
        const height = anchor.offsetHeight;
        container.style.pointerEvents = "auto";
        container.style.top = `${rect.top + (rect.height - height) / 2}px`;
        container.style.left = `${rect.left + (rect.width - width) / 2}px`;
        container.style.width = `${width}px`;
        container.style.height = `${height}px`;
        container.style.borderRadius = getComputedStyle(anchor).borderRadius;
      }
      frame = requestAnimationFrame(sync);
    };
    sync();
    return () => cancelAnimationFrame(frame);
  }, [active, anchorRef]);

  if (!containerRef.current) return null;
  return createPortal(<><GuessMap {...guessMapProps} />{overlay}</>, containerRef.current);
}
