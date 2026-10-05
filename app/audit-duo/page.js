"use client";
// ÉCHAFAUDAGE JETABLE — harnais DEUX CLIENTS (2026-10-05). À SUPPRIMER avant livraison (docs/VERIFICATION.md §10).
// Monte l'hôte (p=1) puis l'invité (p=2) dans deux iframes same-origin, même salon, à la taille d'écran voulue.
// Pilotage : depuis cette page, `window.A.contentWindow` (hôte) et `window.B.contentWindow` (invité).
import { useEffect, useRef, useState } from "react";

export default function AuditDuo() {
  const [go2, setGo2] = useState(false);
  const a = useRef(null), b = useRef(null);
  const q = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const room = q.get("room") || "duo-" + Math.floor(Date.now() / 1000);
  const W = +(q.get("w") || 640), H = +(q.get("h") || 400);
  useEffect(() => {
    window.A = a.current; window.B = b.current;
    // L'invité n'est monté qu'APRÈS l'hôte (un `join` envoyé avant l'abonnement de l'autre est perdu).
    const t = setTimeout(() => setGo2(true), 4000);
    return () => clearTimeout(t);
  }, []);
  const st = { border: 0, width: W, height: H, background: "#000" };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", background: "#222", minHeight: "100vh" }}>
      <iframe ref={a} title="hote" style={st} src={`/audit-tmp?p=1&room=${room}`} />
      {go2 && <iframe ref={b} title="invite" style={st} src={`/audit-tmp?p=2&room=${room}`} />}
    </div>
  );
}
