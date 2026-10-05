"use client";
// ÉCHAFAUDAGE JETABLE — harnais DEUX CLIENTS (2026-10-05). À SUPPRIMER avant livraison (docs/VERIFICATION.md §10).
// Monte l'hôte (p=1) puis l'invité (p=2) dans deux iframes same-origin, même salon, à la taille d'écran voulue.
// Pilotage : depuis cette page, `window.A.contentWindow` (hôte) et `window.B.contentWindow` (invité).
import { useEffect, useRef, useState } from "react";

export default function AuditDuo() {
  const [go2, setGo2] = useState(false);
  /* ⚠️ 2026-10-05 (nuit) — LE SALON SE LIT APRÈS LE MONTAGE. Calculé pendant le rendu, il l'était aussi au rendu SERVEUR,
     où l'URL n'existe pas : l'iframe de l'hôte partait avec le salon de secours horodaté, l'invitée avec le bon — deux
     salons, et l'invitée attendait pour toujours un instantané (vu au relais en mode bavard, `fake-supabase-verbose`). */
  const [cfg, setCfg] = useState(null);
  const a = useRef(null), b = useRef(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setCfg({ room: q.get("room") || "duo-" + Math.floor(Date.now() / 1000), W: +(q.get("w") || 640), H: +(q.get("h") || 400) });
  }, []);
  useEffect(() => {
    if (!cfg) return undefined;
    window.A = a.current;
    // L'invité n'est monté qu'APRÈS l'hôte (un `join` envoyé avant l'abonnement de l'autre est perdu).
    const t = setTimeout(() => setGo2(true), 4000);
    return () => clearTimeout(t);
  }, [cfg]);
  useEffect(() => { if (go2) window.B = b.current; }, [go2]);
  if (!cfg) return null;
  const { room, W, H } = cfg;
  const st = { border: 0, width: W, height: H, background: "#000" };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", background: "#222", minHeight: "100vh" }}>
      <iframe ref={a} title="hote" style={st} src={`/audit-tmp?p=1&room=${room}`} />
      {go2 && <iframe ref={b} title="invite" style={st} src={`/audit-tmp?p=2&room=${room}`} />}
    </div>
  );
}
