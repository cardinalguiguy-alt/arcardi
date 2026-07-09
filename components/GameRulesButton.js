"use client";
import { useState } from "react";
import { GAME_RULES } from "@/lib/gameRules";

/* ==========================================================================
   GameRulesButton — bouton discret "i" (règles du jeu), présent dans les 4
   stages (Door/Curtain/Flash/VideoStage) au même endroit que le bouton
   "revoir l'entrée" (coin opposé), donc disponible dans TOUS les jeux sans
   avoir à toucher chacun d'eux individuellement.

   Purement une couche de présentation LOCALE au client, comme les stages
   eux-mêmes : n'affecte jamais rien de l'état de partie réel ni du réseau.
   Contenu bilingue FR/EN dans lib/gameRules.js — repli silencieux (aucun
   bouton affiché) si un jeu n'a pas encore de fiche de règles.
   ========================================================================== */
export default function GameRulesButton({ gameId, lang }) {
  const [open, setOpen] = useState(false);
  const rules = GAME_RULES[gameId];
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
      {open && (
        <div className="rules-modal-overlay" onClick={() => setOpen(false)}>
          <div className="rules-modal" onClick={e => e.stopPropagation()}>
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
        </div>
      )}
    </>
  );
}
