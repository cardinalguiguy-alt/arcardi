"use client";
import { SYMBOL_COLORS } from "./constants";

/* ==========================================================================
   SymbolIcon — un symbole musical en illustration vectorielle plate (SVG).
   Remplace l'ancienne version 3D : même vocabulaire (note / silence / dièse
   / point d'orgue), mais dans un registre illustré assumé (façon Rusty
   Lake), bien plus fiable et bien plus soigné qu'une primitive 3D codée.

   Un <svg> imbriqué est valide en SVG : ce composant peut donc être utilisé
   aussi bien seul (liste HTML) qu'imbriqué dans la grande illustration de
   la pièce (RoomIllustration.js).
   ========================================================================== */
export default function SymbolIcon({ type, color, size = 34 }) {
  const c = color || SYMBOL_COLORS[type] || "#cccccc";

  let inner;
  if (type === "note") {
    inner = (
      <>
        <ellipse cx="13" cy="24" rx="7" ry="5.4" transform="rotate(-18 13 24)" fill={c} />
        <rect x="19" y="6" width="2.4" height="19" fill={c} />
      </>
    );
  } else if (type === "rest") {
    inner = (
      <>
        <rect x="8" y="14" width="18" height="7" rx="1.5" fill={c} />
        <rect x="8" y="9" width="6" height="6" rx="1" fill={c} />
      </>
    );
  } else if (type === "sharp") {
    inner = (
      <>
        <rect x="11" y="5" width="2.6" height="24" transform="rotate(10 12.3 17)" fill={c} />
        <rect x="19" y="5" width="2.6" height="24" transform="rotate(10 20.3 17)" fill={c} />
        <rect x="6" y="12" width="22" height="2.6" transform="rotate(-8 17 13.3)" fill={c} />
        <rect x="6" y="20" width="22" height="2.6" transform="rotate(-8 17 21.3)" fill={c} />
      </>
    );
  } else {
    // fermata (point d'orgue)
    inner = (
      <>
        <path d="M 8 20 A 9 9 0 0 1 26 20" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="17" cy="24" r="2.6" fill={c} />
      </>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 34 34" style={{ overflow: "visible" }}>
      {inner}
    </svg>
  );
}
