"use client";
import { useEffect, useState } from "react";
import { playNoteSequence } from "@/lib/sfx";

/* ==========================================================================
   LoadingIntro — écran de lancement animé façon "typing" (variante 1a
   validée), montré au premier chargement complet du site.

   Placé dans app/layout.js autour de {children} : la vraie page est montée
   normalement en dessous (elle tourne déjà, appels réseau compris) pendant
   que l'écran de lancement joue par-dessus, en pointer-events:none — rien
   ne bloque l'interaction, on ne fait que masquer visuellement le temps de
   l'animation. Comme le composant vit dans le layout racine, il n'est pas
   remonté lors des navigations internes Next.js (changement de route) :
   il ne rejoue qu'à un vrai rechargement de page.

   Séquence (~2,6s), voir les tuiles/keyframes "intro*" dans globals.css :
   1. Les 7 lettres de ARCARDI apparaissent une à une (introTilePop, 0,1s
      de décalage entre chaque).
   2. Lueur dorée sur le groupe de tuiles (introGlow).
   3. Flash blanc + disparition des tuiles (introFlashOut / introTilesFadeOut).
   4. Le cache opaque s'estompe (introCoverFadeOut) et révèle la page,
      déjà prête derrière.

   Respecte prefers-reduced-motion (animations coupées net via CSS dans
   globals.css) — l'écran est alors retiré du DOM presque immédiatement.
   ========================================================================== */

const LETTERS = "ARCARDI".split("");
// Même rotation de couleurs que .brand .tile (nth-child 4n+1..4) pour rester
// cohérent avec le logo utilisé partout ailleurs sur le site.
const TILE_VARS = ["--p1", "--p4", "--p2", "--p3"];

const POP_DURATION = 0.5; // s, par tuile
const POP_STAGGER = 0.1; // s entre chaque tuile
// Une note par lettre, jouée PILE quand la lettre "claque" en place — c'est le
// pic de l'overshoot d'introTilePop (keyframe 60% : scale max), soit à 60 % de
// POP_DURATION après le début de CETTE lettre. Gamme ascendante ré-mi-fa-sol-
// la-si-do (D E F G A B C), une note par lettre de ARCARDI.
const LAND_FRACTION = 0.6;
const LETTER_NOTES_HZ = [587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5];
const GLOW_DELAY = LETTERS.length * POP_STAGGER + 0.3; // 1.0s
const GLOW_DURATION = 0.7;
const TILES_FADE_DELAY = 1.9;
const TILES_FADE_DURATION = 0.3;
const FLASH_DELAY = 1.85;
const FLASH_DURATION = 0.35;
const COVER_FADE_DELAY = 2.0;
const COVER_FADE_DURATION = 0.6;
const TOTAL_MS = (COVER_FADE_DELAY + COVER_FADE_DURATION) * 1000 + 100; // marge

export default function LoadingIntro({ children }) {
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) {
      // Une note par lettre, calée sur l'instant où chaque lettre claque en
      // place. Timing d'échantillon via Web Audio (voir playNoteSequence).
      // NB : si le navigateur bloque encore l'audio (aucune interaction depuis
      // le chargement), la séquence est silencieuse — sans erreur.
      const seq = LETTERS.map((_, i) => ({
        freq: LETTER_NOTES_HZ[i % LETTER_NOTES_HZ.length],
        atMs: (i * POP_STAGGER + POP_DURATION * LAND_FRACTION) * 1000,
      }));
      playNoteSequence(seq);
    }
    const timer = setTimeout(() => setPlaying(false), reduced ? 0 : TOTAL_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {children}
      {playing && (
        <div className="intro-screen" aria-hidden="true">
          <div
            className="intro-cover"
            style={{ animation: `introCoverFadeOut ${COVER_FADE_DURATION}s ease-out ${COVER_FADE_DELAY}s 1 forwards` }}
          />
          <div
            className="intro-tiles"
            style={{ animation: `introTilesFadeOut ${TILES_FADE_DURATION}s ease-in ${TILES_FADE_DELAY}s 1 forwards` }}
          >
            <div
              className="intro-tiles-glow"
              style={{ animation: `introGlow ${GLOW_DURATION}s ease-out ${GLOW_DELAY}s 1 both` }}
            >
              {LETTERS.map((char, i) => (
                <span
                  key={i}
                  className="intro-tile"
                  style={{
                    background: `var(${TILE_VARS[i % TILE_VARS.length]})`,
                    animation: `introTilePop ${POP_DURATION}s cubic-bezier(0.34,1.56,0.64,1) ${(i * POP_STAGGER).toFixed(2)}s 1 forwards`,
                  }}
                >
                  {char}
                </span>
              ))}
            </div>
          </div>
          <div
            className="intro-flash"
            style={{ animation: `introFlashOut ${FLASH_DURATION}s ease-in-out ${FLASH_DELAY}s 1 both` }}
          />
        </div>
      )}
    </>
  );
}
