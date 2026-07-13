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

export default function Die({
  value, held, onClick, onPointerDown, onPointerMove, onPointerUp, onPointerCancel,
  rolling, shuffling, clickable, draggable, dragging, title, style,
}) {
  const cls = "yz-die"
    + (held ? " held" : "")
    + (rolling ? " rolling" : "")
    + (shuffling ? " shuffling" : "")
    + (clickable ? " clickable" : "")
    + (draggable ? " draggable" : "")
    + (dragging ? " dragging" : "");

  // Correctif 2026-07 (demande explicite, glisser-déposer pour la
  // lisibilité) : le dé n'utilise plus l'attribut HTML natif `disabled` —
  // il empêcherait `pointerdown`/`pointermove` de se déclencher de façon
  // fiable selon les navigateurs, ce qui casserait le glisser. Le clic
  // (garder/libérer) et le glisser (réajuster) sont désormais chacun gardés
  // en JS par l'appelant (voir canToggle/canDrag dans YahtzeeGame.js) ;
  // `tabIndex` retire simplement le dé de l'ordre de tabulation quand ni
  // l'un ni l'autre n'est possible, pour ne pas laisser un élément inerte
  // "attrapable" au clavier.
  return (
    <button
      type="button"
      className={cls}
      style={style}
      title={title}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      tabIndex={clickable || draggable ? 0 : -1}
      aria-label={String(value)}
    >
      <span className="yz-die-face">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(cell => (
          <span key={cell} className={"yz-pip-cell" + (PIPS[value]?.includes(cell) ? " on" : "")} />
        ))}
      </span>
    </button>
  );
}
