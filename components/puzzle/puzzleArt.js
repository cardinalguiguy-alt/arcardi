// ===== Puzzle Race — atelier de dessin SVG (PUR, zéro image bitmap) =====
// Deux illustrations maison, dans le même esprit que navalArt.js : dessinées
// en primitives SVG (gradients, formes, chemins), viewBox commun 0 0 900 600
// (ratio 3:2, celui du plateau quelle que soit la difficulté). Chaque
// illustration est un simple fragment de markup SVG <g>...</g> — le
// composant React l'injecte UNE fois comme image de référence, puis
// applique le clip-path de chaque pièce (voir puzzleEngine.js) par-dessus
// pour découper les pièces.
//
// Les 2 illustrations bitmap fournies par Guillaume (peinture + fan-art)
// rejoindront la banque dans un prochain zip, une fois les fichiers reçus
// en pièce jointe — voir IMAGE_BANK dans PuzzleGame.js.

export const PUZZLE_VIEWBOX = "0 0 900 600";

const f1 = n => (Math.round(n * 10) / 10).toString();

function poly(pts, fill, extra) {
  return `<polygon points="${pts.map(p => f1(p[0]) + "," + f1(p[1])).join(" ")}" fill="${fill}"${extra || ""}/>`;
}

/* ---------- Plage ---------- */
export function beachSVG() {
  let s = "";
  s += `<defs>
    <linearGradient id="pz-beach-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5EC1E8"/>
      <stop offset="65%" stop-color="#BFEAF2"/>
      <stop offset="100%" stop-color="#FDF3D0"/>
    </linearGradient>
    <linearGradient id="pz-beach-sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1E8FA8"/>
      <stop offset="100%" stop-color="#57C3C9"/>
    </linearGradient>
    <linearGradient id="pz-beach-sand" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F2D89B"/>
      <stop offset="100%" stop-color="#E0B871"/>
    </linearGradient>
  </defs>`;
  s += `<rect x="0" y="0" width="900" height="600" fill="url(#pz-beach-sky)"/>`;
  // soleil + rayons
  s += `<circle cx="740" cy="120" r="52" fill="#FFDD6B"/>`;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x1 = 740 + Math.cos(a) * 70, y1 = 120 + Math.sin(a) * 70;
    const x2 = 740 + Math.cos(a) * 92, y2 = 120 + Math.sin(a) * 92;
    s += `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="#FFDD6B" stroke-width="6" stroke-linecap="round"/>`;
  }
  // mouettes
  s += `<path d="M120,90 q14,-16 28,0 M160,120 q14,-16 28,0" stroke="#2B1B12" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M560,70 q12,-14 24,0" stroke="#2B1B12" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  // mer
  s += `<rect x="0" y="330" width="900" height="140" fill="url(#pz-beach-sea)"/>`;
  for (let i = 0; i < 5; i++) {
    s += `<path d="M${20 + i * 60},${350 + (i % 2) * 18} q30,14 60,0 t60,0 t60,0" stroke="rgba(255,255,255,.55)" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  }
  // voilier
  s += poly([[640, 400], [640, 330], [700, 395]], "#F5EFE0");
  s += poly([[634, 400], [634, 345], [606, 397]], "#EADFC4");
  s += `<rect x="600" y="397" width="48" height="10" rx="3" fill="#7A4A2B"/>`;
  // sable
  s += `<rect x="0" y="450" width="900" height="150" fill="url(#pz-beach-sand)"/>`;
  // palmier
  s += `<path d="M120,600 C118,520 132,460 150,420" stroke="#7A4A2B" stroke-width="16" fill="none" stroke-linecap="round"/>`;
  const frondBase = [150, 420];
  const fronds = [[70, 360], [95, 340], [150, 330], [205, 345], [225, 375], [210, 400]];
  for (const [fx, fy] of fronds) {
    s += `<path d="M${frondBase[0]},${frondBase[1]} Q${(frondBase[0]+fx)/2},${(frondBase[1]+fy)/2 - 20} ${fx},${fy}" stroke="#2F7A3D" stroke-width="14" fill="none" stroke-linecap="round"/>`;
  }
  // parasol + serviette
  s += `<path d="M760,470 L760,410" stroke="#7A4A2B" stroke-width="6"/>`;
  s += poly([[700, 412], [820, 412], [760, 370]], "#E85D5D");
  s += poly([[700, 412], [730, 412], [760, 370], [745, 396]], "#F5EFE0");
  s += `<rect x="700" y="540" width="80" height="34" rx="4" fill="#E85D5D"/>`;
  s += `<rect x="700" y="540" width="80" height="8" fill="#F5EFE0"/>`;
  s += `<rect x="700" y="558" width="80" height="8" fill="#F5EFE0"/>`;
  // étoile de mer
  s += `<g transform="translate(430,540) rotate(12)">` +
    poly([[0, -18], [6, -6], [18, -4], [8, 5], [11, 18], [0, 10], [-11, 18], [-8, 5], [-18, -4], [-6, -6]], "#E8935B") +
    `</g>`;
  // ballon de plage
  s += `<circle cx="330" cy="500" r="22" fill="#F5EFE0"/>`;
  s += `<path d="M330,478 A22,22 0 0,1 330,522" fill="#4ECDC4"/>`;
  s += `<path d="M312,486 A22,22 0 0,1 348,486" fill="#FFD166"/>`;
  return s;
}

/* ---------- Clairière de feu de camp, le soir ---------- */
export function campfireSVG() {
  let s = "";
  s += `<defs>
    <linearGradient id="pz-camp-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0B1230"/>
      <stop offset="60%" stop-color="#1B2A52"/>
      <stop offset="100%" stop-color="#2E3B63"/>
    </linearGradient>
    <radialGradient id="pz-camp-glow" cx="50%" cy="72%" r="45%">
      <stop offset="0%" stop-color="#FFB94A" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#FFB94A" stop-opacity="0"/>
    </radialGradient>
  </defs>`;
  s += `<rect x="0" y="0" width="900" height="600" fill="url(#pz-camp-sky)"/>`;
  // étoiles
  const starSeed = [ [60,60],[140,40],[220,90],[300,50],[400,30],[500,70],[620,45],[700,90],[780,55],[830,110],
    [100,140],[260,150],[470,130],[610,150],[760,160],[350,110],[40,220] ];
  for (const [x, y] of starSeed) s += `<circle cx="${x}" cy="${y}" r="2.4" fill="#FBEEDF"/>`;
  // lune
  s += `<circle cx="770" cy="90" r="38" fill="#F3ECD8"/>`;
  s += `<circle cx="784" cy="80" r="32" fill="#1B2A52"/>`;
  // silhouette de sapins, tout autour
  function pine(x, y, h) {
    return `<polygon points="${x},${y} ${x-h*0.34},${y+h} ${x+h*0.34},${y+h}" fill="#0E1A12"/>` +
      `<rect x="${x-h*0.05}" y="${y+h-2}" width="${h*0.1}" height="${h*0.16}" fill="#0E1A12"/>`;
  }
  s += pine(60, 300, 190) + pine(150, 330, 140) + pine(0, 280, 160);
  s += pine(840, 300, 190) + pine(760, 330, 140) + pine(900, 290, 170);
  s += pine(220, 360, 90) + pine(650, 365, 85);
  // sol
  s += `<rect x="0" y="470" width="900" height="130" fill="#151A12"/>`;
  s += `<ellipse cx="450" cy="470" rx="500" ry="34" fill="#1B2317"/>`;
  // halo du feu
  s += `<ellipse cx="450" cy="470" rx="260" ry="130" fill="url(#pz-camp-glow)"/>`;
  // tente
  s += poly([[130, 470], [230, 470], [180, 370]], "#5B3A24");
  s += poly([[180, 370], [230, 470], [205, 470]], "#3F2717");
  s += `<line x1="180" y1="410" x2="180" y2="470" stroke="#2B1B12" stroke-width="4"/>`;
  // feu de camp : bûches + flammes
  s += poly([[400, 480], [500, 480], [470, 460], [430, 460]], "#5B3A24");
  s += poly([[415, 468], [485, 468], [460, 452], [440, 452]], "#7A4A2B");
  s += `<path d="M450,462 C438,440 442,420 450,404 C458,420 452,432 462,414 C468,432 460,448 450,462 Z" fill="#FF8A3D"/>`;
  s += `<path d="M450,458 C443,444 446,430 450,420 C454,430 452,440 456,430 C458,440 454,450 450,458 Z" fill="#FFD166"/>`;
  // étincelles
  s += `<circle cx="440" cy="392" r="2.2" fill="#FFD166"/>`;
  s += `<circle cx="462" cy="378" r="1.8" fill="#FFB94A"/>`;
  s += `<circle cx="452" cy="360" r="1.6" fill="#FFD166"/>`;
  // rondin-banc
  s += `<rect x="590" y="472" width="90" height="22" rx="8" fill="#5B3A24"/>`;
  s += `<circle cx="595" cy="483" r="11" fill="#7A4A2B"/>`;
  s += `<circle cx="675" cy="483" r="11" fill="#7A4A2B"/>`;
  // lanterne posée au sol
  s += `<rect x="300" y="450" width="18" height="24" rx="3" fill="#4C3020"/>`;
  s += `<rect x="303" y="453" width="12" height="16" fill="#FFD166"/>`;
  s += `<line x1="309" y1="440" x2="309" y2="450" stroke="#2B1B12" stroke-width="2"/>`;
  return s;
}

export const IMAGE_BANK = [
  { id: "beach", kind: "svg", nameKey: "puzzleImgBeach", render: beachSVG },
  { id: "campfire", kind: "svg", nameKey: "puzzleImgCampfire", render: campfireSVG },
  // { id: "leda", kind: "bitmap", nameKey: "puzzleImgLeda", src: "/puzzle/leda-vinci.jpg" },
  // { id: "marioluigi", kind: "bitmap", nameKey: "puzzleImgMarioLuigi", src: "/puzzle/mario-luigi.png" },
];
