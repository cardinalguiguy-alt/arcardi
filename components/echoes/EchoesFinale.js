"use client";
import { useEffect, useRef, useState } from "react";
import { playSplash, playCreak, playConfirmChime, playAnswerWrong } from "@/lib/sfx";

/* ==========================================================================
   ÉCHOS v4 — final "Le Naufrage" (maquette validée par Guillaume avant code).
   ==========================================================================
   Histoire : la dynamo du phare est dans l'épave du ravitailleur échoué à son
   pied. La tempête bat la coque : chaque joueur est dans SA cale (A bâbord,
   B tribord), qui TANGUE et PREND L'EAU. Déroulé, chacun de son côté :
     1. "dark"     : noir complet, trouver la lanterne à tâtons (une lueur
                     scintille à peine pour guider).
     2. "lit"      : lumière INSTABLE (faiblit aléatoirement et revient,
                     micro-coupures rares, comme un lustre sur un bateau qui
                     tangue). La plaque de cuivre décrit la clé DU BINÔME :
                     chacun dicte à l'autre laquelle prendre au râtelier.
     3. "grope"    : la BONNE clé glisse des doigts au moment où on l'attrape
                     et COULE (demande explicite). Il faut fouiller l'eau
                     noire à tâtons (zones cliquables, indice "chaud/froid").
     4. "found"    : clé récupérée, ouvrir le cadenas du levier.
     5. "unlocked" : levier libre. Les DEUX joueurs tirent en même temps
                     (fenêtre de 0,9 s, mécanique historique press_a/press_b
                     arbitrée par EchoesRoom).
   Une MAUVAISE clé essayée sur le cadenas coûte 1 minute (validé).

   Tout le spectaculaire est CSS/SVG pur (signature du site) : roulis de la
   cale avec eau en CONTRE-ROTATION (la surface reste horizontale), lustre
   pendulaire et sa lumière portée, montée de l'eau liée au temps restant,
   vagues défilantes, mousse, débris qui tanguent, fuites (plafond/flancs,
   TIRÉES AU SORT par manche via conf.leaks), éclairs au hublot, craquements
   de coque. Le JS ne pilote que l'ALÉATOIRE (scintillement de la lumière,
   éclairs, craquements) et la logique de jeu — aucun réseau ici : les seuls
   échanges passent par les callbacks du parent (onStatus/onWrongKey/onLever).
   ========================================================================== */

const GROPE_ZONES = 12;          // colonnes de fouille dans l'eau
const WATER_X0 = 160, WATER_W = 480;

// Formes d'anneau des 3 clés (mêmes ids que ramenés par le générateur).
function KeyShape({ shape, x, y, tried, onClick, sway, delay }) {
  const cls = "echo-fin-key" + (tried ? " tried" : "") + (sway ? " sway" : "");
  return (
    <g className={cls} style={delay ? { animationDelay: delay } : undefined} transform={`translate(${x},${y})`} onClick={onClick}>
      <line x1="0" y1="0" x2="0" y2="13" stroke="#5a4a30" strokeWidth="3" />
      {shape === "ronde" && <circle cx="0" cy="23" r="9" fill="none" stroke="#c9b27a" strokeWidth="3" />}
      {shape === "trefle" && (
        <g fill="none" stroke="#c9b27a" strokeWidth="3">
          <circle cx="-6" cy="21" r="5.5" /><circle cx="6" cy="21" r="5.5" /><circle cx="0" cy="30" r="5.5" />
        </g>
      )}
      {shape === "losange" && <polygon points="0,13 9,24 0,35 -9,24" fill="none" stroke="#c9b27a" strokeWidth="3" />}
      <rect x="-2" y={shape === "trefle" ? 35 : shape === "losange" ? 35 : 31} width="4" height="22" fill="#c9b27a" />
      <rect x="2" y={shape === "trefle" ? 51 : shape === "losange" ? 51 : 47} width="7" height="4" fill="#c9b27a" />
      <rect x="2" y={shape === "trefle" ? 44 : shape === "losange" ? 44 : 40} width="5" height="3.4" fill="#c9b27a" />
    </g>
  );
}

export default function EchoesFinale({
  role, conf, plaqueShape, partnerStage, partnerName, timeLeft, totalMs, t,
  onWrongKey, onStatus, onLever, leverPressed,
}) {
  const [stage, setStage] = useState("dark"); // dark | lit | grope | found | unlocked
  const [light, setLight] = useState(1);      // niveau de lumière instable (0..1)
  const [heldKey, setHeldKey] = useState(null);
  const [triedKeys, setTriedKeys] = useState([]);
  const [fallingKey, setFallingKey] = useState(false);
  const [ripples, setRipples] = useState([]); // [{id, x}]
  const [hint, setHint] = useState("");
  const [shakeLock, setShakeLock] = useState(false);
  const stageRef = useRef("dark");
  const timersRef = useRef([]);
  const rippleIdRef = useRef(0);

  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);
  function later(fn, ms) { timersRef.current.push(setTimeout(fn, ms)); }

  function setStageAndTell(s) {
    setStage(s);
    onStatus && onStatus(s);
  }

  // La tempête force sur la fin : roulis plus ample, lumière plus capricieuse.
  const heavy = timeLeft < 90 * 1000;
  // Montée de l'eau : liée au temps global restant (comme le décor du jeu).
  const danger = 1 - Math.max(0, timeLeft) / totalMs;
  const waterY = 210 - danger * 190; // translateY du bloc d'eau (plus petit = plus haut)

  // ----- Lumière instable : faiblit aléatoirement et revient (maquette) -----
  useEffect(() => {
    let alive = true;
    function loop() {
      if (!alive) return;
      if (stageRef.current !== "dark") {
        const r = Math.random();
        const deepRisk = heavy ? 0.12 : 0.045;
        const dipRisk = heavy ? 0.5 : 0.3;
        if (r < deepRisk) {
          setLight(0.06 + Math.random() * 0.08);
          later(() => alive && setLight(0.55), 90 + Math.random() * 140);
          later(() => alive && setLight(1), 320 + Math.random() * 220);
        } else if (r < dipRisk) {
          setLight(0.42 + Math.random() * 0.3);
          later(() => alive && setLight(0.85 + Math.random() * 0.15), 120 + Math.random() * 260);
        } else {
          setLight(0.92 + Math.random() * 0.08);
        }
      }
      later(loop, 240 + Math.random() * 520);
    }
    loop();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heavy]);

  // ----- Éclairs au hublot + craquements de coque (aléatoires) -----
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    let alive = true;
    function bolt() {
      if (!alive) return;
      setFlash(0.9);
      later(() => alive && setFlash(0), 90);
      later(() => alive && setFlash(0.5), 180);
      later(() => alive && setFlash(0), 260);
      later(bolt, 4000 + Math.random() * 7000);
    }
    function creak() {
      if (!alive) return;
      playCreak();
      later(creak, (heavy ? 5000 : 8000) + Math.random() * 7000);
    }
    later(bolt, 1500 + Math.random() * 3000);
    later(creak, 2500 + Math.random() * 4000);
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heavy]);

  // ----- Interactions -----
  const gropeTexts = ["echoesFinDarkGrope1", "echoesFinDarkGrope2", "echoesFinDarkGrope3"];
  const gropeIdxRef = useRef(0);
  function touchDark() {
    if (stage !== "dark") return;
    setHint(t(gropeTexts[gropeIdxRef.current++ % gropeTexts.length]));
  }
  function lightLantern() {
    if (stage !== "dark") return;
    playConfirmChime();
    setHint(t("echoesFinLitHint"));
    setStageAndTell("lit");
  }
  function grabKey(shape) {
    if (stage !== "lit" || fallingKey) return;
    if (shape === conf.correct) {
      // La bonne clé glisse des doigts et coule (demande explicite).
      setFallingKey(true);
      setHeldKey(null);
      later(() => playSplash(), 650);
      later(() => {
        setStageAndTell("grope");
        setHint(t("echoesFinKeyFell"));
      }, 950);
    } else {
      setHeldKey(shape);
      setHint(t("echoesFinKeyInHand"));
    }
  }
  const keyZone = Math.min(GROPE_ZONES - 1, Math.floor(conf.dropX * GROPE_ZONES));
  function gropeWater(zone) {
    if (stage !== "grope") return;
    playSplash();
    const x = WATER_X0 + (zone + 0.5) * (WATER_W / GROPE_ZONES);
    const id = rippleIdRef.current++;
    setRipples(prev => [...prev, { id, x }]);
    later(() => setRipples(prev => prev.filter(r => r.id !== id)), 900);
    if (zone === keyZone) {
      setHeldKey(conf.correct);
      setHint(t("echoesFinKeyFound"));
      setStageAndTell("found");
    } else if (Math.abs(zone - keyZone) === 1) {
      setHint(t("echoesFinGropeWarm"));
    } else {
      setHint(t("echoesFinGropeCold"));
    }
  }
  function tryLock() {
    if (stage === "unlocked") return;
    if (stage === "found" && heldKey === conf.correct) {
      playConfirmChime();
      setHint(t("echoesFinUnlocked"));
      setStageAndTell("unlocked");
      return;
    }
    if (stage === "lit" && heldKey) {
      // Mauvaise clé (la bonne, elle, est tombée à l'eau avant d'arriver ici).
      playAnswerWrong();
      setTriedKeys(prev => [...prev, heldKey]);
      setHeldKey(null);
      setShakeLock(true);
      later(() => setShakeLock(false), 450);
      setHint(t("echoesFinWrongKey"));
      onWrongKey && onWrongKey();
      return;
    }
    if (stage === "lit") setHint(t("echoesFinNeedKey"));
  }
  function pullLever() {
    if (stage !== "unlocked" || leverPressed) return;
    onStatus && onStatus("pulled");
    onLever && onLever();
  }

  // ----- Rendu -----
  const lit = stage !== "dark";
  const l = lit ? light : 0;
  const veilOpacity = lit ? 0.86 * (1 - l) + 0.02 : 0.955;
  const sideName = t(role === "A" ? "echoesFinPortside" : "echoesFinStarboard");
  const partnerSideName = t(role === "A" ? "echoesFinStarboard" : "echoesFinPortside");
  const shapeName = s => t(s === "ronde" ? "echoesFinKeyRonde" : s === "trefle" ? "echoesFinKeyTrefle" : "echoesFinKeyLosange");
  const bothReady = stage === "unlocked" && partnerStage === "unlocked";

  // Positions du râtelier (ordre aléatoire par manche : conf.keys).
  const rackX = [504, 549, 594];
  // Fuites possibles : 3 gouttes de plafond + 2 flancs (jet). conf.leaks
  // choisit lesquelles sont actives cette manche-ci.
  const drips = [{ x: 352 }, { x: 512 }, { x: 432 }];
  const sprays = [{ x: 243, y: 214, dir: 1 }, { x: 655, y: 250, dir: -1 }];

  return (
    <div className={"echo-fin-wrap" + (heavy ? " storm-heavy" : "")}>
      {/* Bandeau binôme : où en est l'autre cale */}
      <p className="echo-fin-partner">
        {role === "A" ? "🔴" : "🟢"} {sideName} · {t("echoesFinPartnerIs")} <b>{partnerName}</b> ({partnerSideName}) :{" "}
        <b>{t("echoesFinStage" + partnerStage.charAt(0).toUpperCase() + partnerStage.slice(1))}</b>
      </p>

      <div className="echo-fin-stagebox">
        <svg viewBox="0 0 800 520" style={{ display: "block", width: "100%", height: "auto" }}>
          <defs>
            <linearGradient id="efin-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a0d16" /><stop offset="100%" stopColor="#04050a" />
            </linearGradient>
            <linearGradient id="efin-water" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1d4a52" stopOpacity=".92" />
              <stop offset="30%" stopColor="#123039" stopOpacity=".95" />
              <stop offset="100%" stopColor="#081218" stopOpacity=".99" />
            </linearGradient>
            <radialGradient id="efin-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f2d9a0" stopOpacity=".6" /><stop offset="100%" stopColor="#f2d9a0" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="efin-cone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f2d9a0" stopOpacity=".34" /><stop offset="100%" stopColor="#f2d9a0" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="efin-seaout" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0c1c2e" /><stop offset="55%" stopColor="#123a4a" /><stop offset="100%" stopColor="#0a2430" />
            </linearGradient>
            <filter id="efin-soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6" /></filter>
            <clipPath id="efin-portclip"><circle cx="216" cy="176" r="34" /></clipPath>
          </defs>

          <rect width="800" height="520" fill="url(#efin-bg)" />

          {/* ============ LA CALE (tangue) ============ */}
          <g className="echo-fin-roll">
            {/* coque : plafond, murs, sol, membrures */}
            <polygon points="-60,26 150,64 650,64 860,26" fill="#0b0906" onClick={touchDark} />
            <polygon points="-60,550 -60,26 150,64 150,392" fill="#221a12" onClick={touchDark} />
            <polygon points="860,550 860,26 650,64 650,392" fill="#1d160f" onClick={touchDark} />
            <rect x="150" y="64" width="500" height="328" fill="#2a2118" onClick={touchDark} />
            <polygon points="150,392 650,392 860,550 -60,550" fill="#150f0a" onClick={touchDark} />
            <path d="M195,64 q-12,170 8,328" stroke="#1a140d" strokeWidth="10" fill="none" />
            <path d="M330,64 q-6,170 4,328" stroke="#1a140d" strokeWidth="10" fill="none" />
            <path d="M470,64 q6,170 -4,328" stroke="#1a140d" strokeWidth="10" fill="none" />
            <path d="M605,64 q12,170 -8,328" stroke="#1a140d" strokeWidth="10" fill="none" />
            <line x1="150" y1="150" x2="650" y2="150" stroke="#241c13" strokeWidth="4" />
            <line x1="150" y1="238" x2="650" y2="238" stroke="#241c13" strokeWidth="4" />
            <line x1="150" y1="326" x2="650" y2="326" stroke="#241c13" strokeWidth="4" />

            {/* hublot : mer démontée + éclairs */}
            <g>
              <circle cx="216" cy="176" r="40" fill="#3a3020" />
              <circle cx="216" cy="176" r="34" fill="#071019" />
              <g clipPath="url(#efin-portclip)">
                <rect x="170" y="130" width="92" height="92" fill="url(#efin-seaout)" />
                <g className="echo-fin-outsea">
                  <path d="M170,176 q12,-9 24,0 t24,0 t24,0 t24,0 v60 h-96 z" fill="#0e2f3f" />
                  <path d="M170,188 q10,-7 20,0 t20,0 t20,0 t20,0 t20,0 v40 h-100 z" fill="#0a1f2c" />
                </g>
                <rect x="160" y="120" width="120" height="120" fill="#cfe6ff" style={{ opacity: flash, transition: "opacity .08s linear" }} />
              </g>
              <circle cx="216" cy="176" r="34" fill="none" stroke="#4a3b24" strokeWidth="5" />
              <line x1="216" y1="142" x2="216" y2="210" stroke="#4a3b24" strokeWidth="3" />
            </g>

            {/* fuites latérales (jets) : actives selon le tirage de la manche */}
            {sprays.map((s, i) => conf.leaks.includes(3 + i) && (
              <g key={"sp" + i}>
                <path d={`M${s.x},${s.y} l${s.dir * 14},26 l${s.dir * -8},4 l${s.dir * 12},22`} stroke="#0e2836" strokeWidth="3.5" fill="none" />
                <circle className="echo-fin-jetdrop" cx={s.x + s.dir * 9} cy={s.y + 24} r="3.2" fill="#7fd4e0" opacity=".9" style={{ "--jdir": s.dir }} />
                <circle className="echo-fin-jetdrop j2" cx={s.x + s.dir * 12} cy={s.y + 28} r="2.4" fill="#aee6ee" style={{ "--jdir": s.dir }} />
                <circle className="echo-fin-jetdrop j3" cx={s.x + s.dir * 7} cy={s.y + 26} r="2" fill="#5ad0c2" style={{ "--jdir": s.dir }} />
              </g>
            ))}
            {/* gouttes de plafond : actives selon le tirage */}
            {drips.map((d, i) => conf.leaks.includes(i) && (
              <ellipse key={"dr" + i} className={"echo-fin-drip d" + i} cx={d.x} cy="70" rx="2.3" ry="4.4" fill="#8fd8e2" />
            ))}

            {/* LANTERNE à trouver à tâtons */}
            <g onClick={lightLantern} style={{ cursor: stage === "dark" ? "pointer" : "default" }}>
              <rect x="118" y="228" width="8" height="26" fill="#4a3b24" />
              <rect x="106" y="250" width="32" height="42" rx="7" fill="#5a4a30" />
              <rect x="112" y="256" width="20" height="28" rx="4" fill="#f2d9a0" opacity={0.14 + l * 0.6} />
              <circle cx="122" cy="270" r="70" fill="url(#efin-glow)" opacity={l * 0.9} />
              {/* zone de clic élargie, invisible */}
              <circle cx="122" cy="270" r="34" fill="transparent" />
            </g>

            {/* PLAQUE DE CUIVRE : décrit la clé DU BINÔME */}
            <g>
              <rect x="292" y="118" width="176" height="62" rx="6" fill="#241c14" stroke="#8a6f3c" strokeWidth="2.5" />
              <text x="380" y="141" textAnchor="middle" fill="#c9a24b" fontSize="11" fontWeight="800" letterSpacing="1">
                {t("echoesFinPlaqueFor")} {partnerSideName.toUpperCase()} :
              </text>
              <text x="380" y="163" textAnchor="middle" fill="#e8d9b0" fontSize="14" fontWeight="800">
                {shapeName(plaqueShape)}
              </text>
            </g>

            {/* RÂTELIER : 3 clés (l'ordre change à chaque manche) */}
            <g>
              <rect x="486" y="128" width="126" height="9" rx="4" fill="#3a2f1e" />
              {conf.keys.map((shape, i) => {
                if (shape === conf.correct && (stage === "grope" || stage === "found" || stage === "unlocked")) return null;
                const isFallingOne = fallingKey && shape === conf.correct;
                return (
                  <g key={shape} className={isFallingOne ? "echo-fin-keyfall" : undefined}>
                    <KeyShape shape={shape} x={rackX[i]} y={137}
                      tried={triedKeys.includes(shape)}
                      sway={!isFallingOne}
                      delay={(-i * 1.15) + "s"}
                      onClick={() => grabKey(shape)} />
                  </g>
                );
              })}
            </g>

            {/* LEVIER DE DYNAMO + CADENAS */}
            <g>
              <circle className={"echo-fin-leverring" + (stage === "unlocked" && !leverPressed ? " ready" : "")} cx="648" cy="332" r="46" fill="none" stroke="#b6f04c" strokeWidth="3" filter="url(#efin-soft)" />
              <rect x="622" y="318" width="52" height="30" rx="7" fill="#3a3020" stroke="#241c14" strokeWidth="3" />
              <g className={"echo-fin-leverarm" + (leverPressed ? " pulled" : "")} onClick={pullLever}
                style={{ cursor: stage === "unlocked" && !leverPressed ? "pointer" : "default" }}>
                <rect x="644" y="252" width="9" height="84" rx="4" fill="#8a7a5a" />
                <circle cx="648.5" cy="250" r="11" fill="#c0392b" stroke="#7a2317" strokeWidth="3" />
              </g>
              <circle cx="648" cy="332" r="7" fill="#241c14" />
              <g className={"echo-fin-padlock" + (stage === "unlocked" || leverPressed ? " open" : "") + (shakeLock ? " shake" : "")}
                onClick={tryLock} style={{ cursor: "pointer" }}>
                <path d="M614,320 q-8,14 4,24" stroke="#6a6a72" strokeWidth="5" fill="none" strokeDasharray="7 5" />
                <g className="echo-fin-shackle">
                  <path d="M602,352 l0,-12 q0,-14 14,-14 q14,0 14,14 l0,12" fill="none" stroke="#9aa0aa" strokeWidth="6" />
                </g>
                <rect x="594" y="350" width="46" height="38" rx="8" fill="#57606c" stroke="#2c3138" strokeWidth="3" />
                <circle cx="617" cy="367" r="5.5" fill="#2c3138" />
              </g>
            </g>

            {/* ============ EAU (contre-rotation : surface horizontale) ============ */}
            <g className="echo-fin-counter">
              <g style={{ transform: `translateY(${waterY}px)`, transition: "transform 1.2s linear" }}>
                <g className="echo-fin-wave1">
                  <path d="M-400,382 q40,-13 80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 v260 h-1520 z" fill="url(#efin-water)" />
                </g>
                <g className="echo-fin-wave2">
                  <path d="M-400,392 q40,-10 80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 v250 h-1520 z" fill="#0d222d" opacity=".85" />
                </g>
                <g fill="#bfe9ef" opacity=".35">
                  <ellipse cx="205" cy="381" rx="24" ry="3" /><ellipse cx="420" cy="379" rx="30" ry="3.4" /><ellipse cx="600" cy="382" rx="20" ry="2.6" />
                </g>
                <ellipse cx="410" cy="392" rx="90" ry="6" fill="#f2d9a0" opacity={l * 0.12} />
                {/* débris flottants (phases décalées par le seed de la manche) */}
                <g className="echo-fin-bob-a" style={{ animationDelay: (-conf.debrisSeed * 3).toFixed(2) + "s" }}>
                  <g transform="translate(258,362)">
                    <ellipse cx="0" cy="14" rx="26" ry="9" fill="#0a1a22" opacity=".55" />
                    <rect x="-24" y="-10" width="48" height="26" rx="8" fill="#6a5233" stroke="#42311c" strokeWidth="3" />
                    <line x1="-24" y1="-1" x2="24" y2="-1" stroke="#42311c" strokeWidth="3" /><line x1="-24" y1="8" x2="24" y2="8" stroke="#42311c" strokeWidth="3" />
                  </g>
                </g>
                <g className="echo-fin-bob-b" style={{ animationDelay: (-conf.debrisSeed * 4).toFixed(2) + "s" }}>
                  <g transform="translate(520,368)">
                    <ellipse cx="0" cy="12" rx="24" ry="8" fill="#0a1a22" opacity=".55" />
                    <rect x="-20" y="-14" width="40" height="24" rx="4" fill="#7a6242" stroke="#4a3924" strokeWidth="3" />
                    <line x1="-20" y1="-14" x2="20" y2="10" stroke="#4a3924" strokeWidth="2.5" /><line x1="20" y1="-14" x2="-20" y2="10" stroke="#4a3924" strokeWidth="2.5" />
                  </g>
                </g>
                {/* remous de fouille */}
                {ripples.map(r => (
                  <g key={r.id} className="echo-fin-ripple">
                    <ellipse cx={r.x} cy="384" rx="10" ry="3.2" fill="none" stroke="#bfe9ef" strokeWidth="2.5" />
                    <ellipse cx={r.x} cy="384" rx="22" ry="6" fill="none" stroke="#bfe9ef" strokeWidth="1.5" opacity=".5" />
                  </g>
                ))}
                {/* zones de fouille (invisibles), au-dessus des vagues */}
                {stage === "grope" && Array.from({ length: GROPE_ZONES }, (_, z) => (
                  <rect key={z} x={WATER_X0 + z * (WATER_W / GROPE_ZONES)} y="352" width={WATER_W / GROPE_ZONES} height="90"
                    fill="transparent" style={{ cursor: "pointer" }} onClick={() => gropeWater(z)} />
                ))}
              </g>
            </g>

            {/* LUSTRE (devant l'eau) */}
            <g className="echo-fin-chand">
              <line x1="400" y1="46" x2="400" y2="120" stroke="#2a2620" strokeWidth="4" />
              <polygon points="400,124 268,392 532,392" fill="url(#efin-cone)" style={{ opacity: l * 0.9, transition: "opacity .12s linear" }} />
              <circle cx="400" cy="132" r="120" fill="url(#efin-glow)" filter="url(#efin-soft)" style={{ opacity: l, transition: "opacity .12s linear" }} />
              <path d="M362,124 q38,26 76,0" stroke="#4a3b24" strokeWidth="5" fill="none" />
              <circle cx="400" cy="120" r="8" fill="#4a3b24" />
              <g fill="#f2d9a0">
                <rect x="358" y="108" width="5" height="14" rx="2" /><rect x="397" y="100" width="5" height="16" rx="2" /><rect x="436" y="108" width="5" height="14" rx="2" />
                <ellipse cx="360.5" cy="104" rx="3.4" ry="6.5" opacity={0.25 + l * 0.75} /><ellipse cx="399.5" cy="95" rx="3.8" ry="7.5" opacity={0.25 + l * 0.75} /><ellipse cx="438.5" cy="104" rx="3.4" ry="6.5" opacity={0.25 + l * 0.75} />
              </g>
            </g>
          </g>

          {/* ============ VOILE D'OBSCURITÉ ============ */}
          <rect x="0" y="0" width="800" height="520" fill="#020204" pointerEvents="none"
            style={{ opacity: veilOpacity, transition: "opacity .14s linear" }} />
          {stage === "dark" && <circle className="echo-fin-glint" cx="122" cy="270" r="5" fill="#f2d9a0" pointerEvents="none" />}

          <rect x="0" y="0" width="800" height="520" fill="none" stroke="#000" strokeWidth="60" opacity=".35" pointerEvents="none" />
        </svg>
      </div>

      {/* Ligne d'objectif + clé en main */}
      <p className="echo-fin-hint">
        {hint || t("echoesFinDarkHint")}
        {heldKey && stage !== "grope" && <span className="echo-fin-held"> 🔑 {shapeName(heldKey)}</span>}
      </p>
      {bothReady && <p className="echo-fin-pullcall">⚡ {t("echoesFinPullTogether")}</p>}
      {leverPressed && <p className="echo-fin-pullcall">{t("echoesCh7Pulled")}</p>}
    </div>
  );
}
