/* =============================================================================
   maisonArt.js — LE SOL ET LES MURS DES MAISONS DES JOUEURS (2026-10-16)
   -----------------------------------------------------------------------------
   Les intérieurs des maisons (docs/PROJETS.md §6). Décision de Guillaume, le
   2026-10-16 : les MEUBLES sont des sprites rendus par Blender
   (`tools/blender/`), les tableaux et les objets rares des images Gemini, et
   les MURS ET LES SOLS SONT PEINTS AU CANEVAS — ici. C'est ce qui rend un
   papier peint, une peinture ou un parquet changeables par le joueur sans
   repasser par un rendu.

   ⚠️ LE GRAIN EST CELUI DES MEUBLES : `MPX` = 64 px de dessin par case du
   plan (1 case = 1,183 m, la porte de 2,04 m des façades). Un pixel = 1,85 cm.
   Peindre ici à un autre grain que les meubles aurait mis côte à côte deux
   finesses de dessin dans la même pièce.
   ⚠️⚠️ 2026-10-17 — 32 → 64. La maison est passée à ×2 contre le personnage
   (`maison.HOME_K`, « mon joueur paraît gigantesque ») ET Guillaume a demandé
   plus de détail (« le niveau de détail n'est pas suffisant » : meubles,
   murs et sols). Un pixel de maison reste donc un DEMI-pixel du personnage à
   l'écran, comme avant — mais une case en compte quatre fois plus. Chaque
   cote ci-dessous est écrite en MÈTRES (`pxOfM`) ou recalculée pour 64 : un
   nombre de px laissé à sa valeur de 32 dessine la moitié de l'objet.

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

export const MPX = 64;                       // px de dessin par case du plan (2026-10-17 : 32 → 64)
export const CASE_M = 1.183;                 // une case, en mètres
export const pxOfM = (m) => Math.round(m / CASE_M * MPX);
export const WALL_M = 2.5;                   // hauteur sous plafond
export const WALL_PX = pxOfM(WALL_M);        // 135 px
export const WALL_EXT_PX = pxOfM(0.40);      // épaisseur d'un mur extérieur (22 px)
export const WALL_INT_PX = pxOfM(0.12);      // épaisseur d'une cloison (6 px)

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
/* Un rectangle BORNÉ à une zone (x0, y0, w, h) : les peintres de sol dessinent
   lame par lame, carreau par carreau, et rien ne doit déborder de la pièce. */
function rectIn(ctx, Z, x, y, w, h, c) {
  const a = Math.max(x, Z[0]), b = Math.min(x + w, Z[0] + Z[2]);
  const t = Math.max(y, Z[1]), d = Math.min(y + h, Z[1] + Z[3]);
  if (b > a && d > t) rect(ctx, a, t, b - a, d - t, c);
}

/* LE PARQUET À L'ANGLAISE : des lames de 11 cm (5 px + 1 px de joint) posées
   d'est en ouest, longueurs de 1 à 1,6 m tirées par rangée (54 à 86 px), joints
   décalés, quatre tons. ⚠️ 2026-10-17 (64 px par case) : à 32 px une lame n'avait
   que trois rangées et un trait — un aplat strié. Chaque lame a maintenant son
   CHANFREIN (la rangée du haut, plus claire : la lumière vient de la façade),
   deux à quatre fils qui courent dans sa longueur, parfois un NŒUD, et un bout
   plus sombre contre le joint (le bois debout boit la cire). `ox, oy` : l'origine
   de la pièce, pour que les rangées ne glissent pas quand on peint un morceau. */
export const PARQUETS = {
  chene:  { tons: ["#b98a55", "#c29360", "#ae7f4b", "#b5864f"], joint: "#6f4c2e", fil: "#9a6c3e", clair: "#cba06c", noeud: "#5e3f24" },
  miel:   { tons: ["#cf9f62", "#d6a96d", "#c49456", "#cc9c5e"], joint: "#80562f", fil: "#b07f48", clair: "#e0b67c", noeud: "#7a5029" },
  noyer:  { tons: ["#7a5232", "#84593a", "#6f4a2c", "#7f5636"], joint: "#3f2a19", fil: "#5d3d24", clair: "#93694a", noeud: "#3a2516" },
  blanchi:{ tons: ["#d9c9ad", "#e0d1b6", "#d2c1a4", "#dccdb2"], joint: "#a08f74", fil: "#c4b394", clair: "#ebdfc8", noeud: "#9d8b70" },
  // Le plancher brut des combles : de larges planches de sapin grisé (22 cm, 12 px), plus longues.
  brut:   { tons: ["#a99a80", "#b3a487", "#9e8f75", "#a69779"], joint: "#6c604e", fil: "#8d7f67", clair: "#bdae93", noeud: "#5f5444", row: 12, lmin: 90, lvar: 60, clou: "#5a5145" },
};

export function paintParquet(ctx, x0, y0, w, h, essence = "chene", ox = 0, oy = 0) {
  const P = PARQUETS[essence] || PARQUETS.chene;
  const ROW = P.row || 6, LMIN = P.lmin || 54, LVAR = P.lvar || 33;
  const Z = [x0, y0, w, h];
  for (let ry = Math.floor((y0 - oy) / ROW); ry * ROW + oy < y0 + h; ry++) {
    const yy = ry * ROW + oy;
    // Les lames de la rangée : départ décalé par rangée.
    let x = ox - Math.floor(h32(ry, 7, 1) * (LMIN + LVAR));
    let k = 0;
    while (x < x0 + w) {
      const len = LMIN + Math.floor(h32(ry, k, 2) * LVAR);
      if (x + len > x0) {
        rectIn(ctx, Z, x, yy, len - 1, ROW - 1, P.tons[Math.floor(h32(ry, k, 3) * 4)]);
        rectIn(ctx, Z, x, yy, len - 1, 1, P.clair);                       // le chanfrein
        rectIn(ctx, Z, x + len - 3, yy + 1, 2, ROW - 2, P.fil);           // le bout de la lame
        const nf = 2 + Math.floor(h32(ry, k, 4) * 3);
        for (let f = 0; f < nf; f++) {                                     // le fil
          const fy = yy + 1 + Math.floor(h32(ry, k * 7 + f, 6) * (ROW - 2));
          const fx = x + 3 + Math.floor(h32(ry, k * 7 + f, 5) * (len - 18));
          const fl = 10 + Math.floor(h32(ry, k * 7 + f, 8) * 26);
          rectIn(ctx, Z, fx, fy, Math.min(fl, x + len - 4 - fx), 1, P.fil);
        }
        if (h32(ry, k, 9) < 0.07) {                                        // un nœud (une lame sur quinze : à une sur six, vu en jeu, le séjour était grêlé)
          const nx = x + 8 + Math.floor(h32(ry, k, 10) * (len - 20)), ny = yy + 1 + Math.floor((ROW - 3) / 2);
          rectIn(ctx, Z, nx - 2, ny, 6, 1, P.fil);
          rectIn(ctx, Z, nx - 1, ny + 1, 4, 1, P.fil);
          rectIn(ctx, Z, nx, ny, 2, 1, P.noeud);
        }
        if (P.clou) for (const cx of [x + 3, x + len - 6]) {               // les clous des planches brutes
          rectIn(ctx, Z, cx, yy + 3, 1, 1, P.clou); rectIn(ctx, Z, cx, yy + ROW - 4, 1, 1, P.clou);
        }
        rectIn(ctx, Z, x + len - 1, yy, 1, ROW, P.joint);                 // le joint de bout
      }
      x += len; k++;
    }
    rectIn(ctx, Z, x0, yy + ROW - 1, w, 1, P.joint);
  }
}

/* LES CARREAUX DE CIMENT DE L'ENTRÉE : carreaux de 30 cm (16 px), un motif qui
   ne se lit qu'à QUATRE carreaux — une rosace de quarts de cercle — et un
   liseré aux bords de la pièce (noyau §4 : un motif de sol se juge ASSEMBLÉ,
   et sa période compte plus que ses détails). */
/* ⚠️ 2026-10-16, témoin : un premier jeu de couleurs (rouge brique, NOIR,
   bleu-vert sur crème) écrasait la pièce entière — le sol de l'entrée
   prenait plus l'œil que le canapé. Le motif garde sa période, ses couleurs
   baissent d'un cran : terre cuite douce, gris chaud au lieu du noir.
   2026-10-17 (64 px) : la même rosace, deux fois plus fine — un filet crème
   partage la couronne de terre cuite, un cœur clair au centre et aux coins,
   et l'usure (quelques grains plus pâles) qu'a un sol de ciment centenaire. */
export const CIMENTS = {
  classique: { fond: "#e4d9c2", a: "#b5694c", b: "#6a625b", c: "#8aa39c", joint: "#cdc1a8", use: "#ece4d2" },
  bleu:      { fond: "#e6dfcd", a: "#4c708c", b: "#4a5560", c: "#c9a75a", joint: "#cfc6b0", use: "#efe9dc" },
};

export function paintCiment(ctx, x0, y0, w, h, motif = "classique", ox = 0, oy = 0) {
  const M = CIMENTS[motif] || CIMENTS.classique;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const lx = ((x - ox) % 32 + 32) % 32, ly = ((y - oy) % 32 + 32) % 32;
    // distance au centre du bloc de quatre carreaux (16, 16), et au coin
    const dc = Math.hypot(lx - 15.5, ly - 15.5);
    const dk = Math.min(Math.hypot(lx + 0.5, ly + 0.5), Math.hypot(31.5 - lx, ly + 0.5), Math.hypot(lx + 0.5, 31.5 - ly), Math.hypot(31.5 - lx, 31.5 - ly));
    let c = M.fond;
    if (dc < 1.6) c = M.fond;
    else if (dc < 4.4) c = M.c;
    else if (dc < 6.8) c = M.fond;
    else if (dc < 10.2) c = dc >= 8.2 && dc < 8.9 ? M.fond : M.a;
    else if (dc < 11.8) c = M.b;
    if (dk < 2.0) c = M.c;
    else if (dk < 5.2) c = M.b;
    else if (dk < 6.8) c = M.fond;
    if (c === M.fond && h32(x - ox, y - oy, 13) < 0.025) c = M.use;
    if ((lx % 16) === 15 || (ly % 16) === 15) c = c === M.fond || c === M.use ? M.joint : c;
    rect(ctx, x, y, 1, 1, c);
  }
}

// ─── les murs ─────────────────────────────────────────────────────────────
/* LE PAPIER PEINT, ses motifs. Chaque motif est une fonction (x, y) → couleur
   ou null (le fond), en coordonnées LOCALES du mur : la période se lit sur la
   longueur entière du mur, pas morceau par morceau.
   2026-10-17 (64 px) : les périodes doublent (le motif garde sa taille réelle)
   et ce qu'elles gagnent devient du dessin — le bouquet a ses pétales, son cœur
   et ses feuilles, le damas son fleuron cerné, les pois leur reflet. */
// Un petit dessin en lettres, centré sur (cx, cy) de sa cellule : « . » = le fond.
const motifDe = (lignes, pal) => {
  const H = lignes.length, W = lignes[0].length;
  return (u, v, cx, cy) => {
    const i = u - cx + (W >> 1), j = v - cy + (H >> 1);
    if (i < 0 || j < 0 || i >= W || j >= H) return null;
    const ch = lignes[j][i];
    return ch === "." ? null : pal[ch];
  };
};
const BOUQUET = motifDe([
  "....r....",
  "...rRr...",
  "..rRyRr..",
  "...rRr...",
  ".b..r..b.",
  "..g.s.g..",
  "...gsg...",
  "....s....",
], { r: "#c76d66", R: "#b05651", y: "#e0b44a", b: "#d9958a", g: "#7d9a62", s: "#68844f" });
export const PAPIERS = {
  fleurs: {   // semis de petits bouquets en quinconce, fond crème
    fond: "#ead9bb",
    motif(x, y) {
      const cy = Math.floor(y / 20), py = ((y % 20) + 20) % 20;
      const px = (((x + (cy % 2) * 12) % 24) + 24) % 24;
      return BOUQUET(px, py, 11, 9);
    },
  },
  rayures: {  // rayures « tennis » ton sur ton, un filet sombre et son ombre
    fond: "#dfd0ae",
    motif(x) {
      const m = ((x % 18) + 18) % 18;
      return m < 6 ? "#e9dcbd" : m === 6 ? "#e4d5b4" : m === 12 ? "#cbb994" : m === 13 ? "#d6c6a2" : null;
    },
  },
  vert_anglais: {   // uni profond, un double filet doré espacé, la trame du papier
    fond: "#3f5a48",
    motif(x, y) {
      const m = ((x % 28) + 28) % 28;
      if (m === 0) return "#8d8457";
      if (m === 2) return "#6f6c4c";
      return h32(x, y, 21) < 0.04 ? "#3a5342" : null;
    },
  },
  platre: {         // le plâtre d'origine, chaulé : un fond crème, des nuages à peine plus sombres, quelques grains
    fond: "#ebe3d1",
    motif(x, y) {
      if (h32(x, y, 9) < 0.03) return "#e0d6c1";
      return h32(Math.floor(x / 7), Math.floor(y / 5), 19) < 0.10 ? "#e7dfcb" : null;
    },
  },
  damas: {          // damas bordeaux ton sur ton : des fleurons en losange cernés, deux rouges proches
    fond: "#7a2e2c",
    motif(x, y) {
      const u = ((x % 24) + 24) % 24, v = ((y % 32) + 32) % 32;
      const a = Math.abs(u - 12) / 12 + Math.abs(v - 16) / 16;
      if (a < 0.10) return "#9a4540";
      if (a < 0.16) return null;
      if (a < 0.36) return "#8e3a36";
      if (a > 0.62 && a < 0.68) return "#6b2624";
      if (a > 0.80 && a < 0.84) return "#843431";
      return (u === 12 && (v <= 2 || v >= 30)) || (Math.abs(u - 12) === 1 && (v === 1 || v === 31)) ? "#93413b" : null;
    },
  },
  pois: {           // un semis de pois crème sur un vert sauge doux, en quinconce, chacun son reflet
    fond: "#a7b59a",
    motif(x, y) {
      const r = Math.floor(y / 14), u = ((x + (r % 2) * 8) % 16 + 16) % 16, v = ((y % 14) + 14) % 14;
      const d = (u - 7.5) ** 2 + (v - 6.5) ** 2;
      if (d >= 6.5) return null;
      if (u === 6 && v === 5) return "#fbf7ec";
      return (u >= 8 && v >= 7 && d > 2.5) ? "#d8d0ba" : "#ece4cf";
    },
  },
  toile_bleue: {    // toile de Jouy évoquée : losanges bleus clairsemés, une fleurette en leur cœur
    fond: "#ece6d8",
    motif(x, y) {
      const u = ((x % 28) + 28) % 28, v = ((y % 28) + 28) % 28;
      const d = Math.abs(u - 14) + Math.abs(v - 14);
      if (d === 10) return "#56708e";
      if (d === 9 && (u === 14 || v === 14)) return "#7f96ae";
      if (d === 0) return "#c9a75a";
      if (d === 1 || (d === 2 && u !== 14 && v !== 14)) return "#7f96ae";
      return null;
    },
  },
};

export const LAMBRIS = {   // `table` : le creux du panneau, un ton plus clair (2026-10-17, 64 px)
  sauge:  { fond: "#9eab93", clair: "#b5c1a9", sombre: "#7d8a73", table: "#a7b49c" },
  creme:  { fond: "#e4dac4", clair: "#f1e9d6", sombre: "#c2b597", table: "#eae1cc" },
  bleu:   { fond: "#6f8a96", clair: "#89a3ae", sombre: "#566e79", table: "#7893a0" },
  bois:   { fond: "#8a5c36", clair: "#a06d43", sombre: "#6a4429", table: "#94643c" },
};

const PLINTHE = { fond: "#efe6d2", clair: "#fbf5e7", sombre: "#bfb193" };

/* LA FACE D'UN MUR DU FOND, de son pied (ligne `yFoot`) jusqu'au plafond :
   plinthe, lambris à panneaux jusqu'à 95 cm, cimaise, papier peint, corniche.
   `lx` : l'abscisse de ce morceau dans le mur (pour la période du papier et
   des panneaux). `ombreHaut` : le plafond assombrit le haut du papier.
   2026-10-17 (64 px) : la plinthe a sa gorge, la corniche ses trois moulures,
   le panneau de lambris son cadre en relief ET sa table, la faïence ses
   briquettes biseautées. */
export function paintWallFace(ctx, x0, yFoot, w, deco = {}, lx = 0, hPx = WALL_PX) {
  const papier = PAPIERS[deco.papier] || PAPIERS.fleurs;
  const faience = deco.lambris === "faience";
  const lam = deco.lambris == null || faience ? null : (LAMBRIS[deco.lambris] || LAMBRIS.sauge);
  const top = yFoot - hPx;
  const yPl = yFoot - pxOfM(0.15);          // plinthe : 15 cm (8 px)
  const yCi = yFoot - pxOfM(0.95);          // cimaise : 95 cm
  const yFa = yFoot - pxOfM(1.20);          // faïence : 1,20 m
  const basPapier = lam ? yCi : faience ? yFa : yPl;
  // le papier
  for (let y = top; y < basPapier; y++) for (let x = x0; x < x0 + w; x++) {
    const c = papier.motif(x - x0 + lx, y - top) || papier.fond;
    rect(ctx, x, y, 1, 1, c);
  }
  // l'ombre du plafond : six rangées, de plus en plus légères, sous la corniche
  for (let k = 0; k < 6; k++) { ctx.globalAlpha = 0.18 - k * 0.028; rect(ctx, x0, top + 8 + k, w, 1, "#2a2018"); }
  ctx.globalAlpha = 1;
  // la corniche : 8 px, trois moulures
  rect(ctx, x0, top, w, 1, PLINTHE.sombre);
  rect(ctx, x0, top + 1, w, 2, PLINTHE.clair);
  rect(ctx, x0, top + 3, w, 1, PLINTHE.sombre);
  rect(ctx, x0, top + 4, w, 2, PLINTHE.fond);
  rect(ctx, x0, top + 6, w, 1, PLINTHE.clair);
  rect(ctx, x0, top + 7, w, 1, PLINTHE.sombre);
  if (faience) {
    /* La faïence « métro » de la cuisine et des bains : briquettes de 7,5 × 15 cm
       (4 × 8 px), joints d'un pixel, posées à joints croisés, un biseau clair en
       haut de chaque briquette, un listel vert à deux tons. */
    for (let y = yFa; y < yFoot; y++) for (let x = x0; x < x0 + w; x++) {
      const r = y - yFa, row = Math.floor(r / 5), ry = r % 5;
      const xx = x - x0 + lx + (row % 2) * 4, jx = ((xx % 9) + 9) % 9;
      const brique = Math.floor(xx / 9);
      let c = h32(brique, row, 3) < 0.15 ? "#e6e3da" : "#f2efe8";
      if (ry === 0) c = "#fbfaf6";
      if (ry === 4 || jx === 8) c = "#cdc8bd";
      else if (jx === 7 && ry > 0) c = "#e2ded4";
      rect(ctx, x, y, 1, 1, c);
    }
    rect(ctx, x0, yFa - 3, w, 1, "#3f6754");
    rect(ctx, x0, yFa - 2, w, 1, "#4f7a64");
    rect(ctx, x0, yFa - 1, w, 1, "#6f9a84");
    return;
  }
  if (lam) {
    rect(ctx, x0, yCi, w, yPl - yCi, lam.fond);
    /* les panneaux : 36 px de large ; un cadre en relief (clair en haut et à gauche,
       sombre en bas et à droite), puis la table du panneau, en creux, d'un ton plus clair. */
    const PW = 36;
    for (let p = Math.floor(lx / PW) - 1; p * PW - lx < w; p++) {
      const px0 = x0 + p * PW - lx + 5, pw = PW - 10, py0 = yCi + 8, ph = yPl - yCi - 15;
      const bord = (xx, yy, ww, hh, c) => { const a = Math.max(xx, x0), b = Math.min(xx + ww, x0 + w); if (b > a) rect(ctx, a, yy, b - a, hh, c); };
      bord(px0, py0, pw, 1, lam.clair);
      bord(px0, py0 + ph, pw, 1, lam.sombre);
      bord(px0, py0, 1, ph, lam.clair);
      bord(px0 + pw - 1, py0, 1, ph + 1, lam.sombre);
      bord(px0 + 3, py0 + 3, pw - 6, 1, lam.sombre);
      bord(px0 + 3, py0 + ph - 3, pw - 6, 1, lam.clair);
      bord(px0 + 3, py0 + 3, 1, ph - 6, lam.sombre);
      bord(px0 + pw - 4, py0 + 3, 1, ph - 5, lam.clair);
      bord(px0 + 4, py0 + 4, pw - 8, ph - 7, lam.table || lam.fond);
    }
    // la cimaise : une baguette en quart-de-rond
    rect(ctx, x0, yCi - 4, w, 1, PLINTHE.sombre);
    rect(ctx, x0, yCi - 3, w, 1, PLINTHE.clair);
    rect(ctx, x0, yCi - 2, w, 1, PLINTHE.fond);
    rect(ctx, x0, yCi - 1, w, 1, PLINTHE.fond);
    rect(ctx, x0, yCi, w, 1, PLINTHE.sombre);
    ctx.globalAlpha = 0.18; rect(ctx, x0, yCi + 1, w, 2, "#2a2018"); ctx.globalAlpha = 1;
  }
  // la plinthe : 8 px, sa gorge en haut, son pied sombre
  rect(ctx, x0, yPl, w, 1, PLINTHE.sombre);
  rect(ctx, x0, yPl + 1, w, 1, PLINTHE.clair);
  rect(ctx, x0, yPl + 2, w, 1, PLINTHE.fond);
  rect(ctx, x0, yPl + 3, w, 1, PLINTHE.clair);
  rect(ctx, x0, yPl + 4, w, 3, PLINTHE.fond);
  rect(ctx, x0, yPl + 7, w, 1, PLINTHE.sombre);
}

/* LE MUR DU FOND DES COMBLES : un mur bas (la jambette, `kneePx`) puis le
   rampant lambrissé du toit jusqu'à `hPx`, ses chevrons sombres tous les
   48 cm. Vu de la caméra, la pente se lit comme un bandeau de planches.
   2026-10-17 (64 px) : des lames de 15 cm à rainure, des chevrons de 7 cm
   qui ont leur arête claire et leur flanc d'ombre. */
export function paintSlopeFace(ctx, x0, yFoot, w, kneePx, hPx, lx = 0) {
  const top = yFoot - hPx, yK = yFoot - kneePx;
  for (let y = top; y < yK; y++) {
    const r = y - top, rr = r % 8;
    const c = rr === 7 ? "#7a5c3c" : rr === 0 ? "#c09a6c" : (Math.floor(r / 8) % 2 ? "#a9835a" : "#b38c61");
    rect(ctx, x0, y, w, 1, c);
  }
  for (let x = x0 - ((lx % 26) + 26) % 26; x < x0 + w; x += 26) {
    const a = Math.max(x, x0), b = Math.min(x + 4, x0 + w);
    if (b > a) {
      rect(ctx, a, top, b - a, yK - top, "#5e4127");
      if (x >= x0) rect(ctx, x, top, 1, yK - top, "#7c5a3a");
      if (x + 4 < x0 + w && x + 4 >= x0) rect(ctx, x + 4, top, 2, yK - top, "#3f2b1a");
    }
  }
  rect(ctx, x0, yK - 4, w, 1, "#6a4b30");        // la sablière, au pied du rampant
  rect(ctx, x0, yK - 3, w, 3, "#4a3320");
  /* 2026-10-17 — LES POUTRES (« poutres aux combles ») : deux pannes et la faîtière
     en travers du rampant, et des jambettes debout sur le mur bas qui portent la
     panne basse, tous les 1,4 m. ⚠️ Un poteau debout au milieu des combles, sous un
     faîtage qu'on ne dessine pas (la vue est en coupe), se lisait comme une potence
     (planche du même jour) : la charpente est là où le toit est, sur le rampant. */
  const poutre = (y, hh) => {
    rect(ctx, x0, y, w, hh, "#5a3f26");
    rect(ctx, x0, y, w, 1, "#8a6542");
    rect(ctx, x0, y + 1, w, 1, "#6e4f32");
    for (let k = 3; k < hh - 2; k += 3) for (let x = x0 + ((k * 7) % 11); x < x0 + w; x += 23) rect(ctx, x, y + k, Math.min(9, x0 + w - x), 1, "#4c3420");
    rect(ctx, x0, y + hh - 2, w, 2, "#33231a");
    ctx.globalAlpha = 0.25; rect(ctx, x0, y + hh, w, 3, "#1c120b"); ctx.globalAlpha = 1;
  };
  const span = yK - top, yP1 = yK - Math.round(span * 0.36), yP2 = yK - Math.round(span * 0.72);
  for (let x = x0 - ((lx % 90) + 90) % 90 + 30; x < x0 + w; x += 90) {           // les jambettes
    const a = Math.max(x, x0), b = Math.min(x + 8, x0 + w);
    if (b <= a) continue;
    rect(ctx, a, yP1, b - a, yK - 4 - yP1, "#5e4229");
    if (x >= x0) rect(ctx, x, yP1, 1, yK - 4 - yP1, "#8a6542");
    if (x + 7 < x0 + w && x + 7 >= x0) rect(ctx, x + 7, yP1, 1, yK - 4 - yP1, "#33231a");
  }
  poutre(yP1 - 6, 11);
  poutre(yP2 - 5, 10);
  poutre(top, 12);                                  // la faîtière
  paintWallFace(ctx, x0, yFoot, w, { papier: "platre", lambris: null }, lx, kneePx);
}

/* UNE PORTE DANS UN MUR DU FOND : chambranle, vantail entrouvert vers la pièce
   d'à côté (on devine le noir de la pièce éteinte). 0,90 × 2,10 m.
   2026-10-17 (64 px) : le chambranle mouluré, le vantail à deux panneaux, la
   poignée en laiton sur sa platine, le jour du palier qui lèche le seuil. */
export function paintWallDoor(ctx, x0, yFoot, ouverte = true, w = pxOfM(0.90)) {
  const hh = pxOfM(2.10);
  const top = yFoot - hh;
  rect(ctx, x0 - 4, top - 4, w + 8, hh + 4, "#f1e9d6");          // chambranle
  rect(ctx, x0 - 4, top - 4, w + 8, 1, "#fbf5e7");
  rect(ctx, x0 - 4, top - 4, 1, hh + 4, "#c2b597");
  rect(ctx, x0 + w + 3, top - 4, 1, hh + 4, "#c2b597");
  rect(ctx, x0 - 2, top - 2, 1, hh + 2, "#d8cdb4");
  rect(ctx, x0 + w + 1, top - 2, 1, hh + 2, "#d8cdb4");
  rect(ctx, x0, top, w, hh, "#1a1512");                          // la pièce voisine, éteinte
  ctx.globalAlpha = 0.35; rect(ctx, x0, yFoot - 6, w, 5, "#3a2e24"); ctx.globalAlpha = 1;
  if (ouverte) {
    const vw = Math.round(w * 0.38);
    rect(ctx, x0, top, vw, hh, "#d8cdb4");                        // le vantail, vu de biais
    rect(ctx, x0, top, 1, hh, "#e8dfca");
    rect(ctx, x0 + vw - 2, top, 2, hh, "#a99a7c");
    const pan = (ya, yb) => {                                      // un panneau mouluré
      rect(ctx, x0 + 3, ya, vw - 7, 1, "#bdb193");
      rect(ctx, x0 + 3, ya, 1, yb - ya, "#bdb193");
      rect(ctx, x0 + 3, yb, vw - 7, 1, "#ece4d0");
      rect(ctx, x0 + vw - 5, ya, 1, yb - ya + 1, "#ece4d0");
    };
    pan(top + 8, top + Math.round(hh * 0.42));
    pan(top + Math.round(hh * 0.58), yFoot - 10);
    const yp = top + Math.round(hh * 0.5);
    rect(ctx, x0 + vw - 7, yp - 3, 3, 7, "#a8873c");               // la platine
    rect(ctx, x0 + vw - 9, yp, 4, 2, "#d9b553");                   // la poignée
    rect(ctx, x0 + vw - 9, yp, 4, 1, "#f0d488");
  }
  rect(ctx, x0 - 4, yFoot - 2, w + 8, 2, "#8a7a5e");             // le seuil
  rect(ctx, x0 - 4, yFoot - 2, w + 8, 1, "#a89878");
}

/* L'ARASE D'UN MUR COUPÉ, vue de dessus : la tranche sombre du mur (brique et
   plâtre), un filet clair côté pièce. C'est tout ce qu'on voit d'un mur
   latéral (sa face est de profil) et du mur de façade (coupé pour voir dedans).
   2026-10-17 (64 px) : les briques en panneresse ont leurs joints et leurs tons. */
export function paintWallTop(ctx, x, y, w, h) {
  rect(ctx, x, y, w, h, "#3b302a");
  rect(ctx, x, y, w, 1, "#7a6858");
  if (h > 2) rect(ctx, x, y + 1, w, 1, "#5a4a3e");
  if (h > 8) for (let k = 3; k < h - 2; k += 5) {
    const dec = (Math.floor(k / 5) % 2) ? 6 : 0;
    for (let i = x + dec; i < x + w - 1; i += 12) {
      const iw = Math.min(10, x + w - 1 - i);
      if (iw > 0) rect(ctx, i, y + k, iw, 3, h32(i, k, 17) < 0.5 ? "#463830" : "#4d3d33");
    }
  }
}

/* ╔════════════════════════════════════════════════════════════════════════
   ║ 2026-10-18 — « LES CLOISONS EN VOLUME » : L'ARASE D'UN MUR COUPÉ EST ÉCLAIRÉE.
   ╚════════════════════════════════════════════════════════════════════════
   Vu en jeu : une cloison coupée à 35 cm se lisait comme un trait sombre sur le
   sol — son arase avait la couleur de celle des murs pleins (`paintWallTop`, un
   brun presque noir), celle du vide autour de la maison et des portes ouvertes.
   Or c'est un DESSUS, à 35 cm du sol de la pièce : dans la lumière des meubles
   (`tools/blender/studio.py`, quatre paliers), le dessus est le plus clair (1),
   la face vient après (0,88). Une arase claire et cernée, une tranche un ton plus
   bas : le mur a une épaisseur et une hauteur. L'arase des murs PLEINS reste
   sombre — elle touche le plafond, c'est la coupe sous lui, hors du jour.
   `ext` : la pierre de la façade (même règle, plus grise). */
export function paintCutTop(ctx, x, y, w, h, ext) {
  const P = ext ? ["#b9a88c", "#d6c8ab", "#6e604e", "#9a8a72"] : ["#ded2bb", "#f1e9d6", "#7d6c58", "#b3a38b"];
  rect(ctx, x, y, w, h, P[0]);
  if (ext && h > 6) for (let k = 3; k < h - 2; k += 5) {
    const dec = (Math.floor(k / 5) % 2) ? 6 : 0;
    for (let i = x + dec; i < x + w - 1; i += 12) rect(ctx, i, y + k, 1, 3, P[3]);
  }
  if (w > 2) { rect(ctx, x, y, 1, h, P[3]); rect(ctx, x + w - 1, y, 1, h, P[3]); }
  rect(ctx, x, y, w, 1, P[1]);
  if (h > 2) rect(ctx, x, y + h - 1, w, 1, P[2]);
}

/* LA FLAQUE DE SOLEIL : la lumière d'une fenêtre de façade (au sud) posée sur
   le sol de la pièce, déportée vers l'est l'après-midi — un parallélogramme
   chaud, peint rangée par rangée. `force` 0 à 1 (l'heure la règlera). */
export function paintSunPool(ctx, x0, yWall, w, profondeur, derive, force = 1, xMin = -Infinity, xMax = Infinity) {
  /* ⚠️ `xMin`/`xMax` bornent la tache à l'intérieur : vu en jeu le 2026-10-16, la
     fenêtre de droite d'une étroite, déportée par le soleil d'après-midi, posait sa
     tache AU-DELÀ du mur est — un parallélogramme sombre sur le vide. */
  // 2026-10-17 : par rangées de DEUX pixels (à 64 px par case, jusqu'à 140 rangées par fenêtre à chaque image)
  for (let k = 0; k < profondeur; k += 2) {
    const t = k / profondeur;
    const a = Math.max(xMin, Math.round(x0 + derive * t)), b = Math.min(xMax, Math.round(x0 + derive * t) + w);
    if (b <= a) continue;
    ctx.globalAlpha = force * (0.30 - 0.18 * t);
    rect(ctx, a, yWall - 2 - k, b - a, Math.min(2, profondeur - k), "#ffe7a8");
  }
  ctx.globalAlpha = 1;
}

/* L'OMBRE DE CONTACT d'un meuble : son emprise au sol, débordée d'un pixel,
   assombrie — un meuble posé, pas un meuble collé sur une image. */
export function paintContactShadow(ctx, x, y, w, h, force = 0.26) {
  // 2026-10-17 (64 px) : deux auréoles de 2 px (une de 1 px à 32 px par case)
  ctx.globalAlpha = force;
  rect(ctx, x - 2, y, w + 4, h + 2, "#20160f");
  ctx.globalAlpha = force * 0.5;
  rect(ctx, x - 4, y + 2, w + 8, h + 2, "#20160f");
  ctx.globalAlpha = 1;
}

// ─── 2026-10-16 (lot 1) : les sols qui manquaient à la maison d'origine ──
/* LES TOMETTES DE LA CUISINE : des hexagones de terre cuite de 20 cm (pas de
   12 px, rangées de 10 px décalées d'une demi-tomette), quatre tons tirés.
   ⚠️ 2026-10-17 (64 px) — premier jet découpé RANGÉE PAR RANGÉE (coins coupés en
   haut et en bas de chaque bande, la bande ombrée en bas) : vu en jeu, la
   cuisine était couverte d'ÉCAILLES, des tuiles de toit — les coins de deux
   rangées voisines laissaient des losanges de joint au lieu de s'emboîter.
   Chaque pixel prend désormais la tomette dont le CENTRE est le plus proche
   (le pavage d'un réseau triangulaire est fait d'hexagones, ils s'emboîtent
   d'eux-mêmes) ; le joint est là où deux centres sont presque aussi proches. */
export const TOMETTES = { rouge: { tons: ["#a9533a", "#b45d40", "#9c4b33", "#b8664a"], joint: "#6e3a28", clair: "#c06d52", sombre: "#93472f" } };
export function paintTomettes(ctx, x0, y0, w, h, v = "rouge", ox = 0, oy = 0) {
  const T = TOMETTES[v] || TOMETTES.rouge;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const X = x - ox + 0.5, Y = y - oy + 0.5, r0 = Math.floor(Y / 10);
    let d1 = 1e9, d2 = 1e9, best = null;
    for (let r = r0 - 1; r <= r0 + 1; r++) {
      const dx = (r & 1) ? 6 : 0, c0 = Math.floor((X - dx) / 12);
      for (let c = c0 - 1; c <= c0 + 1; c++) {
        const cx = c * 12 + dx + 6, cy = r * 10 + 5, d = Math.hypot(X - cx, (Y - cy) * 1.04);
        if (d < d1) { d2 = d1; d1 = d; best = { c, r, cx, cy }; } else if (d < d2) d2 = d;
      }
    }
    let c;
    if (d2 - d1 < 1.1) c = T.joint;
    else if (d2 - d1 < 2.2 && Y < best.cy - 1 && X < best.cx + 2) c = T.clair;     // l'arête qui prend la lumière
    else if (d2 - d1 < 2.2 && Y > best.cy + 1 && X > best.cx - 2) c = T.sombre;    // celle qui la perd
    else c = h32(x - ox, y - oy, 12) < 0.02 ? T.sombre : T.tons[Math.floor(h32(best.c, best.r, 11) * 4)];
    rect(ctx, x, y, 1, 1, c);
  }
}
/* LES CARREAUX À CABOCHONS DES BAINS : carrés blancs de 30 cm (15 px et leur
   joint), un cabochon bleu nuit à chaque croisement de joints, qui a son
   reflet ; un biseau clair en haut de chaque carreau. */
export function paintCabochons(ctx, x0, y0, w, h, v = "blanc", ox = 0, oy = 0) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const px = ((x - ox) % 16 + 16) % 16, py = ((y - oy) % 16 + 16) % 16;
    const qx = px >= 14 ? px - 16 : px, qy = py >= 14 ? py - 16 : py;   // la distance au croisement (−2..1)
    const cab = qx >= -2 && qx <= 1 && qy >= -2 && qy <= 1 && !((qx === -2 || qx === 1) && (qy === -2 || qy === 1));
    let c;
    if (cab) c = qx === -1 && qy === -1 ? "#6d86a3" : "#2c3e50";
    else if (px === 15 || py === 15) c = "#c9c6bc";
    else if (py === 0) c = "#fbfaf6";
    else if (py === 14) c = "#e0ded6";
    else c = h32(Math.floor((x - ox) / 16), Math.floor((y - oy) / 16), 5) < 0.2 ? "#e4e2db" : "#efeee8";
    rect(ctx, x, y, 1, 1, c);
  }
}

/* UNE FENÊTRE DANS UN MUR DU FOND (le mur nord, côté jardin) : allège à 90 cm,
   haut à 2,15 m par défaut (cuisine et bains : 70 cm et 1,90 m, `piece.fenetre`), embrasure, petits bois. Le VERRE est rendu à part (`glass`),
   pour que le ciel de l'heure s'y peigne à chaque image.
   2026-10-17 (64 px) : l'embrasure a sa profondeur (l'ébrasement d'ombre en
   haut et à droite), le dormant son battement, l'appui sa pierre et son ombre. */
export function paintWallWindow(ctx, x0, yFoot, w, allege = 0.90, haut = 2.15) {
  // 2026-10-17 (soir) : `allege` et `haut` en paramètres — la fenêtre des bains est plus basse (`piece.fenetre`).
  const yA = yFoot - pxOfM(allege), yH = yFoot - pxOfM(haut);
  rect(ctx, x0 - 4, yH - 4, w + 8, yA - yH + 8, "#d9cfb9");        // l'embrasure
  rect(ctx, x0 - 4, yH - 4, w + 8, 1, "#bfb193");
  rect(ctx, x0 - 4, yH - 4, 1, yA - yH + 8, "#e8e0cc");
  rect(ctx, x0, yH, w, yA - yH, "#efe8d8");                          // le dormant, blanc
  rect(ctx, x0, yH, w, 1, "#c8bea8");
  rect(ctx, x0 + w - 1, yH, 1, yA - yH, "#d6cdb8");
  rect(ctx, x0 + Math.floor(w / 2) - 1, yH + 2, 2, yA - yH - 4, "#ddd5c3");   // le battement des deux vantaux
  const g = [x0 + 4, yH + 4, w - 8, yA - yH - 8];
  rect(ctx, x0 - 6, yA, w + 12, 3, "#e8e0cc");                       // l'appui
  rect(ctx, x0 - 6, yA, w + 12, 1, "#f6f0e2");
  rect(ctx, x0 - 6, yA + 3, w + 12, 1, "#a99c80");
  ctx.globalAlpha = 0.2; rect(ctx, x0 - 5, yA + 4, w + 10, 3, "#2a2018"); ctx.globalAlpha = 1;
  return g;
}
/* Le verre d'une fenêtre, à l'heure : `ciel` [r, g, b] 0..1 (le ciel de l'image).
   Deux vantaux de trois carreaux (2026-10-17, 64 px : un seul croisillon à 32). */
export function paintGlass(ctx, g, ciel) {
  const c = (k, a) => Math.round(255 * Math.min(1, ciel[k] * a));
  ctx.fillStyle = `rgb(${c(0, 0.62)},${c(1, 0.78)},${c(2, 0.92)})`;
  ctx.fillRect(g[0], g[1], g[2], g[3]);
  ctx.fillStyle = `rgb(${c(0, 0.80)},${c(1, 0.90)},${c(2, 1.0)})`;
  ctx.fillRect(g[0], g[1], g[2], Math.max(1, Math.round(g[3] * 0.35)));
  // un reflet en biais dans chaque vantail
  ctx.fillStyle = `rgb(${c(0, 0.92)},${c(1, 0.97)},${c(2, 1.0)})`;
  for (const vx of [g[0] + 3, g[0] + Math.round(g[2] / 2) + 3]) for (let k = 0; k < 6; k++) ctx.fillRect(vx + k, g[1] + g[3] - 8 - k * 2, 1, 2);
  ctx.fillStyle = "#efe8d8";                                         // les petits bois
  ctx.fillRect(g[0] + Math.round(g[2] / 2) - 1, g[1], 3, g[3]);
  for (const t of [1 / 3, 2 / 3]) ctx.fillRect(g[0], g[1] + Math.round(g[3] * t) - 1, g[2], 2);
}

// ─── 2026-10-17 : CE QUI SE PEINT SUR LES MURS (« pièces trop nues ») ─────
/* Prises, interrupteurs, hotte, étagère, miroir, conduit de cheminée : ils sont
   PEINTS sur la face cuite du mur — posés en sprites devant lui, ils resteraient
   debout quand le mur se coupe à 35 cm (une hotte flottant au-dessus de la
   cuisinière). `yFoot` : le pied de la face ; les hauteurs sont en mètres. */
export function paintPrise(ctx, cx, yFoot, z = 0.30) {
  const y = yFoot - pxOfM(z) - 2;
  rect(ctx, cx - 3, y - 1, 6, 6, "#c9bfa9");
  rect(ctx, cx - 2, y, 4, 4, "#f4efe4");
  rect(ctx, cx - 1, y + 1, 1, 1, "#3a332c");
  rect(ctx, cx + 1, y + 1, 1, 1, "#3a332c");
  rect(ctx, cx - 2, y + 3, 4, 1, "#e2dacb");
}
export function paintInterrupteur(ctx, cx, yFoot, z = 0.60) {
  // l'interrupteur à bascule d'une vieille maison : platine de porcelaine, levier de laiton.
  // 2026-10-17 (après-midi) : à 0,60 m et non 1,10 m — à la poitrine du PERSONNAGE (0,85 m à l'échelle des murs, `HOME_K`), pas d'un adulte.
  const y = yFoot - pxOfM(z) - 3;
  rect(ctx, cx - 3, y - 1, 6, 8, "#c9bfa9");
  rect(ctx, cx - 2, y, 4, 6, "#f4efe4");
  rect(ctx, cx - 1, y + 1, 2, 4, "#d8cdb6");
  rect(ctx, cx - 1, y + 1, 2, 2, "#c9a24a");
  rect(ctx, cx - 1, y + 1, 1, 1, "#f0d488");
}
export function paintHotte(ctx, x0, x1, yFoot, hPx) {
  /* la hotte émaillée au-dessus de la cuisinière (de 1,15 à 1,50 m), son conduit jusqu'au plafond.
     2026-10-17 (après-midi) : 1,62 → 1,15 m. La cuisinière ne fait plus que 0,45 m (`meubles.ECHELLE_Z`) ; à 1,62 m la
     hotte aurait flotté 1,17 m au-dessus des feux (0,73 m avant) — et elle reste de 30 cm au-dessus de la tête du personnage (0,85 m). */
  const yb = yFoot - pxOfM(1.15), yt = yFoot - pxOfM(1.50), w = x1 - x0;
  const cw = Math.round(w * 0.36), cx0 = x0 + Math.round((w - cw) / 2);
  rect(ctx, cx0, yFoot - hPx + 8, cw, yt - (yFoot - hPx + 8), "#ddd4bd");
  rect(ctx, cx0, yFoot - hPx + 8, 1, yt - (yFoot - hPx + 8), "#eee6d2");
  rect(ctx, cx0 + cw - 2, yFoot - hPx + 8, 2, yt - (yFoot - hPx + 8), "#bfb49b");
  for (let y = yt; y < yb; y++) {
    const t = (y - yt) / (yb - yt), a = Math.round(cx0 - (cx0 - x0 + 3) * t), b = Math.round(cx0 + cw + (x1 + 3 - cx0 - cw) * t);
    rect(ctx, a, y, b - a, 1, "#e5dcc5");
    rect(ctx, a, y, 1, 1, "#f2eadb");
    rect(ctx, b - 2, y, 2, 1, "#c3b89f");
  }
  rect(ctx, x0 - 4, yb, w + 8, 4, "#3a3532");
  rect(ctx, x0 - 4, yb, w + 8, 1, "#c8ccd0");
  ctx.globalAlpha = 0.22; rect(ctx, x0 - 3, yb + 4, w + 6, 3, "#2a2018"); ctx.globalAlpha = 1;
}
export function paintEtagere(ctx, x0, x1, yFoot) {
  // une planche à 1,30 m sur deux consoles, trois bocaux, une pile d'assiettes, un pichet
  // (2026-10-17 après-midi : 1,55 → 1,30 m, avec le plan de travail qui descend à 0,45 m ; le listel de faïence est à 1,20 m)
  const y = yFoot - pxOfM(1.30), w = x1 - x0;
  for (const cx of [x0 + 6, x1 - 8]) { rect(ctx, cx, y + 3, 2, 8, "#6f4c2e"); rect(ctx, cx + 2, y + 3, 1, 6, "#5a3d24"); }
  const pots = [[0.10, 9, 13, "#c9dcd4", "#b48a5a"], [0.24, 8, 10, "#e3c98a", "#b48a5a"], [0.37, 7, 12, "#b8cbb0", "#9a7448"]];
  for (const [t, pw, ph, c, k] of pots) {
    const px = x0 + Math.round(w * t);
    rect(ctx, px, y - ph, pw, ph, c); rect(ctx, px + 1, y - ph + 2, 1, ph - 3, "#f2f6f2");
    rect(ctx, px - 1, y - ph - 2, pw + 2, 2, k);
  }
  const ax = x0 + Math.round(w * 0.55);
  for (let k = 0; k < 4; k++) rect(ctx, ax, y - 2 - k * 2, 14, 2, k % 2 ? "#e9e4d8" : "#f6f2e8");
  rect(ctx, ax, y - 2, 14, 1, "#3e6a8a");
  const jx = x0 + Math.round(w * 0.80);
  rect(ctx, jx, y - 12, 8, 12, "#c25a3a"); rect(ctx, jx + 1, y - 11, 1, 9, "#dd8a66"); rect(ctx, jx + 8, y - 10, 2, 5, "#a64a30");
  rect(ctx, x0, y, w, 3, "#a8794a"); rect(ctx, x0, y, w, 1, "#c99c68"); rect(ctx, x0, y + 3, w, 1, "#6f4c2e");
  ctx.globalAlpha = 0.18; rect(ctx, x0 + 1, y + 4, w - 2, 3, "#2a2018"); ctx.globalAlpha = 1;
}
export function paintMiroir(ctx, x0, x1, yFoot, bas = 1.15, haut = 1.75) {
  // le miroir des bains (par défaut 1,15 à 1,75 m ; 2026-10-17 soir : 0,80 à 1,38 m ; après-midi : 0,62 à 1,08 m, voir `peints` des bains —
  // le visage du personnage de 0,85 m est à 0,6–0,8 m : un miroir de 0,80 lui arrivait au front),
  // cadre laqué, deux reflets en biais, une tablette de verre
  const yb = yFoot - pxOfM(bas), yt = yFoot - pxOfM(haut), w = x1 - x0;
  rect(ctx, x0, yt, w, yb - yt, "#e9e4d8");
  rect(ctx, x0, yt, w, 1, "#fbf8f0"); rect(ctx, x0 + w - 1, yt, 1, yb - yt, "#c9c1ae"); rect(ctx, x0, yb - 1, w, 1, "#c9c1ae");
  for (let y = yt + 3; y < yb - 3; y++) {
    const t = (y - yt) / (yb - yt);
    rect(ctx, x0 + 3, y, w - 6, 1, t < 0.5 ? "#b7c6cc" : "#a4b4bb");
  }
  for (const o of [0.25, 0.55]) for (let k = 0; k < 9; k++) rect(ctx, x0 + 4 + Math.round(w * o) - k, yt + 6 + k * 2, 2, 2, "#dfe9ec");
  rect(ctx, x0 - 2, yb + 3, w + 4, 2, "#d6e2e4"); rect(ctx, x0 - 2, yb + 5, w + 4, 1, "#9fb0b4");
  rect(ctx, x0 + 4, yb - 3, 4, 6, "#d6e2e4"); rect(ctx, x0 + 5, yb - 8, 1, 6, "#d65a5a");      // le verre à dents et sa brosse
}
export function paintConduit(ctx, x0, x1, yFoot, hPx, tablette = 1.08, bas = 1.24, haut = 2.20) {
  /* Le conduit de la cheminée, du dessus de la tablette au plafond : la saillie
     se lit par ses arêtes (claire à gauche, ombrée à droite) ; dessus, le
     TRUMEAU parisien, un grand miroir à cadre doré et son fronton. */
  // 2026-10-17 (après-midi) : la tablette de la cheminée est à 0,70 m (×0,65, `maison.ECHELLE_Z_SPRITES`) et non 1,08 m ; le trumeau de 0,86 à 1,70 m
  const yTab = yFoot - pxOfM(tablette), top = yFoot - hPx + 8, w = x1 - x0;
  rect(ctx, x0, top, 2, yTab - top, "#fbf5e7");
  ctx.globalAlpha = 0.28; rect(ctx, x1 - 4, top, 4, yTab - top, "#2a2018"); ctx.globalAlpha = 1;
  const mx0 = x0 + 6, mx1 = x1 - 6, my1 = yFoot - pxOfM(bas), my0 = yFoot - pxOfM(haut);
  rect(ctx, mx0, my0, mx1 - mx0, my1 - my0, "#b8903e");
  rect(ctx, mx0, my0, mx1 - mx0, 1, "#e6c56e"); rect(ctx, mx0, my0, 1, my1 - my0, "#e6c56e");
  rect(ctx, mx1 - 1, my0, 1, my1 - my0, "#7a5c22"); rect(ctx, mx0, my1 - 1, mx1 - mx0, 1, "#7a5c22");
  for (let y = my0 + 4; y < my1 - 4; y++) rect(ctx, mx0 + 4, y, mx1 - mx0 - 8, 1, (y - my0) / (my1 - my0) < 0.45 ? "#aebdc3" : "#98a8af");
  for (const o of [0.2, 0.5]) for (let k = 0; k < 16; k++) rect(ctx, mx0 + 6 + Math.round((mx1 - mx0) * o) - k, my0 + 8 + k * 3, 2, 3, "#d4e0e4");
  // le fronton : une coquille dorée
  const fc = Math.round((mx0 + mx1) / 2);
  for (let k = 0; k < 6; k++) rect(ctx, fc - 10 + k * 2, my0 - k, 20 - k * 4, 1, k % 2 ? "#e6c56e" : "#b8903e");
}

// ─── la cuisson d'un niveau ──────────────────────────────────────────────
/* Le repère des images cuites : le coin (HOME_FX0, HOME_FY0) du plan, en cases,
   est le pixel (0, 0). Assez de marge au nord pour les faces des murs du fond. */
/* 2026-10-18 — −1 → −1,5 en x avec l'évasement à 0,17 (`HOME_FLARE`) : l'arase du mur latéral, à son bord extérieur, tombe à
   1,36 case du nu intérieur (0,17 × 2,84 cases du centre × 2,11 cases de mur + 0,34 d'épaisseur) ; à −1 elle sortait de
   l'image cuite (un canevas découpe en silence, noyau §4). `maison.HOME_OX` recule d'autant (l'origine reste sur une case
   entière du monde, la maison tient dans ses 8 cases : `verify-maison` §1). */
export const HOME_FX0 = -1.5, HOME_FY0 = -3.0;   // −1,5 en x : la place des murs latéraux évasés
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
/* 2026-10-18 — 0,11 → 0,17, choisi par Guillaume sur maquette en jeu (0,11 / 0,17 / 0,24 côte à côte, meubles contre les
   murs) : la pièce se creuse sans l'effet couloir de 0,24. ⚠️ Les meubles ne s'évasent pas : un meuble haut contre un mur de
   côté s'en écarte un peu vers le haut (≈ 9 px à 1 m) — vu, accepté avec la valeur. */
export const HOME_FLARE = 0.17;
const flarePx = (lx, zPx, xc) => HOME_FLARE * (lx - xc) * zPx;
export const homePx = (lx, ly) => [Math.round((lx - HOME_FX0) * MPX), Math.round((ly - HOME_FY0) * MPX)];
export const HOME_VOID = "#15110e";
export const HOME_CUT = pxOfM(0.35);          // la coupe des murs bas : 35 cm (19 px ; 10 à 32 px par case)
/* 2026-10-18 — LA PIERRE DE LA FAÇADE VUE DE FACE (sa tranche coupée, le pilier d'angle) : un ton sous l'arase éclairée
   (`paintCutTop`) — le dessus clair, la face plus sombre, c'est ce qui fait lire une épaisseur. À #a39178, à peine plus
   sombre que l'arase, la façade coupée se lisait comme une bande plate (vu au banc, même jour). */
const PIERRE_FACE = "#8c7a64";

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
     elle qui pose le mur SUR le sol) : 37 cm de dégradé sous chaque face, 26 cm le
     long des murs latéraux, et les angles du fond plus sombres (2026-10-17 : en
     mètres — 10 et 7 px à 32 px par case). */
  const ombre = (x, y, w, h, a) => { g.globalAlpha = a; rect(g, x, y, w, h, "#1c130c"); };
  for (const f of H.homeFaces(plan, L)) {
    const [a, b] = homePx(f.x0, f.y), [cc] = homePx(f.x1, f.y);
    const NF = pxOfM(0.37);
    for (let k = 0; k < NF; k++) ombre(a, b + k, cc - a, 1, 0.34 * (1 - k / NF) ** 1.6);
  }
  {
    const [x0, y0] = homePx(0, 0), [x1, y1] = homePx(plan.w, plan.d);
    const NL = pxOfM(0.26);
    for (let k = 0; k < NL; k++) { const al = 0.26 * (1 - k / NL) ** 1.6; ombre(x0 + k, y0, 1, y1 - y0, al); ombre(x1 - 1 - k, y0, 1, y1 - y0, al); }
  }
  /* 2026-10-18 — « LA LUMIÈRE DE PROFONDEUR », PIÈCE PAR PIÈCE (remplace un dégradé unique sur toute la maison, « la
     lumière vient de la façade » — faux pour la cuisine, dont les fenêtres sont au fond) : chaque pièce s'assombrit en
     s'éloignant du côté par où le jour entre — la façade (au sud : ses fenêtres, sa porte, et le côté ouvert de la
     coupe) si elle la touche, ses fenêtres du fond (au nord) si elle en a. Les deux : le milieu, un peu. Aucun : un
     voile égal. Jusqu'à 0,16 au plus loin. */
  {
    const faces = H.homeFaces(plan, L);
    for (const p of lv.pieces) {
      const bx0 = Math.min(...p.rects.map((r) => r[1])), bx1 = Math.max(...p.rects.map((r) => r[3]));
      const sud = bx1 >= plan.d - 0.01;
      const nord = faces.some((f) => f.room === p.id && (f.fenetres || []).length > 0);
      const al = (t) => sud && nord ? 0.08 * 4 * t * (1 - t) : sud ? 0.16 * (1 - t) ** 1.4 : nord ? 0.16 * t ** 1.4 : 0.08;
      for (const [rx0, ry0, rx1, ry1] of p.rects) {
        const [a, b] = homePx(rx0, ry0), [cc, d] = homePx(rx1, ry1);
        const [, B0] = homePx(0, bx0), [, B1] = homePx(0, bx1);
        for (let yy = b; yy < d; yy += 2) ombre(a, yy, cc - a, Math.min(2, d - yy), al((yy - B0) / Math.max(1, B1 - B0)));
      }
    }
  }
  g.globalAlpha = 1;
  paintSideFaces(g, plan, L, H);
  for (const lw of H.homeLows(plan, L, null)) {
    if (lw.kind === "facade") continue;
    const [a, b] = homePx(lw.rect[0], lw.rect[1]), [cc, d] = homePx(lw.rect[2], lw.rect[3]);
    if (lw.kind !== "mur") { g.globalAlpha = 0.20; rect(g, a - 1, b, 1, d - b, "#20160f"); rect(g, cc, b, 1, d - b, "#20160f"); continue; }
    /* 2026-10-18 — « les cloisons en volume » : un mur coupé à 35 cm assombrit le sol de chaque côté ; c'est ce qui le
       pose debout sur le sol au lieu d'un trait. Plus long à l'EST (30 cm) qu'à l'ouest (12 cm) : la lumière des meubles
       vient de la gauche (`studio.py`, SUN_DIR), l'ombre portée d'un muret tombe à sa droite. */
    const NW = pxOfM(0.12), NE = pxOfM(0.30);
    for (let k = 0; k < NW; k++) ombre(a - 1 - k, b, 1, d - b, 0.24 * (1 - k / NW) ** 1.6);
    for (let k = 0; k < NE; k++) ombre(cc + k, b, 1, d - b, 0.36 * (1 - k / NE) ** 1.4);
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
    if (pb - pa > pxOfM(0.2)) paintWallDoor(g, pa, Hh, true, pb - pa);
  }
  const glass = [];
  for (const [a, b] of f.fenetres || []) {
    const pa = Math.round((a - f.x0) * MPX), pb = Math.round((b - f.x0) * MPX);
    if (pb - pa > pxOfM(0.2)) glass.push(paintWallWindow(g, pa, Hh, pb - pa, piece.fenetre && piece.fenetre.allege, piece.fenetre && piece.fenetre.haut));
  }
  paintWallDetails(g, plan, L, f, Hh, wallPx);
  /* 2026-10-18 — « LA LUMIÈRE DE PROFONDEUR » : le pied du mur s'assombrit (0,22 contre la plinthe, rien à 45 cm), et
     ses ANGLES aussi (0,20 sur 35 cm, `f.coinW`/`f.coinE` de `homeFaces`) — l'ombre qu'une pièce garde dans ses coins,
     qui dit où le mur du fond rencontre les murs de côté. Le verre des fenêtres se peint par-dessus, à chaque image. */
  {
    const NB = pxOfM(0.45), NA = pxOfM(0.35);
    g.fillStyle = "#20160f";
    for (let k = 0; k < NB; k++) { g.globalAlpha = 0.22 * (1 - k / NB) ** 1.5; g.fillRect(0, Hh - 1 - k, W, 1); }
    for (let k = 0; k < NA; k++) {
      g.globalAlpha = 0.20 * (1 - k / NA) ** 1.5;
      if (f.coinW) g.fillRect(k, capPx, 1, Hh - capPx);
      if (f.coinE) g.fillRect(W - 1 - k, capPx, 1, Hh - capPx);
    }
    g.globalAlpha = 1;
  }
  paintWallTop(g, 0, 0, W, capPx);
  /* 2026-10-17 — LA FACE ÉVASÉE, CUITE UNE FOIS. Une face pleine se dessinait rangée par
     rangée à chaque image (l'évasement, `HOME_FLARE`) : à 64 px par case, ~150 `drawImage`
     par face, ~350 par image (mesuré, 0,6 ms au séjour). L'évasement ne dépend que de la
     face : on le cuit ici, et la boucle n'y revient rangée par rangée que pendant la coupe
     animée. */
  const xc = plan.w / 2, rows = [];
  let dx = 0, wMax = 0;
  for (let r = 0; r < Hh; r++) {
    const z = Math.min(wallPx, Hh - r);
    const a = Math.round(flarePx(f.x0, z, xc)), b = W + Math.round(flarePx(f.x1, z, xc));
    rows.push([a, b]); dx = Math.min(dx, a); wMax = Math.max(wMax, b);
  }
  const fl = mk(wMax - dx, Hh), gf = fl.getContext("2d");
  gf.imageSmoothingEnabled = false;
  rows.forEach(([a, b], r) => gf.drawImage(c, 0, r, W, 1, a - dx, r, b - a, 1));
  return { c, W, H: Hh, capPx, wallPx, glass, flared: fl, flareDx: dx };
}

/* 2026-10-17 — LES DÉTAILS D'UNE FACE : ce que le plan y peint (`peints` : hotte,
   étagère, miroir, conduit, prises de la cuisine et des bains), un interrupteur à
   côté de chaque porte (à 1,10 m, du côté du mur plein), et des prises au ras de
   la plinthe là où rien ne les cache (ni porte, ni fenêtre, ni équipement). */
const PIECES_SANS_PRISE_AUTO = new Set(["cage", "cuisine", "bains"]);   // elles ont les leurs, à hauteur de plan
function paintWallDetails(g, plan, L, f, Hh, wallPx) {
  const lv = plan.niveaux[L];
  const px = (X) => Math.round((X - f.x0) * MPX);
  const surFace = (y) => Math.abs(y - f.y) < 0.06;
  const ouvertures = [...(f.portes || []), ...(f.fenetres || [])];
  const libre = (X, marge) => X > f.x0 + 0.06 && X < f.x1 - 0.06 && !ouvertures.some(([a, b]) => X > a - marge && X < b + marge);
  const peints = (lv.peints || []).filter((p) => surFace(p.y) && (p.x != null ? p.x >= f.x0 && p.x < f.x1 : p.x1 > f.x0 && p.x0 < f.x1));
  for (const p of peints) {
    if (p.quoi === "prise") paintPrise(g, px(p.x), Hh, p.z);
    else if (p.quoi === "hotte") paintHotte(g, px(p.x0), px(p.x1), Hh, wallPx);
    else if (p.quoi === "etagere") paintEtagere(g, px(p.x0), px(p.x1), Hh);
    else if (p.quoi === "miroir") paintMiroir(g, px(p.x0), px(p.x1), Hh, p.bas, p.haut);
    else if (p.quoi === "conduit") paintConduit(g, px(p.x0), px(p.x1), Hh, wallPx, p.tablette, p.bas, p.haut);
  }
  for (const X of homeInterrupteurs(plan, L, f)) paintInterrupteur(g, px(X), Hh);
  for (const ap of homeAppliques(plan, L, f)) paintApplique(g, px(ap.lx), Hh, ap.z, false);   // 2026-10-18 : éteinte, cuite
  if (PIECES_SANS_PRISE_AUTO.has(f.room) || f.x1 - f.x0 < 0.9) return;
  const caches = [...(lv.fixes || []).filter((x) => surFace(x.ly)).map((x) => [x.lx, x.lx + 1.6]),
                  ...peints.filter((p) => p.x0 != null).map((p) => [p.x0, p.x1])];
  const cands = [f.x0 + 0.35, ...(f.x1 - f.x0 > 2.4 ? [f.x1 - 0.35] : [])];
  for (const X of cands) if (libre(X, 0.18) && !caches.some(([a, b]) => X > a - 0.1 && X < b + 0.1)) paintPrise(g, px(X), Hh);
}

/* 2026-10-21 (lot 2c) — LES INTERRUPTEURS d'une face (x du plan) : posés par `maison.homeFaces` (`f.inters`), qui connaît
   toutes les pièces — un à côté de chaque porte du mur, et une pièce qui n'en a aucun (le séjour, la cuisine, les bains…
   dont la porte est dans un mur coupé) reçoit le sien sur son mur du fond, au plus près de sa porte. Le dessin, la
   portée de E (`maison.homeSwitchNear`) et la pose d'un tableau (`maison.homeCanHang`) lisent la même liste. */
export const homeInterrupteurs = (plan, L, f) => f.inters || [];

// ─── les dessins de chaque image (dans le repère des images cuites) ──────
/* UN MUR BAS (nord-sud, coupé à 35 cm) : son arase, et sa tranche sud. */
export function drawLowWall(ctx, x0, y0, x1, y1, ext) {
  const [a, b] = homePx(x0, y0), [c, d] = homePx(x1, y1);
  const w = Math.max(1, c - a);
  // 2026-10-18 : l'arase claire (`paintCutTop`), la tranche un ton plus bas, sa plinthe, et un trait d'ombre à son pied.
  paintCutTop(ctx, a, b - HOME_CUT, w, d - b, ext);
  rect(ctx, a, d - HOME_CUT, w, HOME_CUT, ext ? PIERRE_FACE : "#c8bba2");
  rect(ctx, a, d - HOME_CUT, w, 1, ext ? "#8a7a64" : "#9c8e77");
  rect(ctx, a, d - pxOfM(0.12), w, pxOfM(0.12), PLINTHE.fond);
  rect(ctx, a, d - 1, w, 1, "#5e5244");
}
/* UN GARDE-CORPS à claire-voie (90 cm) : une main courante de noyer posée sur
   des balustres tous les 15 cm. Vu de face s'il court d'est en ouest, en
   enfilade s'il court du nord au sud. 2026-10-17 (64 px) : balustres de 2 px
   (une arête claire), main courante arrondie, lisse basse. */
export function drawRailing(ctx, x0, y0, x1, y1) {
  const [a, b] = homePx(x0, y0), [c, d] = homePx(x1, y1);
  const H = pxOfM(0.9);
  if (c - a >= d - b) {          // est-ouest : on le voit de face
    for (let x = a + 2; x < c - 1; x += 8) { rect(ctx, x, d - H, 2, H, "#6e4529"); rect(ctx, x, d - H, 1, H, "#875a38"); }
    rect(ctx, a, d - H - 2, c - a, 4, "#553219");
    rect(ctx, a, d - H - 2, c - a, 1, "#9a6a42");
    rect(ctx, a, d - H - 1, c - a, 1, "#8a5a36");
    rect(ctx, a, d - 4, c - a, 4, "#553219");
    rect(ctx, a, d - 4, c - a, 1, "#7a4d2e");
  } else {                       // nord-sud : la main courante en fuite, les balustres en file
    for (let y = b + 4; y < d; y += 8) { rect(ctx, a + 1, y - H, 2, H, "#6e4529"); rect(ctx, a + 1, y - H, 1, H, "#875a38"); }
    rect(ctx, a, b - H - 2, Math.max(4, c - a), d - b + 2, "#553219");
    rect(ctx, a, b - H - 2, 1, d - b + 2, "#9a6a42");
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
    paintCutTop(ctx, pa, pb - HOME_CUT, pc - pa, pd - pb, true);   // 2026-10-18 : l'arase de pierre éclairée
    rect(ctx, pa, pd - HOME_CUT, pc - pa, HOME_CUT, PIERRE_FACE);
    rect(ctx, pa, pd - 1, pc - pa, 1, "#5e5244");
  };
  /* ⚠️ 2026-10-18 — la coupe s'arrête aux NUS INTÉRIEURS des murs latéraux : leurs blocs d'angle (de −EP_EXT à 0, de w à
     w + EP_EXT) appartiennent aux murs DEBOUT ; coupée à 35 cm par-dessus, la façade mangeait le pied du pilier d'angle. */
  cur = Math.max(x0, 0);
  for (const [a, b] of trous) { seg(cur, a); cur = b; }
  seg(cur, Math.min(x1, plan.w));
  for (const [a, b] of lw.fenetres) {
    const [pa, pb] = homePx(a, y0), [pc, pd] = homePx(b, y1);
    rect(ctx, pa, pb - HOME_CUT, pc - pa, pd - pb, "#cfc3ab");
    rect(ctx, pa, pb - HOME_CUT, pc - pa, 1, "#e9e1cf");
    const c = (k, s) => Math.round(255 * Math.min(1, ciel[k] * s));
    rect(ctx, pa, pb - HOME_CUT + 9, pc - pa, 2, `rgb(${c(0, 0.62)},${c(1, 0.78)},${c(2, 0.92)})`);
    rect(ctx, pa, pd - HOME_CUT, pc - pa, HOME_CUT, "#9c8a71");
    // 2026-10-17 — l'APPUI côté pièce : une tablette de chêne ciré qui déborde du mur
    rect(ctx, pa - 5, pb - HOME_CUT - 5, pc - pa + 10, 6, "#a8794a");
    rect(ctx, pa - 5, pb - HOME_CUT - 5, pc - pa + 10, 1, "#c99c68");
    rect(ctx, pa - 5, pb - HOME_CUT, pc - pa + 10, 1, "#6f4c2e");
  }
  if (lw.porte) {
    const [pa, pb] = homePx(lw.porte[0], y0), [pc, pd] = homePx(lw.porte[1], y1);
    rect(ctx, pa, pb, pc - pa, pd - pb, "#9b8a70");                 // le seuil de pierre
    rect(ctx, pa + 8, pb - 18, pc - pa - 16, 14, "#7a5a34");          // le paillasson (coco tressé, 2026-10-17 : son bord et sa trame)
    for (let k = 1; k < 13; k += 2) rect(ctx, pa + 9, pb - 18 + k, pc - pa - 18, 1, "#8f6a3e");
    rect(ctx, pa + 8, pb - 18, pc - pa - 16, 1, "#5e4426");
    rect(ctx, pa + 8, pb - 5, pc - pa - 16, 1, "#5e4426");
  }
}
/* ╔════════════════════════════════════════════════════════════════════════
   ║ 2026-10-18 — L'APPLIQUE MURALE REMPLACE L'AMPOULE PENDANTE.
   ╚════════════════════════════════════════════════════════════════════════
   Guillaume : « attention aux lumières pendantes qui n'ont pas de cohérence dans
   cette perspective […] peut-être mettre des lumières qui ne viendraient pas des
   plafonds ? ». L'ampoule nue tombait d'un plafond qu'on ne voit jamais (la vue
   est en coupe), au milieu de la pièce, son fil droit devant des murs qui
   s'évasent : une ligne qui flotte. L'applique est PEINTE SUR LE MUR DU FOND :
   elle s'évase avec lui, se coupe avec lui, et la lumière vient d'où on la voit.
   Une par face de pièce (hors cage d'escalier), au milieu de la plus grande
   portion libre (ni porte, ni fenêtre, ni hotte, étagère, miroir, trumeau) ; DEUX
   de part et d'autre d'un trumeau de cheminée. À 1,30 m : au-dessus de la tête du
   personnage (0,85 m à l'échelle des murs), sous la corniche. Éteinte, elle est
   cuite dans la face ; allumée (la nuit, la pièce où quelqu'un se tient), sa
   tulipe se repeint par-dessus à chaque image, et le jeu pose sa lumière à SA
   place (`FermeGame.drawHomeFrame`). */
export const APPLIQUE_Z = 1.30;
const applMemo = new Map();
export function homeAppliques(plan, L, f) {
  const key = plan.taille + "|" + L + "|" + f.id;
  if (applMemo.has(key)) return applMemo.get(key);
  const lv = plan.niveaux[L], out = [];
  if (f.room && f.room !== "cage" && f.x1 - f.x0 >= 0.3) {
    const surFace = (y) => Math.abs(y - f.y) < 0.06;
    const peints = (lv.peints || []).filter((p) => surFace(p.y) && p.x0 != null && p.x1 > f.x0 && p.x0 < f.x1);
    // les marges sont celles du CENTRE de l'applique (9 px de large, 0,07 case de demi-largeur) : le chambranle d'une porte
    // déborde de 4 px, d'où 0,13. ⚠️ L'entrée n'a que 0,35 case de mur à gauche de sa porte : à 0,10 + une portion d'au moins
    // 0,16, elle restait sans lumière (`verify-maison` §13) ; l'applique y surmonte l'interrupteur, ce qui est sa place.
    const bouche = [...(f.portes || []).map(([a, b]) => [a - 0.13, b + 0.13]), ...(f.fenetres || []).map(([a, b]) => [a - 0.12, b + 0.12]),
                    ...peints.map((p) => [p.x0 - 0.10, p.x1 + 0.10])].sort((p, q) => p[0] - q[0]);
    const libres = [];
    let cur = f.x0 + 0.12;
    for (const [a, b] of bouche) { if (a > cur) libres.push([cur, a]); cur = Math.max(cur, b); }
    if (f.x1 - 0.12 > cur) libres.push([cur, f.x1 - 0.12]);
    const ok = libres.filter(([a, b]) => b - a > 0.02);
    const tru = peints.find((p) => p.quoi === "conduit");
    if (tru) {
      const g = ok.filter(([, b]) => b <= tru.x0).pop(), d = ok.find(([a]) => a >= tru.x1);
      if (g) out.push({ lx: Math.max((g[0] + g[1]) / 2, tru.x0 - 0.35), z: APPLIQUE_Z });
      if (d) out.push({ lx: Math.min((d[0] + d[1]) / 2, tru.x1 + 0.35), z: APPLIQUE_Z });
    } else if (ok.length) {
      const [a, b] = ok.reduce((m, r) => (r[1] - r[0] > m[1] - m[0] ? r : m));
      out.push({ lx: (a + b) / 2, z: APPLIQUE_Z });
    }
  }
  if (applMemo.size > 200) applMemo.clear();
  applMemo.set(key, out);
  return out;
}
/* Le décalage d'évasement d'un point du mur (lx, à zPx au-dessus du pied) : celui des faces cuites (`bakeHomeFace`) — une
   rangée s'y étire de flare(x0) à flare(x1), donc le point lx glisse exactement de flare(lx). */
export const homeFlarePx = (plan, lx, zPx) => flarePx(lx, zPx, plan.w / 2);
/* L'applique, centrée en cx, le pied du mur en yFoot. Platine et bras de laiton, tulipe d'opaline tournée vers le haut. */
export function paintApplique(ctx, cx, yFoot, z, allume) {
  const y = yFoot - pxOfM(z);
  rect(ctx, cx - 2, y + 2, 4, 7, "#8a6a32");                       // la platine
  rect(ctx, cx - 1, y + 3, 2, 5, "#c9a24a");
  rect(ctx, cx - 1, y + 3, 1, 1, "#f0d488");
  rect(ctx, cx, y - 1, 1, 4, "#9a7638");                           // le bras
  const v = allume ? ["#ffe9a8", "#fff6d6", "#fffdf2", "#e8c878"] : ["#d9cfba", "#ebe4d4", "#f7f2e8", "#b8ab92"];
  rect(ctx, cx - 3, y - 4, 7, 3, v[0]);                           // la tulipe : étroite en bas…
  rect(ctx, cx - 4, y - 8, 9, 4, v[1]);                           // …évasée en haut
  rect(ctx, cx - 4, y - 8, 9, 1, v[2]);                           // le bord
  rect(ctx, cx - 3, y - 4, 1, 3, v[3]);
  rect(ctx, cx + 4, y - 7, 1, 3, v[3]);
  rect(ctx, cx - 1, y - 2, 3, 1, "#8a6a32");                       // la bague
}
/* LE TUYAU DU POÊLE, prolongé de son amorce (le sprite, `meubles.py` : 1,10 m × ZK) jusqu'au MUR DU FOND de sa pièce.
   ⚠️ 2026-10-18 — PAS AU PLAFOND (premier jet, vu en jeu) : le plafond ne se voit jamais, le tuyau finissait sur une rosace en
   l'air, 12 px sous la corniche (la projection place le plafond d'un point devant le mur plus bas que le haut du mur) — le défaut
   de l'ampoule pendante. Il monte à `TUYAU_Z`, puis file au nord jusqu'au mur : une course nord-sud se projette À LA VERTICALE,
   le tuyau reste donc une seule ligne droite qui finit SUR le mur, dans une rosace qu'on voit. Murs de la pièce descendus : il se
   coupe à leur hauteur (sa section sombre au bout). (cx, py) : le pied de son axe ; yMur : le pied du mur du fond (px) ; z0Px :
   le haut de l'amorce ; visPx : la hauteur visible des murs de la pièce. */
export const TUYAU_Z = 1.75;   // sous la corniche, au-dessus des portes (2,04 m de vantail, peint plus bas que la corniche)
export function drawFlue(ctx, cx, py, yMur, z0Px, visPx) {
  const zT = pxOfM(TUYAU_Z), yCoude = py - zT, yEntree = yMur - zT;
  const coupe = visPx < zT - 0.5, yHaut = coupe ? py - Math.max(z0Px, visPx) : yEntree;
  const C = ["#1a1716", "#3b3532", "#4c4541", "#363130", "#2b2725", "#221f1e", "#171413"];
  for (let y = py - z0Px + 2; y > yHaut; y--) for (let i = 0; i < 7; i++) rect(ctx, cx - 3 + i, y, 1, 1, C[i]);
  for (let z = z0Px + pxOfM(0.5); py - z > Math.max(yHaut + 4, yCoude + 4); z += pxOfM(0.5)) { rect(ctx, cx - 4, py - z, 9, 2, "#2e2a28"); rect(ctx, cx - 4, py - z, 9, 1, "#57504b"); }   // les emboîtures
  if (coupe) { rect(ctx, cx - 3, yHaut, 7, 2, "#0d0b0a"); rect(ctx, cx - 3, yHaut + 2, 7, 1, "#5a524c"); return; }   // coupé : la section
  if (yCoude - yEntree > 6) { rect(ctx, cx - 4, yCoude - 1, 9, 3, "#2e2a28"); rect(ctx, cx - 4, yCoude - 1, 9, 1, "#57504b"); }   // le coude
  // la rosace, sur le mur : un anneau de tôle plus clair que le tuyau (vu de face, il se détache du papier), le trou sombre
  rect(ctx, cx - 6, yEntree - 4, 13, 9, "#57504a"); rect(ctx, cx - 5, yEntree - 3, 11, 7, "#7a716a");
  rect(ctx, cx - 6, yEntree - 4, 13, 1, "#9a918a"); rect(ctx, cx - 6, yEntree + 4, 13, 1, "#3a3430");
  for (let i = 0; i < 7; i++) rect(ctx, cx - 3 + i, yEntree - 2, 1, 5, C[i]);
}

/* LOT 2b (2026-10-18) — LE CARTON DE LIVRAISON, vu comme les meubles (le dessus et la face sud, `studio.py`) : du kraft, le
   ruban adhésif en croix sur le dessus et qui descend sur la face, l'étiquette. (x, yFoot) : le coin sud-ouest au sol ; w, d,
   h en px. `k` varie la teinte d'un carton à l'autre (pas deux kraft identiques côte à côte). En px des images cuites. */
export function drawCarton(ctx, x, yFoot, w, d, h, k = 0, ombre = true) {
  const kr = [["#c99d62", "#a77c45", "#8c6538"], ["#c2955a", "#a0763f", "#866034"], ["#cfa66c", "#ad844c", "#91693c"]][k % 3];
  if (ombre) paintContactShadow(ctx, x, yFoot - d, w, d, 0.24);
  rect(ctx, x, yFoot - h - d, w, d, kr[0]);                       // le dessus
  rect(ctx, x, yFoot - h, w, h, kr[1]);                           // la face sud
  rect(ctx, x, yFoot - h - 1, w, 1, kr[2]);                       // l'arête
  const tw = w >= 20 ? 4 : 2, t = Math.round(w / 2) - tw / 2;
  rect(ctx, x + t, yFoot - h - d, tw, d, "#e2c592");               // le ruban, sur le dessus…
  rect(ctx, x + t, yFoot - h, tw, Math.min(h, 7), "#d6b57c");      // …qui descend sur la face
  if (w >= 20) {                                                   // l'étiquette (dans la maison ; dans la rue, le carton fait 10 px)
    rect(ctx, x + 3, yFoot - h + Math.round(h / 2) - 2, 8, 5, "#f2ede2");
    rect(ctx, x + 4, yFoot - h + Math.round(h / 2) - 1, 6, 1, "#6e6458");
    rect(ctx, x + 4, yFoot - h + Math.round(h / 2) + 1, 4, 1, "#9a8f80");
  }
  rect(ctx, x, yFoot - h - d, 1, d + h, "#6e4f2c"); rect(ctx, x + w - 1, yFoot - h - d, 1, d + h, "#6e4f2c");
  rect(ctx, x, yFoot - h - d, w, 1, "#6e4f2c"); rect(ctx, x, yFoot - 1, w, 1, "#5e4426");
}
/* LE CATALOGUE, posé à plat sur le sol de l'entrée (glissé sous la porte) : une couverture crème, un bandeau de titre, la photo
   d'un canapé, la tranche des pages. (x, y) : son coin nord-ouest ; w, h en px. */
export function drawCatalogue(ctx, x, y, w, h) {
  paintContactShadow(ctx, x, y, w, h, 0.18);
  rect(ctx, x, y + h, w, 2, "#f4efe2");                           // la tranche des pages
  rect(ctx, x, y + h + 1, w, 1, "#c9c0ad");
  rect(ctx, x, y, w, h, "#efe6d2");
  rect(ctx, x, y + 2, w, 6, "#9b3b2c");                           // le bandeau du titre
  rect(ctx, x + 3, y + 4, w - 10, 1, "#f3d9a8");
  rect(ctx, x + 3, y + 10, w - 6, h - 16, "#7d9aa0");             // la photo : un salon…
  rect(ctx, x + 6, y + h - 13, w - 12, 5, "#5d7b5c");             // …et son canapé
  rect(ctx, x + 6, y + h - 16, w - 12, 3, "#6f8f6c");
  rect(ctx, x + 3, y + h - 5, w - 14, 1, "#8a7f6c");
  rect(ctx, x, y, w, 1, "#fbf7ee"); rect(ctx, x + w - 1, y, 1, h, "#c9bfa9");
}

/* ╔════════════════════════════════════════════════════════════════════════
   ║ LA LISTE DES DESSINS D'UN NIVEAU — la même pour le jeu et pour le banc.
   ╚════════════════════════════════════════════════════════════════════════
   Chaque entrée : { key, draw(ctx) } ; `key` est la PROFONDEUR (y du plan, en
   cases) : on trie, on dessine dans l'ordre. `ctx` est dans le repère des
   images cuites (`homePx`, `MPX` px par case du plan). Le jeu y glisse ses personnages à
   la profondeur de leurs pieds — ce module n'en sait rien.
   `o` : {
     H         le module maison.js (passé, pour ne pas l'importer d'ici)
     faces     [{ f, bake }] les faces cuites du niveau
     cutPx(f)  la hauteur VISIBLE de chaque face, en px (pleine : bake.wallPx)
     lows      H.homeLows(...)
     meubles   [{ sprite, o, lx, ly }] posés à CE niveau
     img(nom)  l'image d'un sprite (ou null tant qu'elle charge)
     ciel      [r, g, b] le ciel de l'image (le verre des fenêtres)
     allumees  Set des pièces dont les appliques brillent (2026-10-18 : remplace `ampoules`)
     roomCut(id) la hauteur VISIBLE des murs d'une pièce, en px (le tuyau du poêle s'y coupe)
     catalogue  { lx, ly, w, h } (cases) : le catalogue au sol de l'entrée, ou rien (lot 2b)
     cartons    [{ lx, ly, k }] les cartons livrés, dans l'entrée (lot 2b)
     ombresMur(f) [{ c, x, y, a }] les ombres portées sur la face f, cuites (`ombresMaison.js`, 2026-10-18), ou rien
     murals    [{ s, fid, lx, z, w, h }] les objets de mur (2026-10-21, lot 2c) : la face, le bord gauche (cases), le bas (m),
               la taille (px) ; muralImg(s, w, h) leur image peinte (`paintMural`) ; tmin la minute du jour (l'horloge)
   }
   Un meuble peut porter `feu` (0 à 1, lot 2c) : la cheminée ou le poêle allumé (`<sprite>_allume`).
   ⚠️ LA VOLÉE se trie à son bout NORD (`yHaut`) : qui marche dessus a les pieds
   plus au sud, il est donc dessiné après elle ; qui se tient sur le palier,
   au nord, passe derrière son haut — c'est ce que voit la caméra. */
/* 2026-10-22 (lot 2d) — LES RIDEAUX D'UNE FACE, ÉVASÉS : peints à plat sur un calque de la taille de la face (plus une
   marge de chaque côté : la tringle déborde de l'embrasure, et un canevas coupe en silence ce qui dépasse — noyau §4), puis
   rangée par rangée avec LA MÊME correspondance que `bakeHomeFace`. Gardé par état (fenêtre, tirés, teintes) dans
   `bake.rideauFl`. Rend { c, dx } ou null. */
export const RIDEAU_RECUL = 0.18;   // les pans de façade tombent à 0,18 case (21 cm) devant le nu intérieur du mur (devant les radiateurs)
/* ⚠️ VU À LA PLANCHE (2026-10-22) : coupés à 35 cm comme le mur, les pans ne dépassaient de l'arase (et de la tablette
   d'appui) que de 4 px — une frise rouge, pas des rideaux. Le tissu se coupe plus haut que la pierre : 60 cm, l'emprise
   d'un meuble bas devant la façade (le personnage en fait 85) ; la tranche plissée dit toujours que c'est une coupe. */
export const RIDEAU_COUPE = pxOfM(0.60);
function flaredRideaux(mk, bake, f, list, plan) {
  const memo = bake.rideauFl || (bake.rideauFl = new Map());
  const key = list.map((r) => r.w.k + (r.clos ? "f" : "o") + r.a + (r.b || "")).join("|");
  if (memo.has(key)) return memo.get(key);
  if (memo.size > 12) memo.clear();
  const M = 14, W = bake.W, Hh = bake.H, xc = plan.w / 2;
  const src = mk(W + 2 * M, Hh), sg = src.getContext("2d");
  sg.imageSmoothingEnabled = false;
  for (const r of list) {
    const x0 = Math.round((r.w.a - f.x0) * MPX), x1 = Math.round((r.w.b - f.x0) * MPX);
    paintRideau(sg, M + x0, Hh, x1 - x0, { fenetre: r.w.fenetre, court: r.w.court, clos: r.clos, a: r.a, b: r.b });
  }
  const rows = [];
  let mn = Infinity, mx = -Infinity;
  for (let ry = 0; ry < Hh; ry++) {
    const z = Math.min(bake.wallPx, Hh - ry);
    const a = Math.round(flarePx(f.x0, z, xc)), b = W + Math.round(flarePx(f.x1, z, xc)), sc = (b - a) / W;
    const l = Math.round(a - M * sc), rr = Math.round(b + M * sc);
    rows.push([l, rr]); mn = Math.min(mn, l); mx = Math.max(mx, rr);
  }
  const c = mk(Math.max(1, mx - mn), Hh), cg = c.getContext("2d");
  cg.imageSmoothingEnabled = false;
  rows.forEach(([l, rr], ry) => cg.drawImage(src, 0, ry, W + 2 * M, 1, l - mn, ry, Math.max(1, rr - l), 1));
  const e = { c, dx: mn };
  memo.set(key, e);
  return e;
}
/* LE VERRE ÉVASÉ d'une fenêtre d'une face : le verre à plat (`paintGlass`, pour ce ciel), puis rangée par rangée avec
   LA MÊME correspondance que la face cuite (`bakeHomeFace` : la rangée r, à la hauteur z, s'étire de `a` à `b`). Gardé
   par ciel (arrondi à 1/24 par canal) dans `bake.glassFl`. Rend { c, dx } (dx : depuis le bord gauche de la face) ou
   null sans fabrique de canevas. */
function flaredGlass(mk, bake, f, g, ciel, plan) {
  const memo = bake.glassFl || (bake.glassFl = new Map());
  const key = g[0] + "," + g[1] + "|" + ciel.map((v) => Math.round(v * 24)).join(",");
  if (memo.has(key)) return memo.get(key);
  if (memo.size > 40) memo.clear();
  const [gx, gy, gw, gh] = g, xc = plan.w / 2, W = bake.W;
  const src = mk(gw, gh), sg = src.getContext("2d");
  paintGlass(sg, [0, 0, gw, gh], ciel);
  const rows = [];
  let mn = Infinity, mx = -Infinity;
  for (let ry = 0; ry < gh; ry++) {
    const z = Math.min(bake.wallPx, bake.H - (gy + ry));
    const a = Math.round(flarePx(f.x0, z, xc)), b = W + Math.round(flarePx(f.x1, z, xc)), sc = (b - a) / W;
    const l = Math.round(a + gx * sc), r = Math.round(a + (gx + gw) * sc);
    rows.push([l, r]); mn = Math.min(mn, l); mx = Math.max(mx, r);
  }
  const c = mk(Math.max(1, mx - mn), gh), cg = c.getContext("2d");
  cg.imageSmoothingEnabled = false;
  rows.forEach(([l, r], ry) => cg.drawImage(src, 0, ry, gw, 1, l - mn, ry, Math.max(1, r - l), 1));
  const e = { c, dx: mn };
  memo.set(key, e);
  return e;
}
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
      if (top === 0 && bake.flared) ctx.drawImage(bake.flared, px + bake.flareDx, py - bake.H);   // pleine : cuite évasée
      else for (let r = top; r < bake.H; r++) {
        const z = Math.min(bake.wallPx, bake.H - r);
        const a = px + Math.round(flarePx(f.x0, z, xc)), b = px + bake.W + Math.round(flarePx(f.x1, z, xc));
        ctx.drawImage(bake.c, 0, r, bake.W, 1, a, py - bake.H + r, b - a, 1);
      }
      if (top === 0) for (const g of bake.glass) {
        /* ⚠️ 2026-10-17 (soir) — « fenêtre pas inclinée en perspective comme le cadre » : le CADRE est cuit évasé (chaque
           rangée s'écarte du centre avec sa hauteur, `bakeHomeFace`) mais le VERRE, peint à chaque image pour le ciel de l'heure,
           n'était que DÉCALÉ à sa mi-hauteur : un rectangle droit dans un cadre qui penche. On évase le verre de la même
           façon, rangée par rangée, et on le garde par ciel (un ciel qui change lentement, quelques cuissons par heure). */
        const fl = o.mk && flaredGlass(o.mk, bake, f, g, o.ciel, plan);
        if (fl) { ctx.drawImage(fl.c, px + fl.dx, py - bake.H + g[1]); continue; }
        const z = bake.H - (g[1] + g[3] / 2), d = Math.round(flarePx(f.x0 + g[0] / MPX, z, xc));
        paintGlass(ctx, [px + g[0] + d, py - bake.H + g[1], g[2], g[3]], o.ciel);
      }
      /* 2026-10-22 (lot 2d) — LES RIDEAUX DES FENÊTRES DE CETTE FACE (le mur du fond : cuisine, bains), peints sur une copie
         de la face puis ÉVASÉS COMME ELLE (`flaredRideaux`) : un rideau droit dans une embrasure qui penche se verrait. Avant
         les ombres portées : ce qui se tient devant le mur ombre aussi ses rideaux. */
      if (top === 0 && o.rideaux && o.mk) {
        const ici = o.rideaux.filter((r) => r.w.side === "N" && Math.abs(r.w.y - f.y) < 0.05 && r.w.a >= f.x0 - 0.01 && r.w.b <= f.x1 + 0.01);
        const fl = ici.length ? flaredRideaux(o.mk, bake, f, ici, plan) : null;
        if (fl) ctx.drawImage(fl.c, px + fl.dx, py - bake.H);
      }
      /* 2026-10-18 — L'OMBRE PORTÉE SUR LE MUR (`ombresMaison.js`) : ce qui se tient devant lui. Cuite à sa place évasée ;
         le mur à demi descendu n'en montre que ses rangées encore debout (les mêmes rangées, aux mêmes places). */
      if (o.ombresMur) for (const s of o.ombresMur(f)) {
        const y0 = top === 0 ? s.y : Math.max(s.y, py - v), k = y0 - s.y;
        if (k >= s.c.height) continue;
        if (s.a < 1) ctx.globalAlpha = s.a;
        if (k === 0) ctx.drawImage(s.c, s.x, s.y);
        else ctx.drawImage(s.c, 0, k, s.c.width, s.c.height - k, s.x, y0, s.c.width, s.c.height - k);
        ctx.globalAlpha = 1;
      }
      /* 2026-10-21 (lot 2c) — LES OBJETS DE MUR accrochés à cette face (`o.murals`), peints une fois (`o.muralImg`, avec leur
         ombre), posés à leur place évasée (le glissement de leur milieu, comme l'applique) ; l'horloge a ses aiguilles. Mur
         coupé : on ne les voit pas, comme l'applique. */
      if (top === 0 && o.murals) for (const mu of o.murals) {
        if (mu.fid !== f.id) continue;
        const im = o.muralImg && o.muralImg(mu.s, mu.w, mu.h);
        if (!im) continue;
        const zb = pxOfM(mu.z), X = px + Math.round((mu.lx - f.x0) * MPX + flarePx(mu.lx + mu.w / 2 / MPX, zb + mu.h / 2, xc)), Y = py - zb - mu.h;
        ctx.drawImage(im, X, Y);
        if (/^horloge/.test(mu.s) && o.tmin != null) paintClockHands(ctx, X, Y, mu.w, o.tmin);
      }
      // 2026-10-22 (lot 4) — le crochet à clés de l'entrée, à sa place évasée (le glissement de son milieu, comme un objet de mur)
      if (top === 0 && o.crochet && o.crochet.fid === f.id) {
        const c = o.crochet, w = pxOfM(c.w), h = pxOfM(c.h), zb = pxOfM(c.z), xl = c.lx - c.w / 2 / CASE_M;
        const X = px + Math.round((xl - f.x0) * MPX + flarePx(c.lx, zb + h / 2, xc));
        paintCrochet(ctx, X, py - zb - h, w, h, c.left);
      }
      if (top === 0 && o.allumees && o.allumees.has(f.room)) for (const ap of homeAppliques(plan, L, f)) {
        const zp = pxOfM(ap.z);
        paintApplique(ctx, px + Math.round((ap.lx - f.x0) * MPX + flarePx(ap.lx, zp, xc)), py, ap.z, true);
      }
      if (top > 0) {
        const a = px + Math.round(flarePx(f.x0, v, xc)), b = px + bake.W + Math.round(flarePx(f.x1, v, xc));
        /* 2026-10-18 : coupée, l'arase est claire (`paintCutTop`) ; PENDANT la coupe (le mur descend ou remonte en
           fondu), le clair se mêle au sombre selon la hauteur — sinon l'arase changerait de couleur d'un coup à
           l'arrivée en haut (noyau §4 : une transition qui se voit se fait par une durée, jamais par un seuil). */
        const k = Math.max(0, Math.min(1, (vis - HOME_CUT) / Math.max(1, bake.wallPx - HOME_CUT)));
        if (k > 0) paintWallTop(ctx, a, py - v - bake.capPx, b - a, bake.capPx);
        if (k < 1) { ctx.globalAlpha = 1 - k; paintCutTop(ctx, a, py - v - bake.capPx, b - a, bake.capPx, f.ext); ctx.globalAlpha = 1; }
      }
    } });
  }
  /* 2026-10-22 (lot 2d) — LES RIDEAUX DE LA FAÇADE, COUPÉS AVEC ELLE : leurs pans tombent au sol 16 cm devant le nu
     intérieur (devant les radiateurs), coupés à la hauteur du mur ; leur tranche dépasse de l'arase. Triés à leur pied,
     donc derrière la façade, devant ce qui est plus au nord. */
  for (const r of o.rideaux || []) {
    if (r.w.side !== "S" || r.w.court) continue;
    const yF = r.w.y - RIDEAU_RECUL;
    out.push({ key: yF, draw: (ctx) => {
      const [pa, py] = homePx(r.w.a, yF), [pb] = homePx(r.w.b, yF);
      paintRideauCoupe(ctx, pa, py, pb - pa, RIDEAU_COUPE, r);
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
      const im = o.img(m.sprite + "_" + m.o, m.t);   // 2026-10-22 (lot 2d) : `t`, la teinture — le sprite recoloré (`teindrePx`)
      if (!im) return;
      const [sx, sy] = homePx(m.lx, m.ly);
      if (!plat) paintContactShadow(ctx, sx, sy, Math.round(meta.fw / CASE_M * MPX), Math.round(fd * MPX), 0.22);
      /* ⚠️ 2026-10-18 — LES MEUBLES RESTENT DROITS, ESSAYÉ ET VU EN JEU : redessinés rangée par rangée avec l'évasement des faces
         (la face avant de 0 à h, le dessus à h), ils suivaient bien le mur — et une bibliothèque contre un mur de côté devenait un
         parallélogramme qui tombe, le tuyau du poêle se couchait. Un mur qui s'évase se lit comme de la profondeur ; un objet qui
         penche se lit comme un objet qui tombe. L'écart (≈ 9 px à 1 m contre un mur de côté, à 0,17) est le prix accepté. */
      /* 2026-10-21 (lot 2c) — LE FEU (`m.feu`, `maison.homeFireLevel`) : en flammes, la version allumée ; aux braises, elle
         s'efface par-dessus l'éteinte (un fondu, jamais un seuil : noyau §4). Sa lumière et son vacillement sont au jeu. */
      const feu = m.feu > 0 ? o.img(m.sprite + "_allume_" + m.o) : null;
      if (feu && m.feu >= 1) ctx.drawImage(feu, px - meta.ax, py - meta.ay);
      else {
        ctx.drawImage(im, px - meta.ax, py - meta.ay);
        if (feu) { ctx.globalAlpha = Math.min(1, m.feu / 0.35) * 0.8; ctx.drawImage(feu, px - meta.ax, py - meta.ay); ctx.globalAlpha = 1; }
      }
      if (/^poele/.test(m.sprite)) {
        // 2026-10-18 — l'axe du tuyau : à mi-largeur, 0,24 m derrière la façade du poêle (`meubles.poele`), selon son orientation
        const [x0, y0] = [m.lx, m.ly], fw = meta.fw / CASE_M, k = 0.24 / CASE_M;
        const [cx, cy] = m.o === "E" ? [x0 + fw - k, y0 + fd / 2] : m.o === "W" ? [x0 + k, y0 + fd / 2] : m.o === "N" ? [x0 + fw / 2, y0 + k] : [x0 + fw / 2, y0 + fd - k];
        const lv = plan.niveaux[L], plafond = pxOfM(lv.pente ? 2.3 : lv.mur);
        const pc = H.homeRoomAt(plan, L, cx, cy), vis = pc && o.roomCut ? Math.min(plafond, o.roomCut(pc.id)) : plafond;
        // le mur du fond : la face de sa pièce qui passe au-dessus de lui (sinon le mur nord de la maison)
        const fm = pc && o.faces.map(({ f }) => f).filter((f) => f.room === pc.id && cx >= f.x0 && cx <= f.x1 && f.y <= cy).sort((p, q) => q.y - p.y)[0];
        const [fx, fy] = homePx(cx, cy), [, ym] = homePx(cx, fm ? fm.y : 0);
        drawFlue(ctx, fx, fy, ym, pxOfM(1.10 * H.homeZk(m.sprite)), Math.max(HOME_CUT, vis));
      }
    } });
  }
  if (o.catalogue) {
    const c = o.catalogue, [x, y] = homePx(c.lx, c.ly), [x2, y2] = homePx(c.lx + c.w, c.ly + c.h);
    out.push({ key: -1e6 + c.ly + 0.5, draw: (ctx) => drawCatalogue(ctx, x, y, x2 - x, y2 - y) });   // à plat : sous tout le reste, comme un tapis
  }
  for (const cb of o.cartons || []) {
    const C2 = o.H.HOME_CARTON_C, [x, y0] = homePx(cb.lx, cb.ly), [x2, yS] = homePx(cb.lx + C2, cb.ly + C2);
    out.push({ key: cb.ly + C2, draw: (ctx) => drawCarton(ctx, x, yS, x2 - x, yS - y0, pxOfM(0.30), cb.k) });
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
  return out;
}

/* LES DEUX MURS LATÉRAUX, DEBOUT ET ÉVASÉS, cuits avec le sol. La face
   intérieure du mur ouest se voit à gauche du sol, celle du mur est à droite :
   chaque colonne de pixels y est UNE HAUTEUR du mur (la plinthe contre le sol,
   la corniche au bord extérieur), et le long de la colonne court la longueur du
   mur — le papier de la pièce qui le borde, tronçon par tronçon. Puis l'arase.
   ⚠️ 2026-10-18 — « LES COINS DE FAÇADE » (vu en jeu : le mur latéral paraissait
   plié au coin) : la face courait jusqu'au NU INTÉRIEUR de la façade (y = d), et le
   pilier d'angle se tient à son nu EXTÉRIEUR (d + EP_EXT) ; au-dessus de la façade
   coupée, les 40 cm de face entre les deux manquaient — un coin de vide entre le
   mur et son pilier, et une arase qui s'arrêtait 40 cm trop tôt. La face et l'arase
   vont maintenant jusqu'au nu extérieur (le bas, sous la coupe de 35 cm, est
   recouvert par la façade coupée), et l'arase a la largeur ÉVASÉE du mur (son bord
   extérieur s'écarte plus que l'intérieur), celle du pilier qu'elle coiffe.
   2026-10-18 — « LA LUMIÈRE DE PROFONDEUR » : la face s'assombrit vers le sol (le
   pied d'un mur reçoit moins de jour que son haut) et vers l'angle du fond. */
export function paintSideFaces(g, plan, L, H) {
  const lv = plan.niveaux[L], xc = plan.w / 2, e = H.EP_EXT, yEnd = plan.d + e;
  const hPx = lv.pente ? pxOfM(1.0) : pxOfM(lv.mur);
  for (const cote of ["W", "E"]) {
    const xw = cote === "W" ? 0 : plan.w, xo = cote === "W" ? -e : plan.w + e;
    const L0 = Math.abs(flarePx(xw, hPx, xc));
    const [bx] = homePx(xw, 0);
    // l'arase : le dessus du mur (de xw à xo) à sa pleine hauteur, évasé comme lui
    const ai = bx + Math.round(flarePx(xw, hPx, xc)), ao = homePx(xo, 0)[0] + Math.round(flarePx(xo, hPx, xc));
    // les tronçons : la pièce qui borde le mur, tous les 5 cm
    for (let y = 0; y < yEnd - 1e-6; y += 0.05) {
      const pc = H.homeRoomAt(plan, L, cote === "W" ? 0.05 : plan.w - 0.05, Math.min(y + 0.025, plan.d - 0.025));
      const deco = pc ? pc.murs : { papier: "platre", lambris: null };
      const papier = PAPIERS[deco.papier] || PAPIERS.platre;
      const lam = deco.lambris === "faience" ? "faience" : deco.lambris ? (LAMBRIS[deco.lambris] || LAMBRIS.sauge) : null;
      const [, py0] = homePx(xw, y), [, py1] = homePx(xw, Math.min(yEnd, y + 0.05));
      if (py1 <= py0) continue;
      for (let c = 0; c < L0; c++) {
        const zc = Math.min(hPx - 1, (c + 0.5) / (HOME_FLARE * Math.abs(xw - xc)));
        let col;
        // 2026-10-17 (64 px) : la plinthe et la corniche de 8 px, la cimaise de 4, comme le mur du fond.
        if (zc < pxOfM(0.15)) col = c === 0 ? PLINTHE.sombre : PLINTHE.fond;
        else if (lam === "faience" && zc < pxOfM(1.2)) col = ((py0 >> 1) + c) % 5 ? "#efece4" : "#cdc8bd";
        else if (lam && lam !== "faience" && zc < pxOfM(0.95)) col = Math.abs(zc - pxOfM(0.95)) < 4 ? PLINTHE.clair : lam.sombre;
        else if (zc > hPx - 8) col = PLINTHE.fond;
        else col = null;
        const x = cote === "W" ? bx - 1 - c : bx + c;
        for (let yy = py0; yy < py1; yy++) {
          const z = Math.round(zc);
          const cc = col || papier.motif(yy, z) || papier.fond;
          rect(g, x, yy - z, 1, 1, cc);
        }
      }
      /* L'OMBRE : la face reçoit le jour de biais (0,10 en haut), son pied moins encore (0,30 contre la plinthe),
         et l'angle du fond s'enfonce (jusqu'à +0,14 sur les 70 premiers cm). */
      const coin = y < 0.6 ? 0.14 * (1 - y / 0.6) ** 1.5 : 0;
      for (let c = 0; c < L0; c++) {
        const zc = Math.round((c + 0.5) / (HOME_FLARE * Math.abs(xw - xc)));
        g.globalAlpha = Math.min(0.5, 0.10 + 0.20 * (1 - Math.min(1, zc / hPx)) ** 2 + coin);
        rect(g, cote === "W" ? bx - 1 - c : bx + c, py0 - zc, 1, py1 - py0, "#20160f");
      }
      g.globalAlpha = 1;
      paintWallTop(g, Math.min(ai, ao), py0 - hPx, Math.abs(ao - ai), py1 - py0);
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
  /* 2026-10-18 — la pierre de la tranche, comme celle de la façade coupée (`drawFacadeCut`, `PIERRE_FACE`) : c'est le même
     mur vu du même côté. Son pied s'assombrit (le jour d'en haut), son bord extérieur est un trait, et l'arase évasée
     (`paintSideFaces`) la coiffe désormais sans vide entre les deux. */
  const out = x0 < 0 ? "a" : "b";
  for (let z = 0; z < hPx; z++) {
    const a = pa + Math.round(flarePx(x0, z, xc)), b = pb + Math.round(flarePx(x1, z, xc));
    rect(ctx, a, py - 1 - z, b - a, 1, PIERRE_FACE);
    if (z < pxOfM(0.5)) { ctx.globalAlpha = 0.26 * (1 - z / pxOfM(0.5)) ** 1.5; rect(ctx, a, py - 1 - z, b - a, 1, "#20160f"); ctx.globalAlpha = 1; }
    rect(ctx, out === "a" ? a : b - 1, py - 1 - z, 1, 1, "#5e5244");
    rect(ctx, out === "a" ? b - 1 : a, py - 1 - z, 1, 1, "#bfae92");
  }
}


/* ╔════════════════════════════════════════════════════════════════════════
   ║ 2026-10-21 (lot 2c) — LES OBJETS DE MUR (`maison.HOME_MURAUX`) : trois tableaux, un miroir, une horloge.
   ╚════════════════════════════════════════════════════════════════════════
   Vus DE FACE sur le mur du fond, ils se peignent au canevas comme le miroir des bains et le trumeau — pas de Blender : un
   cadre se lit de face, sans volume à rendre. ⚠️ LES TOILES SONT PROVISOIRES : les définitives viendront d'images Gemini
   (réponse de Guillaume, 2026-10-21 ; prompts dans `refs/lot-gemini/F-tableaux-maison.md`). `toile` (une image, facultative) prend
   alors la place de la peinture du cadre — le cadre, lui, reste peint ici. (x, y) : le coin haut-gauche du cadre ; w, h :
   sa taille en px des images cuites (`pxOfM` des cotes du catalogue). L'horloge a ses aiguilles à part
   (`paintClockHands`, à chaque image : elles donnent l'heure du jeu). */
const OR = ["#5e4416", "#9c7a2e", "#c9a24a", "#ecd17a", "#7a5a1e"];   // le cadre doré : ombre, corps, clair, éclat, lèvre
function paintCadreDore(ctx, x, y, w, h, t = 3) {
  rect(ctx, x, y, w, h, OR[0]);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, OR[1]);
  rect(ctx, x + 1, y + 1, w - 2, 1, OR[3]); rect(ctx, x + 1, y + 1, 1, h - 2, OR[2]);
  rect(ctx, x + 1, y + h - 2, w - 2, 1, OR[4]); rect(ctx, x + w - 2, y + 1, 1, h - 2, OR[4]);
  for (let k = 3; k < w - 3; k += 4) rect(ctx, x + k, y + 1, 1, 1, OR[2]);              // le rang de perles du haut
  rect(ctx, x + t - 1, y + t - 1, w - 2 * t + 2, h - 2 * t + 2, OR[0]);                // la lèvre sombre autour de la toile
  return [x + t, y + t, w - 2 * t, h - 2 * t];
}
function toilePaysage(ctx, X, Y, W, H, r) {
  const hor = Math.round(H * 0.52);
  for (let j = 0; j < hor; j++) { const t = j / hor; rect(ctx, X, Y + j, W, 1, t < 0.35 ? "#86aed0" : t < 0.7 ? "#a9c4d8" : "#d6e0d6"); }
  for (let k = 0; k < 3; k++) { const cx = X + 3 + Math.round(r() * (W - 10)), cy = Y + 1 + Math.round(r() * (hor * 0.4)); rect(ctx, cx, cy, 5, 1, "#eef3f2"); rect(ctx, cx + 1, cy - 1, 3, 1, "#f7faf8"); }
  for (let i = 0; i < W; i++) {                                                             // les collines bleutées au loin…
    const hh = Math.round(2 + 2 * Math.sin(i * 0.33 + 1.2) + Math.sin(i * 0.9));
    rect(ctx, X + i, Y + hor - hh, 1, hh, "#7e9c94");
  }
  for (let j = hor; j < H; j++) rect(ctx, X, Y + j, W, 1, j < hor + 2 ? "#9db35e" : j % 2 ? "#87a04c" : "#8fa853");   // …les prés
  for (let k = 0; k < W * 1.4; k++) rect(ctx, X + Math.round(r() * (W - 1)), Y + hor + 2 + Math.round(r() * (H - hor - 3)), 1, 1, r() < 0.5 ? "#6f8a3c" : "#b9c46e");
  for (let j = 0; j < H - hor; j++) rect(ctx, X + Math.round(W * 0.42 + j * 0.9), Y + hor + j, 2, 1, "#d4b77c");   // le chemin
  const hx = X + Math.round(W * 0.2), hy = Y + hor - 1;                                     // la ferme : mur blanc, toit rouge
  rect(ctx, hx, hy - 3, 6, 4, "#efe8d8"); rect(ctx, hx + 6, hy - 3, 1, 4, "#cfc6b2");
  rect(ctx, hx - 1, hy - 5, 8, 2, "#a8432e"); rect(ctx, hx, hy - 6, 6, 1, "#c45a3c");
  rect(ctx, hx + 2, hy - 1, 1, 2, "#5a4636");
  const tx = X + Math.round(W * 0.74);                                                      // le peuplier
  rect(ctx, tx + 1, Y + hor - 1, 1, 4, "#5a4030");
  for (let j = 0; j < 9; j++) { const ww = j < 2 ? 1 : j < 7 ? 3 : 2; rect(ctx, tx + 1 - (ww >> 1), Y + hor - 10 + j, ww, 1, j % 3 ? "#3f6a3a" : "#4f7d44"); }
}
function toileNature(ctx, X, Y, W, H, r) {
  for (let j = 0; j < H; j++) rect(ctx, X, Y + j, W, 1, j < H * 0.3 ? "#2c2018" : j < H * 0.62 ? "#352619" : "#2e2117");
  rect(ctx, X + Math.round(W * 0.55), Y + 2, Math.round(W * 0.35), Math.round(H * 0.4), "#3e2d1f");   // la lueur du fond, à droite
  const ty = Y + Math.round(H * 0.68);                                                     // la table : le plateau, son chant
  rect(ctx, X, ty, W, H - (ty - Y), "#5d3f26"); rect(ctx, X, ty, W, 1, "#8a6440"); rect(ctx, X, ty + 3, W, 1, "#3f2a19");
  const jx = X + 2;                                                                         // le pichet d'étain
  rect(ctx, jx, ty - 9, 5, 9, "#8d8f8a"); rect(ctx, jx + 1, ty - 9, 1, 8, "#c4c6c0"); rect(ctx, jx + 4, ty - 8, 1, 7, "#5f625e");
  rect(ctx, jx, ty - 10, 6, 1, "#a7aaa4"); rect(ctx, jx + 5, ty - 7, 2, 1, "#6f726d"); rect(ctx, jx + 6, ty - 7, 1, 3, "#6f726d");
  const bx = X + Math.round(W * 0.38), bw = Math.round(W * 0.55);                          // la coupe de faïence
  rect(ctx, bx + 1, ty - 2, bw - 2, 2, "#e8e3d6"); rect(ctx, bx, ty - 3, bw, 1, "#f5f1e6"); rect(ctx, bx + 2, ty - 1, bw - 4, 1, "#3e6a8a");
  const fruits = [["#b8322a", "#e06a52"], ["#d98a2a", "#f2b65a"], ["#8aa53a", "#c3d36a"], ["#b8322a", "#e06a52"]];
  fruits.forEach(([c, l], i) => { const fx = bx + 1 + i * 3, fy = ty - 6 - (i % 2); rect(ctx, fx, fy, 3, 3, c); rect(ctx, fx, fy, 1, 1, l); });
  for (let k = 0; k < 5; k++) rect(ctx, bx + bw - 3 + (k % 2), ty - 6 + k, 2, 1, k % 2 ? "#5a2e5e" : "#7a4280");   // la grappe qui pend
  void r;
}
function toilePortrait(ctx, X, Y, W, H, r) {
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {                                 // le fond, sombre au bord (vignetage)
    const d = Math.hypot((i - W / 2) / W, (j - H * 0.4) / H);
    rect(ctx, X + i, Y + j, 1, 1, d > 0.45 ? "#26261c" : d > 0.32 ? "#33331f" : "#40402a");
  }
  const cx = X + Math.round(W / 2), fy = Y + Math.round(H * 0.22), fw = Math.max(6, Math.round(W * 0.42)), fh = Math.round(H * 0.34);
  const sy = fy + fh + 2;                                                                    // les épaules, l'habit sombre, le col blanc
  for (let j = 0; sy + j < Y + H; j++) { const ww = Math.min(W, fw + 4 + j * 2); rect(ctx, cx - (ww >> 1), sy + j, ww, 1, j < 1 ? "#2a3550" : "#1f2840"); }
  rect(ctx, cx - 3, sy, 6, 2, "#ece6d6"); rect(ctx, cx - 1, sy + 2, 2, 2, "#d9d2c0");
  rect(ctx, cx - 2, fy + fh - 1, 4, 3, "#c99474");                                          // le cou
  for (let j = 0; j < fh; j++) {                                                            // le visage, ovale
    const t = (j + 0.5) / fh, ww = Math.round(fw * Math.sqrt(1 - (2 * t - 1) ** 2 * 0.7));
    rect(ctx, cx - (ww >> 1), fy + j, ww, 1, "#e0b08a");
    rect(ctx, cx + (ww >> 1) - 1, fy + j, 1, 1, "#c48f6c");
  }
  rect(ctx, cx - (fw >> 1) - 1, fy - 2, fw + 2, 3, "#3a2618");                             // les cheveux
  rect(ctx, cx - (fw >> 1) - 1, fy, 1, Math.round(fh * 0.6), "#3a2618"); rect(ctx, cx + (fw >> 1), fy, 1, Math.round(fh * 0.6), "#3a2618");
  rect(ctx, cx - (fw >> 1), fy - 2, 3, 1, "#5a3a24");
  rect(ctx, cx - 2, fy + Math.round(fh * 0.42), 1, 1, "#2a1c14"); rect(ctx, cx + 1, fy + Math.round(fh * 0.42), 1, 1, "#2a1c14");   // les yeux
  rect(ctx, cx - 3, fy + Math.round(fh * 0.62), 1, 1, "#e49a84"); rect(ctx, cx + 2, fy + Math.round(fh * 0.62), 1, 1, "#e49a84");   // les joues
  rect(ctx, cx - 1, fy + Math.round(fh * 0.78), 2, 1, "#a8564a");                          // la bouche
  void r;
}
function paintMiroirMural(ctx, x, y, w, h) {
  const R = Math.floor(w / 2);
  const larg = (j) => (j >= R ? w : Math.round(2 * Math.sqrt(Math.max(0, R * R - (R - j - 0.5) ** 2))));   // le haut en plein cintre
  for (let j = 0; j < h; j++) {
    const lw = larg(j), x0 = x + Math.round((w - lw) / 2);
    rect(ctx, x0, y + j, lw, 1, OR[1]);
    if (lw > 2) { rect(ctx, x0, y + j, 1, 1, j < R ? OR[3] : OR[2]); rect(ctx, x0 + lw - 1, y + j, 1, 1, OR[4]); }
  }
  rect(ctx, x + 1, y + h - 1, w - 2, 1, OR[4]); rect(ctx, x + Math.round(w / 2) - 1, y, 2, 1, OR[3]);
  for (let j = 2; j < h - 2; j++) {                                                         // le verre (2 px de cadre)
    const lw = Math.max(0, larg(j - 1) - 4), x0 = x + Math.round((w - lw) / 2);
    const t = j / h;
    rect(ctx, x0, y + j, lw, 1, t < 0.4 ? "#c3d1d6" : t < 0.75 ? "#b0c0c6" : "#9fb0b7");
  }
  for (const o of [0.28, 0.6]) for (let k = 0; k < 7; k++) rect(ctx, x + Math.round(w * o) + 3 - k, y + Math.round(h * 0.25) + k * 2, 2, 2, "#e1eaec");
  rect(ctx, x + 3, y + h - 6, w - 6, 1, "#c8a77a");                                         // le reflet chaud de la pièce, en bas
}
function paintHorloge(ctx, x, y, w) {
  const R = w / 2, cx = x + R, cy = y + R;
  for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) {
    const d = Math.hypot(i + 0.5 - R, j + 0.5 - R);
    if (d > R) continue;
    const c = d > R - 1 ? "#3e2a18" : d > R - 2.6 ? ((i < R && j < R) ? "#8a6036" : "#6b4a2e") : d > R - 3.2 ? "#d6ccb4" : "#f4eedf";
    rect(ctx, x + i, y + j, 1, 1, c);
  }
  for (let k = 0; k < 12; k++) {                                                            // les douze heures
    const a = k * Math.PI / 6, rr = R - 4.2;
    rect(ctx, Math.round(cx + Math.sin(a) * rr - 0.5), Math.round(cy - Math.cos(a) * rr - 0.5), 1, 1, k % 3 ? "#9a8f7c" : "#2e2620");
  }
}
/* LES AIGUILLES de l'horloge (à chaque image) : `tmin`, la minute du jour du jeu. (x, y, w) : le cadre de l'horloge. */
export function paintClockHands(ctx, x, y, w, tmin) {
  const R = w / 2, cx = x + R, cy = y + R;
  const hand = (a, len, c) => { for (let k = 0; k <= len; k += 0.5) rect(ctx, Math.round(cx + Math.sin(a) * k - 0.5), Math.round(cy - Math.cos(a) * k - 0.5), 1, 1, c); };
  const m = ((tmin % 1440) + 1440) % 1440;
  hand((m % 60) / 60 * 2 * Math.PI, R - 4.5, "#2e2620");
  hand(((m / 60) % 12) / 12 * 2 * Math.PI, R - 6.5, "#2e2620");
  rect(ctx, Math.round(cx) - 1, Math.round(cy) - 1, 2, 2, "#b8903e");
}
/* L'OBJET DE MUR ENTIER (cadre et toile, ou miroir, ou cadran), avec son ombre portée sur le mur (1 px à droite et dessous :
   il se lit accroché, pas peint sur le papier). */
export function paintMural(ctx, s, x, y, w, h, toile = null) {
  const r = (() => { let k = 0; return () => h32(s.length * 31 + w, h, k++); })();
  ctx.globalAlpha = 0.28;
  if (/^horloge/.test(s)) {   // l'ombre d'un cadran est ronde (vue au banc : un carré gris derrière l'horloge)
    for (let j = 0; j < w; j++) { const hw = Math.round(Math.sqrt(Math.max(0, (w / 2) ** 2 - (j + 0.5 - w / 2) ** 2))); rect(ctx, x + 1 + Math.round(w / 2) - hw, y + 2 + j, 2 * hw, 1, "#20160f"); }
    ctx.globalAlpha = 1;
    paintHorloge(ctx, x, y, w);
    return;
  }
  if (/^miroir_mural/.test(s)) {   // l'ombre suit le plein cintre
    const R = Math.floor(w / 2);
    for (let j = 0; j < h; j++) { const lw = j >= R ? w : Math.round(2 * Math.sqrt(Math.max(0, R * R - (R - j - 0.5) ** 2))); rect(ctx, x + 1 + Math.round((w - lw) / 2), y + 2 + j, lw, 1, "#20160f"); }
    ctx.globalAlpha = 1;
    paintMiroirMural(ctx, x, y, w, h);
    return;
  }
  rect(ctx, x + 1, y + 2, w, h, "#20160f"); ctx.globalAlpha = 1;
  const [X, Y, W, H] = paintCadreDore(ctx, x, y, w, h, w >= 30 ? 3 : 2);
  if (toile) { ctx.drawImage(toile, X, Y, W, H); return; }
  if (/paysage/.test(s)) toilePaysage(ctx, X, Y, W, H, r);
  else if (/nature/.test(s)) toileNature(ctx, X, Y, W, H, r);
  else toilePortrait(ctx, X, Y, W, H, r);
  ctx.globalAlpha = 0.18; rect(ctx, X, Y, W, 1, "#000"); rect(ctx, X, Y, 1, H, "#000"); ctx.globalAlpha = 1;   // le cadre ombre la toile
}
/* L'IMAGE D'UN OBJET DE MUR, peinte une fois : son cadre de `w` × `h` px et la marge de son ombre (1 px à droite, 2 dessous). */
export function bakeMural(mk, s, w, h, toile = null) {
  const c = mk(w + 1, h + 2), g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  paintMural(g, s, 0, 0, w, h, toile);
  return c;
}
/* La taille peinte d'un objet de mur (px des images cuites), depuis ses cotes en mètres (`maison.HOME_MURAUX`). */
export const muralPx = (sp) => [pxOfM(sp.w), pxOfM(sp.h)];

/* ╔════════════════════════════════════════════════════════════════════════
   ║ LOT 2d (2026-10-22) — LA TEINTURE ET LES RIDEAUX DE COLETTE (règles : `maison.js`, « LOT 2d »).
   ╚════════════════════════════════════════════════════════════════════════
   1. LA TEINTURE D'UN SPRITE BLENDER (`teindrePx`). La matière toon de `studio.py` rend
        couleur_lin × M(x)  puis  écran(·, reflet(x))
      et ni M (le palier, l'occlusion, le froid des ombres) ni le reflet ne dépendent de la couleur. Les passes
      (`public/maison/teinte/<meuble>_<O>_<a|b|g>.png`, `tools/blender/rendre_teintes.py`) donnent M pour la zone a (le
      tissu) et b (l'accent), et le reflet seul ; on recompose EN LINÉAIRE ce que Blender aurait rendu. Mesuré
      (`verify-maison`) : le canapé recoloré « canard / rouille » contre le vrai rendu `canape_canard` — au plus 15/255
      sur le passepoil (un ton assombri en sRGB chez Blender, en linéaire ici), ±1 ailleurs (le grain du rendu).
      ⚠️ Un pixel de passe n'est jamais tout à fait noir (le grain d'EEVEE rend 1/255) : le tissu se reconnaît au-dessus
      de `TEINTE_SEUIL` (le plus sombre palier de tissu, au fond d'un pli, en vaut encore ~70).
   2. LES RIDEAUX, peints au canevas (une baie a la largeur que lui donne sa façade : aucun rendu fixe n'y tiendrait),
      MAIS AUX PALIERS DE LA MATIÈRE TOON (`toonTon` : les mêmes valeurs perçues 1 / 0,87 / 0,75 / 0,62, le même froid des
      ombres que `studio.toon_group`) — c'est ce qui les fait tenir à côté des meubles Blender. La lumière vient d'en haut
      à gauche : chaque pli est clair à gauche, sombre à droite. Ouverts et longs, ils sont retenus par une EMBRASSE
      (dans la teinte d'accent) ; fermés, les deux pans se rejoignent au milieu. */
export const TEINTE_SEUIL = 30;   // somme r + g + b d'un pixel de passe au-dessus de laquelle c'est du tissu
const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) { const c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
const SRGB = new Uint8Array(4097);
for (let i = 0; i <= 4096; i++) { const v = i / 4096; SRGB[i] = Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)); }
const enc = (v) => SRGB[Math.max(0, Math.min(4096, Math.round(v * 4096)))];
export const hexLin = (h) => [1, 3, 5].map((i) => LIN[parseInt(h.slice(i, i + 2), 16)]);
/* Recolore `base` (RGBA, Uint8ClampedArray) : `pa`, `pb` (ou null), `pg` les passes de même taille ; `ca`, `cb` les
   teintes (« #rrggbb » ; `cb` null : l'accent garde sa couleur). Rend un nouveau tableau. */
export function teindrePx(base, pa, pb, pg, ca, cb) {
  const out = new Uint8ClampedArray(base), A = hexLin(ca), B = cb ? hexLin(cb) : null;
  for (let i = 0; i < out.length; i += 4) {
    if (!base[i + 3]) continue;
    let P = null, c = null;
    if (pa[i] + pa[i + 1] + pa[i + 2] > TEINTE_SEUIL) { P = pa; c = A; }
    else if (B && pb && pb[i] + pb[i + 1] + pb[i + 2] > TEINTE_SEUIL) { P = pb; c = B; }
    if (!P) continue;
    for (let k = 0; k < 3; k++) out[i + k] = enc(1 - (1 - LIN[pg[i + k]]) * (1 - c[k] * LIN[P[i + k]]));
  }
  return out;
}
/* Le ton d'une couleur au palier perçu `v` de la matière toon (celle des meubles) : le palier passé en linéaire, puis le
   froid des ombres (`studio.SHADOW_TINT`, mêlé d'autant plus que le palier est bas). Rend « rgb(…) ». */
const SHADOW_TINT = [0.76, 0.74, 0.95];
const TON_MEMO = new Map();
export function toonTon(hex, v) {
  const key = hex + v;
  if (TON_MEMO.has(key)) return TON_MEMO.get(key);
  const c = hexLin(hex), l = v ** 2.2, f = Math.max(0, Math.min(1, (l - 0.22) / 0.78));
  const s = "rgb(" + [0, 1, 2].map((k) => enc(c[k] * l * (SHADOW_TINT[k] * (1 - f) + f))).join(",") + ")";
  TON_MEMO.set(key, s);
  return s;
}
const DOUBLURE = "#efe6d4";   // la doublure crème (la coupe, le revers des bords)
/* Le palier d'un point de pli (`ph` dans [0, 1[, de gauche à droite d'un pli ; `creux` : un rideau tassé a des plis
   profonds, qui descendent jusqu'au palier d'ombre). */
function palierPli(ph, creux) {
  if (creux) return ph < 0.28 ? 1.0 : ph < 0.52 ? 0.87 : ph < 0.76 ? 0.75 : 0.62;
  return ph < 0.36 ? 1.0 : ph < 0.72 ? 0.87 : 0.75;
}
/* UN PAN, rangée par rangée. `xo` : son bord extérieur (contre le mur) ; `dir` +1 il s'étend vers la droite (le pan de
   gauche), −1 vers la gauche ; `largeur(y)` : sa largeur à la rangée y ; `nf` : son nombre de plis (le même tissu,
   qu'il soit tassé ou tiré) ; `creux` ; `y0`, `y1` : ses rangées. */
function paintPan(ctx, xo, dir, y0, y1, largeur, nf, creux, a) {
  for (let y = y0; y < y1; y++) {
    const w = Math.max(1, Math.round(largeur(y))), xl = dir > 0 ? xo : xo - w;
    let prev = null, run = 0, x0 = xl;
    for (let i = 0; i <= w; i++) {
      // le bord intérieur (vers le milieu de la baie) : un trait d'ombre, le revers du tissu
      const v = i === w ? null : (dir > 0 ? i === w - 1 : i === 0) ? 0.62 : palierPli((i / w * nf) % 1, creux);
      if (v === prev) { run++; continue; }
      if (prev != null) rect(ctx, x0, y, run, 1, toonTon(a, prev));
      prev = v; run = 1; x0 = xl + i;
    }
  }
}
/* LES RIDEAUX D'UNE BAIE, en px : `x0`, `w` la baie (l'embrasure) ; `yRod` la tringle ; `yBot` le bas des pans ; `yTie`
   (ou null) la hauteur de l'embrasse ; `clos` ; `a` le tissu, `b` l'accent (l'embrasse) ; `deb` le débord sur le mur. */
export function paintRideauPx(ctx, o) {
  const { x0, w, yRod, yBot, clos, a } = o, deb = o.deb == null ? 6 : o.deb;
  /* ⚠️ VU À LA PLANCHE (2026-10-22) : à un pli tous les 5 px, un rideau TIRÉ, évasé avec son mur (`flaredRideaux`, chaque
     rangée étirée d'un facteur un peu différent), scintillait en hachures. Un pli tous les 7 px : des bandes de 2 à 3 px,
     que l'étirement élargit sans les briser. Le même nombre de plis tassé, ouvert, donne des plis profonds de 2 à 3 px. */
  const pwClos = Math.ceil(w / 2) + deb, nf = Math.max(2, Math.round(pwClos / 7));
  const pw = clos ? pwClos : Math.round(w * 0.20) + deb, yT = yRod + 2, H = yBot - yT;
  const tie = !clos && o.yTie != null && o.yTie > yT + 4 && o.yTie < yBot - 4 ? o.yTie : null;
  // ouverts avec embrasse : pleins en haut, pincés à l'embrasse, évasés au pied ; sinon droits
  const largeur = (y) => {
    if (!tie) return pw;
    if (y <= tie) return pw * (1 - 0.45 * (y - yT) / (tie - yT));
    const t = (y - tie) / Math.max(1, yBot - tie);
    return pw * (0.55 + 0.30 * Math.sqrt(t));
  };
  // l'ombre portée sur le mur (la lumière vient de la gauche) : 2 px à droite de chaque pan
  ctx.globalAlpha = 0.16;
  for (let y = yT; y < yBot; y += 1) {
    const L = Math.round(largeur(y));
    rect(ctx, x0 - deb + L, y + 1, 2, 1, "#20160f");
    rect(ctx, x0 + w + deb, y + 1, 2, 1, "#20160f");
  }
  ctx.globalAlpha = 1;
  paintPan(ctx, x0 - deb, +1, yT, yBot, largeur, nf, !clos, a);
  paintPan(ctx, x0 + w + deb, -1, yT, yBot, largeur, nf, !clos, a);
  // la tête plissée : une bande claire, un pincement sombre à chaque pli
  for (const [xo, dir] of [[x0 - deb, 1], [x0 + w + deb, -1]]) {
    const L = Math.round(largeur(yT)), xl = dir > 0 ? xo : xo - L;
    rect(ctx, xl, yT, L, 3, toonTon(a, 1.0));
    for (let k = 0; k < nf; k++) rect(ctx, xl + Math.round((k + 0.75) * L / nf), yT, 1, 3, toonTon(a, 0.75));
    // l'ourlet du bas : un rang clair (le revers), un trait d'ombre
    const Lb = Math.round(largeur(yBot - 1)), xb = dir > 0 ? xo : xo - Lb;
    rect(ctx, xb, yBot - 2, Lb, 1, toonTon(a, 0.87));
    rect(ctx, xb, yBot - 1, Lb, 1, toonTon(a, 0.62));
    if (tie) {   // l'embrasse : une torsade dans la teinte d'accent, tirée vers le mur
      const Lt = Math.round(largeur(tie)), xt = dir > 0 ? xo : xo - Lt - 2;
      rect(ctx, xt, tie - 1, Lt + 2, 2, toonTon(o.b || a, 0.87));
      rect(ctx, xt, tie - 1, Lt + 2, 1, toonTon(o.b || a, 1.0));
      rect(ctx, dir > 0 ? xo - 1 : xo, tie - 1, 1, 2, "#3a2c20");   // le crochet au mur
    }
  }
  // la tringle de fer forgé, ses anneaux, ses deux pommeaux
  rect(ctx, x0 - deb - 3, yRod, w + 2 * deb + 6, 2, "#3b322c");
  rect(ctx, x0 - deb - 3, yRod, w + 2 * deb + 6, 1, "#6a5c50");
  for (const xp of [x0 - deb - 5, x0 + w + deb + 3]) { rect(ctx, xp, yRod - 1, 2, 4, "#3b322c"); rect(ctx, xp, yRod - 1, 1, 1, "#7a6a5c"); }
  if (H > 0) for (const [xo, dir] of [[x0 - deb, 1], [x0 + w + deb, -1]]) {
    const L = Math.round(largeur(yT));
    for (let k = 0; k < nf; k++) rect(ctx, (dir > 0 ? xo : xo - L) + Math.round((k + 0.5) * L / nf), yRod + 1, 1, 2, "#8a7a68");
  }
}
/* Les cotes d'une baie de mur (`maison.homeWindows`, le `fenetre` de sa pièce) en px au-dessus du pied du mur : la tringle
   10 cm au-dessus du haut de la baie, le bas des pans au sol (longs) ou 2 cm sous l'appui (courts), l'embrasse un peu
   au-dessus de l'appui. ⚠️ L'APPUI ET LE HAUT SONT CEUX DE `paintWallWindow` (0,90 / 2,15 m, ou ceux de la pièce). */
export function rideauCotes(fenetre, court) {
  const allege = fenetre ? fenetre.allege : 0.90, haut = fenetre ? fenetre.haut : 2.15;
  return { rod: pxOfM(haut + 0.10) + 4, bot: court ? pxOfM(allege) - 4 : 1, tie: court ? null : pxOfM(allege + 0.12) };
}
/* LES RIDEAUX D'UNE FENÊTRE DU MUR DU FOND, sur sa face cuite : `x0`, `w` la baie en px de la face, `yFoot` le pied. */
export function paintRideau(ctx, x0, yFoot, w, o) {
  const c = rideauCotes(o.fenetre, o.court);
  paintRideauPx(ctx, { x0, w, yRod: yFoot - c.rod, yBot: yFoot - c.bot, yTie: c.tie == null ? null : yFoot - c.tie, clos: o.clos, a: o.a, b: o.b });
}
/* LA COUPE DES RIDEAUX DEVANT LA FAÇADE (coupée à 35 cm, `HOME_CUT`) : les pans longs, au sol devant la baie, coupés à la
   même hauteur que le mur ; leur tranche plissée (la doublure crème en zigzag, un pli sur deux plus haut) dépasse de
   l'arase. `x0`, `w` : la baie en px ; `yFoot` : la ligne du sol où ils tombent ; `cut` : la hauteur de coupe (px). */
export function paintRideauCoupe(ctx, x0, yFoot, w, cut, o) {
  const deb = 6, pwClos = Math.ceil(w / 2) + deb, nf = Math.max(2, Math.round(pwClos / 7));
  const pw = o.clos ? pwClos : Math.round((Math.round(w * 0.20) + deb) * 0.85);   // ouverts : leur pied évasé sous l'embrasse
  const y0 = yFoot - cut, larg = () => pw;
  paintPan(ctx, x0 - deb, +1, y0, yFoot, larg, nf, !o.clos, o.a);
  paintPan(ctx, x0 + w + deb, -1, y0, yFoot, larg, nf, !o.clos, o.a);
  for (const [xo, dir] of [[x0 - deb, 1], [x0 + w + deb, -1]]) {
    const xl = dir > 0 ? xo : xo - pw;
    for (let i = 0; i < pw; i++) {
      const ph = (i / pw * nf) % 1, haut = ph < 0.5 ? 0 : 1;
      rect(ctx, xl + i, y0 - 1 + haut, 1, 1, DOUBLURE);
      rect(ctx, xl + i, y0 + haut, 1, 1, toonTon(o.a, 0.62));
    }
    rect(ctx, xl, yFoot - 1, pw, 1, toonTon(o.a, 0.62));
  }
}
/* VU DE LA RUE : les rideaux derrière une vitre de façade, en px d'ÉCRAN (`X`, `Y`, `W`, `H` : la vitre). Ouverts, deux
   bandes plissées sur les côtés ; fermés, la vitre entière. Peints sur l'image de jour, AVANT la lueur des vitres : une
   pièce allumée derrière des rideaux tirés luit au travers. */
export function paintRideauRue(ctx, X, Y, W, H, o) {
  if (W < 2 || H < 2) return;
  const sw = o.clos ? Math.ceil(W / 2) : Math.max(1, Math.round(W * 0.24)), per = W >= 12 ? 3 : 2;
  for (const [xl, inner] of [[X, X + sw - 1], [X + W - sw, X + W - sw]]) {
    for (let i = 0; i < sw; i++) {
      const x = xl + i, v = x === inner && !o.clos ? 0.62 : (i % per) === 0 ? 1.0 : 0.87;
      rect(ctx, x, Y, 1, H, toonTon(o.a, v));
    }
  }
  if (o.clos) rect(ctx, X + Math.floor(W / 2), Y, 1, H, toonTon(o.a, 0.75));
  rect(ctx, X, Y, W, 1, "#3b322c");
}
/* L'IMAGE D'UN RIDEAU (catalogue, garde-meuble) : une fenêtre sur un pan de mur, rideaux ouverts, `a` le tissu. */
export function bakeRideauIcon(mk, a, b) {
  const c = mk(48, 56), g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  rect(g, 0, 0, 48, 56, "#e6dcc6");
  rect(g, 0, 50, 48, 6, "#b88a58");
  rect(g, 0, 50, 48, 1, "#8f6a3e");
  rect(g, 12, 10, 24, 28, "#efe8d8");
  rect(g, 14, 12, 20, 24, "#a9c7dc");
  rect(g, 14, 12, 20, 8, "#c8dcea");
  rect(g, 23, 12, 2, 24, "#efe8d8");
  rect(g, 10, 38, 28, 2, "#e8e0cc");
  paintRideauPx(g, { x0: 12, w: 24, yRod: 5, yBot: 50, yTie: 36, clos: false, a, b, deb: 5 });
  return c;
}

/* ╔════════════════════════════════════════════════════════════════════════
   ║ LOT 4 (2026-10-22) — LE CROCHET À CLÉS DE L'ENTRÉE (règles : `maison.js`, « LOT 4 »).
   ╚════════════════════════════════════════════════════════════════════════
   Une planchette de chêne à trois crochets de laiton, peinte sur le mur du fond de l'entrée, entre l'interrupteur et
   l'applique. LES DOUBLES QUI RESTENT Y PENDENT (`left`, de 0 à 3) : en confier un le décroche — ce qu'on lit au mur est ce
   que l'hôte tient. `x`, `y` : le coin haut-gauche ; `w`, `h` : la planchette (px). */
export function paintCrochet(ctx, x, y, w, h, left) {
  ctx.globalAlpha = 0.28; rect(ctx, x + 1, y + 2, w, h, "#20160f"); ctx.globalAlpha = 1;   // son ombre au mur
  rect(ctx, x, y, w, h, "#9a6a3e");
  rect(ctx, x, y, w, 1, "#c08a55");
  rect(ctx, x, y + h - 1, w, 1, "#6b4526");
  rect(ctx, x, y, 1, h, "#b07a48");
  for (const vx of [x + 2, x + w - 3]) { rect(ctx, vx, y + 2, 1, 1, "#4a3424"); }   // deux vis
  // les clés pendent DEVANT la planchette (dessous, elles tombaient sur l'interrupteur) : crochet en haut, clé jusqu'au bas
  const n = 3;
  for (let i = 0; i < n; i++) {
    const cx = x + Math.round((i + 0.5) * w / n), cy = y + 2;
    rect(ctx, cx, cy, 1, 2, "#c9a24a");                 // le crochet
    rect(ctx, cx, cy + 2, 2, 1, "#c9a24a");
    rect(ctx, cx, cy, 1, 1, "#f0d488");
    if (i >= left) continue;                             // ce double est confié : le crochet est vide
    const kx = cx - 1, ky = cy + 3;
    ctx.globalAlpha = 0.3; rect(ctx, kx + 1, ky + 1, 3, h - 6, "#20160f"); ctx.globalAlpha = 1;   // son ombre sur la planchette
    rect(ctx, kx, ky, 3, 3, "#c9a24a");                  // l'anneau
    rect(ctx, kx + 1, ky + 1, 1, 1, "#7a5a26");
    rect(ctx, kx + 1, ky + 3, 1, h - 7, "#d8b25a");      // la tige
    rect(ctx, kx + 2, ky + h - 7, 1, 1, "#d8b25a");      // le panneton
    rect(ctx, kx + 2, ky + h - 5, 1, 1, "#d8b25a");
    rect(ctx, kx, ky, 1, 1, "#f0d488");
  }
}
