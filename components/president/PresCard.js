"use client";
import { SUITS } from "./deck52";

/* Carte à jouer classique : coin valeur+enseigne, grande enseigne au
   centre, rouge/noir. `sel` = sélectionnée (levée, état de CLIC — pas de
   survol, donc aucun risque de clignotement). */
export default function PresCard({ card, faceDown, size = "sm", onClick, dim, sel, glow, match, faded }) {
  const cls = "pres-card size-" + size
    + (faceDown ? " back" : "")
    + (onClick ? " clickable" : "")
    + (dim ? " dim" : "")
    + (sel ? " sel" : "")
    + (glow ? " glow" : "")
    + (match ? " match" : "")
    + (faded ? " faded" : "");

  if (faceDown) {
    return <div className={cls} onClick={onClick}><span className="pres-back-mark">✦</span></div>;
  }

  const suit = SUITS.find(s => s.id === card.suit);
  return (
    <div className={cls + (suit.red ? " red" : "")} onClick={onClick}>
      <span className="pres-corner">{card.rank}<br />{suit.sym}</span>
      <span className="pres-main">{suit.sym}</span>
      <span className="pres-corner flip">{card.rank}<br />{suit.sym}</span>
    </div>
  );
}
