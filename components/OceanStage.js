"use client";
import { useEffect, useRef, useState } from "react";
import { SYNC_MAX_WAIT_MS } from "@/lib/gameSync";
import GameRulesButton from "./GameRulesButton";

/* ==========================================================================
   OceanStage — habillage de présentation "océan" pour la Bataille navale, en
   remplacement du lever de rideau (CurtainStage). Calqué sur DoorStage/
   CurtainStage (mêmes états, même cycle de vie synchronisé via stageLaunchAt),
   mais NE TOUCHE PAS aux autres stages — composant à part.

   Déroulé voulu par Guillaume (2026-07) :
     - écran d'ATTENTE ('closed') : un sonar tourne en veille (scope circulaire
       dessiné au canvas : anneaux de portée, réticule, balayage à traîne,
       contacts qui s'illuminent au passage du faisceau) ;
     - au clic "Jouer" ('opening') : la mer MONTE et recouvre le sonar, puis un
       POISSON fait un zoom rapide vers la caméra à la toute fin ;
     - 'open' : le jeu réel est monté (animation d'entrée povPush à chaque
       ouverture).

   Le sonar/vague/poisson sont purement décoratifs (aucun enjeu réseau) ; seul
   le DÉCLENCHEMENT de l'ouverture est synchronisé (stageLaunchAt), exactement
   comme CurtainStage.
   ========================================================================== */

const OPEN_ANIM_MS = 1550;  // durée mer + poisson avant de monter le jeu
// Contacts sonar (relèvement en rad, portée 0..1) — décor fixe.
const CONTACTS = [{ a: -0.6, r: .55 }, { a: 1.1, r: .72 }, { a: 2.4, r: .4 }, { a: 3.6, r: .66 }, { a: 4.9, r: .5 }];

export default function OceanStage({ gameId, icon, name, accentVar, lang, t, children, onRulesOpenChange, rulesReaderNames, isHost, stageLaunchAt, onHostOpen }) {
  const [state, setState] = useState("closed"); // 'closed' | 'opening' | 'open'
  const [entryKey, setEntryKey] = useState(0);
  const openTimer = useRef(null);
  const waitTimer = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    clearTimeout(openTimer.current); clearTimeout(waitTimer.current);
    setState("closed");
  }, [gameId]);

  useEffect(() => () => {
    clearTimeout(openTimer.current); clearTimeout(waitTimer.current); cancelAnimationFrame(rafRef.current);
  }, []);

  // Sonar en veille (et sous la vague pendant l'ouverture) tant que non ouvert.
  useEffect(() => {
    if (state === "open") return;
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const DPR = Math.max(1, window.devicePixelRatio || 1);
    function size() { const r = cv.getBoundingClientRect(); cv.width = Math.max(1, Math.round(r.width * DPR)); cv.height = Math.max(1, Math.round(r.height * DPR)); }
    size();
    let sweep = 0, last = performance.now();
    function draw(now) {
      const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
      sweep = (sweep + dt * 1.7) % (Math.PI * 2);
      const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.42;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#02100a"; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(cx, cy);
      ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.closePath();
      const bg = ctx.createRadialGradient(0, 0, 4, 0, 0, R); bg.addColorStop(0, "#0a3a24"); bg.addColorStop(1, "#031a10");
      ctx.fillStyle = bg; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.strokeStyle = "rgba(90,255,170,.28)"; ctx.lineWidth = 1 * DPR;
      for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(0, 0, R * i / 4, 0, 7); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-R, 0); ctx.lineTo(R, 0); ctx.moveTo(0, -R); ctx.lineTo(0, R); ctx.stroke();
      for (let d = 0; d < 360; d += 15) {
        const a = d * Math.PI / 180, inner = (d % 90 === 0) ? R * 0.90 : R * 0.95;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
        ctx.strokeStyle = "rgba(90,255,170,.4)"; ctx.lineWidth = (d % 90 === 0 ? 1.6 : 0.8) * DPR; ctx.stroke();
      }
      const TRAIL = 1.1, STEPS = 46;
      for (let i = 0; i < STEPS; i++) {
        const a0 = sweep - (i / STEPS) * TRAIL, a1 = sweep - ((i + 1) / STEPS) * TRAIL;
        const al = (1 - i / STEPS) * 0.33;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0, a1, true); ctx.closePath();
        ctx.fillStyle = "rgba(75,255,150," + al.toFixed(3) + ")"; ctx.fill();
      }
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(sweep) * R, Math.sin(sweep) * R);
      ctx.strokeStyle = "rgba(160,255,200,.95)"; ctx.lineWidth = 1.6 * DPR; ctx.stroke();
      CONTACTS.forEach(c => {
        let diff = sweep - c.a; diff = ((diff % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const glow = Math.max(0, 1 - diff / 1.8);
        const bx = Math.cos(c.a) * R * c.r, by = Math.sin(c.a) * R * c.r;
        ctx.beginPath(); ctx.arc(bx, by, (3 + glow * 3) * DPR, 0, 7);
        ctx.fillStyle = "rgba(150,255,200," + (0.25 + glow * 0.75).toFixed(3) + ")";
        ctx.shadowColor = "rgba(120,255,190," + glow.toFixed(2) + ")"; ctx.shadowBlur = glow * 14 * DPR; ctx.fill(); ctx.shadowBlur = 0;
      });
      ctx.restore();
      ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.strokeStyle = "rgba(120,255,190,.5)"; ctx.lineWidth = 2.4 * DPR; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, R + 5 * DPR, 0, 7); ctx.strokeStyle = "rgba(255,255,255,.08)"; ctx.lineWidth = 6 * DPR; ctx.stroke();
      ctx.fillStyle = "rgba(150,255,200,.75)"; ctx.font = (12 * DPR) + "px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("N", 0, -R - 14 * DPR); ctx.fillText("S", 0, R + 14 * DPR); ctx.fillText("E", R + 14 * DPR, 0); ctx.fillText("O", -R - 14 * DPR, 0);
      ctx.restore();
      ctx.fillStyle = "rgba(150,255,200,.7)"; ctx.font = (11 * DPR) + "px ui-monospace,monospace"; ctx.textAlign = "left";
      ctx.fillText("SONAR ACTIF", 12 * DPR, 20 * DPR);
      ctx.fillText("RELEVEMENT " + String(Math.round(sweep * 180 / Math.PI)).padStart(3, "0") + " DEG", 12 * DPR, H - 14 * DPR);
      rafRef.current = requestAnimationFrame(draw);
    }
    const onResize = () => size();
    window.addEventListener("resize", onResize);
    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", onResize); };
  }, [state]);

  // Ouverture synchronisée : même mécanisme exact que CurtainStage/DoorStage
  // (attente bornée par SYNC_MAX_WAIT_MS, hôte ouvre son écran sans délai).
  const prevLaunchRef = useRef(stageLaunchAt);
  useEffect(() => {
    const prev = prevLaunchRef.current;
    prevLaunchRef.current = stageLaunchAt;
    clearTimeout(waitTimer.current);
    if (!stageLaunchAt || state !== "closed") return;
    const raw = new Date(stageLaunchAt).getTime() - Date.now();
    const justLaunched = !prev;
    if (raw <= 0 && !justLaunched) { setState("open"); setEntryKey(k => k + 1); return; }
    const delay = isHost && justLaunched ? 0 : Math.max(0, Math.min(raw, SYNC_MAX_WAIT_MS));
    waitTimer.current = setTimeout(() => {
      setState("opening");
      openTimer.current = setTimeout(() => { setState("open"); setEntryKey(k => k + 1); }, OPEN_ANIM_MS);
    }, delay);
    return () => clearTimeout(waitTimer.current);
  }, [stageLaunchAt, state, isHost]);

  const closed = state !== "open";
  const opening = state === "opening";

  return (
    <div className="door-wrap" style={{ "--accent": `var(${accentVar})` }}>
      {closed && (
        <div className={"door-title-top" + (opening ? " hidden" : "")}>
          <span className="door-title-icon">{icon}</span>
          <span className="door-title-name">{name}</span>
        </div>
      )}

      <div className="ocean-stage">
        <GameRulesButton gameId={gameId} lang={lang} accentVar={accentVar} onOpenChange={onRulesOpenChange} />
        {closed && (
          <>
            <canvas ref={canvasRef} className="ocean-sonar" />
            <div className={"ocean-sea" + (opening ? " rise" : "")}>
              <div className="ocean-body" />
              <svg className="ocean-crest back" viewBox="0 0 1200 46" preserveAspectRatio="none"><path d="M0 28 Q150 8 300 28 T600 28 T900 28 T1200 28 V46 H0Z" fill="#1d7099" /></svg>
              <svg className="ocean-crest front" viewBox="0 0 1200 46" preserveAspectRatio="none"><path d="M0 26 Q150 46 300 26 T600 26 T900 26 T1200 26 V46 H0Z" fill="#2b86b0" /><path d="M0 26 Q150 46 300 26 T600 26 T900 26 T1200 26" fill="none" stroke="#dff3ff" strokeWidth="3" opacity=".55" /></svg>
            </div>
            {opening && (
              <div className="ocean-fishwrap">
                <svg className="ocean-fish" viewBox="0 0 140 80">
                  <defs><linearGradient id="oceanFishGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fd3ea" /><stop offset="1" stopColor="#2c6f92" /></linearGradient></defs>
                  <path d="M8 40 Q28 8 78 16 Q112 22 128 40 Q112 58 78 64 Q28 72 8 40Z" fill="url(#oceanFishGrad)" stroke="#0c2a3a" strokeWidth="2" />
                  <path d="M118 40 L140 22 L136 40 L140 58 Z" fill="#2c6f92" stroke="#0c2a3a" strokeWidth="2" />
                  <path d="M56 20 Q64 6 78 14 Z" fill="#57a9c9" />
                  <path d="M56 60 Q64 74 78 66 Z" fill="#57a9c9" />
                  <circle cx="30" cy="36" r="6" fill="#fff" /><circle cx="30" cy="36" r="3" fill="#0c2a3a" />
                </svg>
              </div>
            )}
          </>
        )}
        {state === "open" && (
          <div className="ocean-content" key={entryKey}>{children}</div>
        )}
      </div>

      {closed && (
        <div className={"door-play-wrap" + (opening ? " hidden" : "")}>
          {rulesReaderNames && rulesReaderNames.length > 0 && (
            <p className="rules-reading-banner">
              ⏳ {rulesReaderNames.join(", ")} {t ? t(rulesReaderNames.length > 1 ? "rulesReadingPlural" : "rulesReadingSingle") : "is reading the rules — please wait…"}
            </p>
          )}
          {isHost ? (
            <button className="ocean-play-btn" onClick={onHostOpen} disabled={!!stageLaunchAt}>{t ? t("stagePlay") : "▶ Jouer"}</button>
          ) : (
            <p className="stage-wait-host">{t ? t("stageWaitHost") : "Waiting for the host…"}</p>
          )}
        </div>
      )}
    </div>
  );
}
