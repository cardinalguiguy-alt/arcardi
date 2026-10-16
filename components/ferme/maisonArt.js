/* =============================================================================
   maisonArt.js — LE SOL ET LES MURS DES MAISONS DES JOUEURS (2026-10-16)
   -----------------------------------------------------------------------------
   Les intérieurs des maisons (docs/PROJETS.md §6). Décision de Guillaume, le
   2026-10-16 : les MEUBLES sont des sprites rendus par Blender
   (`tools/blender/`), les tableaux et les objets rares des images Gemini, et
   les MURS ET LES SOLS SONT PEINTS AU CANEVAS — ici. C'est ce qui rend un
   papier peint, une peinture ou un parquet changeables par le joueur sans
   repasser par un rendu.

   ⚠️ LE GRAIN EST CELUI DES MEUBLES : `MPX` = 32 px de dessin par case
   (1 case = 1,183 m, la porte de 2,04 m des façades). Un pixel = 3,7 cm. Le
   jeu agrandit ensuite au cran de zoom (64 px par case au cran 4, 80 au
   cran 5), comme les façades. Peindre ici à 16 px par case (le grain du
   tribunal) aurait mis côte à côte deux finesses de dessin dans la même pièce.

   ⚠️ CE MODULE N'UTILISE QUE `fillRect` ET `fillStyle` : ni transformation
   ni texte. C'est ce qui le rend dessinable à l'identique par le jeu et par le
   faux canevas des bancs (noyau §4 : « le faux canevas des bancs ignore
   translate, scale et rotate »). Tout ce qui est aléatoire est TIRÉ D'UN
   HACHAGE des coordonnées : la même pièce se peint pareil chez tous les
   joueurs, à chaque image, sans rien stocker ni diffuser.

   LA PROJECTION (mesurée sur Blender, `tools/blender/studio.py`) : la
   profondeur et la hauteur montent toutes deux à l'échelle 1 vers le haut de
   l'écran. Un mur de 2,50 m dont le pied est à la ligne y se peint de
   y − WALL_PX à y.
   ========================================================================== */

export const MPX = 32;                       // px de dessin par case
export const CASE_M = 1.183;                 // une case, en mètres
export const pxOfM = (m) => Math.round(m / CASE_M * MPX);
export const WALL_M = 2.5;                   // hauteur sous plafond
export const WALL_PX = pxOfM(WALL_M);        // 68 px
export const WALL_EXT_PX = pxOfM(0.40);      // épaisseur d'un mur extérieur (11 px)
export const WALL_INT_PX = pxOfM(0.12);      // épaisseur d'une cloison (4 px)

// ─── hasard reproductible ─────────────────────────────────────────────────
function h32(a, b, c) {
  let x = (a * 374761393 + b * 668265263 + (c | 0) * 1274126177) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

function rect(ctx, x, y, w, h, c) {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

// ─── les sols ─────────────────────────────────────────────────────────────
/* LE PARQUET À L'ANGLAISE : des lames de 11 cm (3 px + 1 px de joint) posées
   d'est en ouest, longueurs de 1 à 1,6 m tirées par rangée, joints décalés,
   quatre tons de chêne et quelques fils sombres. `ox, oy` : l'origine de la
   pièce, pour que les rangées ne glissent pas quand on peint un morceau. */
export const PARQUETS = {
  chene:  { tons: ["#b98a55", "#c29360", "#ae7f4b", "#b5864f"], joint: "#6f4c2e", fil: "#9a6c3e" },
  miel:   { tons: ["#cf9f62", "#d6a96d", "#c49456", "#cc9c5e"], joint: "#80562f", fil: "#b07f48" },
  noyer:  { tons: ["#7a5232", "#84593a", "#6f4a2c", "#7f5636"], joint: "#3f2a19", fil: "#5d3d24" },
  blanchi:{ tons: ["#d9c9ad", "#e0d1b6", "#d2c1a4", "#dccdb2"], joint: "#a08f74", fil: "#c4b394" },
  // Le plancher brut des combles : de larges planches de sapin grisé (22 cm, 6 px).
  brut:   { tons: ["#a99a80", "#b3a487", "#9e8f75", "#a69779"], joint: "#6c604e", fil: "#8d7f67", row: 6 },
};

export function paintParquet(ctx, x0, y0, w, h, essence = "chene", ox = 0, oy = 0) {
  const P = PARQUETS[essence] || PARQUETS.chene;
  const ROW = P.row || 4;
  for (let ry = Math.floor((y0 - oy) / ROW); ry * ROW + oy < y0 + h; ry++) {
    const yy = ry * ROW + oy;
    // Les lames de la rangée : départ décalé par rangée, longueurs 27 à 43 px.
    let x = ox - Math.floor(h32(ry, 7, 1) * 40);
    let k = 0;
    while (x < x0 + w) {
      const len = 27 + Math.floor(h32(ry, k, 2) * 17);
      const a = Math.max(x, x0), b = Math.min(x + len, x0 + w);
      const ya = Math.max(yy, y0), yb = Math.min(yy + ROW - 1, y0 + h);
      if (b > a && yb > ya) {
        rect(ctx, a, ya, b - a, yb - ya, P.tons[Math.floor(h32(ry, k, 3) * 4)]);
        // un fil sombre dans la lame, parfois
        if (h32(ry, k, 4) < 0.55) {
          const fx = x + 3 + Math.floor(h32(ry, k, 5) * (len - 14));
          const fy = yy + Math.floor(h32(ry, k, 6) * 3);
          const fa = Math.max(fx, x0), fb = Math.min(fx + 6 + Math.floor(h32(ry, k, 8) * 8), b);
          if (fy >= y0 && fy < y0 + h && fb > fa) rect(ctx, fa, fy, fb - fa, 1, P.fil);
        }
        if (x + len - 1 >= x0 && x + len - 1 < x0 + w) rect(ctx, x + len - 1, ya, 1, yb - ya, P.joint);
      }
      x += len; k++;
    }
    if (yy + ROW - 1 >= y0 && yy + ROW - 1 < y0 + h) rect(ctx, x0, yy + ROW - 1, w, 1, P.joint);
  }
}

/* LES CARREAUX DE CIMENT DE L'ENTRÉE : carreaux de 30 cm (8 px), un motif qui
   ne se lit qu'à QUATRE carreaux — une rosace de quarts de cercle — et un
   liseré aux bords de la pièce (noyau §4 : un motif de sol se juge ASSEMBLÉ,
   et sa période compte plus que ses détails). */
/* ⚠️ 2026-10-16, témoin : un premier jeu de couleurs (rouge brique, NOIR,
   bleu-vert sur crème) écrasait la pièce entière — le sol de l'entrée
   prenait plus l'œil que le canapé. Le motif garde sa période, ses couleurs
   baissent d'un cran : terre cuite douce, gris chaud au lieu du noir. */
export const CIMENTS = {
  classique: { fond: "#e4d9c2", a: "#b5694c", b: "#6a625b", c: "#8aa39c", joint: "#cdc1a8" },
  bleu:      { fond: "#e6dfcd", a: "#4c708c", b: "#4a5560", c: "#c9a75a", joint: "#cfc6b0" },
};

export function paintCiment(ctx, x0, y0, w, h, motif = "classique", ox = 0, oy = 0) {
  const M = CIMENTS[motif] || CIMENTS.classique;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const lx = ((x - ox) % 16 + 16) % 16, ly = ((y - oy) % 16 + 16) % 16;
    // distance au centre du bloc de quatre carreaux (8, 8), et au coin
    const dc = Math.hypot(lx - 7.5, ly - 7.5);
    const dk = Math.min(Math.hypot(lx + 0.5, ly + 0.5), Math.hypot(15.5 - lx, ly + 0.5), Math.hypot(lx + 0.5, 15.5 - ly), Math.hypot(15.5 - lx, 15.5 - ly));
    let c = M.fond;
    if (dc < 2.2) c = M.c;
    else if (dc < 3.4) c = M.fond;
    else if (dc < 5.0) c = M.a;
    else if (dc < 5.9) c = M.b;
    if (dk < 2.6) c = M.b;
    else if (dk < 3.4) c = M.fond;
    if ((lx % 8) === 7 || (ly % 8) === 7) c = c === M.fond ? M.joint : c;
    rect(ctx, x, y, 1, 1, c);
  }
}

// ─── les murs ─────────────────────────────────────────────────────────────
/* LE PAPIER PEINT, ses motifs. Chaque motif est une fonction (x, y) → couleur
   ou null (le fond), en coordonnées LOCALES du mur : la période se lit sur la
   longueur entière du mur, pas morceau par morceau. */
export const PAPIERS = {
  fleurs: {   // semis de petits bouquets en quinconce, fond crème
    fond: "#ead9bb",
    motif(x, y) {
      const cy = Math.floor(y / 10), py = ((y % 10) + 10) % 10;
      const px = (((x + (cy % 2) * 6) % 12) + 12) % 12;
      if (px === 5 && py >= 3 && py <= 5) return py === 4 ? "#e0b44a" : "#c76d66";
      if (py === 4 && (px === 4 || px === 6)) return "#c76d66";
      if (py === 6 && (px === 3 || px === 7)) return "#7d9a62";
      if (py === 7 && px === 5) return "#7d9a62";
      return null;
    },
  },
  rayures: {  // rayures « tennis » ton sur ton
    fond: "#dfd0ae",
    motif(x) {
      const m = ((x % 9) + 9) % 9;
      return m < 3 ? "#e9dcbd" : m === 6 ? "#cbb994" : null;
    },
  },
  vert_anglais: {   // uni profond, filets dorés espacés
    fond: "#3f5a48",
    motif(x) { return (((x % 14) + 14) % 14) === 0 ? "#8d8457" : null; },
  },
  platre: {         // le plâtre d'origine, chaulé : un fond crème, quelques taches plus sombres
    fond: "#ebe3d1",
    motif(x, y) { return h32(x, y, 9) < 0.035 ? "#e0d6c1" : null; },
  },
  damas: {          // damas bordeaux ton sur ton : des fleurons en losange, deux rouges proches
    fond: "#7a2e2c",
    motif(x, y) {
      const u = ((x % 12) + 12) % 12, v = ((y % 16) + 16) % 16;
      const a = Math.abs(u - 6) / 6 + Math.abs(v - 8) / 8;
      if (a < 0.35) return "#8e3a36";
      if (a > 0.62 && a < 0.72) return "#6b2624";
      return (u === 6 && (v === 1 || v === 15)) ? "#93413b" : null;
    },
  },
  pois: {           // un semis de pois crème sur un vert sauge doux, en quinconce
    fond: "#a7b59a",
    motif(x, y) {
      const r = Math.floor(y / 7), u = ((x + (r % 2) * 4) % 8 + 8) % 8, v = ((y % 7) + 7) % 7;
      return (u === 3 || u === 4) && (v === 3 || v === 4) ? "#ece4cf" : null;
    },
  },
  toile_bleue: {    // toile de Jouy évoquée : losanges bleus clairsemés
    fond: "#ece6d8",
    motif(x, y) {
      const u = ((x % 14) + 14) % 14, v = ((y % 14) + 14) % 14;
      const d = Math.abs(u - 7) + Math.abs(v - 7);
      return d === 5 ? "#56708e" : d === 1 ? "#7f96ae" : null;
    },
  },
};

export const LAMBRIS = {
  sauge:  { fond: "#9eab93", clair: "#b5c1a9", sombre: "#7d8a73" },
  creme:  { fond: "#e4dac4", clair: "#f1e9d6", sombre: "#c2b597" },
  bleu:   { fond: "#6f8a96", clair: "#89a3ae", sombre: "#566e79" },
  bois:   { fond: "#8a5c36", clair: "#a06d43", sombre: "#6a4429" },
};

const PLINTHE = { fond: "#efe6d2", clair: "#fbf5e7", sombre: "#bfb193" };

/* LA FACE D'UN MUR DU FOND, de son pied (ligne `yFoot`) jusqu'au plafond :
   plinthe, lambris à panneaux jusqu'à 95 cm, cimaise, papier peint, corniche.
   `lx` : l'abscisse de ce morceau dans le mur (pour la période du papier et
   des panneaux). `ombreHaut` : le plafond assombrit le haut du papier. */
export function paintWallFace(ctx, x0, yFoot, w, deco = {}, lx = 0, hPx = WALL_PX) {
  const papier = PAPIERS[deco.papier] || PAPIERS.fleurs;
  const faience = deco.lambris === "faience";
  const lam = deco.lambris == null || faience ? null : (LAMBRIS[deco.lambris] || LAMBRIS.sauge);
  const top = yFoot - hPx;
  const yPl = yFoot - 4;                    // plinthe : 15 cm
  const yCi = yFoot - pxOfM(0.95);          // cimaise : 95 cm
  const yFa = yFoot - pxOfM(1.20);          // faïence : 1,20 m
  const basPapier = lam ? yCi : faience ? yFa : yPl;
  // le papier
  for (let y = top; y < basPapier; y++) for (let x = x0; x < x0 + w; x++) {
    const c = papier.motif(x - x0 + lx, y - top) || papier.fond;
    rect(ctx, x, y, 1, 1, c);
  }
  // l'ombre du plafond : trois rangées, de plus en plus légères
  for (let k = 0; k < 3; k++) { ctx.globalAlpha = 0.18 - k * 0.05; rect(ctx, x0, top + 4 + k, w, 1, "#2a2018"); }
  ctx.globalAlpha = 1;
  // la corniche : 4 px en gradins
  rect(ctx, x0, top, w, 1, PLINTHE.sombre);
  rect(ctx, x0, top + 1, w, 2, PLINTHE.fond);
  rect(ctx, x0, top + 3, w, 1, PLINTHE.clair);
  if (faience) {
    /* La faïence « métro » de la cuisine et des bains : briquettes de 7,5 × 15 cm
       (2 × 4 px), joints d'un pixel, posées à joints croisés, un listel vert. */
    for (let y = yFa; y < yFoot; y++) for (let x = x0; x < x0 + w; x++) {
      const r = y - yFa, row = Math.floor(r / 3);
      const jx = ((x - x0 + lx + (row % 2) * 2) % 5 + 5) % 5;
      rect(ctx, x, y, 1, 1, r % 3 === 2 || jx === 4 ? "#cdc8bd" : (h32(Math.floor((x - x0 + lx + (row % 2) * 2) / 5), row, 3) < 0.15 ? "#e6e3da" : "#f2efe8"));
    }
    rect(ctx, x0, yFa - 1, w, 1, "#4f7a64");
    rect(ctx, x0, yFa, w, 1, "#6f9a84");
    return;
  }
  if (lam) {
    rect(ctx, x0, yCi, w, yPl - yCi, lam.fond);
    // les panneaux : 18 px de large, moulure claire en haut et à gauche, sombre en bas et à droite
    const PW = 18;
    for (let p = Math.floor(lx / PW) - 1; p * PW - lx < w; p++) {
      const px0 = x0 + p * PW - lx + 3, pw = PW - 6, py0 = yCi + 5, ph = yPl - yCi - 9;
      const a = Math.max(px0, x0), b = Math.min(px0 + pw, x0 + w);
      if (b <= a) continue;
      rect(ctx, a, py0, b - a, 1, lam.sombre);
      rect(ctx, a, py0 + ph, b - a, 1, lam.clair);
      if (px0 >= x0) rect(ctx, px0, py0, 1, ph, lam.sombre);
      if (px0 + pw - 1 < x0 + w) rect(ctx, px0 + pw - 1, py0, 1, ph + 1, lam.clair);
    }
    // la cimaise
    rect(ctx, x0, yCi - 2, w, 1, PLINTHE.clair);
    rect(ctx, x0, yCi - 1, w, 1, PLINTHE.fond);
    rect(ctx, x0, yCi, w, 1, PLINTHE.sombre);
  }
  // la plinthe
  rect(ctx, x0, yPl, w, 1, PLINTHE.clair);
  rect(ctx, x0, yPl + 1, w, 2, PLINTHE.fond);
  rect(ctx, x0, yPl + 3, w, 1, PLINTHE.sombre);
}

/* LE MUR DU FOND DES COMBLES : un mur bas (la jambette, `kneePx`) puis le
   rampant lambrissé du toit jusqu'à `hPx`, ses chevrons sombres tous les
   48 cm. Vu de la caméra, la pente se lit comme un bandeau de planches. */
export function paintSlopeFace(ctx, x0, yFoot, w, kneePx, hPx, lx = 0) {
  const top = yFoot - hPx, yK = yFoot - kneePx;
  for (let y = top; y < yK; y++) {
    const r = y - top, plank = r % 4 === 3;
    rect(ctx, x0, y, w, 1, plank ? "#7a5c3c" : (Math.floor(r / 4) % 2 ? "#a9835a" : "#b38c61"));
  }
  for (let x = x0 - ((lx % 13) + 13) % 13; x < x0 + w; x += 13) {
    const a = Math.max(x, x0), b = Math.min(x + 2, x0 + w);
    if (b > a) { rect(ctx, a, top, b - a, yK - top, "#5e4127"); if (x + 2 < x0 + w && x + 2 >= x0) rect(ctx, x + 2, top, 1, yK - top, "#3f2b1a"); }
  }
  rect(ctx, x0, yK - 2, w, 2, "#4a3320");        // la sablière, au pied du rampant
  paintWallFace(ctx, x0, yFoot, w, { papier: "platre", lambris: null }, lx, kneePx);
}

/* UNE PORTE DANS UN MUR DU FOND : chambranle, vantail entrouvert vers la pièce
   d'à côté (on devine le noir de la pièce éteinte). 0,90 × 2,10 m. */
export function paintWallDoor(ctx, x0, yFoot, ouverte = true, w = pxOfM(0.90)) {
  const hh = pxOfM(2.10);
  const top = yFoot - hh;
  rect(ctx, x0 - 2, top - 2, w + 4, hh + 2, "#f1e9d6");          // chambranle
  rect(ctx, x0 - 2, top - 2, 1, hh + 2, "#c2b597");
  rect(ctx, x0 + w + 1, top - 2, 1, hh + 2, "#c2b597");
  rect(ctx, x0, top, w, hh, "#1a1512");                          // la pièce voisine, éteinte
  if (ouverte) {
    const vw = Math.round(w * 0.38);
    rect(ctx, x0, top, vw, hh, "#d8cdb4");                        // le vantail, vu de biais
    rect(ctx, x0 + vw - 1, top, 1, hh, "#a99a7c");
    rect(ctx, x0 + 2, top + 5, vw - 5, 1, "#bdb193");
    rect(ctx, x0 + 2, top + Math.round(hh * 0.55), vw - 5, 1, "#bdb193");
    rect(ctx, x0 + vw - 4, top + Math.round(hh * 0.5), 2, 2, "#c9a24a");   // la poignée
  }
  rect(ctx, x0 - 2, yFoot - 1, w + 4, 1, "#8a7a5e");             // le seuil
}

/* L'ARASE D'UN MUR COUPÉ, vue de dessus : la tranche sombre du mur (brique et
   plâtre), un filet clair côté pièce. C'est tout ce qu'on voit d'un mur
   latéral (sa face est de profil) et du mur de façade (coupé pour voir dedans). */
export function paintWallTop(ctx, x, y, w, h) {
  rect(ctx, x, y, w, h, "#3b302a");
  rect(ctx, x, y, w, 1, "#6b5a4d");
  if (h > 4) for (let k = 2; k < h - 1; k += 3) for (let i = x + ((k / 3) % 2 ? 2 : 0); i < x + w - 1; i += 6) rect(ctx, i, y + k, 4, 1, "#463830");
}

/* LA FLAQUE DE SOLEIL : la lumière d'une fenêtre de façade (au sud) posée sur
   le sol de la pièce, déportée vers l'est l'après-midi — un parallélogramme
   chaud, peint rangée par rangée. `force` 0 à 1 (l'heure la règlera). */
export function paintSunPool(ctx, x0, yWall, w, profondeur, derive, force = 1, xMin = -Infinity, xMax = Infinity) {
  /* ⚠️ `xMin`/`xMax` bornent la tache à l'intérieur : vu en jeu le 2026-10-16, la
     fenêtre de droite d'une étroite, déportée par le soleil d'après-midi, posait sa
     tache AU-DELÀ du mur est — un parallélogramme sombre sur le vide. */
  for (let k = 0; k < profondeur; k++) {
    const t = k / profondeur;
    const a = Math.max(xMin, Math.round(x0 + derive * t)), b = Math.min(xMax, Math.round(x0 + derive * t) + w);
    if (b <= a) continue;
    ctx.globalAlpha = force * (0.30 - 0.18 * t);
    rect(ctx, a, yWall - 1 - k, b - a, 1, "#ffe7a8");
  }
  ctx.globalAlpha = 1;
}

/* L'OMBRE DE CONTACT d'un meuble : son emprise au sol, débordée d'un pixel,
   assombrie — un meuble posé, pas un meuble collé sur une image. */
export function paintContactShadow(ctx, x, y, w, h, force = 0.26) {
  ctx.globalAlpha = force;
  rect(ctx, x - 1, y, w + 2, h + 1, "#20160f");
  ctx.globalAlpha = force * 0.5;
  rect(ctx, x - 2, y + 1, w + 4, h + 1, "#20160f");
  ctx.globalAlpha = 1;
}

// ─── 2026-10-16 (lot 1) : les sols qui manquaient à la maison d'origine ──
/* LES TOMETTES DE LA CUISINE : des hexagones de terre cuite de 16 cm (6 px),
   rangées décalées d'une demi-tomette, coins coupés, quatre tons tirés. */
export const TOMETTES = { rouge: { tons: ["#a9533a", "#b45d40", "#9c4b33", "#b8664a"], joint: "#6e3a28" } };
export function paintTomettes(ctx, x0, y0, w, h, v = "rouge", ox = 0, oy = 0) {
  const T = TOMETTES[v] || TOMETTES.rouge;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const ry = y - oy, row = Math.floor(ry / 5), py = ((ry % 5) + 5) % 5;
    const rx = x - ox + (row % 2 ? 3 : 0), col = Math.floor(rx / 6), px = ((rx % 6) + 6) % 6;
    const coin = (py === 0 || py === 3) && (px === 0 || px === 4);
    rect(ctx, x, y, 1, 1, py === 4 || px === 5 || coin ? T.joint : T.tons[Math.floor(h32(col, row, 11) * 4)]);
  }
}
/* LES CARREAUX À CABOCHONS DES BAINS : carrés blancs de 22 cm (7 px), un petit
   cabochon bleu nuit à chaque croisement de joints. */
export function paintCabochons(ctx, x0, y0, w, h, v = "blanc", ox = 0, oy = 0) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const px = ((x - ox) % 8 + 8) % 8, py = ((y - oy) % 8 + 8) % 8;
    const cab = (px >= 7 || px === 0) && (py >= 7 || py === 0);
    rect(ctx, x, y, 1, 1, cab ? "#2c3e50" : px === 7 || py === 7 ? "#c9c6bc" : (h32(Math.floor((x - ox) / 8), Math.floor((y - oy) / 8), 5) < 0.2 ? "#e4e2db" : "#efeee8"));
  }
}

/* UNE FENÊTRE DANS UN MUR DU FOND (le mur nord, côté jardin) : allège à 90 cm,
   haut à 2,15 m, embrasure, petits bois. Le VERRE est rendu à part (`glass`),
   pour que le ciel de l'heure s'y peigne à chaque image. */
export function paintWallWindow(ctx, x0, yFoot, w) {
  const yA = yFoot - pxOfM(0.90), yH = yFoot - pxOfM(2.15);
  rect(ctx, x0 - 2, yH - 2, w + 4, yA - yH + 4, "#d9cfb9");        // l'embrasure
  rect(ctx, x0 - 2, yH - 2, w + 4, 1, "#bfb193");
  rect(ctx, x0, yH, w, yA - yH, "#efe8d8");                          // le dormant, blanc
  const g = [x0 + 2, yH + 2, w - 4, yA - yH - 4];
  rect(ctx, x0 - 3, yA, w + 6, 2, "#e8e0cc");                        // l'appui
  rect(ctx, x0 - 3, yA + 2, w + 6, 1, "#a99c80");
  return g;
}
/* Le verre d'une fenêtre, à l'heure : `ciel` [r, g, b] 0..1 (le ciel de l'image). */
export function paintGlass(ctx, g, ciel) {
  const c = (k, a) => Math.round(255 * Math.min(1, ciel[k] * a));
  ctx.fillStyle = `rgb(${c(0, 0.62)},${c(1, 0.78)},${c(2, 0.92)})`;
  ctx.fillRect(g[0], g[1], g[2], g[3]);
  ctx.fillStyle = `rgb(${c(0, 0.80)},${c(1, 0.90)},${c(2, 1.0)})`;
  ctx.fillRect(g[0], g[1], g[2], Math.max(1, Math.round(g[3] * 0.35)));
  ctx.fillStyle = "#efe8d8";                                         // les petits bois
  ctx.fillRect(g[0] + Math.round(g[2] / 2), g[1], 1, g[3]);
  ctx.fillRect(g[0], g[1] + Math.round(g[3] / 2), g[2], 1);
}

// ─── la cuisson d'un niveau ──────────────────────────────────────────────
/* Le repère des images cuites : le coin (HOME_FX0, HOME_FY0) du plan, en cases,
   est le pixel (0, 0). Assez de marge au nord pour les faces des murs du fond. */
export const HOME_FX0 = -1.0, HOME_FY0 = -3.0;   // −1 en x : la place des murs latéraux évasés
/* ╔════════════════════════════════════════════════════════════════════════
   ║ 2026-10-16 (soir) — LA PROFONDEUR : LES MURS ÉVASÉS (« une vraie idée de
   ║ profondeur, perspective plus lisible entre les murs et le sol » — Guillaume).
   ╚════════════════════════════════════════════════════════════════════════
   Dans la projection du jeu, un mur latéral se voit par la tranche : un trait.
   La pièce se lisait comme un plan. On fait ce qu'une caméra centrée ferait
   aux verticales : elles s'écartent du centre en montant (`κ` × distance au
   centre × hauteur). Les murs latéraux montrent alors leur face intérieure
   (papier, lambris, plinthe le long du sol) et le mur du fond s'élargit vers
   le haut pour les rejoindre : une boîte ouverte sur l'avant. ⚠️ ÉVASÉS, ILS
   TOMBENT HORS DU SOL À L'ÉCRAN : ils ne cachent jamais ni meuble ni personne.
   Le sol, la collision, les meubles et les personnages ne bougent pas. */
export const HOME_FLARE = 0.11;
const flarePx = (lx, zPx, xc) => HOME_FLARE * (lx - xc) * zPx;
export const homePx = (lx, ly) => [Math.round((lx - HOME_FX0) * MPX), Math.round((ly - HOME_FY0) * MPX)];
export const HOME_VOID = "#15110e";
export const HOME_CUT = 10;                   // la coupe des murs bas : 35 cm

const SOLS = {
  parquet: paintParquet, ciment: paintCiment, tomettes: paintTomettes, carreaux: paintCabochons,
  vide: (ctx, x, y, w, h) => { rect(ctx, x, y, w, h, "#0d0a08"); },
};
/* LE SOL d'un niveau, une fois : les pièces (chacune son motif, son origine au
   coin de la pièce), les ombres de contact au pied des murs, le bas des pentes
   assombri. `mk(w, h)` fabrique un canevas. */
export function bakeHomeFloor(mk, plan, L, H) {
  const lv = plan.niveaux[L];
  const W = Math.ceil((plan.w - 2 * HOME_FX0) * MPX), Hh = Math.ceil((plan.d + 0.6 - HOME_FY0) * MPX);
  const c = mk(W, Hh), g = c.getContext("2d");
  rect(g, 0, 0, W, Hh, HOME_VOID);
  for (const p of lv.pieces.slice().reverse()) {
    const f = SOLS[p.sol[0]] || SOLS.parquet;
    const [ox, oy] = homePx(p.rects[0][0], p.rects[0][1]);
    for (const [x0, y0, x1, y1] of p.rects) {
      const [a, b] = homePx(x0, y0), [cc, d] = homePx(x1, y1);
      f(g, a, b, cc - a, d - b, p.sol[1], ox, oy);
    }
  }
  for (const pl of lv.pleins) {
    const [a, b] = homePx(pl.rect[0], pl.rect[1]), [cc, d] = homePx(pl.rect[2], pl.rect[3]);
    g.globalAlpha = pl.nom === "sous_pente" ? 0.45 : 1;
    rect(g, a, b, cc - a, d - b, pl.nom === "sous_pente" ? "#1a120c" : "#3a2a1f");
    g.globalAlpha = 1;
  }
  /* L'OMBRE AU PIED DES MURS (2026-10-16 soir : plus large et plus dense — c'est
     elle qui pose le mur SUR le sol) : 10 px de dégradé sous chaque face, 7 px le
     long des murs latéraux, et les angles du fond plus sombres. */
  const ombre = (x, y, w, h, a) => { g.globalAlpha = a; rect(g, x, y, w, h, "#1c130c"); };
  for (const f of H.homeFaces(plan, L)) {
    const [a, b] = homePx(f.x0, f.y), [cc] = homePx(f.x1, f.y);
    for (let k = 0; k < 10; k++) ombre(a, b + k, cc - a, 1, 0.34 * (1 - k / 10) ** 1.6);
  }
  {
    const [x0, y0] = homePx(0, 0), [x1, y1] = homePx(plan.w, plan.d);
    for (let k = 0; k < 7; k++) { const al = 0.26 * (1 - k / 7) ** 1.6; ombre(x0 + k, y0, 1, y1 - y0, al); ombre(x1 - 1 - k, y0, 1, y1 - y0, al); }
    // le fond de la pièce s'assombrit un peu : la lumière vient de la façade
    for (let k = 0; k < y1 - y0; k++) { const t = 1 - k / (y1 - y0); if (t > 0.45) ombre(x0, y0 + k, x1 - x0, 1, 0.10 * (t - 0.45) / 0.55); }
  }
  g.globalAlpha = 1;
  paintSideFaces(g, plan, L, H);
  for (const lw of H.homeLows(plan, L, null)) {
    if (lw.kind === "facade") continue;
    const [a, b] = homePx(lw.rect[0], lw.rect[1]), [cc, d] = homePx(lw.rect[2], lw.rect[3]);
    g.globalAlpha = 0.20; rect(g, a - 1, b, 1, d - b, "#20160f"); rect(g, cc, b, 1, d - b, "#20160f");
  }
  g.globalAlpha = 1;
  return c;
}
/* UNE FACE, une fois : le papier et le lambris de la pièce au sud, ses portes
   (le vantail entrouvert sur le noir de la pièce d'à côté), ses fenêtres
   (le verre est rendu à part, `glass` en px de la face), l'arase au-dessus.
   Rend { c, W, H, capPx, wallPx, glass }. Le pied de la face est la dernière
   rangée de l'image. */
export function bakeHomeFace(mk, plan, L, f) {
  const lv = plan.niveaux[L];
  const piece = lv.pieces.find((p) => p.id === f.room) || lv.pieces[0];
  const wallPx = lv.pente ? pxOfM(2.3) : pxOfM(lv.mur);
  const capPx = Math.max(2, Math.round((f.y - f.yCap) * MPX));
  /* ⚠️ La largeur se lit ENTRE LES PIXELS DES DEUX BORDS (`homePx`), jamais
     `round(largeur)` : deux faces voisines arrondies chacune de son côté
     laissaient un pixel de vide entre elles (palier | bains, 70,4 → 70). */
  const W = Math.max(1, homePx(f.x1, 0)[0] - homePx(f.x0, 0)[0]), Hh = wallPx + capPx;
  const c = mk(W, Hh), g = c.getContext("2d");
  const lx = Math.round(f.x0 * MPX);
  if (lv.pente) paintSlopeFace(g, 0, Hh, W, pxOfM(lv.mur), wallPx, lx);
  else paintWallFace(g, 0, Hh, W, piece.murs, lx, wallPx);
  for (const [a, b] of f.portes || []) {
    const pa = Math.round((Math.max(a, f.x0) - f.x0) * MPX), pb = Math.round((Math.min(b, f.x1) - f.x0) * MPX);
    if (pb - pa > 6) paintWallDoor(g, pa, Hh, true, pb - pa);
  }
  const glass = [];
  for (const [a, b] of f.fenetres || []) {
    const pa = Math.round((a - f.x0) * MPX), pb = Math.round((b - f.x0) * MPX);
    if (pb - pa > 6) glass.push(paintWallWindow(g, pa, Hh, pb - pa));
  }
  paintWallTop(g, 0, 0, W, capPx);
  return { c, W, H: Hh, capPx, wallPx, glass };
}

// ─── les dessins de chaque image (dans le repère des images cuites) ──────
/* UN MUR BAS (nord-sud, coupé à 35 cm) : son arase, et sa tranche sud. */
export function drawLowWall(ctx, x0, y0, x1, y1, ext) {
  const [a, b] = homePx(x0, y0), [c, d] = homePx(x1, y1);
  const w = Math.max(1, c - a);
  paintWallTop(ctx, a, b - HOME_CUT, w, d - b);
  rect(ctx, a, d - HOME_CUT, w, HOME_CUT, ext ? "#8f7d68" : "#d9cfb9");
  rect(ctx, a, d - 1, w, 1, "#5e5244");
}
/* UN GARDE-CORPS à claire-voie (90 cm) : une main courante de noyer posée sur
   des balustres tous les 12 cm. Vu de face s'il court d'est en ouest, en
   enfilade s'il court du nord au sud. */
export function drawRailing(ctx, x0, y0, x1, y1) {
  const [a, b] = homePx(x0, y0), [c, d] = homePx(x1, y1);
  const H = pxOfM(0.9);
  if (c - a >= d - b) {          // est-ouest : on le voit de face
    for (let x = a + 1; x < c; x += 4) rect(ctx, x, d - H, 1, H, "#6e4529");
    rect(ctx, a, d - H - 1, c - a, 2, "#553219");
    rect(ctx, a, d - H - 1, c - a, 1, "#8a5a36");
    rect(ctx, a, d - 2, c - a, 2, "#553219");
  } else {                       // nord-sud : la main courante en fuite, les balustres en file
    for (let y = b + 2; y < d; y += 4) rect(ctx, a + 1, y - H, 1, H, "#6e4529");
    rect(ctx, a, b - H - 1, Math.max(2, c - a), d - b + 1, "#553219");
    rect(ctx, a, b - H - 1, 1, d - b + 1, "#8a5a36");
  }
}
/* LA FAÇADE VUE DE DEDANS, COUPÉE : la tranche du mur (pierre), la porte
   d'entrée (le seuil, un paillasson) et les fenêtres de CE niveau (l'appui
   clair, le verre en filet). `ciel` colore les vitres. */
export function drawFacadeCut(ctx, plan, lw, ciel) {
  const [x0, y0, x1, y1] = lw.rect;
  const trous = [...(lw.porte ? [lw.porte] : []), ...lw.fenetres].sort((p, q) => p[0] - q[0]);
  let cur = x0;
  const seg = (a, b) => {
    const [pa, pb] = homePx(a, y0), [pc, pd] = homePx(b, y1);
    if (pc - pa <= 0) return;
    paintWallTop(ctx, pa, pb - HOME_CUT, pc - pa, pd - pb);
    rect(ctx, pa, pd - HOME_CUT, pc - pa, HOME_CUT, "#a39178");
    rect(ctx, pa, pd - 1, pc - pa, 1, "#5e5244");
  };
  for (const [a, b] of trous) { seg(cur, a); cur = b; }
  seg(cur, x1);
  for (const [a, b] of lw.fenetres) {
    const [pa, pb] = homePx(a, y0), [pc, pd] = homePx(b, y1);
    rect(ctx, pa, pb - HOME_CUT, pc - pa, pd - pb, "#cfc3ab");
    rect(ctx, pa, pb - HOME_CUT, pc - pa, 1, "#e9e1cf");
    const c = (k, s) => Math.round(255 * Math.min(1, ciel[k] * s));
    rect(ctx, pa, pb - HOME_CUT + 5, pc - pa, 1, `rgb(${c(0, 0.62)},${c(1, 0.78)},${c(2, 0.92)})`);
    rect(ctx, pa, pd - HOME_CUT, pc - pa, HOME_CUT, "#b8a68a");
  }
  if (lw.porte) {
    const [pa, pb] = homePx(lw.porte[0], y0), [pc, pd] = homePx(lw.porte[1], y1);
    rect(ctx, pa, pb, pc - pa, pd - pb, "#9b8a70");                 // le seuil de pierre
    rect(ctx, pa + 4, pb - 9, pc - pa - 8, 7, "#7a5a34");            // le paillasson
    for (let k = 0; k < 7; k += 2) rect(ctx, pa + 4, pb - 9 + k, pc - pa - 8, 1, "#8f6a3e");
  }
}
/* L'AMPOULE NUE de la maison d'origine (aucune lampe au départ) : un fil qui
   tombe du plafond au milieu de la pièce, une douille, l'ampoule — allumée,
   un verre blanc chaud. (px, pyFloor) : le point du sol à la verticale. */
export function drawBulb(ctx, px, pyFloor, allume, plafondPx = WALL_PX) {
  const top = pyFloor - plafondPx, bas = pyFloor - pxOfM(2.05);
  rect(ctx, px, top, 1, bas - top, "#2a2420");
  rect(ctx, px - 1, bas, 3, 2, "#3a322c");
  rect(ctx, px - 1, bas + 2, 3, 3, allume ? "#fff4cf" : "#cfc8b4");
  rect(ctx, px, bas + 5, 1, 1, allume ? "#ffe9a8" : "#b9b19c");
}

/* ╔════════════════════════════════════════════════════════════════════════
   ║ LA LISTE DES DESSINS D'UN NIVEAU — la même pour le jeu et pour le banc.
   ╚════════════════════════════════════════════════════════════════════════
   Chaque entrée : { key, draw(ctx) } ; `key` est la PROFONDEUR (y du plan, en
   cases) : on trie, on dessine dans l'ordre. `ctx` est dans le repère des
   images cuites (`homePx`, 32 px par case). Le jeu y glisse ses personnages à
   la profondeur de leurs pieds — ce module n'en sait rien.
   `o` : {
     H         le module maison.js (passé, pour ne pas l'importer d'ici)
     faces     [{ f, bake }] les faces cuites du niveau
     cutPx(f)  la hauteur VISIBLE de chaque face, en px (pleine : bake.wallPx)
     lows      H.homeLows(...)
     meubles   [{ sprite, o, lx, ly }] posés à CE niveau
     img(nom)  l'image d'un sprite (ou null tant qu'elle charge)
     ciel      [r, g, b] le ciel de l'image (le verre des fenêtres)
     ampoules  [{ lx, ly, allume }]
   }
   ⚠️ LA VOLÉE se trie à son bout NORD (`yHaut`) : qui marche dessus a les pieds
   plus au sud, il est donc dessiné après elle ; qui se tient sur le palier,
   au nord, passe derrière son haut — c'est ce que voit la caméra. */
export const HOME_FLAT = /^tapis/;
export function homeDrawItems(plan, L, o) {
  const out = [], H = o.H;
  for (const { f, bake } of o.faces) {
    const [px, py] = homePx(f.x0, f.y);
    out.push({ key: f.y, draw: (ctx) => {
      const vis = Math.max(HOME_CUT, Math.min(bake.wallPx, o.cutPx(f)));
      const v = Math.round(vis), xc = plan.w / 2;
      // Rangée par rangée, de la plus haute à la plinthe : chacune élargie autour du centre (`HOME_FLARE`).
      const top = vis >= bake.wallPx - 0.5 ? 0 : bake.H - v;
      for (let r = top; r < bake.H; r++) {
        const z = Math.min(bake.wallPx, bake.H - r);
        const a = px + Math.round(flarePx(f.x0, z, xc)), b = px + bake.W + Math.round(flarePx(f.x1, z, xc));
        ctx.drawImage(bake.c, 0, r, bake.W, 1, a, py - bake.H + r, b - a, 1);
      }
      if (top === 0) for (const g of bake.glass) {
        const z = bake.H - (g[1] + g[3] / 2), d = Math.round(flarePx(f.x0 + g[0] / MPX, z, xc));
        paintGlass(ctx, [px + g[0] + d, py - bake.H + g[1], g[2], g[3]], o.ciel);
      }
      if (top > 0) {
        const a = px + Math.round(flarePx(f.x0, v, xc)), b = px + bake.W + Math.round(flarePx(f.x1, v, xc));
        paintWallTop(ctx, a, py - v - bake.capPx, b - a, bake.capPx);
      }
    } });
  }
  for (const lw of o.lows) {
    const [x0, y0, x1, y1] = lw.rect;
    out.push({ key: y1, draw: (ctx) => {
      if (lw.kind === "facade") drawFacadeCut(ctx, plan, lw, o.ciel);
      else if (lw.kind === "pilier") drawCornerPillar(ctx, plan, lw, L);
      else if (lw.kind === "garde") drawRailing(ctx, x0, y0, x1, y1);
      else drawLowWall(ctx, x0, y0, x1, y1, lw.ext);
    } });
  }
  for (const m of o.meubles) {
    const meta = o.meta[m.sprite] && o.meta[m.sprite][m.o];
    if (!meta) continue;
    const fd = meta.fd / CASE_M;
    const [px, py] = homePx(m.lx, m.ly + fd);
    /* ⚠️ CE QUI EST À PLAT (un tapis) passe SOUS tout le reste : trié à son bord
       avant comme un meuble debout, le tapis du témoin recouvrait la table basse
       posée dessus (2026-10-16). */
    const plat = HOME_FLAT.test(m.sprite);
    out.push({ key: plat ? -1e6 + m.ly : m.ly + fd, draw: (ctx) => {
      const im = o.img(m.sprite + "_" + m.o);
      if (!im) return;
      const [sx, sy] = homePx(m.lx, m.ly);
      if (!plat) paintContactShadow(ctx, sx, sy, Math.round(meta.fw / CASE_M * MPX), Math.round(fd * MPX), 0.22);
      ctx.drawImage(im, px - meta.ax, py - meta.ay);
    } });
  }
  if (L < plan.niveaux.length - 1) {
    const s = plan.escalier, meta = o.meta.escalier && o.meta.escalier.S;
    if (meta) {
      const [px, py] = homePx(s.x0 + 0.02, s.yPied);
      /* ⚠️ VUE EN JEU (2026-10-16) : arrivé sur le palier de l'étage, le joueur
         disparaissait derrière le haut de la volée suivante (2,70 m devant lui) —
         juste, et injouable. Comme les faces, elle s'efface quand on est derrière
         (`o.voleeAlpha`). */
      out.push({ key: s.yHaut, draw: (ctx) => {
        const im = o.img("escalier_S"); if (!im) return;
        const a = o.voleeAlpha == null ? 1 : o.voleeAlpha;
        if (a < 1) ctx.globalAlpha = a;
        ctx.drawImage(im, px - meta.ax, py - meta.ay);
        ctx.globalAlpha = 1;
      } });
    }
  }
  for (const b of o.ampoules || []) {
    const [px, py] = homePx(b.lx, b.ly);
    out.push({ key: b.ly, draw: (ctx) => drawBulb(ctx, px, py, b.allume, pxOfM(plan.niveaux[L].pente ? 2.3 : plan.niveaux[L].mur)) });
  }
  return out;
}

/* LES DEUX MURS LATÉRAUX, DEBOUT ET ÉVASÉS, cuits avec le sol. La face
   intérieure du mur ouest se voit à gauche du sol, celle du mur est à droite :
   chaque colonne de pixels y est UNE HAUTEUR du mur (la plinthe contre le sol,
   la corniche au bord extérieur), et le long de la colonne court la longueur du
   mur — le papier de la pièce qui le borde, tronçon par tronçon. Puis l'arase. */
export function paintSideFaces(g, plan, L, H) {
  const lv = plan.niveaux[L], xc = plan.w / 2;
  const hPx = lv.pente ? pxOfM(1.0) : pxOfM(lv.mur);
  const capPx = Math.round(0.34 * MPX);
  for (const cote of ["W", "E"]) {
    const xw = cote === "W" ? 0 : plan.w, sg = cote === "W" ? -1 : 1;
    const L0 = Math.abs(flarePx(xw, hPx, xc));
    const [bx] = homePx(xw, 0);
    // les tronçons : la pièce qui borde le mur, tous les 5 cm
    for (let y = 0; y < plan.d; y += 0.05) {
      const pc = H.homeRoomAt(plan, L, cote === "W" ? 0.05 : plan.w - 0.05, y + 0.025);
      const deco = pc ? pc.murs : { papier: "platre", lambris: null };
      const papier = PAPIERS[deco.papier] || PAPIERS.platre;
      const lam = deco.lambris === "faience" ? "faience" : deco.lambris ? (LAMBRIS[deco.lambris] || LAMBRIS.sauge) : null;
      const [, py0] = homePx(xw, y), [, py1] = homePx(xw, y + 0.05);
      for (let c = 0; c < L0; c++) {
        const zc = Math.min(hPx - 1, (c + 0.5) / (HOME_FLARE * Math.abs(xw - xc)));
        let col;
        if (zc < 4) col = c === 0 ? PLINTHE.sombre : PLINTHE.fond;
        else if (lam === "faience" && zc < pxOfM(1.2)) col = ((py0 >> 1) + c) % 3 ? "#efece4" : "#cdc8bd";
        else if (lam && lam !== "faience" && zc < pxOfM(0.95)) col = Math.abs(zc - pxOfM(0.95)) < 2 ? PLINTHE.clair : lam.sombre;
        else if (zc > hPx - 4) col = PLINTHE.fond;
        else col = null;
        const x = cote === "W" ? bx - 1 - c : bx + c;
        for (let yy = py0; yy < py1; yy++) {
          const z = Math.round(zc);
          const cc = col || papier.motif(yy, z) || papier.fond;
          rect(g, x, yy - z, 1, 1, cc);
        }
      }
      // l'ombre de l'angle : la face est un peu plus sombre que le mur du fond (elle reçoit la lumière de biais)
      g.globalAlpha = 0.16;
      for (let c = 0; c < L0; c++) {
        const zc = Math.round((c + 0.5) / (HOME_FLARE * Math.abs(xw - xc)));
        rect(g, cote === "W" ? bx - 1 - c : bx + c, py0 - zc, 1, py1 - py0, "#20160f");
      }
      g.globalAlpha = 1;
      // l'arase, au sommet évasé
      const ax = cote === "W" ? bx - Math.round(L0) - capPx : bx + Math.round(L0);
      paintWallTop(g, ax, py0 - hPx, capPx, py1 - py0);
    }
  }
}
/* LE PILIER D'ANGLE : la tranche avant d'un mur latéral, au coin de la façade,
   debout et évasée comme lui. */
export function drawCornerPillar(ctx, plan, lw, L) {
  const lv = plan.niveaux[L], xc = plan.w / 2;
  const hPx = lv.pente ? pxOfM(1.0) : pxOfM(lv.mur);
  const [x0, , x1, y1] = lw.rect;
  const [pa] = homePx(x0, 0), [pb, py] = homePx(x1, y1);
  for (let z = 0; z < hPx; z++) {
    const a = pa + Math.round(flarePx(x0, z, xc)), b = pb + Math.round(flarePx(x1, z, xc));
    rect(ctx, a, py - 1 - z, b - a, 1, z > hPx - 3 ? "#6b5a4d" : "#8f7d68");
  }
}

