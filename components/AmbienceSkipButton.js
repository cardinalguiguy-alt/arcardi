"use client";
import { useEffect } from "react";
import { skipAmbienceTrack } from "@/lib/ambience";
import { useLang } from "@/lib/i18n";

/* ==========================================================================
   AmbienceSkipButton — pastille discrète en bas à gauche pour passer à la
   piste d'ambiance suivante (voir lib/ambience.js). Quasi invisible au
   repos, révélée au survol sur les appareils avec un vrai pointeur ; sur
   tactile (pas de hover possible), reste visible à faible opacité pour
   rester atteignable au doigt.

   Empilée AU-DESSUS de .room-code-fab (même coin bas-gauche, visible
   seulement pendant une partie) : jamais de chevauchement, même si les deux
   venaient à s'afficher en même temps.

   Raccourci clavier : Cmd/Ctrl + Maj + 9. Choisi avec Chrome comme
   référence : sa propre documentation d'extensions recommande les
   combinaisons Ctrl/Cmd+Maj+[chiffre] comme les moins susceptibles d'entrer
   en conflit avec un raccourci navigateur ou système existant (les
   raccourcis natifs de Chrome/Safari utilisant des LETTRES : B, N, T, W,
   R…). On compare sur `e.code` (touche physique), pas `e.key`, car Maj
   change la valeur de `key` pour une touche chiffre (Maj+9 -> "(" sur
   clavier US) — comparer sur `key` aurait cassé le raccourci dès que Maj
   est réellement enfoncée.
   ========================================================================== */
export default function AmbienceSkipButton() {
  const { lang, t } = useLang();

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === "Digit9") {
        e.preventDefault();
        skipAmbienceTrack();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <button
      type="button"
      className="ambience-skip-btn"
      onClick={skipAmbienceTrack}
      title={t("ambienceSkipTitle")}
      aria-label={t("ambienceSkipTitle")}
    >
      ⏭
    </button>
  );
}
