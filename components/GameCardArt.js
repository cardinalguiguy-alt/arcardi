"use client";

/* ==========================================================================
   GameCardArt — illustrations des vignettes du salon (refonte 2026-07).
   ==========================================================================
   Une scène vectorielle dessinée PAR JEU, qui remplit toute la carte de
   sélection (.game-card) : c'est elle l'élément principal de la vignette,
   le titre du jeu repose dessus (voir .game-card-title / les polices par
   jeu dans globals.css). Cohérent avec le reste du site, qui dessine déjà
   beaucoup en vectoriel/CSS pur (Gold Mines, Ludo, Puissance 4...).

   Règles de construction :
   - viewBox 300×200 + preserveAspectRatio "slice" : la scène couvre toute
     la carte quel que soit son ratio réel, quitte à rogner les bords.
   - Tous les ids de dégradés sont préfixés par jeu (gca-<jeu>-...) : les
     16 SVG cohabitent dans le même DOM sans collision d'id.
   - Le tiers bas de chaque scène reste volontairement calme : c'est là
     que se posent le titre et le "Jouer →" (voile .game-card-veil).
   - Décoratif pur : aria-hidden est posé ici même, sur chaque <svg>.
   ========================================================================== */

function Frame({ children }) {
  return (
    <svg
      viewBox="0 0 300 200"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const ART = {
  /* ---- Quiz Éclair : projecteur, grand "?" et étincelles ---- */
  quiz: () => (
    <Frame>
      <defs>
        <radialGradient id="gca-quiz-bg" cx="50%" cy="40%" r="80%">
          <stop offset="0%" stopColor="#0f4a4a" />
          <stop offset="100%" stopColor="#06181c" />
        </radialGradient>
      </defs>
      <rect width="300" height="200" fill="url(#gca-quiz-bg)" />
      <g opacity=".13" fill="#4ECDC4">
        {[0, 30, 60, 90, 120, 150].map(a => (
          <rect key={a} x="146" y="-50" width="9" height="290" transform={`rotate(${a} 150 92)`} />
        ))}
      </g>
      <circle cx="150" cy="90" r="54" fill="#4ECDC4" opacity=".16" />
      <text
        x="150" y="126" textAnchor="middle"
        fontFamily="'Luckiest Guy', system-ui" fontSize="96"
        fill="#EFFFFB" stroke="#0a2b2b" strokeWidth="3"
        transform="rotate(-6 150 92)"
      >?</text>
      <g fill="#BFF3EC">
        <path d="M52 42l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
        <path d="M247 128l2.4 6.4 6.4 2.4-6.4 2.4-2.4 6.4-2.4-6.4-6.4-2.4 6.4-2.4z" opacity=".85" />
        <circle cx="232" cy="42" r="3" opacity=".7" />
        <circle cx="66" cy="146" r="2.5" opacity=".6" />
      </g>
    </Frame>
  ),

  /* ---- Mot Mystère : grille de tuiles, "JOUER" révélé au centre ---- */
  wordle: () => (
    <Frame>
      <defs>
        <linearGradient id="gca-wordle-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#182420" />
          <stop offset="100%" stopColor="#0b1410" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#gca-wordle-bg)" />
      <g transform="rotate(-3 150 100)">
        {[0, 1, 2, 3, 4].map(i => (
          <rect key={"t" + i} x={40 + i * 45} y="16" width="38" height="38" rx="7" fill="#222b27" stroke="#39443f" strokeWidth="2" />
        ))}
        {["J", "O", "U", "E", "R"].map((ch, i) => (
          <g key={ch + i}>
            <rect x={40 + i * 45} y="64" width="38" height="38" rx="7" fill={["#4a5450", "#7DB544", "#C9B458", "#4a5450", "#7DB544"][i]} />
            <text x={59 + i * 45} y="91" textAnchor="middle" fontFamily="'Space Mono', monospace" fontWeight="700" fontSize="24" fill="#fff">{ch}</text>
          </g>
        ))}
        {[0, 1, 2, 3, 4].map(i => (
          <rect key={"b" + i} x={40 + i * 45} y="112" width="38" height="38" rx="7" fill="#222b27" stroke="#39443f" strokeWidth="2" />
        ))}
      </g>
    </Frame>
  ),

  /* ---- Worldle : globe, méridiens et épingle rouge ---- */
  worldle: () => (
    <Frame>
      <defs>
        <linearGradient id="gca-worldle-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1430" />
          <stop offset="100%" stopColor="#101d42" />
        </linearGradient>
        <radialGradient id="gca-worldle-sea" cx="38%" cy="32%" r="85%">
          <stop offset="0%" stopColor="#4d7fd6" />
          <stop offset="100%" stopColor="#1c3d86" />
        </radialGradient>
      </defs>
      <rect width="300" height="200" fill="url(#gca-worldle-bg)" />
      <g fill="#cfe0ff">
        <circle cx="38" cy="34" r="2" opacity=".8" />
        <circle cx="70" cy="90" r="1.5" opacity=".5" />
        <circle cx="262" cy="160" r="2" opacity=".6" />
        <circle cx="248" cy="26" r="1.5" opacity=".7" />
      </g>
      <circle cx="165" cy="108" r="72" fill="url(#gca-worldle-sea)" />
      <g fill="#74c69d" opacity=".92">
        <path d="M118 74 q20 -14 40 -6 q10 4 6 14 q-16 12 -34 8 q-16 -4 -12 -16z" />
        <path d="M186 118 q18 -6 26 6 q6 12 -6 22 q-16 8 -26 -4 q-8 -14 6 -24z" />
        <path d="M126 130 q12 -2 14 8 q0 12 -12 12 q-12 -2 -2 -20z" />
      </g>
      <g fill="none" stroke="#cfe3ff" strokeWidth="1.5" opacity=".28">
        <ellipse cx="165" cy="108" rx="72" ry="26" />
        <ellipse cx="165" cy="108" rx="26" ry="72" />
        <line x1="93" y1="108" x2="237" y2="108" />
      </g>
      <circle cx="165" cy="108" r="72" fill="none" stroke="#9fc0ff" strokeWidth="2.5" opacity=".55" />
      <circle cx="206" cy="56" r="18" fill="none" stroke="#FF4D5E" strokeWidth="2" opacity=".4" />
      <path d="M206 32 c-9 0 -15 7 -15 15 0 11 15 26 15 26 s15 -15 15 -26 c0 -8 -6 -15 -15 -15 z" fill="#FF4D5E" />
      <circle cx="206" cy="47" r="5.5" fill="#fff" />
    </Frame>
  ),

  /* ---- Petit Bac : feuille lignée, mots griffonnés, crayon ---- */
  petitbac: () => (
    <Frame>
      <defs>
        <linearGradient id="gca-pb-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6eeda" />
          <stop offset="100%" stopColor="#eee0c2" />
        </linearGradient>
        <linearGradient id="gca-pb-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD35C" />
          <stop offset="100%" stopColor="#E8A93B" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#gca-pb-paper)" />
      <g stroke="#b8cfe0" strokeWidth="1.5">
        {[46, 74, 102, 130, 158, 186].map(y => (
          <line key={y} x1="0" y1={y} x2="300" y2={y} />
        ))}
      </g>
      <line x1="44" y1="0" x2="44" y2="200" stroke="#e08b8b" strokeWidth="2" />
      <g fill="none" stroke="#3a4a6b" strokeWidth="2.5" strokeLinecap="round" opacity=".85">
        <path d="M58 40 q8 -9 16 0 t16 0 t14 0" />
        <path d="M120 40 q9 -10 18 0 t16 0" />
        <path d="M58 68 q10 -9 20 0 t18 0 t16 0 t14 0" />
        <path d="M58 96 q8 -8 16 0 t15 0" />
      </g>
      <path d="M100 96 l52 0" stroke="#c9564f" strokeWidth="2" opacity=".7" />
      <g transform="rotate(38 218 118)">
        <rect x="176" y="106" width="86" height="20" rx="3" fill="url(#gca-pb-body)" />
        <line x1="176" y1="113" x2="262" y2="113" stroke="#c58a2a" strokeWidth="1.5" opacity=".6" />
        <line x1="176" y1="119" x2="262" y2="119" stroke="#c58a2a" strokeWidth="1.5" opacity=".6" />
        <polygon points="262,106 282,116 262,126" fill="#EBC393" />
        <polygon points="274,112 282,116 274,120" fill="#4a4a4a" />
        <rect x="162" y="106" width="14" height="20" rx="3" fill="#E58A9C" />
        <rect x="172" y="106" width="7" height="20" fill="#b9c0cc" />
      </g>
    </Frame>
  ),

  /* ---- Tu Préfères ? : duel A/B, orange contre bleu ---- */
  tupreferes: () => (
    <Frame>
      <defs>
        <linearGradient id="gca-tp-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF9A52" />
          <stop offset="100%" stopColor="#D96A1F" />
        </linearGradient>
        <linearGradient id="gca-tp-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4A7FE8" />
          <stop offset="100%" stopColor="#2B4FB0" />
        </linearGradient>
      </defs>
      <polygon points="0,0 172,0 128,200 0,200" fill="url(#gca-tp-a)" />
      <polygon points="172,0 300,0 300,200 128,200" fill="url(#gca-tp-b)" />
      <polyline points="172,0 152,68 170,92 138,200" fill="none" stroke="#fff" strokeWidth="5" strokeLinejoin="round" opacity=".9" />
      <g fill="#fff" opacity=".2" fontFamily="system-ui" fontWeight="800">
        <text x="34" y="46" fontSize="26">?</text>
        <text x="252" y="168" fontSize="30">?</text>
        <text x="216" y="42" fontSize="20">?</text>
      </g>
      <circle cx="72" cy="86" r="31" fill="#fff" opacity=".94" />
      <text x="72" y="99" textAnchor="middle" fontFamily="'Fredoka', system-ui" fontWeight="600" fontSize="36" fill="#C25A12">A</text>
      <circle cx="228" cy="86" r="31" fill="#fff" opacity=".94" />
      <text x="228" y="99" textAnchor="middle" fontFamily="'Fredoka', system-ui" fontWeight="600" fontSize="36" fill="#2646A0">B</text>
    </Frame>
  ),

  /* ---- Puissance 4 : châssis bleu, jeton rouge en chute ---- */
  connect4: () => (
    <Frame>
      <defs>
        <linearGradient id="gca-c4-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#101a33" />
          <stop offset="100%" stopColor="#0a1122" />
        </linearGradient>
        <linearGradient id="gca-c4-board" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3565d8" />
          <stop offset="100%" stopColor="#1f3f96" />
        </linearGradient>
        <radialGradient id="gca-c4-red" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ff8a7a" />
          <stop offset="100%" stopColor="#d0271d" />
        </radialGradient>
        <radialGradient id="gca-c4-yel" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffe9a8" />
          <stop offset="100%" stopColor="#e8b81f" />
        </radialGradient>
      </defs>
      <rect width="300" height="200" fill="url(#gca-c4-bg)" />
      <g stroke="#5a708f" strokeWidth="2.5" opacity=".6" strokeLinecap="round">
        <line x1="150" y1="2" x2="150" y2="10" />
        <line x1="138" y1="0" x2="138" y2="6" />
        <line x1="162" y1="0" x2="162" y2="6" />
      </g>
      <circle cx="150" cy="27" r="16" fill="url(#gca-c4-red)" />
      <rect x="30" y="54" width="240" height="146" rx="14" fill="url(#gca-c4-board)" stroke="#17306e" strokeWidth="3" />
      {[0, 1, 2, 3, 4, 5].map(c => (
        <g key={c}>
          {[0, 1, 2].map(r => {
            const filled = {
              "0,2": "yel", "1,2": "red", "2,2": "yel", "3,2": "red", "5,2": "yel",
              "1,1": "yel", "3,1": "red",
            }[c + "," + r];
            const cx = 60 + c * 36, cy = 82 + r * 38;
            return (
              <g key={r}>
                <circle cx={cx} cy={cy} r="14" fill={filled ? `url(#gca-c4-${filled})` : "#0a1126"} />
                {!filled && <circle cx={cx} cy={cy} r="14" fill="none" stroke="#16295c" strokeWidth="2" />}
                {filled && <ellipse cx={cx - 4} cy={cy - 5} rx="6" ry="4" fill="#fff" opacity=".3" />}
              </g>
            );
          })}
        </g>
      ))}
    </Frame>
  ),

  /* ---- Petits Chevaux : bois chaud, cheval, dé et cases ---- */
  ludo: () => (
    <Frame>
      <defs>
        <linearGradient id="gca-ludo-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a5a2e" />
          <stop offset="100%" stopColor="#54341a" />
        </linearGradient>
        <radialGradient id="gca-ludo-glow" cx="50%" cy="36%" r="75%">
          <stop offset="0%" stopColor="#ffdf9e" stopOpacity=".22" />
          <stop offset="100%" stopColor="#ffdf9e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="200" fill="url(#gca-ludo-wood)" />
      <g stroke="#3d2410" strokeWidth="1.5" opacity=".35" fill="none">
        <path d="M0 42 q80 8 160 0 t140 6" />
        <path d="M0 118 q90 -8 180 0 t120 -4" />
        <path d="M0 172 q70 6 150 0 t150 4" />
      </g>
      <rect width="300" height="200" fill="url(#gca-ludo-glow)" />
      {[["#D64541", 40, 38], ["#4C9E52", 76, 26], ["#E8B81F", 112, 20], ["#3E6FD8", 148, 22], ["#D64541", 184, 30], ["#4C9E52", 218, 44]].map(([col, x, y], i) => (
        <rect key={i} x={x} y={y} width="26" height="26" rx="5" fill={col} stroke="#2e1b0c" strokeWidth="2" transform={`rotate(${-8 + i * 3} ${Number(x) + 13} ${Number(y) + 13})`} />
      ))}
      <g transform="rotate(-12 92 128)">
        <rect x="64" y="100" width="56" height="56" rx="12" fill="#f4efe4" stroke="#c9bfa8" strokeWidth="2" />
        <g fill="#33261a">
          <circle cx="78" cy="114" r="5.5" />
          <circle cx="106" cy="114" r="5.5" />
          <circle cx="92" cy="128" r="5.5" />
          <circle cx="78" cy="142" r="5.5" />
          <circle cx="106" cy="142" r="5.5" />
        </g>
      </g>
      <g>
        <path
          d="M196 178 C199 148 208 136 206 116 C197 107 195 92 204 81 L212 92 L217 72 L230 88 C247 97 256 114 254 134 C253 143 245 148 238 145 L229 136 C231 152 240 158 242 178 Z"
          fill="#241408" stroke="#f0c987" strokeWidth="2" strokeOpacity=".4"
        />
        <circle cx="221" cy="94" r="2.6" fill="#f0c987" />
      </g>
      <ellipse cx="222" cy="182" rx="34" ry="6" fill="#000" opacity=".3" />
    </Frame>
  ),

  /* ---- Chromatik : éventail de cartes colorées ---- */
  chromatik: () => (
    <Frame>
      <defs>
        <linearGradient id="gca-chr-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c1626" />
          <stop offset="100%" stopColor="#0e0b18" />
        </linearGradient>
        <radialGradient id="gca-chr-glow" cx="50%" cy="70%" r="70%">
          <stop offset="0%" stopColor="#FF9F6E" stopOpacity=".2" />
          <stop offset="100%" stopColor="#FF9F6E" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="200" fill="url(#gca-chr-bg)" />
      <rect width="300" height="200" fill="url(#gca-chr-glow)" />
      {[[-36, "#E64545"], [-13, "#F2A93B"], [10, "#3BB8A8"], [33, "#7C5CDB"]].map(([a, col], i) => (
        <g key={i} transform={`rotate(${a} 150 240)`}>
          <rect x="116" y="84" width="68" height="100" rx="11" fill={col} stroke="#fff" strokeOpacity=".85" strokeWidth="3" />
          <circle cx="150" cy="134" r="19" fill="#fff" opacity=".93" />
          {i === 0 && <path d="M150 124l3.2 6.8 7.4 1-5.4 5.2 1.3 7.4-6.5-3.5-6.5 3.5 1.3-7.4-5.4-5.2 7.4-1z" fill={col} />}
          {i === 1 && <polygon points="150,125 159,143 141,143" fill={col} />}
          {i === 2 && <rect x="142" y="126" width="16" height="16" rx="3" fill={col} transform="rotate(45 150 134)" />}
          {i === 3 && <circle cx="150" cy="134" r="8.5" fill={col} />}
        </g>
      ))}
    </Frame>
  ),

  /* ---- Gold Mines : galerie boisée, rails, pépites, pioche ---- */
  goldmines: () => (
    <Frame>
      <defs>
        <linearGradient id="gca-gm-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c1209" />
          <stop offset="100%" stopColor="#0b0704" />
        </linearGradient>
        <radialGradient id="gca-gm-lamp" cx="50%" cy="60%" r="60%">
          <stop offset="0%" stopColor="#ffb84d" stopOpacity=".28" />
          <stop offset="100%" stopColor="#ffb84d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="200" fill="url(#gca-gm-bg)" />
      <path d="M74 200 L74 96 Q150 34 226 96 L226 200 Z" fill="#050302" />
      <rect x="74" y="60" width="152" height="140" fill="url(#gca-gm-lamp)" />
      <path d="M74 200 L74 96 Q150 34 226 96 L226 200" fill="none" stroke="#7a5228" strokeWidth="11" />
      <rect x="60" y="92" width="13" height="108" fill="#8a5f33" />
      <rect x="227" y="92" width="13" height="108" fill="#8a5f33" />
      <g stroke="#9aa1ad" strokeWidth="4.5" strokeLinecap="round">
        <line x1="124" y1="200" x2="143" y2="120" />
        <line x1="176" y1="200" x2="157" y2="120" />
      </g>
      <g stroke="#6e5231" strokeWidth="5" strokeLinecap="round">
        <line x1="116" y1="188" x2="184" y2="188" />
        <line x1="124" y1="166" x2="176" y2="166" />
        <line x1="131" y1="146" x2="169" y2="146" />
      </g>
      <g>
        <polygon points="34,182 52,168 70,178 62,196 40,196" fill="#F2C94C" stroke="#8f6a12" strokeWidth="2" />
        <polygon points="52,168 60,174 54,182 46,178" fill="#FFE49A" />
        <polygon points="66,196 78,186 90,192 86,200 68,200" fill="#F2C94C" stroke="#8f6a12" strokeWidth="2" />
        <g stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".9">
          <line x1="30" y1="158" x2="30" y2="168" />
          <line x1="25" y1="163" x2="35" y2="163" />
        </g>
      </g>
      <g transform="rotate(34 250 130)">
        <rect x="246" y="92" width="8" height="84" rx="3" fill="#a9744a" />
        <path d="M212 94 Q250 70 288 94 Q250 82 212 94 Z" fill="#cfd6df" stroke="#8b94a3" strokeWidth="2" />
      </g>
    </Frame>
  ),

  /* ---- Président : feutre vert, cartes et haut-de-forme ---- */
  president: () => (
    <Frame>
      <defs>
        <radialGradient id="gca-pr-bg" cx="50%" cy="40%" r="85%">
          <stop offset="0%" stopColor="#155a40" />
          <stop offset="100%" stopColor="#07271c" />
        </radialGradient>
        <linearGradient id="gca-pr-hat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b2422" />
          <stop offset="100%" stopColor="#14100f" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#gca-pr-bg)" />
      <g transform="rotate(-11 128 130)">
        <rect x="97" y="86" width="62" height="88" rx="8" fill="#f8f6ef" stroke="#d8d2c2" strokeWidth="2" />
        <text x="108" y="112" fontFamily="Georgia, serif" fontWeight="700" fontSize="20" fill="#1d1d1d">A</text>
        <path d="M128 118 c-9 12 -12 16 -7 21 c3 4 7 1 7 1 c0 0 4 3 7 -1 c5 -5 2 -9 -7 -21 z M126 141 l4 0 l-2 7 z" fill="#1d1d1d" />
      </g>
      <g transform="rotate(9 176 128)">
        <rect x="145" y="84" width="62" height="88" rx="8" fill="#f8f6ef" stroke="#d8d2c2" strokeWidth="2" />
        <text x="155" y="110" fontFamily="Georgia, serif" fontWeight="700" fontSize="20" fill="#C23A3A">2</text>
        <path d="M176 122 c-4 -6 -13 -5 -13 2 c0 6 8 10 13 15 c5 -5 13 -9 13 -15 c0 -7 -9 -8 -13 -2 z" fill="#C23A3A" />
      </g>
      <g>
        <rect x="118" y="16" width="64" height="46" rx="6" fill="url(#gca-pr-hat)" />
        <rect x="118" y="48" width="64" height="10" fill="#C23A3A" />
        <ellipse cx="150" cy="62" rx="48" ry="10" fill="#171211" />
        <rect x="126" y="20" width="6" height="34" fill="#fff" opacity=".1" />
      </g>
      <g fill="#EFD98E">
        <path d="M250 60l2.6 7 7 2.6-7 2.6-2.6 7-2.6-7-7-2.6 7-2.6z" opacity=".9" />
        <circle cx="52" cy="70" r="2.5" opacity=".7" />
      </g>
    </Frame>
  ),

  /* ---- Yahtzee : le dé, gardé comme demandé (les deux, même) ---- */
  yahtzee: () => (
    <Frame>
      <defs>
        <radialGradient id="gca-yz-bg" cx="50%" cy="38%" r="85%">
          <stop offset="0%" stopColor="#1d6b45" />
          <stop offset="100%" stopColor="#0a2e1d" />
        </radialGradient>
        <linearGradient id="gca-yz-die" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#d9d9cd" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#gca-yz-bg)" />
      <ellipse cx="150" cy="168" rx="120" ry="26" fill="#000" opacity=".25" />
      <g stroke="#8fd6ae" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity=".5">
        <path d="M62 58 q-8 14 2 26" />
        <path d="M244 96 q10 12 2 26" />
      </g>
      <g transform="rotate(-14 108 104)">
        <rect x="70" y="66" width="76" height="76" rx="14" fill="url(#gca-yz-die)" stroke="#b9b9a9" strokeWidth="2" />
        <g fill="#262626">
          <circle cx="88" cy="84" r="6.5" />
          <circle cx="128" cy="84" r="6.5" />
          <circle cx="108" cy="104" r="6.5" />
          <circle cx="88" cy="124" r="6.5" />
          <circle cx="128" cy="124" r="6.5" />
        </g>
      </g>
      <g transform="rotate(11 202 122)">
        <rect x="166" y="86" width="72" height="72" rx="13" fill="url(#gca-yz-die)" stroke="#b9b9a9" strokeWidth="2" />
        <g fill="#262626">
          <circle cx="184" cy="102" r="6" />
          <circle cx="220" cy="102" r="6" />
          <circle cx="184" cy="122" r="6" />
          <circle cx="220" cy="122" r="6" />
          <circle cx="184" cy="142" r="6" />
          <circle cx="220" cy="142" r="6" />
        </g>
      </g>
    </Frame>
  ),

  /* ---- 10 000 : nuit bleu marine, dé néon sous la lune ---- */
  tenk: () => (
    <Frame>
      <defs>
        <linearGradient id="gca-tk-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#060e22" />
          <stop offset="100%" stopColor="#0d1c3d" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#gca-tk-bg)" />
      <g fill="#dcecff">
        <circle cx="34" cy="30" r="2" opacity=".9" />
        <circle cx="80" cy="58" r="1.5" opacity=".5" />
        <circle cx="120" cy="24" r="1.8" opacity=".7" />
        <circle cx="196" cy="40" r="1.4" opacity=".6" />
        <circle cx="270" cy="120" r="1.8" opacity=".6" />
        <circle cx="42" cy="128" r="1.4" opacity=".45" />
        <circle cx="252" cy="170" r="1.6" opacity=".5" />
      </g>
      <path d="M246 22 a 21 21 0 1 0 14 36 a 17 17 0 1 1 -14 -36 z" fill="#EAF6FF" opacity=".9" />
      <g transform="rotate(-10 144 118)">
        <rect x="104" y="78" width="80" height="80" rx="16" fill="none" stroke="#4FD1FF" strokeWidth="9" opacity=".22" />
        <rect x="104" y="78" width="80" height="80" rx="16" fill="rgba(79,209,255,.07)" stroke="#4FD1FF" strokeWidth="3" />
        <g>
          {[[122, 96], [166, 96], [144, 118], [122, 140], [166, 140]].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="12" fill="#4FD1FF" opacity=".18" />
              <circle cx={x} cy={y} r="6.5" fill="#9FE8FF" />
            </g>
          ))}
        </g>
      </g>
      <line x1="70" y1="176" x2="220" y2="176" stroke="#4FD1FF" strokeWidth="2" opacity=".25" strokeLinecap="round" />
    </Frame>
  ),

  /* ---- Piano Escape Room : clavier sous projecteur doré ---- */
  piano: () => (
    <Frame>
      <defs>
        <linearGradient id="gca-pi-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#261418" />
          <stop offset="100%" stopColor="#120a0e" />
        </linearGradient>
        <radialGradient id="gca-pi-spot" cx="50%" cy="0%" r="90%">
          <stop offset="0%" stopColor="#E8C878" stopOpacity=".3" />
          <stop offset="100%" stopColor="#E8C878" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="200" fill="url(#gca-pi-bg)" />
      <rect width="300" height="200" fill="url(#gca-pi-spot)" />
      <g fill="#E8C878">
        <g transform="rotate(-8 96 66)">
          <ellipse cx="90" cy="76" rx="9" ry="6.5" />
          <rect x="96" y="38" width="3.5" height="38" rx="1.5" />
          <path d="M99 38 q14 6 10 20 q-2 -10 -10 -12 z" />
        </g>
        <g transform="rotate(6 196 52)" opacity=".85">
          <ellipse cx="190" cy="62" rx="8" ry="6" />
          <rect x="195" y="26" width="3.5" height="36" rx="1.5" />
          <path d="M198 26 q13 6 9 19 q-2 -9 -9 -11 z" />
        </g>
        <circle cx="248" cy="86" r="2.5" opacity=".7" />
        <circle cx="56" cy="102" r="2" opacity=".6" />
      </g>
      <rect x="0" y="126" width="300" height="5" fill="#8c2f39" />
      <rect x="0" y="131" width="300" height="69" fill="#f4f0e6" />
      <g stroke="#b9b2a4" strokeWidth="2">
        {[33, 66, 99, 132, 165, 198, 231, 264].map(x => (
          <line key={x} x1={x} y1="131" x2={x} y2="200" />
        ))}
      </g>
      <g fill="#1a1a1e">
        {[22, 55, 121, 154, 187, 253, 286].map(x => (
          <rect key={x} x={x} y="131" width="21" height="42" rx="2" />
        ))}
      </g>
      <rect x="0" y="131" width="300" height="8" fill="#000" opacity=".2" />
    </Frame>
  ),

  /* ---- Échos : le phare, son faisceau et les ondes sonar ---- */
  echoes: () => (
    <Frame>
      <defs>
        <linearGradient id="gca-ec-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06222c" />
          <stop offset="100%" stopColor="#0a3542" />
        </linearGradient>
        <linearGradient id="gca-ec-beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFE9A8" stopOpacity=".5" />
          <stop offset="100%" stopColor="#FFE9A8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#gca-ec-bg)" />
      <g fill="#cfeef5">
        <circle cx="196" cy="26" r="1.6" opacity=".7" />
        <circle cx="256" cy="44" r="1.4" opacity=".5" />
        <circle cx="150" cy="14" r="1.4" opacity=".5" />
      </g>
      <polygon points="84,56 300,16 300,100" fill="url(#gca-ec-beam)" />
      <g fill="none" stroke="#5AC8DB">
        <circle cx="84" cy="56" r="28" strokeWidth="2.5" opacity=".4" />
        <circle cx="84" cy="56" r="48" strokeWidth="2" opacity=".25" />
        <circle cx="84" cy="56" r="68" strokeWidth="2" opacity=".14" />
      </g>
      <polygon points="64,148 76,66 92,66 104,148" fill="#C94F4F" />
      <polygon points="72.5,92 95.5,92 97,104 71,104" fill="#f0ece2" />
      <polygon points="69,120 99,120 100.5,132 67.5,132" fill="#f0ece2" />
      <rect x="70" y="46" width="28" height="20" rx="3" fill="#1d2733" />
      <circle cx="84" cy="56" r="6.5" fill="#FFE9A8" />
      <polygon points="66,46 84,32 102,46" fill="#2d3a49" />
      <path d="M0 156 q30 -12 60 0 t60 0 t60 0 t60 0 t60 0 V200 H0 Z" fill="#0e4a5c" />
      <path d="M0 172 q36 -10 72 0 t72 0 t72 0 t72 0 V200 H0 Z" fill="#0c3e4e" />
      <path d="M64 158 q20 6 40 0" stroke="#FFE9A8" strokeWidth="2" opacity=".35" fill="none" />
    </Frame>
  ),

  /* ---- Diapason : le diapason qui résonne sur la portée ---- */
  diapason: () => (
    <Frame>
      <defs>
        <radialGradient id="gca-di-bg" cx="50%" cy="42%" r="85%">
          <stop offset="0%" stopColor="#2c1e52" />
          <stop offset="100%" stopColor="#140d2a" />
        </radialGradient>
        <linearGradient id="gca-di-metal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e6e9f2" />
          <stop offset="100%" stopColor="#9aa3b8" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#gca-di-bg)" />
      <g stroke="#cbb8ff" strokeWidth="1.5" opacity=".14">
        {[48, 62, 76, 90, 104].map(y => (
          <line key={y} x1="0" y1={y} x2="300" y2={y} />
        ))}
      </g>
      <g fill="url(#gca-di-metal)">
        <rect x="130" y="26" width="11" height="74" rx="5" />
        <rect x="159" y="26" width="11" height="74" rx="5" />
        <rect x="130" y="94" width="40" height="14" rx="6" />
        <rect x="146" y="106" width="8" height="44" />
        <circle cx="150" cy="156" r="8" />
      </g>
      <g fill="none" stroke="#B388FF" strokeLinecap="round">
        <path d="M112 40 q-12 24 0 48" strokeWidth="3.5" opacity=".55" />
        <path d="M96 32 q-17 32 0 64" strokeWidth="3" opacity=".3" />
        <path d="M188 40 q12 24 0 48" strokeWidth="3.5" opacity=".55" />
        <path d="M204 32 q17 32 0 64" strokeWidth="3" opacity=".3" />
      </g>
      <g fill="#D8C8FF">
        <g transform="rotate(-10 232 76)">
          <ellipse cx="227" cy="84" rx="7.5" ry="5.5" />
          <rect x="232" y="52" width="3" height="32" rx="1.5" />
        </g>
        <g transform="rotate(8 66 128)" opacity=".8">
          <ellipse cx="62" cy="134" rx="6.5" ry="5" />
          <rect x="66.5" y="106" width="3" height="28" rx="1.5" />
        </g>
      </g>
    </Frame>
  ),

  /* ---- Le Louvre : cadre doré sous les lasers ---- */
  heist: () => (
    <Frame>
      <defs>
        <linearGradient id="gca-he-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#191521" />
          <stop offset="100%" stopColor="#0b0a10" />
        </linearGradient>
        <linearGradient id="gca-he-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8C878" />
          <stop offset="100%" stopColor="#A87B2E" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#gca-he-bg)" />
      <polygon points="150,0 40,0 118,84" fill="#fff" opacity=".05" />
      <rect x="103" y="30" width="94" height="116" rx="4" fill="url(#gca-he-gold)" stroke="#6e4e1a" strokeWidth="3" />
      <rect x="114" y="41" width="72" height="94" fill="#20302a" stroke="#8f6f33" strokeWidth="2" />
      <g>
        <path d="M150 66 a13 15 0 1 0 0.01 0 z" fill="#d8b98c" />
        <path d="M128 135 q4 -26 22 -26 q18 0 22 26 z" fill="#3a4a42" />
        <path d="M143 88 q7 6 14 0" stroke="#8a5c3a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
      <rect x="132" y="152" width="36" height="9" rx="2" fill="url(#gca-he-gold)" opacity=".9" />
      <g strokeLinecap="round">
        <line x1="0" y1="152" x2="300" y2="58" stroke="#FF2E63" strokeWidth="8" opacity=".18" />
        <line x1="0" y1="152" x2="300" y2="58" stroke="#FF2E63" strokeWidth="2.5" opacity=".9" />
        <line x1="0" y1="76" x2="300" y2="172" stroke="#FF2E63" strokeWidth="8" opacity=".14" />
        <line x1="0" y1="76" x2="300" y2="172" stroke="#FF2E63" strokeWidth="2.5" opacity=".75" />
      </g>
      <ellipse cx="150" cy="186" rx="70" ry="8" fill="#000" opacity=".4" />
    </Frame>
  ),
};

export default function GameCardArt({ id }) {
  const Scene = ART[id];
  return Scene ? <Scene /> : null;
}
