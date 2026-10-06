"use client";
/* =============================================================================
   SkateHelp.js — LE « ? » DU PATINAGE (2026-10-06).
   -----------------------------------------------------------------------------
   Guillaume : « petit menu discret (? aide) pour savoir comment faire des figures, les commandes ». Un petit rond « ? » en
   bas à droite, qui n'existe qu'en ville, près de la patinoire ou chaussé ; il ouvre un papier avec les touches (les figures :
   saut, vrille emballée, axel, à reculons, freinage brut).
   ⚠️ UN COMPOSANT À PART (comme `CourseHud`) : il ne lit qu'une VUE (`getVM()`, ~4 fois par seconde) et ne fait re-rendre que
   lui — pas les quarante mille lignes de `FermeGame`. Il ne prend ni le clavier ni la souris du jeu : le papier se lit EN
   PATINANT (les touches restent au jeu), et le bouton refuse le focus — sinon Espace, la touche du saut, le rouvrirait.
   Les lignes viennent de `L.skateHelpRows` ([touches, texte]) : un texte de plus se règle dans `fermeStrings.js` (une touche préfixée de « + » se lit « avec la précédente », sinon « ou »).
   ========================================================================== */
import { useEffect, useState } from "react";

export default function SkateHelp({ getVM, L }) {
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const id = setInterval(() => { try { const vm = getVM(); setShow(!!(vm && vm.show)); } catch (e) { setShow(false); } }, 250);
    return () => clearInterval(id);
  }, [getVM]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.code === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!show) return null;
  return (
    <>
      <button type="button" className={"ferme-skhelp-btn" + (open ? " on" : "")} title={L.skateHelpTip} aria-label={L.skateHelpTip} aria-expanded={open}
        tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen((o) => !o)}>?</button>
      {open && (
        <div className="ferme-skhelp panel" role="dialog" aria-label={L.skateHelpTitle}>
          <button type="button" className="ferme-close-x" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen(false)}>✕</button>
          <h3>{L.skateHelpTitle}</h3>
          <div className="ferme-skhelp-rows">
            {L.skateHelpRows.map(([keys, txt], i) => (
              <div className="row" key={i}>
                <span className="keys">{keys.map((k, j) => <span key={j}>{j > 0 && <i>{k.startsWith("+") ? "+" : "/"}</i>}<kbd>{k.replace(/^\+/, "")}</kbd></span>)}</span>
                <span className="txt">{txt}</span>
              </div>
            ))}
          </div>
          <div className="ferme-skhelp-note">{L.skateHelpNote}</div>
        </div>
      )}
    </>
  );
}
