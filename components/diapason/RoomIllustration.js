"use client";
import SymbolIcon from "./SymbolIcon";
import { SYMBOLS } from "./constants";

/* ==========================================================================
   RoomIllustration — la salle en illustration vectorielle plate (SVG), façon
   décor de théâtre : silhouettes, aplats de couleur, un point de lumière
   chaud. CINQ "plans" fixes (entrance / door / storage / gate / sanctuary),
   chacun dessiné indépendamment comme un vrai écran de point-and-click —
   pas une seule scène 3D partagée. Même gabarit de scène (SceneShell) pour
   les 3 épreuves du prologue, pour rester cohérent visuellement du début à
   la fin :
     1. entrance + door       : "Le Réveil" (interrupteur, tube, cadrans).
     2. storage + gate        : "La Clé" (cachette, grille verrouillée).
     3. sanctuary             : "Le Cadenas" (cadenas final à 4 symboles).

   Tout le mouvement (vacillement de la lampe, brume qui dérive) est de la
   CSS pure (voir globals.css) : jamais calculé en JS, jamais synchronisé.
   La seule chose qui change avec l'état du jeu, c'est l'opacité du "voile"
   sombre qui recouvre toute la scène tant que la lampe n'est pas trouvée
   (une fois trouvée en épreuve 1, elle reste allumée pour tout le reste).
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

      {/* Plafond (fine bande), murs, sol — mêmes formes pour tous les plans */}
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

// Position de chaque cachette dans le débarras (épreuve 2 "La Clé") — fixe,
// identique côté Est/Ouest (seule la palette de fond change) : quatre
// objets distincts, chacun tatoué d'un petit sceau indiquant son symbole,
// pour qu'on puisse s'y retrouver une fois le bon symbole communiqué par
// le partenaire.
const KEY_SPOTS = [
  { symbol: "note", x: 130, y: 250, shape: "vase" },
  { symbol: "rest", x: 670, y: 250, shape: "shelf" },
  { symbol: "sharp", x: 260, y: 130, shape: "mirror" },
  { symbol: "fermata", x: 540, y: 130, shape: "curtain" },
];

function KeySpotShape({ shape, x, y, tint }) {
  if (shape === "vase") {
    return <path d={`M ${x - 16} ${y + 22} Q ${x - 20} ${y - 6} ${x - 8} ${y - 22} L ${x + 8} ${y - 22} Q ${x + 20} ${y - 6} ${x + 16} ${y + 22} Z`} fill={tint} stroke="#8a7a5a" strokeWidth="2" />;
  }
  if (shape === "shelf") {
    return (
      <>
        <rect x={x - 34} y={y - 6} width="68" height="10" rx="2" fill={tint} stroke="#8a7a5a" strokeWidth="1.5" />
        <rect x={x - 34} y={y - 30} width="68" height="10" rx="2" fill={tint} stroke="#8a7a5a" strokeWidth="1.5" />
      </>
    );
  }
  if (shape === "mirror") {
    return <ellipse cx={x} cy={y} rx="26" ry="34" fill={tint} stroke="#8a7a5a" strokeWidth="2.5" />;
  }
  // curtain
  return <path d={`M ${x - 26} ${y - 30} Q ${x} ${y - 10} ${x - 26} ${y + 34} L ${x + 26} ${y + 34} Q ${x} ${y - 10} ${x + 26} ${y - 30} Z`} fill={tint} stroke="#8a7a5a" strokeWidth="2" />;
}

function StorageContent({ foundSpot, onSpotClick }) {
  return (
    <>
      {KEY_SPOTS.map(({ symbol, x, y, shape }) => {
        const found = foundSpot === symbol;
        return (
          <g key={symbol} className="dia-hotspot" onClick={() => onSpotClick(symbol)}>
            <KeySpotShape shape={shape} x={x} y={y} tint={found ? "#4a3d20" : "#241d13"} />
            <g transform={`translate(${x - 12}, ${y - 46})`}>
              <SymbolIcon type={symbol} size={24} color={found ? "#f2d9a0" : "#5a5040"} />
            </g>
            {found && (
              <circle cx={x} cy={y} r="46" fill="none" stroke="#f2d9a0" strokeWidth="2" opacity="0.5" filter="url(#dia-soft-glow)" />
            )}
          </g>
        );
      })}
    </>
  );
}

function GateContent({ otherKeySpot, keyFound, gateGlow, accent, onGate, onSigil }) {
  return (
    <>
      {gateGlow && (
        <rect x="296" y="96" width="208" height="288" rx="12" fill={accent} opacity="0.35" filter="url(#dia-soft-glow)" />
      )}

      {/* Grille verrouillée */}
      <g className="dia-hotspot" onClick={onGate}>
        <rect x="300" y="100" width="200" height="280" rx="8" fill="#181410" stroke={accent} strokeWidth="4" />
        {[0, 1, 2, 3].map(i => (
          <rect key={i} x={318 + i * 44} y="112" width="10" height="256" fill="#2c2418" />
        ))}
        {!keyFound && (
          <circle cx="400" cy="240" r="16" fill="#3a3320" stroke={accent} strokeWidth="2" />
        )}
      </g>

      {/* Sceau gravé : indique la cachette du PARTENAIRE */}
      <g className="dia-hotspot" onClick={onSigil}>
        <circle cx="220" cy="235" r="34" fill="#1a1712" stroke={accent} strokeWidth="2" />
      </g>
      <g transform="translate(203, 218)">
        <SymbolIcon type={otherKeySpot} size={34} color="#d8cdb0" />
      </g>
    </>
  );
}

function SanctuaryContent({ dialSymbols, otherCode, accent, lockGlow, onLock, onTablet }) {
  const dialX = [320, 373, 426, 479];
  return (
    <>
      {lockGlow && (
        <rect x="280" y="106" width="240" height="278" rx="16" fill={accent} opacity="0.35" filter="url(#dia-soft-glow)" />
      )}

      {/* Corps du cadenas */}
      <g className="dia-hotspot" onClick={onLock}>
        <path d="M 350 190 L 350 150 Q 350 110 400 110 Q 450 110 450 150 L 450 190" fill="none" stroke={accent} strokeWidth="10" strokeLinecap="round" />
        <rect x="320" y="185" width="160" height="150" rx="14" fill="#241c14" stroke={accent} strokeWidth="4" />
      </g>

      {/* 4 anneaux à régler */}
      {dialX.map((cx, i) => (
        <g key={i}>
          <circle cx={cx} cy="262" r="22" fill="#3a3320" stroke={accent} strokeWidth="2.5" />
          <g transform={`translate(${cx - 14}, 248)`}>
            <SymbolIcon type={dialSymbols[i]} size={28} color="#e8e2d0" />
          </g>
        </g>
      ))}

      {/* Tablette gravée : code du PARTENAIRE (4 symboles) */}
      <g className="dia-hotspot" onClick={onTablet}>
        <rect x="580" y="150" width="140" height="180" rx="8" fill="#1a1712" stroke={accent} strokeWidth="2" />
      </g>
      {otherCode.map((sym, i) => (
        <g key={i} transform={`translate(${600 + (i % 2) * 50}, ${185 + Math.floor(i / 2) * 60})`}>
          <SymbolIcon type={sym} size={26} color="#d8cdb0" />
        </g>
      ))}
    </>
  );
}

export default function RoomIllustration({
  side, viewpoint, dialValues, otherCode, lockValues, otherLockCode,
  foundKeySpot, otherKeySpot, keyFound, gateGlow, lockGlow,
  accent, lampLit, doorGlow, onExamine, onSpotClick, onGateClick,
}) {
  // Clics "flavor" simples (juste un texte d'examen, aucune décision de jeu) :
  // gérés ici, directement via onExamine. Les clics qui font AVANCER le jeu
  // (cachette de la clé, grille) demandent de connaître le puzzle — ce sont
  // des callbacks dédiés (onSpotClick/onGateClick) fournis par DiapasonGame,
  // qui seul sait si c'est la bonne cachette / si la clé a été trouvée.
  function touchDark() { if (!lampLit) onExamine("dark-search"); }
  function handleSwitch() { if (!lampLit) onExamine("switch-found"); }
  function handleTube() { if (lampLit) onExamine("tube"); else touchDark(); }
  function handleDoor() { if (lampLit) onExamine("door"); else touchDark(); }
  function handlePlaque() { if (lampLit) onExamine("plaque"); else touchDark(); }
  function handleSigil() { onExamine("sigil"); }
  function handleLock() { onExamine("lock"); }
  function handleTablet() { onExamine("tablet"); }

  return (
    <SceneShell side={side} lampLit={lampLit} onWallClick={touchDark}>
      {viewpoint === "entrance" && <EntranceContent onTube={handleTube} onSwitch={handleSwitch} />}
      {viewpoint === "door" && (
        <DoorContent
          dialSymbols={dialValues.map((v) => SYMBOLS[v])}
          otherCode={otherCode}
          accent={accent}
          doorGlow={doorGlow}
          onDoor={handleDoor}
          onPlaque={handlePlaque}
        />
      )}
      {viewpoint === "storage" && (
        <StorageContent foundSpot={foundKeySpot} onSpotClick={onSpotClick} />
      )}
      {viewpoint === "gate" && (
        <GateContent
          otherKeySpot={otherKeySpot}
          keyFound={keyFound}
          gateGlow={gateGlow}
          accent={accent}
          onGate={onGateClick}
          onSigil={handleSigil}
        />
      )}
      {viewpoint === "sanctuary" && (
        <SanctuaryContent
          dialSymbols={lockValues.map((v) => SYMBOLS[v])}
          otherCode={otherLockCode}
          accent={accent}
          lockGlow={lockGlow}
          onLock={handleLock}
          onTablet={handleTablet}
        />
      )}
    </SceneShell>
  );
}
