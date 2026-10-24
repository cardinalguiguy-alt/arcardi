/* ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   ║ garderobeArt.js — LES VÊTEMENTS DE LA MAISON GARFIELD, DESSINÉS SUR LA FEUILLE DU PERSONNAGE (2026-10-21).
   ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Guillaume : « les vêtements doivent être bien détaillés, moins comme des blocs, plus réalistes et beaux ». Ses choix (sur
   recommandation) : la grille actuelle de 16 × 24, repeinte ; les 14 articles ; ils suivent le pas ; une planche à juger d'abord
   (`tools/render-garderobe.mjs`). Le zip 427 les posait en trois aplats, les mêmes de face, de dos et de profil.

   COMMENT C'EST PEINT (DESSIN.md) :
   * UNE COUCHE PAR VÊTEMENT, une lettre de ton par pixel : `o` creux, `d` ombre, `m` base, `l` lumière, `h` éclat, plus les lettres
     d'un détail (`s` peau, `g` or, `w` blanc…). La couche se peint d'un coup à la fin, décalée du `bob` du pas.
   * LE DRAPÉ (`drape`) donne le ton d'une rangée par sa POSITION dans la rangée : la lumière vient d'en haut à gauche (tout le projet),
     le bord gauche est clair, le droit sombre — la masse se lit ronde, sans aucun pixel tiré au hasard. Les PLIS sont des segments :
     un creux et, à sa gauche, une arête claire (le pli prend la lumière avant de plonger). L'ourlet est la rangée la plus sombre.
   * LES RAMPES se tirent de la couleur de base en GLISSANT LA TEINTE (vers le chaud en montant, vers le froid en descendant) : une
     ombre qui n'est que la base assombrie fait de la boue, surtout sur le rouge et le rose.
   * LA MARCHE : la jupe, la cape, les pans d'écharpe et les franges se décalent d'un pixel avec le pas (`step`) ; le tutu rebondit.
   * Les cheveux longs de la fermière RETOMBENT par-dessus le col et l'écharpe (repeints après le vêtement, avant le chapeau).

   ⚠️ LA TEINTE (« Couleurs ») PREND LA PLACE DE LA COULEUR PROPRE de chaque article, comme au 427 — sauf la capeline (la paille reste
   paille, son RUBAN prend la teinte), le boa, l'étole et le diadème (matières naturelles, inchangées depuis le 427).
   ⚠️ Rien ici ne sort du cadre de 16 × 24 : un pixel au-dessus de y = 0 ou sous y = 23 est découpé sans rien dire (la feuille met les
   images côte à côte). D'où l'ourlet de la robe recollé à y = 23 quand le corps descend (`anchor`). */
import * as C from "./fermeConstants";

const W = 16, H = 24;

// ─── couleurs ────────────────────────────────────────────────────────────────────────────────────────────────────
function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const t = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return "#" + t(r) + t(g) + t(b);
}
// la teinte glisse vers `to` (degrés) d'au plus `deg`, par le plus court chemin
function towards(h, to, deg) { const d = ((to - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), deg); }
const RAMPS = new Map();
/* La rampe d'une couleur : cinq tons, du creux à l'éclat. Les écarts de clarté sont FIXES (une rampe lisible sur l'aplat le plus
   sombre comme sur le plus pâle) ; un fond très sombre (le haut-de-forme) remonte ses éclats plutôt que d'écraser ses ombres. */
export function wardrobeRamp(hex) {
  let r = RAMPS.get(hex);
  if (r) return r;
  const [h, s, l] = hexToHsl(hex), dark = l < 0.22;
  const at = (dl, hue, ds) => hslToHex(towards(h, hue, Math.abs(dl) * 40), s + ds, l + dl);
  r = {
    o: at(dark ? -0.07 : -0.19, 250, 0.03), d: at(dark ? -0.035 : -0.095, 250, 0.02), m: hex,
    l: at(dark ? 0.1 : 0.085, 45, -0.02), h: at(dark ? 0.2 : 0.17, 45, -0.06),
  };
  RAMPS.set(hex, r);
  return r;
}
const GOLD = { g: "#f0cf6a", G: "#a8772a", h: "#fff3b8" };

// ─── la couche ───────────────────────────────────────────────────────────────────────────────────────────────────
const blank = () => Array.from({ length: H }, () => new Array(W).fill(null));
const DARKER = { h: "l", l: "m", m: "d", d: "o", o: "o" };
const LIGHTER = { o: "d", d: "m", m: "l", l: "h", h: "h" };
// le ton d'un pixel par sa place dans la rangée (0 = bord gauche, éclairé ; 1 = bord droit)
// ⚠️ TROIS ZONES LARGES, pas cinq bandes : cinq tons répartis en colonnes faisaient un CODE-BARRES (première planche du 2026-10-21).
function toneAt(u) { return u < 0.2 ? "l" : u < 0.7 ? "m" : u < 0.93 ? "d" : "o"; }
/* LE DRAPÉ. `rows` : [y, x0, x1] ; `folds` : [y0, y1, xa, xb] (un pli droit de (xa, y0) à (xb, y1)). La dernière rangée est l'ourlet. */
let FOLDS_OUT = null;   // 2026-10-23 : quand le 32 × 48 demande une couche, il RECUEILLE les plis au lieu de les peindre (voir `wardrobeLayer`)
function drape(L, rows, folds = []) {
  const last = rows.length ? rows[rows.length - 1][0] : -1;
  if (FOLDS_OUT) { FOLDS_OUT.push(...folds); folds = []; }
  for (const [y, x0, x1] of rows) {
    for (let x = x0; x <= x1; x++) {
      const t = toneAt(x1 === x0 ? 0.5 : (x - x0) / (x1 - x0));
      L[y][x] = y === last ? DARKER[t] : t;
    }
  }
  for (const [y0, y1, xa, xb] of folds) {
    for (let y = y0; y <= y1; y++) {
      const x = Math.round(xa + (xb - xa) * (y1 === y0 ? 0 : (y - y0) / (y1 - y0)));
      if (!L[y][x]) continue;
      L[y][x] = DARKER[L[y][x]];
      if (L[y][x - 1] && L[y][x - 2]) L[y][x - 1] = LIGHTER[L[y][x - 1]];   // l'arête, sauf au bord (il est déjà clair)
    }
  }
}
// une rangée écrite à la main : « . » garde, « _ » efface, toute autre lettre se pose
function patch(L, y, s) {
  for (let x = 0; x < W && x < s.length; x++) { const c = s[x]; if (c === ".") continue; L[y][x] = c === "_" ? null : c; }
}
// les rangées à partir de `y0` glissent de `dx` (la jupe qui suit le pas)
function sway(L, y0, dx) {
  if (!dx) return;
  for (let y = y0; y < H; y++) {
    const row = L[y], out = new Array(W).fill(null);
    for (let x = 0; x < W; x++) if (row[x]) { const nx = x + dx; if (nx >= 0 && nx < W) out[nx] = row[x]; }
    L[y] = out;
  }
}
function lastRow(L) { for (let y = H - 1; y >= 0; y--) if (L[y].some(Boolean)) return y; return -1; }
/* Peint la couche, décalée de `bob`. `anchor` : l'ourlet touche le bas du cadre ; quand le corps descend d'un pixel, la rangée qui
   sortirait du cadre est perdue mais l'ourlet est REPEINT à y = 23 (la jupe se tasse, elle ne se coupe pas). */
function emit(g, P, ox, L, pal, bob, anchor) {
  for (let y = 0; y < H; y++) {
    const yy = y + bob;
    if (yy >= H) continue;
    const src = anchor && bob && yy === H - 1 ? L[H - 1] : L[y];
    for (let x = 0; x < W; x++) { const c = src[x]; if (c && pal[c]) P(g, ox + x, yy, 1, 1, pal[c]); }
  }
}

// ─── les tenues ──────────────────────────────────────────────────────────────────────────────────────────────────
const OUTFIT_COL = { gown: "#2c3478", cape: "#74203f", suit: "#3d4252", poncho: "#b4532a", tutu: "#e79ab4" };

/* LA ROBE DU SOIR : un corsage ajusté au décolleté en V, une ceinture de satin et sa broche, une jupe longue qui s'évase jusqu'au sol en
   trois plis — et qui balance au pas. Dos : boutons de nacre et un nœud dont les pans tombent sur la jupe. Profil : la traîne part
   derrière. */
function gown(L, dir, step) {
  if (dir === 2) {
    drape(L, [[10, 4, 11], [11, 4, 11], [12, 4, 11], [13, 4, 11], [14, 4, 11], [15, 4, 11], [16, 3, 11], [17, 2, 12], [18, 2, 12],
      [19, 1, 12], [20, 1, 12], [21, 1, 12], [22, 0, 12], [23, 0, 12]], [[15, 23, 6, 3], [16, 23, 9, 8]]);
    patch(L, 10, "..........ss....");
    patch(L, 14, "....mdddddgG....");
    return;
  }
  drape(L, [[10, 4, 11], [11, 3, 12], [12, 3, 12], [13, 3, 12], [14, 3, 12], [15, 4, 11], [16, 3, 12], [17, 2, 13], [18, 2, 13],
    [19, 1, 14], [20, 1, 14], [21, 1, 14], [22, 1, 14], [23, 1, 14]], [[15, 23, 7, 5], [15, 23, 10, 12], [19, 23, 9, 9]]);
  // le reflet du satin : un filet clair le long du bord éclairé de la jupe (deuxième pixel), du haut des hanches au-dessus de l'ourlet
  for (let y = 16; y <= 21; y++) { const x0 = L[y].findIndex(Boolean); if (x0 >= 0 && L[y][x0 + 1] === "m") L[y][x0 + 1] = "h"; }
  if (dir === 0) {
    patch(L, 10, "......ssss......");
    patch(L, 11, ".......ss.......");
    patch(L, 14, "....mddgGddo....");
  } else {
    patch(L, 10, ".......w........"); patch(L, 11, ".......d........");
    patch(L, 12, ".......w........"); patch(L, 13, ".......d........");
    patch(L, 14, "....dlhddhld....");
    patch(L, 15, "......h..h......"); patch(L, 16, "......l..l......");
  }
  sway(L, 19, step);
}

/* LA CAPE DE VELOURS : un col montant, un fermoir d'or à la gorge, deux pans qui tombent aux mollets et s'ouvrent sur la doublure de
   soie dorée ; de dos, un seul pan à trois plis ; de profil, elle pend derrière et s'envole d'un pixel quand on marche. */
function cape(L, dir, step) {
  if (dir === 2) {
    drape(L, [[9, 4, 9], [10, 3, 10], [11, 3, 10], [12, 3, 10], [13, 3, 10], [14, 2, 9], [15, 2, 9], [16, 2, 9], [17, 1, 9],
      [18, 1, 9], [19, 1, 9], [20, 1, 9], [21, 1, 9]], [[12, 21, 5, 3], [14, 21, 7, 6]]);
    patch(L, 8, ".....lm.........");
    patch(L, 10, "..........G.....");                      // le fermoir, sur l'épaule de devant
    if (step) sway(L, 15, -1);
    return;
  }
  if (dir === 1) {
    drape(L, [[9, 3, 12], [10, 2, 13], [11, 2, 13], [12, 2, 13], [13, 2, 13], [14, 2, 13], [15, 2, 13], [16, 1, 14], [17, 1, 14],
      [18, 1, 14], [19, 1, 14], [20, 1, 14], [21, 1, 14]], [[11, 21, 5, 3], [10, 21, 8, 8], [11, 21, 11, 12]]);
    sway(L, 18, step);
    return;
  }
  drape(L, [[10, 2, 13], [11, 2, 13], [12, 2, 13], [13, 2, 13], [14, 2, 13], [15, 2, 13], [16, 1, 14], [17, 1, 14], [18, 1, 14],
    [19, 1, 14], [20, 1, 14], [21, 1, 14]], [[12, 21, 4, 3], [12, 21, 11, 12]]);
  patch(L, 8, "...lm......md...");
  patch(L, 9, "..lhm......mdo..");
  patch(L, 10, ".......gG.......");
  for (let y = 11; y <= 21; y++) patch(L, y, "......c__C......");   // l'ouverture sur la doublure
  sway(L, 18, step);
}

/* LE TAILLEUR STRICT : épaules nettes, revers clairs sur une chemise blanche et une cravate, pochette, boutons d'or, manchettes ; un
   pantalon à pli (lui) ou une jupe droite (elle), du même drap. Dos : couture et fente. */
function suit(L, dir, gender) {
  if (dir === 2) {
    drape(L, [[10, 4, 11], [11, 4, 11], [12, 4, 11], [13, 4, 11], [14, 4, 11], [15, 4, 11], [16, 4, 11]]);
    patch(L, 10, "..........wk....");
    patch(L, 11, "..........hK....");
    patch(L, 12, "...........K....");
  } else {
    drape(L, [[10, 4, 11], [11, 3, 12], [12, 3, 12], [13, 3, 12], [14, 3, 12], [15, 4, 11], [16, 4, 11]]);
    if (dir === 0) {
      patch(L, 10, ".....hwkkwd.....");
      patch(L, 11, "......hkKd......");
      patch(L, 12, ".......K..w.....");
      patch(L, 13, "........g.......");
      patch(L, 15, "........g.......");
    } else {
      patch(L, 10, "....mmdddddo....");
      for (let y = 11; y <= 14; y++) patch(L, y, "........d.......");
      patch(L, 15, "........o......."); patch(L, 16, "........o.......");
    }
    patch(L, 14, "...w........w...");                       // les manchettes
  }
  if (gender === "f") {
    drape(L, [[17, 3, 12], [18, 3, 12], [19, 3, 12], [20, 3, 12]], [[17, 20, 8, 8]]);
  } else {
    for (let y = 17; y <= 19; y++) patch(L, y, ".....lhmmdo.....");
    patch(L, 20, ".....mmddoo.....");
  }
}

/* LE PONCHO DE LA VALLÉE : un trapèze de laine tissée qui tombe des épaules en pointe, une encolure bordée, une bande de losanges entre
   deux filets crème, des franges qui suivent le pas. La bande se lit à la lumière comme le reste (le côté droit passe à l'ombre). */
function poncho(L, dir, step) {
  const rows = dir === 2
    ? [[10, 4, 11], [11, 3, 12], [12, 3, 12], [13, 3, 12], [14, 3, 12], [15, 3, 12], [16, 3, 12], [17, 4, 11], [18, 6, 9]]
    : [[10, 3, 12], [11, 2, 13], [12, 2, 13], [13, 2, 13], [14, 2, 13], [15, 2, 13], [16, 2, 13], [17, 3, 12], [18, 5, 10], [19, 7, 8]];
  // deux plis qui partent des épaules : la laine tombe, elle ne fait pas une marmite (première planche : un poncho en boule)
  drape(L, rows, dir === 2 ? [[11, 17, 6, 5]] : [[11, 18, 5, 6], [11, 18, 10, 9]]);
  if (dir !== 2) patch(L, 10, "......kkkk......");
  else patch(L, 10, "........kk......");
  const band = (y, light, shade) => { for (let x = 0; x < W; x++) { const t = L[y][x]; if (t) L[y][x] = t === "d" || t === "o" ? shade : light; } };
  // deux filets crème qui encadrent une bande ocre à petits losanges sombres (un tous les quatre pixels : un motif, pas une trame)
  band(12, "w", "W"); band(13, "y", "Y"); band(14, "w", "W");
  for (let x = 0; x < W; x++) if (L[13][x] && x % 4 === 1) L[13][x] = "k";
  // les franges : un fil sous CHAQUE colonne de l'ourlet (une frange continue), une sur deux plus longue
  const fr = [];
  for (let x = 0; x < W; x++) {
    let yb = -1;
    for (let y = H - 1; y >= 0; y--) if (L[y][x]) { yb = y; break; }
    if (yb < 0) continue;
    fr.push([x, yb + 1, "W"]); if (x % 2 === 0) fr.push([x, yb + 2, "W"]);
  }
  for (const [x, y, c] of fr) { const nx = x + step; if (y < H && nx >= 0 && nx < W && !L[y][nx]) L[y][nx] = c; }
}

/* LE TUTU D'APPARAT : un corsage pailleté à fines bretelles, épaules et bras nus, une jupe de tulle en trois étages festonnés (le dessus
   éclairé, le dessous dans l'ombre) qui rebondit au pas, des collants et des chaussons. Dos : le laçage croisé et le nœud. */
function tutu(L, dir, bob) {
  drape(L, [[11, 4, 11], [12, 4, 11], [13, 4, 11]]);
  if (dir === 0) { patch(L, 10, "....smssssmS...."); patch(L, 12, "......w........."); patch(L, 13, ".........w......"); }
  else if (dir === 1) { patch(L, 10, "....smssssmS...."); patch(L, 11, ".......dl......."); patch(L, 12, ".......ld......."); patch(L, 13, ".......dl......."); }
  else patch(L, 10, "....smssssss....");
  if (dir !== 2) for (let y = 11; y <= 13; y++) patch(L, y, "...s........S...");
  patch(L, 14, "...lhhllllmmd...");
  patch(L, 15, ".lhhhlllllmmmdo.");
  patch(L, 16, "llhhllmmllmmddoo");
  patch(L, 17, ".dd.dd.dd.dd.do.");
  if (dir === 1) patch(L, 14, "......hddh......");
  if (bob) { patch(L, 16, "_.............._"); patch(L, 15, "l..............o"); }   // le tulle se soulève quand le corps descend
}

// ─── les écharpes ────────────────────────────────────────────────────────────────────────────────────────────────
function scarf(L, id, dir, step) {
  if (id === "silk") {
    // un carré de soie noué de côté : deux pans qui flottent au pas, un reflet en biais
    patch(L, 9, dir === 2 ? ".....lhmmmmd...." : "....lhhmmmmd....");
    patch(L, 10, dir === 2 ? ".....dmmmhld...." : "....dmmmmhld....");
    if (dir === 0) { patch(L, 11, ".........lmd...."); patch(L, 12, ".........l.m...."); patch(L, 13, ".........m.d...."); patch(L, 14, "...........o...."); sway(L, 12, step); }
    if (dir === 2) { patch(L, 11, "..........lm...."); patch(L, 12, "..........md...."); patch(L, 13, "...........d...."); sway(L, 12, -step); }
  } else if (id === "feather") {
    // le boa : des touffes en festons autour du cou, deux longueurs qui tombent sur les épaules et oscillent
    if (dir === 1) { patch(L, 9, "..lhhllhhllmmd.."); patch(L, 10, "..mllmmllmmddo.."); return; }
    if (dir === 2) { patch(L, 9, "...lhhllhhlmd..."); patch(L, 10, "...mllmmllmdo..."); patch(L, 11, ".........lhm...."); patch(L, 12, ".........lmd...."); patch(L, 13, "..........md...."); sway(L, 12, -step); return; }
    patch(L, 9, "..lhhllhhllmmd..");
    patch(L, 10, "..mllmmllmmddo..");
    patch(L, 11, "..lhm......lmd..");
    patch(L, 12, "..lmd......lmd..");
    patch(L, 13, "..lhm......mdo..");
    patch(L, 14, "...l........d...");
    sway(L, 12, step);
  } else if (id === "fur") {
    // l'étole de fourrure : un col épais sur les épaules, bord inférieur en mèches, fermoir d'or
    if (dir === 2) { patch(L, 9, ".....lhhllmd...."); patch(L, 10, "...lhhlllmmdd..."); patch(L, 11, "...lllmmmmddo..."); patch(L, 12, "...mm.dd.mm.d..."); return; }
    patch(L, 9, "....lhhhllmd....");
    patch(L, 10, "..lhhlllllmmdd..");
    patch(L, 11, dir === 0 ? "..lllmmgGmmmdo.." : "..lllmmmmmmmdo..");
    patch(L, 12, "..mm.mm.dd.dd.o.");
  } else {
    // la grosse maille : deux tours roulés, épais, et un long pan à franges qui suit le pas
    patch(L, 9, dir === 2 ? "....lhhhllmmd..." : "...lhhhhllmmd...");
    patch(L, 10, dir === 2 ? "....dddddddo...." : "...dddddddddo...");
    patch(L, 11, dir === 2 ? "....lhhlllmd...." : "...lhhlllmmmd...");
    if (dir === 1) return;
    const x0 = dir === 0 ? 4 : 9;
    const rows = ["lmd", "lmd", "mdd", "lmd", "lmd", "mdo", "d.d"];
    rows.forEach((r, i) => patch(L, 12 + i, ".".repeat(x0) + r + ".".repeat(W - x0 - 3)));
    sway(L, 15, dir === 0 ? step : -step);
  }
}

// ─── les chapeaux ────────────────────────────────────────────────────────────────────────────────────────────────
function hat(L, id, dir) {
  if (id === "beret") {
    // un béret mou, penché sur l'oreille, sa queue au sommet et la bordure sombre qui serre la tête
    patch(L, 0, ".....lhhomd.....");
    patch(L, 1, "...lhhlmmmmdd...");
    patch(L, 2, "..lhlmmmmmmddd..");
    if (dir === 2) { patch(L, 3, "..mdoooooooo...."); patch(L, 4, "..do............"); }
    else { patch(L, 3, "...ooooooomddo.."); patch(L, 4, "...........do..."); }
  } else if (id === "capeline") {
    // la capeline de paille : calotte ronde, ruban noué, grand bord tressé qui retombe aux deux bouts
    patch(L, 0, ".....lhhhlm.....");
    patch(L, 1, "....lhllllmd....");
    patch(L, 2, dir === 2 ? "....rrrrrrRR...." : "....rrrrrrRr....");
    patch(L, 3, ".lhhlmlllmllmmd.");
    patch(L, 4, "lhllmlllmlllmddo");
    patch(L, 5, "odd..........ddo");
    if (dir === 1) { patch(L, 5, "odd....rR....ddo"); patch(L, 6, ".......rR......."); }
    if (dir === 2) patch(L, 5, "odR..........ddo");
  } else if (id === "tophat") {
    // le haut-de-forme de soie : le reflet en colonne, la ganse, le bord relevé aux deux côtés
    patch(L, 0, "....lhlmmmdo....");
    patch(L, 1, "....lhlmmmdo....");
    patch(L, 2, "....lhlmmmdo....");
    patch(L, 3, "..l.ggggggGG.o..");
    patch(L, 4, "..lhllmmmmmddo..");
  } else if (id === "beanie") {
    // le bonnet côtelé : un pompon, des côtes verticales, un revers roulé
    patch(L, 0, "......lhhd......");
    patch(L, 1, "....lmlmmdmd....");
    patch(L, 2, "...llmlmmdmdo...");
    patch(L, 3, "...lhhhllllmd...");
    patch(L, 4, "...mmmmmmmddo...");
  } else {
    // le diadème : trois pointes, une pierre au front, un éclat
    patch(L, 0, dir === 2 ? "..........G....." : ".......wg.......");
    patch(L, 1, dir === 2 ? ".........gG....." : ".....g.gg.G.....");
    patch(L, 2, dir === 0 ? "....hggrRgGG...." : dir === 1 ? "....hgggggGG...." : ".....hgggrR.....");
  }
}

// ─── les palettes et les couches seules ─────────────────────────────────────────────────────────────────────────
const SHARED = (skin, skinD) => ({ s: skin, S: skinD, w: "#f4efe4", W: "#cfc6b4", g: GOLD.g, G: GOLD.G, k: "#3a2a24", K: "#24181a" });
const SCARF_COL = { feather: "#efdcef", fur: "#c9b08a" };
/* La palette d'un article : `slot` "outfit" | "scarf" | "hat", `base` la teinte portée (hex) ou null. 2026-10-23 : sortie de `paintWardrobe`
   pour que le 32 × 48 (`persoHdArt.js`) lise LES MÊMES couleurs — une seule source, jamais recopiée. */
export function wardrobePal(slot, id, base, skin, skinD) {
  const shared = SHARED(skin, skinD);
  if (slot === "outfit") {
    const pal = { ...shared, ...wardrobeRamp(base || OUTFIT_COL[id]) };
    if (id === "cape") { const lin = wardrobeRamp("#d8b45a"); pal.c = lin.l; pal.C = lin.d; }
    else if (id === "suit") { pal.k = wardrobeRamp(base ? "#5a1f2a" : "#7a2432").m; pal.K = wardrobeRamp("#5a1f2a").o; }
    else if (id === "poncho") Object.assign(pal, { w: "#efe2c4", W: "#c9b48e", y: "#d9a441", Y: "#a8772a", k: "#3a2a24" });
    return pal;
  }
  if (slot === "scarf") {
    const col = id === "silk" ? (base || "#d94f6e") : SCARF_COL[id] || (base || "#8a4a3a");
    return { ...shared, ...wardrobeRamp(col) };
  }
  if (id === "capeline") { const rb = wardrobeRamp(base || "#9a3a52"); return { ...wardrobeRamp("#e2c97e"), r: rb.l, R: rb.d }; }
  if (id === "crown") return { g: GOLD.g, G: GOLD.G, h: GOLD.h, w: "#ffffff", r: "#e04a5a", R: "#8a1a2a" };
  return { ...shared, ...wardrobeRamp(base || (id === "beret" ? "#b4232c" : id === "tophat" ? "#24222c" : "#4f6488")) };
}
/* La grille de lettres d'un article (16 × 24), sans la peindre : `step` et `bob` comme `paintWardrobe`. Le 32 × 48 la demande À L'ARRÊT
   (0, 0), l'agrandit, et fait suivre le pas lui-même au demi-pixel. */
export function wardrobeLayer(slot, id, dir, gender, step = 0, bob = 0, folds = null) {
  /* `folds` (2026-10-23, « des plis d'un pixel ») : un tableau qui reçoit les plis du drapé [y0, y1, xa, xb] au lieu de les peindre — le
     32 × 48 les trace lui-même, un pixel de creux et un d'arête, là où l'agrandissement en faisait deux et deux. */
  FOLDS_OUT = folds;
  try { return layerOf(slot, id, dir, gender, step, bob); } finally { FOLDS_OUT = null; }
}
function layerOf(slot, id, dir, gender, step, bob) {
  const L = blank();
  if (slot === "outfit") {
    if (id === "gown") gown(L, dir, step);
    else if (id === "cape") cape(L, dir, step);
    else if (id === "suit") suit(L, dir, gender);
    else if (id === "poncho") poncho(L, dir, step);
    else tutu(L, dir, bob);
  } else if (slot === "scarf") scarf(L, id, dir, step);
  else hat(L, id, dir);
  return L;
}

// ─── l'entrée ────────────────────────────────────────────────────────────────────────────────────────────────────
/* `o` : { gender, dir (0 face, 1 dos, 2 profil droit), step (−1, 0, 1), bob (0, 1), skin, skinD, hair, wd ({ hat, scarf, outfit,
   tint }, indices décalés de 1) }. `P` est le `fillRect` de fermeArt (aucune transformation : le faux canevas des bancs les ignore). */
export function paintWardrobe(g, P, x, o) {
  const { gender, dir, step, bob, skin, skinD, wd } = o;
  const base = wd.tint ? C.WARDROBE_TINTS[wd.tint - 1].col : null;
  const shared = SHARED(skin, skinD);

  // 1. LA TENUE
  const gar = wd.outfit ? C.WARDROBE_OUTFITS[wd.outfit - 1] : null;
  if (gar) {
    const id = gar.id, R = wardrobeRamp(base || OUTFIT_COL[id]);
    const pal = wardrobePal("outfit", id, base, skin, skinD);
    const L = wardrobeLayer("outfit", id, dir, gender, step, bob);
    if (id === "tutu") {
      // les collants et les chaussons : on efface la jupe ou le pantalon de base sous le tulle, puis on repeint les jambes
      g.clearRect(x + 3, 18 + bob, 10, H - 18 - bob);
      const tp = "#f3e2e6", tps = "#d6bec6", sl = R.m, sld = R.d;
      P(g, x + 5, 18 + bob, 2, 3, tp); P(g, x + 9, 18 + bob, 2, 3, tps);
      const lx = gender === "f" ? x + 5 + (step > 0 ? 1 : 0) : x + 5 + step, rx = gender === "f" ? x + 9 - (step < 0 ? 1 : 0) : x + 9 - step;
      if (2 - bob > 0) { P(g, lx, 21 + bob, 2, 2 - bob, tp); P(g, rx, 21 + bob, 2, 2 - bob, tps); }
      P(g, lx, 23, 2, 1, sl); P(g, rx, 23, 2, 1, sld);
    }
    emit(g, P, x, L, pal, bob, id === "gown");
    // le bras de profil passe DEVANT le vêtement (sauf sous la cape et le poncho, qui le couvrent)
    if (dir === 2 && id !== "cape" && id !== "poncho") {
      const ax = x + 7 + step;
      if (id === "tutu") { P(g, ax, 11 + bob, 2, 4, skin); P(g, ax + 1, 11 + bob, 1, 4, skinD); }
      else { P(g, ax, 11 + bob, 1, 4, R.l); P(g, ax + 1, 11 + bob, 1, 4, R.m); P(g, ax, 14 + bob, 2, 1, id === "suit" ? shared.w : R.d); }
      P(g, ax, 15 + bob, 2, 1, skin);
    }
  }

  // 2. L'ÉCHARPE
  const sc = wd.scarf ? C.WARDROBE_SCARVES[wd.scarf - 1] : null;
  if (sc) emit(g, P, x, wardrobeLayer("scarf", sc.id, dir, gender, step, bob), wardrobePal("scarf", sc.id, base, skin, skinD), bob, false);

  // 3. CE QUI RETOMBE SUR LES ÉPAULES (cheveux longs, tresses, barbe) repasse devant le col — `drawCharFrame` sait quelle coupe on porte
  if ((gar || sc) && o.hairOver) o.hairOver();

  // 4. LE CHAPEAU, tout en haut
  const ht = wd.hat ? C.WARDROBE_HATS[wd.hat - 1] : null;
  if (ht) emit(g, P, x, wardrobeLayer("hat", ht.id, dir, gender), wardrobePal("hat", ht.id, base, skin, skinD), bob, false);
}

/* ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   ║ 2026-10-21 — FROUFROU, LE COIFFEUR (look "froufrou", sur le fermier de base). Son choix : « fuchsia et léopard ».
   ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Extravagant comme Carla, dessiné comme les vêtements d'ici (drapé éclairé, une lettre de ton par pixel) : veste de velours
   fuchsia courte aux revers de satin noir et boutons d'or, peigne d'or à la poche, foulard léopard noué au cou (taches par
   deux pixels, un motif et pas une trame), lunettes rondes teintées de rose, houppe argentée qui avance sur le front,
   pantalon noir étroit, souliers vernis. ⚠️ Tout couvre les rectangles de base du fermier (`drawCharFrame`) : ses cheveux
   bruns de profil (x 4..8, y 3..7) comme la casquette — sinon une mèche brune sort sous l'argent. */
const FROU_HAIR = {
  0: [[0, "....lhhhlmd....."], [1, "...lhhllmmmdd..."], [2, "...lhlmmmddddd.."], [3, "...lmsslhmddd..."], [4, "...l........d..."], [5, "...d........d..."]],
  1: [[0, "....lhhhlmd....."], [1, "...lhhllmmmdd..."], [2, "...lhhllmmmdd..."], [3, "...lhllmmmmdd..."], [4, "...lllmmmmmdd..."],
      [5, "...dlmmmmmmdd..."], [6, "....dddddddd...."]],
  // de profil, une boucle retombe devant le front (x 12) : elle couvre la mèche brune que la coupe de base y pose
  2: [[0, ".....lhhhhlmd..."], [1, "...lhhhllmmmdd.."], [2, "...lhlmmmmddd..."], [3, "...lhlmmd...lmd."], [4, "...lhlmmd....d.."],
      [5, "...lmmmmd...d..."], [6, "...dmmmdd......."], [7, "....ddd........."]],
};
export function paintFroufrou(g, P, x, o) {
  const { dir, step, bob, skin } = o;
  const J = wardrobeRamp("#d12a7c");                         // le velours fuchsia
  const pal = {
    ...J, b: "#2a1824", B: "#4a2c42",                        // le satin noir des revers et des poignets
    y: "#dca650", Y: "#b07a30", n: "#3a2414",                // le léopard : fond, ombre, taches
    g: "#f0cf6a", G: "#a8772a", p: "#2a2532", P: "#1b1720",   // l'or ; le pantalon noir
    s: skin,
  };
  // 1. le pantalon et les souliers (pas de l'ancienne paire de bottes brunes)
  const T = blank();
  for (let y = 16; y <= 20; y++) patch(T, y, ".....pppPPP.....");
  emit(g, P, x, T, pal, bob, false);
  const lx = x + 5 + step, rx = x + 8 - step;
  if (2 - bob > 0) { P(g, lx, 21 + bob, 3, 2 - bob, pal.p); P(g, rx, 21 + bob, 3, 2 - bob, pal.P); }
  P(g, lx, 23, 3, 1, "#120f16"); P(g, rx, 23, 3, 1, "#120f16"); P(g, lx, 23, 1, 1, "#4a4458"); P(g, rx, 23, 1, 1, "#3a3446");
  // 2. la veste courte, le foulard, les revers
  const L = blank();
  if (dir === 2) {
    drape(L, [[10, 4, 11], [11, 4, 11], [12, 4, 11], [13, 4, 11], [14, 4, 11], [15, 4, 11], [16, 4, 11]]);
    patch(L, 9, ".........ynY....");
    patch(L, 10, ".........byn....");
    patch(L, 11, ".........b......");
    patch(L, 12, ".........b......");
    // le pan du foulard flotte au pas : sa propre couche (balancer toute la veste découvrait la chemise de base)
    const F = blank();
    patch(F, 11, "...........Yy..."); patch(F, 12, "............n..."); patch(F, 13, "...........y....");
    sway(F, 11, -step);
    for (let y = 11; y <= 13; y++) for (let k = 0; k < W; k++) if (F[y][k]) L[y][k] = F[y][k];
  } else {
    drape(L, [[10, 3, 12], [11, 3, 12], [12, 3, 12], [13, 3, 12], [14, 3, 12], [15, 4, 11], [16, 4, 11]]);
    if (dir === 0) {
      patch(L, 9, ".....ynyyny.....");
      patch(L, 10, "....bynYyyYb....");
      patch(L, 11, ".....byYnyb.....");
      patch(L, 12, "......bnybg.....");
      patch(L, 13, ".......yg.......");
      patch(L, 15, "........g.......");
    } else {
      patch(L, 9, "......nyYn......");
      for (let y = 11; y <= 14; y++) patch(L, y, "........d.......");
      patch(L, 15, "........o......."); patch(L, 16, "........o.......");
    }
    patch(L, 14, "...B........B...");
  }
  emit(g, P, x, L, pal, bob, false);
  if (dir === 2) {                                            // le bras de profil, devant la veste
    const ax = x + 7 + step;
    P(g, ax, 11 + bob, 1, 3, J.l); P(g, ax + 1, 11 + bob, 1, 3, J.m); P(g, ax, 14 + bob, 2, 1, pal.b); P(g, ax, 15 + bob, 2, 1, skin);
  }
  // 3. la houppe argentée (par-dessus la coupe de base), puis les lunettes
  const Hh = blank();
  for (const [y, s] of FROU_HAIR[dir] || []) patch(Hh, y, s);
  emit(g, P, x, Hh, { ...wardrobeRamp("#c9ccd6"), s: skin }, bob, false);
  if (dir === 0) {
    P(g, x + 5, 5 + bob, 2, 2, "#8a2a6a"); P(g, x + 9, 5 + bob, 2, 2, "#8a2a6a");
    P(g, x + 5, 5 + bob, 1, 1, "#e07ab4"); P(g, x + 9, 5 + bob, 1, 1, "#e07ab4");
    P(g, x + 7, 5 + bob, 2, 1, pal.g);
  } else if (dir === 2) {
    P(g, x + 10, 5 + bob, 2, 2, "#8a2a6a"); P(g, x + 10, 5 + bob, 1, 1, "#e07ab4");
    P(g, x + 7, 5 + bob, 3, 1, pal.g);
  }
}
