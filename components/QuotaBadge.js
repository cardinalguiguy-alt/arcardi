"use client";
import { useEffect, useState } from "react";
import { subscribeQuota, MONTHLY_QUOTA } from "@/lib/realtimeQuota";

/* ==========================================================================
   QUOTABADGE — indicateur discret de consommation Realtime.
   ==========================================================================
   Remplace l'alerte Supabase qui n'existe pas (voir l'en-tête de
   lib/realtimeQuota.js : le plan gratuit ne propose aucune notification de
   seuil, seulement un email APRÈS dépassement).

   Comportement voulu : invisible tant que tout va bien, visible dès que ça
   compte. En dessous de 60 % du quota mensuel estimé, le badge est un simple
   point de couleur quasi transparent ; au-delà, il s'affiche en clair avec le
   pourcentage. Un clic déplie le détail.

   Monté une seule fois, dans app/room/[code]/page.js.
   ========================================================================== */

export default function QuotaBadge() {
  const [snap, setSnap] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeQuota(setSnap), []);

  if (!snap || snap.messages === 0) return null;

  const pct = snap.ratio * 100;
  const color = snap.level === "danger" ? "#ff5a4d" : snap.level === "warn" ? "#ffb020" : "#4caf7d";
  // Discret au vert, franc à l'orange et au rouge.
  const quiet = snap.level === "ok";

  return (
    <div
      onClick={() => setOpen(o => !o)}
      title="Consommation Realtime estimée ce mois-ci — cliquer pour le détail"
      style={{
        position: "fixed",
        left: 8,
        bottom: 8,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: quiet ? "3px 6px" : "5px 9px",
        borderRadius: 999,
        background: quiet ? "rgba(0,0,0,.25)" : "rgba(0,0,0,.72)",
        border: "1px solid " + (quiet ? "rgba(255,255,255,.10)" : color),
        color: "#fff",
        font: "500 11px/1 system-ui, sans-serif",
        cursor: "pointer",
        opacity: quiet ? 0.42 : 1,
        userSelect: "none",
        transition: "opacity .25s, background .25s, padding .25s",
        pointerEvents: "auto",
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flex: "0 0 auto" }} />
      {!quiet && <span>{pct.toFixed(0)} % du quota Realtime</span>}
      {open && (
        <span style={{ marginLeft: 4, opacity: 0.75, fontWeight: 400 }}>
          ~{snap.messages.toLocaleString("fr-FR")} / {MONTHLY_QUOTA.toLocaleString("fr-FR")} msg · {snap.period}
          {" · "}estimation locale
        </span>
      )}
    </div>
  );
}
