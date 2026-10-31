"use client";
/* =============================================================================
   BouloHud.js — L'ÉCRAN D'UNE PARTIE DE BOULES (2026-10-31, lot 3 du boulodrome).
   -----------------------------------------------------------------------------
   Les recommandations du lot 3 (docs/PROJETS.md §11) : l'ARDOISE à la craie en haut de l'écran — les scores, la mène, qui
   joue, les boules qui restent à chacun (de petites boules à sa couleur) ; le panneau qui OUVRE une partie (E au cercle d'une
   piste libre : le format, les points) ; la salle d'attente ; les quatre GESTES (touches 1 à 4, ou ces boutons) ; la pause ;
   la fin de partie et la REVANCHE. Ce qui se lit SUR LE TERRAIN (l'anneau du point, le « +2 », le guide, la jauge) est dessiné
   par le jeu, pas ici.
   ⚠️ Comme `CourseHud` : un composant à part qui se redessine seul (~20 images/s) depuis une VUE (`getVM`) que le jeu calcule à
   la demande — FermeGame ne re-rend pas pour une aiguille qui bouge. Le style : `app/globals.css` (`.ferme-boulo-*`).
   ========================================================================== */
import { useEffect, useRef, useState } from "react";

const GESTES = ["roulette", "demi", "plombee", "tir"];
const Boule = ({ col, vide }) => <i className={"ferme-boulo-dot" + (vide ? " vide" : "")} style={{ background: vide ? "transparent" : col, borderColor: col }} />;

export default function BouloHud({ getVM, L, act }) {
  const [vm, setVm] = useState(null);
  const [fmt, setFmt] = useState({ mode: "tat", cible: 13 });
  const [sure, setSure] = useState(false);
  const raf = useRef(0), last = useRef(0);
  useEffect(() => {
    const tick = (t) => {
      raf.current = requestAnimationFrame(tick);
      if (t - last.current < 50) return;
      last.current = t;
      try { setVm(getVM()); } catch (e) { setVm(null); }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [getVM]);
  if (!vm) return null;

  /* ── OUVRIR UNE PARTIE (E au cercle d'une piste libre) ── */
  if (vm.panel) {
    const set = (o) => setFmt((f) => ({ ...f, ...o }));
    return (
      <div className="ferme-boulo-open panel">
        <div className="ttl">🎯 {L.bouloOpenTitle(vm.panel.piste)}</div>
        <div className="row">
          {["tat", "trois", "solo"].map((m) => (
            <button key={m} className={"ferme-btn" + (fmt.mode === m ? "" : " ferme-btn-ghost")} onClick={() => set({ mode: m, cible: m === "trois" ? 7 : m === "solo" ? 13 : fmt.cible })}>{L.bouloFmt(m)}</button>
          ))}
        </div>
        {fmt.mode !== "solo" && (
          <div className="row">
            {[13, 7].map((c) => <button key={c} className={"ferme-btn" + (fmt.cible === c ? "" : " ferme-btn-ghost")} onClick={() => set({ cible: c })}>{L.bouloPts(c)}</button>)}
          </div>
        )}
        <div className="row small">{fmt.mode === "solo" ? L.bouloSoloHint : L.bouloOpenHint(fmt.mode === "trois" ? 3 : 2)}</div>
        <div className="row">
          <button className="ferme-btn" onClick={() => act.open(vm.panel.k, fmt.mode, fmt.cible)}>{fmt.mode === "solo" ? L.bouloSoloBtn : L.bouloOpenBtn}</button>
          <button className="ferme-btn ferme-btn-ghost" onClick={act.cancelPanel}>{L.bouloCancel}</button>
        </div>
      </div>
    );
  }
  /* ── L'INVITATION, pour qui est en ville sans jouer ── */
  if (!vm.sess) {
    if (!vm.invite) return null;
    return <div className="ferme-boulo-invite panel">🎯 {L.bouloInvite(vm.invite.name, L.bouloFmt(vm.invite.mode), vm.invite.piste)}</div>;
  }
  const s = vm.sess;
  /* ── LA SALLE D'ATTENTE ── */
  if (s.etat === "salle") {
    return (
      <div className="ferme-boulo-open panel">
        <div className="ttl">🎯 {L.bouloLobby(s.ent[0].name, L.bouloFmt(s.mode), s.cible)}</div>
        <div className="row">
          {Array.from({ length: s.requis }, (_, i) => {
            const e = s.ent[i];
            return <span key={i} className={"ferme-boulo-slot" + (e ? " on" : "") + (e && e.me ? " me" : "")}><Boule col={e ? e.col : "#999"} vide={!e} />{e ? e.name : L.bouloSlotFree}</span>;
          })}
        </div>
        <div className="row small">{s.owner ? (s.ent.length < s.requis ? L.bouloWaitOthers : L.bouloReady) : L.bouloWaitOwner(s.ent[0].name)}</div>
        <div className="row">
          {s.owner && <button className="ferme-btn" disabled={s.ent.length < s.requis} onClick={() => act.go(s.k)}>{L.bouloGo}</button>}
          <button className="ferme-btn ferme-btn-ghost" onClick={() => act.leave(s.k)}>{s.owner ? L.bouloCancel : L.bouloLeave}</button>
        </div>
      </div>
    );
  }
  const a = s.ardoise;
  if (!a) return null;
  const tourNom = a.joue ? (s.ent.find((e) => e.id === a.joue) || {}).name : null;
  const gagnant = a.gagnant != null ? a.camps[a.gagnant] : null;
  return (
    <>
      {/* ── L'ARDOISE ── */}
      <div className="ferme-boulo-ardoise">
        {s.mode === "solo" ? (
          <div className="line"><b>{L.bouloSolo}</b><span>{L.bouloMene(a.mene)}</span>
            <span>{a.meilleure != null ? L.bouloBest(a.meilleure) : "—"}</span>
            <span className="dots">{a.camps[0].joueurs[0] && Array.from({ length: 3 }, (_, i) => <Boule key={i} col={a.camps[0].joueurs[0].col} vide={i >= a.camps[0].joueurs[0].reste} />)}</span>
          </div>
        ) : (
          <div className="line">
            {a.camps.map((c, i) => (
              <span key={i} className={"camp" + (c.joueurs.some((j) => j.moi) ? " moi" : "") + (a.gagnant === i ? " gagne" : "")}>
                {c.joueurs.map((j) => <em key={j.id} style={{ color: j.col }}>{j.nom}</em>)}
                <b className="score">{c.score}</b>
                <span className="dots">{c.joueurs.map((j) => Array.from({ length: a.mode === "trois" ? 2 : 3 }, (_, n) => <Boule key={j.id + n} col={j.col} vide={n >= j.reste} />))}</span>
              </span>
            ))}
            <span className="mene">{L.bouloMene(a.mene)} · {L.bouloPts(a.cible)}</span>
          </div>
        )}
        <div className="sub">
          {s.coin ? L.bouloCoin(s.coin)
            : s.pauseNames ? (s.closable ? L.bouloClosable(s.pauseNames.join(", ")) : L.bouloPause(s.pauseNames.join(", "), Math.ceil((s.pauseLeft || 0) / 60000)))
            : gagnant ? (a.fanny ? "🎉 " + L.bouloFanny + " " : "🏆 ") + L.bouloWins(gagnant.joueurs.map((j) => j.nom).join(" & "), gagnant.score, Math.max(...a.camps.filter((c, i) => i !== a.gagnant).map((c) => c.score)))
            : s.busy ? "…"
            : a.moi ? (a.phase === "but" ? L.bouloYourBut : a.phase === "placer" ? L.bouloYourPlacer : L.bouloYourTurn)
            : tourNom ? L.bouloTurnOf(tourNom, a.phase) : ""}
        </div>
      </div>
      {/* ── LES GESTES, ET CE QUE FAIT LA TOUCHE MAINTENANT ── */}
      {s.visee && (
        <div className="ferme-boulo-gestes panel">
          {s.visee.etape === "geste" && GESTES.map((g, i) => <button key={g} className="ferme-btn" onClick={() => act.geste(g)}>{i + 1} · {L.bouloGeste(g)}</button>)}
          {s.visee.etape !== "geste" && <span className="hint">{s.visee.etape === "donnee" ? (s.visee.geste === "placer" ? L.bouloStepPlacer : L.bouloStepDonnee) : L.bouloStepJauge}</span>}
          {s.visee.etape !== "geste" && s.visee.geste && s.visee.geste !== "but" && s.visee.geste !== "placer" && <span className="geste">{L.bouloGeste(s.visee.geste)}</span>}
          {(s.visee.etape === "jauge" || (s.visee.etape === "donnee" && GESTES.includes(s.visee.geste))) && <button className="ferme-btn ferme-btn-ghost" onClick={act.back}>{L.bouloBack}</button>}
          {s.visee.etape === "geste" && <span className="hint">{L.bouloStepGeste}</span>}
        </div>
      )}
      {/* ── LA FIN, LA PAUSE, L'ABANDON ── */}
      <div className="ferme-boulo-coin">
        {s.etat === "fin" && <button className="ferme-btn" onClick={() => act.revanche(s.k)}>{L.bouloRevanche}</button>}
        {(s.etat === "fin" || s.closable) && <button className="ferme-btn ferme-btn-ghost" onClick={() => act.close(s.k)}>{L.bouloClose}</button>}
        {s.etat === "jeu" && !s.closable && (sure
          ? <><button className="ferme-btn" onClick={() => { setSure(false); act.leave(s.k); }}>{L.bouloAbandonSure}</button><button className="ferme-btn ferme-btn-ghost" onClick={() => setSure(false)}>{L.bouloCancel}</button></>
          : <button className="ferme-btn ferme-btn-ghost" onClick={() => setSure(true)}>{s.mode === "solo" ? L.bouloStopSolo : L.bouloAbandon}</button>)}
      </div>
    </>
  );
}
