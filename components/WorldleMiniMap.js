"use client";
import { useRef, useState, useEffect } from "react";

/* ==========================================================================
   WorldleMiniMap — mini-carte naviguable (pan + zoom), recentrée sur le
   DERNIER pays deviné à chaque nouvel essai. Ne montre JAMAIS la position
   du pays cible (ce serait donner la réponse) : uniquement une lueur de
   proximité (gris transparent -> couleur vive) autour du dernier essai,
   dont l'intensité suit le pourcentage de proximité déjà calculé par
   proximityPct(), et une flèche de direction reprenant le bearing() déjà
   calculé ailleurs dans Worldle.js — cette carte n'ajoute AUCUN nouveau
   calcul de jeu, elle visualise seulement ce qui est déjà connu du joueur.

   Projection équirectangulaire simple (x = lng, y = -lat) : suffisante à
   l'échelle d'un mini-jeu entre amis, aucune dépendance de cartographie
   ajoutée au projet.
   ========================================================================== */

const ZOOM_SPANS = [90, 50, 26, 14]; // largeur en degrés de longitude visible, du plus large au plus zoomé

function proximityColor(pct) {
  const p = Math.max(0, Math.min(100, pct)) / 100;
  const r = Math.round(150 + (255 - 150) * p);
  const g = Math.round(150 + (60 - 150) * p);
  const b = Math.round(150 + (40 - 150) * p);
  const a = 0.16 + 0.64 * p;
  return `rgba(${r},${g},${b},${a})`;
}

export default function WorldleMiniMap({ guess, allCountries, targetId, solved, lang, t }) {
  const [zoomIdx, setZoomIdx] = useState(1);
  const [pan, setPan] = useState({ dLng: 0, dLat: 0 });
  const dragRef = useRef(null);
  const svgRef = useRef(null);

  // Nouvel essai -> on recentre toujours dessus (règle explicite du design).
  useEffect(() => { setPan({ dLng: 0, dLat: 0 }); }, [guess?.country?.id]);

  if (!guess) return null;

  const spanLng = ZOOM_SPANS[zoomIdx];
  const spanLat = spanLng / 2;
  const centerLat = Math.max(-85, Math.min(85, guess.country.lat + pan.dLat));
  const centerLng = guess.country.lng + pan.dLng;
  const x0 = centerLng - spanLng / 2;
  const y0 = -(centerLat + spanLat / 2);

  function toXY(lat, lng) {
    // Rapproche lng d'un tour complet du centre pour éviter un pays qui
    // "saute" de l'autre côté de la carte quand on est proche de ±180°.
    let l = lng;
    while (l - centerLng > 180) l -= 360;
    while (l - centerLng < -180) l += 360;
    return { x: l, y: -lat };
  }

  function pan_by(dLngPct, dLatPct) {
    setPan(p => ({ dLng: p.dLng + dLngPct * spanLng, dLat: p.dLat + dLatPct * spanLat }));
  }
  function recenter() { setPan({ dLng: 0, dLat: 0 }); }
  function zoomIn() { setZoomIdx(z => Math.min(z + 1, ZOOM_SPANS.length - 1)); }
  function zoomOut() { setZoomIdx(z => Math.max(z - 1, 0)); }

  // Navigation à la souris/au doigt : convertit un déplacement en pixels en
  // degrés, en fonction de la taille réelle rendue du SVG à l'instant du
  // glisser (pas de dépendance de cartographie, juste un ratio simple).
  function onPointerDown(e) {
    const rect = svgRef.current.getBoundingClientRect();
    dragRef.current = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragRef.current) return;
    const d = dragRef.current;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    setPan(p => ({
      dLng: p.dLng - (dx / d.w) * spanLng,
      dLat: p.dLat + (dy / d.h) * spanLat,
    }));
    dragRef.current = { ...d, x: e.clientX, y: e.clientY };
  }
  function onPointerUp() { dragRef.current = null; }

  const glowColor = proximityColor(guess.pct);
  const gp = toXY(guess.country.lat, guess.country.lng);

  return (
    <div className="worldle-minimap">
      <svg
        ref={svgRef}
        viewBox={`${x0} ${y0} ${spanLng} ${spanLat}`}
        className="worldle-minimap-svg"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <defs>
          <radialGradient id="wmGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={glowColor} />
            <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Fond */}
        <rect x={x0} y={y0} width={spanLng} height={spanLat} fill="#0e1620" />

        {/* Graticule discret, pour se repérer en naviguant */}
        {Array.from({ length: 37 }, (_, i) => (i - 18) * 10).map(lng => (
          <line key={"m" + lng} x1={lng} y1={y0} x2={lng} y2={y0 + spanLat} stroke="rgba(255,255,255,.05)" strokeWidth={spanLng * 0.0015} />
        ))}
        {Array.from({ length: 19 }, (_, i) => (i - 9) * 10).map(lat => (
          <line key={"p" + lat} x1={x0} y1={-lat} x2={x0 + spanLng} y2={-lat} stroke="rgba(255,255,255,.05)" strokeWidth={spanLng * 0.0015} />
        ))}

        {/* Pays de repère — jamais le pays cible tant qu'il n'est pas trouvé,
            pour ne jamais donner la réponse visuellement. */}
        {allCountries.filter(c => solved || c.id !== targetId).map(c => {
          const p = toXY(c.lat, c.lng);
          const isGuessed = c.id === guess.country.id;
          if (isGuessed) return null;
          return (
            <circle key={c.id} cx={p.x} cy={p.y} r={spanLng * 0.004} fill="rgba(255,255,255,.25)" />
          );
        })}

        {/* Lueur de proximité autour du dernier essai : gris transparent ->
            couleur vive à mesure que pct se rapproche de 100. */}
        <circle cx={gp.x} cy={gp.y} r={spanLng * 0.22} fill="url(#wmGlow)" />

        {/* Flèche de direction vers la cible (même bearing que dans la
            liste des essais) — indique un CAP, jamais une distance ni une
            position exacte. */}
        {guess.country.id !== targetId && (
          <g transform={`translate(${gp.x},${gp.y}) rotate(${guess.deg})`}>
            <path d={`M0,${-spanLng * 0.09} L${spanLng * 0.025},${-spanLng * 0.04} L${-spanLng * 0.025},${-spanLng * 0.04} Z`} fill={glowColor} stroke="rgba(255,255,255,.5)" strokeWidth={spanLng * 0.0015} />
          </g>
        )}

        {/* Marqueur du dernier essai */}
        <circle cx={gp.x} cy={gp.y} r={spanLng * 0.012} fill="#fff" stroke="#111" strokeWidth={spanLng * 0.002} />
      </svg>

      <div className="worldle-minimap-controls">
        <button type="button" onClick={() => pan_by(0, 0.3)} title="N">⬆️</button>
        <button type="button" onClick={() => pan_by(0, -0.3)} title="S">⬇️</button>
        <button type="button" onClick={() => pan_by(-0.3, 0)} title="O">⬅️</button>
        <button type="button" onClick={() => pan_by(0.3, 0)} title="E">➡️</button>
        <button type="button" onClick={zoomOut} disabled={zoomIdx === 0} title="-">🔎−</button>
        <button type="button" onClick={zoomIn} disabled={zoomIdx === ZOOM_SPANS.length - 1} title="+">🔎+</button>
        <button type="button" onClick={recenter} title="Recentrer">🎯</button>
      </div>
    </div>
  );
}
