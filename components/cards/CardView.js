"use client";
import { COLOR_VARS } from "./deck";

const KIND_LABEL = { skip: "⊘", reverse: "⇄", draw2: "+2", wild4: "+4" };

export default function CardView({ card, faceDown, size = "md", onClick, dim, glow }) {
  const cls = "chromatik-card size-" + size
    + (faceDown ? " back" : "")
    + (onClick ? " clickable" : "")
    + (dim ? " dim" : "")
    + (glow ? " glow" : "");

  if (faceDown) {
    return <div className={cls} onClick={onClick}><span className="chromatik-card-back-mark">✦</span></div>;
  }

  const isWild = card.kind === "wild" || card.kind === "wild4";
  const style = isWild ? {} : { "--card-color": `var(${COLOR_VARS[card.color]})` };
  const label = card.kind === "number" ? String(card.value) : KIND_LABEL[card.kind] || "?";

  return (
    <div className={cls + (isWild ? " wild" : "")} style={style} onClick={onClick}>
      <span className="chromatik-card-corner">{label}</span>
      <span className="chromatik-card-main">{label}</span>
    </div>
  );
}
