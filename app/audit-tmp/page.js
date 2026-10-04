"use client";
// ÉCHAFAUDAGE JETABLE — audit 2026-10. À SUPPRIMER avant livraison (docs/VERIFICATION.md §10).
import { useEffect, useState } from "react";
import FermeGame from "@/components/ferme/FermeGame";

function installHelpers() {
  if (window.__auditReady) return;
  window.__auditReady = true;
  // Son coupé pendant l'audit (préférences + lecture forcée muette).
  try { localStorage.setItem("arcardi:soundEnabled", "0"); localStorage.setItem("arcardi:musicEnabled", "0"); } catch (e) {}
  const op = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return op.call(this); };
  const AC = window.AudioContext;
  if (AC) { const W = function (...a) { const c = new AC(...a); try { c.suspend(); } catch (e) {} c.resume = () => Promise.resolve(); return c; }; W.prototype = AC.prototype; window.AudioContext = W; window.webkitAudioContext = W; }
  // rAF par worker (VERIFICATION.md) : une file, vidée à 16 ms ; __paused fige l'image sans rien perdre.
  const q = [];
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  const w = new Worker(URL.createObjectURL(new Blob(["setInterval(()=>postMessage(0),16);"])));
  window.__frames = 0;
  w.onmessage = () => { if (window.__paused) return; window.__frames++; const t = performance.now(); const l = q.splice(0); for (const cb of l) { try { cb(t); } catch (e) { console.error(e); } } };
  window.__w = w;
  window.__main = () => [...document.querySelectorAll("canvas")].sort((a, b) => b.width * b.height - a.width * a.height)[0];
  window.__sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  window.__key = (code, ms = 0, opts = {}) => new Promise((res) => { window.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true, ...opts })); setTimeout(() => { window.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true, ...opts })); res(); }, ms); });
  window.__cap = async (name, scratch = true) => { const c = window.__main(); const data = c.toDataURL("image/png"); const r = await fetch("/api/audit-cap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, data, scratch }) }); return r.status + " " + c.width + "x" + c.height; };
  window.__fgFind = () => { const c = window.__main(); const k = Object.keys(c).find((k) => k.startsWith("__reactFiber")); let f = c[k]; while (f) { if (f.type && f.type.name === "FermeGame") return (window.__fg = f); f = f.return; } return null; };
  // Heure de jeu forcée (VERIFICATION.md : le jeu lit Date.now ; 800 ms réelles = 1 min de jeu).
  const rn = Date.now.bind(Date); window.__toff = 0; Date.now = () => rn() + window.__toff;
  window.__setHour = (H) => { const sh = window.__hook(310).current; const target = sh.dayStartAt + (H * 60 - 360) / 1200 * 960000; window.__toff = target - rn(); return window.__toff; };
  window.__join = () => { const b = [...document.querySelectorAll("button")].find((x) => /Rejoindre la ferme/.test(x.textContent)); if (b) b.click(); return !!b; };
  window.__ensureJoined = async () => { for (let i = 0; i < 40; i++) { const big = window.__main(); if (big && big.width > 200) { await window.__sleep(1500); window.__fg = null; window.__fgFind(); return true; } window.__join(); await window.__sleep(700); } return false; };
  window.__devMenu = async (open) => { const isOpen = !!document.querySelector(".ferme-dev-btn"); if (isOpen !== open) { window.dispatchEvent(new KeyboardEvent("keydown", { code: open ? "KeyX" : "Escape", key: open ? "x" : "Escape", metaKey: open, shiftKey: open, bubbles: true })); await window.__sleep(400); } };
  window.__btn = async (label) => { await window.__devMenu(true); const b = [...document.querySelectorAll(".ferme-dev-btn")].find((x) => x.textContent.trim() === label); if (b) b.click(); await window.__sleep(300); await window.__devMenu(false); return !!b; };
  window.__waitZoom = async () => { for (let i = 0; i < 30; i++) { const v = window.__hook(302).current.v; if (Math.abs(v - Math.round(v)) < 1e-9) { await window.__sleep(150); if (window.__hook(302).current.v === v) return v; } await window.__sleep(100); } return -1; };
  window.__tp = (key) => { window.__hook(306).current = { active: true, t0: performance.now(), toEvil: false, swapped: false, dest: "dev:" + key }; };
  window.__scene = async (tp, x, y, zoom, hour, name, extra) => { if (tp) { window.__tp(tp); await window.__sleep(3300); } const m = window.__hook(307).current; if (x != null) { m.x = x; m.y = y; m.dir = 0; m.moving = false; } window.__hook(304).current = zoom; window.__setHour(hour); await window.__sleep(1800); if (extra) await extra(); window.__paused = true; await window.__sleep(50); const r = await window.__cap(name, false); window.__paused = false; return r; };
  // Les indices ci-dessus sont relatifs à `sharedRef` (310 au 2026-10-04) : retrouvé à chaque appel, un hook ajouté plus haut ne décale plus rien.
  window.__hookRaw = (i) => { let h = (window.__fg || window.__fgFind()).memoizedState; for (let j = 0; j < i; j++) h = h.next; return h.memoizedState; };
  window.__sharedIdx = () => { let h = (window.__fg || window.__fgFind()).memoizedState, i = 0; while (h) { const v = h.memoizedState; if (v && v.current && typeof v.current === "object" && "seed" in v.current && "star" in v.current) return i; i++; h = h.next; } return 310; };
  window.__hook = (i) => window.__hookRaw(i - 310 + window.__sharedIdx());
}

export default function AuditTmpPage() {
  const [who, setWho] = useState(null);
  useEffect(() => {
    installHelpers();
    const q = new URLSearchParams(window.location.search);
    setWho({ p: q.get("p") === "2" ? 2 : 1, room: q.get("room") || "audit-room" });
  }, []);
  if (!who) return null;
  const players = [
    { profile_id: "p1", username: "Hote", joined_at: 1 },
    { profile_id: "p2", username: "Amie", joined_at: 2 },
  ];
  const me = who.p === 2 ? { id: "p2", username: "Amie" } : { id: "p1", username: "Hote" };
  return (
    <FermeGame
      room={{ id: who.room }}
      me={me}
      players={who.p === 2 ? players : [players[0]]}
      isHost={who.p === 1}
      savedCode="XXXX"
    />
  );
}
