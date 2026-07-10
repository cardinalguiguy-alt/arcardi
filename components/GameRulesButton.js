"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GAME_RULES } from "@/lib/gameRules";

/* ==========================================================================
   GameRulesButton — bouton discret "i" (règles du jeu), présent dans les 4
   stages (Door/Curtain/Flash/VideoStage), rendu désormais que la porte soit
   FERMÉE ou OUVERTE (voir chaque Stage) : les règles sont donc consultables
   dès l'écran "Jouer", avant même que la partie ne démarre — pas seulement
   une fois dedans.

   Purement une couche de présentation LOCALE au client, comme les stages
   eux-mêmes : n'affecte jamais rien de l'état de partie réel. `onOpenChange`
   (optionnel) est la SEULE chose qui sort de ce composant vers l'extérieur —
   un simple booléen "la fiche est ouverte/fermée", que la page room utilise
   pour prévenir les autres (dont l'hôte) via la présence Supabase déjà en
   place ("untel consulte les règles, veuillez patienter"), voir page.js.

   CORRECTIF (bug de coupure/alignement) : la modale était rendue à
   l'intérieur de .door-content/.curtain-content/.flash-content, qui portent
   tous une animation d'entrée se terminant sur `transform:scale(1)`
   (animation-fill-mode:both). Or un ANCÊTRE avec un `transform` non-"none"
   devient le "containing block" de tout descendant en `position:fixed` —
   la modale (censée couvrir tout l'écran) se retrouvait donc contrainte À
   L'INTÉRIEUR de ce petit cadre, et carrément rognée par le
   `overflow:hidden` du cadre en bois (.door-stage) autour. Un portail React
   vers `document.body` fait sortir la modale de cette hiérarchie une fois
   pour toutes, quoi qu'il arrive ailleurs dans les stages.

   Contenu bilingue FR/EN dans lib/gameRules.js — repli silencieux (aucun
   bouton affiché) si un jeu n'a pas encore de fiche de règles.
   ========================================================================== */
export default function GameRulesButton({ gameId, lang, onOpenChange, accentVar }) {
  const [open, setOpen] = useState(false);
  const rules = GAME_RULES[gameId];

  // Prévient le parent (page room) à chaque changement d'état, ET à coup
  // sûr si ce bouton disparaît pendant que la fiche était ouverte (ex.
  // l'hôte relance un autre jeu pendant que quelqu'un lisait encore) — sans
  // ça, le "untel consulte les règles" resterait affiché indéfiniment aux
  // autres joueurs.
  useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);
  useEffect(() => () => onOpenChange?.(false), []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!rules) return null;
  const r = rules[lang] || rules.fr;

  return (
    <>
      <button
        type="button"
        className="rules-info-btn"
        onClick={() => setOpen(true)}
        title={r.title}
        aria-label={r.title}
      >
        i
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div className="rules-modal-overlay" onClick={() => setOpen(false)}>
          <div
            className="rules-modal"
            onClick={e => e.stopPropagation()}
            style={accentVar ? { "--accent": `var(${accentVar})` } : undefined}
          >
            <button type="button" className="rules-modal-close" onClick={() => setOpen(false)} aria-label="×">×</button>
            <h2 className="rules-modal-title">{r.title}</h2>
            {r.intro && <p className="rules-modal-intro">{r.intro}</p>}
            {(r.sections || []).map((sec, i) => (
              <div className="rules-modal-section" key={i}>
                <h3>{sec.h}</h3>
                <ul>
                  {sec.items.map((it, j) => <li key={j}>{it}</li>)}
                </ul>
              </div>
            ))}
            {r.table && (
              <table className="rules-table">
                {r.table.headers && (
                  <thead>
                    <tr>{r.table.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
                  </thead>
                )}
                <tbody>
                  {r.table.rows.map((row, i) => (
                    <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
