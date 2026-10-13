"use client";
/* =============================================================================
   SkateHelp.js — LE « ? » DU PATINAGE (2026-10-06), ET DU SKATEPARK (2026-10-14).
   -----------------------------------------------------------------------------
   Guillaume : « petit menu discret (? aide) pour savoir comment faire des figures, les commandes ». Un petit rond « ? » en
   bas à droite, qui n'existe qu'en ville, près de la patinoire ou chaussé ; il ouvre un papier avec les touches (les figures :
   saut, vrille emballée, axel, à reculons, freinage brut).
   2026-10-14 — LE MÊME ROND POUR LE PARK (« les commandes pour les figures du skatepark doivent être accessibles, bouton interactif
   discret mais visible, petit ») : la vue dit laquelle des deux fiches (`help` : "rink" | "park") ; celle du park se construit sur
   la monture montée ou louée (`kind`, les noms de ses figures `t`), au doigt elle nomme les BOUTONS (`touch`), et monté au doigt
   le rond monte au-dessus des boutons de la monture (`up`). Le park et la patinoire se succèdent sur la place : jamais les deux.
   ⚠️ UN COMPOSANT À PART (comme `CourseHud`) : il ne lit qu'une VUE (`getVM()`, ~4 fois par seconde) et ne fait re-rendre que
   lui — pas les quarante mille lignes de `FermeGame`. Il ne prend ni le clavier ni la souris du jeu : le papier se lit EN
   PATINANT (les touches restent au jeu), et le bouton refuse le focus — sinon Espace, la touche du saut, le rouvrirait.
   ⚠️ La vue est un objet NEUF à chaque lecture : on la compare par sa forme sérialisée (petite), sans quoi le composant se
   re-rendrait quatre fois par seconde pour rien.
   Les lignes viennent de `L.skateHelpRows` et `L.parkHelpRows` ([touches, texte]) : un texte de plus se règle dans
   `fermeStrings.js` (une touche préfixée de « + » se lit « avec la précédente », de « › » « puis », sinon « ou »).
   ========================================================================== */
import { useEffect, useState } from "react";

export default function SkateHelp({ getVM, L }) {
  const [vm, setVm] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let key = "";
    const id = setInterval(() => {
      let v = null;
      try { v = getVM(); } catch (e) { v = null; }
      const k = v && v.show ? JSON.stringify(v) : "";
      if (k !== key) { key = k; setVm(k ? v : null); }
    }, 250);
    return () => clearInterval(id);
  }, [getVM]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.code === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!vm) return null;
  const park = vm.help === "park";
  const tip = park ? L.parkHelpTip : L.skateHelpTip;
  const title = park ? L.parkHelpTitle(vm.kind ? L.parkKindName(vm.kind) : "") : L.skateHelpTitle;
  const rows = park ? L.parkHelpRows(vm.t, !!vm.touch) : L.skateHelpRows;
  const note = park ? L.parkHelpNote(!!vm.kind) : L.skateHelpNote;
  const sep = (k) => (k.startsWith("+") ? "+" : k.startsWith("›") ? L.helpThen : "/");
  const up = vm.up ? " up" : "";
  return (
    <>
      <button type="button" className={"ferme-skhelp-btn" + up + (open ? " on" : "")} title={tip} aria-label={tip} aria-expanded={open}
        tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen((o) => !o)}>?</button>
      {open && (
        <div className={"ferme-skhelp panel" + up} role="dialog" aria-label={title}>
          <button type="button" className="ferme-close-x" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen(false)}>✕</button>
          <h3>{title}</h3>
          <div className="ferme-skhelp-rows">
            {rows.map(([keys, txt], i) => (
              <div className="row" key={i}>
                <span className="keys">{keys.map((k, j) => <span key={j}>{j > 0 && <i>{sep(k)}</i>}<kbd>{k.replace(/^[+›]/, "")}</kbd></span>)}</span>
                <span className="txt">{txt}</span>
              </div>
            ))}
          </div>
          <div className="ferme-skhelp-note">{note}</div>
        </div>
      )}
    </>
  );
}
