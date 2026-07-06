"use client";
import SymbolIcon from "./SymbolIcon";
import { SYMBOLS } from "./constants";

/* ==========================================================================
   RoomIllustration — la salle en illustration vectorielle plate (SVG), façon
   décor de théâtre : silhouettes, aplats de couleur, un point de lumière
   chaud. Deux "plans" fixes (entrance / door), chacun dessiné indépendamment
   comme un vrai écran de point-and-click — pas une seule scène 3D partagée.

   Tout le mouvement (vacillement de la lampe, brume qui dérive) est de la
   CSS pure (voir globals.css) : jamais calculé en JS, jamais synchronisé.
   La seule chose qui change avec l'état du jeu, c'est l'opacité du "voile"
   sombre qui recouvre toute la scène tant que la lampe n'est pas trouvée.
   ========================================================================== */

const PALETTE = {
  est:   { back: "#2a2118", side: "#221a12", floor: "#150f0a" },
  ouest: { back: "#1b2030", side: "#161a28", floor: "#0d0f18" },
};

function SceneShell({ side, lampLit, onWallClick, children }) {
  const pal = PALETTE[side] || PALETTE.est;
  return (
    <svg viewBox="0 0 800 480" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="dia-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#12111c" />
          <stop offset="100%" stopColor="#050508" />
        </linearGradient>
        <radialGradient id="dia-lamp-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f2d9a0" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#f2d9a0" stopOpacity="0" />
        </radialGradient>
        <filter id="dia-soft-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      <rect x="0" y="0" width="800" height="480" fill="url(#dia-bg)" />

      {/* Plafond (fine bande), murs, sol — mêmes formes pour les deux plans */}
      <polygon points="0,10 170,50 630,50 800,10" fill="#08080d" />
      <polygon className="dia-hotspot" onClick={onWallClick} points="0,470 0,10 170,50 170,350" fill={pal.side} />
      <polygon className="dia-hotspot" onClick={onWallClick} points="800,470 800,10 630,50 630,350" fill={pal.side} />
      <rect className="dia-hotspot" onClick={onWallClick} x="170" y="50" width="460" height="300" fill={pal.back} />
      <polygon className="dia-hotspot" onClick={onWallClick} points="170,350 630,350 800,470 0,470" fill={pal.floor} />

      {/* Lampe suspendue */}
      <line x1="400" y1="10" x2="400" y2="62" stroke="#2a2620" strokeWidth="3" />
      <circle cx="400" cy="72" r="90" fill="url(#dia-lamp-glow)" className={lampLit ? "dia-lamp-glow-lit" : ""} style={{ opacity: lampLit ? 1 : 0, transition: "opacity 1.8s ease" }} />
      <circle cx="400" cy="72" r="9" fill="#f2d9a0" className={lampLit ? "dia-lamp-bulb-lit" : ""} style={{ opacity: lampLit ? 1 : 0.08, transition: "opacity 1.8s ease" }} />

      {/* Brume basse, dérive lente en CSS */}
      <ellipse className="dia-fog dia-fog-a" cx="260" cy="368" rx="220" ry="20" fill="#ffffff" opacity="0.035" />
      <ellipse className="dia-fog dia-fog-b" cx="560" cy="378" rx="260" ry="22" fill="#ffffff" opacity="0.03" />

      {children}

      {/* Voile d'obscurité : recouvre tout, s'efface en douceur une fois la
          lampe allumée. Jamais interactif (pointerEvents:none) : les clics
          "à tâtons" atteignent les vraies formes en dessous. */}
      <rect
        x="0" y="0" width="800" height="480"
        fill="#020203"
        pointerEvents="none"
        style={{ opacity: lampLit ? 0 : 0.94, transition: "opacity 1.8s ease" }}
      />
    </svg>
  );
}

function EntranceContent({ onTube, onSwitch }) {
  return (
    <>
      {/* Interrupteur, mur gauche */}
      <g className="dia-hotspot" onClick={onSwitch}>
        <rect x="72" y="290" width="26" height="40" rx="3" fill="#5a4d36" />
        <circle cx="85" cy="322" r="5" fill="#C9A24B" />
      </g>

      {/* Tube acoustique, mur droit */}
      <g className="dia-hotspot" onClick={onTube}>
        <ellipse cx="618" cy="228" rx="15" ry="19" fill="#7a6a4e" />
        <rect x="616" y="219" width="92" height="18" rx="9" fill="#8a7a5a" />
        <rect x="616" y="219" width="92" height="7" rx="3.5" fill="#a08a60" opacity="0.5" />
      </g>
    </>
  );
}

function DoorContent({ dialSymbols, otherCode, accent, doorGlow, onDoor, onPlaque }) {
  const dialX = [345, 400, 455];
  return (
    <>
      {doorGlow && (
        <rect x="296" y="116" width="208" height="268" rx="16" fill={accent} opacity="0.35" filter="url(#dia-soft-glow)" />
      )}

      {/* Porte scellée */}
      <g className="dia-hotspot" onClick={onDoor}>
        <rect x="300" y="120" width="200" height="260" rx="14" fill="#241c14" stroke={accent} strokeWidth="4" />
      </g>

      {/* 3 cadrans */}
      {dialX.map((cx, i) => (
        <g key={i}>
          <circle cx={cx} cy="235" r="27" fill="#3a3320" stroke={accent} strokeWidth="3" />
          <g transform={`translate(${cx - 17}, 218)`}>
            <SymbolIcon type={dialSymbols[i]} size={34} color="#e8e2d0" />
          </g>
        </g>
      ))}

      {/* Plaque gravée : code du PARTENAIRE */}
      <g className="dia-hotspot" onClick={onPlaque}>
        <rect x="168" y="196" width="104" height="76" rx="6" fill="#1a1712" stroke={accent} strokeWidth="2" />
      </g>
      {otherCode.map((sym, i) => (
        <g key={i} transform={`translate(${183 + i * 30}, 216)`}>
          <SymbolIcon type={sym} size={26} color="#d8cdb0" />
        </g>
      ))}
    </>
  );
}

export default function RoomIllustration({ side, viewpoint, dialValues, otherCode, accent, lampLit, doorGlow, onExamine }) {
  function touchDark() { if (!lampLit) onExamine("dark-search"); }
  function handleSwitch() { if (!lampLit) onExamine("switch-found"); }
  function handleTube() { if (lampLit) onExamine("tube"); else touchDark(); }
  function handleDoor() { if (lampLit) onExamine("door"); else touchDark(); }
  function handlePlaque() { if (lampLit) onExamine("plaque"); else touchDark(); }

  return (
    <SceneShell side={side} lampLit={lampLit} onWallClick={touchDark}>
      {viewpoint === "entrance" ? (
        <EntranceContent onTube={handleTube} onSwitch={handleSwitch} />
      ) : (
        <DoorContent
          dialSymbols={dialValues.map((v) => SYMBOLS[v])}
          otherCode={otherCode}
          accent={accent}
          doorGlow={doorGlow}
          onDoor={handleDoor}
          onPlaque={handlePlaque}
        />
      )}
    </SceneShell>
  );
}
