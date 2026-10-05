"use client";
/* =============================================================================
   CourseHud.js — L'ÉCRAN DE LA COURSE DE LA PATINOIRE (2026-10-05, nuit).
   -----------------------------------------------------------------------------
   « Bien travailler l'UI de la course multijoueur » (Guillaume) — le Mario Party 5 de *Later Skater* : un compte à
   rebours qui claque, le tour et le chrono toujours lisibles, sa place dans la course, une mini-carte où l'on voit
   tout le monde, « DERNIER TOUR », l'arrivée, un podium, les records.
   ⚠️ UN COMPOSANT À PART, QUI SE REDESSINE SEUL (son propre `requestAnimationFrame`, ~20 images/s) : un chrono qui
   tourne au centième dans l'état de `FermeGame` ferait re-rendre ses quarante mille lignes vingt fois par seconde.
   Il ne lit qu'une VUE (`getVM()`, calculée par le jeu à la demande) et ne fait que deux choses : afficher, et
   renvoyer les gestes (rejoindre, quitter, partir, fermer).
   Le style vit dans `app/globals.css` (`.ferme-race-*`) : le papier et le bois du reste de la ferme, en plus vif.
   ========================================================================== */
import { useEffect, useRef, useState } from "react";

const COLORS = ["#e0483d", "#3f7fd0", "#46a35a", "#e2b23a"];
const MEDAL = ["🥇", "🥈", "🥉"];
const fmt = (ms) => {
  if (ms == null || !isFinite(ms)) return "—";
  const t = Math.max(0, Math.round(ms / 10)), cs = t % 100, s = Math.floor(t / 100) % 60, m = Math.floor(t / 6000);
  return `${m}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
};

function MiniMap({ map }) {
  if (!map) return null;
  const W = 132, H = 140, pad = 8, iw = W - 2 * pad, ih = H - 2 * pad;
  const X = (u) => pad + u * iw, Y = (v) => pad + v * ih;
  return (
    <svg className="ferme-race-map" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect x={pad - 3} y={pad - 3} width={iw + 6} height={ih + 6} rx={map.r * iw + 3} fill="#b5332e" />
      <rect x={pad} y={pad} width={iw} height={ih} rx={map.r * iw} fill="#dfeaf3" />
      <rect x={X(map.island.x0)} y={Y(map.island.y0)} width={(map.island.x1 - map.island.x0) * iw} height={(map.island.y1 - map.island.y0) * ih}
        rx={map.island.r * iw} fill="none" stroke="#f07a2a" strokeWidth="2" strokeDasharray="3 3" />
      <line x1={X(map.line.x)} y1={Y(map.line.y0)} x2={X(map.line.x)} y2={Y(map.line.y1)} stroke="#1c1e24" strokeWidth="2" strokeDasharray="2 2" />
      {map.dots.map((d, i) => (
        <g key={i}>
          {d.me && <circle cx={X(d.u)} cy={Y(d.v)} r="7.5" fill="none" stroke="#fff" strokeWidth="2" />}
          <circle cx={X(d.u)} cy={Y(d.v)} r={d.ghost ? 4 : 5} fill={d.ghost ? "rgba(255,255,255,0.55)" : COLORS[d.lane % 4]} stroke={d.ghost ? "#8ab" : "#222"} strokeWidth="1.2" />
        </g>
      ))}
    </svg>
  );
}

export default function CourseHud({ getVM, L, onJoin, onLeave, onGo, onCloseResults }) {
  const [vm, setVm] = useState(null);
  const raf = useRef(0), last = useRef(0);
  useEffect(() => {
    const tick = (t) => {
      raf.current = requestAnimationFrame(tick);
      if (t - last.current < 48) return;
      last.current = t;
      try { setVm(getVM()); } catch (e) { setVm(null); }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [getVM]);
  if (!vm) return null;

  /* ── L'ATTENTE : un bandeau pour toute la ville ── */
  if (vm.state === "lobby") {
    return (
      <div className="ferme-race-lobby panel">
        <div className="ferme-race-lobby-title">🏁 {L.raceLobbyTitle(vm.owner)}</div>
        <div className="ferme-race-lobby-row">
          {[0, 1, 2, 3].map((k) => {
            const e = vm.ent[k];
            return <span key={k} className={"ferme-race-slot" + (e ? " on" : "") + (e && e.me ? " me" : "")} style={{ borderColor: COLORS[k] }}>
              <i style={{ background: COLORS[k] }} />{e ? e.name : L.raceSlotBot}</span>;
          })}
        </div>
        <div className="ferme-race-lobby-row small">{L.raceLobbyStart(Math.ceil(vm.lobbyLeft / 1000), vm.laps)}</div>
        <div className="ferme-race-lobby-row">
          {!vm.mine && <button className="ferme-btn" disabled={!vm.canJoin} onClick={onJoin} title={vm.canJoin ? "" : L.raceJoinWhy(vm.hasSkates, vm.near, vm.full)}>{L.raceJoin}</button>}
          {vm.mine && vm.isOwner && <button className="ferme-btn" onClick={onGo}>{L.raceGo}</button>}
          {vm.mine && <button className="ferme-btn ferme-btn-ghost" onClick={onLeave}>{vm.isOwner ? L.raceCancel : L.raceLeave}</button>}
        </div>
      </div>
    );
  }

  /* ── LES RÉSULTATS ── */
  if (vm.state === "done" && vm.results) {
    if (!vm.showResults) return null;
    return (
      <div className="ferme-race-results-wrap" onClick={onCloseResults}>
        <div className="ferme-race-results panel" onClick={(e) => e.stopPropagation()}>
          <div className="ferme-race-results-title">{vm.mode === "tt" ? "⏱️ " + L.raceTtResults : "🏁 " + L.raceResults}</div>
          {vm.newRec && <div className="ferme-race-record">✨ {L.raceNewRecord} ✨</div>}
          <div className="ferme-race-table">
            {vm.results.map((e) => (
              <div key={e.id} className={"ferme-race-line" + (e.me ? " me" : "") + (e.rank <= 3 ? " podium r" + e.rank : "")}>
                <span className="rk">{e.rank <= 3 && e.ms != null ? MEDAL[e.rank - 1] : e.rank + "."}</span>
                <i style={{ background: COLORS[(e.lane | 0) % 4] }} />
                <span className="nm">{e.name}{e.bot ? <em> · {L.raceBot}</em> : null}</span>
                <span className="tm">{e.ms == null ? L.raceDnf : fmt(e.ms)}</span>
              </div>
            ))}
          </div>
          {vm.recList && vm.recList.length > 0 && (
            <div className="ferme-race-recs">
              <b>{L.raceRecords}</b>
              {vm.recList.map((r, i) => <span key={i}>{i + 1}. {r.name} — {fmt(r.ms)}</span>)}
            </div>
          )}
          <button className="ferme-btn" onClick={onCloseResults}>{L.raceClose}</button>
        </div>
      </div>
    );
  }

  if (vm.state !== "race") return null;
  /* ── LE SPECTATEUR : une ligne discrète ── */
  if (!vm.mine) {
    return (
      <div className="ferme-race-spect panel">
        🏁 {L.raceOngoing} — {vm.live && vm.live.slice(0, 4).map((e, i) => <span key={i} style={{ color: COLORS[e.lane % 4] }}>{i + 1}. {e.name} </span>)}
      </div>
    );
  }
  /* ── LE COUREUR ── */
  const countTxt = vm.count == null ? null : vm.count > 0 ? String(vm.count) : L.raceGoWord;
  return (
    <>
      <div className="ferme-race-top panel">
        <div className="cell"><span className="lbl">{L.raceLap}</span><span className="big">{vm.lap}<small>/{vm.laps}</small></span></div>
        <div className="cell chrono"><span className="lbl">⏱</span><span className="big mono">{fmt(vm.chrono)}</span>
          {vm.record && <span className="sub">{L.raceRecordShort} {fmt(vm.record.ms)}</span>}</div>
        {vm.mode === "race" && <div className="cell"><span className="lbl">{L.racePlace}</span><span className={"big place p" + vm.rank}>{vm.rank || "–"}<small>{L.raceOrd(vm.rank)}/{vm.of}</small></span></div>}
      </div>
      {vm.lapTimes.length > 0 && (
        <div className="ferme-race-laps panel">
          {vm.lapTimes.map((t, i) => <span key={i} className={t === Math.min(...vm.lapTimes) ? "best" : ""}>{L.raceLapN(i + 1)} {fmt(t)}</span>)}
        </div>
      )}
      <MiniMap map={vm.map} />
      {vm.mode === "race" && vm.live && (
        <div className="ferme-race-board panel">
          {vm.live.map((e, i) => <div key={i} className={e.me ? "me" : ""}><b>{i + 1}</b><i style={{ background: COLORS[e.lane % 4] }} />{e.name}</div>)}
        </div>
      )}
      {vm.draft > 0.15 && !vm.finished && <div className="ferme-race-draft">💨 {L.raceDraft}</div>}
      {countTxt && <div key={"c" + countTxt} className={"ferme-race-count" + (vm.count === 0 ? " go" : "")}>{countTxt}</div>}
      {vm.lastLap && vm.lapFlash && <div key={"ll" + vm.lap} className="ferme-race-flash last">{L.raceLastLap}</div>}
      {!vm.lastLap && vm.lapFlash && !vm.finished && <div key={"lf" + vm.lap} className="ferme-race-flash">{L.raceLapN(vm.lap)}</div>}
      {vm.finished && <div className="ferme-race-finish"><span>{L.raceFinish}</span>{vm.mode === "race" && vm.rank ? <b>{vm.rank}{L.raceOrd(vm.rank)}</b> : <b>{fmt(vm.chrono)}</b>}</div>}
    </>
  );
}
