"use client";

/* ==========================================================================
   Dé visuel — points ("pips") dessinés en CSS pur sur une grille 3×3.
   Aucune image externe, aucun emoji (les emojis de dés sont rendus
   différemment selon l'OS — même leçon que les drapeaux de Worldle).
   ========================================================================== */

// Positions des points sur la grille 3×3 pour chaque face.
// Cases : 1 2 3 / 4 5 6 / 7 8 9 (numérotation grid-area via classes).
const PIPS = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

export default function Die({ value, held, onClick, rolling, shuffling, disabled, ghost, style }) {
  const cls = "yz-die"
    + (held ? " held" : "")
    + (rolling ? " rolling" : "")
    + (shuffling ? " shuffling" : "")
    + (onClick && !disabled ? " clickable" : "")
    + (ghost ? " ghost" : "");

  return (
    <button
      type="button"
      className={cls}
      style={style}
      onClick={disabled ? undefined : onClick}
      disabled={!!disabled && !ghost}
      aria-label={ghost ? "?" : String(value)}
    >
      {ghost ? (
        <span className="yz-die-ghost">?</span>
      ) : (
        <span className="yz-die-face">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(cell => (
            <span key={cell} className={"yz-pip-cell" + (PIPS[value]?.includes(cell) ? " on" : "")} />
          ))}
        </span>
      )}
    </button>
  );
}
